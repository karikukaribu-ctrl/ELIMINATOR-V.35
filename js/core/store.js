/* =========================================================
   STORE CENTRAL
   - Détient l'état de l'application (source de vérité unique).
   - Expose un mini système d'événements (pub/sub) pour que chaque
     module de rendu ne se redessine QUE lorsque sa donnée change,
     au lieu d'un renderAll() global après chaque action.
========================================================= */

import { STORAGE_KEY } from "./constants.js";
import { defaultState, migrateState } from "./state.js";
import { safeClone } from "./utils.js";

/* ---- État ---- */
let _state = loadState();

export function getState() {
  return _state;
}

/** Remplace tout l'état (utilisé par l'undo) puis notifie tout le monde. */
export function replaceState(next) {
  _state = migrateState(next);
  save();
  emit("*");
}

/* ---- Persistance ---- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return safeClone(defaultState);
    return migrateState(JSON.parse(raw));
  } catch (_) {
    return safeClone(defaultState);
  }
}

let saveTimer = null;

/**
 * Sauvegarde dans le localStorage.
 * Par défaut "débouncée" (regroupée) pour éviter d'écrire 4 fois
 * lors d'une seule action utilisateur. Passer { immediate:true }
 * pour forcer une écriture synchrone (ex: avant fermeture).
 */
export function save({ immediate = false } = {}) {
  if (immediate) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    writeNow();
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 150);
}

function writeNow() {
  saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (err) {
    // QuotaExceededError typiquement : on prévient sans planter l'app.
    console.warn("Sauvegarde impossible :", err);
  }
}

/* ---- Pub / Sub ----
   Les modules s'abonnent à des "topics" (ex: "tasks", "stats", "theme").
   Quand une mutation a lieu, on appelle emit(topic) et seuls les
   abonnés concernés se re-rendent. "*" = tout redessiner (undo/reset). */
const listeners = new Map(); // topic -> Set<fn>

export function on(topic, fn) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic).add(fn);
  return () => listeners.get(topic)?.delete(fn); // fonction de désabonnement
}

export function emit(...topics) {
  const wildcard = topics.includes("*");
  const set = new Set();

  for (const [topic, fns] of listeners) {
    if (wildcard || topics.includes(topic)) {
      fns.forEach((fn) => set.add(fn));
    }
  }
  // Dédup : un même listener abonné à plusieurs topics émis ne tourne qu'une fois.
  set.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("Erreur dans un listener :", err);
    }
  });
}

/**
 * Helper pratique : mute l'état via une fonction, sauvegarde, puis émet.
 *   commit((s) => { s.tasks.push(...) }, "tasks", "stats");
 */
export function commit(mutator, ...topics) {
  mutator(_state);
  save();
  if (topics.length) emit(...topics);
}
