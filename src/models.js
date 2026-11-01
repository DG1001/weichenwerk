const modelLibrary={geometries:new Map(),houseIds:["house-cottage","house-brick","house-gable","house-duplex","house-villa","house-town"],treeIds:["oak","broadleaf","pine","spruce"]};

function initModelLibrary() {
  three.materials.model=new THREE.MeshLambertMaterial({vertexColors:true});
  three.materials.modelShadow=new THREE.MeshBasicMaterial({color:0x193e32,transparent:true,opacity:0.13,depthWrite:false});
  three.materials.sleeper=new THREE.MeshLambertMaterial({color:0x624d40});
  three.materials.farmSoil=new THREE.MeshLambertMaterial({color:0x947b56});
}

function modelGeometry(id) {
  if(modelLibrary.geometries.has(id))return modelLibrary.geometries.get(id);
  const data=GAME_ASSETS[id];if(!data)throw new Error(`3D-Modell fehlt: ${id}`);
  const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
  const bytes=decode(data.data),view=new DataView(bytes.buffer),p=new Float32Array(data.vertices*3),n=new Float32Array(data.vertices*3),c=new Uint8Array(data.vertices*3);
  for(let i=0;i<data.vertices;i++)for(let axis=0;axis<3;axis++) {
    p[i*3+axis]=view.getInt16(i*12+axis*2,true)/32767;
    n[i*3+axis]=view.getInt8(i*12+6+axis)/127;
    c[i*3+axis]=view.getUint8(i*12+9+axis);
  }
  const raw=decode(data.index),indices=new Uint16Array(raw.length/2),iv=new DataView(raw.buffer);
  for(let i=0;i<indices.length;i++)indices[i]=iv.getUint16(i*2,true);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.BufferAttribute(p,3));geometry.setAttribute("normal",new THREE.BufferAttribute(n,3));
  geometry.setAttribute("color",new THREE.BufferAttribute(c,3,true));geometry.setIndex(new THREE.BufferAttribute(indices,1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.sharedAsset=true;
  modelLibrary.geometries.set(id,geometry);return geometry;
}

function modelScale(id,width,height,depth,uniform=true) {
  const b=GAME_ASSETS[id].bounds,s=[width/b[0],height/b[1],depth/b[2]];
  return uniform?[Math.min(...s),Math.min(...s),Math.min(...s)]:s;
}

function modelMesh(id,width,height,depth,uniform=true) {
  const mesh=new THREE.Mesh(modelGeometry(id),three.materials.model);
  mesh.scale.set(...modelScale(id,width,height,depth,uniform));mesh.userData.assetId=id;return mesh;
}

function addWorldModels(group) {
  const placements=new Map(),shadows=[],sleepers=[],matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();
  const add=(id,x,z,width,height,depth,rotation=0,y=0.045,shadow=true)=>{
    if(!placements.has(id))placements.set(id,[]);
    const s=modelScale(id,width,height,depth,!["wheat","fence"].includes(id));
    const placement={x,y,z,s,rotation};placements.get(id).push(placement);
    if(shadow)shadows.push([x,z,Math.min(width,depth)*0.52]);
    return placement;
  };
  for(const tile of game.map.flat()) {
    const w=tileToWorld3d(tile.x,tile.y),hash=landscapeHash(`${tile.x}:${tile.y}:${game.landscape?.seed||"world"}`),rotation=(hash%4)*Math.PI/2;
    if(["rail","stationRail"].includes(tile.build)) {
      const seen=new Set();
      for(const path of tileRoutePaths(tile,"rail")) {
        const count=Math.max(1,Math.round(routePathLength(path)/0.18));
        for(let i=0;i<count;i++) {
          const p=routePathPoint(path,(i+0.5)/count),angle=Math.atan2(p.dx,p.dy);
          const key=[p.x.toFixed(3),p.y.toFixed(3),(angle%Math.PI).toFixed(3)].join(":");
          if(seen.has(key))continue;seen.add(key);
          const x=tile.x+p.x,y=tile.y+p.y,rise=routeElevationAt(x,y);
          const pitch=-Math.atan2(routeElevationAt(x+p.dx*0.01,y+p.dy*0.01)-routeElevationAt(x-p.dx*0.01,y-p.dy*0.01),0.02*threeConfig.tileSize);
          sleepers.push([w.x+p.x*threeConfig.tileSize,w.z+p.y*threeConfig.tileSize,angle,rise,pitch]);
        }
      }
    }
    if(tile.build==="house")add(modelLibrary.houseIds[hash%modelLibrary.houseIds.length],w.x,w.z,0.87,0.92,0.87,rotation).residential=true;
    if(!tile.build&&tile.terrain==="forest") {
      landscapeTreeOffsets(tile).slice(0,2).forEach(([dx,dz],i)=>{
        const id=modelLibrary.treeIds[(hash+i)%modelLibrary.treeIds.length],size=0.85+(hash%17)/100;
        add(id,w.x+dx,w.z+dz,0.44*size,0.83*size,0.44*size,rotation+i);
      });
    }
    if(!tile.build&&tile.terrain==="field"&&hash%11===0)add("wheat",w.x,w.z,0.2,0.18,0.2,rotation,0.045,false);
    if(tile.build!=="industry")continue;
    const industry=game.industries[tile.industry],cargo=industry?.produces||"goods",center=industry&&tile.x===industry.x&&tile.y===industry.y;
    if(cargo==="goods") {
      if(center)add("factory",w.x,w.z,0.96,1.05,0.96,rotation);
      else if(hash%3===0)add("warehouse",w.x,w.z,0.84,0.64,0.84,rotation);
      else if(hash%3===1)add("tank",w.x,w.z,0.63,0.64,0.63,rotation);
      else {add("crate",w.x-0.18,w.z,0.3,0.27,0.3,rotation);add("crate",w.x+0.16,w.z+0.12,0.24,0.22,0.24,rotation);}
    } else if(cargo==="coal") {
      if(center)add("workshop",w.x,w.z,0.9,0.9,0.9,rotation);
      else if(hash%3===0)add("chimney",w.x,w.z,0.6,1.1,0.6,rotation);
      else add("coal-load",w.x,w.z,0.7,0.3,0.8,rotation);
    } else {
      if(center)add("house-cottage",w.x,w.z,0.82,0.66,0.82,rotation);
      else if(hash%4===0)add("water-tower",w.x,w.z,0.55,0.92,0.55,rotation);
      else if(hash%4===1)add("tractor",w.x,w.z,0.5,0.45,0.66,rotation);
      else {
        for(const dx of [-0.22,0,0.22])for(const dz of [-0.18,0.18])add("wheat",w.x+dx,w.z+dz,0.15,0.22,0.15,rotation,0.045,false);
        add("fence",w.x,w.z+0.39,0.82,0.14,0.2,0,0.045,false);
      }
    }
  }
  for(const [id,list] of placements) {
    const mesh=new THREE.InstancedMesh(modelGeometry(id),three.materials.model,list.length);
    mesh.userData.assetId=id;mesh.userData.assetCategory=GAME_ASSETS[id].category;
    mesh.userData.residentialCount=list.filter(p=>p.residential).length;
    for(let i=0;i<list.length;i++) {
      const p=list[i];position.set(p.x,p.y,p.z);quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.rotation);scale.set(...p.s);
      matrix.compose(position,quaternion,scale);mesh.setMatrixAt(i,matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  if(shadows.length) {
    const mesh=new THREE.InstancedMesh(new THREE.CircleGeometry(1,12),three.materials.modelShadow,shadows.length);
    quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
    shadows.forEach(([x,z,r],i)=>{matrix.compose(position.set(x,0.045,z),quaternion,scale.set(r,r,1));mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  if(sleepers.length) {
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(0.43,0.028,0.075),three.materials.sleeper,sleepers.length);
    sleepers.forEach(([x,z,angle,rise,pitch],i)=>{quaternion.setFromEuler(new THREE.Euler(pitch,angle,0,"YXZ"));matrix.compose(position.set(x,0.092+rise,z),quaternion,scale.set(1,1,1));mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
}

function makeVehicleModel(vehicle,index) {
  const car=new THREE.Group(),engine=index===0;
  const id=engine?(vehicle.type==="train"?"locomotive":"truck"):vehicle.cargo==="passengers"&&vehicle.type==="train"?"coach":["coal","grain"].includes(vehicle.cargo)&&vehicle.type==="train"?"hopper":"flatbed";
  const height=engine?(vehicle.type==="train"?0.43:0.32):id==="coach"?0.36:id==="hopper"?0.25:0.18;
  car.add(modelMesh(id,engine?0.35:0.32,height,0.52,false));
  car.userData.assetId=id;
  const load=new THREE.Group();load.visible=false;load.position.y=id==="hopper"?0.22:id==="coach"?0.24:0.18;
  if(!engine) {
    if(vehicle.cargo==="passengers") {
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.045,0.3),three.materials.cargo);
      bar.position.x=0.162;load.add(bar);
    } else if(vehicle.cargo==="goods") {
      for(const [x,z] of [[-0.065,-0.1],[0.065,-0.1],[0,0.09]]) {
        const box=modelMesh("crate",0.12,0.14,0.15,false);box.position.set(x,0,z);load.add(box);
      }
    } else load.add(modelMesh(vehicle.cargo==="coal"?"coal-load":"grain-load",0.235,0.12,0.36,false));
  }
  car.add(load);car.userData.loadMesh=load;return car;
}
