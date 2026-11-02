/* AIDES du segment « ouverture » V9.2 — LA TÉLÉ QUI ASPIRE LA CAMÉRA.

     creerEcranVortex     : matériau de la dalle : éteinte (noir laqué) → allumage cathodique électrique (ligne puis ouverture
                            verticale) → LOGO blanc-bleu saturé → vortex (le logo vrille et se creuse) → tunnel néon 2D ;
     creerAnneauxAspirants: cadres néon (rectangles arrondis à l'échelle de la dalle) qui naissent autour de la caméra, vrillent et
                            sont avalés par l'écran ;
     creerExplosionNeon   : explosion de particules néon 3D véloces qui jaillissent de la dalle, envahissent le salon, tourbillonnent
                            autour de l'axe de la télé (donc autour de la caméra qui s'y engouffre) puis sont ré-aspirées ;
     creerTunnelNeon      : le tunnel 3D derrière la dalle (cylindre vu de l'intérieur, anneaux et spirales néon, lumière rose au
                            bout) + ses particules filantes.
   Couleurs néon : cyan #2de2ff, magenta #ff3fa4, or #ffc83d, violet #8a4dff. Toutes les positions sont calculées dans les
   vertex shaders à partir d'un uniform t (fonction pure du temps) ; l'aléa est semé (mulberry32). */
import { mulberry } from './ouverture_spectacle.js';

export const NEONS = [[0.18, 0.89, 1.0], [1.0, 0.25, 0.64], [1.0, 0.78, 0.24], [0.54, 0.30, 1.0]];
const GLSL_NEON = `vec3 neon(float k){ k = mod(k, 4.0);
  if (k < 1.0) return vec3(0.18, 0.89, 1.0); if (k < 2.0) return vec3(1.0, 0.25, 0.64); if (k < 3.0) return vec3(1.0, 0.78, 0.24); return vec3(0.54, 0.30, 1.0); }`;
const FRAG_POINTS = `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 14.0) * smoothstep(0.5, 0.3, length(d)); gl_FragColor = vec4(vC * g, 1.0); }`;

