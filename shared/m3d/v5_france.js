/* Chantier V5 — modèles refaits (escouade « france »). Ce module est rempli par l'escouade ; il prime sur groupe1..10.
 *
 * FR01 DS 7 Élysée · FR02 Mégane R.S. Trophy · FR03 DS 21 Pallas · FR04 R5 Turbo · FR05 DS 4 (« 1.2L PureTech »).
 * Ces Majorette reproduisent des voitures de série : chaque caisse est modelée EN MÈTRES d'après les cotes constructeur
 * (longueur, largeur, hauteur, empattement, voies, monte pneumatique), dans un sous-groupe mis à l'échelle ECH. Les livrées
 * (couleurs, arabesques, monuments stylisés) sont celles des miniatures. Aucun logo, aucun mot-symbole de marque.
 *
 * Moteur de caisse propre à l'escouade (« sections pilotées ») :
 *  - caisse basse = loft de sections fermées, chacune construite à partir de courbes de profil et de plan en fonction de x :
 *    bas de caisse, ligne d'épaule (ceinture), dessus axial (capot / coffre), demi-largeur maxi, rentrée du bas, épaule,
 *    hauteur du ventre ; arrondis par subdivision de Chaikin puis rééchantillonnage à abscisse curviligne constante ;
 *  - passages de roues creusés dans la section (relevage sur l'arc), puits sombres ; jupes arrière (DS) = panneaux peints posés
 *    exactement sur la surface d'origine du flanc, à bord inférieur net ;
 *  - pavillon = second loft ouvert (ceinture → montant → toit bombé → montant → ceinture) avec retrait (tumblehome) ;
 *  - vitrages, joints, phares, calandres, autocollants = « patchs » conformes posés sur ces surfaces (face avant / arrière,
 *    flancs, dessus), donc toujours collés à la tôle, jamais flottants.
 * Repère : avant = +x, sol y = 0, z = largeur.
 */
import { outils } from './outils.js';

/** Échelle commune de l'escouade : unités de scène par mètre réel (une berline de 4,6 m ≈ 6,7 unités). */
const ECH = 1.45;

/* ====================================================================================== outils géométriques */
/** Courbe monotone (Hermite de Fritsch–Carlson) passant par des points [x, y] : aucun dépassement entre deux points. */
function courbe(ptsIn) {
  const P = [...ptsIn].sort((a, b) => a[0] - b[0]), n = P.length;
  if (n === 1) return () => P[0][1];
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-12) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
/** Valeur constante, tableau de points (courbe) ou fonction → fonction de x. */
const fx = (v) => (typeof v === 'function' ? v : Array.isArray(v) ? courbe(v) : () => v);
/** Subdivision de Chaikin d'une polyligne ouverte (extrémités conservées) : arrondit les angles. */
function chaikin(P, n) {
  for (let k = 0; k < n; k++) {
    const Q = [P[0]];
    for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    Q.push(P[P.length - 1]); P = Q;
  }
  return P;
}
/** Rééchantillonne une polyligne en n points également espacés (abscisse curviligne). */
function reech(P, n) {
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const T = L[L.length - 1], out = [];
  if (T < 1e-9) { for (let i = 0; i < n; i++) out.push([P[0][0], P[0][1]]); return out; }
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = T * i / (n - 1);
    while (j < P.length - 2 && L[j + 1] < s) j++;
    const t = (s - L[j]) / Math.max(1e-12, L[j + 1] - L[j]);
    out.push([P[j][0] + (P[j + 1][0] - P[j][0]) * t, P[j][1] + (P[j + 1][1] - P[j][1]) * t]);
  }
  return out;
}
/** Intervalle [min, max] de la première coordonnée d'un polygone (a, b) à la cote b (null si hors polygone). */
function tranche(poly, b) {
  const as = [];
  for (let i = 0; i < poly.length; i++) {
    const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length];
    if ((b0 - b) * (b1 - b) <= 0 && b0 !== b1) as.push(a0 + (a1 - a0) * (b - b0) / (b1 - b0));
  }
  return as.length < 2 ? null : [Math.min(...as), Math.max(...as)];
}
/** Point (a, b) dans un polygone fermé (règle pair-impair). */
function dansPoly(poly, a, b) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ai, bi] = poly[i], [aj, bj] = poly[j];
    if ((bi > b) !== (bj > b) && a < (aj - ai) * (b - bi) / (bj - bi) + ai) c = !c;
  }
  return c;
}

/* ====================================================================================== dessins d'autocollants (motifs génériques) */
function arabesque(g, pts, coul, ep) {
  g.strokeStyle = coul; g.lineWidth = ep; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i + 2 < pts.length + 0; i += 3) g.bezierCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1]);
  g.stroke();
}
/** boucle de ruban (« o » calligraphique) */
function boucle(g, cx, cy, r, coul, ep) { g.strokeStyle = coul; g.lineWidth = ep; g.beginPath(); g.ellipse(cx, cy, r, r * 1.15, 0.3, 0, Math.PI * 2); g.stroke(); }
/** tour métallique stylisée (silhouette générique de monument) */
function tour(g, cx, base, h, coul, ep) {
  g.strokeStyle = coul; g.fillStyle = coul; g.lineWidth = ep; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(cx - h * 0.27, base); g.quadraticCurveTo(cx - h * 0.07, base - h * 0.32, cx - h * 0.03, base - h * 0.62); g.lineTo(cx, base - h);
  g.lineTo(cx + h * 0.03, base - h * 0.62); g.quadraticCurveTo(cx + h * 0.07, base - h * 0.32, cx + h * 0.27, base); g.stroke();
  g.beginPath(); g.moveTo(cx - h * 0.17, base - h * 0.2); g.lineTo(cx + h * 0.17, base - h * 0.2); g.moveTo(cx - h * 0.075, base - h * 0.48); g.lineTo(cx + h * 0.075, base - h * 0.48); g.stroke();
  g.beginPath(); g.arc(cx, base, h * 0.13, Math.PI, 0); g.stroke();
  g.beginPath(); g.moveTo(cx - h * 0.17, base - h * 0.2); g.lineTo(cx + h * 0.075, base - h * 0.48); g.moveTo(cx + h * 0.17, base - h * 0.2); g.lineTo(cx - h * 0.075, base - h * 0.48); g.stroke();
}
/** moulin à vent stylisé */
function moulin(g, cx, base, h, coul, ep) {
  g.strokeStyle = coul; g.fillStyle = coul; g.lineWidth = ep; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - h * 0.16, base); g.lineTo(cx - h * 0.1, base - h * 0.55); g.lineTo(cx + h * 0.1, base - h * 0.55); g.lineTo(cx + h * 0.16, base); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx - h * 0.13, base - h * 0.55); g.lineTo(cx, base - h * 0.7); g.lineTo(cx + h * 0.13, base - h * 0.55); g.fill();
  const yc = base - h * 0.62;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.5, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    g.beginPath(); g.moveTo(cx + ca * h * 0.06, yc + sa * h * 0.06); g.lineTo(cx + ca * h * 0.45, yc + sa * h * 0.45);
    g.lineTo(cx + ca * h * 0.45 + px * h * 0.09, yc + sa * h * 0.45 + py * h * 0.09); g.lineTo(cx + ca * h * 0.1 + px * h * 0.06, yc + sa * h * 0.1 + py * h * 0.06); g.closePath(); g.fill();
  }
}
/** basilique à dômes stylisée */
function basilique(g, cx, base, h, coul, ep) {
  g.strokeStyle = coul; g.lineWidth = ep; g.lineJoin = 'round';
  g.strokeRect(cx - h * 0.45, base - h * 0.42, h * 0.9, h * 0.42);
  g.beginPath(); g.arc(cx, base - h * 0.42, h * 0.24, Math.PI, 0); g.stroke();
  g.beginPath(); g.moveTo(cx, base - h * 0.66); g.lineTo(cx, base - h * 0.86); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * h * 0.34, base - h * 0.42, h * 0.1, Math.PI, 0); g.stroke(); }
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(cx + i * h * 0.17, base - h * 0.08, h * 0.05, Math.PI, 0); g.stroke(); }
}
/** pont de pierre à arches */
function pont(g, x0, x1, base, h, coul, ep) {
  g.strokeStyle = coul; g.lineWidth = ep; g.beginPath(); g.moveTo(x0, base - h); g.lineTo(x1, base - h); g.stroke();
  const n = 6, w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(x0 + w * (i + 0.5), base, w * 0.38, h * 0.62, 0, Math.PI, 0); g.stroke(); }
  for (let i = 0; i < 14; i++) { const x = x0 + (x1 - x0) * i / 13; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x, base - h * 1.3); g.stroke(); }
}

/* ====================================================================================== textures de calandre */
function texCalandre(THREE, garde, motif, fond, trait, cw = 512, ch = 256) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
  g.fillStyle = fond; g.fillRect(0, 0, cw, ch);
  if (motif === 'losanges') {                       // pointes de diamant en quinconce
    const p = 22;
    for (let j = 0; j * p * 0.5 < ch + p; j++) for (let i = 0; i * p < cw + p; i++) {
      const x = i * p + (j % 2) * p / 2, y = j * p * 0.5;
      g.fillStyle = trait; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 3, y - 3); g.lineTo(x - 3, y - 3); g.closePath(); g.fill();
    }
  } else if (motif === 'nid') {                     // nid d'abeille
    const r = 11, dx = r * 1.75, dy = r * 1.5;
    g.strokeStyle = trait; g.lineWidth = 3;
    for (let j = 0; j * dy < ch + dy; j++) for (let i = 0; i * dx < cw + dx; i++) {
      const cx = i * dx + (j % 2) * dx / 2, cy = j * dy; g.beginPath();
      for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
  } else if (motif === 'lamelles') {                // lames horizontales
    g.fillStyle = trait; for (let y = 10; y < ch; y += 34) g.fillRect(0, y, cw, 12);
  } else if (motif === 'grille') {                  // maille carrée
    g.strokeStyle = trait; g.lineWidth = 4; for (let x = 0; x < cw; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); } for (let y = 0; y < ch; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
  }
  const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
}

/* ====================================================================================== moteur de caisse */
/**
 * D (en MÈTRES, origine au milieu de l'empattement) :
 *  xAv, xAr : nez et poupe ; bas, ceint, dessus, demi : courbes de profil / plan [[x, v]…] ; kBas, kEp, hMax, q : forme de section
 *  (rentrée du bas, épaule, hauteur du ventre, bombé du dessus) ; capAv, capAr : rayons d'arrondi du nez et de la poupe ;
 *  serre : { x0, x1, toit, demiToit, retrait, bombe, galbe } ; roues : [{ x, R, ep, z, avant, jeu, jupe }] ;
 *  couleurs : { caisse, toit, vitre, rug, metal } ; matCorps(x, y, z) → 'peint' | 'noir' | 'sombre' | 'mat2'.
 */
