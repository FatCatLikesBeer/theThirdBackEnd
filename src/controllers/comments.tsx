import type { Context } from "hono";

function createComment(c: Context) {
  const postId = c.req.param('postId');
  const response = {
    success: true,
    postId: postId,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response);
}

function readCommentDetail(c: Context) {
  const postId = c.req.param('postId');
  const response = {
    success: true,
    postId: postId,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response);
};

function readCommentList(c: Context) {
  const postId = c.req.param('postId');
  const response = {
    success: true,
    postId: postId,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response);
}

function updateComment(c: Context) {
  const postId = c.req.param('postId');
  const response = {
    success: true,
    postId: postId,
    path: `${c.req.path}`,
    message: 'Update Comment not yet implemented',
  }
  return c.json(response);
}

function deleteComment(c: Context) {
  const postId = c.req.param('postId');
  const response = {
    success: true,
    postId: postId,
    path: `${c.req.path}`,
    message: 'Delete Comment not yet implemented',
  }
  return c.json(response);
}

const commentControllers = {
  createComment, readCommentList, readCommentDetail, updateComment, deleteComment,
}

export default commentControllers;
