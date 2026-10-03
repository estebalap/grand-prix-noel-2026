/* Showroom — 15 concept-cars procéduraux, un par écurie (Three.js r128 fourni en local, aucune dépendance).
   Pas de contrainte d'impression : carrosseries lissées (loft de super-ellipses), vernis multicouche (clearcoat),
   paillettes métallisées (normal map), carbone tissé, étriers derrière les jantes, LED émissives conformes à la
   carrosserie, halos lumineux et néon sous caisse. Tout est généré : zéro fichier à télécharger.
   Unités de construction : mètres. Le groupe final est mis à l'échelle K pour la scène du Showroom. */

const T = () => (typeof THREE !== 'undefined' ? THREE : window.THREE); // eslint-disable-line no-undef
/* r128 (projet) : couleurs hex en sRGB → conversion manuelle. r152+ : la gestion des couleurs le fait déjà. */
const lin = (hex) => { const C = T().Color, c = new C(hex); return T().ColorManagement && T().ColorManagement.enabled ? c : c.convertSRGBToLinear(); };
const setSRGB = (t) => { if ('colorSpace' in t && T().SRGBColorSpace) t.colorSpace = T().SRGBColorSpace; else t.encoding = T().sRGBEncoding; };
const TAU = Math.PI * 2;
const HALF = Math.PI / 2;
const K = 0.62;                                   // échelle mètres → scène
const sp = (t, e) => Math.sign(t) * Math.pow(Math.abs(t), 2 / e);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* =================================================================== textures procédurales (partagées) */
const TEX = new Map();
function tex(key, draw, { size = 256, w = size, h = size, repeat = null, srgb = true } = {}) {
  if (TEX.has(key)) return TEX.get(key);
  const THREE = T();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) setSRGB(t);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  TEX.set(key, t);
  return t;
}
function pixels(c, w, h, fn) {
  const img = c.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = fn(x / w, y / h); const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a === undefined ? 255 : a;
  }
  c.putImageData(img, 0, 0);
}
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const carbonTex = () => tex('carbon', (c, w) => {
  const n = 16, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const horiz = ((i + j) % 4) < 2;
    const g = horiz ? c.createLinearGradient(0, j * s, 0, (j + 1) * s) : c.createLinearGradient(i * s, 0, (i + 1) * s, 0);
    g.addColorStop(0, '#15171b'); g.addColorStop(0.5, '#3b4049'); g.addColorStop(1, '#15171b');
    c.fillStyle = g; c.fillRect(i * s, j * s, s, s);
  }
}, { repeat: [7, 7] });

const flakeTex = () => tex('flakes', (c, w, h) => { seed = 7; pixels(c, w, h, () => [128 + (rnd() - 0.5) * 70, 128 + (rnd() - 0.5) * 70, 255]); }, { size: 128, repeat: [10, 10], srgb: false });

const glowTex = () => tex('glow', (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
}, { size: 128 });

const underTex = () => tex('under', (c, w, h) => {
  c.translate(w / 2, h / 2); c.scale(1, h / w);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.55, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, w / 2, 0, TAU); c.fill();
}, { w: 256, h: 128 });

const shadowTex = () => tex('contact', (c, w, h) => {
  c.translate(w / 2, h / 2); c.scale(1, h / w);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.6, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, w / 2, 0, TAU); c.fill();
}, { w: 256, h: 128 });

/* formes des feux (alpha) : la couleur vient du matériau */
const LIGHT_SHAPES = {
  full: (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); roundRect(c, 4, h * 0.2, w - 8, h * 0.6, h * 0.3); c.fill(); },
  thin: (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); roundRect(c, 2, h * 0.38, w - 4, h * 0.24, h * 0.12); c.fill(); },
  dots2: (c, w, h) => { c.fillStyle = '#fff'; [0.28, 0.72].forEach((x) => { c.beginPath(); c.arc(w * x, h / 2, h * 0.38, 0, TAU); c.fill(); }); },
  dots1: (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.42, 0, TAU); c.fill(); },
  rings: (c, w, h) => { c.strokeStyle = '#fff'; c.lineWidth = h * 0.16; [0.27, 0.73].forEach((x) => { c.beginPath(); c.arc(w * x, h / 2, h * 0.32, 0, TAU); c.stroke(); }); c.fillRect(w * 0.42, h * 0.44, w * 0.16, h * 0.1); },
  slash: (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, h * 0.75); c.lineTo(w * 0.85, h * 0.25); c.lineTo(w, h * 0.25); c.lineTo(w * 0.15, h * 0.75); c.closePath(); c.fill(); },
  dash3: (c, w, h) => { c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { c.beginPath(); roundRect(c, w * (0.04 + i * 0.33), h * 0.35, w * 0.26, h * 0.3, h * 0.12); c.fill(); } },
  heart: (c, w, h) => { c.fillStyle = '#fff'; [0.3, 0.7].forEach((x) => heart(c, w * x, h * 0.55, h * 0.4)); },
  fang: (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, h * 0.3); c.lineTo(w, h * 0.42); c.lineTo(w * 0.62, h * 0.7); c.closePath(); c.fill(); },
  gills: (c, w, h) => { c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { c.beginPath(); roundRect(c, w * (0.08 + i * 0.3), h * 0.15, w * 0.08, h * 0.7, w * 0.04); c.fill(); } },
};
function roundRect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.45); c.bezierCurveTo(x - s * 1.1, y - s * 0.2, x - s * 0.45, y - s * 0.95, x, y - s * 0.4); c.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 1.1, y - s * 0.2, x, y + s * 0.45); c.fill(); }
const lightTex = (shape) => tex('L' + shape, (c, w, h) => LIGHT_SHAPES[shape](c, w, h), { w: 256, h: 64, srgb: false });

