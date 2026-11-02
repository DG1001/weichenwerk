// Captures README screenshots and the frames of a short animation into docs/media/.
// Development only: needs `playwright` in node_modules; the GIF additionally needs ffmpeg.
// It builds a small demo layout with the game's own functions on a generated world:
// a passenger line between two towns with a passing loop and two trains, plus a coal line.
//   node scripts/capture-media.cjs            screenshots
//   node scripts/capture-media.cjs --gif      screenshots and docs/media/demo.gif
const { chromium } = require('playwright');
const { mkdirSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { resolve, join } = require('node:path');
const { pathToFileURL } = require('node:url');

const out = resolve(__dirname, '../docs/media');
const seed = process.env.SEED || 'Weichenwerk-7';

// Runs inside the page. Returns a summary of what could be built.
function buildDemo(seed) {
  const settings = createLandscapeSettings(seed, 'mixed', 64, 48);
  startNewWorld(64, 48, settings);
  game.cash = 2000000; game.speed = 0;
  const free = t => t && !t.build && t.terrain !== 'water' && t.town === null && t.industry === null && !t.bridge;
  const near = (cx, cy, r) => { for (let d = 1; d <= r; d++) for (let y = cy - d; y <= cy + d; y++) for (let x = cx - d; x <= cx + d; x++) { const t = getTile(x, y); if (free(t)) return t; } return null; };
  const station = (tile, kind = 'rail') => { ui.stationKind.value = kind; buildStation(tile); return game.stations.find(s => s.x === tile.x && s.y === tile.y); };
  const route = (a, b, mode = 'avoid') => {
    document.getElementById('routeMode').value = mode;
    beginConstruction(getTile(a.x, a.y), 'rail'); previewConstruction(getTile(b.x, b.y)); finishConstruction();
    const path = [...construction.path], ok = !construction.error && confirmConstruction();
    if (!ok) cancelConstruction();
    return ok ? path : null;
  };
  const summary = {};
  // Passenger line between the two towns that are furthest apart horizontally.
  const towns = [...game.towns].sort((a, b) => a.x - b.x);
  const [ta, tb] = [towns[0], towns.at(-1)];
  // Stations must be within two tiles of a town or industry to get cargo.
  const sa = station(near(ta.x, ta.y, 2)), sb = station(near(tb.x, tb.y, 2));
  const line = sa && sb && route(sa, sb);
  summary.line = Boolean(line);
  // Passing loop on the longest straight stretch of the line.
  if (line) {
    let best = null;
    for (let i = 1; i < line.length - 1; i++) {
      let j = i; const axis = line[i + 1]?.y === line[i].y ? 'x' : 'y';
      while (j + 1 < line.length - 1 && line[j + 1][axis === 'x' ? 'y' : 'x'] === line[i][axis === 'x' ? 'y' : 'x']) j++;
      if (!best || j - i > best[1] - best[0]) best = [i, j];
    }
    summary.straight = best[1] - best[0];
    for (let len = Math.min(10, best[1] - best[0] - 1); len >= 5 && !summary.loop; len--) {
      const mid = Math.floor((best[0] + best[1]) / 2), a = line[mid - Math.floor(len / 2)], b = line[mid - Math.floor(len / 2) + len];
      summary.loop = Boolean(route(a, b, 'loop'));
      if (summary.loop) summary.focus = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    }
    selectStation(sa); buyVehicle('train', { wagons: 3, target: String(sb.id) });
    selectStation(sb); buyVehicle('train', { wagons: 3, target: String(sa.id) });
  }
  // Coal line from a mine to the factory, if both exist.
  const mine = game.industries.find(i => i.produces?.includes('coal')), factory = game.industries.find(i => i.accepts?.includes('coal'));
  if (mine && factory) {
    const sm = station(near(mine.x, mine.y, 2)), sf = station(near(factory.x, factory.y, 2));
    if (sm && sf && route(sm, sf)) { selectStation(sm); buyVehicle('train', { wagons: 4, cargo: 'coal', target: String(sf.id) }); summary.coal = true; }
  }
  document.getElementById('routeMode').value = 'avoid';
  summary.trains = game.vehicles.length;
  // Let traffic develop, then wait until a passenger train is near the passing loop.
  const center = summary.focus || (sa && sb ? { x: Math.round((sa.x + sb.x) / 2), y: Math.round((sa.y + sb.y) / 2) } : { x: 32, y: 24 });
  const nearLoop = () => game.vehicles.some(v => v.cargo === 'passengers' && (p => p && Math.abs(p.x - center.x) + Math.abs(p.y - center.y) <= 3)(v.path[Math.round(trainPosition(v))]));
  for (let i = 0; i < 1600 || (i < 6000 && !nearLoop()); i++) updateVehicles(0.05);
  game.cash = 184350; game.month = 7; game.dayProgress = 13;
  const focus = tileToWorld3d(center.x, center.y);
  Object.assign(three.orbit, { targetX: focus.x, targetZ: focus.z, yaw: -0.55, pitch: 0.78, distance: 24 });
  if (game.vehicles[0]) selectVehicle(game.vehicles[0]);
  mark3dDirty(); render();
  return summary;
}

(async () => {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  const url = pathToFileURL(resolve(__dirname, '../index.html')).href;
  const open = async (viewport, phone) => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
    page.setDefaultTimeout(600000); // software WebGL without a GPU can take many seconds per frame
    await page.addInitScript(() => { window.confirm = () => true; try { localStorage.clear(); } catch {} });
    await page.goto(url);
    await page.waitForFunction(() => three.ready, null, { timeout: 120000 });
    return page;
  };
  try {
    // The help page first: after several software-rendered 3D pages the browser can fail to capture.
    const help = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    help.setDefaultTimeout(600000);
    await help.goto(pathToFileURL(resolve(__dirname, '../help.html')).href + '#pfadsignale');
    await help.screenshot({ path: join(out, 'help.png') });
    await help.close();
    const desktop = await open({ width: 1440, height: 900 }, false);
    const summary = await desktop.evaluate(buildDemo, seed);
    console.log('Demo:', JSON.stringify(summary));
    await desktop.evaluate(() => render());
    await desktop.screenshot({ path: join(out, 'desktop.png') });
    // Close-up of the passing loop area for the README.
    await desktop.evaluate(() => { three.orbit.distance = 11; three.orbit.pitch = 0.58; render(); });
    await desktop.locator('#threeViewport canvas').screenshot({ path: join(out, 'closeup.png') });

    for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['phone-landscape', { width: 844, height: 390 }]]) {
      const page = await open(viewport, true);
      await page.evaluate(buildDemo, seed);
      await page.evaluate(() => { three.orbit.distance = innerWidth < innerHeight ? 30 : 20; render(); });
      await page.screenshot({ path: join(out, `${name}.png`) });
      await page.close();
    }

    if (process.argv.includes('--gif')) {
      const frames = join(out, 'frames');
      rmSync(frames, { recursive: true, force: true }); mkdirSync(frames);
      await desktop.setViewportSize({ width: 960, height: 540 });
      await desktop.evaluate(() => { game.selected = null; three.orbit.distance = 15; three.orbit.pitch = 0.66; render(); });
      const canvas = desktop.locator('#threeViewport canvas');
      // One second of game time per frame, so trains visibly travel and cross in the loop (time-lapse).
      for (let i = 0; i < 60; i++) {
        await desktop.evaluate(() => { for (let k = 0; k < 20; k++) updateVehicles(1 / 20); three.orbit.yaw += 0.006; render(); });
        await canvas.screenshot({ path: join(frames, `f${String(i).padStart(3, '0')}.png`) });
      }
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '8', '-i', join(frames, 'f%03d.png'),
        '-vf', 'scale=600:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
        join(out, 'demo.gif')]);
      rmSync(frames, { recursive: true, force: true });
    }
  } finally {
    await browser.close();
  }
  console.log('Media written to docs/media/.');
})();
