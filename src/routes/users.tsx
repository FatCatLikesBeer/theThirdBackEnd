import { Hono } from 'hono';

import userControllers from '../controllers/users.js';
import { authChecker } from '../middleweare/authChecker.js';

const users = new Hono();

users.post('/', userControllers.createUser);                  // Disable this endpoint
users.get('/', userControllers.readUserList);
users.get('/self', authChecker, userControllers.self);
users.get('/:id', userControllers.readUserDetail);
users.put('/', authChecker, userControllers.updateUser);
users.delete('/', authChecker, userControllers.deleteUser);

export default users;
