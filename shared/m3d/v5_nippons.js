/* Chantier V5 — modèles refaits (escouade « nippons ») : J10, J12, TK01, TK02, TK03, TK04, TK05. Ce module prime sur groupe1..10.
 *
 * Méthode commune (refus « plates comme des crêpes », « caisse à savon », « montants fragiles ») :
 *  - cotes constructeur ramenées à l'échelle de la scène (largeur hors tout ≈ 2,7–2,9) : longueur, empattement, porte-à-faux,
 *    hauteur de ceinture et de pavillon suivent la vraie voiture ; `plafond` = hauteur / largeur hors tout réelle ;
 *  - caisse = loft de sections (aide_7) aux épaules carrées, passages de roues découpés SERRÉS (jeu 0,06) : le pneu remplit l'arche ;
 *  - pavillon = prisme à facettes planes (aide_6 › serre) posé en retrait sur les épaules : pare-brise, toit, lunette à arêtes
 *    franches, vitres plates en retrait → montants A, B, C couleur caisse, épais par construction (plus de tiges fragiles) ;
 *  - autocollants de flanc drapés « sûrs » : aucun triangle dans l'anneau d'un pneu (pénétration nulle au banc).
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo, aucune marque, aucun personnage : formes et motifs génériques.
 */
import { kit } from './aide_7.js';
import { serre } from './aide_6.js';

/* ================================================================== aides communes de l'escouade */

/** Essieu : x, rayon de roue RW, largeur de pneu ep, demi-voie z (centre du pneu), avant ? + options de jante. */
const essieu = (x, RW, ep, z, avant, extra = {}) => ({ x, R: RW, RW, ep, z, avant, ...extra });

/** Découpes de passages de roues serrées : rayon RW + jeu (le pneu remplit l'arche, aucune tôle dans la gomme). */
const archesSerrees = (roues, jeu = 0.06) => roues.map((r) => ({ x: r.x, R: r.RW + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.04 }));

/** Fonds de passages de roues sombres, juste au-dessus du pneu (rayon > RW : jamais dans la gomme), bornés côté extérieur à zMax. */
function puitsNoirs(k, roues, zMax, jeu = 0.06) {
  const m = k.o.mat('#060709', 0.92, 0.05);
  for (const r of roues) {
    const zi = r.z - r.ep * 0.55, ze = Math.min(r.z + r.ep * 0.3, zMax - 0.015);
    for (const sg of [-1, 1]) k.arcGarde(r.x, r.y ?? r.RW, r.RW + 0.03, r.RW + jeu + 0.05, sg * (zi + ze) / 2, ze - zi, m, -0.12, Math.PI + 0.12);
  }
}

/**
 * Autocollant drapé sur les deux flancs d'un loft, SANS pénétration : dans un passage de roue, les sommets au-dessus de l'axe
 * sont plaqués sur le bord de l'arche, et les triangles qui touchent la moitié basse du disque de roue sont supprimés
 * (l'ancienne nappe tirait des triangles à travers le pneu). dessin(g, cw, ch, cote, M) — M.X / M.Y / M.S / M.Sy / M.trouer(g).
 */
function drape(k, st, x0, x1, yb, yt, dessin, roues, { cw = 1024, ch = 256, eps = 0.022, jeu = 0.06, nu = 150, nv = 28, emissif = false } = {}) {
  const { THREE, garde } = k;
  for (const sg of [1, -1]) {
    const M = k.carte(x0, x1, yb, yt, cw, ch);
    M.trouer = (g) => {
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (const r of roues) { const rr = r.RW + jeu + 0.012; g.beginPath(); g.ellipse(M.X(r.x), M.Y(r.y ?? r.RW), rr * M.sx, rr * M.sy, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
    };
    const mat = emissif ? matLumineux(k, (g) => dessin(g, cw, ch, sg, M), cw, ch) : k.matDecal((g) => dessin(g, cw, ch, sg, M), cw, ch);
    const pos = [], uv = [], idx = [], hors = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      let x = x0 + (x1 - x0) * i / nu, y = yb + (yt - yb) * j / nv, out = false;
      for (const r of roues) {
        const yc = r.y ?? r.RW, Ra = r.RW + jeu + 0.02, dx = x - r.x, dy = y - yc, d = Math.hypot(dx, dy);
        if (d < Ra) { if (dy > 0) { const f = Ra / Math.max(1e-4, d); x = r.x + dx * f; y = yc + dy * f; } else out = true; }
      }
      pos.push(x, y, sg * (k.flancAu(st, x, y) + eps)); uv.push(i / nu, j / nv); hors.push(out);
    }
    // un triangle dont un milieu d'arête ou le centre tombe dans le disque du pneu (corde tirée entre deux sommets plaqués loin
    // l'un de l'autre sur l'arche) est supprimé, comme ceux qui touchent la moitié basse du disque
    const dansPneu = (...ids) => {
      const px = ids.reduce((t, q) => t + pos[q * 3], 0) / ids.length, py = ids.reduce((t, q) => t + pos[q * 3 + 1], 0) / ids.length;
      return roues.some((r) => Math.hypot(px - r.x, py - (r.y ?? r.RW)) < r.RW + 0.015);
    };
    const tri = (p, q, r) => { if (hors[p] || hors[q] || hors[r] || dansPneu(p, q) || dansPneu(q, r) || dansPneu(r, p) || dansPneu(p, q, r)) return; idx.push(p, q, r); };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j;
      tri(a, b, a + 1); tri(a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(garde(g), mat); m.renderOrder = 2; k.o.ajouter(m);
  }
}

/** Matériau d'autocollant LUMINEUX (néons, écrans) : canvas transparent non éclairé, couleurs saturées (toneMapped false). */
function matLumineux(k, dessin, cw, ch) {
  const { THREE, garde } = k;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
  const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
}

/** Laque vernie à reflet MAÎTRISÉ : peu métallique et carte d'environnement atténuée — plus d'aplat turquoise du studio néon
 *  sur les capots sombres (le vernis commun, métal 0,4–0,55 × environnement 0,7, renvoyait le panneau cyan du studio). */
const laque = (ctx, hex, r = 0.3, m = 0.12, env = 0.28) => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: r, metalness: m, clearcoat: 1, clearcoatRoughness: 0.12, envMap: ctx.envMap, envMapIntensity: env }));

/** Verre fumé brillant (opaque : les montants peints restent nets, le vitrage reflète l'environnement). */
const vitrage = (ctx, hex = '#0c111a') => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04,
  envMap: ctx.envMap, envMapIntensity: 0.32, side: ctx.THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));

/** Matériau lumineux plat teinté (non éclairé). */
const lumiere = (ctx, hex, k = 1.6) => ctx.garde(new ctx.THREE.MeshBasicMaterial({ color: new ctx.THREE.Color(hex).multiplyScalar(k), toneMapped: false }));

/** Disque (phare / feu rond) face ±x : cerclage chromé + lentille lumineuse bombée. */
function phareRond(k, x, y, z, r, lum, sens = 1, cercle = null) {
  const { o } = k;
  o.cyl(r * 1.16, r * 1.16, 0.06, cercle || o.chrome, x, y, z, 0, Math.PI / 2, 28);
  const l = k.ellipsoide(0.035, r, r, lum, x + sens * 0.03, y, z, 20); return l;
}

/** Rétroviseurs d'ailes (pied + coque) posés sur le capot, des deux côtés. */
function retrosAile(k, x, y, z, mat) {
  const { o } = k;
  for (const s of [-1, 1]) { o.cyl(0.022, 0.03, 0.18, o.chrome, x, y + 0.09, s * z); k.ellipsoide(0.07, 0.065, 0.1, mat, x + 0.01, y + 0.22, s * z, 14); o.boite(0.012, 0.08, 0.13, o.chrome, x - 0.06, y + 0.22, s * z); }
}

/** Rétroviseurs de portière (bras + coque), des deux côtés, à la demi-largeur z. */
function retrosPorte(k, x, y, z, mat) {
  const { o } = k;
  for (const s of [-1, 1]) { o.boite(0.12, 0.04, 0.14, mat, x, y - 0.05, s * (z - 0.08)); k.ellipsoide(0.1, 0.075, 0.11, mat, x - 0.02, y, s * z, 14); }
}


/**
 * Stations de caisse échantillonnées depuis des fonctions de x (demi-largeur w, bas y0, dessus y1) : élargisseurs, capot en coin,
 * malle relevée se décrivent directement. Les angles en plan et en élévation sont arrondis sur `rc` aux deux bouts
 * (les stations extrêmes forment les faces avant / arrière, planes).
 */
