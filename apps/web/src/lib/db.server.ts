import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './db/schema';

// Import postgres - this should only be used on the server
// The vite config should prevent this from being bundled for client
import postgres from 'postgres';

const connectionString = import.meta.env.VITE_DB_URL || process.env.DB_URL || '';

if (!connectionString) {
  console.error('DB_URL environment variable is required');
  throw new Error('DB_URL environment variable is required');
}

// Disable prefetch as it's not supported for "Transaction" pool mode
let client: ReturnType<typeof postgres>;
try {
  client = postgres(connectionString, { prepare: false });
  console.log('Database connection initialized successfully');
} catch (error) {
  console.error('Failed to initialize database connection:', error);
  throw error;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
