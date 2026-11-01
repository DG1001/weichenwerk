const saveKey = "libre-transport-save-v1";
const management = { lastRefresh: 0, fleetKey: "", editorKey: "", depotKey: "", ready: false };
const byId = (id) => document.getElementById(id);

function depotOptions() {
  return { target: byId("depotTarget").value, cargo: byId("depotCargo").value, wagons: Number(byId("depotWagons").value) };
}

function vehicleAtStation(vehicle) {
  if (vehicle.progress > 1e-8) return null;
  if (vehicle.index === 0) return game.stations[vehicle.from];
  if (vehicle.index === vehicle.path.length - 1) return game.stations[vehicle.to];
  return null;
}

function invalidateVehicleMesh(vehicle) {
  const mesh = three.vehicleMeshes.get(vehicle.id);
  if (!mesh) return;
  three.vehicleGroup.remove(mesh);
  disposeGroup(mesh);
  three.vehicleMeshes.delete(vehicle.id);
}

function sellVehicle(vehicle) {
  if (!vehicle.stopped || !vehicleAtStation(vehicle) || vehicle.load > 0 || (vehicle.velocity||0)>0.01) {
    flash("Verkauf nur angehalten, leer und am Bahnhof moeglich.");
    return false;
  }
  const refund = Math.round((vehicle.purchaseCost || config.costs[vehicle.type]) * 0.65);
  game.vehicles = game.vehicles.filter((item) => item !== vehicle);
  invalidateVehicleMesh(vehicle);
  earn(refund);
  selectStation(vehicleAtStation(vehicle));
  log(`Fahrzeug verkauft: ${money(refund)}.`);
  return true;
}

function unloadForDepot(vehicle) {
  const station = vehicle.inDepot ? game.stations[vehicle.cargoOrigin]||vehicleAtStation(vehicle) : vehicleAtStation(vehicle);
  if (!vehicle.stopped || !station || vehicle.load <= 0) return false;
  if (vehicle.inDepot || vehicle.cargoOrigin === station.id) {
    if(!returnCargoToStation(station,vehicle.cargo,vehicle.load)){flash("Rueckgabelager ist voll. Die Fracht bleibt an Bord.");return false;}
    vehicle.load = 0;
    vehicle.cargoOrigin = null;
    flash("Fracht zur Quelle zurueckgegeben.");
    return true;
  }
  if (!station.accepts.includes(vehicle.cargo)) { flash("Dieser Halt nimmt die Fracht nicht an. Fuer eine Rueckgabe zuerst ins Depot bergen."); return false; }
  const direction = vehicle.dir, mode = vehicle.loadMode;
  vehicle.dir = vehicle.index === 0 ? -1 : 1;
  vehicle.loadMode = "none";
  visitStation(vehicle);
  vehicle.dir = direction;
  vehicle.loadMode = mode;
  return true;
}

function applyVehicleOrder(vehicle, options) {
  const origin = vehicleAtStation(vehicle);
  if (!vehicle.stopped || !origin || vehicle.load > 0 || (vehicle.velocity||0)>0.01) {
    flash("Auftrag und Umruestung nur angehalten, leer und am Bahnhof aendern.");
    return false;
  }
  const target = game.stations[Number(options.target)];
  if (!target || target.id === origin.id || !stationCompatible(target, vehicle.type)) return false;
  const path = findPath(origin, target, routeTypeForVehicle(vehicle.type));
  const count = vehicle.type === "train" ? Number(options.wagons) + 1 : 2;
  const cargo = options.cargo;
  if (!path || !Number.isInteger(count) || count < 2 || count > 9 || path.length - 1 < (count - 1) * 0.58 + 0.5) {
    flash("Keine passende Verbindung oder zu viele Wagen.");
    return false;
  }
  if (!((origin.produces.includes(cargo) && target.accepts.includes(cargo)) || (target.produces.includes(cargo) && origin.accepts.includes(cargo)))) {
    flash("Fracht und Stationen passen nicht zusammen.");
    return false;
  }
  if (!["available", "full", "none"].includes(options.loadMode) || !["classic", "backwards"].includes(options.reverseMode)) return false;
  const candidate = { ...vehicle, from: origin.id, to: target.id, path, pathReservation: null, carCount: count, index: 0, dir: 1, progress: 0 };
  if (vehicle.type === "train" && !prepareRailPlacement(candidate, vehicle)) {
    flash("Der Startblock des neuen Auftrags ist belegt.");
    return false;
  }
  const cost = vehicle.type === "train" ? Math.max(0, count - vehicleCarCount(vehicle)) * 1000 : 0;
  if (!spend(cost)) return false;
  invalidateVehicleMesh(vehicle);
  Object.assign(vehicle, {
    from: origin.id, to: target.id, path, index: 0, dir: 1, progress: 0, cargo,
    carCount: count, capacity: vehicle.type === "train" ? (count - 1) * 20 : 28,
    purchaseCost: (vehicle.purchaseCost || config.costs[vehicle.type]) + cost,
    loadMode: options.loadMode, reverseMode: options.reverseMode, blocked: false,
    stationWait: 0, stationServiced: false, loadingAtOrigin: false, pathReservation: candidate.pathReservation, reservationWaiting: false,
    velocity:0,servicePhase:null,serviceCarry:0,serviceLoadTarget:null,serviceRevenue:0
  });
  log(`Auftrag: ${origin.name} - ${target.name}, ${cargoMeta[cargo].label}.`);
  management.editorKey = "";
  return true;
}

