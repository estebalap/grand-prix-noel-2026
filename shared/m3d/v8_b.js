/* V8 — escouade B : nouveaux bolides de l'atelier photo du 15 octobre 2026 (univers gothique).
 * N07 Classic Nomad (break 1955), N08 The Gov'ner (coupé néo-rétro), N09 Batmobile 2013 (chrome miroir), N10 Overbored 454.
 *
 * Méthode (reprise des escouades V5 « nippons ») :
 *  - caisse = loft de sections superellipses (aide_7) décrit par des FONCTIONS de x (demi-largeur, bas, dessus) ;
 *    passages de roues découpés serrés, fonds de passages sombres ;
 *  - pavillon des voitures « à toit » = prisme à facettes planes (aide_6 › serre) : montants couleur caisse épais par construction ;
 *  - autocollants de flanc drapés sans aucun triangle dans l'anneau d'un pneu (pénétration nulle au banc).
 * LICENCES : les livrées de personnage deviennent des motifs GÉNÉRIQUES (bandes, griffures, parapluie, haut-de-forme, éclaboussures).
 * Aucun logo, aucun emblème, aucun visage, aucune marque. Repère : avant = +x, sol y = 0, z = largeur.
 * `plafond` = hauteur de pavillon / largeur hors tout : cotes constructeur pour la Nomad, mesure sur photo pour les castings imaginaires.
 */
import { kit } from './aide_7.js';
import { serre } from './aide_6.js';

/* ================================================================== aides communes de l'escouade */

/** Essieu : x, rayon de roue RW, largeur de pneu ep, demi-voie z (centre du pneu), avant ? + options de jante. */
const essieu = (x, RW, ep, z, avant, extra = {}) => ({ x, R: RW, RW, ep, z, y: RW, avant, ...extra });

/** Découpes de passages de roues serrées : rayon RW + jeu (le pneu remplit l'arche, aucune tôle dans la gomme). */
const archesSerrees = (roues, jeu = 0.07) => roues.map((r) => ({ x: r.x, R: r.RW + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.04 }));

/** Fonds de passages de roues sombres, juste au-dessus du pneu (rayon > RW : jamais dans la gomme), bornés côté extérieur à zMax. */
function puitsNoirs(k, roues, zMax, jeu = 0.07) {
  const m = k.o.mat('#060709', 0.92, 0.05);
  for (const r of roues) {
    const zi = r.z - r.ep * 0.55, ze = Math.min(r.z + r.ep * 0.3, zMax - 0.015);
    for (const sg of [-1, 1]) k.arcGarde(r.x, r.y ?? r.RW, r.RW + 0.03, r.RW + jeu + 0.05, sg * (zi + ze) / 2, ze - zi, m, -0.12, Math.PI + 0.12);
  }
}

/**
 * Autocollant drapé sur les deux flancs d'un loft, SANS pénétration : dans un passage de roue, les sommets au-dessus de l'axe
 * sont plaqués sur le bord de l'arche, et les triangles qui touchent le disque de roue sont supprimés.
 * dessin(g, cw, ch, cote, M) — M.X / M.Y / M.S / M.Sy / M.trouer(g).
 */
function drape(k, st, x0, x1, yb, yt, dessin, roues, { cw = 1024, ch = 256, eps = 0.022, jeu = 0.07, nu = 150, nv = 28 } = {}) {
  const { THREE, garde } = k;
  for (const sg of [1, -1]) {
    const M = k.carte(x0, x1, yb, yt, cw, ch);
    M.trouer = (g) => {
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (const r of roues) { const rr = r.RW + jeu + 0.012; g.beginPath(); g.ellipse(M.X(r.x), M.Y(r.y ?? r.RW), rr * M.sx, rr * M.sy, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
    };
    const mat = k.matDecal((g) => dessin(g, cw, ch, sg, M), cw, ch);
    const pos = [], uv = [], idx = [], hors = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      let x = x0 + (x1 - x0) * i / nu, y = yb + (yt - yb) * j / nv, out = false;
      for (const r of roues) {
        const yc = r.y ?? r.RW, Ra = r.RW + jeu + 0.02, dx = x - r.x, dy = y - yc, d = Math.hypot(dx, dy);
        if (d < Ra) { if (dy > 0) { const f = Ra / Math.max(1e-4, d); x = r.x + dx * f; y = yc + dy * f; } else out = true; }
      }
      pos.push(x, y, sg * (k.flancAu(st, x, y) + eps)); uv.push(i / nu, j / nv); hors.push(out);
    }
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

/**
 * Autocollant drapé sur le DESSUS d'un loft, sans pellicule pendante : les triangles dont un sommet sort de l'emprise du dessus
 * (|z| > marge × demi-largeur locale) sont supprimés (aucune nappe qui tombe le long des flancs ou dans un passage de roue).
 * Canvas vu de dessus, nez vers la droite (u = x), haut du canvas = côté −z.
 */
function drapeHaut(k, st, x0, x1, z0, z1, dessin, cw = 1024, ch = 512, eps = 0.03, marge = 0.9) {
  const { THREE, garde } = k, nu = 120, nv = 40, pos = [], uv = [], ok = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const x = x0 + (x1 - x0) * i / nu, z = z0 + (z1 - z0) * j / nv, wl = k.sta(st, x).w;
    pos.push(x, k.hautAu(st, x, z) + eps, z); uv.push(i / nu, 1 - j / nv); ok.push(Math.abs(z) <= wl * marge);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j;
    if (ok[a] && ok[b] && ok[a + 1]) idx.push(a, b, a + 1);
    if (ok[a + 1] && ok[b] && ok[b + 1]) idx.push(a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(garde(g), k.matDecal(dessin, cw, ch)); m.renderOrder = 3; return k.o.ajouter(m);
}

/** Laque vernie à reflet maîtrisé (clearcoat 1) : couleur franche, reflet d'environnement dosé. */
const laque = (ctx, hex, r = 0.3, m = 0.12, env = 0.3) => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: r, metalness: m, clearcoat: 1, clearcoatRoughness: 0.08, envMap: ctx.envMap, envMapIntensity: env }));

/** Verre opaque brillant (fumé ou teinté) : montants nets, reflet discret. */
const vitrage = (ctx, hex = '#0c111a', env = 0.35) => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04,
  envMap: ctx.envMap, envMapIntensity: env, side: ctx.THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));

/** Verre teinté TRANSLUCIDE (on devine l'habitacle) : opacité ≥ 0,5 pour rester un vrai volume de pavillon. */
const verreTeinte = (ctx, hex, op = 0.6, env = 0.5) => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: 0.04, metalness: 0.1, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.03,
  envMap: ctx.envMap, envMapIntensity: env, side: ctx.THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));

/** Matériau lumineux plat teinté (non éclairé) : optiques. */
const lumiere = (ctx, hex, k = 1.6) => ctx.garde(new ctx.THREE.MeshBasicMaterial({ color: new ctx.THREE.Color(hex).multiplyScalar(k), toneMapped: false }));

