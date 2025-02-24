import { Hono } from 'hono';
import authController from '../controllers/auth.js';

const auth = new Hono();

auth.get("/", authController.loginOrSignup);                // login
auth.post("/", authController.signUpRegistration);          // signup registration
auth.get("/confirm", authController.signUpConfirmation);    // signup confirmation
auth.get("/logout", authController.logout);

export default auth;
