import { outils } from './outils.js';
import { aide, arco } from './aide_8.js';

/* =====================================================================================================
   Groupe 8 — TK06 (GT de course à livrée turquoise/rose), U01 (crossover électrique rallye),
   U02 (coupé turbo 1984), U03 (coupé 1977 noir à flammes), U04 (pick-up 1983 surbaissé),
   U05 (muscle-car 1970 dorée à bandes). Aucune marque : motifs et mots génériques uniquement.
   ===================================================================================================== */

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

/** Aileron de GT : lame inclinée, déflecteurs latéraux, jambes inclinées. */
function aileronGT(o, a, { x, y, larg, corde, lame, plaque, jambes, yPied }) {
  const c = corde / 2;
  o.profil([[c, 0], [c - 0.02, 0.1], [-c, 0.3], [-c - 0.04, 0.17], [-c + 0.05, 0.1]], larg, lame, { galbe: false, biseau: 0.02 }).position.set(x, y, 0);
  for (const s of [-1, 1]) a.forme([[c + 0.08, -0.05], [c + 0.08, 0.14], [-c - 0.08, 0.34], [-c - 0.08, -0.05]], 0.07, plaque, s * (larg / 2 + 0.04)).position.set(x, y, s * (larg / 2 + 0.04));
  for (const z of jambes) a.barre([x + 0.05, yPied], [x + 0.02, y + 0.02], 0.1, 0.07, lame, z);
}

/* ---- TK06 : GT3 de course turquoise, rose et blanche (motifs abstraits, n° 4), énorme aileron, calandre agressive ---- */
function gtTurquoise(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a.o, rig = [];
  const blanc = o.lac('#f3f6f9', 0.2, 0.25), teal = o.lac('#22cfc0', 0.22, 0.3), rose = o.lac('#ff4fa6', 0.22, 0.3), noir = o.lac('#14161b', 0.3, 0.4);
  const carbone = o.mat('#1b1d22', 0.45, 0.5), sombre = o.mat('#0a0b0e', 0.85, 0.15);
  const roues = [{ x: 2.45, RW: 0.6, ep: 0.6, avant: true }, { x: -2.25, RW: 0.63, ep: 0.78, avant: false }];
  const wAx = [1.17, 1.2];
  roues.forEach((r, i) => { r.z = wAx[i] - r.ep / 2 + 0.07; r.jante = '#16181d'; r.rayons = 'dix'; r.flanc = i ? '#ff4fa6' : '#22cfc0'; r.etrier = '#ff4fa6'; });
  // caisse : poupe large, taille resserrée aux portières, ailes gonflées aux essieux, museau bas et arrondi
  const ST = [
    { x: -3.92, w: 0.86, y0: 0.44, y1: 1.20, nt: 4 }, { x: -3.7, w: 1.1, y0: 0.32, y1: 1.46, nt: 5 }, { x: -2.9, w: 1.2, y0: 0.3, y1: 1.54, nt: 5 },
    { x: -2.25, w: 1.21, y0: 0.3, y1: 1.56, nt: 5 }, { x: -1.4, w: 1.14, y0: 0.3, y1: 1.44, nt: 5 }, { x: -0.3, w: 1.1, y0: 0.3, y1: 1.39, nt: 5 },
    { x: 0.9, w: 1.11, y0: 0.3, y1: 1.36, nt: 5 }, { x: 1.8, w: 1.15, y0: 0.3, y1: 1.38, nt: 5 }, { x: 2.45, w: 1.17, y0: 0.3, y1: 1.42, nt: 5 },
    { x: 3.15, w: 1.12, y0: 0.3, y1: 1.22, nt: 4 }, { x: 3.7, w: 1.02, y0: 0.31, y1: 0.88, nt: 3.5 }, { x: 4.02, w: 0.88, y0: 0.34, y1: 0.68, nt: 3 }];
  a.loft(ST, blanc, { arches: a.archesDe(roues, 1.1, 0.08) });
  roues.forEach((r, i) => { const Ra = r.RW * 1.1 + 0.08; a.levre(blanc, r, Ra + 0.03, 0.075, wAx[i] - 0.04, 0.3, 1.7); });
  // habitacle : verrière large et basse (chop top), pavillon plat posé sur les épaules, toit turquoise, montants saillants
  const STc = [{ x: 1.45, w: 0.9, y0: 1.20, y1: 1.32, nt: 7, wt: 0.94 }, { x: 0.95, w: 1.0, y0: 1.20, y1: 1.72, nt: 7, wt: 0.94 }, { x: 0.25, w: 1.05, y0: 1.20, y1: 2.08, nt: 8, wt: 0.95 },
    { x: -0.7, w: 1.06, y0: 1.20, y1: 2.12, nt: 8, wt: 0.95 }, { x: -1.5, w: 1.03, y0: 1.30, y1: 1.90, nt: 7, wt: 0.94 }, { x: -2.3, w: 0.94, y0: 1.32, y1: 1.62, nt: 6, wt: 0.92 }, { x: -2.95, w: 0.78, y0: 1.32, y1: 1.44, nt: 5 }];
  a.loft(STc, o.verre, { nx: 70, ns: 48 });
  const STt = [{ x: 0.42, w: 0.86, y0: 1.98, y1: 2.09, nt: 6 }, { x: 0.1, w: 0.99, y0: 2.02, y1: 2.13, nt: 7 }, { x: -0.8, w: 1.0, y0: 2.05, y1: 2.16, nt: 7 }, { x: -1.35, w: 0.95, y0: 1.95, y1: 2.06, nt: 6 }];
  a.loft(STt, teal, { nx: 40, ns: 32 });
  a.montants(STc, [[1.42, 1.3, 0.4, 2.02, 0.09], [-0.15, 1.32, -0.25, 2.1, 0.06], [-1.3, 1.97, -2.6, 1.5, 0.18], [-1.9, 1.82, -2.0, 1.37, 0.2]], blanc, 0.015);
  a.ellipsoide(noir, -0.35, 2.14, 0, 0.42, 0.07, 0.26);                                // prise d'air de toit (basse)
  o.boite(0.06, 0.05, 0.36, sombre, -0.02, 2.17, 0);
  // capot : bosse centrale, ouïes en V
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const k = o.boite(0.42, 0.03, 0.09, sombre, 2.1 - i * 0.1, 1.39 + i * 0.012, s * (0.55 + i * 0.03)); k.rotation.y = s * 0.5; }
  // museau : calandre béante à barres verticales, prises latérales, lame avant carbone
  a.face((g, w, h) => {
    g.fillStyle = '#07080a'; g.beginPath(); g.moveTo(w * 0.06, 0); g.lineTo(w * 0.94, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.fillStyle = '#c9ced8'; for (let i = 1; i < 16; i++) g.fillRect(i * w / 16 - 3, 6, 6, h - 10);
    g.strokeStyle = '#ff4fa6'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  }, 1.25, 0.32, 4.035, 0.53, 0, 1, 512, 132);
  for (const s of [-1, 1]) {
    o.boite(0.2, 0.22, 0.32, sombre, 3.93, 0.5, s * 0.74).rotation.y = s * -0.35;    // prises d'air d'angle
    const hz = s * 0.72, hy = a.hautAu(ST, 3.55, 0.72);
    const ph = o.boite(0.5, 0.1, 0.42, noir, 3.55, hy - 0.02, hz); ph.rotation.set(0, s * -0.3, -0.35);
    const lu = o.boite(0.32, 0.04, 0.34, lumBlanche, 3.62, hy + 0.03, hz); lu.rotation.set(0, s * -0.3, -0.35);
    const re = o.boite(0.28, 0.15, 0.24, teal, 0.95, 1.62, s * 1.2); re.rotation.y = s * 0.12; rig.push(re);   // rétroviseurs
    o.boite(0.1, 0.05, 0.2, noir, 1.02, 1.54, s * 1.06);
    o.cyl(0.08, 0.08, 0.2, carbone, -1.1, 0.42, s * 1.04, 0, 0, 14).rotation.set(Math.PI / 2, 0, 0);   // échappements latéraux
  }
  a.o.profil([[3.55, 0], [4.25, 0], [4.25, 0.06], [3.55, 0.08]], 2.25, carbone, { galbe: { avant: 0.25, arriere: 0, fruit: 0, bombe: 0, lAv: 0.25 }, biseau: 0.02, y: 0.27 });
  // livrée de dessus : capot turquoise à vagues roses et pois blancs
  a.drapeDessus(ST, 1.3, 3.95, -1.0, 1.0, (g, w, h, d) => {
    g.fillStyle = '#22cfc0'; g.beginPath(); g.moveTo(d.X(1.35), d.Z(-0.62)); g.lineTo(d.X(3.6), d.Z(-0.82)); g.lineTo(d.X(3.6), d.Z(0.82)); g.lineTo(d.X(1.35), d.Z(0.62)); g.closePath(); g.fill();
    g.strokeStyle = '#ff4fa6'; g.lineWidth = 16; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(d.X(1.5), d.Z(-0.5 + i * 0.32)); g.bezierCurveTo(d.X(2.3), d.Z(-0.8 + i * 0.32), d.X(2.8), d.Z(-0.2 + i * 0.3), d.X(3.6), d.Z(-0.45 + i * 0.3)); g.stroke(); }
    g.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(d.X(1.6 + (i * 0.37) % 1.9), d.Z(-0.7 + ((i * 0.53) % 1.4)), 9 + (i % 3) * 5, 0, 7); g.fill(); }
  }, { cw: 1024, ch: 512 });
  // aileron monumental col de cygne + dérives roses
  const yW = 2.5, xW = -3.35;
  rig.push(o.profil([[0.55, 0], [0.5, 0.09], [-0.5, 0.26], [-0.56, 0.15]], 2.3, noir, { galbe: false, biseau: 0.02 }));
  rig[rig.length - 1].position.set(xW, yW, 0);
  for (const s of [-1, 1]) {
    rig.push(a.forme([[0.58, -0.1], [0.58, 0.14], [-0.6, 0.38], [-0.6, -0.1]], 0.06, rose, 0)); rig[rig.length - 1].position.set(xW, yW, s * 1.18);
    const yb = a.hautAu(ST, -3.1, 0.5);
    a.barre3([-3.0, yb - 0.04, s * 0.5], [-3.15, yW + 0.24, s * 0.5], 0.09, 0.05, carbone);                  // col de cygne
    a.barre3([-3.15, yW + 0.24, s * 0.5], [-3.3, yW + 0.2, s * 0.5], 0.06, 0.05, carbone);
  }
  // poupe : diffuseur, feux, échappements
  o.boite(0.5, 0.06, 1.9, carbone, -3.75, 0.36, 0);
  for (let i = -3; i <= 3; i++) o.boite(0.4, 0.18, 0.035, carbone, -3.72, 0.44, i * 0.26);
  a.face((g, w, h) => {
    g.fillStyle = '#0d0e12'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff2a3a'; g.fillRect(w * 0.04, h * 0.12, w * 0.3, h * 0.22); g.fillRect(w * 0.66, h * 0.12, w * 0.3, h * 0.22);
    g.fillStyle = '#ff4fa6'; g.fillRect(0, h * 0.5, w, h * 0.06);
    g.fillStyle = '#2b2e35'; for (let i = 0; i < 8; i++) g.fillRect(w * 0.1 + i * w * 0.1, h * 0.7, w * 0.07, h * 0.25);
  }, 1.5, 0.62, -3.935, 0.82, 0, -1, 512, 212);
  for (const s of [-1, 1]) o.boite(0.04, 0.12, 0.4, lumRouge, -3.94, 1.02, s * 0.45);
  // flancs : vagues turquoise/roses, numéro 4 sur la portière, étoiles
  const trous = roues.map((r) => ({ x: r.x, y: r.RW, r: r.RW * 1.1 + 0.11 }));
  a.drapeFlancs(ST, -3.85, 3.95, 0.3, 1.46, (g, w, h, d) => {
    const { X, Y } = d;
    g.fillStyle = '#22cfc0'; g.beginPath(); g.moveTo(X(3.95), Y(0.3)); g.lineTo(X(3.95), Y(0.95)); g.bezierCurveTo(X(2.5), Y(1.15), X(1.4), Y(0.64), X(0.2), Y(0.72)); g.bezierCurveTo(X(-1.2), Y(0.84), X(-1.8), Y(0.48), X(-3.85), Y(0.58)); g.lineTo(X(-3.85), Y(0.3)); g.closePath(); g.fill();
    g.fillStyle = '#ff4fa6'; g.beginPath(); g.moveTo(X(3.95), Y(0.3)); g.lineTo(X(3.95), Y(0.52)); g.bezierCurveTo(X(2), Y(0.62), X(0.5), Y(0.42), X(-1), Y(0.5)); g.lineTo(X(-3.85), Y(0.42)); g.lineTo(X(-3.85), Y(0.3)); g.closePath(); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(X(3.2 - i * 0.2), Y(0.9)); g.bezierCurveTo(X(1.5), Y(1.15 - i * 0.05), X(0), Y(0.58), X(-3 + i * 0.1), Y(0.7 - i * 0.03)); g.stroke(); }
    g.fillStyle = '#ffffff'; g.strokeStyle = '#14161b'; g.lineWidth = 6;
    const rx = X(0.05), ry = Y(1.18), rw = 0.62 * d.sx, rh = 0.42 * d.sy; g.fillRect(rx, ry, rw, rh); g.strokeRect(rx, ry, rw, rh);
    g.fillStyle = '#14161b'; g.font = `900 ${Math.round(0.38 * d.sy)}px Arial Black, Arial`; d.txt('4', rx + rw / 2, ry + rh * 0.86, 'center');
    g.font = '900 34px Arial Black, Arial'; d.txt('RACING', X(-2.0), Y(0.62), 'center');
    g.fillStyle = '#ff4fa6'; for (let i = 0; i < 8; i++) { const sx = X(-3.3 + i * 0.32), sy = Y(1.15 - (i % 3) * 0.09); g.beginPath(); for (let k = 0; k < 10; k++) { const r = (k % 2 ? 7 : 16), an = k * Math.PI / 5 - Math.PI / 2; g.lineTo(sx + r * Math.cos(an), sy + r * Math.sin(an)); } g.closePath(); g.fill(); }
  }, { cw: 2048, ch: 300, trous });
  for (const s of [-1, 1]) a.barre3([1.75, 0.36, s * 1.1], [-1.5, 0.36, s * 1.11], 0.08, 0.1, rose);     // jupes latérales
  a.plaque(-3.96, 0.62, -1, '4');
  // barème : pavillon abaissé (2,16 → 1,68), caisse et voies élargies de 15 %, pneus à fleur des ailes
  const fin = a.finir(roues, { carte: [[0, 0], [1.3, 1.3], [2.16, 1.74]], sw: 1.15, rigides: rig, doublureMat: sombre, toit: { y: 2.16, x0: -1.3, x1: 0.3 } });
  ajourerPneus(ctx.chassis, roues);                                     // inspection des trains : aucun autocollant dans la gomme
  return { L: 8.2, largeur: fin.largeur, hauteur: fin.hauteur, xAvant: 4.25, xArriere: -3.95, roues };
}

