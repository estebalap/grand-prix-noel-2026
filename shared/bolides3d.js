/* BOLIDES 3D STYLISÉS — chaque miniature en Three.js, construite à partir de son portrait 2D (shared/bolides2d.js).

   Principe : le profil du portrait (silhouette, passages de roues, pavillon) est extrudé en volume ; la livrée du portrait
   (couleurs, bandes, numéros, vitres, phares) est plaquée sur les flancs ; le dessus est laqué dans la couleur de
   carrosserie avec vernis et reflets néon (carte d'environnement « studio néon ») ; le pavillon est rétréci et vitré ;
   roues 3D à jantes dessinées (tournent pour de vrai), feux avant et arrière émissifs, accessoires en volume (ailerons,
   ailerons de chauve-souris, bulles, turbine, gyrophares, taxi, moteur à compresseur…). Familles particulières :
   Formule 1 (monocoque, pontons, ailerons, halo), F1 des années 60, hélicoptère, fauteuil.

   Low/medium poly (≈ 2 à 6 k triangles par bolide), une texture 2048 × 670 : 60 i/s sans souci, réutilisable partout
   (reveal Fret, Showroom 360°, futures cinématiques de départ et diffusions de course).

   const m = await construireBolide3D('J11', { THREE, envMap });
   scene.add(m.groupe);  m.maj(dt, vitesse);  m.dispose();
   Repère : l'avant du bolide regarde +x, le sol est y = 0, le bolide est centré en x = 0 et z = 0. */
import { bolide2dSvg, geometrie3d, REPERE_SVG } from './bolides2d.js';
import { MODELES_SUR_MESURE } from './bolides3d_modeles.js';
import { creerRoue, materiauxRoue, construireFauteuil, construireLocomotive, galber } from './bolides3d_pieces.js';

export const ECHELLE = 0.0262;                  // 1 px du portrait = 0,262 mm à l'échelle 1/64 « ×10 » de la scène
const { G, CX, vb } = REPERE_SVG;
const K = ECHELLE;
const wx = (x) => (x - CX) * K, wy = (y) => (G - y) * K;

/* ------------------------------------------------------------------ environnement « studio néon » */
const memoEnv = new WeakMap();
export function envNeon(THREE, renderer) {
  if (memoEnv.has(renderer)) return memoEnv.get(renderer);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  // studio neutre : dégradé gris froid + grandes softboxes blanches ; touches néon discrètes (le reflet ne doit plus teinter la carrosserie en lilas)
  const fond = g.createLinearGradient(0, 0, 0, 512); fond.addColorStop(0, '#3a3e48'); fond.addColorStop(0.5, '#15171c'); fond.addColorStop(1, '#050507');
  g.fillStyle = fond; g.fillRect(0, 0, 1024, 512);
  const barre = (x, y, w, h, col, flou) => { g.shadowColor = col; g.shadowBlur = flou; g.fillStyle = col; g.fillRect(x, y, w, h); };
  barre(60, 90, 300, 70, '#f4f6fa', 50); barre(600, 80, 340, 80, '#ffffff', 50); barre(380, 30, 240, 50, '#e8ecf4', 60);
  barre(0, 300, 1024, 5, '#ffd9a0', 24); barre(140, 200, 120, 10, '#22d3ee', 18); barre(760, 210, 110, 10, '#ff4fd8', 18);
  g.shadowBlur = 0;
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
  memoEnv.set(renderer, env);
  return env;
}

/* ------------------------------------------------------------------ textures */
const memoPeau = new Map();
async function peau(code, THREE) {
  if (memoPeau.has(code)) return memoPeau.get(code);
  let svg = bolide2dSvg(code, 'peau3d' + code, { texture: true });
  if (!svg) return null;
  const W = 2048, H = Math.round(2048 * vb[3] / vb[2]);
  svg = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" preserveAspectRatio="none" `);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const im = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
  URL.revokeObjectURL(url);
  if (!im) return null;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(im, 0, 0, W, H);
  memoPeau.set(code, c);
  return c;
}
function texturePeau(THREE, canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  // UV des faces extrudées = coordonnées monde (x, y) : on les ramène au cadre du SVG
  t.repeat.set(1 / (K * vb[2]), 1 / (K * vb[3]));
  t.offset.set((CX - vb[0]) / vb[2], 1 - (G - vb[1]) / vb[3]);
  return t;
}
function textureJante(THREE, couleur, style, neon) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.translate(128, 128);
  const rg = g.createRadialGradient(-30, -30, 10, 0, 0, 128); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, couleur); rg.addColorStop(1, '#111');
  g.fillStyle = '#0b0c12'; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill();
  g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 118, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.55)';
  const n = { cinq: 5, six: 6, trois: 3, dix: 10, etoile: 5 }[style] || 0;
  if (style === 'plein') { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 64, 0, Math.PI * 2); g.stroke(); }
  else if (style === 'maille') { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 5; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(Math.cos(a + 0.6) * 110, Math.sin(a + 0.6) * 110); g.stroke(); } }
  else for (let i = 0; i < n; i++) {           // jours entre les rayons
    const a = i / n * Math.PI * 2 + Math.PI / n, w = style === 'etoile' ? 0.5 : (Math.PI / n) * 0.62;
    g.beginPath(); g.moveTo(Math.cos(a - w * 0.5) * 36, Math.sin(a - w * 0.5) * 36); g.lineTo(Math.cos(a - w) * 104, Math.sin(a - w) * 104);
    g.lineTo(Math.cos(a + w) * 104, Math.sin(a + w) * 104); g.lineTo(Math.cos(a + w * 0.5) * 36, Math.sin(a + w * 0.5) * 36); g.closePath(); g.fill();
  }
  g.fillStyle = '#d9dde6'; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
  if (neon) { g.strokeStyle = neon; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 122, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ construction */
function forme(THREE, pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(wx(x), wy(y)) : s.moveTo(wx(x), wy(y))));
  s.closePath();
  return s;
}
function extruder(THREE, pts, largeur, biseau = 0.05) {
  const geo = new THREE.ExtrudeGeometry(forme(THREE, pts), { depth: largeur, bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau * 0.8, bevelSegments: 2, curveSegments: 4, steps: 1 });
  geo.translate(0, 0, -largeur / 2);
  return geo;
}
/** Couleurs par sommet des parois du pavillon : faces presque horizontales = laque (toit), autres = vitrage teinté. */
function colorierPavillon(THREE, geo, laque, vitre) {
  const n = geo.attributes.normal, nb = n.count, col = new Float32Array(nb * 3);
  const L = new THREE.Color(laque), V = new THREE.Color(vitre);
  for (let i = 0; i < nb; i++) {
    const ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const c = nz > 0.7 ? L : ny > 0.82 ? L : V;          // flancs (couverts par la peau) et toit plat : laque ; pare-brise et lunette : verre
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
const boite = (THREE, l, h, p, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat); m.position.set(x, y, z); return m; };


/** Phare à lentille : boîtier sombre, réflecteur, lentille émissive (modérée), verre bombé et anneau chromé. Aucun halo ni sprite : rien ne « brûle » à l'écran. */
function phareLentille(THREE, parent, { x, y, z, r, lum, mat, envMap }) {
  const sombre = mat(new THREE.MeshStandardMaterial({ color: 0x0f1015, roughness: 0.5, metalness: 0.7, envMap }));
  const chrome = mat(new THREE.MeshStandardMaterial({ color: 0xe6e9ef, roughness: 0.06, metalness: 1, envMap }));
  const verre = mat(new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.35, clearcoat: 1, envMap }));
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = Math.PI / 2; parent.add(g);
  const bt = new THREE.Mesh(mat(new THREE.CylinderGeometry(r * 1.08, r * 1.0, r * 0.55, 28)), sombre); bt.rotation.x = Math.PI / 2; g.add(bt);
  const lens = new THREE.Mesh(mat(new THREE.CircleGeometry(r * 0.78, 28)), lum); lens.position.z = r * 0.29; g.add(lens);
  const anneau = new THREE.Mesh(mat(new THREE.TorusGeometry(r * 0.96, r * 0.07, 8, 32)), chrome); anneau.position.z = r * 0.28; g.add(anneau);
  const dome = new THREE.Mesh(mat(new THREE.SphereGeometry(r * 0.92, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2)), verre); dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.4, 1); dome.position.z = r * 0.28; g.add(dome);
}

/* ------------------------------------------------------------------ proportions (cahier des charges du 11 oct. 2026)
   H = hauteur de pavillon (lancer de rayons vertical sur le tiers central de l'empattement : ailerons, antennes et gyrophares
   des extrémités exclus) ; W = largeur hors tout, roues comprises (ce qu'on mesure sur la photo du jouet vu de face).
   Plafonds imposés : supercar / coupé sport 0,58 · berline / coupé 0,66. Les familles validées sur photo (compactes 0,75,
   SUV 0,82, vans et camions 1,05) gardent leur plafond photo ; F1, hélico, fauteuil et locomotive sont exemptés. */
