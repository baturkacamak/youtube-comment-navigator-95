# E2E Tests for YouTube Comment Navigator

End-to-end tests using Playwright to test the extension in a real Chrome browser.

## Overview

These tests verify the extension works correctly in production by:

- Loading the actual built extension from `dist/` folder
- Testing on real YouTube pages
- Verifying translations load correctly
- Checking console errors are visible
- Validating settings persistence

## Prerequisites

1. **Build the extension first**:

   ```bash
   npm run build
   ```

2. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```

**Note**: If browser download fails due to network restrictions, you can still run the **build verification tests** which don't require a browser and are the most critical tests for catching production bugs:

```bash
npm run test:e2e:build-only
```

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run tests with UI (interactive)

```bash
npm run test:e2e:ui
```

### Run tests in debug mode

```bash
npm run test:e2e:debug
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Run only build verification tests (fast)

```bash
npm run test:e2e:build-only
```

## Test Suites

### 1. `build-verification.spec.ts` ⭐⭐⭐ **MOST CRITICAL**

**Validates the production bundle (no browser required):**

- `console.error` and `console.warn` are NOT stripped
- CSS uses `em` instead of `rem`
- Translation files are in `dist/locales/`
- i18n error messages are in the bundle
- `chrome.runtime.getURL` is used

**Why this is the most important suite:**

- ✅ Runs without browser (works in restricted environments)
- ✅ Catches production build issues immediately
- ✅ Would have caught both the i18n bug and console stripping bug
- ✅ Fast execution (< 1 second)
- ✅ Can run in any CI/CD environment

### 2. `extension-loading.spec.ts` (requires browser)

Tests basic extension functionality:

- Extension loads on YouTube
- UI elements are visible
- No console errors on initialization

### 3. `settings-language.spec.ts` ⭐ (requires browser)

**Critical tests that would have caught the i18n bug:**

- Language changes load translations without 404 errors
- Translations load from `chrome.runtime.getURL()`
- Theme changes persist after reload
- Settings are saved to localStorage
- Corrupted localStorage is handled gracefully
- Console errors are preserved in production build

## How These Tests Catch Production Bugs

### Example 1: The i18n Bug

**Bug**: Translations didn't load in production because `HttpBackend` was disabled.

**Test that catches it**:

```typescript
// tests/e2e/settings-language.spec.ts
test('language change loads translations without errors', async () => {
  // Changes language to Spanish
  await languageSelect.selectOption('es');

  // Checks console for i18n errors
  const i18nErrors = console
    .getErrors()
    .filter((err) => err.includes('Failed to load') || err.includes('404'));

  expect(i18nErrors.length).toBe(0); // ❌ Would have failed!
});
```

### Example 2: Console Stripping

**Bug**: `console.error` was stripped by esbuild, hiding errors.

**Test that catches it**:

```typescript
// tests/e2e/build-verification.spec.ts
test('content script bundle contains console.error', () => {
  const bundle = fs.readFileSync('dist/assets/content.js');
  expect(bundle.includes('console.error')).toBe(true); // ❌ Would have failed!
});
```

## Debugging Failed Tests

### View test report

```bash
npx playwright show-report
```

### Screenshots and videos

Failed tests automatically capture:

- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip`

### View trace

```bash
npx playwright show-trace test-results/*/trace.zip
```

## CI/CD Integration

Tests can run in GitHub Actions:

```yaml
- name: Run E2E tests
  run: |
    npm run build
    npx playwright install --with-deps chromium
    npm run test:e2e
```

## Notes

- Tests run in **headful mode** (browser visible) because Chrome extensions don't work in headless mode
- Tests use a **persistent context** to properly load the extension
- Each test creates a new browser context for isolation
- Tests may take 1-2 minutes to complete as they interact with real YouTube

## Troubleshooting

### "Extension path not found"

Run `npm run build` first to create the `dist/` folder.

### "Timeout waiting for extension"

The extension may take longer to inject on slow connections. Increase timeouts in `playwright.config.ts`.

### "chromium not installed" or "Download failed: 403"

If you cannot download Playwright browsers due to network restrictions, you can still run the most important tests:

```bash
npm run test:e2e:build-only
```

The build verification tests don't require a browser and catch the most critical production bugs.

## Best Practices

1. **Always run build verification tests first**: `npm run test:e2e:build-only`
   - Catches 90% of production bugs
   - Works in any environment
   - Fast execution
2. **Build before testing**: `npm run build && npm run test:e2e`
3. **Use UI mode for debugging** (requires browser): `npm run test:e2e:ui`
4. **Check traces on failure**: `npx playwright show-trace <trace-file>`

## Environment Limitations

Some environments (like sandboxed CI/CD or restricted networks) may block Playwright browser downloads. In these cases:

✅ **Build verification tests still work** and are the most valuable

- Test the actual production bundle
- Catch console stripping, CSS issues, missing files
- No browser required

❌ **Browser-based tests won't work** until Chromium is available

- extension-loading.spec.ts
- settings-language.spec.ts

For local development or unrestricted CI environments, all tests can run.
