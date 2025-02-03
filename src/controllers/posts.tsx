import type { Context } from "hono";

function createPost(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response);
}

function readPostDetail(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response);
};

function readPostList(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response);
}

function updatePost(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Update Post not yet implemented',
  }
  return c.json(response);
}

function deletePost(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Delete Post not yet implemented',
  }
  return c.json(response);
}

const postControllers = {
  createPost, readPostList, readPostDetail, updatePost, deletePost,
}

export default postControllers;
