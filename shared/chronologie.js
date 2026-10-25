/* CHRONOLOGIE du reveal (aucune dépendance : testée sous Node par relay/tests/controle_sequence.mjs).

   atterrissage → SUSPENSE (2,5 s pour un Standard à 15,5 s pour une Relique Interdite : un palier par rang, de plus en plus espacés)
   → PRÉ-OUVERTURE (2,4 s ; 3,5 s dès le Légendaire) → silence de mort (0,35 s) → scellé en éclats
   → ouverture solennelle du rideau (4,4 s : pschitt, trois inserts macro dans la pénombre, plan large + rugissement) → le bolide
   ne démarre qu'une fois le rideau logé dans son coffre → pose → arrêt sur image (trailer) ou titre + jauges
   (Fret) → « tenue » : à partir de là, Espace fait passer au suivant.

   Gabarit : la hauteur libre du conteneur s'adapte au point le plus haut du bolide (aileron, gyrophare, rotor), rebond du
   seuil et marge compris, pour qu'aucun élément ne touche le linteau du coffre de rideau. */
/* Suspense par rang (Standard, Rare, Épique, Légendaire, Relique Interdite) : il s'étire avec la récompense. Un Standard s'ouvre
   sans traîner ; un Légendaire impose 12,5 s de montée (la vague dorée prend le temps de consumer la tôle) ; une Relique, 15,5 s. */
export const SUSPENSE_PAR_RANG = [2.5, 6.5, 9.0, 12.5, 15.5];
/** Étirement des paliers : chaque attente dure ETIREMENT fois la précédente (le spectateur guette le cran suivant de plus en plus longtemps). */
export const ETIREMENT_PALIERS = 1.2;
/** Battement cardiaque infra : de BPM_DEBUT à BPM_FIN, courbe accélérée (exposant 1,5), jusqu'au silence. */
export const BPM_DEBUT = 55, BPM_FIN = 130;
/** Silence de mort avant la déflagration du scellé (s). */
export const SILENCE_AVANT_OUVERTURE = 0.35;
export const GABARIT = { dalle: 0.46, ep: 0.16, linteau: 0.05, marge: 0.16, rebond: 0.12, hauteurStl: 4.16 };

/** Plans de l'ouverture solennelle, en fraction (0 à 1) de la durée du rideau (trappeDebut → trappe) : trois inserts macro dans la
 *  pénombre du conteneur (phares, jante, silhouette en lumière rasante), puis le plan large où le moteur rugit une dernière fois. */
export const PLANS_OUVERTURE = [
  { id: 'phares', u0: 0.15, u1: 0.41 },
  { id: 'jante', u0: 0.41, u1: 0.66 },
  { id: 'rasant', u0: 0.66, u1: 0.87 },
  { id: 'large', u0: 0.87, u1: 1.0 },
];
/** Progression du rideau (0 fermé → 1 logé dans son coffre) selon u = fraction de la durée d'ouverture : démarrage lourd, paliers
 *  pneumatiques, accélération finale. Monotone, continue, 0 en u=0 et 1 en u=0.95. */
const CLES_RIDEAU = [[0, 0], [0.07, 0.0], [0.15, 0.1], [0.28, 0.3], [0.41, 0.46], [0.5, 0.52], [0.66, 0.68], [0.78, 0.8], [0.9, 0.95], [0.95, 1]];
export function progressionRideau(u) {
  if (u <= 0) return 0;
  if (u >= 0.95) return 1;
  for (let i = 1; i < CLES_RIDEAU.length; i++) {
    const [u1, p1] = CLES_RIDEAU[i], [u0, p0] = CLES_RIDEAU[i - 1];
    if (u <= u1) { const k = (u - u0) / (u1 - u0); return p0 + (p1 - p0) * k * k * (3 - 2 * k); }
  }
  return 1;
}