function caisse(ctx, D) {
  const { THREE, garde } = ctx;
  const grp = new THREE.Group(); grp.scale.setScalar(ECH); grp.name = 'caisse-fr'; ctx.chassis.add(grp);
  const o = outils({ ...ctx, chassis: grp });
  const bas = fx(D.bas), ceint = fx(D.ceint), dessus = fx(D.dessus), demi = fx(D.demi), kBas = fx(D.kBas ?? 0.92), kEp = fx(D.kEp ?? 0.95), hMax = fx(D.hMax ?? 0.5), qT = fx(D.q ?? 2.4);
  const xAv = D.xAv, xAr = D.xAr, capAv = D.capAv ?? 0.1, capAr = D.capAr ?? 0.1, NH = 46;
  /** nervures de capot : bourrelets gaussiens { z, h, l, x0, x1 } (hauteur h, demi-largeur l), fondus aux extrémités en x */
  const nervure = (x, z) => { let d = 0; for (const n of D.nervures || []) { if (x < n.x0 || x > n.x1) continue; const t = Math.min(1, (x - n.x0) / 0.25, (n.x1 - x) / 0.25); d += n.h * t * Math.exp(-(((z - n.z) / n.l) ** 2)); } return d; };
  const C = D.couleurs;
  const peint = o.lac(C.caisse, C.rug ?? 0.24, C.metal ?? 0.35); peint.side = THREE.DoubleSide;
  const toitM = C.toit ? o.lac(C.toit, 0.24, C.metal ?? 0.35) : peint; toitM.side = THREE.DoubleSide;
  const noir = o.mat(C.noir ?? '#16181d', 0.62, 0.25); noir.side = THREE.DoubleSide;
  const sombre = o.mat('#08090c', 0.9, 0.05); sombre.side = THREE.DoubleSide;
  const mat2 = C.mat2 ? o.lac(C.mat2, 0.26, 0.3) : noir; mat2.side = THREE.DoubleSide;
  const vitre = garde(new THREE.MeshPhysicalMaterial({ color: o.lin(C.vitre ?? '#0d131d'), roughness: 0.04, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, envMap: ctx.envMap, envMapIntensity: 1.25, side: THREE.DoubleSide }));
  const joint = C.cadre === 'chrome' ? o.chrome : o.mat('#0a0b0e', 0.5, 0.2);
  /* vitres latérales : l'habitacle de la miniature (sièges colorés) est peint SOUS le vernis du verre — le verre reste opaque,
     donc aucune coque intérieure à modéliser, mais la teinte des sièges se lit à travers les vitres comme sur le jouet. */
  let vitreCote = vitre;
  if (C.interieur) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
    const fond = g.createLinearGradient(0, 0, 0, 128); fond.addColorStop(0, C.vitre ?? '#0d131d'); fond.addColorStop(1, '#05070b'); g.fillStyle = fond; g.fillRect(0, 0, 256, 128);
    const c = new THREE.Color(C.interieur).multiplyScalar(0.62), ci = '#' + c.getHexString();
    g.fillStyle = ci; g.beginPath(); g.moveTo(70, 128); g.lineTo(78, 52); g.quadraticCurveTo(80, 40, 96, 40); g.lineTo(160, 40); g.quadraticCurveTo(176, 40, 178, 52); g.lineTo(186, 128); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(128, 26, 26, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 0, 256, 18);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding;
    vitreCote = garde(new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.04, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03, envMap: ctx.envMap, envMapIntensity: 1.0, side: THREE.DoubleSide }));
  }

  /* ---------- roues et passages */
  // le moteur impose une bande de roulement ≥ 0,45 unité : on raisonne sur la largeur RÉELLEMENT posée (passages, jupes)
  const roues = D.roues.map((r) => ({ jeu: 0.085, ...r, ep: Math.max(r.ep, 0.452 / ECH) }));
  const arches = roues.map((r) => ({ x: r.x, R: r.R + r.jeu, y: r.R, zin: r.z - r.ep / 2 - 0.035, ...(r.jupe ? { jupe: r.jupe } : {}) }));

  /* ---------- section de caisse basse */
  function demiSection(x) {
    const yb = bas(x), yc = Math.max(ceint(x), yb + 0.05), yt = Math.max(dessus(x), yc), W = demi(x), Wb = W * kBas(x), Ws = W * kEp(x), yM = yb + (yc - yb) * hMax(x), q = qT(x);
    const P = [];
    for (let i = 0; i <= 4; i++) P.push([Wb * i / 4, yb]);
    for (let i = 1; i <= 6; i++) { const t = i / 6; P.push([Wb + (W - Wb) * Math.sin(Math.PI / 2 * t), yb + (yM - yb) * t]); }
    for (let i = 1; i <= 6; i++) { const t = i / 6; P.push([W - (W - Ws) * (1 - Math.cos(Math.PI / 2 * t)), yM + (yc - yM) * t]); }
    for (let i = 1; i <= 16; i++) { const z = Ws * (1 - i / 16); P.push([z, yt - (yt - yc) * Math.pow(z / Ws, q) + nervure(x, z)]); }
    return { P: reech(chaikin(P, 3), NH), yC: (yb + yt) / 2 };
  }
  /** facteur d'arrondi des extrémités (ellipse de rayon cap) */
  const fCap = (x) => {
    if (x > xAv - capAv) { const t = Math.min(1, (x - (xAv - capAv)) / capAv); return Math.sqrt(Math.max(0, 1 - t * t)); }
    if (x < xAr + capAr) { const t = Math.min(1, ((xAr + capAr) - x) / capAr); return Math.sqrt(Math.max(0, 1 - t * t)); }
    return 1;
  };
  const cache = new Map();
  /** anneau complet (fermé, 2·NH − 2 points [z, y]) à l'abscisse x, extrémités arrondies — avant creusement des passages. */
  function anneau(x) {
    const cle = Math.round(x * 20000); let r = cache.get(cle); if (r) return r;
    const xs = Math.min(xAv - capAv, Math.max(xAr + capAr, x)), { P, yC } = demiSection(xs), f = fCap(x);
    const H = P.map(([z, y]) => [z * f, yC + (y - yC) * f]);
    r = H.concat(H.slice(1, -1).reverse().map(([z, y]) => [-z, y]));
    cache.set(cle, r); return r;
  }
  const dedans = (x, y, z) => x <= xAv && x >= xAr && dansPoly(anneau(x), z, y);
  /** abscisse de la face avant (sens +1) ou arrière (−1) à la hauteur y et au décalage z. */
  function faceX(y, z, sens) {
    const xs = sens > 0 ? xAv : xAr; let prev = xs;
    for (let d = 0.004; d < 1.6; d += 0.012) {
      const x = xs - sens * d;
      if (dedans(x, y, z)) { let a = prev, b = x; for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (dedans(m, y, z)) b = m; else a = m; } return (a + b) / 2; }
      prev = x;
    }
    return xs - sens * 1.6;
  }
  /** max d'une coordonnée sur les segments d'un anneau qui coupent une valeur de l'autre coordonnée. */
  function coupe(ring, ferme, iVal, val, iOut, signe) {
    let best = -Infinity; const n = ring.length;
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      if ((a[iVal] - val) * (b[iVal] - val) <= 0 && a[iVal] !== b[iVal]) {
        const t = (val - a[iVal]) / (b[iVal] - a[iVal]), v = a[iOut] + (b[iOut] - a[iOut]) * t;
        if (iOut === 0 ? v * signe > best : v > best) best = iOut === 0 ? v * signe : v;
      }
    }
    if (best === -Infinity) {                       // aucune coupe (bord exact, section dégénérée) : point le plus proche
      let dm = Infinity; for (const p of ring) { const d = Math.abs(p[iVal] - val); if (d < dm) { dm = d; best = iOut === 0 ? Math.abs(p[0]) : p[1]; } }
    }
    return best;
  }
  const flancCorps = (x, y) => coupe(anneau(x), true, 1, y, 0, 1);      // z du flanc +z
  const dessusCorps = (x, z) => coupe(anneau(x), true, 0, Math.abs(z), 1);  // y du dessus

  /** relevage d'un point de caisse par les passages de roues ; renvoie [y, creusé ?] */
  function pousse(x, z, y) {
    const az = Math.abs(z); let creuse = false;
    for (const a of arches) {
      const dx = Math.abs(x - a.x); if (dx >= a.R || az <= a.zin) continue;
      const yA = a.y + Math.sqrt(a.R * a.R - dx * dx);
      if (y < yA) { y = yA; creuse = true; }
    }
    return [y, creuse];
  }
  /** autocollants : un point sous une arche est remonté au-dessus du passage (jamais dans un pneu). */
  function souleve(x, y) {
    // sous une jupe, l'autocollant reste sur la jupe (bord inférieur) ; ailleurs il passe au-dessus de l'arche
    for (const a of arches) { const dx = Math.abs(x - a.x); if (dx < a.R + 0.03) { const yA = a.y + Math.sqrt(Math.max(0, (a.R + 0.03) ** 2 - dx * dx)), ya = a.jupe !== undefined ? Math.min(yA, a.jupe + 0.012) : yA; if (y < ya) y = ya; } }
    return y;
  }

  /* ---------- maillage générique d'une grille de points */
  function grille(P, mats, idxMat, ferme, dehors) {
    const nu = P.length - 1, nk = P[0].length, nv = ferme ? nk : nk - 1, pos = [], uv = [];
    for (let i = 0; i <= nu; i++) for (let k = 0; k < nk; k++) { const p = P[i][k]; pos.push(p[0], p[1], p[2]); uv.push(i / nu, k / Math.max(1, nk - 1)); }
    const parMat = mats.map(() => []);
    let vote = 0;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
      const a = i * nk + k, b = i * nk + (k + 1) % nk, c = (i + 1) * nk + k, d = (i + 1) * nk + (k + 1) % nk;
      const m = idxMat ? idxMat(i, k) : 0;
      parMat[m].push(a, c, b, b, c, d);
      if ((i * 7 + k * 3) % 5 === 0) {           // vote d'orientation : normale (c−a)×(b−a) contre la direction « dehors »
        A.fromArray(pos, a * 3); B.fromArray(pos, b * 3); Cc.fromArray(pos, c * 3);
        N.subVectors(Cc, A).cross(B.clone().sub(A));
        if (N.lengthSq() > 1e-14) { const dv = dehors(A); vote += Math.sign(N.dot(dv)); }
      }
    }
    const idx = []; const g = new THREE.BufferGeometry();
    let deb = 0;
    parMat.forEach((l, m) => {
      if (vote < 0) for (let t = 0; t < l.length; t += 3) { const s = l[t + 1]; l[t + 1] = l[t + 2]; l[t + 2] = s; }
      idx.push(...l); if (l.length) g.addGroup(deb, l.length, m); deb += l.length;
    });
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(garde(g), mats.length === 1 ? mats[0] : mats);
    grp.add(mesh); return mesh;
  }

  /* ---------- caisse basse */
  const xsC = [];
  {
    const set = new Set();
    const add = (x) => { if (x >= xAr && x <= xAv) set.add(Math.round(x * 10000) / 10000); };
    for (let x = xAr + capAr; x <= xAv - capAv; x += 0.022) add(x);
    for (let i = 0; i <= 14; i++) { const a = Math.PI / 2 * i / 14; add(xAv - capAv + capAv * Math.sin(a)); add(xAr + capAr - capAr * Math.sin(a)); }
    for (const a of arches) for (const d of [-1, 1]) { add(a.x + d * (a.R - 0.002)); add(a.x + d * (a.R + 0.002)); for (let i = 1; i < 30; i++) add(a.x + d * a.R * i / 30); }
    add(xAv); add(xAr); add(xAv - capAv); add(xAr + capAr);
    xsC.push(...[...set].sort((a, b) => a - b));
  }
  const matsCorps = [peint, noir, sombre, mat2], codeMat = { peint: 0, noir: 1, sombre: 2, mat2: 3 };
  const Pc = [], Fc = [];
  for (const x of xsC) {
    const r = anneau(x), row = [], fl = [];
    for (const [z, y0] of r) { const [y, cr] = pousse(x, z, y0); row.push([x, y, z]); fl.push(cr); }
    Pc.push(row); Fc.push(fl);
  }
  /** le centre d'un quad est-il dans un puits de roue (voûte, paroi intérieure, bords d'ouverture) ? */
  const dansPuits = (x, y, z) => {
    const az = Math.abs(z);
    for (const a of arches) {
      const dx = Math.abs(x - a.x); if (dx >= a.R + 0.003 || az <= a.zin - 0.01) continue;
      const yA = a.y + Math.sqrt(Math.max(0, a.R * a.R - dx * dx));
      if (y < yA + 0.006) return true;
    }
    return false;
  };
  const corps = grille(Pc, matsCorps, (i, k) => {
    const nk = Pc[0].length, k2 = (k + 1) % nk;
    const p = [0, 1, 2].map((c) => (Pc[i][k][c] + Pc[i][k2][c] + Pc[i + 1][k][c] + Pc[i + 1][k2][c]) / 4);
    if (dansPuits(p[0], p[1], p[2])) return 2;                                          // puits de roue sombre
    if (!D.matCorps) return 0;
    return codeMat[D.matCorps(p[0], p[1], p[2])] ?? 0;
  }, true, (p) => { const r = anneau(p.x); let yc = 0; for (const q of r) yc += q[1]; yc /= r.length; return new THREE.Vector3(0, p.y - yc, p.z); });
  corps.name = 'caisse';

  /* ---------- pavillon */
  const S = D.serre, toit = fx(S.toit), demiToit = fx(S.demiToit), retrait = fx(S.retrait ?? 0.05), bombe = fx(S.bombe ?? 0.05), galbe = fx(S.galbe ?? 0.03), NG = 22;
  const zEpaule = (x) => demi(x) * kEp(x);
  const cacheS = new Map();
  /** demi-section du pavillon : ceinture (+z) → montant → bord de toit → axe. */
  function demiSerre(x) {
    const cle = Math.round(x * 20000); let r = cacheS.get(cle); if (r) return r;
    const yc = ceint(x) - 0.025, t = Math.max(toit(x), yc), h = t - yc, zB = zEpaule(x) - retrait(x), zR = Math.min(demiToit(x), zB - 0.005);
    const cr = Math.min(bombe(x), 0.3 * h), yR = t - cr, P = [];
    const cx = (zB + zR) / 2 + galbe(x) * Math.min(1, h / 0.3), cy = (yc + yR) / 2;
    for (let i = 0; i <= 8; i++) { const u = i / 8, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; P.push([a * zB + b * cx + c * zR, a * yc + b * cy + c * yR]); }
    for (let i = 1; i <= 8; i++) { const z = zR * (1 - i / 8); P.push([z, t - cr * Math.pow(z / Math.max(zR, 1e-6), 2)]); }
    r = reech(chaikin(P, 3), NG); cacheS.set(cle, r); return r;
  }
  const anneauSerre = (x) => { const H = demiSerre(x); return H.concat(H.slice(0, -1).reverse().map(([z, y]) => [-z, y])); };
  const flancSerre = (x, y) => coupe(demiSerre(x), false, 1, y, 0, 1);
  const dessusSerre = (x, z) => coupe(demiSerre(x), false, 0, Math.abs(z), 1);
  const yBordToit = (x) => { const yc = ceint(x) - 0.025, t = Math.max(toit(x), yc); return t - Math.min(bombe(x), 0.3 * (t - yc)); };
  const zBordToit = (x) => Math.min(demiToit(x), zEpaule(x) - retrait(x) - 0.005);
  {
    const Ps = [];
    for (let x = S.x0; x >= S.x1 - 1e-9; x -= 0.02) Ps.push(anneauSerre(x).map(([z, y]) => [x, y, z]));
    const m = grille(Ps.reverse(), [toitM], null, false, (p) => new THREE.Vector3(0, p.y - ceint(p.x), p.z));
    m.name = 'pavillon';
  }

  /* ---------- patchs conformes */
  /** grille paramétrique f(u, v) → [x, y, z] ; dehors : vecteur sortant pour l'orientation. */
  function patch(nu, nv, f, mat, dehors) {
    const P = [];
    for (let i = 0; i <= nu; i++) { const row = []; for (let k = 0; k <= nv; k++) row.push(f(i / nu, k / nv)); P.push(row); }
    const m = grille(P, [mat], null, false, () => dehors.clone()); m.renderOrder = 1; return m;
  }
  /** patch délimité par un polygone convexe (a, b) ; map(a, b) → [x, y, z] ; marge > 0 l'agrandit. */
  function poly(pts, map, mat, dehors, { nu = 16, nv = 12, marge = 0 } = {}) {
    const bs = pts.map((p) => p[1]), b0 = Math.min(...bs) - marge, b1 = Math.max(...bs) + marge;
    const sl = (b) => { const t = tranche(pts, Math.min(Math.max(...bs) - 1e-6, Math.max(Math.min(...bs) + 1e-6, b))); return t ? [t[0] - marge, t[1] + marge] : null; };
    return patch(nu, nv, (u, v) => { const b = b0 + (b1 - b0) * v, t = sl(b); const a = t ? t[0] + (t[1] - t[0]) * u : 0; return map(a, b); }, mat, dehors);
  }
  /** ruban le long d'une polyligne (a, b) de largeur l. */
  function ruban(ligne, l, map, mat, dehors, n = 40) {
    const L = reech(ligne, n + 1);
    return patch(n, 2, (u, v) => {
      const i = Math.round(u * n), p = L[i], a = L[Math.max(0, i - 1)], b = L[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const s = (v - 0.5) * l; return map(p[0] - dy / d * s, p[1] + dx / d * s);
    }, mat, dehors);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  /** surfaces d'accueil des patchs */
  const sur = {
    avant: (eps = 0.006) => (z, y) => [faceX(y, z, 1) + eps, y, z],
    arriere: (eps = 0.006) => (z, y) => [faceX(y, z, -1) - eps, y, z],
    flanc: (eps = 0.006, sg = 1) => (x, y) => [x, y, sg * (flancCorps(x, y) + eps)],
    // sur le pavillon, un point au-dessus du bord de toit est ramené sous ce bord (pas de saut du flanc vers le toit)
    flancSerre: (eps = 0.006, sg = 1) => (x, y) => { const yy = Math.min(y, yBordToit(x) - 0.012); return [x, yy, sg * (flancSerre(x, yy) + eps)]; },
    dessus: (eps = 0.006) => (x, z) => [x, dessusCorps(x, z) + eps, z],
    dessusSerre: (eps = 0.006) => (x, z) => [x, dessusSerre(x, z) + eps, z],
  };
  /** même patch sur les deux flancs */
  const deuxFlancs = (fn) => { fn(1); fn(-1); };

  /* ---------- vitrages : joint (noir ou chrome) + verre */
  for (const w of D.vitres || []) deuxFlancs((sg) => {
    poly(w, sur.flancSerre(0.004, sg), joint, V(0, 0, sg), { marge: 0.022 });
    poly(w, sur.flancSerre(0.008, sg), vitreCote, V(0, 0, sg));
  });
  /** pare-brise / lunette : x de x0 à x1, demi-largeur = bord de toit − montant */
  const glace = (G) => {
    if (!G) return;
    const zl = (x, m) => Math.max(0.02, Math.min(zBordToit(x), flancSerre(x, ceint(x) + 0.01) - 0.02) - m);
    const f = (eps, m, dm) => (u, v) => { const x = G.x0 + (G.x1 - G.x0) * u, z = (v * 2 - 1) * zl(x, G.montant - dm); return [x, dessusSerre(x, z) + eps, z]; };
    patch(18, 20, f(0.004, G.montant, 0.022), joint, V(0, 1, 0));
    patch(18, 20, f(0.008, G.montant, 0), vitre, V(0, 1, 0));
  };
  glace(D.parebrise); glace(D.lunette);

  /* ---------- rétroviseurs (dans la largeur hors tout de la caisse) */
  if (D.retro) {
    // coque en goutte allongée vers l'extérieur, bornée à la largeur de caisse (+1 cm) pour ne pas fausser la largeur hors tout
    const R = D.retro, x = R.x, y = ceint(x) + (R.dy ?? 0.09), zS = flancSerre(x, y), zMax = demi(x) + 0.01;
    const mR = R.noir ? noir : peint, ez = Math.max(0.045, (zMax - zS) / 2 - 0.01), zc = zMax - ez;
    for (const sg of [-1, 1]) {
      const coque = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI)), mR);
      coque.scale.set(0.075, 0.058, ez); coque.position.set(x, y, sg * zc); grp.add(coque);
      const miroir = new THREE.Mesh(garde(new THREE.CircleGeometry(1, 20)), vitre); miroir.scale.set(ez * 0.85, 0.045, 1); miroir.rotation.set(0, -Math.PI / 2, Math.PI / 2); miroir.position.set(x - 0.076, y, sg * zc); grp.add(miroir);
      o.boite(0.07, 0.03, Math.max(0.02, zc - ez - zS + 0.05), noir, x + 0.01, y - 0.04, sg * (zS + (zc - ez - zS) / 2 + 0.01));
    }
  }

  /* ---------- autocollants drapés sur les flancs (positions identiques des deux côtés, textes lisibles) */
  function decalFlancs(x0, x1, yb, yt, dessin, effacer = true, k = 230) {
    const cw = Math.min(2048, Math.round((x1 - x0) * k)), ch = Math.min(1024, Math.round((yt - yb) * k)), kx = cw / (x1 - x0), ky = ch / (yt - yb);
    const X = (x) => (x - x0) * kx, Y = (y) => (yt - y) * ky;
    const efface = (g) => { if (!effacer) return; g.save(); g.globalCompositeOperation = 'destination-out'; for (const a of arches) { if (effacer !== true && !effacer.includes(a)) continue; g.beginPath(); g.arc(X(a.x), Y(a.y), (a.R + 0.03) * kx, 0, Math.PI * 2); g.fill(); } g.restore(); };
    for (const sg of [1, -1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      o.dessinerCote((g) => { g.clearRect(0, 0, cw, ch); dessin(g, X, Y, kx); efface(g); }, cv.getContext('2d'), cw, ch, sg);
      const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }));
      const nu = 110, nv = 22, P = [];
      for (let i = 0; i <= nu; i++) { const x = x0 + (x1 - x0) * i / nu, row = []; for (let j = 0; j <= nv; j++) { const y = souleve(x, Math.max(bas(x) + 0.02, Math.min(ceint(x) - 0.014, yb + (yt - yb) * j / nv))), z = flancCorps(x, y); row.push([x, y, sg * ((Number.isFinite(z) ? z : demi(x)) + 0.007)]); } P.push(row); }
      const mesh = grille(P, [m], null, false, () => V(0, 0, sg));
      // UV : u le long du véhicule (inversé côté −z, cf. dessinerCote), v vers le haut
      const uv = mesh.geometry.attributes.uv; for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) uv.setXY(i * (nv + 1) + j, sg > 0 ? i / nu : 1 - i / nu, j / nv);
      uv.needsUpdate = true; mesh.renderOrder = 2;
    }
  }
  /** autocollant drapé sur un dessus (caisse ou pavillon) : canvas vu de dessus, nez à droite, +z en bas. */
  function decalDessus(surface, x0, x1, z0, z1, dessin, cw = 1024, ch = 512) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d'); g.clearRect(0, 0, cw, ch); dessin(g, cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }));
    const f = surface === 'serre' ? dessusSerre : dessusCorps;
    const mesh = patch(60, 24, (u, v) => { const x = x0 + (x1 - x0) * u, z = z1 + (z0 - z1) * v; return [x, f(x, z) + 0.009, z]; }, m, V(0, 1, 0));
    const uv = mesh.geometry.attributes.uv; for (let i = 0; i <= 60; i++) for (let j = 0; j <= 24; j++) uv.setXY(i * 25 + j, i / 60, j / 24);
    uv.needsUpdate = true; mesh.renderOrder = 2; return mesh;
  }
  /** matériau texturé (calandre…) */
  const matTex = (motif, fond, trait, r = 0.4, m = 0.6, cw, ch) => garde(new THREE.MeshStandardMaterial({ map: texCalandre(THREE, garde, motif, fond, trait, cw, ch), roughness: r, metalness: m, envMap: ctx.envMap, envMapIntensity: 1, side: THREE.DoubleSide }));
  /** polygone (x, y) extrudé en z, centré en zc (pièces rapportées : becquets, lames) */
  function dalle(pts, ep, mat, zc = 0, bev = 0.006) {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, zc - ep / 2); const m = new THREE.Mesh(garde(g), mat); grp.add(m); return m;
  }

  /* jupes : segment de disque peint, posé sur la surface d'ORIGINE du flanc (avant creusement), bord bas horizontal net,
     plus une tranche (épaisseur) en dessous ; le haut de la roue disparaît derrière, comme sur la DS. */
  for (const a of arches) {
    if (a.jupe === undefined) continue;
    const Rs = a.R + 0.03, t0 = Math.asin(Math.max(-0.99, Math.min(0.99, (a.jupe - a.y) / Rs))), seg = [];
    for (let i = 0; i <= 24; i++) { const t = t0 + (Math.PI - 2 * t0) * i / 24; seg.push([a.x + Rs * Math.cos(t), a.y + Rs * Math.sin(t)]); }
    const r = roues[arches.indexOf(a)], zPneu = r.z + r.ep / 2 + 0.01;                // jamais en deçà du flanc extérieur du pneu
    const zJ = (x, y) => Math.max(flancCorps(x, y) + 0.0015, zPneu);
    deuxFlancs((sg) => {
      poly(seg, (x, y) => [x, y, sg * zJ(x, y)], peint, V(0, 0, sg), { nu: 30, nv: 14 });
      const xa = a.x - Rs * Math.cos(t0), xb = a.x + Rs * Math.cos(t0);
      patch(30, 1, (u, v) => { const x = xa + (xb - xa) * u, z = zJ(x, a.jupe); return [x, a.jupe, sg * Math.max(zPneu, z - 0.035 * v)]; }, peint, V(0, -1, 0));
    });
  }

  /* lèvres de passages de roues : jonc fin (teinte caisse ou noir) qui borde l'arche et en lisse l'arête découpée */
  if (D.levres !== false) for (const a of arches) {
    if (a.jupe !== undefined) continue;
    const m = D.levres === 'noir' ? noir : peint, lig = [];
    for (let i = 0; i <= 40; i++) { const t = 0.02 + (Math.PI - 0.04) * i / 40; lig.push([a.x + Math.cos(t) * (a.R + 0.012), a.y + Math.sin(t) * (a.R + 0.012)]); }
    deuxFlancs((sg) => ruban(lig, 0.036, (x, y) => { const z = flancCorps(x, y); return [x, y, sg * ((Number.isFinite(z) ? z : demi(x)) + 0.004)]; }, m, V(0, 0, sg), 60));
  }

  const K = { THREE, garde, grp, o, peint, toitM, noir, sombre, vitre, joint, mat2, arches, roues, bas, ceint, dessus, demi, toit, zEpaule, yBordToit, zBordToit,
    anneau, faceX, flancCorps, dessusCorps, flancSerre, dessusSerre, souleve, patch, poly, ruban, sur, V, deuxFlancs, decalFlancs, decalDessus, matTex, dalle, grille, lumBlanche: ctx.lumBlanche, lumRouge: ctx.lumRouge };
  if (D.details) D.details(K);

  /* ---------- contrat du constructeur (unités de scène) */
  const W = Math.max(...xsC.map((x) => demi(x)));
  let yMax = 0; for (let x = S.x0; x >= S.x1; x -= 0.02) yMax = Math.max(yMax, toit(x));
  return {
    L: (xAv - xAr) * ECH, largeur: 2 * W * ECH, hauteur: (yMax + 0.01) * ECH, xAvant: xAv * ECH, xArriere: xAr * ECH,
    roues: roues.map((r) => ({ x: r.x * ECH, RW: r.R * ECH, ep: r.ep * ECH, z: r.z * ECH, avant: !!r.avant, jante: r.jante, rayons: r.rayons, flanc: r.flanc ?? null, etrier: r.etrier, ...(r.sansFrein ? { sansFrein: true } : {}), ...(r.chrome ? { chrome: true } : {}) })),
    jante: roues[0].jante, flanc: roues[0].flanc ?? null, plafond: D.plafond,
  };
}

