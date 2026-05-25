/* =========================================================
   STATUS
   Affiche un message éphémère dans #statusSpot (aria-live).
========================================================= */

import { $ } from "../core/dom.js";

let statusTimer = null;

export function status(message, ms = 4200) {
  const el = $("statusSpot");
  if (!el) return;
  el.textContent = message || "";
  if (statusTimer) clearTimeout(statusTimer);
  if (message) {
    statusTimer = setTimeout(() => {
      el.textContent = "";
    }, ms);
  }
}
