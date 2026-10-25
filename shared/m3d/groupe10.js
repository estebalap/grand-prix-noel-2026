import { outils } from './outils.js';
import { aide10 } from './aide_10.js';

/**
 * Groupe 10 : B02, B03, B04, B05 — bolides de justicier masqué (jouets 1/64), modélisés d'après les vignettes validées.
 * Formes génériques uniquement : aucun emblème, aucun logo, aucun nom ; ailerons festonnés traités comme de simples dérives.
 * Repère : avant = +x, sol y = 0, z = largeur.
 */

/** Pose un autocollant sur le flanc EXTÉRIEUR d'un loft décalé en z (ailes en obus) : st = stations, dz = décalage. */
function decalPod(ctx, a, st, dz, x0, x1, yb, yt, draw, cw = 1536, ch = 320) {
  const { THREE } = ctx;
  for (const sg of [-1, 1]) {
    // un canvas par côté : au flanc −z, mise en page symétrisée + u inversé → même abscisse véhicule, textes lisibles
    const mat = a.matDecal((g, w, h) => a.dessinerCote(draw, g, w, h, sg), cw, ch);
    const pos = [], uv = [], idx = [], nu = 110, nv = 24;
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) {
      const u = i / nu, v = k / nv, x = x0 + (x1 - x0) * u, y0 = yb + (yt - yb) * v, y = a.degager(x, y0, dz + a.flancAu(st, x, y0));
      pos.push(x, y, sg * (dz + a.flancAu(st, x, y) + 0.02)); uv.push(sg > 0 ? u : 1 - u, v);
    }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const p = i * (nv + 1) + k, q = (i + 1) * (nv + 1) + k; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(ctx.garde(g), mat); m.renderOrder = 2; a.ajouter(m);
  }
}

/** Bord de fuite festonné : de `p0` (pointe) à `p1` (pied), `n` échancrures arrondies creusées de `prof` vers l'avant (+x). */
function festons(p0, p1, n, prof) {
  const pts = [];
  for (let i = 0; i < n; i++) for (let k = 1; k <= 8; k++) {
    const t = (i + k / 8) / n, x = p0[0] + (p1[0] - p0[0]) * t, y = p0[1] + (p1[1] - p0[1]) * t;
    pts.push([x + prof * Math.sin(Math.PI * k / 8), y]);
  }
  return pts;
}

