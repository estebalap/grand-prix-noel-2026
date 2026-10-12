import { outils } from './outils.js';
import { aide } from './aide_2.js';

/** Place les roues d'un essieu à partir de la demi-largeur de caisse (pneu à ras, légèrement proéminent). */
function essieu(x, RW, ep, wCaisse, extra = {}) { return { x, RW, ep, z: wCaisse - ep / 2 + 0.04, y: RW, ...extra }; }

/**
 * Règles d'atelier (châssis) appliquées à des stations de loft :
 * bosses d'ailes au droit de chaque essieu (la caisse coiffe le haut des pneus), taille resserrée au niveau des portières,
 * tumblehome des épaules (wt : le haut du flanc rentre vers l'intérieur). Des stations sont ajoutées autour des essieux
 * pour que les bosses restent localisées.
 */
function sculpter(a, ST0, R, { bosse = 0.1, taille = 0.05, wt = 0.84, nt } = {}) {
  const st = ST0.map((s) => ({ ...s })), x0 = st[0].x, x1 = st[st.length - 1].x;
  for (const r of R) for (const d of (r.etal ? [-2.2, -1.5, -0.75, 0, 0.75, 1.5, 2.2] : [-1.35, -0.7, 0, 0.7, 1.35])) {
    const x = r.x + d * r.RW;
    if (x > x0 + 0.08 && x < x1 - 0.08 && !st.some((s) => Math.abs(s.x - x) < 0.12)) {
      const v = a.stAt(ST0, x); st.push({ x, w: v.w, y0: v.y0, y1: v.y1, nt: v.nt, nb: v.nb });
    }
  }
  st.sort((p, q) => p.x - q.x);
  const xs = R.map((r) => r.x), xm = (Math.max(...xs) + Math.min(...xs)) / 2, demi = (Math.max(...xs) - Math.min(...xs)) / 2;
  return st.map((s, i) => {
    let w = s.w;
    const bout = i === 0 || i === st.length - 1;
    if (!bout) for (const r of R) { const d = (s.x - r.x) / (r.RW * (r.etal ?? 1.2)); w += (r.bosse ?? bosse) * Math.exp(-d * d); }   // etal : étalement de la bosse (épaules longues)
    const dm = (s.x - xm) / (demi * 0.5); w -= taille * Math.exp(-dm * dm);
    return { ...s, w, wt: s.wt ?? wt, ...(nt ? { nt: s.nt ?? nt } : {}) };
  });
}
/** Règles d'atelier (roues) : pneu posé au ras de l'aile, dépassant légèrement (decal) sans traverser la caisse. */
function poser(a, ST, R, decal = 0.05) { for (const r of R) { r.z = a.largeurAu(ST, r.x) - r.ep / 2 + decal; r.y = r.RW; } return R; }
/** Pavillon : rétrécit des stations d'habitacle (tumblehome du vitrage et du toit). */
const cabine = (STx, k) => STx.map((s) => ({ ...s, w: s.w * k }));
/** Demi-largeur maximale d'un jeu de stations. */
const wMax = (ST) => Math.max(...ST.map((s) => s.w));
/** Texte de flanc (option parCote) : centré en (cx, cy) et remis à l'endroit sur le flanc −z (sg < 0), dont le canvas est vu en miroir. */
function texteFlanc(g, t, cx, cy, sg, trait) {
  g.save(); g.translate(cx, cy); if (sg < 0) g.scale(-1, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (trait) { g.lineJoin = 'round'; g.lineWidth = trait.l; g.strokeStyle = trait.c; g.strokeText(t, 0, 0); }
  g.fillText(t, 0, 0); g.restore();
}

/* ---------------------------------------------------------------- B14 : longue GT bleu nuit à double dérive */
function b14(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = aide(ctx), a = o;
  const nuit = o.pein('#18214f', 0.2), bleuC = o.pein('#24346f', 0.25), mat = o.mate('#10121c', 0.7, 0.2);
  // jantes chromées pleines, anneau blanc sur le flanc (photos) ; gros boudins
  const R = [{ x: 2.5, RW: 0.6, ep: 0.56, avant: true, jante: '#d9dde5', rayons: 'plein', flanc: '#f4f6fa' },
             { x: -2.45, RW: 0.66, ep: 0.72, avant: false, jante: '#d9dde5', rayons: 'plein', flanc: '#f4f6fa' }];
  const ST0 = [
    { x: -4.0, w: 0.5, y0: 0.55, y1: 0.95 }, { x: -3.7, w: 0.8, y0: 0.4, y1: 1.15 }, { x: -3.0, w: 1.0, y0: 0.3, y1: 1.45 },
    { x: -2.4, w: 1.02, y0: 0.3, y1: 1.5 }, { x: -1.5, w: 0.98, y0: 0.3, y1: 1.2 }, { x: -0.4, w: 0.9, y0: 0.3, y1: 1.02 },
    { x: 0.8, w: 0.88, y0: 0.3, y1: 1.0 }, { x: 1.8, w: 0.98, y0: 0.3, y1: 1.35 }, { x: 2.5, w: 1.02, y0: 0.3, y1: 1.45 },
    { x: 3.2, w: 0.92, y0: 0.3, y1: 1.25 }, { x: 3.7, w: 0.68, y0: 0.38, y1: 0.95 }, { x: 4.05, w: 0.35, y0: 0.45, y1: 0.7 }];
  const ST = sculpter(a, ST0, R, { bosse: 0.1, taille: 0.06, wt: 0.8 }); poser(a, ST, R);
  a.loft(ST, nuit, { arches: a.arches(R) });
  a.puits(R, mat, ST);
  // pont noir brillant : capot, cockpit et dos
  a.drapeDessus(ST, -3.7, 3.9, -1.05, 1.05, (g, w, h) => {
    const X = (x) => (x + 3.7) / 7.6 * w, Z = (z) => (z + 1.05) / 2.1 * h;
    g.fillStyle = '#080a16'; g.beginPath(); g.moveTo(X(-3.6), Z(-0.25)); g.lineTo(X(-2.6), Z(-0.62)); g.lineTo(X(-0.4), Z(-0.62)); g.lineTo(X(2.4), Z(-0.6)); g.lineTo(X(3.7), Z(-0.28)); g.lineTo(X(3.8), Z(0)); g.lineTo(X(3.7), Z(0.28)); g.lineTo(X(2.4), Z(0.6)); g.lineTo(X(-0.4), Z(0.62)); g.lineTo(X(-2.6), Z(0.62)); g.lineTo(X(-3.6), Z(0.25)); g.closePath(); g.fill();
    g.strokeStyle = '#9fb6ff'; g.lineWidth = 3; g.setLineDash([14, 9]); g.beginPath(); g.moveTo(X(-3.4), Z(-0.6)); g.lineTo(X(3.5), Z(-0.52)); g.moveTo(X(-3.4), Z(0.6)); g.lineTo(X(3.5), Z(0.52)); g.stroke();
  }, 1536, 384);
  // flancs : panneau clair strié de lames blanches
  const yb = 0.3, yt = 1.5, x0 = -4.0, x1 = 4.05, cv = a.carte(x0, x1, yb, yt, 2048, 300);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g, w, h) => {
    g.fillStyle = '#2c3f8a'; g.beginPath(); g.moveTo(cv.X(-3.3), cv.Y(0.75)); g.lineTo(cv.X(3.3), cv.Y(0.78)); g.lineTo(cv.X(3.35), cv.Y(0.42)); g.lineTo(cv.X(-3.3), cv.Y(0.42)); g.closePath(); g.fill();
    g.strokeStyle = '#f2f5ff'; g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const x = -1.35 + i * 0.26; g.beginPath(); g.moveTo(cv.X(x), cv.Y(0.5)); g.lineTo(cv.X(x + 0.28), cv.Y(0.72)); g.stroke(); }
    g.lineWidth = 5; g.beginPath(); g.moveTo(cv.X(-3.3), cv.Y(0.45)); g.lineTo(cv.X(3.3), cv.Y(0.45)); g.stroke();
    cv.trouer(g, R);
  }, 2048, 300, 0.022, true);
  // verrière bulle
  const bulle = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 28, 14)), o.verre); bulle.scale.set(1.15, 0.45, 0.72); bulle.position.set(-0.3, 1.0, 0); o.ajouter(bulle);
  // double dérive crantée
  // bord d'attaque courbe balayé vers l'arrière, bord de fuite festonné de trois échancrures
  const forme = new THREE.Shape(); forme.moveTo(-2.35, 1.25); forme.quadraticCurveTo(-2.95, 1.55, -3.55, 2.55); forme.lineTo(-3.85, 2.75);
  forme.quadraticCurveTo(-3.62, 2.3, -3.78, 2.12); forme.lineTo(-3.95, 2.2); forme.quadraticCurveTo(-3.72, 1.8, -3.9, 1.64); forme.lineTo(-4.02, 1.7);
  forme.quadraticCurveTo(-3.86, 1.4, -3.98, 1.2); forme.closePath();
  for (const sg of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(forme, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    const m = new THREE.Mesh(ctx.garde(g), bleuC); m.position.z = sg * 0.46 - 0.05; m.rotation.x = sg * -0.1; o.ajouter(m); a.acc(m);   // dérive = accessoire (hors pavillon)
  }
  // face avant : calandre à lames blanches, phares, feux
  for (let i = 0; i < 6; i++) o.boite(0.06, 0.2, 0.05, o.chrome, 3.98 - i * 0.02, 0.58, -0.3 + i * 0.12).rotation.z = 0.2;
  o.phares(3.55, 0.78, [-0.52, 0.52], 0.16, lumBlanche);
  for (const sg of [-1, 1]) o.boite(0.06, 0.12, 0.3, lumRouge, -3.93, 0.9, sg * 0.35);
  // barème « Tolérance zéro » (cat. A) : ailes et capot abaissés au-dessus des arches, caisse et voies élargies, pneus à fleur
  const sz = 1.1; a.rabaisser([[1.05, 1.05], [1.5, 1.47]], sz); a.voies(R, sz, -0.012);
  a.degager(R);                                                                                      // Brief 10 : arches recoupées, ailes au-dessus des pneus
  return { L: 8.1, largeur: 2 * wMax(ST) * sz, hauteur: 3.2, xAvant: 4.05, xArriere: -4.0, roues: R };
}