export function chronologie({ rang = 0, express = false, trailer = false, dureeSortie = null, drame = false, scenario = 'epave' } = {}) {
  const r = drame ? 3 : Math.max(0, Math.min(4, rang | 0));          // MODE DRAME : le faux suspense est EXACTEMENT celui d'un Légendaire
  const X = express ? 0.55 : 1;
  const suspense = SUSPENSE_PAR_RANG[r] * X;
  const D = { arrivee: express ? 0.35 : 0.55, suspense };
  D.pre = r >= 3 ? (express ? 1.4 : 3.5) : (express ? 1.0 : 2.4);   // « pré-ouverture » : à-coups lourds, 3,5 s dès le Légendaire
  D.ouvre = D.arrivee + suspense + D.pre;                           // le scellé vole en éclats
  D.silence = D.ouvre - SILENCE_AVANT_OUVERTURE;                    // tout se coupe net : le calme avant la tempête
  D.trappeDebut = D.ouvre + (express ? 0.18 : 0.28);               // le rideau commence à s'enrouler (pschitt)
  D.trappe = D.trappeDebut + (express ? 1.9 : 4.4);                // rideau entièrement logé dans le coffre (ouverture lente, solennelle)
  D.sortie = D.trappe + 0.12;                                       // seulement alors le bolide démarre
  D.pose = D.sortie + (dureeSortie ?? (express ? 1.3 : 1.7));
  // paliers : r + 1 crans de rareté, attentes en progression géométrique (la dernière, avant la pré-ouverture, est la plus longue)
  const nP = r + 1, poids = Array.from({ length: nP + 1 }, (_, i) => Math.pow(ETIREMENT_PALIERS, i)), total = poids.reduce((a, b) => a + b, 0);
  D.paliers = []; for (let k = 0, acc = 0; k < nP; k++) { acc += poids[k]; D.paliers.push(D.arrivee + suspense * acc / total); }
  // à-coups de la machine enfermée : sourds et espacés au début, frénétiques dans la dernière seconde (loi 1 − (1 − s)^2,4)
  const nJ = (express ? 4 : 5) + 3 * r, j0 = D.arrivee + (express ? 0.3 : 0.55), j1 = D.silence - (express ? 0.06 : 0.1);
  D.jolts = Array.from({ length: nJ }, (_, k) => j0 + (j1 - j0) * (1 - Math.pow(1 - (k + 0.5) / nJ, 2.4)));
  // battement cardiaque : 55 BPM à l'atterrissage → 130 BPM au silence. Posé à rebours depuis le silence, pour que le dernier
  // intervalle soit exactement à la cadence finale quelle que soit la durée du suspense.
  const bpm = (x) => BPM_DEBUT + (BPM_FIN - BPM_DEBUT) * Math.pow(Math.max(0, Math.min(1, (x - D.arrivee) / Math.max(0.1, D.silence - D.arrivee))), 1.5);
  D.battements = [];
  for (let x = D.silence - 0.08; x > D.arrivee + 0.25;) { D.battements.unshift(x); x -= 60 / bpm(x - 30 / bpm(x)); }
  D.rideauFin = D.trappeDebut + (D.trappe - D.trappeDebut) * 0.95;
  D.plans = PLANS_OUVERTURE.map((p) => ({ id: p.id, t0: D.trappeDebut + (D.trappe - D.trappeDebut) * p.u0, t1: D.trappeDebut + (D.trappe - D.trappeDebut) * p.u1 }));
  if (trailer) { D.freeze = D.pose + (express ? 0.45 : 0.65); D.titre = D.freeze; D.stats = Infinity; D.tenue = D.freeze + 0.9; }
  else { D.titre = D.pose + 0.7 * X; D.stats = D.titre + (express ? 1.4 : 2.6); D.tenue = D.stats + 1.6; }
  D.dech = express ? 0.3 : 0.42;
  D.detonations = detonations(D, r, express);
  if (drame) (scenario === 'crash' ? chronologieCrash : chronologieDrame)(D, { express, trailer, X });
  return D;
}

