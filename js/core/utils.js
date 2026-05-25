/* =========================================================
   UTILITAIRES PURS
   Fonctions sans effet de bord, sans dépendance au DOM ni au state.
========================================================= */

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);

export const nowISO = () => new Date().toISOString();

export const pad2 = (n) => String(n).padStart(2, "0");

/** Formate une durée en millisecondes vers "MM:SS". */
export function fmtMMSS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/** Clé de jour locale au format "YYYY-MM-DD". */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Échappe les caractères HTML dangereux. */
export function escapeHTML(text) {
  return String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]
  );
}

/** Tire un élément au hasard dans un tableau (ou "" si vide). */
export function pickRandom(arr) {
  return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : "";
}

/** Clone profond, avec repli si structuredClone indisponible. */
export function safeClone(obj) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(obj);
    } catch (_) {
      /* repli ci-dessous */
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

/** Fusion profonde récursive (objets uniquement, pas les tableaux). */
export function deepAssign(target, source) {
  for (const key in source) {
    const val = source[key];
    if (val && typeof val === "object" && !Array.isArray(val) && target[key]) {
      deepAssign(target[key], val);
    } else {
      target[key] = val;
    }
  }
  return target;
}
