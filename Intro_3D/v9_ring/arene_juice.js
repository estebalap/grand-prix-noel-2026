/* « JUICE » 100 % DIÉGÉTIQUE du segment arène (V9.2 Ring) — tout est fonction PURE du temps, semé, sans état d'une image à l'autre.

     creerOmbres       ombres de contact douces haute densité (CanvasTexture radiale multicouche, cœur rgba(0,0,0,0,88)) sous CHAQUE
                       véhicule et sous chacune de ses roues (4, 6 ou 8) ; elles se compressent / s'élargissent avec la suspension et
                       s'estompent quand la voiture vole (posées sur la surface porteuse, decor.sol)
     creerEtincelles   gerbes de points incandescents (blanc → jaune → orange → rouge) : vitesse tangentielle + gravité + rebond sur
                       le sol, émises par des événements (atterrissage, freinage, dérapage, frottement continu)
     creerTrauma       secousse de caméra : somme d'impulsions décroissantes × bruit lissé (sinusoïdes incommensurables) — pure
     creerHuile        gouttes d'huile qui tombent sous l'A4 #08 et flaques noires brillantes qui s'étalent là où elles touchent le sol
     creerFlares       flare des phares (halo + étoile + traînée anamorphique) d'une voiture
     creerBoule        boule à facettes DORÉE suspendue sous l'écran géant (facettes miroir, scintillements) + taches de lumière
                       qui tournent sur le tapis et le public
     creerPortail      PORTAIL EXPRESS : anneau d'énergie hexagonal cyan/magenta couché au centre du ring, disque tourbillonnant
     creerVortex       tunnel néon (cyan, magenta, or, violet) au-dessus de l'arène, d'où jaillit la caméra au DROP
     bandeauCompact    habillage réduit des smash cuts : badge #numéro + NOM (2 textes, 1 élément d'UI) */
import { clamp, lerp, smoother, easeOut, prng, texCanvas, haloSprite } from './arene_outils.js';

/* ═══════════════════════════════ OMBRES DE CONTACT ═══════════════════════════════ */
function texOmbre(THREE) {
  return texCanvas(THREE, 128, 128, (g, w, h) => {
    const c = w / 2;
    // trois couches : pénombre large, ombre moyenne, cœur dense (occlusion de contact)
    for (const [r, a] of [[0.5, 0.28], [0.36, 0.42], [0.22, 0.88]]) {
      const d = g.createRadialGradient(c, c, 0, c, c, w * r);
      d.addColorStop(0, `rgba(0,0,0,${a})`); d.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); d.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = d; g.fillRect(0, 0, w, h);
    }
  }, { srgb: false });
}

/**
 * @param voitures [{ env, boite, ech }] ; roues lues dans env.v7.roues (noeud) — leurs positions monde servent à poser l'ombre de
 *        chaque roue ; @param sol (x, z, pont) → hauteur de la surface porteuse
 */
