/* DÉCOR « ARÈNE » de l'intro v4 : un RING DE BOXE à l'échelle des miniatures, né du tapis du salon.

   Inspiration (demande d'Esteban, 25 oct.) : l'esprit des rings de boxe des jeux de combat. Création originale :
   aucun logo, nom, personnage ni visuel repris d'un jeu existant. On reprend seulement les MÉCANIQUES de mise en scène :
     - cordes ÉLASTIQUES qui rebondissent (impacts, passages, explosions) ;
     - un LUMINAIRE suspendu au-dessus du ring, qui peut CASSER (il bascule et pend à un câble) ;
     - un ÉCRAN GÉANT qui affiche les PORTRAITS des écuries et leurs SURNOMS ;
     - deux AMBIANCES commutables : « championnat » (ring bleu, lumière blanche) et « nuit sauvage » (ring sombre, rouge et or),
       plus l'ambiance « tapis » (le tapis rouge sang du salon devenu le ring, juste après la transformation).

   Échelle : 1 unité = 1 cm, comme le salon. Le ring (150 cm de côté) se dresse à l'emplacement du tapis : une miniature
   de 7 cm y paraît minuscule et héroïque à la fois (caméras basses, profondeur de champ).
   Conventions : THREE global (r128), aucun hasard non semé, animation par maj(t, etat).

   construireArene({ equipes, logos, graine }) → { groupe, maj(t, etat), ecran, ancres, liberer() }
     equipes : data/teams.json ; logos : { id → HTMLImageElement } (facultatif, sinon pastille aux couleurs)
     etat    : { theme: 'tapis'|'championnat'|'sauvage', allume: 0..1, rebond: [{t0, force, cote}], casse: 0..1, foule: 0..1 }
     ecran.afficher(mode, donnees) : 'titre' | 'ecurie' | 'groupe' | 'texte'
*/
import { graineur, toile, texture, toileTapis } from './salon.js';
const T = () => window.THREE;

export const COULEURS_VOIES = ['#ff4fb8', '#3f8cff', '#35e07a', '#ffe23d', '#ff8a2a'];
const THEMES = {
  tapis:       { tapis: null, jupe: 0x4a0409, cordes: [0xd9a43a, 0xd9a43a, 0xd9a43a], poteaux: 0xc9a14a, lumiere: 0xffe2b8, ambiance: 0x2a1410, fond: 0x0a0506 },
  championnat: { tapis: '#1d4fd8', jupe: 0x0d1f5c, cordes: [0xe02424, 0xf4f4f4, 0x1d4fd8], poteaux: 0xdfe3ea, lumiere: 0xffffff, ambiance: 0x1a2350, fond: 0x04060f },
  sauvage:     { tapis: '#3a0b0e', jupe: 0x150405, cordes: [0xffc83d, 0x111111, 0xffc83d], poteaux: 0x2a2a2a, lumiere: 0xff6a3a, ambiance: 0x3a0a08, fond: 0x070203 },
};