/* ====================================================================================== FR01 — DS 7 Crossback « Élysée » */
/* Cotes : 4 570 × 1 895 × 1 625 mm, empattement 2 738, voies ≈ 1 600, pneus 235/45 R20 (Ø ≈ 720 mm).
   Livrée de la miniature : bleu encre vif, arabesques et tour stylisée blanches sur les flancs, lèvres d'ailes rouges,
   bas de caisse et boucliers noirs, jantes argent à rayons fins. Signature avant : grande calandre à pointes de diamant
   cerclée de chrome, « ailes » chromées vers des phares effilés, LED verticales dans les coins du bouclier. */
function fr01(ctx) {
  const jante = { jante: '#e4e7ec', rayons: 'dix', etrier: '#c8202a' };
  const D = {
    plafond: 0.858, xAv: 2.30, xAr: -2.27, capAv: 0.16, capAr: 0.2, levres: 'noir',
    bas: [[2.30, 0.40], [2.18, 0.31], [1.75, 0.27], [-1.75, 0.27], [-2.1, 0.33], [-2.27, 0.44]],
    ceint: [[2.30, 0.78], [2.24, 0.87], [2.08, 0.925], [1.75, 0.965], [1.0, 1.02], [0.6, 1.06], [-0.5, 1.1], [-1.6, 1.16], [-2.0, 1.12], [-2.27, 0.99]],
    dessus: [[2.30, 0.80], [2.24, 0.9], [2.08, 0.955], [1.75, 1.0], [1.0, 1.065], [0.8, 1.085], [-1.6, 1.18], [-2.05, 1.14], [-2.27, 1.01]],
    demi: [[2.30, 0.74], [2.2, 0.86], [2.0, 0.92], [1.75, 0.94], [1.369, 0.9475], [0.85, 0.93], [-0.3, 0.925], [-1.369, 0.9475], [-1.85, 0.93], [-2.12, 0.87], [-2.27, 0.78]],
    kBas: 0.94, kEp: 0.91, hMax: 0.48, q: 2.3,
    serre: {
      x0: 0.8, x1: -2.2, retrait: 0.06, bombe: 0.055, galbe: 0.03,
      toit: [[0.8, 1.075], [0.4, 1.33], [-0.12, 1.57], [-0.45, 1.612], [-0.9, 1.608], [-1.3, 1.575], [-1.62, 1.51], [-1.88, 1.4], [-2.06, 1.27], [-2.2, 1.13]],
      demiToit: [[0.8, 0.72], [-0.12, 0.62], [-1.3, 0.61], [-1.9, 0.57], [-2.22, 0.55]],
    },
    roues: [{ x: 1.369, R: 0.36, ep: 0.25, z: 0.78, avant: true, jeu: 0.065, ...jante }, { x: -1.369, R: 0.36, ep: 0.25, z: 0.78, jeu: 0.065, ...jante }],
    couleurs: { caisse: '#1f3fa6', vitre: '#0c1220', cadre: 'chrome', metal: 0.38 },
    matCorps: (x, y) => (y < 0.4 ? 'noir' : 'peint'),
    vitres: [
      [[0.7, 1.09], [-0.06, 1.51], [-0.42, 1.53], [-0.42, 1.13]],
      [[-0.51, 1.135], [-0.51, 1.53], [-1.06, 1.52], [-1.2, 1.17]],
      [[-1.29, 1.18], [-1.16, 1.5], [-1.42, 1.485], [-1.64, 1.39], [-1.72, 1.2]],
    ],
    parebrise: { x0: 0.77, x1: -0.08, montant: 0.07 },
    lunette: { x0: -1.84, x1: -2.16, montant: 0.09 },
    retro: { x: 0.5, dy: 0.1 },
    details(K) {
      const { o, sur, poly, ruban, V, noir, lumBlanche, lumRouge, arches } = K;
      const blanc = '#f4f6fb', rouge = o.lac('#d8232e', 0.3, 0.2);
      // calandre : bouclier à pointes de diamant, cadre chrome
      const cal = [[-0.44, 0.84], [0.44, 0.84], [0.5, 0.62], [0.42, 0.44], [-0.42, 0.44], [-0.5, 0.62]];
      poly(cal, sur.avant(0.004), o.chrome, V(1, 0, 0), { marge: 0.03 });
      poly(cal, sur.avant(0.009), K.matTex('losanges', '#14161c', '#c9ced8', 0.3, 0.8), V(1, 0, 0));
      // phares effilés hauts (verre fumé + trois joyaux LED) et « ailes » chromées depuis la calandre
      for (const sg of [-1, 1]) {
        const ph = [[sg * 0.52, 0.79], [sg * 0.84, 0.86], [sg * 0.86, 0.79], [sg * 0.55, 0.72]].map(([z, y]) => [z, y]);
        poly(ph.map(([z, y]) => [z, y]), sur.avant(0.006), o.mat('#1a1d24', 0.2, 0.9), V(1, 0, 0), { marge: 0.012 });
        for (let i = 0; i < 3; i++) { const z = sg * (0.6 + i * 0.075), y = 0.79 + i * 0.016, x = K.faceX(y, z, 1); const s = new K.THREE.Mesh(K.garde(new K.THREE.SphereGeometry(0.03, 14, 10)), lumBlanche); s.position.set(x + 0.01, y, z); K.grp.add(s); }
        ruban([[sg * 0.5, 0.75], [sg * 0.66, 0.705], [sg * 0.82, 0.74]], 0.02, sur.avant(0.01), o.chrome, V(1, 0, 0), 20);
        // LED verticales (voile lumineux) dans les coins du bouclier
        poly([[sg * 0.64, 0.64], [sg * 0.69, 0.64], [sg * 0.74, 0.47], [sg * 0.69, 0.47]], sur.avant(0.008), lumBlanche, V(1, 0, 0), { nu: 6, nv: 10 });
        // feux arrière effilés à écailles
        poly([[sg * 0.42, 1.06], [sg * 0.9, 1.05], [sg * 0.9, 0.97], [sg * 0.44, 0.995]], sur.arriere(0.006), lumRouge, V(-1, 0, 0), { nu: 16, nv: 6 });
      }
      // bouclier avant : prise basse et lame chrome
      poly([[-0.55, 0.40], [0.55, 0.40], [0.5, 0.31], [-0.5, 0.31]], sur.avant(0.006), K.matTex('nid', '#0d0e12', '#2c3038', 0.5, 0.4), V(1, 0, 0));
      ruban([[-0.62, 0.425], [0.62, 0.425]], 0.022, sur.avant(0.01), o.chrome, V(1, 0, 0), 20);
      // hayon : bandeau chrome entre les feux, plaque, sabot
      ruban([[-0.42, 1.025], [0.42, 1.025]], 0.022, sur.arriere(0.008), o.chrome, V(-1, 0, 0), 20);
      poly([[-0.22, 0.78], [0.22, 0.78], [0.22, 0.68], [-0.22, 0.68]], sur.arriere(0.006), o.mat('#e9ecf2', 0.5, 0.1), V(-1, 0, 0), { nu: 4, nv: 4 });
      ruban([[-0.5, 0.36], [0.5, 0.36]], 0.03, sur.arriere(0.01), o.chrome, V(-1, 0, 0), 20);
      // lèvres d'ailes rouges (livrée de la miniature) : bande posée sur l'aile au bord du passage
      for (const a of arches) K.deuxFlancs((sg) => {
        const lig = []; for (let i = 0; i <= 24; i++) { const t = 0.12 + (Math.PI - 0.24) * i / 24; lig.push([a.x + Math.cos(t) * (a.R + 0.035), a.y + Math.sin(t) * (a.R + 0.035)]); }
        ruban(lig, 0.07, (x, y) => [x, y, sg * (K.flancCorps(x, y) + 0.008)], rouge, V(0, 0, sg), 40);
      });
      // autocollants : arabesques, tour stylisée, inscription
      K.decalFlancs(-2.2, 2.25, 0.42, 1.07, (g, X, Y, k) => {
        g.strokeStyle = 'rgba(8,12,30,0.75)'; g.lineWidth = 2.5;                           // joints de portes et poignées
        for (const x of [0.66, -0.46, -1.24]) { g.beginPath(); g.moveTo(X(x), Y(1.06)); g.lineTo(X(x - 0.03), Y(0.42)); g.stroke(); }
        g.fillStyle = 'rgba(10,14,30,0.55)'; for (const x of [0.05, -0.85]) g.fillRect(X(x), Y(0.95), 0.18 * k, 0.03 * k);
        arabesque(g, [[X(-2.15), Y(0.78)], [X(-1.6), Y(0.95)], [X(-1.0), Y(0.62)], [X(-0.4), Y(0.74)], [X(0.2), Y(0.86)], [X(0.9), Y(0.58)], [X(1.5), Y(0.74)], [X(1.8), Y(0.84)], [X(2.0), Y(0.7)], [X(2.2), Y(0.66)]], blanc, 0.018 * k);
        arabesque(g, [[X(-2.1), Y(0.62)], [X(-1.4), Y(0.56)], [X(-0.9), Y(0.86)], [X(-0.2), Y(0.62)]], blanc, 0.012 * k);
        tour(g, X(-0.95), Y(0.5), 0.42 * k, blanc, 0.014 * k);
        boucle(g, X(-0.55), Y(0.66), 0.07 * k, blanc, 0.014 * k); boucle(g, X(-1.55), Y(0.7), 0.06 * k, blanc, 0.012 * k);
        g.fillStyle = blanc; g.font = 'italic bold ' + Math.round(0.085 * k) + 'px Georgia, serif'; g.textAlign = 'center'; g.fillText('Tour Eiffel', X(0.12), Y(0.6));
      });
      K.decalDessus('corps', 1.15, 2.2, -0.75, 0.75, (g, w, h) => { arabesque(g, [[0, h * 0.62], [w * 0.3, h * 0.05], [w * 0.55, h * 0.95], [w * 0.95, h * 0.4]], blanc, 22); boucle(g, w * 0.55, h * 0.5, h * 0.12, blanc, 16); });
      K.decalDessus('serre', -1.6, -0.3, -0.5, 0.5, (g, w, h) => { arabesque(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], blanc, 12); });
    },
  };
  return caisse(ctx, D);
}

