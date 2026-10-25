/**
 * Groupe 6 — bolides sur mesure J01, J02, J04, J05, J07, J08, J09, J10, J11.
 * Repère : avant = +x, sol y = 0, z = largeur. Motifs génériques uniquement (aucune marque).
 */
import { outils } from './outils.js';
import { contour, habitacle, aileron, echappement, retros, feuxAr, puits, zFlanc, decalHaut, vitre, arceau, kit6, serre, verreFume, puitsInt, coiffe, tasser, acc, rigide } from './aide_6.js';

/** Essieux : x, rayon, largeur de pneu, demi-voie (centre du pneu). */
const essieu = (x, RW, ep, z, avant, extra = {}) => ({ x, R: RW, RW, ep, z, avant, ...extra });
/** Exécute fn et marque comme accessoires (aileron, rétros…) toutes les mailles qu'elle ajoute au châssis. */
const enAcc = (ctx, fn) => { const n0 = ctx.chassis.children.length, r = fn(); ctx.chassis.children.slice(n0).forEach((m) => { m.userData.acc = true; }); return r; };
/** Barème « tolérance zéro » : tasse le pavillon et élargit caisse + voies (les roues sont décrites AVANT élargissement :
 *  leur demi-voie, déjà corrigée pour l'affleurement, est multipliée par sz avec la caisse). */
const finir = (ctx, roues, T) => { const f = tasser(ctx, T); for (const r of roues) r.z *= T.sz; return f; };
/** Plancher (brief 10) : remonte les sommets d'une maille cachée sous la ceinture au-dessus de pl(x) (jamais dans un passage de roue). */
const aplanir = (m, pl) => { const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const v = pl(pa.getX(i)); if (pa.getY(i) < v) pa.setY(i, v); } pa.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); return m; };

/* ---- J01 : coupé GT argenté — long capot plongeant vers un nez pointu, pavillon bas et reculé à double bosse,
 *      poupe haute en becquet relevé + grand aileron, kit large et soubassement noirs, bandes dégradées derrière la portière ---- */
function coupeGTArgent(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, o = outils(ctx), k = kit6(ctx);
  const argent = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#646a72').convertSRGBToLinear(), roughness: 0.3, metalness: 0.58, clearcoat: 1.0, clearcoatRoughness: 0.08, envMap: ctx.envMap, envMapIntensity: 0.4 })), /* gris argent métallisé, reflet retenu : lit gris (pas blanc) en studio */ noir = o.mat('#141518', 0.55, 0.3), sombre = o.mat('#08090b', 0.85, 0.1);
  const verre = verreFume(ctx, '#170b0d');                                                    // verre fumé, intérieur rouge sombre
  const rd = { jante: '#1f2125', rayons: 'cinq', flanc: '#f2f2f2', etrier: '#c8202a' };
  const sz = 1.22;                                                                                  // élargissement global (barème 9)
  const roues = [essieu(2.45, 0.64, 0.6, 0.95 - 0.13 / sz, true, { ...rd, ampY: 0.06, amp: 0.1 }), essieu(-2.45, 0.69, 0.78, 0.97 - 0.05 / sz, false, { ...rd, ampY: 0.04, amp: 0.24 })];
  // rapports photo : L/H ≈ 3,5 ; empattement ≈ 0,6 L ; porte-à-faux AR > AV ; capot long qui plonge vers un nez pointu bas
  const caisse = [
    { x: -3.98, w: 0.82, y0: 0.46, y1: 1.42, nt: 3.2, nb: 4 }, { x: -3.8, w: 0.98, y0: 0.36, y1: 1.6, nt: 3.6, nb: 4, wt: 0.9 }, { x: -3.2, w: 1.05, y0: 0.32, y1: 1.62, nt: 3.6, wt: 0.86 },
    { x: -2.45, w: 1.07, y0: 0.32, y1: 1.6, nt: 3.6, wt: 0.84 }, { x: -1.4, w: 1.0, y0: 0.32, y1: 1.48, nt: 3.6, wt: 0.85 },   // brief 10 : poupe abaissée sous le pavillon { x: 0.1, w: 1.0, y0: 0.32, y1: 1.43, nt: 3.4, wt: 0.86 },
    { x: 1.5, w: 1.01, y0: 0.32, y1: 1.36, nt: 3.2, wt: 0.86 }, { x: 2.45, w: 1.0, y0: 0.33, y1: 1.28, nt: 3, wt: 0.85 }, { x: 3.3, w: 0.92, y0: 0.35, y1: 1.02, nt: 2.8, wt: 0.83 },
    { x: 3.8, w: 0.74, y0: 0.38, y1: 0.82, nt: 2.6, nb: 3.4, wt: 0.8 }, { x: 4.08, w: 0.42, y0: 0.42, y1: 0.68, nt: 2.2, nb: 2.6, wt: 0.78 }];
  const opt = { ailes: k.ailes(roues, 0.12, 1.25, 0.2, 0.66), taille: { x: -0.2, L: 1.3, y: 0.9, h: 0.42, amp: 0.07 }, arches: k.arches(roues, 1.05) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.5 });                                         // brief 10 : tôle garantie au-dessus des pneus
  k.loft(caisse, argent, opt);
  // pavillon en bulle bas et reculé (demi-largeur 0,77 ≤ 0,74 × 1,07 au droit des hanches), pare-brise couché, longue lunette fastback
  // plafond réel (chantier V5, GR Supra 0,697) : hauteur de bulle 0,52 → 0,76 du dessin, le moteur n'écrase plus le pavillon
  const yb = 1.38;
  const cab = [
    { x: 1.38, w: 0.6, y1: 1.47, wt: 0.86 }, { x: 1.0, w: 0.7, y1: 1.74, wt: 0.82 }, { x: 0.3, w: 0.76, y1: 2.12, wt: 0.8 }, { x: -0.3, w: 0.77, y1: 2.27, wt: 0.8 },
    { x: -0.95, w: 0.77, y1: 2.3, wt: 0.8 }, { x: -1.6, w: 0.76, y1: 2.22, wt: 0.8 }, { x: -2.5, w: 0.7, y1: 1.97, wt: 0.82 }, { x: -3.2, w: 0.6, y1: 1.76, wt: 0.84 },
    { x: -3.45, w: 0.46, y1: 1.62, wt: 0.86 }].map((q) => ({ ...q, y1: yb + (q.y1 - yb) * 0.76, w: q.w * 1.28, wt: Math.min(0.93, q.wt + 0.1), nt: 3.4, nb: 3 })).map((q) => ({ ...q, y0: 2 * yb - q.y1 }));   // pavillon élargi, dessus plat, hauteur finale dessinée (brief 10)
  const plC = (x) => (x < -1.9 ? 1.5 : x < -1.4 ? 1.5 - 0.24 * (x + 1.9) / 0.5 : 1.26);              // plancher de la bulle : au-dessus des passages de roues
  k.pavillon(o, cab, argent, { verre, toit: [-3.5, 0.42], A: [0.42, 1.42], tR: 0.6, lb: 0.22, ep: 0.06, plancher: plC });
  for (const [a2, b2] of [[-0.7, 0.62], [Math.PI - 0.62, Math.PI + 0.7]]) aplanir(k.nappe(cab, {}, -3.5, -1.85, a2, b2, k.peau(argent), 0.06, 40, 10), plC);   // custode pleine effilée
  for (const [a2, b2] of [[-0.7, 0.05], [Math.PI - 0.05, Math.PI + 0.7]]) aplanir(k.nappe(cab, {}, -1.9, 1.2, a2, b2, k.peau(argent), 0.055, 30, 6), plC);    // seuil de vitre
  // toit à double bossage : deux bulles allongées de part et d'autre d'un creux central
  for (const z of [-0.36, 0.36]) {                                                                  // bossages lofts qui épousent la courbe du toit
    const st = [0.15, -0.3, -0.95, -1.6, -2.1].map((x, i, A) => { const yt = k.hautAu(cab, x, z), e = i === 0 || i === A.length - 1 ? 0.01 : 0.05; return { x, w: i === 0 || i === A.length - 1 ? 0.08 : 0.22, y0: yt - 0.12, y1: yt + e, nt: 2.2, nb: 2 }; });
    k.loft(st, argent, { nx: 40, ns: 24 }).position.z = z;
  }
  // becquet « queue de canard » courbé en bout de malle (couleur caisse)
  { const sh = new THREE.Shape(); sh.moveTo(-3.3, 1.57); sh.quadraticCurveTo(-3.75, 1.6, -4.06, 1.76); sh.lineTo(-4.1, 1.7); sh.quadraticCurveTo(-3.95, 1.48, -3.85, 1.38); sh.lineTo(-3.3, 1.47); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3, curveSegments: 12 });
    g.translate(0, 0, -0.85); const pz = g.attributes.position;
    for (let i = 0; i < pz.count; i++) { const zz = pz.getZ(i) / 0.89; pz.setY(i, pz.getY(i) - 0.1 * zz * zz); }
    g.computeVertexNormals(); o.ajouter(new THREE.Mesh(garde(g), argent)); }
  puitsInt(k, roues, sombre);
  k.nappe(caisse, opt, -1.55, 1.65, -1.05, -0.62, k.peau(noir), 0.015, 40, 6); k.nappe(caisse, opt, 1.65, -1.55, Math.PI + 0.62, Math.PI + 1.05, k.peau(noir), 0.015, 40, 6);   // bas de caisse noirs
  k.loft([{ x: 3.3, w: 1.02, y0: 0.3, y1: 0.42, nt: 4 }, { x: 3.85, w: 0.84, y0: 0.3, y1: 0.45, nt: 3.4 }, { x: 4.16, w: 0.44, y0: 0.32, y1: 0.43, nt: 2.6 }], noir, { nx: 16, ns: 28 });   // lame avant
  k.loft([{ x: -4.02, w: 0.8, y0: 0.36, y1: 0.66, nt: 4 }, { x: -3.8, w: 0.96, y0: 0.34, y1: 0.7, nt: 4 }, { x: -3.5, w: 0.96, y0: 0.34, y1: 0.66, nt: 4 }], noir, { nx: 16, ns: 28 });   // diffuseur
  for (let i = -2; i <= 2; i++) o.boite(0.34, 0.2, 0.04, noir, -3.98, 0.5, i * 0.3);
  k.lentille(k.boutX(caisse, 0.56, 0) - 0.02, 0.56, 0, 0.13, 0.36, sombre, 0.09);                 // grande prise centrale (bouche ovale)
  for (const z of [-0.6, 0.6]) {
    const pl = k.lentille(k.boutX(caisse, 0.55, z) - 0.03, 0.55, z, 0.1, 0.16, sombre, 0.08); pl.rotation.y = Math.sign(z) * 0.9;   // prises latérales
    const xp = k.boutX(caisse, 0.74, z * 0.88) - 0.04;
    const c = k.lentille(xp, 0.74, z * 0.88, 0.07, 0.26, sombre, 0.06); c.rotation.y = Math.sign(z) * 0.95; c.rotation.x = Math.sign(z) * 0.18;   // fourreau noir effilé
    const p2 = k.lentille(xp + 0.01, 0.75, z * 0.88, 0.035, 0.19, lumBlanche, 0.06); p2.rotation.y = Math.sign(z) * 0.95; p2.rotation.x = Math.sign(z) * 0.18;   // phares en amande
  }
  for (const z of [-0.58, 0.58]) { const y = 1.3, f = k.lentille(k.boutX(caisse, y, z, -1) + 0.02, y, z, 0.045, 0.32, lumRouge, 0.06); f.rotation.y = -Math.sign(z) * 0.35; }   // feux effilés
  o.boite(0.06, 0.05, 1.3, noir, k.boutX(caisse, 1.2, 0, -1) - 0.01, 1.2, 0);                  // bandeau noir de poupe
  echappement(o, THREE, -4.0, 0.5, 0.22, 0.09, 0.2); echappement(o, THREE, -4.0, 0.5, -0.22, 0.09, 0.2);
  for (const z of [-1.04, 1.04]) acc(rigide(o.boite(0.26, 0.13, 0.12, argent, 0.95, 1.56, z)), rigide(o.boite(0.08, 0.1, 0.12, noir, 0.95, 1.48, z * 0.94)));   // rétros
  enAcc(ctx, () => aileron(o, argent, -3.6, 2.02, 2.0, 0.7, 0.08, { yMontant: 1.6, flasque: 0.36 }));
  k.decalFlancs(caisse, opt, -1.9, 0.9, -0.1, 0.62, (g, w, h) => {                          // bande noire effilée + dégradé orange/rouge/jaune
    g.fillStyle = '#16171b'; g.beginPath(); g.moveTo(w * 0.05, h * 0.42); g.lineTo(w * 0.86, h * 0.18); g.lineTo(w * 0.86, h * 0.34); g.lineTo(w * 0.05, h * 0.5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w * 0.86, h * 0.18); g.lineTo(w * 0.95, h * 0.18); g.lineTo(w * 0.86, h * 0.75); g.lineTo(w * 0.8, h * 0.75); g.closePath(); g.fill();
    ['#d6252b', '#e0661f', '#e8b52a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(w * (0.56 + i * 0.075), h * 0.62, w * 0.06, h * 0.12); });
  }, 1024, 256);
  const f = finir(ctx, roues, { yA: 1.56, s: 1, d: 0.2, sz });                                    // brief 10 : hauteurs dessinées, élargissement seul
  return { L: 8.2, largeur: 2.4 * sz, hauteur: f(2.5), xAvant: 4.16, xArriere: -4.02, roues, jante: rd.jante, flanc: rd.flanc, plafond: 0.697 };   // GR Supra A90 : 1 292 / 1 854 mm
}

