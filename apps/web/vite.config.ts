import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";

const config = defineConfig(({ mode }) => {
  return {
    plugins: [
      nitroV2Plugin(),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        mode === "production" ? "production" : "development",
      ),
      // Don't bake environment variables into the build - let them be resolved at runtime
      // This allows the same build to work in different environments (dev, staging, prod)
    },
    resolve: {
      conditions: ["import", "module", "browser", "default"],
      // Remove the postgres alias - let SSR handle it via external config
      // The alias was causing issues during SSR evaluation
      alias: {
        // Fix for use-sync-external-store shim compatibility with React 19
        "use-sync-external-store/shim/with-selector": "use-sync-external-store/shim/with-selector.js",
      },
    },
    ssr: {
      noExternal: ["better-auth"],
      // Mark postgres as external for SSR - this ensures it uses the real module
      external: ["postgres", "drizzle-orm/postgres-js"],
      resolve: {
        conditions: ["node", "import"],
        // Explicitly don't alias postgres during SSR
        dedupe: ["postgres"],
      },
    },
    optimizeDeps: {
      include: [
        "better-auth/react",
        "use-sync-external-store/shim/with-selector",
      ],
      exclude: ["postgres", "drizzle-orm/postgres-js"],
    },
  };
});

export default config;
