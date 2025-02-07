import { Hono } from 'hono';

import userControllers from '../controllers/users.js';
import { authChecker } from '../middleweare/authChecker.js';

const users = new Hono();

users.get('/test', (c) => { return c.text("This is a route for testing auth middleware") });

users.post('/', userControllers.createUser);
users.get('/', userControllers.readUserList);
users.get('/:id', userControllers.readUserDetail);
users.put('/', authChecker, userControllers.updateUser);
users.delete('/', authChecker, userControllers.deleteUser);

export default users;
