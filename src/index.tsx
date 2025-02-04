import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { FC } from 'hono/jsx';
import type { Context } from 'hono';

import StaticPost from './static/post.js';

import api from './routes/api.js';

const app = new Hono();

// SPA
const Test: FC = () => <h1>Welcome to The Third</h1>;
app.get('/', (c: Context) => c.html(<Test />));

// API endpoints
app.route("/api", api);

// Server Renderd Content
app.get('/static/post', async (c: Context) => {
  return c.html(<StaticPost title={"Hello There"} body={"It's working!"} />);
});

const port = 3000
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});

// TODO: Connect DB
// Create endpoint logic: users, friends, posts, comments, likes
// Draft up basic frontend
// Implemented JWT & TOTP
