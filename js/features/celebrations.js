/* =========================================================
   CÉLÉBRATIONS
   - Pondération selon fatigue/motivation.
   - Animation canvas (feux d'artifice + confettis).

   CORRECTION : l'animation d'origine relançait une boucle
   requestAnimationFrame non annulable. Si une nouvelle célébration
   arrivait avant la fin, deux boucles tournaient en parallèle sur le
   même canvas. On garde maintenant une référence annulable + on
   respecte prefers-reduced-motion.
========================================================= */

import { $ } from "../core/dom.js";
import { getState, save } from "../core/store.js";
import { clamp, pickRandom } from "../core/utils.js";
import { CELEBRATIONS } from "../core/constants.js";

let celebrateTimer = null;
let rafId = null;

const prefersReducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function weightedCelebrationPool() {
  const { fatigue, motivation } = getState().settings;

  const weights = {
    fantasy: 1 + (fatigue >= 3 ? 0.3 : 0) + (motivation >= 3 ? 0.2 : 0),
    dream: 1 + (fatigue >= 3 ? 0.5 : 0),
    ninja: 1 + (motivation >= 3 ? 0.6 : 0),
    med: 1 + (fatigue >= 2 ? 0.4 : 0),
    game: 1 + (motivation >= 2 ? 0.5 : 0),
    empire: 1 + (motivation >= 3 ? 0.7 : 0),
  };

  const pool = [];
  for (const [family, arr] of Object.entries(CELEBRATIONS)) {
    const w = Math.max(1, Math.round((weights[family] || 1) * 2));
    for (let i = 0; i < w; i++) {
      pool.push(...arr.map((item) => ({ ...item, family })));
    }
  }
  return pool;
}

function ensureCelebrationShell() {
  let shell = $("celebrateShell");
  if (shell) return shell;

  shell = document.createElement("div");
  shell.id = "celebrateShell";
  shell.setAttribute("hidden", "");
  Object.assign(shell.style, {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
  });

  shell.innerHTML = `
    <canvas id="celebrateCanvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
    <div id="celebrateCard" style="
      min-width:min(760px,92vw);max-width:min(760px,92vw);
      padding:20px 22px;border-radius:22px;
      border:1px solid rgba(255,255,255,.16);
      background:rgba(255,255,255,.12);
      backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      box-shadow:0 18px 44px rgba(0,0,0,.18);
      text-align:center;color:white;position:relative;overflow:hidden;">
      <div id="celebrateTitle" style="font-size:28px;font-weight:800;letter-spacing:.04em;margin-bottom:10px;"></div>
      <div id="celebrateMsg" style="font-size:16px;line-height:1.45;opacity:.96;"></div>
    </div>`;
  document.body.appendChild(shell);
  return shell;
}

function runFireworks(canvas) {
  if (!canvas || prefersReducedMotion) return;
  if (rafId) cancelAnimationFrame(rafId); // annule une éventuelle anim en cours

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ["#ffd86b", "#ff8e72", "#8fe3ff", "#bfa7ff", "#ffffff", "#9ee27f"];
  const particles = [];
  const confetti = [];

  for (let burst = 0; burst < 4; burst++) {
    const cx = Math.random() * w * 0.8 + w * 0.1;
    const cy = Math.random() * h * 0.45 + h * 0.1;
    const count = 40 + Math.floor(Math.random() * 22);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 1.6 + Math.random() * 3.8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        alpha: 1, size: 1.5 + Math.random() * 2.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 0.03 + Math.random() * 0.03,
      });
    }
  }

  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: Math.random() * w, y: -20 - Math.random() * 100,
      vx: -1 + Math.random() * 2, vy: 1.5 + Math.random() * 2.5,
      rot: Math.random() * Math.PI, vr: -0.08 + Math.random() * 0.16,
      size: 4 + Math.random() * 6, alpha: 0.8 + Math.random() * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.alpha *= 0.985;
    }
    for (const c of confetti) {
      c.x += c.vx; c.y += c.vy; c.rot += c.vr; c.vy += 0.02; c.alpha *= 0.995;
    }

    for (const p of particles) {
      if (p.alpha <= 0.03) continue;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const c of confetti) {
      if (c.alpha <= 0.04) continue;
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    const alive =
      particles.some((p) => p.alpha > 0.03) || confetti.some((c) => c.alpha > 0.04);
    if (frame < 180 && alive) {
      rafId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, w, h);
      rafId = null;
    }
  }
  rafId = requestAnimationFrame(tick);
}

export function maybeShowCelebration(force = false) {
  const state = getState();
  if (!force && Math.random() > state.settings.celebrationChance) return;

  const cele = pickRandom(weightedCelebrationPool());
  if (!cele) return;

  const shell = ensureCelebrationShell();
  if ($("celebrateTitle")) $("celebrateTitle").textContent = cele.title;
  if ($("celebrateMsg")) $("celebrateMsg").textContent = cele.msg;

  shell.removeAttribute("hidden");
  runFireworks($("celebrateCanvas"));

  state.stats.celebrationsShown += 1;
  save();

  if (celebrateTimer) clearTimeout(celebrateTimer);
  celebrateTimer = setTimeout(() => {
    shell.setAttribute("hidden", "");
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }, clamp(state.settings.celebrationAutoCloseSec, 3, 15) * 1000);
}
