const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const element={getContext:()=>({}),getBoundingClientRect:()=>({width:1200,height:800}),classList:{add(){},remove(){},toggle(){}},setAttribute(){},replaceChildren(){},append(){}};
const source=['railway','towns','physics','game','management'].map(n=>readFileSync(join(__dirname,'../src/'+n+'.js'),'utf8').replace(/\ninit(?:Management)?\(\);\s*$/,'')).join('\n');
runInNewContext(source+`
makeMap();game.towns=[];game.industries=[];game.vehicles=[];
for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,town:null,industry:null,signal:null});delete t.links;}
for(let x=2;x<=28;x++)getTile(x,20).build='rail';
game.stations=[2,28].map((x,id)=>({id,x,y:20,name:'Return '+id,kind:'rail',produces:['goods'],accepts:id?['goods']:['coal'],waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0}));
game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));mark3dDirty();
const s=game.stations[0],path=findPath(s,game.stations[1],'rail');
function carrier(id,load){return{id,type:'train',from:0,to:1,path,index:0,dir:1,progress:0,carCount:5,capacity:80,cargo:'goods',cargoOrigin:0,load,stopped:true,inDepot:true,speed:0.82,velocity:0,profit:0,loadMode:'available',reverseMode:'classic',pathReservation:null};}
const a=carrier(0,70),b=carrier(1,80);game.vehicles=[a,b];game.nextVehicleId=2;s.waiting.goods=420;
const savedCash=game.cash,delivered=s.delivered;
assert.ok(unloadForDepot(a));assert.ok(unloadForDepot(b));assert.equal(a.load,0);assert.equal(b.load,0);assert.equal(s.waiting.goods,420);assert.equal(s.returnedCargo.goods,150);
assert.equal(stationWaitingAmount(s,'goods'),570);assert.equal(game.cash,savedCash);assert.equal(s.delivered,delivered);assert.equal(a.profit,0);assert.equal(b.profit,0);
assert.match(waitingSummary(s),/570 Waren.*150 Rueckgabe/);
const save=JSON.stringify(createSave());restoreSave(save);assert.equal(game.stations[0].returnedCargo.goods,150);
for(const badValue of [null,[],{unknown:1},{goods:-1},{goods:1.5},{goods:1e9+1}]){const bad=JSON.parse(save);bad.state.stations[0].returnedCargo=badValue;assert.throws(()=>decodeSave(JSON.stringify(bad)));}
const station=game.stations[0],v=game.vehicles[0];assert.ok(applyVehicleOrder(v,{target:1,cargo:'goods',wagons:1,loadMode:'available',reverseMode:'classic'}));
assert.equal(v.capacity,20);assert.equal(v.inDepot,true);assert.equal(game.cash,savedCash);
assert.ok(launchRecoveredVehicle(v));updateVehicles(10);assert.equal(v.load,20);assert.equal(station.waiting.goods,420);assert.equal(station.returnedCargo.goods,130);
assert.equal(stationWaitingAmount(station,'goods')+v.load,570);assert.equal(game.cash,savedCash);
restoreSave(save);const st=game.stations[0],bulk=game.vehicles[0];bulk.capacity=20;bulk.load=0;bulk.cargoOrigin=null;
loadVehicle(bulk,st,game.stations[1]);assert.equal(bulk.load,20);assert.equal(st.returnedCargo.goods,130);assert.equal(stationWaitingAmount(st,'goods')+bulk.load,570);
produceCargo(0);assert.equal(stationWaitingAmount(st,'goods')+bulk.load,570,'Production discarded a depot return');
st.waiting.goods=400;refillReturnedCargo(st,'goods');assert.equal(st.waiting.goods,420);assert.equal(st.returnedCargo.goods,110);
restoreSave(save);game.vehicles=[];const depot=game.stations[0],cash=game.cash;bulldoze(getTile(depot.x,depot.y));assert.equal(getTile(depot.x,depot.y).build,'stationRail');assert.equal(game.cash,cash,'Depot stock was demolished');
depot.waiting.goods=373.5972557777946;delete depot.returnedCargo;const fractional=carrier(9,80);assert.ok(unloadForDepot(fractional));assert.equal(depot.returnedCargo.goods,34);assert.ok(depot.waiting.goods<=420);assert.ok(Math.abs(stationWaitingAmount(depot,'goods')-453.5972557777946)<1e-8);
depot.waiting.goods=420;depot.returnedCargo.goods=1e9;const full=carrier(10,1);const before=JSON.stringify(depot);assert.equal(unloadForDepot(full),false);assert.equal(full.load,1);assert.equal(JSON.stringify(depot),before);
const legacy=JSON.parse(save);delete legacy.state.stations[0].returnedCargo;restoreSave(JSON.stringify(legacy));assert.equal(game.stations[0].returnedCargo,undefined);
`,{assert,document:{querySelector:()=>element,querySelectorAll:()=>[],getElementById:()=>element,createElement:()=>({...element})},performance:{now:()=>1},window:{devicePixelRatio:1},localStorage:{setItem(){},getItem(){return null;}},Date});
console.log('Depot returns passed: non-accepting/full source, multiple returns, exact conservation, no payout, save validation, refit, bulk/gradual reload, fractional queues and demolition protection.');
