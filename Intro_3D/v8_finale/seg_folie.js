/* SEGMENT « FOLIE » de la V8 Finale — 44 → 92 s. Toute la folie est sur la PISTE 3D, jamais dans l'interface.

   44,0 → 55,0  LES PARIS         folie_paris.js   smartphone 3D (QUI VA GAGNER ? + 3 gros boutons), pluie de 40 pièces d'or (46,5 s),
                                                  le doigt parie sur MÉGANE (51,0 s), carnet de paris papier « à l'ancienne »
   55,0 → 59,5  LA MEUTE          folie_piste.js   creerActeI (V7) décalé : les 5 bolides de MEUTE sur les 5 voies de la Rainbow Road
   59,5 → 62,0  CAISSES MYSTÈRES  folie_piste.js   5 caisses « ? » éclatées au passage (60,2 s), étoiles d'or
   62,0 → 66,0  LES BOSS          folie_piste.js   les 5 F1 en flèche (63,6 s) puis la Batmobile, post-combustion
   66,0 → 74,0  LES 6 PIÈGES      folie_labo.js    gréements réels de l'Arsenal, carambolages cartoon au contact de plan.pieges
   74,0 → 78,0  RÈGLE DES 41 mm   folie_labo.js    la dorée (41,0 mm) passe, la rouge (40,9 mm) est éjectée (76,2 s)
   78,0 → 88,0  CLIMAX            folie_sprint.js  sprint des 15 bolides vers la caméra, photo-finish figé (86,0 s)
   88,0 → 92,0  CARTE FINALE      folie_sprint.js  GRAND PRIX DE NOËL — 23 DÉCEMBRE — À VOS PARIS !

   Règles tenues : maj(t) fonction pure de t (chaque plan remet tout ce qu'il touche : visibilités, poses, roues, intensités) ;
   jeu de lumières FIXE (6 lumières jamais masquées : aucune recompilation de shader d'un plan à l'autre) ; bolides partagés entre
   les plans, tous masqués puis reposés à chaque image ; HUD : au plus un titre pop de 2–3 mots hors du centre, deux étiquettes
   pour la règle, le texte central réservé à la carte finale. Ne construit que ce qui est montré (15 bolides m3d + 2 clones). */
import { MEUTE, F1, SECRETS } from '../v7_multivers_4k/actes.js';
import { creerParis } from './folie_paris.js';
import { creerPiste } from './folie_piste.js';
import { creerLabo, TITRES } from './folie_labo.js';
import { creerSprint } from './folie_sprint.js';
import { creerLumieresFixes, cloneRecolore, titrePop, clamp, lerp, smoother } from './folie_outils.js';

const EXTRAS = ['TK06', 'H12', 'P01', 'N12'];          // Hatsune Miku AMG, La Grève, K.I.T.T., l'épave : ferment la marche du sprint

