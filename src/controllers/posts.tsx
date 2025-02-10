import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";

async function createPost(c: Context) {
  const uuid = c.get("uuid");
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Can not create post',
  }

  const postContent = c.req.queries('post');

  const transaction = await turso.transaction();
  try {
    const postAttempt = await transaction.execute({
      sql: `INSERT INTO posts (user_id, content)
      SELECT id, ? FROM users WHERE uuid = ?
      RETURNING content, created_at, uuid;
      `,
      args: [postContent, uuid],
    });

    status = 200;
    response.success = true;
    response.message = `Created post with uuid: ${postAttempt.rows[0].uuid}`;
    response.data = { ...postAttempt.rows[0] }

    await transaction.commit();
  } catch (err) {
    console.error("POST ERROR", err);
    status = 400;
    response.message = `${err}`;
  } finally {
    transaction.close();
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
      sql: `SELECT p.uuid, p.content, p.created_at, u.uuid,
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
      response.success = true;
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
        SELECT u.handle, u.avatar, p.uuid, p.content, p.created_at, COUNT(l.post_id) as like_count
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
          SELECT u.handle, u.avatar, p.uuid, p.content, p.created_at, COUNT(l.post_id) as like_count
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
      response.success = true;
      status = 200;
    }
  } catch (err) {
    response.message = `${err}`;
  }

  return c.json(response, status);
}

async function updatePost(c: Context) {
  let status: ContentfulStatusCode = 501;
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'Posts can not be edited',
  }
  return c.json(response, status);
}

async function deletePost(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Can not delete post',
  }

  const uuidUser = c.get('uuid');
  const postId = c.req.param("id");

  const transaction = await turso.transaction();
  try {
    const verifyRequest = await transaction.execute({
      sql: `SELECT u.uuid AS userID, p.uuid AS postID
        FROM users u
        JOIN posts p ON p.user_id = u.id
        WHERE p.uuid = ?;
      `,
      args: [postId]
    });
    // cant read userID if it doesn't exist
    console.log("request uuid", uuidUser);
    console.log("request post", postId);
    console.log("first sql query", verifyRequest);
    if (postId != verifyRequest.rows[0]?.postID) {
      status = 404;
      throw new Error("Post can not be found");
    }
    if (uuidUser != verifyRequest.rows[0]?.userID) {
      status = 401;
      throw new Error("Unauthorized");
    }
    if ((verifyRequest.rows[0].userID === uuidUser) && (verifyRequest.rows[0].postID === postId)) {
      const deletePost = await transaction.execute({
        sql: 'DELETE FROM posts WHERE uuid = ? RETURNING uuid',
        args: [postId],
      });

      status = 200;
      response.success = true;
      response.message = `Post with UUID: '${deletePost.rows[0].uuid}' has been deleted`;
    }

    await transaction.commit();
  } catch (err) {
    console.error(err);
    response.message = `${err}`;
  } finally {
    transaction.close();
  }

  return c.json(response, status);
}

const postControllers = {
  createPost, readPostList, readPostDetail, updatePost, deletePost,
}

export default postControllers;
