import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trimTrailingSlash } from "hono/trailing-slash";
import { cors } from "hono/cors";

import statics from "./routes/static.js";
import api from "./routes/api.js";
import botDropOut from "./middleweare/botDropOut.js";
import conInfo from "./middleweare/conInfo.js";

const app = new Hono();

app.use(conInfo);

app.use(cors({
  origin: ["https://app.billlaaayyy.dev",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost"
  ],
  credentials: true,
  allowHeaders: ["Authorization", "Content-Type"],
  exposeHeaders: ["Authorization"],
}));

app.use(trimTrailingSlash());

app.use(botDropOut);

// API endpoints
app.route("/api", api);

// Static Endpoints
app.route("/static", statics);

// SPA
app.use("*", serveStatic({
  root: "./public",
  rewriteRequestPath: (path) => {
    let resultPath = path;
    if (path.startsWith("/api")) {
      return resultPath;
    } else if (path.startsWith("/assets")) {
      return resultPath;
    } else {
      return "/index.html";
    }
  }
}));

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
