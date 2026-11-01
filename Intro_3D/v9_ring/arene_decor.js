/* DÉCOR « ARÈNE BONBON NÉON » du segment arène (V9 Ring) — hommage ORIGINAL aux rings de boxe des jeux de combat (aucun emblème,
   aucun texte de jeu). Salle entièrement éclairée : brume violette (#6a2fd1 → #c03aa8), néons rose #ff3fa4 / cyan #2de2ff, tapis
   bleu roi #2a5bff, pyro jaune #ffd23d, habillage or #ffc83d (Fredoka), touches de Noël (guirlandes, neige, sapin géant).

   Repère : 1 unité = 1 cm ; sol de la salle y = 0 ; dessus du tapis y = G.MAT ; centre du ring à l'origine.
   Passerelles sur les 4 axes (côté s : angle s·90°, direction (cos, sin) dans le plan x-z) ; passerelle principale = côté 0 (+x).

   creerDecor(ctx, { logoImg }) → { groupe, G, lumieres, obstacles (fixes), cordes (segments), poteaux, sol(x, z, t), maj(t, e) }
   maj(t, e) est une fonction PURE : e = { flammes: [4], ecran: clé d'affichage, debout, confettis, neige, chuteCordes, pont,
   spot, ambiance, laser } ; tout ce qui est touché est remis à chaque image. Nombre de lumières constant (9). */
import { clamp, lerp, smoother, doux, prng, texCanvas, haloSprite, fusionner, obbFixe, DEG } from './arene_outils.js';
import { creerConfettis } from './ouverture_spectacle.js';

/** Cotes de l'arène (cm). */
export const G = Object.freeze({
  MAT: 22, DEMI: 125, CORDE: 121, HCORDES: [6, 11, 16], RCORDE: 0.6, POTEAU: 122.5, HPOTEAU: 20, RPOTEAU: 2.2,
  RPARK: 50, RLOGO: 34, RARC: [37, 42],
  RLAND: 78, RLIP: 153.3, RPIED: 178.3, HRAMPE: 10, LRAMPE: 25, DEMI_PASS: 20, RFIN_PASS: 330, RTUNNEL: 272,
  RGRADIN: 345, RANGS: 10, PAS_RANG: 24, MONTE_RANG: 15,
});
export const COULEURS = { rose: '#ff3fa4', cyan: '#2de2ff', bleu: '#2a5bff', jaune: '#ffd23d', or: '#ffc83d', violet: '#6a2fd1', magenta: '#c03aa8' };
const ARC5 = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'];
const POTEAUX = ['#ff3b3b', '#3f7bff', '#ffd23d', '#35e07a'];

/** Hauteur de la rampe (au-dessus du tapis) à la distance r du centre, sur l'axe d'une passerelle. */
export const hauteurRampe = (r) => (r >= G.RLIP && r <= G.RPIED ? G.HRAMPE * Math.pow((G.RPIED - r) / G.LRAMPE, 2) : 0);
export const penteRampe = (r) => (r >= G.RLIP && r <= G.RPIED ? 2 * G.HRAMPE * (G.RPIED - r) / (G.LRAMPE * G.LRAMPE) : 0);   // dz / d(−r)

