/* =========================================================
   NOTES & TYPHONSE
========================================================= */

import { $ } from "../core/dom.js";
import { getState, save, emit } from "../core/store.js";
import { uid, nowISO } from "../core/utils.js";

let notesSaveTimer = null;

export function addNoteEntry(text) {
  const value = String(text || "").trim();
  if (!value) return;
  const { notes } = getState();
  notes.entries.unshift({ id: uid(), text: value, at: nowISO() });
  notes.entries = notes.entries.slice(0, 120);
  save();
  emit("notes");
}

/** Sauvegarde débouncée des zones de texte (notes / rappels). */
export function scheduleNotesSave() {
  if (notesSaveTimer) clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    const { notes } = getState();
    const text = $("notesArea")?.value ?? $("notesAreaPanel")?.value;
    const rem = $("remindersArea")?.value ?? $("remindersAreaPanel")?.value;
    if (text != null) notes.text = text;
    if (rem != null) notes.reminders = rem;
    save();
  }, 300);
}

/* ---- Typhonse ---- */

export function addTyphonse(label) {
  const value = String(label || "").trim();
  if (!value) return;
  getState().notes.typhonse.push({
    id: uid(),
    label: value,
    done: false,
    createdAt: nowISO(),
  });
  save();
  emit("typhonse");
}

export function toggleTyphonse(id) {
  const item = getState().notes.typhonse.find((e) => e.id === id);
  if (!item) return;
  item.done = !item.done;
  save();
  emit("typhonse");
}

export function deleteTyphonse(id) {
  const state = getState();
  state.notes.typhonse = state.notes.typhonse.filter((e) => e.id !== id);
  save();
  emit("typhonse");
}
