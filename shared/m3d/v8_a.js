/* V8 — escouade A : nouveaux bolides de l'atelier photo du 15 octobre 2026.
 *   N01 « Rapid Pulse » (ambulance compacte Hot Wheels, casting imaginaire)
 *   N02 « Pedal Driver » (voiture à pédales années 50 gonflée en dragster, casting imaginaire)
 *   N04 Mercedes-Benz CLA C178 électrique (2025), version course Hot Wheels
 *   N05 Toyota Prius 5e génération (2023), version custom Hot Wheels
 *
 * Méthode (reprise du chantier V5, module v5_europe) : chaque caisse est un loft de superellipses (aide_2) dont les stations
 * sont tirées de COURBES de profil (ligne haute, bas de caisse, demi-largeur en plan). Pour les voitures réelles, les courbes
 * sont relevées sur les cotes constructeur mises à l'échelle (1 m réel = 1,75 unité). La serre est un second loft plus étroit
 * (tumblehome) ; les vitrages sont des décalques de verre brillants drapés exactement sur cette serre peinte, si bien que les
 * montants gardent leur vraie épaisseur. Les passages de roues sont recoupés par `degager` (aucune tôle dans l'anneau visible
 * d'un pneu) et aucun décalque n'entre dans un passage de roue. `plafond` = hauteur de pavillon / largeur hors tout.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo, aucune marque : formes, couleurs, numéros et mots génériques.
 */
import { aide } from './aide_2.js';

/* ================================================================== outils propres au module */

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
/** Abscisses de x0 à x1 : pas régulier `pas`, plus des abscisses imposées (bords francs), triées et dédoublonnées. */
function abscisses(x0, x1, pas, extra = []) {
  const xs = [...extra]; for (let x = x0; x <= x1 + 1e-9; x += pas) xs.push(+x.toFixed(4));
  xs.push(x0, x1); return [...new Set(xs.map((v) => +v.toFixed(4)))].filter((v) => v >= x0 - 1e-9 && v <= x1 + 1e-9).sort((p, q) => p - q);
}

/** Outils de surface exacts sur un loft aide_2 (conicité `wt` du haut de section comprise). */
function surfaces(a) {
  /** Demi-largeur de la surface à la hauteur y (station interpolée en x). */
  const flanc = (st, x, y) => {
    const s = a.stAt(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.max(-0.9999, Math.min(0.9999, (y - yc) / hh));
    const n = yy >= 0 ? s.nt : s.nb, zz = Math.pow(1 - Math.pow(Math.abs(yy), n), 1 / n), k = yy > 0 ? 1 - (1 - s.wt) * yy : 1;
    return s.w * zz * k;
  };
  /** Hauteur du dessus de la surface à la position latérale z (dichotomie sur la moitié haute de la section). */
  const haut = (st, x, z) => {
    const s = a.stAt(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, az = Math.abs(z);
    const zDe = (yy) => s.w * Math.pow(1 - Math.pow(yy, s.nt), 1 / s.nt) * (1 - (1 - s.wt) * yy);
    if (az >= zDe(0)) return yc;
    let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (zDe(m) > az) lo = m; else hi = m; }
    return yc + hh * lo;
  };
  /** Abscisse de la surface du loft au point (y, z), vue de l'avant (sens +1) ou de l'arrière (−1) ; NaN hors silhouette. */
  const bout = (st, y, z, sens) => {
    const xa = st[0].x, xb = st[st.length - 1].x, dans = (x) => { const s = a.stAt(st, x); return y > s.y0 && y < s.y1 && flanc(st, x, y) >= Math.abs(z); };
    const pas = 0.04, n = Math.ceil((xb - xa) / pas);
    for (let i = 0; i <= n; i++) {
      const x = sens > 0 ? xb - i * pas : xa + i * pas;
      if (dans(x)) { let lo = x, hi = x + sens * pas; for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; if (dans(m)) lo = m; else hi = m; } return lo; }
    }
    return NaN;
  };
  return { flanc, haut, bout };
}

/** Nappe paramétrique (u, v) ∈ [0,1]² → [x, y, z] ; uv de texture = (u, v) ; `garder` filtre les quadrilatères. */
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
/** Matériau de décalque : 'verre' (vitrage brillant teinté), 'peint' (autocollant verni), 'lum' (feu émissif), 'mat'. */
function matDecal(a, draw, cw, ch, genre = 'peint') {
  const { THREE } = a, map = texture(a, draw, cw, ch);
  const base = { map, transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false, envMap: a.envMap };
  if (genre === 'verre') return a.garde(new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.04, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0 }));
  if (genre === 'lum') return a.garde(new THREE.MeshBasicMaterial({ ...base, envMap: null, toneMapped: false }));
  if (genre === 'mat') return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0, envMapIntensity: 0.4 }));
  return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.12 }));
}

/**
 * Décalques drapés EXACTEMENT sur un loft.
 * cote(st, x0, x1, yb, yt, dessin(g, X, Y, sg, w, h), …) : sur les deux flancs ; côté −z, X est inversé → le canvas est lu à
 *   l'endroit des deux côtés (textes lisibles), motifs aux mêmes abscisses véhicule.
 * dessus(st, x0, x1, z0, z1, dessin(g, X, Z, w, h), …) : vu de dessus, nez à droite.
 * face(st, sens, z0, z1, yb, yt, dessin(g, Z, Y, w, h), …) : face avant (sens +1) ou arrière (−1), lue à l'endroit.
 * `roues` : aucun quadrilatère de décalque dans un passage de roue.
 */
function drapes(a, S) {
  const horsRoues = (R, k = 1.16) => (R ? (x, y) => R.every((r) => Math.hypot(x - r.x, y - (r.y ?? r.RW)) > r.RW * k + 0.04) : null);
  const cote = (st, x0, x1, yb, yt, dessin, { cw = 2048, ch = 512, eps = 0.016, genre = 'peint', nu = 140, nv = 30, roues = null } = {}) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb), r = [];
    for (const sg of [1, -1]) {
      const X = (x) => (sg > 0 ? x - x0 : x1 - x) * sx, Y = (y) => (yt - y) * sy;
      const mat = matDecal(a, (g, w, h) => dessin(g, X, Y, sg, w, h), cw, ch, genre);
      r.push(nappe(a, (u, v) => {
        const x = sg > 0 ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u, y = yb + (yt - yb) * v;
        return [x, y, sg * (S.flanc(st, x, y) + eps)];
      }, nu, nv, mat, 2, horsRoues(roues)));
      r[r.length - 1].userData.decal = true;
    }
    return r;
  };
  const dessus = (st, x0, x1, z0, z1, dessin, { cw = 1024, ch = 512, eps = 0.016, genre = 'peint', nu = 100, nv = 40, roues = null } = {}) => {
    const sx = cw / (x1 - x0), sz = ch / (z1 - z0), X = (x) => (x - x0) * sx, Z = (z) => (z - z0) * sz;
    const mat = matDecal(a, (g, w, h) => dessin(g, X, Z, w, h), cw, ch, genre);
    const m = nappe(a, (u, v) => { const x = x0 + (x1 - x0) * u, z = z1 - (z1 - z0) * v; return [x, S.haut(st, x, z) + eps, z]; }, nu, nv, mat, 2, horsRoues(roues));
    m.userData.decal = true; return m;
  };
  const face = (st, sens, z0, z1, yb, yt, dessin, { cw = 1024, ch = 512, eps = 0.012, genre = 'peint', nu = 90, nv = 50, xLim = null } = {}) => {
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

/** Polygone (points monde [x, y]) rempli sur un canvas de décalque, coins arrondis optionnels (rayon en pixels). */
function poly(g, X, Y, pts, couleur, rayon = 0) {
  g.fillStyle = couleur; g.beginPath();
  if (!rayon) pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  else {
    const P = pts.map(([x, y]) => [X(x), Y(y)]), n = P.length;
    for (let i = 0; i < n; i++) {
      const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n];
      const d1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), r = Math.min(rayon, d1 / 2, d2 / 2);
      const a1 = [p1[0] + (p0[0] - p1[0]) * r / d1, p1[1] + (p0[1] - p1[1]) * r / d1], a2 = [p1[0] + (p2[0] - p1[0]) * r / d2, p1[1] + (p2[1] - p1[1]) * r / d2];
      if (i) g.lineTo(...a1); else g.moveTo(...a1);
      g.quadraticCurveTo(p1[0], p1[1], a2[0], a2[1]);
    }
  }
  g.closePath(); g.fill();
}
/** Verre de vitrage peint sur un décalque : teinte + reflet diagonal doux. */
function verrePeint(g, X, Y, pts, teinte, rayon = 10, reflet = 'rgba(255,255,255,0.12)') {
  poly(g, X, Y, pts, teinte, rayon);
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = reflet;
  const xs = pts.map((p) => X(p[0])), ys = pts.map((p) => Y(p[1])), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), L = x1 - x0;
  g.beginPath(); g.moveTo(x0 + L * 0.15, y1); g.lineTo(x0 + L * 0.42, y0); g.lineTo(x0 + L * 0.55, y0); g.lineTo(x0 + L * 0.28, y1); g.closePath(); g.fill(); g.restore();
}
/** Texte centré (cx, cy) en pixels canvas, italique simulé possible (inclinaison `penche`). */
function texte(g, t, cx, cy, police, couleur, trait, penche = 0) {
  g.save(); g.translate(cx, cy); if (penche) g.transform(1, 0, -penche, 1, 0, 0);
  g.font = police; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (trait) { g.lineJoin = 'round'; g.lineWidth = trait.l; g.strokeStyle = trait.c; g.strokeText(t, 0, 0); }
  g.fillStyle = couleur; g.fillText(t, 0, 0); g.restore();
}

