/* V8 — escouade C : nouveaux bolides de l'atelier photo du 15 octobre 2026 (voir mission) : N03, N06, N11.
 *
 * Méthode (héritée des modèles V5 réussis « nippons ») :
 *  - cotes constructeur ramenées à l'échelle de la scène (≈ 1,65 unité par mètre) : longueur, empattement, porte-à-faux,
 *    ceinture et pavillon suivent la vraie voiture ; `plafond` = hauteur / largeur hors tout réelle (ou mesurée sur la photo
 *    du jouet pour un casting imaginaire) ;
 *  - caisse = loft de sections superellipses (aide_7) échantillonné depuis des fonctions de x (ailes, capot, poupe) ;
 *    passages de roues découpés serrés (le pneu remplit l'arche, aucune tôle dans la gomme) ;
 *  - pavillon = prisme à facettes planes (aide_6 › serre) : pare-brise, toit et lunette à arêtes franches, vitres en retrait,
 *    montants couleur caisse épais par construction ;
 *  - autocollants de flanc drapés « sûrs » : aucun triangle dans l'anneau d'un pneu.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo, aucune marque, aucun emblème de personnage : formes et motifs génériques.
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
 * sont plaqués sur le bord de l'arche, et les triangles qui touchent la moitié basse du disque de roue sont supprimés.
 * dessin(g, cw, ch, cote, M) — M.X / M.Y / M.S / M.Sy convertissent les cotes monde en pixels, M.trouer(g) efface les arches.
 */
function drape(k, st, x0, x1, yb, yt, dessin, roues, { cw = 1024, ch = 256, eps = 0.022, jeu = 0.06, nu = 150, nv = 28 } = {}) {
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

/** Laque vernie (clearcoat 1) à reflet maîtrisé : métal et environnement dosés pour garder la teinte franche. */
const laque = (ctx, hex, r = 0.3, m = 0.12, env = 0.28) => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: r, metalness: m, clearcoat: 1, clearcoatRoughness: 0.1, envMap: ctx.envMap, envMapIntensity: env }));

/** Verre teinté brillant (opaque : montants peints nets, le vitrage reflète l'environnement). */
const vitrage = (ctx, hex = '#0c111a', env = 0.32) => ctx.garde(new ctx.THREE.MeshPhysicalMaterial({
  color: new ctx.THREE.Color(hex).convertSRGBToLinear(), roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04,
  envMap: ctx.envMap, envMapIntensity: env, side: ctx.THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));

/** Matériau lumineux plat teinté (non éclairé) : clignotants, feux. */
const lumiere = (ctx, hex, k = 1.6) => ctx.garde(new ctx.THREE.MeshBasicMaterial({ color: new ctx.THREE.Color(hex).multiplyScalar(k), toneMapped: false }));

/** Disque (phare / feu rond) face ±x : cerclage + lentille bombée. */
function phareRond(k, x, y, z, r, lum, sens = 1, cercle = null) {
  const { o } = k;
  o.cyl(r * 1.16, r * 1.16, 0.06, cercle || o.chrome, x, y, z, 0, Math.PI / 2, 28);
  return k.ellipsoide(0.035, r, r, lum, x + sens * 0.03, y, z, 20);
}

/** Rétroviseurs de portière (bras + coque), des deux côtés, à la demi-largeur z. */
function retrosPorte(k, x, y, z, mat, bras = null) {
  const { o } = k;
  for (const s of [-1, 1]) { o.boite(0.12, 0.04, 0.14, bras || mat, x, y - 0.05, s * (z - 0.08)); k.ellipsoide(0.1, 0.075, 0.11, mat, x - 0.02, y, s * z, 14); }
}

/** Stations de caisse échantillonnées depuis des fonctions de x (demi-largeur w, bas y0, dessus y1) ; angles arrondis sur `rc` aux deux bouts. */
function caisseFn(x0, x1, { w, y0, y1, nt = 6.5, nb = 4.5, wt = 0.97 }, n = 64, rc = 0.12) {
  const st = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (1 - Math.cos(Math.PI * i / n)) / 2, d = Math.min(x - x0, x1 - x);
    const a = d < rc ? rc - Math.sqrt(Math.max(0, rc * rc - (rc - d) * (rc - d))) : 0;
    const v = (f) => (typeof f === 'function' ? f(x) : f);
    st.push({ x, w: w(x) - a, y0: y0(x) + a * 0.9, y1: y1(x) - a * 0.6, nt: v(nt), nb: v(nb), wt: v(wt) });
  }
  return st;
}
/** Plateau lissé : 1 sur |x − a| ≤ demi, raccord en S jusqu'à 0 sur `raide` (élargisseurs, bossages). */
const plateau = (x, a, demi, raide) => { const d = Math.abs(x - a) - demi; if (d <= 0) return 1; if (d >= raide) return 0; const t = d / raide; return 1 - t * t * (3 - 2 * t); };
/** Rampe lisse 0 → 1 entre a et b. */
const rampe = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
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

/** Tube (moulure, arête en relief) le long d'un chemin [x, y] plaqué sur le flanc d'un loft, des deux côtés. */
function moulure(k, st, chemin, r, mat, eps = 0.0) {
  for (const sg of [-1, 1]) for (let i = 0; i < chemin.length - 1; i++) {
    const [xa, ya] = chemin[i], [xb, yb] = chemin[i + 1];
    k.tige([xa, ya, sg * (k.flancAu(st, xa, ya) + eps)], [xb, yb, sg * (k.flancAu(st, xb, yb) + eps)], r, mat, 8);
  }
}

