// Optional task mode: a chain of tasks that unlock one after another and get harder. Free building
// stays the default (game.tasks === null). Progress counts from the moment a task becomes current
// (game.tasks.baseline), so earlier play does not complete tasks retroactively.
const taskCount = (filter) => game.vehicles.filter(filter).length;
const deliveredSince = (cargos) => cargos.reduce((sum, cargo) => sum + (game.stats?.delivered[cargo] || 0) - (game.tasks.baseline.delivered[cargo] || 0), 0);

// Two trains whose current routes share at least `tiles` track tiles: only possible to run with
// signals and a passing loop (without them the second train cannot even start).
function sharedTrackPair(tiles) {
  const trains = game.vehicles.filter((v) => v.type === "train" && !v.inDepot);
  const sets = trains.map((v) => new Set(v.path.map((p) => tileKey(p.x, p.y))));
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    let shared = 0;
    for (const key of sets[i]) if (sets[j].has(key) && ++shared >= tiles) return true;
  }
  return false;
}

const TASKS = [
  { id: "first-line", title: "Erste Bahnlinie", text: "Baue zwei Bahnstationen, verbinde sie mit Schiene und kaufe einen Zug.", reward: 10000, help: "start",
    progress: () => ({ value: Math.min(1, taskCount((v) => v.type === "train")), target: 1 }) },
  { id: "passengers", title: "Fahrgaeste", text: "Befoerdere 100 Passagiere zwischen Staedten.", reward: 15000, help: "start",
    progress: () => ({ value: deliveredSince(["passengers"]), target: 100 }) },
  { id: "raw-materials", title: "Rohstoffe fuer die Fabrik", text: "Liefere 150 Einheiten Kohle oder Getreide an eine Fabrik.", reward: 20000, help: "start",
    progress: () => ({ value: deliveredSince(["coal", "grain"]), target: 150 }) },
  { id: "goods", title: "Waren in die Stadt", text: "Liefere 100 Einheiten Waren aus der Fabrik in eine Stadt.", reward: 25000, help: "staedte",
    progress: () => ({ value: deliveredSince(["goods"]), target: 100 }) },
  { id: "signals", title: "Mehrere Zuege", text: "Betreibe 3 Zuege und teile die Strecken mit mindestens 4 Signalen in Bloecke.", reward: 25000, help: "signale",
    progress: () => ({ value: Math.min(3, taskCount((v) => v.type === "train")) + Math.min(4, mapUiTotals().signals), target: 7 }) },
  { id: "bridge", title: "Ueber das Wasser", text: "Baue eine Bruecke ueber Wasser, fuer die Bahn oder eine Strasse.", reward: 20000, help: "bruecken",
    progress: () => ({ value: Math.min(1, mapUiTotals().bridges), target: 1 }) },
  { id: "two-way", title: "Gegenverkehr", text: "Zwei Zuege fahren auf einer gemeinsamen Strecke (mindestens 8 gleiche Gleisfelder) und liefern zusammen 200 Einheiten. Tipp: Ausweichgleis.", reward: 30000, help: "ausweichgleis",
    progress: () => ({ value: sharedTrackPair(8) ? deliveredSince(Object.keys(cargoMeta)) : 0, target: 200 }) },
  { id: "town-growth", title: "Wachsende Stadt", text: "Lass eine Stadt um 50 Einwohner wachsen. Staedte wachsen mit Personenverkehr und Warenlieferungen.", reward: 30000, help: "staedte",
    progress: () => ({ value: Math.max(0, ...game.towns.map((t) => t.population - (game.tasks.baseline.populations[t.id] ?? t.population))), target: 50 }) },
  { id: "network", title: "Verkehrsnetz", text: "Betreibe 8 Fahrzeuge und 6 Stationen.", reward: 40000, help: "fahrzeuge",
    progress: () => ({ value: Math.min(8, game.vehicles.length) + Math.min(6, game.stations.filter((s) => !s.closed).length), target: 14 }) },
  { id: "company", title: "Grossunternehmen", text: "Erreiche einen Firmenwert von $750,000.", reward: 50000, help: "fahrzeuge",
    progress: () => ({ value: Math.max(0, Math.floor(companyValue())), target: 750000 }) },
];

const taskUi = { lastUpdate: 0 };

function taskBaseline() {
  return {
    delivered: { ...(game.stats?.delivered || newStats().delivered) },
    income: game.stats?.income || 0,
    populations: Object.fromEntries(game.towns.map((town) => [town.id, town.population])),
  };
}

