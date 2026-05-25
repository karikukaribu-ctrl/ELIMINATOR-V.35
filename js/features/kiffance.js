/* =========================================================
   KIFFANCE
   Les suggestions restent des "surprises" (pas de catalogue exposé).
========================================================= */

import { $ } from "../core/dom.js";
import { getState, save, emit } from "../core/store.js";
import { uid, nowISO, pickRandom } from "../core/utils.js";
import { pushUndo } from "../core/undo.js";
import { ensureCurrentTask } from "./tasks.js";

let lastKiffSuggestion = "";

export function getLastKiffSuggestion() {
  return lastKiffSuggestion;
}

export function pickKiffance() {
  const { kiffances } = getState();
  if (!kiffances.length) return "Bois de l’eau. Respire. Continue.";
  return pickRandom(kiffances);
}

export function suggestKiffance() {
  lastKiffSuggestion = pickKiffance();
  if ($("kiffSuggestionBox")) $("kiffSuggestionBox").textContent = lastKiffSuggestion;
  if ($("overlayKiffSuggestion")) $("overlayKiffSuggestion").textContent = lastKiffSuggestion;
}

export function addKiffance(text) {
  const value = String(text || "").trim();
  if (!value) return;
  getState().kiffances.push(value);
  save();
  suggestKiffance();
}

export function addKiffanceAsTask() {
  const text = String(lastKiffSuggestion || "").trim();
  if (!text) return;

  pushUndo("kifftask");
  const state = getState();
  state.tasks.push({
    id: uid(),
    title: text,
    label: text,
    cat: "KIFFANCE",
    etorionsTotal: 1,
    etorionsLeft: 1,
    initialEtorions: 1,
    pinned: false,
    today: true,
    done: false,
    createdAt: nowISO(),
    doneAt: null,
  });
  state.baseline.totalTasks += 1;
  state.baseline.totalEtorions += 1;

  ensureCurrentTask();
  save();
  emit("tasks", "hub");
}
