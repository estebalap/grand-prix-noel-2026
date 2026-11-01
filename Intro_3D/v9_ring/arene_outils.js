/* OUTILS DU SEGMENT « ARÈNE » (V9 Ring) — mathématiques pures, textures procédurales, collisions 3D.

   Tout est déterministe : PRNG semés (mulberry32 sur un texte), aucune lecture de Math.random(), aucune accumulation d'état
   d'une image à l'autre (les « ressorts » sont des réponses impulsionnelles ANALYTIQUES, évaluées directement en t).

   Contenu :
     clamp, lerp, smoother, doux, easeOut, gauss, angleDiff     interpolations
     prng(graine)                                               PRNG mulberry32
     hermite(cles, t, cle)                                      spline d'Hermite (tangentes Catmull-Rom non uniformes) : C1 en temps
     ressort(tau, w, zeta)                                      réponse impulsionnelle d'un 2ᵉ ordre sous-amorti (0 si tau < 0)
     texCanvas, texHalo, haloSprite                             textures canvas
     fusionner(THREE, morceaux)                                 fusion de géométries (position, normale, attribut « partie »)
     obbDepuis(env, boite, nom, rognage)                        boîte orientée 3D d'une voiture posée (cap + tangage + roulis)
     obbFixe(nom, centre, demi, rotY, rotX)                     boîte orientée d'un décor
     penetrationOBB(a, b)                                       SAT 3D (15 axes) : profondeur > 0 si interpénétration
     distanceSegmentOBB(p0, p1, obb)                            distance d'un segment (corde, poteau) à une boîte orientée */

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smoother = (u) => { const k = clamp(u); return k * k * k * (k * (k * 6 - 15) + 10); };
export const doux = (u) => { const k = clamp(u); return k * k * (3 - 2 * k); };
export const easeOut = (u) => { const k = 1 - clamp(u); return 1 - k * k * k; };
export const gauss = (x) => Math.exp(-x * x);
export const DEG = Math.PI / 180;
/** Écart angulaire b − a ramené dans ]−π, π]. */
export const angleDiff = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d <= -Math.PI) d += 2 * Math.PI; return d; };

