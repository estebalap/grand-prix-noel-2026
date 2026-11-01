/* SEGMENT « FAMILLES » de la V9 Ring — trois mondes de 5 s, coupes franches (temps INTERNE 0 → 15 s ; film 76 → 91 s).

   Voix off : « Des Batmobiles au sommet de Gotham… des Formule 1 sur la ligne arc-en-ciel… et les légendes de Tokyo. »
     0 →  5 s  GOTHAM      familles_gotham.js  Batmobile 1989 (B02) au bord d'un toit, ville gothique, pluie, signal dans les nuages
     5 → 10 s  ARC-EN-CIEL familles_f1.js      5 F1 sur une grille à 5 voies arc-en-ciel, portique de 5 feux (5,6 → 8,8 s)
    10 → 15 s  TOKYO       familles_tokyo.js   TK02, TK01, TK04, TK05 en file sous la pluie néon (TK06 jamais construit)
   Aux coupes (5 et 10 s) : très court éclat lumineux teinté de la couleur du monde entrant (≈ 80 ms), pas de flash blanc.

   Contrat (LISEZ_MOI_V8.md + noyau_v9.js) : creerSegment(ctx) → { id, groupe, cles, maj(t), collisions() }.
   maj(t) est une FONCTION PURE de t : chaque monde repose toutes ses voitures, ses uniforms et ses lumières à chaque image ;
   aucun Math.random() (PRNG semés par monde), aucune accumulation. Aucun HUD (la voix suffit).
   collisions() : interpénétrations voiture/voiture et voiture/décor de la dernière image (boîtes orientées XZ + plage Y). */
import { boiteLocale, obbVoiture, penetration } from './familles_outils.js';
import { creerGotham } from './familles_gotham.js';
import { creerF1 } from './familles_f1.js';
import { creerTokyo, ORDRE_TOKYO } from './familles_tokyo.js';

const CODES_F1 = ['F03', 'F02', 'F04', 'F01', 'F06'];          // voies rouge, orange, jaune, verte, bleue
const COUPES = [5, 10];

export async function creerSegment(ctx) {
  const { THREE, garage, outils } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'seg-familles';
  if (ORDRE_TOKYO.includes('TK06')) throw new Error('seg_familles : TK06 interdit');

  /** Construit un bolide m3d et mesure sa boîte au repos (avant tout ajout d'accessoire). */
  const voiture = async (code) => {
    ctx.progression(`Familles : bolide ${code}…`);
    const env = await garage.m3d(code);
    return { code, env, boite: boiteLocale(THREE, env) };
  };

  const bat = await voiture('B02');
  const f1 = [];
  for (const c of CODES_F1) f1.push(await voiture(c));
  const tk = [];
  for (const c of ORDRE_TOKYO) tk.push(await voiture(c));

  ctx.progression('Familles : Gotham…');
  const gotham = ctx.avecAlea('familles-gotham', () => creerGotham(ctx, bat.env, bat.boite));
  ctx.progression('Familles : ligne arc-en-ciel…');
  const grille = ctx.avecAlea('familles-f1', () => creerF1(ctx, f1));
  ctx.progression('Familles : Tokyo…');
  const tokyo = ctx.avecAlea('familles-tokyo', () => creerTokyo(ctx, tk));
  const mondes = [gotham, grille, tokyo];
  for (const w of mondes) { w.groupe.visible = false; groupe.add(w.groupe); }
  const boites = new Map([[bat.env, bat.boite], ...f1.map((v) => [v.env, v.boite]), ...tk.map((v) => [v.env, v.boite])]);

  const teintes = [[0.75, 0.95, 1.0], [1.0, 0.95, 0.85], [1.0, 0.6, 0.95]];
  let actif = null, tCourant = 0;

  return {
    id: 'familles', groupe,
    cles: [{ t: 2.6, label: 'Gotham · Batmobile sur le toit' }, { t: 8.3, label: 'Ligne arc-en-ciel · feux' }, { t: 13.2, label: 'Tokyo · légendes sous la pluie' }],
    maj(t) {
      const k = t < COUPES[0] ? 0 : t < COUPES[1] ? 1 : 2;
      for (let i = 0; i < 3; i++) mondes[i].groupe.visible = i === k;
      actif = mondes[k]; tCourant = t;
      const etat = actif.maj(t);
      // éclat lumineux bref à l'entrée des mondes 2 et 3 (teinté, ~80 ms, jamais un voile blanc)
      const dC = k > 0 ? t - COUPES[k - 1] : 1;
      const eclat = k > 0 ? Math.exp(-Math.pow(dC / 0.05, 2)) : 0;
      etat.post = { ...etat.post, flash: 0.06 * eclat, flashCouleur: teintes[k], flou: 0 };
      return etat;
    },
    collisions() {
      if (!actif) return [];
      const obb = actif.voitures.map((v) => obbVoiture(v.env, boites.get(v.env), v.nom));
      const res = [];
      for (let i = 0; i < obb.length; i++) {
        for (let j = i + 1; j < obb.length; j++) { const p = penetration(obb[i], obb[j]); if (p > 0) res.push({ t: tCourant, a: obb[i].nom, b: obb[j].nom, profondeur: +p.toFixed(2) }); }
        for (const d of actif.obstacles) { const p = penetration(obb[i], d); if (p > 0) res.push({ t: tCourant, a: obb[i].nom, b: d.nom, profondeur: +p.toFixed(2) }); }
      }
      return res;
    },
  };
}
