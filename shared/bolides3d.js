/* BOLIDES 3D STYLISÉS — chaque miniature en Three.js, construite à partir de son portrait 2D (shared/bolides2d.js).

   Principe : le profil du portrait (silhouette, passages de roues, pavillon) est extrudé en volume ; la livrée du portrait
   (couleurs, bandes, numéros, vitres, phares) est plaquée sur les flancs ; le dessus est laqué dans la couleur de
   carrosserie avec vernis et reflets néon (carte d'environnement « studio néon ») ; le pavillon est rétréci et vitré ;
   roues 3D à jantes dessinées (tournent pour de vrai), feux avant et arrière émissifs, accessoires en volume (ailerons,
   ailerons de chauve-souris, bulles, turbine, gyrophares, taxi, moteur à compresseur…). Familles particulières :
   Formule 1 (monocoque, pontons, ailerons, halo), F1 des années 60, hélicoptère, fauteuil.

   Low/medium poly (≈ 2 à 6 k triangles par bolide), une texture 2048 × 670 : 60 i/s sans souci, réutilisable partout
   (reveal Fret, Showroom 360°, futures cinématiques de départ et diffusions de course).

   const m = await construireBolide3D('J11', { THREE, envMap });
   scene.add(m.groupe);  m.maj(dt, vitesse);  m.dispose();
   Repère : l'avant du bolide regarde +x, le sol est y = 0, le bolide est centré en x = 0 et z = 0. */
import { bolide2dSvg, geometrie3d, REPERE_SVG } from './bolides2d.js';

export const ECHELLE = 0.0262;                  // 1 px du portrait = 0,262 mm à l'échelle 1/64 « ×10 » de la scène
const { G, CX, vb } = REPERE_SVG;
const K = ECHELLE;
const wx = (x) => (x - CX) * K, wy = (y) => (G - y) * K;

/* ------------------------------------------------------------------ environnement « studio néon » */
const memoEnv = new WeakMap();
export function envNeon(THREE, renderer) {
  if (memoEnv.has(renderer)) return memoEnv.get(renderer);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const fond = g.createLinearGradient(0, 0, 0, 512); fond.addColorStop(0, '#1a1440'); fond.addColorStop(0.5, '#090716'); fond.addColorStop(1, '#020206');
  g.fillStyle = fond; g.fillRect(0, 0, 1024, 512);
  const barre = (x, y, w, h, col, flou) => { g.shadowColor = col; g.shadowBlur = flou; g.fillStyle = col; g.fillRect(x, y, w, h); };
  barre(80, 120, 260, 26, '#ff2bd6', 40); barre(560, 100, 320, 22, '#22d3ee', 40); barre(380, 60, 220, 70, '#ffffff', 60);
  barre(0, 300, 1024, 6, '#ffb84d', 30); barre(700, 180, 120, 18, '#b06bff', 30);
  g.shadowBlur = 0;
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
  memoEnv.set(renderer, env);
  return env;
}

