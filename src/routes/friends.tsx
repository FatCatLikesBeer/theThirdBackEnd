import { Hono } from 'hono';
import type { Context } from 'hono';
import friendControllers from '../controllers/friends.js';

const friends = new Hono();

friends.post('/', friendControllers.createFriend);
friends.get('/', friendControllers.readFriendList);
friends.get('/:id', friendControllers.readFriendDetail);
friends.put('/', friendControllers.updateFriend);
friends.delete('/', friendControllers.deleteFriend);

export default friends;
