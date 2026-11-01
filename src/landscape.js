const landscapeStyles = {mixed:"Binnenland",lakes:"Seenplatte",coast:"Kuestenland",river:"Flussland"};
const landscapePalette = {
  grass:["#80b56c","#89bd72","#91c278","#78ac65"],
  forest:["#508950","#5a9655","#64a05b","#477f4a"],
  field:["#b6ba68","#c3c477","#ced08a","#a9b35e"],
  water:["#548fae","#619fba","#73b0c7","#4885a6"],
  shore:"#b2cb8b"
};
let landscapeSampler=null;
let landscapePreview=null;

function landscapeHash(value) {
  let hash=2166136261;
  for(const char of String(value))hash=Math.imul(hash^char.charCodeAt(0),16777619);
  hash=Math.imul(hash^(hash>>>16),0x85ebca6b);
  hash=Math.imul(hash^(hash>>>13),0xc2b2ae35);
  return (hash^(hash>>>16))>>>0;
}

function newLandscapeSeed() {
  return Math.floor(Math.random()*0xffffffff).toString(36).toUpperCase()+Math.floor(Math.random()*1296).toString(36).toUpperCase();
}

function createLandscapeSettings(seed=newLandscapeSeed(),style="mixed",width=config.width,height=config.height) {
  return {version:1,seed:String(seed).trim().slice(0,64)||newLandscapeSeed(),style:Object.hasOwn(landscapeStyles,style)?style:"mixed",baseWidth:width,baseHeight:height,variant:0};
}

function landscapeContext(settings) {
  if(landscapeSampler?.settings===settings)return landscapeSampler;
  const key=JSON.stringify(settings);
  if(landscapeSampler?.key===key){landscapeSampler.settings=settings;return landscapeSampler;}
  const seed=landscapeHash(settings.seed+(settings.variant?`:${settings.variant}`:"")),noise=TerrainNoise.createNoise2D(rand(seed%2147483646+1));
  const chance=(x,y,salt)=>landscapeHash(`${seed}:${x}:${y}:${salt}`)/4294967296;
  landscapeSampler={key,settings,noise,chance,terrain:new Map(),lakes:new Map()};
  return landscapeSampler;
}

function naturalTerrainAt(x,y,settings) {
  const context=landscapeContext(settings),key=tileKey(x,y);
  if(context.terrain.has(key))return context.terrain.get(key);
  const {noise,chance}=context,style=settings.style;
  let water=false;
  if(style==="lakes") {
    const cx=settings.baseWidth*(0.32+chance(0,0,2)*0.36),cy=settings.baseHeight*(0.3+chance(0,0,3)*0.4);
    const rx=Math.min(7,settings.baseWidth*0.14),ry=Math.min(5,settings.baseHeight*0.14);
    water=Math.hypot((x-cx)/rx,(y-cy)/ry)<1+noise(x*0.2+23,y*0.2)*0.18;
  }
  if(style==="coast") {
    const west=chance(0,0,1)>0.5,u=west?y:x,v=west?x:y,span=west?settings.baseWidth:settings.baseHeight;
    const coast=span*0.19+noise(u*0.035+17,32)*Math.min(10,span*0.18)+noise(u*0.12,81)*1.6;
    water=v<coast;
  }
  const probability={mixed:0.32,lakes:0.67,coast:0.23,river:0.21}[style];
  for(let gy=Math.floor(y/18)-1;gy<=Math.floor(y/18)+1&&!water;gy++)for(let gx=Math.floor(x/18)-1;gx<=Math.floor(x/18)+1&&!water;gx++) {
    const lakeKey=tileKey(gx,gy);
    if(!context.lakes.has(lakeKey)) {
      context.lakes.set(lakeKey,chance(gx,gy,10)<probability?{
        x:gx*18+3+chance(gx,gy,11)*12,y:gy*18+3+chance(gx,gy,12)*12,
        rx:2.4+chance(gx,gy,13)*(style==="lakes"?5:3),ry:2.1+chance(gx,gy,14)*4
      }:null);
    }
    const lake=context.lakes.get(lakeKey);
    if(lake)water=Math.hypot((x-lake.x)/lake.rx,(y-lake.y)/lake.ry)<1+noise(x*0.22+47,y*0.22)*0.19;
  }
  if(!water&&style!=="lakes") {
    const alongX=chance(0,0,20)>0.25,u=alongX?x:y,v=alongX?y:x;
    const length=alongX?settings.baseWidth:settings.baseHeight,span=alongX?settings.baseHeight:settings.baseWidth;
    const center=span*(0.38+chance(0,0,21)*0.22)+Math.sin(u*0.105+chance(0,0,22)*6.28)*Math.min(6,span*0.14)+noise(u*0.032+73,14)*2.7;
    const halfWidth=(style==="river"?1.5:0.85)+0.4*(noise(u*0.08,43)+1)/2;
    const active=style==="river"||style==="coast"||u>length*0.16&&u<length*0.84;
    water=active&&Math.abs(v-center)<halfWidth;
  }
  const forest=noise(x*0.055+110,y*0.055-71)*0.73+noise(x*0.145-51,y*0.145+39)*0.27;
  const farmland=noise(x*0.075-160,y*0.075+19)*0.8+noise(x*0.19,y*0.19)*0.2;
  const terrain=water?"water":forest>0.13?"forest":farmland>0.25?"field":"grass";
  context.terrain.set(key,terrain);return terrain;
}

