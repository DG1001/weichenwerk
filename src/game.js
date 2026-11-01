const mapWrap = document.querySelector(".map-wrap");
const threeViewport = document.querySelector("#threeViewport");
const THREE = globalThis.ThreeLibrary;

const ui = {
  cash: document.querySelector("#cashLabel"),
  value: document.querySelector("#valueLabel"),
  loan: document.querySelector("#loanLabel"),
  vehicles: document.querySelector("#vehicleLabel"),
  date: document.querySelector("#dateLabel"),
  title: document.querySelector("#selectionTitle"),
  badge: document.querySelector("#tileBadge"),
  text: document.querySelector("#selectionText"),
  cargo: document.querySelector("#cargoLabel"),
  demand: document.querySelector("#demandLabel"),
  production: document.querySelector("#productionLabel"),
  maintenance: document.querySelector("#maintenanceLabel"),
  speed: document.querySelector("#speedLabel"),
  loading: document.querySelector("#loadingLabel"),
  townPanel: document.querySelector("#townPanel"),
  toast: document.querySelector("#toast"),
  log: document.querySelector("#eventLog"),
  stationKind: document.querySelector("#stationKind"),
  buyTrain: document.querySelector("#buyTrainButton"),
  buyTruck: document.querySelector("#buyTruckButton"),
  borrow: document.querySelector("#borrowButton"),
  repay: document.querySelector("#repayButton"),
  rendererStatus: document.querySelector("#rendererStatus"),
  rendererMessage: document.querySelector("#rendererMessage"),
  cameraTools: document.querySelector(".camera-tools"),
  coordinateTools: document.querySelector("#mapCoordinates"),
  coordinateReadout: document.querySelector("#coordinateReadout"),
  buildLoupe: document.querySelector("#buildLoupe"),
  retryRenderer: document.querySelector("#retryRenderer")
};

const config = {
  width: 34,
  height: 26,
  secondsPerDay: 12,
  // OpenTTD's documented 100 km/h reference is about 1.8 tiles/second.
  movementSecondsPerTile: 0.5,
  stationStopSeconds: 1.2,
  costs: {
    rail: 420,
    road: 180,
    station: 2400,
    bulldoze: 80,
    train: 16000,
    truck: 6200,
    bridge: { rail: 900, road: 650 }
  },
  maintenance: {
    rail: 4,
    road: 2,
    station: 35,
    train: 260,
    truck: 90,
    bridge: 6
  }
};

const cargoMeta = {
  passengers: { label: "Passagiere", color: "#3574a8" },
  goods: { label: "Waren", color: "#a66a32" },
  coal: { label: "Kohle", color: "#33383d" },
  grain: { label: "Getreide", color: "#d2a33c" }
};

const game = {
  cash: 90000,
  loan: 40000,
  month: 0,
  dayProgress: 0,
  speed: 1,
  tool: "inspect",
  selected: null,
  hover: null,
  toastUntil: 0,
  map: [],
  stations: [],
  vehicles: [],
  nextVehicleId: 0,
  industries: [],
  towns: [],
  landscape: null,
  log: []
};


const mapCoordinates = { last:null, target:null };

const three = {
  ready: false,
  worldDirty: true,
  renderer: null,
  scene: null,
  camera: null,
  staticGroup: null,
  vehicleGroup: null,
  materials: null,
  tilePickers: [],
  vehicleMeshes: new Map(),
  raycaster: null,
  pointer: null,
  highlight: null,
  coordinateMarker: null,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  originYaw: 0,
  originPitch: 0,
  cab: { vehicle: null, yaw: 0, pitch: 0, dragging: false, projection: null, background: null },
  orbit: {
    yaw: -0.7,
    pitch: 0.86,
    distance: 34,
    targetX: 0,
    targetZ: 1
  }
};

const threeConfig = {
  tileSize: 1.08,
  groundHeight: 0.08
};

function rand(seed) {
  let value = seed % 2147483647;
  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

let random = rand(195001);

function money(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function getTile(x, y) {
  if (x < 0 || y < 0 || x >= config.width || y >= config.height) return null;
  return game.map[y][x];
}

function terrainAt(x, y) {
  if(game.landscape)return naturalTerrainAt(x,y,game.landscape);
  const waterBand = Math.sin((x + 3) * 0.45) * 2.4 + Math.cos(y * 0.38) * 2.2 + 4;
  if (Math.abs(y - waterBand) < 1.05 && x > 2 && x < config.width - 3) return "water";
  const noise = Math.sin(x * 0.73 + y * 0.31) + Math.cos(x * 0.19 - y * 0.61);
  if (noise > 1.08 && y > 5) return "forest";
  if (noise < -1.08 && x > 5) return "field";
  return "grass";
}

function makeMap(settings=null) {
  exitCabView();
  mapCoordinates.last=null;mapCoordinates.target=null;
  if(settings){Object.assign(game,generateLandscape(config.width,config.height,settings));return;}
  game.landscape=null;
  game.map=[];game.towns=[];game.industries=[];
  random=rand(195001);
  for (let y = 0; y < config.height; y += 1) {
    const row = [];
    for (let x = 0; x < config.width; x += 1) {
      row.push({
        x,
        y,
        terrain: terrainAt(x, y),
        build: null,
        town: null,
        industry: null,
        station: null
      });
    }
    game.map.push(row);
  }

  addTown("Nordhafen", 6, 5, 88);
  addTown("Gruenau", 24, 7, 72);
  addTown("Suedmarkt", 12, 19, 104);
  addIndustry("Kohlewerk", 28, 18, "coal", [], 90);
  addIndustry("Farm", 4, 18, "grain", [], 68);
  addIndustry("Fabrik", 20, 14, "goods", ["coal", "grain"], 80);
  populateExtraLand(34,26);
}

function populateExtraLand(oldWidth,oldHeight) {
  if(game.landscape){populateLandscape(game.map,game.towns,game.industries,game.landscape,oldWidth,oldHeight);return;}
  for(let y=10;y<config.height-5;y+=22)for(let x=12;x<config.width-5;x+=26) {
    if(x-3<oldWidth&&y-3<oldHeight)continue;
    const number=game.towns.length+1;
    addTown(`Neustadt ${number}`,x,y,80+number*9);
    const ix=Math.min(config.width-3,x+9),iy=Math.min(config.height-3,y+7);
    const type=game.industries.length%3;
    addIndustry(`Werk ${game.industries.length+1}`,ix,iy,type===0?"coal":type===1?"grain":"goods",type===2?["coal","grain"]:[],80);
  }
}

function claimPatch(centerX, centerY, radius, callback) {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const tile = getTile(x, y);
      if (!tile || tile.terrain === "water") continue;
      const distance = Math.abs(centerX - x) + Math.abs(centerY - y);
      if (distance <= radius + (random() > 0.7 ? 1 : 0)) callback(tile, distance);
    }
  }
}

function addTown(name, x, y, population) {
  const town = { id: game.towns.length, name, x, y, population, accepts: "passengers", produces: "passengers" };
  game.towns.push(town);
  claimPatch(x, y, 2, (tile, distance) => {
    tile.terrain = "town";
    tile.town = town.id;
    if (distance < 2 && !tile.build) tile.build = "house";
  });
}

function addIndustry(name, x, y, produces, accepts, output) {
  const industry = { id: game.industries.length, name, x, y, produces, accepts, output, stock: 0 };
  game.industries.push(industry);
  claimPatch(x, y, 1, (tile) => {
    tile.terrain = "industry";
    tile.industry = industry.id;
    tile.build = "industry";
  });
}


function canAfford(amount) {
  if (game.cash >= amount) return true;
  flash(`Nicht genug Geld: ${money(amount)} benoetigt.`);
  return false;
}

function spend(amount) {
  if (!canAfford(amount)) return false;
  game.cash -= amount;
  return true;
}

function earn(amount) {
  game.cash += amount;
}

function nearbyDemand(tile) {
  const result = { produces: new Set(), accepts: new Set(), sources: new Set() };
  for (let y = tile.y - 2; y <= tile.y + 2; y += 1) {
    for (let x = tile.x - 2; x <= tile.x + 2; x += 1) {
      const target = getTile(x, y);
      if (!target) continue;
      if (target.town !== null) {
        result.sources.add(`town:${target.town}`);
        result.produces.add("passengers");
        result.accepts.add("passengers");
        result.accepts.add("goods");
      }
      if (target.industry !== null) {
        result.sources.add(`industry:${target.industry}`);
        const industry = game.industries[target.industry];
        result.produces.add(industry.produces);
        industry.accepts.forEach((cargo) => result.accepts.add(cargo));
      }
    }
  }
  return result;
}

function buildRail(tile) {
  if (!tile || tile.terrain === "water" || tile.station !== null || (tile.build && tile.build !== "rail")) {
    flash("Dort kann keine Schiene gebaut werden.");
    return;
  }
  if (tile.build === "rail") return;
  if (!railEditSafe(tile, { build: "rail" })) { flash("Bau wuerde zwei belegte Signalbloecke verbinden."); return; }
  if (!spend(config.costs.rail)) return;
  tile.build = "rail";
  mark3dDirty();
  selectTile(tile);
}

function buildRoad(tile) {
  if (!tile || tile.terrain === "water" || tile.station !== null || (tile.build && tile.build !== "road")) {
    flash("Dort kann keine Strasse gebaut werden.");
    return;
  }
  if (tile.build === "road") return;
  if (!spend(config.costs.road)) return;
  tile.build = "road";
  mark3dDirty();
  selectTile(tile);
}

function buildStation(tile) {
  if(tile?.station!==null && tile?.station!==undefined) {if(game.stations[tile.station])selectStation(game.stations[tile.station]);return;}
  if (!tile || tile.bridge || tile.terrain === "water" || tile.station !== null || tile.build === "house" || tile.build === "industry") {
    flash("Dort passt keine Station hin.");
    return;
  }
  const kind = ui.stationKind.value;
  if (tile.signal) { flash("Vor dem Stationsbau zuerst das Signal entfernen."); return; }
  if (tile.build && tile.build !== kind) {
    flash("Station und vorhandener Verkehrsweg passen nicht zusammen.");
    return;
  }
  const adjacent=new Set(Object.values(railDirections).map(d=>getTile(tile.x+d.x,tile.y+d.y)?.station).filter(id=>id!==null&&id!==undefined));
  if(adjacent.size>1) {flash("Zwei Stationen koennen hier nicht verbunden werden.");return;}
  if(adjacent.size===1) {
    const station=game.stations[[...adjacent][0]],tiles=[...stationTiles(station),{x:tile.x,y:tile.y}];
    if(station.kind!==kind || tiles.length>8 || !(tiles.every(p=>p.x===tiles[0].x)||tiles.every(p=>p.y===tiles[0].y))) {
      flash("Bahnsteige muessen gerade bleiben und duerfen hoechstens 8 Felder lang sein.");return;
    }
    if(game.vehicles.some(v=>trainFootprint(v).some(p=>p.x===tile.x&&p.y===tile.y))) {flash("Das Feld ist durch ein Fahrzeug belegt.");return;}
    if(!railEditSafe(tile,{build:kind==="rail"?"stationRail":"stationRoad",station:station.id})) {flash("Das Feld ist reserviert.");return;}
    if(!spend(800))return;
    tile.station=station.id;tile.build=kind==="rail"?"stationRail":"stationRoad";station.tiles=tiles;
    refreshStationSources(station);mark3dDirty();selectStation(station);return;
  }
  if (!railEditSafe(tile, { build: kind === "rail" ? "stationRail" : "stationRoad", station: game.stations.length })) {
    flash("Bau wuerde belegte Signalbloecke verbinden."); return;
  }
  if (!spend(config.costs.station)) return;
  const demand = nearbyDemand(tile);
  const station = {
    id: game.stations.length,
    x: tile.x,
    y: tile.y,
    kind,
    tiles:[{x:tile.x,y:tile.y}],
    name: `${kind === "rail" ? "Bf." : "Hof"} ${nearestPlaceName(tile)}`,
    waiting: { passengers: 0, goods: 0, coal: 0, grain: 0 },
    accepts: [...demand.accepts],
    produces: [...demand.produces],
    sources: [...demand.sources],
    delivered: 0
  };
  game.stations.push(station);
  tile.station = station.id;
  tile.build = kind === "rail" ? "stationRail" : "stationRoad";
  mark3dDirty();
  log(`${station.name} eroeffnet.`);
  selectStation(station);
}