/* ---------------------------------------------------------------- B15 / B16 : blindés angulaires (deux silhouettes distinctes) */
/** Tige cylindrique entre deux points 3D (bras de suspension, arceaux). */
function tige(ctx, o, p, q, r, mat) {
  const { THREE } = ctx, a = new THREE.Vector3(...p), b = new THREE.Vector3(...q), d = b.clone().sub(a);
  const m = new THREE.Mesh(ctx.garde(new THREE.CylinderGeometry(r, r, d.length(), 6)), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.userData.tige = true;                                            // tige : jamais déformée par degager (rejoint le moyeu)
  return o.ajouter(m);
}
/**
 * Blindé « tumbler » à facettes (B15, B16) : coque basse continue en plans biseautés, verrière à pans inclinés,
 * deux tours arrière massives à volets relevés, gros pods de roues avant en éperon reliés par des triangles ouverts,
 * casquettes facettées au-dessus des grosses roues arrière, plaques d'armure latérales, tuyère centrale.
 * Proportions mesurées sur la photo de profil : L/H ≈ 3,1 ; empattement ≈ 0,78 L ; R arrière ≈ 0,094 L, R avant ≈ 0,077 L.
 */
function tumbler(ctx, v) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a;
  const caisse = v.caisse, armure = v.armure, vt = v.verre, acier = a.mate('#3c3f48', 0.45, 0.7);
  const M = v.massif || 0, dy = 0.2 * M, dz = 0.1 * M;                 // massif : coque centrale plus haute et plus large (B15)
  const xAv = 2.85, xAr = -3.1, RAv = 0.6, RAr = v.RAr, zAv = 1.15, zAr = 1.17;
  const R = [{ x: xAv, RW: RAv, ep: 0.6, z: zAv, y: RAv, avant: true, jante: v.jante, rayons: v.rayons, flanc: v.flanc },
             { x: xAr, RW: RAr, ep: v.epAr, z: zAr, y: RAr, avant: false, jante: v.jante, rayons: v.rayons, flanc: v.flanc }];
  // coque basse : sections octogonales chanfreinées (arrière étroit entre les grosses roues, nez long et bas)
  a.facettes([
    a.octo(-3.82, 0.5, 0.5, 0.56, 1.0, 0.46, 1.4, 0.1),
    a.octo(-3.45, 0.58, 0.42, 0.66, 1.2, 0.56, 1.7),
    a.octo(-2.35, 0.62, 0.38, 0.72, 1.3 + dy * 0.6, 0.62, 1.78 + dy * 0.8),
    a.octo(-1.7, 0.76 + dz, 0.36, 0.9 + dz * 1.2, 1.3 + dy * 0.6, 0.74 + dz * 0.6, 1.78 + dy),
    a.octo(0.6, 0.76 + dz, 0.36, 0.9 + dz * 1.2, 1.25 + dy * 0.6, 0.72 + dz * 0.6, 1.68 + dy),
    a.octo(1.6, 0.7 + dz * 0.8, 0.38, 0.82 + dz, 1.05 + dy * 0.5, 0.62 + dz * 0.4, 1.3 + dy * 0.6),
    a.octo(2.4, 0.6, 0.42, 0.66, 0.9, 0.52, 1.05),
    a.octo(3.8, 0.44, 0.5, 0.48, 0.64, 0.36, 0.72, 0.08)], caisse);
  // verrière à pans vitrés (teinte de la photo), toit noir et montants
  // pavillon large (barème : vraie surface plate posée sur les épaules, tumblehome faible)
  a.facettes([a.octo(-1.05, 0.72 + dz * 0.6, 1.7 + dy, 0.7 + dz * 0.6, 1.95 + dy, 0.62 + dz * 0.5, 2.1 + dy, 0.04), a.octo(0.35, 0.7 + dz * 0.6, 1.62 + dy, 0.68 + dz * 0.6, 1.92 + dy, 0.6 + dz * 0.5, 2.08 + dy, 0.04), a.octo(1.35, 0.6, 1.3 + dy * 0.6, 0.56, 1.42 + dy * 0.6, 0.44, 1.46 + dy * 0.6, 0.04)], vt);
  a.facettes([a.octo(-1.1, 0.68 + dz * 0.6, 1.9 + dy, 0.71 + dz * 0.6, 2.02 + dy, 0.62 + dz * 0.5, 2.17 + dy, 0.03), a.octo(0.42, 0.66 + dz * 0.6, 1.88 + dy, 0.69 + dz * 0.6, 2.0 + dy, 0.6 + dz * 0.5, 2.15 + dy, 0.03), a.octo(0.85, 0.58, 1.7 + dy, 0.6, 1.78 + dy, 0.48, 1.9 + dy, 0.03)], caisse);
  for (const sg of [-1, 1]) {
    tige(ctx, o, [1.35, 1.44 + dy * 0.6, sg * 0.44], [0.45, 2.08 + dy, sg * (0.6 + dz * 0.5)], 0.05, caisse);   // montants de pare-brise
    tige(ctx, o, [-0.35, 1.7 + dy, sg * (0.71 + dz * 0.6)], [-0.3, 2.05 + dy, sg * (0.64 + dz * 0.5)], 0.045, caisse);  // montant central
    tige(ctx, o, [1.35, 1.44 + dy * 0.6, 0], [0.45, 2.1 + dy, 0], 0.035, caisse);
  }
  // tours arrière massives (poupe) avec rampe vers la verrière et volets aérodynamiques relevés
  for (const sg of [-1, 1]) {
    const T = (x, y0, yt, w) => a.decaler(a.octo(x, w, y0, w * 1.08, y0 + (yt - y0) * 0.7, w * 0.7, yt, 0.06), sg * 0.4);
    a.facettes([T(-3.75, 1.2, 2.05, 0.3), T(-3.3, 1.4, v.hTour, 0.34), T(-1.6, 1.4, v.hTour - 0.05, 0.34), T(-1.05, 1.6, 1.95, 0.3)], caisse);
    const vol = o.boite(0.75, 0.06, 0.5, caisse, -3.25, v.hTour + 0.22, sg * 0.4); vol.rotation.z = -0.55;    // volet relevé
    a.acc(vol, tige(ctx, o, [-2.95, v.hTour, sg * 0.4], [-3.15, v.hTour + 0.2, sg * 0.4], 0.04, acier));      // accessoires : suivent la tour abaissée
    // plaques d'armure latérales en coin (flancs pleins jusqu'au bas de caisse)
    const P = (x, k) => ({ x, pts: [[sg * (0.84 + dz), 0.42], [sg * (0.86 + dz + (0.18 + dz) * k), 0.58], [sg * (0.86 + dz + (0.14 + dz) * k), 1.15 + dy * 0.5], [sg * (0.84 + dz), 1.3 + dy * 0.6]] });
    a.facettes([P(-1.75, 0.2), P(-1.4, 1), P(-0.55, 1.15), P(-0.25, 0.3)], armure);              // deux plaques séparées par une encoche en V
    a.facettes([P(-0.1, 0.3), P(0.25, 1.05), P(1.0, 0.85), P(1.5, 0.2)], armure);
    const S = (x, k, y0, y1) => ({ x, pts: [[sg * (0.8 + dz), y0 + dy * 0.6], [sg * (0.82 + dz * 1.4 + 0.12 * k), y0 + 0.06 + dy * 0.6], [sg * (0.78 + dz * 1.4 + 0.1 * k), y1 + dy * 0.7], [sg * (0.74 + dz), y1 + 0.04 + dy * 0.7]] });
    a.facettes([S(-2.2, 0.2, 1.32, 1.6), S(-1.9, 1, 1.32, 1.62), S(-0.9, 1, 1.3, 1.58), S(-0.5, 0.2, 1.28, 1.5)], caisse);   // épaulière haute en saillie
    // armure de poupe : reste à l'intérieur de la face interne du gros pneu arrière (aucune collision)
    const Q = (x, k) => ({ x, pts: [[sg * 0.62, 1.3], [sg * (0.64 + 0.12 * k), 1.36], [sg * (0.6 + 0.1 * k), 1.66], [sg * 0.56, 1.72]] });
    a.facettes([Q(-3.35, 0.2), Q(-3.0, 1), Q(-2.3, 1), Q(-1.95, 0.2)], armure);
    // pods avant en éperon : coque facettée au-dessus du pneu avant (jamais à travers), joue intérieure pleine
    const zP = sg * zAv, D = (x, y0, ys, yt, w) => a.decaler(a.octo(x, w, y0, w * 1.08, ys, w * 0.75, yt, 0.07), zP);
    a.facettes([D(2.0, 0.98, 1.2, 1.3, 0.3), D(2.45, 1.22, 1.42, 1.52, 0.38), D(xAv, 1.22, 1.43, 1.52, 0.38), D(3.25, 1.2, 1.42, 1.5, 0.38), D(3.72, 0.78, 1.04, 1.14, 0.36), D(3.98, 0.7, 0.86, 0.92, 0.26)], caisse);
    // triangles avant ouverts : bras supérieur et inférieur du moyeu vers la coque
    if (M) {                                                         // triangles de suspension OUVERTS bien visibles : haut et bas en V, porte-moyeu, combiné ressort
      for (const [ya, yb2, yh] of [[0.46, 0.44, 0.48], [1.0, 0.92, 0.86]]) {
        tige(ctx, o, [2.3, ya, sg * 0.6], [2.85, yh, sg * 0.84], 0.06, acier); tige(ctx, o, [3.4, yb2, sg * 0.44], [2.85, yh, sg * 0.84], 0.06, acier);
      }
      tige(ctx, o, [2.85, 0.44, sg * 0.84], [2.85, 0.9, sg * 0.84], 0.07, acier);
      tige(ctx, o, [2.75, 0.55, sg * 0.78], [2.6, 1.2, sg * 0.6], 0.09, a.mate('#8a2028', 0.4, 0.5));
    } else {
      tige(ctx, o, [2.4, 0.95, sg * 0.66], [2.85, 0.62, sg * 0.82], 0.055, acier);
      tige(ctx, o, [3.3, 0.85, sg * 0.5], [2.85, 0.62, sg * 0.82], 0.055, acier);
    }
    tige(ctx, o, [2.3, 1.0, sg * 0.66], [2.6, 1.3, sg * 0.86], 0.06, caisse);
    tige(ctx, o, [3.2, 0.78, sg * 0.46], [3.2, 1.3, sg * 0.86], 0.06, caisse);
    // casquettes facettées au-dessus des roues arrière
    const C = (x, y0, yt, w) => a.decaler(a.octo(x, w, y0, w * 1.06, y0 + (yt - y0) * 0.6, w * 0.8, yt, 0.06), sg * zAr);
    const yC = RAr * 2 + 0.07;
    a.facettes([C(-3.9, 1.0, 1.25, 0.3), C(-3.55, yC - 0.06, yC + 0.2, 0.44), C(xAr, yC - 0.06, yC + 0.21, 0.44), C(-2.65, yC - 0.06, yC + 0.22, 0.44), C(-2.25, 1.1, 1.38, 0.32)], caisse).userData.fixe = true;   // reste au ras du pneu
    // feux : barrettes avant dans le nez, feux rouges en bout de tours
    o.boite(0.05, 0.05, 0.22, lumBlanche, 3.8, 0.7, sg * 0.24);
    o.boite(0.05, 0.08, 0.2, lumBlanche, 3.97, 0.82, sg * zAv);
    o.boite(0.05, 0.14, 0.26, lumRouge, -3.77, 1.65, sg * 0.4);
  }
  // tuyère centrale facettée, flamme orangée
  o.cyl(0.26, 0.34, 0.4, acier, -3.9, 0.9, 0, 0, Math.PI / 2, 8);
  const fl = o.cyl(0.2, 0.2, 0.04, a.mate('#ff5a1a', 0.5, 0.1), -4.11, 0.9, 0, 0, Math.PI / 2, 8); fl.material.emissive = new THREE.Color('#c83a08');
  // nervure centrale du capot et lame avant
  a.facettes([{ x: 1.2, pts: [[-0.12, 1.3], [0.12, 1.3], [0, 1.42]] }, { x: 3.5, pts: [[-0.1, 0.72], [0.1, 0.72], [0, 0.82]] }], armure);
  if (v.accent) for (const sg of [-1, 1]) o.boite(1.6, 0.05, 0.03, v.accent, -0.2, 1.22, sg * 0.93);
  if (v.filet) for (const sg of [-1, 1]) o.boite(2.2, 0.04, 0.03, v.filet, -0.5, 1.3 + dy * 0.6 + 0.02, sg * (0.96 + dz * 1.5));   // liseré rouge d'épaule
  // barème « Tolérance zéro » : pavillon et tours écrasés (chop top), caisse et voies élargies, pneus à fleur des ailes
  const f = a.rabaisser(v.chop, v.sz); a.voies(R, v.sz, v.dPneu || 0);
  a.degager(R, { sauf: (m) => m.userData.tige });                                                   // Brief 10 : pods et casquettes recoupés au-dessus des pneus
  return { L: 8.1, largeur: 2 * (zAv + 0.38) * v.sz, hauteur: f(Math.max(v.hTour, 2.17 + dy)) + 0.3, xAvant: 4.0, xArriere: -4.1, roues: R };
}
/** B15 : blindé noir brillant (photo), coque massive, verrière à pans rouges, jantes noires à liseré rouge. */
function b15(ctx) {
  const a = aide(ctx);
  // photos : 4 roues seulement (pas de double essieu arrière) ; coque massive, grosses roues AR, triangles AV ouverts
  return tumbler(ctx, { caisse: a.pein('#0d0e12', 0.2), armure: a.pein('#24262d', 0.3), verre: a.vitre('#7a0d16', 0.88), jante: '#121318', rayons: 'cinq', flanc: '#d8202c', RAr: 0.8, epAr: 0.85, hTour: 2.45, massif: 1, sz: 1.08, chop: [[1.3, 1.3], [2.45, 2.0]] });
}
/** B16 : même famille de blindé, noir mat, vitrages bleutés, jantes noires à liseré bleu, roues arrière plus grosses, tours plus hautes. */
function b16(ctx) {
  const a = aide(ctx);
  return tumbler(ctx, { caisse: a.pein('#15161b', 0.42), armure: a.mate('#202229', 0.55, 0.25), verre: a.vitre('#2a5f80', 0.85), jante: '#14161c', rayons: 'six', flanc: '#1f78ff', RAr: 0.76, epAr: 0.85, hTour: 2.4, accent: a.mate('#1f78ff', 0.4, 0.2), sz: 1.08, chop: [[1.3, 1.3], [2.4, 1.98]] });
}