function landscapeTileAt(x,y,settings) {
  const terrain=naturalTerrainAt(x,y,settings),{noise}=landscapeContext(settings);
  const shore=terrain!=="water"&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>naturalTerrainAt(x+dx,y+dy,settings)==="water");
  const shade=Math.min(3,Math.max(0,Math.floor((noise(x*0.047+219,y*0.047-49)+1)*2)));
  return {x,y,terrain:shore?"grass":terrain,shade,shore,build:null,town:null,industry:null,station:null};
}

function largestLandArea(map,walkable=tile=>tile.terrain!=="water") {
  const seen=new Set();let largest=[];
  for(const row of map)for(const tile of row) {
    const key=tileKey(tile.x,tile.y);
    if(!walkable(tile)||seen.has(key))continue;
    const queue=[tile];seen.add(key);
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next=map[queue[i].y+dy]?.[queue[i].x+dx],nextKey=next&&tileKey(next.x,next.y);
      if(!next||!walkable(next)||seen.has(nextKey))continue;
      seen.add(nextKey);queue.push(next);
    }
    if(queue.length>largest.length)largest=queue;
  }
  return largest;
}

function populateLandscape(map,towns,industries,settings,oldWidth=0,oldHeight=0) {
  const height=map.length,width=map[0].length,area=largestLandArea(map),{chance}=landscapeContext(settings);
  const used=[...towns,...industries],mainland=new Set(area.map(p=>tileKey(p.x,p.y)));
  const clearAt=(p,radius)=>{
    if(p.x-radius<oldWidth&&p.y-radius<oldHeight)return false;
    for(let y=p.y-radius;y<=p.y+radius;y++)for(let x=p.x-radius;x<=p.x+radius;x++) {
      const tile=map[y]?.[x];if(!tile||!mainland.has(tileKey(x,y))||tile.build||tile.town!==null||tile.industry!==null)return false;
    }
    return true;
  };
  const sites=area.map(p=>({point:p,clearance:clearAt(p,3)?3:clearAt(p,2)?2:0,distance:Infinity,jitter:chance(p.x,p.y,100)})).filter(s=>s.clearance);
  let measured=0;
  const choose=(id,kind)=>{
    for(;measured<used.length;measured++)for(const site of sites) {
      const p=site.point,u=used[measured];site.distance=Math.min(site.distance,(p.x-u.x)**2+(p.y-u.y)**2);
    }
    let best=null,score=-Infinity;
    for(const radius of [3,2]) {
      for(const site of sites) {
        if(site.clearance<radius)continue;
        const p=site.point,distance=Math.sqrt(site.distance);
        if(distance<(radius===2?4:7))continue;
        const suitability=kind==="grain"&&p.terrain==="field"?4:0;
        const value=Math.min(distance,26)+(site.jitter+id*0.61803398875)%1*6+suitability;
        if(value>score){score=value;best=p;}
      }
      if(best)break;
    }
    return best;
  };
  const patch=(point,radius,callback)=>{
    for(let y=point.y-radius;y<=point.y+radius;y++)for(let x=point.x-radius;x<=point.x+radius;x++) {
      const t=map[y]?.[x],distance=Math.abs(x-point.x)+Math.abs(y-point.y);
      if(!t||t.terrain==="water"||x<oldWidth&&y<oldHeight||t.build||t.town!==null||t.industry!==null)continue;
      if(distance<=radius+(chance(x,y,point.x+point.y)>0.75?1:0))callback(t,distance);
    }
  };
  const townTarget=Math.min(28,Math.max(3,Math.round(width*height/550)+1));
  const industryTarget=Math.min(36,Math.max(3,Math.round(width*height/450)+1));
  // Alternate settlements and essential industries before filling the larger map.
  for(let i=0;i<Math.max(townTarget,industryTarget);i++) {
    if(towns.length<townTarget) {
      const p=choose(towns.length,"town");
      if(p) {
        const names=["Nordhafen","Gruenau","Suedmarkt","Lindenau","Seeburg","Wiesenfeld","Eichenrode","Falkenau"];
        const id=towns.length,name=names[id%names.length]+(id>=names.length?` ${Math.floor(id/names.length)+1}`:"");
        const town={id,name,x:p.x,y:p.y,population:75+Math.floor(chance(p.x,p.y,50)*90),accepts:"passengers",produces:"passengers"};
        towns.push(town);used.push(town);
        patch(p,2,(tile,distance)=>{tile.terrain="town";tile.town=id;tile.shore=false;if(distance<2)tile.build="house";});
      }
    }
    if(industries.length<industryTarget) {
      const id=industries.length,type=id%3,produces=["coal","grain","goods"][type],p=choose(id+40,produces);
      if(p) {
        const name=["Kohlewerk","Farm","Fabrik"][type]+(id>=3?` ${Math.floor(id/3)+1}`:"");
        const industry={id,name,x:p.x,y:p.y,produces,accepts:type===2?["coal","grain"]:[],output:65+Math.floor(chance(p.x,p.y,51)*40),stock:0};
        industries.push(industry);used.push(industry);
        patch(p,1,tile=>{tile.terrain="industry";tile.industry=id;tile.build="industry";tile.shore=false;});
      }
    }
  }
}