function bulldoze(tile) {
  if(tile?.bridge){bulldozeBridge(tile);return;}
  if (!tile || tile.terrain === "water") return;
  if (!tile.build && tile.station === null) {
    flash("Hier gibt es nichts abzureissen.");
    return;
  }
  if (tile.build === "house" || tile.build === "industry") {
    flash("Stadt- und Industriefelder sind geschuetzt.");
    return;
  }
  if (tile.station !== null && game.vehicles.some((v) => v.from === tile.station || v.to === tile.station)) {
    flash("Die Station wird noch von Fahrzeugen angefahren.");
    return;
  }
  if(tile.station!==null&&stationTiles(game.stations[tile.station]).length===1&&Object.values(game.stations[tile.station].returnedCargo||{}).some(n=>n>0)) {
    flash("An diesem Bahnhof lagern noch Rueckgaben. Abriss ist erst nach deren Abtransport moeglich.");return;
  }
  if (game.vehicles.some((v) => Array.from({ length: vehicleCarCount(v) }, (_, i) => sampleVehiclePath(v, i * 0.58).tile)
    .some((point) => Math.abs(point.x - tile.x) < 0.6 && Math.abs(point.y - tile.y) < 0.6))) {
    flash("Ein Fahrzeug belegt dieses Feld.");
    return;
  }
  if (!railEditSafe(tile, tile.signal ? { signal: null } : { build: null, station: null })) {
    flash("Abriss wuerde belegte Signalbloecke verbinden."); return;
  }
  if (!spend(config.costs.bulldoze)) return;
  if (tile.signal) { tile.signal = null; mark3dDirty(); selectTile(tile); return; }
  if (tile.station !== null) {
    const station = game.stations[tile.station];
    if(stationTiles(station).length>1) {
      if(tile.x===station.x&&tile.y===station.y){game.cash+=config.costs.bulldoze;flash("Zuerst die Bahnsteigenden entfernen.");return;}
      const otherTiles=stationTiles(station).filter(p=>p.x!==tile.x||p.y!==tile.y);
      const axis=otherTiles.every(p=>p.x===otherTiles[0].x)?"y":"x";
      if(tile[axis]>Math.min(...otherTiles.map(p=>p[axis]))&&tile[axis]<Math.max(...otherTiles.map(p=>p[axis]))) {game.cash+=config.costs.bulldoze;flash("Nur Bahnsteigenden koennen entfernt werden.");return;}
      station.tiles=otherTiles;tile.station=null;tile.build=null;delete tile.links;refreshStationSources(station);mark3dDirty();selectStation(station);return;
    }
    station.closed = true;
    game.vehicles = game.vehicles.filter((vehicle) => vehicle.from !== station.id && vehicle.to !== station.id);
    tile.station = null;
  }
  tile.build = null;
  delete tile.links;
  for (const vehicle of game.vehicles) {
    vehicle.blocked = !vehicleRouteAheadOpen(vehicle);
  }
  if (game.selected?.vehicle && !game.vehicles.includes(game.selected.vehicle)) game.selected = null;
  mark3dDirty();
  selectTile(tile);
}

function nearestPlaceName(tile) {
  const places = [
    ...game.towns.map((town) => ({ name: town.name, x: town.x, y: town.y })),
    ...game.industries.map((industry) => ({ name: industry.name, x: industry.x, y: industry.y }))
  ];
  places.sort((a, b) => Math.abs(a.x - tile.x) + Math.abs(a.y - tile.y) - (Math.abs(b.x - tile.x) + Math.abs(b.y - tile.y)));
  return places[0]?.name || "Land";
}

function routeTypeForVehicle(type) {
  return type === "train" ? "rail" : "road";
}

function passable(tile, kind) {
  if (!tile) return false;
  if (kind === "rail") return tile.build === "rail" || tile.build === "stationRail";
  return tile.build === "road" || tile.build === "stationRoad";
}

function planBridge(a,b,kind) {
  if(!["rail","road"].includes(kind)||a.x!==b.x&&a.y!==b.y)throw new Error("Bruecken muessen gerade von Ufer zu Ufer verlaufen.");
  const axis=a.x===b.x?"y":"x",cross=axis==="x"?"y":"x",start=Math.min(a[axis],b[axis]),end=Math.max(a[axis],b[axis]);
  if(end-start<2||end-start>33)throw new Error("Eine Bruecke braucht zwei Ufer und 1 bis 32 Wasserfelder.");
  const bridge={axis,start,end},path=[];
  for(let n=start;n<=end;n++) {
    const p=axis==="x"?{x:n,y:a.y}:{x:a.x,y:n},tile=getTile(p.x,p.y),bank=n===start||n===end;
    if(!tile||tile.bridge||tile.signal||tile.station!==null)throw new Error("Der Brueckenbereich ist bereits bebaut oder liegt ausserhalb der Karte.");
    if(bank?tile.terrain==="water"||tile.build&&!passable(tile,kind):tile.terrain!=="water"||tile.build)throw new Error("Zwei freie Ufer waehlen; dazwischen darf nur unbebautes Wasser liegen.");
    if(bank&&Object.values(railDirections).some(d=>d[cross]&&networkConnected(tile,getTile(tile.x+d.x,tile.y+d.y),kind)))throw new Error("Die Brueckenrampe braucht einen geraden Anschluss ohne Abzweig.");
    path.push(p);
  }
  return {path,bridge};
}

function bridgeTiles(tile,map=game.map) {
  const b=tile.bridge;if(!b)return [];
  return Array.from({length:b.end-b.start+1},(_,i)=>b.axis==="x"?map[tile.y]?.[b.start+i]:map[b.start+i]?.[tile.x]).filter(Boolean);
}

function validBridge(tile,map) {
  const b=tile.bridge;
  if(!b||!["x","y"].includes(b.axis)||!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<0||b.end-b.start<2||b.end-b.start>33
    ||b.end>=(b.axis==="x"?map[0].length:map.length)||tile[b.axis]<b.start||tile[b.axis]>b.end||!["rail","road"].includes(tile.build))return false;
  const mask=b.axis==="x"?3:12,forward=b.axis==="x"?1:4,back=b.axis==="x"?2:8;
  return bridgeTiles(tile,map).every(t=>t.bridge?.axis===b.axis&&t.bridge.start===b.start&&t.bridge.end===b.end&&t.build===tile.build&&t.station===null&&!t.signal
    &&Number.isInteger(t.links)&&!(t.links&~mask)&&(t[b.axis]===b.start?Boolean(t.links&forward):t[b.axis]===b.end?Boolean(t.links&back):t.links===mask)
    &&(t[b.axis]===b.start||t[b.axis]===b.end?t.terrain!=="water":t.terrain==="water"));
}

function bridgeRiseAt(bridge,x,y) {
  const n=bridge.axis==="x"?x:y;
  return 0.48*clamp(Math.min(n-bridge.start+0.5,bridge.end+0.5-n),0,1);
}

function routeElevationAt(x,y) {
  const tile=game.map[Math.floor(y+0.5)]?.[Math.floor(x+0.5)];
  return tile?.bridge?bridgeRiseAt(tile.bridge,x,y):0;
}

function bulldozeBridge(tile) {
  const tiles=bridgeTiles(tile),keys=new Set(tiles.map(t=>tileKey(t.x,t.y))),reserved=reservedTiles();
  if(game.vehicles.some(v=>trainFootprint(v).some(p=>keys.has(tileKey(p.x,p.y))))||[...keys].some(k=>reserved.has(k))) {
    flash("Die Bruecke ist belegt oder reserviert. Zuerst den gesamten Fahrweg freimachen.");return false;
  }
  if(!spend(tiles.length*config.costs.bulldoze))return false;
  for(const t of tiles){t.build=null;delete t.bridge;delete t.links;}
  for(const v of game.vehicles)v.blocked=!vehicleRouteAheadOpen(v);
  mark3dDirty();log("Bruecke vollstaendig abgerissen; Wasser und Ufer bleiben erhalten.");selectTile(tile);return true;
}

function stationCompatible(station, type) {
  return station && !station.closed && station.kind === routeTypeForVehicle(type);
}

function neighbors(node, kind) {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  return directions
    .map(([dx, dy]) => getTile(node.x + dx, node.y + dy))
    .filter((tile) => networkConnected(getTile(node.x,node.y),tile,kind) && (kind !== "rail" || railStepAllowed(node, tile)));
}

function findPath(fromStation, toStation, kind) {
  const start = getTile(fromStation.x, fromStation.y);
  const goalKey = tileKey(toStation.x, toStation.y);
  if(!passable(start,kind))return null;
  const queue = [start];
  const cameFrom = new Map([[tileKey(start.x, start.y), null]]);
  for(let head=0;head<queue.length;head++) {
    const current = queue[head];
    const currentKey = tileKey(current.x, current.y);
    if (currentKey === goalKey) break;
    for (const next of neighbors(current, kind)) {
      const key = tileKey(next.x, next.y);
      if (cameFrom.has(key)) continue;
      cameFrom.set(key, current);
      queue.push(next);
    }
  }
  if (!cameFrom.has(goalKey)) return null;
  const path = [];
  let current = getTile(toStation.x, toStation.y);
  while (current) {
    path.push({ x: current.x, y: current.y });
    current = cameFrom.get(tileKey(current.x, current.y));
  }
  return path.reverse();
}

function routeScore(from, to) {
  let best = 0;
  for (const cargo of from.produces) {
    if (to.accepts.includes(cargo)) best += 100;
  }
  for (const cargo of to.produces) {
    if (from.accepts.includes(cargo)) best += 70;
  }
  const distance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  return best - distance * 0.1;
}

function findBestRoute(from, type) {
  const kind = routeTypeForVehicle(type);
  const candidates = game.stations
    .filter((station) => station.id !== from.id && stationCompatible(station, type))
    .map((station) => ({ station, path: findPath(from, station, kind) }))
    .filter((candidate) => candidate.path && candidate.path.length > 1 && routeCargo(from, candidate.station))
    .sort((a, b) => routeScore(from, b.station) - routeScore(from, a.station));
  return candidates[0] || null;
}

function routeCargo(from, to) {
  return from.produces.find((cargo) => to.accepts.includes(cargo))
    || to.produces.find((cargo) => from.accepts.includes(cargo));
}

function buyVehicle(type, options = {}) {
  const selectedStation = game.selected?.station;
  if (!selectedStation || !stationCompatible(selectedStation, type)) {
    flash(type === "train" ? "Waehle einen Bahnhof aus." : "Waehle eine Truck-Station aus.");
    return;
  }
  const targetChosen = options.target !== undefined && options.target !== "";
  const target = targetChosen ? game.stations[Number(options.target)] : null;
  const route = target && stationCompatible(target, type) && target.id !== selectedStation.id
    ? { station: target, path: findPath(selectedStation, target, routeTypeForVehicle(type)) }
    : targetChosen ? null : findBestRoute(selectedStation, type);
  if (!route || !route.path || !routeCargo(selectedStation, route.station)) {
    flash("Keine verbundene Zielstation mit passender Fracht gefunden.");
    return;
  }
  const cargo = options.cargo || routeCargo(selectedStation, route.station);
  if (!((selectedStation.produces.includes(cargo) && route.station.accepts.includes(cargo))
    || (route.station.produces.includes(cargo) && selectedStation.accepts.includes(cargo)))) {
    flash("Diese Fracht passt nicht zu den Stationen.");
    return;
  }
  const carCount = type === "train" && options.wagons !== undefined ? Number(options.wagons) + 1 : vehicleCarCount({ type, path: route.path });
  if (!Number.isInteger(carCount) || carCount < 1 || carCount > 9 || (carCount - 1) * 0.58 + 0.5 > route.path.length - 1) {
    flash("Zu viele Wagen fuer diese Strecke.");
    return;
  }
  const cost = type === "train" ? config.costs.train + Math.max(0, carCount - 5) * 1000 : config.costs.truck;
  const vehicle = {
    id: game.nextVehicleId,
    type,
    from: selectedStation.id,
    to: route.station.id,
    path: route.path,
    index: 0,
    dir: 1,
    progress: 0,
    cargo,
    carCount,
    purchaseCost: cost,
    stopped: false,
    loadMode: "available",
    reverseMode: "classic",
    load: 0,
    capacity: type === "train" ? Math.max(16, (carCount - 1) * 20) : 28,
    speed: type === "train" ? 0.82 : 0.58,
    profit: 0
  };
  if (type === "train" && !prepareRailPlacement(vehicle)) {
    flash("Kein freier Startbereich mit sicherem Fahrweg."); return;
  }
  if (!spend(cost)) return;
  game.nextVehicleId += 1;
  game.vehicles.push(vehicle);
  beginStationService(vehicle,true);
  log(`${type === "train" ? "Zug" : "Truck"} ${vehicle.id + 1} faehrt ${selectedStation.name} - ${route.station.name}.`);
  selectVehicle(vehicle);
}