/** Vitre latérale à cadre : polygone de cadre (agrandi autour du centre) puis vitre posée par-dessus, sur les deux flancs du pavillon. */
function vitreCadree(S, poly, verre, cadre, marge = 0.035) {
  const c = poly.reduce((a, q) => [a[0] + q[0] / poly.length, a[1] + q[1] / poly.length], [0, 0]);
  if (cadre) S.laterale(poly.map(([x, y]) => [x + Math.sign(x - c[0]) * marge, y + Math.sign(y - c[1]) * marge]), cadre, 0.004);
  S.laterale(poly, verre, 0.009);
}

/** Pièce posée sur le dessus du loft à (x, z) et inclinée selon la pente locale du capot / pont. */
function surDessus(k, st, x, z, dy, maille) {
  const y = k.hautAu(st, x, z), p = Math.atan2(k.hautAu(st, x + 0.12, z) - k.hautAu(st, x - 0.12, z), 0.24);
  maille.position.set(x, y + dy, z); maille.rotation.z = p; return maille;
}

/** Trait brisé (liste de points monde [x, y]) tracé sur un canvas de flanc. */
function trait(g, M, pts, couleur, ep, dy = 0) {
  g.strokeStyle = couleur; g.lineWidth = ep; g.lineJoin = 'miter'; g.lineCap = 'butt';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(M.X(x), M.Y(y + dy)) : g.moveTo(M.X(x), M.Y(y + dy)))); g.stroke();
}

/* ================================================================== N03 — Subaru WRX STI hatchback (GRB, 2008-2014)
 * Cotes réelles 4 415 × 1 795 × 1 475 mm, empattement 2 625, voies 1 530 / 1 540 → échelle 1,65 / m :
 * L 7,28, empattement 4,33, porte-à-faux AV 1,62 / AR 1,34, largeur hors tout 2,96. Pavillon abaissé à ≈ 2,13 (plafond 0,72,
 * proportions de la miniature Hot Wheels, plus basse et plus plongeante que la vraie GRB à 0,82).
 * Compacte 5 portes à hayon : ailes AV et AR fortement élargies (blisters plats à arête vive), grande écope de capot centrale,
 * bouclier avant à grandes entrées (bouche centrale trapézoïdale + antibrouillards en creux), phares étirés vers les ailes,
 * pavillon haut à hayon presque vertical coiffé d'un petit becquet de toit, montant B noir.
 * Livrée : bleu nuit pailleté verni, ligne brisée de « crêtes de montagne » rose et bleu clair sur les flancs et le capot.
 * Jantes noires à 10 branches fines. Aucun logo. */
