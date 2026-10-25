/* Chantier V5 — modèles refaits (escouade « europe ») : E02, E05, E07, E08. Ce module prime sur groupe1..10.
 *
 * Méthode commune : chaque caisse est un loft de superellipses (aide_2) dont les stations sont tirées de COURBES de profil
 * (ligne de toit / de caisse, bas de caisse, demi-largeur en plan) relevées sur les cotes constructeur de la vraie voiture,
 * mises à l'échelle (1 m réel = s unités). Les vitrages sont des « décalques de verre » brillants drapés exactement sur la
 * serre peinte : les montants gardent ainsi leur vraie épaisseur, sans jour ni pièce flottante. Les passages de roues sont
 * recoupés par `degager` (aucune tôle dans l'anneau visible d'un pneu). `plafond` = hauteur / largeur hors tout réelles.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo, aucune marque : formes, couleurs et mots génériques uniquement.
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

/** Outils de surface exacts sur un loft aide_2 (la conicité `wt` du haut de section est prise en compte, contrairement à flancAu/hautAu). */
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

/** Nappe paramétrique (u, v) ∈ [0,1]² → [x, y, z] ; uv de texture = (u, v). */
function nappe(a, fn, nu, nv, mat, ordre = 2, garder = null) {
  const { THREE } = a, pos = [], uv = [], idx = [], ok = [];
  for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const p = fn(i / nu, k / nv); pos.push(...p); uv.push(i / nu, k / nv); ok.push(!garder || garder(...p)); }
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
    const p = i * (nv + 1) + k, q = (i + 1) * (nv + 1) + k;
    if (ok[p] && ok[q] && ok[p + 1] && ok[q + 1]) idx.push(p, q, p + 1, p + 1, q, q + 1);   // quadrilatère gardé seulement s'il est entier
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(a.garde(g), mat); m.renderOrder = ordre; return a.ajouter(m);
}

/** Canvas → texture sRGB. */
function texture(a, draw, cw, ch) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
  const t = a.garde(new a.THREE.CanvasTexture(cv)); t.encoding = a.THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
/** Matériau de décalque : 'verre' (vitrage brillant teinté), 'peint' (autocollant verni), 'mat' (carton, tissu). */
function matDecal(a, draw, cw, ch, genre = 'peint') {
  const { THREE } = a, map = texture(a, draw, cw, ch);
  const base = { map, transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false, envMap: a.envMap };
  if (genre === 'verre') return a.garde(new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.04, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0 }));
  if (genre === 'lum') return a.garde(new THREE.MeshBasicMaterial({ ...base, envMap: null, toneMapped: false }));
  if (genre === 'mat') return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0, envMapIntensity: 0.4 }));
  return a.garde(new THREE.MeshStandardMaterial({ ...base, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.12 }));
}

/**
 * Décalques drapés EXACTEMENT sur un loft (conicité comprise).
 * cote(st, x0, x1, yb, yt, dessin(g, X, Y, sg, w, h), …) : sur les deux flancs ; le canvas de chaque côté est lu à l'endroit
 *   (côté −z : u inversé, et X(x) inversé en conséquence) → textes lisibles des deux côtés, motifs aux mêmes abscisses.
 * dessus(st, x0, x1, z0, z1, dessin(g, X, Z, w, h), …) : vu de dessus, nez à droite.
 */
function drapes(a, S) {
  /** Hors des passages de roues (marge en rayons) : un décalque ne traverse jamais l'anneau d'un pneu. */
  const horsRoues = (R, k = 1.16) => (R ? (x, y) => R.every((r) => Math.hypot(x - r.x, y - (r.y ?? r.RW)) > r.RW * k + 0.04) : null);
  const cote = (st, x0, x1, yb, yt, dessin, { cw = 2048, ch = 512, eps = 0.016, genre = 'peint', nu = 140, nv = 30, roues = null } = {}) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb), r = [];
    for (const sg of [1, -1]) {
      const X = (x) => (sg > 0 ? x - x0 : x1 - x) * sx, Y = (y) => (yt - y) * sy;
      const mat = matDecal(a, (g, w, h) => dessin(g, X, Y, sg, w, h), cw, ch, genre);
      mat.map.flipY = true;
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
  /** Décalque de face (sens +1 : avant, vu de face ; −1 : arrière) ; dessin(g, Z, Y, w, h), canvas lu à l'endroit par l'observateur. */
  const face = (st, sens, z0, z1, yb, yt, dessin, { cw = 1024, ch = 512, eps = 0.012, genre = 'peint', nu = 90, nv = 50, xLim = null } = {}) => {
    // xLim : la face s'arrête là (au-delà de cette abscisse, on serait déjà sur les flancs ou au-dessus des roues)
    const lim = xLim ?? (sens > 0 ? st[st.length - 1].x - 0.7 : st[0].x + 0.7);
    const sz = cw / (z1 - z0), sy = ch / (yt - yb), Z = (z) => (sens > 0 ? z1 - z : z - z0) * sz, Y = (y) => (yt - y) * sy;
    const mat = matDecal(a, (g, w, h) => dessin(g, Z, Y, w, h), cw, ch, genre);
    const m = nappe(a, (u, v) => {
      const z = sens > 0 ? z1 - u * (z1 - z0) : z0 + u * (z1 - z0), y = yb + v * (yt - yb), x = S.bout(st, y, z, sens);
      return [Number.isFinite(x) ? x + sens * eps : NaN, y, z];
    }, nu, nv, mat, 2, (x) => Number.isFinite(x) && (sens > 0 ? x > lim : x < lim));
    const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (!Number.isFinite(p.getX(i))) p.setX(i, 0);   // sommets hors silhouette : jamais référencés
    p.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere(); m.userData.decal = true; return m;
  };
  return { cote, dessus, face };
}

/** Polygone (liste de points monde [x, y]) rempli sur un canvas de décalque, coins arrondis optionnels (rayon en pixels). */
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
function verrePeint(g, X, Y, pts, teinte, rayon = 10, reflet = 'rgba(255,255,255,0.10)') {
  poly(g, X, Y, pts, teinte, rayon);
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = reflet;
  const xs = pts.map((p) => X(p[0])), ys = pts.map((p) => Y(p[1])), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), L = x1 - x0;
  g.beginPath(); g.moveTo(x0 + L * 0.15, y1); g.lineTo(x0 + L * 0.42, y0); g.lineTo(x0 + L * 0.55, y0); g.lineTo(x0 + L * 0.28, y1); g.closePath(); g.fill(); g.restore();
}
/** Texte centré (cx, cy) en pixels canvas. */
function texte(g, t, cx, cy, police, couleur, trait) {
  g.save(); g.font = police; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (trait) { g.lineJoin = 'round'; g.lineWidth = trait.l; g.strokeStyle = trait.c; g.strokeText(t, cx, cy); }
  g.fillStyle = couleur; g.fillText(t, cx, cy); g.restore();
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
/** Prisme : contour plan (x, y) extrudé en z de z0 à z1 (arêtes franches ou biseautées). */
function prisme(a, pts, z0, z1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(z1 - z0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, Math.min(z0, z1)); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}
/** Prisme vu de face : contour (z, y) extrudé en x de x0 vers x1 (face avant / arrière : calandres, feux, diffuseurs). */
function prismeX(a, ptsZY, x0, x1, mat, biseau = 0) {
  const { THREE } = a, s = new THREE.Shape(); ptsZY.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(x1 - x0), bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2); g.translate(Math.max(x0, x1), 0, 0); return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}

/** Passages de roues du loft : arche ronde à jeu constant (RW + jeu), découpée seulement à l'extérieur de la face interne du pneu. */
const archesJeu = (R, jeu = 0.14) => R.map((r) => ({ x: r.x, R: r.RW + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.03 }));

/**
 * Coque à sections polygonales LISSÉE dans la longueur : chaque arête de section donne une bande dont les sommets sont
 * partagés d'une section à l'autre (normales moyennées le long de x), mais pas d'une bande à l'autre (arêtes vives entre
 * pans). Résultat : volumes tendus à arêtes nettes, sans l'aspect « papier plié » de l'ombrage plat. Extrémités fermées.
 * sections : [{ x, pts: [[z, y], …] }] (même nombre de points, polygones convexes parcourus dans le même sens).
 */
function coque(a, sections, mat) {
  const { THREE } = a, n = sections[0].pts.length, pos = [], idx = [];
  const P = (s, k) => [s.x, s.pts[k % n][1], s.pts[k % n][0]];
  sections.forEach((s) => { for (let k = 0; k < n; k++) pos.push(...P(s, k), ...P(s, k + 1)); });
  const v = (j, k, c) => (j * n + k) * 2 + c;
  for (let j = 0; j < sections.length - 1; j++) for (let k = 0; k < n; k++) idx.push(v(j, k, 0), v(j + 1, k, 0), v(j, k, 1), v(j, k, 1), v(j + 1, k, 0), v(j + 1, k, 1));
  for (const [j, sg] of [[0, 1], [sections.length - 1, -1]]) {                                     // bouchons plats
    const s = sections[j], c0 = pos.length / 3, cz = s.pts.reduce((t, p) => t + p[0], 0) / n, cy = s.pts.reduce((t, p) => t + p[1], 0) / n;
    pos.push(s.x, cy, cz); for (let k = 0; k < n; k++) pos.push(...P(s, k));
    for (let k = 0; k < n; k++) { const a1 = c0 + 1 + k, b1 = c0 + 1 + (k + 1) % n; if (sg > 0) idx.push(c0, a1, b1); else idx.push(c0, b1, a1); }
  }
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
    vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}

/** Contexte de modélisation commun. */
function atelier(ctx) {
  const a = aide(ctx); a.garde = ctx.garde; a.envMap = ctx.envMap; a.THREE = ctx.THREE;
  // laque : reflet d'environnement très dosé (l'environnement néon du banc teintait les capots de turquoise)
  const pein0 = a.pein; a.pein = (hex, r) => { const m = pein0(hex, r); m.envMapIntensity = 0.12; return m; };
  const S = surfaces(a), D = drapes(a, S);
  return { a, S, D };
}