function produceCargo(deltaDays) {
  for(const station of game.stations.filter(s=>!s.closed))for(const cargo of Object.keys(cargoMeta))refillReturnedCargo(station,cargo);
  const stations = game.stations.filter((station) => !station.closed)
    .map((station) => ({ station, sources: new Set(station.sources || nearbyDemand(station).sources) }));
  const sources = [
    ...game.towns.map((town) => ({ key: `town:${town.id}`, cargo: "passengers", output: town.population * 0.4 })),
    ...game.industries.map((industry) => ({ key: `industry:${industry.id}`, cargo: industry.produces, output: industry.output, industry }))
  ];
  for (const source of sources) {
    const targets = stations.filter((entry) => entry.sources.has(source.key));
    let produced = source.output * deltaDays / 30;
    if (source.industry?.accepts.length) {
      produced = Math.min(produced, source.industry.stock);
      source.industry.stock -= produced;
    }
    if (!targets.length) continue;
    for (const { station } of targets) {
      station.waiting[source.cargo] = clamp((station.waiting[source.cargo] || 0) + produced / targets.length, 0, 420);
    }
  }
}

function nearbyIndustryTile(station, cargo) {
  for (let y = station.y - 2; y <= station.y + 2; y += 1) {
    for (let x = station.x - 2; x <= station.x + 2; x += 1) {
      const tile = getTile(x, y);
      if (tile && tile.industry !== null) {
        const industry = game.industries[tile.industry];
        if (industry.produces === cargo) return tile;
      }
    }
  }
  return null;
}

function nearbyPopulation(station) {
  let population = 0;
  const counted = new Set();
  for (let y = station.y - 2; y <= station.y + 2; y += 1) {
    for (let x = station.x - 2; x <= station.x + 2; x += 1) {
      const tile = getTile(x, y);
      if (tile && tile.town !== null && !counted.has(tile.town)) {
        counted.add(tile.town);
        population += game.towns[tile.town].population;
      }
    }
  }
  return population;
}

function updateVehicles(deltaSeconds) {
  let remaining = deltaSeconds;
  while (remaining > 1e-9) {
    const step = Math.min(remaining, 0.02);
    advanceVehicles(step);
    remaining -= step;
  }
}

function advanceVehicles(deltaSeconds) {
  for (const vehicle of game.vehicles) {
    if(vehicle.inDepot)continue;
    if (vehicle.stopped && (vehicle.velocity||0)<1e-6) { vehicle.velocity=0; continue; }
    if (!vehicle.path || vehicle.path.length < 2) continue;
    if (vehicle.blocked) {
      vehicle.blocked = !vehicleRouteAheadOpen(vehicle);
      if (vehicle.blocked) {vehicle.velocity=0;continue;}
    }
    if (vehicle.servicePhase || vehicle.stationWait>0 || vehicle.loadingAtOrigin) {
      if(!vehicle.stopped)serviceVehicle(vehicle,deltaSeconds);
    } else {
      driveVehicle(vehicle,deltaSeconds);
    }
  }
}

function visitStation(vehicle) {
  const currentId = vehicle.dir > 0 ? vehicle.to : vehicle.from;
  const otherId = vehicle.dir > 0 ? vehicle.from : vehicle.to;
  const current = game.stations[currentId];
  const other = game.stations[otherId];
  if (!current || !other || current.closed || other.closed) return;

  if (vehicle.load > 0 && current.accepts.includes(vehicle.cargo) && current.id !== vehicle.cargoOrigin) {
    const payout = deliverCargo(vehicle,current,vehicle.load);
    log(`${cargoMeta[vehicle.cargo].label} geliefert: ${money(payout)}.`);
  }

  loadVehicle(vehicle, current, other);
}

function deliverCargo(vehicle,current,amount) {
  const payout=amount*(vehicle.path.length*9+(vehicle.type === "train"?52:34));
  earn(payout);vehicle.profit+=payout;current.delivered+=amount;
  const consumer=game.industries.find(industry=>industry.accepts.includes(vehicle.cargo)&&new Set(current.sources||nearbyDemand(current).sources).has(`industry:${industry.id}`));
  if(consumer)consumer.stock+=amount;
  recordTownTransport(vehicle,current,amount);
  vehicle.load-=amount;if(vehicle.load===0)vehicle.cargoOrigin=null;
  return payout;
}

function stationWaitingAmount(station,cargo) {
  return (station.waiting[cargo]||0)+(station.returnedCargo?.[cargo]||0);
}

function refillReturnedCargo(station,cargo) {
  const returned=station.returnedCargo?.[cargo]||0;
  const amount=Math.min(returned,Math.max(0,Math.floor(420-(station.waiting[cargo]||0))));
  if(amount<=0)return;
  station.waiting[cargo]=(station.waiting[cargo]||0)+amount;
  station.returnedCargo[cargo]-=amount;
  if(!station.returnedCargo[cargo])delete station.returnedCargo[cargo];
  if(!Object.keys(station.returnedCargo).length)delete station.returnedCargo;
}

function returnCargoToStation(station,cargo,amount) {
  if(!Object.hasOwn(cargoMeta,cargo)||!Number.isInteger(amount)||amount<0)return false;
  const queued=station.waiting[cargo]||0,room=Math.max(0,Math.floor(420-queued)),direct=Math.min(amount,room),overflow=amount-direct;
  if((station.returnedCargo?.[cargo]||0)+overflow>1e9)return false;
  station.waiting[cargo]=queued+direct;
  if(overflow>0){station.returnedCargo||={};station.returnedCargo[cargo]=(station.returnedCargo[cargo]||0)+overflow;}
  return true;
}

function loadVehicle(vehicle, current, other) {
  if (vehicle.loadMode === "none") return;
  const cargo = vehicle.cargo;
  if (!current.produces.includes(cargo) || !other.accepts.includes(cargo)) return;
  refillReturnedCargo(current,cargo);
  const amount = Math.min(vehicle.capacity - vehicle.load, Math.floor(current.waiting[cargo] || 0));
  if (amount > 0 && vehicle.load === 0) vehicle.cargoOrigin = current.id;
  vehicle.load += amount;
  recordTownTransport(vehicle,current,amount,true);
  current.waiting[cargo] = Math.max(0, (current.waiting[cargo] || 0) - amount);
  refillReturnedCargo(current,cargo);
}

function monthlyAccounting() {
  const trackCount = game.map.flat().filter((tile) => tile.build === "rail").length;
  const roadCount = game.map.flat().filter((tile) => tile.build === "road").length;
  const stationCount = game.stations.filter((station) => !station.closed).length;
  const trainCount = game.vehicles.filter((vehicle) => vehicle.type === "train").length;
  const truckCount = game.vehicles.filter((vehicle) => vehicle.type === "truck").length;
  const upkeep = trackCount * config.maintenance.rail
    + game.map.flat().filter((tile) => tile.signal).length * 5
    + roadCount * config.maintenance.road
    + game.map.flat().filter(tile=>tile.bridge).length * config.maintenance.bridge
    + stationCount * config.maintenance.station
    + game.stations.filter(s=>!s.closed).reduce((sum,s)=>sum+(stationTiles(s).length-1)*10,0)
    + trainCount * config.maintenance.train
    + truckCount * config.maintenance.truck
    + Math.round(game.loan * 0.004);
  game.cash -= upkeep;
  if (upkeep > 0) log(`Monatskosten: ${money(upkeep)}.`);
  updateTownGrowth();
}

function update(deltaMs) {
  if (game.speed === 0) return;
  let remaining=deltaMs/1000*game.speed;
  while(remaining>1e-9) {
    const step=Math.min(remaining,(30-game.dayProgress)*config.secondsPerDay);
    produceCargo(step/config.secondsPerDay);
    updateVehicles(step);
    game.dayProgress+=step/config.secondsPerDay;remaining-=step;
    if(game.dayProgress>=30-1e-9) {
      game.dayProgress=0;game.month++;monthlyAccounting();
    }
  }
}


function sampleVehiclePath(vehicle, trailerOffset) {
  const max = vehicle.path.length - 1;
  const span = (vehicleCarCount(vehicle) - 1) * 0.58;
  // Classic whole-consist reversal: the locomotive leads in either direction.
  const progress = clamp(vehicle.index + vehicle.dir * vehicle.progress, 0, max);
  const anchor = progress * vehicleTravelDistance(vehicle) / max;
  const classic = vehicle.reverseMode !== "backwards";
  const routeProgress = anchor + (!classic || vehicle.dir > 0 ? span - trailerOffset : trailerOffset);
  const tile = sampleRoute(vehicle.path, routeProgress);
  const ahead = sampleRoute(vehicle.path, routeProgress + 0.001);
  const behind = sampleRoute(vehicle.path, routeProgress - 0.001);
  const direction = classic ? vehicle.dir : 1;
  const front=sampleRoute(vehicle.path,routeProgress+0.2),back=sampleRoute(vehicle.path,routeProgress-0.2);
  const frontHeight=routeElevationAt(front.x,front.y),backHeight=routeElevationAt(back.x,back.y);
  return { tile, heading: Math.atan2((ahead.x - behind.x) * direction, (ahead.y - behind.y) * direction),
    elevation:(frontHeight+backHeight)/2,pitch:-Math.atan2((frontHeight-backHeight)*direction,Math.hypot(front.x-back.x,front.y-back.y)*threeConfig.tileSize) };
}

function vehicleCarCount(vehicle) {
  if (vehicle.carCount) return vehicle.carCount;
  return Math.max(1, Math.min(vehicle.type === "train" ? 5 : 2, Math.floor((vehicle.path.length - 1) / 0.7)));
}

function vehicleTravelDistance(vehicle) {
  return vehicle.path.length - 1 - (vehicleCarCount(vehicle) - 1) * 0.58;
}

function sampleRoute(path, distance) {
  const max = path.length - 1;
  if (max <= 0) return { x: path[0]?.x || 0, y: path[0]?.y || 0 };
  const routeProgress = clamp(distance, 0, max);
  const corner = Math.round(routeProgress);
  if (corner > 0 && corner < max) {
    const c = path[corner], prev = path[corner - 1], next = path[corner + 1];
    const a = { dx: prev.x - c.x, dy: prev.y - c.y };
    const b = { dx: next.x - c.x, dy: next.y - c.y };
    if (Math.abs(a.dx) + Math.abs(a.dy) === 1 && Math.abs(b.dx) + Math.abs(b.dy) === 1 && a.dx * b.dx + a.dy * b.dy === 0) {
      const p = routePathPoint({ a, b, curved: true }, routeProgress - corner + 0.5);
      return { x: c.x + p.x, y: c.y + p.y };
    }
  }
  const baseIndex = Math.min(Math.floor(routeProgress), max - 1);
  const blend = routeProgress - baseIndex;
  const a = path[baseIndex];
  const b = path[baseIndex + 1] || a;
  const x = a.x + (b.x - a.x) * blend;
  const y = a.y + (b.y - a.y) * blend;
  return { x, y };
}

