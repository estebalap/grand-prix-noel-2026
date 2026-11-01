/* GLOIRE ÉTERNELLE (V9.1 Ring, segment arène) — chorégraphie « le trophée SORT DU CONTENEUR » et effets de la gloire.

   choregraphie(L, Gl, { yPose, yPlateau, zTrophee, yHaut, echInit }) : fonctions PURES du temps (temps INTERNE du segment) :
     tiroir(t)   extension du plateau doré (cm) : sort à L.trophee_sort (0,8 s), rentre une fois la coupe envolée
     enfonce(t)  0 → 1 : le conteneur s'enfonce dans le tapis quand la coupe est déjà au-dessus de lui
     trophee(t)  { pos (base du socle), s (échelle), rot, aura, rayons, colonne, brille, brillePhase } ou null (caché) :
                 posée sur le plateau dans le conteneur (échelle echInit : elle tient sous le linteau), elle sort avec le tiroir,
                 décolle en lévitant, grandit jusqu'à l'échelle 1 en montant AU-DESSUS du toit avant de reculer vers l'axe du ring,
                 et se fige au centre, en hauteur (base à yHaut) à Gl.trophee_haut ; ensuite elle flotte (léger roulis vertical).
   Le contrôle de collisions (seg_arene.collisions) vérifie la coupe contre les parois du conteneur, les voitures et le décor.

   creerEffetsGloire(THREE, { demiH }) → { groupe, maj(t, e) } — e = { feux: instant de la 1ʳᵉ salve, faisceaux: 0..1,
     cible: [x, y, z], ondes: [instants], forceFeux } :
     FEUX D'ARTIFICE dorés au-dessus du ring (9 salves semées : fusée qui monte, pivoine qui s'ouvre, traînée, scintillement, gravité),
     FAISCEAUX de projecteurs volumétriques (6 cônes additifs depuis le portique vers le trophée),
     ONDE lumineuse dorée (anneau qui s'étend à chaque frappe du titre). Aucune lumière ajoutée (nombre de lumières constant). */
import { clamp, lerp, smoother, easeOut, prng, texCanvas } from './arene_outils.js';

export function choregraphie(L, Gl, { yPose, yPlateau, zTrophee, yHaut, echInit = 0.22 }) {
  const ts = L.trophee_sort, tDecol = ts + 0.8, th = Gl.trophee_haut, dLev = th - tDecol;
  const Z_SORTIE = 24;                                                          // plateau sorti : la coupe est à 24 cm du centre (porte à 14,3)
  const tiroir = (t) => (Z_SORTIE - zTrophee) * smoother((t - ts) / 0.8) * (1 - smoother((t - (ts + 1.25)) / 0.6));
  const enfonce = (t) => smoother((t - (ts + 1.85)) / 1.0);
  const yBase0 = yPose + yPlateau;
  function trophee(t) {
    if (t < L.entrouvre - 0.1) return null;
    const lueur = smoother((t - L.entrouvre) / (L.ouvert - L.entrouvre));
    if (t < tDecol) {                                                           // posée sur le plateau
      return { pos: [0, yBase0, zTrophee + tiroir(t)], s: echInit, rot: 0.35 * t, aura: 0.5 * lueur, rayons: 0.35 * lueur * smoother((t - ts) / 0.5), colonne: 0, brille: 0 };
    }
    const u = clamp((t - tDecol) / dLev);
    const montee = smoother(u / 0.85), recul = smoother((u - 0.48) / 0.52);      // monte vite : le socle passe au-dessus du linteau avant que la coupe, en grandissant, ne le surplombe
    const flotte = t > th ? 0.7 * Math.sin((t - th) * 1.9) * smoother((t - th) / 0.6) : 0;
    const posee = -0.9 * Math.exp(-Math.max(0, t - th) * 5) * Math.sin(Math.max(0, t - th) * 9);   // petit « ancrage » amorti à l'arrivée
    return {
      pos: [0, lerp(yBase0, yHaut, montee) + flotte + (t > th ? posee : 0), Z_SORTIE * (1 - recul)],
      s: lerp(echInit, 1, smoother((u - 0.05) / 0.85)),
      rot: 0.35 * t + 2 * Math.PI * smoother(u),
      aura: lerp(0.5, 1, u), rayons: lerp(0.35, 1, smoother(u / 0.6)), colonne: smoother((u - 0.55) / 0.45), brille: 0,
    };
  }
  return { tiroir, enfonce, trophee, Z_SORTIE };
}

