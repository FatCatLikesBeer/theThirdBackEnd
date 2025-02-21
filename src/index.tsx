import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

import type { FC } from "hono/jsx";
import type { Context } from "hono";

import statics from "./routes/static.js";
import api from "./routes/api.js";

const app = new Hono();
app.use(cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type"],
  exposeHeaders: ["Authorization"],
}));

// SPA
const Test: FC = () => <h1>Welcome to The Third</h1>;
app.get("/", (c: Context) => c.html(<Test />));

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

// TODO: Setup emial with custom domain,
// TODO: Install node mailer & TOTP
// TODO: Rewrite auth logic
// TODO: Create avatar uploading stuff (this might be relegated to the frontend)
// TODO: Implemented JWT & TOTP
// TODO: Automate turso switching URL when going to prod
