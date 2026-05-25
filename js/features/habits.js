/* =========================================================
   HABITUDES
========================================================= */

import { getState, save, emit } from "../core/store.js";
import { clamp, uid, nowISO } from "../core/utils.js";
import { snapshotDay } from "./stats.js";

export function habitProgress(habit) {
  const done = habit.checks.filter(Boolean).length;
  const total = habit.checks.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function addHabit(name, slots) {
  const nm = String(name || "").trim();
  if (!nm) return;
  const sl = clamp(parseInt(slots, 10) || 8, 3, 12);

  getState().habits.push({
    id: uid(),
    name: nm,
    slots: sl,
    checks: Array.from({ length: sl }, () => false),
    createdAt: nowISO(),
  });
  snapshotDay();
  save();
  emit("habits", "history");
}

export function toggleHabitCheck(habitId, index) {
  const habit = getState().habits.find((h) => h.id === habitId);
  if (!habit) return;
  habit.checks[index] = !habit.checks[index];
  snapshotDay();
  save();
  emit("habits", "history");
}

export function resetHabit(habitId) {
  const habit = getState().habits.find((h) => h.id === habitId);
  if (!habit) return;
  habit.checks = habit.checks.map(() => false);
  snapshotDay();
  save();
  emit("habits", "history");
}

export function deleteHabit(habitId) {
  const state = getState();
  state.habits = state.habits.filter((h) => h.id !== habitId);
  snapshotDay();
  save();
  emit("habits", "history");
}
