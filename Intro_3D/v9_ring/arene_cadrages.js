/* CADRAGES SUR MESURE du segment arène (V9.2 Ring) — une recette de caméra PAR écurie (fini la monotonie 3/4 arrière), smash cuts des
   écuries #11–#15, RUSH (ralenti d'action des 5 dernières), COURONNE + plongée dans le PORTAIL EXPRESS, ARRIVÉE qui jaillit du
   vortex. Toutes les heures viennent du plan (plan_v9.json v9.2, temps film = temps interne) ; tout est fonction PURE de t.

     #01  travelling latéral rasant au ras du tapis, légère contre-plongée
     #02  vue de dessus PURE (90°, style Micro Machines) qui tourne lentement ; la Twingo fait un tête-à-queue ridicule
     #03  3/4 avant dynamique (flare sur les phares : seg_arene)
     #04  grue glamour sous la boule à facettes dorée, puis travelling circulaire autour de la voiture
     #05  contre-plongée agressive au ras du pare-chocs avant qui tremble ; cabrage au départ du tunnel
     #06  travelling oblique de profil au téléobjectif, façon télémétrie F1
     #07  plan d'impact plongeant : la caméra tombe avec la voiture et s'écrase avec elle à l'atterrissage
     #08  Dutch angle 8° au ras du pot d'échappement (gouttes et flaques d'huile : arene_juice)
     #09  contre-plongée dramatique depuis le tapis sur le piqué aérien
     #10  gros plan extrême rasant sur le train de 6 roues qui crachent des étincelles, dézoom en fin de plan
     #11–#15  SMASH CUTS : 4 coupes franches par voiture (sortie, saut, atterrissage, entrée dans la place), angles opposés ;
              les plans « de profil » ne servent qu'avant l'atterrissage (jamais de caméra dans une voiture garée)
     RUSH      74,2 → 79,2 : 1,0 s par voiture, plein cadre, en ACTION (ralenti d'action : la scène entière est rejouée à l'instant
               choisi de son entrée, donc sans aucune collision nouvelle) — face pure, 3/4 gauche posé « JoJo », plongée sirène,
               profil drift, contre-plongée royale
   creerCadrages(ctx) → { cameraEcurie(k, t), cameraArrivee(t), cameraCouronne(t), rush(t) → { i, k, tA, cam } | null,
                          coupes (instants des coupes franches + flash), impulsions (trauma) } */
import { clamp, lerp, smoother, hermite, DEG } from './arene_outils.js';