/* ---------------------------------------------------------------- B17 : coupé arlequin blanc/bleu à losanges rouges, profil agressif */
/**
 * Bicolore blanc (dessus) / bleu (jupe, lame avant). Silhouette sculptée : baignoire centrale basse à taille de guêpe,
 * capot plongeant entre deux ailes avant bombées, hanches arrière en nacelles hautes et détachées coiffant de gros pneus
 * arrière de dragster (jantes bleues), roues avant plus petites (jantes rouges). Proportions photo : L/H ≈ 4,3, Ø AR / Ø AV ≈ 1,33.
 */
function b17(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = aide(ctx), a = o;
  const blanc = o.pein('#f4f4f6', 0.2), bleu = o.pein('#2a35c9', 0.25), noir = o.mate('#15171d', 0.5, 0.3), dark = o.mate('#0b0c10', 0.9, 0.1);
  const R = [{ x: 2.35, RW: 0.6, ep: 0.56, z: 0.86, y: 0.6, avant: true, jante: '#e5483f', rayons: 'etoile', flanc: '#e5483f', bosse: 0.05 },
             { x: -2.35, RW: 0.8, ep: 0.92, z: 1.0, y: 0.8, avant: false, jante: '#2a35c9', rayons: 'etoile', flanc: '#2a35c9', bosse: 0.04 }];
  // baignoire centrale basse
  const ST0 = [{ x: -3.8, w: 0.45, y0: 0.5, y1: 0.9 }, { x: -3.5, w: 0.78, y0: 0.36, y1: 1.08 }, { x: -2.35, w: 0.92, y0: 0.3, y1: 1.2 }, { x: -1.2, w: 0.92, y0: 0.28, y1: 1.14 },
    { x: 0, w: 0.86, y0: 0.28, y1: 1.08 }, { x: 1.2, w: 0.86, y0: 0.28, y1: 0.98 }, { x: 2.35, w: 0.9, y0: 0.3, y1: 0.98 }, { x: 3.1, w: 0.8, y0: 0.32, y1: 0.8 },
    { x: 3.6, w: 0.52, y0: 0.36, y1: 0.6 }, { x: 3.88, w: 0.22, y0: 0.4, y1: 0.48 }];
  const ST = sculpter(a, ST0, R, { taille: 0.12, wt: 0.78 });
  a.loft(ST, blanc, { arches: a.arches(R) }); a.puits(R, dark, ST);
  // nacelles d'ailes (hanches AR hautes, ailes AV bombées) : lofts décalés en z, creusés en arche au-dessus du pneu
  const nacelle = (st, zc, r) => { for (const sg of [-1, 1]) { const m = a.loft(st.map((q) => ({ nt: 2.6, nb: 2.2, ...q })), blanc, { arches: [{ x: r.x, R: r.RW * 1.1 + 0.03, y: r.RW, zin: -9 }], nx: 90, ns: 40 }); m.position.z = sg * zc; } };
  // hanches abaissées (barème A : sommet 1,72 ≤ 0,58 W) et déportées : le pneu AR affleure l'aile
  nacelle([{ x: -3.78, w: 0.08, y0: 0.78, y1: 0.98 }, { x: -3.45, w: 0.3, y0: 0.6, y1: 1.34 }, { x: -2.9, w: 0.4, y0: 0.55, y1: 1.63 }, { x: -2.35, w: 0.42, y0: 0.55, y1: 1.72 },
    { x: -1.7, w: 0.38, y0: 0.55, y1: 1.54 }, { x: -1.1, w: 0.2, y0: 0.6, y1: 1.22 }, { x: -0.75, w: 0.05, y0: 0.7, y1: 1.04 }], 1.06, R[1]);
  nacelle([{ x: 1.3, w: 0.05, y0: 0.62, y1: 0.92 }, { x: 1.75, w: 0.26, y0: 0.5, y1: 1.22 }, { x: 2.35, w: 0.32, y0: 0.5, y1: 1.4 }, { x: 2.95, w: 0.28, y0: 0.5, y1: 1.22 },
    { x: 3.42, w: 0.07, y0: 0.55, y1: 0.8 }], 0.84, R[0]);
  // dessus : fentes de capot, numéro et mot générique, losanges et couleurs de cartes sur le pont arrière
  a.drapeDessus(ST, -3.4, 3.6, -0.6, 0.6, (g, w, h) => {
    const X = (x) => (x + 3.4) / 7.0 * w, Z = (z) => (z + 0.6) / 1.2 * h;
    g.fillStyle = '#1a2230'; for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(X(1.5), Z(sg * 0.2)); g.lineTo(X(2.6), Z(sg * 0.3)); g.lineTo(X(2.6), Z(sg * 0.38)); g.lineTo(X(1.5), Z(sg * 0.28)); g.closePath(); g.fill(); }   // fentes de capot
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e5483f'; g.font = 'italic 900 64px Arial'; g.fillText('21', X(2.95), Z(0)); g.restore();
    g.fillStyle = '#e5483f'; for (let i = 0; i < 6; i++) { const cx = -3.05 + i * 0.36, cz = (i % 2 ? 0.1 : -0.1), s = 0.15; g.beginPath(); g.moveTo(X(cx - s * 1.2), Z(cz)); g.lineTo(X(cx), Z(cz - s * 1.4)); g.lineTo(X(cx + s * 1.2), Z(cz)); g.lineTo(X(cx), Z(cz + s * 1.4)); g.closePath(); g.fill(); }
    g.fillStyle = '#15171d'; g.font = 'bold 56px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♠', X(1.05), Z(0.3)); g.fillText('♣', X(1.05), Z(-0.3));
  }, 1400, 240);
  // flancs (positions exactes des deux côtés, textes lisibles) : jupe bleue, losanges rouges, mot générique
  const x0 = -3.8, x1 = 3.88, yb = 0.28, yt = 1.2, cv = a.carte(x0, x1, yb, yt, 2048, 300);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g, w, h, sg) => {
    g.fillStyle = '#2a35c9'; g.fillRect(cv.X(-3.6), cv.Y(0.5), cv.X(3.7) - cv.X(-3.6), cv.Y(0.28) - cv.Y(0.5));        // jupe bleue
    g.fillStyle = '#e5483f';
    for (let i = 0; i < 4; i++) { const cx = -0.82 + i * 0.34, s = 0.16; g.beginPath(); g.moveTo(cv.X(cx - s * 1.05), cv.Y(0.8)); g.lineTo(cv.X(cx), cv.Y(0.8 + s * 1.5)); g.lineTo(cv.X(cx + s * 1.05), cv.Y(0.8)); g.lineTo(cv.X(cx), cv.Y(0.8 - s * 1.5)); g.closePath(); g.fill(); }
    g.save(); g.translate(cv.X(0.86), cv.Y(0.82)); if (sg < 0) g.scale(-1, 1);                       // texte remis à l'endroit côté −z
    g.font = 'italic 900 56px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#15171d'; g.strokeText('ATOUT', 0, 0); g.fillStyle = '#e5483f'; g.fillText('ATOUT', 0, 0); g.restore();
    cv.trouer(g, R);
  }, 2048, 300, 0.022, true);
  // verrière bulle bleu lagon élargie (≈ 0,8 × largeur de la baignoire centrale)
  const cano = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 30, 16)), a.vitre('#35bfd4', 0.78)); cano.scale.set(1.3, 0.42, 0.7); cano.position.set(0.05, 1.04, 0); o.ajouter(cano);
  o.boite(0.08, 0.06, 1.2, blanc, -1.22, 1.16, 0);                                                    // arceau arrière de bulle
  a.plaque([[3.0, -0.72], [3.95, -0.32], [3.95, 0.32], [3.0, 0.72]], 0.36, 0.07, bleu);                 // lame avant bleue
  o.boite(0.3, 0.2, 0.86, noir, -3.72, 0.55, 0);                                                     // diffuseur
  o.boite(0.5, 0.06, 1.5, blanc, -3.45, 1.12, 0).rotation.z = 0.18;                                 // becquet de pont entre les nacelles
  for (const sg of [-1, 1]) {
    const ph = o.boite(0.34, 0.05, 0.2, noir, 3.42, 0.66, sg * 0.36); ph.rotation.y = sg * 0.45; ph.rotation.z = -0.25;   // phares en lame
    o.boite(0.05, 0.05, 0.18, lumBlanche, 3.56, 0.63, sg * 0.32).rotation.y = sg * 0.45;
    o.boite(0.06, 0.1, 0.26, lumRouge, -3.76, 0.98, sg * 1.04);                                     // feux en bout de nacelles
  }
  a.degager(R);                                                                                      // Brief 10 : nacelles recoupées au-dessus des pneus
  return { L: 7.7, largeur: 2 * (1.06 + 0.42), hauteur: 1.76, xAvant: 3.95, xArriere: -3.8, roues: R };
}

