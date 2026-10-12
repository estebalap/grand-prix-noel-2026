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
    /* options par roue : RW (rayon exact, sinon R×1.22), ep (épaisseur du pneu), z (demi-voie : centre du pneu), jante, rayons, flanc, sansFrein, lenticulaire */
    const R = r.RW ?? r.R * 1.22, ep = r.fin ? (r.ep ?? R * 0.3) : Math.max(r.ep ?? R * 0.66, 0.45);   // pneus « boudins » : jamais de roue de vélo (sauf fin: true)
    const matS = materiauxRoue(THREE, { envMap, jante: r.jante || sm.jante || '#c9cfda', rayons: r.rayons || sm.rayons || 'cinq', neon: null, etrier: r.etrier || '#e8202a', garde, peinte: r.chrome === true ? false : !janteMetal(r.jante || sm.jante) });
    const zc = r.z ?? (largeur / 2 - ep * 0.12);
    for (const z of [-zc, zc]) {
      const w = creerRoue(THREE, matS, { R, ep, cote: z >= 0 ? 1 : -1, flanc: r.flanc ?? sm.flanc ?? null, garde, sansFrein: !!r.sansFrein, lenticulaire: !!r.lenticulaire, main: !!r.main });
      w.pivot.position.set(r.x, r.y ?? R, z); groupe.add(w.pivot);
      roues.push({ pivot: w.pivot, tourne: w.tourne, etriers: w.etriers, r: R, ep, fin: !!r.fin, x: r.x, avant: !!r.avant, z });
    }
  }
  for (const r of ((loco || sm || !geo) ? [] : geo.roues)) {
    const R = r.r * K * (geo.fam === 'route' ? 1.12 : 1), fa = geo.fam === 'fauteuil', grande = fa && !r.roulette, ep = geo.fam === 'f1' || geo.fam === 'f1vintage' ? R * 0.9 : fa ? (r.roulette ? 0.2 : 0.2) : R * 0.62;
    const zs = geo.fam === 'f1' ? [-1.3, 1.3] : geo.fam === 'f1vintage' ? [-1.12, 1.12] : fa ? (r.roulette ? [-0.6, 0.6] : [-1.0, 1.0]) : [-(largeur / 2 - ep * 0.5 + 0.03), largeur / 2 - ep * 0.5 + 0.03];
    for (const z of zs) {
      const w = creerRoue(THREE, matR, { R, ep, cote: z >= 0 ? 1 : -1, main: grande, lenticulaire: grande, flanc: f.flanc || null, garde, sansFrein: fa && !!r.roulette });
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
    const fp = familleProportion(code);
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
