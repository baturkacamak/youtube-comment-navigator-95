import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for YouTube Comment Navigator E2E tests
 * Tests the extension in a real Chrome browser with the production build
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Maximum time one test can run
  timeout: 60000,
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use 1 worker to avoid race conditions with extension loading
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    // Base URL for navigation
    baseURL: 'https://www.youtube.com',
    // Collect trace on failure for debugging
    trace: 'retain-on-failure',
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    // Record video on failure
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Extension tests need a persistent context
        launchOptions: {
          headless: false, // Extensions don't work in headless mode
        },
      },
    },
  ],

  // Don't start dev server - we test against real YouTube
});