function startStopVehicle(vehicle) {
  if(vehicle.inDepot) {launchRecoveredVehicle(vehicle);return;}
  vehicle.stopped = !vehicle.stopped;
  if (!vehicle.stopped && vehicle.dir>0 && vehicle.index === 0 && vehicle.progress === 0 && !vehicle.stationWait && !vehicle.servicePhase) {
    beginStationService(vehicle,true);
  }
}

function recoverVehicle(vehicle) {
  if(vehicle.inDepot)return false;
  if(three.cab.vehicle===vehicle)exitCabView();
  invalidateVehicleMesh(vehicle);
  Object.assign(vehicle,{inDepot:true,stopped:true,index:0,dir:1,progress:0,velocity:0,motionState:"stopped",pathReservation:null,
    blocked:false,signalWaiting:false,reservationWaiting:false,routeWaiting:false,stationWait:0,stationServiced:false,loadingAtOrigin:false,
    servicePhase:null,serviceCarry:0,serviceRevenue:0,serviceLoadTarget:null});
  management.fleetKey="";management.editorKey="";
  log(`Fahrzeug ${vehicle.id+1} mit ${vehicle.load} Einheiten ins Depot geborgen.`);
  selectVehicle(vehicle);return true;
}

function launchRecoveredVehicle(vehicle) {
  const path=findPath(game.stations[vehicle.from],game.stations[vehicle.to],routeTypeForVehicle(vehicle.type));
  if(!path || path.length-1<(vehicleCarCount(vehicle)-1)*0.58+0.5){flash("Keine befahrbare Strecke fuer diesen Zug. Auftrag oder Gleise zuerst aendern.");return false;}
  const candidate={...vehicle,path,inDepot:false,stopped:false,index:0,dir:1,progress:0,pathReservation:null};
  if(vehicle.type==="train"&&!prepareRailPlacement(candidate,vehicle)){flash("Der Startbereich ist belegt. Fahrzeug bleibt im Depot.");return false;}
  Object.assign(vehicle,candidate,{blocked:false,signalWaiting:false,reservationWaiting:false,routeWaiting:false});
  beginStationService(vehicle,true);management.fleetKey="";return true;
}

function departVehicle(vehicle) {
  if(vehicle.inDepot||!vehicle.servicePhase&&!vehicle.stationWait)return false;
  Object.assign(vehicle,{stopped:false,servicePhase:"ready",stationWait:0,serviceCarry:0,serviceRevenue:0});
  serviceVehicle(vehicle,0);log(`Vorzeitige Abfahrt: Fahrzeug ${vehicle.id+1}.`);return true;
}

function validWorldSize(width,height) {
  return Number.isInteger(width)&&Number.isInteger(height)&&width>=34&&height>=26&&width<=128&&height<=96;
}

function backupWorld() {
  try {localStorage.setItem("libre-transport-previous-world-v1",JSON.stringify(createSave()));return true;}
  catch {return window.confirm("Sicherung im Browser nicht moeglich. Trotzdem fortfahren? Der alte Stand sollte vorher exportiert werden.");}
}