function caisseFn(x0, x1, { w, y0, y1, nt = 6.5, nb = 4.5, wt = 0.97 }, n = 64, rc = 0.12) {
  const st = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (1 - Math.cos(Math.PI * i / n)) / 2, d = Math.min(x - x0, x1 - x);
    const a = d < rc ? rc - Math.sqrt(Math.max(0, rc * rc - (rc - d) * (rc - d))) : 0;
    st.push({ x, w: w(x) - a, y0: y0(x) + a * 0.9, y1: y1(x) - a * 0.6, nt, nb, wt });
  }
  return st;
}
/** Plateau lissé : 1 sur |x − a| ≤ demi, raccord en S jusqu'à 0 sur `raide` (élargisseurs carrés). */
const plateau = (x, a, demi, raide) => { const d = Math.abs(x - a) - demi; if (d <= 0) return 1; if (d >= raide) return 0; const t = d / raide; return 1 - t * t * (3 - 2 * t); };
/** Courbe lisse et monotone par morceaux (Hermite de Fritsch-Carlson, sans dépassement) dans une table [[x, v], …] triée en x. */
const table = (T) => {
  const n = T.length, dl = [], m = [];
  for (let i = 0; i < n - 1; i++) dl.push((T[i + 1][1] - T[i][1]) / (T[i + 1][0] - T[i][0]));
  for (let i = 0; i < n; i++) m.push(i === 0 ? dl[0] : i === n - 1 ? dl[n - 2] : (dl[i - 1] * dl[i] <= 0 ? 0 : (dl[i - 1] + dl[i]) / 2));
  for (let i = 0; i < n - 1; i++) { if (dl[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / dl[i], b = m[i + 1] / dl[i], h = Math.hypot(a, b); if (h > 3) { m[i] = 3 * a / h * dl[i]; m[i + 1] = 3 * b / h * dl[i]; } }
  return (x) => {
    if (x <= T[0][0]) return T[0][1]; if (x >= T[n - 1][0]) return T[n - 1][1];
    let i = 0; while (x > T[i + 1][0]) i++;
    const h = T[i + 1][0] - T[i][0], t = (x - T[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * T[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * T[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
};

/** Maille fermée d'une nappe (u, v) : orientation corrigée par le volume signé (faces toujours vers l'extérieur). */
function mailleFermee(k, pos, idx, mat) {
  const { THREE, garde } = k;
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
    vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return k.o.ajouter(new THREE.Mesh(garde(g), mat));
}

/**
 * Élargisseur d'aile EN VOLUME (overfender) : une section bombée balayée en arc autour du pneu, des deux côtés.
 * Section (rayon, z) : lèvre extérieure au rayon intérieur Ri (z1, au-delà du flanc du pneu), dos bombé qui redescend vers
 * la caisse au rayon Ri + larg (z0, noyé dans la tôle). Ri ≥ RW + 0,06 : aucune matière dans l'anneau du pneu.
 * Option rivets : n rivets répartis le long de l'arc, posés sur le dos bombé. Renvoie la position (x, y, z) des rivets du côté +z.
 */
function elargisseur(k, r, { Ri, larg, z0, z1, mat, a0 = -0.1, a1 = Math.PI + 0.1, rivets = 0, matRivet = null, bombe = 0.65, na = 40, ns = 12 }) {
  const yc = r.y ?? r.RW, sec = [[Ri, z0 + 0.02]];
  for (let i = 0; i <= ns; i++) { const t = i / ns; sec.push([Ri + larg * t, z0 + (z1 - z0) * Math.pow(Math.cos(t * Math.PI / 2), bombe)]); }
  const S = sec.length;
  for (const sg of [-1, 1]) {
    const pos = [], idx = [];
    for (let j = 0; j <= na; j++) { const a = a0 + (a1 - a0) * j / na, c = Math.cos(a), s = Math.sin(a); for (const [rr, zz] of sec) pos.push(r.x + c * rr, yc + s * rr, sg * zz); }
    for (let j = 0; j < na; j++) for (let i = 0; i < S; i++) { const a = j * S + i, b = j * S + (i + 1) % S, c = (j + 1) * S + i, d = (j + 1) * S + (i + 1) % S; idx.push(a, c, b, b, c, d); }
    for (const j of [0, na]) { const base = j * S; for (let i = 1; i < S - 1; i++) idx.push(base, base + i, base + i + 1); }   // bouchons d'extrémité
    mailleFermee(k, pos, idx, mat);
    for (let n = 0; n < rivets; n++) {
      const a = a0 + 0.12 + (a1 - a0 - 0.24) * n / Math.max(1, rivets - 1), t = 0.42, rr = Ri + larg * t, zz = z0 + (z1 - z0) * Math.pow(Math.cos(t * Math.PI / 2), bombe);
      k.ellipsoide(0.032, 0.032, 0.022, matRivet || k.o.chrome, r.x + Math.cos(a) * rr, yc + Math.sin(a) * rr, sg * (zz + 0.012), 10);
    }
  }
}

/**
 * Élargisseur en CAISSON (aile gonflée carrée, années 80) : plaque couleur caisse découpée en C autour du pneu, extrudée
 * de la caisse (z0) jusqu'au ras du pneu (z1), arêtes arrondies. Le contour : flancs inclinés, dessus plat, arche intérieure Ri.
 */
function caisson(k, r, { Ri, haut, avant, arriere, yBas, z0, z1, mat, biseau = 0.04 }) {
  const yc = r.y ?? r.RW, R = Ri + biseau;
  const pts = [[r.x - arriere, yBas], [r.x - arriere + 0.12, yc + haut], [r.x + avant - 0.16, yc + haut], [r.x + avant, yBas]];
  const aBas = Math.asin(Math.max(-0.99, Math.min(0.99, (yBas - yc) / R)));
  for (let i = 0; i <= 20; i++) { const a = aBas + (Math.PI - 2 * aBas) * i / 20; pts.push([r.x + Math.cos(a) * R, yc + Math.sin(a) * R]); }
  for (const sg of [-1, 1]) k.lame(pts, z1 - z0 - 2 * biseau, mat, sg * (z0 + z1) / 2, biseau);
}

/** Tube (moulure, arête en relief) le long d'un chemin [x, y] plaqué sur le flanc d'un loft, des deux côtés. */
function moulure(k, st, chemin, r, mat, eps = 0.0) {
  for (const sg of [-1, 1]) for (let i = 0; i < chemin.length - 1; i++) {
    const [xa, ya] = chemin[i], [xb, yb] = chemin[i + 1];
    k.tige([xa, ya, sg * (k.flancAu(st, xa, ya) + eps)], [xb, yb, sg * (k.flancAu(st, xb, yb) + eps)], r, mat, 8);
  }
}
/** Échantillonne une courbe de Bézier cubique (plan x, y) en n + 1 points. */
const bezier = (p0, p1, p2, p3, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map((c) => u * u * u * p0[c] + 3 * u * u * t * p1[c] + 3 * u * t * t * p2[c] + t * t * t * p3[c]); });

/* ================================================================== J10 — Nissan Skyline 2000 GT-R « Hakosuka » (KPGC10)
 * Cotes réelles 4 330 × 1 665 × 1 370 mm, empattement 2 570 → échelle 1,68 / m : L 7,28, empattement 4,32, pavillon ≈ 2,44.
 * Coupé 2 portes HARDTOP trois volumes : capot long et plat, face avant verticale à calandre pleine largeur et QUATRE phares
 * ronds alignés, toit court qui file en lunette très inclinée (montant C fuyant de coupé, custode triangulée), malle courte,
 * poupe verticale à quatre feux ronds. Élargisseurs d'ailes RIVETÉS EN VOLUME à l'avant ET à l'arrière, « surf line » en relief
 * qui plonge de l'aile arrière vers la portière. Grandes roues de course (rayon 0,65) qui remplissent les passages.
 * Livrée du jouet (hommage « Hako Type D ») : blanc nacré, bas de caisse et bandes noires, 99 cuivre. Jantes « rallye » sombres. */
function hakosuka(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const blanc = laque(ctx, '#f1efe6', 0.26, 0.1, 0.45), noir = o.mat('#16171b', 0.5, 0.3), noirMat = o.mat('#111215', 0.85, 0.08), grille = o.mat('#26282e', 0.45, 0.6);
  const verre = vitrage(ctx);
  const rd = { jante: '#3a3d45', rayons: 'rallye', flanc: null };
  const xAv = 3.64, xAr = -3.64, eAv = 2.21, eAr = -2.11;
  // pneus : flanc extérieur au ras de la lèvre des élargisseurs (1,40 AV, 1,43 AR)
  const roues = [essieu(eAv, 0.65, 0.6, 1.1, true, rd), essieu(eAr, 0.65, 0.68, 1.09, false, rd)];
  // caisse : épaules carrées (nt 7), flancs droits, faces avant et arrière verticales ; ceinture juste au-dessus des arches
  const B = caisseFn(xAr, xAv, {
    w: () => 1.33,
    y0: table([[xAr, 0.46], [xAr + 0.25, 0.32], [xAv - 0.25, 0.32], [xAv, 0.46]]),
    y1: table([[xAr, 1.38], [xAr + 0.12, 1.45], [eAr, 1.48], [0, 1.48], [1.6, 1.47], [eAv, 1.46], [3.45, 1.43], [xAv, 1.37]]),
    nt: 7, nb: 4.5, wt: 0.97 }, 72, 0.1);
  k.loft(B, blanc, { arches: archesSerrees(roues), nx: 180, ns: 64 });
  puitsNoirs(k, roues, 1.32);
  // élargisseurs rivetés en volume (lèvre au ras du pneu, dos bombé qui rejoint la tôle)
  const satin = laque(ctx, '#17181c', 0.38, 0.1, 0.35);
  elargisseur(k, roues[0], { Ri: 0.72, larg: 0.15, z0: 1.18, z1: 1.42, mat: satin, rivets: 8, matRivet: o.chrome });
  elargisseur(k, roues[1], { Ri: 0.72, larg: 0.16, z0: 1.18, z1: 1.46, mat: satin, rivets: 9, matRivet: o.chrome });
  // pavillon de coupé hardtop : pare-brise incliné, toit court, longue lunette fuyante, custode triangulée (montant C fuyant)
  const S = serre(ctx, o, {
    pts: [[1.62, 1.44], [0.6, 2.34], [0.33, 2.4], [-0.62, 2.4], [-0.95, 2.34], [-2.75, 1.47]], yb: 1.44, wb: 1.15, wt: 0.99, plonge: 0.14, seuil: 0.25,
    mat: blanc, verre, pb: [0, 0], mcPb: 0.15, mlPb: 0.07, lu: [4, 4], mcLu: 0.22, mlLu: 0.08 });
  for (const v of [[[1.3, 1.56], [0.6, 2.27], [-0.62, 2.31], [-0.62, 1.56]], [[-0.78, 1.56], [-0.78, 2.3], [-1.2, 2.28], [-2.12, 1.56]]]) {
    S.laterale(v.map(([x, y]) => [x + Math.sign(x + 0.7) * 0.025, y + (y > 2 ? 0.02 : -0.02)]), o.chrome, 0.004);   // cadre chromé
    S.laterale(v, verre, 0.009);
  }
  for (const xj of [1.62, -2.75]) o.boite(0.06, 0.03, 2.14, o.chrome, xj, 1.46, 0);                         // joncs pied de pare-brise / lunette
  // surf line en relief : arête qui file au-dessus de l'aile arrière puis plonge vers l'avant de la portière ; arête d'épaule
  moulure(k, B, [[-3.56, 1.36], [-1.4, 1.36], ...bezier([-1.4, 1.36], [-0.6, 1.36], [-0.1, 1.04], [0.95, 1.0], 14).slice(1)], 0.024, blanc, -0.004);
  // face avant verticale : calandre pleine largeur, 4 phares ronds alignés cerclés de chrome, pare-chocs chromé fin, becquet noir
  { const xf = xAv;
    o.boite(0.05, 0.42, 2.3, noir, xf + 0.01, 1.0, 0);
    for (let i = 0; i < 6; i++) o.boite(0.03, 0.022, 1.12, grille, xf + 0.04, 0.86 + i * 0.056, 0);
    o.boite(0.035, 0.36, 0.03, o.chrome, xf + 0.045, 1.0, 0);
    o.boite(0.04, 0.03, 2.32, o.chrome, xf + 0.035, 1.22, 0); o.boite(0.04, 0.03, 2.32, o.chrome, xf + 0.035, 0.79, 0);
    for (const z of [-0.98, -0.66, 0.66, 0.98]) phareRond(k, xf + 0.04, 1.0, z, 0.135, lumBlanche, 1);
    o.boite(0.1, 0.08, 2.42, o.chrome, xf + 0.07, 0.62, 0); for (const s of [-1, 1]) o.boite(0.2, 0.08, 0.06, o.chrome, xf - 0.02, 0.62, s * 1.19);
    for (const s of [-1, 1]) o.boite(0.05, 0.07, 0.22, lumiere(ctx, '#ff9a2a'), xf + 0.03, 0.52, s * 0.92);
    o.boite(0.03, 0.15, 0.46, o.mat('#eceef2', 0.5, 0.1), xf + 0.135, 0.62, 0);
    o.boite(0.2, 0.06, 2.24, noirMat, xf - 0.02, 0.43, 0);                                                     // becquet avant (sous la face, attaché)
  }
  // poupe verticale : 4 feux ronds, pare-chocs chromé, plaque, double sortie d'échappement
  { const xr = xAr;
    o.boite(0.04, 0.3, 2.1, noir, xr - 0.01, 1.1, 0);
    for (const z of [-0.88, -0.56, 0.56, 0.88]) phareRond(k, xr - 0.03, 1.1, z, 0.12, lumRouge, -1);
    o.boite(0.1, 0.08, 2.44, o.chrome, xr - 0.05, 0.64, 0); o.boite(0.03, 0.15, 0.5, o.mat('#eceef2', 0.5, 0.1), xr - 0.02, 0.86, 0);
    for (const z of [0.45, 0.62]) o.cyl(0.055, 0.055, 0.2, o.chrome, xr - 0.03, 0.42, z, 0, Math.PI / 2, 16);
  }
  retrosAile(k, 2.85, 1.44, 1.0, noir);
  // flancs : bas de caisse noir, bandes noires et 99 cuivre sur la portière, joint de porte, poignée
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.3, 1.47, (g, w, h, c, M) => {
    g.fillStyle = '#121316'; g.fillRect(0, M.Y(0.56), w, h);
    g.fillStyle = 'rgba(80,82,90,0.45)'; g.fillRect(0, M.Y(1.42), w, 3);                                       // arête d'épaule
    g.fillStyle = '#121316'; g.fillRect(M.X(-0.5), M.Y(0.84), M.S(1.85), M.Sy(0.1)); g.fillRect(M.X(-0.5), M.Y(0.7), M.S(1.4), M.Sy(0.05));
    k.ecrire(g, '99', M.X(0.62), M.Y(1.2), c, 'italic 900 84px Arial Black, Arial', '#121316');
    k.ecrire(g, '99', M.X(0.605), M.Y(1.212), c, 'italic 900 80px Arial Black, Arial', '#9a5a34');
    k.ecrire(g, 'RACING', M.X(-0.2), M.Y(1.18), c, 'bold 24px sans-serif', '#121316');
    g.strokeStyle = '#8f9097'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(1.5), M.Y(1.44)); g.lineTo(M.X(1.45), M.Y(0.6)); g.moveTo(M.X(-0.68), M.Y(1.44)); g.lineTo(M.X(-0.66), M.Y(0.6)); g.stroke();
    g.fillStyle = '#b9bcc4'; g.fillRect(M.X(-0.6), M.Y(1.33), M.S(0.24), 7);
    M.trouer(g);
  }, roues, { ch: 192 });
  return { L: 7.28, largeur: 2.7, hauteur: 2.44, xAvant: 3.72, xArriere: -3.7, roues, jante: rd.jante, flanc: null, plafond: +(1370 / 1665).toFixed(3) };
}

/* ================================================================== J12 — Nissan Laurel C33 hardtop, style VIP / kaido
 * Cotes réelles 4 690 × 1 695 × 1 360 mm, empattement 2 670 → échelle 1,65 / m : L 7,75, empattement 4,41, pavillon ≈ 2,3.
 * Vraie berline 4 portes trois volumes : FACE AVANT CARRÉE (phares rectangulaires minces et calandre plate sur une face verticale),
 * capot long et plat, pare-brise incliné, toit plat, lunette inclinée, malle longue, poupe verticale à bandeau de feux.
 * Vitrage haut (≈ 42 % de la hauteur). Kit VIP : ailes élargies aux quatre roues, jupes latérales, bouclier avant bas à lame
 * et coins maillés, diffuseur arrière ; caisse abaissée, grandes jantes « deep dish » blanches à fleur des ailes. Bleu nuit. */
function laurelVIP(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = laque(ctx, '#1b2133', 0.22, 0.12, 0.06), noir = o.mat('#0c0d11', 0.6, 0.3), maille = o.mat('#16171b', 0.8, 0.4), chromeSat = o.mat('#aab0bc', 0.22, 0.85);
  const verre = vitrage(ctx, '#0b1018');
  const rd = { jante: '#f4f4f4', rayons: 'deepdish', levre: 0.22, flanc: null };
  const xAv = 3.875, xAr = -3.875, eAv = 2.3, eAr = -2.11;
  // pneus à fleur (« tsura-ichi ») : flanc extérieur au ras des ailes élargies (1,43)
  const roues = [essieu(eAv, 0.62, 0.64, 1.11, true, rd), essieu(eAr, 0.63, 0.7, 1.08, false, rd)];
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.33 + 0.1 * Math.max(plateau(x, eAv, 0.66, 0.34), plateau(x, eAr, 0.68, 0.34)),
    y0: table([[xAr, 0.3], [xAr + 0.2, 0.22], [xAv - 0.2, 0.22], [xAv, 0.3]]),
    y1: table([[xAr, 1.33], [xAr + 0.12, 1.37], [eAr, 1.39], [0, 1.38], [1.9, 1.37], [eAv, 1.36], [xAv - 0.12, 1.33], [xAv, 1.29]]),
    nt: 7, nb: 4.5, wt: 0.97 }, 76, 0.06);
  k.loft(B, peint, { arches: archesSerrees(roues, 0.05), nx: 180, ns: 64 });
  puitsNoirs(k, roues, 1.42, 0.05);
  // pavillon de berline haut : pare-brise couché, toit plat long, lunette inclinée, montants A et C épais, montant B large
  const S = serre(ctx, o, {
    pts: [[1.98, 1.34], [0.72, 2.24], [0.48, 2.305], [-1.12, 2.305], [-1.42, 2.245], [-2.55, 1.38]], yb: 1.34, wb: 1.15, wt: 0.98, plonge: 0.14, seuil: 0.25,
    mat: peint, verre, pb: [0, 0], mcPb: 0.14, mlPb: 0.06, lu: [4, 4], mcLu: 0.2, mlLu: 0.07 });
  for (const v of [[[1.66, 1.46], [0.7, 2.17], [0.02, 2.2], [0.02, 1.46]], [[-0.17, 1.46], [-0.17, 2.2], [-1.3, 2.18], [-1.95, 1.46]]]) {
    const c = v.reduce((a, q) => [a[0] + q[0] / v.length, a[1] + q[1] / v.length], [0, 0]);
    S.laterale(v.map(([x, y]) => [c[0] + (x - c[0]) * 1.04 + Math.sign(x - c[0]) * 0.02, c[1] + (y - c[1]) * 1.06]), chromeSat, 0.004);   // cadre chromé
    S.laterale(v, verre, 0.009);
  }
  for (const xj of [1.98, -2.55]) o.boite(0.05, 0.025, 2.2, chromeSat, xj, 1.36, 0);
  retrosPorte(k, 1.55, 1.52, 1.22, peint);
  // FACE AVANT CARRÉE : phares rectangulaires minces, calandre plate à deux pavés sombres, clignotants d'angle
  { const xf = xAv;
    o.boite(0.05, 0.17, 0.62, noir, xf + 0.005, 1.08, 0);
    for (const s of [-1, 1]) {
      o.boite(0.04, 0.13, 0.26, maille, xf + 0.025, 1.08, s * 0.16);
      o.boite(0.05, 0.17, 0.62, lumBlanche, xf - 0.0, 1.08, s * 0.66); o.boite(0.05, 0.18, 0.03, chromeSat, xf + 0.02, 1.08, s * 0.5);
      o.boite(0.05, 0.17, 0.13, lumiere(ctx, '#ff9a2a'), xf - 0.02, 1.08, s * 1.05);
    }
    o.boite(0.045, 0.025, 2.3, chromeSat, xf + 0.012, 0.975, 0);
    // bouclier VIP intégré : prise centrale maillée, coins maillés, feux ambre, lame avant collée sous le bouclier
    o.boite(0.04, 0.2, 1.1, maille, xf + 0.012, 0.6, 0);
    for (const s of [-1, 1]) { o.boite(0.04, 0.22, 0.34, maille, xf + 0.012, 0.56, s * 0.98); o.boite(0.03, 0.05, 0.26, lumiere(ctx, '#ff9a2a'), xf + 0.02, 0.8, s * 0.95); }
    o.boite(0.03, 0.17, 0.5, o.mat('#eef0f4', 0.5, 0.1), xf + 0.03, 0.82, 0); o.boite(0.032, 0.035, 0.42, o.mat('#2a4aa0', 0.5, 0.1), xf + 0.033, 0.87, 0);
    o.boite(0.22, 0.06, 2.4, noir, xf - 0.07, 0.28, 0);                                                         // lame avant (collée sous le bouclier)
  }
  // poupe : bandeau de feux pleine largeur, plaque, diffuseur, double échappement, becquet de malle
  { const xr = xAr;
    o.boite(0.05, 0.2, 2.3, lumRouge, xr - 0.005, 1.12, 0); o.boite(0.055, 0.04, 2.3, chromeSat, xr - 0.01, 1.0, 0);
    o.boite(0.03, 0.17, 0.5, o.mat('#eef0f4', 0.5, 0.1), xr - 0.02, 0.8, 0);
    o.boite(0.2, 0.08, 2.3, noir, xr + 0.08, 0.26, 0);
    for (const s of [-1, 1]) o.cyl(0.075, 0.075, 0.2, o.chrome, xr - 0.03, 0.36, s * 0.75, 0, Math.PI / 2, 18);
    k.plan(-3.72, k.hautAu(B, -3.72, 0) + 0.04, 0.3, 2.2, 0.05, peint, 0.1);
  }
  // jupes latérales du kit (volume) entre les ailes élargies
  { const xa = eAr + 0.82, xb = eAv - 0.8, y = 0.27, zj = k.flancAu(B, (xa + xb) / 2, y);
    for (const s of [-1, 1]) o.boite(xb - xa, 0.14, 0.1, peint, (xa + xb) / 2, y, s * (zj + 0.02)); }
  // flancs : arête de caisse, joints de portes, poignées chromées
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.2, 1.38, (g, w, h, c, M) => {
    g.fillStyle = 'rgba(150,160,185,0.55)'; g.fillRect(0, M.Y(1.12), w, 3);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, M.Y(1.12) + 3, w, 3);
    g.strokeStyle = '#05060a'; g.lineWidth = 3;
    for (const x of [1.8, 0.0, -1.98]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.38)); g.lineTo(M.X(x - 0.03), M.Y(0.36)); g.stroke(); }
    g.fillStyle = '#c3c8d2'; for (const x of [-0.3, -2.25]) g.fillRect(M.X(x), M.Y(1.22), M.S(0.26), 7);
    M.trouer(g);
  }, roues, { ch: 192, jeu: 0.05 });
  return { L: 7.9, largeur: 2.86, hauteur: 2.31, xAvant: 3.92, xArriere: -3.92, roues, jante: rd.jante, rayons: rd.rayons, levre: rd.levre, flanc: null, plafond: +(1360 / 1695).toFixed(3) };
}

