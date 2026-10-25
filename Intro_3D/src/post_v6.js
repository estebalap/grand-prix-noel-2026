/* POST-TRAITEMENT — INTRO V6 (dérivé de post_v5.js, qui reste intact). Image « cinéma propre » :
     - lignes de balayage divisées par 5 (0,025 → 0,005) et réglables ; grain par défaut 0,018 (au lieu de 0,04–0,06) ;
     - l'aberration chromatique et le flou radial ne sont plus permanents : le film ne les envoie que pendant les 120 ms
       qui suivent un impact franc (réglages.aberration / réglages.flouRadial à 0 le reste du temps) ;
     - la couche HUD broadcast est rendue PAR-DESSUS, après ce shader (film_v6 + hud_v6) : jamais floutée ni bruitée.
   Reste identique à la v5 : 
   La scène est rendue en HDR (sans tone mapping) dans une cible flottante, puis un seul shader de composition applique :
     - bloom (seuil doux + flou gaussien séparable sur 2 niveaux : demi et quart de résolution) : les néons, flammes,
       faisceaux et phares « bavent » comme sur une vraie caméra ;
     - flou radial et aberration chromatique sur les impacts (force pilotée par le film) ;
     - tone mapping ACES (même courbe que three.js) + exposition, puis conversion sRGB ;
     - vignette, grain de pellicule SEMÉ par le numéro d'image (déterministe), lignes de balayage très légères ;
     - voiles noir (fondus) et blanc (flashs).
   Tout est déterministe : mêmes uniformes → mêmes pixels. Aucun état ne dépend de l'image précédente.

   creerPost(renderer, L, H) → { rendre(scene, camera, reglages), liberer() }
   reglages = { exposition, bloom, seuil, aberration, flouRadial, vignette, grain, noir, flash, image, teinte:[r,g,b] }
*/
const T = () => window.THREE;

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const FS_SEUIL = `varying vec2 vUv; uniform sampler2D src; uniform float seuil;
  void main(){ vec3 c = texture2D(src, vUv).rgb; float l = max(c.r, max(c.g, c.b));
    float k = clamp((l - seuil) / max(1e-4, seuil), 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
    gl_FragColor = vec4(min(c * k, vec3(40.0)), 1.0); }`;

// flou gaussien séparable à 9 prises (poids binomiaux, échantillonnage linéaire)
const FS_FLOU = `varying vec2 vUv; uniform sampler2D src; uniform vec2 dir;
  void main(){ vec3 s = texture2D(src, vUv).rgb * 0.2270270270;
    s += texture2D(src, vUv + dir * 1.3846153846).rgb * 0.3162162162; s += texture2D(src, vUv - dir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(src, vUv + dir * 3.2307692308).rgb * 0.0702702703; s += texture2D(src, vUv - dir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(s, 1.0); }`;

const FS_COMPO = `varying vec2 vUv;
  uniform sampler2D scene; uniform sampler2D bloom1; uniform sampler2D bloom2;
  uniform float exposition, bloom, aberration, flouRadial, vignette, grain, balayage, noir, flash, image; uniform vec3 teinte; uniform vec2 taille;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 aces(vec3 c){                                   // RRT + ODT ajusté (Stephen Hill) : identique à ACESFilmicToneMapping de three.js
    const mat3 ACESIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    const mat3 ACESOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    c = ACESIn * c; vec3 a = c * (c + 0.0245786) - 0.000090537; vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081; c = a / b;
    return clamp(ACESOut * c, 0.0, 1.0); }
  vec3 versSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  vec3 lire(vec2 uv){
    vec2 d = uv - 0.5; float r2 = dot(d, d);
    vec2 off = d * aberration * (0.6 + r2 * 2.0);
    vec3 c = vec3(texture2D(scene, uv + off).r, texture2D(scene, uv).g, texture2D(scene, uv - off).b);
    return c; }
  void main(){
    vec3 c = lire(vUv);
    if (flouRadial > 0.001) {                           // zoom-blur vers le centre (coups, explosions)
      vec3 acc = c; float w = 1.0;
      for (int i = 1; i < 10; i++) { float k = float(i) / 9.0; vec2 uv = mix(vUv, vec2(0.5), k * flouRadial * 0.12); acc += lire(uv) * (1.0 - k * 0.6); w += 1.0 - k * 0.6; }
      c = acc / w; }
    vec3 b = texture2D(bloom1, vUv).rgb * 0.6 + texture2D(bloom2, vUv).rgb * 0.9;
    c += b * bloom;
    c *= teinte;
    c = aces(c * exposition);
    vec2 d = vUv - 0.5; d.x *= taille.x / taille.y;
    c *= mix(1.0, smoothstep(1.05, 0.25, length(d)), vignette);
    c = versSRGB(c);
    float g = h(vUv * taille + vec2(image * 17.0, image * 31.0)) - 0.5;
    c += g * grain * (0.6 + 0.4 * (1.0 - dot(c, vec3(0.333))));
    c *= 1.0 - balayage * step(0.5, fract(vUv.y * taille.y * 0.5));
    c = mix(c, vec3(1.0), clamp(flash, 0.0, 1.0));
    c = mix(c, vec3(0.0), clamp(noir, 0.0, 1.0));
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`;

