/* CADRAGES SUR MESURE du segment arène (V9.3 Ring) — une recette de caméra PAR écurie, la voiture TOUJOURS ENTIÈRE dans l'image
   (contrôle automatique : seg_arene.visibiliteVedette, ≥ 85 % du créneau), coupes franches pour les 4 écuries « zoom » (plan :
   ecuries[k].zoom — A4 Oil Leaking #08, Optic-Breuillet #03, Twingo #02, Doom Slayer #10), RUSH de ces 4 écuries, COURONNE + plongée
   dans le PORTAIL EXPRESS, ARRIVÉE qui jaillit du vortex. Toutes les heures viennent du plan (plan_v9.json v9.3, temps film = temps
   interne) ; tout est fonction PURE de t.

     #01  travelling latéral rasant au ras du tapis, légère contre-plongée (suit aussi l'écart latéral pendant le dérapage)
     #02  zoom : 3/4 avant bas pendant l'élan → COUPE au saut → vue de dessus (Micro Machines) qui tourne lentement pendant le
          tête-à-queue
     #03  zoom : 3/4 avant dynamique (flare des phares) → COUPE à l'atterrissage → contre-plongée 3/4 de l'autre côté
     #04  3/4 avant glamour pendant l'approche, puis travelling circulaire sous la boule à facettes dorée
     #05  contre-plongée 3/4 avant au ras du tapis (le pare-chocs tremble), cabrage au départ du tunnel
     #06  travelling oblique de profil au téléobjectif, façon télémétrie F1 (suit l'écart latéral)
     #07  plan d'impact plongeant 3/4 arrière : la caméra tombe avec la voiture et s'écrase avec elle à l'atterrissage
     #08  zoom : Dutch angle 8° en 3/4 arrière bas (huile) → COUPE au saut → 3/4 avant bas : l'A4 et sa remorque plongent vers nous
     #09  poursuite 3/4 → contre-plongée mobile devant la voiture pendant le piqué, puis 3/4 avant pendant le dérapage
     #10  zoom : 3/4 arrière rasant sur le train de 6 roues qui crachent des étincelles → COUPE au dérapage → contre-plongée avant,
          dézoom final
     #11–#15  entrées « normales » variées et flatteuses : 3/4 avant bas, grue orbitale, profil intérieur, poursuite 3/4 classique,
              frontal depuis le centre du ring
     RUSH      ordre du plan (#08 → #03 → #02 → #10), 1,25 s chacune : ralenti d'action (la scène entière est rejouée à l'instant
               choisi de son entrée : aucune collision nouvelle), plein cadre, flash 2 images à chaque coupe
   creerCadrages(ctx) → { cameraEcurie(k, t), cameraArrivee(t), cameraCouronne(t), rush(t) → { i, k, tA, cam } | null,
                          coupes (instants des coupes franches + flash), impulsions (trauma), coupesDe(k) } */
import { clamp, lerp, smoother, hermite, DEG } from './arene_outils.js';

