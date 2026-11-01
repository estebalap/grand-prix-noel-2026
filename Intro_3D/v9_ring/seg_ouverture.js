/* SEGMENT « OUVERTURE » de la V9 Ring — film 0 → 15,5 s (temps interne = temps film). Part du segment salon V8 validé.

    0 →  7 s  CHEMINÉE : le salon dans la pénombre (spots, sapin, vraie cheminée éteints). Seule source : la TÉLÉ, qui diffuse un
              feu de cheminée plein écran (ouverture_tele.js). Sa lueur orange danse sur le canapé de cuir blanc, le sapin éteint, le
              tapis rouge (deux lumières ponctuelles devant l'écran, vacillement partagé avec le shader). Travelling très lent vers la
              télé, fondu d'entrée depuis le noir (0,8 s). Aucun texte.
    7 → 11 s  ALLUMAGE : 7,0 s une étincelle saute de l'écran jusqu'au pied du sapin ; 7,2 → 8,6 s les guirlandes s'allument en
              cascade de bas en haut (instanceColor par hauteur, 5 couleurs des voies), l'étoile éclate, puis spots, ambiance et
              vraie cheminée montent. 8,8 s : sur la télé les flammes se rétractent et révèlent le LOGO officiel (data/logo_gp.png)
              dans un choc doré LOCAL (lumière dorée + aura additive + bloom ; flash post ≤ 0,05). Voix off : « Mesdames et
              messieurs… bienvenue au Grand Prix de Noël ! ». La caméra cadre la télé (logo grand et lisible), puis se retourne et
              s'élève vers le tapis.
   11 → 15,5 s LE TAPIS : mécanique V8 décalée de +3 s (fente 11,25 s, ouverture 11,6 s en ressort amorti, lumière arc-en-ciel,
              plongée dans le puits ~14,0 s). Le puits débouche dans une LUMIÈRE de salle de spectacle (rose #ff3fa4 / cyan #2de2ff,
              faisceaux, confettis lumineux) qui envahit l'image de 14,8 à 15,5 s : à 15,5 s l'image est dominée par un rose-violet
              lumineux (raccord avec seg_arene.js qui sort de cette lumière en descendant du ciel vers le ring).

   Contrat : creerSegment(ctx) → { id: 'ouverture', groupe, cles, maj(t), collisions() }. maj(t) est une FONCTION PURE de t : toutes
   les intensités, couleurs, uniforms, positions touchées sont remises à chaque image ; nombre de lumières constant (on ne joue que
   sur les intensités) ; aucun Math.random() ; aucun HUD. Aucun fichier existant modifié (salon.js et salon_bascule.js importés). */
import { construireSalon, environnementSalon } from '../src/decors/salon.js';
import { trouverPieces, solPerce, creerBattants, creerPuits, creerFaisceau, VOIES_ARC } from '../v8_finale/salon_bascule.js';
import { chargerImage, textureLogo, creerEcranFeu, creerHaloTele, vacillement } from './ouverture_tele.js';
import { creerDome, creerFaisceaux, creerConfettis, creerEtincelle } from './ouverture_spectacle.js';

/* ───────── repères de temps (plan_v9.json : "ouverture") ───────── */
const T_ETINCELLE = 7.0, DUREE_ETINCELLE = 0.26;
const T_GUIRLANDES = [7.2, 8.6];
const T_LOGO = 8.8;
const T_TABLE = [10.7, 11.5];        // la table basse glisse vers la télé (V8 + 3 s)
const T_FENTE = 11.25, T_OUVERTURE = 11.6;
const PROF_PUITS = 350;
const DOME = { centre: [0, -1150, 25], rayon: 900 };   // la bulle de lumière sous le puits

