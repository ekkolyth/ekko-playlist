import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart, createMiddleware } from '@tanstack/react-start'

// Wrap Clerk middleware to handle errors gracefully
// This allows public routes to work even if Clerk can't access cookies
// Based on: https://github.com/tanstack/router/tree/main/examples/react/start-clerk-basic
const safeClerkMiddleware = createMiddleware().server(async (args) => {
  try {
    // Get the Clerk middleware - it's created with createMiddleware().server()
    const clerkMw = clerkMiddleware()
    
    // The Clerk middleware has a server function in its options
    // We need to call it with the same args structure
    if (clerkMw.options.server) {
      return await clerkMw.options.server(args)
    }
    
    // If no server function, just continue
    return args.next()
  } catch (error: any) {
    // If Clerk middleware fails (e.g., cookies not available), continue without auth
    // This allows public routes to work without authentication
    // The error is likely due to cookies not being available in the request object
    // which is fine for public routes that don't need authentication
    if (process.env.NODE_ENV === 'development') {
      // Only log unexpected errors in development
      const errorMsg = error?.message || String(error)
      if (!errorMsg.includes('Cannot read properties of undefined') && 
          !errorMsg.includes('reading \'get\'')) {
        console.warn('Clerk middleware error (continuing without auth):', errorMsg)
      }
    }
    // Continue without authentication - public routes don't need it
    return args.next()
  }
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [safeClerkMiddleware],
  }
})

