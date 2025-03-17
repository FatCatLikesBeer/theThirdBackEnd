import * as dotenv from 'dotenv';
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { turso } from '../library/prod_turso.js';

dotenv.config();

async function createLike(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server Error: POST like',
  }

  const sqlQuery = commentUUID === null ?
    `INSERT INTO likes (post_id, user_id)
      VALUES (
        (SELECT id FROM posts WHERE uuid = ?),
        (SELECT id FROM users WHERE uuid = ?)
      )
    ;`
    :
    ` INSERT INTO likes (comment_id, user_id)
      VALUES (
        (SELECT id FROM comments WHERE uuid = ?),
        (SELECT id FROM users WHERE uuid = ?)
      )
    ;`;

  const sqlArgs = commentUUID === null ? [postUUID, userUUID] : [commentUUID, userUUID];
  const messageTarget = commentUUID === null ? "post" : "comment";
  const transaction = await turso.transaction();
  try {
    const createLike = await transaction.execute({
      sql: sqlQuery,
      args: sqlArgs,
    });

    if (createLike.rowsAffected != 0) {
      status = 200;
      response.message = `You liked ${messageTarget}: ${postUUID}`;
    }

    await transaction.commit();
  } catch (err) {
    response.message = `Database error: ${err}`;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function readLikes(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const count = c.req.query('count') === undefined ? false : true;
  console.log("use count?", count);
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server Error: GET like',
  }

  const countQuery = commentUUID === null
    ?
    `SELECT COUNT(*) as count FROM likes WHERE post_id = (SELECT id FROM posts WHERE uuid = ?);`
    :
    `SELECT COUNT(*) as count FROM likes WHERE comment_id = (SELECT id FROM comments WHERE uuid = ?);`
    ;
  const sqlQuery = commentUUID === null
    ?
    `SELECT u.uuid, u.handle, u.avatar, u.display_name
        FROM users u
        JOIN likes l ON l.user_id = u.id
        WHERE l.post_id = (SELECT id FROM posts WHERE uuid = ?)
      ;`
    :
    `SELECT u.uuid, u.handle, u.avatar, u.display_name
        FROM users u
        JOIN likes l ON l.user_id = u.id
        WHERE l.comment_id = (SELECT id FROM comments WHERE uuid = ?)
      ;`
    ;
  const sqlArgs = commentUUID === null ? [postUUID] : [commentUUID];
  const messageTarget = commentUUID === null ? "post" : "comment";

  try {
    const likeDetail = await turso.execute({
      sql: count ? countQuery : sqlQuery,
      args: sqlArgs,
    });

    console.log(likeDetail);

    status = 200;
    if (likeDetail.rows.length != 0) {
      response.message = count ? `Likes count for ${messageTarget}.` : `Likes for ${messageTarget}.`;
      response.data = count ? { count: likeDetail.rows[0].count } : [...likeDetail.rows];
    } else {
      response.message = `No likes found for ${messageTarget}`;
    }

  } catch (err) {
    response.message = `Database error: ${err}`;
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function updateLike(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Endpoint not in use',
  }
  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

async function deleteLike(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: 'Unexpected Error: [DelLike92618]',
  }

  const sqlQuery = commentUUID === null
    ?
    `DELETE FROM likes
      WHERE user_id = (SELECT id FROM users WHERE uuid = ?)
      AND post_id = (SELECT id FROM posts WHERE uuid = ?)
    ;`
    :
    `DELETE FROM likes
      WHERE user_id = (SELECT id FROM users WHERE uuid = ?)
      AND comment_id = (SELECT id FROM comments WHERE uuid = ?)
    ;`
    ;
  const sqlArgs = commentUUID === null ? [userUUID, postUUID] : [userUUID, commentUUID];
  const messageTarget = commentUUID === null ? "post" : "comment";
  const messageUUID = commentUUID === null ? postUUID : commentUUID;

  const transaction = await turso.transaction();
  try {
    const deleteLike = await transaction.execute({ sql: sqlQuery, args: sqlArgs });
    if (deleteLike.rowsAffected) {
      status = 200;
      response.message = `Like for ${messageTarget} ${messageUUID} has been deleted`;
    } else {
      response.message = `Like for ${messageTarget} ${messageUUID} NOT deleted`;
    }
    await transaction.commit();
  } catch (err) {
    response.message = `Database error: ${err}`;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

const likeControllers = { createLike, readLikes, updateLike, deleteLike }

export default likeControllers;