export const FAMILLES_PROPORTION = {
  supercar: { plafond: 0.58, codes: ['H10', 'J01', 'TK01', 'E02', 'E03'] },
  compacte: { plafond: 0.75, codes: ['J05', 'FR02', 'FR04', 'E06', 'E08', 'H02', 'H03', 'J09'] },
  SUV: { plafond: 0.82, codes: ['U01', 'FR01', 'FR05'] },
  utilitaire: { plafond: 1.05, codes: ['J04', 'TK05', 'H05', 'H06', 'H07', 'H09', 'H08', 'H11', 'B12', 'U04'] },
  exempte: { plafond: Infinity, codes: ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'E04', 'B07', 'H01', 'H12'] },
};
/** { nom, plafond } de la famille de proportions d'un code (par défaut : berline / coupé, plafond 0,66). */
export function familleProportion(code) {
  for (const [nom, f] of Object.entries(FAMILLES_PROPORTION)) if (f.codes.includes(code)) return { nom, plafond: f.plafond };
  return { nom: 'berline', plafond: 0.66 };
}
/** Hauteur de pavillon (unités scène) mesurée par lancer de rayons sur le tiers central de l'empattement. */
export function hauteurPavillon(THREE, chassis, xAr, xAv, largeur) {
  chassis.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(), cibles = [];
  chassis.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent && o.material.opacity < 0.3)) cibles.push(o); });
  let h = 0;
  const o = new THREE.Vector3(), d = new THREE.Vector3(0, -1, 0);
  for (let i = 0; i <= 8; i++) for (const z of [-0.15, 0, 0.15]) {
    o.set(xAr + (xAv - xAr) * (0.33 + 0.34 * i / 8), 50, z * largeur); rc.set(o, d);
    const hit = rc.intersectObjects(cibles, false)[0]; if (hit) h = Math.max(h, hit.point.y);
  }
  return h;
}
/** Abaisse le pavillon AU-DESSUS de la ligne de caisse (yc) d'un facteur k : y' = yc + (y − yc)·k, normales corrigées
 *  (transformation inverse-transposée). Sous yc (passages de roues, bas de caisse) rien ne bouge : aucun pneu ne peut
 *  traverser la tôle. Les géométries partagées sont clonées avant d'être modifiées. */
function abaisserPavillon(THREE, chassis, yc, k) {
  chassis.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(chassis.matrixWorld).invert(), M = new THREE.Matrix4(), Mi = new THREE.Matrix4(), N = new THREE.Matrix3(), Ni = new THREE.Matrix3();
  const v = new THREE.Vector3(), n = new THREE.Vector3(), vus = new Set();
  chassis.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    if (vus.has(o.geometry)) o.geometry = o.geometry.clone();
    vus.add(o.geometry);
    M.multiplyMatrices(inv, o.matrixWorld); Mi.copy(M).invert(); N.getNormalMatrix(M); Ni.copy(N).invert();
    const pos = o.geometry.attributes.position, nor = o.geometry.attributes.normal;
    let touche = false;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(M);
      if (v.y <= yc) continue;
      touche = true;
      v.y = yc + (v.y - yc) * k; v.applyMatrix4(Mi); pos.setXYZ(i, v.x, v.y, v.z);
      if (nor) { n.fromBufferAttribute(nor, i).applyMatrix3(N); n.y /= k; n.normalize().applyMatrix3(Ni).normalize(); nor.setXYZ(i, n.x, n.y, n.z); }
    }
    if (touche) { pos.needsUpdate = true; if (nor) nor.needsUpdate = true; o.geometry.computeBoundingBox(); o.geometry.computeBoundingSphere(); }
  });
}

/** Erreur de construction 3D : jamais avalée en silence (le reveal refuse alors de tourner en carton). */
export class ErreurBolide3D extends Error {
  constructor(code, raison, cause = null) { super(`Bolide 3D ${code} : ${raison}`); this.name = 'ErreurBolide3D'; this.code = code; this.raison = raison; if (cause) this.cause = cause; }
}
/** Codes qui ont un modèle sculpté sur mesure (m3d/groupe1..10.js). */
export const codesSurMesure = () => Object.keys(MODELES_SUR_MESURE);

/** Construit le bolide 3D.
 *  - Modèle sculpté sur mesure (m3d/) : TOUJOURS prioritaire, et indépendant du portrait 2D (ni fiche ni texture de peau requises).
 *  - Sans modèle sur mesure : l'ancien profil 2D extrudé n'est construit que si { autoriserGenerique: true } (atelier, outils) ;
 *    sinon une ErreurBolide3D est levée — plus jamais de repli « carton » silencieux dans un reveal.
 *  - Une exception dans un constructeur m3d remonte avec le code du bolide (jamais transformée en null).
 *  Le résultat porte `source` : 'sur-mesure' | 'generique-2d'. */
