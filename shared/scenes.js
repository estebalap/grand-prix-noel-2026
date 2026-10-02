/* Décors de fond, un par mode de jeu : chaque mode change radicalement de monde.
   Les silhouettes fixes sont dessinées une seule fois dans un canvas hors-écran (re-calculé au redimensionnement),
   les éléments animés (néons, projecteurs, lasers, soleil…) sont dessinés à chaque image avec un coût minimal.

   gp_bets        Rainbow Road galactique : planète à anneaux, nébuleuse, ruban arc-en-ciel flottant
   gp_pure        Rainbow Road en orbite : la Terre au ras de l'horizon, station spatiale, comètes
   survival       Désert post-apocalyptique : soleil rouge, dunes, épaves, colonnes de feu, tempête de sable
   boss_tomica    Tokyo by night : gratte-ciel aux fenêtres allumées, tour rouge, enseignes néon clignotantes
   boss_majorette Paris « Nightcall » : tour Eiffel lumineuse, toits de Paris, lune synthwave, grille rose
   f1_apex        Circuit de nuit en bord de mer : collines, port et yachts, tribunes, projecteurs, portique
   chaos          Rave techno : tunnel de lumière pulsé, lasers balayants, stroboscope
   reliques       Far West sépia : mesas, cactus, soleil couchant, grain de vieux film */

const TAU = Math.PI * 2;
const rnd = (s) => { let x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };   // pseudo-aléatoire stable

export function createScenery() {
  let cache = null, key = '';
  function staticLayer(T, W, H) {
    const k = T.id + ':' + W + 'x' + H;
    if (k === key && cache) return cache;
    key = k;
    cache = document.createElement('canvas');
    cache.width = Math.max(1, W); cache.height = Math.max(1, H);
    const c = cache.getContext('2d');
    const hz = H * 0.62;
    (STATIC[T.scene] || (() => {}))(c, W, H, hz, T);
    return cache;
  }
  return {
    draw(ctx, T, W, H, t, speed) {
      if (!T.scene) return;
      const hz = H * 0.62;
      (BEHIND[T.scene] || (() => {}))(ctx, W, H, hz, t, speed, T);
      ctx.drawImage(staticLayer(T, W, H), 0, 0, W, H);
      (FRONT[T.scene] || (() => {}))(ctx, W, H, hz, t, speed, T);
    },
    overlay(ctx, T, W, H, t, speed) { (OVER[T.scene] || (() => {}))(ctx, W, H, t, speed, T); },
  };
}

