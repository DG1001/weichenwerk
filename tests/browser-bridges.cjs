const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function pixels(buffer){const p=PNG.sync.read(buffer),s=new Set();for(let i=0;i<p.data.length;i+=32)s.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(s.size>30,'Empty bridge render');return s.size;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   await page.evaluate(()=>{
    game.speed=0;game.towns=[];game.industries=[];game.stations=[];game.vehicles=[];game.landscape=null;
    for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});delete t.links;delete t.bridge;}
    for(const row of game.map)for(let x=12;x<=16;x++)row[x].terrain='water';
    const w=tileToWorld3d(14,12);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:innerWidth<600?36:24}); // the tall portrait map shows less sidewaysmark3dDirty();render();
   });
   const canvas=page.locator('#threeViewport canvas');
   const screen=async(x,y,height=0.04)=>page.evaluate(([x,y,h])=>{update3dCamera();const w=tileToWorld3d(x,y),p=new THREE.Vector3(w.x,h,w.z).project(three.camera),r=three.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},[x,y,height]);
   const drag=async(y)=>{
    await canvas.scrollIntoViewIfNeeded();const a=await screen(11,y),b=await screen(17,y);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:16});await page.mouse.up();await page.waitForFunction(()=>construction.frozen);
   };
   await page.getByRole('button',{name:'Schiene',exact:true}).click();await page.locator('#routeMode').selectOption('bridge');
   const cash=await page.evaluate(()=>game.cash);await drag(8);
   assert.equal(await page.evaluate(()=>construction.error),'');assert.equal(await page.evaluate(()=>construction.path.length),7);
   assert.equal(await page.evaluate(()=>game.map.flat().filter(t=>t.bridge).length),0);assert.equal(await page.evaluate(()=>game.cash),cash);
   const previewColors=pixels(await canvas.screenshot({path:`artifacts/bridge-preview-${viewport.width}.png`}));
   await page.locator('#cancelBuild').click();assert.equal(await page.evaluate(()=>game.cash),cash);
   await drag(8);await page.locator('#confirmBuild').click();assert.equal(await page.evaluate(()=>game.cash),cash-9240);
   await page.getByRole('button',{name:'Strasse',exact:true}).click();await drag(16);await page.locator('#confirmBuild').click();
   assert.equal(await page.evaluate(()=>game.map.flat().filter(t=>t.bridge).length),14);
   const fixture=await page.evaluate(()=>{
    document.getElementById('routeMode').value='avoid';
    for(const [kind,y] of [['rail',8],['road',16]]){
     for(const [a,b] of [[3,11],[17,27]]){beginConstruction(getTile(a,y),kind);previewConstruction(getTile(b,y));finishConstruction();if(!confirmConstruction())throw Error('Bridge approach failed');}
     const from=game.stations.length,to=from+1;
     for(const [id,x] of [[from,3],[to,27]]){game.stations.push({id,x,y,name:'Bridge '+id,kind,produces:['goods'],accepts:['goods'],waiting:{goods:80,passengers:0,coal:0,grain:0},delivered:0});Object.assign(getTile(x,y),{build:kind==='rail'?'stationRail':'stationRoad',station:id});}
     mark3dDirty();selectStation(game.stations[from]);buyVehicle(kind==='rail'?'train':'truck',{target:String(to),cargo:'goods',wagons:3});
     const v=game.vehicles.at(-1);Object.assign(v,{servicePhase:null,stationWait:0,loadingAtOrigin:false,load:20,cargoOrigin:from,velocity:0.8});
     setVehiclePosition(v,(kind==='rail'?8.2:8)*(v.path.length-1)/vehicleTravelDistance(v));
    }
    render();const memory=three.renderer.info.memory.geometries;for(let i=0;i<5;i++){mark3dDirty();render();}
    return {bridges:three.staticGroup.children.filter(o=>o.userData.bridgeStructure).length,deck:three.tilePickers.length,memory,after:three.renderer.info.memory.geometries,
     cars:game.vehicles.flatMap(v=>three.vehicleMeshes.get(v.id).userData.cars.map((car,i)=>({y:car.position.y,pitch:car.rotation.x,expected:sampleVehiclePath(v,i*0.58).elevation+(v.type==='train'?0.12:0.095)})))};
   });
   assert.equal(fixture.bridges,4);assert.equal(fixture.deck,1);assert.ok(fixture.after<=fixture.memory);
   assert.ok(fixture.cars.every(c=>Math.abs(c.y-c.expected)<1e-8));assert.ok(fixture.cars.some(c=>Math.abs(c.pitch)>0.1));
   await canvas.scrollIntoViewIfNeeded();pixels(await canvas.screenshot({path:`artifacts/bridges-${viewport.width}.png`}));
   await page.evaluate(()=>{const w=tileToWorld3d(14,8);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:14,pitch:0.8});render();});
   pixels(await canvas.screenshot({path:`artifacts/bridge-train-${viewport.width}.png`}));
   const motion=await page.evaluate(()=>{
    let safe=true,maxHeight=0,returned=false,crossed=false;
    for(let i=0;i<1000;i++){updateVehicles(0.05);if(i%10===0)safe&&=trafficStateValid(game);for(const v of game.vehicles){maxHeight=Math.max(maxHeight,sampleVehiclePath(v,0).elevation);crossed||=v.type==='train'&&sampleVehiclePath(v,0).tile.x>20;returned||=crossed&&v.type==='train'&&v.dir<0&&sampleVehiclePath(v,0).tile.x<11;}}
    render();return {safe,maxHeight,crossed,returned};
   });assert.ok(motion.safe&&motion.crossed&&motion.returned);assert.ok(motion.maxHeight>0.47);
   await page.evaluate(()=>{game.vehicles.forEach(v=>v.stopped=true);saveGame(true);});const saved=await page.evaluate(()=>JSON.stringify(game.map));
   await page.reload();await page.waitForFunction(()=>three.ready&&game.vehicles.length===2);assert.equal(await page.evaluate(()=>JSON.stringify(game.map)),saved);
   await page.evaluate(()=>{const v=game.vehicles[0];v.pathReservation=null;setVehiclePosition(v,9*(v.path.length-1)/vehicleTravelDistance(v));const w=tileToWorld3d(14,8);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:11});render();});
   await page.getByRole('button',{name:'Abriss',exact:true}).click();await canvas.scrollIntoViewIfNeeded();const p=await screen(14,8,0.57);await page.mouse.click(p.x,p.y);
   await page.waitForFunction(()=>construction.frozen);assert.equal(await page.evaluate(()=>construction.path.length),7,'Elevated bridge picking selected the wrong tile');
   const demolitionCash=await page.evaluate(()=>game.cash);await page.locator('#confirmBuild').click();assert.equal(await page.evaluate(()=>game.cash),demolitionCash);assert.ok(await page.evaluate(()=>getTile(14,8).bridge));
   await page.evaluate(()=>recoverVehicle(game.vehicles[0]));await page.locator('#confirmBuild').click();
   assert.equal(await page.evaluate(()=>getTile(14,8).bridge),undefined);assert.equal(await page.evaluate(()=>getTile(14,8).terrain),'water');assert.equal(await page.evaluate(()=>game.cash),demolitionCash-560);
   assert.ok(await page.evaluate(()=>validBridge(getTile(14,16),game.map)));
   const vertical=await page.evaluate(()=>{
    for(let y=11;y<=13;y++)for(let x=22;x<=25;x++)getTile(x,y).terrain='water';
    document.getElementById('routeMode').value='bridge';beginConstruction(getTile(24,10),'road');previewConstruction(getTile(24,14));finishConstruction();
    if(!confirmConstruction())throw Error('Vertical bridge construction failed');
    const w=tileToWorld3d(24,12);Object.assign(three.orbit,{targetX:w.x,targetZ:w.z,distance:12});render();
    return {axis:getTile(24,12).bridge.axis,valid:validBridge(getTile(24,12),game.map),height:routeElevationAt(24,12)};
   });
   assert.equal(vertical.axis,'y');assert.ok(vertical.valid);assert.equal(vertical.height,0.48);
   await canvas.scrollIntoViewIfNeeded();pixels(await canvas.screenshot({path:`artifacts/bridge-vertical-${viewport.width}.png`}));
   assert.equal(errors.length,0,errors.join('\n'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(JSON.stringify({viewport,previewColors,fixture,motion,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