export async function construireBolide3D(code, { THREE = window.THREE, envMap = null, autoriserGenerique = false } = {}) {
  if (!THREE) throw new ErreurBolide3D(code, 'Three.js absent (web/lib/three.min.js non chargé)');
  const mesure = MODELES_SUR_MESURE[code];
  const geo = geometrie3d(code);
  if (!mesure) {
    if (!autoriserGenerique) throw new ErreurBolide3D(code, 'aucun modèle sculpté dans m3d/ (le profil 2D extrudé est banni des reveals)');
    if (!geo) throw new ErreurBolide3D(code, 'ni modèle sculpté ni fiche 2D');
  }
  const canv = mesure ? null : await peau(code, THREE);
  if (!mesure && !canv) throw new ErreurBolide3D(code, 'texture de peau 2D illisible');
  const f = geo ? geo.f : {}, c = geo ? geo.c : {};
  const jetables = [];
  const garde = (x) => { jetables.push(x); return x; };
  const groupe = new THREE.Group(); groupe.name = 'bolide3d-' + code;
  const chassis = new THREE.Group(); groupe.add(chassis);
  const vernis = { clearcoat: 1, clearcoatRoughness: 0.08, envMap, envMapIntensity: 1.1 };
  const matPeau = canv ? garde(new THREE.MeshPhysicalMaterial({ map: garde(texturePeau(THREE, canv)), roughness: 0.34, metalness: 0.28, ...vernis })) : null;
  const matLaque = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.caisse || '#808690'), roughness: 0.22, metalness: 0.45, ...vernis }));
  const matPavillon = garde(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.6, ...vernis }));
  const matNoir = garde(new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.7, metalness: 0.3 }));
  const matAccent = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.accent || c.neon || c.caisse), roughness: 0.3, metalness: 0.5, ...vernis }));
  const matVerre = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.vitre || '#1d2a4a'), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.72, ...vernis }));
  const lumBlanche = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(c.phare || '#eaf6ff').multiplyScalar(1.5), toneMapped: false }));
  const lumRouge = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(c.feu || '#ff2a3d').multiplyScalar(2.2), toneMapped: false }));
  const animes = [];           // (t, dt, v) => void : gyrophares, scanner, rotor…
  const lumieres = [];         // matériaux émissifs [matériau, couleur de base] pilotés par eclairer()

  lumieres.push([lumBlanche, lumBlanche.color.clone()], [lumRouge, lumRouge.color.clone()]);
  const L = geo ? (geo.xAvant - geo.xArriere) * K : 0;
  let loco = null;
  let largeur = L * 0.4;
  let sm = null;
  if (mesure) {
    try { sm = mesure({ THREE, chassis, garde, envMap, animes, lumBlanche, lumRouge }); }
    catch (e) { for (const x of jetables) { try { x.dispose(); } catch (e2) { /* rien */ } } throw new ErreurBolide3D(code, 'le constructeur m3d a planté : ' + (e && e.message ? e.message : e), e); }
    const manque = ['L', 'largeur', 'hauteur', 'xAvant', 'xArriere'].filter((k) => !Number.isFinite(sm && sm[k]));
    if (!sm || manque.length || !Array.isArray(sm.roues)) throw new ErreurBolide3D(code, 'modèle m3d incomplet (' + (manque.join(', ') || 'roues') + ')');
    largeur = sm.largeur;
  } else if (geo.fam === 'route') {
    const h = geo.hauteurs;
    if ((f.toit ?? 70) > 85) largeur = L * 0.44;
    // caisse extrudée dans le profil de la fiche (passages de roues compris), légèrement exagérée en hauteur puis galbée
    const gb = extruder(THREE, geo.bas, largeur, 0.06);
    gb.computeBoundingBox(); const y0 = gb.boundingBox.min.y, p0 = gb.attributes.position;
    for (let i = 0; i < p0.count; i++) p0.setY(i, y0 + (p0.getY(i) - y0) * 1.18);
    const corps = new THREE.Mesh(garde(galber(THREE, gb, { avant: 0.4, arriere: 0.28, fruit: 0.14, bombe: 0.1 })), [matPeau, matLaque]);
    chassis.add(corps);
    const yHaut = gb.boundingBox.max.y;
    if (geo.haut.length) {
      const gh = extruder(THREE, geo.haut, largeur * 0.82, 0.05);
      gh.computeBoundingBox(); const yb0 = gh.boundingBox.min.y, ph = gh.attributes.position;
      for (let i = 0; i < ph.count; i++) ph.setY(i, yb0 + (ph.getY(i) - yb0) * 1.15);
      const gp = garde(galber(THREE, gh, { avant: 0.25, arriere: 0.25, fruit: 0.3, bombe: 0.06, lAv: 0.3, lAr: 0.3 }));
      colorierPavillon(THREE, gp, c.caisse, c.vitre || '#1d2a4a');
      chassis.add(new THREE.Mesh(gp, [matPeau, matPavillon]));
    }
    // feux : posés sur le nez et la queue réels de la caisse
    const yPh = (h.nez + (h.caisse - h.nez) * 0.35) * K * 1.1, yFeu = (h.queue - 3) * K * 1.1 + 0.05;
    const hwNez = largeur / 2 * (1 - 0.4 * 0.55), hwQueue = largeur / 2 * (1 - 0.28 * 0.5);
    for (const z of [-1, 1]) {
      phareLentille(THREE, chassis, { x: wx(geo.xAvant) - 0.03, y: yPh, z: z * hwNez * 0.7, r: Math.min(0.1, hwNez * 0.14), lum: lumBlanche, mat: garde, envMap });
      const fe = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 14, 10)), lumRouge); fe.scale.set(0.05, 0.09, hwQueue * 0.2); fe.position.set(wx(geo.xArriere) + 0.025, yFeu, z * hwQueue * 0.66); chassis.add(fe);
    }
    kits3d(THREE, { geo, chassis, largeur, matLaque, matNoir, matAccent, matVerre, lumBlanche, lumRouge, garde, animes });
  } else if (geo.fam === 'f1' || geo.fam === 'f1vintage') {
    largeur = geo.fam === 'f1' ? 0.95 : 0.85;
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.bas, largeur, 0.08)), [matPeau, matLaque]));
    if (geo.fam === 'f1') {
      // pontons latéraux (bas de la monocoque, plus large)
      const ponton = geo.bas.filter(([, y]) => y >= 72).length > 3 ? [[100, 74], [206, 76], [214, 92], [100, 94]] : null;
      if (ponton) chassis.add(new THREE.Mesh(garde(extruder(THREE, ponton, 1.9, 0.08)), [matPeau, matLaque]));
      const [ax0, ay0, ax1, ay1] = geo.parts.aileronAr, [fx0, fy0, fx1, fy1] = geo.parts.aileronAv;
      const matAil = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.aileron || c.caisse), roughness: 0.3, metalness: 0.5, ...vernis }));
      chassis.add(boite(THREE, (ax1 - ax0) * K, (ay1 - ay0) * K * 0.5, 2.1, matAil, wx((ax0 + ax1) / 2), wy((ay0 + ay1) / 2), 0));
      for (const z of [-1.08, 1.08]) chassis.add(boite(THREE, (ax1 - ax0) * K * 1.05, 1.1, 0.05, matNoir, wx((ax0 + ax1) / 2), wy(ay0) - 0.45, z));
      chassis.add(boite(THREE, (fx1 - fx0) * K, (fy1 - fy0) * K, 3.0, matAil, wx((fx0 + fx1) / 2), wy((fy0 + fy1) / 2), 0));
      for (const z of [-1.5, 1.5]) chassis.add(boite(THREE, (fx1 - fx0) * K * 0.9, 0.35, 0.04, matNoir, wx((fx0 + fx1) / 2), wy(fy1) + 0.15, z));
      const [hx0, hy0, hx1, hy1] = geo.parts.halo;
      const courbe = new THREE.QuadraticBezierCurve3(new THREE.Vector3(wx(hx0), wy(hy0), 0), new THREE.Vector3(wx((hx0 + hx1) / 2), wy(hy0) + 0.35, 0), new THREE.Vector3(wx(hx1), wy(hy1), 0));
      chassis.add(new THREE.Mesh(garde(new THREE.TubeGeometry(courbe, 16, 0.045, 6, false)), matNoir));
      const prise = new THREE.Mesh(garde(extruder(THREE, geo.parts.prise, 0.5, 0.04)), [matPeau, matLaque]); chassis.add(prise);
    } else {
      const [mx0, my0, mx1, my1] = geo.parts.moteur;
      const matMoteur = garde(new THREE.MeshStandardMaterial({ color: 0x9aa1ae, roughness: 0.35, metalness: 0.9, envMap }));
      chassis.add(boite(THREE, (mx1 - mx0) * K, (my1 - my0) * K, 0.7, matMoteur, wx((mx0 + mx1) / 2), wy((my0 + my1) / 2), 0));
      for (let i = 0; i < 4; i++) {
        const tube = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8)), matMoteur);
        tube.position.set(wx(70 + i * 9) - 0.15, wy(60), (i % 2 ? 1 : -1) * 0.18); tube.rotation.z = 0.9; chassis.add(tube);
      }
    }
    const [hx, hy, hr] = geo.parts.casque;
    const casque = new THREE.Mesh(garde(new THREE.SphereGeometry(hr * K, 16, 12)), garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.casque || '#f2f2f2'), roughness: 0.2, ...vernis })));
    casque.position.set(wx(hx), wy(hy), 0); chassis.add(casque);
    largeur = geo.fam === 'f1' ? 3.0 : 2.6;      // voie (pour l'ombre et l'encombrement)
  } else if (geo.fam === 'helico') {
    largeur = 1.6;
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.bas, 1.6, 0.12)), [matPeau, matLaque]));
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.parts.queue, 0.4, 0.04)), [matPeau, matLaque]));
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.parts.derive, 0.08, 0.02)), [matPeau, matNoir]));
    const [p0, p1, py] = geo.parts.patins;
    for (const z of [-0.75, 0.75]) {
      const patin = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.05, 0.05, (p1 - p0) * K, 8)), matAccent);
      patin.rotation.z = Math.PI / 2; patin.position.set(wx((p0 + p1) / 2), wy(py), z); chassis.add(patin);
      for (const x of [140, 228]) { const j = boite(THREE, 0.05, 0.4, 0.05, matAccent, wx(x), wy(py) + 0.2, z * 0.85); chassis.add(j); }
    }
    const [rx, ry, rl] = geo.parts.rotor;
    const mat = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 10)), matNoir); mat.position.set(wx(rx), wy(ry) - 0.18, 0); chassis.add(mat);
    const rotor = new THREE.Group(); rotor.position.set(wx(rx), wy(ry), 0); chassis.add(rotor);
    for (let i = 0; i < 2; i++) { const pale = boite(THREE, rl * 2 * K, 0.03, 0.16, matNoir, 0, 0, 0); pale.rotation.y = i * Math.PI / 2; rotor.add(pale); }
    const rotorAr = new THREE.Group(); rotorAr.position.set(wx(48), wy(40), 0.12); chassis.add(rotorAr);
    rotorAr.add(boite(THREE, 0.7, 0.05, 0.02, matNoir, 0, 0, 0));
    animes.push((t, dt) => { rotor.rotation.y += dt * 38; rotorAr.rotation.z += dt * 55; });
  } else if (geo.fam === 'locomotive') {
    largeur = 1.78;
    loco = construireLocomotive(THREE, { chassis, xr: wx(geo.xArriere), L, envMap, garde, animes, c });
  } else if (geo.fam === 'fauteuil') {
    largeur = 2.2;
    const gr = geo.roues.find((r) => !r.roulette), ro = geo.roues.find((r) => r.roulette);
    const fo = construireFauteuil(THREE, { chassis, xAr: wx(gr.x), xAv: wx(ro.x), Rg: gr.r * K, Rc: ro.r * K, c, code, envMap, garde, animes });
    for (const m of [fo.led, fo.ledCyan, fo.lumBlanche]) lumieres.push([m, m.color.clone()]);
  }

  // roues : pneu en révolution (48 segments), jante à gorge, moyeu, boulons, disque de frein ventilé et étrier fixe
  const roues = [];
  const cacheJante = new Map(), cacheMatJante = new Map();             // jantes 3D : géométries et matériaux partagés entre roues identiques
  const matR = materiauxRoue(THREE, { envMap, jante: f.jante || '#c9cfda', rayons: f.rayons || 'cinq', neon: null, etrier: c.accent || c.neon || '#e8202a', garde });   // plus jamais d'anneau néon d'arcade sur une jante
  if (loco) {                                                         // deux essieux, roues noires à anneau rouge, petit ergot blanc au moyeu
    const noir = garde(new THREE.MeshStandardMaterial({ color: 0x141519, roughness: 0.55, metalness: 0.2, envMap }));
    const matL = materiauxRoue(THREE, { envMap, jante: '#17181c', rayons: 'plein', garde });
    matL.chrome = noir; matL.boulon = noir;
    for (const x of [loco.x1, loco.x2]) for (const z of [-loco.zRoue, loco.zRoue]) {
      const w = creerRoue(THREE, matL, { R: loco.R, ep: loco.ep, cote: z >= 0 ? 1 : -1, flanc: '#ff3b2f', flancR: [0.8, 0.86], garde, sansFrein: true });
      w.pivot.position.set(x, loco.R, z); groupe.add(w.pivot);
      const pin = new THREE.Mesh(garde(new THREE.SphereGeometry(0.035, 10, 8)), garde(new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }))); pin.position.set(0, 0, Math.sign(z) * (loco.ep / 2 + 0.01)); w.tourne.add(pin);
      roues.push({ pivot: w.pivot, tourne: w.tourne, etriers: w.etriers, r: loco.R, ep: loco.ep, fin: true, x, avant: x === loco.x2, z });   // roues de locomotive : acier à boudin, pas de pneu
    }
  }
  if (sm) for (const r of sm.roues) {
    /* options par roue : RW (rayon exact, sinon R×1.22), ep (épaisseur du pneu), z (demi-voie : centre du pneu), jante, rayons, flanc, sansFrein, lenticulaire,
       levre (jantes 3D : largeur de lèvre polie / profondeur de bol, 0 à 0,3 R). rayons ∈ JANTES_3D → vraie jante en relief. */
    const R = r.RW ?? r.R * 1.22, ep = r.fin ? (r.ep ?? R * 0.3) : Math.max(r.ep ?? R * 0.66, 0.45);   // pneus « boudins » : jamais de roue de vélo (sauf fin: true)
    const style = r.rayons || sm.rayons || 'cinq', jante = r.jante || sm.jante || '#c9cfda', peinte = r.chrome === true ? false : !janteMetal(r.jante || sm.jante);
    const matS = materiauxRoue(THREE, { envMap, jante, rayons: style, neon: null, etrier: r.etrier || '#e8202a', garde, peinte });
    const zc = r.z ?? (largeur / 2 - ep * 0.12);
    for (const z of [-zc, zc]) {
      const w = creerRoue(THREE, matS, { R, ep, cote: z >= 0 ? 1 : -1, flanc: r.flanc ?? sm.flanc ?? null, garde, sansFrein: !!r.sansFrein, lenticulaire: !!r.lenticulaire, main: !!r.main });
      // jantes 3D en relief (styles JANTES_3D) : le disque texturé est remplacé ; tout autre style garde le rendu historique
      if (!r.lenticulaire) poserJante3D(THREE, w, matS, { style, R, ep, cote: z >= 0 ? 1 : -1, levre: r.levre ?? sm.levre, jante, peinte, envMap, garde, cacheGeo: cacheJante, cacheMat: cacheMatJante });
      w.pivot.position.set(r.x, r.y ?? R, z); groupe.add(w.pivot);
      roues.push({ pivot: w.pivot, tourne: w.tourne, etriers: w.etriers, r: R, ep, fin: !!r.fin, x: r.x, avant: !!r.avant, z });
    }
  }
  for (const r of ((loco || sm || !geo) ? [] : geo.roues)) {
    const R = r.r * K * (geo.fam === 'route' ? 1.12 : 1), fa = geo.fam === 'fauteuil', grande = fa && !r.roulette, ep = geo.fam === 'f1' || geo.fam === 'f1vintage' ? R * 0.9 : fa ? (r.roulette ? 0.2 : 0.2) : R * 0.62;
    const zs = geo.fam === 'f1' ? [-1.3, 1.3] : geo.fam === 'f1vintage' ? [-1.12, 1.12] : fa ? (r.roulette ? [-0.6, 0.6] : [-1.0, 1.0]) : [-(largeur / 2 - ep * 0.5 + 0.03), largeur / 2 - ep * 0.5 + 0.03];
    for (const z of zs) {
      const w = creerRoue(THREE, matR, { R, ep, cote: z >= 0 ? 1 : -1, main: grande, lenticulaire: grande, flanc: f.flanc || null, garde, sansFrein: fa && !!r.roulette });
      if (!grande) poserJante3D(THREE, w, matR, { style: f.rayons || 'cinq', R, ep, cote: z >= 0 ? 1 : -1, levre: f.levre, jante: f.jante || '#c9cfda', peinte: false, envMap, garde, cacheGeo: cacheJante, cacheMat: cacheMatJante });
      const pivot = w.pivot; pivot.position.set(wx(r.x), R, z);
      if (grande) pivot.rotation.x = z > 0 ? -0.1 : 0.1;                       // carrossage : roues arrière inclinées, silhouette agressive
      groupe.add(pivot);
      roues.push({ pivot, tourne: w.tourne, etriers: w.etriers, r: R, ep, x: wx(r.x), avant: !!r.avant, z });
    }
  }
  if (!sm && (geo.fam === 'f1' || geo.fam === 'f1vintage')) {
    // bras de suspension (triangles supérieur et inférieur) entre la monocoque et chaque moyeu : plus de roue « collée »
    const matBras = garde(new THREE.MeshStandardMaterial({ color: 0x1a1c23, roughness: 0.45, metalness: 0.8, envMap }));
    const tige = (a, b, r = 0.026) => {
      const d = b.clone().sub(a), m = new THREE.Mesh(garde(new THREE.CylinderGeometry(r, r, d.length(), 10)), matBras);
      m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); groupe.add(m);
    };
    for (const w of roues) {
      const sg = Math.sign(w.z), yy = w.r, cx = w.x;
      const hub = new THREE.Vector3(cx, yy, w.z - sg * 0.12);
      for (const dy of [0.16, -0.12]) for (const dx of [-0.34, 0.34]) tige(new THREE.Vector3(cx + dx, yy + dy * w.r / 0.5, sg * 0.3), hub);
    }
  }
  /* proportions imposées (sculptures sur mesure) : si le pavillon dépasse le plafond de sa famille, il est abaissé au-dessus
     de la ligne de caisse — jamais les passages de roues. Le facteur appliqué est publié dans `proportion`. */
  let proportion = null, hauteurSm = sm ? sm.hauteur : 0;
  if (sm && roues.length) {
    // Chantier V5 : un modèle peut déclarer son propre plafond (`plafond` = hauteur / largeur hors tout de la VRAIE voiture,
    // mesurée sur ses cotes constructeur). Il remplace le plafond de famille, qui écrasait les berlines (« plates comme des crêpes »).
    const fp = sm.plafond ? { nom: 'réel', plafond: sm.plafond } : familleProportion(code);
    groupe.updateMatrixWorld(true);
    const wTot = new THREE.Box3().setFromObject(groupe).getSize(new THREE.Vector3()).z;
    const xsR = roues.map((w) => w.x), xAvR = Math.max(...xsR), xArR = Math.min(...xsR);
    const pav = hauteurPavillon(THREE, chassis, xArR, xAvR, largeur);
    const yc = Math.max(...roues.map((w) => w.pivot.position.y + w.r)) + 0.1;            // ligne de caisse : sommet des passages de roues
    const cible = fp.plafond * wTot;
    proportion = { famille: fp.nom, plafond: fp.plafond, largeurHorsTout: +wTot.toFixed(3), pavillon: +pav.toFixed(3), k: 1 };
    if (Number.isFinite(cible) && pav > cible + 0.005 && pav > yc + 0.05) {
      const k = Math.max(0.55, (cible - yc) / (pav - yc));
      abaisserPavillon(THREE, chassis, yc, k);
      if (hauteurSm > yc) hauteurSm = yc + (hauteurSm - yc) * k;
      proportion.k = +k.toFixed(3);
      proportion.pavillon = +hauteurPavillon(THREE, chassis, xArR, xAvR, largeur).toFixed(3);
    }
    proportion.rapport = +(proportion.pavillon / wTot).toFixed(3);
  }
  const xs = roues.map((w) => w.x);
  const xAv = roues.length ? Math.max(...xs) : (sm ? sm.xAvant : wx(geo.xAvant)) - 0.5, xAr = roues.length ? Math.min(...xs) : (sm ? sm.xArriere : wx(geo.xArriere)) + 0.5;
  const hauteur = sm ? hauteurSm : loco ? 2.45 : (G - Math.min(...geo.bas.concat(geo.haut).map((p) => p[1]))) * K;
  // famille : celle de la fiche 2D si elle existe (helico, fauteuil, f1… pilotent la mise en scène), sinon déduite du modèle
  const fam = geo ? geo.fam : (sm.fam || 'route');
  return {
    code, fam, source: sm ? 'sur-mesure' : 'generique-2d', proportion, groupe, chassis, roues, largeur, longueur: sm ? sm.L : L, hauteur, aRoues: roues.length > 0,
    xAvant: sm ? sm.xAvant : wx(geo.xAvant), xArriere: sm ? sm.xArriere : wx(geo.xArriere), essieuAvant: xAv, essieuArriere: xAr, empattement: xAv - xAr,
    rayonAvant: (roues.find((w) => w.avant) || { r: 0.45 }).r, rayonArriere: (roues.find((w) => !w.avant) || { r: 0.45 }).r,
    feux: { avant: lumBlanche, arriere: lumRouge },
    /** Contrat « drame » du modèle sculpté (MODE DRAME, scénario « crash » : neuf(), epave(), teinte(k), pieces), sinon null. */
    drame: sm ? (sm.drame || null) : null,
    /** Veilleuses : k de 0 (éteint, pénombre) à 1 (feux pleine puissance). Les feux ronronnent légèrement. */
    eclairer(k, t = 0) {
      const f = (0.1 + 0.9 * k) * (k < 1 ? 0.85 + 0.15 * Math.sin(t * 31) : 1);
      for (const [mat, base] of lumieres) mat.color.copy(base).multiplyScalar(f);
    },
    /** Braque les roues avant (radians, + = à gauche) et leur étrier. */
    braquer(a) { for (const w of roues) if (w.avant) w.pivot.rotation.y = a; },
    /** Avance d'un pas : roues qui tournent (v = ω × R), accessoires animés. v en unités/s (positif = vers l'avant). */
    maj(dt, v = 0, t = 0, glissement = 0) {
      for (const w of roues) w.tourne.rotation.z -= (v * (1 + glissement)) * dt / w.r;
      for (const a of animes) a(t, dt, v);
    },
    dispose() { for (const x of jetables) { try { x.dispose(); } catch (e) { /* rien */ } } groupe.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}

/** Jante métallique (argent, gris clair/moyen, peu saturé) ou laquée (blanc, crème, couleurs, noir) ? */
function janteMetal(hex) {
  if (!hex) return true;
  const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, sat = mx ? (mx - mn) / mx : 0;
  return sat < 0.14 && l > 0.42 && l < 0.84;
}

/* ------------------------------------------------------------------ jantes 3D en relief (Chantier V5 — atelier jantes)
   Les styles historiques (cinq, six, trois, dix, etoile, plein, maille) restent des disques texturés (bolides3d_pieces.js).
   Les styles ci-dessous sont de VRAIES jantes en volume : branches extrudées et galbées, fenêtres ouvertes sur le disque de
   frein, moyeu en bossage, écrous, lèvre polie et bol. Sélection par l'option `rayons` (par roue `r.rayons` ou par modèle
   `sm.rayons`) ; `levre` (0 à 0,3, en fraction du rayon du pneu) règle la largeur de la lèvre polie ET la profondeur du bol.
     bbs       : rayons croisés en maille (BBS RS / LM), couronne rivetée, lèvre polie, moyeu en bossage
     deepdish  : bol profond — lèvre polie large (défaut 0,20 R), voile reculé à 5 branches fines, rivets d'assemblage
     evo6      : 6 branches pleines, larges et bombées (berline sportive allemande fin des années 80)
     cinqCreux : 5 branches dédoublées et creusées (berline / SUV moderne), voile concave
     turbine   : 12 pales incurvées et vrillées (supercar / années 80)
     fils      : roue à rayons fins (48 rayons laçés sur trois nappes), moyeu saillant et papillon central
     rallye    : disque plein à 8 trous ronds chanfreinés (jante de rallye), 4 écrous
     f1_2022   : enjoliveur aérodynamique plein (Formule 1 actuelle, 18 pouces), écrou central unique
     etoileVIP : 5 branches larges et plates, lèvre étagée rivetée (« VIP » japonais)
   Tout est construit dans le repère de la roue (axe z, face visible côté +z) puis tourné de π autour de y pour le flanc −z.
   Le groupe est ENFANT de `tourne` : la jante tourne avec le pneu ; disque de frein, étrier et voile de fond sont conservés.
   Aucun matériau émissif. Géométries mises en cache par (style, R, ep, lèvre) : partagées par les roues identiques d'un modèle. */
export const JANTES_3D = ['bbs', 'deepdish', 'evo6', 'cinqCreux', 'turbine', 'fils', 'rallye', 'f1_2022', 'etoileVIP'];
const LEVRE_DEFAUT = { bbs: 0.1, deepdish: 0.2, evo6: 0.03, cinqCreux: 0.03, turbine: 0.03, fils: 0.06, rallye: 0.04, f1_2022: 0.02, etoileVIP: 0.12 };

/** Fusionne des géométries (position + normale) en une seule géométrie non indexée : un seul appel de dessin par matériau. */
function fusionGeo(THREE, geos) {
  const parts = geos.filter(Boolean).map((g) => { const x = g.index ? g.toNonIndexed() : g; if (!x.attributes.normal) x.computeVertexNormals(); return x; });
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o); nor.set(p.attributes.normal.array, o); o += p.attributes.position.count * 3; }
  for (const g of geos) if (g) g.dispose();
  for (const p of parts) p.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}