/** Disque (phare / feu rond) face ±x : cerclage + lentille lumineuse bombée. */
function phareRond(k, x, y, z, r, lum, sens = 1, cercle = null) {
  const { o } = k;
  o.cyl(r * 1.18, r * 1.18, 0.07, cercle || o.chrome, x, y, z, 0, Math.PI / 2, 28);
  return k.ellipsoide(0.04, r, r, lum, x + sens * 0.035, y, z, 20);
}

/**
 * Stations de caisse échantillonnées depuis des fonctions de x (demi-largeur w, bas y0, dessus y1). Les angles en plan et en
 * élévation sont arrondis sur `rc` aux deux bouts (les stations extrêmes forment les faces avant / arrière).
 */
function caisseFn(x0, x1, { w, y0, y1, nt = 6.5, nb = 4.5, wt = 0.97 }, n = 64, rc = 0.12) {
  const st = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (1 - Math.cos(Math.PI * i / n)) / 2, d = Math.min(x - x0, x1 - x);
    const a = d < rc ? rc - Math.sqrt(Math.max(0, rc * rc - (rc - d) * (rc - d))) : 0;
    st.push({ x, w: w(x) - a, y0: y0(x) + a * 0.9, y1: y1(x) - a * 0.6, nt: typeof nt === 'function' ? nt(x) : nt, nb, wt: typeof wt === 'function' ? wt(x) : wt });
  }
  return st;
}
/** Plateau lissé : 1 sur |x − a| ≤ demi, raccord en S jusqu'à 0 sur `raide`. */
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
/** Tube (moulure, jonc chromé, filet en relief) le long d'un chemin [x, y] plaqué sur le flanc d'un loft, des deux côtés. */
function moulure(k, st, chemin, r, mat, eps = 0.0) {
  for (const sg of [-1, 1]) for (let i = 0; i < chemin.length - 1; i++) {
    const [xa, ya] = chemin[i], [xb, yb] = chemin[i + 1];
    k.tige([xa, ya, sg * (k.flancAu(st, xa, ya) + eps)], [xb, yb, sg * (k.flancAu(st, xb, yb) + eps)], r, mat, 8);
  }
}
/** Griffure (trois coups de griffe parallèles effilés) dessinée sur un canvas : origine (x, y), direction (dx, dy), longueur l (px). */
function griffes(g, x, y, ang, l, ecart, epais, couleur, n = 3) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = couleur;
  for (let i = 0; i < n; i++) {
    const oy = (i - (n - 1) / 2) * ecart, li = l * (1 - Math.abs(i - (n - 1) / 2) * 0.15);
    g.beginPath(); g.moveTo(0, oy); g.quadraticCurveTo(li * 0.5, oy - epais, li, oy + epais * 0.2); g.quadraticCurveTo(li * 0.5, oy + epais * 0.6, 0, oy); g.closePath(); g.fill();
  }
  g.restore();
}

/* ================================================================== N07 — Classic Nomad (break Chevrolet Nomad 1955)
 * Cotes réelles 5 000 × 1 880 × 1 500 mm, empattement 2 921 → échelle ≈ 1,55 / m : L 7,8, empattement 4,5, pavillon ≈ 2,25.
 * Break 2 portes à hayon : capot plat, face 1955 verticale à grille en caisson pleine largeur, phares ronds à visière,
 * pare-chocs chromés, MONTANT B INCLINÉ VERS L'AVANT, trois vitres latérales, hayon incliné à baguettes chromées verticales,
 * toit nervuré de 9 baguettes longitudinales chromées sur l'arrière du pavillon, petites dérives d'ailes arrière à feux.
 * Miniature « hot rod » : arrière relevé, grosses roues arrière. Violet impérial, bande blanche de flanc, coups de griffe sur
 * l'aile avant, parapluie et haut-de-forme à monocle stylisés (objets génériques). Jantes noires à liseré blanc, vitres claires. */
