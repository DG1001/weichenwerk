const traffic = { dirty: true, blocks: new Map(), pathBlocks: new Set(), lamps: [], revision: 0, renderReservations: new Map() };
const railDirections = { east: { x: 1, y: 0 }, west: { x: -1, y: 0 }, south: { x: 0, y: 1 }, north: { x: 0, y: -1 } };
const railOpposites = { east:"west", west:"east", south:"north", north:"south" };
const blockPalette = ["#88b8e8", "#edbd60", "#c998d4", "#78c9ab", "#ef9b8c", "#a9c76b", "#d6b0bd", "#7bcbd4"];

function networkBit(from, to) {
  const dx=to.x-from.x, dy=to.y-from.y;
  return dx===1&&dy===0?1:dx===-1&&dy===0?2:dy===1&&dx===0?4:dy===-1&&dx===0?8:0;
}

function networkConnected(from, to, kind) {
  if(!passable(from,kind)||!passable(to,kind))return false;
  const bit=networkBit(from,to), reverse=networkBit(to,from);
  // Missing masks retain the automatic connections of older saved games.
  return Boolean(bit && (from.links===undefined || from.links&bit) && (to.links===undefined || to.links&reverse));
}

function blockColorIndex(block) {
  let value = 0;
  for (const char of String(block)) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value % blockPalette.length;
}

function railStepAllowed(from, to, map=game.map) {
  if(!networkConnected(map[from.y]?.[from.x],to,"rail"))return false;
  if (!to?.signal?.oneWay) return true;
  const direction = railDirections[to.signal.direction];
  return to.x - from.x === direction.x && to.y - from.y === direction.y;
}

function buildBlockMap(map) {
  const result = new Map();
  const rail = (tile) => tile && ["rail", "stationRail"].includes(tile.build);
  const boundary = (tile) => tile.signal || tile.station !== null;
  for (const tile of map.flat()) {
    const key = tileKey(tile.x, tile.y);
    if (!rail(tile) || result.has(key)) continue;
    const block = key;
    result.set(key, block);
    if (boundary(tile)) continue;
    const queue = [tile];
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      for (const dir of Object.values(railDirections)) {
        const next = map[current.y + dir.y]?.[current.x + dir.x];
        if (!rail(next) || boundary(next) || !networkConnected(current,next,"rail")) continue;
        const nextKey = tileKey(next.x, next.y);
        if (result.has(nextKey)) continue;
        result.set(nextKey, block);
        queue.push(next);
      }
    }
  }
  return result;
}

function railBlocks() {
  if (traffic.dirty) {
    traffic.blocks = buildBlockMap(game.map);
    traffic.pathBlocks = pathBlockSet(game.map, traffic.blocks);
    traffic.dirty = false;
  }
  return traffic.blocks;
}

function pathBlockSet(map, blocks) {
  const areas = new Set();
  for (const tile of map.flat()) {
    if (tile.signal?.type !== "path") continue;
    const direction = railDirections[tile.signal.direction];
    for (const sign of tile.signal.oneWay ? [1] : [1, -1]) {
      const next = map[tile.y + sign * direction.y]?.[tile.x + sign * direction.x];
      if (next && !next.signal && next.station === null && networkConnected(tile,next,"rail")) {
        const block = blocks.get(tileKey(next.x, next.y));
        if (block !== undefined) areas.add(block);
      }
    }
  }
  return areas;
}

function pbsBlocks() { railBlocks(); return traffic.pathBlocks; }

function trainPosition(vehicle) { return vehicle.index + vehicle.dir * vehicle.progress; }

function trainFootprint(vehicle, position = trainPosition(vehicle)) {
  if(vehicle.inDepot)return [];
  const max = vehicle.path.length - 1;
  const anchor = clamp(position, 0, max) * vehicleTravelDistance(vehicle) / max;
  const span = (vehicleCarCount(vehicle) - 1) * 0.58;
  // Include body overhang and every tile between the first and last car, including curves.
  const first = Math.max(0, Math.ceil(anchor - 0.26 - 0.5));
  const last = Math.min(max, Math.floor(anchor + span + 0.26 + 0.5));
  return vehicle.path.slice(first, last + 1);
}

function trainBlocks(vehicle, position = trainPosition(vehicle), blocks = railBlocks()) {
  return new Set(trainFootprint(vehicle, position).map((point) => blocks.get(tileKey(point.x, point.y))).filter((key) => key !== undefined));
}

