import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createComment(c: Context) {
  let status: ContentfulStatusCode = 500;
  const userUUID = c.get('uuid');
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
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
    message: 'POST not yet implemented',
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

  const listOfComments = await turso.execute({
    sql: `SELECT u.handle, u.avatar, u.display_name, u.uuid as user_uuid,
      c.uuid as comment_uuid, c.content, c.created_at
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = (SELECT id FROM posts WHERE uuid = ?);
    `,
    args: [postUUID],
  });

  if (listOfComments.rows.length != 0) {
    status = 200;
    response.message = `List of comments for post ${postUUID}`;
    response.data = [...listOfComments.rows];
  }

  response.success = String(status).search("2") === 0 ? true : false;
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
  const postUUID = c.req.param('postId');
  const userUUID = c.get('uuid');
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }

  response.success = String(status).search("2") === 0 ? true : false;
  return c.json(response, status);
}

const commentControllers = {
  createComment, readCommentList, readCommentDetail, updateComment, deleteComment,
}

export default commentControllers;