/* ====================================================================================== FR02 — Mégane IV R.S. Trophy */
/* Cotes : 4 364 × 1 875 × 1 435 mm, empattement 2 669, voies ≈ 1 620 / 1 600, pneus 245/35 R19 (Ø ≈ 654 mm).
   Silhouette : compacte 5 portes basse, capot nervuré, ailes avant élargies, HANCHES ARRIÈRE très galbées (épaule pleine,
   pavillon étroit), hayon incliné sous becquet de toit. Avant : signature lumineuse en « C » qui descend dans le bouclier,
   phares effilés, grande prise basse et lame. Arrière : feux fins qui traversent le hayon, diffuseur noir à sortie CENTRALE.
   Livrée de la miniature : bleu vif, filet blanc ascendant, tour, basilique, moulin et inscription stylisés en blanc,
   jantes noires à liseré rouge. */
function fr02(ctx) {
  const jante = { jante: '#17191e', rayons: 'dix', flanc: '#d8232e', etrier: '#d8232e' };
  const D = {
    plafond: 0.765, xAv: 2.2745, xAr: -2.0895, capAv: 0.16, capAr: 0.2,
    bas: [[2.2745, 0.24], [2.18, 0.17], [1.7, 0.19], [-1.7, 0.21], [-1.98, 0.23], [-2.0895, 0.33]],
    ceint: [[2.2745, 0.58], [2.22, 0.67], [2.1, 0.73], [1.9, 0.78], [1.33, 0.84], [0.85, 0.915], [0.0, 1.0], [-1.0, 1.045], [-1.6, 1.06], [-1.92, 1.02], [-2.0895, 0.94]],
    dessus: [[2.2745, 0.59], [2.22, 0.69], [2.1, 0.75], [1.9, 0.8], [1.33, 0.865], [0.85, 0.93], [0.0, 1.015], [-1.6, 1.07], [-1.92, 1.04], [-2.0895, 0.955]],
    demi: [[2.2745, 0.64], [2.2, 0.79], [2.05, 0.88], [1.85, 0.92], [1.3345, 0.935], [0.95, 0.912], [0.3, 0.882], [-0.55, 0.885], [-1.0, 0.925], [-1.3345, 0.9375], [-1.7, 0.925], [-1.95, 0.87], [-2.0895, 0.78]],
    kBas: 0.89, kEp: [[2.2, 0.9], [1.3, 0.94], [0.3, 0.92], [-1.0, 0.98], [-1.4, 0.985], [-2.0, 0.95]], hMax: [[2.2, 0.55], [0.3, 0.6], [-1.0, 0.68], [-1.6, 0.68]], q: 2.2,
    nervures: [{ z: 0.36, h: 0.018, l: 0.07, x0: 0.7, x1: 2.15 }, { z: -0.36, h: 0.018, l: 0.07, x0: 0.7, x1: 2.15 }],
    serre: {
      x0: 0.86, x1: -2.0, galbe: 0.03, bombe: 0.05,
      retrait: [[0.6, 0.06], [-0.4, 0.07], [-1.1, 0.12], [-1.9, 0.12]],
      toit: [[0.86, 0.915], [0.45, 1.17], [-0.12, 1.4], [-0.3, 1.428], [-0.5, 1.435], [-0.95, 1.42], [-1.3, 1.38], [-1.6, 1.31], [-1.72, 1.27], [-1.9, 1.12], [-2.0, 1.01]],
      demiToit: [[0.86, 0.68], [-0.12, 0.6], [-1.1, 0.57], [-1.6, 0.53], [-2.0, 0.5]],
    },
    roues: [{ x: 1.3345, R: 0.327, ep: 0.245, z: 0.77, avant: true, jeu: 0.07, ...jante }, { x: -1.3345, R: 0.327, ep: 0.245, z: 0.775, jeu: 0.07, ...jante }],
    couleurs: { caisse: '#1d50c8', vitre: '#0c1220', metal: 0.4, interieur: '#d8232e' },
    matCorps: (x, y) => (y < 0.29 || (x < -1.8 && y < 0.40) || (x > 1.95 && y < 0.25) ? 'noir' : 'peint'),
    vitres: [
      [[0.78, 0.96], [-0.1, 1.37], [-0.47, 1.39], [-0.47, 1.04]],
      [[-0.56, 1.045], [-0.56, 1.39], [-1.1, 1.365], [-1.32, 1.2], [-1.34, 1.07]],
      [[-1.42, 1.08], [-1.42, 1.2], [-1.54, 1.225], [-1.66, 1.095]],
    ],
    parebrise: { x0: 0.84, x1: -0.12, montant: 0.07 },
    lunette: { x0: -1.73, x1: -1.98, montant: 0.08 },
    retro: { x: 0.6, dy: 0.09 },
    details(K) {
      const { o, sur, poly, ruban, V, noir, lumBlanche, lumRouge, THREE, garde, grp } = K;
      const blanc = '#f4f6fb', nid = K.matTex('nid', '#0b0c10', '#30343c', 0.5, 0.4), anthracite = o.mat('#3a3e46', 0.35, 0.7);
      // face avant : calandre fine, phares effilés, signature en « C » qui descend dans le bouclier
      poly([[-0.42, 0.715], [0.42, 0.715], [0.38, 0.64], [-0.38, 0.64]], sur.avant(0.006), nid, V(1, 0, 0));
      for (const sg of [-1, 1]) {
        poly([[sg * 0.44, 0.74], [sg * 0.8, 0.765], [sg * 0.84, 0.695], [sg * 0.48, 0.665]], sur.avant(0.006), o.mat('#20232b', 0.15, 0.9), V(1, 0, 0), { marge: 0.01 });
        ruban([[sg * 0.5, 0.725], [sg * 0.79, 0.745]], 0.018, sur.avant(0.011), lumBlanche, V(1, 0, 0), 16);
        ruban([[sg * 0.6, 0.665], [sg * 0.78, 0.66], [sg * 0.84, 0.6], [sg * 0.845, 0.5], [sg * 0.81, 0.4], [sg * 0.72, 0.355], [sg * 0.64, 0.355]], 0.032, sur.avant(0.011), lumBlanche, V(1, 0, 0), 40);
        poly([[sg * 0.62, 0.6], [sg * 0.76, 0.6], [sg * 0.77, 0.42], [sg * 0.66, 0.4]], sur.avant(0.006), nid, V(1, 0, 0));     // écopes de coin dans le « C »
      }
      poly([[-0.54, 0.56], [0.54, 0.56], [0.6, 0.3], [-0.6, 0.3]], sur.avant(0.006), nid, V(1, 0, 0));
      ruban([[-0.66, 0.29], [0.66, 0.29]], 0.05, sur.avant(0.014), anthracite, V(1, 0, 0), 24);                            // lame façon F1
      ruban([[-0.5, 0.46], [0.5, 0.46]], 0.03, sur.avant(0.013), K.peint, V(1, 0, 0), 24);
      // ouïe d'aile avant derrière la roue
      K.deuxFlancs((sg) => { poly([[0.86, 0.76], [0.97, 0.76], [0.94, 0.6], [0.84, 0.6]], sur.flanc(0.005, sg), K.matTex('lamelles', '#0b0c10', '#2a2e36', 0.4, 0.5, 256, 256), V(0, 0, sg), { marge: 0.008 }); });
      // poupe : feux fins qui traversent le hayon, plaque, diffuseur à sortie centrale
      for (const sg of [-1, 1]) poly([[sg * 0.36, 0.935], [sg * 0.92, 0.93], [sg * 0.92, 0.87], [sg * 0.4, 0.89]], sur.arriere(0.006), lumRouge, V(-1, 0, 0), { nu: 16, nv: 5 });
      ruban([[-0.37, 0.91], [0.37, 0.91]], 0.016, sur.arriere(0.008), lumRouge, V(-1, 0, 0), 20);
      poly([[-0.2, 0.76], [0.2, 0.76], [0.2, 0.66], [-0.2, 0.66]], sur.arriere(0.006), o.mat('#e9ecf2', 0.5, 0.1), V(-1, 0, 0), { nu: 4, nv: 4 });
      for (const z of [-0.5, -0.3, 0.3, 0.5]) o.boite(0.16, 0.12, 0.012, noir, K.faceX(0.27, z, -1) + 0.02, 0.27, z);   // ailettes de diffuseur
      {
        const sh = new THREE.Shape(); sh.moveTo(-0.15, 0.24); sh.lineTo(0.15, 0.24); sh.lineTo(0.17, 0.35); sh.lineTo(-0.17, 0.35); sh.closePath();
        const tr = new THREE.Path(); tr.moveTo(-0.125, 0.258); tr.lineTo(0.125, 0.258); tr.lineTo(0.143, 0.332); tr.lineTo(-0.143, 0.332); tr.closePath(); sh.holes.push(tr);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
        const m = new THREE.Mesh(garde(g), o.chrome); m.rotation.y = -Math.PI / 2; m.position.set(K.faceX(0.3, 0, -1) + 0.07, 0, 0); grp.add(m);
        o.boite(0.02, 0.07, 0.25, o.mat('#050506', 0.9, 0), K.faceX(0.3, 0, -1) + 0.03, 0.295, 0);
      }
      // becquet de toit au-dessus de la lunette
      const yS = K.toit(-1.5);
      K.dalle([[-1.46, yS - 0.004], [-1.82, yS - 0.085], [-1.84, yS - 0.11], [-1.56, yS - 0.06]], 2 * 0.53, K.peint, 0, 0.005);
      for (const sg of [-1, 1]) K.dalle([[-1.58, yS - 0.05], [-1.87, yS - 0.1], [-1.84, yS - 0.15], [-1.66, yS - 0.11]], 0.03, K.peint, sg * 0.53, 0.004);
      // autocollants de la miniature
      K.decalFlancs(-2.05, 2.2, 0.25, 1.0, (g, X, Y, k) => {
        g.strokeStyle = 'rgba(6,14,40,0.7)'; g.lineWidth = 2.5;
        for (const x of [0.8, -0.51, -1.36]) { g.beginPath(); g.moveTo(X(x), Y(1.0)); g.lineTo(X(x - 0.04), Y(0.3)); g.stroke(); }
        g.fillStyle = 'rgba(6,14,40,0.55)'; for (const x of [0.0, -1.0]) g.fillRect(X(x), Y(0.92), 0.17 * k, 0.028 * k);
        // filet blanc : part bas du bouclier avant, longe les portes et remonte vers le feu arrière
        g.strokeStyle = blanc; g.lineWidth = 0.028 * k; g.lineCap = 'round';
        g.beginPath(); g.moveTo(X(2.15), Y(0.42)); g.bezierCurveTo(X(1.2), Y(0.36), X(0.2), Y(0.42), X(-0.7), Y(0.66)); g.bezierCurveTo(X(-1.3), Y(0.82), X(-1.7), Y(0.95), X(-2.05), Y(0.97)); g.stroke();
        tour(g, X(-0.12), Y(0.47), 0.4 * k, blanc, 0.016 * k);
        basilique(g, X(-0.95), Y(0.86), 0.22 * k, blanc, 0.012 * k);
        boucle(g, X(0.32), Y(0.56), 0.075 * k, blanc, 0.014 * k);
        arabesque(g, [[X(-1.25), Y(0.72)], [X(-1.5), Y(0.92)], [X(-1.8), Y(0.62)], [X(-1.95), Y(0.8)]], blanc, 0.012 * k);
      });
      K.decalDessus('corps', 0.95, 2.15, -0.8, 0.8, (g, w, h) => {
        arabesque(g, [[0, h * 0.82], [w * 0.25, h * 0.95], [w * 0.5, h * 0.55], [w * 0.98, h * 0.88]], blanc, 18);
        g.save(); g.translate(w * 0.62, h * 0.3); g.rotate(Math.PI / 2); moulin(g, 0, 0, h * 0.42, blanc, 6); g.restore();
      });
      K.decalDessus('serre', -1.45, -0.2, -0.52, 0.52, (g, w, h) => {
        arabesque(g, [[0, h * 0.7], [w * 0.2, h * 0.05], [w * 0.45, h * 0.95], [w * 0.7, h * 0.3]], blanc, 14); boucle(g, w * 0.82, h * 0.35, h * 0.14, blanc, 10);
        g.save(); g.translate(w * 0.42, h * 0.5); g.rotate(Math.PI / 2); g.fillStyle = blanc; g.font = 'italic bold ' + Math.round(h * 0.3) + 'px Georgia, serif'; g.textAlign = 'center'; g.fillText('Paris', 0, h * 0.1); g.restore();
      }, 1024, 512);
    },
  };
  return caisse(ctx, D);
}

