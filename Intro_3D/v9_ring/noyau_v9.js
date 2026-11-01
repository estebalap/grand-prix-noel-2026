/* NOYAU V9 « RING » — copie du noyau V8 (archive intacte) avec trois ajouts :
     1. un segment peut occuper PLUSIEURS PLAGES du film (def.plages = [[a, b], …]) : l'arène est construite une seule fois et
        sert de 15,5 à 76 s puis de 91 à 112 s (les familles s'intercalent) ;
     2. les modules de segment sont résolus par rapport à ce fichier (def.module = '../v9_ring/seg_x.js' ou 'seg_x.js') ;
     3. contrôle de COLLISIONS : un segment peut exposer collisions() → [{ t, a, b, profondeur }] pour l'image courante ;
        window.statsCollisions() les remonte au rendu de contrôle (une voiture qui traverse un décor fait échouer la planche).
     4. CARTE DU TEMPS (V9.1) : def.remap = [[filmA, filmB, interneA, interneB], …] (temps FILM absolus → temps INTERNE du
        segment, linéaire par morceau, coupes franches permises entre morceaux). Elle remplace plages/origine : on resserre ou on
        accélère un segment déjà validé (ouverture plus nerveuse, familles en 3 × 3 s) sans réécrire son code.
   Texte d'origine :
   NOYAU V8 « FINALE » — orchestrateur du film. L'image est une FONCTION PURE DU TEMPS : rendreTemps(t, { sub }).

   Le film est découpé en SEGMENTS indépendants (data/plan_v8.json), chacun dans son propre module :
     seg_salon.js    0 → 14 s   salon de Noël + bascule vers l'arène
     seg_ecuries.js 14 → 44 s   les 15 écuries, 2,0 s chacune, écran de sélection « jeu de combat »
     seg_folie.js   44 → 92 s   paris smartphone, course, boss, pièges, règle des 41 mm, climax, carte finale

   CONTRAT D'UN SEGMENT (export async function creerSegment(ctx)) — voir LISEZ_MOI_V8.md :
     → { id, groupe: THREE.Object3D, cles: [{ t, label }], maj(t) → etat }
     etat = { camera: { p: [x,y,z], c: [x,y,z], fov, roll? }, fond?: hex, brouillard?: { couleur, densite } | null,
              lumieres?: { hemi, cle }, post?: { exposition, vignette, saturation, bloomForce, flash, flashCouleur: [r,g,b],
              fondu, flou, centreFlou: [x,y], aberration }, hud?: (g, W, H, outils) => void }
   Le noyau masque tous les groupes à chaque image, n'affiche que le segment actif, remet lumières, fond, brouillard et post
   à leurs valeurs par défaut : un segment ne peut pas « fuir » dans un autre (règle 5 du dépôt : déterminisme).

   PROTOCOLE « ZÉRO SURCHARGE » mesuré par le noyau à chaque image (window.statsHUD()) : surface couverte par l'habillage 2D,
   empiètement sur la zone sacrée (centre de l'écran), nombre de textes distincts. Le rendu de contrôle refuse un plan hors règles. */
import { urlWeb, importerShared, bolides3d, chargerDecors3d, chargerOuverture } from '../src/shared_bridge.js';
import { creerGarage, poser, animer, avecAlea, avecAleaAsync } from '../v7_multivers_4k/voitures.js';
import { creerPostCGI } from '../v7_multivers_4k/post_cgi_4k.js';
import { clamp, lerp, smoother } from '../v7_multivers_4k/physique_cgi.js';

const POLICES = [['Fredoka', 'fonts/fredoka-latin-700-normal.woff2', '700'], ['Fredoka', 'fonts/fredoka-latin-600-normal.woff2', '600'],
  ['Nunito', 'fonts/nunito-latin-800-normal.woff2', '800'], ['Nunito', 'fonts/nunito-latin-900-normal.woff2', '900']];