/* ---------------------------------------------------------------- E02 : hypercar barquette jaune ultra-basse en coin */
/**
 * Proportions mesurées sur la vignette de profil : L/H ≈ 3,8 (arceaux compris) ; ligne de caisse montante de l'avant
 * (0,08 L au nez) vers la poupe (0,2 L) ; empattement ≈ 0,6 L ; porte-à-faux AV 0,22 L, AR 0,18 L ; R ≈ 0,07 L.
 */
function e02(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a;
  const jaune = a.pein('#f2b400', 0.28), noir = a.mate('#14161b', 0.45, 0.3), dark = a.mate('#08090c', 0.9, 0.1), cuir = a.mate('#1c1d22', 0.8, 0.05);
  const R = [{ x: 2.09, RW: 0.57, ep: 0.6, avant: true, jante: '#15171c', rayons: 'dix', flanc: '#f2d21a', bosse: 0.06 },
             { x: -2.43, RW: 0.6, ep: 0.8, avant: false, jante: '#15171c', rayons: 'dix', flanc: '#f2d21a', bosse: 0.16 }];
  const ST0 = [{ x: -3.8, w: 1.0, y0: 0.42, y1: 1.24 }, { x: -3.55, w: 1.12, y0: 0.3, y1: 1.4 }, { x: -3.0, w: 1.16, y0: 0.26, y1: 1.5 },
    { x: -2.43, w: 1.17, y0: 0.26, y1: 1.56 }, { x: -1.8, w: 1.15, y0: 0.26, y1: 1.58 }, { x: -1.2, w: 1.1, y0: 0.26, y1: 1.5 },
    { x: -0.5, w: 1.05, y0: 0.26, y1: 1.42 }, { x: 0.5, w: 1.05, y0: 0.26, y1: 1.42 }, { x: 1.2, w: 1.08, y0: 0.26, y1: 1.4 },
    { x: 2.09, w: 1.1, y0: 0.26, y1: 1.32 }, { x: 2.8, w: 1.0, y0: 0.27, y1: 1.14 }, { x: 3.3, w: 0.8, y0: 0.29, y1: 1.0 },
    { x: 3.62, w: 0.5, y0: 0.31, y1: 0.84 }, { x: 3.84, w: 0.2, y0: 0.35, y1: 0.62 }].map((s) => ({ ...s, nt: 4.6, nb: 4 }));
  const ST = sculpter(a, ST0, R, { bosse: 0.1, taille: 0.07, wt: 0.8 }); poser(a, ST, R);
  a.loft(ST, jaune, { arches: a.arches(R) }); a.puits(R, dark, ST);
  // dessus : habitacle ouvert sombre, ouïes de capot, nervures du capot moteur
  a.drapeDessus(ST, -3.7, 3.75, -1.1, 1.1, (g, w, h) => {
    const X = (x) => (x + 3.7) / 7.45 * w, Z = (z) => (z + 1.1) / 2.2 * h;
    g.fillStyle = '#101216'; g.beginPath(); g.moveTo(X(-1.15), Z(-0.62)); g.lineTo(X(0.95), Z(-0.66)); g.lineTo(X(1.05), Z(0)); g.lineTo(X(0.95), Z(0.66)); g.lineTo(X(-1.15), Z(0.62)); g.lineTo(X(-1.25), Z(0)); g.closePath(); g.fill();
    g.fillStyle = '#0b0c10'; for (const sg of [-1, 1]) {
      g.beginPath(); g.moveTo(X(2.55), Z(sg * 0.3)); g.lineTo(X(3.0), Z(sg * 0.26)); g.lineTo(X(2.95), Z(sg * 0.4)); g.lineTo(X(2.55), Z(sg * 0.46)); g.closePath(); g.fill();   // ouïes avant
      for (let i = 0; i < 4; i++) g.fillRect(X(-3.3 + i * 0.3), Z(sg * 0.15 - 0.1), X(0.16) - X(0), Z(0.2) - Z(0));                                                           // persiennes moteur
    }
    g.strokeStyle = '#b89200'; g.lineWidth = 4; for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(X(-3.5), Z(sg * 0.5)); g.lineTo(X(-1.5), Z(sg * 0.42)); g.stroke(); g.beginPath(); g.moveTo(X(1.2), Z(sg * 0.5)); g.lineTo(X(3.4), Z(sg * 0.3)); g.stroke(); }
  }, 1600, 480);
  // flancs : bas de caisse noir, grande écope en creux devant la roue AR, arrière noir, arête diagonale
  const x0 = -3.8, x1 = 3.8, yb = 0.26, yt = 1.6, cv = a.carte(x0, x1, yb, yt, 2048, 400);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g) => {
    g.fillStyle = '#15171c'; g.fillRect(cv.X(-3.3), cv.Y(0.44), cv.X(2.9) - cv.X(-3.3), cv.Y(0.26) - cv.Y(0.44));
    g.beginPath(); g.moveTo(cv.X(-3.8), cv.Y(1.0)); g.lineTo(cv.X(-3.3), cv.Y(1.25)); g.lineTo(cv.X(-3.2), cv.Y(0.26)); g.lineTo(cv.X(-3.8), cv.Y(0.26)); g.closePath(); g.fill();
    g.fillStyle = '#0a0b0e'; g.beginPath(); g.moveTo(cv.X(-1.7), cv.Y(1.2)); g.lineTo(cv.X(-0.7), cv.Y(1.05)); g.lineTo(cv.X(-1.1), cv.Y(0.55)); g.lineTo(cv.X(-1.75), cv.Y(0.6)); g.closePath(); g.fill();
    g.strokeStyle = '#a88600'; g.lineWidth = 5; g.beginPath(); g.moveTo(cv.X(-0.6), cv.Y(0.5)); g.lineTo(cv.X(1.5), cv.Y(0.78)); g.lineTo(cv.X(2.8), cv.Y(0.9)); g.stroke();
    g.beginPath(); g.moveTo(cv.X(-0.7), cv.Y(1.05)); g.lineTo(cv.X(0.9), cv.Y(1.18)); g.stroke();
    cv.trouer(g, R);
  }, 2048, 400, 0.022, true);
  // lames d'écope en saillie (gros flancs sculptés) : facettes jaunes inclinées le long du bord avant de l'écope
  for (const sg of [-1, 1]) {
    const zf = (x, y) => sg * (a.flancAu(ST, x, y) - 0.02);
    const B = (x, y, e) => ({ x, pts: [[zf(x, y), y - 0.06], [zf(x, y) + sg * e, y - 0.02], [zf(x, y) + sg * e * 0.7, y + 0.06], [zf(x, y), y + 0.08]] });
    a.facettes([B(-1.15, 0.58, 0.02), B(-0.95, 0.75, 0.12), B(-0.75, 0.95, 0.14), B(-0.6, 1.12, 0.03)], jaune);
    a.facettes([B(-1.75, 0.62, 0.02), B(-1.6, 0.9, 0.08), B(-1.5, 1.15, 0.02)], noir);
  }
  // pare-brise enveloppant bas, encadrement noir
  const pb = o.boite(0.74, 0.035, 1.8, a.vitre('#1d2430', 0.8), 0.68, 1.56, 0); pb.rotation.z = Math.atan2(0.4, -0.62) + Math.PI;
  o.boite(0.1, 0.06, 1.78, noir, 0.37, 1.76, 0);
  for (const sg of [-1, 1]) a.barre(0.98, 1.4, 0.37, 1.76, sg * 0.9, 0.07, 0.07, noir);
  // sièges baquets et arceaux noirs avec carénages de poupe jaunes
  for (const sg of [-1, 1]) {
    o.boite(0.45, 0.42, 0.42, cuir, -0.65, 1.42, sg * 0.4).rotation.z = 0.25;
    const ar = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(0.2, 0.045, 8, 16, Math.PI)), noir); ar.rotation.y = Math.PI / 2; ar.position.set(-1.0, 1.66, sg * 0.42); o.ajouter(ar);   // arceau
    const fa = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), jaune); fa.scale.set(1.0, 0.24, 0.26); fa.position.set(-1.95, 1.5, sg * 0.42); o.ajouter(fa);   // carénage de poupe
  }
  // poupe : panneau noir, diffuseur à ailettes, feux en Y, triple sortie centrale, lèvre de becquet
  o.boite(0.1, 0.62, 1.7, noir, -3.79, 0.78, 0);
  for (let i = -3; i <= 3; i++) o.boite(0.5, 0.2, 0.04, noir, -3.6, 0.42, i * 0.22);
  for (const k of [-0.16, 0, 0.16]) { o.cyl(0.075, 0.075, 0.16, a.mate('#5a5d66', 0.35, 0.85), -3.86, 0.66, k, 0, Math.PI / 2, 12); o.cyl(0.05, 0.05, 0.02, dark, -3.95, 0.66, k, 0, Math.PI / 2, 12); }
  for (const sg of [-1, 1]) {
    for (const [ya, yb2, za, zb] of [[1.02, 0.86, 0.5, 0.62], [0.86, 0.74, 0.62, 0.5], [0.86, 0.86, 0.62, 0.8]]) {   // feux en Y
      const d = Math.hypot(yb2 - ya, zb - za), m = o.boite(0.05, 0.06, d, lumRouge, -3.85, (ya + yb2) / 2, sg * (za + zb) / 2); m.rotation.x = -sg * Math.atan2(yb2 - ya, zb - za);
    }
    for (const [x, z] of [[3.22, 0.6], [3.36, 0.48]]) o.boite(0.16, 0.04, 0.05, lumBlanche, x, a.hautAu(ST, x, z) + 0.005, sg * z).rotation.y = sg * 0.5;   // phares fins en Y
  }
  o.boite(0.45, 0.06, 1.8, noir, -3.6, 1.4, 0).rotation.z = 0.12;
  a.facettes([{ x: 3.3, pts: [[-0.82, 0.3], [0.82, 0.3], [0.82, 0.5], [-0.82, 0.5]] }, { x: 3.84, pts: [[-0.2, 0.33], [0.2, 0.33], [0.18, 0.48], [-0.18, 0.48]] }], noir);   // bouche d'air avant noire en V
  a.plaque([[2.9, -0.98], [3.5, -0.62], [3.9, -0.12], [3.9, 0.12], [3.5, 0.62], [2.9, 0.98]], 0.33, 0.06, noir);                       // lame avant noire
  // barème « Tolérance zéro » (cat. A) : poupe, pare-brise et arceaux abaissés au-dessus des arches, voies élargies, pneus à fleur
  const sz = 1.04; a.rabaisser([[1.15, 1.15], [1.9, 1.6]], sz); a.voies(R, sz, -0.018);
  a.degager(R);                                                                                      // Brief 10 : arches recoupées
  return { L: 7.7, largeur: 2 * wMax(ST) * sz, hauteur: 1.66, xAvant: 3.86, xArriere: -3.86, roues: R };
}

