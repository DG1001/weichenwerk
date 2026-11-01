const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
function pixels(buffer){const p=PNG.sync.read(buffer),colors=new Set();for(let i=0;i<p.data.length;i+=32)colors.add([p.data[i]>>4,p.data[i+1]>>4,p.data[i+2]>>4].join(','));assert.ok(colors.size>20,'Empty landscape canvas');return colors.size;}
(async()=>{
 mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>three.ready);
   await page.evaluate(()=>{game.speed=0;});
   const results=[];
   for(const style of ['mixed','lakes','coast','river']){
    const before=await page.evaluate(()=>JSON.stringify(createSave().state));
    await page.locator('#worldSettings').click();await page.locator('#mapSize').selectOption('64x48');
    await page.locator('#landscapeStyle').selectOption(style);await page.locator('#landscapeSeed').fill('Nordsee-42');
    await page.waitForFunction(style=>landscapePreview.world.landscape.seed==='Nordsee-42'&&landscapePreview.world.landscape.style===style,style);
    assert.equal(await page.evaluate(()=>JSON.stringify(createSave().state)),before,'Preview changed current world');
    const expected=await page.evaluate(()=>JSON.stringify(landscapePreview.world.map));
    const preview=pixels(await page.locator('#landscapePreview').screenshot({path:`artifacts/landscape-preview-${style}-${viewport.width}.png`}));
    if(style==='coast')await page.screenshot({path:`artifacts/landscape-dialog-${viewport.width}.png`,fullPage:true});
    page.once('dialog',d=>d.accept());await page.locator('#newWorld').click();await page.evaluate(()=>{game.speed=0;render();});
    assert.equal(await page.evaluate(()=>JSON.stringify(game.map)),expected,'Preview and generated world differ');
    assert.equal(await page.evaluate(()=>game.landscape.seed),'Nordsee-42');
    await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
    const colors=pixels(await page.locator('#threeViewport canvas').screenshot({path:`artifacts/landscape-${style}-${viewport.width}.png`}));
    const stats=await page.evaluate(()=>({water:game.map.flat().filter(t=>t.terrain==='water').length,towns:game.towns.length,industries:game.industries.length,calls:three.renderer.info.render.calls}));
    assert.ok(stats.water>0&&stats.towns>=3&&stats.industries>=3);assert.ok(stats.calls<1600);
    results.push({style,preview,colors,...stats});
   }
   const map=await page.evaluate(()=>JSON.stringify(game.map)),landscape=await page.evaluate(()=>({...game.landscape}));
   await page.evaluate(()=>saveGame(true));await page.reload();await page.waitForFunction(()=>three.ready&&config.width===64);
   assert.equal(await page.evaluate(()=>JSON.stringify(game.map)),map);assert.deepEqual(await page.evaluate(()=>({...game.landscape})),landscape);
   await page.locator('#worldSettings').click();const seed=await page.locator('#landscapeSeed').inputValue();await page.locator('#randomLandscape').click();
   assert.notEqual(await page.locator('#landscapeSeed').inputValue(),seed);assert.equal(await page.evaluate(()=>JSON.stringify(game.map)),map);
   await page.locator('#landscapeSeed').fill('');await page.waitForFunction(()=>document.getElementById('landscapeSeed').value.length>0);
   assert.equal(await page.locator('#landscapeSeed').inputValue(),await page.evaluate(()=>landscapePreview.world.landscape.seed));
   await page.locator('#closeWorld').click();
   const driving=await page.evaluate(()=>{
    let pair=null,best=Infinity;
    for(const a of game.towns)for(const b of game.towns)if(a.id!==b.id){const d=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);if(d<best){best=d;pair=[a,b];}}
    const apron=s=>game.map.flat().find(t=>!t.build&&t.terrain!=='water'&&Math.abs(t.x-s.x)<=2&&Math.abs(t.y-s.y)<=2);
    const [a,b]=pair.map(apron);document.getElementById('routeMode').value='avoid';
    beginConstruction(a,'rail');previewConstruction(b);finishConstruction();
    if(!confirmConstruction())return {built:false};
    ui.stationKind.value='rail';buildStation(a);buildStation(b);
    if(game.stations.length!==2)return {built:false};
    game.stations[0].waiting.passengers=20;selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'passengers',wagons:1});
    if(!game.vehicles.length)return {built:false};
    const v=game.vehicles[0],before=sampleVehiclePath(v,0).tile;updateVehicles(8);const after=sampleVehiclePath(v,0).tile;
    const w=tileToWorld3d(after.x,after.y);three.orbit.targetX=w.x;three.orbit.targetZ=w.z;three.orbit.distance=14;selectVehicle(v);render();
    return {built:true,moved:Math.hypot(before.x-after.x,before.y-after.y),safe:trafficStateValid(game),cash:game.cash};
   });
   assert.ok(driving.built&&driving.moved>0.1&&driving.safe,JSON.stringify(driving));
   await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();pixels(await page.locator('#threeViewport canvas').screenshot({path:`artifacts/landscape-train-${viewport.width}.png`}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
   console.log(JSON.stringify({viewport,results,driving,errors}));await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
