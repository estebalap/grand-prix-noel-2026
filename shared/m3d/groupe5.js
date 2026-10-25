/**
 * Groupe 5 : H03 H04 H05 H06 H07 H08 H09 H10 H11 — modèles 3D sur mesure d'après les photos.
 * Repère : avant = +x, sol y = 0, z = largeur. Motifs et textes génériques uniquement.
 */
import { outils } from './outils.js';
import { aide } from './aide_5.js';

/* ------------------------------------------------------------------ H03 : break noir à vitres jaunes translucides, becquet de toit, capot à prise d'air */
function breakDragon(ctx) {
  // famille compacte/break (BRIEF10) : voies élargies (×1,17 en z), pavillon remonté (H_toit ≈ 0,72 W), ailes rehaussées au-dessus des pneus
  const KZ = 1.17, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const noir = o.lac('#141519', 0.3, 0.3), noirM = o.mat('#0c0d10', 0.7, 0.2), gris = o.mat('#55585f', 0.45, 0.4), grisC = o.mat('#8a8e96', 0.4, 0.5);
  const jauneT = a.translucide('#f0c400', 0.72, 0.22);
  const xr = -2.25, xv = 2.3, RW = 0.6;
  const zr = 0.93, roues = [{ x: xr, RW, ep: 0.56, z: zr, avant: false, jante: '#17181c', rayons: 'cinq', flanc: null, etrier: '#2a2b30' }, { x: xv, RW, ep: 0.52, z: zr, avant: true, jante: '#17181c', rayons: 'cinq', flanc: null, etrier: '#2a2b30' }];
  // caisse basse : flancs droits de break, ailes gonflées au droit des essieux, taille creusée aux portières
  const S = (x, w, y0, y1, nt = 5, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const C = a.corps([S(-3.68, 0.86, 0.56, 1.14, 3), S(-3.5, 1.0, 0.42, 1.33), S(-2.25, 1.03, 0.4, 1.39), S(0, 1.01, 0.4, 1.35), S(2.3, 1.03, 0.4, 1.38), S(3.4, 1.0, 0.42, 1.3), S(3.74, 0.86, 0.52, 1.1, 3)], noir,
    { ailes: [{ x: xr, R: RW + 0.15, dw: 0.08, yH: 1.3 }, { x: xv, R: RW + 0.15, dw: 0.07, yH: 1.27 }], taille: { x0: -1.55, x1: 1.65, dw: 0.04, y0: 0.45, y1: 1.25 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, RW, RW, r.z, r.ep * 0.9, noirM, r.avant);
  // serre jaune translucide : break à pavillon long, hayon presque vertical
  const yt = 1.92;                                                                                  // pavillon de break compact (sommet à yt + 0,07 ≈ 0,72 W, mesure photo)
  a.serre({ xs: [-3.48, -3.3, 0.8, 1.95], yb: 1.31, yt, wb: 0.96, rt: 0.93, verre: jauneT, peint: noir, montants: [-0.45, -1.95], pente: 0.06, ep: 0.07, ntToit: 7 });
  // becquet de pavillon : plan relevé et dérives
  a.boiteInc(0.95, 0.07, 1.86, noir, -3.55, yt + 0.15, 0, 0.12);
  for (const z of [-1, 1]) a.boiteInc(0.8, 0.2, 0.06, noirM, -3.45, yt + 0.09, z * 0.9, 0.12);
  // galerie basse : deux rails
  for (const z of [-1, 1]) o.boite(3.4, 0.05, 0.07, noirM, -1.55, yt + 0.1, z * 0.74);
  // deux feux de toit jaunes translucides
  for (const z of [-0.36, 0.36]) a.mesh(new THREE.BoxGeometry(0.42, 0.15, 0.3), jauneT, 0.55, yt + 0.13, z).rotation.z = -0.3;
  // capot : bossage et prise d'air à ouïes, évents d'ailes jaunes
  const yc = C.haut(2.6, 0);
  o.profil([[1.95, yc - 0.05], [2.05, yc + 0.12], [3.0, yc + 0.1], [3.15, yc - 0.05]], 0.95, noir, { galbe: { avant: 0.2, arriere: 0.1, fruit: 0.2, bombe: 0.1 }, biseau: 0.05 });
  for (let i = 0; i < 3; i++) o.boite(0.08, 0.05, 0.6, noirM, 2.3 + i * 0.22, yc + 0.13, 0);
  for (const z of [-1, 1]) { a.boiteInc(0.42, 0.16, 0.18, jauneT, 1.6, C.haut(1.6, 0.75) + 0.04, z * 0.72, -0.4); o.boite(0.36, 0.04, 0.16, noirM, 3.0, C.haut(3.0, 0.7) + 0.01, z * 0.68); }
  // face avant : rampe jaune translucide, phares, bouclier gris
  o.boite(0.16, 0.3, 1.5, jauneT, 3.72, 0.92, 0);
  o.phares(3.78, 0.94, [-0.55, 0.55], 0.15, lumBlanche);
  o.boite(0.3, 0.2, 1.7, gris, 3.66, 0.6, 0);
  // arrière : bandeau de feux, bouclier
  o.boite(0.08, 0.2, 1.5, lumRouge, -3.66, 1.12, 0);
  o.boite(0.3, 0.2, 1.7, gris, -3.62, 0.6, 0);
  // bas de caisse gris
  for (const z of [-1, 1]) o.boite(2.9, 0.12, 0.08, grisC, 0.0, 0.5, z * 0.97);
  // autocollants drapés : panneau gris « 009X », chevrons jaunes de danger, croix et pastilles
  a.drapeFlancsC(C, -3.45, 3.55, 0.5, 1.32, (g, w, h) => {
    const X = (x) => (x + 3.45) / 7.0 * w, Y = (y) => (1.32 - y) / 0.82 * h;
    g.fillStyle = '#9da0a7'; g.fillRect(X(-0.4), Y(1.27), X(1.25) - X(-0.4), Y(0.98) - Y(1.27));
    g.fillStyle = '#16171b'; g.font = '900 ' + Math.round(h * 0.3) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('009X', X(-0.3), Y(1.12));
    g.fillStyle = '#16171b'; g.fillRect(X(-0.4), Y(0.96), X(1.25) - X(-0.4), Y(0.6) - Y(0.96));
    g.fillStyle = '#f2d21e';
    for (let i = 0; i < 4; i++) { const x0 = X(-0.3 + i * 0.4); g.beginPath(); g.moveTo(x0 + 0.18 * w / 7, Y(0.93)); g.lineTo(x0 + 0.36 * w / 7, Y(0.93)); g.lineTo(x0 + 0.18 * w / 7, Y(0.63)); g.lineTo(x0, Y(0.63)); g.closePath(); g.fill(); }
    g.strokeStyle = '#e8e9ec'; g.lineWidth = 4;
    for (const x of [-1.2, -0.9]) { g.beginPath(); g.moveTo(X(x), Y(1.25)); g.lineTo(X(x + 0.18), Y(1.08)); g.moveTo(X(x + 0.18), Y(1.25)); g.lineTo(X(x), Y(1.08)); g.stroke(); }
    g.fillStyle = '#c4c7ce'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(X(-1.15 + i * 0.12), Y(0.98 - j * 0.1), 4, 0, 7); g.fill(); }
    g.fillStyle = '#3a3c42'; g.fillRect(X(-1.5), Y(0.86), X(-0.45) - X(-1.5), Y(0.62) - Y(0.86));
  }, 1024, 120, 0.02, (x) => C.haut(x, 0) - 0.01);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 7.5, largeur: 2.1 * KZ, hauteur: 1.95, xAvant: 3.8, xArriere: -3.7, roues, plafond: 0.79 };   // fantaisie : rapport mesuré sur la sculpture validée (break-dragon haut)
}

/* ------------------------------------------------------------------ H04 : coupé musclé orange, long capot bombé, fastback, becquet de queue */
function coupeVengeur(ctx) {
  // famille coupé bas (BRIEF10, photo ≈ 0,59) : voies élargies (×1,12 en z), ailes gonflées à fleur et rehaussées au-dessus des pneus, H_toit ≈ 0,60 W
  const KZ = 1.12, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const orange = o.lac('#f05a0e', 0.25, 0.1), noir = o.lac('#15171c', 0.3, 0.2), noirM = o.mat('#101114', 0.6, 0.3);
  const xr = -2.3, xv = 2.35;
  const roues = [{ x: xr, RW: 0.64, ep: 0.7, z: 0.98, avant: false, jante: '#15171c', rayons: 'cinq', flanc: '#d9a441', etrier: '#2a2b30' },
    { x: xv, RW: 0.6, ep: 0.6, z: 0.98, avant: true, jante: '#15171c', rayons: 'cinq', flanc: '#d9a441', etrier: '#2a2b30' }];
  const S = (x, w, y0, y1, nt = 3.4, nb = 4) => ({ x, w, y0, y1, nt, nb });
  // caisse basse arrondie : hanches arrière très marquées, taille de guêpe aux portières, museau haut et rond
  const C = a.corps([S(-3.75, 0.84, 0.62, 1.3, 2.6), S(-3.55, 1.0, 0.42, 1.47, 4.5), S(-2.3, 1.06, 0.4, 1.47, 5), S(-0.6, 1.04, 0.4, 1.33, 6), S(1.0, 1.04, 0.4, 1.32, 6), S(2.35, 1.04, 0.42, 1.36, 5), S(3.45, 0.98, 0.46, 1.24, 4), S(3.8, 0.84, 0.54, 1.07, 2.6)], orange,
    { ailes: [{ x: xr, R: 0.8, dw: 0.2, yH: 1.36 }, { x: xv, R: 0.75, dw: 0.19, yH: 1.28 }], taille: { x0: -1.5, x1: 1.6, dw: 0.05, y0: 0.45, y1: 1.26 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, r.RW, r.RW, r.z, r.ep * 0.9, noirM, r.avant);
  // serre fastback basse, pavillon pincé (tumblehome marqué)
  // pavillon (sommet 1,75 ≈ 0,60 W, mesure photo) : ceinture remontée au-dessus des pneus AR, pare-brise couché, toit plat large
  a.serre({ xs: [-2.6, -1.05, 0.0, 1.25], yb: 1.32, yt: 1.68, wb: 0.98, rt: 0.97, verre: o.verre, peint: orange, montants: [-0.75], pente: 0.25, ep: 0.08, ntToit: 6 });
    // capot : bossage central bombé, ouïes noires
  o.profil([[0.95, 1.26], [1.2, 1.4], [3.0, 1.38], [3.5, 1.2]], 0.9, orange, { galbe: { avant: 0.3, arriere: 0.2, fruit: 0.25, bombe: 0.06, lAv: 0.3 }, biseau: 0.05 });
  // becquet de queue relevé
  o.profil([[-3.78, 1.36], [-3.84, 1.6], [-3.3, 1.54], [-2.9, 1.46]], 1.86, orange, { galbe: { avant: 0.05, arriere: 0.12, fruit: 0.1, bombe: 0.05 }, biseau: 0.05 });
  o.boite(0.06, 0.16, 1.5, lumRouge, -3.77, 1.12, 0);
  // face avant : calandre noire en retrait, optiques encastrées, lame noire
  o.boite(0.16, 0.3, 1.45, noirM, 3.76, 0.86, 0);
  for (let i = 0; i < 3; i++) o.boite(0.04, 0.03, 1.4, o.mat('#30333a', 0.4, 0.5), 3.84, 0.76 + i * 0.09, 0);
  o.phares(3.8, 0.88, [-0.58, 0.58], 0.12, lumBlanche);
  o.boite(0.42, 0.12, 1.85, noir, 3.6, 0.48, 0);
  o.boite(0.4, 0.14, 1.85, noir, -3.55, 0.5, 0);
  for (const z of [-1, 1]) o.boite(3.2, 0.14, 0.1, noir, 0.05, 0.47, z * 0.96);
  // ouïes chromées derrière la roue avant
  for (const z of [-1, 1]) for (let i = 0; i < 4; i++) o.boite(0.2, 0.035, 0.03, o.chrome, 1.4, 0.68 + i * 0.09, z * (C.flanc(1.4, 0.8) + 0.01));
  // livrée : bandes noires effilées (aile avant → portière), panneau de custode noir
  a.drapeFlancsC(C, -3.6, 3.7, 0.5, 1.4, (g, w, h) => {
    const X = (x) => (x + 3.6) / 7.3 * w, Y = (y) => (1.4 - y) / 0.9 * h;
    g.fillStyle = '#15171c';
    g.beginPath(); g.moveTo(X(3.2), Y(1.3)); g.lineTo(X(1.0), Y(1.2)); g.lineTo(X(0.1), Y(1.05)); g.lineTo(X(0.2), Y(0.98)); g.lineTo(X(1.2), Y(1.08)); g.lineTo(X(3.0), Y(1.22)); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(X(1.15), Y(1.0)); g.lineTo(X(0.95), Y(0.62)); g.lineTo(X(0.55), Y(0.62)); g.lineTo(X(0.75), Y(0.98)); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(X(-3.3), Y(1.3)); g.lineTo(X(-2.0), Y(1.34)); g.lineTo(X(-1.6), Y(1.15)); g.lineTo(X(-1.75), Y(0.95)); g.lineTo(X(-2.15), Y(1.12)); g.lineTo(X(-3.2), Y(1.18)); g.closePath(); g.fill();
    g.fillStyle = '#2b4f8f'; g.fillRect(X(-3.1), Y(1.29), X(-2.2) - X(-3.1), 4);
  }, 1024, 128);
  // bandes noires de capot, de part et d'autre du bossage
  a.drapeDessus(C, 1.5, 3.6, -0.95, 0.95, (g, w, h) => {
    g.fillStyle = '#15171c';
    for (const s of [0.17, 0.83]) { g.beginPath(); g.moveTo(0, h * s); g.lineTo(w * 0.75, h * (s + (s < 0.5 ? 0.08 : -0.08))); g.lineTo(w * 0.7, h * (s + (s < 0.5 ? 0.15 : -0.15))); g.lineTo(0, h * (s + (s < 0.5 ? 0.09 : -0.09))); g.closePath(); g.fill(); }
  }, 512, 256);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 7.6, largeur: 2.2 * KZ, hauteur: 1.7, xAvant: 3.85, xArriere: -3.8, roues };
}

/* ------------------------------------------------------------------ H05 : fourgonnette kei blanche, bas de caisse noir, toit ouvrant, grand aileron */
function fourgonKei(ctx) {
  // famille van haut (BRIEF10, photo ≈ 0,95) : voies élargies (×1,2 en z), pavillon à 2,59 (≈ 0,95 W), toit large et plat
  const KZ = 1.2, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const blanc = o.lac('#f1f2f4', 0.22, 0.05), noir = o.lac('#16171b', 0.4, 0.15), noirM = o.mat('#0e0f12', 0.6, 0.3), gris = o.mat('#767b85', 0.5, 0.4);
  const verre = a.translucide('#2f8496', 0.88, 0.1);
  const xr = -2.2, xv = 2.2, RW = 0.55;
  const roues = [{ x: xr, RW, ep: 0.52, z: 0.9, avant: false, jante: '#d9ac3e', rayons: 'cinq', flanc: null, sansFrein: true }, { x: xv, RW, ep: 0.5, z: 0.9, avant: true, jante: '#d9ac3e', rayons: 'cinq', flanc: null, sansFrein: true }];
  // soubassement noir lofté : ailes bombées au droit des roues
  const S = (x, w, y0, y1, nt = 6, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const B = a.corps([S(-3.32, 0.92, 0.44, 1.12, 4), S(-3.15, 1.05, 0.36, 1.26), S(0, 1.03, 0.36, 1.26), S(3.12, 1.05, 0.36, 1.26), S(3.32, 0.92, 0.44, 1.14, 4)], noir,
    { ailes: [{ x: xr, R: 0.7, dw: 0.07, yH: 1.2 }, { x: xv, R: 0.7, dw: 0.07, yH: 1.2 }], taille: { x0: -1.4, x1: 1.4, dw: 0.03, y0: 0.4, y1: 1.2 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, RW, RW, r.z, r.ep * 0.9, noirM, r.avant);
  // caisse blanche arrière : flancs rentrants (tumblehome), pavillon bombé
  const U = (x, w, y1, wt = 0.86) => ({ x, w, y0: 1.22 - (y1 - 1.22), y1, nt: 6, nb: 2, wt });
  // pavillon remonté (BRIEF10, famille van haut ≈ 0,95 W) ; bas du volume blanc arrêté sur le soubassement (rien ne descend dans les passages de roues)
  const H = a.corps([U(-3.27, 0.95, 2.4, 0.91), U(-3.12, 1.03, 2.5, 0.91), U(1.42, 1.03, 2.52, 0.91), U(1.5, 1.03, 1.64, 0.97), U(3.1, 1.03, 1.64, 0.97), U(3.32, 0.94, 1.56, 0.97)], blanc, {}, { nx: 90, ymin: 1.2 });
  // cabine avant vitrée : pare-brise incliné, montants blancs
  a.serre({ xs: [1.3, 1.34, 2.2, 3.15], yb: 1.62, yt: 2.52, wb: 1.02, rt: 0.91, verre, peint: blanc, montants: [], ep: 0.08, nt: 6, ntToit: 6 });
  // nez blanc sous le pare-brise, phares ronds, calandre et bouclier gris
  o.profil([[2.95, 1.0], [2.95, 1.64], [3.22, 1.58], [3.38, 1.3], [3.38, 1.0]], 1.86, blanc, { galbe: { avant: 0.12, arriere: 0, fruit: 0.06, bombe: 0, lAv: 0.4 }, biseau: 0.05 });
  o.phares(3.4, 1.36, [-0.7, 0.7], 0.17, lumBlanche);
  o.boite(0.08, 0.16, 0.8, gris, 3.42, 1.36, 0);
  o.boite(0.36, 0.16, 2.05, gris, 3.36, 0.56, 0);
  for (let i = 0; i < 3; i++) o.boite(0.04, 0.035, 1.3, noirM, 3.36, 0.8 + i * 0.09, 0);
  // toit ouvrant vitré en relief
  o.boite(2.2, 0.06, 1.2, blanc, -0.5, 2.53, 0); o.boite(1.9, 0.06, 0.98, verre, -0.5, 2.555, 0);
  // grand aileron arrière : plan, flasques, jambes
  a.boiteInc(1.15, 0.1, 2.1, blanc, -3.35, 2.78, 0, 0.08);
  for (const z of [-1, 1]) { o.profil([[-3.95, 2.63], [-3.95, 2.9], [-2.85, 2.86], [-2.75, 2.63]], 0.07, blanc, { galbe: false, biseau: 0.02 }).position.z = z * 1.05; a.boiteInc(0.12, 0.26, 0.1, blanc, -3.0, 2.61, z * 0.6, -0.3); }
  o.boite(0.06, 0.2, 0.3, lumRouge, -3.36, 1.4, 0.75); o.boite(0.06, 0.2, 0.3, lumRouge, -3.36, 1.4, -0.75);
  o.boite(0.36, 0.16, 2.05, gris, -3.36, 0.56, 0);
  // livrée de la caisse blanche : bandes cuivre, panneau noir « GX », chevrons bleu ciel
  a.drapeFlancsC(H, -3.15, 1.4, 1.62, 2.41, (g, w, h) => {
    const X = (x) => (x + 3.15) / 4.55 * w, Y = (y) => (2.3 - y) / 1.05 * h;                       // livrée posée dans la moitié haute du volume blanc
    g.fillStyle = '#a9cfe3'; g.beginPath(); g.moveTo(X(-3.1), Y(2.0)); g.lineTo(X(-2.6), Y(2.0)); g.lineTo(X(-3.0), Y(1.3)); g.lineTo(X(-3.1), Y(1.3)); g.closePath(); g.fill();
    g.fillStyle = '#b8834c'; g.beginPath(); g.moveTo(X(-2.5), Y(2.25)); g.lineTo(X(-2.0), Y(2.25)); g.lineTo(X(-1.4), Y(1.5)); g.lineTo(X(-1.9), Y(1.5)); g.closePath(); g.fill();
    g.fillRect(X(-1.6), Y(1.5), X(1.4) - X(-1.6), Y(1.38) - Y(1.5));
    g.fillStyle = '#16171b'; g.fillRect(X(-1.5), Y(2.2), X(0.2) - X(-1.5), Y(1.6) - Y(2.2));
    g.fillStyle = '#eceef2'; g.font = '900 ' + Math.round(h * 0.34) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('GX', X(-1.3), Y(1.97));
    g.font = '700 ' + Math.round(h * 0.13) + 'px Arial, sans-serif'; g.fillText('Detailing', X(-1.35), Y(1.72));
    g.fillStyle = '#a9cfe3'; g.beginPath(); g.moveTo(X(0.5), Y(2.0)); g.lineTo(X(1.1), Y(2.0)); g.lineTo(X(0.75), Y(1.6)); g.lineTo(X(0.15), Y(1.6)); g.closePath(); g.fill();
  }, 1024, 236, 0.02, (x) => H.haut(x, 0) - 0.03);
  // lettrage géant en creux sur le bas noir
  a.drapeFlancsC(B, -1.55, 1.75, 0.75, 1.24, (g, w, h) => {
    g.strokeStyle = '#d8dbe1'; g.lineWidth = 5; g.font = '900 ' + Math.round(h * 0.86) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle';
    g.strokeText('GRFX', w * 0.04, h * 0.52);
    g.fillStyle = '#b8834c'; for (let i = 0; i < 3; i++) g.fillRect(w * (0.84 + i * 0.05), h * 0.15, w * 0.02, h * 0.7);
  }, 1024, 104);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 7.5, largeur: 2.15 * KZ, hauteur: 2.95, xAvant: 3.55, xArriere: -3.95, roues };
}

/* ------------------------------------------------------------------ H06 : fourgon postal bleu, moteur apparent à l'avant, grande aile arrière grise, roues de dragster */
function fourgonPostal(ctx) {
  // famille van haut (BRIEF10, photo ≈ 0,95) : voies élargies (×1,14 en z), caisson remonté (pavillon ≈ 2,75), roue AR à fleur de l'aile grise
  const KZ = 1.14, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const bleu = o.lac('#1d44b8', 0.22, 0.12), noir = o.mat('#14151a', 0.6, 0.3), gris = o.mat('#878c96', 0.35, 0.6), grisF = o.lac('#767b85', 0.3, 0.1), chrome = o.chrome;
  const verreN = a.translucide('#0c0e14', 0.95);
  const xr = -2.0, xv = 2.15, RWr = 0.74, RWv = 0.54;
  const roues = [{ x: xr, RW: RWr, ep: 0.8, z: 0.9, avant: false, jante: '#15161a', rayons: 'cinq', flanc: '#d7dbe3', sansFrein: true },
    { x: xv, RW: RWv, ep: 0.5, z: 0.92, avant: true, jante: '#f1f3f7', rayons: 'plein', flanc: null, sansFrein: true }];
  // soubassement bleu lofté, aile avant bombée, flancs creusés
  const S = (x, w, y0, y1, nt = 6, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const B = a.corps([S(-2.95, 0.98, 0.56, 1.42, 4), S(-2.8, 1.07, 0.46, 1.56), S(1.5, 1.07, 0.44, 1.56), S(2.4, 1.07, 0.44, 1.46), S(3.0, 1.0, 0.46, 1.3, 4), S(3.18, 0.86, 0.56, 1.12, 3)], bleu,
    { ailes: [{ x: xv, R: 0.68, dw: 0.06, yH: 1.4 }], taille: { x0: -1.0, x1: 1.4, dw: 0.035, y0: 0.5, y1: 1.5 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, r.RW, r.RW, r.z, r.ep * 0.9, noir, r.avant);
  // caisse haute : flancs rentrants, pavillon débordant
  const U = (x, w, y1, wt = 0.86) => ({ x, w, y0: 1.5 - (y1 - 1.5), y1, nt: 6, nb: 2, wt });
  const H = a.corps([U(-2.92, 0.98, 2.6, 0.95), U(-2.78, 1.07, 2.71, 0.96), U(1.36, 1.07, 2.72, 0.96), U(1.44, 1.07, 2.08, 0.97), U(1.96, 1.05, 2.06, 0.97), U(2.04, 0.96, 1.96, 0.97)], bleu, {}, { nx: 90, ymin: 1.5 });   // + tablier de cabine sous le pare-brise
  a.serre({ xs: [1.22, 1.26, 1.62, 1.96], yb: 2.04, yt: 2.68, wb: 1.06, rt: 0.96, verre: verreN, peint: bleu, montants: [], ep: 0.08, nt: 6, ntToit: 6 });
  o.boite(0.55, 0.08, 1.9, bleu, 1.85, 2.71, 0);                                                    // avancée de pavillon
  // grande aile arrière grise en volute, prolongée en garde-boue derrière la poupe
  const ar = [], ai = [], yc = RWr + 0.06;
  for (let i = 0; i <= 20; i++) { const t = (8 + i / 20 * 165) * Math.PI / 180; ar.push([xr + 0.98 * Math.cos(t), yc + 0.98 * Math.sin(t)]); }
  for (let i = 20; i >= 0; i--) { const t = (8 + i / 20 * 165) * Math.PI / 180; ai.push([xr + 0.85 * Math.cos(t), yc + 0.85 * Math.sin(t)]); }
  // aile grise coiffant la moitié extérieure du pneu AR, face extérieure à fleur du flanc de pneu
  const zAile = (roues[0].z * KZ + 0.43) / KZ - 0.18;
  for (const z of [-1, 1]) { const f = o.profil([...ar, [-3.45, 0.95], [-3.45, 0.75], ...ai], 0.26, grisF, { galbe: false, biseau: 0.05 }); f.position.z = z * zAile; }
  // échappements chromés qui débouchent derrière
  for (const z of [-1, 1]) { a.cylX(0.09, 0.8, chrome, -3.1, 0.9, z * 0.7); a.cylX(0.12, 0.1, chrome, -3.5, 0.9, z * 0.7); }
  // moteur apparent : bloc, culasses, compresseur chromé, tubulures
  const yh = 1.46;
  o.boite(1.0, 0.36, 1.0, gris, 2.5, yh + 0.12, 0);
  for (let i = 0; i < 4; i++) for (const z of [-0.28, 0.28]) o.cyl(0.12, 0.12, 0.34, chrome, 2.15 + i * 0.24, yh + 0.45, z);
  a.cylX(0.27, 0.62, chrome, 2.55, yh + 0.55, 0, 24); a.cylX(0.2, 0.16, gris, 2.92, yh + 0.55, 0, 24);
  for (const z of [-0.42, 0.42]) a.cylX(0.06, 0.75, chrome, 2.55, yh + 0.3, z);
  // face : calandre grise à lames, phares ronds, pare-chocs noir
  o.boite(0.1, 0.55, 1.4, gris, 3.12, 0.92, 0);
  for (let i = 0; i < 4; i++) o.boite(0.05, 0.04, 1.3, noir, 3.18, 0.74 + i * 0.12, 0);
  o.phares(3.08, 1.24, [-0.7, 0.7], 0.15, lumBlanche);
  o.boite(0.28, 0.14, 1.9, noir, 3.15, 0.52, 0);
  o.boite(0.06, 0.22, 0.28, lumRouge, -2.95, 2.2, 0.72); o.boite(0.06, 0.22, 0.28, lumRouge, -2.95, 2.2, -0.72);
  for (const z of [-1, 1]) o.boite(2.2, 0.1, 0.18, noir, 0.2, 0.5, z * 0.96);                    // marchepieds
  // toit : panneau noir avec grand chiffre 5 cerclé d'orange
  a.drapeDessus(H, -2.5, 1.1, -0.7, 0.7, (g, w, h) => {
    g.fillStyle = '#101117'; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.48, h * 0.46, 0, 0, 7); g.fill();
    g.fillStyle = '#f4f6fa'; g.font = '900 ' + Math.round(h * 0.85) + 'px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(w / 2, h / 2 + 6); g.rotate(Math.PI / 2); g.lineWidth = 16; g.strokeStyle = '#ff7a2f'; g.strokeText('5', 0, 0); g.fillText('5', 0, 0); g.restore();
  }, 512, 256);
  // flancs hauts : slogans
  a.drapeFlancsC(H, -2.75, 1.3, 1.6, 2.66, (g, w, h) => {
    const X = (x) => (x + 2.75) / 4.05 * w, Y = (y) => (2.66 - y) / 1.06 * h;                         // slogans et vitres dans le haut du caisson
    g.fillStyle = '#10131c'; for (const [x0, x1] of [[0.2, 1.22], [-0.95, -0.15]]) g.fillRect(X(x0), Y(2.5), X(x1) - X(x0), Y(2.14) - Y(2.5));   // vitres latérales sombres
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(X(0.3), Y(2.46), X(0.42) - X(0.3), Y(2.18) - Y(2.46));
    g.textBaseline = 'middle'; g.fillStyle = '#ff7a2f'; g.font = 'italic 900 ' + Math.round(h * 0.16) + 'px Arial Black, Arial, sans-serif'; g.fillText('PTS', X(-2.3), Y(2.4));
    g.fillStyle = '#f4f6fa'; g.font = 'italic 900 ' + Math.round(h * 0.075) + 'px Arial Black, Arial, sans-serif'; g.fillText('ALWAYS ON TIME!', X(-2.3), Y(2.2));
    g.fillStyle = '#f4f6fa'; g.fillRect(X(-2.3), Y(2.1), X(-1.2) - X(-2.3), 4);
  }, 1024, 268);
  // flancs bas : filets rouge/blanc, nuage blanc, « MAILED IT! »
  a.drapeFlancsC(B, -2.8, 2.0, 0.55, 1.55, (g, w, h) => {
    const X = (x) => (x + 2.8) / 4.8 * w, Y = (y) => (1.55 - y) / 1.0 * h;
    g.fillStyle = '#f4f6fa'; g.fillRect(0, Y(1.5), w, h * 0.02); g.fillStyle = '#e03a3a'; g.fillRect(0, Y(1.47), w, h * 0.06); g.fillStyle = '#f4f6fa'; g.fillRect(0, Y(1.39), w, h * 0.025);
    g.fillStyle = '#f4f6fa'; g.beginPath(); g.moveTo(X(-1.1), Y(1.28));
    for (let i = 0; i < 7; i++) g.arc(X(-0.95 + i * 0.27), Y(1.28), h * 0.06, Math.PI, 0);
    g.lineTo(X(1.0), Y(0.95)); g.quadraticCurveTo(X(0.6), Y(0.62), X(-0.2), Y(0.72)); g.quadraticCurveTo(X(-0.9), Y(0.7), X(-1.1), Y(0.85)); g.closePath(); g.fill();
    g.fillStyle = '#15161b'; g.font = '900 ' + Math.round(h * 0.2) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle';
    g.save(); g.translate(X(-0.95), Y(1.02)); g.rotate(-0.06); g.fillText('MAILED IT!', 0, 0); g.restore();
    g.font = '800 ' + Math.round(h * 0.08) + 'px Arial, sans-serif'; g.fillText('GO!', X(1.0), Y(0.75));
  }, 1024, 214);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 6.95, largeur: 2.14 * KZ, hauteur: 2.8, xAvant: 3.25, xArriere: -3.55, roues };
}

/* ------------------------------------------------------------------ H07 : camion-caisson noir et or, toit étagé, chasse-neige à l'avant */
function camionCaisson(ctx) {
  // famille utilitaire haut (BRIEF10, photo ≈ 0,95) : voies élargies (×1,28 en z), caisson et cabine remontés (H_toit ≈ 0,95 W), toit-pagode à 3 marches
  const KZ = 1.28, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const noir = o.lac('#15161b', 0.3, 0.5), noirM = o.mat('#1c1d23', 0.5, 0.4), or = o.mat('#d29a1a', 0.3, 0.6), orM = o.mat('#e0b23a', 0.3, 0.6);
  const rouge = o.lac('#4a0b08', 0.2, 0.1);
  const W = 2.2, xr = -1.9, xv = 1.35, RW = 0.55, Ra = RW + 0.12, yC = 2.72;                     // yC : dessus du caisson (caisson haut, BRIEF10)
  // jupes dorées étagées (avec passages) et châssis noir
  for (const z of [-1, 1]) { const j = a.coque([[-3.95, 1.25], [0.9, 1.25]], 0.45, [{ x: xr, R: Ra, y: RW }, { x: xv, R: Ra, y: RW }], 0.14, or, { galbe: false, biseau: 0.03 }); j.position.z = z * 1.02; }
  for (const z of [-1, 1]) for (let i = 0; i < 3; i++) o.boite(4.75, 0.025, 0.04, noirM, -1.55, 0.7 + i * 0.22, z * 1.11);   // joints entre barres dorées
  o.boite(4.8, 0.5, 1.8, noirM, -1.55, 0.85, 0);
  for (const x of [xr, xv]) a.remplir(x, Ra, 0.45, 1.3, 0.78, noirM);
  // caisson arrière : volume trapu, rebord supérieur, plateau et rails bas sur le toit
  o.profil([[-3.95, 1.25], [-3.95, yC], [0.9, yC], [0.9, 1.25]], W, noir, { galbe: { avant: 0.04, arriere: 0.05, fruit: 0.05, bombe: 0.01 }, biseau: 0.07 });
  o.boite(4.95, 0.1, W * 0.88, noir, -1.52, yC + 0.05, 0);                                          // plateau de toit (≈ 0,82 W)
  for (const z of [-1, 1]) o.boite(4.95, 0.12, 0.12, noir, -1.52, yC + 0.16, z * 0.9);
  o.boite(0.12, 0.12, W * 0.82, noir, -3.98, yC + 0.16, 0);
  o.boite(3.4, 0.1, 0.5, noirM, -1.9, yC + 0.15, 0);                                                     // nervure centrale
  for (const z of [-1, 1]) o.boite(5.0, 0.04, 0.05, orM, -1.5, yC, z * 1.1);                         // liseré or
  // cabine : volume noir, piliers à losanges dorés, grande baie rouge à l'avant
  const yK = 2.6;
  o.profil([[0.8, 1.25], [0.8, yK], [3.0, yK], [3.0, 1.25]], 2.0, noir, { galbe: { avant: 0.1, arriere: 0, fruit: 0.08, bombe: 0.02, lAv: 0.2 }, biseau: 0.08 });
  o.boite(0.12, 1.0, 1.5, rouge, 3.04, 1.95, 0);
  o.boite(0.14, 0.08, 1.7, noirM, 3.06, 2.46, 0); o.boite(0.14, 0.08, 1.7, noirM, 3.06, 1.42, 0);
  for (const z of [-1, 1]) o.boite(0.14, 1.1, 0.1, noirM, 3.06, 1.95, z * 0.82);
  for (const z of [-1, 1]) for (let i = 0; i < 6; i++) a.boiteInc(0.05, 0.13, 0.13, orM, 1.0, 1.4 + i * 0.2, z * 1.03, Math.PI / 4, 0);
  for (const z of [-1, 1]) a.boiteInc(0.04, 1.1, 0.04, orM, 1.2, 1.95, z * 1.03);                  // listel doré
  // toit en pagode surbaissé : plateau large et plat, 3 marches basses, avant-toit débordant
  o.boite(2.6, 0.12, 1.95, noir, 2.0, yK + 0.05, 0);
  for (let i = 0; i < 3; i++) o.boite(2.5 - i * 0.4, 0.06, 1.85 - i * 0.2, noir, 1.75 + i * 0.1, yK + 0.14 + i * 0.05, 0);
  for (let i = 0; i < 4; i++) o.boite(0.2, 0.1, 1.95 - i * 0.16, noirM, 3.35 - i * 0.12, yK - i * 0.06, 0);
  // chasse-neige / étrave en escalier sous la baie avant
  o.profil([[2.8, 1.4], [3.15, 1.3], [3.95, 0.5], [3.7, 0.4], [2.8, 0.45]], 1.95, noir, { galbe: { avant: 0.2, arriere: 0, fruit: 0, bombe: 0, lAv: 0.3 }, biseau: 0.05 });
  for (let i = 0; i < 4; i++) o.boite(0.16, 0.08, 1.9 - i * 0.08, noirM, 3.18 + i * 0.22, 1.18 - i * 0.2, 0);
  o.boite(0.5, 0.25, 2.1, noir, 3.8, 0.55, 0);
  o.phares(3.1, 1.12, [-0.7, 0.7], 0.17, lumBlanche);
  o.boite(0.06, 0.22, 0.3, lumRouge, -4.0, 1.9, 0.8); o.boite(0.06, 0.22, 0.3, lumRouge, -4.0, 1.9, -0.8);
  // flanc du caisson : fond brun à motifs dorés, chat porte-bonheur crème, bannière (dessin à l'échelle k, sans déformation)
  const hD = yC - 1.25 - 0.06;
  a.decalFlancC((g, w, h) => {
    g.fillStyle = '#2a1b12'; g.fillRect(0, 0, w, h);
    const k = h / 302, Wv = w / k;
    g.save(); g.scale(k, k);
    g.strokeStyle = '#8c6a2a'; g.lineWidth = 3;
    for (let j = 0; j < 7; j++) for (let i = 0; i < Math.ceil(Wv / 80) + 1; i++) for (const r of [26, 17, 8]) { g.beginPath(); g.arc(i * 80 + (j % 2) * 40, 20 + j * 52, r, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#c99a3c'; for (let i = 0; i < 22; i++) { g.beginPath(); g.ellipse(300 + (i * 97) % (Wv - 520), 60 + (i * 53) % 200, 14, 9, 0.6, 0, 7); g.fill(); }
    g.fillStyle = '#efe6cf';
    g.beginPath(); g.ellipse(170, 255, 80, 105, 0, 0, 7); g.fill();                                  // corps
    g.beginPath(); g.arc(170, 125, 62, 0, 7); g.fill();                                              // tête
    g.beginPath(); g.moveTo(120, 90); g.lineTo(125, 35); g.lineTo(158, 72); g.fill(); g.beginPath(); g.moveTo(220, 90); g.lineTo(215, 35); g.lineTo(182, 72); g.fill();
    g.beginPath(); g.ellipse(95, 190, 22, 60, -0.4, 0, 7); g.fill();                                 // patte levée
    g.fillStyle = '#7a4a1e'; g.beginPath(); g.arc(150, 125, 7, 0, 7); g.arc(192, 125, 7, 0, 7); g.fill(); g.fillStyle = '#c3302a'; g.fillRect(122, 168, 96, 12);
    g.fillStyle = '#d9a92a'; g.beginPath(); g.ellipse(170, 275, 36, 44, 0, 0, 7); g.fill();
    const xb = Wv - 300;
    g.fillStyle = '#efe6cf'; g.beginPath(); g.moveTo(255, 200); g.quadraticCurveTo((255 + xb) / 2, 120, xb, 190); g.lineTo(xb, 270); g.quadraticCurveTo((255 + xb) / 2, 205, 255, 285); g.closePath(); g.fill();
    g.fillStyle = '#c3302a'; g.font = '900 118px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.save(); g.translate((255 + xb) / 2, 262); g.rotate(-0.04); g.fillText('LUCKY CAT', 0, 0); g.restore(); g.textAlign = 'left';
    g.fillStyle = '#efe6cf'; g.fillRect(Wv - 210, 20, 74, 262); g.fillStyle = '#c3302a'; g.font = '900 50px Arial Black, Arial, sans-serif'; for (let i = 0; i < 4; i++) g.fillText('★', Wv - 198, 72 + i * 62);
    g.restore();
    g.strokeStyle = '#d9a92a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  }, 4.75, hD, -1.55, 1.25 + 0.03 + hD / 2, W / 2 + 0.06, 1024, Math.round(1024 * hD / 4.75));
  return {
    L: 8.0, largeur: W * KZ, hauteur: 3.0, xAvant: 4.05, xArriere: -4.0,
    roues: [{ x: xr, RW, ep: 0.52, z: 1.17, avant: false, jante: '#14151a', rayons: 'cinq', flanc: '#d9a92a', sansFrein: true }, { x: xv, RW, ep: 0.5, z: 1.17, avant: true, jante: '#14151a', rayons: 'cinq', flanc: '#d9a92a', sansFrein: true }],
  };
}

/* ------------------------------------------------------------------ H08 : taxi hot-rod LONG ET BAS (L/H ≈ 3,6), long capot, cabine chopée reculée, souffleur à l'arrière, grosses roues arrière
 * Mesures sur la photo de profil (blister) : L/H toit ≈ 3,6 ; empattement ≈ 0,68 L ; Ø roue AR ≈ 0,16 L, Ø AV ≈ 0,11 L ;
 * ceinture ≈ 0,58 H ; hanche AR ≈ 0,85 H ; pavillon de 0,04 L à 0,62 L (pare-brise jusqu'à 0,69 L). */
function taxiHotRod(ctx) {
  // famille berline/taxi (BRIEF10, photo ≈ 0,72) : voies élargies (×1,08 en z), cabine haute remontée à 2,26 (H_toit ≈ 0,70 W), pavillon large
  const KZ = 1.08, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const bleu = o.lac('#1f43b4', 0.22, 0.12), blanc = o.lac('#f3f4f6', 0.2, 0.05), noirM = o.mat('#121318', 0.6, 0.3), chrome = o.chrome;
  const bleuC = o.lac('#2a58e0', 0.15, 0.16), grisSil = o.mat('#c9ccd2', 0.3, 0.6);
  const xAr = -4.2, xAv = 4.2, xr = -2.6, xv = 3.12, RWr = 0.8, RWv = 0.47;
  const roues = [
    { x: xr, RW: RWr, ep: 0.95, z: 1.0, avant: false, jante: '#a3a7af', rayons: 'plein', flanc: null, sansFrein: true },        // gros slicks de dragster
    { x: xv, RW: RWv, ep: 0.5, z: 0.9, avant: true, jante: '#a3a7af', rayons: 'plein', flanc: null, sansFrein: true }];
  // caisse basse bleue : hanches AR hautes et gonflées sur les gros pneus, ceinture qui plonge vers un capot long et bas, museau arrondi
  const S = (x, w, y0, y1, nt = 3.4, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const C = a.corps([
    S(xAr, 0.98, 0.42, 1.5, 2.6), S(-4.02, 1.12, 0.3, 1.66, 4), S(-3.3, 1.16, 0.27, 1.72, 4.5), S(-2.5, 1.18, 0.26, 1.7, 4.5), S(-1.75, 1.24, 0.25, 1.46, 5),
    S(-0.9, 1.25, 0.24, 1.3, 5), S(0.4, 1.24, 0.24, 1.27, 5), S(1.7, 1.12, 0.26, 1.28, 4), S(3.0, 1.0, 0.3, 1.24), S(3.85, 0.92, 0.36, 1.13), S(xAv, 0.74, 0.48, 0.95, 2.4)], bleu,
    { ailes: [{ x: xr, R: 1.08, dw: 0.25, yH: 1.6 }, { x: xv, R: 0.66, dw: 0.12, yH: 1.12 }], taille: { x0: -1.5, x1: 2.3, dw: 0.03, y0: 0.35, y1: 1.2 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, r.RW, r.RW, r.z, r.ep * 0.9, noirM, r.avant);
  // cabine blanche chopée : longue, basse, pavillon tendu, flancs rentrants (tumblehome), arrière arrondi qui plonge dans les hanches
  const K = (x, yb, yt, w, nt = 6) => ({ x, w, y0: 2 * yb - yt, y1: yt, nt, nb: 2, wt: 0.94 });
  // toit chopé (pavillon à 1,74) : vitrage bas, pavillon plat et large (≈ 0,78 Wcaisse), faible tumblehome
  // cabine haute de taxi (BRIEF10 : H_toit ≈ 0,70 W d'après la photo) ; bas de cabine recoupé au-dessus des pneus (arches)
  const cab = a.corps([K(-3.98, 1.56, 1.95, 1.0, 2.6), K(-3.8, 1.5, 2.12, 1.1), K(-2.9, 1.5, 2.24, 1.2), K(-1.7, 1.4, 2.26, 1.25), K(-0.6, 1.27, 2.25, 1.25),
    K(0.8, 1.25, 2.16, 1.22), K(1.22, 1.25, 1.78, 1.16), K(1.6, 1.27, 1.36, 1.06, 2.4)], blanc, { arches: a.archesDe(roues, 0.12) }, { nx: 100, ns: 48 });
  // vitrages : vitres latérales, lunette et pare-brise drapés sur la cabine (verre fumé bleuté, pas de surépaisseur)
  const vitre = '#1a2232', cadre = (g, x0, y0, x1, y1, r) => { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath(); g.fill(); };
  const cadreX = (g, X, Y, xa, ya, xb, yb2, r) => cadre(g, Math.min(X(xa), X(xb)), Y(ya), Math.max(X(xa), X(xb)), Y(yb2), r);
  const capC = (K2) => (x) => K2.haut(x, 0) - 0.005;
  a.drapeFlancsC(cab, -1.9, 1.4, 1.4, 2.22, (g, w, h, X) => {
    const Y = (y) => (2.22 - y) / 0.82 * h, grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#2c3a52'); grd.addColorStop(1, vitre); g.fillStyle = grd;
    cadreX(g, X, Y, -1.75, 2.12, -0.95, 1.55, 14);                                                  // custode
    cadreX(g, X, Y, -0.8, 2.13, 0.12, 1.5, 14);                                                     // porte arrière
    g.beginPath(); g.moveTo(X(0.24), Y(2.12)); g.lineTo(X(0.75), Y(2.08)); g.lineTo(X(1.12), Y(1.55)); g.lineTo(X(0.24), Y(1.5)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; for (const [p, q] of [[-0.8, 0.05], [0.3, 0.7]]) g.fillRect(Math.min(X(p), X(q)), Y(2.06), Math.abs(X(q) - X(p)), 5);
  }, 1024, 300, 0.012, capC(cab));
  a.drapeDessus(cab, 0.84, 1.5, -0.8, 0.8, (g, w, h) => { g.fillStyle = vitre; cadre(g, w * 0.05, h * 0.1, w * 0.92, h * 0.9, 22); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(w * 0.15, h * 0.2, w * 0.08, h * 0.6); }, 512, 512, 0.012);
  a.drapeDessus(cab, -3.99, -3.82, -0.5, 0.5, (g, w, h) => { g.fillStyle = vitre; cadre(g, w * 0.08, h * 0.1, w * 0.9, h * 0.9, 18); }, 256, 256, 0.012);
  // souffleur chromé jaillissant du pavillon arrière : carter, poulies, 2×3 cornets bleus ; ouverture latérale sombre dans la custode
  // compresseur DÉBORDANT : carter chromé plus large que le pavillon, déborde en avant et sur les côtés, 2×3 cornets géants, poulies et courroie
  const yt = 2.26;
  o.boite(1.3, 0.2, 0.95, noirM, -2.0, yt - 0.04, 0);
  a.plan([[-2.8, -0.66], [-1.18, -0.66], [-1.08, -0.56], [-1.08, 0.56], [-1.18, 0.66], [-2.8, 0.66], [-2.9, 0.56], [-2.9, -0.56]], yt + 0.04, 0.3, chrome, 0.04);
  for (const sg of [-1, 1]) for (let i = 0; i < 4; i++) o.boite(1.5, 0.04, 0.04, noirM, -1.99, yt + 0.12 + i * 0.07, sg * 0.71);   // ailettes du carter
  o.boite(1.7, 0.12, 1.1, noirM, -1.99, yt + 0.4, 0);                                                    // semelle des cornets
  for (const dz of [-0.28, 0.28]) for (let i = 0; i < 3; i++) {
    const x = -2.55 + i * 0.55;
    o.cyl(0.16, 0.12, 0.42, bleuC, x, yt + 0.67, dz, 0, 0, 18);
    o.cyl(0.17, 0.17, 0.04, chrome, x, yt + 0.89, dz, 0, 0, 18);
  }
  a.cylZ(0.16, 0.24, chrome, -0.98, yt + 0.2, 0, 20); a.cylZ(0.1, 0.26, noirM, -0.98, yt + 0.2, 0, 16);   // poulie
  o.boite(0.1, 0.36, 0.1, noirM, -0.95, yt + 0.08, 0);                                                   // courroie
  a.drapeFlancsC(cab, -2.75, -1.95, 1.62, 2.12, (g, w, h) => {
    g.fillStyle = '#16181e'; cadre(g, w * 0.04, h * 0.08, w * 0.96, h * 0.95, 18);
    g.fillStyle = '#c7cbd3'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(w * (0.14 + i * 0.18), h * 0.36, w * 0.07, h * 0.2, 0, 0, 7); g.fill(); }
    g.fillStyle = '#2a58e0'; for (let i = 0; i < 5; i++) g.fillRect(w * (0.1 + i * 0.18), h * 0.6, w * 0.08, h * 0.3);
  }, 512, 160, 0.012, capC(cab));
  // aileron dorsal blanc en nageoire sur la poupe du pavillon
  o.profil([[-3.75, 1.9], [-3.95, 2.4], [-3.62, 2.44], [-3.05, 2.2], [-3.0, 2.0]], 0.12, blanc, { galbe: false, biseau: 0.03 });
  // enseigne de toit jaune
  o.boite(0.5, 0.14, 0.34, o.lac('#f6dc5a', 0.3, 0.05), -0.3, yt + 0.06, 0);
  // capot blanc à filets bleu/rouge (dessus), visière de calandre
  a.drapeDessus(C, 1.55, 4.05, -0.9, 0.9, (g, w, h) => {
    g.fillStyle = '#f3f4f6'; g.fillRect(0, h * 0.06, w, h * 0.88);
    for (const v of [0.18, 0.82]) { g.fillStyle = '#1f43b4'; g.fillRect(0, h * v - h * 0.035, w, h * 0.07); g.fillStyle = '#d02a35'; g.fillRect(0, h * v - h * 0.012, w, h * 0.024); }
  }, 512, 256);
  // face avant : calandre chromée verticale à barreaux, phares ronds chromés sur les ailes, pare-chocs fin chromé
  // calandre chromée verticale haute : cadre rectangulaire à chapeau arrondi, barreaux verticaux, dépasse le capot
  o.boite(0.14, 0.8, 0.7, chrome, 4.2, 0.9, 0);
  const chap = a.cylX(0.35, 0.14, chrome, 4.2, 1.3, 0, 28); chap.scale.set(0.45, 1, 1);           // chapeau elliptique (rayon 0,35 en z, 0,16 en y)
  for (let i = -3; i <= 3; i++) o.boite(0.05, 0.84, 0.04, noirM, 4.28, 0.95, i * 0.085);
  o.boite(0.06, 0.08, 0.14, chrome, 4.24, 1.48, 0);                                                     // bouchon de radiateur
  for (const z of [-1, 1]) {
    a.cylX(0.15, 0.14, chrome, 3.98, 1.02, z * 0.6, 20);
    o.phares(4.06, 1.02, [z * 0.6], 0.11, lumBlanche);
    o.cyl(0.05, 0.05, 0.2, chrome, 4.25, 0.5, z * 0.32, 0, Math.PI / 2, 10);                      // supports de pare-chocs
    a.ellipsoide(0.08, 0.13, 0.08, chrome, 4.37, 0.5, z * 0.32, 14);                                  // butoirs
  }
  // pare-chocs avant : jonc chromé fin, enveloppant les coins
  a.tube([[4.0, 0.48, -0.94], [4.3, 0.47, -0.8], [4.36, 0.46, 0], [4.3, 0.47, 0.8], [4.0, 0.48, 0.94]], 0.055, chrome, 32);
  // poupe : feux rouges, pare-chocs chromé fin, sorties
  for (const z of [-0.6, 0.6]) { a.cylX(0.14, 0.08, chrome, xAr - 0.02, 1.35, z, 20); a.cylX(0.11, 0.06, lumRouge, xAr - 0.06, 1.35, z, 20); }
  a.tube([[-3.95, 0.5, -1.0], [-4.22, 0.49, -0.82], [-4.3, 0.48, 0], [-4.22, 0.49, 0.82], [-3.95, 0.5, 1.0]], 0.055, chrome, 32);
  for (const z of [-0.32, 0.32]) o.cyl(0.05, 0.05, 0.16, chrome, -4.22, 0.5, z, 0, Math.PI / 2, 10);
  o.boite(0.03, 0.26, 0.6, o.mat('#e9eaee', 0.5, 0.1), xAr - 0.005, 0.86, 0);                       // plaque arrière (sans inscription)
  for (const z of [-0.22, 0.22]) a.cylX(0.06, 0.4, chrome, -4.05, 0.36, z, 14);                    // sorties d'échappement
  // bas de caisse argent (bandeau sous les portières)
  for (const z of [-1, 1]) o.boite(3.3, 0.12, 0.06, grisSil, 0.15, 0.3, z * (C.flanc(0.15, 0.3) + 0.02));
  // livrée des flancs : drapeau stylisé oblique, gros « TAXI » noir détouré, filet blanc/rouge sur l'aile avant
  a.drapeFlancsC(C, xAr, xAv, 0.22, 2.16, (g, w, h, X) => {
    const Y = (y) => (2.16 - y) / 1.94 * h;
    g.save(); g.beginPath();
    g.moveTo(X(-4.1), Y(1.35)); g.lineTo(X(-3.6), Y(1.85)); g.lineTo(X(-1.75), Y(1.66)); g.lineTo(X(-1.0), Y(1.36)); g.lineTo(X(-0.35), Y(0.36)); g.lineTo(X(-3.2), Y(0.36)); g.lineTo(X(-4.1), Y(0.9)); g.closePath(); g.clip();
    g.fillStyle = '#1c3d9e'; g.fillRect(0, 0, w, h);
    const cx = X(-1.45), cy = Y(0.92), d = (x0, y0, x1, y1, c, lw) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    for (const [c, k] of [['#f3f4f6', 1], ['#d02a35', 0.5]]) {
      d(cx - 700, cy - 300, cx + 700, cy + 300, c, 46 * k); d(cx - 700, cy + 300, cx + 700, cy - 300, c, 46 * k);
      d(cx - 900, cy - 10, cx + 500, cy + 10, c, 70 * k); d(cx - 24, 0, cx + 24, h, c, 70 * k);
    }
    g.restore();
    g.fillStyle = '#f3f4f6'; g.fillRect(Math.min(X(-1.5), X(1.95)), Y(0.4), Math.abs(X(1.95) - X(-1.5)), Y(0.24) - Y(0.4));
    g.font = 'italic 900 ' + Math.round(h * 0.42) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.lineJoin = 'round';
    const tx = X(0.95), ty = Y(0.76);
    g.fillStyle = '#d02a35'; g.fillText('TAXI', tx + 6, ty + 6);
    g.strokeStyle = '#f3f4f6'; g.lineWidth = 14; g.strokeText('TAXI', tx, ty);
    g.fillStyle = '#111216'; g.fillText('TAXI', tx, ty);
    g.fillStyle = '#f3f4f6'; g.beginPath(); g.moveTo(X(2.0), Y(1.06)); g.lineTo(X(3.7), Y(1.12)); g.lineTo(X(3.7), Y(1.09)); g.lineTo(X(2.0), Y(0.98)); g.closePath(); g.fill();
    g.fillStyle = '#d02a35'; g.beginPath(); g.moveTo(X(2.0), Y(0.99)); g.lineTo(X(3.6), Y(1.09)); g.lineTo(X(2.0), Y(0.95)); g.closePath(); g.fill();
    // passages de roues dégagés : l'aile affleure le pneu, l'autocollant ne doit pas recouvrir la roue
    g.globalCompositeOperation = 'destination-out';
    for (const r of roues) { const Rr = r.RW + 0.1; g.beginPath(); g.ellipse(X(r.x), Y(r.RW), Math.abs(X(r.x + Rr) - X(r.x)), Y(r.RW - Rr) - Y(r.RW), 0, 0, 7); g.rect(Math.min(X(r.x - Rr), X(r.x + Rr)), Y(r.RW), Math.abs(X(r.x + Rr) - X(r.x - Rr)), h); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }, 2048, 420, 0.02, capC(C));
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: xAv - xAr + 0.15, largeur: 2.4 * KZ, hauteur: 3.2, xAvant: xAv + 0.1, xArriere: xAr - 0.05, roues };
}

/* ------------------------------------------------------------------ H09 : petit camion plateau kei, cabine avancée, pare-chocs noir, visière */
function keiBenne(ctx) {
  // famille utilitaire haut (BRIEF10, photo ≈ 0,95) : voies élargies (×1,22 en z), cabine haute (H_toit ≈ 0,95 W), roue AR à fleur de la ridelle
  const KZ = 1.22, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const bleu = o.lac('#6f8fa0', 0.3, 0.6), noir = o.lac('#17181c', 0.45, 0.25), noirM = o.mat('#0e0f12', 0.6, 0.3), bleuF = o.mat('#5e7c8c', 0.4, 0.5), gris = o.mat('#6b7078', 0.5, 0.5);
  const verre = a.translucide('#232830', 0.9, 0);
  const W = 2.0, xr = -2.3, xv = 2.2, RW = 0.62, Ra = RW + 0.12;
  const roues = [{ x: xr, RW, ep: 0.5, z: 0.84, avant: false, jante: '#e8c27a', rayons: 'plein', sansFrein: true }, { x: xv, RW, ep: 0.5, z: 0.94, avant: true, jante: '#e8c27a', rayons: 'plein', sansFrein: true }];
  // cabine avancée lissée : aile avant bombée, flancs galbés
  const S = (x, w, y0, y1, nt = 6, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const C = a.corps([S(0.5, 0.99, 0.8, 1.76), S(2.2, 1.0, 0.76, 1.76), S(3.05, 0.99, 0.78, 1.7), S(3.3, 0.86, 0.86, 1.56, 4)], bleu,
    { ailes: [{ x: xv, R: 0.8, dw: 0.07, yH: 1.4 }], arches: a.archesDe([roues[1]], 0.12) });
  a.puits(xv, RW, RW, 0.94, 0.45, noirM, true);
  for (const z of [-1, 1]) a.arche(xv, RW, Ra + 0.03, z * 1.03, noir, 0.09);
  // serre : grandes vitres, montants inclinés vers l'intérieur, pavillon à nervures
  const yt = 2.62;                                                                                  // cabine haute de kei (sommet à yt + 0,07 ≈ 0,95 W, mesure photo)
  a.serre({ xs: [0.55, 0.62, 2.15, 3.05], yb: 1.74, yt, wb: 0.97, rt: 0.92, verre, peint: bleu, montants: [], ep: 0.08, nt: 6, ntToit: 6 });
  for (let i = 0; i < 4; i++) o.boite(0.06, 0.025, 1.5, bleuF, 0.9 + i * 0.35, yt + 0.075, 0);
  // visière arrière de pavillon relevée
  a.boiteInc(0.6, 0.06, 1.7, bleu, 0.5, yt + 0.06, 0, -0.3);
  // bas noir : sabot de pare-chocs, calandre à lames, optiques, bas de caisse
  o.profil([[2.95, 0.5], [3.45, 0.5], [3.55, 0.9], [3.38, 1.42], [2.95, 1.42]], 1.95, noir, { galbe: { avant: 0.12, arriere: 0, fruit: 0, bombe: 0, lAv: 0.3 }, biseau: 0.05 });
  o.boite(0.12, 0.56, 0.8, o.mat('#9ea3ad', 0.3, 0.8), 3.48, 1.0, 0);
  for (let i = 0; i < 4; i++) o.boite(0.05, 0.03, 0.74, noirM, 3.55, 0.82 + i * 0.13, 0);
  o.phares(3.32, 1.28, [-0.72, 0.72], 0.2, lumBlanche);
  o.boite(0.5, 0.12, W * 1.04, noir, 3.5, 0.52, 0);
  for (const z of [-1, 1]) o.boite(1.0, 0.12, 0.1, noir, 0.95, 0.82, z * 0.96);
  // châssis, plateau : plancher central, côtés à passages de roues, ridelle arrière et avant
  o.boite(4.0, 0.1, 1.1, noirM, -1.5, 0.98, 0);
  for (const x0 of [-3.3, 0.0]) o.boite(0.6, 0.1, 1.9, noirM, x0 - 0.0 + (x0 < -3 ? 0.0 : 0.2), 0.98, 0);
  o.boite(0.5, 0.1, 1.9, noirM, -3.2, 0.98, 0); o.boite(0.6, 0.1, 1.9, noirM, -0.2, 0.98, 0);
  for (const z of [-1, 1]) {
    const m = a.coque([[-3.5, 1.5], [0.45, 1.5]], 1.0, [{ x: xr, R: Ra, y: RW }], 0.1, bleu, { galbe: false, biseau: 0.02 }); m.position.z = z * 0.97;
    o.boite(1.55, 0.2, 0.3, bleuF, xr, 1.38, z * 0.76);                                            // bossage de passage de roue (au-dessus du pneu)
    o.boite(3.95, 0.04, 0.14, bleuF, -1.5, 1.52, z * 0.97);
  }
  o.boite(0.1, 0.5, 1.9, bleu, -3.5, 1.25, 0);
  o.boite(0.1, 0.5, 1.9, bleu, 0.45, 1.25, 0);
  o.boite(0.8, 0.14, 0.4, gris, -1.1, 1.08, 0.2);                                                    // petit chargement : planche
  o.boite(0.06, 0.2, 0.3, lumRouge, -3.56, 1.1, 0.8); o.boite(0.06, 0.2, 0.3, lumRouge, -3.56, 1.1, -0.8);
  // flancs : filets rouge/orange/jaune continus du plateau à la portière, mots « SURF & SKATE »
  const filets = (x0, x1, texte) => (g, w, h) => {
    const X = (x) => (x - x0) / (x1 - x0) * w, Y = (y) => (1.5 - y) / 0.6 * h;
    ['#d5402f', '#ee8a2c', '#f0c53a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(X(x0), Y(1.44 - i * 0.06), X(x1) - X(x0), h * 0.06); });
    if (texte) { g.fillStyle = '#f0c53a'; g.font = '900 ' + Math.round(h * 0.17) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('SURF &', X(0.75), Y(1.16)); g.fillText('SKATE', X(0.75), Y(1.0)); }
  };
  a.decalFlancC(filets(-3.45, 0.45, false), 3.9, 0.6, -1.5, 1.2, 1.045, 1024, 158);
  a.drapeFlancsC(C, 0.55, 2.6, 0.9, 1.5, filets(0.55, 2.6, true), 1024, 300, 0.02, (x) => C.haut(x, 0) - 0.01);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 7.2, largeur: W * KZ, hauteur: 2.75, xAvant: 3.6, xArriere: -3.55, roues };
}

/* ------------------------------------------------------------------ H10 : prototype de rallye noir, soubassement rouge, grand aileron, triple optique */
function rallyeSpeciale(ctx) {
  // famille proto/supercar (BRIEF10, photo ≈ 0,58) : voies élargies (×1,15 en z), ailes gonflées à fleur des pneus, H_toit ≈ 0,58 W
  const KZ = 1.15, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const noir = o.lac('#15161b', 0.28, 0.4), noirM = o.mat('#0e0f12', 0.6, 0.3), rouge = o.lac('#d4141c', 0.25, 0.3), bleu = o.mat('#2aa3e6', 0.3, 0.2);
  const verreG = a.translucide('#3a4252', 0.8, 0.05), gris = a.translucide('#b8bdc7', 0.6, 0.1);
  const W = 2.2, xr = -2.45, xv = 2.55, RWr = 0.78, RWv = 0.6;
  const roues = [
    { x: xr, RW: RWr, ep: 0.8, z: 1.0, avant: false, jante: '#f4f5f7', rayons: 'plein', flanc: null, sansFrein: true },
    { x: xv, RW: RWv, ep: 0.6, z: 0.98, avant: true, jante: '#e0452f', rayons: 'plein', flanc: null, sansFrein: true }];
  // caisse lissée : hanches arrière très larges, taille de guêpe, nez plongeant en lame
  const S = (x, w, y0, y1, nt = 3, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const C = a.corps([S(-4.0, 0.86, 0.72, 1.52, 2.6), S(-3.85, 1.02, 0.56, 1.7), S(-2.45, 1.06, 0.55, 1.74, 3.6), S(-1.2, 1.0, 0.55, 1.5, 3.6), S(0.8, 0.98, 0.55, 1.38, 3.4), S(2.55, 1.0, 0.55, 1.38), S(3.9, 0.92, 0.56, 1.08), S(4.3, 0.7, 0.62, 0.85, 2.4)], noir,
    { ailes: [{ x: xr, R: 0.95, dw: 0.27, yH: 1.62 }, { x: xv, R: 0.75, dw: 0.24, yH: 1.22 }], taille: { x0: -1.5, x1: 1.8, dw: 0.06, y0: 0.6, y1: 1.45 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, r.RW, r.RW, r.z, r.ep * 0.9, noirM, r.avant);
  // cockpit : verrière fumée bombée, arceau, pare-brise très incliné
  // verrière (sommet 1,84 ≈ 0,58 W, famille proto BRIEF10), pare-brise très couché
  o.profil([[-1.6, 1.42], [-0.9, 1.8], [0.3, 1.82], [1.5, 1.34]], 1.62, verreG, { galbe: { avant: 0.2, arriere: 0.15, fruit: 0.1, bombe: 0.03 }, biseau: 0.06 });
  o.boite(0.9, 0.04, 0.7, noir, -0.35, 1.83, 0);
  for (const z of [-1, 1]) a.tube([[-1.5, 1.46, z * 0.76], [-0.5, 1.78, z * 0.72], [0.5, 1.76, z * 0.7], [1.4, 1.38, z * 0.72]], 0.055, noir, 20);
  // entrées d'air arrière : deux pontons-fins de part et d'autre du cockpit, dessus au niveau du pavillon (surface supérieure large)
  // (inspection des trains : arête basse cintrée au-dessus du pneu arrière — la partie noyée dans l'aile ne descend plus dans la gomme)
  for (const z of [-1, 1]) { o.profil([[-3.75, 1.45], [-3.6, 1.8], [-1.25, 1.76], [-1.45, 1.4], [-1.9, 1.42], [-2.1, 1.52], [-2.45, 1.6], [-2.8, 1.52], [-3.0, 1.43]], 0.34, noir, { galbe: false, biseau: 0.04 }).position.z = z * 0.92; }
  // grand aileron arrière (plan large, flasques, haubans)
  a.boiteInc(1.7, 0.1, 2.4, noir, -3.35, 2.1, 0, 0.1);
  for (const z of [-1, 1]) { o.profil([[-4.2, 1.78], [-4.25, 2.3], [-2.5, 2.23], [-2.8, 1.78]], 0.08, noir, { galbe: false, biseau: 0.03 }).position.z = z * 1.2; a.boiteInc(0.12, 0.42, 0.1, noir, -2.9, 1.86, z * 0.6, -0.25); }
  o.boite(1.1, 0.03, 0.8, bleu, -3.3, 2.2, 0).rotation.z = 0.1;
  // nez : triple optique grise, becquet avant rouge
  for (const z of [-0.62, 0, 0.62]) { a.cylX(0.2, 0.36, gris, 4.08, 1.0, z, 18); a.ellipsoide(0.12, 0.14, 0.14, lumBlanche, 4.22, 1.0, z, 14); }
  o.profil([[3.35, 0.5], [4.6, 0.5], [4.65, 0.6], [4.3, 0.68], [3.35, 0.68]], 1.95, rouge, { galbe: { avant: 0.18, arriere: 0, fruit: 0, bombe: 0, lAv: 0.3 }, biseau: 0.04 });
  o.boite(0.06, 0.2, 1.4, lumRouge, -3.95, 1.45, 0);
  // jupes rouges galbées, ailes rouges derrière la roue arrière, diffuseur
  for (const z of [-1, 1]) { o.profil([[-1.6, 0.5], [1.7, 0.5], [1.7, 0.82], [-1.6, 0.66]], 0.26, rouge, { galbe: false, biseau: 0.04 }).position.z = z * 1.04; o.boite(0.45, 0.85, 0.12, rouge, -4.05, 0.95, z * 1.0); }
  o.boite(0.5, 0.18, 1.7, rouge, -4.0, 0.62, 0);
  // flancs : bandes bleues obliques, filets rouge et blancs, rond « 29 », mot « SPEED »
  a.drapeFlancsC(C, -4.1, 4.1, 0.8, 1.95, (g, w, h) => {
    const X = (x) => (x + 4.1) / 8.2 * w, Y = (y) => (1.95 - y) / 1.15 * h;
    g.fillStyle = '#2aa3e6'; g.beginPath(); g.moveTo(X(-3.85), Y(1.45)); g.lineTo(X(-3.45), Y(1.62)); g.lineTo(X(-3.2), Y(1.2)); g.lineTo(X(-3.5), Y(1.1)); g.closePath(); g.fill();
    g.fillStyle = '#e5302f'; g.beginPath(); g.moveTo(X(-1.5), Y(1.5)); g.lineTo(X(-1.0), Y(1.55)); g.lineTo(X(-0.8), Y(1.2)); g.lineTo(X(-1.4), Y(1.25)); g.closePath(); g.fill();
    g.fillStyle = '#f2f4f8'; g.fillRect(X(-1.3), Y(1.1), X(2.2) - X(-1.3), 4); g.fillStyle = '#e5302f'; g.fillRect(X(-1.2), Y(1.06), X(2.0) - X(-1.2), 6); g.fillStyle = '#2aa3e6'; g.fillRect(X(-0.6), Y(0.98), X(2.0) - X(-0.6), 12);
    g.fillStyle = '#f2f4f8'; g.beginPath(); g.arc(X(0.0), Y(1.3), h * 0.15, 0, 7); g.fill();
    g.fillStyle = '#15161b'; g.font = '900 ' + Math.round(h * 0.2) + 'px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('29', X(0.0), Y(1.3) + 3);
    g.textAlign = 'left'; g.fillStyle = '#f2f4f8'; g.font = '900 ' + Math.round(h * 0.065) + 'px Arial Black, Arial, sans-serif'; g.fillText('SPEED', X(0.35), Y(1.3));
    g.fillStyle = '#2aa3e6'; for (let i = 0; i < 5; i++) g.fillRect(X(0.45 + i * 0.18), Y(1.12), 18, 10);
    g.fillStyle = '#2aa3e6'; g.beginPath(); g.moveTo(X(2.0), Y(1.25)); g.lineTo(X(3.0), Y(1.08)); g.lineTo(X(2.9), Y(0.98)); g.lineTo(X(1.9), Y(1.12)); g.closePath(); g.fill();
    // passages de roues dégagés (ailes à fleur des pneus : l'autocollant ne recouvre pas la roue)
    g.globalCompositeOperation = 'destination-out';
    for (const r of roues) { const Rr = r.RW + 0.1; g.beginPath(); g.ellipse(X(r.x), Y(r.RW), X(r.x + Rr) - X(r.x), Y(r.RW - Rr) - Y(r.RW), 0, 0, 7); g.rect(X(r.x - Rr), Y(r.RW), X(r.x + Rr) - X(r.x - Rr), h); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }, 1024, 144, 0.02, (x) => C.haut(x, 0) - 0.01);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 8.9, largeur: W * KZ, hauteur: 2.3, xAvant: 4.7, xArriere: -4.3, roues, plafond: 0.6 };   // fantaisie (rallye italien années 70, type Stratos 1 114 / 1 750 ≈ 0,64) : verrière basse ≈ 0,60
}

/* ------------------------------------------------------------------ H11 : « dalle » jaune de taxi, pavillon blanc posé, prise d'air noire */
function dalleTaxi(ctx) {
  // barème cat. B (berline taxi) : voies élargies (×1,1 en z), caisse abaissée, pavillon blanc posé plus bas et plus large (H_toit ≈ 0,65 W)
  const KZ = 1.1, { THREE, lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const jaune = o.lac('#ffc200', 0.25, 0.3), blanc = o.lac('#f6f7fa', 0.18, 0.1), noir = o.lac('#101116', 0.3, 0.4), noirM = o.mat('#0d0e12', 0.6, 0.3), argent = o.mat('#c9ced8', 0.35, 0.25);
  const W = 2.4, xr = -2.55, xv = 2.65, RWr = 0.66, RWv = 0.62;
  const roues = [{ x: xr, RW: RWr, ep: 0.64, z: 1.05, avant: false, jante: '#14151a', rayons: 'cinq', flanc: '#e9c23a', etrier: '#2a2b30' }, { x: xv, RW: RWv, ep: 0.56, z: 1.05, avant: true, jante: '#14151a', rayons: 'cinq', flanc: '#e9c23a', etrier: '#2a2b30' }];
  // grande dalle lissée : flancs galbés, ailes bombées, taille creusée, bouts arrondis
  const S = (x, w, y0, y1, nt = 5, nb = 4) => ({ x, w, y0, y1, nt, nb });
  const C = a.corps([S(-4.38, 0.98, 0.62, 1.3, 3), S(-4.2, 1.15, 0.5, 1.45), S(-2.55, 1.2, 0.5, 1.47), S(0, 1.17, 0.5, 1.46), S(2.65, 1.2, 0.5, 1.44), S(4.22, 1.14, 0.52, 1.36), S(4.42, 0.96, 0.6, 1.2, 3)], jaune,
    { ailes: [{ x: xr, R: 0.85, dw: 0.07, yH: 1.34 }, { x: xv, R: 0.8, dw: 0.07, yH: 1.32 }], taille: { x0: -1.7, x1: 1.8, dw: 0.04, y0: 0.55, y1: 1.38 }, arches: a.archesDe(roues, 0.12) });
  for (const r of roues) a.puits(r.x, r.RW, r.RW, r.z, r.ep * 0.9, noirM, r.avant);
  // habitacle noir bas, pavillon blanc bombé en surplomb
  o.profil([[-2.7, 1.38], [-2.7, 1.68], [1.0, 1.68], [1.0, 1.38]], 1.95, noir, { galbe: { avant: 0.05, arriere: 0.05, fruit: 0.08, bombe: 0 }, biseau: 0.05 });
  o.profil([[-2.95, 1.6], [-2.65, 1.82], [-1.6, 1.88], [0.3, 1.88], [1.0, 1.82], [1.25, 1.6]], 2.2, blanc, { galbe: { avant: 0.2, arriere: 0.15, fruit: 0.06, bombe: 0.04, lAv: 0.3, lAr: 0.3 }, biseau: 0.08 });
  // prise d'air noire (souffleur) devant le pavillon
  o.boite(0.9, 0.34, 0.8, noir, 1.7, 1.7, 0);
  a.boiteInc(0.95, 0.12, 0.85, noir, 1.72, 1.94, 0, 0.12);
  for (let i = 0; i < 3; i++) o.boite(0.06, 0.1, 0.84, noirM, 1.36 + i * 0.12, 2.04 - i * 0.0, 0);
  // face avant : panneau argent, optiques, fine lèvre ; arrière : feux rouges
  o.boite(0.12, 0.5, 1.8, argent, 4.38, 0.92, 0);
  o.phares(4.38, 1.2, [-0.9, 0.9], 0.14, lumBlanche);
  o.boite(0.3, 0.1, 2.2, noirM, 4.3, 0.55, 0);
  o.boite(0.08, 0.2, 0.6, lumRouge, -4.36, 1.05, 0.55); o.boite(0.08, 0.2, 0.6, lumRouge, -4.36, 1.05, -0.55);
  o.boite(0.3, 0.1, 2.2, noirM, -4.2, 0.55, 0);
  for (const z of [-1, 1]) o.boite(3.1, 0.1, 0.1, noirM, 0.05, 0.55, z * 1.08);
  // flancs : damier, filet rouge, « TAXI » italique, pastille rouge (hors passages de roues)
  a.drapeFlancsC(C, -4.4, 4.4, 0.5, 1.6, (g, w, h) => {
    const X = (x) => (x + 4.4) / 8.8 * w, Y = (y) => (1.6 - y) / 1.1 * h;
    const segs = [[-4.3, -3.45], [-1.75, 1.8], [3.5, 4.36]];
    for (const [x0, x1] of segs) {
      const n = Math.round((x1 - x0) / 0.22), cw = (X(x1) - X(x0)) / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#f6f7fa' : '#101116'; g.fillRect(X(x0) + i * cw, Y(1.42) + j * (Y(1.12) - Y(1.42)) / 3, cw, (Y(1.12) - Y(1.42)) / 3); }
      g.fillStyle = '#e03a24'; g.fillRect(X(x0), Y(1.09), X(x1) - X(x0), 7); g.fillStyle = '#f0883a'; g.fillRect(X(x0), Y(1.01), X(x1) - X(x0), 4);
    }
    g.fillStyle = '#101116'; g.font = 'italic 900 ' + Math.round(h * 0.4) + 'px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('TAXI', X(-1.0), Y(0.88));
    g.fillStyle = '#e03a24'; g.fillRect(X(3.55), Y(0.95), X(4.3) - X(3.55), Y(0.7) - Y(0.95)); g.fillStyle = '#f6f7fa'; g.font = '900 ' + Math.round(h * 0.13) + 'px Arial Black, Arial, sans-serif'; g.fillText('TX', X(3.7), Y(0.83));
  }, 1024, 128, 0.02, (x) => C.haut(x, 0) - 0.01);
  for (const r of roues) r.z = +(r.z * KZ).toFixed(3);                                              // voies élargies avec la caisse
  return { L: 8.85, largeur: W * KZ, hauteur: 2.0, xAvant: 4.45, xArriere: -4.4, roues };
}

export const GROUPE_5 = { H03: breakDragon, H04: coupeVengeur, H05: fourgonKei, H06: fourgonPostal, H07: camionCaisson, H08: taxiHotRod, H09: keiBenne, H10: rallyeSpeciale, H11: dalleTaxi };