/** Nappe paramétrique indexée (nI × nJ sommets, f(i, j) → [x, y, z]) aux normales lissées. Sens : i radial, j tangentiel → face +z. */
function nappe(THREE, nI, nJ, f) {
  const pos = new Float32Array(nI * nJ * 3), idx = [];
  for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) pos.set(f(i, j), (i * nJ + j) * 3);
  for (let i = 0; i < nI - 1; i++) for (let j = 0; j < nJ - 1; j++) {
    const a = i * nJ + j, b = a + nJ, c = a + 1, d = b + 1;
    idx.push(a, b, c, c, b, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Mur (paroi de fenêtre) le long d'une arête : haut = points de l'arête, bas = mêmes (x, y) à z = bas(i). `garder(i)` : segment utile. */
function murArete(THREE, haut, bas, garder) {
  const pos = [], idx = [];
  for (let i = 0; i < haut.length; i++) { pos.push(...haut[i], haut[i][0], haut[i][1], bas(i)); }
  for (let i = 0; i < haut.length - 1; i++) if (garder(i)) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Profil de révolution (points [r, z]) autour de l'axe z de la roue. */
function tour(THREE, pts, segs = 48) {
  const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z)), segs);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylindre d'axe z (écrous, rivets, moyeux) posé en (x, y), de z0 à z1. */
function plot(THREE, x, y, r, z0, z1, n = 6, rHaut = r) {
  const g = new THREE.CylinderGeometry(rHaut, r, Math.abs(z1 - z0), n, 1, false);
  g.rotateX(Math.PI / 2); g.translate(x, y, (z0 + z1) / 2);
  return g;
}

/** Barre tubulaire fine entre deux points 3D (rayons de roue à fils). */
function tige(THREE, a, b, r) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, 4, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Enveloppe d'une fenêtre (superellipse) : 1 au centre de [r0 ; r1], 0 aux bouts ; p grand = bouts plus carrés. */
function enveloppe(r, r0, r1, p) {
  const t = (2 * r - r0 - r1) / (r1 - r0);
  return Math.abs(t) >= 1 ? 0 : Math.pow(1 - Math.pow(Math.abs(t), p), 1 / p);
}

/**
 * Voile à fenêtres : secteurs pleins entre fenêtres successives. Fenêtre = { c(r) angle central, w(r) demi-angle ≥ 0, r0, r1 }.
 * Z(r, u, oa, ob) : cote du dessus (u ∈ [0 ; 1] en travers de la branche, oa/ob ouverture des fenêtres voisines 0…1).
 * Chaque branche reçoit un chanfrein le long des fenêtres (normales lissées → arête adoucie) et une paroi jusqu'à zb(r) − épaisseur.
 */
function voileAFenetres(THREE, { fen, rA, rB, nU = 5, Z, zb, ep, zMin, chanf, q }) {
  // anneaux : réguliers + resserrés aux bouts de chaque fenêtre (bouts arrondis nets)
  const rs = [];
  for (let i = 0; i <= 6; i++) rs.push(rA + (rB - rA) * i / 6);
  const plages = new Set();
  for (const F of fen) plages.add(F.r0.toFixed(5) + ':' + F.r1.toFixed(5));
  for (const pl of plages) {
    const [r0, r1] = pl.split(':').map(Number), m = (r0 + r1) / 2, d = (r1 - r0) / 2;
    for (const t of [1, 0.985, 0.94, 0.85, 0.68, 0.42, 0.14]) { rs.push(m - d * t, m + d * t); }
  }
  rs.sort((a, b) => a - b);
  const R_ = rs.filter((r, i) => r >= rA - 1e-9 && r <= rB + 1e-9 && (i === 0 || r - rs[i - 1] > q * 0.006));
  const e = 0.08, us = [0, e];
  for (let k = 1; k < nU; k++) us.push(e + (1 - 2 * e) * k / nU);
  us.push(1 - e, 1);
  const n = fen.length, dessus = [], murs = [];
  const ouv = (F, r) => Math.min(1, Math.max(0, F.w(r) * r / (q * 0.02)));
  for (let k = 0; k < n; k++) {
    const A = fen[k], B = fen[(k + 1) % n], tour2 = k + 1 === n ? Math.PI * 2 : 0;
    const pt = (r, u) => {
      const ta = A.c(r) + A.w(r), tb = B.c(r) - B.w(r) + tour2, oa = ouv(A, r), ob = ouv(B, r);
      const th = ta + (tb - ta) * u;
      let z = Z(r, u, oa, ob);
      if (u === 0) z -= chanf * oa; else if (u === 1) z -= chanf * ob;
      return [Math.cos(th) * r, Math.sin(th) * r, z];
    };
    dessus.push(nappe(THREE, R_.length, us.length, (i, j) => pt(R_[i], us[j])));
    const bas = (i) => Math.max(zMin, zb(R_[i]) - ep);
    murs.push(murArete(THREE, R_.map((r) => pt(r, 0)), bas, (i) => ouv(A, R_[i]) > 0 || ouv(A, R_[i + 1]) > 0));
    murs.push(murArete(THREE, R_.map((r) => pt(r, 1)), bas, (i) => ouv(B, R_[i]) > 0 || ouv(B, R_[i + 1]) > 0));
  }
  return { dessus, murs };
}

/** Barre droite (rayon de jante maille) de (r0, a0) à (r1, a1), largeur l, dessus Zr(r) + dz, chanfreinée, avec parois. */
function barreJante(THREE, { r0, a0, r1, a1, l, Zr, dz = 0, ep, zMin, chanf, n = 10 }) {
  const P0 = [Math.cos(a0) * r0, Math.sin(a0) * r0], P1 = [Math.cos(a1) * r1, Math.sin(a1) * r1];
  const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const us = [0, 0.12, 0.5, 0.88, 1];
  const pt = (i, u) => {
    const t = i / n, x = P0[0] + dx * t + nx * l * (u - 0.5), y = P0[1] + dy * t + ny * l * (u - 0.5), r = Math.hypot(x, y);
    return [x, y, Zr(r) + dz - ((u === 0 || u === 1) ? chanf : 0) + (u === 0.5 ? chanf * 0.3 : 0)];
  };
  const dessus = nappe(THREE, n + 1, us.length, (i, j) => pt(i, us[j]));
  const bas = (u) => (i) => { const p = pt(i, u); return Math.max(zMin, Math.min(p[2] - 0.004, Zr(Math.hypot(p[0], p[1])) + dz - ep)); };
  const ids = Array.from({ length: n + 1 }, (_, i) => i);
  return { dessus, murs: [murArete(THREE, ids.map((i) => pt(i, 0)), bas(0), () => true), murArete(THREE, ids.map((i) => pt(i, 1)), bas(1), () => true)] };
}

/**
 * Géométries d'une jante 3D (repère roue, face +z) : { face, flanc, poli, boulon } (BufferGeometry ou null).
 * Cotes reprises de creerRoue (bolides3d_pieces.js) : rayon de fût rj = 0,627 R, lèvre chromée à z = 0,86 h, face historique zF.
 * Rien ne descend sous zF − 0,025 ep (l'étrier fixe et le disque de frein restent libres derrière le voile qui tourne).
 */
export function geometrieJante3D(THREE, style, R, ep, levreOpt) {
  const h = ep / 2, rb = R * 0.66, q = rb * 0.95;
  const enf = Math.min(Math.max(ep * 0.36, 0.08), 0.15, h * 0.8);
  const zL = h * 0.86, zF = h - enf, D = zL - zF, zMin = zF - ep * 0.025;
  const levre = Math.min(0.3, Math.max(0, Number.isFinite(levreOpt) ? levreOpt : LEVRE_DEFAUT[style]));
  const rL = Math.max(q - levre * R, q * 0.55);
  const zLip = style === 'deepdish' ? zL + R * 0.01 : zL - R * 0.004;
  const face = [], flanc = [], poli = [], boulon = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  /** profil radial du voile : zO au bord (rL), zH au moyeu (rH), bombé (+) ou creusé (−) au milieu */
  const profil = (zO, zH, rH, bombe = 0) => (r) => { const t = Math.min(1, Math.max(0, (rL - r) / (rL - rH))); return lerp(zO, zH, t) + bombe * Math.sin(Math.PI * t); };
  /** lèvre : chant extérieur, plat poli de rL à q, puis bol (paroi) jusque sous le voile à zBol */
  const levrePolie = (zBol, matPoli = true) => {
    const cf = Math.min(q * 0.02, (q - rL) * 0.3 + q * 0.004);
    const pts = [[q * 1.0, zL - R * 0.02], [q * 1.0, zLip - cf * 0.5], [q - cf * 0.5, zLip], [rL + cf, zLip], [rL, zLip - cf], [rL - q * 0.004, zBol]];
    (matPoli ? poli : face).push(tour(THREE, pts, 48));
  };
  /** moyeu en bossage : plat à zT, chanfrein, jupe jusque sous les branches ; cache central ; n écrous sur le cercle rN */
  const moyeu = (rH, zT, zJupe, nEcrous = 5, cache = true) => {
    face.push(tour(THREE, [[0, zT], [rH * 0.84, zT], [rH, zT - rH * 0.1], [rH * 1.04, zJupe]], 32));
    if (cache) poli.push(tour(THREE, [[0, zT + rH * 0.2], [rH * 0.16, zT + rH * 0.18], [rH * 0.3, zT + rH * 0.07], [rH * 0.32, zT - 0.002]], 24));
    const rN = rH * 0.6, rn = Math.max(rH * 0.085, 0.006);
    for (let i = 0; i < nEcrous; i++) { const a = i / nEcrous * Math.PI * 2 + Math.PI / 2; boulon.push(plot(THREE, Math.cos(a) * rN, Math.sin(a) * rN, rn, zT - 0.002, zT + rn * 1.3, 6)); }
  };
  /** rivets d'assemblage (jantes en plusieurs pièces) sur le cercle r, à la cote z */
  const rivets = (r, z, n) => { const rr = Math.max(q * 0.018, 0.0035); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; boulon.push(plot(THREE, Math.cos(a) * r, Math.sin(a) * r, rr, z - 0.002, z + rr * 0.9, 6, rr * 0.7)); } };
  /** voile à fenêtres + bol + moyeu, commun aux styles « à branches » */
  const voile = ({ fen, rH, Zb, Z, epV, chanf, nU, zT, nEcrous }) => {
    const v = voileAFenetres(THREE, { fen, rA: rH * 0.92, rB: rL + q * 0.012, nU, Z, zb: Zb, ep: epV, zMin, chanf, q });
    face.push(...v.dessus); flanc.push(...v.murs);
    moyeu(rH, zT, Math.max(zMin, Zb(rH) - epV * 0.6), nEcrous);
  };
  /** croisillon de travers : bord haut/bas d'une branche selon l'ouverture des fenêtres voisines (galbe en travers) */
  const galbe = (bomb) => (u, oa, ob) => -bomb * (oa * (1 - u) * (1 - u) + ob * u * u);

  switch (style) {
    case 'evo6': {                                      // 6 branches pleines, larges et bombées
      const n = 6, rH = q * 0.3, r0 = q * 0.37, r1 = rL - q * 0.075;
      const sw = (r) => q * 0.075 + 0.1 * r;
      const fen = Array.from({ length: n }, (_, k) => ({ c: () => (k + 0.5) / n * Math.PI * 2, w: (r) => Math.max(0, Math.PI / n - sw(r) / r) * enveloppe(r, r0, r1, 3), r0, r1 }));
      const Zb = profil(zLip - 0.3 * D, zF + 0.72 * D, rH, 0.16 * D), g = galbe(0.14 * D);
      levrePolie(zLip - 0.42 * D, levre >= 0.06);
      voile({ fen, rH, Zb, Z: (r, u, oa, ob) => Zb(r) + g(u, oa, ob), epV: 0.45 * D, chanf: 0.06 * D, nU: 5, zT: zF + 0.86 * D, nEcrous: 5 });
      break;
    }
    case 'cinqCreux': {                                 // 5 branches dédoublées, creusées en gouttière, voile concave
      const n = 5, rH = q * 0.28, r0 = q * 0.36, r1 = rL - q * 0.07, s0 = q * 0.5, s1 = rL - q * 0.1;
      const sw = (r) => q * 0.05 + 0.12 * r, sl = (r) => q * 0.012 + 0.07 * (r - s0);
      const fen = [];
      for (let k = 0; k < n; k++) {
        fen.push({ c: () => k / n * Math.PI * 2, w: (r) => (sl(r) / r) * enveloppe(r, s0, s1, 2.5), r0: s0, r1: s1 });
        fen.push({ c: () => (k + 0.5) / n * Math.PI * 2, w: (r) => Math.max(0, Math.PI / n - sw(r) / r) * enveloppe(r, r0, r1, 4), r0, r1 });
      }
      const Zb = profil(zLip - 0.16 * D, zF + 0.22 * D, rH, -0.1 * D), g = galbe(-0.12 * D);   // galbe négatif : bords hauts, fond creux
      levrePolie(zLip - 0.3 * D, levre >= 0.06);
      voile({ fen, rH, Zb, Z: (r, u, oa, ob) => Zb(r) + g(u, oa, ob), epV: 0.42 * D, chanf: 0.05 * D, nU: 3, zT: zF + 0.4 * D, nEcrous: 5 });
      break;
    }
    case 'turbine': {                                   // 12 pales incurvées (spirale) et vrillées
      const n = 12, rH = q * 0.3, r0 = q * 0.38, r1 = rL - q * 0.07, courbe = 1.05;
      const fen = Array.from({ length: n }, (_, k) => ({ c: (r) => (k + 0.5) / n * Math.PI * 2 + courbe * (r - r0) / q, w: (r) => 0.125 * enveloppe(r, r0, r1, 4), r0, r1 }));
      const Zb = profil(zLip - 0.25 * D, zF + 0.6 * D, rH, 0.1 * D), vrille = 0.2 * D;
      levrePolie(zLip - 0.38 * D, levre >= 0.06);
      voile({ fen, rH, Zb, Z: (r, u, oa, ob) => Zb(r) + vrille * (u - 0.5) * 2 * Math.min(oa, ob) - 0.03 * D * (oa * (1 - u) ** 2 + ob * u * u), epV: 0.45 * D, chanf: 0.04 * D, nU: 3, zT: zF + 0.74 * D, nEcrous: 5 });
      break;
    }
    case 'rallye': {                                    // disque plein à 8 trous ronds chanfreinés, 4 écrous
      const n = 8, rH = q * 0.3, rc = (rH + rL) / 2 + q * 0.03, rho = Math.min(q * 0.16, (rL - rH) * 0.3);
      const w = (r) => { if (Math.abs(r - rc) >= rho) return 0; const x = (r * r + rc * rc - rho * rho) / (2 * r * rc); return Math.acos(Math.min(1, Math.max(-1, x))); };
      const fen = Array.from({ length: n }, (_, k) => ({ c: () => k / n * Math.PI * 2, w, r0: rc - rho, r1: rc + rho }));
      const Zb = profil(zLip - 0.35 * D, zF + 0.36 * D, rH, -0.08 * D);
      levrePolie(zLip - 0.45 * D, levre >= 0.06);
      voile({ fen, rH, Zb, Z: (r) => Zb(r), epV: 0.45 * D, chanf: 0.08 * D, nU: 4, zT: zF + 0.5 * D, nEcrous: 4 });
      break;
    }
    case 'etoileVIP': {                                 // 5 branches larges et plates, lèvre étagée rivetée
      const n = 5, rH = q * 0.3, r0 = q * 0.4, r1 = rL - q * 0.05;
      const sw = (r) => q * 0.13 + 0.12 * r;
      const fen = Array.from({ length: n }, (_, k) => ({ c: () => (k + 0.5) / n * Math.PI * 2, w: (r) => Math.max(0, Math.PI / n - sw(r) / r) * enveloppe(r, r0, r1, 6), r0, r1 }));
      const zO = zF + D * Math.max(0.12, 0.62 - levre * 1.4), Zb = profil(zO, zO + 0.06 * D, rH), g = galbe(0.03 * D);
      levrePolie(zO - 0.2 * D, true);
      rivets((q + rL) / 2, zLip, 20);
      voile({ fen, rH, Zb, Z: (r, u, oa, ob) => Zb(r) + g(u, oa, ob), epV: 0.4 * D, chanf: 0.04 * D, nU: 4, zT: zO + 0.26 * D, nEcrous: 5 });
      break;
    }
    case 'deepdish': {                                  // bol profond : lèvre large polie, voile reculé à 5 branches fines
      const n = 5, rH = q * 0.26, r0 = q * 0.32, r1 = rL - q * 0.04;
      const sw = (r) => q * 0.04 + 0.03 * r;
      const fen = Array.from({ length: n }, (_, k) => ({ c: () => (k + 0.5) / n * Math.PI * 2, w: (r) => Math.max(0, Math.PI / n - sw(r) / r) * enveloppe(r, r0, r1, 4), r0, r1 }));
      const zO = zF + D * Math.max(0.02, 0.5 - levre * 2), Zb = profil(zO, zO + 0.4 * D, rH, 0.08 * D), g = galbe(0.1 * D);
      levrePolie(Math.max(zMin, zO - 0.3 * D), true);
      rivets((q + rL) / 2 + (q - rL) * 0.18, zLip, 18);
      voile({ fen, rH, Zb, Z: (r, u, oa, ob) => Zb(r) + g(u, oa, ob), epV: 0.35 * D, chanf: 0.05 * D, nU: 3, zT: zO + 0.55 * D, nEcrous: 5 });
      break;
    }
    case 'bbs': {                                       // maille de rayons croisés, couronne rivetée, lèvre polie, moyeu en bossage
      const rH = q * 0.27, rM = rL - q * 0.085, zO = zLip - 0.45 * D;
      levrePolie(zO - 0.25 * D, true);
      face.push(tour(THREE, [[rL + 0.002, zO], [rM + q * 0.01, zO], [rM, zO - q * 0.01], [rM - 0.002, Math.max(zMin, zO - 0.4 * D)]], 48));   // couronne
      rivets((rM + rL) / 2, zO, 20);
      const Zr = (r) => { const t = Math.min(1, Math.max(0, (rM - r) / (rM - rH))); return lerp(zO, zLip - 0.18 * D, t) - 0.42 * D * Math.sin(Math.PI * t); };
      const n = 10, l = q * 0.05;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        for (const [sg, dz] of [[1, 0], [-1, 0.006 * R]]) {
          const b = barreJante(THREE, { r0: rH * 0.9, a0: a, r1: rM + q * 0.03, a1: a + sg * 0.36, l, Zr, dz, ep: 0.32 * D, zMin, chanf: 0.05 * D });
          face.push(b.dessus); flanc.push(...b.murs);
        }
      }
      moyeu(rH, zLip - 0.02 * D, Math.max(zMin, Zr(rH) - 0.3 * D), 5);
      break;
    }
    case 'fils': {                                      // roue à rayons : jante chromée, 48 rayons laçés, moyeu saillant, papillon
      const zO = zLip - 0.45 * D, rN = rL - q * 0.03, rMy = q * 0.17;
      levrePolie(zO, true);
      poli.push(tour(THREE, [[rL + 0.002, zO], [q * 0.8, zO - 0.05 * D], [q * 0.8, Math.max(zMin, zO - 0.35 * D)]], 48));   // fond de jante (talon des rayons)
      const zAv = Math.min(h * 0.98, zLip + 0.35 * D), zFl1 = zLip - 0.05 * D, zFl2 = zF + 0.1 * D;
      poli.push(tour(THREE, [[0, zAv + 0.25 * D], [rMy * 0.55, zAv + 0.22 * D], [rMy * 0.8, zAv], [rMy, zFl1 + 0.06 * D], [rMy * 1.35, zFl1 + 0.02 * D], [rMy * 1.35, zFl1 - 0.02 * D], [rMy * 0.9, zFl1 - 0.06 * D], [rMy * 0.9, zFl2 + 0.03 * D], [rMy * 1.3, zFl2], [rMy * 1.3, zFl2 - 0.04 * D], [rMy * 0.8, zMin]], 24));
      for (const sg of [1, -1]) {                       // papillon (écrou à oreilles) du moyeu
        const o = new THREE.BoxGeometry(rMy * 0.9, rMy * 0.26, 0.18 * D);
        o.translate(sg * rMy * 0.75, 0, zAv + 0.12 * D); o.rotateZ(0.3); poli.push(o);
      }
      const rt = Math.max(q * 0.011, 0.0028), V3 = (r, a, z) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2;
        face.push(tige(THREE, V3(rMy * 1.25, a, zFl1), V3(rN, a + 0.42, zO - 0.05 * D), rt));            // nappe avant, tangente +
        face.push(tige(THREE, V3(rMy * 1.25, a + 0.2, zFl1 - 0.01 * D), V3(rN, a - 0.22, zO - 0.08 * D), rt));   // nappe avant, tangente −
        face.push(tige(THREE, V3(rMy * 1.2, a + 0.1, zFl2), V3(rN, a + 0.1 + 0.3, zO - 0.12 * D), rt));        // nappe arrière
      }
      break;
    }
    case 'f1_2022': {                                   // enjoliveur aéro plein (18 pouces), écrou central et ergots
      const zC = zLip - 0.02 * D;
      poli.push(tour(THREE, [[q, zL - R * 0.02], [q, zLip], [q * 0.965, zLip + 0.01 * D], [q * 0.94, zLip - 0.06 * D]], 48));
      face.push(tour(THREE, [[q * 0.94, zLip - 0.06 * D], [q * 0.915, zC - 0.12 * D], [q * 0.89, zC - 0.04 * D], [q * 0.7, zC + 0.02 * D], [q * 0.5, zC + 0.06 * D],
        [q * 0.45, zC + 0.07 * D], [q * 0.44, zC + 0.16 * D], [q * 0.37, zC + 0.17 * D], [q * 0.355, zC + 0.04 * D], [q * 0.24, zC + 0.02 * D], [q * 0.2, zMin]], 48));
      flanc.push(tour(THREE, [[q * 0.2, zC + 0.02 * D], [q * 0.12, zC + 0.04 * D], [0, zC + 0.04 * D]], 24));                // fond du moyeu
      boulon.push(plot(THREE, 0, 0, q * 0.14, zC, zC + 0.42 * D, 12, q * 0.12));                                              // écrou central
      poli.push(plot(THREE, 0, 0, q * 0.06, zC + 0.42 * D, zC + 0.55 * D, 16, q * 0.045));                                    // goupille
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; boulon.push(plot(THREE, Math.cos(a) * q * 0.29, Math.sin(a) * q * 0.29, q * 0.025, zC + 0.02 * D, zC + 0.12 * D, 6)); }
      for (let i = 0; i < 10; i++) {                    // nervures aéro rayonnantes, très basses
        const a = i / 10 * Math.PI * 2, b = barreJante(THREE, { r0: q * 0.47, a0: a, r1: q * 0.86, a1: a + 0.18, l: q * 0.03, Zr: (r) => zC + 0.06 * D * (1 - (r - q * 0.5) / (q * 0.4)) + 0.015 * D, ep: 0.08 * D, zMin, chanf: 0.02 * D, n: 6 });
        face.push(b.dessus); flanc.push(...b.murs);
      }
      break;
    }
    default: return null;
  }
  const f = (arr) => (arr.length ? fusionGeo(THREE, arr) : null);
  return { face: f(face), flanc: f(flanc), poli: f(poli), boulon: f(boulon) };
}

