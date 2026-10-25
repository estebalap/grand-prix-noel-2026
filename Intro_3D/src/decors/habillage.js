/* HABILLAGE ET EFFETS de l'intro v5 : tout ce qui remplit l'image et la rend vivante, à la demande d'Esteban
   (« le tour de l'arène fait vide », « des effets exagérés, réalistes, partout », « se sentir moins éloigné »).

   Arène : foule dense et proche qui bouge, 15 bannières d'écuries, barrière LED défilante, 2 écrans latéraux (copie de
   l'écran géant), portiques de lyres avec faisceaux qui balaient, caméramans, colonnes de flammes, reflets d'objectif.
   Salon (début sombre) : rais de lune par la fenêtre, poussière en suspension.
   Systèmes de particules (fonctions pures du temps, semées) : fumée / brume, confettis, colonnes de flammes.

   Repère : 1 unité = 1 cm. THREE global (r128). Aucune Math.random(), aucune horloge.
   construireHabillage({ arene, equipes, logos }) → { arene: Group, salon: Group, maj(t, etat), liberer() }
     etat = { zone: 'salon'|'arene'|'aucune', allume, excitation, balayage, foule (false = gradins masqués), fumees: [...], confettis: [...], flammes: [t0...], lune }
*/
import { graineur, toile } from './salon.js';
import { COULEURS_VOIES } from './arene.js';
const T = () => window.THREE;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Texture ronde et douce (fumée, poussière, reflets). */
function texDouce(r0 = 0.0, coul = '255,255,255') {
  const THREE = T(), cv = toile(128, 128, (g, L, H) => { const gr = g.createRadialGradient(L / 2, H / 2, L * r0, L / 2, H / 2, L / 2); gr.addColorStop(0, `rgba(${coul},1)`); gr.addColorStop(0.45, `rgba(${coul},.45)`); gr.addColorStop(1, `rgba(${coul},0)`); g.fillStyle = gr; g.fillRect(0, 0, L, H); });
  return new THREE.CanvasTexture(cv);
}