/** Pièce orientée entre deux points 3D (montant, tube, barre) : boîte ou cylindre. */
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
/** Prisme vu de face : contour (z, y) extrudé en x de x0 vers x1 (calandres, feux, diffuseurs). */
function prismeX(a, ptsZY, x0, x1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); ptsZY.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(x1 - x0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2); g.translate(Math.max(x0, x1), 0, 0); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}
/** Plaque vue de dessus : contour (x, z) extrudé en y de y0 à y1 (planchers, plateaux, ailerons). */
function plaqueY(a, ptsXZ, y0, y1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); ptsXZ.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(y1 - y0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, Math.min(y0, y1), 0); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}

/** Passages de roues du loft : arche ronde à jeu constant (RW + jeu), découpée seulement à l'extérieur de la face interne du pneu. */
const archesJeu = (R, jeu = 0.14) => R.map((r) => ({ x: r.x, R: r.RW + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.03 }));
/** Roue posée : pneu dont la face extérieure affleure la demi-largeur `zExt`. */
const roue = (x, RW, ep, zExt, avant, extra = {}) => ({ x, RW, ep, z: zExt - ep / 2, y: RW, avant, ...extra });
/** Matériau émissif coloré (feux, gyrophares : JAMAIS dans les roues). */
const lumiere = (a, hex, k = 1.6) => a.garde(new a.THREE.MeshBasicMaterial({ color: new a.THREE.Color(hex).multiplyScalar(k), toneMapped: false }));

/** Raccourcit (k < 1) ou allonge toute la caisse en x : transformations « cuites » dans les sommets de chaque pièce. */
function etirerX(a, chassis, k) {
  const { THREE } = a; chassis.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(chassis.matrixWorld).invert(), M = new THREE.Matrix4(), S = new THREE.Matrix4().makeScale(k, 1, 1), meshes = [];
  chassis.traverse((m) => { if (m.isMesh && m.geometry?.attributes?.position) meshes.push(m); });
  for (const m of meshes) {
    M.multiplyMatrices(inv, m.matrixWorld); const g = a.garde(m.geometry.clone()); g.applyMatrix4(M); g.applyMatrix4(S);
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    const ud = m.userData; m.geometry = g; if (m.parent !== chassis) chassis.add(m);
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix(); m.userData = ud;
  }
  for (const c of [...chassis.children]) if (!c.isMesh && c.children.length === 0) chassis.remove(c);
}

/** Contexte de modélisation commun (laque à reflet d'environnement dosé : couleurs franches sous l'éclairage néon du banc). */
function atelier(ctx) {
  const a = aide(ctx); a.garde = ctx.garde; a.envMap = ctx.envMap; a.THREE = ctx.THREE;
  const pein0 = a.pein; a.pein = (hex, r) => { const m = pein0(hex, r); m.envMapIntensity = 0.14; return m; };
  /** Laque métallisée vernie (gris argent, chrome peint). */
  a.metal = (hex, r = 0.32, m = 0.55) => { const x = pein0(hex, r); x.metalness = m; x.envMapIntensity = 0.45; return x; };
  const S = surfaces(a), D = drapes(a, S);
  return { a, S, D };
}

/* ================================================================== N04 : Mercedes-Benz CLA C178 (2025), version course */
/**
 * Cotes réelles : 4 723 × 1 855 × 1 468 mm, empattement 2 790. Échelle 1,75 u/m → L 8,27 ; empattement 4,88 ;
 * demi-largeur 1,62 ; pavillon 2,57 en réel, ramené à 2,29 sur la miniature abaissée. Porte-à-faux avant 0,93 m, arrière 1,0 m.
 * Berline coupé quatre portes « fastback » très fluide : nez bas et arrondi, capot long et plongeant, pare-brise très couché,
 * pavillon en arc continu qui file jusqu'à une malle courte relevée en canard ; vitrages sans cadre, épaule marquée.
 * Version course de la miniature : pavillon abaissé (serre basse façon coupé, pare-brise et lunette plus couchés), caisse abaissée, élargisseurs d'ailes, lame avant, bas de caisse, diffuseur, grand aileron
 * sur cols de cygne, bandeau lumineux avant sur toute la largeur. Livrée : bleu ciel, capot bleu nuit à graphismes roses,
 * pavillon et vitrages roses, grand « 68 » blanc sur la portière, motifs génériques rose / bleu nuit. AUCUNE étoile, aucun logo.
 */
