import { Hono } from 'hono';
import { StaticControllers } from '../controllers/static.js';
import type { Context } from "hono";

const statics = new Hono();

const { StaticUser, StaticPost, StaticComment } = { ...StaticControllers };

statics.get('/users/:id', (c: Context) => { return c.html(<StaticUser user_id={c.req.param("id")} />) });
statics.get('/posts/:id', (c: Context) => { return c.html(<StaticPost post_id={c.req.param("id")} />) });
statics.get('/comments/:id', (c: Context) => { return c.html(<StaticComment comment_id={c.req.param("id")} />) });

export default statics;