function startNewWorld(width,height,settings=createLandscapeSettings(undefined,"mixed",width,height)) {
  if(!validWorldSize(width,height))return false;
  let world;
  try {world=generateLandscape(width,height,settings);}catch(error){flash(error.message);return false;}
  if(!backupWorld())return false;
  cancelConstruction();
  for(const vehicle of game.vehicles)invalidateVehicleMesh(vehicle);
  config.width=width;config.height=height;
  Object.assign(game,{cash:90000,loan:40000,month:0,dayProgress:0,speed:1,vehicles:[],stations:[],nextVehicleId:0,selected:null,hover:null,log:[],tool:"inspect",showBlocks:false});
  Object.assign(game,world);mark3dDirty();fitCamera();
  management.fleetKey="";management.editorKey="";management.depotKey="";
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool==="inspect"));
  document.querySelectorAll("[data-speed]").forEach(b=>b.classList.toggle("active",Number(b.dataset.speed)===1));
  byId("toggleBlocks").setAttribute("aria-pressed","false");
  const town=game.towns[0];selectTile(getTile(town?.x??6,town?.y??5));log(`1950: Neue Welt, Seed ${game.landscape.seed}.`);renderLog();
  lastFrame=performance.now();saveGame(true);return true;
}

function expandWorld(width,height) {
  if(!validWorldSize(width,height)||width<config.width||height<config.height||width===config.width&&height===config.height)return false;
  if(!backupWorld())return false;
  cancelConstruction();const oldWidth=config.width,oldHeight=config.height;
  config.width=width;config.height=height;
  for(let y=0;y<height;y++) {
    game.map[y]||=[];
    for(let x=0;x<width;x++)if(!game.map[y][x])game.map[y][x]=game.landscape?landscapeTileAt(x,y,game.landscape):{x,y,terrain:terrainAt(x,y),build:null,town:null,industry:null,station:null};
  }
  populateExtraLand(oldWidth,oldHeight);mark3dDirty();fitCamera();lastFrame=performance.now();
  log(`Karte auf ${width} x ${height} erweitert.`);saveGame(true);return true;
}

function initWorldControls() {
  const dialog=byId("worldDialog"),size=byId("mapSize");
  const settings=()=>{
    const [width,height]=size.value.split("x").map(Number);
    if(!byId("landscapeSeed").value.trim())byId("landscapeSeed").value=newLandscapeSeed();
    return createLandscapeSettings(byId("landscapeSeed").value,byId("landscapeStyle").value,width,height);
  };
  const preview=()=>{const [width,height]=size.value.split("x").map(Number);drawLandscapePreview(width,height,settings());};
  let previewTimer;
  const schedulePreview=()=>{clearTimeout(previewTimer);previewTimer=setTimeout(preview,120);};
  const refresh=()=>{
    const [width,height]=size.value.split("x").map(Number);
    byId("expandMap").disabled=width<config.width||height<config.height||width===config.width&&height===config.height;
    byId("currentMapSize").textContent=`Aktuelle Karte: ${config.width} x ${config.height}${game.landscape?` | Seed ${game.landscape.seed}`:""}`;
    try {byId("previousWorld").disabled=!localStorage.getItem("libre-transport-previous-world-v1");}catch {byId("previousWorld").disabled=true;}
  };
  byId("worldSettings").addEventListener("click",()=>{
    size.value=config.width<64?"64x48":config.width<96?"96x72":"128x96";
    byId("landscapeSeed").value=newLandscapeSeed();byId("landscapeStyle").value=game.landscape?.style||"mixed";
    refresh();dialog.showModal();preview();
  });
  byId("closeWorld").addEventListener("click",()=>dialog.close());size.addEventListener("change",()=>{refresh();preview();});
  byId("landscapeStyle").addEventListener("change",preview);
  byId("landscapeSeed").addEventListener("input",schedulePreview);
  byId("randomLandscape").addEventListener("click",()=>{byId("landscapeSeed").value=newLandscapeSeed();preview();});
  byId("worldForm").addEventListener("submit",event=>{
    event.preventDefault();const [width,height]=size.value.split("x").map(Number);
    const reset=event.submitter?.value==="new";
    if(!window.confirm(reset?"Neue Welt starten? Der aktuelle Stand wird ersetzt und nach Moeglichkeit als vorherige Welt gesichert.":"Karte vergroessern? Bestehende Strecken, Fahrzeuge und Finanzen bleiben erhalten."))return;
    if((reset?startNewWorld(width,height,settings()):expandWorld(width,height))){dialog.close();flash(reset?"Neue Welt gestartet.":"Karte erweitert.");}
    refresh();
  });
  byId("previousWorld").addEventListener("click",()=>{
    try {
      const previous=localStorage.getItem("libre-transport-previous-world-v1");if(!previous)return;decodeSave(previous);
      if(!window.confirm("Vorherige Welt wiederherstellen und aktuellen Stand ersetzen?"))return;
      if(!backupWorld())return;restoreSave(previous);saveGame(true);dialog.close();flash("Vorherige Welt wiederhergestellt.");
    }catch {flash("Vorherige Welt konnte nicht geladen werden.");}
  });
}

