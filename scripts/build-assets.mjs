import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import * as THREE from '../artifacts/routing-vendor/node_modules/three/build/three.module.js';
import {OBJLoader} from '../artifacts/routing-vendor/node_modules/three/examples/jsm/loaders/OBJLoader.js';
import {MTLLoader} from '../artifacts/routing-vendor/node_modules/three/examples/jsm/loaders/MTLLoader.js';
import {mergeGeometries,mergeVertices} from '../artifacts/routing-vendor/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
const {PNG}=createRequire(import.meta.url)('pngjs');
const root=resolve('artifacts/kenney'),output=resolve('src/assets');
mkdirSync(join(output,'licenses'),{recursive:true});
const selection=[
 ['house-cottage','houses','building-type-a','house','c'],
 ['house-brick','houses','building-type-d','house','b'],
 ['house-gable','houses','building-type-c','house'],
 ['house-duplex','houses','building-type-f','house','c'],
 ['house-villa','houses','building-type-g','house','a'],
 ['house-town','houses','building-type-l','house','b'],
 ['oak','nature','tree_oak','tree'],['broadleaf','nature','tree_default','tree'],
 ['pine','nature','tree_pineRoundA','tree'],['spruce','nature','tree_pineDefaultA','tree'],
 ['bush','nature','plant_bush','prop'],['rock','nature','rock_largeA','prop'],
 ['wheat','nature','crops_wheatStageB','crop'],
 ['factory','industry','building-c','industry'],['warehouse','industry','building-f','industry'],
 ['workshop','industry','building-l','industry'],['tank','industry','detail-tank-large','prop'],
 ['chimney','industry','chimney-large','prop'],['water-tower','industry','water-tower','prop'],
 ['locomotive','train','train-locomotive-a','vehicle'],
 ['coach','train','train-locomotive-passenger-a','vehicle'],
 ['hopper','train','train-carriage-coal','vehicle'],['flatbed','train','train-carriage-flatbed','vehicle'],
 ['boxcar','train','train-carriage-box','vehicle'],
 ['truck','cars','truck-flat','vehicle'],['tractor','cars','tractor','prop'],['crate','cars','box','prop'],
 ['fence','houses','fence-low','prop'],
];
const textures=new Map(),models={},manifest=[];
function texture(path){if(!textures.has(path))textures.set(path,PNG.sync.read(readFileSync(path)));return textures.get(path);}
function sourceGeometry(pack,name,variation){
 const file=join(root,pack,'Models','OBJ format',name+'.obj'),folder=dirname(file);
 const materials=new MTLLoader().parse(readFileSync(file.replace(/\.obj$/,'.mtl'),'utf8'),folder).materialsInfo;
 const object=new OBJLoader().parse(readFileSync(file,'utf8')),parts=[],front=[];
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if(/front/i.test(mesh.name)){mesh.geometry.computeBoundingBox();front.push(mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).z);}
  const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),pos=g.getAttribute('position'),uv=g.getAttribute('uv');
  const colors=new Float32Array(pos.count*3);
  for(const group of g.groups.length?g.groups:[{start:0,count:pos.count,materialIndex:0}]){
   const mat=Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material,info=materials[mat.name]||{};
   let image=null;
   if(info.map_kd){const path=variation?join(root,pack,'Models','Textures','variation-'+variation+'.png'):resolve(folder,info.map_kd);image=texture(path);}
   for(let i=group.start;i<group.start+group.count;i++){
    let rgb=info.kd||[1,1,1];
    if(image&&uv){const x=Math.min(image.width-1,Math.max(0,Math.floor(uv.getX(i)*image.width))),y=Math.min(image.height-1,Math.max(0,Math.floor((1-uv.getY(i))*image.height))),offset=(y*image.width+x)*4;rgb=[image.data[offset]/255,image.data[offset+1]/255,image.data[offset+2]/255];}
    const color=new THREE.Color().setRGB(...rgb,THREE.SRGBColorSpace);colors.set([color.r,color.g,color.b],i*3);
   }
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.deleteAttribute('uv');g.clearGroups();
  if(!g.getAttribute('normal'))g.computeVertexNormals();parts.push(g);
 });
 const geometry=mergeGeometries(parts);geometry.computeBoundingBox();
 if(front.length&&front.reduce((a,b)=>a+b,0)/front.length<geometry.boundingBox.getCenter(new THREE.Vector3()).z)geometry.rotateY(Math.PI);
 return {geometry,file};
}