/** Spline d'Hermite cubique à tangentes de Catmull-Rom non uniformes (C1 en temps : vitesse continue, aucune saccade). */
function hermite(cles, t, cle) {
  const n = cles.length;
  if (t <= cles[0].t) return cles[0][cle];
  if (t >= cles[n - 1].t) return cles[n - 1][cle];
  let i = 0; while (i < n - 2 && t > cles[i + 1].t) i++;
  const a = cles[i], b = cles[i + 1], h = b.t - a.t, u = (t - a.t) / h;
  const tan = (j) => {
    if (j <= 0 || j >= n - 1) return null;
    const p = cles[j - 1], q = cles[j + 1], dt = q.t - p.t;
    const va = Array.isArray(p[cle]) ? p[cle] : [p[cle]], vb = Array.isArray(q[cle]) ? q[cle] : [q[cle]];
    return va.map((x, k) => (vb[k] - x) / dt);
  };
  const A = Array.isArray(a[cle]) ? a[cle] : [a[cle]], B = Array.isArray(b[cle]) ? b[cle] : [b[cle]];
  const ma = tan(i) || A.map(() => 0), mb = tan(i + 1) || A.map(() => 0);
  const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
  const r = A.map((x, k) => h00 * x + h10 * h * ma[k] + h01 * B[k] + h11 * h * mb[k]);
  return Array.isArray(a[cle]) ? r : r[0];
}

