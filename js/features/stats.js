/* =========================================================
   HISTORIQUE & STATS
   CORRECTION : statsSeries() et le calendrier faisaient
   state.history.find() dans une boucle (O(jours × historique)).
   On indexe désormais l'historique par jour dans une Map (O(jours)).
========================================================= */

import { getState } from "../core/store.js";
import { dayKey } from "../core/utils.js";
import { activeTasks } from "./tasks.js";
import { habitProgress } from "./habits.js";
import { summarizeSetsToday } from "./sets.js";

/** Map jour -> entrée d'historique, pour des lookups O(1). */
function historyIndex() {
  const map = new Map();
  for (const entry of getState().history) map.set(entry.day, entry);
  return map;
}

/**
 * Met à jour l'entrée d'historique du jour courant.
 * NE sauvegarde plus lui-même : l'appelant décide quand persister
 * (évite les sauvegardes en cascade lors d'une complétion de tâche).
 */
export function snapshotDay() {
  const state = getState();
  const dk = dayKey();

  const doneToday = state.tasks.filter(
    (t) => t.done && t.doneAt && t.doneAt.slice(0, 10) === dk
  );
  const active = activeTasks();
  const habitsSummary = state.habits.map((h) => {
    const p = habitProgress(h);
    return { name: h.name, done: p.done, total: p.total };
  });

  const entry = {
    day: dk,
    doneTitles: doneToday.map((t) => t.title),
    remainingTitles: active.map((t) => t.title),
    doneTasks: doneToday.length,
    remainingTasks: active.length,
    doneEtorions: state.stats.etorionsDone,
    baselineEtorions: state.baseline.totalEtorions,
    habits: habitsSummary,
    sets: summarizeSetsToday(),
  };

  const index = state.history.findIndex((h) => h.day === dk);
  if (index >= 0) state.history[index] = entry;
  else state.history.unshift(entry);
}

export function statsSeries(days = getState().settings.statsRangeDays || 30) {
  const idx = historyIndex();
  const today = new Date();
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    const h = idx.get(key);
    rows.push({ day: key, tasks: h?.doneTasks || 0, etorions: h?.doneEtorions || 0 });
  }
  return rows;
}

export function calendarSeries(days = 30) {
  const idx = historyIndex();
  const today = new Date();
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    rows.push({ day: key, value: idx.get(key)?.doneTasks || 0 });
  }
  return rows;
}

export function exportTodayText() {
  snapshotDay();
  const dk = dayKey();
  const entry = getState().history.find((h) => h.day === dk);
  if (!entry) return "Aucune donnée.";

  const lines = [];
  lines.push(`ELIMINATOR — RAPPORT JOURNALIER — ${dk}`, "");
  lines.push(`TÂCHES FAITES (${entry.doneTasks})`);
  entry.doneTitles.length
    ? entry.doneTitles.forEach((t) => lines.push(`- ${t}`))
    : lines.push("—");
  lines.push("", `TÂCHES RESTANTES (${entry.remainingTasks})`);
  entry.remainingTitles.length
    ? entry.remainingTitles.forEach((t) => lines.push(`- ${t}`))
    : lines.push("—");
  lines.push("", "HABITUDES");
  entry.habits.length
    ? entry.habits.forEach((h) => lines.push(`- ${h.name}: ${h.done}/${h.total}`))
    : lines.push("—");
  lines.push("", "SETS");
  const hs = entry.sets?.hospital || { done: 0, total: 0 };
  const cs = entry.sets?.consult || { done: 0, total: 0 };
  lines.push(`- HOSPITALIER: ${hs.done}/${hs.total}`, `- CONSULTATION: ${cs.done}/${cs.total}`);
  lines.push("", "STATS");
  lines.push(`- ÉTORIONS DÉGOMMÉS: ${entry.doneEtorions}`, `- BASE ÉTORIONS: ${entry.baselineEtorions}`);
  return lines.join("\n");
}
