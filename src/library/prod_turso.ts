import { createClient } from "@libsql/client";

export const turso = createClient({
  url: String(process.env.TURSO_DATABASE_URL),
  authToken: String(process.env.TURSO_AUTH_TOKEN),
});
