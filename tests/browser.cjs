const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

function colors(buffer) {
  const png = PNG.sync.read(buffer);
  const buckets = new Set();
  for (let i = 0; i < png.data.length; i += 64) {
    buckets.add(`${png.data[i] >> 4},${png.data[i + 1] >> 4},${png.data[i + 2] >> 4}`);
  }
  assert.ok(buckets.size > 20, 'Canvas must contain a rendered world');
  return buckets.size;
}

(async () => {
  mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined) });
  try {
    for (const viewport of [{width:1440,height:900}, {width:390,height:844}]) {
      const page = await browser.newPage({ viewport });
      const errors = [],network=[];
      page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
      await page.route(/^https?:\/\//,route=>route.abort());
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(() => typeof three !== 'undefined' && three.ready, null, {timeout:30000});
      assert.equal(await page.locator('[data-view], #gameCanvas').count(),0,'Removed renderer controls/canvas returned');
      await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
      const canvas = page.locator('#threeViewport canvas');
      const buckets = colors(await canvas.screenshot({path:`artifacts/world-${viewport.width}.png`}));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      await page.evaluate(() => {
        game.speed = 0;
        for (let x=8;x<=22;x++) { const tile=getTile(x,23); tile.terrain='grass';tile.build='rail'; }
        const station=(id,x)=>({id,x,y:23,kind:'rail',name:'Test '+id,waiting:{passengers:80,goods:0,coal:0,grain:0},produces:['passengers'],accepts:['passengers'],delivered:0});
        game.stations=[station(0,8),station(1,22)];
        getTile(8,23).station=0;getTile(22,23).station=1;
        getTile(8,23).build='stationRail';getTile(22,23).build='stationRail';
        mark3dDirty();
        selectStation(game.stations[0]);buyVehicle('train');
        game.vehicles[0].index=8;
        Object.assign(game.vehicles[0],{servicePhase:null,loadingAtOrigin:false,stationWait:0,load:80,cargoOrigin:0,velocity:1.64});
        mark3dDirty();render();
        three.orbit.targetX=tileToWorld3d(15,23).x;
        three.orbit.targetZ=tileToWorld3d(15,23).z;
        three.orbit.distance=13;
        render();
      });
      await canvas.screenshot({path:`artifacts/train-${viewport.width}.png`});
      const regression = await page.evaluate(() => {
        const count=three.vehicleMeshes.get(game.vehicles[0].id).userData.cars.length;
        const vehicle=game.vehicles[0];
        const start=sampleVehiclePath(vehicle,0).tile;
        updateVehicles(3); render();
        const end=sampleVehiclePath(vehicle,0).tile;
        const geometries=three.renderer.info.memory.geometries;
        for(let i=0;i<3;i++){mark3dDirty();render();}
        return {count,moved:Math.hypot(start.x-end.x,start.y-end.y),geometries,after:three.renderer.info.memory.geometries};
      });
      assert.equal(regression.count,5);
      assert.ok(regression.moved>0);
      assert.ok(regression.after <= regression.geometries,'World rebuild leaked geometry');
      const reversal = await page.evaluate(() => {
        const vehicle=game.vehicles[0];
        vehicle.index=vehicle.path.length-1;vehicle.dir=1;vehicle.progress=0;beginStationService(vehicle,false);
        const before=Array.from({length:vehicleCarCount(vehicle)},(_,i)=>sampleVehiclePath(vehicle,i*0.58).tile.x).sort((a,b)=>a-b);
        for(let i=0;i<2000&&vehicle.dir===1;i++)updateVehicles(0.02);render();
        const cars=three.vehicleMeshes.get(vehicle.id).userData.cars;
        const after=Array.from({length:vehicleCarCount(vehicle)},(_,i)=>sampleVehiclePath(vehicle,i*0.58).tile.x).sort((a,b)=>a-b);
        return {dir:vehicle.dir,front:cars[0].position.x,rear:cars.at(-1).position.x,heading:cars[0].rotation.y,before,after};
      });
      assert.equal(reversal.dir,-1);
      assert.ok(reversal.front<reversal.rear,'Locomotive must lead after turning');
      assert.ok(Math.sin(reversal.heading)<-0.99,'Locomotive nose must face the return direction');
      reversal.before.forEach((x,i)=>assert.ok(Math.abs(x-reversal.after[i])<1e-8,'Consist footprint changed at reversal'));
      colors(await canvas.screenshot({path:`artifacts/turned-train-${viewport.width}.png`}));
      await page.getByRole('button',{name:'Gesamte Karte',exact:true}).click();
      const dimensions=await page.evaluate(()=>({
        width:three.renderer.domElement.width,height:three.renderer.domElement.height,
        expectedWidth:Math.floor(threeViewport.clientWidth*three.renderer.getPixelRatio()),
        expectedHeight:Math.floor(threeViewport.clientHeight*three.renderer.getPixelRatio())
      }));
      assert.equal(dimensions.width,dimensions.expectedWidth,'WebGL width must match display scale');
      assert.equal(dimensions.height,dimensions.expectedHeight,'WebGL height must match display scale');
      await page.evaluate(()=>{
        const v=game.vehicles[0];v.index=0;v.dir=1;v.progress=0;v.stationWait=0;v.load=0;v.stopped=true;v.velocity=0;v.servicePhase=null;v.loadingAtOrigin=false;
        selectVehicle(v);refreshManagement(true);
      });
      await page.locator('#orderWagons').fill('2');
      await page.locator('#orderLoad').selectOption('full');
      await page.locator('#orderReverse').selectOption('backwards');
      await page.getByRole('button',{name:'Auftrag uebernehmen'}).click();
      assert.equal(await page.evaluate(()=>game.vehicles[0].carCount),3);
      await page.locator('#toggleVehicle').click();
      await page.evaluate(()=>{updateVehicles(0.5);saveGame(true);
        const legacy=createSave();legacy.view='2d';legacy.camera={x:20,y:-10,zoom:0.75};
        localStorage.setItem(saveKey,JSON.stringify(legacy));
      });
      const savedState=await page.evaluate(()=>JSON.stringify(createSave().state));
      await page.reload();
      await page.waitForFunction(()=>three.ready && game.vehicles.length===1);
      assert.equal(await page.evaluate(()=>createSave().view),'3d','Legacy save did not migrate to 3D');
      assert.equal(await page.evaluate(()=>Object.hasOwn(createSave(),'camera')),false,'Removed 2D camera was saved');
      const restoredState=await page.evaluate(()=>JSON.stringify(createSave().state));
      // Sources are derived from the restored map rather than trusted from an import.
      const normalized=(text)=>{const s=JSON.parse(text);s.stations.forEach(st=>delete st.sources);return s;};
      assert.deepEqual(normalized(savedState),normalized(restoredState),'Reload did not preserve the game');
      await page.getByRole('button',{name:/Zug 1 - Passagiere/}).click();
      await page.locator('#vehicleEditor').scrollIntoViewIfNeeded();
      await page.screenshot({path:`artifacts/management-${viewport.width}.png`,fullPage:true});
      const downloadEvent=page.waitForEvent('download');
      await page.locator('#exportGame').click();
      const exported=await downloadEvent;
      assert.equal(exported.suggestedFilename(),'libre-transport.json');
      const importBefore=await page.evaluate(()=>game.cash);
      await page.locator('#importFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')});
      await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('inkompatible'));
      assert.equal(await page.evaluate(()=>game.cash),importBefore,'Invalid import changed current game');
      const importData=await page.evaluate(()=>{const file=createSave();file.state.cash=123456;return JSON.stringify(file);});
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#importFile').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(importData)});
      await page.waitForFunction(()=>game.cash===123456);
      assert.ok(await page.evaluate(()=>localStorage.getItem(saveKey).includes('123456')));
      assert.equal(network.length,0,'Game still requires external downloads');
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(JSON.stringify({viewport,buckets,regression,reversal,errors}));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
