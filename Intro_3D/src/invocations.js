/* INVOCATIONS des 15 écuries (intro v5) : pour chaque écurie, un effet visuel sur mesure calé sur SA signature sonore.
   Tout est une fonction pure du temps (aucune Math.random(), aucune horloge, aucun état reporté d'une image à l'autre) :
   chaque particule est recalculée à partir de sa graine et de son âge, comme dans habillage.js.

   construireInvocations({ equipes }) → { groupe, maj(t, ctx) → retour, liberer() }
     ctx    = { themes: [[t0, t1]…15], punchs: [s…15] (1er temps fort, en s après t0), places: [{ p: Vector3, cap }…15] }
     retour = { fumees: [...] (pour habillage), flash, sec (secousse), teinte: [r,g,b] | null, voitures: { i: { dy, dcap, roulis, tangage } } }

   Les 15 effets (index = ordre de teams.json) :
     0 Mimine        étincelles de forge, poussière western au sol, retours de flammes
     1 Twingo        pluie de bonbons 3D, néons rose bonbon, onde de choc sucrée sur « Sweet! »
     2 Optic         stroboscope rock noir/jaune, éclairs électriques sur le « WOO-HOO! »
     3 Tata Freddy   nuée de cartes (Balatro) en lévitation, étincelles dorées
     4 Mario         bond, chute libre et crash cartoon : onde de choc, débris, poussière
     5 Symphonie     portée musicale ondulante et notes de lumière qui montent
     6 Yaris         rayon divin doré et Triforce qui s'élève sur la fanfare
     7 A4            grille hexagonale et scanner de téléportation bleu néon (Metroid)
     8 Titou         comète pourpre, bang supersonique, flammes de dragon (Valstrax)
     9 Doom Slayer   éclipse rouge sang, foudre noire, braises (Berserk)
    10 Milo          étoiles filantes et poussière cosmique de Luma (Galaxy)
    11 Bob           kanji « ゴ » géants en lévitation, aura de Stand (JoJo)
    12 Jojo          rideau de fumée de drift, néons Tokyo, dérapage
    13 Ninja-Nissan  éclaboussure d'encre fluo à 360° sur le « Booyah! » (Splatoon)
    14 Princess      tourbillon de pétales de marguerite, flash pop solaire
   Repère : 1 unité = 1 cm. THREE global (r128). */
import { toile } from './decors/salon.js';

