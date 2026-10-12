/**
 * Outils communs des modèles 3D sur mesure (matériaux, boîtes, cylindres, profils extrudés galbés, décalcomanies de flanc, phares).
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque : motifs génériques uniquement.
 */
import { galber } from '../bolides3d_pieces.js';

/**
 * Dessine un autocollant de flanc pour le côté `cote` (+1 : flanc +z, −1 : flanc −z).
 * Convention : le canvas est dessiné « vu du flanc +z », nez du véhicule à DROITE (u = 1 vers +x).
 * Sur le flanc −z, le support (plan retourné ou drapé à u inversé) place le bord gauche du canvas vers l'AVANT :
 * on redessine donc la mise en page en miroir horizontal (chaque motif garde la même abscisse véhicule,
 * flammes et bandes gardent leur sens avant/arrière), mais chaque texte (fillText/strokeText) est redressé
 * localement pour rester lisible. Une fonction de dessin qui gère elle-même le côté (4 paramètres
 * `(g, w, h, cote)` ou marquée `dessin.parCote = true`) reçoit le contexte brut et `cote`.
 */
export function dessinerCote(dessin, g, w, h, cote = 1) {
  if (cote >= 0) return dessin(g, w, h, 1);
  if (dessin.parCote || dessin.length >= 4) return dessin(g, w, h, -1);
  const P = Object.getPrototypeOf(g), M = [-1, 0, 0, 1, w, 0];
  const inv = { left: 'right', right: 'left', start: 'right', end: 'left', center: 'center' };
  const redresse = (nom) => function (s, x, y, ...r) {
    P.save.call(this); P.translate.call(this, x, y); P.scale.call(this, -1, 1);
    this.textAlign = inv[this.textAlign] ?? this.textAlign; P[nom].call(this, s, 0, 0, ...r); P.restore.call(this);
  };
  g.fillText = redresse('fillText'); g.strokeText = redresse('strokeText');
  g.setTransform = function (a, b, c, d, e, f) {
    P.setTransform.call(this, ...M);
    if (a && typeof a === 'object') P.transform.call(this, a.a ?? 1, a.b ?? 0, a.c ?? 0, a.d ?? 1, a.e ?? 0, a.f ?? 0); else if (a !== undefined) P.transform.call(this, a, b, c, d, e, f);
  };
  g.resetTransform = function () { P.setTransform.call(this, ...M); };
  P.setTransform.call(g, ...M);
  try { return dessin(g, w, h, -1); }
  finally { for (const k of ['fillText', 'strokeText', 'setTransform', 'resetTransform']) delete g[k]; P.setTransform.call(g, 1, 0, 0, 1, 0, 0); }
}

export function outils(ctx) {
  const { THREE, chassis, garde, envMap } = ctx;
  const vernis = { clearcoat: 1, clearcoatRoughness: 0.08, envMap, envMapIntensity: 0.7 };   // reflet modéré : la couleur de base reste dominante
  /** Teinte sRGB (hex) → couleur linéaire : en r130 les couleurs ne sont pas converties automatiquement, d'où des teintes délavées sinon. */
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const lac = (hex, r = 0.25, m = 0.4) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: r, metalness: m, ...vernis }));
  const mat = (hex, r = 0.6, m = 0.3) => garde(new THREE.MeshStandardMaterial({ color: lin(hex), roughness: r, metalness: m, envMap, envMapIntensity: 0.8 }));
  const chrome = garde(new THREE.MeshStandardMaterial({ color: 0xeef1f6, roughness: 0.1, metalness: 0.9, emissive: 0x20242c, envMap, envMapIntensity: 1.8 }));
  const verre = garde(new THREE.MeshPhysicalMaterial({ color: 0x10151f, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.86, ...vernis }));
  const ajouter = (m) => { chassis.add(m); return m; };
  const boite = (l, h, p, m, x, y, z) => { const o = new THREE.Mesh(garde(new THREE.BoxGeometry(l, h, p)), m); o.position.set(x, y, z); return ajouter(o); };
  const cyl = (rt, rb, h, m, x, y, z, rx = 0, rz = 0, seg = 28) => { const o = new THREE.Mesh(garde(new THREE.CylinderGeometry(rt, rb, h, seg)), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); return ajouter(o); };
  /** profil (x, y) extrudé sur la largeur, puis galbé : renvoie le mesh ajouté. */
  const profil = (pts, largeur, m, o = {}) => {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    const b = o.biseau ?? 0.12;
    const g = new THREE.ExtrudeGeometry(s, { depth: largeur, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 4, curveSegments: 6, steps: 1 });
    g.translate(0, 0, -largeur / 2);
    const gg = o.galbe === false ? g : galber(THREE, g, o.galbe || {});
    const mesh = new THREE.Mesh(garde(gg), m); mesh.position.set(0, o.y || 0, 0); return ajouter(mesh);
  };
  /** Autocollant de flanc collé des deux côtés : un canvas par côté (cf. dessinerCote) → même position avant/arrière
   *  sur les deux flancs, textes lisibles des deux côtés. Signature inchangée ; `dessin(g, w, h[, cote])`. */
  const decalFlanc = (dessin, w, h, x, y, zDemi, cw = 1024, ch = 256) => {
    for (const z of [-1, 1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessinerCote(dessin, cv.getContext('2d'), cw, ch, z);
      const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), m); p.position.set(x, y, z * zDemi); if (z < 0) p.rotation.y = Math.PI; ajouter(p);
    }
  };
  const phares = (x, y, zs, r, lum) => { for (const z of zs) { const o = new THREE.Mesh(garde(new THREE.SphereGeometry(r, 18, 12)), lum); o.scale.set(0.45, 1, 1); o.position.set(x, y, z); ajouter(o); } };
  return { lin, lac, mat, chrome, verre, boite, cyl, profil, decalFlanc, dessinerCote, phares, ajouter };
}
