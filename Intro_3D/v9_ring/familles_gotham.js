/* MONDE 1 du segment « familles » — GOTHAM, SUR UN TOIT (temps interne 0 → 5 s).

   La Batmobile 1989 (B02) est garée face au vide, au bord d'un toit d'immeuble gothique : parapet de pierre à corniche, gargouille
   ailée (forme générique), château d'eau sur pieds, antenne à feu rouge, édicule d'escalier, lampadaire ambré. En contrebas, la ville
   gothique (façades aux fenêtres allumées en espace monde, flèches, avenues ponctuées de réverbères ambrés), la pluie fine, et
   un PROJECTEUR-SIGNAL qui éclaire la nappe de nuages : disque lumineux traversé d'une silhouette de chauve-souris générique
   (dessin original, aucun logo officiel). Ciel bleu-vert, horizon ambré par la ville : jamais de noir dominant.

   V9.2 (extrait montré : 1,8 → 4,3 s) : la caméra sort d'un rift (raccord avec le portail express de l'arène), glisse autour de la
   Batmobile garée à 8 m du parapet, phares allumés ; à 3,35 s elle démarre (turbine, étincelles, ombres qui se compriment) et plonge
   dans un rift ouvert 1 m devant le parapet : l'arrière le franchit à ~4,25 s.
   Repère : voiture à l'origine, avant = +z (vers la ville), gauche = +x ; toit à y = 0 ; m = 1 mètre « monde » en cm. */
import { prng, texCanvas, halo, creerCiel, creerPluie, matFacades, obbDecor, splineT } from './familles_outils.js';
import { creerRift } from './familles_portail.js';
import { creerOmbres, creerEtincelles } from './arene_juice.js';