function cla(ctx) {
  const { lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx);
  const bleu = a.pein('#3d8fe0', 0.2), nuit = a.pein('#1a2346', 0.28), noir = a.mate('#101216', 0.5, 0.35), dark = a.mate('#07080a', 0.9, 0.1);
  const carbone = a.mate('#1b1d22', 0.4, 0.5);
  const RW = 0.64, ep = 0.48, xA = 2.5, xR = -2.38, wAile = 1.64;
  const R = [roue(xA, RW, ep, wAile + 0.01, true, { jante: '#16171b', rayons: 'cinqCreux', levre: 0.04, flanc: '#ff7a1a' }),
             roue(xR, RW, ep, wAile + 0.01, false, { jante: '#16171b', rayons: 'cinqCreux', levre: 0.04, flanc: '#ff7a1a' })];
  // caisse : nez bas arrondi, capot plongeant, épaule continue, malle courte relevée ; élargisseurs au droit des roues
  const ST = stations(abscisses(-4.13, 4.13, 0.12, [-4.08, -4.0, 4.0, 4.08]), {
    y1: [[-4.13, 1.34], [-4.06, 1.56], [-3.85, 1.68], [-3.4, 1.7], [-2.4, 1.66], [-1.0, 1.62], [0.4, 1.58], [1.6, 1.54], [2.6, 1.44], [3.4, 1.28], [3.85, 1.1], [4.06, 0.9], [4.13, 0.72]],
    y0: [[-4.13, 0.6], [-4.0, 0.42], [-3.6, 0.3], [3.6, 0.28], [4.0, 0.36], [4.13, 0.46]],
    w: [[-4.13, 1.22], [-4.0, 1.42], [-3.6, 1.54], [-2.9, 1.62], [-2.38, wAile], [-1.8, 1.6], [-1.1, 1.55], [0.5, 1.54], [1.4, 1.57], [2.0, 1.62], [2.5, wAile], [3.1, 1.6], [3.6, 1.5], [3.95, 1.32], [4.13, 1.02]],
    nt: 4.2, nb: 4.5, wt: 0.9,
  });
  a.loft(ST, bleu, { arches: archesJeu(R, 0.07), nx: 220 }); a.puits(R, dark, ST);
  // serre fastback : pare-brise très couché, arc de pavillon continu jusqu'à la malle (tumblehome marqué)
  const STg = stations(abscisses(-3.8, 1.95, 0.1), {
    y1: [[-3.8, 1.62], [-3.4, 1.72], [-2.7, 1.9], [-1.8, 2.11], [-0.9, 2.24], [-0.25, 2.27], [0.35, 2.21], [0.95, 2.02], [1.5, 1.76], [1.95, 1.54]],
    y0: 1.15, w: [[-3.8, 1.28], [-3.2, 1.42], [-1.5, 1.47], [0.5, 1.46], [1.5, 1.4], [1.9, 1.32]], nt: 3.0, nb: 3.0, wt: 0.68,
  });
  a.loft(STg, nuit, { nx: 140, ns: 64 });
  // pavillon rose vif peint (du haut du pare-brise au haut de la lunette)
  D.dessus(STg, -2.25, 0.35, -1.3, 1.3, (g, X, Z) => {
    poly(g, X, Z, [[0.3, -1.0], [0.3, 1.0], [-2.2, 0.95], [-2.2, -0.95]], '#ff4fa3', 30);
  }, { cw: 900, ch: 600, eps: 0.012 });
  // vitrages roses (comme la miniature) : pare-brise, lunette, glaces latérales sans cadre (montant B noir)
  const vit = '#d0367f', vitF = '#b62a6c';
  D.dessus(STg, -3.7, 1.9, -1.45, 1.45, (g, X, Z) => {
    verrePeint(g, X, Z, [[1.82, -1.12], [1.82, 1.12], [0.36, 0.96], [0.36, -0.96]], vit, 20);
    verrePeint(g, X, Z, [[-2.25, -0.95], [-2.25, 0.95], [-3.55, 1.0], [-3.55, -1.0]], vitF, 20);
  }, { genre: 'verre', cw: 1600, ch: 640 });
  D.cote(STg, -3.6, 1.95, 1.5, 2.28, (g, X, Y) => {
    verrePeint(g, X, Y, [[1.62, 1.68], [0.3, 2.12], [-0.6, 2.18], [-0.6, 1.7]], vit, 10);            // glace avant
    verrePeint(g, X, Y, [[-0.75, 1.7], [-0.75, 2.18], [-1.75, 2.06], [-2.7, 1.84], [-3.1, 1.72]], vit, 16);   // glace arrière + custode
                            // jonc de ceinture clair
  }, { genre: 'verre', cw: 1600, ch: 360 });
  // capot bleu nuit : éclairs roses, empreintes de pneu stylisées, grand « 68 » rose (générique)
  D.dessus(ST, 1.55, 4.1, -1.6, 1.6, (g, X, Z, w, h) => {
    g.fillStyle = '#1a2346'; g.beginPath(); g.moveTo(X(1.6), Z(-1.18)); g.lineTo(X(3.2), Z(-1.3)); g.lineTo(X(3.85), Z(-1.05)); g.lineTo(X(4.05), Z(-0.5));
    g.lineTo(X(4.05), Z(0.5)); g.lineTo(X(3.85), Z(1.05)); g.lineTo(X(3.2), Z(1.3)); g.lineTo(X(1.6), Z(1.18)); g.closePath(); g.fill();
    g.fillStyle = '#3d8fe0'; for (let i = 0; i < 7; i++) g.fillRect(X(2.45 + i * 0.16), Z(0.2), X(0.08) - X(0), Z(0.75) - Z(0.2));   // bandes de roulement stylisées
    g.fillStyle = '#ff4fa3';
    const eclair = (x, z, s) => { g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x + 0.3 * s), Z(z + 0.08)); g.lineTo(X(x + 0.2 * s), Z(z + 0.14)); g.lineTo(X(x + 0.5 * s), Z(z + 0.24)); g.lineTo(X(x + 0.16 * s), Z(z + 0.12)); g.lineTo(X(x + 0.25 * s), Z(z + 0.06)); g.closePath(); g.fill(); };
    for (const [x, z, s] of [[1.75, -0.95, 1.2], [2.3, -0.5, 0.9], [3.2, 0.85, 1.0], [2.0, 0.6, 1.1], [3.4, -0.85, 0.8], [2.7, -1.1, 0.9]]) eclair(x, z, s);
    g.save(); g.translate(X(2.7), Z(-0.5)); g.rotate(Math.PI / 2); texte(g, '68', 0, 0, `italic 900 ${Math.round((X(1) - X(0)) * 0.42)}px Arial Black, Arial`, '#ff4fa3', { l: 10, c: '#ffffff' }); g.restore();
  }, { cw: 1400, ch: 1100, roues: R });
  // flancs : bas de caisse noir, panneau bleu nuit à motifs roses sur la custode, grand « 68 » blanc sur la portière
  D.cote(ST, -4.1, 4.1, 0.3, 1.66, (g, X, Y) => {
    poly(g, X, Y, [[3.7, 0.3], [3.7, 0.5], [-3.7, 0.52], [-3.7, 0.3]], '#111318');                     // bas de caisse
    poly(g, X, Y, [[0.1, 0.55], [-0.6, 1.5], [-3.0, 1.58], [-3.9, 1.5], [-3.9, 0.6]], '#1a2346', 18);   // panneau bleu nuit arrière
    g.strokeStyle = '#ff4fa3'; g.lineWidth = 9; g.lineJoin = 'round';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(X(-0.5 - k * 0.7), Y(0.7)); g.lineTo(X(-0.8 - k * 0.7), Y(1.1)); g.lineTo(X(-0.62 - k * 0.7), Y(1.08)); g.lineTo(X(-0.95 - k * 0.7), Y(1.45)); g.stroke(); }
    g.fillStyle = '#ff4fa3'; for (let k = 0; k < 6; k++) g.fillRect(X(-1.0 - k * 0.42), Y(0.66), X(0.16) - X(0), Y(0.6) - Y(0.66));
    poly(g, X, Y, [[3.9, 1.1], [2.8, 1.22], [1.8, 1.32], [1.8, 1.27], [2.8, 1.17], [3.9, 1.04]], '#ff4fa3');   // filet rose d'aile avant
    texte(g, '68', X(0.95), Y(0.98), `italic 900 ${Math.round((Y(0) - Y(1)) * 0.62)}px Arial Black, Arial`, '#ffffff', { l: 14, c: '#ff4fa3' }, 0.12);
    g.strokeStyle = 'rgba(10,20,40,0.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(1.62), Y(1.45)); g.lineTo(X(1.55), Y(0.55)); g.moveTo(X(-0.7), Y(1.5)); g.lineTo(X(-0.62), Y(0.55)); g.stroke();
  }, { cw: 2600, ch: 460, roues: R });
  // face avant : bouclier bleu nuit, calandre noire à pointillés (générique), bandeau lumineux pleine largeur, phares effilés
  D.face(ST, 1, -1.5, 1.5, 0.3, 1.2, (g, Z, Y) => {
    poly(g, Z, Y, [[-0.95, 0.62], [0.95, 0.62], [1.05, 1.02], [-1.05, 1.02]], '#0d0f14', 24);
    g.fillStyle = '#5b6170'; for (let i = 0; i < 24; i++) for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(Z(-0.92 + i * 0.08 + (k % 2) * 0.04), Y(0.68 + k * 0.075), 4, 0, 7); g.fill(); }
    poly(g, Z, Y, [[-1.45, 0.32], [1.45, 0.32], [1.45, 0.52], [-1.45, 0.52]], '#111318');
    for (const s of [-1, 1]) poly(g, Z, Y, [[s * 1.12, 0.62], [s * 1.42, 0.7], [s * 1.42, 0.95], [s * 1.12, 0.78]], '#0d0f14', 8);   // prises d'air d'angle
  }, { cw: 1400, ch: 600, xLim: 3.7 });
  const xb = (y, z) => S.bout(ST, y, z, 1);
  tuyau(a, [-1.32, -1.1, -0.6, 0, 0.6, 1.1, 1.32].map((z) => [xb(1.1, z) + 0.01, 1.1 - Math.abs(z) * 0.02, z]), 0.035, lumBlanche, 60, 8);   // bandeau lumineux pleine largeur
  for (const sg of [-1, 1]) tuyau(a, [0.95, 1.15, 1.35, 1.48].map((z, i) => [xb(1.04 - i * 0.02, sg * z) + 0.008, 1.04 - i * 0.02, sg * z]), 0.05, lumBlanche, 20, 8);   // phares effilés
  // lame avant, bas de caisse et élargisseurs noirs (carbone)
  plaqueY(a, [[4.19, -1.2], [4.19, 1.2], [3.7, 1.42], [3.7, -1.42]], 0.2, 0.26, carbone, 0.01);
  for (const sg of [-1, 1]) prisme(a, [[1.85, 0.24], [-1.6, 0.24], [-1.6, 0.4], [1.85, 0.4]], sg * 1.48, sg * 1.66, carbone);
  for (const r of R) for (const sg of [-1, 1]) a.arcGarde(r.x, r.y, r.RW + 0.1, r.RW + 0.2, sg * (wAile - 0.05), 0.16, carbone, -0.05, Math.PI + 0.05);
  // rétroviseurs bleu nuit sur pied
  for (const sg of [-1, 1]) { poutre(a, [1.45, 1.55, sg * 1.38], [1.42, 1.7, sg * 1.52], 0.04, 0, nuit, true); prisme(a, [[1.55, 1.66], [1.25, 1.68], [1.22, 1.84], [1.48, 1.82]], sg * 1.44, sg * 1.66, nuit, 0.02); }
  // arrière : bandeau de feux pleine largeur, diffuseur à ailettes, grand aileron sur cols de cygne
  const xr = (y, z) => S.bout(ST, y, z, -1);
  tuyau(a, [-1.3, -0.8, 0, 0.8, 1.3].map((z) => [xr(1.42, z) - 0.01, 1.42, z]), 0.05, lumRouge, 40, 8);
  prismeX(a, [[-1.3, 0.22], [1.3, 0.22], [1.2, 0.6], [-1.2, 0.6]], -4.0, -4.3, carbone);
  for (let i = -3; i <= 3; i++) a.boite(0.4, 0.3, 0.04, carbone, -4.15, 0.42, i * 0.34);
  const yAile = 2.2, xAile = -3.72;
  const aileron = a.boite(0.78, 0.07, 3.0, carbone, xAile, yAile, 0); aileron.rotation.z = 0.1;
  for (const sg of [-1, 1]) {
    prisme(a, [[-3.25, yAile - 0.18], [-4.15, yAile - 0.12], [-4.15, yAile + 0.2], [-3.4, yAile + 0.12]], sg * 1.5, sg * 1.56, carbone);   // dérives
    const z = sg * 0.62, yM = S.haut(ST, -3.35, z);
    tuyau(a, [[-3.3, yM - 0.05, z], [-3.3, yM + 0.35, z], [-3.42, yAile + 0.18, z], [-3.62, yAile + 0.12, z], [-3.72, yAile + 0.03, z]], 0.045, carbone, 30, 8);   // col de cygne (fixé sur le dessus)
  }
  a.degager(R, { jeu: 0.07, ep: 0.04, sauf: (m) => m.userData.decal });
  return { L: 8.43, largeur: 2 * (wAile + 0.02), hauteur: 2.29, xAvant: 4.19, xArriere: -4.3, roues: R, plafond: 0.7 };   // miniature abaissée « coupé » (réel 1 468 / 1 855 ≈ 0,79)
}

