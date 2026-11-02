/* OUTILS DU SEGMENT « FAMILLES » (V9 Ring) — briques procédurales communes aux trois mondes (Gotham, ligne arc-en-ciel, Tokyo).

   Tout est généré par le code (canvas, GLSL, primitives) : aucune image, aucun logo, aucune marque.
   Déterminisme (règle 5) : chaque monde reçoit son propre PRNG semé (mulberry) ; aucune fonction ne lit Math.random() ;
   les animations sont des fonctions pures du temps (uniform t), jamais accumulées d'une image à l'autre.

   Contenu :
     - prng(graine)                         PRNG mulberry32 semé par un texte
     - texCanvas(THREE, w, h, dessin)       texture canvas sRGB
     - texHalo(THREE)                       halo radial (sprites additifs)
     - halo(THREE, couleur, taille, alpha)  sprite additif
     - creerCiel(THREE, {...})              dôme : dégradé 3 couleurs, nuages fbm, zone éclairée (bat-signal, néons), soleil
     - creerPluie(THREE, rnd, {...})        pluie fine en traits (vertex shader), jamais à moins de `proche` cm de l'objectif
     - matFacades(THREE, {...})             façades d'immeubles « fenêtres en espace monde » (aucun étirement de texture)
     - ombreContact(THREE, L, W)            ombre douce sous une voiture
     - boiteLocale(THREE, env)              boîte englobante d'une voiture au repos (repère de l'enveloppe)
     - obbVoiture(env, boite), obbDecor(...), penetration(a, b)   boîtes orientées (plan XZ + plage Y) et test SAT */