export function creerCadrages({ P, G, entrees, lisse, poseVoiture, voitures }) {
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const mix = (a, b, u) => a.map((x, i) => lerp(x, b[i], u));
  const melange = (A, B, u) => ({ p: mix(A.p, B.p, u), c: mix(A.c, B.c, u), fov: lerp(A.fov, B.fov, u), roll: lerp(A.roll || 0, B.roll || 0, u) });
  /** Repère de la voiture k à t : position lissée, avant f, gauche s, axe d'entrée W(u, l, y). */
  function rep(k, t, win = 0.15) {
    const L = lisse(k, t, win); if (!L) return null;
    const E = entrees.entrees[k], f = L.f, s = [f[2], 0, -f[0]];
    const u = L.p[0] * E.ax + L.p[2] * E.az;
    const W = (uu, l, y) => [E.ax * uu - E.az * l, G.MAT + y, E.az * uu + E.ax * l];
    return { p: L.p, f, s, u, W, E, h: L.p[1] - G.MAT, d: voitures[k].d };
  }

  /* ═════════════ recettes #01 → #10 ═════════════ */
  const R = [];
  R[0] = (k, t, sl) => {            // #01 travelling latéral rasant
    const r = rep(k, t, 0.25), dir = [-r.E.ax, 0, -r.E.az], l = -r.p[0] * r.E.az + r.p[2] * r.E.ax;   // l : écart latéral de la voiture à l'axe
    return { p: r.W(r.u - 3, l - 27, 1.5 + r.h * 0.55), c: add(add(r.p, [0, 2.4, 0]), dir, 4), fov: 40 };
  };
  R[1] = (k, t, sl) => {            // #02 vue de dessus pure qui tourne
    const r = rep(k, t, 0.22), th = 0.42 * (t - sl.sortie) + 0.6, H = 29 + 0.6 * r.h;
    return { p: [r.p[0] + Math.cos(th) * 0.5, r.p[1] + H, r.p[2] + Math.sin(th) * 0.5], c: r.p, fov: 38 };
  };
  R[2] = (k, t, sl) => {            // #03 3/4 avant dynamique
    const r = rep(k, t, 0.12);
    return { p: add(add(add(r.p, r.f, 24), r.s, 11), [0, 6, 0]), c: add(add(r.p, [0, 2.2, 0]), r.f, -2), fov: 42 };
  };
  R[3] = (k, t, sl) => {            // #04 grue glamour sous la boule, puis travelling circulaire
    const r = rep(k, t, 0.2);
    const boule = [0, 145, 0], dir = [r.E.ax, 0, r.E.az];
    const A = { p: add(add(add(r.p, r.f, 21), r.s, -13), [0, 4.5, 0]), c: add(r.p, [0, 2.4, 0]), fov: 44 };             // 3/4 avant glamour pendant l'approche
    const tO = t - sl.atterrissage, a = Math.atan2(r.p[2], r.p[0]) + 0.35 + 1.05 * tO;
    // travelling circulaire : la caméra tourne autour de la voiture, côté extérieur, et lève les yeux vers la boule dorée
    const B = { p: [r.p[0] + Math.cos(a) * 32, G.MAT + 4 + 1.5 * Math.sin(tO * 1.3), r.p[2] + Math.sin(a) * 32], c: mix(add(r.p, [0, 3, 0]), boule, 0.045), fov: 52 };
    void dir;
    return melange(A, B, smoother((t - sl.atterrissage + 0.35) / 0.6));
  };
  R[4] = (k, t, sl) => {            // #05 contre-plongée au ras du pare-chocs avant
    const r = rep(k, t, 0.08), av = r.d.L / 2;
    const tremble = 0.12 * Math.sin(t * 53) + 0.08 * Math.sin(t * 87);
    return { p: add(add(r.p, r.f, av + 7.5), [0, 0.9 + tremble, 0]), c: add(add(r.p, r.f, av * 0.6), [0, 3.4, 0]), fov: 52 };
  };
  R[5] = (k, t, sl) => {            // #06 travelling oblique de profil (téléobjectif)
    const r = rep(k, t, 0.2);
    return { p: r.W(r.u + 14, 46, 8 + r.h * 0.7), c: add(r.p, [0, 2, 0]), fov: 27 };
  };
  R[6] = (k, t, sl) => {            // #07 plan d'impact plongeant
    const r = rep(k, t, t >= sl.saut - 0.1 && t < sl.atterrissage + 0.3 ? 0.04 : 0.15);
    const u = clamp((t - sl.saut) / (sl.atterrissage - sl.saut)), apres = smoother((t - sl.atterrissage) / 0.6);
    const recul = lerp(lerp(26, 20, u), 21, apres), haut = lerp(lerp(18, 6.5, u * u), 6, apres);
    return { p: add(add(r.p, r.f, -recul), [0, haut, 0]), c: add(add(r.p, r.f, lerp(6, 9, u)), [0, 1.6, 0]), fov: lerp(46, 52, u) };
  };
  R[7] = (k, t, sl) => {            // #08 Dutch angle 8° au ras du pot d'échappement
    const r = rep(k, t, 0.12), ar = r.d.L / 2;
    return { p: add(add(add(r.p, r.f, -(ar + 6)), r.s, 2.5), [0, 1.3, 0]), c: add(add(r.p, r.f, 4), [0, 1.6, 0]), fov: 46, roll: 8 * DEG };
  };
  R[8] = (k, t, sl) => {            // #09 contre-plongée sur le piqué aérien
    const r = rep(k, t, 0.12);
    const A = { p: add(add(add(r.p, r.f, -16), r.s, 5), [0, 6, 0]), c: add(r.p, r.f, 4), fov: 44 };
    const B = { p: r.W(G.RLAND - 24, 7, 1.2), c: add(r.p, [0, 2, 0]), fov: 54 };
    return t < sl.saut - 0.25 ? A : B;
  };
  R[9] = (k, t, sl) => {            // #10 gros plan extrême rasant sur les 6 roues, dézoom final
    const r = rep(k, t, 0.1), L = r.d.L;
    const A = { p: add(add(add(r.p, r.s, 9.5), r.f, -L * 0.6), [0, 0.9, 0]), c: add(add(add(r.p, r.f, L * 0.45), r.s, 2.5), [0, 1.3, 0]), fov: 46 };
    const B = { p: add(add(add(r.p, r.s, 34), r.f, -26), [0, 15, 0]), c: add(r.p, [0, 2.5, 0]), fov: 44 };
    return melange(A, B, smoother((t - sl.place + 0.15) / Math.max(0.4, sl.fin - sl.place + 0.15)));
  };

  /* ═════════════ smash cuts #11 → #15 ═════════════ */
  const PLANS = {
    faceBas: (r) => ({ p: add(add(r.p, r.f, 16), [0, 2, 0]), c: add(r.p, [0, 2.2, 0]), fov: 44 }),
    plongee: (r) => ({ p: add(add(add(r.p, [0, 52, 0]), r.s, 7), r.f, -6), c: r.p, fov: 40 }),
    arriereDutch: (r) => ({ p: add(add(add(r.p, r.f, -15), r.s, -4), [0, 2.4, 0]), c: add(r.p, r.f, 6), fov: 46, roll: -12 * DEG }),
    profilG: (r) => ({ p: add(add(r.p, r.s, 25), [0, 3, 0]), c: add(r.p, [0, 2, 0]), fov: 38 }),
    profilD: (r) => ({ p: add(add(r.p, r.s, -25), [0, 3, 0]), c: add(r.p, [0, 2, 0]), fov: 38 }),
    contre: (r) => ({ p: add(add(add(r.p, r.f, 11), r.s, -5), [0, 0.8, 0]), c: add(r.p, [0, 5, 0]), fov: 54 }),
    aerien: (r) => ({ p: add(add(r.p, r.f, -32), [0, 30, 0]), c: add(r.p, r.f, 10), fov: 44 }),
  };
  const SMASH = { 10: ['faceBas', 'plongee', 'arriereDutch', 'contre'], 11: ['plongee', 'contre', 'profilD', 'arriereDutch'],
    12: ['arriereDutch', 'faceBas', 'aerien', 'contre'], 13: ['profilD', 'plongee', 'faceBas', 'arriereDutch'], 14: ['contre', 'aerien', 'profilG', 'plongee'] };
  const coupesDe = (sl) => [sl.sortie, sl.saut - 0.12, sl.atterrissage + 0.02, sl.place - 0.38];
  function cameraSmash(k, t, sl) {
    const c = coupesDe(sl); let i = 0; while (i < 3 && t >= c[i + 1]) i++;
    return PLANS[SMASH[k][i]](rep(k, t, 0.1));
  }

  function cameraEcurie(k, t) {
    const sl = P.ecuries[k];
    return sl.smash ? cameraSmash(k, t, sl) : R[k](k, t, sl);
  }

  /* ═════════════ RUSH : ralenti d'action, 1,0 s par voiture ═════════════ */
  const RU = P.rush;
  const RUSH_DEF = [
    { cle: (sl) => sl.sortie + 0.25, plan: (r) => ({ p: add(add(r.p, r.f, 21), [0, 2.6, 0]), c: add(r.p, [0, 2.6, 0]), fov: 40 }) },                         // face pure
    { cle: (sl) => sl.place + 0.05, plan: (r, a) => ({ p: add(add(add(r.p, r.f, lerp(17, 13, a)), r.s, lerp(12, 9, a)), [0, 2.2, 0]), c: add(r.p, [0, 2.7, 0]), fov: 40, roll: 18 * DEG }) },   // 3/4 gauche posé « JoJo »
    { cle: (sl) => sl.saut - 0.2, plan: (r) => ({ p: add(add(r.p, [0, 38, 0]), r.f, 10), c: r.p, fov: 44 }) },                                                  // plongée sirène
    { cle: (sl) => sl.atterrissage + 0.05, plan: (r) => { const n = Math.hypot(r.p[0], r.p[2]) || 1; return { p: [r.p[0] + r.p[0] / n * 22, r.p[1] + 2.6, r.p[2] + r.p[2] / n * 22], c: add(r.p, [0, 2, 0]), fov: 36 }; } },   // profil drift
    { cle: (sl) => sl.saut + 0.22, plan: (r) => ({ p: r.W(G.RLAND - 17, 6, 1.2), c: add(r.p, [0, 2.5, 0]), fov: 54 }) },                                                // contre-plongée royale
  ];
  function rush(t) {
    if (!RU || t < RU.debut || t >= RU.fin) return null;
    let i = 0; while (i < RU.cuts.length - 1 && t >= RU.cuts[i + 1]) i++;
    const k = RU.ordre[i] - 1, sl = P.ecuries[k], a = t - RU.cuts[i], tA = RUSH_DEF[i].cle(sl) + a;
    return { i, k, tA, cam: RUSH_DEF[i].plan(rep(k, tA, 0.1), a) };
  }

  /* ═════════════ COURONNE + plongée dans le portail ═════════════ */
  const CO = P.couronne;
  const CO_CLES = [{ t: CO.debut, p: [78, G.MAT + 178, 140], c: [0, G.MAT, 4], fov: 46 }, { t: CO.portail, p: [40, G.MAT + 124, 74], c: [0, G.MAT, 2], fov: 48 }];
  function cameraCouronne(t) {
    if (t < CO.portail) return { p: hermite(CO_CLES, t, 'p'), c: hermite(CO_CLES, t, 'c'), fov: hermite(CO_CLES, t, 'fov') };
    const u = Math.pow(clamp((t - CO.portail) / (CO.fin - CO.portail)), 1.9);                      // accélère dans le portail
    return { p: mix(CO_CLES[1].p, [0.35, G.MAT + 3.2, 0.25], u), c: [0, G.MAT, 0], fov: lerp(48, 62, u) };
  }

  /* ═════════════ ARRIVÉE : jaillit du vortex au DROP ═════════════ */
  const AR = P.arrivee;
  const AR_CLES = [
    { t: AR.debut - 0.3, p: [0, 1240, 2], c: [0, G.MAT, 0], fov: 72 },                     // clé d'élan (avant le segment) : la caméra arrive lancée
    { t: AR.debut, p: [0, 960, 3], c: [0, G.MAT, 0], fov: 72 },
    { t: AR.debut + 0.75, p: [120, 430, 170], c: [0, G.MAT, 0], fov: 58 },
    { t: AR.debut + 1.9, p: [190, 150, 230], c: [40, G.MAT + 20, 0], fov: 48 },
    { t: AR.debut + 3.15, p: [330, 62, 112], c: [262, G.MAT + 18, 0], fov: 46 },
    { t: AR.fin, p: [302, G.MAT + 7, -44], c: [272, G.MAT + 4, 0], fov: 44 },
  ];
  const cameraArrivee = (t) => ({ p: hermite(AR_CLES, t, 'p'), c: hermite(AR_CLES, t, 'c'), fov: hermite(AR_CLES, t, 'fov') });

  /* ═════════════ coupes franches (flash 2 images) et impulsions de trauma ═════════════ */
  const coupes = [];
  P.ecuries.forEach((sl, k) => { if (sl.smash) coupesDe(sl).forEach((tc, j) => coupes.push({ t: tc, k, j })); });
  if (RU) RU.cuts.forEach((tc, i) => coupes.push({ t: tc, k: RU.ordre[i] - 1, j: i, rush: true }));
  const VIOLENT = new Set([4, 6, 9]);
  const impulsions = [{ t: AR.drop, a: 1.25, d: 0.32 }];
  P.ecuries.forEach((sl, k) => {
    impulsions.push({ t: sl.debut + 0.1, a: 0.22, d: 0.16 });                                       // apparition du bandeau
    impulsions.push({ t: sl.atterrissage, a: VIOLENT.has(k) ? 1.3 : 0.45, d: VIOLENT.has(k) ? 0.3 : 0.2 });
  });
  for (const c of coupes) impulsions.push({ t: c.t, a: 0.55, d: 0.15 });
  if (CO) impulsions.push({ t: CO.portail, a: 0.4, d: 0.25 });

  return { cameraEcurie, cameraArrivee, cameraCouronne, rush, coupes, impulsions, coupesDe };
}
