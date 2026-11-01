const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, extname, join } = require('node:path');

// Installable app: manifest, icons, a service worker that precaches every file the pages load,
// and an offline start. Served from localhost, the only plain-HTTP origin browsers allow service workers on.
const root = resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    // Every local file referenced by the pages is precached.
    const precached = [...readFileSync(join(root, 'sw.js'), 'utf8').match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    const referenced = new Set();
    for (const page of ['index.html', 'help.html']) {
      for (const [, ref] of readFileSync(join(root, page), 'utf8').matchAll(/(?:src|href)="([^"#:]+)(?:#[^"]*)?"/g)) referenced.add(ref);
    }
    for (const ref of referenced) assert.ok(precached.includes(ref), `${ref} is loaded by a page but missing from sw.js FILES`);
    for (const file of precached.filter(f => f !== './')) assert.ok(existsSync(join(root, file)), `sw.js lists missing file ${file}`);

    const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, './index.html');
    for (const size of ['192x192', '512x512']) assert.ok(manifest.icons.some(i => i.sizes === size && existsSync(join(root, i.src))), `Icon ${size}`);
    assert.ok(manifest.icons.some(i => i.purpose === 'maskable'), 'Maskable icon');

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'index.html');
    assert.equal(await page.evaluate(() => document.querySelector('link[rel=manifest]').getAttribute('href')), 'manifest.webmanifest');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 });
    await page.evaluate(() => caches.open('libre-transport-v1').then(c => c.keys()).then(k => k.length)).then(n => assert.ok(n >= precached.length - 1, `Precache incomplete: ${n}`));

    // Offline: the game and the help still load from the cache.
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => typeof game !== 'undefined' && typeof THREE !== 'undefined' && document.querySelectorAll('[data-tool]').length === 6, null, { timeout: 60000 });
    const help = await context.newPage();
    await help.goto(base + 'help.html');
    assert.ok(await help.locator('#ausweichgleis svg').count() >= 3, 'Help must work offline');
    assert.deepEqual(errors, []);
    await context.close();

    // Opened as a file, the game skips the service worker without errors.
    const local = await browser.newPage(), fileErrors = [];
    local.on('pageerror', e => fileErrors.push(e.message));
    await local.goto('file://' + join(root, 'index.html'));
    await local.waitForFunction(() => typeof game !== 'undefined');
    assert.equal(await local.evaluate(() => navigator.serviceWorker?.controller ?? null), null);
    assert.deepEqual(fileErrors, []);
  } finally {
    await browser.close();
    server.close();
  }
  console.log('PWA passed: manifest and icons, every loaded file precached, service worker controls the page, game and help load offline, file:// start unaffected.');
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
