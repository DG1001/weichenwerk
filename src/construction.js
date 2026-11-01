const construction = { start:null, end:null, kind:null, action:null, settings:null, bridge:null, path:[], error:"", cost:0, dragging:false, frozen:false, revision:0, rendered:-1, overlay:null };
const signalPlacement = { reversed:false, hoverKey:"" };

function signalPlacementSettings(tile) {
  return {direction:signalTrackDirection(tile,signalPlacement.reversed),oneWay:document.getElementById("signalBothDirections")?.checked===false,type:document.getElementById("signalType").value};
}

function updateSignalControls() {
  const button=document.getElementById("flipSignal"),both=document.getElementById("signalBothDirections").checked;
  button.disabled=both;button.setAttribute("aria-pressed",String(!both&&signalPlacement.reversed));
}

function refreshSignalPlacement() {
  if(construction.action==="signal") {
    construction.settings=signalPlacementSettings(getTile(construction.start.x,construction.start.y));
    construction.error=construction.settings.direction?"":"Signale benoetigen ein gerades Gleisfeld ohne Weiche oder Bruecke.";
    construction.revision++;updateConstructionUi();
  }
  updateSignalControls();
}

function previewMapAction(tile,action) {
  cancelConstruction();
  if(action==="signal"&&tile.signal) {
    signalPlacement.reversed=tile.signal.direction!==signalTrackDirection(tile);
    document.getElementById("signalBothDirections").checked=!tile.signal.oneWay;
    document.getElementById("signalType").value=tile.signal.type||"block";
  }
  const settings=action==="signal"?signalPlacementSettings(tile):action==="station"?{kind:ui.stationKind.value}:null;
  const adjoining=Object.values(railDirections).some(d=>getTile(tile.x+d.x,tile.y+d.y)?.station!=null);
  const cost=action==="signal"?(tile.signal?0:300):action==="station"?(adjoining?800:config.costs.station):config.costs.bulldoze;
  Object.assign(construction,{start:{x:tile.x,y:tile.y},end:{x:tile.x,y:tile.y},kind:action,action,settings,path:[{x:tile.x,y:tile.y}],frozen:true,cost});
  if(action==="signal") {
    construction.error=settings.direction?"":"Signale benoetigen ein gerades Gleisfeld ohne Weiche oder Bruecke.";
    updateSignalControls();
  }
  if(action==="bulldoze"&&tile.bridge) {
    construction.path=bridgeTiles(tile).map(t=>({x:t.x,y:t.y}));
    construction.cost=construction.path.length*config.costs.bulldoze;
  }
  construction.revision++;updateConstructionUi();
}

function constructionPointAllowed(tile, endpoint=false, kind=construction.kind) {
  return Boolean(tile && tile.terrain!=="water" && (!tile.build || endpoint&&passable(tile,kind)));
}

function beginConstruction(tile,kind) {
  cancelConstruction();
  Object.assign(construction,{start:{x:tile.x,y:tile.y},kind,dragging:true});
  previewConstruction(tile);
}

function previewConstruction(tile) {
  if(!construction.start || construction.action || !tile)return;
  const {start,kind}=construction;
  construction.end={x:tile.x,y:tile.y};
  construction.error="";construction.path=[];construction.bridge=null;
  if(document.getElementById("routeMode").value==="bridge") {
    try {
      const plan=planBridge(start,tile,kind);construction.path=plan.path;construction.bridge=plan.bridge;
    } catch(error) {construction.error=error.message;}
  } else if(!constructionPointAllowed(getTile(start.x,start.y),true,kind)||!constructionPointAllowed(tile,true,kind)) {
    construction.error="Start oder Ziel ist nicht bebaubar.";
  } else if(document.getElementById("routeMode").value==="direct") {
    const path=[{...start}], point={...start};
    while(point.x!==tile.x){point.x+=Math.sign(tile.x-point.x);path.push({...point});}
    while(point.y!==tile.y){point.y+=Math.sign(tile.y-point.y);path.push({...point});}
    construction.path=path;
    if(!path.every((p,i)=>constructionPointAllowed(getTile(p.x,p.y),i===0||i===path.length-1,kind)))construction.error="Direkte Strecke ist blockiert.";
  } else {
    const grid=new PF.Grid(game.map.map(row=>row.map(t=>constructionPointAllowed(t,false,kind)?0:1)));
    grid.setWalkableAt(start.x,start.y,true);grid.setWalkableAt(tile.x,tile.y,true);
    construction.path=new PF.AStarFinder({allowDiagonal:false}).findPath(start.x,start.y,tile.x,tile.y,grid).map(([x,y])=>({x,y}));
    if(!construction.path.length)construction.error="Kein baubarer Weg gefunden.";
  }
  construction.cost=construction.path.reduce((sum,p)=>sum+(!getTile(p.x,p.y).build?config.costs[kind]:0)+(construction.bridge?config.costs.bridge[kind]:0),0);
  construction.revision++;updateConstructionUi();
}

