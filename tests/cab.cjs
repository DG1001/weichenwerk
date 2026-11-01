const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map();
const element=()=>({value:'avoid',checked:true,textContent:'',hidden:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},replaceChildren(){},append(){},getBoundingClientRect:()=>({width:1200,height:800})});
const get=id=>{id=id.replace(/^#/,'');if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const source=['vendor/three-0.164.1.min','vendor/pathfinding-0.4.18.min','vendor/simplex-noise-4.0.3.min','landscape','towns','railway','construction','physics','game','management'].map(n=>readFileSync(join(__dirname,'../src/'+n+'.js'),'utf8').replace(/\ninit(?:Management)?\(\);\s*$/,'')).join('\n');
runInNewContext(source+`
makeMap();game.vehicles=[];game.stations=[];game.towns=[];game.industries=[];game.speed=0;
for(const t of game.map.flat())Object.assign(t,{terrain:'grass',build:null,station:null,town:null,industry:null,signal:null});
for(let x=3;x<=29;x++)getTile(x,12).build='rail';
game.stations=[3,29].map((x,id)=>({id,x,y:12,name:'Station '+id,kind:'rail',waiting:{goods:80,passengers:0,coal:0,grain:0},produces:['goods'],accepts:['goods'],delivered:0}));
game.stations.forEach(s=>Object.assign(getTile(s.x,s.y),{station:s.id,build:'stationRail'}));
selectStation(game.stations[0]);buyVehicle('train',{target:'1',cargo:'goods',wagons:2});
const v=game.vehicles[0];assert.ok(v);selectVehicle(v);assert.equal(enterCabView(),false);
three.camera=new THREE.PerspectiveCamera(45,1,0.1,1500);three.scene=new THREE.Scene();three.scene.background=new THREE.Color(0xa9c3ad);three.ready=true;
const oldColor=three.scene.background,orbit=JSON.stringify(three.orbit),state=JSON.stringify(createSave().state);
game.tool='rail';construction.start={x:1,y:1};construction.path=[{x:1,y:1}];construction.frozen=true;
assert.ok(enterCabView());assert.equal(game.tool,'inspect');assert.equal(construction.start,null);assert.equal(three.camera.fov,72);assert.equal(three.camera.near,0.02);assert.equal(three.cab.vehicle,v);
assert.equal(JSON.stringify(createSave().state),state,'Entering changed the simulation');
function checkPose(){
 const sample=sampleVehiclePath(v,0),frame=new THREE.Quaternion().setFromEuler(new THREE.Euler(sample.pitch,sample.heading,0,'YXZ'));
 const expected=new THREE.Vector3(0,0,1).applyQuaternion(frame),actual=three.camera.getWorldDirection(new THREE.Vector3());
 assert.ok(expected.distanceTo(actual)<1e-8,'Camera does not face the cab heading');
 const w=tileToWorld3d(sample.tile.x,sample.tile.y),offset=three.camera.position.clone().sub(new THREE.Vector3(w.x,0.12+sample.elevation,w.z)).applyQuaternion(frame.clone().invert());
 assert.ok(offset.distanceTo(new THREE.Vector3(0,0.32,0.14))<1e-8,'Camera is not at cab eye height');
}
v.index=8;v.progress=0.3;v.velocity=1.8;update3dCamera();checkPose();assert.equal(get('cabSpeedValue').textContent,'100');
for(const reverseMode of ['classic','backwards']){v.reverseMode=reverseMode;v.dir=-1;update3dCamera();checkPose();}
v.reverseMode='classic';v.dir=1;
const oldPath=v.path;v.path=[{x:10,y:12},{x:11,y:12},{x:11,y:13},{x:11,y:14}];v.index=0;v.progress=0;
for(let n=0;n<=10;n++){v.progress=n/10;update3dCamera();checkPose();assert.ok(three.camera.position.toArray().every(Number.isFinite));}
v.path=oldPath;v.index=9;v.progress=0.4;
for(let x=11;x<=17;x++)getTile(x,12).bridge={axis:'x',start:11,end:17};update3dCamera();checkPose();assert.ok(three.camera.position.y>0.8);
for(let x=11;x<=17;x++)delete getTile(x,12).bridge;
three.cab.yaw=0.9;three.cab.pitch=0.2;update3dCamera();const turned=three.camera.getWorldDirection(new THREE.Vector3());three.cab.yaw=0;three.cab.pitch=0;update3dCamera();assert.ok(turned.distanceTo(three.camera.getWorldDirection(new THREE.Vector3()))>0.5);
zoomMap(1);assert.equal(JSON.stringify(three.orbit),orbit);exitCabView();assert.equal(three.cab.vehicle,null);assert.equal(three.scene.background,oldColor);assert.equal(three.camera.fov,45);assert.equal(three.camera.near,0.1);assert.equal(JSON.stringify(three.orbit),orbit);
assert.ok(enterCabView());recoverVehicle(v);refreshCabControls();assert.equal(three.cab.vehicle,null);assert.equal(enterCabView(v),false);assert.equal(get('enterCab').disabled,true);
assert.ok(launchRecoveredVehicle(v));selectVehicle(v);assert.ok(enterCabView());const save=JSON.stringify(createSave());restoreSave(save);assert.equal(three.cab.vehicle,null);assert.equal(JSON.stringify(three.orbit),orbit);
selectVehicle(game.vehicles[0]);assert.ok(enterCabView());assert.ok(focusMapCoordinates(20,12));assert.equal(three.cab.vehicle,null);
selectVehicle(game.vehicles[0]);assert.ok(enterCabView());fitCamera();assert.equal(three.cab.vehicle,null);
selectVehicle(game.vehicles[0]);assert.ok(enterCabView());makeMap();assert.equal(three.cab.vehicle,null);
`,{assert,get,document:{querySelector:get,querySelectorAll:()=>[],getElementById:get,createElement:element},performance:{now:()=>1},window:{devicePixelRatio:1,confirm:()=>true},Date});
console.log('Cab passed: no simulation changes, heading/reversal, curve/bridge pose, eye height, look offsets, projection/orbit restoration, depot and world/load lifecycle.');