function classicNomad(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx, k = kit(ctx), o = k.o;
  const violet = laque(ctx, '#6a4fd0', 0.26, 0.18, 0.4), noir = o.mat('#121318', 0.6, 0.3), chromeV = o.chrome;
  const verre = vitrage(ctx, '#7d8c9c', 0.75);                                          // vitres claires : verre gris-bleu brillant
  const rd = { jante: '#16171b', rayons: 'cinqCreux', flanc: '#f2f2f2', sansFrein: true };
  const xAv = 3.9, xAr = -3.9, eAv = 2.45, eAr = -2.05;
  const roues = [essieu(eAv, 0.56, 0.5, 1.16, true, rd), essieu(eAr, 0.63, 0.58, 1.14, false, rd)];
  // assiette « hot rod » : bas de caisse et ceinture qui montent vers l'arrière
  const ass = (x) => 0.13 * (xAv - x) / (xAv - xAr);
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.38 + 0.02 * plateau(x, eAr, 0.6, 0.4),
    y0: (x) => table([[xAr, 0.6], [xAr + 0.3, 0.42], [xAv - 0.3, 0.38], [xAv, 0.52]])(x) + ass(x),
    y1: (x) => table([[xAr, 1.5], [xAr + 0.12, 1.56], [-3.2, 1.55], [-2.2, 1.49], [0, 1.47], [1.6, 1.46], [eAv, 1.46], [3.55, 1.44], [xAv, 1.36]])(x) + ass(x),
    nt: 7, nb: 4.5, wt: 0.97 }, 80, 0.1);
  k.loft(B, violet, { arches: archesSerrees(roues), nx: 190, ns: 64 });
  puitsNoirs(k, roues, 1.36);
  // pavillon de break : pare-brise panoramique incliné, long toit plat légèrement montant, hayon incliné (haut vers l'avant)
  const yb = 1.47 + ass(0);
  const S = serre(ctx, o, {
    pts: [[1.32, yb], [0.58, 2.2], [0.36, 2.25], [-3.18, 2.29], [-3.4, 2.24], [-3.74, yb + 0.06]], yb, wb: 1.26, wt: 1.1, plonge: 0.14, seuil: 0.25,
    mat: violet, verre, pb: [0, 0], mcPb: 0.1, mlPb: 0.06, lu: [4, 4], mcLu: 0.14, mlLu: 0.06 });
  // vitres latérales : portière, montant B incliné vers l'avant (haut en avant du pied), vitre de custode, vitre arrière
  const yv0 = yb + 0.09, yv1 = 2.15;
  const vitres = [
    [[1.12, yv0], [0.56, yv1 - 0.02], [-0.5, yv1], [-0.84, yv0]],
    [[-1.04, yv0], [-0.7, yv1], [-2.12, yv1 + 0.01], [-2.12, yv0]],
    [[-2.3, yv0], [-2.3, yv1 + 0.01], [-3.12, yv1 + 0.02], [-3.38, yv0 + 0.08]]];
  for (const v of vitres) S.laterale(v, verre, 0.012);
  // toit : 9 baguettes longitudinales chromées sur l'arrière du pavillon, toit ouvrant vitré à l'avant
  for (let i = 0; i < 9; i++) {
    const z = (i - 4) * 0.2, x0 = -0.75, x1 = -3.12;
    const m = o.boite(x1 - x0, 0.035, 0.05, chromeV, (x0 + x1) / 2, S.hautX((x0 + x1) / 2) + 0.012, z); m.rotation.z = Math.atan2(S.hautX(x1) - S.hautX(x0), x1 - x0) + Math.PI;
  }
  o.boite(0.95, 0.03, 1.15, vitrage(ctx, '#2a3240'), -0.05, S.hautX(-0.05) + 0.008, 0);
  o.boite(1.0, 0.035, 1.22, chromeV, -0.05, S.hautX(-0.05) + 0.002, 0);
  for (const xj of [1.32]) o.boite(0.06, 0.03, 2.5, chromeV, xj, yb + 0.01, 0);
  // capot : deux ouïes chromées en « flèche » (capot 1955), bossage central discret
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = 2.6 + i * 0.16, z = s * 0.42;
    o.boite(0.08, 0.025, 0.34 - i * 0.06, noir, x, k.hautAu(B, x, z) + 0.01, z);
  }
  k.ellipsoide(1.4, 0.05, 0.22, violet, 2.4, k.hautAu(B, 2.4, 0) - 0.01, 0, 22);
  // FACE 1955 : grille en caisson pleine largeur (cadre chromé + croisillons), phares ronds à visière, pare-chocs chromé à butoirs
  { const xf = xAv, yg = 0.98;
    o.boite(0.06, 0.34, 1.7, noir, xf - 0.0, yg, 0);
    for (let i = 0; i < 9; i++) o.boite(0.05, 0.3, 0.025, chromeV, xf + 0.015, yg, -0.8 + i * 0.2);           // montants du caisson
    for (let j = 0; j < 3; j++) o.boite(0.05, 0.025, 1.66, chromeV, xf + 0.015, yg - 0.1 + j * 0.1, 0);       // traverses
    o.boite(0.07, 0.04, 1.78, chromeV, xf + 0.02, yg + 0.19, 0); o.boite(0.07, 0.04, 1.78, chromeV, xf + 0.02, yg - 0.19, 0);
    for (const s of [-1, 1]) {
      phareRond(k, xf - 0.03, 1.22, s * 1.08, 0.17, lumBlanche, 1);
      const vis = k.ellipsoide(0.22, 0.12, 0.22, violet, xf - 0.12, 1.32, s * 1.08, 18); vis.scale.y = 0.1;     // visière de phare
      phareRond(k, xf - 0.0, 0.84, s * 1.0, 0.07, lumiere(ctx, '#ffd9a0'), 1);                                // feux de position
    }
    o.boite(0.16, 0.14, 2.62, chromeV, xf + 0.06, 0.6, 0);                                                     // pare-chocs
    for (const s of [-1, 1]) { o.boite(0.12, 0.26, 0.12, chromeV, xf + 0.12, 0.66, s * 0.5); o.boite(0.3, 0.14, 0.1, chromeV, xf - 0.06, 0.6, s * 1.3); }
    o.boite(0.03, 0.15, 0.48, o.mat('#eceef2', 0.5, 0.1), xf + 0.15, 0.6, 0);
  }
  // POUPE : hayon à 7 baguettes chromées verticales, feux sur les petites dérives d'ailes, pare-chocs chromé
  { const xr = xAr, ya = ass(xr);
    for (let i = 0; i < 7; i++) o.boite(0.03, 0.62, 0.035, chromeV, xr - 0.01, 1.17 + ya, -0.6 + i * 0.2);
    o.boite(0.03, 0.03, 1.4, chromeV, xr - 0.01, 1.5 + ya, 0);
    for (const s of [-1, 1]) {
      k.lame([[-3.0, 1.5 + ya], [-3.6, 1.56 + ya], [-3.9, 1.64 + ya], [-3.93, 1.5 + ya], [-3.3, 1.44 + ya]], 0.08, violet, s * 1.27, 0.02);   // dérive d'aile
      o.boite(0.06, 0.24, 0.16, lumRouge, xr - 0.05, 1.42 + ya, s * 1.26);
    }
    o.boite(0.16, 0.14, 2.62, chromeV, xr - 0.05, 0.66 + ya, 0);
    for (const s of [-1, 1]) o.boite(0.3, 0.14, 0.1, chromeV, xr + 0.08, 0.66 + ya, s * 1.3);
    o.boite(0.03, 0.15, 0.48, o.mat('#eceef2', 0.5, 0.1), xr - 0.02, 0.9 + ya, 0);
    o.cyl(0.06, 0.06, 0.2, chromeV, xr + 0.02, 0.45 + ya, 0.8, 0, Math.PI / 2, 14);
  }
  // rétros chromés de portière
  for (const s of [-1, 1]) { o.cyl(0.02, 0.025, 0.14, chromeV, 1.0, yb + 0.08, s * 1.36); k.ellipsoide(0.05, 0.06, 0.07, chromeV, 1.0, yb + 0.17, s * 1.36, 12); }
  // jonc chromé de ceinture et de bas de caisse
  moulure(k, B, [[-3.7, 1.52 + ass(-3.7)], [3.6, 1.42 + ass(3.6)]].map(([x, y]) => [x, y - 0.06]), 0.018, chromeV, -0.004);
  // flancs : large bande blanche horizontale, éperon et coups de griffe sur l'aile avant, parapluie et haut-de-forme à monocle
  drape(k, B, xAr + 0.05, xAv - 0.05, 0.42, 1.55, (g, w, h, c, M) => {
    const yA = (x) => ass(x);
    // bande blanche : de la poupe jusqu'à l'aile avant, s'effile en éperon vers le haut de l'aile
    g.fillStyle = '#f2f0f6'; g.beginPath();
    g.moveTo(M.X(-3.85), M.Y(1.08 + yA(-3.85))); g.lineTo(M.X(1.55), M.Y(1.0 + yA(1.55))); g.lineTo(M.X(2.95), M.Y(1.3 + yA(2.95)));
    g.lineTo(M.X(2.75), M.Y(1.13 + yA(2.75))); g.lineTo(M.X(1.5), M.Y(0.74 + yA(1.5))); g.lineTo(M.X(-3.85), M.Y(0.8 + yA(-3.85))); g.closePath(); g.fill();
    g.fillStyle = '#4a36a0'; g.fillRect(0, M.Y(0.97 + yA(0)), w, 3);                                       // filet violet foncé dans la bande
    // coups de griffe blancs sur l'aile avant
    griffes(g, M.X(2.95), M.Y(1.0 + yA(2.95)), -0.35, M.S(0.85), M.Sy(0.1), M.Sy(0.04), '#f2f0f6', 3);
    // parapluie stylisé (canopée festonnée, manche en crosse) sur la portière
    const px = M.X(0.35), py = M.Y(1.25 + yA(0.35)), r = M.Sy(0.26);
    g.fillStyle = '#16131f'; g.beginPath(); g.moveTo(px - r * 1.3, py); g.quadraticCurveTo(px, py - r * 1.5, px + r * 1.3, py);
    for (let i = 4; i > 0; i--) { const xa = px - r * 1.3 + (i - 1) * r * 0.65; g.quadraticCurveTo(xa + r * 0.32, py - r * 0.28, xa, py); }
    g.closePath(); g.fill();
    g.strokeStyle = '#16131f'; g.lineWidth = r * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py - r * 0.2); g.lineTo(px, py + r * 1.0); g.arc(px - r * 0.18, py + r * 1.0, r * 0.18, 0, Math.PI); g.stroke();
    // haut-de-forme et monocle stylisés (objets) derrière le parapluie
    const hx = M.X(-0.7), hy = M.Y(1.13 + yA(-0.7)), hr = M.Sy(0.19);
    g.fillStyle = '#16131f'; g.fillRect(hx - hr * 0.7, hy - hr * 1.7, hr * 1.4, hr * 1.5); g.fillRect(hx - hr * 1.2, hy - hr * 0.25, hr * 2.4, hr * 0.32);
    g.fillStyle = '#f2f0f6'; g.fillRect(hx - hr * 0.7, hy - hr * 0.62, hr * 1.4, hr * 0.18);
    g.strokeStyle = '#f2f0f6'; g.lineWidth = hr * 0.14; g.beginPath(); g.arc(hx + hr * 1.5, hy + hr * 0.5, hr * 0.45, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(hx + hr * 1.5, hy + hr * 0.95); g.quadraticCurveTo(hx + hr * 1.3, hy + hr * 1.6, hx + hr * 0.6, hy + hr * 1.7); g.stroke();
    // joints de portière
    g.strokeStyle = 'rgba(20,14,40,0.75)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(M.X(1.3), M.Y(1.45 + yA(1.3))); g.lineTo(M.X(1.28), M.Y(0.5 + yA(1.28))); g.moveTo(M.X(-0.9), M.Y(1.5 + yA(-0.9))); g.lineTo(M.X(-0.92), M.Y(0.5 + yA(-0.92))); g.stroke();
    g.fillStyle = '#d9dce4'; g.fillRect(M.X(-0.75), M.Y(1.36 + yA(-0.75)), M.S(0.22), 6);
    M.trouer(g);
  }, roues, { cw: 2048, ch: 320 });
  return { L: 7.86, largeur: 2.87, hauteur: 2.32, xAvant: xAv + 0.14, xArriere: xAr - 0.1, roues, jante: rd.jante, rayons: rd.rayons, flanc: rd.flanc, plafond: +(1500 / 1880).toFixed(3) };
}