function trafficOwners(exclude, blocks = railBlocks(), vehicles = game.vehicles) {
  const owners = new Map();
  for (const vehicle of vehicles) {
    if (vehicle === exclude || vehicle.type !== "train") continue;
    for (const block of trainBlocks(vehicle, trainPosition(vehicle), blocks)) owners.set(block, vehicle.id);
  }
  return owners;
}

function trainCanPlace(vehicle, exclude = vehicle) {
  return claimsAvailable(vehicle, trainClaims(vehicle), exclude);
}

function prepareRailPlacement(vehicle, exclude = vehicle) {
  if (!trainCanPlace(vehicle, exclude)) return false;
  const areas = pbsBlocks();
  if (trainFootprint(vehicle).some((p) => areas.has(railBlocks().get(tileKey(p.x, p.y))) && isJunction(p))) {
    const plan = planReservation(vehicle, exclude);
    if (!plan) return false;
    vehicle.pathReservation = plan;
  }
  return true;
}

function trafficStateValid(state) {
  const blocks = buildBlockMap(state.map), areas = pathBlockSet(state.map, blocks);
  const tiles = new Set(), owners = new Set(), used = new Set();
  for (const vehicle of state.vehicles) {
    if (vehicle.type !== "train" || vehicle.inDepot) continue;
    const claim = trainClaims(vehicle, trainPosition(vehicle), vehicle.pathReservation, blocks, areas, state.map);
    if ([...claim.tiles].some((key) => tiles.has(key)) || [...claim.blocks].some((key) => used.has(key)) || [...claim.usedBlocks].some((key) => owners.has(key))) return false;
    claim.tiles.forEach((key) => tiles.add(key));
    claim.blocks.forEach((key) => owners.add(key));
    claim.usedBlocks.forEach((key) => used.add(key));
  }
  return true;
}

function sweptPath(vehicle, start, end) {
  const max = vehicle.path.length - 1, scale = vehicleTravelDistance(vehicle) / max;
  const span = (vehicleCarCount(vehicle) - 1) * 0.58;
  const low = Math.max(0, Math.ceil(Math.min(start, end) * scale - 0.76));
  const high = Math.min(max, Math.floor(Math.max(start, end) * scale + span + 0.76));
  return vehicle.path.slice(low, high + 1);
}

function vehicleRouteAheadOpen(vehicle, map = game.map) {
  const target = vehicle.dir > 0 ? vehicle.path.length - 1 : 0;
  const kind = routeTypeForVehicle(vehicle.type);
  return sweptPath(vehicle, trainPosition(vehicle), target).every((p,i,points) => {
    const tile = map[p.y]?.[p.x];
    const previous=i?map[points[i-1].y]?.[points[i-1].x]:null;
    return passable(tile,kind) && (!previous || networkConnected(previous,tile,kind));
  });
}

function trainClaims(vehicle, position = trainPosition(vehicle), reservation = vehicle.pathReservation, blocks = railBlocks(), areas = pbsBlocks(), map = game.map) {
  const points = reservation && reservation.direction === vehicle.dir ? sweptPath(vehicle, position, reservation.end) : trainFootprint(vehicle, position);
  const keys = new Set(points.map((p) => tileKey(p.x, p.y)));
  const exclusive = new Set([...keys].map((key) => blocks.get(key)).filter((key) => key !== undefined && !areas.has(key)));
  const usedBlocks = new Set([...keys].map((key) => blocks.get(key)).filter((key) => key !== undefined));
  // A legacy block-signal entrance retains exclusive ownership even inside a PBS area.
  for (const point of points) {
    const block = blocks.get(tileKey(point.x, point.y));
    if (!areas.has(block) || exclusive.has(block)) continue;
    let index = vehicle.path.indexOf(point);
    const previous = () => vehicle.path[index - vehicle.dir];
    while (previous() && blocks.get(tileKey(previous().x, previous().y)) === block) index -= vehicle.dir;
    const entry = previous();
    const signal = entry && map[entry.y]?.[entry.x]?.signal;
    if (signal && signal.type !== "path") exclusive.add(block);
  }
  return { tiles: keys, blocks: exclusive, usedBlocks };
}

function claimsAvailable(vehicle, claim, exclude = vehicle) {
  for (const other of game.vehicles) {
    if (other === exclude || other.type !== "train") continue;
    const held = trainClaims(other);
    if ([...claim.tiles].some((key) => held.tiles.has(key)) || [...claim.blocks].some((key) => held.usedBlocks.has(key)) || [...held.blocks].some((key) => claim.usedBlocks.has(key))) return false;
  }
  return true;
}

function reservedTiles() {
  const result = new Map();
  for (const v of game.vehicles) {
    if (v.type !== "train" || !v.pathReservation) continue;
    for (const key of trainClaims(v).tiles) result.set(key, v.id);
  }
  return result;
}

