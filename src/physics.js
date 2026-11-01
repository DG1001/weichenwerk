function cruiseSpeed(vehicle) { return vehicle.speed / config.movementSecondsPerTile; }

function setVehiclePosition(vehicle, position) {
  position = clamp(position, 0, vehicle.path.length - 1);
  vehicle.index = vehicle.dir > 0 ? Math.floor(position) : Math.ceil(position);
  vehicle.progress = Math.abs(position - vehicle.index);
}

function curveSpeedLimit(vehicle, braking) {
  const max = vehicle.path.length - 1, scale = vehicleTravelDistance(vehicle) / max;
  const anchor = trainPosition(vehicle) * scale, span = (vehicleCarCount(vehicle) - 1) * 0.58;
  let limit = cruiseSpeed(vehicle);
  const cornerLimit = limit * (vehicle.type === "train" ? 0.65 : 0.5);
  for (let i = 1; i < max; i++) {
    const a = vehicle.path[i-1], b = vehicle.path[i], c = vehicle.path[i+1];
    if ((b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y) !== 0) continue;
    const ahead = vehicle.dir > 0 ? i-anchor-span-0.35 : anchor-i-0.35;
    const behind = vehicle.dir > 0 ? anchor-i : i-anchor-span;
    if (behind > 0.35) continue;
    limit = Math.min(limit, Math.sqrt(cornerLimit ** 2 + 2 * braking * Math.max(0, ahead)));
  }
  return limit;
}

function driveVehicle(vehicle, seconds) {
  const max = vehicle.path.length-1, position = trainPosition(vehicle), scale = vehicleTravelDistance(vehicle)/max;
  const target = vehicle.dir > 0 ? max : 0;
  const previous = vehicle.velocity || 0;
  const braking = vehicle.type === "train" ? 1.8 : 2.2;
  const acceleration = (vehicle.type === "train" ? 1.15 / (1 + (vehicleCarCount(vehicle)-1)*0.08) : 0.9) / (1 + (vehicle.load||0)/Math.max(1,vehicle.capacity||80)*0.35);
  const lookAhead = Math.max(1.2, previous ** 2 / (2*braking) + 0.35);
  const probe = clamp(position + vehicle.dir*lookAhead/scale, 0, max);
  const clearance = railSafePosition(vehicle, probe);
  const signalWait = vehicle.signalWaiting, pathWait = vehicle.reservationWaiting;
  const distance = Math.min(Math.abs(target-position), Math.abs(clearance-position))*scale;
  const limit = vehicle.stopped ? 0 : Math.min(cruiseSpeed(vehicle), curveSpeedLimit(vehicle, braking), Math.sqrt(2*braking*Math.max(0, distance-0.002)));
  const next = previous < limit ? Math.min(limit, previous+acceleration*seconds) : Math.max(limit, previous-braking*seconds);
  const travel = Math.min(distance, (previous+next)*0.5*seconds);
  const desired = clamp(position + vehicle.dir*travel/scale, 0, max);
  const safe = railSafePosition(vehicle, desired);
  setVehiclePosition(vehicle, safe);
  vehicle.velocity = Math.abs(safe-desired)>1e-8 ? 0 : next;
  vehicle.motionState = vehicle.velocity < 0.02 ? "stopped" : next < previous-0.001 ? "braking" : next < limit-0.01 ? "accelerating" : "cruising";
  if (signalWait && distance < 0.012 && vehicle.velocity < 0.04) {
    vehicle.velocity=0; vehicle.signalWaiting=true; vehicle.reservationWaiting=pathWait;
  }
  if (Math.abs(target-trainPosition(vehicle))*scale < 0.003 && !signalWait) {
    setVehiclePosition(vehicle,target);vehicle.velocity=0;
    beginStationService(vehicle,false);
  }
}

function stationTiles(station) { return station.tiles || [{x:station.x,y:station.y}]; }

function refreshStationSources(station) {
  const produces=new Set(),accepts=new Set(),sources=new Set();
  for(const point of stationTiles(station)) {
    const demand=nearbyDemand(point);
    demand.produces.forEach(c=>produces.add(c));demand.accepts.forEach(c=>accepts.add(c));demand.sources.forEach(s=>sources.add(s));
  }
  station.produces=[...produces];station.accepts=[...accepts];station.sources=[...sources];
}

function stationLoadingRate(vehicle, station) {
  const base=vehicle.type === "train" ? Math.max(1,vehicleCarCount(vehicle)-1)*5 : 10;
  if(vehicle.type !== "train") return base;
  const covered=trainFootprint(vehicle).filter(p=>getTile(p.x,p.y)?.station===station.id).length;
  const length=(vehicleCarCount(vehicle)-1)*0.58+0.5;
  return base / Math.max(1,length/Math.max(0.5,covered));
}

