import { z } from 'zod';

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createUser(c: Context) {
  const status: ContentfulStatusCode = 410;
  const response: APIResponse = {
    success: false,
    path: c.req.path,
    message: "This endpoint is not in use. Please use '/api/auth' instead."
  }

  return c.json(response, status);
}

async function readUserDetail(c: Context) {
  let status: ContentfulStatusCode = 400;
  const uuid = c.req.param("id");
  const queryUser = await turso.execute({
    sql: "SELECT handle, display_name, avatar, about, location, created_at FROM users WHERE uuid = ?",
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
}

async function self(c: Context) {
  let status: ContentfulStatusCode = 400;
  const uuid = c.get("uuid");
  const queryUser = await turso.execute({
    sql: "SELECT handle, display_name, avatar, email, about, location, created_at FROM users WHERE uuid = ?",
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
}

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

  const requestQuiries = Object.entries(c.req.query());
  if (requestQuiries.flat().includes("email")) {
    response.message = "Can not update email at this time";
    return c.json(response, 400);
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

  const transaction = await turso.transaction();
  try {
    const query = await transaction.execute({
      sql: sqlQuery,
      args: [...sqlValues],
    });
    console.log(query);
    response.success = true;
    response.message = "Success";
    response.data = {
      result: sqlValues[0][0],
    }
    await transaction.commit();
  } catch (err) {
    response.message = `Database Error [PutUser61733]: ${err}`;
  } finally {
    transaction.close();
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

const userControllers = { createUser, readUserList, readUserDetail, updateUser, deleteUser, self }

export default userControllers;