/* ------------------------------------------------------------------ textures */
const memoPeau = new Map();
async function peau(code, THREE) {
  if (memoPeau.has(code)) return memoPeau.get(code);
  let svg = bolide2dSvg(code, 'peau3d' + code, { texture: true });
  if (!svg) return null;
  const W = 2048, H = Math.round(2048 * vb[3] / vb[2]);
  svg = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" preserveAspectRatio="none" `);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const im = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
  URL.revokeObjectURL(url);
  if (!im) return null;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(im, 0, 0, W, H);
  memoPeau.set(code, c);
  return c;
}
function texturePeau(THREE, canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  // UV des faces extrudées = coordonnées monde (x, y) : on les ramène au cadre du SVG
  t.repeat.set(1 / (K * vb[2]), 1 / (K * vb[3]));
  t.offset.set((CX - vb[0]) / vb[2], 1 - (G - vb[1]) / vb[3]);
  return t;
}
function textureJante(THREE, couleur, style, neon) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.translate(128, 128);
  const rg = g.createRadialGradient(-30, -30, 10, 0, 0, 128); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, couleur); rg.addColorStop(1, '#111');
  g.fillStyle = '#0b0c12'; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill();
  g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 118, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.55)';
  const n = { cinq: 5, six: 6, trois: 3, dix: 10, etoile: 5 }[style] || 0;
  if (style === 'plein') { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 64, 0, Math.PI * 2); g.stroke(); }
  else if (style === 'maille') { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 5; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(Math.cos(a + 0.6) * 110, Math.sin(a + 0.6) * 110); g.stroke(); } }
  else for (let i = 0; i < n; i++) {           // jours entre les rayons
    const a = i / n * Math.PI * 2 + Math.PI / n, w = style === 'etoile' ? 0.5 : (Math.PI / n) * 0.62;
    g.beginPath(); g.moveTo(Math.cos(a - w * 0.5) * 36, Math.sin(a - w * 0.5) * 36); g.lineTo(Math.cos(a - w) * 104, Math.sin(a - w) * 104);
    g.lineTo(Math.cos(a + w) * 104, Math.sin(a + w) * 104); g.lineTo(Math.cos(a + w * 0.5) * 36, Math.sin(a + w * 0.5) * 36); g.closePath(); g.fill();
  }
  g.fillStyle = '#d9dde6'; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
  if (neon) { g.strokeStyle = neon; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 122, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ construction */
function forme(THREE, pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(wx(x), wy(y)) : s.moveTo(wx(x), wy(y))));
  s.closePath();
  return s;
}
function extruder(THREE, pts, largeur, biseau = 0.05) {
  const geo = new THREE.ExtrudeGeometry(forme(THREE, pts), { depth: largeur, bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau * 0.8, bevelSegments: 2, curveSegments: 4, steps: 1 });
  geo.translate(0, 0, -largeur / 2);
  return geo;
}
/** Couleurs par sommet des parois du pavillon : faces presque horizontales = laque (toit), autres = vitrage teinté. */
function colorierPavillon(THREE, geo, laque, vitre) {
  const n = geo.attributes.normal, nb = n.count, col = new Float32Array(nb * 3);
  const L = new THREE.Color(laque), V = new THREE.Color(vitre);
  for (let i = 0; i < nb; i += 3) {
    const ny = Math.abs((n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3), nz = Math.abs((n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2)) / 3);
    const c = nz > 0.7 ? L : ny > 0.82 ? L : V;          // flancs (couverts par la peau) et toit plat : laque ; pare-brise et lunette : verre
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
const boite = (THREE, l, h, p, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat); m.position.set(x, y, z); return m; };

/** Construit le bolide 3D (null si le code n'a pas de fiche). */
export async function construireBolide3D(code, { THREE = window.THREE, envMap = null } = {}) {
  const geo = geometrie3d(code);
  if (!geo || !THREE) return null;
  const canv = await peau(code, THREE);
  if (!canv) return null;
  const f = geo.f, c = geo.c;
  const jetables = [];
  const garde = (x) => { jetables.push(x); return x; };
  const groupe = new THREE.Group(); groupe.name = 'bolide3d-' + code;
  const chassis = new THREE.Group(); groupe.add(chassis);
  const texP = garde(texturePeau(THREE, canv));
  const vernis = { clearcoat: 1, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.25 };
  const matPeau = garde(new THREE.MeshPhysicalMaterial({ map: texP, roughness: 0.34, metalness: 0.28, ...vernis }));
  const matLaque = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.caisse), roughness: 0.22, metalness: 0.45, ...vernis }));
  const matPavillon = garde(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.6, ...vernis }));
  const matNoir = garde(new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.7, metalness: 0.3 }));
  const matAccent = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.accent || c.neon || c.caisse), roughness: 0.3, metalness: 0.5, ...vernis }));
  const matVerre = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.vitre || '#1d2a4a'), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.72, ...vernis }));
  const lumBlanche = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(c.phare || '#eaf6ff').multiplyScalar(2.2), toneMapped: false }));
  const lumRouge = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(c.feu || '#ff2a3d').multiplyScalar(2.2), toneMapped: false }));
  const animes = [];           // (t, dt, v) => void : gyrophares, scanner, rotor…

  const L = (geo.xAvant - geo.xArriere) * K;
  let largeur = L * 0.4;
  const special = geo.fam !== 'route';
  if (geo.fam === 'route') {
    const h = geo.hauteurs;
    if ((f.toit ?? 70) > 85) largeur = L * 0.44;
    const corps = new THREE.Mesh(garde(extruder(THREE, geo.bas, largeur, 0.06)), [matPeau, matLaque]);
    chassis.add(corps);
    if (geo.haut.length) {
      const gp = garde(extruder(THREE, geo.haut, largeur * 0.8, 0.05));
      colorierPavillon(THREE, gp, c.caisse, c.vitre || '#1d2a4a');
      chassis.add(new THREE.Mesh(gp, [matPeau, matPavillon]));
    }
    // dessous sombre (masque le vide entre les roues)
    chassis.add(boite(THREE, L * 0.86, 0.04, largeur * 0.9, matNoir, (wx(geo.xAvant) + wx(geo.xArriere)) / 2, (h.garde + 1) * K, 0));
    // feux
    const yPh = (h.nez + (h.caisse - h.nez) * 0.3) * K, yFeu = (h.queue - 3) * K;
    for (const z of [-1, 1]) {
      chassis.add(boite(THREE, 0.06, 0.16, largeur * 0.22, lumBlanche, wx(geo.xAvant) + 0.05, yPh, z * largeur * 0.3));
      chassis.add(boite(THREE, 0.06, 0.13, largeur * 0.24, lumRouge, wx(geo.xArriere) - 0.05, yFeu, z * largeur * 0.32));
    }
    kits3d(THREE, { geo, chassis, largeur, matLaque, matNoir, matAccent, matVerre, lumBlanche, lumRouge, garde, animes });
  } else if (geo.fam === 'f1' || geo.fam === 'f1vintage') {
    largeur = geo.fam === 'f1' ? 0.95 : 0.85;
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.bas, largeur, 0.08)), [matPeau, matLaque]));
    if (geo.fam === 'f1') {
      // pontons latéraux (bas de la monocoque, plus large)
      const ponton = geo.bas.filter(([, y]) => y >= 72).length > 3 ? [[100, 74], [206, 76], [214, 92], [100, 94]] : null;
      if (ponton) chassis.add(new THREE.Mesh(garde(extruder(THREE, ponton, 1.9, 0.08)), [matPeau, matLaque]));
      const [ax0, ay0, ax1, ay1] = geo.parts.aileronAr, [fx0, fy0, fx1, fy1] = geo.parts.aileronAv;
      const matAil = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.aileron || c.caisse), roughness: 0.3, metalness: 0.5, ...vernis }));
      chassis.add(boite(THREE, (ax1 - ax0) * K, (ay1 - ay0) * K * 0.5, 2.1, matAil, wx((ax0 + ax1) / 2), wy((ay0 + ay1) / 2), 0));
      for (const z of [-1.08, 1.08]) chassis.add(boite(THREE, (ax1 - ax0) * K * 1.05, 1.1, 0.05, matNoir, wx((ax0 + ax1) / 2), wy(ay0) - 0.45, z));
      chassis.add(boite(THREE, (fx1 - fx0) * K, (fy1 - fy0) * K, 3.0, matAil, wx((fx0 + fx1) / 2), wy((fy0 + fy1) / 2), 0));
      for (const z of [-1.5, 1.5]) chassis.add(boite(THREE, (fx1 - fx0) * K * 0.9, 0.35, 0.04, matNoir, wx((fx0 + fx1) / 2), wy(fy1) + 0.15, z));
      const [hx0, hy0, hx1, hy1] = geo.parts.halo;
      const courbe = new THREE.QuadraticBezierCurve3(new THREE.Vector3(wx(hx0), wy(hy0), 0), new THREE.Vector3(wx((hx0 + hx1) / 2), wy(hy0) + 0.35, 0), new THREE.Vector3(wx(hx1), wy(hy1), 0));
      chassis.add(new THREE.Mesh(garde(new THREE.TubeGeometry(courbe, 16, 0.045, 6, false)), matNoir));
      const prise = new THREE.Mesh(garde(extruder(THREE, geo.parts.prise, 0.5, 0.04)), [matPeau, matLaque]); chassis.add(prise);
    } else {
      const [mx0, my0, mx1, my1] = geo.parts.moteur;
      const matMoteur = garde(new THREE.MeshStandardMaterial({ color: 0x9aa1ae, roughness: 0.35, metalness: 0.9, envMap }));
      chassis.add(boite(THREE, (mx1 - mx0) * K, (my1 - my0) * K, 0.7, matMoteur, wx((mx0 + mx1) / 2), wy((my0 + my1) / 2), 0));
      for (let i = 0; i < 4; i++) {
        const tube = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8)), matMoteur);
        tube.position.set(wx(70 + i * 9) - 0.15, wy(60), (i % 2 ? 1 : -1) * 0.18); tube.rotation.z = 0.9; chassis.add(tube);
      }
    }
    const [hx, hy, hr] = geo.parts.casque;
    const casque = new THREE.Mesh(garde(new THREE.SphereGeometry(hr * K, 16, 12)), garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.casque || '#f2f2f2'), roughness: 0.2, ...vernis })));
    casque.position.set(wx(hx), wy(hy), 0); chassis.add(casque);
    largeur = geo.fam === 'f1' ? 3.0 : 2.6;      // voie (pour l'ombre et l'encombrement)
  } else if (geo.fam === 'helico') {
    largeur = 1.6;
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.bas, 1.6, 0.12)), [matPeau, matLaque]));
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.parts.queue, 0.4, 0.04)), [matPeau, matLaque]));
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.parts.derive, 0.08, 0.02)), [matPeau, matNoir]));
    const [p0, p1, py] = geo.parts.patins;
    for (const z of [-0.75, 0.75]) {
      const patin = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.05, 0.05, (p1 - p0) * K, 8)), matAccent);
      patin.rotation.z = Math.PI / 2; patin.position.set(wx((p0 + p1) / 2), wy(py), z); chassis.add(patin);
      for (const x of [140, 228]) { const j = boite(THREE, 0.05, 0.4, 0.05, matAccent, wx(x), wy(py) + 0.2, z * 0.85); chassis.add(j); }
    }
    const [rx, ry, rl] = geo.parts.rotor;
    const mat = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 10)), matNoir); mat.position.set(wx(rx), wy(ry) - 0.18, 0); chassis.add(mat);
    const rotor = new THREE.Group(); rotor.position.set(wx(rx), wy(ry), 0); chassis.add(rotor);
    for (let i = 0; i < 2; i++) { const pale = boite(THREE, rl * 2 * K, 0.03, 0.16, matNoir, 0, 0, 0); pale.rotation.y = i * Math.PI / 2; rotor.add(pale); }
    const rotorAr = new THREE.Group(); rotorAr.position.set(wx(48), wy(40), 0.12); chassis.add(rotorAr);
    rotorAr.add(boite(THREE, 0.7, 0.05, 0.02, matNoir, 0, 0, 0));
    animes.push((t, dt) => { rotor.rotation.y += dt * 38; rotorAr.rotation.z += dt * 55; });
  } else if (geo.fam === 'fauteuil') {
    largeur = 2.2;
    chassis.add(new THREE.Mesh(garde(extruder(THREE, geo.bas, 1.6, 0.08)), [matPeau, matLaque]));
    const matCadre = garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(c.accent || '#d4a017'), roughness: 0.3, metalness: 0.9, envMap }));
    for (const z of [-0.85, 0.85]) {
      const barre = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8)), matCadre);
      barre.rotation.z = Math.PI / 2 - 0.12; barre.position.set(wx(200), wy(90), z); chassis.add(barre);
    }
  }

  // roues
  const roues = [];
  const matPneu = garde(new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.9, metalness: 0.05 }));
  const texJ = garde(textureJante(THREE, f.jante || '#c9cfda', f.rayons || 'cinq', f.neonRoue));
  const matJante = garde(new THREE.MeshPhysicalMaterial({ map: texJ, roughness: 0.25, metalness: 0.8, clearcoat: 0.6, envMap, envMapIntensity: 1.1 }));
  const matFlanc = f.flanc ? garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(f.flanc), toneMapped: false })) : null;
  for (const r of geo.roues) {
    const R = r.r * K, ep = geo.fam === 'f1' || geo.fam === 'f1vintage' ? R * 0.9 : geo.fam === 'fauteuil' && !r.roulette ? 0.12 : R * 0.62;
    const zs = geo.fam === 'f1' ? [-1.3, 1.3] : geo.fam === 'f1vintage' ? [-1.12, 1.12] : geo.fam === 'fauteuil' ? (r.roulette ? [-0.6, 0.6] : [-1.0, 1.0]) : [-(largeur / 2 - ep * 0.42), largeur / 2 - ep * 0.42];
    for (const z of zs) {
      const pivot = new THREE.Group(); pivot.position.set(wx(r.x), R, z);
      const pneu = new THREE.Mesh(garde(new THREE.CylinderGeometry(R, R, ep, 28, 1)), matPneu); pneu.rotation.x = Math.PI / 2; pivot.add(pneu);
      const tore = new THREE.Mesh(garde(new THREE.TorusGeometry(R * 0.9, ep * 0.18, 8, 28)), matPneu); tore.position.z = Math.sign(z) * ep * 0.32; pivot.add(tore);
      const disque = new THREE.Mesh(garde(new THREE.CircleGeometry(R * 0.66, 28)), matJante); disque.position.z = Math.sign(z) * (ep / 2 + 0.004); if (z < 0) disque.rotation.y = Math.PI; pivot.add(disque);
      if (matFlanc) { const fl = new THREE.Mesh(garde(new THREE.RingGeometry(R * 0.68, R * 0.76, 28)), matFlanc); fl.position.z = disque.position.z * 1.002; if (z < 0) fl.rotation.y = Math.PI; pivot.add(fl); }
      groupe.add(pivot);
      roues.push({ pivot, r: R, x: wx(r.x), avant: !!r.avant, z });
    }
  }
  const xs = roues.map((w) => w.x);
  const xAv = roues.length ? Math.max(...xs) : wx(geo.xAvant) - 0.5, xAr = roues.length ? Math.min(...xs) : wx(geo.xArriere) + 0.5;
  const hauteur = (G - Math.min(...geo.bas.concat(geo.haut).map((p) => p[1]))) * K;
  return {
    code, fam: geo.fam, groupe, chassis, roues, largeur, longueur: L, hauteur, aRoues: roues.length > 0,
    xAvant: wx(geo.xAvant), xArriere: wx(geo.xArriere), essieuAvant: xAv, essieuArriere: xAr, empattement: xAv - xAr,
    rayonAvant: (roues.find((w) => w.avant) || { r: 0.45 }).r, rayonArriere: (roues.find((w) => !w.avant) || { r: 0.45 }).r,
    feux: { avant: lumBlanche, arriere: lumRouge },
    /** Avance d'un pas : roues qui tournent (v = ω × R), accessoires animés. v en unités/s (positif = vers l'avant). */
    maj(dt, v = 0, t = 0, glissement = 0) {
      for (const w of roues) w.pivot.rotation.z -= (v * (1 + glissement)) * dt / w.r;
      for (const a of animes) a(t, dt, v);
    },
    dispose() { for (const x of jetables) { try { x.dispose(); } catch (e) { /* rien */ } } groupe.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}

/* ------------------------------------------------------------------ accessoires en volume */
function kits3d(THREE, { geo, chassis, largeur, matLaque, matNoir, matAccent, matVerre, lumBlanche, lumRouge, garde, animes }) {
  const { X, Y } = geo, h = geo.hauteurs, f = geo.f;
  const yH = (hh) => hh * K;                          // hauteur au-dessus du sol (px) → monde
  const xP = (p) => wx(X(p));
  const couleur = (col, def) => garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col || def), roughness: 0.25, metalness: 0.45, clearcoat: 1, envMap: matLaque.envMap, envMapIntensity: 1.2 }));
  for (const [type, ...a] of geo.kit) {
    const o = a.length && typeof a[a.length - 1] === 'object' && !Array.isArray(a[a.length - 1]) ? a[a.length - 1] : {};
    if (type === 'aileron') {
      const style = a[0] || 'haut', mat = couleur(o.c, f.c.caisse);
      if (style === 'levre') { chassis.add(boite(THREE, 0.5, 0.08, largeur * 0.92, mat, wx(geo.xArriere) + 0.3, yH(h.queue) + 0.06, 0)); continue; }
      const p = o.p ?? 0.93, hh = o.h ?? h.queue + 14, l = (o.l ?? 30) * K;
      chassis.add(boite(THREE, l, 0.07, largeur * 0.98, mat, xP(p), yH(hh), 0));
      for (const z of [-1, 1]) {
        chassis.add(boite(THREE, l * 0.9, 0.36, 0.04, mat, xP(p), yH(hh) - 0.1, z * largeur * 0.49));
        chassis.add(boite(THREE, 0.06, yH(hh) - yH(h.coffre) + 0.05, 0.06, matNoir, xP(p) + 0.1, (yH(hh) + yH(h.coffre)) / 2, z * largeur * 0.28));
      }
    } else if (type === 'chauve') {                 // ailerons de chauve-souris
      const hm = a[0] || 26, p0 = o.p0 ?? 0.6, base = o.base ?? h.caisse - 4, xt = geo.xArriere + (o.deb ?? 6);
      const pts = [[X(p0), Y(base)], [xt, Y(base + hm)], [xt + 3, Y(base + hm * 0.64)], [xt + 10, Y(base + hm * 0.38)], [xt + 21, Y(base)]];
      const mat = couleur(o.c, f.c.caisse);
      for (const z of [-1, 1]) { const m = new THREE.Mesh(garde(extruder(THREE, pts, 0.07, 0.02)), mat); m.position.z = z * largeur * 0.36; chassis.add(m); }
    } else if (type === 'bulle') {
      for (const [p, w, hh] of a[0]) {
        const b = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.c || '#bfe8ff'), roughness: 0.05, transmission: 0, transparent: true, opacity: 0.6, clearcoat: 1, envMap: matLaque.envMap })));
        b.scale.set(w * K * 0.55, hh * K, largeur * 0.32); b.position.set(xP(p), yH(h.caisse - 1), 0); chassis.add(b);
      }
    } else if (type === 'turbine') {
      const hh = a[0] ?? h.queue - 12;
      const t = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.2, 0.26, 0.4, 16)), matNoir); t.rotation.z = Math.PI / 2; t.position.set(wx(geo.xArriere) - 0.12, yH(hh), 0); chassis.add(t);
      const feu = new THREE.Mesh(garde(new THREE.CircleGeometry(0.17, 16)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c || '#ff7a1a').multiplyScalar(2), toneMapped: false })));
      feu.rotation.y = -Math.PI / 2; feu.position.set(wx(geo.xArriere) - 0.33, yH(hh), 0); chassis.add(feu);
      animes.push((tt) => { feu.scale.setScalar(0.85 + Math.sin(tt * 40) * 0.15); });
    } else if (type === 'rampe') {
      const x = xP(a[0] ?? 0.55), y = yH(h.toit) + 0.08;
      chassis.add(boite(THREE, 0.3, 0.1, largeur * 0.62, matNoir, x, y, 0));
      const r = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c1 || '#ff2a3d').multiplyScalar(2), toneMapped: false }));
      const b = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c2 || '#2a7bff').multiplyScalar(2), toneMapped: false }));
      const g1 = boite(THREE, 0.26, 0.09, largeur * 0.26, r, x, y + 0.05, -largeur * 0.16), g2 = boite(THREE, 0.26, 0.09, largeur * 0.26, b, x, y + 0.05, largeur * 0.16);
      chassis.add(g1, g2);
      animes.push((tt) => { const on = Math.floor(tt * 6) % 2; g1.visible = !!on; g2.visible = !on; });
    } else if (type === 'taxi') {
      const x = xP(a[0] ?? 0.55);
      chassis.add(boite(THREE, 0.55, 0.2, 0.18, garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(o.c || '#ffcf2a').multiplyScalar(1.6), toneMapped: false })), x, yH(h.toit) + 0.12, 0));
    } else if (type === 'moteur') {
      const x = xP(a[0] ?? 0.2), y = yH(h.caisse), w = (o.l ?? 34) * K, chrome = couleur(o.c, '#c8ccd6');
      chassis.add(boite(THREE, w, 0.24, largeur * 0.38, chrome, x, y + 0.1, 0));
      chassis.add(boite(THREE, w * 0.6, 0.24, largeur * 0.3, couleur(o.souffleur, '#555b6b'), x, y + 0.34, 0));
      for (let i = 0; i < 3; i++) { const cy = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 10)), chrome); cy.position.set(x - w * 0.22 + i * w * 0.22, y + 0.56, 0); chassis.add(cy); }
    } else if (type === 'prise') chassis.add(boite(THREE, 0.6, 0.16, largeur * 0.3, couleur(o.c, '#22242a'), xP(a[0] ?? 0.2), yH(h.caisse) + 0.06, 0));
    else if (type === 'scanner') {
      const y = yH((f.nez ?? 24) - 3), segs = [];
      for (let i = 0; i < 6; i++) { const s = boite(THREE, 0.04, 0.07, largeur * 0.1, garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2030').multiplyScalar(2.4), toneMapped: false, transparent: true })), wx(geo.xAvant) + 0.04, y, (i - 2.5) * largeur * 0.11); chassis.add(s); segs.push(s); }
      animes.push((tt) => { const k = (Math.sin(tt * 4) * 0.5 + 0.5) * 5; segs.forEach((s, i) => { s.material.opacity = Math.max(0.12, 1 - Math.abs(i - k) * 0.45); }); });
    } else if (type === 'galerie') {
      for (const z of [-1, 1]) chassis.add(boite(THREE, (X(a[0]) - X(a[1])) * K, 0.04, 0.04, matNoir, (xP(a[0]) + xP(a[1])) / 2, yH(h.toit) + 0.12, z * largeur * 0.3));
    } else if (type === 'echappement') {
      for (const z of [-1, 1]) {
        const e = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.07, 0.07, (X(a[0] ?? 0.32) - X(a[1] ?? 0.62)) * K, 10)), couleur(null, '#cfd4de'));
        e.rotation.z = Math.PI / 2; e.position.set((xP(a[0] ?? 0.32) + xP(a[1] ?? 0.62)) / 2, yH(h.garde + 3), z * (largeur / 2 + 0.05)); chassis.add(e);
      }
    } else if (type === 'ailes') {
      const x = X(a[0] ?? 0.62), y = Y(h.caisse - 6);
      const pts = [[x + 16, y], [x - 40, y - 26], [x - 30, y - 6]];
      const mat = couleur(o.c, '#ffffff');
      for (const z of [-1, 1]) { const m = new THREE.Mesh(garde(extruder(THREE, pts, 0.05, 0.02)), mat); m.position.z = z * largeur * 0.42; chassis.add(m); }
    } else if (type === 'pare') {
      const x = xP(a[0] ?? 0.36), hh = (o.h ?? 13) * K;
      const vitre = boite(THREE, 0.04, hh, largeur * 0.75, matVerre, x, yH(h.caisse) + hh / 2, 0); vitre.rotation.z = 0.5; chassis.add(vitre);
      if (o.appuie !== false) { const ap = new THREE.Mesh(garde(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), couleur(o.ca, f.c.caisse)); ap.position.set(xP(o.pa ?? 0.6), yH(h.caisse), -largeur * 0.18); chassis.add(ap); }
    } else if (type === 'cockpit') {
      const casque = new THREE.Mesh(garde(new THREE.SphereGeometry(0.18, 14, 10)), couleur(o.c, '#f4f4f4')); casque.position.set(xP(a[0] ?? 0.45), yH(h.caisse) + 0.12, 0); chassis.add(casque);
    } else if (type === 'lame') chassis.add(boite(THREE, 0.8, 0.05, largeur * 1.02, couleur(o.c, '#16181f'), wx(geo.xAvant) - 0.3, yH(h.garde + 1), 0));
    else if (type === 'antenne') { const an = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 6)), matNoir); an.position.set(xP(a[0]), yH(a[1]) + 0.3, -largeur * 0.3); an.rotation.z = 0.4; chassis.add(an); }
  }
}

