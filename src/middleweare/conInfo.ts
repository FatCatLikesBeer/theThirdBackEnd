import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, Next } from "hono";

import { turso } from "../library/prod_turso.js";

export default async function conInfo(c: Context, next: Next) {
  const ip = String(getConnInfo(c).remote.address);
  const [route, user_agent, method] = [
    String(c.req.url),
    String(c.req.header("User-Agent")),
    String(c.req.method),
  ];

  const transaction = await turso.transaction("write");
  try {
    await transaction.execute({
      sql: `INSERT INTO visitors (ip, route, user_agent, method)
        VALUES (?, ?, ?, ?);
      `,
      args: [ip, route, user_agent, method],
    })

    await transaction.commit();
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    }
  } finally {
    transaction.close();
  }

  await next();
}
