function newTownGrowth(month=game.month) {
  return {month,passengersIn:0,passengersOut:0,goods:0,passengerCalls:[],goodsCalls:[],credit:0,last:null,history:[]};
}

function townGrowthState(town,create=false) {
  const previous=town.growth;
  if(previous?.month===game.month)return previous;
  const state={...newTownGrowth(),credit:previous?.credit||0,last:previous?.last||null,history:previous?.history||[]};
  if(create)town.growth=state;
  return state;
}

function stationTownIds(station) {
  if(!station)return [];
  const sources=station.sources||[...new Set(stationTiles(station).flatMap(p=>[...nearbyDemand(p).sources]))];
  return [...new Set(sources.filter(s=>s.startsWith("town:")).map(s=>Number(s.slice(5))))].filter(id=>game.towns[id]);
}

function recordTownTransport(vehicle,station,amount,outbound=false) {
  if(vehicle.inDepot||!Number.isFinite(amount)||amount<=0||!["passengers","goods"].includes(vehicle.cargo)||outbound&&vehicle.cargo!=="passengers")return;
  const ids=stationTownIds(station);
  if(!ids.length)return;
  const share=amount/ids.length,token=`${vehicle.id}/${vehicle.serviceSerial||0}/${station.id}`;
  for(const id of ids) {
    const state=townGrowthState(game.towns[id],true);
    const key=vehicle.cargo==="goods"?"goods":outbound?"passengersOut":"passengersIn";
    state[key]=Math.min(1e9,state[key]+share);
    const calls=vehicle.cargo==="goods"?state.goodsCalls:state.passengerCalls;
    if(calls.length<64&&!calls.includes(token))calls.push(token);
  }
}

function townSupply(town,state=townGrowthState(town)) {
  const passengerNeed=Math.max(12,Math.ceil(town.population*0.12));
  const goodsNeed=Math.max(6,Math.ceil(town.population*0.045));
  const passengers=state.passengersIn+state.passengersOut;
  const p=Math.min(1,passengers/passengerNeed),g=Math.min(1,state.goods/goodsNeed);
  const regularity=0.5+0.5*Math.min(1,state.passengerCalls.length/3);
  const goodsRegularity=0.5+0.5*Math.min(1,state.goodsCalls.length/2);
  return {passengers,passengerNeed,goodsNeed,p,g,earned:p*regularity+g*0.65*goodsRegularity+Math.min(p,g)*0.35};
}

function townGrowthSite(town,protectedTiles) {
  const radius=Math.min(12,3+Math.floor(Math.sqrt(town.population)/6)),candidates=[];
  for(let y=Math.max(0,town.y-radius);y<=Math.min(config.height-1,town.y+radius);y++) {
    for(let x=Math.max(0,town.x-radius);x<=Math.min(config.width-1,town.x+radius);x++) {
      const tile=getTile(x,y);
      if(tile.build||tile.station!==null||tile.signal||tile.links!==undefined||tile.terrain==="water"||tile.industry!==null
        ||tile.town!==null&&tile.town!==town.id||protectedTiles.has(tileKey(x,y)))continue;
      const adjacent=Object.values(railDirections).filter(d=>{const n=getTile(x+d.x,y+d.y);return n?.town===town.id&&n.build==="house";}).length;
      if(!adjacent)continue;
      const score=(tile.town===town.id?0:10)+Math.hypot(x-town.x,y-town.y)*2-adjacent*1.2+((x*31+y*17+town.id*7+game.month)%11)*0.01;
      candidates.push({tile,score});
    }
  }
  candidates.sort((a,b)=>a.score-b.score);
  return candidates[0]?.tile||null;
}

function updateTownGrowth() {
  if(game.month<1)return;
  const month=game.month-1,protectedTiles=new Set(reservedTiles().keys());
  for(const vehicle of game.vehicles)if(!vehicle.inDepot)for(const p of vehicle.path)protectedTiles.add(tileKey(p.x,p.y));
  let changed=false;
  for(const town of game.towns) {
    const previous=town.growth;
    if(previous?.last?.month>=month)continue;
    const state=previous?.month===month?previous:{...newTownGrowth(month),credit:previous?.credit||0,history:previous?.history||[]};
    const supply=townSupply(town,state),before=town.population;
    let credit=Math.min(3,state.credit+supply.earned),houses=0,status=supply.earned>0?"waiting":"unserved";
    while(supply.earned>0&&credit>=1-1e-9&&houses<2) {
      const tile=town.population<1e7?townGrowthSite(town,protectedTiles):null;
      if(!tile){credit=Math.min(1,credit);status="blocked";break;}
      Object.assign(tile,{terrain:"town",town:town.id,build:"house",shore:false});
      town.population=Math.min(1e7,town.population+12+(town.id*17+tile.x*7+tile.y*11+month*3)%9);
      credit=Math.max(0,credit-1);houses++;changed=true;status="growing";
    }
    const delta=town.population-before;
    const last={month,passengersIn:state.passengersIn,passengersOut:state.passengersOut,goods:state.goods,
      passengerVisits:state.passengerCalls.length,goodsVisits:state.goodsCalls.length,earned:supply.earned,delta,houses,status};
    town.growth={...newTownGrowth(game.month),credit:Math.min(1.999999,credit),last,
      history:[...state.history,{month,population:town.population,delta}].slice(-12)};
    if(delta>0)log(`${town.name} waechst: +${delta} Einwohner, ${houses} neue ${houses===1?"Haus":"Haeuser"}.`);
  }
  if(changed) {
    for(const station of game.stations)if(!station.closed)refreshStationSources(station);
    mark3dDirty();
  }
}