export function creerGotham(ctx, bat, boite) {
  const { THREE, outils } = ctx, { clamp, lerp, smoother } = outils;
  const rnd = prng('familles-gotham'), R = (a, b) => a + rnd() * (b - a);
  const groupe = new THREE.Group(); groupe.name = 'familles-gotham';
  const L = boite.max.z - boite.min.z, W = boite.max.x - boite.min.x, Hc = boite.max.y - boite.min.y;
  const m = L / 6.0;                                    // la Batmobile 1989 mesure ~6 m
  const nez = boite.max.z, GAP = 8.0 * m, EP = 0.45 * m, zBord = nez + GAP + EP;     // bord extérieur du toit
  const HIMM = 68 * m;                                  // hauteur de l'immeuble (rue à y = -HIMM)
  const FOG = '#2a5560', DENS = 0.0021 / m;
  const obstacles = [];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05, envMapIntensity: 0.02, ...o });   // l'environnement néon du noyau est très lumineux : décor quasi mat

  /* ───────── ciel bleu-vert, horizon ambré, nuages éclairés par le signal ───────── */
  const dirSignal = new THREE.Vector3(-0.1, 0.035, 1.0).normalize();
  const ciel = creerCiel(THREE, { rayon: 2600 * m, haut: '#1d4f7a', milieu: '#2f7f88', bas: '#d9914a', nuages: 0.95, couleurNuage: '#7fa6b0', clairNuage: 0.42,
    zone: { dir: dirSignal.toArray(), couleur: '#ffd27a', force: 0.55, taille: 0.24 }, echelle: 1.1, vent: 0.012 });
  groupe.add(ciel.mesh);

  /* ───────── le toit : dalle mouillée, immeuble, parapets ───────── */
  const texToit = texCanvas(THREE, 512, 512, (g, w, h) => {
    g.fillStyle = '#2c3a46'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    g.strokeStyle = 'rgba(20,24,30,.55)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 60; const d = g.createRadialGradient(x, y, 0, x, y, r); d.addColorStop(0, 'rgba(25,40,55,.55)'); d.addColorStop(1, 'rgba(25,40,55,0)'); g.fillStyle = d; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  }, { repeter: true });
  texToit.repeat.set(5, 5);
  const LX = 34 * m, LZ = 30 * m;                       // emprise du toit
  const toit = new THREE.Mesh(new THREE.PlaneGeometry(LX, LZ), std({ map: texToit, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.04 }));
  toit.rotation.x = -Math.PI / 2; toit.position.set(0, 0, zBord - LZ / 2); groupe.add(toit);
  // le corps de l'immeuble (façades fenêtrées) sous le toit
  const facImm = matFacades(THREE, { base: '#3a4048', base2: '#454b55', fen: ['#ffc86e', '#ffe2a8', '#9fe0ff'], allume: 0.42, etage: 3.6 * m, pas: 2.6 * m, toit: '#2a3038', brouillard: FOG, densite: DENS, lueur: 2.2 });
  const imm = new THREE.Mesh(new THREE.BoxGeometry(LX, HIMM, LZ), facImm.mat); imm.position.set(0, -HIMM / 2 - 0.02 * m, zBord - LZ / 2); groupe.add(imm);
  imm.geometry.setAttribute('aGraine', new THREE.BufferAttribute(new Float32Array(imm.geometry.attributes.position.count).fill(0.37), 1));
  // parapets de pierre + corniche (bord côté ville et bords latéraux)
  const texPierre = texCanvas(THREE, 256, 128, (g, w, h) => {
    g.fillStyle = '#5b636c'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { const x = i * w / 4 - (j % 2) * w / 8, v = 70 + rnd() * 40; g.fillStyle = `rgb(${v},${v + 6},${v + 14})`; g.fillRect(x + 2, j * h / 4 + 2, w / 4 - 4, h / 4 - 4); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.18})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  }, { repeter: true });
  texPierre.repeat.set(8, 1);
  const pierre = std({ color: 0x8a96a4, map: texPierre, roughness: 0.55 }), pierreF = std({ color: 0x7a8694, map: texPierre, roughness: 0.65 });
  const HP = 1.05 * m;
  function parapet(cx, cz, lx, lz) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(lx, HP, lz), pierreF); b.position.set(cx, HP / 2, cz); groupe.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(lx + 0.18 * m, 0.16 * m, lz + 0.18 * m), pierre); c.position.set(cx, HP + 0.08 * m, cz); groupe.add(c);
    obstacles.push(obbDecor('parapet', cx, cz, lx / 2 + 0.09 * m, lz / 2 + 0.09 * m, 0, HP + 0.16 * m));
  }
  parapet(0, zBord - EP / 2, LX, EP);
  parapet(LX / 2 - EP / 2, zBord - LZ / 2, EP, LZ - 2 * EP);
  parapet(-LX / 2 + EP / 2, zBord - LZ / 2, EP, LZ - 2 * EP);
  // créneaux gothiques (merlons) sur le parapet côté ville, tous les 2,4 m
  for (let x = -LX / 2 + 1.2 * m; x < LX / 2 - 0.6 * m; x += 2.4 * m) {
    if (Math.abs(x) < 2.6 * m) continue;              // dégagé devant la Batmobile
    const mer = new THREE.Mesh(new THREE.BoxGeometry(0.7 * m, 0.55 * m, EP + 0.1 * m), pierre); mer.position.set(x, HP + 0.43 * m, zBord - EP / 2); groupe.add(mer);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.22 * m, 0.6 * m, 4), pierre); fl.position.set(x, HP + 1.0 * m, zBord - EP / 2); fl.rotation.y = Math.PI / 4; groupe.add(fl);
  }
  // corniche sculptée sous le bord du toit (côté ville), bandeau de pierre
  const cor = new THREE.Mesh(new THREE.BoxGeometry(LX + 0.8 * m, 0.5 * m, 0.8 * m), pierre); cor.position.set(0, -0.6 * m, zBord + 0.2 * m); groupe.add(cor);

  /* ───────── la gargouille (forme générique : corps accroupi, tête cornue, ailes repliées) ───────── */
  const garg = new THREE.Group(), gm = std({ color: 0x3c444c, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.02 });
  const corps = new THREE.Mesh(new THREE.SphereGeometry(0.42 * m, 16, 12), gm); corps.scale.set(0.9, 1.1, 1.2); corps.position.set(0, 0.5 * m, 0); garg.add(corps);
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.26 * m, 14, 10), gm); tete.scale.set(1, 0.9, 1.25); tete.position.set(0, 0.95 * m, 0.38 * m); garg.add(tete);
  const museau = new THREE.Mesh(new THREE.ConeGeometry(0.13 * m, 0.34 * m, 8), gm); museau.rotation.x = Math.PI / 2; museau.position.set(0, 0.9 * m, 0.68 * m); garg.add(museau);
  for (const s of [-1, 1]) {
    const corne = new THREE.Mesh(new THREE.ConeGeometry(0.06 * m, 0.34 * m, 6), gm); corne.position.set(s * 0.14 * m, 1.2 * m, 0.3 * m); corne.rotation.set(-0.5, 0, s * -0.4); garg.add(corne);
    const aile = new THREE.Mesh(new THREE.ConeGeometry(0.42 * m, 1.1 * m, 3), gm); aile.scale.set(1, 1, 0.18); aile.position.set(s * 0.42 * m, 0.85 * m, -0.15 * m); aile.rotation.set(0.25, s * 0.5, s * -0.55); garg.add(aile);
    const patte = new THREE.Mesh(new THREE.BoxGeometry(0.16 * m, 0.3 * m, 0.34 * m), gm); patte.position.set(s * 0.22 * m, 0.15 * m, 0.34 * m); garg.add(patte);
    const oeil = new THREE.Mesh(new THREE.SphereGeometry(0.035 * m, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.6, 0.2) })); oeil.position.set(s * 0.1 * m, 1.0 * m, 0.6 * m); garg.add(oeil);
  }
  const socle = new THREE.Mesh(new THREE.BoxGeometry(0.9 * m, 0.25 * m, 1.0 * m), pierre); socle.position.y = 0.12 * m; garg.add(socle);
  garg.position.set(3.4 * m, HP + 0.16 * m, zBord - EP / 2); garg.rotation.y = 0.35; groupe.add(garg);

  /* ───────── château d'eau en bois sur pieds métalliques ───────── */
  const cdo = new THREE.Group(), bois = std({ color: 0x7a5236, roughness: 0.8 }), fer = std({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 });
  const cuve = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * m, 2.0 * m, 3.4 * m, 24), bois); cuve.position.y = 5.2 * m; cdo.add(cuve);
  for (const y of [4.0, 5.2, 6.4]) { const cer = new THREE.Mesh(new THREE.TorusGeometry(2.02 * m, 0.05 * m, 6, 32), fer); cer.rotation.x = Math.PI / 2; cer.position.y = y * m; cdo.add(cer); }
  const chap = new THREE.Mesh(new THREE.ConeGeometry(2.25 * m, 1.4 * m, 24), fer); chap.position.y = 7.6 * m; cdo.add(chap);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, p = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * m, 0.12 * m, 3.6 * m, 8), fer); p.position.set(Math.cos(a) * 1.5 * m, 1.8 * m, Math.sin(a) * 1.5 * m); cdo.add(p); }
  cdo.position.set(-15 * m, 0, zBord - 25 * m); groupe.add(cdo);
  obstacles.push(obbDecor('chateau-eau', cdo.position.x, cdo.position.z, 1.7 * m, 1.7 * m, 0, 8.4 * m));

  /* ───────── antenne à feu rouge (clignotement = fonction de t) ───────── */
  const ant = new THREE.Group();
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * m, 0.12 * m, 11 * m, 8), fer); mat.position.y = 5.5 * m; ant.add(mat);
  for (let i = 1; i <= 4; i++) { const tr = new THREE.Mesh(new THREE.BoxGeometry(1.2 * m * (1 - i * 0.15), 0.05 * m, 0.05 * m), fer); tr.position.y = i * 2.2 * m; ant.add(tr); }
  const feuRouge = new THREE.Mesh(new THREE.SphereGeometry(0.14 * m, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); feuRouge.position.y = 11.1 * m; ant.add(feuRouge);
  const haloRouge = halo(THREE, '#ff3030', 2.2 * m, 0.9); haloRouge.position.y = 11.1 * m; ant.add(haloRouge);
  ant.position.set(12 * m, 0, zBord - 22 * m); groupe.add(ant);
  obstacles.push(obbDecor('antenne', ant.position.x, ant.position.z, 0.3 * m, 0.3 * m, 0, 11 * m));

  /* ───────── édicule d'escalier, climatiseurs, lampadaire ambré ───────── */
  const edi = new THREE.Mesh(new THREE.BoxGeometry(3.4 * m, 3.0 * m, 3.0 * m), pierreF); edi.position.set(-2.5 * m, 1.5 * m, zBord - 24 * m); groupe.add(edi);
  const porte = new THREE.Mesh(new THREE.PlaneGeometry(1.0 * m, 2.1 * m), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.05, 0.5) })); porte.position.set(-2.5 * m, 1.05 * m, zBord - 22.49 * m); groupe.add(porte);
  obstacles.push(obbDecor('edicule', edi.position.x, edi.position.z, 1.7 * m, 1.5 * m, 0, 3 * m));
  for (const [x, z] of [[11 * m, zBord - 8 * m], [12.5 * m, zBord - 11 * m], [-12 * m, zBord - 6 * m]]) {
    const cl = new THREE.Mesh(new THREE.BoxGeometry(1.6 * m, 1.1 * m, 1.2 * m), std({ color: 0x8b9199, roughness: 0.5, metalness: 0.4 })); cl.position.set(x, 0.55 * m, z); groupe.add(cl);
    obstacles.push(obbDecor('clim', x, z, 0.8 * m, 0.6 * m, 0, 1.1 * m));
  }
  const lamp = new THREE.Group();
  const fut = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * m, 0.09 * m, 3.4 * m, 8), fer); fut.position.y = 1.7 * m; lamp.add(fut);
  const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * m, 0.14 * m, 0.5 * m, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.7, 0.6) })); lant.position.y = 3.5 * m; lamp.add(lant);
  const hl = halo(THREE, '#ffb04a', 1.6 * m, 0.55); hl.position.y = 3.5 * m; lamp.add(hl);
  lamp.position.set(-4.2 * m, 0, zBord - 1.2 * m); groupe.add(lamp);
  obstacles.push(obbDecor('lampadaire', lamp.position.x, lamp.position.z, 0.12 * m, 0.12 * m, 0, 3.6 * m));
  const lumAmbre = new THREE.PointLight(0xffa040, 0.45, 9 * m, 2.0); lumAmbre.position.set(-4.2 * m, 3.4 * m, zBord - 1.2 * m); groupe.add(lumAmbre);

  /* ───────── la ville gothique en contrebas ───────── */
  const facVille = matFacades(THREE, { base: '#2b3a48', base2: '#3a3f52', fen: ['#ffc060', '#ffdf9a', '#7fd8ff'], allume: 0.38, etage: 3.8 * m, pas: 2.8 * m, toit: '#1d2632', brouillard: FOG, densite: DENS, lueur: 2.6 });
  const tours = [];
  for (let i = 0; i < 520; i++) {
    const a = R(0, Math.PI * 2), r = 55 * m + Math.pow(rnd(), 0.7) * 520 * m;
    const x = Math.sin(a) * r, z = zBord - LZ / 2 + Math.cos(a) * r;
    if (Math.abs(x) < LX / 2 + 10 * m && z > zBord - LZ - 10 * m && z < zBord + 14 * m) continue;   // avenue au pied de l'immeuble
    const lx = R(10, 24) * m, lz = R(10, 24) * m, h = HIMM + R(-56, -12) * m + (rnd() < 0.07 ? R(20, 60) * m : 0);
    tours.push({ x: Math.round(x / (30 * m)) * 30 * m + R(-3, 3) * m, z: Math.round(z / (30 * m)) * 30 * m + R(-3, 3) * m, lx, lz, h, g: rnd() });
  }
  const geoB = new THREE.BoxGeometry(1, 1, 1); geoB.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geoB, facVille.mat, tours.length), M4 = new THREE.Matrix4(), graines = new Float32Array(tours.length);
  tours.forEach((b, i) => { M4.makeScale(b.lx, b.h, b.lz); M4.setPosition(b.x, -HIMM, b.z); inst.setMatrixAt(i, M4); graines[i] = b.g; });
  geoB.setAttribute('aGraine', new THREE.InstancedBufferAttribute(graines, 1)); inst.frustumCulled = false; groupe.add(inst);
  // flèches et pinacles gothiques sur une partie des toits
  const hautes = tours.filter((b) => b.g < 0.45);
  const fleches = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 4), new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.8, metalness: 0.0, envMapIntensity: 0.01 }), hautes.length);
  hautes.forEach((b, i) => { const s = Math.min(b.lx, b.lz) * 0.42, hh = s * R(2.2, 4.2); M4.makeScale(s, hh, s); M4.setPosition(b.x, -HIMM + b.h + hh / 2, b.z); fleches.setMatrixAt(i, M4); });
  fleches.frustumCulled = false; groupe.add(fleches);
  // feux rouges d'obstacle au sommet des plus hautes
  for (const b of tours.filter((x) => x.h > HIMM + 10 * m).slice(0, 26)) { const s = halo(THREE, '#ff4a3a', 3.2 * m, 0.8); s.position.set(b.x, -HIMM + b.h + Math.min(b.lx, b.lz) * 1.2, b.z); groupe.add(s); }
  // sol de la ville + avenues : réverbères ambrés (Points)
  const solV = new THREE.Mesh(new THREE.PlaneGeometry(1400 * m, 1400 * m), new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.4, metalness: 0.3, envMapIntensity: 0.05 }));
  solV.rotation.x = -Math.PI / 2; solV.position.set(0, -HIMM, zBord); groupe.add(solV);
  const nL = 2600, pL = new Float32Array(nL * 3);
  for (let i = 0; i < nL; i++) {
    const axeX = rnd() < 0.5, k = Math.round(R(-16, 16)), s = R(-500, 500) * m;
    const x = axeX ? s : k * 30 * m + 15 * m, z = zBord + (axeX ? k * 30 * m + 15 * m : s);
    pL.set([x, -HIMM + 0.6 * m, z], i * 3);
  }
  const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.BufferAttribute(pL, 3));
  const reverberes = new THREE.Points(gL, new THREE.PointsMaterial({ size: 2.6 * m, map: haloTexture(THREE), color: new THREE.Color(1.6, 0.95, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
  reverberes.frustumCulled = false; groupe.add(reverberes);

  /* ───────── le projecteur-signal : faisceau + disque sur les nuages (chauve-souris générique) ───────── */
  const src = new THREE.Vector3(150 * m, -HIMM + 50 * m, zBord + 260 * m);          // toit d'une tour au loin
  const cible = src.clone().add(new THREE.Vector3(0, 0, 0)).addScaledVector(dirSignal, 0);
  const dDisque = 1500 * m, posDisque = dirSignal.clone().multiplyScalar(dDisque);
  const dirFx = posDisque.clone().sub(src), lFx = dirFx.length(); dirFx.normalize();
  const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(42 * m, 2.2 * m, lFx, 24, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { col: { value: new THREE.Color('#ffe2a0') } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(col, (0.08 + 0.22 * pow(1.0 - vUv.y, 1.5)) * pow(f, 2.0)); }',
  }));
  faisceau.position.copy(src).addScaledVector(dirFx, lFx / 2); faisceau.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirFx); groupe.add(faisceau);
  const lampeSrc = halo(THREE, '#fff0c0', 12 * m, 1); lampeSrc.position.copy(src); groupe.add(lampeSrc);
  void cible;
  const texSignal = texCanvas(THREE, 512, 512, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    d.addColorStop(0, 'rgba(255,240,190,1)'); d.addColorStop(0.5, 'rgba(255,225,150,.95)'); d.addColorStop(0.62, 'rgba(255,210,120,.55)'); d.addColorStop(0.8, 'rgba(255,200,110,.14)'); d.addColorStop(1, 'rgba(255,200,110,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
    // silhouette de chauve-souris GÉNÉRIQUE (dessin original : ailes à trois festons, petites oreilles)
    g.save(); g.translate(w / 2, h / 2); g.scale(w / 512, h / 512); g.fillStyle = 'rgba(0,0,0,1)'; g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(0, -38); g.lineTo(-10, -58); g.lineTo(-16, -34); g.quadraticCurveTo(-60, -40, -150, -60); g.quadraticCurveTo(-118, -22, -128, 12);
    g.quadraticCurveTo(-100, -4, -86, 26); g.quadraticCurveTo(-64, 6, -48, 34); g.quadraticCurveTo(-28, 18, 0, 52);
    g.quadraticCurveTo(28, 18, 48, 34); g.quadraticCurveTo(64, 6, 86, 26); g.quadraticCurveTo(100, -4, 128, 12); g.quadraticCurveTo(118, -22, 150, -60);
    g.quadraticCurveTo(60, -40, 16, -34); g.lineTo(10, -58); g.closePath(); g.fill(); g.restore();
  }, { srgb: false });
  const disque = new THREE.Mesh(new THREE.PlaneGeometry(300 * m, 300 * m), new THREE.MeshBasicMaterial({ map: texSignal, color: new THREE.Color(0.95, 0.8, 0.52), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  disque.position.copy(posDisque); disque.lookAt(0, 0, 0); groupe.add(disque);

  /* ───────── pluie fine (jamais à moins de 1,2 m de l'objectif) ───────── */
  const pluie = creerPluie(THREE, rnd, { n: 5200, centre: [0, 6 * m, -2 * m], taille: [44 * m, 22 * m, 44 * m], vitesse: [-1.2 * m, -9 * m, 0.6 * m], longueur: 0.55 * m, couleur: '#cfe6ff', alpha: 0.2, proche: 1.2 * m });
  groupe.add(pluie.mesh);

  /* ───────── la Batmobile : phares (enfants de la voiture), flamme de turbine, ombres de contact ───────── */
  const solY = -boite.min.y;
  bat.v7.reel.eclairer(1, 0);
  groupe.add(bat);
  const yPh = boite.min.y + Hc * 0.32, xPh = W * 0.3;
  const cibleSpot = new THREE.Object3D(); cibleSpot.position.set(0, 0.4 * m - solY, nez + 8 * m); bat.add(cibleSpot);
  for (const s of [-1, 1]) {
    const sp = new THREE.SpotLight(0xdfeaff, 0.35, 9 * m, 0.42, 0.8, 2.0); sp.position.set(s * xPh, yPh, nez - 0.1 * m); sp.target = cibleSpot; bat.add(sp);
    const lueur = halo(THREE, '#e8f2ff', 0.75 * m, 0.6); lueur.position.set(s * xPh, yPh, nez + 0.05 * m); bat.add(lueur);
  }
  // flamme de la turbine arrière (additive, longueur pilotée par la poussée)
  const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.32 * m, 1, 16, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vY; void main(){ vec3 c = mix(vec3(1.0, 0.35, 0.08), vec3(0.6, 0.9, 1.4), vY); gl_FragColor = vec4(c * 2.2 * vY, vY); }',
  }));
  flamme.rotation.x = Math.PI / 2; bat.add(flamme);
  const ombres = creerOmbres(THREE, [{ env: bat, boite }], { sol: () => 0 }); groupe.add(ombres.groupe);

  // lumières d'ambiance : contre-jour ambré de la ville, bleu-vert du ciel
  const contre = new THREE.DirectionalLight(0xffb060, 0.45); contre.position.set(-20 * m, 6 * m, 60 * m); groupe.add(contre); groupe.add(contre.target);
  const hemi = new THREE.HemisphereLight(0x5fa0b8, 0x2a2420, 0.5); groupe.add(hemi);
  const signalLum = new THREE.DirectionalLight(0xffe0a0, 0.45); signalLum.position.copy(dirSignal).multiplyScalar(50 * m); groupe.add(signalLum);

  /* ───────── chorégraphie (temps interne ; extrait montré : 1,8 → 4,3 s) ─────────
     1,80  la caméra SORT d'un rift (raccord avec la couronne de l'arène qui plonge dans le portail express)
     1,8 → 3,3  glissé autour de la Batmobile garée, phares allumés, ville et bat-signal derrière
     3,15  un rift s'ouvre au bord du toit, 1 m devant le parapet
     3,35  la Batmobile démarre (turbine, étincelles) et plonge dans le rift : l'arrière le franchit à ~4,25 s */
  const T_DEP = 3.35, ACC = 33 * m;                                       // accélération (cm/s²) : bolide-fusée
  const zP = zBord - EP - 1.0 * m;                                         // plan du rift de sortie
  const riftFin = creerRift(THREE, { rayon: 2.35 * m }); riftFin.groupe.position.set(0, 1.55 * m, zP); groupe.add(riftFin.groupe);
  const portailFin = { x: 0, z: zP, nx: 0, nz: 1 };
  const avance = (t) => (t <= T_DEP ? 0 : 0.5 * ACC * (t - T_DEP) * (t - T_DEP));
  const centreV = [0, solY + boite.min.y + Hc * 0.5, (boite.min.z + boite.max.z) / 2];
  const C = (x, y, z) => [centreV[0] + x * m, y * m, centreV[2] + z * m];
  const cam = splineT([
    { t: 1.55, p: C(9.8, 3.1, 12.2) }, { t: 1.8, p: C(8.6, 2.7, 9.6) }, { t: 2.4, p: C(7.4, 1.9, 4.2) }, { t: 3.0, p: C(6.0, 1.5, -3.0) },
    { t: 3.4, p: C(3.8, 1.35, -7.2) }, { t: 3.9, p: C(2.5, 1.5, -4.4) }, { t: 4.3, p: C(1.8, 1.9, 0.2) }, { t: 4.6, p: C(1.5, 2.1, 2.4) },
  ]);
  // rift d'entrée : posé là où passe la caméra à 1,86 s, perpendiculaire à sa trajectoire
  const T_SORTIE = 1.86, pS = cam(T_SORTIE), pS2 = cam(T_SORTIE + 0.02);
  const riftDebut = creerRift(THREE, { rayon: 3.4 * m }); riftDebut.groupe.position.set(...pS);
  riftDebut.groupe.lookAt(2 * pS[0] - pS2[0], 2 * pS[1] - pS2[1], 2 * pS[2] - pS2[2]); groupe.add(riftDebut.groupe);
  const etincelles = creerEtincelles(THREE, { demiH: ctx.H / 2, evenements: [{
    t0: T_DEP, t1: T_DEP + 0.55, n: 100, vie: [0.22, 0.5], graine: 'gotham-depart',
    source: (tb, a) => { const z = boite.min.z + avance(tb) + 0.5 * m, s = a[0] < 0.5 ? -1 : 1;
      return { p: [s * W * 0.38, 0.05 * m, z], v: [s * (10 + 40 * a[1]), 30 + 70 * a[2], -(60 + 110 * a[4])], sol: 0 }; },
  }] });
  groupe.add(etincelles.points);
  const voitures = [{ env: bat, nom: 'B02', portail: portailFin }];

  return {
    groupe, obstacles, voitures,
    maj(t) {
      const s = avance(t), poussee = t > T_DEP ? clamp((t - T_DEP) / 0.12) : 0;
      const tangage = -0.035 * poussee * Math.exp(-Math.max(0, t - T_DEP) * 3);        // cabré au démarrage
      const pose = { pos: [0, solY, s], cap: 0, capVitesse: 0, heave: -0.02 * m * poussee * Math.exp(-Math.max(0, t - T_DEP) * 4), tangage, pente: 0, roulis: 0, dist: s, braquage: 0, coins: {} };
      ctx.poser(bat, pose);
      bat.v7.reel.eclairer(1, 0);
      const passee = boite.min.z + s > zP;                                   // l'arrière a franchi le rift : elle est ailleurs
      bat.visible = !passee;
      flamme.visible = poussee > 0;
      if (flamme.visible) { const lf = (1.2 + 2.2 * poussee + 0.25 * Math.sin(t * 57)) * m; flamme.scale.set(1, lf, 1); flamme.position.set(0, boite.min.y + Hc * 0.42, boite.min.z - lf / 2); }
      ombres.maj([passee ? null : { pos: [0, 0, s], heave: pose.heave, cap: 0, phase: 'sol' }]);
      etincelles.maj(t);
      ciel.maj(t); pluie.maj(t);
      feuRouge.visible = haloRouge.visible = (t % 1.6) < 0.8;
      riftDebut.maj(t, t < 1.95 ? 1 : 1 - smoother((t - 1.95) / 0.3));
      riftFin.maj(t, smoother((t - 3.15) / 0.3));
      bat.updateMatrixWorld(true);
      const p = cam(t);
      const cv = [centreV[0], centreV[1] + 0.25 * m, Math.min(centreV[2] + s + 2 * m, zP)];
      const k = smoother((t - 3.25) / 0.55);
      const c = [centreV[0], lerp(centreV[1] + 0.25 * m, cv[1], k), lerp(centreV[2], cv[2], k)];
      return {
        camera: { p, c, fov: 40, near: 0.1 * m, far: 3200 * m },
        fond: 0x2f6f80, brouillard: { couleur: FOG, densite: DENS * 0.6 },
        lumieres: { hemi: 0.25, cle: 0.35 },
        post: { exposition: 0.88, vignette: 0.42, saturation: 1.12, bloomForce: 0.56, aberration: 0.0005 },
      };
    },
  };
}

function haloTexture(THREE) {
  return texCanvas(THREE, 64, 64, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.3, 'rgba(255,255,255,.5)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
  }, { srgb: false });
}