/* ================================================================== N08 — The Gov'ner (casting imaginaire de coupé néo-rétro, 1990)
 * Proportions mesurées sur la photo de profil de la miniature : L/H ≈ 3,5 (verrière comprise) ; empattement ≈ 0,64 L ;
 * capot interminable (pare-brise à 0,58 L depuis l'arrière) ; ceinture très haute (0,7 H) ; grosses roues (R ≈ 0,09 L).
 * Vue de dessus : L / l ≈ 2,7. Coupé noir long et bas : capot à bossage central qui file jusqu'à la calandre, ailes avant en
 * pontons qui dépassent la calandre à barreaux, cockpit reculé à verrière AMBRÉE, poupe courte tronquée relevée en queue de canard
 * (deux arêtes de hanche qui montent vers l'arrière), ailes arrière larges, ouïes verticales au milieu du flanc.
 * Livrée générique : liserés gris, griffures et oreilles de chat stylisées grises, mot « FÉLINE » doré. Jantes noires à 5 branches,
 * bord doré. Laque noire très profonde vernie. */
function govner(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx, k = kit(ctx), o = k.o;
  const noirL = laque(ctx, '#0b0b0d', 0.12, 0.2, 0.55), grisM = o.mat('#5d6068', 0.4, 0.6), sombre = o.mat('#060608', 0.9, 0.05);
  const ambre = verreTeinte(ctx, '#e0941a', 0.78, 1.0), cuir = o.mat('#2a1606', 0.85, 0.05);                                            // vitrage jaune orangé teinté (opaque brillant)
  const rd = { jante: '#141416', rayons: 'cinqCreux', flanc: '#d4a63a', sansFrein: true };
  const xAv = 4.25, xAr = -4.15, eAv = 2.78, eAr = -2.55;
  const roues = [essieu(eAv, 0.7, 0.52, 1.18, true, rd), essieu(eAr, 0.74, 0.6, 1.2, false, rd)];
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.38 + 0.12 * plateau(x, eAr, 0.7, 0.6) + 0.04 * plateau(x, eAv, 0.7, 0.5) - 0.06 * plateau(x, 0.1, 0.9, 0.8),
    y0: table([[xAr, 0.66], [xAr + 0.35, 0.42], [xAv - 0.45, 0.42], [xAv, 0.6]]),
    y1: table([[xAr, 1.88], [xAr + 0.15, 1.92], [-3.4, 1.86], [eAr, 1.76], [-1.4, 1.7], [0, 1.68], [1.5, 1.66], [eAv, 1.62], [3.7, 1.56], [xAv, 1.42]]),
    nt: 6, nb: 4.5, wt: 0.95 }, 84, 0.14);
  k.loft(B, noirL, { arches: archesSerrees(roues), nx: 200, ns: 64 });
  puitsNoirs(k, roues, 1.5);
  // bossage central du capot : lame bombée qui file de la verrière jusqu'à la calandre en s'abaissant
  const H = [];
  for (let i = 0; i <= 14; i++) { const x = 0.55 + (4.05 - 0.55) * i / 14, t = i / 14; H.push({ x, w: 0.42 - 0.12 * t, y0: k.hautAu(B, x, 0) - 0.2, y1: k.hautAu(B, x, 0) + 0.2 - 0.12 * t, nt: 3.2, nb: 3 }); }
  k.loft(H, noirL, { nx: 60, ns: 40 });
  // verrière ambrée reculée : bulle tendue, coiffe noire, appui-tête faireauté qui file vers la poupe
  const yb = k.hautAu(B, -0.6, 0) - 0.06;
  const V = [{ x: 0.75, w: 0.4, y0: yb, y1: yb + 0.08 }, { x: 0.3, w: 0.68, y0: yb, y1: yb + 0.44 }, { x: -0.4, w: 0.76, y0: yb, y1: yb + 0.66 },
    { x: -1.2, w: 0.74, y0: yb, y1: yb + 0.66 }, { x: -1.85, w: 0.66, y0: yb, y1: yb + 0.42 }, { x: -2.35, w: 0.46, y0: yb, y1: yb + 0.1 }].map((q) => ({ nt: 2.4, nb: 4, wt: 0.82, ...q })).sort((a, b) => a.x - b.x);
  k.loft(V, ambre, { nx: 70, ns: 44 });
  k.ellipsoide(0.9, 0.3, 0.5, cuir, -0.75, yb + 0.12, 0, 20); k.ellipsoide(0.18, 0.3, 0.42, cuir, -1.35, yb + 0.3, 0, 14);   // habitacle sombre sous la bulle (siège, dossier)
  // coiffe de toit noire sur l'arrière de la bulle (le vitrage ambré reste visible devant et sur les flancs avant)
  const coiffe = []; for (let i = 0; i <= 8; i++) { const x = -2.3 + 1.5 * i / 8, q = k.sta(V, x), t = i / 8; coiffe.push({ x, w: q.w * (0.86 - 0.3 * t * t), y0: q.y1 - 0.16 - 0.06 * t, y1: q.y1 + 0.035, nt: 2.4, nb: 3, wt: 0.82 }); }
  k.loft(coiffe, noirL, { nx: 50, ns: 36 });
  // ailes avant en pontons qui dépassent la calandre en retrait
  for (const s of [-1, 1]) k.loft([{ x: 3.58, w: 0.32, y0: 0.62, y1: 1.52 }, { x: 3.95, w: 0.32, y0: 0.62, y1: 1.46 }, { x: 4.32, w: 0.26, y0: 0.7, y1: 1.32 }, { x: 4.42, w: 0.12, y0: 0.82, y1: 1.12 }]
    .map((q) => ({ nt: 3.4, nb: 3.4, wt: 0.92, ...q })), noirL, { nx: 30, ns: 32, y: 0 }).position.z = s * 1.04;
  // queue de canard : deux arêtes de hanche épaisses qui montent vers la poupe tronquée
  for (const s of [-1, 1]) {
    const z = s * 1.08;
    const p = [[-1.7, 1.68], [-2.8, 1.82], [-3.7, 2.08], [-4.18, 2.28], [-4.22, 2.08], [-4.1, 1.8], [-2.6, 1.62]].map(([x, y]) => [x, y]);
    k.lame(p, 0.34, noirL, z, 0.06);
  }
  o.boite(0.12, 0.3, 2.3, noirL, -4.1, 1.95, 0);                                                         // bandeau de poupe entre les arêtes
  // calandre en retrait entre les ailes-pontons : caisson sombre, barreaux verticaux, phares carrés dans les pontons
  { const xf = xAv;
    o.boite(0.3, 0.46, 1.4, sombre, xf - 0.12, 1.02, 0);
    for (let i = 0; i < 11; i++) o.boite(0.05, 0.42, 0.04, grisM, xf + 0.02, 1.02, -0.6 + i * 0.12);
    o.boite(0.06, 0.04, 1.42, grisM, xf + 0.03, 1.25, 0); o.boite(0.06, 0.04, 1.42, grisM, xf + 0.03, 0.79, 0);
    for (const s of [-1, 1]) {
      o.boite(0.05, 0.12, 0.3, lumBlanche, xf - 0.08, 1.1, s * 1.08);
      o.boite(0.05, 0.06, 0.2, lumiere(ctx, '#ffae3a'), xf - 0.1, 0.86, s * 1.08);
    }
    o.boite(0.1, 0.12, 2.2, grisM, xf - 0.05, 0.56, 0);                                                    // lame de bouclier grise
  }
  // poupe tronquée : feux en bandeau, sorties d'échappement
  { const xr = xAr;
    for (const s of [-1, 1]) o.boite(0.06, 0.12, 0.6, lumRouge, xr - 0.03, 1.62, s * 0.75);
    o.boite(0.06, 0.06, 1.2, grisM, xr - 0.03, 1.4, 0);
    for (const s of [-1, 1]) o.cyl(0.08, 0.08, 0.22, o.chrome, xr + 0.02, 0.62, s * 0.55, 0, Math.PI / 2, 16);
  }
  // bas de caisse gris (jonc de seuil) et ouïes verticales du milieu de flanc en relief
  moulure(k, B, [[eAr + 0.95, 0.55], [eAv - 0.9, 0.55]], 0.045, grisM, -0.01);
  for (let i = 0; i < 4; i++) { const x = 0.7 + i * 0.13; moulure(k, B, [[x, 0.62], [x, 1.45]], 0.028, grisM, -0.008); }
  // flancs : liserés gris, griffures en zigzag, oreilles de chat stylisées, « FÉLINE » doré dans un cartouche
  drape(k, B, xAr + 0.06, xAv - 0.06, 0.42, 1.9, (g, w, h, c, M) => {
    g.fillStyle = '#7d808a'; g.fillRect(M.X(-3.9), M.Y(1.58), M.X(3.9) - M.X(-3.9), 4);               // liseré d'épaule
    g.fillRect(M.X(-3.6), M.Y(0.72), M.X(3.7) - M.X(-3.6), 3);                                        // liseré bas
    // griffures en zigzag (éclair de griffe) devant la roue arrière et derrière la roue avant
    const zig = (x0, y0, dx, dy, n) => { g.beginPath(); g.moveTo(M.X(x0), M.Y(y0)); for (let i = 1; i <= n; i++) g.lineTo(M.X(x0 + dx * i), M.Y(y0 + (i % 2 ? dy : 0) - 0.03 * i)); g.stroke(); };
    g.strokeStyle = '#9a9ea8'; g.lineWidth = 5; g.lineJoin = 'miter';
    for (let j = 0; j < 3; j++) { zig(-1.75, 1.32 - j * 0.14, 0.17, 0.16, 5); zig(1.55, 1.3 - j * 0.14, 0.13, 0.14, 4); }
    // oreilles de chat stylisées (deux triangles) + trois moustaches : motif générique, aucun visage
    const ox = M.X(-0.25), oy = M.Y(1.22), s = M.Sy(0.2);
    g.fillStyle = '#8e929c';
    g.beginPath(); g.moveTo(ox - s * 1.1, oy); g.lineTo(ox - s * 0.8, oy - s * 1.2); g.lineTo(ox - s * 0.25, oy - s * 0.15); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(ox + s * 1.1, oy); g.lineTo(ox + s * 0.8, oy - s * 1.2); g.lineTo(ox + s * 0.25, oy - s * 0.15); g.closePath(); g.fill();
    g.strokeStyle = '#8e929c'; g.lineWidth = 4; for (const d of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(ox - s * 1.6, oy + s * (0.6 + d)); g.lineTo(ox - s * 0.5, oy + s * 0.55); g.moveTo(ox + s * 1.6, oy + s * (0.6 + d)); g.lineTo(ox + s * 0.5, oy + s * 0.55); g.stroke(); }
    // cartouche « FÉLINE » doré (cadre noir liseré or) derrière l'aile avant
    const cx = M.X(1.65), cy = M.Y(1.5);
    g.fillStyle = '#121214'; g.fillRect(cx - M.S(0.55), cy - M.Sy(0.11), M.S(1.1), M.Sy(0.22));
    g.strokeStyle = '#d4a63a'; g.lineWidth = 3; g.strokeRect(cx - M.S(0.55), cy - M.Sy(0.11), M.S(1.1), M.Sy(0.22));
    k.ecrire(g, 'FÉLINE', cx, cy + 2, c, 'italic 900 40px Arial Black, Arial', '#e2b640');
    // joints de portière
    g.strokeStyle = 'rgba(70,72,80,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(0.6), M.Y(1.62)); g.lineTo(M.X(0.6), M.Y(0.62)); g.moveTo(M.X(-1.6), M.Y(1.66)); g.lineTo(M.X(-1.55), M.Y(0.62)); g.stroke();
    M.trouer(g);
  }, roues, { cw: 2048, ch: 384 });
  // dessus : liserés gris de part et d'autre du bossage de capot
  drapeHaut(k, B, 1.0, 4.0, -1.2, 1.2, (g, w, h) => {
    const X = (x) => (x - 1.0) / 3.0 * w, Z = (z) => (z + 1.2) / 2.4 * h;
    g.strokeStyle = '#6d7079'; g.lineWidth = 4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(1.1), Z(s * 0.62)); g.lineTo(X(3.9), Z(s * 0.4)); g.stroke(); }
  }, 1024, 512);
  return { L: 8.4, largeur: 3.04, hauteur: 2.37, xAvant: xAv + 0.04, xArriere: xAr - 0.1, roues, jante: rd.jante, rayons: rd.rayons, flanc: rd.flanc, plafond: 0.76 };
}

