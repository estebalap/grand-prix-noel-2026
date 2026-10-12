/* OUVERTURE DU PLATEAU — la cinématique temps réel qui ouvre la soirée du 23 décembre, entre l'intro officielle (vidéo)
   et le plateau TV. Tout est calculé en direct à partir des VRAIES données de la soirée (15 écuries, couleurs, logos,
   pilotes, citations ; tracé de la Rainbow Road de data/circuit.json) : ce qu'aucune vidéo pré-montée ne peut montrer.

   Partition (chronoOuverture : fonction pure, testée sous Node) :
     1. ALLUMAGE        néons du titre qui s'allument lettre à lettre (claquements de starter, grésillement 50 Hz).
     2. SURVOL          la caméra plonge du portique de départ, dévale le toboggan, prend la grande courbe relevée et file
                        sous l'arche : piste arc-en-ciel à 5 voies translucides, guirlandes de manège qui chassent,
                        engrenages de fête foraine mécanique, neige.
     3. LES ÉCURIES     les 15 écuries présentées une à une, par groupes de 5 (une manche = 5 voies) : logo, couleurs,
                        nom, pilote, citation. Coup de grosse caisse + souffle à chaque entrée.
     4. COMPTE À REBOURS portique à 5 feux rouges (un par seconde), chiffres géants 5 → 1, puis « LIGHTS OUT » : feux éteints,
                        flash blanc, impact.
     5. SORTIE          fondu au noir, la promesse se résout : le plateau prend le relais.

   jouerOuverture(parent, { equipes, circuit, logo, express, son }) → Promise<'fini' | 'passe'>
     equipes : DATA.teams (id, name, pilot, nickname, colors, quote) ; circuit : data/circuit.json (facultatif) ;
     logo(id) → URL du logo ; express : présentation éclair (0,55 s par écurie) ; son : bande-son procédurale.
   Échap / Espace / Entrée / clic : passe (fondu de 0,4 s). Aucune ressource externe ; tout est libéré à la fin.
   pasFixe (s/image) : temps image par image pour les captures de contrôle (window.__ouvertureArret fige la séquence). */
import { outilsSon } from './signatures.js';

const T = () => window.THREE;

/** Chronologie pure de l'ouverture (secondes). nEquipes ≥ 0 ; express raccourcit la présentation. */
export function chronoOuverture(nEquipes = 15, { express = false } = {}) {
  const allumage = express ? 2.2 : 3.2, survol = express ? 4.2 : 5.8, parEquipe = express ? 0.55 : 1.0, groupe = express ? 0.35 : 0.7;
  const t0 = 0, t1 = t0 + allumage, t2 = t1 + survol;
  const equipes = []; let t = t2;
  const nGroupes = Math.ceil(nEquipes / 5);
  for (let g = 0; g < nGroupes; g++) {
    equipes.push({ type: 'groupe', g, t0: t, t1: t + groupe }); t += groupe;
    for (let k = g * 5; k < Math.min(nEquipes, g * 5 + 5); k++) { equipes.push({ type: 'equipe', i: k, g, t0: t, t1: t + parEquipe }); t += parEquipe; }
  }
  const t3 = t, rebours = 5, feux = [];
  for (let i = 0; i < 5; i++) feux.push(t3 + 0.6 + i * 1.0);
  const lightsOut = t3 + 0.6 + 5 * 1.0 + 0.35;
  const fin = lightsOut + 1.5;
  return { allumage: [t0, t1], survol: [t1, t2], equipes, rebours: [t3, lightsOut], feux, lightsOut, fin, n: nEquipes, chiffres: feux.map((x, i) => ({ t: x, chiffre: rebours - i })) };
}

