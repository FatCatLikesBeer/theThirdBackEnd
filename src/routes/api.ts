import { Hono } from "hono";

import users from "./users.jsx";
import posts from "./posts.jsx"

const api = new Hono();

api.route("/users", users);
api.route("/posts", posts);

export default api;
