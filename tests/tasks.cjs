const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

// Optional task mode: off by default, progress counts from the start of each task, rewards, skipping,
// stopping, and the task state in saves (including old saves without it and rejected bad data).
const nodes = new Map(), storage = new Map();
const element = () => ({ value: 'avoid', checked: true, hidden: false, textContent: '', open: false, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, replaceChildren(...c) { this.children = c; }, append() {}, addEventListener() {}, focus() {}, select() {}, showModal() { this.open = true; }, close() { this.open = false; }, getBoundingClientRect: () => ({ width: 1200, height: 800 }) });
const get = id => { id = String(id).replace(/^#/, ''); if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
const strip = s => s.replace(/\ninit(?:Management|Tasks)?\(\);\s*$/, '');
const source = ['vendor/pathfinding-0.4.18.min', 'vendor/simplex-noise-4.0.3.min', 'landscape', 'towns', 'railway', 'construction', 'physics', 'game', 'management', 'tasks']
  .map(n => strip(readFileSync(join(__dirname, '../src/' + n + '.js'), 'utf8'))).join('\n');

runInNewContext(source + `
makeMap();game.speed=0;
assert.equal(game.tasks,null,'Free building is the default');
updateUi();assert.equal(game.tasks,null,'The UI loop must not start tasks');
renderTaskUi(true);assert.equal(get('taskCard').hidden,true,'No task card in free mode');

// Deliveries before the start do not count.
const station={id:0,x:3,y:3,kind:'rail',name:'A',produces:['passengers'],accepts:['passengers'],waiting:{passengers:0,coal:0,grain:0,goods:0},delivered:0};
const fakeTrain=cargo=>({id:game.vehicles.length,type:'train',cargo,load:500,path:[{x:3,y:3},{x:4,y:3}],profit:0});
deliverCargo(fakeTrain('passengers'),station,70);
assert.equal(game.stats.delivered.passengers,70);
startTasks();
assert.equal(game.tasks.index,0);assert.equal(game.tasks.baseline.delivered.passengers,70);
assert.equal(get('taskCard').hidden,false,'Task card shows the current task');

// 1: a train. Reward is paid once.
let cash=game.cash;
updateTasks(true);assert.equal(game.tasks.index,0,'No train yet');
game.vehicles.push(fakeTrain('passengers'));
updateTasks(true);assert.equal(game.tasks.index,1);assert.equal(game.cash,cash+10000);assert.deepEqual(game.tasks.done,['first-line']);
updateTasks(true);assert.equal(game.tasks.index,1,'A task completes only once');

// 2: 100 passengers since this task started.
deliverCargo(fakeTrain('passengers'),station,60);
updateTasks(true);assert.equal(game.tasks.index,1);assert.deepEqual(taskProgress(),{value:60,target:100});
deliverCargo(fakeTrain('passengers'),station,40);
cash=game.cash;updateTasks(true);assert.equal(game.tasks.index,2);assert.equal(game.cash,cash+15000);

// 3: raw materials count coal and grain, not passengers.
deliverCargo(fakeTrain('passengers'),station,500);
assert.deepEqual(taskProgress(),{value:0,target:150});
deliverCargo(fakeTrain('coal'),station,100);deliverCargo(fakeTrain('grain'),station,49);
updateTasks(true);assert.equal(game.tasks.index,2);
deliverCargo(fakeTrain('grain'),station,1);updateTasks(true);assert.equal(game.tasks.index,3);

// Skipping moves on without a reward.
cash=game.cash;advanceTask(false);assert.equal(game.tasks.index,4);assert.equal(game.cash,cash);assert.ok(!game.tasks.done.includes('goods'));

// Saves keep stats and task progress; progress is bounded by the target.
game.vehicles=[];
const saved=JSON.stringify(createSave());
game.tasks=null;game.stats=null;restoreSave(saved);
assert.equal(game.tasks.index,4);assert.deepEqual(game.tasks.done,['first-line','passengers','raw-materials']);assert.equal(game.stats.delivered.coal,100);
const p=taskProgress();assert.ok(p.value<=p.target);

// Town growth counts from the baseline per town.
game.tasks.index=TASKS.findIndex(t=>t.id==='town-growth');game.tasks.baseline=taskBaseline();
game.towns[0].population+=49;updateTasks(true);assert.equal(currentTask().id,'town-growth');
game.towns[0].population+=1;updateTasks(true);assert.equal(currentTask().id,'network');

// Shared-track pair for the two-way task.
const line=Array.from({length:12},(_,i)=>({x:2+i,y:5}));
game.vehicles=[{id:0,type:'train',path:line},{id:1,type:'train',path:[...line].reverse()}];
assert.equal(sharedTrackPair(8),true);
game.vehicles[1].path=line.slice(0,5);assert.equal(sharedTrackPair(8),false);
game.vehicles=[];

// All tasks done: the card hides and the mode stays on without a current task.
game.tasks.index=TASKS.length-1;game.tasks.baseline=taskBaseline();game.cash=2000000;
updateTasks(true);assert.equal(currentTask(),null);assert.equal(get('taskCard').hidden,true);

// Stop returns to free building; old saves without the fields still load.
stopTasks();assert.equal(game.tasks,null);
const old=JSON.parse(JSON.stringify(createSave()));delete old.state.tasks;delete old.state.stats;
restoreSave(JSON.stringify(old));assert.equal(game.tasks,null);assert.equal(game.stats,null);

// Bad task data is rejected before anything changes.
for(const bad of [{index:-1,done:[],baseline:taskBaseline()},{index:2,done:'x',baseline:taskBaseline()},{index:2,done:[],baseline:{delivered:{wood:1},income:0,populations:{}}},{index:2,done:[],baseline:{delivered:{},income:0,populations:{x:1}}}]){
  const file=JSON.parse(JSON.stringify(createSave()));file.state.tasks=bad;
  assert.throws(()=>decodeSave(JSON.stringify(file)),/Spielstand/);
}
assert.equal(TASKS.length,10);assert.equal(new Set(TASKS.map(t=>t.id)).size,10);
console.log('Tasks passed: off by default, progress from task start, rewards once, skip and stop, ten distinct tasks, saves with and without task state, bad data rejected.');
`, { console, assert, get, document: { querySelector: get, querySelectorAll: () => [], getElementById: get, createElement: () => element(), body: { dataset: {} } }, performance: { now: () => 1 }, window: { devicePixelRatio: 1, confirm: () => true, matchMedia: () => ({ matches: false }) }, getComputedStyle: () => ({ position: 'static' }), localStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) }, Date, structuredClone });
