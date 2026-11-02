/* SEGMENT « OUVERTURE » de la V9.3 Ring — film 0 → 11,0 s (temps interne = temps film). CRESCENDO voulu par le client :
   « ça part doucement, la salle est sombre, s'allume festivement, lent, puis tout d'un coup ça part en vrille ».
   Versions précédentes archivées : ouverture_archive_v91.js (feu sur la télé + trappe), ouverture_archive_v92.js (6,5 s).

    0 → 2,0 s   NOIR : le salon dans la nuit (seulement la lueur des braises de la cheminée et le reflet bleuté de la fenêtre),
                caméra très lente derrière le canapé.
    2,0 → 5,5 s ALLUMAGE FESTIF, lent : guirlandes du sapin en cascade de bas en haut (2,0 → 3,6), étoile (3,65), la cheminée
                prend (3,3 → 4,6), spots chauds et ambiance ambrée (3,9 → 5,4), festons d'ampoules du salon en chenillard
                (4,2 → 5,3, ouverture_guirlandes.js). Travelling lent et chaleureux.
                Voix : « Mesdames et messieurs… bienvenue au Grand Prix de Noël ! » (1,0 → 4,6), « Mais ce soir… » (5,6 → 6,7).
    6,8 s       LA TÉLÉ S'ALLUME (allumage cathodique, logo blanc-bleu, halo) et le salon s'assombrit (facteur → 0,08 en 0,15 s) ;
                une lumière froide balaie la pièce. Voix « …le salon… » (6,9 → 7,7). La caméra se pose face à la dalle (7,6 s).
    7,6 → 11,0 s LA VRILLE : le vortex V9.2 (aspiration, FOV, roulis hélicoïdal, explosion de 340 particules néon, cadres aspirés,
                tunnel néon) rejoué sur une HORLOGE DÉFORMÉE τ(t) qui accélère jusqu'au bout (le plus violent juste avant 11,0) :
                τ = 5,0 + 1,5 × G(s), s = (t − 7,6) / 3,4, G(s) = 0,4 s + 0,6 s³ (vitesse ×0,18 au départ, ×0,97 à la fin).
                La caméra traverse la dalle vers 10,5 s ; à 10,95 s l'image est au cœur du tunnel néon (raccord avec l'arène à 11,0).
                Voix « …se transforme… » (8,4 → 9,4), suspense, « EN ARÈNE ! » à 11,0 sur la coupe.

   Contrat : creerSegment(ctx) → { id: 'ouverture', groupe, cles, maj(t), collisions() }. maj(t) est une FONCTION PURE de t (tout ce
   qui est touché est remis à chaque image), nombre de lumières constant (seules les intensités varient), aucun Math.random(),
   flash post ≤ 0,05 (l'éclat vient de la dalle, du halo additif et des lumières locales), aucun HUD. */
import { construireSalon, environnementSalon } from '../src/decors/salon.js';
import { VOIES_ARC } from '../v8_finale/salon_bascule.js';
import { chargerImage, textureLogo, creerHaloTele } from './ouverture_tele.js';
import { creerEcranVortex, creerAnneauxAspirants, creerExplosionNeon, creerTunnelNeon } from './ouverture_vortex.js';
import { creerGuirlandesPiece } from './ouverture_guirlandes.js';

