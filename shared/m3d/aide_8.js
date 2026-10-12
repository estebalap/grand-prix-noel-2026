/**
 * Aides communes du groupe 8 : arches de roues, flares, montants, autocollants latéraux (avec arches évidées et
 * côté −z reconstruit sans inverser le texte), toiles à plat (capot, toit) et faces (calandre, hayon).
 * Repère : avant = +x, sol y = 0, z = largeur.
 */
import { outils } from './outils.js';

/** Points d'un arc de passage de roue, de gauche à droite, au-dessus de yBase. */
export function arco(cx, cy, r, yBase, n = 14) {
  const sn = (yBase - cy) / r;
  if (Math.abs(sn) >= 1) return [];
  const aG = Math.PI - Math.asin(sn), aD = Math.asin(sn), pts = [];
  for (let i = 0; i <= n; i++) { const a = aG + (aD - aG) * (i / n); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

export function aide(ctx) {
  const { THREE, garde } = ctx, o = outils(ctx);
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(garde(g), m); k.position.set(x, y, z); return o.ajouter(k); };

  /** Forme plane (x,y) extrudée sur une épaisseur, sans galbe, positionnée à la profondeur z. */
  const forme = (pts, ep, m, z = 0, biseau = 0.015) => { const k = o.profil(pts, ep, m, { galbe: false, biseau }); k.position.z = z; return k; };

  /** Anneau d'aile (flare) autour d'un passage de roue, des deux côtés. */
  const flares = (m, cx, cy, rIn, larg, yBase, zExt, ep) => {
    const ext = arco(cx, cy, rIn + larg, yBase, 16), int = arco(cx, cy, rIn, yBase, 16).reverse();
    if (!ext.length || !int.length) return;
    const pts = [...ext, ...int];
    for (const s of [-1, 1]) forme(pts, ep, m, s * (zExt - ep / 2), 0.012);
  };

  /** Puits de roue sombre qui bouche le tunnel entre les deux passages de roues. */
  const puits = (m, cx, rIn, yBase, yHaut, zi) => o.boite(rIn * 1.9, yHaut - yBase, zi * 2, m, cx, (yBase + yHaut) / 2, 0);

  /** Barre inclinée entre deux points (x,y) du profil, à la profondeur z (montants, arceaux, supports). */
  const barre = (p1, p2, ep, larg, m, z) => {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy);
    const k = o.boite(len, ep, larg, m, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, z); k.rotation.z = Math.atan2(dy, dx); return k;
  };

  /** Matériau canvas sans éclairage (autocollant). */
  const toile = (dessin, cw, ch, opts = {}) => {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d'); dessin(g, cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: opts.f ?? -3, polygonOffsetUnits: -3, side: THREE.FrontSide }));
  };

  /** Toile à plat (capot, toit, coffre) : face visible vers le haut, légèrement penchée (pente) autour de z. */
  const dessus = (dessin, w, d, x, y, z, pente = 0, cw = 512, ch = 512, rotY = 0) => {
    const m = toile(dessin, cw, ch), p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, d)), m);
    p.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(p); g.position.set(x, y, z); g.rotation.z = pente; g.rotation.y = rotY; return o.ajouter(g);
  };

  /** Toile verticale en face avant (sens = 1) ou arrière (sens = −1) : calandre, hayon, bandeau de feux. */
  const face = (dessin, w, h, x, y, z = 0, sens = 1, cw = 512, ch = 256, incl = 0) => {
    const m = toile(dessin, cw, ch), p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), m);
    p.rotation.x = incl; const g = new THREE.Group(); g.add(p); g.position.set(x, y, z); g.rotation.y = sens > 0 ? Math.PI / 2 : -Math.PI / 2; return o.ajouter(g);
  };

  /**
   * Autocollant de flanc des deux côtés. dessin(g, cw, ch, d) dessine le côté +z (avant à droite) ; pour −z, tout est miroité
   * (même emplacement des motifs) et d.txt(str, x, y, align) garde le texte lisible. trous = [{x, y, r}] : arches évidées (monde).
   * zBas / zHaut : position z du bord bas / haut du plan (le haut penche vers l'intérieur pour suivre le fruit de la caisse).
   */
  const lateral = (dessin, { w, h, x, y, zBas, zHaut, cw = 2048, ch = 256, trous = [] }) => {
    for (const s of [1, -1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
      if (s < 0) { g.translate(cw, 0); g.scale(-1, 1); }
      const d = { cote: s, txt: (str, tx, ty, al = 'left') => {
        g.save();
        if (s < 0) { g.translate(tx, ty); g.scale(-1, 1); g.textAlign = al === 'left' ? 'right' : al === 'right' ? 'left' : 'center'; g.fillText(str, 0, 0); }
        else { g.textAlign = al; g.fillText(str, tx, ty); }
        g.restore();
      }, sx: cw / w, sy: ch / h };
      dessin(g, cw, ch, d);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (const t of trous) { g.beginPath(); g.ellipse(((t.x - (x - w / 2)) / w) * cw, ((y + h / 2 - t.y) / h) * ch, (t.r / w) * cw, (t.r / h) * ch, 0, 0, Math.PI * 2); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      const tx = garde(new THREE.CanvasTexture(cv)); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 8;
      const m = garde(new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      // plan maillé dont les sommets tombant dans un passage de roue sont repoussés sur le bord de l'arche (rien dans le pneu)
      const pg = garde(new THREE.PlaneGeometry(w, h, 96, 24)), pp = pg.attributes.position, puv = pg.attributes.uv;
      for (let i = 0; i < pp.count; i++) {
        let px = x + pp.getX(i) * s; const py = y + pp.getY(i);
        for (const t of trous) { const dy = py - t.y, dx = px - t.x; if (dx * dx + dy * dy < t.r * t.r) { const hx = Math.sqrt(t.r * t.r - dy * dy); px = t.x + (dx < 0 ? -hx : hx); } }
        pp.setX(i, (px - x) * s); puv.setX(i, (pp.getX(i) / w) + 0.5);
      }
      pp.needsUpdate = true; puv.needsUpdate = true;
      const p = new THREE.Mesh(pg, m);
      p.rotation.x = -Math.atan2(zBas - zHaut, h);                             // le haut penche vers l'intérieur
      const grp = new THREE.Group(); grp.add(p); grp.position.set(x, y, s * (zBas + zHaut) / 2); if (s < 0) grp.rotation.y = Math.PI;
      o.ajouter(grp);
    }
  };

  /** Texte lisible sur un canvas ordinaire. */
  const police = (g, px, famille = 'Arial Black, Arial, sans-serif', poids = 900) => { g.font = `${poids} ${px}px ${famille}`; };

  /** Verre plus transparent (intérieur visible). */
  const verreClair = (op = 0.5) => { const m = o.verre.clone(); m.opacity = op; return garde(m); };

  /** Habitacle simplifié : deux sièges avant, banquette, tableau de bord, volant (ht = hauteur sous pavillon disponible). */
  const interieur = (mSiege, mTab, { xAv, xAr, y, zs = [-0.42, 0.42], xTab, hTab = 0.3, banquette = true, ht = 0.45 }) => {
    const dos = ht * 0.62;
    for (const z of zs) {
      o.boite(0.5, 0.12, 0.46, mSiege, xAv, y + 0.1, z); const d = o.boite(0.1, dos, 0.46, mSiege, xAv - 0.26, y + 0.1 + dos / 2, z); d.rotation.z = 0.12;
      if (ht > 0.6) o.boite(0.08, 0.14, 0.26, mSiege, xAv - 0.3, y + 0.1 + dos + 0.08, z);
    }
    if (banquette) { o.boite(0.46, 0.12, 1.5, mSiege, xAr, y + 0.1, 0); const d = o.boite(0.1, dos, 1.5, mSiege, xAr - 0.24, y + 0.1 + dos / 2, 0); d.rotation.z = 0.1; }
    o.boite(0.4, hTab, 1.5, mTab, xTab, y + hTab / 2 + 0.02, 0);
    const v = mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 18), mTab, xTab - 0.28, y + hTab + 0.08, zs[0]); v.rotation.y = Math.PI / 2; v.rotation.z = 0.0;
  };

  /** Essuie-glaces posés sur le pare-brise entre deux points (x,y) de sa ligne. */
  const essuies = (p1, p2, t = 0.12, larg = 0.55, zs = [-0.38, 0.3]) => {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    for (const z of zs) { const k = o.boite(0.05, 0.022, larg, o.mat('#0a0a0c', 0.7, 0.2), p1[0] + dx * t + nx * 0.025, p1[1] + dy * t + ny * 0.025, z); k.rotation.z = Math.atan2(dy, dx); }
  };
  /** Plaque d'immatriculation générique (chiffres seulement). */
  const plaque = (x, y, sens, txt, z = 0) => face((g, w, h) => {
    g.fillStyle = '#f2f0e4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a1c22'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#1a1c22'; g.font = '900 64px Arial Black, Arial'; g.textAlign = 'center'; g.fillText(txt, w / 2, h / 2 + 22);
  }, 0.62, 0.3, x, y, z, sens, 256, 124);


  /* ===================== Carrosserie sculptée (loft de sections superellipses, inspiré de l'aide du groupe 2) ===================== */
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'], DEF = { nt: 2.6, nb: 3.4, wt: 1 }, cache = new WeakMap();
  const norm = (st) => { if (!cache.has(st)) cache.set(st, st.map((q) => ({ ...DEF, ...q })).sort((p, q) => p.x - q.x)); return cache.get(st); };
  /** Interpolation de Hermite bornée de tous les champs d'une station. */
  function interp(stIn, x) {
    const st = norm(stIn), n = st.length; let i = 0;
    while (i < n - 2 && x > st[i + 1].x) i++;
    const A = st[i], B = st[i + 1], h = Math.max(1e-6, B.x - A.x), t = Math.min(1, Math.max(0, (x - A.x) / h));
    const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2, r = { x };
    for (const k of CH) {
      const ma = (B[k] - p0[k]) / Math.max(1e-6, B.x - p0.x), mb = (p3[k] - A[k]) / Math.max(1e-6, p3.x - A.x);
      const v = h00 * A[k] + h10 * h * ma + h01 * B[k] + h11 * h * mb, lo = Math.min(A[k], B[k]), hi = Math.max(A[k], B[k]), m = (hi - lo) * 0.25;
      r[k] = Math.min(hi + m, Math.max(lo - m, v));
    }
    return r;
  }
  /** Point de section à l'angle t : superellipse, le haut rétréci par wt (tumblehome). */
  function sec(q, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? q.nt : q.nb, yc = (q.y0 + q.y1) / 2, hh = (q.y1 - q.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), k = sn > 0 ? 1 - (1 - q.wt) * yy : 1;
    return [q.w * zz * k, yc + hh * yy];
  }
  /** Corps lofté : stations [{x, w (demi-largeur), y0, y1, nt, nb, wt}] ; opt.arches = [{x, R, y, zin}] creuse les passages de roues. */
  function loft(stIn, m, opt = {}) {
    const st = norm(stIn), NX = opt.nx || 120, NS = opt.ns || 52, ar = opt.arches || [], x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
    const centre = (q) => [q.x, (q.y0 + q.y1) / 2, 0];
    for (let k = 0; k < NS; k++) pos.push(...centre(st[0]));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, q = interp(st, x);
      for (let k = 0; k < NS; k++) {
        const [z, y0] = sec(q, k / NS * 2 * Math.PI); let y = y0;
        for (const A of ar) { const dx = Math.abs(x - A.x); if (dx < A.R && Math.abs(z) > A.zin) { const ya = Math.min(A.y + Math.sqrt(A.R * A.R - dx * dx), q.y1 - 0.05); if (y < ya) y = ya; } }
        pos.push(x, y, z);
      }
    }
    for (let k = 0; k < NS; k++) pos.push(...centre(st[st.length - 1]));
    const NT = NX + 2;
    for (let j = 0; j < NT - 1; j++) for (let k = 0; k < NS; k++) { const A = j * NS + k, B = j * NS + (k + 1) % NS, C = (j + 1) * NS + k, D = (j + 1) * NS + (k + 1) % NS; idx.push(A, C, B, B, C, D); }
    let vol = 0;
    for (let i = 0; i < idx.length; i += 3) { const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3; vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]); }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return mesh(g, m);
  }
  /** Hauteur de la surface au point (x, z) ; demi-largeur au point (x, y) ; demi-largeur max à x. */
  const hautAu = (st, x, z) => { const q = interp(st, x), yc = (q.y0 + q.y1) / 2, hh = (q.y1 - q.y0) / 2; let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2, [zz] = sec(q, mid * Math.PI / 2); if (zz > Math.abs(z)) lo = mid; else hi = mid; }
    void yc; void hh; return sec(q, lo * Math.PI / 2)[1]; };
  const flancAu = (st, x, y) => { const q = interp(st, x), yc = (q.y0 + q.y1) / 2, hh = (q.y1 - q.y0) / 2, s = Math.max(-0.9999, Math.min(0.9999, (y - yc) / hh));
    const n = s >= 0 ? q.nt : q.nb, yy = Math.abs(s), zz = Math.pow(1 - Math.pow(yy, n), 1 / n), k = s > 0 ? 1 - (1 - q.wt) * yy : 1; return q.w * zz * k; };
  const largeurAu = (st, x) => interp(st, x).w;
  /** Arches au format loft d'après les roues (rayon de passage = RW × f + jeu). */
  const archesDe = (roues, f = 1.1, jeu = 0.04) => roues.map((r) => ({ x: r.x, R: r.RW * f + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.04 }));
  /** Lèvre d'aile arrondie (demi-tore aplati) coiffant le haut du pneu, des deux côtés. */
  function levre(m, r, Ra, tube, zExt, yBase, ecrase = 1.8) {
    const cy = r.y ?? r.RW, sn = Math.max(-0.99, Math.min(0.99, (yBase - cy) / Ra)), a0 = Math.asin(sn), arc = Math.PI - 2 * a0;
    for (const s of [-1, 1]) { const k = mesh(new THREE.TorusGeometry(Ra, tube, 10, 36, arc), m, r.x, cy, s * zExt); k.rotation.z = a0; k.scale.z = ecrase; }
  }
  /** Doublure sombre de passage de roue (arc épais derrière / au-dessus du pneu), face extérieure en retrait dans le pneu. */
  function doublure(m, r, Ra) {
    const cy = r.y ?? r.RW, ep = Math.max(r.ep ?? 0.45, 0.45), zOut = r.z + ep / 2 - 0.035, zIn = r.z - ep / 2 - 0.06;
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape(); sh.absarc(0, 0, Ra, -0.1, Math.PI + 0.1, false); sh.absarc(0, 0, r.RW * 1.03, Math.PI + 0.1, -0.1, true); sh.closePath();
      mesh(new THREE.ExtrudeGeometry(sh, { depth: zOut - zIn, bevelEnabled: false, curveSegments: 20 }), m, r.x, cy, s > 0 ? zIn : -zOut);
    }
    o.boite(Ra * 1.9, 0.05, Math.max(0.1, 2 * zIn), m, r.x, cy + Ra * 0.9, 0);     // plafond entre les deux passages
  }
  /** Barre entre deux points 3D (montants inclinés suivant le tumblehome). */
  function barre3(p1, p2, ep, larg, m) {
    const a = new THREE.Vector3(...p1), b = new THREE.Vector3(...p2), d = b.clone().sub(a), L = d.length();
    const k = mesh(new THREE.BoxGeometry(L, ep, larg), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    k.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()); return k;
  }
  /** Montants posés sur une verrière lofée (des deux côtés), saillants de « sail ». */
  function montants(stc, liste, m, sail = 0.03) {
    const zA = (x, y) => { const q = interp(stc, x); return flancAu(stc, x, Math.min(y, q.y1 - 0.09)) + sail; };   // sous l'arrondi du pavillon
    const yA = (x, y) => Math.min(y, interp(stc, x).y1 - 0.05);
    for (const [xa, ya0, xb, yb0, ep] of liste) { const ya = yA(xa, ya0), yb = yA(xb, yb0); for (const s of [-1, 1]) barre3([xa, ya, s * zA(xa, ya)], [xb, yb, s * zA(xb, yb)], ep, 0.07, m); }
  }
  /** Ellipsoïde (bossage, écope, bulle). */
  const ellipsoide = (m, x, y, z, sx, sy, sz, seg = 24) => { const k = mesh(new THREE.SphereGeometry(1, seg, Math.round(seg / 2)), m, x, y, z); k.scale.set(sx, sy, sz); return k; };

  const toileLit = (cv) => { const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.05, envMap: ctx.envMap, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide, depthWrite: false })); };
  function grille(nu, nv, pt) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const [p, q] = pt(i / nu, k / nv); pos.push(...p); uv.push(...q); }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const A = i * (nv + 1) + k, B = (i + 1) * (nv + 1) + k; idx.push(A, B, A + 1, A + 1, B, B + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  /**
   * Autocollant drapé sur les deux flancs d'un loft. dessin(g, cw, ch, d) dessine le côté +z (nez à droite) avec d.X(x), d.Y(y)
   * (monde → pixels) et d.txt(str, x, y, align) (texte toujours lisible). Côté −z : mêmes emplacements, texte non inversé.
   * trous : [{x, y, r}] passages de roues effacés.
   */
  function drapeFlancs(st, x0, x1, yb, yt, dessin, { cw = 2048, ch = 320, trous = [], eps = 0.018 } = {}) {
    for (const s of [1, -1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
      if (s < 0) { g.translate(cw, 0); g.scale(-1, 1); }
      const d = { cote: s, sx: cw / (x1 - x0), sy: ch / (yt - yb), X: (x) => (x - x0) / (x1 - x0) * cw, Y: (y) => (yt - y) / (yt - yb) * ch,
        txt: (str, tx, ty, al = 'left') => { g.save(); if (s < 0) { g.translate(tx, ty); g.scale(-1, 1); g.textAlign = al === 'left' ? 'right' : al === 'right' ? 'left' : 'center'; g.fillText(str, 0, 0); } else { g.textAlign = al; g.fillText(str, tx, ty); } g.restore(); } };
      dessin(g, cw, ch, d);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (const t of trous) { g.beginPath(); g.ellipse(d.X(t.x), d.Y(t.y), t.r * d.sx, t.r * d.sy, 0, 0, Math.PI * 2); g.fill(); }
      // sommets situés dans un passage de roue : repoussés horizontalement sur le bord de l'arche (aucune maille dans le pneu)
      const geo = grille(140, 26, (u, v) => { let x = x0 + (x1 - x0) * u; const y = yb + (yt - yb) * v;
        for (const t of trous) { const dy = y - t.y, dx = x - t.x; if (dx * dx + dy * dy < t.r * t.r) { const hx = Math.sqrt(t.r * t.r - dy * dy); x = t.x + (dx < 0 ? -hx : hx); } }
        const uu = (x - x0) / (x1 - x0); return [[x, y, s * (flancAu(st, x, y) + eps)], [s > 0 ? uu : 1 - uu, v]]; });
      const k = mesh(geo, toileLit(cv)); k.renderOrder = 2;
    }
  }
  /** Autocollant drapé sur le dessus (canvas vu de dessus, nez à droite, +z vers le bas) : d.X(x), d.Z(z). */
  function drapeDessus(st, x0, x1, z0, z1, dessin, { cw = 1024, ch = 512, eps = 0.02 } = {}) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
    dessin(g, cw, ch, { X: (x) => (x - x0) / (x1 - x0) * cw, Z: (z) => (z - z0) / (z1 - z0) * ch, sx: cw / (x1 - x0), sz: ch / (z1 - z0) });
    const geo = grille(110, 30, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [[x, hautAu(st, x, z) + eps, z], [u, 1 - v]]; });
    const k = mesh(geo, toileLit(cv)); k.renderOrder = 2; return k;
  }
  /** Phare / feu rond : cerclage + optique émissive orientés vers ±x (sens). */
  function rond(x, y, z, r, lum, cerc, sens = 1, prof = 0.1) {
    if (cerc) { const c = mesh(new THREE.CylinderGeometry(r * 1.2, r * 1.2, prof, 24), cerc, x, y, z); c.rotation.z = Math.PI / 2; }
    const l = mesh(new THREE.SphereGeometry(r, 18, 12), lum, x + sens * prof * 0.25, y, z); l.scale.set(0.35, 1, 1); return l;
  }


  /* ===================== Barème « tolérance zéro » : chop top, élargissement, stance flush ===================== */
  /** Interpolation linéaire par morceaux (prolongée par la pente du dernier segment). */
  const carteY = (pts) => (y) => {
    if (y <= pts[0][0]) return y - pts[0][0] + pts[0][1];
    for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [a, b] = [pts[i - 1], pts[i]]; return a[1] + (y - a[0]) * (b[1] - a[1]) / (b[0] - a[0]); }
    const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]]; return b[1] + (y - b[0]) * (b[1] - a[1]) / (b[0] - a[0]);
  };
  /** Mailles d'un ensemble d'objets (objets ou groupes). */
  const maillesDe = (objs) => { const s = new Set(); for (const ob of objs) ob?.traverse?.((k) => { if (k.isMesh) s.add(k); }); return s; };
  /** Mémorise les objets ajoutés au châssis pendant fn() (pour les déclarer rigides). */
  const capter = (fn) => { const n0 = ctx.chassis.children.length; fn(); return ctx.chassis.children.slice(n0); };
  /**
   * Finition commune : toute la carrosserie (repère châssis) est déformée — y ↦ carte(y) (pavillon abaissé : chop top, pare-brise
   * plus couché), z ↦ z × sw (caisse et voies élargies). Les pièces « rigides » (lames d'aileron, rétroviseurs, optiques rondes)
   * sont seulement translatées. Puis chaque essieu est placé à fleur : face extérieure du pneu = aile la plus large au droit
   * de la roue + jeu ; doublures de passages créées en retrait. Renvoie { hauteur, largeur, hToit, wToit }.
   */
  function finir(roues, { carte = [[0, 0], [1, 1]], sw = 1, rigides = [], doublureMat = null, jeu = 0.0, toit = null } = {}) {
    const ch = ctx.chassis, f = carteY(carte), rig = maillesDe(rigides), vus = new Set(), v = new THREE.Vector3();
    ch.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(ch.matrixWorld).invert(), liste = [];
    ch.traverse((k) => { if (k.isMesh) liste.push(k); });
    for (const k of liste) {
      if (vus.has(k.geometry)) k.geometry = garde(k.geometry.clone());
      vus.add(k.geometry);
      const g = k.geometry, M = new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld);
      g.applyMatrix4(M);
      const p = g.attributes.position;
      if (rig.has(k)) {
        g.computeBoundingBox(); const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
        g.translate(0, f(c.y) - c.y, c.z * (sw - 1));
      } else {
        for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i), f(p.getY(i)), p.getZ(i) * sw);
        p.needsUpdate = true; if (g.attributes.normal) g.computeVertexNormals();
      }
      g.computeBoundingBox(); g.computeBoundingSphere();
      if (k.parent !== ch) { k.parent.remove(k); ch.add(k); }
      k.position.set(0, 0, 0); k.rotation.set(0, 0, 0); k.scale.set(1, 1, 1); k.updateMatrix();
    }
    // nuage de points de la carrosserie déformée
    const pts = [];
    for (const k of liste) { const pa = k.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000)); for (let i = 0; i < pa.count; i += st) pts.push([pa.getX(i), pa.getY(i), pa.getZ(i)]); }
    // stance flush : le pneu affleure l'aile (même critère que le banc de mesure)
    for (const r of roues) {
      const R = r.RW, ep = Math.max(r.ep ?? 0.45, 0.45); let zb = 0;
      for (const q of pts) if (Math.abs(q[0] - r.x) < R * 0.8 && q[1] > R * 0.9 && q[1] < R * 2.1) zb = Math.max(zb, Math.abs(q[2]));
      r.z = zb + jeu - ep / 2;
    }
    if (doublureMat) for (const r of roues) doublure(doublureMat, r, r.RW * 1.1 + 0.08);
    let hMax = 0, zMax = 0; for (const q of pts) { hMax = Math.max(hMax, q[1]); zMax = Math.max(zMax, Math.abs(q[2])); }
    const res = { hauteur: Math.max(hMax, ...roues.map((r) => 2 * r.RW)), largeur: 2 * zMax };
    if (toit) {   // pavillon : sommet (hors aileron / accessoires) et largeur de la surface supérieure
      const yT = f(toit.y); let w = 0;
      for (const q of pts) if (q[0] > toit.x0 && q[0] < toit.x1 && q[1] > yT - (toit.bande ?? 0.07) && q[1] <= yT + 0.01) w = Math.max(w, Math.abs(q[2]));
      res.hToit = yT; res.wToit = 2 * w;
      let wc = 0; for (const q of pts) if (q[1] > 0.25 * hMax && q[1] < 0.62 * hMax) wc = Math.max(wc, Math.abs(q[2]));
      console.log('BAREME', JSON.stringify({ hToit: +yT.toFixed(3), wToit: +(2 * w).toFixed(3), Wcaisse: +(2 * wc).toFixed(3), hToit_sur_W: +(yT / (2 * Math.max(wc, ...roues.map((r) => r.z + Math.max(r.ep, 0.45) / 2)))).toFixed(3), toit_sur_Wc: +(w / wc).toFixed(3), roues: roues.map((r) => +r.z.toFixed(3)) }));
    }
    return res;
  }

  return { o, mesh, forme, loft, finir, capter, carteY, interp, hautAu, flancAu, largeurAu, archesDe, levre, doublure, barre3, montants, ellipsoide, drapeFlancs, drapeDessus, rond, essuies, plaque, flares, puits, barre, toile, dessus, face, lateral, police, verreClair, interieur };
}
