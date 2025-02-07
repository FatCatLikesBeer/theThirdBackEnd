import * as dotenv from "dotenv";
import { getSignedCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

dotenv.config();
const jwtSecret = String(process.env.JWT_SECRET);
const cookieSecret = String(process.env.COOKIE_SECRET);

function createUser(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response);
}

async function readUserDetail(c: Context) {
  let status: ContentfulStatusCode = 400;
  const uuid = c.req.param("id");
  const queryUser = await turso.execute({
    sql: "SELECT email, handle, display_name, avatar, bio, about, location, created_at FROM users WHERE uuid = ?",
    args: [uuid],
  });

  let response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: `Could not find user ${uuid}`,
  }

  if (queryUser.rows.length != 0) {
    response = {
      success: true,
      path: `${c.req.path}`,
      message: `Details on user: ${uuid}`,
      data: queryUser.rows[0],
    }
    status = 200;
  }
  return c.json({ response }, status);
};

async function readUserList(c: Context) {
  const query = c.req.query('q');

  let response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Could not retrieve list of users',
  }

  if (query == undefined) {
    const queryUsers = await turso.execute("SELECT handle, display_name, created_at, avatar FROM users");
    response = {
      success: true,
      path: `${c.req.path}`,
      message: "List of users",
      data: [...queryUsers.rows],
    }
  } else {
    const queryUsers = await turso.execute(`SELECT handle, display_name, created_at, avatar FROM users WHERE handle LIKE '%${query}%'`);
    response = {
      success: true,
      path: `${c.req.path}`,
      message: `List of users matching search '${query}'`,
      data: [...queryUsers.rows],
    }
  }

  return c.json(response);
}

async function updateUser(c: Context) {
  let response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: "Failed to update user",
  }
  const token = await getSignedCookie(c, cookieSecret, "jwt");
  const requestQuiries = Object.entries(c.req.query());
  if (requestQuiries.flat().includes("email")) {
    response.message = "Can not update email at this time";
    return c.json(response);
  }
  const tokenData = await verify(String(token), jwtSecret);
  const user = tokenData.user;

  let sqlQuery = "UPDATE users SET ";
  requestQuiries.forEach((elem, i, arr) => {
    if (arr.length - 1 === i) {
      sqlQuery += `${elem[0]} = '${elem[1]}' `;
    } else {
      sqlQuery += `${elem[0]} = '${elem[1]}', `;
    }
  });
  sqlQuery += `WHERE uuid = '${user}'`;

  try {
    const query = await turso.execute(sqlQuery);
    console.log(query);
    response.success = true;
    response.message = `${sqlQuery}`;
  } catch (err) {
    response.message = `Failed: ${err}`;
  }

  return c.json(response);
}

function deleteUser(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Delete User not yet implemented',
  }
  return c.json(response);
}

const userControllers = { createUser, readUserList, readUserDetail, updateUser, deleteUser, }

export default userControllers;
