/* =========================================================
   RENDU
   Chaque section s'abonne à son ou ses topics via store.on(...).
   Les handlers de liste utilisent la DÉLÉGATION (un listener par
   conteneur, posé une seule fois) au lieu de réattacher des .onclick
   à chaque rendu — plus rapide et sans fuite de listeners.
========================================================= */

import { $, delegate } from "../core/dom.js";
import { getState, on } from "../core/store.js";
import { clamp, escapeHTML } from "../core/utils.js";
import { applyTheme } from "./theme.js";
import { status } from "./status.js";

import {
  activeTasks,
  doneTasks,
  sortTasks,
  categories,
  computeProgress,
  dopamineScore,
  ensureCurrentTask,
  getTask,
  selectTask,
  toggleTodayTask,
  togglePinTask,
  moveTask,
  editTask,
  deleteTask,
  completeTask,
  restoreTask,
} from "../features/tasks.js";
import { habitProgress, toggleHabitCheck, resetHabit, deleteHabit } from "../features/habits.js";
import {
  initSetsChecksForToday,
  setKeyItem,
  toggleSetCheck,
  renameSetPatient,
} from "../features/sets.js";
import { toggleTyphonse, deleteTyphonse } from "../features/notes.js";
import { suggestKiffance } from "../features/kiffance.js";
import {
  restoreInboxHistoryItem,
  deleteInboxHistoryItem,
} from "../features/inbox.js";
import { statsSeries, calendarSeries } from "../features/stats.js";
import { dayKey } from "../core/utils.js";

let subtitleLocked = "";

/* ---------- Sous-titre / progression / hub ---------- */

export function setSubtitle(text) {
  subtitleLocked = text;
}

function renderSubtitle() {
  const el = $("subtitle");
  if (el && subtitleLocked) el.textContent = subtitleLocked;
}

function renderProgress() {
  const p = computeProgress();
  if ($("progressFill")) $("progressFill").style.width = `${p.pct}%`;
  if ($("progressPctIn")) $("progressPctIn").textContent = `${p.pct}%`;
  if ($("progressBar")) $("progressBar").setAttribute("aria-valuenow", String(p.pct));
}

function renderHub() {
  ensureCurrentTask();
  const state = getState();
  const act = activeTasks();
  const done = doneTasks();
  const p = computeProgress();

  if ($("statActive")) $("statActive").textContent = String(act.length);
  if ($("statDone")) $("statDone").textContent = String(done.length);
  if ($("statEtorions")) $("statEtorions").textContent = String(p.remE);

  if ($("pillTasks")) $("pillTasks").textContent = `${p.remT}/${p.baseTasks || 0} tâches`;
  if ($("pillEto")) $("pillEto").textContent = `${p.remE}/${p.baseEtorions || 0} étorions`;
  if ($("pillDone")) $("pillDone").textContent = `${done.length} ${done.length > 1 ? "faites" : "faite"}`;

  if ($("pillMode")) {
    const label = state.ui.focus ? "focus" : state.ui.serious ? "sérieux" : "normal";
    $("pillMode").textContent = `mode: ${label}`;
  }
  if ($("pillFlow")) {
    const { fatigue: f, motivation: m } = state.settings;
    const flow = m >= 3 && f <= 2 ? "fort" : m <= 1 && f >= 3 ? "fragile" : "stable";
    $("pillFlow").textContent = `flow: ${flow}`;
  }

  const task = getTask(state.currentTaskId);
  if (!task) {
    if ($("taskTitle")) $("taskTitle").textContent = "Aucune tâche sélectionnée";
    if ($("metaCat")) $("metaCat").textContent = "—";
    if ($("metaEt")) $("metaEt").textContent = "—";
    if ($("metaTimer")) $("metaTimer").textContent = "00:00";
  } else {
    if ($("taskTitle")) $("taskTitle").textContent = task.title;
    if ($("metaCat")) $("metaCat").textContent = task.cat || "Inbox";
    if ($("metaEt")) $("metaEt").textContent = `${task.etorionsLeft}/${task.etorionsTotal}`;
  }
}

