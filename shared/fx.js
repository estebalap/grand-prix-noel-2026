/* Atmosphère visuelle pilotée par un THÈME (un par mode de jeu) : ciel, aurore/rubans, route en perspective,
   particules (neige, braises, pluie néon, étincelles, warp, poussière, serpentins), effets spéciaux
   (soleil rétro, projecteurs, feux de régime F1). Canvas 2D plafonné à 60 FPS, qualité adaptative. */
import { THEMES, DEFAULT_THEME } from './themes.js';
import { createScenery } from './scenes.js';

const TAU = Math.PI * 2;

export function startAtmosphere(opts = {}) {
  const { road = false, snow = 1, aurora = 1, theme = DEFAULT_THEME } = opts;
  let cv = document.getElementById('atmo');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'atmo'; document.body.prepend(cv); }
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let T = THEMES[theme] || THEMES[DEFAULT_THEME];
  const state = { speed: 0.25, targetSpeed: 0.25, snow, aurora, road, hue: 0, paused: false, quality: 1, level: 0 };
  let parts = [], stars = [];
  const scenery = createScenery();

  const spawn = (p, init) => {
    const k = T.particles.kind;
    p.z = Math.random(); p.p = Math.random() * TAU;
    if (k === 'warp') { p.a = Math.random() * TAU; p.r = Math.random() * 0.05 + (init ? Math.random() * 0.6 : 0); p.h = Math.random() * 360; return p; }
    p.x = Math.random() * W; p.y = init ? Math.random() * H : (k === 'embers' ? H + 10 : -10);
    p.r = 0.6 + Math.random() * 2.2;
    if (k === 'embers') p.r = 0.8 + Math.random() * 2.4;
    if (k === 'dust') { p.r = 1 + Math.random() * 3.5; p.y = Math.random() * H; }
    if (k === 'bits') { p.w = 4 + Math.random() * 6; p.h2 = 8 + Math.random() * 10; p.c = T.particles.colors[(Math.random() * T.particles.colors.length) | 0]; p.rot = Math.random() * TAU; }
    if (k === 'rain') { p.len = 14 + Math.random() * 30; p.c = T.particles.colors[(Math.random() * T.particles.colors.length) | 0]; }
    if (k === 'sparks') { p.len = 10 + Math.random() * 40; p.y = Math.random() * H; p.x = init ? Math.random() * W : W + 20; }
    return p;
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dens = T.particles.density * state.snow * state.quality;
    const n = Math.min(Math.round((W * H) / 14000 * dens), 300);
    parts = Array.from({ length: n }, () => spawn({}, true));
    stars = Array.from({ length: Math.round((W * H) / 9000 * T.stars) }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.62, r: Math.random() * 1.3 + 0.2, p: Math.random() * TAU }));
  }
  window.addEventListener('resize', resize);
  resize();

  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, T.sky[0]); g.addColorStop(0.45, T.sky[1]); g.addColorStop(1, T.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 0.0015 + s.p);
      ctx.fillStyle = `rgba(${T.starColor},${0.25 + tw * 0.65})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    if (state.aurora > 0 && (T.aurora ?? 1) > 0) {
      ctx.globalCompositeOperation = 'screen';
      for (const r of T.ribbons) {
        const cy = H * r.y;
        const grad = ctx.createLinearGradient(0, cy - H * 0.22, 0, cy + H * 0.2);
        grad.addColorStop(0, `rgba(${r.c},0)`); grad.addColorStop(0.5, `rgba(${r.c},${r.a * state.aurora * (T.aurora ?? 1)})`); grad.addColorStop(1, `rgba(${r.c},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        const step = Math.max(24, W / 60);
        ctx.moveTo(0, cy + H * 0.25);
        for (let x = 0; x <= W + step; x += step) {
          const y = cy + Math.sin(x * 0.004 + t * r.s * 6 * T.waveSpeed + r.ph) * H * 0.07 + Math.sin(x * 0.011 - t * r.s * 9 * T.waveSpeed + r.ph) * H * 0.025;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, cy + H * 0.3); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawSun(horizon, vx) {
    const R = Math.min(W, H) * 0.22;
    const g = ctx.createLinearGradient(0, horizon - R, 0, horizon);
    g.addColorStop(0, T.road.sun[0]); g.addColorStop(1, T.road.sun[1]);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, horizon - R - 4, W, R + 4); ctx.clip();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(vx, horizon, R, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = T.sky[2];
    for (let i = 1; i < 7; i++) { const yy = horizon - R * (i / 7) * 0.92; ctx.fillRect(vx - R, yy, R * 2, i * 1.3 + 1); }
    ctx.restore();
  }

  let roadOffset = 0;
  function drawRoad(dt, t) {
    roadOffset = (roadOffset + dt * state.speed * 0.0016) % 1;
    const horizon = H * 0.62, vx = W / 2, R = T.road;
    if (R.sun) drawSun(horizon, vx);
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, 'rgba(10,14,45,0)'); g.addColorStop(1, R.ground);
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
    const roadHalfTop = W * 0.012, roadHalfBot = W * 0.58;
    ctx.beginPath();
    ctx.moveTo(vx - roadHalfTop, horizon); ctx.lineTo(vx + roadHalfTop, horizon);
    ctx.lineTo(vx + roadHalfBot, H); ctx.lineTo(vx - roadHalfBot, H); ctx.closePath();
    const rg = ctx.createLinearGradient(0, horizon, 0, H);
    rg.addColorStop(0, R.fill[0]); rg.addColorStop(0.35, R.fill[1]); rg.addColorStop(1, R.fill[2]);
    ctx.fillStyle = rg; ctx.fill();
    for (let i = -2; i <= 2; i++) {
      const edge = i / 2;
      ctx.beginPath();
      ctx.moveTo(vx + edge * roadHalfTop, horizon); ctx.lineTo(vx + edge * roadHalfBot, H);
      const lg = ctx.createLinearGradient(0, horizon, 0, H);
      const col = Math.abs(i) === 2 ? R.edge : R.lane;
      lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(1, `rgba(${col},${Math.abs(i) === 2 ? 0.8 : 0.28})`);
      ctx.strokeStyle = lg; ctx.lineWidth = Math.abs(i) === 2 ? 3.2 : 1.6; ctx.stroke();
    }
    for (let k = 0; k < 16; k++) {
      const f = ((k + roadOffset) / 16);
      const p = f * f * f;
      const y = horizon + (H - horizon) * p;
      const half = roadHalfTop + (roadHalfBot - roadHalfTop) * p;
      const hue = R.hue ? (R.hue[0] + ((k * R.hue[1]) + state.hue * R.hue[2]) % R.hue[3]) : (k * 38 + state.hue) % 360;
      ctx.strokeStyle = `hsla(${hue},${R.sat}%,${R.light}%,${0.05 + p * 0.5})`;
      ctx.lineWidth = 1 + p * 5;
      ctx.beginPath(); ctx.moveTo(vx - half, y); ctx.lineTo(vx + half, y); ctx.stroke();
    }
    if (R.grid) {                                   // plancher « grille » néon (Tokyo)
      ctx.strokeStyle = `rgba(${R.grid},.14)`; ctx.lineWidth = 1;
      for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(vx + i * roadHalfTop * 2, horizon); ctx.lineTo(vx + i * W * 0.14, H); ctx.stroke(); }
    }
    const hg = ctx.createRadialGradient(vx, horizon, 0, vx, horizon, W * 0.42);
    hg.addColorStop(0, `rgba(${R.halo},.22)`); hg.addColorStop(1, `rgba(${R.halo},0)`);
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
  }

  function drawParticles(t, dt) {
    const P = T.particles, k = P.kind, sp = dt / 16, sw = (state.speed - 0.25);
    if (k === 'warp') {
      const cx = W / 2, cy = H * 0.55, maxR = Math.hypot(W, H) * 0.6;
      for (const p of parts) {
        p.r += (0.004 + p.r * 0.05 + state.speed * 0.01) * sp;
        if (p.r > 1) { spawn(p, false); continue; }
        const r0 = p.r * maxR, r1 = Math.min(maxR, r0 + 4 + p.r * 70);
        ctx.strokeStyle = `hsla(${(p.h + state.hue * 2) % 360},95%,68%,${Math.min(1, p.r * 1.6)})`;
        ctx.lineWidth = 0.6 + p.r * 2.4;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(p.a) * r0, cy + Math.sin(p.a) * r0); ctx.lineTo(cx + Math.cos(p.a) * r1, cy + Math.sin(p.a) * r1); ctx.stroke();
      }
      return;
    }
    for (const p of parts) {
      if (k === 'snow') {
        const s = (0.25 + p.z * 0.9) * sp;
        p.y += s * 0.9 * (0.5 + p.r * 0.35);
        p.x += Math.sin(t * 0.0008 + p.p) * 0.35 * (0.4 + p.z) + sw * 2.5 * p.z;
        if (p.y > H + 4) spawn(p, false);
        ctx.fillStyle = `rgba(${P.color},${0.25 + p.z * 0.65})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + p.z * 0.7), 0, TAU); ctx.fill();
      } else if (k === 'embers') {
        p.y -= (0.5 + p.z * 1.6) * sp * (1 + state.speed);
        p.x += Math.sin(t * 0.002 + p.p) * 0.6;
        if (p.y < -10) spawn(p, false);
        const fl = 0.5 + 0.5 * Math.sin(t * 0.01 + p.p * 3);
        ctx.fillStyle = `rgba(${P.color},${(0.25 + p.z * 0.6) * (0.5 + fl * 0.5)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + fl * 0.6), 0, TAU); ctx.fill();
      } else if (k === 'rain') {
        p.y += (9 + p.z * 14) * sp; p.x -= 2.2 * sp;
        if (p.y > H + 40) spawn(p, false);
        ctx.strokeStyle = p.c; ctx.globalAlpha = 0.25 + p.z * 0.5; ctx.lineWidth = 1 + p.z;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y - p.len); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (k === 'sparks') {
        p.x -= (14 + p.z * 26) * sp * (1 + state.speed * 2);
        if (p.x < -60) spawn(p, false);
        ctx.strokeStyle = `rgba(${P.color},${0.2 + p.z * 0.6})`; ctx.lineWidth = 1 + p.z * 1.4;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len, p.y + p.len * 0.05); ctx.stroke();
      } else if (k === 'dust') {
        p.x += Math.sin(t * 0.0004 + p.p) * 0.25 + 0.08 * sp; p.y += Math.cos(t * 0.0003 + p.p) * 0.2 - 0.04 * sp;
        if (p.x > W + 10) p.x = -10; if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
        const gl = 0.2 + 0.25 * Math.sin(t * 0.001 + p.p * 2);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `rgba(${P.color},${gl + 0.2})`); g.addColorStop(1, `rgba(${P.color},0)`);
        ctx.fillStyle = g; ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      } else if (k === 'bits') {
        p.y += (0.6 + p.z * 1.4) * sp; p.x += Math.sin(t * 0.001 + p.p) * 0.7; p.rot += 0.02 * sp;
        if (p.y > H + 12) spawn(p, false);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = 0.35 + p.z * 0.5; ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h2 / 2, p.w, p.h2); ctx.restore(); ctx.globalAlpha = 1;
      }
    }
  }

  function drawExtras(t) {
    const X = T.extras;
    if (X.spot) {                                    // projecteurs jaunes balayant la piste (Le Mans)
      ctx.globalCompositeOperation = 'screen';
      [[0.08, 1], [0.92, -1]].forEach(([fx, dir], i) => {
        const ox = W * fx, oy = H, ang = -Math.PI / 2 + Math.sin(t * 0.0006 + i * 2) * 0.45 * dir;
        const len = H * 1.2, spread = 0.2;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, len);
        g.addColorStop(0, `rgba(${X.spot},.30)`); g.addColorStop(1, `rgba(${X.spot},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(ang - spread) * len, oy + Math.sin(ang - spread) * len);
        ctx.lineTo(ox + Math.cos(ang + spread) * len, oy + Math.sin(ang + spread) * len); ctx.closePath(); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    if (X.rev) {                                     // rampe de feux de régime F1
      const n = 16, gap = Math.min(30, W / 40), r = gap * 0.32, x0 = W / 2 - (n * gap) / 2, y = 20;
      const lvl = n * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0021 * (0.6 + state.speed))));
      for (let i = 0; i < n; i++) {
        const col = i < 5 ? '61,220,151' : i < 10 ? '255,209,102' : i < 13 ? '255,59,87' : '76,201,240';
        const on = i < lvl;
        ctx.fillStyle = `rgba(${col},${on ? 0.95 : 0.12})`;
        ctx.beginPath(); ctx.arc(x0 + i * gap + gap / 2, y, r, 0, TAU); ctx.fill();
        if (on) { ctx.fillStyle = `rgba(${col},.18)`; ctx.beginPath(); ctx.arc(x0 + i * gap + gap / 2, y, r * 2.6, 0, TAU); ctx.fill(); }
      }
    }
    if (X.flash) {                                   // éclairs d'alerte / chaos
      const f = Math.max(0, Math.sin(t * 0.0009 * X.flash) - 0.985) * 40;
      if (f > 0) { ctx.fillStyle = `rgba(${T.flashColor},${Math.min(0.22, f * 0.22)})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  let last = performance.now(), slow = 0, frames = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (state.paused || document.hidden) { last = t; return; }
    const dt = Math.min(64, t - last); last = t;
    state.speed += (state.targetSpeed - state.speed) * Math.min(1, dt / 400);
    state.hue = (state.hue + dt * T.hueSpeed) % 360;
    drawSky(t);
    scenery.draw(ctx, T, W, H, t, state.speed);
    if (state.road) drawRoad(dt, t);
    if (state.snow > 0) drawParticles(t, dt);
    drawExtras(t);
    scenery.overlay(ctx, T, W, H, t, state.speed);
    frames++; if (dt > 25) slow++;
    if (frames === 120) { if (slow > 60 && state.quality > 0.4) { state.quality *= 0.6; resize(); } frames = 0; slow = 0; }
  }
  requestAnimationFrame(loop);

  return {
    setSpeed(v) { state.targetSpeed = v; },
    setRoad(v) { state.road = v; },
    setAurora(v) { state.aurora = v; },
    setSnow(v) { state.snow = v; resize(); },
    pause(v) { state.paused = v; },
    setTheme(id) { const n = THEMES[id] || THEMES[DEFAULT_THEME]; if (n === T) return; T = n; resize(); },
    get theme() { return T.id; },
  };
}

/* ---------------------------------------------------------------- confettis */
let cfCv, cfCtx, parts = [], cfRunning = false;
function ensureConfetti() {
  if (cfCv) return;
  cfCv = document.createElement('canvas');
  cfCv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:900;pointer-events:none';
  document.body.appendChild(cfCv);
  cfCtx = cfCv.getContext('2d');
  const rs = () => { cfCv.width = innerWidth; cfCv.height = innerHeight; };
  addEventListener('resize', rs); rs();
}
const PALETTE = ['#ffd36a', '#fff3c4', '#ff3b57', '#19b87a', '#8fdcff', '#9b6bff', '#ffffff'];
export function confetti({ x = 0.5, y = 0.4, count = 140, power = 1, spread = TAU, angle = -Math.PI / 2, gravity = 0.18 } = {}) {
  ensureConfetti();
  const cx = x * cfCv.width, cy = y * cfCv.height;
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const v = (4 + Math.random() * 11) * power;
    parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 8, h: 3 + Math.random() * 6, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4,
      c: PALETTE[(Math.random() * PALETTE.length) | 0], life: 160 + Math.random() * 120, g: gravity, shape: Math.random() < 0.18 ? 1 : 0 });
  }
  if (!cfRunning) { cfRunning = true; requestAnimationFrame(stepConfetti); }
}
function stepConfetti() {
  cfCtx.clearRect(0, 0, cfCv.width, cfCv.height);
  parts = parts.filter((p) => p.life > 0 && p.y < cfCv.height + 40);
  for (const p of parts) {
    p.vy += p.g; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    cfCtx.save(); cfCtx.translate(p.x, p.y); cfCtx.rotate(p.r);
    cfCtx.globalAlpha = Math.min(1, p.life / 40); cfCtx.fillStyle = p.c;
    if (p.shape) { cfCtx.beginPath(); cfCtx.arc(0, 0, p.w / 2.4, 0, TAU); cfCtx.fill(); } else cfCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cfCtx.restore();
  }
  if (parts.length) requestAnimationFrame(stepConfetti); else { cfRunning = false; cfCtx.clearRect(0, 0, cfCv.width, cfCv.height); }
}
export function confettiCannons() {
  confetti({ x: 0.04, y: 0.95, count: 120, angle: -Math.PI / 3, spread: 0.7, power: 1.5 });
  confetti({ x: 0.96, y: 0.95, count: 120, angle: -Math.PI * 2 / 3, spread: 0.7, power: 1.5 });
  setTimeout(() => confetti({ x: 0.5, y: 0.3, count: 160, power: 1.1 }), 260);
}
