import { Hono } from 'hono';
import { getGuest } from '../controllers/guest.js';

const guest = new Hono();
guest.get("/", getGuest);

export default guest;
