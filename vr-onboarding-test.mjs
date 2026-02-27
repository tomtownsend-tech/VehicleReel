import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const DIR = '/tmp/vr-screenshots/onboarding';

let stepNum = 0;

async function ss(page, name) {
  stepNum++;
  const filename = `${String(stepNum).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(DIR, filename), fullPage: true });
  console.log(`  [screenshot] ${filename}`);
  return filename;
}

async function waitFor(page, ms) { await new Promise(r => setTimeout(r, ms)); }

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button'), ...document.querySelectorAll('a')];
    const el = els.find(e => e.textContent?.trim().includes(t));
    if (el) el.click();
    else throw new Error(`Button "${t}" not found`);
  }, text);
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  const testEmail = `testuser-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';

  try {
    // ==========================================
    // STEP 1: Register as Owner
    // ==========================================
    console.log('\n=== STEP 1: Register ===');
    await page.goto(`${BASE}/register?role=OWNER`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 1000);

    await page.type('input[placeholder="John Smith"]', 'New Test Owner');
    await page.type('input[type="email"]', testEmail);
    await page.type('input[type="password"]', testPassword);
    await ss(page, 'register-filled');

    // Submit and wait for navigation
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => !window.location.pathname.includes('/register'),
      { timeout: 15000 }
    ).catch(() => console.log('  Registration may have failed to redirect'));
    await waitFor(page, 2000);
    await ss(page, 'after-register');
    console.log(`  URL: ${page.url()}`);

    // If still on register, login manually
    if (page.url().includes('/register') || page.url().includes('/login')) {
      console.log('  Logging in manually...');
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
      await page.waitForSelector('input[type="email"]');
      await page.click('input[type="email"]', { clickCount: 3 });
      await page.type('input[type="email"]', testEmail);
      await page.click('input[type="password"]', { clickCount: 3 });
      await page.type('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        { timeout: 15000 }
      );
      await waitFor(page, 2000);
      console.log(`  After login: ${page.url()}`);
    }

    if (!page.url().includes('/owner')) {
      console.log('  FATAL: Could not reach owner dashboard');
      await ss(page, 'fatal');
      await browser.close();
      return;
    }

    console.log('  PASS: Registered and logged in as owner');

    // ==========================================
    // STEP 2: Vehicle Wizard - Step 1 (Details)
    // ==========================================
    console.log('\n=== STEP 2: Vehicle Wizard - Details ===');
    await page.goto(`${BASE}/owner/vehicles/new`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 1000);

    // Fill all fields
    const selects = await page.$$('select');
    if (selects[0]) await selects[0].select('CAR');       // Vehicle Type
    await page.type('input[placeholder*="Toyota"]', 'Volkswagen');
    await page.type('input[placeholder*="Hilux"]', 'Polo');
    if (selects[1]) await selects[1].select('Silver');     // Color
    await page.type('input[placeholder*="2021"]', '2022');
    await page.type('input[placeholder*="45000"]', '30000');
    if (selects[2]) await selects[2].select('GOOD');       // Condition
    if (selects[3]) await selects[3].select('Cape Town');  // Location
    await page.type('input[placeholder*="Roof rack"]', 'Bluetooth, Parking sensors');
    await ss(page, 'wizard-step1-filled');

    // Click "Next: Add Photos"
    await clickByText(page, 'Next: Add Photos');
    await waitFor(page, 8000);
    await ss(page, 'wizard-step2');

    const step2Text = await page.evaluate(() => document.body.innerText);
    if (step2Text.includes('Upload photos') || step2Text.includes('Click to upload')) {
      console.log('  PASS: Vehicle created, now on Photos step');
    } else {
      console.log('  Page text:', step2Text.substring(0, 200));
    }

    // ==========================================
    // STEP 3: Vehicle Wizard - Step 2 (Photos)
    // ==========================================
    console.log('\n=== STEP 3: Upload Photos ===');

    // Upload photos using file input
    const photoInput = await page.$('input[type="file"][accept*="image"]');
    if (photoInput) {
      await photoInput.uploadFile(
        '/tmp/vr-test-files/car-photo-1.png',
        '/tmp/vr-test-files/car-photo-2.png'
      );
      await waitFor(page, 1000);
      await ss(page, 'photos-selected');

      const previewCount = await page.evaluate(() => {
        return document.querySelectorAll('.grid img, .aspect-square img').length;
      });
      console.log(`  Photo previews shown: ${previewCount}`);
    } else {
      console.log('  WARN: Photo upload input not found');
    }

    // Click "Next: Documents"
    await clickByText(page, 'Next: Documents');
    await waitFor(page, 8000);
    await ss(page, 'wizard-step3');

    const step3Text = await page.evaluate(() => document.body.innerText);
    if (step3Text.includes('verification documents') || step3Text.includes('South African ID')) {
      console.log('  PASS: Photos uploaded, now on Documents step');
    } else {
      console.log('  Page text:', step3Text.substring(0, 200));
    }

    // ==========================================
    // STEP 4: Vehicle Wizard - Step 3 (Documents)
    // ==========================================
    console.log('\n=== STEP 4: Upload Documents ===');

    // Upload SA ID
    const docInputs = await page.$$('input[type="file"]');
    if (docInputs.length >= 3) {
      await docInputs[0].uploadFile('/tmp/vr-test-files/sa-id.png');
      await waitFor(page, 500);
      await docInputs[1].uploadFile('/tmp/vr-test-files/drivers-license.png');
      await waitFor(page, 500);
      await docInputs[2].uploadFile('/tmp/vr-test-files/vehicle-registration.png');
      await waitFor(page, 500);
      await ss(page, 'documents-selected');

      const docNames = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('span')).filter(s => s.textContent?.includes('.png')).map(s => s.textContent);
      });
      console.log(`  Documents selected: ${docNames.join(', ')}`);
    } else {
      console.log(`  WARN: Only ${docInputs.length} file inputs found`);
    }

    // Click "Submit for Review"
    await clickByText(page, 'Submit for Review');
    await waitFor(page, 6000);
    await ss(page, 'after-submit');

    const afterSubmitUrl = page.url();
    console.log(`  After submit: ${afterSubmitUrl}`);

    if (afterSubmitUrl.includes('/owner/vehicles') && !afterSubmitUrl.includes('/new')) {
      console.log('  PASS: Wizard completed, redirected to vehicles list');
    }

    // ==========================================
    // STEP 5: Verify Vehicle in List
    // ==========================================
    console.log('\n=== STEP 5: Verify Vehicle ===');
    await page.goto(`${BASE}/owner/vehicles`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'vehicles-list-after');

    const hasVW = await page.evaluate(() => document.body.innerText.includes('Volkswagen'));
    console.log(`  Volkswagen Polo in list: ${hasVW ? 'YES' : 'NO'}`);

    // Click into vehicle detail
    const vwLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const vLink = links.find(l => l.href.includes('/owner/vehicles/') && !l.href.includes('/new'));
      return vLink?.href || null;
    });

    if (vwLink) {
      await page.goto(vwLink, { waitUntil: 'networkidle0', timeout: 15000 });
      await waitFor(page, 2000);
      await ss(page, 'vehicle-detail');

      const detailText = await page.evaluate(() => document.body.innerText);
      const hasPhotos = await page.evaluate(() => document.querySelectorAll('img[src*="supabase"]').length);
      console.log(`  Detail shows Volkswagen: ${detailText.includes('Volkswagen') ? 'YES' : 'NO'}`);
      console.log(`  Photos from Supabase: ${hasPhotos}`);
      console.log(`  Documents section: ${detailText.includes('Documents') ? 'YES' : 'NO'}`);
    }

    // ==========================================
    // STEP 6: Admin sees new content
    // ==========================================
    console.log('\n=== STEP 6: Admin Verification ===');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('input[type="email"]');
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'admin@vehiclereel.co.za');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await waitFor(page, 3000);

    // Check users
    await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'admin-users');
    const adminSeesUser = await page.evaluate(() => document.body.innerText.includes('New Test Owner'));
    console.log(`  Admin sees new user: ${adminSeesUser ? 'YES' : 'NO'}`);

    // Check vehicles
    await page.goto(`${BASE}/admin/vehicles`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'admin-vehicles');
    const adminSeesVehicle = await page.evaluate(() => document.body.innerText.includes('Volkswagen'));
    console.log(`  Admin sees VW Polo: ${adminSeesVehicle ? 'YES' : 'NO'}`);

    // Check documents
    await page.goto(`${BASE}/admin/documents`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'admin-documents');
    const adminSeesDocs = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('SA_ID') || text.includes('PENDING') || text.includes('DRIVERS');
    });
    console.log(`  Admin sees documents: ${adminSeesDocs ? 'YES' : 'NO'}`);

    // ==========================================
    // STEP 7: Production user searches and finds vehicle
    // ==========================================
    console.log('\n=== STEP 7: Production User Search ===');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('input[type="email"]');
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'production@example.com');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'production123');
    await page.click('button[type="submit"]');
    await waitFor(page, 3000);

    await page.goto(`${BASE}/production/search`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'production-search');

    const searchSeesVW = await page.evaluate(() => document.body.innerText.includes('Volkswagen'));
    console.log(`  Production sees VW Polo: ${searchSeesVW ? 'YES' : 'NO'}`);

    // Click into vehicle detail and check Place Option
    if (vwLink) {
      const prodVehicleId = vwLink.match(/vehicles\/([^/]+)/)?.[1];
      if (prodVehicleId) {
        await page.goto(`${BASE}/production/vehicles/${prodVehicleId}`, { waitUntil: 'networkidle0', timeout: 15000 });
        await waitFor(page, 2000);
        await ss(page, 'production-vehicle-detail');

        const hasPlaceOption = await page.evaluate(() => document.body.innerText.includes('Place Option'));
        console.log(`  "Place Option" button: ${hasPlaceOption ? 'YES' : 'NO'}`);

        const prodDetailText = await page.evaluate(() => document.body.innerText);
        console.log(`  Shows Volkswagen Polo: ${prodDetailText.includes('Volkswagen') && prodDetailText.includes('Polo') ? 'YES' : 'NO'}`);
        console.log(`  Shows Cape Town: ${prodDetailText.includes('Cape Town') ? 'YES' : 'NO'}`);
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n\n========== ONBOARDING TEST COMPLETE ==========');
    if (consoleErrors.length > 0) {
      console.log(`\nConsole errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 10).forEach(e => console.log(`  - ${e.substring(0, 150)}`));
    }
    console.log('\nScreenshots: /tmp/vr-screenshots/onboarding/');

  } catch (error) {
    console.error('\nERROR:', error.message);
    await ss(page, 'error-state');
  }

  await browser.close();
}

main().catch(console.error);
