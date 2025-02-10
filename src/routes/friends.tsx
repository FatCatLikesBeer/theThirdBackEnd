import { Hono } from 'hono';
import friendControllers from '../controllers/friends.js';
import { authChecker } from '../middleweare/authChecker.js';

const friends = new Hono();

friends.post('/:friendId', authChecker, friendControllers.createFriend);
friends.get('/', friendControllers.readFriendList);                 // Friends lists are public
friends.get('/:id', friendControllers.readFriendDetail);
friends.put('/', authChecker, friendControllers.updateFriend);
friends.delete('/:friendId', authChecker, friendControllers.deleteFriend);

export default friends;
