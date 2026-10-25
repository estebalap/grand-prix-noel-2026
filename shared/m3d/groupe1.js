/**
 * Groupe 1 : véhicules noirs et gris à ailerons (B01, B06–B13) — modèles 3D sur mesure d'après les photos.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo ni nom réel : motifs génériques seulement.
 */
import { outils } from './outils.js';
import { aideLoft, coqueFacettes } from './aide_1.js';

/* ------------------------------------------------------------------ aides communes */

/** Polygone de caisse : contour haut (arrière → avant), fond plat yb, passages de roues semi-circulaires {x, r, yc} découpés dans le fond. */
function polyCaisse(haut, yb, arches = []) {
  const p = haut.map((a) => [a[0], a[1]]);
  p.push([haut[haut.length - 1][0], yb]);
  for (const a of arches.slice().sort((u, v) => v.x - u.x)) {
    const dx0 = yb <= a.yc ? a.r : Math.sqrt(Math.max(0, a.r * a.r - (yb - a.yc) ** 2));
    if (yb < a.yc) p.push([a.x + a.r, yb]);
    for (let i = 0; i <= 16; i++) { const dx = dx0 * (1 - 2 * i / 16); p.push([a.x + dx, a.yc + Math.sqrt(Math.max(0, a.r * a.r - dx * dx))]); }
    if (yb < a.yc) p.push([a.x - a.r, yb]);
  }
  p.push([haut[0][0], yb]);
  return p;
}

function aide(ctx) {
  const { THREE, garde, envMap } = ctx, o = outils(ctx);
  /** ellipsoïde (ou demi-ellipsoïde) */
  const ell = (m, rx, ry, rz, x, y, z, demi = false, seg = 24) => {
    const me = new THREE.Mesh(garde(new THREE.SphereGeometry(1, seg, 16, 0, Math.PI * 2, 0, demi ? Math.PI / 2 : Math.PI)), m);
    me.scale.set(rx, ry, rz); me.position.set(x, y, z); return o.ajouter(me);
  };
  /** plaque fine découpée dans un profil (x, y), épaisseur ep, centrée en z */
  const plaque = (pts, ep, m, z = 0, biseau = 0.02) => { const me = o.profil(pts, ep, m, { galbe: false, biseau }); me.position.z = z; return me; };
  /** les deux flancs d'un même profil (symétrie z) */
  const paire = (pts, ep, m, z, biseau = 0.02) => [-1, 1].map((s) => plaque(pts, ep, m, s * z, biseau));
  const vitre = (hex, op = 0.5) => garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex).convertSRGBToLinear(), roughness: 0.05, metalness: 0.1, transparent: true, opacity: op, envMap, envMapIntensity: 1.4, side: THREE.DoubleSide, clearcoat: 1 }));
  const emis = (hex, k = 0.9) => garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).convertSRGBToLinear(), emissive: new THREE.Color(hex).convertSRGBToLinear(), emissiveIntensity: k, roughness: 0.3, metalness: 0.1 }));
  /** tube entre deux points */
  const tige = (a, b, r, m) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    const me = new THREE.Mesh(garde(new THREE.CylinderGeometry(r, r, d.length(), 10)), m);
    me.position.copy(A).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o.ajouter(me);
  };
  /** Autocollant de flanc, dessiné par côté : dessin(g, cw, ch, px, sg) avec px(f) = abscisse canvas de la fraction f (0 arrière → 1 avant). */
  const decal = (dessin, w, h, x, y, zd, cw = 1024, ch = 256) => {
    for (const sg of [1, -1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
      dessin(g, cw, ch, (f) => (sg > 0 ? f : 1 - f) * cw, sg);
      const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), m); p.position.set(x, y, sg * zd); if (sg < 0) p.rotation.y = Math.PI; o.ajouter(p);
    }
  };
  /** Autocollant à plat sur une surface horizontale (capot, toit) : canvas x → monde +x, canvas haut → monde −z. */
  const decalDessus = (dessin, w, d, x, y, z, cw = 512, ch = 256, rotY = 0) => {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, d)), m); p.rotation.x = -Math.PI / 2; p.rotation.z = rotY; p.position.set(x, y, z); return o.ajouter(p);
  };
  return { o, THREE, garde, ell, plaque, paire, vitre, emis, tige, decal, decalDessus };
}

/** Inspection des trains roulants (chantier V5) : retire des AUTOCOLLANTS (maillages texturés transparents enfants de `cible`)
 *  les triangles qui tombent dans le volume d'un pneu (disque du pneu × largeur de bande de roulement, de chaque côté).
 *  Ces zones sont déjà rendues transparentes par le « trouage » du canvas : l'aspect ne change pas, mais plus aucune pellicule
 *  ne traverse la gomme. roues : [{ x, y?, RW | R, z (demi-voie au centre du pneu), ep }]. */
function ajourerPneus(cible, roues) {
  const disques = [];
  for (const r of roues) {
    const R = r.RW ?? r.R, y = r.y ?? R, a = r.z - r.ep / 2 - 0.04, b = r.z + r.ep / 2 + 0.04;
    disques.push({ x: r.x, y, R2: R * R, z0: a, z1: b }, { x: r.x, y, R2: R * R, z0: -b, z1: -a });
  }
  const dans = (x, y, z) => disques.some((d) => z >= d.z0 && z <= d.z1 && (x - d.x) ** 2 + (y - d.y) ** 2 < d.R2);
  const T = [[1, 0], [0, 1], [0, 0], [0.5, 0.5], [0.5, 0], [0, 0.5], [1 / 3, 1 / 3]];
  const liste = [];
  cible.traverse((me) => { if (me.isMesh && me.geometry && me.geometry.groups.length <= 1 && [].concat(me.material).every((m) => m.map && m.transparent)) liste.push(me); });
  for (const me of liste) {
    me.updateWorldMatrix(true, false);
    const e = me.matrixWorld.elements, g = me.geometry, p = g.attributes.position;
    const P = (i) => { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; };
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: p.count }, (_, i) => i), reste = [];
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const A = P(idx[t]), B = P(idx[t + 1]), C = P(idx[t + 2]);
      if (!T.some(([u, v]) => { const w = 1 - u - v; return dans(A[0] * u + B[0] * v + C[0] * w, A[1] * u + B[1] * v + C[1] * w, A[2] * u + B[2] * v + C[2] * w); })) reste.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    if (reste.length < idx.length) g.setIndex(reste);
  }
}

/** Montant de pavillon : tube plaqué sur la surface d'un pavillon lofté (suit le tumblehome), des deux côtés. */
function montant(ctx, L, gh, xa, ya, xb, yb, r, m) {
  const { THREE, garde } = ctx;
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, x = xa + (xb - xa) * t, y = ya + (yb - ya) * t; pts.push(new THREE.Vector3(x, y, s * (L.flancAu(gh, x, Math.min(y, 1e9)) + r * 0.35))); }
    const me = new THREE.Mesh(garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r, 8, false)), m); me.scale.z = 1; L.ajouter(me);
  }
}

/** Motif générique : petit éclair en losange (aucun logo réel). */
function emblemeAile(g, cx, cy, s, couleur) {
  g.fillStyle = couleur; g.beginPath();
  g.moveTo(cx + s * 0.15, cy - s * 0.5); g.lineTo(cx - s * 0.45, cy + s * 0.1); g.lineTo(cx - s * 0.05, cy + s * 0.1);
  g.lineTo(cx - s * 0.2, cy + s * 0.55); g.lineTo(cx + s * 0.45, cy - s * 0.15); g.lineTo(cx + s * 0.05, cy - s * 0.15); g.closePath(); g.fill();
}

