const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map();
const element=()=>({value:'rail',dataset:{},children:[],getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:1000,height:700}),classList:{add(){},remove(){},toggle(){}},replaceChildren(...children){this.children=children;},append(child){this.children.push(child);},setAttribute(){},clientWidth:1000,clientHeight:700});
const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const source=['railway','towns','physics','game','management'].map(n=>readFileSync(join(__dirname,'../src/'+n+'.js'),'utf8').replace(/\ninit(?:Management)?\(\);\s*$/,'')).join('\n');
runInNewContext(source+`
makeMap();
function setup(){
 for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,town:null,industry:null,station:null,signal:null});delete t.links;}
 Object.assign(game,{towns:[],industries:[],stations:[],vehicles:[],nextVehicleId:0,cash:90000,loan:0,month:0,dayProgress:0,speed:1,log:[]});
 addTown('Alpha',8,10,100);addTown('Beta',24,10,120);
 game.stations=[10,22].map((x,id)=>({id,x,y:10,kind:'rail',name:'City '+id,produces:['passengers'],accepts:['passengers','goods'],waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0,sources:['town:'+id]}));
 for(let x=10;x<=22;x++)getTile(x,10).build='rail';
 game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));mark3dDirty();
}
function feedTown(townStation=game.stations[0],goods=true){
 for(let id=0;id<3;id++)recordTownTransport({id,cargo:'passengers',serviceSerial:game.month+1},townStation,10,true);
 if(goods)for(let id=3;id<5;id++)recordTownTransport({id,cargo:'goods',serviceSerial:game.month+1},townStation,6);
}
function month(){game.month++;monthlyAccounting();}

setup();const initial=game.towns[0].population,houses=game.map.flat().filter(t=>t.build==='house').length;
for(let i=0;i<3;i++)month();assert.equal(game.towns[0].population,initial);assert.equal(game.map.flat().filter(t=>t.build==='house').length,houses);
assert.equal(game.towns[0].growth.last.status,'unserved');

setup();const town=game.towns[0],station=game.stations[0],p={id:0,cargo:'passengers',serviceSerial:1};
recordTownTransport(p,station,10,true);recordTownTransport(p,station,5,true);recordTownTransport(p,station,3);
assert.equal(town.growth.passengersOut,15);assert.equal(town.growth.passengersIn,3);assert.equal(town.growth.passengerCalls.length,1,'Partial loads inflated visits');
recordTownTransport({...p,inDepot:true},station,100,true);assert.equal(town.growth.passengersOut,15,'Rescue depot generated traffic');
recordTownTransport({id:7,cargo:'goods',serviceSerial:1},station,10,true);assert.equal(town.growth.goods,0,'Goods pickup credited city supply');
const beforeView=JSON.stringify(createSave().state);selectTown(town);assert.equal(JSON.stringify(createSave().state),beforeView,'Inspecting a town mutated the save');
assert.equal(get('townPopulation').textContent,'100');

setup();feedTown(game.stations[0],false);const before=game.towns[0].population;month();
assert.equal(game.towns[0].growth.last.houses,1);assert.ok(game.towns[0].population>before);assert.equal(game.towns[1].population,120);
const grown=game.towns[0].population;game.stations[0].waiting.passengers=0;produceCargo(30);
assert.ok(Math.abs(game.stations[0].waiting.passengers-grown*0.4)<1e-9,'More residents did not generate more passengers');

setup();const protectedPoints=[{x:7,y:9},{x:7,y:11},{x:9,y:9},{x:9,y:11}];
getTile(7,9).build='road';getTile(7,11).build='rail';getTile(9,9).terrain='water';
game.vehicles=[{id:9,type:'truck',path:[{x:9,y:11},{x:10,y:11}],index:0,progress:0,dir:1,carCount:1}];
const protections=JSON.stringify(protectedPoints.map(p=>getTile(p.x,p.y)));
feedTown();month();assert.equal(game.towns[0].growth.last.houses,2,'Goods and passenger service did not combine');
assert.equal(JSON.stringify(protectedPoints.map(p=>getTile(p.x,p.y))),protections,'Growth overwrote infrastructure, water or an active route');
const once=JSON.stringify(game.towns[0]);updateTownGrowth();assert.equal(JSON.stringify(game.towns[0]),once,'Same month grew twice');

setup();for(const tile of game.map.flat())if(tile.build!=='house'&&tile.station===null)tile.build='rail';
const blockedPopulation=game.towns[0].population;
for(let i=0;i<6;i++){feedTown();month();}
assert.equal(game.towns[0].population,blockedPopulation);assert.equal(game.towns[0].growth.last.status,'blocked');assert.ok(game.towns[0].growth.credit<=1);
getTile(9,9).build=null;month();assert.equal(game.towns[0].population,blockedPopulation,'No traffic grew an idle city');
recordTownTransport({id:0,cargo:'passengers',serviceSerial:90},game.stations[0],1,true);month();assert.ok(game.towns[0].population>blockedPopulation,'City did not recover when land was freed');

setup();game.towns=[];for(const tile of game.map.flat()){tile.town=null;if(tile.build==='house')tile.build=null;}
addTown('Close A',8,10,100);addTown('Close B',12,10,100);
const shared={id:20,x:10,y:10,sources:['town:0','town:1']};
recordTownTransport({id:1,cargo:'passengers',serviceSerial:1},shared,11);
recordTownTransport({id:2,cargo:'goods',serviceSerial:1},shared,5);
assert.equal(game.towns.reduce((sum,t)=>sum+t.growth.passengersIn,0),11,'Overlapping catchments duplicated traffic');
assert.equal(game.towns.reduce((sum,t)=>sum+t.growth.goods,0),5,'Overlapping catchments duplicated goods');

setup();selectStation(game.stations[0]);game.stations[0].waiting.passengers=60;buyVehicle('train',{target:'1',cargo:'passengers',wagons:2});
updateVehicles(0.5);const amount=game.vehicles[0].load;assert.ok(amount>0);assert.equal(game.towns[0].growth.passengersOut,amount);
assert.equal(game.towns[0].growth.passengerCalls.length,1);const serial=game.vehicles[0].serviceSerial;
restoreSave(JSON.stringify(createSave()));updateVehicles(0.5);
assert.equal(game.vehicles[0].serviceSerial,serial);assert.equal(game.towns[0].growth.passengerCalls.length,1);
assert.equal(game.towns[0].growth.passengersOut,game.vehicles[0].load,'Loading resumed with duplicated or missing city activity');
month();const saved=JSON.stringify(createSave());restoreSave(saved);assert.equal(game.towns[0].growth.last.month,0);
for(const corrupt of [s=>s.towns[0].growth.credit=-1,s=>s.towns[0].growth.month=9,s=>s.towns[0].growth.goods=-1,
 s=>s.towns[0].growth.passengerCalls=['same','same'],s=>s.towns[0].growth.last.delta=-10,s=>s.towns[0].growth.history[0].population=-1,
 s=>s.vehicles[0].serviceSerial=-1]) {
 const bad=JSON.parse(saved);corrupt(bad.state);const prior=JSON.stringify(createSave().state);assert.throws(()=>restoreSave(JSON.stringify(bad)));assert.equal(JSON.stringify(createSave().state),prior);
}
const legacy=JSON.parse(saved);legacy.state.towns.forEach(t=>delete t.growth);delete legacy.state.vehicles[0].serviceSerial;
const population=legacy.state.towns[0].population;restoreSave(JSON.stringify(legacy));assert.equal(game.towns[0].population,population);assert.equal(townGrowthState(game.towns[0]).passengersIn,0);

setup();feedTown();const start=JSON.stringify(createSave());update(720000);const long=JSON.stringify(game.towns),produced=game.stations[0].waiting.passengers;
assert.equal(game.month,2);assert.equal(game.dayProgress,0);
restoreSave(start);for(let i=0;i<720;i++)update(1000);
assert.equal(JSON.stringify(game.towns),long,'Month partition changed growth history');assert.ok(Math.abs(game.stations[0].waiting.passengers-produced)<1e-6,'Production used pre-growth population for the next month');
const pause=JSON.stringify(createSave().state);game.speed=0;update(12000);game.speed=1;assert.equal(JSON.stringify(createSave().state),pause,'Pause advanced growth');
`,{assert,get,document:{querySelector:get,querySelectorAll:()=>[],getElementById:get,createElement:element},performance:{now:()=>1},window:{devicePixelRatio:1},Date});
console.log('Towns passed: transport and goods, visit deduplication, shared catchments, monthly growth and production, protected land, blocked recovery, save/resume, old saves and calendar partition/pause.');
