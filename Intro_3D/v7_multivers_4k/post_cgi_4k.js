/* POST-TRAITEMENT CGI V7 — pipeline HDR demi-flottant (three.js r128, WebGL2) :

     scène (HDR linéaire, MSAA 4×)  →  [ accumulation temporelle : M sous-expositions, obturateur 180° ]  →  bloom « dual filter » (5 niveaux)
     →  composite : déchirure dimensionnelle (u.dechirure), onde de choc (u.onde), flou radial directionnel, aberration chromatique,
        flash, ACES filmic, vignette optique, grain  →  canvas WebGL (sRGB).

   Le HUD vectoriel 4K n'est PAS dans ce pipeline : il est dessiné APRÈS, à la résolution native, par hud_broadcast_4k.js.

   Le bloom est borné par un seuil à genou (1,15) et une force modérée : les carrosseries éclairées (< 1) ne brûlent jamais ; seuls les
   émissifs HDR (néons, portails, étincelles) bavent. Les uniformes dechirure / onde reprennent la logique de shared/archetypes.js
   (déchirure diagonale dentelée aux lèvres incandescentes, anneau de réfraction de l'onde de choc), portée ici en HDR pour que les
   lèvres de la déchirure alimentent le bloom. */

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

/* La scène écrit en sRGB (rtScene.texture.encoding = sRGB : les matériaux de shared/ sont conçus pour une sortie sRGB, comme dans les reveals) ;
   la copie dans l'accumulateur DÉCODE en linéaire : exposition, bloom, ACES et sous-expositions se font ensuite en lumière linéaire. */
const FRAG_COPIE = `uniform sampler2D tex; uniform float poids; varying vec2 vUv;
vec3 enLineaire(vec3 c){ return mix(c / 12.92, pow((max(c, vec3(0.0)) + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void main(){ gl_FragColor = vec4(enLineaire(texture2D(tex, vUv).rgb) * poids, 1.0); }`;

const FRAG_PREFILTRE = `uniform sampler2D tex; uniform vec2 texel; uniform float seuil, genou; varying vec2 vUv;
vec3 f(vec2 uv){ vec3 c = texture2D(tex, uv).rgb; float l = max(c.r, max(c.g, c.b)); float s = clamp(l - seuil + genou, 0.0, 2.0 * genou); s = s * s / (4.0 * genou + 1e-4); float k = max(s, l - seuil) / max(l, 1e-4); return c * k; }
void main(){ vec3 c = f(vUv + texel * vec2(-1.0, -1.0)) + f(vUv + texel * vec2(1.0, -1.0)) + f(vUv + texel * vec2(-1.0, 1.0)) + f(vUv + texel * vec2(1.0, 1.0)); gl_FragColor = vec4(min(c * 0.25, vec3(24.0)), 1.0); }`;

const FRAG_BAS = `uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
void main(){ vec3 c = texture2D(tex, vUv).rgb * 4.0; c += texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb; gl_FragColor = vec4(c / 8.0, 1.0); }`;

const FRAG_HAUT = `uniform sampler2D tex, base; uniform vec2 texel; uniform float poids; varying vec2 vUv;
void main(){ vec3 c = texture2D(tex, vUv + texel * vec2(-1.0, 0.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 0.0)).rgb + texture2D(tex, vUv + texel * vec2(0.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(0.0, 1.0)).rgb;
  c += (texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb) * 2.0;
  gl_FragColor = vec4(texture2D(base, vUv).rgb + c / 12.0 * poids, 1.0); }`;