export function creerDecor(ctx, { logoImg }) {
  const { THREE } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'arene-decor';
  const rnd = prng('arene-decor');
  const C = (c) => new THREE.Color(c);
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: ctx.envMap, envMapIntensity: 0.28, ...o });     // IBL néon atténuée : couleurs franches, rien de délavé
  const emis = (c, k = 1) => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(k), toneMapped: false });
  const axe = (s) => [Math.cos(s * Math.PI / 2), Math.sin(s * Math.PI / 2)];
  const rotAxe = (s) => -s * Math.PI / 2;                     // rotation y qui aligne +x local sur l'axe s
  const obstacles = [];

  /* ═════════════ ciel / dôme de la salle (jamais noir) ═════════════ */
  const matDome = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, lum: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform float t, lum;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vP); float a = atan(d.z, d.x);
        vec3 vi = vec3(0.30, 0.13, 0.62), ma = vec3(0.62, 0.17, 0.52), ro = vec3(1.0, 0.36, 0.72);
        vec3 c = mix(ma * 1.05, vi, smoothstep(0.0, 0.55, d.y));
        c = mix(c, vi * 0.75, smoothstep(0.5, 1.0, d.y));
        c += ro * 0.35 * exp(-pow(d.y / 0.12, 2.0));                                        // horizon rosé (la brume)
        float rais = pow(0.5 + 0.5 * cos(a * 9.0 + t * 0.35), 30.0) * smoothstep(0.05, 0.6, d.y);
        c += mix(vec3(0.18, 0.89, 1.0), ro, step(0.0, sin(a * 4.5))) * rais * 0.35;            // faisceaux de projecteurs dans la brume
        vec2 q = vec2(a * 60.0, d.y * 80.0); float e = pow(h2(floor(q)), 60.0) * smoothstep(0.25, 0.8, d.y);
        c += vec3(1.0, 0.9, 1.0) * e * (0.6 + 0.4 * sin(t * 3.0 + h2(floor(q) + 3.0) * 6.28));
        gl_FragColor = vec4(c * lum, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), matDome); dome.renderOrder = -10; dome.frustumCulled = false; groupe.add(dome);

  /* ═════════════ sol de la salle : dalle laquée prune + grille LED ═════════════ */
  const texSol = texCanvas(THREE, 512, 512, (g, w, h) => {
    g.fillStyle = '#3a1764'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,90,200,.55)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.strokeStyle = 'rgba(60,220,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }, { repeter: true });
  texSol.repeat.set(30, 30);
  const sol = new THREE.Mesh(new THREE.CircleGeometry(1300, 64), std({ map: texSol, roughness: 0.32, metalness: 0.25, emissive: C('#ff3fa4'), emissiveMap: texSol, emissiveIntensity: 0.1 }));
  sol.rotation.x = -Math.PI / 2; groupe.add(sol);

  /* ═════════════ LE RING ═════════════ */
  const ring = new THREE.Group(); ring.name = 'ring'; groupe.add(ring);
  // plateforme + jupe « GRAND PRIX DE NOËL » en lettres or
  const texJupe = texCanvas(THREE, 2048, 180, (g, w, h) => {
    const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#3a1aa0'); d.addColorStop(1, '#1d0f5c'); g.fillStyle = d; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff3fa4'; g.fillRect(0, 0, w, 10); g.fillStyle = '#2de2ff'; g.fillRect(0, h - 8, w, 8);
    g.font = '700 118px "Fredoka", "Nunito", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = '14px';
    g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#2a0f55'; g.strokeText('GRAND PRIX DE NOËL', w / 2, h / 2 + 6);
    const or = g.createLinearGradient(0, h * 0.2, 0, h * 0.85); or.addColorStop(0, '#fff1a8'); or.addColorStop(0.45, '#ffc83d'); or.addColorStop(1, '#e08a10');
    g.fillStyle = or; g.fillText('GRAND PRIX DE NOËL', w / 2, h / 2 + 6);
    for (const x of [90, w - 90]) { g.fillStyle = '#ffd23d'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 18 : 44; g.lineTo(x + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } g.fill(); }
  });
  const matJupe = std({ map: texJupe, roughness: 0.6, metalness: 0.1, emissive: C('#ffffff'), emissiveMap: texJupe, emissiveIntensity: 0.55 });
  for (let s = 0; s < 4; s++) {
    const [ax, az] = axe(s);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * G.DEMI, G.MAT - 1.5), matJupe);
    m.position.set(ax * (G.DEMI + 0.05), (G.MAT - 1.5) / 2, az * (G.DEMI + 0.05)); m.rotation.y = rotAxe(s) + Math.PI / 2; ring.add(m);
  }
  const plateau = new THREE.Mesh(new THREE.BoxGeometry(2 * G.DEMI - 0.4, G.MAT - 1.5, 2 * G.DEMI - 0.4), std({ color: 0x241060, roughness: 0.7 }));
  plateau.position.y = (G.MAT - 1.5) / 2; ring.add(plateau);
  obstacles.push(obbFixe('plateforme du ring', [0, (G.MAT - 1.5) / 2, 0], [G.DEMI, (G.MAT - 1.5) / 2, G.DEMI]));
  // tapis bleu roi : logo officiel au centre + fin cercle de 5 bandes arc-en-ciel (teaser des 5 voies)
  const texTapis = texCanvas(THREE, 2048, 2048, (g, w, h) => {
    const k = w / (2 * G.DEMI), cx = w / 2, cy = h / 2;
    g.fillStyle = '#2350f2'; g.fillRect(0, 0, w, h);
    const r0 = prng('tapis');
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r0() < 0.5 ? '255,255,255' : '10,20,90'},${0.02 + r0() * 0.04})`; g.fillRect(r0() * w, r0() * h, 2 + r0() * 6, 1 + r0() * 2); }
    const vig = g.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.72); vig.addColorStop(0, 'rgba(120,170,255,.18)'); vig.addColorStop(1, 'rgba(10,20,110,.35)'); g.fillStyle = vig; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 14; g.strokeRect(6 * k, 6 * k, w - 12 * k, h - 12 * k);
    g.strokeStyle = 'rgba(255,63,164,.9)'; g.lineWidth = 6; g.strokeRect(10 * k, 10 * k, w - 20 * k, h - 20 * k);
    // cercle arc-en-ciel (5 bandes égales entre RARC[0] et RARC[1])
    const e = (G.RARC[1] - G.RARC[0]) / 5;
    ARC5.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = e * k * 0.92; g.beginPath(); g.arc(cx, cy, (G.RARC[0] + (i + 0.5) * e) * k, 0, Math.PI * 2); g.stroke(); });
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; for (const r of G.RARC) { g.beginPath(); g.arc(cx, cy, r * k, 0, Math.PI * 2); g.stroke(); }
    // disque doux sous le logo puis le logo détouré
    const dd = g.createRadialGradient(cx, cy, 0, cx, cy, G.RLOGO * k * 1.05); dd.addColorStop(0, 'rgba(255,255,255,.22)'); dd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = dd; g.fillRect(0, 0, w, h);
    if (logoImg) { const s = 2 * G.RLOGO * k; g.drawImage(logoImg, cx - s / 2, cy - s / 2, s, s); }
  });
  const tapis = new THREE.Mesh(new THREE.PlaneGeometry(2 * G.DEMI, 2 * G.DEMI), std({ map: texTapis, roughness: 0.8, metalness: 0.0, emissive: C('#ffffff'), emissiveMap: texTapis, emissiveIntensity: 0.06 }));
  tapis.rotation.x = -Math.PI / 2; tapis.position.y = G.MAT; ring.add(tapis);
  const liseret = new THREE.Mesh(new THREE.BoxGeometry(2 * G.DEMI + 1, 1.5, 2 * G.DEMI + 1), emis('#ff3fa4', 1.4)); liseret.position.y = G.MAT - 1.3;      // bien sous le tapis (aucun z-fighting) ring.add(liseret);

  // poteaux aux couleurs rouge, bleu, jaune, vert + coussins
  const poteaux = [];
  const coins = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  coins.forEach(([sx, sz], i) => {
    const x = sx * G.POTEAU, z = sz * G.POTEAU;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(G.RPOTEAU, G.RPOTEAU * 1.15, G.HPOTEAU, 20), std({ color: C(POTEAUX[i]), roughness: 0.25, metalness: 0.6 }));
    p.position.set(x, G.MAT + G.HPOTEAU / 2, z); ring.add(p);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(G.RPOTEAU * 1.25, 18, 10), emis(POTEAUX[i], 1.3)); cap.position.set(x, G.MAT + G.HPOTEAU + 0.8, z); ring.add(cap);
    for (const h of G.HCORDES) {
      const cu = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 3.6), std({ color: C(POTEAUX[i]).lerp(C('#ffffff'), 0.25), roughness: 0.55 }));
      cu.position.set(x - sx * 1.2, G.MAT + h, z - sz * 1.2); cu.rotation.y = Math.PI / 4; ring.add(cu);
    }
    poteaux.push({ nom: 'poteau ' + ['rouge', 'bleu', 'jaune', 'vert'][i], p0: [x, G.MAT, z], p1: [x, G.MAT + G.HPOTEAU + 2, z], r: G.RPOTEAU * 1.7 });
  });
  // cordes : 3 rangs × 4 côtés, blanches gainées rouge/bleu + guirlandes lumineuses enroulées
  const cordesG = new THREE.Group(); cordesG.name = 'cordes'; ring.add(cordesG);
  const cordes = [];
  const geoCorde = new THREE.CylinderGeometry(G.RCORDE, G.RCORDE, 2 * G.POTEAU - 4, 12, 1);
  const matsCorde = [std({ color: 0xf4f4ff, roughness: 0.4 }), std({ color: 0xff2a3d, roughness: 0.35 }), std({ color: 0x2f5bff, roughness: 0.35 })];
  const ptsGuirlande = [], colGuirlande = [], phGuirlande = [];
  const PALG = [[1, 0.25, 0.25], [1, 0.82, 0.25], [0.3, 1, 0.45], [0.3, 0.75, 1], [1, 0.35, 0.8]];
  for (let s = 0; s < 4; s++) {
    const [ax, az] = axe(s), tx = -az, tz = ax;
    G.HCORDES.forEach((h, j) => {
      const g = new THREE.Group(); g.position.set(ax * G.CORDE, G.MAT + h, az * G.CORDE); g.rotation.y = rotAxe(s);
      const m = new THREE.Mesh(geoCorde, matsCorde[j === 1 ? 0 : (s % 2 ? 2 : 1)]); m.rotation.x = Math.PI / 2; g.add(m);
      cordesG.add(g);
      const demi = G.POTEAU - 2;
      cordes.push({ nom: `corde ${j + 1} côté ${s}`, g, s, j, base: g.position.clone(), p0: [ax * G.CORDE - tx * demi, G.MAT + h, az * G.CORDE - tz * demi], p1: [ax * G.CORDE + tx * demi, G.MAT + h, az * G.CORDE + tz * demi] });
      // guirlande : hélice de petites ampoules autour de la corde (repère local du groupe : corde le long de z)
      const n = 70;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, z = -demi + 2 * demi * u, a = u * Math.PI * 2 * 22 + j;
        ptsGuirlande.push({ s, j, local: [Math.cos(a) * 1.05, Math.sin(a) * 1.05, z] });
        const c = PALG[(i + j + s) % PALG.length]; colGuirlande.push(...c); phGuirlande.push(rnd() * 6.28);
      }
    });
  }
  const geoG = new THREE.BufferGeometry();
  const posG = new Float32Array(ptsGuirlande.length * 3);
  geoG.setAttribute('position', new THREE.BufferAttribute(posG, 3));
  geoG.setAttribute('couleur', new THREE.Float32BufferAttribute(colGuirlande, 3));
  geoG.setAttribute('phase', new THREE.Float32BufferAttribute(phGuirlande, 1));
  const demiH = ctx.H / 2;
  const matG = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, demiH: { value: demiH }, force: { value: 1 } },
    vertexShader: `attribute vec3 couleur; attribute float phase; uniform float t, demiH, force; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float z = max(-mv.z, 1.0);
        gl_PointSize = clamp(1.6 * projectionMatrix[1][1] * demiH / z, 1.5, 22.0);
        vC = couleur * (0.55 + 0.45 * sin(t * 3.1 + phase)) * 2.4 * force; }`,
    fragmentShader: 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 14.0); gl_FragColor = vec4(vC * g, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const guirlandes = new THREE.Points(geoG, matG); guirlandes.frustumCulled = false; ring.add(guirlandes);
  const vTmp = new THREE.Vector3();
  function placerGuirlandes() {
    for (let i = 0; i < ptsGuirlande.length; i++) {
      const p = ptsGuirlande[i], g = cordes[p.s * 3 + p.j].g;
      vTmp.set(...p.local).applyEuler(g.rotation).add(g.position);
      posG[i * 3] = vTmp.x; posG[i * 3 + 1] = vTmp.y; posG[i * 3 + 2] = vTmp.z;
    }
    geoG.attributes.position.needsUpdate = true;
  }

  /* ═════════════ PASSERELLES LED, RAMPES-TREMPLINS, TUNNELS, ENCEINTES, FLAMMES ═════════════ */
  const matPass = (k) => new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, c1: { value: C(k % 2 ? COULEURS.cyan : COULEURS.rose) }, c2: { value: C(k % 2 ? COULEURS.rose : COULEURS.cyan) }, force: { value: 1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vU; uniform float t, force; uniform vec3 c1, c2;
      void main(){ float x = vU.x * 18.0 + t * 2.2; float b = fract(x);
        float ch = smoothstep(0.0, 0.08, b) * (1.0 - smoothstep(0.42, 0.5, b));
        float bord = smoothstep(0.86, 0.97, abs(vU.y - 0.5) * 2.0);
        vec3 base = mix(vec3(0.16, 0.08, 0.32), c1 * 0.55, ch);
        vec3 c = base + c2 * bord * 1.6 + c1 * 0.12;
        float chev = step(abs(fract(vU.x * 18.0 + t * 2.2 + abs(vU.y - 0.5) * 1.6) - 0.5), 0.08) * (1.0 - bord);
        c += c1 * chev * 0.9;
        gl_FragColor = vec4(c * force, 1.0); }`,
  });
  const passerelles = [];
  const longPass = G.RFIN_PASS - G.RPIED;
  const matStruct = std({ color: 0x2b1658, roughness: 0.45, metalness: 0.5 });
  const matChrome = std({ color: 0xd8d8f0, roughness: 0.18, metalness: 1.0, envMapIntensity: 0.9, emissive: C('#4a2a7a'), emissiveIntensity: 0.6 });
  for (let s = 0; s < 4; s++) {
    const [ax, az] = axe(s), ry = rotAxe(s);
    const pg = new THREE.Group(); pg.rotation.y = ry; groupe.add(pg);
    // tablier : de RPIED à RFIN_PASS (le dessus est à MAT)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(longPass, 3, 2 * G.DEMI_PASS), matStruct); deck.position.set(G.RPIED + longPass / 2, G.MAT - 1.5, 0); pg.add(deck);
    const m = matPass(s);
    const dessus = new THREE.Mesh(new THREE.PlaneGeometry(longPass, 2 * G.DEMI_PASS), m); dessus.rotation.x = -Math.PI / 2; dessus.rotation.z = Math.PI;
    dessus.position.set(G.RPIED + longPass / 2, G.MAT + 0.02, 0); pg.add(dessus);
    for (let i = 0; i < 4; i++) { const pil = new THREE.Mesh(new THREE.BoxGeometry(5, G.MAT - 3, 5), matChrome); pil.position.set(G.RPIED + 10 + i * (longPass - 20) / 3, (G.MAT - 3) / 2, 0); pg.add(pil); }
    // rambardes néon
    for (const sz of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(longPass + G.LRAMPE, 0.8, 0.8), emis(s % 2 ? COULEURS.rose : COULEURS.cyan, 1.6)); r.position.set(G.RLIP + (longPass + G.LRAMPE) / 2, G.MAT + 0.4, sz * (G.DEMI_PASS + 0.4)); pg.add(r); }
    obstacles.push(obbFixe('passerelle ' + s, [ax * (G.RPIED + longPass / 2), G.MAT - 1.5, az * (G.RPIED + longPass / 2)], [longPass / 2, 1.5, G.DEMI_PASS], ry));
    // tremplin : profil parabolique (pied en RPIED, lèvre en RLIP, hauteur HRAMPE), extrudé sur la largeur
    const rampe = new THREE.Group(); rampe.position.set(0, G.MAT, 0); pg.add(rampe);
    const forme = new THREE.Shape(); const N = 24;
    forme.moveTo(G.RPIED, 0);
    for (let i = 0; i <= N; i++) { const r = G.RPIED - G.LRAMPE * i / N; forme.lineTo(r, hauteurRampe(r)); }
    forme.lineTo(G.RLIP, -3); forme.lineTo(G.RPIED, -3); forme.closePath();
    const geoR = new THREE.ExtrudeGeometry(forme, { depth: 2 * G.DEMI_PASS, bevelEnabled: false, curveSegments: 4 }); geoR.translate(0, 0, -G.DEMI_PASS);
    const texR = texCanvas(THREE, 256, 256, (g, w, h) => {
      g.fillStyle = s % 2 ? '#1fb8e0' : '#e8308f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23d'; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 32 + 64, h / 2); g.lineTo(i * 64 + 32, h); g.lineTo(i * 64, h); g.lineTo(i * 64 + 64, h / 2); g.closePath(); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    }, { repeter: true });
    texR.repeat.set(0.05, 0.05);
    const matR = std({ map: texR, roughness: 0.35, metalness: 0.2, emissive: C('#ffffff'), emissiveMap: texR, emissiveIntensity: 0.35 });
    rampe.add(new THREE.Mesh(geoR, matR));
    const levre = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 2 * G.DEMI_PASS + 1), emis(COULEURS.jaune, 2.2)); levre.position.set(G.RLIP + 0.4, G.HRAMPE - 0.3, 0); rampe.add(levre);
    const appui = new THREE.Mesh(new THREE.BoxGeometry(G.LRAMPE * 0.6, G.MAT, 2 * G.DEMI_PASS * 0.8), matStruct); appui.position.set(G.RPIED - G.LRAMPE * 0.3, -G.MAT / 2 - 3, 0); rampe.add(appui);
    // fosse lumineuse entre le ring et le tremplin (là où la voiture vole)
    const fosse = new THREE.Mesh(new THREE.PlaneGeometry(G.RLIP - G.DEMI, 2 * G.DEMI_PASS + 20), emis(COULEURS.magenta, 0.9)); fosse.rotation.x = -Math.PI / 2; fosse.position.set((G.RLIP + G.DEMI) / 2, 0.3, 0); pg.add(fosse);
    // tunnel : arche lumineuse + voûte intérieure dégradée (jamais de trou noir)
    const tun = new THREE.Group(); tun.position.set(G.RTUNNEL, G.MAT, 0); pg.add(tun);
    const arche = new THREE.Mesh(new THREE.TorusGeometry(34, 3, 12, 40, Math.PI), emis(s % 2 ? COULEURS.cyan : COULEURS.rose, 2.0)); arche.rotation.y = Math.PI / 2; tun.add(arche);
    const arche2 = new THREE.Mesh(new THREE.TorusGeometry(38, 1.2, 8, 40, Math.PI), emis(COULEURS.or, 1.6)); arche2.rotation.y = Math.PI / 2; arche2.position.x = -1; tun.add(arche2);
    for (const sz of [-1, 1]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(8, G.MAT, 8), matStruct); pil.position.set(0, -G.MAT / 2, sz * 34); tun.add(pil); }
    const texVoute = texCanvas(THREE, 64, 256, (g, w, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, s % 2 ? '#2de2ff' : '#ff3fa4'); d.addColorStop(0.5, '#a43cd8'); d.addColorStop(1, '#ffd23d'); g.fillStyle = d; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, y, w, 5); } });
    const voute = new THREE.Mesh(new THREE.CylinderGeometry(33, 33, 70, 24, 1, true, 0, Math.PI), new THREE.MeshBasicMaterial({ map: texVoute, side: THREE.BackSide, toneMapped: false }));
    voute.rotation.z = Math.PI / 2; voute.rotation.y = 0; voute.position.set(35, 0, 0); voute.rotation.x = Math.PI / 2; tun.add(voute);
    const fondTun = new THREE.Mesh(new THREE.CircleGeometry(33, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: C('#ff7ad0').multiplyScalar(1.1), toneMapped: false }));
    fondTun.rotation.y = -Math.PI / 2; fondTun.position.set(70, 0, 0); if (s !== 0) tun.add(fondTun);     // tunnel principal ouvert : la piste du départ le traverse
    obstacles.push(obbFixe('pilier tunnel ' + s + 'a', [ax * G.RTUNNEL - az * 34, G.MAT / 2, az * G.RTUNNEL + ax * 34], [4, G.MAT / 2 + 40, 4], ry));
    obstacles.push(obbFixe('pilier tunnel ' + s + 'b', [ax * G.RTUNNEL + az * 34, G.MAT / 2, az * G.RTUNNEL - ax * 34], [4, G.MAT / 2 + 40, 4], ry));
    // murs d'enceintes de part et d'autre de l'arche
    const texHP = texCanvas(THREE, 128, 256, (g, w, h) => {
      g.fillStyle = '#231a33'; g.fillRect(0, 0, w, h);
      for (const [y, r] of [[56, 40], [150, 40], [226, 18]]) { const d = g.createRadialGradient(64, y, 2, 64, y, r); d.addColorStop(0, '#6b5d80'); d.addColorStop(0.5, '#140f1e'); d.addColorStop(0.9, '#3a3050'); d.addColorStop(1, '#ff3fa4'); g.fillStyle = d; g.beginPath(); g.arc(64, y, r, 0, 7); g.fill(); }
      g.strokeStyle = '#2de2ff'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    });
    const matHP = std({ map: texHP, roughness: 0.6, metalness: 0.2, emissive: C('#ffffff'), emissiveMap: texHP, emissiveIntensity: 0.25 });
    for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const hp = new THREE.Mesh(new THREE.BoxGeometry(14, 26, 13), matHP);
      hp.position.set(G.RTUNNEL - 6 + j * 15, G.MAT + 13 + i * 26.5, sz * (52 + j * 0)); hp.rotation.y = sz * 0.0; pg.add(hp);
    }
    passerelles.push({ s, mat: m, pg, rampe, tun });
  }
  // pont de départ (côté principal, glisse du dessous de la passerelle) : couvre la fosse et le tremplin
  const pont = new THREE.Group(); pont.name = 'pont-depart'; groupe.add(pont);
  const longPont = G.RPIED - G.DEMI + 2;
  const LPONT = 2 * G.DEMI_PASS + 24;
  const deckPont = new THREE.Mesh(new THREE.BoxGeometry(longPont, 2.5, LPONT), matStruct); deckPont.position.set(longPont / 2, -1.25, 0); pont.add(deckPont);
  const matPont = matPass(0); const dessusPont = new THREE.Mesh(new THREE.PlaneGeometry(longPont, LPONT), matPont); dessusPont.rotation.x = -Math.PI / 2; dessusPont.rotation.z = Math.PI; dessusPont.position.set(longPont / 2, 0.03, 0); pont.add(dessusPont);

  /* ═════════════ JETS DE FLAMMES (pyro) aux tunnels ═════════════ */
  const geoFlamme = new THREE.CylinderGeometry(1.5, 7, 70, 20, 8, true); geoFlamme.translate(0, 35, 0);
  const matFlamme = () => new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 } },
    vertexShader: 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec2 vU; varying vec3 vN; varying vec3 vV; uniform float t, force;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){ float y = vU.y; float n = vn(vec2(vU.x * 9.0, y * 6.0 - t * 9.0)) * 0.6 + vn(vec2(vU.x * 21.0, y * 13.0 - t * 15.0)) * 0.4;
        float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
        float haut = (1.0 - smoothstep(0.25 + 0.5 * force, 0.95 * force + 0.05, y + n * 0.25));
        vec3 c = mix(vec3(1.0, 0.95, 0.75), vec3(1.0, 0.55, 0.08), smoothstep(0.0, 0.45, y));
        c = mix(c, vec3(0.9, 0.12, 0.25), smoothstep(0.45, 0.9, y));
        gl_FragColor = vec4(c * face * haut * (0.6 + 0.8 * n) * 2.2 * force, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const flammes = [];
  for (let s = 0; s < 4; s++) {
    const [ax, az] = axe(s);
    const jets = [];
    for (const sz of [-1, 1]) {
      const m = matFlamme(), f = new THREE.Mesh(geoFlamme, m);
      f.position.set(ax * (G.RTUNNEL - 4) - az * sz * 52, G.MAT + 80, az * (G.RTUNNEL - 4) + ax * sz * 52); groupe.add(f); jets.push({ f, m });
    }
    flammes.push(jets);
  }

  /* ═════════════ LASERS VERTS ═════════════ */
  const matLaser = new THREE.MeshBasicMaterial({ color: C('#39ff6a').multiplyScalar(2.2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const lasers = [];
  const geoLaser = new THREE.CylinderGeometry(0.35, 0.35, 1, 6, 1, true); geoLaser.translate(0, 0.5, 0);
  for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(geoLaser, matLaser); const c = coins[i % 4]; l.position.set(c[0] * 140, 270, c[1] * 140); l.scale.set(1, 1100, 1); groupe.add(l); lasers.push({ l, ph: i * 0.9, c }); }

  /* ═════════════ PORTIQUE D'ÉCLAIRAGE + ÉCRAN GÉANT (4 faces) ═════════════ */
  const portique = new THREE.Group(); portique.position.y = 280; groupe.add(portique);
  for (let s = 0; s < 4; s++) { const [ax, az] = axe(s); const b = new THREE.Mesh(new THREE.BoxGeometry(300, 6, 6), matChrome); b.position.set(ax * 150, 0, az * 150); b.rotation.y = rotAxe(s) + Math.PI / 2; portique.add(b); }
  const lyres = [];
  for (let i = 0; i < 16; i++) { const s = i % 4, u = Math.floor(i / 4) / 3 - 0.5, [ax, az] = axe(s); const l = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), emis(i % 2 ? COULEURS.cyan : COULEURS.rose, 1.8)); l.position.set(ax * 150 - az * u * 260, -6, az * 150 + ax * u * 260); portique.add(l); lyres.push(l); }
  const cvEcran = document.createElement('canvas'); cvEcran.width = 512; cvEcran.height = 288;
  const gE = cvEcran.getContext('2d');
  const texEcran = new THREE.CanvasTexture(cvEcran); texEcran.encoding = THREE.sRGBEncoding; texEcran.anisotropy = 8;
  const ecran = new THREE.Group(); ecran.position.y = 205; groupe.add(ecran);
  const LE = 96, HE = 54;
  const matEcran = new THREE.MeshBasicMaterial({ map: texEcran, toneMapped: false });
  for (let s = 0; s < 4; s++) { const [ax, az] = axe(s); const f = new THREE.Mesh(new THREE.PlaneGeometry(LE, HE), matEcran); f.position.set(ax * (LE / 2 + 0.3), 0, az * (LE / 2 + 0.3)); f.rotation.y = rotAxe(s) + Math.PI / 2; ecran.add(f); }
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(LE + 4, HE + 4, LE + 4), std({ color: 0x1d1240, roughness: 0.4, metalness: 0.6 })); caisse.scale.set(0.985, 1, 0.985); ecran.add(caisse);
  for (const y of [-HE / 2 - 3, HE / 2 + 3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(LE + 8, 2.2, LE + 8), emis(y < 0 ? COULEURS.rose : COULEURS.cyan, 1.8)); b.position.y = y; ecran.add(b); }
  for (const [sx, sz] of coins) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 80, 4), matChrome); c.position.set(sx * 40, 70, sz * 40); ecran.add(c); }
  obstacles.push(obbFixe('écran géant', [0, 205, 0], [LE / 2 + 4, HE / 2 + 4, LE / 2 + 4]));
  let cleEcran = null;
  function dessinerEcran(cle, img, couleurs) {
    if (cle === cleEcran) return; cleEcran = cle;
    const w = cvEcran.width, h = cvEcran.height;
    const d = gE.createLinearGradient(0, 0, w, h); d.addColorStop(0, couleurs[0]); d.addColorStop(1, couleurs[1]); gE.fillStyle = d; gE.fillRect(0, 0, w, h);
    gE.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < w; x += 6) gE.fillRect(x, 0, 2, h);
    if (img && img.naturalWidth) {
      const s = Math.min((w - 40) / img.naturalWidth, (h - 30) / img.naturalHeight);
      gE.save(); gE.shadowColor = 'rgba(0,0,0,.45)'; gE.shadowBlur = 18;
      gE.drawImage(img, w / 2 - img.naturalWidth * s / 2, h / 2 - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s); gE.restore();
    }
    gE.strokeStyle = '#ffc83d'; gE.lineWidth = 10; gE.strokeRect(5, 5, w - 10, h - 10);
    texEcran.needsUpdate = true;
  }

  /* ═════════════ GRADINS + PUBLIC INSTANCIÉ (bonnets, téléphones, éclairé) ═════════════ */
  const gradins = new THREE.Group(); gradins.name = 'gradins'; groupe.add(gradins);
  const SECT = 4, OUV = 22 * DEG;                       // 4 tribunes entre les tunnels (ouverture de 22° autour de chaque axe)
  const matTribune = std({ color: 0x4a1f8f, roughness: 0.55, metalness: 0.2, emissive: C('#5a1a9a'), emissiveIntensity: 0.25 });
  const matBordTrib = emis(COULEURS.cyan, 1.4), matBordTrib2 = emis(COULEURS.rose, 1.4);
  for (let q = 0; q < SECT; q++) {
    const phi0 = q * Math.PI / 2 + OUV / 2, dphi = Math.PI / 2 - OUV;
    for (let i = 0; i < G.RANGS; i++) {
      const r0 = G.RGRADIN + i * G.PAS_RANG, h = 8 + i * G.MONTE_RANG;
      const marche = new THREE.Mesh(new THREE.CylinderGeometry(r0 + G.PAS_RANG, r0 + G.PAS_RANG, h, 48, 1, true, -phi0 - dphi + Math.PI / 2, dphi), matTribune);
      marche.position.y = h / 2; gradins.add(marche);
      const dessus = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + G.PAS_RANG, 48, 1, -phi0 - dphi, dphi), matTribune); dessus.rotation.x = -Math.PI / 2; dessus.position.y = h; gradins.add(dessus);
      const bord = new THREE.Mesh(new THREE.TorusGeometry(r0, 0.7, 4, 64, dphi), i % 2 ? matBordTrib : matBordTrib2); bord.rotation.x = -Math.PI / 2; bord.rotation.z = -phi0 - dphi; bord.position.y = h + 0.5; gradins.add(bord);
    }
  }
  // spectateur : corps (couleur d'instance), tête, bonnet (couleur par instance), pompon/revers blanc
  const mt = (x, y, z, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1));
  const geoSpect = fusionner(THREE, [
    { geo: new THREE.CylinderGeometry(3.0, 3.8, 9, 7), partie: 0, matrice: mt(0, 4.5, 0) },
    { geo: new THREE.BoxGeometry(9.4, 2.4, 3), partie: 0, matrice: mt(0, 8.2, 0) },
    { geo: new THREE.IcosahedronGeometry(2.7, 1), partie: 1, matrice: mt(0, 12, 0) },
    { geo: new THREE.ConeGeometry(2.6, 5, 7), partie: 2, matrice: mt(0.3, 15.6, 0, 0, -0.25) },
    { geo: new THREE.CylinderGeometry(2.85, 2.85, 1.1, 8), partie: 3, matrice: mt(0, 13.6, 0) },
    { geo: new THREE.IcosahedronGeometry(0.95, 0), partie: 3, matrice: mt(1.5, 18, 0) },
  ]);
  const places = [];
  for (let q = 0; q < SECT; q++) {
    const phi0 = q * Math.PI / 2 + OUV / 2, dphi = Math.PI / 2 - OUV;
    for (let i = 0; i < G.RANGS; i++) {
      const r = G.RGRADIN + i * G.PAS_RANG + G.PAS_RANG * 0.5, h = 8 + i * G.MONTE_RANG, n = Math.floor(r * dphi / 10.5);
      for (let k = 0; k < n; k++) places.push({ phi: phi0 + (k + 0.5 + (rnd() - 0.5) * 0.4) / n * dphi, r: r + (rnd() - 0.5) * 3, h });
    }
  }
  const NP = places.length;
  const phaseP = new Float32Array(NP), bonnetP = new Float32Array(NP * 3);
  const PEAU = ['#f2c7a5', '#d9a07a', '#a8714c', '#7a4a2e', '#f6d9c0'];
  const HAUTS = ['#ff3fa4', '#2de2ff', '#ffd23d', '#ffffff', '#35e07a', '#ff7a3d', '#9b6bff', '#3fa9ff'];
  const BONNETS = ['#e8202f', '#e8202f', '#e8202f', '#2de2ff', '#35e07a', '#ffd23d'];
  const peauP = new Float32Array(NP * 3);
  const matPublic = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, debout: { value: 0 }, liesse: { value: 0.3 }, brume: { value: C('#b23fc0') }, densite: { value: 0.0009 } },
    vertexShader: `attribute float partie; attribute float aPhase; attribute vec3 aBonnet; attribute vec3 aPeau; uniform float t, debout, liesse;
      varying vec3 vC; varying vec3 vN; varying float vD;
      void main(){
        vec3 p = position; float lev = debout * (0.5 + 0.5 * smoothstep(0.0, 1.0, fract(aPhase * 3.7)));
        p.y *= 1.0 + 0.32 * lev; p.y += 3.0 * lev;
        float saut = max(0.0, sin(t * (7.0 + aPhase * 3.0) + aPhase * 40.0)) * (liesse + debout) * 1.6;
        p.y += saut;
        vec4 lp = vec4(p, 1.0); vec3 n = normal;
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;
        #endif
        vec3 col = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          col = instanceColor;
        #endif
        vC = partie < 0.5 ? col : (partie < 1.5 ? aPeau : (partie < 2.5 ? aBonnet : vec3(1.0)));
        vec4 mv = modelViewMatrix * lp; vD = -mv.z; vN = normalize(mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying vec3 vN; varying float vD; uniform vec3 brume; uniform float densite;
      void main(){ vec3 n = normalize(vN);
        float l = 0.42 + 0.5 * max(dot(n, normalize(vec3(-0.3, 0.8, -0.5))), 0.0);
        vec3 c = vC * l + vec3(1.0, 0.25, 0.64) * 0.22 * max(n.x, 0.0) + vec3(0.18, 0.89, 1.0) * 0.2 * max(-n.x, 0.0);
        float f = 1.0 - exp(-vD * vD * densite * densite);
        gl_FragColor = vec4(mix(c, brume, clamp(f, 0.0, 0.85)), 1.0); }`,
  });
  const publicM = new THREE.InstancedMesh(geoSpect, matPublic, NP);
  const o3 = new THREE.Object3D(), col = new THREE.Color();
  const telephones = [];
  places.forEach((p, i) => {
    o3.position.set(Math.cos(p.phi) * p.r, p.h, Math.sin(p.phi) * p.r);
    o3.rotation.set(0, -p.phi - Math.PI / 2 + Math.PI, 0); o3.lookAt(0, p.h, 0); o3.rotateY(0);
    const k = 0.92 + rnd() * 0.18; o3.scale.set(k, k, k); o3.updateMatrix(); publicM.setMatrixAt(i, o3.matrix);
    publicM.setColorAt(i, col.set(HAUTS[Math.floor(rnd() * HAUTS.length)]));
    const b = C(BONNETS[Math.floor(rnd() * BONNETS.length)]); bonnetP.set([b.r, b.g, b.b], i * 3);
    const pe = C(PEAU[Math.floor(rnd() * PEAU.length)]); peauP.set([pe.r, pe.g, pe.b], i * 3);
    phaseP[i] = rnd();
    if (rnd() < 0.3) telephones.push([Math.cos(p.phi) * (p.r - 3.5), p.h + 15 + rnd() * 4, Math.sin(p.phi) * (p.r - 3.5), rnd()]);
  });
  geoSpect.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phaseP, 1));
  geoSpect.setAttribute('aBonnet', new THREE.InstancedBufferAttribute(bonnetP, 3));
  geoSpect.setAttribute('aPeau', new THREE.InstancedBufferAttribute(peauP, 3));
  publicM.instanceMatrix.needsUpdate = true; if (publicM.instanceColor) publicM.instanceColor.needsUpdate = true;
  publicM.frustumCulled = false; gradins.add(publicM);
  // lumières de téléphones (points scintillants au-dessus des têtes)
  const geoTel = new THREE.BufferGeometry();
  geoTel.setAttribute('position', new THREE.Float32BufferAttribute(telephones.flatMap((x) => x.slice(0, 3)), 3));
  geoTel.setAttribute('phase', new THREE.Float32BufferAttribute(telephones.map((x) => x[3]), 1));
  const matTel = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, demiH: { value: demiH }, debout: { value: 0 } },
    vertexShader: `attribute float phase; uniform float t, demiH, debout; varying float vA;
      void main(){ vec3 p = position; p.y += debout * 5.0; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float z = max(-mv.z, 1.0);
        gl_PointSize = clamp(2.6 * projectionMatrix[1][1] * demiH / z, 1.5, 9.0); vA = 0.55 + 0.45 * sin(t * (2.0 + phase * 3.0) + phase * 30.0); }`,
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 12.0); gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * 2.2 * vA * g, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const ptsTel = new THREE.Points(geoTel, matTel); ptsTel.frustumCulled = false; gradins.add(ptsTel);
  // mur LED du fond (couronne derrière les tribunes)
  const matMur = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vU; uniform float t; void main(){ float a = vU.x * 40.0 - t * 0.6; float b = 0.5 + 0.5 * sin(a * 6.283);
      vec3 c = mix(vec3(0.42, 0.18, 0.82), vec3(0.75, 0.23, 0.66), vU.y) + mix(vec3(1.0, 0.25, 0.64), vec3(0.18, 0.89, 1.0), step(0.5, fract(vU.x * 20.0))) * b * 0.35 * smoothstep(0.55, 0.95, vU.y);
      gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, fog: false,
  });
  const rMur = G.RGRADIN + G.RANGS * G.PAS_RANG + 30;
  for (let q = 0; q < 4; q++) {                                            // 4 pans : ouvertures dans l'axe des tunnels (la piste sort par +x)
    const phi0 = q * Math.PI / 2 + 7 * DEG, dphi = Math.PI / 2 - 14 * DEG;
    const mur = new THREE.Mesh(new THREE.CylinderGeometry(rMur, rMur, 240, 24, 1, true, Math.PI / 2 - phi0 - dphi, dphi), matMur); mur.position.y = 120; groupe.add(mur);
  }

  /* ═════════════ SAPIN GÉANT LUMINEUX (derrière l'écran, au fond côté −x) ═════════════ */
  const sapin = new THREE.Group(); sapin.position.set(-rMur + 60, 0, 0); groupe.add(sapin);
  const matSapin = new THREE.MeshLambertMaterial({ color: 0x0f5e2a, emissive: C('#1a9a45'), emissiveIntensity: 0.55 });
  for (let i = 0; i < 8; i++) { const r = 175 - i * 21, h = 170 - i * 12; const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 20), matSapin); c.position.y = 70 + i * 72 + h / 2; sapin.add(c); }
  const tronc = new THREE.Mesh(new THREE.CylinderGeometry(18, 22, 80, 10), std({ color: 0x7a4a2a })); tronc.position.y = 40; sapin.add(tronc);
  const nS = 520, posS = [], colS = [], phS = [];
  for (let i = 0; i < nS; i++) {
    const u = rnd(), y = 80 + u * 640, r = (1 - u) * 165 * 0.92 + 4, a = rnd() * 6.283;
    posS.push(Math.cos(a) * r, y, Math.sin(a) * r); const c = PALG[i % PALG.length]; colS.push(...c); phS.push(rnd() * 6.28);
  }
  const geoS = new THREE.BufferGeometry(); geoS.setAttribute('position', new THREE.Float32BufferAttribute(posS, 3)); geoS.setAttribute('couleur', new THREE.Float32BufferAttribute(colS, 3)); geoS.setAttribute('phase', new THREE.Float32BufferAttribute(phS, 1));
  const matS = matG.clone(); matS.uniforms = { t: { value: 0 }, demiH: { value: demiH }, force: { value: 1.2 } };
  matS.vertexShader = matG.vertexShader.replace('1.6 * projectionMatrix', '14.0 * projectionMatrix').replace('22.0', '16.0');
  const lumSapin = new THREE.Points(geoS, matS); lumSapin.frustumCulled = false; sapin.add(lumSapin);
  const etoile = haloSprite(THREE, '#ffd23d', 140, 1); etoile.position.y = 760; sapin.add(etoile);
  const etoileC = new THREE.Mesh(new THREE.OctahedronGeometry(22, 0), emis('#ffe27a', 2.4)); etoileC.position.y = 752; sapin.add(etoileC);

  /* ═════════════ CONFETTIS, NEIGE ═════════════ */
  const confettis = creerConfettis(THREE, { n: 900, x: 0, z: 0, rayon: 420, yHaut: 520, yBas: 0, demiH, graine: 2312 });
  groupe.add(confettis.mesh);
  const nN = 1400, posN = new Float32Array(nN * 3), phN = new Float32Array(nN * 3); const rN = prng('neige');
  for (let i = 0; i < nN; i++) { const r = 340 * Math.sqrt(rN()), a = rN() * 6.283; posN.set([Math.cos(a) * r, rN() * 420, Math.sin(a) * r], i * 3); phN.set([rN() * 6.28, 18 + rN() * 22, 0.8 + rN() * 1.6], i * 3); }
  const geoN = new THREE.BufferGeometry(); geoN.setAttribute('position', new THREE.BufferAttribute(posN, 3)); geoN.setAttribute('phase', new THREE.BufferAttribute(phN, 3));
  const matN = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 }, demiH: { value: demiH } },
    vertexShader: `attribute vec3 phase; uniform float t, force, demiH; varying float vA;
      void main(){ vec3 p = position; p.y = 440.0 - mod(440.0 - p.y + t * phase.y, 440.0); p.x += sin(t * 0.9 + phase.x) * 6.0; p.z += cos(t * 0.7 + phase.x) * 6.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float z = max(-mv.z, 1.0);
        gl_PointSize = clamp(phase.z * projectionMatrix[1][1] * demiH / z, 0.0, 12.0); vA = force * smoothstep(8.0, 30.0, z); }`,
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 10.0); gl_FragColor = vec4(vec3(1.0, 0.97, 1.0) * 1.3 * g * vA, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const neige = new THREE.Points(geoN, matN); neige.frustumCulled = false; groupe.add(neige);

  /* ═════════════ LUMIÈRES (9, nombre constant ; seules les intensités bougent) ═════════════ */
  const spot = new THREE.SpotLight(0xffe6f4, 1.6, 900, 0.5, 0.55, 1.0); spot.position.set(0, 330, 40); spot.target.position.set(0, G.MAT, 0); groupe.add(spot, spot.target);
  const rimC = new THREE.PointLight(0x2de2ff, 1.0, 700, 1.2); rimC.position.set(-200, 160, 200); groupe.add(rimC);
  const rimR = new THREE.PointLight(0xff3fa4, 1.0, 700, 1.2); rimR.position.set(220, 150, -180); groupe.add(rimR);
  const lumTunnels = [0, 1, 2, 3].map((s) => { const [ax, az] = axe(s); const l = new THREE.PointLight(0xff9a3d, 0, 260, 1.6); l.position.set(ax * (G.RTUNNEL - 30), G.MAT + 40, az * (G.RTUNNEL - 30)); groupe.add(l); return l; });
  const lumOr = new THREE.PointLight(0xffc83d, 0, 180, 1.4); lumOr.position.set(0, G.MAT + 20, 0); groupe.add(lumOr);
  const lumSuivi = new THREE.PointLight(0xfff4ea, 0, 140, 1.5); groupe.add(lumSuivi);
  const lumieres = { spot, rimC, rimR, lumTunnels, lumOr, lumSuivi };

  /** Hauteur du sol porteur (pour le contrôle de contact des voitures) ; pont : 0..1 déployé. */
  function solA(x, z, pont = 0) {
    if (Math.abs(x) <= G.DEMI && Math.abs(z) <= G.DEMI) return G.MAT;
    for (let s = 0; s < 4; s++) {
      const [ax, az] = axe(s), r = x * ax + z * az, l = -x * az + z * ax;
      if (s === 0 && pont > 0.999 && r >= G.DEMI && r <= G.RPIED && Math.abs(l) <= G.DEMI_PASS + 12) return G.MAT;
      if (r > 0 && Math.abs(l) <= G.DEMI_PASS) {
        if (s === 0 && pont > 0.999 && r >= G.DEMI && r <= G.RPIED && Math.abs(l) <= G.DEMI_PASS + 12) return G.MAT;
        if (r >= G.RPIED && r <= G.RFIN_PASS + 15) return G.MAT;
        if (r >= G.RLIP && r < G.RPIED) return G.MAT + hauteurRampe(r) * (s === 0 ? 1 - pont : 1);
      }
    }
    return 0;
  }

  /* ═════════════ maj (pure) ═════════════ */
  function maj(t, e) {
    matDome.uniforms.t.value = t; matDome.uniforms.lum.value = e.ambiance ?? 1;
    for (const p of passerelles) p.mat.uniforms.t.value = t;
    matPont.uniforms.t.value = t;
    // cordes qui tombent (départ) : glissent vers l'extérieur et chutent au pied du ring
    const ch = e.chuteCordes || 0;
    for (const c of cordes) {
      const k = clamp(ch * 1.25 - c.j * 0.08 - (c.s % 2) * 0.05), [ax, az] = axe(c.s);
      const sortie = 22 * smoother(k), y = c.base.y - (c.base.y - 1) * (k * k);
      c.g.position.set(c.base.x + ax * sortie, y, c.base.z + az * sortie); c.g.rotation.set(0, rotAxe(c.s), 0.3 * k);
    }
    cordesG.visible = true; placerGuirlandes(); matG.uniforms.t.value = t; matG.uniforms.force.value = 1 - 0.5 * ch;
    // pont + rampe principale
    const pt = e.pont || 0;
    pont.visible = pt > 0.001; pont.position.set(G.DEMI - 1 + (1 - smoother(pt)) * (G.RPIED - G.DEMI), G.MAT, 0);
    passerelles[0].rampe.scale.set(1, Math.max(0.001, 1 - smoother(pt)), 1); passerelles[0].rampe.visible = pt < 0.999;
    // flammes
    for (let s = 0; s < 4; s++) {
      const f = clamp(e.flammes ? e.flammes[s] : 0);
      flammes[s].forEach((j, i) => { j.m.uniforms.t.value = t + i * 1.7 + s; j.m.uniforms.force.value = f; j.f.visible = f > 0.01; j.f.scale.set(1, 0.4 + 0.9 * f, 1); });
      lumTunnels[s].intensity = 2.4 * f + 0.35 * (e.ambiance ?? 1);
    }
    // lasers : balayages lents
    const lz = e.laser ?? 1;
    lasers.forEach((x, i) => {
      x.l.visible = lz > 0.01; x.l.material.opacity = 0.45 * lz;
      const a = Math.sin(t * 0.7 + x.ph) * 0.55, b = 2.1 + Math.cos(t * 0.5 + x.ph * 1.3) * 0.35;
      const dx = -x.c[0], dz = -x.c[1];
      const dir = new THREE.Vector3(dx * Math.cos(a) - dz * Math.sin(a), -Math.cos(b) * 1.4 - 0.5, dz * Math.cos(a) + dx * Math.sin(a)).normalize();
      x.l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    });
    lyres.forEach((l, i) => { l.scale.setScalar(0.85 + 0.25 * Math.sin(t * 4 + i)); });
    // écran géant
    dessinerEcran(e.ecran.cle, e.ecran.img, e.ecran.couleurs);
    ecran.position.y = e.ecranY ?? 205;
    // public
    matPublic.uniforms.t.value = t; matPublic.uniforms.debout.value = e.debout || 0; matPublic.uniforms.liesse.value = e.liesse ?? 0.3;
    matTel.uniforms.t.value = t; matTel.uniforms.debout.value = e.debout || 0; matMur.uniforms.t.value = t;
    matS.uniforms.t.value = t; etoile.material.opacity = 0.85 + 0.15 * Math.sin(t * 2.3); etoileC.rotation.y = t * 0.8;
    confettis.maj(t, e.confettis || 0);
    matN.uniforms.t.value = t; matN.uniforms.force.value = e.neige || 0; neige.visible = (e.neige || 0) > 0.002;
    // lumières
    const amb = e.ambiance ?? 1;
    spot.intensity = (e.spot ?? 1.6); spot.angle = e.spotAngle ?? 0.5;
    rimC.intensity = 1.1 * amb; rimR.intensity = 1.1 * amb;
    lumOr.intensity = e.or || 0; if (e.posOr) lumOr.position.set(...e.posOr);
    lumSuivi.intensity = e.suivi || 0; if (e.posSuivi) lumSuivi.position.set(...e.posSuivi);
  }

  return { groupe, G, lumieres, obstacles, cordes, poteaux, sol: solA, maj, axe, rotAxe, hauteurRampe };
}