/* ================================================================== TK01 — Mitsubishi Starion 4WD (Tomica Premium)
 * Cotes réelles 4 400 × 1 745 × 1 315 mm (caisse large), empattement 2 435 → échelle 1,63 / m ; porte-à-faux arrière RACCOURCI.
 * Coupé 3 portes : long capot plongeant en coin, phares escamotables FERMÉS (paupières en relief cerclées d'un joint noir aux coins
 * du capot), bossage de capot décalé, ailes élargies EN CAISSON aux deux essieux (dessus plat qui domine le capot), grande verrière
 * à hayon vitré terminée par un BECQUET et une poupe tronquée verticale, custode à décrochement, montant B noir.
 * Noir satiné, jantes argent à cinq creux. Garde au sol réelle. */
function starion(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = laque(ctx, '#1d1e23', 0.4, 0.1, 0.06), noir = o.mat('#0a0b0e', 0.75, 0.2), gris = o.mat('#2c2e34', 0.5, 0.45), ambre = lumiere(ctx, '#ff9a2a');
  const verre = vitrage(ctx, '#0e131c');
  const rd = { jante: '#d7dbe3', rayons: 'cinqCreux', flanc: null };
  const xAv = 3.5, xAr = -3.3, eAv = 1.88, eAr = -2.06;
  const roues = [essieu(eAv, 0.6, 0.6, 1.15, true, rd), essieu(eAr, 0.61, 0.66, 1.12, false, rd)];
  // caisse de base étroite (1,28) : les ailes larges sont des caissons rapportés ; capot en coin, poupe tronquée haute
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.25 + 0.2 * Math.max(plateau(x, eAv, 0.8, 0.16), plateau(x, eAr, 0.82, 0.16)),
    y0: table([[xAr, 0.44], [xAr + 0.25, 0.32], [xAv - 0.45, 0.31], [xAv, 0.44]]),
    y1: table([[xAr, 1.5], [xAr + 0.12, 1.57], [-2.6, 1.55], [eAr, 1.5], [-0.8, 1.42], [0.6, 1.39], [1.3, 1.37], [eAv, 1.33], [2.6, 1.22], [3.15, 1.1], [xAv, 0.98]]),
    nt: 6.5, nb: 4.5, wt: 0.96 }, 72, 0.1);
  k.loft(B, peint, { arches: archesSerrees(roues), nx: 180, ns: 64 });
  puitsNoirs(k, roues, 1.44);
  // ailes élargies en caisson (élargissement carré de la caisse, +0,2 au droit des essieux, raccord raide)
  // arêtes vives des caissons : moulure horizontale au sommet de chaque aile élargie et retour vertical à ses extrémités
  for (const [a, d] of [[eAv, 0.8], [eAr, 0.82]]) {
    const yA = (x) => k.hautAu(B, x, 1.32) - 0.0;
    moulure(k, B, Array.from({ length: 9 }, (_, i) => { const x = a - d + 2 * d * i / 8; return [x, Math.max(yA(x) - 0.06, 0.6 + 0.6 + 0.12)]; }), 0.022, peint, -0.01);
    for (const sx of [-1, 1]) { const x = a + sx * (d + 0.08); moulure(k, B, [[x, k.hautAu(B, x, 1.2) - 0.06], [x, 0.5]], 0.018, noir, 0.0); }
  }
  // verrière à hayon : pare-brise couché, toit court, grande lunette jusqu'au becquet (rétrécie en plan)
  const S = serre(ctx, o, {
    pts: [[1.32, 1.34], [0.18, 2.14], [-0.07, 2.225], [-0.95, 2.225], [-1.25, 2.14], [-2.78, 1.64]], yb: 1.34, wb: 1.1, wt: 0.96, plonge: 0.16, seuil: 0.25,
    taper: { x0: -1.0, x1: -2.8, f: 0.08 }, mat: peint, verre, pb: [0, 0], mcPb: 0.14, mlPb: 0.06, lu: [4, 4], mcLu: 0.18, mlLu: 0.06 });
  S.laterale([[1.05, 1.44], [0.22, 2.02], [-0.6, 2.08], [-0.6, 1.44]], verre);                              // vitre de portière
  S.laterale([[-0.6, 1.44], [-0.6, 2.12], [-0.8, 2.12], [-0.8, 1.44]], noir);                               // montant B noir
  S.laterale([[-0.8, 1.44], [-0.8, 2.08], [-1.3, 2.06], [-2.0, 1.8], [-2.45, 1.66], [-2.45, 1.52]], verre);   // custode à décrochement
  o.boite(0.05, 0.025, 2.0, gris, 1.32, 1.36, 0);
  // becquet de hayon et poupe tronquée
  k.plan(-2.86, 1.68, 0.36, 2.3, 0.06, peint, 0.18);
  for (const s of [-1, 1]) o.boite(0.3, 0.12, 0.06, peint, -2.86, 1.6, s * 1.08);
  retrosPorte(k, 1.08, 1.56, 1.2, noir);
  // capot : bossage décalé, grille d'auvent, paupières de phares escamotables en relief (joint noir + capot de paupière)
  { const yb = k.hautAu(B, 2.35, 0.32); k.ellipsoide(0.7, 0.07, 0.28, peint, 2.35, yb - 0.015, 0.32, 20); o.boite(0.04, 0.05, 0.34, noir, 3.0, k.hautAu(B, 3.0, 0.32) + 0.03, 0.32); }
  for (let i = 0; i < 6; i++) o.boite(0.03, 0.015, 1.4, noir, 1.4 + i * 0.05, k.hautAu(B, 1.5, 0) + 0.005, 0);
  for (const s of [-1, 1]) {
    const xp = 3.12, zp = s * 0.74, y = k.hautAu(B, xp, zp), pente = Math.atan2(k.hautAu(B, xp + 0.2, zp) - k.hautAu(B, xp - 0.2, zp), 0.4);
    const joint = o.boite(0.5, 0.04, 0.6, noir, xp, y + 0.0, zp); joint.rotation.z = pente;
    const pau = o.boite(0.46, 0.05, 0.56, peint, xp, y + 0.03, zp); pau.rotation.z = pente;
  }
  // nez : fente de calandre noire, feux de position / clignotants d'angle, bouclier noir à lèvre, plaque
  { const xf = xAv;
    o.boite(0.05, 0.08, 1.6, noir, xf - 0.0, 0.9, 0);
    for (const s of [-1, 1]) { o.boite(0.05, 0.08, 0.3, lumBlanche, xf - 0.01, 0.9, s * 0.96); o.boite(0.05, 0.08, 0.1, ambre, xf - 0.04, 0.9, s * 1.16); }
    o.boite(0.2, 0.26, 2.5, noir, xf - 0.04, 0.62, 0); o.boite(0.12, 0.05, 2.3, gris, xf - 0.02, 0.46, 0);
    for (const s of [-1, 1]) o.boite(0.03, 0.08, 0.28, ambre, xf + 0.065, 0.66, s * 0.85);
    o.boite(0.03, 0.17, 0.5, o.mat('#f2f3f5', 0.5, 0.1), xf + 0.07, 0.64, 0);
  }
  // poupe tronquée : bandeau de feux noir pleine largeur à feux rouges, bouclier noir, plaque, échappement
  { const xr = xAr;
    o.boite(0.05, 0.26, 2.3, noir, xr - 0.005, 1.25, 0);
    for (const s of [-1, 1]) { o.boite(0.05, 0.2, 0.62, lumRouge, xr - 0.02, 1.25, s * 0.8); o.boite(0.05, 0.08, 0.2, ambre, xr - 0.025, 1.2, s * 0.38); }
    o.boite(0.2, 0.3, 2.5, noir, xr + 0.04, 0.62, 0); o.boite(0.03, 0.17, 0.5, o.mat('#f2f3f5', 0.5, 0.1), xr - 0.07, 0.9, 0);
    o.cyl(0.065, 0.065, 0.18, o.chrome, xr - 0.02, 0.42, 0.7, 0, Math.PI / 2, 16);
  }
  // flancs : bas de caisse noir, jonc de protection, joint de porte, poignée
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.3, 1.45, (g, w, h, c, M) => {
    g.fillStyle = '#0a0b0e'; g.fillRect(0, M.Y(0.55), w, h);
    g.fillStyle = '#3a3c42'; g.fillRect(0, M.Y(0.9), w, 6); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, M.Y(0.9) + 6, w, 3);
    g.strokeStyle = '#050608'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(0.98), M.Y(1.42)); g.lineTo(M.X(0.96), M.Y(0.56)); g.moveTo(M.X(-0.86), M.Y(1.42)); g.lineTo(M.X(-0.84), M.Y(0.56)); g.stroke();
    g.fillStyle = '#4a4c52'; g.fillRect(M.X(-0.78), M.Y(1.24), M.S(0.22), 6);
    M.trouer(g);
  }, roues, { ch: 192 });
  return { L: 6.95, largeur: 2.92, hauteur: 2.19, xAvant: xAv + 0.08, xArriere: xAr - 0.07, roues, jante: rd.jante, rayons: rd.rayons, flanc: null, plafond: +(1315 / 1745).toFixed(3) };
}

