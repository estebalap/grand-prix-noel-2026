/* SEGMENT « ECURIES » de la V8 Finale — 14 → 44 s : les 15 écuries, 2,0 s de gloire chacune, « écran de sélection ».

   Pour chaque écurie k (créneau [debut, impact = debut + 0,8, fin = debut + 2,0] lu dans plan_v8.json → ecuries) :
     PHASE A (debut → impact, 0,8 s) : le Concept-Car de l'écurie (Showroom) et son bolide m3d ailier foncent dans leur MONDE
        NATIF (décors V7 : Vallée sucrée sous les bonbons, Observatoire stellaire, Jardin impérial…) vers le portail dimensionnel.
        Caméra de poursuite RAPPROCHÉE en orbite autour du bolide (distance calculée sur sa taille réelle : il occupe ~45 % de la
        largeur de l'image), aucun tremblement ; le portail entre dans le champ et avale le bolide pile à l'impact.
     IMPACT (debut + 0,8 s, éclat musical de l'écurie) : flash franc teinté de la couleur du monde + coupe sèche.
     PHASE B (impact → fin, 1,2 s) : le bolide JAILLIT de la porte jumelle du Ring et part en drift lourd jusqu'à son
        emplacement (trajectoires physiques V7 scenarioEcurie) ; caméra de face-trois-quarts qui l'accompagne et resserre.
   Habillage : UNE bannière pop en bas à gauche (ecuries_bandeau.js) — #numéro, NOM DE L'ÉCURIE, pilote · bolide. Rien d'autre.

   Entrée à 14 s : coupe sèche depuis la vue d'arène du salon vers le monde natif de l'écurie #01 (le badge pop au même instant).

   Déterminisme (règle 5) : maj(t) est une fonction pure de t. Tout ce qui est touché (visibilités, poses, roues, portails,
   uniforms, pastilles, post-combustion, reflets) est remis à chaque image. Les 15 mondes sont construits UNE fois, dans
   l'ordre 0..14, au chargement (gestion.prechauffer de la V7, cache sans éviction) : aucun ordre de rendu ne dépend de
   l'historique des images. Aucun Math.random() hors ctx.avecAlea. */
import { scenarioEcurie, MONDES, creerPortail, creerRing, creerGestionnaireMondes } from '../v7_multivers_4k/mondes_et_portails.js';
import { creerFumee, creerGomme } from '../v7_multivers_4k/effets_cgi.js';
import { creerBandeau } from './ecuries_bandeau.js';

const FOND_RING = 0x04050c;
/** Brouillard d'un monde natif plafonné et teinté de sa nuit (identique à la V7.1 : aucun monde délavé) */
const brouillardMonde = (dc, m) => ({ couleur: m.ciel, densite: Math.min(0.0016, ((dc.brouillard && dc.brouillard.densite) || 0.002) * 0.32) });
const hash01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Éclairs d'orage pilotés par t (mondes à orage) — même loi que la V7 */
const eclairMonde = (t, seed) => { let v = 0; for (let i = 0; i < 6; i++) { const te = i * 1.31 + hash01(seed + i) * 0.9, d = (t % 7.9) - te; if (d >= 0 && d < 0.3) v = Math.max(v, d < 0.05 ? 1 : d < 0.11 ? 0.15 : d < 0.18 ? 0.8 : 0.3 * (1 - d / 0.3)); } return v; };

/* ───────── réalisation : un plan-type de poursuite par écurie (angles en degrés depuis l'AVANT du bolide) ─────────
   a0 → a1 : orbite pendant la phase A (≥ 95° en fin de phase : le portail entre dans le champ devant le bolide)
   h0 → h1 : hauteur de caméra (cm au-dessus du bolide) ; fov : focale verticale ; frac : part de la largeur occupée par le bolide
   b0 → b1 : orbite de la phase B dans le Ring (face-trois-quarts → trois-quarts), hb : hauteur, cote : côté de la caméra (±1),
   fracB : part de la largeur occupée dans le Ring (0,44 par défaut) ; avance : visée en avant du bolide, en longueurs (0,18 par défaut) */