/** Habitacle commun aux berlines/breaks : verrière en loft, toit peint, montants. */
function habitacle(o, STc, STt, xm, cote) {
  const verre = cote.verre, peinte = cote.peinte;
  o.loft(STc, verre, { nx: 80, ns: 40 });
  const toit = o.loft(STt, peinte, { nx: 80, ns: 40 });
  for (const [xa, ya, xb, yb, ep] of cote.montants) o.barre(xa, ya, xb, yb, cote.zMont(xa, ya, xb, yb), ep, 0.07, peinte);
  return toit;
}

/* ---------------------------------------------------------------- E03 : gros coupé GT de course noir et or, aileron col de cygne */
/**
 * Proportions mesurées (profil sous blister + 3/4) : L/H ≈ 4,0 hors aileron ; empattement ≈ 0,64 L ; capot très long
 * (pare-brise à 0,62 L depuis l'arrière) ; pavillon bas et reculé (sommet entre 0,30 et 0,55 L) ; R ≈ 0,078 L.
 */
function e03(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a;
  const noir = a.pein('#121317', 0.16), carbone = a.mate('#17181d', 0.5, 0.3), dark = a.mate('#07080a', 0.9, 0.1);
  // GT3 : ailes avant élargies, épaules arrière massives débordantes (+0,25 par côté), gros boudins
  const R = [{ x: 2.62, RW: 0.6, ep: 0.64, avant: true, jante: '#15161b', rayons: 'dix', flanc: '#d4a63a', bosse: 0.2, etal: 1.4 },
             { x: -2.34, RW: 0.63, ep: 0.86, avant: false, jante: '#15161b', rayons: 'dix', flanc: '#d4a63a', bosse: 0.56, etal: 1.75 }];   // ailes AR +20 %
  const ST0 = [{ x: -3.9, w: 0.9, y0: 0.45, y1: 1.1 }, { x: -3.65, w: 1.05, y0: 0.3, y1: 1.28 }, { x: -2.9, w: 1.12, y0: 0.26, y1: 1.33 },
    { x: -2.34, w: 1.13, y0: 0.26, y1: 1.36 }, { x: -1.5, w: 1.06, y0: 0.26, y1: 1.3 }, { x: 0, w: 1.04, y0: 0.26, y1: 1.27 },
    { x: 1.2, w: 1.06, y0: 0.26, y1: 1.26 }, { x: 2.62, w: 1.1, y0: 0.26, y1: 1.24 }, { x: 3.4, w: 1.06, y0: 0.28, y1: 1.12 },
    { x: 3.75, w: 0.98, y0: 0.3, y1: 1.0 }, { x: 3.93, w: 0.86, y0: 0.34, y1: 0.88 }].map((s) => ({ ...s, nt: 3.4, nb: 4 }));
  const ST = sculpter(a, ST0, R, { taille: 0.08, wt: 0.8 }); poser(a, ST, R, 0.04); R[1].z -= 0.08;                                  // pneu AR rentré sous l'épaule débordante
  a.loft(ST, noir, { arches: a.arches(R) }); a.puits(R, dark, ST);
  // habitacle bas et reculé : verrière en loft, toit peint, montants ; pavillon ≈ 0,82 × largeur de caisse au droit de l'habitacle
  // ligne fastback de coupé : lunette très couchée qui file jusqu'à la malle
  const STc0 = [{ x: -2.75, w: 0.7, y0: 1.24, y1: 1.3, nt: 3 }, { x: -2.1, w: 0.8, y0: 1.18, y1: 1.58, nt: 3 }, { x: -1.2, w: 0.85, y0: 1.15, y1: 1.85, nt: 3 },
    { x: -0.4, w: 0.86, y0: 1.15, y1: 1.92, nt: 3 }, { x: 0.25, w: 0.84, y0: 1.15, y1: 1.85, nt: 3 }, { x: 1.08, w: 0.8, y0: 1.18, y1: 1.3, nt: 3 }];
  const STt0 = [{ x: -1.75, w: 0.74, y0: 1.66, y1: 1.76, nt: 3 }, { x: -1.2, w: 0.82, y0: 1.79, y1: 1.9, nt: 3 }, { x: -0.4, w: 0.84, y0: 1.86, y1: 1.98, nt: 3 },
    { x: 0.25, w: 0.82, y0: 1.79, y1: 1.9, nt: 3 }, { x: 0.5, w: 0.74, y0: 1.66, y1: 1.75, nt: 3 }];
  const kc = 0.84 * a.largeurAu(ST, -0.6) / wMax(STc0), STc = cabine(STc0, kc), STt = cabine(STt0, kc * 1.02), zM = wMax(STc) * 0.97;   // pavillon large (≈ 0,82 × caisse)
  habitacle(o, STc, STt, 0, { verre: a.vitre('#1a202b', 0.9), peinte: noir, zMont: (xa, ya, xb, yb) => a.largeurAu(STc, (xa + xb) / 2) * 0.97,
    montants: [[1.1, 1.26, 0.42, 1.86, 0.1], [-2.6, 1.28, -1.55, 1.86, 0.16], [-0.45, 1.2, -0.42, 1.92, 0.08]] });
  // bandes dorées jumelles capot / toit / malle ; liserés latéraux et numéro sur la portière
  const bande = (g, X, Z, x0, x1) => { g.fillStyle = '#d4a63a'; for (const zc of [-0.12, 0.12]) g.fillRect(X(x0), Z(zc - 0.05), X(x1) - X(x0), Z(zc + 0.05) - Z(zc - 0.05)); };
  a.drapeDessus(ST, -3.85, 3.9, -0.5, 0.5, (g, w, h) => { const X = (x) => (x + 3.85) / 7.75 * w, Z = (z) => (z + 0.5) * h; bande(g, X, Z, -3.8, -2.6); bande(g, X, Z, 1.1, 3.85); }, 1600, 200);
  a.drapeDessus(STt, -1.7, 0.45, -0.5, 0.5, (g, w, h) => { const X = (x) => (x + 1.7) / 2.15 * w, Z = (z) => (z + 0.5) * h; bande(g, X, Z, -1.7, 0.45); }, 600, 200);
  const x0 = -3.9, x1 = 3.93, yb = 0.26, yt = 1.36, cv = a.carte(x0, x1, yb, yt, 2048, 300);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g, w, h, sg) => {
    g.fillStyle = '#d4a63a';
    g.fillRect(cv.X(-3.5), cv.Y(0.5), cv.X(3.6) - cv.X(-3.5), cv.Y(0.46) - cv.Y(0.5));                                   // liseré bas
    g.beginPath(); g.moveTo(cv.X(-1.6), cv.Y(1.1)); g.lineTo(cv.X(1.9), cv.Y(1.06)); g.lineTo(cv.X(1.9), cv.Y(1.02)); g.lineTo(cv.X(-1.6), cv.Y(1.06)); g.closePath(); g.fill();   // filet de ceinture
    const cx = cv.X(-0.7), cy = cv.Y(0.8);
    g.beginPath(); g.arc(cx, cy, 0.22 * cv.sy, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(cx, cy); if (sg < 0) g.scale(-1, 1);                                                            // chiffre lisible des deux côtés
    g.fillStyle = '#121317'; g.font = '900 100px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', 0, 6); g.restore();
    cv.trouer(g, R);
  }, 2048, 300, 0.022, true);
  // face avant : GRANDE calandre rectangulaire grillagée (cadre chromé à coins arrondis, maille losangée en retrait), doubles phares ronds
  const mailleT = a.matDecal((g, w, h) => { g.fillStyle = '#0d0e12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6f737c'; g.lineWidth = 3; for (let i = -h; i < w; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); } }, 512, 192);
  const rect = (sh, w2, h2, r, trou) => { const p = trou ? new THREE.Path() : sh; p.moveTo(-w2 + r, -h2); p.lineTo(w2 - r, -h2); p.quadraticCurveTo(w2, -h2, w2, -h2 + r); p.lineTo(w2, h2 - r); p.quadraticCurveTo(w2, h2, w2 - r, h2);
    p.lineTo(-w2 + r, h2); p.quadraticCurveTo(-w2, h2, -w2, h2 - r); p.lineTo(-w2, -h2 + r); p.quadraticCurveTo(-w2, -h2, -w2 + r, -h2); if (trou) sh.holes.push(p); };
  const calandre = (cz, cy, w2, h2, xF, prof, cadre) => {
    const fond = o.boite(prof, h2 * 2, w2 * 2, dark, xF - prof / 2, cy, cz);                          // caisson sombre : masque la caisse derrière la maille
    const gr = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(w2 * 2, h2 * 2)), mailleT); gr.rotation.y = Math.PI / 2; gr.position.set(xF + 0.005, cy, cz); o.ajouter(gr);
    if (cadre) { const sh = new THREE.Shape(); rect(sh, w2 + 0.045, h2 + 0.045, 0.1, false); rect(sh, w2, h2, 0.07, true);
      const f = new THREE.Mesh(ctx.garde(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 })), cadre);
      f.rotation.y = Math.PI / 2; f.position.set(xF - 0.03, cy, cz); o.ajouter(f); }
    return fond;
  };
  calandre(0, 0.6, 0.74, 0.21, 3.97, 0.42, o.chrome);                                                  // calandre principale élargie 1,48 × 0,42
  calandre(0, 0.33, 0.84, 0.06, 4.0, 0.2, null);                                                      // prise d'air basse grillagée
  for (const sg of [-1, 1]) {
    a.phareRond(3.6, 0.94, sg * 0.9, 0.13, lumBlanche, o.chrome); a.phareRond(3.72, 0.93, sg * 0.66, 0.09, lumBlanche, o.chrome);
    calandre(sg * 0.95, 0.46, 0.13, 0.1, 3.8, 0.2, null);                                             // bouches latérales grillagées
    o.boite(0.6, 0.04, 0.32, dark, 2.2, a.hautAu(ST, 2.2, 0.5) - 0.005, sg * 0.5);                    // ouïes de capot
    o.boite(0.06, 0.12, 0.42, lumRouge, -3.88, 1.0, sg * 0.62);
    o.boite(0.22, 0.14, 0.1, noir, 0.95, 1.4, sg * (zM + 0.14));                                     // rétros
    o.boite(3.0, 0.1, 0.08, carbone, 0.1, 0.3, sg * (a.largeurAu(ST, 0.1) - 0.02));                  // jupes carbone
  }
  a.plaque([[3.3, -1.2], [4.12, -0.66], [4.12, 0.66], [3.3, 1.2]], 0.3, 0.06, carbone);               // lame avant
  o.boite(0.4, 0.22, 2.2, carbone, -3.75, 0.45, 0);                                                    // diffuseur
  for (let i = -3; i <= 3; i++) o.boite(0.32, 0.2, 0.04, carbone, -3.78, 0.42, i * 0.3);              // ailettes de diffuseur
  for (const sg of [-1, 1]) o.cyl(0.08, 0.08, 0.2, a.mate('#5a5d66', 0.35, 0.85), -3.93, 0.5, sg * 0.45, 0, Math.PI / 2, 12);
  // aileron GT : profil d'aile porteur inversé (extrudé sur l'envergure), flasques, deux mâts « col de cygne » qui le tiennent par le dessus
  const corde = 1.0, ep = 0.13, env = 2.75, xBA = -3.05, yAile = 2.16, inc = 0.12;
  const prof = new THREE.Shape(), N = 18, ext = [], intr = [];
  for (let i = 0; i <= N; i++) {
    const u = 1 - Math.cos(Math.PI * i / N) * 0.5 - 0.5, t = 5 * ep * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4), c = -0.05 * Math.sin(Math.PI * u);
    ext.push([-u * corde, c + t * corde]); intr.push([-u * corde, c - t * corde]);
  }
  ext.forEach(([x, y], i) => (i ? prof.lineTo(x, y) : prof.moveTo(x, y))); for (let i = intr.length - 1; i > 0; i--) prof.lineTo(...intr[i]); prof.closePath();
  const gAile = new THREE.ExtrudeGeometry(prof, { depth: env, bevelEnabled: false, curveSegments: 4 }); gAile.translate(0, 0, -env / 2);
  const aileM = new THREE.Mesh(ctx.garde(gAile), carbone); aileM.position.set(xBA, yAile, 0); aileM.rotation.z = -inc; o.ajouter(aileM);
  const aileron = new THREE.Group(); aileron.userData.acc = true; o.ajouter(aileron); aileron.add(aileM);   // aileron complet = accessoire (suit la malle abaissée)
  const yHaut = (xr) => yAile + Math.sin(inc) * (xBA - xr) + 0.02;                                    // extrados approché à l'abscisse xr
  for (const sg of [-1, 1]) {
    const fl = o.boite(corde * 1.15, 0.5, 0.045, carbone, xBA - corde * 0.5, yAile + 0.04, sg * (env / 2 + 0.02)); fl.rotation.z = -inc * 0.6; aileron.add(fl);   // flasques
    // col de cygne : lame courbe (épaisseur 0,06) partant de la malle, passant au-dessus du plan et le saisissant par l'extrados
    const yB = a.hautAu(ST, -3.0, 0.48) - 0.06, P = [[-2.98, yB], [-2.86, 2.55], [-3.4, 2.72], [-3.55, yHaut(-3.55) - 0.02]];
    const bz = (t) => { const m = 1 - t; return [0, 1].map((k) => m * m * m * P[0][k] + 3 * m * m * t * P[1][k] + 3 * m * t * t * P[2][k] + t * t * t * P[3][k]); };
    const gauche = [], droite = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, [x, y] = bz(t), [xa, ya] = bz(Math.max(0, t - 0.01)), [xb, yb2] = bz(Math.min(1, t + 0.01)), dl = Math.hypot(xb - xa, yb2 - ya), nx = -(yb2 - ya) / dl, ny = (xb - xa) / dl, e = 0.085 - 0.035 * t;
      gauche.push([x + nx * e, y + ny * e]); droite.push([x - nx * e, y - ny * e]);
    }
    const sh = new THREE.Shape(); gauche.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); for (let i = droite.length - 1; i >= 0; i--) sh.lineTo(...droite[i]); sh.closePath();
    const col = new THREE.Mesh(ctx.garde(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 })), carbone);
    col.position.z = sg * 0.48 - 0.03; aileron.add(col);
    const pat = o.boite(0.34, 0.05, 0.14, carbone, -3.55, yHaut(-3.55) - 0.01, sg * 0.48); pat.rotation.z = -inc; aileron.add(pat);   // patin de fixation sur l'extrados
    aileron.add(o.boite(0.3, 0.04, 0.16, carbone, -2.98, yB + 0.02, sg * 0.48));                       // embase sur la malle
  }
  // barème « Tolérance zéro » (cat. A) : pavillon −30 % (chop top au-dessus de la ceinture), aileron translaté avec la malle
  const f = a.rabaisser([[1.27, 1.27], [1.98, 2.15]], 1);   // Brief 10 : pavillon de GT remonté (H_toit/W ≈ 0,63, photo de face)
  a.degager(R);                                                                                      // Brief 10 : arches recoupées
  return { L: 8.1, largeur: 2 * wMax(ST), hauteur: 2.6, xAvant: 4.12, xArriere: -3.95, roues: R };
}