/* ================================================================ B02 : long bolide chromé, ailes avant en obus, turbine frontale, deux grandes dérives festonnées */
function b02(ctx) {
  const { lumBlanche, lumRouge } = ctx, a = aide10(ctx);
  const chromeC = a.chromeCaisse('#d3d8df'), sombre = a.mat('#15161a', 0.55, 0.3), noirM = a.mat('#0b0b0d', 0.8, 0.1);
  const jaune = '#f1d21c';
  const roueAv = { x: 2.35, RW: 0.6, ep: 0.56, z: 0.93, y: 0.6, avant: true, jante: '#17181c', rayons: 'cinq', flanc: jaune };
  const roueAr = { x: -2.5, RW: 0.64, ep: 0.72, z: 0.88, y: 0.64, avant: false, jante: '#17181c', rayons: 'cinq', flanc: jaune };
  const R = a.declarerRoues([roueAv, roueAr]);

  // --- corps central : capot bas entre les ailes, taille resserrée, poupe large sous les dérives (barème : hanches élargies et abaissées)
  const ST = [
    { x: -4.3, w: 0.55, y0: 0.5, y1: 0.95 }, { x: -4.0, w: 0.9, y0: 0.4, y1: 1.12 }, { x: -3.4, w: 1.14, y0: 0.34, y1: 1.36, wt: 0.88 },
    { x: -2.5, w: 1.245, y0: 0.32, y1: 1.47, wt: 0.86 }, { x: -1.7, w: 1.11, y0: 0.31, y1: 1.34, wt: 0.85 }, { x: -0.6, w: 0.98, y0: 0.3, y1: 1.1, wt: 0.84 },
    { x: 0.6, w: 0.92, y0: 0.3, y1: 1.03, wt: 0.84 }, { x: 1.6, w: 0.64, y0: 0.3, y1: 0.97 }, { x: 2.8, w: 0.56, y0: 0.3, y1: 0.88 },
    { x: 3.5, w: 0.42, y0: 0.34, y1: 0.8 }, { x: 3.85, w: 0.28, y0: 0.42, y1: 0.72 }];
  a.loft(ST, chromeC, { arches: [{ x: roueAv.x, R: 0.74, rt: 0.6, y: 0.6, zin: 0.6 }, { x: roueAr.x, R: 0.78, rt: 0.64, y: 0.64, zin: 0.46 }] });

  // --- ailes avant en obus (deux lofts décalés en z, coiffant les roues avant)
  const POD = [
    { x: 0.6, w: 0.2, y0: 0.5, y1: 0.95 }, { x: 1.3, w: 0.38, y0: 0.32, y1: 1.3 }, { x: 2.35, w: 0.44, y0: 0.3, y1: 1.43, nt: 2.4 },
    { x: 3.3, w: 0.42, y0: 0.3, y1: 1.34, nt: 2.4 }, { x: 4.0, w: 0.35, y0: 0.32, y1: 0.98 }, { x: 4.4, w: 0.2, y0: 0.44, y1: 0.7 }];
  const dzPod = 0.74;
  for (const sg of [-1, 1]) a.loft(POD, chromeC, { z: sg * dzPod, arches: [{ x: roueAv.x, R: 0.74, rt: 0.6, y: 0.6, zin: -1 }], nx: 110, ns: 48 });
  for (const sg of [-1, 1]) { const b = a.ellipsoide(0.05, 0.15, 0.17, noirM, 4.33, 0.56, sg * dzPod); b.renderOrder = 1; }   // bouches rondes au bout des ailes

  // --- turbine frontale chromée au creux du museau, lame sombre dessous
  a.turbine(3.93, 0.62, 0, 0.26, 0.34, a.chrome, noirM, a.mat('#3a3d44', 0.35, 0.8));
  a.boite(0.5, 0.06, 0.9, sombre, 3.75, 0.32, 0);

  // --- cockpit : capot de cockpit chromé + verrière fumée ambrée
  // (barème « tolérance zéro » : pavillon abaissé à y ≈ 1,40, élargi et aplati)
  a.ellipsoide(1.25, 0.4, 0.74, chromeC, -1.15, 0.98, 0);
  a.ellipsoide(0.9, 0.4, 0.62, a.vitre('#2e2a12', 0.92), -0.5, 1.0, 0);
  a.ellipsoide(0.28, 0.08, 0.5, chromeC, 0.26, 1.16, 0);                              // casquette de pare-brise

  // --- deux grandes dérives festonnées (bord de fuite en créneaux)
  const derive = [[-0.4, 1.0], [-1.4, 1.24], [-2.4, 1.56], [-3.2, 1.88], [-3.75, 2.16], [-4.05, 2.32], ...festons([-4.05, 2.32], [-4.3, 1.08], 4, 0.2), [-3.6, 1.32], [-2.0, 1.32]];
  a.aileron(derive, 0.11, chromeC, 0.68, 0.13);
  for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) {                               // nervures sombres en relief sur les dérives
    const y = 1.83 - i * 0.26, b = a.boite(0.55, 0.035, 0.03, sombre, -3.6 - i * 0.03, y, sg * (0.68 + Math.sin(0.13) * y + 0.07));
    b.rotation.set(sg * 0.13, 0, 0.25);
  }

  // --- ouïes latérales et écopes rondes
  for (const sg of [-1, 1]) {
    for (let i = 0; i < 5; i++) a.boite(0.05, 0.3, 0.06, sombre, -1.2 - i * 0.12, 0.66, sg * 1.07);
    for (let i = 0; i < 4; i++) a.boite(0.05, 0.22, 0.06, sombre, 1.3 - i * 0.11, 0.62, sg * 0.9);
    a.ellipsoide(0.22, 0.17, 0.08, noirM, -0.95, 0.6, sg * 1.0);
  }

  // --- filets jaunes sur les flancs (corps et ailes)
  const x0 = -4.25, x1 = 0.9, yb = 0.32, yt = 1.32, cv = a.carte(x0, x1, yb, yt, 2048, 320);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g) => {
    g.strokeStyle = jaune; g.lineWidth = 13; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cv.X(0.85), cv.Y(0.82)); g.bezierCurveTo(cv.X(-0.6), cv.Y(0.84), cv.X(-1.6), cv.Y(0.92), cv.X(-2.1), cv.Y(1.0));
    g.bezierCurveTo(cv.X(-2.6), cv.Y(1.14), cv.X(-3.2), cv.Y(1.1), cv.X(-3.9), cv.Y(0.86)); g.stroke();
    cv.trouer(g, [roueAr]);
  }, 2048, 320);
  const cp = a.carte(0.8, 4.36, 0.32, 1.18, 1536, 320);
  decalPod(ctx, a, POD, dzPod, 0.8, 4.36, 0.32, 1.18, (c) => {
    c.strokeStyle = jaune; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cp.X(0.9), cp.Y(0.84)); c.bezierCurveTo(cp.X(2.0), cp.Y(0.95), cp.X(3.3), cp.Y(0.98), cp.X(4.25), cp.Y(0.62)); c.stroke();
    cp.trouer(c, [roueAv], 1.12);
  });

  // --- poupe : tuyère centrale, feux rouges ; phares au bout des ailes
  a.tuyere(-4.3, 0.7, 0, 0.2, 0.3, a.chrome, a.neon('#ff7a1a'));
  for (const sg of [-1, 1]) a.boite(0.06, 0.08, 0.34, lumRouge, -4.08, 0.9, sg * 0.55);
  a.phares(4.3, 0.78, [-dzPod, dzPod], 0.08, lumBlanche);
  return { L: 8.75, largeur: 2.38, hauteur: 2.32, xAvant: 4.4, xArriere: -4.35, roues: R };
}