function wrxSti(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = laque(ctx, '#1d2638', 0.3, 0.5, 0.6);                 // bleu nuit pailleté : base métallisée + vernis
  const noir = o.mat('#0b0c10', 0.55, 0.3), noirMat = o.mat('#0e0f13', 0.85, 0.08), maille = o.mat('#17181d', 0.7, 0.4);
  const verre = vitrage(ctx, '#0c1119'), ambre = lumiere(ctx, '#ff9a2a');
  const rd = { jante: '#16171b', rayons: 'dix', flanc: null };
  const xAv = 3.64, xAr = -3.64, eAv = 2.02, eAr = -2.31;
  const roues = [essieu(eAv, 0.64, 0.5, 1.22, true, rd), essieu(eAr, 0.64, 0.5, 1.23, false, rd)];
  // caisse : flancs de base (1,32) + blisters plats (+0,15) aux deux essieux ; nez rentrant en plan, hayon presque vertical
  const wB = (x) => 1.29 + 0.18 * Math.max(plateau(x, eAv, 0.52, 0.42), plateau(x, eAr, 0.56, 0.42)) - 0.2 * rampe(x, 3.05, xAv) - 0.06 * rampe(-x, 3.35, -xAr);
  const B = caisseFn(xAr, xAv, {
    w: wB,
    y0: table([[xAr, 0.4], [xAr + 0.3, 0.3], [xAv - 0.45, 0.29], [xAv, 0.36]]),
    y1: table([[xAr, 1.42], [xAr + 0.14, 1.54], [-3.0, 1.57], [eAr, 1.56], [-0.6, 1.52], [0.9, 1.49], [1.4, 1.47], [eAv, 1.39], [3.0, 1.3], [3.4, 1.2], [xAv, 1.04]]),
    nt: 6.5, nb: 4.2, wt: 0.95 }, 80, 0.12);
  k.loft(B, peint, { arches: archesSerrees(roues), nx: 190, ns: 64 });
  puitsNoirs(k, roues, 1.46);
  // arête vive des blisters : moulure couleur caisse au sommet de chaque aile élargie
  // (arête toujours au-dessus de la couronne R + 0,1 de la roue : jamais dans la gomme)
  for (const [a, d, r] of [[eAv, 0.62, roues[0]], [eAr, 0.66, roues[1]]]) moulure(k, B, Array.from({ length: 9 }, (_, i) => {
    const x = a - d + 2 * d * i / 8, Rs = r.RW + 0.1, dx = Math.min(Math.abs(x - r.x), Rs);
    return [x, Math.max(Math.min(k.sta(B, x).y1 - 0.08, 1.4), r.RW + Math.sqrt(Rs * Rs - dx * dx))]; }), 0.022, peint, -0.012);
  // pavillon abaissé « coupé » comme la miniature (plus bas et plus plongeant que la vraie GRB) : pare-brise très couché,
  // toit court qui fuit vers l'arrière, hayon couché
  const S = serre(ctx, o, {
    pts: [[1.42, 1.47], [0.05, 2.07], [-0.3, 2.13], [-1.0, 2.12], [-2.15, 2.0], [-2.6, 1.88], [-3.42, 1.55]], yb: 1.47, wb: 1.18, wt: 0.96, plonge: 0.2, seuil: 0.3,
    taper: { x0: -1.6, x1: -3.4, f: 0.07 }, mat: peint, verre, pb: [0, 0], mcPb: 0.13, mlPb: 0.06, lu: [5, 5], mcLu: 0.18, mlLu: 0.07 });
  // vitrages latéraux : cadre noir continu (montant B noir), vitres de portières et custode
  S.laterale([[1.22, 1.57], [0.06, 2.04], [-1.0, 2.07], [-2.1, 1.96], [-2.92, 1.66], [-2.88, 1.61]], noirMat, 0.004);
  // ligne de vitrage : seuil qui remonte vers l'arrière, custode triangulée qui finit en pointe (signature du hayon GRB)
  for (const v of [[[1.08, 1.6], [0.07, 2.0], [-0.92, 2.02], [-0.92, 1.61]], [[-1.06, 1.615], [-1.06, 2.01], [-1.95, 1.95], [-1.95, 1.64]], [[-2.07, 1.65], [-2.07, 1.92], [-2.2, 1.9], [-2.75, 1.68]]]) S.laterale(v, verre, 0.009);
  retrosPorte(k, 1.05, 1.68, 1.32, peint, noirMat);
  // lèvres d'ailes élargies : couronnes couleur caisse au bord des blisters (rayon ≥ R + 0,07 : jamais dans la gomme)
  for (const r of roues) for (const s of [-1, 1]) k.arcGarde(r.x, r.RW, r.RW + 0.07, r.RW + 0.17, s * (wB(r.x) - 0.05), 0.1, peint, 0.05, Math.PI - 0.05);
  // petit becquet de toit (prolonge le pavillon au-dessus du hayon) et ses joues
  k.plan(-2.68, 1.93, 0.62, 1.86, 0.08, peint, 0.16);
  for (const s of [-1, 1]) o.boite(0.48, 0.1, 0.06, peint, -2.66, 1.89, s * 0.92);
  // ligne d'épaule nerveuse : arête couleur caisse du blister avant au blister arrière, sous les vitres
  moulure(k, B, Array.from({ length: 17 }, (_, i) => { const x = 1.4 - 3.1 * i / 16; return [x, 1.3 + 0.06 * i / 16]; }), 0.02, peint, -0.01);
  // écope de capot centrale : coque bombée + bouche noire face à la route
  { const xs = 2.3, ys = k.hautAu(B, xs, 0);
    const coque = surDessus(k, B, xs, 0, -0.01, k.ellipsoide(0.5, 0.13, 0.36, peint, 0, 0, 0, 24));
    const bouche = o.boite(0.06, 0.08, 0.5, noirMat, xs + 0.42, ys + 0.06, 0); bouche.rotation.z = coque.rotation.z;
    o.boite(0.04, 0.012, 0.46, maille, xs + 0.44, ys + 0.06, 0); }
  // face avant : bouche centrale trapézoïdale noire maillée, calandre haute, antibrouillards en creux, phares étirés, lame
  { const xf = xAv;
    o.boite(0.08, 0.36, 1.12, maille, xf - 0.02, 0.62, 0); o.boite(0.06, 0.03, 1.2, noir, xf + 0.005, 0.81, 0);
    o.boite(0.06, 0.16, 0.72, maille, xf - 0.03, 1.0, 0); o.boite(0.05, 0.02, 0.74, o.chrome, xf - 0.005, 1.08, 0);
    for (const s of [-1, 1]) {
      o.boite(0.08, 0.26, 0.32, noirMat, xf - 0.1, 0.6, s * 0.86); k.ellipsoide(0.03, 0.06, 0.08, lumBlanche, xf - 0.06, 0.6, s * 0.86, 12);
      const ph = o.boite(0.5, 0.11, 0.36, lumBlanche, xf - 0.3, 1.06, s * 0.88); ph.rotation.y = s * 0.55; ph.rotation.z = -0.25;
      const cl = o.boite(0.2, 0.05, 0.16, ambre, xf - 0.6, 1.16, s * 1.18); cl.rotation.y = s * 0.9;
    }
    o.boite(0.24, 0.05, 2.1, noirMat, xf - 0.32, 0.3, 0);                                                     // lame avant noire
  }
  // poupe : feux d'angle enveloppants, bouclier à diffuseur, quatre sorties d'échappement, plaque, essuie-glace
  { const xr = xAr;
    for (const s of [-1, 1]) {
      const f = o.boite(0.06, 0.2, 0.4, lumRouge, xr + 0.08, 1.38, s * 0.9); f.rotation.y = s * 0.45;
      for (const z of [0.62, 0.78]) o.cyl(0.06, 0.06, 0.2, o.chrome, xr - 0.0, 0.42, s * z, 0, Math.PI / 2, 16);
    }
    o.boite(0.16, 0.12, 2.0, noirMat, xr + 0.12, 0.36, 0);
    for (let i = -3; i <= 3; i++) o.boite(0.16, 0.1, 0.03, noir, xr + 0.1, 0.38, i * 0.14);
    k.plaque(xr - 0.0, 0.9, -1, '#eef0f4');
  }
  // dessus : crête de montagne en travers du capot (rose + bleu clair), devant l'écope
  k.drapeDessus(B, 2.55, 3.55, -1.3, 1.3, (g, w, h) => {
    const X = (x) => (x - 2.55) / 1.0 * w, Z = (z) => (z + 1.3) / 2.6 * h;
    const cretes = [[2.95, -1.25], [3.05, -0.95], [2.9, -0.72], [3.2, -0.42], [3.0, -0.18], [3.28, 0.12], [3.05, 0.38], [3.18, 0.62], [2.92, 0.92], [3.02, 1.25]];
    for (const [c, dx, l] of [['#e85fb4', 0, 9], ['#6fc3f0', -0.06, 9]]) { g.strokeStyle = c; g.lineWidth = l; g.lineJoin = 'miter'; g.beginPath(); cretes.forEach(([x, z], i) => (i ? g.lineTo(X(x + dx), Z(z)) : g.moveTo(X(x + dx), Z(z)))); g.stroke(); }
  }, 512, 512);
  // flancs : ligne de crêtes rose / bleu clair (basse sur la portière AV, crêtes sur la portière AR), joints d'ouvrants, poignées
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.29, 1.6, (g, w, h, c, M) => {
    const ligne = [[1.75, 0.78], [-0.85, 0.78], [-1.05, 0.98], [-1.2, 0.9], [-1.42, 1.22], [-1.6, 1.04], [-1.82, 1.36], [-2.02, 1.16], [-2.18, 1.28], [-2.4, 1.08], [-2.55, 1.12]];
    trait(g, M, ligne, '#6fc3f0', 9, -0.06); trait(g, M, ligne, '#e85fb4', 9);
    g.strokeStyle = '#0a0d15'; g.lineWidth = 3;
    for (const x of [1.0, -0.98, -2.22]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.52)); g.lineTo(M.X(x + 0.03), M.Y(0.42)); g.stroke(); }
    g.fillStyle = '#0d1018'; g.fillRect(0, M.Y(0.42), w, h);                                                 // bas de caisse sombre
    g.fillStyle = '#3a4560'; for (const x of [-0.55, -2.0]) g.fillRect(M.X(x), M.Y(1.42), M.S(0.22), 6);    // poignées
    M.trouer(g);
  }, roues, { cw: 2048, ch: 320 });
  return { L: 7.28, largeur: 2.96, hauteur: 2.13, xAvant: xAv + 0.02, xArriere: xAr - 0.02, roues, jante: rd.jante, rayons: rd.rayons, flanc: null, plafond: 0.72 };   // plafond du jouet (pavillon abaissé à la demande, vraie GRB 0,82)
}