function currentTask() { return game.tasks ? TASKS[game.tasks.index] || null : null; }

function taskProgress(task = currentTask()) {
  if (!task) return null;
  const { value, target } = task.progress();
  return { value: Math.max(0, Math.min(value, target)), target };
}

function startTasks() {
  game.stats ||= newStats();
  game.tasks = { index: 0, done: [], baseline: taskBaseline() };
  log("Aufgaben gestartet: " + TASKS[0].title + ".");
  renderTaskUi(true);
}

function stopTasks() {
  game.tasks = null;
  log("Aufgaben beendet, freies Bauen.");
  renderTaskUi(true);
}

function advanceTask(completed) {
  const task = currentTask();
  if (!task) return;
  if (completed) {
    earn(task.reward);
    game.tasks.done.push(task.id);
    log(`Aufgabe erfuellt: ${task.title}. Praemie ${money(task.reward)}.`);
    flash(`Aufgabe erfuellt: ${task.title} (+${money(task.reward)})`);
  } else log(`Aufgabe uebersprungen: ${task.title}.`);
  game.tasks.index += 1;
  game.tasks.baseline = taskBaseline();
  if (!currentTask()) log("Alle Aufgaben abgeschlossen. Weiter im freien Spiel.");
  renderTaskUi(true);
}

// Called from updateUi; checks completion at most twice a second.
function updateTasks(force = false) {
  const now = performance.now();
  if (!force && now - taskUi.lastUpdate < 500) return;
  taskUi.lastUpdate = now;
  const progress = taskProgress();
  if (progress && progress.value >= progress.target) advanceTask(true);
  else renderTaskUi();
}

function renderTaskUi(force = false) {
  const card = document.getElementById("taskCard");
  if (!card) return;
  const task = currentTask(), progress = taskProgress(task);
  card.hidden = !task;
  if (task) {
    const value = progress.target >= 10000 ? money(progress.value) : String(Math.floor(progress.value));
    const target = progress.target >= 10000 ? money(progress.target) : String(progress.target);
    setText(document.getElementById("taskCardTitle"), `${game.tasks.index + 1}/${TASKS.length} ${task.title}`);
    setText(document.getElementById("taskCardValue"), `${value} / ${target}`);
    document.getElementById("taskCardProgress").value = progress.value / progress.target;
  }
  if (force || document.getElementById("taskDialog").open) renderTaskDialog();
}

function renderTaskDialog() {
  const active = Boolean(game.tasks), index = game.tasks?.index ?? -1;
  document.getElementById("taskIntro").hidden = active;
  document.getElementById("startTasks").hidden = active;
  document.getElementById("skipTask").hidden = !currentTask();
  document.getElementById("stopTasks").hidden = !active;
  document.getElementById("taskList").replaceChildren(...TASKS.map((task, i) => {
    const item = document.createElement("li"), title = document.createElement("strong"), text = document.createElement("span");
    const state = !active ? "open" : game.tasks.done.includes(task.id) ? "done" : i < index ? "skipped" : i === index ? "current" : "locked";
    item.className = "task-item " + state;
    title.textContent = task.title + (state === "done" ? " - erfuellt" : state === "skipped" ? " - uebersprungen" : "");
    text.textContent = `${task.text} Praemie ${money(task.reward)}.`;
    item.append(title, text);
    if (state === "current") {
      const progress = taskProgress(task), bar = document.createElement("progress");
      bar.max = progress.target; bar.value = progress.value; item.append(bar);
    }
    const link = document.createElement("a");
    link.href = "help.html#" + task.help; link.target = "_blank"; link.rel = "noopener"; link.textContent = "Hilfe";
    item.append(link);
    return item;
  }));
}

function initTasks() {
  const dialog = document.getElementById("taskDialog");
  document.getElementById("taskButton").addEventListener("click", () => { renderTaskDialog(); dialog.showModal(); });
  document.getElementById("taskCard").addEventListener("click", () => { renderTaskDialog(); dialog.showModal(); });
  document.getElementById("closeTasks").addEventListener("click", () => dialog.close());
  document.getElementById("startTasks").addEventListener("click", () => { startTasks(); dialog.close(); });
  document.getElementById("skipTask").addEventListener("click", () => advanceTask(false));
  document.getElementById("stopTasks").addEventListener("click", () => { stopTasks(); dialog.close(); });
  renderTaskUi(true);
}

initTasks();
