/* =========================================================
   PRÉFÉRENCES & FLOW
========================================================= */

import { $ } from "../core/dom.js";
import { getState, save, emit } from "../core/store.js";
import { clamp } from "../core/utils.js";
import { applyTheme } from "./theme.js";
import { resetPhase } from "../features/pomodoro.js";
import { status } from "./status.js";

export function syncPrefsUI() {
  const s = getState();
  if ($("modeSel")) $("modeSel").value = s.ui.mode;
  if ($("seasonSel")) $("seasonSel").value = s.ui.season;
  if ($("fontSel")) $("fontSel").value = s.ui.font;
  if ($("uiScale")) $("uiScale").value = s.ui.baseSize;
  if ($("seriousSel")) $("seriousSel").value = s.ui.serious ? "on" : "off";
  if ($("keepListFocusSel")) $("keepListFocusSel").value = String(!!s.settings.keepListInFocus);
  if ($("fatigueSel")) $("fatigueSel").value = s.settings.fatigue;
  if ($("motivationSel")) $("motivationSel").value = s.settings.motivation;
  if ($("workMinSel")) $("workMinSel").value = s.pomodoro.workMin;
  if ($("breakMinSel")) $("breakMinSel").value = s.pomodoro.breakMin;
}

export function syncFlowPanel() {
  const s = getState();
  if ($("fatigueInline")) $("fatigueInline").value = s.settings.fatigue;
  if ($("motivationInline")) $("motivationInline").value = s.settings.motivation;
  if ($("celeChanceInline")) $("celeChanceInline").value = s.settings.celebrationChance;
  if ($("tipsChanceInline")) $("tipsChanceInline").value = s.settings.tipsChance;
}

export function applyPrefsFromPanel() {
  const s = getState();
  s.ui.mode = $("modeSel")?.value || s.ui.mode;
  s.ui.season = $("seasonSel")?.value || s.ui.season;
  s.ui.font = $("fontSel")?.value || s.ui.font;
  s.ui.baseSize = clamp(parseInt($("uiScale")?.value, 10) || s.ui.baseSize, 14, 18);
  s.ui.serious = ($("seriousSel")?.value || "off") === "on";

  s.settings.keepListInFocus = ($("keepListFocusSel")?.value || "true") === "true";
  s.settings.fatigue = clamp(parseInt($("fatigueSel")?.value, 10) || s.settings.fatigue, 0, 4);
  s.settings.motivation = clamp(parseInt($("motivationSel")?.value, 10) || s.settings.motivation, 0, 4);

  s.pomodoro.workMin = clamp(parseInt($("workMinSel")?.value, 10) || s.pomodoro.workMin, 5, 90);
  s.pomodoro.breakMin = clamp(parseInt($("breakMinSel")?.value, 10) || s.pomodoro.breakMin, 1, 30);

  save();
  applyTheme();
  resetPhase();
  emit("hub", "stats");
  status("Préférences appliquées.");
}

export function resetPrefs() {
  const s = getState();
  s.ui.mode = "clair";
  s.ui.season = "automne";
  s.ui.font = "yusei";
  s.ui.baseSize = 16;
  s.ui.serious = false;
  s.settings.keepListInFocus = true;
  s.settings.fatigue = 2;
  s.settings.motivation = 2;
  s.pomodoro.workMin = 25;
  s.pomodoro.breakMin = 5;
  s.ui.leftPanelWidth = 380;
  s.ui.rightPanelWidth = 430;

  save();
  syncPrefsUI();
  applyTheme();
  resetPhase();
  emit("hub", "stats");
}

export function saveFlow() {
  const s = getState();
  s.settings.fatigue = clamp(parseInt($("fatigueInline")?.value, 10) || s.settings.fatigue, 0, 4);
  s.settings.motivation = clamp(parseInt($("motivationInline")?.value, 10) || s.settings.motivation, 0, 4);
  s.settings.celebrationChance = clamp(Number($("celeChanceInline")?.value) || s.settings.celebrationChance, 0, 1);
  s.settings.tipsChance = clamp(Number($("tipsChanceInline")?.value) || s.settings.tipsChance, 0, 1);
  save();
  emit("hub", "stats");
  status("Flow sauvé.");
}
