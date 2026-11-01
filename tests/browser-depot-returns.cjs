const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 mkdirSync('artifacts',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   const cash=await page.evaluate(()=>{
    game.speed=0;game.towns=[];game.industries=[];game.vehicles=[];game.stations=[];
    for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,town:null,industry:null,signal:null});delete t.links;delete t.bridge;}
    for(let x=3;x<=30;x++)getTile(x,20).build='rail';
    game.stations=[3,30].map((x,id)=>({id,x,y:20,name:'Depot '+id,kind:'rail',produces:['goods'],accepts:id?['goods']:['coal'],waiting:{goods:id?0:420,passengers:0,coal:0,grain:0},delivered:0}));
    game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));mark3dDirty();
    selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'goods',wagons:4});const v=game.vehicles[0];v.load=80;v.cargoOrigin=0;recoverVehicle(v);selectVehicle(v);refreshManagement(true);render();return game.cash;
   });
   assert.equal(await page.locator('#unloadVehicle').textContent(),'Fracht zurueckgeben');await page.locator('#unloadVehicle').click();
   assert.equal(await page.evaluate(()=>game.vehicles[0].load),0);assert.equal(await page.evaluate(()=>game.stations[0].waiting.goods),420);assert.equal(await page.evaluate(()=>game.stations[0].returnedCargo.goods),80);assert.equal(await page.evaluate(()=>game.cash),cash);
   await page.locator('#orderWagons').fill('1');await page.getByRole('button',{name:'Auftrag uebernehmen',exact:true}).click();
   assert.equal(await page.evaluate(()=>game.vehicles[0].capacity),20);await page.evaluate(()=>{selectStation(game.stations[0]);saveGame(true);});
   assert.match(await page.locator('#selectionText').textContent(),/500 Waren.*80 Rueckgabe/);
   await page.screenshot({path:`artifacts/depot-return-${viewport.width}.png`,fullPage:true});
   await page.reload();await page.waitForFunction(()=>three.ready&&game.vehicles.length===1);assert.equal(await page.evaluate(()=>game.stations[0].returnedCargo.goods),80);
   await page.evaluate(()=>{selectVehicle(game.vehicles[0]);refreshManagement(true);});await page.locator('#toggleVehicle').click();
   await page.evaluate(()=>{updateVehicles(10);render();});assert.equal(await page.evaluate(()=>game.vehicles[0].load),20);assert.equal(await page.evaluate(()=>game.stations[0].returnedCargo.goods),60);assert.equal(await page.evaluate(()=>game.cash),cash);
   assert.equal(errors.length,0,errors.join('\n'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log(JSON.stringify({viewport,cash,returned:60,aboard:20,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
