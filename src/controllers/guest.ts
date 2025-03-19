import { env } from "hono/adapter";
import { setSignedCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';

import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";

import { turso } from "../library/prod_turso.js";

export async function getGuest(c: Context) {
  const transaction = await turso.transaction();
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: "Unexpected Error: [Guest00001]",
  }

  const slug = Math.floor(Math.random() * 1000000);

  const userData = {
    handle: `Guest${slug}`,
    email: `fakeEmail${slug}@fake.net`,
    password: "Field not in use 🧐",
    about: "I'm a guest, just a guest, I'm just here as a test",
    location: "WideAreaNetwork"
  }

  try {
    const request = await transaction.execute({
      sql: `INSERT INTO users (handle, email, password, about, location)
        VALUES (?,?,?,?,?)
        RETURNING uuid
      ;`,
      args: [
        userData.handle,
        userData.email,
        userData.password,
        userData.about,
        userData.location
      ],
    });

    if (request.rowsAffected != 1) { throw new Error("Error registering as guest") }

    const uuid = String(request.rows[0].uuid);
    console.log("uuid: ", uuid);

    await signedCookieGenerator(c, uuid);
    status = 200;
    response.message = `New User: ${userData.handle}`;
    response.data = { uuid };
    await transaction.commit();
  } catch (err: unknown) {
    if (err instanceof Error) {
      response.message = err.message;
    }
    status = 400;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response);
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