function render() {
  updateCoordinateReadout();
  render3d();
}

function mark3dDirty() {
  three.worldDirty = true;
  traffic.dirty = true;
  traffic.revision += 1;
}

function loadThree() {
  try {
    if (!THREE) throw new Error("Three.js fehlt.");
    init3d();
    ui.rendererStatus.hidden = true;
    ui.cameraTools.hidden = false;
    ui.coordinateTools.hidden = false;
  } catch (error) {
    three.ready = false;
    three.renderer?.dispose();
    three.renderer?.domElement.remove();
    ui.rendererMessage.textContent = THREE
      ? "3D konnte nicht gestartet werden. Bitte WebGL aktivieren oder einen anderen Browser verwenden."
      : "Die 3D-Bibliothek fehlt. Bitte die Projektdateien vollstaendig bereitstellen.";
    ui.rendererStatus.hidden = false;
    ui.cameraTools.hidden = true;
    ui.coordinateTools.hidden = true;
    ui.retryRenderer.hidden = false;
  }
}

function init3d() {
  three.renderer = new THREE.WebGLRenderer({ antialias: true });
  three.renderer.outputColorSpace=THREE.SRGBColorSpace;
  three.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  three.renderer.toneMappingExposure=0.95;
  three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  threeViewport.appendChild(three.renderer.domElement);
  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0xa9c3ad);
  three.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1500);
  three.loupeCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  three.raycaster = new THREE.Raycaster();
  three.pointer = new THREE.Vector2();
  three.materials = make3dMaterials();
  initModelLibrary();
  for(const [kind,palette] of Object.entries(landscapePalette))if(Array.isArray(palette))three.materials[kind+"Variants"]=palette.map(color=>new THREE.MeshLambertMaterial({color}));
  three.materials.shore=new THREE.MeshLambertMaterial({color:landscapePalette.shore});
  three.materials.blocks = blockPalette.map((color) => new THREE.MeshLambertMaterial({ color }));

  const hemi = new THREE.HemisphereLight(0xf3f7ea, 0x506b55, 1.6);
  three.scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-12, 24, 10);
  three.scene.add(sun);

  three.staticGroup = new THREE.Group();
  three.routeBatches = new Map();
  three.vehicleGroup = new THREE.Group();
  three.scene.add(three.staticGroup);
  three.scene.add(three.vehicleGroup);
  traffic.reservationOverlay = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.018, 0.95),
    new THREE.MeshBasicMaterial({ color: 0xffdf52, transparent: true, opacity: 0.65, depthWrite: false }), config.width * config.height);
  traffic.reservationOverlay.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  traffic.reservationOverlay.count = 0;
  traffic.reservationOverlay.frustumCulled = false;
  three.scene.add(traffic.reservationOverlay);
  three.highlight = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.025, 1.06),
    new THREE.MeshBasicMaterial({ color: 0xffdf68, transparent: true, opacity: 0.5, depthWrite: false }));
  three.highlight.visible = false;
  three.scene.add(three.highlight);
  three.coordinateMarker=new THREE.Group();
  const markerBox=new THREE.BoxGeometry(1.01,0.025,1.01);
  const markerFill=new THREE.Mesh(markerBox,new THREE.MeshBasicMaterial({color:0xffb52c,transparent:true,opacity:0.28,depthTest:false,depthWrite:false,toneMapped:false}));
  markerFill.renderOrder=3;three.coordinateMarker.add(markerFill);
  const markerEdge=new THREE.LineSegments(new THREE.EdgesGeometry(markerBox),new THREE.LineBasicMaterial({color:0xffb52c,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  markerEdge.renderOrder=4;three.coordinateMarker.add(markerEdge);
  three.coordinateMarker.visible=false;three.scene.add(three.coordinateMarker);

  three.ready = true;
  rebuild3dWorld();
  bindMapTarget(three.renderer.domElement);
  resize3d();
  update3dCamera();
  if(!three.cameraRestored)fitCamera();
}

function make3dMaterials() {
  return {
    grass: new THREE.MeshLambertMaterial({ color: 0x79b96c }),
    forest: new THREE.MeshLambertMaterial({ color: 0x5f9e59 }),
    field: new THREE.MeshLambertMaterial({ color: 0xc8b867 }),
    water: new THREE.MeshLambertMaterial({ color: 0x70abc2, transparent: true, opacity: 0.86 }),
    town: new THREE.MeshLambertMaterial({ color: 0x98aa88 }),
    industryGround: new THREE.MeshLambertMaterial({ color: 0x99987f }),
    edge: new THREE.LineBasicMaterial({ color: 0x58735b, transparent: true, opacity: 0.62 }),
    railBase: new THREE.MeshLambertMaterial({ color: 0x6f746b }),
    railMetal: new THREE.MeshLambertMaterial({ color: 0xd8d0be }),
    road: new THREE.MeshLambertMaterial({ color: 0x565f5d }),
    roadStripe: new THREE.MeshLambertMaterial({ color: 0xe6d7a8 }),
    bridgeDeck: new THREE.MeshLambertMaterial({ color: 0x858d88 }),
    bridgeSteel: new THREE.MeshLambertMaterial({ color: 0x52766e }),
    bridgePier: new THREE.MeshLambertMaterial({ color: 0xb2b6ae }),
    platform: new THREE.MeshLambertMaterial({ color: 0xd7ddcf }),
    platformRoad: new THREE.MeshLambertMaterial({ color: 0xcdd7da }),
    house: new THREE.MeshLambertMaterial({ color: 0xe7dfcb }),
    roof: new THREE.MeshLambertMaterial({ color: 0xa34d3b }),
    industry: new THREE.MeshLambertMaterial({ color: 0x686f70 }),
    smoke: new THREE.MeshLambertMaterial({ color: 0xf3f2e8, transparent: true, opacity: 0.72 }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x74583d }),
    leaves: new THREE.MeshLambertMaterial({ color: 0x236b40 }),
    train: new THREE.MeshLambertMaterial({ color: 0xb83b32 }),
    wagon: new THREE.MeshLambertMaterial({ color: 0x9b6a32 }),
    truck: new THREE.MeshLambertMaterial({ color: 0x315f8c }),
    cargo: new THREE.MeshLambertMaterial({ color: 0xd2a33c }),
    window: new THREE.MeshLambertMaterial({ color: 0xc5e9f2 }),
    wheels: new THREE.MeshLambertMaterial({ color: 0x24292c }),
    signalRed: new THREE.MeshBasicMaterial({ color: 0xff4038 }),
    signalGreen: new THREE.MeshBasicMaterial({ color: 0x43ef79 }),
    signalArrow: new THREE.MeshBasicMaterial({ color: 0xfff4b0 }),
    signalPath: new THREE.MeshLambertMaterial({ color: 0x168f9c })
  };
}

function rebuild3dWorld() {
  if (!three.ready) return;
  if(traffic.reservationOverlay.instanceMatrix.count!==config.width*config.height) {
    const old=traffic.reservationOverlay;three.scene.remove(old);old.dispose();old.geometry.dispose();
    const overlay=new THREE.InstancedMesh(new THREE.BoxGeometry(0.95,0.018,0.95),old.material,config.width*config.height);
    overlay.instanceMatrix.setUsage(THREE.DynamicDrawUsage);overlay.count=0;overlay.frustumCulled=false;
    traffic.reservationOverlay=overlay;three.scene.add(overlay);
  }
  three.scene.remove(three.staticGroup);
  disposeGroup(three.staticGroup);
  three.staticGroup = new THREE.Group();
  three.tilePickers = [];
  traffic.lamps = [];
  three.scene.add(three.staticGroup);
  add3dGround();
  addWorldModels(three.staticGroup);

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const tile = getTile(x, y);
      add3dTile(tile);
    }
  }
  finishRouteMeshes3d(three.staticGroup);
  three.worldDirty = false;
}

function add3dGround() {
  const groups=new Map(),fields=[],matrix=new THREE.Matrix4();
  const batch=(geometry,material,positions,rotation=0)=>{
    if(!positions.length){geometry.dispose();return;}
    const mesh=new THREE.InstancedMesh(geometry,material,positions.length);
    positions.forEach(([x,y,z],i)=>{matrix.makeRotationY(rotation);matrix.setPosition(x,y,z);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;three.staticGroup.add(mesh);
  };
  for(const tile of game.map.flat()) {
    const w=tileToWorld3d(tile.x,tile.y),block=game.showBlocks?railBlocks().get(tileKey(tile.x,tile.y)):undefined;
    let material=three.materials[tile.terrain==="industry"?"industryGround":tile.terrain];
    if(tile.build==="industry"&&game.industries[tile.industry]?.produces==="grain")material=three.materials.farmSoil;
    if(tile.shore&&!tile.build)material=three.materials.shore;
    else if(tile.shade!==undefined&&three.materials[tile.terrain+"Variants"])material=three.materials[tile.terrain+"Variants"][tile.shade];
    if(block!==undefined)material=three.materials.blocks[blockColorIndex(block)];
    if(!groups.has(material))groups.set(material,[]);
    groups.get(material).push([w.x,tile.terrain==="water"?-0.05:0,w.z]);
    if(!tile.build&&tile.terrain==="field")for(let i=-2;i<=2;i++)fields.push([w.x+i*0.16,0.085,w.z]);
  }
  for(const [material,positions] of groups)batch(new THREE.BoxGeometry(threeConfig.tileSize,threeConfig.groundHeight,threeConfig.tileSize),material,positions);
  batch(new THREE.BoxGeometry(0.04,0.025,0.86),three.materials.roadStripe,fields,Math.PI/5);
  const vertices=[],size=threeConfig.tileSize,x0=-config.width*size/2,z0=-config.height*size/2;
  for(let x=0;x<=config.width;x++)vertices.push(x0+x*size,0.043,z0,x0+x*size,0.043,-z0);
  for(let y=0;y<=config.height;y++)vertices.push(x0,0.043,z0+y*size,-x0,0.043,z0+y*size);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  three.staticGroup.add(new THREE.LineSegments(geometry,three.materials.edge));
}

function add3dTile(tile) {
  const group = three.staticGroup;
  const world = tileToWorld3d(tile.x, tile.y);
  if(tile.bridge) {
    addRouteStrip3d(world,tileRoutePaths(tile,tile.build)[0],three.materials.bridgeDeck,0.78,0,0.035,0,1,0.1);
    if(tile[tile.bridge.axis]===tile.bridge.start)addBridge3d(group,tile);
  }
  if (tile.build === "rail" || tile.build === "stationRail") addRail3d(group, tile, tile.build === "stationRail");
  if (tile.build === "road" || tile.build === "stationRoad") addRoad3d(group, tile, tile.build === "stationRoad");
  if (tile.signal) addSignal3d(tile);
}

function tileToWorld3d(x, y) {
  return {
    x: (x - (config.width - 1) / 2) * threeConfig.tileSize,
    z: (y - (config.height - 1) / 2) * threeConfig.tileSize
  };
}

function networkDirections(tile, kind) {
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];
  const connected = dirs.filter((dir) => networkConnected(tile,getTile(tile.x + dir.dx, tile.y + dir.dy), kind));
  if (connected.length) return connected;
  return kind === "rail" ? [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }] : [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
}

// A single centreline definition keeps road surfaces, rails, sleepers and vehicles aligned.
function tileRoutePaths(tile, kind) {
  if(tile.bridge) {
    const a=tile.bridge.axis==="x"?{dx:-1,dy:0}:{dx:0,dy:-1};
    return [{a,b:{dx:-a.dx,dy:-a.dy},curved:false}];
  }
  const dirs = networkDirections(tile, kind), paths = [];
  if (dirs.length === 1) return [{ a: { dx: 0, dy: 0 }, b: dirs[0], curved: false }];
  for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) {
    const a = dirs[i], b = dirs[j];
    paths.push({ a, b, curved: a.dx * b.dx + a.dy * b.dy === 0 });
  }
  return paths;
}