/* ================================================================ B03 : bolide noir très étiré « dessin animé 90 », long capot plat, calandre à lames grises, bulle basse, dérives en pointe */
function b03(ctx) {
  const { lumBlanche, lumRouge } = ctx, a = aide10(ctx);
  const noir = a.laque('#0e0f13', 0.14, 0.2), noirM = a.mat('#060607', 0.85, 0.1), gris = a.mat('#9a9ea8', 0.4, 0.55), grisC = a.mat('#c6cad2', 0.35, 0.3);
  const roueAv = { x: 3.0, RW: 0.54, ep: 0.5, z: 0.96, y: 0.54, avant: true, jante: '#c9ced6', rayons: 'cinq', flanc: null, chrome: true };
  const roueAr = { x: -2.25, RW: 0.57, ep: 0.62, z: 0.9, y: 0.57, avant: false, jante: '#c9ced6', rayons: 'cinq', flanc: null, chrome: true };
  const R = a.declarerRoues([roueAv, roueAr]);
  // caisse en dalle à flancs droits, abaissée et élargie (barème : pavillon ≤ 0,58 × largeur hors tout), ailes renflées aux essieux, poupe effilée
  const ST = [
    { x: -4.35, w: 0.38, y0: 0.62, y1: 1.05, nt: 3 }, { x: -4.0, w: 0.72, y0: 0.52, y1: 1.12, nt: 3.4 }, { x: -3.3, w: 1.04, y0: 0.42, y1: 1.26, nt: 4, wt: 0.9 },
    { x: -2.25, w: 1.2, y0: 0.32, y1: 1.34, nt: 4, wt: 0.9 }, { x: -1.2, w: 1.14, y0: 0.31, y1: 1.28, nt: 4, wt: 0.9 }, { x: 0.4, w: 1.12, y0: 0.3, y1: 1.28, nt: 4.4, wt: 0.9 },
    { x: 2.0, w: 1.14, y0: 0.3, y1: 1.27, nt: 4.4, wt: 0.9 }, { x: 3.0, w: 1.2, y0: 0.3, y1: 1.26, nt: 4.4, wt: 0.9 }, { x: 4.1, w: 1.14, y0: 0.32, y1: 1.2, nt: 4.6, nb: 5, wt: 0.92 },
    { x: 4.45, w: 1.04, y0: 0.36, y1: 1.12, nt: 5, nb: 5 }, { x: 4.55, w: 0.9, y0: 0.42, y1: 1.04, nt: 5, nb: 5 }];
  a.loft(ST, noir, { arches: a.arches(R) });
  // capot central surélevé (nervure plate qui court de la calandre au cockpit)
  const CAP = [{ x: -0.4, w: 0.34, y0: 1.12, y1: 1.3 }, { x: 0.2, w: 0.58, y0: 1.0, y1: 1.36, nt: 5 }, { x: 3.8, w: 0.58, y0: 0.98, y1: 1.34, nt: 5 }, { x: 4.4, w: 0.54, y0: 1.0, y1: 1.24, nt: 5 }];
  a.loft(CAP, noir, { nx: 80, ns: 40 });
  // gouttières latérales du capot avec la rangée de bossages d'échappement clairs
  for (const sg of [-1, 1]) {
    a.boite(2.5, 0.08, 0.22, noirM, 1.55, 1.28, sg * 0.78);
    for (let i = 0; i < 6; i++) a.ellipsoide(0.13, 0.08, 0.09, grisC, 0.55 + i * 0.36, 1.32, sg * 0.78);
  }
  // calandre : deux panneaux à lames verticales grises dans un cadre noir, face avant quasi verticale
  for (const sg of [-1, 1]) {
    a.boite(0.08, 0.5, 0.6, noirM, 4.56, 0.76, sg * 0.38);
    for (let i = 0; i < 6; i++) a.boite(0.06, 0.44, 0.06, gris, 4.6, 0.76, sg * (0.13 + i * 0.1));
  }
  a.boite(0.1, 0.56, 0.08, noir, 4.58, 0.76, 0);                                         // montant central
  a.phares(4.47, 1.07, [-0.7, -0.48, 0.48, 0.7], 0.06, lumBlanche);
  for (const sg of [-1, 1]) a.boite(0.04, 0.06, 0.16, a.mat('#ff7a2a', 0.4, 0), 4.48, 0.46, sg * 0.86);   // feux de position orange
  // cockpit : bulle basse fumée bleutée sertie d'un capotage, arceau arrière
  a.ellipsoide(1.1, 0.16, 0.7, noir, -1.6, 1.22, 0);                                    // capotage plat et large (sommet 1,38)
  a.ellipsoide(0.8, 0.17, 0.56, a.vitre('#6f8ea4', 0.82), -1.15, 1.23, 0);              // bulle basse (sommet 1,40)
  a.boite(0.2, 0.1, 0.9, noir, -2.0, 1.31, 0);
  // dérives : longues lames latérales qui filent vers l'arrière en pointe, avec dard inférieur
  const derive = [[-0.9, 1.22], [-2.2, 1.32], [-3.4, 1.48], [-4.3, 1.64], [-4.85, 1.78], [-4.55, 1.46], [-4.38, 1.16], [-4.45, 0.68], [-4.15, 0.78], [-3.6, 1.0], [-2.6, 1.14]];
  a.aileron(derive, 0.1, noir, 0.92, 0.07);
  // flancs : arête vive basse (ombre triangulaire) et liseré gris
  const x0 = -4.3, x1 = 4.5, yb = 0.3, yt = 1.28, cv = a.carte(x0, x1, yb, yt, 2048, 300);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.beginPath(); g.moveTo(cv.X(-1.5), cv.Y(0.5)); g.lineTo(cv.X(0.6), cv.Y(0.62)); g.lineTo(cv.X(-1.55), cv.Y(0.82)); g.closePath(); g.fill();
    g.strokeStyle = '#3a3d46'; g.lineWidth = 4; g.beginPath(); g.moveTo(cv.X(-1.2), cv.Y(1.14)); g.lineTo(cv.X(4.3), cv.Y(1.12)); g.stroke();
    cv.trouer(g, R);
  }, 2048, 300);
  // poupe : réacteur central et feux rouges fins
  a.tuyere(-4.3, 0.8, 0, 0.17, 0.3, gris, a.neon('#ff5a1a'));
  for (const sg of [-1, 1]) a.boite(0.05, 0.06, 0.26, lumRouge, -4.05, 0.98, sg * 0.5);
  return { L: 9.4, largeur: 2.4, hauteur: 1.8, xAvant: 4.6, xArriere: -4.85, roues: R };
}

