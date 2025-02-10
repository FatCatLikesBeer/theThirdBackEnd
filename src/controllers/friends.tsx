import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server Error',
  }
  const friendUUID = c.req.param('friendId');
  const userUUID = c.get('uuid');

  const transaction = await turso.transaction();
  try {
    const createFriend = await transaction.execute({
      sql: `INSERT OR IGNORE INTO friends (user_id, friend_id)
      VALUES (
        (SELECT id FROM users WHERE uuid = ?),
        (SELECT id FROM users WHERE uuid = ?)
      );
      `,
      args: [userUUID, friendUUID],
    });

    console.log(createFriend);
    status = 200;
    response.data = [...createFriend.rows];
    response.message = `${userUUID} added ${friendUUID} to their friends list`;
    await transaction.commit();
  } catch (err) {
    console.error(err);
    response.message = `{err}`;
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function readFriendDetail(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server Error',
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

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
};

async function readFriendList(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Endpoint requires a parameter',
  }
  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function updateFriend(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Endpoint not in use',
  }
  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function deleteFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Delete Friend not yet implemented',
  }
  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

const friendControllers = { createFriend, readFriendList, readFriendDetail, updateFriend, deleteFriend, }

export default friendControllers;
