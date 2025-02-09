import { Hono } from 'hono';
import postControllers from '../controllers/posts.js';
import { authChecker } from '../middleweare/authChecker.js';

const posts = new Hono();

posts.post('/', authChecker, postControllers.createPost);
posts.get('/', postControllers.readPostList);
posts.get('/:id', postControllers.readPostDetail);
posts.put('/', authChecker, postControllers.updatePost);
posts.delete('/', authChecker, postControllers.deletePost);

export default posts;
