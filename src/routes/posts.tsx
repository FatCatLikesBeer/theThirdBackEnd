import { Hono } from 'hono';
import type { Context } from 'hono';
import postControllers from '../controllers/posts.js';

const posts = new Hono();

posts.post('/', postControllers.createPost);
posts.get('/', postControllers.readPostList);
posts.get('/:id', postControllers.readPostDetail);
posts.put('/', postControllers.updatePost);
posts.delete('/', postControllers.deletePost);

export default posts;