/* ================================================================== E05 : Ford Lotus Cortina Mk1 (1963–66) */
/**
 * Cotes réelles : 4 270 × 1 590 × 1 360 mm (abaissée), empattement 2 490, voies 1 310 / 1 270, jantes 13".
 * Échelle s = 1,78 u/m → L 7,6 ; empattement 4,43 ; demi-largeur 1,415 ; pavillon 2,42.
 * Berline deux portes à trois volumes : capot plat et long, caisse à flancs droits, serre haute à montants fins
 * (pare-brise peu incliné, toit plat, lunette galbée), malle plate, petits ailerons arrière à feux ronds.
 * Livrée de la miniature : caisse noire laquée, pavillon argent, filet argent de ceinture qui s'élargit en flèche sur l'aile
 * arrière, ronds blancs n° 63 (portières et capot), double bande argent de capot, jantes blanches pleines ; posture rallye.
 */
function e05(ctx) {
  const { lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx);
  const laque = a.pein('#141518', 0.16), chrome = a.chrome, noir = a.mate('#121317', 0.6, 0.25), dark = a.mate('#07080a', 0.9, 0.1);
  const gris = a.mate('#8c9097', 0.35, 0.8);
  const RW = 0.63, ep = 0.44;                                                       // roues de la miniature, généreuses
  const R = [{ x: 2.32, RW, ep, z: 1.155, y: RW, avant: true, jante: '#eef0f2', rayons: 'rallye', levre: 0.04, flanc: null },
             { x: -2.11, RW, ep, z: 1.13, y: RW, avant: false, jante: '#eef0f2', rayons: 'rallye', levre: 0.04, flanc: null }];
  // caisse : capot plat, ceinture droite à 1,57, malle plate ; faces avant/arrière presque verticales
  const xs = abscisses(-3.5, 3.8, 0.2, [-3.46, -3.4, 3.7, 3.76]);   // porte-à-faux arrière raccourci (miniature)
  const ST = stations(xs, {
    y1: [[-3.5, 1.3], [-3.46, 1.5], [-3.3, 1.575], [-2.6, 1.58], [-1, 1.575], [0.6, 1.56], [1.6, 1.5], [3.0, 1.45], [3.6, 1.42], [3.76, 1.36], [3.8, 1.2]],
    y0: [[-3.5, 0.55], [-3.4, 0.42], [-3.1, 0.37], [3.3, 0.37], [3.7, 0.44], [3.8, 0.55]],
    w: [[-3.5, 1.2], [-3.46, 1.31], [-3.25, 1.38], [-2.1, 1.41], [0, 1.415], [2.3, 1.405], [3.5, 1.37], [3.76, 1.3], [3.8, 1.2]],
    nt: 5.5, nb: 4.5, wt: 0.95,
  });
  a.loft(ST, laque, { arches: archesJeu(R, 0.09), nx: 200 }); a.puits(R, dark, ST);
  // serre (montants et toit peints) : pare-brise peu couché, toit plat, lunette galbée
  const STg = stations(abscisses(-2.7, 0.7, 0.1), {
    y1: [[-2.7, 1.5], [-2.62, 1.62], [-2.3, 2.03], [-2.05, 2.36], [-1.9, 2.41], [0, 2.41], [0.1, 2.37], [0.4, 1.98], [0.62, 1.62], [0.7, 1.5]],
    y0: 0.8, w: [[-2.7, 1.22], [-2.5, 1.32], [-1, 1.34], [0.4, 1.33], [0.7, 1.25]], nt: 6, nb: 3, wt: 0.8,
  });
  a.loft(STg, laque, { nx: 140, ns: 64 });
  // pavillon argent (miniature) : toit peint, du haut du pare-brise au haut de la lunette
  D.dessus(STg, -2.08, 0.12, -1.25, 1.25, (g, X, Z) => {
    const gr = g.createLinearGradient(0, 0, X(0.12), 0); gr.addColorStop(0, '#8e939b'); gr.addColorStop(0.5, '#b4b8bf'); gr.addColorStop(1, '#9a9fa7');
    poly(g, X, Z, [[0.1, -1.0], [0.1, 1.0], [-2.06, 1.0], [-2.06, -1.0]], gr, 18);
  }, { cw: 900, ch: 500, eps: 0.012 });
  // vitrages : pare-brise et lunette (vus de dessus), glaces latérales (montant A fin, B, C trapézoïdal)
  const teinte = '#1b232d';
  D.dessus(STg, -2.75, 0.75, -1.4, 1.4, (g, X, Z) => {
    verrePeint(g, X, (z) => Z(z), [[0.6, -1.16], [0.6, 1.16], [0.13, 0.95], [0.13, -0.95]], teinte, 14);
    verrePeint(g, X, (z) => Z(z), [[-2.6, -1.12], [-2.6, 1.12], [-2.1, 0.95], [-2.1, -0.95]], teinte, 22);
  }, { genre: 'verre', cw: 1400, ch: 560 });
  D.cote(STg, -2.75, 0.75, 1.58, 2.36, (g, X, Y) => {
    verrePeint(g, X, Y, [[0.46, 1.63], [0.0, 2.26], [-0.9, 2.27], [-0.9, 1.63]], teinte, 8);         // glace de portière
    verrePeint(g, X, Y, [[-1.04, 1.63], [-1.04, 2.27], [-1.84, 2.27], [-2.27, 1.63]], teinte, 16);    // glace de custode
    g.fillStyle = '#c9ccd2'; g.fillRect(X(0.5), Y(1.63), X(-2.32) - X(0.5), 5);                       // jonc chromé de ceinture
  }, { genre: 'verre', cw: 1400, ch: 320 });
  // livrée de la miniature : filet argent de ceinture qui s'élargit en flèche argent sur l'aile arrière, rond n° 63,
  // inscription générique et étiquette blanche (sans marque), poignées
  D.cote(ST, -3.52, 3.82, 0.4, 1.6, (g, X, Y, sg) => {
    // flèche argent de la miniature : pointe fine au phare, s'épaissit le long de la ceinture, large fer de lance sur l'aile
    // arrière jusqu'aux feux ; filet blanc au-dessus, sous les glaces
    poly(g, X, Y, [[3.68, 1.43], [1.6, 1.45], [-0.9, 1.48], [-2.4, 1.51], [-3.5, 1.53], [-3.5, 1.18], [-2.92, 1.24], [-2.7, 1.42], [-1.2, 1.42], [1.6, 1.405]], '#b9bdc4');   // au-dessus des arches
    poly(g, X, Y, [[3.0, 1.465], [-3.4, 1.53], [-3.4, 1.548], [3.0, 1.483]], '#eceef0');
    poly(g, X, Y, [[-2.55, 1.33], [-3.32, 1.37], [-3.32, 1.24], [-2.55, 1.26]], '#141518');
    texte(g, 'TEAM 63', X(-0.35), Y(1.42), `700 ${Math.round((Y(0) - Y(1)) * 0.075)}px Georgia, serif`, '#d7d9de');
    g.fillStyle = '#f4f4f4'; g.fillRect(Math.min(X(-1.42), X(-1.9)), Y(1.18), Math.abs(X(-1.9) - X(-1.42)), (Y(0) - Y(1)) * 0.14);   // étiquette blanche
    g.fillStyle = '#d02a24'; g.fillRect(Math.min(X(-1.42), X(-1.9)), Y(1.18), Math.abs(X(-1.9) - X(-1.42)), (Y(0) - Y(1)) * 0.035);
    const cx = X(-0.35), cy = Y(0.98), r = 0.29 * (Y(0) - Y(1));
    g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    texte(g, '63', cx, cy + 6, `900 ${Math.round(r * 1.25)}px Arial Black, Arial`, '#151618');
    g.fillStyle = '#9ea3ab'; g.fillRect(X(-0.72), Y(1.42), X(-0.92) - X(-0.72), 9);                     // poignée de portière
    g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 3;                                              // joints de portière
    g.beginPath(); g.moveTo(X(0.5), Y(1.55)); g.lineTo(X(0.5), Y(0.45)); g.moveTo(X(-0.98), Y(1.55)); g.lineTo(X(-0.98), Y(0.45)); g.stroke();
  }, { cw: 2600, ch: 420, roues: R });
  // capot : double bande argent et rond blanc n° 63 (miniature)
  D.dessus(ST, 0.65, 3.78, -1.3, 1.3, (g, X, Z) => {
    for (const zc of [-0.2, 0.2]) poly(g, X, Z, [[0.7, zc - 0.13], [3.74, zc - 0.13], [3.74, zc + 0.13], [0.7, zc + 0.13]], '#b9bdc4');
    const cx = X(2.25), cy = Z(0), r = 0.36 * (X(1) - X(0));
    g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(Math.PI / 2); texte(g, '63', 0, 4, `900 ${Math.round(r * 1.2)}px Arial Black, Arial`, '#141518'); g.restore();
  }, { cw: 1400, ch: 600, roues: R });
  // face avant : calandre grise pleine largeur entre les phares ronds, lèvre de capot ; pare-chocs « quart » chromés
  prismeX(a, [[-0.92, 0.84], [0.92, 0.84], [0.95, 1.22], [-0.95, 1.22]], 3.83, 3.7, gris);
  for (let i = 0; i < 6; i++) a.boite(0.05, 0.028, 1.86, a.mate('#2a2c31', 0.5, 0.6), 3.835, 0.89 + i * 0.062, 0);
  a.boite(0.05, 0.05, 1.98, chrome, 3.84, 1.245, 0); a.boite(0.05, 0.04, 1.9, chrome, 3.84, 0.825, 0);
  for (const sg of [-1, 1]) {
    a.phareRond(3.79, 1.08, sg * 1.13, 0.17, lumBlanche, chrome);
    a.boite(0.06, 0.08, 0.16, a.mate('#ff9d1a', 0.3, 0.2), 3.8, 0.78, sg * 1.15);                         // clignotants
    poutre(a, [3.86, 0.6, sg * 0.5], [3.86, 0.6, sg * 1.12], 0.075, 0, chrome, true);                    // pare-choc quart
    poutre(a, [3.86, 0.6, sg * 1.12], [3.66, 0.6, sg * 1.33], 0.075, 0, chrome, true);
    a.boite(0.07, 0.18, 0.05, chrome, 3.87, 0.66, sg * 0.62);                                            // butoir
    a.phareRond(-3.49, 1.36, sg * 1.16, 0.1, lumRouge, chrome).forEach((m) => { m.rotation.y = Math.PI; });   // feux ronds
    a.phareRond(-3.49, 1.15, sg * 1.16, 0.065, a.mate('#ff9d1a', 0.3, 0.2), chrome).forEach((m) => { m.rotation.y = Math.PI; });
    a.boite(0.1, 0.06, 0.08, chrome, 2.6, a.hautAu(ST, 2.6, 1.25) + 0.08, sg * 1.25);                   // rétro d'aile
    a.cyl(0.07, 0.07, 0.05, chrome, 2.6, a.hautAu(ST, 2.6, 1.25) + 0.14, sg * 1.25, 0, Math.PI / 2, 16);
  }
  poutre(a, [-3.56, 0.62, -1.2], [-3.56, 0.62, 1.2], 0.08, 0, chrome, true);                            // pare-chocs arrière plein
  for (const sg of [-1, 1]) poutre(a, [-3.56, 0.62, sg * 1.2], [-3.36, 0.62, sg * 1.33], 0.08, 0, chrome, true);
  a.cyl(0.05, 0.05, 0.3, gris, -3.52, 0.36, 0.55, 0, Math.PI / 2, 12);                                  // échappement
  a.boite(0.04, 0.16, 0.5, a.mate('#e8e6dc', 0.5, 0.1), -3.51, 0.95, 0);                                 // plaque (vierge)
  a.degager(R, { jeu: 0.07, ep: 0.03, sauf: (m) => m.userData.decal });
  return { L: 7.42, largeur: 2 * 1.415, hauteur: 2.41, xAvant: 3.86, xArriere: -3.56, roues: R, plafond: 1360 / 1590 };
}

