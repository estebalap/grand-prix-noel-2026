/**
 * Aides du groupe 1 (reprise du loft du groupe 2) : carrosserie « loft » (sections superellipses interpolées le long de x),
 * passages de roues creusés, autocollants drapés sur le dessus et sur les flancs, montants, ailerons.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque : motifs génériques uniquement.
 */
import { outils } from './outils.js';

export function aideLoft(ctx) {
  const { THREE, chassis, garde, envMap } = ctx;
  const o = outils(ctx);
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
  const DEF = { nt: 2.6, nb: 3.4, wt: 1 };
  const cache = new WeakMap();
  const norm = (st) => { if (!cache.has(st)) cache.set(st, st.map((s) => ({ ...DEF, ...s }))); return cache.get(st); };

  /** Interpolation de Hermite (tangentes de Catmull-Rom) de tous les champs entre deux stations. */
  function interp(st, x) {
    const n = st.length; let i = 0;
    while (i < n - 2 && x > st[i + 1].x) i++;
    const a = st[i], b = st[i + 1], h = Math.max(1e-6, b.x - a.x), t = Math.min(1, Math.max(0, (x - a.x) / h));
    const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    const r = { x };
    for (const k of CH) {
      const ma = (b[k] - p0[k]) / Math.max(1e-6, b.x - p0.x), mb = (p3[k] - a[k]) / Math.max(1e-6, p3.x - a.x);
      let v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb;
      const lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.25;
      r[k] = Math.min(hi + m, Math.max(lo - m, v));
    }
    return r;
  }
  function sec(s, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb;
    const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * k, yc + hh * yy];
  }

  /** Corps lofté : stations [{x,w(demi-largeur),y0,y1,nt,nb,wt}] ; opt.arches = [{x,R,y,zin}] (passages de roues). */
  function loft(stIn, mat, opt = {}) {
    const st = norm(stIn), NX = opt.nx || 130, NS = opt.ns || 56, ar = opt.arches || [];
    const x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
    const centre = (s) => [s.x, (s.y0 + s.y1) / 2, 0];
    for (let k = 0; k < NS; k++) pos.push(...centre(st[0]));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, s = interp(st, x);
      for (let k = 0; k < NS; k++) {
        const [z, y0] = sec(s, k / NS * 2 * Math.PI); let y = y0;
        for (const a of ar) {
          const dx = Math.abs(x - a.x);
          if (dx < a.R && Math.abs(z) > a.zin) { const ya = Math.min(a.y + Math.sqrt(a.R * a.R - dx * dx), s.y1 - 0.06); if (y < ya) y = ya; }
        }
        pos.push(x, y, z);
      }
    }
    for (let k = 0; k < NS; k++) pos.push(...centre(st[st.length - 1]));
    const NT = NX + 2;
    for (let j = 0; j < NT - 1; j++) for (let k = 0; k < NS; k++) {
      const a = j * NS + k, b = j * NS + (k + 1) % NS, c = (j + 1) * NS + k, d = (j + 1) * NS + (k + 1) % NS;
      idx.push(a, c, b, b, c, d);
    }
    let vol = 0;                                                    // volume signé : retourne les faces si elles sont à l'envers
    for (let i = 0; i < idx.length; i += 3) {
      const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
      vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
    }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(garde(g), mat); m.position.y = opt.y || 0;
    return o.ajouter(m);
  }

  const hautAu = (st, x, z) => { const s = interp(norm(st), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, r = Math.min(0.9999, Math.abs(z) / s.w); return yc + hh * Math.pow(1 - Math.pow(r, s.nt), 1 / s.nt); };
  const flancAu = (st, x, y) => { const s = interp(norm(st), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.min(0.9999, Math.abs((y - yc) / hh)), n = y >= yc ? s.nt : s.nb; return s.w * Math.pow(1 - Math.pow(yy, n), 1 / n); };
  const largeurAu = (st, x) => interp(norm(st), x).w;

  /** Matériau d'autocollant : canvas transparent éclairé comme une peinture vernie. */
  function matDecal(draw, cw, ch) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.1, envMap, envMapIntensity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
  }
  function grille(pos, uv, idx, nu, nv, pt) {
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const [p, q] = pt(i / nu, k / nv); pos.push(...p); uv.push(...q); }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, b = (i + 1) * (nv + 1) + k; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const meshGrille = (pos, uv, idx, mat) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(garde(g), mat); m.renderOrder = 2; return o.ajouter(m);
  };
  /** Autocollant drapé sur le dessus : canvas vu de dessus, nez vers la droite, +z vers le bas. */
  function drapeDessus(st, x0, x1, z0, z1, draw, cw = 1024, ch = 256, eps = 0.03) {
    const pos = [], uv = [], idx = [];
    grille(pos, uv, idx, 100, 28, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [[x, hautAu(st, x, z) + eps, z], [u, 1 - v]]; });
    return meshGrille(pos, uv, idx, matDecal(draw, cw, ch));
  }
  /** Autocollant drapé sur les deux flancs : canvas vu du côté +z, nez à droite ; l'autre côté est retourné pour rester lisible. */
  function drapeFlancs(st, x0, x1, yb, yt, draw, cw = 1024, ch = 256, eps = 0.022, roues = null) {
    const res = [];
    // anti-traversée : les sommets de la grille situés dans le disque d'un pneu sont repoussés radialement hors du passage de roue
    // (zone déjà transparente grâce à `trouer`) : aucune pellicule d'autocollant ne coupe le pneu.
    const hors = (x, y) => {
      if (roues) for (const r of roues) { const yc = r.y ?? r.RW, Rm = r.RW * 1.16 + 0.02, dx = x - r.x, dy = y - yc, d = Math.hypot(dx, dy); if (d < Rm) { const k = Rm / Math.max(1e-6, d); x = r.x + dx * k; y = yc + dy * k; } }
      return [x, Math.min(y, yt + 0.25)];
    };
    for (const sg of [1, -1]) {
      // un canvas par côté : au flanc −z la mise en page est symétrisée (même abscisse véhicule), textes redressés
      const mat = matDecal((g, w, h) => o.dessinerCote(draw, g, w, h, sg), cw, ch);
      const pos = [], uv = [], idx = [];
      grille(pos, uv, idx, 120, 24, (u, v) => { const [x, y] = hors(x0 + (x1 - x0) * u, yb + (yt - yb) * v); return [[x, y, sg * (flancAu(st, x, Math.min(y, yt)) + eps)], [sg > 0 ? u : 1 - u, v]]; });
      res.push(meshGrille(pos, uv, idx, mat));
    }
    return res;
  }
  /** Convertisseur monde → canvas pour dessiner un flanc ; `trouer` efface les passages de roues. */
  const carte = (x0, x1, yb, yt, cw, ch) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb);
    return { sx, sy, X: (x) => (x - x0) * sx, Y: (y) => (yt - y) * sy,
      trouer(g, roues, marge = 1.12) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (const r of roues) { g.beginPath(); g.ellipse((r.x - x0) * sx, (yt - (r.y ?? r.RW)) * sy, r.RW * marge * sx, r.RW * marge * sy, 0, 0, Math.PI * 2); g.fill(); } g.restore(); } };
  };
  /** Passages de roues : boîtes sombres derrière chaque pneu (visibles dans l'interstice pneu / carrosserie). */
  function puits(roues, mat) {
    for (const r of roues) for (const sg of [-1, 1]) arcGarde(r.x, r.y ?? r.RW, r.RW * 0.97, r.RW * 1.07, sg * (r.z - r.ep * 0.06), r.ep * 0.8, mat, -0.15, Math.PI + 0.15);   // doublure rentrée sous l'aile
  }
  const arches = (roues) => roues.map((r) => ({ x: r.x, R: r.RW * 1.1 + 0.03, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.03 }));
  /** Barre inclinée entre deux points du plan (x,y), des deux côtés : montants, rétros, jambes d'aileron… */
  function barre(xa, ya, xb, yb, zDemi, ep, prof, mat) {
    const d = Math.hypot(xb - xa, yb - ya), r = [];
    for (const sg of (zDemi === 0 ? [1] : [-1, 1])) { const m = o.boite(d, ep, prof, mat, (xa + xb) / 2, (ya + yb) / 2, sg * zDemi); m.rotation.z = Math.atan2(yb - ya, xb - xa); r.push(m); }
    return r;
  }
  /** Aile arrière : plan + deux dérives + deux jambes. */
  function aile({ x, y, corde, env, ep = 0.1, mat, matDerive, hJambe, zJambe, yBase, incl = 0.0, derive = 0.34 }) {
    if (yBase !== undefined) hJambe = y - yBase + 0.06;                // jambes qui plongent dans le coffre
    const p = o.boite(corde, ep, env, mat, x, y, 0); p.rotation.z = incl;
    for (const sg of [-1, 1]) {
      o.boite(corde * 1.02, derive, 0.07, matDerive || mat, x, y + derive * 0.35, sg * env / 2);
      if (hJambe) o.boite(0.12, hJambe, 0.12, matDerive || mat, x, y - hJambe / 2, sg * (zJambe ?? env * 0.3));
    }
    return p;
  }
  /** Phare rond avec cerclage. */
  function phareRond(x, y, z, r, lum, cerclage) {
    const l = new THREE.Mesh(garde(new THREE.SphereGeometry(r, 18, 12)), lum); l.scale.set(0.4, 1, 1); l.position.set(x, y, z); o.ajouter(l);
    if (cerclage) { const c = o.cyl(r * 1.12, r * 1.12, r * 0.4, cerclage, x - r * 0.12, y, z, 0, Math.PI / 2, 24); return [l, c]; }
    return [l];
  }
  /** Couleur sRGB → linéaire (le rendu est en sortie sRGB sans gestion de couleur : sans cela les teintes sont délavées). */
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const mate = (hex, r = 0.6, m = 0.2) => garde(new THREE.MeshStandardMaterial({ color: lin(hex), roughness: r, metalness: m, envMap, envMapIntensity: 0.5 }));
  /** Peinture vernie sobre (peu de reflets d'environnement : couleurs franches). */
  const pein = (hex, r = 0.3) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: r, metalness: 0.04, clearcoat: 1.0, clearcoatRoughness: 0.08, envMap, envMapIntensity: 0.3 }));   // peinture multicouche : base mate + vernis 2K (clearcoat 1, 0,08), reflet d'environnement dosé
  /** Plaque horizontale découpée en plan (points [x,z]), épaisseur h, face supérieure à yTop. */
  function plaque(pts, yTop, h, mat) {
    const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); s.closePath();
    const m = new THREE.Mesh(garde(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false })), mat); m.rotation.x = Math.PI / 2; m.position.y = yTop; return o.ajouter(m);
  }
  /** Matériau de vitrage teinté. */
  const vitre = (hex, op = 0.82) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: 0.05, metalness: 0.25, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.05, envMap, envMapIntensity: 0.6 }));
  /** Garde-boue en arc de couronne autour d'une roue (centre x,y ; largeur sur z, centrée en z). */
  function arcGarde(x, y, Ri, Ro, z, larg, mat, a0 = -0.25, a1 = Math.PI + 0.25) {
    const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 20 });
    const m = new THREE.Mesh(garde(g), mat); m.position.set(x, y, z - larg / 2); return o.ajouter(m);
  }
  return { ...o, THREE, pein, mate, plaque, vitre, arcGarde, loft, hautAu, flancAu, largeurAu, matDecal, drapeDessus, drapeFlancs, carte, puits, arches, barre, aile, phareRond };
}

