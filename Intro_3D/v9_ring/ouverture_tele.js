/* AIDES du segment « ouverture » (V9) — LA TÉLÉ DU SALON.

   L'écran de la télé du salon (../src/decors/salon.js, NON modifié) reçoit ici un nouveau matériau : un shader qui dessine
     1. un FEU DE CHEMINÉE plein écran (âtre de briques, deux bûches croisées aux fissures incandescentes, lit de braises,
        flammes fBm orangées, escarbilles qui montent) — fonction pure du temps ;
     2. puis, au choc doré (8,8 s), les flammes se rétractent vers le bas et un disque de révélation bordé d'or découvre le
        LOGO officiel du Grand Prix (data/logo_gp.png détouré) sur un fond indigo (#19174b) à rayons dorés ; le logo scintille
        ensuite (reflet balayant sur les ors).
   Les valeurs écrites sont en espace « sRGB » (le post du noyau décode en linéaire) ; les flammes, les braises et les ors
   dépassent 1 pour nourrir le bloom LOCALEMENT (aucun flash plein écran).

   creerHaloTele : aura additive autour de la télé (lueur orange du feu, puis choc doré + rayons), plan posé juste devant l'écran,
   éteint au centre pour ne jamais voiler le logo. */

/** Charge une image (Promise) — utilisé pour attendre le logo dans creerSegment. */
export function chargerImage(url) {
  return new Promise((ok, ko) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ko(new Error('ouverture : image introuvable ' + url));
    im.src = url;
  });
}

/** Texture carrée 1024² du logo (détouré, fond transparent conservé), sans mipmap NPOT ni dépendance au chargeur de three. */
export function textureLogo(THREE, image) {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  const k = Math.min(1024 / image.width, 1024 / image.height), w = image.width * k, h = image.height * k;
  g.drawImage(image, (1024 - w) / 2, (1024 - h) / 2, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 4;
  return tex;
}

/** Vacillement du feu (partagé par le shader de l'écran et les lumières de la pièce : la lueur danse AVEC les flammes). */
export function vacillement(t) {
  return 0.8 + 0.1 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.1 + 1.3) + 0.05 * Math.sin(t * 37.7 + 0.4) + 0.05 * Math.sin(t * 5.3 + 2.1);
}

const GLSL_BRUIT = `
float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++){ v += a * bruit(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }`;

