import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { FC } from 'hono/jsx';
import type { Context } from 'hono';

import StaticPost from './static/post.js';

import users from './routes/users.js';

const app = new Hono();

// Welcome page, will be repalced with the front end
const Test: FC = () => <h1>Welcome to The Third</h1>;
app.get('/', (c: Context) => c.html(<Test />));

// API
app.route("/users", users);

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

// TODO: boiler plate all API endpoints
// TODO: Connect DB
