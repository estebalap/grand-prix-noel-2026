/* SEGMENT « ARÈNE » de la V9.1 Ring — le cœur du trailer « Grand Prix de Noël ». Le noyau l'appelle en temps INTERNE (carte du temps
   def.remap : film 12,6 → 81,6 ↔ interne 15,5 → 84,5 ; film 90,6 → 113,6 ↔ interne 99,5 → 122,5). Tous les temps ci-dessous sont
   INTERNES et viennent de data/plan_v9.json (segments[1].sous, ecuries, telephone, lootbox, gloire, depart) : aucune heure codée en
   dur pour la fin (lootbox → logo), tout est exprimé à partir des clés du plan.

   Direction artistique « Arène Bonbon Néon » (arene_decor.js) : ring surélevé à tapis bleu roi et LOGO officiel, cercle de 5 bandes
   arc-en-ciel, 4 poteaux rouge/bleu/jaune/vert, cordes gainées et guirlandes, passerelles LED + tunnels + tremplins sur les 4 axes,
   murs d'enceintes, flammes, lasers verts, écran géant, public instancié en bonnets, sapin géant, confettis, neige.

     15,5 → 18    ARRIVÉE   on sort de la lumière rose du salon (flash teinté qui retombe + brume rose qui se dissipe) en descendant
                            du ciel au-dessus du ring vers une vue d'arène (pyro, lasers, public). Voix : « Ce soir, quinze écuries… »
     18 → 75      ÉCURIES   15 créneaux de 3,8 s (arene_trajets.js) : sortie du tunnel dans les flammes, passerelle, TREMPLIN, vol
                            au-dessus de la corde du haut, atterrissage amorti, DÉRAPAGE jusqu'à sa place dans la couronne ; seule la
                            voiture de l'écurie bouge. 5 recettes de caméra (poursuite basse, latéral, contre-plongée au saut, frontal
                            depuis le tunnel, aérien), bandeau V8 (#n°, ÉCURIE, pilote · bolide), logo de l'écurie sur l'écran géant.
                            74,8 : plan aérien de la couronne des 15 concept-cars autour du logo.
     75 → 84,5    TÉLÉPHONE telephone_v9.js (creerTelephone) en grand devant la caméra, la couronne derrière.
     99,5 → 106,5 LOOTBOX   l'écran remonte, le conteneur « Lootbox Fret » (arene_fret.js) descend au centre du cercle des 15
                            concept-cars (descente), se verrouille (secousse, étincelles), les verrous sautent (verrous), le rideau « ? »
                            s'enroule (entrouvre → ouvert) : lumière dorée et fumée s'échappent ; à trophee_sort le TROPHÉE sort sur
                            un tiroir doré, décolle en lévitant, grandit et monte au-dessus du toit (rayons dorés derrière lui) vers
                            le centre du ring, en hauteur (gloire.trophee_haut) ; le conteneur s'enfonce dans le tapis (trappe dorée)
                            sous la coupe déjà envolée (chorégraphie : arene_gloire.js).
     106,5→114,5  GLOIRE    projecteur unique + 6 faisceaux volumétriques vers la coupe, contre-plongée héroïque qui tourne autour
                            du trophée puis recule ; titre en DEUX FRAPPES calées sur la voix : « GLOIRE » (titre_gloire) puis
                            « ÉTERNELLE » (titre_eternelle) — impact 1,4 → 1 amorti, micro-secousse de caméra, onde dorée, reflet qui
                            balaie les lettres ; feux d'artifice dorés, confettis + neige, public debout (feux / confettis).
     114,5→122,5  DÉPART    les cordes tombent (cordes), le pont se déploie, les 15 voitures reculent puis partent en file
                            (demarrage) sous le trophée qui flotte toujours au-dessus du ring, sur la PISTE ARC-EN-CIEL à 5 voies
                            (arene_piste.js) qui sort de l'arène (piste) : caméra de POURSUITE serrée dans la meute, puis plan large
                            qui s'élève ; logo : le LOGO officiel en grand (carte de fin) jusqu'à la fin.

   Contrat (LISEZ_MOI_V8.md + noyau_v9.js) : creerSegment(ctx) → { id: 'arene', groupe, cles, maj(t), collisions() }.
   maj(t) est une FONCTION PURE de t : chaque voiture, chaque uniform, chaque lumière est remis à chaque image ; nombre de lumières
   constant ; aucun Math.random() (PRNG semés, ctx.avecAlea pour les constructions de shared/) ; flash post ≤ 0,05.
   collisions() : interpénétrations voiture/voiture, voiture/poteau, voiture/corde (garde de 3 cm), voiture/conteneur, voiture/structure
   (OBB 3D avec tangage et roulis), voiture/trophée, trophée/parois du conteneur (dalle, toit, flancs, fond, linteau, rideau : intérieur
   creux), trophée/décor (boîte de la VRAIE Coupe Arc-en-Ciel, mesurée sur ses STL), et contact au sol (aucun coin de caisse sous la surface porteuse) pour l'image courante. */
import { clamp, lerp, smoother, doux, easeOut, gauss, angleDiff, hermite, ressort, DEG, boiteLocale, obbDepuis, obbFixe, penetrationOBB, distanceSegmentOBB, coinsBas } from './arene_outils.js';
import { creerDecor, G } from './arene_decor.js';
import { creerEntrees, creerDepart, capVers } from './arene_trajets.js';
import { creerPiste } from './arene_piste.js';
import { creerFret } from './arene_fret.js';
import { creerTrophee } from './arene_trophee.js';
import { choregraphie, creerEffetsGloire } from './arene_gloire.js';
import { creerTelephone } from './telephone_v9.js';
import { creerBandeau } from '../v8_finale/ecuries_bandeau.js';

const FOND = 0x5a2a9a;
const BRUME = { couleur: '#9a3cc0', densite: 0.00055 };
const GARDE_CORDE = 3;

function chargerImage(url) {
  return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error('arène : image introuvable ' + url)); im.src = url; });
}

