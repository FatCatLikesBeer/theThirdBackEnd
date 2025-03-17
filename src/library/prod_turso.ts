import * as dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

const environment = process.env.ENVRON;

export const turso = environment === "DEV" ?
  createClient({
    url: 'http://127.0.0.1:8082',
  })
  :
  createClient({
    url: String(process.env.TURSO_DATABASE_URL),
    authToken: String(process.env.TURSO_AUTH_TOKEN),
  });

// Create DB tables
const transaction = await turso.transaction();
try {
  await transaction.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid INTEGER NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL CHECK(email <> '') UNIQUE,
      handle TEXT NOT NULL CHECK(handle <> '') UNIQUE,
      password TEXT NOT NULL CHECK(password <> ''),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatar TEXT DEFAULT NULL,
      location TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      about TEXT DEFAULT NULL,
      display_name TEXT
    );
  `);

  await transaction.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid INTEGER NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      user_id INTEGER NOT NULL CHECK(user_id <> ''),
      content TEXT NOT NULL CHECK(content <> ''),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await transaction.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid INTEGER NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      user_id INTEGER NOT NULL CHECK(user_id <> ''),
      post_id INTEGER NOT NULL CHECK(post_id <> ''),
      content TEXT NOT NULL CHECK(content <> ''),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  await transaction.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL CHECK(user_id <> ''),
      post_id INTEGER,
      comment_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);

  await transaction.execute(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL CHECK (user_id <> ''),
      friend_id INTEGER NOT NULL CHECK (friend_id <> ''),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await transaction.commit();
} finally {
  transaction.close();
}

// Create first users, me :)
const reader = await turso.transaction();
const transactionOne = await turso.transaction();
try {
  colorizeGreen("Before");
  const userFound = await reader.execute("SELECT id FROM users WHERE email = 'itisbilly@gmail.com'; ");
  colorizeGreen("After");

  if (userFound.rows.length < 1) {
    await transactionOne.execute(`
      INSERT INTO users (email, password, handle)
      VALUES ('itisbilly@gmail.com', 'will delete this later', 'Billy');
    `);
  }

  const anotherUserFound = await reader.execute("SELECT id FROM users WHERE email = 'anotherBilly@billy.net'; ");
  if (anotherUserFound.rows.length < 1) {
    await transactionOne.execute(`
      INSERT INTO users (email, password, handle)
      VALUES ('anotherBilly@billy.net', 'will delete this later', 'Billy2');
    `);
  }

  await transactionOne.commit();
} finally {
  reader.close();
  transactionOne.close();
}

function colorizeGreen(log: string) {
  console.log(`\x1b[32m${log}\x1b[0m`);
}
