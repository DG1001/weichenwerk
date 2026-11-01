const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function colors(buffer){const p=PNG.sync.read(buffer),s=new Set();for(let i=0;i<p.data.length;i+=32)s.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(s.size>30,'Empty curve render');return s.size;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   const result=await page.evaluate(()=>{
    game.speed=0;game.towns=[];game.industries=[];game.stations=[];game.vehicles=[];game.landscape=null;
    for(const tile of game.map.flat()){Object.assign(tile,{terrain:'grass',build:null,signal:null,station:null});delete tile.links;}
    const routes=[];
    for(const [kind,y] of [['rail',8],['road',16]]) {
     const route=[...Array.from({length:8},(_,i)=>({x:5+i,y})),...Array.from({length:5},(_,i)=>({x:12,y:y+1+i})),...Array.from({length:6},(_,i)=>({x:13+i,y:y+5}))];
     for(const p of route)getTile(p.x,p.y).build=kind;
     const from=game.stations.length,to=from+1;
     for(const [id,p] of [[from,route[0]],[to,route.at(-1)]]) {
      game.stations.push({id,...p,name:'Kurve '+id,kind,produces:['goods'],accepts:['goods'],waiting:{goods:80,passengers:0,coal:0,grain:0},delivered:0});
      Object.assign(getTile(p.x,p.y),{build:kind==='rail'?'stationRail':'stationRoad',station:id});
     }
     selectStation(game.stations[from]);buyVehicle(kind==='rail'?'train':'truck',{target:String(to),cargo:'goods',wagons:3});
     const v=game.vehicles.at(-1);v.servicePhase=null;v.loadingAtOrigin=false;v.stationWait=0;v.load=30;v.cargoOrigin=from;v.velocity=0.8;
     const span=(vehicleCarCount(v)-1)*0.58;
     setVehiclePosition(v,(7-span)*(v.path.length-1)/vehicleTravelDistance(v));
     routes.push(route);
    }
    const w=tileToWorld3d(12,14);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:24,pitch:1.1});
    mark3dDirty();render();
    const surfaces=three.staticGroup.children.filter(o=>o.userData.routeSurface);
    const finite=surfaces.every(m=>Array.from(m.geometry.attributes.position.array).every(Number.isFinite));
    const actual=[];
    for(const v of game.vehicles)for(let i=0;i<vehicleCarCount(v);i++){
     const sample=sampleVehiclePath(v,i*0.58),car=three.vehicleMeshes.get(v.id).userData.cars[i],w=tileToWorld3d(sample.tile.x,sample.tile.y);
     actual.push(Math.hypot(car.position.x-w.x,car.position.z-w.z));
    }
    const memory=three.renderer.info.memory.geometries;for(let i=0;i<5;i++){mark3dDirty();render();}
    return {surfaces:surfaces.length,finite,actual,memory,after:three.renderer.info.memory.geometries,vehicles:game.vehicles.length};
   });
   assert.equal(result.vehicles,2);assert.equal(result.surfaces,4);assert.ok(result.finite);
   assert.ok(result.actual.every(e=>e<1e-6));assert.ok(result.after<=result.memory);
   const canvas=page.locator('#threeViewport canvas');await canvas.scrollIntoViewIfNeeded();
   const buckets=colors(await canvas.screenshot({path:`artifacts/curves-3d-${viewport.width}.png`}));
   await page.evaluate(()=>{const w=tileToWorld3d(12,8);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:8});render();});
   colors(await canvas.screenshot({path:`artifacts/curves-close-${viewport.width}.png`}));
   const motion=await page.evaluate(()=>{
    const v=game.vehicles[0],before=sampleVehiclePath(v,0);updateVehicles(0.3);render();const after=sampleVehiclePath(v,0);
    return {moved:Math.hypot(after.tile.x-before.tile.x,after.tile.y-before.tile.y),turn:Math.abs(after.heading-before.heading)};
   });
   assert.ok(motion.moved>0.02);assert.ok(motion.turn>0.01&&motion.turn<1);
   assert.equal(errors.length,0,errors.join('\n'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(JSON.stringify({viewport,result,motion,colors:buckets,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