/* ================================================================== N05 : Toyota Prius 5e génération (2023), custom */
/**
 * Cotes réelles : 4 600 × 1 780 × 1 420 mm, empattement 2 750. Échelle 1,75 u/m → L 8,05 ; empattement 4,81 ;
 * demi-largeur 1,56 ; pavillon 2,49. Porte-à-faux avant 0,93 m, arrière 0,92 m.
 * Silhouette « monoforme » en arc : nez très bas en pointe, capot court qui file dans un pare-brise extrêmement couché,
 * pavillon arqué dont le sommet est derrière le montant B, chute continue jusqu'au becquet de hayon, poupe tronquée verticale.
 * Phares fins en « tête de marteau » (trait horizontal + crochet en C), feux arrière en bandeau pleine largeur.
 * Version custom : abaissée, élargisseurs noirs, jantes sombres à 6 branches, coffre de toit noir allongé sur barres,
 * vert militaire satiné, toit noir, vitres teintées. Le coffre de toit est compté dans le pavillon mesuré (miniature).
 */
function prius(ctx) {
  const { lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx);
  const kaki = a.pein('#535f1f', 0.45), noirL = a.pein('#141518', 0.3), noir = a.mate('#121316', 0.55, 0.3), dark = a.mate('#07080a', 0.9, 0.1);
  const RW = 0.66, ep = 0.54, xA = 2.39, xR = -2.42, wAile = 1.6;   // roues de la miniature, plus grandes que nature
  const R = [roue(xA, RW, ep, wAile + 0.01, true, { jante: '#34373c', rayons: 'evo6', levre: 0.05 }),
             roue(xR, RW, ep, wAile + 0.01, false, { jante: '#34373c', rayons: 'evo6', levre: 0.05 })];
  // caisse : nez en pointe très bas, capot court, ceinture qui monte vers l'arrière, poupe tronquée
  const ST = stations(abscisses(-4.02, 4.03, 0.12, [-3.98, -3.92, 3.94, 3.99]), {
    y1: [[-4.02, 1.5], [-3.97, 1.76], [-3.75, 1.88], [-3.2, 1.86], [-2.2, 1.8], [-0.8, 1.74], [0.6, 1.7], [1.6, 1.63], [2.6, 1.52], [3.4, 1.3], [3.85, 1.08], [4.0, 0.88], [4.03, 0.72]],
    y0: [[-4.02, 0.6], [-3.9, 0.42], [-3.5, 0.3], [3.5, 0.28], [3.92, 0.34], [4.03, 0.44]],
    w: [[-4.02, 1.3], [-3.85, 1.44], [-3.2, 1.54], [-2.42, wAile], [-1.8, 1.56], [-1.0, 1.52], [0.6, 1.52], [1.6, 1.55], [2.39, wAile], [3.1, 1.55], [3.6, 1.42], [3.92, 1.18], [4.03, 0.9]],
    nt: 4.0, nb: 4.5, wt: 0.88,
  });
  a.loft(ST, kaki, { arches: archesJeu(R, 0.07), nx: 220 }); a.puits(R, dark, ST);
  // serre en arc : pare-brise extrêmement couché, sommet derrière le montant B, chute continue vers le becquet
  const STg = stations(abscisses(-3.88, 1.9, 0.1), {
    y1: [[-3.88, 1.86], [-3.72, 2.02], [-3.3, 2.14], [-2.4, 2.32], [-1.3, 2.43], [-0.5, 2.45], [0.2, 2.36], [0.8, 2.14], [1.4, 1.84], [1.9, 1.58]],
    y0: 1.15, w: [[-3.88, 1.3], [-3.4, 1.4], [-1.5, 1.45], [0.5, 1.44], [1.5, 1.36], [1.9, 1.28]], nt: 3.2, nb: 3.0, wt: 0.68,
  });
  a.loft(STg, noirL, { nx: 140, ns: 64 });   // serre « toit flottant » noire (montants et pavillon noirs, comme la miniature)
  // vitres teintées
  const teinte = '#141a1e';
  D.cote(STg, -3.88, 1.9, 1.2, 2.46, (g, X, Y) => {
    poly(g, X, Y, [[1.9, 1.2], [1.9, 1.68], [-3.88, 2.0], [-3.88, 1.2]], '#535f1f');   // épaule kaki sous les glaces (ceinture continue)
    verrePeint(g, X, Y, [[1.45, 1.72], [0.2, 2.3], [-0.55, 2.38], [-0.55, 1.78]], teinte, 10);
    verrePeint(g, X, Y, [[-0.72, 1.79], [-0.72, 2.37], [-1.9, 2.3], [-3.1, 2.04], [-3.3, 1.92]], teinte, 16);
    g.fillStyle = '#2b2e31'; g.fillRect(X(-0.56), Y(2.0), X(-0.71) - X(-0.56), Y(1.85) - Y(2.0));   // poignée cachée au montant C (Prius 5)
  }, { genre: 'verre', cw: 1600, ch: 360 });
  D.dessus(STg, -3.85, 1.9, -1.45, 1.45, (g, X, Z) => {
    verrePeint(g, X, Z, [[1.82, -1.1], [1.82, 1.1], [0.3, 0.98], [0.3, -0.98]], teinte, 20);
    verrePeint(g, X, Z, [[-2.3, -0.98], [-2.3, 0.98], [-3.7, 1.04], [-3.7, -1.04]], teinte, 20);
  }, { genre: 'verre', cw: 1600, ch: 640 });
  // flancs : bas de caisse noir, grande nervure en diagonale (portières), petit filet générique
  D.cote(ST, -4.02, 4.03, 0.3, 1.76, (g, X, Y) => {
    poly(g, X, Y, [[3.6, 0.3], [3.6, 0.5], [-3.7, 0.52], [-3.7, 0.3]], '#121316');
    g.strokeStyle = 'rgba(35,42,12,0.55)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(X(1.4), Y(0.62)); g.lineTo(X(-1.7), Y(1.0)); g.lineTo(X(-3.4), Y(1.3)); g.stroke();
    g.beginPath(); g.moveTo(X(1.5), Y(1.45)); g.lineTo(X(1.45), Y(0.58)); g.moveTo(X(-0.62), Y(1.58)); g.lineTo(X(-0.62), Y(0.56)); g.stroke();
    texte(g, 'J-IMPORT', X(-2.95), Y(1.47), `700 ${Math.round((Y(0) - Y(1)) * 0.09)}px Arial`, '#20240e');
  }, { cw: 2600, ch: 460, roues: R });
  // face avant : bouclier noir à grande prise d'air trapézoïdale
  D.face(ST, 1, -1.45, 1.45, 0.3, 1.05, (g, Z, Y) => {
    poly(g, Z, Y, [[-1.05, 0.34], [1.05, 0.34], [1.32, 0.88], [-1.32, 0.88]], '#0c0d10', 26);
    g.strokeStyle = '#2a2d33'; g.lineWidth = 5; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(Z(-1.0), Y(0.44 + k * 0.09)); g.lineTo(Z(1.0), Y(0.44 + k * 0.09)); g.stroke(); }
    poly(g, Z, Y, [[-1.4, 0.3], [1.4, 0.3], [1.4, 0.37], [-1.4, 0.37]], '#0c0d10');
  }, { cw: 1400, ch: 520, xLim: 3.5 });
  // phares « tête de marteau » : trait fin sur toute la largeur du nez + crochet en C à chaque angle
  const xb = (y, z) => S.bout(ST, y, z, 1);
  tuyau(a, [-1.3, -0.9, -0.4, 0, 0.4, 0.9, 1.3].map((z) => [xb(0.98, z) + 0.008, 0.98, z]), 0.028, lumBlanche, 60, 8);
  for (const sg of [-1, 1]) {
    const c = [[0.98, 0.95], [0.97, 1.22], [0.92, 1.36], [0.84, 1.36], [0.82, 1.22]];   // crochet en C qui redescend dans l'angle
    tuyau(a, c.map(([y, z]) => [xb(y, sg * z) + 0.01, y, sg * z]), 0.038, lumBlanche, 24, 8);
  }
  // arrière : bandeau de feux rouge pleine largeur, bouclier noir, diffuseur
  const xr = (y, z) => S.bout(ST, y, z, -1);
  tuyau(a, [-1.32, -0.9, -0.4, 0, 0.4, 0.9, 1.32].map((z) => [xr(1.5, z) - 0.01, 1.5, z]), 0.045, lumRouge, 50, 8);
  D.face(ST, -1, -1.45, 1.45, 0.3, 0.8, (g, Z, Y) => { poly(g, Z, Y, [[-1.4, 0.3], [1.4, 0.3], [1.35, 0.72], [-1.35, 0.72]], '#0c0d10', 14); }, { cw: 1000, ch: 400, xLim: -3.5 });
  // élargisseurs noirs, lame avant, bas de caisse, rétroviseurs
  for (const r of R) for (const sg of [-1, 1]) a.arcGarde(r.x, r.y, r.RW + 0.1, r.RW + 0.22, sg * (wAile - 0.05), 0.16, noir, -0.08, Math.PI + 0.08);
  plaqueY(a, [[4.08, -1.15], [4.08, 1.15], [3.6, 1.38], [3.6, -1.38]], 0.2, 0.26, noir, 0.01);
  for (const sg of [-1, 1]) prisme(a, [[1.75, 0.24], [-1.7, 0.24], [-1.7, 0.4], [1.75, 0.4]], sg * 1.44, sg * 1.62, noir);
  for (const sg of [-1, 1]) { poutre(a, [1.4, 1.55, sg * 1.36], [1.36, 1.68, sg * 1.5], 0.04, 0, noir, true); prisme(a, [[1.5, 1.62], [1.2, 1.64], [1.18, 1.8], [1.44, 1.78]], sg * 1.42, sg * 1.64, kaki, 0.02); }
  // barres de toit et coffre de toit noir allongé (profil en goutte : nez arrondi, queue effilée)
  const yT = (x) => S.haut(STg, x, 0);
  for (const xb2 of [-1.95, 0.05]) {
    const y = yT(xb2) + 0.06;
    a.boite(0.1, 0.05, 2.1, noir, xb2, y, 0);
    for (const sg of [-1, 1]) poutre(a, [xb2, S.haut(STg, xb2, sg * 0.95) - 0.02, sg * 0.95], [xb2, y, sg * 0.98], 0.05, 0.1, noir);
  }
  const yB = Math.max(yT(-1.95), yT(0.05)) + 0.09;
  const box = stations(abscisses(-2.45, 0.55, 0.08), {
    y0: [[-2.45, yB + 0.06], [-2.2, yB], [0.3, yB], [0.55, yB + 0.07]],
    y1: [[-2.45, yB + 0.12], [-2.2, yB + 0.3], [-0.8, yB + 0.36], [0.2, yB + 0.3], [0.55, yB + 0.14]],
    w: [[-2.45, 0.5], [-2.2, 0.68], [-0.6, 0.72], [0.3, 0.64], [0.55, 0.4]], nt: 3.4, nb: 5, wt: 0.92,
  });
  a.loft(box, noirL, { nx: 80, ns: 48 });
  a.degager(R, { jeu: 0.07, ep: 0.04, sauf: (m) => m.userData.decal });
  const hBox = yB + 0.36;
  return { L: 8.14, largeur: 2 * (wAile + 0.03), hauteur: hBox, xAvant: 4.08, xArriere: -4.02, roues: R, plafond: +(hBox / (2 * (wAile + 0.03)) + 0.01).toFixed(3) };
}