function routePathPoint(path, t) {
  const { a, b } = path;
  if (path.curved) {
    const angle = t * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle);
    return { x: (a.dx + b.dx - b.dx * c - a.dx * s) / 2,
      y: (a.dy + b.dy - b.dy * c - a.dy * s) / 2,
      dx: b.dx * s - a.dx * c, dy: b.dy * s - a.dy * c };
  }
  const dx = b.dx - a.dx, dy = b.dy - a.dy, length = Math.hypot(dx, dy);
  return { x: (a.dx + dx * t) / 2, y: (a.dy + dy * t) / 2, dx: dx / length, dy: dy / length };
}

function routePathLength(path) {
  return (path.curved ? Math.PI / 4 : Math.hypot(path.b.dx - path.a.dx, path.b.dy - path.a.dy) / 2) * threeConfig.tileSize;
}

function addRail3d(group, tile, station) {
  const world = tileToWorld3d(tile.x, tile.y);
  for (const path of tileRoutePaths(tile, "rail")) {
    addRouteStrip3d(world, path, three.materials.railBase, 0.38, 0, 0.075);
    addRouteStrip3d(world, path, three.materials.railMetal, 0.035, 0.145, 0.11);
    addRouteStrip3d(world, path, three.materials.railMetal, 0.035, -0.145, 0.11);
  }
  if (station) addStation3d(group, world, three.materials.platform, networkDirections(tile, "rail").some((dir) => dir.dx !== 0));
}

function addRoad3d(group, tile, station) {
  const world = tileToWorld3d(tile.x, tile.y);
  for (const path of tileRoutePaths(tile, "road")) {
    addRouteStrip3d(world, path, three.materials.road, 0.42, 0, 0.075);
    const length = routePathLength(path);
    for (let d = 0.07; d < length; d += 0.36) {
      addRouteStrip3d(world, path, three.materials.roadStripe, 0.025, 0, 0.0955, d / length, Math.min(d + 0.18, length) / length, 0.006);
    }
  }
  if (station) addStation3d(group, world, three.materials.platformRoad, networkDirections(tile, "road").some((dir) => dir.dx !== 0));
}

function addRouteStrip3d(world, path, material, width, offset, elevation, from = 0, to = 1, height = 0.035) {
  if (!three.routeBatches.has(material)) three.routeBatches.set(material, { vertices: [], indices: [] });
  const batch = three.routeBatches.get(material), segments = path.curved ? Math.max(1, Math.ceil(16 * (to - from))) : 1;
  const base = batch.vertices.length / 3;
  for (let i = 0; i <= segments; i++) {
    const p = routePathPoint(path, from + (to - from) * i / segments);
    for (const [side, up] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const shift = offset + side * width / 2;
      batch.vertices.push(world.x + p.x * threeConfig.tileSize + p.dy * shift,
        elevation + routeElevationAt(world.x/threeConfig.tileSize+(config.width-1)/2+p.x,world.z/threeConfig.tileSize+(config.height-1)/2+p.y) + up * height / 2,
        world.z + p.y * threeConfig.tileSize - p.dx * shift);
    }
    if (i === segments) continue;
    const n = base + i * 4;
    for (const [a, b, c, d] of [[0, 4, 1, 5], [2, 3, 6, 7], [0, 2, 4, 6], [1, 5, 3, 7]]) {
      batch.indices.push(n + a, n + b, n + c, n + c, n + b, n + d);
    }
  }
  batch.indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  const end = base + segments * 4;
  batch.indices.push(end, end + 2, end + 1, end + 1, end + 2, end + 3);
}

function finishRouteMeshes3d(group) {
  for (const [material, batch] of three.routeBatches) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(batch.vertices, 3));
    geometry.setIndex(batch.indices);geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);mesh.userData.routeSurface = true;
    if(material===three.materials.bridgeDeck){mesh.userData.bridgeDeck=true;three.tilePickers.push(mesh);}
    group.add(mesh);
  }
  three.routeBatches.clear();
}

function addBridge3d(group,tile) {
  const bridge=tile.bridge,alongX=bridge.axis==="x",batches=new Map(),matrix=new THREE.Matrix4();
  const beam=(material,a,b,width,height)=>{
    const delta=new THREE.Vector3().subVectors(b,a),length=delta.length();
    if(!batches.has(material))batches.set(material,[]);
    batches.get(material).push({position:a.clone().add(b).multiplyScalar(0.5),rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize()),scale:new THREE.Vector3(width,height,length)});
  };
  const point=(n,side,up)=>{
    const x=alongX?n:tile.x,y=alongX?tile.y:n,w=tileToWorld3d(x,y);
    return new THREE.Vector3(w.x+(alongX?0:side),bridgeRiseAt(bridge,x,y)+up,w.z+(alongX?side:0));
  };
  for(let n=bridge.start;n<=bridge.end;n++) {
    for(const side of [-0.36,0.36]) {
      beam(three.materials.bridgeSteel,point(n-0.5,side,0.14),point(n+0.5,side,0.14),0.045,0.07);
      beam(three.materials.bridgeSteel,point(n-0.5,side,0.34),point(n+0.5,side,0.34),0.035,0.035);
      beam(three.materials.bridgeSteel,point(n-0.48,side,0.14),point(n-0.48,side,0.34),0.035,0.035);
      if(n===bridge.end)beam(three.materials.bridgeSteel,point(n+0.48,side,0.14),point(n+0.48,side,0.34),0.035,0.035);
      if(n>bridge.start&&n<bridge.end)beam(three.materials.bridgeSteel,point(n-0.45,side,0.14),point(n+0.45,side,0.34),0.025,0.025);
    }
    if(n>bridge.start&&n<bridge.end&&(n-bridge.start)%2===1) {
      const top=point(n,0,-0.025),bottom=top.clone();bottom.y=-0.1;
      beam(three.materials.bridgePier,bottom,top,alongX?0.25:0.43,alongX?0.43:0.25);
    }
  }
  for(const [material,list] of batches) {
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,list.length);
    list.forEach((p,i)=>{matrix.compose(p.position,p.rotation,p.scale);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.userData.bridgeStructure=true;group.add(mesh);
  }
}

function addStation3d(group, world, material, alongX) {
  const x = world.x + (alongX ? 0 : 0.4);
  const z = world.z + (alongX ? 0.4 : 0);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.9 : 0.22, 0.12, alongX ? 0.22 : 0.9), material);
  platform.position.set(x, 0.1, z);
  group.add(platform);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.9 : 0.24, 0.08, alongX ? 0.24 : 0.9), three.materials.roof);
  canopy.position.set(x, 0.58, z);
  group.add(canopy);
  for (const offset of [-0.32, 0.32]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.4, 0.035), three.materials.industry);
    post.position.set(x + (alongX ? offset : 0), 0.35, z + (alongX ? 0 : offset));
    group.add(post);
  }
}

function addHouse3d(group, world) {
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), three.materials.house);
  house.position.set(world.x, 0.25, world.z);
  group.add(house);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), three.materials.roof);
  roof.position.set(world.x, 0.48, world.z);
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
}

function addIndustry3d(group, world) {
  const hall = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.55), three.materials.industry);
  hall.position.set(world.x, 0.3, world.z);
  group.add(hall);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.72, 10), three.materials.industry);
  chimney.position.set(world.x + 0.25, 0.62, world.z - 0.12);
  group.add(chimney);
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), three.materials.smoke);
  smoke.position.set(world.x + 0.28, 1.02, world.z - 0.15);
  group.add(smoke);
}

function addTrees3d(group, world) {
  const offsets = [[-0.23, -0.15], [0.2, -0.04], [-0.02, 0.22]];
  for (const [dx, dz] of offsets) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 7), three.materials.trunk);
    trunk.position.set(world.x + dx, 0.18, world.z + dz);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 8), three.materials.leaves);
    leaves.position.set(world.x + dx, 0.42, world.z + dz);
    group.add(leaves);
  }
}

function addField3d(group, world) {
  for (let i = -2; i <= 2; i += 1) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.86), three.materials.roadStripe);
    strip.position.set(world.x + i * 0.16, 0.085, world.z);
    strip.rotation.y = Math.PI / 5;
    group.add(strip);
  }
}

function render3d() {
  if (!three.ready) return;
  if (three.worldDirty) rebuild3dWorld();
  resize3d();
  update3dCamera();
  update3dVehicles();
  updateSignalLamps();
  updateReservationOverlay();
  if(typeof updateConstruction3d==="function")updateConstruction3d();
  three.highlight.visible = !three.cab.vehicle && Boolean(game.hover);
  if (game.hover) {
    const world = tileToWorld3d(game.hover.x, game.hover.y);
    three.highlight.position.set(world.x, 0.13+routeElevationAt(game.hover.x,game.hover.y), world.z);
    three.highlight.material.color.set(game.tool === "bulldoze" ? 0xf07167 : 0xffdf68);
  }
  const coordinateTarget=mapCoordinates.target;
  three.coordinateMarker.visible=!three.cab.vehicle&&Boolean(coordinateTarget&&getTile(coordinateTarget.x,coordinateTarget.y));
  if(three.coordinateMarker.visible) {
    const world=tileToWorld3d(coordinateTarget.x,coordinateTarget.y);
    three.coordinateMarker.position.set(world.x,0.17+routeElevationAt(coordinateTarget.x,coordinateTarget.y),world.z);
  }
  traffic.reservationOverlay.visible=!three.cab.vehicle;
  three.renderer.render(three.scene, three.camera);
  renderBuildLoupe();
}

function resize3d() {
  if (!three.ready) return;
  const width = Math.max(1, threeViewport.clientWidth);
  const height = Math.max(1, threeViewport.clientHeight);
  if (three.renderer.domElement.width !== Math.floor(width * three.renderer.getPixelRatio())
    || three.renderer.domElement.height !== Math.floor(height * three.renderer.getPixelRatio())) {
    three.renderer.setSize(width, height, false);
    three.camera.aspect = width / height;
    three.camera.updateProjectionMatrix();
  }
}

function update3dCamera() {
  if (!three.ready) return;
  if(three.cab.vehicle) {
    const vehicle=three.cab.vehicle;
    if(!game.vehicles.includes(vehicle)||vehicle.inDepot||game.selected?.vehicle!==vehicle)exitCabView();
    else {updateCabCamera(vehicle);return;}
  }
  const orbit = three.orbit;
  const radius = orbit.distance;
  const y = Math.sin(orbit.pitch) * radius;
  const flat = Math.cos(orbit.pitch) * radius;
  const x = Math.sin(orbit.yaw) * flat + orbit.targetX;
  const z = Math.cos(orbit.yaw) * flat + orbit.targetZ;
  three.camera.position.set(x, y, z);
  three.camera.lookAt(orbit.targetX, 0, orbit.targetZ);
}

function refreshCabControls() {
  const button=document.getElementById("enterCab"),vehicle=game.selected?.vehicle;
  button.disabled=Boolean(!three.ready||!vehicle||vehicle.inDepot);
  button.setAttribute("aria-pressed",String(Boolean(vehicle&&three.cab.vehicle===vehicle)));
}

function enterCabView(vehicle=game.selected?.vehicle) {
  if(!three.ready||!vehicle||vehicle.inDepot||!game.vehicles.includes(vehicle)||vehicle.path.length<2)return false;
  exitCabView();cancelConstruction();game.hover=null;three.dragging=false;
  game.tool="inspect";
  document.querySelectorAll("[data-tool]").forEach(button=>button.classList.toggle("active",button.dataset.tool==="inspect"));
  game.selected={vehicle};
  const cab=three.cab;
  cab.vehicle=vehicle;cab.yaw=0;cab.pitch=0;cab.dragging=false;
  cab.projection={fov:three.camera.fov,near:three.camera.near};cab.background=three.scene.background;
  three.camera.fov=72;three.camera.near=0.02;three.camera.updateProjectionMatrix();
  three.scene.background=new THREE.Color(0xbad9e8);
  document.getElementById("cabView").hidden=false;
  mapWrap.classList.add("cab-active");ui.cameraTools.hidden=true;ui.coordinateTools.hidden=true;
  refreshCabControls();updateCabCamera(vehicle);
  return true;
}

