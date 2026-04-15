/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
const stripSourceExtension = (name: string): string => name.replace(/\.(?:[cm]?[jt]sx?)$/, '');

// Custom plugin to replace 'rem' with 'em' in CSS files
const remToEmPlugin = (): Plugin => {
  return {
    name: 'rem-to-em',
    // Handle development (HMR) and build transformation
    transform(code, id) {
      if (/\.(css|scss|sass)($|\?)/.test(id)) {
        return {
          code: code.replace(/rem/g, 'em'),
          map: null,
        };
      }
    },
    // Handle final build output (legacy support/backup)
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
  build: {
    rollupOptions: {
      output: {
        entryFileNames: ({ name }) => `assets/${stripSourceExtension(name ?? 'entry')}.js`,
        chunkFileNames: ({ name }) => `assets/${stripSourceExtension(name ?? 'chunk')}.js`,
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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/tests/e2e/**', // Exclude Playwright E2E tests
    ],
  },
});