export async function creerSegment(ctx) {
  const { THREE, renderer, outils } = ctx;
  const { clamp, lerp, smoother } = outils;
  const groupe = new THREE.Group(); groupe.name = 'seg-ouverture';
  const demiH = ctx.H / 2;

  /* ═════════════ LE LOGO (attendu avant de construire quoi que ce soit) ═════════════ */
  const imgLogo = await chargerImage(new URL('./data/logo_gp.png', import.meta.url).href);
  const texLogo = textureLogo(THREE, imgLogo);

  /* ═════════════ LE SALON (identique à la V8) ═════════════ */
  const salon = ctx.avecAlea('salon-v9', () => construireSalon({ graine: 2312 }));
  groupe.add(salon.groupe);
  const A = salon.ancres;
  const envSalon = environnementSalon(renderer);
  const matsEnv = [];                                                       // matériaux à reflets : leur envMapIntensity suit l'éclairage
  salon.groupe.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && !m.envMap) { m.envMap = envSalon; m.envMapIntensity = 0.55; m.needsUpdate = true; }
    }
  });

  /* repérage des pièces du salon (sans modifier salon.js) */
  let ampoules = null, etoile = null, ecran = null, feuCheminee = null, lueurTV = null, lueurSapin = null, lune = null, hemiSalon = null;
  const spots = [], disquesSpots = [], flammesCheminee = [], braises = [];
  salon.groupe.traverse((o) => {
    if (o.isInstancedMesh) ampoules = o;
    else if (o.isMesh && o.geometry.type === 'OctahedronGeometry') etoile = o;
    else if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.material.isMeshBasicMaterial && Math.abs(o.geometry.parameters.width - (A.ecran.largeur - 3)) < 0.5) ecran = o;
    else if (o.isMesh && o.geometry.type === 'CylinderGeometry' && o.material.isMeshBasicMaterial && o.geometry.parameters.radiusTop === 6) disquesSpots.push(o);
    else if (o.isMesh && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.graine) flammesCheminee.push(o);
    else if (o.isMesh && o.material.isMeshStandardMaterial && o.material.emissiveIntensity > 0 && o.material.emissive && o.material.emissive.getHex() === 0xc22a00) braises.push(o);
    if (o.isSpotLight) spots.push({ l: o, base: o.intensity });
    else if (o.isHemisphereLight) hemiSalon = o;
    else if (o.isPointLight) {
      if (o.castShadow) feuCheminee = o;
      else if (o.color.getHex() === 0x5d8cff) lueurTV = o;
      else if (o.color.getHex() === 0xffc27a) lueurSapin = o;
      else if (o.color.getHex() === 0x8fb2ff) lune = o;
    }
  });
  if (!ampoules || !etoile || !ecran || !feuCheminee || !lueurTV || !lueurSapin || !lune || !hemiSalon || spots.length !== 3 || !flammesCheminee.length) {
    throw new Error('ouverture : pièces du salon introuvables');
  }
  const baseSpots = spots.map((s) => s.base);
  const coulEtoile = etoile.material.color.clone(), coulDisque = disquesSpots.length ? disquesSpots[0].material.color.clone() : new THREE.Color(1, 1, 1);
  const braiseBase = braises.map((m) => m.material.emissiveIntensity);

  /* guirlande : hauteur normalisée de chaque ampoule, couleur de voie, phase de scintillement */
  const NB = ampoules.count, hauteurs = new Float32Array(NB), m4 = new THREE.Matrix4(), v3 = new THREE.Vector3();
  let hMin = Infinity, hMax = -Infinity;
  for (let i = 0; i < NB; i++) { ampoules.getMatrixAt(i, m4); v3.setFromMatrixPosition(m4); hauteurs[i] = v3.y; hMin = Math.min(hMin, v3.y); hMax = Math.max(hMax, v3.y); }
  for (let i = 0; i < NB; i++) hauteurs[i] = (hauteurs[i] - hMin) / Math.max(1e-6, hMax - hMin);
  const coulVoies = VOIES_ARC.map((c) => new THREE.Color(c));
  const colTmp = new THREE.Color();

  /* l'écran : feu de cheminée → logo */
  const aspect = ecran.geometry.parameters.width / ecran.geometry.parameters.height;
  const tele = creerEcranFeu(THREE, texLogo, aspect);
  ecran.material = tele.mat;
  const halo = creerHaloTele(THREE, A.ecran); groupe.add(halo.mesh);

  /* ═════════════ LA TRAPPE (salon_bascule.js V8, tel quel) ═════════════ */
  const pieces = trouverPieces(THREE, salon.groupe, A.tapis);
  const tp = A.tapis, trou = { x0: tp.centre.x - tp.largeur / 2, x1: tp.centre.x + tp.largeur / 2, z0: tp.centre.z - tp.profondeur / 2, z1: tp.centre.z + tp.profondeur / 2 };
  pieces.sol.visible = false; pieces.tapis.visible = false;
  const sol2 = solPerce(THREE, pieces.sol, trou); salon.groupe.add(sol2);
  const battants = creerBattants(THREE, pieces.tapis, tp, envSalon); salon.groupe.add(battants.groupe);
  battants.groupe.traverse((o) => { if (o.isMesh && o.material.envMap) matsEnv.push({ m: o.material, base: o.material.envMapIntensity }); });
  salon.groupe.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.envMap === envSalon && !matsEnv.some((e) => e.m === m)) matsEnv.push({ m, base: m.envMapIntensity });
  });
  const puits = creerPuits(THREE, trou, PROF_PUITS); groupe.add(puits.groupe);
  const faisceau = creerFaisceau(THREE, trou, 235); groupe.add(faisceau.groupe);

  /* ═════════════ SOUS LE TAPIS : LA LUMIÈRE DE SPECTACLE ═════════════ */
  const dome = creerDome(THREE, DOME.centre, DOME.rayon); groupe.add(dome.mesh);
  const projos = creerFaisceaux(THREE, DOME.centre, DOME.rayon, 6); groupe.add(projos.groupe);
  const confettis = creerConfettis(THREE, { x: tp.centre.x, z: tp.centre.z, rayon: 560, yHaut: -200, yBas: -2000, demiH, graine: 1512 }); groupe.add(confettis.mesh);

  /* ═════════════ L'ÉTINCELLE : de l'écran au pied du sapin ═════════════ */
  const E = A.ecran.centre;
  const etincelle = creerEtincelle(THREE, { A: [E.x + 28, E.y - 8, E.z + 3], C: [E.x + 120, E.y + 105, E.z + 70], B: [150, 36, -2], t0: T_ETINCELLE, duree: DUREE_ETINCELLE, demiH });
  groupe.add(etincelle.mesh);

  /* ═════════════ LUMIÈRES PROPRES AU SEGMENT (nombre constant) ═════════════ */
  const chaud = new THREE.HemisphereLight(0xffd6a6, 0x4a2414, 0.0); groupe.add(chaud);
  const plafonnier = new THREE.PointLight(0xffbc80, 0.0, 900, 2); plafonnier.position.set(0, 225, 40); groupe.add(plafonnier);
  const halo2 = new THREE.PointLight(0xff9a52, 0.0, 700, 2); halo2.position.set(150, 90, -60); groupe.add(halo2);
  const feuTV = new THREE.PointLight(0xff7a26, 0.0, 620, 2); feuTV.position.set(E.x, E.y - 5, E.z + 34); groupe.add(feuTV);         // lueur du feu de la télé
  const feuTVBas = new THREE.PointLight(0xff5a14, 0.0, 430, 2); feuTVBas.position.set(E.x, 34, E.z + 90); groupe.add(feuTVBas);    // rase le tapis
  const choc = new THREE.PointLight(0xffc860, 0.0, 900, 2); choc.position.set(E.x, E.y, E.z + 60); groupe.add(choc);                // choc doré du logo
  const lumEtincelle = new THREE.PointLight(0xffb050, 0.0, 260, 2); lumEtincelle.position.set(E.x, E.y, E.z + 10); groupe.add(lumEtincelle);
  const arcs = VOIES_ARC.map((c, i) => { const l = new THREE.PointLight(c, 0.0, 520, 2); l.position.set(lerp(trou.x0 + 35, trou.x1 - 35, i / 4), 18, tp.centre.z); groupe.add(l); return l; });
  const coulFeu = new THREE.Color(0xff7a26), coulLogo = new THREE.Color(0xc9a6ff), coulTmp = new THREE.Color();
  const coulHaloFeu = new THREE.Color(1.0, 0.42, 0.1), coulHaloOr = new THREE.Color(1.0, 0.78, 0.36), coulHaloLogo = new THREE.Color(0.75, 0.6, 1.0);

  /* ═════════════ TRAJECTOIRE DE CAMÉRA (une seule courbe continue de 0 à 15,5 s) ═════════════ */
  const CAM = [
    { t: 0.0, p: [-128, 116, 216], c: [34, 84, -150], fov: 50 },            // derrière le canapé, la télé-cheminée au fond
    { t: 3.5, p: [-104, 120, 200], c: [40, 85, -146], fov: 50 },
    { t: 7.0, p: [-74, 126, 176], c: [48, 86, -140], fov: 51 },             // travelling très lent vers la télé ; le sapin entre à droite
    { t: 8.0, p: [-56, 128, 150], c: [70, 92, -110], fov: 52 },             // on suit la cascade des guirlandes
    { t: 8.9, p: [-30, 122, 92], c: [18, 104, -160], fov: 48 },             // choc doré : retour vers la télé
    { t: 9.6, p: [0, 113, 6], c: [0, 111, -177], fov: 44 },                 // le logo, grand et lisible
    { t: 10.4, p: [0, 114, -16], c: [0, 111, -177], fov: 43 },
    { t: 11.0, p: [-22, 165, -50], c: [36, 22, 0], fov: 48 },             // on se retourne vers le salon en s'élevant
    { t: 11.7, p: [-10, 214, -72], c: [0, 0, 20], fov: 50 },                // le tapis vu du côté télé : la fente
    { t: 12.6, p: [0, 238, -44], c: [0, 0, 22], fov: 48 },                  // la trappe s'ouvre sous nos yeux
    { t: 13.4, p: [0, 248, 6], c: [0, 0, 24], fov: 45 },                    // plongée verticale sur la fente arc-en-ciel
    { t: 14.0, p: [0, 160, 10], c: [0, -300, 24], fov: 50 },                // on plonge
    { t: 14.5, p: [0, -265, 12], c: [0, -900, 22], fov: 62 },               // dans le puits lumineux
    { t: 15.5, p: [0, -930, 15], c: [0, -1700, 21], fov: 70 },              // dans la lumière de spectacle
    { t: 16.0, p: [0, -1180, 16], c: [0, -1950, 21], fov: 72 },             // clé fantôme : vitesse non nulle à 15,5 s (raccord)
  ];
  const camera = (t) => ({ p: hermite(CAM, t, 'p'), c: hermite(CAM, t, 'c'), fov: hermite(CAM, t, 'fov') });

  /** Angle d'ouverture des battants (rad) : entrebâillement, puis ressort amorti (léger rebond en butée à ~106°). */
  function angleBattants(t) {
    const fente = 0.035 * smoother((t - T_FENTE) / 0.35);
    if (t < T_OUVERTURE) return fente;
    const s = t - T_OUVERTURE, w = 4.4, z = 0.5, wd = w * Math.sqrt(1 - z * z);
    const r = 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z * w / wd) * Math.sin(wd * s));
    return fente + (1.85 - fente) * r;
  }

  return {
    id: 'ouverture', groupe,
    cles: [{ t: 3.5, label: 'Feu sur la télé' }, { t: 9.6, label: 'Le logo s\'allume' }, { t: 12.6, label: 'Le tapis s\'ouvre' }],
    collisions() { return []; },
    maj(t) {
      const cam = camera(t);
      const dessous = cam.p[1] < -2;                                        // la caméra a franchi le plancher
      const ang = angleBattants(t), ouv = clamp(ang / (Math.PI / 2), 0, 1);
      const vac = vacillement(t);

      /* ── enveloppes ── */
      const amb = smoother((t - 8.5) / 1.1);                               // spots et ambiance du salon
      const cheminee = smoother((t - 9.0) / 0.9);                          // la vraie cheminée prend le relais du feu de la télé
      const flamme = 1 - smoother((t - (T_LOGO - 0.12)) / 0.5);            // les flammes de la télé se rétractent
      const revele = smoother((t - T_LOGO) / 0.55);
      const eChoc = t < T_LOGO - 0.04 ? 0 : smoother((t - (T_LOGO - 0.04)) / 0.06) * Math.exp(-Math.max(0, t - T_LOGO) * 2.4);
      const brille = smoother((t - (T_LOGO + 0.3)) / 0.6);
      const salonVu = dessous ? 0 : 1;

      /* ── salon : animation d'origine puis recalibrage (rendu non « physique », comme en V8) ── */
      salon.maj(t, { intensiteSalon: 1, tvAllumee: 1 });
      const fS = 0.24 * amb * salonVu;
      hemiSalon.intensity = 0.28 * fS + 0.012 * salonVu;
      spots.forEach((s, i) => { s.l.visible = true; s.l.intensity = baseSpots[i] * fS; });
      feuCheminee.intensity = 3.2 * vac * 0.24 * (0.04 + 0.96 * cheminee) * salonVu;
      lueurTV.intensity = 0;                                                 // remplacée par feuTV (couleur pilotée)
      lune.intensity = 0.55 * 0.32 * salonVu;
      for (const f of flammesCheminee) { const k = Math.max(0.001, cheminee); f.scale.set(1, k, 1); f.visible = cheminee > 0.002; }
      braises.forEach((m, i) => { m.material.emissiveIntensity = braiseBase[i] * (0.25 + 0.75 * cheminee); });
      for (const d of disquesSpots) d.material.color.copy(coulDisque).multiplyScalar(0.04 + 0.96 * amb);
      for (const e of matsEnv) e.m.envMapIntensity = e.base * (0.07 + 0.93 * amb);

      /* ── guirlandes : cascade de bas en haut (7,2 → 8,6 s), 5 couleurs des voies ── */
      const ic = ampoules.instanceColor.array, dureeCascade = T_GUIRLANDES[1] - T_GUIRLANDES[0] - 0.12;
      let allumees = 0;
      for (let i = 0; i < NB; i++) {
        const tOn = T_GUIRLANDES[0] + hauteurs[i] * dureeCascade;
        const on = smoother((t - tOn) / 0.12);
        const pop = t > tOn ? 1 + 1.2 * Math.exp(-(t - tOn) * 7) : 1;
        const sc = 0.72 + 0.28 * Math.sin(t * (1.3 + (i % 5) * 0.37) + i * 2.399);
        const k = (0.012 + on * 2.4 * sc * pop);
        colTmp.copy(coulVoies[i % 5]).multiplyScalar(k);
        ic[i * 3] = colTmp.r; ic[i * 3 + 1] = colTmp.g; ic[i * 3 + 2] = colTmp.b;
        allumees += on;
      }
      ampoules.instanceColor.needsUpdate = true;
      const fracGuirl = allumees / NB;
      const eEtoile = smoother((t - T_GUIRLANDES[1]) / 0.12), popEtoile = t > T_GUIRLANDES[1] ? 1 + 1.5 * Math.exp(-(t - T_GUIRLANDES[1]) * 5) : 1;
      etoile.material.color.copy(coulEtoile).multiplyScalar(0.03 + 1.4 * eEtoile * popEtoile);
      lueurSapin.intensity = 0.9 * (0.15 + 0.85 * fracGuirl) * fracGuirl * 0.6 * salonVu;

      /* ── la télé : feu → logo ── */
      const gainTV = (0.15 + 0.85 * smoother((t - 0.1) / 0.9)) * lerp(0.62, 0.92, revele);
      tele.maj({ t, flamme, revele, choc: eChoc, brille, gain: gainTV, escarbilles: 1 - smoother((t - 9.0) / 0.8) });
      coulTmp.copy(coulFeu).lerp(coulLogo, revele);
      feuTV.color.copy(coulTmp);
      const danse = Math.pow(vac, 1.8);
      feuTV.intensity = salonVu * lerp(0.55 * danse, 0.7, revele);
      feuTVBas.intensity = salonVu * 0.42 * danse * (1 - revele);
      choc.intensity = salonVu * 1.8 * eChoc;
      const forceHalo = salonVu * gainTV * ((0.22 + 0.05 * (vac - 0.8)) * (1 - revele) + 0.16 * revele + 0.7 * eChoc);
      coulTmp.copy(coulHaloFeu).lerp(coulHaloLogo, revele).lerp(coulHaloOr, clamp(eChoc * 1.4, 0, 1));
      halo.maj({ force: forceHalo, couleur: coulTmp, rayons: 0.35 * revele + 1.6 * eChoc, t });

      /* ── l'étincelle ── */
      etincelle.maj(t);
      const tete = etincelle.tete(t), dImpact = t - (T_ETINCELLE + DUREE_ETINCELLE);
      if (tete) lumEtincelle.position.set(tete[0], tete[1], tete[2]); else lumEtincelle.position.set(150, 40, -2);
      lumEtincelle.intensity = salonVu * (tete ? 1.6 : (dImpact >= 0 ? 1.8 * Math.exp(-dImpact * 5) : 0));

      /* ── ambiance chaude du salon allumé (comme en V8) ; elle s'efface un peu quand l'arc-en-ciel prend le relais ── */
      const chaleur = salonVu * amb * (1 - 0.45 * smoother((t - 11.0) / 1.4));
      chaud.intensity = 0.24 * chaleur;
      plafonnier.intensity = 0.6 * chaleur;
      halo2.intensity = (0.5 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 17.3 + 1.1)) * chaleur * (0.3 + 0.7 * cheminee);

      /* ── table basse : glisse vers la télé avant l'ouverture ── */
      const dz = -135 * smoother((t - T_TABLE[0]) / (T_TABLE[1] - T_TABLE[0]));
      pieces.table.forEach((m, i) => { const b = pieces.tableBase[i]; m.position.set(b.x, b.y, b.z + dz); });

      /* ── trappe, lumière arc-en-ciel, puits ── */
      battants.maj(ang);
      const jaillit = smoother((t - T_FENTE) / 0.5) * (0.25 + 0.75 * smoother((t - T_OUVERTURE) / 0.6));
      const prox = 1 - 0.85 * smoother((t - 13.0) / 0.6);
      faisceau.maj(dessous ? 0 : 0.38 * jaillit * prox, Math.max(ouv, 0.05), t);
      arcs.forEach((l, i) => { l.intensity = dessous ? 0 : jaillit * (0.9 + 0.15 * Math.sin(t * 4.0 + i * 1.3)); });
      const defil = 0.9 * t + 7.0 * smoother((t - 13.8) / 1.2);
      puits.maj(-defil, 0.6 * smoother((t - 11.45) / 0.7) * (1 - smoother((t - 14.75) / 0.5)));

      /* ── la lumière de spectacle : aperçue par la trappe, puis elle envahit l'image (14,8 → 15,5 s) ── */
      const eSpect = 0.25 * smoother((t - 11.7) / 1.0) + 0.5 * smoother((t - 14.2) / 0.9);
      dome.maj(t, eSpect);
      projos.maj(t, 0.32 * smoother((t - 12.2) / 1.0) - 0.08 * smoother((t - 14.8) / 0.6));
      confettis.maj(t, smoother((t - 13.6) / 0.8));

      /* ── post-traitement ── */
      const fondu = 1 - smoother(t / 0.8);
      const plonge = smoother((t - 13.9) / 0.4) * (1 - 0.7 * smoother((t - 14.9) / 0.6));
      const fin = smoother((t - 14.8) / 0.7);
      const post = {
        exposition: lerp(lerp(0.9, 0.88, amb), 0.8, fin), vignette: lerp(lerp(0.62, 0.48, amb), 0.32, fin),
        saturation: lerp(lerp(1.1, 1.03, amb), 1.2, fin), bloomForce: lerp(0.3 + 0.12 * eChoc, 0.4, fin),
        flash: 0.03 * fin, flashCouleur: [1.0, 0.32, 0.78], fondu, flou: 0.35 * plonge, centreFlou: [0.5, 0.5],
        aberration: 0.0005 + 0.0012 * plonge,
      };

      return {
        camera: { p: cam.p, c: cam.c, fov: cam.fov, near: 3, far: 4600 },
        fond: dessous ? 0x2a0c3a : 0x05040a,
        brouillard: null,
        lumieres: { hemi: 0, cle: 0 },
        post,
      };
    },
  };
}
