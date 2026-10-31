/* SEGMENT « ECURIES » de la V8 Finale — les 15 écuries, présentation CALME et lisible façon « écran de sélection ».

   Tous les temps viennent de plan_v8.json → ecuries[k] = { debut, impact, fin } (aujourd'hui 3,0 s par écurie, impact à mi-créneau).
   Pour chaque écurie k, UNE SEULE voiture à l'écran : le Concept-Car du Showroom de l'écurie.
     PHASE A (debut → impact) : le Concept-Car roule à allure tranquille et constante dans son MONDE NATIF (décors V7 :
        Vallée sucrée sous les bonbons, Observatoire stellaire, Jardin impérial…) sur la trajectoire du monde, à plat.
        Travelling latéral lent qui tourne doucement autour de lui (distance calculée sur sa taille réelle : ~45 % de la largeur
        de l'image), aucun coup de zoom, aucun tremblement. Le portail dimensionnel l'attend au bout de la route.
     IMPACT : il franchit le portail en douceur — fondu lumineux court teinté de la couleur du monde (pas de flash blanc).
     PHASE B (impact → fin) : il ressort de la porte jumelle du Ring et vient se poser, en décélérant régulièrement, devant sa
        place (aucun dérapage) ; la caméra l'accompagne en orbite lente puis le tient en pose héroïque. Seule sa pastille s'allume.
   Habillage : UNE bannière douce en bas à gauche (ecuries_bandeau.js) — #numéro, NOM DE L'ÉCURIE, pilote · bolide. Rien d'autre.

   Déterminisme (règle 5) : maj(t) est une fonction pure de t ; tout ce qui est touché est remis à chaque image. Les 15 mondes
   sont construits UNE fois, dans l'ordre 0..14 (gestion.prechauffer de la V7, cache sans éviction). Aucun Math.random() hors
   ctx.avecAlea. */
import { scenarioEcurie, MONDES, creerPortail, creerRing, creerGestionnaireMondes, angleEcurie, RING } from '../v7_multivers_4k/mondes_et_portails.js';
import { creerBandeau } from './ecuries_bandeau.js';

const FOND_RING = 0x04050c;
/** Brouillard d'un monde natif plafonné et teinté de sa nuit (identique à la V7.1 : aucun monde délavé) */
const brouillardMonde = (dc, m) => ({ couleur: m.ciel, densite: Math.min(0.0016, ((dc.brouillard && dc.brouillard.densite) || 0.002) * 0.32) });
const hash01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Éclairs d'orage pilotés par t (mondes à orage) — même loi que la V7 */
const eclairMonde = (t, seed) => { let v = 0; for (let i = 0; i < 6; i++) { const te = i * 1.31 + hash01(seed + i) * 0.9, d = (t % 7.9) - te; if (d >= 0 && d < 0.3) v = Math.max(v, d < 0.05 ? 1 : d < 0.11 ? 0.15 : d < 0.18 ? 0.8 : 0.3 * (1 - d / 0.3)); } return v; };
const gauss = (x) => Math.exp(-x * x);

/* ───────── réalisation : un plan par écurie (angles en degrés depuis l'AVANT du bolide) ─────────
   a0 → a1 : orbite LENTE de la phase A (vitesse angulaire constante) ; h0 → h1 : hauteur de caméra (cm au-dessus du sol) ;
   fov : focale verticale ; frac : part de la largeur de l'image occupée par le bolide ; avance : visée en avant du bolide
   (en longueurs) ; v : allure dans le monde (cm/s) ;
   b0 → b1 : orbite de la phase B dans le Ring (face-trois-quarts → trois-quarts) ; hb : hauteur ; cote : côté (±1) ;
   fracB : part de la largeur occupée dans le Ring ; recul : le portail du monde est avancé de `recul` cm sur la route (relief). */
