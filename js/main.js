/* =========================================================
   POINT D'ENTRÉE
   - Câble tous les listeners de l'UI fixe (barres, boutons, modals).
   - Lance le rendu initial et les boucles (timer de tâche, pomodoro).
========================================================= */

import { $ } from "./core/dom.js";
import { getState, save, emit } from "./core/store.js";
import { SEASONS, SUBLINES } from "./core/constants.js";
import { pickRandom } from "./core/utils.js";
import { doUndo } from "./core/undo.js";

import { applyTheme } from "./ui/theme.js";
import {
  openPanel, closePanels, bindTabs, bindPanelResize,
  openOverlay, closeOverlay, openPomoModal, closePomoModal,
  bindOverlayOutsideClose,
} from "./ui/panels.js";
import {
  setupRendering, renderEverything, renderMetaTimer, renderNotesOverlay,
  applyBelowListVisibility, setSubtitle, renderers,
} from "./ui/render.js";
import { syncPrefsUI, syncFlowPanel, applyPrefsFromPanel, resetPrefs, saveFlow } from "./ui/prefs.js";
import { status } from "./ui/status.js";

import { spinRoulette, degommeEtorion, completeTask, editTask, getTask } from "./features/tasks.js";
import { importFromInbox, saveInboxDraft } from "./features/inbox.js";
import { addNoteEntry, scheduleNotesSave, addTyphonse } from "./features/notes.js";
import { suggestKiffance, addKiffance, addKiffanceAsTask } from "./features/kiffance.js";
import { addHabit } from "./features/habits.js";
import { updateSetPatientCount, resetSetToday } from "./features/sets.js";
import { exportTodayText } from "./features/stats.js";
import { maybeShowTip } from "./features/tips.js";
import { maybeShowCelebration } from "./features/celebrations.js";
import {
  renderPomodoro, resetPhase, togglePomo, applyPomoSettings,
} from "./features/pomodoro.js";

/* ---- Boucle d'horloge de la tâche courante ---- */
let taskTimerLoop = null;
function startTaskTimerLoop() {
  if (taskTimerLoop) clearInterval(taskTimerLoop);
  taskTimerLoop = setInterval(renderMetaTimer, 500);
}

/* ---- Presse-papier ---- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    status("Copié.");
  } catch (_) {
    status("Impossible de copier.");
  }
}

/* ---- Reset global ---- */
function resetDay() {
  // (un pushUndo serait possible ici si on veut rendre le reset annulable)
  const s = getState();
  s.tasks = [];
  s.baseline = { totalTasks: 0, totalEtorions: 0 };
  s.currentTaskId = null;
  s.currentTaskStart = null;
  s.stats.sessions += 1;
  s.stats.tasksCompleted = 0;
  s.stats.etorionsDone = 0;
  save();
  emit("*");
  status("Reset total. Terrain nettoyé.");
}