function fillTargets(select, origin, type, selected = "", automatic = false) {
  const options = [];
  const add = (value, label) => { const option = document.createElement("option"); option.value = value; option.textContent = label; options.push(option); };
  if (automatic) add("", "Automatisch");
  if (origin) {
    for (const station of game.stations) {
      if (station.id !== origin.id && stationCompatible(station, type)) add(String(station.id), station.name);
    }
  }
  select.replaceChildren(...options);
  if (options.some((option) => option.value === String(selected))) select.value = String(selected);
}

function refreshManagement(force = false) {
  if (!management.ready) return;
  const now = performance.now();
  if (!force && now - management.lastRefresh < 200) return;
  management.lastRefresh = now;
  const vehicle = game.selected?.vehicle;
  const station = game.selected?.station;
  const fleetKey = JSON.stringify(game.vehicles.map((item) => [item.id, item.load, item.inDepot, item.stopped, item.blocked, item.signalWaiting, item.reservationWaiting, item.routeWaiting, item.servicePhase, Math.round((item.velocity||0)*100), item.stationWait > 0, item.dir, item.cargo])) + `:${vehicle?.id}`;
  if (fleetKey !== management.fleetKey) {
    management.fleetKey = fleetKey;
    byId("fleetList").replaceChildren(...game.vehicles.map((item) => {
      const button = document.createElement("button");
      button.className = "fleet-row";
      button.setAttribute("aria-pressed", String(item === vehicle));
      button.textContent = `${item.type === "train" ? "Zug" : "Truck"} ${item.id + 1} - ${cargoMeta[item.cargo].label}`;
      const detail = document.createElement("small");
      detail.textContent = `${item.load}/${item.capacity} | ${Math.round((item.velocity||0)/1.8*100)} km/h | ${item.inDepot?"Im Depot":item.stopped ? "Angehalten" : item.blocked ? "Blockiert" : item.routeWaiting ? "Keine Rueckfahrt" : item.reservationWaiting ? "Wartet auf Fahrweg" : item.signalWaiting ? "Signalhalt" : item.servicePhase||item.stationWait > 0 ? "Bahnhofshalt" : "Unterwegs"}`;
      button.append(detail);
      button.addEventListener("click", () => { selectVehicle(item); refreshManagement(true); });
      return button;
    }));
  }
  const depotKey = `${station?.id}:${game.stations.length}`;
  if (depotKey !== management.depotKey) {
    management.depotKey = depotKey;
    fillTargets(byId("depotTarget"), station, station?.kind === "rail" ? "train" : "truck", "", true);
  }
  byId("vehicleEditor").hidden = !vehicle;
  if (!vehicle) { management.editorKey = ""; return; }
  const origin = vehicleAtStation(vehicle);
  const editorKey = `${vehicle.id}:${origin?.id}:${game.stations.length}`;
  if (editorKey !== management.editorKey) {
    management.editorKey = editorKey;
    fillTargets(byId("orderTarget"), origin, vehicle.type, origin?.id === vehicle.from ? vehicle.to : vehicle.from);
    byId("orderCargo").value = vehicle.cargo;
    byId("orderWagons").value = Math.max(1, vehicleCarCount(vehicle) - 1);
    byId("orderLoad").value = vehicle.loadMode || "available";
    byId("orderReverse").value = vehicle.reverseMode || "classic";
  }
  byId("toggleVehicle").textContent = vehicle.inDepot?"Aus Depot starten":vehicle.stopped ? "Starten" : "Anhalten";
  byId("recoverVehicle").disabled=Boolean(vehicle.inDepot);
  byId("departVehicle").disabled=Boolean(vehicle.inDepot||!vehicle.servicePhase&&!vehicle.stationWait);
  const editable = Boolean(vehicle.stopped && origin && vehicle.load === 0);
  byId("sellVehicle").disabled = !editable;
  byId("unloadVehicle").disabled = !vehicle.stopped || !origin || vehicle.load === 0;
  byId("unloadVehicle").textContent=vehicle.inDepot?"Fracht zurueckgeben":"Entladen";
  for (const control of byId("orderForm").elements) control.disabled = !editable;
  byId("orderWagons").disabled = !editable || vehicle.type !== "train";
}

