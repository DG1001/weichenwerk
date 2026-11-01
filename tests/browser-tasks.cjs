const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// Task mode UI: off by default, started from the panel, task card on the map that opens the list,
// skip and stop, no overlap with the camera buttons, no overflow on phones.
(async () => {
  mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      const phone = viewport.width < 1000;
      const page = await browser.newPage({ viewport, isMobile: phone, hasTouch: phone }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:\/\//, route => route.abort());
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(() => three.ready, null, { timeout: 60000 });
      await page.evaluate(() => { game.speed = 0; });
      assert.equal(await page.evaluate(() => game.tasks), null, 'Free building by default');
      assert.ok(await page.locator('#taskCard').isHidden());

      await page.locator('#taskButton').click();
      assert.ok(await page.locator('#taskDialog').isVisible());
      assert.equal(await page.locator('#taskList li').count(), 10);
      assert.ok(await page.locator('#taskIntro').isVisible());
      await page.locator('#startTasks').click();
      assert.ok(await page.locator('#taskDialog').isHidden());
      assert.equal(await page.evaluate(() => game.tasks.index), 0);
      await page.evaluate(() => scrollTo(0, 0));
      const card = page.locator('#taskCard');
      await page.waitForFunction(() => !document.getElementById('taskCard').hidden);
      assert.match(await page.locator('#taskCardTitle').textContent(), /^1\/10 Erste Bahnlinie/);
      assert.equal(await page.locator('#taskCardValue').textContent(), '0 / 1');
      const c = await card.boundingBox(), cam = await page.locator('.camera-tools').boundingBox(), map = await page.locator('.map-wrap').boundingBox();
      assert.ok(c.y >= cam.y + cam.height || c.x + c.width <= cam.x, 'Task card must not overlap the camera buttons');
      assert.ok(c.x >= map.x && c.x + c.width <= map.x + map.width && c.y >= map.y, 'Task card sits on the map');
      await page.screenshot({ path: `artifacts/tasks-${viewport.width}x${viewport.height}.png` });

      // The card opens the list; the current task is highlighted, skip moves on without a reward.
      await card.click();
      assert.equal(await page.locator('#taskList li.current').count(), 1);
      const cash = await page.evaluate(() => game.cash);
      await page.locator('#skipTask').click();
      assert.equal(await page.evaluate(() => game.tasks.index), 1);
      assert.equal(await page.evaluate(() => game.cash), cash);
      assert.equal(await page.locator('#taskList li.skipped').count(), 1);
      await page.locator('#stopTasks').click();
      assert.equal(await page.evaluate(() => game.tasks), null);
      await page.waitForFunction(() => document.getElementById('taskCard').hidden);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No sideways overflow');
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Task UI passed: off by default, start from the panel, task card on the map (portrait, landscape, desktop) without overlapping the camera buttons, list with skip and stop.');
})().catch(error => { console.error(error); process.exitCode = 1; });
