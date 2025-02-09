import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createPost(c: Context) {
  const status: ContentfulStatusCode = 400;
  const response = {
    success: false,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
}

async function readPostDetail(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: "Bad request",
  }

  const uuid = c.req.param("id");

  try {
    const queryPost = await turso.execute({
      sql: `SELECT p.content, p.created_at, u.uuid,
        u.avatar, u.handle, COUNT(l.post_id) AS like_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON p.id = l.post_id
        WHERE p.uuid = ?
        GROUP BY p.id
        ;
      `,
      args: [uuid],
    });

    if (queryPost.rows.length != 0) {
      status = 200;
      response.message = `Post for uuid: ${uuid}`;
      response.data = { ...queryPost.rows[0] }
    } else {
      throw new Error("Post may not exist");
    }
  } catch (err) {
    response.message = `${err}`;
  }

  return c.json(response, status);
};

async function readPostList(c: Context) {
  const status: ContentfulStatusCode = 400;
  const response = {
    success: false,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response, status);
}

async function updatePost(c: Context) {
  const status: ContentfulStatusCode = 400;
  const response = {
    success: false,
    path: `${c.req.path}`,
    message: 'Update Post not yet implemented',
  }
  return c.json(response, status);
}

async function deletePost(c: Context) {
  const status: ContentfulStatusCode = 400;
  const response = {
    success: false,
    path: `${c.req.path}`,
    message: 'Delete Post not yet implemented',
  }
  return c.json(response, status);
}

const postControllers = {
  createPost, readPostList, readPostDetail, updatePost, deletePost,
}

export default postControllers;
