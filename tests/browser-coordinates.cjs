const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function markerPixels(buffer){const p=PNG.sync.read(buffer);let n=0;for(let i=0;i<p.data.length;i+=4)if(p.data[i]>200&&p.data[i+1]>100&&p.data[i+1]<210&&p.data[i+2]<100)n++;assert.ok(n>10,'Coordinate marker did not render');return n;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of (process.argv.includes('--narrow')?[{width:320,height:780}]:[{width:1440,height:900},{width:390,height:844},{width:320,height:780}])){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   await page.evaluate(()=>{game.speed=0;expandWorld(128,96);render();});
   const before=await page.evaluate(()=>JSON.stringify(createSave().state)),canvas=page.locator('#threeViewport canvas');
   await page.locator('#openCoordinates').click();assert.equal(await page.locator('#coordinateX').getAttribute('max'),'127');assert.equal(await page.locator('#coordinateY').getAttribute('max'),'95');
   await page.locator('#coordinateX').fill('43');await page.locator('#coordinateY').fill('61');await page.locator('#jumpCoordinates').click();
   await page.waitForFunction(()=>three.coordinateMarker.visible&&mapCoordinates.target?.x===43&&mapCoordinates.target?.y===61);
   const hover=async(x,y)=>{
    await canvas.scrollIntoViewIfNeeded();const p=await page.evaluate(([x,y])=>{update3dCamera();const w=tileToWorld3d(x,y),p=new THREE.Vector3(w.x,0.04,w.z).project(three.camera),r=three.renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},[x,y]);
    await page.mouse.move(p.x,p.y);await page.waitForFunction(([x,y])=>game.hover?.x===x&&game.hover?.y===y,[x,y]);return p;
   };
   await hover(43,61);
   const position=await page.evaluate(()=>{const w=tileToWorld3d(43,61);return{error:Math.hypot(three.coordinateMarker.position.x-w.x,three.coordinateMarker.position.z-w.z),target:{...mapCoordinates.target}};});assert.ok(position.error<1e-8);
   const colored=markerPixels(await canvas.screenshot({path:`artifacts/coordinates-map-${viewport.width}.png`}));
   assert.equal(await page.locator('#mapCoordinates').count(),0,'Coordinate box was removed from the map');
   await page.locator('#openCoordinates').click();await page.locator('#coordinateX').fill('128');await page.locator('#coordinateY').fill('61');await page.locator('#jumpCoordinates').click();
   assert.ok(await page.locator('#coordinateDialog').isVisible());assert.equal(await page.evaluate(()=>mapCoordinates.target.x),43);
   await page.locator('#coordinateX').fill('26.5');assert.equal(await page.locator('#coordinateForm').evaluate(f=>f.checkValidity()),false);
   await page.locator('#coordinateX').fill('');assert.equal(await page.locator('#coordinateForm').evaluate(f=>f.checkValidity()),false);
   await page.locator('#coordinateX').fill('26');await page.locator('#coordinateY').fill('62');
   await page.screenshot({path:`artifacts/coordinates-dialog-${viewport.width}.png`,fullPage:true});
   await page.locator('#coordinateY').press('Enter');await page.waitForFunction(()=>mapCoordinates.target?.x===26&&mapCoordinates.target?.y===62);
   assert.equal(await page.evaluate(()=>JSON.stringify(createSave().state)),before,'Navigation changed the map, trains or economy');
   await hover(26,62);await page.getByRole('button',{name:'Schiene',exact:true}).click();
   await page.evaluate(()=>{beginConstruction(getTile(26,62),'rail');previewConstruction(getTile(27,62));finishConstruction();});assert.ok(await page.locator('#buildPreview').isVisible());
   await page.locator('#openCoordinates').click();await page.locator('#coordinateX').press('Escape');
   assert.ok(await page.locator('#coordinateDialog').isHidden());assert.ok(await page.locator('#buildPreview').isVisible(),'Closing coordinate dialog discarded the pending draft');
   await page.locator('#openCoordinates').click();await page.locator('#coordinateX').fill('127');await page.locator('#coordinateY').fill('95');await page.locator('#jumpCoordinates').click();
   await page.waitForFunction(()=>mapCoordinates.target?.x===127&&mapCoordinates.target?.y===95);assert.ok(await page.locator('#buildPreview').isHidden());
   assert.equal(await page.evaluate(()=>JSON.stringify(createSave().state)),before,'Jump confirmed a pending build');
   await page.evaluate(()=>saveGame(true));const orbit=await page.evaluate(()=>({...three.orbit}));await page.reload();await page.waitForFunction(()=>three.ready&&config.width===128);
   assert.deepEqual(await page.evaluate(()=>({...three.orbit})),orbit);assert.equal(await page.evaluate(()=>mapCoordinates.target),null);
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).slice(0,20).map(el=>({tag:el.tagName,id:el.id,cls:el.className,right:el.getBoundingClientRect().right}))}));
   assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));assert.equal(errors.length,0,errors.join('\n'));
   console.log(JSON.stringify({viewport,position,markerPixels:colored,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
