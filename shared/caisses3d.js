/* ==========================================================================
   CAISSES 3D PROCÉDURALES (Three.js) — Standard « fret bois », Élite « coffre blindé », Marché Noir « écrin d'or ».
   Couleurs = filaments Bambu Lab réellement en stock (1_Materiel_et_Impression/garages/filaments_stock.scad) :
   la caisse vue à l'écran est celle qu'on peut imprimer (modèle : 6_Arsenal_Pieges/scad/caisses_trophees.scad).
   Aucune image externe : toutes les textures sont dessinées dans des <canvas>.
   ========================================================================== */
export const FIL = {
  bois: 0xd6c29a,        // PLA Wood Chêne blanc 13106
  anthracite: 0x3d3f43,  // PLA Matte Anthracite 11101
  violet: 0x6b44b6,      // PLA Basic Violet 10700
  indigo: 0x3a2a6a,      // PLA Basic Violet indigo 10701
  argent: 0xc4c8cd,      // PLA Silk+ Argenté 13109
  noir: 0x1b1b1c,        // PETG HF Noir 33102
  dore: 0xd8a63a,        // PLA Silk+ Doré 13405
  rougeBonbon: 0xd3203c, // PLA Silk+ Rouge bonbon 13205
  ecarlate: 0xc8352e,    // PLA Matte Rouge écarlate 11200
  jaune: 0xf7c600,       // PLA Basic Jaune tournesol 10402
  vert: 0x3dbb54,        // PLA Silk+ Vert bonbon 13506
  ivoire: 0xf1ecdf,      // PLA Matte Blanc ivoire 11100
};
export const NOMS_FIL = {
  standard: 'PLA Wood Chêne blanc 13106 + Matte Anthracite 11101',
  elite: 'PLA Basic Violet 10700 / Violet indigo 10701 + Silk+ Argenté 13109',
  marche_noir: 'PETG HF Noir 33102 + PLA Silk+ Doré 13405 + Silk+ Rouge bonbon 13205',
};

/** Charge three.min.js à la demande (le Pocket Pit ne l'embarque pas d'office). */
export function ensureThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (ensureThree.p) return ensureThree.p;
  ensureThree.p = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../lib/three.min.js', import.meta.url).href;
    s.onload = () => res(window.THREE); s.onerror = () => rej(new Error('three.min.js introuvable'));
    document.head.appendChild(s);
  });
  return ensureThree.p;
}

