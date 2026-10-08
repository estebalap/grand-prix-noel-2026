/* ARCHÉTYPES — l'univers visuel et sonore de chaque bolide pour le TRAILER D'INVOCATION (reveal_fret.js, mode « trailer »).

   Six univers (champ « archetype » de cars.json, écrit par outils/plume_corrosive.py) :
     manga        cel-shading (matériaux toon), encrage par détection de contours, trame, speed-lines, onomatopées katakana
     gothique     comics noir : bichromie noir / jaune profond, encrage, pluie battante, éclairs, grain de pellicule
     post_apo     sépia brûlé, poussière, mirage de chaleur, braises, pochoir et tampon « RECHERCHÉ »
     pop          saturation acidulée, lueur glossy, cœurs néon et paillettes, typo bulle rose chrome
     vintage      noir et blanc scintillant, format 4:3 à bandes, rayures et poussières de pellicule, intertitres de film muet
     blockbuster  teal & orange, bandes cinémascope 2,39, traînées anamorphiques, titre or « prochainement »

   Ce module fournit :
     ARCHETYPES, archetypeDe(car)                       définitions et attribution (repli sur le thème du bolide)
     creerPost(THREE, renderer, cle)                    passe de post-traitement (un seul quad plein écran, 60 i/s)
     celShading(THREE, racine)                          matériaux toon sur le modèle 3D (univers manga)
     creerSurcouche(canvas, {...})                      speed-lines, onomatopées, particules 2D et carton du freeze-frame
     themeSonore(cle, sortie, {...})                    bande-son procédurale originale (aucun extrait protégé), annulable
   Tout est dessiné par le code : aucune image, aucun logo, aucun personnage reconnaissable. */
import { themeDe } from './reveal.js';
import { outilsSon } from './signatures.js';

export const ARCHETYPES = {
  manga: { nom: 'Manga / anime', mode: 1, fond: 0x0d0526, brouillard: 0x1c0a40, lumiere: 0x8ff3ff, teinte: '#22d3ee', teinte2: '#ff2bd6', encre: '#0b0420',
    bandeau: 'NOUVEAU CHALLENGER !', accroche: '', musique: 'eurobeat', titre: '900 {s} "Arial Black", "Segoe UI Black", Impact, sans-serif' },
  gothique: { nom: 'Comics noir', mode: 2, fond: 0x040404, brouillard: 0x0b0b0e, lumiere: 0xfff1b0, teinte: '#ffd400', teinte2: '#f4f1e6', encre: '#000000',
    bandeau: 'PENDANT CE TEMPS, DANS LA VILLE…', accroche: 'ALERTE ROUGE SUR LA GRILLE', musique: 'cuivres', titre: '900 {s} Impact, "Arial Black", "Bahnschrift", sans-serif' },
  post_apo: { nom: 'Post-apo', mode: 3, fond: 0x1c1006, brouillard: 0x4a2c12, lumiere: 0xffb46a, teinte: '#ff7a1a', teinte2: '#f3d9a4', encre: '#1a0f06',
    bandeau: 'RECHERCHÉ', accroche: 'JOUR 1 024 APRÈS LA FIN DU CARBURANT', musique: 'riff', titre: '900 {s} Impact, "Arial Black", "Bahnschrift", sans-serif' },
  pop: { nom: 'Pop glamour', mode: 4, fond: 0x2a0624, brouillard: 0x5a0d46, lumiere: 0xffb3e0, teinte: '#ff3fa4', teinte2: '#fff0f8', encre: '#4a0636',
    bandeau: 'NOUVELLE COLLECTION', accroche: 'ÉDITION LIMITÉE · PAILLETTES INCLUSES', musique: 'bubblegum', titre: '700 {s} "Fredoka GP", "Arial Rounded MT Bold", "Segoe UI", sans-serif' },
  vintage: { nom: 'Relique vintage', mode: 5, fond: 0x0c0b09, brouillard: 0x1d1a15, lumiere: 0xfff4dc, teinte: '#efe4c8', teinte2: '#ffffff', encre: '#0c0b09',
    bandeau: 'ET SOUDAIN…', accroche: 'UNE PRODUCTION DE LA GRILLE', musique: 'western', titre: '700 {s} "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif' },
  blockbuster: { nom: 'Blockbuster', mode: 6, fond: 0x020611, brouillard: 0x071428, lumiere: 0xffe2b0, teinte: '#ffcf6a', teinte2: '#8fdcff', encre: '#020611',
    bandeau: 'PROCHAINEMENT SUR LA PISTE', accroche: 'CE NOËL, UN SEUL BOLIDE…', musique: 'braaam', titre: '300 {s} "Bahnschrift", "Segoe UI Light", "Helvetica Neue", Arial, sans-serif' },
};
export const CLES_ARCHETYPES = Object.keys(ARCHETYPES);
const PAR_STYLE = { manga: 'manga', jeu_video: 'manga', film_noir: 'gothique', comics: 'gothique', retro80: 'vintage', reel: 'blockbuster', cartoon: 'pop' };

/** Archétype d'un bolide : champ de cars.json, sinon déduit de son thème visuel (data/themes_bolides.json). */
export function archetypeDe(car) {
  const a = car && car.archetype;
  if (a && ARCHETYPES[a]) return a;
  let st = 'reel';
  try { st = themeDe(car).style; } catch (e) { /* thèmes non chargés */ }
  return PAR_STYLE[st] || 'blockbuster';
}

