/* SEGMENT « ARÈNE » de la V9.2 Ring — le cœur du trailer « Grand Prix de Noël ». Carte du temps IDENTITÉ (temps interne = temps
   film) sur deux plages [6,5 → 81,6] et [89,2 → 121,6]. TOUTES les heures viennent de data/plan_v9.json v9.2 (arrivee, ecuries à durées
   variables, rush, couronne, telephone, lootbox, gloire, depart) : aucun temps codé en dur.

   Direction artistique « Arène Bonbon Néon » (arene_decor.js) : ring surélevé à tapis bleu roi et LOGO officiel, cercle de 5 bandes
   arc-en-ciel, 4 poteaux, cordes NÉON et guirlandes, passerelles LED + tunnels + tremplins sur les 4 axes, murs d'enceintes, flammes,
   lasers, écran géant, BOULE À FACETTES DORÉE sous l'écran (arene_juice.js), public instancié en bonnets, sapin géant, confettis, neige.
   Juice 100 % diégétique (arene_juice.js) : ombres de contact sous chaque voiture et chaque roue, gerbes d'étincelles, gouttes et
   flaques d'huile de l'A4, flare des phares, trauma caméra (pure), bloom poussé.

     arrivee    la caméra JAILLIT du vortex néon (cyan, magenta, or, violet) au DROP : flash ≤ 0,05 + brume qui se dissipe, trauma,
                pyro, lasers ; descente dans l'arène (voix « Ce soir, quinze écuries… »)
     ecuries    15 créneaux à durées variables (arene_trajets.js) : sortie du tunnel, passerelle, TREMPLIN, vol au-dessus des cordes,
                atterrissage, DÉRAPAGE jusqu'à sa place ; un CADRAGE SUR MESURE par écurie (arene_cadrages.js) ; #11–#15 en smash
                cuts (4 coupes franches, flash 2 images, bandeau réduit #n° + NOM)
     rush       ralenti d'action : 1,0 s par voiture (#11 → #15), plein cadre, flash 2 images à chaque coupe
     couronne   plan aérien des 15 concept-cars autour du logo ; à « portail », le PORTAIL EXPRESS hexagonal s'ouvre au centre et la
                caméra plonge dedans (raccord vers Gotham)
     telephone  telephone_v9.js (creerTelephone) en grand devant la caméra, la couronne derrière.
     lootbox    l'écran remonte, le conteneur « Lootbox Fret » (arene_fret.js) descend au centre du cercle des 15 concept-cars, se
                verrouille, les verrous sautent, le rideau « ? » s'enroule : lumière dorée et fumée ; la VRAIE Coupe Arc-en-Ciel sort sur
                un tiroir doré, lévite, grandit et monte au centre du ring ; le conteneur s'enfonce dans le tapis (arene_gloire.js).
     gloire     faisceaux volumétriques, contre-plongée héroïque autour de la coupe puis recul ; « GLOIRE » / « ÉTERNELLE » en deux
                frappes ; feux d'artifice dorés, confettis + neige, public debout.
     depart     les cordes tombent, le pont se déploie, la file part sous la coupe sur la PISTE ARC-EN-CIEL à 5 voies : poursuite serrée,
                plan large qui s'élève, LOGO final.

   Contrat (LISEZ_MOI_V8.md + noyau_v9.js) : creerSegment(ctx) → { id: 'arene', groupe, cles, maj(t), collisions() }.
   maj(t) est une FONCTION PURE de t : chaque voiture, chaque uniform, chaque lumière est remis à chaque image ; nombre de lumières
   constant ; aucun Math.random() (PRNG semés, ctx.avecAlea pour les constructions de shared/) ; flash post ≤ 0,05.
   collisions() : interpénétrations voiture/voiture, voiture/poteau, voiture/corde (garde de 3 cm), voiture/conteneur, voiture/structure
   (OBB 3D avec tangage et roulis), voiture/trophée, trophée/parois du conteneur (dalle, toit, flancs, fond, linteau, rideau : intérieur
   creux), trophée/décor (boîte de la VRAIE Coupe Arc-en-Ciel, mesurée sur ses STL), et contact au sol (aucun coin de caisse sous la surface porteuse) pour l'image courante. */