function createSave() {
  const fields = ["cash", "loan", "month", "dayProgress", "speed", "map", "stations", "vehicles", "nextVehicleId", "industries", "towns", "log", "landscape"];
  return {
    version: 1, savedAt: new Date().toISOString(), size:{width:config.width,height:config.height},
    state: Object.fromEntries(fields.map((key) => [key, game[key]])),
    view: "3d",
    orbit: { ...three.orbit }
  };
}

function decodeSave(text) {
  if (typeof text !== "string" || text.length > 16_000_000) throw new Error("Spielstand zu gross.");
  const file = JSON.parse(text);
  const check = (condition) => { if (!condition) throw new Error("Ungueltiger oder inkompatibler Spielstand."); };
  const number = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
  const integer = (value, min, max) => Number.isInteger(value) && number(value, min, max);
  const list = (value, max) => Array.isArray(value) && value.length <= max;
  const cargo = (value) => Object.hasOwn(cargoMeta, value);
  const cargos = (value) => list(value, 4) && value.every(cargo);
  const width=file.size?.width??file.state?.map?.[0]?.length,height=file.size?.height??file.state?.map?.length;
  check(integer(width,34,128)&&integer(height,26,96));
  const point = (value) => value && integer(value.x, 0, width - 1) && integer(value.y, 0, height - 1);
  const label = (value) => typeof value === "string" && value.length <= 160;
  check(file && file.version === 1 && file.state && ["2d", "3d"].includes(file.view));
  const s = file.state;
  const landscape=s.landscape;
  check(landscape===undefined||landscape===null||landscape.version===1&&typeof landscape.seed==="string"&&landscape.seed.length>0&&landscape.seed.length<=64
    &&["mixed","lakes","coast","river"].includes(landscape.style)&&integer(landscape.baseWidth,34,width)&&integer(landscape.baseHeight,26,height)
    &&(landscape.variant===undefined||integer(landscape.variant,0,15)));
  check(number(s.cash, -1e12, 1e12) && number(s.loan, 0, 1e12) && integer(s.month, 0, 1e7) && number(s.dayProgress, 0, 30) && s.dayProgress < 30);
  check([0, 1, 2, 4].includes(s.speed) && integer(s.nextVehicleId, 0, 1e9));
  check(list(s.towns, 100) && list(s.industries, 100) && list(s.stations, width * height) && list(s.vehicles, 500));
  s.towns.forEach((town, i) => check(town && town.id === i && point(town) && label(town.name) && number(town.population, 0, 1e7)));
  for(const town of s.towns)if(town.growth!==undefined) {
    const g=town.growth;
    check(g&&g.month===s.month&&number(g.credit,0,1.999999));
    for(const key of ["passengersIn","passengersOut","goods"])check(number(g[key],0,1e9));
    for(const key of ["passengerCalls","goodsCalls"])check(list(g[key],64)&&g[key].every(t=>typeof t==="string"&&t.length<=128)&&new Set(g[key]).size===g[key].length);
    check(g.last===null||g.last&&integer(g.last.month,0,s.month-1)&&["unserved","waiting","blocked","growing"].includes(g.last.status)
      &&number(g.last.delta,0,1e7)&&integer(g.last.houses,0,2)&&number(g.last.earned,0,2.000001)
      &&integer(g.last.passengerVisits,0,64)&&integer(g.last.goodsVisits,0,64)
      &&["passengersIn","passengersOut","goods"].every(key=>number(g.last[key],0,1e9)));
    check(list(g.history,12)&&g.history.every((entry,index)=>entry&&integer(entry.month,0,s.month-1)&&number(entry.population,0,1e7)&&number(entry.delta,0,1e7)&&(index===0||entry.month>g.history[index-1].month)));
  }
  s.industries.forEach((industry, i) => check(industry && industry.id === i && point(industry) && label(industry.name) && cargo(industry.produces)
    && cargos(industry.accepts) && number(industry.output, 0, 1e7) && number(industry.stock, 0, 1e12)));
  const ref = (value, length) => value === null || integer(value, 0, length - 1);
  check(Array.isArray(s.map) && s.map.length === height);
  s.map.forEach((row, y) => {
    check(Array.isArray(row) && row.length === width);
    row.forEach((tile, x) => check(tile && tile.x === x && tile.y === y && ["grass", "forest", "field", "water", "town", "industry"].includes(tile.terrain)
      && [null, "house", "industry", "rail", "road", "stationRail", "stationRoad"].includes(tile.build)
      && ref(tile.town, s.towns.length) && ref(tile.industry, s.industries.length) && ref(tile.station, s.stations.length)));
    row.forEach(tile=>check(tile.links===undefined||integer(tile.links,0,15)&&["rail","road","stationRail","stationRoad"].includes(tile.build)));
    row.forEach(tile=>check((tile.shade===undefined||integer(tile.shade,0,3))&&[undefined,true,false].includes(tile.shore)));
    row.forEach((tile) => {
      check(tile.signal === undefined || tile.signal === null || tile.build === "rail" && Object.hasOwn(railDirections, tile.signal.direction) && typeof tile.signal.oneWay === "boolean" && [undefined, "block", "path"].includes(tile.signal.type));
    });
  });
  for(const tile of s.map.flat())check(tile.bridge===undefined||validBridge(tile,s.map));
  s.stations.forEach((station, i) => {
    check(station && station.id === i && point(station) && label(station.name) && ["rail", "road"].includes(station.kind)
      && cargos(station.produces) && cargos(station.accepts) && station.waiting && number(station.delivered, 0, 1e12));
    for (const key of Object.keys(cargoMeta)) check(number(station.waiting[key], 0, 420));
    if(station.returnedCargo!==undefined) {
      check(station.returnedCargo&&typeof station.returnedCargo==="object"&&!Array.isArray(station.returnedCargo));
      check(Object.keys(station.returnedCargo).every(key=>cargo(key)&&integer(station.returnedCargo[key],0,1e9)));
      check(!station.closed||Object.values(station.returnedCargo).every(n=>n===0));
    }
    const tiles=stationTiles(station);
    check(list(tiles,8)&&tiles.length>0&&tiles.every(point)&&tiles.some(p=>p.x===station.x&&p.y===station.y));
    check(tiles.every(p=>p.x===tiles[0].x)||tiles.every(p=>p.y===tiles[0].y));
    const axis=tiles.every(p=>p.x===tiles[0].x)?"y":"x",coords=tiles.map(p=>p[axis]).sort((a,b)=>a-b);
    check(coords.every((n,index)=>index===0||n===coords[index-1]+1));
    if(!station.closed)check(tiles.every(p=>s.map[p.y][p.x].station===i&&s.map[p.y][p.x].build===(station.kind==="rail"?"stationRail":"stationRoad")));
    if (!station.closed) check(s.map[station.y][station.x].station === i && s.map[station.y][station.x].build === (station.kind === "rail" ? "stationRail" : "stationRoad"));
    delete station.sources;
  });
  for (const tile of s.map.flat()) {
    if (tile.station !== null) { const st = s.stations[tile.station]; check(!st.closed && stationTiles(st).some(p=>p.x===tile.x&&p.y===tile.y)); }
  }
  const ids = new Set();
  for (const v of s.vehicles) {
    check(v && integer(v.id, 0, s.nextVehicleId - 1) && !ids.has(v.id)); ids.add(v.id);
    check(["train", "truck"].includes(v.type) && cargo(v.cargo) && integer(v.from, 0, s.stations.length - 1) && integer(v.to, 0, s.stations.length - 1) && v.from !== v.to);
    const from = s.stations[v.from], to = s.stations[v.to];
    check(!from.closed && !to.closed && from.kind === routeTypeForVehicle(v.type) && to.kind === from.kind);
    check(list(v.path, width * height) && v.path.length >= 2 && v.path.every(point));
    check(v.path[0].x === from.x && v.path[0].y === from.y && v.path.at(-1).x === to.x && v.path.at(-1).y === to.y);
    v.path.forEach((p, i) => { if (i) check(Math.abs(p.x-v.path[i-1].x)+Math.abs(p.y-v.path[i-1].y) === 1); });
    check(integer(v.index, 0, v.path.length - 1) && [-1, 1].includes(v.dir) && number(v.progress, 0, 1) && v.progress < 1);
    check(number(v.index + v.dir * v.progress, 0, v.path.length - 1) && number(v.speed, 0.01, 10) && number(v.profit, -1e12, 1e12));
    check(integer(v.capacity, 1, 1000) && integer(v.load, 0, v.capacity) && integer(vehicleCarCount(v), 1, 9) && vehicleTravelDistance(v) >= 0.49);
    check(v.carCount === undefined || integer(v.carCount, 1, 9));
    check(v.purchaseCost === undefined || number(v.purchaseCost, 0, 1e9));
    check(v.cargoOrigin === undefined || ref(v.cargoOrigin, s.stations.length));
    check(v.velocity===undefined||number(v.velocity,0,20));
    check([undefined,"stopped","braking","accelerating","cruising"].includes(v.motionState));
    check([undefined,null,"unload","load","ready"].includes(v.servicePhase));
    check(v.serviceCarry===undefined||number(v.serviceCarry,0,1000));
    check(v.serviceRevenue===undefined||number(v.serviceRevenue,0,1e12));
    check(v.serviceSerial===undefined||integer(v.serviceSerial,0,1e9));
    check(v.serviceLoadTarget===undefined||v.serviceLoadTarget===null||integer(v.serviceLoadTarget,0,v.capacity));
    for (const key of ["stopped", "blocked", "loadingAtOrigin", "stationServiced", "signalWaiting", "routeWaiting", "reservationWaiting", "inDepot"]) check([undefined, true, false].includes(v[key]));
    check(!v.inDepot || v.stopped&&v.index===0&&v.dir===1&&v.progress===0&&!(v.velocity||0)&&!v.pathReservation&&!v.servicePhase&&!v.stationWait);
    if (v.pathReservation !== undefined && v.pathReservation !== null) {
      const plan = v.pathReservation;
      check(v.type === "train" && plan.direction === v.dir && number(plan.end, 0, v.path.length - 1) && (plan.end - trainPosition(v)) * v.dir >= -1e-8);
      check(safeReservationStop(v, plan.end, s.map));
      check(reservationRouteAllowed(v, plan, s.map));
      check(sweptPath(v, trainPosition(v), plan.end).every((p) => ["rail", "stationRail"].includes(s.map[p.y][p.x].build)));
    }
    check(number(v.stationWait || 0, 0, 1000) && [undefined, "available", "full", "none"].includes(v.loadMode) && [undefined, "classic", "backwards"].includes(v.reverseMode));
    check(!v.stationWait || v.progress === 0 && [0, v.path.length - 1].includes(v.index));
    check(!v.servicePhase||v.progress===0&&[0,v.path.length-1].includes(v.index)&&(v.velocity||0)<0.01);
    v.blocked = !vehicleRouteAheadOpen(v, s.map);
  }
  check(list(s.log, 7) && s.log.every((line) => typeof line === "string" && line.length <= 512));
  check(trafficStateValid(s));
  if (file.camera !== undefined) check(file.camera && number(file.camera.x, -1e6, 1e6) && number(file.camera.y, -1e6, 1e6) && number(file.camera.zoom, 0.01, 5));
  const o = file.orbit;
  check(o && number(o.yaw, -1e6, 1e6) && number(o.pitch, 0.1, 1.5) && number(o.distance, 1, 1000) && number(o.targetX, -100, 100) && number(o.targetZ, -100, 100));
  // Legacy 2D saves retain their world and 3D orbit, but no longer select a renderer.
  file.view = "3d";
  return file;
}