/* ================================================================== N01 : « Rapid Pulse » (ambulance compacte, casting imaginaire) */
/**
 * Casting imaginaire : proportions relevées sur les photos de la miniature (L ≈ 7,3 ; pavillon / largeur ≈ 0,9).
 * Fourgon de secours compact : cabine avancée façon pick-up utilitaire (capot court et plat, calandre carrée noire,
 * pare-chocs avant massif), grande cellule arrière à glaces bleues teintées, énorme lame d'aileron posée sur montants
 * au-dessus de la cellule, rampe de gyrophares sur le toit de cabine. Gros pneus, garde au sol haute.
 * Livrée : gris argent, bas de caisse et jupe bleu vif, filet orange, damier bleu sur la cellule, « PARAMEDIC » en italique
 * bleu (mot générique), « 68 » sur le flanc arrière ; jantes noires à liseré orange.
 */
function rapidPulse(ctx) {
  const { lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx);
  const argent = a.metal('#b9bec6', 0.3, 0.55), bleuV = a.pein('#1f4fbf', 0.25), noir = a.mate('#121317', 0.55, 0.3), dark = a.mate('#07080a', 0.9, 0.1);
  const grisF = a.mate('#3a3e46', 0.45, 0.6);
  const RW = 0.74, ep = 0.6, xA = 2.3, xR = -2.3, wAile = 1.52;
  const R = [roue(xA, RW, ep, wAile + 0.02, true, { jante: '#141518', rayons: 'cinqCreux', levre: 0.05, flanc: '#ff7a1a' }),
             roue(xR, RW, ep, wAile + 0.02, false, { jante: '#141518', rayons: 'cinqCreux', levre: 0.05, flanc: '#ff7a1a' })];
  // caisse basse : capot court et plat, flancs droits, garde au sol haute, ailes au droit des roues
  const ST = stations(abscisses(-3.62, 3.62, 0.12, [-3.58, 3.58]), {
    y1: [[-3.62, 1.62], [-3.55, 1.76], [-3.2, 1.8], [0, 1.8], [1.9, 1.84], [2.6, 1.8], [3.3, 1.74], [3.55, 1.66], [3.62, 1.5]],
    y0: [[-3.62, 0.8], [-3.45, 0.66], [-3.0, 0.62], [3.0, 0.62], [3.45, 0.66], [3.62, 0.8]],
    w: [[-3.62, 1.3], [-3.45, 1.4], [-2.9, 1.46], [-2.3, wAile], [-1.6, 1.44], [1.6, 1.44], [2.3, wAile], [3.0, 1.46], [3.45, 1.4], [3.62, 1.3]],
    nt: 6, nb: 5, wt: 0.96,
  });
  a.loft(ST, argent, { arches: archesJeu(R, 0.08), nx: 200 }); a.puits(R, dark, ST);
  // cabine : pare-brise incliné, toit plat
  const STc = stations(abscisses(0.1, 2.1, 0.08), {
    y1: [[0.1, 2.8], [0.6, 2.84], [1.45, 2.84], [1.75, 2.42], [2.1, 1.86]], y0: 1.55,
    w: [[0.1, 1.34], [1.6, 1.36], [2.1, 1.38]], nt: 6, nb: 4, wt: 0.88,
  });
  a.loft(STc, argent, { nx: 70, ns: 56 });
  // cellule arrière : caisse haute et droite, dessus légèrement bombé, arrière arrondi
  const STp = stations(abscisses(-3.56, 0.18, 0.1), {
    y1: [[-3.56, 2.2], [-3.45, 2.62], [-3.1, 2.78], [-1.5, 2.84], [0.18, 2.84]], y0: 1.55,
    w: [[-3.56, 1.26], [-3.3, 1.38], [-1.5, 1.4], [0.18, 1.38]], nt: 5, nb: 4, wt: 0.9,
  });
  a.loft(STp, argent, { nx: 90, ns: 56 });
  // vitrages : cabine bleu clair, cellule bleu teinté (grandes glaces latérales et verrière de toit)
  const vC = '#5fa6d8', vP = '#1d6fb8';
  D.cote(STc, 0.1, 2.1, 1.8, 2.84, (g, X, Y) => { verrePeint(g, X, Y, [[1.72, 1.95], [1.52, 2.62], [0.32, 2.66], [0.32, 1.95]], vC, 12); }, { genre: 'verre', cw: 900, ch: 400 });
  D.dessus(STc, 0.1, 2.1, -1.4, 1.4, (g, X, Z) => { verrePeint(g, X, Z, [[2.04, -1.15], [2.04, 1.15], [1.5, 1.08], [1.5, -1.08]], vC, 16); }, { genre: 'verre', cw: 900, ch: 640 });
  D.face(STc, 1, -1.4, 1.4, 1.84, 2.8, (g, Z, Y) => { verrePeint(g, Z, Y, [[-1.18, 1.95], [1.18, 1.95], [1.1, 2.6], [-1.1, 2.6]], vC, 14); }, { genre: 'verre', cw: 900, ch: 400, xLim: 1.6 });
  D.cote(STp, -3.56, 0.18, 1.8, 2.86, (g, X, Y) => {
    verrePeint(g, X, Y, [[-0.05, 2.05], [-0.05, 2.72], [-2.75, 2.72], [-3.0, 2.3], [-3.0, 2.05]], vP, 18);
    // damier bleu à l'arrière de la cellule (sous la glace et en bout)
    const c = 0.16; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) if ((i + k) % 2 === 0) poly(g, X, Y, [[-3.05 - i * c, 1.82 + k * c], [-3.05 - (i + 1) * c, 1.82 + k * c], [-3.05 - (i + 1) * c, 1.82 + (k + 1) * c], [-3.05 - i * c, 1.82 + (k + 1) * c]], '#1f4fbf');
    texte(g, '68', X(-2.5), Y(1.88), `italic 900 ${Math.round((Y(0) - Y(1)) * 0.4)}px Arial Black, Arial`, '#1f4fbf', { l: 6, c: '#ffffff' }, 0.15);
  }, { genre: 'verre', cw: 1400, ch: 420 });
  D.dessus(STp, -3.5, 0.18, -1.45, 1.45, (g, X, Z) => { verrePeint(g, X, Z, [[0.0, -1.05], [0.0, 1.05], [-3.0, 1.05], [-3.0, -1.05]], vP, 30); }, { genre: 'verre', cw: 1200, ch: 600 });
  // flancs : jupe bleue, filet orange en flèche, « PARAMEDIC » italique bleu, damier sur la custode
  D.cote(ST, -3.62, 3.62, 0.62, 1.84, (g, X, Y) => {
    poly(g, X, Y, [[3.6, 0.62], [3.6, 1.0], [1.2, 0.98], [-3.6, 0.98], [-3.6, 0.62]], '#1f4fbf');
    poly(g, X, Y, [[3.5, 1.42], [1.2, 1.12], [-3.55, 1.06], [-3.55, 1.02], [1.2, 1.06], [3.5, 1.34]], '#ff7a1a');
    poly(g, X, Y, [[3.5, 1.56], [2.4, 1.44], [1.9, 1.44], [3.5, 1.64]], '#1f4fbf');
    texte(g, 'PARAMEDIC', X(-0.5), Y(1.36), `italic 900 ${Math.round((Y(0) - Y(1)) * 0.36)}px Arial Black, Arial`, '#1f4fbf', { l: 12, c: '#ffffff' }, 0.22);
    const c = 0.14; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) if ((i + k) % 2 === 0) poly(g, X, Y, [[-2.95 - i * c, 1.2 + k * c], [-2.95 - (i + 1) * c, 1.2 + k * c], [-2.95 - (i + 1) * c, 1.2 + (k + 1) * c], [-2.95 - i * c, 1.2 + (k + 1) * c]], '#1f4fbf');
    g.strokeStyle = 'rgba(40,44,52,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(1.9), Y(1.8)); g.lineTo(X(1.9), Y(1.0)); g.moveTo(X(0.3), Y(1.8)); g.lineTo(X(0.3), Y(1.0)); g.stroke();
  }, { cw: 2400, ch: 420, roues: R });
  // face avant : calandre carrée noire à lames, phares carrés, pare-chocs massif gris foncé
  prismeX(a, [[-0.85, 1.0], [0.85, 1.0], [0.85, 1.62], [-0.85, 1.62]], 3.66, 3.5, grisF, 0.02);
  for (let i = 0; i < 5; i++) a.boite(0.05, 0.06, 1.56, noir, 3.69, 1.08 + i * 0.12, 0);
  for (const sg of [-1, 1]) {
    prismeX(a, [[sg * 0.9, 1.3], [sg * 1.28, 1.3], [sg * 1.28, 1.6], [sg * 0.9, 1.6]], 3.62, 3.5, grisF, 0.02);
    a.boite(0.04, 0.22, 0.32, lumBlanche, 3.645, 1.45, sg * 1.09);
    a.boite(0.04, 0.08, 0.3, a.mate('#ff8a1a', 0.3, 0.1), 3.645, 1.18, sg * 1.09);
  }
  prismeX(a, [[-1.5, 0.52], [1.5, 0.52], [1.55, 0.98], [-1.55, 0.98]], 3.88, 3.45, grisF, 0.04);   // pare-chocs massif
  a.boite(0.06, 0.12, 2.6, noir, 3.9, 0.75, 0);
  // arrière : portes, feux, marchepied
  for (const sg of [-1, 1]) a.boite(0.04, 0.5, 0.18, lumRouge, -3.6, 1.35, sg * 1.12);
  prismeX(a, [[-1.4, 0.55], [1.4, 0.55], [1.4, 0.92], [-1.4, 0.92]], -3.45, -3.8, grisF, 0.03);
  // rampe de gyrophares sur le toit de cabine (feux émissifs autorisés ici, jamais dans les roues)
  const yC = S.haut(STc, 1.2, 0);
  a.boite(0.36, 0.07, 2.3, noir, 1.2, yC + 0.035, 0);
  const rouge = lumiere(a, '#ff0818', 1.15), bleu = lumiere(a, '#0a3cff', 1.2);
  for (let i = 0; i < 6; i++) a.boite(0.3, 0.2, 0.34, i < 3 ? rouge : bleu, 1.2, yC + 0.17, -0.95 + i * 0.38);
  // énorme lame d'aileron sur montants au-dessus de la cellule (bord d'attaque bleu)
  const yP = (x) => S.haut(STp, x, 0);
  const lame = new a.THREE.Group(); a.ajouter(lame);
  const plaque = plaqueY(a, [[-0.95, -1.3], [-0.95, 1.3], [-3.75, 1.42], [-3.75, -1.42]], 0, 0.09, argent, 0.02);
  const bord = plaqueY(a, [[-0.9, -1.3], [-0.9, 1.3], [-1.08, 1.3], [-1.08, -1.3]], -0.005, 0.1, bleuV, 0.01);
  for (const m of [plaque, bord]) { lame.add(m); }
  lame.position.set(0, 3.18, 0); lame.rotation.z = -0.07;   // monte vers l'arrière
  for (const sg of [-1, 1]) {
    prisme(a, [[-1.3, 3.1], [-3.9, 3.42], [-3.9, 3.7], [-1.6, 3.32]], sg * 1.42, sg * 1.5, bleuV, 0.02);           // dérives latérales
    for (const xm of [-1.35, -3.15]) poutre(a, [xm, yP(xm) - 0.05, sg * 0.8], [xm - 0.06, 3.18 + (-xm - 0.95) * 0.07 + 0.02, sg * 0.86], 0.12, 0.12, grisF);
  }
  a.degager(R, { jeu: 0.08, ep: 0.04, sauf: (m) => m.userData.decal });
  const largeur = 2 * (wAile + 0.02);
  return { L: 7.7, largeur, hauteur: 3.75, xAvant: 3.9, xArriere: -3.8, roues: R, plafond: 0.94 };
}

