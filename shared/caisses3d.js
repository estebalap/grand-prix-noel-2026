/* ==========================================================================
   CAISSES PRESTIGE — 6 caisses 3D procédurales (Three.js r128), 100 % numériques.
   Les caisses ne s'impriment plus : elles n'existent qu'à l'écran, sans aucune contrainte de fabrication.
   Chaque famille × gamme a son propre objet, ses matériaux, ses shaders et sa propre ouverture :

     PIÈGES  · Standard    « Caisse de Chantier »       acier peint, chevrons, cadenas, 2 gyrophares tournants
     PIÈGES  · Élite       « Coffre Tactique Carbone »  fibre de carbone vernie, coutures néon, cadran, bouclier hexagonal
     PIÈGES  · Marché Noir « Reliquaire d'Obsidienne »  obsidienne à fissures de lave (shader), anneaux runiques, braises
     BONUS   · Standard    « Coffret Cadeau Pit-Lane »  laque bonbon, ruban satiné, nœud, étiquette, confettis
     BONUS   · Élite       « Écrin Holographique »      vitrine de verre, cadre irisé, hologramme, rayons prismatiques
     BONUS   · Marché Noir « Cœur d'Étoile »            or poli, carte du ciel gravée, sphère armillaire, cœur stellaire

   Aucune image externe : textures dessinées dans des <canvas>, effets en GLSL.
   Outils partagés : preparerScene() (carte d'environnement studio pour les métaux), creerBloom() (halo lumineux HDR
   multi-niveaux, alpha conservé pour les incrustations TV).
   API (inchangée) : buildCaisse(THREE, gamme, famille) -> { group, lid, update(t, dt), ouvrir(), fermer(), ouverture }
   ========================================================================== */
import { environnementStudio } from './stl.js';

export const FIL = {
  bois: 0xd6c29a, anthracite: 0x3d3f43, violet: 0x6b44b6, indigo: 0x3a2a6a, argent: 0xc4c8cd, noir: 0x1b1b1c,
  dore: 0xd8a63a, rougeBonbon: 0xd3203c, ecarlate: 0xc8352e, jaune: 0xf7c600, vert: 0x3dbb54, ivoire: 0xf1ecdf,
};

/** Les 6 caisses : nom affiché et finition (la Salle des Caisses et le Pocket Pit les affichent). */
export const DESIGNS = {
  piege: {
    standard: { nom: 'Caisse de Chantier', finition: 'Acier peint jaune, chevrons de danger, cadenas, 2 gyrophares' },
    elite: { nom: 'Coffre Tactique Carbone', finition: 'Fibre de carbone vernie, coutures néon, cadran à combinaison, bouclier hexagonal' },
    marche_noir: { nom: 'Reliquaire d\'Obsidienne', finition: 'Obsidienne à fissures de lave, filigrane d\'or, anneaux runiques' },
  },
  bonus: {
    standard: { nom: 'Coffret Cadeau Pit-Lane', finition: 'Laque bonbon, ruban satiné doré, nœud et étiquette' },
    elite: { nom: 'Écrin Holographique', finition: 'Vitrine de verre, cadre irisé, hologramme tournant' },
    marche_noir: { nom: 'Cœur d\'Étoile', finition: 'Or poli, laque nuit gravée d\'une carte du ciel, sphère armillaire, cœur stellaire' },
  },
};
/** Compatibilité (ancienne Salle des Caisses) : finition par gamme. */
export const NOMS_FIL = { standard: 'Acier peint ou laque', elite: 'Carbone ou verre holographique', marche_noir: 'Obsidienne ou or' };

/** Charge three.min.js à la demande (le Pocket Pit ne l'embarque pas d'office). */
export function ensureThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (ensureThree.p) return ensureThree.p;
  ensureThree.p = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../lib/three.min.js', import.meta.url).href;
    s.onload = () => res(window.THREE); s.onerror = () => rej(new Error('three.min.js introuvable'));
    document.head.appendChild(s);
  });
  return ensureThree.p;
}

/** Carte d'environnement studio (reflets des métaux, du verre, des vernis). À appeler une fois par scène. */
export function preparerScene(THREE, renderer, scene, { teinte = 0x8a6cff } = {}) {
  scene.environment = environnementStudio(THREE, renderer, teinte);
  return scene.environment;
}

/* ------------------------------------------------------------------------------------------------ outils */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const easeOutBack = (x) => { const c = 1.9, t = clamp(x, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const alea = (() => { let s = 1234567; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; })();
let THREE_ = null;   // référence locale (fixée par buildCaisse)

function tex(THREE, w, h, draw, { repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
/** Boîte à arêtes arrondies (extrusion biseautée d'un rectangle à coins ronds), centrée en x/z, base à y = 0. */
function boiteRonde(THREE, w, h, d, r = 0.06, seg = 3) {
  const s = new THREE.Shape(), x = -w / 2 + r, y = -d / 2 + r, ww = w - 2 * r, dd = d - 2 * r;
  s.moveTo(x, y); s.lineTo(x + ww, y); s.absarc(x + ww, y, r, -Math.PI / 2, 0, false); s.lineTo(x + ww + r, y + dd);
  s.absarc(x + ww, y + dd, r, 0, Math.PI / 2, false); s.lineTo(x, y + dd + r); s.absarc(x, y + dd, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x - r, y); s.absarc(x, y, r, Math.PI, 1.5 * Math.PI, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, r, 0);
  // UV : projection par face dominante, pour que les textures de façade tombent juste
  const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > 0.7) uv.setXY(i, p.getX(i) / w + 0.5, p.getZ(i) / d + 0.5);
    else if (ax > 0.7) uv.setXY(i, p.getZ(i) / d + 0.5, p.getY(i) / h);
    else uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h);
  }
  return g;
}
function mesh(g, m, ombre = true) { const o = new THREE_.Mesh(g, m); o.castShadow = ombre; o.receiveShadow = true; return o; }

/* --------------------------------------------------------------------------------- GLSL : bruit 3D */
const GLSL_BRUIT = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
vec2 voronoi(vec3 p){vec3 b=floor(p);vec3 f=fract(p);float d1=8.,d2=8.;
for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec3 g=vec3(float(i),float(j),float(k));
vec3 o=fract(sin(vec3(dot(b+g,vec3(127.1,311.7,74.7)),dot(b+g,vec3(269.5,183.3,246.1)),dot(b+g,vec3(113.5,271.9,124.6))))*43758.5453);
vec3 r=g+o-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}}return vec2(sqrt(d1),sqrt(d2));}
`;

/* Injection d'un émissif procédural dans un matériau PBR (onBeforeCompile) : garde reflets, ombres et vernis. */
function emissifProcedural(mat, uniforms, glsl) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'varying vec3 vPosObj;\nvarying vec3 vNorObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosObj = position; vNorObj = normal;');
    sh.fragmentShader = 'varying vec3 vPosObj;\nvarying vec3 vNorObj;\n' + Object.keys(uniforms).map((k) => `uniform float ${k};`).join('\n') + '\n' + GLSL_BRUIT + glsl
      + '\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += emissifPerso(vPosObj, vNorObj);');
  };
  mat.customProgramCacheKey = () => 'emissif:' + glsl.length;
  return mat;
}

/* Champ d'énergie : coque additive à effet Fresnel, motif hexagonal, bande de balayage. */
function materiauChamp(THREE, couleur, { alpha = 0.6 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(couleur) }, uA: { value: alpha }, uFlash: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uT; uniform vec3 uC; uniform float uA; uniform float uFlash; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float hexd(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.,1.732))), p.x); }
      void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.4);
        vec2 q = vec2(vP.x + vP.z * .5, vP.y) * 6.; vec2 r = vec2(1., 1.732); vec2 h = r * .5;
        vec2 a = mod(q, r) - h; vec2 b = mod(q - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b;
        float e = smoothstep(.40, .48, hexd(g));
        float band = smoothstep(.12, 0., abs(fract(vP.y * .45 - uT * .35) - .5) - .38);
        float a2 = (f * .9 + e * .35 * (.4 + f) + band * .25) * uA + uFlash * (.5 + e);
        gl_FragColor = vec4(uC * (1.2 + e + band), a2); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
/* Faisceau volumique (cône ou cylindre ouvert) : dégradé, bords doux, bruit qui monte. */
function materiauFaisceau(THREE, couleur) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(couleur) }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uT; uniform vec3 uC; uniform float uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float bord = pow(abs(dot(vN, vV)), 1.6); float v = smoothstep(0., .15, vUv.y) * pow(1. - vUv.y, 1.4);
        float s = .65 + .35 * sin(vUv.x * 40. + uT * 3.) * sin(vUv.y * 9. - uT * 6.);
        gl_FragColor = vec4(uC * 1.6, bord * v * s * uA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
/* Holographique irisé : couleur selon l'angle de vue (film mince), fines stries de diffraction. */
function materiauIrise(THREE, { alpha = 1, stries = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: alpha } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix*w; vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uT; uniform float uA; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      vec3 spectre(float x){ return clamp(abs(mod(x * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      void main(){ float c = dot(vN, vV); float ep = 2.2 * c + .35 * sin(vW.x * 9. + vW.y * 5. + uT * .7) + uT * .05;
        vec3 col = mix(spectre(ep), vec3(1.), .25); float s = ${stries ? '.85 + .15 * sin((vW.x + vW.y + vW.z) * 260.)' : '1.'};
        float f = .35 + .65 * pow(1. - abs(c), 1.5);
        gl_FragColor = vec4(col * s * (.7 + f), uA * (.55 + .45 * f)); }`,
    transparent: alpha < 1, depthWrite: alpha >= 1, side: THREE.DoubleSide, blending: alpha < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

