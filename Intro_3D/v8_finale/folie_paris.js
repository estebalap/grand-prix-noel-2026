/* SEGMENT « folie » — PLAN DES PARIS (44 → 55 s) : la table de jeu de Noël, à l'échelle réelle (1 unité = 1 cm).

   44,0 → 46,5  le smartphone se dresse sur le tapis de velours rouge, gros plan : « QUI VA GAGNER ? » + 3 GROS boutons 3D
   46,5 → 49,5  PLUIE DE 40 PIÈCES D'OR (repère son paris_pluie_pieces 46,5 s) : chute, rebonds, pièces qui tournoient puis se couchent
   49,6 → 51,9  un doigt appuie sur « MÉGANE » (repère son paris_bouton 51,0 s) : le bouton s'enfonce, s'illumine, onde lumineuse
   52,0 → 55,0  le CARNET DE PARIS papier « à l'ancienne », pour ceux qui n'ont pas de téléphone : le crayon écrit la dernière ligne

   Une Mégane miniature garée à côté du téléphone donne l'échelle. Aucune interface : tout est dans la scène.
   maj(t) est une fonction pure de t (pièces : trajectoires balistiques en forme close, graine fixe). */
import { graineur } from '../v7_multivers_4k/physique_cgi.js';
import { chemin } from '../v7_multivers_4k/camera_crescendo.js';
import { poser } from '../v7_multivers_4k/voitures.js';
import { clamp, lerp, smoother, textureToile, policeCanvas, rectArrondi, poseLibre, roulerRoues } from './folie_outils.js';

export const T_PLUIE = 46.5, T_BOUTON = 51.0;
const BOUTONS = [
  { label: 'SUPRA', fond: '#ff3b3b', texte: '#ffffff' },
  { label: 'MÉGANE', fond: '#ffd21f', texte: '#2a1600' },
  { label: 'BATMOBILE', fond: '#3fa9ff', texte: '#ffffff' },
];
const CHOIX = 1;                                           // le bouton pressé : MÉGANE (elle gagnera le photo-finish)
const ECRAN = { l: 7.0, h: 15.0 }, CORPS = { l: 7.6, h: 15.8, e: 0.8 }, BTN = { l: 6.2, h: 2.4, e: 0.3 };
const Y_BOUTONS = [1.0, -2.1, -5.2];                       // centres des boutons sur l'écran (repère de l'écran, cm)
const INCLINAISON = -0.16;                                 // le téléphone est penché en arrière sur son support (≈ 9°)
const CARNET = { x: -27, z: 3, lacet: 0.22 };

