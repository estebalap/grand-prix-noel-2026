/* TRAJECTOIRES du segment « arène » (V9 Ring) — fonctions PURES du temps (aucun état, aucune intégration pas à pas).

   ENTRÉE d'une écurie (créneau plan.ecuries[k] = { debut, sortie, saut, atterrissage, place, fin }) :
     sortie → saut       la voiture sort du tunnel de son côté (k mod 4) et court sur la passerelle LED, vitesse v0 → v1 (profil
                         smoothstep), puis gravit le TREMPLIN parabolique (assiette = plan des deux essieux : aucune caisse dans la rampe) ;
     saut → atterrissage vol balistique : parabole qui part de la lèvre avec la pente de la rampe, culmine AU-DESSUS de la corde du haut
                         et retombe en RLAND pile à l'instant « atterrissage » ; tangage qui suit la trajectoire (amorti, remis à plat
                         avant le contact) ;
     atterrissage → place DÉRAPAGE contrôlé : trajet polaire qui reste à l'extérieur de la couronne des voitures garées (r ≥ R1), le cap
                         tourne de façon monotone pendant que la vitesse balaie l'anneau (cap ≠ direction de vitesse), puis entrée
                         RADIALE dans la place, nez vers le centre, arrêt (vitesse et accélération nulles) à l'instant « place » ;
     ensuite             garée, immobile.
   Suspension : réponses impulsionnelles analytiques (atterrissage : compression + rebond amorti ; départ : cabrage ; arrêt : plongée).
   Roues : distance parcourue absolue (poser : ω = v / R), braquage = contre-braquage de la dérive.
   V9.2 — styles[k] (cadrages sur mesure) : { spin } tête-à-queue supplémentaire (rad) pendant la partie polaire du dérapage (la caisse
   reste à r ≥ R1, hors de la couronne garée) ; { wheelie } cabrage au départ du tunnel (rad) : pivot sur l'essieu arrière (y relevé de
   ez·sin θ, aucun coin sous la passerelle), sur le plat de la passerelle uniquement.

   DÉPART (plan.depart) : marche arrière radiale de la couronne (r 50 → 74) en pivotant vers la tangente, puis FILE INDIENNE : toutes les
   voitures suivent la MÊME courbe (cercle r = 74 puis sortie tangente vers le pont et la piste arc-en-ciel) avec la même loi d'abscisse
   S(t) : leurs écarts le long de la courbe sont constants (31 cm), elles ne peuvent pas se toucher ; sur la piste elles s'écartent en
   éventail sur les 5 voies. */
import { clamp, lerp, smoother, doux, ressort, angleDiff, DEG } from './arene_outils.js';
import { G, hauteurRampe, penteRampe } from './arene_decor.js';

const T_COURSE = 1.5;                         // sortie → saut (plan)
export const V_SAUT = 94.1;                    // vitesse horizontale au saut (cm/s) : RLIP − RLAND = 75,3 cm en 0,8 s
const R1 = 66;                                 // rayon de l'anneau de dérapage (bord intérieur de la caisse > couronne garée)
export const R_CARROUSEL = 74;

const axe = (s) => [Math.cos(s * Math.PI / 2), Math.sin(s * Math.PI / 2)];
export const capVers = (dx, dz) => Math.atan2(dx, dz);              // cap d'une voiture dont l'avant (+z local) pointe vers (dx, dz)

/** Attribution des places : couronne de 15 places (12° + 24°·j) ; chaque voiture prend la place libre dont l'écart angulaire à son
    point d'atterrissage est le plus proche de 30° (dérapage visible mais trajet court). */
export function attribuerPlaces(n = 15) {
  const libres = Array.from({ length: n }, (_, j) => (12 + 24 * j) * DEG), res = [];
  for (let k = 0; k < n; k++) {
    const a = (k % 4) * 90 * DEG;
    let best = -1, cout = Infinity;
    for (let j = 0; j < libres.length; j++) {
      const d = Math.abs(angleDiff(a, libres[j])), c = Math.abs(d - 30 * DEG) + (d < 14 * DEG ? 1 : 0);
      if (c < cout) { cout = c; best = j; }
    }
    res.push(libres.splice(best, 1)[0]);
  }
  return res;
}

