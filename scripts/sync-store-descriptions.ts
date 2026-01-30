import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const EXTENSION_ID = process.env.EXTENSION_ID || 'oehnfehgimbnfnibacgkgichanehmbje';
const ACCOUNT_ID = process.env.ACCOUNT_ID || '80f1211b-4f3e-4a3a-9611-0acd65e2069d';
const DESCRIPTIONS_DIR = path.join(__dirname, '../store-assets/descriptions');
const AUTH_DIR = path.join(__dirname, '../.auth/chrome-profile');

// Language code mapping: file names to CWS data-value codes
// CWS uses some non-standard codes (e.g., 'iw' for Hebrew, 'no' for Norwegian)
const LANG_CODE_MAP: Record<string, string> = {
  he: 'iw', // Hebrew
  nb: 'no', // Norwegian Bokmål
  // Add any other mappings if your files use different codes
};

async function run() {
  console.log(`Starting Chrome Web Store Sync for Extension ID: ${EXTENSION_ID}`);
  console.log(`Using persistent profile at: ${AUTH_DIR}`);

  // 1. Launch Persistent Context
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-infobars'],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  // 2. Navigate directly to the extension's Store Listing edit page
  const editUrl = `https://chrome.google.com/webstore/devconsole/${ACCOUNT_ID}/${EXTENSION_ID}/edit`;
  console.log(`Navigating to: ${editUrl}`);
  await page.goto(editUrl, { waitUntil: 'domcontentloaded' });

  // 3. Check for Login
  const currentUrl = page.url();
  if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin')) {
    console.log('\n!!! LOGIN REQUIRED !!!');
    console.log('Please log in to your Google account in the browser window.');
    console.log('Press ENTER after you have logged in.');
    await new Promise((resolve) => process.stdin.once('data', resolve));

    // Re-navigate after login
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
  }

  // 4. Wait for the page to fully load
  try {
    await page.waitForURL(/.*devconsole.*edit.*/, { timeout: 60000 });
    // Wait for the language dropdown to be visible (indicates page is loaded)
    await page.waitForSelector('[role="combobox"]', { timeout: 30000 });
    console.log('Store Listing page loaded successfully.');
  } catch (error) {
    console.error('Failed to load the Store Listing page:', error);
    console.log('Current URL:', page.url());
    console.log('Please navigate manually to the Store Listing page and press ENTER.');
    await new Promise((resolve) => process.stdin.once('data', resolve));
  }

  // 5. Get list of description files
  const files = fs.readdirSync(DESCRIPTIONS_DIR).filter((f) => f.endsWith('.txt'));
  console.log(`Found ${files.length} description files to sync.`);

  for (const file of files) {
    const fileLangCode = path.basename(file, '.txt');
    // Map the file language code to CWS language code if needed
    const langCode = LANG_CODE_MAP[fileLangCode] || fileLangCode;
    const description = fs.readFileSync(path.join(DESCRIPTIONS_DIR, file), 'utf-8');

    console.log(`\nProcessing language: ${fileLangCode.toUpperCase()} (CWS code: ${langCode})...`);

    try {
      // Step 1: Click the language dropdown (combobox)
      const languageDropdown = page.locator('[role="combobox"]').first();
      await languageDropdown.click();
      await page.waitForTimeout(500); // Wait for dropdown to open

      // Step 2: Find and click the language option by data-value attribute
      const languageOption = page.locator(`li[data-value="${langCode}"]`);

      if (!(await languageOption.isVisible({ timeout: 3000 }))) {
        console.log(`   Language "${langCode}" not found in dropdown. Skipping...`);
        // Close dropdown by pressing Escape
        await page.keyboard.press('Escape');
        continue;
      }

      await languageOption.click();
      console.log(`   Selected language: ${langCode}`);

      // Wait for the page to update with the selected language
      await page.waitForTimeout(1500);

      // Step 3: Find and fill the description textarea
      // The textarea has jsname="YPqjbf" or we can find it by looking for textarea with maxlength="16000"
      const descriptionTextarea = page.locator('textarea[maxlength="16000"]');

      if (!(await descriptionTextarea.isVisible({ timeout: 5000 }))) {
        console.log('   Description textarea not found. Trying alternative selector...');
        const altTextarea = page.locator('textarea').first();
        await altTextarea.fill(description);
      } else {
        // Clear existing content and fill with new description
        await descriptionTextarea.click();
        await descriptionTextarea.fill(description);
      }

      console.log(`   ✓ Updated description for ${fileLangCode.toUpperCase()}`);

      // Small delay before processing next language
      await page.waitForTimeout(500);
    } catch (error) {
      console.error(`   ✗ Failed to update ${fileLangCode}:`, error);
    }
  }

  console.log('\n========================================');
  console.log('All files processed.');
  console.log(
    'Please review changes in the browser and click "Save draft" or "Submit for review".'
  );
  console.log('Press ENTER to close the browser and exit.');
  await new Promise((resolve) => process.stdin.once('data', resolve));

  await context.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