export function hashTexte(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function prng(graine) {
  let a = hashTexte(String(graine));
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function texCanvas(THREE, w, h, dessin, { repeter = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); dessin(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  if (repeter) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let haloCache = null;
export function texHalo(THREE) {
  if (haloCache) return haloCache;
  haloCache = texCanvas(THREE, 128, 128, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.18, 'rgba(255,255,255,.55)'); d.addColorStop(0.45, 'rgba(255,255,255,.14)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  return haloCache;
}
export function halo(THREE, couleur, taille, alpha = 1) {
  const m = new THREE.SpriteMaterial({ map: texHalo(THREE), color: new THREE.Color(couleur), transparent: true, opacity: alpha, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const s = new THREE.Sprite(m); s.scale.set(taille, taille, 1); return s;
}

const GLSL_BRUIT = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }`;

/** Dôme du ciel (rayon en cm). zone = { dir, couleur, force, taille } : nappe de nuages éclairée par une source (bat-signal). */
export function creerCiel(THREE, { rayon, haut, milieu, bas, nuages = 0.5, couleurNuage = '#ffffff', clairNuage = 0.5, zone = null, soleil = null, echelle = 1.4, vent = 0.01 }) {
  const C = (c) => new THREE.Color(c);
  const u = {
    cTop: { value: C(haut) }, cMid: { value: C(milieu) }, cBas: { value: C(bas) }, cNuage: { value: C(couleurNuage) }, clair: { value: clairNuage },
    nuage: { value: nuages }, t: { value: 0 }, ech: { value: echelle }, vent: { value: vent },
    zDir: { value: new THREE.Vector3(...(zone ? zone.dir : [0, 1, 0])).normalize() }, zCol: { value: C(zone ? zone.couleur : '#000000') }, zForce: { value: zone ? zone.force : 0 }, zTaille: { value: zone ? zone.taille : 0.2 },
    sDir: { value: new THREE.Vector3(...(soleil ? soleil.dir : [0, 1, 0])).normalize() }, sCol: { value: C(soleil ? soleil.couleur : '#000000') }, sForce: { value: soleil ? soleil.force : 0 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 cTop, cMid, cBas, cNuage, zDir, zCol, sDir, sCol; uniform float t, nuage, clair, zForce, zTaille, sForce, ech, vent; varying vec3 vP; ${GLSL_BRUIT}
      void main(){ vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(cBas, cMid, smoothstep(-0.03, 0.18, h)); c = mix(c, cTop, smoothstep(0.14, 0.7, h));
        vec2 q = d.xz / (abs(h) + 0.22) * ech + vec2(t * vent, t * vent * 0.4);
        float n = fbm(q + fbm(q * 0.6 + 3.1) * 0.8);
        float cl = smoothstep(0.42, 0.78, n) * nuage * smoothstep(0.0, 0.22, h);
        float zd = max(dot(d, zDir), 0.0); float zl = exp(-pow(acos(min(zd, 1.0)) / zTaille, 2.0));
        vec3 cn = mix(c, cNuage, clair) + zCol * zl * zForce * 1.6;
        c = mix(c, cn, cl);
        c += zCol * zl * zForce * 0.22;
        float s = max(dot(d, sDir), 0.0); c += sCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35) * sForce;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(rayon, 48, 24), m); mesh.renderOrder = -10; mesh.frustumCulled = false;
  return { mesh, u, maj(t) { u.t.value = t; } };
}

/** Pluie fine : traits dans un volume fixe (centre, taille en cm) qui se répète ; position = fonction pure de t. */
export function creerPluie(THREE, rnd, { n, centre, taille, vitesse, longueur, couleur = '#cfe2ff', alpha = 0.22, proche = 60 }) {
  const pos = new Float32Array(n * 6), fin = new Float32Array(n * 2), o = [centre[0] - taille[0] / 2, centre[1] - taille[1] / 2, centre[2] - taille[2] / 2];
  for (let i = 0; i < n; i++) { const x = o[0] + rnd() * taille[0], y = o[1] + rnd() * taille[1], z = o[2] + rnd() * taille[2]; pos.set([x, y, z, x, y, z], i * 6); fin[i * 2 + 1] = 1; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aFin', new THREE.BufferAttribute(fin, 1));
  const u = { t: { value: 0 }, vel: { value: new THREE.Vector3(...vitesse) }, orig: { value: new THREE.Vector3(...o) }, size: { value: new THREE.Vector3(...taille) }, len: { value: longueur }, col: { value: new THREE.Color(couleur) }, alpha: { value: alpha }, proche: { value: proche } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `uniform float t, len; uniform vec3 vel, orig, size; attribute float aFin; varying float vA; varying float vD;
      void main(){ vec3 p = mod(position + vel * t - orig, size) + orig; p -= normalize(vel) * len * aFin; vA = 1.0 - aFin;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 col; uniform float alpha, proche; varying float vA; varying float vD;
      void main(){ if (vD < proche) discard; float f = smoothstep(proche, proche * 2.5, vD); gl_FragColor = vec4(col, alpha * vA * f); }`,
  });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false;
  return { mesh: l, maj(t) { u.t.value = t; } };
}

/** Matériau de façades : fenêtres calculées en espace monde (étage, pas), allumées au hasard (hash de la cellule et de la graine
    d'instance aGraine), brouillard exponentiel intégré. ySym : |y| (copie miroir sous la chaussée mouillée). */
export function matFacades(THREE, { base = '#1a2030', base2 = '#252c40', fen = ['#ffc56a', '#ffe0a0', '#8fdcff'], allume = 0.4, etage = 350, pas = 260, toit = '#0d1018',
  brouillard = '#000000', densite = 0, lueur = 1.6, bandes = 0, cBandes = '#ff4fa8' } = {}) {
  const C = (c) => new THREE.Color(c);
  const u = { cBase: { value: C(base) }, cBase2: { value: C(base2) }, f1: { value: C(fen[0]) }, f2: { value: C(fen[1 % fen.length]) }, f3: { value: C(fen[2 % fen.length]) },
    allume: { value: allume }, etage: { value: etage }, pas: { value: pas }, cToit: { value: C(toit) }, fCol: { value: C(brouillard) }, fDens: { value: densite }, lueur: { value: lueur },
    bandes: { value: bandes }, cBandes: { value: C(cBandes) } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `attribute float aGraine; varying vec3 vW; varying vec3 vN; varying float vG;
      void main(){ vec4 lp = vec4(position, 1.0); vec3 n = normal;
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;
        #endif
        vec4 wp = modelMatrix * lp; vW = wp.xyz; vN = normalize(mat3(modelMatrix) * n); vG = aGraine;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 cBase, cBase2, f1, f2, f3, cToit, fCol, cBandes; uniform float allume, etage, pas, fDens, lueur, bandes; varying vec3 vW; varying vec3 vN; varying float vG;
      float hh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec3 n = normalize(vN); float y = abs(vW.y);
        vec3 col;
        if (abs(n.y) > 0.5) { col = cToit; }
        else {
          float hz = abs(n.x) > 0.5 ? vW.z : vW.x;
          vec2 q = vec2(hz / pas, y / etage); vec2 ce = floor(q), f = fract(q);
          float r = hh(ce + vec2(vG * 17.0, vG * 31.0 + (abs(n.x) > 0.5 ? 7.0 : 0.0)));
          col = mix(cBase, cBase2, hh(vec2(vG, 3.7)));
          col *= 0.85 + 0.15 * step(0.5, fract(q.y * 0.5));
          float fen = step(0.16, f.x) * step(f.x, 0.84) * step(0.28, f.y) * step(f.y, 0.86);
          float lit = step(r, allume);
          float k = hh(ce + vec2(5.1, vG));
          vec3 cf = k < 0.5 ? f1 : (k < 0.8 ? f2 : f3);
          float grad = 0.6 + 0.4 * f.y;
          col = mix(col, col * 0.55 + vec3(0.02, 0.025, 0.04), fen);
          col += fen * lit * cf * lueur * grad * (0.65 + 0.35 * hh(ce + 9.3));
          if (bandes > 0.0) { float b = step(0.94, fract(q.y * 0.25 + vG)); col += b * cBandes * bandes; }
        }
        float d = length(vW - cameraPosition); float ff = 1.0 - exp(-d * d * fDens * fDens);
        gl_FragColor = vec4(mix(col, fCol, clamp(ff, 0.0, 1.0)), 1.0); }`,
  });
  return { mat: m, u };
}

/** Ombre de contact douce (plan horizontal, posé à y ≈ 0). */
export function ombreContact(THREE, L, W, force = 0.7) {
  const tex = texCanvas(THREE, 128, 128, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    d.addColorStop(0, `rgba(0,0,0,${force})`); d.addColorStop(0.55, `rgba(0,0,0,${force * 0.7})`); d.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, L * 1.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  return m;
}

/** Boîte englobante de la voiture AU REPOS, dans le repère de son enveloppe (avant = +z, gauche = +x). */
export function boiteLocale(THREE, env) {
  const p = env.position.clone(), r = env.rotation.clone();
  env.position.set(0, 0, 0); env.rotation.set(0, 0, 0); env.updateMatrixWorld(true);
  const b = new THREE.Box3();
  env.traverse((o) => { if (o.isMesh && o.geometry && o.visible) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  env.position.copy(p); env.rotation.copy(r); env.updateMatrixWorld(true);
  return b;
}

/** Boîte orientée d'une voiture posée (cap = rotation.y ; tangage et roulis négligés). marge < 1 : boîte légèrement resserrée. */
export function obbVoiture(env, b, nom, marge = 0.94) {
  const th = env.rotation.y, c = Math.cos(th), s = Math.sin(th);
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  return { nom, cx: env.position.x + cx * c + cz * s, cz: env.position.z - cx * s + cz * c, hx: (b.max.x - b.min.x) / 2 * marge, hz: (b.max.z - b.min.z) / 2 * marge, ang: th,
    y0: env.position.y + b.min.y + 0.05 * (b.max.y - b.min.y), y1: env.position.y + b.max.y };
}
export const obbDecor = (nom, cx, cz, hx, hz, y0, y1, ang = 0) => ({ nom, cx, cz, hx, hz, ang, y0, y1 });

/** Profondeur de pénétration (cm) entre deux boîtes orientées ; 0 si elles ne se touchent pas (SAT 2D + plage Y). */
export function penetration(a, b) {
  const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (dy <= 0) return 0;
  const ax = (o) => [[Math.cos(o.ang), -Math.sin(o.ang)], [Math.sin(o.ang), Math.cos(o.ang)]];
  const A = ax(a), B = ax(b), d = [b.cx - a.cx, b.cz - a.cz];
  let p = dy;
  for (const n of [...A, ...B]) {
    const ra = a.hx * Math.abs(A[0][0] * n[0] + A[0][1] * n[1]) + a.hz * Math.abs(A[1][0] * n[0] + A[1][1] * n[1]);
    const rb = b.hx * Math.abs(B[0][0] * n[0] + B[0][1] * n[1]) + b.hz * Math.abs(B[1][0] * n[0] + B[1][1] * n[1]);
    const o = ra + rb - Math.abs(d[0] * n[0] + d[1] * n[1]); if (o <= 0) return 0; p = Math.min(p, o);
  }
  return p;
}

/** Spline de Catmull-Rom centripète simple sur des points 3D, paramètre u ∈ [0, 1] (C1 continue). */
export function spline(points) {
  const n = points.length;
  return (u) => {
    const x = Math.min(Math.max(u, 0), 1) * (n - 1), i = Math.min(n - 2, Math.floor(x)), f = x - i;
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n - 1, i + 2)];
    const f2 = f * f, f3 = f2 * f;
    return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3));
  };
}

/** Spline de Hermite à tangentes de Catmull-Rom NON UNIFORMES : cles = [{ t, p: [..] }] triées ; C1 continue en t. */
export function splineT(cles) {
  const n = cles.length;
  const tg = (i) => {
    const a = cles[Math.max(0, i - 1)], b = cles[Math.min(n - 1, i + 1)];
    return a.p.map((_, k) => (b.p[k] - a.p[k]) / Math.max(1e-6, b.t - a.t));
  };
  return (t) => {
    if (t <= cles[0].t) return cles[0].p.slice();
    if (t >= cles[n - 1].t) return cles[n - 1].p.slice();
    let i = 0; while (i < n - 2 && t > cles[i + 1].t) i++;
    const A = cles[i], B = cles[i + 1], h = B.t - A.t, f = (t - A.t) / h, f2 = f * f, f3 = f2 * f;
    const ma = tg(i), mb = tg(i + 1);
    return A.p.map((_, k) => (2 * f3 - 3 * f2 + 1) * A.p[k] + (f3 - 2 * f2 + f) * h * ma[k] + (-2 * f3 + 3 * f2) * B.p[k] + (f3 - f2) * h * mb[k]);
  };
}