/* ------------------------------------------------------------------ B01 : long cabriolet noir à ailerons, filets rouges, double bulle transparente */
function cabrioletAilerons(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, h = aide(ctx), { o, ell, paire, vitre, tige } = h, L = aideLoft(ctx);
  const noir = o.lac('#111116', 0.2, 0.25), noirM = o.mat('#0b0b0f', 0.6, 0.2), rouge = o.mat('#d2262e', 0.4, 0.2), cuir = o.mat('#1c1c22', 0.8, 0.05), arg = o.mat('#c4c9d2', 0.2, 0.9);
  const RW = 0.5, xAr = -2.5, xAv = 2.45;
  const roues = [{ x: xAr, RW, ep: 0.52, z: 0.87 }, { x: xAv, RW, ep: 0.5, z: 0.87 }];         // pneus à fleur de l'aile
  // caisse loftée : nez pointu, ailes avant gonflées, taille resserrée, ailes arrière larges, poupe effilée
  const st = [
    { x: -3.98, w: 0.78, y0: 0.42, y1: 0.98, nt: 3, nb: 3, wt: 0.9 },
    { x: -3.6, w: 0.96, y0: 0.34, y1: 1.12, nt: 3.2, nb: 3.4, wt: 0.88 },
    { x: -2.5, w: 1.12, y0: 0.3, y1: 1.2, nt: 4, nb: 3.6, wt: 0.84 },             // aile arrière rehaussée : coiffe le pneu (garde ≥ 0,08)
    { x: -1.4, w: 0.98, y0: 0.3, y1: 1.04, nt: 3.6, nb: 3.6, wt: 0.86 },
    { x: 0.2, w: 0.95, y0: 0.3, y1: 0.98, nt: 3.6, nb: 3.6, wt: 0.86 },
    { x: 1.5, w: 1.0, y0: 0.3, y1: 1.06, nt: 3.4, nb: 3.6, wt: 0.84 },
    { x: 2.45, w: 1.12, y0: 0.3, y1: 1.2, nt: 4, nb: 3.4, wt: 0.8 },              // aile avant rehaussée en bossage
    { x: 3.5, w: 0.98, y0: 0.36, y1: 1.04, nt: 2.8, nb: 3, wt: 0.78 },
    { x: 4.0, w: 0.7, y0: 0.48, y1: 0.86, nt: 2.6, nb: 2.6, wt: 0.85 },
  ];
  L.loft(st, noir, { arches: L.arches(roues) });
  L.puits(roues, noirM);
  // capot à bossages : deux nervures longitudinales + creux central
  for (const s of [-1, 1]) ell(noir, 1.3, 0.1, 0.22, 2.75, L.hautAu(st, 2.75, 0.55) - 0.03, s * 0.55);
  // habitacle ouvert : cuve, sièges baquets, planche, volant
  o.boite(2.3, 0.05, 1.5, cuir, -0.35, 1.0, 0);
  for (const s of [-1, 1]) { o.boite(0.55, 0.16, 0.6, cuir, -0.75, 1.08, s * 0.38); o.boite(0.14, 0.34, 0.56, cuir, -1.06, 1.18, s * 0.38).rotation.z = 0.2; }
  o.boite(0.3, 0.16, 1.6, noirM, 0.82, 1.06, 0);
  o.cyl(0.13, 0.13, 0.04, arg, 0.62, 1.22, 0.38, 0, Math.PI / 2 - 0.4, 16);
  // double bulle transparente, armature chromée
  const bulle = vitre('#a9dcff', 0.45);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), bulle);
    b.scale.set(0.62, 0.39, 0.42); b.rotation.z = -0.15; b.position.set(0.55, 1.0, s * 0.4); o.ajouter(b);          // bulles abaissées (sommet ≤ 0,58 × W)
    tige([1.14, 1.02, s * 0.4], [0.75, 1.36, s * 0.4], 0.025, arg);
  }
  // antenne centrale derrière les sièges
  tige([-1.35, 1.05, 0], [-1.6, 1.95, 0], 0.04, arg); ell(arg, 0.08, 0.08, 0.08, -1.6, 1.97, 0);
  // ailerons arrière effilés posés sur les ailes, filet rouge sur la tranche
  for (const s of [-1, 1]) {
    const z = s * 0.82, y0 = L.hautAu(st, -2.4, 0.82) - 0.04;
    const f = h.plaque([[-1.2, y0], [-3.98, 1.56], [-4.06, 1.5], [-3.7, y0 - 0.02]], 0.1, noir, z, 0.03); f.rotation.x = s * 0.12;
    h.plaque([[-1.5, y0 + 0.08], [-3.95, 1.6], [-3.98, 1.57], [-1.5, y0 + 0.05]], 0.115, rouge, z, 0.005).rotation.x = s * 0.12;
    o.boite(0.08, 0.14, 0.3, lumRouge, -3.98, 0.82, s * 0.45);
    o.phares(3.86, 0.86, [s * 0.6], 0.14, lumBlanche);
  }
  // calandre noire et lame de pare-chocs chromée
  o.boite(0.1, 0.24, 0.8, noirM, 3.95, 0.66, 0); o.boite(0.06, 0.04, 0.85, rouge, 3.99, 0.8, 0);
  o.boite(0.12, 0.08, 1.3, arg, 3.9, 0.52, 0);
  // filets rouges : seuil, contours des passages de roues, ceinture, petit éclair générique
  const x0 = -4, x1 = 4, yb = 0.3, yt = 1.12, cw = 2048, ch = 288, C = L.carte(x0, x1, yb, yt, cw, ch);
  L.drapeFlancs(st, x0, x1, yb, yt, (g) => {
    g.strokeStyle = '#d2262e'; g.lineWidth = 6; g.lineCap = 'round';
    const ln = (xa, ya, xb, yb2) => { g.beginPath(); g.moveTo(C.X(xa), C.Y(ya)); g.lineTo(C.X(xb), C.Y(yb2)); g.stroke(); };
    g.lineWidth = 10; ln(-3.8, 0.5, 3.8, 0.5); g.lineWidth = 7; ln(-1.7, 0.86, 1.4, 0.86); ln(-3.85, 0.86, -3.2, 0.86); ln(3.2, 0.86, 3.85, 0.8);
    for (const r of roues) { g.beginPath(); g.ellipse(C.X(r.x), C.Y(r.RW), 0.7 * C.sx, 0.7 * C.sy, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); }
    emblemeAile(g, C.X(-0.1), C.Y(0.7), 40, '#d2262e');
    C.trouer(g, roues, 1.15);
  }, cw, ch, 0.022, roues);
  ajourerPneus(ctx.chassis, roues);                                       // filets drapés : rien dans la gomme
  const pt = { rayons: 'cinq', jante: '#d9dde4', flanc: '#d2262e', chrome: true, sansFrein: true };
  return { L: 8.1, largeur: 2.16, hauteur: 2.0, xAvant: 4.02, xArriere: -4.06,
    roues: [{ ...roues[0], ...pt }, { ...roues[1], avant: true, ...pt }], jante: '#d9dde4', flanc: '#d2262e' };
}

/* ------------------------------------------------------------------ B13 : voiture noire biomécanique, grande aile dorsale festonnée, côtes latérales, ouïes bleutées, roues à anneaux blancs */
function dorsalNoir(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, h = aide(ctx), { o, ell, plaque, vitre, emis, tige } = h, L = aideLoft(ctx);
  const noir = o.lac('#101116', 0.2, 0.3), noirM = o.mat('#0a0b0f', 0.55, 0.3), cote = o.lac('#24262e', 0.3, 0.5), bleu = emis('#46b4ff', 1.1);
  const xAr = -2.5, xAv = 2.6, RW = 0.56;
  const roues = [{ x: xAr, RW, ep: 0.64, z: 0.98 }, { x: xAv, RW, ep: 0.6, z: 0.98 }];
  // fuselage central : poupe en ogive, dos bombé, museau effilé
  const st = [
    { x: -3.95, w: 0.42, y0: 0.52, y1: 0.92, nt: 2.4, nb: 2.4, wt: 0.8 },
    { x: -3.2, w: 0.62, y0: 0.34, y1: 1.12, nt: 2.5, nb: 3, wt: 0.7 },
    { x: -1.8, w: 0.66, y0: 0.3, y1: 1.2, nt: 2.4, nb: 3.4, wt: 0.65 },
    { x: -0.6, w: 0.7, y0: 0.3, y1: 1.12, nt: 2.5, nb: 3.4, wt: 0.68 },
    { x: 0.9, w: 0.64, y0: 0.3, y1: 0.98, nt: 2.6, nb: 3.4, wt: 0.72 },
    { x: 2.5, w: 0.52, y0: 0.32, y1: 0.84, nt: 2.6, nb: 3, wt: 0.75 },
    { x: 3.7, w: 0.42, y0: 0.38, y1: 0.68, nt: 2.4, nb: 2.6, wt: 0.8 },
    { x: 4.12, w: 0.24, y0: 0.45, y1: 0.58, nt: 2.2, nb: 2.2, wt: 0.9 },
  ];
  L.loft(st, noir);
  // bas de caisse entre les roues, côtes diagonales en relief
  const sil = [
    { x: -1.85, w: 0.72, y0: 0.32, y1: 0.66, nt: 3, nb: 3 }, { x: -1.35, w: 1.02, y0: 0.3, y1: 0.86, nt: 2.8, nb: 3.4 },
    { x: 0.4, w: 0.96, y0: 0.3, y1: 0.8, nt: 2.8, nb: 3.4 }, { x: 1.6, w: 0.98, y0: 0.3, y1: 0.78, nt: 2.8, nb: 3.4 }, { x: 1.95, w: 0.7, y0: 0.34, y1: 0.62, nt: 3, nb: 3 },
  ];
  L.loft(sil, noir);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const xa = -1.25 + i * 0.36, xb = xa + 0.32;
      tige([xa, 0.4, s * 0.99], [xb, 0.84, s * 0.93], 0.055, cote);
    }
    // ailes-nacelles continues (photo : la tôle enveloppe chaque roue) : un fuseau par côté, centré sur le pneu,
    // creusé par le passage de roue (arche sur toute la largeur du fuseau) → coque qui coiffe le pneu sans le traverser
    const zP = s * 0.98, arP = roues.map((r) => ({ x: r.x, R: r.RW * 1.1 + 0.03, y: r.RW, zin: -1 }));
    const nAv = L.loft([
      { x: 1.35, w: 0.16, y0: 0.5, y1: 0.8, nt: 3, nb: 3 }, { x: 1.9, w: 0.3, y0: 0.38, y1: 1.12, nt: 3.6, nb: 3 },
      { x: 2.6, w: 0.32, y0: 0.3, y1: 1.32, nt: 4, nb: 3 }, { x: 3.35, w: 0.31, y0: 0.34, y1: 1.12, nt: 3.4, nb: 3 },
      { x: 3.85, w: 0.27, y0: 0.38, y1: 0.92, nt: 2.8, nb: 2.8 }, { x: 4.18, w: 0.16, y0: 0.46, y1: 0.74, nt: 2.4, nb: 2.4 }], noir, { nx: 70, ns: 32, arches: arP });
    nAv.position.z = zP;
    const nAr = L.loft([
      { x: -4.02, w: 0.14, y0: 0.62, y1: 1.02, nt: 2.6, nb: 2.6 }, { x: -3.55, w: 0.28, y0: 0.42, y1: 1.26, nt: 3.4, nb: 3 },
      { x: -2.5, w: 0.33, y0: 0.3, y1: 1.34, nt: 4, nb: 3 }, { x: -1.85, w: 0.3, y0: 0.36, y1: 1.12, nt: 3.6, nb: 3 },
      { x: -1.3, w: 0.16, y0: 0.5, y1: 0.8, nt: 3, nb: 3 }], noir, { nx: 70, ns: 32, arches: arP });
    nAr.position.z = zP;
    for (const r of roues) demiDisque(h, r.x, r.RW, r.RW + 0.04, r.RW * 0.8, 0.5, r.z - r.ep / 2 - 0.03, noirM, s);    // flasque sombre côté intérieur
    ell(bleu, 0.06, 0.12, 0.13, 4.17, 0.6, zP, false, 16);                                                   // ouïe bleutée au bout de la nacelle
    for (let k = -1; k <= 1; k++) o.boite(0.03, 0.2, 0.02, noirM, 4.22, 0.6, zP + k * 0.06);
    plaque([[-2.7, 1.12], [-3.6, 1.5], [-4.2, 1.72], [-3.95, 1.2], [-3.4, 1.05]], 0.08, noir, s * 0.98, 0.02);                 // aileron latéral
    o.boite(0.06, 0.12, 0.24, lumRouge, -3.98, 0.82, s * 0.98);
  }
  // grande aile dorsale festonnée (bord de fuite à trois festons) + nervures
  const dors = [[-0.9, 1.12], [-2.2, 1.7], [-3.25, 2.62], [-3.2, 2.2], [-3.55, 2.32], [-3.45, 1.95], [-3.85, 2.05], [-3.7, 1.6], [-3.98, 1.62], [-3.7, 1.05]];
  plaque(dors, 0.12, noir, 0, 0.03);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) tige([-1.3 - i * 0.5, 1.28 + i * 0.12, s * 0.075], [-3.2 + i * 0.12, 2.5 - i * 0.28, s * 0.075], 0.02, cote);
  // verrière claire
  const v = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), vitre('#8fb8d4', 0.85)); v.scale.set(0.8, 0.4, 0.44); v.position.set(0.1, 1.04, 0); o.ajouter(v);
  // museau : bec + phare central
  o.phares(4.05, 0.58, [0], 0.08, lumBlanche);
  const pt = { rayons: 'plein', lenticulaire: true, jante: '#15161b', flanc: '#f4f6fa', sansFrein: true };
  return { L: 8.3, largeur: 2.4, hauteur: 2.65, xAvant: 4.2, xArriere: -4.2,
    roues: [{ ...roues[0], ...pt }, { ...roues[1], avant: true, ...pt }], jante: '#15161b', flanc: '#f4f6fa' };
}

