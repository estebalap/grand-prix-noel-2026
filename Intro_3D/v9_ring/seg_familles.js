/* SEGMENT « FAMILLES » de la V9 Ring — trois mondes reliés par des PORTAILS EXPRESS (temps INTERNE 0 → 15 s).

   V9.2 : le noyau ne montre que trois extraits (plan_v9.json → remap) :
     film 81,6 → 84,1  =  interne  1,8 →  4,3   GOTHAM      familles_gotham.js  la caméra sort d'un rift ; la Batmobile 1989 (B02)
                                                                                  garée au bord du toit démarre et plonge dans un rift
     film 84,1 → 86,2  =  interne  5,9 →  8,0   ARC-EN-CIEL familles_f1.js      5 feux, extinction, départ ; la F03 traverse un rift
     film 86,2 → 89,2  =  interne 11,0 → 14,0   TOKYO       familles_tokyo.js   la file TK05 → TK02 ; la Skyline double et plonge
   Voix : « Des Batmobiles au sommet de Gotham… des Formule 1 sur la ligne arc-en-ciel… et les légendes de Tokyo. »

   GLITCH DE TÉLÉPORTATION (±0,18 s autour de chaque coupe : interne 1,8 / 4,3 / 5,9 / 8,0 / 11,0 / 14,0) : aberration chromatique
   poussée (post.aberration), tranches de l'image décalées + scanlines + bandes numériques (hud, hors zone centrale), flash d'inversion
   de 3 images à l'entrée de chaque monde et à la sortie finale, badge « ⚡ MAP WARP : … » ≤ 0,6 s en haut à gauche.
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
const COUPES_FILM = [1.8, 4.3, 5.9, 8.0, 11.0, 14.0];          // coupes réellement montrées (bords des extraits du remap)
const ENTREES = [{ t: 1.8, nom: 'GOTHAM' }, { t: 5.9, nom: 'CIRCUIT F1' }, { t: 11.0, nom: 'NÉO-TOKYO' }];
const INVERSIONS = [[1.8, 1.85], [5.9, 5.95], [11.0, 11.05], [13.95, 14.01]];   // 3 images à 60 i/s

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
    cles: [{ t: 2.9, label: 'Gotham · Batmobile sur le toit' }, { t: 6.6, label: 'Ligne arc-en-ciel · feux' }, { t: 12.4, label: 'Tokyo · légendes sous la pluie' }],
    maj(t) {
      const k = t < COUPES[0] ? 0 : t < COUPES[1] ? 1 : 2;
      for (let i = 0; i < 3; i++) mondes[i].groupe.visible = i === k;
      actif = mondes[k]; tCourant = t;
      const etat = actif.maj(t);
      const gl = intensiteGlitch(t, COUPES_FILM, 0.18);
      const inversion = INVERSIONS.some(([a, b]) => t >= a && t < b);
      const entree = ENTREES.find((e) => t >= e.t && t <= e.t + 0.6);
      // éclair coloré bref au passage (teinte du rift : cyan / magenta), jamais un voile blanc
      const dC = Math.min(...COUPES_FILM.map((c) => Math.abs(t - c)));
      const eclat = Math.exp(-Math.pow(dC / 0.05, 2));
      etat.post = { ...etat.post, flash: 0.07 * eclat, flashCouleur: teintes[k], flou: 0,
        aberration: (etat.post.aberration || 0.0006) + 0.011 * gl };
      if (gl > 0.02 || inversion || entree) {
        etat.hud = (g, W, H) => dessinerGlitch(g, W, H, { t, g: gl, inversion, source: ctx.renderer.domElement, zone,
          badge: entree ? { texte: entree.nom, tau: t - entree.t } : null });
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
