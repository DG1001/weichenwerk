const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[],network=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
   await page.route(/^https?:\/\//,r=>r.abort());
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   assert.equal(await page.locator('#gameCanvas, [data-view]').count(),0);
   assert.ok(await page.locator('#rendererStatus').isHidden());
   assert.equal(await page.evaluate(()=>THREE.REVISION),'164');assert.equal(network.length,0);
   const orbit=await page.evaluate(()=>({...three.orbit}));await page.locator('#zoomIn').click();
   assert.ok(await page.evaluate(()=>three.orbit.distance)<orbit.distance);
   await page.locator('#fitCamera').click();await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
   await page.screenshot({path:`artifacts/3d-only-${viewport.width}.png`,fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args);};
  });
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await page.waitForFunction(()=>document.querySelector('#rendererMessage').textContent.includes('WebGL'));
  assert.ok(await page.locator('#rendererStatus').isVisible());assert.ok(await page.locator('#retryRenderer').isVisible());
  assert.ok(await page.locator('.camera-tools').isHidden());
  assert.ok(await page.locator('#mapCoordinates').isHidden());
  assert.equal(await page.locator('#gameCanvas, #threeViewport canvas').count(),0);
  const day=await page.evaluate(()=>game.dayProgress);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>game.dayProgress),day,'Invisible simulation kept advancing');
  await page.locator('#rendererStatus').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/3d-unavailable-390.png',fullPage:true});
  await page.locator('#saveGame').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(saveKey)).view),'3d');
  assert.equal(errors.length,0,errors.join('\n'));await page.close();
  console.log('3D-only startup passed: local/offline WebGL, no 2D UI/canvas, zoom/fit, desktop/mobile, persistent WebGL error, paused hidden simulation and save access.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
