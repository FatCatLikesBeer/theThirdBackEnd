import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { turso } from "../library/dev_turso.js";
import { retrieveUUID } from "../middleweare/authChecker.js";

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

/**
  * readPostDetail
  * Queries all details of a post
  * based on provided uuid
  */
async function readPostDetail(c: Context) {
  let status: ContentfulStatusCode = 400;
  const uuid = c.req.param("id");
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: "Bad request",
  }

  try {
    const queryPost = await turso.execute({
      sql: `SELECT u.uuid AS user_uuid, u.avatar, u.display_name, u.handle,
        p.uuid AS post_uuid, p.content, p.created_at,
        COUNT(c.post_id) AS comment_count, COUNT(l.post_id) AS like_count,
        COALESCE(json_group_array(
          json_object(
            'comment_uuid', c.uuid,
            'content', c.content,
            'created_at', c.created_at,
            'user_uuid', u2.uuid,
            'handle', u2.handle,
            'avatar', u2.avatar,
            'likes', l2.like_count
          )
        ), '[]') AS comments
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN comments c ON c.post_id = p.id
        LEFT JOIN likes l ON l.post_id = p.id
        LEFT JOIN users u2 ON c.user_id = u2.id
        LEFT JOIN (
          SELECT id, COUNT(*) AS like_count, comment_id
          FROM likes
          GROUP BY id
        ) l2 ON l2.comment_id = c.id
        WHERE p.uuid = ?
        GROUP BY p.id;
      `,
      args: [uuid],
    });

    if (queryPost.rows.length != 0) {
      status = 200;
      response.success = true;
      response.message = `Post for uuid: ${uuid}`;
      response.data = { ...queryPost.rows[0] }
      response.data.comments = JSON.parse(response.data.comments);
    } else {
      throw new Error("Post may not exist");
    }
  } catch (err) {
    response.message = `${err}`;
  }

  return c.json(response, status);
};

// If friends=true or false, query most recent friends posts
// else, if queries exist, then search
// Else, return most recent posts
async function readPostList(c: Context) {
  let status: ContentfulStatusCode = 400;
  const user = c.req.query("user") || undefined;
  const friends = c.req.query("friends");
  const userUUID = await retrieveUUID(c);
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Bad request',
  }

  // Get posts from specific user
  if (user?.length === 32) {
    try {
      const userPosts = await turso.execute({
        sql: `SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
        p.uuid AS post_uuid, p.content, p.created_at,
        COUNT(c.post_id) AS comment_count, COUNT(l.post_id) as like_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON l.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        WHERE u.uuid = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 20;
      `,
        args: [user],
      });

      response.data = [...userPosts.rows];
      status = 200;
      response.message = `Query returned ${userPosts.rows.length} post${userPosts.rows.length === 1 ? "" : "s"}`;
      response.success = String(status).search("2") === 0;
      return c.json(response, status);
    } catch (err) {
      status = 500;
      response.message = `Database error: [GetPosts61839]: ${err}`
      response.success = String(status).search("2") === 0;
      return c.json(response, status);
    }
  } else if (user) {
    status = 500;
    response.message = `Error: [GetPosts11212]: ${user} is not valid`;
    response.success = String(status).search("2") === 0;
    return c.json(response, status);
  }

  // Get posts from friends
  if ((friends) && (userUUID)) {
    try {
      const friendsPosts = await turso.execute({
        sql: `SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
          p.uuid AS post_uuid, p.content, p.created_at,
          COUNT(c.post_id) AS comment_count, COUNT(l.post_id) AS like_count
          FROM posts p
          JOIN friends f ON u.id = f.friend_id
          JOIN users u ON p.user_id = u.id
          LEFT JOIN comments c ON c.post_id = p.id
          LEFT JOIN likes l ON l.post_id = p.id
          WHERE f.user_id = (SELECT id FROM users WHERE uuid = ?)
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 20;
        `,
        args: [userUUID],
      });

      status = 200;
      response.data = [...friendsPosts.rows];
      response.message = "List of posts from friends";
    } catch (err) {
      console.error("Database error: GET91603", err);
      response.message = `Database error [GetPosts91638]: ${err}`;
    }
    response.success = String(status).search("2") === 0;
    return c.json(response, status);
  }

  try {
    const searchQuery = c.req.query("search");
    if (searchQuery === undefined) {
      // most recent posts
      const queryPosts = await turso.execute(`
        SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
        p.uuid AS post_uuid, p.content, p.created_at,
        COUNT(c.post_id) AS comment_count, COUNT(l.post_id) as like_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON l.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 20;
      `);

      response.message = `${queryPosts.rows.length} of the most recent post${queryPosts.rows.length === 1 ? "" : "s"}`;
      response.data = [...queryPosts.rows];
      status = 200;
    } else {
      // search
      const querySearch = await turso.execute({
        sql: `
          SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
          p.uuid AS post_uuid, p.content, p.created_at,
          COUNT(c.post_id) AS comment_likes, COUNT(l.post_id) as like_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN likes l ON l.post_id = p.id
          LEFT JOIN comments c ON c.post_id = c.id
          WHERE p.content LIKE ?
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 20;
        `,
        args: [`%${searchQuery}%`],
      });
      response.message = `Search query returned ${querySearch.rows.length} post${querySearch.rows.length === 1 ? "" : "s"}`;
      response.data = [...querySearch.rows];
      status = 200;
    }
  } catch (err) {
    response.message = `${err}`;
  }

  response.success = String(status).search("2") === 0;
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