const hexs = (c) => '#' + c.toString(16).padStart(6, '0');
function tex(THREE, w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; else if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  return t;
}
/* planches de chêne : 4 lames, fil du bois, nœuds, clous */
function texBois(THREE) {
  return tex(THREE, 512, 512, (x, w, h) => {
    x.fillStyle = hexs(FIL.bois); x.fillRect(0, 0, w, h);
    for (let p = 0; p < 4; p++) {
      const y0 = p * h / 4;
      for (let i = 0; i < 70; i++) {
        x.strokeStyle = `rgba(110,80,40,${0.05 + Math.random() * 0.12})`; x.lineWidth = 1 + Math.random() * 2;
        const yy = y0 + Math.random() * h / 4;
        x.beginPath(); x.moveTo(0, yy);
        for (let xx = 0; xx <= w; xx += 32) x.lineTo(xx, yy + Math.sin(xx / 60 + i) * 3);
        x.stroke();
      }
      x.fillStyle = 'rgba(60,40,20,.55)'; x.fillRect(0, y0, w, 3);
      for (let k = 0; k < 2; k++) { const kx = Math.random() * w, ky = y0 + 20 + Math.random() * (h / 4 - 40); x.fillStyle = 'rgba(90,60,30,.5)'; x.beginPath(); x.ellipse(kx, ky, 10, 5, 0, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#2b2b2b'; for (const nx of [24, w - 24]) { x.beginPath(); x.arc(nx, y0 + h / 8, 4, 0, Math.PI * 2); x.fill(); }
    }
    x.font = '900 56px "Barlow Condensed",system-ui'; x.fillStyle = 'rgba(40,28,14,.55)'; x.textAlign = 'center';
    x.fillText('FRAGILE · GP NOËL', w / 2, h * 0.58);
  });
}
/* panneau blindé : rivets, rainures, dégradé métallique */
function texBlinde(THREE, base, arete) {
  return tex(THREE, 512, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, hexs(base)); g.addColorStop(1, hexs(arete)); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 6; x.strokeRect(40, 40, w - 80, h - 80);
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(60, 60 + i * (h - 120) / 6); x.lineTo(w - 60, 60 + i * (h - 120) / 6); x.stroke(); }
    x.fillStyle = hexs(FIL.argent); for (const [a, b] of [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]]) { x.beginPath(); x.arc(a, b, 9, 0, Math.PI * 2); x.fill(); }
  });
}
/* écrin noir : guilloché doré */
function texEcrin(THREE) {
  return tex(THREE, 512, 512, (x, w, h) => {
    x.fillStyle = hexs(FIL.noir); x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(216,166,58,.22)'; x.lineWidth = 1.2;
    for (let r = 20; r < 380; r += 10) { x.beginPath(); for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) { const rr = r + 6 * Math.sin(a * 12); x.lineTo(w / 2 + rr * Math.cos(a), h / 2 + rr * Math.sin(a)); } x.stroke(); }
    x.strokeStyle = hexs(FIL.dore); x.lineWidth = 10; x.strokeRect(18, 18, w - 36, h - 36);
  });
}
/* emblème de famille (face avant) : PIÈGES = bandes de danger + tête de mort stylisée ; BONUS = ruban cadeau */
function texEmbleme(THREE, famille) {
  return tex(THREE, 256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    if (famille === 'piege') {
      x.save(); x.beginPath(); x.arc(w / 2, h / 2, 118, 0, Math.PI * 2); x.clip();
      for (let i = -8; i < 16; i++) { x.fillStyle = i % 2 ? hexs(FIL.jaune) : '#151515'; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 32 - h, h); x.lineTo(i * 32 - h, h); x.fill(); }
      x.restore();
      x.fillStyle = hexs(FIL.ivoire); x.beginPath(); x.arc(w / 2, h / 2 - 8, 56, 0, Math.PI * 2); x.fill(); x.fillRect(w / 2 - 34, h / 2 + 30, 68, 30);
      x.fillStyle = '#151515'; x.beginPath(); x.arc(w / 2 - 22, h / 2 - 8, 15, 0, Math.PI * 2); x.arc(w / 2 + 22, h / 2 - 8, 15, 0, Math.PI * 2); x.fill();
      x.fillRect(w / 2 - 4, h / 2 + 18, 8, 16);
    } else {
      x.fillStyle = hexs(FIL.vert); x.fillRect(w / 2 - 26, 0, 52, h); x.fillRect(0, h / 2 - 26, w, 52);
      x.fillStyle = hexs(FIL.ivoire); x.beginPath(); x.ellipse(w / 2 - 40, h / 2 - 40, 40, 22, -0.6, 0, Math.PI * 2); x.ellipse(w / 2 + 40, h / 2 - 40, 40, 22, 0.6, 0, Math.PI * 2); x.fill();
      x.fillStyle = hexs(FIL.vert); x.beginPath(); x.arc(w / 2, h / 2, 22, 0, Math.PI * 2); x.fill();
    }
  });
}

/**
 * Construit une caisse. Retourne { group, lid, update(t, dt), ouvrir(), ouverture } (ouverture : 0 fermé -> 1 ouvert).
 * Dimensions en « cm de scène » : 2 × 1,4 × 1,4 (l'échelle est libre).
 */