/** Matériaux d'une jante 3D (teinte de la jante ; lèvre polie et écrous métal). Aucun émissif. Tous DoubleSide (normales cohérentes). */
function materiauxJante3D(THREE, { jante, peinte, envMap, garde }) {
  const lin = (x) => new THREE.Color(x).convertSRGBToLinear();
  const lum = (() => { const hsl = { h: 0, s: 0, l: 0 }; new THREE.Color(jante).getHSL(hsl); return hsl.l; })(), sombre = lum < 0.2;
  const mj = peinte ? 0.08 : 0.85, D2 = THREE.DoubleSide;
  return {
    face: garde(new THREE.MeshPhysicalMaterial({ color: lin(jante), roughness: peinte ? 0.3 : 0.2, metalness: mj, clearcoat: sombre ? 0.5 : 0.8, clearcoatRoughness: 0.08, envMap, envMapIntensity: sombre ? 0.75 : 1.2, side: D2 })),
    flanc: garde(new THREE.MeshPhysicalMaterial({ color: lin(jante).multiplyScalar(peinte ? 0.62 : 0.5), roughness: 0.4, metalness: peinte ? 0.15 : 0.85, clearcoat: 0.3, envMap, envMapIntensity: 0.8, side: D2 })),
    poli: garde(new THREE.MeshStandardMaterial({ color: 0xe8ebf1, roughness: 0.2, metalness: 0.78, envMap, envMapIntensity: 1.5, side: D2 })),   // alu poli : reste clair même dans un studio sombre
    boulon: garde(new THREE.MeshStandardMaterial({ color: 0xbfc3cc, roughness: 0.22, metalness: 1, envMap, envMapIntensity: 1.2, side: D2 })),
  };
}