export function creerOmbres(THREE, voitures, { sol }) {
  const groupe = new THREE.Group(); groupe.name = 'ombres-contact';
  const tex = texOmbre(THREE), geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const mat = () => new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const v3 = new THREE.Vector3();
  const fiches = voitures.map((v) => {
    const corps = new THREE.Mesh(geo, mat()); corps.renderOrder = 1; groupe.add(corps);
    // rayon des roues : hauteur du moyeu au repos (voiture posée à l'origine)
    const p0 = v.env.position.clone(), r0 = v.env.rotation.clone(), vis = v.env.visible;
    v.env.position.set(0, 0, 0); v.env.rotation.set(0, 0, 0); v.env.updateMatrixWorld(true);
    const roues = v.env.v7.roues.map((w) => { w.noeud.getWorldPosition(v3); const m = new THREE.Mesh(geo, mat()); m.renderOrder = 1; groupe.add(m); return { w, m, r: Math.max(0.6, v3.y) }; });
    v.env.position.copy(p0); v.env.rotation.copy(r0); v.env.visible = vis; v.env.updateMatrixWorld(true);
    const L = v.boite.max.z - v.boite.min.z, W = v.boite.max.x - v.boite.min.x, cz = (v.boite.max.z + v.boite.min.z) / 2;
    return { v, corps, roues, L, W, cz };
  });
  /** poses[j] (null = cachée) ; pont : déploiement du pont (surface porteuse du départ) */
  function maj(poses, { pont = 0 } = {}) {
    fiches.forEach((f, j) => {
      const p = poses[j], vis = !!p && f.v.env.visible;
      f.corps.visible = vis; for (const r of f.roues) r.m.visible = vis;
      if (!vis) return;
      const vol = p.phase === 'vol';
      const leve = p.phase === 'file' ? 0.25 : 0.015;                         // sur la piste arc-en-ciel (ruban à +0,18 cm) : juste au-dessus
      const ySol = vol ? sol(p.pos[0], p.pos[2], pont) : p.pos[1];
      const h = Math.max(0, p.pos[1] + (p.heave || 0) - ySol);
      const comp = clamp(-(p.heave || 0) * 1.4, -0.35, 0.5);                 // suspension comprimée → ombre plus large et plus dense
      const a = 0.92 * Math.exp(-h / 7) * (1 + 0.25 * comp), ech = (1 + h / 16) * (1 + 0.18 * comp);
      const s = Math.sin(p.cap), c = Math.cos(p.cap);
      f.corps.position.set(p.pos[0] + s * f.cz, ySol + leve, p.pos[2] + c * f.cz);
      f.corps.rotation.y = p.cap; f.corps.scale.set(f.W * 1.32 * ech, 1, f.L * 1.12 * ech); f.corps.material.opacity = clamp(a);
      for (const r of f.roues) {
        r.w.noeud.getWorldPosition(v3);
        const hy = vol ? sol(v3.x, v3.z, pont) : ySol, hr = Math.max(0, v3.y - r.r - hy);
        const k = 1 + hr / 3 + 0.25 * comp;
        r.m.position.set(v3.x, hy + leve + 0.004, v3.z); r.m.rotation.y = p.cap; r.m.scale.set(r.r * 1.7 * k, 1, r.r * 2.5 * k);
        r.m.material.opacity = clamp(0.95 * Math.exp(-hr / 1.6) * (1 + 0.3 * comp));
      }
    });
  }
  return { groupe, maj };
}

/* ═══════════════════════════════ ÉTINCELLES ═══════════════════════════════ */
/**
 * creerEtincelles(THREE, { demiH, evenements }) — evenements : [{ t0, t1, n, vie: [a, b], graine, source(tb, alea) → { p, v, sol } }]
 * (source est PURE : elle lit la pose de la voiture à l'instant de naissance tb). Chaque particule a sa naissance tb (répartie sur
 * [t0, t1]), sa vie, puis une trajectoire balistique analytique avec un rebond (restitution 0,35, frottement 0,55).
 */