/* ---------------------------------------------------------------- E05 : berline noire des années 60, rond blanc n°63 */
function e05(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = aide(ctx), a = o;
  const noir = o.pein('#17181c', 0.16), dark = o.mate('#07080a', 0.9, 0.1), chr = o.chrome;
  // berline vintage : pneus étroits mais pleins (≥ 0,45), jantes blanches pleines
  const R = [{ x: 2.15, RW: 0.5, ep: 0.47, avant: true, jante: '#f4f4f4', rayons: 'plein', flanc: null },
             { x: -2.1, RW: 0.52, ep: 0.5, avant: false, jante: '#f4f4f4', rayons: 'plein', flanc: null }];
  const ST0 = [{ x: -3.25, w: 0.55, y0: 0.6, y1: 1.0, nt: 4 }, { x: -3.05, w: 0.82, y0: 0.45, y1: 1.2, nt: 4 }, { x: -2.2, w: 0.95, y0: 0.34, y1: 1.3, nt: 4.5 }, { x: -1.0, w: 0.93, y0: 0.34, y1: 1.3, nt: 4.5 },
    { x: 0.4, w: 0.93, y0: 0.34, y1: 1.3, nt: 4.5 }, { x: 1.4, w: 0.94, y0: 0.34, y1: 1.28, nt: 4.5 }, { x: 2.15, w: 0.95, y0: 0.34, y1: 1.26, nt: 4.5 }, { x: 2.8, w: 0.9, y0: 0.34, y1: 1.18, nt: 4 },
    { x: 3.2, w: 0.62, y0: 0.4, y1: 0.98, nt: 4 }, { x: 3.3, w: 0.4, y0: 0.45, y1: 0.85, nt: 4 }];
  const ST = sculpter(a, ST0, R, { bosse: 0.06, taille: 0.03, wt: 0.88 }); poser(a, ST, R, 0.03);
  a.loft(ST, noir, { arches: a.arches(R) }); a.puits(R, dark, ST);
  const STc0 = [{ x: -1.45, w: 0.76, y0: 1.28, y1: 1.7, nt: 3.5 }, { x: -1.2, w: 0.84, y0: 1.25, y1: 1.95, nt: 3.5 }, { x: 0.1, w: 0.85, y0: 1.25, y1: 2.0, nt: 3.5 }, { x: 0.85, w: 0.84, y0: 1.25, y1: 1.95, nt: 3.5 }, { x: 1.15, w: 0.76, y0: 1.28, y1: 1.7, nt: 3.5 }];
  const STt0 = [{ x: -1.25, w: 0.76, y0: 1.88, y1: 1.98, nt: 3.5 }, { x: -1.0, w: 0.87, y0: 1.93, y1: 2.05, nt: 3.5 }, { x: 0.1, w: 0.88, y0: 1.97, y1: 2.09, nt: 3.5 }, { x: 0.8, w: 0.87, y0: 1.93, y1: 2.05, nt: 3.5 }, { x: 1.0, w: 0.78, y0: 1.88, y1: 1.98, nt: 3.5 }];
  const kc = 0.78 * wMax(ST) / wMax(STc0), STc = cabine(STc0, kc), STt = cabine(STt0, kc * 1.02), zM = wMax(STc) * 0.97;
  habitacle(o, STc, STt, 0, { verre: a.vitre('#58626b', 0.72), peinte: noir, zMont: (xa, ya, xb, yb) => a.largeurAu(STc, (xa + xb) / 2) * 0.97, montants: [[1.15, 1.32, 0.8, 1.95, 0.08], [-1.45, 1.32, -1.15, 1.95, 0.1], [-0.2, 1.3, -0.2, 2.0, 0.07]] });
  // livrée : rond blanc n°63, filet blanc, étiquette générique
  const x0 = -3.25, x1 = 3.3, yb = 0.34, yt = 1.3, cv = a.carte(x0, x1, yb, yt, 2048, 360);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g, w, h, sg) => {
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(cv.X(-3.0), cv.Y(0.9)); g.lineTo(cv.X(3.0), cv.Y(0.9)); g.lineTo(cv.X(3.0), cv.Y(0.84)); g.lineTo(cv.X(-3.0), cv.Y(0.84)); g.closePath(); g.fill();
    g.beginPath(); g.arc(cv.X(-0.2), cv.Y(0.82), 0.3 * cv.sy, 0, Math.PI * 2); g.fill(); g.fillStyle = '#141518'; g.font = '900 150px Arial'; texteFlanc(g, '63', cv.X(-0.2), cv.Y(0.82) + 8, sg);
    g.fillStyle = '#f4f4f4'; g.fillRect(cv.X(-1.4), cv.Y(1.2), 0.62 * cv.sx, 0.2 * cv.sy); g.fillStyle = '#c8302a'; g.fillRect(cv.X(-1.4), cv.Y(1.2), 0.62 * cv.sx, 0.06 * cv.sy); g.fillStyle = '#141518'; g.font = '800 40px Arial'; texteFlanc(g, 'MOTEUR', cv.X(-1.09), cv.Y(1.1), sg);
    cv.trouer(g, R);
  }, 2048, 360, 0.022, true);
  a.drapeDessus(ST, 1.4, 2.9, -0.7, 0.7, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(w * 0.5, h * 0.5, h * 0.42, 0, Math.PI * 2); g.fill(); g.fillStyle = '#141518'; g.font = '900 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(w * 0.5, h * 0.5); g.rotate(Math.PI / 2); g.fillText('63', 0, 8); g.restore(); }, 512, 512);
  // pare-chocs chromés, calandre, rétros, écope de capot
  o.boite(0.12, 0.12, 1.62, chr, 3.34, 0.55, 0); o.boite(0.12, 0.12, 1.62, chr, -3.12, 0.58, 0);
  o.boite(0.06, 0.24, 1.0, o.mate('#2a2c30', 0.4, 0.8), 3.31, 0.82, 0);
  for (const sg of [-1, 1]) o.boite(0.14, 0.12, 0.08, noir, 0.95, 1.45, sg * (zM + 0.1));
  const sc = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 16, 10)), o.mate('#2a2c30', 0.5, 0.6)); sc.scale.set(0.5, 0.06, 0.28); sc.position.set(1.9, 1.3, 0); o.ajouter(sc);
  // barème « Tolérance zéro » (cat. B) : pavillon abaissé (chop top), ceinture légèrement descendue, caisse et voies élargies
  const sz = 1.22; a.rabaisser([[1.12, 1.12], [1.3, 1.21], [2.09, 1.73]], sz); a.voies(R, sz, 0);   // Brief 10 : H_toit/W ≈ 0,68
  a.degager(R);                                                                                      // Brief 10 : arches recoupées
  // phares ronds et feux posés APRÈS l'élargissement (restent ronds)
  for (const sg of [-1, 1]) {
    a.phareRond(3.2, 0.96, sg * 0.56 * sz, 0.16, lumBlanche, chr);
    o.boite(0.06, 0.12, 0.26, lumRouge, -3.2, 0.96, sg * 0.46 * sz);
  }
  return { L: 6.7, largeur: 2 * wMax(ST) * sz, hauteur: 1.7, xAvant: 3.34, xArriere: -3.28, roues: R };
}

