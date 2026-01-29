import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const EXTENSION_ID = process.env.EXTENSION_ID || 'oehnfehgimbnfnibacgkgichanehmbje'; // YouTube Comment Navigator 95
const DESCRIPTIONS_DIR = path.join(__dirname, '../store-assets/descriptions');
const AUTH_DIR = path.join(__dirname, '../.auth/chrome-profile'); // Persistent profile location

async function run() {
  if (EXTENSION_ID === 'YOUR_EXTENSION_ID_HERE') {
    console.error('Error: Please set EXTENSION_ID environment variable or edit the script.');
    console.log('Usage: EXTENSION_ID=your_id npx tsx scripts/sync-store-descriptions.ts');
    process.exit(1);
  }

  console.log(`Starting Chrome Web Store Sync for Extension ID: ${EXTENSION_ID}`);
  console.log(`Using persistent profile at: ${AUTH_DIR}`);

  // 1. Launch Persistent Context
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false, // Must be visible for manual login if needed
    viewport: { width: 1280, height: 900 },
    // Mimic a real user agent to avoid bot detection
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  // 2. Navigate to Dashboard
  console.log('Navigating to Chrome Web Store Developer Dashboard...');
  await page.goto(`https://chrome.google.com/webstore/dev/edit/${EXTENSION_ID}`);

  // 3. Check for Login
  if (page.url().includes('accounts.google.com') || page.url().includes('signin')) {
    console.log('\n!!! ACTION REQUIRED !!!');
    console.log('You are not logged in.');
    console.log('Please log in manually in the browser window.');
    console.log('Once you are on the Developer Dashboard/Edit page, return here and press ENTER.');
    
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  // Verify we are on the edit page
      try {
        await page.waitForURL(/.*webstore\/dev\/edit.*/, { timeout: 60000 });
      } catch (error) {
        console.error('Failed to reach the edit page. Please make sure you logged in and navigated to the item.');
        await context.close();    process.exit(1);
  }

  console.log('Successfully accessed Store Listing page.');

  // 4. Click "Store Listing" tab if not active
  // Note: Selectors here are best-effort. The Dashboard UI changes.
  // We look for text "Store Listing" in the left menu or tabs.
  try {
     const storeListingTab = page.getByText('Store listing', { exact: true });
     if (await storeListingTab.isVisible()) {
         await storeListingTab.click();
         await page.waitForTimeout(2000); // Wait for tab load
     }
  } catch (error) {
      console.log('Could not click "Store listing" tab explicitly, assuming we are already there or UI differs.');
  }

  // 5. Get list of description files
  const files = fs.readdirSync(DESCRIPTIONS_DIR).filter(f => f.endsWith('.txt'));
  console.log(`Found ${files.length} description files to sync.`);

  for (const file of files) {
    const langCode = path.basename(file, '.txt');
    const description = fs.readFileSync(path.join(DESCRIPTIONS_DIR, file), 'utf-8');
    
    console.log(`\nProcessing language: ${langCode.toUpperCase()}...`);

    // 6. Select Language
    // The language dropdown is tricky. It usually shows the current language.
    // We might need to click a dropdown trigger and then select the option.
    // Strategy: Look for a combobox that likely contains language names.
    
    // NOTE: This part is highly specific to the CWS Dashboard DOM.
    // Since I cannot see the DOM, I will provide a generic robust interaction
    // that the user might need to tweak.
    
    try {
      // Step A: Find the language dropdown. 
      // It often has a label "Language" or shows "English" etc.
      // We will try to find the dropdown by label "Language" or class structures.
      
      // Attempt 1: Click the language selector (often top right or in a form)
      // This is a placeholder logic. Real selector needed.
      // If the URL has ?hl=lang, maybe we can just navigate?
      // Yes! navigating to `?hl={lang}` often switches context in Google apps, 
      // BUT for CWS Edit page, it might be internal state.
      
      console.log('   [User Action Needed] I cannot robustly switch languages automatically without DOM access.');
      console.log(`   Please manually select "${langCode}" in the dropdown.`);
      console.log('   Press ENTER when ready to paste description.');
      await new Promise(resolve => process.stdin.once('data', resolve));

      // 7. Update Description
      console.log('   Locating description box...');
      // Look for textarea with label "Description" or "Detailed description"
      const descriptionBox = page.locator('textarea').first(); // Risky, but often main textarea
      // Better: page.getByLabel('Description')
      
      await descriptionBox.fill(description);
      console.log('   Updated description text.');

      console.log(`   --> ${langCode} updated! (Not saved yet)`);

    } catch (error) {
      console.error(`   Failed to update ${langCode}:`, error);
    }
  }

  console.log('\nAll files processed.');
  console.log('Please Review changes in the browser and click "Save draft" or "Publish" manually.');
  console.log('Press ENTER to close the browser and exit.');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await context.close();
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});