/* ---- J02 : coupé hatchback violet des années 80 (caisse anguleuse), roues dorées à trois branches, livrée de dérive or / rose, capot noir ---- */
function hatchViolet(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx), k = kit6(ctx);
  const violet = o.lac('#5a28b8', 0.2, 0.45), noir = o.mat('#16151b', 0.55, 0.3), sombre = o.mat('#08090b', 0.85, 0.1);
  const rd = { jante: '#d6a838', rayons: 'trois', flanc: null };
  const sz = 1.38;                                                                                  // élargissement global (barème 9, catégorie A)
  const roues = [essieu(2.3, 0.6, 0.52, 0.86, true, rd), essieu(-2.25, 0.61, 0.58, 0.84, false, rd)];
  const caisse = [
    { x: -3.66, w: 0.88, y0: 0.44, y1: 1.34, nt: 3 }, { x: -3.5, w: 0.97, y0: 0.36, y1: 1.46, nt: 3.4, nb: 4 }, { x: -2.25, w: 0.98, y0: 0.34, y1: 1.45, nt: 3.4, nb: 4 },
    { x: 0, w: 0.98, y0: 0.34, y1: 1.41, nt: 3.4, nb: 4 }, { x: 1.6, w: 0.98, y0: 0.34, y1: 1.32, nt: 3.4, nb: 4 }, { x: 2.8, w: 0.96, y0: 0.36, y1: 1.22, nt: 3.2, nb: 4 },
    { x: 3.5, w: 0.94, y0: 0.4, y1: 1.12, nt: 3 }, { x: 3.66, w: 0.84, y0: 0.46, y1: 0.98, nt: 2.6 }];
  const opt = { ailes: k.ailes(roues, 0.08, 1.15, 0.2, 0.55, 0.06), taille: { x: 0.1, L: 1.2, y: 0.8, h: 0.4, amp: 0.035 }, arches: k.arches(roues) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.5 });                                         // brief 10 : tôle garantie au-dessus des pneus
  k.loft(caisse, violet, opt);
  k.pavillon(o, [
    { x: 1.6, w: 0.86, y1: 1.42, wt: 0.9 }, { x: 1.2, w: 0.94, y1: 1.74, wt: 0.9 }, { x: 0.45, w: 0.96, y1: 2.04, wt: 0.9 }, { x: -0.6, w: 0.96, y1: 2.08, wt: 0.9 },
    { x: -1.6, w: 0.95, y1: 2.04, wt: 0.9 }, { x: -2.6, w: 0.9, y1: 1.84, wt: 0.9 }, { x: -3.3, w: 0.82, y1: 1.52, wt: 0.9 }, { x: -3.45, w: 0.66, y1: 1.42, wt: 0.9 }].map((q) => ({ ...q, y1: 1.38 + (q.y1 - 1.38) * 0.72, w: q.w * 0.89, nt: 3.4, wt: 0.86 })),   // brief 10 : hauteur finale dessinée
  violet, { toit: [-1.75, 0.4], A: [0.4, 1.55], C: [-3.35, -1.75], B: [-0.15], tR: 0.72, lb: 0.26, yb: 1.38, lB: 0.09, ep: 0.06, plancher: (x) => (x < 0 ? 1.37 : 1.3) });
  k.puitsRoues(roues, sombre);
  k.loft([{ x: 3.3, w: 0.98, y0: 0.36, y1: 0.7 }, { x: 3.62, w: 1.0, y0: 0.36, y1: 0.74, nt: 3 }, { x: 3.76, w: 0.92, y0: 0.4, y1: 0.68, nt: 3 }], noir, { nx: 20, ns: 32 });   // pare-chocs avant
  k.loft([{ x: -3.78, w: 0.92, y0: 0.4, y1: 0.68, nt: 3 }, { x: -3.62, w: 1.0, y0: 0.36, y1: 0.74, nt: 3 }, { x: -3.3, w: 0.98, y0: 0.36, y1: 0.7 }], noir, { nx: 20, ns: 32 });   // pare-chocs arrière
  k.lentille(k.boutX(caisse, 0.86, 0) + 0.0, 0.86, 0, 0.07, 0.36, sombre, 0.04);                                 // calandre fine
  for (const z of [-0.6, 0.6]) k.lentille(k.boutX(caisse, 0.92, z) - 0.03, 0.92, z, 0.08, 0.2, lumBlanche, 0.06);
  for (const z of [-0.56, 0.56]) k.lentille(k.boutX(caisse, 1.1, z, -1) + 0.03, 1.1, z, 0.1, 0.34, lumRouge, 0.05);
  acc(o.boite(0.6, 0.06, 1.5, noir, -3.32, 1.51, 0)).rotation.z = 0.12;                                                 // becquet de hayon
  for (const z of [-0.95, 0.95]) acc(rigide(o.boite(0.22, 0.12, 0.1, violet, 1.25, 1.52, z)));                                  // rétros
  k.decalDessus(caisse, opt, 1.65, 3.45, 0.55, (g, w, h) => {                                                       // capot noir + éclats blancs
    g.fillStyle = '#17161e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ece8f6'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(60 + i * 70, h * 0.82); g.lineTo(96 + i * 70, h * (0.2 + (i % 3) * 0.1)); g.lineTo(122 + i * 70, h * 0.82); g.closePath(); g.fill(); }
    g.fillStyle = '#f0b6e6'; g.fillRect(0, h * 0.47, w, 8);
  }, 512, 256);
  k.decalFlancs(caisse, opt, -2.95, 1.9, -0.4, 0.55, (g, w, h) => {                                                  // livrée de dérive or / rose / blanc
    g.fillStyle = '#e8bf4a'; g.beginPath(); g.moveTo(0, h * 0.72); g.lineTo(w * 0.96, h * 0.12); g.lineTo(w, h * 0.34); g.lineTo(w * 0.1, h * 0.95); g.closePath(); g.fill();
    g.fillStyle = '#f09ad8'; g.beginPath(); g.moveTo(w * 0.1, h * 0.95); g.lineTo(w * 0.7, h * 0.5); g.lineTo(w * 0.78, h * 0.62); g.lineTo(w * 0.3, h); g.closePath(); g.fill();
    g.fillStyle = '#f4f0ff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w * (0.5 + i * 0.1), 0); g.lineTo(w * (0.55 + i * 0.1), 0); g.lineTo(w * (0.4 + i * 0.1), h * 0.6); g.closePath(); g.fill(); }
    g.lineWidth = 8; g.strokeStyle = '#2a1456'; g.fillStyle = '#ffd24a'; g.font = '900 100px Arial Black, Arial, sans-serif'; g.strokeText('DRIFT', w * 0.3, h * 0.6); g.fillText('DRIFT', w * 0.3, h * 0.6);
    g.fillStyle = '#f4f0ff'; g.font = '900 30px Arial Black, Arial'; g.fillText('TURBO', w * 0.06, h * 0.86);
  }, 1024, 256);
  const f = finir(ctx, roues, { yA: 1.4, s: 1, d: 0.2, sz });                                    // brief 10 : coupé H_toit/W ≈ 0,66 (photo), élargissement seul
  return { L: 7.55, largeur: 2.12 * sz, hauteur: f(2.2), xAvant: 3.78, xArriere: -3.78, roues, jante: rd.jante, flanc: null };
}

