/* CHRONOLOGIE du reveal (aucune dépendance : testée sous Node par relay/tests/controle_sequence.mjs).

   atterrissage → SUSPENSE (1,5 à 3 s selon la rareté, un palier par rang) → scellé en éclats → rideau qui s'enroule
   → le bolide ne démarre qu'une fois le rideau logé dans son coffre → pose → arrêt sur image (trailer) ou titre + jauges
   (Fret) → « tenue » : à partir de là, Espace fait passer au suivant.

   Gabarit : la hauteur libre du conteneur s'adapte au point le plus haut du bolide (aileron, gyrophare, rotor), rebond du
   seuil et marge compris, pour qu'aucun élément ne touche le linteau du coffre de rideau. */
export const SUSPENSE_PAR_RANG = [1.5, 1.9, 2.3, 2.7, 3.0];        // Standard → Relique Interdite (secondes)
export const GABARIT = { dalle: 0.46, ep: 0.16, linteau: 0.05, marge: 0.16, rebond: 0.12, hauteurStl: 4.16 };

export function chronologie({ rang = 0, express = false, trailer = false, dureeSortie = null } = {}) {
  const r = Math.max(0, Math.min(4, rang | 0));
  const X = express ? 0.55 : 1;
  const suspense = SUSPENSE_PAR_RANG[r] * X;
  const D = { arrivee: express ? 0.35 : 0.55, suspense };
  D.ouvre = D.arrivee + suspense;                                   // le scellé vole en éclats
  D.trappeDebut = D.ouvre + (express ? 0.18 : 0.28);               // le rideau commence à s'enrouler
  D.trappe = D.trappeDebut + (express ? 0.42 : 0.62);              // rideau entièrement logé dans le coffre
  D.sortie = D.trappe + 0.12;                                       // seulement alors le bolide démarre
  D.pose = D.sortie + (dureeSortie ?? (express ? 1.3 : 1.7));
  D.paliers = Array.from({ length: r + 1 }, (_, k) => D.arrivee + suspense * (k + 1) / (r + 2));
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
