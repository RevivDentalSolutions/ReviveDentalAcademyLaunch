import { createClient } from '@libsql/client';

const url = process.env.TURSO_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

export const db = createClient({
  url,
  authToken,
});