function exitCabView() {
  const cab=three.cab;if(!cab.vehicle)return;
  const car=three.vehicleMeshes.get(cab.vehicle.id)?.userData.cars[0];if(car)car.visible=true;
  if(cab.projection&&three.camera) {
    Object.assign(three.camera,cab.projection);three.camera.updateProjectionMatrix();
  }
  if(three.scene)three.scene.background=cab.background;
  Object.assign(cab,{vehicle:null,yaw:0,pitch:0,dragging:false,projection:null,background:null});
  document.getElementById("cabView").hidden=true;
  mapWrap.classList.remove("cab-active");ui.cameraTools.hidden=!three.ready;ui.coordinateTools.hidden=!three.ready;
  refreshCabControls();
}

function updateCabCamera(vehicle) {
  const sample=sampleVehiclePath(vehicle,0),world=tileToWorld3d(sample.tile.x,sample.tile.y),cab=three.cab;
  // Share the locomotive's local frame, including bridge pitch, for both eye and gaze.
  const frame=new THREE.Quaternion().setFromEuler(new THREE.Euler(sample.pitch,sample.heading,0,"YXZ"));
  const eye=new THREE.Vector3(0,vehicle.type==="train"?0.32:0.25,0.14).applyQuaternion(frame);
  three.camera.position.set(world.x+eye.x,(vehicle.type==="train"?0.12:0.095)+sample.elevation+eye.y,world.z+eye.z);
  const gaze=new THREE.Vector3(Math.sin(cab.yaw)*Math.cos(cab.pitch),Math.sin(cab.pitch),Math.cos(cab.yaw)*Math.cos(cab.pitch)).applyQuaternion(frame);
  three.camera.lookAt(three.camera.position.clone().add(gaze));
  document.getElementById("cabVehicleName").textContent=`${vehicle.type==="train"?"Zug":"Lkw"} ${vehicle.id+1}`;
  const destination=game.stations[vehicle.dir>0?vehicle.to:vehicle.from];
  document.getElementById("cabDestination").textContent=destination?.name||"";
  document.getElementById("cabSpeedValue").textContent=String(Math.round((vehicle.velocity||0)/1.8*100));
  document.getElementById("cabStatus").textContent=vehicle.stopped?"Angehalten":vehicle.blocked?"Strecke unterbrochen":vehicle.routeWaiting?"Keine Rueckfahrt":vehicle.reservationWaiting||vehicle.signalWaiting?"Signalhalt":vehicle.servicePhase==="unload"?"Entladen":vehicle.servicePhase==="load"?"Beladen":vehicle.stationWait>0?"Bahnhofshalt":"Unterwegs";
}

function update3dVehicles() {
  for (const vehicle of game.vehicles) {
    if(vehicle.inDepot)continue;
    if (!three.vehicleMeshes.has(vehicle.id)) {
      const mesh = make3dVehicle(vehicle);
      three.vehicleMeshes.set(vehicle.id, mesh);
      three.vehicleGroup.add(mesh);
    }
    place3dVehicle(vehicle, three.vehicleMeshes.get(vehicle.id));
  }
  for (const [id, mesh] of three.vehicleMeshes.entries()) {
    if (!game.vehicles.some((vehicle) => vehicle.id === id)) {
      three.vehicleGroup.remove(mesh);
      disposeGroup(mesh);
      three.vehicleMeshes.delete(id);
    }
  }
}

function make3dVehicle(vehicle) {
  const group = new THREE.Group();
  const carCount = vehicleCarCount(vehicle);
  group.userData.cars = [];
  for (let i = 0; i < carCount; i += 1) {
    const car = makeVehicleModel(vehicle,i);
    group.add(car);
    group.userData.cars.push(car);
  }
  return group;
}

function place3dVehicle(vehicle, mesh) {
  for (let i = 0; i < mesh.userData.cars.length; i += 1) {
    const car = mesh.userData.cars[i];
    car.visible=!(i===0&&three.cab.vehicle===vehicle);
    const sample = sampleVehiclePath(vehicle, i * 0.58);
    const world = tileToWorld3d(sample.tile.x, sample.tile.y);
    car.position.set(world.x, (vehicle.type==="train"?0.12:0.095)+sample.elevation, world.z);
    car.rotation.set(sample.pitch,sample.heading,0,"YXZ");
    const perCar=vehicle.type==="train"?20:vehicle.capacity;
    const fraction=i===0?0:clamp((vehicle.load-(i-1)*perCar)/perCar,0,1);
    car.userData.loadMesh.visible=fraction>0;
    const load=car.userData.loadMesh;
    if(vehicle.cargo==="passengers")load.scale.z=Math.max(0.03,fraction);
    else if(vehicle.cargo==="goods")load.children.forEach((box,j)=>box.visible=fraction>j/3);
    else load.scale.y=Math.max(0.03,fraction);
  }
}

function disposeGroup(group) {
  group.traverse((object) => {if(object.isInstancedMesh)object.dispose();if(!object.geometry?.userData.sharedAsset)object.geometry?.dispose();});
  group.traverse((object) => {
    if (object.material && !Object.values(three.materials).flat().includes(object.material)) object.material.dispose();
  });
}

function fitCamera() {
  exitCabView();
  const rect = mapWrap.getBoundingClientRect();
  if (!three.ready) return;
  three.inertia = null;
  three.orbit.targetX = 0;
  three.orbit.targetZ = 0;
  three.orbit.yaw = -0.7;
  three.orbit.pitch = 0.95;
  const radius = Math.hypot(config.width, config.height) * threeConfig.tileSize / 2;
  const angle = Math.atan(Math.tan(Math.PI / 8) * Math.min(1, rect.width / rect.height));
  three.orbit.distance = radius / Math.sin(angle) * 1.04;
}

function selectTile(tile) {
  if (!tile) return;
  game.selected = { tile };
  ui.townPanel.hidden=true;
  ui.speed.textContent="-";ui.loading.textContent="-";
  const terrainName = {
    grass: "Wiese",
    forest: "Wald",
    field: "Feld",
    water: "Wasser",
    town: "Stadt",
    industry: "Industrie"
  }[tile.terrain];
  ui.title.textContent = `${terrainName} (${tile.x}, ${tile.y})`;
  ui.badge.textContent = tile.build || tile.terrain;
  ui.text.textContent = tileText(tile);
  const demand = nearbyDemand(tile);
  ui.cargo.textContent = demand.produces.size ? [...demand.produces].map((c) => cargoMeta[c].label).join(", ") : "-";
  ui.demand.textContent = demand.accepts.size ? [...demand.accepts].map((c) => cargoMeta[c].label).join(", ") : "-";
  ui.production.textContent = tile.industry !== null ? `${game.industries[tile.industry].output}/Monat` : "-";
  ui.maintenance.textContent = `${money(maintenanceForTile(tile))}/Monat`;
}

function selectStation(station) {
  game.selected = { station };
  ui.townPanel.hidden=true;
  ui.speed.textContent="-";ui.loading.textContent="-";
  ui.title.textContent = station.name;
  ui.badge.textContent = station.kind === "rail" ? "Bahn" : "Truck";
  ui.text.textContent = `Wartend: ${waitingSummary(station)}. Geliefert: ${Math.floor(station.delivered)}. Bahnsteig: ${stationTiles(station).length} Felder.`;
  ui.cargo.textContent = station.produces.length ? station.produces.map((c) => cargoMeta[c].label).join(", ") : "-";
  ui.demand.textContent = station.accepts.length ? station.accepts.map((c) => cargoMeta[c].label).join(", ") : "-";
  ui.production.textContent = `${Math.floor(Object.keys(cargoMeta).reduce((sum,cargo)=>sum+stationWaitingAmount(station,cargo),0))} wartend`;
  ui.maintenance.textContent = `${money(config.maintenance.station+(stationTiles(station).length-1)*10)}/Monat`;
}

function selectVehicle(vehicle) {
  if(three.cab.vehicle&&three.cab.vehicle!==vehicle) {
    if(vehicle.inDepot)exitCabView();else enterCabView(vehicle);
  }
  game.selected = { vehicle };
  ui.townPanel.hidden=true;
  const to = game.stations[vehicle.dir > 0 ? vehicle.to : vehicle.from];
  ui.title.textContent = `${vehicle.type === "train" ? "Zug" : "Truck"} ${vehicle.id + 1}`;
  ui.badge.textContent = cargoMeta[vehicle.cargo].label;
  ui.speed.textContent=`${Math.round((vehicle.velocity||0)/1.8*100)} km/h`;
  ui.loading.textContent=vehicle.servicePhase==="unload"?"Entladen":vehicle.servicePhase==="load"?vehicle.loadMode==="full"?"Vollbeladung":"Beladen":vehicle.servicePhase==="ready"?"Abfahrt":"-";
  if(vehicle.inDepot)ui.loading.textContent="Im Depot";
  ui.text.textContent = `Ziel: ${to.name}. Ladung: ${Math.floor(vehicle.load)}/${vehicle.capacity}. ${vehicle.motionState==="braking"&&(vehicle.velocity||0)>0.04?"Bremst.":vehicle.stopped ? "Angehalten." : vehicle.blocked ? "Strecke unterbrochen." : vehicle.routeWaiting ? "Keine erlaubte Rueckfahrt." : vehicle.reservationWaiting ? "Wartet auf freien Fahrweg bis zum sicheren Haltepunkt." : vehicle.signalWaiting ? "Wartet auf freien Signalblock." : vehicle.servicePhase||vehicle.stationWait > 0 ? "Bahnhofshalt: Be-/Entladen und Wenden." : "Unterwegs."}`;
  ui.cargo.textContent = cargoMeta[vehicle.cargo].label;
  if(vehicle.inDepot)ui.text.textContent=`Im Depot: ${Math.floor(vehicle.load)}/${vehicle.capacity} Einheiten. Ziel: ${to.name}.`;
  ui.demand.textContent = to.accepts.map((c) => cargoMeta[c].label).join(", ");
  ui.production.textContent = money(vehicle.profit);
  ui.maintenance.textContent = `${money(vehicle.type === "train" ? config.maintenance.train : config.maintenance.truck)}/Monat`;
  refreshCabControls();
}

function tileText(tile) {
  if(tile.bridge)return `${tile.build==="rail"?"Bahnbruecke":"Strassenbruecke"}: ${tile.bridge.end-tile.bridge.start-1} Wasserfelder, ${tile.bridge.end-tile.bridge.start+1} Felder einschliesslich Rampen.`;
  if (tile.signal) return `${tile.signal.type === "path" ? "Pfadsignal" : "Blocksignal"}, ${tile.signal.oneWay ? "Einweg" : "Beide Richtungen"}. ${signalIsRed(tile) ? "Rot" : "Gruen"}. Block ${railBlocks().get(tileKey(tile.x, tile.y))}.`;
  if (tile.station !== null) return game.stations[tile.station].name;
  if (tile.town !== null) {
    const town = game.towns[tile.town];
    return `${town.name}, ${town.population} Einwohner.`;
  }
  if (tile.industry !== null) {
    const industry = game.industries[tile.industry];
    return `${industry.name}: produziert ${cargoMeta[industry.produces].label}.`;
  }
  if (tile.terrain === "water") return "Wasserflaeche.";
  return "Freies Land fuer Schienen, Strassen oder Stationen.";
}

function waitingSummary(station) {
  const parts = Object.keys(cargoMeta)
    .filter(cargo=>stationWaitingAmount(station,cargo)>=1)
    .map(cargo=>`${Math.floor(stationWaitingAmount(station,cargo))} ${cargoMeta[cargo].label}${station.returnedCargo?.[cargo]?` (${station.returnedCargo[cargo]} Rueckgabe)`:""}`);
  return parts.length ? parts.join(", ") : "nichts";
}

