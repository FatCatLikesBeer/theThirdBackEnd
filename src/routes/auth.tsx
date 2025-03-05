import { Hono } from 'hono';
import { authChecker } from '../middleweare/authChecker.js';
import authController from '../controllers/auth.js';

const auth = new Hono();

auth.get("/", authController.loginOrSignup);                                        // Login
auth.post("/", authController.signUpRegistration);                                  // Signup Registration
auth.get("/confirm", authController.signUpConfirmation);                            // Signup Confirmation
auth.get("/logout", authController.logout);                                         // Logout: clear cookies
auth.get("/getSignedBucketURL", authChecker, authController.getSignedBucketURL);    // Get s3/R2 bucket URL

export default auth;