/* ------------------------------------------------------------------ vue 360° (Showroom) */
/** Ouvre une vue 360° du bolide dans parent (glisser pour tourner, molette pour zoomer). Renvoie une fonction de fermeture. */
export async function vue360(parent, code, { THREE = window.THREE } = {}) {
  if (!THREE) return null;
  const el = document.createElement('div');
  el.className = 'vue360';
  el.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at 50% 70%,#1b1640,#05040c 70%);cursor:grab;touch-action:none';
  parent.appendChild(el);
  const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:100%;display:block'; el.appendChild(cv);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  const env = envNeon(THREE, renderer);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0x9fb0ff, 0x120a20, 0.55));
  const cle = new THREE.DirectionalLight(0xffffff, 1.6); cle.position.set(4, 8, 6); scene.add(cle);
  const contre = new THREE.DirectionalLight(0xff4fd8, 0.55); contre.position.set(-6, 3, -5); scene.add(contre);
  const sol = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshStandardMaterial({ color: 0x0a0a16, roughness: 0.4, metalness: 0.6 }));
  sol.rotation.x = -Math.PI / 2; scene.add(sol);
  const anneau = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.32, 64), new THREE.MeshBasicMaterial({ color: 0x22d3ee, toneMapped: false })); anneau.rotation.x = -Math.PI / 2; anneau.position.y = 0.01; scene.add(anneau);
  const m = await construireBolide3D(code, { THREE, envMap: env });
  if (!m) { el.remove(); renderer.dispose(); return null; }
  scene.add(m.groupe);
  let az = 0.6, el2 = 0.28, dist = 13, glisse = false, px = 0, py = 0, auto = true, fini = false, raf = 0, t0 = performance.now(), dernier = t0;
  const taille = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); };
  taille(); addEventListener('resize', taille);
  el.addEventListener('pointerdown', (e) => { glisse = true; auto = false; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', (e) => { if (!glisse) return; az -= (e.clientX - px) * 0.008; el2 = Math.max(0.05, Math.min(1.2, el2 + (e.clientY - py) * 0.005)); px = e.clientX; py = e.clientY; });
  el.addEventListener('pointerup', () => { glisse = false; el.style.cursor = 'grab'; });
  el.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(7, Math.min(22, dist + e.deltaY * 0.01)); }, { passive: false });
  const boucle = (now) => {
    if (fini) return;
    const dt = Math.min(0.05, (now - dernier) / 1000), t = (now - t0) / 1000; dernier = now;
    if (auto) az += dt * 0.35;
    cam.position.set(Math.cos(az) * dist * Math.cos(el2), 1.2 + Math.sin(el2) * dist, Math.sin(az) * dist * Math.cos(el2));
    cam.lookAt(0, m.hauteur * 0.45, 0);
    m.maj(dt, 0, t);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(boucle);
  };
  raf = requestAnimationFrame(boucle);
  return () => { fini = true; cancelAnimationFrame(raf); removeEventListener('resize', taille); m.dispose(); renderer.dispose(); el.remove(); };
}