const POST_DEFAUT = { exposition: 0.86, vignette: 0.55, saturation: 1.0, bloomForce: 0.28, flash: 0, flashCouleur: [1, 0.92, 0.8], fondu: 0, flou: 0,
  centreFlou: [0.5, 0.5], aberration: 0.0006 };
const hash01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Outils de dessin 2D communs à tous les habillages (unités « 1920 px » : s = W / 1920). */
function creerOutilsHUD() {
  const police = (px, famille = 'Fredoka', poids = 700) => `${poids} ${px}px "${famille}", "Nunito", system-ui, sans-serif`;
  const rectArrondi = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function texte(g, s, str, x, y, { taille = 40, couleur = '#ffffff', famille = 'Fredoka', poids = 700, align = 'left', ombre = true, contour = 0, alpha = 1, espace = 0 } = {}) {
    g.save(); g.globalAlpha *= alpha; g.font = police(taille * s, famille, poids); g.textAlign = align; g.textBaseline = 'alphabetic';
    if (espace && 'letterSpacing' in g) g.letterSpacing = espace * s + 'px';
    if (ombre) { g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 12 * s; g.shadowOffsetY = 3 * s; }
    if (contour) { g.lineWidth = contour * s; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineJoin = 'round'; g.strokeText(str, x * s, y * s); }
    g.fillStyle = couleur; g.fillText(str, x * s, y * s); g.restore();
  }
  return { police, rectArrondi, texte, clamp, lerp, smoother };
}

