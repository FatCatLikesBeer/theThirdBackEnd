import mailer from '../library/mailer.js';
import { z } from 'zod';

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createUser(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: "Error, bad request",
  }
  const requestQuiries = c.req.query();

  // Verify requred fields
  try {
    if (requestQuiries.email == "") { throw new Error("Email required") }
    if (requestQuiries.password == "") { throw new Error("Password requred") }
    if (requestQuiries.handle == "") { throw new Error("Handle required") }
    if (requestQuiries.handle.length < 4) { throw new Error("Handle too short") }
    if (requestQuiries.password.length < 8) { throw new Error("Password too short") }
  } catch (err) {
    response.message = `${err}`;
    return c.json(response, status);
  }

  try {
    // Validate email
    const emailSchema = z.string().email();
    const validationAttempt = emailSchema.safeParse(requestQuiries.email);
    if (!validationAttempt.success) { throw new Error("Email not valid or already in use") }

    // Is email in use
    const emailQuery = await turso.execute({
      sql: "SELECT COUNT(*) FROM users WHERE email = ?",
      args: [requestQuiries.email],
    });
    if (0 != (Object.values(emailQuery.rows[0])[0])) { throw new Error("Email not valid or already in use") }

    // Is handle in use
    const handleQuery = await turso.execute({
      sql: "SELECT COUNT(*) FROM users WHERE handle = ?",
      args: [requestQuiries.handle],
    });
    if (0 != (Object.values(handleQuery.rows[0])[0])) { throw new Error("Handle already taken") }
  } catch (err) {
    response.message = `${err}`;
    return c.json(response, status);
  }

  // Insert to database
  const columns = ["email", "handle", "display_name", "password", "about", "bio", "location"];
  const sqlQuery = ` INSERT INTO users (${columns.join(", ")}) VALUES (?, ?, ?, ?, ?, ?, ?);`;
  const sqlArgs = columns.map((elem) => { return requestQuiries[elem] != undefined ? requestQuiries[elem] : null });

  const transaction = await turso.transaction();
  try {
    await transaction.execute({
      sql: sqlQuery,
      args: sqlArgs,
    });
    await transaction.commit();

    status = 200;
    response.success = true;
    response.data = sqlArgs;
    response.message = `User created: ${requestQuiries.handle}`;

  } catch (err) {
    console.log("squery", sqlQuery);
    console.log("args", sqlArgs);
    response.message = `${err}`;
    return c.json(response, status);
  } finally {
    transaction.close();
  }

  return c.json(response, status);
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
  return c.json(response, status);
};

async function readUserList(c: Context) {
  const query = c.req.query('q');

  let response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Could not retrieve list of users',
  }

  if (query == undefined) {
    const queryUsers = await turso.execute("SELECT uuid, handle, display_name, created_at, avatar FROM users");
    response = {
      success: true,
      path: `${c.req.path}`,
      message: "List of users",
      data: [...queryUsers.rows],
    }
  } else {
    const queryUsers = await turso.execute({
      sql: "SELECT uuid, handle, display_name, created_at, avatar FROM users WHERE handle LIKE ?",
      args: [query],
    });
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

  // const token = await getSignedCookie(c, cookieSecret, "jwt");
  // const tokenData = await verify(String(token), jwtSecret);
  // const user = tokenData.user;
  const requestQuiries = Object.entries(c.req.query());
  if (requestQuiries.flat().includes("email")) {
    response.message = "Can not update email at this time";
    return c.json(response);
  }
  const user: string = c.get("uuid");

  let sqlQuery = "UPDATE users SET ";
  let sqlValues: any[] = [];
  requestQuiries.forEach((elem, i, arr) => {
    if (arr.length - 1 === i) {
      sqlQuery += `${elem[0]} = ? `;
      sqlValues.push([elem[1]]);
    } else {
      sqlQuery += `${elem[0]} = ?, `;
      sqlValues.push([elem[1]]);
    }
  });
  sqlQuery += `WHERE uuid = '${user}'`;

  try {
    console.log("Full Query", sqlQuery);
    console.log("sqlValues", sqlValues);
    const query = await turso.execute({
      sql: sqlQuery,
      args: [...sqlValues],
    });
    console.log(query);
    response.success = true;
    response.message = `${sqlQuery}`;
  } catch (err) {
    response.message = `Failed: ${err}`;
  }

  return c.json(response);
}

async function deleteUser(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response = {
    success: false,
    path: `${c.req.path}`,
    message: "Bad request",
  }

  const uuid = c.get("uuid");

  // Check that user exists
  const transaction = await turso.transaction();
  try {
    const deleteUserTransaction = await transaction.execute({
      sql: "DELETE FROM users WHERE uuid = ? RETURNING email;",
      args: [uuid],
    });
    if (deleteUserTransaction.rows.length === 0) {
      throw new Error("User not found");
    } else {
      await transaction.commit();
      status = 200;
      console.log(deleteUserTransaction);
      response.message = `User with email '${deleteUserTransaction.rows[0].email}' has been deleted`;
    }
  } catch (err) {
    response.message = `${err}`;
    return c.json(response, status);
  } finally {
    transaction.close();
  }

  return c.json(response, status);
}

const userControllers = { createUser, readUserList, readUserDetail, updateUser, deleteUser, }

export default userControllers;
