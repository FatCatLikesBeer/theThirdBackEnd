import type { FC } from "hono/jsx";
import { turso } from "../library/dev_turso.js";

const bucketURL = "http://my-bucket.mooo.com:9000/the-third/";

const StaticUser: FC = async ({ user_id }) => {
  const userId: string = user_id;

  const queryContent = await turso.execute({
    sql: "SELECT email, display_name, avatar FROM users WHERE uuid = ?;",
    args: [userId],
  });

  const { email, display_name, avatar } = { ...queryContent.rows[0] };

  const avatarURI = `${bucketURL}${avatar}.jpg`;

  return (
    <>
      {
        queryContent.rows.length != 0
          ?
          <>
            <h1>Static User</h1>
            <p>Email: {email}</p>
            <p>UserName: {display_name}</p>
            <img src={avatarURI} />
          </>
          :
          <h1>No User Found</h1>
      }
    </>
  );
}

const StaticPost: FC = async ({ post_id }) => {
  const postId: string = post_id;

  const queryPostContent = await turso.execute({
    sql: `SELECT u.display_name, u.avatar, p.content, p.created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.uuid = ?;
    `,
    args: [postId],
  });
  const queryPostLikes = await turso.execute({
    sql: `SELECT u.id, u.display_name
    FROM likes l
    JOIN users u ON l.user_id = u.id
    JOIN posts p ON p.id = l.post_id
    WHERE p.uuid = ?;
    `,
    args: [postId],
  });
  // const queryComments = await turso.execute({
  //   sql: `SELECT u.display_name, c.content, c.created_at
  //     FROM users u
  //     JOIN comments c ON c.user_id = u.id
  //     JOIN posts p ON p.id = c.post_id
  //     WHERE p.uuid = ?;
  //   `,
  //   args: [postId],
  // });
  // const queryCommentLikes = await turso.execute({
  //   sql: `SELECT u.display_name, u.id
  //     FROM users u
  //     JOIN likes l ON l.user_id = u.id
  //     JOIN comments c ON c.id = l.comment_id
  //     WHERE c.post_id = ?;
  //   `,
  //   args: [postId],
  // });

  console.log(queryPostContent);
  console.log(queryPostLikes);
  // console.log(queryComments);
  // console.log(queryCommentLikes);

  const avatarURI = `${bucketURL}${queryPostContent.rows[0].avatar}.jpg`;

  return (
    <>
      {
        queryPostContent.rows.length != 0
          ?
          <>
            <h1>Static Post</h1>
            <p>{postId}</p>
            <p>User: {queryPostContent.rows[0].display_name}</p>
            <img src={avatarURI} />
            <p>Post: {queryPostContent.rows[0].content}</p>
            <p>Likes: {queryPostLikes.rows.length}</p>
            {queryPostLikes.rows.map((elem) => {
              return (
                <p>{elem.display_name}</p>
              )
            })}
          </>
          :
          <h1>No Post Found</h1>
      }
    </>
  );
}

const StaticComment: FC = async ({ comment_id }) => {
  const commentId: string = comment_id;

  const queryContent = await turso.execute({
    sql: "SELECT content, created_at FROM comments WHERE uuid = ?;",
    args: [commentId],
  });
  const queryLikes = await turso.execute({
    sql: "SELECT COUNT(*) as like_count FROM likes WHERE comment_id = ?",
    args: [commentId],
  });

  return (
    <>
      {
        queryContent.rows.length != 0
          ?
          <>
            <h1>Static Post</h1>
            <p>Comment: {}</p>
            <p>Liex</p>
          </>
          :
          <h1>No Post Found</h1>
      }
    </>
  );
}

export const StaticControllers = { StaticUser, StaticPost, StaticComment };
