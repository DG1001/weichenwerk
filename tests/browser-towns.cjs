const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function colors(buffer){const p=PNG.sync.read(buffer),set=new Set();for(let i=0;i<p.data.length;i+=64)set.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(set.size>20,'Empty town scene');return set.size;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   await page.evaluate(()=>{
    game.speed=0;game.towns=[];game.industries=[];game.stations=[];game.vehicles=[];
    for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,town:null,industry:null,station:null,signal:null,shore:false});delete t.links;}
    addTown('Alpha',8,10,100);addTown('Beta',24,10,100);
    for(let x=8;x<=24;x++)getTile(x,12).build='rail';
    ui.stationKind.value='rail';buildStation(getTile(8,12));buildStation(getTile(24,12));
    getTile(6,9).terrain='water';getTile(10,9).build='road';mark3dDirty();buildSignal(getTile(15,12),'east',false);
    for(const st of game.stations)st.waiting.passengers=80;
    selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'passengers',wagons:1});
    for(let i=0;i<4000;i++){
      updateVehicles(0.04);
      if(game.towns.every(t=>(t.growth?.passengerCalls.length||0)>=3))break;
    }
    const goods={id:10,type:'truck',cargo:'goods',capacity:20,load:12,cargoOrigin:99,serviceSerial:1,profit:0,path:[{x:3,y:3},{x:8,y:12}]};
    deliverCargo(goods,game.stations[0],6);goods.serviceSerial++;deliverCargo(goods,game.stations[0],6);render();
   });
   const service=await page.evaluate(()=>game.towns.map(t=>({visits:t.growth.passengerCalls.length,persons:townSupply(t).passengers,goods:t.growth.goods})));
   assert.ok(service.every(s=>s.visits>=3&&s.persons>0),JSON.stringify(service));assert.equal(service[0].goods,12);
   await page.locator('#townListButton').click();assert.equal(await page.locator('#townListRows tr').count(),2);
   await page.locator('[data-town-id="0"]').click();await page.waitForFunction(()=>game.selected?.town?.id===0);
   assert.ok(await page.locator('#townPanel').isVisible());assert.equal(await page.locator('#townPopulation').textContent(),'100');
   assert.equal(await page.locator('#townGoods').textContent(),'12 / 6');assert.equal(await page.locator('#townGrowthProgress').evaluate(el=>el.value),1);
   const canvas=page.locator('#threeViewport canvas');await canvas.scrollIntoViewIfNeeded();
   const before=await canvas.screenshot({path:`artifacts/town-before-${viewport.width}.png`});colors(before);
   const protections=await page.evaluate(()=>JSON.stringify(game.map.flat().filter(t=>t.terrain==='water'||['rail','road','stationRail','stationRoad'].includes(t.build))));
   const result=await page.evaluate(()=>{
    const homes=game.map.flat().filter(t=>t.build==='house').length;
    game.dayProgress=29.99;game.speed=1;update(120);game.speed=0;render();
    return {month:game.month,homesBefore:homes,homesAfter:game.map.flat().filter(t=>t.build==='house').length,
      towns:game.towns.map(t=>({population:t.population,last:t.growth.last,history:t.growth.history})),safe:trafficStateValid(game),
      renderedHomes:three.staticGroup.children.reduce((sum,o)=>sum+(o.userData.residentialCount||0),0)};
   });
   assert.equal(result.month,1);assert.equal(result.homesAfter-result.homesBefore,3);assert.ok(result.safe);
   assert.equal(result.renderedHomes,result.homesAfter,'House instance count differs from the grown map');
   assert.equal(result.towns[0].last.houses,2);assert.equal(result.towns[1].last.houses,1);
   assert.ok(result.towns[0].population>100&&result.towns[1].population>100);
   assert.equal(await page.evaluate(()=>JSON.stringify(game.map.flat().filter(t=>t.terrain==='water'||['rail','road','stationRail','stationRoad'].includes(t.build)))),protections,'City growth altered infrastructure/water');
   await page.waitForFunction(()=>document.getElementById('townPopulation').textContent===String(game.towns[0].population));
   assert.equal(await page.locator('#townHistory tr').count(),1);
   const after=await canvas.screenshot({path:`artifacts/town-grown-${viewport.width}.png`}),b=PNG.sync.read(before),a=PNG.sync.read(after);
   let changed=0;for(let i=0;i<a.data.length;i+=4)if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2])changed++;
   assert.ok(changed>150,'New houses were not visibly rendered');
   await page.locator('#townPanel').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/town-panel-${viewport.width}.png`,fullPage:true});
   await page.evaluate(()=>saveGame(true));const snapshot=await page.evaluate(()=>JSON.stringify(game.towns));
   await page.reload();await page.waitForFunction(()=>three.ready&&game.month===1);assert.equal(await page.evaluate(()=>JSON.stringify(game.towns)),snapshot);
   await page.locator('#townListButton').click();await page.locator('[data-town-id="0"]').click();
   assert.equal(await page.locator('#townDelta').textContent(),'+'+result.towns[0].last.delta);
   await canvas.scrollIntoViewIfNeeded();
   colors(await canvas.screenshot({path:`artifacts/town-focused-${viewport.width}.png`}));
   await page.evaluate(()=>selectTile(getTile(0,0)));assert.ok(await page.locator('#townPanel').isHidden());
   const point=await page.evaluate(()=>{update3dCamera();const t=game.towns[0],w=tileToWorld3d(t.x,t.y),p=new THREE.Vector3(w.x,0.04,w.z).project(three.camera),r=three.renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
   await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>game.selected?.town?.id===0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
   console.log(JSON.stringify({viewport,service,result,changed,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
