/* ARCHIVE (V9.2, non chargée : remplacée par seg_ouverture.js V9.3 « crescendo ») — SEGMENT « OUVERTURE » de la V9.2 Ring — film 0 → 6,5 s (temps interne = temps film). Version V9.1 archivée dans
   ouverture_archive_v91.js (feu de cheminée sur la télé, trappe du tapis) : la trappe et la plongée sont supprimées (choix du client).

    0 → 4,6 s  LE SALON CHAUD : salon de Noël cosy et éclairé (sapin et guirlandes allumés, vraie cheminée qui crépite, lumière
               ambrée), télé éteinte (noir laqué). Lent travelling depuis le canapé vers la télé.
               Voix : « Mesdames et messieurs… bienvenue au Grand Prix de Noël ! » (0,1 → 3,7) puis « Le salon… » (3,75).
    4,6 s      LA TÉLÉ S'ALLUME (allumage cathodique électrique, LOGO blanc-bleu saturé, halo additif) et le salon S'ASSOMBRIT
               BRUTALEMENT (facteur 1 → 0,08 en 0,15 s : sapin, guirlandes, cheminée, spots) ; seule la dalle irradie, une lumière
               froide de la télé balaie la pièce (projecteur dont la cible balaie le salon).
    5,0 → 6,5 s LA TÉLÉ ASPIRE LA CAMÉRA : vortex (FOV 38° → 88° → 48°, roulis hélicoïdal qui vrille), cadres néon aspirés autour de
               la dalle, EXPLOSION de 340 particules néon 3D (cyan, magenta, or, violet) qui jaillissent de l'écran, envahissent le
               salon et tourbillonnent autour de l'axe de la télé pendant que la caméra y est avalée ; la caméra traverse la dalle
               (≈ 5,95 s) et file dans le TUNNEL NÉON 3D (280 particules filantes, lumière rose au bout).
               Voix : « …se transforme en… » (5,2 → 6,17), micro-suspense, « ARÈNE ! » à 6,5 s sur la coupe.
    6,5 s      l'image est DANS le tunnel néon (cyan / magenta / or / violet, lumineux, ni noir ni blanc pur) : raccord avec l'arène.

   Contrat : creerSegment(ctx) → { id: 'ouverture', groupe, cles, maj(t), collisions() }. maj(t) est une FONCTION PURE de t (tout ce
   qui est touché est remis à chaque image), nombre de lumières constant (seules les intensités varient), aucun Math.random(),
   flash post ≤ 0,05 (l'éclat vient de la dalle, du halo additif et des lumières locales), aucun HUD. */
import { construireSalon, environnementSalon } from '../src/decors/salon.js';
import { VOIES_ARC } from '../v8_finale/salon_bascule.js';
import { chargerImage, textureLogo, creerHaloTele } from './ouverture_tele.js';
import { creerEcranVortex, creerAnneauxAspirants, creerExplosionNeon, creerTunnelNeon } from './ouverture_vortex.js';

