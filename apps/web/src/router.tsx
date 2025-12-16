// router.ts
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  scrollRestoration: true,
})

export function getRouter() {
  return router
}

// Register the router type for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}



