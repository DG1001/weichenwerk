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
      await page.getByRole('button',{name:'Signal',exact:true}).click();
      await page.locator('#signalBothDirections').uncheck();
      await page.evaluate(()=>{
        game.speed=0;
        for(const tile of game.map.flat()){tile.terrain='grass';tile.build=null;tile.station=null;tile.signal=null;tile.town=null;tile.industry=null;}
        const line=(x1,y1,x2,y2)=>Array.from({length:Math.abs(x2-x1)+Math.abs(y2-y1)+1},(_,i)=>({x:x1+Math.sign(x2-x1)*i,y:y1+Math.sign(y2-y1)*i}));
        const lower=line(6,16,26,16),upper=line(6,10,26,10),left=line(6,10,6,16),right=line(26,10,26,16);
        for(const p of [...lower,...upper,...left,...right])getTile(p.x,p.y).build='rail';
        const station=(id,p)=>({id,...p,kind:'rail',name:'Ring '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:80,coal:0,grain:0,goods:0},delivered:0});
        game.stations=[station(0,lower[0]),station(1,lower.at(-1))];
        for(const st of game.stations){getTile(st.x,st.y).build='stationRail';getTile(st.x,st.y).station=st.id;}
        mark3dDirty();
        for(const x of [11,17,22])buildSignal(getTile(x,16),'east',true);
        for(const x of [11,17,22])buildSignal(getTile(x,10),'west',true);
        selectStation(game.stations[0]);buyVehicle('train',{target:'1',wagons:2});
        selectStation(game.stations[1]);buyVehicle('train',{target:'0',wagons:2});
        selectVehicle(game.vehicles[0]);
        game.showBlocks=true;mark3dDirty();
        three.orbit.targetX=0;three.orbit.targetZ=0;three.orbit.distance=34;
        render();
      });
      assert.equal(await page.evaluate(()=>game.vehicles.length),2);
      assert.equal(await page.evaluate(()=>traffic.lamps.length),6);
      const canvas=page.locator('#threeViewport canvas');
      await canvas.scrollIntoViewIfNeeded();
      const screenshot=await canvas.screenshot({path:`artifacts/signals-${viewport.width}.png`});
      const png=PNG.sync.read(screenshot);const colors=new Set();
      for(let i=0;i<png.data.length;i+=64)colors.add(`${png.data[i]>>4},${png.data[i+1]>>4},${png.data[i+2]>>4}`);
      assert.ok(colors.size>25);
      const results=await page.evaluate(()=>{
        let safe=true;
        const origins=game.vehicles.map(v=>v.from),turns=[0,0];
        for(let i=0;i<4000;i++){
          updateVehicles(0.04);safe &&= trafficStateValid(game);
          game.vehicles.forEach((v,j)=>{if(v.from!==origins[j]){turns[j]++;origins[j]=v.from;}});
        }
        render();
        return {safe,turns,red:traffic.lamps.filter(entry=>entry.lamp.material===three.materials.signalRed).length};
      });
      assert.ok(results.safe);assert.ok(results.turns.every(n=>n>=2));
      await canvas.screenshot({path:`artifacts/signals-running-${viewport.width}.png`});
      await page.evaluate(()=>saveGame(true));
      await page.reload();
      await page.waitForFunction(()=>three.ready&&game.vehicles.length===2);
      assert.equal(await page.evaluate(()=>game.map.flat().filter(tile=>tile.signal).length),6);
      assert.ok(await page.evaluate(()=>trafficStateValid(game)));
      await page.getByRole('button',{name:'Signalbloecke',exact:true}).click();
      await page.locator('#threeViewport canvas').scrollIntoViewIfNeeded();
      await page.locator('#threeViewport canvas').screenshot({path:`artifacts/signals-blocks-${viewport.width}.png`});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(JSON.stringify({viewport,colors:colors.size,...results,errors}));
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
