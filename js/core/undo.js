/* =========================================================
   UNDO  (corrigé)

   BUG D'ORIGINE : la pile undo vivait DANS state (state.undo), et
   chaque pushUndo() faisait safeClone(state) — donc clonait aussi
   la pile undo elle-même. Avec 25 snapshots, chaque nouveau snapshot
   contenait les précédents : croissance ~exponentielle du localStorage
   jusqu'au QuotaExceededError, et lenteurs.

   CORRECTION : la pile vit ICI, en dehors de l'état. Les snapshots
   clonent l'état SANS aucune référence à l'historique undo.
   Elle n'est pas persistée (un undo ne survit pas à un rechargement,
   ce qui est le comportement attendu et garde le storage léger).
========================================================= */

import { getState, replaceState } from "./store.js";
import { safeClone } from "./utils.js";

const MAX_UNDO = 25;
const stack = []; // [{ label, at, payload }]

/** Capture l'état courant avant une mutation destructrice. */
export function pushUndo(label) {
  stack.unshift({
    label,
    at: Date.now(),
    payload: safeClone(getState()), // état "propre", sans pile undo
  });
  if (stack.length > MAX_UNDO) stack.length = MAX_UNDO;
}

/** Restaure le dernier snapshot. Renvoie true si quelque chose a été annulé. */
export function doUndo() {
  const snapshot = stack.shift();
  if (!snapshot) return false;
  replaceState(snapshot.payload);
  return true;
}

export function canUndo() {
  return stack.length > 0;
}

export function clearUndo() {
  stack.length = 0;
}