/** Tracé 3D de la Rainbow Road (unités scène = 10 × mètres) : centre, tangente, normale latérale (dévers compris). */
export function traceRainbow(circuit, pas = 0.02) {
  const segs = (circuit && circuit.trace && circuit.trace.segments) || [
    { type: 'droite', s_debut: 0, s_fin: 0.25, pente_deg: 30 }, { type: 'droite', s_debut: 0.25, s_fin: 0.8, pente_deg: 22 },
    { type: 'courbe', s_debut: 0.8, s_fin: 1.6, pente_deg: 8, devers_deg: 20, rayon_m: 0.35, sens: 'gauche' },
    { type: 'droite', s_debut: 1.6, s_fin: 2.2, pente_deg: 4 }, { type: 'droite', s_debut: 2.2, s_fin: 2.44, pente_deg: 2 }];
  const L = segs[segs.length - 1].s_fin, K = 10;
  let x = 0, y = 0, z = 0, cap = 0;
  const pts = [];
  const segDe = (s) => segs.find((g) => s >= g.s_debut - 1e-9 && s <= g.s_fin + 1e-9) || segs[segs.length - 1];
  for (let s = 0; s <= L + 1e-9; s += pas) {
    const g = segDe(s), pente = (g.pente_deg || 0) * Math.PI / 180;
    const courbe = g.type === 'courbe' && g.rayon_m;
    const entree = courbe ? Math.min(1, (s - g.s_debut) / 0.08, (g.s_fin - s) / 0.08) : 0;
    const devers = courbe ? (g.devers_deg || 0) * Math.PI / 180 * Math.max(0, entree) * (g.sens === 'droite' ? -1 : 1) : 0;
    pts.push({ s, x: x * K, y: y * K, z: z * K, cap, devers, pente });
    const ds = pas;
    if (courbe) cap += (ds / g.rayon_m) * (g.sens === 'droite' ? -1 : 1);
    x += Math.cos(cap) * Math.cos(pente) * ds; z -= Math.sin(cap) * Math.cos(pente) * ds; y -= Math.sin(pente) * ds;
  }
  const ymin = Math.min(...pts.map((p) => p.y));
  for (const p of pts) p.y += -ymin + 0.6;                    // la piste repose sur ses pylônes, le bas de l'arche à 0,6 au-dessus du sol
  return { pts, longueur: L * K };
}

/* ------------------------------------------------------------------ textures et formes */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texDisque(THREE) {
  const c = canvas(64, 64), g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}
function formeEngrenage(THREE, R, dents, h) {
  const s = new THREE.Shape(), n = dents * 4;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, haut = (i % 4 === 1 || i % 4 === 2), r = haut ? R + h : R;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const trou = new THREE.Path(); trou.absarc(0, 0, R * 0.35, 0, Math.PI * 2, true); s.holes.push(trou);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, p = new THREE.Path(); p.absarc(Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66, R * 0.15, 0, Math.PI * 2, true); s.holes.push(p); }
  return s;
}