function maintenanceForTile(tile) {
  if (tile.build === "rail") return config.maintenance.rail + (tile.signal ? 5 : 0) + (tile.bridge?config.maintenance.bridge:0);
  if (tile.build === "road") return config.maintenance.road + (tile.bridge?config.maintenance.bridge:0);
  if (tile.station !== null) return config.maintenance.station;
  return 0;
}

function updateUi() {
  refreshCabControls();
  if (typeof refreshManagement === "function") refreshManagement();
  document.querySelector("#trafficStatus").textContent = `${game.map.flat().filter((tile) => tile.signal).length} Signale | ${new Set(railBlocks().values()).size} Bloecke | ${game.vehicles.filter((v) => v.pathReservation).length} Fahrwege`;
  const assets = game.cash - game.loan
    + game.map.flat().reduce((sum, tile) => sum + (tile.build === "rail" ? config.costs.rail : tile.build === "road" ? config.costs.road : 0) + (tile.signal ? 300 : 0) + (tile.bridge?config.costs.bridge[tile.build]:0), 0)
    + game.stations.filter(s=>!s.closed).reduce((sum,s)=>sum+config.costs.station+(stationTiles(s).length-1)*800,0)
    + game.vehicles.reduce((sum, vehicle) => sum + (vehicle.type === "train" ? config.costs.train : config.costs.truck) * 0.65, 0);
  ui.cash.textContent = money(game.cash);
  ui.value.textContent = money(assets);
  ui.loan.textContent = money(game.loan);
  ui.vehicles.textContent = String(game.vehicles.length);
  const year = 1950 + Math.floor(game.month / 12);
  const monthName = ["Jan", "Feb", "Maerz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][game.month % 12];
  ui.date.textContent = `${Math.floor(game.dayProgress) + 1}. ${monthName} ${year}`;
  ui.buyTrain.disabled = !game.selected?.station || game.selected.station.kind !== "rail";
  ui.buyTruck.disabled = !game.selected?.station || game.selected.station.kind !== "road";
}

function log(message) {
  game.log.unshift(message);
  game.log = game.log.slice(0, 7);
  renderLog();
}

function renderLog() {
  ui.log.replaceChildren(...game.log.map((item) => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = item;
    return entry;
  }));
}

function flash(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  game.toastUntil = performance.now() + 2200;
}

function pointerTile(event) {
  return three.ready ? pointerTile3d(event) : { x: -1, y: -1 };
}

function displayedCoordinates() {
  return game.hover||mapCoordinates.last||game.selected?.tile||game.selected?.station||game.selected?.town||null;
}

function updateCoordinateReadout() {
  const p=displayedCoordinates(),text=p?`X: ${p.x}  Y: ${p.y}`:"X: -  Y: -";
  if(ui.coordinateReadout.textContent!==text)ui.coordinateReadout.textContent=text;
}

function focusMapCoordinates(x,y) {
  if(!three.ready||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=config.width||y>=config.height)return false;
  const tile=getTile(x,y);if(!tile)return false;
  exitCabView();
  cancelConstruction();game.hover=null;mapCoordinates.last={x,y};mapCoordinates.target={x,y};
  const world=tileToWorld3d(x,y);three.inertia=null;three.orbit.targetX=world.x;three.orbit.targetZ=world.z;
  three.orbit.distance=clamp(three.orbit.distance,8,18);
  selectTile(tile);updateCoordinateReadout();return true;
}

function openCoordinateDialog() {
  const p=displayedCoordinates()||{x:Math.floor(config.width/2),y:Math.floor(config.height/2)};
  const x=document.getElementById("coordinateX"),y=document.getElementById("coordinateY");
  x.max=String(config.width-1);y.max=String(config.height-1);x.value=String(p.x);y.value=String(p.y);
  document.getElementById("coordinateXLabel").textContent=`X (0-${config.width-1})`;
  document.getElementById("coordinateYLabel").textContent=`Y (0-${config.height-1})`;
  document.getElementById("coordinateDialog").showModal();x.focus();x.select();
}

function pointerTile3d(event) {
  const rect = three.renderer.domElement.getBoundingClientRect();
  three.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  three.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  three.raycaster.setFromCamera(three.pointer, three.camera);
  const point=new THREE.Vector3();
  const bridgeHit=three.raycaster.intersectObjects(three.tilePickers,false)[0];
  if(bridgeHit)point.copy(bridgeHit.point);
  else if(!three.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-0.04),point))return {x:-1,y:-1};
  return {x:Math.floor(point.x/threeConfig.tileSize+(config.width-1)/2+0.5),y:Math.floor(point.z/threeConfig.tileSize+(config.height-1)/2+0.5)};
}

function onCanvasClick(event) {
  if(three.cab.vehicle)return;
  if (three.dragging||performance.now()<(three.blockClickUntil||0)) return;
  const point = pointerTile(event);
  const tile = getTile(point.x, point.y);
  if (!tile) return;
  mapCoordinates.last={x:tile.x,y:tile.y};mapCoordinates.target=null;
  if (["rail","road"].includes(game.tool)) return;
  if (game.tool === "station" && tile.station!==null){cancelConstruction();selectStation(game.stations[tile.station]);}
  else if (["station","signal","bulldoze"].includes(game.tool))previewMapAction(tile,game.tool);
  if (game.tool === "inspect") {
    const vehicle = vehicleAt(point.x, point.y);
    if (vehicle) selectVehicle(vehicle);
    else if (tile.station !== null) selectStation(game.stations[tile.station]);
    else if(tile.town!==null&&(!tile.build||tile.build==="house"))selectTown(game.towns[tile.town]);
    else selectTile(tile);
  }
}

function vehicleAt(x, y) {
  return game.vehicles.find((vehicle) => {
    const tile = sampleVehiclePath(vehicle, 0).tile;
    return !vehicle.inDepot && Math.abs(tile.x - x) < 0.6 && Math.abs(tile.y - y) < 0.6;
  });
}

// On the narrow layout the map is sticky under a scrolling bottom sheet: scroll the sheet back down to uncover it.
function revealMap() {
  if(window.matchMedia?.("(max-width: 980px)").matches)window.scrollTo(0,0);
  else three.renderer?.domElement.scrollIntoView({block:"nearest"});
}

