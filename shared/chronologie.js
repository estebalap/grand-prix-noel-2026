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

export function chronologie({ rang = 0, express = false, trailer = false, dureeSortie = null } = {}) {
  const r = Math.max(0, Math.min(4, rang | 0));
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
  return D;
}

/** Hauteur du conteneur et hauteur libre de l'ouverture pour un bolide dont le point le plus haut est « sommet » (au-dessus des roues). */
export function gabarit(sommet = 0) {
  const G = GABARIT;
  const H = Math.max(G.hauteurStl, G.dalle + sommet + G.rebond + G.marge + G.linteau + G.ep);
  return { H, hO: H - G.ep - G.linteau - G.dalle, yLinteau: H - G.ep - G.linteau };
}