/* ------------------------------------------------------------------ MODE DRAME (raretés signature à drapeau « drame » : Épave)
   « Le légendaire qui n'en était pas un ». Jusqu'au scellé (D.ouvre), tout est identique à un Légendaire (mêmes paliers, même rafale
   de climax, même cœur, même silence de mort). Puis, à l'instant où l'explosion titanesque devait tout pulvériser :
     o + 0,00  PÉTARD MOUILLÉ : « pfft », bouffée de fumée grise, trois étincelles qui retombent ; la fanfare de gloire démarre
               (« ta-ta-TAAA »)… pendant que la lumière dorée s'effondre en 0,3 s : quatre groupes de projecteurs grésillent puis
               s'éteignent un par un (0,10 / 0,17 / 0,24 / 0,31 s), le liseré néon clignote puis meurt, la tôle vire au gris rouille
     o + 0,30  ARRÊT DE BANDE sur le « TAAA » : la fanfare ralentit et chute de hauteur jusqu'à l'arrêt (0,8 s) ; silence gêné
     o + 0,50  le badge « ◆◆◆◆ LÉGENDAIRE » se fissure (trois craquements) ; o + 1,30 une ampoule nue s'allume en grésillant
     o + 1,55  un grillon (trois stridulations), deux gouttes d'eau tombent dans une flaque
     o + 2,75  TROMBONE TRISTE « wah-wah-wah-waaah » : à chaque note, un losange du badge tombe ; la dernière est tenue (vibrato)
     o + 4,75  la plaque du badge cède ; o + 5,05 le badge Épave s'abat ; o + 5,60 tampon « DÉCLASSÉ » imprimé de travers
     o + 6,00  RIDEAU COINCÉ : trois à-coups (17 %, 32 %, 47 %), il se bloque à mi-hauteur en grinçant, une lame se décroche
               (o + 7,95) et tombe sur le béton (« clonk », o + 8,40) ; o + 8,90 il finit de s'enrouler, péniblement
     o + 9,70  démarreur ; le moteur (celui de la fiche du bolide) tousse au ralenti, puis le bolide sort LENTEMENT en toussotant
               (chaque quinte de toux l'arrête presque) ; au choc du seuil, l'enjoliveur avant se détache et roule au sol
   La musique réelle du bolide ne démarre qu'à la sortie (D.sortie). Tout est fonction pure du temps : deux captures = deux films
   identiques. En express, les écarts sont multipliés par 0,6. */
