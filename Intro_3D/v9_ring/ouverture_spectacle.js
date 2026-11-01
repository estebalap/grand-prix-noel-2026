/* AIDES du segment « ouverture » (V9) — SOUS LE TAPIS : LA LUMIÈRE DE SALLE DE SPECTACLE, et L'ÉTINCELLE.

   Il n'y a plus d'arène sous le salon (elle vit dans seg_arene.js). Le puits arc-en-ciel débouche dans une « bulle » de lumière :
     - creerDome      : sphère vue de l'intérieur (shader) : fond rose #ff3fa4 → violet, bandes cyan #2de2ff, nappes de projecteurs ;
     - creerFaisceaux : 6 cônes additifs de projecteurs (rose / cyan alternés) qui balaient lentement ;
     - creerConfettis : confettis lumineux (Points, chute + papillonnement calculés dans le vertex shader à partir de t) ;
     - creerEtincelle : l'étincelle qui saute de la télé jusqu'au pied du sapin (traînée + gerbe d'impact), Points pilotés en CPU.
   Toutes les positions sont des fonctions pures du temps ; l'aléa est semé (mulberry32), jamais Math.random(). */

/** PRNG semé (mulberry32). */
export function mulberry(s) {
  let a = s >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* Shader commun des sprites lumineux : taille en cm convertie en pixels (projectionMatrix[1][1] × demi-hauteur / profondeur). */
const VERT_POINTS = `attribute float taille; attribute vec3 couleur; uniform float demiH; varying vec3 vC;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
    float z = max(-mv.z, 1.0); gl_PointSize = clamp(taille * projectionMatrix[1][1] * demiH / z, 0.0, 48.0);
    vC = couleur * smoothstep(6.0, 30.0, z); }`;
const FRAG_POINTS = `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 16.0) * smoothstep(0.25, 0.18, length(d)); gl_FragColor = vec4(vC * g, 1.0); }`;

/** Bulle de lumière rose / cyan (sphère vue de l'intérieur). maj(t, force). */
export function creerDome(THREE, centre, rayon) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 }, centre: { value: new THREE.Vector3(...centre) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float t, force; uniform vec3 centre;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float bruit(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vW - centre);
        float bas = smoothstep(0.2, -1.0, d.y);                              // 0 en haut, 1 au fond de la bulle
        float a = atan(d.z, d.x);
        vec3 rose = vec3(1.0, 0.25, 0.64), cyan = vec3(0.18, 0.89, 1.0), violet = vec3(0.62, 0.24, 1.0);
        vec3 rv = mix(rose, violet, 0.28);
        vec3 c = mix(violet * 0.6, rv * 1.2, bas);                       // fond rose lumineux, flancs violets
        c += rv * 0.7 * exp(-pow((d.y + 1.0) / 0.35, 2.0));               // cœur incandescent tout au fond
        float nappes = 0.5 + 0.5 * sin(a * 3.0 + t * 0.7 + d.y * 4.0);
        c = mix(c, cyan * 1.15, 0.38 * smoothstep(0.55, 1.0, nappes) * smoothstep(-0.95, -0.2, d.y));   // nappes cyan sur les flancs
        float stries = pow(0.5 + 0.5 * cos(a * 8.0 - t * 0.9), 26.0) * smoothstep(0.1, -0.7, d.y);
        c += mix(cyan, rose, step(0.0, sin(a * 4.0 - t * 0.45))) * stries * 0.55;   // traînées de projecteurs
        float paillettes = pow(bruit(vec2(a * 40.0, d.y * 50.0) + t * 0.8), 18.0) * 7.0;
        c += vec3(1.0, 0.85, 1.0) * paillettes;
        gl_FragColor = vec4(c * force, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const geo = new THREE.SphereGeometry(rayon, 64, 40);
  const m = new THREE.Mesh(geo, mat); m.position.set(...centre); m.name = 'dome-spectacle'; m.renderOrder = -1;
  return { mesh: m, maj(t, force) { mat.uniforms.t.value = t; mat.uniforms.force.value = force; } };
}

/** Faisceaux de projecteurs (cônes additifs). Les bases sont au fond de la bulle, les cônes visent le haut du puits en balayant. */
export function creerFaisceaux(THREE, centre, rayon, n = 6) {
  const groupe = new THREE.Group(); groupe.name = 'faisceaux-spectacle';
  const LONG = rayon * 1.5;
  const geo = new THREE.ConeGeometry(rayon * 0.16, LONG, 32, 1, true);
  geo.translate(0, -LONG / 2, 0);                                         // apex à l'origine, le cône s'ouvre vers −y
  const items = [];
  for (let i = 0; i < n; i++) {
    const couleur = i % 2 ? new THREE.Color(0.18, 0.89, 1.0) : new THREE.Color(1.0, 0.25, 0.64);
    const mat = new THREE.ShaderMaterial({
      uniforms: { couleur: { value: couleur }, force: { value: 0 }, longueur: { value: LONG } },
      vertexShader: `varying float vL; varying vec3 vN; varying vec3 vV;
        void main(){ vL = -position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vL; varying vec3 vN; varying vec3 vV; uniform vec3 couleur; uniform float force, longueur;
        void main(){ float s = vL / longueur; float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
          float v = face * (1.0 - smoothstep(0.35, 1.0, s)) * smoothstep(0.0, 0.04, s);
          gl_FragColor = vec4(couleur * v * force, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 5; groupe.add(m);
    const ang = (i / n) * Math.PI * 2 + 0.3;
    items.push({ m, mat, base: new THREE.Vector3(centre[0] + Math.cos(ang) * rayon * 0.55, centre[1] - rayon * 0.78, centre[2] + Math.sin(ang) * rayon * 0.55), ph: i * 1.7 });
  }
  const Y = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3(), cible = new THREE.Vector3();
  return {
    groupe,
    maj(t, force) {
      for (const it of items) {
        cible.set(centre[0] + Math.sin(t * 0.8 + it.ph) * rayon * 0.35, centre[1] + rayon * 0.9, centre[2] + Math.cos(t * 0.65 + it.ph * 1.3) * rayon * 0.35);
        it.m.position.copy(it.base);
        dir.subVectors(it.base, cible).normalize();                       // le cône s'ouvre vers −y local : on aligne −y sur base → cible inversé
        it.m.quaternion.setFromUnitVectors(Y, dir.negate());
        it.mat.uniforms.force.value = force * (0.75 + 0.25 * Math.sin(t * 2.3 + it.ph));
      }
      groupe.visible = force > 0.002;
    },
  };
}

/** Confettis lumineux dans le puits et la bulle : chute et papillonnement calculés dans le shader (fonction pure de t). */
export function creerConfettis(THREE, { n = 900, x = 0, z = 0, rayon = 520, yHaut = -260, yBas = -2000, demiH = 270, graine = 1512 } = {}) {
  const rnd = mulberry(graine);
  const pos = new Float32Array(n * 3), tai = new Float32Array(n), col = new Float32Array(n * 3), ph = new Float32Array(n * 3);
  const PAL = [[1.0, 0.25, 0.64], [0.18, 0.89, 1.0], [1.0, 0.82, 0.3], [0.7, 0.35, 1.0], [1.0, 0.95, 1.0]];
  for (let i = 0; i < n; i++) {
    const r = rayon * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
    pos[i * 3] = x + Math.cos(a) * r; pos[i * 3 + 1] = yBas + rnd() * (yHaut - yBas); pos[i * 3 + 2] = z + Math.sin(a) * r;
    tai[i] = 3.5 + rnd() * 4.5;
    const c = PAL[Math.floor(rnd() * PAL.length)], k = 1.4 + rnd() * 1.4;
    col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
    ph[i * 3] = rnd() * 6.283; ph[i * 3 + 1] = 40 + rnd() * 70; ph[i * 3 + 2] = 2 + rnd() * 5;     // phase, vitesse de chute (cm/s), fréquence de scintillement
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('taille', new THREE.BufferAttribute(tai, 1));
  geo.setAttribute('couleur', new THREE.BufferAttribute(col, 3)); geo.setAttribute('phase', new THREE.BufferAttribute(ph, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 }, demiH: { value: demiH }, yHaut: { value: yHaut }, plage: { value: yHaut - yBas } },
    vertexShader: `attribute float taille; attribute vec3 couleur; attribute vec3 phase; uniform float t, force, demiH, yHaut, plage; varying vec3 vC;
      void main(){ vec3 p = position;
        p.y = yHaut - mod(yHaut - p.y + t * phase.y, plage);
        p.x += sin(t * 1.3 + phase.x) * 14.0; p.z += cos(t * 1.1 + phase.x * 1.7) * 14.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float z = max(-mv.z, 1.0);
        float pap = 0.35 + 0.65 * abs(sin(t * phase.z + phase.x));                // le confetti tourne : il accroche la lumière par éclats
        gl_PointSize = clamp(taille * projectionMatrix[1][1] * demiH / z, 0.0, 26.0);
        vC = couleur * pap * force * smoothstep(12.0, 60.0, z); }`,
    fragmentShader: FRAG_POINTS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6; pts.name = 'confettis';
  return { mesh: pts, maj(t, force) { mat.uniforms.t.value = t; mat.uniforms.force.value = force; pts.visible = force > 0.002; } };
}

/** L'étincelle : traînée de N points le long d'une courbe de Bézier (A → B, contrôle C) + gerbe d'impact de M points en B. */
export function creerEtincelle(THREE, { A, B, C, t0, duree, demiH = 270, graine = 707 }) {
  const N = 18, M = 26, rnd = mulberry(graine);
  const pos = new Float32Array((N + M) * 3), tai = new Float32Array(N + M), col = new Float32Array((N + M) * 3);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3), aTai = new THREE.BufferAttribute(tai, 1), aCol = new THREE.BufferAttribute(col, 3);
  geo.setAttribute('position', aPos); geo.setAttribute('taille', aTai); geo.setAttribute('couleur', aCol);
  const mat = new THREE.ShaderMaterial({ uniforms: { demiH: { value: demiH } }, vertexShader: VERT_POINTS, fragmentShader: FRAG_POINTS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 7; pts.name = 'etincelle';
  const gerbe = [];
  for (let j = 0; j < M; j++) {                                          // directions de la gerbe (hémisphère haut), vitesses semées
    const a = rnd() * Math.PI * 2, el = 0.25 + rnd() * 1.1, v = 60 + rnd() * 110;
    gerbe.push([Math.cos(a) * Math.cos(el) * v, Math.sin(el) * v, Math.sin(a) * Math.cos(el) * v, 0.25 + rnd() * 0.3]);
  }
  const bez = (s, o) => { const u = 1 - s; for (let k = 0; k < 3; k++) o[k] = u * u * A[k] + 2 * u * s * C[k] + s * s * B[k]; return o; };
  const tmp = [0, 0, 0];
  /** Position de la tête (pour la lumière qui l'accompagne) ; null hors du vol. */
  function tete(t) { const s = (t - t0) / duree; if (s < 0 || s > 1) return null; return bez(s * s * (3 - 2 * s) * 0.35 + s * 0.65, [0, 0, 0]); }
  return {
    mesh: pts, tete,
    maj(t) {
      for (let i = 0; i < N; i++) {                                         // traînée : la tête et ses positions passées
        const ti = t - i * 0.011, s = (ti - t0) / duree, vis = s >= 0 && s <= 1;
        const ss = Math.min(1, Math.max(0, s)); bez(ss * ss * (3 - 2 * ss) * 0.35 + ss * 0.65, tmp);
        pos[i * 3] = tmp[0]; pos[i * 3 + 1] = tmp[1]; pos[i * 3 + 2] = tmp[2];
        const k = vis ? (1 - i / N) : 0;
        tai[i] = vis ? (i === 0 ? 9 : 5.5 * (1 - i / N) + 1) : 0;
        col[i * 3] = 3.2 * k; col[i * 3 + 1] = 2.3 * k; col[i * 3 + 2] = 1.0 * k;
      }
      const dt = t - (t0 + duree);
      for (let j = 0; j < M; j++) {                                         // gerbe : balistique simple, s'éteint en ~0,5 s
        const g = gerbe[j], o = (N + j) * 3, vis = dt >= 0 && dt <= g[3];
        const d = Math.max(0, dt);
        pos[o] = B[0] + g[0] * d; pos[o + 1] = B[1] + g[1] * d - 490 * d * d; pos[o + 2] = B[2] + g[2] * d;
        const k = vis ? 1 - d / g[3] : 0;
        tai[N + j] = vis ? 3.2 : 0; col[o] = 3.0 * k; col[o + 1] = 1.8 * k; col[o + 2] = 0.6 * k;
      }
      aPos.needsUpdate = true; aTai.needsUpdate = true; aCol.needsUpdate = true;
      pts.visible = t > t0 - 0.05 && t < t0 + duree + 0.7;
    },
  };
}
