import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const config = defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      nitroV2Plugin(),
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
      // Expose environment variables to server-side code
      'process.env.DB_URL': JSON.stringify(env.DB_URL),
      'process.env.BETTER_AUTH_SECRET': JSON.stringify(env.BETTER_AUTH_SECRET),
      'process.env.BETTER_AUTH_URL': JSON.stringify(env.BETTER_AUTH_URL),
    },
    resolve: {
      conditions: ['import', 'module', 'browser', 'default'],
      // Remove the postgres alias - let SSR handle it via external config
      // The alias was causing issues during SSR evaluation
    },
    ssr: {
      noExternal: ['better-auth'],
      // Mark postgres as external for SSR - this ensures it uses the real module
      external: ['postgres', 'drizzle-orm/postgres-js'],
      resolve: {
        conditions: ['node', 'import'],
        // Explicitly don't alias postgres during SSR
        dedupe: ['postgres'],
      },
    },
    optimizeDeps: {
      include: ['better-auth/react'],
      exclude: ['postgres', 'drizzle-orm/postgres-js'],
    },
  };
});

export default config;

