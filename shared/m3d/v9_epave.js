/* V9 — module des épaves : N12 et N13 (Hot Wheels Jet Threat 4.0, voir plus bas : deux états neuf / épave).
 *
 * N12 « L'Épave » : Mercedes-Benz Classe B Majorette d'Esteban (monospace compact de première génération, silhouette
 * W168 : très court, très haut, capot plongeant dans le prolongement d'un pare-brise très couché, toit long et plat, poupe
 * verticale, cinq portes, porte-à-faux minuscules).
 *
 * Méthode (reprise des modules v5_europe / v8_a) : la caisse et la serre sont deux lofts de superellipses dont les stations
 * sont tirées de COURBES de profil relevées sur les cotes réelles W168 (3 575 × 1 719 × 1 575 mm, empattement 2 423),
 * mises à l'échelle 2,0 u/m. Différence majeure avec les modèles précédents : la miniature est une ÉPAVE.
 *   - Les coques sont générées ici par `coque` (même surface que le loft d'aide_2) avec un FILTRE de triangles : les
 *     baies vitrées et l'ouverture du hayon perdu sont réellement découpées dans la tôle.
 *   - Vitrages : vraies surfaces transparentes (légèrement troubles et rayées) posées exactement dans les baies ;
 *     on voit l'habitacle gris au travers (sièges, volant, planche de bord).
 *   - Hayon MANQUANT : l'arrière est béant ; une « pièce » grise vue de l'intérieur (coque inverse) forme plancher de coffre,
 *     parois et pavillon intérieur ; dossiers de banquette, passages de roues intérieurs, bords de tôle à nu cabossés.
 *   - Éclats de peinture : des dizaines de taches argent / métal nu irrégulières, réparties de façon déterministe (générateur
 *     à graine) et concentrées sur les arêtes, peintes sur des décalques drapés exactement sur les coques.
 * Repère : avant = +x, sol y = 0, z = largeur (+z = côté droit). Aucun logo, aucune étoile, aucune marque.
 */
import { aide } from './aide_2.js';

/* ================================================================== outils de modelage (repris de v8_a / v5_europe) */

/** Courbe lisse passant par des clés [[x, v], …] (Hermite à tangentes de Catmull-Rom, bornée aux valeurs voisines). */
function courbe(cles) {
  const p = [...cles].sort((a, b) => a[0] - b[0]), n = p.length;
  if (n === 1) return () => p[0][1];
  const pente = (j) => { const a = p[Math.max(0, j - 1)], b = p[Math.min(n - 1, j + 1)]; return (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]); };
  return (x) => {
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[n - 1][0]) return p[n - 1][1];
    let i = 0; while (x > p[i + 1][0]) i++;
    const a = p[i], b = p[i + 1], h = b[0] - a[0], t = (x - a[0]) / h, t2 = t * t, t3 = t2 * t;
    const v = (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * pente(i) + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * h * pente(i + 1);
    const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]), m = (hi - lo) * 0.2;
    return Math.min(hi + m, Math.max(lo - m, v));
  };
}
/** Valeur constante ou clés → fonction de x. */
const fx = (v) => (typeof v === 'number' ? () => v : Array.isArray(v) ? courbe(v) : v);
/** Stations de loft échantillonnées aux abscisses xs à partir des courbes de profil { w, y0, y1, nt, nb, wt }. */
function stations(xs, c) {
  const F = {}; for (const k of ['w', 'y0', 'y1', 'nt', 'nb', 'wt']) F[k] = fx(c[k] ?? { nt: 2.6, nb: 3.4, wt: 1 }[k]);
  return xs.map((x) => ({ x, w: F.w(x), y0: F.y0(x), y1: F.y1(x), nt: F.nt(x), nb: F.nb(x), wt: F.wt(x) }));
}
/** Abscisses de x0 à x1 : pas régulier `pas`, plus des abscisses imposées, triées et dédoublonnées. */
function abscisses(x0, x1, pas, extra = []) {
  const xs = [...extra]; for (let x = x0; x <= x1 + 1e-9; x += pas) xs.push(+x.toFixed(4));
  xs.push(x0, x1); return [...new Set(xs.map((v) => +v.toFixed(4)))].filter((v) => v >= x0 - 1e-9 && v <= x1 + 1e-9).sort((p, q) => p - q);
}

/** Outils de surface exacts sur un loft (conicité `wt` du haut de section comprise). */
function surfaces(a) {
  /** Demi-largeur de la surface à la hauteur y (station interpolée en x). */
  const flanc = (st, x, y) => {
    const s = a.stAt(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.max(-0.9999, Math.min(0.9999, (y - yc) / hh));
    const n = yy >= 0 ? s.nt : s.nb, zz = Math.pow(1 - Math.pow(Math.abs(yy), n), 1 / n), k = yy > 0 ? 1 - (1 - s.wt) * yy : 1;
    return s.w * zz * k;
  };
  /** Hauteur du dessus de la surface à la position latérale z. */
  const haut = (st, x, z) => {
    const s = a.stAt(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, az = Math.abs(z);
    const zDe = (yy) => s.w * Math.pow(1 - Math.pow(yy, s.nt), 1 / s.nt) * (1 - (1 - s.wt) * yy);
    if (az >= zDe(0)) return yc;
    let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (zDe(m) > az) lo = m; else hi = m; }
    return yc + hh * lo;
  };
  /** Abscisse de la surface au point (y, z), vue de l'avant (sens +1) ou de l'arrière (−1) ; NaN hors silhouette. */
  const bout = (st, y, z, sens) => {
    const xa = st[0].x, xb = st[st.length - 1].x, dans = (x) => { const s = a.stAt(st, x); return y > s.y0 && y < s.y1 && flanc(st, x, y) >= Math.abs(z); };
    const pas = 0.03, n = Math.ceil((xb - xa) / pas);
    for (let i = 0; i <= n; i++) {
      const x = sens > 0 ? xb - i * pas : xa + i * pas;
      if (dans(x)) { let lo = x, hi = x + sens * pas; for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (dans(m)) lo = m; else hi = m; } return lo; }
    }
    return NaN;
  };
  return { flanc, haut, bout };
}

/** Nappe paramétrique (u, v) ∈ [0,1]² → [x, y, z] ; uv = (u, v) ; `garder` filtre les quadrilatères. */
function nappe(a, fn, nu, nv, mat, ordre = 2, garder = null) {
  const { THREE } = a, pos = [], uv = [], idx = [], ok = [];
  for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const p = fn(i / nu, k / nv); pos.push(...p); uv.push(i / nu, k / nv); ok.push(!garder || garder(...p)); }
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
    const p = i * (nv + 1) + k, q = (i + 1) * (nv + 1) + k;
    if (ok[p] && ok[q] && ok[p + 1] && ok[q + 1]) idx.push(p, q, p + 1, p + 1, q, q + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(a.garde(g), mat); m.renderOrder = ordre; return a.ajouter(m);
}

/** Canvas → texture sRGB. */
function texture(a, draw, cw, ch) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
  const t = a.garde(new a.THREE.CanvasTexture(cv)); t.encoding = a.THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
/** Matériau de décalque : 'peint' (verni), 'eclats' (métal nu brillant + peinture), 'lum' (feu), 'mat'. */
function matDecal(a, draw, cw, ch, genre = 'peint') {
  const { THREE } = a, map = texture(a, draw, cw, ch);
  const base = { map, transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false, envMap: a.envMap };
  if (genre === 'eclats') return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.34, metalness: 0.35, envMapIntensity: 0.7 }));
  if (genre === 'lum') return a.garde(new THREE.MeshBasicMaterial({ ...base, envMap: null, toneMapped: false }));
  if (genre === 'mat') return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0, envMapIntensity: 0.4 }));
  return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.12 }));
}

/**
 * Décalques drapés EXACTEMENT sur un loft (cf. v8_a) :
 * cote(st, x0, x1, yb, yt, dessin(g, X, Y, sg, w, h), …) sur les deux flancs (côté −z : X inversé, lecture à l'endroit) ;
 * dessus(st, x0, x1, z0, z1, dessin(g, X, Z, w, h), …) vu de dessus, nez à droite ;
 * face(st, sens, z0, z1, yb, yt, dessin(g, Z, Y, w, h), …) face avant (+1) ou arrière (−1).
 * `roues` : aucun quadrilatère de décalque dans un passage de roue.
 */
function drapes(a, S) {
  const horsRoues = (R, k = 1.16) => (R ? (x, y) => R.every((r) => Math.hypot(x - r.x, y - (r.y ?? r.RW)) > r.RW * k + 0.04) : null);
  const cote = (st, x0, x1, yb, yt, dessin, { cw = 2048, ch = 512, eps = 0.016, genre = 'peint', nu = 160, nv = 34, roues = null } = {}) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb), r = [], hr = horsRoues(roues);
    // jamais au-dessus du dessus (ni sous le dessous) de la section : sinon la nappe se replie en voile vertical au centre
    const dansSection = (x, y) => { const s = a.stAt(st, x); return y <= s.y1 + 1e-3 && y >= s.y0 - 1e-3; };
    for (const sg of [1, -1]) {
      const X = (x) => (sg > 0 ? x - x0 : x1 - x) * sx, Y = (y) => (yt - y) * sy;
      const mat = matDecal(a, (g, w, h) => dessin(g, X, Y, sg, w, h), cw, ch, genre);
      r.push(nappe(a, (u, v) => {
        const x = sg > 0 ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u, y = yb + (yt - yb) * v;
        return [x, y, sg * (S.flanc(st, x, y) + eps)];
      }, nu, nv, mat, 2, (x, y) => dansSection(x, y) && (!hr || hr(x, y))));
      r[r.length - 1].userData.decal = true;
    }
    return r;
  };
  const dessus = (st, x0, x1, z0, z1, dessin, { cw = 1024, ch = 512, eps = 0.016, genre = 'peint', nu = 110, nv = 60, roues = null } = {}) => {
    const sx = cw / (x1 - x0), sz = ch / (z1 - z0), X = (x) => (x - x0) * sx, Z = (z) => (z - z0) * sz;
    const mat = matDecal(a, (g, w, h) => dessin(g, X, Z, w, h), cw, ch, genre);
    const m = nappe(a, (u, v) => { const x = x0 + (x1 - x0) * u, z = z1 - (z1 - z0) * v; return [x, S.haut(st, x, z) + eps, z]; }, nu, nv, mat, 2, horsRoues(roues));
    m.userData.decal = true; return m;
  };
  const face = (st, sens, z0, z1, yb, yt, dessin, { cw = 1024, ch = 512, eps = 0.012, genre = 'peint', nu = 90, nv = 60, xLim = null } = {}) => {
    const lim = xLim ?? (sens > 0 ? st[st.length - 1].x - 0.7 : st[0].x + 0.7);
    const sz = cw / (z1 - z0), sy = ch / (yt - yb), Z = (z) => (sens > 0 ? z1 - z : z - z0) * sz, Y = (y) => (yt - y) * sy;
    const mat = matDecal(a, (g, w, h) => dessin(g, Z, Y, w, h), cw, ch, genre);
    const m = nappe(a, (u, v) => {
      const z = sens > 0 ? z1 - u * (z1 - z0) : z0 + u * (z1 - z0), y = yb + v * (yt - yb), x = S.bout(st, y, z, sens);
      return [Number.isFinite(x) ? x + sens * eps : NaN, y, z];
    }, nu, nv, mat, 2, (x) => Number.isFinite(x) && (sens > 0 ? x > lim : x < lim));
    const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (!Number.isFinite(p.getX(i))) p.setX(i, 0);
    p.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); m.userData.decal = true; return m;
  };
  return { cote, dessus, face };
}

/** Polygone (points monde [x, y]) rempli sur un canvas de décalque. */
function poly(g, X, Y, pts, couleur) {
  g.fillStyle = couleur; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fill();
}
/** Trait (polyligne monde) sur un canvas de décalque. */
function trait(g, X, Y, pts, couleur, l) {
  g.strokeStyle = couleur; g.lineWidth = l; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke();
}
/** Texte centré (cx, cy) en pixels canvas, contour optionnel `trait` { l, c }. */
function texte(g, t, cx, cy, police, couleur, trait) {
  g.save(); g.translate(cx, cy); g.font = police; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (trait) { g.lineJoin = 'round'; g.lineWidth = trait.l; g.strokeStyle = trait.c; g.strokeText(t, 0, 0); }
  g.fillStyle = couleur; g.fillText(t, 0, 0); g.restore();
}
/** Pièce orientée entre deux points 3D (boîte ou cylindre). */
function poutre(a, p, q, ep, prof, mat, cylindre = false) {
  const { THREE } = a, A = new THREE.Vector3(...p), B = new THREE.Vector3(...q), d = B.clone().sub(A), L = d.length();
  const g = cylindre ? new THREE.CylinderGeometry(ep, ep, L, 12) : new THREE.BoxGeometry(ep, L, prof);
  const m = new THREE.Mesh(a.garde(g), mat); m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return a.ajouter(m);
}
/** Tube lisse le long d'une courbe passant par des points 3D. */
function tuyau(a, pts, r, mat, seg = 48, rad = 10, ferme = false) {
  const { THREE } = a, c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), ferme);
  return a.ajouter(new THREE.Mesh(a.garde(new THREE.TubeGeometry(c, seg, r, rad, ferme)), mat));
}
/** Prisme : contour plan (x, y) extrudé en z de z0 à z1. */
function prisme(a, pts, z0, z1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(z1 - z0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, Math.min(z0, z1)); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}
/** Prisme vu de face : contour (z, y) extrudé en x de x0 vers x1. */
function prismeX(a, ptsZY, x0, x1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); ptsZY.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(x1 - x0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2); g.translate(Math.max(x0, x1), 0, 0); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}
/** Plaque vue de dessus : contour (x, z) extrudé en y de y0 à y1. */
function plaqueY(a, ptsXZ, y0, y1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); ptsXZ.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(y1 - y0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, Math.min(y0, y1), 0); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}
/** Passages de roues : arche ronde à jeu constant, découpée seulement à l'extérieur de la face interne du pneu. */
const archesJeu = (R, jeu = 0.14) => R.map((r) => ({ x: r.x, R: r.RW + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.03 }));
/** Roue posée : pneu dont la face extérieure affleure la demi-largeur `zExt`. */
const roue = (x, RW, ep, zExt, avant, extra = {}) => ({ x, RW, ep, z: zExt - ep / 2, y: RW, avant, ...extra });

