const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

// Verifies the passing-loop recipe from help.html: drag from one track tile to another on the same
// line with "Hindernisse umfahren", then four one-way block signals. Two trains running towards
// each other on a single line must pass in the loop again and again without deadlock.
const nodes = new Map();
const element = () => ({ value: 'avoid', checked: true, textContent: '', hidden: false, disabled: false, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, replaceChildren() {}, append() {}, addEventListener() {}, getBoundingClientRect: () => ({ width: 1000, height: 700 }), clientWidth: 1000, clientHeight: 700, getContext: () => ({}) });
const get = id => { id = String(id).replace(/^#/, ''); if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
const source = ['vendor/pathfinding-0.4.18.min', 'vendor/simplex-noise-4.0.3.min', 'landscape', 'towns', 'railway', 'construction', 'physics', 'game']
  .map(n => readFileSync(join(__dirname, '../src/' + n + '.js'), 'utf8').replace(/\ninit(?:Management)?\(\);\s*$/, '')).join('\n');

runInNewContext(source + `
makeMap();game.speed=1;
for(const tile of game.map.flat())Object.assign(tile,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});
game.towns=[];game.industries=[];game.vehicles=[];game.cash=500000;
const station=(id,x,y)=>({id,x,y,kind:'rail',name:'Ende '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,coal:0,grain:0,goods:0},delivered:0});
const y=12;
for(let x=2;x<=30;x++)getTile(x,y).build='rail';
game.stations=[station(0,2,y),station(1,30,y)];
for(const st of game.stations){getTile(st.x,st.y).build='stationRail';getTile(st.x,st.y).station=st.id;}
mark3dDirty();

// Step 1: drag from (12,y) to (20,y) with "Hindernisse umfahren" -> a parallel track around the line.
beginConstruction(getTile(12,y),'rail');previewConstruction(getTile(20,y));finishConstruction();
assert.equal(construction.error,'');
const loop=construction.path;
assert.deepEqual(loop[0],{x:12,y});assert.deepEqual(loop.at(-1),{x:20,y});
const side=loop[1].y;assert.ok(Math.abs(side-y)===1,'Loop must run on the neighbouring row');
assert.ok(loop.slice(1,-1).every(p=>p.y===side),'Loop must run straight beside the line');
assert.ok(confirmConstruction(),'Building the loop failed');

// Step 2: four one-way block signals, main line eastbound, loop westbound.
for(const [x,row,dir] of [[13,y,'east'],[19,y,'east'],[13,side,'west'],[19,side,'west']])
  assert.ok(buildSignal(getTile(x,row),dir,true,'block'),'Signal '+x+','+row+' failed');

// Step 3: one train from each end, running towards each other.
selectStation(game.stations[0]);buyVehicle('train',{wagons:3});
selectStation(game.stations[1]);buyVehicle('train',{wagons:3});
assert.equal(game.vehicles.length,2);
// A turnaround reverses the stored path, so count changes of destination instead of v.dir.
const turns=new Map(game.vehicles.map(v=>[v.id,0])),last=new Map(game.vehicles.map(v=>[v.id,v.to]));
const used={main:new Set(),loop:new Set()};
for(let i=0;i<24000;i++){
  updateVehicles(0.05);
  assert.ok(trafficStateValid(game),'Two trains share a block');
  for(const v of game.vehicles){
    if(v.to!==last.get(v.id)){turns.set(v.id,turns.get(v.id)+1);last.set(v.id,v.to);}
    const p=v.path[Math.round(trainPosition(v))];
    if(p&&p.x===16)(p.y===y?used.main:used.loop).add(v.id+':'+(v.to===1?'east':'west'));
  }
}
for(const v of game.vehicles)assert.ok(turns.get(v.id)>=6,'Train '+v.id+' got stuck: only '+turns.get(v.id)+' turns');
// Each direction keeps to its own track in the loop section.
const dirs=s=>new Set([...s].map(k=>k.split(':')[1]));
assert.ok(dirs(used.main).size===1&&dirs(used.loop).size===1&&[...dirs(used.main)][0]!==[...dirs(used.loop)][0],'Directions must keep to main line and loop: '+[...used.main]+' / '+[...used.loop]);
console.log('Passing loop passed: '+[...turns.values()].join(' and ')+' turnarounds, main line '+[...dirs(used.main)]+', loop '+[...dirs(used.loop)]+'.');
`, { console, assert, document: { getElementById: get, querySelector: get, querySelectorAll: () => [], addEventListener() {}, createElement: element, body: { dataset: {} } }, window: { addEventListener() {}, matchMedia: () => ({ matches: false }) }, getComputedStyle: () => ({ position: 'static' }), localStorage: { getItem() { return null; }, setItem() {} }, performance, requestAnimationFrame() {}, setTimeout, clearTimeout, structuredClone, Math, JSON, globalThis: {} });