export function creerPost(renderer, L, H) {
  const THREE = T(), gl = renderer.getContext();
  // cible flottante si la carte (ou SwiftShader) sait y dessiner, sinon 8 bits (le bloom se fait alors sur l'image déjà saturée)
  const flottant = renderer.capabilities.isWebGL2 ? !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float') : !!gl.getExtension('OES_texture_half_float') && !!gl.getExtension('EXT_color_buffer_half_float');
  const type = flottant ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const cible = (l, h, msaa = false) => {
    const o = { type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: msaa, stencilBuffer: false };
    if (msaa && renderer.capabilities.isWebGL2) { const rt = new THREE.WebGLMultisampleRenderTarget(l, h, o); rt.samples = 4; return rt; }
    return new THREE.WebGLRenderTarget(l, h, o);
  };
  const rtScene = cible(L, H, true); rtScene.depthBuffer = true;
  const l2 = Math.max(1, L >> 1), h2 = Math.max(1, H >> 1), l4 = Math.max(1, L >> 2), h4 = Math.max(1, H >> 2);
  const rtA2 = cible(l2, h2), rtB2 = cible(l2, h2), rtA4 = cible(l4, h4), rtB4 = cible(l4, h4);

  const camQ = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sceneQ = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); quad.frustumCulled = false; sceneQ.add(quad);
  const mat = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const mSeuil = mat(FS_SEUIL, { src: { value: null }, seuil: { value: 1.0 } });
  const mFlou = mat(FS_FLOU, { src: { value: null }, dir: { value: new THREE.Vector2() } });
  const mCompo = mat(FS_COMPO, {
    scene: { value: rtScene.texture }, bloom1: { value: rtA2.texture }, bloom2: { value: rtA4.texture },
    exposition: { value: 1 }, bloom: { value: 0.8 }, aberration: { value: 0 }, flouRadial: { value: 0 }, vignette: { value: 0.4 }, grain: { value: 0.018 }, balayage: { value: 0.005 },
    noir: { value: 0 }, flash: { value: 0 }, image: { value: 0 }, teinte: { value: new THREE.Vector3(1, 1, 1) }, taille: { value: new THREE.Vector2(L, H) },
  });
  const passe = (m, cibleRT) => { quad.material = m; renderer.setRenderTarget(cibleRT); renderer.render(sceneQ, camQ); };
  const flou = (src, tmp, dst, l, h, r) => {
    mFlou.uniforms.src.value = src.texture; mFlou.uniforms.dir.value.set(r / l, 0); passe(mFlou, tmp);
    mFlou.uniforms.src.value = tmp.texture; mFlou.uniforms.dir.value.set(0, r / h); passe(mFlou, dst);
  };

  // la scène est rendue en lumière linéaire, sans tone mapping : c'est le shader de composition qui le fait
  renderer.toneMapping = THREE.NoToneMapping;

  function rendre(scene, camera, r = {}) {
    const u = mCompo.uniforms, ancienAuto = renderer.autoClear;
    renderer.autoClear = true;
    renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene, camera);
    mSeuil.uniforms.src.value = rtScene.texture; mSeuil.uniforms.seuil.value = r.seuil ?? (flottant ? 1.0 : 0.82);
    passe(mSeuil, rtA2);
    flou(rtA2, rtB2, rtA2, l2, h2, 1.0);
    mFlou.uniforms.src.value = rtA2.texture; mFlou.uniforms.dir.value.set(0, 0); passe(mFlou, rtA4);   // réduction ½ → ¼
    flou(rtA4, rtB4, rtA4, l4, h4, 1.6); flou(rtA4, rtB4, rtA4, l4, h4, 2.6);
    u.exposition.value = r.exposition ?? 1; u.bloom.value = r.bloom ?? 0.8; u.aberration.value = r.aberration ?? 0; u.flouRadial.value = r.flouRadial ?? 0; u.balayage.value = r.balayage ?? 0.005;
    u.vignette.value = r.vignette ?? 0.4; u.grain.value = r.grain ?? 0.018; u.noir.value = r.noir ?? 0; u.flash.value = r.flash ?? 0; u.image.value = (r.image ?? 0) % 1000;
    const te = r.teinte || [1, 1, 1]; u.teinte.value.set(te[0], te[1], te[2]);
    passe(mCompo, null);
    renderer.autoClear = ancienAuto;
  }
  return {
    rendre, flottant,
    liberer() { for (const o of [rtScene, rtA2, rtB2, rtA4, rtB4, mSeuil, mFlou, mCompo, quad.geometry]) o.dispose(); },
  };
}