/* ---------------------------------------------------------------- E06 : compacte électrique de course, graphismes vert acide */
function e06(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = aide(ctx), a = o;
  const gris = o.pein('#66758b', 0.2), noir = o.mate('#15171c', 0.55, 0.3), dark = o.mate('#07080a', 0.9, 0.1);
  // compacte de course : voies larges, ailes carrées élargies
  const R = [{ x: 2.0, RW: 0.6, ep: 0.58, avant: true, jante: '#101216', rayons: 'cinq', flanc: null },
             { x: -2.0, RW: 0.6, ep: 0.62, avant: false, jante: '#101216', rayons: 'cinq', flanc: null }];
  const ST0 = [{ x: -3.2, w: 0.8, y0: 0.42, y1: 1.36, nt: 4 }, { x: -3.0, w: 0.95, y0: 0.34, y1: 1.47 }, { x: -2.0, w: 1.0, y0: 0.3, y1: 1.5 }, { x: -0.8, w: 0.98, y0: 0.3, y1: 1.35 },
    { x: 0.5, w: 0.96, y0: 0.3, y1: 1.3 }, { x: 1.5, w: 0.98, y0: 0.3, y1: 1.3 }, { x: 2.1, w: 1.02, y0: 0.3, y1: 1.35 }, { x: 2.7, w: 0.98, y0: 0.3, y1: 1.15 },
    { x: 3.05, w: 0.78, y0: 0.34, y1: 0.9 }, { x: 3.2, w: 0.45, y0: 0.38, y1: 0.7 }];
  const ST = sculpter(a, ST0, R, { bosse: 0.12, taille: 0.05, wt: 0.82, nt: 3.2 }); poser(a, ST, R);
  a.loft(ST, gris, { arches: a.arches(R) }); a.puits(R, dark, ST);
  const STc0 = [{ x: -2.9, w: 0.6, y0: 1.38, y1: 1.5, nt: 3 }, { x: -2.3, w: 0.78, y0: 1.32, y1: 1.78, nt: 3 }, { x: -1.5, w: 0.86, y0: 1.3, y1: 1.96, nt: 3 }, { x: -0.1, w: 0.88, y0: 1.3, y1: 2.0, nt: 3 },
    { x: 0.8, w: 0.85, y0: 1.28, y1: 1.9, nt: 3 }, { x: 1.5, w: 0.74, y0: 1.26, y1: 1.52, nt: 3 }];
  const STt0 = [{ x: -2.0, w: 0.72, y0: 1.82, y1: 1.92, nt: 3 }, { x: -1.5, w: 0.88, y0: 1.93, y1: 2.04, nt: 3 }, { x: -0.1, w: 0.9, y0: 1.97, y1: 2.08, nt: 3 }, { x: 0.8, w: 0.87, y0: 1.9, y1: 2.0, nt: 3 }, { x: 1.2, w: 0.74, y0: 1.8, y1: 1.9, nt: 3 }];
  const kc = 0.82 * wMax(ST) / wMax(STc0), STc = cabine(STc0, kc), STt = cabine(STt0, kc * 1.02), zM = wMax(STc) * 0.97;   // pavillon ≈ 0,82 × caisse
  habitacle(o, STc, STt, 0, { verre: a.vitre('#141a22', 0.9), peinte: gris, zMont: (xa, ya, xb, yb) => a.largeurAu(STc, (xa + xb) / 2) * 0.97, montants: [[1.5, 1.28, 0.85, 1.92, 0.09], [-0.35, 1.3, -0.3, 1.98, 0.08], [-2.5, 1.4, -1.8, 1.95, 0.12]] });
  // graphismes : traînées vert acide + blanc, numéro 8
  const x0 = -3.15, x1 = 3.2, yb = 0.3, yt = 1.5, cv = a.carte(x0, x1, yb, yt, 2048, 380);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g, w, h, sg) => {
    const fl = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(cv.X(x), cv.Y(y)) : g.moveTo(cv.X(x), cv.Y(y)))); g.closePath(); g.fill(); };
    fl([[-2.7, 0.95], [1.2, 1.25], [2.6, 1.0], [2.6, 0.85], [1.2, 1.08], [-2.7, 0.75]], '#a6e22e');
    fl([[-2.5, 0.72], [2.4, 0.78], [2.6, 0.66], [-2.5, 0.52]], '#e8f8ff');
    fl([[-1.6, 1.3], [-0.3, 1.18], [-0.6, 1.1], [-1.9, 1.2]], '#a6e22e');
    g.fillStyle = '#a6e22e'; g.beginPath(); g.arc(cv.X(-1.0), cv.Y(0.9), 0.24 * cv.sy, 0, Math.PI * 2); g.fill(); g.fillStyle = '#15171c'; g.font = '900 130px Arial'; texteFlanc(g, '8', cv.X(-1.0), cv.Y(0.9) + 6, sg);   // rond n°8 sur la portière arrière (hors passage de roue)
    g.fillStyle = '#15171c'; g.font = 'italic 900 80px Arial'; texteFlanc(g, 'VOLT', cv.X(0.2), cv.Y(0.92), sg);
    cv.trouer(g, R);
  }, 2048, 380, 0.022, true);
  a.drapeDessus(ST, 0.9, 3.1, -0.95, 0.95, (g, w, h) => {
    const X = (x) => (x - 0.9) / 2.2 * w, Z = (z) => (z + 0.95) / 1.9 * h; g.fillStyle = '#a6e22e';
    for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(X(1.0 + i * 0.4), Z(sg * 0.9)); g.lineTo(X(1.35 + i * 0.4), Z(sg * 0.9)); g.lineTo(X(1.7 + i * 0.4), Z(sg * 0.3)); g.lineTo(X(1.35 + i * 0.4), Z(sg * 0.3)); g.closePath(); g.fill(); }
    g.fillStyle = '#15171c'; g.beginPath(); g.arc(X(2.35), Z(0), 0.3 * w / 2.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a6e22e'; g.font = '900 140px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', X(2.35), Z(0) + 6);
  }, 1100, 380);
  a.plaque([[2.6, -1.0], [3.4, -0.62], [3.4, 0.62], [2.6, 1.0]], 0.38, 0.08, noir);                         // grand splitter
  for (const sg of [-1, 1]) { o.boite(0.06, 0.1, 0.34, lumBlanche, 3.1, 0.82, sg * 0.5); o.boite(0.06, 0.1, 0.3, lumRouge, -3.2, 1.05, sg * 0.45); }
  o.boite(0.5, 0.24, 1.2, noir, -3.2, 0.5, 0);                                                         // diffuseur
  const n0 = ctx.chassis.children.length;
  a.aile({ x: -3.0, y: 2.2, corde: 0.7, env: 2.0, mat: o.mate('#2a2d34', 0.4, 0.4), matDerive: o.mate('#22252c', 0.45, 0.4), yBase: a.hautAu(ST, -3.0, 0.6), zJambe: 0.6, ep: 0.08, derive: 0.3 });
  a.acc(ctx.chassis.children.slice(n0));                                                                // aileron rigide = accessoire
  // barème « Tolérance zéro » (cat. B) : pavillon plus bas (chop top) et plus large, caisse et voies élargies, roues sous les ailes
  const sz = 1.15; a.rabaisser([[1.3, 1.3], [2.08, 1.89]], sz); a.voies(R, sz, -0.01);   // Brief 10 : hatch, H_toit/W ≈ 0,70
  a.degager(R);                                                                                      // Brief 10 : arches recoupées
  return { L: 6.5, largeur: 2 * wMax(ST) * sz, hauteur: 2.25, xAvant: 3.3, xArriere: -3.3, roues: R };
}