/* ───────── repères de temps (plan_v9.json v9.2 : "ouverture") ───────── */
const T_TV = 4.6;                    // tv_allume = salon_dim
const T_ASPI = [5.0, 6.5];           // aspiration
const T_FIN = 6.5;

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

  /* ═════════════ LE SALON (../src/decors/salon.js, non modifié) ═════════════ */
  const salon = ctx.avecAlea('salon-v92', () => construireSalon({ graine: 2312 }));
  groupe.add(salon.groupe);
  const A = salon.ancres, E = A.ecran.centre;
  const envSalon = environnementSalon(renderer);
  const matsEnv = [];
  salon.groupe.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && !m.envMap) { m.envMap = envSalon; m.envMapIntensity = 0.55; m.needsUpdate = true; }
      if (m && m.envMap === envSalon && !matsEnv.some((e) => e.m === m)) matsEnv.push({ m, base: m.envMapIntensity });
    }
  });

  /* repérage des pièces du salon */
  let ampoules = null, etoile = null, ecran = null, feuCheminee = null, lueurTV = null, lueurSapin = null, lune = null, hemiSalon = null;
  const spots = [], disquesSpots = [], braises = [];
  salon.groupe.traverse((o) => {
    if (o.isInstancedMesh) ampoules = o;
    else if (o.isMesh && o.geometry.type === 'OctahedronGeometry') etoile = o;
    else if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.material.isMeshBasicMaterial && Math.abs(o.geometry.parameters.width - (A.ecran.largeur - 3)) < 0.5) ecran = o;
    else if (o.isMesh && o.geometry.type === 'CylinderGeometry' && o.material.isMeshBasicMaterial && o.geometry.parameters.radiusTop === 6) disquesSpots.push(o);
    else if (o.isMesh && o.material.isMeshStandardMaterial && o.material.emissive && o.material.emissive.getHex() === 0xc22a00) braises.push(o);
    if (o.isSpotLight) spots.push({ l: o, base: o.intensity });
    else if (o.isHemisphereLight) hemiSalon = o;
    else if (o.isPointLight) {
      if (o.castShadow) feuCheminee = o;
      else if (o.color.getHex() === 0x5d8cff) lueurTV = o;
      else if (o.color.getHex() === 0xffc27a) lueurSapin = o;
      else if (o.color.getHex() === 0x8fb2ff) lune = o;
    }
  });
  if (!ampoules || !etoile || !ecran || !feuCheminee || !lueurTV || !lueurSapin || !lune || !hemiSalon || spots.length !== 3) throw new Error('ouverture : pièces du salon introuvables');
  const coulEtoile = etoile.material.color.clone(), coulDisque = disquesSpots.length ? disquesSpots[0].material.color.clone() : new THREE.Color(1, 1, 1);
  const braiseBase = braises.map((m) => m.material.emissiveIntensity);
  const coulVoies = VOIES_ARC.map((c) => new THREE.Color(c)), colTmp = new THREE.Color();
  const NB = ampoules.count;

  /* la dalle : éteinte → logo électrique → vortex → tunnel */
  const aspect = ecran.geometry.parameters.width / ecran.geometry.parameters.height;
  const dalle = creerEcranVortex(THREE, texLogo, aspect);
  ecran.material = dalle.mat;
  const halo = creerHaloTele(THREE, A.ecran); groupe.add(halo.mesh);

  /* ═════════════ L'ASPIRATION ═════════════ */
  const anneaux = creerAnneauxAspirants(THREE, A.ecran, 9); groupe.add(anneaux.groupe);
  const explosion = creerExplosionNeon(THREE, A.ecran, { n: 340, t0: 4.95, etalement: 0.6, aspiration: 5.65, demiH }); groupe.add(explosion.mesh);
  const tunnel = creerTunnelNeon(THREE, A.ecran, { rayon: 78, longueur: 3200, n: 280, demiH }); groupe.add(tunnel.groupe);

  /* ═════════════ LUMIÈRES PROPRES AU SEGMENT (nombre constant) ═════════════ */
  const chaud = new THREE.HemisphereLight(0xffd6a6, 0x4a2414, 0.0); groupe.add(chaud);
  const plafonnier = new THREE.PointLight(0xffbc80, 0.0, 900, 2); plafonnier.position.set(0, 225, 40); groupe.add(plafonnier);
  const haloFeu = new THREE.PointLight(0xff9a52, 0.0, 700, 2); haloFeu.position.set(150, 90, -60); groupe.add(haloFeu);   // reflet de la cheminée
  const froid = new THREE.PointLight(0x9cbcff, 0.0, 520, 2); froid.position.set(E.x, E.y - 10, E.z + 130); groupe.add(froid);   // la dalle irradie
  const balayage = new THREE.SpotLight(0xcfe2ff, 0.0, 900, 0.32, 0.55, 2); balayage.position.set(E.x, E.y, E.z + 8);
  const cibleBalayage = new THREE.Object3D(); groupe.add(balayage, cibleBalayage); balayage.target = cibleBalayage;
  const neonLum = NEON_LUMIERES.map(([c, x, y]) => { const l = new THREE.PointLight(c, 0.0, 420, 2); l.position.set(E.x + x, E.y + y, E.z + 70); groupe.add(l); return l; });
  const coulHaloElec = new THREE.Color(0.3, 0.55, 1.35), coulHaloVortex = new THREE.Color(0.85, 0.45, 1.1), coulTmp = new THREE.Color();

  /* ═════════════ TRAJECTOIRE DE CAMÉRA ═════════════ */
  const Y = E.y, Z = E.z;
  const CAM = [
    { t: 0.0, p: [-118, 118, 216], c: [52, 88, -150], fov: 50 },              // derrière le canapé : sapin, cheminée, télé éteinte
    { t: 2.3, p: [-82, 120, 178], c: [40, 94, -160], fov: 49 },
    { t: 4.6, p: [-26, 115, 96], c: [8, Y - 4, Z], fov: 45 },               // la télé s'allume
    { t: 5.0, p: [0, Y, 24], c: [0, Y, Z], fov: 38 },                      // tension : le cadre se resserre
    { t: 5.5, p: [0, Y, -82], c: [0, Y, Z - 220], fov: 62 },               // aspirée : le champ s'ouvre
    { t: 5.95, p: [0, Y, Z + 0.5], c: [0, Y, Z - 320], fov: 88 },           // la caméra traverse la dalle
    { t: 6.5, p: [0, Y, Z - 640], c: [0, Y, Z - 1000], fov: 48 },          // dans le tunnel néon
    { t: 7.0, p: [0, Y, Z - 1380], c: [0, Y, Z - 1800], fov: 46 },         // clé fantôme : vitesse non nulle à 6,5 s (raccord)
  ];
  const camera = (t) => ({ p: hermite(CAM, t, 'p'), c: hermite(CAM, t, 'c'), fov: hermite(CAM, t, 'fov') });
  /** Roulis hélicoïdal : nul avant 5,0 s, puis la caméra vrille de plus en plus vite (≈ 1,3 tour à 6,5 s). */
  const roulis = (t) => { const s = clamp((t - T_ASPI[0]) / (T_ASPI[1] - T_ASPI[0]), 0, 1); return 8.2 * s * s * (1 - 0.25 * s); };

  return {
    id: 'ouverture', groupe,
    cles: [{ t: 3.0, label: 'Le salon de Noël' }, { t: 4.75, label: 'La télé s\'allume' }, { t: 5.9, label: 'La télé aspire la caméra' }],
    collisions() { return []; },
    maj(t) {
      const cam = camera(t);
      const dedans = cam.p[2] < Z - 0.2;                                     // la caméra a franchi la dalle : on est dans le tunnel
      const salonVu = dedans ? 0 : 1;

      /* ── enveloppes ── */
      const allume = smoother((t - T_TV) / 0.12);                           // allumage cathodique (ligne puis ouverture)
      const dim = 1 - 0.92 * smoother((t - T_TV) / 0.15);                   // facteur de lumière du salon : 1 → 0,08 en 0,15 s
      const choc = t < T_TV ? 0 : smoother((t - T_TV) / 0.05) * Math.exp(-Math.max(0, t - T_TV - 0.05) * 3.5);
      const vortex = smoother((t - T_ASPI[0]) / 0.9);
      const aspi = smoother((t - T_ASPI[0]) / 0.25);
      const vac = 0.8 + 0.1 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.1 + 1.3) + 0.05 * Math.sin(t * 37.7 + 0.4);

      /* ── salon : animation d'origine (flammes de la cheminée), puis recalibrage des intensités ── */
      salon.groupe.visible = !dedans;
      salon.maj(t, { intensiteSalon: 1, tvAllumee: 1 });
      const fS = 0.24 * dim * salonVu;
      hemiSalon.intensity = 0.28 * fS;
      spots.forEach((s) => { s.l.visible = true; s.l.intensity = s.base * fS; });
      feuCheminee.intensity = 3.2 * vac * fS;
      lueurTV.intensity = 0;
      lune.intensity = 0.55 * 0.24 * salonVu;
      lueurSapin.intensity = 0.9 * fS;
      braises.forEach((m, i) => { m.material.emissiveIntensity = braiseBase[i] * dim; });
      for (const d of disquesSpots) d.material.color.copy(coulDisque).multiplyScalar(dim);
      for (const e of matsEnv) e.m.envMapIntensity = e.base * dim * dim;          // les reflets chauds s'éteignent avec le salon
      etoile.material.color.copy(coulEtoile).multiplyScalar(1.3 * dim);
      const ic = ampoules.instanceColor.array;
      for (let i = 0; i < NB; i++) {                                         // guirlandes : 5 couleurs des voies, scintillement doux
        const sc = 0.72 + 0.28 * Math.sin(t * (1.3 + (i % 5) * 0.37) + i * 2.399);
        colTmp.copy(coulVoies[i % 5]).multiplyScalar(2.4 * sc * dim);
        ic[i * 3] = colTmp.r; ic[i * 3 + 1] = colTmp.g; ic[i * 3 + 2] = colTmp.b;
      }
      ampoules.instanceColor.needsUpdate = true;
      chaud.intensity = 0.26 * dim * salonVu;
      plafonnier.intensity = 0.42 * dim * salonVu;
      haloFeu.intensity = (0.5 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 17.3 + 1.1)) * dim * salonVu;

      /* ── la dalle et son rayonnement froid ── */
      dalle.maj({ t, allume, choc, vortex, gain: 1.0 });
      froid.intensity = salonVu * allume * (0.07 + 0.2 * choc + 0.06 * vortex);   // les murs blancs renvoient presque tout : dose faible
      const sb = smoother((t - T_TV) / 0.9);                                 // le projecteur froid balaie la pièce de gauche à droite
      cibleBalayage.position.set(lerp(-230, 230, sb), 30 + 40 * Math.sin(sb * Math.PI), 120 - 40 * Math.sin(sb * Math.PI));
      balayage.intensity = salonVu * allume * 1.1 * (1 - 0.6 * smoother((t - 5.6) / 0.4));
      coulTmp.copy(coulHaloElec).lerp(coulHaloVortex, vortex);
      halo.maj({ force: salonVu * allume * (0.05 + 0.16 * choc + 0.07 * vortex), couleur: coulTmp, rayons: 0.6 + 1.2 * choc + 0.6 * vortex, t: t * (1 + 4 * vortex) });

      /* ── l'aspiration : anneaux, explosion néon (lumières colorées qui l'accompagnent), tunnel ── */
      anneaux.maj(t, salonVu * aspi * (1 - smoother((t - 5.85) / 0.12)));
      explosion.maj(t, salonVu * smoother((t - 4.93) / 0.08));
      neonLum.forEach((l, i) => { l.intensity = salonVu * aspi * (0.3 + 0.12 * Math.sin(t * 7.0 + i * 1.9)); });
      tunnel.maj(t, smoother((t - 5.4) / 0.4));

      /* ── post-traitement ── */
      const fondu = 1 - smoother(t / 0.45);
      const vrille = smoother((t - 5.2) / 0.5);
      const post = {
        exposition: dedans ? 0.82 : lerp(0.83, 0.9, 1 - dim),
        vignette: dedans ? 0.35 : lerp(0.62, 0.66, 1 - dim),
        saturation: dedans ? 1.2 : lerp(1.1, 1.12, 1 - dim),
        bloomForce: 0.28 + 0.06 * choc + 0.12 * vortex,
        flash: 0.025 * choc, flashCouleur: [0.55, 0.75, 1.0],
        fondu, flou: 0.45 * vrille * (dedans ? 0.6 : 1), centreFlou: [0.5, 0.5],
        aberration: 0.0005 + 0.0025 * vrille,
      };

      return {
        camera: { p: cam.p, c: cam.c, fov: cam.fov, roll: roulis(t), near: dedans ? 1 : 3, far: 4600 },
        fond: dedans ? 0x2a0c3a : 0x05040a,
        brouillard: null,
        lumieres: { hemi: 0, cle: 0 },
        post,
      };
    },
  };
}

/* Lumières néon de l'explosion (couleur, décalage x, y par rapport au centre de la dalle). */
const NEON_LUMIERES = [[0x2de2ff, -90, 20], [0xff3fa4, 90, -10], [0xffc83d, 0, 70], [0x8a4dff, 0, -60]];
