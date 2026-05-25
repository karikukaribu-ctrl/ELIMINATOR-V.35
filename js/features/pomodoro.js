/* =========================================================
   POMODORO

   AMÉLIORATION : l'ancien timer décrémentait remainingMs de 250ms à
   chaque tick d'interval. Or setInterval dérive (et est ralenti dans
   les onglets en arrière-plan), donc le minuteur devenait faux.
   On calcule désormais le temps restant à partir d'un timestamp de
   fin (Date.now()), ce qui reste exact même si les ticks dérivent.
========================================================= */

import { getState, save } from "../core/store.js";
import { clamp, fmtMMSS } from "../core/utils.js";
import { $ } from "../core/dom.js";
import { status } from "../ui/status.js";

let pomoTimer = null;
let pomoRunning = false;
let endAt = 0; // timestamp de fin de la phase courante
let remainingMs = 0; // mémorisé quand on met en pause

function currentPhaseMinutes() {
  const p = getState().pomodoro;
  return p.phase === "break" ? p.breakMin : p.workMin;
}

export function renderPomodoro() {
  const el = $("pomoTime");
  if (!el) return;
  const ms = pomoRunning ? Math.max(0, endAt - Date.now()) : remainingMs;
  el.textContent = fmtMMSS(ms);
  el.classList.toggle("is-running", pomoRunning);
}

export function resetPhase() {
  remainingMs = clamp(currentPhaseMinutes(), 1, 120) * 60 * 1000;
  renderPomodoro();
}

export function pausePomo() {
  if (pomoRunning) remainingMs = Math.max(0, endAt - Date.now());
  pomoRunning = false;
  if (pomoTimer) clearInterval(pomoTimer);
  pomoTimer = null;
  renderPomodoro();
}

export function playPomo() {
  if (pomoRunning) return;
  if (!remainingMs) resetPhase();

  pomoRunning = true;
  endAt = Date.now() + remainingMs;
  renderPomodoro();

  pomoTimer = setInterval(() => {
    if (Date.now() >= endAt) {
      pausePomo();
      remainingMs = 0;

      const state = getState();
      state.pomodoro.phase = state.pomodoro.phase === "work" ? "break" : "work";
      save();

      status(`⏰ ${state.pomodoro.phase === "work" ? "Pomodoro" : "Pause"} prêt.`);
      resetPhase();
      if (state.pomodoro.autoStart === "auto") playPomo();
      return;
    }
    renderPomodoro();
  }, 250);
}

export function togglePomo() {
  pomoRunning ? pausePomo() : playPomo();
}

export function applyPomoSettings({ workMin, breakMin, autoStart }) {
  const p = getState().pomodoro;
  p.workMin = clamp(parseInt(workMin, 10) || 25, 5, 90);
  p.breakMin = clamp(parseInt(breakMin, 10) || 5, 1, 30);
  p.autoStart = autoStart || "auto";
  save();
  resetPhase();
}