/** Remplace le disque texturé d'une roue (creerRoue) par une jante 3D en relief ; renvoie false si le style n'est pas un style 3D. */
function poserJante3D(THREE, w, matRoue, { style, R, ep, cote, levre, jante, peinte, envMap, garde, cacheGeo, cacheMat }) {
  if (!JANTES_3D.includes(style)) return false;
  const cleG = [style, R.toFixed(4), ep.toFixed(4), Number.isFinite(levre) ? levre.toFixed(3) : '-'].join('|');
  let geos = cacheGeo.get(cleG);
  if (!geos) {
    geos = geometrieJante3D(THREE, style, R, ep, levre);
    for (const g of Object.values(geos)) if (g) garde(g);
    cacheGeo.set(cleG, geos);
  }
  const cleM = String(jante) + '|' + (peinte ? 1 : 0);
  let mats = cacheMat.get(cleM);
  if (!mats) { mats = materiauxJante3D(THREE, { jante, peinte, envMap, garde }); cacheMat.set(cleM, mats); }
  // retrait du disque texturé, du moyeu, du cache et des boulons historiques (pneu, fût, lèvre torique, frein, voile, étrier : conservés)
  for (const o of [...w.tourne.children]) {
    const m = o.material;
    if (m === matRoue.rayons || m === matRoue.moyeu || m === matRoue.boulon || (m === matRoue.chrome && o.geometry && o.geometry.type === 'SphereGeometry')) w.tourne.remove(o);
  }
  const grp = new THREE.Group(); grp.name = 'jante3d-' + style;
  for (const k of ['face', 'flanc', 'poli', 'boulon']) if (geos[k]) { const m = new THREE.Mesh(geos[k], mats[k]); m.name = 'jante3d-' + k; grp.add(m); }
  if (cote < 0) grp.rotation.y = Math.PI;
  w.tourne.add(grp);
  return true;
}

