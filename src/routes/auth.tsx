import { Hono } from 'hono';
import authController from '../controllers/auth.js';

import { authChecker } from '../middleweare/authChecker.js';

const auth = new Hono();

auth.get("/", authController.loginOrSignup);
auth.get("/logout");

export default auth;