export async function creerSegment(ctx) {
  const { THREE, seg, plan, garage } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'seg-folie';
  const lum = creerLumieresFixes(THREE, groupe);

  /* ───────── les bolides (uniquement ceux qu'on montre) ───────── */
  ctx.progression('Folie : bolides…');
  const charger = async (code) => { const v = await garage.m3d(code); v.visible = false; groupe.add(v); return v; };
  const voitures = { meute: [], f1s: [], extras: [] };
  for (const c of MEUTE) voitures.meute.push(await charger(c));
  for (const c of F1) voitures.f1s.push(await charger(c));
  voitures.batmobile = await charger(SECRETS.batmobile);
  for (const c of EXTRAS) voitures.extras.push(await charger(c));
  voitures.megane = voitures.meute[MEUTE.indexOf('FR02')];
  const or = new THREE.MeshPhysicalMaterial({ color: 0xe0ac3c, metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const rouge = new THREE.MeshPhysicalMaterial({ color: 0xd3141c, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  voitures.doree = cloneRecolore(THREE, voitures.meute[1], or); voitures.doree.visible = false; groupe.add(voitures.doree);
  voitures.rouge = cloneRecolore(THREE, voitures.meute[0], rouge); voitures.rouge.visible = false; groupe.add(voitures.rouge);
  const toutes = [...voitures.meute, ...voitures.f1s, voitures.batmobile, ...voitures.extras, voitures.doree, voitures.rouge];

  /* ───────── les plans ───────── */
  ctx.progression('Folie : table des paris…');
  const paris = creerParis(ctx, { lum, voitures });
  ctx.progression('Folie : Rainbow Road…');
  const piste = creerPiste(ctx, { lum, voitures });
  ctx.progression('Folie : labo des pièges…');
  const labo = creerLabo(ctx, { lum, voitures });
  ctx.progression('Folie : sprint final…');
  const sprint = creerSprint(ctx, { lum, voitures });
  groupe.add(paris.groupe, piste.groupe, labo.groupe, sprint.groupe);
  const plans = { paris, piste, labo, sprint };
  const planDe = { paris: 'paris', meute: 'piste', caisses: 'piste', boss: 'piste', pieges: 'labo', regle: 'labo', climax: 'sprint', final: 'sprint' };
  const sousParts = seg.sous || plan.segments.find((s) => s.id === 'folie').sous;
  const sousDe = (t) => (sousParts.find((s) => t >= s.debut && t < s.fin) || sousParts[t < sousParts[0].debut ? 0 : sousParts.length - 1]).id;

  /* ───────── 12 clés de planche ───────── */
  const P = Object.fromEntries(labo.pieges.map((p) => [p.rig, p]));
  const cles = [
    { t: 48.5, label: 'Paris : smartphone + pluie de pièces' },
    { t: 57.0, label: 'La meute sur les 5 voies' },
    { t: 60.8, label: 'Caisses mystères' },
    { t: 63.3, label: 'Boss : F1 en flèche + Batmobile' },
    ...['bascule', 'pelote', 'obus', 'curling'].map((r) => ({ t: +(P[r].contact + 0.14).toFixed(3), label: 'Piège : ' + TITRES[r].charAt(0) + TITRES[r].slice(1).toLowerCase() })),
    { t: 76.5, label: 'Règle des 41 mm' },
    { t: 82.0, label: 'Sprint final' },
    { t: 86.2, label: 'Photo-finish' },
    { t: 90.0, label: 'Carte finale' },
  ];
  if (cles.length !== 12) throw new Error('folie : 12 clés de planche attendues, ' + cles.length);

  /* ───────── habillage : un titre pop au plus, jamais au centre (sauf la carte finale) ───────── */
  function hudDe(t, sous, etat) {
    return (g, W, H, o) => {
      const s = W / 1920;
      if (sous === 'paris') titrePop(g, W, H, o, 'À VOS PARIS !', t, 44.3, 47.4, { taille: 84 });
      else if (sous === 'meute') titrePop(g, W, H, o, "C'EST PARTI !", t, 55.2, 56.9);
      else if (sous === 'caisses') titrePop(g, W, H, o, 'CAISSES MYSTÈRES', t, 59.62, 61.7, { couleur: '#d9b8ff' });
      else if (sous === 'boss') titrePop(g, W, H, o, 'LES BOSS', t, 62.1, 63.5, { couleur: '#9fd0ff' });
      else if (sous === 'pieges') { const p = labo.pieges.find((q) => t >= q.debut && t < q.fin); if (p) titrePop(g, W, H, o, TITRES[p.rig], t, p.debut + 0.04, p.fin - 0.03, { couleur: '#ffd23f' }); }
      else if (sous === 'regle' && etat.proj && t > 74.45 && t < 77.9) {
        const a = clamp((t - 74.45) / 0.25) * clamp((77.9 - t) / 0.2), pr = etat.proj;
        const xo = clamp(pr.xOr ?? 0.3, 0.08, 0.92) * 1920, xr = clamp(pr.xRouge ?? 0.7, 0.08, 0.92) * 1920;
        o.texte(g, s, '41,0 mm', xo, 960, { taille: 66, couleur: '#ffd23f', align: 'center', contour: 8, alpha: a });
        o.texte(g, s, '40,9 mm', xr, 960, { taille: 66, couleur: '#ff5b5b', align: 'center', contour: 8, alpha: a * (t < 76.2 ? 1 : 1) });
      } else if (sous === 'climax') {
        titrePop(g, W, H, o, 'SPRINT FINAL', t, 78.15, 80.2);
        titrePop(g, W, H, o, 'PHOTO-FINISH !', t, 86.03, 87.35, { couleur: '#ffffff' });
      } else if (sous === 'final') {
        const ligne = (str, y, taille, couleur, t0) => {
          const a = t - t0; if (a < 0) return;
          const k = a < 0.14 ? lerp(0.4, 1.1, smoother(a / 0.14)) : a < 0.3 ? lerp(1.1, 1, smoother((a - 0.14) / 0.16)) : 1;
          g.save(); g.translate(960 * s, y * s); g.scale(k, k);
          o.texte(g, s, str, 0, 0, { taille, couleur, align: 'center', contour: 10, espace: 3, alpha: clamp((91.95 - t) / 0.4) });
          g.restore();
        };
        ligne('GRAND PRIX DE NOËL', 440, 124, '#ffffff', 88.2);
        ligne('23 DÉCEMBRE', 570, 92, '#ffd23f', 88.6);
        const arc = g.createLinearGradient(-330 * s, 0, 330 * s, 0);                 // repère local de la ligne (translatée au centre)
        ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'].forEach((c, i) => arc.addColorStop(i / 4, c));
        ligne('À VOS PARIS !', 712, 112, arc, 89.0);
      }
    };
  }

  return {
    id: 'folie', groupe, cles,
    maj(t) {
      const sous = sousDe(t), nom = planDe[sous];
      for (const v of toutes) v.visible = false;                              // chaque plan repose les bolides qu'il montre
      for (const [k, p] of Object.entries(plans)) p.groupe.visible = k === nom;
      lum.eteindre();
      piste.reinit(t);
      const apres = [];
      const e = nom === 'paris' ? plans.paris.maj(t) : plans[nom].maj(t, sous, apres);
      return {
        camera: e.camera, fond: e.fond, brouillard: e.brouillard, lumieres: e.lumieres, post: e.post,
        hud: hudDe(t, sous, e),
        apres: (camera) => { for (const fn of apres) fn(camera); },
      };
    },
  };
}
