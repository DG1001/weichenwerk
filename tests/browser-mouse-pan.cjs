const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

// Touchpads have no middle button: a left drag pans the map (with rail/road only together with Shift),
// a plain left click still selects or starts building, and the drag does not also count as a click.
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(pathToFileURL(resolve('index.html')).href);
    await page.waitForFunction(() => three.ready, null, { timeout: 60000 });
    await page.evaluate(() => { game.speed = 0; });
    const box = await page.locator('#threeViewport canvas').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const target = () => page.evaluate(() => ({ x: three.orbit.targetX, z: three.orbit.targetZ }));
    const drag = async (dx, dy, shift = false) => {
      if (shift) await page.keyboard.down('Shift');
      await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx, cy + dy, { steps: 6 }); await page.mouse.up();
      if (shift) await page.keyboard.up('Shift');
      await page.waitForTimeout(50);
    };
    const moved = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    // Info tool: drag pans and does not select; a click selects.
    await page.locator('[data-tool="inspect"]').click();
    await page.evaluate(() => { game.selected = null; });
    let before = await target();
    await drag(160, 90);
    assert.ok(moved(before, await target()) > 1, 'Left drag pans with the info tool');
    assert.equal(await page.evaluate(() => game.selected), null, 'A drag is not a click');
    before = await target();
    await page.mouse.click(cx, cy); await page.waitForTimeout(50);
    assert.equal(moved(before, await target()), 0, 'A click does not pan');
    assert.ok(await page.evaluate(() => Boolean(game.selected)), 'A click still selects');

    // Rail tool: plain drag draws a route preview without panning, Shift+drag pans without drawing.
    await page.locator('[data-tool="rail"]').click();
    before = await target();
    await drag(-200, 0, true);
    assert.ok(moved(before, await target()) > 1, 'Shift+drag pans with the rail tool');
    assert.equal(await page.evaluate(() => construction.start), null, 'Shift+drag does not draw');
    before = await target();
    await drag(200, 0);
    assert.equal(moved(before, await target()), 0, 'Plain drag with the rail tool does not pan');
    const drawn = await page.evaluate(() => ({ start: construction.start, end: construction.end, kind: construction.kind }));
    assert.ok(drawn.start && drawn.kind === 'rail' && (drawn.start.x !== drawn.end.x || drawn.start.y !== drawn.end.y), `Plain drag still draws: ${JSON.stringify(drawn)}`);
    await page.evaluate(() => cancelConstruction());
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
  console.log('Mouse/touchpad pan passed: left drag pans with info tool, click still selects, Shift+drag pans with rail tool, plain drag still draws.');
})().catch(error => { console.error(error); process.exitCode = 1; });
