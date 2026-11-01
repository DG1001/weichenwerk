const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const element={value:'rail',getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:1000,height:700}),classList:{add(){},remove(){},toggle(){}},replaceChildren(){},clientWidth:1000,clientHeight:700};
const source=['railway','towns','physics','game','management'].map(name=>readFileSync(join(__dirname,'../src/'+name+'.js'),'utf8').replace(/\ninit(?:Management)?\(\);\s*$/,'')).join('\n');
runInNewContext(source+`
makeMap();
const line=(x1,y1,x2,y2)=>Array.from({length:Math.abs(x2-x1)+Math.abs(y2-y1)+1},(_,i)=>({x:x1+Math.sign(x2-x1)*i,y:y1+Math.sign(y2-y1)*i}));
function layout(path,signals=[]){
 for(const tile of game.map.flat())Object.assign(tile,{build:null,station:null,signal:null,terrain:'grass',town:null,industry:null});
 path.forEach(p=>getTile(p.x,p.y).build='rail');
 game.stations=[path[0],path.at(-1)].map((p,id)=>({id,...p,name:'Physics '+id,kind:'rail',produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0}));
 game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));
 signals.forEach(p=>getTile(p.x,p.y).signal={type:'block',direction:'east',oneWay:false});
 game.vehicles=[];game.nextVehicleId=0;game.cash=100000;mark3dDirty();
}
function train(path,anchor=0,dir=1,count=3){
 const p=anchor*(path.length-1)/(path.length-1-(count-1)*0.58),index=dir>0?Math.floor(p):Math.ceil(p);
 return {id:game.nextVehicleId++,type:'train',from:0,to:1,path,index,dir,progress:Math.abs(p-index),carCount:count,capacity:(count-1)*20,load:0,cargo:'passengers',speed:0.82,profit:0,velocity:0,loadMode:'available',reverseMode:'classic'};
}
const straight=line(1,20,31,20);
layout(straight);const light=train(straight);game.vehicles=[light];
updateVehicles(0.2);assert.ok(light.velocity>0&&light.velocity<0.3);
const lightSpeed=light.velocity;
updateVehicles(3);assert.ok(Math.abs(light.velocity-1.64)<1e-9,'Straight-line cruise speed changed');
layout(straight);const heavy=train(straight);heavy.load=heavy.capacity;game.vehicles=[heavy];updateVehicles(0.2);
assert.ok(heavy.velocity<lightSpeed,'Load must affect acceleration');
for(const direction of [1,-1]){
 layout(straight);const distance=vehicleTravelDistance({type:'train',path:straight,carCount:3});
 const braking=train(straight,direction>0?distance-0.8:0.8,direction);braking.velocity=1.64;game.vehicles=[braking];
 updateVehicles(0.1);assert.ok(braking.velocity<1.64&&braking.velocity>0,'Train did not brake before station');
 for(let i=0;i<200&&!braking.servicePhase;i++)updateVehicles(0.02);
 assert.equal(braking.velocity,0);assert.ok(braking.servicePhase);assert.equal(braking.index,direction>0?straight.length-1:0);
}
layout(straight,[{x:10,y:20},{x:20,y:20}]);
const follower=train(straight,5.5);follower.velocity=1.64;
const blocker=train(straight,13);blocker.stopped=true;game.vehicles=[follower,blocker];
let slowed=false;
for(let i=0;i<300;i++){updateVehicles(0.02);assert.ok(trafficStateValid(game));slowed ||= follower.velocity>0.05&&follower.velocity<1.5;}
assert.ok(slowed&&follower.signalWaiting&&follower.velocity===0,'Train must decelerate and stop at red');
const held=trainPosition(follower);blocker.stopped=false;
for(let i=0;i<400;i++){updateVehicles(0.02);assert.ok(trafficStateValid(game));}
assert.ok(trainPosition(follower)>held,'Train did not accelerate after green');

const curve=[...line(1,10,12,10),...line(12,11,12,24)];
layout(curve);const bent=train(curve,6);bent.velocity=1.64;game.vehicles=[bent];
let inCurve=false,recovered=false;
for(let i=0;i<500;i++){
 updateVehicles(0.02);const anchor=trainPosition(bent)*vehicleTravelDistance(bent)/(curve.length-1),span=1.16;
 if(anchor+span>=11&&anchor<=11.35){inCurve=true;assert.ok(bent.velocity<=1.64*0.65+0.035,'Sharp curve taken too fast');}
 if(anchor>13&&bent.velocity>1.6)recovered=true;
}
assert.ok(inCurve&&recovered,'Curve slowdown or recovery missing');

layout(straight);const stopped=train(straight,5);stopped.velocity=1.64;stopped.stopped=true;game.vehicles=[stopped];
updateVehicles(0.1);assert.ok(stopped.velocity>0&&stopped.velocity<1.64,'Manual stop should brake');
updateVehicles(2);assert.equal(stopped.velocity,0);
const stop=trainPosition(stopped);updateVehicles(1);assert.equal(trainPosition(stopped),stop);

layout(straight);const loading=train(straight,0,1,5);game.vehicles=[loading];game.stations[0].waiting.passengers=80;
beginStationService(loading,true);updateVehicles(2);
const shortLoaded=loading.load;assert.ok(shortLoaded>0&&shortLoaded<80,'Cargo must load gradually');
const sourceBefore=game.stations[0].waiting.passengers;const partial=JSON.stringify(createSave());restoreSave(partial);
assert.equal(game.vehicles[0].load,shortLoaded);assert.equal(game.stations[0].waiting.passengers,sourceBefore);
for(let i=0;i<1000&&game.vehicles[0].loadingAtOrigin;i++)updateVehicles(0.02);
assert.equal(game.vehicles[0].load,80);assert.equal(game.stations[0].waiting.passengers,0);
const unloading=game.vehicles[0];setVehiclePosition(unloading,straight.length-1);beginStationService(unloading,false);
const beforeMoney=game.cash;updateVehicles(0.5);
assert.ok(unloading.load>0&&unloading.load<80);assert.ok(game.cash>beforeMoney);
restoreSave(JSON.stringify(createSave()));const resumed=game.vehicles[0];
for(let i=0;i<1500&&resumed.dir===1;i++)updateVehicles(0.02);
assert.equal(resumed.dir,-1);assert.equal(game.stations[1].delivered,80);
assert.equal(game.cash-beforeMoney,80*(straight.length*9+52),'Partial unload paid twice or lost cargo');

layout(straight);element.value='rail';buildStation(getTile(2,20));buildStation(getTile(3,20));
assert.equal(stationTiles(game.stations[0]).length,3,'Adjacent fields did not extend the station');
assert.equal(getTile(3,20).station,0);assert.equal(game.cash,98400);
game.stations[0].produces=['passengers'];
const long=train(straight,0,1,5);game.vehicles=[long];game.stations[0].waiting.passengers=80;beginStationService(long,true);updateVehicles(2);
assert.ok(long.load>shortLoaded*2,'Long platform must improve loading rate');
restoreSave(JSON.stringify(createSave()));assert.equal(stationTiles(game.stations[0]).length,3);
const corrupted=JSON.parse(JSON.stringify(createSave()));corrupted.state.stations[0].tiles[1].x=8;
assert.throws(()=>decodeSave(JSON.stringify(corrupted)),'Noncontiguous platform accepted');

layout(straight);const full=train(straight);full.loadMode='full';game.vehicles=[full];beginStationService(full,true);updateVehicles(10);
assert.equal(full.index,0);assert.equal(full.load,0);game.stations[0].waiting.passengers=40;updateVehicles(0.02);
assert.ok(full.load<40,'Waiting must not bank unlimited loading credits');
const phase=full.servicePhase,carry=full.serviceCarry;startStopVehicle(full);updateVehicles(1);startStopVehicle(full);
assert.equal(full.servicePhase,phase);assert.equal(full.serviceCarry,carry,'Pause/resume reset an active loading step');
const valid=JSON.stringify(createSave());
for(const fields of [{velocity:-1},{velocity:NaN},{servicePhase:'invalid'},{serviceCarry:-1},{serviceRevenue:-1},{serviceLoadTarget:1001}]){
 const bad=JSON.parse(valid);Object.assign(bad.state.vehicles[0],fields);assert.throws(()=>decodeSave(JSON.stringify(bad)));
}

layout(straight);const a=train(straight);game.vehicles=[a];updateVehicles(4);const distance=trainPosition(a),speed=a.velocity;
layout(straight);const b=train(straight);game.vehicles=[b];for(let i=0;i<40;i++)updateVehicles(0.1);
assert.ok(Math.abs(trainPosition(b)-distance)<1e-6&&Math.abs(b.velocity-speed)<1e-6,'Physics depends on frame partition');

layout(straight);buildStation(getTile(2,20));buildStation(getTile(3,20));
const beforeEdit=game.cash;
buildStation(getTile(3,19));assert.equal(getTile(3,19).station,null,'Bent platform accepted');
bulldoze(getTile(1,20));bulldoze(getTile(2,20));assert.equal(game.cash,beforeEdit,'Rejected demolition charged money');
bulldoze(getTile(3,20));assert.equal(stationTiles(game.stations[0]).length,2);
bulldoze(getTile(2,20));assert.equal(stationTiles(game.stations[0]).length,1);
for(let x=2;x<=8;x++)buildStation(getTile(x,20));
const maxCash=game.cash;buildStation(getTile(9,20));
assert.equal(stationTiles(game.stations[0]).length,8);assert.equal(game.cash,maxCash,'Oversized platform charged money');
restoreSave(JSON.stringify(createSave()));assert.equal(stationTiles(game.stations[0]).length,8);
`,{assert,element,document:{querySelector:()=>element,querySelectorAll:()=>[],getElementById:()=>element,createElement:()=>({})},performance:{now:()=>1},window:{devicePixelRatio:1}});
console.log('Physics passed: acceleration, weight, station/signal/manual braking, curve limits, gradual service, long platforms, exact payments and mid-service saves.');