function generateLandscape(width,height,settings) {
  // Deterministic retries avoid seeds with no room for the essential cargo chain.
  for(let variant=settings.variant||0;variant<16;variant++) {
    const effective={...settings,variant};
    const map=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>landscapeTileAt(x,y,effective)));
    const towns=[],industries=[];populateLandscape(map,towns,industries,effective);
    const world={map,towns,industries,landscape:effective};
    if(landscapePlayable(world))return world;
  }
  throw new Error("Keine gut bebaubare Welt gefunden. Bitte einen anderen Seed waehlen.");
}

function landscapePlayable(world) {
  if(world.towns.length<3||world.industries.length<3)return false;
  const mainland=new Set(largestLandArea(world.map).map(p=>tileKey(p.x,p.y)));
  const free=new Set(largestLandArea(world.map,t=>!t.build&&t.terrain!=="water"&&mainland.has(tileKey(t.x,t.y))).map(p=>tileKey(p.x,p.y)));
  return [...world.towns,...world.industries].every(s=>{
    for(let y=s.y-2;y<=s.y+2;y++)for(let x=s.x-2;x<=s.x+2;x++)if(free.has(tileKey(x,y)))return true;
    return false;
  });
}

function landscapeTreeOffsets(tile) {
  if(tile.shade===undefined)return [[-0.23,-0.15],[0.2,-0.04],[-0.02,0.22]];
  const hash=landscapeHash(`${game.landscape?.seed||""}:${tile.x}:${tile.y}`),points=[];
  for(let i=0;i<2+hash%3;i++) {
    const h=landscapeHash(`${hash}:${i}`);
    points.push([((h&255)/255-0.5)*0.65,(((h>>>8)&255)/255-0.5)*0.65]);
  }
  return points;
}

function drawLandscapePreview(width,height,settings) {
  const key=JSON.stringify([width,height,settings]);
  if(landscapePreview?.key!==key)landscapePreview={key,world:generateLandscape(width,height,settings)};
  const canvas=document.getElementById("landscapePreview"),ctx=canvas.getContext("2d"),world=landscapePreview.world;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const sx=canvas.width/width,sy=canvas.height/height;
  for(const tile of world.map.flat()) {
    ctx.fillStyle=tile.build==="house"?"#eeedd4":tile.build==="industry"?"#a54a3c":landscapeColor(tile);
    ctx.fillRect(tile.x*sx,tile.y*sy,Math.ceil(sx),Math.ceil(sy));
  }
  const water=world.map.flat().filter(t=>t.terrain==="water").length;
  document.getElementById("landscapeSummary").textContent=`${world.towns.length} Orte | ${world.industries.length} Industrien | ${Math.round(water/(width*height)*100)} % Wasser`;
}

function landscapeColor(tile) {
  if(tile.shore&&!tile.build)return landscapePalette.shore;
  const palette=landscapePalette[tile.terrain];
  return Array.isArray(palette)?palette[tile.shade??1]:tile.terrain==="town"?"#9eb08e":"#9a9a83";
}