/* ---- J04 : monospace rétro cubique argenté, gros soubassement noir enveloppant, filets bleus, roues blanches à flanc blanc, becquet de pavillon ---- */
function monospaceArgent(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx), k = kit6(ctx);
  const argent = o.lac('#aeb2ba', 0.3, 0.55), noir = o.lac('#17181c', 0.45, 0.2), sombre = o.mat('#08090b', 0.85, 0.1), clair = o.mat('#d4d8de', 0.35, 0.6);
  const rd = { jante: '#f2f2f2', rayons: 'plein', flanc: '#f4f4f4' };
  const sz = 1.22;                                                                                  // élargissement global (barème 9, catégorie C)
  const roues = [essieu(2.3, 0.56, 0.5, 0.82 + 0.09 / sz, true, rd), essieu(-2.3, 0.56, 0.5, 0.82 + 0.09 / sz, false, rd)];
  const caisse = [
    { x: -3.6, w: 0.94, y0: 0.62, y1: 1.5, nt: 4, nb: 4 }, { x: -3.5, w: 1.0, y0: 0.6, y1: 1.56, nt: 4.5, nb: 4.5 }, { x: 0, w: 1.0, y0: 0.6, y1: 1.56, nt: 4.5, nb: 4.5 },
    { x: 2.6, w: 0.99, y0: 0.6, y1: 1.56, nt: 4.2, nb: 4.5 }, { x: 3.42, w: 0.97, y0: 0.62, y1: 1.46, nt: 4 }, { x: 3.62, w: 0.9, y0: 0.66, y1: 1.34, nt: 3.6 }];
  const bas = [
    { x: -3.72, w: 0.98, y0: 0.36, y1: 0.98, nt: 4, nb: 4 }, { x: -3.55, w: 1.06, y0: 0.32, y1: 1.02, nt: 5, nb: 4 }, { x: 0, w: 1.06, y0: 0.32, y1: 1.0, nt: 5, nb: 4 },
    { x: 3.5, w: 1.06, y0: 0.32, y1: 0.98, nt: 5, nb: 4 }, { x: 3.7, w: 0.96, y0: 0.38, y1: 0.92, nt: 4 }];
  const optH = { ailes: k.ailes(roues, 0.04, 1.1, 0.3, 0.5), arches: k.arches(roues) };
  const optB = { ailes: k.ailes(roues, 0.06, 1.15, 0.3, 0.6), taille: { x: 0, L: 1.1, y: 0.65, h: 0.4, amp: 0.03 }, arches: k.arches(roues, 1.12) };
  k.loft(caisse, argent, optH);
  {
    const mb = k.loft(bas, noir, optB);                                                              // soubassement noir épais
    // inspection des trains : le soubassement (dessus à y ≈ 1,0, sous le sommet des pneus à 1,12) laissait une lamelle noire
    // plafonnée dans la bande du pneu, visible comme un trait à travers le haut de la gomme. Au droit de chaque passage, les
    // sommets tombant dans le disque du pneu (+3 cm) sont rabattus sur la paroi intérieure du passage (|z| = zin) : la caisse
    // s'arrête contre le flanc intérieur du pneu, l'extérieur reste inchangé.
    const pa = mb.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      for (const [j, a] of optB.arches.entries()) {
        const Rp = roues[j].RW + 0.03;
        if (Math.abs(z) > a.zin && (x - a.x) ** 2 + (y - a.y) ** 2 < Rp * Rp) { pa.setZ(i, Math.sign(z) * a.zin); break; }
      }
    }
    pa.needsUpdate = true; mb.geometry.computeVertexNormals(); mb.geometry.computeBoundingSphere();
  }
  k.pavillon(o, [
    { x: 2.85, w: 0.92, y1: 1.56, wt: 0.92 }, { x: 2.55, w: 0.95, y1: 2.06, wt: 0.91 }, { x: 1.9, w: 0.96, y1: 2.62, wt: 0.9 }, { x: 1.2, w: 0.96, y1: 2.68, wt: 0.9 },
    { x: -3.3, w: 0.96, y1: 2.7, wt: 0.9 }, { x: -3.52, w: 0.92, y1: 2.6, wt: 0.91 }, { x: -3.6, w: 0.82, y1: 2.3, wt: 0.92 }].map((q) => ({ ...q, nt: 3.6, wt: Math.max(q.wt, 0.93) })),
  argent, { toit: [-3.42, 1.75], A: [1.75, 2.75], C: [-3.6, -3.42], B: [0.95, -0.55, -2.1], tR: 0.36, lb: 0.22, yb: 1.5, lB: 0.1, ep: 0.06, plancher: 1.42 });
  k.puitsRoues(roues, sombre, 1.12);
  { const hayon = o.boite(0.06, 0.82, 1.62, argent, -3.63, 1.86, 0), lv = verreFume(ctx, '#0d1422');   // hayon couleur caisse + lunette en retrait
    o.boite(0.03, 0.42, 1.32, lv, -3.665, 2.02, 0); o.boite(0.035, 0.05, 1.4, sombre, -3.665, 1.78, 0); }
  acc(o.boite(0.5, 0.1, 1.6, argent, -3.25, 2.86, 0)).rotation.z = 0.1;                          // becquet de pavillon
  for (const z of [-0.74, 0.74]) acc(o.boite(0.5, 0.24, 0.06, argent, -3.25, 2.76, z));
  o.boite(0.6, 0.05, 0.8, sombre, -0.6, 2.74, 0);                                                  // toit ouvrant
  o.boite(0.06, 0.2, 0.8, clair, k.boutX(caisse, 1.12, 0) - 0.01, 1.12, 0);                 // calandre claire
  for (const z of [-0.68, 0.68]) o.boite(0.06, 0.2, 0.34, lumBlanche, k.boutX(caisse, 1.14, z) - 0.01, 1.14, z);
  o.boite(0.04, 0.52, 1.76, argent, -3.62, 1.2, 0);                                              // face arrière plane (masque l'éventail du loft)
  for (const z of [-0.74, 0.74]) k.lentille(-3.645, 1.28, z, 0.2, 0.09, lumRouge, 0.03);
  o.boite(0.04, 0.16, 0.5, o.mat('#e6e8ec', 0.5, 0.2), k.boutX(bas, 0.7, 0) + 0.01, 0.7, 0);       // plaque avant
  for (const z of [-1.02, 1.02]) acc(rigide(o.boite(0.12, 0.26, 0.06, argent, 2.6, 1.8, z)), rigide(o.boite(0.08, 0.06, 0.16, argent, 2.6, 1.7, z * 0.95)));                  // rétros
  k.decalFlancs(caisse, optH, -3.45, 2.75, -0.45, 0.3, (g, w, h) => {                              // filets bleus qui montent vers l'arrière
    g.fillStyle = '#3d86d8'; g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w * 0.7, h * 0.48); g.lineTo(w, h * 0.62); g.lineTo(w, h * 0.74); g.lineTo(w * 0.7, h * 0.62); g.lineTo(0, h * 0.46); g.closePath(); g.fill();
    g.fillStyle = '#1d3f77'; g.beginPath(); g.moveTo(0, h * 0.52); g.lineTo(w * 0.7, h * 0.68); g.lineTo(w, h * 0.8); g.lineTo(w, h * 0.86); g.lineTo(w * 0.7, h * 0.76); g.lineTo(0, h * 0.6); g.closePath(); g.fill();
  }, 1024, 128);
  const f = finir(ctx, roues, { yA: 1.45, s: 0.9, d: 0.25, sz });                                // brief 10 : van haut (H_toit/W ≈ 0,95), pavillon cubique rendu
  return { L: 7.44, largeur: 2.2 * sz, hauteur: f(2.9), xAvant: 3.72, xArriere: -3.72, roues, jante: rd.jante, flanc: rd.flanc };
}

/* ---- J05 : petite citadine 2 volumes CARRÉE et haute (vert citron) — flancs plats verticaux, capot court et plat noir,
 *      pare-brise droit, toit plat, hayon quasi vertical vitré cyan, vitres latérales rectangulaires à montant B,
 *      élargisseurs d'ailes rivetés, pare-chocs noirs, phares ronds cerclés de chrome, roues 3 branches à fort déport ---- */
