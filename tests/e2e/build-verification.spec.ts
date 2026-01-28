import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Build verification tests
 * These tests verify the production build output directly
 * Would have caught the console.error stripping issue
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Build Output Verification', () => {
  const distPath = path.join(__dirname, '../../dist');
  const assetsPath = path.join(distPath, 'assets');

  test('dist folder exists with required files', () => {
    expect(fs.existsSync(distPath)).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(assetsPath)).toBe(true);
  });

  test('content script bundle contains console.error statements', () => {
    const files = fs.readdirSync(assetsPath);
    const contentScript = files.find((f) => f.startsWith('content') && f.endsWith('.js'));

    expect(contentScript).toBeDefined();

    if (contentScript) {
      const bundlePath = path.join(assetsPath, contentScript);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');

      // Verify console.error is NOT stripped
      const hasConsoleError = bundle.includes('console.error');
      expect(hasConsoleError).toBe(true);

      // Verify specific i18n error messages are present
      const hasI18nErrors = bundle.includes('YCN-i18n');
      expect(hasI18nErrors).toBe(true);

      // Log findings
      const errorCount = (bundle.match(/console\.error/g) || []).length;
      const warnCount = (bundle.match(/console\.warn/g) || []).length;
      console.log(`✓ Found ${errorCount} console.error statements`);
      console.log(`✓ Found ${warnCount} console.warn statements`);
    }
  });

  test('content CSS uses em instead of rem units', () => {
    const files = fs.readdirSync(assetsPath);
    const cssFile = files.find((f) => f.startsWith('content') && f.endsWith('.css'));

    expect(cssFile).toBeDefined();

    if (cssFile) {
      const cssPath = path.join(assetsPath, cssFile);
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Verify rem was converted to em
      const hasRem = css.includes('rem');
      const hasEm = css.includes('em');

      expect(hasRem).toBe(false);
      expect(hasEm).toBe(true);

      console.log('✓ CSS correctly uses em units instead of rem');
    }
  });

  test('translation files are copied to dist/locales', () => {
    const localesPath = path.join(distPath, 'locales');
    expect(fs.existsSync(localesPath)).toBe(true);

    // Check for a few key languages
    const languages = ['en', 'es', 'fr', 'de'];
    for (const lang of languages) {
      const langPath = path.join(localesPath, lang, 'translation.json');
      expect(fs.existsSync(langPath)).toBe(true);

      // Verify JSON is valid
      const content = fs.readFileSync(langPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }

    console.log('✓ All translation files present and valid');
  });

  test('bundle includes i18n error handling code', () => {
    const files = fs.readdirSync(assetsPath);
    const contentScript = files.find((f) => f.startsWith('content') && f.endsWith('.js'));

    if (contentScript) {
      const bundlePath = path.join(assetsPath, contentScript);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');

      // Verify i18n error messages are present
      const errorMessages = [
        'Failed to load translations',
        'Error loading translations',
        'Failed to change language',
      ];

      for (const msg of errorMessages) {
        const hasMessage = bundle.includes(msg);
        if (!hasMessage) {
          console.warn(`⚠️  Missing error message: "${msg}"`);
        }
        expect(hasMessage).toBe(true);
      }

      console.log('✓ All i18n error messages present in bundle');
    }
  });

  test('chrome.runtime.getURL is used for translation loading', () => {
    const files = fs.readdirSync(assetsPath);
    const contentScript = files.find((f) => f.startsWith('content') && f.endsWith('.js'));

    if (contentScript) {
      const bundlePath = path.join(assetsPath, contentScript);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');

      // Verify chrome.runtime.getURL is used
      const hasChromeRuntimeURL = bundle.includes('chrome.runtime.getURL');
      expect(hasChromeRuntimeURL).toBe(true);

      // Verify locales path pattern (can be template or actual path)
      const hasLocalesPath =
        bundle.includes('locales') &&
        (bundle.includes('translation.json') || bundle.includes('{{ns}}.json'));
      expect(hasLocalesPath).toBe(true);

      console.log('✓ Bundle uses chrome.runtime.getURL for translation loading');
    }
  });
});
