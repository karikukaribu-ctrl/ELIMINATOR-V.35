/* =========================================================
   DOM HELPERS
   Petits utilitaires de sélection et de manipulation DOM.
========================================================= */

/** Sélectionne un élément par son id. */
export const $ = (id) => document.getElementById(id);

/** Sélectionne tous les éléments correspondant à un sélecteur (tableau). */
export const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

/** Affiche/masque un élément via l'attribut [hidden]. */
export function setHidden(el, hidden) {
  if (!el) return;
  if (hidden) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

/** Définit le textContent d'un élément s'il existe. */
export function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

/** Définit la valeur d'un champ s'il existe. */
export function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

/**
 * Délégation d'événements : attache UN listener sur le conteneur
 * plutôt qu'un listener par bouton. Évite de réattacher des handlers
 * à chaque rendu (cause majeure de fuites et de lenteur).
 *
 * @param {HTMLElement} container
 * @param {string} eventType  ex: "click"
 * @param {string} selector   ex: "[data-act]"
 * @param {(el: HTMLElement, ev: Event) => void} handler
 */
export function delegate(container, eventType, selector, handler) {
  if (!container) return;
  container.addEventListener(eventType, (ev) => {
    const match = ev.target.closest(selector);
    if (match && container.contains(match)) handler(match, ev);
  });
}