/* ---------------------------------------------------------------- E07 : break bleu aux vitres jaunes, galerie et bande dorée */
function e07(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = aide(ctx), a = o;
  const bleu = o.pein('#1668cc', 0.2), noir = o.mate('#15171b', 0.6, 0.25), dark = o.mate('#07080a', 0.9, 0.1);
  // break de drift : pneus larges, jantes sombres
  const R = [{ x: 2.2, RW: 0.56, ep: 0.6, avant: true, jante: '#2b2d33', rayons: 'cinq', flanc: null },
             { x: -2.15, RW: 0.56, ep: 0.68, avant: false, jante: '#2b2d33', rayons: 'cinq', flanc: null }];
  const ST0 = [{ x: -3.4, w: 0.7, y0: 0.45, y1: 1.25, nt: 4.5 }, { x: -3.15, w: 0.9, y0: 0.34, y1: 1.42, nt: 4.5 }, { x: -2.3, w: 0.96, y0: 0.34, y1: 1.45, nt: 4.5 }, { x: -1.0, w: 0.96, y0: 0.34, y1: 1.42, nt: 4.5 },
    { x: 0.5, w: 0.96, y0: 0.34, y1: 1.4, nt: 4.5 }, { x: 1.6, w: 0.97, y0: 0.34, y1: 1.4, nt: 4.5 }, { x: 2.2, w: 0.97, y0: 0.34, y1: 1.38, nt: 4.5 }, { x: 3.0, w: 0.95, y0: 0.34, y1: 1.28, nt: 4.5 },
    { x: 3.35, w: 0.85, y0: 0.4, y1: 1.1, nt: 4 }, { x: 3.45, w: 0.6, y0: 0.45, y1: 0.95, nt: 4 }];
  const ST = sculpter(a, ST0, R, { bosse: 0.13, taille: 0.03, wt: 0.88 }); poser(a, ST, R, 0.0);   // ailes élargies
  a.loft(ST, bleu, { arches: a.arches(R) }); a.puits(R, dark, ST);
  // toit long et plat ; lunette de hayon et pare-brise inclinés
  const STc0 = [{ x: -3.2, w: 0.78, y0: 1.36, y1: 1.62, nt: 4 }, { x: -2.75, w: 0.86, y0: 1.34, y1: 2.2, nt: 4 }, { x: -1.5, w: 0.88, y0: 1.32, y1: 2.25, nt: 4 }, { x: 0.0, w: 0.88, y0: 1.32, y1: 2.25, nt: 4 }, { x: 0.7, w: 0.86, y0: 1.32, y1: 2.2, nt: 4 }, { x: 1.55, w: 0.76, y0: 1.3, y1: 1.6, nt: 4 }];
  const STt0 = [{ x: -2.75, w: 0.84, y0: 2.17, y1: 2.28, nt: 4.5 }, { x: -2.55, w: 0.92, y0: 2.2, y1: 2.32, nt: 4.5 }, { x: 0.0, w: 0.92, y0: 2.2, y1: 2.32, nt: 4.5 }, { x: 0.65, w: 0.9, y0: 2.17, y1: 2.28, nt: 4.5 }, { x: 0.8, w: 0.8, y0: 2.0, y1: 2.12, nt: 4.5 }];
  const kc = 0.8 * wMax(ST) / wMax(STc0), STc = cabine(STc0, kc), STt = cabine(STt0, kc * 1.02), zM = wMax(STc) * 0.97;
  habitacle(o, STc, STt, 0, { verre: a.vitre('#e0b81a', 0.78), peinte: bleu, zMont: (xa, ya, xb, yb) => a.largeurAu(STc, (xa + xb) / 2) * 0.97, montants: [[1.5, 1.34, 0.75, 2.22, 0.09], [-0.05, 1.32, -0.05, 2.25, 0.08], [-1.45, 1.32, -1.45, 2.25, 0.08], [-3.15, 1.4, -2.68, 2.2, 0.1]] });
  // toit lisse (les photos ne montrent pas de galerie) : simple becquet de hayon
  o.boite(0.35, 0.06, 1.3, bleu, -2.75, 2.3, 0).rotation.z = 0.15;
  // livrée : bande dorée, filets blancs, rond n°40
  const x0 = -3.4, x1 = 3.45, yb = 0.34, yt = 1.45, cv = a.carte(x0, x1, yb, yt, 2048, 330);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g, w, h, sg) => {
    g.fillStyle = '#15171b'; g.fillRect(cv.X(-3.3), cv.Y(0.5), cv.X(3.4) - cv.X(-3.3), cv.Y(0.34) - cv.Y(0.5));
    g.fillStyle = '#c9a248'; g.beginPath(); g.moveTo(cv.X(-3.0), cv.Y(0.98)); g.lineTo(cv.X(2.7), cv.Y(0.98)); g.lineTo(cv.X(2.7), cv.Y(0.62)); g.lineTo(cv.X(-3.0), cv.Y(0.62)); g.closePath(); g.fill();
    g.fillStyle = '#f2f6ff'; for (let i = 0; i < 3; i++) g.fillRect(cv.X(-3.0), cv.Y(1.2 - i * 0.09), cv.X(2.8) - cv.X(-3.0), 0.04 * cv.sy);
    g.beginPath(); g.arc(cv.X(0.3), cv.Y(0.98), 0.27 * cv.sy, 0, Math.PI * 2); g.fill(); g.fillStyle = '#15171b'; g.font = '900 150px Arial'; texteFlanc(g, '40', cv.X(0.3), cv.Y(0.98) + 8, sg);
    g.fillStyle = '#15171b'; g.font = 'italic 900 70px Arial'; texteFlanc(g, 'DRIFT', cv.X(-0.95), cv.Y(0.8), sg); g.fillStyle = '#f2f6ff'; g.fillRect(cv.X(1.0), cv.Y(0.78), 1.3 * cv.sx, 0.05 * cv.sy);
    cv.trouer(g, R);
  }, 2048, 330, 0.022, true);
  o.boite(0.7, 0.07, 0.5, o.mate('#0e2a4a', 0.5, 0.3), 1.9, 1.42, 0);                                // prise d'air de capot
  // barème « Tolérance zéro » (cat. B) : break « brique » slammé, toit −35 % puis caisse et voies élargies, pneus larges à fleur
  const sz = 1.2; a.rabaisser([[1.21, 1.21], [1.42, 1.31], [2.32, 1.8]], sz); a.voies(R, sz, 0.02);   // Brief 10 : break, H_toit/W ≈ 0,67
  a.degager(R);                                                                                      // Brief 10 : arches recoupées
  // face avant (posée après l'élargissement) : calandre rectangulaire sombre cerclée de chrome, barre diagonale chromée, phares rectangulaires
  const gw = 1.5, gh = 0.42, gx = 3.43, gy = 0.85;
  o.boite(0.12, gh, gw, o.mate('#1b1d22', 0.4, 0.5), gx, gy, 0);
  for (const sg of [-1, 1]) { o.boite(0.04, 0.04, gw + 0.04, o.chrome, gx + 0.07, gy + sg * gh / 2, 0); o.boite(0.04, gh + 0.04, 0.04, o.chrome, gx + 0.07, gy, sg * gw / 2); }
  const diag = o.boite(0.04, 0.05, Math.hypot(gw, gh) - 0.06, o.chrome, gx + 0.075, gy, 0); diag.rotation.x = Math.atan2(gh, gw);
  for (const sg of [-1, 1]) { o.boite(0.08, 0.2, 0.34, lumBlanche, 3.4, 1.0, sg * 0.76); o.boite(0.05, 0.24, 0.2, lumRouge, -3.32, 1.02, sg * 0.78); }
  o.boite(0.3, 0.26, 2.0, noir, 3.38, 0.5, 0); o.boite(0.26, 0.26, 1.9, noir, -3.3, 0.5, 0);           // pare-chocs noirs
  return { L: 6.95, largeur: 2 * wMax(ST) * sz, hauteur: 1.8, xAvant: 3.45, xArriere: -3.4, roues: R };
}

export const GROUPE_2 = { B14: b14, B15: b15, B16: b16, B17: b17, E02: e02, E03: e03, E05: e05, E06: e06, E07: e07 };
