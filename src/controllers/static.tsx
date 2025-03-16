import * as dotenv from 'dotenv';
import type { FC } from "hono/jsx";
import { turso as tursoDev } from '../library/dev_turso.js';
import { tursoProd } from '../library/prod_turso.js';

dotenv.config();

const turso = String(process.env.ENVRON) === "DEV" ? tursoDev : tursoProd;

function getAvatar(avatar: any): string {
  const bucketURL = "http://my-bucket.mooo.com:9000/the-third/";
  return `${bucketURL}${avatar}.jpg`;
}

const StaticUser: FC = async ({ user_id, route }) => {
  const userId: string = user_id;

  const queryContent = await turso.execute({
    sql: "SELECT email, handle, avatar FROM users WHERE uuid = ?;",
    args: [userId],
  });

  const { email, handle, avatar } = { ...queryContent.rows[0] };

  return (
    <>
      {
        queryContent.rows.length != 0
          ?
          <>
            <head>
              <meta property="og:title" content={`${queryContent.rows[0].handle}'s Profile`} />
              <meta property="og:image" content={`${getAvatar(queryContent.rows[0].avatar)}`} />
              <meta property="og:url" content={`${route}`} />
            </head>
            <body>
              <h1>Static User</h1>
              <p>Email: {email}</p>
              <p>UserName: {handle}</p>
              <img src={getAvatar(avatar)} />
            </body>
          </>
          :
          <>
            <head>
              <title>Nothing's Here 😩</title>
              <meta property="og:title" content="There is no user here" />
              <meta property="og:image" content="http://my-bucket.mooo.com:9000/the-third/empty.jpg" />
              <meta property="og:url" content={`${route}`} />
            </head>
            <body>
              <h1>No User Found</h1>
              <img src="http://my-bucket.mooo.com:9000/the-third/empty.jpg" />
            </body>
          </>
      }
    </>
  );
}

const StaticPost: FC = async ({ post_id, route }) => {
  const postId: string = post_id;

  const queryPostContent = await turso.execute({
    sql: `SELECT u.handle, u.avatar, p.content, p.created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.uuid = ?;
    `,
    args: [postId],
  });
  const queryPostLikes = await turso.execute({
    sql: `SELECT u.id, u.handle
    FROM likes l
    JOIN users u ON l.user_id = u.id
    JOIN posts p ON p.id = l.post_id
    WHERE p.uuid = ?;
    `,
    args: [postId],
  });

  console.log(queryPostContent);
  console.log(queryPostLikes);

  return (
    <>
      {
        queryPostContent.rows.length != 0
          ?
          <>
            <head>
              <title>The Third</title>
              <meta property="og:title" content={`${queryPostContent.rows[0].handle}'s Post`} />
              <meta property="og:image" content={`${getAvatar(queryPostContent.rows[0].avatar)}`} />
              <meta property="og:url" content={`${route}`} />
            </head>
            <body>
              <p>{postId}</p>
              <p>User: {queryPostContent.rows[0].handle}</p>
              <img src={getAvatar(queryPostContent.rows[0].avatar)} />
              <p>Post: {queryPostContent.rows[0].content}</p>
              <p>Likes: {queryPostLikes.rows.length}</p>
              {queryPostLikes.rows.map((elem) => {
                return (
                  <p>{elem.handle}</p>
                )
              })}
            </body>
          </>
          :
          <>
            <head>
              <title>Nothing's Here 😩</title>
              <meta property="og:title" content="There is no post here" />
              <meta property="og:image" content="http://my-bucket.mooo.com:9000/the-third/empty.jpg" />
              <meta property="og:url" content={`${route}`} />
            </head>
            <body>
              <h1>No Post Found</h1>
              <img src="http://my-bucket.mooo.com:9000/the-third/empty.jpg" />
            </body>
          </>
      }
    </>
  );
}

const StaticComment: FC = async ({ comment_id, route }) => {
  const commentId: string = comment_id;

  const queryCommenter = await turso.execute({
    sql: ` SELECT u.handle, u.avatar
      FROM users u
      JOIN comments c ON c.user_id = u.id
      WHERE c.uuid = ?;
    `,
    args: [commentId],
  });
  const queryCommentContent = await turso.execute({
    sql: "SELECT content, created_at FROM comments WHERE uuid = ?;",
    args: [commentId],
  });
  const queryCommentLikes = await turso.execute({
    sql: `SELECT u.handle, u.avatar
    FROM users u
    JOIN likes l ON l.user_id = u.id
    JOIN comments c ON l.comment_id = c.id
    WHERE c.uuid = ?;
    `,
    args: [commentId],
  });
  const queryPostContent = await turso.execute({
    sql: `SELECT p.content
    FROM posts p
    JOIN comments c ON c.post_id = p.id
    WHERE c.uuid = ?;
    `,
    args: [commentId],
  });
  const queryPoster = await turso.execute({
    sql: `SELECT u.handle, u.avatar
    FROM users u
    JOIN posts p ON p.user_id = u.id
    JOIN comments c ON p.id = c.post_id
    WHERE c.uuid = ?;
    `,
    args: [commentId],
  });

  console.log(queryPoster);

  return (
    <>
      {
        queryCommentContent.rows.length != 0
          ?
          <>
            <head>
              <title>The Third: Comment</title>
              <meta property="og:title" content={`${queryCommenter.rows[0].handle}'s Comment`} />
              <meta property="og:image" content={`${getAvatar(queryCommenter.rows[0].avatar)}`} />
              <meta property="og:url" content={`${route}`} />
            </head>
            <body>
              <div>
                <h2>Comment</h2>
                <p>User: {queryCommenter.rows[0].handle}</p>
                <img src={getAvatar(queryCommenter.rows[0].avatar)} />
                <p>Post: {queryCommentContent.rows[0].content}</p>
                <p>Likes: {queryCommentLikes.rows.length}</p>
              </div>
              <div>
                <h2>Original Post</h2>
                <p>User: {queryPoster.rows[0].handle}</p>
                <img src={getAvatar(queryPoster.rows[0].avatar)} />
                <p>Post: {queryPostContent.rows[0].content}</p>
              </div>
            </body>
          </>
          :
          <>
            <head>
              <title>Nothing's Here 😩</title>
              <meta property="og:title" content="There is no comment here" />
              <meta property="og:image" content="http://my-bucket.mooo.com:9000/the-third/empty.jpg" />
              <meta property="og:url" content={`${route}`} />
            </head>
            <body>
              <h1>No Comment Found</h1>
              <img src="http://my-bucket.mooo.com:9000/the-third/empty.jpg" />
            </body>
          </>
      }
    </>
  );
}

export const StaticControllers = { StaticUser, StaticPost, StaticComment };
