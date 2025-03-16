import * as dotenv from 'dotenv';
import { env } from "hono/adapter";
import { turso as tursoDev } from '../library/dev_turso.js';
import { tursoProd } from '../library/prod_turso.js';
import { z } from "zod";
import { TOTP } from "totp-generator";
import { setSignedCookie, deleteCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";

import mailer from "../library/mailer.js";

import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";

dotenv.config();

const turso = String(process.env.ENVRON) === "DEV" ? tursoDev : tursoProd;
const emailSchema = z.string().email();
const totpSchema = z.string().length(6);
const time = 3;

/**
 * loginOrSignup function
 * @argument {Context} c - Hono Context Object
 * @description This function does too much:
 * If only email is provided, it will either check if user
 * and send a TOTP to the provided email address and return
 * some JSON, else return JSON.
 * If email & totp are provided, it will valdate and return JSON
 * and token, else only JSON
 */
const loginOrSignup = async (c: Context) => {
  const { TOTP_SECRET } = env<{ TOTP_SECRET: string }>(c);
  let status: ContentfulStatusCode = 500;
  const email = c.req.query("email") || "";
  const totpValue: string | undefined = c.req.query("totp");
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: "Unexpected Error: [GetAuth99021]",
    data: { isUser: false }
  }

  // Validate email format
  const emailValidationAttempt = emailSchema.safeParse(email);
  if (!emailValidationAttempt.success) {
    response.message = "Email invalid";
    response.success = String(status).search("2") === 0;
    return c.json(response, status);
  }

  // Is email attached to an account?
  try {
    response.message = "Unexpected Possible Database Error: [GetAuth99031]";
    let emailQuery = await turso.execute({
      sql: "SELECT uuid FROM users WHERE email = ?",
      args: [email],
    });

    // If no totp value, generate one or return not user
    if (totpValue === undefined) {
      if (emailQuery.rows.length != 0) {
        // Generate TOTP
        const { otp, expires } = TOTP.generate(TOTP_SECRET, { period: (60 * time) });

        // ADD TOTP to database
        const transaction = await turso.transaction();
        try {
          const otpQuery = await transaction.execute({
            sql: "INSERT INTO totp (user_id, otp, valid_until) VALUES ((SELECT id FROM users WHERE email = ?), ?, ?);",
            args: [email, otp, expires],
          });

          if (otpQuery.rowsAffected === 0) {
            throw new Error("Could not create authentication token");
          }

          await transaction.commit();
          // SEND TOTP
          const info = await mailer({ c, generatedTotp: otp, time, recipiant: email });
          response.data = info;
          response.message = `${email} is a user`;
          response.data = { isUser: true }

          // Status is good
          status = 200;
        } catch (err) {
          status = 500;
          response.message = `DB Error [GetAuth17392]: ${err}`;
        } finally {
          transaction.close();
        }
      } else {
        response.message = `${email} is not a user`;
        status = 200;
      }
    } else {
      const totpValidationAttempt = totpSchema.safeParse(totpValue);
      if ((totpValue != "") && (!totpValidationAttempt.success)) {
        response.message = "Bad Token: [GetAuth00001]";
        response.success = String(status).search("2") === 0;
        return c.json(response, status);
      }

      // If totpValue is valid, query DB
      if (totpValidationAttempt.success) {
        delete response.data;
        const loginQuery = await turso.execute({
          sql: `SELECT u.email, u.uuid, t.otp, t.valid_until
            FROM totp t
            JOIN users u ON t.user_id = u.id
            WHERE t.user_id = (SELECT id FROM users WHERE email = ?)
            ORDER BY t.valid_until DESC
          ;`,
          args: [email],
        });
        const { uuid, otp, valid_until, queriedEmail = email } = loginQuery?.rows[0];

        // If no totpQuery exists for provided email
        if (loginQuery.rows.length === 0) {
          throw new Error("Possible Database Error: [GetAuth00002]");
        }

        // if totp is expired
        if (Number(valid_until) <= Date.now()) {
          status = 500;
          throw new Error("Bad Token: Error: [GetAuth00003]");
        }

        // If totpQuery and totpValue do not match
        if (Number(otp) != Number(totpValue)) {
          status = 500;
          throw new Error("Bad Token: Error: [GetAuth00004]");
        }

        // If both queries match and is not expired
        if ((Number(valid_until) >= Date.now()) && (Number(otp) === Number(totpValue)) && (String(queriedEmail) === String(email))) {
          await signedCookieGenerator(c, String(uuid));
          status = 200;
          response.message = "Logged in";
          response.data = { uuid: uuid }
        }

        response.success = String(status).search("2") === 0;
        return c.json(response, status);
      }
    }
  } catch (err) {
    response.message = String(err);
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

/**
 * signUpRegistration
 * @argument {Context} c - Hono Context Object
 * @description - Takes submitted email attempts to sign up
 * a new user with that email. Validates and make sure no
 * collisions exist with pre-registered users
 */
const signUpRegistration = async (c: Context) => {
  const { TOTP_SECRET } = env<{ TOTP_SECRET: string }>(c);
  const email = String(c.req.query("email"));
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: "Unexpected Error: [PostSignUp00001]",
  }

  const emailValidationAttempt = emailSchema.safeParse(email);
  const emailInUseTransaction = await turso.transaction();
  const createUnverifiedUserTransaction = await turso.transaction();
  try {
    // Check if email is valid
    if (!emailValidationAttempt.success) { throw new Error("Email invalid: [PostSignUp00001]") }

    // Check if email is in use
    const emailInUse = await emailInUseTransaction.execute({
      sql: "SELECT email FROM users WHERE email = ?;",
      args: [email],
    });
    if (emailInUse.rows.length != 0) { throw new Error("Email invalid: [PostSignUp00002]") }

    // Add email to unverified_users table
    response.message = "Unexpected Database Error: [PostSignUp00003]";
    const { otp, expires } = TOTP.generate(TOTP_SECRET, { period: (60 * time) });
    const createUnverifiedUser = await createUnverifiedUserTransaction.execute({
      sql: "INSERT INTO unverified_users (email, otp, valid_until) VALUES (?, ?, ?);",
      args: [email, String(otp), expires],
    });
    if (createUnverifiedUser.rowsAffected < 1) { throw new Error("Unexpected Database Error: [PostSignUp00004]") }

    // Commit changes and send email
    await createUnverifiedUserTransaction.commit();
    await mailer({ c, recipiant: email, generatedTotp: otp, time, });

    response.message = "Check email for verification token";
    status = 200;
  } catch (err) {
    response.message = `${err}`;
  } finally {
    emailInUseTransaction.close();
    createUnverifiedUserTransaction.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

/**
 * signUpConfirmation
 * @argument {Context} c - Hono Context Object
 * @description Confirms email and creates user
 */
const signUpConfirmation = async (c: Context) => {
  function errorSignature(increment: number): string {
    return `[GetSignUp0000${increment}]`;
  }
  const email = String(c.req.query("email"));
  const totpValue: string | undefined = c.req.query("totp");
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: `Unexpected Error: ${errorSignature(1)}`,
  }

  const emailValidationAttempt = emailSchema.safeParse(email);
  const totpValidationAttempt = totpSchema.safeParse(totpValue);
  const userRegistrationTransaction = await turso.transaction();

  try {
    // Any errors in this block are client errors
    status = 400;
    // Validate user inputs
    if (!emailValidationAttempt.success) { throw new Error(`Email invalid: ${errorSignature(2)}`) }
    if (!totpValidationAttempt.success) { throw new Error(`Invalid token: ${errorSignature(3)}`) }

    // Email is not already in use
    const emailCollision = await turso.execute({
      sql: "SELECT email FROM users WHERE email = ?;",
      args: [email],
    });
    if (emailCollision.rows.length != 0) { throw new Error(`Email invalid: ${errorSignature(4)}`) }

    // Email and totp are on a single database row
    const totpTableQuery = await turso.execute({
      sql: "SELECT valid_until FROM unverified_users WHERE email = ? AND otp = ? ORDER BY valid_until DESC LIMIT 1;",
      args: [email, String(totpValue)],
    });
    if (totpTableQuery.rows.length === 0) { throw new Error(`Email or Token invalid: ${errorSignature(5)}`) }

    // Totp is not expired
    if (Number(totpTableQuery.rows[0].valid_until) <= Number(Date.now())) { throw new Error(`Token expired: ${errorSignature(6)}`) }

    // Create user
    const randomlyGeneratedHandle = `TotallyNotABot-${Math.floor(Math.random() * 1000000)}`;
    const userRegistration = await userRegistrationTransaction.execute({
      sql: `INSERT INTO users (email, handle, password)
        VALUES (?, ?, ?)
        RETURNING uuid;
      `,
      args: [email, randomlyGeneratedHandle, "column not used 😱"],
    });
    if (userRegistration.rowsAffected === 0) { throw new Error(`Database Issue: ${errorSignature(7)}`) }

    // Create tokenized cookie
    await signedCookieGenerator(c, String(userRegistration.rows[0].uuid));

    status = 200;
    response.data = { ...userRegistration.rows[0] }
    response.message = "SignUp Successful! Welcome 🙂";
    await userRegistrationTransaction.commit();
  } catch (err) {
    response.message = String(err);
  } finally {
    userRegistrationTransaction.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

/**
 * logout
 * @description - deletes cookie
 */
const logout = async (c: Context) => {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: "Unexpected Error: [GetLogout00001]",
  }

  try {
    deleteCookie(c, "jwt");
    response.message = "Logged out";
    status = 200;
  } catch (err) {
    response.message = "Could not logout [GetLogout00002]";
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

/**
 * getToken
 * @description - Returns a signed URL for AWS/R2 bucket uploads
 */
const getSignedBucketURL = async (c: Context) => {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: "Unexpected Error: [GetToken00001]",
  }
  const { R2_API_ENDPOINT } = env<{ R2_API_ENDPOINT: string }>(c);
  const { R2_ACCESS_KEY } = env<{ R2_ACCESS_KEY: string }>(c);
  const { R2_SECRET_KEY } = env<{ R2_SECRET_KEY: string }>(c);
  const userUUID = c.get("uuid");

  const updateDB = await turso.transaction();
  try {
    const S3 = new S3Client({
      region: "auto",
      endpoint: R2_API_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      }
    });

    const preSignedURL = await getSignedUrl(
      S3,
      new PutObjectCommand({ Bucket: "third-app-bucket", Key: `${userUUID}.jpg` }),
      { expiresIn: 3600 },
    );

    await S3.send(new CopyObjectCommand({
      Bucket: "third-app-bucket",
      CopySource: "third-app-bucket/avatar.jpg",
      Key: `${userUUID}.jpg`
    }));

    await updateDB.execute({
      sql: "UPDATE users SET avatar = ? WHERE uuid = ?",
      args: [userUUID, userUUID],
    });

    status = 200;
    response.message = "Here's your presigned URL";
    response.data = preSignedURL;
    await updateDB.commit();
  } catch (err) {
    response.message = "Contractor Error: [GetToken00002]";
  } finally {
    updateDB.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

/**
  * signedCookieGenerator
  * @argument {Context} c - Hono Context Object
  * @argument {string} uuid - user uuid
  * @description - Creates a signed cookie
  */
async function signedCookieGenerator(c: Context, uuid: string) {
  const { JWT_SECRET, COOKIE_SECRET } = env<{ JWT_SECRET: string; COOKIE_SECRET: string }>(c);
  const payload = {
    user: uuid,                 // user 3 UUID
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 5),  // 5 days
    nbf: Math.floor(Date.now() / 1000) - 300,
    iat: Math.floor(Date.now() / 1000),
  }

  const token = await sign(payload, JWT_SECRET);
  await setSignedCookie(c, 'jwt', token, COOKIE_SECRET);
}

const authController = { loginOrSignup, logout, signUpRegistration, signUpConfirmation, getSignedBucketURL }
export default authController;
