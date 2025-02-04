import { createClient } from "@libsql/client";

export const turso = createClient({
  url: 'http://127.0.0.1:8082',
});

const transaction = await turso.transaction("write");

try {
  const billyAlreadyExists = await turso.execute('SELECT uuid, display_name, email FROM users WHERE id = 1');

  console.log(billyAlreadyExists);

  await transaction.commit();
} finally {
  transaction.close();
}
