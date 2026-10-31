/* OUTILS du segment « folie » (V8 Finale) — poses, cascades cartoon, lumières fixes, textures canvas, habillage pop.

   Tout est FONCTION PURE : aucune de ces aides ne garde d'état d'une image à l'autre.
   Repère du film : 1 unité = 1 cm, y = haut ; un bolide m3d regarde +z dans son repère local (gauche = +x). */
import { clamp, lerp, smoother } from '../v7_multivers_4k/physique_cgi.js';
import { neutraliserRoues } from '../v7_multivers_4k/voitures.js';

export const DEG = Math.PI / 180;
export const VOIES_HEX = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'];
const COINS_NULS = Object.freeze({ av_g: 0, av_d: 0, ar_g: 0, ar_d: 0 });

/** Pose « physique_cgi » complète (attendue par poser()) d'un bolide posé sur une spline à l'abscisse s. */
export function poseSpline(sp, s, { heave = 0, roulis = 0, lacet = 0 } = {}) {
  const P = sp.point(s), T = sp.tangente(Math.max(0, Math.min(sp.longueur, s)));
  const cap = Math.atan2(T[0], T[2]), pente = Math.asin(clamp(T[1], -1, 1));
  return { pos: P, cap: cap + lacet, capVitesse: cap, tangage: 0, pente, roulis, heave, dist: s, braquage: 0, coins: COINS_NULS, beta: 0 };
}

/** Pose libre (position + cap) pour poser(). */
export function poseLibre(pos, cap, dist = 0) {
  return { pos, cap, capVitesse: cap, tangage: 0, pente: 0, roulis: 0, heave: 0, dist, braquage: 0, coins: COINS_NULS, beta: 0 };
}

/** Roues d'un bolide m3d ou d'un clone recoloré : braquage nul, rotation absolue (ω = distance / R). */
export function roulerRoues(env, dist) {
  if (env.v7.roues && env.v7.roues.length) neutraliserRoues(env);
  for (const w of env.v7.roues || []) if (w.type === 'm3d') w.w.tourne.rotation.z = -dist / w.r;
  for (const r of env.v7.tournes || []) r.n.rotation.z = -dist / r.r;
}

/** Cascade cartoon : place le bolide pour que son CENTRE (à mi-hauteur) soit en `centre`, avec un cap (lacet) puis un salto
    (tangage, autour de l'axe gauche-droite du bolide) et un tonneau (roulis, autour de son axe avant). Rotation autour du centre :
    un bolide qui fait un tonneau tourne sur lui-même au lieu de pivoter autour de ses roues. */
export function placerCascade(THREE, env, { centre, lacet = 0, salto = 0, tonneau = 0, dist = 0 }) {
  const h = (env.v7.hauteur || 2.4) * 0.5;
  env.rotation.set(salto, lacet, tonneau, 'YXZ');
  env.updateMatrix();
  const c = new THREE.Vector3(0, h, 0).applyEuler(env.rotation);
  env.position.set(centre[0] - c.x, centre[1] - c.y, centre[2] - c.z);
  roulerRoues(env, dist);
}

/** Jeu de lumières FIXE du segment : le nombre de lumières ne change jamais (aucune recompilation de shader d'un plan à l'autre,
    rendu identique quel que soit l'ordre des images). Chaque plan règle toutes les intensités à chaque image (eteindre() d'abord). */
export function creerLumieresFixes(THREE, groupe) {
  const spot = new THREE.SpotLight(0xffffff, 0, 400, 0.4, 0.6, 2);
  const d1 = new THREE.DirectionalLight(0xffffff, 0), d2 = new THREE.DirectionalLight(0xffffff, 0);
  const p1 = new THREE.PointLight(0xffffff, 0, 60, 2), p2 = new THREE.PointLight(0xffffff, 0, 60, 2), p3 = new THREE.PointLight(0xffffff, 0, 60, 2);
  groupe.add(spot, spot.target, d1, d1.target, d2, d2.target, p1, p2, p3);
  const toutes = { spot, d1, d2, p1, p2, p3 };
  return {
    ...toutes,
    eteindre() { for (const l of Object.values(toutes)) l.intensity = 0; },
    /** réglage compact : regler('p1', { c: 0xffd9a0, i: 3, p: [x,y,z], d: 40 }) */
    regler(nom, { c = 0xffffff, i = 1, p = [0, 10, 0], v = [0, 0, 0], d = null, angle = null, penombre = null }) {
      const l = toutes[nom]; l.color.set(c); l.intensity = i; l.position.set(...p);
      if (l.target) { l.target.position.set(...v); l.target.updateMatrixWorld(); }
      if (d !== null && 'distance' in l) l.distance = d;
      if (angle !== null && 'angle' in l) l.angle = angle;
      if (penombre !== null && 'penumbra' in l) l.penumbra = penombre;
    },
  };
}

/** Toile 2D → CanvasTexture sRGB. */
export function textureToile(THREE, w, h, dessiner) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; dessiner(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
export const policeCanvas = (px, poids = 700, famille = 'Fredoka') => `${poids} ${px}px "${famille}", "Nunito", system-ui, sans-serif`;
export function rectArrondi(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Clone recoloré d'un bolide m3d (géométries partagées, peinture remplacée) : la carrosserie (matériaux clairs et opaques)
    prend `peinture`, les pneus, vitres et pièces sombres gardent leur matériau. Les roues du clone restent pilotables. */
export function cloneRecolore(THREE, src, peinture) {
  const c = src.clone(true);
  // table de correspondance source → clone (parcours parallèle, même ordre)
  const a = [], b = []; src.traverse((o) => a.push(o)); c.traverse((o) => b.push(o));
  const carte = new Map(a.map((o, i) => [o, b[i]]));
  const remplace = (m) => {
    if (!m || !m.color || m.transparent || m.opacity < 0.95) return m;
    const lum = 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;
    const chrome = m.metalness > 0.85 && m.roughness < 0.2;
    return lum > 0.06 && !chrome && !m.emissiveMap ? peinture : m;
  };
  c.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(remplace) : remplace(o.material); });
  const tournes = (src.v7.roues || []).filter((w) => w.type === 'm3d').map((w) => ({ n: carte.get(w.w.tourne), r: w.r })).filter((x) => x.n);
  c.v7 = { type: 'clone', code: src.v7.code, L: src.v7.L, largeur: src.v7.largeur, hauteur: src.v7.hauteur, roues: [], tournes };
  return c;
}

/** Titre pop (au plus 3 mots) dans le bandeau haut, hors de la zone sacrée : apparition élastique, sortie en fondu. */
export function titrePop(g, W, H, o, str, t, t0, t1, { x = 92, y = 168, taille = 76, couleur = '#ffe23d', align = 'left' } = {}) {
  if (t < t0 || t > t1) return;
  const s = W / 1920, a = t - t0, b = t1 - t;
  const k = a < 0.12 ? lerp(0.35, 1.14, smoother(a / 0.12)) : a < 0.26 ? lerp(1.14, 1, smoother((a - 0.12) / 0.14)) : 1;
  g.save(); g.translate(x * s, y * s); g.scale(k, k);
  o.texte(g, s, str, 0, 0, { taille, couleur, align, contour: 9, alpha: clamp(b / 0.22), espace: 2 });
  g.restore();
}

/** Courbe « impulsion » gaussienne centrée sur t0. */
export const impulsion = (t, t0, l) => Math.exp(-Math.pow((t - t0) / l, 2));
export { clamp, lerp, smoother };