/* ================================================================== post-traitement (GLSL) */
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
precision highp float;
uniform sampler2D tScene;
uniform vec2 res;
uniform float temps, tScene_t, mode, da, dechirure, tension, pouls, flash, zoom, eclair, chaleur, sig, sigForce;
uniform vec3 sigTeinte, fuite;
uniform float fuiteForce;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bruit(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 sat(vec3 c, float s){ return mix(vec3(lum(c)), c, s); }
float L(vec2 uv){ return lum(texture2D(tScene, uv).rgb); }
float encre(vec2 uv){
  vec2 px = 1.3 / res;
  float a = L(uv + px * vec2(-1.0, 1.0)), b = L(uv + px * vec2(0.0, 1.0)), c = L(uv + px * vec2(1.0, 1.0));
  float d = L(uv + px * vec2(-1.0, 0.0)), f = L(uv + px * vec2(1.0, 0.0));
  float g = L(uv + px * vec2(-1.0, -1.0)), h = L(uv + px * vec2(0.0, -1.0)), i = L(uv + px * vec2(1.0, -1.0));
  float gx = -a - 2.0 * d - g + c + 2.0 * f + i, gy = -a - 2.0 * b - c + g + 2.0 * h + i;
  return smoothstep(0.16, 0.4, length(vec2(gx, gy)));
}
float trame(float l, float taille, float angle){
  float s = sin(angle), co = cos(angle);
  vec2 p = mat2(co, -s, s, co) * gl_FragCoord.xy / taille;
  return step(length(fract(p) - 0.5), sqrt(max(0.0, 1.0 - l)) * 0.55);
}
vec3 grade(vec2 uv, vec3 c){
  int m = int(mode + 0.5);
  float l = lum(c);
  if (m == 1) {                                   // manga : aplats, trame magenta dans les ombres, encrage
    float lq = (floor(l * 4.0) + smoothstep(0.4, 0.6, fract(l * 4.0))) / 4.0;   // aplats de luminance, teinte conservée
    vec3 q = clamp(sat(c, 1.5) * (lq + 0.04) / (l + 0.04), 0.0, 1.0);
    q = mix(q, vec3(0.55, 0.06, 0.6), trame(l, 5.0, 0.785) * step(l, 0.3) * 0.55);
    return mix(q, vec3(0.03, 0.0, 0.08), encre(uv));
  }
  if (m == 2) {                                   // comics noir : bichromie noir / jaune, encre, pluie, éclairs
    float k = smoothstep(0.06, 0.62, l * 1.2);
    vec3 duo = mix(vec3(0.0), vec3(1.0, 0.8, 0.0), k);
    duo = mix(duo, vec3(1.0, 0.97, 0.86), smoothstep(0.8, 0.98, l));
    duo *= 1.0 - trame(l, 4.0, 0.4) * step(l, 0.22) * 0.5;
    duo = mix(duo, vec3(0.0), encre(uv) * 0.9);
    vec2 pr = vec2(uv.x * res.x / res.y + uv.y * 0.22, uv.y);
    float col = floor(pr.x * 150.0);
    float g = step(0.9, h21(vec2(col, floor((pr.y + tScene_t * (2.4 + h21(vec2(col, 3.0)) * 1.4)) * 7.0 + h21(vec2(col, 7.0)) * 9.0))));
    float fx = fract(pr.x * 150.0);
    g *= smoothstep(0.38, 0.5, fx) * smoothstep(0.62, 0.5, fx);
    duo += vec3(0.78, 0.84, 0.95) * g * 0.5;
    return mix(duo, vec3(1.0, 0.98, 0.9), eclair * 0.4);
  }
  if (m == 3) {                                   // post-apo : sépia brûlé, poussière qui dérive
    vec3 s = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
    s = mix(s, c, 0.22) * vec3(1.1, 0.94, 0.74);
    s = (s - 0.5) * 1.2 + 0.5;
    s += (bruit(uv * vec2(5.0, 2.5) + vec2(tScene_t * 0.5, 0.0)) - 0.5) * 0.14 * vec3(1.0, 0.72, 0.4);
    return s;
  }
  if (m == 4) {                                   // pop : saturation, ombres fuchsia, lueur glossy
    vec3 p = sat(c, 1.6) * 1.08;
    p = mix(p, vec3(1.0, 0.24, 0.64), (1.0 - smoothstep(0.0, 0.45, l)) * 0.45);
    vec2 px = 7.0 / res; vec3 b = vec3(0.0);
    b += texture2D(tScene, uv + px * vec2(1.0, 1.0)).rgb; b += texture2D(tScene, uv + px * vec2(-1.0, 1.0)).rgb;
    b += texture2D(tScene, uv + px * vec2(1.0, -1.0)).rgb; b += texture2D(tScene, uv + px * vec2(-1.0, -1.0)).rgb;
    b = max(b * 0.25 - 0.62, 0.0);
    return p + b * vec3(1.3, 0.75, 1.1) * 1.1;
  }
  if (m == 5) {                                   // vintage : N&B scintillant, rayures, poussières
    float g = (l - 0.5) * 1.4 + 0.5;
    vec3 v = vec3(g) * vec3(1.0, 0.95, 0.84) * (0.9 + 0.1 * h21(vec2(floor(temps * 18.0), 1.0)));
    float xr = h21(vec2(floor(temps * 9.0), 2.0));
    v *= 1.0 - 0.6 * smoothstep(0.0016, 0.0, abs(uv.x - xr)) * step(0.35, h21(vec2(floor(temps * 9.0), 5.0)));
    float xr2 = h21(vec2(floor(temps * 5.0), 8.0));
    v += 0.35 * smoothstep(0.001, 0.0, abs(uv.x - xr2)) * step(0.6, h21(vec2(floor(temps * 5.0), 9.0)));
    float tache = step(0.9988, h21(floor(uv * res / 3.0) + floor(temps * 12.0)));
    return mix(v, vec3(0.04), tache);
  }
  if (m == 6) {                                   // blockbuster : teal & orange, traînées anamorphiques
    vec3 b = mix(vec3(0.0, 0.13, 0.17), vec3(1.0, 0.62, 0.28), smoothstep(0.05, 0.85, l));
    vec3 o = mix(c, b * 1.2 * (0.35 + l), 0.42);
    o = (o - 0.5) * 1.12 + 0.5;
    vec3 tr = vec3(0.0);
    for (int i = 1; i <= 6; i++) {
      float dx = float(i) * 0.013;
      tr += max(texture2D(tScene, uv + vec2(dx, 0.0)).rgb - 0.78, 0.0) + max(texture2D(tScene, uv - vec2(dx, 0.0)).rgb - 0.78, 0.0);
    }
    return o + tr * vec3(0.45, 0.72, 1.0) * 0.4;
  }
  return c;
}
// filtre exclusif du bolide, enclenché au franchissement du seuil (signatures.js : FILTRES_SIGNATURE)
vec3 signature(vec2 uv, vec3 c){
  int s = int(sig + 0.5);
  float l = lum(c);
  if (s == 1) {                                   // VHS
    vec3 b = vec3(texture2D(tScene, uv + vec2(0.004, 0.0)).r, c.g, texture2D(tScene, uv - vec2(0.004, 0.0)).b);
    float trk = smoothstep(0.03, 0.0, abs(fract(uv.y * 0.5 - temps * 0.15) - 0.5));
    b += trk * 0.3 * (h21(vec2(floor(gl_FragCoord.y), floor(temps * 30.0))) - 0.3);
    return b * (0.86 + 0.14 * sin(gl_FragCoord.y * 1.6));
  }
  if (s == 2) {                                   // caméra thermique
    float k = clamp(l * 3.0, 0.0, 3.0);
    vec3 a = vec3(0.04, 0.0, 0.3), b = vec3(0.62, 0.0, 0.72), cc = vec3(1.0, 0.25, 0.08), d = vec3(1.0, 0.96, 0.35);
    return k < 1.0 ? mix(a, b, k) : (k < 2.0 ? mix(b, cc, k - 1.0) : mix(cc, d, k - 2.0));
  }
  if (s == 3) return vec3(0.12, 1.0, 0.32) * (l * 1.45 + (h21(gl_FragCoord.xy + floor(temps * 40.0)) - 0.5) * 0.16) * (0.9 + 0.1 * sin(gl_FragCoord.y * 1.4));
  if (s == 4) {                                   // glitch
    float bande = floor(uv.y * 26.0), f = floor(temps * 12.0);
    float g = step(0.86, h21(vec2(bande, f)));
    vec2 u2 = uv + vec2((h21(vec2(bande, f + 3.0)) - 0.5) * 0.09 * g, 0.0);
    return vec3(texture2D(tScene, u2 + vec2(0.007 * g, 0.0)).r, texture2D(tScene, u2).g, texture2D(tScene, u2 - vec2(0.007 * g, 0.0)).b);
  }
  if (s == 5) return c * vec3(0.55, 1.15, 0.5) + vec3(0.12, 0.5, 0.05) * (0.6 + 0.4 * sin(temps * 6.0)) * smoothstep(0.35, 0.9, l);
  if (s == 6) { float f = step(0.0, sin(temps * 7.0)) * step(0.82, fract(temps * 1.1)); return mix(c, 1.0 - c, f); }
  if (s == 7) { vec2 px = vec2(7.0) / res; vec3 p = texture2D(tScene, (floor(uv / px) + 0.5) * px).rgb; return floor(p * 5.0 + 0.5) / 5.0; }
  if (s == 8) return mix(c, mix(vec3(0.25, 0.14, 0.02), vec3(1.0, 0.83, 0.36), l) * 1.15, 0.78);
  if (s == 9) {                                   // halo de rêve irisé
    vec2 px = 9.0 / res;
    vec3 b = (texture2D(tScene, uv + px).rgb + texture2D(tScene, uv - px).rgb + texture2D(tScene, uv + vec2(px.x, -px.y)).rgb + texture2D(tScene, uv + vec2(-px.x, px.y)).rgb) * 0.25;
    return mix(c, b, 0.5) + (0.5 + 0.5 * cos(6.2831 * (uv.x + uv.y * 0.5 + temps * 0.1 + vec3(0.0, 0.33, 0.67)))) * 0.13;
  }
  if (s == 10) return mix(vec3(0.03, 0.0, 0.0), vec3(1.0, 0.1, 0.18), smoothstep(0.08, 0.75, l)) + vec3(smoothstep(0.86, 1.0, l));
  if (s == 11) return texture2D(tScene, uv + vec2(sin(uv.y * 25.0 + temps * 4.0), cos(uv.x * 20.0 + temps * 3.0)) * 0.006).rgb;
  if (s == 12) { float n = h21(gl_FragCoord.xy * 0.5 + floor(temps * 30.0)); float b = step(0.9, fract(uv.y * 3.0 - temps * 0.7)); return mix(c, vec3(n), 0.2 + 0.3 * b); }
  if (s == 13) return mix(c, sigTeinte * (0.3 + l * 1.2), 0.45);
  if (s == 14) { float d = length((uv - vec2(0.62, 0.5)) * vec2(res.x / res.y, 1.0)); return c * (1.3 * smoothstep(0.95, 0.15, d)) + sigTeinte * smoothstep(0.35, 0.0, d) * 0.25; }
  return c;
}
void main(){
  int m = int(mode + 0.5);
  vec2 uv = (vUv - 0.5) / zoom + 0.5;
  uv.x += sin(uv.y * 70.0 + tScene_t * 9.0) * 0.0013 * chaleur;
  float ab = tension * 0.006 * (0.4 + pouls);
  vec3 brut = vec3(texture2D(tScene, uv + vec2(ab, 0.0)).r, texture2D(tScene, uv).g, texture2D(tScene, uv - vec2(ab, 0.0)).b);
  // déchirure du décor : fente diagonale dentelée qui s'ouvre et révèle l'univers du bolide
  vec2 dv = vUv - 0.5; dv.x *= res.x / res.y;
  vec2 n = normalize(vec2(1.0, -0.42));
  float axe = dot(dv, n) + (bruit(vUv * vec2(9.0, 34.0)) - 0.5) * 0.06 + (bruit(vUv * vec2(2.0, 8.0)) - 0.5) * 0.07;
  float ouv = dechirure * dechirure * 1.7;
  float dedans = dechirure >= 0.999 ? 1.0 : step(abs(axe), ouv);
  vec3 col;
  if (dedans > 0.5) col = mix(brut, grade(uv, brut), da);
  else col = texture2D(tScene, uv + n * sign(axe) * ouv * 0.18 * vec2(res.y / res.x, 1.0)).rgb * (1.0 - 0.35 * dechirure);
  float bord = smoothstep(0.028, 0.0, abs(abs(axe) - ouv)) * step(0.001, dechirure) * step(dechirure, 0.998);
  col += vec3(1.0, 0.86, 0.62) * bord * 1.6;
  if (sigForce > 0.001) col = mix(col, signature(uv, col), sigForce);
  // lueur de suspense (couleur de la rareté) qui baigne l'écran à chaque palier
  col += fuite * fuiteForce * (0.35 + 0.65 * smoothstep(0.9, 0.2, length(dv)));
  // vignette (pulsée pendant l'amorce) et grain
  float vig = smoothstep(1.0, 0.32, length(dv * vec2(0.92, 1.12)));
  col *= mix(1.0, vig, 0.3 * da + tension * (0.45 + 0.45 * pouls));
  float gr = h21(gl_FragCoord.xy + fract(temps * 61.0) * 113.0) - 0.5;
  col += gr * ((m == 2 || m == 3 || m == 5) ? 0.13 : 0.035) * max(da, tension);
  // formats : 4:3 à bandes (vintage), cinémascope 2,39 (blockbuster)
  float ar = res.x / res.y;
  if (m == 5) { float k = mix(0.5, 0.5 * (4.0 / 3.0) / ar, da); if (abs(vUv.x - 0.5) > k) col = vec3(0.0); }
  if (m == 6) { float k = mix(0.5, 0.5 * ar / 2.39, da); if (abs(vUv.y - 0.5) > k) col = vec3(0.0); }
  gl_FragColor = vec4(mix(col, vec3(1.0), flash), 1.0);
}`;

/** Passe de post-traitement : la scène est rendue dans une cible (MSAA en WebGL2), puis un seul quad plein écran applique
    la DA. Pendant le freeze-frame, seule la passe tourne (la scène n'est plus rendue) : coût quasi nul. */
export function creerPost(THREE, renderer, cle) {
  const A = ARCHETYPES[cle] || { ...ARCHETYPES.blockbuster, mode: 0 };          // cle inconnue (reveal Fret) : pas de DA, filtres seuls
  const taillePx = () => { const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v); return v; };
  const s0 = taillePx();
  const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
  let cible;
  if (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) { cible = new THREE.WebGLMultisampleRenderTarget(s0.x, s0.y, opts); cible.samples = 4; }
  else cible = new THREE.WebGLRenderTarget(s0.x, s0.y, opts);
  cible.texture.encoding = THREE.sRGBEncoding;      // la scène écrit déjà en sRGB : la passe recopie sans conversion
  const u = {
    tScene: { value: cible.texture }, res: { value: new THREE.Vector2(s0.x, s0.y) }, temps: { value: 0 }, tScene_t: { value: 0 },
    mode: { value: A.mode }, da: { value: 0 }, dechirure: { value: 0 }, tension: { value: 0 }, pouls: { value: 0 },
    flash: { value: 0 }, zoom: { value: 1 }, eclair: { value: 0 }, chaleur: { value: 0 },
    sig: { value: 0 }, sigForce: { value: 0 }, sigTeinte: { value: new THREE.Color(A.teinte) }, fuite: { value: new THREE.Color(0, 0, 0) }, fuiteForce: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const sceneQuad = new THREE.Scene(); sceneQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    u,
    taille() { const s = taillePx(); cible.setSize(s.x, s.y); u.res.value.set(s.x, s.y); },
    scene(scene, camera) { renderer.setRenderTarget(cible); renderer.render(scene, camera); renderer.setRenderTarget(null); },
    passe() { renderer.render(sceneQuad, camQuad); },
    dispose() { cible.dispose(); mat.dispose(); quad.geometry.dispose(); },
  };
}

/* ================================================================== cel-shading du modèle 3D (univers manga) */
export function celShading(THREE, racine) {
  const d = new Uint8Array([70, 70, 70, 165, 165, 165, 255, 255, 255]);
  const grad = new THREE.DataTexture(d, 3, 1, THREE.RGBFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
  const origines = [], crees = [];
  racine.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m = o.material;
    if (!(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) return;          // feux (MeshBasic) : intacts
    const t = new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, vertexColors: !!m.vertexColors,
      transparent: m.transparent, opacity: m.opacity, gradientMap: grad, emissive: m.emissive ? m.emissive.clone() : 0x000000, side: m.side });
    origines.push([o, m, t]); crees.push(t);
  });
  return {
    appliquer() { for (const [o, , t] of origines) o.material = t; },
    annuler() { for (const [o, m] of origines) o.material = m; },
    dispose() { crees.forEach((m) => m.dispose()); grad.dispose(); },
  };
}

/* ================================================================== surcouche 2D : speed-lines, onomatopées, carton */
const rnd = (a, b) => a + Math.random() * (b - a);
const STATS_MINI = [['vitesse', 'VIT'], ['aerodynamisme', 'AÉRO'], ['resistance_banane', 'BANANE'], ['facteur_chaos', 'CHAOS'], ['intimidation', 'INTIM']];

/** Les polices du carton (Fredoka GP du thème « Nintendo » pour l'univers pop) : chargées avant le premier dessin. */
export async function prechargerPolices() {
  if (!document.fonts || !document.fonts.load) return;
  const tache = Promise.all(['700 40px "Fredoka GP"', '900 40px "Arial Black"', '900 40px Impact'].map((f) => document.fonts.load(f).catch(() => null)));
  await Promise.race([tache, new Promise((r) => setTimeout(r, 400))]);
}

export function creerSurcouche(cv, { car, cle, rarete, cote, express = false }) {
  const A = ARCHETYPES[cle] || ARCHETYPES.blockbuster;
  const g = cv.getContext('2d');
  let W = 0, H = 0, s = 1;
  const nom = String(car.alias || car.code).toUpperCase();
  const st = String(car.sous_titre || car.ecurie || '');
  const cit = String(car.citation || '');
  const lore = String(car.lore || '');
  const ono = String(car.onomatopee || (cle === 'manga' ? 'ドドドド' : 'VROOOM !'));
  const parts = [];                 // particules 2D (poussière, braises, cœurs, paillettes)
  let lignes = [], derniereLigne = -1, focusFige = null;

  const police = (taille) => A.titre.replace('{s}', Math.round(taille) + 'px');
  const ajuster = (txt, f, max, taille) => { let t = taille; g.font = f(t); while (g.measureText(txt).width > max && t > 10) { t *= 0.92; g.font = f(t); } return t; };
  const lignesDe = (txt, max) => {
    const mots = txt.split(' '), out = []; let l = '';
    for (const m of mots) { const e = l ? l + ' ' + m : m; if (g.measureText(e).width > max && l) { out.push(l); l = m; } else l = e; }
    if (l) out.push(l); return out;
  };
  const para = (txt, x, y, max, lh, n, align = 'left') => {
    g.textAlign = align; const ls = lignesDe(txt, max).slice(0, n);
    ls.forEach((l, i) => g.fillText(l, x, y + i * lh)); g.textAlign = 'left'; return ls.length;
  };
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const rebond = (k) => { k = Math.max(0, Math.min(1, k)); return k < 1 ? 1 + 1.6 * Math.pow(1 - k, 2) * Math.cos(k * 9) * (1 - k) : 1; };
  const tape = (k, txt) => txt.slice(0, Math.floor(Math.max(0, Math.min(1, k)) * txt.length));

  function taille(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = Math.min(2560, Math.round(w * dpr)); H = Math.round(W * h / w);
    cv.width = W; cv.height = H; s = H / 1080;
  }

  /* ---------- éléments par univers */
  function speedLines(fx, fy, force, couleur = '#ffffff', intensite = 1) {
    const f = Math.floor(performance.now() / 50);
    if (f !== derniereLigne) {           // nouveau tirage toutes les 50 ms : le « tremblement » du manga
      derniereLigne = f;
      lignes = Array.from({ length: 120 }, () => ({ a: Math.random() * Math.PI * 2, r: rnd(0.32, 0.55), l: rnd(0.6, 1.4), w: rnd(0.002, 0.012) }));
    }
    const R = Math.hypot(W, H);
    g.save(); g.globalAlpha = 0.55 * intensite; g.fillStyle = couleur;
    for (const L of lignes) {
      const r0 = R * L.r * (1.25 - 0.45 * force), r1 = r0 + R * L.l;
      const c = Math.cos(L.a), sn = Math.sin(L.a), da = L.w;
      g.beginPath();
      g.moveTo(fx + c * r0, fy + sn * r0);
      g.lineTo(fx + Math.cos(L.a - da) * r1, fy + Math.sin(L.a - da) * r1);
      g.lineTo(fx + Math.cos(L.a + da) * r1, fy + Math.sin(L.a + da) * r1);
      g.closePath(); g.fill();
    }
    g.restore();
  }
  function katakanaGeant(txt, x, y, taille, k) {
    const ch = [...txt];
    g.save(); g.translate(x, y); g.rotate(-0.08);
    const z = rebond(k); g.scale(z, z);
    g.font = `900 ${taille}px "Yu Gothic UI","Yu Gothic","Meiryo","Hiragino Sans","Noto Sans JP",sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    ch.forEach((c, i) => {
      const yy = i * taille * 0.92, jx = Math.sin(performance.now() / 70 + i) * 3 * s;
      g.lineWidth = taille * 0.2; g.strokeStyle = A.encre; g.strokeText(c, jx, yy);
      g.fillStyle = i % 2 ? A.teinte : '#ffffff'; g.fillText(c, jx, yy);
      g.lineWidth = taille * 0.05; g.strokeStyle = A.teinte2; g.strokeText(c, jx, yy);
    });
    g.restore();
  }
  function eclatement(x, y, rayon, fond, bord, txt, couleurTxt, rot, k) {
    g.save(); g.translate(x, y); g.rotate(rot); const z = rebond(k); g.scale(z, z);
    g.beginPath();
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r = rayon * (i % 2 ? 0.66 : 1) * (1 + 0.08 * Math.sin(i * 7.3)); g.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r); }
    g.closePath(); g.fillStyle = fond; g.fill(); g.lineWidth = 7 * s; g.strokeStyle = bord; g.stroke();
    const t = ajuster(txt, (n) => `900 ${n}px Impact, "Arial Black", sans-serif`, rayon * 2.1, rayon * 0.62);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = t * 0.16; g.strokeStyle = bord; g.strokeText(txt, 0, 0);
    g.fillStyle = couleurTxt; g.fillText(txt, 0, 0);
    g.restore();
  }
  function cartouche(x, y, w, txt, fond, encre, taillePx, italique = false) {
    g.font = `${italique ? 'italic ' : ''}800 ${taillePx}px "Bahnschrift","Arial Narrow",Arial,sans-serif`;
    const ls = lignesDe(txt, w - 28 * s), h = ls.length * taillePx * 1.18 + 22 * s;
    g.fillStyle = fond; g.fillRect(x, y, w, h); g.lineWidth = 5 * s; g.strokeStyle = encre; g.strokeRect(x, y, w, h);
    g.fillStyle = encre; g.textBaseline = 'top'; ls.forEach((l, i) => g.fillText(l, x + 14 * s, y + 12 * s + i * taillePx * 1.18)); g.textBaseline = 'alphabetic';
    return h;
  }
  function boite(x, y, w, h, fond, bord, rayon = 0) {
    g.beginPath(); if (rayon && g.roundRect) g.roundRect(x, y, w, h, rayon); else g.rect(x, y, w, h);
    g.fillStyle = fond; g.fill(); if (bord) { g.lineWidth = 4 * s; g.strokeStyle = bord; g.stroke(); }
  }
  /** Lore dans un encart : apparaît après la réplique (k ≥ 0,45), lisible pendant toute l'attente. */
  function encartLore(k, x, y, w, police2, couleur, fond, bord, rayon = 0) {
    const a = ease((k - 0.45) * 3); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.font = police2;
    const lh = parseFloat(police2.match(/(\d+(?:\.\d+)?)px/)[1]) * 1.25;
    const ls = lignesDe(lore, w - 32 * s).slice(0, 5);
    boite(x, y, w, ls.length * lh + 26 * s, fond, bord, rayon);
    g.fillStyle = couleur; g.textBaseline = 'top'; ls.forEach((l, i) => g.fillText(l, x + 16 * s, y + 14 * s + i * lh)); g.textBaseline = 'alphabetic';
    g.restore();
  }
  function coeur(x, y, r) {
    g.beginPath(); g.moveTo(x, y + r * 0.35);
    g.bezierCurveTo(x, y, x - r, y, x - r, y + r * 0.35); g.bezierCurveTo(x - r, y + r * 0.8, x, y + r * 1.05, x, y + r * 1.35);
    g.bezierCurveTo(x, y + r * 1.05, x + r, y + r * 0.8, x + r, y + r * 0.35); g.bezierCurveTo(x + r, y, x, y, x, y + r * 0.35); g.fill();
  }
  function etoile4(x, y, r) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  }
  function particules2D(dt, type, xMax = 0) {
    const n = { post_apo: 2, pop: 2 }[type] || 0;
    for (let i = 0; i < n; i++) {
      if (type === 'post_apo') parts.push({ x: rnd(0, xMax || W), y: H + 10, vx: rnd(-20, 60) * s, vy: rnd(-120, -40) * s, r: rnd(1.5, 4.5) * s, vie: rnd(1.5, 3), age: 0, c: Math.random() < 0.6 ? '#ffb347' : '#e8d4a8', braise: Math.random() < 0.6 });
      else parts.push({ x: rnd(0, xMax || W), y: H + 20, vx: rnd(-30, 30) * s, vy: rnd(-180, -90) * s, r: rnd(8, 22) * s, vie: rnd(1.8, 3), age: 0, c: Math.random() < 0.5 ? '#ff3fa4' : '#ffd1ec', coeur: Math.random() < 0.55 });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt; if (p.age > p.vie) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt + Math.sin(p.age * 3 + i) * 0.6 * s; p.y += p.vy * dt;
      const a = Math.min(1, p.age * 3) * (1 - p.age / p.vie);
      g.globalAlpha = a; g.fillStyle = p.c;
      if (p.coeur) coeur(p.x, p.y, p.r);
      else if (type === 'pop') etoile4(p.x, p.y, p.r * (0.6 + 0.4 * Math.sin(p.age * 12)));
      else { g.beginPath(); g.arc(p.x, p.y, p.r * (p.braise ? 1 : 1.6), 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
  }
  function stats(x, y, w, couleur, fond, texte) {
    const lh = 30 * s, bw = w - 130 * s;
    g.font = `800 ${Math.round(17 * s)}px "Bahnschrift","Arial Narrow",Arial,sans-serif`; g.textBaseline = 'middle';
    STATS_MINI.forEach(([k, l], i) => {
      const yy = y + i * lh, v = Math.max(3, Math.min(100, Number(car[k]) || 0));
      g.fillStyle = texte; g.fillText(l, x, yy);
      g.fillStyle = fond; g.fillRect(x + 82 * s, yy - 7 * s, bw, 14 * s);
      g.fillStyle = couleur; g.fillRect(x + 82 * s, yy - 7 * s, bw * v / 100, 14 * s);
      g.fillStyle = texte; g.textAlign = 'right'; g.fillText(String(car[k] ?? '–'), x + w, yy); g.textAlign = 'left';
    });
    g.textBaseline = 'alphabetic';
    return STATS_MINI.length * lh;
  }
  function badge(x, y) {
    const txt = `${'◆'.repeat(rarete.rang + 1)} ${rarete.court}${cote ? `  ·  COTE ×${String(cote).replace('.', ',')}` : ''}`;
    g.font = `900 ${Math.round(22 * s)}px "Bahnschrift","Arial Black",Arial,sans-serif`;
    const w = g.measureText(txt).width + 30 * s;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y - 26 * s, w, 38 * s);
    g.fillStyle = rarete.couleur; g.fillRect(x, y - 26 * s, 6 * s, 38 * s);
    g.fillStyle = '#fff'; g.shadowColor = rarete.lueur; g.shadowBlur = 14 * s; g.fillText(txt, x + 16 * s, y); g.shadowBlur = 0;
  }

  /* ---------- cartons du freeze-frame : le BOLIDE est la star (cadré entier à droite, rien ne passe devant) ;
     tout le texte tient dans une colonne à gauche (≈ 34 % de la largeur), habillée dans le style de l'univers. */
  const COL_X = () => W * 0.03, COL_W = () => W * 0.335;
  /** Nom de scène : la plus grande taille qui tient sur 2 lignes dans la colonne. */
  function nomAjuste(fontDe, max, w) {
    let t = max; g.font = fontDe(t);
    let ls = lignesDe(nom, w);
    while ((ls.length > 2 || ls.some((l) => g.measureText(l).width > w)) && t > 16) { t *= 0.93; g.font = fontDe(t); ls = lignesDe(nom, w); }
    return { t, ls };
  }
  /** Bloc de texte dans la colonne ; renvoie la hauteur occupée. */
  function bloc(txt, x, y, w, font, couleur, lh, max, { fond = null, bord = null, pad = 0, rayon = 0, align = 'left', alpha = 1 } = {}) {
    if (alpha <= 0 || !txt) return 0;
    g.save(); g.globalAlpha = alpha; g.font = font;
    const ls = lignesDe(txt, w - 2 * pad).slice(0, max), h = ls.length * lh + 2 * pad;
    if (fond) boite(x, y, w, h, fond, bord, rayon);
    g.fillStyle = couleur; g.textBaseline = 'top'; g.textAlign = align;
    const xx = align === 'center' ? x + w / 2 : x + pad;
    ls.forEach((l, i) => g.fillText(l, xx, y + pad + i * lh + lh * 0.1));
    g.restore(); return h;
  }
  function jauges(x, y, w, couleur, fond, texte, alpha) {
    if (alpha <= 0) return 0;
    g.save(); g.globalAlpha = alpha; const h = stats(x, y + 14 * s, w, couleur, fond, texte); g.restore(); return h + 14 * s;
  }
  // Styles de colonne par univers : chaque fonction dessine sa colonne complète (k = progression du carton, 0 → 1)
  const CARTON = {
    manga(k) {
      const x = COL_X(), w = COL_W(), entree = ease(k * 3), dx = (1 - entree) * -W * 0.45;
      g.save(); g.translate(dx, 0);
      g.beginPath(); g.moveTo(-10, 0); g.lineTo(W * 0.4, 0); g.lineTo(W * 0.37, H); g.lineTo(-10, H); g.closePath();
      g.fillStyle = 'rgba(251,248,255,.95)'; g.fill(); g.lineWidth = 9 * s; g.strokeStyle = A.encre; g.stroke();
      g.save(); g.clip(); g.fillStyle = trame(); g.fillRect(0, H * 0.78, W * 0.4, H * 0.22); g.restore();
      let y = H * 0.05;
      badge(x, y + 26 * s); y += 56 * s;
      y += bloc(A.bandeau, x, y, w, `italic 900 ${Math.round(26 * s)}px "Arial Black",Impact,sans-serif`, A.teinte2, 32 * s, 1) + 4 * s;
      const n = nomAjuste((t) => `italic 900 ${t}px "Arial Black",Impact,sans-serif`, 70 * s, w);
      g.save(); const z = rebond(k * 1.4); g.translate(x, y); g.scale(z, z);
      n.ls.forEach((l, i) => { g.fillStyle = A.teinte; g.fillText(l, 5 * s, n.t * (0.9 + i * 1.02) + 5 * s); g.fillStyle = A.encre; g.fillText(l, 0, n.t * (0.9 + i * 1.02)); });
      g.restore(); y += n.t * (n.ls.length * 1.02 + 0.25);
      y += bloc(st, x, y, w, `800 ${Math.round(22 * s)}px "Bahnschrift","Arial Narrow",sans-serif`, '#3a1060', 27 * s, 2) + 12 * s;
      y += bloc('« ' + tape((k - 0.1) * 2.3, cit) + ' »', x, y, w, `italic 800 ${Math.round(30 * s)}px Georgia,serif`, A.encre, 36 * s, 4) + 12 * s;
      y += bloc(lore, x, y, w, `italic 500 ${Math.round(18 * s)}px Georgia,serif`, '#4b3a66', 23 * s, 5, { alpha: ease((k - 0.45) * 3) }) + 6 * s;
      jauges(x, y, w * 0.95, '#ff2bd6', 'rgba(11,4,32,.12)', A.encre, ease((k - 0.3) * 3));
      g.restore();
      katakanaGeant(ono, W * 0.955, H * 0.1, 78 * s, k * 1.2);
    },
    gothique(k) {
      const x = COL_X(), w = COL_W(); let y = H * 0.05;
      const fond = g.createLinearGradient(0, 0, W * 0.42, 0); fond.addColorStop(0, 'rgba(0,0,0,.82)'); fond.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fond; g.fillRect(0, 0, W * 0.42, H);
      badge(x, y + 26 * s); y += 56 * s;
      g.save(); g.globalAlpha = ease(k * 4); y += cartouche(x, y, w, (A.bandeau + ' ' + st).toUpperCase(), '#ffd400', '#000', Math.round(21 * s)) + 12 * s; g.restore();
      const n = nomAjuste((t) => `900 ${t}px Impact,"Arial Black",sans-serif`, 82 * s, w);
      g.save(); const z = rebond(k * 1.5); g.translate(x, y); g.scale(z, z); g.lineJoin = 'round';
      n.ls.forEach((l, i) => { const yy = n.t * (0.9 + i * 1.0); g.lineWidth = n.t * 0.16; g.strokeStyle = '#000'; g.strokeText(l, 0, yy); g.fillStyle = '#fff'; g.fillText(l, 0, yy); g.lineWidth = n.t * 0.03; g.strokeStyle = '#ffd400'; g.strokeText(l, 0, yy); });
      g.restore(); y += n.t * (n.ls.length * 1.0 + 0.3);
      g.save(); g.globalAlpha = ease((k - 0.1) * 3); y += cartouche(x, y, w, '« ' + tape((k - 0.1) * 2.3, cit) + ' »', '#f4f1e6', '#000', Math.round(27 * s), true) + 10 * s; g.restore();
      g.save(); g.globalAlpha = ease((k - 0.45) * 3); y += cartouche(x, y, w, lore, '#ffd400', '#000', Math.round(17 * s)) + 6 * s; g.restore();
      jauges(x, y, w, '#ffd400', 'rgba(255,255,255,.15)', '#fff', ease((k - 0.3) * 3));
      eclatement(W * 0.93, H * 0.12, 70 * s, '#ffd400', '#000', ono, '#d0021b', -0.12, k * 1.3);
    },
    post_apo(k) {
      const x = COL_X(), w = COL_W(); let y = H * 0.05;
      g.fillStyle = 'rgba(26,15,6,.72)'; g.fillRect(0, 0, W * 0.39, H);
      badge(x, y + 26 * s); y += 50 * s;
      y += bloc(A.accroche, x, y, w, `900 ${Math.round(20 * s)}px Impact,sans-serif`, '#f3d9a4', 26 * s, 2) + 8 * s;
      const n = nomAjuste((t) => `900 ${t}px Impact,"Arial Black",sans-serif`, 74 * s, w - 24 * s);
      const hb = n.t * (n.ls.length * 1.02 + 0.35);
      g.save(); g.translate(x - 10 * s + (1 - ease(k * 3)) * -W * 0.4, y); g.rotate(-0.03);
      g.fillStyle = '#c8641e'; g.fillRect(0, 0, w + 20 * s, hb);
      g.fillStyle = 'rgba(40,20,5,.3)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % (w + 20 * s), (i * 53) % hb, 30 * s, 2 * s);
      g.fillStyle = '#140a03'; n.ls.forEach((l, i) => g.fillText(l, 18 * s, n.t * (0.95 + i * 1.02)));
      g.restore(); y += hb + 14 * s;
      g.save(); g.translate(x + w - 120 * s, H * 0.07); g.rotate(0.14); const z = rebond(k * 1.3); g.scale(z, z);
      g.globalAlpha = 0.9; g.strokeStyle = '#c1121f'; g.lineWidth = 6 * s; g.strokeRect(-110 * s, -36 * s, 220 * s, 72 * s);
      g.fillStyle = '#c1121f'; g.textAlign = 'center'; g.font = `900 ${Math.round(34 * s)}px Impact,sans-serif`; g.fillText(A.bandeau, 0, 4 * s);
      g.font = `800 ${Math.round(15 * s)}px "Courier New",monospace`; g.fillText(rarete.court.toUpperCase(), 0, 26 * s); g.restore();
      y += bloc(st, x, y, w, `700 ${Math.round(20 * s)}px "Courier New",monospace`, '#f3d9a4', 25 * s, 2) + 10 * s;
      y += bloc('« ' + tape((k - 0.1) * 2.3, cit) + ' »', x, y, w, `italic 800 ${Math.round(27 * s)}px Georgia,serif`, '#1a0f06', 33 * s, 4, { fond: 'rgba(243,217,164,.95)', pad: 14 * s }) + 10 * s;
      y += bloc(lore, x, y, w, `700 ${Math.round(16 * s)}px "Courier New",monospace`, '#f3d9a4', 21 * s, 6, { alpha: ease((k - 0.45) * 3) }) + 6 * s;
      jauges(x, y, w, '#ff7a1a', 'rgba(255,255,255,.15)', '#f3d9a4', ease((k - 0.3) * 3));
    },
    pop(k) {
      const x = COL_X(), w = COL_W(); let y = H * 0.05;
      boite(x - 14 * s, H * 0.025, w + 28 * s, H * 0.95, 'rgba(74,6,54,.62)', 'rgba(255,63,164,.8)', 34 * s);
      badge(x + 6 * s, y + 26 * s); y += 56 * s;
      g.font = police(24 * s); const wb = g.measureText(A.bandeau).width + 36 * s;
      boite(x + 6 * s, y, wb, 40 * s, '#ffffff', null, 20 * s); g.fillStyle = '#ff3fa4'; g.fillText(A.bandeau, x + 24 * s, y + 29 * s); y += 54 * s;
      const n = nomAjuste((t) => police(t), 72 * s, w - 20 * s);
      g.save(); const z = rebond(k * 1.5); g.translate(x + 8 * s, y); g.scale(z, z); g.lineJoin = 'round';
      n.ls.forEach((l, i) => {
        const yy = n.t * (0.9 + i * 1.02);
        g.lineWidth = n.t * 0.3; g.strokeStyle = '#ff3fa4'; g.strokeText(l, 0, yy); g.lineWidth = n.t * 0.15; g.strokeStyle = '#fff'; g.strokeText(l, 0, yy);
        const lg = g.createLinearGradient(0, yy - n.t * 0.8, 0, yy + n.t * 0.2); lg.addColorStop(0, '#fff'); lg.addColorStop(0.5, '#ff6fbd'); lg.addColorStop(1, '#c2187a');
        g.fillStyle = lg; g.fillText(l, 0, yy);
      });
      g.restore(); y += n.t * (n.ls.length * 1.02 + 0.3);
      y += bloc(st, x + 6 * s, y, w - 12 * s, police(22 * s), '#ffe3f4', 27 * s, 2) + 10 * s;
      y += bloc('« ' + tape((k - 0.1) * 2.3, cit) + ' »', x, y, w, `italic 700 ${Math.round(27 * s)}px "Fredoka GP",Georgia,serif`, '#7a0f55', 33 * s, 4, { fond: 'rgba(255,255,255,.95)', pad: 16 * s, rayon: 24 * s }) + 10 * s;
      y += bloc(lore, x + 6 * s, y, w - 12 * s, `600 ${Math.round(17 * s)}px "Fredoka GP","Segoe UI",sans-serif`, '#ffe3f4', 22 * s, 5, { alpha: ease((k - 0.45) * 3) }) + 6 * s;
      jauges(x + 6 * s, y, w - 12 * s, '#ff3fa4', 'rgba(255,255,255,.2)', '#fff', ease((k - 0.3) * 3));
      eclatement(W * 0.93, H * 0.12, 64 * s, '#ffffff', '#ff3fa4', ono, '#ff3fa4', 0.1, k * 1.3);
    },
    vintage(k) {
      // iris : le cercle se resserre SUR le bolide (il reste en pleine lumière), la colonne est un intertitre de film muet
      const f = focusFige || { x: 0.68, y: 0.5 };
      const iris = g.createRadialGradient(W * f.x, H * f.y, H * (0.62 - 0.1 * ease(k * 2)), W * f.x, H * f.y, H * 1.05);
      iris.addColorStop(0, 'rgba(0,0,0,0)'); iris.addColorStop(1, 'rgba(0,0,0,.9)'); g.fillStyle = iris; g.fillRect(0, 0, W, H);
      const x = COL_X(), w = COL_W(), cy = H * 0.04, ch = H * 0.92;
      g.save(); g.globalAlpha = ease(k * 3);
      g.fillStyle = '#0b0a08'; g.fillRect(x - 10 * s, cy, w + 20 * s, ch);
      g.strokeStyle = '#efe4c8'; g.lineWidth = 3 * s; g.strokeRect(x + 2 * s, cy + 12 * s, w - 4 * s, ch - 24 * s);
      g.lineWidth = 1.2 * s; g.strokeRect(x + 12 * s, cy + 22 * s, w - 24 * s, ch - 44 * s);
      let y = cy + 46 * s;
      y += bloc(A.accroche, x, y, w, `italic 600 ${Math.round(18 * s)}px "Palatino Linotype",Georgia,serif`, '#efe4c8', 24 * s, 1, { align: 'center' }) + 10 * s;
      const n = nomAjuste((t) => police(t), 52 * s, w - 50 * s);
      g.fillStyle = '#efe4c8'; g.textAlign = 'center'; n.ls.forEach((l, i) => g.fillText(l, x + w / 2, y + n.t * (0.9 + i * 1.05))); g.textAlign = 'left';
      y += n.t * (n.ls.length * 1.05 + 0.3);
      y += bloc('— ' + st + ' —', x + 20 * s, y, w - 40 * s, `italic 400 ${Math.round(19 * s)}px "Palatino Linotype",Georgia,serif`, '#efe4c8', 24 * s, 2, { align: 'center' }) + 14 * s;
      y += bloc('« ' + tape((k - 0.1) * 2.3, cit) + ' »', x + 24 * s, y, w - 48 * s, `italic 600 ${Math.round(27 * s)}px "Palatino Linotype",Georgia,serif`, '#ffffff', 33 * s, 4, { align: 'center' }) + 14 * s;
      y += bloc(lore, x + 28 * s, y, w - 56 * s, `400 ${Math.round(16 * s)}px "Palatino Linotype",Georgia,serif`, '#cfc4a8', 21 * s, 6, { align: 'center', alpha: ease((k - 0.45) * 3) }) + 8 * s;
      jauges(x + 28 * s, y, w - 56 * s, '#efe4c8', 'rgba(255,255,255,.12)', '#efe4c8', ease((k - 0.3) * 3));
      g.restore();
      badge(x + 20 * s, cy + ch - 26 * s);
    },
    blockbuster(k) {
      const yb = H * 0.5 - W / 2.39 / 2, x = COL_X(), w = COL_W();
      const fond = g.createLinearGradient(0, 0, W * 0.45, 0); fond.addColorStop(0, 'rgba(2,6,17,.85)'); fond.addColorStop(1, 'rgba(2,6,17,0)');
      g.fillStyle = fond; g.fillRect(0, yb, W * 0.45, H - 2 * yb);
      let y = yb + 26 * s;
      y += bloc(espacer(A.bandeau), x, y, w, `600 ${Math.round(16 * s)}px "Bahnschrift","Arial Narrow",sans-serif`, '#d7e6ff', 22 * s, 1, { alpha: ease(k * 3) }) + 10 * s;
      const n = nomAjuste((t) => police(t), 58 * s, w);
      const lg = g.createLinearGradient(0, y, 0, y + n.t * n.ls.length * 1.05);
      lg.addColorStop(0, '#fff6d0'); lg.addColorStop(0.45, '#e9b955'); lg.addColorStop(0.55, '#8a5a18'); lg.addColorStop(1, '#ffe7a3');
      g.save(); g.globalAlpha = ease(k * 2); g.fillStyle = lg; g.shadowColor = 'rgba(255,190,90,.6)'; g.shadowBlur = 22 * s;
      n.ls.forEach((l, i) => g.fillText(l, x, y + n.t * (0.9 + i * 1.05))); g.restore();
      y += n.t * (n.ls.length * 1.05 + 0.25);
      const fl = g.createLinearGradient(0, 0, W * 0.5, 0); fl.addColorStop(0, 'rgba(143,220,255,0)'); fl.addColorStop(0.2 + 0.6 * ease(k), 'rgba(200,240,255,.9)'); fl.addColorStop(1, 'rgba(143,220,255,0)');
      g.fillStyle = fl; g.fillRect(0, y - 6 * s, W * 0.5, 2 * s);
      y += bloc(st.toUpperCase(), x, y + 6 * s, w, `400 ${Math.round(18 * s)}px "Bahnschrift","Segoe UI",sans-serif`, '#ffe2b0', 23 * s, 2) + 16 * s;
      y += bloc('« ' + tape((k - 0.1) * 2.3, cit) + ' »', x, y, w, `italic 600 ${Math.round(25 * s)}px "Palatino Linotype",Georgia,serif`, '#f4f6ff', 30 * s, 4) + 10 * s;
      y += bloc(lore, x, y, w, `400 ${Math.round(15 * s)}px "Bahnschrift","Segoe UI",sans-serif`, '#b9c6e4', 19 * s, 5, { alpha: ease((k - 0.45) * 3) }) + 4 * s;
      jauges(x, y, w, '#ffcf6a', 'rgba(255,255,255,.14)', '#e9eefc', ease((k - 0.3) * 3));
      g.font = `600 ${Math.round(16 * s)}px "Bahnschrift",sans-serif`; g.fillStyle = '#9fb3d9';
      g.fillText(espacer('LE 24 DÉCEMBRE · AU PIED DU SAPIN · ' + car.code), x, H - yb + 30 * s);
      badge(W * 0.66, H - yb + 34 * s);
    },
  };
  const espacer = (t) => [...t].join('\u200A');
  let motifTrame = null;
  function trame() {                    // trame de manga : motif pré-calculé (un seul remplissage par image)
    if (motifTrame) return motifTrame;
    const c = document.createElement('canvas'), p = Math.max(6, Math.round(12 * s)); c.width = c.height = p;
    const x = c.getContext('2d'); x.fillStyle = 'rgba(255,43,214,.16)';
    for (const [a, b] of [[p / 4, p / 4], [p * 3 / 4, p * 3 / 4]]) { x.beginPath(); x.arc(a, b, p * 0.2, 0, 7); x.fill(); }
    return (motifTrame = g.createPattern(c, 'repeat'));
  }

  /* ---------- pendant la sortie du bolide (après la déchirure) */
  const BASCULE = {
    manga(k, f) { speedLines(f.x, f.y, Math.min(1, k * 2), '#ffffff', 0.9); katakanaGeant(ono, W * 0.88, H * 0.14, 120 * s, k * 1.6); },
    gothique(k) {
      if (k < 1.4) { g.save(); g.globalAlpha = ease(k * 4) * (1 - ease((k - 1.0) * 3)); cartouche(W * 0.04, H * 0.06, W * 0.4, A.bandeau, '#ffd400', '#000', Math.round(28 * s)); g.restore(); }
      eclatement(W * 0.74, H * 0.2, 105 * s, '#ffd400', '#000', ono, '#d0021b', -0.15, k * 1.6);
    },
    post_apo(k, f, dt) { particules2D(dt, 'post_apo'); if (k < 1.5) { g.save(); g.globalAlpha = ease(k * 3) * (1 - ease((k - 1.1) * 3)); g.font = `900 ${Math.round(40 * s)}px Impact,"Arial Black",sans-serif`; g.fillStyle = '#f3d9a4'; g.fillText(A.accroche, W * 0.05, H * 0.12); g.restore(); } },
    pop(k, f, dt) { particules2D(dt, 'pop'); eclatement(W * 0.78, H * 0.18, 90 * s, '#ffffff', '#ff3fa4', ono, '#ff3fa4', 0.12, k * 1.6); },
    vintage(k) {
      if (k < 0.55) {                                     // intertitre plein écran, comme un film muet
        g.fillStyle = '#0b0a08'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#efe4c8'; g.lineWidth = 3 * s; g.strokeRect(W * 0.2, H * 0.3, W * 0.6, H * 0.4);
        g.fillStyle = '#efe4c8'; g.textAlign = 'center'; g.font = police(76 * s); g.fillText(A.bandeau, W / 2, H * 0.53); g.textAlign = 'left';
      }
    },
    blockbuster(k) {
      if (k < 1.6) {
        g.save(); g.globalAlpha = ease(k * 2.5) * (1 - ease((k - 1.2) * 3));
        g.textAlign = 'center'; g.font = `300 ${Math.round(48 * s)}px "Bahnschrift","Segoe UI Light",sans-serif`; g.fillStyle = '#f2e6cc';
        g.fillText(espacer(A.accroche), W / 2, H * 0.3); g.textAlign = 'left'; g.restore();
      }
    },
  };

  return {
    taille,
    /** etat = { phase: 'amorce' | 'bascule' | 'freeze', k: secondes dans la phase, focus: {x, y} (0..1), dt } */
    dessiner({ phase, k, focus, dt }) {
      g.clearRect(0, 0, W, H);
      if (phase === 'amorce') return;
      const f = { x: (focus ? focus.x : 0.65) * W, y: (focus ? focus.y : 0.55) * H };
      if (phase === 'freeze' && focus) focusFige = focus;
      if (phase === 'bascule') { (BASCULE[cle] || BASCULE.blockbuster)(k, f, dt); return; }
      if (cle === 'manga') speedLines(f.x, f.y, 0, '#ffffff', 0.3);
      if (cle === 'post_apo' || cle === 'pop') particules2D(dt, cle, W * 0.38);
      (CARTON[cle] || CARTON.blockbuster)(k / (express ? 1.6 : 2.4));
    },
  };
}

/* ================================================================== bandes-son procédurales (compositions originales) */
// Chaque univers : un groove découpé en pas (joué en boucle tant que l'écran attend « Espace »), et un « stinger » au freeze.
const GROOVES = {
  manga: { pas: 60 / 156, etape(o, t, i, v) {                       // eurobeat original, la mineur
    const p = this.pas, ch = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]][Math.floor(i / 4) % 4], arp = [0, 12, 7, 12, 3, 12, 7, 15];
    o.kick(t, 0.9 * v); o.charley(t + p / 2, 0.16 * v); if (i % 2) o.caisse(t, 0.3 * v);
    o.ton('sawtooth', o.NOTE(ch[0] - 24), t + p / 2, p * 0.42, { vol: 0.22 * v, fc: 900 }); o.ton('sawtooth', o.NOTE(ch[0] - 12), t, p * 0.3, { vol: 0.12 * v, fc: 1200 });
    for (let j = 0; j < 4; j++) o.ton('sawtooth', o.NOTE(ch[0] + arp[(i * 4 + j) % 8]), t + j * p / 4, p / 4 * 0.8, { vol: 0.07 * v, fc: 3600, detune: j % 2 ? 9 : -9 });
  }, stinger(o, t) {
    o.accord('sawtooth', [57, 64, 69, 72, 76], t, 1.6, { vol: 0.12, fc: 5000, r: 1.2 }); o.bruit(t, 0.6, { vol: 0.55, type: 'lowpass', f: 3000 }); o.kick(t, 1);
    for (let j = 0; j < 12; j++) o.ton('square', o.NOTE(81 + [0, 3, 7, 12][j % 4]), t + 0.4 + j * 0.09, 0.08, { vol: 0.05, fc: 4000 });
    return 1.8;
  } },
  gothique: { pas: 60 / 92 / 2, etape(o, t, i, v) {                 // cuivres, timbales, ostinato en ré mineur
    const p = this.pas;
    o.ton('sawtooth', o.NOTE([38, 38, 41, 38, 43, 41, 38, 36][i % 8]), t, p * 0.8, { vol: 0.16 * v, fc: 700 });
    if (i % 4 === 0) o.ton('sine', 70, t, 0.4, { vol: 0.6 * v, glisse: 0.7 });
    if (i % 16 === 0) o.accord('sawtooth', [50, 53, 57, 62], t, p * 1.8, { vol: 0.12 * v, fc: 1400, a: 0.03, r: 0.2 });
    if (i % 16 === 8) o.accord('sawtooth', [49, 53, 56, 61], t, p * 1.8, { vol: 0.12 * v, fc: 1400, a: 0.03, r: 0.2 });
    if (i % 32 === 20) o.bruit(t, 1.8, { vol: 0.3 * v, type: 'lowpass', f: 400, f2: 70, a: 0.03 });
  }, stinger(o, t, rire) {
    o.accord('sawtooth', [38, 50, 53, 57, 62, 65], t, 2.2, { vol: 0.13, fc: 1800, a: 0.04, r: 1.5 });
    for (let j = 0; j < 14; j++) o.ton('sine', 72, t + j * 0.06, 0.1, { vol: 0.25 + j * 0.02, glisse: 0.75 });
    o.bruit(t, 2.5, { vol: 0.45, type: 'lowpass', f: 300, f2: 60 });
    if (rire) for (let j = 0; j < 9; j++) o.bruit(t + 0.5 + j * 0.16, 0.12, { vol: 0.35 - j * 0.025, type: 'bandpass', f: 900 - j * 40, q: 5 });
    return 2.6;
  } },
  post_apo: { pas: 60 / 128 / 2, etape(o, t, i, v) {                // riff de guitare saturée, mi mineur pentatonique
    const p = this.pas, n = [40, 40, 40, 43, 40, 40, 45, 43][i % 8], d = p * (i % 4 === 3 ? 0.9 : 0.45), vol = (i % 4 === 0 ? 0.34 : 0.26) * v;
    [n, n + 7, n + 12].forEach((m) => o.ton('sawtooth', o.NOTE(m), t, d, { vol, a: 0.004, r: 0.04, vers: o.guitare, detune: Math.random() * 12 - 6 }));
    if (i % 2 === 0) o.kick(t, 0.8 * v); if (i % 4 === 2) o.caisse(t, 0.4 * v); o.charley(t + p / 2, 0.08 * v);
  }, stinger(o, t) {
    [40, 47, 52].forEach((m) => o.ton('sawtooth', o.NOTE(m), t, 2.6, { vol: 0.38, a: 0.004, vers: o.guitare }));
    o.kick(t, 1); o.caisse(t, 0.5); o.ton('sine', o.NOTE(88), t + 0.5, 2.2, { vol: 0.05, vib: 0.02, a: 0.6 });
    return 2.8;
  } },
  pop: { pas: 60 / 128 / 2, etape(o, t, i, v) {                     // bubblegum pop, do majeur
    const p = this.pas, mel = [76, 79, 84, 83, 81, 79, 76, 74, 76, 79, 81, 84, 86, 84, 79, 76];
    if (i % 2 === 0) o.kick(t, 0.75 * v); if (i % 4 === 2) o.clap(t, 0.32 * v); o.charley(t + p / 2, 0.1 * v);
    o.ton('square', o.NOTE(mel[i % 16]), t, p * 0.7, { vol: 0.07 * v, fc: 5000 });
    if (i % 2 === 0) o.ton('triangle', o.NOTE([48, 45, 41, 43][Math.floor(i / 8) % 4]), t, p * 1.6, { vol: 0.2 * v });
    if (i % 3 === 0) o.ton('sine', o.NOTE(96 + (i % 5)), t, 0.25, { vol: 0.04 * v, r: 0.3 });
  }, stinger(o, t) {
    o.accord('triangle', [60, 64, 67, 72, 76], t, 1.4, { vol: 0.1, r: 1 }); o.clap(t, 0.4); o.kick(t, 0.9);
    for (let j = 0; j < 16; j++) o.ton('sine', o.NOTE(84 + j), t + 0.2 + j * 0.035, 0.12, { vol: 0.05, r: 0.2 });
    return 1.6;
  } },
  vintage: { pas: 60 / 76, etape(o, t, i, v) {                      // trompette de western, sifflet, craquements de vinyle
    const mel = [[62, 1], [69, 1], [74, 2], [72, 0.5], [70, 0.5], [69, 1], [65, 1], [67, 2], [0, 1]];
    let k = i % 10, acc = 0, cible = null;                            // la mélodie tient sur 10 temps
    for (const [n, d] of mel) { if (acc === k) cible = [n, d]; acc += d; }
    if (cible && cible[0]) o.ton('sawtooth', o.NOTE(cible[0]), t, this.pas * cible[1] * 0.95, { vol: 0.14 * v, fc: 2200, a: 0.04, vib: 0.012 });
    o.ton('sine', 110, t, 0.25, { vol: 0.3 * v, glisse: 0.6 });
    for (let j = 0; j < 4; j++) o.bruit(t + Math.random() * this.pas, 0.012, { vol: (0.04 + Math.random() * 0.08) * v, f: 3000 });
  }, stinger(o, t) {
    o.ton('sawtooth', o.NOTE(74), t, 2.4, { vol: 0.15, fc: 2400, a: 0.05, vib: 0.02 }); o.ton('sine', o.NOTE(86), t + 0.3, 2, { vol: 0.07, vib: 0.03, a: 0.2 });
    o.ton('sine', o.NOTE(98), t, 1.5, { vol: 0.06, r: 1.2 });
    return 2.6;
  } },
  blockbuster: { pas: 60 / 120 / 2, etape(o, t, i, v) {             // taikos et ostinato de cordes
    if ([1, 0, 0, 1, 0, 0, 1, 0][i % 8]) { o.ton('sine', 90, t, 0.35, { vol: 0.75 * v, glisse: 0.5 }); o.bruit(t, 0.12, { vol: 0.25 * v, type: 'lowpass', f: 900 }); }
    o.ton('sawtooth', o.NOTE([50, 50, 53, 50, 55, 53, 50, 48][i % 8]), t, this.pas * 0.7, { vol: 0.07 * v, fc: 1800 });
    o.ton('sawtooth', o.NOTE([62, 62, 65, 62, 67, 65, 62, 60][i % 8]), t + this.pas / 2, this.pas * 0.35, { vol: 0.04 * v, fc: 2400 });
    if (i % 32 === 0 && i) o.accord('sawtooth', [26, 33, 38, 41], t, 1.2, { vol: 0.14 * v, fc: 500, a: 0.05, r: 0.8 });
  }, stinger(o, t) {
    o.accord('sawtooth', [26, 33, 38, 41], t, 2.4, { vol: 0.2, fc: 500, a: 0.05, r: 0.8 }); o.bruit(t, 1.4, { vol: 0.3, type: 'lowpass', f: 200 });
    o.ton('sine', 45, t, 1.6, { vol: 0.8, glisse: 0.6, r: 0.5 });
    return 2.6;
  } },
};