/* ------------------------------------------------------------------ B08 : longue voiture noire, ailes-nacelles enveloppantes, dôme de cockpit, ailerons festonnés, filets rouges */
function berlineAilee(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, h = aide(ctx), { o, ell, plaque, tige } = h, L = aideLoft(ctx);
  const noir = o.lac('#141519', 0.22, 0.3), noirM = o.mat('#0b0c10', 0.6, 0.3), rouge = o.mat('#d8262e', 0.35, 0.2), rougeE = h.emis('#ff3a2a', 0.8);
  const xAr = -2.45, xAv = 2.7, RWr = 0.62, RWv = 0.58;
  const roues = [{ x: xAr, RW: RWr, ep: 0.66, z: 1.0 }, { x: xAv, RW: RWv, ep: 0.56, z: 1.0 }];
  // fuselage central étroit : nez long et bas, bosse derrière le cockpit, poupe en ogive
  const st = [
    { x: -3.95, w: 0.5, y0: 0.5, y1: 0.98, nt: 2.6, nb: 2.6, wt: 0.8 },
    { x: -3.2, w: 0.64, y0: 0.34, y1: 1.16, nt: 2.6, nb: 3.2, wt: 0.7 },
    { x: -1.8, w: 0.66, y0: 0.3, y1: 1.26, nt: 2.4, nb: 3.4, wt: 0.62 },
    { x: -0.5, w: 0.68, y0: 0.3, y1: 1.04, nt: 2.6, nb: 3.4, wt: 0.7 },
    { x: 1.1, w: 0.66, y0: 0.3, y1: 0.9, nt: 2.6, nb: 3.4, wt: 0.75 },
    { x: 2.8, w: 0.76, y0: 0.32, y1: 0.86, nt: 3, nb: 3, wt: 0.8 },                  // long capot large qui soude les deux nacelles
    { x: 3.85, w: 0.72, y0: 0.38, y1: 0.74, nt: 3, nb: 2.6, wt: 0.85 },
    { x: 4.15, w: 0.56, y0: 0.44, y1: 0.62, nt: 2.6, nb: 2.2, wt: 0.9 },
  ];
  L.loft(st, noir);
  // bas de caisse large entre les roues (taille creusée au centre)
  const sil = [
    { x: -1.75, w: 0.7, y0: 0.32, y1: 0.62, nt: 3, nb: 3 }, { x: -1.3, w: 1.04, y0: 0.3, y1: 0.78, nt: 3, nb: 3.4 },
    { x: 0.2, w: 0.98, y0: 0.3, y1: 0.74, nt: 3, nb: 3.4 }, { x: 1.6, w: 1.0, y0: 0.3, y1: 0.76, nt: 3, nb: 3.4 }, { x: 2.0, w: 0.7, y0: 0.34, y1: 0.62, nt: 3, nb: 3 },
  ];
  L.loft(sil, noir);
  // ailes-nacelles : arc enveloppant chaque roue + nacelle de phare à l'avant + nacelle de feu à l'arrière
  for (const s of [-1, 1]) {
    // ailes-nacelles continues (photo : tôle enveloppante d'un seul tenant) : fuseau centré sur chaque file de roues,
    // creusé sur toute sa largeur par le passage de roue → la coque coiffe le pneu sans jamais le traverser
    const zP = s * 1.0, arP = roues.map((r) => ({ x: r.x, R: r.RW * 1.1 + 0.03, y: r.RW, zin: -1 }));
    const stAv = [
      { x: 1.5, w: 0.16, y0: 0.5, y1: 0.8, nt: 3, nb: 3 }, { x: 2.05, w: 0.29, y0: 0.38, y1: 1.18, nt: 3.6, nb: 3 },
      { x: 2.7, w: 0.31, y0: 0.3, y1: 1.38, nt: 4, nb: 3 }, { x: 3.45, w: 0.3, y0: 0.36, y1: 1.12, nt: 3.4, nb: 3 },
      { x: 3.9, w: 0.26, y0: 0.4, y1: 0.88, nt: 2.8, nb: 2.8 }, { x: 4.16, w: 0.16, y0: 0.46, y1: 0.7, nt: 2.4, nb: 2.4 }];
    const stAr = [
      { x: -4.0, w: 0.16, y0: 0.62, y1: 1.08, nt: 2.6, nb: 2.6 }, { x: -3.55, w: 0.3, y0: 0.42, y1: 1.34, nt: 3.4, nb: 3 },
      { x: -2.45, w: 0.35, y0: 0.3, y1: 1.46, nt: 4, nb: 3 }, { x: -1.75, w: 0.32, y0: 0.36, y1: 1.2, nt: 3.6, nb: 3 },
      { x: -1.2, w: 0.16, y0: 0.5, y1: 0.8, nt: 3, nb: 3 }];
    for (const stP of [stAv, stAr]) L.loft(stP, noir, { nx: 70, ns: 32, arches: arP }).position.z = zP;
    for (const [r, stP] of [[roues[0], stAr], [roues[1], stAv]]) {
      demiDisque(h, r.x, r.RW, r.RW + 0.04, r.RW * 0.8, 0.5, r.z - r.ep / 2 - 0.03, noirM, s);              // flasque sombre côté intérieur
      // liseré rouge qui suit la lèvre du passage de roue, posé sur le flanc du fuseau
      const Ra = r.RW * 1.1 + 0.07, pts = [];
      for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.08 + 0.84 * i / 16), x = r.x + Math.cos(a) * Ra, y = r.RW + Math.sin(a) * Ra; pts.push(new THREE.Vector3(x, y, zP + s * (L.flancAu(stP, x, y) + 0.004))); }
      L.ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.022, 6, false)), rouge));
    }
    o.phares(4.17, 0.6, [s * 1.0], 0.08, lumBlanche);
    o.boite(0.06, 0.12, 0.26, lumRouge, -3.98, 0.85, s * 1.0);
    // grand aileron festonné posé sur l'aile arrière + nervures + liseré rouge
    const ail = [[-1.75, 1.23], [-2.6, 1.55], [-3.95, 2.5], [-3.82, 2.12], [-3.55, 2.06], [-3.68, 1.78], [-3.4, 1.72], [-3.5, 1.42], [-3.2, 1.28]];   // arête basse relevée de 3 cm : dégage le haut du pneu arrière
    plaque(ail, 0.1, noir, s * 1.04, 0.03);
    for (let i = 0; i < 3; i++) tige([-2.3 - i * 0.45, 1.42 + i * 0.25, s * 1.11], [-3.7 + i * 0.12, 2.3 - i * 0.22, s * 1.11], 0.022, noirM);
    tige([-1.8, 1.24, s * 1.1], [-3.95, 2.5, s * 1.1], 0.018, rouge);
    // nacelle d'échappement rond sur le flanc (turbine latérale)
    o.cyl(0.2, 0.2, 0.12, noirM, -0.95, 0.56, s * 1.05, Math.PI / 2, 0, 20);
    o.cyl(0.13, 0.13, 0.13, o.mat('#2a2c33', 0.4, 0.6), -0.95, 0.56, s * 1.06, Math.PI / 2, 0, 16);
    const an = new THREE.Mesh(garde(new THREE.TorusGeometry(0.17, 0.018, 6, 24)), rouge); an.position.set(-0.95, 0.56, s * 1.12); o.ajouter(an);
    // ouïes du bas de caisse
    for (let i = 0; i < 5; i++) o.boite(0.05, 0.22, 0.04, noirM, 0.25 + i * 0.18, 0.55, s * 0.99);
  }
  // dôme de cockpit sombre à liseré rouge
  const dome = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), L.vitre('#0b0d12', 0.97)); dome.scale.set(0.95, 0.45, 0.5); dome.position.set(-0.55, 1.0, 0); o.ajouter(dome);
  const ceint = new THREE.Mesh(garde(new THREE.TorusGeometry(1, 0.03, 6, 40)), rouge); ceint.scale.set(0.96, 0.51, 1); ceint.rotation.x = Math.PI / 2; ceint.position.set(-0.55, 1.01, 0); o.ajouter(ceint);
  o.boite(0.5, 0.05, 0.42, rouge, -0.6, 1.02, 0);
  // museau : prise d'air noire + liseré, tuyère arrière
  o.boite(0.1, 0.16, 0.42, noirM, 4.08, 0.52, 0);
  o.cyl(0.3, 0.32, 0.22, noirM, -3.94, 0.78, 0, 0, Math.PI / 2, 22); o.cyl(0.2, 0.2, 0.24, rougeE, -3.96, 0.78, 0, 0, Math.PI / 2, 18);
  // filets rouges : capot (deux lignes convergentes) et ceinture du fuselage
  L.drapeDessus(st, 0.2, 4.1, -0.62, 0.62, (g, cw, ch) => {
    g.strokeStyle = '#d8262e'; g.lineWidth = 7; g.lineCap = 'round';
    for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(0, ch / 2 + sg * ch * 0.38); g.quadraticCurveTo(cw * 0.6, ch / 2 + sg * ch * 0.32, cw * 0.97, ch / 2 + sg * ch * 0.08); g.stroke(); }
  }, 1024, 256);
  const x0 = -1.8, x1 = 2.05, C = L.carte(x0, x1, 0.3, 0.8, 1024, 160);
  L.drapeFlancs(sil, x0, x1, 0.3, 0.8, (g) => { g.strokeStyle = '#d8262e'; g.lineWidth = 6; g.beginPath(); g.moveTo(C.X(-1.4), C.Y(0.7)); g.lineTo(C.X(1.65), C.Y(0.7)); g.stroke(); }, 1024, 160);
  const pt = { rayons: 'cinq', jante: '#26282f', flanc: '#d8262e', sansFrein: true };
  return { L: 8.2, largeur: 2.3, hauteur: 2.55, xAvant: 4.18, xArriere: -4.0,
    roues: [{ ...roues[0], ...pt }, { ...roues[1], avant: true, ...pt }], jante: '#26282f', flanc: '#d8262e' };
}