function splitCoal(geometry){
 const p=geometry.getAttribute('position'),c=geometry.getAttribute('color'),n=geometry.getAttribute('normal');
 geometry.computeBoundingBox();const b=geometry.boundingBox,cut=b.min.y+(b.max.y-b.min.y)*0.5;
 const parts=[{p:[],n:[],c:[]},{p:[],n:[],c:[]}];
 for(let i=0;i<p.count;i+=3){
  let y=0,light=0;for(let j=0;j<3;j++){y+=p.getY(i+j)/3;light+=(c.getX(i+j)+c.getY(i+j)+c.getZ(i+j))/3;}
  const part=parts[y>cut&&light<0.26?1:0];
  for(let j=0;j<3;j++)for(let a=0;a<3;a++){part.p.push(p.array[(i+j)*3+a]);part.n.push(n.array[(i+j)*3+a]);part.c.push(c.array[(i+j)*3+a]);}
 }
 return parts.map(part=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(part.c,3));return g;});
}
function encode(id,geometry,meta){
 geometry.computeBoundingBox();const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const scale=1/Math.max(size.x,size.y,size.z);
 geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(scale,scale,scale);
 geometry=mergeVertices(geometry,0.00001);
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),c=geometry.getAttribute('color'),count=p.count;
 if(count>65535)throw new Error('Too many vertices: '+id);
 const buffer=Buffer.alloc(count*12);
 for(let i=0;i<count;i++){
  for(let axis=0;axis<3;axis++)buffer.writeInt16LE(Math.round(p.array[i*3+axis]*32767),i*12+axis*2);
  for(let axis=0;axis<3;axis++)buffer.writeInt8(Math.max(-127,Math.min(127,Math.round(n.array[i*3+axis]*127))),i*12+6+axis);
  for(let axis=0;axis<3;axis++)buffer.writeUInt8(Math.max(0,Math.min(255,Math.round(c.array[i*3+axis]*255))),i*12+9+axis);
 }
 const indices=Uint16Array.from(geometry.index.array);
 const bounds=[size.x*scale,size.y*scale,size.z*scale].map(n=>Number(n.toFixed(6)));
 models[id]={bounds,vertices:count,triangles:indices.length/3,data:buffer.toString('base64'),index:Buffer.from(indices.buffer).toString('base64'),category:meta.category};
 manifest.push({id,...meta,bounds,vertices:count,triangles:indices.length/3});
}
for(const [id,pack,name,category,variation] of selection){
 let {geometry,file}=sourceGeometry(pack,name,variation);
 const source=readFileSync(file),sha256=createHash('sha256').update(source).digest('hex');
 if(id==='hopper'){
  const [empty,load]=splitCoal(geometry);if(load.getAttribute('position').count<12)throw new Error('Coal payload extraction failed');
  encode('coal-load',load.clone(),{pack,source:name+'.obj',category:'load',variation:'extracted coal payload',sha256});
  const grain=load.clone(),c=grain.getAttribute('color'),color=new THREE.Color('#d9b259');
  for(let i=0;i<c.count;i++)c.setXYZ(i,color.r,color.g,color.b);
  encode('grain-load',grain,{pack,source:name+'.obj',category:'load',variation:'extracted payload, grain recolor',sha256});geometry=empty;
 }
 encode(id,geometry,{pack,source:name+'.obj',category,variation:variation||'original',sha256});
}
for(const pack of new Set(selection.map(s=>s[1])))copyFileSync(join(root,pack,'License.txt'),join(output,'licenses',pack+'.txt'));
writeFileSync(join(output,'models.js'),'// Generated by scripts/build-assets.mjs. Kenney CC0; see assets/README.md.\nconst GAME_ASSETS = '+JSON.stringify(models)+';\n');
writeFileSync(join(output,'manifest.json'),JSON.stringify({author:'Kenney',license:'CC0-1.0',models:manifest},null,2)+'\n');
console.log(JSON.stringify(manifest.map(m=>({id:m.id,triangles:m.triangles,bounds:m.bounds}))));
console.log('Bundle bytes: '+readFileSync(join(output,'models.js')).length);