export function hashTexte(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function prng(graine) {
  let a = hashTexte(String(graine));
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Spline d'Hermite cubique (tangentes de Catmull-Rom non uniformes, nulles aux extrémités) : vitesse continue, aucune saccade. */
export function hermite(cles, t, cle) {
  const n = cles.length;
  if (t <= cles[0].t) return cles[0][cle];
  if (t >= cles[n - 1].t) return cles[n - 1][cle];
  let i = 0; while (i < n - 2 && t > cles[i + 1].t) i++;
  const a = cles[i], b = cles[i + 1], h = b.t - a.t, u = (t - a.t) / h;
  const vec = (x) => (Array.isArray(x) ? x : [x]);
  const tan = (j) => {
    if (j <= 0 || j >= n - 1) return null;
    const p = vec(cles[j - 1][cle]), q = vec(cles[j + 1][cle]), dt = cles[j + 1].t - cles[j - 1].t;
    return p.map((x, k) => (q[k] - x) / dt);
  };
  const A = vec(a[cle]), B = vec(b[cle]);
  const ma = tan(i) || A.map(() => 0), mb = tan(i + 1) || A.map(() => 0);
  const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
  const r = A.map((x, k) => h00 * x + h10 * h * ma[k] + h01 * B[k] + h11 * h * mb[k]);
  return Array.isArray(a[cle]) ? r : r[0];
}

/** Réponse impulsionnelle normalisée d'un ressort-amortisseur sous-amorti (ωn = w, ζ = zeta) : e^(−ζωτ)·sin(ωd τ). */
export function ressort(tau, w = 15, zeta = 0.45) {
  if (tau <= 0) return 0;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return Math.exp(-zeta * w * tau) * Math.sin(wd * tau);
}

/* ─────────────────────────────── textures ─────────────────────────────── */
export function texCanvas(THREE, w, h, dessin, { repeter = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); dessin(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  if (repeter) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const caches = new WeakMap();
export function texHalo(THREE) {
  if (caches.has(THREE)) return caches.get(THREE);
  const t = texCanvas(THREE, 128, 128, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.2, 'rgba(255,255,255,.6)'); d.addColorStop(0.5, 'rgba(255,255,255,.15)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  caches.set(THREE, t); return t;
}
export function haloSprite(THREE, couleur, taille, alpha = 1) {
  const m = new THREE.SpriteMaterial({ map: texHalo(THREE), color: new THREE.Color(couleur), transparent: true, opacity: alpha, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.set(taille, taille, 1); return s;
}

/** Fusionne des géométries (non indexées) en une seule ; chaque morceau reçoit un attribut « partie » (float) pour la couleur. */
export function fusionner(THREE, morceaux) {
  const pos = [], nor = [], par = [];
  for (const { geo, partie = 0, matrice = null } of morceaux) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    if (matrice) g.applyMatrix4(matrice);
    g.computeVertexNormals();
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) par.push(partie);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('partie', new THREE.Float32BufferAttribute(par, 1));
  return g;
}

/* ─────────────────────────────── collisions 3D ─────────────────────────────── */
/** Boîte locale d'une voiture au repos (repère de l'enveloppe : avant +z, gauche +x, roues au sol y ≈ 0). */
export function boiteLocale(THREE, env) {
  const p = env.position.clone(), r = env.rotation.clone();
  env.position.set(0, 0, 0); env.rotation.set(0, 0, 0); env.updateMatrixWorld(true);
  const b = new THREE.Box3();
  env.traverse((o) => { if (o.isMesh && o.geometry && o.visible && o.geometry.type !== 'PlaneGeometry') { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  env.position.copy(p); env.rotation.copy(r); env.updateMatrixWorld(true);
  return b;
}

/** OBB 3D d'une voiture posée (matrixWorld de l'enveloppe : cap, tangage, roulis, pilonnement compris).
    rognage : fraction de la hauteur retirée en bas (pneus écrasés, garde au sol) ; marge < 1 resserre légèrement en plan. */
export function obbDepuis(THREE, env, b, nom, { rognage = 0.16, marge = 0.97 } = {}) {
  env.updateMatrixWorld(true);
  const m = env.matrixWorld.elements;
  const nrm = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  const ax = [nrm([m[0], m[1], m[2]]), nrm([m[4], m[5], m[6]]), nrm([m[8], m[9], m[10]])];      // axes unitaires (la boîte est mesurée à l'échelle)
  const hy = b.max.y - b.min.y, y0 = b.min.y + rognage * hy;
  const lc = [(b.min.x + b.max.x) / 2, (y0 + b.max.y) / 2, (b.min.z + b.max.z) / 2];
  const c = [m[12] + ax[0][0] * lc[0] + ax[1][0] * lc[1] + ax[2][0] * lc[2], m[13] + ax[0][1] * lc[0] + ax[1][1] * lc[1] + ax[2][1] * lc[2], m[14] + ax[0][2] * lc[0] + ax[1][2] * lc[1] + ax[2][2] * lc[2]];
  return { nom, c, u: ax, e: [(b.max.x - b.min.x) / 2 * marge, (b.max.y - y0) / 2, (b.max.z - b.min.z) / 2 * marge] };
}
/** OBB d'un décor : centre, demi-dimensions, rotation autour de y (puis x, ordre YXZ). */
export function obbFixe(nom, c, e, rotY = 0, rotX = 0) {
  const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
  // R = Ry · Rx ; colonnes = axes locaux en monde
  const ux = [cy, 0, -sy], uy = [sy * sx, cx, cy * sx], uz = [sy * cx, -sx, cy * cx];
  return { nom, c: [...c], u: [ux, uy, uz], e: [...e] };
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Profondeur de pénétration entre deux OBB 3D (SAT 15 axes) ; 0 si séparées. */
export function penetrationOBB(a, b) {
  const d = [b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2]];
  // préfiltre sphères englobantes
  const ra0 = Math.hypot(...a.e), rb0 = Math.hypot(...b.e);
  if (Math.hypot(...d) > ra0 + rb0) return 0;
  const axes = [...a.u, ...b.u];
  for (const p of a.u) for (const q of b.u) { const c = cross(p, q), n = Math.hypot(...c); if (n > 1e-6) axes.push([c[0] / n, c[1] / n, c[2] / n]); }
  let min = Infinity;
  for (const n of axes) {
    const ra = a.e[0] * Math.abs(dot(a.u[0], n)) + a.e[1] * Math.abs(dot(a.u[1], n)) + a.e[2] * Math.abs(dot(a.u[2], n));
    const rb = b.e[0] * Math.abs(dot(b.u[0], n)) + b.e[1] * Math.abs(dot(b.u[1], n)) + b.e[2] * Math.abs(dot(b.u[2], n));
    const o = ra + rb - Math.abs(dot(d, n)); if (o <= 0) return 0; if (o < min) min = o;
  }
  return min;
}
/** Distance d'un point (monde) à une OBB. */
export function distancePointOBB(p, o) {
  const d = [p[0] - o.c[0], p[1] - o.c[1], p[2] - o.c[2]];
  let s = 0;
  for (let i = 0; i < 3; i++) { const x = dot(d, o.u[i]), ex = Math.abs(x) - o.e[i]; if (ex > 0) s += ex * ex; }
  return Math.sqrt(s);
}
/** Distance minimale segment [p0, p1] ↔ OBB (fonction convexe du paramètre : section dorée + bornes). */
export function distanceSegmentOBB(p0, p1, o) {
  const P = (u) => [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u];
  const f = (u) => distancePointOBB(P(u), o);
  let a = 0, b = 1; const g = 0.6180339887;
  let x1 = b - g * (b - a), x2 = a + g * (b - a), f1 = f(x1), f2 = f(x2);
  for (let i = 0; i < 40; i++) {
    if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = b - g * (b - a); f1 = f(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + g * (b - a); f2 = f(x2); }
  }
  return Math.min(f((a + b) / 2), f(0), f(1));
}
/** Coins inférieurs d'une OBB (monde) : contrôle du contact avec le sol. */
export function coinsBas(o) {
  const r = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) r.push([0, 1, 2].map((k) => o.c[k] + o.u[0][k] * o.e[0] * sx - o.u[1][k] * o.e[1] + o.u[2][k] * o.e[2] * sz));
  return r;
}