/* ------------------------------------------------------------------ pièces communes B06 / B09 / B10 */
/** Segment d'anneau (garde-boue en arc) autour de (cx, cy), épaisseur en z = larg, centré en z. */
function arcPlate(h, cx, cy, rIn, rOut, a0, a1, larg, m, z, bis = 0.03) {
  const pts = [], n = 18;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut]); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn]); }
  return h.plaque(pts, larg, m, z, bis);
}
/** Demi-disque (carénage intérieur de roue) de rayon r autour de (cx, cy), fond plat yBas, entre z0 et z1 (côté s). */
function demiDisque(h, cx, cy, r, yBas, z0, z1, m, s) {
  const pts = [[cx - r, yBas]];
  for (let i = 0; i <= 18; i++) { const a = Math.PI - Math.PI * i / 18; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  pts.push([cx + r, yBas]);
  return h.plaque(pts, z1 - z0, m, s * (z0 + z1) / 2, 0.025);
}
/** Plaque vue de dessus (x, z), épaisseur ep vers le haut depuis y0, avec pente (dy/dx) autour de xRef. */
function planche(h, ptsXZ, ep, m, y0, pente = 0, xRef = 0) {
  const { THREE, o, garde } = h, s = new THREE.Shape();
  ptsXZ.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + y0 + pente * (p.getX(i) - xRef));
  g.computeVertexNormals();
  return o.ajouter(new THREE.Mesh(garde(g), m));
}


/* ------------------------------------------------------------------ blindés massifs B06 / B09 / B10 (refonte QA : coque continue) */
/** Convertit un tableau compact [x, y0, yS, yB, yT, cr, wB, w, wT] en stations de coque. */
const stn = (t) => t.map(([x, y0, yS, yB, yT, cr, wB, w, wT]) => ({ x, y0, yS, yB, yT, cr, wB, w, wT }));
/** Passages de roues pour la coque : rayon de dégagement et paroi intérieure juste à l'intérieur du pneu. */
const archesDe = (roues) => roues.map((r) => ({ x: r.x, R: r.RW * 1.08 + 0.05, y: r.RW, zin: r.z - r.ep / 2 - 0.035 }));
/** Matériau facetté (clone à ombrage plat) pour les petites pièces taillées. */
const plat = (m) => { const c = m.clone(); c.flatShading = true; c.needsUpdate = true; return c; };
/** Doublure sombre des passages de roues (arc épais derrière le pneu, visible dans l'interstice). */
function doublure(h, r, m) {
  for (const s of [-1, 1]) arcPlate(h, r.x, r.RW, r.RW + 0.04, r.RW * 1.08 + 0.05, -0.05, Math.PI + 0.05, r.ep + 0.04, m, s * r.z, 0.0);
}
/** Turbine arrière : anneau sombre + disque incandescent. */
function turbine(h, ctx, x, y, r, hex) {
  const { o, emis } = h;
  o.cyl(r * 1.18, r * 1.25, 0.3, o.mat('#15161a', 0.5, 0.6), x + 0.1, y, 0, 0, Math.PI / 2, 20);
  o.cyl(r, r, 0.08, emis(hex, 1.2), x - 0.06, y, 0, 0, Math.PI / 2, 20);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; o.boite(0.06, r * 1.9, 0.04, o.mat('#2a2b30', 0.5, 0.5), x - 0.1, y, 0).rotation.x = a; }
}


/* B06 : blindé noir très large, énormes roues arrière coiffées, long capot bas en éperon, verrière en dôme, grande aile dorsale */
function blindeLarge(ctx) {
  const { lumBlanche, lumRouge } = ctx, h = aide(ctx), { o, plaque, tige, decal } = h;
  const corps = o.lac('#2d2e33', 0.42, 0.38), panneau = o.lac('#3f4148', 0.5, 0.35), noirM = o.mat('#0e0f12', 0.7, 0.25), arg = o.mat('#8c929c', 0.3, 0.8);
  const pt = { rayons: 'cinq', jante: '#2a2c33', flanc: null, sansFrein: true };
  const R = [{ x: -3.25, RW: 0.84, ep: 0.95, z: 1.35, ...pt }, { x: 2.7, RW: 0.72, ep: 0.62, z: 1.24, avant: true, ...pt }];
  coqueFacettes(ctx, stn([
    [-4.18, 0.95, 1.05, 1.72, 1.84, 0.0, 0.9, 1.3, 1.0],
    [-3.9, 0.56, 0.8, 1.9, 2.0, 0.03, 1.1, 1.84, 1.5],
    [-3.25, 0.55, 0.86, 1.96, 2.06, 0.04, 1.15, 1.86, 1.52],
    [-2.35, 0.52, 0.8, 1.84, 1.96, 0.04, 1.15, 1.82, 1.45],
    [-1.6, 0.5, 0.7, 1.52, 1.7, 0.05, 1.0, 1.32, 1.05],
    [1.35, 0.5, 0.68, 1.44, 1.6, 0.05, 1.0, 1.3, 1.02],
    [1.95, 0.5, 0.72, 1.58, 1.64, 0.03, 1.0, 1.52, 1.2],
    [2.7, 0.5, 0.78, 1.72, 1.78, 0.03, 1.0, 1.58, 1.26],
    [3.5, 0.52, 0.72, 1.45, 1.5, 0.14, 0.95, 1.52, 1.1],
    [4.32, 0.62, 0.7, 0.92, 0.98, 0.1, 0.6, 0.86, 0.6]]), corps, { arches: archesDe(R) });
  for (const r of R) doublure(h, r, noirM);
  // éperon central sous le nez + bouche sombre
  coqueFacettes(ctx, stn([[4.0, 0.5, 0.56, 0.8, 0.9, 0.04, 0.4, 0.62, 0.3], [4.75, 0.58, 0.6, 0.66, 0.7, 0, 0.06, 0.1, 0.04]]), plat(panneau), { nx: 10 });
  o.boite(0.06, 0.18, 1.1, noirM, 4.33, 0.82, 0);
  // capot : bossage central à facettes et prise d'air
  coqueFacettes(ctx, stn([[0.9, 1.5, 1.52, 1.66, 1.74, 0, 0.5, 0.62, 0.42], [3.4, 1.32, 1.34, 1.48, 1.52, 0, 0.36, 0.46, 0.3]]), plat(panneau), { nx: 12 });
  o.boite(1.0, 0.06, 0.5, noirM, 2.3, 1.6, 0);
  // échine arrière + verrière en dôme fumé
  coqueFacettes(ctx, stn([[-4.0, 1.76, 1.78, 2.0, 2.1, 0, 0.55, 0.8, 0.65], [-1.3, 1.62, 1.64, 1.98, 2.08, 0, 0.5, 0.66, 0.5], [-0.5, 1.58, 1.6, 1.7, 1.76, 0, 0.36, 0.45, 0.3]]), plat(panneau), { nx: 30 });
  coqueFacettes(ctx, stn([
    [-0.75, 1.58, 1.6, 1.76, 1.84, 0, 0.44, 0.58, 0.44],
    [-0.1, 1.58, 1.62, 1.98, 2.1, 0.03, 0.52, 0.72, 0.56],
    [0.6, 1.56, 1.6, 1.9, 2.0, 0.02, 0.48, 0.66, 0.5],
    [1.2, 1.54, 1.56, 1.62, 1.66, 0, 0.36, 0.4, 0.24]]), o.verre, { nx: 24 });
  // grande aile dorsale en flèche, plus haute et plus large que celle du B09, volets latéraux tombants
  planche(h, [[-4.35, -1.45], [-4.35, 1.45], [-3.2, 1.3], [-2.0, 0.9], [-0.45, 0.24], [-0.45, -0.24], [-2.0, -0.9], [-3.2, -1.3]], 0.16, plat(corps), 2.48, 0.0);
  for (const s of [-1, 1]) {
    plaque([[-4.35, 2.56], [-4.35, 1.85], [-3.75, 1.98], [-3.35, 2.48]], 0.12, plat(panneau), s * 1.4, 0.03);   // volets de bout d'aile
    plaque([[-3.5, 2.0], [-3.6, 2.53], [-2.5, 2.53], [-2.1, 2.0]], 0.14, panneau, s * 0.66, 0.02);              // jambes d'aile
    plaque([[2.2, 1.66], [3.3, 1.76], [3.95, 2.08], [4.45, 1.5], [4.38, 0.95], [4.05, 1.0], [3.95, 1.45], [3.5, 1.34]], 0.16, plat(panneau), s * 1.38, 0.03);   // griffes d'ailes avant (arceau en crochet)
    // panneau de ponton en retrait + ouïes, bas de caisse biseauté
    o.boite(2.7, 0.5, 0.04, panneau, -0.1, 1.1, s * 1.315);
    for (let i = 0; i < 5; i++) o.boite(0.07, 0.34, 0.05, noirM, -1.1 + i * 0.18, 1.1, s * 1.33);
    o.phares(4.28, 0.9, [s * 0.55], 0.08, lumBlanche);
    o.boite(0.06, 0.12, 0.5, lumRouge, -4.2, 1.5, s * 0.8);
  }
  decal((g, cw, ch, px) => { g.strokeStyle = '#4c4f58'; g.lineWidth = 4; g.beginPath(); g.moveTo(px(0.02), ch * 0.2); g.lineTo(px(0.55), ch * 0.2); g.lineTo(px(0.62), ch * 0.7); g.lineTo(px(0.98), ch * 0.7); g.stroke(); }, 2.9, 0.6, -0.1, 1.4, 1.335);
  // petite mitrailleuse de toit
  o.boite(0.42, 0.18, 0.26, plat(panneau), -0.3, 2.19, 0); o.cyl(0.05, 0.05, 1.0, arg, 0.35, 2.21, 0, 0, Math.PI / 2, 10);
  tige([-0.3, 2.1, 0], [-0.4, 1.98, 0], 0.06, noirM);
  turbine(h, ctx, -4.2, 1.4, 0.28, '#ff6a1a');
  // plafond réel (chantier V5) : Batmobile de tournage basse et très large ; rapport pavillon / largeur hors tout ≈ 0,71
  return { L: 9.1, largeur: 3.72, hauteur: 2.66, xAvant: 4.75, xArriere: -4.35, roues: R, jante: '#2a2c33', flanc: null, plafond: 0.71 };
}