function isJunction(point, map = game.map) {
  return Object.values(railDirections).filter((dir) => networkConnected(map[point.y]?.[point.x],map[point.y + dir.y]?.[point.x + dir.x],"rail")).length > 2;
}

function safeReservationStop(vehicle, position, map = game.map) {
  return trainFootprint(vehicle, position).every((p) => !isJunction(p, map));
}

function reservationRouteAllowed(vehicle, plan, map = game.map) {
  const scale = vehicleTravelDistance(vehicle) / (vehicle.path.length - 1), span = (vehicleCarCount(vehicle) - 1) * 0.58;
  const position = trainPosition(vehicle);
  const from = Math.min(Math.round(position * scale), Math.round(plan.end * scale));
  const to = Math.max(Math.round(position * scale + span), Math.round(plan.end * scale + span));
  for (let j = from; j < to; j++) {
    const a = vehicle.path[vehicle.dir > 0 ? j : j + 1], b = vehicle.path[vehicle.dir > 0 ? j + 1 : j];
    if (!a || !b || !railStepAllowed(a, map[b.y]?.[b.x],map)) return false;
  }
  return true;
}

function planReservation(vehicle, exclude = vehicle, after = trainPosition(vehicle)) {
  const position = trainPosition(vehicle), max = vehicle.path.length - 1;
  const scale = vehicleTravelDistance(vehicle) / max, span = (vehicleCarCount(vehicle) - 1) * 0.58;
  const first = Math.max(0, Math.floor(position * scale));
  const indices = vehicle.dir > 0 ? Array.from({ length: max - first + 1 }, (_, i) => first + i) : Array.from({ length: Math.min(max, Math.ceil(position * scale + span)) + 1 }, (_, i) => Math.min(max, Math.ceil(position * scale + span)) - i);
  for (const i of indices) {
    const tile = getTile(vehicle.path[i].x, vehicle.path[i].y);
    const destination = vehicle.dir > 0 ? i === max : i === 0;
    if (!tile?.signal && !destination) continue;
    let end = destination ? (vehicle.dir > 0 ? max : 0) : (i + vehicle.dir * (0.5 - 0.26 - 1e-6) - (vehicle.dir > 0 ? span : 0)) / scale;
    end = clamp(end, 0, max);
    if ((end - after) * vehicle.dir < 1e-5 || !safeReservationStop(vehicle, end)) continue;
    const plan = { end, direction: vehicle.dir };
    const path = sweptPath(vehicle, position, end);
    if (path.some((p) => !passable(getTile(p.x, p.y), "rail"))) return null;
    if (!reservationRouteAllowed(vehicle, plan)) return null;
    // The first safe stopping place is authoritative; do not reserve through a blocked exit.
    return claimsAvailable(vehicle, trainClaims(vehicle, position, plan), exclude) ? plan : null;
  }
  return null;
}

function railEditSafe(tile, patch) {
  if (reservedTiles().has(tileKey(tile.x, tile.y))) return false;
  const previous = { ...tile };
  try { Object.assign(tile, patch); return trafficStateValid(game); }
  finally {
    for (const key of Object.keys(tile)) if (!Object.hasOwn(previous, key)) delete tile[key];
    Object.assign(tile, previous);
  }
}

function railSafePosition(vehicle, desired) {
  if (vehicle.type !== "train") return desired;
  const position = trainPosition(vehicle), areas = pbsBlocks();
  if (vehicle.pathReservation && (vehicle.pathReservation.direction !== vehicle.dir || (vehicle.pathReservation.end - position) * vehicle.dir < 1e-8)) vehicle.pathReservation = null;
  let plan = vehicle.pathReservation;
  const needsPlan = (next) => [...trainBlocks(vehicle, next)].some((block) => areas.has(block));
  if (!plan && needsPlan(desired)) plan = planReservation(vehicle);
  if (plan && (desired-plan.end)*vehicle.dir>1e-6) plan=planReservation(vehicle,vehicle,plan.end)||plan;
  const limit = plan ? (vehicle.dir > 0 ? Math.min(desired, plan.end) : Math.max(desired, plan.end)) : desired;
  const valid = (next) => {
    if (needsPlan(next) && !plan) return false;
    if (!claimsAvailable(vehicle, trainClaims(vehicle, next, plan || {end:position,direction:vehicle.dir}))) return false;
    const max = vehicle.path.length - 1, span = (vehicleCarCount(vehicle) - 1) * 0.58;
    const lead = (p) => p * vehicleTravelDistance(vehicle) / max + (vehicle.dir > 0 ? span : 0) + vehicle.dir * 0.26;
    const first = clamp(Math.round(lead(position)), 0, max), last = clamp(Math.round(lead(next)), 0, max);
    for (let i = first; i !== last; i += vehicle.dir) {
      const from = vehicle.path[i], to = vehicle.path[i + vehicle.dir];
      if (!from || !to || !railStepAllowed(from, getTile(to.x, to.y))) return false;
    }
    return true;
  };
  const commit = (next) => { if (plan && needsPlan(next)) vehicle.pathReservation = plan; };
  if (valid(limit)) { commit(limit); vehicle.signalWaiting = false; vehicle.reservationWaiting = false; return limit; }
  let low = 0, high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (valid(position + (limit - position) * mid)) low = mid; else high = mid;
  }
  vehicle.signalWaiting = true;
  vehicle.reservationWaiting = needsPlan(desired) && !plan;
  const safe = position + (limit - position) * low;
  commit(safe);
  return safe;
}