/* ───────── repères de temps (plan_v9.json v9.3 : "ouverture") ───────── */
const T_NOIR = [0.0, 2.0];
const T_CASCADE = [2.0, 3.6];        // guirlandes du sapin, de bas en haut
const T_ETOILE = 3.65;
const T_CHEMINEE = [3.3, 4.6];
const T_AMBIANCE = [3.9, 5.4];
const T_FESTONS = [4.2, 1.1];        // début, durée du chenillard des festons du salon
const T_TV = 6.8;                    // tv_allume = salon_dim
const T_VRILLE = [7.6, 11.0];
/* le vortex est écrit dans l'horloge V9.2 (τ de 5,0 à 6,5) ; τ(t) le rejoue étiré et accéléré sur la vrille */
const T_ASPI = [5.0, 6.5];
const tau = (t) => {
  if (t < T_VRILLE[0]) return T_ASPI[0] + (t - T_VRILLE[0]);              // avant la vrille : horloge réelle décalée (rien n'en dépend encore)
  const s = Math.min(1.02, (t - T_VRILLE[0]) / (T_VRILLE[1] - T_VRILLE[0]));
  return T_ASPI[0] + (T_ASPI[1] - T_ASPI[0]) * (0.4 * s + 0.6 * s * s * s);
};

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
  const spots = [], disquesSpots = [], braises = [], flammesCheminee = [];
  salon.groupe.traverse((o) => {
    if (o.isInstancedMesh) ampoules = o;
    else if (o.isMesh && o.geometry.type === 'OctahedronGeometry') etoile = o;
    else if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.material.isMeshBasicMaterial && Math.abs(o.geometry.parameters.width - (A.ecran.largeur - 3)) < 0.5) ecran = o;
    else if (o.isMesh && o.geometry.type === 'CylinderGeometry' && o.material.isMeshBasicMaterial && o.geometry.parameters.radiusTop === 6) disquesSpots.push(o);
    else if (o.isMesh && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.graine) flammesCheminee.push(o);
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
  if (!ampoules || !etoile || !ecran || !feuCheminee || !lueurTV || !lueurSapin || !lune || !hemiSalon || spots.length !== 3 || !flammesCheminee.length) throw new Error('ouverture : pièces du salon introuvables');
  const coulEtoile = etoile.material.color.clone(), coulDisque = disquesSpots.length ? disquesSpots[0].material.color.clone() : new THREE.Color(1, 1, 1);
  const braiseBase = braises.map((m) => m.material.emissiveIntensity);
  const coulVoies = VOIES_ARC.map((c) => new THREE.Color(c)), colTmp = new THREE.Color();
  /* guirlande du sapin : hauteur normalisée de chaque ampoule (cascade de bas en haut) */
  const NB = ampoules.count, hauteurs = new Float32Array(NB), m4 = new THREE.Matrix4(), v3 = new THREE.Vector3();
  let hMin = Infinity, hMax = -Infinity;
  for (let i = 0; i < NB; i++) { ampoules.getMatrixAt(i, m4); v3.setFromMatrixPosition(m4); hauteurs[i] = v3.y; hMin = Math.min(hMin, v3.y); hMax = Math.max(hMax, v3.y); }
  for (let i = 0; i < NB; i++) hauteurs[i] = (hauteurs[i] - hMin) / Math.max(1e-6, hMax - hMin);

  /* festons d'ampoules supplémentaires (mur de la télé, mur de droite) */
  const festons = creerGuirlandesPiece(THREE); salon.groupe.add(festons.groupe);

  /* la dalle : éteinte → logo électrique → vortex → tunnel */
  const aspect = ecran.geometry.parameters.width / ecran.geometry.parameters.height;
  const dalle = creerEcranVortex(THREE, texLogo, aspect);
  ecran.material = dalle.mat;
  const halo = creerHaloTele(THREE, A.ecran); groupe.add(halo.mesh);

  /* ═════════════ L'ASPIRATION (horloge τ) ═════════════ */
  const anneaux = creerAnneauxAspirants(THREE, A.ecran, 9); groupe.add(anneaux.groupe);
  const explosion = creerExplosionNeon(THREE, A.ecran, { n: 340, t0: 5.0, etalement: 0.6, aspiration: 5.65, demiH }); groupe.add(explosion.mesh);
  const tunnel = creerTunnelNeon(THREE, A.ecran, { rayon: 78, longueur: 3200, n: 280, demiH }); groupe.add(tunnel.groupe);

  /* ═════════════ LUMIÈRES PROPRES AU SEGMENT (nombre constant) ═════════════ */
  const chaud = new THREE.HemisphereLight(0xffd6a6, 0x4a2414, 0.0); groupe.add(chaud);
  const plafonnier = new THREE.PointLight(0xffbc80, 0.0, 900, 2); plafonnier.position.set(0, 225, 40); groupe.add(plafonnier);
  const haloFeu = new THREE.PointLight(0xff9a52, 0.0, 700, 2); haloFeu.position.set(150, 90, -60); groupe.add(haloFeu);   // reflet de la cheminée
  const froid = new THREE.PointLight(0x9cbcff, 0.0, 520, 2); froid.position.set(E.x, E.y - 10, E.z + 130); groupe.add(froid);   // la dalle irradie
  const balayage = new THREE.SpotLight(0xcfe2ff, 0.0, 900, 0.32, 0.55, 2); balayage.position.set(E.x, E.y, E.z + 8);
  const cibleBalayage = new THREE.Object3D(); groupe.add(balayage, cibleBalayage); balayage.target = cibleBalayage;
  const neonLum = NEON_LUMIERES.map(([c, x, y]) => { const l = new THREE.PointLight(c, 0.0, 420, 2); l.position.set(E.x + x, E.y + y, E.z + 95); groupe.add(l); return l; });
  const coulHaloElec = new THREE.Color(0.3, 0.55, 1.35), coulHaloVortex = new THREE.Color(0.85, 0.45, 1.1), coulTmp = new THREE.Color();

  /* ═════════════ TRAJECTOIRES DE CAMÉRA ═════════════ */
  const Y = E.y, Z = E.z;
  /* salon (temps réel) : très lent dans le noir, travelling chaleureux, puis la caméra se pose face à la dalle à 7,6 s */
  const CAM_SALON = [
    { t: 0.0, p: [-124, 117, 218], c: [56, 86, -150], fov: 50 },            // derrière le canapé, dans la nuit
    { t: 2.0, p: [-116, 118, 210], c: [54, 88, -150], fov: 50 },
    { t: 5.5, p: [-70, 120, 168], c: [40, 95, -158], fov: 48 },             // le salon s'est allumé : sapin, cheminée, festons
    { t: 6.8, p: [-30, 116, 104], c: [10, Y - 4, Z], fov: 45 },             // la télé s'allume
    { t: 7.6, p: [0, Y, 24], c: [0, Y, Z], fov: 38 },                       // face à la dalle : tension
  ];
  /* vrille (horloge τ, reprise de la V9.2) */
  const CAM_VRILLE = [
    { t: 5.0, p: [0, Y, 24], c: [0, Y, Z], fov: 38 },
    { t: 5.5, p: [0, Y, -82], c: [0, Y, Z - 220], fov: 62 },                // aspirée : le champ s'ouvre
    { t: 5.95, p: [0, Y, Z + 0.5], c: [0, Y, Z - 320], fov: 88 },           // la caméra traverse la dalle
    { t: 6.5, p: [0, Y, Z - 640], c: [0, Y, Z - 1000], fov: 48 },           // dans le tunnel néon
    { t: 7.0, p: [0, Y, Z - 1380], c: [0, Y, Z - 1800], fov: 46 },          // clé fantôme : vitesse non nulle à la coupe
  ];
  const camera = (t) => {
    const [K, u] = t < T_VRILLE[0] ? [CAM_SALON, t] : [CAM_VRILLE, tau(t)];
    return { p: hermite(K, u, 'p'), c: hermite(K, u, 'c'), fov: hermite(K, u, 'fov') };
  };
  /** Roulis hélicoïdal (horloge τ) : nul avant la vrille, puis la caméra vrille de plus en plus vite. */
  const roulis = (t) => { const s = clamp((tau(t) - T_ASPI[0]) / (T_ASPI[1] - T_ASPI[0]), 0, 1); return 8.2 * s * s * (1 - 0.25 * s); };

  return {
    id: 'ouverture', groupe,
    cles: [{ t: 1.0, label: 'La nuit au salon' }, { t: 5.0, label: 'Le salon s\'allume' }, { t: 9.8, label: 'Ça part en vrille' }],
    collisions() { return []; },
    maj(t) {
      const cam = camera(t), T = tau(t);
      const dedans = cam.p[2] < Z - 0.2;                                     // la caméra a franchi la dalle : on est dans le tunnel
      const salonVu = dedans ? 0 : 1;

      /* ── enveloppes ── */
      const cheminee = smoother((t - T_CHEMINEE[0]) / (T_CHEMINEE[1] - T_CHEMINEE[0]));
      const amb = smoother((t - T_AMBIANCE[0]) / (T_AMBIANCE[1] - T_AMBIANCE[0]));
      const allume = smoother((t - T_TV) / 0.12);                           // allumage cathodique (ligne puis ouverture)
      const dim = 1 - 0.92 * smoother((t - T_TV) / 0.15);                   // facteur de lumière du salon : 1 → 0,08 en 0,15 s
      const choc = t < T_TV ? 0 : smoother((t - T_TV) / 0.05) * Math.exp(-Math.max(0, t - T_TV - 0.05) * 3.5);
      const vortex = smoother((T - T_ASPI[0]) / 0.9);
      const aspi = smoother((T - T_ASPI[0]) / 0.25);
      const vac = 0.8 + 0.1 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.1 + 1.3) + 0.05 * Math.sin(t * 37.7 + 0.4);

      /* ── salon : animation d'origine (flammes), puis recalibrage des intensités ── */
      salon.groupe.visible = !dedans;
      salon.maj(t, { intensiteSalon: 1, tvAllumee: 1 });
      const fS = 0.24 * amb * dim * salonVu;
      hemiSalon.intensity = 0.28 * fS;
      spots.forEach((s) => { s.l.visible = true; s.l.intensity = s.base * fS; });
      feuCheminee.intensity = 3.2 * vac * 0.24 * (0.05 + 0.95 * cheminee) * dim * salonVu;   // braises seules, puis le feu prend
      for (const fl of flammesCheminee) { fl.scale.set(1, Math.max(0.001, cheminee), 1); fl.visible = cheminee * dim > 0.02; }
      braises.forEach((m, i) => { m.material.emissiveIntensity = braiseBase[i] * (0.7 + 0.5 * cheminee) * dim; });
      lueurTV.intensity = 0;
      lune.intensity = 0.55 * (0.5 - 0.26 * amb) * salonVu;                 // le reflet bleuté de la fenêtre porte la nuit
      for (const d of disquesSpots) d.material.color.copy(coulDisque).multiplyScalar((0.03 + 0.97 * amb) * dim);
      for (const e of matsEnv) e.m.envMapIntensity = e.base * (0.05 + 0.95 * amb) * dim * dim;
      /* guirlande du sapin : cascade de bas en haut */
      const ic = ampoules.instanceColor.array, dCasc = T_CASCADE[1] - T_CASCADE[0];
      let allumees = 0;
      for (let i = 0; i < NB; i++) {
        const d = t - (T_CASCADE[0] + hauteurs[i] * dCasc);
        const on = smoother(d / 0.15), pop = d > 0 ? 1 + 1.2 * Math.exp(-d * 6) : 1;
        const sc = 0.72 + 0.28 * Math.sin(t * (1.3 + (i % 5) * 0.37) + i * 2.399);
        colTmp.copy(coulVoies[i % 5]).multiplyScalar((0.012 + on * 2.4 * sc * pop) * dim);
        ic[i * 3] = colTmp.r; ic[i * 3 + 1] = colTmp.g; ic[i * 3 + 2] = colTmp.b;
        allumees += on;
      }
      ampoules.instanceColor.needsUpdate = true;
      const frac = allumees / NB;
      const eEt = smoother((t - T_ETOILE) / 0.12), popEt = t > T_ETOILE ? 1 + 1.5 * Math.exp(-(t - T_ETOILE) * 5) : 1;
      etoile.material.color.copy(coulEtoile).multiplyScalar((0.03 + 1.3 * eEt * popEt) * dim);
      lueurSapin.intensity = 0.9 * 0.5 * frac * dim * salonVu;
      festons.maj(t, T_FESTONS[0], T_FESTONS[1], dim);
      chaud.intensity = 0.26 * amb * dim * salonVu;
      plafonnier.intensity = 0.42 * amb * dim * salonVu;
      haloFeu.intensity = (0.5 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 17.3 + 1.1)) * (0.08 + 0.92 * cheminee) * dim * salonVu;

      /* ── la dalle et son rayonnement froid ── */
      dalle.maj({ t: T, allume, choc, vortex, gain: 1.0 });
      froid.intensity = salonVu * allume * (0.07 + 0.2 * choc + 0.06 * vortex);   // les murs blancs renvoient presque tout : dose faible
      const sb = smoother((t - T_TV) / 1.2);                                 // le projecteur froid balaie la pièce de gauche à droite
      cibleBalayage.position.set(lerp(-230, 230, sb), 30 + 40 * Math.sin(sb * Math.PI), 120 - 40 * Math.sin(sb * Math.PI));
      balayage.intensity = salonVu * allume * 1.1 * (1 - 0.6 * smoother((T - 5.6) / 0.4));
      coulTmp.copy(coulHaloElec).lerp(coulHaloVortex, vortex);
      halo.maj({ force: salonVu * allume * (0.05 + 0.16 * choc + 0.07 * vortex), couleur: coulTmp, rayons: 0.6 + 1.2 * choc + 0.6 * vortex, t: T * (1 + 4 * vortex) });

      /* ── la vrille (horloge τ) : anneaux, explosion néon, lumières colorées, tunnel ── */
      anneaux.maj(T, salonVu * aspi * (1 - smoother((T - 5.85) / 0.12)));
      explosion.maj(T, salonVu * smoother((T - 4.98) / 0.08));
      neonLum.forEach((l, i) => { l.intensity = salonVu * aspi * (0.2 + 0.08 * Math.sin(T * 7.0 + i * 1.9)); });
      tunnel.maj(T, smoother((T - 5.4) / 0.4));

      /* ── post-traitement ── */
      const fondu = 1 - smoother(t / 0.6);
      const vrille = smoother((T - 5.2) / 0.5);
      const nuit = 1 - amb;
      const post = {
        exposition: dedans ? 0.82 : lerp(lerp(0.83, 0.95, nuit), 0.9, 1 - dim),
        vignette: dedans ? 0.35 : lerp(lerp(0.62, 0.7, nuit), 0.66, 1 - dim),
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
const NEON_LUMIERES = [[0x2de2ff, -190, 30], [0xff3fa4, 170, 0], [0xffc83d, 0, 110], [0x8a4dff, 0, -95]];   // une couleur par mur, sans se superposer en blanc
