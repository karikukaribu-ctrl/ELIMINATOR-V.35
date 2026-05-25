/* =========================================================
   THÈME, MODES & VARIABLES CSS
========================================================= */

import { $ } from "../core/dom.js";
import { getState } from "../core/store.js";
import { clamp } from "../core/utils.js";
import { seasonLabel } from "../core/constants.js";

const THEME_CLASSES = [
  "theme--printemps",
  "theme--ete",
  "theme--automne",
  "theme--hiver",
  "theme--noirblanc",
  "mode--clair",
  "mode--sombre",
];

export function setRootCssVars() {
  const { ui } = getState();
  const root = document.documentElement.style;
  root.setProperty("--baseSize", `${clamp(ui.baseSize, 14, 18)}px`);
  root.setProperty("--panelLeft", `${clamp(ui.leftPanelWidth || 380, 300, 720)}px`);
  root.setProperty("--panelRight", `${clamp(ui.rightPanelWidth || 430, 320, 840)}px`);
}

export function applyTheme() {
  const { ui } = getState();
  const body = document.body;

  body.classList.remove(...THEME_CLASSES);
  body.classList.add(`theme--${ui.season}`, `mode--${ui.mode}`);
  body.classList.toggle("is-serious", !!ui.serious);
  body.classList.toggle("is-focus", !!ui.focus);
  body.setAttribute("data-font", ui.font);

  setRootCssVars();

  const modeBtn = $("modeToggle");
  if (modeBtn) {
    modeBtn.textContent = ui.mode === "sombre" ? "Sombre" : "Clair";
    modeBtn.setAttribute("aria-pressed", ui.mode === "sombre" ? "true" : "false");
  }

  if ($("seasonCycle")) $("seasonCycle").textContent = seasonLabel(ui.season);

  const seriousBtn = $("seriousToggle");
  if (seriousBtn) {
    seriousBtn.textContent = ui.serious ? "Sérieux ON" : "Sérieux";
    seriousBtn.setAttribute("aria-pressed", ui.serious ? "true" : "false");
  }

  const focusBtn = $("focusBtn");
  if (focusBtn) {
    focusBtn.textContent = ui.focus ? "Focus ON" : "Focus";
    focusBtn.setAttribute("aria-pressed", ui.focus ? "true" : "false");
  }

  if ($("listToggleBtn")) {
    $("listToggleBtn").setAttribute("aria-pressed", ui.showBelowList ? "true" : "false");
  }
}