/* ================================================================== TK02 — Nissan Skyline R30 HT 2000 Turbo RS « Tekkamen » (Tomica Premium)
 * Cotes réelles 4 595 × 1 665 × 1 360 mm, empattement 2 615 → échelle 1,65 / m : L 7,59, empattement 4,32, pavillon ≈ 2,2.
 * Coupé hardtop 2 portes trois volumes aux arêtes vives. Signature : le « MASQUE DE FER » — nez SANS calandre, panneau lisse
 * couleur caisse entre deux phares rectangulaires minces, bouclier noir à fentes. Bicolore argent (haut) / noir (bas) séparé par
 * un double filet or, petite inscription « RS-TURBO », becquet de malle noir sur pieds, jantes à rayons croisés argent. */
function tekkamen(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const argent = laque(ctx, '#b3b7bf', 0.26, 0.45, 0.35), noir = laque(ctx, '#121317', 0.35, 0.1, 0.06), mat = o.mat('#0b0c0f', 0.7, 0.2), gris = o.mat('#5a5e66', 0.35, 0.7);
  const verre = vitrage(ctx, '#0d121b');
  const rd = { jante: '#d7dbe3', rayons: 'bbs', flanc: null };
  const xAv = 3.795, xAr = -3.795, eAv = 2.305, eAr = -2.015;
  const roues = [essieu(eAv, 0.62, 0.56, 1.06, true, rd), essieu(eAr, 0.62, 0.6, 1.04, false, rd)];
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.33 + 0.01 * Math.max(plateau(x, eAv, 0.6, 0.3), plateau(x, eAr, 0.6, 0.3)),
    y0: table([[xAr, 0.44], [xAr + 0.3, 0.32], [xAv - 0.4, 0.31], [xAv, 0.44]]),
    y1: table([[xAr, 1.36], [xAr + 0.2, 1.42], [eAr, 1.43], [-1.0, 1.43], [1.0, 1.42], [1.75, 1.41], [eAv, 1.39], [3.1, 1.3], [3.55, 1.2], [xAv, 1.1]]),
    nt: 7, nb: 4.5, wt: 0.97 }, 72, 0.12);
  k.loft(B, argent, { arches: archesSerrees(roues), nx: 180, ns: 64 });
  puitsNoirs(k, roues, 1.32);
  // pavillon de coupé : pare-brise incliné, toit plat, lunette inclinée, montant C large (hardtop sans montant B)
  const S = serre(ctx, o, {
    pts: [[1.72, 1.38], [0.6, 2.15], [0.35, 2.21], [-1.0, 2.21], [-1.3, 2.16], [-2.36, 1.42]], yb: 1.38, wb: 1.16, wt: 0.98, plonge: 0.14, seuil: 0.25,
    mat: argent, verre, pb: [0, 0], mcPb: 0.14, mlPb: 0.06, lu: [4, 4], mcLu: 0.22, mlLu: 0.07 });
  for (const v of [[[1.44, 1.5], [0.68, 2.07], [-0.52, 2.1], [-0.52, 1.5]], [[-0.68, 1.5], [-0.68, 2.1], [-1.22, 2.08], [-1.8, 1.5]]]) {
    S.laterale(v.map(([x, y]) => [x + Math.sign(x + 0.6) * 0.025, y + (y > 1.8 ? 0.025 : -0.025)]), mat, 0.004);   // joint noir de vitre
    S.laterale(v, verre, 0.009);
  }
  for (const s of [-1, 1]) o.boite(4.0, 0.03, 0.025, gris, -0.32, 1.425, s * 1.165);
  retrosPorte(k, 1.42, 1.6, 1.2, noir);
  // capot : légère nervure centrale
  o.boite(1.6, 0.02, 0.05, argent, 2.55, k.hautAu(B, 2.55, 0) + 0.005, 0);
  // MASQUE DE FER : nez SANS calandre — grand panneau lisse couleur caisse qui descend jusqu'au bouclier, phares rectangulaires
  // très minces logés sous le bord du capot, bouclier noir lisse (une seule prise d'air basse), clignotants d'angle
  { const xf = xAv;
    for (const s of [-1, 1]) {
      o.boite(0.05, 0.1, 0.5, mat, xf - 0.035, 1.0, s * 0.88);
      o.boite(0.04, 0.075, 0.46, lumBlanche, xf - 0.015, 1.0, s * 0.88);
      o.boite(0.04, 0.06, 0.16, lumiere(ctx, '#ff9a2a'), xf - 0.05, 0.86, s * 1.08);
    }
    o.boite(0.2, 0.28, 2.56, noir, xf - 0.06, 0.58, 0);                                                    // bouclier noir lisse
    o.boite(0.03, 0.06, 0.8, mat, xf + 0.045, 0.5, 0);                                                     // prise d'air basse unique
    o.boite(0.03, 0.14, 0.46, o.mat('#f2f3f5', 0.5, 0.1), xf + 0.05, 0.62, 0);
  }
  // poupe : feux rectangulaires en bandeau, bouclier noir, plaque, échappement ; becquet de malle noir posé sur deux pieds
  { const xr = xAr;
    o.boite(0.05, 0.26, 2.3, mat, xr - 0.01, 1.12, 0);
    for (const s of [-1, 1]) { o.boite(0.05, 0.2, 0.7, lumRouge, xr - 0.02, 1.12, s * 0.72); o.boite(0.05, 0.08, 0.22, lumiere(ctx, '#ff9a2a'), xr - 0.025, 1.07, s * 0.24); }
    o.boite(0.2, 0.3, 2.56, noir, xr + 0.05, 0.6, 0); o.boite(0.03, 0.15, 0.46, o.mat('#f2f3f5', 0.5, 0.1), xr - 0.06, 0.66, 0);
    o.cyl(0.065, 0.065, 0.2, o.chrome, xr - 0.03, 0.4, 0.62, 0, Math.PI / 2, 16);
    const xw = -3.42, yM = Math.min(k.hautAu(B, xw - 0.2, 0.9), k.hautAu(B, xw + 0.2, 0.9));
    k.plan(xw, yM + 0.22, 0.5, 2.3, 0.07, noir, 0.1);
    for (const s of [-1, 1]) {
      o.boite(0.18, 0.24, 0.08, noir, xw, yM + 0.1, s * 0.9);                                              // pieds : du capot de malle au plan
      o.boite(0.46, 0.16, 0.04, noir, xw - 0.02, yM + 0.24, s * 1.15);                                     // dérives d'extrémité
    }
  }
  // flancs : bas de caisse noir (bicolore), double filet or, « TURBO » or, joint de porte, poignée
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.3, 1.41, (g, w, h, c, M) => {
    g.fillStyle = '#121317'; g.fillRect(0, M.Y(0.84), w, h);
    g.fillStyle = '#d4a63c'; g.fillRect(0, M.Y(0.84) - 7, w, 5); g.fillRect(0, M.Y(0.84) - 15, w, 2);
    k.ecrire(g, 'RS-TURBO', M.X(-0.85), M.Y(0.7), c, 'italic bold 20px sans-serif', '#d9ab42');
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, M.Y(1.24), w, 2); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, M.Y(1.24) + 2, w, 3);   // arête de caisse
    g.strokeStyle = '#4a4e56'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(1.62), M.Y(1.39)); g.lineTo(M.X(1.58), M.Y(0.86)); g.moveTo(M.X(-0.62), M.Y(1.39)); g.lineTo(M.X(-0.6), M.Y(0.86)); g.stroke();
    g.fillStyle = '#80848c'; g.fillRect(M.X(-0.56), M.Y(1.2), M.S(0.22), 6);
    M.trouer(g);
  }, roues, { ch: 192 });
  return { L: 7.59, largeur: 2.68, hauteur: 2.2, xAvant: xAv + 0.12, xArriere: xAr - 0.13, roues, jante: rd.jante, flanc: null, plafond: +(1360 / 1665).toFixed(3) };
}

