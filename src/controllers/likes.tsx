import type { Context } from "hono";

function createLike(c: Context) {
  const postId = c.req.param('postId');
  const commentId = c.req.param('commentId') || null;
  const response = {
    success: true,
    type: commentId === null ? "post" : "comment",
    postId: postId,
    commentId: commentId,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response);
}

function readLikeDetail(c: Context) {
  const postId = c.req.param('postId');
  const commentId = c.req.param('commentId') || null;
  const response = {
    success: true,
    type: commentId === null ? "post" : "comment",
    postId: postId,
    commentId: commentId,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response);
};

function readLikeList(c: Context) {
  const postId = c.req.param('postId');
  const commentId = c.req.param('commentId') || null;
  const response = {
    success: true,
    type: commentId === null ? "post" : "comment",
    postId: postId,
    commentId: commentId,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response);
}

function updateLike(c: Context) {
  const postId = c.req.param('postId');
  const commentId = c.req.param('commentId') || null;
  const response = {
    success: true,
    type: commentId === null ? "post" : "comment",
    postId: postId,
    commentId: commentId,
    path: `${c.req.path}`,
    message: 'Update Like not yet implemented\n This endpoint might not be used',
  }
  return c.json(response);
}

function deleteLike(c: Context) {
  const postId = c.req.param('postId');
  const commentId = c.req.param('commentId') || null;
  const response = {
    success: true,
    type: commentId === null ? "post" : "comment",
    postId: postId,
    commentId: commentId,
    path: `${c.req.path}`,
    message: 'Delete Like not yet implemented',
  }
  return c.json(response);
}

const likeControllers = {
  createLike, readLikeList, readLikeDetail, updateLike, deleteLike,
}

export default likeControllers;