/* ================================================================== N09 — Batmobile (Hot Wheels 2013, casting fantastique)
 * Proportions mesurées sur les photos : L/H ≈ 3,4 dérives comprises (≈ 4,6 au pavillon) ; empattement ≈ 0,62 L ;
 * long nez pointu en fuseau, cockpit monoplace reculé au centre arrière, flancs creusés, grosses roues arrière.
 * CHROME MIROIR intégral (métal 1, rugosité 0,08, carte d'environnement) ; filets rouges fins qui suivent les arêtes ;
 * grille avant rouge ; prise d'air noire au milieu du capot ; verrière fumée ; deux grandes dérives arrière en aile dentelée
 * (forme générique, aucun emblème) ; carénage latéral mécanique chromé ; jantes rouges à pales en turbine. */
function batmobile(ctx) {
  const { lumRouge, THREE } = ctx, k = kit(ctx), o = k.o;
  // chrome miroir verni : métal 1, rugosité 0,08, reflet d'environnement fort (vernis : la carrosserie reste une « laque » au banc)
  const miroir = ctx.garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#c9ced6').convertSRGBToLinear(), roughness: 0.08, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.05, envMap: ctx.envMap, envMapIntensity: 1.6 }));
  const chromeMeca = o.mat('#d8dde6', 0.18, 1), noir = o.mat('#08090b', 0.6, 0.3), rouge = lumiere(ctx, '#ff2030', 1.3);
  const fume = vitrage(ctx, '#121418', 0.9);
  const rd = { jante: '#d4232f', rayons: 'turbine', flanc: null, sansFrein: true };
  const xAv = 4.3, xAr = -4.25, eAv = 2.62, eAr = -2.62;
  const roues = [essieu(eAv, 0.62, 0.48, 1.08, true, rd), essieu(eAr, 0.72, 0.62, 1.12, false, rd)];
  // fuseau : nez pointu étroit, ailes avant qui coiffent les roues, taille de guêpe (flancs creusés), hanches larges
  const B = caisseFn(xAr, xAv, {
    w: (x) => table([[xAr, 1.02], [-3.7, 1.34], [eAr, 1.38], [-1.6, 1.26], [-0.7, 1.02], [0.6, 1.0], [1.7, 1.2], [eAv, 1.28], [3.4, 1.18], [3.95, 0.9], [xAv, 0.52]])(x),
    y0: table([[xAr, 0.66], [xAr + 0.4, 0.46], [xAv - 0.7, 0.4], [xAv, 0.38]]),
    y1: table([[xAr, 1.42], [-3.75, 1.6], [-3.3, 1.64], [eAr, 1.66], [-1.85, 1.62], [-1.1, 1.36], [0, 1.26], [1.2, 1.3], [1.95, 1.4], [eAv, 1.44], [3.25, 1.38], [3.75, 1.18], [xAv, 0.74]]),
    nt: (x) => (x > 3.2 ? 3.2 : 4.2), nb: 4, wt: 0.82 }, 90, 0.08);
  k.loft(B, miroir, { arches: archesSerrees(roues, 0.08), nx: 220, ns: 64 });
  puitsNoirs(k, roues, 1.4, 0.08);
  // cockpit monoplace reculé : coque chromée relevée + verrière fumée en goutte
  const C = [{ x: 0.45, w: 0.3, y0: 1.0, y1: 1.3 }, { x: -0.2, w: 0.78, y0: 1.0, y1: 1.5 }, { x: -1.0, w: 0.86, y0: 1.0, y1: 1.62 },
    { x: -1.9, w: 0.82, y0: 1.0, y1: 1.7 }, { x: -2.9, w: 0.68, y0: 1.0, y1: 1.72 }, { x: -3.75, w: 0.5, y0: 1.0, y1: 1.6 }, { x: -4.1, w: 0.3, y0: 1.0, y1: 1.46 }].map((q) => ({ nt: 2.8, nb: 4, wt: 0.85, ...q }));
  k.loft(C.sort((a, b) => a.x - b.x), miroir, { nx: 80, ns: 48 });
  const Vc = [{ x: 0.15, w: 0.24, y0: 1.3, y1: 1.38 }, { x: -0.4, w: 0.62, y0: 1.3, y1: 1.74 }, { x: -1.1, w: 0.72, y0: 1.34, y1: 1.94 },
    { x: -1.85, w: 0.66, y0: 1.4, y1: 1.94 }, { x: -2.55, w: 0.36, y0: 1.5, y1: 1.8 }].map((q) => ({ nt: 2.4, nb: 4, wt: 0.9, ...q }));
  k.loft(Vc.sort((a, b) => a.x - b.x), fume, { nx: 60, ns: 40 });
  // prise d'air noire au milieu du capot (cadre chromé, ailettes)
  { const x = 1.75, y = k.hautAu(B, x, 0);
    o.boite(0.95, 0.06, 0.62, noir, x, y + 0.0, 0); o.boite(1.02, 0.03, 0.7, chromeMeca, x, y - 0.015, 0);
    for (let i = 0; i < 5; i++) o.boite(0.04, 0.05, 0.56, o.mat('#2a2c32', 0.4, 0.8), x - 0.36 + i * 0.18, y + 0.02, 0); }
  // grille avant rouge (bandeau translucide lumineux sous la lèvre du nez) et feux arrière rouges
  { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = 3.55 + 0.6 * t; pts.push([x, k.flancAu(B, x, 0.72)]); }
    for (const s of [-1, 1]) for (let i = 0; i < pts.length - 1; i++) { const [xa, za] = pts[i], [xb, zb] = pts[i + 1]; k.tige([xa, 0.72, s * (za + 0.01)], [xb, 0.72, s * (zb + 0.01)], 0.05, rouge, 8); }
    o.boite(0.06, 0.1, 0.5, rouge, xAv - 0.06, 0.62, 0); }
  for (const s of [-1, 1]) o.boite(0.06, 0.08, 0.5, lumRouge, xAr - 0.02, 1.2, s * 0.55);
  o.boite(0.06, 0.06, 1.6, noir, xAr - 0.0, 0.92, 0);
  // dérives arrière en aile dentelée : bord d'attaque balayé, bord de fuite festonné (trois échancrures), forme générique
  const derive = [[-1.95, 1.6], [-2.7, 1.86], [-3.4, 2.18], [-4.05, 2.5], [-4.02, 2.24], [-4.3, 2.12], [-4.18, 1.9], [-4.42, 1.76], [-4.26, 1.58], [-4.36, 1.44], [-3.4, 1.56]];
  for (const s of [-1, 1]) {                                                       // dérive inclinée vers l'extérieur autour de sa base (reflets du studio)
    const m = k.lame(derive, 0.1, miroir, s * 0.98, 0.025); m.geometry.translate(0, -1.6, 0); m.position.y = 1.6; m.rotation.x = -s * 0.28;
  }
  // carénage latéral mécanique chromé dans le creux du flanc : tubes, plaques ajourées, bielles
  for (const s of [-1, 1]) {
    const zf = (x, y) => s * (k.flancAu(B, x, y) + 0.04);
    for (const [y, r] of [[0.62, 0.07], [0.82, 0.05]]) k.tige([-1.6, y, zf(-1.6, y)], [1.55, y, zf(1.55, y)], r, chromeMeca, 12);
    for (let i = 0; i < 7; i++) { const x = -1.2 + i * 0.38; const m = o.boite(0.08, 0.36, 0.06, chromeMeca, x, 0.74, zf(x, 0.74)); m.rotation.z = 0.5; }
    o.cyl(0.11, 0.11, 0.08, chromeMeca, 0.2, 0.72, zf(0.2, 0.72) + s * 0.04, Math.PI / 2, 0, 18);
  }
  // filets rouges fins qui suivent les arêtes : épaules, nez, contour du capot, cockpit
  drape(k, B, xAr + 0.05, xAv - 0.05, 0.4, 1.44, (g, w, h, c, M) => {
    g.strokeStyle = '#d4232f'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(M.X(-4.1), M.Y(1.2)); g.lineTo(M.X(-3.0), M.Y(1.3)); g.lineTo(M.X(-1.6), M.Y(1.2)); g.lineTo(M.X(-0.9), M.Y(1.05)); g.lineTo(M.X(0.9), M.Y(1.05)); g.lineTo(M.X(1.6), M.Y(1.18)); g.lineTo(M.X(3.3), M.Y(1.0)); g.lineTo(M.X(4.15), M.Y(0.66)); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(-0.9), M.Y(1.05)); g.lineTo(M.X(-0.6), M.Y(0.9)); g.lineTo(M.X(0.6), M.Y(0.9)); g.stroke();
    M.trouer(g);
  }, roues, { cw: 2048, ch: 256 });
  drapeHaut(k, B, -3.9, 4.15, -1.4, 1.4, (g, w, h) => {
    const X = (x) => (x + 3.9) / 8.05 * w, Z = (z) => (z + 1.4) / 2.8 * h;
    g.strokeStyle = '#d4232f'; g.lineWidth = 4; g.lineJoin = 'round';
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(X(4.0), Z(s * 0.12)); g.lineTo(X(3.4), Z(s * 0.55)); g.lineTo(X(2.6), Z(s * 0.62)); g.lineTo(X(2.3), Z(s * 0.48)); g.lineTo(X(0.6), Z(s * 0.48)); g.lineTo(X(0.3), Z(s * 0.62)); g.stroke();   // contour du capot (redents)
      g.beginPath(); g.moveTo(X(-0.4), Z(s * 0.95)); g.lineTo(X(-2.4), Z(s * 1.05)); g.lineTo(X(-3.7), Z(s * 0.9)); g.stroke();
    }
  }, 2048, 720);
  return { L: 8.6, largeur: 2.86, hauteur: 2.39, xAvant: xAv, xArriere: xAr - 0.13, roues, jante: rd.jante, rayons: rd.rayons, flanc: null, plafond: 0.68 };
}