const FRAG_FINAL = `
uniform sampler2D tScene, tBloom; uniform vec2 res; uniform float temps, exposition, bloomForce, vignette, grain, aberration, flou, flash, fondu, dechirure, ondeForce, saturation;
uniform vec3 flashCouleur, onde, gel1, gel2; uniform float gelForce; uniform vec2 centreFlou;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 oetf(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 echant(vec2 uv, float ab){ return vec3(texture2D(tScene, uv + vec2(ab, 0.0)).r, texture2D(tScene, uv).g, texture2D(tScene, uv - vec2(ab, 0.0)).b); }
void main(){
  vec2 uv = vUv, ar = vec2(res.x / res.y, 1.0);
  // onde de choc : anneau de réfraction qui s'étend depuis le portail
  float anneau = 0.0;
  if (ondeForce > 0.001) { vec2 dq = (vUv - onde.xy) * ar; float dd = length(dq), larg = 0.03 + 0.05 * onde.z; anneau = exp(-pow((dd - onde.z) / larg, 2.0)) * ondeForce; uv += (dq / max(dd, 1e-4)) / ar * anneau * 0.03 * clamp((dd - onde.z) / larg, -1.0, 1.0); }
  float ab = aberration * (0.4 + length((vUv - 0.5) * ar)) + anneau * 0.007;
  // flou radial directionnel (boost dans le portail) : 10 prises le long du rayon centre → pixel
  vec3 col;
  if (flou > 0.001) { vec2 d = (uv - centreFlou) * flou * 0.12; vec3 s = vec3(0.0); float w = 0.0; for (int i = 0; i < 10; i++) { float k = float(i) / 9.0; s += echant(uv - d * k, ab); w += 1.0; } col = s / w; }
  else col = echant(uv, ab);
  // déchirure dimensionnelle : fente diagonale dentelée qui s'ouvre, lèvres incandescentes (HDR → alimente le bloom du cadre suivant)
  if (dechirure > 0.001) {
    vec2 dv = vUv - 0.5; dv *= ar; vec2 n = normalize(vec2(1.0, -0.42));
    float axe = dot(dv, n) + (vn(vUv * vec2(9.0, 34.0)) - 0.5) * 0.06 + (vn(vUv * vec2(2.0, 8.0)) - 0.5) * 0.07;
    float ouv = dechirure * dechirure * 1.7, dedans = step(abs(axe), ouv);
    vec3 dehors = echant(uv + n * sign(axe) * ouv * 0.18 / ar, ab) * (1.0 - 0.45 * dechirure);
    col = mix(dehors, col, dedans);
    float bord = smoothstep(0.03, 0.0, abs(abs(axe) - ouv)) * step(dechirure, 0.995);
    col += vec3(1.0, 0.86, 0.62) * bord * 5.0;
  }
  col += texture2D(tBloom, uv).rgb * bloomForce;
  col *= exposition;
  if (gelForce > 0.001) { float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(col, mix(gel1, gel2, smoothstep(0.0, 1.2, l)) * (0.35 + l), gelForce); }
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, saturation);
  col += flashCouleur * flash * 3.0;                                   // flash directionnel du portail (HDR avant ACES : ne brûle pas en aplat)
  col = aces(col);
  vec2 q = (vUv - 0.5) * ar; col *= mix(1.0, smoothstep(1.15, 0.28, length(q * vec2(0.9, 1.1))), vignette);
  col = oetf(col);
  col += (h21(gl_FragCoord.xy + fract(temps * 61.0) * 113.0) - 0.5) * grain;
  col *= 1.0 - fondu;
  gl_FragColor = vec4(col, 1.0);
}`;

