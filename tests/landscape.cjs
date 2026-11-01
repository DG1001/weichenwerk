const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const nodes=new Map(),storage=new Map();
const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'rail',getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:1000,height:700}),classList:{add(){},remove(){},toggle(){}},replaceChildren(){},append(){},setAttribute(){},clientWidth:1000,clientHeight:700});return nodes.get(id);};
const source=['vendor/simplex-noise-4.0.3.min','landscape','towns','railway','construction','physics','game','management'].map(n=>readFileSync(join(__dirname,'../src/'+n+'.js'),'utf8').replace(/\ninit(?:Management)?\(\);\s*$/,'')).join('\n');
runInNewContext(source+`
const metrics=[];
for(const style of Object.keys(landscapeStyles))for(let seed=0;seed<16;seed++) {
 const settings=createLandscapeSettings('landscape-'+seed,style,34,26),world=generateLandscape(34,26,settings),tiles=world.map.flat();
 const water=tiles.filter(t=>t.terrain==='water').length,land=largestLandArea(world.map).length;
 const label=style+' / '+seed;
 assert.ok(landscapePlayable(world),'Generator accepted an unplayable world: '+label);
 assert.ok(water>0&&water<tiles.length*0.55,'Water balance: '+label+' '+water);
 assert.ok(land>tiles.length*0.3,'Too little connected land: '+label);
 assert.ok(world.towns.length>=3&&world.industries.length>=3,'Missing settlements: '+label+' '+world.towns.length+'/'+world.industries.length);
 assert.deepEqual(world.industries.slice(0,3).map(i=>i.produces),['coal','grain','goods']);
 assert.ok(tiles.some(t=>t.shore),'Missing shore: '+label);
 assert.ok(tiles.every(t=>Number.isInteger(t.shade)&&t.shade>=0&&t.shade<=3&&!('height' in t)),'Invalid flat tiles');
 const mainland=new Set(largestLandArea(world.map).map(t=>tileKey(t.x,t.y)));
 const free=world.map.map(row=>row.map(t=>({...t,terrain:t.build||!mainland.has(tileKey(t.x,t.y))?'water':t.terrain})));
 const connected=new Set(largestLandArea(free).map(t=>tileKey(t.x,t.y)));
 for(const s of [...world.towns,...world.industries]) {
   assert.ok(world.map[s.y][s.x].build,'Settlement center is empty: '+label);
   let reached=false;
   for(let y=s.y-2;y<=s.y+2;y++)for(let x=s.x-2;x<=s.x+2;x++)if(connected.has(tileKey(x,y)))reached=true;
   if(!reached)console.log(label,s,world.map.map(row=>row.map(t=>t.build==='house'?'H':t.build==='industry'?'I':t.terrain==='water'?'~':connected.has(tileKey(t.x,t.y))?' ':'.').join('')).join('\\n'));
   assert.ok(reached,'No buildable connection to settlement: '+label+' '+s.name);
 }
 if(seed===0)metrics.push({style,water,land,towns:world.towns.length,industries:world.industries.length});
}
const settings=createLandscapeSettings('Wiesen-und-Seen-42','lakes',64,48);
const first=JSON.stringify(generateLandscape(64,48,settings));
assert.equal(JSON.stringify(generateLandscape(64,48,{...settings})),first,'Same seed did not reproduce the same world');
assert.notEqual(JSON.stringify(generateLandscape(64,48,{...settings,seed:'Anderer-Seed'})),first,'Different seed produced the same world');
config.width=64;config.height=48;makeMap(settings);game.stations=[];game.vehicles=[];
const snapshot=JSON.stringify(createSave()),original=JSON.stringify(game.map),towns=JSON.stringify(game.towns),cash=game.cash;
generateLandscape(96,72,createLandscapeSettings('preview','coast',96,72));
assert.equal(JSON.stringify(createSave().state),JSON.stringify(JSON.parse(snapshot).state),'Preview changed live state');
restoreSave(snapshot);assert.deepEqual(game.landscape,settings);
assert.equal(JSON.stringify(game.map),original);
assert.ok(expandWorld(96,72));assert.equal(JSON.stringify(game.map.slice(0,48).map(r=>r.slice(0,64))),original,'Expansion changed original landscape');
assert.equal(JSON.stringify(game.towns.slice(0,JSON.parse(towns).length)),towns);assert.equal(game.cash,cash);
for(const p of [{x:95,y:70},{x:80,y:9},{x:12,y:62}])if(!getTile(p.x,p.y).build&&getTile(p.x,p.y).town===null&&getTile(p.x,p.y).industry===null) {
 assert.equal(getTile(p.x,p.y).terrain,landscapeTileAt(p.x,p.y,settings).terrain,'Expansion changed seed coordinates');
}
restoreSave(JSON.stringify(createSave()));assert.deepEqual(game.landscape,settings);
for(const change of [s=>s.landscape.style='unknown',s=>s.landscape.version=999,s=>s.landscape.baseWidth=200,s=>s.landscape.seed='',s=>s.landscape.variant=16,s=>s.map[0][0].shade=4,s=>s.map[0][0].shore='yes']) {
 const bad=JSON.parse(snapshot);change(bad.state);assert.throws(()=>decodeSave(JSON.stringify(bad)));
}
makeMap();const legacy=JSON.parse(JSON.stringify(createSave()));delete legacy.state.landscape;const legacyMap=JSON.stringify(game.map);
restoreSave(JSON.stringify(legacy));assert.equal(game.landscape,null);assert.equal(JSON.stringify(game.map),legacyMap);
console.log(JSON.stringify(metrics));
`,{assert,console,document:{querySelector:get,querySelectorAll:()=>[],getElementById:get,createElement:()=>({})},performance:{now:()=>1},window:{devicePixelRatio:1,confirm:()=>true},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},Date});
console.log('Landscape passed: 64 seeded flat worlds, all presets, connected industry chains, reproducibility, preview isolation, save validation, unchanged legacy maps and consistent expansion.');