/* ================================================================== TK03 — Mercedes 190E 2.5-16 Evolution II (Tomica Limited Vintage)
 * Cotes réelles 4 487 × 1 706 × 1 361 mm, empattement 2 665 → échelle 1,64 / m : L 7,36, empattement 4,37, pavillon ≈ 2,28.
 * Berline compacte 4 portes en coin (malle haute), extensions d'ailes carrées Evo II aux quatre roues, jupes latérales,
 * becquet avant réglable, GRAND AILERON ARRIÈRE réglable sur deux montants + lèvre de malle. Noir brillant, jantes 6 branches.
 * Aucune étoile, aucun logo : calandre verticale générique à lamelles cerclée de chrome. */
function evoII(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = laque(ctx, '#101115', 0.2, 0.1, 0.06), noir = o.mat('#16171c', 0.6, 0.3), mat = o.mat('#08090b', 0.8, 0.1), ambre = lumiere(ctx, '#ff9a2a');
  const verre = vitrage(ctx, '#0f141d');
  const rd = { jante: '#d7dbe3', rayons: 'evo6', flanc: null };
  const xAv = 3.68, xAr = -3.68, eAv = 2.37, eAr = -2.0;
  const roues = [essieu(eAv, 0.62, 0.62, 1.15, true, rd), essieu(eAr, 0.62, 0.66, 1.13, false, rd)];
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.3 + 0.16 * Math.max(plateau(x, eAv, 0.72, 0.18), plateau(x, eAr, 0.74, 0.18)),
    y0: table([[xAr, 0.42], [xAr + 0.3, 0.3], [xAv - 0.38, 0.29], [xAv, 0.4]]),
    y1: table([[xAr, 1.5], [xAr + 0.2, 1.56], [-2.4, 1.55], [-1.0, 1.48], [0.8, 1.44], [1.7, 1.41], [eAv, 1.38], [3.3, 1.25], [xAv, 1.1]]),
    nt: 6.5, nb: 4.5, wt: 0.97 }, 72, 0.12);
  k.loft(B, peint, { arches: archesSerrees(roues), nx: 180, ns: 64 });
  puitsNoirs(k, roues, 1.45);
  // extensions d'ailes Evo II : bourrelet d'arche en volume, couleur caisse, qui prolonge l'élargissement jusqu'au ras du pneu
  for (const r of roues) elargisseur(k, r, { Ri: 0.69, larg: 0.13, z0: 1.3, z1: 1.48, mat: peint, a0: -0.02, a1: Math.PI + 0.02, bombe: 0.5 });
  // pavillon : pare-brise incliné, toit plat, lunette inclinée, montants épais (berline compacte haute)
  const S = serre(ctx, o, {
    pts: [[1.72, 1.4], [0.62, 2.3], [0.4, 2.37], [-1.0, 2.37], [-1.26, 2.31], [-2.3, 1.53]], yb: 1.38, wb: 1.15, wt: 0.99, plonge: 0.14, seuil: 0.25,
    mat: peint, verre, pb: [0, 0], mcPb: 0.14, mlPb: 0.06, lu: [4, 4], mcLu: 0.2, mlLu: 0.07 });
  for (const v of [[[1.44, 1.5], [0.6, 2.22], [-0.08, 2.25], [-0.08, 1.51]], [[-0.26, 1.52], [-0.26, 2.25], [-1.15, 2.23], [-1.75, 1.6], [-1.75, 1.56]]]) S.laterale(v, verre, 0.009);
  retrosPorte(k, 1.42, 1.6, 1.28, peint);
  // face avant : calandre verticale générique (cadre chromé, lamelles), phares rectangulaires à coins ambre, becquet réglable
  { const xf = xAv;
    o.boite(0.08, 0.32, 0.56, o.chrome, xf + 0.02, 0.9, 0); o.boite(0.085, 0.26, 0.48, mat, xf + 0.025, 0.9, 0);
    for (let i = 0; i < 4; i++) o.boite(0.09, 0.025, 0.46, o.chrome, xf + 0.03, 0.81 + i * 0.06, 0);
    for (const s of [-1, 1]) { o.boite(0.06, 0.17, 0.4, lumBlanche, xf - 0.02, 0.9, s * 0.56); o.boite(0.06, 0.17, 0.16, ambre, xf - 0.05, 0.9, s * 0.86); }
    o.boite(0.24, 0.3, 2.6, peint, xf - 0.04, 0.55, 0);
    for (const s of [-1, 1]) o.boite(0.03, 0.12, 0.42, mat, xf + 0.085, 0.5, s * 0.72);
    o.boite(0.03, 0.15, 0.46, o.mat('#f2f3f5', 0.5, 0.1), xf + 0.09, 0.6, 0);
    o.boite(0.3, 0.04, 2.36, mat, xf - 0.1, 0.39, 0);                                                      // becquet réglable : lame collée sous le bouclier
  }
  // poupe : feux larges rouge / ambre striés, bouclier, plaque, échappement ; lèvre de malle + GRAND AILERON réglable
  { const xr = xAr;
    o.boite(0.05, 0.24, 2.3, mat, xr - 0.01, 1.2, 0);
    for (const s of [-1, 1]) { o.boite(0.05, 0.2, 0.62, lumRouge, xr - 0.02, 1.2, s * 0.76); o.boite(0.05, 0.07, 0.62, ambre, xr - 0.025, 1.16, s * 0.76); for (let i = 0; i < 3; i++) o.boite(0.055, 0.012, 0.6, mat, xr - 0.025, 1.12 + i * 0.07, s * 0.76); }
    o.boite(0.24, 0.32, 2.6, peint, xr + 0.03, 0.58, 0); o.boite(0.03, 0.15, 0.46, o.mat('#f2f3f5', 0.5, 0.1), xr - 0.1, 0.84, 0);
    o.cyl(0.07, 0.07, 0.24, o.chrome, xr - 0.06, 0.38, 0.72, 0, Math.PI / 2, 16);
    const yM = k.hautAu(B, -3.25, 0);
    k.plan(xr + 0.12, k.hautAu(B, xr + 0.12, 0) + 0.04, 0.26, 2.3, 0.06, peint, 0.18);                       // lèvre de malle
    k.plan(-3.3, yM + 0.5, 0.62, 2.5, 0.09, peint, 0.06);                                                     // plan principal
    k.plan(-3.54, yM + 0.63, 0.3, 2.5, 0.06, peint, 0.32);                                                    // volet réglable
    for (const s of [-1, 1]) {
      k.lame([[-3.66, yM - 0.02], [-2.95, yM - 0.02], [-2.95, yM + 0.12], [-3.12, yM + 0.62], [-3.7, yM + 0.76], [-3.72, yM + 0.5]], 0.07, peint, s * 1.18);   // montants-dérives
    }
  }
  // flancs : jupes latérales, arête de caisse, joints de portes, poignées, petit écusson bleu générique
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.29, 1.52, (g, w, h, c, M) => {
    g.fillStyle = '#050608'; g.fillRect(0, M.Y(0.46), w, h);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, M.Y(0.7), w, 3); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, M.Y(0.7) + 3, w, 3);   // jonc de protection
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, M.Y(1.24), w, 2);
    g.strokeStyle = '#030305'; g.lineWidth = 3; for (const x of [1.5, -0.17, -1.8]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.42)); g.lineTo(M.X(x - 0.04), M.Y(0.48)); g.stroke(); }
    g.fillStyle = '#34363e'; for (const x of [-0.12, -1.72]) g.fillRect(M.X(x), M.Y(1.2), M.S(0.22), 6);
    g.fillStyle = '#2b5fc8'; g.fillRect(M.X(1.62), M.Y(0.66), M.S(0.14), M.Sy(0.07));
    M.trouer(g);
  }, roues, { ch: 192 });
  return { L: 7.36, largeur: 2.84, hauteur: 2.28, xAvant: xAv + 0.21, xArriere: xAr - 0.13, roues, jante: rd.jante, flanc: null, plafond: +(1361 / 1706).toFixed(3) };
}

