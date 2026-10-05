/* Scène 3D procédurale (Three.js r128, fourni en local) : bolides à la couleur des écuries,
   six trophées, sol miroir, projecteurs, particules dorées. Fond transparent : l'atmosphère de la page reste visible. */

import { buildConceptCar } from './concept_cars.js';

const T = () => window.THREE;

/** Palier de qualité : 'high' (PC / TV), 'medium' (tablette, petit écran), 'low' (téléphone modeste).
    Forçable par l'URL : ?q=low|medium|high. Le rendu se dégrade ensuite tout seul si les FPS chutent. */
export function detectQuality() {
  try { const f = new URLSearchParams(location.search).get('q'); if (f === 'low' || f === 'medium' || f === 'high') return f; } catch (e) { /* hors navigateur */ }
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width || 1920, screen.height || 1080) < 820;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse && (cores <= 4 || (navigator.deviceMemory || 4) <= 3)) return 'low';
  if (coarse || small) return 'medium';
  return 'high';
}
const TIER = { high: { dpr: 2, shadow: 1024, dust: 220 }, medium: { dpr: 1.5, shadow: 512, dust: 120 }, low: { dpr: 1.25, shadow: 0, dust: 60 } };
/* r128 : les couleurs hexadécimales sont en sRGB, le rendu attend du linéaire → conversion explicite. */
const col = (hex) => new (T().Color)(hex).convertSRGBToLinear();

function gold(THREE, rough = 0.22) { return new THREE.MeshStandardMaterial({ color: col(0xf2b53c), metalness: 1, roughness: rough, envMapIntensity: 1.15 }); }
function silver(THREE) { return new THREE.MeshStandardMaterial({ color: col(0xdfe6f2), metalness: 1, roughness: 0.18, envMapIntensity: 1.1 }); }

/* ---------------------------------------------------------------- bolide */
const lum = (hex) => { const h = hex.replace('#', ''); const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h; return 0.299 * parseInt(v.slice(0, 2), 16) + 0.587 * parseInt(v.slice(2, 4), 16) + 0.114 * parseInt(v.slice(4, 6), 16); };
/** Carrosserie lisible : si la couleur principale de l'écurie est quasi noire, on peint avec la secondaire. */
export function carPalette(colors) {
  const a = colors[0], b = colors[1] || '#ffffff';
  if (lum(a) < 48 && lum(b) >= 48) return [b, '#14171f'];
  if (lum(a) < 48) return ['#4b5470', '#ffffff'];
  return [a, b];
}
export function buildCar(colors = ['#3b82f6', '#f59e0b'], opts = {}) {
  const THREE = T();
  colors = carPalette(colors);
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: col(colors[0]), metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
  const accent = new THREE.MeshPhysicalMaterial({ color: col(colors[1] || '#fff'), metalness: 0.4, roughness: 0.3, clearcoat: 1, envMapIntensity: 1.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: col(0x0a1226), metalness: 0.2, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.6 });
  const rubber = new THREE.MeshStandardMaterial({ color: col(0x111218), roughness: 0.85 });

  const prof = new THREE.Shape();
  prof.moveTo(-1.28, 0.16); prof.lineTo(-1.28, 0.46);
  prof.quadraticCurveTo(-1.22, 0.64, -0.82, 0.68); prof.lineTo(-0.5, 0.74);
  prof.quadraticCurveTo(-0.22, 1.12, 0.2, 1.14); prof.lineTo(0.46, 1.11);
  prof.quadraticCurveTo(0.74, 1.04, 0.9, 0.74); prof.lineTo(1.2, 0.62);
  prof.quadraticCurveTo(1.36, 0.52, 1.34, 0.3); prof.lineTo(1.34, 0.16); prof.closePath();
  const bodyG = new THREE.ExtrudeGeometry(prof, { depth: 1.0, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.09, bevelSegments: 5, curveSegments: 18 });
  bodyG.translate(0, 0, -0.5);
  const body = new THREE.Mesh(bodyG, paint); body.castShadow = true; g.add(body);

  const win = new THREE.Shape();
  win.moveTo(-0.4, 0.76); win.lineTo(-0.18, 1.06); win.lineTo(0.44, 1.07); win.lineTo(0.8, 0.76); win.closePath();
  const winG = new THREE.ExtrudeGeometry(win, { depth: 1.04, bevelEnabled: false });
  winG.translate(0, 0, -0.52);
  g.add(new THREE.Mesh(winG, glass));

  // bande de couleur secondaire sur les flancs et le capot
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.07, 1.22), accent); stripe.position.set(0, 0.44, 0); g.add(stripe);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.28), accent); hood.position.set(0.98, 0.72, 0); hood.rotation.z = -0.2; g.add(hood);

  // roues
  const wheelG = new THREE.CylinderGeometry(0.31, 0.31, 0.26, 32); wheelG.rotateX(Math.PI / 2);
  const rimG = new THREE.CylinderGeometry(0.19, 0.19, 0.28, 24); rimG.rotateX(Math.PI / 2);
  [[-0.82, 0.31, 0.58], [0.84, 0.31, 0.58], [-0.82, 0.31, -0.58], [0.84, 0.31, -0.58]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelG, rubber); w.position.set(x, y, z); w.castShadow = true; g.add(w);
    const r = new THREE.Mesh(rimG, silver(THREE)); r.position.set(x, y, z + Math.sign(z) * 0.015); g.add(r);
  });
  // phares et feux
  const hl = new THREE.MeshStandardMaterial({ color: col(0xfff6d0), emissive: 0xffe9a0, emissiveIntensity: 2.2 });
  const tl = new THREE.MeshStandardMaterial({ color: col(0xff2040), emissive: 0xff0a30, emissiveIntensity: 1.8 });
  [-0.36, 0.36].forEach((z) => {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), hl); a.position.set(1.36, 0.46, z); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.2), tl); b.position.set(-1.38, 0.5, z); g.add(b);
  });
  // aileron
  if (opts.spoiler !== false) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 1.12), accent); sp.position.set(-1.2, 0.86, 0); g.add(sp);
    [-0.4, 0.4].forEach((z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), silver(THREE)); p.position.set(-1.14, 0.74, z); g.add(p); });
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.height = 1.2;
  return g;
}