export function creerEtincelles(THREE, { demiH = 540, evenements = [] } = {}) {
  const parts = [];
  for (const ev of evenements) {
    const a = prng('etincelles-' + ev.graine);
    for (let i = 0; i < ev.n; i++) {
      const tb = ev.t0 + (ev.t1 - ev.t0) * ((i + a()) / ev.n);
      parts.push({ ev, tb, vie: lerp(ev.vie[0], ev.vie[1], a()), alea: [a(), a(), a(), a(), a()], cache: null });
    }
  }
  const N = parts.length;
  const pos = new Float32Array(Math.max(1, N) * 3), al = new Float32Array(Math.max(1, N)), chaleur = new Float32Array(Math.max(1, N));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('alpha', new THREE.BufferAttribute(al, 1)); geo.setAttribute('chaleur', new THREE.BufferAttribute(chaleur, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { demiH: { value: demiH } },
    vertexShader: `attribute float alpha; attribute float chaleur; uniform float demiH; varying float vA; varying float vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float z = max(-mv.z, 1.0);
        gl_PointSize = alpha > 0.002 ? clamp((0.35 + 0.5 * chaleur) * projectionMatrix[1][1] * demiH / z, 1.2, 14.0) : 0.0; vA = alpha; vC = chaleur; }`,
    fragmentShader: `varying float vA; varying float vC; void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 16.0);
        vec3 c = mix(vec3(1.0, 0.25, 0.05), mix(vec3(1.0, 0.62, 0.16), vec3(1.0, 0.97, 0.85), smoothstep(0.55, 1.0, vC)), smoothstep(0.0, 0.55, vC));
        gl_FragColor = vec4(c * 2.6 * g * vA, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; points.name = 'etincelles';
  const G_ = 981, REST = 0.35, FROT = 0.55;
  /** Position balistique à l'âge a, avec un rebond sur y = sol. */
  function balistique(q, a) {
    const [px, py, pz] = q.p, [vx, vy, vz] = q.v, h = py - q.sol;
    // instant d'impact : py + vy·τ − ½gτ² = sol
    const disc = vy * vy + 2 * G_ * Math.max(0, h), ti = (vy + Math.sqrt(disc)) / G_;
    if (a < ti) return [px + vx * a, py + vy * a - 0.5 * G_ * a * a, pz + vz * a];
    const vImp = vy - G_ * ti, vy2 = -vImp * REST, b = a - ti;
    const xi = px + vx * ti, zi = pz + vz * ti;
    return [xi + vx * FROT * b, Math.max(q.sol, q.sol + vy2 * b - 0.5 * G_ * b * b), zi + vz * FROT * b];
  }
  function maj(t) {
    let n = 0;
    for (let i = 0; i < N; i++) {
      const P = parts[i], age = t - P.tb;
      if (age < 0 || age > P.vie) { al[i] = 0; pos[i * 3 + 1] = -1000; continue; }
      if (!P.cache) P.cache = P.ev.source(P.tb, P.alea);                     // la source ne dépend que de tb (pure) : mise en cache sûre
      const q = P.cache;
      if (!q) { al[i] = 0; continue; }
      const xyz = balistique(q, age); pos[i * 3] = xyz[0]; pos[i * 3 + 1] = xyz[1]; pos[i * 3 + 2] = xyz[2];
      const k = age / P.vie; al[i] = (1 - k * k) * (0.75 + 0.25 * Math.sin(age * 70 + P.alea[3] * 20)); chaleur[i] = 1 - k; n++;
    }
    points.visible = n > 0;
    geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true; geo.attributes.chaleur.needsUpdate = true;
  }
  return { points, maj, nombre: N };
}

/* ═══════════════════════════════ TRAUMA CAMÉRA ═══════════════════════════════ */
/** impulsions : [{ t, a, d }] (a : amplitude 0..1,5 ; d : constante de décroissance en s). Renvoie trauma(t) → { k, x, y, roll }. */
export function creerTrauma(impulsions) {
  const liste = impulsions.filter((i) => Number.isFinite(i.t)).sort((p, q) => p.t - q.t);
  const bruit = (t, s) => (Math.sin(t * 61.3 + s) + 0.62 * Math.sin(t * 97.1 + 2.3 * s) + 0.38 * Math.sin(t * 143.7 + 4.1 * s)) / 2.0;
  return (t) => {
    let k = 0;
    for (const i of liste) { if (i.t > t) break; const a = t - i.t; if (a < 6 * (i.d || 0.22)) k += i.a * Math.exp(-a / (i.d || 0.22)) * smoother(a / 0.02); }
    k = Math.min(1.6, k);
    return { k, x: k * bruit(t, 1.7), y: k * bruit(t, 5.3), roll: k * bruit(t, 9.1) };
  };
}
/** Applique le trauma à une caméra { p, c, fov } : décalage proportionnel à la distance (angulaire), roulis ; jamais de flou. */
export function secouer(cam, tr, force = 1) {
  if (!tr || tr.k < 1e-4) return cam;
  const d = [cam.c[0] - cam.p[0], cam.c[1] - cam.p[1], cam.c[2] - cam.p[2]], n = Math.hypot(...d) || 1;
  const f = [d[0] / n, d[1] / n, d[2] / n], dr = [f[2], 0, -f[0]], nr = Math.hypot(dr[0], dr[2]) || 1;
  const r = [dr[0] / nr, 0, dr[2] / nr], amp = 0.011 * n * force;
  const off = [r[0] * tr.x * amp, tr.y * amp, r[2] * tr.x * amp];
  return { ...cam, p: cam.p.map((x, i) => x + off[i] * 0.35), c: cam.c.map((x, i) => x + off[i]), roll: (cam.roll || 0) + tr.roll * 0.012 * force };
}

/* ═══════════════════════════════ HUILE (A4 #08) ═══════════════════════════════ */
/** gouttes : [{ tb, p: [x,y,z], sol, r }] précalculées (pures). Gouttes en chute libre, puis flaques qui s'étalent et restent. */
export function creerHuile(THREE, gouttes, { envMap = null } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'huile';
  const n = gouttes.length;
  const matF = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.08, metalness: 0.35, envMap, envMapIntensity: 1.4, transparent: true, opacity: 0.93, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  const geoF = new THREE.CircleGeometry(1, 20); geoF.rotateX(-Math.PI / 2);
  const flaques = new THREE.InstancedMesh(geoF, matF, Math.max(1, n)); flaques.renderOrder = 2; flaques.frustumCulled = false;
  const geoG = new THREE.SphereGeometry(0.16, 10, 8); geoG.scale(1, 1.6, 1);
  const goutte = new THREE.InstancedMesh(geoG, new THREE.MeshStandardMaterial({ color: 0x120c06, roughness: 0.1, metalness: 0.4, envMap, envMapIntensity: 1.6 }), Math.max(1, n));
  goutte.frustumCulled = false;
  groupe.add(flaques, goutte);
  const o = new THREE.Object3D(), G_ = 981;
  function maj(t, { visible = true } = {}) {
    groupe.visible = visible; if (!visible) return;
    gouttes.forEach((q, i) => {
      const a = t - q.tb, h = Math.max(0.01, q.p[1] - q.sol), tc = Math.sqrt(2 * h / G_);
      // goutte : pend 0,12 s sous la caisse (elle grossit), puis tombe
      const pend = 0.12;
      if (a < 0 || a > pend + tc) { o.position.set(0, -500, 0); o.scale.setScalar(0.001); }
      else { const b = Math.max(0, a - pend); o.position.set(q.p[0], q.p[1] - 0.5 * G_ * b * b, q.p[2]); o.scale.setScalar(a < pend ? 0.4 + 0.6 * a / pend : 1); }
      o.updateMatrix(); goutte.setMatrixAt(i, o.matrix);
      const af = a - pend - tc;
      if (af < 0) { o.position.set(0, -500, 0); o.scale.setScalar(0.001); }
      else { const r = q.r * (0.25 + 0.75 * easeOut(af / 0.45)); o.position.set(q.p[0], q.sol + 0.02 + i * 0.0004, q.p[2]); o.scale.set(r, 1, r * 0.82); o.rotation.set(0, q.r * 7, 0); }
      o.updateMatrix(); flaques.setMatrixAt(i, o.matrix); o.rotation.set(0, 0, 0);
    });
    goutte.instanceMatrix.needsUpdate = true; flaques.instanceMatrix.needsUpdate = true;
  }
  return { groupe, maj };
}

/* ═══════════════════════════════ FLARE DES PHARES ═══════════════════════════════ */
export function creerFlares(THREE, env, phares, { ech = 1 } = {}) {
  const texEtoile = texCanvas(THREE, 256, 256, (g, w, h) => {
    const c = w / 2, d = g.createRadialGradient(c, c, 0, c, c, c); d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.1, 'rgba(255,250,235,.8)'); d.addColorStop(0.35, 'rgba(200,230,255,.15)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { g.save(); g.translate(c, c); g.rotate(i * Math.PI / 6); const l = g.createLinearGradient(-c, 0, c, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.55)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(-c, -1.2, w, 2.4); g.restore(); }
  }, { srgb: false });
  const texTrainee = texCanvas(THREE, 512, 32, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(120,190,255,0)'); l.addColorStop(0.5, 'rgba(200,235,255,1)'); l.addColorStop(1, 'rgba(120,190,255,0)'); g.fillStyle = l; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); }, { srgb: false });
  const sprites = [];
  for (const ph of phares) {
    const m = (map, col) => new THREE.SpriteMaterial({ map, color: new THREE.Color(col), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    const e = new THREE.Sprite(m(texEtoile, '#fff6e6')), tr = new THREE.Sprite(m(texTrainee, '#bfe2ff'));
    e.position.set(...ph); tr.position.set(ph[0], ph[1], ph[2] + 0.05); e.renderOrder = 4; tr.renderOrder = 4;
    env.add(e, tr); sprites.push({ e, tr });
  }
  function maj(t, force) {
    for (const [i, s] of sprites.entries()) {
      const f = clamp(force) * (0.9 + 0.1 * Math.sin(t * 23 + i * 2));
      s.e.visible = s.tr.visible = f > 0.01;
      s.e.material.opacity = f; s.e.scale.setScalar((5 + 2 * f) / ech); s.e.material.rotation = 0.2 * Math.sin(t * 0.7);
      s.tr.material.opacity = 0.7 * f; s.tr.scale.set(26 / ech, 1.4 / ech, 1);
    }
  }
  return { maj };
}

/* ═══════════════════════════════ BOULE À FACETTES DORÉE ═══════════════════════════════ */
export function creerBoule(THREE, { envMap = null, demiH = 540, yTapis = 22 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'boule-a-facettes';
  const pivot = new THREE.Group(); groupe.add(pivot);
  const geo = new THREE.IcosahedronGeometry(11, 3); geo.computeVertexNormals();          // déjà non indexée (r128)
  // facettes miroir : normales par face (flatShading) + légère variation de teinte par facette
  const nf = geo.attributes.position.count / 3, col = new Float32Array(nf * 9), a = prng('boule');
  for (let f = 0; f < nf; f++) { const k = 0.82 + 0.18 * a(); for (let v = 0; v < 3; v++) col.set([k, k * (0.92 + 0.08 * a()), k * 0.85], f * 9 + v * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const matBoule = new THREE.MeshStandardMaterial({ color: 0xffcf5a, metalness: 1, roughness: 0.12, flatShading: true, vertexColors: true, envMap, envMapIntensity: 2.2, emissive: new THREE.Color('#5a3600'), emissiveIntensity: 0.45 });
  const boule = new THREE.Mesh(geo, matBoule); pivot.add(boule);
  const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 6), new THREE.MeshStandardMaterial({ color: 0xd8d8e8, metalness: 0.9, roughness: 0.3 })); tige.geometry.translate(0, 0.5, 0); groupe.add(tige);
  const coiffe = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 2.4, 16), new THREE.MeshStandardMaterial({ color: 0xffd36a, metalness: 1, roughness: 0.2, envMap })); coiffe.position.y = 12; pivot.add(coiffe);
  // scintillements sur la boule
  const aura = haloSprite(THREE, '#ffd98a', 46, 0.35); groupe.add(aura);
  // taches de lumière réfléchies : sur le tapis (r < 118) et sur les gradins, elles tournent avec la boule
  const NT = 150, posT = new Float32Array(NT * 3), base = [];
  for (let i = 0; i < NT; i++) {
    const surTapis = i < 90, r = surTapis ? 22 + 96 * Math.sqrt(a()) : 360 + 200 * a(), ang = a() * Math.PI * 2;
    base.push({ r, ang, y: surTapis ? yTapis + 0.06 : 18 + (r - 345) * 0.62, ph: a() * 6.28, surTapis });
  }
  const geoT = new THREE.BufferGeometry(); geoT.setAttribute('position', new THREE.BufferAttribute(posT, 3));
  const alT = new Float32Array(NT); geoT.setAttribute('alpha', new THREE.BufferAttribute(alT, 1));
  const matT = new THREE.ShaderMaterial({
    uniforms: { demiH: { value: demiH } },
    vertexShader: `attribute float alpha; uniform float demiH; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float z = max(-mv.z, 1.0);
        gl_PointSize = clamp(2.2 * projectionMatrix[1][1] * demiH / z, 1.0, 16.0); vA = alpha; }`,
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float g = smoothstep(0.25, 0.0, dot(d, d)); gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * 1.6 * g * vA, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const taches = new THREE.Points(geoT, matT); taches.frustumCulled = false; groupe.add(taches);
  /** y : centre de la boule ; yAccroche : bas de l'écran géant ; force 0..1 */
  function maj(t, { y = 145, yAccroche = 175, force = 1, visible = true } = {}) {
    groupe.visible = visible && force > 0.01; if (!groupe.visible) return;
    pivot.position.set(0, y, 0); pivot.rotation.y = 0.55 * t;
    tige.position.set(0, y + 12, 0); tige.scale.set(1, Math.max(0.1, yAccroche - y - 12), 1);
    aura.position.set(0, y, 0); aura.material.opacity = (0.3 + 0.08 * Math.sin(t * 9)) * force;
    base.forEach((b, i) => {
      const ang = b.ang + 0.55 * t;
      posT.set([Math.cos(ang) * b.r, b.y, Math.sin(ang) * b.r], i * 3);
      alT[i] = force * (b.surTapis ? 0.55 : 0.8) * (0.6 + 0.4 * Math.sin(t * 5 + b.ph));
    });
    geoT.attributes.position.needsUpdate = true; geoT.attributes.alpha.needsUpdate = true;
  }
  return { groupe, maj };
}

/* ═══════════════════════════════ PORTAIL EXPRESS ═══════════════════════════════ */
export function creerPortail(THREE, { yTapis = 22, rayon = 30 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'portail-express';
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 10, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#2de2ff').multiplyScalar(2.6), toneMapped: false }));
  anneau.rotation.x = -Math.PI / 2; groupe.add(anneau);
  const anneau2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3fa4').multiplyScalar(2.6), toneMapped: false }));
  anneau2.rotation.x = -Math.PI / 2; groupe.add(anneau2);
  const matD = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vP; uniform float t, force;
      void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
        float s = sin(a * 6.0 + r * 14.0 - t * 9.0) * 0.5 + 0.5; float s2 = sin(a * 3.0 - r * 9.0 + t * 6.0) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.18, 0.89, 1.0), vec3(1.0, 0.25, 0.64), s) * (0.45 + 0.7 * s2) + vec3(0.7, 0.9, 1.0) * smoothstep(0.3, 0.0, r) * 0.5;
        float bord = smoothstep(1.0, 0.85, r);
        gl_FragColor = vec4(c * force * bord * 0.4, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const disque = new THREE.Mesh(new THREE.CircleGeometry(1, 6), matD); disque.rotation.x = -Math.PI / 2; disque.rotation.z = Math.PI / 6 * 0; groupe.add(disque);
  const lueur = haloSprite(THREE, '#9ef4ff', 2.6, 0); groupe.add(lueur);
  groupe.position.y = yTapis + 0.6;
  function maj(t, ouverture) {
    const o = clamp(ouverture);
    groupe.visible = o > 0.001; if (!groupe.visible) return;
    const R = rayon * easeOut(o) * (1 + 0.03 * Math.sin(t * 11));
    groupe.scale.setScalar(Math.max(0.01, R));
    anneau.rotation.z = t * 1.4; anneau2.rotation.z = -t * 1.1; disque.rotation.z = t * 0.6;
    matD.uniforms.t.value = t; matD.uniforms.force.value = o;
    lueur.material.opacity = 0.18 * o; lueur.position.y = 0.4;
  }
  return { groupe, maj };
}

/* ═══════════════════════════════ VORTEX NÉON (arrivée) ═══════════════════════════════ */
export function creerVortex(THREE, { yBouche = 700, longueur = 900, rayon = 62 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'vortex-neon';
  const PAL = ['#2de2ff', '#ff3fa4', '#ffc83d', '#8a4dff'];
  const geoA = new THREE.TorusGeometry(rayon, 2.2, 8, 48);
  const anneaux = [];
  for (let i = 0; i * 30 < longueur; i++) {
    const m = new THREE.Mesh(geoA, new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL[i % 4]).multiplyScalar(2.4), toneMapped: false, fog: false }));
    m.rotation.x = Math.PI / 2; m.position.y = yBouche + 12 + i * 30; groupe.add(m); anneaux.push(m);
  }
  const matP = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, force: { value: 1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vU; uniform float t, force;
      void main(){ float sp = fract(vU.x * 4.0 + vU.y * 9.0 - t * 2.2); float b = smoothstep(0.0, 0.08, sp) * smoothstep(0.5, 0.42, sp);
        vec3 c0 = vec3(0.18, 0.89, 1.0), c1 = vec3(1.0, 0.25, 0.64), c2 = vec3(1.0, 0.78, 0.24), c3 = vec3(0.54, 0.3, 1.0);
        float k = fract(vU.x * 2.0 + vU.y * 3.0 - t * 0.7) * 4.0; vec3 c = k < 1.0 ? mix(c0, c1, k) : (k < 2.0 ? mix(c1, c2, k - 1.0) : (k < 3.0 ? mix(c2, c3, k - 2.0) : mix(c3, c0, k - 3.0)));
        gl_FragColor = vec4(c * (0.25 + 1.4 * b) * force, 1.0); }`,
    side: THREE.BackSide, fog: false,
  });
  const paroi = new THREE.Mesh(new THREE.CylinderGeometry(rayon + 3, rayon + 3, longueur, 48, 1, true), matP);
  paroi.position.y = yBouche + longueur / 2; groupe.add(paroi);
  function maj(t, force) {
    groupe.visible = force > 0.01; if (!groupe.visible) return;
    matP.uniforms.t.value = t; matP.uniforms.force.value = force;
    anneaux.forEach((m, i) => { m.scale.setScalar(1 + 0.04 * Math.sin(t * 8 + i)); m.rotation.z = t * (i % 2 ? 0.6 : -0.6); });
  }
  return { groupe, maj };
}

