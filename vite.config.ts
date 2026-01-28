/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

// Custom plugin to replace 'rem' with 'em' in CSS files
const remToEmPlugin = (): Plugin => {
  return {
    name: 'rem-to-em',
    generateBundle(options: any, bundle: any) {
      for (const fileName in bundle) {
        if (fileName.endsWith('.css')) {
          const chunk = bundle[fileName];
          if (chunk.type === 'asset' && typeof chunk.source === 'string') {
            chunk.source = chunk.source.replace(/rem/g, 'em');
          }
        }
      }
    },
  };
};

export default defineConfig({
  plugins: [react(), crx({ manifest }), remToEmPlugin()],
  server: {
    port: 3000,
  },
  esbuild: {
    charset: 'ascii',
    // Keep console.error and console.warn in production builds
    drop: ['debugger'],
    pure: [],
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    target: 'es2020',
    minify: 'esbuild',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
