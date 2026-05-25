/* =========================================================
   SETS (hospitalier / consultation)
========================================================= */

import { getState, save, emit } from "../core/store.js";
import { clamp, uid, dayKey } from "../core/utils.js";
import { snapshotDay } from "./stats.js";

const SET_KEYS = ["hospital", "consult"];

export function initSetsChecksForToday() {
  const dk = dayKey();
  const { sets } = getState();
  for (const key of SET_KEYS) {
    const set = sets[key];
    if (!set.checks) set.checks = {};
    if (!set.checks[dk]) set.checks[dk] = {};
  }
}

export function setKeyItem(setName, patientId, itemLabel) {
  return `${setName}|${patientId}|${itemLabel}`;
}

export function toggleSetCheck(setName, patientId, itemLabel) {
  initSetsChecksForToday();
  const dk = dayKey();
  const set = getState().sets[setName];
  const key = setKeyItem(setName, patientId, itemLabel);
  set.checks[dk][key] = !set.checks[dk][key];
  snapshotDay();
  save();
  emit("sets", "history");
}

export function resetSetToday(setName) {
  initSetsChecksForToday();
  getState().sets[setName].checks[dayKey()] = {};
  snapshotDay();
  save();
  emit("sets", "history");
}

export function updateSetPatientCount(setName, nextCount) {
  const count = clamp(parseInt(nextCount, 10) || 1, 1, 30);
  const set = getState().sets[setName];
  const current = set.patients || [];

  while (current.length < count) {
    current.push({ id: uid(), name: `Patient ${current.length + 1}` });
  }
  if (current.length > count) current.length = count;

  set.patients = current;
  save();
  emit("sets");
}

export function renameSetPatient(setName, patientId, nextName) {
  const set = getState().sets[setName];
  const patient = set.patients.find((p) => p.id === patientId);
  if (!patient) return;
  patient.name = String(nextName || "").trim() || "Patient";
  save();
}

export function summarizeSetsToday() {
  initSetsChecksForToday();
  const dk = dayKey();
  const { sets } = getState();
  const out = {};
  for (const key of SET_KEYS) {
    const set = sets[key];
    const checks = set.checks?.[dk] || {};
    out[key] = {
      done: Object.values(checks).filter(Boolean).length,
      total: set.patients.length * set.itemsPerPatient.length,
    };
  }
  return out;
}
