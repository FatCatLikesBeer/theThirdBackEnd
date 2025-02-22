import { Hono } from 'hono';
import authController from '../controllers/auth.js';

const auth = new Hono();

auth.get("/", authController.loginOrSignup);
auth.get("/logout", authController.logout);
auth.post("/");
auth.get("/confirm");

export default auth;
