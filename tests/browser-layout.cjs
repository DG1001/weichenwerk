const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// Phone layouts: portrait bottom sheet over a sticky map, landscape map with a right-hand column.
(async () => {
  mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 780 }, { width: 844, height: 390 }, { width: 667, height: 375 }]) {
      const landscape = viewport.width > viewport.height;
      const page = await browser.newPage({ viewport, hasTouch: true, isMobile: true }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:\/\//, route => route.abort());
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(() => three.ready, null, { timeout: 60000 });
      await page.evaluate(() => { game.speed = 0; });
      const box = selector => page.locator(selector).boundingBox();
      const overflow = () => page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.deepEqual(await overflow(), { inner: viewport.width, scroll: viewport.width }, 'Page must not overflow sideways');
      assert.equal(await page.locator('#mapCoordinates').count(), 0, 'Coordinate box was removed from the map');

      const map = await box('.map-wrap'), bar = await box('.topbar'), tools = await box('.tool-grid');
      assert.ok(bar.y === 0 && bar.height <= 48, 'Slim top bar');
      for (const tool of await page.locator('[data-tool]').all()) {
        const b = await tool.boundingBox();
        assert.ok(b.y >= 0 && b.y + b.height <= viewport.height && b.x >= 0 && b.x + b.width <= viewport.width, 'Every tool button must be on screen without scrolling');
      }
      if (landscape) {
        assert.ok(map.x === 0 && map.y >= bar.height - 1 && map.y + map.height >= viewport.height - 1, 'Landscape map fills the left side below the bar');
        assert.ok(tools.x >= map.x + map.width - 1, 'Landscape tools sit right of the map');
        assert.ok(map.width >= viewport.width * 0.55, 'Landscape map keeps most of the width');
      } else {
        assert.ok(map.y === 0 && map.height === viewport.height && map.width === viewport.width, 'Portrait map fills the screen');
        assert.ok(tools.y + tools.height <= viewport.height && tools.y >= viewport.height - 130, 'Portrait tool dock sits at the bottom');
        const head = await box('.inspector-head');
        assert.ok(head.y + head.height <= viewport.height + 1, 'Selection title is visible in the dock');
      }
      await page.screenshot({ path: `artifacts/layout-${viewport.width}x${viewport.height}.png` });

      // Scrolling the panel keeps the map in place; a build preview stays reachable above the panel.
      await page.evaluate(() => scrollTo(0, 600));
      const mapScrolled = await box('.map-wrap');
      assert.equal(mapScrolled.y, map.y, 'Map must stay in place while the panel scrolls');
      await page.evaluate(() => { const tile = game.map.flat().find(t => t.terrain !== 'water' && !t.build && t.town === null && t.industry === null); beginConstruction(tile, 'rail'); finishConstruction(); });
      const preview = await box('#buildPreview');
      assert.ok(preview && preview.y >= 0 && preview.y + preview.height <= viewport.height, 'Build preview must be on screen');
      const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('#buildPreview') !== null, [preview.x + preview.width - 20, preview.y + preview.height / 2]);
      assert.ok(hit, 'Build preview must not be covered by the panel');
      await page.locator('#cancelBuild').click();

      // Picking a tool uncovers the map again in portrait.
      await page.locator('#saveGame').scrollIntoViewIfNeeded();
      await page.locator('[data-tool="rail"]').click();
      const scrollY = await page.evaluate(() => scrollY);
      if (!landscape) assert.equal(scrollY, 0, 'Tool choice must scroll the panel back down');
      const center = await page.evaluate(() => { const r = three.renderer.domElement.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName, center), 'CANVAS', 'Map centre must be uncovered after picking a tool');
      await page.locator('[data-tool="inspect"]').click();

      // The coordinate jump moved into the panel.
      await page.locator('#openCoordinates').click();
      await page.locator('#coordinateX').fill('5'); await page.locator('#coordinateY').fill('6');
      await page.locator('#jumpCoordinates').click();
      assert.deepEqual(await page.evaluate(() => mapCoordinates.target), { x: 5, y: 6 });
      if (!landscape) assert.equal(await page.evaluate(() => scrollY), 0, 'Coordinate jump must uncover the map');

      // Only the options of the current tool are shown.
      const shown = () => page.evaluate(() => Object.fromEntries(['.route-options', '.station-options', '.signal-options'].map(s => [s, getComputedStyle(document.querySelector(s)).display !== 'none'])));
      await page.locator('[data-tool="inspect"]').click();
      assert.deepEqual(await shown(), { '.route-options': false, '.station-options': false, '.signal-options': false });
      for (const [tool, expected] of [['rail', '.route-options'], ['road', '.route-options'], ['station', '.station-options'], ['signal', '.signal-options']]) {
        await page.locator(`[data-tool="${tool}"]`).click();
        const visible = await shown();
        assert.ok(Object.entries(visible).every(([key, value]) => value === (key === expected)), `${tool}: ${JSON.stringify(visible)}`);
      }

      // A signal can be set up from the preview bar alone: direction cycles both -> one way -> reversed -> both.
      const tile = await page.evaluate(() => {
        for (let x = 3; x <= 9; x++) Object.assign(getTile(x, 4), { terrain: 'grass', build: 'rail', station: null, signal: null, town: null, industry: null, links: x === 3 ? 1 : x === 9 ? 2 : 3 });
        mark3dDirty(); return { x: 6, y: 4 };
      });
      await page.evaluate(t => { scrollTo(0, 0); const w = tileToWorld3d(t.x, t.y); Object.assign(three.orbit, { targetX: w.x, targetZ: w.z, distance: 12 }); render(); }, tile);
      const at = await page.evaluate(t => { syncOrbitCamera(); const w = tileToWorld3d(t.x, t.y), v = new THREE.Vector3(w.x, 0.04, w.z).project(three.camera), r = three.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }, tile);
      await page.touchscreen.tap(at.x, at.y);
      await page.waitForFunction(() => construction.action === 'signal');
      const settings = () => page.evaluate(() => ({ oneWay: construction.settings.oneWay, direction: construction.settings.direction, type: construction.settings.type }));
      const first = await settings();
      assert.equal(first.oneWay, false);
      await page.locator('#previewSignalDirection').click();
      const oneWay = await settings();
      assert.equal(oneWay.oneWay, true);
      await page.locator('#previewSignalDirection').click();
      const reversed = await settings();
      assert.ok(reversed.oneWay && reversed.direction !== oneWay.direction, 'Second press reverses the one-way direction');
      await page.locator('#previewSignalDirection').click();
      assert.equal((await settings()).oneWay, false, 'Third press returns to both directions');
      await page.locator('#previewSignalDirection').click();
      assert.equal(await page.locator('#previewSignalType').textContent(), 'Typ: Block');
      await page.locator('#previewSignalType').click();
      assert.equal(await page.locator('#previewSignalType').textContent(), 'Typ: PBS');
      await page.locator('#confirmBuild').click();
      assert.deepEqual(await page.evaluate(t => ({ ...getTile(t.x, t.y).signal }), tile), { direction: oneWay.direction, oneWay: true, type: 'path' });
      assert.equal(await page.locator('#previewSignalDirection').isHidden(), true, 'Signal buttons leave with the preview');
      await page.locator('[data-tool="inspect"]').click();

      assert.deepEqual(await overflow(), { inner: viewport.width, scroll: viewport.width });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Phone layout passed: portrait 390/320 and landscape 844x390/667x375, no overflow, tools on screen, map stays put, build preview reachable, map uncovered after tool choice and coordinate jump, options per tool, signal set up from the preview bar.');
})().catch(error => { console.error(error); process.exitCode = 1; });