export const DRAME = {
  tapeStop: [0.3, 1.1], effondrement: [0.04, 0.34], extinctions: [0.1, 0.17, 0.24, 0.31], gresillement: 0.07, neon: [0, 1.4],
  rouille: [0.05, 0.35], fissures: [0.5, 1.3, 2.0], ampoule: 1.3, grillon: [1.55, 2.1, 2.6], gouttes: [1.85, 2.4],
  trombone: [[2.75, 0.4], [3.2, 0.4], [3.65, 0.4], [4.1, 1.65]], badgeChute: 4.75, badgeEpave: 5.05, tampon: 5.6,
  crans: [[6.0, 0.17], [6.6, 0.32], [7.15, 0.47]], dureeCran: 0.22, blocage: 7.4, lame: [7.95, 8.4], fin: [8.9, 10.3],
  demarrage: 9.7, touxRalenti: [10.55, 11.0], sortie: 11.4, dureeSortie: 3.8, touxSortie: [0.55, 1.45, 2.4], largeurToux: 0.38,
  enjoliveur: { roule: 1.3, toupie: 1.0 },
};
function chronologieDrame(D, { express, trailer, X }) {
  const o = D.ouvre, k = express ? 0.6 : 1, T = (x) => o + x * k, C = DRAME;
  D.detonations = D.detonations.filter((x) => x.type !== 'titan');      // pas d'explosion titanesque : un pétard mouillé
  const DR = {
    petard: o, tapeStop: C.tapeStop.map(T), effondrement: C.effondrement.map(T), extinctions: C.extinctions.map(T), gresillement: C.gresillement * k,
    neon: C.neon.map(T), rouille: C.rouille.map(T), fissures: C.fissures.map(T), ampoule: T(C.ampoule), grillon: C.grillon.map(T), gouttes: C.gouttes.map(T),
    trombone: C.trombone.map(([t, d], i) => [T(t), i === C.trombone.length - 1 ? d * (express ? 0.8 : 1) : d * k]),
    badgeChute: T(C.badgeChute), badgeEpave: T(C.badgeEpave), tampon: T(C.tampon),
    crans: C.crans.map(([t, p]) => [T(t), p]), dureeCran: C.dureeCran * k, blocage: T(C.blocage), lame: C.lame.map(T), fin: C.fin.map(T),
    demarrage: T(C.demarrage), touxRalenti: C.touxRalenti.map(T), largeurToux: C.largeurToux * (express ? 0.8 : 1),
    enjoliveur: { roule: C.enjoliveur.roule * (express ? 0.8 : 1), toupie: C.enjoliveur.toupie * (express ? 0.8 : 1) },
  };
  DR.losanges = DR.trombone.map(([t]) => t + 0.02);                      // un losange tombe à chaque « wah »
  // grésillements (image ET son lisent les mêmes intervalles « allumé ») : générateur à graine fixe, aucun Math.random
  let g = 20261223; const alea = () => ((g = (g * 1664525 + 1013904223) >>> 0) / 4294967296);
  DR.gresillements = DR.extinctions.map((tOff) => {                     // chaque groupe de projecteurs papillote avant de mourir
    const s = []; for (let x = tOff - DR.gresillement; x < tOff;) { const on = 0.008 + 0.02 * alea(), off = 0.006 + 0.016 * alea(); s.push([x, Math.min(x + on, tOff)]); x += on + off; }
    return s;
  });
  DR.neonSegments = [];                                                  // le néon (liseré) : allumages de plus en plus brefs, noirs de plus en plus longs
  for (let x = DR.neon[0]; x < DR.neon[1];) { const u = (x - DR.neon[0]) / (DR.neon[1] - DR.neon[0]), on = (0.12 * (1 - u) + 0.02) * (0.5 + alea()) * k, off = (0.03 + 0.25 * u) * (0.5 + alea()) * k; DR.neonSegments.push([x, Math.min(DR.neon[1], x + on)]); x += on + off; }
  DR.ampouleSegments = [];                                               // l'ampoule nue hésite trois fois, puis tient
  { let x = DR.ampoule; for (let i = 0; i < 3; i++) { const on = (0.03 + 0.05 * alea()) * k; DR.ampouleSegments.push([x, x + on]); x += on + (0.04 + 0.07 * alea()) * k; } DR.ampouleSegments.push([x, 1e9]); DR.ampouleTient = x; }
  DR.tromboneFin = DR.trombone[DR.trombone.length - 1][0] + DR.trombone[DR.trombone.length - 1][1];
  D.trappeDebut = DR.crans[0][0];
  D.trappe = DR.fin[1];
  D.sortie = T(C.sortie);
  DR.dureeSortie = C.dureeSortie * (express ? 0.7 : 1);
  DR.touxSortie = C.touxSortie.map((x) => x * (express ? 0.7 : 1));       // instants RELATIFS à D.sortie (le bolide cale presque)
  D.pose = D.sortie + DR.dureeSortie;
  D.plans = [];                                                          // aucun insert solennel : la caméra reste sur le désastre
  D.rideauFin = D.trappe;
  if (trailer) { D.freeze = D.pose + (express ? 0.45 : 0.65); D.titre = D.freeze; D.stats = Infinity; D.tenue = D.freeze + 0.9; }
  else { D.titre = D.pose + 0.7 * X; D.stats = D.titre + (express ? 1.4 : 2.6); D.tenue = D.stats + 1.6; }
  DR.scenario = 'epave';
  D.drame = DR;
  return DR;
}