/* ---- U01 : crossover électrique de rallye-drift (stature de SUV : garde au sol, caisse haute, pavillon haut,
   passages de roues massifs, hayon fuyant), bleu nuit, élargisseurs et bas de caisse noirs, aileron démesuré au ras du pavillon.
   Proportions mesurées sur la photo de profil : L/H_toit ≈ 3,1 ; empattement ≈ 0,66 L ; Ø roue ≈ 0,55 H_toit ;
   ceinture ≈ 0,68 H_toit ; vitrage ≈ 0,28 H_toit ; H_toit / largeur hors tout ≈ 0,80 (famille SUV & crossovers). ---- */
function crossoverRallye(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a.o, rig = [];
  const bleu = o.lac('#1c2a63', 0.2, 0.45), noir = o.lac('#121317', 0.35, 0.2), noirM = o.mat('#17181d', 0.7, 0.2), sombre = o.mat('#08090b', 0.9, 0.1);
  const roues = [{ x: 2.45, RW: 0.69, ep: 0.64, avant: true }, { x: -2.7, RW: 0.7, ep: 0.74, avant: false }];
  const wAx = [1.2, 1.22];
  roues.forEach((r, i) => { r.z = wAx[i] - r.ep / 2 + 0.1; r.jante = '#62666e'; r.rayons = 'dix'; r.flanc = null; r.etrier = '#e5322d'; });
  // caisse haute (ceinture ~1,72) : flancs pleins, hanches au droit des essieux, nez haut et franc, garde au sol de SUV (bas de caisse à 0,5)
  const ST = [
    { x: -3.78, w: 0.92, y0: 0.68, y1: 1.62, nt: 4 }, { x: -3.6, w: 1.06, y0: 0.58, y1: 1.74, nt: 5 }, { x: -2.7, w: 1.2, y0: 0.58, y1: 1.8, nt: 5 },
    { x: -1.3, w: 1.15, y0: 0.58, y1: 1.74, nt: 6 }, { x: 0.5, w: 1.14, y0: 0.58, y1: 1.74, nt: 6 }, { x: 1.45, w: 1.16, y0: 0.58, y1: 1.76, nt: 6 },
    { x: 2.45, w: 1.18, y0: 0.58, y1: 1.76, nt: 5 }, { x: 3.15, w: 1.09, y0: 0.6, y1: 1.68, nt: 4.5 }, { x: 3.58, w: 1.01, y0: 0.62, y1: 1.56, nt: 4 },
    { x: 3.76, w: 0.88, y0: 0.68, y1: 1.38, nt: 3.2 }];
  a.loft(ST, bleu, { arches: a.archesDe(roues, 1.1, 0.08) });
  // élargisseurs noirs massifs (lèvres épaisses) coiffant les pneus + doublures de passages
  roues.forEach((r, i) => { const Ra = r.RW * 1.1 + 0.08; a.levre(noir, r, Ra + 0.06, 0.11, wAx[i] + 0.0, 0.6, 1.9); });
  // bas de caisse noir continu entre les roues (jupe pleine, pas de vide sous la portière)
  for (const s of [-1, 1]) {
    o.profil([[-1.82, 0.0], [1.52, 0.0], [1.6, 0.24], [-1.9, 0.24]], 0.12, noir, { galbe: false, biseau: 0.03, y: 0.48 }).position.z = s * (a.flancAu(ST, 0, 0.68) - 0.02);
  }
  // habitacle haut : vitres en verre fumé (montants inclinés vers l'intérieur), pavillon bleu, montant arrière très épais
  const STc = [{ x: -2.56, w: 1.1, y0: 1.68, y1: 2.22, nt: 7, wt: 0.9 }, { x: -1.0, w: 1.13, y0: 1.68, y1: 2.37, nt: 7, wt: 0.91 }, { x: 0.0, w: 1.13, y0: 1.68, y1: 2.38, nt: 7, wt: 0.91 },
    { x: 0.55, w: 1.08, y0: 1.68, y1: 2.24, nt: 7, wt: 0.9 }, { x: 1.05, w: 1.04, y0: 1.68, y1: 2.03, nt: 6, wt: 0.9 }, { x: 1.55, w: 0.98, y0: 1.68, y1: 1.8, nt: 6, wt: 0.9 }];
  a.loft(STc, o.verre, { nx: 60, ns: 40 });
  // quartier arrière plein (custode bleue) qui file jusqu'au hayon fuyant
  const STq = [{ x: -3.62, w: 0.86, y0: 1.66, y1: 1.8, nt: 6, wt: 0.9 }, { x: -3.25, w: 1.02, y0: 1.66, y1: 2.06, nt: 7, wt: 0.9 }, { x: -2.9, w: 1.1, y0: 1.66, y1: 2.19, nt: 7, wt: 0.9 },
    { x: -2.55, w: 1.135, y0: 1.66, y1: 2.24, nt: 7, wt: 0.91 }, { x: -2.4, w: 1.135, y0: 1.66, y1: 2.26, nt: 7, wt: 0.91 }];
  a.loft(STq, bleu, { nx: 50, ns: 40 });
  // pavillon : panneau bleu large et plat (≈ 82 % de la caisse) légèrement bombé, rails noirs
  const STt = [{ x: -2.95, w: 0.96, y0: 2.1, y1: 2.22, nt: 6 }, { x: -2.55, w: 1.06, y0: 2.18, y1: 2.31, nt: 7 }, { x: -1.6, w: 1.08, y0: 2.3, y1: 2.44, nt: 7 }, { x: -0.6, w: 1.08, y0: 2.34, y1: 2.48, nt: 7 }, { x: 0.3, w: 1.0, y0: 2.27, y1: 2.39, nt: 6 }];
  a.loft(STt, bleu, { nx: 40, ns: 40 });
  for (const s of [-1, 1]) a.barre3([-2.4, 2.35, s * 0.84], [0.1, 2.47, s * 0.84], 0.04, 0.05, noir);
  // montants : pare-brise (A), milieu (B), hayon
  a.montants(STc, [[1.52, 1.78, 0.3, 2.34, 0.1], [-0.5, 1.72, -0.56, 2.38, 0.09], [-1.62, 1.72, -1.66, 2.32, 0.06]], bleu, 0.015);
  // lunette arrière du hayon (verre fumé posé sur la pente)
  const pl = [-3.55, 1.86], ph = [-2.92, 2.19], lg = Math.hypot(ph[0] - pl[0], ph[1] - pl[1]);
  const lun = o.boite(lg, 0.03, 1.6, o.verre, (pl[0] + ph[0]) / 2 - 0.04, (pl[1] + ph[1]) / 2 + 0.03, 0); lun.rotation.z = Math.atan2(ph[1] - pl[1], ph[0] - pl[0]);
  for (const s of [-1, 1]) {
    const re = o.boite(0.3, 0.15, 0.22, noir, 1.25, 1.88, s * 1.27); re.rotation.y = s * 0.1; rig.push(re);      // rétroviseurs
    o.boite(0.1, 0.05, 0.2, noir, 1.3, 1.8, s * 1.12);
  }
  a.essuies([1.52, 1.78], [0.3, 2.34], 0.1);
  // capot : ouïes centrales
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) o.boite(0.34, 0.025, 0.14, sombre, 2.75 - i * 0.15, a.hautAu(ST, 2.75 - i * 0.15, 0.42) + 0.005, s * 0.42);
  // museau : face haute et franche, panneau noir laqué, phares effilés en haut des ailes, bouclier noir massif, lame et canards
  a.face((g, w, h) => {
    g.fillStyle = '#0b0c10'; g.fillRect(0, 0, w, h); g.strokeStyle = '#262a32'; g.lineWidth = 3;
    for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(w * 0.15, j * h / 5); g.lineTo(w * 0.85, j * h / 5); g.stroke(); }
  }, 1.2, 0.48, 3.77, 1.06, 0, 1, 512, 205);
  for (const s of [-1, 1]) {
    const hy = a.hautAu(ST, 3.45, 0.66);
    const ph2 = o.boite(0.4, 0.08, 0.46, noirM, 3.43, hy - 0.02, s * 0.66); ph2.rotation.set(0, s * -0.32, -0.38);
    const lu = o.boite(0.05, 0.05, 0.42, lumBlanche, 3.61, hy - 0.08, s * 0.64); lu.rotation.set(0, s * -0.32, 0);
  }
  // bouclier noir (pleine largeur, enveloppe le bas du nez) + lame avant débordante + canards
  // (largeur 2,07 : les joues du bouclier s'arrêtent 1,5 cm avant la bande de roulement du pneu avant, qu'elles traversaient)
  o.profil([[3.0, 0], [3.84, 0], [3.92, 0.18], [3.88, 0.48], [3.68, 0.6], [3.0, 0.6]], 2.07, noir, { galbe: { avant: 0.22, arriere: 0, fruit: 0.04, bombe: 0, lAv: 0.35 }, biseau: 0.04, y: 0.42 });
  o.profil([[3.3, 0], [4.06, 0], [4.06, 0.06], [3.3, 0.09]], 2.3, noir, { galbe: { avant: 0.3, arriere: 0, fruit: 0, bombe: 0, lAv: 0.25 }, biseau: 0.02, y: 0.36 });
  for (const s of [-1, 1]) { const ca = o.boite(0.42, 0.04, 0.3, noir, 3.68, 0.8, s * 1.0); ca.rotation.set(0.25 * s, s * -0.3, 0); }
  for (const s of [-1, 1]) o.boite(0.06, 0.16, 0.36, sombre, 3.91, 0.64, s * 0.62);   // entrées d'air de bouclier
  // aileron démesuré au niveau du pavillon, sur col de cygne, dérives noires
  const yW = 2.44, xW = -3.74;
  rig.push(o.profil([[0.58, 0], [0.52, 0.08], [-0.58, 0.2], [-0.62, 0.11]], 2.3, noir, { galbe: false, biseau: 0.02 })); rig[rig.length - 1].position.set(xW, yW, 0);
  for (const s of [-1, 1]) {
    rig.push(a.forme([[0.62, -0.1], [0.62, 0.14], [-0.68, 0.32], [-0.68, -0.14]], 0.06, noir, 0)); rig[rig.length - 1].position.set(xW, yW, s * 1.17);
    a.barre3([-3.3, 2.0, s * 0.5], [-3.5, yW + 0.04, s * 0.55], 0.1, 0.06, noir);
  }
  // poupe : bandeau de feux continu, diffuseur noir massif, échappements
  a.face((g, w, h) => {
    g.fillStyle = '#0d0e12'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff2a3a'; g.fillRect(w * 0.03, h * 0.1, w * 0.94, h * 0.1);
    g.fillStyle = '#2a2d34'; for (let i = 0; i < 7; i++) g.fillRect(w * 0.12 + i * w * 0.11, h * 0.66, w * 0.07, h * 0.3);
  }, 1.62, 0.98, -3.795, 1.12, 0, -1, 512, 310);
  o.boite(0.04, 0.06, 1.4, lumRouge, -3.8, 1.5, 0);
  o.profil([[-3.88, 0], [-3.12, 0], [-3.12, 0.5], [-3.82, 0.5]], 2.14, noir, { galbe: { avant: 0, arriere: 0.2, fruit: 0.04, bombe: 0, lAr: 0.3 }, biseau: 0.04, y: 0.44 });
  for (const s of [-1, 1]) o.cyl(0.08, 0.08, 0.22, o.chrome, -3.9, 0.58, s * 0.55, 0, Math.PI / 2, 14);
  // livrée : bas de caisse noir, griffes blanches / bleu ciel, filets rouges, chevrons sur le capot
  const trous = roues.map((r) => ({ x: r.x, y: r.RW, r: r.RW * 1.1 + 0.22 }));
  a.drapeFlancs(ST, -3.76, 3.74, 0.58, 1.7, (g, w, h, d) => {
    const { X, Y } = d;
    g.fillStyle = '#0f1014'; g.fillRect(0, Y(0.8), w, h);
    const bande = (x0, x1, y0, y1, c, inc = 0.3) => { g.fillStyle = c; g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y0)); g.lineTo(X(x1 + inc), Y(y1)); g.lineTo(X(x0 + inc), Y(y1)); g.closePath(); g.fill(); };
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e5322d' : '#eef4ff'; g.fillRect(X(-3.62), Y(1.62 - i * 0.08), X(-2.3 + i * 0.12) - X(-3.62), 0.045 * d.sy); }
    for (let i = 0; i < 9; i++) bande(-2.15 + i * 0.22, -2.03 + i * 0.22, 0.86, 1.6, i % 2 ? '#5ac8ff' : '#eef4ff', 0.26);
    for (let i = 0; i < 6; i++) bande(0.2 + i * 0.16, 0.26 + i * 0.16, 0.9, 1.42, i % 3 === 2 ? '#e5322d' : '#5ac8ff', 0.22);
    g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(0.26 * d.sy)}px Arial Black, Arial`; d.txt('E-RALLY', X(-0.3), Y(1.0), 'left');
    g.fillStyle = '#e5322d'; g.fillRect(X(-0.3), Y(0.95), X(1.3) - X(-0.3), 0.03 * d.sy);
  }, { cw: 2048, ch: 400, trous });
  a.drapeDessus(ST, 1.6, 3.6, -1.0, 1.0, (g, w, h, d) => {
    const { X, Z } = d; g.lineWidth = 0.035 * d.sx; g.strokeStyle = '#5ac8ff';
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(2.0 + i * 0.2), Z(s * 0.95)); g.lineTo(X(2.6 + i * 0.2), Z(s * 0.25)); g.stroke(); }
  }, { cw: 1024, ch: 512 });
  a.plaque(-3.82, 0.98, -1, '01');
  // BRIEF 10 (famille SUV & crossovers, H_toit/W ≈ 0,80) : plus de chop top, caisse dessinée à sa hauteur réelle ; caisse et voies +5 %, pneus à fleur des élargisseurs
  const fin = a.finir(roues, { carte: [[0, 0], [1, 1]], sw: 1.08, rigides: rig, doublureMat: sombre, toit: { y: 2.48, x0: -2.4, x1: -0.2 } });
  ajourerPneus(ctx.chassis, roues);                                     // inspection des trains : aucun autocollant dans la gomme
  return { L: 8.4, largeur: fin.largeur, hauteur: fin.hauteur, xAvant: 4.06, xArriere: -4.36, roues };
}

/* ---- U02 : coupé turbo 1984, noir et gris, filets verts, prise d'air de capot décalée, jantes pleines blanches, aileron biplan ---- */
function coupeTurbo84(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a.o, rig = [];
  const noir = o.lac('#111215', 0.2, 0.35), gris = o.lac('#555963', 0.3, 0.45), noirM = o.mat('#16171b', 0.65, 0.3), sombre = o.mat('#07080a', 0.9, 0.1);
  const roues = [{ x: 2.1, RW: 0.54, ep: 0.54, avant: true }, { x: -2.2, RW: 0.55, ep: 0.64, avant: false }];
  const wAx = [1.05, 1.08];
  roues.forEach((r, i) => { r.z = wAx[i] - r.ep / 2 + 0.06; r.jante = '#f4f6f8'; r.rayons = 'plein'; r.flanc = null; });
  // caisse anguleuse des années 80 : flancs droits (nt élevé), ailes légèrement gonflées, taille marquée, nez en coin
  const ST = [
    { x: -3.5, w: 0.9, y0: 0.42, y1: 1.18, nt: 6, nb: 5 }, { x: -3.3, w: 1.0, y0: 0.33, y1: 1.34, nt: 6, nb: 5 }, { x: -2.2, w: 1.08, y0: 0.32, y1: 1.40, nt: 6, nb: 5 },
    { x: -1.0, w: 1.03, y0: 0.32, y1: 1.38, nt: 6, nb: 5 }, { x: 0.8, w: 1.02, y0: 0.32, y1: 1.36, nt: 6, nb: 5 }, { x: 2.1, w: 1.05, y0: 0.32, y1: 1.32, nt: 6, nb: 5 },
    { x: 3.0, w: 1.0, y0: 0.32, y1: 1.16, nt: 5, nb: 5 }, { x: 3.42, w: 0.94, y0: 0.35, y1: 0.92, nt: 5, nb: 5 }, { x: 3.56, w: 0.86, y0: 0.4, y1: 0.8, nt: 4, nb: 4 }];
  a.loft(ST, noir, { arches: a.archesDe(roues, 1.1, 0.08) });
  roues.forEach((r, i) => { const Ra = r.RW * 1.1 + 0.08; a.levre(noir, r, Ra + 0.03, 0.06, wAx[i] - 0.03, 0.32, 1.6); });
  // habitacle fastback : verre clair, intérieur gris, toit noir, montants
  const verreC = a.verreClair(0.8);
  const STc = [{ x: -2.45, w: 0.8, y0: 1.2, y1: 1.4, nt: 6, wt: 0.92 }, { x: -1.85, w: 0.92, y0: 1.2, y1: 1.72, nt: 7, wt: 0.94 }, { x: -0.9, w: 0.95, y0: 1.2, y1: 2.08, nt: 8, wt: 0.95 },
    { x: 0.25, w: 0.95, y0: 1.2, y1: 2.08, nt: 8, wt: 0.95 }, { x: 0.8, w: 0.92, y0: 1.2, y1: 1.72, nt: 7, wt: 0.94 }, { x: 1.35, w: 0.86, y0: 1.2, y1: 1.34, nt: 6, wt: 0.92 }];
  a.loft(STc, verreC, { nx: 70, ns: 40 });
  a.interieur(o.mat('#4a4d55', 0.8, 0.1), o.mat('#2a2c32', 0.7, 0.1), { xAv: 0.2, xAr: -0.95, y: 1.26, xTab: 0.85, hTab: 0.24, zs: [-0.38, 0.38], ht: 0.55 });
  const STt = [{ x: -1.05, w: 0.85, y0: 1.99, y1: 2.1, nt: 6 }, { x: -0.7, w: 0.9, y0: 2.02, y1: 2.14, nt: 7 }, { x: 0.15, w: 0.9, y0: 2.02, y1: 2.14, nt: 7 }, { x: 0.42, w: 0.85, y0: 1.99, y1: 2.1, nt: 6 }];
  a.loft(STt, noir, { nx: 40, ns: 40 });
  a.montants(STc, [[1.35, 1.34, 0.4, 2.06, 0.09], [-0.3, 1.36, -0.3, 2.1, 0.07], [-1.0, 2.06, -2.35, 1.42, 0.2], [-1.7, 1.8, -1.8, 1.36, 0.16]], noir, 0.015);
  for (const s of [-1, 1]) {
    const re = o.boite(0.26, 0.13, 0.2, noir, 1.1, 1.5, s * 1.12); re.rotation.y = s * 0.12; rig.push(re);
    o.boite(0.34, 0.025, 0.04, o.chrome, 0.1, 1.2, s * (a.flancAu(ST, 0.1, 1.2) + 0.01));
  }
  a.essuies([1.35, 1.34], [0.4, 2.06], 0.1);
  // capot : prise d'air grise décalée côté droit
  const yc = a.hautAu(ST, 2.3, 0.3);
  const sc = o.profil([[0.62, 0], [0.5, 0.16], [-0.5, 0.18], [-0.62, 0]], 0.62, o.mat('#5a5e66', 0.55, 0.3), { galbe: { avant: 0.3, arriere: 0.05, fruit: 0.1, bombe: 0.02, lAv: 0.4 }, biseau: 0.03 }); sc.position.set(2.3, yc - 0.03, 0.3);
  o.boite(0.05, 0.1, 0.46, sombre, 2.86, yc + 0.06, 0.3);
  // face avant en coin : calandre fendue, optiques composites, bouclier gris
  a.face((g, w, h) => {
    g.fillStyle = '#08090b'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3d44'; for (let j = 1; j < 4; j++) g.fillRect(0, j * h / 4 - 2, w, 4);
    g.fillStyle = '#f2f4f8'; g.fillStyle = '#c9ced6'; g.fillRect(w * 0.02, h * 0.15, w * 0.2, h * 0.7); g.fillRect(w * 0.78, h * 0.15, w * 0.2, h * 0.7);
  }, 1.5, 0.22, 3.565, 0.66, 0, 1, 512, 76);
  for (const s of [-1, 1]) {
    o.boite(0.04, 0.16, 0.32, lumBlanche, 3.57, 0.66, s * 0.56);
    o.boite(0.05, 0.05, 0.16, o.mat('#ffb12b', 0.4, 0.2), 3.48, 0.58, s * 0.84);
  }
  a.o.profil([[3.2, 0], [3.66, 0], [3.66, 0.2], [3.2, 0.24]], 1.9, gris, { galbe: { avant: 0.25, arriere: 0, fruit: 0.05, bombe: 0, lAv: 0.3 }, biseau: 0.03, y: 0.3 });
  // arrière : aileron biplan étagé, panneau de feux noir
  const yb = a.hautAu(ST, -3.0, 0.6);
  rig.push(o.profil([[0.36, 0], [0.33, 0.06], [-0.34, 0.16], [-0.36, 0.08]], 1.75, noir, { galbe: false, biseau: 0.02 })); rig[rig.length - 1].position.set(-2.95, yb + 0.36, 0);
  rig.push(o.profil([[0.3, 0], [0.28, 0.05], [-0.3, 0.12], [-0.32, 0.06]], 1.85, noir, { galbe: false, biseau: 0.02 })); rig[rig.length - 1].position.set(-3.1, yb + 0.04, 0);
  for (const s of [-1, 1]) a.forme([[0.4, -0.02], [0.4, 0.2], [-0.42, 0.44], [-0.42, -0.02]], 0.05, noir, 0).position.set(-3.0, yb, s * 0.9);
  a.face((g, w, h) => {
    g.fillStyle = '#0d0e11'; g.fillRect(0, 0, w, h); g.fillStyle = '#d42330';
    for (let i = 0; i < 3; i++) { g.fillRect(w * 0.04, h * (0.12 + i * 0.26), w * 0.38, h * 0.18); g.fillRect(w * 0.58, h * (0.12 + i * 0.26), w * 0.38, h * 0.18); }
  }, 1.55, 0.42, -3.505, 0.8, 0, -1, 512, 140);
  for (const s of [-1, 1]) o.boite(0.03, 0.1, 0.5, lumRouge, -3.51, 0.86, s * 0.5);
  a.o.profil([[-3.6, 0], [-3.25, 0], [-3.25, 0.22], [-3.6, 0.2]], 1.9, gris, { galbe: { avant: 0, arriere: 0.2, fruit: 0.05, bombe: 0, lAr: 0.3 }, biseau: 0.03, y: 0.3 });
  o.cyl(0.07, 0.07, 0.26, o.chrome, -3.6, 0.36, 0.5, 0, Math.PI / 2, 14);
  a.plaque(-3.62, 0.62, -1, '84');
  // flancs : bas de caisse gris, double filet vert, inscription générique
  const trous = roues.map((r) => ({ x: r.x, y: r.RW, r: r.RW * 1.1 + 0.1 }));
  a.drapeFlancs(ST, -3.5, 3.56, 0.32, 1.4, (g, w, h, d) => {
    const { X, Y } = d;
    g.fillStyle = '#555963'; g.fillRect(0, Y(0.6), w, h);
    g.fillStyle = '#41c56a'; g.fillRect(X(-3.4), Y(0.98), X(3.3) - X(-3.4), 0.06 * d.sy); g.fillRect(X(-3.4), Y(0.84), X(3.3) - X(-3.4), 0.035 * d.sy);
    g.fillStyle = '#9af0b3'; g.fillRect(X(-3.4), Y(0.9), X(3.3) - X(-3.4), 0.02 * d.sy);
    g.fillStyle = '#e8ecf1'; g.font = '800 40px Arial, sans-serif'; d.txt('TURBO 84', X(-0.9), Y(0.68), 'center');
  }, { cw: 2048, ch: 300, trous });
  // barème (catégorie A) : pavillon abaissé (2,14 → 1,64), caisse et voies élargies de 26 %, pneus à fleur
  const fin = a.finir(roues, { carte: [[0, 0], [1.18, 1.18], [2.14, 1.86]], sw: 1.26, rigides: rig, doublureMat: sombre, toit: { y: 2.14, x0: -0.7, x1: 0.15 } });
  ajourerPneus(ctx.chassis, roues);                                     // inspection des trains : aucun autocollant dans la gomme
  return { L: 7.3, largeur: fin.largeur, hauteur: fin.hauteur, xAvant: 3.66, xArriere: -3.6, roues };
}

/* ---- U03 : coupé 1977 noir, intérieur rouge, toit en T vitré, flammes orange sur le capot, filets orange, jantes à anneau rouge ---- */
function coupeFlammes77(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a.o, rig = [];
  const noir = o.lac('#1b1b1f', 0.3, 0.2), noirM = o.mat('#17171b', 0.55, 0.3), sombre = o.mat('#07080a', 0.9, 0.1), rouge = o.mat('#a8161d', 0.6, 0.15);
  const roues = [{ x: 2.25, RW: 0.55, ep: 0.56, avant: true }, { x: -2.25, RW: 0.57, ep: 0.68, avant: false }];
  const wAx = [1.1, 1.12];
  roues.forEach((r, i) => { r.z = wAx[i] - r.ep / 2 + 0.06; r.jante = '#1a1b20'; r.rayons = 'maille'; r.flanc = '#e5322d'; });
  // longue caisse 70s : capot interminable, ailes bombées aux essieux, taille resserrée, bec avant
  const ST = [
    { x: -3.72, w: 0.92, y0: 0.46, y1: 1.2, nt: 5 }, { x: -3.5, w: 1.02, y0: 0.34, y1: 1.38, nt: 5 }, { x: -2.25, w: 1.12, y0: 0.32, y1: 1.44, nt: 5 },
    { x: -1.1, w: 1.04, y0: 0.32, y1: 1.4, nt: 5 }, { x: 0.6, w: 1.03, y0: 0.32, y1: 1.38, nt: 5 }, { x: 2.25, w: 1.1, y0: 0.32, y1: 1.38, nt: 5 },
    { x: 3.2, w: 1.04, y0: 0.33, y1: 1.22, nt: 5 }, { x: 3.6, w: 0.98, y0: 0.36, y1: 1.08, nt: 4.5 }, { x: 3.78, w: 0.9, y0: 0.44, y1: 0.98, nt: 4 }];
  a.loft(ST, noir, { arches: a.archesDe(roues, 1.1, 0.08) });
  roues.forEach((r, i) => { const Ra = r.RW * 1.1 + 0.08; a.levre(noir, r, Ra + 0.03, 0.07, wAx[i] - 0.03, 0.34, 1.6); });
  // habitacle : verre clair, intérieur rouge, toit en T à deux panneaux vitrés
  const verreC = a.verreClair(0.8);
  const STc = [{ x: -2.55, w: 0.8, y0: 1.24, y1: 1.44, nt: 6, wt: 0.92 }, { x: -1.9, w: 0.92, y0: 1.24, y1: 1.74, nt: 7, wt: 0.94 }, { x: -0.95, w: 0.95, y0: 1.24, y1: 2.02, nt: 8, wt: 0.95 },
    { x: 0.35, w: 0.95, y0: 1.24, y1: 2.02, nt: 8, wt: 0.95 }, { x: 0.95, w: 0.92, y0: 1.24, y1: 1.7, nt: 7, wt: 0.94 }, { x: 1.5, w: 0.86, y0: 1.24, y1: 1.4, nt: 6, wt: 0.92 }];
  a.loft(STc, verreC, { nx: 70, ns: 40 });
  a.interieur(rouge, o.mat('#3a0c10', 0.7, 0.1), { xAv: 0.2, xAr: -1.0, y: 1.3, xTab: 1.0, hTab: 0.26, zs: [-0.4, 0.4], ht: 0.6 });
  const STt = [{ x: -1.1, w: 0.85, y0: 1.93, y1: 2.04, nt: 6 }, { x: -0.75, w: 0.9, y0: 1.96, y1: 2.08, nt: 7 }, { x: 0.25, w: 0.9, y0: 1.96, y1: 2.08, nt: 7 }, { x: 0.55, w: 0.85, y0: 1.93, y1: 2.04, nt: 6 }];
  a.loft(STt, noir, { nx: 40, ns: 40 });
  for (const z of [-0.4, 0.4]) o.boite(0.72, 0.03, 0.56, a.verreClair(0.7), -0.25, 2.07, z);          // panneaux du toit en T
  o.boite(0.9, 0.035, 0.12, noir, -0.25, 2.075, 0);                                                         // barre centrale du T
  a.montants(STc, [[1.5, 1.38, 0.5, 2.0, 0.09], [-0.45, 1.4, -0.45, 2.04, 0.07], [-1.05, 2.0, -2.45, 1.46, 0.22], [-1.8, 1.76, -1.9, 1.38, 0.18]], noir, 0.015);
  for (const s of [-1, 1]) {
    const re = o.boite(0.27, 0.14, 0.22, noir, 1.25, 1.55, s * 1.13); re.rotation.y = s * 0.1; rig.push(re);
    o.boite(0.32, 0.025, 0.04, o.chrome, 0.1, 1.24, s * (a.flancAu(ST, 0.1, 1.24) + 0.01));
  }
  a.essuies([1.5, 1.38], [0.5, 2.0], 0.1);
  // capot : écope « shaker » qui traverse le capot, flammes orange génériques
  const ys = a.hautAu(ST, 1.95, 0);
  o.profil([[0.42, 0], [0.32, 0.17], [-0.34, 0.19], [-0.42, 0]], 0.66, o.mat('#0c0c0f', 0.6, 0.2), { galbe: { avant: 0.2, arriere: 0.08, fruit: 0.1, bombe: 0.03 }, biseau: 0.03 }).position.set(1.95, ys - 0.04, 0);
  o.boite(0.06, 0.1, 0.46, sombre, 2.34, ys + 0.07, 0);
  a.drapeDessus(ST, 1.45, 3.75, -1.0, 1.0, (g, w, h, d) => {
    const { X, Z } = d;
    const langue = (z0, larg, xFin, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(X(3.7), Z(z0 - larg)); g.bezierCurveTo(X(2.9), Z(z0 - larg * 1.1), X(2.4), Z(z0 + larg * 0.3), X(xFin), Z(z0 + larg * 0.9)); g.bezierCurveTo(X(2.6), Z(z0 + larg * 0.4), X(3.0), Z(z0 + larg * 1.2), X(3.7), Z(z0 + larg)); g.closePath(); g.fill(); };
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { langue(s * (0.16 + i * 0.17), 0.1, 1.65 + i * 0.32, '#b8481c'); langue(s * (0.16 + i * 0.17), 0.06, 1.9 + i * 0.32, '#e8862e'); }
    g.fillStyle = '#e8862e'; g.fillRect(X(3.45), Z(-0.85), X(3.75) - X(3.45), Z(0.85) - Z(-0.85));
  }, { cw: 1024, ch: 512 });
  // museau en bec : deux calandres renfoncées, optiques rectangulaires, spoiler avant
  for (const s of [-1, 1]) {
    a.face((g, w, h) => { g.fillStyle = '#08090b'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a4d55'; for (let i = 1; i < 8; i++) g.fillRect(i * w / 8 - 2, 0, 4, h); g.strokeStyle = '#a8adb7'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }, 0.44, 0.2, 3.79, 0.6, s * 0.27, 1, 128, 64);
    a.face((g, w, h) => { g.fillStyle = '#050506'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a8f99'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6); }, 0.34, 0.22, 3.79, 0.8, s * 0.6, 1, 128, 80);
    o.boite(0.03, 0.15, 0.24, lumBlanche, 3.795, 0.8, s * 0.6);
    o.boite(0.06, 0.06, 0.2, o.mat('#ffb12b', 0.4, 0.2), 3.72, 0.5, s * 0.74);
  }
  o.boite(0.08, 0.36, 0.06, noir, 3.79, 0.68, 0);                                                        // bec central
  a.o.profil([[3.1, 0], [3.7, 0], [3.68, 0.14], [3.1, 0.18]], 2.0, noirM, { galbe: { avant: 0.3, arriere: 0, fruit: 0.05, bombe: 0, lAv: 0.3 }, biseau: 0.02, y: 0.3 });
  // poupe : becquet en queue de canard, feux à lamelles, échappements
  const yq = a.hautAu(ST, -3.4, 0);
  o.profil([[0.32, 0], [0.3, 0.05], [-0.32, 0.14], [-0.34, 0.05]], 1.9, noir, { galbe: { avant: 0, arriere: 0, fruit: 0, bombe: 0.02, lAv: 0.1, lAr: 0.1 }, biseau: 0.02 }).position.set(-3.45, yq - 0.05, 0);
  a.face((g, w, h) => { g.fillStyle = '#0e0e11'; g.fillRect(0, 0, w, h); g.fillStyle = '#c21c28'; for (let i = 0; i < 6; i++) { g.fillRect(w * 0.03, h * (0.1 + i * 0.14), w * 0.4, h * 0.08); g.fillRect(w * 0.57, h * (0.1 + i * 0.14), w * 0.4, h * 0.08); } }, 1.6, 0.4, -3.725, 0.88, 0, -1, 512, 128);
  for (const s of [-1, 1]) { o.boite(0.03, 0.1, 0.55, lumRouge, -3.73, 0.94, s * 0.5); o.cyl(0.07, 0.07, 0.28, o.chrome, -3.66, 0.4, s * 0.55, 0, Math.PI / 2, 14); }
  a.o.profil([[-3.82, 0], [-3.4, 0], [-3.4, 0.2], [-3.8, 0.18]], 1.95, noirM, { galbe: { avant: 0, arriere: 0.2, fruit: 0.05, bombe: 0, lAr: 0.3 }, biseau: 0.02, y: 0.32 });
  a.plaque(-3.84, 0.62, -1, '77');
  // flancs : filets orange, mention générique
  const trous = roues.map((r) => ({ x: r.x, y: r.RW, r: r.RW * 1.1 + 0.1 }));
  a.drapeFlancs(ST, -3.7, 3.7, 0.32, 1.44, (g, w, h, d) => {
    const { X, Y } = d;
    g.fillStyle = '#d06a2e'; g.fillRect(X(-3.55), Y(0.74), X(3.45) - X(-3.55), 0.08 * d.sy);
    g.fillStyle = '#b8481c'; g.fillRect(X(-3.55), Y(0.62), X(3.45) - X(-3.55), 0.035 * d.sy);
    g.fillStyle = '#d06a2e'; g.fillRect(X(-3.55), Y(1.06), X(3.45) - X(-3.55), 0.022 * d.sy);
    g.font = '900 36px Arial Black, Arial'; d.txt('T/A', X(-3.05), Y(0.9), 'left'); d.txt('6.6', X(2.6), Y(0.9), 'left');
  }, { cw: 2048, ch: 320, trous });
  // barème (catégorie A) : pavillon abaissé (2,08 → 1,65), caisse et voies élargies de 20 %, pneus à fleur
  const fin = a.finir(roues, { carte: [[0, 0], [1.22, 1.22], [2.085, 1.82]], sw: 1.2, rigides: rig, doublureMat: sombre, toit: { y: 2.085, x0: -0.75, x1: 0.25 } });
  ajourerPneus(ctx.chassis, roues);                                     // inspection des trains : aucun autocollant dans la gomme
  return { L: 7.6, largeur: fin.largeur, hauteur: fin.hauteur, xAvant: 3.78, xArriere: -3.84, roues };
}

/* ---- U04 : pick-up 1983 carré surbaissé (d'après les photos ; le guide parlait d'un 4x4 surélevé), graphite, filets dorés, calandre chromée ---- */
function pickupSurbaisse(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a.o, rig = [];
  const gris = o.lac('#4a4d4b', 0.3, 0.35), grisM = o.mat('#26282c', 0.6, 0.3), noirM = o.mat('#131417', 0.7, 0.2), sombre = o.mat('#07080a', 0.9, 0.1), chrome = o.chrome;
  const roues = [{ x: 2.55, RW: 0.56, ep: 0.52, avant: true }, { x: -2.2, RW: 0.58, ep: 0.64, avant: false }];
  const wAx = [1.08, 1.1];
  roues.forEach((r, i) => { r.z = wAx[i] - r.ep / 2 + 0.05; r.jante = '#17171b'; r.rayons = 'cinq'; r.flanc = '#d4a63a'; });
  const ar = a.archesDe(roues, 1.1, 0.08);
  // avant (capot + bas de cabine) : caisse carrée aux arêtes arrondies, aile avant légèrement gonflée
  const STa = [{ x: -0.62, w: 1.05, y0: 0.38, y1: 1.5, nt: 8, nb: 6 }, { x: 0.6, w: 1.04, y0: 0.38, y1: 1.5, nt: 8, nb: 6 }, { x: 1.6, w: 1.06, y0: 0.38, y1: 1.47, nt: 8, nb: 6 },
    { x: 2.55, w: 1.09, y0: 0.38, y1: 1.45, nt: 8, nb: 6 }, { x: 3.6, w: 1.07, y0: 0.38, y1: 1.43, nt: 8, nb: 6 }, { x: 3.95, w: 1.0, y0: 0.42, y1: 1.36, nt: 6, nb: 5 }];
  a.loft(STa, gris, { arches: [ar[0]] });
  // benne : caisson bas (plancher), ridelles découpées sur l'arche, paroi avant, hayon
  const STb = [{ x: -3.92, w: 0.56, y0: 0.44, y1: 0.98, nt: 8, nb: 6 }, { x: -2.2, w: 0.58, y0: 0.4, y1: 0.98, nt: 8, nb: 6 }, { x: -0.64, w: 0.58, y0: 0.4, y1: 0.98, nt: 8, nb: 6 }];
  a.loft(STb, grisM);
  const Rb = ar[1].R, ridelle = [[-3.92, 0.46], ...arco(-2.2, 0.58, Rb, 0.42), [-0.64, 0.42], [-0.64, 1.5], [-3.92, 1.5]];
  for (const s of [-1, 1]) {
    a.forme(ridelle, 0.2, gris, s * (1.04 - 0.1), 0.04);
    o.boite(3.3, 0.05, 0.16, grisM, -2.28, 1.52, s * 0.98);                                       // rebord de ridelle
  }
  o.boite(3.2, 0.04, 1.26, grisM, -2.28, 1.0, 0);                                                    // plancher de benne
  for (let i = 0; i < 5; i++) o.boite(3.1, 0.03, 0.06, o.mat('#24262a', 0.6, 0.3), -2.28, 1.035, -0.54 + i * 0.27);   // nervures
  for (const s of [-1, 1]) {                                                                         // passages de roues intérieurs : coiffe AU-DESSUS du pneu + joue verticale
    o.boite(1.56, 0.12, 0.42, grisM, -2.2, 1.3, s * 0.82);
    o.boite(1.56, 0.36, 0.04, grisM, -2.2, 1.18, s * 0.62);
  }
  o.boite(0.12, 0.54, 1.95, gris, -0.68, 1.24, 0);                                                  // paroi avant de benne
  o.boite(0.12, 0.58, 2.0, gris, -3.9, 1.2, 0);                                                     // hayon
  a.face((g, w, h) => { g.fillStyle = '#4a4d4b'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4a63a'; g.fillRect(0, h * 0.15, w, 4); g.fillRect(0, h * 0.85, w, 4); g.fillStyle = '#1a1b1e'; g.font = '900 54px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('8 3', w / 2, h * 0.64); }, 1.8, 0.5, -3.965, 1.2, 0, -1, 512, 142);
  roues.forEach((r, i) => { const Ra = r.RW * 1.1 + 0.08; a.levre(gris, r, Ra + 0.03, 0.06, wAx[i] - 0.04, i ? 0.42 : 0.38, 1.5); });
  // cabine : vitrage à tumblehome, toit, montants, lunette arrière verticale
  const STc = [{ x: -0.55, w: 0.96, y0: 1.4, y1: 2.24, nt: 8, wt: 0.96 }, { x: 0.85, w: 0.96, y0: 1.4, y1: 2.24, nt: 8, wt: 0.96 }, { x: 1.38, w: 0.93, y0: 1.4, y1: 1.52, nt: 8, wt: 0.96 }];
  a.loft(STc, a.verreClair(0.6), { nx: 40, ns: 40 });
  a.interieur(o.mat('#cbbfa5', 0.8, 0.1), o.mat('#bdb199', 0.7, 0.1), { xAv: 0.25, xAr: -0.2, y: 1.42, xTab: 0.95, hTab: 0.22, zs: [-0.4, 0.4], banquette: false, ht: 0.75 });
  const STt = [{ x: -0.6, w: 0.92, y0: 2.18, y1: 2.32, nt: 8 }, { x: 0.9, w: 0.92, y0: 2.18, y1: 2.32, nt: 8 }];
  a.loft(STt, gris, { nx: 20, ns: 36 });
  a.montants(STc, [[1.36, 1.5, 0.88, 2.22, 0.12], [0.2, 1.5, 0.2, 2.22, 0.08], [-0.5, 1.5, -0.52, 2.22, 0.16]], gris, 0.01);
  o.boite(0.06, 0.82, 1.9, gris, -0.58, 1.82, 0);
  o.boite(0.03, 0.5, 1.5, a.verreClair(0.7), -0.62, 1.9, 0);                                         // lunette arrière
  for (const s of [-1, 1]) {
    rig.push(o.boite(0.1, 0.28, 0.24, noirM, 1.18, 1.78, s * 1.16));                                // grands rétroviseurs rectangulaires
    a.barre3([1.25, 1.62, s * 1.0], [1.18, 1.7, s * 1.14], 0.03, 0.03, chrome);
    o.boite(0.3, 0.03, 0.04, chrome, 0.95, 1.36, s * (a.flancAu(STa, 0.95, 1.36) + 0.01));
  }
  a.essuies([1.36, 1.5], [0.88, 2.22], 0.12);
  // face avant : calandre chromée à grille, 4 optiques carrés, pare-chocs chromés
  a.face((g, w, h) => {
    g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9ced8'; g.lineWidth = 4;
    for (let i = 1; i < 20; i++) { g.beginPath(); g.moveTo(i * w / 20, 0); g.lineTo(i * w / 20, h); g.stroke(); }
    for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(0, j * h / 5); g.lineTo(w, j * h / 5); g.stroke(); }
    g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
  }, 1.0, 0.44, 3.96, 1.0, 0, 1, 512, 226);
  for (const s of [-1, 1]) {
    o.boite(0.05, 0.46, 0.42, chrome, 3.955, 1.0, s * 0.74);
    o.boite(0.04, 0.17, 0.32, lumBlanche, 3.975, 1.1, s * 0.74); o.boite(0.04, 0.17, 0.32, lumBlanche, 3.975, 0.89, s * 0.74);
    o.boite(0.05, 0.08, 0.2, o.mat('#ffb12b', 0.4, 0.2), 3.97, 0.7, s * 0.8);
    o.boite(0.05, 0.3, 0.2, lumRouge, -3.97, 1.18, s * 0.86);                                         // feux arrière verticaux
  }
  a.o.profil([[3.82, 0], [4.12, 0], [4.12, 0.24], [3.82, 0.24]], 2.12, chrome, { galbe: { avant: 0.12, arriere: 0, fruit: 0, bombe: 0, lAv: 0.15 }, biseau: 0.04, y: 0.42 });
  a.o.profil([[-4.12, 0], [-3.85, 0], [-3.85, 0.22], [-4.12, 0.22]], 2.1, chrome, { galbe: { avant: 0, arriere: 0.12, fruit: 0, bombe: 0, lAr: 0.15 }, biseau: 0.04, y: 0.5 });
  a.plaque(-4.13, 0.61, -1, '83');
  // capot : filets dorés
  a.drapeDessus(STa, 1.45, 3.9, -1.05, 1.05, (g, w, h, d) => { const { X, Z } = d; g.fillStyle = '#d4a63a'; for (const s of [-1, 1]) { g.fillRect(X(1.45), Z(s * 0.86) - 3, w, 6); g.fillRect(X(1.45), Z(s * 0.8) - 2, w, 3); } }, { cw: 1024, ch: 512 });
  // flancs : filets dorés (avant drapé, benne plane), mention générique
  const filets = (g, w, d, xa, xb) => {
    const { X, Y } = d; g.fillStyle = '#d4a63a';
    g.fillRect(X(xa), Y(1.4), X(xb) - X(xa), 0.022 * d.sy); g.fillRect(X(xa), Y(1.33), X(xb) - X(xa), 0.012 * d.sy);
    g.fillRect(X(xa), Y(0.92), X(xb) - X(xa), 0.02 * d.sy); g.fillRect(X(xa), Y(0.84), X(xb) - X(xa), 0.012 * d.sy);
  };
  a.drapeFlancs(STa, -0.62, 3.95, 0.38, 1.5, (g, w, h, d) => {
    filets(g, w, d, -0.6, 3.85);
    g.fillStyle = '#d4a63a'; g.beginPath(); g.moveTo(d.X(0.8), d.Y(1.0)); g.quadraticCurveTo(d.X(0.95), d.Y(1.15), d.X(0.85), d.Y(1.28)); g.quadraticCurveTo(d.X(1.15), d.Y(1.18), d.X(1.1), d.Y(1.0)); g.fill();
    g.fillStyle = '#e8ecf1'; g.font = '800 30px Arial, sans-serif'; d.txt('SLAMMED', d.X(-0.15), d.Y(0.74), 'left');
  }, { cw: 1600, ch: 300, trous: [{ x: 2.55, y: 0.56, r: ar[0].R + 0.08 }] });
  a.lateral((g, w, h, d) => {
    const dd = { sx: d.sx, sy: d.sy, X: (x) => (x + 3.92) * d.sx, Y: (y) => (1.5 - y) * d.sy };
    filets(g, w, dd, -3.85, -0.65);
  }, { w: 3.28, h: 0.62, x: -2.28, y: 1.19, zBas: 1.04 - 0.06 + 0.065, zHaut: 1.04 - 0.06 + 0.065, cw: 1024, ch: 200, trous: [{ x: -2.2, y: 0.58, r: Rb + 0.06 }] });
  // barème (catégorie C) : cabine abaissée (2,32 → 2,08), caisse et voies élargies de 15 %, pneus à fleur
  const fin = a.finir(roues, { carte: [[0, 0], [1.55, 1.55], [2.32, 2.12]], sw: 1.3, rigides: rig, doublureMat: sombre, toit: { y: 2.32, x0: -0.5, x1: 0.85 } });
  ajourerPneus(ctx.chassis, roues);                                     // inspection des trains : aucun autocollant dans la gomme
  return { L: 8.25, largeur: fin.largeur, hauteur: fin.hauteur, xAvant: 4.12, xArriere: -4.13, roues };
}

/* ---- U05 : muscle-car 1970 dorée, capot noir à prise d'air saillante, 4 phares ronds renfoncés, bandes orange et noires, n° 70 ---- */
function muscleCar70(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx), o = a.o, rig = [];
  const or = o.lac('#b8983e', 0.22, 0.5), noir = o.lac('#121316', 0.3, 0.3), noirM = o.mat('#17181c', 0.6, 0.3), sombre = o.mat('#07080a', 0.9, 0.1), chrome = o.chrome;
  const roues = [{ x: 2.3, RW: 0.52, ep: 0.58, avant: true }, { x: -2.1, RW: 0.545, ep: 0.74, avant: false }];
  const wAx = [1.1, 1.14];
  roues.forEach((r, i) => { r.z = wAx[i] - r.ep / 2 + 0.06; r.jante = '#16171b'; r.rayons = 'cinq'; r.flanc = null; r.etrier = '#e0682a'; });
  // caisse « bouteille de coca » : hanches arrière gonflées, taille creusée, long capot, face avant plate et large
  const ST = [
    { x: -3.78, w: 0.98, y0: 0.44, y1: 1.24, nt: 6, nb: 5 }, { x: -3.56, w: 1.06, y0: 0.34, y1: 1.42, nt: 6, nb: 5 }, { x: -2.1, w: 1.15, y0: 0.32, y1: 1.5, nt: 6, nb: 5 },
    { x: -1.0, w: 1.06, y0: 0.32, y1: 1.45, nt: 6, nb: 5 }, { x: 0.8, w: 1.05, y0: 0.32, y1: 1.43, nt: 6, nb: 5 }, { x: 2.3, w: 1.1, y0: 0.32, y1: 1.43, nt: 6, nb: 5 },
    { x: 3.3, w: 1.08, y0: 0.33, y1: 1.36, nt: 6, nb: 5 }, { x: 3.7, w: 1.04, y0: 0.37, y1: 1.24, nt: 6, nb: 5 }, { x: 3.86, w: 0.98, y0: 0.42, y1: 1.15, nt: 5, nb: 5 }];
  a.loft(ST, or, { arches: a.archesDe(roues, 1.1, 0.08) });
  roues.forEach((r, i) => { const Ra = r.RW * 1.1 + 0.08; a.levre(or, r, Ra + 0.02, 0.05, wAx[i] - 0.04, 0.5, 1.4); });
  // habitacle hardtop : verre, intérieur noir, toit doré, large montant C
  const STc = [{ x: -1.75, w: 0.93, y0: 1.32, y1: 1.98, nt: 7, wt: 0.94 }, { x: -1.05, w: 0.95, y0: 1.32, y1: 2.12, nt: 8, wt: 0.95 },
    { x: 0.35, w: 0.95, y0: 1.32, y1: 2.12, nt: 8, wt: 0.95 }, { x: 0.8, w: 0.92, y0: 1.32, y1: 1.84, nt: 7, wt: 0.94 }, { x: 1.25, w: 0.86, y0: 1.32, y1: 1.47, nt: 6, wt: 0.92 }];
  a.loft(STc, a.verreClair(0.7), { nx: 70, ns: 40 });
  a.interieur(o.mat('#1c1d22', 0.8, 0.1), o.mat('#15161a', 0.7, 0.1), { xAv: 0.05, xAr: -1.15, y: 1.38, xTab: 0.85, hTab: 0.26, zs: [-0.42, 0.42], ht: 0.6 });
  const STt = [{ x: -1.2, w: 0.86, y0: 2.03, y1: 2.14, nt: 6 }, { x: -0.9, w: 0.92, y0: 2.06, y1: 2.18, nt: 7 }, { x: 0.25, w: 0.92, y0: 2.06, y1: 2.18, nt: 7 }, { x: 0.5, w: 0.88, y0: 2.03, y1: 2.14, nt: 6 }];
  a.loft(STt, or, { nx: 40, ns: 40 });
  a.montants(STc, [[1.23, 1.45, 0.45, 2.1, 0.1]], or, 0.015);
  // custode pleine dorée (large montant C en voile) qui file en pente douce jusqu'au coffre ; lunette fumée sur la pente
  const STq = [{ x: -2.5, w: 0.84, y0: 1.32, y1: 1.5, nt: 6, wt: 0.92 }, { x: -2.0, w: 0.92, y0: 1.32, y1: 1.8, nt: 7, wt: 0.94 },
    { x: -1.45, w: 0.955, y0: 1.32, y1: 2.08, nt: 8, wt: 0.95 }, { x: -1.25, w: 0.955, y0: 1.32, y1: 2.12, nt: 8, wt: 0.95 }];
  a.loft(STq, or, { nx: 40, ns: 40 });
  const l0 = [-2.4, 1.6], l1 = [-1.3, 2.1], ll = Math.hypot(l1[0] - l0[0], l1[1] - l0[1]);
  const lu = o.boite(ll, 0.02, 1.5, o.verre, (l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2 + 0.005, 0); lu.rotation.z = Math.atan2(l1[1] - l0[1], l1[0] - l0[0]);
  for (const s of [-1, 1]) {
    rig.push(o.cyl(0.06, 0.09, 0.2, chrome, 1.0, 1.52, s * 1.08, 0, Math.PI / 2, 12));                // rétroviseur de course
    o.boite(0.34, 0.025, 0.04, chrome, 0.35, 1.3, s * (a.flancAu(ST, 0.35, 1.3) + 0.01));
  }
  a.essuies([1.23, 1.45], [0.45, 2.1], 0.1);
  // capot noir : prise d'air saillante centrale, épingles
  a.drapeDessus(ST, 1.25, 3.86, -0.92, 0.92, (g, w, h, d) => {
    const { X, Z } = d; g.fillStyle = '#0d0e11'; g.fillRect(0, Z(-0.9), w, Z(0.9) - Z(-0.9));
    g.fillStyle = '#e0682a'; g.fillRect(0, Z(-0.9), w, 8); g.fillRect(0, Z(0.9) - 8, w, 8);
  }, { cw: 1024, ch: 512 });
  const yh = a.hautAu(ST, 2.5, 0);
  o.profil([[0.7, 0], [0.55, 0.2], [-0.6, 0.24], [-0.72, 0]], 0.62, o.mat('#141518', 0.8, 0.05), { galbe: { avant: 0.25, arriere: 0.1, fruit: 0.15, bombe: 0.03, lAv: 0.4 }, biseau: 0.04 }).position.set(2.5, yh - 0.04, 0);
  o.boite(0.06, 0.12, 0.42, sombre, 3.16, yh + 0.1, 0);
  for (const s of [-1, 1]) o.cyl(0.03, 0.03, 0.04, chrome, 3.5, a.hautAu(ST, 3.5, 0.6) + 0.01, s * 0.6, 0, 0, 10);
  // face avant : calandre noire pleine largeur encadrée de la tôle dorée, 4 phares ronds RENFONCÉS dans des puits sombres,
  // pare-chocs chromé fin qui épouse le bas de la face (aucune lame ne dépasse)
  const chromeS = o.mat('#a9b0ba', 0.16, 0.95);       // chrome « fumé » : se lit comme du métal, pas comme une pièce blanche
  const xF = 3.86;
  a.face((g, w, h) => {
    g.fillStyle = '#08090b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#30343b'; g.lineWidth = 3;
    for (let i = 1; i < 34; i++) { g.beginPath(); g.moveTo(i * w / 34, h * 0.12); g.lineTo(i * w / 34, h * 0.88); g.stroke(); }
    g.strokeStyle = '#8d939c'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#8d939c'; g.fillRect(w * 0.47, h * 0.3, w * 0.06, h * 0.4);
  }, 1.84, 0.42, xF + 0.004, 0.86, 0, 1, 512, 118);
  for (const s of [-1, 1]) for (const z of [0.46, 0.74]) {
    const pu = a.mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.1, 24), sombre, xF - 0.08, 0.86, s * z); pu.rotation.z = Math.PI / 2;   // puits
    const ce = a.mesh(new THREE.TorusGeometry(0.118, 0.016, 8, 24), chromeS, xF + 0.012, 0.86, s * z); ce.rotation.y = Math.PI / 2;   // cerclage
    const op = a.mesh(new THREE.SphereGeometry(0.095, 18, 12), lumBlanche, xF - 0.02, 0.86, s * z); op.scale.set(0.25, 1, 1);           // optique en retrait
    rig.push(pu, ce, op);                                                                                                               // restent ronds à l'élargissement
  }
  o.profil([[xF - 0.06, 0], [xF + 0.07, 0], [xF + 0.09, 0.05], [xF + 0.07, 0.1], [xF - 0.06, 0.1]], 2.04, chromeS, { galbe: { avant: 0.12, arriere: 0, fruit: 0, bombe: 0, lAv: 0.2 }, biseau: 0.02, y: 0.52 });
  // poupe : bandeau de feux pleine largeur, pare-chocs, échappements, becquet
  a.face((g, w, h) => { g.fillStyle = '#101114'; g.fillRect(0, 0, w, h); g.fillStyle = '#c21c28'; g.fillRect(w * 0.03, h * 0.2, w * 0.94, h * 0.6); g.fillStyle = '#d6dae2'; g.fillRect(w * 0.49, h * 0.1, w * 0.02, h * 0.8); }, 1.7, 0.3, -3.785, 1.0, 0, -1, 512, 96);
  o.boite(0.03, 0.1, 1.5, lumRouge, -3.79, 1.0, 0);
  o.profil([[-3.87, 0], [-3.72, 0], [-3.72, 0.1], [-3.87, 0.1], [-3.89, 0.05]], 2.0, chromeS, { galbe: { avant: 0, arriere: 0.12, fruit: 0, bombe: 0, lAr: 0.2 }, biseau: 0.02, y: 0.56 });
  for (const s of [-1, 1]) o.cyl(0.07, 0.07, 0.26, chromeS, -3.82, 0.42, s * 0.55, 0, Math.PI / 2, 14);
  const yq = a.hautAu(ST, -3.5, 0);
  o.profil([[0.28, 0], [0.26, 0.05], [-0.28, 0.12], [-0.3, 0.04]], 1.8, noir, { galbe: false, biseau: 0.02 }).position.set(-3.5, yq - 0.04, 0);
  a.plaque(-3.8, 0.78, -1, '70');
  // flancs : bandes orange/noires plongeantes, rond n° 70, mention générique
  const trous = roues.map((r) => ({ x: r.x, y: r.RW, r: r.RW * 1.1 + 0.1 }));
  a.drapeFlancs(ST, -3.78, 3.86, 0.32, 1.5, (g, w, h, d) => {
    const { X, Y } = d;
    const bande = (y0, y1, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(X(-3.75), Y(y0 + 0.28)); g.bezierCurveTo(X(-3.0), Y(y0 + 0.3), X(-2.4), Y(y0), X(-1.4), Y(y0)); g.lineTo(X(3.7), Y(y0)); g.lineTo(X(3.7), Y(y1)); g.lineTo(X(-1.4), Y(y1)); g.bezierCurveTo(X(-2.4), Y(y1), X(-3.0), Y(y1 + 0.3), X(-3.75), Y(y1 + 0.28)); g.closePath(); g.fill(); };
    bande(0.58, 0.66, '#e0682a'); bande(0.69, 0.82, '#121316'); bande(0.85, 0.9, '#e0682a');
    g.fillStyle = '#f4f2ea'; g.beginPath(); g.ellipse(X(-0.25), Y(1.1), 0.3 * d.sx, 0.26 * d.sy, 0, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#121316'; g.stroke();
    g.fillStyle = '#121316'; g.font = `italic 900 ${Math.round(0.36 * d.sy)}px Arial Black, Arial`; d.txt('70', X(-0.25), Y(1.1) + 0.13 * d.sy, 'center');
    g.font = '800 26px Arial, sans-serif'; d.txt('RACING', X(2.0), Y(1.02), 'left');
  }, { cw: 2048, ch: 320, trous });
  // barème (catégorie A) : pavillon abaissé (2,18 → 1,64), caisse et voies élargies de 24 %, pneus à fleur
  const fin = a.finir(roues, { carte: [[0, 0], [1.3, 1.3], [2.18, 1.84]], sw: 1.24, rigides: rig, doublureMat: sombre, toit: { y: 2.18, x0: -0.9, x1: 0.25 } });
  ajourerPneus(ctx.chassis, roues);                                     // inspection des trains : aucun autocollant dans la gomme
  return { L: 7.85, largeur: fin.largeur, hauteur: fin.hauteur, xAvant: 3.96, xArriere: -3.89, roues };
}

export const GROUPE_8 = { TK06: gtTurquoise, U01: crossoverRallye, U02: coupeTurbo84, U03: coupeFlammes77, U04: pickupSurbaisse, U05: muscleCar70 };
