import * as dotenv from 'dotenv';
import { env } from "hono/adapter";
import { turso } from '../library/prod_turso.js';
import { retrieveUUID } from "../middleweare/authChecker.js";
import { randomBytes } from 'crypto';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

dotenv.config();

async function createPost(c: Context) {
  const uuid = c.get("uuid");
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: 'Can not create post',
  }

  const postContent = c.req.query("post");
  const contentType = c.req.query("contentType");
  const postUUID = c.req.query("postUUID");

  const postTransaction = await turso.transaction();
  try {
    if (undefined === postUUID) {
      const contentType = "text";
      await postTransaction.execute({
        sql: `INSERT INTO posts (user_id, content, content_type)
          SELECT id, ?, ?
          FROM users WHERE uuid = ?;
        ;`,
        args: [postContent, contentType, uuid],
      });
      await postTransaction.commit();
    } else if (contentType === "image") {
      console.log("Creating a post of content_type: image");
      await postTransaction.execute({
        sql: `INSERT INTO posts (user_id, content, content_type, uuid)
          SELECT id, ?, ?, ?
          FROM users WHERE uuid = ?;
        ;`,
        args: [postContent, contentType, postUUID, uuid],
      });
      await postTransaction.commit();
    }

    const readAttempt = await turso.execute({
      sql: `SELECT u.uuid AS user_uuid, u.handle, u.avatar,
        p.uuid as post_uuid, p.content, p.content_type, p.created_at
      FROM users u
      JOIN posts p ON p.user_id = u.id
      WHERE u.uuid = ?
      ORDER BY p.created_at DESC
      LIMIT 1
      ;`,
      args: [uuid],
    });

    status = 200;
    response.success = true;
    response.message = `Created post with uuid: ${readAttempt.rows[0].uuid}`;
    response.data = { ...readAttempt.rows[0] }
    response.data.like_count = 0;
    response.data.comment_count = 0;

  } catch (err) {
    console.error("POST ERROR", err);
    status = 400;
    response.message = `${err}`;
  } finally {
    postTransaction.close();
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
  const userUUID = await retrieveUUID(c);
  const uuid = c.req.param("id");
  const response: APIResponse = {
    success: false,
    path: `${c.req.path}`,
    message: "Bad request",
  };

  try {
    const queryPost = await turso.execute({
      sql: `SELECT u.uuid as user_uuid, u.avatar, u.handle, p.created_at,
          p.content, p.content_type, p.uuid as post_uuid
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.uuid = ?
      ;`,
      args: [uuid],
    });

    const queryComments = await turso.execute({
      sql: `SELECT c.content, c.created_at, c.uuid AS comment_uuid,
          u.uuid AS user_uuid, u.avatar, u.handle
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.post_id = (SELECT id FROM posts WHERE uuid = ?); `,
      args: [uuid],
    });

    // Check if user has liked said post
    const queryPostLiked = userUUID ? await turso.execute({
      sql: `SELECT * FROM likes WHERE post_id =
        (SELECT id FROM posts WHERE uuid = ?)
        AND user_id = (SELECT id FROM users WHERE uuid = ?)
      ;`,
      args: [uuid, userUUID],
    })
      :
      null;

    const postLikeCount = await turso.execute({
      sql: `SELECT COUNT(*) as like_count FROM likes
        WHERE post_id = (SELECT id FROM posts WHERE uuid = ?)
      ;`,
      args: [uuid],
    });

    if (queryPost.rows.length != 0) {
      status = 200;
      response.success = true;
      response.message = `Post for uuid: ${uuid}`;
      response.data = { ...queryPost.rows[0] }
      response.data.comments = [...queryComments.rows];
      response.data.comment_count = queryComments.rows.length;
      response.data.like_count = postLikeCount.rows[0].like_count;
      if (queryPostLiked) { response.data.post_liked = queryPostLiked?.rows.length > 0 ? true : false }

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
  const userQuery = c.req.query("user") || undefined;
  const friendsQuery = c.req.query("friends");
  const userUUID = await retrieveUUID(c);
  const response: APIResponse = {
    success: String(status).search("2") === 0 ? true : false,
    path: `${c.req.path}`,
    message: 'Bad request',
  }

  // List of posts and comments liked by requesting user
  const listOfContentLikedByUser = userUUID
    ? await turso.execute({
      sql: `SELECT p.uuid AS post_uuid, c.uuid AS comment_uuid
        FROM likes l
        LEFT JOIN comments c ON c.id = l.comment_id
        LEFT JOIN posts p ON p.id = l.post_id
        WHERE l.user_id = (SELECT id FROM users WHERE uuid = ?)
      `,
      args: [userUUID],
    })
    :
    { rows: [{ post_uuid: null }] }; // Returns a a thing that will always display flase

  // Get list of posts from queried user
  if (userQuery) {
    if (userQuery?.length === 32) {
      try {
        const userPosts = await turso.execute({
          sql: `SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
            p.uuid AS post_uuid, p.content, p.content_type, p.created_at,
            COUNT(DISTINCT c.id) AS comment_count, COUNT(DISTINCT l.id) as like_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN likes l ON l.post_id = p.id
            LEFT JOIN comments c ON c.post_id = p.id
            WHERE u.uuid = ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 60;
            `,
          args: [userQuery],
        });

        response.data = [...userPosts.rows];
        status = 200;
        response.message = `Query returned ${userPosts.rows.length} post${userPosts.rows.length === 1 ? "" : "s"}`;
        response.success = String(status).search("2") === 0;
      } catch (err) {
        status = 500;
        response.message = `Database error: [GetPosts61839]: ${err}`
        response.success = String(status).search("2") === 0;
      }
    } else {
      try {
        const userPosts = await turso.execute({
          sql: `SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
            p.uuid AS post_uuid, p.content, p.content_type, p.created_at,
            COUNT(DISTINCT c.post_id) AS comment_count, COUNT(DISTINCT l.post_id) as like_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN likes l ON l.post_id = p.id
            LEFT JOIN comments c ON c.post_id = p.id
            WHERE u.uuid IN (
              SELECT uuid FROM users WHERE handle LIKE ?
            )
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 60;
            `,
          args: [`%${userQuery}%`],
        });

        response.data = [...userPosts.rows];
        status = 200;
        response.message = `Query returned ${userPosts.rows.length} post${userPosts.rows.length === 1 ? "" : "s"}`;
        response.success = String(status).search("2") === 0;
      } catch (err) {
        status = 500;
        response.message = `Database error: [GetPosts61839]: ${err}`
        response.success = String(status).search("2") === 0;
      }
    }
  } else if (userQuery) {
    status = 500;
    response.message = `Error: [GetPosts11212]: ${userQuery} is not valid`;
    response.success = String(status).search("2") === 0;
  }

  // Get posts from friends
  else if ((friendsQuery) && (userUUID)) {
    try {
      const friendsPosts = await turso.execute({
        sql: `SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
          p.uuid AS post_uuid, p.content, p.content_type, p.created_at,
          COUNT(DISTINCT c.post_id) AS comment_count, COUNT(DISTINCT l.post_id) AS like_count
          FROM posts p
          JOIN friends f ON u.id = f.friend_id
          JOIN users u ON p.user_id = u.id
          LEFT JOIN comments c ON c.post_id = p.id
          LEFT JOIN likes l ON l.post_id = p.id
          WHERE f.user_id = (SELECT id FROM users WHERE uuid = ?)
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 60;
        `,
        args: [userUUID],
      });

      status = 200;
      response.data = [...friendsPosts.rows];
      response.message = "List of posts from friends";
    } catch (err) {
      status = 500;
      console.error("Database error: [GetPosts91638]", err);
      response.message = `Database error [GetPosts91638]: ${err}`;
    }
    response.success = String(status).search("2") === 0;
  } else {
    try {
      const searchQuery = c.req.query("search");
      if (searchQuery === undefined) {
        // most recent posts
        const queryPosts = await turso.execute(`
          SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
            p.uuid AS post_uuid, p.content, p.content_type, p.created_at,
            COUNT(DISTINCT c.id) AS comment_count,
            COUNT(DISTINCT l.id) as like_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN likes l ON l.post_id = p.id
          LEFT JOIN comments c ON c.post_id = p.id
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 60;
          `);

        response.message = `${queryPosts.rows.length} of the most recent post${queryPosts.rows.length === 1 ? "" : "s"}`;
        response.data = [...queryPosts.rows];
        status = 200;
      } else {
        // Get posts from searched content
        const querySearch = await turso.execute({
          sql: `
          SELECT u.uuid AS user_uuid, u.handle, u.avatar, u.display_name,
            p.uuid AS post_uuid, p.content, p.content_type, p.created_at,
            COUNT(DISTINCT c.post_id) AS comment_likes,
            COUNT(DISTINCT l.post_id) as like_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN likes l ON l.post_id = p.id
          LEFT JOIN comments c ON c.post_id = c.id
          WHERE p.content, p.content_type LIKE ?
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 60;
          `,
          args: [`%${searchQuery}%`],
        });
        response.message = `Search query returned ${querySearch.rows.length} post${querySearch.rows.length === 1 ? "" : "s"}`;
        response.data = [...querySearch.rows];
        status = 200;
      }
    } catch (err: any) {
      status = 500;
      response.message = `${err.message}`;
    }
  }

  // Inserts into result post_liked: boolean
  if (response.data && listOfContentLikedByUser) {
    response.data.forEach((dataElem: any, i: number) => {
      response.data[i].post_liked = false;
      response.data[i].comments = [];
      listOfContentLikedByUser.rows.forEach((likeElem) => {
        if (dataElem.post_uuid === likeElem.post_uuid) response.data[i].post_liked = true;
      });
    });
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

async function getPresignedURL(c: Context) {
  let status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: String(status).search("2") === 0,
    path: `${c.req.path}`,
    message: "Unexpected Error: [GetToken10001]",
  }

  const { R2_API_ENDPOINT } = env<{ R2_API_ENDPOINT: string }>(c);
  const { R2_ACCESS_KEY } = env<{ R2_ACCESS_KEY: string }>(c);
  const { R2_SECRET_KEY } = env<{ R2_SECRET_KEY: string }>(c);
  const postUUID = randomBytes(16).toString("hex");

  try {
    const S3 = new S3Client({
      region: "auto",
      endpoint: R2_API_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      }
    });

    const preSignedURL = await getSignedUrl(
      S3,
      new PutObjectCommand({ Bucket: "third-app-bucket", Key: `image${postUUID}.jpg` }),
      { expiresIn: 3600 },
    );

    status = 200;
    response.message = "Here's your presigned URL";
    response.data = {
      url: preSignedURL,
      postUUID: postUUID,
    };
  } catch (err) {
    console.error(err);
    response.message = "Contractor Error: [GetToken10002]";
  }

  response.success = String(status).search("2") === 0;
  return c.json(response, status);
}

const postControllers = {
  createPost, readPostList, readPostDetail, updatePost, deletePost, getPresignedURL,
}

export default postControllers;