/**
 * Prépare les trajectoires d'entrée.
 * @param slots plan.ecuries ; @param dims [{ L, ez, ex }] par voiture (longueur, demi-empattement, demi-voie)
 */
export function creerEntrees(slots, dims, styles = []) {
  const places = attribuerPlaces(slots.length);
  const entrees = slots.map((sl, k) => {
    const s = k % 4, [ax, az] = axe(s), alpha = s * 90 * DEG, phi = places[k], d = dims[k];
    const tC = sl.saut - sl.sortie, tV = sl.atterrissage - sl.saut, tD = sl.place - sl.atterrissage;
    const v1 = (G.RLIP - G.RLAND) / tV, v0 = 80;          // v0 fixé (80 cm/s) : élan au sortir du tunnel
    const dCourse = v0 * tC + (v1 - v0) * tC / 2, r0 = G.RLIP + dCourse;
    const distCourse = (tau) => { const u = clamp(tau / tC); return v0 * tC * u + (v1 - v0) * tC * (u * u * u - u * u * u * u / 2); };
    const vitCourse = (tau) => { const u = clamp(tau / tC); return v0 + (v1 - v0) * u * u * (3 - 2 * u); };
    // assiette sur la rampe : plan des deux essieux (avant = côté centre) ; au-delà de la lèvre, prolongement de la tangente
    const hContact = (r) => (r < G.RLIP ? G.HRAMPE + penteRampe(G.RLIP) * (G.RLIP - r) : hauteurRampe(r));
    const eA = 0.45 * d.L;                                                  // appuis aux extrémités : aucune caisse (ni remorque) sous la rampe
    const assiette = (r) => { const zF = hContact(r - eA), zR = hContact(r + eA); return { z: (zF + zR) / 2, a: Math.atan2(zF - zR, 2 * eA) }; };
    const z0 = assiette(G.RLIP).z, s0 = (assiette(G.RLIP - 0.05).z - assiette(G.RLIP + 0.05).z) / 0.1;
    const R = G.RLIP - G.RLAND, b = (z0 + s0 * R) / (R * R);
    const zVol = (x) => z0 + s0 * x - b * x * x, pVol = (x) => s0 - 2 * b * x;

    /* trajet de dérapage (plan x-z) : polaire (r : RLAND → R1, θ : α → φ en smoothstep) puis radial R1 → RPARK */
    const dTheta = angleDiff(alpha, phi), N = 240;
    const pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N, th = alpha + dTheta * doux(u), r = lerp(G.RLAND, R1, u); pts.push([Math.cos(th) * r, Math.sin(th) * r]); }
    const nR = 60;
    for (let i = 1; i <= nR; i++) { const r = lerp(R1, G.RPARK, i / nR); pts.push([Math.cos(phi) * r, Math.sin(phi) * r]); }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const S = cum[cum.length - 1], sCourbe = cum[N];
    const ptA = (sv) => {
      sv = clamp(sv, 0, S); let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= sv) lo = m; else hi = m; }
      const f = (sv - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
      return [lerp(pts[lo][0], pts[hi][0], f), lerp(pts[lo][1], pts[hi][1], f)];
    };
    const kV = Math.min(3.9, v1 * tD / S), B = 12 - 4 * kV;
    const fS = (u) => { u = clamp(u); const a = 1 - u; return kV * (1 - a * a * a) / 3 + B * (u * u / 2 - 2 * u * u * u / 3 + u * u * u * u / 4); };
    const sDe = (tau) => S * fS(tau / tD);
    const capIn = (th) => capVers(-Math.cos(th), -Math.sin(th));
    const capA = capIn(alpha), capP = capIn(phi);
    /** position plane + direction de vitesse à l'abscisse sv */
    const dirA = (sv) => { const a = ptA(sv - 0.4), c = ptA(sv + 0.4); return capVers(c[0] - a[0], c[1] - a[1]); };
    const capDerape = (sv) => {
      const m = capA + angleDiff(capA, capP) * smoother(sv / Math.max(1, sCourbe));      // cap « monotone » : nez qui pivote vers sa place
      const v = sv < S - 0.5 ? dirA(sv) : capP;
      return m + 0.35 * angleDiff(m, v);
    };
    return { k, s, ax, az, alpha, phi, d, sl, tC, tV, tD, v0, v1, r0, distCourse, vitCourse, assiette, zVol, pVol, R, S, sCourbe, ptA, sDe, dirA, capDerape, capP, dCourse };
  });

  /** Pose de la voiture k au temps t (temps film) ; null si elle n'est pas encore sortie du tunnel. */
  function pose(k, t) {
    const E = entrees[k], sl = E.sl, d = E.d;
    if (t < sl.sortie - 0.05) return null;
    let x, y, z, cap, tang = 0, roul = 0, dist, braq = 0, phase;
    if (t < sl.saut) {
      const tau = Math.max(0, t - sl.sortie), r = E.r0 - E.distCourse(tau), as = E.assiette(r);
      x = E.ax * r; z = E.az * r; y = G.MAT + as.z; cap = capVers(-E.ax, -E.az); tang = -as.a; dist = E.distCourse(tau); phase = 'course';
      y += 0.035 * Math.sin(t * 41 + k) * (r > G.RPIED ? 1 : 0);
    } else if (t < sl.atterrissage) {
      const tf = t - sl.saut, xv = E.v1 * tf, r = G.RLIP - xv;
      x = E.ax * r; z = E.az * r; y = G.MAT + E.zVol(xv); cap = capVers(-E.ax, -E.az);
      const ang = Math.atan(E.pVol(xv)), u = tf / E.tV;
      const facteur = lerp(1, 0.5, smoother(u / 0.3)) * (1 - smoother((u - 0.6) / 0.35));
      tang = -ang * facteur + 0.05 * smoother((u - 0.75) / 0.25);
      dist = E.dCourse + xv; phase = 'vol';
    } else if (t < sl.place) {
      const tau = t - sl.atterrissage, sv = E.sDe(tau), p = E.ptA(sv);
      x = p[0]; z = p[1]; y = G.MAT; cap = E.capDerape(sv); dist = E.dCourse + E.R + sv; phase = 'derapage';
      const st = styles[k] || {};
      if (st.spin) cap += st.spin * smoother((sv / Math.max(1, E.sCourbe) - 0.04) / 0.86);      // tête-à-queue complet pendant la partie polaire
      const beta = angleDiff(E.dirA(sv), cap); braq = clamp(-0.85 * beta, -0.5, 0.5) * (1 - smoother((sv - E.S + 18) / 14));
      // roulis : accélération latérale (différences finies sur la trajectoire pure)
      const h = 0.03, pa = E.ptA(E.sDe(tau - h)), pb = E.ptA(E.sDe(tau + h));
      const vx = (pb[0] - pa[0]) / (2 * h), vz = (pb[1] - pa[1]) / (2 * h);
      const axx = (pb[0] - 2 * p[0] + pa[0]) / (h * h), azz = (pb[1] - 2 * p[1] + pa[1]) / (h * h);
      const vn = Math.hypot(vx, vz) || 1, aLat = (vx * azz - vz * axx) / vn;
      roul = clamp(-0.00022 * aLat, -0.07, 0.07) * (1 - smoother((tau - E.tD + 0.25) / 0.25));
    } else {
      const p = E.ptA(E.S); x = p[0]; z = p[1]; y = G.MAT; cap = E.capP; dist = E.dCourse + E.R + E.S; phase = 'garee';
    }
    // cabrage (wheelie) au départ du tunnel : nez levé, pivot sur l'essieu arrière
    const stw = (styles[k] || {}).wheelie || 0;
    let cabre = 0;
    if (stw && phase === 'course') {
      const tau = t - sl.sortie;
      cabre = stw * smoother(tau / 0.22) * (1 - smoother((tau - 0.55) / 0.4)) * (1 + 0.08 * Math.sin(tau * 26));
      tang -= cabre; y += d.ez * Math.sin(cabre) + 0.6 * Math.sin(cabre);         // pivot sur l'essieu arrière + 0,6·sin θ de garde : le pare-chocs arrière ne touche jamais la passerelle
    }
    // suspension analytique (impulsions)
    const heave = -0.3 * ressort(t - sl.atterrissage, 16, 0.42) + (phase === 'vol' ? 0.25 * smoother((t - sl.saut) / 0.2) * (1 - smoother((t - sl.atterrissage + 0.15) / 0.15)) : 0);
    const tS = 0.07 * ressort(t - sl.atterrissage - 0.02, 14, 0.4) - 0.035 * ressort(t - sl.sortie, 11, 0.5) + 0.045 * ressort(t - sl.place + 0.12, 13, 0.45);
    tang += tS;
    const coins = { av_g: heave - tS * d.ez + roul * d.ex, av_d: heave - tS * d.ez - roul * d.ex, ar_g: heave + tS * d.ez + roul * d.ex, ar_d: heave + tS * d.ez - roul * d.ex };
    return { pos: [x, y, z], cap, capVitesse: cap, heave: phase === 'vol' ? 0 : heave, tangage: tang, pente: 0, roulis: roul, dist, braquage: braq, coins, phase, cabre };
  }
  return { entrees, places, pose };
}

