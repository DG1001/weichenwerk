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
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(pathToFileURL(resolve('index.html')).href);
      await page.waitForFunction(()=>three.ready);
      await page.locator('#signalType').selectOption('path');
      await page.evaluate(()=>{
        game.speed=0;
        for(const t of game.map.flat())Object.assign(t,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});
        const line=(x1,y1,x2,y2)=>Array.from({length:Math.abs(x2-x1)+Math.abs(y2-y1)+1},(_,i)=>({x:x1+Math.sign(x2-x1)*i,y:y1+Math.sign(y2-y1)*i}));
        const a=line(3,11,29,11),b=line(3,16,29,16),cross=line(16,11,16,16);
        [...a,...b,...cross].forEach(p=>getTile(p.x,p.y).build='rail');
        game.stations=[a[0],a.at(-1),b[0],b.at(-1)].map((p,id)=>({id,...p,kind:'rail',name:'PBS '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:80,coal:0,grain:0,goods:0},delivered:0}));
        game.stations.forEach(st=>Object.assign(getTile(st.x,st.y),{station:st.id,build:'stationRail'}));
        mark3dDirty();
        for(const y of [11,16])for(const x of [9,24])buildSignal(getTile(x,y),'east',false,'path');
        selectStation(game.stations[0]);buyVehicle('train',{target:'1',wagons:2});
        selectStation(game.stations[2]);buyVehicle('train',{target:'3',wagons:2});
        for(let i=0;i<1500;i++){
          updateVehicles(0.02);
          if(game.vehicles.every(v=>v.pathReservation&&trainBlocks(v).has(railBlocks().get('16,11'))))break;
        }
        game.showBlocks=true;mark3dDirty();
        three.orbit.distance=36;three.orbit.targetX=0;three.orbit.targetZ=0;
        render();
      });
      const initial=await page.evaluate(()=>({
        safe:trafficStateValid(game),plans:game.vehicles.filter(v=>v.pathReservation).length,
        markers:traffic.reservationOverlay.count,green:traffic.lamps.filter(e=>e.lamp.material===three.materials.signalGreen).length,
        shared:game.vehicles.every(v=>trainBlocks(v).has(railBlocks().get('16,11')))
      }));
      assert.ok(initial.safe&&initial.shared);assert.equal(initial.plans,2);assert.ok(initial.markers>10);assert.ok(initial.green>=2);
      const canvas=page.locator('#threeViewport canvas');await canvas.scrollIntoViewIfNeeded();
      const shot=await canvas.screenshot({path:`artifacts/pbs-${viewport.width}.png`});
      const png=PNG.sync.read(shot),colors=new Set();for(let i=0;i<png.data.length;i+=64)colors.add(`${png.data[i]>>4},${png.data[i+1]>>4},${png.data[i+2]>>4}`);
      assert.ok(colors.size>30);
      await page.evaluate(()=>saveGame(true));
      const savedFile=await page.evaluate(()=>JSON.stringify(createSave()));
      const reservations=await page.evaluate(()=>JSON.stringify(game.vehicles.map(v=>v.pathReservation)));
      await page.reload();await page.waitForFunction(()=>three.ready&&game.vehicles.length===2);
      assert.equal(await page.evaluate(()=>JSON.stringify(game.vehicles.map(v=>v.pathReservation))),reservations);
      assert.ok(await page.evaluate(()=>trafficStateValid(game)));
      const progress=await page.evaluate(()=>{
        let safe=true,shared=0,returned=false;
        for(let i=0;i<2400;i++){
          updateVehicles(0.04);safe &&= trafficStateValid(game);
          if(game.vehicles.every(v=>trainBlocks(v).has(railBlocks().get('16,11'))))shared++;
          returned ||= game.vehicles.every(v=>v.dir<0);
        }
        return {safe,shared,returned};
      });
      assert.ok(progress.safe&&progress.shared>10&&progress.returned);
      await page.evaluate(text=>restoreSave(text),savedFile);
      await page.getByRole('button',{name:'Signalbloecke',exact:true}).click();
      await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
      await page.locator('#threeViewport canvas').screenshot({path:`artifacts/pbs-blocks-${viewport.width}.png`});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(JSON.stringify({viewport,initial,progress,colors:colors.size,errors}));
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