/* ================================================================== E07 : Volvo 240 Drift Wagon */
/**
 * Cotes réelles (break 240, 1974–93) : 4 785 × 1 710 × 1 460 mm, empattement 2 640, voies 1 420 / 1 350.
 * Échelle s = 1,755 u/m → L 8,4 ; empattement 4,63 ; demi-largeur 1,50 ; pavillon 2,56.
 * « Brique suédoise » : faces avant et arrière verticales, capot plat, ceinture horizontale, serre carrée à montants
 * droits, pavillon long et plat jusqu'au hayon vertical, feux arrière verticaux le long du hayon, gros pare-chocs
 * noirs « 5 mph ». Préparation drift : caisse abaissée, jantes sombres larges à fleur d'aile, carrossage négatif léger,
 * écope de capot, becquet de pavillon. Livrée de la miniature : bleu, vitrages jaunes, n° 40, bandeau or, bas de caisse noir.
 */
function e07(ctx) {
  const { lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx);
  const bleu = a.pein('#1f6cc4', 0.24), noir = a.mate('#16171b', 0.55, 0.25), noirB = a.pein('#141519', 0.35), dark = a.mate('#07080a', 0.9, 0.1);
  const chrome = a.chrome, orange = a.mate('#ff9a1f', 0.35, 0.2);
  // jantes sombres à 5 branches (miniature), roues généreuses à fleur d'aile
  const R = [{ x: 2.5, RW: 0.66, ep: 0.5, z: 1.27, y: 0.66, avant: true, jante: '#2e3138', rayons: 'cinqCreux', levre: 0.05, flanc: null },
             { x: -2.13, RW: 0.66, ep: 0.54, z: 1.25, y: 0.66, avant: false, jante: '#2e3138', rayons: 'cinqCreux', levre: 0.05, flanc: null }];
  // caisse : section presque rectangulaire (exposants élevés), flancs plats, capot horizontal, poupe verticale
  const xs = abscisses(-4.06, 4.08, 0.18, [-4.02, -3.96, 3.96, 4.02]);
  const ST = stations(xs, {
    y1: [[-4.06, 1.4], [-4.02, 1.6], [-3.9, 1.64], [0, 1.64], [1.2, 1.63], [2.4, 1.56], [3.8, 1.5], [3.98, 1.47], [4.08, 1.32]],
    y0: [[-4.06, 0.5], [-3.96, 0.34], [-3.6, 0.3], [3.6, 0.3], [3.96, 0.34], [4.08, 0.5]],
    w: [[-4.06, 1.36], [-4.02, 1.44], [-3.85, 1.48], [-2.13, 1.5], [0, 1.5], [2.5, 1.5], [3.85, 1.48], [4.02, 1.44], [4.08, 1.36]],
    nt: 9, nb: 6, wt: 0.985,
  });
  a.loft(ST, bleu, { arches: archesJeu(R, 0.08), nx: 220, ns: 72 }); a.puits(R, dark, ST);
  // serre : pare-brise modérément incliné, pavillon plat et long, hayon presque vertical ; tumblehome faible
  const STg = stations(abscisses(-4.0, 1.26, 0.1, [-3.97, -3.92, 1.22]), {
    y1: [[-4.0, 1.55], [-3.98, 1.7], [-3.82, 2.3], [-3.7, 2.5], [-3.55, 2.555], [-3.4, 2.56], [0.1, 2.56], [0.3, 2.53], [0.75, 2.1], [1.18, 1.68], [1.26, 1.55]],
    y0: 0.9, w: [[-4.0, 1.36], [-3.9, 1.43], [-2, 1.44], [0.8, 1.44], [1.26, 1.38]], nt: 9, nb: 3, wt: 0.9,
  });
  a.loft(STg, bleu, { nx: 170, ns: 72 });
  // vitrages jaunes (miniature) : pare-brise, toit vitré, hayon, trois glaces latérales par côté
  const jaune = 'rgba(232,190,30,0.93)';
  D.dessus(STg, -4.02, 1.3, -1.5, 1.5, (g, X, Z) => {
    verrePeint(g, X, Z, [[1.12, -1.28], [1.12, 1.28], [0.36, 1.22], [0.36, -1.22]], jaune, 10, 'rgba(255,255,255,0.18)');   // pare-brise
    verrePeint(g, X, Z, [[-0.3, -0.95], [-0.3, 0.95], [-2.6, 0.95], [-2.6, -0.95]], jaune, 16, 'rgba(255,255,255,0.18)');   // toit vitré (miniature)
    verrePeint(g, X, Z, [[-3.73, -1.16], [-3.73, 1.16], [-3.95, 1.2], [-3.95, -1.2]], jaune, 4, 'rgba(255,255,255,0.18)'); // lunette de hayon
  }, { genre: 'verre', cw: 2600, ch: 760, nu: 260 });
  D.cote(STg, -4.02, 1.3, 1.64, 2.5, (g, X, Y) => {
    const v = (pts, r) => verrePeint(g, X, Y, pts, jaune, r, 'rgba(255,255,255,0.18)');
    v([[1.04, 1.7], [0.27, 2.42], [-0.42, 2.42], [-0.42, 1.7]], 6);        // glace de porte avant (la plus longue, montant A fin)
    v([[-0.56, 1.7], [-0.56, 2.42], [-1.6, 2.42], [-1.6, 1.7]], 6);         // glace de porte arrière (plus courte)
    v([[-1.76, 1.7], [-1.76, 2.42], [-3.4, 2.42], [-3.78, 1.7]], 8);        // custode de coffre longue, montant D incliné comme le hayon
    g.fillStyle = '#121317'; g.fillRect(X(1.1), Y(1.69), X(-3.8) - X(1.1), 7);   // joint de ceinture noir
  }, { genre: 'verre', cw: 2400, ch: 380 });
  // livrée : bas de caisse noir, bandeau or, plaque noire n° 40, filets blancs de custode
  D.cote(ST, -4.08, 4.1, 0.3, 1.64, (g, X, Y, sg) => {
    poly(g, X, Y, [[-3.9, 0.3], [3.9, 0.3], [3.9, 0.6], [-3.9, 0.6]], '#15171b');
    poly(g, X, Y, [[-2.75, 0.62], [1.05, 0.62], [1.32, 0.98], [-2.48, 0.98]], '#c9a248');
    poly(g, X, Y, [[-0.95, 0.98], [0.62, 0.98], [0.96, 1.42], [-0.62, 1.42]], '#15171b');
    texte(g, '40', (X(-0.62) + X(0.96)) / 2 + (X(0.62) - X(0.96)) * 0.1, Y(1.2), `900 ${Math.round((Y(0) - Y(1)) * 0.36)}px Arial Black, Arial`, '#f4f6fa');
    g.fillStyle = '#f2f5fa'; for (let i = 0; i < 4; i++) { g.fillRect(Math.min(X(-3.95), X(-2.85)), Y(1.42 - i * 0.12), Math.abs(X(-2.85) - X(-3.95)), (Y(0) - Y(1)) * 0.055); }
    for (let i = 0; i < 3; i++) g.fillRect(Math.min(X(-1.0), X(-2.3)), Y(1.42 - i * 0.12), Math.abs(X(-2.3) - X(-1.0)) * 0.55, (Y(0) - Y(1)) * 0.04);
    g.strokeStyle = 'rgba(10,20,40,0.55)'; g.lineWidth = 3; g.beginPath();                      // joints de portes
    for (const x of [1.08, -0.49, -1.68]) { g.moveTo(X(x), Y(1.62)); g.lineTo(X(x), Y(0.36)); }
    g.stroke();
    g.fillStyle = '#0f1013'; for (const x of [-0.2, -1.3]) g.fillRect(Math.min(X(x), X(x - 0.22)), Y(1.5), Math.abs(X(x - 0.22) - X(x)), 9);   // poignées
  }, { cw: 2800, ch: 460, roues: R });
  // pavillon : becquet de hayon, écope de capot
  const yT = S.haut(STg, -3.4, 0);                                                                   // becquet posé sur l'arête du pavillon
  prisme(a, [[-3.25, yT - 0.05], [-3.25, yT + 0.01], [-3.76, yT + 0.08], [-3.84, yT + 0.04], [-3.66, yT - 0.1]], -1.26, 1.26, bleu, 0.01);
  prisme(a, [[1.4, 1.565], [2.15, 1.6], [2.3, 1.585], [2.3, 1.545], [1.4, 1.55]], -0.42, 0.42, bleu, 0.01);
  a.boite(0.04, 0.05, 0.7, dark, 2.31, 1.565, 0);
  // face avant : calandre rectangulaire (cadre chromé, grille sombre à barrettes), grands phares rectangulaires, clignotants d'angle
  prismeX(a, [[-0.56, 1.02], [0.56, 1.02], [0.56, 1.4], [-0.56, 1.4]], 4.1, 3.98, a.mate('#1b1d22', 0.4, 0.5));
  for (let i = 0; i < 5; i++) a.boite(0.04, 0.03, 1.08, a.mate('#5b6068', 0.3, 0.8), 4.105, 1.07 + i * 0.075, 0);
  for (let i = -3; i <= 3; i++) a.boite(0.04, 0.36, 0.022, a.mate('#5b6068', 0.3, 0.8), 4.106, 1.21, i * 0.15);
  for (const sg of [-1, 1]) {
    a.boite(0.04, 0.04, 1.2, chrome, 4.11, sg > 0 ? 1.42 : 1.0, 0); a.boite(0.04, 0.42, 0.04, chrome, 4.11, 1.21, sg * 0.58);
    prismeX(a, [[sg * 0.66, 1.06], [sg * 1.18, 1.06], [sg * 1.18, 1.38], [sg * 0.66, 1.38]], 4.1, 4.0, a.mate('#c9b45a', 0.15, 0.6));   // optique jaune (miniature)
    prismeX(a, [[sg * 0.7, 1.1], [sg * 1.14, 1.1], [sg * 1.14, 1.34], [sg * 0.7, 1.34]], 4.115, 4.09, lumBlanche);
    prismeX(a, [[sg * 1.2, 1.1], [sg * 1.4, 1.1], [sg * 1.4, 1.36], [sg * 1.2, 1.36]], 4.08, 3.98, orange);
  }
  // pare-chocs « 5 mph » noirs massifs (avant et arrière), enveloppants, à bourrelet
  const bouclier = (x0, x1, sens) => {
    prismeX(a, [[-1.44, 0.44], [1.44, 0.44], [1.47, 0.48], [1.47, 0.66], [1.44, 0.7], [-1.44, 0.7], [-1.47, 0.66], [-1.47, 0.48]], x0, x1, noirB, 0.015);
    a.boite(0.04, 0.05, 2.7, a.mate('#3a3d44', 0.5, 0.3), x1 + sens * 0.015, 0.6, 0);                // bourrelet
    for (const sg of [-1, 1]) prisme(a, [[x0, 0.44], [x0, 0.7], [x0 - sens * 0.32, 0.7], [x0 - sens * 0.32, 0.44]], sg * 1.44, sg * 1.51, noirB, 0.012);   // retours d'angle
  };
  bouclier(4.04, 4.2, 1); bouclier(-4.03, -4.2, -1);
  a.boite(0.03, 0.18, 0.6, a.mate('#ededed', 0.5, 0.1), 4.215, 0.57, 0);                              // plaque vierge
  // poupe : feux verticaux le long du hayon, poignée, plaque, double sortie
  for (const sg of [-1, 1]) {
    prismeX(a, [[sg * 1.18, 0.86], [sg * 1.44, 0.86], [sg * 1.44, 1.62], [sg * 1.18, 1.62]], -4.0, -4.08, lumRouge);
    prismeX(a, [[sg * 1.18, 0.86], [sg * 1.44, 0.86], [sg * 1.44, 1.06], [sg * 1.18, 1.06]], -4.0, -4.085, orange);
    prismeX(a, [[sg * 1.15, 0.82], [sg * 1.47, 0.82], [sg * 1.47, 1.66], [sg * 1.15, 1.66]], -3.96, -4.06, noir);
    a.boite(0.14, 0.12, 0.08, noir, 0.95, 1.86, sg * 1.5);                                           // rétroviseurs
    a.boite(0.1, 0.16, 0.06, noir, 1.0, 1.76, sg * 1.46);
  }
  a.boite(0.03, 0.18, 0.6, a.mate('#ededed', 0.5, 0.1), -4.215, 0.57, 0);
  a.cyl(0.07, 0.07, 0.3, a.mate('#7d828b', 0.3, 0.9), -4.12, 0.3, 0.75, 0, Math.PI / 2, 14);
  a.degager(R, { jeu: 0.06, ep: 0.03, sauf: (m) => m.userData.decal });
  // carrossage négatif léger (posture drift) : appliqué aux pivots de roue une fois le bolide assemblé
  let carrosse = false;
  ctx.animes.push(() => {
    if (carrosse || !ctx.chassis.parent) return; carrosse = true;
    for (const c of ctx.chassis.parent.children) if (c !== ctx.chassis && c.isGroup && Math.abs(c.position.z) > 0.5) c.rotation.x = -Math.sign(c.position.z) * 0.045;
  });
  return { L: 8.42, largeur: 3.0, hauteur: 2.6, xAvant: 4.22, xArriere: -4.22, roues: R, plafond: 1460 / 1710 };
}

