import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { jwt } from "better-auth/plugins";
import { bearer } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins";
import { db } from "./db.server";
import { user, session, account, verification, jwks } from "./db/schema";

// Load environment variables - Vite loads .env.local automatically for server-side code
// but we need to ensure process.env is used (not import.meta.env for server-only vars)
const getEnvVar = (key: string, fallback?: string): string => {
  // For server-side, process.env should have all env vars from .env.local
  // Vite automatically loads them, but only VITE_ prefixed ones go to import.meta.env
  return process.env[key] || import.meta.env[key] || fallback || "";
};

// OIDC Provider configuration from ENV
interface OIDCProviderEnvEntry {
  provider_id: string;
  name: string;
  discovery_url: string;
  client_id: string;
  client_secret: string;
  scopes?: string; // Comma-separated
  enabled?: boolean;
}

function loadOIDCProvidersFromEnv(): Array<{
  providerId: string;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
}> {
  const providersJSON = getEnvVar("OIDC_PROVIDERS");
  if (!providersJSON) {
    return [];
  }

  try {
    const providers: OIDCProviderEnvEntry[] = JSON.parse(providersJSON);
    return providers
      .filter((p) => p.enabled !== false) // Filter out disabled providers
      .map((p) => ({
        providerId: p.provider_id,
        clientId: p.client_id,
        clientSecret: p.client_secret,
        discoveryUrl: p.discovery_url,
        scopes: p.scopes
          ? p.scopes.split(",").map((s) => s.trim()).filter(Boolean)
          : ["openid", "profile", "email"],
      }));
  } catch (error) {
    console.error("Error parsing OIDC_PROVIDERS from ENV:", error);
    return [];
  }
}

// Database provider response format
interface OIDCProviderDBResponse {
  provider_id: string;
  client_id: string;
  client_secret: string;
  discovery_url: string;
  scopes: string[];
}

async function loadOIDCProvidersFromDatabase(): Promise<Array<{
  providerId: string;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
}>> {
  const apiUrl = getEnvVar("API_URL", "http://localhost:1337");
  const internalEndpoint = `${apiUrl}/api/oidc-providers/internal`;

  try {
    const response = await fetch(internalEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If endpoint is not available or returns error, log and return empty array
      console.warn(
        `Failed to load OIDC providers from database: ${response.status} ${response.statusText}. Falling back to ENV providers only.`,
      );
      return [];
    }

    const providers: OIDCProviderDBResponse[] = await response.json();
    return providers.map((p) => ({
      providerId: p.provider_id,
      clientId: p.client_id,
      clientSecret: p.client_secret,
      discoveryUrl: p.discovery_url,
      scopes: p.scopes && p.scopes.length > 0
        ? p.scopes
        : ["openid", "profile", "email"],
    }));
  } catch (error) {
    // Log error but don't throw - fallback to ENV providers only
    console.error(
      "Error loading OIDC providers from database:",
      error instanceof Error ? error.message : error,
    );
    console.warn("Falling back to ENV providers only.");
    return [];
  }
}

// Load OIDC providers - ENV takes precedence over database
// If ENV providers exist, use ONLY ENV providers (database providers are ignored)
async function loadOIDCProviders(): Promise<Array<{
  providerId: string;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
}>> {
  const envProviders = loadOIDCProvidersFromEnv();
  
  // If ENV providers exist, use ONLY ENV providers (database providers disabled)
  if (envProviders.length > 0) {
    console.log(
      `Using ${envProviders.length} ENV-configured OIDC provider(s). Database providers are disabled when ENV providers are present.`,
    );
    return envProviders;
  }

  // No ENV providers, load from database
  const dbProviders = await loadOIDCProvidersFromDatabase();
  console.log(
    `Using ${dbProviders.length} database-configured OIDC provider(s).`,
  );
  
  return dbProviders;
}

// Initialize better-auth with providers
// Using top-level await to load providers before initialization
const oidcProviders = await loadOIDCProviders();

let auth: ReturnType<typeof betterAuth>;

try {
  console.log("Initializing Better Auth...");
  const connectionString =
    import.meta.env.VITE_DB_URL || process.env.DB_URL || "";
  console.log("DB_URL is set:", !!connectionString);
  console.log("DB_URL starts with:", connectionString.substring(0, 20) + "...");

  const secret = getEnvVar("BETTER_AUTH_SECRET");
  console.log(
    "BETTER_AUTH_SECRET is set:",
    !!secret,
    secret ? `(${secret.length} chars)` : "(missing)",
  );

  if (!secret || secret.length < 32) {
    throw new Error(
      `BETTER_AUTH_SECRET must be at least 32 characters. ` +
        `Current value: ${secret ? `${secret.length} chars` : "missing"}. ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }

  auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
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
        generateId: "uuid",
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: getEnvVar("EMAIL_VERIFICATION") === "true",
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:1337",
      getEnvVar("BETTER_AUTH_URL", "http://localhost:3000"),
      ...(getEnvVar("TRUSTED_ORIGINS", "")
        ? getEnvVar("TRUSTED_ORIGINS", "")
            .split(",")
            .map((o) => o.trim())
        : []),
    ].filter((origin, index, self) => origin && self.indexOf(origin) === index), // Remove duplicates and empty strings
    secret: secret,
    baseURL: getEnvVar("BETTER_AUTH_URL", "http://localhost:3000"),
    plugins: [
      bearer(),
      jwt({
        jwt: {
          expirationTime: "2160h", // 90 days = 2160 hours
          issuer: getEnvVar("BETTER_AUTH_URL", "http://localhost:3000"),
          audience: getEnvVar("BETTER_AUTH_URL", "http://localhost:3000"),
        },
      }),
      oneTimeToken({
        expiresIn: 90 * 24 * 60, // 90 days in minutes (keep for other uses)
      }),
      // Load OIDC providers (ENV takes precedence - if ENV exists, database is ignored)
      ...(oidcProviders.length > 0
        ? [
            genericOAuth({
              config: oidcProviders,
            }),
          ]
        : []),
      emailOTP({
        overrideDefaultEmailVerification: true,
        async sendVerificationOTP({ email, otp, type }) {
          // Call Go API endpoint to send OTP email
          const apiUrl = getEnvVar("API_URL", "http://localhost:1337");
          const emailEndpoint = `${apiUrl}/api/email/send-otp`;
          
          try {
            const emailResponse = await fetch(emailEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, otp, type }),
            });
            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error("[Better Auth] Failed to send OTP email:", errorText);
            }
          } catch (err) {
            console.error("[Better Auth] Failed to send OTP email:", err);
          }
        },
        otpLength: 6,
        expiresIn: 600, // 10 minutes
        allowedAttempts: 3,
        sendVerificationOnSignUp: getEnvVar("EMAIL_VERIFICATION") === "true",
      }),
      // tanstackStartCookies must be the last plugin in the array
      tanstackStartCookies(),
    ],
  });
  console.log("Better Auth initialized successfully");
} catch (error) {
  console.error("Failed to initialize Better Auth:", error);
  console.error(
    "Error details:",
    error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error,
  );
  throw error;
}

export { auth };

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