function turnTrainForDeparture(vehicle) {
  vehicle.pathReservation = null;
  const max = vehicle.path.length - 1;
  const currentId = vehicle.index === 0 ? vehicle.from : vehicle.to;
  const otherId = vehicle.index === 0 ? vehicle.to : vehicle.from;
  const current = game.stations[currentId], other = game.stations[otherId];
  const ordered = vehicle.index === 0 ? vehicle.path : [...vehicle.path].reverse();
  if (ordered.every((point, i) => passable(getTile(point.x, point.y), "rail") && (!i || railStepAllowed(ordered[i - 1], getTile(point.x, point.y))))) {
    vehicle.dir *= -1; vehicle.routeWaiting = false;
    return true;
  }
  if (!current || !other || current.closed || other.closed) { vehicle.routeWaiting = true; return false; }
  const path = findPath(current, other, "rail");
  if (!path || path.length - 1 < (vehicleCarCount(vehicle) - 1) * 0.58 + 0.5) { vehicle.routeWaiting = true; return false; }
  const candidate = { ...vehicle, from: currentId, to: otherId, path, index: 0, dir: 1, progress: 0 };
  if (!prepareRailPlacement(candidate, vehicle)) { vehicle.signalWaiting = true; return false; }
  Object.assign(vehicle, candidate, { routeWaiting: false, signalWaiting: false });
  return true;
}

function signalTrackDirection(tile,reversed=false) {
  if(!tile||tile.build!=="rail"||tile.bridge)return null;
  const connected=Object.keys(railDirections).filter(name=>{const d=railDirections[name];return networkConnected(tile,getTile(tile.x+d.x,tile.y+d.y),"rail");});
  if(connected.length!==2)return null;
  const axis=["east","south"].find(name=>connected.includes(name)&&connected.includes(railOpposites[name]));
  return axis?(reversed?railOpposites[axis]:axis):null;
}

function buildSignal(tile, direction = signalTrackDirection(tile), oneWay = false, type = "block") {
  if(tile?.bridge){flash("Signale bitte vor oder hinter der Bruecke setzen.");return false;}
  const dir = railDirections[direction];
  if (!tile || tile.build !== "rail" || !Object.hasOwn(railDirections, direction)
    || Object.values(railDirections).filter((step) => networkConnected(tile,getTile(tile.x + step.x, tile.y + step.y), "rail")).length !== 2
    || !networkConnected(tile,getTile(tile.x + dir.x, tile.y + dir.y), "rail") || !networkConnected(tile,getTile(tile.x - dir.x, tile.y - dir.y), "rail")) {
    flash("Signale benoetigen ein gerades Gleisfeld mit passender Richtung."); return false;
  }
  if (game.vehicles.some((v) => v.type === "train" && trainFootprint(v).some((p) => p.x === tile.x && p.y === tile.y))) {
    flash("Das Gleisfeld ist durch einen Zug belegt."); return false;
  }
  if (!["block", "path"].includes(type)) return false;
  const signal = { direction, oneWay: Boolean(oneWay), type };
  if (tile.signal?.direction === direction && tile.signal.oneWay === signal.oneWay && (tile.signal.type || "block") === type) return true;
  if (!railEditSafe(tile, { signal })) { flash("Diese Aenderung wuerde belegte Bloecke verbinden."); return false; }
  if (!tile.signal && !spend(300)) return false;
  tile.signal = signal;
  mark3dDirty(); selectTile(tile);
  return true;
}

