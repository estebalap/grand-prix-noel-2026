/* SEGMENT « SALON » de la V8 Finale — 0 → 14 s.

   0 → 8 s   L'ÉCRIN FAMILIAL : le salon de Noël 3D (../src/decors/salon.js) — canapé de cuir blanc, sapin aux 5 couleurs des voies,
             cheminée qui crépite, tapis rouge, télé. Un seul travelling, lent et chaleureux (spline d'Hermite, sans tremblement),
             un seul titre sobre en bas à gauche : « 23 DÉCEMBRE · ÉDITION NOËL ».
   8 → 14 s  LA BASCULE (« Ce soir, le salon se transforme… en ARÈNE ! ») : la table basse glisse vers la télé, le TAPIS ROUGE
             S'OUVRE EN DEUX comme une trappe (repère son tapis_ouverture 8,6 s), une lumière arc-en-ciel jaillit de la fente ; la
             caméra passe en plongée, PLONGE dans le puits lumineux (plongee_arene 11,0 s) et débouche au-dessus du Ring et de la
             Rainbow Road 5 voies (arrivee_ring 13,6 s) : vue d'arène qui enchaîne avec les écuries.

   Un seul gag visuel fort : la trappe-tapis. Aucun HUD hormis le titre (0,9 → 7,4 s).

   Éclairage : le noyau rend SANS physicallyCorrectLights (le salon a été réglé pour). On ne touche pas aux réglages globaux du
   renderer : on recalibre ici les intensités des lumières du salon (facteur appliqué APRÈS salon.maj, à partir des valeurs de base
   mémorisées : fonction pure de t) et on ajoute une ambiance chaude propre au segment.

   Le nombre de lumières reste CONSTANT sur tout le segment (on joue sur les intensités, jamais sur la visibilité des lumières) :
   aucune recompilation de shader d'une image à l'autre, rendu identique quel que soit l'ordre des images. */
import { construireSalon, environnementSalon } from '../src/decors/salon.js';
import { construirePiste } from '../v7_multivers_4k/actes.js';
import { creerRing } from '../v7_multivers_4k/mondes_et_portails.js';
import { trouverPieces, solPerce, creerBattants, creerPuits, creerFaisceau, VOIES_ARC } from './salon_bascule.js';

/* ───────── repères de temps (plan_v8.json : reperes_son) ───────── */
const T_TABLE = [7.7, 8.5];          // la table basse glisse vers la télé
const T_FENTE = 8.25;                // la fente s'entrouvre (lumière qui filtre)
const PROF_PUITS = 350;              // profondeur du puits lumineux (cm)
const ARENE = { y: -1000, k: 3 };    // l'arène sous le salon : origine (0, y, z du tapis), échelle ×3 (Ring de 6 m de diamètre)


