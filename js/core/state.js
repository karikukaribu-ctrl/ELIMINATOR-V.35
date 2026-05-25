/* =========================================================
   ÉTAT PAR DÉFAUT + MIGRATION
   migrateState() rend l'app robuste aux anciens formats sauvegardés
   et garantit que toutes les propriétés attendues existent.
========================================================= */

import { uid, nowISO, safeClone, deepAssign } from "./utils.js";

export const defaultState = {
  ui: {
    mode: "clair",
    season: "automne",
    serious: false,
    focus: false,
    font: "yusei",
    baseSize: 16,
    showBelowList: false,
    leftPanelWidth: 380,
    rightPanelWidth: 430,
  },
  settings: {
    fatigue: 2,
    motivation: 2,
    tipsChance: 0.18,
    celebrationChance: 0.3,
    celebrationAutoCloseSec: 7,
    keepListInFocus: true,
    listSort: "roulette",
    listView: "active",
    includedCats: [],
    statsRangeDays: 30,
  },
  inbox: {
    draft: "",
    keepEditableAfterImport: true,
    history: [],
  },
  baseline: {
    totalTasks: 0,
    totalEtorions: 0,
  },
  tasks: [],
  currentTaskId: null,
  currentTaskStart: null,
  kiffances: [
    "Bois un verre d’eau.",
    "Marche 60 secondes. Puis reviens.",
    "Range 10 objets. Pas 47.",
    "Respire 5 cycles lents.",
    "Étire nuque et épaules 45 secondes.",
    "Regarde au loin 20 secondes. Reviens.",
    "Micro-reset : eau, respiration, retour.",
    "Fenêtre ouverte 30 secondes. Puis reprise nette.",
  ],
  pomodoro: {
    workMin: 25,
    breakMin: 5,
    autoStart: "auto",
    phase: "work",
  },
  notes: {
    entries: [],
    text: "",
    reminders: "",
    typhonse: [],
  },
  habits: [],
  sets: {
    hospital: {
      enabled: true,
      patients: Array.from({ length: 4 }, (_, i) => ({ id: uid(), name: `Patient ${i + 1}` })),
      itemsPerPatient: ["Voir patient", "Note", "Traitement", "Dossier"],
      checks: {},
    },
    consult: {
      enabled: true,
      patients: Array.from({ length: 6 }, (_, i) => ({ id: uid(), name: `Patient ${i + 1}` })),
      itemsPerPatient: ["Voir patient", "Note", "Ordonnance", "Dossier"],
      checks: {},
    },
  },
  history: [],
  stats: {
    tasksCompleted: 0,
    etorionsDone: 0,
    sessions: 0,
    taskHistory: [],
    celebrationsShown: 0,
  },
};

function normalizePatients(setObj, fallbackCount) {
  if (Array.isArray(setObj.patients)) {
    setObj.patients = setObj.patients.map((p, i) => ({
      id: p?.id || uid(),
      name: p?.name || `Patient ${i + 1}`,
    }));
    return;
  }
  const count = typeof setObj.patients === "number" ? setObj.patients : fallbackCount;
  setObj.patients = Array.from({ length: count }, (_, i) => ({
    id: uid(),
    name: `Patient ${i + 1}`,
  }));
}

export function migrateState(loaded) {
  const merged = safeClone(defaultState);
  deepAssign(merged, loaded || {});

  // Ancien format : notes était un tableau d'entrées.
  if (Array.isArray(merged.notes)) {
    merged.notes = { entries: merged.notes, text: "", reminders: "", typhonse: [] };
  }

  if (!merged.inbox || typeof merged.inbox !== "object") {
    merged.inbox = { draft: "", keepEditableAfterImport: true, history: [] };
  }
  if (typeof merged.inbox.draft !== "string") merged.inbox.draft = "";
  if (typeof merged.inbox.keepEditableAfterImport !== "boolean") merged.inbox.keepEditableAfterImport = true;
  if (!Array.isArray(merged.inbox.history)) merged.inbox.history = [];

  if (!Array.isArray(merged.notes.entries)) merged.notes.entries = [];
  if (!Array.isArray(merged.notes.typhonse)) merged.notes.typhonse = [];
  if (!Array.isArray(merged.kiffances)) merged.kiffances = [];
  if (!Array.isArray(merged.habits)) merged.habits = [];
  if (!Array.isArray(merged.history)) merged.history = [];
  if (!Array.isArray(merged.stats.taskHistory)) merged.stats.taskHistory = [];
  if (!Array.isArray(merged.tasks)) merged.tasks = [];

  normalizePatients(merged.sets.hospital, 4);
  normalizePatients(merged.sets.consult, 6);

  merged.tasks.forEach((task) => {
    if (!task.id) task.id = uid();
    if (!task.title && task.label) task.title = task.label;
    if (!task.label && task.title) task.label = task.title;
    if (typeof task.etorionsTotal !== "number") {
      task.etorionsTotal = typeof task.etorions === "number" ? task.etorions : 1;
    }
    if (typeof task.etorionsLeft !== "number") task.etorionsLeft = task.etorionsTotal;
    if (typeof task.initialEtorions !== "number") task.initialEtorions = task.etorionsTotal;
    if (typeof task.done !== "boolean") task.done = false;
    if (typeof task.pinned !== "boolean") task.pinned = false;
    if (typeof task.today !== "boolean") task.today = false;
    if (!task.cat) task.cat = "Inbox";
    if (!task.createdAt) task.createdAt = nowISO();
  });

  return merged;
}
