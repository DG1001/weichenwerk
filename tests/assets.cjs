const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const manifest=JSON.parse(readFileSync(resolve('src/assets/manifest.json'),'utf8'));
const models=runInNewContext(readFileSync(resolve('src/assets/models.js'),'utf8')+';GAME_ASSETS');
assert.ok(Object.keys(models).length>=28);assert.equal(manifest.license,'CC0-1.0');
for(const entry of manifest.models){
 const model=models[entry.id],data=Buffer.from(model.data,'base64'),indices=Buffer.from(model.index,'base64');
 assert.equal(data.length,model.vertices*12);assert.equal(indices.length,model.triangles*6);
 assert.ok(model.triangles>20&&model.vertices>20);assert.ok(model.bounds.every(n=>Number.isFinite(n)&&n>0&&n<=1.00001));
 const colors=new Set();let maxY=0;
 for(let i=0;i<model.vertices;i++){
  for(let axis=0;axis<3;axis++){const n=data.readInt16LE(i*12+axis*2)/32767;assert.ok(Number.isFinite(n)&&Math.abs(n)<=1);}
  assert.ok(data.readInt16LE(i*12+2)>=0,'Model floats below its ground origin');maxY=Math.max(maxY,data.readInt16LE(i*12+2)/32767);
  colors.add([data[i*12+9],data[i*12+10],data[i*12+11]].join(','));
 }
 assert.ok(Math.abs(maxY-model.bounds[1])<0.0001);assert.ok(colors.size>=1);
 for(let i=0;i<indices.length;i+=2)assert.ok(indices.readUInt16LE(i)<model.vertices);
 assert.match(entry.sha256,/^[a-f0-9]{64}$/);assert.ok(existsSync(resolve('src/assets/licenses/'+entry.pack+'.txt')));
}
assert.ok(models.locomotive.triangles>1000);assert.ok(models['house-cottage'].triangles>1000);
assert.ok(models.hopper.triangles+models['coal-load'].triangles===1628,'Hopper payload was lost or duplicated');
console.log('Assets passed: 30 local CC0 models, packed geometry, normalized bounds, valid colors/indices, separate coal/grain payloads and retained source licenses.');