function restoreSave(text) {
  const file = decodeSave(text);
  // Validation completes before any live objects or WebGL resources are changed.
  exitCabView();
  for (const v of game.vehicles) invalidateVehicleMesh(v);
  if(typeof cancelConstruction==="function")cancelConstruction();
  config.width=file.size?.width??file.state.map[0].length;config.height=file.size?.height??file.state.map.length;
  const fields = ["cash", "loan", "month", "dayProgress", "speed", "map", "stations", "vehicles", "nextVehicleId", "industries", "towns", "log"];
  for (const key of fields) game[key] = file.state[key];
  game.landscape=file.state.landscape??null;
  game.selected = null; game.hover = null;
  mapCoordinates.last=null;mapCoordinates.target=null;
  game.stations.forEach(station=>{station.sources=[...new Set(stationTiles(station).flatMap(p=>[...nearbyDemand(p).sources]))];});
  for (const key of ["yaw", "pitch", "distance", "targetX", "targetZ"]) three.orbit[key] = file.orbit[key];
  three.cameraRestored=true;
  document.querySelectorAll("[data-speed]").forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === game.speed));
  mark3dDirty();
  management.fleetKey = ""; management.editorKey = ""; management.depotKey = "";
  if (game.stations.some((station) => !station.closed)) selectStation(game.stations.find((station) => !station.closed));
  else {const town=game.towns[0];selectTile(getTile(town?.x??6,town?.y??5));}
  renderLog();
  lastFrame = performance.now();
  return file;
}

