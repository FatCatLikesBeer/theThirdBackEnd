import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createComment(c: Context) {
  let status: ContentfulStatusCode = 500;
  const userUUID = c.get('uuid');
  const postUUID = c.req.param('postId');
  const content = c.req.queries('content');
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server error: POST comment',
  }

  const transaction = await turso.transaction();

  try {
    const postComment = await transaction.execute({
      sql: `INSERT INTO comments (user_id, post_id, content)
        VALUES (
          (SELECT id FROM users WHERE uuid = ?),
          (SELECT id FROM posts WHERE uuid = ?),
          ?
        )
        RETURNING uuid ;
      `,
      args: [userUUID, postUUID, content],
    });

    const userInfo = await turso.execute({
      sql: "SELECT handle, avatar FROM users WHERE uuid = ?",
      args: [userUUID],
    })

    if (postComment.rowsAffected != 0) {
      status = 200;
      response.message = "Comment posted";
      response.data = {
        comment_uuid: postComment.rows[0].uuid,
        content: content,
        created_at: Date.now(),
        user_uuid: userUUID,
        handle: userInfo.rows[0].handle,
        avatar: userInfo.rows[0].avatar,
        likes: 0,
        comment_liked: false,
      }
      await transaction.commit();
    }
  } catch (err) {
    response.message = `Database error: [PostComm19669]: ${err}`;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function readCommentDetail(c: Context) {
  let status: ContentfulStatusCode = 500;
  const commentUUID = c.req.param('commentId');
  const postUUID = c.req.param('postId');
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server error: GET comments detail',
  }

  try {
    const commentDetail = await turso.execute({
      sql: `SELECT u.uuid as user_uuid, c.uuid as comment_uuid, p.uuid as post_uuid,
        u.handle, u.display_name, u.avatar, c.content, c.created_at
        FROM users u
        JOIN comments c ON c.user_id = u.id
        JOIN posts p ON p.id = c.post_id
        WHERE c.uuid = ?;
      `,
      args: [commentUUID],
    });

    if (commentDetail.rows.length != 0) {
      status = 200;
      response.message = "Comment retrieved successfully";
      response.data = [...commentDetail.rows];
    }
  } catch (err) {
    console.error(err);
    response.message = `Could not retrieve comment: ${err}`
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
};

async function readCommentList(c: Context) {
  let status: ContentfulStatusCode = 500;
  const postUUID = c.req.param('postId');
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server Error: GET comments',
  }

  try {
    const listOfComments = await turso.execute({
      sql: `SELECT u.handle, u.avatar, u.display_name, u.uuid as user_uuid,
        c.uuid as comment_uuid, c.content, c.created_at
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = (SELECT id FROM posts WHERE uuid = ?);
        `,
      args: [postUUID],
    });

    status = 200;
    response.message = `List of comments for post ${postUUID}`;
    response.data = [...listOfComments.rows];
  } catch (err: any) {
    response.message = `${err.message}`;
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

async function updateComment(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Comments can not be updated',
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

async function deleteComment(c: Context) {
  let status: ContentfulStatusCode = 500;
  const commentUUID = c.req.param('commentId');
  const postUUID = c.req.param("postId");   // This value is unncessary, but may be used in the future
  const userUUID = c.get('uuid');
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Server Error: DELETE comments',
  }

  const transaction = await turso.transaction();

  try {
    const deleteComment = await transaction.execute({
      sql: `DELETE FROM comments
      WHERE post_id = (SELECT id FROM posts WHERE uuid = ?)
      AND user_id = (SELECT id FROM users WHERE uuid = ?)
      AND uuid = ?
      `,
      args: [postUUID, userUUID, commentUUID],
    });

    if (deleteComment.rowsAffected != 0) {
      status = 200;
      response.message = "Comment deleted!";
      response.data = [...deleteComment.rows];
      await transaction.commit();
    } else {
      response.message = "Comment not found OR comment not deleted";
    }
  } catch (err) {
    response.message = `Database error: ${err}`;
  } finally {
    transaction.close();
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

const commentControllers = {
  createComment, readCommentList, readCommentDetail, updateComment, deleteComment,
}

export default commentControllers;