export async function creerSegment(ctx) {
  const { THREE, garage, poser, animer, plan, equipes } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'seg-arene';
  const P = { ecuries: plan.ecuries, tel: plan.telephone, loot: plan.lootbox, gloire: plan.gloire, dep: plan.depart };
  const N = P.ecuries.length;
  if (N !== 15) throw new Error('seg_arene : 15 créneaux attendus dans plan_v9.json → ecuries');

  /* ═════════════ décor ═════════════ */
  ctx.progression('Arène : logo officiel…');
  const logoImg = await chargerImage(new URL('./data/logo_gp.png', import.meta.url).href);
  ctx.progression('Arène : ring, passerelles, public…');
  const decor = ctx.avecAlea('arene-decor', () => creerDecor(ctx, { logoImg }));
  groupe.add(decor.groupe);

  /* ═════════════ les 15 concept-cars ═════════════ */
  /* Les concept-cars du Showroom mesurent 6 à 9 cm (16 cm pour l'A4 et sa remorque) : dans l'arène on les met à l'échelle pour une
     longueur d'environ 14,5 cm (facteur borné 1,1 – 1,9), proportionnée au ring de 2,5 m et aux cordes. poserE() rapporte la distance
     (rotation des roues) et le débattement des coins au repère non mis à l'échelle de la voiture. */
  const L_CIBLE = 14.5;
  const voitures = [];
  for (let k = 0; k < N; k++) {
    ctx.progression(`Arène : concept-car ${k + 1}/${N}…`);
    const env = garage.concept(equipes[k].id);
    const b0 = boiteLocale(THREE, env), L0 = b0.max.z - b0.min.z, ech = clamp(L_CIBLE / L0, 1.1, 1.9);
    env.scale.setScalar(ech); env.updateMatrixWorld(true);
    const boite = boiteLocale(THREE, env);
    const avant = env.v7.roues.filter((w) => w.avant), arriere = env.v7.roues.filter((w) => !w.avant);
    const moy = (l, f) => l.reduce((s, w) => s + f(w), 0) / Math.max(1, l.length);
    const ez = ((Math.abs(moy(avant, (w) => w.z)) + Math.abs(moy(arriere, (w) => w.z))) / 2 || L0 * 0.32) * ech;
    const ex = (moy(env.v7.roues, (w) => Math.abs(w.x)) || env.v7.largeur * 0.4) * ech;
    env.visible = false; groupe.add(env);
    voitures.push({ env, boite, ech, d: { L: boite.max.z - boite.min.z, ez, ex, ech }, nom: equipes[k].name });
  }
  const poserE = (v, p) => {
    const c = {}; for (const key in p.coins) c[key] = p.coins[key] / v.ech;
    poser(v.env, { ...p, dist: p.dist / v.ech, coins: c });
  };
  const entrees = creerEntrees(P.ecuries, voitures.map((v) => v.d));
  ctx.progression('Arène : piste arc-en-ciel…');
  const piste = creerPiste(THREE, G); groupe.add(piste.groupe);
  const depart = creerDepart(entrees.places, P.dep, piste, voitures.map((v) => v.d));
  const fret = creerFret(THREE, { envMap: ctx.envMap, yPose: G.MAT, demiH: ctx.H / 2 }); groupe.add(fret.groupe, fret.fumee);
  ctx.progression('Arène : Coupe Arc-en-Ciel (vraies STL du Panthéon)…');
  const trophee = await creerTrophee(THREE, { envMap: ctx.envMap, yTapis: G.MAT, importerShared: ctx.importerShared, urlWeb: ctx.urlWeb }); groupe.add(trophee.groupe, trophee.fx);
  const Y_HAUT = G.MAT + 30;                                                  // base du socle quand la coupe trône au centre du ring
  const choreo = choregraphie(P.loot, P.gloire, { yPose: G.MAT, yPlateau: fret.Y_PLATEAU, zTrophee: fret.Z_TROPHEE, yHaut: Y_HAUT, echInit: 0.22 });
  const effets = creerEffetsGloire(THREE, { demiH: ctx.H / 2 }); groupe.add(effets.groupe);
  ctx.progression('Arène : téléphone…');
  const tel = await creerTelephone(ctx);
  const pivotTel = new THREE.Group(); pivotTel.add(tel.groupe); groupe.add(pivotTel);
  const cc = await ctx.importerShared('concept_cars.js');
  const bandeau = creerBandeau({ equipes, infoConcept: (id) => cc.conceptInfo(id), logos: ctx.logos });

  /* ═════════════ poses (fonction pure) ═════════════ */
  /** Pose de la voiture k au temps t : null = cachée (pas encore sortie du tunnel). */
  function poseVoiture(k, t) {
    if (t >= P.dep.demarrage) return depart.pose(k, t);
    return entrees.pose(k, t);
  }
  const posBase = (k, t) => { const p = poseVoiture(k, t); return p ? p.pos : null; };
  /** Position lissée (moyenne gaussienne sur ±win) : la caméra ignore les chocs de suspension et l'impact vertical de l'atterrissage. */
  function lisse(k, t, win = 0.15) {
    let sx = 0, sy = 0, sz = 0, sw = 0, hx = 0, hz = 0;
    for (let i = -4; i <= 4; i++) {
      const tt = t + (i / 4) * win, p = poseVoiture(k, tt); if (!p) continue;
      const w = Math.exp(-(i * i) / 6); sx += p.pos[0] * w; sy += p.pos[1] * w; sz += p.pos[2] * w; hx += Math.sin(p.cap) * w; hz += Math.cos(p.cap) * w; sw += w;
    }
    if (!sw) return null;
    const n = Math.hypot(hx, hz) || 1;
    return { p: [sx / sw, sy / sw, sz / sw], f: [hx / n, 0, hz / n] };
  }

  /* ═════════════ caméras des écuries : 5 recettes, plans fluides (positions = fonctions lisses de la trajectoire) ═════════════ */
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  function plan_(k, t, def) {
    const E = entrees.entrees[k], ax = E.ax, az = E.az, W = (u, l, y) => [ax * u - az * l, G.MAT + y, az * u + ax * l];
    const L = lisse(k, t, def.win ?? 0.15); if (!L) return null;
    const cible = add(L.p, [0, 2.2, 0]);
    const f = L.f, s = [f[2], 0, -f[0]];                                    // s = gauche de la voiture
    let p;
    switch (def.type) {
      case 'chase': p = add(add(add(L.p, f, -def.back), s, def.side), [0, def.up, 0]); return { p, c: add(cible, f, def.ahead ?? 3), fov: def.fov ?? 42 };
      case 'dolly': { const u = L.p[0] * ax + L.p[2] * az; p = W(u - (def.ahead ?? 4), def.l, L.p[1] - G.MAT + def.up); return { p, c: cible, fov: def.fov ?? 40 }; }
      case 'dollybas': { const u = L.p[0] * ax + L.p[2] * az; return { p: W(u + def.back, def.l, def.y), c: cible, fov: def.fov ?? 46 }; }
      case 'fixe': return { p: W(def.u, def.l, def.y), c: cible, fov: def.fov ?? 44 };
      case 'exterieur': {
        const r = Math.hypot(L.p[0], L.p[2]) || 1, a = Math.atan2(L.p[2], L.p[0]) + (def.decal || 0);
        p = [Math.cos(a) * (r + def.dist), G.MAT + def.up, Math.sin(a) * (r + def.dist)];
        return { p, c: cible, fov: def.fov ?? 40 };
      }
      case 'plongee': { const r = Math.hypot(L.p[0], L.p[2]) || 1; p = [L.p[0] + L.p[0] / r * def.out, L.p[1] + def.up, L.p[2] + L.p[2] / r * def.out]; return { p, c: cible, fov: def.fov ?? 42 }; }
      default: return null;
    }
  }
  // instants relatifs au créneau : sortie 0 · saut 1,5 · atterrissage 2,3 · place 3,6 · fin 3,8
  const RECETTES = [
    [{ t: 0, type: 'chase', back: 19, side: 8, up: 5 }, { t: 2.45, fondu: 0.6, type: 'exterieur', dist: 24, up: 8 }],
    [{ t: 0, type: 'dolly', l: -24, up: 5, ahead: 5 }, { t: 2.35, fondu: 0.6, type: 'exterieur', dist: 21, up: 9, decal: -0.2 }],
    [{ t: 0, type: 'chase', back: -22, side: 9, up: 3.5, ahead: 0 }, { t: 1.1, type: 'dollybas', back: 9, l: 11, y: 2.5, fov: 50 }, { t: 2.12, type: 'plongee', up: 17, out: 24, win: 0.25 }],
    [{ t: 0, type: 'fixe', u: 262, l: -20, y: 5, fov: 46 }, { t: 0.55, type: 'chase', back: 16, side: -12, up: 6 }, { t: 2.3, type: 'exterieur', dist: 22, up: 4, decal: 0.3 }],
    [{ t: 0, type: 'chase', back: 17, side: 3, up: 11, ahead: 8 }, { t: 1.5, fondu: 0.4, type: 'chase', back: 4, side: 18, up: 12 }, { t: 2.2, type: 'plongee', up: 19, out: 22, win: 0.25 }],
  ];
  const RECETTE_DE = [0, 2, 1, 3, 4, 1, 2, 0, 4, 3, 2, 1, 0, 3, 4];             // variée d'une écurie à l'autre (écurie 1 : poursuite basse)
  function cameraEcurie(k, t) {
    const sl = P.ecuries[k], tau = t - sl.sortie, R = RECETTES[RECETTE_DE[k]];
    let i = 0; while (i < R.length - 1 && tau >= R[i + 1].t) i++;
    let cam = plan_(k, t, R[i]);
    if (i > 0 && R[i].fondu) {                                             // bascule douce : mélange lissé des deux plans
      const u = smoother((tau - R[i].t) / R[i].fondu);
      if (u < 1) { const a = plan_(k, t, R[i - 1]); cam = { p: a.p.map((x, j) => lerp(x, cam.p[j], u)), c: a.c.map((x, j) => lerp(x, cam.c[j], u)), fov: lerp(a.fov, cam.fov, u) }; }
    }
    return cam;
  }
  /** Plan aérien de la couronne (fin des écuries, ≈ 74,8 s). */
  const cameraCouronne = (t) => { const u = t - 74.6; return { p: [8 * u, G.MAT + 140 + 6 * u, 118 - 4 * u], c: [0, G.MAT, 6], fov: 46 }; };     // sous l'écran géant, en plongée

  /* ═════════════ caméras des autres parties (splines d'Hermite : vitesse continue) ═════════════ */
  const ARRIVEE = [
    { t: 15.5, p: [0, 980, 70], c: [0, G.MAT, 0], fov: 52 },
    { t: 16.5, p: [90, 420, 240], c: [0, G.MAT + 20, 0], fov: 50 },
    { t: 17.3, p: [300, 150, 250], c: [80, G.MAT + 30, 0], fov: 48 },
    { t: 18.0, p: [345, 62, 120], c: [272, G.MAT + 22, 0], fov: 46 },
  ];
  /* Fin du segment : toutes les clés de caméra sont exprimées à partir du plan (lootbox, gloire, depart). */
  const L_ = P.loot, Gl = P.gloire, D = P.dep;
  const T_L2 = L_.verrous - 0.6, T_L3 = L_.entrouvre + 0.3, T_DECOL = L_.trophee_sort + 0.8;
  const LOOT = [                                                              // contre-plongée : le conteneur descend du portique
    { t: L_.debut, p: [26, G.MAT + 5, 92], c: [0, G.MAT + 160, 0], fov: 50 },
    { t: T_L2, p: [30, G.MAT + 6, 90], c: [0, G.MAT + 24, 0], fov: 48 },
  ];
  const LOOT2 = [{ t: T_L2, p: [78, G.MAT + 34, 88], c: [0, G.MAT + 7, 0], fov: 42 }, { t: T_L3, p: [62, G.MAT + 26, 74], c: [0, G.MAT + 6, 2], fov: 40 }];   // 3/4 : verrous
  const polaire = (aDeg, r, y) => [Math.cos(aDeg * DEG) * r, y, Math.sin(aDeg * DEG) * r];
  /** Visée de la gloire : sous le centre de la coupe (≈ 0,14 × distance) pour la placer dans le tiers haut, le titre occupe le bas. */
  const viseeCoupe = (r, k = 1) => { const c = trophee.centre(); return [c[0], c[1] - 0.095 * r * k, c[2]]; };
  const SORTIE = [                                                            // face à la porte → suit la coupe qui sort, lévite et grandit
    { t: T_L3, p: [-11, G.MAT + 9, 50], c: [0, G.MAT + 6, 14], fov: 44 },
    { t: L_.trophee_sort, p: [-8, G.MAT + 8, 45], c: [0, G.MAT + 6, 16], fov: 38 },
    { t: T_DECOL, p: polaire(96, 66, G.MAT + 12), c: [0, G.MAT + 7, 24], fov: 36 },      // dans l'intervalle entre deux voitures garées (84° et 108°)
    { t: (T_DECOL + Gl.trophee_haut) / 2, p: polaire(86, 84, G.MAT + 14), c: [0, G.MAT + 26, 12], fov: 42 },   // recule pendant que la coupe grandit
    { t: Gl.trophee_haut, p: polaire(70, 90, G.MAT + 18), c: [0, Y_HAUT + 12, 0], fov: 44 },
  ];
  const ORBITE = [                                                            // coordonnées polaires autour de la coupe (degrés, cm)
    { t: Gl.trophee_haut, a: 70, r: 90, y: G.MAT + 18, fov: 44 },
    { t: Gl.titre_gloire, a: 81, r: 88, y: G.MAT + 17, fov: 44 },
    { t: Gl.titre_eternelle + 1.4, a: 100, r: 86, y: G.MAT + 16, fov: 44 },
    { t: Gl.fin - 1.3, a: 118, r: 124, y: G.MAT + 26, fov: 44 },
    { t: Gl.fin, a: 125, r: 150, y: G.MAT + 36, fov: 44 },
  ];
  function cameraSortie(t) {
    const p = hermite(SORTIE, t, 'p'), fov = hermite(SORTIE, t, 'fov');
    const w = smoother((t - L_.trophee_sort) / (Gl.trophee_haut - L_.trophee_sort));   // la visée glisse vers la coupe
    const cK = hermite(SORTIE, t, 'c'), cT = viseeCoupe(Math.hypot(p[0], p[2]), smoother((t - T_DECOL - 0.7) / (Gl.trophee_haut - T_DECOL - 0.7)));   // coupe cadrée entière pendant l'envol
    return { p, c: cK.map((x, k) => lerp(x, cT[k], w)), fov };
  }
  function cameraOrbite(t) {
    const a = hermite(ORBITE, t, 'a'), r = hermite(ORBITE, t, 'r');
    return { p: polaire(a, r, hermite(ORBITE, t, 'y')), c: viseeCoupe(r), fov: hermite(ORBITE, t, 'fov') };
  }
  /** Micro-secousse d'impact (frappes du titre) : 2 réponses amorties très brèves, la coupe reste nette. */
  const secousse = (t) => 0.45 * ressort(t - Gl.titre_gloire, 42, 0.42) + 0.6 * ressort(t - Gl.titre_eternelle, 42, 0.42);
  // départ : grand angle (cordes), caméra rasante (la file passe), POURSUITE serrée dans la meute, plan large qui s'élève (logo)
  const DEP1 = [{ t: D.debut, p: [150, G.MAT + 120, 195], c: [10, G.MAT + 18, 0], fov: 46 }, { t: D.demarrage + 1.1, p: [175, G.MAT + 95, 175], c: [40, G.MAT, -10], fov: 46 }];
  const DEP2 = [{ t: D.demarrage + 1.1, p: [100, G.MAT + 8, -80], fov: 46 }, { t: D.piste + 0.3, p: [118, G.MAT + 10, -66], fov: 46 }];
  const T_LARGE = D.logo - 0.6;
  const hcam = (cles, t) => ({ p: hermite(cles, t, 'p'), c: hermite(cles, t, 'c'), fov: hermite(cles, t, 'fov') });
  const S_TETE = () => Math.min(...depart.avance);
  /** Poursuite : caméra posée DANS la file, derrière la 3ᵉ voiture, légèrement décalée et au-dessus ; elle vise la tête de la meute. */
  function cameraPoursuite(t, u = 0) {
    // u = 0 : poursuite serrée ; u → 1 : la grue recule et s'élève derrière la meute qui file vers le ciel (plan large du logo)
    const sl = depart.S(t) - S_TETE(), sc = sl - lerp(72, 190, u);
    const q = depart.pointFile(sc), qa = depart.pointFile(sc - 1), qb = depart.pointFile(sc + 1);
    const tx = qb[0] - qa[0], tz = qb[2] - qa[2], n = Math.hypot(tx, tz) || 1, lx = -tz / n, lz = tx / n, lat = lerp(11, 36, u);
    const v = depart.pointFile(sl + lerp(-18, 170, u));
    return { p: [q[0] + lx * lat, q[1] + lerp(10, 165, u), q[2] + lz * lat], c: [v[0], v[1] + lerp(2.5, 45, u), v[2]], fov: lerp(50, 56, u) };
  }
  const cameraLarge = (t) => cameraPoursuite(t, smoother((t - T_LARGE) / (D.fin - T_LARGE)));

  /* ═════════════ habillage 2D ═════════════ */
  /* Titre « GLOIRE ÉTERNELLE » en deux frappes (exception validée : grand, centre-bas, de titre_gloire à gloire.fin).
     Lettres or façon site (Fredoka 700, dégradé or, contour prune sombre, ombre portée), impact 1,4 → 1 avec rebond amorti, éclat de
     reflet qui balaie les lettres (calque hors écran : le texte sert de masque), léger pulse ensuite, sortie avant gloire.fin. */
  let calque = null;
  function mot(g, W, str, a, yPx, taille, sortie) {
    if (a < 0) return;
    const s = W / 1920;
    const impact = 1 + 0.4 * Math.exp(-a * 7.5) * Math.cos(a * 17);                     // 1,4 → 1, rebond amorti
    const pulse = 1 + 0.018 * Math.sin((a - 0.8) * 3.1) * smoother((a - 0.8) / 0.6);
    const ech = impact * pulse * s, alpha = clamp(a / 0.07) * (1 - sortie);
    if (alpha <= 0.002) return;
    const fonte = `700 ${taille}px "Fredoka", "Nunito", system-ui, sans-serif`;
    const poser = (c) => { c.translate(W / 2, yPx * s); c.scale(ech, ech); c.font = fonte; c.textAlign = 'center'; c.textBaseline = 'middle'; if ('letterSpacing' in c) c.letterSpacing = '5px'; };
    g.save(); poser(g); g.globalAlpha = alpha; g.lineJoin = 'round';
    g.shadowColor = 'rgba(25,4,45,.8)'; g.shadowBlur = 10; g.shadowOffsetY = 7;
    g.lineWidth = 15; g.strokeStyle = 'rgba(42,10,72,.96)'; g.strokeText(str, 0, 0);
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    const or = g.createLinearGradient(0, -taille * 0.45, 0, taille * 0.45);
    or.addColorStop(0, '#fff6c2'); or.addColorStop(0.38, '#ffd659'); or.addColorStop(0.62, '#f2a81d'); or.addColorStop(1, '#c86f0a');
    g.fillStyle = or; g.fillText(str, 0, 0);
    g.lineWidth = 2.2; g.strokeStyle = 'rgba(255,248,215,.55)'; g.strokeText(str, 0, -1.5);                // arête claire (biseau)
    g.restore();
    // reflet : bande claire qui traverse les lettres (0,1 → 0,75 s après la frappe, puis un second passage lent)
    const pass = (u) => (u > 0 && u < 1 ? u : null);
    const u = pass((a - 0.1) / 0.65) ?? pass((a - 2.6) / 1.2);
    if (u === null) return;
    const Wc = g.canvas.width, Hc = g.canvas.height;
    if (!calque || calque.width !== Wc || calque.height !== Hc) { calque = document.createElement('canvas'); calque.width = Wc; calque.height = Hc; }
    const k = calque.getContext('2d', { willReadFrequently: true });      // calque logiciel, comme la toile HUD du noyau : pixels identiques d'une image à l'autre
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, Wc, Hc);
    k.save(); poser(k); k.fillStyle = '#ffffff'; k.fillText(str, 0, 0);
    const lmot = k.measureText(str).width, xb = lerp(-lmot * 0.75, lmot * 0.75, u);
    k.globalCompositeOperation = 'source-in';
    const band = k.createLinearGradient(xb - taille * 0.6, -taille * 0.3, xb + taille * 0.6, taille * 0.3);
    band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(0.5, 'rgba(255,255,240,.9)'); band.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = band; k.fillRect(-lmot, -taille, lmot * 2, taille * 2); k.restore();
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = 'lighter'; g.drawImage(calque, 0, 0); g.restore();
  }
  function titreGloire(g, W, H, t) {
    const sortie = smoother((t - (Gl.fin - 0.9)) / 0.5);
    mot(g, W, 'GLOIRE', t - Gl.titre_gloire, 800, 190, sortie);
    mot(g, W, 'ÉTERNELLE', t - Gl.titre_eternelle, 985, 180, sortie);
  }
  function logoFinal(g, W, H, t) {
    const a = t - P.dep.logo; if (a < 0) return;
    const pop = a < 0.3 ? lerp(0.4, 1.06, easeOut(a / 0.3)) : a < 0.5 ? lerp(1.06, 1, smoother((a - 0.3) / 0.2)) : 1 + 0.012 * Math.sin((a - 0.5) * 2.2);
    const taille = H * 0.56 * pop;
    g.save(); g.globalAlpha = clamp(a / 0.2);
    const halo = g.createRadialGradient(W / 2, H / 2, taille * 0.2, W / 2, H / 2, taille * 0.62);
    halo.addColorStop(0, 'rgba(255,200,90,.45)'); halo.addColorStop(1, 'rgba(255,120,200,0)'); g.fillStyle = halo; g.beginPath(); g.arc(W / 2, H / 2, taille * 0.62, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'rgba(40,0,60,.6)'; g.shadowBlur = 30 * (W / 1920);
    g.drawImage(logoImg, W / 2 - taille / 2, H / 2 - taille / 2, taille, taille); g.restore();
  }

  /* ═════════════ flammes (pyro) : à chaque sortie de voiture + temps forts ═════════════ */
  const impulsion = (tau) => (tau < -0.05 ? 0 : smoother((tau + 0.05) / 0.1) * (1 - smoother((tau - 0.35) / 0.55)));
  function flammes(t) {
    const f = [0, 0, 0, 0];
    for (let k = 0; k < N; k++) f[k % 4] = Math.max(f[k % 4], impulsion(t - P.ecuries[k].sortie));
    const tous = Math.max(impulsion(t - 16.1), impulsion(t - 17.2), impulsion(t - P.gloire.confettis), impulsion(t - P.dep.demarrage), impulsion(t - P.dep.logo));
    return f.map((x) => Math.max(x, tous));
  }

  /* ═════════════ état de l'image courante (pour collisions()) ═════════════ */
  let etatCourant = { t: 0, poses: [], cordes: true, pont: 0, fret: null, trophee: false, hero: -1 };
  const ecranAffiche = (cle, img, couleurs) => ({ cle, img, couleurs });
  const ECRAN_GP = ecranAffiche('gp', logoImg, ['#3a1aa0', '#c03aa8']);
  const kCourant = (t) => { for (let k = 0; k < N; k++) if (t < P.ecuries[k].fin) return k; return N - 1; };

  const cles = [
    { t: 15.8, label: 'Arrivée · descente du ciel' },
    { t: 18.8, label: 'Écurie #01 · sortie du tunnel' },
    { t: 19.9, label: 'Écurie #01 · saut au-dessus des cordes' },
    { t: 20.5, label: 'Écurie #01 · atterrissage' },
    { t: 43.2, label: 'Écurie #07 · atterrissage' },
    { t: 62.6, label: 'Écurie #12 · dérapage' },
    { t: 74.85, label: 'Couronne des 15 concept-cars' },
    { t: 79.0, label: 'Téléphone · points' },
    { t: P.loot.descente + 0.9, label: 'Lootbox · descente au centre du cercle' },
    { t: P.loot.verrous + 0.8, label: 'Lootbox · les verrous sautent' },
    { t: (P.loot.entrouvre + P.loot.ouvert) / 2 + 0.3, label: 'Lootbox · rideau « ? » qui s\'enroule' },
    { t: P.loot.trophee_sort + 0.5, label: 'Le trophée sort du conteneur' },
    { t: (P.loot.trophee_sort + 0.8 + P.gloire.trophee_haut) / 2 + 0.2, label: 'Le trophée lévite et grandit' },
    { t: P.gloire.trophee_haut + 0.4, label: 'Trophée au centre du ring' },
    { t: P.gloire.titre_gloire + 0.3, label: '« GLOIRE »' },
    { t: P.gloire.titre_eternelle + 0.4, label: '« GLOIRE ÉTERNELLE » · feux d\'artifice' },
    { t: P.gloire.fin - 1.8, label: 'Gloire éternelle · recul en majesté' },
    { t: P.dep.cordes + 0.4, label: 'Départ · les cordes tombent' },
    { t: P.dep.demarrage + 1.1, label: 'Départ · la file s\'élance' },
    { t: P.dep.piste + 0.8, label: 'Départ · poursuite sur la piste 5 voies' },
    { t: P.dep.logo + 0.6, label: 'Logo final · 23 décembre' },
  ];

  return {
    id: 'arene', groupe, cles,
    maj(t) {
      const enEcuries = t >= P.ecuries[0].sortie && t < P.tel.debut;
      const enTel = t >= P.tel.debut && t < P.tel.fin;
      const enLoot = t >= P.loot.debut && t < P.gloire.debut;
      const enGloire = t >= P.gloire.debut && t < P.dep.debut;
      const enDep = t >= P.dep.debut;
      const k = kCourant(t);

      /* ── voitures : seules celles déjà sorties sont visibles ; la vedette seule bouge ── */
      const poses = [];
      for (let j = 0; j < N; j++) {
        const v = voitures[j], p = poseVoiture(j, t);
        v.env.visible = !!p;
        if (p) { poserE(v, p); animer(v.env, t); v.env.updateMatrixWorld(true); }
        poses.push(p);
      }

      /* ── conteneur, trophée (il SORT du conteneur), téléphone, piste ── */
      const enFin = enLoot || enGloire || enDep;
      const enfonce = choreo.enfonce(t);
      const fr = (enLoot || enGloire) && enfonce < 0.999 ? fret.maj(t, L_, { tiroir: choreo.tiroir(t), enfonce }) : (fret.cacher(), null);
      const et = enFin ? choreo.trophee(t) : null;
      if (et) {
        // reflet qui balaie la vasque à chaque frappe du titre ; aura et colonne de lévitation pleines pendant la gloire et le départ
        const b1 = t - Gl.titre_gloire, b2 = t - Gl.titre_eternelle;
        const balaye = (a) => (a > 0 && a < 0.7 ? Math.sin(Math.PI * a / 0.7) : 0);
        et.brille = Math.max(balaye(b1), balaye(b2)); et.brillePhase = b2 > 0 ? clamp(b2 / 0.7) : clamp(b1 / 0.7);
        if (enDep) { et.rayons *= 1 - 0.45 * smoother((t - D.piste) / 1.5); }
      }
      trophee.maj(t, et);
      const revele = enDep ? 2600 * smoother((t - D.piste + 0.6) / 2.6) : 0;
      piste.maj(t, revele);
      pivotTel.visible = enTel;

      /* ── caméra ── */
      let cam;
      if (t < P.ecuries[0].sortie) cam = hcam(ARRIVEE, t);
      else if (enEcuries) cam = (t >= 74.6 ? cameraCouronne(t) : cameraEcurie(k, t));
      else if (enTel) { const a = (t - P.tel.debut) / (P.tel.fin - P.tel.debut); cam = { p: [-14 + 22 * a, G.MAT + 27 - 3 * a, 132 - 6 * a], c: [0, G.MAT + 8, 0], fov: 34 }; }
      else if (t < T_L2) { cam = hcam(LOOT, t); cam.c = [0, Math.max(G.MAT + 10, fret.groupe.position.y + 8), 0]; }
      else if (t < T_L3) cam = hcam(LOOT2, t);
      else if (t < Gl.trophee_haut) cam = cameraSortie(t);
      else if (t < D.debut) cam = cameraOrbite(t);
      else if (t < D.demarrage + 1.1) cam = hcam(DEP1, t);
      else if (t < D.piste + 0.3) { const p = hermite(DEP2, t, 'p'), q = depart.pointFile(depart.S(t) - 40); cam = { p, c: [q[0], q[1] + 3, q[2]], fov: 44 }; }     // la caméra rasante suit la file qui passe
      else if (t < T_LARGE) cam = cameraPoursuite(t);
      else cam = cameraLarge(t);
      if (enGloire) { const k = secousse(t); cam.p = [cam.p[0] + 0.7 * k, cam.p[1] + k, cam.p[2]]; cam.c = [cam.c[0] + 0.3 * k, cam.c[1] + 0.45 * k, cam.c[2]]; }

      /* ── téléphone : flotte devant la caméra, au centre de l'image ── */
      if (enTel) {
        tel.maj(t);
        const cp = new THREE.Vector3(...cam.p), d = new THREE.Vector3(...cam.c).sub(cp).normalize();
        const a = t - P.tel.debut, entre = easeOut(a / 0.6);
        const pos = cp.clone().addScaledVector(d, lerp(60, 31, entre)); pos.y += 0.25 * Math.sin(t * 1.7);
        pivotTel.position.copy(pos); pivotTel.lookAt(cp); pivotTel.rotateY(-0.12 + 0.04 * Math.sin(t * 0.9)); pivotTel.rotateX(-0.04); pivotTel.rotateZ(0.025 * Math.sin(t * 1.3));
      }

      /* ── écran géant, public, effets ── */
      let ecran = ECRAN_GP;
      if (enEcuries && t < 74.6) { const e = equipes[k]; ecran = ecranAffiche('k' + k, ctx.logos[e.id], e.colors); }
      const debout = enGloire || enDep ? smoother((t - Gl.confettis) / 0.8) : 0;
      const confettis = t < 18.5 ? 0.8 * (1 - smoother((t - 17.6) / 0.9)) : (enGloire || enDep) ? smoother((t - Gl.confettis) / 0.4) * (enDep ? 1 - 0.6 * smoother((t - (D.debut - 0.5)) / 2) : 1) : 0;
      const neige = (enGloire || enDep) ? 0.9 * smoother((t - P.gloire.confettis) / 0.6) : 0;
      const hero = enEcuries && t < 74.6 ? k : -1;
      const ph = hero >= 0 ? poses[hero] : null;
      const spotGloire = enGloire ? smoother((t - Gl.debut) / 0.5) : 0;
      const cTro = et ? trophee.centre() : [0, Y_HAUT + 20, 0];
      const vCam = [cam.p[0] - cTro[0], cam.p[1] - cTro[1], cam.p[2] - cTro[2]], nCam = Math.hypot(...vCam) || 1;
      const posOrGloire = [cTro[0] + vCam[0] / nCam * 34, cTro[1] + 12 + vCam[1] / nCam * 34, cTro[2] + vCam[2] / nCam * 34];   // lumière dorée côté caméra : la coupe brille
      const orGloire = enGloire ? 1.7 * smoother((t - Gl.debut) / 0.6) : (enDep ? 1.8 : 0);
      decor.maj(t, {
        flammes: flammes(t), ecran, ecranY: enLoot || enGloire ? 205 + 150 * smoother((t - P.loot.debut) / 1.0) : (enDep ? 355 + 300 * smoother((t - P.dep.debut) / 2.0) : 205),
        debout, liesse: 0.3 + 0.4 * (enGloire || enDep ? 1 : 0), confettis, neige, chuteCordes: enDep ? smoother((t - P.dep.cordes) / 0.55) : 0,
        pont: enDep ? smoother((t - P.dep.cordes) / 0.6) : 0, ambiance: 1 - 0.25 * spotGloire, laser: enTel ? 0.35 : 1,
        spot: lerp(0.9, 2.4, spotGloire), spotAngle: lerp(0.55, 0.2, spotGloire),
        or: Math.max(fr ? fr.lumiere : 0, orGloire), posOr: fr && fr.lumiere > orGloire ? fr.posLumiere : posOrGloire,
        suivi: ph ? 1.3 : (enTel ? 0.45 : 0), posSuivi: ph ? [ph.pos[0] + 6, ph.pos[1] + 30, ph.pos[2] + 6] : [cam.p[0] - 30, cam.p[1] + 40, cam.p[2] - 10],
      });
      /* ── effets de la gloire : faisceaux vers la coupe, feux d'artifice dorés, ondes aux frappes du titre ── */
      effets.maj(t, {
        feux: Gl.feux, forceFeux: enGloire || enDep ? 1 - smoother((t - D.demarrage) / 1.5) : 0,
        faisceaux: enGloire ? smoother((t - Gl.debut) / 0.8) : (enDep ? 1 - smoother((t - D.debut) / 1.2) : 0),
        cible: cTro, ondes: enGloire ? [Gl.titre_gloire, Gl.titre_eternelle] : [], forceOndes: 1,
      });
      etatCourant = { t, poses, cordes: !enDep || t < D.cordes, pont: enDep ? smoother((t - D.cordes) / 0.6) : 0, fret: fret.obb(), murs: fret.murs(), trophee: trophee.obb(), hero };

      /* ── brouillard, post ── */
      const sortieRose = t < 18 ? 1 - smoother((t - 15.5) / 1.1) : 0;
      const brouillard = { couleur: sortieRose > 0.01 ? '#' + new THREE.Color(BRUME.couleur).lerp(new THREE.Color('#ff86e0'), sortieRose).getHexString() : BRUME.couleur, densite: lerp(BRUME.densite, 0.0032, sortieRose) };
      const frappe = (a) => (a < 0 ? 0 : Math.exp(-a * 9));
      const flashOr = enFin ? 0.025 * Math.sin(Math.PI * clamp((t - Gl.trophee_haut + 0.25) / 0.5)) + 0.035 * frappe(t - Gl.titre_gloire) + 0.045 * frappe(t - Gl.titre_eternelle) : 0;
      const post = {
        exposition: 0.86, vignette: 0.45, saturation: 1.12, bloomForce: enTel ? 0.22 : 0.34,
        flash: Math.min(0.05, 0.03 * sortieRose + flashOr), flashCouleur: enFin ? [1, 0.82, 0.45] : [1, 0.32, 0.78], flou: 0, aberration: 0.0005,
      };

      /* ── habillage ── */
      const hud = (g, W, H) => {
        if (enEcuries && t < 74.6) { const sl = P.ecuries[k]; bandeau.dessiner(g, W, H, k, t - sl.debut, sl.fin - sl.debut); }
        if (enGloire) titreGloire(g, W, H, t);
        if (enDep) logoFinal(g, W, H, t);
      };
      return {
        camera: { p: cam.p, c: cam.c, fov: cam.fov, near: 0.8, far: 6000 },
        fond: FOND, brouillard, lumieres: { hemi: 0.32, cle: 0.4 }, post, hud,
        apres: (camera) => trophee.apres(camera),
      };
    },

    /** Interpénétrations de l'image courante (OBB 3D des voitures avec tangage et roulis). */
    collisions() {
      const E = etatCourant, res = [], t = +E.t.toFixed(3);
      const obb = [];
      E.poses.forEach((p, j) => { if (p) obb.push({ j, o: obbDepuis(THREE, voitures[j].env, voitures[j].boite, voitures[j].nom), sol: obbDepuis(THREE, voitures[j].env, voitures[j].boite, voitures[j].nom, { rognage: 0.2, marge: 0.95 }), phase: p.phase }); });
      const decorObs = [...decor.obstacles];
      if (E.fret) decorObs.push(E.fret);
      if (E.trophee) decorObs.push(E.trophee);
      // le trophée contre les parois du conteneur (intérieur creux) et contre le décor fixe
      if (E.trophee) {
        for (const m of [...E.murs, ...decor.obstacles]) { const p = penetrationOBB(E.trophee, m); if (p > 0) res.push({ t, a: 'trophée', b: m.nom, profondeur: +p.toFixed(2) }); }
        for (const q of decor.poteaux) { const dd = distanceSegmentOBB(q.p0, q.p1, E.trophee); if (dd < q.r) res.push({ t, a: 'trophée', b: q.nom, profondeur: +(q.r - dd).toFixed(2) }); }
      }
      for (let a = 0; a < obb.length; a++) {
        const A = obb[a];
        for (let b = a + 1; b < obb.length; b++) { const p = penetrationOBB(A.o, obb[b].o); if (p > 0) res.push({ t, a: A.o.nom, b: obb[b].o.nom, profondeur: +p.toFixed(2) }); }
        for (const d of decorObs) { const p = penetrationOBB(A.o, d); if (p > 0) res.push({ t, a: A.o.nom, b: d.nom, profondeur: +p.toFixed(2) }); }
        for (const q of decor.poteaux) { const dd = distanceSegmentOBB(q.p0, q.p1, A.o); if (dd < q.r) res.push({ t, a: A.o.nom, b: q.nom, profondeur: +(q.r - dd).toFixed(2) }); }
        if (E.cordes) for (const c of decor.cordes) { const dd = distanceSegmentOBB(c.p0, c.p1, A.o), r = G.RCORDE + GARDE_CORDE; if (dd < r) res.push({ t, a: A.o.nom, b: c.nom + ' (garde 3 cm)', profondeur: +(r - dd).toFixed(2) }); }
        if (A.phase !== 'vol') {
          for (const c of coinsBas(A.sol)) { const h = decor.sol(c[0], c[2], E.pont); if (c[1] < h - 0.05) res.push({ t, a: A.o.nom, b: 'sol', profondeur: +(h - c[1]).toFixed(2) }); }
        }
      }
      return res;
    },
    /** Informations de mise au point : dimensions mesurées des voitures et places attribuées. */
    infos() { return { voitures: voitures.map((v) => ({ nom: v.nom, L: +v.d.L.toFixed(2), largeur: +(v.boite.max.x - v.boite.min.x).toFixed(2), hauteur: +(v.boite.max.y - v.boite.min.y).toFixed(2), ymin: +v.boite.min.y.toFixed(2), ez: +v.d.ez.toFixed(2), ex: +v.d.ex.toFixed(2) })), places: entrees.places.map((p) => Math.round(p / DEG)) }; },
    /** Contrôle de l'outil : force un contact (voiture 2 posée sur la voiture 1, voiture 3 dans un poteau) et renvoie ce qui est détecté. */
    testContactForce() {
      const A = voitures[0], B = voitures[1], C3 = voitures[2];
      const pose = (pos, cap) => ({ pos, cap, capVitesse: cap, heave: 0, tangage: 0.1, pente: 0, roulis: 0.05, dist: 0, braquage: 0, coins: {} });
      poserE(A, pose([0, G.MAT, 0], 0)); poserE(B, pose([2, G.MAT, 4], 0.4)); poserE(C3, pose([G.POTEAU - 3, G.MAT, G.POTEAU - 3], 0.8));
      const oA = obbDepuis(THREE, A.env, A.boite, A.nom), oB = obbDepuis(THREE, B.env, B.boite, B.nom), oC = obbDepuis(THREE, C3.env, C3.boite, C3.nom);
      const q = decor.poteaux[0];
      const r = { voiture_voiture: penetrationOBB(oA, oB), voiture_poteau: q.r - distanceSegmentOBB(q.p0, q.p1, oC) };
      const c = decor.cordes[1]; poserE(A, pose([G.CORDE - 1, G.MAT + G.HCORDES[1] - 2, 0], Math.PI / 2)); r.voiture_corde = G.RCORDE + GARDE_CORDE - distanceSegmentOBB(c.p0, c.p1, obbDepuis(THREE, A.env, A.boite, A.nom));
      return r;
    },
    /** Part de l'image occupée par la voiture vedette (max largeur / hauteur), pour le contrôle « ≥ 25 % ». */
    mesureVedette() {
      const E = etatCourant; if (E.hero < 0) return null;
      const v = voitures[E.hero], o = obbDepuis(THREE, v.env, v.boite, v.nom, { rognage: 0, marge: 1 });
      let x0 = 1, x1 = -1, y0 = 1, y1 = -1; const p = new THREE.Vector3();
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
        p.set(...[0, 1, 2].map((i) => o.c[i] + o.u[0][i] * o.e[0] * a + o.u[1][i] * o.e[1] * b + o.u[2][i] * o.e[2] * c)).project(ctx.camera);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      return { ecurie: E.hero + 1, largeur: +((Math.min(1, x1) - Math.max(-1, x0)) / 2).toFixed(3), hauteur: +((Math.min(1, y1) - Math.max(-1, y0)) / 2).toFixed(3) };
    },
  };
}