/* ================================================================ B04 : bolide trapu caricatural, ailes avant en dômes, moteur chromé à découvert, verrière rouge, blocs mécaniques latéraux */
function b04(ctx) {
  const { lumBlanche, lumRouge } = ctx, a = aide10(ctx);
  const caisse = a.laque('#25272e', 0.3, 0.55), bas = a.laque('#6b6e77', 0.3, 0.7), noirM = a.mat('#0b0b0e', 0.8, 0.1);
  const acier = a.mat('#7c808a', 0.35, 0.8), chromeB = a.chromeCaisse('#cfdcec');
  const roueAv = { x: 2.0, RW: 0.68, ep: 0.6, z: 1.0, y: 0.68, avant: true, jante: '#17181c', rayons: 'cinq', flanc: null };
  const roueAr = { x: -2.05, RW: 0.74, ep: 0.78, z: 0.98, y: 0.74, avant: false, jante: '#17181c', rayons: 'cinq', flanc: null };
  const R = a.declarerRoues([roueAv, roueAr]);
  // bas de caisse gris (jupe continue) avec passages
  const BAS = [
    { x: -3.55, w: 0.7, y0: 0.32, y1: 0.7 }, { x: -3.1, w: 1.02, y0: 0.26, y1: 0.72 }, { x: -2.05, w: 1.12, y0: 0.26, y1: 0.74 }, { x: 0, w: 1.08, y0: 0.24, y1: 0.7 },
    { x: 2.0, w: 1.12, y0: 0.26, y1: 0.72 }, { x: 3.1, w: 1.0, y0: 0.28, y1: 0.68 }, { x: 3.55, w: 0.7, y0: 0.34, y1: 0.62 }];
  a.loft(BAS, bas, { arches: R.map((r) => ({ x: r.x, R: r.RW + 0.14, rt: r.RW, y: r.y, zin: r.z - r.ep / 2 - 0.06 })) });
  // corps central : capot bas en creux, habitacle bombé, dos large
  // (barème : dos abaissé ≤ 1,45, section d'habitacle élargie, pavillon moins pincé)
  const ST = [
    { x: -3.5, w: 0.6, y0: 0.5, y1: 1.08 }, { x: -3.0, w: 1.0, y0: 0.45, y1: 1.28, wt: 0.84 }, { x: -2.05, w: 1.1, y0: 0.45, y1: 1.36, wt: 0.82 },
    { x: -1.0, w: 1.06, y0: 0.42, y1: 1.42, wt: 0.8 }, { x: 0.0, w: 0.98, y0: 0.42, y1: 1.44, wt: 0.8 }, { x: 0.8, w: 0.7, y0: 0.42, y1: 1.16, wt: 0.84 },
    { x: 2.0, w: 0.5, y0: 0.42, y1: 0.98 }, { x: 3.1, w: 0.45, y0: 0.42, y1: 0.86 }, { x: 3.5, w: 0.32, y0: 0.45, y1: 0.75 }];
  a.loft(ST, caisse, { arches: R.map((r) => ({ x: r.x, R: r.RW + 0.14, rt: r.RW, y: r.y, zin: r.z - r.ep / 2 - 0.06 })) });
  // ailes avant en dômes (gros obus arrondis qui coiffent les roues avant)
  const POD = [
    { x: 0.4, w: 0.2, y0: 0.6, y1: 1.0 }, { x: 1.0, w: 0.4, y0: 0.45, y1: 1.35 }, { x: 2.0, w: 0.5, y0: 0.42, y1: 1.54, nt: 2.4 },
    { x: 2.9, w: 0.48, y0: 0.42, y1: 1.38, nt: 2.4 }, { x: 3.45, w: 0.38, y0: 0.45, y1: 1.05 }, { x: 3.68, w: 0.2, y0: 0.55, y1: 0.78 }];
  const dz = 0.78;
  for (const sg of [-1, 1]) a.loft(POD, caisse, { z: sg * dz, arches: [{ x: roueAv.x, R: roueAv.RW + 0.14, rt: roueAv.RW, y: roueAv.y, zin: -1 }], nx: 110, ns: 48 });
  // ailes arrière bombées
  const PODR = [
    { x: -3.55, w: 0.2, y0: 0.6, y1: 1.05 }, { x: -3.1, w: 0.44, y0: 0.45, y1: 1.52, nt: 2.4 }, { x: -2.05, w: 0.52, y0: 0.42, y1: 1.66, nt: 2.4 },
    { x: -1.1, w: 0.42, y0: 0.45, y1: 1.46 }, { x: -0.5, w: 0.2, y0: 0.6, y1: 1.1 }];
  const dzR = 0.85;
  for (const sg of [-1, 1]) a.loft(PODR, caisse, { z: sg * dzR, arches: [{ x: roueAr.x, R: roueAr.RW + 0.14, rt: roueAr.RW, y: roueAr.y, zin: -1 }], nx: 100, ns: 48 });
  // moteur chromé à découvert sur le capot : 2 × 4 cylindres
  a.boite(1.5, 0.12, 0.62, noirM, 1.75, 0.98, 0);
  for (let i = 0; i < 4; i++) for (const sg of [-1, 1]) {
    a.cyl(0.13, 0.15, 0.2, chromeB, 1.2 + i * 0.36, 1.12, sg * 0.16, 0, 0, 20);
    a.cyl(0.11, 0.11, 0.04, chromeB, 1.2 + i * 0.36, 1.24, sg * 0.16, 0, 0, 20);
  }
  // calandre basse à lames entre les dômes, phares fins
  a.boite(0.08, 0.3, 0.5, noirM, 3.4, 0.62, 0);
  for (let i = 0; i < 4; i++) a.boite(0.05, 0.04, 0.48, acier, 3.45, 0.52 + i * 0.07, 0);
  a.phares(3.6, 0.82, [-dz, dz], 0.08, lumBlanche);
  // verrière rouge facettée avec arête centrale
  const rouge = a.vitre('#9b1020', 0.9);
  // (barème : verrière abaissée, sommet 1,55, plus large et plus plate)
  a.ellipsoide(0.86, 0.25, 0.68, rouge, 0.05, 1.29, 0);
  a.ellipsoide(0.9, 0.26, 0.09, caisse, 0.05, 1.29, 0);                                    // arête centrale qui épouse la verrière
  for (const sg of [-1, 1]) { const m = a.ellipsoide(0.88, 0.15, 0.06, caisse, 0.05, 1.3, sg * 0.5); m.rotation.x = sg * 1.0; }   // montants latéraux
  // blocs mécaniques latéraux (moteur à ailettes gris) entre habitacle et roue arrière
  for (const sg of [-1, 1]) {
    a.cyl(0.26, 0.26, 0.7, acier, -0.85, 0.85, sg * 1.06, 0, Math.PI / 2, 22);
    for (let i = 0; i < 6; i++) a.cyl(0.32, 0.32, 0.04, acier, -1.15 + i * 0.12, 0.85, sg * 1.06, 0, Math.PI / 2, 22);
    a.boite(0.4, 0.3, 0.18, acier, -0.3, 0.8, sg * 1.04);
  }
  // dérives arrière en pointe (deux grandes + une centrale plus basse)
  const derive = [[-1.2, 1.32], [-2.2, 1.6], [-2.9, 1.8], [-3.4, 2.04], [-3.3, 1.7], [-3.55, 1.46], [-3.5, 1.1], [-2.4, 1.6]];   // arête basse relevée de 2 cm au-dessus du pneu arrière
  a.aileron(derive, 0.12, caisse, 0.8, 0.1);
  a.aileron([[-1.4, 1.38], [-2.6, 1.6], [-3.25, 1.86], [-3.2, 1.5], [-3.4, 1.12], [-2.2, 1.26]], 0.1, caisse, 0);
  // feux et tuyère
  for (const sg of [-1, 1]) a.boite(0.05, 0.08, 0.3, lumRouge, -3.52, 0.95, sg * 0.4);
  a.tuyere(-3.55, 0.7, 0, 0.16, 0.24, acier, a.neon('#ff3a2a'));
  // liseré bleu clair générique à l'avant des dômes (losanges « 000 » de la vignette réduits à des tirets)
  const cp = a.carte(2.6, 3.7, 0.45, 1.5, 512, 400);
  decalPod(ctx, a, POD, dz, 2.6, 3.7, 0.45, 1.5, (c) => {
    c.fillStyle = '#9fc4ec'; c.strokeStyle = '#9fc4ec'; c.lineWidth = 6;
    c.save(); c.translate(cp.X(3.25), cp.Y(1.0)); c.rotate(-0.3); c.strokeRect(-60, -18, 120, 36);
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-30 + i * 30, 0, 9, 0, Math.PI * 2); c.stroke(); } c.restore();
  }, 512, 400);
  return { L: 7.25, largeur: 2.6, hauteur: 2.0, xAvant: 3.7, xArriere: -3.55, roues: R };
}

