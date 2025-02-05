import { Hono } from 'hono';
import userControllers from '../controllers/users.js';

const users = new Hono();

users.post('/', userControllers.createUser);
users.get('/', userControllers.readUserList);
users.get('/:id', userControllers.readUserDetail);
users.put('/', userControllers.updateUser);
users.delete('/', userControllers.deleteUser);

export default users;
