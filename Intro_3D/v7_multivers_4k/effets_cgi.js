/* EFFETS CGI V7 — sillage physique, étincelles, fumée de pneus, post-combustion. Tout est PRÉCALCULÉ à la construction à partir de
   poses déterministes (physique_cgi.js) puis évalué dans le vertex shader en fonction de l'uniforme `uT` : aucune particule à état,
   donc un saut de temps (seek) redonne exactement la même image.

   creerEtincelles(THREE)  → { objet, gerbe({...}), figer(), maj(t) }   gerbes balistiques avec rebond sur le sol (y = 0)
   creerFumee(THREE)       → { objet, emettre({...}), figer(), maj(t) } fumée volumétrique de pneus (billboards qui grossissent et montent)
   creerGomme(THREE)       → { objet, tracer(poseFn, t0, t1, ...), figer(), maj(t) } rubans de gomme sur le sol miroir
   creerPostCombustion(THREE, c1, c2) → { groupe, maj(t, intensite) } cônes bleu / or aux échappements */
import { graineur } from './physique_cgi.js';

const VS_PARTICULES = `
uniform float uT, uG, uEch;
attribute vec3 aVel; attribute vec4 aVie;    // aVie = (naissance, durée, aléa, taille)
varying float vA; varying float vK; varying float vR;
void main(){
  float age = uT - aVie.x;
  vK = clamp(age / aVie.y, 0.0, 1.0); vR = aVie.z;
  vec3 p = position;
  if (age > 0.0 && age < aVie.y) {
    p += aVel * age; p.y += 0.5 * uG * age * age;
    if (p.y < 0.0) { float tImp = (-aVel.y - sqrt(max(aVel.y*aVel.y - 2.0*uG*position.y, 0.0))) / uG; float d = max(age - tImp, 0.0); p.y = max(0.0, (aVel.y + uG*tImp) * -0.38 * d + 0.5 * uG * d * d); }
    vA = 1.0;
  } else { vA = 0.0; }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = vA > 0.5 ? max(1.0, aVie.w * uEch / max(-mv.z, 0.5) * (1.0 - 0.7 * vK)) : 0.0;
  gl_Position = projectionMatrix * mv;
}`;
const FS_ETINCELLE = `
varying float vA; varying float vK; varying float vR;
void main(){
  if (vA < 0.5) discard;
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  vec3 chaud = mix(vec3(1.0, 0.95, 0.7), vec3(1.0, 0.42, 0.08), smoothstep(0.0, 0.65, vK + vR * 0.1));
  float a = smoothstep(0.5, 0.0, d) * (1.0 - vK * vK);
  gl_FragColor = vec4(chaud * (2.4 - 1.4 * vK), a);
}`;
const VS_FUMEE = `
uniform float uT, uEch;
attribute vec3 aVel; attribute vec4 aVie;
varying float vA; varying float vK; varying float vR;
void main(){
  float age = uT - aVie.x;
  vK = clamp(age / aVie.y, 0.0, 1.0); vR = aVie.z;
  vec3 p = position;
  if (age > 0.0 && age < aVie.y) { p += aVel * age * (1.0 - 0.35 * vK); p.y += age * (3.0 + 5.0 * aVie.z); vA = 1.0; } else vA = 0.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = vA > 0.5 ? aVie.w * (1.0 + 4.0 * vK) * uEch / max(-mv.z, 0.5) : 0.0;
  gl_Position = projectionMatrix * mv;
}`;
const FS_FUMEE = `
uniform vec3 uCol;
varying float vA; varying float vK; varying float vR;
void main(){
  if (vA < 0.5) discard;
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  float bruit = 0.75 + 0.25 * sin((c.x * 9.0 + vR * 40.0)) * cos((c.y * 7.0 - vR * 30.0));
  float a = smoothstep(0.5, 0.05, d) * 0.55 * (1.0 - vK) * (1.0 - vK) * bruit;
  gl_FragColor = vec4(uCol * (0.85 + 0.3 * (1.0 - vK)), a);
}`;

function systeme(THREE, { vs, fs, additif, g = 0, col = null }) {
  const L = { pos: [], vel: [], vie: [] };
  const u = { uT: { value: 0 }, uG: { value: g }, uEch: { value: 600 }, uCol: { value: new THREE.Color(col || '#bbbbbb') } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending });
  const objet = new THREE.Points(new THREE.BufferGeometry(), mat); objet.frustumCulled = false; objet.visible = false;
  const figer = () => {
    const n = L.pos.length / 3, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L.pos), 3));
    geo.setAttribute('aVel', new THREE.BufferAttribute(new Float32Array(L.vel), 3));
    geo.setAttribute('aVie', new THREE.BufferAttribute(new Float32Array(L.vie), 4));
    objet.geometry.dispose(); objet.geometry = geo; objet.visible = n > 0;
  };
  const maj = (t, camera, hPx = 1080) => {
    u.uT.value = t;
    if (camera) u.uEch.value = hPx * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  };
  return { objet, L, u, figer, maj };
}