/* ================================================================== TK04 — muscle car CYBERPUNK (base : Pontiac Firebird Trans Am 1977, Tomica)
 * Cotes réelles 5 000 × 1 860 × 1 250 mm → plafond 0,672 ; châssis RACCOURCI (≤ 7,4 hors tout), toit au rapport réel.
 * Silhouette de muscle car 70s : long capot en bec, pare-brise couché, toit à panneaux vitrés (T-top), custode fuyante, malle
 * en canard, GROS pneus sous des élargisseurs blindés EN VOLUME boulonnés (avant et arrière).
 * Transformation 100 % cyberpunk : vitres latérales remplacées par des VOLETS blindés à visière néon, persiennes sur la lunette,
 * écrans lumineux intégrés aux portières (tag générique « NC-77 », jauges, pistes de circuit), écran tête haute sur le capot,
 * plaques de blindage boulonnées (capot, nez bélier, bouclier), bandeaux néon cyan / magenta sur la carrosserie, ÉCLAIRAGE NÉON
 * SOUS CAISSE (halo au sol entre les roues + rampes sous les bas de caisse — jamais dans les roues), prise d'air shaker blindée,
 * aileron sur montants, antenne et caméras. Teinte dominante noire et or de la miniature ; aucun nom, aucun emblème. */