function saveGame(quiet = false) {
  try {
    localStorage.setItem(saveKey, JSON.stringify(createSave()));
    management.invalidSave = false;
    byId("saveStatus").textContent = `Gespeichert ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    if (!quiet) flash("Spielstand gespeichert.");
    return true;
  } catch {
    byId("saveStatus").textContent = "Speichern nicht moeglich. JSON-Export verfuegbar.";
    if (!quiet) flash("Browser-Speicher nicht verfuegbar. Bitte exportieren.");
    return false;
  }
}

function initManagement() {
  management.ready = true;
  initConstruction();initWorldControls();initTownControls();
  byId("saveGame").addEventListener("click", () => saveGame());
  byId("loadGame").addEventListener("click", () => {
    try {
      const saved = localStorage.getItem(saveKey);
      if (!saved) { flash("Kein Spielstand vorhanden."); return; }
      if (window.confirm("Gespeicherten Spielstand laden und den aktuellen Stand ersetzen?")) { restoreSave(saved); flash("Spielstand geladen."); }
    } catch { flash("Spielstand konnte nicht geladen werden."); }
  });
  byId("exportGame").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(createSave(), null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "libre-transport.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  byId("importGame").addEventListener("click", () => byId("importFile").click());
  byId("importFile").addEventListener("change", async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 16_000_000) throw new Error("Spielstand zu gross.");
      const text = await file.text(); decodeSave(text);
      if (window.confirm("Importierten Spielstand laden und den aktuellen Stand ersetzen?")) { restoreSave(text); saveGame(true); flash("Spielstand importiert."); }
    } catch { flash("Ungueltige oder inkompatible Spielstand-Datei."); }
    finally { event.target.value = ""; }
  });
  byId("toggleVehicle").addEventListener("click", () => { if (game.selected?.vehicle) startStopVehicle(game.selected.vehicle); refreshManagement(true); });
  byId("sellVehicle").addEventListener("click", () => {
    if (game.selected?.vehicle && window.confirm("Fahrzeug fuer 65 % des Kaufwerts verkaufen?")) sellVehicle(game.selected.vehicle);
    refreshManagement(true);
  });
  byId("unloadVehicle").addEventListener("click", () => { if (game.selected?.vehicle) unloadForDepot(game.selected.vehicle); refreshManagement(true); });
  byId("recoverVehicle").addEventListener("click",()=>{
    if(game.selected?.vehicle&&window.confirm("Fahrzeug mit seiner Ladung ins Depot bergen? Der blockierte Fahrweg wird freigegeben. Es entstehen keine Liefereinnahmen."))recoverVehicle(game.selected.vehicle);
    refreshManagement(true);
  });
  byId("departVehicle").addEventListener("click",()=>{if(game.selected?.vehicle)departVehicle(game.selected.vehicle);refreshManagement(true);});
  byId("orderForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (game.selected?.vehicle) applyVehicleOrder(game.selected.vehicle, {
      target: byId("orderTarget").value, cargo: byId("orderCargo").value, wagons: Number(byId("orderWagons").value),
      loadMode: byId("orderLoad").value, reverseMode: byId("orderReverse").value
    });
    refreshManagement(true);
  });
  try { const saved = localStorage.getItem(saveKey); if (saved) { restoreSave(saved); byId("saveStatus").textContent = "Spielstand fortgesetzt"; } }
  catch { byId("saveStatus").textContent = "Spielstand ungueltig; nicht ueberschrieben"; management.invalidSave = true; }
  setInterval(() => { if (!management.invalidSave) saveGame(true); }, 15000);
  window.addEventListener("pagehide", () => { if (!management.invalidSave) saveGame(true); });
  refreshManagement(true);
}

initManagement();
