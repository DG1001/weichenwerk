const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

const element = { getContext: () => ({}), replaceChildren() {}, classList: { add() {}, remove() {} } };
const source = readFileSync(require('node:path').join(__dirname, '../src/railway.js'), 'utf8') + '\n'
  + readFileSync(require('node:path').join(__dirname, '../src/towns.js'), 'utf8') + '\n'
  + readFileSync(require('node:path').join(__dirname, '../src/physics.js'), 'utf8') + '\n'
  + readFileSync(require('node:path').join(__dirname, '../src/game.js'), 'utf8').replace(/\ninit\(\);\s*$/, '');
runInNewContext(source + `
makeMap();
// Stations at map edges used to dereference undefined neighboring tiles.
nearbyPopulation({ x: 0, y: 0 });
nearbyIndustryTile({ x: 33, y: 25 }, 'coal');
const vehicle = {
  type: 'train', path: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2},{x:3,y:2}],
  index: 4, dir: 1, progress: 0.99999, speed: 1, load: 0
};
game.vehicles = [vehicle];
vehicle.path.forEach(p=>getTile(p.x,p.y).build='rail');
mark3dDirty();
const before = Array.from({length: vehicleCarCount(vehicle)}, (_, i) => sampleVehiclePath(vehicle, i * 0.58));
updateVehicles(0.00012);
assert.equal(vehicle.dir, 1, 'Arrival must stop before reversing');
assert.ok(vehicle.stationWait > 0);
before.forEach((sample, i) => {
  const after = sampleVehiclePath(vehicle, i * 0.58);
  assert.ok(Math.hypot(sample.tile.x - after.tile.x, sample.tile.y - after.tile.y) < 0.001, 'Car teleported at turnaround');
  assert.ok(Number.isFinite(after.heading));
});
const parked = Array.from({length: vehicleCarCount(vehicle)}, (_, i) => sampleVehiclePath(vehicle, i * 0.58));
updateVehicles(vehicle.stationWait);
assert.equal(vehicle.dir, -1, 'Train must turn after station dwell');
parked.forEach((sample, i) => {
  const turned = sampleVehiclePath(vehicle, (vehicleCarCount(vehicle) - 1 - i) * 0.58);
  assert.ok(Math.hypot(sample.tile.x-turned.tile.x,sample.tile.y-turned.tile.y) < 1e-9, 'Turning must preserve the occupied footprint');
});
const front = sampleVehiclePath(vehicle, 0);
const rear = sampleVehiclePath(vehicle, (vehicleCarCount(vehicle)-1)*0.58);
assert.ok(front.tile.x < rear.tile.x || front.tile.y < rear.tile.y, 'Locomotive must lead on return');
vehicle.index = 1; vehicle.dir = -1; vehicle.progress = 0.99999;
const nearStart = sampleVehiclePath(vehicle, 0);
updateVehicles(0.00012);
assert.equal(vehicle.dir, -1);
const afterStart = sampleVehiclePath(vehicle, 0);
assert.ok(Math.hypot(nearStart.tile.x-afterStart.tile.x,nearStart.tile.y-afterStart.tile.y) < 0.001);
updateVehicles(vehicle.stationWait);
assert.equal(vehicle.dir, 1);
vehicle.path = [{x:0,y:0},{x:1,y:0}]; vehicle.index=0; vehicle.progress=0;
assert.equal(vehicleCarCount(vehicle), 1, 'Short routes must not stack five cars');
for (const type of ['train', 'truck']) {
  const speed = type === 'train' ? 0.82 : 0.58;
  const distances = [];
  for (const length of [3, 5, 20]) {
    const moving = { type, speed, path: Array.from({length}, (_, x) => ({x,y:0})), index:0, dir:1, progress:0 };
    game.vehicles = [moving];
    const start = sampleVehiclePath(moving, 0).tile.x;
    updateVehicles(0.1);
    const end = sampleVehiclePath(moving, 0).tile.x;
    distances.push(end-start);
    assert.ok(end-start>0 && end-start<0.1*(type==='train'?1.64:1.16),'Vehicle must accelerate without exceeding cruise speed');
    moving.index = length-1; moving.dir = -1; moving.progress = 0;moving.velocity=0;
    const returnStart = sampleVehiclePath(moving, 0).tile.x;
    updateVehicles(0.1);
    assert.ok(Math.abs(returnStart - sampleVehiclePath(moving, 0).tile.x - distances.at(-1)) < 1e-9, 'Return speed differs');
  }
}
game.vehicles = [];
game.speed = 1; game.dayProgress = 0; game.month = 0;
update(12000);
assert.equal(game.dayProgress, 1, 'One day should take twelve seconds at 1x');
game.speed = 0;
update(12000);
assert.equal(game.dayProgress, 1, 'Pause must stop the calendar');
game.speed = 4;
update(3000);
assert.equal(game.dayProgress, 2, '4x must advance calendar consistently');
game.speed = 1; game.dayProgress = 29;
update(12000);
assert.equal(game.month, 1, 'Month must roll over after thirty days');
assert.equal(game.dayProgress, 0);
const timedTrain = {type:'train',speed:0.82,path:Array.from({length:20},(_,x)=>({x,y:0})),index:0,dir:1,progress:0};
game.vehicles = [timedTrain];
const position = sampleVehiclePath(timedTrain,0).tile.x;
update(1000);
assert.ok(sampleVehiclePath(timedTrain,0).tile.x>position && timedTrain.velocity>0 && timedTrain.velocity<1.64, 'Calendar update must advance accelerating train');
game.vehicles = [];
game.cash = 90000;
const edge = getTile(0, 0);
edge.terrain='grass'; edge.build='stationRail'; edge.station=0;
buildRail(edge); buildRoad(edge); buildStation(edge);
assert.equal(edge.build, 'stationRail', 'Station zero must be protected');
assert.equal(game.cash, 90000);
vehicle.load=12; vehicle.cargo='coal';
loadVehicle(vehicle,{produces:['goods'],waiting:{goods:99}}, {accepts:['goods']});
assert.equal(vehicle.load,12, 'Undelivered cargo must not disappear');
vehicle.load=0;
loadVehicle(vehicle,{produces:['goods'],waiting:{goods:99}},{accepts:['goods']});
assert.equal(vehicle.cargo,'coal','Wagons must not automatically refit at each station');
assert.equal(vehicle.load,0);

const station=(id,x,y,produces,accepts,sources=[])=>({id,x,y,name:'Test '+id,kind:'rail',produces,accepts,sources,waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0});
const mine=station(0,28,20,['coal'],[],['industry:0']);
const factory=station(1,20,12,['goods'],['coal','grain'],['industry:2']);
const city=station(2,12,21,['passengers'],['passengers','goods'],['town:2']);
game.stations=[mine,factory,city];
produceCargo(30);
assert.equal(mine.waiting.coal,90,'Mine must produce its advertised monthly output');
assert.equal(factory.waiting.goods,0,'Factory requires delivered inputs');
const duplicate=station(3,29,20,['coal'],[],['industry:0']);
game.stations.push(duplicate);mine.waiting.coal=0;
produceCargo(30);
assert.equal(mine.waiting.coal + duplicate.waiting.coal,90,'Overlapping catchments must share supply');
const freight={type:'train',from:0,to:1,dir:1,path:[{x:28,y:20},{x:20,y:12}],cargo:'coal',load:20,capacity:80,profit:0};
visitStation(freight);
assert.equal(factory.delivered,20);
assert.equal(game.industries[2].stock,20);
assert.equal(freight.load,0,'Coal wagons return empty instead of loading goods');
const earned=freight.profit;
visitStation(freight);
assert.equal(freight.profit,earned,'Empty visits must not pay twice');
produceCargo(30);
assert.equal(factory.waiting.goods,20,'Factory must convert only available inputs');
assert.equal(game.industries[2].stock,0);
assert.equal(routeCargo(mine,city),undefined,'Passenger-only destination cannot accept coal');
assert.equal(routeCargo(mine,factory),'coal');

game.vehicles=[];
for(let x=0;x<=6;x++){const tile=getTile(x,25);tile.terrain='grass';tile.build='rail';tile.station=null;}
const a=station(0,0,25,['passengers'],['passengers']);
const b=station(1,6,25,['passengers'],['passengers']);
game.stations=[a,b];
getTile(0,25).build='stationRail';getTile(0,25).station=0;
getTile(6,25).build='stationRail';getTile(6,25).station=1;
mark3dDirty();
const path=findPath(a,b,'rail');
assert.equal(path.length,7);
assert.equal(findPath(a,b,'road'),null);
const active={id:999,type:'train',from:0,to:1,path,index:0,dir:1,progress:0,speed:0.82,load:0,cargo:'passengers',capacity:80,profit:0};
game.vehicles=[active];
const cashBefore=game.cash;
game.selected={station:a};
buyVehicle('train');
assert.equal(game.vehicles.length,1,'Overlapping rail routes must not spawn colliding trains');
assert.equal(game.cash,cashBefore,'Rejected purchase must not charge money');
bulldoze(getTile(0,25));
assert.equal(getTile(0,25).station,0,'Active station cannot be deleted with its train');
assert.equal(game.cash,cashBefore,'Rejected demolition must not cost money');
bulldoze(getTile(2,25));
assert.equal(getTile(2,25).build,'rail','Occupied track cannot be demolished');
bulldoze(getTile(4,25));
assert.equal(active.blocked,true);
const stopped=active.index;
updateVehicles(1);
assert.equal(active.index,stopped,'Broken route must stop the train');
buildRail(getTile(4,25));
updateVehicles(0.1);
assert.equal(active.blocked,false,'Repair must unblock the train');

const clone=()=>({...active,index:0,dir:1,progress:0,stationWait:0,load:0});
const one=clone();game.vehicles=[one];updateVehicles(15);
const many=clone();game.vehicles=[many];for(let i=0;i<150;i++)updateVehicles(0.1);
assert.equal(one.dir,many.dir);
assert.ok(Math.abs(one.index+one.dir*one.progress-many.index-many.dir*many.progress)<1e-7,'Movement and dwell must be frame-rate independent');
`, { document: { querySelector: () => element, querySelectorAll: () => [], createElement: () => ({}) }, performance: { now: () => 0 }, assert });
console.log('Simulation regressions passed: classic reversal, dwell, locomotive leading, supply conservation, production chain, cargo binding, route reservation, demolition, repair, time steps and calendar.');