/* ================================================================== E08 : « Le Rond-Point 2018 » (Ford Focus II 5 portes 2008) */
/** Ruban plat (rubalise, sangle) le long d'une courbe 3D : largeur portée par la verticale projetée (ou `normale`). */
function ruban(a, pts, larg, mat, { seg = 60, normale = [0, 1, 0] } = {}) {
  const { THREE } = a, c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), N = new THREE.Vector3(...normale);
  const pos = [], uv = [], idx = [], L = c.getLength();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = c.getPointAt(t), tg = c.getTangentAt(t), w = N.clone().addScaledVector(tg, -N.dot(tg));
    if (w.lengthSq() < 1e-6) w.set(0, 0, 1); w.normalize().multiplyScalar(larg / 2);
    pos.push(p.x - w.x, p.y - w.y, p.z - w.z, p.x + w.x, p.y + w.y, p.z + w.z); uv.push(t * L, 0, t * L, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return a.ajouter(new THREE.Mesh(a.garde(g), mat));
}
/** Palette Europe (1 200 × 800 × 144 mm à l'échelle s) : 5 planches de dessus, 3 traverses, 9 dés, 3 semelles. Long côté selon z. */
function palette(a, s, x, y, z, rot, bois) {
  const { THREE } = a, gr = new THREE.Group(), L = 1.2 * s, P = 0.8 * s, e = 0.022 * s, hDe = 0.1 * s;
  const b = (l, h, p, m, px, py, pz) => { const o = new THREE.Mesh(a.garde(new THREE.BoxGeometry(l, h, p)), m); o.position.set(px, py, pz); gr.add(o); };
  for (let i = 0; i < 3; i++) b(0.1 * s, e, L, bois[i % bois.length], -P / 2 + 0.05 * s + i * (P - 0.1 * s) / 2, e / 2, 0);                  // semelles
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) b(0.1 * s, hDe, 0.145 * s, bois[(i + k + 1) % bois.length], -P / 2 + 0.05 * s + i * (P - 0.1 * s) / 2, e + hDe / 2, -L / 2 + 0.0725 * s + k * (L - 0.145 * s) / 2);   // dés
  for (let k = 0; k < 3; k++) b(P, e, 0.145 * s, bois[(k + 2) % bois.length], 0, e * 1.5 + hDe, -L / 2 + 0.0725 * s + k * (L - 0.145 * s) / 2);   // traverses
  for (let i = 0; i < 5; i++) b(0.1 * s, e, L, bois[(i + 1) % bois.length], -P / 2 + 0.05 * s + i * (P - 0.1 * s) / 4, e * 2.5 + hDe, 0);         // planches de dessus
  gr.position.set(x, y, z); gr.rotation.set(rot[0], rot[1], rot[2]); a.ajouter(gr); return { gr, h: e * 3 + hDe };
}
/** Pancarte en carton (deux faces : recto écrit au feutre, verso brut), plan local x = largeur, y = hauteur. */
function pancarte(a, txt, w, h, pos, rotY, { incl = 0, couleur = '#c79a5c', encre = '#141414', taille = 0.42 } = {}) {
  const { THREE } = a, gr = new THREE.Group();
  const lignes = txt.split('\n'), px = Math.round(256 * taille / Math.max(1, lignes.length * 0.82));
  const tex = texture(a, (g, cw, ch) => {
    g.fillStyle = couleur; g.fillRect(0, 0, cw, ch);
    g.fillStyle = 'rgba(90,60,25,0.22)'; for (let i = 0; i < 9; i++) g.fillRect(0, (i + 0.5) * ch / 9, cw, 3);          // cannelures du carton
    g.strokeStyle = 'rgba(70,45,15,0.5)'; g.lineWidth = 6; g.strokeRect(5, 5, cw - 10, ch - 10);
    g.save(); g.translate(cw / 2, ch / 2); g.rotate(-0.04); g.fillStyle = encre; g.font = `900 ${px}px "Comic Sans MS", "Marker Felt", "Arial Black", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const larg = Math.max(...lignes.map((l) => g.measureText(l).width)), k = Math.min(1, cw * 0.88 / larg, ch * 0.86 / (px * 1.05 * lignes.length));   // texte ajusté au carton
    g.scale(k, k); lignes.forEach((l, i) => g.fillText(l, 0, (i - (lignes.length - 1) / 2) * px * 1.05)); g.restore();
  }, 512, Math.round(512 * h / w));
  const recto = a.garde(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, envMap: a.envMap, envMapIntensity: 0.3 }));
  const tranche = a.mate('#a57a42', 0.95, 0);
  const plaque = new THREE.Mesh(a.garde(new THREE.BoxGeometry(w, h, 0.025)), [tranche, tranche, tranche, tranche, recto, tranche]);
  gr.add(plaque); gr.position.set(...pos); gr.rotation.set(incl, rotY, 0, 'YXZ'); a.ajouter(gr); return gr;
}

/**
 * Base : Ford Focus II restylée, 5 portes (2008) — 4 340 × 1 840 × 1 500 mm, empattement 2 640, voies 1 535.
 * Échelle s = 1,8 u/m → L 7,8 ; empattement 4,75 ; demi-largeur 1,655 ; pavillon 2,72.
 * Compacte « kinetic design » (capot plongeant, grande bouche trapézoïdale, phares étirés, ceinture qui remonte vers
 * l'arrière, feux verticaux de hayon) transformée en barricade roulante de rond-point : gilet jaune fluo drapé en tissu
 * sur le capot, galerie chargée de deux palettes ficelées, pneus empilés, bidon-brasero fumant, pancartes en carton
 * (slogans génériques), rubalise rouge et blanc tendue des rétroviseurs au chargement. Carrosserie : bleu clair de la miniature.
 * Le chargement est posé sur l'arrière du pavillon (hors tiers central de l'empattement, où se mesure le pavillon) :
 * `plafond` reste le rapport réel de la caisse (1 500 / 1 840). Chargement contenu à ≈ 25 % de la hauteur de la voiture
 * (palettes à l'avant de la galerie, pneus et bidon-brasero à l'arrière).
 */
function e08(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, { a, S, D } = atelier(ctx), s = 1.8;
  const bleu = a.pein('#5ccbe6', 0.24), noir = a.mate('#15161a', 0.6, 0.25), noirB = a.pein('#16171b', 0.3), dark = a.mate('#07080a', 0.9, 0.1);
  const R = [{ x: 2.23, RW: 0.67, ep: 0.46, z: 1.38, y: 0.67, avant: true, jante: '#f2f3f5', rayons: 'cinqCreux', levre: 0.04, flanc: null },
             { x: -2.52, RW: 0.67, ep: 0.46, z: 1.38, y: 0.67, avant: false, jante: '#f2f3f5', rayons: 'cinqCreux', levre: 0.04, flanc: null }];
  // caisse : capot haut et court, face avant franche (bouclier presque vertical), ceinture qui remonte vers l'arrière
  const xs = abscisses(-3.91, 3.93, 0.16, [-3.86, -3.8, 3.82, 3.88]);
  const ST = stations(xs, {
    y1: [[-3.91, 1.55], [-3.86, 1.8], [-3.72, 1.9], [-2.6, 1.9], [-1.0, 1.83], [0.5, 1.76], [1.3, 1.73], [2.2, 1.65], [3.1, 1.55], [3.6, 1.48], [3.8, 1.43], [3.88, 1.35], [3.93, 1.14]],
    y0: [[-3.91, 0.62], [-3.8, 0.44], [-3.5, 0.36], [3.4, 0.36], [3.82, 0.4], [3.93, 0.46]],
    w: [[-3.91, 1.32], [-3.8, 1.52], [-3.4, 1.62], [-2.52, 1.655], [-1, 1.63], [0.5, 1.625], [2.23, 1.65], [3.3, 1.62], [3.7, 1.55], [3.86, 1.46], [3.93, 1.32]],
    nt: [[-4, 3.6], [3.0, 3.6], [3.93, 4.6]], nb: 4.5, wt: 0.9,
  });
  a.loft(ST, bleu, { arches: archesJeu(R, 0.08), nx: 200, ns: 64 }); a.puits(R, dark, ST);
  // serre : pare-brise très couché, pavillon bombé, lunette de hayon inclinée
  const STg = stations(abscisses(-3.88, 1.42, 0.1, [-3.84, -3.78, 1.38]), {
    y1: [[-3.88, 1.75], [-3.82, 1.92], [-3.62, 2.22], [-3.36, 2.47], [-3.1, 2.57], [-2.3, 2.65], [-1.2, 2.69], [-0.75, 2.685], [-0.45, 2.635], [0.4, 2.22], [1.24, 1.8], [1.42, 1.66]],
    y0: 1.0, w: [[-3.88, 1.3], [-3.6, 1.47], [-2.5, 1.52], [0, 1.545], [1.2, 1.52], [1.42, 1.42]], nt: 4, nb: 3, wt: 0.8,
  });
  a.loft(STg, bleu, { nx: 160, ns: 64 });
  const teinte = '#1c2733';
  D.dessus(STg, -3.9, 1.45, -1.55, 1.55, (g, X, Z) => {
    verrePeint(g, X, Z, [[1.28, -1.3], [1.28, 1.3], [-0.35, 1.08], [-0.35, -1.08]], teinte, 18);
    verrePeint(g, X, Z, [[-3.3, -1.08], [-3.3, 1.08], [-3.76, 1.2], [-3.76, -1.2]], teinte, 12);
  }, { genre: 'verre', cw: 2200, ch: 700, nu: 220 });
  D.cote(STg, -3.9, 1.45, 1.72, 2.6, (g, X, Y) => {
    const v = (pts, r) => verrePeint(g, X, Y, pts, teinte, r);
    v([[1.1, 1.8], [-0.36, 2.52], [-1.02, 2.56], [-1.02, 1.79]], 10);                 // glace avant
    v([[-1.2, 1.8], [-1.2, 2.53], [-2.3, 2.5], [-2.55, 2.2], [-2.5, 1.9]], 10);       // glace arrière (ceinture qui remonte)
    v([[-2.72, 1.93], [-2.72, 2.36], [-3.02, 2.34], [-3.2, 2.1]], 6);                   // custode
    g.fillStyle = '#101114'; g.fillRect(X(-1.02), Y(2.56), X(-1.2) - X(-1.02), Y(1.78) - Y(2.56));   // montant B noir
  }, { genre: 'verre', cw: 2200, ch: 420 });
  // flancs : bas de caisse noir, joints, poignées ; pancartes scotchées sur les portes arrière
  D.cote(ST, -3.93, 3.92, 0.36, 1.86, (g, X, Y) => {
    poly(g, X, Y, [[-3.6, 0.36], [3.5, 0.36], [3.5, 0.52], [-3.6, 0.52]], '#16171b');
    g.strokeStyle = 'rgba(15,40,60,0.6)'; g.lineWidth = 3; g.beginPath();
    for (const x of [1.18, -1.1, -2.62]) { g.moveTo(X(x), Y(1.8)); g.lineTo(X(x), Y(0.55)); }
    g.moveTo(X(3.5), Y(1.18)); g.lineTo(X(-3.7), Y(1.36)); g.stroke();                // nervure de flanc
    g.fillStyle = '#2b3b45'; for (const x of [0.0, -1.95]) g.fillRect(Math.min(X(x), X(x - 0.24)), Y(1.6), Math.abs(X(x - 0.24) - X(x)), 10);
  }, { cw: 2600, ch: 460, roues: R });
  // face avant Focus II restylée (2008) : grande bouche trapézoïdale noire dans le bouclier, fine calandre haute chromée
  // entre les phares, grands blocs optiques qui remontent en flèche le long de l'aile, antibrouillards dans les angles
  prismeX(a, [[-0.86, 0.46], [0.86, 0.46], [0.66, 0.86], [-0.66, 0.86]], 3.95, 3.7, noirB, 0.02);
  for (let i = 0; i < 4; i++) a.boite(0.04, 0.03, 1.44 - i * 0.1, a.mate('#3b3f47', 0.4, 0.6), 3.955, 0.55 + i * 0.085, 0);
  prismeX(a, [[-0.52, 1.0], [0.52, 1.0], [0.6, 1.13], [-0.6, 1.13]], 3.95, 3.7, noirB, 0.012);
  a.boite(0.03, 0.025, 1.12, a.chrome, 3.965, 1.13, 0);
  D.face(ST, 1, -1.6, 1.6, 0.38, 1.45, (g, Z, Y) => {
    for (const sg of [-1, 1]) {
      poly(g, Z, Y, [[sg * 0.62, 1.0], [sg * 1.0, 0.97], [sg * 1.36, 1.03], [sg * 1.52, 1.2], [sg * 1.3, 1.3], [sg * 0.66, 1.16]], '#c9d0d8', 10);   // bloc optique
      g.fillStyle = '#eef4fb'; g.beginPath(); g.arc(Z(sg * 0.86), Y(1.09), (Y(0) - Y(1)) * 0.075, 0, 7); g.fill();
      g.beginPath(); g.arc(Z(sg * 1.16), Y(1.12), (Y(0) - Y(1)) * 0.06, 0, 7); g.fill();
      g.fillStyle = '#ff9a1f'; g.fillRect(Math.min(Z(sg * 1.3), Z(sg * 1.42)), Y(1.2), Math.abs(Z(sg * 1.42) - Z(sg * 1.3)), (Y(0) - Y(1)) * 0.04);
      poly(g, Z, Y, [[sg * 1.0, 0.52], [sg * 1.32, 0.52], [sg * 1.36, 0.7], [sg * 1.04, 0.7]], '#16171b', 8);                                       // logement d'antibrouillard
      g.fillStyle = '#e9ecf2'; g.beginPath(); g.arc(Z(sg * 1.18), Y(0.61), (Y(0) - Y(1)) * 0.06, 0, 7); g.fill();
    }
  }, { cw: 1400, ch: 640, nu: 110, nv: 56 });
  D.cote(ST, 2.9, 3.95, 1.1, 1.5, (g, X, Y) => {                                                     // queue du phare sur l'aile
    poly(g, X, Y, [[3.95, 1.2], [3.95, 1.36], [3.6, 1.44], [3.2, 1.44], [3.55, 1.3]], '#c9d0d8', 8);
  }, { cw: 512, ch: 192, nu: 40, nv: 12, eps: 0.018 });
  for (const sg of [-1, 1]) {
    for (const [zc, yc, r] of [[0.86, 1.09, 0.07], [1.16, 1.12, 0.055]]) {
      const xl = S.bout(ST, yc, sg * zc, 1); if (Number.isFinite(xl)) a.phares(xl + 0.015, yc, [sg * zc], r, lumBlanche);
    }
    // feux arrière verticaux montant le long du hayon
    const zf = (y) => sg * (S.flanc(ST, -3.84, Math.min(y, 1.8)) - 0.03);
    prismeX(a, [[zf(1.4) - sg * 0.3, 1.4], [zf(1.4), 1.4], [zf(1.8), 1.8], [zf(1.8) - sg * 0.2, 1.8]], -3.86, -3.93, lumRouge);
    prismeX(a, [[sg * (S.flanc(STg, -3.7, 1.86) - 0.04), 1.86], [sg * (S.flanc(STg, -3.7, 1.86) - 0.2), 1.86], [sg * (S.flanc(STg, -3.62, 2.12) - 0.18), 2.12], [sg * (S.flanc(STg, -3.62, 2.12) - 0.04), 2.12]], -3.66, -3.8, lumRouge);
    // rétroviseurs (dans la largeur hors tout)
    a.boite(0.26, 0.15, 0.13, bleu, 1.14, 1.94, sg * 1.6); a.boite(0.16, 0.08, 0.1, noir, 1.24, 1.82, sg * 1.53);
  }
  a.boite(0.3, 0.3, 2.3, noirB, -3.82, 0.52, 0);                                                         // bouclier arrière
  a.cyl(0.07, 0.07, 0.2, a.mate('#7d828b', 0.3, 0.9), -3.95, 0.42, 0.7, 0, Math.PI / 2, 14);

  /* ---- gilet jaune fluo drapé sur le capot : nappe de tissu (plis, bord retombant sur le nez), bandes réfléchissantes ---- */
  const gilet = matDecal(a, (g, w, h) => {
    // gilet ouvert, posé à plat : encolure en V vers le pare-brise (gauche du canvas), bas vers le nez (droite)
    const P = (x, y) => [x * w, y * h];
    g.fillStyle = '#d2ff00'; g.beginPath();
    g.moveTo(...P(0.03, 0.1)); g.lineTo(...P(0.03, 0.34)); g.lineTo(...P(0.36, 0.5)); g.lineTo(...P(0.03, 0.66)); g.lineTo(...P(0.03, 0.9));
    g.quadraticCurveTo(...P(0.1, 0.9), ...P(0.14, 0.97)); g.quadraticCurveTo(...P(0.26, 0.86), ...P(0.38, 0.97)); g.lineTo(...P(0.97, 0.97)); g.lineTo(...P(0.97, 0.03)); g.lineTo(...P(0.38, 0.03));
    g.quadraticCurveTo(...P(0.26, 0.14), ...P(0.14, 0.03)); g.quadraticCurveTo(...P(0.1, 0.1), ...P(0.03, 0.1)); g.closePath(); g.fill();
    g.save(); g.clip();
    for (const x of [0.56, 0.78]) { g.fillStyle = '#c3c8cf'; g.fillRect(x * w, 0, 0.09 * w, h); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect((x + 0.015) * w, 0, 0.02 * w, h); }
    g.strokeStyle = 'rgba(110,130,0,0.7)'; g.lineWidth = 6; g.beginPath(); g.moveTo(...P(0.36, 0.5)); g.lineTo(...P(0.97, 0.5)); g.stroke();   // fermeture
    g.strokeStyle = 'rgba(120,140,10,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(...P(0.03, 0.1)); g.lineTo(...P(0.03, 0.34)); g.moveTo(...P(0.03, 0.66)); g.lineTo(...P(0.03, 0.9)); g.stroke();
    g.restore();
  }, 512, 512, 'mat');
  gilet.side = THREE.DoubleSide; gilet.depthWrite = true; gilet.polygonOffset = false; gilet.alphaTest = 0.5; gilet.transparent = false;
  gilet.emissive = new THREE.Color('#4d5c00');
  {
    const cx = 3.1, cz = 0.05, Lx = 1.75, Lz = 1.65, th = 0.18, c = Math.cos(th), sn = Math.sin(th);
    nappe(a, (u, v) => {
      const lx = (u - 0.5) * Lx, lz = (v - 0.5) * Lz, x = cx + lx * c - lz * sn, z = cz + lx * sn + lz * c;
      // plis : ondes diagonales amorties, bourrelet froissé à l'encolure, tissu soulevé ; le bas retombe sur le nez
      const pli = 0.05 * Math.max(0, Math.sin(lx * 7 + lz * 3.5)) * (0.4 + 0.6 * Math.cos(lz * 2.2)) + 0.05 * Math.exp(-((lx + 0.7) ** 2 + (lz * 0.8) ** 2) * 9) + 0.015 * Math.sin(lz * 13 + lx * 2);
      const xs2 = Math.min(x, 3.89), chute = x > 3.89 ? (x - 3.89) * 1.6 : 0;
      return [xs2 + (x > 3.89 ? 0.02 : 0), S.haut(ST, xs2, z) + 0.035 + pli - chute, z];
    }, 80, 72, gilet, 3);
  }

  /* ---- galerie de toit sur l'arrière du pavillon, palettes ficelées, pneus empilés, bidon-brasero ---- */
  // galerie à niveau sur l'arrière du pavillon (barres à -1,3 / -2,45 / -3,25, pieds posés sur le toit)
  const yRack = Math.max(S.haut(STg, -1.3, 0), S.haut(STg, -2.45, 0)) + 0.12;
  for (const xb of [-1.3, -2.45, -3.25]) {
    a.boite(0.09, 0.06, 2.3, noir, xb, yRack, 0);
    for (const sg of [-1, 1]) { const yr = S.haut(STg, xb, sg * 1.0); a.boite(0.14, yRack - yr + 0.02, 0.1, noir, xb, (yRack + yr) / 2, sg * 1.04); }
  }
  for (const sg of [-1, 1]) poutre(a, [-1.05, yRack + 0.02, sg * 1.15], [-3.45, yRack + 0.02, sg * 1.15], 0.035, 0, noir, true);   // longerons
  const bois = ['#c9a46b', '#b8925a', '#d4b27a', '#a98350'].map((h) => a.mate(h, 0.85, 0));
  // deux palettes ficelées sur l'avant de la galerie (hors tiers central de l'empattement)
  const yP = yRack + 0.035, xP = -1.8;
  const p1 = palette(a, s, xP, yP, 0, [0, 0, 0.0], bois);
  palette(a, s, xP - 0.03, yP + p1.h + 0.005, 0.05, [0.0, 0.06, -0.015], bois);
  const yHaut = yP + p1.h * 2 + 0.03;
  const corde = a.mate('#d9c79a', 0.9, 0);
  for (const xc of [xP + 0.6, xP - 0.6]) tuyau(a, [[xc, yRack + 0.02, -1.15], [xc, yHaut - 0.02, -1.11], [xc + 0.02, yHaut + 0.02, 0], [xc, yHaut - 0.02, 1.11], [xc, yRack + 0.02, 1.15]], 0.022, corde, 40, 6);
  tuyau(a, [[xP + 0.65, yHaut - 0.04, -0.9], [xP + 0.1, yHaut + 0.03, -0.2], [xP - 0.65, yHaut - 0.04, 0.9]], 0.02, corde, 20, 6);
  // pneus usagés empilés (deux, couchés) sur l'arrière de la galerie, sanglés
  const gomme = a.mate('#17181b', 0.92, 0), ePn = 0.2 * s, rPn = 0.27 * s, xT = -3.02, zT = 0.48;
  for (let i = 0; i < 2; i++) {
    const t = new THREE.Mesh(a.garde(new THREE.TorusGeometry(rPn - ePn * 0.42, ePn * 0.5, 14, 36)), gomme);
    t.rotation.x = Math.PI / 2; t.scale.set(1, 1, 0.82); t.position.set(xT + i * 0.04, yRack + 0.03 + ePn * 0.41 + i * ePn * 0.82, zT - i * 0.03); a.ajouter(t);
  }
  const yPneus = yRack + 0.03 + 2 * ePn * 0.82;
  tuyau(a, [[xT, yRack + 0.02, zT - rPn - 0.03], [xT, yPneus + 0.02, zT - rPn * 0.5], [xT, yPneus + 0.02, zT + rPn * 0.5], [xT, yRack + 0.02, zT + rPn + 0.03]], 0.02, corde, 24, 6);
  // bidon-brasero sur la galerie, à côté des pneus : fût percé, braises, flammes, fumée animées
  const xF = -3.0, zF = -0.62, rF = 0.15 * s, hF = 0.26 * s, yF = yRack + 0.03, acier = a.mate('#5e5a55', 0.6, 0.6), rouille = a.mate('#7a4a2a', 0.85, 0.3);
  const fut = new THREE.Mesh(a.garde(new THREE.CylinderGeometry(rF, rF * 0.97, hF, 26, 1, true)), a.garde(new THREE.MeshStandardMaterial({ map: texture(a, (g, w, h) => {
    g.fillStyle = '#6a5c4e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(122,74,42,0.6)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 53) % h, 30, 14);
    g.fillStyle = '#ff8a1a'; for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) { g.beginPath(); g.arc((i + (r % 2) * 0.5) * w / 10, h * (0.35 + r * 0.25), 10, 0, 7); g.fill(); }
    g.fillStyle = '#4a4440'; g.fillRect(0, h * 0.06, w, 8); g.fillRect(0, h * 0.9, w, 8);
  }, 512, 256), roughness: 0.75, metalness: 0.4, side: THREE.DoubleSide, envMap: a.envMap, envMapIntensity: 0.3, emissive: new THREE.Color('#3a1500') })));
  fut.position.set(xF, yF + hF / 2, zF); a.ajouter(fut);
  a.cyl(rF * 1.02, rF * 1.02, 0.03, rouille, xF, yF + hF, zF, 0, 0, 26);
  a.cyl(rF * 0.95, rF * 0.95, 0.02, acier, xF, yF + 0.02, zF, 0, 0, 20);
  const braise = a.garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a10').multiplyScalar(1.6), toneMapped: false }));
  a.cyl(rF * 0.9, rF * 0.9, 0.04, braise, xF, yF + hF * 0.82, zF, 0, 0, 20);
  const flammes = [];
  for (const [dx, dz, hh, col] of [[0, 0, 0.32, '#ffb321'], [0.07, 0.05, 0.24, '#ff6a12'], [-0.06, -0.05, 0.27, '#ff8a1a'], [0.02, -0.08, 0.2, '#ffd54a']]) {
    const f = new THREE.Mesh(a.garde(new THREE.ConeGeometry(0.085, hh, 10)), a.garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.9 })));
    f.position.set(xF + dx, yF + hF * 0.84 + hh / 2, zF + dz); a.ajouter(f); flammes.push([f, hh]);
  }
  const fumee = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(a.garde(new THREE.SphereGeometry(0.09 + i * 0.022, 14, 10)), a.garde(new THREE.MeshStandardMaterial({ color: a.lin('#a9abb0'), roughness: 1, metalness: 0, transparent: true, opacity: 0.4 - i * 0.07, depthWrite: false })));
    m.position.set(xF - i * 0.08, yF + hF + 0.22 + i * 0.1, zF); a.ajouter(m); fumee.push(m);
  }
  ctx.animes.push((t) => {
    flammes.forEach(([f, hh], i) => { const k = 0.8 + 0.25 * Math.sin(t * (17 + i * 5) + i); f.scale.set(1, k, 1); f.position.y = yF + hF * 0.84 + hh * k / 2; });
    fumee.forEach((m, i) => { const p = ((t * 0.35 + i / 4) % 1); m.position.set(xF - p * 0.4, yF + hF + 0.18 + p * 0.45, zF + Math.sin(t + i) * 0.04); m.scale.setScalar(0.7 + p * 0.6); m.material.opacity = 0.4 * (1 - p); });
  });
  // petit fanion-gilet noué à l'angle arrière de la galerie (tissu animé)
  const xM = -3.4, zM = -1.15, yM1 = yRack + 0.48;
  a.cyl(0.02, 0.02, yM1 - yRack, a.mate('#8a6a3e', 0.8, 0), xM, (yRack + yM1) / 2, zM, 0, 0, 8);
  const drap = matDecal(a, (g, w, h) => {
    g.fillStyle = '#d7f20f'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8cdd2'; g.fillRect(0, h * 0.42, w, h * 0.1); g.fillRect(0, h * 0.66, w, h * 0.1);
  }, 256, 256, 'mat');
  drap.transparent = false; drap.depthWrite = true; drap.polygonOffset = false; drap.emissive = new THREE.Color('#2a3300');
  const drapeau = nappe(a, (u, v) => [xM - u * 0.42, yM1 - 0.03 - (1 - v) * 0.3, zM], 18, 5, drap, 3);
  ctx.animes.push((t) => {
    const p = drapeau.geometry.attributes.position;
    for (let i = 0; i <= 18; i++) for (let k = 0; k <= 5; k++) { const u = i / 18; p.setZ(i * 6 + k, zM + u * 0.1 * Math.sin(u * 6 - t * 7)); }
    p.needsUpdate = true;
  });

  /* ---- pancartes en carton (slogans génériques) ---- */
  for (const sg of [-1, 1]) {
    pancarte(a, 'ON LÂCHE RIEN', 1.24, 0.46, [xP, yP + p1.h * 0.98, sg * (0.6 * s + 0.06)], sg > 0 ? 0 : Math.PI, { incl: 0, taille: 0.5 });   // flancs de la pile
    pancarte(a, '80 KM/H\nNON', 1.05, 0.68, [-1.42, 1.3, sg * (S.flanc(ST, -1.42, 1.3) + 0.035)], sg > 0 ? 0 : Math.PI, { incl: 0, taille: 0.6, couleur: '#d3a96c' });   // porte arrière
  }
  pancarte(a, 'RIC', 1.0, 0.44, [xP + 0.4 * s + 0.05, yP + p1.h * 1.05, 0], Math.PI / 2, { incl: -0.1, taille: 0.75 });             // face avant de la pile
  pancarte(a, 'RIC', 0.8, 0.42, [-3.84, 1.18, 0], -Math.PI / 2, { incl: 0.05, taille: 0.75, couleur: '#d3a96c' });                         // hayon
  /* ---- rubalise rouge et blanche : des rétroviseurs au chargement, et en travers du capot ---- */
  const rubalise = a.garde(new THREE.MeshStandardMaterial({ map: (() => { const t = texture(a, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0261c'; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 64, h); g.lineTo(i * 64 + 32, h); g.closePath(); g.fill(); } }, 256, 64); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2.2, 1); return t; })(), roughness: 0.5, metalness: 0, side: THREE.DoubleSide, envMap: a.envMap, envMapIntensity: 0.4 }));
  for (const sg of [-1, 1]) {
    ruban(a, [[1.16, 1.97, sg * 1.62], [0.2, 2.1, sg * 1.52], [-0.7, 2.6, sg * 1.3], [xP + 0.7, yP + 0.25, sg * 1.12]], 0.07, rubalise);
    ruban(a, [[xP + 0.72, yHaut, sg * 1.1], [xP, yHaut + 0.02, sg * 1.13], [xP - 0.72, yHaut, sg * 1.1]], 0.07, rubalise);
  }
  ruban(a, [[1.16, 1.97, -1.6], [1.6, 1.84, -0.8], [1.75, 1.8, 0], [1.6, 1.84, 0.8], [1.16, 1.97, 1.6]], 0.07, rubalise);
  a.degager(R, { jeu: 0.06, ep: 0.03, sauf: (m) => m.userData.decal });
  return { L: 7.9, largeur: 2 * 1.655, hauteur: Math.max(yPneus, yM1) + 0.05, xAvant: 3.97, xArriere: -3.93, roues: R, plafond: 1500 / 1840 };
}

/* ================================================================== E02 : Lamborghini Centenario Roadster (2016) */
/**
 * Cotes réelles : 4 924 × 2 062 × 1 143 mm, empattement 2 700, voies 1 720 / 1 680 ; pneus 255/30 R20 AV, 355/25 R21 AR.
 * Échelle s = 1,706 u/m → L 8,4 ; empattement 4,61 ; demi-largeur 1,76 ; hauteur 1,95 (cadre de pare-brise).
 * Hypercar à moteur central en coin : nez en flèche très bas qui plonge au centre, prises d'air avant en Y aux angles,
 * capot et pare-brise dans une seule ligne tendue, flancs creusés (taille de guêpe aux portières, grande écope sculptée
 * sous la hanche arrière débordante), roadster (habitacle ouvert, deux bossages et arceaux derrière les sièges),
 * capot moteur à persiennes hexagonales, poupe ouverte à DIFFUSEUR massif et grands ailerons verticaux, feux fins en Y,
 * triple sortie centrale. Couleur de la miniature : jaune, éléments noirs ; jantes noires à liseré jaune (turbine fine).
 */
function e02(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, { a } = atelier(ctx);
  const jaune = a.pein('#f2b900', 0.2), noir = a.pein('#111216', 0.3), carbone = a.mate('#17181d', 0.45, 0.35), dark = a.mate('#07080a', 0.9, 0.1);
  const cuir = a.mate('#1b1c21', 0.75, 0.05), titane = a.mate('#6b6f78', 0.3, 0.9), creux = a.mate('#0b0c0f', 0.7, 0.2), lames = a.mate('#2c2f37', 0.38, 0.5);
  const RA = 0.62, RR = 0.67, xA = 2.15, xR = -2.456, JEU = 0.08;
  const R = [{ x: xA, RW: RA, ep: 0.5, z: 1.46, y: RA, avant: true, jante: '#16171c', rayons: 'turbine', levre: 0.03, flanc: '#f4d21a' },
             { x: xR, RW: RR, ep: 0.62, z: 1.43, y: RR, avant: false, jante: '#16171c', rayons: 'turbine', levre: 0.03, flanc: '#f4d21a' }];
  /* La Centenario est construite en volumes à sections polygonales LISSÉS dans la longueur (coque) : surfaces tendues,
     arêtes vives entre les pans, comme la carrosserie réelle. Les arches de roues suivent un cercle à jeu constant
     au-dessus du pneu (stations serrées) ; la poupe descend et s'effile au-dessus d'un diffuseur massif. */
  const arche = (x, xc, Rw) => { const r = Rw + JEU, d = x - xc; return Math.abs(d) >= r ? 0 : Rw + Math.sqrt(r * r - d * d); };
  const sym = (x, pts) => ({ x, pts: [...pts.map(([z, y]) => [-z, y]).reverse(), ...pts] });
  const cote = (sg, x, pts) => ({ x, pts: pts.map(([z, y]) => [sg * z, y]) });
  const serre = (x0, x1, pas, extra = []) => abscisses(Math.min(x0, x1), Math.max(x0, x1), pas, extra);
  // ligne haute centrale : nez en flèche, capot tendu, fond d'habitacle, cloison, capot moteur qui descend vers la poupe
  const H = courbe([[-4.2, 1.38], [-3.6, 1.48], [-2.6, 1.58], [-1.6, 1.6], [-1.5, 1.36], [0.72, 1.36], [0.8, 1.49], [0.98, 1.49], [1.4, 1.43], [2.0, 1.33], [2.7, 1.18], [3.3, 1.0], [3.6, 0.88], [3.9, 0.74], [4.1, 0.6], [4.24, 0.46]]);
  // 1) épine centrale
  coque(a, [4.24, 4.16, 4.05, 3.8, 3.4, 2.9, 2.4, 1.9, 1.4, 0.98, 0.8, 0.72, -0.4, -1.5, -1.6, -2.4, -3.2, -3.9, -4.2].map((x) => {
    const yt = H(x), y0 = x > 4.1 ? 0.24 : x < -3.0 ? 0.17 + (-3.0 - x) * 0.65 : 0.17, w = x > 4.16 ? 0.32 : x > 4.0 ? 0.85 : 1.06;
    return sym(x, [[w - 0.08, y0], [w, y0 + 0.1], [w, yt - 0.06], [w - 0.15, yt]]);
  }), jaune);
  for (const sg of [-1, 1]) {
    // 2) angles avant : partie basse noire (prises d'air en Y enveloppant l'angle), partie haute jaune
    const av = [[4.14, 0.55, 1.12, 0.2, 0.52, 0.56], [4.0, 0.55, 1.42, 0.17, 0.68, 0.7], [3.75, 0.55, 1.6, 0.17, 0.84, 0.86], [3.4, 0.55, 1.68, 0.17, 1.0, 0.99], [3.05, 0.55, 1.71, 0.17, 1.14, 1.09], [2.86, 0.55, 1.71, 0.2, 1.22, 1.15]];
    coque(a, av.map(([x, zi, zo, y0]) => cote(sg, x, [[zi, y0], [zo - 0.06, y0], [zo, y0 + 0.1], [zo, 0.5], [zo - 0.02, 0.52], [zi, 0.52]])), creux);
    coque(a, av.map(([x, zi, zo, y0, yo, yi]) => cote(sg, x, [[zi, 0.5], [zo - 0.02, 0.5], [zo, 0.52], [zo, yo - 0.08], [zo - 0.1, yo], [zi, yi]])), jaune);
    // 3) capot d'aile avant (crête au-dessus du capot), dessous = arche ronde à jeu constant
    coque(a, serre(1.44, 2.86, 0.07).reverse().map((x) => {
      const yb = Math.max(arche(x, xA, RA), 0.2), yt = Math.max(H(x) + 0.12, yb + 0.12, 1.22) + (x < 1.6 ? 0.06 : 0);
      return cote(sg, x, [[1.0, yb], [1.68, yb], [1.71, yb + 0.05], [1.71, yt - 0.1], [1.57, yt], [1.0, yt - 0.04]]);
    }), jaune);
    // 4) portière : flanc plein, creux sous l'arête diagonale, ceinture haute de roadster
    coque(a, [[1.44, 1.63, 1.58], [1.0, 1.63, 1.56], [0.3, 1.62, 1.56], [-0.5, 1.6, 1.56]].map(([x, zo, yt]) => cote(sg, x, [[1.0, 0.17], [zo - 0.12, 0.17], [zo - 0.04, 0.5 + (x - 1.44) * -0.08], [zo, 1.0], [zo - 0.1, yt], [1.0, yt]])), jaune);
    // fond d'écope en retrait sous la hanche
    coque(a, [[-0.5, 1.3, 1.5], [-0.56, 1.26, 1.4], [-1.2, 1.18, 1.1], [-1.62, 1.12, 0.9]].map(([x, zo, yt]) => cote(sg, x, [[0.95, 0.2], [zo - 0.08, 0.2], [zo, 0.32], [zo, yt - 0.05], [zo - 0.06, yt], [0.95, yt]])), creux);
    // 5) hanche arrière débordante : avant fuyant au-dessus de l'écope, arche ronde, poupe BASSE et effilée (lame de 0,27)
    const HH = courbe([[-4.22, 1.42], [-3.7, 1.5], [-3.0, 1.6], [-2.2, 1.65], [-1.2, 1.63], [-0.6, 1.58]]);
    coque(a, serre(-4.22, -0.56, 0.08, [-0.6, -0.66]).reverse().map((x) => {
      const ya = arche(x, xR, RR), avant = x > -1.6, yb = ya ? ya : avant ? Math.max(0.86, 1.48 - (-0.56 - x) * 0.55) : Math.min(1.15, 0.86 + Math.max(0, -3.2 - x) * 0.29);
      const zo = x > -0.6 ? 1.5 : x > -0.95 ? 1.5 + (-0.6 - x) * 0.75 : x < -3.9 ? 1.765 - (-3.9 - x) * 0.4 : 1.765, yt = HH(x);
      return cote(sg, x, [[0.95, yb], [zo - 0.06, yb], [zo, yb + 0.06], [zo, Math.max(yb + 0.08, yt - 0.16)], [zo - 0.14, yt], [0.95, yt - 0.02]]);
    }), jaune);
    // lame d'écope en saillie, bas de caisse noir, arête vive de portière
    poutre(a, [-0.52, 0.3, sg * 1.38], [-0.62, 1.46, sg * 1.52], 0.09, 0.07, jaune);
    coque(a, [[1.5, 0.17, 0.32], [0.0, 0.17, 0.36], [-1.62, 0.2, 0.44]].map(([x, y0, yt]) => cote(sg, x, [[1.2, y0], [1.6, y0], [1.66, y0 + 0.06], [1.66, yt], [1.2, yt]])), creux);
    poutre(a, [1.5, 1.0, sg * 1.645], [-0.45, 0.52, sg * 1.635], 0.025, 0.02, a.mate('#9c7a00', 0.4, 0.3));
    // rétroviseur en aile sur bras fin (bras ancré dans la portière)
    poutre(a, [0.88, 1.52, sg * 1.5], [0.76, 1.63, sg * 1.52], 0.03, 0, noir, true);
    prisme(a, [[0.9, 1.6], [0.62, 1.62], [0.58, 1.72], [0.84, 1.71]], sg * 1.44, sg * 1.6, jaune, 0.02);
    // écope de toit de hanche (prise d'air haute, noire)
    prismeX(a, [[sg * 1.0, 1.52], [sg * 1.55, 1.52], [sg * 1.5, 1.62], [sg * 1.0, 1.62]], -0.62, -0.9, dark);
  }
  // capot : ouïes ; capot moteur vitré à persiennes hexagonales entre les bossages
  for (const sg of [-1, 1]) prisme(a, [[2.4, H(2.4) + 0.005], [2.95, H(2.95) + 0.005], [2.95, H(2.95) + 0.025], [2.4, H(2.4) + 0.025]], sg * 0.06, sg * 0.24, dark);
  const hexa = new THREE.Mesh(a.garde(new THREE.PlaneGeometry(2.1, 0.78)), matDecal(a, (g, w, h) => {
    g.fillStyle = '#15161a'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3d46';
    for (let i = 0; i < 10; i++) for (let k = 0; k < 3; k++) { const cx = 30 + i * 54, cy = 32 + k * 58 + (i % 2) * 29; g.beginPath(); for (let t = 0; t < 6; t++) g.lineTo(cx + 22 * Math.cos(t * Math.PI / 3), cy + 22 * Math.sin(t * Math.PI / 3)); g.closePath(); g.fill(); }
  }, 560, 210, 'peint'));
  hexa.rotation.x = -Math.PI / 2; const capot = new THREE.Group(); capot.add(hexa); capot.position.set(-2.7, H(-2.7) + 0.012, 0); capot.rotation.z = 0.06; a.ajouter(capot);
  // pare-brise enveloppant très couché, cadre noir
  const verre = a.vitre('#1a2029', 0.82);
  const pb = (u, v) => { const x = 0.98 - u * 1.25, y = 1.49 + u * 0.44 - 0.12 * (2 * v - 1) ** 2 * (1 - u * 0.3), z = (2 * v - 1) * (1.3 - u * 0.28); return [x, y, z]; };
  nappe(a, pb, 20, 24, verre);
  nappe(a, (u, v) => { const [x, y, z] = pb(0.84 + u * 0.16, v); return [x - 0.01, y + 0.04, z]; }, 6, 24, noir);   // bandeau de pare-brise (point haut, 1 143 mm)
  tuyau(a, Array.from({ length: 13 }, (_, i) => { const [x, y, z] = pb(1, i / 12); return [x - 0.02, y + 0.015, z]; }), 0.05, noir, 40, 8);
  for (const sg of [-1, 1]) tuyau(a, Array.from({ length: 7 }, (_, i) => { const [x, y, z] = pb(i / 6, sg > 0 ? 1 : 0); return [x, y, z + sg * 0.02]; }), 0.045, noir, 20, 8);
  // habitacle : baquets, arceaux, bossages jaunes qui filent en descendant vers la poupe, volant, planche de bord
  for (const sg of [-1, 1]) {
    const zs = sg * 0.62;
    a.boite(0.62, 0.14, 0.5, cuir, -0.6, 1.43, sg * 0.5);
    const dos = a.boite(0.14, 0.56, 0.5, cuir, -0.98, 1.68, sg * 0.5); dos.rotation.z = 0.3;
    const bo = new THREE.Mesh(a.garde(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2)), jaune); bo.scale.set(1.45, 0.2, 0.3);
    const gb = new THREE.Group(); gb.add(bo); gb.position.set(-2.55, H(-2.55) - 0.02, zs); gb.rotation.z = 0.07; a.ajouter(gb);
    const ar = new THREE.Mesh(a.garde(new THREE.TorusGeometry(0.22, 0.05, 10, 20, Math.PI)), noir); ar.rotation.y = Math.PI / 2; ar.position.set(-1.2, 1.62, sg * 0.5); a.ajouter(ar);
  }
  a.ajouter(new THREE.Mesh(a.garde(new THREE.TorusGeometry(0.16, 0.03, 8, 24)), noir)).position.set(0.3, 1.62, 0.5);
  a.boite(0.3, 0.14, 2.0, carbone, 0.66, 1.46, 0);
  // face avant : branche haute du Y, lame jaune en fourche, phares fins, bouche centrale, lame (dans la silhouette)
  for (const sg of [-1, 1]) {
    poutre(a, [4.12, 0.5, sg * 1.0], [3.95, 0.7, sg * 1.38], 0.08, 0.05, creux);
    poutre(a, [4.16, 0.33, sg * 0.62], [4.16, 0.35, sg * 1.12], 0.045, 0.04, jaune);
    poutre(a, [4.16, 0.35, sg * 1.12], [4.02, 0.37, sg * 1.42], 0.045, 0.04, jaune);
    poutre(a, [4.02, 0.37, sg * 1.42], [3.77, 0.39, sg * 1.6], 0.045, 0.04, jaune);
    poutre(a, [4.06, 0.54, sg * 0.66], [3.92, 0.67, sg * 1.3], 0.04, 0.03, lumBlanche);
    poutre(a, [3.98, 0.6, sg * 1.0], [3.86, 0.71, sg * 1.05], 0.03, 0.03, lumBlanche);
    poutre(a, [3.9, 0.69, sg * 1.34], [3.78, 0.8, sg * 1.5], 0.035, 0.03, lumBlanche);
  }
  prismeX(a, [[-0.26, 0.24], [0.26, 0.24], [0.12, 0.36], [-0.12, 0.36]], 4.25, 4.1, creux);
  prisme(a, [[3.75, 0.14], [4.16, 0.16], [4.16, 0.2], [3.75, 0.2]], -1.1, 1.1, carbone);
  /* poupe basse : fin bandeau noir des feux en Y sous la lèvre du capot moteur, au-dessus d'un DIFFUSEUR massif qui
     remonte de l'essieu arrière jusqu'aux feux, cloisonné de grands ailerons verticaux (les extérieurs les plus hauts),
     et triple sortie hexagonale au centre */
  prismeX(a, [[-1.62, 1.04], [1.62, 1.04], [1.66, 1.36], [-1.66, 1.36]], -4.12, -4.22, noir, 0.01);
  for (const sg of [-1, 1]) for (const zc of [0.6, 1.25]) {
    const q = (z, y) => [-4.24, y, sg * z];
    poutre(a, q(zc - 0.22, 1.14), q(zc, 1.22), 0.035, 0.03, lumRouge); poutre(a, q(zc, 1.22), q(zc + 0.22, 1.14), 0.035, 0.03, lumRouge); poutre(a, q(zc, 1.22), q(zc, 1.33), 0.035, 0.03, lumRouge);
  }
  prisme(a, [[-2.95, 0.17], [-4.36, 0.5], [-4.36, 1.02], [-4.05, 1.04], [-3.35, 0.52]], -1.36, 1.36, carbone, 0.02);
  for (let i = -3; i <= 3; i++) {
    const hT = Math.abs(i) === 3 ? 1.2 : Math.abs(i) === 2 ? 1.04 : 0.92, xb = Math.abs(i) === 3 ? -4.5 : -4.44;
    prisme(a, [[-2.9, 0.17], [xb, 0.5], [xb - 0.03, hT], [xb + 0.26, hT], [-3.5, 0.6]], i * 0.44 - 0.035, i * 0.44 + 0.035, lames, 0.008);
  }
  for (const dz of [-0.22, 0, 0.22]) {
    const t = a.cyl(0.1, 0.1, 0.3, titane, -4.3, 1.1, dz, 0, Math.PI / 2, 6); t.rotation.x = Math.PI / 6;
    a.cyl(0.07, 0.07, 0.02, dark, -4.46, 1.1, dz, 0, Math.PI / 2, 6);
  }
  a.boite(0.34, 0.04, 2.9, noir, -4.12, 1.43, 0).rotation.z = 0.08;                                      // lèvre de becquet effilée
  for (const r of R) for (const sg of [-1, 1]) a.arcGarde(r.x, r.RW, r.RW + 0.04, r.RW + JEU - 0.005, sg * (r.z - 0.04), r.ep * 0.8, dark, -0.1, Math.PI + 0.1);
  return { L: 8.75, largeur: 2 * 1.765, hauteur: 1.95, xAvant: 4.25, xArriere: -4.5, roues: R, plafond: 1143 / 2062 };
}

export const V5_EUROPE = { E02: e02, E05: e05, E07: e07, E08: e08 };