function compacteCitron(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, o = outils(ctx), k = kit6(ctx);
  const vert = o.lac('#6cae00', 0.32, 0.05), noir = o.mat('#131417', 0.55, 0.3), sombre = o.mat('#08090b', 0.85, 0.1);
  const verre = verreFume(ctx, '#0d2a33'), cyan = verreFume(ctx, '#2a9fc0', 0.2);
  const rd = { jante: '#2a2c31', rayons: 'trois', flanc: null };
  // rapports photo (profil) : L/H ≈ 2,3 ; ceinture ≈ 0,58 H ; capot ≈ 0,52 H ; roue Ø ≈ 0,17 L ; empattement ≈ 0,66 L
  const sz = 1.28;                                                                                  // élargissement global (barème 9, catégorie B)
  const roues = [essieu(2.15, 0.56, 0.56, 0.92, true, { ...rd, ampY: 0.05 }), essieu(-2.1, 0.56, 0.6, 0.92, false, { ...rd, ampY: 0.05 })];
  const caisse = [
    { x: -3.2, w: 0.9, y0: 0.46, y1: 1.36, nt: 5, nb: 5, wt: 0.94 }, { x: -3.1, w: 0.97, y0: 0.38, y1: 1.41, nt: 6, nb: 5, wt: 0.95 }, { x: -2.1, w: 0.98, y0: 0.36, y1: 1.41, nt: 6, nb: 5, wt: 0.95 },
    { x: 0, w: 0.98, y0: 0.36, y1: 1.41, nt: 6, nb: 5, wt: 0.95 }, { x: 1.15, w: 0.98, y0: 0.36, y1: 1.4, nt: 6, nb: 5, wt: 0.95 }, { x: 2.15, w: 0.97, y0: 0.37, y1: 1.36, nt: 6, nb: 5, wt: 0.95 },
    { x: 2.95, w: 0.95, y0: 0.4, y1: 1.31, nt: 5.5, nb: 5, wt: 0.95 }, { x: 3.2, w: 0.88, y0: 0.46, y1: 1.24, nt: 4.5, nb: 4.5, wt: 0.93 }];   // brief 10 : ceinture ≈ 0,62 H (photo), vitres hautes
  const opt = { ailes: k.ailes(roues, 0.1, 1.12, 0.1, 0.55), arches: k.arches(roues, 1.06) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.5 });                                         // tôle garantie au-dessus des pneus
  k.loft(caisse, vert, opt);
  // pavillon à coins arrondis (sections superellipses nt 3,6) : demi-largeur 0,72 ≤ 0,74 × 0,98, montants rentrants (wt)
  const yb = 1.38, kH = 0.92;                                                                     // kH : hauteur de cabine (0,74 → 0,92, plafond réel 0,88 : plus de « crêpe »)
  const cab = [
    { x: 1.55, w: 0.66, y1: 1.64, wt: 0.9 }, { x: 1.1, w: 0.71, y1: 2.14, wt: 0.86 }, { x: 0.62, w: 0.72, y1: 2.56, wt: 0.84 }, { x: 0.25, w: 0.72, y1: 2.66, wt: 0.84 },
    { x: -1.5, w: 0.72, y1: 2.68, wt: 0.84 }, { x: -2.45, w: 0.71, y1: 2.64, wt: 0.84 }, { x: -2.8, w: 0.68, y1: 2.42, wt: 0.85 }, { x: -3.0, w: 0.63, y1: 1.94, wt: 0.88 },
    { x: -3.06, w: 0.58, y1: 1.64, wt: 0.9 }].map((q) => ({ ...q, y1: 1.4 + (q.y1 - 1.64) * kH, w: q.w * 1.34, wt: 0.92, nt: 3.2, nb: 3 })).map((q) => ({ ...q, y0: 2 * yb - q.y1 }));   // pavillon haut dessiné (sans tassement)   // pavillon élargi, coins adoucis
  k.pavillon(o, cab, vert, { verre, toit: [-2.62, 0.48], A: [0.48, 1.58], C: [-3.08, -2.55], B: [-0.68], lB: 0.08, tR: 0.6, lb: 0.2, ep: 0.06, plancher: 1.3, ceinture: 0.06 });   // + seuil de vitre couleur caisse (ceinture)
  k.nappe(cab, {}, -3.03, -2.72, 0.75, Math.PI - 0.75, cyan, 0.065, 16, 20);                       // hayon vitré cyan
  acc(o.boite(0.5, 0.07, 1.9, noir, -2.6, 1.4 + kH + 0.07, 0)).rotation.z = 0.12;                                 // becquet de pavillon
  puitsInt(k, roues, sombre);
  for (const r of roues) for (const sg of [-1, 1]) {                                                 // élargisseurs d'ailes 3D larges + rivets chromés
    const R0 = r.RW + 0.15, tube = 0.12, zc = sg * (r.z + 0.02), fl = new THREE.Mesh(garde(new THREE.TorusGeometry(R0, tube, 10, 36, Math.PI + 0.36)), vert);
    fl.rotation.z = -0.18; fl.scale.set(1, 1, 1.6); fl.position.set(r.x, r.RW, zc); o.ajouter(fl);
    for (let i = 0; i < 7; i++) {
      const a = 0.12 + i * (Math.PI - 0.24) / 6, v = new THREE.Mesh(garde(new THREE.SphereGeometry(0.032, 8, 6)), o.chrome);
      v.position.set(r.x + Math.cos(a) * R0, r.RW + Math.sin(a) * R0, zc + sg * tube * 1.45); rigide(o.ajouter(v));
    }
  }
  k.loft([{ x: 2.95, w: 0.99, y0: 0.42, y1: 0.7, nt: 5 }, { x: 3.24, w: 0.99, y0: 0.42, y1: 0.72, nt: 5 }, { x: 3.32, w: 0.9, y0: 0.44, y1: 0.68, nt: 4 }], noir, { nx: 20, ns: 32 });   // pare-chocs noirs
  k.loft([{ x: -3.32, w: 0.9, y0: 0.44, y1: 0.7, nt: 4 }, { x: -3.24, w: 0.99, y0: 0.42, y1: 0.74, nt: 5 }, { x: -2.95, w: 0.99, y0: 0.42, y1: 0.72, nt: 5 }], noir, { nx: 20, ns: 32 });
  const xf = k.boutX(caisse, 0.98, 0);
  { const fond = o.mat('#050506', 0.9, 0.05), xc = xf + 0.1;
    o.boite(0.12, 0.05, 1.7, vert, xc - 0.04, 1.2, 0); o.boite(0.12, 0.05, 1.7, vert, xc - 0.04, 0.76, 0);   // cadre (lèvres haute et basse saillantes)
    for (const z of [-0.86, 0.86]) o.boite(0.12, 0.48, 0.05, vert, xc - 0.04, 0.98, z);
    o.boite(0.04, 0.42, 1.66, fond, xc - 0.1, 0.98, 0);                                                  // fond noir en retrait
    for (let i = 0; i < 4; i++) o.boite(0.03, 0.025, 0.86, o.mat('#30333a', 0.4, 0.6), xc - 0.075, 0.87 + i * 0.075, 0);   // lames de calandre
    for (const z of [-0.6, 0.6]) {
      o.cyl(0.16, 0.16, 0.05, o.chrome, xc - 0.07, 0.98, z, 0, Math.PI / 2, 22); k.lentille(xc - 0.05, 0.98, z, 0.13, 0.13, lumBlanche, 0.04);   // phares ronds
      for (const r of [0.7, -0.7]) { const t = o.boite(0.012, 0.03, 0.2, o.mat('#f2c81c', 0.5, 0.1), xc - 0.005, 0.98, z); t.rotation.x = r; }   // ruban en X
      o.cyl(0.08, 0.08, 0.05, o.chrome, k.boutX(caisse, 0.58, z) + 0.2, 0.58, z, 0, Math.PI / 2, 16); k.lentille(k.boutX(caisse, 0.58, z) + 0.22, 0.58, z, 0.06, 0.06, o.mat('#7fd8ff', 0.2, 0.2), 0.03);   // antibrouillards
    } }
  for (const z of [-0.8, 0.8]) o.boite(0.06, 0.3, 0.14, lumRouge, k.boutX(caisse, 1.06, z, -1) + 0.01, 1.06, z);   // feux verticaux
  o.boite(0.04, 0.2, 0.5, o.mat('#e6e8ec', 0.5, 0.2), k.boutX(caisse, 1.0, 0, -1) + 0.0, 1.0, 0);   // plaque
  for (const z of [-1.0, 1.0]) acc(rigide(o.boite(0.2, 0.12, 0.08, vert, 1.25, 1.56, z)), rigide(o.boite(0.06, 0.12, 0.05, noir, 1.3, 1.48, z * 0.96)));
  k.decalDessus(caisse, opt, 1.25, 3.12, 0.55, (g, w, h) => {                                          // capot noir mat avec évents
    g.fillStyle = '#131417'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c2e33'; for (let i = 0; i < 6; i++) g.fillRect(w * 0.3 + i * 22, h * 0.3, 11, h * 0.4);
  }, 512, 256);
  echappement(o, THREE, -3.3, 0.5, 0.55, 0.08, 0.2);
  k.decalFlancs(caisse, opt, -2.2, -1.5, 0.15, 0.65, (g, w, h) => { g.fillStyle = '#f4f6f4'; g.fillRect(20, 40, 210, 170); g.fillStyle = '#1a9a4a'; g.font = '900 150px Arial Black, Arial'; g.fillText('R', 70, 190); }, 256, 256);
  const f = finir(ctx, roues, { yA: 1.35, s: 1, d: 0.25, sz });                                 // brief 10 : citadine haute (H_toit/W ≈ 0,73) : élargissement seul, plus de tassement
  return { L: 6.64, largeur: 2.3 * sz, hauteur: f(2.24), xAvant: 3.32, xArriere: -3.32, roues, jante: rd.jante, flanc: null, plafond: 0.88 };   // Civic 1973 : 1 325 / 1 505 mm
}

/* ---- Base commune J07 / J08 (9e vague, reconstruction imposée) : petit roadster japonais FERMÉ par un hardtop, tout en rondeurs.
 *      Caisse large et basse (catégorie A : toit ≤ 0,58 × largeur hors tout), museau bas arrondi à bouche ovale « souriante »,
 *      ailes galbées qui COIFFENT les roues (pneus à fleur), cockpit court qui s'arrête net vers x = −1,1,
 *      puis VRAIE MALLE plate et basse jusqu'à x ≈ −3,3 ; pavillon à toit plat et large (≈ 0,8 × caisse).
 *      J07 : phares escamotables ronds LEVÉS ; J08 : phares escamotables fermés (paupières à fleur du capot). ---- */