/** Thème de l'univers : le groove démarre à « debut » (s depuis maintenant, juste après le jingle d'entrée), stinger au
    « freeze », puis le groove continue en boucle (plus doux) jusqu'à stop() : la musique tient tant que l'écran attend. */
export function themeSonore(cle, S, { debut, freeze, rire = false, ouverture = true }) {
  if (!S) return () => {};
  const { ac, master } = S;
  const G = GROOVES[cle] || GROOVES.blockbuster;
  const bus = ac.createGain(); bus.gain.value = 0.75; bus.connect(master);
  const o = outilsSon(S, bus);
  // ampli saturé pour le riff post-apo
  const ws = ac.createWaveShaper(), n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / n * 2 - 1; c[i] = Math.tanh(x * 6); }
  ws.curve = c; const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 3200;
  o.guitare = ac.createGain(); o.guitare.gain.value = 0.5; o.guitare.connect(ws); ws.connect(fl); fl.connect(bus);
  const t0 = ac.currentTime + 0.03, td = t0 + debut, tf = t0 + freeze;
  if (ouverture) o.bruit(td - 0.02, 0.5, { vol: 0.45, type: 'highpass', f: 2500 });          // la déchirure du décor
  let i = 0, prochain = td;
  for (; prochain < tf - 0.02; prochain += G.pas, i++) G.etape(o, prochain, i, 1);
  const reprise = tf + G.stinger(o, tf, rire);
  prochain = reprise; i = 0;
  let fini = false;
  const planifier = () => {                // ordonnanceur à l'avance : 0,6 s de musique toujours programmée
    if (fini) return;
    while (prochain < ac.currentTime + 0.6) { G.etape(o, prochain, i++, 0.72); prochain += G.pas; }
  };
  const minuterie = setInterval(planifier, 120);
  return function stop() {
    fini = true; clearInterval(minuterie);
    const t = ac.currentTime;
    try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); try { bus.disconnect(); } catch (e) { /* rien */ } }, 700);
  };
}
