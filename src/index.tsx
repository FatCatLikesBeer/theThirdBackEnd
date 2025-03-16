import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trimTrailingSlash } from "hono/trailing-slash";
import { cors } from "hono/cors";

import statics from "./routes/static.js";
import api from "./routes/api.js";
import botDropOut from "./middleweare/botDropOut.js";

const app = new Hono();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  allowHeaders: ["Authorization", "Content-Type"],
  exposeHeaders: ["Authorization"],
}));

app.use(trimTrailingSlash());

app.use(botDropOut);

// SPA
app.use("*", serveStatic({ root: "./public" }));

// API endpoints
app.route("/api", api);

// Static Endpoints
app.route("/static", statics);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

// TODO: Static post page
// TODO: Static user page
// TODO: Automate turso switching URL when going to prod
