import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Build verification tests
 * These tests verify the production build output files directly.
 * They check that the build process produces correct artifacts.
 * Note: These are static file checks, not browser-based e2e tests.
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

  test('content script bundle exists', () => {
    const files = fs.readdirSync(assetsPath);
    const contentScript = files.find((f) => f.startsWith('content') && f.endsWith('.js'));

    expect(contentScript).toBeDefined();

    if (contentScript) {
      const bundlePath = path.join(assetsPath, contentScript);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');

      // Verify bundle has content (not empty)
      expect(bundle.length).toBeGreaterThan(1000);

      console.log(`✓ Content script bundle exists (${Math.round(bundle.length / 1024)}KB)`);
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

  test('bundle includes i18n initialization code', () => {
    const files = fs.readdirSync(assetsPath);
    const contentScript = files.find((f) => f.startsWith('content') && f.endsWith('.js'));

    expect(contentScript).toBeDefined();

    if (contentScript) {
      const bundlePath = path.join(assetsPath, contentScript);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');

      // Verify i18next is included in bundle
      const hasI18next = bundle.includes('i18next') || bundle.includes('i18n');
      expect(hasI18next).toBe(true);

      console.log('✓ Bundle includes i18n initialization code');
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