const PLANS = [
  { a0: 40, a1: 105, h0: 3.0, h1: 4.2, fov: 40, frac: 0.46, b0: 28, b1: 70, hb: 3.4, cote: 1 },     // #01 Route 66 : 3/4 avant bas → profil
  { a0: 70, a1: 120, h0: 6.5, h1: 4.5, fov: 40, frac: 0.44, b0: 34, b1: 78, hb: 4.0, cote: -1 },    // #02 Vallée sucrée : sous les bonbons
  { a0: 25, a1: 100, h0: 2.0, h1: 3.2, fov: 38, frac: 0.46, b0: 24, b1: 64, hb: 2.8, cote: 1 },     // #03 Stroboscope : rase-bitume
  { a0: 95, a1: 140, h0: 5.0, h1: 5.5, fov: 40, frac: 0.44, b0: 30, b1: 72, hb: 4.2, cote: -1 },    // #04 Tapis de cartes : poursuite
  { a0: 72, a1: 108, h0: 4.0, h1: 6.0, fov: 27, frac: 0.46, b0: 36, b1: 80, hb: 3.6, cote: 1, avance: 0.42 },     // #05 Saut du château : le saut de profil (panneau « COMBAT ! » hors du bord du cadre)
  { a0: 45, a1: 110, h0: 3.6, h1: 4.4, fov: 40, frac: 0.46, b0: 26, b1: 68, hb: 3.2, cote: -1 },    // #06 Scène symphonique
  { a0: 60, a1: 125, h0: 8.0, h1: 5.0, fov: 40, frac: 0.44, b0: 32, b1: 74, hb: 4.4, cote: 1 },     // #07 Forêt ancienne : légère plongée
  { a0: 32, a1: 58, h0: 5.0, h1: 4.4, fov: 36, frac: 0.64, b0: 30, b1: 58, hb: 3.6, cote: -1, fracB: 0.62 },     // #08 Autoroute sous la pluie : 3/4 avant serré, dépanneuse + A4 remorquée lisibles
  { a0: 85, a1: 120, h0: 4.0, h1: 7.5, fov: 44, frac: 0.42, b0: 34, b1: 78, hb: 3.8, cote: 1 },     // #09 Piqué stratosphérique : saut
  { a0: 110, a1: 145, h0: 4.5, h1: 4.0, fov: 40, frac: 0.44, b0: 28, b1: 70, hb: 3.4, cote: -1 },   // #10 Éclipse rouge : poursuite
  { a0: 50, a1: 112, h0: 5.0, h1: 4.0, fov: 40, frac: 0.46, b0: 30, b1: 72, hb: 3.6, cote: 1 },     // #11 Observatoire stellaire
  { a0: 35, a1: 105, h0: 3.0, h1: 4.0, fov: 40, frac: 0.46, b0: 26, b1: 68, hb: 3.2, cote: -1 },    // #12 Caire crépusculaire
  { a0: 70, a1: 118, h0: 3.6, h1: 4.4, fov: 40, frac: 0.44, b0: 30, b1: 74, hb: 3.6, cote: 1 },     // #13 Col de montagne : drift
  { a0: 40, a1: 108, h0: 2.4, h1: 3.4, fov: 38, frac: 0.46, b0: 24, b1: 66, hb: 3.0, cote: -1 },    // #14 Grille néon
  { a0: 55, a1: 115, h0: 5.5, h1: 4.4, fov: 40, frac: 0.46, b0: 32, b1: 76, hb: 3.8, cote: 1 },     // #15 Jardin impérial
];
/** Instant de la planche de contrôle (temps local dans le créneau) pour les 6 écuries imposées */
const CLES = { 0: 0.55, 1: 0.5, 4: 0.6, 7: 0.55, 10: 0.5, 14: 0.55 };

