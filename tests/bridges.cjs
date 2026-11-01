const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map(),storage=new Map();
const element=()=>({value:'bridge',getContext:()=>({}),getBoundingClientRect:()=>({width:1000,height:700}),classList:{add(){},remove(){},toggle(){}},replaceChildren(){},append(){},setAttribute(){}});
const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const source=['vendor/pathfinding-0.4.18.min','vendor/simplex-noise-4.0.3.min','landscape','towns','railway','construction','physics','game','management'].map(n=>readFileSync(join(__dirname,'../src/'+n+'.js'),'utf8').replace(/\ninit(?:Management)?\(\);\s*$/,'')).join('\n');
runInNewContext(source+`
makeMap();
function empty(){for(const t of game.map.flat()){Object.assign(t,{terrain:'grass',build:null,station:null,signal:null,town:null,industry:null});delete t.links;delete t.bridge;}game.stations=[];game.vehicles=[];game.towns=[];game.industries=[];game.cash=90000;game.nextVehicleId=0;mark3dDirty();cancelConstruction();get('routeMode').value='bridge';}
function river(){for(const row of game.map)for(let x=12;x<=16;x++)row[x].terrain='water';}
function plan(a,b,kind='rail'){beginConstruction(getTile(...a),kind);previewConstruction(getTile(...b));finishConstruction();}
empty();river();const before=JSON.stringify(createSave().state);
plan([11,9],[17,9]);assert.equal(construction.error,'');assert.equal(construction.cost,7*(420+900));
assert.equal(JSON.stringify(createSave().state),before,'Bridge preview mutated the world');cancelConstruction();assert.equal(JSON.stringify(createSave().state),before);
plan([11,9],[17,10]);assert.ok(construction.error);assert.equal(confirmConstruction(),false);
plan([12,9],[17,9]);assert.ok(construction.error);
getTile(14,9).terrain='grass';plan([11,9],[17,9]);assert.ok(construction.error);getTile(14,9).terrain='water';
plan([17,9],[11,9]);game.cash=1;assert.equal(confirmConstruction(),false);assert.equal(getTile(14,9).bridge,undefined);game.cash=90000;
const cost=construction.cost;assert.ok(confirmConstruction());assert.equal(game.cash,90000-cost);
for(let x=11;x<=17;x++)assert.ok(validBridge(getTile(x,9),game.map));
assert.equal(getTile(11,9).links,1);assert.equal(routePathLength(tileRoutePaths(getTile(11,9),'rail')[0]),threeConfig.tileSize,'Ramp surface must reach the outer bank edge even before approaches are connected');
assert.equal(getTile(14,9).terrain,'water');assert.equal(maintenanceForTile(getTile(14,9)),10);
const monthCash=game.cash;monthlyAccounting();assert.equal(game.cash,monthCash-7*10-Math.round(game.loan*0.004));
assert.equal(routeElevationAt(10.5,9),0);assert.equal(routeElevationAt(14,9),0.48);assert.equal(routeElevationAt(17.5,9),0);
assert.equal(routeElevationAt(11,9),0.24);assert.equal(routeElevationAt(17,9),0.24);
for(const x of [10.5,11.5,16.5,17.5])assert.ok(Math.abs(routeElevationAt(x-1e-6,9)-routeElevationAt(x+1e-6,9))<1e-5,'Bridge height discontinuity');
get('routeMode').value='avoid';plan([3,9],[11,9]);assert.ok(confirmConstruction());plan([17,9],[29,9]);assert.ok(confirmConstruction());
const path=findPath({x:3,y:9},{x:29,y:9},'rail');assert.ok(path&&path.length===27);
const cash=game.cash;plan([11,10],[11,9]);assert.equal(confirmConstruction(),false);assert.equal(game.cash,cash);assert.equal(getTile(11,10).build,null);
assert.equal(buildSignal(getTile(11,9),'east',false,'block'),false);ui.stationKind.value='rail';buildStation(getTile(11,9));assert.equal(game.stations.length,0);
get('routeMode').value='bridge';plan([11,15],[17,15],'road');assert.ok(confirmConstruction());assert.equal(getTile(14,15).build,'road');
const save=JSON.stringify(createSave());restoreSave(save);assert.ok(validBridge(getTile(14,9),game.map));assert.ok(validBridge(getTile(14,15),game.map));
for(const corrupt of [f=>delete f.state.map[9][14].bridge,f=>f.state.map[9][14].bridge.end=50,f=>f.state.map[9][14].links=15,f=>f.state.map[9][14].terrain='grass',f=>f.state.map[9][14].build='road',f=>f.state.map[9][14].signal={direction:'east',oneWay:false,type:'block'},f=>f.state.map[9][14].bridge=null]) {
 const bad=JSON.parse(save);corrupt(bad);assert.throws(()=>decodeSave(JSON.stringify(bad)));
}
game.stations=[3,29].map((x,id)=>({id,x,y:9,name:'Bridge '+id,kind:'rail',produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,goods:0,coal:0,grain:0},delivered:0}));
game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{build:'stationRail',station:s.id}));mark3dDirty();
selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'passengers',wagons:3});const v=game.vehicles[0];assert.ok(v);
Object.assign(v,{servicePhase:null,stationWait:0,loadingAtOrigin:false});v.pathReservation=planReservation(v);
assert.ok(reservedTiles().has('14,9'));const reserved=JSON.stringify(createSave().state);bulldoze(getTile(14,9));assert.equal(JSON.stringify(createSave().state),reserved,'Reserved bridge was demolished');v.pathReservation=null;
setVehiclePosition(v,9*(v.path.length-1)/vehicleTravelDistance(v));
assert.ok(sampleVehiclePath(v,0).elevation>0.47);const occupied=JSON.stringify(createSave().state);bulldoze(getTile(14,9));assert.equal(JSON.stringify(createSave().state),occupied,'Occupied bridge was demolished');
const samples=Array.from({length:4},(_,i)=>sampleVehiclePath(v,i*0.58));const p=trainPosition(v);v.dir=-1;setVehiclePosition(v,p);
for(let i=0;i<4;i++){const s=sampleVehiclePath(v,(3-i)*0.58);assert.ok(Math.abs(s.elevation-samples[i].elevation)<1e-8);assert.ok(Math.abs(s.pitch+samples[i].pitch)<1e-8);}
let safe=true,crossed=false,returned=false;v.dir=1;setVehiclePosition(v,0);for(let i=0;i<900;i++){updateVehicles(0.05);safe&&=trafficStateValid(game);crossed||=sampleVehiclePath(v,0).tile.x>20;returned||=crossed&&v.dir<0&&sampleVehiclePath(v,0).tile.x<11;}
assert.ok(safe&&crossed&&returned,'Train did not cross and return safely');
game.vehicles=[];mark3dDirty();previewMapAction(getTile(14,9),'bulldoze');assert.equal(construction.path.length,7);assert.equal(construction.cost,560);const demolitionCash=game.cash;assert.ok(confirmConstruction());assert.equal(game.cash,demolitionCash-560);assert.equal(getTile(14,9).terrain,'water');assert.equal(getTile(14,9).build,null);assert.equal(getTile(11,9).bridge,undefined);
empty();for(let y=5;y<=8;y++)getTile(20,y).terrain='water';plan([20,4],[20,9],'road');assert.ok(confirmConstruction());assert.equal(getTile(20,7).bridge.axis,'y');assert.ok(validBridge(getTile(20,7),game.map));
empty();for(let x=1;x<33;x++)getTile(x,4).terrain='water';plan([0,4],[33,4]);assert.equal(construction.error,'');assert.ok(confirmConstruction());assert.ok(validBridge(getTile(15,4),game.map));
empty();river();plan([11,9],[17,9]);getTile(14,9).terrain='grass';assert.equal(confirmConstruction(),false);assert.equal(game.cash,90000);assert.equal(getTile(11,9).bridge,undefined);
empty();river();plan([11,9],[17,9]);assert.ok(confirmConstruction());const bridgeBefore=JSON.stringify(getTile(14,9));assert.ok(expandWorld(64,48));assert.equal(JSON.stringify(getTile(14,9)),bridgeBefore);assert.ok(validBridge(getTile(14,9),game.map));restoreSave(JSON.stringify(createSave()));assert.ok(validBridge(getTile(14,9),game.map));
`,{assert,get,document:{querySelector:get,querySelectorAll:()=>[],getElementById:get,createElement:()=>element()},performance:{now:()=>1},window:{devicePixelRatio:1,confirm:()=>true},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},Date});
console.log('Bridges passed: preview/cancel, both networks/axes, costs, ramps, routing, protected connections, old saves, corrupt metadata, train return, occupied demolition, full removal, max span and stale plans.');