/* ====================================================================================== FR03 — Citroën DS 21 Pallas */
/* Cotes : 4 874 × 1 790 × 1 470 mm, empattement 3 125, voies 1 500 (av.) / 1 300 (ar.), pneus 180 / 155 R15.
   Silhouette « soucoupe » : nez très bas et pointu, long capot plongeant, phares doubles sous carénages vitrés au bout des ailes,
   pavillon en coque à montants fins, voie arrière étroite, roues arrière À MOITIÉ CACHÉES par les jupes, poupe effilée,
   clignotants en « trompettes » au bout du toit. Posture hydropneumatique : caisse basse et parfaitement à plat.
   Livrée de la miniature : blanc cassé, toit clair, vitres bleutées, arabesque noire, pont de pierre et inscription. */
function fr03(ctx) {
  const jante = { jante: '#eeece6', rayons: 'plein', flanc: null, sansFrein: true, etrier: '#555' };
  const D = {
    plafond: 0.821, xAv: 2.4925, xAr: -2.381, capAv: 0.1, capAr: 0.16,
    bas: [[2.4925, 0.37], [2.4, 0.3], [2.1, 0.27], [-1.9, 0.28], [-2.2, 0.37], [-2.381, 0.47]],
    ceint: [[2.4925, 0.45], [2.44, 0.55], [2.3, 0.645], [2.0, 0.72], [1.5625, 0.785], [0.85, 0.87], [0.0, 0.9], [-1.0, 0.925], [-1.6, 0.935], [-1.85, 0.9], [-2.2, 0.72], [-2.381, 0.58]],
    dessus: [[2.4925, 0.44], [2.44, 0.52], [2.3, 0.6], [2.0, 0.685], [1.5625, 0.765], [0.85, 0.875], [0.0, 0.915], [-1.6, 0.94], [-1.85, 0.925], [-2.2, 0.77], [-2.381, 0.6]],
    demi: [[2.4925, 0.34], [2.42, 0.56], [2.25, 0.74], [2.0, 0.83], [1.5625, 0.885], [0.9, 0.895], [-0.3, 0.89], [-1.2, 0.87], [-1.5625, 0.845], [-1.95, 0.78], [-2.2, 0.64], [-2.381, 0.44]],
    kBas: 0.9, kEp: 0.88, hMax: 0.5, q: 1.8,
    serre: {
      x0: 0.86, x1: -2.06, retrait: 0.07, bombe: 0.06, galbe: 0.045,
      toit: [[0.86, 0.865], [0.5, 1.12], [0.12, 1.39], [-0.15, 1.466], [-0.85, 1.45], [-1.22, 1.395], [-1.5, 1.3], [-1.75, 1.15], [-1.95, 1.0], [-2.06, 0.9]],
      demiToit: [[0.86, 0.76], [0.1, 0.66], [-1.3, 0.63], [-2.0, 0.52]],
    },
    roues: [
      { x: 1.5625, R: 0.33, ep: 0.22, z: 0.72, avant: true, ...jante },
      { x: -1.5625, R: 0.32, ep: 0.21, z: 0.62, jupe: 0.335, ...jante },
    ],
    couleurs: { caisse: '#f1efe9', toit: '#e6e3dc', vitre: '#3d5b8e', cadre: 'chrome', metal: 0.18, rug: 0.22, interieur: '#4f7be0' },
    matCorps: (x, y) => (y < 0.29 ? 'noir' : 'peint'),
    vitres: [
      [[0.77, 0.905], [0.1, 1.37], [-0.48, 1.415], [-0.48, 0.93]],
      [[-0.55, 0.932], [-0.55, 1.41], [-1.05, 1.375], [-1.3, 1.28], [-1.46, 0.95]],
    ],
    parebrise: { x0: 0.84, x1: -0.12, montant: 0.05 },
    lunette: { x0: -1.45, x1: -2.02, montant: 0.06 },
    retro: { x: 0.62, dy: 0.08 },
    details(K) {
      const { o, sur, poly, ruban, V, lumBlanche, lumRouge, THREE, garde, grp } = K;
      const noirL = '#16171b', capot = o.mat('#c8d6ec', 0.05, 0.6);
      capot.transparent = true; capot.opacity = 0.55;
      // phares doubles sous carénage vitré, au bout des ailes
      for (const sg of [-1, 1]) {
        const pod = [[sg * 0.42, 0.64], [sg * 0.74, 0.665], [sg * 0.77, 0.575], [sg * 0.44, 0.555]];
        poly(pod, sur.avant(0.004), o.chrome, V(1, 0, 0), { marge: 0.014 });
        poly(pod, sur.avant(0.006), o.mat('#2a3242', 0.1, 0.9), V(1, 0, 0));
        for (const [zz, rr] of [[0.52, 0.042], [0.67, 0.042]]) { const y = 0.61, x = K.faceX(y, sg * zz, 1); const s = new THREE.Mesh(garde(new THREE.SphereGeometry(rr, 16, 12)), lumBlanche); s.scale.set(0.5, 1, 1); s.position.set(x + 0.008, y, sg * zz); grp.add(s); }
        poly(pod, sur.avant(0.03), capot, V(1, 0, 0));
        // prises d'air sous le pare-chocs
        poly([[sg * 0.12, 0.355], [sg * 0.4, 0.355], [sg * 0.38, 0.315], [sg * 0.14, 0.315]], sur.avant(0.005), o.mat('#0b0c10', 0.8, 0.1), V(1, 0, 0), { nu: 8, nv: 4 });
        // butoirs chromés
        o.boite(0.05, 0.13, 0.05, o.chrome, K.faceX(0.41, sg * 0.3, 1) + 0.025, 0.41, sg * 0.3);
        // clignotants « trompettes » au bout du toit
        // cône chromé couché vers l'arrière, lentille rouge au bout
        const xt = -1.2, yt = K.yBordToit(xt) - 0.035, zt = sg * (K.zBordToit(xt) - 0.005);
        const tr = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.035, 0.016, 0.2, 16)), o.chrome); tr.rotation.z = Math.PI / 2 + 0.18; tr.position.set(xt - 0.1, yt - 0.01, zt); grp.add(tr);
        const lentille = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16)), lumRouge); lentille.rotation.z = Math.PI / 2 + 0.18; lentille.position.set(xt - 0.2, yt - 0.028, zt); grp.add(lentille);
        // petits feux arrière bas
        poly([[sg * 0.4, 0.62], [sg * 0.52, 0.62], [sg * 0.52, 0.56], [sg * 0.4, 0.56]], sur.arriere(0.006), lumRouge, V(-1, 0, 0), { nu: 4, nv: 4 });
      }
      // pare-chocs : lames chromées fines
      ruban([[-0.62, 0.4], [-0.3, 0.41], [0.3, 0.41], [0.62, 0.4]], 0.045, sur.avant(0.028), o.chrome, V(1, 0, 0), 30);
      ruban([[-0.6, 0.53], [0.6, 0.53]], 0.05, sur.arriere(0.025), o.chrome, V(-1, 0, 0), 30);
      poly([[-0.18, 0.68], [0.18, 0.68], [0.18, 0.6], [-0.18, 0.6]], sur.arriere(0.006), o.mat('#f2f2ee', 0.5, 0.1), V(-1, 0, 0), { nu: 4, nv: 4 });
      // enjoliveurs de bas de caisse chromés (Pallas) et baguette de ceinture
      K.deuxFlancs((sg) => {
        ruban([[1.1, 0.36], [-1.14, 0.36]], 0.07, sur.flanc(0.008, sg), o.chrome, V(0, 0, sg), 40);
      });
      // arabesque noire, pont de pierre, inscription
      K.decalFlancs(-2.3, 2.4, 0.3, 0.92, (g, X, Y, k) => {
        g.strokeStyle = 'rgba(20,20,24,0.55)'; g.lineWidth = 2.5;
        for (const x of [0.8, -0.52, -1.6]) { g.beginPath(); g.moveTo(X(x), Y(0.92)); g.lineTo(X(x - 0.02), Y(0.38)); g.stroke(); }
        arabesque(g, [[X(-2.25), Y(0.72)], [X(-1.7), Y(0.86)], [X(-1.2), Y(0.5)], [X(-0.6), Y(0.62)], [X(0.0), Y(0.74)], [X(0.4), Y(0.48)], [X(1.0), Y(0.6)], [X(1.5), Y(0.82)], [X(1.9), Y(0.58)], [X(2.3), Y(0.6)]], noirL, 0.016 * k);
        boucle(g, X(-0.15), Y(0.56), 0.07 * k, noirL, 0.013 * k);
        pont(g, X(-1.45), X(-0.7), Y(0.62), 0.09 * k, noirL, 0.01 * k);
        g.fillStyle = noirL; g.font = 'italic ' + Math.round(0.1 * k) + 'px Georgia, serif'; g.textAlign = 'center'; g.fillText('Pont Neuf', X(-1.07), Y(0.76));
      }, [K.arches[0]]);
      K.decalDessus('serre', -1.15, -0.1, -0.5, 0.5, (g, w, h) => { arabesque(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.45]], noirL, 12); boucle(g, w * 0.72, h * 0.4, h * 0.13, noirL, 9); });
    },
  };
  return caisse(ctx, D);
}