export async function creerFilm({ renderer, equipes, logos, regles = {}, plan, sortie = null, qualite = 'apercu', parcMax = 24, progression = () => {}, capture = false, seulement = null }) {
  const THREE = window.THREE;
  const L = renderer.domElement.width, H = renderer.domElement.height;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(40, L / H, 0.2, 5000);
  const envMap = bolides3d.envNeon(THREE, renderer); scene.environment = envMap;
  progression('Briques partagées…');
  const [decors, ouverture, arsenal, stage3d] = await Promise.all([chargerDecors3d(), chargerOuverture(), importerShared('arsenal3d.js'), importerShared('stage3d.js')]);
  const cars = await (await fetch(urlWeb('data/cars.json'))).json(), circuit = await (await fetch(urlWeb('data/circuit.json'))).json();
  const garage = creerGarage(THREE, envMap);
  for (const [fam, chemin, poids] of POLICES) {
    try { const f = new FontFace(fam, `url(${urlWeb(chemin)})`, { weight: poids }); await f.load(); document.fonts.add(f); }
    catch (e) { console.info('Police indisponible : ' + chemin); }
  }

  /* lumières communes, réglées par le segment actif à chaque image (valeurs par défaut sinon) */
  const hemi = new THREE.HemisphereLight(0x9fb4ff, 0x20182e, 0.35), cle = new THREE.DirectionalLight(0xfff0dc, 0.6);
  cle.position.set(30, 70, 60); scene.add(hemi, cle, cle.target);
  const brouillard = new THREE.FogExp2(0x000000, 0);

  /* segments */
  const ctxBase = { THREE, renderer, scene, camera, envMap, garage, poser, animer, avecAlea, avecAleaAsync, decors, ouverture, arsenal, stage3d,
    cars, circuit, equipes, logos, regles, plan, L, H, qualite, parcMax, progression, urlWeb, importerShared, bolides3d,
    outils: { clamp, lerp, smoother, hash01 } };
  const segments = [];
  for (const def of plan.segments) {
    if (seulement && !seulement.includes(def.id)) continue;
    progression(`Segment « ${def.id} »…`);
    const mod = await import(new URL(def.module, import.meta.url).href);
    const seg = await mod.creerSegment({ ...ctxBase, seg: def });
    if (!seg || !seg.groupe || typeof seg.maj !== 'function') throw new Error(`segment ${def.id} : contrat non respecté (groupe + maj attendus)`);
    // horloge interne : un segment peut être écrit dans son propre temps (def.origine) puis déplacé dans le film sans rien réécrire
    seg.def = def; seg.decalage = def.debut - (def.origine ?? def.debut);
    seg.groupe.visible = false; scene.add(seg.groupe); segments.push(seg);
  }

  /* post-traitement et toile HUD (logicielle en capture : pixels identiques d'une image à l'autre) */
  const post = creerPostCGI(THREE, renderer, L, H, { msaa: qualite !== 'brouillon' });
  const sortieCtx = sortie ? sortie.getContext('2d') : null;
  const hudToile = document.createElement('canvas'); hudToile.width = L; hudToile.height = H;
  const hudCtx = hudToile.getContext('2d', { willReadFrequently: capture });
  const outilsHUD = creerOutilsHUD();
  let dernierTextes = new Set();

  const morceau = (s, t) => (s.def.remap || []).find(([a, b]) => t >= a && t < b) || null;
  const dans = (s, t) => (s.def.remap ? !!morceau(s, t) : (s.def.plages || [[s.def.debut, s.def.fin]]).some(([a, b]) => t >= a && t < b));
  /** temps film → temps interne du segment (carte du temps si présente, sinon simple décalage) */
  const interne = (s, t) => { const m = morceau(s, t); return m ? m[2] + (t - m[0]) * (m[3] - m[2]) / (m[1] - m[0]) : t - s.decalage; };
  /** temps interne → temps film (premier morceau qui contient l'instant), pour placer les clés de la planche */
  const versFilm = (s, ti) => { if (!s.def.remap) return ti + s.decalage; const m = s.def.remap.find(([a, b, c, d]) => ti >= Math.min(c, d) && ti <= Math.max(c, d)); return m ? m[0] + (ti - m[2]) * (m[1] - m[0]) / (m[3] - m[2]) : null; };
  const segmentA = (t) => segments.find((s) => dans(s, t)) || null;
  let dernierSeg = null;
  function placer(t) {
    for (const s of segments) s.groupe.visible = false;
    dernierSeg = null;
    hemi.intensity = 0.35; cle.intensity = 0.6; scene.background.set(0x000000); scene.fog = null; brouillard.density = 0;
    const seg = segmentA(t);
    if (!seg) { camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true); return { seg: null, etat: { post: { fondu: 1 } } }; }
    seg.groupe.visible = true; dernierSeg = seg;
    const etat = seg.maj(interne(seg, t)) || {};
    if (etat.fond !== undefined) scene.background.set(etat.fond);
    if (etat.brouillard) { brouillard.color.set(etat.brouillard.couleur); brouillard.density = etat.brouillard.densite; scene.fog = brouillard; }
    if (etat.lumieres) { if (etat.lumieres.hemi !== undefined) hemi.intensity = etat.lumieres.hemi; if (etat.lumieres.cle !== undefined) cle.intensity = etat.lumieres.cle; }
    const c = etat.camera || { p: [0, 10, 40], c: [0, 0, 0], fov: 40 };
    camera.position.set(...c.p); camera.up.set(0, 1, 0); camera.lookAt(new THREE.Vector3(...c.c)); if (c.roll) camera.rotateZ(c.roll);
    camera.fov = c.fov || 40; camera.near = c.near || 0.2; camera.far = c.far || 5000; camera.aspect = L / H; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    if (etat.apres) etat.apres(camera);                                   // mises à jour qui dépendent de la caméra placée (particules orientées…)
    return { seg, etat };
  }
  function reglerPost(r) {
    const u = post.u, p = { ...POST_DEFAUT, ...(r.etat.post || {}) };
    u.temps.value = 0; u.exposition.value = p.exposition; u.vignette.value = p.vignette; u.saturation.value = p.saturation; u.bloomForce.value = p.bloomForce;
    u.flash.value = p.flash; u.flashCouleur.value.setRGB(...p.flashCouleur); u.fondu.value = p.fondu; u.flou.value = p.flou; u.centreFlou.value.set(...p.centreFlou);
    u.aberration.value = p.aberration; u.dechirure.value = 0; u.ondeForce.value = 0; u.onde.value.set(0.5, 0.5, 0); u.gelForce.value = 0; u.grain.value = 0.015;
  }
  function dessinerHUD(r) {
    if (hudCtx.reset) hudCtx.reset(); else { hudCtx.setTransform(1, 0, 0, 1, 0, 0); hudCtx.clearRect(0, 0, L, H); }
    const textes = new Set(), fill = hudCtx.fillText, stroke = hudCtx.strokeText;
    hudCtx.fillText = function (str, ...a) { textes.add(String(str)); return fill.call(this, str, ...a); };
    hudCtx.strokeText = function (str, ...a) { textes.add(String(str)); return stroke.call(this, str, ...a); };
    try { if (r.etat.hud) r.etat.hud(hudCtx, L, H, outilsHUD); } finally { delete hudCtx.fillText; delete hudCtx.strokeText; }
    dernierTextes = textes;
  }

  async function rendreTemps(t, { sub = 1 } = {}) {
    t = clamp(t, 0, plan.duree - 1e-6);
    const M = Math.max(1, sub | 0);
    post.debut();
    let rc = null;
    for (let j = 0; j < M; j++) {
      const tj = M === 1 ? t : t + ((j + 0.5) / M - 0.5) * (0.5 / plan.fps);      // obturateur 180°
      const r = placer(Math.max(0, tj)); if (j === Math.floor(M / 2)) rc = r;
      post.accumuler(scene, camera, 1 / M);
    }
    reglerPost(rc); post.composer();
    dessinerHUD(rc);
    if (sortieCtx) {
      if (sortie.width !== L || sortie.height !== H) { sortie.width = L; sortie.height = H; }
      sortieCtx.drawImage(renderer.domElement, 0, 0, L, H); sortieCtx.drawImage(hudToile, 0, 0);
    }
    return { segment: rc.seg ? rc.seg.def.id : null, t };
  }

  /** Mesure objective de l'habillage 2D de la DERNIÈRE image rendue (protocole « zéro surcharge »). */
  function statsHUD() {
    const pas = 4, d = hudCtx.getImageData(0, 0, L, H).data, R = plan.regles_ui.zone_sacree;
    let n = 0, couverts = 0, nz = 0, zone = 0;
    for (let y = 0; y < H; y += pas) for (let x = 0; x < L; x += pas) {
      const a = d[(y * L + x) * 4 + 3], dans = x >= R[0] * L && x < R[2] * L && y >= R[1] * H && y < R[3] * H;
      n++; if (a > 24) couverts++;
      if (dans) { nz++; if (a > 24) zone++; }
    }
    return { surface: +(couverts / n).toFixed(4), zone_sacree: +(zone / Math.max(1, nz)).toFixed(4), textes: [...dernierTextes], nb_textes: dernierTextes.size };
  }

  /** Collisions de la DERNIÈRE image (placer) : liste vide si le segment ne sait pas les mesurer. */
  function statsCollisions() { return dernierSeg && typeof dernierSeg.collisions === 'function' ? dernierSeg.collisions() : []; }

  const cles = segments.flatMap((s) => (s.cles || []).map((k) => ({ t: versFilm(s, +k.t), label: k.label, groupe: s.def.id })).filter((k) => k.t !== null).map((k) => ({ ...k, t: +k.t.toFixed(3) })));
  return { scene, camera, renderer, rendreTemps, statsHUD, statsCollisions, duree: plan.duree, fps: plan.fps, segments, reperesPlanche: cles, post, placer,
    inventaire: { segments: segments.map((s) => s.def.id), cles: cles.length, duree: plan.duree, fps: plan.fps } };
}
