import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const DIR = '/tmp/vr-screenshots/production-onboarding';

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

async function loginAs(page, email, password) {
  // Clear all cookies to fully reset session
  const cookies = await page.cookies();
  if (cookies.length > 0) {
    await page.deleteCookie(...cookies);
  }

  // Login via NextAuth API directly (bypasses form interaction issues)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await waitFor(page, 500);

  const loginResult = await page.evaluate(async (e, p) => {
    // Get CSRF token
    const csrfRes = await fetch('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();

    // Call credentials signIn directly
    const res = await fetch('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrfToken,
        email: e,
        password: p,
        json: 'true',
      }),
      redirect: 'follow',
    });
    return { ok: res.ok, status: res.status, url: res.url };
  }, email, password);

  // Reload to pick up the new session
  await page.goto(`${BASE}/api/auth/session`, { waitUntil: 'networkidle0', timeout: 10000 });
  const session = await page.evaluate(() => document.body.innerText);
  const role = JSON.parse(session)?.user?.role;

  // Navigate to the right dashboard
  let dest = '/';
  if (role === 'OWNER') dest = '/owner/vehicles';
  else if (role === 'PRODUCTION') dest = '/production/search';
  else if (role === 'ADMIN') dest = '/admin/analytics';

  await page.goto(`${BASE}${dest}`, { waitUntil: 'networkidle0', timeout: 15000 });
  await waitFor(page, 1000);
  console.log(`  Logged in as ${email} (${role}) → ${page.url()}`);
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

  const testEmail = `prod-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';
  const companyName = 'Reel Films Studios';

  try {
    // ==========================================
    // STEP 1: Register as Production User
    // ==========================================
    console.log('\n=== STEP 1: Register as Production ===');
    await page.goto(`${BASE}/register?role=PRODUCTION`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 1000);

    await page.type('input[placeholder="John Smith"]', 'Sarah Producer');
    await page.type('input[type="email"]', testEmail);
    const companyInput = await page.$('#companyName');
    if (companyInput) {
      await companyInput.type(companyName);
      console.log('  Filled company name');
    }
    await page.type('input[type="password"]', testPassword);
    await ss(page, 'register-filled');

    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => !window.location.pathname.includes('/register'),
      { timeout: 15000 }
    ).catch(() => console.log('  Registration may have failed to redirect'));
    await waitFor(page, 2000);
    await ss(page, 'after-register');
    console.log(`  URL: ${page.url()}`);

    if (page.url().includes('/register') || page.url().includes('/login')) {
      console.log('  Logging in manually...');
      await loginAs(page, testEmail, testPassword);
    }

    if (!page.url().includes('/production')) {
      console.log('  FATAL: Could not reach production dashboard');
      await ss(page, 'fatal');
      await browser.close();
      return;
    }
    console.log('  PASS: Registered and logged in as production user');

    // ==========================================
    // STEP 2: View Search Page
    // ==========================================
    console.log('\n=== STEP 2: Search Page ===');
    await page.goto(`${BASE}/production/search`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 3000);
    await ss(page, 'search-page');

    const searchText = await page.evaluate(() => document.body.innerText);
    const vehicleCount = await page.evaluate(() => {
      return document.querySelectorAll('a[href*="/production/vehicles/"]').length;
    });
    console.log(`  Vehicles found in search: ${vehicleCount}`);
    console.log(`  Shows Toyota Hilux: ${searchText.includes('Toyota') ? 'YES' : 'NO'}`);

    // ==========================================
    // STEP 3: Search with Filters
    // ==========================================
    console.log('\n=== STEP 3: Search with Filters ===');
    const locationSelect = await page.$('#location');
    if (locationSelect) {
      await locationSelect.select('Cape Town');
      await clickByText(page, 'Search');
      await waitFor(page, 3000);
      await ss(page, 'search-cape-town');
      const filteredCount = await page.evaluate(() => {
        return document.querySelectorAll('a[href*="/production/vehicles/"]').length;
      });
      console.log(`  Cape Town vehicles: ${filteredCount}`);
      await clickByText(page, 'Clear');
      await waitFor(page, 2000);
    }

    // ==========================================
    // STEP 4: View Vehicle Detail
    // ==========================================
    console.log('\n=== STEP 4: Vehicle Detail ===');
    const vehicleLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/production/vehicles/"]'));
      return links[0]?.href || null;
    });

    if (vehicleLink) {
      await page.goto(vehicleLink, { waitUntil: 'networkidle0', timeout: 15000 });
      await waitFor(page, 3000);
      await ss(page, 'vehicle-detail');

      const detailText = await page.evaluate(() => document.body.innerText);
      console.log(`  Shows Toyota Hilux: ${detailText.includes('Toyota') && detailText.includes('Hilux') ? 'YES' : 'NO'}`);
      console.log(`  Shows "Place Option": ${detailText.includes('Place Option') ? 'YES' : 'NO'}`);

      // ==========================================
      // STEP 5: Place Option
      // ==========================================
      console.log('\n=== STEP 5: Place Option ===');
      const placeOptionLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(l => l.href.includes('/production/options/new'));
        return link?.href || null;
      });

      if (placeOptionLink) {
        await page.goto(placeOptionLink, { waitUntil: 'networkidle0', timeout: 15000 });
        await waitFor(page, 2000);
        await ss(page, 'option-form-empty');

        const formText = await page.evaluate(() => document.body.innerText);
        console.log(`  Shows vehicle name: ${formText.includes('Toyota') ? 'YES' : 'NO'}`);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endDay = new Date();
        endDay.setDate(endDay.getDate() + 3);
        const startDateStr = tomorrow.toISOString().split('T')[0];
        const endDateStr = endDay.toISOString().split('T')[0];

        await page.evaluate((start, end) => {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          const startInput = document.querySelector('#startDate');
          const endInput = document.querySelector('#endDate');
          if (startInput) {
            nativeSetter.call(startInput, start);
            startInput.dispatchEvent(new Event('input', { bubbles: true }));
            startInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (endInput) {
            nativeSetter.call(endInput, end);
            endInput.dispatchEvent(new Event('input', { bubbles: true }));
            endInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, startDateStr, endDateStr);

        await page.type('#rate', '2500');
        await ss(page, 'option-form-filled');

        await page.click('button[type="submit"]');
        await page.waitForFunction(
          () => window.location.pathname === '/production/options',
          { timeout: 15000 }
        ).catch(() => {});
        await waitFor(page, 3000);
        await ss(page, 'after-option-submit');

        const afterOptionUrl = page.url();
        console.log(`  After submit: ${afterOptionUrl}`);
        if (afterOptionUrl.includes('/production/options') && !afterOptionUrl.includes('/new')) {
          console.log('  PASS: Option placed, redirected to options list');
        } else {
          const errorText = await page.evaluate(() => {
            const err = document.querySelector('.bg-red-50');
            return err?.textContent || '';
          });
          if (errorText) console.log(`  Error: ${errorText}`);
        }
      }
    }

    // ==========================================
    // STEP 6: View Production Options List
    // ==========================================
    console.log('\n=== STEP 6: Production Options List ===');
    await page.goto(`${BASE}/production/options`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 3000);
    await ss(page, 'production-options-list');

    const optionsText = await page.evaluate(() => document.body.innerText);
    console.log(`  Shows Toyota Hilux option: ${optionsText.includes('Toyota') ? 'YES' : 'NO'}`);
    console.log(`  Shows Pending Response: ${optionsText.includes('Pending Response') ? 'YES' : 'NO'}`);
    console.log(`  Shows rate: ${optionsText.includes('2 500') || optionsText.includes('2500') || optionsText.includes('R') ? 'YES' : 'NO'}`);

    // ==========================================
    // STEP 7: Production Settings Page
    // ==========================================
    console.log('\n=== STEP 7: Production Settings ===');
    await page.goto(`${BASE}/production/settings`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'production-settings');

    const settingsText = await page.evaluate(() => document.body.innerText);
    console.log(`  Shows name: ${settingsText.includes('Sarah Producer') ? 'YES' : 'NO'}`);
    console.log(`  Shows Production type: ${settingsText.includes('Production') ? 'YES' : 'NO'}`);
    console.log(`  Shows notifications toggle: ${settingsText.includes('Email Notifications') ? 'YES' : 'NO'}`);

    // ==========================================
    // STEP 8: Owner Sees the Option
    // ==========================================
    console.log('\n=== STEP 8: Owner Sees Option ===');
    await loginAs(page, 'owner@example.com', 'owner123');

    await page.goto(`${BASE}/owner/options`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 3000);
    await ss(page, 'owner-options-list');

    const ownerOptionsText = await page.evaluate(() => document.body.innerText);
    console.log(`  Owner sees Toyota Hilux option: ${ownerOptionsText.includes('Toyota') ? 'YES' : 'NO'}`);
    console.log(`  Shows "Sarah Producer": ${ownerOptionsText.includes('Sarah Producer') ? 'YES' : 'NO'}`);
    console.log(`  Shows "${companyName}": ${ownerOptionsText.includes(companyName) ? 'YES' : 'NO'}`);
    console.log(`  Shows Accept/Decline: ${ownerOptionsText.includes('Accept') && ownerOptionsText.includes('Decline') ? 'YES' : 'NO'}`);

    // ==========================================
    // STEP 9: Owner Accepts the Option
    // ==========================================
    console.log('\n=== STEP 9: Owner Accepts Option ===');
    const hasAcceptBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent?.trim() === 'Accept');
    });

    if (hasAcceptBtn) {
      // Intercept the PATCH response to know when it completes
      const patchPromise = page.waitForResponse(
        res => res.url().includes('/api/options/') && res.request().method() === 'PATCH',
        { timeout: 15000 }
      );

      await clickByText(page, 'Accept');
      const patchResponse = await patchPromise;
      console.log(`  PATCH status: ${patchResponse.status()}`);
      await waitFor(page, 2000); // Wait for React re-render

      await ss(page, 'owner-after-accept');

      const afterAcceptText = await page.evaluate(() => document.body.innerText);
      console.log(`  Status changed to Accepted: ${afterAcceptText.includes('Accepted') ? 'YES' : 'NO'}`);
      console.log(`  Accept/Decline buttons gone: ${!afterAcceptText.includes('Decline') ? 'YES' : 'NO'}`);
    } else {
      console.log('  WARN: Accept button not found');
    }

    // ==========================================
    // STEP 10: Production User Sees Accepted Option
    // ==========================================
    console.log('\n=== STEP 10: Production Sees Accepted ===');
    await loginAs(page, testEmail, testPassword);

    if (!page.url().includes('/login')) {
      await page.goto(`${BASE}/production/options`, { waitUntil: 'networkidle0', timeout: 15000 });
      await waitFor(page, 3000);
    }
    await ss(page, 'production-option-accepted');

    const prodAcceptedText = await page.evaluate(() => document.body.innerText);
    console.log(`  Shows Accepted status: ${prodAcceptedText.includes('Accepted') ? 'YES' : 'NO'}`);
    console.log(`  Shows Confirm button: ${prodAcceptedText.includes('Confirm') ? 'YES' : 'NO'}`);

    // ==========================================
    // STEP 11: Admin Sees the Option
    // ==========================================
    console.log('\n=== STEP 11: Admin Verification ===');
    await loginAs(page, 'admin@vehiclereel.co.za', 'admin123');

    if (!page.url().includes('/login')) {
      await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle0', timeout: 15000 });
    } else {
      // fallback
      await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle0', timeout: 15000 });
    }
    await waitFor(page, 3000);
    await ss(page, 'admin-sees-production-user');

    const adminUsersText = await page.evaluate(() => document.body.innerText);
    console.log(`  Admin sees "Sarah Producer": ${adminUsersText.includes('Sarah Producer') ? 'YES' : 'NO'}`);
    console.log(`  Admin sees PRODUCTION role: ${adminUsersText.includes('PRODUCTION') ? 'YES' : 'NO'}`);

    // Check admin bookings page
    await page.goto(`${BASE}/admin/bookings`, { waitUntil: 'networkidle0', timeout: 15000 });
    await waitFor(page, 2000);
    await ss(page, 'admin-bookings');

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n\n========== PRODUCTION ONBOARDING TEST COMPLETE ==========');
    if (consoleErrors.length > 0) {
      console.log(`\nConsole errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 10).forEach(e => console.log(`  - ${e.substring(0, 150)}`));
    }
    console.log('\nScreenshots: /tmp/vr-screenshots/production-onboarding/');

  } catch (error) {
    console.error('\nERROR:', error.message);
    await ss(page, 'error-state');
  }

  await browser.close();
}

main().catch(console.error);