export function creerCadrages({ P, G, entrees, lisse, poseVoiture, voitures }) {
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const mix = (a, b, u) => a.map((x, i) => lerp(x, b[i], u));
  const melange = (A, B, u) => ({ p: mix(A.p, B.p, u), c: mix(A.c, B.c, u), fov: lerp(A.fov, B.fov, u), roll: lerp(A.roll || 0, B.roll || 0, u) });
  /** Repère de la voiture k à t : position lissée, avant f, gauche s, axe d'entrée W(u, l, y), écart latéral l. */
  function rep(k, t, win = 0.15) {
    const L = lisse(k, t, win); if (!L) return null;
    const E = entrees.entrees[k], f = L.f, s = [f[2], 0, -f[0]];
    const u = L.p[0] * E.ax + L.p[2] * E.az, l = -L.p[0] * E.az + L.p[2] * E.ax;
    const W = (uu, ll, y) => [E.ax * uu - E.az * ll, G.MAT + y, E.az * uu + E.ax * ll];
    return { p: L.p, f, s, u, l, W, E, h: L.p[1] - G.MAT, d: voitures[k].d };
  }
  /** Plan relatif à la voiture : avant (cm), gauche (cm), haut (cm) ; visée = centre de la caisse + leve. */
  const relatif = (r, av, ga, ht, { leve = 2.2, vise = 0, fov = 42, roll = 0 } = {}) =>
    ({ p: add(add(add(r.p, r.f, av), r.s, ga), [0, ht, 0]), c: add(add(r.p, [0, leve, 0]), r.f, vise), fov, roll });

  /* ═════════════ recettes ═════════════ */
  const R = [];
  R[0] = (k, t) => {                // #01 travelling latéral rasant
    const r = rep(k, t, 0.25), dir = [-r.E.ax, 0, -r.E.az];
    return { p: r.W(r.u - 3, r.l - 27, 1.5 + r.h * 0.55), c: add(add(r.p, [0, 2.4, 0]), dir, 3), fov: 40 };
  };
  R[1] = (k, t, sl) => {            // #02 zoom : 3/4 avant bas → vue de dessus pure qui tourne
    if (t < sl.saut) return relatif(rep(k, t, 0.15), 17, 9, 3.2, { fov: 42 });
    const r = rep(k, t, 0.22), th = 0.42 * (t - sl.sortie) + 0.6, H = 23 + 0.5 * r.h;
    return { p: [r.p[0] + Math.cos(th) * 0.5, r.p[1] + H, r.p[2] + Math.sin(th) * 0.5], c: r.p, fov: 40 };
  };
  R[2] = (k, t, sl) => {            // #03 zoom : 3/4 avant dynamique → contre-plongée 3/4 de l'autre côté
    if (t < sl.atterrissage) return relatif(rep(k, t, 0.12), 21, 10, 5.5, { vise: -1.5, fov: 42 });
    return relatif(rep(k, t, 0.15), 17, -11, 1.4, { leve: 2.6, fov: 44 });
  };
  R[3] = (k, t, sl) => {            // #04 3/4 avant glamour, puis travelling circulaire sous la boule
    const r = rep(k, t, 0.2), boule = [0, 145, 0];
    const A = relatif(r, 19, -12, 4.5, { leve: 2.4, fov: 44 });
    const tO = t - sl.atterrissage, a = Math.atan2(r.p[2], r.p[0]) + 0.35 + 1.05 * tO;
    const B = { p: [r.p[0] + Math.cos(a) * 27, G.MAT + 4.5 + 1.5 * Math.sin(tO * 1.3), r.p[2] + Math.sin(a) * 27], c: mix(add(r.p, [0, 2.6, 0]), boule, 0.03), fov: 48 };
    return melange(A, B, smoother((t - sl.atterrissage + 0.35) / 0.6));
  };
  R[4] = (k, t) => {                // #05 contre-plongée 3/4 avant au ras du tapis, pare-chocs qui tremble
    const r = rep(k, t, 0.08), av = r.d.L / 2;
    const tremble = 0.1 * Math.sin(t * 53) + 0.07 * Math.sin(t * 87);
    return relatif(r, av + 14, 7, 1.3 + tremble, { leve: 2.8, fov: 36 });
  };
  R[5] = (k, t) => {                // #06 travelling oblique de profil (téléobjectif)
    const r = rep(k, t, 0.2);
    return { p: r.W(r.u + 12, r.l + 44, 7 + r.h * 0.7), c: add(r.p, [0, 2, 0]), fov: 26 };
  };
  R[6] = (k, t, sl) => {            // #07 plan d'impact plongeant 3/4 arrière
    const r = rep(k, t, t >= sl.saut - 0.1 && t < sl.atterrissage + 0.3 ? 0.05 : 0.15);
    const u = clamp((t - sl.saut) / (sl.atterrissage - sl.saut)), apres = smoother((t - sl.atterrissage) / 0.6);
    const recul = lerp(lerp(21, 16, u), 17, apres), haut = lerp(lerp(14, 5.5, u * u), 6, apres);
    return relatif(r, -recul, 9, haut, { leve: 1.8, vise: lerp(3, 5, u), fov: 44 });
  };
  R[7] = (k, t, sl) => {            // #08 zoom : Dutch 8° 3/4 arrière bas → 3/4 avant bas (la remorque plonge vers nous)
    // V9.4 : entrée « normale » (plus de coupe) — 3/4 arrière Dutch qui glisse en douceur vers un 3/4 avant flatteur pendant le vol
    const L2 = voitures[k].d.L / 2, r = rep(k, t, 0.12);
    const A = relatif(r, -(L2 + 6), 12, 2.6, { leve: 1.8, vise: 2, fov: 44, roll: 8 * DEG });
    const B = relatif(r, L2 + 8, -13, 3.2, { leve: 2, fov: 46, roll: -3 * DEG });
    if (sl.zoom) return t < sl.saut ? A : B;
    // bascule latérale (hors de la caisse) : on passe par un profil haut pour ne jamais traverser la voiture
    const u = smoother((t - sl.saut + 0.2) / 0.9), M = relatif(r, 0, 26, 9, { leve: 2, fov: 46 });
    return u < 0.5 ? melange(A, M, u * 2) : melange(M, B, u * 2 - 1);
  };
  R[8] = (k, t, sl) => {            // #09 poursuite 3/4 → contre-plongée mobile pendant le piqué → 3/4 avant
    const r = rep(k, t, 0.12);
    if (t < sl.saut - 0.2) return relatif(r, -19, 8, 6, { vise: 4, fov: 44 });
    if (t < sl.atterrissage + 0.15) { const p = r.W(r.u - 26, r.l + 5, 1.3); return { p, c: add(r.p, [0, 2, 0]), fov: 46 }; }
    return relatif(r, 18, 10, 3.2, { fov: 44 });
  };
  R[9] = (k, t, sl) => {            // #10 zoom : 3/4 arrière rasant sur les 6 roues → contre-plongée avant, dézoom final
    const r = rep(k, t, 0.1);
    if (t < sl.atterrissage + 0.3) return relatif(r, -14, 15, 1.4, { leve: 2.4, vise: 2, fov: 46 });
    const A = relatif(r, 19, -10, 1.6, { leve: 3, fov: 44 });
    const B = relatif(r, 30, -26, 15, { leve: 2.5, fov: 44 });
    return melange(A, B, smoother((t - sl.place + 0.15) / Math.max(0.4, sl.fin - sl.place + 0.15)));
  };
  R[10] = (k, t, sl) => {           // #11 3/4 avant bas, puis presque de face (côté centre du ring : aucune voiture garée entre nous)
    const r = rep(k, t, 0.15);
    return melange(relatif(r, 18, -10, 2.2, { fov: 42 }), relatif(r, 16, -4, 10, { leve: 1.5, fov: 44 }), smoother((t - sl.atterrissage + 0.2) / 0.5));
  };
  R[11] = (k, t, sl) => {           // #12 grue orbitale lente au-dessus de la voiture
    const r = rep(k, t, 0.2), a = Math.atan2(r.f[2], r.f[0]) + 2.2 + 0.5 * (t - sl.sortie);
    return { p: [r.p[0] + Math.cos(a) * 20, r.p[1] + 15, r.p[2] + Math.sin(a) * 20], c: add(r.p, [0, 1.6, 0]), fov: 44 };
  };
  R[12] = (k, t, sl) => {           // #13 profil (côté intérieur), puis 3/4 arrière pendant le dérapage
    const r = rep(k, t, 0.18);
    const A = { p: r.W(r.u - 4, r.l - 26, 3 + r.h * 0.6), c: add(r.p, [0, 2.2, 0]), fov: 42 };
    const B = relatif(r, -18, -9, 5, { vise: 3, fov: 44 });
    return melange(A, B, smoother((t - sl.atterrissage) / 0.5));
  };
  R[13] = (k, t) => relatif(rep(k, t, 0.15), -21, 8, 6.5, { vise: 2.5, fov: 44 });                                                  // #14 poursuite 3/4 classique
  R[14] = (k, t, sl) => {           // #15 frontal (la voiture fonce vers nous), zoom V9.4 : COUPE à l'atterrissage → contre-plongée 3/4
    const r = rep(k, t, 0.15);
    if (sl.zoom && t >= sl.atterrissage) return relatif(r, 15, -10, 1.5, { leve: 2.6, fov: 46 });
    const A = relatif(r, 19, 4, 3.6, { leve: 2.5, fov: 40 });
    const B = relatif(r, 17, 10, 3, { fov: 42 });
    return melange(A, B, smoother((t - sl.atterrissage) / 0.5));
  };

  function cameraEcurie(k, t) { return R[k](k, t, P.ecuries[k]); }

  /* ═════════════ RUSH : ralenti d'action des 4 écuries « zoom », 1,25 s chacune ═════════════ */
  const RU = P.rush;
  const RUSH_DEF = {
    8: { cle: (sl) => sl.atterrissage + 0.1, plan: (r) => relatif(r, voitures[7].d.L / 2 + 8, 12, 3, { fov: 44 }) },                                          // A4 en dérapage, 3/4 avant
    3: { cle: (sl) => sl.sortie + 0.3, plan: (r) => relatif(r, 21, 0.5, 2.8, { leve: 2.6, fov: 40 }) },                                                         // face pure, flare des phares
    2: { cle: (sl) => sl.atterrissage + 0.05, plan: (r) => ({ p: add(r.p, [13, 22, 13]), c: add(r.p, [0, 1, 0]), fov: 40 }) },                                // Twingo : tête-à-queue vu en plongée
    15: { cle: (sl) => sl.place - 0.9, plan: (r) => relatif(r, 15, 8, 2.4, { leve: 2.6, fov: 42, roll: 6 * DEG }) },                                          // Princess Blooming : 3/4 avant « royal »
    10: { cle: (sl) => sl.sortie + 0.45, plan: (r) => relatif(r, 17, -12, 1.6, { leve: 3, fov: 46 }) },                                                        // 6 roues sur la passerelle, contre-plongée 3/4 avant (aucune voiture devant)
  };
  function rush(t) {
    if (!RU || t < RU.debut || t >= RU.fin) return null;
    let i = 0; while (i < RU.cuts.length - 1 && t >= RU.cuts[i + 1]) i++;
    const id = RU.ordre[i], k = id - 1, sl = P.ecuries[k], a = t - RU.cuts[i];
    const def = RUSH_DEF[id] || { cle: (s) => s.atterrissage, plan: (r) => relatif(r, 18, 10, 3) };
    const tA = def.cle(sl) + a;
    return { i, k, tA, cam: def.plan(rep(k, tA, 0.1), a) };
  }

  /* ═════════════ COURONNE + plongée dans le portail ═════════════ */
  const CO = P.couronne;
  const CO_CLES = [{ t: CO.debut, p: [78, G.MAT + 178, 140], c: [0, G.MAT, 4], fov: 46 }, { t: CO.portail, p: [40, G.MAT + 124, 74], c: [0, G.MAT, 2], fov: 48 }];
  function cameraCouronne(t) {
    if (t < CO.portail) return { p: hermite(CO_CLES, t, 'p'), c: hermite(CO_CLES, t, 'c'), fov: hermite(CO_CLES, t, 'fov') };
    const u = Math.pow(clamp((t - CO.portail) / (CO.fin - CO.portail)), 1.9);                      // accélère dans le portail
    return { p: mix(CO_CLES[1].p, [0.35, G.MAT + 3.2, 0.25], u), c: [0, G.MAT, 0], fov: lerp(48, 62, u) };
  }

  /* ═════════════ ARRIVÉE : jaillit du vortex pile sur « EN ARÈNE ! » ═════════════ */
  const AR = P.arrivee, T0 = AR.drop;
  const AR_CLES = [
    { t: T0 - 0.3, p: [0, 1240, 2], c: [0, G.MAT, 0], fov: 72 },                       // clé d'élan (avant le segment) : la caméra arrive lancée
    { t: T0, p: [0, 960, 3], c: [0, G.MAT, 0], fov: 72 },
    { t: T0 + 0.75, p: [120, 430, 170], c: [0, G.MAT, 0], fov: 58 },
    { t: T0 + 1.9, p: [190, 150, 230], c: [40, G.MAT + 20, 0], fov: 48 },
    { t: lerp(T0 + 1.9, AR.fin, 0.55), p: [330, 62, 112], c: [262, G.MAT + 18, 0], fov: 46 },
    { t: AR.fin, p: [302, G.MAT + 7, -44], c: [272, G.MAT + 4, 0], fov: 44 },
  ];
  const cameraArrivee = (t) => ({ p: hermite(AR_CLES, t, 'p'), c: hermite(AR_CLES, t, 'c'), fov: hermite(AR_CLES, t, 'fov') });

  /* ═════════════ coupes franches (flash 2 images) et impulsions de trauma ═════════════ */
  const COUPES_ZOOM = { 1: (sl) => [sl.saut], 2: (sl) => [sl.atterrissage], 7: (sl) => [sl.saut], 9: (sl) => [sl.atterrissage + 0.3], 14: (sl) => [sl.atterrissage] };
  const coupesDe = (k) => (P.ecuries[k].zoom && COUPES_ZOOM[k] ? COUPES_ZOOM[k](P.ecuries[k]) : []);
  const coupes = [];
  P.ecuries.forEach((sl, k) => coupesDe(k).forEach((tc, j) => coupes.push({ t: tc, k, j })));
  if (RU) RU.cuts.forEach((tc, i) => coupes.push({ t: tc, k: RU.ordre[i] - 1, j: i, rush: true }));
  const VIOLENT = new Set([4, 6, 9]);
  const impulsions = [{ t: T0, a: 1.25, d: 0.32 }];
  P.ecuries.forEach((sl, k) => {
    impulsions.push({ t: sl.debut + 0.1, a: 0.22, d: 0.16 });                                       // apparition du bandeau
    impulsions.push({ t: sl.atterrissage, a: VIOLENT.has(k) ? 1.3 : 0.45, d: VIOLENT.has(k) ? 0.3 : 0.2 });
  });
  for (const c of coupes) impulsions.push({ t: c.t, a: 0.55, d: 0.15 });
  if (CO) impulsions.push({ t: CO.portail, a: 0.4, d: 0.25 });

  return { cameraEcurie, cameraArrivee, cameraCouronne, rush, coupes, impulsions, coupesDe };
}