/**
 * Coque blindée à facettes : sections polygonales (bas de caisse, chanfrein, flanc, épaule, pont) interpolées
 * linéairement entre stations le long de x, arêtes vives (normales lissées seulement le long de x),
 * passages de roues creusés (paroi intérieure verticale + plafond) pour que la coque coiffe le haut des pneus.
 * stations : [{x, y0 (fond), yS (haut du chanfrein bas), yB (épaule), yT (bord du pont), cr (bombé central),
 *              wB (demi-largeur du fond), w (demi-largeur du flanc), wT (demi-largeur du pont)}] triées par x croissant.
 * opt.arches : [{x, R, y, zin}] ; opt.nx : échantillons en x.
 */
export function coqueFacettes(ctx, stations, mat, opt = {}) {
  const { THREE, chassis, garde } = ctx;
  const ar = opt.arches || [], NX = opt.nx || 170, st = stations.map((s) => ({ cr: 0, ...s }));
  const champs = ['y0', 'yS', 'yB', 'yT', 'cr', 'wB', 'w', 'wT'];
  const at = (x) => {
    let i = 0; while (i < st.length - 2 && x > st[i + 1].x) i++;
    const a = st[i], b = st[i + 1], t = Math.min(1, Math.max(0, (x - a.x) / Math.max(1e-6, b.x - a.x))), r = { x };
    for (const k of champs) r[k] = a[k] + (b[k] - a[k]) * t;
    return r;
  };
  const coupes = [...new Set(ar.map((a) => +a.zin.toFixed(3)))].sort((u, v) => u - v);
  /** demi-section (z ≥ 0) du bas au sommet */
  const demi = (s) => {
    const p = [[0, s.y0]];
    for (const c of coupes) { p.push([Math.min(c, s.wB), s.y0], [Math.min(c + 0.025, s.wB), s.y0]); }
    p.push([s.wB, s.y0], [s.w, s.yS], [s.w, s.yB], [s.wT, s.yT], [0, s.yT + s.cr]);
    return p;
  };
  const anneau = (s) => { const h = demi(s), r = h.slice(); for (let i = h.length - 2; i >= 1; i--) r.push([-h[i][0], h[i][1]]); return r; };
  const xs = []; const x0 = st[0].x, x1 = st[st.length - 1].x;
  for (let j = 0; j < NX; j++) xs.push(x0 + (x1 - x0) * j / (NX - 1));
  for (const s of st) if (!xs.includes(s.x)) xs.push(s.x);
  for (const a of ar) for (const d of [-a.R, a.R]) xs.push(a.x + d);
  xs.sort((u, v) => u - v);
  const anneaux = xs.map((x) => {
    const s = at(x);
    return anneau(s).map(([z, y]) => {
      for (const a of ar) {
        const dx = Math.abs(x - a.x);
        if (dx < a.R && Math.abs(z) > a.zin + 1e-4) { const ya = Math.min(a.y + Math.sqrt(a.R * a.R - dx * dx), s.yT - 0.05); if (y < ya) y = ya; }
      }
      return [x, y, z];
    });
  });
  const n = anneaux[0].length, pos = [], idx = [];
  for (let k = 0; k < n; k++) {                                   // une bande par arête de section : arêtes vives
    const k2 = (k + 1) % n, base = pos.length / 3;
    for (const r of anneaux) pos.push(...r[k], ...r[k2]);
    for (let j = 0; j < anneaux.length - 1; j++) { const a = base + 2 * j; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  for (const [r, sg] of [[anneaux[0], -1], [anneaux[anneaux.length - 1], 1]]) {   // bouchons avant / arrière
    const base = pos.length / 3; let cy = 0; r.forEach((p) => { cy += p[1]; }); cy /= n;
    pos.push(r[0][0], cy, 0); r.forEach((p) => pos.push(...p));
    for (let k = 0; k < n; k++) { const a = base + 1 + k, b = base + 1 + (k + 1) % n; if (sg > 0) idx.push(base, a, b); else idx.push(base, b, a); }
  }
  // orientation : volume signé positif
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
    vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(garde(g), mat); chassis.add(m);
  return { mesh: m, at };
}