/** Dalle de la télé. maj({ t, allume, choc, vortex, gain }). */
export function creerEcranVortex(THREE, texLogo, aspect) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, allume: { value: 0 }, choc: { value: 0 }, vortex: { value: 0 }, gain: { value: 1 }, aspect: { value: aspect }, logo: { value: texLogo } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float t, allume, choc, vortex, gain, aspect; uniform sampler2D logo;
      ${GLSL_NEON}
      void main(){
        vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
        float r = length(p), a = atan(p.y, p.x);
        /* éteinte : noir laqué qui reflète faiblement le salon chaud */
        vec3 eteinte = vec3(0.010, 0.011, 0.016) + vec3(0.07, 0.045, 0.03) * smoothstep(0.75, 0.0, length(p - vec2(-0.45, 0.3))) * 0.6
                     + vec3(0.05, 0.03, 0.02) * smoothstep(0.02, 0.0, abs(p.y + p.x * 0.35 - 0.12)) * 0.5;
        /* vortex : le plan de l'image vrille et se creuse */
        float tw = vortex * vortex;
        float a2 = a + tw * 5.0 / (r + 0.18) + t * tw * 2.5;
        float r2 = r * mix(1.0, 0.3, tw);
        vec2 q = vec2(cos(a2), sin(a2)) * r2;
        /* logo électrique blanc-bleu saturé */
        vec3 fond = mix(vec3(0.12, 0.34, 1.0), vec3(0.03, 0.07, 0.4), smoothstep(0.0, 0.9, length(q)));
        vec2 lu = q / 0.93 + 0.5;
        vec4 L = texture2D(logo, lu) * step(0.0, lu.x) * step(lu.x, 1.0) * step(0.0, lu.y) * step(lu.y, 1.0);
        float lum = dot(L.rgb, vec3(0.3, 0.55, 0.15));
        vec3 lc = mix(L.rgb, vec3(lum), 0.35) * vec3(0.9, 1.08, 1.45) * 1.12 + vec3(0.2, 0.35, 0.6) * L.a * 0.25;
        vec3 allumee = mix(fond, lc, L.a);
        allumee *= 0.93 + 0.07 * sin(vUv.y * 520.0 + t * 40.0);                 // trame
        allumee += vec3(0.4, 0.6, 1.1) * choc * (0.1 + 0.45 * exp(-r * r * 5.0));
        /* tunnel néon 2D (raccord avec le tunnel 3D derrière la dalle) */
        float z = 0.22 / (r + 0.02), zz = z - t * 3.2;
        float k = floor(zz), f = fract(zz);
        vec3 tun = neon(k) * (0.3 + 1.1 * smoothstep(0.55, 0.92, f) * smoothstep(1.0, 0.95, f)) + vec3(0.32, 0.12, 0.55) * 0.45;
        tun += neon(k + 1.0) * 0.55 * pow(0.5 + 0.5 * sin(a * 4.0 + z * 2.0 - t * 6.0), 12.0);
        tun = mix(tun, vec3(1.0, 0.45, 0.9) * 1.25, exp(-r * r * 60.0));
        allumee = mix(allumee, tun, smoothstep(0.2, 0.85, vortex));
        /* allumage cathodique : ligne horizontale qui s'étire, puis ouverture verticale */
        float lx = smoothstep(0.0, 0.4, allume), ly = smoothstep(0.35, 1.0, allume), on = step(0.001, allume);
        float m = on * step(abs(vUv.x - 0.5), 0.5 * lx + 0.002) * step(abs(vUv.y - 0.5), 0.006 + 0.5 * ly);
        vec3 c = mix(eteinte, allumee, m);
        c += vec3(0.75, 0.9, 1.4) * 2.2 * (1.0 - ly) * m;                       // la ligne est incandescente (bleutée, pas blanche)
        gl_FragColor = vec4(c * gain, 1.0);
      }`,
  });
  return { mat, maj({ t, allume, choc, vortex, gain }) { const u = mat.uniforms; u.t.value = t; u.allume.value = allume; u.choc.value = choc; u.vortex.value = vortex; u.gain.value = gain; } };
}

/** Cadres néon aspirés par la dalle. maj(t, force). */
export function creerAnneauxAspirants(THREE, ecran, n = 9) {
  const groupe = new THREE.Group(); groupe.name = 'anneaux-aspirants';
  const W = ecran.largeur, H = ecran.hauteur;
  const geo = new THREE.PlaneGeometry(W * 1.12, H * 1.2);
  const items = [];
  for (let k = 0; k < n; k++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { couleur: { value: new THREE.Color(...NEONS[k % 4]) }, force: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 couleur; uniform float force;
        float rr(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main(){ vec2 p = (vUv - 0.5) * vec2(${(W * 1.12).toFixed(1)}, ${(H * 1.2).toFixed(1)});
          float d = abs(rr(p, vec2(${(W / 2).toFixed(1)}, ${(H / 2).toFixed(1)}), 8.0));
          float v = exp(-d * d / 6.0) * 1.6 + exp(-d * d / 90.0) * 0.35;
          gl_FragColor = vec4(couleur * v * force, 1.0); }`,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 8; groupe.add(m);
    items.push({ m, mat, ph: k / n });
  }
  return {
    groupe,
    maj(t, force) {
      for (const it of items) {
        const s = ((t * 1.35 + it.ph) % 1 + 1) % 1;                         // 0 : naît près de la caméra ; 1 : avalé par la dalle
        const sc = 3.4 - 2.45 * Math.pow(s, 0.8);
        it.m.position.set(ecran.centre.x, ecran.centre.y, ecran.centre.z + 2.5 + (1 - s) * 150);
        it.m.scale.set(sc, sc, 1);
        it.m.rotation.set(0, 0, (1 - s) * 1.4 + t * 0.9);
        it.mat.uniforms.force.value = force * Math.sin(Math.PI * s);
      }
      groupe.visible = force > 0.002;
    },
  };
}