function finishConstruction() {
  construction.dragging=false;construction.frozen=Boolean(construction.start);
  updateConstructionUi();
}

function cancelConstruction() {
  Object.assign(construction,{start:null,end:null,kind:null,action:null,settings:null,bridge:null,path:[],error:"",cost:0,dragging:false,frozen:false});
  construction.revision++;updateConstructionUi();
}

function updateConstructionUi() {
  const bar=document.getElementById("buildPreview");
  if(!bar)return;
  bar.hidden=!construction.start;
  const label={rail:"Schiene",road:"Strasse",station:"Station",signal:"Signal",bulldoze:"Abriss"}[construction.kind]||"Strecke";
  const summary=construction.action==="signal"?`${construction.settings.type==="path"?"Pfadsignal":"Blocksignal"} | ${construction.settings.oneWay?"Einweg":"Beide Richtungen"} | ${money(construction.cost)}`:`${construction.bridge?label+"nbruecke":label} | ${construction.path.length} Felder | ${money(construction.cost)}`;
  document.getElementById("buildSummary").textContent=construction.error||summary;
  const signal=construction.action==="signal";
  document.getElementById("previewSignalDirection").hidden=!signal;
  document.getElementById("previewSignalType").hidden=!signal;
  if(signal)document.getElementById("previewSignalType").textContent=construction.settings.type==="path"?"Typ: PBS":"Typ: Block";
  document.getElementById("confirmBuild").textContent=construction.kind==="bulldoze"?"Abreissen":"Bauen";
  document.getElementById("confirmBuild").disabled=!construction.frozen||Boolean(construction.error)||!construction.path.length;
}

function constructionChanges() {
  const {path,kind}=construction, changes=new Map();
  if(construction.bridge)planBridge(path[0],path[path.length-1],kind);
  for(let i=0;i<path.length;i++) {
    const p=path[i],tile=getTile(p.x,p.y);
    if(!construction.bridge&&!constructionPointAllowed(tile,i===0||i===path.length-1,kind))throw new Error("Die Strecke ist inzwischen blockiert.");
    let links=tile.links;
    if(links===undefined) {
      links=0;
      if(passable(tile,kind))for(const d of Object.values(railDirections)) {
        const next=getTile(tile.x+d.x,tile.y+d.y);
        if(networkConnected(tile,next,kind))links|=networkBit(tile,next);
      }
    }
    if(i)links|=networkBit(p,path[i-1]);
    if(i+1<path.length)links|=networkBit(p,path[i+1]);
    if(tile.bridge&&(links&~(tile.bridge.axis==="x"?3:12)))throw new Error("Brueckenrampen koennen nur gerade angeschlossen werden.");
    if(construction.bridge||!tile.build || links!==tile.links)changes.set(tile,{build:tile.build||kind,links,...(construction.bridge?{bridge:{...construction.bridge}}:{})});
  }
  return changes;
}

function confirmConstruction() {
  if(!construction.frozen||construction.error||!construction.path.length)return false;
  if(construction.action) {
    const tile=getTile(construction.start.x,construction.start.y);if(!tile)return false;
    const before=JSON.stringify(tile);
    if(construction.action==="signal") {
      const s=construction.settings;if(!buildSignal(tile,s.direction,s.oneWay,s.type))return false;
    } else if(construction.action==="station") {
      if(ui.stationKind.value!==construction.settings.kind){flash("Stationstyp geaendert. Bitte Station neu planen.");return false;}
      buildStation(tile);
    } else bulldoze(tile);
    if(JSON.stringify(tile)===before&&construction.action!=="signal")return false;
    cancelConstruction();return true;
  }
  let changes;
  try { changes=constructionChanges(); } catch(error) {flash(error.message);return false;}
  const cost=[...changes].reduce((sum,[tile])=>sum+(!tile.build?config.costs[construction.kind]:0)+(construction.bridge?config.costs.bridge[construction.kind]:0),0);
  if(!canAfford(cost))return false;
  const reserved=reservedTiles(), occupied=new Set(game.vehicles.flatMap(v=>trainFootprint(v).map(p=>tileKey(p.x,p.y))));
  if([...changes.keys()].some(t=>reserved.has(tileKey(t.x,t.y))||occupied.has(tileKey(t.x,t.y)))) {
    flash("Ein Fahrzeug belegt oder reserviert den Anschluss. Bitte warten oder die Strecke aendern.");return false;
  }
  const previous=[...changes.keys()].map(tile=>[tile,{...tile}]);
  let safe=false;
  try {
    for(const [tile,patch] of changes)Object.assign(tile,patch);
    safe=trafficStateValid(game) && [...changes.keys()].every(tile=>!tile.signal || Object.values(railDirections).filter(d=>networkConnected(tile,getTile(tile.x+d.x,tile.y+d.y),"rail")).length===2);
  } finally {
    for(const [tile,old] of previous){for(const key of Object.keys(tile))if(!Object.hasOwn(old,key))delete tile[key];Object.assign(tile,old);}
  }
  if(!safe){flash("Die Strecke wuerde belegte Bloecke verbinden oder ein Signal ungueltig machen.");return false;}
  game.cash-=cost;
  for(const [tile,patch] of changes)Object.assign(tile,patch);
  mark3dDirty();log(`${construction.bridge?construction.kind==="rail"?"Bahnbruecke":"Strassenbruecke":construction.kind==="rail"?"Schienenstrecke":"Strasse"} gebaut: ${money(cost)}.`);
  cancelConstruction();return true;
}

