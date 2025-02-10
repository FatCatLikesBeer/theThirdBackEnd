import { Hono } from 'hono';
import { StaticControllers } from '../controllers/static.js';
import type { Context } from "hono";

const statics = new Hono();

const { StaticUser, StaticPost, StaticComment } = { ...StaticControllers };

statics.get('/', (c: Context) => { return c.redirect('/') });
statics.get('/users/:id', (c: Context) => { return c.html(<StaticUser user_id={c.req.param("id")} route={c.req.url} />) });
statics.get('/posts/:id', (c: Context) => { return c.html(<StaticPost post_id={c.req.param("id")} route={c.req.url} />) });
statics.get('/comments/:id', (c: Context) => { return c.html(<StaticComment comment_id={c.req.param("id")} route={c.req.url} />) });

export default statics;