/* ================================================================== N06 — '64 Corvette Sting Ray coupé (C2)
 * Cotes réelles 4 450 × 1 770 × 1 265 mm, empattement 2 490 → échelle 1,65 / m :
 * L 7,34, empattement 4,11, porte-à-faux AV 1,67 / AR 1,56, largeur 2,92, pavillon ≈ 2,09.
 * Longue proue en lame (phares escamotables FERMÉS dans la proue), arête de caisse vive qui fait le tour de la voiture
 * (« ceinture »), bossages d'ailes au-dessus des quatre roues, pavillon fastback à lunette monobloc (1964), arête dorsale qui
 * file jusqu'à la poupe tronquée, deux fausses ouïes chromées sur le capot, fausses grilles d'aile avant, pare-chocs chromés fins
 * en lames d'angle, doubles feux ronds à l'arrière. Vert foncé profond verni, jantes chromées à enjoliveurs, pneus à flancs blancs. */
function stingRay(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const vert = laque(ctx, '#1f3b33', 0.24, 0.3, 0.32), noir = o.mat('#0b0c0e', 0.6, 0.2), noirMat = o.mat('#0d0e10', 0.85, 0.08);
  const verre = vitrage(ctx, '#0d1214'), ambre = lumiere(ctx, '#ffb347');
  const rd = { jante: '#c4cad3', rayons: 'turbine', flanc: '#f4f5f0' };
  const xAv = 3.67, xAr = -3.67, eAv = 2.0, eAr = -2.11;
  const roues = [essieu(eAv, 0.56, 0.42, 1.18, true, rd), essieu(eAr, 0.56, 0.44, 1.19, false, rd)];
  // caisse : section « bateau » (épaules arrondies, arête vive à mi-hauteur), bossages larges au-dessus des roues, proue en lame
  const wB = (x) => 1.36 + 0.09 * Math.max(plateau(x, eAv, 0.35, 0.6), plateau(x, eAr, 0.4, 0.6)) - 0.42 * Math.pow(rampe(x, 2.7, xAv + 0.05), 1.4) - 0.16 * rampe(-x, 2.9, -xAr);
  const B = caisseFn(xAr, xAv, {
    w: wB,
    y0: table([[xAr, 0.62], [xAr + 0.4, 0.34], [xAv - 0.7, 0.32], [xAv - 0.2, 0.5], [xAv, 0.78]]),
    y1: table([[xAr, 1.2], [xAr + 0.15, 1.3], [-3.0, 1.38], [eAr, 1.42], [-0.9, 1.38], [0.0, 1.38], [0.8, 1.4], [eAv, 1.32], [2.8, 1.22], [3.35, 1.1], [xAv, 0.98]]),
    nt: 2.8, nb: 2.3, wt: 0.86 }, 84, 0.1);
  k.loft(B, vert, { arches: archesSerrees(roues, 0.07), nx: 200, ns: 72 });
  puitsNoirs(k, roues, 1.4, 0.07);
  // bossages d'ailes au-dessus des roues (crêtes saillantes qui dominent le capot et le pont arrière)
  for (const [x, l] of [[eAv, 0.95], [eAr, 1.0]]) for (const s of [-1, 1]) {
    const z = s * 0.98, y = k.hautAu(B, x, 0.98);
    k.ellipsoide(l, 0.06, 0.26, vert, x, y - 0.04, z, 28);
  }
  // arête de ceinture : tube couleur caisse au point le plus large du flanc, sur toute la longueur (proue → poupe)
  const yC = (x) => (k.sta(B, x).y0 + k.sta(B, x).y1) / 2;
  { const pts = Array.from({ length: 49 }, (_, i) => { const x = xAr + 0.06 + (xAv - xAr - 0.12) * i / 48; return [x, yC(x)]; });
    const libre = ([x, y]) => roues.every((r) => Math.hypot(x - r.x, y - r.RW) > r.RW + 0.12);   // l'arête est interrompue par les passages de roues
    let tr = []; for (const p of pts) { if (libre(p)) tr.push(p); else { if (tr.length > 1) moulure(k, B, tr, 0.026, vert, -0.012); tr = []; } }
    if (tr.length > 1) moulure(k, B, tr, 0.026, vert, -0.012); }
  // pavillon fastback « Sting Ray » : pare-brise couché, toit court, longue lunette monobloc puis pont jusqu'à la poupe
  const S = serre(ctx, o, {
    pts: [[0.5, 1.38], [-0.55, 1.98], [-0.8, 2.05], [-1.25, 2.05], [-1.55, 1.98], [-2.45, 1.7], [-3.22, 1.4]], yb: 1.38, wb: 1.08, wt: 0.82, plonge: 0.2, seuil: 0.3,
    taper: { x0: -1.25, x1: -3.22, f: 0.42 }, mat: vert, verre, pb: [0, 0], mcPb: 0.12, mlPb: 0.06, lu: [4, 4], mcLu: 0.16, mlLu: 0.06 });
  for (const v of [[[0.28, 1.48], [-0.52, 1.93], [-1.36, 1.95], [-1.36, 1.48]], [[-1.48, 1.48], [-1.48, 1.92], [-1.74, 1.9], [-2.3, 1.56], [-2.3, 1.48]]]) vitreCadree(S, v, verre, o.chrome, 0.03);
  o.boite(0.05, 0.025, 1.9, o.chrome, 0.5, 1.4, 0);                                                         // jonc de pied de pare-brise
  // arête dorsale : lame fine qui file du toit à la poupe tronquée
  { const xs = [], n = 26; for (let i = 0; i <= n; i++) xs.push(-0.9 - (xAr + 0.05 + 0.9) * -i / n);
    const haut = (x) => (x > -3.22 ? S.hautX(x) : k.hautAu(B, x, 0));
    const pts = xs.map((x) => [x, haut(x) + 0.045]).concat(xs.slice().reverse().map((x) => [x, haut(x) - 0.06]));
    k.lame(pts, 0.05, vert, 0, 0.012); }
  // capot : deux fausses ouïes en creux à barrettes chromées, bossage central
  for (const s of [-1, 1]) {
    const xv = 1.55, zv = s * 0.36;
    surDessus(k, B, xv, zv, 0.0, o.boite(0.5, 0.03, 0.22, noirMat, 0, 0, 0));
    for (let i = -1; i <= 1; i++) surDessus(k, B, xv, zv + i * 0.07, 0.022, o.boite(0.46, 0.022, 0.025, o.chrome, 0, 0, 0));
  }
  // proue : phares escamotables fermés (paupières à joints), lame chromée, bouche basse à grille, pare-chocs d'angle fins
  k.drapeDessus(B, 2.6, xAv - 0.02, -1.2, 1.2, (g, w, h) => {
    const X = (x) => (x - 2.6) / (xAv - 2.62) * w, Z = (z) => (z + 1.2) / 2.4 * h;
    g.strokeStyle = '#07090a'; g.lineWidth = 4;
    for (const s of [-1, 1]) { g.beginPath(); g.rect(X(2.95), Z(s * 0.74 - 0.21), X(3.35) - X(2.95), Z(0.42) - Z(0)); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(X(2.65), Z(-0.3)); g.lineTo(X(3.5), Z(0)); g.lineTo(X(2.65), Z(0.3)); g.stroke();   // pointe centrale du capot
  }, 512, 512);
  { const xf = xAv;
    o.boite(0.3, 0.2, 1.3, noirMat, xf - 0.32, 0.62, 0);                                                     // bouche basse sous la lame
    for (let i = 0; i < 4; i++) o.boite(0.04, 0.018, 1.24, o.chrome, xf - 0.18, 0.55 + i * 0.045, 0);
    for (const s of [-1, 1]) {
      const p = o.boite(0.7, 0.06, 0.07, o.chrome, xf - 0.42, 0.74, s * 0.78); p.rotation.y = s * 0.55;        // pare-chocs d'angle (lames chromées fines)
      o.boite(0.05, 0.06, 0.2, ambre, xf - 0.33, 0.62, s * 0.55);                                               // feux de position
    }
  }
  // fausses grilles d'aile avant : trois barrettes chromées obliques derrière la roue avant, des deux côtés
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = 1.18 - i * 0.13, y = yC(x) + 0.08, z = s * (k.flancAu(B, x, y) + 0.006);
    const b = o.boite(0.06, 0.3, 0.02, o.chrome, x, y + 0.1, z); b.rotation.z = -0.35;
  }
  // poupe tronquée : doubles feux ronds, pare-chocs d'angle fins, sorties d'échappement, plaque
  { const xr = xAr;
    o.boite(0.04, 0.36, 1.6, noir, xr + 0.02, 1.0, 0);
    for (const s of [-1, 1]) {
      for (const z of [0.36, 0.7]) phareRond(k, xr - 0.0, 1.04, s * z, 0.11, lumRouge, -1);
      const p = o.boite(0.62, 0.06, 0.07, o.chrome, xr + 0.32, 0.8, s * 0.86); p.rotation.y = -s * 0.5;
      o.cyl(0.05, 0.05, 0.3, o.chrome, xr + 0.12, 0.4, s * 0.42, 0, Math.PI / 2, 14);
    }
    k.plaque(xr - 0.02, 0.72, -1, '#eef0f4');
  }
  retrosPorte(k, 0.3, 1.52, 1.18, o.chrome);
  // flancs : bas de caisse chromé (jonc de rocker), joint de portière, poignée chromée
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.32, 1.42, (g, w, h, c, M) => {
    g.fillStyle = '#c9ced6'; g.fillRect(M.X(-1.4), M.Y(0.5), M.S(2.75), M.Sy(0.07));
    g.fillStyle = '#0a1310'; g.fillRect(0, M.Y(0.42), w, h);
    g.strokeStyle = '#0a1310'; g.lineWidth = 3;
    for (const x of [0.36, -1.42]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.38)); g.lineTo(M.X(x - 0.02), M.Y(0.56)); g.stroke(); }
    g.fillStyle = '#d7dbe2'; g.fillRect(M.X(-1.3), M.Y(1.3), M.S(0.2), 6);
    M.trouer(g);
  }, roues, { ch: 192, jeu: 0.07 });
  return { L: 7.34, largeur: 2.92, hauteur: 2.09, xAvant: xAv + 0.02, xArriere: xAr - 0.02, roues, jante: rd.jante, rayons: rd.rayons, flanc: rd.flanc, plafond: +(1265 / 1770).toFixed(3) };
}

