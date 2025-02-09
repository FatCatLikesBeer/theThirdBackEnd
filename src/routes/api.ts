import { Hono } from "hono";
import type { Context } from "hono";

import { setSignedCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';

import users from "./users.jsx";
import posts from "./posts.jsx"
import comments from "./comments.jsx";
import friends from "./friends.jsx";
import likes from "./likes.jsx";

const api = new Hono();

api.get("/", (c: Context) => {
  return c.json({
    message: "What are you doing here",
    success: true,
    route: `${c.req.routePath}`,
  });
});

api.route("/users", users);
api.route("/posts", posts);
api.route("/posts/:postId/comments", comments);
api.route("/posts/:postId/likes", likes);
api.route("/posts/:postId/comments/:commentId/likes", likes);
api.route('/friends', friends);

// Couple routes for getting a legit user cookie
import * as dotenv from 'dotenv';

dotenv.config();

const jwtSecret = String(process.env.JWT_SECRET);
const cookieSecret = String(process.env.COOKIE_SECRET);

api.get('/get-good-cookie', async (c: Context) => {
  const payload = {
    user: "36d9cb69f79e158d31396a7b973ba7e4",                 // user 3 UUID
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 5),  // 5 days
    nbf: Math.floor(Date.now() / 1000) - 300,
    iat: Math.floor(Date.now() / 1000),
  }

  const token = await sign(payload, jwtSecret);
  await setSignedCookie(c, 'jwt', token, cookieSecret);

  return c.text("You should have recieved a cookie whos key is 'jwt'");
});

api.get('/get-bad-cookie', async (c: Context) => {
  const payload = {
    user: "36d9cb69f79e158d31396a7b973ba7e4",                 // user 3 UUID
    exp: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 5),  // 5 days ago
    nbf: Math.floor(Date.now() / 1000) - 300,
    iat: Math.floor(Date.now() / 1000),
  }

  const token = await sign(payload, jwtSecret);
  await setSignedCookie(c, 'jwt', token, cookieSecret);

  return c.text("You should have recieved a cookie whos key is 'jwt'");
});

export default api;