/** Générateur pseudo-aléatoire à graine (mulberry32) : éclats identiques à chaque construction. */
function hasard(graine) {
  let s = graine >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * ALLÈGEMENT (V9c, « tout lague ») : fusionne toutes les pièces d'un même matériau en UN maillage (un seul appel de dessin).
 * Les transformations des pièces sont intégrées aux sommets, exprimées dans le repère de `racine` (déterminant négatif =
 * miroir : l'ordre des sommets est retourné pour garder les faces visibles). Position, normale et UV (si le matériau a une
 * texture) sont conservées, l'index aussi (aucun sommet dupliqué). Laissés tels quels :
 *   - les pièces sous un groupe marqué userData.pivot (ailes, dérive… : elles bougent ou disparaissent seules) ;
 *   - les pièces dont `garder(mesh)` est vrai (feux : la cinématique y pose ses halos à leur position propre) ;
 *   - les matériaux portés par une seule pièce (rien à gagner).
 * À appeler APRÈS degager (qui recoupe les passages de roues pièce par pièce). Rend le nombre de maillages retirés.
 */
function fusionnerParMateriau(a, racine, { garder = () => false } = {}) {
  const { THREE } = a;
  racine.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(racine.matrixWorld).invert(), M = new THREE.Matrix4(), paquets = new Map();
  const visite = (o) => {
    for (const c of o.children) {
      if (c.userData && c.userData.pivot && c !== racine) continue;
      if (c.isMesh && !Array.isArray(c.material) && c.geometry && c.geometry.attributes.position && !garder(c)) {
        const k = c.material.uuid + '|' + c.renderOrder + '|' + (c.visible ? 1 : 0);
        if (!paquets.has(k)) paquets.set(k, []);
        paquets.get(k).push(c);
      }
      visite(c);
    }
  };
  visite(racine);
  let retires = 0;
  for (const ms of paquets.values()) {
    if (ms.length < 2) continue;
    const mat = ms[0].material, avecUV = !!mat.map && ms.every((m) => m.geometry.attributes.uv);
    let nV = 0, nI = 0;
    const parts = ms.map((m) => {
      const g = m.geometry, n = g.attributes.position.count, idx = g.index ? g.index.array : null;
      nV += n; nI += idx ? idx.length : n;
      M.multiplyMatrices(inv, m.matrixWorld);
      return { g, n, idx, M: M.clone(), miroir: M.determinant() < 0 };
    });
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = avecUV ? new Float32Array(nV * 2) : null;
    const index = nV > 65535 ? new Uint32Array(nI) : new Uint16Array(nI);
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    let oV = 0, oI = 0;
    for (const p of parts) {
      const P = p.g.attributes.position, N = p.g.attributes.normal, U = p.g.attributes.uv;
      nm.getNormalMatrix(p.M);
      for (let i = 0; i < p.n; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(p.M); pos[(oV + i) * 3] = v.x; pos[(oV + i) * 3 + 1] = v.y; pos[(oV + i) * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(oV + i) * 3] = v.x; nor[(oV + i) * 3 + 1] = v.y; nor[(oV + i) * 3 + 2] = v.z; }
        if (uv) { uv[(oV + i) * 2] = U.getX(i); uv[(oV + i) * 2 + 1] = U.getY(i); }
      }
      const m = p.idx ? p.idx.length : p.n;
      for (let i = 0; i < m; i += 3) {
        const i0 = p.idx ? p.idx[i] : i, i1 = p.idx ? p.idx[i + 1] : i + 1, i2 = p.idx ? p.idx[i + 2] : i + 2;
        index[oI + i] = oV + i0; index[oI + i + 1] = oV + (p.miroir ? i2 : i1); index[oI + i + 2] = oV + (p.miroir ? i1 : i2);
      }
      oV += p.n; oI += m;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(index, 1)); g.computeBoundingBox(); g.computeBoundingSphere();
    // une pièce sans normales (rare) : on les recalcule sur l'ensemble
    if (parts.some((p) => !p.g.attributes.normal)) g.computeVertexNormals();
    const f = new THREE.Mesh(a.garde(g), mat); f.renderOrder = ms[0].renderOrder; f.visible = ms[0].visible;
    f.userData = Object.assign({}, ...ms.map((m) => m.userData)); f.name = 'fusion-' + (mat.name || mat.type);
    for (const m of ms) { m.parent.remove(m); m.geometry.dispose(); retires++; }
    racine.add(f); retires--;
  }
  // groupes vidés par la fusion (hors pivots) : retirés du graphe
  const vides = []; racine.traverse((o) => { if (o !== racine && !o.isMesh && !(o.userData && o.userData.pivot) && !o.isLight && o.children.length === 0 && o.type === 'Group') vides.push(o); });
  for (const o of vides) o.parent.remove(o);
  return retires;
}

/**
 * Coque lisse de superellipses (même surface que `loft` d'aide_2, arches de roues comprises), dont on peut RETIRER des
 * triangles : `garder(x, y, z)` (centre du triangle) → false = trou (baie vitrée, hayon perdu). `inverse` : coque vue de
 * l'intérieur (faces retournées) pour les volumes intérieurs.
 */
function coque(a, stIn, mat, { nx = 200, ns = 112, arches = [], garder = null, inverse = false, ordre = 0 } = {}) {
  const { THREE } = a, x0 = stIn[0].x, x1 = stIn[stIn.length - 1].x, pos = [], tris = [];
  const sec = (s, t) => {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb, yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * k, yc + hh * yy];
  };
  const s0 = a.stAt(stIn, x0), s1 = a.stAt(stIn, x1);
  pos.push(x0, (s0.y0 + s0.y1) / 2, 0);                                               // centre de la face arrière
  for (let j = 0; j < nx; j++) {
    const u = (1 - Math.cos(Math.PI * j / (nx - 1))) / 2, x = x0 + (x1 - x0) * u, s = a.stAt(stIn, x);
    for (let k = 0; k < ns; k++) {
      const [z, y0] = sec(s, k / ns * 2 * Math.PI); let y = y0;
      for (const ar of arches) {
        const dx = Math.abs(x - ar.x);
        if (dx < ar.R && Math.abs(z) > ar.zin) { const ya = Math.min(ar.y + Math.sqrt(ar.R * ar.R - dx * dx), s.y1 - 0.06); if (y < ya) y = ya; }
      }
      pos.push(x, y, z);
    }
  }
  pos.push(x1, (s1.y0 + s1.y1) / 2, 0);                                               // centre de la face avant
  const V = (j, k) => 1 + j * ns + ((k + ns) % ns), fin = 1 + nx * ns;
  for (let k = 0; k < ns; k++) tris.push([0, V(0, k), V(0, k + 1)]);
  for (let j = 0; j < nx - 1; j++) for (let k = 0; k < ns; k++) { const p = V(j, k), q = V(j, k + 1), r = V(j + 1, k), t = V(j + 1, k + 1); tris.push([p, r, q], [q, r, t]); }
  for (let k = 0; k < ns; k++) tris.push([fin, V(nx - 1, k + 1), V(nx - 1, k)]);
  // orientation : volume signé positif (normales sortantes), puis retournement éventuel pour une coque intérieure
  let vol = 0;
  for (const [i, j, k] of tris) {
    const A = i * 3, B = j * 3, C = k * 3;
    vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
  }
  const retourner = (vol < 0) !== inverse, idx = [];
  for (const [i, j, k] of tris) {
    if (garder) {
      const cx = (pos[i * 3] + pos[j * 3] + pos[k * 3]) / 3, cy = (pos[i * 3 + 1] + pos[j * 3 + 1] + pos[k * 3 + 1]) / 3, cz = (pos[i * 3 + 2] + pos[j * 3 + 2] + pos[k * 3 + 2]) / 3;
      if (!garder(cx, cy, cz)) continue;
    }
    if (retourner) idx.push(i, k, j); else idx.push(i, j, k);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(a.garde(g), mat); m.renderOrder = ordre; return a.ajouter(m);
}

/**
 * Éclat de peinture : tache irrégulière (contour à 8–12 lobes, bord légèrement sombre = épaisseur de la laque arrachée,
 * reflet clair au centre), plus 0 à 3 « satellites ». Le contour est généré en coordonnées MONDE (u, v) à partir de la graine
 * de l'éclat : deux décalques voisins (caisse / serre) dessinent exactement la même tache de part et d'autre de leur jointure.
 */
function eclat(g, U, V, e) {
  const r = hasard(e.graine), formes = [[e.u, e.v, e.r]];
  for (let i = Math.floor(r() * 4); i > 0; i--) { const t = r() * 6.283, d = e.r * (1.1 + r() * 0.9); formes.push([e.u + Math.cos(t) * d, e.v + Math.sin(t) * d, e.r * (0.18 + r() * 0.3)]); }
  const echelle = Math.abs(U(1) - U(0));
  for (const [u, v, rr] of formes) {
    const n = 8 + Math.floor(r() * 5), pts = [], etire = 0.65 + r() * 0.7, rot = r() * 3.14;
    for (let i = 0; i < n; i++) {
      const t = i / n * 6.283 + (r() - 0.5) * 0.35, k = rr * (0.5 + r() * 0.65), cu = Math.cos(t) * k, cv = Math.sin(t) * k * etire;
      pts.push([U(u + cu * Math.cos(rot) - cv * Math.sin(rot)), V(v + cu * Math.sin(rot) + cv * Math.cos(rot))]);
    }
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (i === 0) g.moveTo(m[0], m[1]); else g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    g.closePath();
    g.fillStyle = e.c; g.fill();
    g.lineWidth = Math.max(1.5, rr * echelle * 0.1); g.strokeStyle = 'rgba(8,14,12,0.7)'; g.stroke();
    g.fillStyle = 'rgba(255,255,250,0.35)'; g.beginPath(); g.ellipse(U(u) - rr * echelle * 0.12, V(v) - rr * echelle * 0.1, rr * echelle * 0.32, rr * echelle * 0.2, rot, 0, 6.283); g.fill();
  }
}
/** Sème des éclats le long de polylignes monde [[u, v], …] : `pas` moyen entre deux éclats, rayon dans [r0, r1], écart `jit`. */
function semer(liste, r, lignes, { pas = 0.22, r0 = 0.035, r1 = 0.11, jit = 0.04 } = {}) {
  for (const L of lignes) for (let i = 0; i < L.length - 1; i++) {
    const [u0, v0] = L[i], [u1, v1] = L[i + 1], d = Math.hypot(u1 - u0, v1 - v0);
    for (let t = r() * pas; t < d; t += pas * (0.55 + r() * 0.9)) {
      const k = t / d, rr = r0 + (r1 - r0) * Math.pow(r(), 1.6);
      liste.push({ u: u0 + (u1 - u0) * k + (r() - 0.5) * 2 * jit, v: v0 + (v1 - v0) * k + (r() - 0.5) * 2 * jit, r: rr, c: r() < 0.55 ? '#d8d8d0' : '#b9bcc0', graine: Math.floor(r() * 1e9) });
    }
  }
  return liste;
}

/* ================================================================== N12 : Mercedes-Benz Classe B Majorette « L'Épave » */
/**
 * Cotes réelles (silhouette W168) : L 3 575 / l 1 719 / h 1 575 mm, empattement 2 423 ; porte-à-faux avant 0,66 m, arrière
 * 0,49 m. Échelle 2,0 u/m → L 7,14 ; empattement 4,85 ; demi-largeur 1,67 ; pavillon 3,15. Roues de jouet Majorette
 * (R 0,56 : un peu plus petites que nature, comme sur la miniature).
 */
