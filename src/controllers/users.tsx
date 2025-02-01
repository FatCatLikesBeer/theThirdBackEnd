import type { Context } from "hono";

export function getDetail(c: Context) {
  const response = {
    success: true,
    path: `${c.req.path}`,
    message: 'GET Detail not yet implemented',
  }
  return c.json(response);
};

const userControllers = {
  getDetail,
}

export default userControllers;
