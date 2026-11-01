const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function colors(buffer){const p=PNG.sync.read(buffer),s=new Set();for(let i=0;i<p.data.length;i+=32)s.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(s.size>30,'Model render is empty');return s.size;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready&&modelLibrary.geometries.size>0);
   await page.evaluate(()=>{
    game.speed=0;game.landscape=null;game.towns=[];game.industries=[];
    for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,town:null,industry:null,station:null,signal:null,shore:false});delete t.links;}
    addTown('Modellstadt',9,9,100);
    for(let y=7;y<=11;y++)for(let x=7;x<=11;x++)if((x+y)%2===0){const t=getTile(x,y);t.build='house';t.terrain='town';t.town=0;}
    for(let y=14;y<19;y++)for(let x=4;x<10;x++)getTile(x,y).terrain='forest';
    addIndustry('Farm',19,8,'grain',[],80);addIndustry('Fabrik',21,17,'goods',['coal','grain'],80);addIndustry('Mine',27,11,'coal',[],80);
    for(let x=3;x<=30;x++)getTile(x,22).build='rail';
    game.stations=[3,30].map((x,id)=>({id,x,y:22,name:'Asset '+id,kind:'rail',produces:['passengers','goods','coal','grain'],accepts:['passengers','goods','coal','grain'],waiting:{passengers:80,goods:80,coal:80,grain:80},delivered:0}));
    game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));mark3dDirty();
    selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'passengers',wagons:4});
    Object.assign(game.vehicles[0],{servicePhase:null,stationWait:0,loadingAtOrigin:false,index:10,progress:0,load:40,velocity:1.64,cargoOrigin:0});
    render();
   });
   const canvas=page.locator('#threeViewport canvas');await canvas.scrollIntoViewIfNeeded();
   const focus=async(x,y,distance)=>page.evaluate(([x,y,d])=>{const p=tileToWorld3d(x,y);three.orbit.targetX=p.x;three.orbit.targetZ=p.z;three.orbit.distance=d;render();},[x,y,distance]);
   const scenes=[];
   for(const [label,x,y,d] of [['town',9,9,10],['forest',7,16,10],['farm',19,8,9],['factory',21,17,9],['mine',27,11,9]]){
    await focus(x,y,d);scenes.push({label,colors:colors(await canvas.screenshot({path:`artifacts/assets-${label}-${viewport.width}.png`}))});
   }
   const counts=await page.evaluate(()=>{
    const batches=three.staticGroup.children.filter(o=>o.isInstancedMesh&&o.userData.assetId);
    return {houseTypes:batches.filter(o=>o.userData.residentialCount>0).length,renderedHomes:batches.reduce((n,o)=>n+o.userData.residentialCount,0),homes:game.map.flat().filter(t=>t.build==='house').length,trees:batches.filter(o=>o.userData.assetCategory==='tree').length};
   });
   assert.ok(counts.houseTypes>=3&&counts.trees>=3);assert.equal(counts.renderedHomes,counts.homes);
   const cargo=[];
   for(const kind of ['passengers','coal','grain','goods']){
    const loaded=await page.evaluate(kind=>{
     const v=game.vehicles[0];invalidateVehicleMesh(v);v.cargo=kind;v.load=30;render();
     const cars=three.vehicleMeshes.get(v.id).userData.cars;
     return {kind,engine:cars[0].userData.assetId,wagon:cars[1].userData.assetId,loads:cars.slice(1).filter(c=>c.userData.loadMesh.visible).length};
    },kind);assert.equal(loaded.engine,'locomotive');assert.equal(loaded.loads,2);cargo.push(loaded);
    const center=await page.evaluate(()=>{const v=game.vehicles[0];return sampleVehiclePath(v,(vehicleCarCount(v)-1)*0.29).tile;});
    await focus(center.x,center.y,9);colors(await canvas.screenshot({path:`artifacts/assets-train-${kind}-${viewport.width}.png`}));
   }
   await page.evaluate(()=>{const v=game.vehicles[0];v.load=0;render();});
   assert.equal(await page.evaluate(()=>three.vehicleMeshes.get(game.vehicles[0].id).userData.cars.filter(c=>c.userData.loadMesh.visible).length),0);
   const movement=await page.evaluate(()=>{
    const v=game.vehicles[0],a=sampleVehiclePath(v,0).tile;updateVehicles(0.7);render();const b=sampleVehiclePath(v,0).tile;
    const memory=three.renderer.info.memory.geometries;for(let i=0;i<8;i++){mark3dDirty();render();}
    return {moved:Math.hypot(a.x-b.x,a.y-b.y),memory,after:three.renderer.info.memory.geometries,cached:modelLibrary.geometries.size};
   });assert.ok(movement.moved>0.2);assert.ok(movement.after<=movement.memory,'Shared model geometry leaked during rebuild');
   await page.evaluate(()=>{
    const v=game.vehicles[0];invalidateVehicleMesh(v);
    const path=Array.from({length:28},(_,i)=>({x:i+3,y:20}));path.forEach(p=>getTile(p.x,p.y).build='road');
    for(const [id,x] of [[2,3],[3,30]]){game.stations.push({id,x,y:20,name:'Road '+id,kind:'road',produces:['goods'],accepts:['goods'],waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0});Object.assign(getTile(x,20),{build:'stationRoad',station:id});}
    Object.assign(v,{type:'truck',path,from:2,to:3,index:10,progress:0,dir:1,capacity:28,carCount:2,load:20,cargo:'goods',cargoOrigin:2,speed:0.58,velocity:0,servicePhase:null,stationWait:0,loadingAtOrigin:false,pathReservation:null});
    mark3dDirty();updateVehicles(0.5);render();
   });
   assert.equal(await page.evaluate(()=>three.vehicleMeshes.get(game.vehicles[0].id).userData.cars[0].userData.assetId),'truck');
   const center=await page.evaluate(()=>{const v=game.vehicles[0];return sampleVehiclePath(v,0.29).tile;});
   await focus(center.x,center.y,8);colors(await canvas.screenshot({path:`artifacts/assets-truck-${viewport.width}.png`}));
   assert.equal(errors.length,0,errors.join('\n'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(JSON.stringify({viewport,scenes,counts,cargo,movement,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