function epave(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx;
  const a = aide(ctx); a.garde = ctx.garde; a.envMap = ctx.envMap; a.THREE = THREE;
  const S = surfaces(a), D = drapes(a, S);
  // matériaux : vert bouteille très foncé BRILLANT (laque vernie clearcoat 1), noir mat, gris d'habitacle, métal nu
  const vert = a.pein('#1d2b26', 0.16); vert.clearcoatRoughness = 0.04; vert.envMapIntensity = 0.6;
  const noir = a.mate('#0d0f0f', 0.85, 0.1), dark = a.mate('#060707', 0.9, 0.1), noirBrillant = a.mate('#121414', 0.35, 0.3);
  const gris = a.mate('#5d6063', 0.8, 0.12), grisFonce = a.mate('#4e5154', 0.82, 0.1), grisClair = a.mate('#989b9e', 0.72, 0.15);
  const metalNu = a.mate('#b9bcc0', 0.32, 0.85);
  const grisInt = a.garde(new THREE.MeshStandardMaterial({ color: a.lin('#6c6f72'), roughness: 0.85, metalness: 0.1, envMap: a.envMap, envMapIntensity: 0.4 }));   // faces déjà retournées par coque(…, { inverse: true })
  const verreTrouble = a.garde(new THREE.MeshPhysicalMaterial({
    map: texture(a, (g, w, h) => {                                                     // verre clair mais terni et rayé (jouet qui a vécu)
      g.fillStyle = 'rgba(150,166,176,0.16)'; g.fillRect(0, 0, w, h);
      const r = hasard(1212);
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(225,230,232,${0.03 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * w, r() * h, 30 + r() * 120, 15 + r() * 60, r() * 3, 0, 6.283); g.fill(); }
      for (let i = 0; i < 90; i++) {
        g.strokeStyle = `rgba(240,244,246,${0.12 + r() * 0.22})`; g.lineWidth = 0.8 + r() * 1.4;
        const x = r() * w, y = r() * h, t = r() * 3.14, l = 20 + r() * 140; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(t) * l * 0.5 + (r() - 0.5) * 20, y + Math.sin(t) * l * 0.5, x + Math.cos(t) * l, y + Math.sin(t) * l); g.stroke();
      }
    }, 1024, 512),
    transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.2, envMap: a.envMap, envMapIntensity: 0.25,
  }));

  /* ---------------------------------------------------------------- roues : jantes Majorette crème à 8 trous, pneus fins */
  const RW = 0.56, ep = 0.38, xA = 2.42, xR = -2.43, wAile = 1.67;
  const optR = { jante: '#ece4cc', rayons: 'rallye', levre: 0.02, etrier: '#2b2d2f' };   // jouet : pas d'étrier rouge derrière les trous
  const R = [roue(xA, RW, ep, wAile + 0.005, true, optR), roue(xR, RW, ep, wAile + 0.005, false, optR)];

  /* ---------------------------------------------------------------- caisse basse (jusqu'à la ceinture) et capot plongeant */
  const ST = stations(abscisses(-3.40, 3.74, 0.1, [-3.37, -3.33, 3.66, 3.71]), {
    y1: [[-3.40, 1.7], [-3.37, 1.98], [-3.3, 2.1], [-2.6, 2.12], [-1.0, 2.08], [0.8, 2.05], [2.3, 2.04], [2.6, 2.02], [2.9, 1.93], [3.2, 1.82], [3.5, 1.68], [3.64, 1.56], [3.71, 1.4], [3.74, 1.2]],
    y0: [[-3.40, 0.62], [-3.3, 0.42], [-3.0, 0.34], [3.2, 0.34], [3.6, 0.44], [3.74, 0.62]],
    w: [[-3.40, 1.34], [-3.36, 1.5], [-3.25, 1.6], [-2.9, 1.65], [-2.43, wAile], [0, 1.665], [2.42, wAile], [2.95, 1.64], [3.35, 1.55], [3.6, 1.4], [3.74, 1.16]],
    nt: [[-3.4, 5], [3.0, 5], [3.74, 3.2]], nb: 4.5, wt: 0.96,
  });
  // trou du hayon dans la caisse : seuil de chargement à y = 1,34, tôle du coffre ouverte au-dessus (parois latérales gardées)
  const yLevre = 1.34, zBaie = 1.18;
  const hayonCaisse = (x, y, z) => !(x < -2.38 && y > yLevre && (Math.abs(z) < zBaie || (x > -3.25 && Math.abs(z) < 1.52 && y > 1.9)));
  coque(a, ST, vert, { arches: archesJeu(R, 0.08), garder: hayonCaisse, nx: 120, ns: 84 });   // V9c : résolution allégée (aspect identique à distance de TV)
  a.puits(R, dark);

  /* ---------------------------------------------------------------- serre : pare-brise très couché, toit long et plat */
  const STg = stations(abscisses(-3.38, 2.72, 0.08, [-3.34, -3.28]), {
    y1: [[-3.38, 2.82], [-3.33, 2.98], [-3.2, 3.07], [-2.8, 3.12], [-1.5, 3.15], [0.0, 3.15], [0.4, 3.14], [0.7, 3.1], [1.0, 3.02], [1.5, 2.8], [2.0, 2.5], [2.5, 2.18], [2.72, 2.0]],
    y0: 1.3,
    w: [[-3.38, 1.4], [-3.3, 1.55], [-3.1, 1.62], [0.0, 1.635], [1.5, 1.625], [2.3, 1.6], [2.72, 1.5]],
    nt: 4.2, nb: 7, wt: 0.8,
  });
  const sg_ = (x) => a.stAt(STg, x);
  /** Baies vitrées (pare-brise, glaces latérales, custodes) : vrai si le point de la serre est dans une vitre. */
  const kLat = 0.74, yBas = 2.12, xPbH = 0.62, xPbB = 2.56;                                         // bord latéral du pare-brise, ceinture, haut / bas du pare-brise
  // glaces latérales [x arrière, x avant, retrait sous le pavillon]
  const GLACES = [[-0.28, 1.8, 0.31], [1.92, 2.45, 0.31], [-2.22, -0.5, 0.31], [-3.08, -2.48, 0.38]];
  const vitre = (x, y, z) => {
    const s = sg_(x), az = Math.abs(z), lat = az > s.w * kLat;
    if (!lat) return x > xPbH && x < xPbB && y > 2.0;                                                // pare-brise
    if (y <= yBas) return false;
    return GLACES.some(([x0, x1, d]) => x > x0 && x < x1 && y < s.y1 - d);                          // glaces avant, déflecteur, arrière, custode
  };
  const hayonSerre = (x, y, z) => x < -2.98 && Math.abs(z) < zBaie && y > yLevre && y < 2.97;
  coque(a, STg, vert, { garder: (x, y, z) => !vitre(x, y, z) && !hayonSerre(x, y, z), nx: 170, ns: 116 });
  coque(a, STg, verreTrouble, { garder: (x, y, z) => vitre(x, y, z) && !hayonSerre(x, y, z), ordre: 3, nx: 170, ns: 116 });
  // joints noirs des baies : recouvrent le crénelage de la découpe et dessinent les cadres comme sur la miniature
  {
    const joint = (pts) => tuyau(a, pts, 0.026, noirBrillant, Math.max(24, Math.round(pts.length * 1.5)), 6, true);
    for (const sg of [-1, 1]) for (const [x0, x1, d] of GLACES) {
      const pts = [], xs = []; for (let i = 0; i <= 24; i++) xs.push(x0 + (x1 - x0) * i / 24);
      const yH = (x) => Math.max(yBas, sg_(x).y1 - d), P = (x, y) => [x, y, sg * (S.flanc(STg, x, y) + 0.004)];
      const xv = xs.filter((x) => yH(x) > yBas + 0.02);
      if (xv.length < 2) continue;
      for (const x of xv) pts.push(P(x, yBas + 0.005));                                              // bas de glace (ceinture)
      for (const x of [...xv].reverse()) pts.push(P(x, yH(x)));                                      // haut de glace (sous la gouttière)
      joint(pts);
    }
    // pare-brise : montants A (bord latéral), traverse haute sous le pavillon, baie basse sur l'auvent
    const pts = [], n = 22, zA = (x) => sg_(x).w * kLat * 0.995;
    const sur = (x, z) => [x, S.haut(STg, x, z) + 0.008, z];
    for (let i = 0; i <= n; i++) { const x = xPbH + (xPbB - xPbH) * i / n; pts.push(sur(x, zA(x))); }
    for (let i = 1; i < n; i++) { const z = zA(xPbB) * (1 - 2 * i / n); pts.push(sur(xPbB, z)); }
    for (let i = n; i >= 0; i--) { const x = xPbH + (xPbB - xPbH) * i / n; pts.push(sur(x, -zA(x))); }
    for (let i = 1; i < n; i++) { const z = -zA(xPbH) * (1 - 2 * i / n); pts.push(sur(xPbH, z)); }
    joint(pts);
  }

  /* ---------------------------------------------------------------- habitacle et coffre (vus par les vitres et le hayon béant) */
  // « pièce » intérieure : coque vue de l'intérieur (plancher de coffre, parois, pavillon intérieur gris)
  const STi = stations(abscisses(-3.3, 2.5, 0.1), {
    y1: (x) => a.stAt(STg, x).y1 - 0.08, y0: yLevre - 0.02, w: (x) => a.stAt(STg, x).w - 0.09, nt: 4.2, nb: 7, wt: 0.8,
  });
  coque(a, STi, grisInt, { inverse: true, nx: 60, ns: 44 });
  // plancher d'habitacle (masque le dessus vert de la caisse vu par les vitres), planche de bord, sièges, volant
  plaqueY(a, [[-2.38, -1.42], [1.6, -1.38], [2.4, -1.15], [2.4, 1.15], [1.6, 1.38], [-2.38, 1.42]], 2.04, 2.08, grisFonce);
  prisme(a, [[1.25, 2.06], [2.42, 2.06], [2.08, 2.28], [1.25, 2.4]], -1.1, 1.1, grisFonce, 0.02);
  for (const z of [-0.62, 0.62]) {
    a.boite(0.62, 0.16, 0.6, gris, 0.42, 2.16, z);                                                     // assise
    const dos = a.boite(0.16, 0.72, 0.58, gris, 0.0, 2.52, z); dos.rotation.z = 0.16;                 // dossier incliné
    a.boite(0.12, 0.18, 0.34, grisClair, -0.12, 2.96, z).rotation.z = 0.16;                            // appui-tête
  }
  const volant = new THREE.Mesh(a.garde(new THREE.TorusGeometry(0.2, 0.035, 10, 32)), noirBrillant);
  volant.position.set(1.12, 2.52, -0.62); volant.rotation.set(0, Math.PI / 2, 0.5); a.ajouter(volant);  // poste de conduite à gauche
  poutre(a, [1.6, 2.32, -0.62], [1.14, 2.51, -0.62], 0.04, 0, noirBrillant, true);
  // banquette arrière : deux dossiers (séparation 60/40), appuis-tête ; ils ferment le coffre côté habitacle
  for (const [z0, z1] of [[-1.3, -0.04], [0.04, 1.3]]) {
    prisme(a, [[-2.4, yLevre - 0.02], [-2.2, yLevre - 0.02], [-2.14, 2.74], [-2.3, 2.76]], z0, z1, gris, 0.02);
    a.boite(0.1, 0.18, 0.34, grisClair, -2.25, 2.86, (z0 + z1) / 2);
  }
  a.boite(0.6, 0.16, 2.5, gris, -1.85, 2.16, 0);                                                       // assise arrière
  // passages de roues intérieurs (bosses du coffre) et plancher de coffre en tôle grise
  for (const sg of [-1, 1]) {
    a.cyl(0.44, 0.44, 0.3, grisFonce, -2.62, yLevre - 0.02, sg * 1.12, Math.PI / 2, 0, 28);
  }
  plaqueY(a, [[-3.32, -1.22], [-2.38, -1.26], [-2.38, 1.26], [-3.32, 1.22]], yLevre - 0.03, yLevre + 0.005, gris);
  for (let i = 0; i < 4; i++) a.boite(0.86, 0.02, 0.06, grisClair, -2.86, yLevre + 0.01, -0.75 + i * 0.5);   // nervures du plancher

  /* ---------------------------------------------------------------- bords de tôle à nu, cabossés, autour du hayon perdu */
  {
    const r = hasard(3141), j = (k = 0.025) => (r() - 0.5) * 2 * k, pts = [];
    const xArr = (y, z) => { const p = S.bout(ST, y, z, -1), q = S.bout(STg, y, z, -1); return Math.min(Number.isFinite(p) ? p : 0, Number.isFinite(q) ? q : 0); };
    const zc = zBaie + 0.02;
    for (let i = 0; i <= 8; i++) { const y = yLevre + 0.02 + (2.95 - yLevre) * i / 8; pts.push([xArr(y, -zc) + j(), y + j(0.015), -zc + j()]); }
    for (let i = 1; i < 10; i++) { const z = -zc + 2 * zc * i / 10; pts.push([xArr(2.95, z) + j() + 0.01, 2.96 + j(0.02), z]); }
    for (let i = 8; i >= 0; i--) { const y = yLevre + 0.02 + (2.95 - yLevre) * i / 8; pts.push([xArr(y, zc) + j(), y + j(0.015), zc + j()]); }
    for (let i = 9; i > 0; i--) { const z = -zc + 2 * zc * i / 10; pts.push([xArr(yLevre + 0.02, z) + j(0.015), yLevre + 0.02 + j(0.02), z]); }
    tuyau(a, pts, 0.04, metalNu, 120, 6, true);
    // charnières de hayon arrachées (pattes de tôle tordues sous le bord de toit)
    for (const sg of [-1, 1]) { const x = xArr(2.9, sg * 0.75); poutre(a, [x + 0.04, 2.95, sg * 0.75], [x - 0.03, 2.78, sg * 0.78], 0.05, 0.1, metalNu); }
  }

  /* ---------------------------------------------------------------- éclats de peinture des flancs (mêmes taches sur caisse et serre) */
  const eclatsFlanc = (sg) => {
    const r = hasard(sg > 0 ? 7001 : 7919), L = [];
    const arc = (cx, cy, rad, a0, a1) => { const p = []; for (let i = 0; i <= 10; i++) { const t = a0 + (a1 - a0) * i / 10; p.push([cx + Math.cos(t) * rad, cy + Math.sin(t) * rad]); } return p; };
    for (const w of R) semer(L, r, [arc(w.x, RW, RW + 0.16, 0.15, Math.PI - 0.15)], { pas: 0.2, r0: 0.04, r1: 0.12 });   // lèvres d'ailes
    semer(L, r, [[[-3.25, 0.58], [-1.9, 0.6]], [[-1.1, 0.6], [1.8, 0.6]], [[3.0, 0.6], [3.6, 0.62]]], { pas: 0.34, r0: 0.03, r1: 0.09 });   // bas de portes
    semer(L, r, [[[-3.3, 2.12], [1.9, 2.05]]], { pas: 0.42, r0: 0.03, r1: 0.1, jit: 0.03 });                                // ceinture
    semer(L, r, [[[3.66, 0.7], [3.6, 1.55]], [[-3.33, 0.7], [-3.33, 2.8]]], { pas: 0.2, r0: 0.04, r1: 0.12 });            // coins avant / arrière
    semer(L, r, [[[2.55, 1.92], [1.9, 2.24], [1.2, 2.6], [0.62, 2.84]], [[0.4, 2.86], [-3.2, 2.84]]], { pas: 0.3, r0: 0.03, r1: 0.09, jit: 0.03 });   // montant A, gouttière de toit
    semer(L, r, [[[-0.39, 2.15], [-0.39, 2.8]], [[-2.35, 2.15], [-2.35, 2.78]], [[-3.15, 2.1], [-3.15, 2.75]]], { pas: 0.22, r0: 0.03, r1: 0.08, jit: 0.025 });   // montants B, C, D
    semer(L, r, [[[-0.39, 0.7], [-0.39, 2.0]], [[1.87, 0.75], [1.87, 2.0]]], { pas: 0.4, r0: 0.03, r1: 0.07, jit: 0.03 });   // arêtes de portes
    for (let i = 0; i < 7; i++) L.push({ u: -3.2 + r() * 6.8, v: 0.7 + r() * 1.35, r: 0.025 + r() * 0.05, c: r() < 0.5 ? '#d8d8d0' : '#b9bcc0', graine: Math.floor(r() * 1e9) });   // taches isolées
    return L;
  };
  const E = { 1: eclatsFlanc(1), [-1]: eclatsFlanc(-1) };
  const peauFlanc = (g, X, Y, sg) => {
    // bas de caisse noir mat
    poly(g, X, Y, [[3.5, 0.3], [3.5, 0.5], [-3.25, 0.5], [-3.25, 0.3]], '#0b0d0d');
    // lignes d'ouvrants : porte avant, porte arrière (contournant l'arche), joints de vitres
    const l = Math.max(2.5, Math.abs(X(1) - X(0)) * 0.009), c = 'rgba(2,6,5,0.85)';
    trait(g, X, Y, [[1.9, 0.56], [1.88, 2.06]], c, l);
    trait(g, X, Y, [[-0.4, 0.56], [-0.4, 2.98]], c, l);
    trait(g, X, Y, [[-2.36, 2.95], [-2.34, 1.42], [-2.1, 1.22], [-1.86, 0.92], [-1.78, 0.56]], c, l);
    trait(g, X, Y, [[1.9, 0.56], [-1.78, 0.56]], c, l * 0.8);
    // nervure de flanc (ligne de caractère qui remonte vers l'arrière) et poignées
    trait(g, X, Y, [[3.3, 1.52], [1.0, 1.58], [-1.5, 1.66], [-3.2, 1.72]], 'rgba(4,10,8,0.45)', l * 1.1);
    for (const x of [0.15, -1.95]) { poly(g, X, Y, [[x, 1.8], [x - 0.3, 1.8], [x - 0.3, 1.88], [x, 1.88]], '#0a100e'); poly(g, X, Y, [[x - 0.02, 1.86], [x - 0.28, 1.86], [x - 0.28, 1.88], [x - 0.02, 1.88]], 'rgba(160,190,175,0.35)'); }
    if (sg > 0) { g.strokeStyle = c; g.lineWidth = l; g.strokeRect(X(-2.78), Y(2.0), X(-3.06) - X(-2.78), Y(1.8) - Y(2.0)); }   // trappe à carburant (côté droit)
    for (const e of E[sg]) eclat(g, X, Y, e);
  };
  const ySplit = 1.76;
  D.cote(ST, -3.40, 3.74, 0.3, ySplit, peauFlanc, { cw: 2600, ch: Math.round(2600 * (ySplit - 0.3) / 7.14), roues: R, genre: 'eclats', eps: 0.02, nu: 136, nv: 30 });   // grille fine : les éclats des lèvres d'ailes restent entiers au ras des arches
  D.cote(STg, -3.38, 2.72, ySplit - 0.02, 3.16, (g, X, Y, sg) => {
    for (const e of E[sg]) if (e.v < a.stAt(STg, e.u).y1 - 0.16) eclat(g, X, Y, e);   // jamais sur le pavillon ni le pare-brise (drapé trop étiré)
  }, { cw: 2200, ch: Math.round(2200 * (3.18 - ySplit) / 6.1), genre: 'eclats', eps: 0.014,
    roues: null, nu: 84, nv: 20 });

  /* ---------------------------------------------------------------- éclats du toit (arêtes de pavillon, bord arrière) */
  {
    const r = hasard(4242), L = [];
    semer(L, r, [[[0.5, -1.08], [-3.3, -1.1]], [[0.5, 1.08], [-3.3, 1.1]]], { pas: 0.2, r0: 0.035, r1: 0.12, jit: 0.06 });
    semer(L, r, [[[-3.25, -1.05], [-3.25, 1.05]], [[0.42, -0.9], [0.42, 0.9]]], { pas: 0.24, r0: 0.03, r1: 0.1, jit: 0.04 });
    for (let i = 0; i < 9; i++) L.push({ u: -3.0 + r() * 3.3, v: -0.9 + r() * 1.8, r: 0.02 + r() * 0.04, c: '#c9cbc8', graine: Math.floor(r() * 1e9) });
    D.dessus(STg, -3.36, 0.62, -1.26, 1.26, (g, X, Z) => {
      g.strokeStyle = 'rgba(200,210,205,0.10)'; g.lineWidth = 2;                                         // rayures fines du pavillon
      for (let i = 0; i < 24; i++) { const x = -3 + r() * 3.4, z = -1 + r() * 2; g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x + 0.2 + r() * 0.3), Z(z + (r() - 0.5) * 0.2)); g.stroke(); }
      for (const e of L) eclat(g, X, Z, e);
    }, { cw: 1600, ch: 1024, genre: 'eclats', eps: 0.012, nu: 64, nv: 36 });
  }
  /* ---------------------------------------------------------------- capot : bord d'attaque, arêtes d'ailes, baie de pare-brise */
  {
    const r = hasard(5150), L = [];
    semer(L, r, [[[3.62, -1.2], [3.64, 1.2]]], { pas: 0.2, r0: 0.04, r1: 0.12, jit: 0.04 });
    semer(L, r, [[[2.0, -1.45], [3.5, -1.3]], [[2.0, 1.45], [3.5, 1.3]]], { pas: 0.22, r0: 0.04, r1: 0.11, jit: 0.05 });
    semer(L, r, [[[2.08, -1.1], [2.08, 1.1]]], { pas: 0.32, r0: 0.03, r1: 0.07, jit: 0.03 });
    D.dessus(ST, 1.98, 3.72, -1.52, 1.52, (g, X, Z) => {
      g.strokeStyle = 'rgba(2,6,5,0.8)'; g.lineWidth = 3;                                                  // joints de capot
      g.beginPath(); g.moveTo(X(2.1), Z(-1.38)); g.lineTo(X(3.5), Z(-1.26)); g.moveTo(X(2.1), Z(1.38)); g.lineTo(X(3.5), Z(1.26)); g.stroke();
      for (const e of L) eclat(g, X, Z, e);
    }, { cw: 900, ch: 800, roues: R, genre: 'eclats', eps: 0.014, nu: 64, nv: 36 });
  }

  /* ---------------------------------------------------------------- face avant : calandre à lamelles, phares en amande, bouclier */
  const xb = (y, z) => S.bout(ST, y, z, 1);
  D.face(ST, 1, -1.46, 1.46, 0.36, 1.74, (g, Z, Y) => {
    poly(g, Z, Y, [[-0.95, 0.5], [0.95, 0.5], [1.0, 0.82], [-1.0, 0.82]], '#0b0d0d');                    // prise d'air basse
    g.strokeStyle = '#1c2220'; g.lineWidth = 4; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(Z(-0.92), Y(0.5 + k * 0.08)); g.lineTo(Z(0.92), Y(0.5 + k * 0.08)); g.stroke(); }
    poly(g, Z, Y, [[-1.5, 0.32], [1.5, 0.32], [1.5, 0.44], [-1.5, 0.44]], '#0b0d0d');                     // lèvre de bouclier
    const r = hasard(6006), L = [];
    for (const sg of [-1, 1]) {
      const p = []; for (let i = 0; i <= 12; i++) { const t = i / 12 * 6.283; p.push([sg * 1.02 + Math.cos(t) * 0.42, 1.5 + Math.sin(t) * 0.2]); }
      semer(L, r, [p], { pas: 0.2, r0: 0.03, r1: 0.09, jit: 0.03 });                                    // pourtour des phares
      semer(L, r, [[[sg * 1.45, 0.5], [sg * 1.5, 1.3]]], { pas: 0.18, r0: 0.04, r1: 0.11, jit: 0.04 });  // coins de bouclier
    }
    semer(L, r, [[[-0.5, 1.12], [0.5, 1.12]], [[-1.3, 0.9], [1.3, 0.9]]], { pas: 0.3, r0: 0.03, r1: 0.08, jit: 0.03 });
    for (const e of L) eclat(g, Z, Y, e);
  }, { cw: 1400, ch: 620, xLim: 3.3, genre: 'eclats', nu: 48, nv: 30 });
  // calandre : petite grille sombre à lamelles horizontales, cadre vert (aucune étoile, aucun logo)
  {
    const y0 = 1.13, y1 = 1.43, xg = xb(1.28, 0);
    prismeX(a, [[-0.44, y0], [0.44, y0], [0.4, y1], [-0.4, y1]], xg + 0.005, xg - 0.25, vert, 0.015);
    prismeX(a, [[-0.38, y0 + 0.04], [0.38, y0 + 0.04], [0.35, y1 - 0.04], [-0.35, y1 - 0.04]], xg + 0.02, xg - 0.2, dark);
    for (let i = 0; i < 4; i++) { const y = y0 + 0.08 + i * 0.065; a.boite(0.04, 0.026, 0.72 - i * 0.02, noirBrillant, xg + 0.025, y, 0); }
  }
  // phares en amande transparents : réflecteur argent + optique claire, pointe intérieure basse, pointe extérieure remontant sur l'aile
  const matLentille = a.garde(new THREE.MeshPhysicalMaterial({ color: 0xf2f6fa, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.4, clearcoat: 1, envMap: a.envMap, envMapIntensity: 1.2 }));
  for (const sg of [-1, 1]) {
    const y = 1.5, z = sg * 1.02, x = xb(y, z);
    const refl = new THREE.Mesh(a.garde(new THREE.SphereGeometry(1, 20, 12)), a.chrome);
    refl.scale.set(0.09, 0.13, 0.34); refl.position.set(x - 0.11, y, z); refl.rotation.set(-sg * 0.3, -sg * 0.45, 0); a.ajouter(refl);
    const lampe = new THREE.Mesh(a.garde(new THREE.SphereGeometry(0.06, 14, 10)), lumBlanche); lampe.position.set(x - 0.02, y, z - sg * 0.1); a.ajouter(lampe);
    const lentille = new THREE.Mesh(a.garde(new THREE.SphereGeometry(1, 20, 12)), matLentille);
    lentille.scale.set(0.12, 0.17, 0.4); lentille.position.set(x - 0.11, y, z); lentille.rotation.set(-sg * 0.3, -sg * 0.45, 0); lentille.renderOrder = 3; a.ajouter(lentille);
  }

  /* ---------------------------------------------------------------- arrière : bouclier, feux verticaux, éclats autour du trou */
  prismeX(a, [[-1.5, 0.38], [1.5, 0.38], [1.46, 0.68], [-1.46, 0.68]], -3.0, -3.45, noir, 0.03);
  const verreFeu = a.pein('#4a0c10', 0.22);
  for (const sg of [-1, 1]) {
    const z0 = sg * 1.27, z1 = sg * 1.47, xr = Math.min(S.bout(ST, 1.9, sg * 1.36, -1), S.bout(STg, 2.3, sg * 1.36, -1));
    prismeX(a, [[z0, 1.62], [z1, 1.66], [z1 * 0.98, 2.5], [z0, 2.5]], xr + 0.16, xr - 0.03, verreFeu, 0.012);   // feu vertical dans le montant D (verre rouge foncé)
    a.boite(0.02, 0.5, 0.05, lumRouge, xr - 0.045, 2.1, sg * 1.37);
  }
  {
    const r = hasard(8008), L = [];
    semer(L, r, [[[-1.25, 1.3], [1.25, 1.3]]], { pas: 0.16, r0: 0.04, r1: 0.11, jit: 0.04 });            // seuil de coffre
    semer(L, r, [[[-1.5, 0.45], [-1.55, 1.25]], [[1.5, 0.45], [1.55, 1.25]], [[-0.8, 0.9], [0.8, 0.9]]], { pas: 0.22, r0: 0.03, r1: 0.1, jit: 0.04 });
    D.face(ST, -1, -1.46, 1.46, 0.4, 1.33, (g, Z, Y) => {
      poly(g, Z, Y, [[-0.36, 0.96], [0.36, 0.96], [0.36, 1.16], [-0.36, 1.16]], 'rgba(10,14,12,0.8)');     // logement de plaque vide
      for (const e of L) eclat(g, Z, Y, e);
    }, { cw: 1200, ch: 400, xLim: -3.1, genre: 'eclats', nu: 48, nv: 30 });
    const L2 = [];
    for (const sg of [-1, 1]) semer(L2, r, [[[sg * 1.28, 1.4], [sg * 1.3, 2.9]], [[sg * 1.5, 1.4], [sg * 1.46, 2.9]]], { pas: 0.18, r0: 0.035, r1: 0.1, jit: 0.04 });
    semer(L2, r, [[[-1.2, 3.02], [1.2, 3.02]]], { pas: 0.2, r0: 0.03, r1: 0.08, jit: 0.02 });
    D.face(STg, -1, -1.62, 1.62, 1.36, 3.1, (g, Z, Y) => {
      g.save(); g.beginPath(); g.rect(0, 0, Z(-zBaie - 0.02), Y(1.3)); g.rect(Z(zBaie + 0.02), 0, Z(1.62) - Z(zBaie + 0.02), Y(1.3)); g.rect(0, 0, Z(1.62), Y(3.0) - Y(3.1)); g.clip();
      for (const e of L2) eclat(g, Z, Y, e);
      g.restore();
    }, { cw: 1100, ch: 640, xLim: -3.05, genre: 'eclats', nu: 48, nv: 30 });
  }

  /* ---------------------------------------------------------------- rétroviseurs noirs, soubassement noir mat */
  for (const sg of [-1, 1]) {
    poutre(a, [2.0, 2.1, sg * 1.5], [1.94, 2.2, sg * 1.64], 0.04, 0, noir, true);
    prisme(a, [[2.08, 2.12], [1.8, 2.15], [1.8, 2.4], [2.02, 2.38]], sg * 1.58, sg * 1.75, noirBrillant, 0.02);
  }
  plaqueY(a, [[3.3, -1.2], [3.3, 1.2], [-3.1, 1.2], [-3.1, -1.2]], 0.28, 0.36, noir);

  a.degager(R, { jeu: 0.07, ep: 0.04, sauf: (m) => m.userData.decal });
  // V9c (« tout lague ») : pièces de même matériau fusionnées (un appel de dessin par matériau) ; les feux restent à part
  fusionnerParMateriau(a, ctx.chassis, { garder: (m) => m.material === lumBlanche || m.material === lumRouge });
  return { L: 7.28, largeur: 2 * (wAile + 0.01), hauteur: 3.15, xAvant: 3.8, xArriere: -3.48, roues: R, rayons: 'rallye', jante: '#ece4cc', plafond: 0.9 };   // W168 : 1 575 / 1 719 ≈ 0,92 ; rétroviseurs compris ≈ 0,90
}