const DEFAUT = { recul: 0, h0: 4.0, h1: 4.4, fov: 38, frac: 0.46, avance: 0.15, v: 22, b0: 28, b1: 50, hb: 3.6, cote: 1, fracB: 0.46 };
const PLANS = [
  { a0: 62, a1: 84 },                                         // #01 Route 66 : profil 3/4 avant, braises au loin
  { a0: 74, a1: 96, h0: 5.5, h1: 5.0, cote: -1 },            // #02 Vallée sucrée : sous les bonbons
  { a0: 56, a1: 80, h0: 2.8, h1: 3.2 },                      // #03 Stroboscope : caméra basse
  { a0: 80, a1: 102, h0: 5.0, h1: 5.4, cote: -1 },           // #04 Tapis de cartes
  { a0: 72, a1: 92, fov: 30, avance: 0.32 },                 // #05 Saut du château : panneau « COMBAT ! » hors du cadre
  { a0: 58, a1: 82, h0: 3.6, h1: 4.2, cote: -1 },            // #06 Scène symphonique
  { a0: 66, a1: 90, h0: 6.5, h1: 5.4, recul: 26 },          // #07 Forêt ancienne : légère plongée, arrivée avant la butte
  { a0: 36, a1: 54, h0: 5.0, h1: 4.6, fov: 36, frac: 0.64, cote: -1, fracB: 0.62, b0: 30, b1: 48 },   // #08 Autoroute : 3/4 avant serré, A4 remorquée lisible
  { a0: 70, a1: 92, h0: 4.6, h1: 5.2 },                      // #09 Piqué stratosphérique
  { a0: 84, a1: 106, h0: 4.5, h1: 4.2, cote: -1 },           // #10 Éclipse rouge
  { a0: 60, a1: 84, h0: 4.8, h1: 4.2 },                      // #11 Observatoire stellaire
  { a0: 56, a1: 80, h0: 3.4, h1: 4.0, cote: -1 },            // #12 Caire crépusculaire
  { a0: 70, a1: 92, h0: 3.8, h1: 4.4 },                      // #13 Col de montagne
  { a0: 58, a1: 82, h0: 3.0, h1: 3.6, cote: -1 },            // #14 Grille néon
  { a0: 64, a1: 88, h0: 5.0, h1: 4.4 },                      // #15 Jardin impérial
].map((p) => ({ ...DEFAUT, ...p }));
/** Instant de la planche de contrôle (temps local dans le créneau, en fraction du créneau) pour les 6 écuries imposées */
const CLES = { 0: 0.33, 1: 0.33, 4: 0.33, 7: 0.33, 10: 0.85, 14: 0.85 };

