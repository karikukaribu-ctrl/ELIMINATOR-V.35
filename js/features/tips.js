/* =========================================================
   CONSEILS (TIPS)
========================================================= */

import { getState } from "../core/store.js";
import { pickRandom } from "../core/utils.js";
import { TIPS } from "../core/constants.js";
import { status } from "../ui/status.js";

export function maybeShowTip(force = false) {
  if (!force && Math.random() > getState().settings.tipsChance) return;
  status(`Conseil — ${pickRandom(TIPS)}`, 6500);
}