/* ================================================================== N13 : Hot Wheels Jet Threat 4.0 « Le Chasseur Abattu » */
/**
 * Casting imaginaire (voiture-chasseur à ailes repliables), modelé d'après la VRAIE miniature d'Esteban (épave : photos de
 * dessus avant 3/4 et arrière 3/4) et les photos du casting neuf (même moule : version violette et version bleu clair).
 * Proportions relevées sur la vue de dessus (ailes déployées) et le profil : L ≈ 8,0 (griffes comprises) ; largeur hors tout
 * ≈ 0,42 L ; empattement ≈ 0,63 L ; roues découvertes aux quatre coins (avant R 0,58, arrière R 0,64, plus larges) ; jantes
 * noires à 5 branches (jouet : ni disque ni étrier).
 *
 * Silhouette (avant = +x) :
 *   - nez en pointe large, facetté (arête centrale), lucarne noire hexagonale allongée, nervures en V en relief ;
 *   - DEUX GRIFFES par côté, en pince de crabe : un croc supérieur épais recourbé vers l'avant et vers le bas au front des
 *     pontons, une lame inférieure en soc pointée vers l'avant devant chaque roue avant ; aileron avant bas entre elles ;
 *   - pontons avant en épaule au-dessus des roues avant, pointe arrière relevée, grande lucarne noire en losange allongé ;
 *   - longue fente noire centrale sur le dessus (logement de la verrière) jusqu'à l'arceau ; flancs sculptés à cavités noires
 *     et petites ouïes horizontales ; siège au fond de l'habitacle ;
 *   - arrière : moteur à nu dans deux baies encadrées (blocs à culasses nervurées, turbines, deux prises dressées), épine
 *     centrale ; gros bloc de TUYÈRE transversal à la poupe (cadre ovale, deux turbines à pales, aube centrale), arceaux
 *     chromés autour des roues arrière, petits ailerons latéraux.
 *
 * LES AILES (recherche sur le casting : blister « Wings fold! », photos ailes repliées et ailes déployées) : deux grandes pièces
 * en plastique translucide, chacune articulée par une CHARNIÈRE LONGITUDINALE (parallèle à x) posée sur le haut des flancs de la
 * partie arrière (chapes visibles sur la caisse). Repliées, elles se dressent à la verticale de chaque côté de l'arrière, un
 * peu penchées vers l'intérieur : leurs pointes arrière viennent s'appuyer contre le saumon en V de la dérive. Déployées, elles
 * ont pivoté d'un quart de tour AUTOUR DE L'AXE X vers l'extérieur et reposent à l'horizontale, en flèche : lame avant en
 * canard, échancrure, grande lame arrière en pointe — vue de dessus, une silhouette de chasseur. Chaque pièce `aileG` / `aileD`
 * est un groupe dont l'ORIGINE est sur sa charnière : la cinématique peut suivre ses points par localToWorld.
 *
 * DEUX ÉTATS, UN SEUL MODÈLE (contrat `drame`, branché par la cinématique) :
 *   - épave (état par défaut : la miniature d'aujourd'hui) : bleu-gris pâle satiné, usé (grandes plaques noires où la peinture
 *     est partie, surtout sur le nez et les pontons avant, griffures claires), griffes en zamac terni ; AUCUNE pièce
 *     transparente : des cavités noires à la place ; dérive cassée (fine tige claire recourbée de son bord d'attaque et tronçon
 *     dentelé à la poupe) ; chapes de charnières nues, axes tordus ;
 *   - neuf : bleu acier métallisé vif et brillant, griffes chromées, verrière et caches latéraux translucides, ailes et dérive
 *     entières. `deploiement(u)` : 0 = ailes repliées (verticales), 1 = déployées (horizontales) ; `neuf()` les déploie.
 * `teinte(k)` mélange continûment les matériaux neuf (k = 0) → épave (k = 1) et fait apparaître l'usure. Ailes, dérive et pièces
 * transparentes restent dans le graphe (enfants du châssis), cachées ET rétractées (échelle 0,001) dans l'état épave : la boîte
 * englobante et la mesure de largeur ne voient que la voiture.
 * BUDGET (V9c, « tout lague ») : ≤ 140 000 triangles pour les deux états réunis, pièces fusionnées par matériau (un appel de
 * dessin par matériau et par pièce mobile), un seul calque d'usure (atlas dessus + flancs) limité aux triangles réellement usés.
 * Aucun logo, aucun texte, aucune étoile, aucun numéro.
 */

