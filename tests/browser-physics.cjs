const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

(async()=>{
  mkdirSync('artifacts',{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
  try{
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(()=>three.ready);
      await page.evaluate(()=>{
        game.speed=0;
        for(const tile of game.map.flat())Object.assign(tile,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});
        for(let x=7;x<=30;x++)getTile(x,20).build='rail';
        game.stations=[7,30].map((x,id)=>({id,x,y:20,kind:'rail',name:'Platform '+id,waiting:{passengers:0,goods:80,coal:0,grain:0},produces:['goods'],accepts:['goods'],delivered:0}));
        game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{station:s.id,build:'stationRail'}));
        ui.stationKind.value='rail';mark3dDirty();
        for(const x of [8,9,29,28])buildStation(getTile(x,20));
        game.stations.forEach(s=>{s.produces=['goods'];s.accepts=['goods'];});
        selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'goods',wagons:4});
        updateVehicles(1);selectVehicle(game.vehicles[0]);
        three.orbit.targetX=tileToWorld3d(10,20).x;three.orbit.targetZ=tileToWorld3d(10,20).z;three.orbit.distance=11;
        mark3dDirty();render();
      });
      assert.equal(await page.locator('#loadingLabel').textContent(),'Beladen');
      assert.equal(await page.locator('#speedLabel').textContent(),'0 km/h');
      const partial=await page.evaluate(()=>{
        const v=game.vehicles[0],cars=three.vehicleMeshes.get(v.id).userData.cars;
        return {load:v.load,visible:cars.filter(c=>c.userData.loadMesh.visible).length,phase:v.servicePhase,platform:stationTiles(game.stations[0]).length};
      });
      assert.ok(partial.load>0&&partial.load<80);assert.ok(partial.visible>0&&partial.visible<4);assert.equal(partial.platform,3);
      const canvas=page.locator('#threeViewport canvas');await canvas.scrollIntoViewIfNeeded();
      const shot=await canvas.screenshot({path:`artifacts/loading-${viewport.width}.png`});
      const png=PNG.sync.read(shot),colors=new Set();for(let i=0;i<png.data.length;i+=64)colors.add(`${png.data[i]>>4},${png.data[i+1]>>4},${png.data[i+2]>>4}`);
      assert.ok(colors.size>25);
      const orbit=await page.evaluate(()=>({...three.orbit}));
      await page.evaluate(()=>saveGame(true));await page.reload();await page.waitForFunction(()=>three.ready&&game.vehicles.length===1);
      assert.deepEqual(await page.evaluate(()=>({...three.orbit})),orbit,'Saved 3D camera was reset during startup');
      assert.deepEqual(await page.evaluate(()=>({load:game.vehicles[0].load,phase:game.vehicles[0].servicePhase,platform:stationTiles(game.stations[0]).length})),{load:partial.load,phase:partial.phase,platform:3});
      const motion=await page.evaluate(()=>{
        const v=game.vehicles[0];
        for(let i=0;i<500&&v.loadingAtOrigin;i++)updateVehicles(0.02);
        updateVehicles(0.2);const slow=v.velocity;
        const before=sampleVehiclePath(v,0).tile.x;
        updateVehicles(3);const fast=v.velocity,after=sampleVehiclePath(v,0).tile.x;
        selectVehicle(v);render();return {slow,fast,before,after};
      });
      assert.ok(motion.slow>0&&motion.fast>motion.slow&&motion.after>motion.before);
      assert.match(await page.locator('#speedLabel').textContent(),/9[01] km\/h/);
      const braking=await page.evaluate(()=>{
        const v=game.vehicles[0];setVehiclePosition(v,v.path.length-1-0.7);v.velocity=cruiseSpeed(v);
        updateVehicles(0.1);const speed=v.velocity;selectVehicle(v);render();return {speed,state:v.motionState};
      });
      assert.ok(braking.speed>0&&braking.speed<1.64);assert.equal(braking.state,'braking');
      await page.locator('#selectionTitle').scrollIntoViewIfNeeded();
      await page.screenshot({path:`artifacts/physics-ui-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const unload=await page.evaluate(()=>{
        const v=game.vehicles[0];for(let i=0;i<500&&!v.servicePhase;i++)updateVehicles(0.02);
        updateVehicles(1);selectVehicle(v);render();return {load:v.load,phase:v.servicePhase,velocity:v.velocity};
      });
      assert.ok(unload.load>0&&unload.load<80);assert.equal(unload.phase,'unload');assert.equal(unload.velocity,0);
      assert.equal(await page.locator('#loadingLabel').textContent(),'Entladen');
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(JSON.stringify({viewport,partial,motion,braking,unload,colors:colors.size,errors}));
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
