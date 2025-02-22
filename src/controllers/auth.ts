import { env } from "hono/adapter";
import { turso } from "../library/dev_turso.js";
import { string, z } from "zod";
import { TOTP } from "totp-generator";
import { setSignedCookie, deleteCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';

import mailer from "../library/mailer.js";

import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";

const emailSchema = z.string().email();
const totpSchema = z.string().length(6);

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
  const now = Date.now();
  const time = 3;
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
        if (Number(valid_until) <= now) {
          status = 500;
          throw new Error("Bad Token: Error: [GetAuth00003]");
        }

        // If totpQuery and totpValue do not match
        if (Number(otp) != Number(totpValue)) {
          status = 500;
          throw new Error("Bad Token: Error: [GetAuth00004]");
        }

        // If both queries match and is not expired
        if ((Number(valid_until) >= now) && (Number(otp) === Number(totpValue)) && (String(queriedEmail) === String(email))) {
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

const authController = { loginOrSignup, logout }

export default authController;