/* ---------------------------------------------------------------- trophées */
function base(THREE, h = 0.5, r = 1.1) {
  const g = new THREE.Group();
  const marble = new THREE.MeshPhysicalMaterial({ color: col(0x0e1226), metalness: 0.15, roughness: 0.55, clearcoat: 0.4, envMapIntensity: 0.5 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, h, 64), marble); b.position.y = h / 2; g.add(b);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 64), new THREE.MeshStandardMaterial({ color: col(0x0a0d1f), roughness: 0.7, metalness: 0.1, envMapIntensity: 0.3 })); cap.rotation.x = -Math.PI / 2; cap.position.y = h + 0.002; g.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, 0.035, 16, 96), gold(THREE, 0.18)); ring.rotation.x = Math.PI / 2; ring.position.y = h; g.add(ring);
  const ring2 = ring.clone(); ring2.position.y = 0.04; ring2.scale.setScalar(1.1); g.add(ring2);
  return g;
}
function lathe(THREE, pts, mat, seg = 72) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat); }

export const TROPHY_BUILDERS = {
  grandprix(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const m = gold(THREE, 0.16);
    const cup = lathe(THREE, [[0.001, 0], [0.5, 0.02], [0.55, 0.12], [0.2, 0.22], [0.14, 0.5], [0.3, 0.62], [0.62, 0.9], [0.9, 1.5], [0.92, 2.05], [0.86, 2.1], [0.8, 1.55], [0.55, 1.1], [0.001, 0.96]], m);
    cup.position.y = 0.55; g.add(cup);
    [-1, 1].forEach((s) => { const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 16, 48, Math.PI * 1.25), m); hnd.position.set(s * 0.95, 2.05, 0); hnd.rotation.z = s > 0 ? -Math.PI * 0.35 : Math.PI * 1.1; g.add(hnd); });
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), m); star.position.y = 3.05; star.scale.y = 1.4; star.name = 'spin'; g.add(star);
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 64, 1, true), new THREE.MeshStandardMaterial({ color: col(0xffffff), metalness: .1, roughness: .4 }));
    flag.position.y = 1.5; g.add(flag);
    return g;
  },
  parieur(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const m = gold(THREE, 0.2);
    const edge = new THREE.MeshStandardMaterial({ color: col(0xc78a1d), metalness: 1, roughness: 0.35 });
    for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.62 - (i % 3) * 0.01, 0.62, 0.11, 48), i % 2 ? m : edge); c.position.set(Math.sin(i * 2.1) * 0.05, 0.6 + i * 0.115, Math.cos(i * 2.1) * 0.05); c.rotation.y = i; g.add(c); }
    const big = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 64), m); big.rotation.set(Math.PI / 2 - 0.2, 0, 0); big.position.set(0, 2.9, 0); big.name = 'spin'; g.add(big);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 12, 64), edge); rim.rotation.copy(big.rotation); rim.position.copy(big.position); rim.position.z += 0.075; g.add(rim);
    return g;
  },
  cascadeur(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: col(0x2a3566), roughness: .5 }));
    ramp.position.set(-0.4, 0.8, 0); ramp.rotation.z = 0.5; g.add(ramp);
    const car = buildCar(['#ff3b57', '#ffd36a']); car.scale.setScalar(0.5); car.position.set(0.55, 1.9, 0); car.rotation.set(0.5, 0.3, 2.7); car.name = 'spin2'; g.add(car);
    const m = gold(THREE); const arc = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 8, 64, Math.PI), m); arc.position.set(0.1, 0.9, 0); g.add(arc);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), m); s.position.set(-0.8 + i * 0.5, 2.8 + (i % 2) * 0.2, 0.5); g.add(s); }
    return g;
  },
  saboteur(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const m = new THREE.MeshPhysicalMaterial({ color: col(0xffd23a), metalness: 0.1, roughness: 0.36, clearcoat: 0.8 });
    const brown = new THREE.MeshStandardMaterial({ color: col(0x4a2e12), roughness: 0.8 });
    const R = 1.25, A = 2.05, r = 0.3;
    const grp = new THREE.Group();
    const arc = new THREE.Mesh(new THREE.TorusGeometry(R, r, 14, 72, A), m);
    arc.rotation.z = -Math.PI / 2 - A / 2; grp.add(arc);
    const th1 = -Math.PI / 2 - A / 2, th2 = -Math.PI / 2 + A / 2;
    const end = (th) => new THREE.Vector3(Math.cos(th) * R, Math.sin(th) * R, 0);
    const dir = (th) => new THREE.Vector3(-Math.sin(th), Math.cos(th), 0);
    const e1 = end(th1), d1 = dir(th1).negate();                       // sortie côté tige
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.5, 14), brown);
    stem.position.copy(e1).addScaledVector(d1, 0.3); stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d1); grp.add(stem);
    const e2 = end(th2), d2 = dir(th2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), brown); tip.position.copy(e2).addScaledVector(d2, 0.12); grp.add(tip);
    grp.scale.z = 0.9; grp.position.y = 2.95; grp.rotation.z = 0.12;
    g.add(grp);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 1.2, 20), gold(THREE)); post.position.y = 1.1; g.add(post);
    return g;
  },
  reliques(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const m = gold(THREE, 0.2);
    const wheel = new THREE.Group(); wheel.name = 'spin';
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.2, 24, 80), m));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 16, 48), m));
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), silver(THREE)); s.position.set(Math.cos(i * Math.PI / 6) * 0.82, Math.sin(i * Math.PI / 6) * 0.82, 0); s.rotation.z = i * Math.PI / 6 + Math.PI / 2; wheel.add(s); }
    wheel.position.y = 2.15; g.add(wheel);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.8, 24), m); stand.position.y = 0.95; g.add(stand);
    return g;
  },
  star(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const sh = new THREE.Shape(); const R = 1.25, r = 0.55;
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; const x = Math.cos(a) * rad, y = Math.sin(a) * rad; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.28, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4 }); geo.translate(0, 0, -0.14);
    const st = new THREE.Mesh(geo, gold(THREE, 0.14)); st.position.y = 2.2; st.name = 'spin'; g.add(st);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.9, 24), gold(THREE)); post.position.y = 0.95; g.add(post);
    return g;
  },
  cuillere(THREE) {
    const g = new THREE.Group(); g.add(base(THREE));
    const wood = new THREE.MeshPhysicalMaterial({ color: col(0xb87a3c), roughness: 0.55, clearcoat: 0.3 });
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 28), wood); bowl.scale.set(0.9, 1.25, 0.34); bowl.position.y = 2.75; g.add(bowl);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.9, 24), wood); handle.position.y = 1.35; g.add(handle);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 40), new THREE.MeshStandardMaterial({ color: col(0xff3b57), roughness: .5 })); bow.position.y = 1.6; bow.rotation.x = Math.PI / 2; g.add(bow);
    g.rotation.z = 0; g.userData.tilt = true;
    return g;
  },
};

