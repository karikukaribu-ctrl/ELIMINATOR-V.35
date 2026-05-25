/* =========================================================
   INBOX : parsing du texte, import en tâches, historique des listes
========================================================= */

import { getState, save, emit } from "../core/store.js";
import { pushUndo } from "../core/undo.js";
import { clamp, uid, nowISO } from "../core/utils.js";
import { ensureCurrentTask } from "./tasks.js";

/** Une ligne tout en majuscules (avec des lettres) = catégorie. */
export function isAllCapsLine(line) {
  const t = String(line || "").trim();
  if (!t) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(t)) return false;
  return t === t.toUpperCase() && t.length <= 90;
}

/** Parse "Titre - 3" ou "Titre 3" -> { title, etorions }. */
export function parseTaskLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/^[-*•\s]+/, "").trim();
  if (!cleaned) return null;

  let title = cleaned;
  let etorions = null;

  const match = cleaned.match(/^(.*?)(?:\s*[-–—]\s*|\s+)(\d+)\s*$/);
  if (match) {
    title = match[1].trim();
    etorions = parseInt(match[2], 10);
  }

  title = title.replace(/\s+/g, " ").trim();
  if (!title) return null;
  if (etorions !== null) etorions = clamp(etorions, 1, 99);
  return { title, etorions };
}

/** Estime le nombre d'étorions d'après l'historique des tâches du même nom. */
export function estimateEtorions(label) {
  const target = String(label || "").trim().toLowerCase();
  const matches = getState().stats.taskHistory.filter(
    (e) => String(e.label || "").trim().toLowerCase() === target
  );
  if (matches.length === 0) return 3;
  const avg = matches.reduce((s, e) => s + (e.etorionsUsed || 0), 0) / matches.length;
  return clamp(Math.round(avg) || 3, 1, 12);
}

function archiveInboxList(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  const { inbox } = getState();
  inbox.history.unshift({ id: uid(), at: nowISO(), text: clean });
  inbox.history = inbox.history.slice(0, 120);
}

/** Importe le texte de l'inbox en tâches. Renvoie le nombre importé. */
export function importFromInbox(text) {
  const rawText = String(text || "");
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let cat = "Inbox";
  const imported = [];

  for (const line of lines) {
    if (isAllCapsLine(line)) {
      cat = line.trim();
      continue;
    }
    const parsed = parseTaskLine(line);
    if (!parsed) continue;

    const eto = parsed.etorions ?? estimateEtorions(parsed.title);
    imported.push({
      id: uid(),
      title: parsed.title,
      label: parsed.title,
      cat,
      etorionsTotal: eto,
      etorionsLeft: eto,
      initialEtorions: eto,
      pinned: false,
      today: false,
      done: false,
      createdAt: nowISO(),
      doneAt: null,
    });
  }

  if (imported.length === 0) return 0;

  archiveInboxList(rawText);
  pushUndo("import");

  const state = getState();
  state.tasks.push(...imported);

  const totalTasks = imported.length;
  const totalEtorions = imported.reduce((s, t) => s + t.etorionsTotal, 0);

  if (state.baseline.totalTasks === 0 && state.baseline.totalEtorions === 0) {
    state.baseline.totalTasks = totalTasks;
    state.baseline.totalEtorions = totalEtorions;
  } else {
    state.baseline.totalTasks += totalTasks;
    state.baseline.totalEtorions += totalEtorions;
  }

  ensureCurrentTask();
  save();
  emit("tasks", "hub", "inbox", "stats");
  return imported.length;
}

export function saveInboxDraft(value) {
  getState().inbox.draft = String(value || "");
  save();
}

export function restoreInboxHistoryItem(id) {
  const item = getState().inbox.history.find((e) => e.id === id);
  if (!item) return null;
  getState().inbox.draft = item.text;
  save();
  emit("inbox");
  return item.text;
}

export function deleteInboxHistoryItem(id) {
  const state = getState();
  state.inbox.history = state.inbox.history.filter((e) => e.id !== id);
  save();
  emit("inbox");
}