export function buildCaisse(THREE, gamme = 'standard', famille = 'piege') {
  const group = new THREE.Group();
  const W = 2, D = 1.4, Hb = 1.05, Hl = 0.35;
  let body, lidMat, trimMat, emissive = null, glowCol = 0xffffff;
  if (gamme === 'standard') {
    const bois = new THREE.MeshStandardMaterial({ map: texBois(THREE), roughness: 0.85, metalness: 0.0 });
    body = bois; lidMat = bois;
    trimMat = new THREE.MeshStandardMaterial({ color: FIL.anthracite, roughness: 0.6, metalness: 0.35 });
    glowCol = 0xffe2a8;
  } else if (gamme === 'elite') {
    body = new THREE.MeshStandardMaterial({ map: texBlinde(THREE, FIL.violet, FIL.indigo), roughness: 0.35, metalness: 0.6 });
    lidMat = body;
    trimMat = new THREE.MeshStandardMaterial({ color: FIL.argent, roughness: 0.25, metalness: 0.9 });
    emissive = new THREE.MeshStandardMaterial({ color: 0x0b0f20, emissive: 0x38e1ff, emissiveIntensity: 1.6 });
    glowCol = 0xb07cff;
  } else {
    body = new THREE.MeshStandardMaterial({ map: texEcrin(THREE), roughness: 0.3, metalness: 0.5 });
    lidMat = body;
    trimMat = new THREE.MeshStandardMaterial({ color: FIL.dore, roughness: 0.22, metalness: 1.0 });
    emissive = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: FIL.rougeBonbon, emissiveIntensity: 2.2 });
    glowCol = 0xffd34d;
  }
  // caisson (bevel via 2 boîtes : coque + liseré)
  const caisson = new THREE.Mesh(new THREE.BoxGeometry(W, Hb, D), body);
  caisson.position.y = Hb / 2; caisson.castShadow = caisson.receiveShadow = true; group.add(caisson);
  // intérieur lumineux (visible à l'ouverture)
  const glowMat = new THREE.MeshBasicMaterial({ color: glowCol, transparent: true, opacity: 0 });
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, D * 0.9), glowMat);
  inner.rotation.x = -Math.PI / 2; inner.position.y = Hb + 0.002; group.add(inner);
  // arêtes / cornières
  const cornieres = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.12, Hb + 0.02, 0.12), trimMat); c.position.set(sx * (W / 2 - 0.04), Hb / 2, sz * (D / 2 - 0.04)); cornieres.add(c);
  }
  // sangles (Standard) / bandes néon (Élite) / filets d'or (Marché Noir)
  for (const sx of [-0.55, 0.55]) {
    const sangle = new THREE.Mesh(new THREE.BoxGeometry(0.16, Hb + 0.03, D + 0.03), trimMat); sangle.position.set(sx * W / 2, Hb / 2, 0); cornieres.add(sangle);
    if (emissive) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.04, Hb * 0.7, D + 0.05), emissive); n.position.set(sx * W / 2, Hb / 2, 0); cornieres.add(n); }
  }
  group.add(cornieres);
  // emblème de famille sur la face avant
  const emb = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshStandardMaterial({ map: texEmbleme(THREE, famille), transparent: true, roughness: 0.5 }));
  emb.position.set(0, Hb * 0.52, D / 2 + 0.011); group.add(emb);
  // couvercle articulé à l'arrière
  const lid = new THREE.Group(); lid.position.set(0, Hb, -D / 2);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, Hl, D + 0.06), lidMat);
  lidMesh.position.set(0, Hl / 2, D / 2); lidMesh.castShadow = true; lid.add(lidMesh);
  const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.07, D + 0.1), trimMat); lidTrim.position.set(0, 0.035, D / 2); lid.add(lidTrim);
  // fermoir / sceau
  const sceau = new THREE.Mesh(gamme === 'marche_noir' ? new THREE.CylinderGeometry(0.16, 0.16, 0.06, 32) : new THREE.BoxGeometry(0.26, 0.3, 0.06),
    emissive && gamme === 'marche_noir' ? emissive : trimMat);
  if (gamme === 'marche_noir') sceau.rotation.x = Math.PI / 2;
  sceau.position.set(0, Hl * 0.2, D + 0.06); lid.add(sceau);
  group.add(lid);
  // lumière d'ouverture
  const lum = new THREE.PointLight(glowCol, 0, 6); lum.position.set(0, Hb + 0.4, 0); group.add(lum);
  // particules (Marché Noir : paillettes d'or permanentes ; toutes : gerbe à l'ouverture)
  const N = 160, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: gamme === 'standard' ? 0xfff0c0 : glowCol, size: 0.05, transparent: true, opacity: 0, depthWrite: false }));
  group.add(pts);
  const st = { ouverture: 0, cible: 0, t: 0, gerbe: 0 };
  function relancerParticules() {
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * W * 0.8; pos[i * 3 + 1] = Hb; pos[i * 3 + 2] = (Math.random() - 0.5) * D * 0.8;
      vel[i * 3] = (Math.random() - 0.5) * 0.02; vel[i * 3 + 1] = 0.03 + Math.random() * 0.05; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    pg.attributes.position.needsUpdate = true;
  }
  return {
    group, lid,
    get ouverture() { return st.ouverture; },
    ouvrir() { st.cible = 1; st.gerbe = 1; relancerParticules(); },
    fermer() { st.cible = 0; },
    update(t, dt = 1 / 60) {
      st.t = t;
      st.ouverture += (st.cible - st.ouverture) * Math.min(1, dt * (st.cible ? 5 : 3));
      const k = st.ouverture;
      lid.rotation.x = -k * 1.9;
      glowMat.opacity = k * 0.95;
      lum.intensity = k * (gamme === 'marche_noir' ? 6 : 4);
      if (emissive) emissive.emissiveIntensity = (gamme === 'marche_noir' ? 2.2 : 1.6) * (0.75 + 0.25 * Math.sin(t * (gamme === 'marche_noir' ? 3 : 5)));
      // tremblement d'impatience quand fermé
      group.rotation.z = st.cible ? 0 : Math.sin(t * 22) * 0.012 * (0.5 + 0.5 * Math.sin(t * 0.9));
      if (st.gerbe > 0 || gamme === 'marche_noir') {
        for (let i = 0; i < N; i++) {
          pos[i * 3] += vel[i * 3]; pos[i * 3 + 1] += vel[i * 3 + 1]; pos[i * 3 + 2] += vel[i * 3 + 2]; vel[i * 3 + 1] -= 0.0009;
          if (gamme === 'marche_noir' && !st.gerbe && pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = Hb + Hl + Math.random() * 0.6; pos[i * 3] = (Math.random() - 0.5) * W; pos[i * 3 + 2] = (Math.random() - 0.5) * D; vel[i * 3 + 1] = -0.004; }
        }
        pg.attributes.position.needsUpdate = true;
        pts.material.opacity = st.gerbe ? Math.max(0, st.gerbe) : 0.55;
        if (st.gerbe) st.gerbe = Math.max(0, st.gerbe - dt * 0.35);
      }
    },
  };
}