const T = () => window.THREE;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function construireInvocations({ equipes = [] } = {}) {
  const THREE = T(), jetables = [], garde = (o) => { jetables.push(o); return o; };
  const groupe = new THREE.Group(); groupe.name = 'invocations';
  const CAMQ = new THREE.Quaternion();            // orientation de la caméra : étoiles et notes toujours de face
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  const tex = (l, h, dessin) => { const t = garde(new THREE.CanvasTexture(toile(l, h, dessin))); t.encoding = THREE.sRGBEncoding; return t; };

  /* ------------------------------------------------------------ textures dessinées (aucun fichier externe) */
  const texEtoile = tex(128, 128, (g, L, H) => {
    const gr = g.createRadialGradient(L / 2, H / 2, 0, L / 2, H / 2, L / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, L, H); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(L / 2, 6); g.lineTo(L / 2, H - 6); g.moveTo(6, H / 2); g.lineTo(L - 6, H / 2); g.stroke();
  });
  const texNote = tex(128, 128, (g, L, H) => { g.fillStyle = '#fff'; g.font = '900 104px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#fff'; g.shadowBlur = 14; g.fillText('♪', L / 2, H / 2 + 6); });
  const texKanji = tex(256, 256, (g, L, H) => {
    g.font = '900 220px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 18; g.strokeStyle = '#2a0636'; g.strokeText('ゴ', L / 2, H / 2 + 8); g.fillStyle = '#b44dff'; g.fillText('ゴ', L / 2, H / 2 + 8);
  });
  const texCarte = tex(192, 268, (g, L, H) => {
    g.fillStyle = '#f6f1e4'; g.beginPath(); g.roundRect ? g.roundRect(4, 4, L - 8, H - 8, 18) : g.rect(4, 4, L - 8, H - 8); g.fill();
    g.strokeStyle = '#c9302c'; g.lineWidth = 6; g.strokeRect(16, 16, L - 32, H - 32);
    g.fillStyle = '#c9302c'; g.font = '900 64px serif'; g.textAlign = 'center'; g.fillText('J', 40, 74); g.font = '900 120px serif'; g.fillText('♥', L / 2, H / 2 + 44);
    g.fillStyle = '#2350d8'; g.font = '700 26px sans-serif'; g.fillText('JOKER', L / 2, H - 34);
  });
  const texDos = tex(192, 268, (g, L, H) => {
    g.fillStyle = '#c42b3a'; g.fillRect(0, 0, L, H); g.strokeStyle = '#ffd36b'; g.lineWidth = 4;
    for (let k = -H; k < L + H; k += 18) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); g.beginPath(); g.moveTo(k + H, 0); g.lineTo(k, H); g.stroke(); }
    g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(10, 10, L - 20, H - 20);
  });
  const texHex = tex(512, 512, (g, L, H) => {
    g.clearRect(0, 0, L, H); g.strokeStyle = 'rgba(80,220,255,1)'; g.lineWidth = 3; const r = 26, w = r * Math.sqrt(3);
    for (let y = -r, row = 0; y < H + r; y += r * 1.5, row++) for (let x = (row % 2) * w / 2 - w; x < L + w; x += w) {
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); g.stroke();
    }
    const gr = g.createRadialGradient(L / 2, H / 2, 0, L / 2, H / 2, L / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, L, H);
  });

  /* ------------------------------------------------------------ réserves de particules (InstancedMesh) */
  const additif = (map, c = 0xffffff) => garde(new THREE.MeshBasicMaterial({ map, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
  const reserve = (geo, mat, n, couleurs = false) => {
    const m = new THREE.InstancedMesh(garde(geo), mat, n); m.frustumCulled = false; m.userData.n = 0;
    if (couleurs) for (let i = 0; i < n; i++) m.setColorAt(i, col.set(0xffffff));
    groupe.add(m); return m;
  };
  const P = {
    bonbon: reserve(new THREE.SphereGeometry(0.55, 10, 8), garde(new THREE.MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x220011 })), 260, true),
    batonnet: reserve(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 8), garde(new THREE.MeshPhysicalMaterial({ roughness: 0.2, clearcoat: 1 })), 80, true),
    carte: reserve(new THREE.PlaneGeometry(2.4, 3.36), garde(new THREE.MeshStandardMaterial({ map: texCarte, emissive: 0xffffff, emissiveMap: texCarte, emissiveIntensity: 0.45, side: THREE.FrontSide, roughness: 0.4 })), 48),
    dos: reserve(new THREE.PlaneGeometry(2.4, 3.36), garde(new THREE.MeshStandardMaterial({ map: texDos, emissive: 0xffffff, emissiveMap: texDos, emissiveIntensity: 0.45, side: THREE.BackSide, roughness: 0.4 })), 48),
    petale: reserve(new THREE.SphereGeometry(0.9, 8, 6), garde(new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x222211, side: THREE.DoubleSide })), 320, true),
    note: reserve(new THREE.PlaneGeometry(2.6, 2.6), additif(texNote), 70, true),
    etoile: reserve(new THREE.PlaneGeometry(1.6, 1.6), additif(texEtoile), 520, true),
    braise: reserve(new THREE.BoxGeometry(0.22, 0.22, 1.1), garde(new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), 420, true),
    encre: reserve(new THREE.SphereGeometry(0.8, 10, 8), garde(new THREE.MeshPhysicalMaterial({ roughness: 0.08, clearcoat: 1, emissive: 0x111111 })), 360, true),
    kanji: reserve(new THREE.PlaneGeometry(9, 9), garde(new THREE.MeshBasicMaterial({ map: texKanji, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), 14),
    debris: reserve(new THREE.TetrahedronGeometry(0.8), garde(new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.9 })), 90),
  };
  P.petale.geometry.scale(1, 0.12, 0.55);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);

  /** Émet n particules balistiques (fonction pure de l'âge) dans la réserve `nom`. */
  function emettre(nom, n, graine, t, t0, o, opts = {}) {
    const R = P[nom], age0 = t - t0;
    const { v0 = 40, v1 = 80, haut = 0.6, ouverture = 1, g = 300, trainee = 1.2, vie = 1.6, vieVar = 0.6, taille = 1, couleurs = null, tourne = 6, dir = null, etalement = 0, face = null, flottant = false, rayon0 = 0 } = opts;
    for (let k = 0; k < n && R.userData.n < R.count; k++) {
      const gk = graine * 1000 + k, ne = t0 + hash(gk + 0.5) * etalement, age = t - ne, life = vie * (1 - vieVar / 2 + hash(gk + 1.7) * vieVar);
      if (age < 0 || age > life) continue;
      const a = hash(gk + 2.3) * Math.PI * 2, el = (haut - ouverture / 2) + hash(gk + 3.1) * ouverture, sp = v0 + hash(gk + 4.9) * (v1 - v0);
      let vx = Math.cos(a) * Math.cos(el) * sp, vy = Math.sin(el) * sp, vz = Math.sin(a) * Math.cos(el) * sp;
      if (dir) { vx = dir.x * sp + (hash(gk + 5.5) - 0.5) * sp * ouverture; vy = dir.y * sp + (hash(gk + 6.6) - 0.5) * sp * ouverture; vz = dir.z * sp + (hash(gk + 7.7) - 0.5) * sp * ouverture; }
      const fr = (1 - Math.exp(-trainee * age)) / trainee;                  // traînée de l'air
      v.set(o.x + Math.cos(a) * rayon0 + vx * fr, o.y + vy * fr - (flottant ? 0 : 0.5 * g * age * age / (1 + trainee * age)), o.z + Math.sin(a) * rayon0 + vz * fr);
      if (v.y < 0.15 && !flottant) v.y = 0.15;
      if (face) q.copy(face); else { e.set(age * tourne * (0.5 + hash(gk + 8.1)), age * tourne * hash(gk + 9.2), age * tourne * 0.7); q.setFromEuler(e); }
      const k2 = clamp(1 - (age / life - 0.75) / 0.25) * clamp(age / 0.06), sc = taille * (0.6 + hash(gk + 10.4) * 0.8) * k2;
      m4.compose(v, q, s.set(sc, sc, sc)); R.setMatrixAt(R.userData.n, m4);
      if (R.instanceColor && couleurs) R.setColorAt(R.userData.n, col.set(couleurs[k % couleurs.length]));
      R.userData.n++;
    }
  }
  /** Pose une instance unique (cartes, kanji, notes guidées). */
  function poserInstance(nom, pos, rot, sc, couleur = null) {
    const R = P[nom]; if (R.userData.n >= R.count) return;
    m4.compose(pos, rot, s.set(sc, sc, sc)); R.setMatrixAt(R.userData.n, m4);
    if (couleur && R.instanceColor) R.setColorAt(R.userData.n, col.set(couleur));
    R.userData.n++;
  }

  /* ------------------------------------------------------------ objets dédiés */
  const anneaux = [];
  for (let k = 0; k < 6; k++) {
    const m = new THREE.Mesh(garde(new THREE.RingGeometry(0.86, 1, 64)), garde(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })));
    m.rotation.x = -Math.PI / 2; groupe.add(m); anneaux.push(m);
  }
  let nAnneaux = 0;
  function anneau(p, rayon, opacite, couleur, y = 0.3, vertical = null) {
    if (nAnneaux >= anneaux.length || opacite <= 0.003) return; const m = anneaux[nAnneaux++];
    m.visible = true; m.position.set(p.x, p.y + y, p.z); m.scale.setScalar(Math.max(0.01, rayon)); m.material.opacity = opacite; m.material.color.set(couleur).multiplyScalar(2.5);
    if (vertical !== null) { m.rotation.set(0, vertical, 0); } else m.rotation.set(-Math.PI / 2, 0, 0);
  }
  const geoCol = garde(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true)); geoCol.translate(0, 0.5, 0);
  const colonnes = [0, 1].map(() => { const m = new THREE.Mesh(geoCol, garde(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }))); groupe.add(m); return m; });
  let nCol = 0;
  function colonne(p, rayon, hauteur, y0, opacite, couleur) {
    if (nCol >= colonnes.length || opacite <= 0.003) return; const m = colonnes[nCol++];
    m.visible = true; m.position.set(p.x, p.y + y0, p.z); m.scale.set(rayon, hauteur, rayon); m.material.opacity = opacite; m.material.color.set(couleur).multiplyScalar(2);
  }
  // éclairs : lignes brisées régénérées 30 fois par seconde (graine = numéro de tranche)
  const eclairs = [];
  for (let k = 0; k < 8; k++) {
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    const l = new THREE.Line(g, garde(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }))); l.frustumCulled = false; groupe.add(l); eclairs.push(l);
  }
  let nEcl = 0;
  function eclair(a, b, graine, couleur, opacite = 1, ampl = 3) {
    if (nEcl >= eclairs.length) return; const l = eclairs[nEcl++], pos = l.geometry.attributes.position;
    for (let i = 0; i < 14; i++) { const u = i / 13, j = i === 0 || i === 13 ? 0 : 1; pos.setXYZ(i, a.x + (b.x - a.x) * u + (hash(graine + i * 3.1) - 0.5) * ampl * j, a.y + (b.y - a.y) * u + (hash(graine + i * 5.3) - 0.5) * ampl * j, a.z + (b.z - a.z) * u + (hash(graine + i * 7.7) - 0.5) * ampl * j); }
    pos.needsUpdate = true; l.visible = true; l.material.color.set(couleur).multiplyScalar(3); l.material.opacity = opacite;
  }
  // Triforce : trois triangles d'or
  const triforce = new THREE.Group(); groupe.add(triforce);
  const matOr = garde(new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb800, emissiveIntensity: 1.4, metalness: 1, roughness: 0.25, side: THREE.DoubleSide }));
  const forme = new THREE.Shape(); forme.moveTo(-1, 0); forme.lineTo(1, 0); forme.lineTo(0, Math.sqrt(3)); forme.closePath();
  const geoTri = garde(new THREE.ExtrudeGeometry(forme, { depth: 0.25, bevelEnabled: false }));
  for (const [x, y] of [[-1, 0], [1, 0], [0, Math.sqrt(3)]]) { const m = new THREE.Mesh(geoTri, matOr); m.position.set(x, y, 0); triforce.add(m); }
  // grille hexagonale (Metroid) et scanner
  const hex = new THREE.Mesh(garde(new THREE.PlaneGeometry(1, 1)), additif(texHex, 0x60e0ff)); hex.rotation.x = -Math.PI / 2; groupe.add(hex);
  const scanner = new THREE.Mesh(garde(new THREE.TorusGeometry(1, 0.05, 6, 64)), garde(new THREE.MeshBasicMaterial({ color: 0x60e0ff, transparent: true, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }))); scanner.rotation.x = Math.PI / 2; groupe.add(scanner);
  // éclipse (Berserk) : disque noir et couronne rouge
  const eclipse = new THREE.Group(); groupe.add(eclipse);
  eclipse.add(new THREE.Mesh(garde(new THREE.CircleGeometry(1, 48)), garde(new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }))));
  const couronne = new THREE.Mesh(garde(new THREE.RingGeometry(0.98, 1.7, 64)), garde(new THREE.MeshBasicMaterial({ color: 0xff1020, transparent: true, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  couronne.position.z = -0.01; eclipse.add(couronne);
  // comète (Valstrax) : tube progressif + tête
  const NC = 48, geoComete = garde(new THREE.BufferGeometry()); geoComete.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NC * 3), 3));
  const comete = new THREE.Line(geoComete, garde(new THREE.LineBasicMaterial({ color: 0xc060ff, transparent: true, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }))); comete.frustumCulled = false; groupe.add(comete);
  // portée musicale : 5 lignes ondulantes autour de la voiture
  const portee = [];
  for (let k = 0; k < 5; k++) {
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(96 * 3), 3));
    const l = new THREE.Line(g, garde(new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }))); l.frustumCulled = false; groupe.add(l); portee.push(l);
  }
  const lum = new THREE.PointLight(0xffffff, 0, 160, 1.4); groupe.add(lum);
  const lum2 = new THREE.PointLight(0xffffff, 0, 160, 1.4); groupe.add(lum2);

  /* ------------------------------------------------------------ chorégraphies */
  const JAUNE = '#ffe23d', OR = '#ffc83d';
  function effet(i, u, D, pk, base, cap, t, R) {
    const p = base, dev = new THREE.Vector3(Math.sin(cap), 0, Math.cos(cap));   // dev = vers le ring (avant de la voiture)
    const arr = p.clone().addScaledVector(dev, -4.5).setY(1.2);
    const fin = clamp((D + 0.9 - u) / 0.9);                                     // extinction en fin de créneau
    switch (i) {
      case 0: {                                                                 // Mimine : forge + poussière western + retours de flammes
        emettre('braise', 140, 11, t, pk, p.clone().setY(3), { v0: 40, v1: 110, haut: 1.0, ouverture: 1.4, g: 260, vie: 0.9, couleurs: ['#ffb347', '#ff7a1a', '#fff1b0'] });
        for (let k = 0; k < 4; k++) emettre('braise', 40, 12 + k, t, pk + 0.35 + k * 0.45, arr, { dir: dev.clone().multiplyScalar(-1).setY(0.25), v0: 60, v1: 90, ouverture: 0.35, g: 0, vie: 0.35, couleurs: ['#ff5a14', '#ffd27a', '#5aa0ff'] });
        R.fumees.push({ p: p.clone().setY(1), t0: base.t0 - 0.1, duree: Math.min(D, 3), n: 140, couleur: new THREE.Color(0.62, 0.48, 0.32), vent: { x: 6, z: 0 }, taille: 9, opacite: 0.32 });
        R.lumiere = ['#ff8a2a', 3.5 * fin * (0.7 + 0.3 * Math.sin(t * 40))]; break;
      }
      case 1: {                                                                 // Twingo : bonbons + onde de choc sucrée
        const C = ['#ff4fb8', '#ffd1ec', '#7df9ff', '#ffe23d', '#b06bff', '#ff2a6d'];
        emettre('bonbon', 220, 21, t, base.t0 - 0.2, p.clone().setY(70), { v0: 10, v1: 40, haut: -1.2, ouverture: 2.6, g: 160, trainee: 1.4, vie: 2.4, etalement: 1.0, couleurs: C, tourne: 8 });
        emettre('batonnet', 60, 22, t, base.t0, p.clone().setY(65), { v0: 10, v1: 30, haut: -1.2, ouverture: 2.6, g: 160, vie: 2.4, etalement: 0.8, couleurs: C });
        const d = u - pk; if (d > 0 && d < 1.2) { anneau(p, 4 + d * 70, (1 - d / 1.2) * 0.9, '#ff4fb8'); anneau(p, 2 + d * 45, (1 - d / 1.2) * 0.6, '#7df9ff'); R.flash = Math.max(R.flash, Math.exp(-d / 0.08) * 0.5); R.sec = Math.max(R.sec, Math.exp(-d / 0.15) * 0.6); }
        R.lumiere = ['#ff4fb8', 4 * fin]; R.teinte = [1.08, 0.94, 1.06]; break;
      }
      case 2: {                                                                 // Optic : stroboscope rock + éclairs
        const d = u - pk;
        if (d > 0 && d < 1.6) { const strobe = Math.floor(d * 12) % 2; R.teinte = strobe ? [1.5, 1.35, 0.25] : [0.18, 0.18, 0.12]; R.sec = Math.max(R.sec, 0.5 * Math.exp(-d / 0.5));
          const tr = Math.floor(t * 30); for (let k = 0; k < 5; k++) { const a = hash(tr * 7 + k) * Math.PI * 2; eclair(p.clone().add(v.set(Math.cos(a) * 25, 45, Math.sin(a) * 25)), p.clone().setY(2), tr * 31 + k * 17, k % 2 ? JAUNE : '#ffffff', 0.9, 6); } }
        if (d > 0 && d < 0.1) R.flash = Math.max(R.flash, 0.7);
        R.lumiere = [JAUNE, (d > 0 ? (Math.floor(d * 12) % 2 ? 6 : 0.5) : 1) * fin]; break;
      }
      case 3: {                                                                 // Tata Freddy : cartes Balatro en lévitation
        for (let k = 0; k < 40; k++) {
          const ph = hash(k * 3.3) * Math.PI * 2, rr = 9 + hash(k * 5.1) * 12, mont = clamp((u - k * 0.02) / 0.6);
          const a = ph + u * (0.9 + hash(k) * 0.8) * (k % 2 ? 1 : -1), y = 3 + hash(k * 7.7) * 16 + Math.sin(u * 2 + k) * 1.5;
          v.set(p.x + Math.cos(a) * rr * mont, y * mont + 0.5, p.z + Math.sin(a) * rr * mont);
          e.set(Math.sin(u * 1.5 + k) * 0.4, -a + Math.PI / 2 + u * 2, Math.cos(u + k) * 0.3); q.setFromEuler(e);
          const sc = mont * clamp((D + 0.8 - u) / 0.6);
          poserInstance('carte', v, q, sc); poserInstance('dos', v, q, sc);
        }
        emettre('etoile', 160, 31, t, base.t0, p.clone().setY(8), { v0: 5, v1: 25, haut: 1.2, ouverture: 2, g: -20, vie: 1.8, etalement: Math.max(0.2, D - 0.5), couleurs: [OR, '#fff1b0'], taille: 0.8, flottant: true, face: CAMQ });
        R.lumiere = ['#c42b3a', 3 * fin]; break;
      }
      case 4: {                                                                 // Mario : bond, chute libre, crash cartoon
        const tImp = Math.max(1.4, Math.min(D - 0.6, 2.2));                         // le « waaah » est la chute : impact juste avant la fin du cri
        const w = clamp(u / tImp), y = u > 0 && u < tImp ? 320 * w * (1 - w) : 0;  // parabole : 80 cm au sommet, arrivée à pleine vitesse
        const rebond = u > tImp ? 6 * Math.abs(Math.sin((u - tImp) * 9)) * Math.exp(-(u - tImp) * 4) : 0;
        R.voitures[i] = { dy: y + rebond, tangage: u > 0 && u < tImp ? Math.sin(u * 14) * 0.25 : 0, roulis: u > 0 && u < tImp ? (u / tImp) * Math.PI * 2 : 0 };
        const d = u - tImp;
        if (d > 0 && d < 1.4) { anneau(p, 3 + d * 80, (1 - d / 1.4), '#ffffff'); anneau(p, 2 + d * 50, (1 - d / 1.4) * 0.8, '#ffe23d'); R.sec = Math.max(R.sec, Math.exp(-d / 0.2) * 1.2); R.flash = Math.max(R.flash, Math.exp(-d / 0.06) * 0.6); }
        emettre('debris', 70, 41, t, base.t0 + tImp, p.clone().setY(1), { v0: 40, v1: 120, haut: 0.9, ouverture: 1.0, g: 400, vie: 1.2 });
        emettre('etoile', 30, 42, t, base.t0 + tImp, p.clone().setY(10), { v0: 15, v1: 30, haut: 0.3, ouverture: 0.4, flottant: true, vie: 1.4, couleurs: [JAUNE], taille: 1.4, face: CAMQ });
        if (u > tImp - 0.05) R.fumees.push({ p: p.clone().setY(0.5), t0: base.t0 + tImp, duree: 0.3, n: 90, couleur: new THREE.Color(0.8, 0.75, 0.68), vent: { x: 0, z: 0 }, taille: 10, opacite: 0.45 });
        R.lumiere = ['#ff3030', 2 * fin]; break;
      }
      case 5: {                                                                 // Symphonie : portée ondulante + notes de lumière
        portee.forEach((l, k) => {
          const pos = l.geometry.attributes.position, mont = clamp(u / 0.8) * fin;
          for (let j = 0; j < 96; j++) { const a = j / 95 * Math.PI * 2 + u * 0.8, rr = 13 + k * 0.9, yy = 6 + k * 1.4 + Math.sin(a * 3 + u * 4) * 2.2; pos.setXYZ(j, p.x + Math.cos(a) * rr, yy * mont + 0.2, p.z + Math.sin(a) * rr); }
          pos.needsUpdate = true; l.visible = mont > 0.01; l.material.opacity = mont;
        });
        for (let k = 0; k < 40; k++) {
          const ne = k * 0.07, age = u - ne; if (age < 0 || age > 2.2) continue;
          const a = hash(k * 2.7) * Math.PI * 2 + age * 0.6, rr = 13 + (k % 5) * 0.9;
          v.set(p.x + Math.cos(a) * rr * (1 - age * 0.25), 6 + (k % 5) * 1.4 + age * 9, p.z + Math.sin(a) * rr * (1 - age * 0.25));
          poserInstance('note', v, CAMQ, clamp(age / 0.2) * clamp((2.2 - age) / 0.5) * 1.2, k % 3 ? '#ffe9a8' : '#9fd8ff');
        }
        R.lumiere = ['#ffe9a8', 3 * fin]; break;
      }
      case 6: {                                                                 // Yaris : rayon divin + Triforce
        const mont = clamp(u / 0.4) * fin;
        colonne(p, 7 + Math.sin(u * 6) * 0.3, 260, 0, 0.32 * mont, OR); colonne(p, 3, 260, 0, 0.5 * mont, '#fff6d0');
        const d = u - pk; triforce.visible = u > 0 && fin > 0.01;
        if (triforce.visible) { const k = clamp(d / 0.6 + 0.3); triforce.position.set(p.x, 10 + 8 * clamp(u / 1.2), p.z); triforce.rotation.set(0, u * 1.6, 0); triforce.scale.setScalar(2.4 * k * fin); }
        emettre('etoile', 200, 61, t, base.t0, p.clone().setY(2), { v0: 4, v1: 14, haut: 1.4, ouverture: 0.6, g: -40, flottant: true, vie: 2, etalement: Math.max(0.2, D - 0.4), couleurs: [OR, '#fff6d0'], taille: 0.7, face: CAMQ, rayon0: 6 });
        R.lumiere = [OR, 6 * mont]; R.teinte = [1.06, 1.02, 0.9]; break;
      }
      case 7: {                                                                 // A4 (Metroid) : grille hexagonale + scanner de téléportation
        const mont = clamp(u / 0.5) * fin;
        hex.visible = mont > 0.01; hex.position.set(p.x, 0.25, p.z); hex.scale.setScalar(10 + 60 * clamp(u / 0.8)); hex.material.opacity = 0.85 * mont;
        const cyc = (u * 1.4) % 1, ys = cyc < 0.5 ? cyc * 2 * 9 : (1 - cyc) * 2 * 9;
        scanner.visible = mont > 0.01; scanner.position.set(p.x, 0.3 + ys, p.z); scanner.scale.setScalar(6.5); scanner.material.opacity = mont;
        colonne(p, 6.5, 12, 0, 0.12 * mont, '#60e0ff');
        R.voitures[i] = { scintille: u > 0 && u < 0.8 ? (Math.floor(u * 30) % 3 === 0 ? 0 : 1) : 1 };
        R.lumiere = ['#60e0ff', 4 * mont]; R.teinte = [0.85, 1.02, 1.18]; break;
      }
      case 8: {                                                                 // Titou (Valstrax) : comète pourpre, bang, flammes de dragon
        const tImp = pk, depart = p.clone().add(v.set(-90, 140, -60)), pos = geoComete.attributes.position, k = clamp((u + 0.6) / (tImp + 0.6));
        for (let j = 0; j < NC; j++) { const w = j / (NC - 1) * k; pos.setXYZ(j, depart.x + (p.x - depart.x) * w, depart.y + (p.y + 1 - depart.y) * w * (2 - w), depart.z + (p.z - depart.z) * w); }
        pos.needsUpdate = true; comete.visible = u > -0.6 && u < tImp + 0.6 && fin > 0; comete.material.opacity = u < tImp ? 1 : 1 - clamp((u - tImp) / 0.6);
        const tete = v.set(pos.getX(NC - 1), pos.getY(NC - 1), pos.getZ(NC - 1)).clone();
        if (u < tImp) emettre('etoile', 120, 81, t, base.t0 - 0.6, tete, { v0: 2, v1: 8, flottant: true, vie: 0.5, etalement: tImp + 0.6, couleurs: ['#d070ff', '#ff70d0', '#ffffff'], taille: 2, face: CAMQ });
        const d = u - tImp;
        if (d > 0 && d < 1.5) { anneau(p, 4 + d * 110, (1 - d / 1.5), '#d070ff'); anneau(p, 3 + d * 60, (1 - d / 1.5), '#ff3060', 6, 0); R.sec = Math.max(R.sec, Math.exp(-d / 0.25) * 1.5); R.flash = Math.max(R.flash, Math.exp(-d / 0.05) * 0.8); }
        emettre('braise', 260, 82, t, base.t0 + tImp, p.clone().setY(1), { v0: 30, v1: 90, haut: 1.2, ouverture: 0.8, g: -60, trainee: 2, vie: 1.4, etalement: 1.2, couleurs: ['#ff3060', '#d070ff', '#ffb347'], rayon0: 8 });
        R.lumiere = ['#d070ff', (u < tImp ? 2 : 8 * Math.exp(-d * 1.5) + 2) * fin]; break;
      }
      case 9: {                                                                 // Doom Slayer (Berserk) : éclipse, foudre noire, braises
        const mont = clamp(u / 0.8) * fin;
        eclipse.visible = mont > 0.01; eclipse.position.set(p.x - dev.x * 40, 55, p.z - dev.z * 40); eclipse.lookAt(p.x, 20, p.z); eclipse.scale.setScalar(16 * (0.6 + 0.4 * mont));
        couronne.material.opacity = mont * (0.8 + 0.2 * Math.sin(t * 7));
        const tr = Math.floor(t * 24); if (u > pk && u < D) for (let k = 0; k < 3; k++) if (hash(tr * 3 + k) > 0.5) { const a = hash(tr * 11 + k) * 6.28; eclair(eclipse.position.clone(), p.clone().add(v.set(Math.cos(a) * 12, 0, Math.sin(a) * 12)), tr * 13 + k, k ? '#300008' : '#ff1020', 0.95, 9); }
        emettre('braise', 240, 91, t, base.t0, p.clone().setY(0.5), { v0: 8, v1: 25, haut: 1.5, ouverture: 0.6, g: -50, trainee: 1, vie: 2.2, etalement: Math.max(0.3, D - 0.4), couleurs: ['#ff1020', '#ff6a1a', '#5a0000'], rayon0: 14 });
        R.teinte = [1.25, 0.55, 0.5].map((x) => 1 + (x - 1) * mont); R.lumiere = ['#ff1020', 4 * mont]; break;
      }
      case 10: {                                                                // Milo (Galaxy) : étoiles filantes + poussière de Luma
        for (let k = 0; k < 6; k++) { const ne = k * 0.35, d = u - ne; if (d < 0 || d > 0.7) continue; const a = hash(k * 9.1) * 6.28, de = p.clone().add(v.set(Math.cos(a) * 60, 90, Math.sin(a) * 60));
          emettre('etoile', 40, 100 + k, t, base.t0 + ne, de, { dir: p.clone().sub(de).normalize(), v0: 160, v1: 180, ouverture: 0.05, flottant: true, trainee: 0.01, vie: 0.7, couleurs: ['#fff6a8', '#9fd8ff'], taille: 1.6, face: CAMQ }); }
        for (let k = 0; k < 160; k++) { const a = hash(k * 1.3) * 6.28 + u * (1.5 + hash(k) * 1.5), rr = 6 + hash(k * 2.1) * 12, y = 1 + hash(k * 3.7) * 14 + Math.sin(u * 3 + k) * 1.2; if (u < k * 0.004) continue;
          poserInstance('etoile', v.set(p.x + Math.cos(a) * rr, y, p.z + Math.sin(a) * rr), CAMQ, 0.5 * fin * clamp(u / 0.4), ['#fff6a8', '#9fd8ff', '#ff9fd8'][k % 3]); }
        R.lumiere = ['#9fd8ff', 4 * fin]; R.teinte = [0.95, 0.98, 1.15]; break;
      }
      case 11: {                                                                // Bob (JoJo) : ゴゴゴ + aura de Stand
        for (let k = 0; k < 9; k++) {
          const ne = k * 0.18, age = u - ne; if (age < 0) continue;
          const cote = k % 2 ? 1 : -1, a = cap + cote * (0.9 + (k >> 1) * 0.25);
          v.set(p.x + Math.sin(a) * 18, 8 + (k >> 1) * 4 + Math.sin(u * 2 + k) * 0.8, p.z + Math.cos(a) * 18);
          e.set(0, a + Math.PI, Math.sin(u * 5 + k) * 0.12); q.setFromEuler(e);
          poserInstance('kanji', v, q, clamp(age / 0.15) * (1 + 0.15 * Math.sin(u * 9 + k)) * fin);
        }
        R.fumees.push({ p: p.clone().setY(1), t0: base.t0, duree: Math.min(3, D), n: 120, couleur: new THREE.Color(0.5, 0.15, 0.75), vent: { x: 0, z: 0 }, taille: 8, opacite: 0.3 });
        const d = (u * 1.6) % 1; anneau(p, 4 + d * 14, (1 - d) * 0.7 * fin, '#b44dff');
        R.lumiere = ['#b44dff', 4 * fin]; R.teinte = [1.02, 0.88, 1.15]; break;
      }
      case 12: {                                                                // Jojo (Tokyo Drift) : rideau de fumée + néons + dérapage
        R.fumees.push({ p: arr.clone().setY(0.6), t0: base.t0 - 0.1, duree: Math.min(3, D), n: 260, couleur: new THREE.Color(0.95, 0.95, 0.97), vent: { x: dev.x * -10, z: dev.z * -10 }, taille: 12, opacite: 0.5 });
        R.voitures[i] = { dcap: Math.sin(clamp(u / Math.max(0.5, D)) * Math.PI * 2) * 0.55 * fin };
        R.lumiere = ['#ff2a9d', 5 * fin]; R.lumiere2 = ['#2ae0ff', 5 * fin]; R.teinte = [1.05, 0.92, 1.12]; break;
      }
      case 13: {                                                                // Ninja-Nissan (Splatoon) : éclaboussure d'encre à 360°
        const C = ['#b6ff00', '#ff1fa8', '#b6ff00', '#7a00ff'];
        emettre('encre', 320, 131, t, base.t0 + pk, p.clone().setY(3), { v0: 50, v1: 160, haut: 0.5, ouverture: 0.9, g: 320, trainee: 0.8, vie: 1.6, couleurs: C, taille: 1.4, tourne: 2 });
        const d = u - pk; if (d > 0 && d < 1.0) { anneau(p, 4 + d * 70, (1 - d), '#b6ff00'); anneau(p, 3 + d * 50, (1 - d), '#ff1fa8'); R.sec = Math.max(R.sec, Math.exp(-d / 0.15) * 0.9); R.flash = Math.max(R.flash, Math.exp(-d / 0.05) * 0.4); }
        R.lumiere = ['#b6ff00', 5 * fin]; R.lumiere2 = ['#ff1fa8', 5 * fin]; break;
      }
      case 14: {                                                                // Princess (Daisy) : pétales + flash pop solaire
        const C = ['#ffffff', '#fff8e0', '#ffe23d', '#ffffff'];
        for (let k = 0; k < 220; k++) { const a = hash(k * 1.9) * 6.28 + u * (2.5 + hash(k) * 2), rr = 3 + clamp(u / 0.8) * (6 + hash(k * 4.4) * 16), y = 0.5 + hash(k * 6.1) * 3 + u * (6 + hash(k * 8.2) * 10); if (y > 40) continue;
          e.set(u * 4 + k, a, u * 3); q.setFromEuler(e); poserInstance('petale', v.set(p.x + Math.cos(a) * rr, y, p.z + Math.sin(a) * rr), q, fin, C[k % 4]); }
        const d = u - pk; if (d > 0 && d < 0.9) { R.flash = Math.max(R.flash, Math.exp(-d / 0.07) * 0.8); anneau(p, 3 + d * 60, (1 - d / 0.9), '#ffe23d'); R.teinte = [1.15, 1.08, 0.85]; }
        R.lumiere = ['#ffe23d', 5 * fin]; break;
      }
    }
  }

  function maj(t, ctx) {
    if (ctx.camera) CAMQ.copy(ctx.camera.quaternion);
    for (const n in P) P[n].userData.n = 0;
    nAnneaux = 0; nCol = 0; nEcl = 0;
    anneaux.forEach((m) => { m.visible = false; }); colonnes.forEach((m) => { m.visible = false; }); eclairs.forEach((l) => { l.visible = false; });
    triforce.visible = hex.visible = scanner.visible = eclipse.visible = comete.visible = false; portee.forEach((l) => { l.visible = false; });
    lum.intensity = lum2.intensity = 0;
    const R = { fumees: [], flash: 0, sec: 0, teinte: null, voitures: {}, lumiere: null, lumiere2: null };
    const themes = ctx.themes || [];
    for (let i = 0; i < Math.min(15, themes.length); i++) {
      const [t0, t1] = themes[i]; if (t < t0 - 0.7 || t > t1 + 1.6) continue;
      const pl = ctx.places[i]; if (!pl) continue;
      const base = pl.p.clone(); base.t0 = t0;
      R.lumiere = null; R.lumiere2 = null;
      effet(i, t - t0, t1 - t0, ctx.punchs ? ctx.punchs[i] || 0 : 0, base, pl.cap, t, R);
      if (R.lumiere) { lum.color.set(R.lumiere[0]); lum.intensity = Math.max(lum.intensity, R.lumiere[1]); lum.position.set(base.x, 18, base.z); }
      if (R.lumiere2) { lum2.color.set(R.lumiere2[0]); lum2.intensity = R.lumiere2[1]; lum2.position.set(base.x + 12, 10, base.z - 12); }
    }
    for (const n in P) {
      const M = P[n]; for (let k = M.userData.n; k < M.count; k++) M.setMatrixAt(k, zero);
      M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true; M.visible = M.userData.n > 0;
    }
    return R;
  }

  return { groupe, maj, liberer() { for (const o of jetables) if (o && o.dispose) o.dispose(); } };
}