export function renderMetaTimer() {
  const state = getState();
  const task = getTask(state.currentTaskId);
  const el = $("metaTimer");
  if (!el) return;
  if (!task || !state.currentTaskStart) {
    el.textContent = "00:00";
    return;
  }
  const ms = Date.now() - state.currentTaskStart;
  const s = Math.max(0, Math.floor(ms / 1000));
  el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* ---------- Liste sous la carte ---------- */

export function applyBelowListVisibility() {
  const list = $("belowList");
  if (!list) return;
  const { ui, settings } = getState();
  const visible = ui.showBelowList && (!ui.focus || settings.keepListInFocus);
  list.hidden = !visible;
  if ($("listToggleBtn")) {
    $("listToggleBtn").setAttribute("aria-pressed", ui.showBelowList ? "true" : "false");
  }
}

function renderBelowList() {
  const root = $("belowTasks");
  if (!root) return;
  const state = getState();
  const list = sortTasks(activeTasks());

  if (list.length === 0) {
    root.innerHTML = `<div class="muted small">Aucune tâche.</div>`;
    return;
  }

  root.innerHTML = list
    .slice(0, 30)
    .map((task) => {
      const isCurrent = task.id === state.currentTaskId;
      const outline = isCurrent
        ? "outline:2px solid color-mix(in srgb, var(--accent) 40%, transparent);"
        : "";
      return `
      <div class="card" style="${outline}">
        <div class="card__left">
          <div class="card__title">${task.today ? "◆ " : ""}${escapeHTML(task.title)}</div>
          <div class="card__sub">${escapeHTML(task.cat)} · ${task.etorionsLeft}/${task.etorionsTotal}</div>
        </div>
        <div class="card__actions">
          <button class="icon-btn" data-below-act="up" data-id="${task.id}" title="Monter">↑</button>
          <button class="icon-btn" data-below-act="down" data-id="${task.id}" title="Descendre">↓</button>
          <button class="icon-btn" data-below-act="today" data-id="${task.id}" title="CE JOUR">${task.today ? "◆" : "◇"}</button>
          <button class="icon-btn" data-below-act="pin" data-id="${task.id}" title="Épingler">${task.pinned ? "■" : "□"}</button>
          <button class="icon-btn" data-below-act="sel" data-id="${task.id}" title="Sélectionner">▶</button>
          <button class="icon-btn" data-below-act="done" data-id="${task.id}" title="Terminer">✓</button>
        </div>
      </div>`;
    })
    .join("");
}

/* ---------- Panneau Tâches ---------- */

function renderCatFilter() {
  const select = $("catFilter");
  if (!select) return;
  const selected = getState().settings.includedCats || [];
  select.innerHTML = categories()
    .map(
      (cat) =>
        `<option value="${escapeHTML(cat)}" ${selected.includes(cat) ? "selected" : ""}>${escapeHTML(cat)}</option>`
    )
    .join("");
}

function renderTasksPanel() {
  renderCatFilter();
  const root = $("taskList");
  if (!root) return;

  const { settings } = getState();
  const view = settings.listView || "active";

  let list = getState().tasks.slice();
  if (view === "active") list = list.filter((t) => !t.done);
  if (view === "done") list = list.filter((t) => t.done);

  const included = settings.includedCats || [];
  if (included.length > 0) {
    list = list.filter((t) => {
      if (included.includes("CE JOUR") && t.today) return true;
      return included.includes(t.cat);
    });
  }
  list = sortTasks(list);

  if (list.length === 0) {
    root.innerHTML = `<div class="muted small">Rien ici.</div>`;
    return;
  }

  const currentId = getState().currentTaskId;
  root.innerHTML = list
    .map(
      (task) => `
    <div class="card">
      <div class="card__left">
        <div class="card__title">${task.today ? "◆ " : ""}${escapeHTML(task.title)}</div>
        <div class="card__sub">${escapeHTML(task.cat)} · ${task.etorionsLeft}/${task.etorionsTotal}${task.done ? " · Finie" : ""}</div>
      </div>
      <div class="card__actions">
        ${!task.done ? `<button class="icon-btn" data-task-act="sel" data-id="${task.id}" title="Sélectionner">${task.id === currentId ? "★" : "▶"}</button>` : ""}
        ${!task.done ? `<button class="icon-btn" data-task-act="today" data-id="${task.id}" title="CE JOUR">${task.today ? "◆" : "◇"}</button>` : ""}
        ${!task.done ? `<button class="icon-btn" data-task-act="done" data-id="${task.id}" title="Terminer">✓</button>` : `<button class="icon-btn" data-task-act="restore" data-id="${task.id}" title="Restaurer">↩</button>`}
        <button class="icon-btn" data-task-act="edit" data-id="${task.id}" title="Éditer">≋</button>
        <button class="icon-btn" data-task-act="del" data-id="${task.id}" title="Supprimer">×</button>
      </div>
    </div>`
    )
    .join("");
}

/* ---------- Inbox ---------- */

function syncInboxUI() {
  const { inbox } = getState();
  if ($("inboxText") && document.activeElement !== $("inboxText")) {
    $("inboxText").value = inbox.draft || "";
  }
  const toggle = $("inboxEditableToggle");
  if (toggle) {
    toggle.textContent = inbox.keepEditableAfterImport
      ? "Édition après validation : ON"
      : "Édition après validation : OFF";
    toggle.setAttribute("aria-pressed", inbox.keepEditableAfterImport ? "true" : "false");
  }
  renderInboxHistory();

  // Mini-stats inbox
  const act = activeTasks();
  const done = doneTasks();
  const remE = act.reduce((s, t) => s + (t.etorionsLeft || 0), 0);
  if ($("statActive")) $("statActive").textContent = String(act.length);
  if ($("statDone")) $("statDone").textContent = String(done.length);
  if ($("statEtorions")) $("statEtorions").textContent = String(remE);
}

function renderInboxHistory() {
  const root = $("inboxHistoryList");
  if (!root) return;
  const list = getState().inbox.history || [];
  if (list.length === 0) {
    root.innerHTML = `<div class="muted small">Aucune liste validée archivée.</div>`;
    return;
  }
  root.innerHTML = list
    .map((item) => {
      const stamp = new Date(item.at).toLocaleString("fr-BE", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      const preview = item.text.split(/\r?\n/).filter(Boolean).slice(0, 2).join(" · ");
      return `
      <div class="card">
        <div class="card__left">
          <div class="card__sub">${stamp}</div>
          <div class="card__title">${escapeHTML(preview || "Liste vide")}</div>
        </div>
        <div class="card__actions">
          <button class="action-btn" type="button" data-inbox-act="open" data-id="${item.id}">Ouvrir</button>
          <button class="icon-btn" type="button" data-inbox-act="del" data-id="${item.id}" title="Supprimer">×</button>
        </div>
      </div>`;
    })
    .join("");
}

/* ---------- Notes / Typhonse ---------- */

function renderNotesPanel() {
  const { notes } = getState();
  if ($("notesAreaPanel") && document.activeElement !== $("notesAreaPanel"))
    $("notesAreaPanel").value = notes.text || "";
  if ($("remindersAreaPanel") && document.activeElement !== $("remindersAreaPanel"))
    $("remindersAreaPanel").value = notes.reminders || "";
}

export function renderNotesOverlay() {
  const { notes } = getState();
  if ($("notesArea")) $("notesArea").value = notes.text || "";
  if ($("remindersArea")) $("remindersArea").value = notes.reminders || "";
  renderNotesEntries();
}

function renderNotesEntries() {
  const root = $("notesEntriesList");
  if (!root) return;
  const entries = getState().notes.entries || [];
  if (entries.length === 0) {
    root.innerHTML = `<div class="muted small">Aucune note horodatée.</div>`;
    return;
  }
  root.innerHTML = entries
    .slice(0, 30)
    .map((e) => {
      const stamp = new Date(e.at).toLocaleString("fr-BE", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      return `
      <div class="card">
        <div class="card__left">
          <div class="card__sub">${stamp}</div>
          <div class="card__title">${escapeHTML(e.text)}</div>
        </div>
      </div>`;
    })
    .join("");
}

export function renderTyphonse() {
  const root = $("typhonseList");
  if (!root) return;
  const list = getState().notes.typhonse || [];
  if (list.length === 0) {
    root.innerHTML = `<div class="muted small">Typhonse est vide. Suspect, mais acceptable.</div>`;
    return;
  }
  root.innerHTML = list
    .map(
      (item) => `
    <div class="card">
      <div class="card__left">
        <div class="card__title">${item.done ? "✓ " : ""}${escapeHTML(item.label)}</div>
        <div class="card__sub">${item.done ? "Fait" : "En attente"}</div>
      </div>
      <div class="card__actions">
        <button class="icon-btn" data-ty-act="toggle" data-id="${item.id}" title="Cocher">${item.done ? "↩" : "✓"}</button>
        <button class="icon-btn" data-ty-act="del" data-id="${item.id}" title="Supprimer">×</button>
      </div>
    </div>`
    )
    .join("");
}

/* ---------- Habitudes ---------- */

function renderHabitsPanel() {
  const root = $("habitsContent");
  if (!root) return;
  const habits = getState().habits;
  if (habits.length === 0) {
    root.innerHTML = `<div class="muted small">Aucune habitude.</div>`;
    return;
  }
  root.innerHTML = habits
    .map((habit) => {
      const p = habitProgress(habit);
      const cells = habit.checks
        .map(
          (checked, idx) =>
            `<button class="icon-btn" data-habit-id="${habit.id}" data-habit-index="${idx}" title="Case">${checked ? "✓" : "·"}</button>`
        )
        .join("");
      return `
      <div class="card">
        <div class="card__left">
          <div class="card__title">${escapeHTML(habit.name)} (${p.done}/${p.total})</div>
          <div class="row">${cells}</div>
        </div>
        <div class="card__actions">
          <button class="action-btn" data-habit-act="reset" data-habit="${habit.id}" type="button">Reset</button>
          <button class="action-btn" data-habit-act="del" data-habit="${habit.id}" type="button">Supprimer</button>
        </div>
      </div>`;
    })
    .join("");
}

/* ---------- Sets ---------- */

function renderSetsPanel() {
  const root = $("setsContent");
  if (!root) return;
  initSetsChecksForToday();
  const dk = dayKey();
  const state = getState();

  const buildSet = (setKey, title) => {
    const set = state.sets[setKey];
    const checks = set.checks?.[dk] || {};
    let html = `
      <div class="card">
        <div class="card__left">
          <div class="card__title">${title}</div>
          <div class="card__sub">${Object.values(checks).filter(Boolean).length}/${set.patients.length * set.itemsPerPatient.length}</div>`;

    set.patients.forEach((patient, idx) => {
      html += `
        <div class="soft-sep"></div>
        <div class="field-group">
          <label class="label-mini">Patient ${idx + 1}</label>
          <input class="field input" data-patient-rename="${setKey}|${patient.id}" value="${escapeHTML(patient.name)}">
        </div>
        <div class="row">`;
      set.itemsPerPatient.forEach((item) => {
        const checked = !!checks[setKeyItem(setKey, patient.id, item)];
        html += `<button class="action-btn ${checked ? "action-btn--accent" : ""}" type="button"
            data-set-click="${setKey}|${patient.id}|${encodeURIComponent(item)}">${escapeHTML(item)}</button>`;
      });
      html += `</div>`;
    });
    html += `</div></div>`;
    return html;
  };

  root.innerHTML = buildSet("hospital", "HOSPITALIER") + buildSet("consult", "CONSULTATION");
}

/* ---------- Historique + calendrier ---------- */

function renderHistoryPanel() {
  const root = $("historyContent");
  const state = getState();
  if (root) {
    if (state.history.length === 0) {
      root.innerHTML = `<div class="muted small">Pas encore d’historique.</div>`;
    } else {
      root.innerHTML = state.history
        .slice(0, 14)
        .map(
          (e) => `
        <div class="card">
          <div class="card__left">
            <div class="card__sub">${e.day}</div>
            <div class="card__title">Faites: ${e.doneTasks} · Restantes: ${e.remainingTasks} · Étorions: ${e.doneEtorions}</div>
          </div>
        </div>`
        )
        .join("");
    }
  }

  const grid = $("calendarGrid");
  if (grid) {
    const series = calendarSeries(30);
    const max = Math.max(1, ...series.map((s) => s.value));
    grid.innerHTML = series
      .map(({ day, value }) => {
        const opacity = 0.08 + clamp(value / max, 0, 1) * 0.42;
        const dayNum = day.slice(8, 10);
        return `
        <div class="calendar-cell" title="${day} — ${value} tâche(s)">
          <div class="calendar-cell__fill" style="opacity:${opacity}"></div>
          <div class="calendar-cell__label">${dayNum}</div>
        </div>`;
      })
      .join("");
  }
}

/* ---------- Stats ---------- */

function renderMiniBars(series, key, maxValue) {
  return series
    .map((row) => {
      const v = row[key];
      const width = maxValue <= 0 ? 0 : Math.max(6, Math.round((v / maxValue) * 100));
      const dayNum = row.day.slice(8, 10);
      return `
      <div style="display:grid;grid-template-columns:34px 1fr 32px;gap:8px;align-items:center;">
        <div class="card__sub">${dayNum}</div>
        <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;">
          <div style="height:100%;width:${width}%;background:var(--accent);border-radius:999px;"></div>
        </div>
        <div class="card__sub" style="text-align:right;">${v}</div>
      </div>`;
    })
    .join("");
}

function renderStatsPanel() {
  const progress = computeProgress();
  const dopamine = dopamineScore();
  const series = statsSeries();
  const maxTasks = Math.max(1, ...series.map((s) => s.tasks));
  const maxEto = Math.max(1, ...series.map((s) => s.etorions));
  const stats = getState().stats;

  const html = `
    <div class="card">
      <div class="card__left">
        <div class="card__title">Vue d’ensemble</div>
        <div class="card__sub">Progression restante : ${progress.pct}% · Dopamine score : ${dopamine}%</div>
        <div class="card__sub">Tâches complétées : ${stats.tasksCompleted}</div>
        <div class="card__sub">Étorions dégommés : ${stats.etorionsDone}</div>
        <div class="card__sub">Sessions : ${stats.sessions}</div>
        <div class="card__sub">Célébrations affichées : ${stats.celebrationsShown}</div>
      </div>
    </div>
    <div class="card">
      <div class="card__left">
        <div class="card__title">Tâches / jour</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">${renderMiniBars(series, "tasks", maxTasks)}</div>
      </div>
    </div>
    <div class="card">
      <div class="card__left">
        <div class="card__title">Étorions / jour</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">${renderMiniBars(series, "etorions", maxEto)}</div>
      </div>
    </div>`;

  if ($("statsContent")) $("statsContent").innerHTML = html;
  if ($("statsContentPanel")) $("statsContentPanel").innerHTML = html;
}

/* ---------- Export ---------- */

function renderExport() {
  const out = $("exportOut");
  if (out) out.value = JSON.stringify(getState(), null, 2);
}

/* =========================================================
   ENREGISTREMENT DES ABONNEMENTS + DÉLÉGATION D'ÉVÉNEMENTS
   Appelé une seule fois au démarrage.
========================================================= */

export function setupRendering() {
  // --- Abonnements ciblés (topic -> rendu) ---
  on("theme", applyTheme);
  on("hub", () => { renderHub(); renderProgress(); });
  on("tasks", () => {
    renderTasksPanel();
    renderBelowList();
  });
  on("inbox", syncInboxUI);
  on("notes", () => { renderNotesPanel(); renderNotesEntries(); });
  on("typhonse", renderTyphonse);
  on("habits", renderHabitsPanel);
  on("sets", renderSetsPanel);
  on("history", renderHistoryPanel);
  on("stats", () => { renderStatsPanel(); renderExport(); });

  // Sur "*" (undo / reset / import massif) : tout redessiner.
  on("*", renderEverything);

  // --- Délégation : un listener par conteneur de liste ---
  delegate($("belowTasks"), "click", "[data-below-act]", (btn) => {
    const id = btn.dataset.id;
    const act = btn.dataset.belowAct;
    if (act === "up") moveTask(id, -1);
    else if (act === "down") moveTask(id, 1);
    else if (act === "pin") togglePinTask(id);
    else if (act === "today") toggleTodayTask(id);
    else if (act === "sel") selectTask(id);
    else if (act === "done") completeTask(id);
  });

  delegate($("taskList"), "click", "[data-task-act]", (btn) => {
    const id = btn.dataset.id;
    const act = btn.dataset.taskAct;
    if (act === "sel") selectTask(id);
    else if (act === "done") completeTask(id);
    else if (act === "today") toggleTodayTask(id);
    else if (act === "restore") restoreTask(id);
    else if (act === "del") deleteTask(id);
    else if (act === "edit") {
      const task = getTask(id);
      const next = prompt("Éditer la tâche", task?.title || "");
      if (next !== null) editTask(id, next);
    }
  });

  delegate($("typhonseList"), "click", "[data-ty-act]", (btn) => {
    const id = btn.dataset.id;
    if (btn.dataset.tyAct === "toggle") toggleTyphonse(id);
    else if (btn.dataset.tyAct === "del") deleteTyphonse(id);
  });

  delegate($("habitsContent"), "click", "[data-habit-id]", (btn) => {
    toggleHabitCheck(btn.dataset.habitId, parseInt(btn.dataset.habitIndex, 10));
  });
  delegate($("habitsContent"), "click", "[data-habit-act]", (btn) => {
    const id = btn.dataset.habit;
    if (btn.dataset.habitAct === "reset") resetHabit(id);
    else if (btn.dataset.habitAct === "del") deleteHabit(id);
  });

  delegate($("setsContent"), "click", "[data-set-click]", (btn) => {
    const [setName, patientId, itemEnc] = btn.dataset.setClick.split("|");
    toggleSetCheck(setName, patientId, decodeURIComponent(itemEnc));
  });
  delegate($("setsContent"), "change", "[data-patient-rename]", (input) => {
    const [setName, patientId] = input.dataset.patientRename.split("|");
    renameSetPatient(setName, patientId, input.value);
  });

  delegate($("inboxHistoryList"), "click", "[data-inbox-act]", (btn) => {
    const id = btn.dataset.id;
    if (btn.dataset.inboxAct === "open") {
      const text = restoreInboxHistoryItem(id);
      if (text != null && $("inboxText")) $("inboxText").value = text;
      status("Liste restaurée dans l’Inbox.");
    } else if (btn.dataset.inboxAct === "del") {
      deleteInboxHistoryItem(id);
    }
  });
}

/** Rendu complet (démarrage, undo, reset). */
export function renderEverything() {
  applyTheme();
  renderSubtitle();
  renderProgress();
  renderHub();
  renderMetaTimer();
  syncInboxUI();
  renderTasksPanel();
  renderBelowList();
  applyBelowListVisibility();
  renderNotesPanel();
  renderTyphonse();
  renderHabitsPanel();
  renderSetsPanel();
  renderHistoryPanel();
  renderStatsPanel();
  renderExport();
}

// Rendus exposés pour les ouvertures d'onglets/overlays à la demande.
export const renderers = {
  inbox: syncInboxUI,
  tasks: renderTasksPanel,
  kiffance: suggestKiffance,
  notes: () => { renderNotesPanel(); },
  notesOverlay: renderNotesOverlay,
  typhonse: renderTyphonse,
  habits: renderHabitsPanel,
  sets: renderSetsPanel,
  history: renderHistoryPanel,
  stats: renderStatsPanel,
  export: renderExport,
};
