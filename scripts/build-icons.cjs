// Renders the app icons (src/assets/icons/app-*.png) from an inline SVG with Playwright.
// Development only; needs `playwright` in node_modules. The icon is full-bleed with the mark inside
// the maskable safe zone, so the same image serves as "any" and "maskable".
const { chromium } = require('playwright');
const { resolve } = require('node:path');

const svg = size => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#245846"/>
  <g stroke="#d9c7a3" stroke-width="2.4" stroke-linecap="round"><line x1="24" y1="70" x2="76" y2="70"/><line x1="24" y1="78" x2="76" y2="78"/></g>
  <g stroke="#8c7559" stroke-width="2"><line x1="30" y1="66" x2="30" y2="82"/><line x1="40" y1="66" x2="40" y2="82"/><line x1="50" y1="66" x2="50" y2="82"/><line x1="60" y1="66" x2="60" y2="82"/><line x1="70" y1="66" x2="70" y2="82"/></g>
  <text x="50" y="57" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="34" fill="#ffffff">LT</text>
</svg>`;

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined) });
  try {
    for (const size of [192, 512]) {
      const page = await browser.newPage({ viewport: { width: size, height: size } });
      await page.setContent(`<style>html,body{margin:0}</style>${svg(size)}`);
      await page.screenshot({ path: resolve(__dirname, `../src/assets/icons/app-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } });
      await page.close();
    }
  } finally { await browser.close(); }
  console.log('Built src/assets/icons/app-192.png and app-512.png.');
})();
