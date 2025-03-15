import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trimTrailingSlash } from "hono/trailing-slash";
import { cors } from "hono/cors";

import type { FC } from "hono/jsx";
import type { Context } from "hono";

import statics from "./routes/static.js";
import api from "./routes/api.js";

const app = new Hono();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  allowHeaders: ["Authorization", "Content-Type"],
  exposeHeaders: ["Authorization"],
}));
app.use(trimTrailingSlash());

// SPA
app.use("*", serveStatic({ root: "./public" }));

{/* const Test: FC = () => <h1>Welcome to The Third</h1>; */ }
{/* app.get("/", (c: Context) => c.html()); */ }

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

// TODO: Automate turso switching URL when going to prod