/* ================================================================== N10 — Overbored 454 (casting imaginaire de muscle coupé moderne)
 * Proportions mesurées sur la photo de profil (blister) : L/H ≈ 3,8 au pavillon ; empattement ≈ 0,64 L ; long capot ;
 * ceinture haute et petite vitre latérale ; fastback qui file jusqu'à la poupe courte relevée. R ≈ 0,08 L.
 * Coupé fastback trapu à long capot d'où JAILLIT un compresseur chromé (carter, poulies, pipes, double carburateur),
 * flancs galbés, petite lèvre de becquet, violet nuit, grandes éclaboussures / griffures vert acide génériques,
 * panneau rouge vertical (sans texte) sur la portière, vitres jaunes teintées, jantes 5 branches chromées. */
function overbored(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx, k = kit(ctx), o = k.o;
  const violet = laque(ctx, '#4a2a6e', 0.24, 0.3, 0.45), noir = o.mat('#0d0c12', 0.6, 0.3), chrome = o.chrome;
  const jaune = vitrage(ctx, '#8f9a14', 0.45), sombre = o.mat('#060608', 0.9, 0.05);
  const rd = { jante: '#c4c8d0', rayons: 'cinqCreux', flanc: null, sansFrein: true };
  const xAv = 4.0, xAr = -4.0, eAv = 2.5, eAr = -2.55;
  const roues = [essieu(eAv, 0.62, 0.5, 1.13, true, rd), essieu(eAr, 0.66, 0.58, 1.13, false, rd)];
  const B = caisseFn(xAr, xAv, {
    w: (x) => 1.36 + 0.07 * plateau(x, eAr, 0.6, 0.5) + 0.05 * plateau(x, eAv, 0.55, 0.5),
    y0: table([[xAr, 0.6], [xAr + 0.35, 0.4], [xAv - 0.45, 0.38], [xAv, 0.52]]),
    y1: table([[xAr, 1.52], [xAr + 0.15, 1.62], [-3.2, 1.66], [eAr, 1.66], [-1.0, 1.6], [0.5, 1.56], [1.5, 1.52], [eAv, 1.47], [3.4, 1.38], [3.8, 1.25], [xAv, 1.1]]),
    nt: 4.6, nb: 4, wt: 0.9 }, 84, 0.16);
  k.loft(B, violet, { arches: archesSerrees(roues), nx: 200, ns: 64 });
  puitsNoirs(k, roues, 1.46);
  // pavillon fastback : pare-brise couché, toit court, longue lunette qui file jusqu'à la poupe
  const yb = 1.55;
  const S = serre(ctx, o, {
    pts: [[1.1, yb], [0.62, 1.86], [0.15, 2.07], [-0.4, 2.14], [-1.05, 2.1], [-1.8, 1.96], [-2.7, 1.74], [-3.4, 1.62]], yb, wb: 1.14, wt: 0.92, plonge: 0.14, seuil: 0.45,
    taper: { x0: -1.0, x1: -3.4, f: 0.12 }, mat: violet, verre: jaune, pb: [0, 1], mcPb: 0.12, mlPb: 0.05, lu: [5, 6], mcLu: 0.18, mlLu: 0.06 });
  S.laterale([[0.86, yb + 0.08], [0.5, 1.84], [0.1, 2.0], [-0.4, 2.05], [-1.0, 2.02], [-1.7, 1.9], [-2.2, yb + 0.1]], jaune, 0.012);   // vitre latérale en goutte
  for (const s of [-1, 1]) { o.boite(0.12, 0.04, 0.14, noir, 0.86, yb + 0.06, s * 1.18); k.ellipsoide(0.1, 0.07, 0.1, violet, 0.84, yb + 0.14, s * 1.22, 14); }   // rétros
  // COMPRESSEUR qui jaillit du capot : carter chromé, ailettes, poulies + courroie, double carburateur et pipes
  { const x0 = 1.95, yc = k.hautAu(B, x0, 0);
    o.boite(1.0, 0.16, 0.7, sombre, x0, yc - 0.02, 0);                                                     // ouverture de capot
    const carter = o.boite(0.95, 0.32, 0.56, chrome, x0, yc + 0.18, 0);
    for (let i = 0; i < 5; i++) o.boite(0.9, 0.025, 0.6, o.mat('#9aa0aa', 0.25, 0.9), x0, yc + 0.06 + i * 0.06, 0);
    o.cyl(0.13, 0.13, 0.12, chrome, x0 + 0.52, yc + 0.22, 0.12, Math.PI / 2, 0, 18); o.cyl(0.09, 0.09, 0.12, chrome, x0 + 0.52, yc + 0.0, 0.12, Math.PI / 2, 0, 18);
    o.boite(0.06, 0.26, 0.05, noir, x0 + 0.6, yc + 0.11, 0.12);                                             // courroie
    o.boite(0.7, 0.06, 0.48, chrome, x0, yc + 0.37, 0);                                                    // semelle des carburateurs
    for (const dx of [-0.18, 0.18]) {
      o.cyl(0.13, 0.15, 0.18, chrome, x0 + dx, yc + 0.48, 0, 0, 0, 20);
      o.cyl(0.16, 0.16, 0.04, o.mat('#aab0ba', 0.2, 0.9), x0 + dx, yc + 0.58, 0, 0, 0, 20);
      o.cyl(0.09, 0.09, 0.05, sombre, x0 + dx, yc + 0.6, 0, 0, 0, 16);
    }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {                                                 // pipes chromées latérales
      const x = x0 - 0.33 + i * 0.22; k.tige([x, yc + 0.08, s * 0.3], [x - 0.08, yc - 0.04, s * 0.62], 0.035, chrome, 8);
    }
    void carter;
  }
  // face avant en pointe : bouche noire, phares étirés, lame ; poupe : feux en bandeau, lèvre de becquet, double sortie
  { const xf = xAv;
    o.boite(0.12, 0.2, 1.3, sombre, xf - 0.06, 0.7, 0);
    for (const s of [-1, 1]) { const ph = k.ellipsoide(0.3, 0.05, 0.16, lumBlanche, xf - 0.36, k.hautAu(B, xf - 0.36, 0.78) - 0.02, s * 0.78, 16); ph.rotation.z = -0.4; ph.rotation.y = s * 0.35; }
    o.boite(0.2, 0.06, 1.9, noir, xf - 0.2, 0.42, 0);
  }
  { const xr = xAr;
    o.boite(0.06, 0.1, 2.1, lumRouge, xr - 0.0, 1.32, 0); o.boite(0.06, 0.04, 2.1, noir, xr - 0.01, 1.22, 0);
    k.plan(-3.8, k.hautAu(B, -3.8, 0) + 0.04, 0.32, 2.3, 0.06, violet, 0.16);                            // petite lèvre de becquet
    for (const s of [-1, 1]) o.cyl(0.08, 0.08, 0.24, chrome, xr + 0.02, 0.5, s * 0.6, 0, Math.PI / 2, 16);
    o.boite(0.16, 0.12, 2.0, noir, xr + 0.08, 0.46, 0);
  }
  // flancs : grandes éclaboussures / griffures vert acide, panneau rouge vertical sur la portière, joint de porte
  drape(k, B, xAr + 0.06, xAv - 0.06, 0.4, 1.66, (g, w, h, c, M) => {
    const V = '#b8e04a';
    // longues griffures effilées : épaule arrière → portière, et bas de caisse
    griffes(g, M.X(-3.7), M.Y(1.42), 0.02, M.S(3.2), M.Sy(0.1), M.Sy(0.05), V, 3);
    griffes(g, M.X(-1.6), M.Y(0.62), -0.03, M.S(3.4), M.Sy(0.08), M.Sy(0.045), V, 3);
    // éclaboussure centrale (tache à pointes irrégulières, déterministe)
    const cx = M.X(-0.35), cy = M.Y(1.05), R = M.Sy(0.36);
    g.fillStyle = V; g.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, rr = R * (i % 2 ? 0.55 : 1) * (1 + 0.35 * Math.sin(i * 2.7)); const xx = cx + Math.cos(a) * rr * 1.7, yy = cy + Math.sin(a) * rr; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.closePath(); g.fill();
    g.fillStyle = '#4a2a6e'; g.beginPath(); g.ellipse(cx, cy, R * 0.9, R * 0.32, 0, 0, Math.PI * 2); g.fill();      // cœur violet (éclat évidé)
    for (let i = 0; i < 7; i++) { g.fillStyle = V; g.beginPath(); g.arc(cx + R * (2.1 + (i % 3) * 0.35) * (i % 2 ? 1 : -1), cy + R * (-0.6 + i * 0.2), R * (0.1 + (i % 3) * 0.04), 0, 7); g.fill(); }   // gouttes
    // panneau rouge vertical générique sur la portière
    g.fillStyle = '#d42a2a'; g.fillRect(M.X(0.68), M.Y(1.5), M.S(0.46), M.Sy(0.9));
    g.fillStyle = '#121014'; g.fillRect(M.X(0.68), M.Y(1.5), M.S(0.46), M.Sy(0.07));
    // joints de portière
    g.strokeStyle = 'rgba(20,10,30,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(1.2), M.Y(1.52)); g.lineTo(M.X(1.18), M.Y(0.56)); g.moveTo(M.X(-1.6), M.Y(1.6)); g.lineTo(M.X(-1.55), M.Y(0.56)); g.stroke();
    M.trouer(g);
  }, roues, { cw: 2048, ch: 320 });
  // dessus : éclats vert acide sur le capot et le toit
  drapeHaut(k, B, -3.6, 3.8, -1.3, 1.3, (g, w, h) => {
    const X = (x) => (x + 3.6) / 7.4 * w, Z = (z) => (z + 1.3) / 2.6 * h;
    for (const s of [-1, 1]) { griffes(g, X(2.4), Z(s * 0.85), Math.PI + s * 0.08, (X(1.6) - X(0)) , (Z(0.12) - Z(0)), (Z(0.05) - Z(0)), '#b8e04a', 3); griffes(g, X(-3.4), Z(s * 0.7), -s * 0.05, X(1.4) - X(0), Z(0.1) - Z(0), Z(0.04) - Z(0), '#b8e04a', 2); }
  }, 2048, 720);
  return { L: 8.0, largeur: 2.9, hauteur: 2.1, xAvant: xAv, xArriere: xAr - 0.04, roues, jante: rd.jante, rayons: rd.rayons, flanc: null, plafond: 0.75 };
}

export const V8_B = { N07: classicNomad, N08: govner, N09: batmobile, N10: overbored };
