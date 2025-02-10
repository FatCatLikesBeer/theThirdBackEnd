import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
}

async function readFriendDetail(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  const uuidUser = c.req.param('id');

  try {
    const query = await turso.execute({
      sql: `SELECT u2.uuid, u2.handle, u2.display_name, u2.email, u2.avatar, f.created_at
      FROM friends f
      JOIN users u1 ON u1.id = f.user_id
      JOIN users u2 ON u2.id = f.friend_id
      WHERE u1.uuid = ?;
    `,
      args: [uuidUser]
    });

    response.data = [...query.rows];
    status = 200;
    if (query.rows.length === 0) {
      response.message = `No friends found for ${uuidUser}`;
    } else {
      response.message = `Friends list for user uuid ${uuidUser}`;
    }
  } catch (err) {
    response.message = `${err}`;
  }

  return c.json(response, status);
};

async function readFriendList(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Endpoint requires a parameter',
  }
  return c.json(response, status);
}

async function updateFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Update Friend not yet implemented',
  }
  return c.json(response, status);
}

async function deleteFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Delete Friend not yet implemented',
  }
  return c.json(response, status);
}

const friendControllers = { createFriend, readFriendList, readFriendDetail, updateFriend, deleteFriend, }

export default friendControllers;