export function creerEffetsGloire(THREE, { demiH = 540 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'effets-gloire';
  const alea = prng('feux-gloire');

  /* ── feux d'artifice : 9 salves × (110 étincelles + 8 points de fusée) ── */
  const SALVES = 9, NE = 110, NFU = 8, NT = SALVES * (NE + NFU);
  const aDir = new Float32Array(NT * 3), aB = new Float32Array(NT * 4), aCol = new Float32Array(NT * 3), aK = new Float32Array(NT * 2);
  const PALETTE = [[1, 0.82, 0.35], [1, 0.9, 0.55], [1, 0.72, 0.25], [1, 0.97, 0.85]];
  const centres = [];
  for (let b = 0; b < SALVES; b++) {
    const a = b * 2.4 + alea() * 0.6, r = 40 + alea() * 90;
    centres.push({ c: [Math.cos(a) * r, 175 + alea() * 85, Math.sin(a) * r], dt: [0, 0.35, 0.75, 1.15, 1.6, 2.05, 2.6, 3.1, 3.6][b] + alea() * 0.12, v: 0.8 + alea() * 0.45 });
  }
  let n = 0;
  centres.forEach((B, b) => {
    const pal = PALETTE[b % PALETTE.length];
    for (let i = 0; i < NE + NFU; i++, n++) {
      const fusee = i >= NE;
      // directions quasi uniformes sur la sphère (spirale de Fibonacci + bruit)
      const k = fusee ? 0 : i, z = 1 - 2 * (k + 0.5) / NE, rr = Math.sqrt(Math.max(0, 1 - z * z)), ph = k * 2.399963 + alea() * 0.2;
      const v = B.v * (0.85 + alea() * 0.3);
      aDir.set(fusee ? [(alea() - 0.5) * 0.4, (i - NE) / NFU, (alea() - 0.5) * 0.4] : [Math.cos(ph) * rr * v, z * v, Math.sin(ph) * rr * v], n * 3);
      aB.set([...B.c, B.dt], n * 4);
      const blanc = alea() < 0.18;
      aCol.set(blanc ? [1, 1, 1] : pal, n * 3);
      aK.set([fusee ? 1 : 0, alea()], n * 2);
    }
  });
  const geoF = new THREE.BufferGeometry();
  geoF.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NT * 3), 3));
  geoF.setAttribute('aDir', new THREE.BufferAttribute(aDir, 3)); geoF.setAttribute('aB', new THREE.BufferAttribute(aB, 4));
  geoF.setAttribute('aCol', new THREE.BufferAttribute(aCol, 3)); geoF.setAttribute('aK', new THREE.BufferAttribute(aK, 2));
  const matF = new THREE.ShaderMaterial({
    uniforms: { t: { value: -10 }, demiH: { value: demiH }, force: { value: 0 } },
    vertexShader: `attribute vec3 aDir; attribute vec4 aB; attribute vec3 aCol; attribute vec2 aK; uniform float t, demiH, force; varying vec3 vC; varying float vA;
      void main(){
        float tau = t - aB.w; vec3 p; float a = 0.0; float sz = 3.0;
        if (aK.x > 0.5) {                                   // fusée : monte 0,55 s avant l'explosion (traînée de 8 points)
          float u = clamp(-tau / 0.55, 0.0, 1.0); float lag = aDir.y * 0.08;
          float uu = clamp(u + lag, 0.0, 1.0);
          p = aB.xyz - vec3(aDir.x * 10.0 * uu, 150.0 * uu * uu, aDir.z * 10.0 * uu);
          a = (tau < 0.0 && tau > -0.55) ? (1.0 - aDir.y * 0.85) * 0.9 : 0.0; sz = 4.5 - 2.5 * aDir.y;
        } else {
          float tt = max(tau, 0.0); float d = 1.0 - exp(-tt * 2.4);
          p = aB.xyz + aDir * 80.0 * d - vec3(0.0, 11.0 * tt * tt, 0.0);
          float vie = 2.3 + aK.y * 0.6;
          a = tau >= 0.0 ? (1.0 - smoothstep(vie * 0.4, vie, tt)) * (0.7 + 0.3 * sin(tt * 38.0 + aK.y * 60.0)) : 0.0;
          a *= 1.0 + 1.5 * exp(-tt * 9.0);                 // éclair d'ouverture
          sz = mix(5.5, 2.4, clamp(tt / vie, 0.0, 1.0));
        }
        vA = a * force; vC = aCol;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float z = max(-mv.z, 1.0); gl_PointSize = clamp(sz * projectionMatrix[1][1] * demiH / z, 0.0, 22.0);
        if (vA < 0.003) gl_PointSize = 0.0;
      }`,
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 14.0); gl_FragColor = vec4(vC * 2.2 * g * vA, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const feux = new THREE.Points(geoF, matF); feux.frustumCulled = false; groupe.add(feux);

  /* ── faisceaux volumétriques : cônes ouverts, sommet au portique, pied sur la cible ── */
  const matFx = new THREE.ShaderMaterial({
    uniforms: { force: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV; uniform float force, t;
      void main(){ float bord = pow(abs(dot(vN, vV)), 2.0); float l = smoothstep(0.0, 0.25, 1.0 - vY) * (0.35 + 0.65 * vY);
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.66) * force * bord * l, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const geoC = new THREE.CylinderGeometry(1.8, 15, 1, 32, 1, true); geoC.translate(0, -0.5, 0);      // sommet en (0,0,0), pied en y = −1
  const SOURCES = [[-150, 274, -150], [150, 274, -150], [-150, 274, 150], [150, 274, 150], [0, 274, -150], [-150, 274, 0]];
  const faisceaux = SOURCES.map((s) => { const m = new THREE.Mesh(geoC, matFx); m.position.set(...s); m.frustumCulled = false; groupe.add(m); return m; });

  /* ── onde lumineuse dorée (sprite annulaire, toujours face caméra) ── */
  const texOnde = texCanvas(THREE, 256, 256, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.5);
    d.addColorStop(0, 'rgba(255,220,140,0)'); d.addColorStop(0.62, 'rgba(255,230,160,.55)'); d.addColorStop(0.8, 'rgba(255,250,220,1)'); d.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const ondes = [0, 1].map(() => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOnde, color: new THREE.Color('#ffd27a').multiplyScalar(1.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));
    sp.renderOrder = 6; groupe.add(sp); return sp;
  });

  const q = new THREE.Quaternion(), bas = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3();
  function maj(t, e = {}) {
    groupe.visible = true;
    // feux
    const f0 = e.feux ?? Infinity;
    matF.uniforms.t.value = t - f0; matF.uniforms.force.value = e.forceFeux ?? 0;
    feux.visible = (e.forceFeux ?? 0) > 0.01 && t > f0 - 0.6 && t < f0 + 7.5;
    // faisceaux
    const fz = clamp(e.faisceaux ?? 0), c = e.cible || [0, 60, 0];
    matFx.uniforms.force.value = 0.32 * fz; matFx.uniforms.t.value = t;
    faisceaux.forEach((m, i) => {
      m.visible = fz > 0.01;
      if (!m.visible) return;
      const balaye = 0.06 * Math.sin(t * 0.8 + i * 1.7);
      dir.set(c[0] - m.position.x + 9 * Math.sin(t * 0.6 + i), c[1] - m.position.y, c[2] - m.position.z + 9 * Math.cos(t * 0.5 + i * 2.1));
      const lg = dir.length(); dir.normalize(); q.setFromUnitVectors(bas, dir); m.quaternion.copy(q);
      m.scale.set(1 + balaye, lg, 1 + balaye);
    });
    // ondes
    (e.ondes || []).slice(0, 2).forEach((t0, i) => {
      const sp = ondes[i], a = t - t0, u = clamp(a / 0.45);
      sp.visible = a >= 0 && a < 0.45; sp.position.set(...c);
      sp.material.opacity = 0.75 * Math.pow(1 - u, 2.2) * (e.forceOndes ?? 1); sp.scale.setScalar(18 + 95 * easeOut(u));
    });
    for (let i = (e.ondes || []).length; i < 2; i++) ondes[i].visible = false;
  }
  return { groupe, maj };
}