function roadsterBase(ctx, cfg) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, o = outils(ctx), k = kit6(ctx);
  const corps = o.lac(cfg.corps, 0.22, 0.35), toit = o.lac(cfg.toit, 0.4, 0.25), aile = o.lac(cfg.aile, 0.5, 0.2), noir = o.mat('#111215', 0.55, 0.3), sombre = o.mat('#08090b', 0.85, 0.1);
  const verre = verreFume(ctx, cfg.verre || '#0c1118');
  const rd = { jante: cfg.jante, rayons: cfg.rayons || 'plein', flanc: cfg.flanc };
  // empattement ≈ 0,59 L, porte-à-faux courts ; pneus à fleur des ailes (face extérieure ≈ demi-largeur d'aile 1,42)
  const roues = [essieu(2.05, 0.56, 0.62, 1.1, true, { ...rd, ampY: 0.1, amp: 0.12 }), essieu(-2.2, 0.58, 0.72, 1.05, false, { ...rd, ampY: 0.08, amp: 0.12 })];   // photo : roue Ø ≈ 0,62 H
  // sections : dessus plat aux épaules (nt 4) pour porter un pavillon large, nez et poupe arrondis en plan (w qui chute) et en élévation
  const caisse = [
    { x: -3.56, w: 0.7, y0: 0.5, y1: 1.02, nt: 2.4, nb: 2.4 }, { x: -3.42, w: 1.08, y0: 0.42, y1: 1.2, nt: 3, nb: 2.8 }, { x: -3.1, w: 1.26, y0: 0.38, y1: 1.3, nt: 3.6, nb: 3.2 },
    { x: -2.2, w: 1.3, y0: 0.37, y1: 1.33, nt: 4, nb: 3.6 }, { x: -1.1, w: 1.3, y0: 0.37, y1: 1.32, nt: 4, nb: 3.6 }, { x: 0.0, w: 1.3, y0: 0.37, y1: 1.3, nt: 4, nb: 3.6 },
    { x: 1.0, w: 1.29, y0: 0.37, y1: 1.26, nt: 3.8, nb: 3.6 }, { x: 2.05, w: 1.27, y0: 0.38, y1: 1.25, nt: 3.4, nb: 3.4 }, { x: 2.9, w: 1.2, y0: 0.4, y1: 1.1, nt: 3, nb: 3 },
    { x: 3.35, w: 1.02, y0: 0.42, y1: 0.92, nt: 2.6, nb: 2.6 }, { x: 3.6, w: 0.6, y0: 0.46, y1: 0.78, nt: 2.2, nb: 2.2 }];   // brief 10 : ligne de caisse remontée (photo : ceinture ≈ 0,66 H)
  const opt = { ailes: k.ailes(roues, 0.12, 1.2, 0.12, 0.6), taille: { x: -0.1, L: 0.95, y: 0.8, h: 0.35, amp: 0.035 }, arches: k.arches(roues, 1.06) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.55 });                              // brief 10 : ailes rehaussées et galbées qui ENVELOPPENT les roues
  k.loft(caisse, corps, opt);
  // hardtop court : base du pare-brise x = 0,95, sommet plat 1,62, lunette raide qui tombe à x = −1,1 sur la malle
  const yb = 1.22;
  const cab = [
    { x: 1.0, w: 1.13, y1: 1.26, wt: 0.95 }, { x: 0.62, w: 1.16, y1: 1.56, wt: 0.97 }, { x: 0.2, w: 1.17, y1: 1.74, wt: 0.98 }, { x: -0.2, w: 1.17, y1: 1.77, wt: 0.98 },
    { x: -0.62, w: 1.17, y1: 1.75, wt: 0.98 }, { x: -0.92, w: 1.14, y1: 1.6, wt: 0.96 }, { x: -1.1, w: 1.08, y1: 1.34, wt: 0.94 }].map((q) => ({ ...q, nt: 4.2, nb: 3, y0: 2 * yb - q.y1 }));
  k.pavillon(o, cab, toit, { verre, toit: [-0.86, 0.22], A: [0.22, 1.0], C: [-1.12, -0.86], tR: 0.42, lb: 0.26, ep: 0.022 });
  for (const [a, b] of [[-0.7, 0.86], [Math.PI - 0.86, Math.PI + 0.7]]) k.nappe(cab, {}, -1.12, -0.5, a, b, k.peau(toit), 0.022, 20, 10);    // custodes pleines du hardtop
  for (let i = 0; i < 4; i++) { const x = -0.95 - i * 0.045, b = o.boite(0.03, 0.035, 1.5, noir, x, k.hautAu(cab, x, 0) + 0.012, 0); b.rotation.z = 1.0; }   // ouïes sur la lunette
  acc(o.boite(0.22, 0.04, 1.9, toit, -1.12, 1.68, 0));                                              // lèvre de becquet au bord du hardtop
  for (const r of roues) for (const sg of [-1, 1]) { const zin = r.z - r.ep / 2 - 0.04; k.arcGarde(r.x, r.RW, r.RW * 1.01, r.RW * 1.06 + 0.03, sg * (zin + 0.1), 0.2, sombre); }   // fonds de passages logés dans la découpe (jamais à travers la malle)
  // élargisseurs : fond d'aile contrasté drapé + lèvre en demi-tore à fleur du pneu (aucune saillie hors pneu)
  for (const r of roues) k.decalFlancs(caisse, opt, r.x - 1.0, r.x + 1.0, -1.25, 0.42, (g, w, h) => {      // fond d'aile contrasté (s'arrête sous l'épaule)
    g.fillStyle = cfg.aile; g.beginPath(); g.ellipse(w / 2, h, w * 0.47, h * 0.97, 0, Math.PI, 0); g.closePath(); g.fill();
  }, 512, 256, 0.01);
  for (const r of roues) for (const sg of [-1, 1]) {                                                  // élargisseur en demi-tore à fleur du pneu
    const R0 = Math.max(r.RW * 1.06 + 0.06, r.RW + 0.16), m = new THREE.Mesh(garde(new THREE.TorusGeometry(R0, 0.08, 12, 40, Math.PI + 0.36)), aile);
    m.rotation.z = -0.18; m.scale.set(1, 1, 1.0); m.position.set(r.x, r.RW, sg * (r.z + r.ep / 2 - 0.08)); o.ajouter(m);
  }
  k.decalFlancs(caisse, opt, -1.6, 1.45, -1.25, -0.75, (g, w, h) => { g.fillStyle = cfg.aile; g.fillRect(0, 0, w, h); }, 256, 64, 0.01);   // bas de caisse
  // museau bas arrondi : bouclier contrasté, grande bouche ovale « souriante » (croissant), antibrouillards ronds
  k.loft([{ x: 3.0, w: 1.22, y0: 0.38, y1: 0.6, nt: 3 }, { x: 3.4, w: 1.04, y0: 0.4, y1: 0.64, nt: 3 }, { x: 3.66, w: 0.62, y0: 0.44, y1: 0.6, nt: 2.4 }], aile, { nx: 20, ns: 32 });
  { const pts = [];                                                                                   // bouche ovale « souriante » : ellipsoïdes sombres le long d'un arc relevé aux coins
    for (let i = 0; i <= 24; i++) { const z = -0.56 + i * 0.04667, u = z / 0.56, y = 0.64 + 0.08 * u * u; pts.push([k.boutX(caisse, y, z) - 0.02, y, z]); }
    for (const [x, y, z] of pts) k.lentille(x, y, z, 0.13 - 0.05 * Math.pow(Math.abs(z) / 0.56, 2), 0.075, sombre, 0.06);
    const lip = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x + 0.035, y - 0.13 + 0.05 * Math.pow(z / 0.56, 2), z)));
    o.ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(lip, 30, 0.025, 6, false)), aile));
    for (let i = -2; i <= 2; i++) { const z = i * 0.18, y = 0.64 + 0.08 * Math.pow(z / 0.56, 2); o.boite(0.03, 0.17, 0.025, noir, k.boutX(caisse, y, z) + 0.02, y, z); } }   // lames
  for (const z of [-0.72, 0.72]) { const x = k.boutX(caisse, 0.6, z); o.cyl(0.07, 0.07, 0.06, o.chrome, x - 0.03, 0.6, z, 0, Math.PI / 2, 16); k.lentille(x, 0.6, z, 0.055, 0.055, lumBlanche, 0.03); }
  for (const z of [-0.98, 0.98]) k.lentille(k.boutX(caisse, 0.86, z) - 0.03, 0.86, z, 0.04, 0.11, o.mat('#e8862a', 0.4, 0.1), 0.05);   // clignotants
  // phares escamotables ronds
  for (const z of [-0.8, 0.8]) {
    const x = 2.78, yh = k.hautDef(caisse, opt, x, z);
    if (cfg.phares === 'leves') {
      const boite = o.boite(0.3, 0.26, 0.4, corps, x, yh + 0.1, z); boite.rotation.z = 0.08;                // pod levé couleur caisse
      o.boite(0.06, 0.2, 0.34, noir, x + 0.14, yh + 0.11, z);
      o.cyl(0.12, 0.12, 0.05, o.chrome, x + 0.16, yh + 0.11, z, 0, Math.PI / 2, 20); k.lentille(x + 0.18, yh + 0.11, z, 0.1, 0.1, lumBlanche, 0.035);
    } else {
      const p = o.boite(0.34, 0.03, 0.42, corps, x, yh + 0.012, z); p.rotation.z = -0.12;                  // paupière fermée à fleur
      o.boite(0.36, 0.012, 0.012, noir, x, yh + 0.02, z + 0.21); o.boite(0.36, 0.012, 0.012, noir, x, yh + 0.02, z - 0.21);
    }
  }
  // poupe ronde : bandeau de feux nervuré pleine largeur, diffuseur contrasté, échappement central
  for (let i = 0; i < 3; i++) { const y = 1.06 - i * 0.075, pts = [];
    for (let j = 0; j <= 16; j++) { const z = -0.95 + j * 0.11875; pts.push(new THREE.Vector3(k.boutX(caisse, y, z, -1) + 0.008, y, z)); }
    o.ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.026, 6, false)), i === 0 ? lumRouge : noir)); }
  k.loft([{ x: -3.62, w: 0.6, y0: 0.44, y1: 0.6, nt: 2.4 }, { x: -3.45, w: 1.04, y0: 0.4, y1: 0.64, nt: 3 }, { x: -3.1, w: 1.24, y0: 0.38, y1: 0.58, nt: 3 }], aile, { nx: 20, ns: 32 });
  echappement(o, THREE, -3.6, 0.5, 0.0, 0.08, 0.2);
  for (const z of [-1.2, 1.2]) acc(o.boite(0.2, 0.12, 0.1, corps, 0.82, 1.44, z), o.boite(0.06, 0.06, 0.1, noir, 0.86, 1.36, z * 0.96));   // rétros
  k.decalFlancs(caisse, opt, -1.3, 1.25, -0.42, 0.6, (g, w, h) => {                                // gros « 2 » + « 77 » et bandeaux (portière)
    g.fillStyle = cfg.num; g.font = '900 230px Arial Black, Arial'; g.fillText('2', 360, 205);
    g.font = '900 110px Arial Black, Arial'; g.fillText('77', 470, 240);
    g.fillRect(360, 22, 140, 12); g.fillStyle = cfg.bandeau; g.fillRect(60, 160, 260, 26); g.fillRect(60, 200, 190, 16);
  }, 768, 256);
  if (cfg.capot) k.decalDessus(caisse, opt, 1.3, 2.6, 0.75, cfg.capot, 512, 256);
  return { L: 7.26, largeur: 2.84, hauteur: 1.8, xAvant: 3.66, xArriere: -3.62, roues, jante: cfg.jante, flanc: cfg.flanc };
}