/* ------------------------------------------------------------------ accessoires en volume */
function kits3d(THREE, { geo, chassis, largeur, matLaque, matNoir, matAccent, matVerre, lumBlanche, lumRouge, garde, animes }) {
  const { X, Y } = geo, h = geo.hauteurs, f = geo.f;
  const yH = (hh) => hh * K;                          // hauteur au-dessus du sol (px) → monde
  const xP = (p) => wx(X(p));
  const couleur = (col, def) => garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col || def), roughness: 0.25, metalness: 0.45, clearcoat: 1, envMap: matLaque.envMap, envMapIntensity: 1.2 }));
  for (const [type, ...a] of geo.kit) {
    const o = a.length && typeof a[a.length - 1] === 'object' && !Array.isArray(a[a.length - 1]) ? a[a.length - 1] : {};
    if (type === 'aileron') {
      const style = a[0] || 'haut', mat = couleur(o.c, f.c.caisse);
      if (style === 'levre') { chassis.add(boite(THREE, 0.5, 0.08, largeur * 0.92, mat, wx(geo.xArriere) + 0.3, yH(h.queue) + 0.06, 0)); continue; }
      const p = o.p ?? 0.93, hh = o.h ?? h.queue + 14, l = (o.l ?? 30) * K;
      chassis.add(boite(THREE, l, 0.07, largeur * 0.98, mat, xP(p), yH(hh), 0));
      for (const z of [-1, 1]) {
        chassis.add(boite(THREE, l * 0.9, 0.36, 0.04, mat, xP(p), yH(hh) - 0.1, z * largeur * 0.49));
        chassis.add(boite(THREE, 0.06, yH(hh) - yH(h.coffre) + 0.05, 0.06, matNoir, xP(p) + 0.1, (yH(hh) + yH(h.coffre)) / 2, z * largeur * 0.28));
      }
    } else if (type === 'chauve') {                 // ailerons de chauve-souris
      const hm = a[0] || 26, p0 = o.p0 ?? 0.6, base = o.base ?? h.caisse - 4, xt = geo.xArriere + (o.deb ?? 6);
      const pts = [[X(p0), Y(base)], [xt, Y(base + hm)], [xt + 3, Y(base + hm * 0.64)], [xt + 10, Y(base + hm * 0.38)], [xt + 21, Y(base)]];
      const mat = couleur(o.c, f.c.caisse);
      for (const z of [-1, 1]) { const m = new THREE.Mesh(garde(extruder(THREE, pts, 0.07, 0.02)), mat); m.position.z = z * largeur * 0.36; chassis.add(m); }
    } else if (type === 'bulle') {
      for (const [p, w, hh] of a[0]) {
        const b = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.c || '#bfe8ff'), roughness: 0.05, transmission: 0, transparent: true, opacity: 0.6, clearcoat: 1, envMap: matLaque.envMap })));
        b.scale.set(w * K * 0.55, hh * K, largeur * 0.32); b.position.set(xP(p), yH(h.caisse - 1), 0); chassis.add(b);
      }
    } else if (type === 'turbine') {
      const hh = a[0] ?? h.queue - 12;
      const t = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.2, 0.26, 0.4, 16)), matNoir); t.rotation.z = Math.PI / 2; t.position.set(wx(geo.xArriere) - 0.12, yH(hh), 0); chassis.add(t);
      const feu = new THREE.Mesh(garde(new THREE.CircleGeometry(0.17, 16)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c || '#ff7a1a').multiplyScalar(2), toneMapped: false })));
      feu.rotation.y = -Math.PI / 2; feu.position.set(wx(geo.xArriere) - 0.33, yH(hh), 0); chassis.add(feu);
      animes.push((tt) => { feu.scale.setScalar(0.85 + Math.sin(tt * 40) * 0.15); });
    } else if (type === 'rampe') {
      const x = xP(a[0] ?? 0.55), y = yH(h.toit) + 0.08;
      chassis.add(boite(THREE, 0.3, 0.1, largeur * 0.62, matNoir, x, y, 0));
      const r = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c1 || '#ff2a3d').multiplyScalar(2), toneMapped: false }));
      const b = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c2 || '#2a7bff').multiplyScalar(2), toneMapped: false }));
      const g1 = boite(THREE, 0.26, 0.09, largeur * 0.26, r, x, y + 0.05, -largeur * 0.16), g2 = boite(THREE, 0.26, 0.09, largeur * 0.26, b, x, y + 0.05, largeur * 0.16);
      chassis.add(g1, g2);
      animes.push((tt) => { const on = Math.floor(tt * 6) % 2; g1.visible = !!on; g2.visible = !on; });
    } else if (type === 'taxi') {
      const x = xP(a[0] ?? 0.55);
      chassis.add(boite(THREE, 0.55, 0.2, 0.18, garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c || '#ffcf2a').multiplyScalar(1.6), toneMapped: false })), x, yH(h.toit) + 0.12, 0));
    } else if (type === 'moteur') {
      const x = xP(a[0] ?? 0.2), y = yH(h.caisse), w = (o.l ?? 34) * K, chrome = couleur(o.c, '#c8ccd6');
      chassis.add(boite(THREE, w, 0.24, largeur * 0.38, chrome, x, y + 0.1, 0));
      chassis.add(boite(THREE, w * 0.6, 0.24, largeur * 0.3, couleur(o.souffleur, '#555b6b'), x, y + 0.34, 0));
      for (let i = 0; i < 3; i++) { const cy = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 10)), chrome); cy.position.set(x - w * 0.22 + i * w * 0.22, y + 0.56, 0); chassis.add(cy); }
    } else if (type === 'prise') chassis.add(boite(THREE, 0.6, 0.16, largeur * 0.3, couleur(o.c, '#22242a'), xP(a[0] ?? 0.2), yH(h.caisse) + 0.06, 0));
    else if (type === 'scanner') {
      const y = yH((f.nez ?? 24) - 3), segs = [];
      for (let i = 0; i < 6; i++) { const s = boite(THREE, 0.04, 0.07, largeur * 0.1, garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2030').multiplyScalar(2.4), toneMapped: false, transparent: true })), wx(geo.xAvant) + 0.04, y, (i - 2.5) * largeur * 0.11); chassis.add(s); segs.push(s); }
      animes.push((tt) => { const k = (Math.sin(tt * 4) * 0.5 + 0.5) * 5; segs.forEach((s, i) => { s.material.opacity = Math.max(0.12, 1 - Math.abs(i - k) * 0.45); }); });
    } else if (type === 'galerie') {
      for (const z of [-1, 1]) chassis.add(boite(THREE, (X(a[0]) - X(a[1])) * K, 0.04, 0.04, matNoir, (xP(a[0]) + xP(a[1])) / 2, yH(h.toit) + 0.12, z * largeur * 0.3));
    } else if (type === 'echappement') {
      for (const z of [-1, 1]) {
        const e = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.07, 0.07, (X(a[0] ?? 0.32) - X(a[1] ?? 0.62)) * K, 10)), couleur(null, '#cfd4de'));
        e.rotation.z = Math.PI / 2; e.position.set((xP(a[0] ?? 0.32) + xP(a[1] ?? 0.62)) / 2, yH(h.garde + 3), z * (largeur / 2 + 0.05)); chassis.add(e);
      }
    } else if (type === 'ailes') {
      const x = X(a[0] ?? 0.62), y = Y(h.caisse - 6);
      const pts = [[x + 16, y], [x - 40, y - 26], [x - 30, y - 6]];
      const mat = couleur(o.c, '#ffffff');
      for (const z of [-1, 1]) { const m = new THREE.Mesh(garde(extruder(THREE, pts, 0.05, 0.02)), mat); m.position.z = z * largeur * 0.42; chassis.add(m); }
    } else if (type === 'pare') {
      const x = xP(a[0] ?? 0.36), hh = (o.h ?? 13) * K;
      const vitre = boite(THREE, 0.04, hh, largeur * 0.75, matVerre, x, yH(h.caisse) + hh / 2, 0); vitre.rotation.z = 0.5; chassis.add(vitre);
      if (o.appuie !== false) { const ap = new THREE.Mesh(garde(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), couleur(o.ca, f.c.caisse)); ap.position.set(xP(o.pa ?? 0.6), yH(h.caisse), -largeur * 0.18); chassis.add(ap); }
    } else if (type === 'cockpit') {
      const casque = new THREE.Mesh(garde(new THREE.SphereGeometry(0.18, 14, 10)), couleur(o.c, '#f4f4f4')); casque.position.set(xP(a[0] ?? 0.45), yH(h.caisse) + 0.12, 0); chassis.add(casque);
    } else if (type === 'lame') chassis.add(boite(THREE, 0.45, 0.07, largeur * 0.62, couleur(o.c, '#16181f'), wx(geo.xAvant) - 0.1, yH(h.garde + 2), 0));
    else if (type === 'antenne') { const an = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 6)), matNoir); an.position.set(xP(a[0]), yH(a[1]) + 0.3, -largeur * 0.3); an.rotation.z = 0.4; chassis.add(an); }
  }
}