function townStatus(town) {
  const state=townGrowthState(town),supply=townSupply(town,state);
  if(state.last?.status==="blocked")return "Bauplatz fehlte zuletzt";
  if(state.credit+supply.earned>=1-1e-9&&supply.earned>0)return "Bau zum Monatswechsel";
  return supply.earned>0?"Wachstum im Aufbau":"Diesen Monat noch kein Verkehr";
}

function townMonthLabel(month) {
  return `${month%12+1}/${1950+Math.floor(month/12)}`;
}

function selectTown(town) {
  game.selected={town};
  ui.title.textContent=town.name;ui.badge.textContent="Stadt";
  ui.text.textContent=`${town.population.toLocaleString("de-DE")} Einwohner. ${townStatus(town)}.`;
  ui.cargo.textContent="Passagiere";ui.demand.textContent="Passagiere, Waren";
  ui.production.textContent=`${Math.round(town.population*0.4)} Passagiere/Monat`;
  ui.maintenance.textContent="-";ui.speed.textContent="-";ui.loading.textContent="-";
  ui.townPanel.hidden=false;
  const state=townGrowthState(town),supply=townSupply(town,state),node=id=>document.getElementById(id);
  node("townPopulation").textContent=town.population.toLocaleString("de-DE");
  node("townDelta").textContent=`+${state.last?.delta||0}`;
  node("townPassengers").textContent=`${Math.floor(supply.passengers)} / ${supply.passengerNeed}`;
  node("townGoods").textContent=`${Math.floor(state.goods)} / ${supply.goodsNeed}`;
  node("townVisits").textContent=`${state.passengerCalls.length} / ${state.goodsCalls.length}`;
  node("townMovements").textContent=`${Math.floor(state.passengersIn)} an / ${Math.floor(state.passengersOut)} ab`;
  node("townGrowthProgress").value=Math.min(1,state.credit+supply.earned);
  node("townGrowthStatus").textContent=townStatus(town);
  node("townPeriod").textContent=townMonthLabel(game.month);
  node("townPreviousSupply").textContent=state.last?`${townMonthLabel(state.last.month)}: ${Math.floor(state.last.passengersIn+state.last.passengersOut)} Personenbewegungen, ${Math.floor(state.last.goods)} Waren.`:"Noch kein abgeschlossener Monat.";
  const historyKey=JSON.stringify([town.id,state.history]);
  if(node("townHistory").dataset.historyKey!==historyKey) {
    node("townHistory").dataset.historyKey=historyKey;
    node("townHistory").replaceChildren(...state.history.slice(-6).reverse().map(entry=>{
      const row=document.createElement("tr");
      for(const value of [townMonthLabel(entry.month),entry.population.toLocaleString("de-DE"),`+${entry.delta}`]){const cell=document.createElement("td");cell.textContent=value;row.append(cell);}
      return row;
    }));
  }
}

function focusTown(town) {
  cancelConstruction();game.tool="inspect";revealMap();
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool==="inspect"));
  selectTown(town);
  const world=tileToWorld3d(town.x,town.y);three.inertia=null;three.orbit.targetX=world.x;three.orbit.targetZ=world.z;three.orbit.distance=18;
}

function initTownControls() {
  const node=id=>document.getElementById(id),dialog=node("townDialog");
  node("townListButton").addEventListener("click",()=>{
    node("townListRows").replaceChildren(...[...game.towns].sort((a,b)=>b.population-a.population||a.id-b.id).map(town=>{
      const row=document.createElement("tr"),name=document.createElement("td"),button=document.createElement("button");
      button.textContent=town.name;button.dataset.townId=town.id;
      button.addEventListener("click",()=>{focusTown(town);dialog.close();});name.append(button);row.append(name);
      for(const value of [town.population.toLocaleString("de-DE"),`+${town.growth?.last?.delta||0}`]){const cell=document.createElement("td");cell.textContent=value;row.append(cell);}
      return row;
    }));
    dialog.showModal();
  });
  node("closeTowns").addEventListener("click",()=>dialog.close());
}