/* ---------------------------------------------------------------- scène */
export function createStage(canvas, { camera: camOpts = {}, floor = true } = {}) {
  const THREE = T();
  const quality = detectQuality(), tier = TIER[quality];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
  renderer.setPixelRatio(dpr);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = tier.shadow > 0; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(camOpts.fov || 34, 1, 0.1, 100);
  const camState = { r: camOpts.r || 8.2, h: camOpts.h || 2.3, look: camOpts.look || 1.3, a: 0.5 };

  // environnement : petite salle de studio avec panneaux lumineux, filtrée en PMREM
  const envScene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x1b2352, side: THREE.BackSide })); envScene.add(room);
  const panel = (c, i, w, h, x, y, z, ry = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); p.position.set(x, y, z); p.rotation.y = ry; envScene.add(p); };
  panel(0xfff0cf, 7, 9, 4, 0, 5.5, 0); panel(0xffc07a, 5, 3, 7, -9, 3, 0, Math.PI / 2); panel(0x9cc4ff, 4.5, 3, 7, 9, 3, 0, Math.PI / 2); panel(0xff7a8a, 3, 7, 2.5, 0, 2, -9.5); panel(0xffffff, 4, 6, 1.6, 0, 1.5, 9.5); panel(0xffe2a8, 3, 14, 1.2, 0, 0.6, 9.7);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.02).texture;

  scene.add(new THREE.HemisphereLight(0x8fb6ff, 0x1a1030, 0.35));
  const key = new THREE.SpotLight(0xfff0d0, 2.2, 40, 0.5, 0.55, 1); key.position.set(5, 9, 6); key.castShadow = tier.shadow > 0; key.shadow.mapSize.set(tier.shadow || 512, tier.shadow || 512); key.shadow.bias = -0.0004; scene.add(key);
  const rim = new THREE.SpotLight(0xff4d6d, 1.6, 40, 0.6, 0.6, 1); rim.position.set(-7, 5, -5); scene.add(rim);
  const rim2 = new THREE.SpotLight(0x6ab0ff, 1.4, 40, 0.6, 0.6, 1); rim2.position.set(7, 4, -6); scene.add(rim2);

  if (floor) {
    // sol : récepteur d'ombre + nappe de lumière dorée à bord fondu (aucun bord dur visible)
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.55 }));
    sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; scene.add(sh);
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const cx = cv.getContext('2d'); const gr = cx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, 'rgba(255,205,125,.55)'); gr.addColorStop(0.45, 'rgba(255,170,90,.18)'); gr.addColorStop(0.8, 'rgba(120,140,255,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 512, 512);
    cx.strokeStyle = 'rgba(255,220,150,.5)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(256, 256, 150, 0, Math.PI * 2); cx.stroke();
    cx.strokeStyle = 'rgba(255,220,150,.22)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(256, 256, 205, 0, Math.PI * 2); cx.stroke();
    const tex = new THREE.CanvasTexture(cv);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.003; scene.add(pool);
  }

  // poussière d'or
  const N = tier.dust, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 12; spd[i] = 0.1 + Math.random() * 0.25; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: col(0xffe3a0), size: 0.045, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  const holder = new THREE.Group(); scene.add(holder);
  let current = null, spinSpeed = 0.5, t0 = performance.now(), running = true, raf = 0, autoOrbit = true, popT = 1;
  let jetonPantheon = 0;                     // annule un chargement de trophée réel devenu obsolète
  const perf = { n: 0, acc: 0, fps: 60, downgrades: 0 };

  function size() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth, hgt = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, hgt, false); camera.aspect = w / Math.max(1, hgt); camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(canvas); size();

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running || document.hidden) return;
    const rawDt = (now - t0) / 1000; const dt = Math.min(0.12, rawDt); t0 = now;
    // garde-fou 60 FPS : moyenne glissante, on baisse la définition puis les ombres si ça rame
    if (rawDt > 0 && rawDt < 0.5) { perf.acc += rawDt; perf.n++; }
    if (perf.n >= 90) {
      perf.fps = perf.n / perf.acc; perf.n = 0; perf.acc = 0;
      if (perf.fps < 48 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); size(); perf.downgrades++; }
      else if (perf.fps < 40 && key.castShadow) { key.castShadow = false; perf.downgrades++; }
    }
    if (autoOrbit) camState.a += dt * 0.12;
    if (camState.fit) { // cadrage automatique : la sphère englobante du bolide tient toujours dans l'image
      const vf = (camera.fov * Math.PI) / 360, hf = Math.atan(Math.tan(vf) * camera.aspect);
      const d = camState.fit.R / Math.sin(Math.min(vf, hf)) * 0.94;
      camState.r = Math.sqrt(Math.max(1, d * d - camState.h * camState.h)); camState.look = camState.fit.H * 0.42;
    }
    camera.position.set(Math.cos(camState.a) * camState.r, camState.h, Math.sin(camState.a) * camState.r);
    camera.lookAt(0, camState.look, 0);
    if (current) {
      if (popT < 1) { popT = Math.min(1, popT + dt * 2.6); const e = 1 - Math.pow(1 - popT, 3); current.scale.setScalar((current.userData.baseScale || 1) * (0.6 + 0.4 * e)); current.position.y = (1 - e) * 1.5; }
      current.rotation.y += dt * spinSpeed * (current.userData.turn ?? 1);
      current.traverse((o) => { if (o.name === 'spin') o.rotation.y += dt * 1.2; if (o.name === 'spin2') o.rotation.y += dt * 0.8; });
      if (current.userData.tick) current.userData.tick(now / 1000, dt);
      if (current.userData.floatPivot) current.userData.floatPivot.position.y = 1.7 + Math.sin(now * 0.002) * 0.1;
    }
    const p = pg.attributes.position;
    for (let i = 0; i < N; i++) { p.array[i * 3 + 1] += spd[i] * dt; if (p.array[i * 3 + 1] > 6.5) p.array[i * 3 + 1] = 0; }
    p.needsUpdate = true;
    key.intensity = 2.2 + Math.sin(now * 0.0012) * 0.15;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  function dispose3(o) { o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) { (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose()); } }); }
  function show(obj, { scale = 1, turn = 1 } = {}) {
    if (current) { holder.remove(current); dispose3(current); }
    current = obj; obj.userData.baseScale = scale; obj.userData.turn = turn; popT = 0; holder.add(obj);
  }
  return {
    renderer, scene, camera,
    showTrophy(id) { jetonPantheon++; const b = TROPHY_BUILDERS[id] || TROPHY_BUILDERS.grandprix; camState.fit = null; camState.r = 8.2; camState.h = 2.6; camState.look = 1.5; show(b(THREE)); },
    /** Trophée RÉEL du Panthéon (STL de montage imprimées sur la P1S) ; repli sur le modèle procédural si indisponible. */
    async showPantheon(modele, repli = 'grandprix') {
      const jeton = ++jetonPantheon;
      try {
        const { chargerManifeste, construireTrophee } = await import('./pantheon3d.js');
        const man = await chargerManifeste();
        const t = man.trophees.find((x) => x.id === modele);
        if (!t) throw new Error('trophée inconnu : ' + modele);
        const tr = await construireTrophee(THREE, t);
        if (jeton !== jetonPantheon) { tr.dispose(); return false; }
        // cette scène sort en sRGB : les teintes de filament (sRGB) passent en linéaire pour garder leur vraie couleur
        if (renderer.outputEncoding === THREE.sRGBEncoding) for (const m of tr.pieces) m.material.color.convertSRGBToLinear();
        const g = new THREE.Group();
        const c = tr.boite.getCenter(new THREE.Vector3()), sz = tr.boite.getSize(new THREE.Vector3());
        tr.group.position.set(-c.x, -tr.boite.min.y, -c.z);
        g.add(tr.group);
        const k = 3.3 / Math.max(sz.y, Math.max(sz.x, sz.z) * 0.8);      // ~ la taille des trophées procéduraux
        camState.fit = null; camState.r = 8.2; camState.h = 2.6; camState.look = sz.y * k * 0.5;
        show(g, { scale: k });
        return true;
      } catch (e) {
        if (jeton === jetonPantheon) { const b = TROPHY_BUILDERS[repli] || TROPHY_BUILDERS.grandprix; show(b(THREE)); }
        return false;
      }
    },
    /** Concept-car de l'écurie (objet équipe ou numéro). */
    showConcept(team) {
      const car = buildConceptCar(team, { quality });
      const b = new THREE.Box3().setFromObject(car), sz = b.getSize(new THREE.Vector3());
      camState.h = 2.4; camState.fit = { R: 0.5 * Math.hypot(Math.max(sz.x, sz.z), Math.min(sz.x, sz.z), sz.y * 0.8), H: sz.y };
      show(car, { scale: 1 });
    },
    setView(v) { Object.assign(camState, v); },
    get fps() { return Math.round(perf.fps); }, get quality() { return quality; }, get pixelRatio() { return dpr; },
    showCar(colors) { camState.fit = null; camState.r = 8.4; camState.h = 2.2; camState.look = 0.7; const c = buildCar(colors); show(c, { scale: 1.15 }); },
    setSpin(v) { spinSpeed = v; }, setOrbit(v) { autoOrbit = v; },
    setRunning(v) { running = v; },
    flash() { key.intensity = 8; },
    dispose() { cancelAnimationFrame(raf); if (current) dispose3(current); renderer.dispose(); },
  };
}