/* décors spécifiques */
const roundelTex = (num, bg, fg) => tex(`num${num}${bg}${fg}`, (c, w) => {
  c.fillStyle = fg; c.beginPath(); c.arc(w / 2, w / 2, w * 0.47, 0, TAU); c.fill();
  c.fillStyle = bg; c.beginPath(); c.arc(w / 2, w / 2, w * 0.41, 0, TAU); c.fill();
  c.fillStyle = fg; c.font = `900 ${w * 0.46}px "Arial Black", "Segoe UI", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(num).padStart(2, '0'), w / 2, w * 0.53);
});
const suitsTex = () => tex('suits', (c, w, h) => {
  c.font = `900 ${h * 0.7}px "Segoe UI Symbol", "DejaVu Sans", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  ['♠', '♥', '♣', '♦'].forEach((s, i) => { c.fillStyle = i % 2 ? '#f3e8ff' : '#7e22ce'; c.fillText(s, w * (0.125 + i * 0.25), h * 0.55); });
}, { w: 512, h: 128 });
const clawTex = () => tex('claw', (c, w, h) => {
  c.fillStyle = '#dc2626';
  for (let i = 0; i < 3; i++) { const x = w * (0.18 + i * 0.26); c.beginPath(); c.moveTo(x, h * 0.05); c.quadraticCurveTo(x + w * 0.16, h * 0.5, x + w * 0.02, h * 0.95); c.quadraticCurveTo(x + w * 0.08, h * 0.5, x - w * 0.04, h * 0.08); c.closePath(); c.fill(); }
}, { w: 256, h: 256 });
const splatTex = () => tex('splat', (c, w, h) => {
  seed = 99;
  const blob = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let a = 0; a <= TAU + 0.01; a += TAU / 22) { const rr = r * (0.7 + rnd() * 0.5); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill();
    for (let k = 0; k < 7; k++) { const a = rnd() * TAU, d = r * (1.2 + rnd() * 0.9); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + rnd() * 0.14), 0, TAU); c.fill(); } };
  blob(w * 0.3, h * 0.5, h * 0.3, '#dc2626'); blob(w * 0.66, h * 0.42, h * 0.22, '#f5f5f5'); blob(w * 0.85, h * 0.62, h * 0.12, '#dc2626');
}, { w: 512, h: 256 });
const scalesTex = () => tex('scales', (c, w, h) => {
  c.fillStyle = '#d7f7fb'; c.fillRect(0, 0, w, h);
  const s = w / 8;
  for (let row = -1; row < h / (s * 0.5) + 1; row++) for (let i = -1; i < 9; i++) {
    const x = i * s + (row % 2 ? s / 2 : 0), y = row * s * 0.5;
    const g = c.createRadialGradient(x, y + s * 0.2, s * 0.05, x, y, s * 0.62);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#bfeff6'); g.addColorStop(1, '#7fd3e2');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, s * 0.56, 0, Math.PI); c.fill();
  }
}, { size: 256, repeat: [9, 3] });
const cracksTex = () => tex('cracks', (c, w, h) => {
  c.fillStyle = '#000'; c.fillRect(0, 0, w, h); seed = 666;
  c.strokeStyle = '#fff'; c.lineCap = 'round';
  for (let k = 0; k < 14; k++) {
    let x = rnd() * w, y = rnd() * h; c.lineWidth = 1 + rnd() * 3; c.beginPath(); c.moveTo(x, y);
    for (let s = 0; s < 9; s++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.3) * 40; c.lineTo(x, y); }
    c.stroke();
  }
}, { size: 512, repeat: [2, 1] });
const candyTex = () => tex('candy', (c, w, h) => pixels(c, w, h, (u, v) => {
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy); if (r > 0.5) return [0, 0, 0, 0];
  const a = Math.atan2(dy, dx) + r * 9; const k = Math.floor(((a + 20 * Math.PI) / TAU) * 10) % 2;
  return k ? [255, 250, 252] : [236, 72, 153];
}), { size: 256 });
const vinylTex = () => tex('vinyl', (c, w, h) => pixels(c, w, h, (u, v) => {
  const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy);
  if (r > 0.5) return [0, 0, 0, 0];
  if (r < 0.03) return [20, 20, 22];
  if (r < 0.16) return r < 0.15 ? [249, 115, 22] : [126, 34, 206];
  const groove = 18 + 10 * Math.sin(r * 900) + 26 * Math.pow(Math.abs(Math.cos(Math.atan2(dy, dx) * 1)), 30);
  return [groove, groove, groove + 4];
}), { size: 256 });
const cymbalTex = () => tex('cymbal', (c, w, h) => pixels(c, w, h, (u, v) => {
  const r = Math.hypot(u - 0.5, v - 0.5); if (r > 0.5) return [0, 0, 0, 0];
  const k = 0.82 + 0.18 * Math.sin(r * 520) + (r < 0.12 ? 0.1 : 0);
  return [255 * k, 214 * k, 120 * k];
}), { size: 256 });
const gogoTex = () => tex('gogo', (c, w) => {
  c.font = `900 ${w * 0.8}px "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Hiragino Sans", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = '#c084fc'; c.shadowBlur = w * 0.12; c.fillStyle = '#e9d5ff'; c.fillText('ゴ', w / 2, w / 2);
  c.shadowBlur = 0; c.fillStyle = '#7c3aed'; c.fillText('ゴ', w / 2, w / 2);
}, { size: 128 });

/* =================================================================== géométrie : loft de super-ellipses */
function catmull(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }

/** Échantillonneur de carrosserie : stations [x, demi-largeur, bas, ligne d'épaule, haut, exposant, zCentre?].
    Les passages de roue sont découpés en arcs de cercle (bas relevé autour de chaque roue « arch »). */
function sampler(stations, wheels = []) {
  const S = stations.map((s) => [s[0], s[1], s[2], s[3], s[4], s[5] ?? 4, s[6] ?? 0]).sort((a, b) => a[0] - b[0]);
  const x0 = S[0][0], x1 = S[S.length - 1][0];
  const arches = wheels.filter((w) => w.arch);
  function at(x) {
    x = clamp(x, x0, x1);
    let i = 0; while (i < S.length - 2 && x > S[i + 1][0]) i++;
    const a = S[i], b = S[i + 1], pa = S[i - 1] || a, pb = S[i + 2] || b;
    const t = (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
    const v = [1, 2, 3, 4, 5, 6].map((k) => catmull(pa[k], a[k], b[k], pb[k], t));
    let [w, yb, ym, yt, e, zc] = v;
    w = Math.max(0.004, w); e = clamp(e, 1.6, 12);
    ym = Math.max(ym, yb + 0.02); yt = Math.max(yt, ym + 0.01);
    for (const wh of arches) {
      const R = wh.r * 1.12 + 0.025, d = x - wh.x;
      if (Math.abs(d) < R) yb = Math.max(yb, Math.min(wh.r + Math.sqrt(R * R - d * d), ym - 0.04));
    }
    return { w, yb, ym, yt, e, zc };
  }
  function pt(x, th, lift = 0) {
    const p = at(x); const c = Math.cos(th), s = Math.sin(th);
    const z = p.zc + (p.w + lift) * sp(c, p.e);
    const y = s >= 0 ? p.ym + (p.yt - p.ym + lift) * sp(s, p.e) : p.ym + (p.ym - p.yb + lift) * sp(s, p.e);
    return [x, y, z];
  }
  const top = (x, frac = 0) => { const p = at(x); return p.ym + (p.yt - p.ym) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(frac), p.e)), 1 / p.e); };
  /** hauteur du dessus à la cote absolue z (‑∞ hors de la pièce) */
  const topz = (x, z = 0) => { if (x < x0 || x > x1) return -Infinity; const p = at(x); const f = (z - p.zc) / p.w; return Math.abs(f) > 1 ? -Infinity : top(x, f); };
  return { at, pt, top, topz, x0, x1 };
}

function loftGeometry(S, { rings = 90, seg = 40, x0 = S.x0, x1 = S.x1 } = {}) {
  const THREE = T();
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const x = lerp(x0, x1, i / rings);
    for (let j = 0; j <= seg; j++) {
      const th = -HALF + (TAU * j) / seg;
      const p = S.pt(x, th); pos.push(...p); uv.push(i / rings, j / seg);
    }
  }
  const row = seg + 1;
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = (i + 1) * row + j, c = (i + 1) * row + j + 1, d = i * row + j + 1;
    idx.push(a, b, d, b, c, d);
  }
  // bouchons avant/arrière (sommets dupliqués : normales franches)
  [[x0, -1], [x1, 1]].forEach(([x, dir]) => {
    const p = S.at(x); const base = pos.length / 3;
    pos.push(x, (p.yb + p.yt) / 2, p.zc); uv.push(0.5, 0.5);
    for (let j = 0; j <= seg; j++) { pos.push(...S.pt(x, -HALF + (TAU * j) / seg)); uv.push(0.5, 0.5); }
    for (let j = 0; j < seg; j++) { if (dir < 0) idx.push(base, base + 1 + j, base + 2 + j); else idx.push(base, base + 2 + j, base + 1 + j); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Panneau conforme posé sur la carrosserie (bande de peinture, capot carbone, feu, numéro…).
    th0..th1 : angle autour de la section (0 = flanc droit, π/2 = dessus, π = flanc gauche). */
function patchGeometry(S, { x0, x1, th0, th1, lift = 0.006, nx = 28, nt = 12, flip = false, snap = 0 }) {
  const THREE = T();
  let ths = [];
  if (snap) { // carrosserie à facettes : on suit exactement les sommets de la coque
    const step = TAU / snap; const k0 = Math.ceil((th0 + HALF) / step - 1e-6), k1 = Math.floor((th1 + HALF) / step + 1e-6);
    for (let k = k0; k <= k1; k++) ths.push(-HALF + k * step);
    if (ths.length < 2) ths = [th0, th1];
  } else for (let j = 0; j <= nt; j++) ths.push(lerp(th0, th1, j / nt));
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nx; i++) {
    const x = lerp(x0, x1, i / nx);
    ths.forEach((th, j) => { pos.push(...S.pt(x, th, lift)); const u = i / nx, v = j / (ths.length - 1); uv.push(flip ? 1 - u : u, flip ? 1 - v : v); });
  }
  const row = ths.length;
  for (let i = 0; i < nx; i++) for (let j = 0; j < row - 1; j++) {
    const a = i * row + j, b = (i + 1) * row + j, c = (i + 1) * row + j + 1, d = i * row + j + 1;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Tube effilé le long d'une courbe (cornes, flèche de grue, halo, échappements cintrés). */
function taperTube(points, r0, r1, { tubular = 28, radial = 10, closed = false } = {}) {
  const THREE = T();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  const fr = curve.computeFrenetFrames(tubular, closed);
  const pos = [], idx = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular, P = curve.getPointAt(t), r = lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, N = fr.normals[i], B = fr.binormals[i];
      pos.push(P.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), P.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y), P.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z));
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function extrudeXY(pts, depth, { bevel = 0.006 } = {}) {
  const THREE = T();
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  return g;
}
const airfoil = (chord, th) => { const p = []; for (let i = 0; i <= 12; i++) { const t = i / 12; p.push([chord * (0.5 - t), th * 0.5 * (1 - Math.pow(2 * t - 1, 2)) * (t < 0.25 ? 1.35 : 1)]); } for (let i = 12; i >= 0; i--) { const t = i / 12; p.push([chord * (0.5 - t), -th * 0.18 * (1 - Math.pow(2 * t - 1, 2))]); } return p; };

/* =================================================================== matériaux */
function makeMaterials(spec, q) {
  const THREE = T();
  const fin = spec.finish || 'gloss';
  const paintOpts = {
    gloss: { metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 },
    pearl: { metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.03 },
    satin: { metalness: 0.4, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.4 },
    matte: { metalness: 0.22, roughness: 0.68, clearcoat: 0, clearcoatRoughness: 1 },
  }[fin];
  const flakes = q !== 'low' && fin !== 'matte' ? { normalMap: flakeTex(), normalScale: new THREE.Vector2(0.12, 0.12) } : {};
  const paint = new THREE.MeshPhysicalMaterial({ color: lin(spec.paint), envMapIntensity: 1.15, ...paintOpts, ...flakes, flatShading: !!spec.facets });
  if (spec.paintMap === 'scales') { paint.map = scalesTex(); }
  if (spec.paintGlow === 'cracks') { paint.emissive = lin(spec.glow); paint.emissiveMap = cracksTex(); paint.emissiveIntensity = 1.4; }
  const accent = new THREE.MeshPhysicalMaterial({ color: lin(spec.accent), envMapIntensity: 1.1, ...(fin === 'matte' ? paintOpts : { metalness: 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }), flatShading: !!spec.facets });
  const carbon = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: carbonTex(), metalness: 0.3, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1, flatShading: !!spec.facets });
  const glass = new THREE.MeshPhysicalMaterial({ color: lin(spec.glass || '#0a1022'), metalness: 0.15, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9, flatShading: !!spec.facets });
  if (spec.glassGlow) { glass.emissive = lin(spec.glassGlow); glass.emissiveIntensity = 0.35; }
  const chrome = new THREE.MeshStandardMaterial({ color: lin('#e8edf3'), metalness: 1, roughness: 0.07, envMapIntensity: 1.4 });
  const gold = new THREE.MeshStandardMaterial({ color: lin('#f2b53c'), metalness: 1, roughness: 0.18, envMapIntensity: 1.3 });
  const dark = new THREE.MeshStandardMaterial({ color: lin('#0b0c10'), metalness: 0.2, roughness: 0.75, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: lin('#141518'), metalness: 0, roughness: 0.88, side: THREE.DoubleSide });
  const rimC = spec.rimColor || 'chrome';
  const rim = rimC === 'chrome' ? chrome : rimC === 'gold' ? gold
    : new THREE.MeshPhysicalMaterial({ color: lin(rimC), metalness: 0.85, roughness: 0.28, clearcoat: 0.6, envMapIntensity: 1.2 });
  const disc = new THREE.MeshStandardMaterial({ color: lin('#8d939b'), metalness: 0.95, roughness: 0.32, envMapIntensity: 1 });
  const caliper = new THREE.MeshPhysicalMaterial({ color: lin(spec.caliper || spec.accent), metalness: 0.2, roughness: 0.3, clearcoat: 1, envMapIntensity: 1 });
  const white = new THREE.MeshStandardMaterial({ color: lin('#f4f1ea'), roughness: 0.6 });
  const glowCol = lin(spec.glow || spec.accent);
  const neon = new THREE.MeshBasicMaterial({ color: glowCol.clone().multiplyScalar(1.6), toneMapped: false });
  return { paint, accent, carbon, glass, chrome, gold, dark, rubber, rim, disc, caliper, white, neon, glowCol };
}
function lightMat(color, shape, intensity = 2.6) {
  const THREE = T();
  return new THREE.MeshBasicMaterial({ color: lin(color).multiplyScalar(intensity), alphaMap: lightTex(shape), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
}
function decalMat(map) {
  const THREE = T();
  return new THREE.MeshPhysicalMaterial({ map, transparent: true, alphaTest: 0.02, metalness: 0.2, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
}

/* =================================================================== roues */
function rimShape(THREE, rr, st) {
  const s = new THREE.Shape(); s.absarc(0, 0, rr, 0, TAU, false);
  const kind = st.kind || 'spokes', n = st.n || 5, hub = rr * (st.hub || 0.27), out = rr * 0.86;
  if (kind === 'spokes' || kind === 'turbine' || kind === 'shuriken' || kind === 'mesh') {
    const sw = (st.sw ?? 0.32) * rr, tw = st.twist || 0;
    for (let i = 0; i < n; i++) {
      const a0 = (i * TAU) / n, a1 = ((i + 1) * TAU) / n;
      const ai0 = a0 + sw / hub / 2, ai1 = a1 - sw / hub / 2, ao0 = a0 + sw / out / 2 + tw, ao1 = a1 - sw / out / 2 + tw;
      if (ai1 <= ai0 + 0.02 || ao1 <= ao0 + 0.02) continue;
      const h = new THREE.Path();
      h.moveTo(hub * Math.cos(ai0), hub * Math.sin(ai0));
      h.absarc(0, 0, hub, ai0, ai1, false);
      h.lineTo(out * Math.cos(ao1), out * Math.sin(ao1));
      h.absarc(0, 0, out, ao1, ao0, true);
      h.closePath(); s.holes.push(h);
    }
  } else if (kind === 'daisy') {
    for (let i = 0; i < n; i++) { const a = (i * TAU) / n; const h = new THREE.Path(); h.absellipse(Math.cos(a) * rr * 0.56, Math.sin(a) * rr * 0.56, rr * 0.25, rr * 0.1, 0, TAU, false, a); s.holes.push(h); }
  } else if (kind === 'disc') {
    for (let i = 0; i < n; i++) { const a = (i * TAU) / n; const h = new THREE.Path(); h.absellipse(Math.cos(a) * rr * 0.66, Math.sin(a) * rr * 0.66, rr * 0.12, rr * 0.05, 0, TAU, false, a + HALF * 0.6); s.holes.push(h); }
  }
  return s;
}

function buildWheel(m, { r, tw, rim: st = {} }, q) {
  const THREE = T();
  const g = new THREE.Group(), h = tw / 2, rr = r * (st.size || 0.68);
  const seg = q === 'low' ? 28 : 44;
  const prof = [[rr * 0.97, -h], [r - 0.04, -h], [r - 0.012, -h + 0.018], [r, -h + 0.06], [r, h - 0.06], [r - 0.012, h - 0.018], [r - 0.04, h], [rr * 0.97, h]];
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), seg), m.rubber);
  tire.rotation.x = HALF; g.add(tire);
  if (st.knobby && q !== 'low') {
    const n = 26, lug = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.05, h * 0.82), m.rubber, n * 2), o = new THREE.Object3D();
    for (let i = 0; i < n * 2; i++) { const a = (i * TAU) / n + (i >= n ? TAU / n / 2 : 0), zz = (i >= n ? -1 : 1) * h * 0.45; o.position.set(Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012), zz); o.rotation.set(0, 0, a); o.updateMatrix(); lug.setMatrixAt(i, o.matrix); }
    g.add(lug);
  }
  if (st.whitewall) { const ww = new THREE.Mesh(new THREE.RingGeometry(r * 0.74, r * 0.86, seg), m.white); ww.position.z = h + 0.002; g.add(ww); }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.97, rr * 0.97, tw * 0.86, seg, 1, true), m.dark); barrel.rotation.x = HALF; g.add(barrel);
  // frein : disque + étrier coloré, visible à travers les branches
  const dsk = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.8, rr * 0.8, 0.026, 36), m.disc); dsk.rotation.x = HALF; dsk.position.z = h * 0.15; g.add(dsk);
  const cal = new THREE.Shape(); cal.absarc(0, 0, rr * 0.86, 0.35, 1.45, false); cal.absarc(0, 0, rr * 0.56, 1.45, 0.35, true);
  const calM = new THREE.Mesh(new THREE.ExtrudeGeometry(cal, { depth: 0.085, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 10 }), m.caliper);
  calM.position.z = h * 0.15 - 0.03; g.add(calM);
  // face de jante
  const kind = st.kind || 'spokes', depth = 0.035;
  if (kind === 'vinyl' || kind === 'candy' || kind === 'cymbal') {
    const map = kind === 'vinyl' ? vinylTex() : kind === 'candy' ? candyTex() : cymbalTex();
    const face = new THREE.Mesh(new THREE.CircleGeometry(rr * 0.98, seg), new THREE.MeshPhysicalMaterial({ map, metalness: kind === 'cymbal' ? 1 : 0.3, roughness: kind === 'cymbal' ? 0.25 : 0.35, clearcoat: 1, envMapIntensity: 1.2 }));
    face.position.z = h - 0.02; g.add(face);
  } else {
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape(THREE, rr * 0.98, st), { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: q === 'low' ? 18 : 30 }), m.rim);
    face.position.z = h - depth - 0.03; g.add(face);
    if (kind === 'mesh') { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.6, 0.012, 6, 40), m.rim); ring.position.z = h - 0.03; g.add(ring); }
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.975, 0.014, 8, seg), st.lip ? m.accent : m.rim); lip.position.z = h - 0.02; g.add(lip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.13, rr * 0.15, 0.05, 20), st.capAccent ? m.accent : m.chrome); cap.rotation.x = HALF; cap.position.z = h - 0.015; g.add(cap);
  if (kind !== 'vinyl' && kind !== 'candy' && kind !== 'cymbal') for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5, nut = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 6), m.chrome);
    nut.rotation.x = HALF; nut.position.set(Math.cos(a) * rr * 0.2, Math.sin(a) * rr * 0.2, h - 0.02); g.add(nut);
  }
  return g;
}

/* =================================================================== aides de pose */
function mesh(g, mat, parent, { pos, rot, scale, shadow = true } = {}) {
  const m = new (T().Mesh)(g, mat);
  if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (scale) m.scale.set(...scale);
  m.castShadow = shadow; parent.add(m); return m;
}
const box = (w, h, d) => new (T().BoxGeometry)(w, h, d);
const cyl = (r0, r1, h, s = 20, open = false) => new (T().CylinderGeometry)(r0, r1, h, s, 1, open);
const sym = (fn) => { fn(1); fn(-1); };
/** Vue « dessus » combinée caisse + habitacle, pour poser les accessoires sur le point le plus haut. */
function withCabin(S, C) {
  if (!C) return S;
  const topz = (x, z = 0) => Math.max(S.topz(x, z), C.topz(x, z));
  return { ...S, topz, top: (x, f = 0) => { const v = topz(x, f * S.at(x).w); return v === -Infinity ? S.top(x, f) : v; } };
}

function addPatch(car, S, mat, o, { snap = 0 } = {}) {
  const both = o.mirror !== false && !(o.th0 < HALF && o.th1 > HALF) && o.th1 <= HALF + 1e-6;
  mesh(patchGeometry(S, { ...o, snap }), mat, car, { shadow: false });
  if (both) mesh(patchGeometry(S, { ...o, th0: Math.PI - o.th1, th1: Math.PI - o.th0, flip: true, snap }), mat, car, { shadow: false });
}
function addLight(car, S, o, glows) {
  const mat = lightMat(o.color, o.shape || 'full', o.intensity || 1.8);
  addPatch(car, S, mat, { ...o, lift: 0.008, nx: 14, nt: 8 });
  if (o.glow !== false) {
    const THREE = T();
    const pts = o.th1 <= HALF + 1e-6 && !(o.th0 < HALF && o.th1 > HALF) && o.mirror !== false ? [1, -1] : [0];
    pts.forEach((side) => {
      const th = side === 0 ? (o.th0 + o.th1) / 2 : side > 0 ? (o.th0 + o.th1) / 2 : Math.PI - (o.th0 + o.th1) / 2;
      const p = S.pt((o.x0 + o.x1) / 2, th, 0.06);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: lin(o.color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 }));
      sprite.position.set(...p); const s = o.glowSize || 0.7; sprite.scale.set(s, s * 0.6, 1); car.add(sprite); glows.push(sprite);
    });
  }
}

/* =================================================================== kit d'accessoires */
const KIT = {
  wing(car, S, m, o) { // aileron : profil + pylônes (ou col de cygne) + dérives
    const mat = m[o.mat || 'carbon'];
    const w = mesh(extrudeXY(airfoil(o.chord, o.th || 0.07), o.span, { bevel: 0.006 }), mat, car, { pos: [o.x, o.y, 0], rot: [0, 0, o.tilt ?? 0.12] });
    sym((s) => mesh(box(o.chord * 1.15, o.plate || 0.2, 0.018), m[o.plateMat || 'accent'], car, { pos: [o.x, o.y + 0.05 - (o.plate || 0.2) / 2, s * (o.span / 2 + 0.01)] }));
    const pz = o.pz ?? o.span * 0.28;
    sym((s) => {
      const base = S.top(o.px ?? o.x, (s * pz) / Math.max(0.05, S.at(o.px ?? o.x).w));
      if (o.swan) mesh(taperTube([[o.x - 0.05, o.y + 0.06, s * pz], [o.x + 0.06, o.y + 0.12, s * pz], [o.x + 0.12, (o.y + base) / 2, s * pz], [o.px ?? o.x, base - 0.02, s * pz]], 0.022, 0.03, { tubular: 16, radial: 8 }), m.carbon, car);
      else { const hgt = o.y - base + 0.04; mesh(box(0.1, hgt, 0.02), m.carbon, car, { pos: [o.px ?? o.x, base + hgt / 2 - 0.02, s * pz] }); }
    });
    return w;
  },
  splitter(car, S, m, o) { // lame trapézoïdale qui épouse le nez (jamais plus large que la caisse)
    const back = o.back || 0.35, xb = S.x1 - back, pb = S.at(xb), pf = S.at(S.x1 - 0.02);
    const wb = pb.w * 0.97, wf = Math.max(0.12, pf.w * 0.92), xf = S.x1 + (o.out ?? 0.04);
    mesh(extrudeXY([[xb, -wb], [xf, -wf], [xf, wf], [xb, wb]], 0.02, { bevel: 0.004 }), m[o.mat || 'carbon'], car, { pos: [0, Math.min(pb.yb, pf.yb) - 0.005, 0], rot: [HALF, 0, 0] });
  },
  diffuser(car, S, m, o) { const p = S.at(S.x0 + 0.25); for (let i = -2; i <= 2; i++) mesh(box(0.42, 0.12, 0.016), m.carbon, car, { pos: [S.x0 + 0.17, p.yb - 0.05, i * p.w * 0.32], rot: [0, 0, -0.18] }); mesh(box(0.42, 0.018, p.w * 1.6), m.carbon, car, { pos: [S.x0 + 0.17, p.yb - 0.01, 0], rot: [0, 0, -0.18] }); },
  canards(car, S, m) { sym((s) => [0, 1].forEach((k) => { const x = S.x1 - 0.32 - k * 0.08, p = S.at(x); mesh(box(0.2, 0.012, 0.13), m.carbon, car, { pos: [x, p.yb + 0.1 + k * 0.08, s * (p.w + 0.04)], rot: [s * -0.15, 0.25 * s, 0.12] }); })); },
  skirts(car, S, m, o) { sym((s) => { const x = (o.x0 + o.x1) / 2, p = S.at(x); mesh(box(o.x1 - o.x0, 0.05, 0.06), m[o.mat || 'carbon'], car, { pos: [x, p.yb + 0.01, s * (p.w - 0.01)] }); }); },
  neonTubes(car, S, m, o) { sym((s) => { const x = (o.x0 + o.x1) / 2, p = S.at(x); mesh(cyl(0.012, 0.012, o.x1 - o.x0, 8), m.neon, car, { pos: [x, p.yb - 0.02, s * (p.w - 0.08)], rot: [0, 0, HALF], shadow: false }); }); },
  sharkfin(car, S, m, o) { const pts = [[o.x0, S.top(o.x0) - 0.03], [o.x0 - 0.15, S.top(o.x0) + o.h * 0.5], [o.x1 + 0.15, o.y1 ?? (S.top(o.x1) + o.h)], [o.x1, o.y1 ?? (S.top(o.x1) + o.h)], [o.x1, S.top(o.x1) - 0.03]]; mesh(extrudeXY(pts, 0.022, { bevel: 0.004 }), m[o.mat || 'paint'], car); },
  roofScoop(car, S, m, o) { const y = S.top(o.x); mesh(box(0.36, 0.1, 0.32), m[o.mat || 'carbon'], car, { pos: [o.x, y + 0.03, 0] }); mesh(box(0.02, 0.07, 0.26), m.dark, car, { pos: [o.x + 0.18, y + 0.04, 0] }); },
  hoodScoop(car, S, m, o) { const y = S.top(o.x); mesh(box(0.5, 0.06, 0.4), m[o.mat || 'carbon'], car, { pos: [o.x, y + 0.005, 0], rot: [0, 0, -0.06] }); mesh(box(0.02, 0.05, 0.34), m.dark, car, { pos: [o.x + 0.25, y + 0.01, 0] }); },
  louvers(car, S, m, o) { for (let i = 0; i < o.n; i++) { const x = lerp(o.x0, o.x1, i / (o.n - 1)); mesh(box(0.04, 0.025, S.at(x).w * 1.3), m[o.mat || 'carbon'], car, { pos: [x, S.top(x) + 0.03, 0], rot: [0, 0, -0.5] }); } },
  lightbar(car, S, m, o, glows) {
    const y = S.top(o.x) + 0.06; mesh(box(0.08, 0.06, o.span), m.dark, car, { pos: [o.x, y, 0] });
    for (let i = 0; i < o.n; i++) { const z = lerp(-o.span / 2 + 0.07, o.span / 2 - 0.07, i / (o.n - 1)); mesh(cyl(0.05, 0.05, 0.03, 18), new (T().MeshBasicMaterial)({ color: lin(o.color).multiplyScalar(1.8), toneMapped: false }), car, { pos: [o.x + 0.045, y, z], rot: [0, 0, HALF], shadow: false });
      const sp2 = new (T().Sprite)(new (T().SpriteMaterial)({ map: glowTex(), color: lin(o.color), transparent: true, blending: T().AdditiveBlending, depthWrite: false, opacity: 0.8 })); sp2.position.set(o.x + 0.1, y, z); sp2.scale.set(0.35, 0.35, 1); car.add(sp2); glows.push(sp2); }
  },
  mudflaps(car, S, m, o) { o.xs.forEach((x) => sym((s) => { const p = S.at(x); mesh(box(0.012, 0.22, 0.26), m.accent, car, { pos: [x, 0.15, s * (p.w - 0.16)] }); })); },
  exhausts(car, S, m, o, glows, ticks) {
    const pts = o.side ? null : true;
    const tips = [];
    for (let i = 0; i < o.n; i++) {
      const dz = (i - (o.n - 1) / 2) * (o.gap || 0.12);
      const zz = o.side ? (o.z ?? S.at(o.x).w + 0.04) : (o.z ?? 0) + dz;
      const doSide = (s) => {
        const pos = o.side ? [o.x - dz * 2.5, o.y, s * zz] : [S.x0 - 0.02, o.y, s * zz];
        const tube = mesh(cyl(o.r, o.r * 1.1, o.len || 0.22, 18, true), m.chrome, car, { pos, rot: [0, 0, HALF] });
        tube.material.side = T().DoubleSide;
        const tip = mesh(new (T().CircleGeometry)(o.r * 0.9, 18), new (T().MeshBasicMaterial)({ color: lin(o.glowColor || '#ff7a1a').multiplyScalar(1.4), toneMapped: false }), car, { pos: [pos[0] - (o.len || 0.22) / 2 - 0.001, pos[1], pos[2]], rot: [0, -HALF, 0], shadow: false });
        tips.push(tip);
      };
      if (o.side || o.mirror) sym(doSide); else doSide(1);
    }
    if (o.flame) tips.forEach((tip) => {
      const f = mesh(new (T().ConeGeometry)(o.r * 0.9, 0.35, 14, 1, true), new (T().MeshBasicMaterial)({ color: lin('#ff6a1a').multiplyScalar(1.5), transparent: true, opacity: 0.75, blending: T().AdditiveBlending, depthWrite: false, toneMapped: false, side: T().DoubleSide }), car, { pos: [tip.position.x - 0.18, tip.position.y, tip.position.z], rot: [0, 0, HALF], shadow: false });
      ticks.push((t) => { const k = 0.7 + 0.3 * Math.sin(t * 31 + tip.position.z * 9) * Math.sin(t * 17); f.scale.set(1, k, 1); f.position.x = tip.position.x - 0.175 * k; });
    });
    return pts;
  },
  blower(car, S, m, o) {
    const y = S.top(o.x);
    mesh(box(0.5, 0.2, 0.36), m.chrome, car, { pos: [o.x, y + 0.09, 0] });
    mesh(box(0.56, 0.06, 0.42), m.accent, car, { pos: [o.x, y + 0.22, 0] });
    sym((s) => mesh(cyl(0.065, 0.075, 0.2, 18, true), m.chrome, car, { pos: [o.x, y + 0.34, s * 0.1] }));
    mesh(box(0.06, 0.16, 0.3), m.dark, car, { pos: [o.x + 0.28, y + 0.06, 0] });
  },
  bucketLights(car, S, m, o, glows) { sym((s) => { const p = [o.x, o.y, s * o.z]; mesh(cyl(0.012, 0.012, 0.2, 8), m.chrome, car, { pos: [o.x - 0.06, o.y - 0.12, s * o.z] }); const b = mesh(new (T().SphereGeometry)(0.11, 20, 14, 0, TAU, 0, HALF), m.chrome, car, { pos: p, rot: [0, 0, -HALF] }); b.material.side = T().DoubleSide; mesh(new (T().CircleGeometry)(0.1, 20), new (T().MeshBasicMaterial)({ color: lin('#fff3cf').multiplyScalar(1.8), toneMapped: false }), car, { pos: [o.x + 0.001, o.y, s * o.z], rot: [0, HALF, 0], shadow: false }); const g2 = new (T().Sprite)(new (T().SpriteMaterial)({ map: glowTex(), color: lin('#fff0c0'), transparent: true, blending: T().AdditiveBlending, depthWrite: false })); g2.position.set(o.x + 0.08, o.y, s * o.z); g2.scale.set(0.5, 0.5, 1); car.add(g2); glows.push(g2); }); },
  openArms(car, S, m, o) { o.wheels.forEach((wh) => sym((s) => { const p = S.at(wh.x); [-0.08, 0.08].forEach((dy) => mesh(taperTube([[wh.x + 0.04, p.ym + dy * 0.5 - 0.05, s * p.w * 0.7], [wh.x, wh.r + dy, s * (wh.z - wh.tw * 0.3)]], 0.016, 0.016, { tubular: 2, radial: 6 }), m[o.mat || 'carbon'], car)); })); },
  fenderCaps(car, S, m, o) { o.wheels.forEach((wh) => sym((s) => { const g = new (T().CylinderGeometry)(wh.r * 1.18, wh.r * 1.18, wh.tw * 1.15, 22, 1, true, Math.PI - 1.3, 2.6); mesh(g, m[o.mat || 'paint'], car, { pos: [wh.x, wh.r, s * wh.z], rot: [HALF, 0, 0] }); })); },
  thruster(car, S, m, o, glows, ticks) {
    const p = S.at(S.x0 + 0.05);
    mesh(cyl(o.r * 1.15, o.r, 0.3, 24, true), m.carbon, car, { pos: [S.x0 + 0.05, o.y, 0], rot: [0, 0, HALF] }).material.side = T().DoubleSide;
    const core = mesh(new (T().CircleGeometry)(o.r * 0.95, 24), new (T().MeshBasicMaterial)({ color: lin(o.color).multiplyScalar(1.7), toneMapped: false }), car, { pos: [S.x0 - 0.1, o.y, 0], rot: [0, -HALF, 0], shadow: false });
    const flame = mesh(new (T().ConeGeometry)(o.r * 0.85, 0.7, 20, 1, true), new (T().MeshBasicMaterial)({ color: lin(o.color).multiplyScalar(1.4), transparent: true, opacity: 0.55, blending: T().AdditiveBlending, depthWrite: false, toneMapped: false, side: T().DoubleSide }), car, { pos: [S.x0 - 0.45, o.y, 0], rot: [0, 0, HALF], shadow: false });
    const sprite = new (T().Sprite)(new (T().SpriteMaterial)({ map: glowTex(), color: lin(o.color), transparent: true, blending: T().AdditiveBlending, depthWrite: false })); sprite.position.set(S.x0 - 0.2, o.y, 0); sprite.scale.set(1.1, 1.1, 1); car.add(sprite); glows.push(sprite);
    ticks.push((t) => { const k = 0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7); flame.scale.set(1, k, 1); flame.position.x = S.x0 - 0.1 - 0.35 * k; core.material.color.copy(lin(o.color)).multiplyScalar(1.4 + 0.4 * k); });
    return p;
  },
  armorFins(car, S, m, o) { for (let i = 0; i < o.n; i++) { const x = lerp(o.x0, o.x1, i / Math.max(1, o.n - 1)); sym((s) => { const p = S.at(x); mesh(box(0.22, 0.05, 0.12), m[o.mat || 'accent'], car, { pos: [x, p.ym + 0.05, s * (p.w + 0.02)], rot: [s * 0.5, 0, -0.35] }); }); } },
  ram(car, S, m, o) { const p = S.at(S.x1 - 0.1); mesh(box(0.12, o.h || 0.3, p.w * 2.1), m[o.mat || 'carbon'], car, { pos: [S.x1 + 0.02, p.yb + (o.h || 0.3) / 2 - 0.04, 0] }); if (o.teeth) for (let i = 0; i < o.teeth; i++) mesh(new (T().ConeGeometry)(0.045, 0.16, 8), m.chrome, car, { pos: [S.x1 + 0.13, p.yb + 0.04, lerp(-p.w, p.w, i / (o.teeth - 1))], rot: [0, 0, -HALF] }); },
  horns(car, S, m, o) { sym((s) => { const b = [o.x, S.top(o.x, 0.6 * s) - 0.02, s * o.z]; mesh(taperTube([b, [b[0] + 0.12, b[1] + 0.25, s * (o.z + 0.15)], [b[0] + 0.35, b[1] + 0.42, s * (o.z + 0.1)], [b[0] + 0.62, b[1] + 0.45, s * (o.z - 0.02)]], 0.075, 0.004, { tubular: 30, radial: 12 }), m[o.mat || 'accent'], car); }); },
  spikes(car, S, m, o) { for (let i = 0; i < o.n; i++) { const x = lerp(o.x0, o.x1, i / Math.max(1, o.n - 1)); (o.zs || [0]).forEach((f) => { const z = f * S.at(x).w; const y = S.top(x, f); mesh(new (T().ConeGeometry)(o.r || 0.04, o.h || 0.18, 8), m[o.mat || 'chrome'], car, { pos: [x, y + (o.h || 0.18) / 2 - 0.02, z], rot: [0, 0, 0.35] }); }); } },
  stacks(car, S, m, o, glows, ticks) { sym((s) => { const base = S.top(o.x, 0.75 * s); const pos = [o.x, base + o.h / 2, s * S.at(o.x).w * 0.75]; mesh(cyl(0.06, 0.07, o.h, 16, true), m.chrome, car, { pos }).material.side = T().DoubleSide; const fl = mesh(new (T().ConeGeometry)(0.06, 0.4, 12, 1, true), new (T().MeshBasicMaterial)({ color: lin('#ff3d1a').multiplyScalar(1.6), transparent: true, opacity: 0.7, blending: T().AdditiveBlending, depthWrite: false, toneMapped: false, side: T().DoubleSide }), car, { pos: [pos[0], base + o.h + 0.2, pos[2]], shadow: false }); ticks.push((t) => { const k = 0.6 + 0.4 * Math.abs(Math.sin(t * 13 + s)); fl.scale.set(1, k, 1); fl.position.y = base + o.h + 0.2 * k; }); }); },
  crane(car, S, m, o, glows, ticks) {
    const base = S.top(o.x);
    mesh(cyl(0.16, 0.2, 0.18, 24), m.dark, car, { pos: [o.x, base + 0.09, 0] });
    const tip = [o.x - 1.25, base + 1.05, 0];
    mesh(taperTube([[o.x, base + 0.15, 0], [o.x - 0.4, base + 0.75, 0], tip], 0.075, 0.045, { tubular: 18, radial: 10 }), m.accent, car);
    mesh(cyl(0.006, 0.006, 0.7, 6), m.chrome, car, { pos: [tip[0], tip[1] - 0.35, 0] });
    const hook = mesh(new (T().TorusGeometry)(0.07, 0.016, 8, 20, Math.PI * 1.4), m.chrome, car, { pos: [tip[0], tip[1] - 0.76, 0], rot: [0, HALF, Math.PI * 0.8] });
    ticks.push((t) => { hook.rotation.y = HALF + Math.sin(t * 1.4) * 0.25; });
    mesh(box(o.bedLen, 0.03, S.at(o.x - o.bedLen / 2).w * 1.9), m.carbon, car, { pos: [o.x - o.bedLen / 2 + 0.2, S.top(o.x - o.bedLen / 2) + 0.01, 0] });
  },
  beacons(car, S, m, o, glows, ticks) { const y = S.top(o.x) + 0.05; mesh(box(0.12, 0.05, o.span), m.dark, car, { pos: [o.x, y, 0] }); sym((s) => { const mat = new (T().MeshBasicMaterial)({ color: lin(o.color).multiplyScalar(1.8), toneMapped: false }); const b = mesh(new (T().SphereGeometry)(0.06, 14, 10, 0, TAU, 0, HALF), mat, car, { pos: [o.x, y + 0.02, s * o.span * 0.38], shadow: false }); const g2 = new (T().Sprite)(new (T().SpriteMaterial)({ map: glowTex(), color: lin(o.color), transparent: true, blending: T().AdditiveBlending, depthWrite: false })); g2.position.set(o.x, y + 0.08, s * o.span * 0.38); g2.scale.set(0.5, 0.5, 1); car.add(g2); glows.push(g2); g2.userData.own = true; ticks.push((t) => { const on = (Math.sin(t * 9 + (s > 0 ? 0 : Math.PI)) > 0) ? 1 : 0.25; g2.material.opacity = on; b.material.color.copy(lin(o.color)).multiplyScalar(0.5 + 1.3 * on); }); }); },
  domes(car, S, m, o) { sym((s) => { const p = S.at(o.x); mesh(new (T().SphereGeometry)(o.r, 24, 16, 0, TAU, 0, HALF), m.accent, car, { pos: [o.x, o.y, s * (p.w * o.zf)], rot: [s * 1.1, 0, 0] }); }); },
  puddle(car, S, m, o) { const pm = new (T().MeshPhysicalMaterial)({ color: lin('#050506'), metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 2.2 }); const g = new (T().CircleGeometry)(o.r, 40); const p = mesh(g, pm, car, { pos: [o.x, 0.006, o.z || 0], rot: [-HALF, 0, 0], scale: [1.4, 1, 1], shadow: false }); p.receiveShadow = true; for (let i = 0; i < 5; i++) mesh(new (T().CircleGeometry)(o.r * (0.12 + 0.1 * (i % 3)), 20), pm, car, { pos: [o.x + Math.cos(i * 1.7) * o.r * 1.5, 0.006, (o.z || 0) + Math.sin(i * 1.7) * o.r * 1.1], rot: [-HALF, 0, 0], shadow: false }); },
  catEars(car, S, m, o) { sym((s) => { const y = S.top(o.x, 0.45 * s) - 0.03; const ear = mesh(new (T().ConeGeometry)(0.13, 0.26, 3), m.paint, car, { pos: [o.x, y + 0.11, s * S.at(o.x).w * 0.42], rot: [s * -0.25, 0, 0], scale: [0.55, 1, 1] }); const inner = mesh(new (T().ConeGeometry)(0.08, 0.17, 3), m.accent, car, { pos: [o.x + 0.035, y + 0.1, s * S.at(o.x).w * 0.42], rot: [s * -0.25, 0, 0], scale: [0.4, 1, 1] }); return [ear, inner]; }); },
  tiara(car, S, m, o) { const y = S.top(o.x) - 0.01, r = o.r || 0.17; const g = new (T().Group)(); g.position.set(o.x, y, 0); car.add(g); mesh(new (T().CylinderGeometry)(r, r * 1.05, 0.045, 32, 1, true), m.gold, g, { pos: [0, 0.03, 0] }).material.side = T().DoubleSide; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; mesh(new (T().ConeGeometry)(0.03, i === 0 ? 0.16 : 0.1, 6), m.gold, g, { pos: [Math.cos(a) * r, 0.1, Math.sin(a) * r] }); mesh(new (T().SphereGeometry)(0.022, 12, 8), new (T().MeshPhysicalMaterial)({ color: lin(i % 2 ? '#38bdf8' : '#f472b6'), metalness: 0, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 }), g, { pos: [Math.cos(a) * r * 1.02, 0.03, Math.sin(a) * r * 1.02] }); } },
  hearts(car, S, m, o) { const THREE = T(); const s = new THREE.Shape(); s.moveTo(0, -0.06); s.bezierCurveTo(-0.11, 0.0, -0.06, 0.09, 0, 0.04); s.bezierCurveTo(0.06, 0.09, 0.11, 0.0, 0, -0.06); const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }); const mat = new THREE.MeshBasicMaterial({ color: lin(o.color).multiplyScalar(1.7), toneMapped: false }); sym((sd) => { const p = S.pt(S.x0 + 0.03, sd > 0 ? 0.35 : Math.PI - 0.35, 0.01); mesh(g, mat, car, { pos: [p[0] - 0.02, p[1], p[2]], rot: [0, -HALF, 0], scale: [1.3, 1.3, 1], shadow: false }); }); },
  daisy(car, S, m, o) { const g = new (T().Group)(); const p = S.pt(o.x ?? S.x1 - 0.02, HALF * 0.85, 0.005); g.position.set(...p); g.rotation.set(0, HALF, o.tilt ?? -0.5); car.add(g); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; mesh(new (T().SphereGeometry)(0.06, 12, 8), m.white, g, { pos: [Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0], scale: [1.3, 0.45, 0.25], rot: [0, 0, a] }); } mesh(new (T().SphereGeometry)(0.055, 16, 10), m.accent, g, { scale: [1, 1, 0.5] }); },
  tailFin(car, S, m, o) { const pts = [[o.x0, S.top(o.x0) - 0.04], [o.x1 + 0.1, S.top(o.x1) + o.h], [o.x1 - 0.12, S.top(o.x1) + o.h * 0.95], [o.x1 - 0.05, S.top(o.x1) - 0.04]]; mesh(extrudeXY(pts, o.t || 0.03, { bevel: 0.01 }), m[o.mat || 'accent'], car); },
  flukes(car, S, m, o) { sym((s) => { const pts = [[0, 0], [-0.45, 0.32], [-0.62, 0.2], [-0.4, 0.05], [-0.58, -0.08], [-0.2, -0.04]]; mesh(extrudeXY(pts, 0.025, { bevel: 0.008 }), m[o.mat || 'accent'], car, { pos: [S.x0 + 0.25, S.top(S.x0 + 0.25) - 0.08, s * 0.16], rot: [s * 0.55, 0, 0] }); }); },
  halo(car, S, m, o) { const y = S.top(o.x0); mesh(taperTube([[o.x0, y - 0.02, 0], [o.x0 + 0.05, y + 0.2, 0], [o.x0 - 0.15, y + 0.26, 0.24], [o.x0 - 0.6, y + 0.22, 0.25], [o.x0 - 0.68, y, 0.24]], 0.028, 0.028, { tubular: 30, radial: 10 }), m.carbon, car); mesh(taperTube([[o.x0 - 0.15, y + 0.26, -0.24], [o.x0 - 0.6, y + 0.22, -0.25], [o.x0 - 0.68, y, -0.24]], 0.028, 0.028, { tubular: 16, radial: 10 }), m.carbon, car); mesh(taperTube([[o.x0 - 0.15, y + 0.26, 0.24], [o.x0 - 0.05, y + 0.25, 0], [o.x0 - 0.15, y + 0.26, -0.24]], 0.028, 0.028, { tubular: 16, radial: 10 }), m.carbon, car); },
  helmet(car, S, m, o) { const y = S.top(o.x); mesh(new (T().SphereGeometry)(0.15, 24, 18), m.accent, car, { pos: [o.x, y + 0.05, 0], scale: [1.1, 1, 0.95] }); mesh(new (T().SphereGeometry)(0.152, 24, 12, -0.9, 1.8, 1.1, 0.6), m.glass, car, { pos: [o.x, y + 0.05, 0], scale: [1.1, 1, 0.95], rot: [0, HALF, 0] }); },
  f1FrontWing(car, S, m, o) { [0, 1, 2].forEach((k) => mesh(extrudeXY(airfoil(0.32 - k * 0.07, 0.035), o.span), m[k === 2 ? 'accent' : 'carbon'], car, { pos: [S.x1 - 0.12 - k * 0.12, 0.08 + k * 0.045, 0], rot: [0, 0, 0.08 + k * 0.12] })); sym((s) => mesh(box(0.5, 0.16, 0.014), m.accent, car, { pos: [S.x1 - 0.25, 0.13, s * o.span / 2] })); },
  airbox(car, S, m, o) { const y = S.top(o.x); mesh(box(0.28, 0.24, 0.2), m.paint, car, { pos: [o.x, y + 0.08, 0] }); mesh(box(0.02, 0.16, 0.14), m.dark, car, { pos: [o.x + 0.145, y + 0.11, 0] }); },
  gogo(car, S, m, o, glows, ticks) { const sprites = []; for (let i = 0; i < 6; i++) { const s2 = new (T().Sprite)(new (T().SpriteMaterial)({ map: gogoTex(), transparent: true, depthWrite: false, opacity: 0.9 })); s2.scale.set(0.42, 0.42, 1); car.add(s2); sprites.push(s2); } ticks.push((t) => sprites.forEach((s2, i) => { const ph = (t * 0.35 + i / 6) % 1; const a = i * 1.9; s2.position.set(Math.cos(a) * 2.2 - 0.3, 0.8 + ph * 1.6, Math.sin(a) * 1.6); s2.material.opacity = Math.sin(ph * Math.PI) * 0.95; const k = 0.3 + 0.25 * Math.sin(ph * Math.PI); s2.scale.set(k, k, 1); })); },
  mirrors(car, S, m, o) { sym((s) => { const p = S.at(o.x); const y = p.yt - 0.02; mesh(box(0.05, 0.02, 0.14), m.carbon, car, { pos: [o.x, y + 0.03, s * (p.w * 0.85)] }); mesh(new (T().SphereGeometry)(0.07, 16, 10), m[o.mat || 'accent'], car, { pos: [o.x - 0.02, y + 0.07, s * (p.w * 0.85 + 0.09)], scale: [0.6, 0.55, 1] }); }); },
};

/* =================================================================== les 15 concepts */
/* stations : [x, demi-largeur, bas, épaule, haut, exposant] ; x > 0 vers l'avant. Roues : {x, r, tw, z, arch} */
export const CONCEPTS = {
  1: {
    nom: 'Intercepteur furtif MK-Mimine', inspi: 'Blindé de traque façon Vision GT, facettes furtives, réacteur arrière.',
    paint: '#3a4556', accent: '#84cc16', glow: '#9cff2e', finish: 'matte', facets: 10, glass: '#0c1410', glassGlow: '#1a3d05',
    body: [[2.45, 0.35, 0.3, 0.38, 0.46, 2], [2.0, 0.62, 0.26, 0.44, 0.64, 2], [1.3, 0.74, 0.24, 0.52, 0.82, 2], [0.4, 0.88, 0.22, 0.58, 0.98, 2], [-0.6, 1.04, 0.24, 0.72, 1.1, 2], [-1.45, 1.12, 0.26, 0.98, 1.2, 2], [-2.1, 1.07, 0.32, 0.9, 1.14, 2], [-2.45, 0.8, 0.42, 0.8, 1.02, 2]],
    cabin: [[0.95, 0.3, 0.84, 0.9, 0.95, 2], [0.4, 0.56, 0.84, 1.04, 1.3, 2], [-0.5, 0.58, 0.9, 1.1, 1.36, 2], [-1.3, 0.36, 1.0, 1.1, 1.2, 2]],
    roof: { x0: -1.0, x1: 0.15, w: 0.75, mat: 'paint' },
    wheels: [{ x: 1.5, r: 0.36, tw: 0.32, z: 1.02, arch: false }, { x: -1.45, r: 0.42, tw: 0.44, z: 0.92, arch: true }],
    rim: { kind: 'turbine', n: 14, sw: 0.12, twist: 0.35 }, rimColor: '#1f2937', caliper: '#84cc16',
    lights: [{ x0: 2.15, x1: 2.32, th0: 0.15, th1: 0.75, color: '#d9ff9e', shape: 'slash' }, { x0: -2.44, x1: -2.3, th0: 0.25, th1: 1.0, color: '#ff2a2a', shape: 'thin' }],
    decals: [{ tex: 'num', x0: -0.5, x1: 0.1, th0: -0.25, th1: 0.35 }],
    kit: [['openArms', { wheels: [{ x: 1.5, r: 0.36, tw: 0.32, z: 1.02 }] }], ['fenderCaps', { wheels: [{ x: 1.5, r: 0.36, tw: 0.32, z: 1.02 }], mat: 'carbon' }], ['thruster', { y: 0.72, r: 0.2, color: '#9cff2e' }], ['armorFins', { n: 3, x0: 0.6, x1: -0.6 }], ['ram', { h: 0.22 }], ['wing', { x: -2.15, y: 1.32, span: 1.5, chord: 0.36, mat: 'carbon', plate: 0.26 }]],
  },
  2: {
    nom: 'Micro-Fusée Oasis V16', inspi: 'Citadine survitaminée : ailes élargies, aileron de toit démesuré, jantes sucre d’orge.',
    paint: '#f5e6a3', accent: '#ec4899', glow: '#ff4fb0', finish: 'pearl', len: 3.2,
    body: [[1.6, 0.45, 0.3, 0.48, 0.6, 3.5], [1.45, 0.8, 0.18, 0.56, 0.76, 4], [1.05, 0.93, 0.16, 0.74, 0.84, 4], [0.45, 0.85, 0.16, 0.56, 0.86, 4], [-0.3, 0.87, 0.16, 0.57, 0.88, 4], [-1.0, 0.95, 0.16, 0.74, 0.9, 4], [-1.45, 0.9, 0.22, 0.64, 0.9, 5], [-1.6, 0.72, 0.32, 0.62, 0.86, 5]],
    cabin: [[0.95, 0.3, 0.8, 0.82, 0.86, 3], [0.6, 0.7, 0.8, 0.96, 1.33, 4], [-0.2, 0.74, 0.82, 1.1, 1.46, 4], [-1.2, 0.74, 0.82, 1.1, 1.44, 4.5], [-1.5, 0.6, 0.85, 1.05, 1.3, 4]],
    roof: { x0: -1.35, x1: 0.35, w: 0.8, mat: 'accent' },
    wheels: [{ x: 1.05, r: 0.32, tw: 0.3, z: 0.76, arch: true }, { x: -1.0, r: 0.32, tw: 0.3, z: 0.78, arch: true }],
    rim: { kind: 'candy' }, caliper: '#ec4899',
    lights: [{ x0: 1.42, x1: 1.56, th0: 0.05, th1: 0.6, color: '#fff7d6', shape: 'dots1' }, { x0: -1.6, x1: -1.48, th0: 0.15, th1: 0.75, color: '#ff2a6a', shape: 'heart' }],
    stripes: [{ x0: -1.55, x1: 1.5, th0: HALF - 0.32, th1: HALF - 0.2, mat: 'accent' }],
    decals: [{ tex: 'num', x0: -0.45, x1: 0.15, th0: -0.3, th1: 0.4 }],
    kit: [['wing', { x: -1.45, y: 1.6, span: 1.45, chord: 0.38, mat: 'accent', plateMat: 'carbon', px: -1.25, swan: false, pz: 0.4 }], ['splitter', { back: 0.35 }], ['roofScoop', { x: -0.1, mat: 'accent' }], ['exhausts', { n: 1, r: 0.05, y: 0.28, z: 0.32, mirror: true, flame: true }], ['mirrors', { x: 0.62 }]],
  },
  3: {
    nom: 'Hyper-Optic 24 H', inspi: 'Hypercar d’endurance (Le Mans) : aileron de requin, longue queue, phares en lunettes.',
    paint: '#eab308', accent: '#18181b', glow: '#ffd23f', finish: 'gloss', len: 5.0,
    body: [[2.5, 0.36, 0.12, 0.2, 0.27, 3], [2.25, 0.82, 0.1, 0.26, 0.4, 3.5], [1.95, 0.9, 0.12, 0.38, 0.52, 4], [1.65, 0.9, 0.12, 0.42, 0.56, 4], [1.2, 0.86, 0.12, 0.46, 0.62, 3.5], [0.6, 0.82, 0.12, 0.46, 0.62, 3], [0.0, 0.86, 0.12, 0.5, 0.68, 3], [-0.8, 0.98, 0.12, 0.68, 0.84, 3.5], [-1.45, 1.02, 0.12, 0.84, 0.94, 3.5], [-2.0, 1.0, 0.18, 0.74, 0.9, 4], [-2.5, 0.96, 0.3, 0.68, 0.86, 6]],
    pods: [[2.2, 0.05, 0.2, 0.42, 0.46, 3, 0.7], [1.98, 0.27, 0.15, 0.6, 0.8, 3, 0.7], [1.65, 0.3, 0.14, 0.66, 0.92, 3, 0.7], [1.3, 0.27, 0.15, 0.6, 0.8, 3, 0.7], [0.95, 0.04, 0.3, 0.52, 0.56, 3, 0.7]],
    cabin: [[1.3, 0.22, 0.6, 0.62, 0.66, 2], [0.9, 0.42, 0.55, 0.76, 1.06, 2.5], [0.2, 0.48, 0.55, 0.8, 1.12, 2.5], [-0.6, 0.42, 0.6, 0.8, 1.05, 2.5], [-1.5, 0.15, 0.75, 0.8, 0.9, 2]],
    roof: { x0: -0.7, x1: 0.45, w: 0.55, mat: 'accent' },
    wheels: [{ x: 1.65, r: 0.37, tw: 0.34, z: 0.8, arch: true }, { x: -1.45, r: 0.37, tw: 0.36, z: 0.82, arch: true }],
    rim: { kind: 'turbine', n: 10, sw: 0.18, twist: 0.25 }, rimColor: '#18181b', caliper: '#eab308',
    lights: [{ x0: 2.02, x1: 2.24, th0: 0.2, th1: 1.0, color: '#ffffff', shape: 'rings', glowSize: 0.7 }, { x0: -2.5, x1: -2.42, th0: 0.05, th1: Math.PI - 0.05, color: '#ff1f3d', shape: 'thin', mirror: false, glowSize: 0.9 }],
    decals: [{ tex: 'num', x0: -0.2, x1: 0.5, th0: -0.25, th1: 0.4, bg: '#18181b', fg: '#eab308' }],
    kit: [['sharkfin', { x0: -0.55, x1: -2.25, h: 0.36, mat: 'accent' }], ['wing', { x: -2.32, y: 1.12, span: 1.85, chord: 0.36, mat: 'carbon', plate: 0.42, plateMat: 'accent', pz: 0.35 }], ['splitter', { back: 0.5 }], ['diffuser', {}], ['canards', {}], ['skirts', { x0: -1.0, x1: 1.2 }]],
  },
  4: {
    nom: 'Vinyl Royale GT', inspi: 'Grand tourisme rétro-futur à poupe effilée, jantes 33 tours et quatre couleurs de cartes.',
    paint: '#f97316', accent: '#7e22ce', glow: '#b45cff', finish: 'pearl', len: 5.2,
    body: [[2.6, 0.35, 0.35, 0.48, 0.56, 3], [2.35, 0.82, 0.22, 0.5, 0.7, 3.5], [1.75, 0.96, 0.2, 0.86, 0.94, 3.5], [1.1, 0.9, 0.2, 0.62, 0.88, 3], [0.3, 0.88, 0.2, 0.6, 0.86, 3], [-0.6, 0.9, 0.2, 0.62, 0.88, 3], [-1.55, 0.97, 0.22, 0.88, 0.96, 3.5], [-2.2, 0.78, 0.3, 0.7, 0.9, 2.5], [-2.6, 0.25, 0.45, 0.62, 0.72, 2]],
    cabin: [[0.6, 0.3, 0.76, 0.8, 0.85, 2.5], [0.2, 0.66, 0.76, 0.95, 1.25, 3], [-0.7, 0.68, 0.8, 1.0, 1.3, 3], [-1.3, 0.45, 0.84, 0.95, 1.1, 2.5], [-1.7, 0.15, 0.88, 0.92, 0.96, 2]],
    roof: { x0: -1.2, x1: 0.1, w: 0.8, mat: 'accent' },
    wheels: [{ x: 1.75, r: 0.38, tw: 0.32, z: 0.8, arch: true }, { x: -1.55, r: 0.4, tw: 0.36, z: 0.8, arch: true }],
    rim: { kind: 'vinyl' }, caliper: '#7e22ce',
    lights: [{ x0: 2.3, x1: 2.45, th0: 0.05, th1: 0.6, color: '#fff2d0', shape: 'dots2' }, { x0: -2.4, x1: -2.22, th0: 0.4, th1: 1.1, color: '#ff2a2a', shape: 'thin' }],
    stripes: [{ x0: 0.9, x1: 2.45, th0: HALF - 0.16, th1: HALF - 0.06, mat: 'accent' }, { x0: -2.0, x1: 2.2, th0: -0.04, th1: 0.04, mat: 'chrome' }],
    decals: [{ tex: 'suits', x0: -0.75, x1: 0.35, th0: -0.38, th1: -0.08 }, { tex: 'num', x0: -0.45, x1: 0.05, th0: 0.12, th1: 0.6 }],
    kit: [['exhausts', { side: true, n: 3, r: 0.04, y: 0.3, x: 0.7, len: 0.6, gap: 0.08 }], ['mirrors', { x: 0.45, mat: 'chrome' }], ['splitter', { back: 0.3, mat: 'chrome' }], ['louvers', { n: 6, x0: -1.45, x1: -1.9 }]],
  },
  5: {
    nom: 'Pression V8 Hot-Rod', inspi: 'Hot-rod à compresseur apparent, échappements latéraux chromés, flancs blancs.',
    paint: '#ef4444', accent: '#111113', glow: '#ff7a1a', finish: 'gloss', len: 4.4,
    body: [[2.2, 0.32, 0.4, 0.55, 0.7, 4], [1.9, 0.42, 0.36, 0.6, 0.8, 5], [1.2, 0.44, 0.34, 0.62, 0.86, 5], [0.5, 0.66, 0.3, 0.6, 0.9, 4], [-0.3, 0.8, 0.28, 0.62, 0.92, 4], [-1.25, 1.03, 0.3, 0.97, 1.05, 4], [-1.9, 0.93, 0.34, 0.82, 0.99, 3.5], [-2.2, 0.7, 0.42, 0.72, 0.92, 3]],
    cabin: [[0.4, 0.35, 0.86, 0.88, 0.9, 3], [0.1, 0.6, 0.86, 1.0, 1.18, 4], [-0.8, 0.66, 0.88, 1.02, 1.22, 4], [-1.2, 0.5, 0.9, 1.0, 1.12, 3]],
    roof: { x0: -1.05, x1: 0.05, w: 0.85, mat: 'accent' },
    wheels: [{ x: 1.65, r: 0.33, tw: 0.26, z: 0.78, arch: false }, { x: -1.25, r: 0.43, tw: 0.44, z: 0.8, arch: true }],
    rim: { kind: 'spokes', n: 5, sw: 0.34, whitewall: true }, rimColor: 'chrome', caliper: '#111113',
    lights: [{ x0: -2.2, x1: -2.08, th0: 0.3, th1: 0.85, color: '#ff2020', shape: 'dots1' }],
    kit: [['blower', { x: 1.05 }], ['bucketLights', { x: 2.0, y: 0.82, z: 0.42 }], ['openArms', { wheels: [{ x: 1.65, r: 0.33, tw: 0.26, z: 0.78 }], mat: 'chrome' }], ['fenderCaps', { wheels: [{ x: 1.65, r: 0.33, tw: 0.26, z: 0.78 }], mat: 'paint' }], ['exhausts', { side: true, n: 1, r: 0.06, y: 0.36, x: 0.2, len: 1.5, flame: true }], ['mirrors', { x: 0.3, mat: 'chrome' }]],
  },
  6: {
    nom: 'Symphonie E-F1', inspi: 'Monoplace électrique du futur : halo, ailerons multi-plans, LED jaune à la batterie.',
    paint: '#0d0d10', accent: '#facc15', glow: '#ffe23d', finish: 'gloss', len: 5.0, podStripe: true,
    body: [[2.5, 0.06, 0.12, 0.16, 0.2, 2], [2.1, 0.14, 0.12, 0.22, 0.32, 2.5], [1.5, 0.22, 0.14, 0.3, 0.48, 2.5], [0.8, 0.3, 0.14, 0.36, 0.62, 2.5], [0.2, 0.32, 0.14, 0.4, 0.72, 2.5], [-0.5, 0.3, 0.14, 0.4, 0.84, 2.5], [-1.3, 0.22, 0.16, 0.4, 0.62, 2.5], [-2.0, 0.12, 0.2, 0.36, 0.46, 2], [-2.3, 0.05, 0.25, 0.32, 0.36, 2]],
    pods: [[0.65, 0.04, 0.16, 0.3, 0.36, 3, 0.42], [0.35, 0.22, 0.14, 0.32, 0.5, 3.5, 0.42], [-0.6, 0.2, 0.14, 0.32, 0.48, 3.5, 0.42], [-1.4, 0.05, 0.18, 0.3, 0.34, 3, 0.42]],
    wheels: [{ x: 1.55, r: 0.36, tw: 0.32, z: 0.85, arch: false }, { x: -1.45, r: 0.38, tw: 0.42, z: 0.82, arch: false }],
    rim: { kind: 'disc', n: 6 }, rimColor: '#facc15', caliper: '#facc15',
    stripes: [{ x0: 1.0, x1: 2.45, th0: HALF - 0.25, th1: HALF + 0.25, mat: 'accent', mirror: false }],
    lights: [{ x0: -2.3, x1: -2.22, th0: -0.6, th1: 0.6, color: '#ff1f3d', shape: 'dots1', glowSize: 0.6 }],
    darkCockpit: { x0: 0.05, x1: 0.85, w: 0.42 },
    kit: [['halo', { x0: 0.9 }], ['helmet', { x: 0.35 }], ['airbox', { x: -0.2 }], ['f1FrontWing', { span: 1.75 }], ['wing', { x: -2.15, y: 0.92, span: 1.0, chord: 0.36, mat: 'carbon', plate: 0.5, plateMat: 'accent', pz: 0.02, px: -1.95 }], ['openArms', { wheels: [{ x: 1.55, r: 0.36, tw: 0.32, z: 0.85 }, { x: -1.45, r: 0.38, tw: 0.42, z: 0.82 }] }], ['neonTubes', { x0: -1.2, x1: 0.5 }]],
  },
  7: {
    nom: 'Yaris Invincible WRC', inspi: 'Rallye mondial : rampe de phares, bavettes, jantes blanches, prise d’air de toit.',
    paint: '#cfd2d8', accent: '#eab308', glow: '#ffd23f', finish: 'gloss', len: 4.1,
    body: [[2.05, 0.5, 0.34, 0.5, 0.62, 4], [1.9, 0.86, 0.26, 0.56, 0.76, 4.5], [1.3, 0.99, 0.26, 0.8, 0.9, 4.5], [0.6, 0.9, 0.26, 0.6, 0.9, 4], [-0.3, 0.9, 0.26, 0.6, 0.92, 4], [-1.25, 1.0, 0.26, 0.8, 0.96, 4.5], [-1.85, 0.94, 0.3, 0.7, 0.96, 5], [-2.05, 0.78, 0.38, 0.7, 0.94, 5]],
    cabin: [[0.9, 0.4, 0.86, 0.88, 0.92, 3], [0.5, 0.76, 0.86, 1.0, 1.3, 4], [-0.6, 0.78, 0.88, 1.05, 1.42, 4.5], [-1.6, 0.72, 0.9, 1.02, 1.36, 4.5], [-1.95, 0.55, 0.92, 1.0, 1.25, 4]],
    roof: { x0: -1.5, x1: 0.3, w: 0.8, mat: 'accent' },
    wheels: [{ x: 1.3, r: 0.36, tw: 0.3, z: 0.78, arch: true }, { x: -1.25, r: 0.36, tw: 0.3, z: 0.8, arch: true }],
    rim: { kind: 'spokes', n: 6, sw: 0.4, knobby: true }, rimColor: '#f4f4f5', caliper: '#eab308',
    lights: [{ x0: 1.88, x1: 2.02, th0: 0.1, th1: 0.7, color: '#ffffff', shape: 'full' }, { x0: -2.05, x1: -1.95, th0: 0.2, th1: 0.9, color: '#ff2020', shape: 'dash3' }],
    stripes: [{ x0: -1.9, x1: 1.9, th0: 0.36, th1: 0.5, mat: 'accent' }],
    decals: [{ tex: 'num', x0: -0.45, x1: 0.15, th0: -0.3, th1: 0.32 }],
    kit: [['lightbar', { x: 0.45, span: 1.05, n: 4, color: '#fff6d8' }], ['roofScoop', { x: -0.35 }], ['wing', { x: -1.95, y: 1.48, span: 1.5, chord: 0.34, mat: 'carbon', plate: 0.24, px: -1.8, pz: 0.45 }], ['mudflaps', { xs: [0.82, -1.72] }], ['splitter', { back: 0.3 }], ['mirrors', { x: 0.55 }]],
  },
  8: {
    nom: 'Oil-Leak Recovery Mk.II', inspi: 'Dépanneuse blindée en armure de chasseuse de primes : visière verte, grue, gyrophares… et sa flaque d’huile.',
    paint: '#64748b', accent: '#ea580c', glow: '#ff8a3d', finish: 'satin', len: 5.0, glass: '#0c2a12', glassGlow: '#1f8f3a',
    body: [[2.5, 0.5, 0.5, 0.7, 0.85, 4], [2.3, 0.95, 0.42, 0.78, 1.0, 5], [1.6, 1.03, 0.42, 1.02, 1.1, 5], [0.9, 0.98, 0.42, 0.82, 1.15, 5], [0.0, 0.98, 0.42, 0.82, 0.96, 6], [-1.0, 1.0, 0.42, 0.82, 0.96, 6], [-1.6, 1.04, 0.42, 1.02, 1.08, 6], [-2.3, 1.0, 0.46, 0.86, 1.0, 6], [-2.5, 0.9, 0.5, 0.8, 0.98, 6]],
    cabin: [[1.7, 0.5, 1.02, 1.05, 1.1, 4], [1.25, 0.86, 1.0, 1.3, 1.66, 5], [0.45, 0.9, 1.0, 1.35, 1.8, 5.5], [0.0, 0.88, 1.0, 1.3, 1.74, 5.5], [-0.15, 0.74, 1.0, 1.2, 1.5, 5]],
    roof: { x0: -0.16, x1: 1.32, w: 0.92, mat: 'paint' },
    wheels: [{ x: 1.6, r: 0.45, tw: 0.38, z: 0.8, arch: true }, { x: -1.6, r: 0.45, tw: 0.38, z: 0.82, arch: true }],
    rim: { kind: 'disc', n: 8, lip: true, knobby: true }, rimColor: '#2b3340', caliper: '#ea580c',
    lights: [{ x0: 2.3, x1: 2.45, th0: 0.05, th1: 0.55, color: '#e8fff0', shape: 'slash' }, { x0: -2.5, x1: -2.4, th0: 0.15, th1: 0.85, color: '#ff4a1a', shape: 'dash3' }],
    stripes: [{ x0: -2.45, x1: 2.4, th0: 0.02, th1: 0.12, mat: 'accent' }],
    decals: [{ tex: 'num', x0: 0.85, x1: 1.35, th0: -0.15, th1: 0.4 }],
    kit: [['crane', { x: -0.55, bedLen: 1.9 }], ['beacons', { x: 0.55, span: 1.2, color: '#ff9a1a' }], ['puddle', { x: -1.2, r: 0.42, z: 0.15 }], ['ram', { h: 0.26, mat: 'accent' }], ['mirrors', { x: 1.15 }]],
  },
  9: {
    nom: 'Wyvern GT-R', inspi: 'JDM musclé à carrosserie large : capot carbone, aileron col de cygne, griffes de wyverne.',
    paint: '#1e3a8a', accent: '#dc2626', glow: '#ff2d2d', finish: 'gloss', len: 4.6,
    body: [[2.3, 0.5, 0.26, 0.4, 0.48, 4], [2.15, 0.9, 0.16, 0.44, 0.62, 4], [1.8, 1.0, 0.15, 0.62, 0.78, 4.5], [1.4, 1.05, 0.15, 0.82, 0.9, 4.5], [0.9, 0.98, 0.15, 0.62, 0.86, 4], [0.2, 0.94, 0.15, 0.58, 0.86, 4], [-0.6, 0.96, 0.15, 0.6, 0.9, 4], [-1.35, 1.07, 0.15, 0.84, 0.95, 4.5], [-1.95, 1.0, 0.2, 0.74, 0.95, 5], [-2.3, 0.9, 0.3, 0.68, 0.92, 6]],
    cabin: [[0.95, 0.36, 0.8, 0.82, 0.86, 3], [0.5, 0.68, 0.8, 0.95, 1.2, 4], [-0.3, 0.7, 0.82, 1.0, 1.28, 4], [-1.2, 0.6, 0.86, 0.98, 1.12, 3.5], [-1.6, 0.35, 0.9, 0.95, 1.0, 3]],
    roof: { x0: -1.0, x1: 0.25, w: 0.8, mat: 'carbon' },
    hood: { x0: 0.95, x1: 2.1, w: 0.55, mat: 'carbon' },
    wheels: [{ x: 1.4, r: 0.36, tw: 0.32, z: 0.86, arch: true }, { x: -1.35, r: 0.37, tw: 0.36, z: 0.86, arch: true }],
    rim: { kind: 'mesh', n: 10, sw: 0.13 }, rimColor: '#b98a3a', caliper: '#dc2626',
    lights: [{ x0: 2.06, x1: 2.22, th0: 0.12, th1: 0.62, color: '#e8f0ff', shape: 'fang' }, { x0: -2.3, x1: -2.2, th0: 0.3, th1: 0.95, color: '#ff1a1a', shape: 'dots2' }],
    stripes: [{ x0: -2.2, x1: 2.1, th0: 0.52, th1: 0.58, mat: 'accent' }],
    decals: [{ tex: 'claw', x0: -1.95, x1: -1.6, th0: -0.25, th1: 0.4 }, { tex: 'num', x0: -0.35, x1: 0.2, th0: -0.25, th1: 0.4 }],
    kit: [['wing', { x: -2.05, y: 1.32, span: 1.75, chord: 0.38, mat: 'carbon', plate: 0.26, swan: true, px: -1.8, pz: 0.32 }], ['canards', {}], ['splitter', { back: 0.45 }], ['diffuser', {}], ['skirts', { x0: -0.95, x1: 1.0 }], ['mirrors', { x: 0.55 }], ['exhausts', { n: 2, r: 0.055, y: 0.28, z: 0.5, mirror: true, gap: 0.1, flame: true }]],
  },
  10: {
    nom: 'Doom Crawler 666', inspi: 'Tank tout-terrain démoniaque à six roues : cornes, pointes, fissures de lave, cheminées enflammées.',
    paint: '#141012', accent: '#991b1b', glow: '#ff2a12', finish: 'satin', facets: 12, paintGlow: 'cracks', len: 5.4, glass: '#2a0505', glassGlow: '#5a0a05',
    body: [[2.7, 0.6, 0.8, 0.95, 1.1, 2], [2.4, 0.95, 0.72, 1.05, 1.3, 2], [1.4, 1.0, 0.72, 1.1, 1.45, 2], [0.0, 1.0, 0.72, 1.12, 1.5, 2], [-1.6, 1.0, 0.72, 1.12, 1.5, 2], [-2.5, 0.95, 0.78, 1.1, 1.42, 2], [-2.7, 0.7, 0.85, 1.05, 1.3, 2]],
    cabin: [[1.3, 0.5, 1.38, 1.45, 1.5, 2], [0.9, 0.8, 1.38, 1.6, 1.95, 2.5], [-0.4, 0.82, 1.38, 1.65, 2.0, 2.5], [-0.9, 0.6, 1.4, 1.6, 1.85, 2]],
    roof: { x0: -0.75, x1: 0.75, w: 0.8, mat: 'paint' },
    wheels: [{ x: 1.8, r: 0.56, tw: 0.46, z: 1.05, arch: false }, { x: -0.45, r: 0.56, tw: 0.46, z: 1.05, arch: false }, { x: -1.95, r: 0.56, tw: 0.46, z: 1.05, arch: false }],
    rim: { kind: 'shuriken', n: 5, sw: 0.22, twist: 0.6, knobby: true }, rimColor: '#1b1b1f', caliper: '#ff2a12',
    lights: [{ x0: 2.42, x1: 2.6, th0: 0.2, th1: 0.75, color: '#ff2a12', shape: 'fang', glowSize: 0.8 }, { x0: -2.7, x1: -2.6, th0: 0.2, th1: 0.9, color: '#ff1a00', shape: 'slash' }],
    kit: [['horns', { x: 1.0, z: 0.55, mat: 'white' }], ['spikes', { n: 6, x0: 0.6, x1: -0.7, zs: [0], h: 0.2 }], ['spikes', { n: 5, x0: 2.2, x1: -2.4, zs: [-0.9, 0.9], h: 0.16, r: 0.035 }], ['stacks', { x: -1.15, h: 0.75 }], ['ram', { h: 0.42, teeth: 7 }], ['fenderCaps', { wheels: [{ x: 1.8, r: 0.56, tw: 0.46, z: 1.05 }, { x: -0.45, r: 0.56, tw: 0.46, z: 1.05 }, { x: -1.95, r: 0.56, tw: 0.46, z: 1.05 }], mat: 'accent' }]],
  },
  11: {
    nom: 'Milo Princess Coupé', inspi: 'Coupé bulle tout en rondeurs : oreilles de chat, diadème serti, feux en cœur.',
    paint: '#f472b6', accent: '#1e1b4b', glow: '#ff7ad1', finish: 'pearl', len: 3.9,
    body: [[1.95, 0.45, 0.3, 0.45, 0.58, 2.5], [1.75, 0.82, 0.2, 0.5, 0.72, 2.5], [1.25, 0.93, 0.18, 0.76, 0.86, 2.5], [0.5, 0.86, 0.18, 0.56, 0.86, 2.5], [-0.3, 0.88, 0.18, 0.57, 0.88, 2.5], [-1.2, 0.94, 0.18, 0.77, 0.9, 2.5], [-1.75, 0.82, 0.24, 0.62, 0.84, 2.5], [-1.95, 0.5, 0.34, 0.56, 0.72, 2.5]],
    cabin: [[0.9, 0.3, 0.8, 0.82, 0.84, 2], [0.5, 0.66, 0.8, 0.95, 1.25, 2.2], [-0.3, 0.7, 0.82, 1.0, 1.38, 2.2], [-1.0, 0.58, 0.84, 0.98, 1.22, 2.2], [-1.35, 0.3, 0.86, 0.92, 1.0, 2]],
    roof: { x0: -1.0, x1: 0.15, w: 0.8, mat: 'paint' },
    wheels: [{ x: 1.25, r: 0.34, tw: 0.28, z: 0.76, arch: true }, { x: -1.2, r: 0.34, tw: 0.28, z: 0.78, arch: true }],
    rim: { kind: 'spokes', n: 8, sw: 0.22, whitewall: true }, rimColor: '#f8e7c8', caliper: '#f472b6',
    lights: [{ x0: 1.74, x1: 1.9, th0: 0.05, th1: 0.6, color: '#fff7e6', shape: 'dots1' }],
    stripes: [{ x0: -1.8, x1: 1.8, th0: 0.05, th1: 0.12, mat: 'accent' }],
    decals: [{ tex: 'num', x0: -0.4, x1: 0.15, th0: -0.25, th1: 0.4 }],
    kit: [['catEars', { x: -0.45 }], ['tiara', { x: 0.25 }], ['hearts', { color: '#ff2a6a' }], ['mirrors', { x: 0.55, mat: 'gold' }]],
  },
  12: {
    nom: 'Menacing Wedge ゴゴゴ', inspi: 'Supercar « coin » des années 80 revue en néon violet ; une aura menaçante flotte autour.',
    paint: '#8b5cf6', accent: '#facc15', glow: '#b07cff', finish: 'pearl', facets: 18, len: 4.6,
    body: [[2.3, 0.5, 0.2, 0.26, 0.3, 6], [2.1, 0.92, 0.16, 0.3, 0.42, 6], [1.45, 1.0, 0.16, 0.76, 0.82, 6], [0.8, 0.96, 0.16, 0.58, 0.84, 6], [0.0, 0.96, 0.16, 0.6, 0.9, 6], [-0.8, 1.0, 0.16, 0.62, 0.94, 6], [-1.35, 1.04, 0.16, 0.82, 0.98, 6], [-2.0, 1.0, 0.2, 0.76, 0.98, 6], [-2.3, 0.95, 0.26, 0.72, 0.96, 8]],
    cabin: [[1.0, 0.3, 0.78, 0.8, 0.82, 4], [0.6, 0.66, 0.78, 0.92, 1.05, 5], [-0.2, 0.72, 0.8, 0.98, 1.16, 5], [-0.9, 0.66, 0.86, 1.0, 1.12, 5], [-1.4, 0.4, 0.9, 0.98, 1.0, 4]],
    wheels: [{ x: 1.45, r: 0.36, tw: 0.34, z: 0.82, arch: true }, { x: -1.35, r: 0.37, tw: 0.38, z: 0.82, arch: true }],
    rim: { kind: 'disc', n: 5 }, rimColor: 'gold', caliper: '#facc15',
    lights: [{ x0: 2.05, x1: 2.22, th0: 0.1, th1: 0.75, color: '#f4ecff', shape: 'thin' }, { x0: -2.3, x1: -2.26, th0: 0.05, th1: Math.PI - 0.05, color: '#ff1f6a', shape: 'full', mirror: false, glowSize: 0.8 }],
    stripes: [{ x0: 0.9, x1: 2.2, th0: HALF - 0.28, th1: HALF - 0.14, mat: 'accent' }],
    decals: [{ tex: 'num', x0: -0.4, x1: 0.15, th0: -0.25, th1: 0.4 }],
    kit: [['wing', { x: -2.0, y: 1.3, span: 1.8, chord: 0.4, mat: 'paint', plate: 0.3, plateMat: 'accent', pz: 0.55 }], ['louvers', { n: 7, x0: -0.95, x1: -1.5 }], ['splitter', { back: 0.35 }], ['gogo', {}]],
  },
  13: {
    nom: 'Sirène Veloce Hydro', inspi: 'Bolide-hydroglisseur à écailles irisées : aileron dorsal, nageoire caudale, jantes cymbales.',
    paint: '#22c5dc', accent: '#0f2a4a', glow: '#3ef0ff', finish: 'pearl', paintMap: 'scales', len: 4.9, glass: '#05283a',
    body: [[2.45, 0.1, 0.3, 0.36, 0.42, 2], [2.2, 0.55, 0.22, 0.42, 0.56, 2.5], [1.5, 0.95, 0.18, 0.78, 0.86, 3], [0.8, 0.9, 0.18, 0.56, 0.82, 3], [0.0, 0.88, 0.18, 0.56, 0.84, 3], [-0.8, 0.9, 0.18, 0.58, 0.86, 3], [-1.45, 0.98, 0.18, 0.8, 0.9, 3], [-2.0, 0.7, 0.25, 0.62, 0.82, 2.5], [-2.45, 0.2, 0.4, 0.55, 0.62, 2]],
    cabin: [[1.0, 0.25, 0.75, 0.78, 0.8, 2], [0.5, 0.6, 0.75, 0.92, 1.18, 2.2], [-0.3, 0.62, 0.78, 0.96, 1.24, 2.2], [-1.2, 0.35, 0.82, 0.9, 1.02, 2], [-1.6, 0.1, 0.85, 0.88, 0.9, 2]],
    wheels: [{ x: 1.5, r: 0.36, tw: 0.32, z: 0.8, arch: true }, { x: -1.45, r: 0.37, tw: 0.34, z: 0.82, arch: true }],
    rim: { kind: 'cymbal' }, caliper: '#0f2a4a',
    lights: [{ x0: 2.0, x1: 2.25, th0: 0.05, th1: 0.55, color: '#d6fbff', shape: 'thin' }, { x0: 0.75, x1: 1.05, th0: -0.1, th1: 0.25, color: '#3ef0ff', shape: 'gills', glowSize: 0.4 }, { x0: -2.35, x1: -2.2, th0: 0.2, th1: 0.9, color: '#ff2a6a', shape: 'thin' }],
    decals: [{ tex: 'num', x0: -0.45, x1: 0.1, th0: -0.25, th1: 0.4, bg: '#0f2a4a', fg: '#d6fbff' }],
    kit: [['sharkfin', { x0: -0.9, x1: -2.1, h: 0.42, mat: 'accent' }], ['flukes', { mat: 'accent' }], ['splitter', { back: 0.3 }], ['neonTubes', { x0: -1.0, x1: 1.1 }]],
  },
  14: {
    nom: 'Kage Street Ninja', inspi: 'Berline de drift noire mate : regard de ninja, néons rouges, jantes shuriken, éclaboussures d’encre.',
    paint: '#0d0d10', accent: '#b91c1c', glow: '#ff1f2d', finish: 'matte', len: 4.7, glass: '#120406',
    body: [[2.35, 0.55, 0.2, 0.32, 0.4, 5], [2.2, 0.95, 0.12, 0.36, 0.56, 5], [1.45, 1.05, 0.12, 0.8, 0.86, 5], [0.8, 0.98, 0.12, 0.56, 0.82, 5], [0.0, 0.96, 0.12, 0.56, 0.84, 5], [-0.7, 0.98, 0.12, 0.57, 0.86, 5], [-1.4, 1.07, 0.12, 0.81, 0.9, 5], [-2.0, 1.0, 0.16, 0.7, 0.9, 6], [-2.35, 0.92, 0.24, 0.66, 0.88, 7]],
    cabin: [[0.95, 0.36, 0.76, 0.78, 0.82, 4], [0.55, 0.68, 0.76, 0.9, 1.14, 4.5], [-0.4, 0.72, 0.78, 0.95, 1.2, 4.5], [-1.3, 0.62, 0.82, 0.94, 1.08, 4], [-1.75, 0.4, 0.86, 0.9, 0.94, 3]],
    roof: { x0: -1.2, x1: 0.35, w: 0.8, mat: 'carbon' },
    wheels: [{ x: 1.45, r: 0.36, tw: 0.33, z: 0.88, arch: true }, { x: -1.4, r: 0.36, tw: 0.37, z: 0.88, arch: true }],
    rim: { kind: 'shuriken', n: 4, sw: 0.3, twist: 0.7, lip: true }, rimColor: '#18181b', caliper: '#b91c1c',
    lights: [{ x0: 2.15, x1: 2.3, th0: 0.15, th1: 0.6, color: '#ff4040', shape: 'slash' }, { x0: -2.35, x1: -2.3, th0: 0.05, th1: Math.PI - 0.05, color: '#ff1a1a', shape: 'thin', mirror: false, glowSize: 0.8 }],
    decals: [{ tex: 'splat', x0: -1.3, x1: 0.2, th0: -0.3, th1: 0.45 }],
    kit: [['wing', { x: -2.05, y: 1.22, span: 1.8, chord: 0.38, mat: 'carbon', plate: 0.3, swan: true, px: -1.85, pz: 0.32 }], ['canards', {}], ['splitter', { back: 0.5 }], ['diffuser', {}], ['neonTubes', { x0: -1.0, x1: 1.0 }], ['exhausts', { n: 1, r: 0.08, y: 0.24, z: 0.0, flame: true, glowColor: '#ff2a1a' }], ['mirrors', { x: 0.55, mat: 'carbon' }]],
  },
  15: {
    nom: 'Daisy Streamliner 37-X', inspi: 'Profilée Art déco des années 30 réinventée : jupes arrière, lignes de vitesse chromées, marguerite en proue.',
    paint: '#eab308', accent: '#f97316', glow: '#ffb02e', finish: 'gloss', len: 5.2,
    body: [[2.6, 0.3, 0.3, 0.42, 0.52, 2.2], [2.3, 0.75, 0.22, 0.5, 0.7, 2.5], [1.7, 0.95, 0.2, 0.84, 0.92, 2.5], [1.0, 0.86, 0.2, 0.6, 0.88, 2.5], [0.2, 0.84, 0.2, 0.58, 0.9, 2.5], [-0.6, 0.9, 0.2, 0.62, 0.92, 2.5], [-1.4, 0.96, 0.2, 0.68, 0.92, 2.5], [-2.1, 0.8, 0.26, 0.62, 0.86, 2.2], [-2.6, 0.25, 0.42, 0.55, 0.64, 2]],
    cabin: [[1.1, 0.28, 0.8, 0.84, 0.86, 2], [0.6, 0.62, 0.8, 0.98, 1.22, 2.3], [-0.3, 0.66, 0.84, 1.02, 1.3, 2.3], [-1.2, 0.5, 0.86, 0.98, 1.16, 2.2], [-1.9, 0.15, 0.86, 0.92, 0.96, 2]],
    roof: { x0: -1.4, x1: 0.35, w: 0.8, mat: 'accent' },
    wheels: [{ x: 1.7, r: 0.38, tw: 0.3, z: 0.76, arch: true }, { x: -1.4, r: 0.38, tw: 0.3, z: 0.78, arch: false }],
    rim: { kind: 'daisy', n: 10, whitewall: true }, rimColor: '#f4f1ea', caliper: '#f97316',
    lights: [{ x0: 2.25, x1: 2.42, th0: 0.05, th1: 0.6, color: '#fff3d0', shape: 'dots1' }, { x0: -2.45, x1: -2.3, th0: 0.3, th1: 0.95, color: '#ff3a1a', shape: 'thin' }],
    stripes: [0, 1, 2].map((k) => ({ x0: 0.6 - k * 0.12, x1: 2.0 - k * 0.1, th0: 0.12 + k * 0.1, th1: 0.15 + k * 0.1, mat: 'chrome' })),
    decals: [{ tex: 'num', x0: -1.0, x1: -0.45, th0: -0.25, th1: 0.4 }],
    kit: [['tailFin', { x0: -0.9, x1: -2.4, h: 0.36, mat: 'accent' }], ['daisy', { x: 2.47, tilt: -0.75 }], ['mirrors', { x: 0.6, mat: 'chrome' }]],
  },
};

/* =================================================================== assemblage */
/** Construit le concept-car d'une écurie. quality : 'high' | 'medium' | 'low'. */
export function buildConceptCar(team, { quality = 'high' } = {}) {
  const THREE = T();
  const id = typeof team === 'object' ? team.id : team;
  const spec = CONCEPTS[id] || CONCEPTS[1];
  const m = makeMaterials(spec, quality);
  const car = new THREE.Group(); const glows = [], ticks = [];
  const wheels = spec.wheels.map((w) => ({ ...w }));
  const S = sampler(spec.body, wheels);
  const segs = spec.facets || (quality === 'low' ? 26 : quality === 'medium' ? 36 : 48);
  const rings = spec.facets ? Math.round((S.x1 - S.x0) * 10) : quality === 'low' ? 60 : quality === 'medium' ? 84 : 120;
  const snap = spec.facets || 0;
  mesh(loftGeometry(S, { rings, seg: segs }), m.paint, car);

  // berceau sombre + passages de roue (on ne voit jamais « à travers » la caisse)
  const xs = wheels.map((w) => w.x); const xa = Math.min(...xs), xb = Math.max(...xs);
  let minW = Infinity; for (let x = xa; x <= xb; x += 0.1) minW = Math.min(minW, S.at(x).w);
  const tubW = Math.max(0.2, 2 * (minW - Math.max(...wheels.map((w) => w.tw)) - 0.03));
  mesh(box(xb - xa + 0.6, 0.3, Math.min(tubW, 2 * minW - 0.05)), m.dark, car, { pos: [(xa + xb) / 2, 0.36, 0], shadow: false });
  wheels.filter((w) => w.arch).forEach((w) => {
    const R = w.r * 1.12 + 0.03, wd = 2 * S.at(w.x).w - 0.03;
    mesh(new THREE.CylinderGeometry(R, R, wd, 28, 1, true, HALF, Math.PI), m.dark, car, { pos: [w.x, w.r, 0], rot: [HALF, 0, 0], shadow: false });
  });

  // pontons (monoplace)
  // pontons / ailes séparées (monoplace, hypercar) : découpés eux aussi autour des roues
  if (spec.pods) [1, -1].forEach((s) => { const P = sampler(spec.pods.map((p) => [p[0], p[1], p[2], p[3], p[4], p[5], p[6] * s]), wheels.map((w) => ({ ...w, arch: true }))); mesh(loftGeometry(P, { rings: 48, seg: spec.facets || 30 }), m.paint, car); if (spec.podStripe) addPatch(car, P, m.accent, { x0: P.x0 + 0.1, x1: P.x1 - 0.1, th0: HALF - 0.15, th1: HALF + 0.15, mirror: false, lift: 0.004 }); });

  // habitacle vitré + pavillon peint / carbone
  if (spec.cabin) {
    const C = sampler(spec.cabin);
    mesh(loftGeometry(C, { rings: spec.facets ? Math.round((C.x1 - C.x0) * 8) : 48, seg: spec.facets || segs }), m.glass, car);
    if (spec.roof) addPatch(car, C, m[spec.roof.mat], { x0: spec.roof.x0, x1: spec.roof.x1, th0: HALF - spec.roof.w * HALF, th1: HALF + spec.roof.w * HALF, mirror: false, lift: 0.006, nx: 30, nt: 16 }, { snap });
  }
  if (spec.hood) addPatch(car, S, m[spec.hood.mat], { x0: spec.hood.x0, x1: spec.hood.x1, th0: HALF - spec.hood.w * HALF, th1: HALF + spec.hood.w * HALF, mirror: false, lift: 0.005, nx: 30, nt: 16 }, { snap });
  if (spec.darkCockpit) { const d = spec.darkCockpit; addPatch(car, S, m.dark, { x0: d.x0, x1: d.x1, th0: HALF - d.w * HALF, th1: HALF + d.w * HALF, mirror: false, lift: 0.004 }, { snap }); }
  (spec.stripes || []).forEach((st) => addPatch(car, S, m[st.mat], { ...st, lift: 0.005 }, { snap }));
  (spec.decals || []).forEach((d) => {
    const map = d.tex === 'num' ? roundelTex(id, d.bg || spec.accent, d.fg || '#ffffff') : d.tex === 'suits' ? suitsTex() : d.tex === 'claw' ? clawTex() : splatTex();
    addPatch(car, S, decalMat(map), { ...d, lift: 0.007, nx: 16, nt: 12 }, { snap });
  });

  // roues
  wheels.forEach((w) => [1, -1].forEach((s) => {
    const wg = buildWheel(m, { r: w.r, tw: w.tw, rim: spec.rim }, quality);
    wg.position.set(w.x, w.r, s * w.z); if (s < 0) wg.rotation.y = Math.PI;
    wg.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    car.add(wg);
  }));

  // feux à LED conformes + halos
  (spec.lights || []).forEach((l) => addLight(car, S, l, glows));

  // kit spécifique à l'écurie
  const SK = withCabin(S, spec.cabin ? sampler(spec.cabin) : null);
  (spec.kit || []).forEach(([name, o]) => KIT[name](car, SK, m, o, glows, ticks));

  // néon sous caisse + ombre de contact (ancre visuelle même sans shadow map)
  const L = S.x1 - S.x0, W = Math.max(...spec.body.map((s) => s[1])) * 2;
  const under = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.25, W * 1.7), new THREE.MeshBasicMaterial({ map: underTex(), color: m.glowCol.clone().multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  under.rotation.x = -HALF; under.position.set((S.x0 + S.x1) / 2, 0.012, 0); car.add(under);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.08, W * 1.25), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.85 }));
  shadow.rotation.x = -HALF; shadow.position.set((S.x0 + S.x1) / 2, 0.008, 0); car.add(shadow);
  ticks.push((t) => { under.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2); glows.forEach((g, i) => { if (!g.userData.own) g.material.opacity = 0.62 + 0.18 * Math.sin(t * 3 + i * 1.7); }); });
  // centrage longitudinal ; l'échelle K est portée par un groupe interne (la scène anime librement l'échelle du parent)
  const root = new THREE.Group(), inner = new THREE.Group(); car.position.x = -(S.x0 + S.x1) / 2; inner.add(car); inner.scale.setScalar(K); root.add(inner);
  root.userData = { height: 1.3, concept: spec, under, tick: (t, dt) => ticks.forEach((f) => f(t, dt)) };
  return root;
}

export function conceptInfo(id) { const s = CONCEPTS[id]; return s ? { nom: s.nom, inspi: s.inspi } : null; }