/* ====================================================================================== FR04 — Renault 5 Turbo (Groupe B) */
/* Cotes : 3 664 × 1 752 × 1 323 mm, empattement 2 430, voies 1 346 (av.) / 1 474 (ar.), pneus 190/55 R340 et 220/55 R365.
   Silhouette : petite trois-portes cubique, face plate à phares rectangulaires, ailes avant légèrement élargies et surtout
   des HANCHES ARRIÈRE ÉNORMES (voie arrière + 13 cm) dont le bord d'attaque porte les prises d'air latérales devant les roues
   arrière (moteur central : pas de banquette, deux places). Livrée de la miniature : rouge vif, arabesques blanches,
   moulin et inscription, boucliers noirs, jantes sombres à liseré bleu. */
function fr04(ctx) {
  const jAv = { jante: '#1b1d22', rayons: 'trois', flanc: '#2b5bd7', etrier: '#c8202a' };
  const D = {
    plafond: 0.755, xAv: 1.915, xAr: -1.749, capAv: 0.08, capAr: 0.1,
    bas: [[1.915, 0.25], [1.75, 0.19], [1.3, 0.2], [-1.3, 0.2], [-1.62, 0.23], [-1.749, 0.3]],
    ceint: [[1.915, 0.7], [1.86, 0.745], [1.2, 0.79], [0.75, 0.84], [-0.3, 0.87], [-0.7, 0.905], [-1.2, 0.93], [-1.62, 0.925], [-1.749, 0.88]],
    dessus: [[1.915, 0.71], [1.86, 0.755], [1.2, 0.805], [0.75, 0.855], [-1.0, 0.925], [-1.62, 0.935], [-1.749, 0.89]],
    demi: [[1.915, 0.7], [1.82, 0.765], [1.45, 0.8], [1.215, 0.805], [0.9, 0.785], [0.45, 0.755], [-0.22, 0.75], [-0.4, 0.78], [-0.64, 0.85], [-0.92, 0.876], [-1.215, 0.876], [-1.55, 0.868], [-1.749, 0.83]],
    kBas: 0.95, kEp: [[1.9, 0.95], [1.2, 0.96], [0.4, 0.95], [-0.5, 0.97], [-1.2, 0.985], [-1.75, 0.97]], hMax: [[1.9, 0.5], [0.0, 0.5], [-0.9, 0.62], [-1.75, 0.62]], q: 3.2,
    serre: {
      x0: 0.78, x1: -1.68, galbe: 0.02, bombe: 0.035,
      retrait: [[0.78, 0.05], [-0.3, 0.05], [-0.75, 0.14], [-1.7, 0.14]],
      toit: [[0.78, 0.84], [0.42, 1.1], [0.06, 1.3], [-0.2, 1.323], [-1.12, 1.315], [-1.24, 1.28], [-1.58, 0.99], [-1.68, 0.93]],
      demiToit: [[0.78, 0.64], [0.06, 0.6], [-1.1, 0.6], [-1.6, 0.58]],
    },
    roues: [
      { x: 1.215, R: 0.275, ep: 0.19, z: 0.635, avant: true, ...jAv },
      { x: -1.215, R: 0.304, ep: 0.22, z: 0.71, ...jAv },
    ],
    couleurs: { caisse: '#d6261d', vitre: '#0c1220', metal: 0.3, interieur: '#e4e6ea' },
    matCorps: (x, y) => (y < 0.3 || (x > 1.72 && y < 0.5) || (x < -1.6 && y < 0.52) ? 'noir' : 'peint'),
    vitres: [
      [[0.71, 0.875], [0.1, 1.265], [-0.46, 1.285], [-0.46, 0.89]],
      [[-0.55, 0.9], [-0.55, 1.28], [-1.08, 1.27], [-1.22, 1.1], [-1.2, 0.955]],
    ],
    parebrise: { x0: 0.76, x1: 0.08, montant: 0.06 },
    lunette: { x0: -1.27, x1: -1.62, montant: 0.07 },
    retro: { x: 0.58, dy: 0.08, noir: true },
    details(K) {
      const { o, sur, poly, ruban, V, noir, lumBlanche, lumRouge } = K;
      const blanc = '#f4f6fb', lam = K.matTex('lamelles', '#0b0c10', '#30343c', 0.45, 0.5, 256, 256), jaune = o.mat('#ffc21a', 0.3, 0.2), orange = o.mat('#ff8a1a', 0.3, 0.2);
      // face : phares rectangulaires cerclés, bandeau de calandre noir, antibrouillards dans le bouclier
      poly([[-0.4, 0.69], [0.4, 0.69], [0.4, 0.585], [-0.4, 0.585]], sur.avant(0.006), lam, V(1, 0, 0));
      for (const sg of [-1, 1]) {
        const ph = [[sg * 0.42, 0.695], [sg * 0.68, 0.695], [sg * 0.68, 0.58], [sg * 0.42, 0.58]];
        poly(ph, sur.avant(0.005), o.chrome, V(1, 0, 0), { marge: 0.014 });
        poly(ph, sur.avant(0.009), lumBlanche, V(1, 0, 0));
        poly([[sg * 0.22, 0.44], [sg * 0.4, 0.44], [sg * 0.4, 0.37], [sg * 0.22, 0.37]], sur.avant(0.008), jaune, V(1, 0, 0), { nu: 6, nv: 4 });
        poly([[sg * 0.55, 0.44], [sg * 0.66, 0.44], [sg * 0.66, 0.39], [sg * 0.55, 0.39]], sur.avant(0.008), orange, V(1, 0, 0), { nu: 4, nv: 3 });
        // feux arrière larges
        poly([[sg * 0.5, 0.86], [sg * 0.78, 0.86], [sg * 0.78, 0.66], [sg * 0.5, 0.66]], sur.arriere(0.006), lumRouge, V(-1, 0, 0), { nu: 8, nv: 8 });
        poly([[sg * 0.5, 0.66], [sg * 0.78, 0.66], [sg * 0.78, 0.62], [sg * 0.5, 0.62]], sur.arriere(0.006), orange, V(-1, 0, 0), { nu: 6, nv: 2 });
      }
      poly([[-0.48, 0.86], [0.48, 0.86], [0.48, 0.62], [-0.48, 0.62]], sur.arriere(0.006), noir, V(-1, 0, 0));
      poly([[-0.2, 0.47], [0.2, 0.47], [0.2, 0.37], [-0.2, 0.37]], sur.arriere(0.008), o.mat('#e9ecf2', 0.5, 0.1), V(-1, 0, 0), { nu: 4, nv: 4 });
      // prises d'air latérales au bord d'attaque des hanches, devant les roues arrière
      K.deuxFlancs((sg) => {
        const pa = [[-0.36, 0.8], [-0.6, 0.8], [-0.66, 0.46], [-0.42, 0.46]];
        poly(pa, sur.flanc(0.004, sg), noir, V(0, 0, sg), { marge: 0.02 });
        poly(pa, sur.flanc(0.008, sg), lam, V(0, 0, sg));
      });
      // petit becquet de pavillon
      const yS = K.toit(-1.1);
      K.dalle([[-1.06, yS + 0.003], [-1.32, yS - 0.05], [-1.34, yS - 0.085], [-1.12, yS - 0.035]], 2 * 0.56, K.peint, 0, 0.006);
      // autocollants de la miniature
      K.decalFlancs(-1.72, 1.88, 0.3, 0.93, (g, X, Y, k) => {
        g.strokeStyle = 'rgba(40,6,6,0.7)'; g.lineWidth = 2.5;
        for (const x of [0.72, -0.5]) { g.beginPath(); g.moveTo(X(x), Y(0.93)); g.lineTo(X(x - 0.03), Y(0.32)); g.stroke(); }
        g.fillStyle = 'rgba(40,6,6,0.55)'; g.fillRect(X(-0.48), Y(0.82), 0.16 * k, 0.028 * k);
        arabesque(g, [[X(1.75), Y(0.5)], [X(1.2), Y(0.86)], [X(0.8), Y(0.4)], [X(0.3), Y(0.55)], [X(-0.1), Y(0.7)], [X(-0.2), Y(0.42)], [X(-0.3), Y(0.52)]], blanc, 0.014 * k);
        moulin(g, X(0.05), Y(0.38), 0.4 * k, blanc, 0.01 * k);
        boucle(g, X(0.62), Y(0.62), 0.06 * k, blanc, 0.012 * k);
        g.fillStyle = blanc; g.font = 'italic bold ' + Math.round(0.09 * k) + 'px Georgia, serif'; g.textAlign = 'center'; g.fillText('Paris', X(0.3), Y(0.76));
      });
      K.decalDessus('corps', 0.7, 1.85, -0.65, 0.65, (g, w, h) => { arabesque(g, [[0, h * 0.3], [w * 0.3, h * 0.95], [w * 0.6, h * 0.05], [w * 0.98, h * 0.7]], blanc, 16); boucle(g, w * 0.4, h * 0.45, h * 0.14, blanc, 10); });
      K.decalDessus('serre', -1.0, -0.2, -0.5, 0.5, (g, w, h) => { arabesque(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], blanc, 12); boucle(g, w * 0.5, h * 0.5, h * 0.16, blanc, 9); });
    },
  };
  return caisse(ctx, D);
}

