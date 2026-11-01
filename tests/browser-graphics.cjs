const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// Graphics quality: pixel-ratio caps, 30 fps in battery mode, phone default, stored per browser.
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    for (const phone of [true, false]) {
      const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 3, isMobile: phone, hasTouch: phone });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(() => three.ready, null, { timeout: 60000 });
      const state = () => page.evaluate(() => ({ mode: graphics.mode, select: document.getElementById('graphicsQuality').value, ratio: three.renderer.getPixelRatio() }));
      assert.deepEqual(await state(), phone ? { mode: 'balanced', select: 'balanced', ratio: 1.5 } : { mode: 'high', select: 'high', ratio: 2 }, 'Default per device');
      for (const [mode, ratio] of [['high', 2], ['battery', 1], ['balanced', 1.5]]) {
        await page.locator('#graphicsQuality').selectOption(mode);
        assert.deepEqual(await state(), { mode, select: mode, ratio });
      }
      await page.locator('#graphicsQuality').selectOption('battery');
      // Battery mode processes at most every 30 ms; the canvas size follows the pixel ratio.
      const gaps = await page.evaluate(() => new Promise(done => {
        const original = window.updateUi, stamps = [];
        window.updateUi = () => { stamps.push(performance.now()); original(); };
        setTimeout(() => { window.updateUi = original; done(stamps.slice(1).map((t, i) => t - stamps[i])); }, 1500);
      }));
      assert.ok(gaps.length >= 1 && gaps.every(g => g >= 29), `Battery mode must cap the frame rate: ${gaps.map(g => g.toFixed(1))}`);
      assert.equal(await page.evaluate(() => three.renderer.domElement.width === Math.floor(threeViewport.clientWidth * three.renderer.getPixelRatio())), true);
      await page.reload();
      await page.waitForFunction(() => three.ready, null, { timeout: 60000 });
      assert.deepEqual(await state(), { mode: 'battery', select: 'battery', ratio: 1 }, 'Choice must survive a reload');
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Graphics passed: phone default Ausgewogen (1.5x), desktop Hoch (2x), Akku sparen 1x with <= 30 fps, choice kept after reload.');
})().catch(error => { console.error(error); process.exitCode = 1; });
