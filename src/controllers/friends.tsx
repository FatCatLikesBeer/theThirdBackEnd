import * as dotenv from 'dotenv';
import { turso as tursoDev } from '../library/dev_turso.js';
import { tursoProd } from '../library/prod_turso.js';

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

dotenv.config();

const turso = String(process.env.ENVRON) === "DEV" ? tursoDev : tursoProd;

async function createFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Server Error',
  }
  const friendUUID = c.req.param('friendId');
  const userUUID = c.get('uuid');

  const transaction = await turso.transaction();
  try {
    await transaction.execute({
      sql: `INSERT OR IGNORE INTO friends (user_id, friend_id)
      VALUES (
        (SELECT id FROM users WHERE uuid = ?),
        (SELECT id FROM users WHERE uuid = ?)
      );
      `,
      args: [userUUID, friendUUID],
    });

    const friendData = await turso.execute({
      sql: "SELECT handle, avatar FROM users WHERE uuid = ?",
      args: [friendUUID],
    });

    const responseData = {
      uuid: friendUUID,
      handle: friendData.rows[0].handle,
      avatar: friendData.rows[0].avatar,
      created_at: Date.now(),
    }

    status = 200;
    response.data = responseData;
    response.message = `${userUUID} added ${friendUUID} to their friends list`;
    await transaction.commit();
  } catch (err) {
    console.error(err);
    response.message = `{err}`;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

async function readFriendDetail(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Server Error',
  }
  const uuidUser = c.req.param('id');

  try {
    const query = await turso.execute({
      sql: `SELECT u2.uuid, u2.handle, u2.avatar, f.created_at
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

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
};

async function readFriendList(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Endpoint requires a parameter',
  }
  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

async function updateFriend(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Endpoint not in use',
  }
  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

async function deleteFriend(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Server Error',
  }
  const friendUUID = c.req.param('friendId');
  const userUUID = c.get('uuid');

  const transaction = await turso.transaction();
  try {
    const deleteFriendQuery = await transaction.execute({
      sql: `DELETE FROM friends
        WHERE user_id = (SELECT id FROM users WHERE uuid = ?)
        AND friend_id = (SELECT id FROM users WHERE uuid = ?);
      `,
      args: [userUUID, friendUUID],
    });

    if (deleteFriendQuery.rowsAffected) {
      status = 200;
      response.message = `${friendUUID} deleted from friends`;
    } else {
      response.message = `${friendUUID} NOT deleted from friends`;
    }
    await transaction.commit();
  } catch (err) {
    response.message = `{err}`;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

const friendControllers = { createFriend, readFriendList, readFriendDetail, updateFriend, deleteFriend, }

export default friendControllers;