/* ------------------------------------------------------------------ MODE DRAME, scénario « crash » (N13, car.drame_scenario = 'crash')
   « Le chasseur abattu ». Même faux Légendaire jusqu'au silence de mort ; au scellé (o = D.ouvre), au lieu de l'ouverture :
     o + 0,00  COUPE FRANCHE : plein ciel au-dessus des nuages. La voiture NEUVE vole, AILES REPLIÉES (dressées), bleu vif, réacteur
               qui siffle ; o + 0,25 → 1,25 transformation : les ailes s'ouvrent autour de leurs charnières (axe x), clac-clac au
               déverrouillage (0,25 / 0,31) et au verrouillage (1,19 / 1,25), puis traînées de condensation aux saumons. Plans : poursuite (0 → 2,4, roulis de chasseur), survol (2,4 → 4,6, tonneau à 2,55 et
               passage Doppler à 3,75), alerte (4,6 → 6,4 : un drone kamikaze fonce sur elle, bips de verrouillage qui s'accélèrent)
     o + 6,40  IMPACT : boule de feu, les deux ailes et la dérive partent en vrille, la peinture vire du bleu au gris (0,45 s)
     o + 6,40  chute en spirale de fumée (6,4 → 8,0), sifflement qui descend
     o + 8,00  retour dans le hangar : elle tombe du haut du cadre, touche le béton devant le conteneur (8,35), rebondit,
               retouche (8,8), glisse en tournant sur elle-même dans une gerbe d'étincelles et s'immobilise (10,6) — épave
     o + 10,9  silence, un grillon ; o + 11,6 TROMBONE TRISTE (un losange par « wah »), le badge cède (15,0), Épave (15,3),
               tampon (15,85) ; o + 16,1 la musique réelle démarre ; o + 16,2 → 18,8 le conteneur s'ouvre… sur RIEN (il était vide)
     Arrêt sur image : la fiche, et l'aile gauche qui redescend du ciel en feuille morte (easter egg). Express : × 0,6. */
export const CRASH = {
  plans: [['poursuite', 0, 2.4], ['survol', 2.4, 4.6], ['alerte', 4.6, 6.4], ['chute', 6.4, 8.0]], tonneau: [2.55, 3.35], passage: 3.75,
  drone: 4.9, impact: 6.4, teinte: [6.4, 6.85], retour: 8.0, sol: [8.35, 8.8], arret: 10.6, fissures: [6.7, 8.45, 9.2],
  grillon: [10.9, 11.35], trombone: [[11.6, 0.4], [12.05, 0.4], [12.5, 0.4], [12.95, 1.65]], badgeChute: 15.0, badgeEpave: 15.3, tampon: 15.85,
  musique: 16.1, rideau: [16.2, 18.8], aile: 4.2,
  ailes: [0.25, 1.25], clacs: [0.25, 0.31, 1.19, 1.25],                // ouverture des ailes en vol, claquements des charnières (V9c)
};
function chronologieCrash(D, { express, trailer, X }) {
  const o = D.ouvre, k = express ? 0.6 : 1, T = (x) => o + x * k, C = CRASH;
  D.detonations = D.detonations.filter((x) => x.type !== 'titan');      // le scellé n'explose pas : on coupe ailleurs
  const DR = {
    scenario: 'crash', petard: o, coupe: o,
    plans: C.plans.map(([id, a, b]) => ({ id, t0: T(a), t1: T(b) })), tonneau: C.tonneau.map(T), passage: T(C.passage),
    drone: T(C.drone), impact: T(C.impact), teinte: C.teinte.map(T), retour: T(C.retour), sol: C.sol.map(T), arret: T(C.arret),
    fissures: C.fissures.map(T), grillon: C.grillon.map(T),
    trombone: C.trombone.map(([t, d], i) => [T(t), i === C.trombone.length - 1 ? d * (express ? 0.8 : 1) : d * k]),
    badgeChute: T(C.badgeChute), badgeEpave: T(C.badgeEpave), tampon: T(C.tampon), musique: T(C.musique), rideau: C.rideau.map(T),
    aile: C.aile * (express ? 0.7 : 1), ailes: C.ailes.map(T), clacs: C.clacs.map(T),
  };
  DR.losanges = DR.trombone.map(([t]) => t + 0.02);
  DR.tromboneFin = DR.trombone[DR.trombone.length - 1][0] + DR.trombone[DR.trombone.length - 1][1];
  // bips de verrouillage : de plus en plus serrés pendant l'approche du drone, puis tonalité continue (verrouillé) jusqu'à l'impact
  DR.alerte = []; for (let x = T(4.7), p = 0.42 * k; x < DR.impact - 0.2 * k; x += p, p = Math.max(0.06 * k, p * 0.8)) DR.alerte.push(x);
  DR.verrou = [DR.alerte[DR.alerte.length - 1] + 0.08 * k, DR.impact];
  D.trappeDebut = DR.rideau[0]; D.trappe = DR.rideau[1]; D.rideauFin = D.trappeDebut + (D.trappe - D.trappeDebut) * 0.95;
  D.sortie = DR.arret;                                                   // (repères du moteur générique ; le bolide ne sort jamais du conteneur)
  D.pose = D.trappe + 0.3;
  DR.seuil = D.trappe;                                                   // le conteneur est grand ouvert sur… rien : filtre, cri, univers
  D.plans = [];
  if (trailer) { D.freeze = D.pose + (express ? 0.45 : 0.65); D.titre = D.freeze; D.stats = Infinity; D.tenue = D.freeze + 0.9; }
  else { D.titre = D.pose + 0.7 * X; D.stats = D.titre + (express ? 1.4 : 2.6); D.tenue = D.stats + 1.6; }
  // repères du moteur (rendu générique : après le crash, le moteur n'est pas joué — c'est le réacteur synthétique qui chante en vol)
  DR.demarrage = DR.arret + 0.5; DR.touxRalenti = [DR.arret + 1.2]; DR.touxSortie = [0.5]; DR.dureeSortie = 1;
  D.drame = DR;
  return DR;
}

