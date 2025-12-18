import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";

// Import postgres - this should only be used on the server
// The vite config should prevent this from being bundled for client
import postgres from "postgres";

// Lazy database connection - only initialize when accessed
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnectionString(): string {
  const connectionString =
    import.meta.env.VITE_DB_URL || process.env.DB_URL || "";

  if (!connectionString) {
    console.error("DB_URL environment variable is required");
    throw new Error("DB_URL environment variable is required");
  }

  return connectionString;
}

function initializeDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = getConnectionString();

  try {
    // Disable prefetch as it's not supported for "Transaction" pool mode
    client = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(client, { schema });
    console.log("Database connection initialized successfully");
    return dbInstance;
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    throw error;
  }
}

// Export a getter that lazily initializes the connection
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = initializeDb();
    return instance[prop as keyof typeof instance];
  },
});

export type Database = typeof db;