function toileRingBleu(rnd) {
  return toile(1024, 1024, (g, L, H) => {
    g.fillStyle = '#1d4fd8'; g.fillRect(0, 0, L, H);
    const id = g.getImageData(0, 0, L, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * 16; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    g.putImageData(id, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 10; g.strokeRect(40, 40, L - 80, H - 80);
    g.save(); g.translate(L / 2, H / 2); g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.92)';
    g.font = 'bold 110px sans-serif'; g.fillText('GRAND PRIX', 0, -20); g.font = 'bold 150px sans-serif'; g.fillText('DE NOËL', 0, 130); g.restore();
    COULEURS_VOIES.forEach((c, i) => { g.fillStyle = c; g.fillRect(L / 2 - 250 + i * 100, H / 2 + 175, 90, 18); });
  });
}
function toileRingSauvage(rnd) {
  return toile(1024, 1024, (g, L, H) => {
    g.fillStyle = '#2a0709'; g.fillRect(0, 0, L, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '120,30,20'},.25)`; g.beginPath(); g.arc(rnd() * L, rnd() * H, 2 + rnd() * 14, 0, 7); g.fill(); }
    g.strokeStyle = '#ffc83d'; g.lineWidth = 8; g.strokeRect(40, 40, L - 80, H - 80);
    g.save(); g.translate(L / 2, H / 2); g.rotate(-0.12); g.textAlign = 'center'; g.fillStyle = 'rgba(255,200,61,.85)'; g.font = 'bold 170px sans-serif'; g.fillText('GP·NOËL', 0, 60); g.restore();
  });
}

export function construireArene({ equipes = [], logos = {}, graine = 1912 } = {}) {
  const THREE = T(), rnd = graineur(graine), jetables = [];
  const garde = (o) => { jetables.push(o); return o; };
  const groupe = new THREE.Group(); groupe.name = 'arene';
  const RING = { cote: 150, haut: 22, x: 0, z: 25, poteau: 42, cordesY: [12, 22, 32] };
  const C = new THREE.Vector3(RING.x, RING.haut, RING.z);

  /* --- sol de l'arène (noir brillant) et halo sous le ring */
  const sol = new THREE.Mesh(garde(new THREE.CircleGeometry(900, 64)), garde(new THREE.MeshStandardMaterial({ color: 0x07070b, roughness: 0.18, metalness: 0.6 })));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; groupe.add(sol);

  /* --- ring : plateau, jupe, tapis (3 textures selon l'ambiance), poteaux, cordes élastiques */
  const texTapis = garde(texture(toileTapis(graineur(2312)))), texBleu = garde(texture(toileRingBleu(rnd))), texSauvage = garde(texture(toileRingSauvage(rnd)));
  const matTapis = garde(new THREE.MeshStandardMaterial({ map: texTapis, roughness: 0.85 }));
  const matJupe = garde(new THREE.MeshStandardMaterial({ color: 0x4a0409, roughness: 0.7 }));
  const plateau = new THREE.Mesh(garde(new THREE.BoxGeometry(RING.cote + 20, RING.haut, RING.cote + 20)), [matJupe, matJupe, matTapis, matJupe, matJupe, matJupe]);
  plateau.position.set(RING.x, RING.haut / 2, RING.z); plateau.castShadow = plateau.receiveShadow = true; groupe.add(plateau);
  for (const s of [-1, 1]) {                                                                              // marches d'accès
    const m = new THREE.Mesh(garde(new THREE.BoxGeometry(30, 8, 14)), matJupe); m.position.set(RING.x + s * 45, 4, RING.z + RING.cote / 2 + 17); m.castShadow = true; groupe.add(m);
    const m2 = new THREE.Mesh(garde(new THREE.BoxGeometry(30, 15, 7)), matJupe); m2.position.set(RING.x + s * 45, 7.5, RING.z + RING.cote / 2 + 13.5); groupe.add(m2);
  }
  const matPoteau = garde(new THREE.MeshStandardMaterial({ color: 0xc9a14a, roughness: 0.25, metalness: 0.9 }));
  const coins = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => new THREE.Vector3(RING.x + sx * RING.cote / 2, RING.haut, RING.z + sz * RING.cote / 2));
  const couleursCoins = [0xe02424, 0xf4f4f4, 0x1d4fd8, 0xf4f4f4];                                         // coin rouge, neutres, coin bleu
  const coussins = [];
  coins.forEach((p, i) => {
    const po = new THREE.Mesh(garde(new THREE.CylinderGeometry(2.2, 2.2, RING.poteau, 16)), matPoteau); po.position.set(p.x, RING.haut + RING.poteau / 2, p.z); po.castShadow = true; groupe.add(po);
    const cm = garde(new THREE.MeshStandardMaterial({ color: couleursCoins[i], emissive: couleursCoins[i], emissiveIntensity: 0.25, roughness: 0.5 }));
    const co = new THREE.Mesh(garde(new THREE.BoxGeometry(6, RING.cordesY[2] - RING.cordesY[0] + 8, 6)), cm); co.position.set(p.x, RING.haut + (RING.cordesY[0] + RING.cordesY[2]) / 2, p.z);
    co.lookAt(C.x, co.position.y, C.z); groupe.add(co); coussins.push(cm);
    const led = new THREE.Mesh(garde(new THREE.SphereGeometry(2.8, 16, 10)), garde(new THREE.MeshBasicMaterial({ color: COULEURS_VOIES[i + 1 > 4 ? 0 : i + 1], toneMapped: false })));
    led.position.set(p.x, RING.haut + RING.poteau + 2, p.z); groupe.add(led);
  });
  // cordes : 4 côtés × 3 niveaux ; chaque corde est un tube dont les sommets sont déplacés (rebond amorti)
  const SEG = 48, cordes = [];
  const matsCordes = [0, 1, 2].map(() => garde(new THREE.MeshStandardMaterial({ color: 0xd9a43a, roughness: 0.45, metalness: 0.1 })));
  for (let c = 0; c < 4; c++) {
    const a = coins[c], b = coins[(c + 1) % 4], milieu = a.clone().add(b).multiplyScalar(0.5), normale = milieu.clone().sub(C).setY(0).normalize();
    RING.cordesY.forEach((hy, k) => {
      const pa = a.clone().setY(RING.haut + hy), pb = b.clone().setY(RING.haut + hy);
      const geo = garde(new THREE.TubeGeometry(new THREE.LineCurve3(pa, pb), SEG, 0.9, 8, false));
      const base = Float32Array.from(geo.attributes.position.array);
      const m = new THREE.Mesh(geo, matsCordes[k]); m.castShadow = true; groupe.add(m);
      cordes.push({ geo, base, cote: c, niveau: k, normale, pa, pb });
    });
  }

  /* --- luminaire suspendu au-dessus du ring (cassable) */
  const lumi = new THREE.Group(); lumi.position.set(RING.x, RING.haut + 150, RING.z); groupe.add(lumi);
  const pivot = new THREE.Group(); pivot.position.set(-60, 0, 0); lumi.add(pivot);                      // il bascule autour de son bord gauche
  const cadreLumi = new THREE.Group(); cadreLumi.position.set(60, 0, 0); pivot.add(cadreLumi);
  const matTreillis = garde(new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.4, metalness: 0.8 }));
  for (const s of [-1, 1]) { const b1 = new THREE.Mesh(garde(new THREE.BoxGeometry(124, 5, 5)), matTreillis); b1.position.z = s * 60; cadreLumi.add(b1); const b2 = new THREE.Mesh(garde(new THREE.BoxGeometry(5, 5, 124)), matTreillis); b2.position.x = s * 60; cadreLumi.add(b2); }
  const matLampe = garde(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  const lampes = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 55, z = Math.sin(a) * 55;
    const boitier = new THREE.Mesh(garde(new THREE.CylinderGeometry(4, 5, 9, 14)), matTreillis); boitier.position.set(x, -6, z); cadreLumi.add(boitier);
    const verre = new THREE.Mesh(garde(new THREE.CircleGeometry(4, 16)), matLampe); verre.rotation.x = Math.PI / 2; verre.position.set(x, -10.6, z); cadreLumi.add(verre); lampes.push(verre);
  }
  const cables = [];
  for (const [x, z] of [[-60, -60], [-60, 60], [60, -60], [60, 60]]) {
    const cab = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.4, 0.4, 300, 6)), matTreillis); cab.position.set(x, 150, z); cadreLumi.add(cab); cables.push(cab);
  }
  const spotRing = new THREE.SpotLight(0xffffff, 0, 600, Math.PI / 4.2, 0.45, 0);   // échelle cm : pas d'atténuation physique
  spotRing.position.set(0, -12, 0); spotRing.castShadow = true; spotRing.shadow.mapSize.set(2048, 2048); spotRing.shadow.bias = -0.0006; cadreLumi.add(spotRing);
  const cibleSpot = new THREE.Object3D(); cibleSpot.position.copy(C); groupe.add(cibleSpot); spotRing.target = cibleSpot;

  /* --- écran géant (fond nord) : portraits et surnoms */
  const ECR = { l: 300, h: 128, y: 175, z: RING.z - 300 };
  const cv = document.createElement('canvas'); cv.width = 1536; cv.height = 656;
  const texEcran = garde(new THREE.CanvasTexture(cv)); texEcran.encoding = THREE.sRGBEncoding;
  const ecranMesh = new THREE.Mesh(garde(new THREE.PlaneGeometry(ECR.l, ECR.h)), garde(new THREE.MeshBasicMaterial({ map: texEcran, toneMapped: false })));
  ecranMesh.position.set(RING.x, ECR.y, ECR.z); groupe.add(ecranMesh);
  const cadreEcran = new THREE.Mesh(garde(new THREE.BoxGeometry(ECR.l + 10, ECR.h + 10, 6)), matTreillis); cadreEcran.position.set(RING.x, ECR.y, ECR.z - 3.5); groupe.add(cadreEcran);
  const lueurEcran = new THREE.PointLight(0x8fb2ff, 0, 520, 1); lueurEcran.position.set(RING.x, ECR.y, ECR.z + 60); groupe.add(lueurEcran);
  let cleEcran = '';
  function dessinerEcran(mode, d = {}) {
    const g = cv.getContext('2d'), L = cv.width, H = cv.height;
    const fond = g.createLinearGradient(0, 0, 0, H); fond.addColorStop(0, '#05081c'); fond.addColorStop(1, '#0d1238'); g.fillStyle = fond; g.fillRect(0, 0, L, H);
    g.strokeStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < H; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(L, y); g.stroke(); }   // trame LED
    const neon = (txt, x, y, taille, coul, align = 'center') => { g.textAlign = align; g.font = `900 ${taille}px sans-serif`; g.shadowColor = coul; g.shadowBlur = taille * 0.35; g.fillStyle = coul; g.fillText(txt, x, y); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(txt, x, y); };
    if (mode === 'ecurie') {
      const e = d.equipe, c0 = e.colors[0], c1 = e.colors[1];
      const bande = g.createLinearGradient(0, 0, L, 0); bande.addColorStop(0, c0); bande.addColorStop(1, c1); g.fillStyle = bande; g.globalAlpha = 0.35; g.fillRect(0, 0, L, H); g.globalAlpha = 1;
      // portrait (logo de l'écurie) dans un médaillon
      const px = 330, py = H / 2, r = 230;
      g.save(); g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.closePath(); g.fillStyle = '#000'; g.fill(); g.clip();
      const im = logos[e.id];
      if (im && im.complete && im.naturalWidth) { const s = Math.max(2 * r / im.naturalWidth, 2 * r / im.naturalHeight); g.drawImage(im, px - im.naturalWidth * s / 2, py - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
      else { g.fillStyle = c0; g.fillRect(px - r, py - r, 2 * r, 2 * r); neon(e.name.split(' ').map((w) => w[0]).join('').slice(0, 3), px, py + 50, 150, c1); }
      g.restore(); g.lineWidth = 14; g.strokeStyle = c1; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.stroke();
      neon(`ÉCURIE ${String(e.id).padStart(2, '0')} · GROUPE ${'ABC'[Math.floor((e.id - 1) / 5)]}`, 640, 130, 44, '#9fd8ff', 'left');
      let taille = 112; g.font = `900 ${taille}px sans-serif`; while (g.measureText(e.name.toUpperCase()).width > L - 680 && taille > 50) { taille -= 4; g.font = `900 ${taille}px sans-serif`; }
      neon(e.name.toUpperCase(), 640, 290, taille, c1 === '#09090b' || c1 === '#0f172a' || c1 === '#18181b' ? c0 : c1, 'left');
      neon(`« ${e.nickname.toUpperCase()} »`, 640, 420, 84, '#ffffff', 'left');
      g.textAlign = 'left'; g.font = 'italic 40px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)';
      const q = e.quote.length > 58 ? e.quote.slice(0, 56) + '…' : e.quote; g.fillText(q, 640, 520);
    } else if (mode === 'groupe') {
      neon(`GROUPE ${d.lettre}`, L / 2, 250, 210, ['#ff4fb8', '#3f8cff', '#35e07a'][d.index]);
      (d.equipes || []).forEach((e, k) => { g.fillStyle = e.colors[0]; g.fillRect(140 + k * 260, 380, 220, 120); g.fillStyle = e.colors[1]; g.fillRect(140 + k * 260, 470, 220, 30);
        g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(e.nickname.toUpperCase(), 250 + k * 260, 560); });
    } else if (mode === 'feux') {                                                                    // portique de départ : 5 feux rouges
      for (let k = 0; k < 5; k++) {
        const x = L / 2 - 520 + k * 260, on = k < (d.n || 0);
        g.fillStyle = '#111'; g.beginPath(); g.arc(x, H / 2, 105, 0, 7); g.fill();
        if (on) { g.shadowColor = '#ff1a1a'; g.shadowBlur = 90; } g.fillStyle = on ? '#ff2020' : '#2a0606'; g.beginPath(); g.arc(x, H / 2, 85, 0, 7); g.fill(); g.shadowBlur = 0;
      }
    } else if (mode === 'texte') {
      neon(d.ligne1 || '', L / 2, d.ligne2 ? 290 : 380, d.taille || 150, d.couleur || '#ffe23d');
      if (d.ligne2) neon(d.ligne2, L / 2, 470, (d.taille || 150) * 0.6, d.couleur2 || '#ffffff');
    } else {                                                                                              // 'titre'
      neon('GRAND PRIX', L / 2, 290, 190, '#7fd6ff'); neon('DE NOËL', L / 2, 470, 150, '#ff4fb8');
      COULEURS_VOIES.forEach((c, i) => { g.fillStyle = c; g.fillRect(L / 2 - 400 + i * 160, 540, 150, 22); });
    }
    texEcran.needsUpdate = true;
  }
  const ecran = { texture: texEcran, afficher(mode, d = {}) { const cle = mode + ':' + JSON.stringify(d.cle ?? d); if (cle !== cleEcran) { cleEcran = cle; dessinerEcran(mode, d); } } };
  ecran.afficher('titre', { cle: 'titre' });

  /* --- gradins circulaires et foule à l'échelle (silhouettes, bâtons lumineux, flashs) */
  const matGradin = garde(new THREE.MeshStandardMaterial({ color: 0x2a2a38, roughness: 0.8 }));
  const ARCS = [[0.16, 0.84], [1.16, 1.84]];                       // gradins est et ouest (θ mesuré depuis +z vers +x) ; nord = écran, sud = entrée
  for (const [a0, a1] of ARCS) for (let r = 0; r < 6; r++) {
    const g = new THREE.Mesh(garde(new THREE.CylinderGeometry(330 + r * 34, 330 + r * 34, 16 + r * 16, 48, 1, true, a0 * Math.PI, (a1 - a0) * Math.PI)), matGradin);
    g.position.set(RING.x, (16 + r * 16) / 2, RING.z); groupe.add(g);
  }
  matGradin.side = THREE.DoubleSide;
  const NF = 900, geoPerso = garde(new THREE.CylinderGeometry(4, 5, 24, 6)), foule = new THREE.InstancedMesh(geoPerso, garde(new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 0.9 })), NF);
  const NB = 260, geoBaton = garde(new THREE.SphereGeometry(1.8, 6, 4)), batons = new THREE.InstancedMesh(geoBaton, garde(new THREE.MeshBasicMaterial({ toneMapped: false })), NB);
  const NFl = 60, flashs = new THREE.InstancedMesh(garde(new THREE.SphereGeometry(2.5, 6, 4)), garde(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })), NFl);
  const m4 = new THREE.Matrix4(), places = [], couleurs = [], col = new THREE.Color();
  for (let i = 0; i < NF; i++) {
    const r = Math.floor(rnd() * 6), arc = ARCS[i % 2], a = (arc[0] + rnd() * (arc[1] - arc[0])) * Math.PI, R = 330 + r * 34 + 12;
    const p = new THREE.Vector3(RING.x + Math.sin(a) * R, 16 + r * 16 + 12, RING.z + Math.cos(a) * R);
    places.push(p); m4.makeTranslation(p.x, p.y, p.z); foule.setMatrixAt(i, m4);
  }
  for (let i = 0; i < NB; i++) { const p = places[(i * 7) % NF]; m4.makeTranslation(p.x, p.y + 18, p.z); batons.setMatrixAt(i, m4); couleurs.push(new THREE.Color(COULEURS_VOIES[i % 5])); batons.setColorAt(i, couleurs[i]); }
  groupe.add(foule); groupe.add(batons); groupe.add(flashs);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* --- lumières d'arène */
  const hemi = new THREE.HemisphereLight(0x8fa8ff, 0x0a0608, 0.25); groupe.add(hemi);
  const contres = [];
  for (const [x, z, c] of [[-260, -200, 0xff4fb8], [260, -200, 0x3f8cff], [-260, 260, 0x35e07a], [260, 260, 0xffe23d]]) {
    const s = new THREE.SpotLight(c, 0, 1100, Math.PI / 9, 0.5, 0); s.position.set(x, 320, z); s.target = cibleSpot; groupe.add(s); contres.push(s);
  }
  const brouillard = new THREE.FogExp2(0x05040a, 0.0012);

  /* --- animation : fonction pure de (t, etat) */
  const v = new THREE.Vector3();
  function maj(t, etat = {}) {
    const th = THEMES[etat.theme || 'championnat'], allume = etat.allume ?? 1, foulePct = etat.foule ?? 1;
    matTapis.map = etat.theme === 'tapis' ? texTapis : etat.theme === 'sauvage' ? texSauvage : texBleu; matTapis.needsUpdate = true;
    matJupe.color.setHex(th.jupe); matPoteau.color.setHex(th.poteaux);
    matsCordes.forEach((m, k) => m.color.setHex(th.cordes[k]));
    spotRing.color.setHex(th.lumiere); spotRing.intensity = 2.6 * allume * (etat.casse > 0.05 && etat.casse < 1 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 31)) : etat.casse >= 1 ? 0.55 : 1);   // grésille pendant la chute, puis pend, affaibli
    matLampe.color.setScalar(Math.max(0.05, allume));
    hemi.color.setHex(th.ambiance); hemi.intensity = 0.9 * allume + 0.12;
    contres.forEach((s, i) => { s.intensity = 1.1 * allume * (0.7 + 0.3 * Math.sin(t * 1.7 + i * 1.3)); });
    lueurEcran.intensity = 0.9 * allume;
    // cordes élastiques : somme d'impulsions amorties (côté visé, ou les 4 côtés si cote = -1)
    for (const c of cordes) {
      let amp = 0;
      for (const r of etat.rebond || []) {
        const dt = t - r.t0; if (dt < 0 || dt > 3) continue;
        if (r.cote !== undefined && r.cote >= 0 && r.cote !== c.cote) continue;
        amp += r.force * Math.exp(-dt * 2.6) * Math.sin(dt * 2 * Math.PI * 2.4) * (1 - c.niveau * 0.15);
      }
      const pos = c.geo.attributes.position, b = c.base, n = pos.count, ax = c.pb.x - c.pa.x, az = c.pb.z - c.pa.z, len2 = ax * ax + az * az;
      for (let i = 0; i < n; i++) {
        const x = b[i * 3], z = b[i * 3 + 2], s = Math.min(1, Math.max(0, ((x - c.pa.x) * ax + (z - c.pa.z) * az) / len2)), dep = amp * Math.sin(Math.PI * s);
        pos.array[i * 3] = x + c.normale.x * dep; pos.array[i * 3 + 1] = b[i * 3 + 1] - Math.abs(dep) * 0.15; pos.array[i * 3 + 2] = z + c.normale.z * dep;
      }
      pos.needsUpdate = true;
    }
    // luminaire : bascule autour de son bord gauche quand il casse, puis se balance au bout de son câble
    const k = Math.min(1, Math.max(0, etat.casse || 0));
    const chute = k < 0.35 ? (k / 0.35) ** 2 : 1, balancier = k < 0.35 ? 0 : Math.exp(-(k - 0.35) * 3) * Math.sin((k - 0.35) * 22) * 0.18;
    pivot.rotation.z = -(chute * 1.05 + balancier); cables[2].visible = cables[3].visible = k < 0.3;
    // foule : bâtons qui ondulent, flashs d'appareils photo semés
    for (let i = 0; i < NB; i++) { const kk = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.7))) * foulePct * Math.max(0.15, allume); col.copy(couleurs[i]).multiplyScalar(kk); batons.setColorAt(i, col); }
    batons.instanceColor.needsUpdate = true;
    const tranche = Math.floor(t * 12);
    for (let i = 0; i < NFl; i++) {
      const on = hash(tranche * 131 + i) < 0.18 * foulePct * allume, p = places[Math.floor(hash(tranche * 17 + i * 3) * NF)];
      m4.makeTranslation(p.x, p.y + 14, p.z); if (!on) m4.scale(v.set(0.0001, 0.0001, 0.0001)); flashs.setMatrixAt(i, m4);
    }
    flashs.instanceMatrix.needsUpdate = true;
    coussins.forEach((m, i) => { m.emissiveIntensity = 0.2 + 0.5 * allume * (0.5 + 0.5 * Math.sin(t * 4 + i)); });
  }
  maj(0);

  const ancres = {
    ring: { centre: C.clone(), cote: RING.cote, haut: RING.haut, coins: coins.map((p) => p.clone()) },
    ecran: { centre: ecranMesh.position.clone(), largeur: ECR.l, hauteur: ECR.h },
    luminaire: { centre: lumi.position.clone() },
    entree: new THREE.Vector3(RING.x, 0, RING.z + 420),
    brouillard, themes: Object.keys(THEMES),
  };
  return { groupe, maj, ecran, ancres, liberer() { for (const o of jetables) if (o && o.dispose) o.dispose(); } };
}