/** Spline d'Hermite cubique à tangentes de Catmull-Rom non uniformes (C1 en temps : vitesse continue, aucune saccade). */
function hermite(cles, t, cle) {
  const n = cles.length;
  if (t <= cles[0].t) return cles[0][cle];
  if (t >= cles[n - 1].t) return cles[n - 1][cle];
  let i = 0; while (i < n - 2 && t > cles[i + 1].t) i++;
  const a = cles[i], b = cles[i + 1], h = b.t - a.t, u = (t - a.t) / h;
  const tan = (j) => {                                                     // dérivée par rapport au temps ; nulle aux extrémités
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
  const groupe = new THREE.Group(); groupe.name = 'seg-salon';

  /* ═════════════ LE SALON ═════════════ */
  const salon = ctx.avecAlea('salon-v8', () => construireSalon({ graine: 2312 }));
  groupe.add(salon.groupe);
  const A = salon.ancres;
  const envSalon = environnementSalon(renderer);                           // reflets chauds (cuir, laque, carrelage) au lieu de l'env néon global
  salon.groupe.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && !m.envMap) { m.envMap = envSalon; m.envMapIntensity = 0.55; m.needsUpdate = true; }
    }
  });
  // lumières du salon : intensités de base mémorisées (salon.maj n'en remet que certaines à chaque appel)
  const lumSalon = []; salon.groupe.traverse((o) => { if (o.isLight) lumSalon.push({ l: o, base: o.intensity }); });
  let ampoules = null; salon.groupe.traverse((o) => { if (o.isInstancedMesh) ampoules = o; });

  /* ═════════════ LA TRAPPE : sol percé, battants de tapis, table basse ═════════════ */
  const pieces = trouverPieces(THREE, salon.groupe, A.tapis);
  const tp = A.tapis, trou = { x0: tp.centre.x - tp.largeur / 2, x1: tp.centre.x + tp.largeur / 2, z0: tp.centre.z - tp.profondeur / 2, z1: tp.centre.z + tp.profondeur / 2 };
  pieces.sol.visible = false; pieces.tapis.visible = false;
  const sol2 = solPerce(THREE, pieces.sol, trou); salon.groupe.add(sol2);
  const battants = creerBattants(THREE, pieces.tapis, tp, envSalon); salon.groupe.add(battants.groupe);
  const puits = creerPuits(THREE, trou, PROF_PUITS); groupe.add(puits.groupe);
  const faisceau = creerFaisceau(THREE, trou, 235); groupe.add(faisceau.groupe);

  /* ═════════════ AMBIANCE CHAUDE PROPRE AU SEGMENT ═════════════ */
  const chaud = new THREE.HemisphereLight(0xffd6a6, 0x4a2414, 0.0); groupe.add(chaud);
  const plafonnier = new THREE.PointLight(0xffbc80, 0.0, 900, 2); plafonnier.position.set(0, 225, 40); groupe.add(plafonnier);
  const halo = new THREE.PointLight(0xff9a52, 0.0, 700, 2); halo.position.set(150, 90, -60); groupe.add(halo);   // reflet du feu et du sapin sur le canapé
  const arcs = VOIES_ARC.map((c, i) => { const l = new THREE.PointLight(c, 0.0, 520, 2); l.position.set(lerp(trou.x0 + 35, trou.x1 - 35, i / 4), 18, tp.centre.z); groupe.add(l); return l; });

  /* ═════════════ L'ARÈNE SOUS LE SALON : Ring commun + Rainbow Road 5 voies (V7, importés tels quels) ═════════════ */
  const arene = new THREE.Group(); arene.name = 'arene-sous-salon';
  arene.position.set(0, ARENE.y, tp.centre.z); arene.scale.setScalar(ARENE.k); groupe.add(arene);
  const ring = ctx.avecAlea('salon-ring', () => creerRing(THREE, { envMap: ctx.envMap, equipes: ctx.equipes }));
  arene.add(ring.groupe);
  for (const l of [ring.lumieres.cle, ring.lumieres.contre]) { const cible = new THREE.Object3D(); arene.add(cible); l.target = cible; }   // cibles dans le repère de l'arène
  // contre-jour déplacé sur le flanc gauche : à sa place d'origine, son reflet sur le sol d'obsidienne brûlait le bas du cadre d'arrivée
  ring.lumieres.contre.position.set(-150, 70, -20);
  const lumArene = [ring.lumieres.cle, ring.lumieres.contre, ring.lumieres.lumiere].map((l) => ({ l, base: l.intensity }));
  const trace = ctx.ouverture.traceRainbow(ctx.circuit);
  const piste = ctx.avecAlea('salon-piste', () => construirePiste(THREE, trace));
  arene.add(piste.groupe);
  const aW = (x, y, z) => [x * ARENE.k, ARENE.y + y * ARENE.k, tp.centre.z + z * ARENE.k];   // repère arène → monde

  /* ═════════════ TRAJECTOIRE DE CAMÉRA (une seule courbe continue de 0 à 14 s) ═════════════ */
  const fin = aW(24, 30, 100), finC = aW(0, 4, 0);   // au bord du Ring, devant les pylônes de projecteurs (aucune tête de projecteur dans le cadre)
  const CAM = [
    { t: 0.0, p: [-178, 126, 212], c: [70, 80, -95], fov: 48 },            // derrière le fauteuil gauche : sapin, cheminée, télé
    { t: 4.0, p: [-62, 138, 214], c: [62, 66, -88], fov: 47 },             // travelling latéral doux derrière le canapé
    { t: 7.6, p: [48, 168, 208], c: [8, 32, -34], fov: 49 },               // on s'élève : le tapis rouge entre au centre du cadre
    { t: 9.4, p: [0, 240, 96], c: [0, 0, 4], fov: 46 },                   // la trappe s'ouvre sous nos yeux
    { t: 10.6, p: [0, 248, 34], c: [0, 0, 16], fov: 44 },                  // plongée verticale sur la fente arc-en-ciel
    { t: 11.0, p: [0, 160, 28], c: [0, -300, 12], fov: 50 },               // « … en ARÈNE ! » : on plonge
    { t: 11.5, p: [0, -265, 28], c: [0, -900, 4], fov: 62 },               // dans le puits lumineux
    { t: 12.4, p: aW(0, 150, 0.5), c: aW(0, 0, -12), fov: 58 },            // au-dessus du Ring : les anneaux arc-en-ciel vus du ciel
    { t: 13.6, p: fin, c: finC, fov: 46 },                                 // arrivée dans l'arène
    { t: 14.0, p: [fin[0], fin[1] - 3, fin[2] - 8], c: finC, fov: 46 },    // léger glissement : enchaînement avec les écuries
  ];
  const camera = (t) => ({ p: hermite(CAM, t, 'p'), c: hermite(CAM, t, 'c'), fov: hermite(CAM, t, 'fov') });

  /* ═════════════ COURBES DE LA BASCULE ═════════════ */
  /** Angle d'ouverture des battants (rad) : entrebâillement, puis ressort amorti (léger rebond en butée à ~106°). */
  function angleBattants(t) {
    const fente = 0.035 * smoother((t - T_FENTE) / 0.35);
    if (t < 8.6) return fente;
    const s = t - 8.6, w = 4.4, z = 0.5, wd = w * Math.sqrt(1 - z * z);
    const r = 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z * w / wd) * Math.sin(wd * s));
    return fente + (1.85 - fente) * r;
  }

  const titre = '23 DÉCEMBRE · ÉDITION NOËL';

  return {
    id: 'salon', groupe,
    cles: [{ t: 4.0, label: 'Salon de Noël' }, { t: 10.8, label: 'Bascule · le tapis s\'ouvre' }],
    maj(t) {
      const cam = camera(t);
      const dessous = cam.p[1] < -2;                                       // la caméra a franchi le plancher
      const ang = angleBattants(t), ouv = clamp(ang / (Math.PI / 2), 0, 1);

      /* salon : animation d'origine (feu, sapin, télé), puis recalibrage des intensités pour le rendu non « physique » */
      for (const e of lumSalon) e.l.intensity = e.base;
      salon.maj(t, { intensiteSalon: 1, tvAllumee: 1 });
      const fSalon = dessous ? 0 : 0.24;                                   // en mode non physique, le salon d'origine brûlerait
      for (const e of lumSalon) e.l.intensity *= fSalon;
      if (ampoules && ampoules.instanceColor) { const a = ampoules.instanceColor.array; for (let i = 0; i < a.length; i++) a[i] *= 2.4; ampoules.instanceColor.needsUpdate = true; }   // les guirlandes alimentent le bloom
      salon.groupe.visible = true;
      // ambiance chaude : douce respiration de la flamme sur le halo ; elle s'efface un peu quand l'arc-en-ciel prend le relais
      const chaleur = dessous ? 0 : 1 - 0.35 * smoother((t - 8.8) / 1.4);
      chaud.intensity = 0.22 * chaleur;
      plafonnier.intensity = 0.55 * chaleur;
      halo.intensity = (0.55 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 17.3 + 1.1)) * chaleur;

      /* table basse : glisse vers la télé avant l'ouverture */
      const dz = -135 * smoother((t - T_TABLE[0]) / (T_TABLE[1] - T_TABLE[0]));
      pieces.table.forEach((m, i) => { const b = pieces.tableBase[i]; m.position.set(b.x, b.y, b.z + dz); });

      /* trappe, lumière arc-en-ciel, puits */
      battants.maj(ang);
      const jaillit = smoother((t - T_FENTE) / 0.5) * (0.25 + 0.75 * smoother((t - 8.6) / 0.6));
      const prox = 1 - 0.85 * smoother((t - 10.0) / 0.6);                // le faisceau s'efface quand la caméra s'en approche
      faisceau.maj(dessous ? 0 : 0.38 * jaillit * prox, Math.max(ouv, 0.05), t);
      arcs.forEach((l, i) => { l.intensity = dessous ? 0 : jaillit * (0.9 + 0.15 * Math.sin(t * 4.0 + i * 1.3)); });
      const defil = 0.9 * t + 7.0 * smoother((t - 10.8) / 1.2);
      puits.maj(-defil, 0.6 * smoother((t - 8.45) / 0.7) * (1 - smoother((t - 12.0) / 0.6)));

      /* arène : visible en permanence (aperçue par la fente), éclairée seulement une fois le plancher franchi */
      const lumA = dessous ? 1 : 0;
      for (const e of lumArene) e.l.intensity = e.base * lumA;
      const pouls = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.0);         // ~120 BPM
      ring.maj(t, dessous ? pouls * 0.5 : 0, 0, 0);
      piste.matsVoie.forEach((m, j) => { m.color.copy(m.userData.base).multiplyScalar(0.55 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3 - j * 0.9))); });

      /* post-traitement */
      const fondu = 1 - smoother(t / 0.6);
      const post = dessous
        ? { exposition: 0.9, vignette: 0.55, saturation: 1.05, bloomForce: 0.34, flash: 0, fondu: 0, aberration: 0.0008 }
        : { exposition: 0.88, vignette: 0.5, saturation: 1.08, bloomForce: 0.32, flash: 0, fondu, aberration: 0.0005 };

      /* titre : unique, sobre, en bas à gauche, fondu d'entrée et de sortie */
      const aTitre = smoother((t - 0.9) / 1.0) * (1 - smoother((t - 6.4) / 1.0));
      const hud = aTitre > 0.003 ? (g, W, H, o) => {
        const s = W / 1920;
        g.save(); g.globalAlpha = aTitre * 0.9; g.fillStyle = '#e8c27a'; g.fillRect(96 * s, 958 * s, 64 * s, 2 * s); g.restore();
        o.texte(g, s, titre, 96, 1004, { taille: 32, poids: 600, couleur: '#fff3df', espace: 5, alpha: aTitre });
      } : null;

      return {
        camera: { p: cam.p, c: cam.c, fov: cam.fov, near: 3, far: 4600 },   // near 3 cm : précision de profondeur (pas de moirage cadre/mur)
        fond: dessous ? 0x04050c : 0x05040a,
        brouillard: dessous ? { couleur: '#07060f', densite: 0.0016 / ARENE.k } : null,
        lumieres: dessous ? { hemi: 0.42, cle: 0 } : { hemi: 0, cle: 0 },   // arène : la clé du Ring suffit (la clé commune faisait un point chaud sur le sol d’obsidienne)
        post, hud,
      };
    },
  };
}