/* ---- Câblage de l'UI fixe ---- */
function bindUI() {
  // Panneaux
  $("btnLeft")?.addEventListener("click", () => openPanel("left"));
  $("btnRight")?.addEventListener("click", () => openPanel("right"));
  $("leftClose")?.addEventListener("click", closePanels);
  $("rightClose")?.addEventListener("click", closePanels);
  $("panelBack")?.addEventListener("click", closePanels);

  // Thèmes / modes
  $("modeToggle")?.addEventListener("click", () => {
    getState().ui.mode = getState().ui.mode === "sombre" ? "clair" : "sombre";
    save();
    emit("theme");
  });
  $("seasonCycle")?.addEventListener("click", () => {
    const ui = getState().ui;
    ui.season = SEASONS[(SEASONS.indexOf(ui.season) + 1) % SEASONS.length];
    save();
    emit("theme");
  });
  $("seriousToggle")?.addEventListener("click", () => {
    getState().ui.serious = !getState().ui.serious;
    save();
    emit("theme", "hub");
  });
  $("focusBtn")?.addEventListener("click", () => {
    getState().ui.focus = !getState().ui.focus;
    save();
    emit("theme", "hub");
    applyBelowListVisibility();
  });
  $("listToggleBtn")?.addEventListener("click", toggleBelowList);
  $("belowListToggleBtn")?.addEventListener("click", toggleBelowList);
  $("btnHideBelow")?.addEventListener("click", () => {
    getState().ui.showBelowList = false;
    save();
    applyBelowListVisibility();
  });
  $("setsToggleBtn")?.addEventListener("click", () => {
    openPanel("right");
    document.querySelector('.tab-btn[data-righttab="sets"]')?.click();
  });

  // Actions centrales
  $("undoBtn")?.addEventListener("click", () => {
    if (!doUndo()) status("Rien à annuler.");
    else status("Retour arrière.");
  });
  $("rouletteBtn")?.addEventListener("click", () => {
    const wheel = $("rouletteWheel");
    if (wheel) {
      wheel.classList.remove("is-spinning");
      void wheel.offsetWidth; // reflow pour relancer l'animation
      wheel.classList.add("is-spinning");
      setTimeout(() => wheel.classList.remove("is-spinning"), 900);
    }
    spinRoulette();
  });
  $("bombBtn")?.addEventListener("click", degommeEtorion);
  $("doneTaskBtn")?.addEventListener("click", () => completeTask());
  $("editTaskBtn")?.addEventListener("click", () => {
    const id = getState().currentTaskId;
    const task = getTask(id);
    if (!task) return;
    const next = prompt("Éditer la tâche", task.title);
    if (next !== null) editTask(id, next);
  });
  $("taskInfoBtn")?.addEventListener("click", () => {
    const meta = $("taskMetaDetails");
    if (meta) meta.hidden = !meta.hidden;
  });

  // Overlays
  $("openNotes")?.addEventListener("click", () => openOverlay("notes", onOverlayOpen));
  $("openTyphonse")?.addEventListener("click", () => openOverlay("typhonse", onOverlayOpen));
  $("openKiffance")?.addEventListener("click", () => openOverlay("kiffance", onOverlayOpen));
  $("openStats")?.addEventListener("click", () => openOverlay("stats", onOverlayOpen));
  $("overlayClose")?.addEventListener("click", closeOverlay);
  $("modalClose")?.addEventListener("click", closePomoModal);
  $("modalBack")?.addEventListener("click", () => { closeOverlay(); closePomoModal(); });

  // Inbox
  $("inboxAdd")?.addEventListener("click", () => {
    const text = $("inboxText")?.value || "";
    const count = importFromInbox(text);
    if (count > 0) {
      addNoteEntry(`Import de ${count} tâche(s).`);
      const s = getState();
      if (!s.inbox.keepEditableAfterImport) {
        s.inbox.draft = "";
        if ($("inboxText")) $("inboxText").value = "";
      } else {
        s.inbox.draft = text;
      }
      save();
      emit("inbox");
      status(`${count} tâche(s) importée(s).`);
    } else {
      status("Rien importé.");
    }
  });
  $("inboxClear")?.addEventListener("click", () => {
    getState().inbox.draft = "";
    if ($("inboxText")) $("inboxText").value = "";
    save();
    status("Inbox effacée.");
  });
  $("inboxText")?.addEventListener("input", (e) => saveInboxDraft(e.target.value));
  $("inboxEditableToggle")?.addEventListener("click", () => {
    getState().inbox.keepEditableAfterImport = !getState().inbox.keepEditableAfterImport;
    save();
    emit("inbox");
  });

  // Filtres tâches (le state est la source de vérité)
  $("catFilter")?.addEventListener("change", (e) => {
    const values = Array.from(e.target.selectedOptions)
      .map((o) => o.value)
      .filter((v) => v !== "Toutes");
    getState().settings.includedCats = values;
    save();
    emit("tasks", "hub");
  });
  $("viewFilter")?.addEventListener("change", (e) => {
    getState().settings.listView = e.target.value;
    save();
    emit("tasks");
  });
  $("sortFilter")?.addEventListener("change", (e) => {
    getState().settings.listSort = e.target.value;
    save();
    emit("tasks");
  });

  // Kiffance
  $("kiffAdd")?.addEventListener("click", () => {
    addKiffance($("kiffNew")?.value);
    if ($("kiffNew")) $("kiffNew").value = "";
  });
  $("kiffSuggest")?.addEventListener("click", suggestKiffance);
  $("kiffToTask")?.addEventListener("click", addKiffanceAsTask);
  $("overlayKiffRefresh")?.addEventListener("click", suggestKiffance);
  $("overlayKiffToTask")?.addEventListener("click", addKiffanceAsTask);

  // Préférences / flow
  $("prefsApply")?.addEventListener("click", applyPrefsFromPanel);
  $("prefsReset")?.addEventListener("click", resetPrefs);
  $("saveFlowBtn")?.addEventListener("click", saveFlow);
  $("testTipBtn")?.addEventListener("click", () => maybeShowTip(true));
  $("testCeleBtn")?.addEventListener("click", () => maybeShowCelebration(true));

  // Export
  $("exportBtn")?.addEventListener("click", () => copyText(JSON.stringify(getState(), null, 2)));
  $("reportBtn")?.addEventListener("click", () => copyText(exportTodayText()));
  $("wipeBtn")?.addEventListener("click", resetDay);

  // Habitudes
  $("habitAddBtn")?.addEventListener("click", () => {
    addHabit($("habitName")?.value, $("habitSlots")?.value);
    if ($("habitName")) $("habitName").value = "";
  });

  // Sets
  $("hospPatients")?.addEventListener("change", (e) => updateSetPatientCount("hospital", e.target.value));
  $("consPatients")?.addEventListener("change", (e) => updateSetPatientCount("consult", e.target.value));
  $("hospResetToday")?.addEventListener("click", () => resetSetToday("hospital"));
  $("consResetToday")?.addEventListener("click", () => resetSetToday("consult"));

  // Notes / rappels (sauvegarde débouncée)
  ["notesArea", "remindersArea", "notesAreaPanel", "remindersAreaPanel"].forEach((id) =>
    $(id)?.addEventListener("input", scheduleNotesSave)
  );
  $("btnAddTyphonse")?.addEventListener("click", () => {
    addTyphonse($("typhonseInput")?.value);
    if ($("typhonseInput")) $("typhonseInput").value = "";
  });

  // Pomodoro
  $("pomoTime")?.addEventListener("click", togglePomo);
  $("pomoEdit")?.addEventListener("click", openPomoModal);
  $("pomoApply")?.addEventListener("click", () => {
    applyPomoSettings({
      workMin: $("pomoMinutes")?.value,
      breakMin: $("breakMinutes")?.value,
      autoStart: $("autoStartSel")?.value,
    });
    closePomoModal();
  });
  $("pomoReset")?.addEventListener("click", () => { resetPhase(); });
}

