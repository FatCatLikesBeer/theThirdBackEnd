import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

function createFriend(c: Context) {
  const status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'POST not yet implemented',
  }
  return c.json(response, status);
}

function readFriendDetail(c: Context) {
  const status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response, status);
};

function readFriendList(c: Context) {
  const status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET List not yet implemented',
  }
  return c.json(response, status);
}

function updateFriend(c: Context) {
  const status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'Update Friend not yet implemented',
  }
  return c.json(response, status);
}

function deleteFriend(c: Context) {
  const status: ContentfulStatusCode = 500;
  const response: APIResponse = {
    success: true,
    path: `${c.req.path}`,
    message: 'Delete Friend not yet implemented',
  }
  return c.json(response, status);
}

const friendControllers = { createFriend, readFriendList, readFriendDetail, updateFriend, deleteFriend, }

export default friendControllers;