function formeArrondie(THREE, l, h, r) {
  const s = new THREE.Shape(), x = -l / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + l - r, y); s.quadraticCurveTo(x + l, y, x + l, y + r); s.lineTo(x + l, y + h - r); s.quadraticCurveTo(x + l, y + h, x + l - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function creerParis(ctx, { lum, voitures }) {
  const { THREE } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'folie-paris';

  /* ───────── la table : velours rouge, guirlande de lumières floues au loin ───────── */
  const velours = new THREE.MeshStandardMaterial({ color: 0x2e0408, roughness: 1, metalness: 0, envMapIntensity: 0.04 });
  const table = new THREE.Mesh(new THREE.CircleGeometry(160, 64), velours); table.rotation.x = -Math.PI / 2; groupe.add(table);
  const fondMur = new THREE.Mesh(new THREE.PlaneGeometry(900, 400), new THREE.MeshBasicMaterial({ color: 0x0b0405 })); fondMur.position.set(0, 120, -260); groupe.add(fondMur);
  const rb = graineur(4612), couleursGuirlande = ['#ffcf7a', '#ff6b4a', '#ffe9b0', '#7fd0ff', '#ffb347'];
  const geoBokeh = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 46; i++) {
    const c = new THREE.Color(couleursGuirlande[i % 5]).multiplyScalar(1.6 + rb() * 1.4);
    const m = new THREE.Mesh(geoBokeh, new THREE.MeshBasicMaterial({ color: c, toneMapped: false, fog: false }));
    const x = -220 + (i / 45) * 440 + (rb() - 0.5) * 20, y = 30 + 26 * Math.sin(i * 0.55) + rb() * 18, z = -200 - rb() * 40;
    m.position.set(x, y, z); m.scale.setScalar(0.9 + rb() * 1.1); groupe.add(m);
  }

  /* ───────── le smartphone ───────── */
  const tel = new THREE.Group(); tel.position.set(0, 0, 0); groupe.add(tel);
  const support = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.3, 3.4), new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.7, roughness: 0.35 }));
  support.position.set(0, 0.65, 0.2); tel.add(support);
  const dos = new THREE.Mesh(new THREE.BoxGeometry(5.2, 9, 0.6), support.material); dos.position.set(0, 4.6, -1.9); dos.rotation.x = -0.32; tel.add(dos);
  const pivot = new THREE.Group(); pivot.position.set(0, 1.25, 0); pivot.rotation.x = INCLINAISON; tel.add(pivot);
  const geoCorps = new THREE.ExtrudeGeometry(formeArrondie(THREE, CORPS.l, CORPS.h, 1.0), { depth: CORPS.e, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 3, curveSegments: 10 });
  geoCorps.translate(0, CORPS.h / 2, -CORPS.e / 2);
  const corps = new THREE.Mesh(geoCorps, new THREE.MeshPhysicalMaterial({ color: 0x14141b, metalness: 0.65, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }));
  pivot.add(corps);
  const texEcran = textureToile(THREE, 560, 1200, (g, w, h) => {
    const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#141a44'); d.addColorStop(1, '#05060f'); g.fillStyle = d; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = policeCanvas(118); g.fillStyle = '#ffffff'; g.fillText('QUI VA', w / 2, 175);
    g.fillStyle = '#ffe23d'; g.fillText('GAGNER ?', w / 2, 305);
    // alvéoles sombres sous les boutons 3D
    for (const yb of Y_BOUTONS) { const ty = (ECRAN.h / 2 - yb) / ECRAN.h * h; g.fillStyle = 'rgba(0,0,0,.45)'; rectArrondi(g, 22, ty - 112, w - 44, 224, 56); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; rectArrondi(g, w / 2 - 70, h - 34, 140, 10, 5); g.fill();         // barre d'accueil
  });
  const ecran = new THREE.Mesh(new THREE.PlaneGeometry(ECRAN.l, ECRAN.h), new THREE.MeshBasicMaterial({ map: texEcran, toneMapped: false }));
  const zEcran = CORPS.e / 2 + 0.125; ecran.position.set(0, CORPS.h / 2, zEcran); pivot.add(ecran);
  // boutons 3D (caps texturées, flancs colorés), halo additif et onde lumineuse
  const geoBtn = new THREE.ExtrudeGeometry(formeArrondie(THREE, BTN.l, BTN.h, 0.7), { depth: BTN.e, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 8 });
  const texHalo = textureToile(THREE, 256, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const boutons = BOUTONS.map((b, i) => {
    const tex = textureToile(THREE, 620, 240, (g, w, h) => {
      g.fillStyle = b.fond; rectArrondi(g, 0, 0, w, h, 70); g.fill();
      const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, 'rgba(255,255,255,.35)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = lg; rectArrondi(g, 0, 0, w, h, 70); g.fill();
      let px = 132; g.font = policeCanvas(px); while (g.measureText(b.label).width > w - 90 && px > 60) { px -= 4; g.font = policeCanvas(px); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (b.texte === '#ffffff') { g.lineWidth = 12; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineJoin = 'round'; g.strokeText(b.label, w / 2, h / 2 + 6); }
      g.fillStyle = b.texte; g.fillText(b.label, w / 2, h / 2 + 6);
    });
    tex.repeat.set(1 / BTN.l, 1 / BTN.h); tex.offset.set(0.5, 0.5);
    const face = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), flanc = new THREE.MeshBasicMaterial({ color: new THREE.Color(b.fond).multiplyScalar(0.55), toneMapped: false });
    const m = new THREE.Mesh(geoBtn, [face, flanc]); m.position.set(0, CORPS.h / 2 + Y_BOUTONS[i], zEcran - 0.02); pivot.add(m);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(BTN.l * 1.5, BTN.h * 2.1), new THREE.MeshBasicMaterial({ map: texHalo, color: new THREE.Color(b.fond).multiplyScalar(2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.position.set(0, CORPS.h / 2 + Y_BOUTONS[i], zEcran + 0.01); pivot.add(halo);
    return { m, face, halo, base: m.position.z };
  });
  const onde = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe23d').multiplyScalar(2.4), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  onde.position.set(0, CORPS.h / 2 + Y_BOUTONS[CHOIX], zEcran + 0.45); pivot.add(onde);
  // le doigt (cartoon) qui vient parier
  const peau = new THREE.MeshStandardMaterial({ color: 0xb9744f, roughness: 0.7, metalness: 0, envMapIntensity: 0.2 });
  const doigt = new THREE.Group(); pivot.add(doigt);
  const bout = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 14), peau); doigt.add(bout);
  const phal = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.72, 4.4, 20), peau); phal.rotation.x = Math.PI / 2; phal.position.z = 2.2; doigt.add(phal);
  const art = new THREE.Mesh(new THREE.SphereGeometry(0.76, 18, 12), peau); art.position.z = 4.4; doigt.add(art);
  const phal2 = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.84, 6, 20), peau); phal2.rotation.x = Math.PI / 2; phal2.position.z = 7.4; doigt.add(phal2);
  const ongle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), new THREE.MeshStandardMaterial({ color: 0xf6d2c8, roughness: 0.3 })); ongle.scale.set(1, 0.28, 1.25); ongle.position.set(0, 0.56, 0.5); doigt.add(ongle);
  const dirDoigt = new THREE.Vector3(1, 0.32, 0.62).normalize();
  doigt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirDoigt);
  const pointBouton = new THREE.Vector3(0.6, CORPS.h / 2 + Y_BOUTONS[CHOIX] - 0.2, zEcran + BTN.e + 0.08 + 0.66);

  /* ───────── 40 pièces d'or (InstancedMesh) ───────── */
  const texPiece = textureToile(THREE, 128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2); r.addColorStop(0, '#fff2b0'); r.addColorStop(0.7, '#f2b52c'); r.addColorStop(1, '#a86d0a');
    g.fillStyle = r; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,70,0,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 12, 0, 7); g.stroke();
    g.fillStyle = 'rgba(140,80,0,.85)'; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 16 : 38; g.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  });
  const orFace = new THREE.MeshStandardMaterial({ map: texPiece, color: 0xffffff, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.2 });
  const orTranche = new THREE.MeshStandardMaterial({ color: 0xe0a21e, metalness: 1, roughness: 0.25 });
  const NP = 40, RP = 1.25, EP = 0.24;
  const pieces = new THREE.InstancedMesh(new THREE.CylinderGeometry(RP, RP, EP, 28), [orTranche, orFace, orFace], NP);
  pieces.frustumCulled = false; groupe.add(pieces);
  const G = 620, rp = graineur(4040), traj = [];
  for (let i = 0; i < NP; i++) {
    let x = 0, z = 0;
    for (let essai = 0; essai < 40; essai++) {                                     // pas de pièce devant l'écran (la caméra doit lire les boutons)
      const a = rp() * Math.PI * 2, r = 6.5 + rp() * 15; x = Math.cos(a) * r; z = Math.sin(a) * r * 0.75 - 1;
      if (!(Math.abs(x) < 5.5 && z > -2.5)) break;
    }
    const h0 = 24 + rp() * 16, tr = T_PLUIE + (i / NP) * 0.75 + rp() * 0.35, tf = Math.sqrt(2 * h0 / G), vImp = G * tf;
    const v1 = 0.34 * vImp, t1 = 2 * v1 / G, v2 = 0.3 * v1, t2 = 2 * v2 / G;
    traj.push({ x, z, h0, tr, tf, v1, t1, v2, t2, w1: 9 + rp() * 14, w2: 6 + rp() * 12, ph: rp() * 6.28, lacet: rp() * 6.28, y0: EP / 2 + (i % 4) * 0.005, deriv: [(rp() - 0.5) * 8, (rp() - 0.5) * 8] });
  }
  // petites piles déjà misées à côté du carnet
  const NPile = 14, pile = new THREE.InstancedMesh(pieces.geometry, [orTranche, orFace, orFace], NPile); groupe.add(pile);
  { const o = new THREE.Object3D(); for (let i = 0; i < NPile; i++) { const k = i < 6 ? 0 : i < 10 ? 1 : 2, n = i < 6 ? i : i < 10 ? i - 6 : i - 10; o.position.set(CARNET.x + 14 + k * 3.1, EP / 2 + n * (EP + 0.02), CARNET.z - 4 + k * 2.6); o.rotation.set(0, i * 0.7, (i % 3 - 1) * 0.02); o.updateMatrix(); pile.setMatrixAt(i, o.matrix); } pile.instanceMatrix.needsUpdate = true; }

  /* ───────── le carnet de paris papier ───────── */
  const carnet = new THREE.Group(); carnet.position.set(CARNET.x, 0, CARNET.z); carnet.rotation.y = CARNET.lacet; groupe.add(carnet);
  const couv = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.5, 15.2), new THREE.MeshStandardMaterial({ color: 0x7a1420, roughness: 0.7 })); couv.position.y = 0.25; carnet.add(couv);
  const papier = (titre, lignes) => textureToile(THREE, 640, 900, (g, w, h) => {
    g.fillStyle = '#f6f0de'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,110,200,.35)'; g.lineWidth = 3; for (let y = 150; y < h - 30; y += 92) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(220,60,60,.55)'; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, h); g.stroke();
    g.fillStyle = '#0f1a5c'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (titre) { g.font = 'italic ' + policeCanvas(70, 700, 'Nunito'); g.fillText(titre, 96, 124); }
    lignes.forEach((l, k) => { g.font = 'italic ' + policeCanvas(64, 900, 'Nunito'); g.fillText(l, 92, 236 + k * 184); });
  });
  const pageG = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 14.4), new THREE.MeshStandardMaterial({ map: papier('PARIS DE NOËL', ['Papi : MÉGANE', 'Mamie : BATMOBILE', 'Tonton : SUPRA']), color: 0x9c968a, roughness: 0.95, envMapIntensity: 0.05 }));
  pageG.rotation.set(-Math.PI / 2, 0, 0); pageG.position.set(-5.25, 0.62, 0); carnet.add(pageG);
  const pageD = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 14.4), new THREE.MeshStandardMaterial({ map: papier('', []), color: 0x9c968a, roughness: 0.95, envMapIntensity: 0.05 }));
  pageD.rotation.set(-Math.PI / 2, 0, 0); pageD.position.set(5.25, 0.62, 0); carnet.add(pageD);
  // la ligne écrite en direct (révélée de gauche à droite, au rythme du crayon)
  const texLigne = textureToile(THREE, 640, 200, (g, w, h) => { g.fillStyle = '#0f1a5c'; g.font = 'italic ' + policeCanvas(80, 900, 'Nunito'); g.textBaseline = 'middle'; g.fillText('Tata : MÉGANE !', 20, h / 2 - 8); g.strokeStyle = '#c0283a'; g.lineWidth = 7; g.beginPath(); g.moveTo(24, h - 34); g.quadraticCurveTo(w * 0.5, h - 18, w - 70, h - 40); g.stroke(); });
  const uLigne = { carte: { value: texLigne }, uK: { value: 0 } };
  const matLigne = new THREE.ShaderMaterial({ uniforms: uLigne, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D carte; uniform float uK; varying vec2 vUv; void main(){ if (vUv.x > uK) discard; vec4 c = texture2D(carte, vUv); if (c.a < 0.02) discard; gl_FragColor = vec4(c.rgb * 0.8, c.a); }' });
  const ligne = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 3.0), matLigne); ligne.rotation.set(-Math.PI / 2, 0, 0); ligne.position.set(5.25, 0.66, -4.4); carnet.add(ligne);
  // le crayon
  const crayon = new THREE.Group(); carnet.add(crayon);
  const fut = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 11, 6), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 })); fut.position.y = 6.5 + 0.6; crayon.add(fut);
  const bois = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0xe6c79a, roughness: 0.8 })); bois.rotation.x = Math.PI; bois.position.y = 0.7 + 0.3; crayon.add(bois);
  const mine = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); mine.rotation.x = Math.PI; mine.position.y = 0.22; crayon.add(mine);
  const gomme = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 1.1, 12), new THREE.MeshStandardMaterial({ color: 0xf08aa0, roughness: 0.8 })); gomme.position.y = 12.6 + 0.6; crayon.add(gomme);
  const T_ECRIT = [52.55, 54.3];

  /* ───────── caméra (clés lourdes : vitesse nulle aux clés) ───────── */
  const CAM = [
    { t: 44.0, p: [10, 13.5, 66], c: [0, 8.6, 0], fov: 30 },
    { t: 46.3, p: [2.4, 10.2, 34], c: [0, 8.7, 0], fov: 30 },
    { t: 47.3, p: [0.5, 16.5, 50], c: [0, 6.0, 0], fov: 32 },
    { t: 49.5, p: [-2.5, 15, 46], c: [0, 6.2, 0], fov: 32 },
    { t: 50.25, p: [3.2, 9.8, 31], c: [0.3, 8.4, 0], fov: 30 },
    { t: 51.85, p: [2.8, 9.6, 29.5], c: [0.3, 8.3, 0], fov: 30 },
    { t: 52.55, p: [CARNET.x + 6, 22, CARNET.z + 21], c: [CARNET.x + 1.5, 0.6, CARNET.z], fov: 34 },
    { t: 55.0, p: [CARNET.x + 4.5, 20, CARNET.z + 18.5], c: [CARNET.x + 1.8, 0.6, CARNET.z], fov: 34 },
  ];

  const o = new THREE.Object3D(), vT = new THREE.Vector3();
  return {
    groupe,
    maj(t) {
      /* boutons : enfoncement et lumière (MÉGANE), les autres s'effacent après le pari */
      const enf = t < T_BOUTON - 0.02 ? 0 : t < T_BOUTON + 0.05 ? smoother((t - T_BOUTON + 0.02) / 0.07) * 0.22 : t < 51.3 ? 0.22 : lerp(0.22, 0.06, smoother((t - 51.3) / 0.2));
      const allume = smoother((t - T_BOUTON) / 0.12);
      boutons.forEach((b, i) => {
        const choisi = i === CHOIX;
        b.m.position.z = b.base - (choisi ? enf : 0);
        const k = choisi ? 1 + 0.85 * allume + 0.12 * allume * Math.sin((t - T_BOUTON) * 9) : 1 - 0.45 * allume;
        b.face.color.setScalar(k);
        b.halo.material.opacity = choisi ? 0.75 * allume : 0;
      });
      const da = t - T_BOUTON; onde.material.opacity = da > 0 && da < 0.6 ? 0.9 * (1 - da / 0.6) : 0; onde.scale.set(3.6 + da * 9, 1.6 + da * 9, 1);
      /* doigt : approche, appui tenu, retrait */
      const d = t < 50.2 ? 14 : t < T_BOUTON ? lerp(13, 0, smoother((t - 50.2) / (T_BOUTON - 50.2))) : t < 51.3 ? 0 - 0.22 * smoother((t - T_BOUTON) / 0.06) : lerp(-0.22, 14, smoother((t - 51.3) / 0.6));
      doigt.visible = d < 13.5;
      doigt.position.copy(pointBouton).addScaledVector(dirDoigt, d);
      /* pièces d'or */
      for (let i = 0; i < NP; i++) {
        const q = traj[i], a = t - q.tr;
        if (a < 0) { o.position.set(0, -50, 0); o.scale.setScalar(0.0001); o.rotation.set(0, 0, 0); }
        else {
          let y, rx, rz, x = q.x, z = q.z;
          if (a < q.tf) { y = q.y0 + q.h0 - 0.5 * G * a * a; rx = q.ph + a * q.w1; rz = a * q.w2; x += q.deriv[0] * (a - q.tf); z += q.deriv[1] * (a - q.tf); }
          else {
            const b = a - q.tf;
            if (b < q.t1) y = q.y0 + q.v1 * b - 0.5 * G * b * b; else if (b < q.t1 + q.t2) { const c = b - q.t1; y = q.y0 + q.v2 * c - 0.5 * G * c * c; } else y = q.y0;
            const incl = 0.55 * Math.exp(-b * 3.2), prec = b * (14 - 6 * Math.min(1, b));             // la pièce tournoie et se couche (disque d'Euler)
            rx = incl * Math.cos(prec); rz = incl * Math.sin(prec);
          }
          o.position.set(x, Math.max(q.y0, y), z); o.rotation.set(rx, q.lacet + a * 2, rz); o.scale.setScalar(1);
        }
        o.updateMatrix(); pieces.setMatrixAt(i, o.matrix);
      }
      pieces.instanceMatrix.needsUpdate = true;
      /* carnet : la dernière ligne s'écrit, le crayon suit la plume */
      const k = clamp((t - T_ECRIT[0]) / (T_ECRIT[1] - T_ECRIT[0])); uLigne.uK.value = k;
      const xs = 5.25 - 4.8 + 0.05 + k * 8.6, ecrit = k > 0 && k < 1;
      crayon.position.set(xs, 0.66 + (ecrit ? 0.02 : 0.25 * smoother((t - T_ECRIT[1]) / 0.3)), -4.4 + (ecrit ? 0.45 * Math.sin(t * 38) : 0));
      crayon.rotation.set(0.35, 0, -0.45);
      /* la Mégane miniature, garée à côté du téléphone (échelle) */
      const meg = voitures.megane; meg.visible = true; poser(meg, poseLibre([-9.5, 0, 5.5], 0.95)); roulerRoues(meg, 0);
      /* lumières : salon chaud, contre-jour froid, lueur jaune du bouton, lampe sur le carnet */
      const surCarnet = smoother((t - 51.9) / 0.6);
      lum.regler('spot', { c: 0xffe2bc, i: lerp(1.6, 0.7, surCarnet), p: [14, 46, 34], v: [-6, 4, 0], d: 220, angle: 0.62, penombre: 0.7 });
      lum.regler('d1', { c: 0x8fb0ff, i: 0.7, p: [-30, 34, -40], v: [0, 6, 0] });
      lum.regler('d2', { c: 0xffd6a8, i: 0.35, p: [20, 20, 60], v: [0, 6, 0] });
      lum.regler('p1', { c: 0xffc890, i: 1.3, p: [-16, 14, 22], d: 90 });
      ecran.getWorldPosition(vT);
      lum.regler('p2', { c: 0xffd21f, i: 2.6 * allume * (t < 52.2 ? 1 : 0), p: [vT.x, vT.y - 2, vT.z + 6], d: 30 });
      lum.regler('p3', { c: 0xffe0b0, i: 0.55, p: [CARNET.x + 2, 20, CARNET.z + 8], d: 70 });
      return {
        camera: chemin(CAM, t),
        fond: 0x0b0405, brouillard: { couleur: '#0b0405', densite: 0.0022 },
        lumieres: { hemi: 0.22, cle: 0.25 },
        post: { exposition: 0.92, vignette: 0.62, bloomForce: 0.3, saturation: 1.05, fondu: Math.max(0, 1 - (t - 44) / 0.35) },
      };
    },
  };
}