/* ---- J07 : roadster bleu, hardtop gris anthracite, élargisseurs noirs, roues blanches, capot à chevrons jaunes, phares levés ---- */
function roadsterBleu(ctx) {
  return roadsterBase(ctx, { corps: '#1170c4', aile: '#17181c', toit: '#4a4c52', num: '#101820', bandeau: '#101820', jante: '#f4f4f4', flanc: null, phares: 'leves',
    capot: (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f2c81c'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w * (0.5 + i * 0.1), h * 0.85); g.lineTo(w * (0.56 + i * 0.1), h * 0.85); g.lineTo(w * (0.64 + i * 0.1), h * 0.15); g.lineTo(w * (0.58 + i * 0.1), h * 0.15); g.closePath(); g.fill(); } g.fillStyle = '#101820'; g.font = '900 120px Arial Black, Arial'; g.fillText('51', w * 0.1, h * 0.68); } });
}

/* ---- J08 : même roadster, version blanche à élargisseurs gris, hardtop noir, roues noires cerclées de blanc, phares fermés ---- */
function roadsterBlanc(ctx) {
  return roadsterBase(ctx, { corps: '#f2f2f0', aile: '#3a3d44', toit: '#17181b', num: '#111214', bandeau: '#d8302a', jante: '#17181b', flanc: '#f4f4f4', capot: null, phares: 'fermes' });
}

/* ---- J09 : crossover / sportback électrique violet — caisse haute, ceinture haute qui remonte vers l'arrière,
 *      pavillon long et presque plat, vitrage latéral en bandeau effilé, hayon raide prolongé par un aileron de toit
 *      à dérives, capot plat à grille noire, jupes noires, roues blanches à branches, étriers fluo, bandeau de feux courbé ---- */
function hayonElectrique(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, o = outils(ctx), k = kit6(ctx);
  const violet = o.lac('#6a4cc0', 0.22, 0.45), noir = o.mat('#131418', 0.55, 0.3), sombre = o.mat('#08090b', 0.85, 0.1);
  const verre = verreFume(ctx, '#0b0c14');
  const rd = { jante: '#f4f4f6', rayons: 'six', flanc: null, etrier: '#c6ff2a' };
  // rapports photo : L/H ≈ 3,1 ; ceinture ≈ 0,66 H ; roue Ø ≈ 0,17 L ; empattement ≈ 0,64 L ; pare-brise à 0,27 L du nez
  const sz = 1.22;                                                                                  // élargissement global (barème 9, catégorie C)
  const roues = [essieu(2.45, 0.66, 0.58, 0.96 - 0.11 / sz, true, { ...rd, ampY: 0.08 }), essieu(-2.4, 0.67, 0.68, 0.94 - 0.135 / sz, false, { ...rd, ampY: 0.08 })];
  const caisse = [
    { x: -3.78, w: 0.86, y0: 0.5, y1: 1.4, nt: 4, nb: 4, wt: 0.9 }, { x: -3.6, w: 0.98, y0: 0.42, y1: 1.56, nt: 4.5, nb: 4, wt: 0.9 }, { x: -2.4, w: 1.02, y0: 0.4, y1: 1.6, nt: 4.5, wt: 0.88 },
    { x: -0.8, w: 1.0, y0: 0.4, y1: 1.56, nt: 4.5, wt: 0.88 }, { x: 0.8, w: 1.0, y0: 0.4, y1: 1.5, nt: 4.5, wt: 0.88 }, { x: 1.75, w: 1.0, y0: 0.4, y1: 1.46, nt: 4.5, wt: 0.9 },
    { x: 2.45, w: 0.99, y0: 0.41, y1: 1.4, nt: 4.5, wt: 0.9 }, { x: 3.3, w: 0.95, y0: 0.44, y1: 1.18, nt: 4, wt: 0.88 }, { x: 3.75, w: 0.84, y0: 0.48, y1: 0.98, nt: 3.4, wt: 0.86 }];   // brief 10 : ceinture abaissée (vitres hautes)
  const opt = { ailes: k.ailes(roues, 0.13, 1.2, 0.15, 0.58), taille: { x: 0.0, L: 1.2, y: 0.95, h: 0.42, amp: 0.05 }, arches: k.arches(roues, 1.06) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.5 });                                         // brief 10 : tôle garantie au-dessus des pneus
  k.loft(caisse, violet, opt);
  const S9 = serre(ctx, o, { pts: [[1.78, 1.46], [0.35, 1.89], [-0.6, 1.92], [-2.4, 1.88], [-3.3, 1.74], [-3.62, 1.5]], yb: 1.46, wb: 0.96, wt: 0.86, seuil: 0.25, plonge: 0.08,
    mat: violet, verre, pb: [0, 0], lu: [4, 4], mcLu: 0.14,
    cotes: [[[1.5, 1.56], [0.42, 1.83], [-0.5, 1.86], [-2.3, 1.82], [-3.0, 1.7], [-2.7, 1.66], [-0.4, 1.6], [1.0, 1.54]]] });
  for (const x of [-0.45]) for (const sg of [-1, 1]) { const b = o.boite(0.14, 0.28, 0.03, violet, x, 1.73, sg * (S9.hw(1.73) + 0.012)); b.rotation.x = -sg * Math.atan((0.96 - 0.86) / 0.46); }   // montant B couleur caisse
  puitsInt(k, roues, sombre);
  k.decalFlancs(caisse, opt, -1.7, 1.6, -1.15, -0.7, (g, w, h) => { g.fillStyle = '#131418'; g.fillRect(0, 0, w, h); }, 256, 64, 0.01);   // jupes noires
  k.loft([{ x: 3.4, w: 1.0, y0: 0.38, y1: 0.62, nt: 4 }, { x: 3.78, w: 0.96, y0: 0.4, y1: 0.62, nt: 4 }, { x: 3.92, w: 0.82, y0: 0.42, y1: 0.56, nt: 3 }], noir, { nx: 20, ns: 32 });   // lame avant
  k.loft([{ x: -3.92, w: 0.84, y0: 0.42, y1: 0.76, nt: 4 }, { x: -3.72, w: 0.98, y0: 0.4, y1: 0.8, nt: 4 }, { x: -3.4, w: 1.0, y0: 0.4, y1: 0.76, nt: 4 }], noir, { nx: 20, ns: 32 });   // diffuseur
  for (const z of [-0.62, 0.62]) {                                                                 // phares effilés en lame
    const x = k.boutX(caisse, 1.0, z) - 0.06, c = o.boite(0.08, 0.08, 0.42, sombre, x, 1.0, z); c.rotation.y = Math.sign(z) * 0.5;
    const p = o.boite(0.085, 0.035, 0.34, lumBlanche, x + 0.01, 1.0, z); p.rotation.y = Math.sign(z) * 0.5;
  }
  o.boite(0.08, 0.2, 1.0, sombre, k.boutX(caisse, 0.74, 0) - 0.03, 0.74, 0);                      // bouche
  { const ptsF = []; for (let i = 0; i <= 16; i++) { const z = -0.86 + i * 0.1075, y = 1.22 + 0.1 * Math.pow(z / 0.86, 2); ptsF.push(new THREE.Vector3(k.boutX(caisse, y, z, -1) + 0.005, y, z)); }
    o.ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsF), 40, 0.04, 8, false)), lumRouge)); }   // bandeau de feux courbé
  for (const z of [-1.04, 1.04]) acc(rigide(o.boite(0.22, 0.12, 0.08, violet, 1.5, 1.62, z)), rigide(o.boite(0.05, 0.1, 0.06, noir, 1.55, 1.54, z * 0.96)));
  // aileron de toit : plan prolongeant le pavillon + dérives latérales descendant sur la caisse
  const ail = acc(o.boite(0.78, 0.07, 1.86, violet, -3.62, 1.92, 0)); ail.rotation.z = 0.08;
  for (const z of [-0.9, 0.9]) {
    const sh = new THREE.Shape(); [[-3.1, 1.94], [-4.02, 1.96], [-4.0, 1.82], [-3.7, 1.42], [-3.2, 1.56]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
    const d = new THREE.Mesh(garde(new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false })), violet); d.position.z = z - 0.035; acc(o.ajouter(d));
  }
  k.decalDessus(caisse, opt, 2.3, 3.4, 0.62, (g, w, h) => {                                        // grille noire de capot
    g.fillStyle = '#16151c'; g.fillRect(w * 0.15, h * 0.18, w * 0.7, h * 0.64); g.strokeStyle = '#3a3945'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(w * 0.15 + i * w * 0.058, h * 0.18); g.lineTo(w * 0.15 + i * w * 0.058, h * 0.82); g.stroke(); }
  }, 512, 256);
  k.decalFlancs(caisse, opt, -1.9, 1.3, -0.35, 0.62, (g, w, h) => {                                 // autocollants géométriques génériques (aucun personnage)
    g.fillStyle = '#f08ac8'; g.beginPath(); g.arc(150, 140, 100, 0, 7); g.fill();
    g.fillStyle = '#f4f1ff'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5, b = a + Math.PI / 5; g.beginPath(); g.moveTo(150, 140); g.lineTo(150 + 78 * Math.cos(a), 140 + 78 * Math.sin(a)); g.lineTo(150 + 30 * Math.cos(b), 140 + 30 * Math.sin(b)); g.closePath(); g.fill(); }
    g.fillStyle = '#f4f1ff'; g.fillRect(290, 50, 330, 76); g.fillStyle = '#2b1760'; g.font = '900 62px Arial Black, Arial'; g.fillText('EV DRIFT', 300, 110);
    g.fillStyle = '#7af7ff'; g.fillRect(290, 146, 300, 16); g.fillStyle = '#ff6bd0'; g.fillRect(290, 174, 220, 16);
    g.fillStyle = '#f4f1ff'; g.font = '900 40px Arial Black, Arial'; g.fillText('2025', 300, 236);
  }, 768, 256);
  const f = finir(ctx, roues, { yA: 1.52, s: 1, d: 0.25, sz });                                  // brief 10 : hauteurs dessinées (H_toit/W ≈ 0,70), élargissement seul
  return { L: 7.94, largeur: 2.3 * sz, hauteur: f(2.5), xAvant: 3.92, xArriere: -4.02, roues, jante: rd.jante, flanc: null };
}