/* ------------------------------------------------------------------------- particules (GPU, additives) */
function particules(THREE, n, { additif = true, taille = 0.08 } = {}) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const tl = new Float32Array(n).fill(taille), al = new Float32Array(n), vie = new Float32Array(n), duree = new Float32Array(n).fill(1);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aCouleur', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aTaille', new THREE.BufferAttribute(tl, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uEchelle: { value: 600 } },
    vertexShader: `attribute vec3 aCouleur; attribute float aTaille; attribute float aAlpha; uniform float uEchelle; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = max(1., aTaille * uEchelle / -mv.z); vC = aCouleur; vA = aAlpha; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - .5) * 2.; float a = smoothstep(1., 0., r); float coeur = smoothstep(.35, 0., r);
      gl_FragColor = vec4(vC * (1. + 2. * coeur), (a * a) * vA); }`,
    transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  const v2 = new THREE.Vector2();
  pts.onBeforeRender = (r, s, cam) => { r.getDrawingBufferSize(v2); mat.uniforms.uEchelle.value = v2.y / (2 * Math.tan((cam.fov || 40) * Math.PI / 360)); };
  let curseur = 0;
  return {
    points: pts,
    /** f(i, p) remplit p = {x,y,z, vx,vy,vz, r,g,b, taille, duree} */
    emettre(k, f) {
      for (let j = 0; j < k; j++) {
        const i = curseur; curseur = (curseur + 1) % n;
        const p = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, taille, duree: 1 };
        f(i, p);
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; vel[i * 3] = p.vx; vel[i * 3 + 1] = p.vy; vel[i * 3 + 2] = p.vz;
        col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b; tl[i] = p.taille; vie[i] = p.duree; duree[i] = p.duree;
      }
    },
    maj(dt, { gravite = 0, frein = 0, tourbillon = 0 } = {}) {
      for (let i = 0; i < n; i++) {
        if (vie[i] <= 0) { al[i] = 0; continue; }
        vie[i] -= dt;
        vel[i * 3 + 1] -= gravite * dt;
        const k = 1 - frein * dt;
        vel[i * 3] *= k; vel[i * 3 + 1] *= k; vel[i * 3 + 2] *= k;
        if (tourbillon) { const x = pos[i * 3], z = pos[i * 3 + 2]; vel[i * 3] += -z * tourbillon * dt; vel[i * 3 + 2] += x * tourbillon * dt; }
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const u = Math.max(0, vie[i]) / duree[i];
        al[i] = Math.min(1, u * 3) * Math.min(1, (1 - u) * 8 + 0.2);
      }
      g.attributes.position.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; g.attributes.aCouleur.needsUpdate = true; g.attributes.aTaille.needsUpdate = true;
    },
  };
}