/**
 * CALQUE D'USURE unique, exact sur les pièces : copie de leurs triangles (mêmes sommets : aucun décollement, même déformation
 * par `degager`), UV projetées sur un ATLAS — moitié haute du canvas : vue de dessus (nez à droite) ; moitié basse : flancs
 * (côté +z à gauche, côté −z à droite). Seuls les triangles qui touchent une zone peinte de l'atlas sont gardés (grille
 * d'occupation lue sur le canvas) : l'usure ne coûte que là où elle se voit. Un seul matériau, un seul maillage.
 */
function calqueUsure(a, meshes, dessin, { x0, x1, z0, z1, y0, y1, cw = 2048, ch = 2048, sDessus = 0.3, sFlanc = 0.6 }) {
  const { THREE } = a;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g2 = cv.getContext('2d');
  // repères monde → pixels du canvas : dessus (U, Vz) en haut, flancs (Uf(s), Vy) en bas
  const U = (x) => (x - x0) / (x1 - x0) * cw, Vz = (z) => (z - z0) / (z1 - z0) * ch / 2;
  const Uf = (s) => (x) => (s * 0.5 + 0.5 * (x - x0) / (x1 - x0)) * cw, Vy = (y) => ch - 0.5 * (y - y0) / (y1 - y0) * ch;
  dessin(g2, { U, Vz, Uf, Vy, cw, ch });
  // grille d'occupation (cases de 16 px) : une case est « usée » si un pixel y est peint
  const C = 16, gx = Math.ceil(cw / C), gy = Math.ceil(ch / C), occ = new Uint8Array(gx * gy);
  const px = g2.getImageData(0, 0, cw, ch).data;
  for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) if (px[(y * cw + x) * 4 + 3] > 10) occ[Math.floor(y / C) * gx + Math.floor(x / C)] = 1;
  const usee = (us, vs) => {                                         // vs : v de texture (0 en bas) → lignes du canvas
    const ia = Math.max(0, Math.floor(Math.min(...us) * cw / C) - 1), ib = Math.min(gx - 1, Math.floor(Math.max(...us) * cw / C) + 1);
    const ja = Math.max(0, Math.floor((1 - Math.max(...vs)) * ch / C) - 1), jb = Math.min(gy - 1, Math.floor((1 - Math.min(...vs)) * ch / C) + 1);
    for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) if (occ[j * gx + i]) return true;
    return false;
  };
  const pos = [], nor = [], uv = [], A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), n = new THREE.Vector3();
  for (const m of meshes) {
    const g = m.geometry, p = g.attributes.position, N = g.attributes.normal, ix = g.index ? g.index.array : null, nt = ix ? ix.length : p.count;
    for (let t = 0; t < nt; t += 3) {
      const id = ix ? [ix[t], ix[t + 1], ix[t + 2]] : [t, t + 1, t + 2];
      A.fromBufferAttribute(p, id[0]); B.fromBufferAttribute(p, id[1]); Cc.fromBufferAttribute(p, id[2]);
      n.subVectors(B, A).cross(Cc.clone().sub(A)); const l = n.length(); if (l < 1e-9) continue; n.divideScalar(l);
      let us, vs;
      if (n.y > sDessus) { us = [A, B, Cc].map((q) => (q.x - x0) / (x1 - x0)); vs = [A, B, Cc].map((q) => 1 - 0.5 * (q.z - z0) / (z1 - z0)); }
      else if (Math.abs(n.z) > sFlanc) { const s = (A.z + B.z + Cc.z) >= 0 ? 0 : 1; us = [A, B, Cc].map((q) => s * 0.5 + 0.5 * (q.x - x0) / (x1 - x0)); vs = [A, B, Cc].map((q) => 0.5 * (q.y - y0) / (y1 - y0)); }
      else continue;
      if (!usee(us, vs)) continue;
      for (let k = 0; k < 3; k++) {
        const q = [A, B, Cc][k]; pos.push(q.x, q.y, q.z); uv.push(us[k], vs[k]);
        if (N) nor.push(N.getX(id[k]), N.getY(id[k]), N.getZ(id[k])); else nor.push(n.x, n.y, n.z);
      }
    }
  }
  const map = a.garde(new THREE.CanvasTexture(cv)); map.encoding = THREE.sRGBEncoding; map.anisotropy = 8;
  const mat = a.garde(new THREE.MeshStandardMaterial({ map, transparent: true, opacity: 1, roughness: 0.75, metalness: 0.3, envMap: a.envMap, envMapIntensity: 0.3,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(a.garde(g), mat); m.renderOrder = 2; m.userData.calque = true; a.ajouter(m);
  return mat;
}

/** Tache irrégulière (contour lissé à 9–13 lobes) aux coordonnées monde (u, v), rayon r, étirement e.k, couleur e.c. */
function tache(g, U, V, e) {
  const r = hasard(e.graine), n = 9 + Math.floor(r() * 5), pts = [], rot = r() * 3.14, et = e.k ?? (0.5 + r() * 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / n * 6.283 + (r() - 0.5) * 0.4, k = e.r * (0.45 + r() * 0.7), cu = Math.cos(t) * k, cv = Math.sin(t) * k * et;
    pts.push([U(e.u + cu * Math.cos(rot) - cv * Math.sin(rot)), V(e.v + cu * Math.sin(rot) + cv * Math.cos(rot))]);
  }
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (i === 0) g.moveTo(m[0], m[1]); else g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  g.closePath(); g.fillStyle = e.c; g.fill();
}
/** Sème des taches d'usure le long de polylignes monde : pas moyen, rayons [r0, r1], écart latéral jit, couleurs. */
function semerTaches(liste, r, lignes, { pas = 0.25, r0 = 0.05, r1 = 0.16, jit = 0.05, couleurs = ['#1b1e23', '#2b2f35', '#3a3f46'] } = {}) {
  for (const L of lignes) for (let i = 0; i < L.length - 1; i++) {
    const [u0, v0] = L[i], [u1, v1] = L[i + 1], d = Math.hypot(u1 - u0, v1 - v0);
    for (let t = r() * pas; t < d; t += pas * (0.5 + r() * 0.9)) {
      const k = t / d;
      liste.push({ u: u0 + (u1 - u0) * k + (r() - 0.5) * 2 * jit, v: v0 + (v1 - v0) * k + (r() - 0.5) * 2 * jit, r: r0 + (r1 - r0) * Math.pow(r(), 1.4),
        c: couleurs[Math.floor(r() * couleurs.length)], graine: Math.floor(r() * 1e9) });
    }
  }
  return liste;
}
/** Griffures claires : n traits fins dans la boîte [u0, u1] × [v0, v1] (coordonnées monde). */
function griffures(g, U, V, r, n, u0, u1, v0, v1, l0 = 0.08, l1 = 0.4) {
  for (let i = 0; i < n; i++) {
    const u = u0 + r() * (u1 - u0), v = v0 + r() * (v1 - v0), l = l0 + r() * (l1 - l0), t = (r() - 0.5) * 1.6;
    g.strokeStyle = `rgba(226,233,238,${0.3 + r() * 0.45})`; g.lineWidth = 1 + r() * 2;
    g.beginPath(); g.moveTo(U(u), V(v)); g.quadraticCurveTo(U(u + Math.cos(t) * l * 0.5), V(v + Math.sin(t) * l * 0.5 + (r() - 0.5) * 0.03), U(u + Math.cos(t) * l), V(v + Math.sin(t) * l)); g.stroke();
  }
}
/**
 * Plaque d'usure déchiquetée le long d'une polyligne monde : demi-largeur qui gonfle au milieu (l0 → l1 → l0), bords rongés
 * par un bruit cohérent (somme de sinus à phases tirées de la graine) et de petites dents, couleur noire / gris très foncé.
 */
function bande(g, U, V, b) {
  const r = hasard(b.graine * 7919), n = 90, seg = [];
  let tot = 0; for (let i = 0; i < b.pts.length - 1; i++) { const d = Math.hypot(b.pts[i + 1][0] - b.pts[i][0], b.pts[i + 1][1] - b.pts[i][1]); seg.push(d); tot += d; }
  const ph = [r() * 6.3, r() * 6.3, r() * 6.3, r() * 6.3], at = (s) => { let i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; } const t = Math.min(1, s / seg[i]); return [b.pts[i][0] + (b.pts[i + 1][0] - b.pts[i][0]) * t, b.pts[i][1] + (b.pts[i + 1][1] - b.pts[i][1]) * t]; };
  const haut = [], bas = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = at(t * tot), q = at(Math.min(tot, t * tot + 0.01)), o = at(Math.max(0, t * tot - 0.01));
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const base = b.l0 + (b.l1 - b.l0) * Math.sin(Math.PI * t);
    const k1 = 0.55 + 0.3 * Math.sin(t * 9 + ph[0]) + 0.18 * Math.sin(t * 23 + ph[1]) + 0.08 * Math.sin(t * 61 + ph[2]) + (r() - 0.5) * 0.16;
    const k2 = 0.55 + 0.3 * Math.sin(t * 8 + ph[2]) + 0.18 * Math.sin(t * 27 + ph[3]) + 0.08 * Math.sin(t * 57 + ph[0]) + (r() - 0.5) * 0.16;
    haut.push([U(p[0] + nx * base * Math.max(0.15, k1) * 1.6), V(p[1] + ny * base * Math.max(0.15, k1) * 1.6)]);
    bas.push([U(p[0] - nx * base * Math.max(0.15, k2) * 1.6), V(p[1] - ny * base * Math.max(0.15, k2) * 1.6)]);
  }
  g.beginPath(); [...haut, ...bas.reverse()].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = '#17191d'; g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(40,44,50,0.9)'; g.stroke();
  // écaillage : petites écailles sombres le long des deux bords (la laque part par plaques, pas au cutter)
  for (const bord of [haut, bas]) for (let i = 2; i < bord.length - 2; i += 3) {
    if (r() < 0.45) continue;
    const [x, y] = bord[i], rr = 2 + r() * 6, dx = (r() - 0.5) * 10, dy = (r() - 0.5) * 10;
    g.fillStyle = r() < 0.6 ? '#1b1e23' : '#2c3036'; g.beginPath(); g.ellipse(x + dx, y + dy, rr, rr * (0.5 + r() * 0.6), r() * 3, 0, 6.283); g.fill();
  }
}
/** Lame plate le long d'une courbe plane (x, y) : demi-épaisseur e(t) (t ∈ [0,1]), extrudée en z de z0 à z1. */
function lame(a, pts, e, z0, z1, mat, n = 24, biseau = 0.012) {
  const { THREE } = a, c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0))), haut = [], bas = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = c.getPointAt(t), d = c.getTangentAt(t), nx = -d.y, ny = d.x, k = e(t);
    haut.push([p.x + nx * k, p.y + ny * k]); bas.push([p.x - nx * k, p.y - ny * k]);
  }
  return prisme(a, [...haut, ...bas.reverse()], z0, z1, mat, biseau);
}

