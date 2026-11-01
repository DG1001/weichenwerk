const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const element={getContext:()=>({}),replaceChildren(){},classList:{add(){},remove(){}}};
const source=readFileSync(join(__dirname,'../src/railway.js'),'utf8')+'\n'
  +readFileSync(join(__dirname,'../src/game.js'),'utf8').replace(/\ninit\(\);\s*$/,'');
runInNewContext(source+`
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,a+' != '+b);
const dirs=[{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0},{dx:0,dy:-1}];
for(let j=0;j<4;j++)for(const reverse of [false,true]) {
  const a=dirs[j],b=dirs[(j+1)%4],path={a,b,curved:true};
  const center={x:(a.dx+b.dx)/2,y:(a.dy+b.dy)/2};
  for(let i=0;i<=100;i++) {
    const t=i/100,p=routePathPoint(path,t),back=routePathPoint({a:b,b:a,curved:true},1-t);
    near(Math.hypot(p.x-center.x,p.y-center.y),0.5);
    near(Math.hypot(p.dx,p.dy),1);near(p.x,back.x);near(p.y,back.y);
    near(p.dx,-back.dx);near(p.dy,-back.dy);
    assert.ok(Math.abs(p.x)<=0.5+1e-8&&Math.abs(p.y)<=0.5+1e-8);
  }
  near(routePathLength(path),Math.PI/4*threeConfig.tileSize);
  const route=[{x:a.dx*2,y:a.dy*2},{x:a.dx,y:a.dy},{x:0,y:0},{x:b.dx,y:b.dy},{x:b.dx*2,y:b.dy*2}];
  if(reverse)route.reverse();
  for(let d=1.5;d<=2.5;d+=0.01) {
    const p=sampleRoute(route,d),q=sampleRoute([...route].reverse(),4-d);
    near(p.x,q.x);near(p.y,q.y);near(Math.hypot(p.x-center.x,p.y-center.y),0.5);
  }
  for(const d of [1.5,2.5]) {
    const p=sampleRoute(route,d),before=sampleRoute(route,d-1e-5),after=sampleRoute(route,d+1e-5);
    const u={x:p.x-before.x,y:p.y-before.y},v={x:after.x-p.x,y:after.y-p.y};
    near((u.x*v.x+u.y*v.y)/(Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y)),1,1e-6);
  }
  const vehicle={type:'train',path:route,carCount:3,index:2,progress:0.2,dir:1};
  const samples=Array.from({length:3},(_,i)=>sampleVehiclePath(vehicle,i*0.58));
  vehicle.dir=-1;
  for(let i=0;i<3;i++) {
    // Preserve physical wagon positions when reversing a stopped consist.
    vehicle.index=3;vehicle.progress=0.8;
    const p=sampleVehiclePath(vehicle,(2-i)*0.58);
    near(p.tile.x,samples[i].tile.x);near(p.tile.y,samples[i].tile.y);
    near(Math.cos(p.heading-samples[i].heading),-1,1e-6);
  }
}
near(sampleRoute([{x:0,y:0},{x:1,y:0},{x:2,y:0}],0.72).x,0.72);
near(sampleRoute([{x:3,y:5}],0).x,3);
makeMap();for(const t of game.map.flat()){t.build=null;delete t.links;}
const tile=getTile(10,10);tile.build='rail';
for(const d of dirs)getTile(10+d.dx,10+d.dy).build='rail';
tile.links=1|4;
let paths=tileRoutePaths(tile,'rail');assert.equal(paths.length,1);assert.equal(paths[0].curved,true);
tile.links|=2;paths=tileRoutePaths(tile,'rail');
assert.equal(paths.length,3);assert.equal(paths.filter(p=>p.curved).length,2);
tile.links|=8;paths=tileRoutePaths(tile,'rail');
assert.equal(paths.length,6);assert.equal(paths.filter(p=>p.curved).length,4);
getTile(10,11).links=0;
assert.equal(tileRoutePaths(tile,'rail').length,3,'One-sided explicit links must not create a connection');
`,{document:{querySelector:()=>element,querySelectorAll:()=>[]},performance:{now:()=>0},assert});
console.log('Curves passed: all rotations/directions, circular radius, tangent continuity, consist reversal, straight tracks, explicit connections and junctions.');