export function creerPostCGI(THREE, renderer, largeur, hauteur, { msaa = true } = {}) {
  const gl2 = renderer.capabilities.isWebGL2;
  const hdr = gl2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type, depthBuffer: true, stencilBuffer: false };
  const rt = (w, h, depth = false) => new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), { ...opts, depthBuffer: depth });
  let rtScene, rtAcc, niveaux = [], niveauxB = [], W = largeur, H = hauteur;
  const fabriqueScene = (w, h) => {
    if (gl2 && msaa && THREE.WebGLMultisampleRenderTarget) { const r = new THREE.WebGLMultisampleRenderTarget(w, h, opts); r.samples = 4; return r; }
    return rt(w, h, true);
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false;
  const sceneQ = new THREE.Scene(); sceneQ.add(quad); const camQ = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
  const mCopie = mat(FRAG_COPIE, { tex: { value: null }, poids: { value: 1 } }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  const mPre = mat(FRAG_PREFILTRE, { tex: { value: null }, texel: { value: new THREE.Vector2() }, seuil: { value: 1.15 }, genou: { value: 0.5 } });
  const mBas = mat(FRAG_BAS, { tex: { value: null }, texel: { value: new THREE.Vector2() } });
  const mHaut = mat(FRAG_HAUT, { tex: { value: null }, base: { value: null }, texel: { value: new THREE.Vector2() }, poids: { value: 1 } });
  const u = {
    tScene: { value: null }, tBloom: { value: null }, res: { value: new THREE.Vector2(W, H) }, temps: { value: 0 }, exposition: { value: 1 }, bloomForce: { value: 0.32 },
    vignette: { value: 0.55 }, grain: { value: 0.02 }, aberration: { value: 0.0006 }, flou: { value: 0 }, centreFlou: { value: new THREE.Vector2(0.5, 0.5) }, flash: { value: 0 },
    flashCouleur: { value: new THREE.Color(1, 0.92, 0.8) }, fondu: { value: 0 }, dechirure: { value: 0 }, onde: { value: new THREE.Vector3(0.5, 0.5, 0) }, ondeForce: { value: 0 },
    gel1: { value: new THREE.Color(0, 0, 0) }, gel2: { value: new THREE.Color(1, 1, 1) }, gelForce: { value: 0 }, saturation: { value: 1.05 },
  };
  const mFinal = mat(FRAG_FINAL, u);
  const passe = (m, cible) => { quad.material = m; renderer.setRenderTarget(cible); renderer.render(sceneQ, camQ); };
  function allouer() {
    for (const r of [rtScene, rtAcc, ...niveaux, ...niveauxB]) r && r.dispose();
    rtScene = fabriqueScene(W, H); rtScene.texture.encoding = THREE.sRGBEncoding; rtAcc = rt(W, H, false); niveaux = []; niveauxB = [];
    let w = W >> 1, h = H >> 1; for (let i = 0; i < 5; i++) { niveaux.push(rt(w, h)); niveauxB.push(rt(w, h)); w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); }
    u.res.value.set(W, H);
  }
  allouer();
  let nAcc = 0;
  return {
    u, hdr, get largeur() { return W; }, get hauteur() { return H; },
    taille(w, h) { W = w; H = h; allouer(); },
    /** début d'une image : remet l'accumulateur à zéro */
    debut() { nAcc = 0; },
    /** rend la scène (HDR) et l'ajoute à l'accumulateur avec le poids donné (1/M) */
    accumuler(scene, camera, poids = 1) {
      const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
      const ancienFond = scene.background;
      renderer.setRenderTarget(rtScene); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.toneMapping = tm; scene.background = ancienFond;
      mCopie.uniforms.tex.value = rtScene.texture; mCopie.uniforms.poids.value = poids;
      if (nAcc === 0) { renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 1); renderer.clear(); }
      renderer.autoClear = false; passe(mCopie, rtAcc); renderer.autoClear = true; nAcc++;
    },
    /** bloom + composite → canvas WebGL du renderer */
    composer() {
      const src = rtAcc.texture;
      mPre.uniforms.tex.value = src; mPre.uniforms.texel.value.set(1 / W, 1 / H); passe(mPre, niveaux[0]);
      for (let i = 1; i < niveaux.length; i++) { mBas.uniforms.tex.value = niveaux[i - 1].texture; mBas.uniforms.texel.value.set(1 / niveaux[i - 1].width, 1 / niveaux[i - 1].height); passe(mBas, niveaux[i]); }
      for (let i = niveaux.length - 2; i >= 0; i--) {                       // remontée : niveau i += lissage(niveau i+1) ; double tampon pour ne jamais lire et écrire la même cible
        mHaut.uniforms.tex.value = niveaux[i + 1].texture; mHaut.uniforms.base.value = niveaux[i].texture; mHaut.uniforms.texel.value.set(1 / niveaux[i + 1].width, 1 / niveaux[i + 1].height);
        passe(mHaut, niveauxB[i]); const tmp = niveaux[i]; niveaux[i] = niveauxB[i]; niveauxB[i] = tmp;
      }
      u.tScene.value = src; u.tBloom.value = niveaux[0].texture;
      passe(mFinal, null);
    },
    dispose() { for (const r of [rtScene, rtAcc, ...niveaux, ...niveauxB]) r && r.dispose(); },
  };
}
