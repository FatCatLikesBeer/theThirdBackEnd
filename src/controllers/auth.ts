import { env } from "hono/adapter";
import { turso } from "../library/dev_turso.js";
import { z } from "zod";
import { TOTP } from "totp-generator";

import mailer from "../library/mailer.js";

import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";

const emailSchema = z.string().email();
const totpSchema = z.number().positive().gt(99999).lt(1000000);

const loginOrSignup = async (c: Context) => {
  const now = Date.now();
  const time = 3;
  const { TOTP_SECRET } = env<{ TOTP_SECRET: string }>(c);
  let status: ContentfulStatusCode = 500;
  const email = c.req.query("email") || "";
  const totpValue = c.req.query("totp") || "";
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
  /**
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   * I thought I was done but I sent a request with
   * an email that's not in the datbase and got a server
   * error.
   *
   * I guess I have to a bunch of this bullshit in a try catch block
   * I would do it now but I need to go to bed
   * The error happened at the code below this comment block
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   *
   */
  const emailQuery = await turso.execute({
    sql: "SELECT uuid FROM users WHERE email = ?",
    args: [email],
  });

  // If totp does exist, do only the following
  const totpValidationAttempt = totpSchema.safeParse(Number(totpValue));
  // If totp exists AND is invalid (NOT 6 digits long)
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

    try {
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
    } catch (err) {
      response.message = String(err);
    }

    // If both queries match and is not expired
    if ((Number(valid_until) >= now) && (Number(otp) === Number(totpValue)) && (String(queriedEmail) === String(email))) {
      status = 200;
      response.message = "Logged in";
      response.data = { uuid: uuid }
    }

    response.success = String(status).search("2") === 0;
    return c.json(response, status);
  }

  // If user, send TOTP via email
  // If not user, request to register
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

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

const authController = { loginOrSignup }

export default authController;
