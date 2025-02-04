import type { Context } from "hono";

function createFriend(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response);
}

function readFriendDetail(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response);
};

function readFriendList(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response);
}

function updateFriend(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Update Friend not yet implemented',
  }
  return c.json(response);
}

function deleteFriend(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'Delete Friend not yet implemented',
  }
  return c.json(response);
}

const friendControllers = { createFriend, readFriendList, readFriendDetail, updateFriend, deleteFriend, }

export default friendControllers;