/* ================================================================== N02 : « Pedal Driver » (voiture à pédales dragster) */
/**
 * Casting imaginaire : proportions cartoon relevées sur les photos (L ≈ 6,9, courte, haute, roues énormes).
 * Carrosserie courte et bombée de voiture à pédales des années 50 : calandre chromée verticale à barreaux entre deux gros
 * phares ronds posés sur les ailes, pare-chocs noir massif, capot rond percé par un moteur chromé à nu (compresseur à
 * nervures, cornets), puis, derrière le moteur et devant le baquet, l'énorme VOLANT violet de la voiture à pédales : disque
 * plein épais légèrement bombé côté conducteur, bord roulé, moyeu, colonne sombre qui sort du tableau de bord, face tournée
 * vers le siège (normale inclinée de 45° au-dessus de l'horizontale, vers l'arrière). Baquet ouvert à l'arrière. Livrée : argent métallisé, flammes / rayures violettes et roses sur les flancs,
 * jantes rose fluo pleines, gros pneus arrière.
 */
function pedalDriver(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx);
  const argent = a.metal('#c9ccd2', 0.28, 0.6), violet = a.pein('#7a34c4', 0.25), noir = a.mate('#121317', 0.55, 0.25), dark = a.mate('#07080a', 0.9, 0.1);
  const gris = a.mate('#5c6068', 0.5, 0.4), chrome = a.chrome;
  const xA = 2.02, xR = -1.88, KX = 0.95;   // KX : la caisse entière est raccourcie à la fin (proportions cartoon)
  const R = [roue(xA, 0.74, 0.56, 1.56, true, { jante: '#e23fd6', rayons: 'plein', flanc: null }),
             roue(xR, 0.86, 0.74, 1.66, false, { jante: '#e23fd6', rayons: 'plein', flanc: null })];
  // carrosserie bombée : nez arrondi, ailes avant hautes, capot rond, baquet, poupe arrondie
  const ST = stations(abscisses(-3.35, 3.4, 0.1, [-3.3, 3.35]), {
    y1: [[-3.35, 1.3], [-3.25, 1.6], [-2.9, 1.86], [-2.0, 1.98], [-1.0, 1.9], [0.0, 1.98], [1.0, 2.04], [2.15, 2.0], [2.9, 1.86], [3.25, 1.62], [3.4, 1.25]],
    y0: [[-3.35, 0.78], [-3.1, 0.62], [-2.6, 0.56], [2.6, 0.56], [3.2, 0.64], [3.4, 0.8]],
    w: [[-3.35, 1.1], [-3.1, 1.3], [-2.6, 1.46], [-1.88, 1.5], [-1.0, 1.4], [0.5, 1.38], [1.5, 1.44], [2.02, 1.5], [2.8, 1.46], [3.2, 1.34], [3.4, 1.08]],
    nt: 2.6, nb: 3.6, wt: 0.92,
  });
  a.loft(ST, argent, { arches: archesJeu(R, 0.08), nx: 200 });   // doublures de passages posées après l'étirement final
  // baquet ouvert : cuvette sombre sur le dessus, rebord gris, siège baquet
  D.dessus(ST, -2.7, -0.2, -1.2, 1.2, (g, X, Z) => {
    poly(g, X, Z, [[-0.35, -0.85], [-0.35, 0.85], [-2.55, 0.9], [-2.55, -0.9]], '#5a5e66', 60);
    poly(g, X, Z, [[-0.45, -0.75], [-0.45, 0.75], [-2.45, 0.8], [-2.45, -0.8]], '#24262b', 50);
  }, { cw: 900, ch: 800, eps: 0.02 });
  const yH = (x, z = 0) => S.haut(ST, x, z);
  prisme(a, [[-1.55, yH(-1.55) - 0.1], [-2.15, yH(-2.1) - 0.1], [-2.2, yH(-2.1) + 0.55], [-1.85, yH(-1.9) + 0.6], [-1.75, yH(-1.7) + 0.1]], -0.5, 0.5, gris, 0.05);   // dossier du baquet
  for (let i = -2; i <= 2; i++) a.boite(0.05, 0.4, 0.06, a.mate('#44474e', 0.6, 0.3), -2.0, yH(-2.0) + 0.3, i * 0.18);   // nervures du dossier
  // moteur chromé à nu qui perce le capot : bloc, compresseur à nervures, cornets d'admission
  const yM = yH(0.9);
  a.boite(1.1, 0.4, 1.0, chrome, 0.9, yM + 0.1, 0);
  for (const sg of [-1, 1]) for (let i = 0; i < 4; i++) a.cyl(0.1, 0.1, 0.18, chrome, 0.5 + i * 0.27, yM + 0.12, sg * 0.56, Math.PI / 2, 0, 14);   // culasses / pipes
  a.boite(0.9, 0.36, 0.7, chrome, 0.9, yM + 0.48, 0);
  for (let i = 0; i < 7; i++) a.boite(0.86, 0.3, 0.04, a.mate('#d7dbe2', 0.2, 0.9), 0.9, yM + 0.76, -0.33 + i * 0.11);   // nervures du compresseur
  for (const z of [-0.2, 0.2]) a.cyl(0.13, 0.1, 0.28, chrome, 1.15, yM + 0.98, z, 0, 0, 16);   // cornets
  // volant GÉANT de la voiture à pédales, entre le moteur et le baquet : repère local y = normale du disque (côté conducteur)
  const violetV = a.pein('#4f1f8f', 0.38);                                  // violet profond satiné, verni
  const volant = new THREE.Group(); a.ajouter(volant);
  const rV = 0.9, epV = 0.16;
  const disqueV = new THREE.Mesh(a.garde(new THREE.CylinderGeometry(rV, rV, epV, 56)), violetV); volant.add(disqueV);   // disque plein épais
  const bombe = new THREE.Mesh(a.garde(new THREE.SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2)), violetV);
  bombe.scale.set(rV * 0.86, 0.13, rV * 0.86); bombe.position.y = epV / 2 - 0.01; volant.add(bombe);                      // léger bombé côté conducteur
  const jante = new THREE.Mesh(a.garde(new THREE.TorusGeometry(rV, 0.09, 14, 64)), violetV); jante.rotation.x = Math.PI / 2; volant.add(jante);   // bord roulé
  const moyeu = new THREE.Mesh(a.garde(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 28)), violetV); moyeu.position.y = epV / 2 + 0.14; volant.add(moyeu);
  const cache = new THREE.Mesh(a.garde(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24)), a.mate('#2a1450', 0.4, 0.3)); cache.position.y = epV / 2 + 0.21; volant.add(cache);
  const nV = 0.785, cxV = -0.42, cyV = yH(-0.42) + 0.98;                   // normale à 45° au-dessus de l'horizontale, vers −x (vers le siège)
  volant.position.set(cxV, cyV, 0); volant.rotation.z = nV;
  // colonne de direction sombre : du tableau de bord (juste derrière le moteur) jusqu'à l'arrière du disque
  const nx = -Math.sin(nV), ny = Math.cos(nV), dos = [cxV - nx * (epV / 2 + 0.02), cyV - ny * (epV / 2 + 0.02), 0];
  poutre(a, [0.25, yH(0.25) - 0.05, 0], dos, 0.075, 0, noir, true);
  a.cyl(0.13, 0.16, 0.12, noir, 0.25, yH(0.25) + 0.02, 0, 0, 0, 20);      // embase de colonne sur le tableau de bord
  // face avant : calandre chromée verticale à barreaux, gros phares ronds sur les ailes, pare-chocs noir massif
  const xb = (y, z) => S.bout(ST, y, z, 1);
  prismeX(a, [[-0.62, 0.86], [0.62, 0.86], [0.66, 1.62], [-0.66, 1.62]], xb(1.2, 0) + 0.06, xb(1.2, 0) - 0.3, chrome, 0.04);
  for (let i = 0; i < 9; i++) a.boite(0.06, 0.66, 0.05, noir, xb(1.2, 0) + 0.085, 1.24, -0.52 + i * 0.13);
  for (const sg of [-1, 1]) {
    const z = sg * 1.0, y = 1.5, x = xb(y, z);
    a.phareRond(x - 0.02, y, z, 0.26, lumBlanche, chrome);
  }
  prismeX(a, [[-1.45, 0.42], [1.45, 0.42], [1.45, 0.82], [-1.45, 0.82]], 3.62, 3.2, noir, 0.06);
  prismeX(a, [[-1.4, 0.48], [1.4, 0.48], [1.4, 0.84], [-1.4, 0.84]], -3.15, -3.5, noir, 0.06);
  for (const sg of [-1, 1]) a.phareRond(S.bout(ST, 1.4, sg * 0.75, -1) + 0.02, 1.4, sg * 0.75, 0.1, lumRouge).forEach((m) => { m.rotation.y = Math.PI; });
  // flancs : bande violette en flèche entre les roues, rayures croisées roses / lilas / bleues (motif générique de la miniature)
  D.cote(ST, -3.35, 3.4, 0.56, 2.05, (g, X, Y) => {
    poly(g, X, Y, [[1.35, 1.5], [-0.9, 1.58], [-1.0, 0.86], [1.3, 0.9], [1.42, 1.2]], '#4a2386', 16);
    g.save(); g.beginPath(); [[1.35, 1.5], [-0.9, 1.58], [-1.0, 0.86], [1.3, 0.9], [1.42, 1.2]].forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.clip();
    g.lineCap = 'round';
    for (const [c, l, d] of [['#ff5ad6', 9, 0], ['#b48cff', 6, 0.12], ['#7fc8ff', 4, 0.22]]) {
      g.strokeStyle = c; g.lineWidth = l;
      for (let k = -2; k < 4; k++) { const x0 = 1.5 - k * 0.75 + d; g.beginPath(); g.moveTo(X(x0), Y(0.9)); g.lineTo(X(x0 - 2.4), Y(1.56)); g.stroke(); g.beginPath(); g.moveTo(X(x0 - 2.4), Y(0.9)); g.lineTo(X(x0), Y(1.56)); g.stroke(); }
    }
    g.restore();
    g.strokeStyle = '#ff5ad6'; g.lineWidth = 7; g.beginPath(); g.moveTo(X(1.4), Y(1.53)); g.lineTo(X(-0.95), Y(1.61)); g.stroke();
    g.strokeStyle = '#b48cff'; g.lineWidth = 5; g.beginPath(); g.moveTo(X(1.35), Y(0.86)); g.lineTo(X(-0.98), Y(0.83)); g.stroke();
  }, { cw: 2200, ch: 480, roues: R });
  etirerX(a, ctx.chassis, KX); for (const r of R) r.x *= KX;
  a.puits(R, dark, ST);
  a.degager(R, { jeu: 0.08, ep: 0.04 });   // décalques compris : l'étirement a pu rapprocher leurs bords d'un passage de roue
  const largeur = 2 * 1.66;
  return { L: +(6.97 * KX).toFixed(2), largeur, hauteur: yM + 1.75, xAvant: 3.62 * KX, xArriere: -3.5 * KX, roues: R, plafond: 1.09 };   // sommet du volant géant / largeur hors tout (photo)
}

export const V8_A = { N01: rapidPulse, N02: pedalDriver, N04: cla, N05: prius };
