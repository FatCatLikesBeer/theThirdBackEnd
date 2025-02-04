import type { Context } from "hono";

function createUser(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response);
}

function readUserDetail(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response);
};

function readUserList(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response);
}

function updateUser(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Update User not yet implemented',
  }
  return c.json(response);
}

function deleteUser(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Delete User not yet implemented',
  }
  return c.json(response);
}

const userControllers = { createUser, readUserList, readUserDetail, updateUser, deleteUser, }

export default userControllers;