/** Plan du ciel en cours (scénario « crash ») à l'instant t : { id, t0, t1 } ou null hors du ciel. */
export function planCrash(t, DR) { return DR.plans.find((p) => t >= p.t0 && t < p.t1) || null; }

/** 1 si t tombe dans l'un des intervalles [début, fin[ (grésillements, néon, ampoule du MODE DRAME), sinon 0. */
export function allume(t, segments) {
  for (const [a, b] of segments) if (t >= a && t < b) return 1;
  return 0;
}

/** Rideau coincé du MODE DRAME (0 fermé → 1 logé) à l'instant t : trois à-coups en smoothstep, blocage à mi-hauteur, puis
 *  fin d'enroulement pénible (deux micro-arrêts). Continue, monotone, 0 avant le premier cran et 1 à DR.fin[1]. */
export function progressionRideauDrame(t, DR) {
  if (t <= DR.crans[0][0]) return 0;
  const ss = (u) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
  let p = 0;
  for (const [tc, pc] of DR.crans) { if (t >= tc) p = p + (pc - p) * ss((t - tc) / DR.dureeCran); }
  const [f0, f1] = DR.fin;
  if (t <= f0) return p;
  if (t >= f1) return 1;
  // fin d'enroulement : la vitesse retombe deux fois à presque rien (le moteur du rideau peine) — intégrale fermée d'une vitesse
  // 1 − 0,8·(fenêtres de Hann centrées à 35 % et 70 %), normalisée pour finir exactement à 1
  const L = 0.18, centres = [0.35, 0.7], H = (u) => 0.5 * (u - L / (2 * Math.PI) * Math.sin(2 * Math.PI * u / L));
  const W = (u) => u - 0.8 * centres.reduce((s, c) => s + H(Math.max(0, Math.min(L, u - (c - L / 2)))), 0);
  const u = (t - f0) / (f1 - f0);
  return p + (1 - p) * ss(W(u) / W(1));
}

/** Temps de roulage « toussotant » du MODE DRAME : pour x secondes réelles depuis D.sortie, renvoie { t, k } où t est le temps à
 *  donner au roulage (roulage.js) et k = dt/dx (≈ 0,15 pendant une quinte de toux : le bolide s'arrête presque). Continu, monotone,
 *  t(0) = 0 et t(duree) = duree : le bolide part et s'arrête aux mêmes marques qu'un autre. */