/** Explosion de particules néon depuis la dalle (shader : balistique amortie + tourbillon autour de l'axe + ré-aspiration). */
export function creerExplosionNeon(THREE, ecran, { n = 340, t0 = 4.95, etalement = 0.65, aspiration = 5.7, demiH = 270, graine = 4612 } = {}) {
  const rnd = mulberry(graine), E = ecran.centre;
  const pos = new Float32Array(n * 3), dir = new Float32Array(n * 3), par = new Float32Array(n * 4), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const ex = (rnd() - 0.5) * ecran.largeur * 0.92, ey = (rnd() - 0.5) * ecran.hauteur * 0.9;
    pos[i * 3] = ex; pos[i * 3 + 1] = ey; pos[i * 3 + 2] = 1.5;                       // repère local centré sur la dalle
    const k = 0.6 + rnd() * 2.2, d = [ex / 80 * k + (rnd() - 0.5) * 0.6, ey / 46 * k + (rnd() - 0.5) * 0.6, 1.0];
    const l = Math.hypot(...d); dir[i * 3] = d[0] / l; dir[i * 3 + 1] = d[1] / l; dir[i * 3 + 2] = d[2] / l;
    par[i * 4] = t0 + Math.pow(rnd(), 1.6) * etalement;                               // naissance
    par[i * 4 + 1] = 380 + rnd() * 620;                                               // vitesse initiale (cm/s)
    par[i * 4 + 2] = (rnd() < 0.5 ? -1 : 1) * (2.0 + rnd() * 4.0);                     // vitesse de tourbillon (rad/s)
    par[i * 4 + 3] = 3.2 + rnd() * 5.0;                                               // taille (cm)
    const c = NEONS[Math.floor(rnd() * 4)], g = 2.4 + rnd() * 1.8;
    col[i * 3] = c[0] * g; col[i * 3 + 1] = c[1] * g; col[i * 3 + 2] = c[2] * g;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('dir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('par', new THREE.BufferAttribute(par, 4)); geo.setAttribute('couleur', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 }, demiH: { value: demiH }, aspiration: { value: aspiration } },
    vertexShader: `attribute vec3 dir; attribute vec4 par; attribute vec3 couleur; uniform float t, force, demiH, aspiration; varying vec3 vC;
      void main(){
        float age = t - par.x, a = max(age, 0.0);
        float kd = 1.7, L = par.y * (1.0 - exp(-kd * a)) / kd;                // course amortie
        vec3 p = position + dir * L;
        float ang = par.z * a + 0.6 * par.z * a * a;                            // tourbillon qui s'accélère
        float cs = cos(ang), sn = sin(ang);
        p.xy = mat2(cs, sn, -sn, cs) * p.xy;
        float asp = smoothstep(aspiration, aspiration + 0.7, t);                // ré-aspiration vers la dalle (suit la caméra)
        p.z *= 1.0 - 0.85 * asp; p.xy *= 1.0 - 0.45 * asp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float z = max(-mv.z, 1.0);
        gl_PointSize = clamp(par.w * projectionMatrix[1][1] * demiH / z, 0.0, 44.0);
        float vie = step(0.0, age) * smoothstep(0.0, 0.05, age);
        vC = couleur * vie * force * smoothstep(4.0, 22.0, z);
      }`,
    fragmentShader: FRAG_POINTS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 9; pts.name = 'explosion-neon';
  pts.position.set(E.x, E.y, E.z);
  return { mesh: pts, n, maj(t, force) { mat.uniforms.t.value = t; mat.uniforms.force.value = force; pts.visible = force > 0.002 && t > t0 - 0.01; } };
}

/** Tunnel néon derrière la dalle : cylindre (axe −z depuis la dalle), bout rose lumineux, particules filantes. maj(t, force). */
export function creerTunnelNeon(THREE, ecran, { rayon = 78, longueur = 3200, n = 280, demiH = 270, graine = 9031 } = {}) {
  const E = ecran.centre, groupe = new THREE.Group(); groupe.name = 'tunnel-neon';
  groupe.position.set(E.x, E.y, E.z - 1.0);
  const geo = new THREE.CylinderGeometry(rayon, rayon, longueur, 64, 1, true);
  geo.rotateX(Math.PI / 2); geo.translate(0, 0, -longueur / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 } },
    vertexShader: 'varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vL; uniform float t, force; ${GLSL_NEON}
      void main(){
        float a = atan(vL.y, vL.x), z = -vL.z;
        float zz = z / 46.0 + t * 2.5, k = floor(zz), f = fract(zz);
        vec3 c = vec3(0.30, 0.10, 0.55) * 0.6 + neon(k) * 0.18;
        c += neon(k) * 1.25 * smoothstep(0.6, 0.9, f) * smoothstep(1.0, 0.94, f);                  // anneaux
        c += neon(k + 2.0) * 0.8 * pow(0.5 + 0.5 * sin(a * 4.0 + z * 0.02 - t * 7.0), 14.0);       // spirales qui vrillent
        c += neon(k + 1.0) * 0.5 * pow(0.5 + 0.5 * sin(a * 7.0 - z * 0.035 + t * 5.0), 22.0);
        c = mix(c, vec3(1.0, 0.42, 0.88) * 1.15, smoothstep(${(longueur * 0.55).toFixed(0)}.0, ${longueur.toFixed(0)}.0, z));   // lumière rose au bout
        gl_FragColor = vec4(c * force, 1.0);
      }`,
    side: THREE.BackSide,
  });
  const tube = new THREE.Mesh(geo, mat); groupe.add(tube);
  const fondGeo = new THREE.CircleGeometry(rayon, 48); fondGeo.translate(0, 0, -longueur + 1);
  const fondMat = new THREE.ShaderMaterial({
    uniforms: { force: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vP; uniform float force; void main(){ float r = length(vP) / ${rayon.toFixed(1)};
      vec3 c = mix(vec3(1.0, 0.55, 0.92) * 1.35, vec3(1.0, 0.42, 0.88) * 1.15, smoothstep(0.0, 1.0, r)); gl_FragColor = vec4(c * force, 1.0); }`,
  });
  groupe.add(new THREE.Mesh(fondGeo, fondMat));
  /* particules filantes : elles foncent vers la caméra en tournant (repère local du tunnel) */
  const rnd = mulberry(graine);
  const pos = new Float32Array(n * 3), par = new Float32Array(n * 4), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd() * Math.PI * 2; pos[i * 3 + 1] = rayon * (0.25 + 0.68 * Math.sqrt(rnd())); pos[i * 3 + 2] = rnd() * longueur * 0.8;
    par[i * 4] = 500 + rnd() * 700; par[i * 4 + 1] = (rnd() - 0.5) * 3.0; par[i * 4 + 2] = 2.0 + rnd() * 3.0; par[i * 4 + 3] = 0;
    const c = NEONS[Math.floor(rnd() * 4)], g = 1.6 + rnd() * 1.4; col[i * 3] = c[0] * g; col[i * 3 + 1] = c[1] * g; col[i * 3 + 2] = c[2] * g;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('par', new THREE.BufferAttribute(par, 4)); pg.setAttribute('couleur', new THREE.BufferAttribute(col, 3));
  const pm = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 }, demiH: { value: demiH }, plage: { value: longueur * 0.8 } },
    vertexShader: `attribute vec4 par; attribute vec3 couleur; uniform float t, force, demiH, plage; varying vec3 vC;
      void main(){ float ang = position.x + par.y * t, r = position.y;
        float z = -plage + mod(position.z + t * par.x, plage);                 // de −plage vers 0 (vers la dalle, donc vers la caméra)
        vec3 p = vec3(cos(ang) * r, sin(ang) * r, z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float zc = max(-mv.z, 1.0);
        gl_PointSize = clamp(par.z * projectionMatrix[1][1] * demiH / zc, 0.0, 40.0);
        vC = couleur * force * smoothstep(5.0, 30.0, zc); }`,
    fragmentShader: FRAG_POINTS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.renderOrder = 9; groupe.add(pts);
  return {
    groupe, n,
    maj(t, force) { mat.uniforms.t.value = t; mat.uniforms.force.value = force; fondMat.uniforms.force.value = force; pm.uniforms.t.value = t; pm.uniforms.force.value = force; groupe.visible = force > 0.002; },
  };
}
