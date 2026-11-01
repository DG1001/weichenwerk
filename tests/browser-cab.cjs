const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function pixels(buffer){const p=PNG.sync.read(buffer),colors=new Set();let ground=0,sky=0;for(let i=0;i<p.data.length;i+=16){const r=p.data[i],g=p.data[i+1],b=p.data[i+2];colors.add([r>>4,g>>4,b>>4].join());if(g>r*1.1&&g>b*1.05)ground++;if(b>r*1.05&&b>g&&g>140)sky++;}assert.ok(colors.size>25&&ground>100&&sky>100,JSON.stringify({colors:colors.size,ground,sky}));return{colors:colors.size,ground,sky};}
(async()=>{
 mkdirSync('artifacts',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:780}]){
   const page=await browser.newPage({viewport,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   await page.evaluate(()=>{
    game.speed=0;game.towns=[];game.industries=[];game.vehicles=[];game.stations=[];
    for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,town:null,industry:null,signal:null});delete t.links;delete t.bridge;}
    const path=[];for(let x=3;x<=24;x++)path.push({x,y:12});for(let y=13;y<=20;y++)path.push({x:24,y});for(let x=25;x<=29;x++)path.push({x,y:20});
    for(const p of path)getTile(p.x,p.y).build='rail';
    for(let x=11;x<=17;x++)Object.assign(getTile(x,12),{bridge:{axis:'x',start:11,end:17},links:3,terrain:x===11||x===17?'grass':'water'});
    for(let x=3;x<=29;x++)getTile(x,23).build='road';
    game.stations=[{x:3,y:12,kind:'rail'},{x:29,y:20,kind:'rail'},{x:3,y:23,kind:'road'},{x:29,y:23,kind:'road'}].map((s,id)=>({...s,id,name:['Westhafen','Oststadt','Norddepot','Sueddepot'][id],produces:['goods'],accepts:['goods'],waiting:{goods:80,passengers:0,coal:0,grain:0},delivered:0}));
    game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{station:s.id,build:s.kind==='rail'?'stationRail':'stationRoad'}));
    // Scenery gives the low camera real foreground and distance references.
    for(let x=7;x<=27;x+=3){getTile(x,10).terrain='forest';getTile(x,14).terrain='forest';}
    mark3dDirty();selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'goods',wagons:2});selectStation(game.stations[2]);buyVehicle('truck',{target:'3',cargo:'goods'});
    const v=game.vehicles[0];Object.assign(v,{index:4,progress:0.2,velocity:1.2,servicePhase:null,stationWait:0,stationServiced:false,loadingAtOrigin:false});selectVehicle(v);fitCamera();refreshManagement(true);render();
   });
   const before=await page.evaluate(()=>JSON.stringify(createSave().state)),orbit=await page.evaluate(()=>({...three.orbit}));
   await page.locator('#enterCab').click();await page.waitForFunction(()=>!!three.cab.vehicle);await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
   assert.ok(await page.locator('#cabView').isVisible());assert.equal(await page.locator('#enterCab').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>three.vehicleMeshes.get(0).userData.cars[0].visible),false);
   assert.equal(await page.evaluate(()=>JSON.stringify(createSave().state)),before);assert.equal(await page.locator('#cabVehicleName').textContent(),'Zug 1');
   const canvas=page.locator('#threeViewport canvas'),shot=await canvas.screenshot({path:`artifacts/cab-train-${viewport.width}.png`}),visual=pixels(shot);
   await page.screenshot({path:`artifacts/cab-layout-${viewport.width}.png`,fullPage:true});
   const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2+20,{steps:8});await page.mouse.up();
   assert.ok(await page.evaluate(()=>Math.abs(three.cab.yaw)>0.1));assert.equal(await page.evaluate(()=>construction.start),null);assert.equal(await page.evaluate(()=>JSON.stringify(createSave().state)),before,'Cab drag built or changed the map');
   if(viewport.width===390){
    const touch=await page.context().newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
    await page.locator('#resetCabLook').click();
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=6;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*7,y:y+i*2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(await page.evaluate(()=>Math.abs(three.cab.yaw)>0.1),'Touch drag did not turn the view');await touch.detach();
   }
   await page.locator('#resetCabLook').click();await page.waitForFunction(()=>three.cab.yaw===0&&three.cab.pitch===0);
   const moving=await page.evaluate(()=>{const v=game.vehicles[0],p=three.camera.position.clone();updateVehicles(1);render();return{moved:three.camera.position.distanceTo(p),height:three.camera.position.y};});assert.ok(moving.moved>0.5);
   const bridges=await page.evaluate(()=>{const v=game.vehicles[0];v.index=10;v.progress=0.4;render();return{y:three.camera.position.y,dir:three.camera.getWorldDirection(new THREE.Vector3()).toArray()};});assert.ok(bridges.y>0.8);
   await canvas.screenshot({path:`artifacts/cab-bridge-${viewport.width}.png`});
   const curve=await page.evaluate(()=>{const v=game.vehicles[0];v.index=20;v.progress=0.4;render();const a=three.camera.quaternion.clone();v.progress=0.9;render();return{angle:a.angleTo(three.camera.quaternion),finite:three.camera.position.toArray().every(Number.isFinite)};});assert.ok(curve.angle>0.1&&curve.finite,JSON.stringify(curve));
   await page.locator('#exitCab').click();assert.equal(await page.evaluate(()=>three.cab.vehicle),null);assert.deepEqual(await page.evaluate(()=>({...three.orbit})),orbit);await page.waitForFunction(()=>three.vehicleMeshes.get(0).userData.cars[0].visible);assert.equal(await page.evaluate(()=>three.camera.fov),45);
   await page.evaluate(()=>{selectVehicle(game.vehicles[1]);refreshManagement(true);});await page.locator('#enterCab').click();await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>three.cab.vehicle?.type==='truck');
   assert.equal(await page.locator('#cabVehicleName').textContent(),'Lkw 2');pixels(await canvas.screenshot({path:`artifacts/cab-truck-${viewport.width}.png`}));
   const switched=await page.evaluate(()=>{selectVehicle(game.vehicles[0]);render();return three.cab.vehicle.id;});assert.equal(switched,0);
   await page.keyboard.press('Escape');await page.waitForFunction(()=>three.cab.vehicle===null);assert.ok(await page.locator('#cabView').isHidden());
   await page.locator('#enterCab').click();await page.evaluate(()=>{recoverVehicle(game.vehicles[0]);refreshManagement(true);render();});assert.equal(await page.evaluate(()=>three.cab.vehicle),null);assert.ok(await page.locator('#enterCab').isDisabled());
   await page.evaluate(()=>{selectVehicle(game.vehicles[1]);enterCabView();saveGame(true);});await page.reload();await page.waitForFunction(()=>three.ready&&game.vehicles.length===2);assert.equal(await page.evaluate(()=>three.cab.vehicle),null);assert.deepEqual(await page.evaluate(()=>({...three.orbit})),orbit);
   assert.equal(errors.length,0,errors.join('\n'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(JSON.stringify({viewport,visual,moving,bridges,curve,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