function toggleBelowList() {
  getState().ui.showBelowList = !getState().ui.showBelowList;
  save();
  applyBelowListVisibility();
}

/* ---- Rendus à la demande lors de l'ouverture d'onglets ---- */
function onTabOpen(side, key) {
  const r = renderers;
  if (key === "inbox") r.inbox();
  else if (key === "tasks") r.tasks();
  else if (key === "kiffance") r.kiffance();
  else if (key === "prefs") syncPrefsUI();
  else if (key === "export") r.export();
  else if (key === "sets") r.sets();
  else if (key === "habits") r.habits();
  else if (key === "flow") syncFlowPanel();
  else if (key === "history") r.history();
  else if (key === "notes") r.notes();
  else if (key === "stats") r.stats();
}

function onOverlayOpen(which) {
  if (which === "notes") renderNotesOverlay();
  else if (which === "typhonse") renderers.typhonse();
  else if (which === "kiffance") suggestKiffance();
  else if (which === "stats") renderers.stats();
}

/* ---- Init ---- */
function init() {
  setSubtitle(pickRandom(SUBLINES));

  applyTheme();
  bindTabs(onTabOpen);
  bindUI();
  bindOverlayOutsideClose();
  bindPanelResize("leftPanelResizer", "left");
  bindPanelResize("rightPanelResizer", "right");

  setupRendering(); // abonnements + délégation d'événements

  syncPrefsUI();
  syncFlowPanel();
  suggestKiffance();

  renderEverything();
  renderNotesOverlay();
  resetPhase();
  renderPomodoro();
  startTaskTimerLoop();

  if ($("hospPatients")) $("hospPatients").value = getState().sets.hospital.patients.length;
  if ($("consPatients")) $("consPatients").value = getState().sets.consult.patients.length;

  // Sauvegarde immédiate avant fermeture (au cas où une écriture débouncée est en attente).
  window.addEventListener("beforeunload", () => save({ immediate: true }));
}

document.addEventListener("DOMContentLoaded", init);
