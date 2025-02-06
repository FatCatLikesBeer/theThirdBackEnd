import { createClient } from "@libsql/client";

export const turso = createClient({
  url: 'http://127.0.0.1:8082',
});

// Create DB tables
const transaction = await turso.transaction("write");
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
const addUsers = await turso.transaction("write");
try {
  const userFound = await addUsers.execute("SELECT id FROM users WHERE email = 'itisbilly@gmail.com' ");
  if (userFound.rows.length < 1) {
    await addUsers.execute(`
      INSERT INTO users (email, password, display_name)
      VALUES ('itisbilly@gmail.com', 'will delete this later', 'Billy');
    `);
  }

  const anotherUserFound = await addUsers.execute("SELECT id FROM users WHERE email = 'anotherBilly@billy.net' ");
  if (anotherUserFound.rows.length < 1) {
    await addUsers.execute(`
      INSERT INTO users (email, password, display_name)
      VALUES ('anotherBilly@billy.net', 'will delete this later', 'Billy2');
    `);
  }

  await addUsers.commit();
} finally {
  addUsers.close();
}
