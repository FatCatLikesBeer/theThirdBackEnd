import { Hono } from 'hono';
import likeControllers from '../controllers/likes.jsx';
import { authChecker } from '../middleweare/authChecker.js';

const likes = new Hono();

likes.post('/', authChecker, likeControllers.createLike);
likes.get('/', likeControllers.readLikes);
likes.put('/', likeControllers.updateLike);
likes.delete('/', authChecker, likeControllers.deleteLike);

export default likes;