function constructionRoutePoints(points) {
  if(points.length<2||construction.kind==="bulldoze")return points;
  return Array.from({length:(points.length-1)*8+1},(_,i)=>sampleRoute(points,i/8));
}


function updateConstruction3d() {
  const hover=!construction.start&&game.tool==="signal"?game.hover:null;
  const hoverSettings=hover&&(hover.signal?{...hover.signal,type:hover.signal.type||"block"}:signalPlacementSettings(hover));
  const hoverKey=hoverSettings?.direction&&signalTrackDirection(hover)?`${hover.x},${hover.y}:${hoverSettings.direction}:${hoverSettings.oneWay}:${hoverSettings.type}`:"";
  if(signalPlacement.hoverKey!==hoverKey){signalPlacement.hoverKey=hoverKey;construction.revision++;}
  if(construction.rendered===construction.revision)return;
  construction.rendered=construction.revision;
  if(construction.overlay) {
    three.scene.remove(construction.overlay);
    construction.overlay.traverse(o=>{if(o.isInstancedMesh)o.dispose();o.geometry?.dispose();o.material?.dispose();});
    construction.overlay=null;
  }
  if(!construction.start&&!hoverKey)return;
  const points=construction.path.length?construction.path:[construction.end||construction.start||hover];
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:construction.error||construction.kind==="bulldoze"?0xe34f4f:0x16bd91,transparent:true,opacity:0.65,depthWrite:false});
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(0.94,0.025,0.94),material,points.length),matrix=new THREE.Matrix4();
  const vertices=[];
  const rise=p=>construction.bridge?bridgeRiseAt(construction.bridge,p.x,p.y):routeElevationAt(p.x,p.y);
  points.forEach((p,i)=>{const w=tileToWorld3d(p.x,p.y);matrix.makeTranslation(w.x,0.16+rise(p),w.z);mesh.setMatrixAt(i,matrix);});
  group.add(mesh);
  if(points.length>1) {
    constructionRoutePoints(points).forEach(p=>{const w=tileToWorld3d(p.x,p.y);vertices.push(w.x,0.2+rise(p),w.z);});
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
    group.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xfff6ba})));
  }
  const settings=construction.action==="signal"&&!construction.error?construction.settings:hoverKey?hoverSettings:null;
  if(settings?.direction) {
    const target=construction.start||hover,w=tileToWorld3d(target.x,target.y);
    const arrowMaterial=new THREE.MeshBasicMaterial({color:0xffc43d,transparent:true,opacity:1,depthTest:false,depthWrite:false,toneMapped:false});
    const arrow=makeSignalDirectionArrow3d(settings,arrowMaterial);arrow.position.set(w.x,0.22,w.z);
    arrow.traverse(o=>{o.renderOrder=5;});group.add(arrow);
  }
  construction.overlay=group;three.scene.add(group);
}

function initConstruction() {
  document.getElementById("flipSignal").addEventListener("click",()=>{
    if(document.getElementById("signalBothDirections").checked)return;
    signalPlacement.reversed=!signalPlacement.reversed;refreshSignalPlacement();
  });
  // Preview shortcuts, so a signal can be set up on a phone without opening the panel.
  document.getElementById("previewSignalDirection").addEventListener("click",()=>{
    const both=document.getElementById("signalBothDirections");
    if(both.checked){both.checked=false;signalPlacement.reversed=false;}
    else if(!signalPlacement.reversed)signalPlacement.reversed=true;
    else {both.checked=true;signalPlacement.reversed=false;}
    refreshSignalPlacement();
  });
  document.getElementById("previewSignalType").addEventListener("click",()=>{
    const type=document.getElementById("signalType");type.value=type.value==="path"?"block":"path";refreshSignalPlacement();
  });
  document.getElementById("signalBothDirections").addEventListener("change",refreshSignalPlacement);
  document.getElementById("signalType").addEventListener("change",refreshSignalPlacement);
  updateSignalControls();
  document.getElementById("confirmBuild").addEventListener("click",confirmConstruction);
  document.getElementById("cancelBuild").addEventListener("click",cancelConstruction);
  document.getElementById("routeMode").addEventListener("change",()=>{if(construction.end)previewConstruction(getTile(construction.end.x,construction.end.y));});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape")cancelConstruction();
    if(event.key==="Enter"&&construction.frozen&&!/INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) {event.preventDefault();confirmConstruction();}
  });
}
