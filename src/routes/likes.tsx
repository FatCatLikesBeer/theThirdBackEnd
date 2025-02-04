import { Hono } from 'hono';
import likeControllers from '../controllers/likes.jsx';

const likes = new Hono();

likes.post('/', likeControllers.createLike);
likes.get('/', likeControllers.readLikeList);
likes.get('/:id', likeControllers.readLikeDetail);
likes.put('/', likeControllers.updateLike);
likes.delete('/', likeControllers.deleteLike);

export default likes;