function banditCyber(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx, k = kit(ctx), o = k.o;
  const peint = laque(ctx, '#0b0b0e', 0.16, 0.1, 0.06), or = o.mat('#d6a83a', 0.3, 0.8), acier = laque(ctx, '#3a3e47', 0.4, 0.6, 0.18), noir = o.mat('#09090b', 0.7, 0.2);
  const cyan = lumiere(ctx, '#19f0ff', 2.0), magenta = lumiere(ctx, '#ff2bd6', 2.0), boulon = o.mat('#c9ced8', 0.25, 0.9);
  const verre = vitrage(ctx, '#0a0e16');
  const rd = { jante: '#d6a83a', rayons: 'turbine', flanc: null };
  const xAv = 3.5, xAr = -3.52, eAv = 1.92, eAr = -2.18;
  const roues = [essieu(eAv, 0.64, 0.7, 1.12, true, rd), essieu(eAr, 0.66, 0.86, 1.1, false, rd)];
  const B = caisseFn(xAr, xAv, {
    w: () => 1.35,
    y0: table([[xAr, 0.48], [xAr + 0.3, 0.36], [xAv - 0.5, 0.35], [xAv, 0.54]]),
    y1: table([[xAr, 1.34], [xAr + 0.2, 1.44], [-3.0, 1.48], [eAr, 1.5], [-1.2, 1.42], [0.4, 1.4], [1.3, 1.4], [eAv, 1.42], [2.7, 1.32], [3.2, 1.14], [xAv, 0.96]]),
    nt: 6.5, nb: 4.5, wt: 0.97 }, 72, 0.12);
  k.loft(B, peint, { arches: archesSerrees(roues), nx: 180, ns: 64 });
  puitsNoirs(k, roues, 1.34);
  // élargisseurs blindés en volume, boulonnés, avant et arrière (lèvre au ras des gros pneus)
  elargisseur(k, roues[0], { Ri: 0.71, larg: 0.17, z0: 1.18, z1: 1.49, mat: acier, rivets: 7, matRivet: boulon, bombe: 0.45 });
  elargisseur(k, roues[1], { Ri: 0.73, larg: 0.19, z0: 1.18, z1: 1.55, mat: acier, rivets: 8, matRivet: boulon, bombe: 0.45 });
  // pavillon de muscle car : pare-brise couché, toit court, custode fuyante jusqu'à la malle
  const yb = 1.38, ytop = 2.07, wb = 1.1, wt = 0.94;
  const S = serre(ctx, o, {
    pts: [[1.32, 1.4], [0.1, 2.0], [-0.15, ytop], [-1.0, ytop], [-1.3, 2.0], [-2.7, 1.47]], yb, wb, wt, plonge: 0.14, seuil: 0.25,
    mat: peint, verre, pb: [0, 0], mcPb: 0.14, mlPb: 0.06 });
  // toit en T : deux panneaux vitrés fumés ; visière néon au sommet du pare-brise ; antenne et caméra de toit
  for (const s of [-1, 1]) o.boite(0.78, 0.02, 0.5, verre, -0.58, ytop + 0.003, s * 0.36);
  o.boite(0.05, 0.03, 1.6, cyan, 0.06, 2.0, 0);
  o.cyl(0.012, 0.016, 0.5, acier, -1.0, ytop + 0.25, -0.62); o.boite(0.03, 0.03, 0.03, magenta, -1.0, ytop + 0.5, -0.62);
  o.boite(0.14, 0.08, 0.2, acier, -0.05, ytop + 0.04, 0.0); o.boite(0.02, 0.04, 0.12, cyan, 0.025, ytop + 0.04, 0.0);
  // vitres latérales → VOLETS BLINDÉS : panneau acier, lames en relief, fente de visière néon magenta
  const pente = Math.atan2(wb - wt, ytop - yb);
  const xBord = (poly, y) => { const xs = []; for (let i = 0; i < poly.length; i++) { const [xa, ya] = poly[i], [xb, yb2] = poly[(i + 1) % poly.length]; if ((y - ya) * (y - yb2) <= 0 && ya !== yb2) xs.push(xa + (xb - xa) * (y - ya) / (yb2 - ya)); } return [Math.min(...xs), Math.max(...xs)]; };
  for (const v of [[[1.04, 1.47], [0.15, 1.88], [-0.85, 1.9], [-0.85, 1.47]], [[-1.0, 1.47], [-1.0, 1.9], [-1.4, 1.88], [-2.2, 1.53], [-2.2, 1.48]]]) {
    S.laterale(v, acier, 0.008);
    for (const y of [1.53, 1.6, 1.77, 1.84]) {
      const [xa, xb] = xBord(v, y); if (!(xb - xa > 0.1)) continue;
      for (const s of [-1, 1]) { const m = o.boite(xb - xa - 0.08, 0.045, 0.035, noir, (xa + xb) / 2, y, s * (S.hw(y, (xa + xb) / 2) + 0.025)); m.rotation.x = s * pente; }
    }
    const [xa, xb] = xBord(v, 1.685);
    for (const s of [-1, 1]) { const m = o.boite(xb - xa - 0.1, 0.035, 0.02, magenta, (xa + xb) / 2, 1.685, s * (S.hw(1.685, (xa + xb) / 2) + 0.016)); m.rotation.x = s * pente; }
  }
  // persiennes sur la lunette (lames noires posées sur la facette arrière)
  { const A = [-1.3, 2.0], Bq = [-2.7, 1.47], ang = Math.atan2(Bq[1] - A[1], Bq[0] - A[0]), n = [-Math.sin(ang), Math.cos(ang)];
    if (n[1] < 0) { n[0] = -n[0]; n[1] = -n[1]; }
    for (let i = 0; i < 7; i++) { const t = 0.1 + i * 0.12, x = A[0] + (Bq[0] - A[0]) * t, y = A[1] + (Bq[1] - A[1]) * t;
      const m = o.boite(0.16, 0.03, 2 * S.hw(y, x) - 0.28, noir, x + n[0] * 0.035, y + n[1] * 0.035, 0); m.rotation.z = ang + 0.25; } }
  // bandeaux néon sur la carrosserie : arête d'épaule magenta, bas de caisse cyan (entre les roues), poupe
  { const xa = eAr + 0.66 + 0.3, xb = eAv - 0.64 - 0.3;
    for (const s of [-1, 1]) {
      o.boite(xb - xa, 0.035, 0.03, cyan, (xa + xb) / 2, 0.5, s * (k.flancAu(B, (xa + xb) / 2, 0.5) + 0.012));
      o.boite(xb - xa, 0.03, 0.03, magenta, (xa + xb) / 2, 1.3, s * (k.flancAu(B, (xa + xb) / 2, 1.3) + 0.012));
    }
    // ÉCLAIRAGE SOUS CAISSE : rampes néon sous les bas de caisse + halo cyan au sol entre les roues (hors des roues)
    for (const s of [-1, 1]) o.boite(xb - xa, 0.03, 0.05, cyan, (xa + xb) / 2, 0.33, s * 1.05);
    o.boite(0.04, 0.03, 1.6, magenta, xAv - 0.7, 0.36, 0); o.boite(0.04, 0.03, 1.6, magenta, xAr + 0.6, 0.38, 0);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(256, 128, 10, 256, 128, 250); gr.addColorStop(0, 'rgba(25,240,255,0.9)'); gr.addColorStop(0.45, 'rgba(25,200,255,0.45)'); gr.addColorStop(1, 'rgba(25,240,255,0)');
    g.setTransform(1, 0, 0, 0.5, 0, 64); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    const t = ctx.garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding;
    const halo = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(xb - xa + 2.2, 2.0)), ctx.garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })));
    halo.rotation.x = -Math.PI / 2; halo.position.set((xa + xb) / 2, 0.015, 0); o.ajouter(halo);
  }
  // capot : plaque blindée boulonnée avec écran tête haute, prise d'air shaker blindée, chevrons or génériques
  { const xc = 2.6, yC = k.hautAu(B, xc, 0), pc = Math.atan2(k.hautAu(B, xc + 0.4, 0) - k.hautAu(B, xc - 0.4, 0), 0.8);
    const p = o.boite(1.0, 0.035, 1.1, acier, xc, yC + 0.015, 0); p.rotation.z = pc;
    for (const dx of [-0.42, 0.42]) for (const bz of [-0.48, 0.48]) o.cyl(0.03, 0.03, 0.03, boulon, xc + dx, k.hautAu(B, xc + dx, bz) + 0.04 + dx * Math.tan(pc) * 0 , bz, 0, 0, 6);
    const ecran = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(0.62, 0.7)), matLumineux(k, (g, w, h) => {
      g.fillStyle = 'rgba(4,10,16,0.95)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#19f0ff'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
      g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(30, 40 + i * 30); g.lineTo(30 + 40 + i * 25, 40 + i * 30); g.stroke(); }
      g.strokeStyle = '#ff2bd6'; g.beginPath(); g.arc(w * 0.72, h * 0.5, 50, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
      g.fillStyle = '#d6a83a'; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.fillText('77', w * 0.72, h * 0.56);
    }, 256, 256));
    ecran.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); ecran.rotation.order = 'YXZ'; ecran.rotation.set(-Math.PI / 2 + 0, 0, 0);
    ecran.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, pc, 'ZYX'));
    ecran.position.set(xc + 0.02, yC + 0.036, 0); o.ajouter(ecran);
    const yS = k.hautAu(B, 1.75, 0);
    o.boite(0.62, 0.26, 0.62, acier, 1.75, yS + 0.08, 0); o.boite(0.05, 0.16, 0.5, noir, 2.07, yS + 0.13, 0); o.boite(0.03, 0.02, 0.52, cyan, 2.1, yS + 0.22, 0);
    k.drapeDessus(B, 1.3, 3.45, -1.2, 1.2, (g, w, h) => {
      g.strokeStyle = '#d6a83a'; g.lineWidth = 10; g.lineJoin = 'miter';
      for (const [u, l] of [[0.86, 0.3], [0.95, 0.36]]) { g.beginPath(); g.moveTo(w * (u - 0.1), h * (0.5 - l)); g.lineTo(w * u, h * 0.5); g.lineTo(w * (u - 0.1), h * (0.5 + l)); g.stroke(); }
    }, 768, 512, 0.02);
  }
  // nez en bec : feux LED en lame, deux bouches sombres cerclées d'or à fente néon, nez bélier blindé boulonné
  { const xf = xAv;
    for (const s of [-1, 1]) {
      o.boite(0.06, 0.05, 0.62, lumBlanche, xf - 0.08, 1.0, s * 0.62);
      o.boite(0.06, 0.22, 0.56, noir, xf + 0.0, 0.78, s * 0.4); o.boite(0.05, 0.26, 0.6, or, xf - 0.015, 0.78, s * 0.4);
      o.boite(0.04, 0.03, 0.5, cyan, xf + 0.035, 0.69, s * 0.4);
    }
    o.boite(0.16, 0.26, 2.0, acier, xf - 0.04, 0.57, 0);
    for (const bz of [-0.8, -0.27, 0.27, 0.8]) o.cyl(0.03, 0.03, 0.03, boulon, xf + 0.045, 0.57, bz, 0, Math.PI / 2, 6);
  }
  // poupe : barre de feux LED pleine largeur + filet magenta, bouclier acier, double échappement, aileron sur montants + canard
  { const xr = xAr;
    o.boite(0.05, 0.1, 2.3, lumRouge, xr - 0.01, 1.16, 0); o.boite(0.05, 0.03, 2.3, magenta, xr - 0.015, 1.05, 0);
    o.boite(0.2, 0.28, 2.5, acier, xr + 0.04, 0.62, 0);
    for (const s of [-1, 1]) o.cyl(0.09, 0.09, 0.2, o.chrome, xr - 0.04, 0.44, s * 0.6, 0, Math.PI / 2, 18);
    const yM = k.hautAu(B, -3.25, 0);
    k.plan(xr + 0.16, k.hautAu(B, xr + 0.16, 0) + 0.04, 0.3, 2.4, 0.06, peint, 0.25);
    k.plan(-3.22, yM + 0.3, 0.5, 2.5, 0.07, peint, 0.12);
    for (const s of [-1, 1]) { o.boite(0.2, 0.32, 0.06, acier, -3.2, yM + 0.13, s * 0.98); o.boite(0.46, 0.03, 0.03, cyan, -3.22, yM + 0.34, s * 1.22); }
  }
  retrosPorte(k, 1.1, 1.6, 1.2, peint);
  for (const s of [-1, 1]) o.boite(0.02, 0.03, 0.06, cyan, 1.0, 1.6, s * 1.24);                             // caméras de rétro
  // flancs (peinture) : filets or de la miniature, bas de caisse noir mat
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.36, 1.44, (g, w, h, c, M) => {
    g.fillStyle = '#d6a83a'; g.fillRect(0, M.Y(1.36), w, 4); g.fillRect(0, M.Y(1.36) + 9, w, 2);
    g.fillStyle = '#060608'; g.fillRect(0, M.Y(0.56), w, h);
    M.trouer(g);
  }, roues, { ch: 160 });
  // flancs (LUMINEUX) : écran de portière intégré « NC-77 », jauges, pistes de circuit néon
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.36, 1.44, (g, w, h, c, M) => {
    const X0 = M.X(-0.95), X1 = M.X(0.75), Y0 = M.Y(1.12), Y1 = M.Y(0.66);
    g.fillStyle = 'rgba(3,8,14,0.96)'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    g.strokeStyle = '#19f0ff'; g.lineWidth = 4; g.strokeRect(X0 + 3, Y0 + 3, X1 - X0 - 6, Y1 - Y0 - 6);
    k.ecrire(g, 'NC-77', (X0 + X1) / 2 - 20, (Y0 + Y1) / 2, c, 'italic 900 52px Arial Black, Arial', '#ffc94a');
    g.fillStyle = '#ff2bd6'; for (let i = 0; i < 6; i++) g.fillRect(X1 - 40, Y1 - 12 - i * 11, 22, 7);
    g.strokeStyle = 'rgba(25,240,255,0.9)'; g.lineWidth = 3;
    const piste = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(M.X(x), M.Y(y)) : g.moveTo(M.X(x), M.Y(y)))); g.stroke(); for (const [x, y] of [pts[0], pts[pts.length - 1]]) { g.beginPath(); g.arc(M.X(x), M.Y(y), 5, 0, 7); g.fill(); } };
    g.fillStyle = '#19f0ff';
    piste([[0.75, 0.9], [1.0, 0.9], [1.1, 1.0], [2.9, 1.0]]); piste([[0.75, 0.75], [1.05, 0.75], [1.15, 0.66], [2.6, 0.66]]);
    piste([[-0.95, 0.9], [-1.2, 0.9], [-1.3, 1.02], [-3.2, 1.02]]); piste([[-0.95, 0.75], [-1.25, 0.75], [-1.35, 0.66], [-2.8, 0.66]]);
    M.trouer(g);
  }, roues, { ch: 192, emissif: true, eps: 0.03 });
  return { L: 7.3, largeur: 2.78, hauteur: 2.02, xAvant: xAv + 0.06, xArriere: xAr - 0.14, roues, jante: rd.jante, rayons: rd.rayons, flanc: null, plafond: +(1250 / 1860).toFixed(3) };
}

