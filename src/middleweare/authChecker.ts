import * as dotenv from 'dotenv';
import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import type { Context, Next } from 'hono';

import { turso } from '../library/dev_turso.js';
import { createPayload } from '../library/createPayload.js';

dotenv.config();

const jwtSecret = String(process.env.JWT_SECRET);
const cookieSecret = String(process.env.COOKIE_SECRET);

/**
 * authChecker middleware
 *
 * Middleware that:
 * 1) Checks for cookies named 'jwt'
 * 2) Checks if said jwt is a valid token
 *
 * @argument c - Hono Context Object
 * @argument next - Hono Next Object
 */
export const authChecker = async (c: Context, next: Next) => {
  let response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: "Unauthorized",
  }

  // Check for cookie with key = jwt
  const token = await getSignedCookie(c, cookieSecret, "jwt");
  if (token === undefined) {
    deleteCookie(c, 'jwt');
    return c.json(response, 401);
  }

  // Is token valid?
  let payload;
  try {
    const jwtPayload = await verify(String(token), jwtSecret);
    if (jwtPayload.user != undefined) {
      payload = jwtPayload
    } else {
      throw new Error("Unauthorized Request");
    }
  } catch (err) {
    deleteCookie(c, 'jwt');
    response.message = "Unauthorized Request";
    return c.json(response, 401);
  }

  // Is payload.user valid?
  const checkUser = await turso.execute(`SELECT id FROM users WHERE uuid = '${payload.user}'`);
  if (checkUser.rows.length === 0) {
    deleteCookie(c, 'jwt');
    response.message = "Unauthorized User";
    return c.json(response, 401);
  }

  // All is good, sign new token and sign new cookie
  const user = String(payload.user);
  const signedToken = await sign(createPayload(user) as any, jwtSecret);
  setSignedCookie(c, 'jwt', signedToken, cookieSecret);

  c.set("uuid", user);

  // All is good
  await next();
}