/* ═══════════════════════════════ DÉPART ═══════════════════════════════ */
/**
 * @param places angles des places ; @param D plan.depart ; @param piste { point(s) → [x, y, z], tangente(s), longueur } (axe central,
 *        abscisse 0 au bord du ring côté +x) ; @param dims dimensions des voitures
 */
export function creerDepart(places, D, piste, dims) {
  const N = places.length, R = R_CARROUSEL;
  const T0 = D.demarrage, T_RECUL = 0.8, T1 = T0 + T_RECUL;
  const PHI_E = -66 * DEG;                                             // sortie du carrousel (tangente quasi alignée sur le pont)
  // courbe de sortie : Bézier E → B (sur l'axe de la piste) puis axe de la piste
  const E = [R * Math.cos(PHI_E), R * Math.sin(PHI_E)], vE = [-Math.sin(PHI_E), Math.cos(PHI_E)];
  const sB = 105, B = piste.point(sB), tB = piste.tangente(sB);
  const P1 = [E[0] + vE[0] * 60, E[1] + vE[1] * 60], P2 = [B[0] - tB[0] * 70, B[2] - tB[2] * 70];
  const bez = (u) => { const a = 1 - u; return [a * a * a * E[0] + 3 * a * a * u * P1[0] + 3 * a * u * u * P2[0] + u * u * u * B[0], a * a * a * E[1] + 3 * a * a * u * P1[1] + 3 * a * u * u * P2[1] + u * u * u * B[2]]; };
  const tab = [], cum = [0];
  for (let i = 0; i <= 200; i++) { const p = bez(i / 200); tab.push([p[0], G.MAT, p[1]]); if (i) cum.push(cum[i - 1] + Math.hypot(p[0] - tab[i - 1][0], p[1] - tab[i - 1][2])); }
  const LB = cum[cum.length - 1];
  const pointBez = (sv) => {
    let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= sv) lo = m; else hi = m; }
    const f = (sv - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]); return [lerp(tab[lo][0], tab[hi][0], f), G.MAT, lerp(tab[lo][2], tab[hi][2], f)];
  };
  /** point de la file à l'abscisse s (s < 0 : sur le cercle avant la sortie) */
  const pointFile = (sv) => {
    if (sv < 0) { const a = PHI_E + sv / R; return [R * Math.cos(a), G.MAT, R * Math.sin(a)]; }
    if (sv < LB) return pointBez(sv);
    return piste.point(sB + sv - LB);
  };
  const avance = places.map((ph) => { let a = (PHI_E - ph) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a * R; });
  // ordre dans la file (rang 0 = la plus proche de la sortie) → voie de l'éventail
  const rang = avance.map((a) => avance.filter((b) => b < a).length);
  const VMAX = 175, TACC = 1.3;
  const S0 = (t) => { const u = t - T1; if (u <= 0) return 0; if (u < TACC) return VMAX * (u * u * u / (TACC * TACC) - u * u * u * u / (2 * TACC * TACC * TACC)); return VMAX * (TACC / 2 + (u - TACC)); };
  // V9.3 : tour de parade sous le logo final — la meute ralentit (VMAX → VLENT en TF s, vitesse continue) pour rester dans l'arène,
  // écarts le long de la courbe inchangés (aucune collision possible entre voitures de la file)
  const VLENT = 40, TFREIN = 1.0, T_FREIN = D.logo != null ? Math.max(T1 + TACC, D.logo - 0.6) : Infinity;
  const S = (t) => { if (t <= T_FREIN) return S0(t); const tau = t - T_FREIN, u = Math.min(1, tau / TFREIN);
    const base = S0(T_FREIN) + VLENT * tau + (VMAX - VLENT) * TFREIN * (1 - Math.pow(1 - u, 3)) / 3; return base; };
  const sEventail = LB + 180;
  function pose(k, t) {
    const ph = places[k], d = dims[k];
    if (t < T0) return null;
    if (t < T1) {
      const u = smoother((t - T0) / T_RECUL), r = lerp(G.RPARK, R, u);
      const capIn = capVers(-Math.cos(ph), -Math.sin(ph)), capT = capVers(-Math.sin(ph), Math.cos(ph));
      const w = smoother((r - 55) / (R - 55));
      const cap = capIn + angleDiff(capIn, capT) * w;
      const tS = -0.05 * ressort(t - T0, 12, 0.45);
      return { pos: [Math.cos(ph) * r, G.MAT, Math.sin(ph) * r], cap, capVitesse: cap, heave: 0, tangage: tS, pente: 0, roulis: 0, dist: -(r - G.RPARK), braquage: 0.35 * Math.sin(Math.PI * w), coins: { av_g: -tS * d.ez, av_d: -tS * d.ez, ar_g: tS * d.ez, ar_d: tS * d.ez }, phase: 'recul' };
    }
    const sv = S(t) - avance[k], p = pointFile(sv), pa = pointFile(sv - 0.6), pb = pointFile(sv + 0.6);
    // éventail : décalage latéral vers la voie (rang mod 5) une fois sur la piste
    const voie = (rang[k] % 5) - 2, ev = smoother((sv - sEventail) / 140);
    const tx = pb[0] - pa[0], tz = pb[2] - pa[2], n = Math.hypot(tx, tz) || 1, lx = -tz / n, lz = tx / n;
    const off = voie * 8 * ev;
    const pente = Math.atan2(pb[1] - pa[1], Math.hypot(tx, tz));
    const tS = -0.04 * ressort(t - T1, 11, 0.5);
    return { pos: [p[0] + lx * off, p[1], p[2] + lz * off], cap: capVers(tx, tz), capVitesse: capVers(tx, tz), heave: 0.03 * Math.sin(t * 37 + k), tangage: tS, pente, roulis: 0,
      dist: sv + 60, braquage: 0, coins: { av_g: -tS * d.ez, av_d: -tS * d.ez, ar_g: tS * d.ez, ar_d: tS * d.ez }, phase: 'file' };
  }
  return { pose, S, pointFile, avance, rang, T0, T1, LB, sB };
}
