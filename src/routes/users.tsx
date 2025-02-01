import { Hono } from 'hono';
import type { Context } from 'hono';
import userControllers from '../controllers/users.js';

const users = new Hono();

users.get('/', userControllers.getDetail);

export default users;