/** Matériau de l'écran : feu de cheminée → logo. maj({ t, flamme, revele, choc, brille, gain, escarbilles }). */
export function creerEcranFeu(THREE, texLogo, aspect) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      t: { value: 0 }, flick: { value: 1 }, flamme: { value: 1 }, revele: { value: 0 }, choc: { value: 0 }, brille: { value: 0 },
      gain: { value: 1 }, escarbilles: { value: 1 }, aspect: { value: aspect }, logo: { value: texLogo },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv;
      uniform float t, flick, flamme, revele, choc, brille, gain, escarbilles, aspect; uniform sampler2D logo;
      ${GLSL_BRUIT}
      float capsule(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
      vec3 rampe(float f){
        vec3 c = mix(vec3(0.30, 0.02, 0.0), vec3(1.0, 0.30, 0.02), smoothstep(0.0, 0.35, f));
        c = mix(c, vec3(1.0, 0.70, 0.16), smoothstep(0.35, 0.72, f));
        return mix(c, vec3(1.0, 0.95, 0.72), smoothstep(0.72, 1.0, f));
      }
      vec3 feu(vec2 uv){
        vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
        /* âtre : briques sombres réchauffées par le foyer */
        vec2 b = vec2(p.x * 6.0, p.y * 12.0); b.x += 0.5 * step(1.0, mod(floor(b.y), 2.0));
        vec2 fb = fract(b);
        float joint = smoothstep(0.0, 0.05, fb.x) * smoothstep(1.0, 0.95, fb.x) * smoothstep(0.0, 0.09, fb.y) * smoothstep(1.0, 0.91, fb.y);
        vec3 c = vec3(0.10, 0.035, 0.02) * (0.35 + 0.65 * joint * (0.75 + 0.5 * h2(floor(b))));
        float lueur = exp(-pow(p.x / 0.6, 2.0)) * exp(-pow((p.y - 0.25) / 0.42, 2.0));
        c *= 0.6 + 2.6 * lueur * flick;
        c += vec3(0.55, 0.15, 0.02) * lueur * 0.35 * flick;
        /* flammes (se rétractent vers le bas quand flamme → 0) */
        float H = max(flamme, 0.001);
        float y = (p.y - 0.15) / (0.80 * H);
        float ond = 0.08 * sin(y * 6.0 - t * 4.1) + 0.04 * sin(y * 11.0 + t * 6.3);
        float larg = 0.62 * (1.0 - 0.5 * clamp(y, 0.0, 1.0));
        float forme = 1.0 - smoothstep(larg * 0.45, larg, abs(p.x + ond * y));
        float n = fbm(vec2(p.x * 3.0, y * 2.3 - t * 2.1));
        float n2 = fbm(vec2(p.x * 6.5 + 3.1, y * 4.2 - t * 3.3));
        float langues = 0.5 + 0.5 * sin(p.x * 9.0 + n * 4.0);
        float f = forme * (n * 1.3 + n2 * 0.5 + 0.25 * langues - y * 1.05) * step(-0.08, y);
        f = clamp(f * 1.55, 0.0, 1.0) * step(0.002, flamme);
        c = mix(c, rampe(f) * (1.0 + 1.0 * f), smoothstep(0.03, 0.3, f));
        /* bûches croisées, fissures incandescentes */
        float d = min(capsule(p, vec2(-0.50, 0.09), vec2(0.44, 0.17), 0.055), capsule(p, vec2(-0.42, 0.18), vec2(0.52, 0.08), 0.05));
        vec3 bois = vec3(0.10, 0.045, 0.022) * (0.6 + 0.5 * bruit(p * vec2(60.0, 18.0)));
        float fiss = smoothstep(0.66, 0.78, bruit(p * vec2(26.0, 55.0) + vec2(0.0, t * 0.25)));
        bois += vec3(1.4, 0.38, 0.05) * fiss * (0.55 + 0.45 * sin(t * 2.7 + p.x * 17.0)) * flick;
        bois += vec3(0.9, 0.32, 0.05) * smoothstep(-0.02, 0.0, d) * flick;                  // liseré éclairé par les flammes
        c = mix(c, bois, smoothstep(0.004, -0.004, d));
        /* lit de braises */
        float lit = exp(-pow((p.y - 0.055) / 0.03, 2.0)) * smoothstep(0.62, 0.3, abs(p.x));
        c += vec3(1.3, 0.34, 0.03) * lit * (0.45 + 0.55 * bruit(vec2(p.x * 28.0, t * 1.7)));
        /* escarbilles qui montent */
        for (int i = 0; i < 28; i++){
          float fi = float(i), vit = 0.10 + 0.16 * h1(fi * 3.1), ph = fract(h1(fi * 7.3) + t * vit);
          vec2 q = vec2((h1(fi * 1.7) - 0.5) * 0.75 + 0.07 * sin(t * 1.7 + fi * 2.3) * ph, 0.14 + ph * 0.92);
          float r = 0.005 + 0.004 * h1(fi * 9.1);
          float g = exp(-dot(p - q, p - q) / (r * r)) * (1.0 - ph) * smoothstep(0.0, 0.08, ph);
          c += vec3(1.8, 0.75, 0.2) * g * escarbilles;
        }
        return c;
      }
      vec3 sceneLogo(vec2 uv){
        vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
        float r = length(p), a = atan(p.y, p.x);
        vec3 fond = mix(vec3(0.17, 0.15, 0.44), vec3(0.075, 0.07, 0.24), smoothstep(0.0, 0.85, r));
        fond += vec3(0.30, 0.20, 0.05) * pow(0.5 + 0.5 * cos(a * 12.0 + t * 0.35), 10.0) * smoothstep(0.95, 0.25, r) * 0.55;
        vec2 lu = p / 0.93 + 0.5;
        vec4 L = texture2D(logo, lu);
        L *= step(0.0, lu.x) * step(lu.x, 1.0) * step(0.0, lu.y) * step(lu.y, 1.0);
        vec3 col = L.rgb;
        float ors = smoothstep(0.12, 0.32, L.r - L.b) * smoothstep(0.45, 0.65, L.g);
        float balayage = exp(-pow((lu.x + lu.y * 0.6 - mod(t * 0.42, 2.4) + 0.2) / 0.07, 2.0));
        float etincelle = pow(bruit(lu * 46.0 + vec2(t * 0.9, -t * 0.6)), 14.0) * 6.0;
        col *= 1.04 + brille * (0.10 + 0.55 * ors * balayage);
        col += ors * (balayage * 0.40 + etincelle * 0.5) * brille;
        return mix(fond, col, L.a);
      }
      void main(){
        vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
        float rr = length(p);
        vec3 c = feu(vUv);
        if (revele > 0.0001){
          float rad = revele * 1.15;
          float m = smoothstep(rad, rad - 0.06, rr);
          c = mix(c, sceneLogo(vUv), m);
          c += vec3(1.6, 1.1, 0.4) * exp(-pow((rr - rad) / 0.025, 2.0)) * (1.0 - smoothstep(0.75, 1.0, revele));   // lisière d'or
        }
        c += vec3(1.0, 0.78, 0.35) * choc * (0.25 + 1.2 * exp(-rr * rr * 7.0));
        gl_FragColor = vec4(c * gain, 1.0);
      }`,
  });
  return {
    mat,
    maj({ t, flamme, revele, choc, brille, gain, escarbilles }) {
      const u = mat.uniforms;
      u.t.value = t; u.flick.value = vacillement(t); u.flamme.value = flamme; u.revele.value = revele; u.choc.value = choc;
      u.brille.value = brille; u.gain.value = gain; u.escarbilles.value = escarbilles;
    },
  };
}

/** Aura additive devant la télé : maj({ force, couleur: THREE.Color, rayons, t }). Le rectangle de l'écran est préservé. */
export function creerHaloTele(THREE, ecran) {
  const W = ecran.largeur * 2.6, H = ecran.hauteur * 3.0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { force: { value: 0 }, couleur: { value: new THREE.Color(1, 0.5, 0.15) }, rayons: { value: 0 }, t: { value: 0 },
      demi: { value: new THREE.Vector2(ecran.largeur / W, ecran.hauteur / H) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float force, rayons, t; uniform vec3 couleur; uniform vec2 demi;
      void main(){
        vec2 p = vUv - 0.5; p.x *= ${(W / H).toFixed(4)};
        vec2 q = abs(vUv - 0.5) - demi * 0.5;                                // distance au rectangle de l'écran (en uv)
        float dehors = smoothstep(0.0, 0.05, max(q.x, q.y));
        float r = length(p);
        float glow = exp(-r * r * 9.0) * 0.8 + exp(-r * r * 30.0) * 0.4;
        float a = atan(p.y, p.x);
        float ray = pow(0.5 + 0.5 * cos(a * 14.0 + t * 0.6), 18.0) + 0.6 * pow(0.5 + 0.5 * cos(a * 9.0 - t * 0.4 + 1.3), 24.0);
        float v = glow * (0.15 + 0.85 * dehors) + rayons * ray * exp(-r * 2.2) * dehors;
        float bord = smoothstep(0.5, 0.36, abs(vUv.x - 0.5)) * smoothstep(0.5, 0.36, abs(vUv.y - 0.5));
        gl_FragColor = vec4(couleur * v * force * bord, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const geo = new THREE.PlaneGeometry(W, H);
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 4; m.name = 'halo-tele';
  m.position.copy(ecran.centre); m.position.z += 2.0;
  return {
    mesh: m,
    maj({ force, couleur, rayons, t }) { mat.uniforms.force.value = force; mat.uniforms.couleur.value.copy(couleur); mat.uniforms.rayons.value = rayons; mat.uniforms.t.value = t; m.visible = force > 0.002; },
  };
}