export function tempsSortieDrame(x, DR) {
  const d = DR.dureeSortie, L = DR.largeurToux, A = 0.85;
  const H = (u) => 0.5 * (u - L / (2 * Math.PI) * Math.sin(2 * Math.PI * u / L));
  const W = (y) => { let s = y; for (const c of DR.touxSortie) s -= A * H(Math.max(0, Math.min(L, y - (c - L / 2)))); return s; };
  const echelle = d / W(d), y = Math.max(0, Math.min(d, x));
  let f = 1; for (const c of DR.touxSortie) { const u = y - (c - L / 2); if (u > 0 && u < L) f -= A * 0.5 * (1 - Math.cos(2 * Math.PI * u / L)); }
  return { t: W(y) * echelle, k: x > 0 && x < d ? f * echelle : 0 };
}

/* ------------------------------------------------------------------ MODE EXPLOSION
   Chaque palier de rareté frappe comme une détonation (plus aucune vague de peinture qui glisse) : la caisse est surchargée
   d'énergie, la tôle chauffée à blanc retombe vers sa nouvelle couleur en ~0,4 s, une onde de choc balaie le sol du hangar,
   l'écran est frappé 2 images par un flash saturé de la couleur du palier, la caméra décroche puis vibre (ressort amorti), et
   un sub-boom (≈ 35 Hz) doublé d'un claquement d'acier forgé tombe à l'image près (foley_acier.js).
   CLIMAX (Légendaire, Relique Interdite et raretés signature, rang ≥ 3) : pendant la pré-ouverture, une rafale de détonations
   rapprochées (intervalles qui raccourcissent) fait sauter des rivets et surchauffe la tôle à blanc ; la dernière tombe 0,18 s
   AVANT le silence de mort, qui reste intact ; puis l'EXPLOSION TITANESQUE pulvérise le scellé à D.ouvre.
   Chaque détonation : { t (s), type 'palier' | 'climax' | 'titan', k (index dans son type), niveau (0 Standard → 4 Relique, le
   cran de rareté atteint), force (0,45 → 1,8 : pilote onde de choc, secousse, gerbes, son), surchauffe (0 → 1, climax) }. */
export const FORCES_PALIER = [0.45, 0.6, 0.75, 0.9, 1.0];
export const STROBE = { images: 2, dureeMax: 0.05 };          // flash stroboscopique : 2 images, jamais plus de 50 ms
export const INCANDESCENCE = 0.4;                               // la tôle retombe du blanc chaud à sa nouvelle couleur en 0,4 s
export function detonations(D, rang = 0, express = false) {
  const r = Math.max(0, Math.min(4, rang | 0)), liste = [];
  D.paliers.forEach((t, k) => { const niveau = Math.min(k, r); liste.push({ t, type: 'palier', k, niveau, force: FORCES_PALIER[niveau], surchauffe: 0 }); });
  if (r >= 3) {
    const n = express ? 3 : (r === 3 ? 4 : 6);
    const a = Math.max(D.paliers[D.paliers.length - 1] + (express ? 0.45 : 0.8), D.silence - (express ? 1.2 : 2.4)), b = D.silence - 0.18;
    // intervalles géométriques (raison 0,72) : la rafale s'emballe jusqu'au silence
    const q = 0.72, poids = Array.from({ length: n - 1 }, (_, i) => Math.pow(q, i)), tot = poids.reduce((x, y) => x + y, 0) || 1;
    for (let k = 0, acc = 0; k < n; k++) {
      liste.push({ t: a + (b - a) * acc / tot, type: 'climax', k, niveau: r, force: 0.55 + 0.4 * k / Math.max(1, n - 1), surchauffe: (k + 1) / (n + 1) });
      if (k < n - 1) acc += poids[k];
    }
    liste.push({ t: D.ouvre, type: 'titan', k: 0, niveau: r, force: r === 4 ? 1.8 : 1.6, surchauffe: 1 });
  }
  return liste;
}

/** Hauteur du conteneur et hauteur libre de l'ouverture pour un bolide dont le point le plus haut est « sommet » (au-dessus des roues). */
export function gabarit(sommet = 0) {
  const G = GABARIT;
  const H = Math.max(G.hauteurStl, G.dalle + sommet + G.rebond + G.marge + G.linteau + G.ep);
  return { H, hO: H - G.ep - G.linteau - G.dalle, yLinteau: H - G.ep - G.linteau };
}