/* ================================================================== N11 — « Riveted » (casting imaginaire de muscle-car dragster)
 * Proportions mesurées sur les photos du jouet : L/largeur ≈ 2,4 ; empattement ≈ 0,6 L ; long capot, habitacle reculé et bas,
 * fastback qui file jusqu'à un grand aileron en table ; pavillon / largeur hors tout ≈ 0,68 (vue de face), roues AR plus grosses.
 * Signatures : gros V8 chromé À NU qui jaillit au milieu du capot (cache-culbuteurs, collecteurs, filtres à air), pare-brise
 * court jaune teinté, persiennes à 5 lames sur la lunette, aileron en table sur deux montants avec joues, rivets apparents en
 * demi-sphères chromées le long des ailes et des panneaux. Bleu métallisé verni, bandes rouge et jaune, grande « cape » rouge
 * stylisée sur le flanc (aucun écusson, aucune lettre). Jantes chromées 5 branches. */
function riveted(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const bleu = laque(ctx, '#1f5fd6', 0.28, 0.4, 0.32), noir = o.mat('#0b0c10', 0.6, 0.25), noirMat = o.mat('#0c0d10', 0.85, 0.08);
  const jaune = vitrage(ctx, '#e8c93a', 0.4), alu = o.mat('#b9bec8', 0.3, 0.85);
  const rd = { jante: '#dfe3ea', rayons: 'cinq', flanc: null };
  const xAv = 3.6, xAr = -3.6, eAv = 2.12, eAr = -2.14;
  const roues = [essieu(eAv, 0.54, 0.44, 1.18, true, rd), essieu(eAr, 0.66, 0.62, 1.2, false, rd)];
  // caisse : capot long et plat, hanches arrière gonflées sur les gros pneus, nez en flèche légèrement rentrant
  const wB = (x) => 1.33 + 0.07 * plateau(x, eAv, 0.45, 0.4) + 0.17 * plateau(x, eAr, 0.55, 0.5) - 0.1 * rampe(x, 3.1, xAv) - 0.06 * rampe(-x, 3.2, -xAr);
  const B = caisseFn(xAr, xAv, {
    w: wB,
    y0: table([[xAr, 0.5], [xAr + 0.35, 0.34], [xAv - 0.45, 0.32], [xAv, 0.5]]),
    y1: table([[xAr, 1.42], [xAr + 0.14, 1.52], [eAr, 1.56], [-1.0, 1.46], [0.0, 1.43], [0.95, 1.43], [eAv, 1.34], [3.2, 1.26], [xAv, 1.12]]),
    nt: 5.5, nb: 4, wt: 0.93 }, 80, 0.1);
  k.loft(B, bleu, { arches: archesSerrees(roues), nx: 190, ns: 64 });
  puitsNoirs(k, roues, 1.5);
  // pavillon bas et reculé : pare-brise court, toit court, fastback long (lunette à persiennes)
  const S = serre(ctx, o, {
    pts: [[0.95, 1.42], [0.18, 1.96], [-0.08, 2.02], [-0.85, 2.02], [-1.12, 1.96], [-2.25, 1.72], [-3.2, 1.55]], yb: 1.42, wb: 1.14, wt: 0.9, plonge: 0.2, seuil: 0.3,
    taper: { x0: -1.0, x1: -3.2, f: 0.12 }, mat: bleu, verre: jaune, pb: [0, 0], mcPb: 0.12, mlPb: 0.06, lu: [4, 4], mcLu: 0.16, mlLu: 0.05 });
  vitreCadree(S, [[0.72, 1.52], [0.16, 1.9], [-0.95, 1.92], [-1.3, 1.52]], jaune, noirMat, 0.03);
  // persiennes : 5 lames bleues en travers de la lunette, inclinées selon la pente du fastback
  { const xa = -1.25, xb = -2.2, pente = Math.atan2(1.72 - 1.96, -2.25 + 1.12);
    for (let i = 0; i < 5; i++) {
      const x = xa + (xb - xa) * (i + 0.5) / 5, y = S.hautX(x) + 0.02, demi = S.hw(y, x) - 0.12;
      const l = o.boite(0.15, 0.025, 2 * demi, bleu, x, y, 0); l.rotation.z = pente + 0.3;
    } }
  // aileron en table : plan large sur deux montants, joues qui redescendent sur les ailes arrière
  { const xw = -3.3, yw = 2.12;
    k.plan(xw, yw, 0.62, 2.62, 0.09, bleu, 0.05);
    for (const s of [-1, 1]) {
      k.lame([[xw - 0.2, 1.46], [xw + 0.02, 1.46], [xw + 0.06, yw], [xw - 0.14, yw]], 0.07, bleu, s * 0.62, 0.015);   // montants
      k.lame([[xw - 0.34, 1.42], [xw + 0.3, 1.44], [xw + 0.26, yw + 0.02], [xw - 0.36, yw + 0.1]], 0.05, bleu, s * 1.2, 0.012);   // joues
    } }
  // V8 chromé à nu qui jaillit du capot : bloc, cache-culbuteurs en V, pipe d'admission, deux filtres, collecteurs
  { const xe = 2.6, yh = k.hautAu(B, xe, 0);
    o.boite(0.9, 0.2, 0.86, noirMat, xe, yh - 0.04, 0);                                                      // trappe sombre dans le capot
    o.boite(0.8, 0.3, 0.5, alu, xe, yh + 0.12, 0);                                                           // bloc
    for (const s of [-1, 1]) {
      const cc = o.boite(0.82, 0.12, 0.2, o.chrome, xe, yh + 0.3, s * 0.3); cc.rotation.x = s * 0.5;          // cache-culbuteurs
      for (let i = 0; i < 4; i++) {                                                                          // collecteurs (tubes vers les ailes)
        const x = xe - 0.3 + i * 0.2; k.tige([x, yh + 0.2, s * 0.36], [x - 0.04, yh + 0.02, s * 0.62], 0.035, o.chrome, 8);
        k.tige([x - 0.04, yh + 0.02, s * 0.62], [x - 0.14, yh - 0.1, s * 0.74], 0.035, o.chrome, 8);
      }
    }
    o.boite(0.7, 0.14, 0.34, o.chrome, xe, yh + 0.38, 0);                                                    // pipe d'admission
    for (const dx of [-0.2, 0.2]) {                                                                          // carburateurs + filtres à air ronds
      o.cyl(0.08, 0.08, 0.1, alu, xe + dx, yh + 0.5, 0);
      o.cyl(0.19, 0.19, 0.1, o.chrome, xe + dx, yh + 0.6, 0, 0, 0, 28);
      o.cyl(0.07, 0.07, 0.05, o.chrome, xe + dx, yh + 0.67, 0);
    }
    for (let i = 0; i < 6; i++) o.boite(0.02, 0.03, 0.3, alu, xe - 0.25 + i * 0.1, yh + 0.46, 0);               // ailettes de la pipe
  }
  // rivets apparents : rangées de demi-sphères chromées le long de la ceinture, autour des arches, en bordure de capot
  { const rv = (x, y, s, r = 0.032) => k.ellipsoide(r * 0.6, r, r, o.chrome, x, y, s * (k.flancAu(B, x, y) + 0.008), 8).rotation.set(0, Math.PI / 2, 0);
    for (const s of [-1, 1]) {
      for (let x = -3.35; x <= 3.35; x += 0.26) { const y = k.sta(B, x).y1 - 0.2; if (roues.every((r) => Math.hypot(x - r.x, y - r.RW) > r.RW + 0.12)) rv(x, y, s); }
      for (const r of roues) for (let i = 0; i <= 8; i++) { const a = 0.2 + (Math.PI - 0.4) * i / 8, rr = r.RW + 0.14; rv(r.x + Math.cos(a) * rr, r.RW + Math.sin(a) * rr, s, 0.028); }
      for (let x = 1.0; x <= 3.3; x += 0.22) { const z = s * 1.02, y = k.hautAu(B, x, z); k.ellipsoide(0.026, 0.014, 0.026, o.chrome, x, y + 0.004, z, 8); }
    } }
  // face avant : calandre maillée chromée, phares ronds en creux, pare-chocs chromé pleine largeur
  { const xf = xAv;
    o.boite(0.06, 0.28, 1.1, noirMat, xf - 0.0, 0.88, 0);
    for (let i = 0; i < 4; i++) o.boite(0.03, 0.02, 1.04, o.chrome, xf + 0.02, 0.78 + i * 0.065, 0);
    for (const s of [-1, 1]) { o.boite(0.08, 0.3, 0.34, noirMat, xf - 0.08, 0.9, s * 0.84); phareRond(k, xf - 0.04, 0.9, s * 0.84, 0.11, lumBlanche, 1); }
    o.boite(0.16, 0.1, 2.4, o.chrome, xf + 0.0, 0.58, 0); for (const s of [-1, 1]) { const b = o.boite(0.4, 0.1, 0.08, o.chrome, xf - 0.18, 0.58, s * 1.18); b.rotation.y = s * 0.4; }
  }
  // poupe : bandeau de feux rouges, pare-chocs chromé, sorties latérales
  { const xr = xAr;
    o.boite(0.05, 0.2, 2.2, noir, xr - 0.0, 1.22, 0); for (const s of [-1, 1]) o.boite(0.05, 0.14, 0.82, lumRouge, xr - 0.02, 1.22, s * 0.56);
    o.boite(0.14, 0.1, 2.5, o.chrome, xr + 0.02, 0.6, 0);
    for (const s of [-1, 1]) o.cyl(0.07, 0.07, 0.26, o.chrome, xr + 0.08, 0.4, s * 0.8, 0, Math.PI / 2, 16);
  }
  retrosPorte(k, 0.72, 1.55, 1.3, o.chrome);
  // dessus : bandes rouge et jaune sur le toit et le pont, de part et d'autre de la trappe moteur
  k.drapeDessus(B, -3.55, 3.55, -1.2, 1.2, (g, w, h) => {
    const X = (x) => (x + 3.55) / 7.1 * w, Z = (z) => (z + 1.2) / 2.4 * h;
    for (const s of [-1, 1]) { g.fillStyle = '#d6232a'; g.fillRect(X(1.0), Z(s * 0.66 - 0.05), X(3.5) - X(1.0), Z(0.1) - Z(0)); g.fillStyle = '#f5c518'; g.fillRect(X(1.0), Z(s * 0.79 - 0.025), X(3.5) - X(1.0), Z(0.05) - Z(0)); }
  }, 1600, 400);
  // flancs : bandes rouge et jaune pleine longueur, grande cape rouge stylisée qui part du montant de pare-brise vers l'arrière
  drape(k, B, xAr + 0.04, xAv - 0.04, 0.32, 1.56, (g, w, h, c, M) => {
    g.fillStyle = '#d6232a'; g.fillRect(0, M.Y(0.86), w, M.Sy(0.07));
    g.fillStyle = '#f5c518'; g.fillRect(0, M.Y(0.76), w, M.Sy(0.04));
    // cape : épaule au pied du montant, pan qui s'élargit vers l'arrière et se termine en ondulations
    g.fillStyle = '#d6232a'; g.beginPath();
    g.moveTo(M.X(0.85), M.Y(1.36));
    g.bezierCurveTo(M.X(0.3), M.Y(1.42), M.X(-0.9), M.Y(1.4), M.X(-2.2), M.Y(1.3));
    g.bezierCurveTo(M.X(-2.45), M.Y(1.18), M.X(-2.3), M.Y(1.12), M.X(-2.5), M.Y(1.0));
    g.bezierCurveTo(M.X(-2.2), M.Y(1.0), M.X(-2.0), M.Y(1.08), M.X(-1.85), M.Y(0.98));
    g.bezierCurveTo(M.X(-1.6), M.Y(0.94), M.X(-1.4), M.Y(1.04), M.X(-1.2), M.Y(0.97));
    g.bezierCurveTo(M.X(-0.9), M.Y(0.92), M.X(-0.6), M.Y(1.02), M.X(-0.35), M.Y(1.0));
    g.bezierCurveTo(M.X(0.1), M.Y(1.08), M.X(0.5), M.Y(1.2), M.X(0.85), M.Y(1.36));
    g.closePath(); g.fill();
    g.strokeStyle = '#f5c518'; g.lineWidth = 4; g.stroke();
    g.strokeStyle = '#9e1419'; g.lineWidth = 3;                                                                // plis de la cape
    for (const [xa, xb, yb] of [[0.2, -1.0, 1.05], [-0.4, -1.7, 1.06], [-1.0, -2.2, 1.12]]) { g.beginPath(); g.moveTo(M.X(xa), M.Y(1.3)); g.quadraticCurveTo(M.X((xa + xb) / 2), M.Y(1.24), M.X(xb), M.Y(yb)); g.stroke(); }
    g.strokeStyle = '#0d2a66'; g.lineWidth = 3;                                                                // joint de portière
    for (const x of [0.75, -1.35]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.42)); g.lineTo(M.X(x - 0.03), M.Y(0.5)); g.stroke(); }
    g.fillStyle = '#0d1530'; g.fillRect(0, M.Y(0.46), w, h);
    M.trouer(g);
  }, roues, { cw: 2048, ch: 320 });
  return { L: 7.2, largeur: 3.06, hauteur: 2.05, xAvant: xAv + 0.08, xArriere: xAr - 0.05, roues, jante: rd.jante, rayons: rd.rayons, flanc: null, plafond: 0.68 };
}

export const V8_C = { N03: wrxSti, N06: stingRay, N11: riveted };
