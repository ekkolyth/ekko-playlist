import { auth } from "@/lib/auth.server";
import { createFileRoute } from "@tanstack/react-router";

// Better Auth's emailOTP plugin uses /email-otp/* endpoints, not /otp/*
// This route should match /api/auth/email-otp/* paths
export const Route = createFileRoute("/api/auth/email-otp/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        return auth.handler(request);
      },
      PUT: async ({ request }) => {
        return auth.handler(request);
      },
      DELETE: async ({ request }) => {
        return auth.handler(request);
      },
      PATCH: async ({ request }) => {
        return auth.handler(request);
      },
      OPTIONS: async ({ request }) => {
        return auth.handler(request);
      },
    },
  },
});
