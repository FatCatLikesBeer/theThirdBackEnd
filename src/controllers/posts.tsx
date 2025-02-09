import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createPost(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
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

// If queries exist, then search
// Else, return most recent posts
async function readPostList(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Bad request',
  }

  try {
    const searchQuery = c.req.query();
    if (Object.values(searchQuery).length === 0) {
      // most recent posts
      const queryPosts = await turso.execute(`
        SELECT u.handle, u.avatar, p.content, p.created_at, COUNT(l.post_id) as like_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON l.post_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 20;
      `);

      response.message = `Query returned ${queryPosts.rows.length} post${queryPosts.rows.length === 1 ? "" : "s"}`;
      response.data = [...queryPosts.rows];
      status = 200;
    } else {
      // search
      const querySearch = await turso.execute({
        sql: `
          SELECT u.handle, u.avatar, p.content, p.created_at, COUNT(l.post_id) as like_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN likes l ON l.post_id = p.id
          WHERE p.content LIKE ?
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 20;
        `,
        args: [`%${searchQuery.search}%`],
      });
      response.message = `Query returned ${querySearch.rows.length} post${querySearch.rows.length === 1 ? "" : "s"}`;
      response.data = [...querySearch.rows];
      status = 200;
    }
  } catch (err) {
    response.message = `${err}`;
  }

  return c.json(response, status);
}

async function updatePost(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Update Post not yet implemented',
  }
  return c.json(response, status);
}

async function deletePost(c: Context) {
  let status: ContentfulStatusCode = 400;
  const response: APIResponse = {
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
