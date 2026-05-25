/* =========================================================
   PANNEAUX, MODALS, OVERLAYS, RESIZE, TABS
========================================================= */

import { $, $$, setHidden } from "../core/dom.js";
import { getState, save } from "../core/store.js";
import { clamp } from "../core/utils.js";
import { setRootCssVars } from "./theme.js";

/* ---- Backdrops ---- */
const showPanelBack = (show) => setHidden($("panelBack"), !show);
const showModalBack = (show) => setHidden($("modalBack"), !show);

/* ---- Panneaux latéraux ---- */
export function openPanel(which) {
  const left = $("leftPanel");
  const right = $("rightPanel");
  if (!left || !right) return;

  showPanelBack(true);
  document.body.style.overflow = "hidden";

  if (which === "left") {
    setHidden(left, false);
    setHidden(right, true);
  } else {
    setHidden(right, false);
    setHidden(left, true);
  }
}

export function closePanels() {
  setHidden($("leftPanel"), true);
  setHidden($("rightPanel"), true);
  showPanelBack(false);
  document.body.style.overflow = "";
}

/* ---- Redimensionnement ---- */
export function bindPanelResize(handleId, side) {
  const handle = $(handleId);
  if (!handle) return;
  let dragging = false;

  const onMove = (e) => {
    if (!dragging) return;
    const ui = getState().ui;
    if (side === "left") {
      ui.leftPanelWidth = clamp(e.clientX, 300, Math.min(window.innerWidth - 40, 720));
    } else {
      ui.rightPanelWidth = clamp(
        window.innerWidth - e.clientX,
        320,
        Math.min(window.innerWidth - 40, 840)
      );
    }
    setRootCssVars();
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    save();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dragging = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

/* ---- Onglets ----
   onTab(side, key) est appelé à chaque changement d'onglet pour
   déclencher le rendu correspondant (fourni par render.js). */
export function bindTabs(onTab) {
  const wire = (attr, side) => {
    $$(`.tab-btn[data-${attr}]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(`.tab-btn[data-${attr}]`).forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const key = btn.dataset[attr === "lefttab" ? "lefttab" : "righttab"];
        const panelSel = side === "left" ? "#leftPanel" : "#rightPanel";
        $$(`${panelSel} .tab-page`).forEach((p) => p.classList.remove("is-show"));
        $(`${side}-${key}`)?.classList.add("is-show");
        onTab(side, key);
      });
    });
  };
  wire("lefttab", "left");
  wire("righttab", "right");
}

/* ---- Overlay central ---- */
export function closeOverlay() {
  setHidden($("overlayModal"), true);
  showModalBack(false);
  $$(".overlay-page").forEach((page) => {
    setHidden(page, true);
    page.classList.remove("is-show");
  });
}

const OVERLAY_TITLES = {
  notes: "Notes",
  typhonse: "Typhonse",
  kiffance: "Kiffance",
  stats: "Stats",
};

export function openOverlay(which, onOpen) {
  setHidden($("overlayModal"), false);
  showModalBack(true);

  $$(".overlay-page").forEach((page) => {
    setHidden(page, true);
    page.classList.remove("is-show");
  });

  const page = $(`overlay-${which}`);
  if (page) {
    setHidden(page, false);
    page.classList.add("is-show");
  }
  if ($("overlayTitle")) $("overlayTitle").textContent = OVERLAY_TITLES[which] || "Fenêtre";
  onOpen?.(which);
}

/* ---- Modal Pomodoro ---- */
export function openPomoModal() {
  setHidden($("pomoModal"), false);
  showModalBack(true);
  const p = getState().pomodoro;
  if ($("pomoMinutes")) $("pomoMinutes").value = p.workMin;
  if ($("breakMinutes")) $("breakMinutes").value = p.breakMin;
  if ($("autoStartSel")) $("autoStartSel").value = p.autoStart;
}

export function closePomoModal() {
  setHidden($("pomoModal"), true);
  showModalBack(false);
}

export function bindOverlayOutsideClose() {
  $("overlayModal")?.addEventListener("mousedown", (e) => {
    if (e.target === $("overlayModal")) closeOverlay();
  });
  $("pomoModal")?.addEventListener("mousedown", (e) => {
    if (e.target === $("pomoModal")) closePomoModal();
  });
  // Échap ferme overlay + modal + panneaux.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeOverlay();
      closePomoModal();
      closePanels();
    }
  });
}
