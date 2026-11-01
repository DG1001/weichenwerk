const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

const element = {
  getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({width:1000,height:700}),
  classList: {add(){},remove(){},toggle(){}}, replaceChildren(){}, append(){}, setAttribute(){},
  clientWidth:1000, clientHeight:700
};
const script = readFileSync(join(__dirname, '../src/railway.js'), 'utf8') + '\n'
  + readFileSync(join(__dirname, '../src/towns.js'), 'utf8') + '\n'
  + readFileSync(join(__dirname, '../src/physics.js'), 'utf8') + '\n'
  + readFileSync(join(__dirname, '../src/game.js'), 'utf8').replace(/\ninit\(\);\s*$/, '')
  + '\n' + readFileSync(join(__dirname, '../src/management.js'), 'utf8').replace(/\ninitManagement\(\);\s*$/, '');
const storage = new Map();
runInNewContext(script + `
makeMap();
for(let x=0;x<=8;x++){const tile=getTile(x,25);tile.terrain='grass';tile.build='rail';tile.station=null;}
const station=(id,x)=>({id,x,y:25,kind:'rail',name:'Station '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0});
game.stations=[station(0,0),station(1,8),station(2,1)];
for(const st of game.stations){const tile=getTile(st.x,st.y);tile.station=st.id;tile.build='stationRail';}
mark3dDirty();
selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'passengers',wagons:4});
assert.equal(game.vehicles.length,1);
assert.equal(game.vehicles[0].carCount,5);
const original=JSON.stringify(createSave());
assert.equal(createSave().view,'3d');
assert.equal(Object.hasOwn(createSave(),'camera'),false,'New saves still contain a 2D camera');
const cash=game.cash;
game.cash=1;game.vehicles[0].index=4;
restoreSave(original);
assert.equal(game.cash,cash);
assert.equal(game.vehicles[0].index,0);
const legacy=JSON.parse(original);legacy.view='2d';legacy.camera={x:200,y:-80,zoom:1.25};
const migrated=restoreSave(JSON.stringify(legacy));
assert.equal(migrated.view,'3d');assert.equal(createSave().view,'3d');
assert.deepEqual(createSave().orbit,legacy.orbit,'Legacy import lost the 3D camera');
assert.deepEqual(game.map,legacy.state.map,'Legacy import changed the map');
const restored=game.vehicles[0];
restored.index=3;restored.progress=0.4;restored.stationWait=0;restored.servicePhase=null;restored.loadingAtOrigin=false;
const underway=JSON.stringify(createSave());
restoreSave(underway);
assert.equal(game.vehicles[0].index,3);assert.equal(game.vehicles[0].progress,0.4);
for(const corrupt of [
  file=>file.version=999,
  file=>file.state.map.pop(),
  file=>file.state.vehicles[0].path[1].x=7,
  file=>file.state.vehicles[0].load=100000,
  file=>file.state.vehicles[0].stationWait=5,
  file=>file.state.stations[0].x=3,
  file=>file.state.vehicles[0].stopped='false'
]){
  const bad=JSON.parse(underway);corrupt(bad);
  const before=JSON.stringify(createSave().state);
  assert.throws(()=>restoreSave(JSON.stringify(bad)));
  assert.equal(JSON.stringify(createSave().state),before,'Rejected load mutated live state');
}
restoreSave(original);
const train=game.vehicles[0];
train.stopped=true;
const parked=sampleVehiclePath(train,0).tile.x;
updateVehicles(1);assert.equal(sampleVehiclePath(train,0).tile.x,parked);
const badCash=game.cash;
assert.equal(applyVehicleOrder(train,{target:'2',cargo:'passengers',wagons:4,loadMode:'available',reverseMode:'classic'}),false);
assert.equal(game.cash,badCash);
assert.equal(applyVehicleOrder(train,{target:'1',cargo:'coal',wagons:2,loadMode:'available',reverseMode:'classic'}),false);
assert.equal(applyVehicleOrder(train,{target:'1',cargo:'passengers',wagons:2,loadMode:'full',reverseMode:'backwards'}),true);
assert.equal(train.carCount,3);assert.equal(train.capacity,40);
startStopVehicle(train);
updateVehicles(1);
assert.ok(train.loadingAtOrigin && train.servicePhase==='load');
assert.equal(train.index,0,'Full-load train left empty');
restoreSave(JSON.stringify(createSave()));
const full=game.vehicles[0];
game.stations[0].waiting.passengers=40;
updateVehicles(0.5);assert.ok(full.load>0&&full.load<40,'Loading should be gradual');
for(let i=0;i<500&&full.loadingAtOrigin;i++)updateVehicles(0.02);
assert.equal(full.load,40);updateVehicles(0.1);assert.ok(full.index+full.progress>0);
full.loadMode='available';full.index=full.path.length-1;full.progress=0;full.dir=1;full.velocity=0;full.stationWait=1.2;full.servicePhase='unload';full.serviceCarry=0;
const wait=JSON.stringify(createSave());restoreSave(wait);
assert.equal(game.vehicles[0].stationWait,1.2);
const back=game.vehicles[0];for(let i=0;i<1000&&back.dir===1;i++)updateVehicles(0.02);
assert.equal(back.dir,-1);
assert.equal(back.load,0);
assert.ok(sampleVehiclePath(back,0).tile.x>sampleVehiclePath(back,1.16).tile.x,'Push mode should keep physical car order');
assert.equal(sellVehicle(back),false,'Moving train sold');
back.stopped=true;back.load=2;
assert.equal(sellVehicle(back),false,'Loaded train sold');
back.cargoOrigin=1;
const originalCash=game.cash;
const queued=game.stations[1].waiting.passengers;
assert.equal(unloadForDepot(back),true);
assert.equal(game.cash,originalCash,'Returning cargo to its source must not pay');
assert.equal(game.stations[1].waiting.passengers,queued+2);
const beforeSale=game.cash;
assert.equal(sellVehicle(back),true);
assert.equal(game.vehicles.length,0);
assert.ok(game.cash>beforeSale);
assert.equal(saveGame(true),true);
assert.ok(storage.has(saveKey));
`, {
  assert, storage, document: {querySelector:()=>element,querySelectorAll:()=>[],getElementById:()=>element,createElement:()=>({})},
  performance:{now:()=>1}, window:{devicePixelRatio:1}, localStorage:{setItem:(key,value)=>storage.set(key,value)}, Date
});
console.log('Management passed: save/restore during travel/loading/reversal, corrupt files, pause, manual orders, refit, full-load, push mode, sale.');