/* ------------------------------------------------------------------ vue 360° (Showroom) */
/** Ouvre une vue 360° du bolide dans parent (glisser pour tourner, molette pour zoomer). Renvoie une fonction de fermeture. */
export async function vue360(parent, code, { THREE = window.THREE } = {}) {
  if (!THREE) return null;
  const el = document.createElement('div');
  el.className = 'vue360';
  el.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at 50% 70%,#1b1640,#05040c 70%);cursor:grab;touch-action:none';
  parent.appendChild(el);
  const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:100%;display:block'; el.appendChild(cv);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  const env = envNeon(THREE, renderer);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0x9fb0ff, 0x120a20, 0.55));
  const cle = new THREE.DirectionalLight(0xffffff, 1.6); cle.position.set(4, 8, 6); scene.add(cle);
  const contre = new THREE.DirectionalLight(0xff4fd8, 0.55); contre.position.set(-6, 3, -5); scene.add(contre);
  const sol = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshStandardMaterial({ color: 0x0a0a16, roughness: 0.4, metalness: 0.6 }));
  sol.rotation.x = -Math.PI / 2; scene.add(sol);
  const anneau = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.32, 64), new THREE.MeshBasicMaterial({ color: 0x22d3ee, toneMapped: false })); anneau.rotation.x = -Math.PI / 2; anneau.position.y = 0.01; scene.add(anneau);
  let m = null;
  try { m = await construireBolide3D(code, { THREE, envMap: env }); }
  catch (e) { console.error(e); el.remove(); renderer.dispose(); return null; }
  scene.add(m.groupe);
  let az = 0.6, el2 = 0.28, dist = 13, glisse = false, px = 0, py = 0, auto = true, fini = false, raf = 0, t0 = performance.now(), dernier = t0;
  const taille = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
  taille(); addEventListener('resize', taille);
  el.addEventListener('pointerdown', (e) => { glisse = true; auto = false; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', (e) => { if (!glisse) return; az -= (e.clientX - px) * 0.008; el2 = Math.max(0.05, Math.min(1.2, el2 + (e.clientY - py) * 0.005)); px = e.clientX; py = e.clientY; });
  el.addEventListener('pointerup', () => { glisse = false; el.style.cursor = 'grab'; });
  el.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(7, Math.min(22, dist + e.deltaY * 0.01)); }, { passive: false });
  const boucle = (now) => {
    if (fini) return;
    const dt = Math.min(0.05, (now - dernier) / 1000), t = (now - t0) / 1000; dernier = now;
    if (auto) az += dt * 0.35;
    cam.position.set(Math.cos(az) * dist * Math.cos(el2), 1.2 + Math.sin(el2) * dist, Math.sin(az) * dist * Math.cos(el2));
    cam.lookAt(0, m.hauteur * 0.45, 0);
    m.maj(dt, 0, t);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(boucle);
  };
  raf = requestAnimationFrame(boucle);
  return () => { fini = true; cancelAnimationFrame(raf); removeEventListener('resize', taille); m.dispose(); renderer.dispose(); el.remove(); };
}
