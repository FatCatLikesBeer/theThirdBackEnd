import { Hono } from 'hono';
import commentControllers from '../controllers/comments.js';

const comments = new Hono();

comments.post('/', commentControllers.createComment);
comments.get('/', commentControllers.readCommentList);
comments.get('/:id', commentControllers.readCommentDetail);
comments.put('/', commentControllers.updateComment);
comments.delete('/', commentControllers.deleteComment);

export default comments;
