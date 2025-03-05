import { Hono } from "hono";

import type { Context } from "hono";

import users from "./users.jsx";
import posts from "./posts.jsx"
import comments from "./comments.jsx";
import friends from "./friends.jsx";
import likes from "./likes.jsx";
import auth from "./auth.jsx";
import { Docs } from "../static/docs.jsx";

const api = new Hono();

api.get("/", (c: Context) => { return c.html(<Docs />) });
api.route("/users", users);
api.route("/posts", posts);
api.route("/posts/:postId/comments", comments);
api.route("/posts/:postId/likes", likes);
api.route("/posts/:postId/comments/:commentId/likes", likes);
api.route("/friends", friends);
api.route("/auth", auth);

export default api;