export async function creerSegment(ctx) {
  const { THREE, garage, poser, animer, avecAlea, outils, plan, equipes } = ctx;
  const { clamp, lerp, smoother } = outils;
  const groupe = new THREE.Group(); groupe.name = 'seg-ecuries';
  const slots = plan.ecuries.map((e) => ({ ...e }));
  if (slots.length !== 15) throw new Error('seg_ecuries : 15 créneaux attendus dans plan_v8.json → ecuries');
  const N = slots.length;

  /* ═════════════ scénarios physiques (V7) : monde → portail → Ring ═════════════ */
  const scenarios = slots.map((s) => scenarioEcurie(s.k, s));
  const T_PARK = (sc) => sc.slot.impact + 5.0;
  const poseRing = (sc, t, ailier = false) => (ailier ? sc.B2 : sc.B).pose(Math.min(t, T_PARK(sc)));
  const poseMonde = (sc, t, ailier = false) => (ailier ? sc.A2 : sc.A).pose(t);

  /* ═════════════ les 15 binômes : Concept-Car du Showroom + bolide m3d ailier ═════════════ */
  ctx.progression('Écuries : concept-cars…');
  const concepts = equipes.slice(0, N).map((e) => garage.concept(e.id));
  const ailiers = [];
  for (let k = 0; k < N; k++) { ctx.progression(`Écuries : bolide ${k + 1}/${N}…`); ailiers.push(await garage.m3d(MONDES[k].ailier)); }
  for (const v of [...concepts, ...ailiers]) { v.visible = false; groupe.add(v); }
  // reflets sur le sol d'obsidienne du Ring : seulement pour le binôme courant (les garés restent sans reflet : économie)
  const miroirs = concepts.map((c) => { const m = ctx.decors.creerMiroirModele(THREE, c); m.racine.visible = false; groupe.add(m.racine); return m; });
  const mirAil = ailiers.map((c) => { const m = ctx.decors.creerMiroirModele(THREE, c); m.racine.visible = false; groupe.add(m.racine); return m; });

  /* ═════════════ Ring commun + portes jumelles (une par écurie) ═════════════ */
  const ring = avecAlea('ecuries-ring', () => creerRing(THREE, { envMap: ctx.envMap, equipes }));
  groupe.add(ring.groupe);
  const portes = MONDES.map((m, k) => {
    const p = avecAlea('ecuries-porte' + k, () => creerPortail(THREE, m.accent, m.acc2, { graine: 100 + m.id, rayon: 9 }));
    const sc = scenarios[k]; p.groupe.position.set(...sc.porteRing.pos); p.groupe.position.y = 9.6; p.groupe.rotation.y = sc.porteRing.yaw;
    p.groupe.visible = false; ring.groupe.add(p.groupe); return p;
  });

  /* ═════════════ sillage du drift dans le Ring : fumée de pneus + rubans de gomme (précalculés, évalués dans les shaders) ═════════════ */
  const fumee = creerFumee(THREE, '#d3d6e4'), gomme = creerGomme(THREE);
  scenarios.forEach((sc, k) => {
    const recul = concepts[k].v7.L * 0.42;
    const rf = (t) => { const p = sc.B.pose(t, { sansSuspension: true }), c = Math.cos(p.cap), s = Math.sin(p.cap); return { p: [p.pos[0] - s * recul, 0, p.pos[2] - c * recul], gauche: [c, -s], pos: p.pos }; };
    const t0 = sc.slot.impact + 0.06, t1 = sc.slot.impact + 1.1;
    fumee.emettre({ poseFn: (t) => rf(t).p, t0, t1, pas: 0.035, vie: 1.0, taille: 2.0, deriveVent: [0.5, 0, 0.3], graine: k * 7 + 1 });
    for (const dec of [-1.4, 1.4]) gomme.tracer({ poseFn: rf, t0, t1, pas: 0.03, decalage: dec, largeur: 0.9 });
  });
  fumee.figer(); gomme.figer(); ring.groupe.add(fumee.objet, gomme.objet);

  /* ═════════════ les 15 mondes natifs : construits une fois, dans l'ordre, jamais libérés ═════════════ */
  const gestion = creerGestionnaireMondes({ THREE, renderer: ctx.renderer, envMap: ctx.envMap, decors: ctx.decors, avecAlea, cars: ctx.cars, max: MONDES.length });
  gestion.prechauffer(scenarios, groupe, (k) => ctx.progression(`Écuries : monde natif ${k + 1}/${N}…`));
  const mondes = scenarios.map((sc) => gestion.cache.get(sc.k));
  /* #08 (Autoroute sous la pluie) : le tube néon du bord de route côté caméra (+z) passait entre l'objectif et la dépanneuse
     + A4 remorquée ; on le retire une fois pour toutes (réglage constant, construit avant la première image : déterministe).
     Le tube du bord opposé reste : il garde l'identité « autoroute ». */
  {
    const k8 = MONDES.findIndex((m) => m.id === 8), e8 = mondes[k8], i8 = ['bandes', ...MONDES[k8].fx].indexOf('bandes_pluie');
    const g8 = i8 >= 0 ? e8.fx[i8].groupe : null, b = new THREE.Box3(), c = new THREE.Vector3();
    if (g8 && g8.children.length) {
      const zc = (o) => { b.setFromObject(o); return b.getCenter(c).z; };
      const proche = g8.children.reduce((x, y) => (zc(y) > zc(x) ? y : x));
      proche.visible = false;
    }
  }

  /* ═════════════ habillage ═════════════ */
  const cc = await ctx.importerShared('concept_cars.js');
  const bandeau = creerBandeau({ equipes, infoConcept: (id) => cc.conceptInfo(id), logos: ctx.logos });

  /* ═════════════ caméras ═════════════ */
  const aspect = ctx.L / ctx.H;
  /** distance pour que le bolide (longueur L, largeur W vues sous l'angle a) occupe `frac` de la largeur de l'image */
  const distance = (v, aDeg, fov, frac) => {
    const a = aDeg * Math.PI / 180, eff = Math.abs(Math.sin(a)) * v.L + Math.abs(Math.cos(a)) * v.largeur;
    const demiL = Math.tan(fov * Math.PI / 360) * aspect;
    return Math.max(10, eff / (frac * 2 * demiL));
  };
  /** Phase A : orbite de poursuite dans le repère du monde (avant = +x·dir, la caméra reste côté +z, face au décor) */
  function cameraMonde(sc, t) {
    const P = PLANS[sc.k], u = clamp((t - sc.slot.debut) / sc.TA), e = smoother(u);
    const h = sc.A.pose(t, { sansSuspension: true }).pos, c = concepts[sc.k].v7;
    const a = lerp(P.a0, P.a1, e), ar = a * Math.PI / 180, fov = P.fov;
    const D = distance(c, a, fov, P.frac) * lerp(1.0, 0.93, e);
    const F = [sc.dir, 0, 0], Z = [0, 0, 1];
    const p = [h[0] + F[0] * D * Math.cos(ar), h[1] * 0.6 + lerp(P.h0, P.h1, e), h[2] + Z[2] * D * Math.sin(ar)];
    const vise = [h[0] + F[0] * c.L * (P.avance ?? 0.18), h[1] * 0.85 + c.hauteur * 0.45, h[2]];
    return { p, c: vise, fov, roll: 0.02 * (sc.k % 2 ? 1 : -1) * e };
  }
  /** Phase B : la caméra accompagne le drift, face-trois-quarts → trois-quarts, dans le repère radial de l'emplacement */
  function cameraRing(sc, t) {
    const P = PLANS[sc.k], u = clamp((t - sc.slot.impact) / (sc.slot.fin - sc.slot.impact)), e = smoother(u);
    const h = sc.B.pose(t, { sansSuspension: true }).pos, c = concepts[sc.k].v7, th = sc.emplacement.theta;
    const F = [-Math.cos(th), 0, -Math.sin(th)], T = [-Math.sin(th) * P.cote, 0, Math.cos(th) * P.cote];
    const a = lerp(P.b0, P.b1, e), ar = a * Math.PI / 180, fov = 36;
    const D = distance(c, a, fov, P.fracB || 0.44) * lerp(1.08, 0.9, e);
    const p = [h[0] + (F[0] * Math.cos(ar) + T[0] * Math.sin(ar)) * D, P.hb + 0.8 * e, h[2] + (F[2] * Math.cos(ar) + T[2] * Math.sin(ar)) * D];
    return { p, c: [h[0], c.hauteur * 0.45, h[2]], fov, roll: 0 };
  }

  /* ═════════════ état « tout éteint » remis à chaque image ═════════════ */
  function masquer() {
    for (let j = 0; j < N; j++) {
      concepts[j].visible = false; ailiers[j].visible = false; miroirs[j].racine.visible = false; mirAil[j].racine.visible = false;
      portes[j].groupe.visible = false; mondes[j].groupe.visible = false;
      ring.pastilles[j].material.opacity = 0;
    }
    ring.groupe.visible = false; fumee.objet.visible = false; gomme.objet.visible = false;
  }
  const slotA = (t) => { for (let k = 0; k < N; k++) if (t < slots[k].fin) return k; return N - 1; };

  const cles = Object.entries(CLES).map(([k, d]) => ({ t: +(slots[k].debut + d).toFixed(3), label: `Écurie ${bandeau.fiches[k].numero} · ${equipes[k].name}` }));

  return {
    id: 'ecuries', groupe, cles,
    maj(t) {
      masquer();
      const k = slotA(t), sc = scenarios[k], slot = sc.slot, m = MONDES[k], hero = concepts[k], ail = ailiers[k];
      const tau = t - slot.debut, dI = t - slot.impact, apres = [];
      let cam, fond, brouillard, lumieres;
      hero.visible = ail.visible = true;
      if (t < slot.impact) {
        /* ── PHASE A : monde natif ── */
        const e = mondes[k], dc = e.decor, uA = clamp(tau / sc.TA);
        e.groupe.visible = true;
        poser(hero, poseMonde(sc, t)); poser(ail, poseMonde(sc, t, true), { lateral: 5.5 }); animer(hero, t);
        e.portail.maj(t, smoother((uA - 0.05) / 0.45), uA > 0.7 ? (uA - 0.7) / 0.3 : 0);
        apres.push((camera) => {
          dc.maj(t, 0, camera, ctx.H);
          if (dc.eclair) { const ev = eclairMonde(t, m.id); dc.eclair.u.value = ev * 0.85; dc.eclair.lum.intensity = dc.eclair.base * (1 + ev * 3.2); }
          for (const f of e.fx) f.maj(t, camera, ctx.H);
        });
        cam = cameraMonde(sc, t); fond = m.ciel; brouillard = brouillardMonde(dc, m); lumieres = { hemi: 0.16, cle: 0.24 };
      } else {
        /* ── PHASE B : jaillissement dans le Ring + drift jusqu'à l'emplacement ── */
        ring.groupe.visible = true;
        ring.maj(t, Math.exp(-Math.max(0, dI) * 5) * 0.8, k + 1, 0);
        for (let j = 0; j < k; j++) {                                     // les écuries déjà présentées attendent, garées
          const s2 = scenarios[j]; concepts[j].visible = ailiers[j].visible = true;
          poser(concepts[j], poseRing(s2, t)); poser(ailiers[j], poseRing(s2, t, true)); animer(concepts[j], t);
          ring.pastilles[j].material.opacity = 0.9;
        }
        ring.pastilles[k].material.opacity = 0.9 * smoother((dI - 0.9) / 0.3);
        poser(hero, poseRing(sc, t)); poser(ail, poseRing(sc, t, true)); animer(hero, t);
        miroirs[k].racine.visible = true; miroirs[k].sync(); mirAil[k].racine.visible = true; mirAil[k].sync();
        const ouv = 0.8 * smoother((dI + 0.04) / 0.1) * (1 - smoother((dI - 0.06) / 0.24));   // la porte se referme derrière le bolide : elle ne brûle pas le fond
        portes[k].groupe.visible = true; portes[k].maj(t, ouv, ouv * 0.4, 0);
        fumee.objet.visible = gomme.objet.visible = true;
        apres.push((camera) => { fumee.maj(t, camera, ctx.H); gomme.maj(t); });
        cam = cameraRing(sc, t); fond = FOND_RING; brouillard = ring.brouillard; lumieres = { hemi: 0.42, cle: 0.6 };
      }

      /* ── post : flash franc au temps fort (teinté de la couleur du monde), léger flou radial à la sortie du portail ── */
      const flash = 0.6 * Math.exp(-Math.pow(dI / 0.05, 2)) + (dI >= 0 ? 0.15 * Math.exp(-dI * 14) : 0);
      const teinte = new THREE.Color(m.accent).lerp(new THREE.Color(1, 0.94, 0.84), 0.6);
      const post = {
        exposition: dI < 0 ? 0.9 - 0.32 * smoother((dI + 0.28) / 0.22) : 0.88 - 0.3 * Math.exp(-dI * 7),   // l'iris du portail ne brûle pas l'image vignette: 0.5, saturation: 1.06, bloomForce: 0.3 - 0.16 * Math.exp(-Math.pow(dI / 0.2, 2)),
        flash, flashCouleur: [teinte.r, teinte.g, teinte.b],
        flou: dI >= 0 ? 0.35 * Math.exp(-dI * 9) : 0, centreFlou: [0.5, 0.5], aberration: 0.0006 + (dI >= 0 ? 0.003 * Math.exp(-dI * 8) : 0),
      };
      // petit coup de focale au jaillissement (sans tremblement)
      const fov = cam.fov * (dI >= 0 ? 1 + 0.06 * Math.exp(-dI * 8) : 1);

      return {
        camera: { p: cam.p, c: cam.c, fov, roll: cam.roll, near: 0.5, far: 4000 },
        fond, brouillard, lumieres, post,
        apres: (camera) => { for (const fn of apres) fn(camera); },
        hud: (g, W, H) => bandeau.dessiner(g, W, H, k, tau, slot.impact - slot.debut, slot.fin - slot.debut),
      };
    },
  };
}
