import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

const connectionString = import.meta.env.VITE_DB_URL || process.env.DB_URL || '';

if (!connectionString) {
  throw new Error('DB_URL environment variable is required');
}

// Disable prefetch as it's not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export type Database = typeof db;