function signalIsRed(tile, direction = tile.signal.direction) {
  const dir = railDirections[direction], next = getTile(tile.x + dir.x, tile.y + dir.y);
  const blocks = railBlocks(), owners = trafficOwners();
  const reservedApproach = game.vehicles.some((v) => {
      if (!v.pathReservation || !trainClaims(v).tiles.has(tileKey(tile.x, tile.y))) return false;
      const index = v.path.findIndex((p) => p.x === tile.x && p.y === tile.y), nextPoint = v.path[index + v.dir];
      if (!nextPoint || nextPoint.x - tile.x !== dir.x || nextPoint.y - tile.y !== dir.y) return false;
      const front = trainPosition(v) * vehicleTravelDistance(v) / (v.path.length - 1) + (v.dir > 0 ? (vehicleCarCount(v) - 1) * 0.58 : 0);
      const reservedFront = v.pathReservation.end * vehicleTravelDistance(v) / (v.path.length - 1) + (v.dir > 0 ? (vehicleCarCount(v) - 1) * 0.58 : 0);
      return (index + v.dir * 0.5 - front) * v.dir >= 0 && (reservedFront - index - v.dir * 0.5) * v.dir > 0;
    });
  if (tile.signal.type === "path") return !reservedApproach;
  if (reservedApproach) return false;
  const nextBlock = next && blocks.get(tileKey(next.x, next.y));
  const reserved = game.vehicles.some((v) => v.pathReservation && trainClaims(v).usedBlocks.has(nextBlock));
  return !networkConnected(tile,next,"rail") || reserved || owners.has(blocks.get(tileKey(tile.x, tile.y))) || owners.has(nextBlock);
}


function makeSignalDirectionArrow3d(settings,material) {
  const group=new THREE.Group(),dir=railDirections[settings.direction];
  group.rotation.y=Math.atan2(dir.x,dir.y);group.userData.signalArrow=true;
  group.userData.direction=settings.direction;group.userData.oneWay=settings.oneWay;
  for(const sign of settings.oneWay?[1]:[1,-1]) {
    const head=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.26,3),material);
    head.scale.z=0.15;head.rotation.x=sign*Math.PI/2;head.position.z=sign*0.3;group.add(head);
    const stem=new THREE.Mesh(new THREE.BoxGeometry(0.065,0.018,0.3),material);
    stem.position.z=sign*0.08;group.add(stem);
  }
  return group;
}

function addSignal3d(tile) {
  const world = tileToWorld3d(tile.x, tile.y), dir = railDirections[tile.signal.direction];
  const group = new THREE.Group();
  group.position.set(world.x + dir.x * threeConfig.tileSize * 0.5 + dir.y * 0.32, 0, world.z + dir.y * threeConfig.tileSize * 0.5 - dir.x * 0.32);
  group.rotation.y = Math.atan2(dir.x, dir.y);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.7, 0.035), three.materials.wheels);
  post.position.y = 0.4; group.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.25, 0.1), tile.signal.type === "path" ? three.materials.signalPath : three.materials.wheels);
  head.position.y = 0.75; group.add(head);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), three.materials.signalRed);
  lamp.position.set(0, 0.75, -0.07); group.add(lamp);
  if (!tile.signal.oneWay) {
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), three.materials.signalRed);
    back.position.set(0, 0.75, 0.07); group.add(back);
    traffic.lamps.push({ tile, lamp: back, direction: railOpposites[tile.signal.direction] });
  }
  const arrow=makeSignalDirectionArrow3d(tile.signal,three.materials.signalArrow);
  arrow.position.set(world.x,0.16,world.z);three.staticGroup.add(arrow);
  three.staticGroup.add(group);
  traffic.lamps.push({ tile, lamp, direction: tile.signal.direction });
}

function updateSignalLamps() {
  for (const { tile, lamp, direction } of traffic.lamps) lamp.material = signalIsRed(tile, direction) ? three.materials.signalRed : three.materials.signalGreen;
}

function updateReservationOverlay() {
  const overlay = traffic.reservationOverlay;
  if (!overlay) return;
  traffic.renderReservations = game.showBlocks ? reservedTiles() : new Map();
  traffic.reservationMatrix ||= new THREE.Matrix4();
  let count = 0;
  for (const key of traffic.renderReservations.keys()) {
    const [x, y] = key.split(",").map(Number), world = tileToWorld3d(x, y);
    traffic.reservationMatrix.makeTranslation(world.x, (getTile(x,y)?.bridge?0.13:0.061)+routeElevationAt(x,y), world.z);
    overlay.setMatrixAt(count++, traffic.reservationMatrix);
  }
  overlay.count = count;
  overlay.instanceMatrix.needsUpdate = true;
}