/* ------------------------------------------------------------------ la scène */
export async function jouerOuverture(parent, { equipes = [], circuit = null, logo = null, express = false, son = true, pasFixe = 0 } = {}) {
  const THREE = T();
  const C = chronoOuverture(equipes.length, { express });
  const el = document.createElement('div');
  el.className = 'ouverture-gp';
  el.style.cssText = 'position:fixed;inset:0;z-index:9500;background:#020108;opacity:0;transition:opacity .45s ease;cursor:none;overflow:hidden';
  el.innerHTML = '<canvas class="ov3d" style="position:absolute;inset:0;width:100%;height:100%"></canvas><canvas class="ov2d" style="position:absolute;inset:0;width:100%;height:100%"></canvas>';
  parent.appendChild(el);
  const cv3 = el.querySelector('.ov3d'), cv2 = el.querySelector('.ov2d'), g2 = cv2.getContext('2d');
  requestAnimationFrame(() => { el.style.opacity = '1'; });

  /* logos chargés d'avance (absents : pastille aux couleurs de l'écurie) */
  const logos = new Map();
  await Promise.all(equipes.map((e) => new Promise((ok) => {
    if (!logo) return ok();
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { logos.set(e.id, im); ok(); }; im.onerror = () => ok(); im.src = logo(e.id);
    setTimeout(ok, 2500);
  })));

  /* ---------- 3D (facultative : sans WebGL, l'ouverture reste jouée en 2D) */
  let r3 = null;
  if (THREE) { try { r3 = scene3d(THREE, cv3, circuit, equipes); } catch (e) { console.warn('[ouverture] 3D indisponible', e); r3 = null; } }

  /* ---------- son */
  const S = son ? (await import('./audio.js')).sortieAudio() : null;   // import tardif : le module reste chargeable sous Node (tests)
  const o = S ? outilsSon(S) : null;
  const horlogeAudio = !!(S && S.ac.state === 'running');      // contexte audio actif : l'image suit l'horloge audio ; sinon l'horloge de la page
  const t0Audio = S ? S.ac.currentTime + 0.12 : 0;
  if (o && horlogeAudio) partition(o, t0Audio, C);

  /* ---------- boucle */
  const lettres = 'GRAND PRIX DE NOËL'.split('');
  const allumageLettres = lettres.map((ch, i) => ({ ch, t: 0.35 + i * (C.allumage[1] - 0.9) / lettres.length + (i % 3) * 0.04, rate: (i * 7) % 5 === 0 }));
  let fini = false, raf = 0, debut = performance.now() + 120, dernier = debut;
  const taille = () => {
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
    cv2.width = Math.round(w * dpr); cv2.height = Math.round(h * dpr); g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (r3) r3.taille(w, h);
  };
  taille(); addEventListener('resize', taille);

  return new Promise((resolve) => {
    const terminer = (raison) => {
      if (fini) return; fini = true;
      el.style.opacity = '0';
      if (o && raison === 'passe') o.arreter();
      setTimeout(() => {
        cancelAnimationFrame(raf); removeEventListener('resize', taille); removeEventListener('keydown', touche, true);
        if (r3) r3.dispose(); el.remove(); resolve(raison);
      }, 480);
    };
    const touche = (e) => { if (['Escape', ' ', 'Enter', 'NumpadEnter'].includes(e.key) || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); terminer('passe'); } };
    addEventListener('keydown', touche, true);
    el.addEventListener('pointerdown', () => terminer('passe'));

    let image = 0;
    const tick = (now) => {
      if (fini) return;
      if (pasFixe && window.__ouvertureArret != null && image * pasFixe > window.__ouvertureArret) { raf = requestAnimationFrame(tick); return; }   // banc de contrôle image par image
      const t = pasFixe ? (image++) * pasFixe : horlogeAudio ? Math.max(0, S.ac.currentTime - t0Audio) : (now - debut) / 1000;   // calé sur l'horloge audio : image et son ne dérivent jamais
      const dt = pasFixe || Math.max(0, Math.min(0.05, (now - dernier) / 1000)); dernier = now;
      if (t >= C.fin) { terminer('fini'); return; }
      if (r3) r3.rendre(t, dt, C);
      dessiner2d(g2, cv2.width / (Math.min(devicePixelRatio || 1, 1.5)), cv2.height / (Math.min(devicePixelRatio || 1, 1.5)), t, C, { lettres: allumageLettres, equipes, logos });
      window.__ouvertureT = t;                                          // repère pour les captures de contrôle
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

/* ------------------------------------------------------------------ 3D : piste arc-en-ciel, manège mécanique, neige */
function scene3d(THREE, cv, circuit, equipes) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x03020b); scene.fog = new THREE.FogExp2(0x03020b, 0.022);
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 300);
  const jet = []; const garde = (x) => { jet.push(x); return x; };

  scene.add(new THREE.HemisphereLight(0x6f7dff, 0x150812, 0.35));
  const lune = new THREE.DirectionalLight(0xcfd9ff, 0.7); lune.position.set(-8, 14, 6); scene.add(lune);
  const chaud = new THREE.PointLight(0xffb15a, 1.4, 40, 1.6); chaud.position.set(6, 6, -4); scene.add(chaud);

  /* sol : parquet nocturne du salon, laqué */
  const sol = new THREE.Mesh(garde(new THREE.CircleGeometry(60, 64)), garde(new THREE.MeshStandardMaterial({ color: 0x0b0710, roughness: 0.6, metalness: 0.12 })));
  sol.rotation.x = -Math.PI / 2; scene.add(sol);

  /* piste : 5 voies translucides arc-en-ciel + cloisons, dévers dans la courbe, pylônes */
  const { pts } = traceRainbow(circuit);
  const LARG = 2.3, voies = 5, COUL = ['#ff3b5c', '#ffb02e', '#3ee07a', '#2fa8ff', '#b05cff'];
  const lat = (p) => new THREE.Vector3(Math.sin(p.cap) * Math.cos(p.devers), Math.sin(p.devers), Math.cos(p.cap) * Math.cos(p.devers));   // vers la gauche de la marche
  const centre = (p) => new THREE.Vector3(p.x, p.y, p.z);
  for (let v = 0; v < voies; v++) {
    const a = -LARG / 2 + v * LARG / voies, b = a + LARG / voies, pos = [], idx = [];
    pts.forEach((p, i) => { const c = centre(p), l = lat(p); const A = c.clone().addScaledVector(l, a + 0.02), B = c.clone().addScaledVector(l, b - 0.02); pos.push(A.x, A.y, A.z, B.x, B.y, B.z); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const coul = new THREE.Color(COUL[v]);
    const m = new THREE.Mesh(g, garde(new THREE.MeshStandardMaterial({ color: coul.clone().multiplyScalar(0.7), emissive: coul.clone().multiplyScalar(0.42), roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: false })));   // plastique translucide saturé, qui « s'allume » comme le jouet
    scene.add(m);
  }
  for (let v = 0; v <= voies; v++) {                               // cloisons translucides
    const a = -LARG / 2 + v * LARG / voies, pos = [], idx = [];
    pts.forEach((p, i) => { const c = centre(p), l = lat(p), A = c.clone().addScaledVector(l, a); pos.push(A.x, A.y, A.z, A.x, A.y + (v === 0 || v === voies ? 0.22 : 0.07), A.z); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, garde(new THREE.MeshStandardMaterial({ color: 0xe8f2ff, emissive: 0x334466, roughness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }))));
  }
  const matPylone = garde(new THREE.MeshStandardMaterial({ color: 0x8c92a6, roughness: 0.3, metalness: 0.8 }));
  for (let i = 0; i < pts.length; i += 12) { const p = pts[i]; if (p.y < 0.15) continue; const py = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.06, 0.09, p.y, 12)), matPylone); py.position.set(p.x, p.y / 2, p.z); scene.add(py); }
  /* portique de départ et arche d'arrivée */
  const pD = pts[0], pA = pts[pts.length - 1], matPort = garde(new THREE.MeshStandardMaterial({ color: 0xd8dde8, roughness: 0.25, metalness: 0.9 }));
  for (const sg of [-1, 1]) { const m = new THREE.Mesh(garde(new THREE.BoxGeometry(0.16, 1.5, 0.16)), matPort); m.position.copy(centre(pD)).addScaledVector(lat(pD), sg * (LARG / 2 + 0.15)); m.position.y += 0.75; scene.add(m); }
  const linteau = new THREE.Mesh(garde(new THREE.BoxGeometry(0.2, 0.22, LARG + 0.5)), matPort); linteau.position.copy(centre(pD)); linteau.position.y += 1.5; linteau.rotation.y = pD.cap; scene.add(linteau);
  const arche = new THREE.Mesh(garde(new THREE.TorusGeometry(LARG / 2 + 0.35, 0.09, 12, 48, Math.PI)), garde(new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0x6b4a10, roughness: 0.3, metalness: 0.9 })));
  arche.position.copy(centre(pA)); arche.rotation.y = pA.cap + Math.PI / 2; scene.add(arche);
  /* feux du portique (le compte à rebours les allume) */
  const feux = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(garde(new THREE.SphereGeometry(0.075, 16, 12)), garde(new THREE.MeshBasicMaterial({ color: 0x1a0606, toneMapped: false })));
    // vus de face (caméra du compte à rebours), les feux s'allument de gauche à droite
    f.position.copy(linteau.position).addScaledVector(lat(pD), (2 - i) * 0.42); f.position.y += 0.02; f.position.x += Math.cos(pD.cap) * 0.11; f.position.z -= Math.sin(pD.cap) * 0.11; scene.add(f); feux.push(f);
  }

  /* guirlandes de manège : ampoules le long des deux bords, qui chassent (couleurs de Noël + couleurs des écuries) */
  const tex = garde(texDisque(THREE)), nb = [];
  pts.forEach((p, i) => { if (i % 2) return; for (const sg of [-1, 1]) { const q = centre(p).addScaledVector(lat(p), sg * (LARG / 2 + 0.05)); q.y += 0.26; nb.push(q); } });
  const pal = ['#ff2b3a', '#2bff7a', '#ffd23a', '#ffffff'].concat(equipes.slice(0, 8).map((e) => (e.colors || [])[1] || '#ffd23a'));
  const gB = garde(new THREE.BufferGeometry()), posB = new Float32Array(nb.length * 3), colB = new Float32Array(nb.length * 3), baseB = [];
  nb.forEach((q, i) => { posB.set([q.x, q.y, q.z], i * 3); const c = new THREE.Color(pal[i % pal.length]); baseB.push(c); colB.set([c.r, c.g, c.b], i * 3); });
  gB.setAttribute('position', new THREE.BufferAttribute(posB, 3)); gB.setAttribute('color', new THREE.BufferAttribute(colB, 3));
  const ampoules = new THREE.Points(gB, garde(new THREE.PointsMaterial({ size: 0.28, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
  scene.add(ampoules);

  /* engrenages de fête foraine mécanique, en laiton, qui tournent derrière la piste */
  const laiton = garde(new THREE.MeshStandardMaterial({ color: 0xc9a14a, roughness: 0.32, metalness: 0.95 })), cuivre = garde(new THREE.MeshStandardMaterial({ color: 0xb4643a, roughness: 0.38, metalness: 0.9 }));
  const roues = [];
  const box = { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), z0: Math.min(...pts.map((p) => p.z)), z1: Math.max(...pts.map((p) => p.z)) };
  const cx = (box.x0 + box.x1) / 2, cz = (box.z0 + box.z1) / 2;
  [[cx - 9, 5.5, cz - 12, 3.2, 28, 0.25, laiton], [cx - 3.2, 3.6, cz - 12.6, 1.9, 17, -0.42, cuivre], [cx + 6, 6.5, cz - 13, 4.1, 36, -0.19, laiton], [cx + 1.4, 1.9, cz - 12.4, 1.1, 10, 0.7, cuivre]].forEach(([x, y, z, R, d, w, mat]) => {
    const geo = garde(new THREE.ExtrudeGeometry(formeEngrenage(THREE, R, d, R * 0.12), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 24 }));
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); roues.push({ m, w });
  });
  /* sapin lumineux stylisé au fond (cônes empilés + étoile) */
  const sapinMat = garde(new THREE.MeshStandardMaterial({ color: 0x0f5a36, roughness: 0.6, emissive: 0x03140b }));
  for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(garde(new THREE.ConeGeometry(2.6 - k * 0.55, 2.4, 24)), sapinMat); c.position.set(cx + 13, 1.4 + k * 1.5, cz - 6); scene.add(c); }
  const etoile = new THREE.Mesh(garde(new THREE.OctahedronGeometry(0.45)), garde(new THREE.MeshBasicMaterial({ color: 0xffe28a, toneMapped: false }))); etoile.position.set(cx + 13, 7.9, cz - 6); scene.add(etoile);

  /* neige */
  const NN = 1400, gN = garde(new THREE.BufferGeometry()), pN = new Float32Array(NN * 3), vN = new Float32Array(NN);
  for (let i = 0; i < NN; i++) { pN[i * 3] = cx + (Math.random() - 0.5) * 50; pN[i * 3 + 1] = Math.random() * 18; pN[i * 3 + 2] = cz + (Math.random() - 0.5) * 50; vN[i] = 0.4 + Math.random() * 0.8; }
  gN.setAttribute('position', new THREE.BufferAttribute(pN, 3));
  const neige = new THREE.Points(gN, garde(new THREE.PointsMaterial({ size: 0.09, map: tex, color: 0xf2f6ff, transparent: true, opacity: 0.8, depthWrite: false })));
  scene.add(neige);

  const echant = (s) => { const L = pts[pts.length - 1].s, k = Math.max(0, Math.min(pts.length - 1, (s / L) * (pts.length - 1))), i = Math.floor(k), f = k - i, a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)]; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, cap: a.cap + (b.cap - a.cap) * f, devers: a.devers + (b.devers - a.devers) * f }; };
  const lisse = (u) => u * u * (3 - 2 * u), borne = (u) => Math.max(0, Math.min(1, u));
  const v = new THREE.Vector3(), cib = new THREE.Vector3();

  return {
    taille(w, h) { renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); },
    rendre(t, dt, C) {
      const L = pts[pts.length - 1].s;
      if (t < C.survol[0]) {                                           // allumage : plan large, très lent, la piste dans le noir
        const k = t / C.survol[0];
        v.set(cx + 18 - 3 * k, 9 - 1.5 * k, cz + 20); cib.set(cx, 1.5, cz);
      } else if (t < C.survol[1]) {                                    // survol : caméra embarquée qui dévale la piste
        const k = lisse(borne((t - C.survol[0]) / (C.survol[1] - C.survol[0]))), p = echant(k * L * 0.98), q = echant(Math.min(L, k * L * 0.98 + 0.25));
        v.set(p.x - Math.sin(p.cap) * 0.0, p.y + 0.55 + 0.4 * (1 - k), p.z); cib.set(q.x, q.y + 0.25, q.z);
        const recul = 1.2; v.x -= Math.cos(p.cap) * recul; v.z += Math.sin(p.cap) * recul;
      } else {                                                         // écuries + compte à rebours : grue qui tourne lentement, puis face au portique
        const kR = borne((t - C.rebours[0]) / 1.4), a = 0.6 + (t - C.survol[1]) * 0.05;
        const pD = pts[0], devant = new THREE.Vector3(pD.x + Math.cos(pD.cap) * 3.4, pD.y + 1.3, pD.z - Math.sin(pD.cap) * 3.4);
        const orb = new THREE.Vector3(cx + Math.cos(a) * 16, 7.5, cz + Math.sin(a) * 16);
        v.copy(orb).lerp(devant, lisse(kR)); cib.set(cx, 1.2, cz).lerp(new THREE.Vector3(pD.x, pD.y + 1.45, pD.z), lisse(kR));
      }
      cam.position.copy(v); cam.lookAt(cib);
      // guirlandes : chenillard (vitesse qui monte pendant le compte à rebours)
      const vit = t > C.rebours[0] ? 22 : 9, col = gB.attributes.color;
      for (let i = 0; i < baseB.length; i++) { const on = ((Math.floor(t * vit) + i) % 4) === 0 ? 1 : 0.28; col.setXYZ(i, baseB[i].r * on, baseB[i].g * on, baseB[i].b * on); }
      col.needsUpdate = true;
      for (const r of roues) r.m.rotation.z += r.w * dt * (t > C.rebours[0] ? 2.2 : 1);
      etoile.rotation.y += dt * 1.2;
      const pos = gN.attributes.position;
      for (let i = 0; i < NN; i++) { let y = pos.getY(i) - vN[i] * dt; if (y < 0) y += 18; pos.setY(i, y); pos.setX(i, pos.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.08); }
      pos.needsUpdate = true;
      // feux du portique : rouges un par un, puis tout s'éteint (LIGHTS OUT)
      feux.forEach((f, i) => { const on = t >= C.feux[i] && t < C.lightsOut; f.material.color.setHex(on ? 0xff0a14 : 0x1a0606); if (on) f.material.color.multiplyScalar(1.35); });   // rouge feu de départ franc (sans virer au rose)
      chaud.intensity = 1.4 + (t > C.lightsOut && t < C.lightsOut + 0.25 ? 6 : 0);
      renderer.render(scene, cam);
    },
    dispose() { for (const x of jet) { try { x.dispose(); } catch (e) { /* rien */ } } renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* rien */ } },
  };
}

