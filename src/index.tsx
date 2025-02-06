import * as dotenv from 'dotenv';
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { FC } from 'hono/jsx';
import type { Context } from 'hono';

import statics from './routes/static.js';
import api from './routes/api.js';

dotenv.config();
const app = new Hono();

// SPA
const Test: FC = () => <h1>Welcome to The Third</h1>;
app.get('/', (c: Context) => c.html(<Test />));

// API endpoints
app.route("/api", api);

// Static Endpoints
app.route("/static", statics);

const port = 3000
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});

// TODO: Create endpoint logic: users, friends, posts, comments, likes
// TODO: Draft up basic frontend
// TODO: Implemented JWT & TOTP
