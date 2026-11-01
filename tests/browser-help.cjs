const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// help.html: offline, every table-of-contents link has a section, every diagram renders, fits phones;
// the game links to it from the top bar and from the tool options.
(async () => {
  mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 }), errors = [], network = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
      await page.route(/^https?:\/\//, route => route.abort());
      await page.goto(pathToFileURL(resolve('help.html')).href);
      const toc = await page.$$eval('nav a', links => links.map(a => a.getAttribute('href')));
      assert.ok(toc.length >= 8, 'Table of contents');
      for (const href of toc) assert.equal(await page.locator(href).count(), 1, `Missing section ${href}`);
      for (const id of ['signale', 'pfadsignale', 'ausweichgleis', 'bruecken']) assert.ok(toc.includes('#' + id), `Contents must link ${id}`);
      const figures = await page.$$eval('figure svg', svgs => svgs.map(s => ({ label: s.getAttribute('aria-label'), w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height })));
      assert.ok(figures.length >= 8, 'Diagrams');
      for (const f of figures) assert.ok(f.label && f.w > 200 && f.h > 40, `Diagram not rendered: ${JSON.stringify(f)}`);
      const loop = page.locator('#ausweichgleis figure').first();
      await loop.scrollIntoViewIfNeeded();
      const png = PNG.sync.read(await loop.screenshot({ path: `artifacts/help-loop-${viewport.width}.png` })), colors = new Set();
      for (let i = 0; i < png.data.length; i += 16) colors.add(`${png.data[i] >> 4},${png.data[i + 1] >> 4},${png.data[i + 2] >> 4}`);
      assert.ok(colors.size > 6, 'Passing-loop diagram must be drawn');
      await page.locator('nav a[href="#pfadsignale"]').click();
      assert.ok(await page.evaluate(() => { const r = document.querySelector('#pfadsignale').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight / 2; }), 'Contents link must jump to its section');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Help must not overflow sideways');
      await page.screenshot({ path: `artifacts/help-${viewport.width}.png` });
      assert.deepEqual(network, []); assert.deepEqual(errors, []);
      await page.close();
    }

    // Links from the game: top bar on phones (portrait and landscape) and desktop, plus tool options.
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport, isMobile: viewport.width < 1000, hasTouch: viewport.width < 1000 });
      await page.route(/^https?:\/\//, route => route.abort());
      await page.goto(pathToFileURL(resolve('index.html')).href);
      const help = page.locator('.topbar .help-link');
      assert.equal(await help.getAttribute('href'), 'help.html');
      const box = await help.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width && box.y >= 0 && box.y + box.height <= 60, `Help button must be in the top bar: ${JSON.stringify(box)}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Top bar with help button must not overflow');
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(pathToFileURL(resolve('index.html')).href);
    assert.equal(await page.locator('.route-options .help-inline').getAttribute('href'), 'help.html#strecken');
    assert.equal(await page.locator('.signal-options .help-inline').getAttribute('href'), 'help.html#pfadsignale');
    const popup = page.waitForEvent('popup');
    await page.locator('.topbar .help-link').click();
    const helpPage = await popup;
    await helpPage.waitForLoadState();
    assert.match(helpPage.url(), /help\.html$/);
    await page.close();
  } finally {
    await browser.close();
  }
  console.log('Help passed: offline page, contents and sections, diagrams render, no overflow on phone/desktop, help button in the top bar (portrait, landscape, desktop) and links at the tool options.');
})().catch(error => { console.error(error); process.exitCode = 1; });
