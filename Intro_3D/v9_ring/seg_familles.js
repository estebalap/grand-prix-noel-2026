/* SEGMENT « FAMILLES » de la V9 Ring — trois mondes reliés par des PORTAILS EXPRESS (temps INTERNE 0 → 15 s).

   V9.3 : le noyau ne montre que trois extraits (plan_v9.json → remap [[86,1, 90,1, 0,3, 4,3], [90,1, 92,6, 5,5, 8,0], [92,6, 96,1, 10,5, 14,0]]) :
     film 86,1 → 90,1  =  interne  0,3 →  4,3   GOTHAM      familles_gotham.js  fondu dans un Gotham nocturne, 1,5 s de calme, phares
                                                                                  qui s'allument ; la Batmobile démarre et plonge dans un rift
     film 90,1 → 92,6  =  interne  5,5 →  8,0   ARC-EN-CIEL familles_f1.js      5 feux, extinction, départ ; la F03 traverse un rift
     film 92,6 → 96,1  =  interne 10,5 → 14,0   TOKYO       familles_tokyo.js   vraie course à 4 de front, dérives dans le virage ;
                                                                                  la Skyline gagne et plonge dans un rift
   Voix (film) : Gotham 87,6 · F1 90,3 · Tokyo 92,9.

   GLITCH DE TÉLÉPORTATION discret (±0,12 s autour des coupes interne 4,3 / 5,5 / 8,0 / 10,5 / 14,0 ; rien à l'entrée de Gotham) :
   aberration chromatique, quelques tranches décalées + scanlines + bandes numériques (hud, hors zone centrale), flash d'inversion de
   2 images à l'entrée du circuit et à la sortie finale, badge « ⚡ MAP WARP : … » 0,4–0,5 s en haut à gauche (F1, Tokyo).
   Hors des fenêtres de glitch : aucun habillage (la voix suffit).

   Contrat (LISEZ_MOI_V8.md + noyau_v9.js) : creerSegment(ctx) → { id, groupe, cles, maj(t), collisions() }.
   maj(t) est une FONCTION PURE de t : chaque monde repose toutes ses voitures, ses uniforms et ses lumières à chaque image ;
   aucun Math.random() (PRNG semés), aucune accumulation. collisions() : interpénétrations voiture/voiture et voiture/décor de la
   dernière image ; la partie d'une voiture déjà passée dans un rift n'existe plus de ce côté (boîte tronquée au plan du portail). */
import { boiteLocale, obbVoiture, penetration } from './familles_outils.js';
import { intensiteGlitch, dessinerGlitch, tronquerAuPortail } from './familles_portail.js';
import { creerGotham } from './familles_gotham.js';
import { creerF1 } from './familles_f1.js';
import { creerTokyo, ORDRE_TOKYO } from './familles_tokyo.js';

const CODES_F1 = ['F03', 'F02', 'F04', 'F01', 'F06'];          // voies rouge, orange, jaune, verte, bleue
const COUPES = [5, 10];                                        // frontières des mondes (temps interne)
// V9.3 : Gotham s'ouvre en FONDU (aucun glitch ni badge à son entrée) ; glitchs plus courts et plus discrets
const COUPES_FILM = [4.3, 5.5, 8.0, 10.5, 14.0];               // coupes réellement montrées (bords des extraits du remap)
const FORCE_COUPE = [0.8, 0.8, 0.55, 0.55, 0.8];               // l'entrée de Tokyo est volontairement discrète
const ENTREES = [{ t: 5.5, nom: 'CIRCUIT F1', duree: 0.5 }, { t: 10.5, nom: 'NÉO-TOKYO', duree: 0.4 }];
const INVERSIONS = [[5.5, 5.534], [13.966, 14.01]];            // 2 images à 60 i/s : entrée du circuit, sortie vers l'arène

export async function creerSegment(ctx) {
  const { THREE, garage } = ctx;
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

  const teintes = [[0.6, 0.95, 1.0], [1.0, 0.45, 0.85], [0.6, 0.95, 1.0]];
  const zone = ctx.plan.regles_ui ? ctx.plan.regles_ui.zone_sacree : [0.3, 0.3, 0.7, 0.7];
  let actif = null, tCourant = 0;

  return {
    id: 'familles', groupe,
    // clés hors des fenêtres de glitch, dans les extraits montrés
    cles: [{ t: 2.6, label: 'Gotham nocturne · Batmobile' }, { t: 6.6, label: 'Ligne arc-en-ciel · feux' }, { t: 12.0, label: 'Tokyo · la course dans le virage' }],
    maj(t) {
      const k = t < COUPES[0] ? 0 : t < COUPES[1] ? 1 : 2;
      for (let i = 0; i < 3; i++) mondes[i].groupe.visible = i === k;
      actif = mondes[k]; tCourant = t;
      const etat = actif.maj(t);
      const gl = COUPES_FILM.reduce((g, c, i) => Math.max(g, FORCE_COUPE[i] * intensiteGlitch(t, [c], 0.12)), 0);
      const inversion = INVERSIONS.some(([a, b]) => t >= a && t < b);
      const entree = ENTREES.find((e) => t >= e.t && t <= e.t + e.duree);
      // éclair coloré bref au passage (teinte du rift : cyan / magenta), jamais un voile blanc
      const dC = Math.min(...COUPES_FILM.map((c) => Math.abs(t - c)));
      const eclat = Math.exp(-Math.pow(dC / 0.05, 2));
      etat.post = { ...etat.post, flash: 0.05 * eclat, flashCouleur: teintes[k], flou: 0,
        aberration: (etat.post.aberration || 0.0006) + 0.0065 * gl };
      if (gl > 0.02 || inversion || entree) {
        etat.hud = (g, W, H) => dessinerGlitch(g, W, H, { t, g: gl, inversion, source: ctx.renderer.domElement, zone,
          badge: entree ? { texte: entree.nom, tau: t - entree.t, duree: entree.duree } : null });
      }
      return etat;
    },
    collisions() {
      if (!actif) return [];
      const obb = [];
      for (const v of actif.voitures) {
        if (!v.env.visible) continue;                                    // entièrement passée dans le rift
        const o = tronquerAuPortail(obbVoiture(v.env, boites.get(v.env), v.nom), v.portail);
        if (o) obb.push(o);
      }
      const res = [];
      for (let i = 0; i < obb.length; i++) {
        for (let j = i + 1; j < obb.length; j++) { const p = penetration(obb[i], obb[j]); if (p > 0) res.push({ t: tCourant, a: obb[i].nom, b: obb[j].nom, profondeur: +p.toFixed(2) }); }
        for (const d of actif.obstacles) { const p = penetration(obb[i], d); if (p > 0) res.push({ t: tCourant, a: obb[i].nom, b: d.nom, profondeur: +p.toFixed(2) }); }
      }
      return res;
    },
  };
}
