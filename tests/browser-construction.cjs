const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function pixels(buffer){const p=PNG.sync.read(buffer),colors=new Set();for(let i=0;i<p.data.length;i+=64)colors.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(colors.size>20,'Blank world');return colors.size;}
(async()=>{
  mkdirSync('artifacts',{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
  try{
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
      assert.ok(await page.evaluate(()=>{
        let released=0;three.staticGroup.traverse(o=>{if(o.isInstancedMesh)o.addEventListener('dispose',()=>released++);});
        mark3dDirty();render();return released>0;
      }),'Old instance buffers were not released on world rebuild');
      await page.evaluate(()=>{
        game.speed=0;game.towns=[];game.industries=[];
        for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});delete t.links;}
        getTile(12,12).terrain='water';getTile(14,12).build='house';mark3dDirty();
      });
      await page.getByRole('button',{name:'Schiene',exact:true}).click();
      async function drag(from,to){
        const canvas=page.locator('#threeViewport canvas');await canvas.scrollIntoViewIfNeeded();
        const screen=async p=>page.evaluate(([x,y])=>{
          update3dCamera();const w=tileToWorld3d(x,y),p=new THREE.Vector3(w.x,0.04,w.z).project(three.camera),r=three.renderer.domElement.getBoundingClientRect();
          return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
        },p);
        const a=await screen(from),b=await screen(to);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:16});await page.mouse.up();
        await page.waitForFunction(()=>construction.frozen);
      }
      const cash=await page.evaluate(()=>game.cash);
      await drag([5,12],[22,12]);
      const preview=await page.evaluate(()=>({count:construction.path.length,error:construction.error,built:game.map.flat().filter(t=>t.build==='rail').length,cash:game.cash,cost:construction.cost}));
      assert.ok(preview.count>18&&!preview.error);assert.equal(preview.built,0);assert.equal(preview.cash,cash);
      await page.screenshot({path:`artifacts/build-preview-obstacles-${viewport.width}.png`,fullPage:true});
      await page.locator('#cancelBuild').click();assert.equal(await page.evaluate(()=>game.cash),cash);
      await drag([5,12],[22,12]);await page.locator('#confirmBuild').click();assert.equal(await page.evaluate(()=>game.cash),cash-preview.cost);
      assert.equal(await page.evaluate(()=>getTile(12,12).build),null);
      await page.getByRole('button',{name:'Station',exact:true}).click();await drag([6,9],[6,9]);
      assert.equal(await page.evaluate(()=>game.stations.length),0);await page.locator('#confirmBuild').click();
      assert.equal(await page.evaluate(()=>getTile(6,9).build),'stationRail');
      await page.getByRole('button',{name:'Abriss',exact:true}).click();await drag([6,9],[6,9]);
      assert.equal(await page.evaluate(()=>getTile(6,9).build),'stationRail');await page.keyboard.press('Escape');
      assert.ok(await page.locator('#buildPreview').isHidden());await drag([6,9],[6,9]);await page.locator('#confirmBuild').click();
      assert.equal(await page.evaluate(()=>getTile(6,9).build),null);
      await page.getByRole('button',{name:'Schiene',exact:true}).click();
      await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
      const orbit=await page.evaluate(()=>({...three.orbit})),box=await page.locator('#threeViewport canvas').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down({button:'middle'});
      await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2+20,{steps:4});await page.mouse.up({button:'middle'});
      await page.waitForFunction(()=>!three.dragging);
      assert.notEqual(await page.evaluate(()=>three.orbit.targetX),orbit.targetX,'3D pan did not move the camera');
      await page.evaluate(()=>{const w=tileToWorld3d(13,18);three.orbit.targetX=w.x;three.orbit.targetZ=w.z;three.orbit.distance=32;render();});
      await drag([5,18],[22,18]);await page.locator('#confirmBuild').click();
      await drag([5,19],[22,19]);
      const canvas3d=page.locator('#threeViewport canvas');pixels(await canvas3d.screenshot({path:`artifacts/build-preview-3d-${viewport.width}.png`}));
      await page.locator('#confirmBuild').click();
      assert.equal(await page.evaluate(()=>networkConnected(getTile(12,18),getTile(12,19),'rail')),false);
      assert.equal(await page.evaluate(()=>findPath({x:5,y:18},{x:22,y:19},'rail')),null);
      await page.getByRole('button',{name:'Strasse',exact:true}).click();await drag([7,16],[20,16]);
      assert.equal(await page.evaluate(()=>game.map.flat().filter(t=>t.build==='road').length),0);
      await page.locator('#confirmBuild').click();assert.ok(await page.evaluate(()=>findPath({x:7,y:16},{x:20,y:16},'road')));
      await page.evaluate(()=>{saveGame(true);});await page.reload();await page.waitForFunction(()=>three.ready);
      assert.equal(await page.evaluate(()=>networkConnected(getTile(12,18),getTile(12,19),'rail')),false);
      await page.evaluate(()=>{
        for(let x=3;x<=30;x++)getTile(x,23).build='rail';
        game.stations=[3,30].map((x,id)=>({id,x,y:23,kind:'rail',name:'Recovery '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:80,goods:0,coal:0,grain:0},delivered:0}));
        game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));mark3dDirty();
        selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'passengers',wagons:2});
        const v=game.vehicles[0];Object.assign(v,{index:7,load:10,cargoOrigin:0,stationWait:0,loadingAtOrigin:false,servicePhase:null,blocked:true});selectVehicle(v);refreshManagement(true);
      });
      const rescueCash=await page.evaluate(()=>game.cash);
      page.once('dialog',d=>d.accept());await page.locator('#recoverVehicle').click();
      assert.ok(await page.evaluate(()=>game.vehicles[0].inDepot));assert.equal(await page.evaluate(()=>game.vehicles[0].load),10);assert.equal(await page.evaluate(()=>game.cash),rescueCash);
      await page.evaluate(()=>saveGame(true));await page.reload();await page.waitForFunction(()=>three.ready&&game.vehicles.length===1);
      await page.getByRole('button',{name:'Zug 1 - Passagiere',exact:false}).click();
      await page.locator('#toggleVehicle').click();assert.equal(await page.evaluate(()=>game.vehicles[0].inDepot),false);
      await page.locator('#departVehicle').click();assert.equal(await page.evaluate(()=>game.vehicles[0].loadingAtOrigin),false);
      assert.ok(await page.evaluate(()=>trafficStateValid(game)));
      await page.locator('#worldSettings').click();await page.locator('#mapSize').selectOption('64x48');
      page.once('dialog',d=>d.accept());await page.locator('#expandMap').click();
      assert.equal(await page.evaluate(()=>config.width),64);assert.equal(await page.evaluate(()=>game.vehicles.length),1);
      assert.ok(await page.evaluate(()=>trafficStateValid(game)));
      await page.locator('#worldSettings').click();await page.locator('#mapSize').selectOption('128x96');
      const beforeCancel=await page.evaluate(()=>JSON.stringify(createSave().state));page.once('dialog',d=>d.dismiss());await page.locator('#newWorld').click();
      assert.equal(await page.evaluate(()=>JSON.stringify(createSave().state)),beforeCancel);
      await page.screenshot({path:`artifacts/world-dialog-${viewport.width}.png`,fullPage:true});
      page.once('dialog',d=>d.accept());await page.locator('#newWorld').click();await page.evaluate(()=>{game.speed=0;render();});
      assert.equal(await page.evaluate(()=>config.width),128);assert.equal(await page.evaluate(()=>game.vehicles.length),0);assert.equal(await page.evaluate(()=>game.cash),90000);
      await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
      const largeColors=pixels(await page.locator('#threeViewport canvas').screenshot({path:`artifacts/large-map-${viewport.width}.png`}));
      const calls=await page.evaluate(()=>three.renderer.info.render.calls);assert.ok(calls<1600,'Large map uses too many draw calls');
      await page.evaluate(()=>saveGame(true));await page.reload();await page.waitForFunction(()=>three.ready&&config.width===128);
      await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
      pixels(await page.locator('#threeViewport canvas').screenshot({path:`artifacts/large-map-restored-${viewport.width}.png`}));
      await page.locator('#worldSettings').click();page.once('dialog',d=>d.accept());await page.locator('#previousWorld').click();
      assert.equal(await page.evaluate(()=>config.width),64);assert.equal(await page.evaluate(()=>game.vehicles.length),1);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
      console.log(JSON.stringify({viewport,preview,largeColors,calls,errors}));await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