/* ═══════════════════════════════ BANDEAU COMPACT (smash cuts) ═══════════════════════════════ */
/** f = { numero, nom, fonce, vif } ; tau : temps depuis l'apparition ; un seul élément d'UI : badge + plaque (2 textes). */
export function bandeauCompact(g, W, H, f, tau, sortie = 0) {
  if (tau < 0) return;
  const s = W / 1920, u = easeOut(tau / 0.22), al = clamp(tau / 0.08) * (1 - clamp(sortie));
  if (al <= 0.002) return;
  g.save(); g.scale(s, s); g.globalAlpha = al; g.translate(-120 * (1 - u), 0);
  const x = 70, y = 930, h = 78;
  g.textBaseline = 'middle'; g.textAlign = 'left';
  let taille = 54; for (; taille > 30; taille -= 2) { g.font = `700 ${taille}px "Fredoka", "Nunito", system-ui, sans-serif`; if (g.measureText(f.nom).width <= 560) break; }
  const ln = g.measureText(f.nom).width;
  // badge
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 16; g.shadowOffsetY = 4;
  g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 136, y); g.lineTo(x + 120, y + h); g.lineTo(x, y + h); g.closePath(); g.fillStyle = f.fonce; g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke();
  const fNom = g.font; g.font = '700 54px "Fredoka", "Nunito", system-ui, sans-serif';
  g.fillStyle = '#ffffff'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.85)';
  g.strokeText(f.numero, x + 24, y + h / 2 + 2); g.fillText(f.numero, x + 24, y + h / 2 + 2); g.font = fNom;
  // plaque du nom
  const xn = x + 128, wn = ln + 70;
  g.beginPath(); g.moveTo(xn + 16, y + 6); g.lineTo(xn + wn + 16, y + 6); g.lineTo(xn + wn, y + h - 6); g.lineTo(xn, y + h - 6); g.closePath();
  g.fillStyle = 'rgba(10,8,22,.92)'; g.fill();
  g.fillStyle = f.vif; g.fillRect(xn, y + h - 12, wn, 6);
  g.save(); g.beginPath(); g.rect(xn + 20, y, wn - 30, h); g.clip();
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.9)'; g.strokeText(f.nom, xn + 34, y + h / 2 + 1); g.fillStyle = '#ffffff'; g.fillText(f.nom, xn + 34, y + h / 2 + 1);
  g.restore(); g.restore();
}