/**
 * Loft à FACETTES (arêtes vives de moulage) : sections polygonales section(x) → [[z, y], …] (côté +z, contour fermé, même
 * nombre de points partout), posées du côté sg (miroir pour −1). Chaque facette longitudinale a ses propres sommets : les
 * normales sont lissées le long de x mais cassées d'une facette à l'autre. Faces avant / arrière triangulées.
 */
function loftFacettes(a, xs, section, mat, sg = 1) {
  const { THREE } = a, secs = xs.map((x) => section(x)), n = secs[0].length, pos = [], idx = [];
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n, base = pos.length / 3;
    for (let j = 0; j < xs.length; j++) { const [z1, y1] = secs[j][k], [z2, y2] = secs[j][k2]; pos.push(xs[j], y1, z1, xs[j], y2, z2); }
    for (let j = 0; j < xs.length - 1; j++) { const p = base + 2 * j; idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
  }
  // sens des facettes : la normale d'une facette doit s'écarter du centre de sa section (sinon on retourne toutes les bandes)
  const jm = Math.floor(xs.length / 2), sm = secs[jm], cz = sm.reduce((t, q) => t + q[0], 0) / n, cy = sm.reduce((t, q) => t + q[1], 0) / n;
  let score = 0;
  for (let k = 0; k < n; k++) {
    const [z1, y1] = sm[k], [z2, y2] = sm[(k + 1) % n], dx = xs[jm + 1] - xs[jm];
    // triangle (p, p+2, p+1) : arêtes (dx, 0, 0) puis (0, y2 − y1, z2 − z1) → normale = e1 × e2 = (0, −dx·(z2 − z1), dx·(y2 − y1))
    const ny = -dx * (z2 - z1), nz = dx * (y2 - y1), mz = (z1 + z2) / 2 - cz, my = (y1 + y2) / 2 - cy;
    score += ny * my + nz * mz;
  }
  if (score < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  // bouchons arrière (normale −x) et avant (+x)
  for (const [j, sens] of [[0, -1], [xs.length - 1, 1]]) {
    const base = pos.length / 3, c = secs[j].map(([z, y]) => new THREE.Vector2(z, y));
    for (const [z, y] of secs[j]) pos.push(xs[j], y, z);
    for (const [p, q, r] of THREE.ShapeUtils.triangulateShape(c, [])) {
      const [za, ya] = secs[j][p], [zb, yb] = secs[j][q], [zc, yc] = secs[j][r];
      const nx = (yb - ya) * (zc - za) - (zb - za) * (yc - ya);           // composante x de (B − A) × (C − A)
      if (Math.sign(nx) === sens) idx.push(base + p, base + q, base + r); else idx.push(base + p, base + r, base + q);
    }
  }
  if (sg < 0) {                                                   // miroir : z → −z et faces retournées
    for (let i = 2; i < pos.length; i += 3) pos[i] = -pos[i];
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}

/** Plaque mince (contour plan (u, v), épaisseur `ep` centrée sur z = 0) dans le repère local d'une pièce mobile. */
function plaqueLocale(a, pts, ep, mat, biseau = 0.012) {
  const { THREE } = a, s = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -ep / 2); return new THREE.Mesh(a.garde(g), mat);
}

function jetThreat(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx;
  const a = aide(ctx); a.garde = ctx.garde; a.envMap = ctx.envMap; a.THREE = THREE;
  const S = surfaces(a);

  /* ---------------------------------------------------------------- matériaux (dix, plus les deux feux du châssis) */
  const carro = a.pein('#5d6a7a', 0.45);                        // laque vernie (clearcoat 1) : bleu acier métallisé ↔ bleu-gris pâle terne
  const griffe = a.garde(new THREE.MeshPhysicalMaterial({ color: a.lin('#80868d'), roughness: 0.5, metalness: 0.65, envMap: a.envMap, envMapIntensity: 0.4 }));   // chrome ↔ zamac terni
  // plastique bleu translucide (ailes, verrière, caches latéraux) : une seule matière, rendue en deux passes (dos puis face)
  const bleu = a.garde(new THREE.MeshPhysicalMaterial({ color: a.lin('#1f7ae6'), transparent: true, opacity: 0.56, roughness: 0.06, metalness: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.05, envMap: a.envMap, envMapIntensity: 1.0, side: THREE.DoubleSide, depthWrite: false }));
  const dark = a.mate('#060708', 0.9, 0.05), noirLucarne = a.mate('#0a0b0d', 0.35, 0.3);
  noirLucarne.side = THREE.DoubleSide;
  const zamac = a.mate('#4a4e55', 0.55, 0.55), moteur = a.mate('#2f3237', 0.5, 0.6), plastiqueCasse = a.mate('#c9d6e0', 0.55, 0.05);
  /** États des matériaux : [matériau, neuf, épave] pour couleur, rugosité, métal, vernis, reflets, opacité. */
  const ETATS = [
    { m: carro, c: ['#6f93bb', '#5d6a7a'], r: [0.24, 0.45], me: [0.5, 0.22], cc: [0.04, 0.6], ei: [0.6, 0.2] },   // rendu épave ≈ #9aa7b4 sous lumière neutre
    { m: griffe, c: ['#eef2f6', '#80868d'], r: [0.08, 0.5], me: [1.0, 0.65], ei: [1.7, 0.4] },
    { m: bleu, c: ['#1f7ae6', '#56769a'], r: [0.06, 0.35], op: [0.56, 0.8] },
  ].map((e) => ({ ...e, c: e.c.map((h) => a.lin(h)) }));

  /* ---------------------------------------------------------------- roues découvertes : jantes noires 5 branches (jouet) */
  const zExt = 1.66, RA = 0.58, epA = 0.46, xA = 2.45, RR = 0.64, epR = 0.7, xR = -2.62;
  const optR = { jante: '#141518', rayons: 'cinq', levre: 0.05, etrier: '#2a2c30', sansFrein: true };   // jouet : ni disque ni étrier
  const R = [roue(xA, RA, epA, zExt, true, optR), roue(xR, RR, epR, zExt, false, optR)];

  /* ---------------------------------------------------------------- fuselage central : nez facetté, fente, baies moteur */
  const ST = stations(abscisses(-3.78, 3.98, 0.1, [-3.74, -3.7, 3.92]), {
    y0: [[-3.78, 0.62], [-3.6, 0.42], [-3.0, 0.36], [3.0, 0.36], [3.6, 0.42], [3.98, 0.56]],
    y1: [[-3.78, 1.24], [-3.62, 1.46], [-3.3, 1.52], [-2.4, 1.52], [-1.6, 1.54], [-1.0, 1.68], [0.0, 1.76], [1.0, 1.72], [1.8, 1.66], [2.5, 1.6], [3.1, 1.46], [3.6, 1.16], [3.98, 0.84]],
    w: [[-3.78, 0.62], [-3.55, 0.82], [-3.0, 0.84], [-2.4, 0.84], [-1.6, 0.88], [-1.0, 1.04], [0.0, 1.14], [0.8, 1.04], [1.6, 0.82], [2.4, 0.66], [3.2, 0.56], [3.7, 0.5], [3.98, 0.4]],
    nt: [[-3.78, 4.5], [-1.6, 4.5], [-0.6, 2.8], [1.0, 2.4], [2.0, 1.75], [3.98, 1.6]], nb: 3.6,
    wt: [[-3.78, 0.9], [-1.6, 0.9], [0.0, 0.72], [2.5, 0.7], [3.98, 0.8]],
  });
  const sST = (x) => a.stAt(ST, x);
  /** Demi-largeur d'une fente en losange allongé (pointes à x0 et x1, pleine largeur hw entre les biseaux de longueur b). */
  const fente = (x, x0, x1, hw, b0, b1 = b0) => (x <= x0 || x >= x1 ? -1 : hw * Math.min(1, (x - x0) / b0, (x1 - x) / b1));
  const BAIE = { x0: -3.1, x1: -1.16, zi: 0.2, zo: 0.66 };                // baies moteur (une de chaque côté de l'épine)
  const CAV = { xc: -0.2, ax: 0.62, yc: 1.06, ay: 0.23 };                   // cavités latérales (logement des caches translucides)
  const TROUS = {
    fente: (x, y, z) => y > 1.45 && Math.abs(z) < fente(x, -0.36, 1.86, 0.17, 0.2, 0.5),            // logement de la verrière
    hexa: (x, y, z) => y > 1.2 && Math.abs(z) < fente(x, 2.2, 3.2, 0.21, 0.2, 0.3),                // lucarne hexagonale du nez
    baies: (x, y, z) => y > 1.1 && x > BAIE.x0 && x < BAIE.x1 && Math.abs(z) > BAIE.zi && Math.abs(z) < BAIE.zo,
    flancs: (x, y, z) => Math.pow((x - CAV.xc) / CAV.ax, 4) + Math.pow((y - CAV.yc) / CAV.ay, 4) < 1 && Math.abs(z) > sST(x).w * 0.8,
  };
  const trouST = (x, y, z) => TROUS.fente(x, y, z) || TROUS.hexa(x, y, z) || TROUS.baies(x, y, z) || TROUS.flancs(x, y, z);
  const corps = coque(a, ST, carro, { nx: 176, ns: 104, garder: (x, y, z) => !trouST(x, y, z) });
  // intérieur noir : coque vue de l'intérieur, un peu plus petite (toute ouverture montre une cavité noire)
  const STi = stations(abscisses(-3.7, 3.8, 0.2), {
    y0: (x) => sST(x).y0 + 0.06, y1: (x) => sST(x).y1 - 0.09, w: (x) => Math.max(0.05, sST(x).w - 0.08), nt: (x) => sST(x).nt, nb: 3.6, wt: (x) => sST(x).wt,
  });
  coque(a, STi, dark, { inverse: true, nx: 64, ns: 40 });

  /* ---------------------------------------------------------------- pontons avant : épaules facettées au-dessus des roues avant */
  // section polygonale (arêtes vives de moulage) : paroi intérieure, arête de crête, méplat central (lucarne noire), lèvre
  // extérieure relevée (le « rail » qui file au-dessus du pneu jusqu'au croc), paroi extérieure ; le dessous suit l'arche de la
  // roue avant (pneu bien visible dessous et à l'extérieur). Pointe arrière relevée et rejetée vers l'extérieur.
  const jeuA = 0.1;
  const archeA = (x) => { const dx = Math.abs(x - xA), Rj = RA + jeuA; return dx < Rj ? RA + Math.sqrt(Rj * Rj - dx * dx) : 0; };
  const P = {
    zi: courbe([[0.72, 1.32], [1.0, 1.16], [1.5, 0.92], [2.2, 0.74], [2.8, 0.66], [3.2, 0.62], [3.36, 0.68]]),   // bord intérieur
    zo: courbe([[0.72, 1.5], [3.0, 1.5], [3.25, 1.42], [3.36, 1.24]]),                                         // bord extérieur
    yt: courbe([[0.72, 2.0], [0.95, 1.97], [1.4, 1.92], [1.9, 1.88], [2.5, 1.82], [3.0, 1.66], [3.25, 1.48], [3.36, 1.3]]),
    yb: courbe([[0.72, 1.9], [0.95, 1.62], [1.3, 0.78], [1.55, 0.48], [1.85, 0.48], [2.95, 0.92], [3.36, 1.04]]),   // devant la roue : relevé (pneu visible de face)
  };
  const yBas = (x) => Math.max(P.yb(x), archeA(x));
  /** Section du ponton droit (z > 0) à l'abscisse x : [[z, y], …], contour fermé. */
  const sectionPonton = (x) => {
    const zi = P.zi(x), zo = P.zo(x), w = zo - zi, yt = P.yt(x), yb = Math.min(yBas(x), yt - 0.1), Z = (t) => zi + t * w;
    const ym = Math.max(yb + 0.02, yt - 0.22);
    const zPneu = Math.max(Z(0.08), Math.min(1.14, Z(0.9)));                              // dessous : plat au-dessus du pneu
    const zN = Math.max(0.2, zi - 0.24), yN = S.haut(ST, x, zN) - 0.03;                  // la paroi intérieure descend en pente jusqu'au nez (vallée en V)
    return [[zN, Math.min(yN - 0.3, yb)], [zN, Math.min(yN, yt - 0.12)], [Z(0.16), yt - 0.02], [Z(0.3), yt - 0.08], [Z(0.7), yt - 0.07], [Z(0.86), yt + 0.03], [Z(1), Math.max(ym, yt - 0.1)], [Z(1), yb], [zPneu, yb]];
  };
  /** Hauteur du méplat central (lucarne) au point (x, z) du ponton droit. */
  const yMeplat = (x, z) => { const zi = P.zi(x), w = P.zo(x) - zi, t = Math.min(1, Math.max(0, ((z - zi) / w - 0.3) / 0.4)); return P.yt(x) - 0.08 + 0.01 * t; };
  const xsP = abscisses(0.72, 3.36, 0.045, [0.74, 3.34]);
  const pontons = [];
  for (const sg of [-1, 1]) {
    pontons.push(loftFacettes(a, xsP, sectionPonton, carro, sg));
    // lucarne noire en losange allongé, couchée sur le méplat (grille fine qui épouse le méplat, légère surépaisseur)
    const xc = 1.98, demi = 0.56, zc = (x) => P.zi(x) + 0.5 * (P.zo(x) - P.zi(x)), hw = (x) => 0.17 * (P.zo(x) - P.zi(x));
    const grille = [], ix = [], N = 16;
    for (let i = 0; i <= N; i++) for (let k = 0; k <= 4; k++) {
      const u = i / N, v = k / 4, x = xc + demi * (1 - 2 * u), lim = hw(xc) * (1 - Math.abs(1 - 2 * u)), z = zc(x) + lim * (2 * v - 1);
      grille.push(x, yMeplat(x, z) + 0.008, sg * z);
    }
    for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const q = i * 5 + k, r = q + 5; if (sg > 0) ix.push(q, q + 1, r, r, q + 1, r + 1); else ix.push(q, r, q + 1, r, r + 1, q + 1); }
    const gG = new THREE.BufferGeometry(); gG.setAttribute('position', new THREE.Float32BufferAttribute(grille, 3)); gG.setIndex(ix); gG.computeVertexNormals();
    const luc = new THREE.Mesh(a.garde(gG), noirLucarne); luc.renderOrder = 1; a.ajouter(luc);
    // arête de crête du ponton (nervure vive) et ouïes de flanc du ponton (trois fentes noires derrière la roue)
    const crete = []; for (let i = 0; i <= 12; i++) { const x = 0.8 + 2.45 * i / 12; crete.push([x, P.yt(x) + 0.015, sg * (P.zi(x) + 0.86 * (P.zo(x) - P.zi(x)))]); }
    tuyau(a, crete, 0.026, carro, 36, 6);
    for (let k = 0; k < 3; k++) { const x = 1.02 + k * 0.13; a.boite(0.06, 0.24, 0.04, noirLucarne, x, P.yt(x) - 0.3, sg * (P.zo(x) + 0.005)); }
  }
  a.puits(R.filter((r) => r.avant), dark);

  /* ---------------------------------------------------------------- nervures en relief (arêtes vives du capot et des flancs) */
  const surST = (x, z, d = 0.012) => [x, S.haut(ST, x, z) + d, z];
  const nervure = (pts, r = 0.028) => tuyau(a, pts, r, carro, Math.max(12, pts.length * 3), 6);
  for (const sg of [-1, 1]) {
    const v = []; for (let i = 0; i <= 10; i++) { const t = i / 10, x = 3.78 - 1.75 * t; v.push(surST(x, sg * (0.1 + 0.52 * t))); }   // V du nez
    nervure(v);
    const h = []; for (let i = 0; i <= 10; i++) { const x = 2.14 + 1.12 * i / 10, hw = Math.max(0, fente(x, 2.14, 3.26, 0.28, 0.2, 0.32)); h.push(surST(x, sg * hw)); }   // cadre de la lucarne
    nervure(h, 0.024);
    const f = []; for (let i = 0; i <= 14; i++) { const x = -0.44 + 2.38 * i / 14, hw = Math.max(0, fente(x, -0.44, 1.94, 0.23, 0.2, 0.5)); f.push(surST(x, sg * hw)); }   // lèvre de la fente
    nervure(f, 0.026);
    // lèvre des cavités latérales (contour en superellipse posé sur le flanc)
    const lev = []; for (let i = 0; i <= 32; i++) { const t = i / 32 * 2 * Math.PI, c = Math.cos(t), n = Math.sin(t);
      const x = CAV.xc + (CAV.ax + 0.02) * Math.sign(c) * Math.sqrt(Math.abs(c)), y = CAV.yc + (CAV.ay + 0.02) * Math.sign(n) * Math.sqrt(Math.abs(n)); lev.push([x, y, sg * (S.flanc(ST, x, y) + 0.004)]); }
    tuyau(a, lev, 0.028, carro, 64, 6, true);
    for (let i = 0; i < 4; i++) { const x = 0.1 + i * 0.22; nervure([surST(x, sg * 0.4), surST(x - 0.04, sg * 0.62), surST(x - 0.08, sg * 0.8)], 0.02); }   // petites nervures transverses
    // ouïes horizontales du flanc arrière (derrière les cavités) : fentes noires sous de petites lames de caisse
    for (let k = 0; k < 3; k++) {
      const y = 0.9 + k * 0.16, x = -1.34;
      a.boite(0.42, 0.05, 0.05, noirLucarne, x, y, sg * (S.flanc(ST, x, y) - 0.012));
      a.boite(0.44, 0.035, 0.06, carro, x, y + 0.045, sg * (S.flanc(ST, x, y + 0.045) + 0.006));
    }
    // épaulement de flanc : arête vive qui court de la pointe du ponton à la poupe, au-dessus des cavités
    const ep = []; for (let i = 0; i <= 16; i++) { const x = 0.7 - 4.3 * i / 16, y = 1.36 - 0.02 * i / 16; ep.push([x, y, sg * (S.flanc(ST, x, y) + 0.008)]); }
    tuyau(a, ep, 0.03, carro, 40, 6);
  }

  /* ---------------------------------------------------------------- griffes en pince : croc supérieur et soc inférieur */
  // croc : arête épaisse qui part de la pointe avant du ponton, file au-dessus de la roue avant (pneu visible dessous et à
  // l'extérieur) puis se recourbe vers l'avant et vers le bas ; soc : lame massive pointée vers l'avant devant la roue avant
  for (const sg of [-1, 1]) {
    lame(a, [[3.3, 1.5], [3.55, 1.52], [3.8, 1.48], [3.98, 1.38], [4.08, 1.22], [4.06, 1.08]],
      (t) => 0.1 - 0.07 * t, sg * 1.34, sg * 1.5, griffe, 24, 0.03);
    prisme(a, [[3.06, 0.66], [3.12, 0.36], [3.42, 0.22], [4.05, 0.13], [3.86, 0.32], [3.46, 0.56], [3.3, 0.68]], sg * 1.12, sg * 1.34, griffe, 0.025);   // soc au ras du sol, en dedans du pneu : roue visible de face
  }
  // aileron avant bas, entre les socs (pointe au centre), menton du nez
  plaqueY(a, [[3.64, -0.8], [3.8, -0.8], [3.94, -0.36], [4.0, 0], [3.94, 0.36], [3.8, 0.8], [3.64, 0.8], [3.72, 0]], 0.2, 0.3, griffe, 0.015);
  for (const sg of [-1, 1]) a.boite(0.08, 0.22, 0.06, griffe, 3.78, 0.4, sg * 0.3);       // piliers de l'aileron
  prismeX(a, [[-0.3, 0.42], [0.3, 0.42], [0.36, 0.6], [-0.36, 0.6]], 4.02, 3.7, griffe, 0.015);   // menton

  /* ---------------------------------------------------------------- habitacle : arceau ; moteur à nu ; tuyère */
  prismeX(a, [[-0.82, 1.4], [0.82, 1.4], [0.68, 1.86], [0.32, 2.0], [-0.32, 2.0], [-0.68, 1.86]], -0.98, -1.3, carro, 0.025);   // arceau
  // épine centrale entre les baies et cadres des baies (rebords de caisse en relief)
  a.boite(1.98, 0.12, 0.2, carro, (BAIE.x0 + BAIE.x1) / 2, 1.55, 0);
  for (const sg of [-1, 1]) {
    const zm = sg * (BAIE.zi + BAIE.zo) / 2, lb = BAIE.x1 - BAIE.x0, xm = (BAIE.x0 + BAIE.x1) / 2;
    a.boite(lb + 0.12, 0.12, 0.12, carro, xm, 1.53, sg * (BAIE.zo + 0.04));                // rebord extérieur (flanc de la baie)
    for (const x of [BAIE.x0 - 0.03, BAIE.x1 + 0.03]) a.boite(0.1, 0.1, BAIE.zo - BAIE.zi + 0.1, carro, x, 1.53, zm);   // traverses
    // moteur : bloc, quatre culasses nervurées, turbine à l'arrière de la baie, prise dressée à l'avant
    a.boite(1.7, 0.32, 0.38, moteur, xm - 0.04, 1.02, zm);
    for (let i = 0; i < 4; i++) {
      a.cyl(0.085, 0.085, 0.36, zamac, -1.42 - i * 0.36, 1.24, zm, Math.PI / 2, 0, 12);
      for (const d of [-0.11, 0, 0.11]) a.boite(0.03, 0.2, 0.36, moteur, -1.42 - i * 0.36 + d, 1.25, zm);   // ailettes
    }
    a.cyl(0.16, 0.16, 0.16, zamac, -2.92, 1.08, zm, 0, Math.PI / 2, 16);                    // turbine (axe x)
    a.cyl(0.055, 0.065, 0.5, zamac, -1.4, 1.48, zm, 0, 0, 10);                             // prise dressée
    a.cyl(0.085, 0.07, 0.1, zamac, -1.4, 1.74, zm, 0, 0, 10);
  }
  // TUYÈRE de poupe : bloc transversal ovale (cadre), fond creux noir, deux turbines à pales et aube centrale
  {
    const ovale = (hz, hy, yc, n = 10) => {                                                   // contour en stade (z, y)
      const pts = [], rr = hy;
      for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + Math.PI * i / n; pts.push([hz - rr + Math.cos(t) * rr, yc + Math.sin(t) * rr]); }
      for (let i = 0; i <= n; i++) { const t = Math.PI / 2 + Math.PI * i / n; pts.push([-hz + rr + Math.cos(t) * rr, yc + Math.sin(t) * rr]); }
      return pts;
    };
    const yc = 0.78;
    prismeX(a, ovale(0.94, 0.4, yc), -3.42, -3.86, moteur, 0.03);                            // bloc
    prismeX(a, ovale(0.84, 0.31, yc), -3.85, -3.9, dark);                                    // fond creux
    tuyau(a, ovale(0.9, 0.36, yc, 8).map(([z, y]) => [-3.9, y, z]), 0.04, zamac, 48, 6, true);   // cadre ovale
    for (const sg of [-1, 1]) {
      const zf = sg * 0.42;
      a.cyl(0.26, 0.26, 0.06, zamac, -3.86, yc, zf, 0, Math.PI / 2, 20);                     // couronne de la turbine
      a.cyl(0.21, 0.21, 0.07, dark, -3.875, yc, zf, 0, Math.PI / 2, 20);
      for (let k = 0; k < 7; k++) { const p = a.boite(0.03, 0.2, 0.05, zamac, -3.89, yc, zf); p.rotation.x = k / 7 * Math.PI; p.rotation.y = 0.35; }   // pales
      a.cyl(0.05, 0.05, 0.06, zamac, -3.9, yc, zf, 0, Math.PI / 2, 10);                      // moyeu
    }
    prismeX(a, [[-0.07, yc - 0.26], [0.07, yc - 0.26], [0.04, yc + 0.28], [-0.04, yc + 0.28]], -3.86, -3.93, zamac, 0.01);   // aube centrale
  }
  for (const sg of [-1, 1]) a.boite(0.03, 0.05, 0.22, lumRouge, -3.875, 1.12, sg * 0.56);    // feux arrière
  for (const sg of [-1, 1]) a.boite(0.22, 0.05, 0.03, lumBlanche, 3.5, 0.86, sg * (sST(3.5).w + 0.005));   // feux avant fins
  // arceaux chromés autour de l'arrière des roues arrière, petits ailerons latéraux et leurs bras
  for (const sg of [-1, 1]) {
    tuyau(a, [[-3.5, 0.42, sg * 0.86], [-3.78, 0.36, sg * 1.16], [-3.66, 0.34, sg * 1.44], [-3.38, 0.38, sg * 1.54]], 0.045, griffe, 24, 6);
    prisme(a, [[-3.32, 0.9], [-3.52, 0.9], [-3.74, 1.56], [-3.56, 1.58]], sg * 1.4, sg * 1.5, griffe, 0.012);
    poutre(a, [-3.48, 0.98, sg * 0.86], [-3.48, 0.98, sg * 1.42], 0.09, 0.08, zamac);
  }
  // trains : bras de suspension (intérieur des roues : rien dans l'anneau visible des pneus)
  for (const sg of [-1, 1]) {
    poutre(a, [xR + 0.35, 0.62, sg * 0.7], [xR, RR, sg * 0.98], 0.05, 0, zamac, true);
    poutre(a, [xR - 0.35, 0.8, sg * 0.7], [xR, RR, sg * 0.98], 0.05, 0, zamac, true);
    a.cyl(0.13, 0.13, 0.2, zamac, xR, RR, sg * 0.92, Math.PI / 2, 0, 14);
  }
  plaqueY(a, [[3.2, -0.5], [3.2, 0.5], [-3.5, 0.6], [-3.5, -0.6]], 0.3, 0.37, zamac);    // châssis zamac

  /* ---------------------------------------------------------------- charnières des ailes : chapes sur le haut des flancs arrière */
  const yH = 1.0, zH = 1.16, CHAPES = [0.5, -1.36];                                          // axe de charnière : x, à (yH, ±zH)
  for (const sg of [-1, 1]) for (const x of CHAPES) {
    const zr = S.flanc(ST, x, yH);
    a.boite(0.26, 0.12, zH - zr + 0.1, carro, x, yH, sg * (zr + zH) / 2);                 // patte de chape venue de fonderie
    a.cyl(0.05, 0.05, 0.34, zamac, x, yH, sg * zH, 0, Math.PI / 2, 10);                    // axe (le long de x)
  }

  /* ---------------------------------------------------------------- usure de l'épave : UN calque (atlas dessus + flancs), opacité = teinte */
  const BOX = { x0: -3.95, x1: 4.1, z0: -1.75, z1: 1.75, y0: 0.2, y1: 2.3 };
  const usure = calqueUsure(a, [corps, ...pontons], (g, { U, Vz, Uf, Vy }) => {
    // dessus : pontons (grande plaque noire déchiquetée le long du bord intérieur, seconde plaque sur l'avant du méplat), nez
    // (flancs du V jusqu'à la pointe), éclats satellites, taches sur la caisse, griffures claires
    {
      const r = hasard(1313), B = [], L = [];
      for (const sg of [-1, 1]) {
        const bi = [], bm = [];
        for (let i = 0; i <= 10; i++) { const x = 1.15 + 2.1 * i / 10, w = P.zo(x) - P.zi(x); bi.push([x, sg * (P.zi(x) + 0.14 * w)]); }
        for (let i = 0; i <= 6; i++) { const x = 2.3 + 0.95 * i / 6, w = P.zo(x) - P.zi(x); bm.push([x, sg * (P.zi(x) + 0.72 * w)]); }
        B.push({ pts: bi, l0: 0.05, l1: 0.17, graine: sg > 0 ? 11 : 12 }, { pts: bm, l0: 0.03, l1: 0.09, graine: sg > 0 ? 13 : 14 });
        B.push({ pts: [[3.92, sg * 0.18], [3.4, sg * 0.4], [2.75, sg * 0.56]], l0: 0.03, l1: 0.09, graine: sg > 0 ? 15 : 16 });
        semerTaches(L, r, [bi, [[3.3, sg * 0.98], [3.05, sg * 1.3]]], { pas: 0.4, r0: 0.03, r1: 0.08, jit: 0.12, couleurs: ['#1b1e22', '#2b2f35'] });
        semerTaches(L, r, [[[1.4, sg * 0.8], [-0.6, sg * 0.98]], [[-1.0, sg * 0.82], [-3.5, sg * 0.84]]], { pas: 0.8, r0: 0.03, r1: 0.07, jit: 0.04 });
      }
      B.push({ pts: [[-3.36, -0.6], [-3.36, 0.6]], l0: 0.03, l1: 0.07, graine: 17 });
      for (let i = 0; i < 6; i++) L.push({ u: -3.5 + r() * 7.2, v: (r() - 0.5) * 2.4, r: 0.02 + r() * 0.04, c: '#2b2f35', graine: Math.floor(r() * 1e9) });
      for (const b of B) bande(g, U, Vz, b);
      for (const e of L) tache(g, U, Vz, e);
      griffures(g, U, Vz, r, 70, -3.6, 3.9, -1.6, 1.6);
    }
    // flancs : arête haute des pontons, flanc du nez, taches basses et sur l'arrière (deux côtés différents)
    {
      const r = hasard(2626);
      for (const s of [0, 1]) {
        const Uc = Uf(s), L = [];
        const bandes = [{ pts: [[1.0, 1.98], [1.9, 1.8], [2.8, 1.66], [3.3, 1.42]], l0: 0.03, l1: 0.09, graine: 21 + s },
          { pts: [[3.95, 0.72], [3.6, 1.05], [3.2, 1.3]], l0: 0.03, l1: 0.08, graine: 23 + s }];
        semerTaches(L, r, [[[1.2, 0.55], [1.5, 1.4]], [[-0.9, 1.5], [0.7, 1.58]], [[-3.8, 0.6], [-3.6, 1.35]]], { pas: 0.4, r0: 0.04, r1: 0.1, jit: 0.05 });
        semerTaches(L, r, [[[-3.4, 1.38], [-1.4, 1.42]], [[-1.3, 0.55], [0.6, 0.6]]], { pas: 0.8, r0: 0.03, r1: 0.08, jit: 0.04 });
        for (const b of bandes) bande(g, Uc, Vy, b);
        for (const e of L) tache(g, Uc, Vy, e);
        griffures(g, Uc, Vy, r, 36, -3.6, 3.9, 0.5, 1.9, 0.06, 0.3);
      }
    }
  }, BOX);

  /* ---------------------------------------------------------------- pièces transparentes (neuf) : verrière et caches latéraux */
  const carenage = new THREE.Group(); carenage.userData.pivot = true; a.ajouter(carenage);
  {
    // verrière basse en goutte au-dessus de la fente (le pilote est au fond : on voit le siège sombre au travers)
    const STb = stations(abscisses(-0.9, 1.92, 0.08), {
      y0: [[-0.9, 1.5], [1.92, 1.5]],
      y1: [[-0.9, 1.72], [-0.6, 1.98], [0.1, 2.12], [0.8, 2.06], [1.5, 1.86], [1.92, 1.66]],
      w: [[-0.9, 0.24], [-0.6, 0.34], [0.2, 0.36], [1.2, 0.3], [1.92, 0.14]],
      nt: 2.4, nb: 3, wt: 0.7,
    });
    const v = coque(a, STb, bleu, { nx: 60, ns: 36, ordre: 4 }); carenage.add(v);
    // caches latéraux : coques minces drapées sur les cavités des flancs (même plastique)
    for (const sg of [-1, 1]) {
      const c = nappe(a, (u, w) => {
        const t = u * 2 * Math.PI, k = w, c0 = Math.cos(t), s0 = Math.sin(t);
        const x = CAV.xc + (CAV.ax + 0.04) * k * Math.sign(c0) * Math.sqrt(Math.abs(c0)), y = CAV.yc + (CAV.ay + 0.04) * k * Math.sign(s0) * Math.sqrt(Math.abs(s0));
        return [x, y, sg * (S.flanc(ST, x, y) + 0.035 + 0.02 * (1 - k * k))];
      }, 40, 6, bleu, 4);
      carenage.add(c);
    }
  }

  /* ---------------------------------------------------------------- débris de l'épave : axes de charnières tordus */
  const debris = new THREE.Group(); debris.userData.pivot = true; a.ajouter(debris);
  for (const sg of [-1, 1]) for (const x of CHAPES) {
    const m = poutre(a, [x - 0.16, yH, sg * zH], [x + 0.14, yH + 0.07, sg * (zH + 0.06)], 0.04, 0, zamac, true); debris.add(m);   // axe faussé, arraché de la pièce
  }

  /* ---------------------------------------------------------------- ailes (neuf) : deux grandes flèches translucides sur charnière x */
  // contour relevé sur la vue de dessus (ailes déployées) : [x, distance à la charnière] — racine, lame avant en canard,
  // échancrure, grande lame arrière en pointe (repliée, sa pointe touche le saumon de la dérive)
  const AILE = [[0.53, 0], [1.15, 1.55], [0.43, 1.68], [-0.71, 0.62], [-3.49, 2.44], [-3.07, 1.31], [-2.15, 0.7], [-1.73, 0.26], [-1.7, 0]];
  const ANG = { pli: 0.21, diedre: 0.07 };                       // repliées : penchées de 12° vers la dérive ; déployées : léger dièdre
  const faireAile = (sg) => {
    const piv = new THREE.Group(); piv.position.set(0, yH, sg * zH); piv.userData.pivot = true; a.ajouter(piv);
    // la pièce est construite « debout » dans le plan local (x, y) : y local = distance à la charnière, épaisseur en z local
    const pl = plaqueLocale(a, AILE, 0.07, bleu, 0.015); pl.renderOrder = 3; piv.add(pl);
    // nervures moulées (bord d'attaque épaissi, raidisseurs) et noeuds de charnière, même plastique
    const nerf = (p, q, l = 0.07) => { const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy), nx = -dy / d * l / 2, ny = dx / d * l / 2;
      const m = plaqueLocale(a, [[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny], [q[0] - nx, q[1] - ny], [p[0] - nx, p[1] - ny]], 0.13, bleu, 0); m.renderOrder = 3; piv.add(m); };
    nerf([0.6, 0.2], [1.08, 1.45]); nerf([-0.75, 0.68], [-3.3, 2.28]); nerf([-1.0, 0.3], [-2.9, 1.5], 0.05); nerf([0.4, 0.06], [-1.6, 0.06], 0.1);
    for (const x of [0.22, -1.05]) { const k = new THREE.Mesh(a.garde(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 12)), bleu); k.rotation.z = Math.PI / 2; k.position.set(x, 0, 0); k.renderOrder = 3; piv.add(k); }
    return piv;
  };
  const aileG = faireAile(-1), aileD = faireAile(1);           // gauche = −z (conducteur regardant +x), droite = +z

  /* ---------------------------------------------------------------- dérive : entière (neuf) ; tige et tronçon cassés (épave) */
  const derive = new THREE.Group(); derive.userData.pivot = true; a.ajouter(derive);
  const dPrisme = (pts, z0, z1, mat, grp) => { const m = prisme(a, pts, z0, z1, mat, 0.015); grp.add(m); return m; };
  // cadre ajouré : longeron de bord d'attaque (de l'arceau vers le haut et l'arrière), montant arrière posé sur la poupe,
  // saumon en Y ; entre les deux, on voit au travers (les ailes repliées, le ciel)
  derive.add(tuyau(a, [[-1.1, 1.94, 0], [-1.7, 2.38, 0], [-2.4, 2.92, 0], [-2.95, 3.24, 0]], 0.085, carro, 18, 8));   // longeron (la tige qui survit sur l'épave)
  dPrisme([[-1.1, 1.84], [-1.75, 2.24], [-1.75, 2.08], [-1.2, 1.72]], -0.05, 0.05, carro, derive);   // gousset sur l'arceau
  dPrisme([[-3.42, 1.42], [-3.72, 1.42], [-3.94, 3.3], [-3.62, 3.3]], -0.065, 0.065, carro, derive);   // montant arrière
  dPrisme([[-2.78, 3.2], [-3.95, 3.2], [-3.98, 3.36], [-2.86, 3.33]], -0.11, 0.11, carro, derive);   // âme du saumon
  for (const sg of [-1, 1]) {                                    // saumon en V : deux bras qui remontent vers l'extérieur
    const piv = new THREE.Group(); piv.position.set(0, 3.3, 0); piv.rotation.x = -sg * 0.42; derive.add(piv);
    piv.add(prisme(a, [[-2.8, -0.05], [-3.9, -0.03], [-3.96, 0.06], [-2.92, 0.04]], 0, sg * 0.58, carro, 0.012));
  }
  const moignon = new THREE.Group(); moignon.userData.pivot = true; a.ajouter(moignon);
  {
    // fine tige claire recourbée (longeron de la dérive) : de l'arceau vers l'arrière, au-dessus du moteur, cassée net près de la poupe
    moignon.add(tuyau(a, [[-1.12, 1.96, 0], [-1.7, 2.2, 0], [-2.45, 2.2, 0.01], [-3.05, 2.04, 0.04], [-3.3, 1.92, 0.05]], 0.055, plastiqueCasse, 24, 8));
    const bout = new THREE.Mesh(a.garde(new THREE.ConeGeometry(0.05, 0.12, 8)), plastiqueCasse); bout.position.set(-3.34, 1.9, 0.05); bout.rotation.z = 2.0; moignon.add(bout);   // cassure en biseau
    // tronçon de poupe : bord de fuite de la dérive, incliné vers l'arrière, cassé en biseau dentelé
    const r = hasard(2024), cassure = [];
    for (let i = 0; i <= 5; i++) { const t = i / 5; cassure.push([-3.79 + 0.32 * t + (r() - 0.5) * 0.03, 2.05 - 0.28 * t + (i % 2 ? 0.07 : -0.02) + (r() - 0.5) * 0.05]); }
    dPrisme([[-3.42, 1.42], [-3.72, 1.42], ...cassure], -0.065, 0.065, carro, moignon);
    dPrisme([...cassure.map(([x, y]) => [x + 0.004, y + 0.006]), ...[...cassure].reverse().map(([x, y]) => [x - 0.03, y - 0.05])], -0.07, 0.07, plastiqueCasse, moignon);   // tranche à vif
  }

  /* ---------------------------------------------------------------- passages de roues, puis fusion par matériau */
  const groupes = [aileG, aileD, derive, moignon, debris, carenage];
  for (const p of groupes) p.traverse((o) => { if (o.isMesh) o.userData.drame = true; });
  a.degager(R, { jeu: 0.07, ep: 0.04, sauf: (m) => m.userData.drame });
  fusionnerParMateriau(a, ctx.chassis, { garder: (m) => m.material === lumBlanche || m.material === lumRouge });
  for (const p of groupes) fusionnerParMateriau(a, p);

  /* ---------------------------------------------------------------- contrat « drame » */
  const lerp = (u, v, k) => u + (v - u) * k;
  const montrer = (p, oui) => { p.visible = oui; p.scale.setScalar(oui ? 1 : 0.001); };
  let uAiles = 1;
  const drame = {
    /** Mélange continu des matériaux et de l'usure : 0 = neuf, 1 = épave. */
    teinte(k) {
      const t = Math.min(1, Math.max(0, k));
      for (const e of ETATS) {
        e.m.color.copy(e.c[0]).lerp(e.c[1], t);
        if (e.r) e.m.roughness = lerp(e.r[0], e.r[1], t);
        if (e.me) e.m.metalness = lerp(e.me[0], e.me[1], t);
        if (e.cc) e.m.clearcoatRoughness = lerp(e.cc[0], e.cc[1], t);
        if (e.ei) e.m.envMapIntensity = lerp(e.ei[0], e.ei[1], t);
        if (e.op) e.m.opacity = lerp(e.op[0], e.op[1], t);
      }
      usure.opacity = t; usure.visible = t > 0.002;
    },
    /**
     * Ailes : u = 0 repliées (dressées à la verticale, penchées vers la dérive), u = 1 déployées (à l'horizontale, léger
     * dièdre). Interpolation douce (smoothstep) ; rotation AUTOUR DE L'AXE X de chaque charnière (origine des pièces).
     */
    deploiement(u) {
      uAiles = Math.min(1, Math.max(0, u)); const s = uAiles * uAiles * (3 - 2 * uAiles);
      for (const [p, sg] of [[aileG, -1], [aileD, 1]]) p.rotation.set(sg * (-ANG.pli + (Math.PI / 2 + ANG.pli - ANG.diedre) * s), 0, 0);
    },
    /** Déploiement courant des ailes (0 → 1). */
    get ailes() { return uAiles; },
    /** État neuf : ailes DÉPLOYÉES, dérive entière, pièces transparentes en place, moignons cachés, couleurs neuves. */
    neuf() {
      for (const p of [aileG, aileD, derive]) montrer(p, true);
      montrer(carenage, true); moignon.visible = false; debris.visible = false; drame.deploiement(1); drame.teinte(0);
    },
    /** État épave (par défaut) : ailes perdues, dérive cassée, pièces transparentes brisées (cachées et rétractées), usure. */
    epave() {
      for (const p of [aileG, aileD, derive]) montrer(p, false);
      montrer(carenage, false); moignon.visible = true; debris.visible = true; drame.teinte(1);
    },
    pieces: { aileG, aileD, derive },
  };
  drame.epave();
  ctx.chassis.userData.drame = drame;                          // aussi joignable depuis le bolide construit (m.chassis.userData.drame)
  return { L: 7.98, largeur: 2 * zExt, hauteur: 2.56, xAvant: 4.07, xArriere: -3.93, roues: R, plafond: 0.53, drame };   // plafond : pavillon 1,75 / largeur hors tout 3,34 (mesurés au banc, épave)
}

export const V9_EPAVE = { N12: epave, N13: jetThreat };