/* ======================================================================= COUCHES FIXES */
const STATIC = {
  rainbow(c, W, H, hz) {
    // nébuleuse
    for (let i = 0; i < 5; i++) {
      const x = W * (0.15 + rnd(i) * 0.7), y = H * (0.12 + rnd(i + 9) * 0.3), r = W * (0.18 + rnd(i + 3) * 0.2);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const col = ['155,80,255', '255,80,180', '60,140,255', '80,255,220', '255,170,80'][i];
      g.addColorStop(0, `rgba(${col},.22)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // planète à anneaux
    const px = W * 0.8, py = H * 0.22, pr = Math.min(W, H) * 0.12;
    const pg = c.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    pg.addColorStop(0, '#ffd7a8'); pg.addColorStop(0.5, '#e0703a'); pg.addColorStop(1, '#4a1430');
    c.save(); c.translate(px, py); c.rotate(-0.35);
    c.strokeStyle = 'rgba(255,220,170,.55)'; c.lineWidth = pr * 0.08;
    c.beginPath(); c.ellipse(0, 0, pr * 1.9, pr * 0.45, 0, Math.PI, TAU); c.stroke();
    c.restore();
    c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
    c.save(); c.translate(px, py); c.rotate(-0.35);
    c.strokeStyle = 'rgba(255,230,190,.8)'; c.lineWidth = pr * 0.08;
    c.beginPath(); c.ellipse(0, 0, pr * 1.9, pr * 0.45, 0, 0, Math.PI); c.stroke();
    c.restore();
    // petite lune
    c.fillStyle = '#c9d3ff'; c.beginPath(); c.arc(W * 0.14, H * 0.16, pr * 0.28, 0, TAU); c.fill();
    c.fillStyle = 'rgba(80,90,160,.5)'; c.beginPath(); c.arc(W * 0.14 + pr * 0.08, H * 0.16 - pr * 0.05, pr * 0.07, 0, TAU); c.fill();
  },
  orbit(c, W, H, hz) {
    // la Terre vue d'orbite, courbe au-dessus de l'horizon
    const R = W * 1.3, cx = W / 2, cy = hz + R * 0.93;
    const g = c.createRadialGradient(cx, cy - R * 0.2, R * 0.6, cx, cy, R);
    g.addColorStop(0, '#0b3c7a'); g.addColorStop(0.85, '#1f78c8'); g.addColorStop(0.97, '#8fe0ff'); g.addColorStop(1, 'rgba(140,220,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
    // continents stylisés
    c.fillStyle = 'rgba(80,190,120,.55)';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (rnd(i) - 0.5) * 0.7, rr = R * (0.94 - rnd(i + 4) * 0.05);
      c.beginPath(); c.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, W * (0.04 + rnd(i + 2) * 0.06), H * 0.015, a + Math.PI / 2, 0, TAU); c.fill();
    }
    // atmosphère
    c.strokeStyle = 'rgba(160,230,255,.6)'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R + 3, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    // station spatiale
    const sx = W * 0.2, sy = H * 0.2, s = Math.min(W, H) * 0.05;
    c.fillStyle = '#9fb3d9'; c.fillRect(sx - s * 0.3, sy - s * 0.15, s * 0.6, s * 0.3);
    c.fillStyle = '#2b4c9a';
    c.fillRect(sx - s * 1.6, sy - s * 0.35, s * 1.1, s * 0.7); c.fillRect(sx + s * 0.5, sy - s * 0.35, s * 1.1, s * 0.7);
    c.strokeStyle = 'rgba(200,220,255,.5)'; c.lineWidth = 1;
    for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(sx - s * 1.6 + i * s * 0.22, sy - s * 0.35); c.lineTo(sx - s * 1.6 + i * s * 0.22, sy + s * 0.35); c.stroke(); c.beginPath(); c.moveTo(sx + s * 0.5 + i * s * 0.22, sy - s * 0.35); c.lineTo(sx + s * 0.5 + i * s * 0.22, sy + s * 0.35); c.stroke(); }
  },
  desert(c, W, H, hz) {
    // dunes en 3 plans
    const layers = [['#7a2a12', 0.9, 0.05], ['#5a1d0e', 0.95, 0.035], ['#3a1208', 1.0, 0.025]];
    layers.forEach(([col, k, amp], li) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const y = hz - H * amp * (1 + Math.sin(x * 0.004 * (li + 1) + li * 2) * 0.8 + Math.sin(x * 0.011 + li) * 0.3) + li * H * 0.012;
        c.lineTo(x, y);
      }
      c.lineTo(W, H); c.closePath(); c.fill();
    });
    // épaves et carcasses
    c.fillStyle = '#1e0904';
    [[0.12, 1], [0.86, 1.3], [0.7, 0.7]].forEach(([fx, s]) => {
      const x = W * fx, y = hz + 2, w = W * 0.05 * s, h = H * 0.025 * s;
      c.beginPath(); c.moveTo(x - w, y); c.lineTo(x - w * 0.8, y - h); c.lineTo(x - w * 0.2, y - h * 1.5); c.lineTo(x + w * 0.5, y - h * 1.4); c.lineTo(x + w, y - h * 0.3); c.lineTo(x + w, y); c.closePath(); c.fill();
      c.beginPath(); c.arc(x - w * 0.6, y, h * 0.5, 0, TAU); c.arc(x + w * 0.6, y, h * 0.5, 0, TAU); c.fill();
    });
    // pylônes tordus
    c.strokeStyle = '#250b05'; c.lineWidth = 3;
    [0.3, 0.38].forEach((fx, i) => { const x = W * fx, h = H * (0.12 + i * 0.03); c.beginPath(); c.moveTo(x, hz); c.lineTo(x + 6, hz - h); c.lineTo(x + 30, hz - h + 8); c.moveTo(x + 6, hz - h * 0.7); c.lineTo(x - 18, hz - h * 0.6); c.stroke(); });
  },
  tokyo(c, W, H, hz) {
    // trois rangées d'immeubles, fenêtres allumées
    const rows = [[0.32, '#120a2e', 0.5], [0.22, '#0c0722', 0.75], [0.14, '#07041a', 1]];
    rows.forEach(([hmax, col, lit], ri) => {
      let x = -10, i = ri * 100;
      while (x < W + 10) {
        const w = W * (0.035 + rnd(i) * 0.05), h = H * hmax * (0.35 + rnd(i + 1) * 0.65);
        c.fillStyle = col; c.fillRect(x, hz - h, w, h + 2);
        if (rnd(i + 2) > 0.6) { c.fillRect(x + w * 0.4, hz - h - H * 0.03, 2, H * 0.03); }
        const cw = 4, ch = 5, gx = 7, gy = 9;
        for (let yy = hz - h + 8; yy < hz - 6; yy += gy) for (let xx = x + 4; xx < x + w - 4; xx += gx) {
          if (rnd(xx * 0.31 + yy * 0.17 + ri) < 0.38 * lit) {
            c.fillStyle = rnd(xx + yy) < 0.7 ? 'rgba(255,220,150,.75)' : 'rgba(140,220,255,.7)';
            c.fillRect(xx, yy, cw, ch);
          }
        }
        x += w + W * 0.004; i += 3;
      }
    });
    // tour rouge en treillis (silhouette générique)
    const tx = W * 0.72, th = H * 0.5, tb = W * 0.05;
    c.strokeStyle = '#ff3b2f'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(tx - tb, hz); c.lineTo(tx, hz - th); c.lineTo(tx + tb, hz); c.stroke();
    for (let k = 1; k < 9; k++) {
      const y = hz - th * k / 9, half = tb * (1 - k / 9);
      c.beginPath(); c.moveTo(tx - half, y); c.lineTo(tx + half, y); c.stroke();
      c.beginPath(); c.moveTo(tx - half, y); c.lineTo(tx + tb * (1 - (k - 1) / 9), y + th / 9); c.stroke();
    }
    c.fillStyle = '#fff'; c.fillRect(tx - tb * 0.35, hz - th * 0.62, tb * 0.7, 6);
  },
  paris(c, W, H, hz) {
    // grande lune synthwave
    const mx = W * 0.5, my = hz - H * 0.18, mr = Math.min(W, H) * 0.2;
    const mg = c.createLinearGradient(0, my - mr, 0, my + mr);
    mg.addColorStop(0, '#ffe6f6'); mg.addColorStop(0.6, '#ff6ad5'); mg.addColorStop(1, '#7a2ff0');
    c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    c.fillStyle = 'rgba(20,6,40,.85)';
    for (let i = 0; i < 6; i++) c.fillRect(mx - mr, my + mr * (0.1 + i * 0.16), mr * 2, 2 + i * 1.5);
    // toits de Paris : immeubles haussmanniens avec cheminées
    let x = -5, i = 0;
    c.fillStyle = '#12082a';
    while (x < W + 5) {
      const w = W * (0.05 + rnd(i) * 0.04), h = H * (0.05 + rnd(i + 1) * 0.05);
      c.fillRect(x, hz - h, w, h + 2);
      c.beginPath(); c.moveTo(x - 2, hz - h); c.lineTo(x + w * 0.15, hz - h - H * 0.025); c.lineTo(x + w * 0.85, hz - h - H * 0.025); c.lineTo(x + w + 2, hz - h); c.fill();
      c.fillRect(x + w * 0.3, hz - h - H * 0.04, 5, H * 0.02); c.fillRect(x + w * 0.7, hz - h - H * 0.035, 5, H * 0.015);
      for (let wy = hz - h + 8; wy < hz - 4; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 10) if (rnd(wx + wy) < 0.3) { c.fillStyle = 'rgba(255,200,120,.7)'; c.fillRect(wx, wy, 4, 6); c.fillStyle = '#12082a'; }
      x += w; i += 2;
    }
  },
  monaco(c, W, H, hz) {
    // lune et reflets sur la mer
    const mx = W * 0.2, my = H * 0.16, mr = Math.min(W, H) * 0.06;
    const mg = c.createRadialGradient(mx, my, 0, mx, my, mr * 5);
    mg.addColorStop(0, 'rgba(220,230,255,.35)'); mg.addColorStop(1, 'rgba(220,230,255,0)');
    c.fillStyle = mg; c.fillRect(0, 0, W, H);
    c.fillStyle = '#eef2ff'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    const sea = c.createLinearGradient(0, hz - H * 0.06, 0, hz);
    sea.addColorStop(0, '#0b1a3a'); sea.addColorStop(1, '#13306a');
    c.fillStyle = sea; c.fillRect(0, hz - H * 0.06, W, H * 0.06);
    for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(200,220,255,.35)'; c.fillRect(mx - 30 + rnd(k) * 60, hz - H * 0.055 + rnd(k + 3) * H * 0.05, 10 + rnd(k + 7) * 20, 1.5); }
    // collines
    c.fillStyle = '#0d1022'; c.beginPath(); c.moveTo(0, hz - H * 0.06);
    for (let x = 0; x <= W; x += 10) c.lineTo(x, hz - H * 0.06 - H * Math.max(0, 0.06 + 0.07 * Math.sin(x * 0.003 + 1) + 0.04 * Math.sin(x * 0.009)));
    c.lineTo(W, hz - H * 0.06); c.closePath(); c.fill();
    // villes à flanc de colline
    for (let k = 0; k < 260; k++) { const x = rnd(k) * W, y = hz - H * 0.06 - rnd(k + 500) * H * 0.09; c.fillStyle = rnd(k + 9) < 0.8 ? 'rgba(255,214,140,.7)' : 'rgba(255,255,255,.8)'; c.fillRect(x, y, 2, 2); }
    // port : yachts
    c.fillStyle = '#e8ecf5';
    for (let k = 0; k < 9; k++) { const x = W * (0.05 + k * 0.1 + rnd(k) * 0.03), y = hz - H * 0.02, w = W * 0.03; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w * 0.85, y + 6); c.lineTo(x + w * 0.1, y + 6); c.fill(); c.fillRect(x + w * 0.3, y - 6, w * 0.4, 6); }
    // tribunes
    c.fillStyle = '#171a2c';
    c.fillRect(0, hz - H * 0.07, W * 0.22, H * 0.07); c.fillRect(W * 0.78, hz - H * 0.07, W * 0.22, H * 0.07);
    for (let r = 0; r < 5; r++) for (let x = 4; x < W * 0.22; x += 6) {
      const col = ['#ff3b3b', '#ffd54a', '#ffffff', '#3b8bff'][(x / 6 + r) % 4 | 0];
      c.fillStyle = col; c.globalAlpha = 0.5; c.fillRect(x, hz - H * 0.065 + r * 6, 3, 3); c.fillRect(W - x, hz - H * 0.065 + r * 6, 3, 3);
    }
    c.globalAlpha = 1;
    // portique de départ à damier
    const gy = H * 0.3, gx0 = W * 0.36, gx1 = W * 0.64;
    c.fillStyle = '#20243a'; c.fillRect(gx0, gy, gx1 - gx0, H * 0.035); c.fillRect(gx0, gy, 6, hz - gy); c.fillRect(gx1 - 6, gy, 6, hz - gy);
    const sq = H * 0.0115;
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx * sq < gx1 - gx0; xx++) { c.fillStyle = (xx + yy) % 2 ? '#fff' : '#000'; c.fillRect(gx0 + xx * sq, gy + yy * sq, sq, sq); }
  },
  rave() { /* entièrement animé */ },
  western(c, W, H, hz) {
    // soleil couchant
    const sx = W * 0.62, sy = hz - H * 0.05, sr = Math.min(W, H) * 0.16;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, sr * 3);
    sg.addColorStop(0, 'rgba(255,220,140,.9)'); sg.addColorStop(0.3, 'rgba(255,150,60,.35)'); sg.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
    // mesas
    c.fillStyle = '#5a2a14';
    const mesa = (x, w, h) => { c.beginPath(); c.moveTo(x - w * 0.6, hz); c.lineTo(x - w * 0.45, hz - h * 0.4); c.lineTo(x - w * 0.4, hz - h); c.lineTo(x + w * 0.4, hz - h); c.lineTo(x + w * 0.45, hz - h * 0.4); c.lineTo(x + w * 0.6, hz); c.closePath(); c.fill(); };
    mesa(W * 0.18, W * 0.16, H * 0.2); mesa(W * 0.42, W * 0.08, H * 0.26); mesa(W * 0.85, W * 0.2, H * 0.16);
    c.fillStyle = '#3e1c0c'; c.fillRect(0, hz - H * 0.02, W, H * 0.02 + 2);
    // cactus saguaro
    c.fillStyle = '#20120a';
    const cactus = (x, h) => {
      const w = h * 0.14; c.fillRect(x - w / 2, hz - h, w, h); c.beginPath(); c.arc(x, hz - h, w / 2, 0, TAU); c.fill();
      c.fillRect(x - w * 2.2, hz - h * 0.55, w * 1.7, w * 0.8); c.fillRect(x - w * 2.2, hz - h * 0.8, w * 0.8, h * 0.3); c.beginPath(); c.arc(x - w * 1.8, hz - h * 0.8, w * 0.4, 0, TAU); c.fill();
      c.fillRect(x + w * 0.5, hz - h * 0.45, w * 1.6, w * 0.8); c.fillRect(x + w * 1.4, hz - h * 0.7, w * 0.8, h * 0.28); c.beginPath(); c.arc(x + w * 1.8, hz - h * 0.7, w * 0.4, 0, TAU); c.fill();
    };
    cactus(W * 0.08, H * 0.16); cactus(W * 0.93, H * 0.12); cactus(W * 0.3, H * 0.07);
  },
};

/* ======================================================================= ANIMÉ (derrière le décor) */
const BEHIND = {
  rainbow(ctx, W, H, hz, t) {
    // ruban arc-en-ciel flottant dans l'espace
    const cols = ['#ff3b57', '#ff9f1c', '#ffe14a', '#3ddc97', '#4cc9f0', '#9b6bff'];
    for (let i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i]; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(3, H * 0.008);
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 16) {
        const y = H * 0.36 + Math.sin(x * 0.004 + t * 0.0004) * H * 0.08 + i * H * 0.009 - x * 0.06;
        x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  orbit(ctx, W, H, hz, t) {
    // comètes
    for (let k = 0; k < 3; k++) {
      const p = ((t * 0.00006 + k / 3) % 1), x = W * (1.1 - p * 1.3), y = H * (0.05 + k * 0.08 + p * 0.2);
      const g = ctx.createLinearGradient(x, y, x + 160, y - 40);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 160, y - 40); ctx.stroke();
    }
  },
  desert(ctx, W, H, hz, t) {
    // soleil rouge géant voilé
    const sx = W * 0.5, sy = hz - H * 0.12, sr = Math.min(W, H) * 0.24;
    const g = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.2);
    g.addColorStop(0, 'rgba(255,190,90,.95)'); g.addColorStop(0.3, 'rgba(255,90,30,.55)'); g.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,210,140,.9)'; ctx.beginPath(); ctx.arc(sx, sy, sr * (0.98 + 0.02 * Math.sin(t * 0.002)), 0, TAU); ctx.fill();
  },
  tokyo(ctx, W, H, hz, t) {
    // halo violet de la ville
    const g = ctx.createLinearGradient(0, hz - H * 0.4, 0, hz);
    g.addColorStop(0, 'rgba(255,0,140,0)'); g.addColorStop(1, 'rgba(255,40,160,.35)');
    ctx.fillStyle = g; ctx.fillRect(0, hz - H * 0.4, W, H * 0.4);
  },
  paris(ctx, W, H, hz, t) {
    // grille synthwave du ciel
    ctx.strokeStyle = 'rgba(255,90,220,.12)'; ctx.lineWidth = 1;
    for (let y = H * 0.05; y < hz; y += H * 0.05) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  },
  monaco(ctx, W, H, hz, t) {
    // faisceaux des projecteurs
    ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 4; k++) {
      const ox = W * (0.1 + k * 0.27), a = -Math.PI / 2 + Math.sin(t * 0.0005 + k * 1.7) * 0.5, len = H;
      const g = ctx.createLinearGradient(ox, hz, ox + Math.cos(a) * len, hz + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(220,235,255,.22)'); g.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, hz);
      ctx.lineTo(ox + Math.cos(a - 0.06) * len, hz + Math.sin(a - 0.06) * len); ctx.lineTo(ox + Math.cos(a + 0.06) * len, hz + Math.sin(a + 0.06) * len); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  rave(ctx, W, H, hz, t, speed) {
    // tunnel de lumière pulsé
    const cx = W / 2, cy = H * 0.45, beat = (t * 0.002 * (1 + speed)) % 1;
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 14; i++) {
      const f = ((i + beat) / 14), r = f * f * Math.hypot(W, H) * 0.75;
      ctx.strokeStyle = `hsla(${(i * 37 + t * 0.06) % 360},100%,60%,${0.08 + f * 0.35})`;
      ctx.lineWidth = 2 + f * 10;
      ctx.beginPath();
      const sides = 6;
      for (let s = 0; s <= sides; s++) { const a = s / sides * TAU + t * 0.0003 * (i % 2 ? 1 : -1); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.62; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    // lasers
    for (let k = 0; k < 6; k++) {
      const a = Math.sin(t * 0.0007 + k) * 0.9 - Math.PI / 2, ox = W * (k / 5);
      ctx.strokeStyle = `hsla(${(k * 60 + t * 0.1) % 360},100%,60%,.35)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ox, H); ctx.lineTo(ox + Math.cos(a) * H * 1.4, H + Math.sin(a) * H * 1.4); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  western() {},
};

/* ======================================================================= ANIMÉ (devant le décor) */
const FRONT = {
  desert(ctx, W, H, hz, t) {
    // colonnes de feu de part et d'autre
    [[0.03, 0], [0.97, 1.3]].forEach(([fx, ph]) => {
      const x = W * fx;
      for (let k = 0; k < 7; k++) {
        const y = hz - k * H * 0.025 - ((t * 0.08 + k * 40) % (H * 0.02));
        const r = H * 0.03 * (1 - k / 8) * (0.8 + 0.3 * Math.sin(t * 0.01 + k + ph));
        ctx.fillStyle = `rgba(255,${120 + k * 18},40,${0.5 - k * 0.06})`;
        ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.004 + k) * 6, y, r, 0, TAU); ctx.fill();
      }
    });
  },
  tokyo(ctx, W, H, hz, t) {
    // enseignes néon clignotantes
    const signs = [[0.08, 0.18, '255,40,160'], [0.24, 0.26, '0,240,255'], [0.46, 0.2, '57,255,20'], [0.6, 0.3, '255,200,0'], [0.88, 0.22, '0,240,255'], [0.95, 0.12, '255,40,160']];
    signs.forEach(([fx, fy, col], i) => {
      const on = Math.sin(t * 0.004 + i * 2.1) > -0.6 || (t / 90 | 0) % 7 !== i;
      const x = W * fx, y = hz - H * fy, w = W * 0.012, h = H * 0.09;
      ctx.fillStyle = `rgba(${col},${on ? 0.9 : 0.15})`; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = on ? 14 : 0;
      ctx.fillRect(x, y, w, h);
      for (let k = 0; k < 3; k++) ctx.fillRect(x - w * 0.6, y + h * (0.15 + k * 0.28), w * 2.2, 3);
    });
    ctx.shadowBlur = 0;
  },
  paris(ctx, W, H, hz, t) {
    // tour Eiffel lumineuse (scintillement à intervalles)
    const x = W * 0.78, base = hz, h = H * 0.46, w = W * 0.07;
    const sparkle = (t % 12000) < 3000;
    ctx.strokeStyle = 'rgba(255,190,120,.95)'; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(255,170,90,1)'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x - w, base); ctx.quadraticCurveTo(x - w * 0.25, base - h * 0.45, x - w * 0.06, base - h * 0.9); ctx.lineTo(x, base - h);
    ctx.lineTo(x + w * 0.06, base - h * 0.9); ctx.quadraticCurveTo(x + w * 0.25, base - h * 0.45, x + w, base);
    ctx.moveTo(x - w * 0.62, base - h * 0.18); ctx.lineTo(x + w * 0.62, base - h * 0.18);
    ctx.moveTo(x - w * 0.36, base - h * 0.42); ctx.lineTo(x + w * 0.36, base - h * 0.42);
    ctx.moveTo(x - w * 0.5, base); ctx.quadraticCurveTo(x, base - h * 0.14, x + w * 0.5, base);
    ctx.stroke(); ctx.shadowBlur = 0;
    if (sparkle) for (let k = 0; k < 40; k++) {
      const f = rnd(k + ((t / 120) | 0)), yy = base - f * h * 0.95, half = w * (1 - f) * 0.9;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x + (rnd(k * 3 + ((t / 120) | 0)) - 0.5) * 2 * half, yy, 2, 2);
    }
    // phare rotatif
    const a = t * 0.0012;
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(x, base - h, x + Math.cos(a) * W * 0.5, base - h);
    g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, base - h);
    ctx.lineTo(x + Math.cos(a) * W * 0.5, base - h - H * 0.03); ctx.lineTo(x + Math.cos(a) * W * 0.5, base - h + H * 0.03); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
  monaco(ctx, W, H, hz, t) {
    // feux de départ sur le portique (s'allument en boucle)
    const gy = H * 0.3 + H * 0.042, x0 = W * 0.42, n = 5, cyc = (t % 6000) / 1000;
    for (let i = 0; i < n; i++) {
      const on = cyc > i * 0.7 && cyc < 4.2;
      ctx.fillStyle = on ? '#ff2020' : '#2a0d0d'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = on ? 16 : 0;
      ctx.beginPath(); ctx.arc(x0 + i * W * 0.04, gy, H * 0.012, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
  },
  western() {},
};

/* ======================================================================= PAR-DESSUS TOUT (grain, strobe…) */
const OVER = {
  western(ctx, W, H, t) {
    // grain de vieux film + rayures + vignettage sépia
    ctx.fillStyle = 'rgba(120,70,20,.10)'; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 90; k++) { ctx.fillStyle = `rgba(40,20,5,${rnd(k + t) * 0.25})`; ctx.fillRect(rnd(k * 7 + t) * W, rnd(k * 13 + t) * H, 2, 2); }
    if (rnd((t / 140) | 0) > 0.7) { ctx.fillStyle = 'rgba(255,240,210,.18)'; ctx.fillRect(rnd(((t / 140) | 0) + 1) * W, 0, 1.5, H); }
  },
  rave(ctx, W, H, t, speed) {
    const beat = (t * 0.002 * (1 + speed)) % 1;
    if (beat < 0.05) { ctx.fillStyle = `hsla(${(t * 0.1) % 360},100%,70%,.07)`; ctx.fillRect(0, 0, W, H); }
  },
  desert(ctx, W, H, t) {
    // voile de tempête de sable
    const g = ctx.createLinearGradient(0, 0, W, 0);
    const p = (t * 0.00005) % 1;
    g.addColorStop(0, 'rgba(200,110,50,0)'); g.addColorStop(p, 'rgba(200,110,50,.12)'); g.addColorStop(1, 'rgba(200,110,50,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
};
