import { auth } from "@/lib/auth.server";
import { createFileRoute } from "@tanstack/react-router";

// Better Auth's emailOTP plugin uses /email-otp/* endpoints, not /otp/*
// This route should match /api/auth/email-otp/* paths
export const Route = createFileRoute("/api/auth/otp/$")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params?: Record<string, string> }) => {
        const url = new URL(request.url);
        console.log("[OTP Route] ===== GET REQUEST =====");
        console.log("[OTP Route] Route path pattern: /api/auth/otp/$");
        console.log("[OTP Route] Request pathname:", url.pathname);
        console.log("[OTP Route] Full request URL:", request.url);
        console.log("[OTP Route] Request method:", request.method);
        console.log("[OTP Route] Route params:", params);
        console.log("[OTP Route] Route params type:", typeof params);
        console.log("[OTP Route] Route params keys:", params ? Object.keys(params) : 'undefined');
        console.log("[OTP Route] Route params values:", params ? Object.values(params) : 'undefined');
        
        // Log request headers (excluding sensitive data)
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'cookie' && key.toLowerCase() !== 'authorization') {
            headers[key] = value;
          } else {
            headers[key] = '[REDACTED]';
          }
        });
        console.log("[OTP Route] Request headers:", headers);
        
        // Analyze the path to see what $ matched
        const pathSegments = url.pathname.split('/').filter(Boolean);
        console.log("[OTP Route] Path segments:", pathSegments);
        console.log("[OTP Route] Expected segments: ['api', 'auth', 'otp', 'send']");
        console.log("[OTP Route] Actual segments match:", JSON.stringify(pathSegments) === JSON.stringify(['api', 'auth', 'otp', 'send']));
        
        const response = await auth.handler(request);
        console.log("[OTP Route] GET response status:", response.status);
        console.log("[OTP Route] GET response headers:", Object.fromEntries(response.headers.entries()));
        
        if (response.status !== 200) {
          const responseText = await response.clone().text();
          console.log("[OTP Route] GET response body:", responseText);
        }
        
        return response;
      },
      POST: async ({ request, params }: { request: Request; params?: Record<string, string> }) => {
        const url = new URL(request.url);
        console.log("[OTP Route] ===== POST REQUEST =====");
        console.log("[OTP Route] Route path pattern: /api/auth/otp/$");
        console.log("[OTP Route] Request pathname:", url.pathname);
        console.log("[OTP Route] Full request URL:", request.url);
        console.log("[OTP Route] Request method:", request.method);
        console.log("[OTP Route] Route params:", params);
        console.log("[OTP Route] Route params type:", typeof params);
        console.log("[OTP Route] Route params keys:", params ? Object.keys(params) : 'undefined');
        console.log("[OTP Route] Route params values:", params ? Object.values(params) : 'undefined');
        
        // Log request headers (excluding sensitive data)
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'cookie' && key.toLowerCase() !== 'authorization') {
            headers[key] = value;
          } else {
            headers[key] = '[REDACTED]';
          }
        });
        console.log("[OTP Route] Request headers:", headers);
        
        // Read and log request body, but save it for later use
        let requestBody: string | null = null;
        try {
          const bodyText = await request.clone().text();
          if (bodyText) {
            requestBody = bodyText;
            console.log("[OTP Route] Request body:", requestBody);
          }
        } catch (e) {
          console.log("[OTP Route] Could not read request body:", e);
        }
        
        // Analyze the path to see what $ matched
        const pathSegments = url.pathname.split('/').filter(Boolean);
        console.log("[OTP Route] Path segments:", pathSegments);
        console.log("[OTP Route] Expected segments: ['api', 'auth', 'otp', 'send']");
        console.log("[OTP Route] Actual segments match:", JSON.stringify(pathSegments) === JSON.stringify(['api', 'auth', 'otp', 'send']));
        console.log("[OTP Route] What $ should match: 'send'");
        console.log("[OTP Route] What $ actually matched:", params?.['_splat'] || params?.['$'] || 'NOT FOUND IN PARAMS');
        
        console.log("[OTP Route] Calling auth.handler(request)...");
        console.log("[OTP Route] Request object structure:", {
          url: request.url,
          method: request.method,
          headersCount: Array.from(request.headers.keys()).length,
          bodyUsed: request.bodyUsed,
        });
        
        // Log what Better Auth's baseURL is
        const baseURL = (auth as any).options?.baseURL || 'http://localhost:3000';
        console.log("[OTP Route] Better Auth baseURL:", baseURL);
        console.log("[OTP Route] Better Auth trustedOrigins:", (auth as any).options?.trustedOrigins || 'NOT SET');
        
        // Check if the request URL matches what Better Auth expects
        const requestPath = new URL(request.url).pathname;
        const basePath = new URL(baseURL).pathname || '';
        const relativePath = requestPath.replace(basePath, '');
        console.log("[OTP Route] Request pathname:", requestPath);
        console.log("[OTP Route] Base URL pathname:", basePath);
        console.log("[OTP Route] Relative path (what Better Auth should see):", relativePath);
        console.log("[OTP Route] Expected Better Auth path: /api/auth/otp/send");
        console.log("[OTP Route] Paths match:", relativePath === '/api/auth/otp/send');
        
        // Create a new Request with the exact URL Better Auth expects
        // Better Auth's baseURL is http://localhost:3000, so the full URL should be
        // http://localhost:3000/api/auth/otp/send
        const requestSearch = new URL(request.url).search;
        const betterAuthRequest = new Request(
          `${baseURL}${requestPath}${requestSearch}`,
          {
            method: request.method,
            headers: request.headers,
            body: requestBody,
          }
        );
        
        console.log("[OTP Route] Created Better Auth request URL:", betterAuthRequest.url);
        console.log("[OTP Route] Better Auth request pathname:", new URL(betterAuthRequest.url).pathname);
        
        const response = await auth.handler(betterAuthRequest);
        console.log("[OTP Route] POST response status:", response.status);
        console.log("[OTP Route] POST response headers:", Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.clone().text();
        console.log("[OTP Route] POST response body:", responseText);
        console.log("[OTP Route] ===== END POST REQUEST =====");
        
        return response;
      },
      PUT: async ({ request }) => {
        const url = new URL(request.url);
        console.log("[OTP Route] PUT request to:", url.pathname);
        const response = await auth.handler(request);
        console.log("[OTP Route] PUT response status:", response.status);
        return response;
      },
      DELETE: async ({ request }) => {
        const url = new URL(request.url);
        console.log("[OTP Route] DELETE request to:", url.pathname);
        const response = await auth.handler(request);
        console.log("[OTP Route] DELETE response status:", response.status);
        return response;
      },
      PATCH: async ({ request }) => {
        const url = new URL(request.url);
        console.log("[OTP Route] PATCH request to:", url.pathname);
        const response = await auth.handler(request);
        console.log("[OTP Route] PATCH response status:", response.status);
        return response;
      },
      OPTIONS: async ({ request }) => {
        const url = new URL(request.url);
        console.log("[OTP Route] OPTIONS request to:", url.pathname);
        const response = await auth.handler(request);
        console.log("[OTP Route] OPTIONS response status:", response.status);
        return response;
      },
    },
  },
});