/* --------------------------------------------------------------------------------- textures (canvas) */
function texChantier(THREE) {      // tôle peinte jaune, panneaux emboutis, usure, pochoir, chevrons en pied
  return tex(THREE, 1024, 512, (x, w, h) => {
    x.fillStyle = '#f2b705'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${alea() < 0.5 ? '255,255,230' : '120,80,0'},${alea() * 0.05})`; x.fillRect(alea() * w, alea() * h, 1 + alea() * 3, 1 + alea() * 3); }
    x.strokeStyle = 'rgba(90,60,0,.55)'; x.lineWidth = 6;
    for (const px of [0.08, 0.54]) x.strokeRect(w * px, h * 0.16, w * 0.38, h * 0.62);
    x.strokeStyle = 'rgba(255,255,220,.35)'; x.lineWidth = 2;
    for (const px of [0.08, 0.54]) x.strokeRect(w * px + 4, h * 0.16 + 4, w * 0.38, h * 0.62);
    x.save(); x.beginPath(); x.rect(0, h * 0.86, w, h * 0.14); x.clip();
    for (let i = -4; i < 40; i++) { x.fillStyle = i % 2 ? '#111' : '#f2b705'; x.beginPath(); x.moveTo(i * 40, h); x.lineTo(i * 40 + 40, h); x.lineTo(i * 40 + 40 + 72, h * 0.86); x.lineTo(i * 40 + 72, h * 0.86); x.fill(); }
    x.restore();
    x.fillStyle = 'rgba(20,16,8,.86)'; x.font = '900 92px "Barlow Condensed","Arial Narrow",system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('PIÈGES', w * 0.27, h * 0.47); x.font = '800 40px "Barlow Condensed","Arial Narrow",system-ui'; x.fillText('MANIPULER AVEC SOIN', w * 0.73, h * 0.40);
    x.font = '900 64px "Barlow Condensed",system-ui'; x.fillText('⚠ N°01', w * 0.73, h * 0.56);
    x.strokeStyle = 'rgba(60,60,60,.5)'; x.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) { const a = alea() * w, b = alea() * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (alea() - 0.5) * 60, b + (alea() - 0.5) * 12); x.stroke(); }
  });
}
function texChevrons(THREE) {
  return tex(THREE, 512, 512, (x, w, h) => {
    for (let i = -8; i < 16; i++) { x.fillStyle = i % 2 ? '#141414' : '#f2b705'; x.beginPath(); x.moveTo(i * 48, 0); x.lineTo(i * 48 + 48, 0); x.lineTo(i * 48 + 48 - h, h); x.lineTo(i * 48 - h, h); x.fill(); }
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 900; i++) x.fillRect(alea() * w, alea() * h, 2, 2);
  });
}
function texCarbone(THREE) {       // sergé 2/2 de fibre de carbone
  return tex(THREE, 256, 256, (x, w, h) => {
    const c = 16;
    for (let i = 0; i < w / c; i++) for (let j = 0; j < h / c; j++) {
      const sens = ((i + j) >> 1) % 2 === 0;
      const g = sens ? x.createLinearGradient(i * c, 0, i * c + c, 0) : x.createLinearGradient(0, j * c, 0, j * c + c);
      g.addColorStop(0, '#0b0c0f'); g.addColorStop(0.5, sens ? '#3a3d45' : '#2a2c33'); g.addColorStop(1, '#0b0c0f');
      x.fillStyle = g; x.fillRect(i * c, j * c, c, c);
    }
  }, { repeat: [5, 3] });
}
function texCadran(THREE) {
  return tex(THREE, 256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, '#d9dde6'); g.addColorStop(1, '#6b7080');
    x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2, 0, 7); x.fill();
    x.strokeStyle = '#111'; x.fillStyle = '#111'; x.font = '700 18px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * Math.PI * 2; x.lineWidth = i % 5 ? 2 : 4; x.beginPath(); x.moveTo(w / 2 + Math.cos(a) * 104, h / 2 + Math.sin(a) * 104); x.lineTo(w / 2 + Math.cos(a) * (i % 5 ? 92 : 84), h / 2 + Math.sin(a) * (i % 5 ? 92 : 84)); x.stroke();
      if (i % 5 === 0) x.fillText(String(i), w / 2 + Math.cos(a) * 66, h / 2 + Math.sin(a) * 66);
    }
    x.fillStyle = '#c8102e'; x.beginPath(); x.moveTo(w / 2, 6); x.lineTo(w / 2 - 9, 26); x.lineTo(w / 2 + 9, 26); x.fill();
  });
}
function texAfficheur(THREE, texte, couleur = '#ff2e4a') {
  return tex(THREE, 512, 128, (x, w, h) => {
    x.fillStyle = '#05060a'; x.fillRect(0, 0, w, h);
    x.font = '700 64px "Courier New",monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = couleur; x.shadowColor = couleur; x.shadowBlur = 18;
    x.fillText(texte, w / 2, h / 2 + 4);
    x.shadowBlur = 0; x.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 2);
  });
}
function texRunes(THREE, couleur = '#ffb347') {
  return tex(THREE, 1024, 64, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.strokeStyle = couleur; x.lineWidth = 4; x.shadowColor = couleur; x.shadowBlur = 10; x.lineCap = 'round';
    for (let i = 0; i < 32; i++) {
      const cx = i * w / 32 + w / 64, s = 18;
      x.beginPath();
      const n = 2 + Math.floor(alea() * 3);
      for (let k = 0; k < n; k++) { const a = alea() * Math.PI * 2; x.moveTo(cx + Math.cos(a) * s, h / 2 + Math.sin(a) * s); x.lineTo(cx - Math.cos(a) * s * alea(), h / 2 - Math.sin(a) * s); }
      x.stroke();
    }
  }, { repeat: [1, 1] });
}
function texFiligrane(THREE) {
  return tex(THREE, 512, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.strokeStyle = '#ffd98a'; x.lineWidth = 5; x.shadowColor = '#ffb000'; x.shadowBlur = 12;
    x.strokeRect(22, 22, w - 44, h - 44); x.lineWidth = 2; x.strokeRect(40, 40, w - 80, h - 80);
    for (const [cx, cy] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) { for (let r = 10; r < 60; r += 14) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); } }
    x.beginPath(); x.arc(w / 2, h / 2, 90, 0, 7); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 70, 0, 7); x.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.moveTo(w / 2 + Math.cos(a) * 70, h / 2 + Math.sin(a) * 70); x.lineTo(w / 2 + Math.cos(a) * 120, h / 2 + Math.sin(a) * 120); x.stroke(); }
    x.font = '700 40px serif'; x.fillStyle = '#ffd98a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✶', w / 2, h / 2);
  });
}
function texLaque(THREE, base, motif) {   // laque bonbon + flocons et étoiles gaufrés
  return tex(THREE, 512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    x.fillStyle = motif; x.font = '38px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) x.fillText((i + j) % 2 ? '❄' : '✦', i * w / 6 + w / 12 + (j % 2) * 20, j * h / 6 + h / 12);
  });
}
function texEtiquette(THREE) {
  return tex(THREE, 256, 160, (x, w, h) => {
    x.fillStyle = '#f7f1e3'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#c9a227'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#b3122e'; x.font = '900 46px "Barlow Condensed",system-ui'; x.textAlign = 'center'; x.fillText('BONUS', w / 2, 70);
    x.fillStyle = '#5b4a2a'; x.font = 'italic 26px Georgia,serif'; x.fillText('Joyeux Grand Prix', w / 2, 118);
  });
}
function texCarteCiel(THREE) {   // constellations gravées (carte émissive)
  return tex(THREE, 1024, 512, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#ffe7b0'; x.fillStyle = '#fff6d8'; x.lineWidth = 2.2; x.shadowColor = '#ffcf6a'; x.shadowBlur = 8;
    for (let c = 0; c < 9; c++) {
      const cx = alea() * w, cy = h * 0.15 + alea() * h * 0.7, pts = [];
      for (let k = 0; k < 4 + Math.floor(alea() * 4); k++) pts.push([cx + (alea() - 0.5) * 220, cy + (alea() - 0.5) * 160]);
      x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
      pts.forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 3 + alea() * 4, 0, 7); x.fill(); });
    }
    for (let i = 0; i < 400; i++) { x.globalAlpha = alea() * 0.8; x.fillRect(alea() * w, alea() * h, 1.5, 1.5); }
    x.globalAlpha = 1; x.lineWidth = 3; x.strokeRect(14, 14, w - 28, h - 28);
  });
}
function texHalo(THREE) {
  return tex(THREE, 256, 256, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,190,80,.6)'); gr.addColorStop(1, 'rgba(255,140,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
}

/* ================================================================================================ LES 6 CAISSES */
const W = 2, D = 1.4;

/* ---------------------------------------------------------------- PIÈGES · Standard : Caisse de Chantier */
function caisseChantier(THREE) {
  const g = new THREE.Group();
  const peinture = new THREE.MeshStandardMaterial({ map: texChantier(THREE), metalness: 0.45, roughness: 0.42, envMapIntensity: 1.1 });
  const acierNoir = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.85, roughness: 0.32 });
  const laiton = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.25 });
  const H = 1.0;
  g.add(mesh(boiteRonde(THREE, W, H, D, 0.05), peinture));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0.13, H - 0.13]) {
    const c = mesh(boiteRonde(THREE, 0.3, 0.26, 0.3, 0.04), acierNoir); c.position.set(sx * (W / 2 - 0.13), y - 0.13, sz * (D / 2 - 0.13)); g.add(c);
    for (const dx of [0.08, -0.08]) { const r = mesh(new THREE.SphereGeometry(0.025, 10, 8), laiton); r.position.set(sx * (W / 2 - 0.13) + dx * sx, y, sz * (D / 2 + 0.025)); g.add(r); }
  }
  const lid = new THREE.Group(); lid.position.set(0, H, -D / 2); g.add(lid);
  const lm = new THREE.MeshStandardMaterial({ map: texChevrons(THREE), metalness: 0.4, roughness: 0.45 });
  const couv = mesh(boiteRonde(THREE, W + 0.06, 0.24, D + 0.06, 0.05), lm); couv.position.set(0, 0, D / 2); lid.add(couv);
  const plaque = mesh(new THREE.BoxGeometry(0.7, 0.012, 0.36), new THREE.MeshStandardMaterial({ map: texAfficheur(THREE, 'DANGER', '#f2b705'), metalness: 0.6, roughness: 0.3 }));
  plaque.position.set(0, 0.245, D / 2); lid.add(plaque);
  const moraillon = mesh(new THREE.BoxGeometry(0.22, 0.32, 0.04), acierNoir); moraillon.position.set(0, -0.06, D + 0.04); lid.add(moraillon);
  const cadenas = new THREE.Group(); g.add(cadenas);
  const corps = mesh(boiteRonde(THREE, 0.26, 0.24, 0.1, 0.03), laiton); corps.position.y = -0.2; cadenas.add(corps);
  const anse = mesh(new THREE.TorusGeometry(0.08, 0.022, 10, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd9dde6, metalness: 1, roughness: 0.2 })); anse.position.y = 0.04; cadenas.add(anse);
  const gyros = [];
  for (const sx of [-1, 1]) {
    const gp = new THREE.Group(); gp.position.set(sx * (W / 2 - 0.22), 0.24, 0.22); lid.add(gp);
    gp.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 24), acierNoir));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xff7a00, emissive: 0xff5a00, emissiveIntensity: 0.9, transparent: true, opacity: 0.8, roughness: 0.15, clearcoat: 1 }));
    dome.position.y = 0.04; gp.add(dome);
    const rot = new THREE.Group(); rot.position.y = 0.09; gp.add(rot);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 24, 1, true), materiauFaisceau(THREE, 0xff8a1e));
    cone.rotation.z = Math.PI / 2; cone.position.x = 1.1; cone.material.uniforms.uA.value = 0.35; rot.add(cone);
    const l = new THREE.PointLight(0xff7a00, 0.8, 4); l.position.set(0.3, 0, 0); rot.add(l);
    gyros.push({ rot, cone, dome, sx });
  }
  const etincelles = particules(THREE, 260, { taille: 0.06 }); g.add(etincelles.points);
  const fumee = particules(THREE, 60, { taille: 0.5, additif: false }); g.add(fumee.points);
  return {
    group: g, lid, hautOuvert: H + 0.02, couleurLueur: 0xffb347,
    maj(t, dt, s) {
      for (const k of gyros) { k.rot.rotation.y = t * 5 * k.sx; k.cone.material.uniforms.uT.value = t; k.dome.material.emissiveIntensity = 0.8 + 0.6 * Math.max(0, Math.sin(t * 10 * k.sx)); }
      // le cadenas tremble, saute et tombe ; le couvercle s'ouvre sur ressort (dépassement + rebond)
      const sa = s.ouvert ? lisse(0.25, 0.55, s.tau) : 0;
      cadenas.rotation.z = s.ouvert ? -sa * 2.6 : Math.sin(t * 9) * 0.04;
      cadenas.position.set(sa * 0.5, H - 0.12 + (s.ouvert ? 0.6 * sa - 2.6 * sa * sa : 0), D / 2 + 0.11 + sa * 0.4);
      cadenas.visible = sa < 0.98;
      const k = s.ouvert ? clamp((s.tau - 0.45) / 0.9, 0, 1) : 0;
      lid.rotation.x = -easeOut(k * 1.6) * 1.95 - (s.ouvert ? Math.sin(k * 10) * Math.exp(-k * 5) * 0.25 : 0);
      if (s.top('etincelles', 0.5)) etincelles.emettre(220, (i, p) => { const a = alea() * 6.28, v = 1 + alea() * 2.4; Object.assign(p, { x: (alea() - 0.5) * W * 0.8, y: H + 0.05, z: (alea() - 0.5) * D * 0.6, vx: Math.cos(a) * v * 0.5, vy: 1.5 + alea() * 2.5, vz: Math.sin(a) * v * 0.5, r: 1, g: 0.55 + alea() * 0.4, b: 0.15, taille: 0.03 + alea() * 0.05, duree: 0.5 + alea() * 0.9 }); });
      if (s.top('fumee', 0.48)) fumee.emettre(40, (i, p) => Object.assign(p, { x: (alea() - 0.5) * W, y: H, z: (alea() - 0.5) * D, vx: (alea() - 0.5) * 0.6, vy: 0.4 + alea() * 0.5, vz: (alea() - 0.5) * 0.6, r: 0.25, g: 0.2, b: 0.16, taille: 0.6 + alea() * 0.5, duree: 1.6 + alea() }));
      etincelles.maj(dt, { gravite: 6, frein: 0.6 }); fumee.maj(dt, { frein: 0.8 });
    },
  };
}

/* ---------------------------------------------------------------- PIÈGES · Élite : Coffre Tactique Carbone */
function coffreCarbone(THREE) {
  const g = new THREE.Group();
  const carbone = new THREE.MeshPhysicalMaterial({ map: texCarbone(THREE), metalness: 0.35, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xa3121f, metalness: 1, roughness: 0.28 });
  const acier = new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 1, roughness: 0.18 });
  const neon = new THREE.MeshBasicMaterial({ color: 0xff2e4a });
  const H = 0.8;
  g.add(mesh(boiteRonde(THREE, W, H, D, 0.14, 2), carbone));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = mesh(boiteRonde(THREE, 0.22, H + 0.02, 0.22, 0.06), alu); c.position.set(sx * (W / 2 - 0.08), -0.01, sz * (D / 2 - 0.08)); g.add(c); }
  for (const sx of [-1, 1]) { const p = mesh(new THREE.TorusGeometry(0.16, 0.035, 10, 24, Math.PI), acier); p.rotation.set(0, Math.PI / 2, 0); p.position.set(sx * (W / 2 + 0.01), H * 0.55, 0); g.add(p); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.018, H * 0.8, 0.018), neon); n.position.set(sx * (W / 2 - 0.205), H * 0.5, sz * (D / 2 + 0.002)); g.add(n); }
  const ceinture = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.016, 0.016), neon); ceinture.position.set(0, H - 0.04, D / 2 + 0.004); g.add(ceinture);
  const cadran = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 40), new THREE.MeshStandardMaterial({ map: texCadran(THREE), metalness: 0.7, roughness: 0.3 }));
  cadran.rotation.x = Math.PI / 2; cadran.position.set(-0.45, H * 0.45, D / 2 + 0.03); g.add(cadran);
  const lunette = mesh(new THREE.TorusGeometry(0.17, 0.02, 10, 40), acier); lunette.position.set(-0.45, H * 0.45, D / 2 + 0.035); g.add(lunette);
  const affT = [texAfficheur(THREE, 'ARMÉ'), texAfficheur(THREE, 'OUVERT', '#3dffb0')];
  const aff = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshBasicMaterial({ map: affT[0] })); aff.position.set(0.35, H * 0.45, D / 2 + 0.006); g.add(aff);
  const lid = new THREE.Group(); lid.position.y = H; g.add(lid);
  const coq = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * W / 2, 0, 0); lid.add(piv);
    const m = mesh(boiteRonde(THREE, W / 2 - 0.01, 0.22, D, 0.09, 2), carbone); m.position.set(-sx * (W / 4), 0, 0); piv.add(m);
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, D - 0.2), neon); n.position.set(-sx * (W / 2 - 0.012), 0.22, 0); piv.add(n);
    coq.push({ piv, sx });
  }
  const verrous = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const v = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 16), acier); v.rotation.z = Math.PI / 2; v.position.set(sx * 0.12, H + 0.11, sz * (D / 2 - 0.2)); g.add(v); verrous.push({ v, sx }); }
  const bouclier = new THREE.Mesh(boiteRonde(THREE, W + 0.5, H + 0.75, D + 0.5, 0.35, 4), materiauChamp(THREE, 0xff2e6a, { alpha: 0.28 }));
  bouclier.position.y = -0.15; g.add(bouclier);
  const lasers = new THREE.Group(); lasers.position.y = H + 0.05; g.add(lasers);
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 3), new THREE.MeshBasicMaterial({ color: 0xff2e4a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); p.position.y = 1.5; const h = new THREE.Group(); h.rotation.z = (i - 3) * 0.18; h.add(p); lasers.add(h); }
  const eclats = particules(THREE, 300, { taille: 0.07 }); g.add(eclats.points);
  return {
    group: g, lid, hautOuvert: H + 0.02, couleurLueur: 0xff3355,
    maj(t, dt, s) {
      const pouls = Math.pow(Math.max(0, Math.sin(t * 2.6)), 12) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 2.6 - 0.5)), 12);   // battement de cœur
      neon.color.setRGB(Math.min(2, 0.75 + 0.9 * pouls + (s.ouvert ? 0.8 : 0)), 0.18 + 0.3 * pouls, 0.29 + 0.2 * pouls);
      cadran.rotation.y = s.ouvert ? easeOut(s.tau / 0.6) * Math.PI * 4 : Math.sin(t * 0.7) * 0.2;
      aff.material.map = s.tau > 0.6 && s.ouvert ? affT[1] : affT[0];
      const vk = s.ouvert ? lisse(0.45, 0.7, s.tau) : 0;
      for (const { v, sx } of verrous) v.position.x = sx * (0.12 + vk * 0.55);
      const ck = s.ouvert ? easeOutBack(clamp((s.tau - 0.65) / 0.7, 0, 1)) : 0;
      for (const { piv, sx } of coq) piv.rotation.z = sx * -ck * 1.9;
      const u = bouclier.material.uniforms; u.uT.value = t;
      u.uA.value = s.ouvert ? Math.max(0, 0.28 * (1 - lisse(0.5, 0.75, s.tau))) : 0.22 + 0.06 * Math.sin(t * 3);
      u.uFlash.value = s.ouvert ? Math.max(0, 1 - Math.abs(s.tau - 0.55) * 8) * 0.8 : 0;
      bouclier.visible = u.uA.value > 0.002 || u.uFlash.value > 0.01;
      if (s.top('eclats', 0.6)) eclats.emettre(260, (i, p) => { const a = alea() * 6.28, b = (alea() - 0.3) * 2.5; Object.assign(p, { x: Math.cos(a) * 1.4, y: 0.5 + b * 0.4, z: Math.sin(a) * 1.0, vx: Math.cos(a) * (1.2 + alea()), vy: b, vz: Math.sin(a) * (1.2 + alea()), r: 1, g: 0.2 + alea() * 0.3, b: 0.45, taille: 0.05 + alea() * 0.05, duree: 0.6 + alea() * 0.7 }); });
      eclats.maj(dt, { gravite: 1.5, frein: 1.4 });
      lasers.rotation.y = t * 1.6;
      lasers.children.forEach((h, i) => { h.children[0].material.opacity = s.ouvert ? lisse(0.9, 1.3, s.tau) * (0.55 + 0.45 * Math.sin(t * 9 + i)) : 0; });
    },
  };
}

/* ---------------------------------------------------------------- PIÈGES · Marché Noir : Reliquaire d'Obsidienne */
function reliquaireObsidienne(THREE) {
  const g = new THREE.Group();
  const U = { uT: { value: 0 }, uFeu: { value: 0.6 } };
  const obsidienne = emissifProcedural(new THREE.MeshPhysicalMaterial({ color: 0x07060b, metalness: 0.3, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }), U, `
    vec3 emissifPerso(vec3 p, vec3 n){ vec2 v = voronoi(p * 3.1 + vec3(0., uT * .05, 0.)); float fis = 1. - smoothstep(0.0, 0.06 + .05 * uFeu, v.y - v.x);
      float flux = .55 + .45 * snoise(p * 4. + vec3(0., -uT * .6, uT * .2)); float braise = fis * flux;
      vec3 c = mix(vec3(1.0, .22, .02), vec3(1.0, .75, .35), smoothstep(.4, 1., braise));
      c = mix(c, vec3(1.0, .97, .85), smoothstep(1.2, 2.2, uFeu));
      return c * braise * (0.9 + uFeu * 0.8); }`);
  const or = new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: 1, roughness: 0.16, envMapIntensity: 1.4 });
  const filig = new THREE.MeshBasicMaterial({ map: texFiligrane(THREE), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const H = 1.15;
  g.add(mesh(boiteRonde(THREE, W + 0.2, 0.12, D + 0.2, 0.04), or));
  // 4 pétales (faces) qui s'ouvrent en fleur autour de leur arête basse
  const petales = [];
  for (const [ry, off, larg] of [[0, D / 2, W], [Math.PI, D / 2, W], [-Math.PI / 2, W / 2, D], [Math.PI / 2, W / 2, D]]) {
    const piv = new THREE.Group(); piv.rotation.y = ry; piv.position.y = 0.12; g.add(piv);
    const charn = new THREE.Group(); charn.position.z = off; piv.add(charn);
    const geo = new THREE.BoxGeometry(larg - 0.02, H, 0.1); geo.translate(0, H / 2, -0.05);
    charn.add(mesh(geo, obsidienne));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(larg * 0.82, H * 0.82), filig); f.position.set(0, H / 2, 0.006); charn.add(f);
    for (const sx of [-1, 1]) { const arete = mesh(new THREE.BoxGeometry(0.06, H, 0.06), or); arete.position.set(sx * (larg / 2 - 0.03), H / 2, -0.03); charn.add(arete); }
    petales.push(charn);
  }
  const coeur = mesh(new THREE.BoxGeometry(W - 0.24, H - 0.05, D - 0.24), obsidienne); coeur.position.y = 0.12 + (H - 0.05) / 2; g.add(coeur);
  const lid = new THREE.Group(); lid.position.y = 0.12 + H; g.add(lid);
  const pyr = mesh(new THREE.ConeGeometry(1.0, 0.55, 4, 1), obsidienne); pyr.rotation.y = Math.PI / 4; pyr.scale.set(W / 1.42, 1, D / 1.42); pyr.position.y = 0.275; lid.add(pyr);
  const pointe = mesh(new THREE.OctahedronGeometry(0.12), or); pointe.position.y = 0.62; lid.add(pointe);
  const anneaux = [];
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Group(); a.position.y = 0.75; g.add(a);
    const r = 1.35 + i * 0.16;
    a.add(mesh(new THREE.TorusGeometry(r, 0.022, 10, 120), or, false));
    const runes = texRunes(THREE); runes.wrapS = THREE.RepeatWrapping; runes.repeat.set(2 + i, 1);
    a.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.09, 120, 1, true), new THREE.MeshBasicMaterial({ map: runes, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    a.rotation.set(0.5 + i * 0.6, i, 0.3 * i);
    anneaux.push({ a, v: (i % 2 ? -1 : 1) * (0.35 + i * 0.2), rx: a.rotation.x, rz: a.rotation.z });
  }
  const pilier = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 8, 32, 1, true), materiauFaisceau(THREE, 0xffa040)); pilier.position.y = 4.1; g.add(pilier);
  const onde = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  onde.rotation.x = Math.PI / 2; onde.position.y = 0.2; g.add(onde);
  const braises = particules(THREE, 420, { taille: 0.05 }); g.add(braises.points);
  return {
    group: g, lid, hautOuvert: 0.5, couleurLueur: 0xffa040,
    maj(t, dt, s) {
      U.uT.value = t;
      U.uFeu.value = s.ouvert ? 0.6 + 2.0 * lisse(0.1, 0.6, s.tau) : 0.6 + 0.25 * Math.sin(t * 1.7);
      const conv = s.ouvert ? lisse(0.0, 0.7, s.tau) : 0;
      for (const k of anneaux) {
        k.a.rotation.x = k.rx * (1 - conv) + Math.PI / 2 * conv;
        k.a.rotation.z = k.rz * (1 - conv);
        k.a.rotation.y += dt * k.v * (1 + conv * 8);
        k.a.scale.setScalar(1 + conv * 0.25 + (s.ouvert ? lisse(0.9, 1.6, s.tau) * 0.6 : 0));
        k.a.position.y = 0.75 + Math.sin(t * 1.3 + k.v) * 0.05 + conv * 0.4;
      }
      const ouv = s.ouvert ? easeOut(clamp((s.tau - 0.7) / 0.8, 0, 1)) : 0;
      lid.position.y = 0.12 + H + ouv * 1.4; lid.rotation.y = t * 0.3 + ouv * 6;
      petales.forEach((p) => { p.rotation.x = ouv * 1.25; });
      coeur.scale.y = 0.98 - ouv * 0.6; coeur.position.y = 0.12 + (H - 0.05) * coeur.scale.y / 2;
      pilier.material.uniforms.uT.value = t; pilier.material.uniforms.uA.value = s.ouvert ? lisse(0.7, 1.0, s.tau) * (0.9 + 0.1 * Math.sin(t * 7)) : 0;
      pilier.visible = pilier.material.uniforms.uA.value > 0.01;
      const ok = s.ouvert ? clamp((s.tau - 0.72) / 0.9, 0, 1) : 1;
      onde.scale.setScalar(0.5 + ok * 5); onde.material.opacity = s.ouvert ? (1 - ok) * 0.9 : 0;
      if (!s.ouvert && alea() < dt * 30) braises.emettre(1, (i, p) => Object.assign(p, { x: (alea() - 0.5) * W, y: 0.2 + alea() * H, z: (alea() - 0.5) * D, vx: (alea() - 0.5) * 0.1, vy: 0.25 + alea() * 0.4, vz: (alea() - 0.5) * 0.1, r: 1, g: 0.35 + alea() * 0.3, b: 0.05, taille: 0.025 + alea() * 0.03, duree: 1.5 + alea() * 1.5 }));
      if (s.top('explosion', 0.72)) braises.emettre(380, (i, p) => { const a = alea() * 6.28, v = 0.8 + alea() * 3; Object.assign(p, { x: 0, y: 0.6, z: 0, vx: Math.cos(a) * v, vy: 1 + alea() * 4, vz: Math.sin(a) * v, r: 1, g: 0.5 + alea() * 0.5, b: 0.15 + alea() * 0.3, taille: 0.04 + alea() * 0.06, duree: 0.8 + alea() * 1.4 }); });
      braises.maj(dt, { gravite: s.ouvert ? 2.2 : -0.1, frein: 0.7, tourbillon: s.ouvert ? 0 : 0.4 });
    },
  };
}

/* ---------------------------------------------------------------- BONUS · Standard : Coffret Cadeau Pit-Lane */
function coffretCadeau(THREE) {
  const g = new THREE.Group();
  const laque = new THREE.MeshPhysicalMaterial({ map: texLaque(THREE, '#c8102e', 'rgba(255,255,255,.07)'), metalness: 0.15, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 });
  const ruban = new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 0.75, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 1.3 });
  const H = 1.0;
  g.add(mesh(boiteRonde(THREE, W, H, D, 0.04), laque));
  const bandesCorps = [];
  for (const [w, d] of [[0.26, D + 0.02], [W + 0.02, 0.26]]) { const b = mesh(new THREE.BoxGeometry(w, H - 0.02, d), ruban); b.position.y = H / 2; g.add(b); bandesCorps.push(b); }
  const lid = new THREE.Group(); lid.position.y = H; g.add(lid);
  const couv = mesh(boiteRonde(THREE, W + 0.08, 0.26, D + 0.08, 0.04), laque); couv.position.y = -0.05; lid.add(couv);
  for (const [w, d] of [[0.27, D + 0.1], [W + 0.1, 0.27]]) { const b = mesh(new THREE.BoxGeometry(w, 0.27, d), ruban); b.position.y = 0.08; lid.add(b); }
  // nœud : 2 boucles (tubes sur une courbe en goutte) + nœud central + 2 pans
  const noeud = new THREE.Group(); noeud.position.y = 0.22; lid.add(noeud);
  const boucle = (sens) => {
    const pts = [];
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(new THREE.Vector3(sens * (0.06 + 0.3 * (1 - Math.cos(a))), 0.16 * Math.sin(a) + 0.1 * (1 - Math.cos(a)), 0.06 * Math.sin(a * 2))); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.05, 10, true); geo.scale(1, 1, 2.4);
    return mesh(geo, ruban);
  };
  const boucles = [boucle(1), boucle(-1)];
  boucles.forEach((b) => noeud.add(b));
  const centre = mesh(new THREE.SphereGeometry(0.11, 20, 14), ruban); centre.scale.set(1, 0.8, 1.2); centre.position.y = 0.06; noeud.add(centre);
  const pans = [];
  for (const sx of [-1, 1]) { const pts = [new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(sx * 0.2, 0.0, 0.25), new THREE.Vector3(sx * 0.32, -0.12, 0.62)]; const p = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.05, 8), ruban); p.scale.set(1, 0.4, 1); noeud.add(p); pans.push(p); }
  const etiq = new THREE.Group(); etiq.position.set(W / 2 - 0.2, -0.02, D / 2 + 0.05); lid.add(etiq);
  const carte = mesh(new THREE.BoxGeometry(0.34, 0.21, 0.01), new THREE.MeshStandardMaterial({ map: texEtiquette(THREE), roughness: 0.8 })); carte.position.y = -0.2; etiq.add(carte);
  const ficelle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), ruban); ficelle.position.y = -0.05; etiq.add(ficelle);
  // confettis (plans métallisés, physique propre)
  const confettis = [];
  const cols = [0xff3d6e, 0xffd34d, 0x3ddc97, 0x4cc9f0, 0xb07cff, 0xffffff];
  const geoC = new THREE.PlaneGeometry(0.06, 0.11);
  for (let i = 0; i < 150; i++) { const m = new THREE.Mesh(geoC, new THREE.MeshStandardMaterial({ color: cols[i % cols.length], metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide, emissive: cols[i % cols.length], emissiveIntensity: 0.25 })); m.visible = false; g.add(m); confettis.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3() }); }
  const paillettes = particules(THREE, 200, { taille: 0.05 }); g.add(paillettes.points);
  return {
    group: g, lid, hautOuvert: H + 0.02, couleurLueur: 0xffe08a,
    maj(t, dt, s) {
      etiq.rotation.z = Math.sin(t * 2.2) * 0.25; etiq.rotation.x = Math.sin(t * 1.7) * 0.1;
      noeud.rotation.y = Math.sin(t * 1.1) * 0.08;
      const dn = s.ouvert ? easeOut(clamp((s.tau - 0.15) / 0.5, 0, 1)) : 0;   // le nœud se défait et s'envole
      boucles.forEach((b, i) => { b.scale.set(1 + dn * 0.6, 1 - dn * 0.9, 1); b.position.x = (i ? -1 : 1) * dn * 1.2; b.position.y = dn * 1.4; b.rotation.z = (i ? 1 : -1) * dn * 2; });
      pans.forEach((p) => { p.visible = dn < 0.95; p.position.y = dn; });
      centre.visible = dn < 0.6;
      const rb = s.ouvert ? lisse(0.35, 0.7, s.tau) : 0;
      bandesCorps.forEach((b) => { b.scale.y = Math.max(0.001, 1 - rb); b.position.y = (H / 2) * (1 - rb); });
      // le couvercle saute en tournoyant (parabole)
      const tl = s.ouvert ? Math.max(0, s.tau - 0.55) : 0;
      lid.position.set(tl * 1.2, H + (s.ouvert ? 4.2 * tl - 3.6 * tl * tl : 0), -tl * 0.6);
      lid.rotation.set(-tl * 3.2, tl * 2, tl * 1.5);
      lid.visible = !(s.ouvert && tl > 1.3);
      if (s.top('confettis', 0.6)) for (const c of confettis) { c.m.visible = true; c.m.position.set((alea() - 0.5) * 1.2, H, (alea() - 0.5) * 0.8); c.v.set((alea() - 0.5) * 3, 3 + alea() * 3.5, (alea() - 0.5) * 3); c.w.set(alea() * 12, alea() * 12, alea() * 12); }
      for (const c of confettis) {
        if (!c.m.visible) continue;
        if (!s.ouvert) { c.m.visible = false; continue; }
        c.v.y -= 4.5 * dt; c.v.multiplyScalar(1 - 1.6 * dt); c.v.y = Math.max(c.v.y, -0.9);
        c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt; c.m.rotation.z += c.w.z * dt;
        if (c.m.position.y < -0.2) c.m.visible = false;
      }
      if (s.top('paillettes', 0.62)) paillettes.emettre(180, (i, p) => { const a = alea() * 6.28; Object.assign(p, { x: 0, y: H, z: 0, vx: Math.cos(a) * (0.5 + alea()), vy: 2 + alea() * 2.5, vz: Math.sin(a) * (0.5 + alea()), r: 1, g: 0.85, b: 0.4, taille: 0.03 + alea() * 0.04, duree: 1 + alea() }); });
      if (!s.ouvert && alea() < dt * 4) paillettes.emettre(1, (i, p) => Object.assign(p, { x: (alea() - 0.5) * W, y: H + 0.3 + alea() * 0.4, z: (alea() - 0.5) * D, vx: 0, vy: 0.05, vz: 0, r: 1, g: 0.95, b: 0.7, taille: 0.04, duree: 1.2 }));
      paillettes.maj(dt, { gravite: 2.5, frein: 0.9 });
    },
  };
}

/* ---------------------------------------------------------------- BONUS · Élite : Écrin Holographique */
function ecrinHolo(THREE) {
  const g = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0x1a1d2e, metalness: 1, roughness: 0.12, envMapIntensity: 1.6 });
  const irise = materiauIrise(THREE);
  const verre = new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x38e1ff });
  const Hb = 0.28, Hv = 1.0;
  g.add(mesh(boiteRonde(THREE, W, Hb, D, 0.06), chrome));
  for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.014, 0.014), cyan); l.position.set(0, Hb * 0.55, sz * (D / 2 + 0.002)); g.add(l); }
  const emetteur = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.04, 48), new THREE.MeshBasicMaterial({ color: 0x9ff3ff })); emetteur.position.y = Hb + 0.02; g.add(emetteur);
  // vitrine : 4 parois rabattables + toit ; montants irisés
  const parois = [], montants = [];
  for (const [ry, off, larg] of [[0, D / 2, W], [Math.PI, D / 2, W], [Math.PI / 2, W / 2, D], [-Math.PI / 2, W / 2, D]]) {
    const piv = new THREE.Group(); piv.rotation.y = ry; piv.position.y = Hb; g.add(piv);
    const charn = new THREE.Group(); charn.position.z = off; piv.add(charn);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(larg - 0.06, Hv), verre); v.position.y = Hv / 2; charn.add(v);
    const cadre = new THREE.Mesh(new THREE.BoxGeometry(larg, 0.04, 0.04), irise); cadre.position.y = Hv; charn.add(cadre);
    parois.push(charn);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, Hv, 0.05), irise); m.position.set(sx * W / 2, Hb + Hv / 2, sz * D / 2); g.add(m); montants.push(m); }
  const lid = new THREE.Group(); lid.position.y = Hb + Hv; g.add(lid);
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, D), verre));
  const toitCadre = new THREE.Mesh(boiteRonde(THREE, W + 0.06, 0.06, D + 0.06, 0.02), irise); toitCadre.position.y = 0.01; lid.add(toitCadre);
  // hologramme : icosaèdre filaire + étoile + cylindre à lignes de balayage
  const holo = new THREE.Group(); holo.position.y = Hb + 0.55; g.add(holo);
  const ico = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.32, 0)), new THREE.LineBasicMaterial({ color: 0x7ff7ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
  holo.add(ico);
  const etoile = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffffff })); holo.add(etoile);
  const scan = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.36, 0.95, 48, 1, true), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT; uniform float uA; varying vec2 vUv; void main(){ float l = step(.5, fract(vUv.y * 60. - uT * 2.)); float b = smoothstep(.0, .25, vUv.y) * smoothstep(1., .5, vUv.y);
      vec3 c = mix(vec3(.2,.9,1.), vec3(1.,.3,.9), .5 + .5 * sin(vUv.x * 12.566 + uT)); gl_FragColor = vec4(c, (l * .5 + .2) * b * uA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  scan.position.y = Hb + 0.5; g.add(scan);
  const rayons = new THREE.Group(); rayons.position.y = Hb + 0.55; g.add(rayons);
  const spectre = [0xff3355, 0xff9933, 0xffee55, 0x55ff99, 0x33ccff, 0x9966ff];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 3.6, 12, 1, true), materiauFaisceau(THREE, spectre[i % 6]));
    m.position.y = 1.8; const h = new THREE.Group(); h.rotation.set((alea() - 0.5) * 1.2, i / 12 * Math.PI * 2, (alea() - 0.3) * 0.9); h.add(m); rayons.add(h);
  }
  const caustique = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.4, 96), materiauIrise(THREE, { alpha: 0.3, stries: 0 }));
  caustique.rotation.x = -Math.PI / 2; caustique.position.y = 0.005; g.add(caustique);
  const scintilles = particules(THREE, 220, { taille: 0.05 }); g.add(scintilles.points);
  return {
    group: g, lid, hautOuvert: Hb + 0.05, couleurLueur: 0x7ff7ff,
    maj(t, dt, s) {
      irise.uniforms.uT.value = t; caustique.material.uniforms.uT.value = t * 0.6;
      ico.rotation.set(t * 0.5, t * 0.8, 0); etoile.rotation.y = -t * 2;
      const pw = s.ouvert ? lisse(0.3, 1.0, s.tau) : 0;
      holo.scale.setScalar(1 + pw * 1.6 + 0.04 * Math.sin(t * 4)); holo.position.y = Hb + 0.55 + pw * 0.5;
      ico.material.opacity = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 5);
      scan.material.uniforms.uT.value = t; scan.material.uniforms.uA.value = 0.5 + pw;
      const ab = s.ouvert ? easeOutBack(clamp((s.tau - 0.35) / 0.7, 0, 1)) : 0;
      parois.forEach((p) => { p.rotation.x = ab * 1.55; });
      montants.forEach((m) => { m.scale.y = Math.max(0.02, 1 - clamp(ab, 0, 1)); m.position.y = Hb + Hv / 2 * m.scale.y; });
      lid.position.y = Hb + Hv + ab * 1.6; lid.rotation.x = ab * 1.2;
      rayons.rotation.y = t * 0.4;
      rayons.children.forEach((h, i) => { const u = h.children[0].material.uniforms; u.uT.value = t; u.uA.value = s.ouvert ? lisse(0.5, 1.0, s.tau) * (0.5 + 0.5 * Math.sin(t * 2 + i)) : 0; h.visible = u.uA.value > 0.01; });
      if (s.top('scintilles', 0.5)) scintilles.emettre(200, (i, p) => { const a = alea() * 6.28, c = new THREE.Color(spectre[i % 6]); Object.assign(p, { x: 0, y: Hb + 0.6, z: 0, vx: Math.cos(a) * (0.8 + alea() * 1.5), vy: (alea() - 0.2) * 2, vz: Math.sin(a) * (0.8 + alea() * 1.5), r: c.r, g: c.g, b: c.b, taille: 0.03 + alea() * 0.05, duree: 0.8 + alea() * 0.8 }); });
      scintilles.maj(dt, { gravite: 0.5, frein: 1.2 });
    },
  };
}

/* ---------------------------------------------------------------- BONUS · Marché Noir : Cœur d'Étoile */
function coeurEtoile(THREE) {
  const g = new THREE.Group();
  const or = new THREE.MeshStandardMaterial({ color: 0xffcf6a, metalness: 1, roughness: 0.13, envMapIntensity: 1.7 });
  const ivoire = new THREE.MeshPhysicalMaterial({ color: 0x20183a, metalness: 0.2, roughness: 0.3, clearcoat: 1, emissive: 0xffd890, emissiveMap: texCarteCiel(THREE), emissiveIntensity: 0.55, envMapIntensity: 1.2 });   // laque nuit, carte du ciel dorée
  const H = 0.9;
  for (const [w, h, d, y] of [[W + 0.3, 0.08, D + 0.3, 0], [W + 0.16, 0.08, D + 0.16, 0.08]]) { const m = mesh(boiteRonde(THREE, w, h, d, 0.03), or); m.position.y = y; g.add(m); }
  const corps = mesh(boiteRonde(THREE, W, H, D, 0.05), ivoire); corps.position.y = 0.16; g.add(corps);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = mesh(new THREE.CylinderGeometry(0.07, 0.08, H + 0.04, 16), or); c.position.set(sx * W / 2, 0.16 + H / 2, sz * D / 2); g.add(c);
    const b = mesh(new THREE.SphereGeometry(0.1, 16, 12), or); b.position.set(sx * W / 2, 0.2 + H, sz * D / 2); g.add(b);
  }
  for (const y of [0.2, 0.12 + H]) { const f = mesh(new THREE.BoxGeometry(W + 0.04, 0.04, D + 0.04), or); f.position.y = y; g.add(f); }
  // couvercle : 4 quartiers de dôme qui s'ouvrent en corolle
  const lid = new THREE.Group(); lid.position.y = 0.16 + H; g.add(lid);
  const quartiers = [];
  for (let i = 0; i < 4; i++) {
    const piv = new THREE.Group(); piv.rotation.y = i * Math.PI / 2; lid.add(piv);
    const ext = i % 2 ? W / 2 : D / 2, lat = i % 2 ? D / 2 : W / 2;
    const charn = new THREE.Group(); charn.position.z = ext; piv.add(charn);
    const q = mesh(new THREE.SphereGeometry(1, 32, 12, Math.PI / 4, Math.PI / 2, 0, Math.PI / 2), or);
    q.scale.set(lat, 0.45, ext); q.position.z = -ext; charn.add(q);
    quartiers.push(charn);
  }
  const arm = new THREE.Group(); arm.position.y = 0.16 + H + 0.95; g.add(arm);
  const cercles = [];
  for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(0.5 + i * 0.07, 0.018, 10, 96), or, false); r.rotation.set(i * 0.9, i * 0.6, 0); arm.add(r); cercles.push(r); }
  const US = { uT: { value: 0 }, uP: { value: 0 } };
  const soleil = new THREE.Mesh(new THREE.SphereGeometry(0.24, 48, 32), new THREE.ShaderMaterial({
    uniforms: US,
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uT; uniform float uP; varying vec3 vP; varying vec3 vN; varying vec3 vV; ${GLSL_BRUIT}
      void main(){ float n = snoise(vP * 9. + vec3(uT * .4)) * .5 + snoise(vP * 22. - vec3(uT * .7)) * .25; float f = pow(1. - abs(dot(vN, vV)), 2.);
        vec3 c = mix(vec3(1., .55, .12), vec3(1., .96, .78), .5 + n); gl_FragColor = vec4(c * (1.6 + uP * 3.) + vec3(1., .7, .3) * f * 2., 1.); }`,
  }));
  arm.add(soleil);
  const couronne = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo(THREE), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  couronne.scale.setScalar(1.6); arm.add(couronne);
  const aurore = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 3.4, 64, 1, true, Math.PI * 0.7, Math.PI * 0.6), new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT; uniform float uA; varying vec2 vUv; ${GLSL_BRUIT} void main(){ float n = snoise(vec3(vUv.x * 4., vUv.y * .8 - uT * .15, uT * .1));
      float rideau = smoothstep(.0, .6, vUv.y) * smoothstep(1., .35, vUv.y) * (.5 + .5 * sin(vUv.x * 30. + n * 6.));
      vec3 c = mix(vec3(.2, 1., .6), vec3(.7, .3, 1.), vUv.y + n * .3); gl_FragColor = vec4(c, rideau * uA * (.4 + .6 * smoothstep(-.2, .6, n))); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  aurore.position.y = 1.6; g.add(aurore);
  const rayon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.9, 9, 32, 1, true), materiauFaisceau(THREE, 0xffe6a0)); rayon.position.y = 5; g.add(rayon);
  const onde = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 96), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  onde.rotation.x = Math.PI / 2; g.add(onde);
  const poussiere = particules(THREE, 500, { taille: 0.045 }); g.add(poussiere.points);
  return {
    group: g, lid, hautOuvert: 0.16 + H + 0.02, couleurLueur: 0xffe6a0,
    maj(t, dt, s) {
      US.uT.value = t; aurore.material.uniforms.uT.value = t; rayon.material.uniforms.uT.value = t;
      const sp = s.ouvert ? lisse(0.0, 0.8, s.tau) : 0;
      cercles.forEach((r, i) => { r.rotation.x += dt * (0.4 + i * 0.25) * (1 + sp * 10); r.rotation.y += dt * (0.3 - i * 0.2) * (1 + sp * 10); r.scale.setScalar(1 + sp * (1.2 + i * 0.5)); });
      const ouv = s.ouvert ? easeOutBack(clamp((s.tau - 0.4) / 0.8, 0, 1)) : 0;
      quartiers.forEach((q) => { q.rotation.x = ouv * 1.9; });
      arm.position.y = 0.16 + H + 0.95 + Math.sin(t * 1.2) * 0.06 + (s.ouvert ? -0.5 * lisse(0.3, 0.6, s.tau) + 1.2 * lisse(0.6, 1.4, s.tau) : 0);
      const nova = s.ouvert ? Math.exp(-Math.pow((s.tau - 0.85) * 6, 2)) : 0;
      US.uP.value = nova + sp * 0.4;
      soleil.scale.setScalar(1 + nova * 1.5 + sp * 0.4);
      couronne.scale.setScalar(1.6 + nova * 8 + sp * 1.2 + Math.sin(t * 3) * 0.1);
      aurore.material.uniforms.uA.value = 0.35 + sp * 0.6;
      rayon.material.uniforms.uA.value = s.ouvert ? lisse(0.8, 1.2, s.tau) : 0; rayon.visible = rayon.material.uniforms.uA.value > 0.01;
      const ok = s.ouvert ? clamp((s.tau - 0.85) / 0.9, 0, 1) : 1;
      onde.position.y = arm.position.y; onde.scale.setScalar(0.4 + ok * 6); onde.material.opacity = s.ouvert ? (1 - ok) : 0;
      if (!s.ouvert && alea() < dt * 14) poussiere.emettre(1, (i, p) => Object.assign(p, { x: (alea() - 0.5) * 2.4, y: 0.2 + alea() * 0.5, z: (alea() - 0.5) * 1.8, vx: 0, vy: 0.3 + alea() * 0.3, vz: 0, r: 1, g: 0.85, b: 0.5, taille: 0.025 + alea() * 0.025, duree: 2 + alea() * 2 }));
      if (s.top('fontaine', 0.85)) poussiere.emettre(480, (i, p) => { const a = alea() * 6.28, v = 0.6 + alea() * 2.6; Object.assign(p, { x: 0, y: arm.position.y, z: 0, vx: Math.cos(a) * v, vy: 1.5 + alea() * 4.5, vz: Math.sin(a) * v, r: 1, g: 0.8 + alea() * 0.2, b: 0.4 + alea() * 0.4, taille: 0.03 + alea() * 0.06, duree: 1.2 + alea() * 1.6 }); });
      poussiere.maj(dt, { gravite: s.ouvert ? 2.6 : -0.05, frein: 0.5, tourbillon: s.ouvert ? 0 : 0.35 });
    },
  };
}