/* B10 : blindé noir laqué haut et massif, ailes arrière profondes, ailerons dorsaux, mécanique chromée apparente, pneus crantés */
function blindeNoirMassif(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx, h = aide(ctx), { o, plaque, tige, decal } = h;
  const noir = o.lac('#1d1e23', 0.24, 0.35), gris = o.lac('#30323a', 0.34, 0.35), noirM = o.mat('#0b0c0f', 0.7, 0.2), chrome = o.mat('#d4d8de', 0.16, 1.0);
  const pt = { rayons: 'six', jante: '#24252b', flanc: null, sansFrein: true };
  const R = [{ x: -2.7, RW: 0.82, ep: 0.92, z: 1.36, ...pt }, { x: 2.6, RW: 0.78, ep: 0.82, z: 1.41, avant: true, ...pt }];
  coqueFacettes(ctx, stn([
    [-4.02, 0.9, 1.05, 1.66, 1.8, 0.0, 0.9, 1.36, 1.1],
    [-3.62, 0.6, 0.9, 1.92, 2.02, 0.04, 1.1, 1.88, 1.5],
    [-2.7, 0.6, 0.95, 1.96, 2.06, 0.05, 1.2, 1.9, 1.54],
    [-1.8, 0.58, 0.9, 1.84, 1.98, 0.05, 1.2, 1.86, 1.46],
    [-1.2, 0.55, 0.8, 1.56, 1.76, 0.06, 1.05, 1.42, 1.12],
    [1.5, 0.55, 0.78, 1.46, 1.64, 0.06, 1.05, 1.38, 1.08],
    [2.0, 0.55, 0.82, 1.62, 1.7, -0.1, 1.1, 1.84, 1.4],
    [2.6, 0.55, 0.88, 1.76, 1.82, -0.3, 1.1, 1.88, 1.46],
    [3.4, 0.6, 0.86, 1.56, 1.62, -0.32, 1.0, 1.82, 1.3],
    [4.2, 0.7, 0.8, 1.1, 1.2, -0.04, 0.8, 1.2, 0.8]]), noir, { arches: archesDe(R) });
  for (const r of R) doublure(h, r, noirM);
  // habitacle haut et anguleux (toit plat, pare-brise couché), vitres en fentes
  coqueFacettes(ctx, stn([
    [-1.4, 1.72, 1.74, 2.06, 2.16, 0, 0.9, 1.1, 0.92],
    [0.2, 1.62, 1.66, 2.02, 2.14, 0.02, 0.9, 1.1, 0.9],
    [1.35, 1.58, 1.6, 1.78, 1.84, 0.02, 0.84, 0.96, 0.72],
    [2.15, 1.6, 1.62, 1.66, 1.7, 0, 0.5, 0.58, 0.32]]), plat(noir), { nx: 30 });
  for (const s of [-1, 1]) o.boite(1.15, 0.16, 0.03, o.verre, -0.5, 1.9, s * 1.105);                  // vitres latérales en fente
  const pb = o.boite(1.0, 0.03, 1.2, o.verre, 0.78, 2.0, 0); pb.rotation.z = -Math.atan2(0.3, 1.15);  // pare-brise couché
  // pont arrière : fosse sombre et mécanique chromée apparente
  o.boite(1.5, 0.08, 0.95, noirM, -2.25, 2.06, 0);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) o.cyl(0.11, 0.11, 0.3, chrome, -2.85 + i * 0.36, 2.18, s * 0.22, 0, 0, 12);
  o.cyl(0.13, 0.13, 1.4, chrome, -2.25, 2.15, 0, 0, Math.PI / 2, 14);
  o.boite(0.4, 0.2, 0.55, chrome, -1.65, 2.15, 0);
  // ailerons dorsaux en lames inclinées vers l'arrière + crête centrale
  for (const s of [-1, 1]) {
    plaque([[-3.95, 1.92], [-3.45, 2.84], [-3.1, 2.8], [-2.2, 2.27], [-1.9, 2.02]], 0.12, plat(noir), s * 0.72, 0.03);
    plaque([[-3.9, 1.74], [-3.45, 2.26], [-2.6, 2.14], [-2.4, 1.99]], 0.1, plat(gris), s * 1.6, 0.02);              // ailettes d'ailes arrière
    // flanc : grande ouïe avec turbine chromée
    o.boite(1.2, 0.5, 0.05, noirM, -0.55, 1.18, s * 1.42);
    o.cyl(0.2, 0.2, 0.9, chrome, -0.55, 1.18, s * 1.4, 0, Math.PI / 2, 16);
    for (let i = 0; i < 5; i++) o.cyl(0.225, 0.225, 0.04, gris, -0.95 + i * 0.2, 1.18, s * 1.4, 0, Math.PI / 2, 16);
    // lames d'ailes avant (crête au-dessus des roues avant)
    plaque([[1.7, 1.68], [2.4, 2.0], [3.3, 1.82], [3.95, 1.28], [3.4, 1.52], [2.4, 1.76]], 0.1, plat(noir), s * 1.76, 0.03);
    o.phares(4.15, 1.08, [s * 0.58], 0.09, lumBlanche);
    o.boite(0.06, 0.12, 0.42, lumRouge, -4.04, 1.6, s * 0.85);
    o.boite(0.55, 0.08, 0.05, gris, 3.86, 1.05, s * 1.3);                                   // liseré de bouclier, en avant du passage de roue
  }
  plaque([[-3.0, 2.04], [-2.75, 2.49], [-1.95, 2.26], [-1.75, 2.09]], 0.1, plat(gris), 0, 0.02);
  // museau : calandre sombre et lame basse
  o.boite(0.08, 0.3, 1.0, noirM, 4.18, 0.98, 0);
  coqueFacettes(ctx, stn([[3.9, 0.52, 0.58, 0.78, 0.84, 0, 0.9, 1.05, 0.8], [4.35, 0.56, 0.6, 0.7, 0.74, 0, 0.6, 0.72, 0.5]]), plat(noirM), { nx: 8 });
  decal((g, cw, ch, px) => { g.strokeStyle = '#3c3f48'; g.lineWidth = 5; g.beginPath(); g.moveTo(px(0.03), ch * 0.75); g.lineTo(px(0.35), ch * 0.75); g.lineTo(px(0.45), ch * 0.3); g.lineTo(px(0.97), ch * 0.3); g.stroke(); }, 2.6, 0.56, 0.2, 1.16, 1.385);
  turbine(h, ctx, -4.03, 1.4, 0.3, '#ff6a1a');
  return { L: 8.37, largeur: 3.8, hauteur: 2.86, xAvant: 4.35, xArriere: -4.02, roues: R, jante: '#24252b', flanc: '#4a4d57' };
}

