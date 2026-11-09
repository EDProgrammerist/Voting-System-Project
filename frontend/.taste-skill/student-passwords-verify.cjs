process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { chromium } = require('C:/Users/ED/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.join(__dirname, 'student-passwords');
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], screenshots: [], screenshotErrors: [], measurements: [], errors: [], limitation: 'Real student passwords were not changed during browser QA. Full successful password setup, token rotation, and subsequent personal-password login are covered by the isolated Laravel feature suite.' };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'], executablePath: 'C:/Users/ED/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  const go = route => page.goto('http://localhost:5173' + route, { waitUntil: 'domcontentloaded' });
  async function shot(name) {
    try { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true, timeout: 8000, animations: 'disabled' }); report.screenshots.push(name + '.png'); }
    catch (error) { report.screenshotErrors.push({ name, error: error.message }); }
  }
  async function login(id = '20240100', password = '123456') {
    await page.getByLabel('Student ID number', { exact: true }).fill(id);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
  }
  try {
    await go('/voter/password');
    await page.waitForURL('**/voter/login');
    await page.getByRole('heading', { name: 'Welcome, voter.' }).waitFor();
    assert.equal(await page.getByLabel('Full Name', { exact: true }).count(), 0);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await shot('login-' + width);
      const size = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
      assert.ok(size.document <= width, 'No horizontal overflow at ' + width);
      report.measurements.push({ screen: 'login', ...size });
    }
    report.checks.push('Guest setup route redirects to student-ID/password login; responsive layout has no horizontal overflow at 1440/768/390.');
    await login('20240100', '20240100');
    await page.getByText('Student ID number or password is incorrect.', { exact: true }).waitFor();
    await login();
    await page.waitForURL('**/voter/password');
    await page.getByRole('heading', { name: 'Secure your account.' }).waitFor();
    report.checks.push('Old ID-as-password is rejected; actual default password opens required setup.');
    const token = await page.evaluate(() => sessionStorage.getItem('voter_access_token'));
    const session = await page.request.get('http://localhost:5173/api/voter/session', { headers: { Authorization: 'Bearer ' + token } });
    const electionId = (await session.json()).election.id;
    for (const route of ['/ballot', '/tally']) {
      const response = await page.request.get('http://localhost:5173/api/voter' + route, { headers: { Authorization: 'Bearer ' + token } });
      assert.equal(response.status(), 403);
      assert.equal((await response.json()).password_change_required, true);
    }
    for (const route of ['/voter/ballot', '/voter/review', '/voter/tally', '/voter/candidates']) {
      await go(route);
      await page.waitForURL('**/voter/password');
      await page.getByRole('heading', { name: 'Secure your account.' }).waitFor();
    }
    await page.evaluate(() => sessionStorage.setItem('voter_password_change_required', 'false'));
    await go('/voter/ballot');
    await page.waitForURL('**/voter/password');
    await page.reload();
    await page.getByRole('heading', { name: 'Secure your account.' }).waitFor();
    report.checks.push('Direct routes, refresh, API access and tampered local setup flag cannot skip mandatory setup.');
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await shot('setup-' + width);
      const size = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
      assert.ok(size.document <= width);
      report.measurements.push({ screen: 'setup', ...size });
    }
    const input = page.getByLabel('New password', { exact: true });
    const confirmation = page.getByLabel('Confirm new password', { exact: true });
    await input.fill('ValidPassword123!');
    await confirmation.fill('DifferentPassword123!');
    await page.getByRole('button', { name: 'Save password and continue' }).click();
    await page.getByText('Your passwords do not match. Please enter the same password twice.').waitFor();
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    assert.equal(await input.getAttribute('type'), 'text');
    assert.equal(await confirmation.getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await input.fill('lowercaseonly123!');
    await confirmation.fill('lowercaseonly123!');
    const invalid = page.waitForResponse(response => response.url().endsWith('/api/voter/password') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save password and continue' }).click();
    assert.equal((await invalid).status(), 422);
    await page.getByText(/must contain at least one uppercase/).waitFor();
    await page.route('**/api/voter/password', route => route.abort());
    await input.fill('ValidPassword123!');
    await confirmation.fill('ValidPassword123!');
    await page.getByRole('button', { name: 'Save password and continue' }).click();
    await page.getByText('The voting service is unavailable. Please try again.').waitFor();
    await page.unroute('**/api/voter/password');
    report.checks.push('Mismatch, server password policy, show/hide and network errors remain on setup without changing the real account password.');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/voter/login');
    await login();
    await page.waitForURL('**/voter/password');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/voter/login');
    report.checks.push('Setup sign-out revokes the session, and default login remains available because QA did not save a personal password.');
    for (const id of ['20209999', '20238888']) {
      await login(id);
      await page.getByText(/You cannot log in because/).waitFor();
      assert.ok(page.url().endsWith('/voter/login'));
    }
    report.checks.push('Graduate and stopped accounts remain ineligible with the default password.');
    const admin = await page.request.post('http://localhost:5173/api/admin/login', { data: { email: 'admin@ssg.local', password: 'Admin123!' } });
    assert.equal(admin.status(), 200);
    const adminToken = (await admin.json()).token;
    const dashboard = await page.request.get('http://localhost:5173/api/admin/dashboard?election_id=' + electionId, { headers: { Authorization: 'Bearer ' + adminToken } });
    assert.equal(dashboard.status(), 200);
    await page.request.post('http://localhost:5173/api/admin/logout', { headers: { Authorization: 'Bearer ' + adminToken } });
    await go('/admin/login');
    await page.getByLabel('Email', { exact: true }).waitFor();
    report.checks.push('Admin credentials and dashboard API remain functional; admin login remains an email/password form.');
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
