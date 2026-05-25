/* =========================================================
   MOTEUR DE TÂCHES
   Sélection courante, roulette, étorions, complétion, tri, filtres.
   Toutes les mutations passent par le store (save + emit ciblé).
========================================================= */

import { getState, save, emit, commit } from "../core/store.js";
import { pushUndo } from "../core/undo.js";
import { clamp, nowISO } from "../core/utils.js";
import { status } from "../ui/status.js";
import { snapshotDay } from "./stats.js";
import { maybeShowCelebration } from "./celebrations.js";
import { maybeShowTip } from "./tips.js";

/* ---- Lecture ---- */

export function getTask(id) {
  return getState().tasks.find((t) => t.id === id) || null;
}

export function activeTasks() {
  const { tasks, settings } = getState();
  const included = settings.includedCats;
  let base = tasks.filter((t) => !t.done);

  if (included && included.length > 0) {
    base = base.filter((t) => {
      if (included.includes("CE JOUR") && t.today) return true;
      return included.includes(t.cat);
    });
  }
  return base;
}

export function doneTasks() {
  return getState().tasks.filter((t) => t.done);
}

export function sortTasks(list) {
  const mode = getState().settings.listSort || "roulette";
  const todayScore = (t) => (t.today ? -1 : 0);
  const pinScore = (t) => (t.pinned ? -1 : 0);

  const byFlags = (a, b) => {
    const t = todayScore(a) - todayScore(b);
    if (t !== 0) return t;
    return pinScore(a) - pinScore(b);
  };

  const sorted = [...list];

  if (mode === "alpha") {
    sorted.sort((a, b) => byFlags(a, b) || a.title.localeCompare(b.title, "fr"));
  } else if (mode === "cat") {
    sorted.sort(
      (a, b) =>
        byFlags(a, b) ||
        a.cat.localeCompare(b.cat, "fr") ||
        a.title.localeCompare(b.title, "fr")
    );
  } else {
    // "ordre", "roulette" et défaut : ordre d'import.
    sorted.sort((a, b) => byFlags(a, b) || (a.createdAt || "").localeCompare(b.createdAt || ""));
  }
  return sorted;
}

export function categories() {
  const set = new Set(getState().tasks.map((t) => t.cat || "Inbox"));
  const out = Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  out.unshift("CE JOUR");
  out.unshift("Toutes");
  return out;
}

/* ---- Progression / scores ---- */

export function computeProgress() {
  const { baseline } = getState();
  const baseTasks = baseline.totalTasks || 0;
  const baseEtorions = baseline.totalEtorions || 0;

  const remaining = activeTasks();
  const remT = remaining.length;
  const remE = remaining.reduce((sum, t) => sum + (t.etorionsLeft || 0), 0);
  const pct = baseTasks <= 0 ? 100 : clamp(Math.round((remT / baseTasks) * 100), 0, 100);

  return { baseTasks, baseEtorions, remT, remE, pct };
}

export function dopamineScore() {
  const tasks = activeTasks();
  if (tasks.length === 0) return 100;
  const totalLoad = tasks.reduce(
    (sum, t) => sum + (t.etorionsLeft || t.etorionsTotal || 1),
    0
  );
  const avgLoad = totalLoad / tasks.length;
  return Math.round(Math.max(0, 100 - avgLoad * 10));
}

/* ---- Sélection courante ---- */

export function ensureCurrentTask() {
  const state = getState();
  const current = getTask(state.currentTaskId);
  const actives = activeTasks();

  if (actives.length === 0) {
    state.currentTaskId = null;
    state.currentTaskStart = null;
    return;
  }
  if (!current || current.done) {
    const today = actives.find((t) => t.today);
    const pinned = actives.find((t) => t.pinned);
    state.currentTaskId = (today || pinned || actives[0]).id;
    state.currentTaskStart = Date.now();
  }
}

export function selectTask(id) {
  const task = getTask(id);
  if (!task || task.done) return;
  commit(
    (s) => {
      s.currentTaskId = id;
      s.currentTaskStart = Date.now();
    },
    "hub",
    "tasks"
  );
}

