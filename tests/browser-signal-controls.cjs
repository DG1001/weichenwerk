const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function pixels(buffer){const p=PNG.sync.read(buffer),s=new Set();for(let i=0;i<p.data.length;i+=32)s.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(s.size>25,'Empty signal preview');return s.size;}
function arrowPixels(buffer){const p=PNG.sync.read(buffer);let count=0;for(let i=0;i<p.data.length;i+=4)if(p.data[i]>220&&p.data[i+1]>150&&p.data[i+1]<220&&p.data[i+2]<100)count++;assert.ok(count>15,'Direction arrow is hidden by the tile overlay');return count;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   await page.evaluate(()=>{
    game.speed=0;game.towns=[];game.industries=[];game.stations=[];game.vehicles=[];
    for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});delete t.links;delete t.bridge;}
    for(let x=4;x<=24;x++)getTile(x,11).build='rail';for(let y=3;y<=21;y++)getTile(27,y).build='rail';
    for(const [x,y] of [[10,18],[11,18],[10,19]])getTile(x,y).build='rail';mark3dDirty();render();
   });
   assert.equal(await page.locator('#signalDirection, #signalOneWay').count(),0);
   assert.ok(await page.locator('#signalBothDirections').isChecked());assert.ok(await page.locator('#flipSignal').isDisabled());
   assert.ok(await page.locator('#flipSignal img').evaluate(img=>img.complete&&img.naturalWidth>0),'Local flip icon failed to load');
   await page.getByRole('button',{name:'Signal',exact:true}).click();await page.locator('#signalType').selectOption('path');
   const canvas=page.locator('#threeViewport canvas');
   const point=async(x,y)=>{
    await canvas.scrollIntoViewIfNeeded();
    return page.evaluate(([x,y])=>{const w=tileToWorld3d(x,y);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:10});render();const p=new THREE.Vector3(w.x,0.04,w.z).project(three.camera),r=three.renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},[x,y]);
   };
   const preview=()=>page.evaluate(()=>{const a=construction.overlay?.children.find(o=>o.userData.signalArrow);return a?{...a.userData,children:a.children.length,yaw:a.rotation.y}:null;});
   let p=await point(8,11);await page.mouse.move(p.x,p.y);await page.waitForFunction(()=>construction.overlay?.children.some(o=>o.userData.signalArrow));
   assert.equal(await page.evaluate(()=>construction.start),null);assert.equal((await preview()).children,4);assert.equal((await preview()).oneWay,false);
   await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>construction.action==='signal');
   const cash=await page.evaluate(()=>game.cash);await page.locator('#signalBothDirections').uncheck();await page.getByRole('button',{name:'Richtung umkehren',exact:true}).click();
   assert.equal(await page.evaluate(()=>construction.settings.direction),'west');assert.equal(await page.evaluate(()=>getTile(8,11).signal),null);
   await canvas.scrollIntoViewIfNeeded();await page.evaluate(()=>{three.orbit.yaw+=0.8;render();});
   const arrow=await preview();assert.equal(arrow.direction,'west');assert.equal(arrow.children,2);assert.ok(Math.abs(arrow.yaw+Math.PI/2)<1e-8);
   const shot=await canvas.screenshot({path:`artifacts/signal-arrow-${viewport.width}.png`}),buckets=pixels(shot),gold=arrowPixels(shot);
   await page.locator('#confirmBuild').click();assert.equal(await page.evaluate(()=>game.cash),cash-300);
   assert.deepEqual(await page.evaluate(()=>({...getTile(8,11).signal})),{direction:'west',oneWay:true,type:'path'});
   await page.locator('#signalType').selectOption('block');await page.locator('#signalBothDirections').check();
   p=await point(8,11);await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>construction.action==='signal');
   assert.equal(await page.locator('#signalType').inputValue(),'path');assert.equal(await page.locator('#signalBothDirections').isChecked(),false);
   assert.equal(await page.evaluate(()=>construction.settings.direction),'west');await page.locator('#cancelBuild').click();
   p=await point(27,8);await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>construction.action==='signal');
   assert.equal(await page.evaluate(()=>construction.settings.direction),'north');await page.locator('#flipSignal').click();assert.equal(await page.evaluate(()=>construction.settings.direction),'south');
   await page.locator('#signalBothDirections').check();assert.ok(await page.locator('#flipSignal').isDisabled());await page.locator('#confirmBuild').click();
   assert.deepEqual(await page.evaluate(()=>({...getTile(27,8).signal})),{direction:'south',oneWay:false,type:'path'});
   await page.evaluate(()=>{render();saveGame(true);});assert.equal(await page.evaluate(()=>traffic.lamps.length),3);
   await page.reload();await page.waitForFunction(()=>three.ready&&getTile(8,11).signal?.direction==='west');
   assert.equal(await page.evaluate(()=>getTile(27,8).signal.oneWay),false);
   await page.getByRole('button',{name:'Signal',exact:true}).click();p=await point(10,18);await page.mouse.click(p.x,p.y);
   assert.ok(await page.locator('#confirmBuild').isDisabled());assert.ok(await page.evaluate(()=>construction.error));await page.locator('#cancelBuild').click();
   p=await point(8,11);await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>construction.action==='signal');await page.locator('#cancelBuild').click();
   const memory=await page.evaluate(()=>{game.hover=null;render();const before=three.renderer.info.memory.geometries;for(let i=0;i<30;i++){game.hover=getTile(8+i%2,11);render();}return{before,after:three.renderer.info.memory.geometries};});
   assert.ok(memory.after<=memory.before+6,'Hover previews leaked geometry');
   await page.locator('#signalType').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/signal-controls-${viewport.width}.png`,fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
   console.log(JSON.stringify({viewport,arrow,gold,colors:buckets,memory,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
