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
const station=(id,p)=>({id,...p,kind:'rail',name:'Test '+id,produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,coal:0,grain:0,goods:0},delivered:0});
function layout(points,signals,ends){
  for(const tile of game.map.flat()){tile.build=null;tile.station=null;tile.signal=null;tile.terrain='grass';tile.town=null;tile.industry=null;}
  for(const p of points)getTile(p.x,p.y).build='rail';
  for(const p of signals)getTile(p.x,p.y).signal={direction:p.direction||'east',oneWay:p.oneWay||false};
  game.stations=ends.map((p,i)=>station(i,p));
  for(const st of game.stations){getTile(st.x,st.y).build='stationRail';getTile(st.x,st.y).station=st.id;}
  game.vehicles=[];game.nextVehicleId=0;game.cash=200000;mark3dDirty();
}
function train(id,path,anchor,dir=1,count=3,from=0,to=1){
  const p=anchor*(path.length-1)/(path.length-1-(count-1)*0.58);
  const index=dir>0?Math.floor(p):Math.ceil(p);
  return {id,type:'train',path,from,to,index,dir,progress:Math.abs(p-index),carCount:count,speed:0.82,load:0,cargo:'passengers',capacity:(count-1)*20,profit:0,reverseMode:'classic'};
}
function safe(){assert.ok(trafficStateValid(game),'Two trains occupy the same block');}
const path=line(0,10,22,10);
layout(path,[{x:5,y:10},{x:11,y:10},{x:17,y:10}],[path[0],path.at(-1)]);
selectStation(game.stations[0]);buyVehicle('train',{wagons:2});
const leader=game.vehicles[0];updateVehicles(6);
selectStation(game.stations[0]);buyVehicle('train',{wagons:2});
assert.equal(game.vehicles.length,2,'Free start block should accept a second train on the same route');
const follower=game.vehicles[1];leader.stopped=true;
for(let i=0;i<200;i++){updateVehicles(0.04);safe();}
assert.equal(follower.signalWaiting,true,'Follower must wait behind occupied block');
const waitingPosition=trainPosition(follower);
leader.stopped=false;
for(let i=0;i<80;i++){updateVehicles(0.04);safe();}
assert.ok(trainPosition(follower)>waitingPosition,'Follower did not resume after block cleared');
// Head has passed the signal, but tail still owns the preceding block.
const long=train(20,path,10.1,1,5);game.vehicles=[long];
const oldBlock=railBlocks().get('6,10');
assert.ok(trainBlocks(long).has(oldBlock));
Object.assign(long,train(20,path,10.8,1,5));
assert.ok(!trainBlocks(long).has(oldBlock),'Rear must release block only after complete clearance');

layout(path,[{x:5,y:10},{x:11,y:10},{x:17,y:10}],[path[0],path.at(-1)]);
game.vehicles=[train(0,path,0),train(1,path,vehicleTravelDistance({path,type:'train',carCount:3}),-1)];
for(let i=0;i<400;i++){updateVehicles(0.04);safe();}
assert.ok(game.vehicles.every(v=>v.signalWaiting),'Opposing trains must safely stop rather than pass through each other');

const horizontal=line(2,12,18,12),vertical=line(10,4,10,20);
layout([...horizontal,...vertical],[{x:7,y:12},{x:13,y:12},{x:10,y:9,direction:'south'},{x:10,y:15,direction:'south'}],[horizontal[0],horizontal.at(-1),vertical[0],vertical.at(-1)]);
game.vehicles=[train(0,horizontal,0,1,3,0,1),train(1,vertical,0,1,3,2,3)];
let yielded=false;
for(let i=0;i<250;i++){updateVehicles(0.04);safe();yielded ||= game.vehicles.some(v=>v.signalWaiting);}
assert.ok(yielded,'Crossing conflict was not protected');

layout(path,[{x:10,y:10}],[path[0],path.at(-1)]);
game.vehicles=[train(0,path,3),train(1,path,15)];
const funds=game.cash;
bulldoze(getTile(10,10));
assert.ok(getTile(10,10).signal,'Removing a separating signal must not merge two occupied blocks');
assert.equal(game.cash,funds);
assert.equal(buildSignal(getTile(4,10),'east',false),false,'Signals cannot be edited under a train');
game.nextVehicleId=2;
const valid=JSON.stringify(createSave());
restoreSave(valid);safe();
const bad=JSON.parse(valid);bad.state.vehicles[1].index=bad.state.vehicles[0].index;bad.state.vehicles[1].progress=bad.state.vehicles[0].progress;
const snapshot=JSON.stringify(createSave().state);
assert.throws(()=>restoreSave(JSON.stringify(bad)));
assert.equal(JSON.stringify(createSave().state),snapshot,'Invalid multi-train save mutated state');
const malformed=JSON.parse(valid);malformed.state.map[10][10].signal.direction='diagonal';
assert.throws(()=>decodeSave(JSON.stringify(malformed)));

const direct=line(2,10,18,10),upper=line(2,7,18,7),left=line(2,7,2,10),right=line(18,7,18,10);
layout([...direct,...upper,...left,...right],[{x:7,y:10,direction:'east',oneWay:true},{x:10,y:7,direction:'west',oneWay:true}],[direct[0],direct.at(-1)]);
const outward=findPath(game.stations[0],game.stations[1],'rail');
const returning=findPath(game.stations[1],game.stations[0],'rail');
assert.equal(outward.length,17);assert.ok(returning.some(p=>p.y===7),'Return route ignored one-way signals');
const loop=train(0,outward,vehicleTravelDistance({path:outward,type:'train',carCount:3}));
loop.index=outward.length-1;loop.progress=0;loop.stationWait=1.2;game.vehicles=[loop];
updateVehicles(1.2);
assert.equal(loop.from,1);assert.equal(loop.to,0);assert.ok(loop.path.some(p=>p.y===7));safe();
game.vehicles=[train(0,outward,0,1,3,0,1),train(1,returning,0,1,3,1,0)];
const turns=[0,0],origins=game.vehicles.map(v=>v.from);
for(let i=0;i<1000;i++){
  updateVehicles(0.04);safe();
  game.vehicles.forEach((v,j)=>{if(v.from!==origins[j]){turns[j]++;origins[j]=v.from;}});
}
assert.ok(turns.every(count=>count>=2),'Directed loop failed to run both trains through multiple return trips');
// Close the return corridor: the train must wait, then resume when repaired.
layout(direct,[{x:7,y:10,direction:'east',oneWay:true}],[direct[0],direct.at(-1)]);
const trapped=train(0,direct,0);trapped.index=direct.length-1;trapped.progress=0;trapped.stationWait=1.2;game.vehicles=[trapped];
updateVehicles(2);assert.equal(trapped.routeWaiting,true);assert.equal(trapped.dir,1);
getTile(7,10).signal.oneWay=false;mark3dDirty();updateVehicles(0.6);
assert.equal(trapped.routeWaiting,false);assert.equal(trapped.dir,-1);
`,{assert,document:{querySelector:()=>element,querySelectorAll:()=>[],getElementById:()=>element,createElement:()=>({})},performance:{now:()=>1},window:{devicePixelRatio:1}});
console.log('Railway passed: same-route following, tail clearance, head-on protection, crossing exclusion, topology edits, save validation and directed return routes.');