const FABRIQUES = {
  piege: { standard: caisseChantier, elite: coffreCarbone, marche_noir: reliquaireObsidienne },
  bonus: { standard: coffretCadeau, elite: ecrinHolo, marche_noir: coeurEtoile },
};

/**
 * Construit une caisse Prestige. Retourne { group, lid, update(t, dt), ouvrir(), fermer(), ouverture, nom }.
 * Échelle de scène : ≈ 2 × 1,4 × 1,4 (base à y = 0). Ouverture en 3 temps (≈ 1,6 s) : tension, éclat, gloire.
 */
export function buildCaisse(THREE, gamme = 'standard', famille = 'piege') {
  THREE_ = THREE;
  const fam = famille === 'bonus' ? 'bonus' : 'piege';
  const fab = FABRIQUES[fam][gamme] || FABRIQUES[fam].standard;
  const d = fab(THREE);
  const group = new THREE.Group(); group.add(d.group);
  const lueurMat = new THREE.MeshBasicMaterial({ color: d.couleurLueur, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lueur = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, D * 0.86), lueurMat); lueur.rotation.x = -Math.PI / 2; lueur.position.y = d.hautOuvert; group.add(lueur);
  const lum = new THREE.PointLight(d.couleurLueur, 0, 7); lum.position.y = d.hautOuvert + 0.5; group.add(lum);
  const st = { ouvert: false, t: 0, t0: 0, tops: new Set(), enAttente: false };
  const etat = {
    get ouvert() { return st.ouvert; }, get tau() { return st.ouvert ? st.t - st.t0 : 0; }, k: 0,
    /** Vrai une seule fois, quand l'ouverture dépasse `instant` secondes. */
    top(nom, instant) { if (!st.ouvert || st.tops.has(nom) || st.t - st.t0 < instant) return false; st.tops.add(nom); return true; },
  };
  return {
    group, lid: d.lid, nom: (DESIGNS[fam][gamme] || DESIGNS[fam].standard).nom,
    get ouverture() { return st.ouvert ? clamp((st.t - st.t0) / 1.2, 0, 1) : 0; },
    ouvrir() { st.enAttente = true; },
    fermer() { st.ouvert = false; st.enAttente = false; st.tops.clear(); },
    update(t, dt = 1 / 60) {
      st.t = t;
      if (st.enAttente) { st.enAttente = false; st.ouvert = true; st.t0 = t; st.tops.clear(); }
      const tau = etat.tau;
      d.maj(t, dt, etat);
      const o = st.ouvert ? lisse(0.35, 0.9, tau) : 0;
      lueurMat.opacity = o * 0.95;
      lum.intensity = o * (4 + 2 * Math.sin(t * 9));
      const vib = st.ouvert ? (1 - lisse(0.3, 0.45, tau)) * lisse(0, 0.1, tau) : 0;      // tension : la caisse vibre avant l'éclat
      d.group.position.set(Math.sin(t * 61) * 0.025 * vib, 0, Math.cos(t * 53) * 0.025 * vib);
      d.group.rotation.z = st.ouvert ? Math.sin(t * 47) * 0.02 * vib : Math.sin(t * 22) * 0.006 * (0.5 + 0.5 * Math.sin(t * 0.9));
    },
  };
}