function beginStationService(vehicle, atOrigin) {
  vehicle.serviceSerial=Math.min(1e9,(vehicle.serviceSerial||0)+1);
  vehicle.velocity=0;vehicle.motionState="stopped";
  vehicle.loadingAtOrigin=atOrigin;vehicle.stationWait=config.stationStopSeconds;
  vehicle.servicePhase=atOrigin ? "load" : "unload";
  vehicle.serviceCarry=0;vehicle.serviceRevenue=0;vehicle.serviceLoadTarget=null;
}

function serviceVehicle(vehicle, seconds) {
  const atOrigin=Boolean(vehicle.loadingAtOrigin);
  const current=game.stations[atOrigin ? vehicle.from : vehicle.dir>0 ? vehicle.to : vehicle.from];
  const other=game.stations[atOrigin ? vehicle.to : vehicle.dir>0 ? vehicle.from : vehicle.to];
  vehicle.velocity=0;
  vehicle.stationWait=Math.max(0,(vehicle.stationWait||0)-seconds);
  if(!current || !other) { vehicle.servicePhase="ready"; }
  if(!vehicle.servicePhase) { vehicle.servicePhase=atOrigin || vehicle.stationServiced&&vehicle.loadMode==="full" ? "load" : vehicle.stationServiced ? "ready" : "unload";vehicle.serviceCarry=0;vehicle.serviceRevenue=0; }
  if(current && ["unload","load"].includes(vehicle.servicePhase)) {
    vehicle.serviceCarry=(vehicle.serviceCarry||0)+stationLoadingRate(vehicle,current)*seconds;
    const units=Math.floor(vehicle.serviceCarry+1e-9);
    if(vehicle.servicePhase === "unload") {
      const amount=current.accepts.includes(vehicle.cargo) && current.id!==vehicle.cargoOrigin ? Math.min(units,vehicle.load) : 0;
      if(amount) { vehicle.serviceRevenue=(vehicle.serviceRevenue||0)+deliverCargo(vehicle,current,amount);vehicle.serviceCarry=Math.max(0,vehicle.serviceCarry-amount); }
      if(vehicle.load===0 || !current.accepts.includes(vehicle.cargo) || current.id===vehicle.cargoOrigin) {
        if(vehicle.serviceRevenue>0) log(`${cargoMeta[vehicle.cargo].label} geliefert: ${money(vehicle.serviceRevenue)}.`);
        vehicle.serviceRevenue=0;vehicle.servicePhase="load";vehicle.serviceCarry=0;
      }
    } else {
      refillReturnedCargo(current,vehicle.cargo);
      const canLoad=vehicle.loadMode!=="none" && current.produces.includes(vehicle.cargo) && other.accepts.includes(vehicle.cargo);
      if(vehicle.serviceLoadTarget===null || vehicle.serviceLoadTarget===undefined) {
        vehicle.serviceLoadTarget=canLoad ? vehicle.loadMode==="full" ? vehicle.capacity : Math.min(vehicle.capacity,vehicle.load+Math.floor(current.waiting[vehicle.cargo]||0)) : vehicle.load;
      }
      const amount=canLoad ? Math.min(units,vehicle.serviceLoadTarget-vehicle.load,Math.floor(current.waiting[vehicle.cargo]||0)) : 0;
      if(amount>0) {
        if(vehicle.load===0)vehicle.cargoOrigin=current.id;
        current.waiting[vehicle.cargo]-=amount;vehicle.load+=amount;vehicle.serviceCarry=Math.max(0,vehicle.serviceCarry-amount);
        refillReturnedCargo(current,vehicle.cargo);
        recordTownTransport(vehicle,current,amount,true);
      }
      if(!canLoad || vehicle.load>=vehicle.serviceLoadTarget) vehicle.servicePhase="ready";
      else if((current.waiting[vehicle.cargo]||0)<1) vehicle.serviceCarry=Math.min(vehicle.serviceCarry,1);
    }
  }
  if(vehicle.servicePhase!=="ready" || vehicle.stationWait>1e-9) return;
  if(atOrigin) { vehicle.loadingAtOrigin=false; }
  else if(vehicle.type === "train") {
    if(!turnTrainForDeparture(vehicle)) {vehicle.stationWait=0.25;return;}
  } else vehicle.dir*=-1;
  vehicle.servicePhase=null;vehicle.stationServiced=false;vehicle.serviceLoadTarget=null;
}