/** Nuage de points à taille et opacité par particule (fumée, poussière). */
function nuage(n, tex, { additif = false } = {}) {
  const THREE = T(), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aTaille', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aCouleur', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { tex: { value: tex }, echelle: { value: 600 } }, transparent: true, depthWrite: false,
    blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute float aTaille; attribute float aAlpha; attribute vec3 aCouleur; varying float vA; varying vec3 vC; uniform float echelle;
      void main(){ vA = aAlpha; vC = aCouleur; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(aTaille * echelle / max(1.0, -mv.z), 220.0); vA *= smoothstep(12.0, 55.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D tex; varying float vA; varying vec3 vC; void main(){ vec4 c = texture2D(tex, gl_PointCoord); gl_FragColor = vec4(vC, c.a * vA); if (gl_FragColor.a < 0.003) discard; }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

export function construireHabillage({ arene, equipes, logos }) {
  const THREE = T(), rnd = graineur(777), jetables = [];
  const garde = (o) => { jetables.push(o); return o; };
  const A = new THREE.Group(), S = new THREE.Group(); A.name = 'habillage_arene'; S.name = 'habillage_salon';
  const C = arene.ancres.ring.centre.clone();

  /* ================================================================ ARÈNE */
  // --- foule proche et dense (gradins bas, de part et d'autre), bras levés qui bougent
  const ARCS = [[0.18, 0.82], [1.18, 1.82]], NF = 1600;
  const corps = new THREE.InstancedMesh(garde(new THREE.CylinderGeometry(4.5, 5.5, 26, 6)), garde(new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.85 })), NF);
  const tetes = new THREE.InstancedMesh(garde(new THREE.SphereGeometry(4, 8, 6)), garde(new THREE.MeshStandardMaterial({ color: 0xc8a48a, roughness: 0.7 })), NF);
  const bras = new THREE.InstancedMesh(garde(new THREE.BoxGeometry(2, 14, 2)), garde(new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.85 })), NF);
  const vetements = [0x3a3a48, 0x8a1c1c, 0x1c3a8a, 0x2a6a3a, 0x6a5a2a, 0x5a2a6a, 0x9a9a9a, 0x1a1a1a];
  const places = [];
  for (let i = 0; i < NF; i++) {
    const rang = Math.floor(hash(i * 3.1) * 7), arc = ARCS[i % 2], a = (arc[0] + hash(i * 7.7) * (arc[1] - arc[0])) * Math.PI, R = 205 + rang * 22 + hash(i) * 6;
    const p = new THREE.Vector3(C.x + Math.sin(a) * R, rang * 11, C.z + Math.cos(a) * R);
    places.push({ p, a, phase: hash(i * 13) * 6.28, vif: hash(i * 5) });
    corps.setColorAt(i, new THREE.Color(vetements[i % vetements.length]));
  }
  const gradins = [];
  for (const [a0, a1] of ARCS) for (let r = 0; r < 7; r++) {
    const g = new THREE.Mesh(garde(new THREE.CylinderGeometry(205 + r * 22 + 11, 205 + r * 22 + 11, r * 11 + 2, 48, 1, true, a0 * Math.PI, (a1 - a0) * Math.PI)), garde(new THREE.MeshStandardMaterial({ color: 0x1c1c26, roughness: 0.8, side: THREE.DoubleSide })));
    g.position.set(C.x, (r * 11 + 2) / 2, C.z); gradins.push(g); A.add(g);
  }
  A.add(corps, tetes, bras);
  const NB = 500, batons = new THREE.InstancedMesh(garde(new THREE.CylinderGeometry(0.6, 0.6, 9, 6)), garde(new THREE.MeshBasicMaterial({ toneMapped: false })), NB); A.add(batons);
  const coulBat = []; for (let i = 0; i < NB; i++) { coulBat.push(new THREE.Color(COULEURS_VOIES[i % 5]).multiplyScalar(3)); batons.setColorAt(i, coulBat[i]); }

  // --- 15 bannières d'écuries suspendues autour de l'arène
  const bannieres = equipes.map((e, i) => {
    const cv = toile(256, 640, (g, L, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, e.colors[0]); gr.addColorStop(1, e.colors[1]); g.fillStyle = gr; g.fillRect(0, 0, L, H);
      const im = logos[e.id]; g.save(); g.beginPath(); g.arc(L / 2, 170, 100, 0, 7); g.clip(); g.fillStyle = '#000'; g.fillRect(0, 0, L, H);
      if (im) { const s = Math.max(200 / im.naturalWidth, 200 / im.naturalHeight); g.drawImage(im, L / 2 - im.naturalWidth * s / 2, 170 - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
      g.restore(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.beginPath(); g.arc(L / 2, 170, 100, 0, 7); g.stroke();
      g.save(); g.translate(L / 2, 420); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 12;
      let taille = 70; g.font = `900 ${taille}px sans-serif`; while (g.measureText(e.nickname.toUpperCase()).width > 360 && taille > 30) { taille -= 4; g.font = `900 ${taille}px sans-serif`; }
      g.fillText(e.nickname.toUpperCase(), 0, taille * 0.35); g.restore();
      g.fillStyle = '#ffc83d'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(k * L / 6, H); g.lineTo((k + 0.5) * L / 6, H - 40); g.lineTo((k + 1) * L / 6, H); g.fill(); }
    });
    const tex = garde(new THREE.CanvasTexture(cv)); tex.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(40, 100, 1, 8)), garde(new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.8 })));
    const arc = ARCS[i < 8 ? 0 : 1], k = i < 8 ? i / 7 : (i - 8) / 6, a = (arc[0] + 0.05 + k * (arc[1] - arc[0] - 0.1)) * Math.PI;
    m.position.set(C.x + Math.sin(a) * 330, 210, C.z + Math.cos(a) * 330); m.lookAt(C.x, 210, C.z); A.add(m);
    return { m, base: m.position.clone(), i };
  });

  // --- barrière LED défilante autour du ring (ouverte au sud pour l'allée d'entrée)
  const cvLed = toile(2048, 64, (g, L, H) => {
    g.fillStyle = '#05030a'; g.fillRect(0, 0, L, H); g.font = '900 46px sans-serif'; g.textBaseline = 'middle';
    const msgs = ['GRAND PRIX DE NOËL', '23 DÉCEMBRE', 'RAINBOW ROAD', '15 ÉCURIES', 'PARIS EN DIRECT'];
    let x = 10; let k = 0; while (x < L) { const m = msgs[k % msgs.length] + '  ★  '; g.fillStyle = COULEURS_VOIES[k % 5]; g.fillText(m, x, H / 2 + 2); x += g.measureText(m).width; k++; }
  });
  const texLed = garde(new THREE.CanvasTexture(cvLed)); texLed.encoding = THREE.sRGBEncoding; texLed.wrapS = THREE.RepeatWrapping;
  const matLed = garde(new THREE.MeshBasicMaterial({ map: texLed, toneMapped: false }));
  const leds = [];
  for (const [x0, z0, x1, z1] of [[-175, -175, 175, -175], [175, -175, 175, 175], [-175, 175, -175, -175], [175, 175, 45, 175], [-45, 175, -175, 175]]) {
    const l = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(garde(new THREE.BoxGeometry(l, 12, 2)), [matLed, matLed, matLed, matLed, matLed, matLed]);
    m.position.set(C.x + (x0 + x1) / 2, 6, C.z + (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); A.add(m); leds.push(m);
    texLed.repeat.set(1, 1);
  }

  // --- écrans latéraux (même image que l'écran géant)
  const matEcranLat = garde(new THREE.MeshBasicMaterial({ map: arene.ecran.texture, toneMapped: false }));
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(200, 86)), matEcranLat); m.position.set(C.x + s * 300, 200, C.z - 120); m.lookAt(C.x, 120, C.z + 40); A.add(m);
    const cad = new THREE.Mesh(garde(new THREE.BoxGeometry(206, 92, 4)), garde(new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.4, metalness: 0.7 }))); cad.position.copy(m.position); cad.quaternion.copy(m.quaternion); cad.translateZ(-2.5); A.add(cad);
  }

  // --- portiques de lyres : 12 têtes motorisées, faisceaux volumétriques qui balaient
  const NL = 12, lyres = [];
  const geoFaisceau = garde(new THREE.ConeGeometry(28, 420, 24, 1, true)); geoFaisceau.translate(0, -210, 0);
  for (let i = 0; i < NL; i++) {
    const a = (i / NL) * Math.PI * 2 + 0.26, R = 240, pivot = new THREE.Group();
    pivot.position.set(C.x + Math.sin(a) * R, 330, C.z + Math.cos(a) * R); A.add(pivot);
    const tete = new THREE.Mesh(garde(new THREE.BoxGeometry(10, 12, 10)), garde(new THREE.MeshStandardMaterial({ color: 0x15151a, metalness: 0.6, roughness: 0.4 }))); pivot.add(tete);
    const c = new THREE.Color(COULEURS_VOIES[i % 5]);
    const f = new THREE.Mesh(geoFaisceau, garde(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
    pivot.add(f);
    const lentille = new THREE.Mesh(garde(new THREE.CircleGeometry(4, 16)), garde(new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(4), toneMapped: false }))); lentille.position.y = -6.1; lentille.rotation.x = Math.PI / 2; pivot.add(lentille);
    lyres.push({ pivot, f, a, i, c });
  }
  const truss = new THREE.Mesh(garde(new THREE.TorusGeometry(240, 3, 8, 64)), garde(new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.35 }))); truss.rotation.x = Math.PI / 2; truss.position.set(C.x, 340, C.z); A.add(truss);

  // --- caméramans aux 4 coins
  const matNoir = garde(new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.7 }));
  for (const [x, z, ry] of [[-120, -120, 0.8], [120, -120, -0.8], [120, 140, -2.3], [-120, 140, 2.3]]) {
    const g = new THREE.Group(); g.position.set(C.x + x, 0, C.z + z); g.rotation.y = ry; A.add(g);
    const b = new THREE.Mesh(garde(new THREE.CylinderGeometry(5, 6, 30, 8)), matNoir); b.position.y = 15; g.add(b);
    const t = new THREE.Mesh(garde(new THREE.SphereGeometry(4.4, 8, 6)), matNoir); t.position.y = 34; g.add(t);
    const cam = new THREE.Mesh(garde(new THREE.BoxGeometry(7, 7, 14)), matNoir); cam.position.set(4, 33, 6); g.add(cam);
    const voyant = new THREE.Mesh(garde(new THREE.SphereGeometry(0.6, 6, 4)), garde(new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }))); voyant.position.set(4, 37, 1); g.add(voyant);
  }

  // --- colonnes de flammes (pyros) aux coins de la barrière et à l'entrée
  const flammeMat = garde(new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float t; uniform float force;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float y = vUv.y; float x = abs(vUv.x - 0.5) * 2.0;
        float b = n(vec2(vUv.x * 6.0, y * 4.0 - t * 9.0)) * 0.6 + n(vec2(vUv.x * 13.0, y * 9.0 - t * 15.0)) * 0.4;
        float f = clamp((1.0 - x * (1.2 + y)) * (b * 1.6 - y * 0.9) * force * 1.8, 0.0, 1.0);
        vec3 c = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.9, 0.5), smoothstep(0.3, 0.95, f));
        gl_FragColor = vec4(c * f * 3.0, f); }`,
  }));
  const flammes = [];
  for (const [x, z] of [[-175, -175], [175, -175], [175, 175], [-175, 175], [-45, 175], [45, 175]]) {
    const g = new THREE.Group(); g.position.set(C.x + x, 0, C.z + z); A.add(g);
    const socle = new THREE.Mesh(garde(new THREE.CylinderGeometry(6, 7, 10, 12)), matNoir); socle.position.y = 5; g.add(socle);
    for (const ry of [0, Math.PI / 2]) { const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(26, 120)), flammeMat); p.position.y = 70; p.rotation.y = ry; g.add(p); }
    const lum = new THREE.PointLight(0xff7a2a, 0, 500, 1); lum.position.y = 60; g.add(lum); flammes.push({ g, lum });
  }

  // --- reflets d'objectif (soleil des projecteurs) : halo + traînée anamorphique
  const texHalo = garde(texDouce(0.02)), texTrainee = garde(texDouce(0.0, '160,210,255'));
  const reflets = [];
  for (const [x, y, z, coul, taille] of [[0, 150, 0, 0xffffff, 60], [-240, 330, -240, 0xff4fb8, 34], [240, 330, -240, 0x3f8cff, 34], [-240, 330, 240, 0x35e07a, 34], [240, 330, 240, 0xffe23d, 34]]) {
    const h = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texHalo, color: coul, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, toneMapped: false })));
    h.scale.set(taille, taille, 1); h.position.set(C.x + x, C.y + y, C.z + z); A.add(h);
    const tr = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texTrainee, color: 0x9fd0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35, toneMapped: false })));
    tr.scale.set(taille * 7, taille * 0.18, 1); tr.position.copy(h.position); A.add(tr); reflets.push({ h, tr });
  }

  // --- brume au sol de l'arène + fumées (burnouts, signatures) : un seul nuage de points
  const NBR = 260, NFU = 900, brume = nuage(NBR + NFU, garde(texDouce(0.0)));
  A.add(brume);

  // --- confettis (InstancedMesh) et étincelles déjà gérées par le film
  const NC = 1400, confettis = new THREE.InstancedMesh(garde(new THREE.PlaneGeometry(1.2, 2.0)), garde(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3, emissive: 0x222222 })), NC);
  confettis.frustumCulled = false; A.add(confettis);
  for (let i = 0; i < NC; i++) confettis.setColorAt(i, new THREE.Color(0xffffff));

  /* ================================================================ SALON (début sombre) */
  const fen = { x: -250, zc: -200 + 85, y: 154 };
  const rais = [];
  for (let k = 0; k < 3; k++) {
    const r = new THREE.Mesh(garde(new THREE.ConeGeometry(70 + k * 10, 420, 4, 1, true)), garde(new THREE.MeshBasicMaterial({ color: 0x8fb2ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
    r.geometry.translate(0, -210, 0); r.position.set(fen.x + 2, fen.y + 10, fen.zc + (k - 1) * 20); r.rotation.set(0.15 * (k - 1), 0, -0.95); S.add(r); rais.push(r);
  }
  const NP = 500, poussiere = nuage(NP, garde(texDouce(0.0)), { additif: true }); S.add(poussiere);
  for (let i = 0; i < NP; i++) { poussiere.geometry.attributes.aCouleur.setXYZ(i, 0.75, 0.82, 1.0); }

  /* ================================================================ animation */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), un = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  function maj(t, etat = {}) {
    const zone = etat.zone || 'aucune', allume = etat.allume ?? 1;
    A.visible = zone === 'arene'; S.visible = zone === 'salon';
    const foule = etat.foule !== false; corps.visible = tetes.visible = bras.visible = batons.visible = foule; gradins.forEach((g) => { g.visible = foule; });   // masquée quand la caméra passe derrière (parc fermé)
    if (zone === 'arene') {
      const ex = etat.excitation ?? 1;                                                       // foule : debout et bras levés sur les temps forts
      for (let i = 0; i < NF; i++) {
        const { p, a, phase, vif } = places[i], saut = Math.max(0, Math.sin(t * (3 + vif * 3) + phase)) * 4 * ex * (vif > 0.4 ? 1 : 0.3);
        q.setFromAxisAngle(v.set(0, 1, 0), a + Math.PI);
        m4.compose(v.set(p.x, p.y + 13 + saut, p.z), q, un.set(1, 1, 1)); corps.setMatrixAt(i, m4);
        m4.compose(v.set(p.x, p.y + 30 + saut, p.z), q, un.set(1, 1, 1)); tetes.setMatrixAt(i, m4);
        const lev = (vif > 0.35 ? 1 : 0) * (0.5 + 0.5 * Math.sin(t * (4 + vif * 4) + phase)) * ex;
        e.set(0, a + Math.PI, 2.6 * lev - 0.2); q.setFromEuler(e); m4.compose(v.set(p.x + Math.cos(a) * 4, p.y + 28 + saut + lev * 6, p.z - Math.sin(a) * 4), q, un.set(1, 1, 1)); bras.setMatrixAt(i, m4);
        if (i < NB) { m4.compose(v.set(p.x + Math.cos(a) * 4, p.y + 38 + saut + lev * 8, p.z - Math.sin(a) * 4), q, un.set(1, 1, 1)); batons.setMatrixAt(i, m4); col.copy(coulBat[i]).multiplyScalar((0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 5 + i))) * Math.max(0.2, allume)); batons.setColorAt(i, col); }
      }
      corps.instanceMatrix.needsUpdate = tetes.instanceMatrix.needsUpdate = bras.instanceMatrix.needsUpdate = batons.instanceMatrix.needsUpdate = true; batons.instanceColor.needsUpdate = true;
      bannieres.forEach(({ m, base, i }) => { m.position.copy(base); m.position.y += Math.sin(t * 1.3 + i) * 1.5; m.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.03; m.material.emissiveIntensity = 0.15 + 0.35 * allume; });
      texLed.offset.x = (t * 0.06) % 1;
      lyres.forEach(({ pivot, f, a, i }) => {                                             // balayage : chaque lyre vise le ring puis s'en écarte en rythme
        const vise = Math.sin(t * 0.7 + i * 1.1) * 0.55 + (etat.balayage ?? 0) * Math.sin(t * 3.1 + i);
        pivot.rotation.set(0, 0, 0); pivot.lookAt(C.x + Math.sin(t * 0.5 + i) * 60, -200, C.z + Math.cos(t * 0.6 + i * 2) * 60);
        pivot.rotateX(-Math.PI / 2 + vise * 0.4); f.material.opacity = 0.05 * allume + 0.04 * (etat.balayage ?? 0);
      });
      // flammes : enveloppe de chaque déclenchement (2 s), légère pulsation
      let force = 0; for (const t0 of etat.flammes || []) { const d = t - t0; if (d >= 0 && d < 2.2) force = Math.max(force, d < 0.08 ? d / 0.08 : Math.exp(-(d - 0.08) * 1.6)); }
      flammeMat.uniforms.t.value = t; flammeMat.uniforms.force.value = force;
      flammes.forEach(({ lum }) => { lum.intensity = force * 3.5; });
      reflets.forEach(({ h, tr }, k) => { const a2 = (k === 0 ? 0.7 : 0.5) * allume * (0.85 + 0.15 * Math.sin(t * 6 + k)); h.material.opacity = a2; tr.material.opacity = a2 * 0.6; });
      // brume + fumées
      const pos = brume.geometry.attributes.position, ta = brume.geometry.attributes.aTaille, al = brume.geometry.attributes.aAlpha, co = brume.geometry.attributes.aCouleur;
      for (let i = 0; i < NBR; i++) {
        const a2 = hash(i) * 6.283, R = 60 + hash(i * 3) * 260, dx = Math.sin(t * 0.07 + i) * 25;
        pos.setXYZ(i, C.x + Math.sin(a2) * R + dx, 4 + hash(i * 7) * 18, C.z + Math.cos(a2) * R); ta.setX(i, 140 + hash(i * 9) * 120); al.setX(i, 0.032 * (0.6 + 0.4 * allume)); co.setXYZ(i, 0.55, 0.6, 0.8);
      }
      let k = NBR;
      for (const em of etat.fumees || []) {                                                   // em : { p, t0, duree, n, couleur, vent, taille, opacite }
        for (let j = 0; j < em.n && k < NBR + NFU; j++, k++) {
          const naissance = em.t0 + (j / em.n) * em.duree, age = t - naissance, vie = 2.2 + hash(k) * 1.6;
          if (age < 0 || age > vie) { al.setX(k, 0); ta.setX(k, 0); continue; }
          const u = age / vie, a3 = hash(k * 5) * 6.283, sp = 8 + hash(k * 7) * 14;
          pos.setXYZ(k, em.p.x + Math.cos(a3) * sp * age + (em.vent?.x || 0) * age, em.p.y + 4 * age + 10 * age * u, em.p.z + Math.sin(a3) * sp * age + (em.vent?.z || 0) * age);
          ta.setX(k, (em.taille || 10) * (1 + age * 3)); al.setX(k, (em.opacite ?? 0.35) * (1 - u) * Math.min(1, age * 6)); co.setXYZ(k, em.couleur.r, em.couleur.g, em.couleur.b);
        }
      }
      for (; k < NBR + NFU; k++) { al.setX(k, 0); ta.setX(k, 0); }
      pos.needsUpdate = ta.needsUpdate = al.needsUpdate = co.needsUpdate = true;
      // confettis : { p, t0, n, couleurs[], v }
      let c = 0;
      for (const em of etat.confettis || []) {
        for (let j = 0; j < em.n && c < NC; j++, c++) {
          const age = t - em.t0; if (age < 0 || age > 6) { m4.makeScale(0, 0, 0); confettis.setMatrixAt(c, m4); continue; }
          const a3 = hash(c * 3 + 1) * 6.283, el = 0.9 + hash(c * 7) * 0.6, v0 = (em.v || 320) * (0.5 + hash(c * 11) * 0.6), kd = 1.8;
          const fr = (1 - Math.exp(-kd * age)) / kd, chute = 35 * age;                               // traînée de l'air : vitesse limite de chute
          v.set(em.p.x + Math.cos(a3) * Math.cos(el) * v0 * fr + Math.sin(age * 3 + c) * 6, em.p.y + Math.sin(el) * v0 * fr - chute, em.p.z + Math.sin(a3) * Math.cos(el) * v0 * fr + Math.cos(age * 2.7 + c) * 6);
          if (v.y < 0.2) v.y = 0.2;
          e.set(age * (6 + hash(c) * 8), age * (4 + hash(c * 2) * 6), age * 3); q.setFromEuler(e); m4.compose(v, q, un.set(1, 1, 1)); confettis.setMatrixAt(c, m4);
          confettis.setColorAt(c, col.set(em.couleurs[c % em.couleurs.length]));
        }
      }
      for (; c < NC; c++) { m4.makeScale(0, 0, 0); confettis.setMatrixAt(c, m4); }
      confettis.instanceMatrix.needsUpdate = true; if (confettis.instanceColor) confettis.instanceColor.needsUpdate = true;
    }
    if (zone === 'salon') {
      const lune = etat.lune ?? 1;
      rais.forEach((r, k) => { r.material.opacity = (0.035 + 0.02 * Math.sin(t * 0.8 + k)) * lune; });
      const pos = poussiere.geometry.attributes.position, ta = poussiere.geometry.attributes.aTaille, al = poussiere.geometry.attributes.aAlpha;
      for (let i = 0; i < NP; i++) {
        const x = -230 + hash(i) * 330, y = 10 + ((hash(i * 3) * 220 + t * (1.5 + hash(i * 5) * 2)) % 220), z = -190 + hash(i * 7) * 360;
        pos.setXYZ(i, x + Math.sin(t * 0.3 + i) * 6, y, z + Math.cos(t * 0.25 + i) * 6); ta.setX(i, 0.9 + hash(i * 11) * 1.2);
        const dansRai = Math.max(0, 1 - Math.abs((z - fen.zc) / 140)) * Math.max(0, 1 - Math.abs((x + 120) / 160));
        al.setX(i, (0.15 + 0.85 * dansRai) * 0.55 * lune);
      }
      pos.needsUpdate = ta.needsUpdate = al.needsUpdate = true;
    }
  }
  return { arene: A, salon: S, maj, liberer() { for (const o of jetables) if (o && o.dispose) o.dispose(); } };
}
