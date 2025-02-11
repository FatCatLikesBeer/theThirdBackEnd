import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createLike(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: true,
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

  return c.json(response, status);
}

async function readLikeDetail(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
};

async function readLikeList(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
}

async function updateLike(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
}

async function deleteLike(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const commentUUID = c.req.param('commentId') || null;
  const userUUID = c.get("uuid");
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
}

const likeControllers = {
  createLike, readLikeList, readLikeDetail, updateLike, deleteLike,
}

export default likeControllers;