import { clamp, lerp, smoother, doux, easeOut, gauss, angleDiff, hermite, ressort, prng, DEG, boiteLocale, obbDepuis, obbFixe, penetrationOBB, distanceSegmentOBB, coinsBas } from './arene_outils.js';
import { creerDecor, G } from './arene_decor.js';
import { creerEntrees, creerDepart, capVers } from './arene_trajets.js';
import { creerPiste } from './arene_piste.js';
import { creerFret } from './arene_fret.js';
import { creerTrophee } from './arene_trophee.js';
import { choregraphie, creerEffetsGloire } from './arene_gloire.js';
import { creerTelephone } from './telephone_v9.js';
import { creerBandeau } from '../v8_finale/ecuries_bandeau.js';
import { creerOmbres, creerEtincelles, creerTrauma, secouer, creerHuile, creerFlares, creerBoule, creerPortail, creerVortex, bandeauCompact } from './arene_juice.js';
import { creerCadrages } from './arene_cadrages.js';

const FOND = 0x5a2a9a;
const BRUME = { couleur: '#9a3cc0', densite: 0.00055 };
const GARDE_CORDE = 3;

function chargerImage(url) {
  return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error('arène : image introuvable ' + url)); im.src = url; });
}

export async function creerSegment(ctx) {
  const { THREE, garage, poser, animer, plan, equipes } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'seg-arene';
  const P = { ecuries: plan.ecuries, arrivee: plan.arrivee, rush: plan.rush, couronne: plan.couronne, tel: plan.telephone, loot: plan.lootbox, gloire: plan.gloire, dep: plan.depart };
  for (const cle of ['arrivee', 'rush', 'couronne', 'tel', 'loot', 'gloire', 'dep']) if (!P[cle]) throw new Error('seg_arene : clé « ' + cle + ' » absente de plan_v9.json (v9.2 attendu)');
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
  // phares et feux plus intenses (le bloom poussé de l'arène fait le halo) : chaque matériau émissif vif une seule fois
  const dejaVu = new Set();
  for (const v of voitures) v.env.traverse((o) => {
    const mats = o.isMesh ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) if (m && m.emissive && !dejaVu.has(m) && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0.6) { dejaVu.add(m); m.emissiveIntensity = Math.min(4, m.emissiveIntensity * 1.8); }
  });
  // positions locales des roues (voiture posée à l'origine, cap 0) : étincelles sous les roues
  const v3 = new THREE.Vector3();
  const rouesLoc = voitures.map((v) => { v.env.position.set(0, 0, 0); v.env.rotation.set(0, 0, 0); v.env.updateMatrixWorld(true); return v.env.v7.roues.map((w) => { w.noeud.getWorldPosition(v3); return [v3.x, v3.y, v3.z]; }); });
  const poserE = (v, p) => {
    const c = {}; for (const key in p.coins) c[key] = p.coins[key] / v.ech;
    poser(v.env, { ...p, dist: p.dist / v.ech, coins: c });
  };
  // styles des cadrages sur mesure : la Twingo #02 fait un tête-à-queue complet, la #05 se cabre en sortant du tunnel
  const STYLES = []; STYLES[1] = { spin: 2 * Math.PI }; STYLES[4] = { wheelie: 0.3 };
  const entrees = creerEntrees(P.ecuries, voitures.map((v) => v.d), STYLES);
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
  const fiches = equipes.map((e) => ({ numero: '#' + String(e.id).padStart(2, '0'), nom: e.name.toUpperCase(), fonce: e.colors[0], vif: e.colors[1] }));

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

  /* ═════════════ cadrages sur mesure, rush, couronne, arrivée (arene_cadrages.js) ═════════════ */
  const cad = creerCadrages({ P, G, entrees, lisse, poseVoiture, voitures });
  const trauma = creerTrauma(cad.impulsions);
  const AR = P.arrivee, RU = P.rush, CO = P.couronne;

  /* ═════════════ juice diégétique (arene_juice.js) ═════════════ */
  const ombres = creerOmbres(THREE, voitures, { sol: (x, z, pont) => decor.sol(x, z, pont) }); groupe.add(ombres.groupe);
  const roueMonde = (k, p, w) => { const c = Math.cos(p.cap), sn = Math.sin(p.cap); return [p.pos[0] + w[0] * c + w[2] * sn, p.pos[1], p.pos[2] - w[0] * sn + w[2] * c]; };
  const vecMonde = (p, avant, lat) => { const c = Math.cos(p.cap), sn = Math.sin(p.cap); return [sn * avant + c * lat, 0, c * avant - sn * lat]; };
  /** source d'étincelles sous les roues de la voiture k (filtre : avant / arrière / toutes), vitesse relative à la caisse */
  const sourceRoues = (k, filtre, { avant = [-60, 40], lat = 55, haut = [30, 110] } = {}) => (tb, a) => {
    const p = poseVoiture(k, tb); if (!p || p.phase === 'vol' || p.phase === 'garee') return null;
    const rs = rouesLoc[k].filter((w) => filtre === 'toutes' || (filtre === 'arriere' ? w[2] < 0 : w[2] >= 0));
    const w = rs[Math.floor(a[0] * rs.length) % rs.length], q = roueMonde(k, p, w);
    const v = vecMonde(p, lerp(avant[0], avant[1], a[1]), (a[2] - 0.5) * 2 * lat); v[1] = lerp(haut[0], haut[1], a[3]);
    return { p: [q[0], q[1] + 0.35, q[2]], v, sol: p.pos[1] };
  };
  const evts = [];
  P.ecuries.forEach((sl, k) => {
    evts.push({ t0: sl.atterrissage, t1: sl.atterrissage + 0.07, n: 90, vie: [0.35, 0.8], graine: 'atterrissage-' + k, source: sourceRoues(k, 'toutes', { avant: [40, 140], lat: 70, haut: [40, 130] }) });
    evts.push({ t0: sl.atterrissage + 0.15, t1: sl.place - 0.05, n: 64, vie: [0.3, 0.6], graine: 'derapage-' + k, source: sourceRoues(k, 'arriere', { avant: [-90, -30], lat: 60, haut: [20, 80] }) });
  });
  { const sl = P.ecuries[9]; evts.push({ t0: sl.sortie + 0.05, t1: sl.place, n: 260, vie: [0.3, 0.65], graine: 'six-roues', source: sourceRoues(9, 'toutes', { avant: [-100, -35], lat: 40, haut: [25, 85] }) }); }
  { const sl = P.ecuries[7], b = voitures[7].boite;
    evts.push({ t0: sl.sortie + 0.05, t1: sl.place, n: 180, vie: [0.3, 0.6], graine: 'a4-frotte', source: (tb, a) => {
      const p = poseVoiture(7, tb); if (!p || p.phase === 'vol' || p.phase === 'garee') return null;
      const q = roueMonde(7, p, [(a[0] - 0.5) * 2.4, 0, b.min.z + 1.5]), v = vecMonde(p, lerp(-90, -30, a[1]), (a[2] - 0.5) * 80); v[1] = lerp(20, 70, a[3]);
      return { p: [q[0], q[1] + 0.2, q[2]], v, sol: p.pos[1] };
    } }); }
  const etincelles = creerEtincelles(THREE, { demiH: ctx.H / 2, evenements: evts }); groupe.add(etincelles.points);
  // huile de l'A4 #08 : gouttes précalculées (pures) sous l'arrière de la remorque, flaques là où elles touchent le sol
  const gouttes = [];
  { const sl = P.ecuries[7], b = voitures[7].boite, a = prng('huile-a4'), n = 34, t0 = sl.sortie + 0.15, t1 = sl.place + 0.4;
    for (let i = 0; i < n; i++) {
      const tb = t0 + (t1 - t0) * (i + a()) / n, p = poseVoiture(7, tb); if (!p) continue;
      const q = roueMonde(7, p, [(a() - 0.5) * 1.6, 0, b.min.z + 2.5 + a() * 5]);
      const y = p.pos[1] + 1.1, solY = p.phase === 'vol' ? decor.sol(q[0], q[2], 0) : p.pos[1];
      gouttes.push({ tb, p: [q[0], y, q[2]], sol: solY, r: 0.7 + 0.8 * a() });
    } }
  const huile = creerHuile(THREE, gouttes, { envMap: ctx.envMap }); groupe.add(huile.groupe);
  // flare des phares de la #03
  const b3 = voitures[2].boite, e3 = voitures[2].ech;
  const flares = creerFlares(THREE, voitures[2].env, [-1, 1].map((sg) => [sg * (b3.max.x - b3.min.x) * 0.3 / e3, (b3.max.y - b3.min.y) * 0.42 / e3, (b3.max.z - 0.25) / e3]), { ech: e3 });
  const boule = creerBoule(THREE, { envMap: ctx.envMap, demiH: ctx.H / 2, yTapis: G.MAT }); groupe.add(boule.groupe);
  const portail = creerPortail(THREE, { yTapis: G.MAT, rayon: 30 }); groupe.add(portail.groupe);
  const vortex = creerVortex(THREE, { yBouche: 700 }); groupe.add(vortex.groupe);

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
    const tous = Math.max(impulsion(t - AR.drop), impulsion(t - (AR.drop + 1.15)), impulsion(t - CO.portail), impulsion(t - P.gloire.confettis), impulsion(t - P.dep.demarrage), impulsion(t - P.dep.logo));
    return f.map((x) => Math.max(x, tous));
  }

  /* ═════════════ état de l'image courante (pour collisions()) ═════════════ */
  let etatCourant = { t: 0, poses: [], cordes: true, pont: 0, fret: null, trophee: false, hero: -1 };
  const ecranAffiche = (cle, img, couleurs) => ({ cle, img, couleurs });
  const ECRAN_GP = ecranAffiche('gp', logoImg, ['#3a1aa0', '#c03aa8']);
  const kCourant = (t) => { for (let k = 0; k < N; k++) if (t < P.ecuries[k].fin) return k; return N - 1; };

  const E_ = P.ecuries;
  const cles = [
    { t: AR.drop + 0.2, label: 'Arrivée · jaillit du vortex (DROP)' },
    { t: AR.drop + 2.0, label: 'Arrivée · descente dans l\'arène' },
    { t: E_[0].sortie + 2.35, label: '#01 · travelling latéral rasant' },
    { t: E_[1].sortie + 1.8, label: '#02 · vue de dessus, tête-à-queue' },
    { t: E_[2].sortie + 0.8, label: '#03 · 3/4 avant, flare des phares' },
    { t: E_[3].atterrissage + 0.7, label: '#04 · sous la boule à facettes' },
    { t: E_[4].sortie + 0.4, label: '#05 · cabrage au ras du pare-chocs' },
    { t: E_[6].atterrissage + 0.03, label: '#07 · impact à l\'atterrissage' },
    { t: E_[7].sortie + 1.9, label: '#08 · Dutch 8°, huile' },
    { t: E_[9].sortie + 1.0, label: '#10 · 6 roues en étincelles' },
    { t: E_[10].saut + 0.1, label: '#11 · smash cut' },
    { t: E_[12].atterrissage + 0.3, label: '#13 · smash cut' },
    { t: RU.cuts[1] + 0.5, label: 'Rush · #12 posé « JoJo »' },
    { t: RU.cuts[3] + 0.5, label: 'Rush · #14 profil drift' },
    { t: CO.debut + 0.6, label: 'Couronne des 15 concept-cars' },
    { t: CO.portail + 0.3, label: 'Portail express' },
    { t: P.tel.points + 0.3, label: 'Téléphone · points' },
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
      const enArrivee = t < P.ecuries[0].sortie;
      const ru = cad.rush(t), enRush = !!ru, enCouronne = t >= CO.debut && t < P.tel.debut;
      const tA = ru ? ru.tA : t;                                               // ralenti d'action : la scène est rejouée à tA
      // coupes franches (smash cuts, rush) : flash blanc de 2 images + petite surexposition + lumière locale sur la voiture
      const tCoupe = cad.coupes.reduce((m, c) => (c.t <= t && c.t > m ? c.t : m), -Infinity), coupeFlash = t - tCoupe < 2 / 60 ? 1 : 0;
      const enTel = t >= P.tel.debut && t < P.tel.fin;
      const enLoot = t >= P.loot.debut && t < P.gloire.debut;
      const enGloire = t >= P.gloire.debut && t < P.dep.debut;
      const enDep = t >= P.dep.debut;
      const k = ru ? ru.k : kCourant(t);

      /* ── voitures : seules celles déjà sorties sont visibles ; la vedette seule bouge ── */
      const poses = [];
      for (let j = 0; j < N; j++) {
        const v = voitures[j], p = poseVoiture(j, tA);
        v.env.visible = !!p;
        if (p) { poserE(v, p); animer(v.env, tA); v.env.updateMatrixWorld(true); }
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
      if (enArrivee) cam = cad.cameraArrivee(t);
      else if (enRush) cam = ru.cam;
      else if (enCouronne) cam = cad.cameraCouronne(t);
      else if (enEcuries) cam = cad.cameraEcurie(k, t);
      else if (enTel) { const a = (t - P.tel.debut) / (P.tel.fin - P.tel.debut); cam = { p: [-14 + 22 * a, G.MAT + 27 - 3 * a, 132 - 6 * a], c: [0, G.MAT + 8, 0], fov: 34 }; }
      else if (t < T_L2) { cam = hcam(LOOT, t); cam.c = [0, Math.max(G.MAT + 10, fret.groupe.position.y + 8), 0]; }
      else if (t < T_L3) cam = hcam(LOOT2, t);
      else if (t < Gl.trophee_haut) cam = cameraSortie(t);
      else if (t < D.debut) cam = cameraOrbite(t);
      else if (t < D.demarrage + 1.1) cam = hcam(DEP1, t);
      else if (t < D.piste + 0.3) { const p = hermite(DEP2, t, 'p'), q = depart.pointFile(depart.S(t) - 40); cam = { p, c: [q[0], q[1] + 3, q[2]], fov: 44 }; }     // la caméra rasante suit la file qui passe
      else if (t < T_LARGE) cam = cameraPoursuite(t);
      else cam = cameraLarge(t);
      if (enArrivee || enEcuries) cam = secouer(cam, trauma(t), enCouronne ? 0.6 : 1);
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
      if (enEcuries && !enCouronne) { const e = equipes[k]; ecran = ecranAffiche('k' + k, ctx.logos[e.id], e.colors); }
      const debout = enGloire || enDep ? smoother((t - Gl.confettis) / 0.8) : 0;
      const confettis = enArrivee ? 0.8 * smoother((t - AR.drop) / 0.25) * (1 - smoother((t - (AR.fin - 0.9)) / 0.9)) : (enGloire || enDep) ? smoother((t - Gl.confettis) / 0.4) * (enDep ? 1 - 0.6 * smoother((t - (D.debut - 0.5)) / 2) : 1) : 0;
      const neige = (enGloire || enDep) ? 0.9 * smoother((t - P.gloire.confettis) / 0.6) : 0;
      const hero = enEcuries && !enCouronne ? k : -1;
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
        suivi: ph ? (k === 1 ? 0.15 : 0.5) + 1.6 * coupeFlash : (enTel ? 0.45 : 0), posSuivi: ph ? [ph.pos[0] + 6, ph.pos[1] + 30, ph.pos[2] + 6] : [cam.p[0] - 30, cam.p[1] + 40, cam.p[2] - 10],
      });
      /* ── effets de la gloire : faisceaux vers la coupe, feux d'artifice dorés, ondes aux frappes du titre ── */
      effets.maj(t, {
        feux: Gl.feux, forceFeux: enGloire || enDep ? 1 - smoother((t - D.demarrage) / 1.5) : 0,
        faisceaux: enGloire ? smoother((t - Gl.debut) / 0.8) : (enDep ? 1 - smoother((t - D.debut) / 1.2) : 0),
        cible: cTro, ondes: enGloire ? [Gl.titre_gloire, Gl.titre_eternelle] : [], forceOndes: 1,
      });
      /* ── juice diégétique ── */
      ombres.maj(poses, { pont: enDep ? smoother((t - D.cordes) / 0.6) : 0 });
      etincelles.maj(t);
      huile.maj(t);
      flares.maj(tA, k === 2 && enEcuries && !enRush ? smoother((tA - P.ecuries[2].sortie) / 0.3) * (1 - smoother((tA - P.ecuries[2].fin + 0.3) / 0.3)) : 0);
      const yEcran = enLoot || enGloire ? 205 + 150 * smoother((t - P.loot.debut) / 1.0) : (enDep ? 355 + 300 * smoother((t - P.dep.debut) / 2.0) : 205);
      boule.maj(t, { y: yEcran - 60, yAccroche: yEcran - 30, visible: t < P.tel.debut });
      portail.maj(t, enCouronne ? smoother((t - CO.portail) / 0.35) : 0);
      vortex.maj(t, enArrivee ? 1 - smoother((t - AR.drop - 0.5) / 0.8) : 0);
      etatCourant = { t: tA, poses, cordes: !enDep || t < D.cordes, pont: enDep ? smoother((t - D.cordes) / 0.6) : 0, fret: fret.obb(), murs: fret.murs(), trophee: trophee.obb(), hero };

      /* ── brouillard, post ── */
      // brume du vortex (palette cyan / magenta / or / violet) qui se dissipe après le DROP
      const haze = enArrivee ? 1 - smoother((t - AR.drop) / 1.2) : 0;
      const PAL = ['#2de2ff', '#ff3fa4', '#ffc83d', '#8a4dff'], phv = ((t - AR.drop) * 2.2 % 4 + 4) % 4, i0 = Math.floor(phv);
      const teinte = new THREE.Color(PAL[i0]).lerp(new THREE.Color(PAL[(i0 + 1) % 4]), phv - i0);
      const brouillard = { couleur: haze > 0.01 ? '#' + new THREE.Color(BRUME.couleur).lerp(teinte, haze).getHexString() : BRUME.couleur, densite: lerp(BRUME.densite, 0.0016, haze) };
      const sortieRose = enArrivee ? Math.exp(-Math.max(0, t - AR.drop) / 0.22) : 0;
      const frappe = (a) => (a < 0 ? 0 : Math.exp(-a * 9));
      const flashOr = enFin ? 0.025 * Math.sin(Math.PI * clamp((t - Gl.trophee_haut + 0.25) / 0.5)) + 0.035 * frappe(t - Gl.titre_gloire) + 0.045 * frappe(t - Gl.titre_eternelle) : 0;
      const post = {
        exposition: (enFin || enTel ? 0.86 : 0.8) + 0.18 * coupeFlash, vignette: 0.45, saturation: 1.14, bloomForce: enTel ? 0.24 : (enFin ? 0.36 : 0.55),
        flash: Math.min(0.05, 0.05 * sortieRose + flashOr + 0.05 * coupeFlash), flashCouleur: enFin ? [1, 0.82, 0.45] : (coupeFlash ? [1, 1, 1] : [0.85, 0.6, 1]), flou: 0, aberration: 0.0005,
      };

      /* ── habillage ── */
      const hud = (g, W, H) => {
        if (enRush) { const tc0 = RU.cuts[ru.i]; bandeauCompact(g, W, H, fiches[k], t - tc0, smoother((t - (tc0 + 0.86)) / 0.1)); }
        else if (enEcuries && !enCouronne) {
          const sl = P.ecuries[k];
          if (!sl.smash) bandeau.dessiner(g, W, H, k, t - sl.debut, sl.fin - sl.debut);
          else { const cs = cad.coupesDe(sl).filter((c) => c <= t), c0 = cs.length ? cs[cs.length - 1] : sl.debut; bandeauCompact(g, W, H, fiches[k], t - c0, smoother((t - (sl.fin - 0.22)) / 0.15)); }
        }
        if (enGloire) titreGloire(g, W, H, t);
        if (enDep) logoFinal(g, W, H, t);
      };
      return {
        camera: { p: cam.p, c: cam.c, fov: cam.fov, roll: cam.roll || 0, near: 0.8, far: 6000 },
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
    infos() { return { voitures: voitures.map((v) => ({ nom: v.nom, L: +v.d.L.toFixed(2), largeur: +(v.boite.max.x - v.boite.min.x).toFixed(2), hauteur: +(v.boite.max.y - v.boite.min.y).toFixed(2), ymin: +v.boite.min.y.toFixed(2), ez: +v.d.ez.toFixed(2), ex: +v.d.ex.toFixed(2), roues: v.env.v7.roues.length, ech: +v.ech.toFixed(2) })), places: entrees.places.map((p) => Math.round(p / DEG)) }; },
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
