const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const element={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:1000,height:700}),classList:{add(){},remove(){},toggle(){}},replaceChildren(){},setAttribute(){},clientWidth:1000,clientHeight:700};
const source=readFileSync(join(__dirname,'../src/railway.js'),'utf8')+'\n'
  +readFileSync(join(__dirname,'../src/towns.js'),'utf8')+'\n'
  +readFileSync(join(__dirname,'../src/physics.js'),'utf8')+'\n'
  +readFileSync(join(__dirname,'../src/game.js'),'utf8').replace(/\ninit\(\);\s*$/,'')+'\n'
  +readFileSync(join(__dirname,'../src/management.js'),'utf8').replace(/\ninitManagement\(\);\s*$/,'');
runInNewContext(source+`
makeMap();
const line=(x1,y1,x2,y2)=>Array.from({length:Math.abs(x2-x1)+Math.abs(y2-y1)+1},(_,i)=>({x:x1+Math.sign(x2-x1)*i,y:y1+Math.sign(y2-y1)*i}));
function layout(points,signals,ends){
  for(const t of game.map.flat()){Object.assign(t,{build:null,station:null,signal:null,terrain:'grass',town:null,industry:null});}
  points.forEach(p=>getTile(p.x,p.y).build='rail');
  signals.forEach(p=>getTile(p.x,p.y).signal={type:'path',direction:p.direction||'east',oneWay:false});
  game.stations=ends.map((p,id)=>({id,...p,kind:'rail',name:'PBS '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,coal:0,grain:0,goods:0},delivered:0}));
  game.stations.forEach(st=>Object.assign(getTile(st.x,st.y),{build:'stationRail',station:st.id}));
  game.vehicles=[];game.nextVehicleId=0;game.cash=90000;mark3dDirty();
}
function train(id,path,from,to,anchor=0){
  const position=anchor*(path.length-1)/(path.length-1-1.16),index=Math.floor(position);
  return {id,type:'train',path,from,to,index,dir:1,progress:position-index,carCount:3,speed:0.82,capacity:40,load:0,cargo:'passengers',profit:0,reverseMode:'classic'};
}
const a=line(2,10,26,10), b=line(2,14,26,14),connector=line(12,10,12,14);
layout([...a,...b,...connector],[{x:6,y:10},{x:20,y:10},{x:6,y:14},{x:20,y:14}],[a[0],a.at(-1),b[0],b.at(-1)]);
game.vehicles=[train(0,a,0,1),train(1,b,2,3)];game.nextVehicleId=2;
assert.equal(signalIsRed(getTile(6,10)),true,'Unreserved path signal must default to red');
let parallel=false;
for(let i=0;i<100;i++){
  updateVehicles(0.04);
  assert.ok(trafficStateValid(game),'Conflicting claims during parallel PBS paths');
  const center=railBlocks().get('12,10');
  parallel ||= game.vehicles.every(v=>trainBlocks(v).has(center));
}
assert.ok(parallel,'Disjoint paths in the same junction block must run concurrently');
assert.ok(game.vehicles.every(v=>v.pathReservation),'Both trains should own disjoint forward reservations');
const legacy=JSON.parse(JSON.stringify(createSave().state));
legacy.map.flat().forEach(t=>{if(t.signal)t.signal.type='block';});
assert.equal(trafficStateValid(legacy),false,'Test does not exercise a real shared signal block');
const saved=JSON.stringify(createSave());restoreSave(saved);
assert.ok(game.vehicles.every(v=>v.pathReservation));assert.ok(trafficStateValid(game));
const malformed=JSON.parse(saved);malformed.state.vehicles[0].pathReservation.end=10*(a.length-1)/vehicleTravelDistance(game.vehicles[0]);
assert.throws(()=>decodeSave(JSON.stringify(malformed)),'Reservation may not end with train on junction');
const malformedDirection=JSON.parse(saved);malformedDirection.state.vehicles[0].pathReservation.direction=-1;
assert.throws(()=>decodeSave(JSON.stringify(malformedDirection)));
const funds=game.cash;
assert.ok(reservedTiles().has('16,10'));
bulldoze(getTile(16,10));
assert.equal(getTile(16,10).build,'rail','Reserved forward path was demolished');
assert.equal(game.cash,funds);
assert.equal(buildSignal(getTile(16,10),'east',false,'block'),false,'Reserved forward signal was changed');
for(let i=0;i<400;i++){updateVehicles(0.04);assert.ok(trafficStateValid(game));}
assert.ok(game.vehicles.every(v=>v.dir===-1),'Reverse PBS travel was not exercised');
restoreSave(JSON.stringify(createSave()));assert.ok(trafficStateValid(game));

// Removing already-cleared track must not freeze a train inside its forward reservation.
layout([...a,...b,...connector],[{x:6,y:10},{x:20,y:10},{x:6,y:14},{x:20,y:14}],[a[0],a.at(-1),b[0],b.at(-1)]);
const clearing=train(0,a,0,1);game.vehicles=[clearing];game.nextVehicleId=1;
updateVehicles(5);
assert.ok(clearing.pathReservation);
bulldoze(getTile(4,10));
assert.equal(getTile(4,10).build,null);
assert.equal(clearing.blocked,false,'Track removed behind the train stopped its valid forward trip');
const before=trainPosition(clearing);updateVehicles(0.2);assert.ok(trainPosition(clearing)>before);

// A legacy block-signal entrance must still exclude parallel paths in the shared PBS area.
layout([...a,...b,...connector],[{x:6,y:10},{x:20,y:10},{x:6,y:14},{x:20,y:14}],[a[0],a.at(-1),b[0],b.at(-1)]);
getTile(6,10).signal.type='block';mark3dDirty();
game.vehicles=[train(0,a,0,1),train(1,b,2,3)];
updateVehicles(1.9);
assert.equal(signalIsRed(getTile(6,10)),false,'Block signal must authorize its own reserved train in a mixed area');
for(let i=0;i<100;i++){
  updateVehicles(0.04);assert.ok(trafficStateValid(game));
  const center=railBlocks().get('12,10');
  assert.ok(!game.vehicles.every(t=>trainBlocks(t).has(center)),'Block entrance lost its exclusive ownership');
}

const h=line(2,12,26,12),v=line(12,2,12,22);
const gates=[{x:6,y:12},{x:20,y:12},{x:12,y:6,direction:'south'},{x:12,y:18,direction:'south'}];
layout([...h,...v],gates,[h[0],h.at(-1),v[0],v.at(-1)]);
const approach=train(0,h,0,1),exitBlocker=train(1,h,0,1,17);exitBlocker.stopped=true;
game.vehicles=[approach,exitBlocker];game.nextVehicleId=2;
for(let i=0;i<250;i++){updateVehicles(0.04);assert.ok(trafficStateValid(game));}
assert.ok(approach.reservationWaiting,'Blocked exit should stop train before junction');
assert.ok(!trainFootprint(approach).some(p=>isJunction(p)),'Waiting train obstructs junction');
assert.ok(sampleVehiclePath(approach,0).tile.x<7,'Train crossed entry without a free exit');
assert.equal(signalIsRed(getTile(6,12)),true,'Blocked path signal must be red');
game.vehicles=[approach,train(2,v,2,3)];game.nextVehicleId=3;
let crossingReserved=false,otherWaiting=false;
for(let i=0;i<500;i++){
  updateVehicles(0.04);assert.ok(trafficStateValid(game),'Crossing reservations collided');
  crossingReserved ||= reservedTiles().has('12,12');
  otherWaiting ||= game.vehicles.some(t=>t.reservationWaiting);
}
assert.ok(crossingReserved && otherWaiting,'Crossing must grant one complete path at a time');
const releasing=train(50,h,0,1,9);
releasing.pathReservation={end:h.length-1,direction:1};
assert.ok(trainClaims(releasing).tiles.has('12,12'));
const beyond=train(50,h,0,1,11);beyond.pathReservation=releasing.pathReservation;
assert.ok(!trainClaims(beyond).tiles.has('12,12'),'Crossing reservation was not released behind the last car');

// No downstream signal far enough to fit the train beyond the crossing.
const short=line(2,12,13,12),branch=line(12,9,12,15);
layout([...short,...branch],[{x:6,y:12}],[short[0],short.at(-1)]);
const tooLong=train(0,short,0,1);tooLong.carCount=5;tooLong.capacity=80;game.vehicles=[tooLong];game.nextVehicleId=1;
for(let i=0;i<150;i++)updateVehicles(0.04);
assert.ok(tooLong.reservationWaiting);
assert.ok(!trainFootprint(tooLong).some(p=>isJunction(p)),'Long train entered without a safe stopping place');

const nearStart=line(10,12,26,12);
layout([...nearStart,...v],[{x:20,y:12},{x:12,y:6,direction:'south'},{x:12,y:18,direction:'south'}],[nearStart[0],nearStart.at(-1),v[0],v.at(-1)]);
const blockedPlacement=train(5,nearStart,0,1,9);blockedPlacement.stopped=true;game.vehicles=[blockedPlacement];game.nextVehicleId=6;
selectStation(game.stations[0]);
const cashBeforeBuy=game.cash;
buyVehicle('train',{target:'1',wagons:4});
assert.equal(game.vehicles.length,1,'Train spawned on junction without a reserved exit');
assert.equal(game.cash,cashBeforeBuy);
game.vehicles=[];buyVehicle('train',{target:'1',wagons:4});
assert.equal(game.vehicles.length,1);assert.ok(game.vehicles[0].pathReservation,'Spawn on junction must reserve its complete exit immediately');
`,{assert,document:{querySelector:()=>element,querySelectorAll:()=>[],getElementById:()=>element,createElement:()=>({})},performance:{now:()=>1},window:{devicePixelRatio:1}});
console.log('PBS passed: concurrent disjoint paths, blocked exits, crossing reservations, full-train safe stops, save validation and reserved-track protection.');