/* B09 : blindé gris acier massif, verrière ambrée, canon sur tourelle, grande aile dorsale, griffes avant */
function blindeCanon(ctx) {
  const { lumBlanche, lumRouge } = ctx, h = aide(ctx), { o, plaque, tige, emis, decal } = h;
  const corps = o.lac('#62656e', 0.34, 0.55), sombre = o.lac('#45484f', 0.4, 0.5), noirM = o.mat('#111216', 0.65, 0.3), arg = o.mat('#9ea4ae', 0.28, 0.85);
  const ambre = ctx.garde(new ctx.THREE.MeshPhysicalMaterial({ color: new ctx.THREE.Color('#e9c52a').convertSRGBToLinear(), roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88, flatShading: true, clearcoat: 1, envMap: ctx.envMap, envMapIntensity: 1.2 }));
  const pt = { rayons: 'cinq', jante: '#121317', flanc: '#e3c04a', sansFrein: true };
  const R = [{ x: -2.75, RW: 0.8, ep: 0.8, z: 1.29, ...pt }, { x: 3.2, RW: 0.76, ep: 0.64, z: 1.2, avant: true, ...pt }];
  // coque continue : poupe haute qui coiffe les grosses roues arrière, pontons pleins, ailes avant, éperon
  coqueFacettes(ctx, stn([
    [-4.02, 0.95, 1.05, 1.36, 1.5, 0.0, 0.85, 1.15, 0.9],
    [-3.7, 0.6, 0.8, 1.66, 1.78, 0.03, 1.05, 1.66, 1.3],
    [-2.75, 0.55, 0.82, 1.78, 1.88, 0.04, 1.15, 1.7, 1.36],
    [-1.85, 0.52, 0.78, 1.62, 1.76, 0.04, 1.15, 1.65, 1.28],
    [-1.3, 0.5, 0.66, 1.36, 1.56, 0.05, 1.0, 1.27, 1.0],
    [1.7, 0.5, 0.66, 1.32, 1.48, 0.05, 1.0, 1.25, 0.98],
    [2.3, 0.5, 0.72, 1.48, 1.56, 0.03, 1.05, 1.5, 1.15],
    [3.2, 0.52, 0.8, 1.66, 1.72, 0.03, 1.05, 1.55, 1.22],
    [3.8, 0.56, 0.78, 1.48, 1.54, 0.02, 0.95, 1.5, 1.1],
    [4.1, 0.6, 0.76, 1.22, 1.3, 0.02, 0.6, 1.0, 0.7],
    [4.5, 0.68, 0.74, 0.92, 0.98, 0.0, 0.16, 0.26, 0.12]]), corps, { arches: archesDe(R) });
  for (const r of R) doublure(h, r, noirM);
  // échine dorsale qui porte l'aile + cockpit
  coqueFacettes(ctx, stn([
    [-3.9, 1.44, 1.46, 1.8, 1.92, 0, 0.5, 0.75, 0.6],
    [-1.2, 1.44, 1.46, 1.76, 1.88, 0, 0.45, 0.62, 0.48],
    [-0.2, 1.42, 1.44, 1.56, 1.62, 0, 0.35, 0.45, 0.3]]), sombre, { nx: 30 });
  coqueFacettes(ctx, stn([                                                          // verrière ambrée facettée
    [-0.35, 1.42, 1.44, 1.58, 1.66, 0, 0.4, 0.52, 0.38],
    [0.25, 1.42, 1.46, 1.78, 1.9, 0.02, 0.44, 0.6, 0.46],
    [1.25, 1.38, 1.4, 1.46, 1.5, 0, 0.34, 0.36, 0.2]]), ambre, { nx: 24 });
  // grande aile dorsale en flèche, bord de fuite épais (bloc de poupe)
  planche(h, [[-4.15, -1.22], [-4.15, 1.22], [-2.9, 1.1], [-1.6, 0.62], [-0.75, 0.3], [-0.75, -0.3], [-1.6, -0.62], [-2.9, -1.1]], 0.16, plat(corps), 2.0, 0.0);
  planche(h, [[-4.15, -1.22], [-4.15, 1.22], [-3.6, 1.18], [-3.6, -1.18]], 0.3, plat(sombre), 1.72, 0.0);
  for (const s of [-1, 1]) {
    plaque([[-4.1, 2.12], [-4.25, 2.56], [-3.75, 2.24], [-3.3, 2.12]], 0.1, sombre, s * 1.12, 0.02);           // cornes de bout d'aile
    plaque([[-3.2, 1.74], [-3.4, 2.04], [-2.6, 2.04], [-2.2, 1.76]], 0.12, sombre, s * 0.62, 0.02);              // jambes d'aile
    // griffes avant : lames verticales qui prolongent les ailes en éperon
    plaque([[3.75, 1.4], [3.9, 1.8], [4.3, 1.5], [4.32, 1.0], [4.15, 1.05]], 0.18, plat(sombre), s * 1.4, 0.04);
    // panneaux sombres creusés sur les pontons + ouïes
    o.boite(2.6, 0.42, 0.04, sombre, 0.25, 1.0, s * 1.255);
    for (let i = 0; i < 4; i++) o.boite(0.08, 0.3, 0.05, noirM, -0.6 + i * 0.2, 1.0, s * 1.27);
    const ph = o.phares(4.25, 1.0, [s * 0.66], 0.08, lumBlanche);
    o.boite(0.06, 0.12, 0.42, lumRouge, -4.04, 1.42, s * 0.62);
  }
  decal((g, cw, ch, px) => { g.strokeStyle = '#3e4048'; g.lineWidth = 5; g.beginPath(); g.moveTo(px(0.05), ch * 0.25); g.lineTo(px(0.4), ch * 0.25); g.lineTo(px(0.5), ch * 0.6); g.lineTo(px(0.95), ch * 0.6); g.stroke(); }, 3.2, 0.6, 0.3, 1.25, 1.275);
  // tourelle + canon long vers l'avant
  coqueFacettes(ctx, stn([[-0.75, 1.7, 1.75, 2.08, 2.18, 0, 0.2, 0.27, 0.17], [0.3, 1.7, 1.75, 2.06, 2.14, 0, 0.18, 0.25, 0.15]]), plat(sombre), { nx: 8 });
  o.cyl(0.075, 0.075, 1.9, arg, 1.2, 2.11, 0, 0, Math.PI / 2 - 0.06, 12);                          // fût légèrement relevé
  o.cyl(0.13, 0.13, 0.5, sombre, 0.4, 2.07, 0, 0, Math.PI / 2 - 0.06, 12);
  o.cyl(0.1, 0.1, 0.16, noirM, 2.12, 2.17, 0, 0, Math.PI / 2 - 0.06, 12);
  tige([-0.1, 1.5, 0.18], [-0.2, 1.75, 0.12], 0.05, noirM); tige([-0.1, 1.5, -0.18], [-0.2, 1.75, -0.12], 0.05, noirM);
  // mécanique du pont avant (blocs taillés)
  o.boite(1.1, 0.18, 0.75, plat(sombre), 2.2, 1.58, 0); o.boite(0.6, 0.14, 0.4, arg, 2.25, 1.7, 0);
  turbine(h, ctx, -4.03, 1.22, 0.24, '#ffb13d');
  return { L: 8.65, largeur: 3.4, hauteur: 2.6, xAvant: 4.5, xArriere: -4.15, roues: R, jante: '#121317', flanc: '#e3c04a' };
}

/* ------------------------------------------------------------------ B07 : hélicoptère requin noir à verrière jaune, ailes jaunes, rotor gris */
function helicoNoir(ctx) {
  const { THREE, lumBlanche, lumRouge, animes, garde } = ctx, h = aide(ctx), { o, ell, plaque, vitre, tige } = h;
  const noir = o.lac('#14151b', 0.18, 0.5), gris = o.mat('#a9b3bd', 0.35, 0.6), jaune = o.lac('#e8b400', 0.3, 0.05), noirM = o.mat('#0c0d11', 0.6, 0.3), arg = o.mat('#9aa1ae', 0.3, 0.85);
  // fuselage en goutte, museau effilé vers +x
  ell(noir, 2.0, 0.78, 0.78, 0.6, 1.2, 0);
  ell(noir, 1.0, 0.5, 0.55, 2.2, 1.05, 0);                                                           // museau
  ell(noir, 1.1, 0.4, 0.5, -0.5, 1.62, 0);                                                           // capot moteur
  // verrière jaune à facettes
  const facette = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#e8a000').convertSRGBToLinear(), roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.92, flatShading: true, envMap: ctx.envMap, envMapIntensity: 1.4, clearcoat: 1 }));
  const verr = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2)), facette); verr.scale.set(1.5, 0.74, 0.68); verr.position.set(1.0, 1.38, 0); o.ajouter(verr);
  // poutre de queue effilée, relevée
  const poutre = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.09, 0.34, 3.4, 12)), noir); poutre.rotation.z = Math.PI / 2 + 0.07; poutre.position.set(-2.4, 1.45, 0); o.ajouter(poutre);
  // dérive verticale en nageoire de requin + stabilisateurs
  plaque([[-3.0, 1.45], [-3.5, 2.5], [-3.9, 2.6], [-4.15, 1.5], [-3.9, 1.35]], 0.1, noir, 0, 0.02);
  plaque([[-3.1, 1.4], [-3.7, 1.15], [-4.05, 1.2], [-3.9, 1.45]], 1.1, noir, 0, 0.02);
  // rotor anti-couple : couronne + pales animées
  const couronne = new THREE.Mesh(garde(new THREE.TorusGeometry(0.42, 0.05, 8, 24)), noirM); couronne.position.set(-3.75, 1.85, 0.1); o.ajouter(couronne);
  const rAr = new THREE.Group(); rAr.position.set(-3.75, 1.85, 0.14); o.ajouter(rAr);
  for (let i = 0; i < 2; i++) { const pa = new THREE.Mesh(garde(new THREE.BoxGeometry(0.78, 0.07, 0.015)), gris); pa.rotation.z = i * Math.PI / 2; rAr.add(pa); }
  rAr.add(new THREE.Mesh(garde(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10)), arg)); rAr.children[2].rotation.x = Math.PI / 2;
  // mât et rotor principal
  o.cyl(0.14, 0.18, 0.7, noirM, 0.3, 2.05, 0, 0, 0, 12);
  o.cyl(0.2, 0.2, 0.12, gris, 0.3, 2.45, 0, 0, 0, 14);
  const rotor = new THREE.Group(); rotor.position.set(0.3, 2.55, 0); o.ajouter(rotor);
  const lame = new THREE.Mesh(garde(new THREE.BoxGeometry(7.4, 0.05, 0.32)), gris); lame.rotation.x = 0.05; rotor.add(lame);
  const moy = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 14)), gris); rotor.add(moy);
  // ailes/skis jaunes plats sous le fuselage (en plan : pointe vers l'avant)
  const sh = new THREE.Shape(); [[2.1, 0], [0.9, 1.0], [-0.1, 1.85], [-1.3, 1.85], [-1.0, 0.7], [-1.4, 0], [-1.0, -0.7], [-1.3, -1.85], [-0.1, -1.85], [0.9, -1.0]].forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z))); sh.closePath();
  const gAile = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); gAile.rotateX(Math.PI / 2);
  const aile = new THREE.Mesh(garde(gAile), jaune); aile.position.set(0, 0.7, 0); o.ajouter(aile);
  // trains : trois petites roues noires + nacelles grises
  for (const [x, z] of [[1.4, 0], [-0.7, 0.75], [-0.7, -0.75]]) { o.cyl(0.19, 0.19, 0.18, noirM, x, 0.2, z, Math.PI / 2, 0, 14); tige([x, 0.25, z], [x, 0.7, z], 0.045, noirM); }
  for (const s of [-1, 1]) { o.cyl(0.11, 0.11, 1.0, arg, 2.05, 0.92, s * 0.5, 0, Math.PI / 2, 10); ell(noir, 0.5, 0.28, 0.3, 0.4, 0.88, s * 0.62); }
  // phare et ailettes latérales
  o.phares(2.95, 1.05, [0], 0.12, lumBlanche);
  o.boite(0.6, 0.06, 0.4, jaune, -0.5, 1.12, 0.78); o.boite(0.6, 0.06, 0.4, jaune, -0.5, 1.12, -0.78);
  animes.push((t, dt) => { rotor.rotation.y += dt * 32; rAr.rotation.z += dt * 40; });
  return { L: 8.2, largeur: 1.8, hauteur: 2.85, xAvant: 3.1, xArriere: -4.15, roues: [] };
}

