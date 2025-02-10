import { Hono } from 'hono';
import commentControllers from '../controllers/comments.js';
import { authChecker } from '../middleweare/authChecker.js';

const comments = new Hono();

comments.post('/', authChecker, commentControllers.createComment);
comments.get('/', commentControllers.readCommentList);
comments.get('/:commentId', commentControllers.readCommentDetail);
comments.put('/', authChecker, commentControllers.updateComment);
comments.delete('/:commentId', authChecker, commentControllers.deleteComment);

export default comments;