/* ------------------------------------------------------------------ 2D : néons, cartes d'écuries, compte à rebours */
function neon(g, texte, x, y, taille, couleur, force = 1, { align = 'center', police = '900 ' } = {}) {
  g.save(); g.font = `${police}${taille}px Bahnschrift, "DIN Alternate", "Arial Narrow", system-ui, sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
  g.globalAlpha = Math.max(0, Math.min(1, force));
  g.shadowColor = couleur; g.shadowBlur = taille * 0.55; g.fillStyle = couleur; g.fillText(texte, x, y);
  g.shadowBlur = taille * 0.18; g.fillStyle = '#fff'; g.globalAlpha *= 0.85; g.fillText(texte, x, y);
  g.restore();
}
function dessiner2d(g, W, H, t, C, { lettres, equipes, logos }) {
  g.clearRect(0, 0, W, H);
  const u = Math.min(W / 1920, H / 1080);
  const borne = (x) => Math.max(0, Math.min(1, x)), lisse = (x) => x * x * (3 - 2 * x);
  // vignettage permanent
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);

  /* 1. allumage du titre, lettre à lettre (une lettre « ratée » bégaie avant de tenir) */
  if (t < C.survol[1] - 0.6) {
    const sortie = 1 - borne((t - (C.survol[0] + 1.6)) / 0.8);
    const L = lettres.length, larg = 78 * u, x0 = W / 2 - (L - 1) * larg / 2;
    lettres.forEach((l, i) => {
      if (t < l.t || l.ch === ' ') return;
      const d = t - l.t, bege = l.rate && d < 0.5 ? (Math.sin(d * 90) > 0.2 ? 1 : 0.15) : 1, flick = d < 0.12 ? (Math.random() < 0.5 ? 0.2 : 1) : 1;
      neon(g, l.ch, x0 + i * larg, H * 0.42, 112 * u, i < 11 ? '#ff3b6b' : '#33e1ff', bege * flick * sortie);
    });
    const ks = borne((t - (C.allumage[1] - 0.6)) / 0.5) * sortie;
    neon(g, 'ÉDITION DU 23 DÉCEMBRE', W / 2, H * 0.55, 40 * u, '#ffd36b', ks, { police: '700 ' });
    if (t > C.survol[0] + 0.3) neon(g, 'RAINBOW ROAD · 5 VOIES · 2,44 M DE PENTE ET DE GLOIRE', W / 2, H * 0.88, 30 * u, '#b9a6ff', borne((t - C.survol[0] - 0.3) / 0.5) * (1 - borne((t - C.survol[1] + 1.2) / 0.6)), { police: '700 ' });
  }

  /* 3. les écuries */
  for (const ev of C.equipes) {
    if (t < ev.t0 || t > ev.t1 + 0.35) continue;
    const k = (t - ev.t0) / (ev.t1 - ev.t0);
    if (ev.type === 'groupe') {
      const a = borne(k * 3) * (1 - borne((k - 0.75) * 4));
      neon(g, `GROUPE ${'ABC'[ev.g] || ev.g + 1}`, W / 2, H * 0.44, 150 * u, '#ffd36b', a);
      neon(g, `MANCHE ${ev.g + 1} · 5 VOIES · 5 ÉCURIES`, W / 2, H * 0.58, 34 * u, '#9fe8ff', a, { police: '700 ' });
      continue;
    }
    const e = equipes[ev.i]; if (!e) continue;
    const [c1, c2] = (e.colors && e.colors.length ? e.colors : ['#334155', '#ffd36b']).concat(['#ffd36b']);
    const entree = lisse(borne(k / 0.22)), sortie = borne((k - 0.86) / 0.14), x = W * (0.5 + (1 - entree) * 0.7 - sortie * 0.9);
    const cw = 1240 * u, ch = 330 * u, y = H * 0.62;
    g.save(); g.translate(x, y); g.transform(1, 0, -0.18, 1, 0, 0); g.globalAlpha = 1 - sortie * 0.6;
    const gr = g.createLinearGradient(-cw / 2, 0, cw / 2, 0); gr.addColorStop(0, c1); gr.addColorStop(0.62, '#0b0a16'); gr.addColorStop(1, c2);
    g.shadowColor = c2; g.shadowBlur = 40 * u; g.fillStyle = gr; g.fillRect(-cw / 2, -ch / 2, cw, ch); g.shadowBlur = 0;
    g.fillStyle = c2; g.fillRect(-cw / 2, -ch / 2, cw, 10 * u); g.fillRect(-cw / 2, ch / 2 - 10 * u, cw, 10 * u);
    g.restore();
    // logo (ou pastille), numéro, nom, pilote, citation
    const lx = x - cw / 2 + 210 * u, im = logos.get(e.id), R = 120 * u;
    g.save(); g.globalAlpha = 1 - sortie * 0.6; g.beginPath(); g.arc(lx, y, R, 0, Math.PI * 2); g.closePath(); g.fillStyle = c1; g.fill();
    g.lineWidth = 8 * u; g.strokeStyle = c2; g.stroke(); g.clip();
    if (im) { const s = Math.max((2 * R) / im.naturalWidth, (2 * R) / im.naturalHeight); g.drawImage(im, lx - im.naturalWidth * s / 2, y - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
    else { g.fillStyle = '#fff'; g.font = `900 ${110 * u}px Bahnschrift, system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(e.id).padStart(2, '0'), lx, y + 6 * u); }
    g.restore();
    const tx = lx + R + 50 * u, a = 1 - sortie;
    neon(g, `ÉCURIE ${String(e.id).padStart(2, '0')} · GROUPE ${'ABC'[ev.g] || ev.g + 1}`, tx, y - 108 * u, 30 * u, c2, a, { align: 'left', police: '700 ' });   // les voies sont tirées au sort le soir même : on n'en annonce aucune
    neon(g, String(e.name || '').toUpperCase(), tx, y - 42 * u, Math.min(78, 1500 / Math.max(10, String(e.name || '').length)) * u, '#ffffff', a, { align: 'left' });
    neon(g, `PILOTE : ${String(e.nickname || e.pilot || '').toUpperCase()}${e.pilot && e.nickname ? ' (' + e.pilot + ')' : ''}`, tx, y + 30 * u, 36 * u, '#ffd36b', a, { align: 'left', police: '700 ' });
    if (e.quote) { g.save(); g.globalAlpha = a * borne((k - 0.25) / 0.2); g.font = `italic 600 ${30 * u}px Georgia, serif`; g.fillStyle = '#e8e3ff'; g.textAlign = 'left'; g.textBaseline = 'middle';
      const q = '« ' + String(e.quote) + ' »'; g.fillText(q.length > 70 ? q.slice(0, 68) + '… »' : q, tx, y + 92 * u); g.restore(); }
  }

  /* 4. compte à rebours : chiffres géants, puis LIGHTS OUT */
  for (const c of C.chiffres) {
    const d = t - c.t; if (d < 0 || d > 0.95 || t >= C.lightsOut) continue;
    const s = 1 + 0.35 * Math.exp(-d * 9), a = 1 - borne((d - 0.6) / 0.35);
    neon(g, String(c.chiffre), W / 2, H * 0.36, 300 * u * s, '#ff2238', a);
  }
  if (t >= C.rebours[0] && t < C.lightsOut) neon(g, 'MOTEURS EN CHAUFFE…', W / 2, H * 0.86, 34 * u, '#ff9a3c', 0.85 + 0.15 * Math.sin(t * 9), { police: '700 ' });
  if (t >= C.lightsOut) {
    const d = t - C.lightsOut;
    g.fillStyle = `rgba(255,255,255,${Math.max(0, 0.9 - d * 3)})`; g.fillRect(0, 0, W, H);
    neon(g, "C'EST PARTI !", W / 2, H * 0.45, 190 * u * (1 + 0.15 * Math.exp(-d * 8)), '#33e1ff', 1 - borne((d - 0.9) / 0.5));
    g.fillStyle = `rgba(2,1,8,${borne((d - 0.9) / 0.6)})`; g.fillRect(0, 0, W, H);
  }
}