/* ---- J10 (9e vague, reconstruction imposée) : coupé classique CARRÉ du début des années 70, blanc.
 *      Face avant 100 % verticale : calandre rectangulaire noire en retrait, 4 phares ronds cerclés de chrome, pare-chocs chromé fin ;
 *      capot plat horizontal et long ; pavillon carré (toit plat large ≈ 0,8 × caisse) à montant C épais qui tombe sur une malle courte ;
 *      élargisseurs d'ailes ARRIÈRE boulonnés noirs mats ; rétroviseurs d'ailes ; numéro 99 cuivre et bandes noires (livrée de la photo).
 *      Écart signalé : les photos montrent un coupé en coin des années 80 ; on suit la description imposée (nom de fiche). ---- */
function coupe70Blanc(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, o = outils(ctx), k = kit6(ctx);
  const blanc = o.lac('#f2f1ea', 0.25, 0.2), noir = o.mat('#121316', 0.55, 0.3), mat = o.mat('#1a1b1e', 0.9, 0.05), sombre = o.mat('#08090b', 0.85, 0.1);
  const verre = verreFume(ctx, '#10141c');
  const rd = { jante: '#2a2b30', rayons: 'trois', flanc: null };
  // roues : AV à fleur de l'aile (demi-largeur 1,34), AR à fleur de l'élargisseur boulonné (1,48)
  const roues = [essieu(2.45, 0.6, 0.6, 1.05, true, { ...rd, ampY: 0.06, amp: 0.0 }), essieu(-2.35, 0.62, 0.74, 1.11, false, { ...rd, ampY: 0.06, amp: 0.13 })];   // AR : aile peinte élargie jusqu'au pneu
  // caisse en boîte à arêtes adoucies (nt 6) : ligne de ceinture horizontale 1,32 de bout en bout (brief 10 : remontée), faces avant et arrière verticales
  const caisse = [
    { x: -4.0, w: 1.26, y0: 0.42, y1: 1.28, nt: 5, nb: 5 }, { x: -3.9, w: 1.32, y0: 0.38, y1: 1.32, nt: 6, nb: 5 }, { x: -2.35, w: 1.34, y0: 0.37, y1: 1.32, nt: 6, nb: 5 },
    { x: 0.0, w: 1.33, y0: 0.37, y1: 1.32, nt: 6, nb: 5 }, { x: 2.45, w: 1.34, y0: 0.38, y1: 1.32, nt: 6, nb: 5 }, { x: 3.92, w: 1.33, y0: 0.4, y1: 1.31, nt: 6, nb: 5 },
    { x: 4.0, w: 1.29, y0: 0.42, y1: 1.28, nt: 5, nb: 5 }];
  const opt = { ailes: k.ailes(roues, 0.0, 1.1, 0.2, 0.55), arches: k.arches(roues, 1.06) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.5 });                                         // brief 10 : ailes rehaussées, le pneu ne crève plus le capot
  k.loft(caisse, blanc, opt);
  // pavillon carré à facettes : pare-brise incliné, toit plat, lunette inclinée entre montants C épais
  const S = serre(ctx, o, { pts: [[0.95, 1.3], [0.25, 1.86], [-1.0, 1.88], [-1.92, 1.3]], yb: 1.3, wb: 1.22, wt: 1.15, plonge: 0.12, seuil: 0.12,
    mat: blanc, verre, pb: [0, 0], mcPb: 0.1, mlPb: 0.07, lu: [2, 2], mcLu: 0.4, mlLu: 0.08,
    cotes: [[[0.7, 1.42], [0.2, 1.8], [-0.28, 1.81], [-0.28, 1.42]], [[-0.4, 1.42], [-0.4, 1.81], [-0.95, 1.81], [-1.38, 1.42]]] });
  for (let i = 0; i < 2; i++) o.boite(0.05, 0.025, 2.0, o.chrome, 0.95 - i * 2.86 + (i ? 0 : -0.02), 1.32, 0);   // joncs chromés pied de pare-brise / lunette
  for (const r of roues) for (const sg of [-1, 1]) { const zin = r.z - r.ep / 2 - 0.04; k.arcGarde(r.x, r.RW, r.RW * 1.01, r.RW * 1.06 + 0.03, sg * (zin + 0.1), 0.2, sombre); }
  // élargisseurs d'ailes arrière boulonnés : secteur d'anneau à face plate noir mat + 7 boulons chromés
  { const r = roues[1], Ri = Math.max(r.RW * 1.06 + 0.04, r.RW + 0.12) + 0.005, Ro = Ri + 0.11, z0 = 1.3, z1 = r.z + r.ep / 2 + 0.02;
    for (const sg of [-1, 1]) {
      const m = k.arcGarde(r.x, r.RW, Ri, Ro, sg * (z0 + z1) / 2, z1 - z0, mat, -0.08, Math.PI + 0.08);
      for (let i = 0; i < 7; i++) { const a = 0.15 + i * (Math.PI - 0.3) / 6, b = new THREE.Mesh(garde(new THREE.SphereGeometry(0.03, 8, 6)), o.chrome);
        b.position.set(r.x + Math.cos(a) * (Ri + Ro) / 2, r.RW + Math.sin(a) * (Ri + Ro) / 2, sg * (z1 - 0.012)); o.ajouter(b); }
    } }
  // face avant verticale : cadre couleur caisse, calandre noire en retrait, 4 phares ronds cerclés de chrome, pare-chocs chromé
  { const xf = 4.0;
    o.boite(0.06, 0.5, 2.36, sombre, xf - 0.02, 0.86, 0);                                                    // fond de calandre (retrait)
    for (let i = 0; i < 5; i++) o.boite(0.03, 0.025, 1.0, o.mat('#33363d', 0.4, 0.6), xf + 0.02, 0.7 + i * 0.08, 0);   // lames horizontales
    o.boite(0.08, 0.06, 2.4, blanc, xf + 0.01, 1.13, 0); o.boite(0.06, 0.16, 2.5, blanc, xf - 0.02, 1.22, 0); o.boite(0.08, 0.05, 2.4, blanc, xf + 0.01, 0.6, 0);   // lèvres du cadre
    for (const z of [-0.98, -0.66, 0.66, 0.98]) {
      o.cyl(0.15, 0.15, 0.07, o.chrome, xf + 0.02, 0.87, z, 0, Math.PI / 2, 24); o.cyl(0.115, 0.115, 0.08, sombre, xf + 0.025, 0.87, z, 0, Math.PI / 2, 20);
      k.lentille(xf + 0.06, 0.87, z, 0.11, 0.11, lumBlanche, 0.03);
    }
    o.boite(0.1, 0.09, 2.62, o.chrome, xf + 0.06, 0.5, 0); for (const z of [-1.2, 1.2]) o.boite(0.3, 0.09, 0.1, o.chrome, xf - 0.08, 0.5, z);   // pare-chocs
    for (const z of [-1.02, 1.02]) o.boite(0.04, 0.07, 0.18, o.mat('#e8862a', 0.4, 0.1), xf + 0.01, 0.62, z);   // clignotants
    o.boite(0.03, 0.14, 0.5, o.mat('#e6e8ec', 0.5, 0.2), xf + 0.12, 0.4, 0);                                   // plaque sous le pare-chocs
  }
  // poupe verticale : 4 feux ronds, pare-chocs chromé, double échappement
  { const xr = -4.0;
    o.boite(0.04, 0.3, 2.3, noir, xr - 0.0, 0.92, 0);
    for (const z of [-0.95, -0.62, 0.62, 0.95]) { o.cyl(0.13, 0.13, 0.05, o.chrome, xr - 0.02, 0.92, z, 0, Math.PI / 2, 20); k.lentille(xr - 0.04, 0.92, z, 0.1, 0.1, lumRouge, 0.03); }
    o.boite(0.1, 0.09, 2.6, o.chrome, xr - 0.06, 0.52, 0); o.boite(0.03, 0.14, 0.5, o.mat('#e6e8ec', 0.5, 0.2), xr - 0.02, 0.72, 0);
    echappement(o, THREE, xr - 0.05, 0.4, 0.5, 0.07, 0.22); echappement(o, THREE, xr - 0.05, 0.4, 0.68, 0.07, 0.22);
  }
  for (const z of [-1.0, 1.0]) { const p = rigide(acc(o.cyl(0.015, 0.02, 0.16, o.chrome, 3.0, 1.39, z))); o.boite(0.12, 0.07, 0.05, noir, 3.02, 1.48, z); }   // rétroviseurs d'ailes
  o.decalFlanc((g, w, h) => {                                                                           // flancs plats : bandes noires + 99 cuivre (autocollant plan)
    g.fillStyle = '#111216'; g.fillRect(0, h * 0.62, w * 0.3, 16); g.fillRect(w * 0.58, h * 0.56, w * 0.42, 34); g.fillRect(0, h * 0.8, w, 12);
    g.beginPath(); g.moveTo(w * 0.04, h * 0.9); g.lineTo(w * 0.2, h * 0.9); g.lineTo(w * 0.12, h * 0.97); g.closePath(); g.fill();
    g.font = 'italic 900 150px Arial Black, Arial'; g.fillStyle = '#111216'; g.fillText('99', w * 0.31 + 7, h * 0.6 + 6); g.fillStyle = '#9a5a34'; g.fillText('99', w * 0.31, h * 0.6);
    g.fillStyle = '#111216'; g.font = 'bold 34px sans-serif'; g.fillText('RACING', w * 0.6, h * 0.48);
  }, 3.0, 0.62, -0.15, 0.88, 1.338, 1024, 176);
  k.decalFlancs(caisse, opt, -3.95, 3.95, -1.2, -0.85, (g, w, h) => { g.fillStyle = '#121316'; g.fillRect(0, 0, w, h); }, 256, 64, 0.01);   // bas de caisse noir
  return { L: 8.16, largeur: 2.7, hauteur: 1.88, xAvant: 4.12, xArriere: -4.06, roues, jante: rd.jante, flanc: null };
}