/* ------------------------------------------------------------------ vignettes (rendu unique, mis en cache) */
let snapR = null;
const snapCache = new Map();
/** Rend une vignette PNG (dataURL) d'une caisse : utilisée par les tuiles du Pocket Pit (pas de WebGL permanent). */
export async function vignette(gamme, famille, px = 256) {
  const k = `${gamme}|${famille}|${px}`;
  if (snapCache.has(k)) return snapCache.get(k);
  const THREE = await ensureThree();
  if (!snapR) {
    snapR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    snapR.setPixelRatio(1);
    if ('outputColorSpace' in snapR && THREE.SRGBColorSpace) snapR.outputColorSpace = THREE.SRGBColorSpace;
  }
  snapR.setSize(px, px, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe0e8ff, 0x302040, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(3, 5, 4); scene.add(sun);
  const rim = new THREE.DirectionalLight(gamme === 'elite' ? 0x9b7bff : gamme === 'marche_noir' ? 0xffc040 : 0xffe0b0, 1.1); rim.position.set(-4, 2, -3); scene.add(rim);
  const c = buildCaisse(THREE, gamme, famille);
  c.update(0.6, 0); scene.add(c.group);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(2.6, 2.2, 3.4); cam.lookAt(0, 0.62, 0);
  snapR.render(scene, cam);
  const url = snapR.domElement.toDataURL('image/png');
  snapCache.set(k, url);
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
  return url;
}
