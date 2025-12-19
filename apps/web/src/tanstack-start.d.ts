// Type augmentation for TanStack Start server routes
// This adds the 'server' property to createFileRoute options

import "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface UpdatableRouteOptions<
    TId,
    TPath,
    TFullPath,
    TCustomId,
    TParentRoute,
    TAllParams,
    TSearchSchema,
    TFullSearchSchema,
    TParams,
    TAllContext,
    TRouteContext,
    TContext,
    TRouterContext,
    TLoaderDeps,
    TLoaderData,
  > {
    server?: {
      handlers?: {
        GET?: (context: {
          request: Request;
          params?: any;
        }) => Response | Promise<Response>;
        POST?: (context: {
          request: Request;
          params?: any;
        }) => Response | Promise<Response>;
        PUT?: (context: {
          request: Request;
          params?: any;
        }) => Response | Promise<Response>;
        DELETE?: (context: {
          request: Request;
          params?: any;
        }) => Response | Promise<Response>;
        PATCH?: (context: {
          request: Request;
          params?: any;
        }) => Response | Promise<Response>;
      };
      middleware?: Array<any>;
    };
  }
}