/* ------------------------------------------------------------------------------------- BLOOM HDR */
/**
 * Halo lumineux multi-niveaux (style « Unreal bloom ») + tonemapping ACES + vignettage léger.
 * Conserve l'alpha : la caisse peut être incrustée sur la TV, son halo déborde sur l'interface.
 *   const b = creerBloom(THREE, renderer); b.taille(w, h); … b.rendre(scene, camera);
 */
export function creerBloom(THREE, renderer, { force = 0.9, seuil = 0.82, exposition = 1.0, niveaux = 5 } = {}) {
  const gl2 = renderer.capabilities.isWebGL2;
  const type = gl2 || renderer.extensions.get('OES_texture_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const opts = { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
  const principal = gl2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(4, 4, { ...opts }) : new THREE.WebGLRenderTarget(4, 4, opts);
  const lumiere = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false });
  const flous = [];
  for (let i = 0; i < niveaux; i++) flous.push([new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false }), new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false })]);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(quad);
  const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const mLum = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uSeuil: { value: seuil } }, vertexShader: vert,
    fragmentShader: `uniform sampler2D tSrc; uniform float uSeuil; varying vec2 vUv; void main(){ vec4 c = texture2D(tSrc, vUv); float l = max(c.r, max(c.g, c.b));
      float k = smoothstep(uSeuil, uSeuil + .35, l); gl_FragColor = vec4(c.rgb * k, 1.); }`, depthTest: false, depthWrite: false });
  const mFlou = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: vert,
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s = texture2D(tSrc, vUv).rgb * .227027;
      s += texture2D(tSrc, vUv + uDir * 1.3846).rgb * .316216; s += texture2D(tSrc, vUv - uDir * 1.3846).rgb * .316216;
      s += texture2D(tSrc, vUv + uDir * 3.2308).rgb * .070270; s += texture2D(tSrc, vUv - uDir * 3.2308).rgb * .070270; gl_FragColor = vec4(s, 1.); }`, depthTest: false, depthWrite: false });
  const poids = [1.0, 0.85, 0.7, 0.55, 0.45, 0.35, 0.3];
  const uniformsComp = { tBase: { value: null }, uForce: { value: force }, uExpo: { value: exposition } };
  for (let i = 0; i < niveaux; i++) uniformsComp['tB' + i] = { value: null };
  const mComp = new THREE.ShaderMaterial({ uniforms: uniformsComp, vertexShader: vert,
    fragmentShader: `uniform sampler2D tBase; ${flous.map((_, i) => `uniform sampler2D tB${i};`).join(' ')} uniform float uForce; uniform float uExpo; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
      void main(){ vec4 b = texture2D(tBase, vUv);
        vec3 h = ${flous.map((_, i) => `texture2D(tB${i}, vUv).rgb * ${poids[i].toFixed(2)}`).join(' + ')};
        h *= uForce;
        vec3 c = aces(b.rgb * uExpo * 1.05) + h;
        float v = smoothstep(1.25, .35, length(vUv - .5) * 1.6);
        float a = clamp(b.a + max(h.r, max(h.g, h.b)) * 1.2, 0., 1.);
        gl_FragColor = vec4(c * mix(.82, 1., v), a); }`, depthTest: false, depthWrite: false, transparent: true });
  const passe = (m, cible) => { quad.material = m; renderer.setRenderTarget(cible); renderer.render(sc, cam); };
  return {
    taille(W2, H2) {
      const pr = renderer.getPixelRatio(); const w = Math.max(4, Math.floor(W2 * pr)), h = Math.max(4, Math.floor(H2 * pr));
      principal.setSize(w, h); lumiere.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
      flous.forEach(([a, b], i) => { const s = 2 << i, ww = Math.max(2, (w / s) | 0), hh = Math.max(2, (h / s) | 0); a.setSize(ww, hh); b.setSize(ww, hh); });
    },
    rendre(scene, camera) {
      const alpha = renderer.getClearAlpha(), auto = renderer.autoClear;
      renderer.autoClear = true;
      renderer.setClearAlpha(0);
      renderer.setRenderTarget(principal); renderer.clear(); renderer.render(scene, camera);
      mLum.uniforms.tSrc.value = principal.texture; passe(mLum, lumiere);
      let src = lumiere;
      for (const [a, b] of flous) {
        mFlou.uniforms.tSrc.value = src.texture; mFlou.uniforms.uDir.value.set(1 / a.width, 0); passe(mFlou, a);
        mFlou.uniforms.tSrc.value = a.texture; mFlou.uniforms.uDir.value.set(0, 1 / b.height); passe(mFlou, b);
        src = b;
      }
      mComp.uniforms.tBase.value = principal.texture;
      flous.forEach(([, b], i) => { mComp.uniforms['tB' + i].value = b.texture; });
      quad.material = mComp; renderer.setRenderTarget(null); renderer.clear(); renderer.render(sc, cam);
      renderer.setClearAlpha(alpha); renderer.autoClear = auto;
    },
    set force(v) { mComp.uniforms.uForce.value = v; },
    dispose() { principal.dispose(); lumiere.dispose(); flous.forEach(([a, b]) => { a.dispose(); b.dispose(); }); [mLum, mFlou, mComp].forEach((m) => m.dispose()); },
  };
}

/* ------------------------------------------------------------------ vignettes (rendu unique, mis en cache) */
let snapR = null, snapB = null;
const snapCache = new Map();
/** Vignette PNG (dataURL) d'une caisse, avec halo : tuiles du Pocket Pit (pas de WebGL permanent). */
export async function vignette(gamme, famille, px = 256) {
  const k = `${gamme}|${famille}|${px}`;
  if (snapCache.has(k)) return snapCache.get(k);
  const THREE = await ensureThree();
  if (!snapR) {
    snapR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    snapR.setPixelRatio(1);
    snapB = creerBloom(THREE, snapR, { force: 0.75 });
  }
  snapR.setSize(px, px, false); snapB.taille(px, px);
  const scene = new THREE.Scene();
  preparerScene(THREE, snapR, scene, { teinte: famille === 'bonus' ? 0x38e1ff : 0xff3d6e });
  scene.add(new THREE.HemisphereLight(0xe0e8ff, 0x302040, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(3, 5, 4); scene.add(sun);
  const rim = new THREE.DirectionalLight(gamme === 'elite' ? 0x9b7bff : gamme === 'marche_noir' ? 0xffc040 : 0xffe0b0, 1.2); rim.position.set(-4, 2, -3); scene.add(rim);
  const c = buildCaisse(THREE, gamme, famille);
  for (let i = 0; i < 8; i++) c.update(1.2 + i / 60, 1 / 60);
  scene.add(c.group);
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 50); cam.position.set(2.9, 2.6, 3.8); cam.lookAt(0, 0.85, 0);
  snapB.rendre(scene, cam);
  const url = snapR.domElement.toDataURL('image/png');
  snapCache.set(k, url);
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
  if (scene.environment) scene.environment.dispose();
  return url;
}