/* ================================================================ B05 : coupé noir effilé à liserés cyan, prise d'air chromée au capot, verrière bleu nuit, dérives en pointe */
function b05(ctx) {
  const { lumBlanche, lumRouge } = ctx, a = aide10(ctx);
  const noir = a.laque('#0a0b0f', 0.12, 0.2), noirM = a.mat('#050506', 0.85, 0.1);
  const cyan = '#25c6ea';
  const roueAv = { x: 2.5, RW: 0.6, ep: 0.54, z: 0.9, y: 0.6, avant: true, jante: '#0e0f13', rayons: 'cinq', flanc: cyan };
  const roueAr = { x: -2.35, RW: 0.64, ep: 0.7, z: 0.86, y: 0.64, avant: false, jante: '#0e0f13', rayons: 'cinq', flanc: cyan };
  const R = a.declarerRoues([roueAv, roueAr]);
  // caisse en goutte : museau long et bas, ailes avant marquées, taille fine, hanches larges
  // (barème : caisse élargie et ligne de caisse abaissée, pneus à fleur)
  const ST = [
    { x: -4.1, w: 0.5, y0: 0.55, y1: 0.92 }, { x: -3.75, w: 0.95, y0: 0.42, y1: 1.08, wt: 0.88 }, { x: -3.0, w: 1.15, y0: 0.34, y1: 1.36, wt: 0.85 },
    { x: -2.35, w: 1.21, y0: 0.32, y1: 1.45, wt: 0.84 }, { x: -1.4, w: 1.1, y0: 0.3, y1: 1.32, wt: 0.82 }, { x: -0.3, w: 1.02, y0: 0.3, y1: 1.15, wt: 0.84 },
    { x: 0.9, w: 1.0, y0: 0.3, y1: 1.1, wt: 0.86 }, { x: 1.8, w: 1.1, y0: 0.3, y1: 1.26, wt: 0.86 }, { x: 2.5, w: 1.165, y0: 0.3, y1: 1.36, wt: 0.88 },
    { x: 3.3, w: 1.06, y0: 0.32, y1: 1.2 }, { x: 3.85, w: 0.8, y0: 0.36, y1: 0.82 }, { x: 4.1, w: 0.46, y0: 0.42, y1: 0.66 }];
  a.loft(ST, noir, { arches: a.arches(R) });
  // cockpit : capotage arrière et verrière bleu nuit enveloppante
  // (barème : verrière abaissée, sommet 1,40, plus large)
  a.ellipsoide(1.2, 0.3, 0.76, noir, -1.45, 1.08, 0);
  a.ellipsoide(0.9, 0.34, 0.66, a.vitre('#13235a', 0.9), -0.75, 1.06, 0);
  a.ellipsoide(0.3, 0.07, 0.6, noir, -0.02, 1.15, 0);
  // prise d'air chromée encastrée au milieu du capot
  a.boite(0.7, 0.12, 0.5, noirM, 1.3, 1.08, 0);
  a.ellipsoide(0.36, 0.13, 0.22, a.chrome, 1.3, 1.14, 0);
  for (let i = 0; i < 4; i++) a.boite(0.04, 0.09, 0.03, noirM, 1.62, 1.14, -0.15 + i * 0.1);
  // dérives arrière en pointe, inclinées vers l'extérieur
  const derive = [[-1.6, 1.3], [-2.6, 1.46], [-3.5, 1.64], [-4.3, 1.9], [-3.95, 1.52], [-4.15, 1.16], [-3.9, 0.94], [-3.0, 1.32]];
  a.aileron(derive, 0.11, noir, 0.82, 0.12);
  // liserés cyan : arête supérieure du flanc (de l'aile avant à la dérive) + diagonale de flanc
  const x0 = -4.05, x1 = 4.05, yb = 0.32, yt = 1.26, cv = a.carte(x0, x1, yb, yt, 2048, 300);
  a.drapeFlancs(ST, x0, x1, yb, yt, (g) => {
    g.strokeStyle = cyan; g.lineCap = 'round'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(cv.X(3.7), cv.Y(0.72)); g.bezierCurveTo(cv.X(1.8), cv.Y(0.9), cv.X(-0.6), cv.Y(0.96), cv.X(-2.2), cv.Y(1.12)); g.stroke();
    g.beginPath(); g.moveTo(cv.X(-0.9), cv.Y(0.92)); g.lineTo(cv.X(-3.5), cv.Y(1.1)); g.stroke();
    cv.trouer(g, R);
  }, 2048, 300, 0.022, true);
  a.drapeDessus(ST, -3.8, 4.0, -1.05, 1.05, (g, w, h) => {
    const X = (x) => (x + 3.8) / 7.8 * w, Z = (z) => (z + 1.05) / 2.1 * h;
    g.strokeStyle = cyan; g.lineWidth = 7; g.lineCap = 'round';
    for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(X(3.7), Z(sg * 0.5)); g.bezierCurveTo(X(2.0), Z(sg * 0.74), X(0.2), Z(sg * 0.74), X(-0.6), Z(sg * 0.8)); g.stroke(); }
  }, 1536, 400, 0.025, true);
  // bas de flanc : éléments mécaniques chromés devant la roue arrière
  for (const sg of [-1, 1]) {
    a.cyl(0.07, 0.07, 0.6, a.chrome, -1.1, 0.5, sg * 1.0, 0, Math.PI / 2, 14);
    a.boite(0.3, 0.12, 0.08, a.chrome, -1.42, 0.5, sg * 1.0);
  }
  // phares effilés, feux rouges, tuyère
  for (const sg of [-1, 1]) { const ph = a.boite(0.4, 0.05, 0.24, lumBlanche, 3.75, 0.68, sg * 0.56); ph.rotation.z = -0.25; }
  for (const sg of [-1, 1]) a.boite(0.05, 0.08, 0.3, lumRouge, -4.05, 0.9, sg * 0.3);
  a.tuyere(-4.1, 0.7, 0, 0.15, 0.24, a.chrome, a.neon(cyan));
  return { L: 8.4, largeur: 2.34, hauteur: 1.9, xAvant: 4.1, xArriere: -4.3, roues: R };
}

/** Chaque constructeur est isolé : une erreur dans l'un ne casse pas les autres (le registre gère le repli). */
export const GROUPE_10 = { B02: b02, B03: b03, B04: b04, B05: b05 };
void outils;