export function roulettePick() {
  const tasks = activeTasks();
  if (tasks.length === 0) return null;

  const today = tasks.filter((t) => t.today);
  const pinned = tasks.filter((t) => t.pinned);
  const pool = today.length ? today : pinned.length ? pinned : [...tasks];

  pool.sort(
    (a, b) => (a.etorionsLeft || a.etorionsTotal) - (b.etorionsLeft || b.etorionsTotal)
  );
  const sample = pool.slice(0, Math.min(4, pool.length));
  return sample[Math.floor(Math.random() * sample.length)];
}

export function spinRoulette() {
  const pick = roulettePick();
  if (!pick) {
    status("Rien à tirer.");
    return null;
  }
  commit(
    (s) => {
      s.currentTaskId = pick.id;
      s.currentTaskStart = Date.now();
    },
    "hub",
    "tasks"
  );
  maybeShowTip();
  return pick;
}

/* ---- Mutations ---- */

export function toggleTodayTask(id) {
  const task = getTask(id);
  if (!task || task.done) return;
  commit(() => {
    task.today = !task.today;
  }, "hub", "tasks");
}

export function togglePinTask(id) {
  const task = getTask(id);
  if (!task) return;
  commit(() => {
    task.pinned = !task.pinned;
  }, "hub", "tasks");
}

export function moveTask(id, delta) {
  const state = getState();
  const index = state.tasks.findIndex((t) => t.id === id);
  if (index < 0) return;
  const target = clamp(index + delta, 0, state.tasks.length - 1);
  const [item] = state.tasks.splice(index, 1);
  state.tasks.splice(target, 0, item);
  save();
  emit("tasks", "hub");
}

export function editTask(id, nextTitle) {
  const task = getTask(id);
  if (!task) return;
  const value = String(nextTitle || "").trim();
  if (!value) return;
  commit(() => {
    task.title = value;
    task.label = value;
  }, "hub", "tasks");
}

export function deleteTask(id) {
  const task = getTask(id);
  if (!task) return;

  pushUndo("delete");
  const state = getState();
  state.tasks = state.tasks.filter((t) => t.id !== id);

  if (!task.done) {
    state.baseline.totalTasks = Math.max(0, state.baseline.totalTasks - 1);
    state.baseline.totalEtorions = Math.max(
      0,
      state.baseline.totalEtorions - (task.etorionsTotal || 0)
    );
  }
  if (state.currentTaskId === id) {
    state.currentTaskId = null;
    state.currentTaskStart = null;
  }
  ensureCurrentTask();
  save();
  emit("tasks", "hub", "stats");
}

export function completeTask(id = getState().currentTaskId) {
  const task = getTask(id);
  if (!task || task.done) return;

  pushUndo("complete");
  const state = getState();
  task.done = true;
  task.doneAt = nowISO();

  state.stats.tasksCompleted += 1;
  state.stats.taskHistory.push({
    label: task.title,
    etorionsUsed: task.initialEtorions || task.etorionsTotal || 1,
    date: task.doneAt,
  });

  snapshotDay(); // met à jour state.history (sans save interne désormais)
  ensureCurrentTask();
  save();
  emit("tasks", "hub", "stats", "history");
  maybeShowCelebration();
  status("Tâche terminée. Une menace de moins.");
}

export function restoreTask(id) {
  const task = getTask(id);
  if (!task || !task.done) return;
  pushUndo("restore");
  task.done = false;
  task.doneAt = null;
  ensureCurrentTask();
  save();
  emit("tasks", "hub", "stats");
}

export function degommeEtorion() {
  const state = getState();
  const task = getTask(state.currentTaskId);
  if (!task || task.done) {
    status("Aucune tâche à traiter.");
    return;
  }

  pushUndo("degomme");
  task.etorionsLeft = clamp((task.etorionsLeft || 1) - 1, 0, 99);
  state.stats.etorionsDone += 1;

  if (task.etorionsLeft <= 0) {
    save();
    completeTask(task.id);
    status("Étorions à zéro. Tâche neutralisée.");
    return;
  }

  save();
  emit("hub", "tasks", "stats");
  maybeShowTip();
  status("💣 Un étorion de moins.");
}
