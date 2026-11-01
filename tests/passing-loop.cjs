const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

// Passing loops on a single line, built two ways:
// 1. by hand as help.html describes: drag from one track tile to another on the same line with
//    "Hindernisse umfahren", then four one-way block signals;
// 2. with the "Ausweichgleis mit Signalen" route mode, which plans track, switches and signals at once.
// Two trains running towards each other must pass in the loop again and again without deadlock.
const nodes = new Map();
const element = () => ({ value: 'avoid', checked: true, textContent: '', hidden: false, disabled: false, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, replaceChildren() {}, append() {}, addEventListener() {}, getBoundingClientRect: () => ({ width: 1000, height: 700 }), clientWidth: 1000, clientHeight: 700, getContext: () => ({}) });
const get = id => { id = String(id).replace(/^#/, ''); if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
const source = ['vendor/pathfinding-0.4.18.min', 'vendor/simplex-noise-4.0.3.min', 'landscape', 'towns', 'railway', 'construction', 'physics', 'game']
  .map(n => readFileSync(join(__dirname, '../src/' + n + '.js'), 'utf8').replace(/\ninit(?:Management)?\(\);\s*$/, '')).join('\n');

runInNewContext(source + `
makeMap();game.speed=1;
const station=(id,x,y)=>({id,x,y,kind:'rail',name:'Ende '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,coal:0,grain:0,goods:0},delivered:0});
const y=12;
function line(){
  for(const tile of game.map.flat()){Object.assign(tile,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});delete tile.links;delete tile.bridge;}
  game.towns=[];game.industries=[];game.vehicles=[];game.nextVehicleId=0;game.cash=500000;
  for(let x=2;x<=30;x++)getTile(x,y).build='rail';
  game.stations=[station(0,2,y),station(1,30,y)];
  for(const st of game.stations){getTile(st.x,st.y).build='stationRail';getTile(st.x,st.y).station=st.id;}
  mark3dDirty();
}
function drag(a,b){beginConstruction(getTile(a,y),'rail');previewConstruction(getTile(b,y));finishConstruction();}
function runTrains(label){
  selectStation(game.stations[0]);buyVehicle('train',{wagons:3});
  selectStation(game.stations[1]);buyVehicle('train',{wagons:3});
  assert.equal(game.vehicles.length,2,label+': both trains must start');
  // A turnaround reverses the stored path, so count changes of destination instead of v.dir.
  const turns=new Map(game.vehicles.map(v=>[v.id,0])),last=new Map(game.vehicles.map(v=>[v.id,v.to]));
  const used={main:new Set(),loop:new Set()};
  for(let i=0;i<24000;i++){
    updateVehicles(0.05);
    assert.ok(trafficStateValid(game),label+': two trains share a block');
    for(const v of game.vehicles){
      if(v.to!==last.get(v.id)){turns.set(v.id,turns.get(v.id)+1);last.set(v.id,v.to);}
      const p=v.path[Math.round(trainPosition(v))];
      if(p&&p.x===16)(p.y===y?used.main:used.loop).add(v.to===1?'east':'west');
    }
  }
  for(const v of game.vehicles)assert.ok(turns.get(v.id)>=6,label+': train '+v.id+' got stuck after '+turns.get(v.id)+' turns');
  assert.ok(used.main.size===1&&used.loop.size===1&&[...used.main][0]!==[...used.loop][0],label+': directions must keep to main line and loop');
  return label+' '+[...turns.values()].join('/')+' turnarounds (main '+[...used.main]+', loop '+[...used.loop]+')';
}

// 1. By hand.
line();
get('routeMode').value='avoid';
drag(12,20);
assert.equal(construction.error,'');
const loop=construction.path;
assert.deepEqual(loop[0],{x:12,y});assert.deepEqual(loop.at(-1),{x:20,y});
const side=loop[1].y;assert.ok(Math.abs(side-y)===1,'Loop must run on the neighbouring row');
assert.ok(loop.slice(1,-1).every(p=>p.y===side),'Loop must run straight beside the line');
assert.ok(confirmConstruction(),'Building the loop failed');
for(const [x,row,dir] of [[13,y,'east'],[19,y,'east'],[13,side,'west'],[19,side,'west']])
  assert.ok(buildSignal(getTile(x,row),dir,true,'block'),'Signal '+x+','+row+' failed');
const byHand=runTrains('by hand');

// 2. With the passing-loop route mode.
line();
get('routeMode').value='loop';
drag(12,20);
assert.equal(construction.error,'');
assert.equal(construction.loop.side,1,'Default side is south of an east-west line');
assert.equal(construction.loop.signals.length,4);
const newTiles=construction.path.filter(p=>!getTile(p.x,p.y).build).length;
assert.equal(newTiles,9);assert.equal(construction.cost,newTiles*config.costs.rail+4*300);
const cash=game.cash;
assert.ok(confirmConstruction(),'Loop tool did not build');
assert.equal(game.cash,cash-newTiles*config.costs.rail-1200,'Loop tool must charge track plus four signals');
assert.deepEqual({...getTile(13,y).signal},{direction:'east',oneWay:true,type:'block'});
assert.deepEqual({...getTile(19,y+1).signal},{direction:'west',oneWay:true,type:'block'});
const withTool=runTrains('tool');

// The tool rejects unsuitable stretches and can switch sides.
line();
drag(12,15);assert.match(construction.error,/mindestens 5 Felder/);
beginConstruction(getTile(12,y),'rail');previewConstruction(getTile(14,y+3));assert.match(construction.error,/geraden Strecke/);
getTile(16,y).signal={direction:'east',oneWay:false,type:'block'};mark3dDirty();
drag(12,20);assert.match(construction.error,/kein Signal/);
getTile(16,y).signal=null;mark3dDirty();
for(let x=12;x<=20;x++)getTile(x,y+1).build='house';
drag(12,20);assert.equal(construction.error,'');assert.equal(construction.loop.side,-1,'Falls back to the free side');
for(let x=12;x<=20;x++)getTile(x,y-1).build='house';
drag(12,20);assert.match(construction.error,/keiner Seite/);
for(let x=12;x<=20;x++){getTile(x,y+1).build=null;getTile(x,y-1).build=null;}
drag(12,20);construction.loopSide=-1;previewConstruction(getTile(20,y));assert.equal(construction.loop.side,-1,'Side switch');
cancelConstruction();
get('routeMode').value='avoid';
console.log('Passing loop passed: '+byHand+'; '+withTool+'; tool checks length, straightness, signals, free side.');
`, { console, assert, get, document: { getElementById: get, querySelector: get, querySelectorAll: () => [], addEventListener() {}, createElement: element, body: { dataset: {} } }, window: { addEventListener() {}, matchMedia: () => ({ matches: false }) }, getComputedStyle: () => ({ position: 'static' }), localStorage: { getItem() { return null; }, setItem() {} }, performance, requestAnimationFrame() {}, setTimeout, clearTimeout, structuredClone, Math, JSON, globalThis: {} });