/* ====================================================================================== FR05 — DS 4 (« 1.2L PureTech ») */
/* Cotes : 4 400 × 1 830 × 1 470 mm, empattement 2 675, voies ≈ 1 580, pneus 205/55 R19 (Ø ≈ 708 mm).
   Silhouette : compacte haute à hayon fuyant, grandes roues, ceinture montante, capot long, calandre à pointes de diamant,
   phares très fins et « voile lumineux » vertical dans les coins du bouclier. Livrée de la miniature : rouge, bande et
   arabesques blanches, inscription, moulin stylisé, jantes argent.
   Détail narratif (panne moteur, sans gâcher la voiture) : capot SOULEVÉ d'un cran sur sa béquille (charnière au pied du
   pare-brise, baie moteur sombre visible dans l'entrebâillement) et triangle de signalisation posé contre le bouclier
   avant. Rien ne touche les roues. */
function fr05(ctx) {
  const jante = { jante: '#e3e5ea', rayons: 'dix', etrier: '#2a2c31' };
  const xCh = 0.66, xCf = 2.08, ang = 0.075;                // charnière du capot, bord avant du capot, ouverture (rad)
  const zCap = (x) => 0.9 * (0.86 - 0.12 * Math.max(0, (x - 1.7) / 0.4)) - 0.05;   // demi-largeur du capot (lignes de joint sur les ailes)
  const D = {
    plafond: 0.803, xAv: 2.2675, xAr: -2.1325, capAv: 0.16, capAr: 0.22,
    bas: [[2.2675, 0.3], [2.16, 0.23], [1.7, 0.24], [-1.7, 0.25], [-2.0, 0.29], [-2.1325, 0.4]],
    ceint: [[2.2675, 0.68], [2.2, 0.77], [2.05, 0.83], [1.75, 0.875], [1.3, 0.905], [0.6, 0.985], [-0.4, 1.025], [-1.3, 1.07], [-1.8, 1.065], [-2.05, 1.01], [-2.1325, 0.94]],
    dessus: [[2.2675, 0.69], [2.2, 0.79], [2.05, 0.85], [1.75, 0.9], [0.6, 1.005], [-1.8, 1.085], [-2.05, 1.04], [-2.1325, 0.96]],
    demi: [[2.2675, 0.66], [2.18, 0.8], [2.0, 0.88], [1.75, 0.908], [1.3375, 0.915], [0.8, 0.9], [-0.2, 0.893], [-1.0, 0.91], [-1.3375, 0.915], [-1.75, 0.89], [-2.0, 0.83], [-2.1325, 0.76]],
    kBas: 0.93, kEp: [[2.2, 0.9], [1.3, 0.92], [0.0, 0.92], [-1.3, 0.96], [-2.1, 0.93]], hMax: [[2.2, 0.5], [0.0, 0.54], [-1.3, 0.6]], q: 2.2,
    nervures: [{ z: 0.3, h: 0.012, l: 0.06, x0: 0.75, x1: 2.05 }, { z: -0.3, h: 0.012, l: 0.06, x0: 0.75, x1: 2.05 }],
    serre: {
      x0: 0.62, x1: -2.06, retrait: [[0.6, 0.06], [-0.6, 0.065], [-1.2, 0.08], [-2.0, 0.07]], bombe: 0.05, galbe: 0.03,
      toit: [[0.62, 0.995], [0.25, 1.22], [-0.15, 1.45], [-0.4, 1.468], [-0.9, 1.45], [-1.3, 1.39], [-1.6, 1.31], [-1.8, 1.24], [-1.98, 1.08], [-2.06, 1.0]],
      demiToit: [[0.62, 0.7], [-0.15, 0.64], [-1.0, 0.63], [-1.8, 0.6], [-2.05, 0.58]],
    },
    roues: [{ x: 1.3375, R: 0.354, ep: 0.235, z: 0.75, avant: true, ...jante }, { x: -1.3375, R: 0.354, ep: 0.235, z: 0.75, ...jante }],
    couleurs: { caisse: '#d42328', vitre: '#0c1220', cadre: 'chrome', metal: 0.35 },
    // baie moteur sombre sous le capot entrouvert ; bas de caisse noir
    matCorps: (x, y) => (y < 0.27 ? 'noir' : 'peint'),
    vitres: [
      [[0.55, 1.03], [-0.1, 1.4], [-0.45, 1.415], [-0.45, 1.04]],
      [[-0.54, 1.045], [-0.54, 1.415], [-1.08, 1.385], [-1.3, 1.2], [-1.32, 1.085]],
      [[-1.4, 1.095], [-1.4, 1.26], [-1.56, 1.22], [-1.66, 1.1]],
    ],
    parebrise: { x0: 0.6, x1: -0.12, montant: 0.07 },
    lunette: { x0: -1.82, x1: -2.03, montant: 0.08 },
    retro: { x: 0.42, dy: 0.09, noir: true },
    details(K) {
      const { o, sur, poly, ruban, V, noir, lumBlanche, lumRouge, THREE, garde, grp } = K;
      const blanc = '#f4f6fb';
      // calandre à pointes de diamant cerclée de chrome, phares fins, voile lumineux vertical
      const cal = [[-0.4, 0.72], [0.4, 0.72], [0.47, 0.57], [0.37, 0.41], [-0.37, 0.41], [-0.47, 0.57]];
      poly(cal, sur.avant(0.004), o.chrome, V(1, 0, 0), { marge: 0.025 });
      poly(cal, sur.avant(0.009), K.matTex('losanges', '#14161c', '#c9ced8', 0.3, 0.8), V(1, 0, 0));
      for (const sg of [-1, 1]) {
        poly([[sg * 0.5, 0.775], [sg * 0.84, 0.82], [sg * 0.86, 0.765], [sg * 0.52, 0.72]], sur.avant(0.006), o.mat('#1a1d24', 0.15, 0.9), V(1, 0, 0), { marge: 0.01 });
        ruban([[sg * 0.55, 0.75], [sg * 0.83, 0.79]], 0.016, sur.avant(0.011), lumBlanche, V(1, 0, 0), 16);
        poly([[sg * 0.6, 0.7], [sg * 0.64, 0.7], [sg * 0.69, 0.45], [sg * 0.65, 0.45]], sur.avant(0.008), lumBlanche, V(1, 0, 0), { nu: 4, nv: 10 });
        poly([[sg * 0.7, 0.7], [sg * 0.73, 0.7], [sg * 0.78, 0.48], [sg * 0.75, 0.48]], sur.avant(0.008), lumBlanche, V(1, 0, 0), { nu: 4, nv: 10 });
        poly([[sg * 0.4, 1.0], [sg * 0.9, 0.99], [sg * 0.9, 0.93], [sg * 0.43, 0.95]], sur.arriere(0.006), lumRouge, V(-1, 0, 0), { nu: 16, nv: 5 });
      }
      poly([[-0.5, 0.37], [0.5, 0.37], [0.45, 0.29], [-0.45, 0.29]], sur.avant(0.006), K.matTex('nid', '#0b0c10', '#30343c', 0.5, 0.4), V(1, 0, 0));
      ruban([[-0.44, 0.975], [0.44, 0.975]], 0.018, sur.arriere(0.008), o.chrome, V(-1, 0, 0), 20);
      poly([[-0.2, 0.8], [0.2, 0.8], [0.2, 0.7], [-0.2, 0.7]], sur.arriere(0.006), o.mat('#e9ecf2', 0.5, 0.1), V(-1, 0, 0), { nu: 4, nv: 4 });
      ruban([[-0.55, 0.38], [0.55, 0.38]], 0.03, sur.arriere(0.01), o.chrome, V(-1, 0, 0), 20);

      // ---- capot entrouvert sur sa béquille : peau peinte + doublure sombre + chant avant, pivotant autour de la charnière
      const yCh = K.dessusCorps(xCh, 0) + 0.004, pivot = new THREE.Group(); pivot.position.set(xCh, yCh, 0); grp.add(pivot);
      const hood = (eps, mat, sens) => K.patch(36, 22, (u, v) => { const x = xCh + (xCf - xCh) * u, z = (v * 2 - 1) * zCap(x); return [x, K.dessusCorps(x, z) + eps, z]; }, mat, V(0, sens, 0));
      // baie moteur sombre (patch net) visible dans l'entrebâillement
      K.patch(30, 16, (u, v) => { const x = xCh + 0.3 + (xCf - 0.02 - xCh - 0.3) * u, z = (v * 2 - 1) * (zCap(x) - 0.06); return [x, K.dessusCorps(x, z) + 0.004, z]; }, o.mat('#101114', 0.85, 0.1), V(0, 1, 0));
      const peau = hood(0.016, K.peint, 1), doublure = hood(0.0, K.peint, -1);
      const chant = K.patch(1, 22, (u, v) => { const z = (v * 2 - 1) * zCap(xCf); return [xCf, K.dessusCorps(xCf, z) + 0.016 * (1 - u), z]; }, K.peint, V(1, 0, 0));
      for (const m of [peau, doublure, chant]) { grp.remove(m); m.position.set(-xCh, -yCh, 0); pivot.add(m); }
      pivot.rotation.z = ang;
      // moteur sous le capot (cache gris, bouchon jaune) et béquille de capot
      const yB = K.dessusCorps(1.6, 0);
      o.boite(0.5, 0.05, 0.62, o.mat('#3b3f47', 0.45, 0.6), 1.55, yB + 0.02, 0);
      o.cyl(0.03, 0.03, 0.03, o.mat('#f2c21a', 0.4, 0.2), 1.45, yB + 0.055, 0.18);
      {
        const xb = 1.92, zb = 0.42, yb0 = K.dessusCorps(xb, zb) - 0.005, c = Math.cos(ang), s = Math.sin(ang);
        const hx = xb - xCh, hy = K.dessusCorps(xb, zb) - yCh;                            // point d'appui sous le capot, tourné
        const top = new THREE.Vector3(xCh + hx * c - hy * s, yCh + hx * s + hy * c, zb), bot = new THREE.Vector3(xb + 0.04, yb0, zb);
        const d = top.clone().sub(bot), tige = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.008, 0.008, d.length(), 8)), o.mat('#c9ccd2', 0.3, 0.9));
        tige.position.copy(bot).addScaledVector(d, 0.5); tige.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); grp.add(tige);
      }
      // ---- triangle de signalisation posé au sol, appuyé contre le bouclier avant (côté +z, bien visible en vue 3/4)
      {
        const tri = new THREE.Group(), cote = 0.44, h = cote * Math.sqrt(3) / 2, rougeR = o.lac('#e32418', 0.25, 0.1), orangeR = o.mat('#ff6a1a', 0.35, 0.1);
        const barre = (a, b, ep, m) => { const d = b.clone().sub(a), t = new THREE.Mesh(garde(new THREE.BoxGeometry(ep, d.length(), 0.012)), m); t.position.copy(a).addScaledVector(d, 0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); tri.add(t); };
        const P = (z, y) => new THREE.Vector3(z, y, 0);
        const A = P(-cote / 2, 0.03), B = P(cote / 2, 0.03), Cc = P(0, 0.03 + h);
        barre(A, B, 0.045, rougeR); barre(B, Cc, 0.045, rougeR); barre(Cc, A, 0.045, rougeR);
        const k = 0.72, cy = 0.03 + h / 3, I = (p) => P(p.x * k, cy + (p.y - cy) * k);
        barre(I(A), I(B), 0.02, orangeR); barre(I(B), I(Cc), 0.02, orangeR); barre(I(Cc), I(A), 0.02, orangeR);
        const pied = new THREE.Mesh(garde(new THREE.BoxGeometry(0.3, 0.012, 0.03)), o.mat('#2a2c31', 0.6, 0.3)); pied.position.set(0, 0.006, 0.1); pied.rotation.y = Math.PI / 2; tri.add(pied);
        // le triangle est construit dans le plan (z local = profondeur) ; on le tourne face à l'avant (+x) et on l'incline vers la voiture
        tri.rotation.set(0, Math.PI / 2, 0);
        const incl = new THREE.Group(); incl.add(tri); incl.rotation.z = 0.24;
        const zT = 0.3, yAppui = 0.03 + h * Math.cos(0.24);
        incl.position.set(K.faceX(Math.min(0.5, yAppui), zT, 1) + h * Math.sin(0.24) + 0.015, 0, zT); grp.add(incl);
      }
      // autocollants de la miniature
      K.decalFlancs(-2.08, 2.2, 0.3, 1.06, (g, X, Y, k) => {
        g.strokeStyle = 'rgba(50,6,8,0.7)'; g.lineWidth = 2.5;
        for (const x of [0.58, -0.49, -1.4]) { g.beginPath(); g.moveTo(X(x), Y(1.06)); g.lineTo(X(x - 0.04), Y(0.32)); g.stroke(); }
        g.fillStyle = 'rgba(50,6,8,0.5)'; for (const x of [0.05, -1.0]) g.fillRect(X(x), Y(0.97), 0.17 * k, 0.028 * k);
        g.fillStyle = blanc; g.beginPath(); g.moveTo(X(2.1), Y(0.5)); g.bezierCurveTo(X(0.8), Y(0.44), X(-0.6), Y(0.5), X(-2.05), Y(0.86)); g.lineTo(X(-2.05), Y(0.8)); g.bezierCurveTo(X(-0.6), Y(0.45), X(0.8), Y(0.4), X(2.1), Y(0.46)); g.closePath(); g.fill();
        arabesque(g, [[X(-1.9), Y(0.95)], [X(-1.4), Y(0.6)], [X(-0.9), Y(0.98)], [X(-0.4), Y(0.7)], [X(0.1), Y(0.62)], [X(0.4), Y(0.92)], [X(0.9), Y(0.75)]], blanc, 0.013 * k);
        boucle(g, X(-0.62), Y(0.8), 0.07 * k, blanc, 0.013 * k);
        moulin(g, X(-1.0), Y(0.58), 0.3 * k, blanc, 0.01 * k);
        g.fillStyle = blanc; g.font = 'bold ' + Math.round(0.09 * k) + 'px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('PARIS', X(0.05), Y(0.66));
      });
      K.decalDessus('serre', -1.4, -0.2, -0.5, 0.5, (g, w, h) => { arabesque(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], blanc, 12); });
    },
  };
  return caisse(ctx, D);
}

export const V5_FRANCE = { FR01: fr01, FR02: fr02, FR03: fr03, FR04: fr04, FR05: fr05 };