/* ------------------------------------------------------------------ B11 : berline de police blanche, bandes bleues, toit ouvrant noir (photos : ni rampe ni pare-buffle) */
function policeBerline(ctx) {
  const { lumBlanche, lumRouge } = ctx, h = aide(ctx), { o } = h, L = aideLoft(ctx);
  const blanc = o.lac('#f3f5f8', 0.18, 0.1), noir = o.mat('#15161b', 0.5, 0.3), noirB = o.lac('#101218', 0.1, 0.4);
  const RW = 0.52, xAr = -2.3, xAv = 2.35;
  const roues = [{ x: xAr, RW, ep: 0.56, z: 0.89 }, { x: xAv, RW, ep: 0.52, z: 0.89 }];         // pneus à fleur de l'aile
  // caisse : capot plongeant, ailes gonflées au droit des essieux, flancs creusés, poupe haute et carrée
  const st = [
    { x: -3.56, w: 0.98, y0: 0.42, y1: 1.18, nt: 4, nb: 3.4, wt: 0.92 },
    { x: -3.3, w: 1.06, y0: 0.34, y1: 1.24, nt: 4, nb: 3.6, wt: 0.9 },
    { x: -2.3, w: 1.15, y0: 0.32, y1: 1.22, nt: 4.4, nb: 3.8, wt: 0.88 },
    { x: -1.1, w: 1.06, y0: 0.32, y1: 1.16, nt: 4, nb: 3.8, wt: 0.9 },
    { x: 0.6, w: 1.06, y0: 0.32, y1: 1.14, nt: 4, nb: 3.8, wt: 0.9 },
    { x: 2.35, w: 1.12, y0: 0.32, y1: 1.24, nt: 3.8, nb: 3.6, wt: 0.86 },          // aile avant rehaussée : le pneu ne crève plus le capot
    { x: 3.3, w: 1.04, y0: 0.36, y1: 1.06, nt: 3.2, nb: 3.2, wt: 0.86 },
    { x: 3.6, w: 0.92, y0: 0.44, y1: 0.9, nt: 3, nb: 3, wt: 0.9 },
  ];
  L.loft(st, blanc, { arches: L.arches(roues) });
  L.puits(roues, noir);
  // pavillon vitré en retrait (tumblehome) + toit blanc + montants
  // barème « tolérance zéro » : pavillon bas (sommet 1,62 ≤ 0,66 × W) et large (toit ≈ 80 % de la caisse), faible tumblehome
  // plafond réel (chantier V5, Crown Victoria 0,745) : pavillon remonté de 12 cm (vitrages, toit et montants), plus d'écrasement moteur
  const dT = 0.12;
  const gh = [
    { x: -2.55, w: 0.94, y0: 1.0, y1: 1.18, nt: 4, nb: 2, wt: 0.92 },
    { x: -1.55, w: 0.96, y0: 1.0, y1: 1.52 + dT, nt: 4, nb: 2, wt: 0.92 },
    { x: -0.4, w: 0.97, y0: 1.0, y1: 1.55 + dT, nt: 4, nb: 2, wt: 0.92 },
    { x: 0.7, w: 0.96, y0: 1.0, y1: 1.52 + dT, nt: 4, nb: 2, wt: 0.92 },
    { x: 1.65, w: 0.94, y0: 0.98, y1: 1.1, nt: 4, nb: 2, wt: 0.92 },
  ];
  L.loft(gh, L.vitre('#0c111c', 0.96));
  const toit = [
    { x: -1.62, w: 0.86, y0: 1.44, y1: 1.54, nt: 4, nb: 2, wt: 0.95 }, { x: -0.4, w: 0.9, y0: 1.44, y1: 1.56, nt: 4, nb: 2, wt: 0.95 }, { x: 0.68, w: 0.86, y0: 1.44, y1: 1.54, nt: 4, nb: 2, wt: 0.95 },
  ].map((s) => ({ ...s, y0: s.y0 + dT, y1: s.y1 + dT }));
  L.loft(toit, blanc, { nx: 50 });
  o.boite(1.0, 0.03, 0.56, noirB, -0.45, L.hautAu(toit, -0.45, 0.28) + 0.004, 0);                                // toit ouvrant
  montant(ctx, L, gh, 0.22, 1.04, 0.18, 1.5 + dT, 0.06, blanc);                                                 // montant central
  montant(ctx, L, gh, -2.42, 1.16, -1.5, 1.46 + dT, 0.09, blanc);                                              // custode
  montant(ctx, L, gh, 1.58, 1.04, 0.68, 1.48 + dT, 0.05, blanc);                                                 // montant de pare-brise
  // face avant : calandre noire large à cadre chrome, phares effilés, bouclier sculpté
  o.boite(0.08, 0.22, 1.2, noir, 3.6, 0.82, 0); o.boite(0.09, 0.03, 1.22, o.chrome, 3.62, 0.94, 0); o.boite(0.09, 0.22, 0.03, o.chrome, 3.62, 0.82, 0);
  o.boite(0.08, 0.12, 1.1, noir, 3.56, 0.52, 0);
  for (const s of [-1, 1]) {
    const ph = o.boite(0.1, 0.07, 0.36, lumBlanche, 3.5, 0.88, s * 0.7); ph.rotation.y = s * 0.35;
    o.boite(0.06, 0.12, 0.42, lumRouge, -3.56, 1.06, s * 0.6);
    o.boite(0.16, 0.06, 0.1, blanc, 1.25, 1.18, s * 1.04);                                                   // rétroviseurs
    o.boite(0.12, 0.1, 0.06, noir, 1.25, 1.24, s * 1.09);
    o.boite(0.08, 0.04, 0.2, blanc, 1.25, 1.17, s * 0.95);                                                   // bras de rétro jusqu'au vitrage resserré
  }
  o.boite(0.06, 0.08, 1.4, lumRouge, -3.57, 1.06, 0);                                                        // bandeau de feux
  o.boite(0.3, 0.04, 1.5, blanc, -3.4, 1.26, 0).rotation.z = 0.15;                                          // becquet de malle
  // livrée : bande bleue basse épaisse + filet, mot générique, petit écusson, numéro
  const x0 = -3.6, x1 = 3.65, yb = 0.32, yt = 1.24, cw = 2048, ch = 280, C = L.carte(x0, x1, yb, yt, cw, ch);
  L.drapeFlancs(st, x0, x1, yb, yt, (g) => {
    g.fillStyle = '#1452c4'; g.fillRect(C.X(-3.5), C.Y(0.86), C.X(3.45) - C.X(-3.5), C.Y(0.74) - C.Y(0.86));
    g.fillRect(C.X(-3.5), C.Y(1.02), C.X(3.45) - C.X(-3.5), C.Y(0.98) - C.Y(1.02));
    g.fillStyle = '#0d1018'; g.textAlign = 'center'; g.font = '900 64px Arial Black, Arial, sans-serif'; g.fillText('METROPOLE', C.X(0.1), C.Y(0.9));
    g.fillStyle = '#1452c4'; g.font = '700 28px Arial, sans-serif'; g.fillText('POLICE', C.X(1.6), C.Y(1.05));
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(C.X(1.65), C.Y(0.8), 22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1f6fd0'; g.beginPath(); g.arc(C.X(1.65), C.Y(0.8), 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d1018'; g.font = '700 26px Arial, sans-serif'; g.fillText('1827', C.X(-3.05), C.Y(1.05));
    g.strokeStyle = 'rgba(40,44,56,0.55)'; g.lineWidth = 3;                                                  // joints de portes
    for (const x of [1.45, -0.36, -1.95]) { g.beginPath(); g.moveTo(C.X(x), C.Y(1.18)); g.lineTo(C.X(x - 0.05), C.Y(0.45)); g.stroke(); }
    C.trouer(g, roues, 1.12);
  }, cw, ch, 0.022, roues);
  ajourerPneus(ctx.chassis, roues);                                       // décor drapé : rien dans la gomme
  const pt = { rayons: 'cinq', jante: '#16171c', sansFrein: true };
  return { L: 7.2, largeur: 2.24, hauteur: 1.64, xAvant: 3.62, xArriere: -3.58,
    roues: [{ ...roues[0], ...pt }, { ...roues[1], avant: true, ...pt }], jante: '#16171c', flanc: null,
    plafond: 0.745 };                                                                                      // berline de police type Crown Victoria P71 : 1 481 / 1 987 mm
}

/* ------------------------------------------------------------------ B12 : pick-up violet surbaissé, losanges verts, compresseur chromé derrière la cabine, liserés dorés */
function pickupFarceur(ctx) {
  const { lumBlanche, lumRouge } = ctx, h = aide(ctx), { o, ell, tige } = h, L = aideLoft(ctx);
  const violet = o.lac('#5a2a9e', 0.2, 0.15), sombre = o.lac('#4a1f86', 0.3, 0.2), noirM = o.mat('#0e0e13', 0.6, 0.3), rougeB = o.mat('#a3141c', 0.5, 0.2), chromeM = o.chrome;
  const xAr = -2.3, xAv = 2.45, RWr = 0.6, RWv = 0.54;
  const roues = [{ x: xAr, RW: RWr, ep: 0.6, z: 0.92 }, { x: xAv, RW: RWv, ep: 0.52, z: 0.92 }];   // pneus à fleur de l'aile
  // caisse : poupe arrondie, ailes gonflées, taille creusée, long capot plongeant
  const st = [
    { x: -3.68, w: 0.96, y0: 0.52, y1: 1.2, nt: 3.4, nb: 3, wt: 0.88 },
    { x: -3.3, w: 1.08, y0: 0.4, y1: 1.26, nt: 3.6, nb: 3.4, wt: 0.88 },
    { x: -2.3, w: 1.19, y0: 0.38, y1: 1.26, nt: 4.4, nb: 3.6, wt: 0.86 },
    { x: -1.1, w: 1.07, y0: 0.38, y1: 1.24, nt: 3.8, nb: 3.6, wt: 0.88 },
    { x: 0.5, w: 1.06, y0: 0.38, y1: 1.23, nt: 3.8, nb: 3.6, wt: 0.88 },
    { x: 1.6, w: 1.1, y0: 0.38, y1: 1.2, nt: 3.6, nb: 3.6, wt: 0.86 },
    { x: 2.45, w: 1.16, y0: 0.38, y1: 1.26, nt: 4.4, nb: 3.4, wt: 0.84 },             // aile avant rehaussée (le pneu ne crève plus le capot)
    { x: 3.3, w: 1.06, y0: 0.42, y1: 1.0, nt: 3.2, nb: 3, wt: 0.84 },
    { x: 3.72, w: 0.86, y0: 0.52, y1: 0.8, nt: 2.6, nb: 2.6, wt: 0.88 },
  ];
  L.loft(st, violet, { arches: L.arches(roues) });
  L.puits(roues, noirM);
  o.boite(4.6, 0.08, 1.4, rougeB, 0, 0.4, 0);                                                                 // châssis rouge sous la caisse
  // benne : plancher en creux + rebords arrondis + hayon
  o.boite(2.6, 0.04, 1.7, sombre, -2.2, 1.275, 0);
  for (const s of [-1, 1]) { const r = L.loft([{ x: -3.5, w: 0.09, y0: 1.22, y1: 1.4 }, { x: -2.2, w: 0.1, y0: 1.24, y1: 1.42 }, { x: -0.9, w: 0.09, y0: 1.22, y1: 1.4 }], violet, { nx: 30, ns: 20 }); r.position.z = s * 0.9; }
  L.loft([{ x: -3.6, w: 0.88, y0: 1.14, y1: 1.38, nt: 3 }, { x: -3.42, w: 0.9, y0: 1.14, y1: 1.4, nt: 3 }], violet, { nx: 12 });
  // cabine chopée (barème « tolérance zéro ») : vitrage vert teinté bas, toit large ≈ 80 % de la caisse, faible tumblehome
  const gh = [
    { x: -0.95, w: 0.9, y0: 1.04, y1: 1.24, nt: 4, nb: 2, wt: 0.92 }, { x: -0.6, w: 0.94, y0: 1.04, y1: 1.58, nt: 4, nb: 2, wt: 0.94 },
    { x: 0.5, w: 0.94, y0: 1.04, y1: 1.6, nt: 4, nb: 2, wt: 0.94 }, { x: 1.85, w: 0.92, y0: 1.02, y1: 1.16, nt: 4, nb: 2, wt: 0.92 },
  ];
  L.loft(gh, L.vitre('#2f9e5c', 0.9));
  L.loft([{ x: -0.72, w: 0.87, y0: 1.48, y1: 1.58, nt: 4, wt: 0.95 }, { x: 0.1, w: 0.91, y0: 1.51, y1: 1.62, nt: 4, wt: 0.95 }, { x: 0.82, w: 0.87, y0: 1.48, y1: 1.58, nt: 4, wt: 0.95 }], violet, { nx: 40 });
  montant(ctx, L, gh, -0.98, 1.08, -0.66, 1.5, 0.08, violet);
  montant(ctx, L, gh, 1.8, 1.06, 0.82, 1.5, 0.05, violet);
  // compresseur chromé débordant derrière la cabine : bloc, pipes, turbine, bouche d'admission
  o.boite(0.8, 0.3, 0.8, noirM, -1.35, 1.41, 0);
  o.cyl(0.26, 0.26, 0.8, chromeM, -1.35, 1.68, 0, Math.PI / 2, 0, 20);
  o.boite(0.42, 0.2, 0.36, chromeM, -1.35, 1.91, 0);
  for (const z of [-0.1, 0.1]) o.cyl(0.08, 0.1, 0.26, chromeM, -1.3, 2.11, z, 0, 0, 12);
  for (const z of [-0.33, -0.11, 0.11, 0.33]) tige([-1.7, 1.51, z], [-1.95, 1.91, z * 1.35], 0.045, chromeM);
  // capot : deux écopes, phares, calandre
  for (const s of [-1, 1]) {
    const y = L.hautAu(st, 2.9, s * 0.42);
    o.boite(0.7, 0.1, 0.24, violet, 2.85, y + 0.02, s * 0.42); o.boite(0.08, 0.07, 0.18, noirM, 3.2, y + 0.04, s * 0.42);
    o.phares(3.62, 0.78, [s * 0.66], 0.1, lumBlanche);
    o.boite(0.06, 0.16, 0.3, lumRouge, -3.66, 1.0, s * 0.62);
  }
  o.boite(0.08, 0.12, 0.9, noirM, 3.74, 0.66, 0);
  // livrée : losanges vert/violet sombre en bas de flanc, mot générique, bulle « BANG! »
  const x0 = -3.7, x1 = 3.75, yb = 0.38, yt = 1.28, cw = 2048, ch = 270, C = L.carte(x0, x1, yb, yt, cw, ch);
  L.drapeFlancs(st, x0, x1, yb, yt, (g) => {
    g.save(); g.beginPath(); g.rect(C.X(-3.45), C.Y(1.12), C.X(1.4) - C.X(-3.45), C.Y(0.46) - C.Y(1.12)); g.clip();
    const d = 0.26;
    for (let i = 0; i < 40; i++) for (let j = 0; j < 8; j++) {
      const cx = C.X(-3.5 + i * d + (j % 2) * d / 2), cy = C.Y(0.46 + j * d * 0.5);
      g.fillStyle = j % 2 ? '#2f8f55' : '#2c135a';
      g.beginPath(); g.moveTo(cx, cy - d * 0.5 * C.sy); g.lineTo(cx + d * 0.5 * C.sx, cy); g.lineTo(cx, cy + d * 0.5 * C.sy); g.lineTo(cx - d * 0.5 * C.sx, cy); g.closePath(); g.fill();
    }
    g.restore();
    g.textAlign = 'center'; g.font = '900 92px Arial Black, Arial, sans-serif'; g.lineWidth = 9; g.strokeStyle = '#1d0c3d'; g.fillStyle = '#f2c230';
    g.strokeText('FARCE', C.X(-0.6), C.Y(0.66)); g.fillText('FARCE', C.X(-0.6), C.Y(0.66));
    g.fillStyle = '#f4f6fa'; g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.ellipse(C.X(1.0), C.Y(0.98), 58, 30, -0.15, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#111'; g.font = '900 30px Arial Black, Arial, sans-serif'; g.fillText('BANG!', C.X(1.0), C.Y(0.98) + 10);
    C.trouer(g, roues, 1.12);
  }, cw, ch, 0.022, roues);
  ajourerPneus(ctx.chassis, roues);                                       // décor drapé : rien dans la gomme
  const pt = { rayons: 'cinq', jante: '#16171c', flanc: '#e8c24a', sansFrein: true };
  return { L: 7.45, largeur: 2.32, hauteur: 2.25, xAvant: 3.75, xArriere: -3.7,
    roues: [{ ...roues[0], ...pt }, { ...roues[1], avant: true, ...pt }], jante: '#16171c', flanc: '#e8c24a' };
}

export const GROUPE_1 = { B01: cabrioletAilerons, B06: blindeLarge, B07: helicoNoir, B08: berlineAilee, B09: blindeCanon, B10: blindeNoirMassif, B11: policeBerline, B12: pickupFarceur, B13: dorsalNoir };
