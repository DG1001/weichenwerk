const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// Screen position of a world point (pixels relative to the page) with the current orbit camera.
const projectInPage = (p) => { syncOrbitCamera(); const v = new THREE.Vector3(p.x, 0, p.z).project(three.camera), r = three.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; };

(async () => {
  mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport, hasTouch: true, isMobile: viewport.width < 600 }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:\/\//, route => route.abort());
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(() => three.ready, null, { timeout: 30000 });
      await page.evaluate(() => { game.speed = 0; });
      const canvas = page.locator('#threeViewport canvas');
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const cdp = await page.context().newCDPSession(page);
      // `timestamp` (seconds since epoch) sets event.timeStamp, so flick speed does not depend on this machine's frame rate.
      const touch = (type, points, timestamp) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })), ...(timestamp ? { timestamp } : {}) });
      const ground = (x, y) => page.evaluate(([x, y]) => { syncOrbitCamera(); const p = groundPointAt(x, y); return { x: p.x, z: p.z }; }, [x, y]);
      const project = p => page.evaluate(`(${projectInPage})(${JSON.stringify(p)})`);
      const orbit = () => page.evaluate(() => ({ ...three.orbit }));
      // Moves all fingers linearly from `from` to `to` in `steps` touchMove events.
      const gesture = async (from, to, steps = 10, release = true) => {
        await touch('touchStart', from);
        for (let i = 1; i <= steps; i++) await touch('touchMove', from.map((p, k) => ({ x: p.x + (to[k].x - p.x) * i / steps, y: p.y + (to[k].y - p.y) * i / steps })));
        if (release) await touch('touchEnd', []);
      };
      const near = (a, b, tolerance, message) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < tolerance, `${message}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      const zoomBefore = (await orbit()).distance;

      // One finger pans with the inspect tool; the grabbed ground point stays under the finger.
      await page.locator('[data-tool="inspect"]').click();
      await canvas.scrollIntoViewIfNeeded();
      let anchor = await ground(cx, cy);
      await gesture([{ x: cx, y: cy }], [{ x: cx - 70, y: cy + 50 }]);
      near(await project(anchor), { x: cx - 70, y: cy + 50 }, 3, 'One-finger pan must keep the ground under the finger');
      assert.equal((await orbit()).distance, zoomBefore, 'One-finger pan must not zoom');

      // A tap after the pan still selects (the click block expires).
      await page.waitForTimeout(450);
      await page.touchscreen.tap(cx, cy);
      const tapped = await page.evaluate(() => mapCoordinates.last);
      const expectedTap = await page.evaluate(([x, y]) => pointerTile({ clientX: x, clientY: y }), [cx, cy]);
      assert.deepEqual(tapped, expectedTap, 'Tap must select the tile under the finger');

      // Fast flick keeps gliding after release and then stops.
      const glideStart = await orbit(), t0 = Date.now() / 1000;
      await touch('touchStart', [{ x: cx, y: cy }], t0);
      for (let i = 1; i <= 6; i++) await touch('touchMove', [{ x: cx + i * 12, y: cy }], t0 + i * 0.016);
      await touch('touchEnd', [], t0 + 0.11);
      const released = await orbit();
      assert.ok(Math.hypot(released.targetX - glideStart.targetX, released.targetZ - glideStart.targetZ) > 0.05);
      assert.ok(await page.evaluate(() => Boolean(three.inertia)), 'Flick must start gliding');
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const glided = await orbit();
      assert.ok(Math.hypot(glided.targetX - released.targetX, glided.targetZ - released.targetZ) > 0.01, 'Flick must glide after release');
      // Holding still before lifting must not glide.
      const t1 = Date.now() / 1000;
      await touch('touchStart', [{ x: cx, y: cy }], t1);
      for (let i = 1; i <= 6; i++) await touch('touchMove', [{ x: cx + i * 12, y: cy }], t1 + i * 0.016);
      await touch('touchEnd', [], t1 + 0.5);
      assert.equal(await page.evaluate(() => three.inertia), null, 'Lifting after a pause must not glide');

      // Pinch out zooms in around the midpoint, and the ground under the midpoint stays put.
      anchor = await ground(cx, cy);
      const before = await orbit();
      await gesture([{ x: cx - 40, y: cy }, { x: cx + 40, y: cy }], [{ x: cx - 100, y: cy }, { x: cx + 100, y: cy }]);
      const pinched = await orbit();
      assert.ok(Math.abs(pinched.distance - before.distance * 80 / 200) < 0.01, `Pinch must zoom in proportionally (${before.distance} -> ${pinched.distance})`);
      near(await project(anchor), { x: cx, y: cy }, 3, 'Pinch must keep the midpoint anchored');
      assert.equal(await page.evaluate(() => construction.start), null, 'Gestures must not start construction');

      // Two-finger twist rotates the map with the fingers: each finger keeps its ground point.
      const a = { x: cx - 60, y: cy }, b = { x: cx + 60, y: cy }, a2 = { x: cx, y: cy - 60 }, b2 = { x: cx, y: cy + 60 };
      const groundA = await ground(a.x, a.y), groundB = await ground(b.x, b.y), yawBefore = (await orbit()).yaw;
      await gesture([a, b], [a2, b2], 12);
      assert.ok(Math.abs((await orbit()).yaw - yawBefore) > 1, 'Twist must rotate');
      // The tilted view foreshortens vertical spans, so after a quarter turn the fingers can only stay near their points.
      near(await project(groundA), a2, 20, 'Twist must keep the first finger on its ground point');
      near(await project(groundB), b2, 20, 'Twist must keep the second finger on its ground point');

      // Two-finger drag pans without zoom.
      anchor = await ground(cx, cy);
      const distance = (await orbit()).distance;
      await gesture([{ x: cx - 50, y: cy }, { x: cx + 50, y: cy }], [{ x: cx - 20, y: cy + 60 }, { x: cx + 80, y: cy + 60 }]);
      assert.ok(Math.abs((await orbit()).distance - distance) < 1e-9, 'Parallel two-finger drag must not zoom');
      near(await project(anchor), { x: cx + 30, y: cy + 60 }, 3, 'Two-finger drag must pan');

      // Rail tool: a one-finger drag draws a preview instead of panning.
      await page.evaluate(() => fitCamera());
      await page.locator('[data-tool="rail"]').click();
      await canvas.scrollIntoViewIfNeeded();
      const findLand = () => page.evaluate(() => {
        for (let y = 2; y < config.height - 2; y++) for (let x = 2; x < config.width - 8; x++) {
          const row = [0, 1, 2, 3, 4, 5].map(i => getTile(x + i, y));
          if (row.every(t => t.terrain !== 'water' && !t.build && t.town === null && t.industry === null)) return { x, y };
        }
      });
      const land = await findLand();
      const start = await project(await page.evaluate(p => { const w = tileToWorld3d(p.x, p.y); return { x: w.x, z: w.z }; }, land));
      const end = await project(await page.evaluate(p => { const w = tileToWorld3d(p.x + 5, p.y); return { x: w.x, z: w.z }; }, land));
      const cameraBefore = await orbit();
      await gesture([start], [end]);
      const preview = await page.evaluate(() => ({ start: construction.start, end: construction.end, frozen: construction.frozen, length: construction.path.length }));
      assert.deepEqual(preview.start, land, 'Drag must start at the touched tile');
      assert.deepEqual(preview.end, { x: land.x + 5, y: land.y }, 'Drag must end at the released tile');
      assert.ok(preview.frozen && preview.length >= 6, 'Drawing must leave a preview to confirm');
      assert.deepEqual(await orbit(), cameraBefore, 'Drawing must not move the camera');
      assert.equal(await page.evaluate(() => getTile(construction.start.x, construction.start.y).build), null, 'Preview must not build');

      // Pinching with the rail tool keeps the finished preview (the second finger arrives before any drawing).
      await gesture([{ x: cx - 40, y: cy }, { x: cx + 40, y: cy }], [{ x: cx - 80, y: cy }, { x: cx + 80, y: cy }]);
      assert.deepEqual(await page.evaluate(() => ({ start: construction.start, end: construction.end, frozen: construction.frozen })), { start: preview.start, end: preview.end, frozen: true }, 'Pinch must keep the open preview');
      assert.ok((await orbit()).distance < cameraBefore.distance, 'Pinch with the rail tool must zoom');

      // A second finger during drawing aborts the drawing and turns into a camera gesture.
      await page.locator('#cancelBuild').click();
      await page.evaluate(() => fitCamera());
      await canvas.scrollIntoViewIfNeeded();
      await touch('touchStart', [start]);
      await touch('touchMove', [{ x: start.x + 30, y: start.y }]);
      assert.ok(await page.evaluate(() => construction.dragging), 'Drawing must start after moving');
      await touch('touchStart', [{ x: start.x + 30, y: start.y }, { x: start.x + 90, y: start.y }]);
      await touch('touchMove', [{ x: start.x + 10, y: start.y }, { x: start.x + 110, y: start.y }]);
      await touch('touchEnd', []);
      assert.equal(await page.evaluate(() => construction.start), null, 'Second finger must abort drawing');
      assert.equal(await page.evaluate(p => getTile(p.x, p.y).build, land), null);

      // Drawing with a finger shows a magnifier above the finger; it closes when the finger lifts.
      await page.evaluate(() => fitCamera());
      await canvas.scrollIntoViewIfNeeded();
      await touch('touchStart', [start]);
      await touch('touchMove', [{ x: start.x + 20, y: start.y }]);
      await touch('touchMove', [{ x: end.x, y: end.y }]);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const loupe = await page.locator('#buildLoupe').boundingBox();
      assert.ok(loupe && loupe.width >= 96, 'Magnifier must show while drawing');
      assert.ok(loupe.y + loupe.height <= end.y - 40 || loupe.x >= end.x + 40 || loupe.x + loupe.width <= end.x - 40, 'Magnifier must not sit under the finger');
      assert.ok(loupe.x >= box.x && loupe.x + loupe.width <= box.x + box.width && loupe.y >= box.y, 'Magnifier must stay inside the map');
      const shot = await page.screenshot({ clip: loupe }), { PNG } = require('pngjs'), png = PNG.sync.read(shot), buckets = new Set();
      for (let i = 0; i < png.data.length; i += 16) buckets.add(`${png.data[i] >> 4},${png.data[i + 1] >> 4},${png.data[i + 2] >> 4}`);
      assert.ok(buckets.size > 8, 'Magnifier must render the map');
      await page.screenshot({ path: `artifacts/touch-loupe-${viewport.width}.png` });
      await touch('touchEnd', []);
      assert.equal(await page.locator('#buildLoupe').isHidden(), true, 'Magnifier must close after lifting');
      assert.ok(await page.evaluate(() => construction.frozen), 'Lifting must leave the preview open');
      await page.locator('#cancelBuild').click();

      // Holding the drawing finger at the map edge scrolls the map and extends the preview.
      await page.evaluate(() => { fitCamera(); three.orbit.distance = 14; syncOrbitCamera(); });
      await canvas.scrollIntoViewIfNeeded();
      const edgeBox = await canvas.boundingBox(), mid = { x: edgeBox.x + edgeBox.width / 2, y: edgeBox.y + edgeBox.height / 2 }, edgePoint = { x: edgeBox.x + edgeBox.width - 6, y: mid.y };
      await touch('touchStart', [mid]);
      await touch('touchMove', [{ x: mid.x + 20, y: mid.y }]);
      await touch('touchMove', [edgePoint]);
      const edgeGround = await ground(edgePoint.x, edgePoint.y), endAtEdge = await page.evaluate(() => ({ ...construction.end }));
      await page.waitForFunction(e => construction.end.x !== e.x || construction.end.y !== e.y, endAtEdge, { timeout: 120000 });
      const scrolled = await project(edgeGround);
      assert.ok(scrolled.x < edgePoint.x - 2, `Map must scroll toward the edge (${JSON.stringify(scrolled)})`);
      await touch('touchEnd', []);
      const extended = await page.evaluate(() => ({ end: construction.end, frozen: construction.frozen }));
      assert.ok(extended.frozen, 'Edge-scrolled drawing must leave a preview');
      assert.equal(await page.evaluate(() => three.touchDraw), null);
      await page.locator('#cancelBuild').click();

      // Mouse drag with the rail tool still draws (unchanged desktop behaviour).
      await page.evaluate(() => fitCamera());
      await canvas.scrollIntoViewIfNeeded();
      const [mouseStart, mouseEnd] = [await project(await page.evaluate(p => tileToWorld3d(p.x, p.y), land)), await project(await page.evaluate(p => tileToWorld3d(p.x + 5, p.y), land))];
      await page.mouse.move(mouseStart.x, mouseStart.y); await page.mouse.down(); await page.mouse.move(mouseEnd.x, mouseEnd.y, { steps: 6 }); await page.mouse.up();
      assert.deepEqual(await page.evaluate(() => construction.end), { x: land.x + 5, y: land.y }, 'Mouse drawing must still work');
      await page.evaluate(() => cancelConstruction());

      await page.screenshot({ path: `artifacts/touch-${viewport.width}.png` });
      assert.deepEqual(errors, []);
      await cdp.detach();
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Touch gestures passed: one-finger pan with glide, tap select, pinch zoom, twist rotate, two-finger pan, draw vs. gesture with rail tool, magnifier, edge scrolling, preview kept while zooming, mouse unchanged.');
})().catch(error => { console.error(error); process.exitCode = 1; });