/* ------------------------------------------------------------------ bande-son procédurale (Web Audio, calée sur t0) */
export function partition(o, t0, C) {
  const { ton, bruit, kick, metal, NOTE } = o;
  // 1. allumage : grésillement 50 Hz des transformateurs et claquement de starter à chaque lettre
  ton('sawtooth', 50, t0 + 0.2, C.survol[0] + 1.2, { vol: 0.03, fc: 220, r: 0.6 });
  for (let i = 0; i < 16; i++) { const x = t0 + 0.35 + i * (C.allumage[1] - 0.9) / 16; metal(x, 0.06, 4200 + (i % 4) * 300); bruit(x, 0.04, { vol: 0.05, type: 'bandpass', f: 7000, q: 3 }); }
  // 2. survol : orgue de manège (arpège en ré majeur), souffle d'air, cloches
  const arp = [62, 66, 69, 74, 69, 66];
  for (let x = C.survol[0], i = 0; x < C.survol[1]; x += 0.18, i++) ton('square', NOTE(arp[i % arp.length]), t0 + x, 0.14, { vol: 0.035, fc: 2400, r: 0.05 });
  for (let x = C.survol[0]; x < C.survol[1]; x += 0.72) ton('triangle', NOTE(38), t0 + x, 0.3, { vol: 0.12, r: 0.15 });
  bruit(t0 + C.survol[0], C.survol[1] - C.survol[0], { vol: 0.06, type: 'bandpass', f: 600, f2: 2400, q: 0.6, a: 0.8 });
  [0, 1.4, 2.8].forEach((d) => { ton('sine', NOTE(86), t0 + C.survol[0] + d, 1.2, { vol: 0.04, r: 1.0 }); ton('sine', NOTE(86) * 2.76, t0 + C.survol[0] + d, 0.8, { vol: 0.012, r: 0.6 }); });
  // 3. écuries : grosse caisse + souffle au passage de chaque carte, cymbale aux groupes, nappe continue
  for (const ev of C.equipes) {
    if (ev.type === 'groupe') { bruit(t0 + ev.t0, 1.2, { vol: 0.12, f: 5200 }); kick(t0 + ev.t0, 0.8); ton('sawtooth', NOTE(38), t0 + ev.t0, 0.5, { vol: 0.08, fc: 500, r: 0.3 }); }
    else { kick(t0 + ev.t0, 0.55); bruit(t0 + ev.t0 - 0.12, 0.3, { vol: 0.09, type: 'bandpass', f: 400, f2: 3600, q: 0.8, a: 0.1 }); ton('square', NOTE(74 + (ev.i % 5) * 2), t0 + ev.t0 + 0.02, 0.09, { vol: 0.03, fc: 3000 }); }
  }
  const e0 = C.survol[1], e1 = C.rebours[0];
  [50, 57, 62].forEach((n) => ton('sawtooth', NOTE(n), t0 + e0, e1 - e0, { vol: 0.022, fc: 900, a: 0.8, r: 0.6, detune: n % 2 ? 6 : -6 }));
  // 4. compte à rebours : bip grave à chaque feu, battement qui accélère, puis LIGHTS OUT : impact + souffle + accord majeur
  C.feux.forEach((x) => { ton('sine', 440, t0 + x, 0.16, { vol: 0.16, r: 0.06 }); kick(t0 + x, 0.7); });
  for (let x = C.rebours[0], p = 0.5; x < C.lightsOut - 0.05; x += p, p = Math.max(0.12, p * 0.93)) bruit(t0 + x, 0.04, { vol: 0.05, f: 8000 });
  ton('sine', 880, t0 + C.lightsOut, 0.5, { vol: 0.2, r: 0.2 });
  kick(t0 + C.lightsOut, 1); ton('sine', 42, t0 + C.lightsOut, 1.4, { vol: 0.5, glisse: 0.6, r: 0.8 });
  bruit(t0 + C.lightsOut, 1.4, { vol: 0.22, type: 'lowpass', f: 3000, f2: 200, a: 0.01 });
  [62, 66, 69, 74].forEach((n) => ton('sawtooth', NOTE(n), t0 + C.lightsOut + 0.05, 1.1, { vol: 0.05, fc: 2600, r: 0.6 }));
}