/* ================================================================== TK05 — petit bus jaune (Tomica)
 * Copie CONFORME du constructeur historique (groupe7.js › minibusHublots) : même caisse, mêmes couleurs, mêmes hublots, mêmes
 * détails. Seule correction : l'autocollant de flancs passe par le drapé « sûr » (aucun triangle tiré à travers les pneus —
 * le banc comptait 116 points de tôle dans la gomme) ; passages et trous d'autocollant gardent le jeu historique (0,13).
 * Formes génériques uniquement : aucun trait de personnage (ni oreilles, ni joues, ni queue, ni visage). ---- */
function minibusJaune(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const jaune = o.lac('#ffc60f', 0.32, 0.06), sombre = o.mat('#26272c', 0.55, 0.3);
  // Brief 10 : famille « vans & utilitaires hauts » — pavillon haut (H_toit / W ≈ 0,95 d'après la photo), caisse ronde et bombée
  const B = [
    { x: -3.4, w: 1.02, y0: 0.55, y1: 2.0, nt: 2.6, nb: 3, wt: 0.94 },
    { x: -3.18, w: 1.2, y0: 0.42, y1: 2.36, nt: 3.0, nb: 3.4, wt: 0.92 },
    { x: -2.1, w: 1.28, y0: 0.38, y1: 2.5, nt: 3.4, nb: 3.6, wt: 0.92 },
    { x: 0.0, w: 1.25, y0: 0.38, y1: 2.53, nt: 3.4, nb: 3.6, wt: 0.92 },
    { x: 1.9, w: 1.28, y0: 0.38, y1: 2.46, nt: 3.4, nb: 3.6, wt: 0.92 },
    { x: 2.75, w: 1.22, y0: 0.4, y1: 2.12, nt: 3, nb: 3.4, wt: 0.92 },
    { x: 3.3, w: 1.06, y0: 0.5, y1: 1.5, nt: 2.6, nb: 3, wt: 0.94 },
    { x: 3.45, w: 0.9, y0: 0.62, y1: 1.12, nt: 2.4, nb: 2.6, wt: 0.94 }];
  const rs = [k.roue(2.1, 0.5, 0.46, 1.28, { avant: true, sortie: 0.03 }), k.roue(-2.1, 0.5, 0.46, 1.28, { sortie: 0.03 })];
  k.loft(B, jaune, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, jaune, { t: 0.14, arrondi: 0.05, deb: 0.03, a0: 0.0, a1: Math.PI });   // garde-boue enveloppants, bord roulé
  // grand pare-brise fumé enveloppant posé sur la face avant bombée + visière peinte au-dessus
  k.peauDessus(B, 2.55, 3.2, 0.95, o.verre, 0.02, 0.88);
  k.peauDessus(B, 2.38, 2.6, 0.62, jaune, 0.035, 0.92);
  // grandes vitres rondes : anneau chromé + verre fumé, collées au flanc (z exact sur la surface)
  const RH = 0.36, YH = 1.66;
  for (const x of [-2.45, -1.58, -0.71, 1.38]) for (const s of [-1, 1]) {
    const za = k.flancAu(B, x, YH - 0.3), zb = k.flancAu(B, x, YH + 0.3), z = s * ((za + zb) / 2 + 0.035), incl = Math.atan2(za - zb, 0.6);
    const t = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(RH, 0.05, 10, 32)), o.chrome); t.position.set(x, YH, z); t.rotation.x = -s * incl; o.ajouter(t);
    const d = new THREE.Mesh(ctx.garde(new THREE.CircleGeometry(RH, 32)), o.verre); d.position.set(x, YH, z); d.rotation.set(-s * incl, s < 0 ? Math.PI : 0, 0, 'YXZ'); o.ajouter(d);
  }
  // flancs : porte coulissante, vitre de cabine (verre fumé), filet orange bas de caisse
  drape(k, B, -3.2, 3.2, 0.4, 2.42, (g, w, h, c, M) => {
    g.strokeStyle = '#c99a10'; g.lineWidth = 4; g.strokeRect(M.X(0.0), M.Y(2.2), M.S(0.82), M.Sy(1.52));
    g.fillStyle = '#b48a0e'; g.fillRect(M.X(0.64), M.Y(1.4), M.S(0.1), M.Sy(0.22));
    g.fillStyle = '#1c2230'; g.beginPath(); g.moveTo(M.X(2.0), M.Y(1.62)); g.lineTo(M.X(2.62), M.Y(1.62)); g.quadraticCurveTo(M.X(2.8), M.Y(1.95), M.X(2.72), M.Y(2.18)); g.lineTo(M.X(2.08), M.Y(2.18)); g.quadraticCurveTo(M.X(1.98), M.Y(2.18), M.X(1.98), M.Y(2.05)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(M.X(2.1), M.Y(2.12), M.S(0.42), M.Sy(0.05));
    g.fillStyle = '#ff8a1c'; g.fillRect(0, M.Y(0.66), w, M.Sy(0.07));
    M.trouer(g);
  }, rs, { cw: 1024, ch: 320, eps: 0.024, jeu: k.JEU });
  k.drapeDessus(B, -3.0, 2.1, -1.05, 1.05, (g, w, h) => { g.fillStyle = '#ff8a1c'; g.fillRect(0, h * 0.3, w, h * 0.08); g.fillRect(0, h * 0.62, w, h * 0.08); }, 512, 256);
  k.plan(-3.0, k.hautAu(B, -3.0, 0) + 0.02, 0.5, 1.8, 0.06, jaune, 0.12);
  // face avant : phares ronds cerclés, calandre à barrettes, pare-chocs sombre arrondi ; poupe : feux verticaux, pare-chocs
  for (const s of [-1, 1]) {
    k.phareRond(3.36, 1.0, s * 0.62, 0.14, lumBlanche, o.chrome);
    o.boite(0.08, 0.42, 0.14, lumRouge, -3.37, 1.38, s * 0.78);
  }
  for (let i = 0; i < 3; i++) o.boite(0.06, 0.035, 0.6, o.chrome, 3.41, 0.86 + i * 0.065, 0);
  k.ellipsoide(0.18, 0.13, 1.08, sombre, 3.4, 0.66, 0); k.ellipsoide(0.18, 0.13, 1.08, sombre, -3.4, 0.68, 0);
  return { L: 7.0, largeur: 2.56, hauteur: 2.56, xAvant: 3.55, xArriere: -3.55,
    roues: rs.map((r) => ({ ...r, jante: '#e3262f', rayons: 'plein', flanc: null })), plafond: 0.95 };   // rapport hauteur / largeur relevé sur la photo
}

export const V5_NIPPONS = { J10: hakosuka, J12: laurelVIP, TK01: starion, TK02: tekkamen, TK03: evoII, TK04: banditCyber, TK05: minibusJaune };
