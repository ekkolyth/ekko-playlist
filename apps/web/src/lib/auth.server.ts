import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { oneTimeToken } from 'better-auth/plugins/one-time-token';
import { jwt } from 'better-auth/plugins';
import { bearer } from 'better-auth/plugins';
import { db } from './db.server';
import { user, session, account, verification, jwks } from './db/schema';

// Load environment variables - Vite loads .env.local automatically for server-side code
// but we need to ensure process.env is used (not import.meta.env for server-only vars)
const getEnvVar = (key: string, fallback?: string): string => {
  // For server-side, process.env should have all env vars from .env.local
  // Vite automatically loads them, but only VITE_ prefixed ones go to import.meta.env
  return process.env[key] || import.meta.env[key] || fallback || '';
};

// Initialize better-auth
let auth: ReturnType<typeof betterAuth>;

try {
  console.log('Initializing Better Auth...');
  const connectionString = import.meta.env.VITE_DB_URL || process.env.DB_URL || '';
  console.log('DB_URL is set:', !!connectionString);
  console.log('DB_URL starts with:', connectionString.substring(0, 20) + '...');
  
  const secret = getEnvVar('BETTER_AUTH_SECRET');
  console.log('BETTER_AUTH_SECRET is set:', !!secret, secret ? `(${secret.length} chars)` : '(missing)');
  
  if (!secret || secret.length < 32) {
    throw new Error(
      `BETTER_AUTH_SECRET must be at least 32 characters. ` +
      `Current value: ${secret ? `${secret.length} chars` : 'missing'}. ` +
      `Generate one with: openssl rand -base64 32`
    );
  }
  
  auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user,
        session,
        account,
        verification,
        jwks,
      },
    }),
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:1337',
    ],
    secret: secret,
    baseURL: getEnvVar('BETTER_AUTH_URL', 'http://localhost:3000'),
    plugins: [
      bearer(),
      jwt({
        jwt: {
          expirationTime: '2160h', // 90 days = 2160 hours
          issuer: getEnvVar('BETTER_AUTH_URL', 'http://localhost:3000'),
          audience: getEnvVar('BETTER_AUTH_URL', 'http://localhost:3000'),
        },
      }),
      oneTimeToken({
        expiresIn: 90 * 24 * 60, // 90 days in minutes (keep for other uses)
      }),
      // tanstackStartCookies must be the last plugin in the array
      tanstackStartCookies(),
    ],
  });
  console.log('Better Auth initialized successfully');
} catch (error) {
  console.error('Failed to initialize Better Auth:', error);
  console.error('Error details:', error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : error);
  throw error;
}

export { auth };

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