export async function creerSegment(ctx) {
  const { THREE, garage, poser, animer, avecAlea, outils, plan, equipes } = ctx;
  const { clamp, lerp, smoother } = outils;
  const groupe = new THREE.Group(); groupe.name = 'seg-ecuries';
  const slots = plan.ecuries.map((e) => ({ ...e }));
  if (slots.length !== 15) throw new Error('seg_ecuries : 15 créneaux attendus dans plan_v8.json → ecuries');
  const N = slots.length;

  /* ═════════════ scénarios V7 : servent au tracé de la route du monde natif et à l'emplacement du portail ═════════════ */
  const scenarios = slots.map((s) => scenarioEcurie(s.k, s));

  /* ═════════════ les 15 Concept-Cars du Showroom (la seule voiture de chaque plan) ═════════════ */
  ctx.progression('Écuries : concept-cars…');
  const concepts = equipes.slice(0, N).map((e) => garage.concept(e.id));
  for (const v of concepts) { v.visible = false; groupe.add(v); }
  // reflet sur le sol d'obsidienne du Ring (copie du seul Concept-Car courant)
  const miroirs = concepts.map((c) => { const m = ctx.decors.creerMiroirModele(THREE, c); m.racine.visible = false; groupe.add(m.racine); return m; });

  /* ═════════════ Ring commun + portes jumelles ═════════════ */
  const ring = avecAlea('ecuries-ring', () => creerRing(THREE, { envMap: ctx.envMap, equipes }));
  groupe.add(ring.groupe);
  const portes = MONDES.map((m, k) => {
    const p = avecAlea('ecuries-porte' + k, () => creerPortail(THREE, m.accent, m.acc2, { graine: 100 + m.id, rayon: 9 }));
    const sc = scenarios[k]; p.groupe.position.set(...sc.porteRing.pos); p.groupe.position.y = 9.6; p.groupe.rotation.y = sc.porteRing.yaw;
    p.groupe.visible = false; ring.groupe.add(p.groupe); return p;
  });

  /* ═════════════ les 15 mondes natifs : construits une fois, dans l'ordre, jamais libérés ═════════════ */
  const gestion = creerGestionnaireMondes({ THREE, renderer: ctx.renderer, envMap: ctx.envMap, decors: ctx.decors, avecAlea, cars: ctx.cars, max: MONDES.length });
  gestion.prechauffer(scenarios, groupe, (k) => ctx.progression(`Écuries : monde natif ${k + 1}/${N}…`));
  const mondes = scenarios.map((sc) => gestion.cache.get(sc.k));
  /* #08 (Autoroute sous la pluie) : le tube néon du bord de route côté caméra (+z) passait entre l'objectif et la dépanneuse
     + A4 remorquée ; on le retire une fois pour toutes (réglage constant, avant la première image : déterministe). */
  {
    const k8 = MONDES.findIndex((m) => m.id === 8), e8 = mondes[k8], i8 = ['bandes', ...MONDES[k8].fx].indexOf('bandes_pluie');
    const g8 = i8 >= 0 ? e8.fx[i8].groupe : null, b = new THREE.Box3(), c = new THREE.Vector3();
    if (g8 && g8.children.length) {
      const zc = (o) => { b.setFromObject(o); return b.getCenter(c).z; };
      g8.children.reduce((x, y) => (zc(y) > zc(x) ? y : x)).visible = false;
    }
  }

  /* ═════════════ habillage ═════════════ */
  const cc = await ctx.importerShared('concept_cars.js');
  const bandeau = creerBandeau({ equipes, infoConcept: (id) => cc.conceptInfo(id), logos: ctx.logos });

  /* ═════════════ trajectoires calmes (fonctions pures de t) ═════════════ */
  const pose = (pos, cap, dist, heave = 0) => ({ pos, cap, capVitesse: cap, heave, tangage: 0, pente: 0, roulis: 0, dist, braquage: 0, coins: {} });
  /** Phase A : allure constante sur la route du monde (tracé V7 à plat), arrivée au portail pile à l'impact */
  function poseMonde(k, t) {
    const sc = scenarios[k], slot = slots[k], v = PLANS[k].v;
    const s = sc.sPortail - PLANS[k].recul - v * (slot.impact - t), p = sc.spA.point(s), T = sc.spA.tangente(s);
    return pose([p[0], 0, p[2]], Math.atan2(T[0], T[2]), s, 0.04 * Math.sin(t * 9 + k));
  }
  /** Phase B : sortie de la porte du Ring, décélération régulière (quadratique) jusqu'à l'arrêt devant la place, puis immobile */
  const R0 = RING.RG - 9, R1 = RING.RS + 14, T_ROULE = (k) => Math.min(1.25, (slots[k].fin - slots[k].impact) * 0.85);
  function poseRing(k, t) {
    const th = angleEcurie(k), x = clamp((t - slots[k].impact) / T_ROULE(k)), d = (R0 - R1) * (1 - (1 - x) * (1 - x));
    const r = R0 - d;
    return pose([Math.cos(th) * r, 0, Math.sin(th) * r], Math.atan2(-Math.cos(th), -Math.sin(th)), d, x < 1 ? 0.03 * Math.sin(t * 8 + k) : 0);
  }

  /* ═════════════ caméras lentes ═════════════ */
  const aspect = ctx.L / ctx.H;
  /** distance pour que le bolide (longueur L, largeur W vues sous l'angle a) occupe `frac` de la largeur de l'image */
  const distance = (v, aDeg, fov, frac) => {
    const a = aDeg * Math.PI / 180, eff = Math.abs(Math.sin(a)) * v.L + Math.abs(Math.cos(a)) * v.largeur;
    return Math.max(10, eff / (frac * 2 * Math.tan(fov * Math.PI / 360) * aspect));
  };
  /** Phase A : travelling latéral (axes fixes du monde : avant = +x·dir, caméra côté +z), orbite à vitesse angulaire constante */
  function cameraMonde(k, t) {
    const sc = scenarios[k], P = PLANS[k], u = clamp((t - slots[k].debut) / (slots[k].impact - slots[k].debut));
    const h = poseMonde(k, t).pos, c = concepts[k].v7, a = lerp(P.a0, P.a1, u), ar = a * Math.PI / 180;
    const D = distance(c, a, P.fov, P.frac);
    const p = [h[0] + sc.dir * D * Math.cos(ar), lerp(P.h0, P.h1, u), h[2] + D * Math.sin(ar)];
    return { p, c: [h[0] + sc.dir * c.L * P.avance, c.hauteur * 0.45, h[2]], fov: P.fov };
  }
  /** Phase B : orbite lente autour du bolide qui se pose (repère radial de sa place) */
  function cameraRing(k, t) {
    const P = PLANS[k], u = clamp((t - slots[k].impact) / (slots[k].fin - slots[k].impact)), e = smoother(u * 0.5 + 0.5) * 2 - 1;  // vitesse non nulle à la coupe, s'amortit
    const h = poseRing(k, t).pos, c = concepts[k].v7, th = angleEcurie(k);
    const F = [-Math.cos(th), 0, -Math.sin(th)], T = [-Math.sin(th) * P.cote, 0, Math.cos(th) * P.cote];
    const a = lerp(P.b0, P.b1, e), ar = a * Math.PI / 180, fov = 36, D = distance(c, a, fov, P.fracB);
    const p = [h[0] + (F[0] * Math.cos(ar) + T[0] * Math.sin(ar)) * D, P.hb, h[2] + (F[2] * Math.cos(ar) + T[2] * Math.sin(ar)) * D];
    return { p, c: [h[0], c.hauteur * 0.45, h[2]], fov };
  }

  /* ═════════════ état « tout éteint » remis à chaque image ═════════════ */
  function masquer() {
    for (let j = 0; j < N; j++) {
      concepts[j].visible = false; miroirs[j].racine.visible = false; portes[j].groupe.visible = false; mondes[j].groupe.visible = false;
      ring.pastilles[j].material.opacity = 0;
    }
    ring.groupe.visible = false;
  }
  const slotA = (t) => { for (let k = 0; k < N; k++) if (t < slots[k].fin) return k; return N - 1; };

  const cles = Object.entries(CLES).map(([k, f]) => ({ t: +(slots[k].debut + f * (slots[k].fin - slots[k].debut)).toFixed(3), label: `Écurie ${bandeau.fiches[k].numero} · ${equipes[k].name}` }));

  return {
    id: 'ecuries', groupe, cles,
    maj(t) {
      masquer();
      const k = slotA(t), slot = slots[k], m = MONDES[k], hero = concepts[k];
      const tau = t - slot.debut, dI = t - slot.impact, apres = [];
      let cam, fond, brouillard, lumieres;
      hero.visible = true;
      if (t < slot.impact) {
        /* ── PHASE A : monde natif ── */
        const e = mondes[k], dc = e.decor, uA = clamp(tau / (slot.impact - slot.debut));
        e.groupe.visible = true;
        poser(hero, poseMonde(k, t)); animer(hero, t);
        // portail du monde : replacé au bout de la course (recul), réduit, iris entrouvert juste assez pour avaler le bolide
        const sc = scenarios[k], sP = sc.sPortail - PLANS[k].recul, pP = sc.spA.point(sP), tP = sc.spA.tangente(sP);
        e.portail.groupe.position.set(pP[0], 0, pP[2]); e.portail.groupe.rotation.set(0, Math.atan2(-tP[0], -tP[2]), 0); e.portail.groupe.scale.setScalar(0.6);
        e.portail.maj(t, 0.5 * smoother((uA - 0.1) / 0.4), 0, 0);
        apres.push((camera) => {
          dc.maj(t, 0, camera, ctx.H);
          if (dc.eclair) { const ev = eclairMonde(t, m.id); dc.eclair.u.value = ev * 0.85; dc.eclair.lum.intensity = dc.eclair.base * (1 + ev * 3.2); }
          for (const f of e.fx) f.maj(t, camera, ctx.H);
        });
        cam = cameraMonde(k, t); fond = m.ciel; brouillard = brouillardMonde(dc, m); lumieres = { hemi: 0.16, cle: 0.24 };
      } else {
        /* ── PHASE B : sortie de la porte du Ring, pose héroïque ── */
        ring.groupe.visible = true; ring.maj(t, 0.25 * gauss(dI / 0.4), k + 1, 0);
        poser(hero, poseRing(k, t)); animer(hero, t);
        miroirs[k].racine.visible = true; miroirs[k].sync();
        ring.pastilles[k].material.opacity = 0.9 * smoother((dI - 0.9) / 0.4);
        const ouv = 0.45 * smoother((dI + 0.05) / 0.12) * (1 - smoother((dI - 0.15) / 0.35));
        portes[k].groupe.visible = true; portes[k].groupe.scale.setScalar(0.75); portes[k].maj(t, ouv, 0, 0);
        cam = cameraRing(k, t); fond = FOND_RING; brouillard = ring.brouillard; lumieres = { hemi: 0.42, cle: 0.6 };
      }

      /* ── post : fondu lumineux court et doux au passage du portail (teinté de la couleur du monde) ── */
      const teinte = new THREE.Color(m.accent).lerp(new THREE.Color(1, 0.94, 0.84), 0.5);
      const voile = gauss(dI / 0.1);
      const post = {
        exposition: 0.9 - 0.12 * gauss(dI / 0.22), vignette: 0.5, saturation: 1.05, bloomForce: 0.3 - 0.12 * gauss(dI / 0.3),
        // le shader ajoute 3 × flash en HDR sur toute l'image : 0,035 = lueur colorée brève, jamais de voile blanc
        flash: 0.035 * voile, flashCouleur: [teinte.r, teinte.g, teinte.b], flou: 0, aberration: 0.0006,
      };
      return {
        camera: { p: cam.p, c: cam.c, fov: cam.fov, roll: 0, near: 0.5, far: 4000 },
        fond, brouillard, lumieres, post,
        apres: (camera) => { for (const fn of apres) fn(camera); },
        hud: (g, W, H) => bandeau.dessiner(g, W, H, k, tau, slot.fin - slot.debut),
      };
    },
  };
}