function setupEvents() {
  document.getElementById("enterCab").addEventListener("click",()=>{
    if(three.cab.vehicle===game.selected?.vehicle)exitCabView();else enterCabView();
    revealMap();
  });
  document.getElementById("exitCab").addEventListener("click",exitCabView);
  document.getElementById("resetCabLook").addEventListener("click",()=>{three.cab.yaw=0;three.cab.pitch=0;});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&three.cab.vehicle){event.preventDefault();exitCabView();}
  });
  document.querySelector("#openCoordinates").addEventListener("click",openCoordinateDialog);
  document.querySelector("#closeCoordinates").addEventListener("click",()=>document.getElementById("coordinateDialog").close());
  document.querySelector("#coordinateDialog").addEventListener("keydown",event=>event.stopPropagation());
  document.querySelector("#coordinateForm").addEventListener("submit",event=>{
    event.preventDefault();
    if(focusMapCoordinates(document.getElementById("coordinateX").valueAsNumber,document.getElementById("coordinateY").valueAsNumber)) {
      document.getElementById("coordinateDialog").close();revealMap();
    }
  });
  document.addEventListener("visibilitychange",()=>{lastFrame=performance.now();});
  document.querySelector("#toggleBlocks").addEventListener("click", (event) => {
    game.showBlocks = !game.showBlocks;
    event.currentTarget.setAttribute("aria-pressed", String(game.showBlocks));
    mark3dDirty();
  });
  document.querySelector("#fitCamera").addEventListener("click", fitCamera);
  document.querySelector("#zoomIn").addEventListener("click", () => zoomMap(-1));
  document.querySelector("#zoomOut").addEventListener("click", () => zoomMap(1));
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      exitCabView();
      cancelConstruction();
      game.tool = button.dataset.tool;
      document.querySelectorAll("[data-tool]").forEach((item) => item.classList.toggle("active", item === button));
      revealMap();
    });
  });
  document.querySelectorAll("[data-speed]").forEach((button) => {
    button.addEventListener("click", () => {
      game.speed = Number(button.dataset.speed);
      document.querySelectorAll("[data-speed]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  ui.retryRenderer.addEventListener("click", () => window.location.reload());
  ui.buyTrain.addEventListener("click", () => buyVehicle("train", depotOptions()));
  ui.buyTruck.addEventListener("click", () => buyVehicle("truck", depotOptions()));
  ui.borrow.addEventListener("click", () => {
    game.loan += 20000;
    game.cash += 20000;
    flash("Darlehen erhoeht.");
  });
  ui.repay.addEventListener("click", () => {
    if (game.loan <= 0) return;
    const amount = Math.min(20000, game.loan);
    if (!spend(amount)) return;
    game.loan -= amount;
    flash("Darlehen reduziert.");
  });
  window.addEventListener("pointerup", () => {
    setTimeout(() => {
      three.dragging = false;
    }, 0);
  });
  window.addEventListener("resize", resize3d);
}

function mapZoomLimit() { return Math.max(160,Math.hypot(config.width,config.height)*3); }

function syncOrbitCamera() { update3dCamera();three.camera.updateMatrixWorld(); }

function groundPointAt(clientX,clientY) {
  const rect=three.renderer.domElement.getBoundingClientRect();
  three.pointer.x=((clientX-rect.left)/rect.width)*2-1;
  three.pointer.y=-(((clientY-rect.top)/rect.height)*2-1);
  three.raycaster.setFromCamera(three.pointer,three.camera);
  return three.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
}

function applyMapInertia(ms) {
  const inertia=three.inertia;
  if(!inertia||three.cab.vehicle||!three.ready)return;
  const seconds=Math.min(ms,100)/1000,decay=Math.exp(-4.5*seconds);
  three.orbit.targetX=clamp(three.orbit.targetX+inertia.vx*seconds,-100,100);
  three.orbit.targetZ=clamp(three.orbit.targetZ+inertia.vz*seconds,-100,100);
  inertia.vx*=decay;inertia.vz*=decay;
  if(Math.hypot(inertia.vx,inertia.vz)<0.05)three.inertia=null;
}

// While drawing with a finger near the map edge, scroll the map and keep extending the preview under the finger.
function applyTouchDrawScroll(ms) {
  const draw=three.touchDraw;
  if(!draw||!three.ready||three.cab.vehicle||!construction.dragging)return;
  const rect=three.renderer.domElement.getBoundingClientRect(),margin=Math.min(48,rect.width*0.12,rect.height*0.12);
  const edge=(value,low,high)=>clamp(value<low+margin?(value-low-margin)/margin:value>high-margin?(value-high+margin)/margin:0,-1,1);
  const ex=edge(draw.clientX,rect.left,rect.right),ey=edge(draw.clientY,rect.top,rect.bottom);
  if(!ex&&!ey)return;
  const step=three.orbit.distance*0.7*Math.min(ms,100)/1000,yaw=three.orbit.yaw;
  three.orbit.targetX=clamp(three.orbit.targetX+(ex*Math.cos(yaw)+ey*Math.sin(yaw))*step,-100,100);
  three.orbit.targetZ=clamp(three.orbit.targetZ+(-ex*Math.sin(yaw)+ey*Math.cos(yaw))*step,-100,100);
  syncOrbitCamera();
  const point=pointerTile(draw),tile=getTile(point.x,point.y);
  if(tile){game.hover=tile;mapCoordinates.last={x:tile.x,y:tile.y};previewConstruction(tile);}
}

// Magnified view of the tile under the drawing finger, placed above the finger (or beside it near the top edge).
function renderBuildLoupe() {
  const draw=three.touchDraw,show=Boolean(draw&&game.hover&&construction.dragging&&!three.cab.vehicle);
  ui.buildLoupe.hidden=!show;
  if(!show)return;
  const width=threeViewport.clientWidth,height=threeViewport.clientHeight,rect=three.renderer.domElement.getBoundingClientRect();
  const size=Math.round(clamp(Math.min(width,height)*0.34,96,150)),gap=56,x=draw.clientX-rect.left,y=draw.clientY-rect.top;
  // Stay below the HTML overlays (camera buttons, coordinates) that sit on top of the canvas.
  let minTop=8;
  for(const overlay of [ui.cameraTools,ui.coordinateTools])if(!overlay.hidden)minTop=Math.max(minTop,overlay.getBoundingClientRect().bottom-rect.top+8);
  let left=x-size/2,top=y-gap-size;
  if(top<minTop){top=y-size/2;left=x+gap+size<=width-8?x+gap:x-gap-size;}
  left=Math.round(clamp(left,8,Math.max(8,width-size-8)));top=Math.round(clamp(top,minTop,Math.max(minTop,height-size-8)));
  const world=tileToWorld3d(game.hover.x,game.hover.y),elevation=routeElevationAt(game.hover.x,game.hover.y),distance=6;
  const flat=Math.cos(three.orbit.pitch)*distance,camera=three.loupeCamera;
  camera.position.set(world.x+Math.sin(three.orbit.yaw)*flat,elevation+Math.sin(three.orbit.pitch)*distance,world.z+Math.cos(three.orbit.yaw)*flat);
  camera.lookAt(world.x,elevation,world.z);
  const renderer=three.renderer;
  renderer.setScissorTest(true);
  renderer.setViewport(left,height-top-size,size,size);renderer.setScissor(left,height-top-size,size,size);
  renderer.render(three.scene,camera);
  renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);
  Object.assign(ui.buildLoupe.style,{left:`${left}px`,top:`${top}px`,width:`${size}px`,height:`${size}px`});
}

function bindMapTarget(target) {
  let painting = false;
  let drawingPointer = null;
  // Touch: one finger pans (or draws once it moves with a rail/road tool); two fingers pan, pinch-zoom and twist.
  // The ground point under the fingers is re-anchored after every change so the map sticks to them.
  const touches=new Map();
  let gesture=null,pendingPaint=null;
  const touchCenter=()=>{
    const [a,b]=[...touches.values()];
    if(!b)return {x:a.x,y:a.y,span:0,angle:0};
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,span:Math.hypot(b.x-a.x,b.y-a.y),angle:Math.atan2(b.y-a.y,b.x-a.x)};
  };
  const startTouchGesture=(time)=>{
    syncOrbitCamera();
    const c=touchCenter();
    gesture={...c,anchor:groundPointAt(c.x,c.y),distance:three.orbit.distance,yaw:three.orbit.yaw,count:touches.size,moved:gesture?.moved||false,velocity:{vx:0,vz:0},time};
  };
  const moveTouchGesture=(now)=>{
    const c=touchCenter();
    if(!gesture.moved&&Math.hypot(c.x-gesture.x,c.y-gesture.y)<8&&Math.abs(c.span-gesture.span)<8)return;
    gesture.moved=true;
    const before={x:three.orbit.targetX,z:three.orbit.targetZ};
    if(touches.size>1) {
      three.orbit.distance=clamp(gesture.distance*gesture.span/Math.max(c.span,1),8,mapZoomLimit());
      three.orbit.yaw=gesture.yaw+(c.angle-gesture.angle);
    }
    if(gesture.anchor) {
      syncOrbitCamera();
      const point=groundPointAt(c.x,c.y);
      if(point) {
        three.orbit.targetX=clamp(three.orbit.targetX+gesture.anchor.x-point.x,-100,100);
        three.orbit.targetZ=clamp(three.orbit.targetZ+gesture.anchor.z-point.z,-100,100);
      }
    }
    const seconds=Math.max((now-gesture.time)/1000,0.001),blend=Math.min(1,seconds*12);
    gesture.velocity.vx+=((three.orbit.targetX-before.x)/seconds-gesture.velocity.vx)*blend;
    gesture.velocity.vz+=((three.orbit.targetZ-before.z)/seconds-gesture.velocity.vz)*blend;
    gesture.time=now;
  };
  const touchDown=(event)=>{
    three.inertia=null;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    target.setPointerCapture(event.pointerId);event.preventDefault();
    if(touches.size===1&&(game.tool==="rail"||game.tool==="road")) {
      const point=pointerTile(event);
      if(getTile(point.x,point.y)){pendingPaint={id:event.pointerId,x:event.clientX,y:event.clientY,tile:point};gesture=null;return;}
    }
    if(painting){painting=false;drawingPointer=null;three.touchDraw=null;cancelConstruction();}
    pendingPaint=null;
    startTouchGesture(event.timeStamp);
  };
  const touchMove=(event)=>{
    if(!touches.has(event.pointerId))return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pendingPaint&&Math.hypot(event.clientX-pendingPaint.x,event.clientY-pendingPaint.y)>=8) {
      const start=pendingPaint.tile;pendingPaint=null;
      mapCoordinates.last={...start};mapCoordinates.target=null;
      painting=true;drawingPointer=event.pointerId;
      beginConstruction(getTile(start.x,start.y),game.tool);
    }
    if(painting) {
      three.touchDraw={clientX:event.clientX,clientY:event.clientY};
      const point=pointerTile(event);game.hover=getTile(point.x,point.y);
      if(game.hover){mapCoordinates.last={x:game.hover.x,y:game.hover.y};previewConstruction(game.hover);}
      return;
    }
    if(gesture)moveTouchGesture(event.timeStamp);
  };
  const touchUp=(event,cancelled=false)=>{
    if(!touches.has(event.pointerId))return;
    touches.delete(event.pointerId);
    if(target.hasPointerCapture(event.pointerId))target.releasePointerCapture(event.pointerId);
    game.hover=null;
    if(pendingPaint?.id===event.pointerId) {
      // A tap with a drawing tool behaves like a mouse click: a one-tile preview.
      const tile=getTile(pendingPaint.tile.x,pendingPaint.tile.y);pendingPaint=null;
      if(!cancelled&&tile){beginConstruction(tile,game.tool);finishConstruction();}
      return;
    }
    if(painting&&event.pointerId===drawingPointer) {
      painting=false;drawingPointer=null;three.touchDraw=null;
      if(cancelled)cancelConstruction();
      else {const point=pointerTile(event);if(getTile(point.x,point.y))previewConstruction(getTile(point.x,point.y));finishConstruction();}
      return;
    }
    if(!gesture)return;
    if(gesture.moved)three.blockClickUntil=performance.now()+400;
    if(touches.size){startTouchGesture(event.timeStamp);return;}
    const {velocity,time,count,moved}=gesture;gesture=null;
    if(moved&&count===1&&event.timeStamp-time<80&&Math.hypot(velocity.vx,velocity.vz)>0.5)three.inertia={...velocity};
  };
  target.addEventListener("pointermove", (event) => {
    if(event.pointerType==="touch"&&!three.cab.vehicle){touchMove(event);return;}
    if(three.cab.vehicle) {
      const cab=three.cab;
      if(cab.dragging&&cab.pointerId===event.pointerId) {
        cab.yaw=clamp(cab.originYaw-(event.clientX-cab.startX)*0.006,-Math.PI*0.85,Math.PI*0.85);
        cab.pitch=clamp(cab.originPitch+(event.clientY-cab.startY)*0.004,-0.65,0.65);
      }
      return;
    }
    const point = pointerTile(event);
    game.hover = getTile(point.x, point.y);
    if(game.hover)mapCoordinates.last={x:game.hover.x,y:game.hover.y};
    if(painting && game.hover)previewConstruction(game.hover);
    if (three.dragging) {
      const dx = event.clientX - three.dragStartX;
      const dy = event.clientY - three.dragStartY;
      if(three.panning) {
        const scale=three.orbit.distance/target.clientHeight;
        three.orbit.targetX=clamp(three.originTargetX+(-dx*Math.cos(three.orbit.yaw)-dy*Math.sin(three.orbit.yaw))*scale,-100,100);
        three.orbit.targetZ=clamp(three.originTargetZ+(dx*Math.sin(three.orbit.yaw)-dy*Math.cos(three.orbit.yaw))*scale,-100,100);
      } else {
        three.orbit.yaw = three.originYaw - dx * 0.008;
        three.orbit.pitch = clamp(three.originPitch + dy * 0.004, 0.38, 1.22);
      }
      return;
    }
  });
  target.addEventListener("pointerleave", () => {
    game.hover = null;
  });
  target.addEventListener("pointerdown", (event) => {
    if(event.pointerType==="touch"&&!three.cab.vehicle){touchDown(event);return;}
    if(three.cab.vehicle) {
      if(event.button===0||event.button===2) {
        Object.assign(three.cab,{dragging:true,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originYaw:three.cab.yaw,originPitch:three.cab.pitch});
        target.setPointerCapture(event.pointerId);event.preventDefault();
      }
      return;
    }
    if (event.button === 0 && (game.tool === "rail" || game.tool === "road")) {
      const point = pointerTile(event);
      if(!getTile(point.x,point.y))return;
      mapCoordinates.last={...point};mapCoordinates.target=null;
      painting = true;drawingPointer=event.pointerId;
      target.setPointerCapture(event.pointerId);
      beginConstruction(getTile(point.x,point.y),game.tool);
      event.preventDefault();
    }
    if (event.button !== 1 && event.button !== 2) return;
    three.dragging = true;
    three.dragStartX = event.clientX;
    three.dragStartY = event.clientY;
    three.originYaw = three.orbit.yaw;
    three.originPitch = three.orbit.pitch;
    three.panning=event.button===1||event.shiftKey;
    three.originTargetX=three.orbit.targetX;three.originTargetZ=three.orbit.targetZ;
  });
  target.addEventListener("pointerup", (event) => {
    if(touches.has(event.pointerId)){touchUp(event);return;}
    if(three.cab.dragging&&three.cab.pointerId===event.pointerId) {
      three.cab.dragging=false;
      if(target.hasPointerCapture(event.pointerId))target.releasePointerCapture(event.pointerId);
      return;
    }
    if(!painting||event.pointerId!==drawingPointer)return;
    const point=pointerTile(event);if(getTile(point.x,point.y))previewConstruction(getTile(point.x,point.y));
    painting=false;drawingPointer=null;finishConstruction();
    if(target.hasPointerCapture(event.pointerId))target.releasePointerCapture(event.pointerId);
  });
  target.addEventListener("pointercancel",(event)=>{
    if(touches.has(event.pointerId)){touchUp(event,true);return;}
    three.cab.dragging=false;painting=false;drawingPointer=null;cancelConstruction();});
  target.addEventListener("contextmenu", (event) => event.preventDefault());
  target.addEventListener("click", onCanvasClick);
  target.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomMap(Math.sign(event.deltaY));
  }, { passive: false });
}

function zoomMap(direction) {
  if (!three.ready||three.cab.vehicle) return;
  three.orbit.distance = clamp(three.orbit.distance * (direction > 0 ? 1.12 : 0.89), 8, mapZoomLimit());
}

let lastFrame = performance.now();
function frame(now) {
  const delta = Math.min(Math.max(now - lastFrame,0), 1000);
  lastFrame = now;
  if(three.ready&&!document.hidden)update(delta);
  applyMapInertia(delta);
  applyTouchDrawScroll(delta);
  if (game.toastUntil && now > game.toastUntil) ui.toast.classList.remove("show");
  updateUi();
  if (game.selected?.station) selectStation(game.selected.station);
  if (game.selected?.vehicle) selectVehicle(game.selected.vehicle);
  if (game.selected?.tile?.signal) selectTile(game.selected.tile);
  if (game.selected?.town) selectTown(game.selected.town);
  render();
  requestAnimationFrame(frame);
}

function init() {
  makeMap(createLandscapeSettings());
  setupEvents();
  fitCamera();
  const town=game.towns[0];selectTile(getTile(town?.x??6,town?.y??5));
  log("1950: Die Transportgesellschaft startet.");
  flash("Baue zwei Stationen, verbinde sie und kaufe ein Fahrzeug.");
  loadThree();
  requestAnimationFrame(frame);
}

init();