/* ---- J11 : coupé GT 2 portes des années 90 (bleu nuit) à MALLE — trois volumes : capot long légèrement plongeant,
 *      pare-brise incliné, ligne de toit tendue, custode plate qui tombe sur une malle horizontale, aileron réglable
 *      sur la malle, 4 feux ronds arrière, jantes argent à branches, lignes néon génériques ---- */
function gtBleuNuit(ctx) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx, o = outils(ctx), k = kit6(ctx);
  const nuit = o.lac('#1c2456', 0.2, 0.5), noir = o.mat('#0f1013', 0.55, 0.3), sombre = o.mat('#08090b', 0.85, 0.1);
  const verre = verreFume(ctx, '#0c0f16');
  const rd = { jante: '#dfe2e6', rayons: 'cinq', flanc: null, chrome: true };
  // rapports photo (profil pur) : L/H ≈ 3,5 ; ceinture ≈ 0,71 H ; malle ≈ 0,75 H ; empattement ≈ 0,62 L ; roue Ø ≈ 0,15 L
  const sz = 1.3;                                                                                   // élargissement global (barème 9, catégorie A)
  const roues = [essieu(2.55, 0.6, 0.6, 0.96 - 0.126 / sz, true, { ...rd, ampY: 0.1 }), essieu(-2.3, 0.61, 0.72, 0.94 - 0.131 / sz, false, { ...rd, ampY: 0.08 })];
  const caisse = [
    { x: -3.95, w: 0.88, y0: 0.44, y1: 1.34, nt: 4.5, nb: 4.5, wt: 0.92 }, { x: -3.8, w: 0.98, y0: 0.38, y1: 1.46, nt: 5, nb: 4.5, wt: 0.92 }, { x: -2.3, w: 1.01, y0: 0.36, y1: 1.48, nt: 5, wt: 0.9 },
    { x: -1.0, w: 1.0, y0: 0.36, y1: 1.45, nt: 5, wt: 0.9 }, { x: 0.3, w: 1.0, y0: 0.36, y1: 1.43, nt: 5, wt: 0.9 }, { x: 1.4, w: 1.0, y0: 0.36, y1: 1.41, nt: 5, wt: 0.9 },
    { x: 2.55, w: 0.99, y0: 0.37, y1: 1.32, nt: 5, wt: 0.9 }, { x: 3.5, w: 0.95, y0: 0.4, y1: 1.12, nt: 4.5, wt: 0.88 }, { x: 3.95, w: 0.84, y0: 0.44, y1: 0.94, nt: 4, nb: 4, wt: 0.86 }];   // brief 10 : ceinture abaissée, vitres de hauteur réaliste
  const opt = { ailes: k.ailes(roues, 0.11, 1.2, 0.18, 0.55), taille: { x: 0.0, L: 1.3, y: 0.9, h: 0.42, amp: 0.045 }, arches: k.arches(roues, 1.06) };
  opt.coiffes = k.coiffes(caisse, opt, roues, { zr: 0.5 });                                         // brief 10 : tôle au-dessus du pneu sur toute sa largeur
  k.loft(caisse, nuit, opt);
  serre(ctx, o, { pts: [[1.42, 1.41], [0.4, 1.83], [-0.45, 1.86], [-1.28, 1.83], [-2.5, 1.47]], yb: 1.41, wb: 0.92, wt: 0.82, seuil: 0.2, plonge: 0.08,
    mat: nuit, verre, pb: [0, 0], lu: [3, 3], mcLu: 0.13,
    cotes: [[[1.1, 1.5], [0.38, 1.77], [-0.55, 1.79], [-0.55, 1.5]], [[-0.7, 1.5], [-0.7, 1.79], [-1.25, 1.77], [-2.12, 1.52]]] });
  puitsInt(k, roues, sombre);
  k.decalFlancs(caisse, opt, -1.75, 1.75, -1.15, -0.75, (g, w, h) => { g.fillStyle = '#0f1013'; g.fillRect(0, 0, w, h); }, 256, 64, 0.01);   // jupes
  k.loft([{ x: 3.6, w: 1.0, y0: 0.36, y1: 0.6, nt: 4 }, { x: 3.94, w: 0.96, y0: 0.38, y1: 0.62, nt: 4 }, { x: 4.06, w: 0.82, y0: 0.42, y1: 0.58, nt: 3 }], noir, { nx: 20, ns: 32 });   // bouclier avant
  o.boite(0.08, 0.2, 0.9, sombre, k.boutX(caisse, 0.8, 0) - 0.03, 0.8, 0);                      // calandre basse
  o.boite(0.06, 0.08, 0.5, sombre, k.boutX(caisse, 1.02, 0) - 0.02, 1.02, 0);                   // calandre haute
  for (const z of [-0.64, 0.64]) {                                                             // phares étirés en biseau
    const x = k.boutX(caisse, 1.0, z) - 0.06, c = o.boite(0.08, 0.12, 0.4, sombre, x, 1.0, z); c.rotation.y = Math.sign(z) * 0.45;
    const p = o.boite(0.085, 0.07, 0.3, lumBlanche, x + 0.01, 1.0, z); p.rotation.y = Math.sign(z) * 0.45;
  }
  for (const z of [-0.72, -0.4, 0.4, 0.72]) { const x = k.boutX(caisse, 1.18, z, -1); o.cyl(0.14, 0.14, 0.05, sombre, x - 0.012, 1.18, z, 0, Math.PI / 2, 20); k.lentille(x - 0.03, 1.18, z, 0.11, 0.11, lumRouge, 0.03); }   // 4 feux ronds
  k.loft([{ x: -4.06, w: 0.82, y0: 0.4, y1: 0.66, nt: 4 }, { x: -3.92, w: 0.98, y0: 0.38, y1: 0.7, nt: 4 }, { x: -3.6, w: 1.0, y0: 0.38, y1: 0.66, nt: 4 }], noir, { nx: 20, ns: 32 });   // jupe arrière
  echappement(o, THREE, -4.05, 0.55, 0.52, 0.11, 0.25);
  for (const z of [-1.04, 1.04]) acc(rigide(o.boite(0.24, 0.13, 0.09, nuit, 1.25, 1.58, z)), rigide(o.boite(0.05, 0.1, 0.06, noir, 1.3, 1.5, z * 0.96)));
  enAcc(ctx, () => aileron(o, nuit, -3.4, 1.8, 1.95, 0.62, 0.08, { yMontant: 1.44, flasque: 0.34 }));            // aileron réglable sur la malle
  const lignes = (g, w, h) => {                                                                 // lignes néon façon circuit imprimé (motif générique)
    const cols = ['#ff4a6a', '#6a8bff', '#ff5fc8'];
    for (let n = 0; n < 3; n++) { g.strokeStyle = cols[n]; g.lineWidth = 10 - 2 * n; g.beginPath(); let x = 0, y = h * (0.3 + 0.2 * n); g.moveTo(x, y); for (let i = 0; i < 10; i++) { x += w / 10; y += (i % 2 ? -1 : 1) * (14 + n * 9); g.lineTo(x - 18, y); g.lineTo(x, y + (i % 3 - 1) * 16); } g.stroke(); }
    g.fillStyle = '#ff4a6a'; g.fillRect(w * 0.64, h * 0.1, 70, 30); g.fillStyle = '#f4f0ff'; g.font = 'bold 36px sans-serif'; g.fillText('GT', w * 0.655, h * 0.1 + 28);
  };
  k.decalFlancs(caisse, opt, -2.9, 2.0, -0.4, 0.6, lignes, 1024, 220);
  k.decalDessus(caisse, opt, 1.9, 3.5, 0.6, lignes, 512, 256);
  const f = finir(ctx, roues, { yA: 1.42, s: 1, d: 0.2, sz });                                   // brief 10 : plus de tassement (pavillon dessiné à la bonne hauteur), élargissement seul
  return { L: 8.12, largeur: 2.34 * sz, hauteur: f(2.4), xAvant: 4.06, xArriere: -4.06, roues, jante: rd.jante, flanc: null };
}

export const GROUPE_6 = { J01: coupeGTArgent, J02: hatchViolet, J04: monospaceArgent, J05: compacteCitron, J07: roadsterBleu, J08: roadsterBlanc, J09: hayonElectrique, J10: coupe70Blanc, J11: gtBleuNuit };