export function creerEtincelles(THREE) {
  const s = systeme(THREE, { vs: VS_PARTICULES, fs: FS_ETINCELLE, additif: true, g: -380 });
  /** gerbe : n étincelles à partir de p0 (cm), direction moyenne `dir` (unitaire), dispersion (0–1), vitesses [vmin, vmax] cm/s, naissance t0, vie (s). */
  s.gerbe = ({ t0, p0, dir, n = 60, dispersion = 0.45, vmin = 40, vmax = 180, vie = 0.9, taille = 0.45, graine = 1 }) => {
    const rnd = graineur(graine * 2654435761);
    for (let i = 0; i < n; i++) {
      const th = rnd() * 6.2832, r = Math.sqrt(rnd()) * dispersion, v = vmin + (vmax - vmin) * rnd();
      const d = [dir[0] + Math.cos(th) * r, dir[1] + Math.abs(Math.sin(th)) * r * 0.9 + 0.12, dir[2] + Math.sin(th) * r];
      const k = Math.hypot(...d) || 1;
      s.L.pos.push(p0[0], p0[1], p0[2]); s.L.vel.push(d[0] / k * v, d[1] / k * v, d[2] / k * v);
      s.L.vie.push(t0 + rnd() * 0.06, vie * (0.55 + 0.45 * rnd()), rnd(), taille * (0.6 + 0.8 * rnd()));
    }
  };
  return s;
}

export function creerFumee(THREE, couleur = '#c9ccd6') {
  const s = systeme(THREE, { vs: VS_FUMEE, fs: FS_FUMEE, additif: false, col: couleur });
  /** émission continue le long d'une pose déterministe : poseFn(t) → [x,y,z] (cm) ; une bouffée tous les `pas` secondes entre t0 et t1. */
  s.emettre = ({ poseFn, t0, t1, pas = 0.035, vie = 1.1, taille = 2.2, deriveVent = [0, 0, 0], graine = 1 }) => {
    const rnd = graineur(graine * 40503);
    for (let t = t0; t <= t1 + 1e-9; t += pas) {
      const p = poseFn(t), a = rnd() * 6.2832;
      s.L.pos.push(p[0], p[1] + 0.3, p[2]);
      s.L.vel.push(deriveVent[0] + Math.cos(a) * 2.2, deriveVent[1], deriveVent[2] + Math.sin(a) * 2.2);
      s.L.vie.push(t, vie * (0.7 + 0.5 * rnd()), rnd(), taille * (0.7 + 0.6 * rnd()));
    }
  };
  return s;
}

/** Rubans de gomme : bande noire mate posée au sol, révélée au fil du temps (attribut aT = instant de passage de la roue). */
export function creerGomme(THREE) {
  const pos = [], tt = [], idx = [];
  const u = { uT: { value: 0 }, uFin: { value: 6 } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: 'attribute float aT; varying float vT; varying float vV; void main(){ vT = aT; vV = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uT, uFin; varying float vT; varying float vV; void main(){ if (uT < vT) discard; float age = uT - vT; float a = 0.62 * (1.0 - smoothstep(1.0, uFin, age)); float bord = smoothstep(0.0, 0.25, vV) * smoothstep(1.0, 0.75, vV); gl_FragColor = vec4(0.015, 0.015, 0.02, a * bord); }' });
  const objet = new THREE.Mesh(new THREE.BufferGeometry(), mat); objet.frustumCulled = false; objet.visible = false; objet.renderOrder = 2;
  const uvs = [];
  return {
    objet,
    /** poseFn(t) → {p:[x,y,z], gauche:[x,z]} ; roue située à `decalage` (cm, + = gauche) de l'axe ; largeur du ruban en cm */
    tracer({ poseFn, t0, t1, pas = 0.02, decalage, largeur = 0.9 }) {
      let n0 = pos.length / 3, prec = false;
      for (let t = t0; t <= t1 + 1e-9; t += pas) {
        const q = poseFn(t), lx = q.gauche[0], lz = q.gauche[1];
        const cx = q.p[0] + lx * decalage, cz = q.p[2] + lz * decalage;
        pos.push(cx + lx * largeur / 2, 0.06, cz + lz * largeur / 2, cx - lx * largeur / 2, 0.06, cz - lz * largeur / 2);
        tt.push(t, t); uvs.push(0, 0, 1, 0);
        const k = pos.length / 3;
        if (prec) idx.push(k - 4, k - 3, k - 2, k - 3, k - 1, k - 2);
        prec = true;
      }
    },
    figer() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      g.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(tt), 1));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      g.setIndex(idx); objet.geometry.dispose(); objet.geometry = g; objet.visible = idx.length > 0;
    },
    maj(t) { u.uT.value = t; },
  };
}

/** Cônes de post-combustion aux deux échappements (bleu intérieur, or extérieur), pilotés par l'intensité 0–1 (fonction pure de t). */
export function creerPostCombustion(THREE, c1 = '#58a6ff', c2 = '#ffc24a') {
  const groupe = new THREE.Group();
  const mk = (col, r, l, op) => new THREE.Mesh(new THREE.ConeGeometry(r, l, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const cones = [];
  for (const cote of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(cote * 0.9, 1.0, -3.4);               // à l'arrière du bolide (−z), de part et d'autre
    const ext = mk(c2, 0.34, 2.6, 0.5), int = mk(c1, 0.2, 1.9, 0.8);
    for (const c of [ext, int]) { c.rotation.x = -Math.PI / 2; c.position.z = -c.geometry.parameters.height / 2; g.add(c); }
    groupe.add(g); cones.push({ ext, int });
  }
  groupe.visible = false;
  return {
    groupe,
    maj(t, intensite = 0) {
      groupe.visible = intensite > 0.02;
      cones.forEach((c, i) => {
        const f = 0.82 + 0.18 * Math.sin(t * 61 + i * 2.1) * Math.sin(t * 37 + i);
        c.ext.scale.set(f, f, intensite * (1.1 + 0.25 * f)); c.int.scale.set(f, f, intensite * (0.9 + 0.2 * f));
      });
    },
  };
}
