/* MONDES NATIFS, PORTAILS DIMENSIONNELS (Rift Gate) ET RING COMMUN — Trailer V7 « Multivers → Ring ».

   Pour chacune des 15 écuries :
     1. un MONDE NATIF : décor 3D réel de shared/decors3d.js (archétype) ou décor unique de shared/decors_v5.js, étalonné par l'ambiance
        V6 du bolide-ailier (shared/ambiances_v6.js), enrichi ici d'effets propres à l'écurie (FX) — le couple Concept-Car + bolide m3d
        y fonce sur une trajectoire Catmull-Rom (physique_cgi.js) vers le Portail ;
     2. un PORTAIL (arche 3D + tunnel vortex + iris GLSL) à la sortie du monde ET une porte jumelle sur le pourtour du Ring ;
     3. le RING COMMUN : sol miroir d'obsidienne humide, anneau arc-en-ciel, projecteurs, ciel étoilé, emplacements en arc de cercle.

   Tout est fonction pure du temps. Le scénario d'une écurie (scenarioEcurie) ne dépend que de son créneau [debut, impact, fin]. */
import { splineCR, profilVitesse, creerCascadeur, graineur, hashTexte, clamp, lerp, smoother, DEG } from './physique_cgi.js';

export const CX = 6;                                  // centre des décors de shared/ (là où s'arrête le bolide)
export const RING = { R: 100, RS: 50, RG: 92, ECART: 0.55 };

/** Les 15 mondes : archétype / décor unique pris sur le bolide-ailier (m3d), effets propres à l'écurie. */
export const MONDES = [
  { id: 1,  ailier: 'U03',  fx: ['poteaux', 'braises'],            accent: '#84cc16', acc2: '#ffb347', nom: 'Route 66', ciel: '#180b05' },
  { id: 2,  ailier: 'N02',  fx: ['bonbons'],                       accent: '#ff7ad9', acc2: '#7ff0ff', nom: 'Vallée sucrée', ciel: '#1a0826' },
  { id: 3,  ailier: 'E02',  fx: ['strobo', 'arcs'],                accent: '#ffe23d', acc2: '#7fd3ff', nom: 'Stroboscope', ciel: '#050712' },
  { id: 4,  ailier: 'B12',  fx: ['cartes'],                        accent: '#b06bff', acc2: '#f97316', nom: 'Tapis de cartes', ciel: '#120624' },
  { id: 5,  ailier: 'TK05', fx: ['chateau'],                       accent: '#ff4a3a', acc2: '#ffffff', nom: 'Saut du château', ciel: '#0b071e', surfaces: 0.05, saut: 16 },
  { id: 6,  ailier: 'FR01', fx: ['portees'],                       accent: '#facc15', acc2: '#ffffff', nom: 'Scène symphonique', ciel: '#080b1f', surfaces: 0.05 },
  { id: 7,  ailier: 'E06',  fx: ['triforce'],                      accent: '#ffd23d', acc2: '#9dff8a', nom: 'Forêt ancienne', ciel: '#05160e' },
  { id: 8,  ailier: 'J09',  fx: ['bandes_pluie'],                  accent: '#ea580c', acc2: '#8ab4ff', nom: 'Autoroute sous la pluie', ciel: '#060d1a' },
  { id: 9,  ailier: 'N11',  fx: ['comete', 'etoiles'],             accent: '#a855f7', acc2: '#ff4a6a', nom: 'Piqué stratosphérique', ciel: '#090418', saut: 10 },
  { id: 10, ailier: 'H04',  fx: ['monolithes'],                    accent: '#dc2626', acc2: '#ffb347', nom: 'Éclipse rouge', ciel: '#120204' },
  { id: 11, ailier: 'P01',  fx: ['etoiles', 'lumas'],              accent: '#f472b6', acc2: '#7ff0ff', nom: 'Observatoire stellaire', ciel: '#030614' },
  { id: 12, ailier: 'E07',  fx: ['pyramides', 'kanji', 'emeraudes'], accent: '#8b5cf6', acc2: '#34d399', nom: 'Caire crépusculaire', ciel: '#180a24' },
  { id: 13, ailier: 'J02',  fx: ['neon_bords'],                    accent: '#06b6d4', acc2: '#ff4fd8', nom: 'Col de montagne', ciel: '#050b1c', derive: true },
  { id: 14, ailier: 'J10',  fx: ['encre'],                         accent: '#e11d48', acc2: '#ffffff', nom: 'Grille néon', ciel: '#080414' },
  { id: 15, ailier: 'H11',  fx: ['petales'],                       accent: '#f97316', acc2: '#fde047', nom: 'Jardin impérial', ciel: '#1a0916' },
];

/* ───────────────────────── outils ───────────────────────── */
const polaire = (r, th) => [r * Math.cos(th), r * Math.sin(th)];
/** Angle (rad) de l'écurie k (0–14) sur le Ring ; la brèche de la rampe arc-en-ciel est centrée sur θ = π (−x). */
export const angleEcurie = (k) => Math.PI + RING.ECART + ((k + 0.5) * (2 * Math.PI - 2 * RING.ECART)) / 15;
export const ANGLE_BRECHE = Math.PI;

function toile(w, h, dessin) { const c = document.createElement('canvas'); c.width = w; c.height = h; dessin(c.getContext('2d'), w, h); return c; }
const col = (THREE, c) => new THREE.Color(c);

/* ═════════════════════════ PORTAIL DIMENSIONNEL (Rift Gate) ═════════════════════════
   Plan XY, face +z (côté d'où arrive le bolide) ; tunnel vortex vers −z. maj(t, ouverture 0–1, crepite 0–1). */
export function creerPortail(THREE, accent, acc2, { rayon = 12, graine = 1 } = {}) {
  const groupe = new THREE.Group(), jet = [];
  const garde = (x) => { jet.push(x); return x; };
  const cA = col(THREE, accent), cB = col(THREE, acc2);
  const u = { uT: { value: 0 }, uOuv: { value: 0 }, uCol: { value: cA }, uCol2: { value: cB }, uCrep: { value: 0 } };
  // iris : disque de vortex en GLSL (spirale, plasma, bord incandescent)
  const iris = new THREE.Mesh(garde(new THREE.CircleGeometry(rayon, 72)), garde(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uOuv, uCrep; uniform vec3 uCol, uCol2; varying vec2 vP; uniform float uR;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 p = vP / ${rayon.toFixed(1)}; float r = length(p), a = atan(p.y, p.x);
        float ouv = uOuv * 1.04; if (r > ouv) discard;
        float tw = a * 3.0 + r * 11.0 - uT * 6.0 + sin(r * 7.0 - uT * 3.0) * 1.5;
        float sw = 0.5 + 0.5 * sin(tw), sw2 = 0.5 + 0.5 * sin(a * 7.0 - r * 18.0 + uT * 9.0);
        vec3 c = mix(uCol2, uCol, sw) * (0.55 + 1.6 * pow(1.0 - r / max(ouv, 0.01), 2.0)) + vec3(1.0) * pow(max(0.0, 1.0 - r * 1.5), 3.0) * 1.4;
        c += uCol * sw2 * 0.35;
        float bord = smoothstep(ouv - 0.14, ouv, r); c = mix(c, vec3(1.0, 0.92, 0.75) * 2.2, bord * 0.8);
        float cr = uCrep * step(0.55, h(vec2(floor(a * 9.0), floor(uT * 14.0)))); c += cr * 1.6 * uCol2;
        gl_FragColor = vec4(c, 0.95); }` })));
  groupe.add(iris);
  // arche : tore incandescent + double anneau contrarotatif + éclats
  const tore = (r, t, c, k) => { const m = new THREE.Mesh(garde(new THREE.TorusGeometry(r, t, 16, 96)), garde(new THREE.MeshBasicMaterial({ color: col(THREE, c).multiplyScalar(k), toneMapped: false }))); groupe.add(m); return m; };
  const arche = tore(rayon + 0.4, 0.85, accent, 2.4), baseArche = arche.material.color.clone(), a2 = tore(rayon + 2.4, 0.22, acc2, 2.2), a3 = tore(rayon - 1.6, 0.14, '#ffffff', 1.8);
  const rnd = graineur(graine * 977 + 5), N = 26, eclats = new THREE.InstancedMesh(garde(new THREE.BoxGeometry(0.5, 2.6, 0.5)), garde(new THREE.MeshBasicMaterial({ color: col(THREE, acc2).multiplyScalar(2.2), toneMapped: false })), N);
  const ph = Array.from({ length: N }, () => rnd() * 6.283); groupe.add(eclats);
  // tunnel vortex : cylindre ouvert, bandes qui défilent, se resserre vers −z
  const ut = { uT: u.uT, uOuv: u.uOuv, uCol: u.uCol, uCol2: u.uCol2 };
  const tunnel = new THREE.Mesh(garde(new THREE.CylinderGeometry(rayon * 0.96, rayon * 0.18, rayon * 3.2, 48, 1, true)), garde(new THREE.ShaderMaterial({ uniforms: ut, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uT, uOuv; uniform vec3 uCol, uCol2; varying vec2 vUv; void main(){ float s = 0.5 + 0.5 * sin(vUv.x * 62.83 + vUv.y * 14.0 - uT * 7.0); float b = smoothstep(0.35, 0.0, abs(fract(vUv.y * 6.0 - uT * 1.8) - 0.5) - 0.12); vec3 c = mix(uCol2, uCol, s) * (0.35 + 1.4 * (1.0 - vUv.y)); gl_FragColor = vec4(c * (0.5 + b), uOuv * (0.18 + 0.5 * (1.0 - vUv.y)) * (0.5 + 0.5 * s)); }' })));
  tunnel.rotation.x = Math.PI / 2; tunnel.position.z = -rayon * 1.6; groupe.add(tunnel);
  const lum = new THREE.PointLight(accent, 0, rayon * 8, 1.6); lum.position.z = 3; groupe.add(lum);
  const o = new THREE.Object3D();
  return {
    groupe, rayon, lum, u,
    maj(t, ouverture = 1, crepite = 0, veille = 0) {
      const ouv = clamp(ouverture); u.uT.value = t; u.uOuv.value = ouv; u.uCrep.value = crepite;
      const vis = ouv > 0.002 || veille > 0.01;
      groupe.visible = vis;
      const k = Math.max(ouv, veille * 0.45);
      arche.scale.setScalar(0.9 + 0.1 * k); arche.visible = k > 0.01; arche.material.color.copy(baseArche).multiplyScalar(0.3 + 0.7 * ouv); a2.rotation.z = t * 0.7; a3.rotation.z = -t * 1.1;
      a2.visible = a3.visible = ouv > 0.02;
      for (let i = 0; i < N; i++) { const a = i / N * 6.2832 + t * 0.4, rr = rayon + 0.4; o.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0); o.rotation.set(0, 0, a - Math.PI / 2); const s = ouv * (0.6 + 0.4 * Math.sin(t * 9 + ph[i])); o.scale.set(1, Math.max(0.001, s), 1); o.updateMatrix(); eclats.setMatrixAt(i, o.matrix); }
      eclats.instanceMatrix.needsUpdate = true;
      iris.visible = ouv > 0.002; tunnel.visible = ouv > 0.02; lum.intensity = 4.5 * ouv + (crepite > 0 ? 2.5 * crepite : 0);
      if (veille > 0 && ouv <= 0.002) { arche.visible = true; arche.scale.setScalar(0.9); }
    },
    dispose() { for (const x of jet) { try { x.dispose(); } catch (e) { /* rien */ } } },
  };
}

/* ═════════════════════════ EFFETS PROPRES AUX MONDES (FX) ═════════════════════════ */
function champInst(THREE, { geo, mat, n, graine, centre, taille, mouvement }) {
  const rnd = graineur(graine), m = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D(), c = new THREE.Color();
  const P = Array.from({ length: n }, () => ({ a: rnd(), b: rnd(), c: rnd(), d: rnd() }));
  const pal = mat.userData && mat.userData.palette;
  if (pal) P.forEach((p, i) => m.setColorAt(i, c.set(pal[Math.floor(p.d * pal.length) % pal.length])));
  m.frustumCulled = false;
  return { objet: m, maj(t) { for (let i = 0; i < n; i++) { mouvement(P[i], t, o, centre, taille, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); } m.instanceMatrix.needsUpdate = true; } };
}
const mat = (THREE, c, k = 1, o = {}) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false, ...o }); return m; };

const FX = {
  /** poteaux télégraphiques et clôtures le long de la route 66 + lisérés */
  poteaux(THREE, ctx) {
    const g = new THREE.Group(), bois = new THREE.MeshLambertMaterial({ color: 0x5a3b22 });
    const mat1 = new THREE.BoxGeometry(0.7, 22, 0.7), mat2 = new THREE.BoxGeometry(0.4, 0.5, 7);
    for (let s = 0; s < ctx.longueur; s += 26) {
      const p = ctx.spline.point(s), T = ctx.spline.tangente(s), nx = -T[2], nz = T[0];
      for (const cote of [1]) { const bx = p[0] + nx * 17 * cote, bz = p[2] + nz * 17 * cote; const a = new THREE.Mesh(mat1, bois); a.position.set(bx, 11, bz); const b = new THREE.Mesh(mat2, bois); b.position.set(bx, 20, bz); b.rotation.y = Math.atan2(T[0], T[2]); g.add(a, b); }
    }
    return { groupe: g, maj() { } };
  },
  /** braises qui montent (étincelles de la route) */
  braises(THREE, ctx) {
    const f = champInst(THREE, { geo: new THREE.BoxGeometry(0.22, 0.22, 0.22), mat: mat(THREE, '#ff9a3a', 2.4), n: 160, graine: 11, centre: [CX, 0, 0], taille: [120, 24, 26],
      mouvement: (p, t, o, c, s) => { o.position.set(c[0] + (p.a - 0.5) * s[0] + Math.sin(t * 2 + p.b * 9) * 1.2, ((p.b * s[1] + t * (4 + 5 * p.c)) % s[1]), c[2] + (p.c - 0.5) * s[2]); o.rotation.set(t * 3 * p.a, t * 2, 0); o.scale.setScalar(0.5 + p.d); } });
    return { groupe: (() => { const g = new THREE.Group(); g.add(f.objet); return g; })(), maj: f.maj };
  },
  /** pluie de bonbons multicolores */
  bonbons(THREE, ctx) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }); m.userData = { palette: ['#ff4fa8', '#ffe23d', '#4fe0ff', '#9dff8a', '#ff8a2a', '#b06bff'] };
    const f = champInst(THREE, { geo: new THREE.SphereGeometry(0.55, 10, 8), mat: m, n: 260, graine: 21, centre: [CX, 0, 0], taille: [130, 40, 34],
      mouvement: (p, t, o, c, s) => { o.position.set(c[0] + (p.a - 0.5) * s[0], s[1] - ((p.b * s[1] + t * (14 + 14 * p.c)) % s[1]), c[2] + (p.c - 0.5) * s[2] - 4); const k = 0.7 + p.d * 1.1; o.scale.set(k, k * 0.7, k); o.rotation.set(t * 2 * p.a, 0, t * 3 * p.b); } });
    return { groupe: (() => { const g = new THREE.Group(); g.add(f.objet); return g; })(), maj: f.maj };
  },
  /** stroboscope : barres lumineuses + pulsations (lampe pilotée par maj) */
  strobo(THREE, ctx) {
    const g = new THREE.Group(), barres = [];
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(70, 0.5, 0.5), mat(THREE, '#ffffff', 3)); b.position.set(CX + (i - 2.5) * 6, 8 + i * 4.5, -22); g.add(b); barres.push(b); }
    const l = new THREE.PointLight(0xffffff, 0, 160, 1.2); l.position.set(CX, 16, 8); g.add(l);
    return { groupe: g, maj(t) { const s = Math.floor(t * 12) % 2; l.intensity = s ? 6 : 0.4; l.color.set(s ? '#ffffff' : '#7fd3ff'); barres.forEach((b, i) => { b.visible = (Math.floor(t * 12 + i) % 2) === 0; }); } };
  },
  /** arcs électriques en zigzag, reprofilés 15 fois par seconde (graine = indice de trame) */
  arcs(THREE, ctx) {
    const g = new THREE.Group(), N = 7, SEG = 14, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * SEG * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ligne = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color('#9fe8ff').multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); ligne.frustumCulled = false; g.add(ligne);
    return { groupe: g, maj(t) {
      const r = graineur(Math.floor(t * 15) * 7331 + 17);
      for (let a = 0; a < N; a++) {
        const x0 = CX + (r() - 0.5) * 100, x1 = x0 + (r() - 0.5) * 30, z = -10 - r() * 14; let px = x0, py = 0.5, pz = z;
        for (let s = 0; s < SEG; s++) { const k = (s + 1) / SEG, nx = lerp(x0, x1, k) + (r() - 0.5) * 3.2, ny = k * (26 + r() * 6) + (r() - 0.5) * 2, nz = z + (r() - 0.5) * 2.4, i = (a * SEG + s) * 6; pos.set([px, py, pz, nx, ny, nz], i); px = nx; py = ny; pz = nz; }
      }
      geo.attributes.position.needsUpdate = true; ligne.visible = (Math.floor(t * 15) % 4) !== 3;
    } };
  },
  /** tapis de cartes en lévitation, tourbillonnant au-dessus de la route */
  cartes(THREE, ctx) {
    const cv = toile(128, 192, (g, w, h) => { g.fillStyle = '#f7f1e3'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7a1fa2'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#7a1fa2'; g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w - 36, h / 2); g.lineTo(w / 2, h - 30); g.lineTo(36, h / 2); g.closePath(); g.fill(); g.fillStyle = '#39d98a'; g.font = '900 38px sans-serif'; g.textAlign = 'center'; g.fillText('J', w / 2, h / 2 + 13); });
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
    const m = new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, toneMapped: false });
    const f = champInst(THREE, { geo: new THREE.PlaneGeometry(2.6, 3.9), mat: m, n: 120, graine: 41, centre: [CX, 0, 2], taille: [110, 18, 20],
      mouvement: (p, t, o, c, s) => { const a = p.a * 6.283 + t * (0.4 + p.b * 0.5); o.position.set(c[0] + (p.c - 0.5) * s[0], 4 + p.b * s[1] + Math.sin(t * 1.3 + p.a * 9) * 1.4, c[2] + Math.sin(a) * 9 - 3); o.rotation.set(t * 1.7 * p.d + p.a * 3, a, t * 1.1 * p.b); o.scale.setScalar(0.8 + p.d * 0.5); } });
    return { groupe: (() => { const g = new THREE.Group(); g.add(f.objet); return g; })(), maj: f.maj };
  },
  /** silhouette de château au loin (tours, créneaux, drapeau) */
  chateau(THREE, ctx) {
    const g = new THREE.Group(), pierre = new THREE.MeshBasicMaterial({ color: 0x2a2f55 }), toit = new THREE.MeshBasicMaterial({ color: 0xd23a3a }), cx = CX + ctx.dir * 30, cz = -46;
    const bloc = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(cx + x, y + h / 2, cz + z); g.add(b); return b; };
    bloc(34, 22, 12, 0, 0, 0, pierre);
    for (const x of [-20, 20, -8, 8]) { bloc(8, 38 + Math.abs(x), 8, x, 0, 0, pierre); const c = new THREE.Mesh(new THREE.ConeGeometry(6.4, 12, 8), toit); c.position.set(cx + x, 38 + Math.abs(x) + 6, cz); g.add(c); }
    for (let i = -7; i <= 7; i++) bloc(1.6, 2.4, 1.6, i * 2.2, 22, 6, pierre);
    return { groupe: g, maj() { } };
  },
  /** portées musicales lumineuses (5 lignes ondulantes) et notes */
  portees(THREE, ctx) {
    const g = new THREE.Group(), N = 5, SEG = 90, lignes = [];
    for (let i = 0; i < N; i++) {
      const geo = new THREE.BufferGeometry(), p = new Float32Array(SEG * 3); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(i % 2 ? '#ffe9a0' : '#facc15').multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; g.add(l); lignes.push({ l, p, geo });
    }
    return { groupe: g, maj(t) { lignes.forEach((o, i) => { for (let k = 0; k < SEG; k++) { const x = CX - 70 + k * (140 / (SEG - 1)); o.p.set([x, 5 + i * 1.5 + Math.sin(x * 0.09 + t * 2.2 + i * 0.5) * 3.2, -6 - i * 0.2 + Math.cos(x * 0.05 - t) * 2], k * 3); } o.geo.attributes.position.needsUpdate = true; }); } };
  },
  /** trois triangles d'or (Triforce) + rais de lumière sacrée */
  triforce(THREE, ctx) {
    const g = new THREE.Group(), g2 = g, base = { position: new THREE.Vector3(CX + ctx.dir * 36, 22, -30) };
    const pivot = new THREE.Group(); pivot.position.copy(base.position); g.add(pivot);
    const mk = (x, y) => { const s = new THREE.Shape(); s.moveTo(-5, 0); s.lineTo(5, 0); s.lineTo(0, 8.66); s.closePath(); const h = new THREE.Path(); h.moveTo(-2.5, 1.6); h.lineTo(2.5, 1.6); h.lineTo(0, 5.9); h.closePath(); s.holes.push(h); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }), mat(THREE, '#ffd23d', 2.3)); m.position.set(x, y, 0); pivot.add(m); };
    mk(-5.2, -4.5); mk(5.2, -4.5); mk(0, 4.2);
    const rais = new THREE.Mesh(new THREE.CylinderGeometry(3, 16, 90, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2a8').multiplyScalar(1.6), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    rais.position.set(CX + ctx.dir * 36, 44, -30); g.add(rais);
    return { groupe: g2, maj(t) { pivot.rotation.y = t * 0.7; pivot.position.y = 22 + Math.sin(t * 1.4) * 1.5; } };
  },
  /** bandes lumineuses au bord de l'autoroute (reflets sur l'asphalte détrempé) */
  bandes_pluie(THREE, ctx) { return FX.neon_bords(THREE, { ...ctx, couleurs: ['#ff7a2a', '#8ab4ff'] }); },
  /** comète pourpre qui plonge du ciel */
  comete(THREE, ctx) {
    const g = new THREE.Group(), tete = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), mat(THREE, '#e9c8ff', 3)), queue = new THREE.Mesh(new THREE.ConeGeometry(3.4, 70, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#a855f7').multiplyScalar(2), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    queue.geometry.translate(0, 35, 0); g.add(tete, queue);
    return { groupe: g, maj(t) { const k = ((t * 0.18) % 1); g.position.set(CX - ctx.dir * 90 + ctx.dir * k * 190, 120 - k * 100, -70); const d = new THREE.Vector3(ctx.dir * 190, -100, 0).normalize(); queue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate()); } };
  },
  /** champ d'étoiles */
  etoiles(THREE, ctx) {
    const rnd = graineur(77), n = 700, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, e = 0.08 + rnd() * 1.2, r = 280; p.set([CX + Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r * 0.9 - 40], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false, toneMapped: false }));
    const g = new THREE.Group(); g.add(pts); return { groupe: g, maj() { } };
  },
  /** « Lumas » : petites étoiles-lumières qui flottent */
  lumas(THREE, ctx) {
    const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 - Math.PI / 2, r = i % 2 ? 0.55 : 1.3; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath();
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide }); m.userData = { palette: ['#ffe9a0', '#9fe8ff', '#ffb0e0', '#c9ffb0'] };
    const f = champInst(THREE, { geo: new THREE.ShapeGeometry(sh), mat: m, n: 70, graine: 55, centre: [CX, 0, 0], taille: [120, 26, 30],
      mouvement: (p, t, o, c, s) => { o.position.set(c[0] + (p.a - 0.5) * s[0] + Math.sin(t + p.b * 9) * 3, 4 + p.b * s[1] + Math.sin(t * 1.6 + p.c * 9) * 2, c[2] + (p.c - 0.5) * s[2] - 6); o.rotation.set(0, t * 1.5 * (p.d - 0.5), t * 0.8 * p.a); o.scale.setScalar(1.2 + 1.5 * p.d); } });
    return { groupe: (() => { const g = new THREE.Group(); g.add(f.objet); return g; })(), maj: f.maj };
  },
  /** monolithes noirs aux arêtes rouge sang + éclipse (disque noir couronné) */
  monolithes(THREE, ctx) {
    const g = new THREE.Group(), noir = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const arete = new THREE.LineBasicMaterial({ color: new THREE.Color('#ff2a2a').multiplyScalar(2.2), toneMapped: false });
    const rnd = graineur(101);
    for (let i = 0; i < 9; i++) { const x = CX + (i - 4) * 14 + (rnd() - 0.5) * 5, z = -24 - rnd() * 18, h = 16 + rnd() * 22; const b = new THREE.Mesh(new THREE.BoxGeometry(5, h, 1.6), noir); b.position.set(x, h / 2, z); b.rotation.y = (rnd() - 0.5) * 0.4; const e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), arete); b.add(e); g.add(b); }
    const disque = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })), couronne = new THREE.Mesh(new THREE.RingGeometry(16, 24, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a1a').multiplyScalar(2), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    disque.position.set(CX + ctx.dir * 24, 62, -110); couronne.position.copy(disque.position); couronne.position.z += 0.1; g.add(disque, couronne);
    return { groupe: g, maj(t) { couronne.scale.setScalar(1 + 0.05 * Math.sin(t * 3)); } };
  },
  /** pyramides au crépuscule */
  pyramides(THREE, ctx) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x3a2a4a });
    [[-40, 28, 36], [-4, 40, 52], [36, 22, 30]].forEach(([x, h, w], i) => { const p = new THREE.Mesh(new THREE.ConeGeometry(w, h, 4), m); p.position.set(CX + x * ctx.dir, h / 2, -80 - i * 6); p.rotation.y = Math.PI / 4; g.add(p); });
    return { groupe: g, maj() { } };
  },
  /** kanji ゴゴゴ en grand, qui tremble dans le ciel */
  kanji(THREE, ctx) {
    const cv = toile(512, 256, (g, w, h) => { g.font = '900 150px "Yu Gothic","Meiryo","Noto Sans CJK JP",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = '#2a0a4a'; g.lineWidth = 16; g.strokeText('ゴゴゴ', w / 2, h / 2); g.fillStyle = '#ffc2f0'; g.fillText('ゴゴゴ', w / 2, h / 2); });
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
    s.position.set(CX + ctx.dir * 10, 34, -44); const g = new THREE.Group(); g.add(s);
    return { groupe: g, maj(t) { s.position.x = CX + ctx.dir * 10 + Math.sin(t * 38) * 0.18; s.position.y = 34 + Math.sin(t * 31) * 0.14; } };
  },
  /** émeraudes en lévitation */
  emeraudes(THREE, ctx) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#34d399').multiplyScalar(1.8), toneMapped: false });
    const f = champInst(THREE, { geo: new THREE.OctahedronGeometry(0.9), mat: m, n: 50, graine: 67, centre: [CX, 0, 0], taille: [120, 18, 22],
      mouvement: (p, t, o, c, s) => { o.position.set(c[0] + (p.a - 0.5) * s[0], 2 + p.b * s[1] + Math.sin(t * 1.5 + p.c * 9) * 1.2, c[2] + (p.c - 0.5) * s[2] - 4); o.rotation.set(t * p.a, t * 1.3 * p.b, 0); o.scale.set(0.8, 1.5, 0.8); } });
    return { groupe: (() => { const g = new THREE.Group(); g.add(f.objet); return g; })(), maj: f.maj };
  },
  /** tubes néon de chaque côté de la route (parallaxe de vitesse) */
  neon_bords(THREE, ctx) {
    const g = new THREE.Group(), cs = ctx.couleurs || [ctx.accent, ctx.acc2];
    for (let k = 0; k < 2; k++) {
      const pts = []; for (let s = 0; s <= ctx.longueur; s += 6) { const p = ctx.spline.point(s), T = ctx.spline.tangente(s); const sg = k ? 1 : -1; pts.push(new THREE.Vector3(p[0] - T[2] * 6.5 * sg, 0.5, p[2] + T[0] * 6.5 * sg)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.28, 6, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(cs[k]).multiplyScalar(2.6), toneMapped: false })); g.add(tube);
    }
    return { groupe: g, maj() { } };
  },
  /** explosions d'encre à 360° : taches noires qui s'épanouissent autour de la route */
  encre(THREE, ctx) {
    const cv = toile(256, 256, (g, w, h) => { const r = graineur(5); g.fillStyle = '#05050a'; g.translate(w / 2, h / 2); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, l = 60 + r() * 60; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.13) * l * 0.7, Math.sin(a - 0.13) * l * 0.7); g.lineTo(Math.cos(a) * l * 1.2, Math.sin(a) * l * 1.2); g.lineTo(Math.cos(a + 0.13) * l * 0.7, Math.sin(a + 0.13) * l * 0.7); g.fill(); } g.beginPath(); g.arc(0, 0, 54, 0, 7); g.fill(); g.strokeStyle = '#e11d48'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 58, 0, 7); g.stroke(); });
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
    const g = new THREE.Group(), N = 10, sp = [];
    for (let i = 0; i < N; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); s.userData = { s0: 18 + i * (ctx.longueur - 30) / N, ph: i * 0.37 }; g.add(s); sp.push(s); }
    return { groupe: g, maj(t) { sp.forEach((s, i) => { const p = ctx.spline.point(s.userData.s0), k = ((t * 0.5 + s.userData.ph) % 1); const e = Math.min(1, k * 3); s.position.set(p[0], 6 + 10 * (i % 3), p[2] - 14 - (i % 2) * 6); s.scale.setScalar(2 + 26 * e * e); s.material.opacity = (1 - k) * 0.95; s.quaternion.identity(); s.rotation.z = i; }); } };
  },
  /** tourbillon de pétales */
  petales(THREE, ctx) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false }); m.userData = { palette: ['#ffb0c8', '#ffd0e0', '#fff0f4', '#ff8fb0'] };
    const f = champInst(THREE, { geo: new THREE.CircleGeometry(0.7, 8), mat: m, n: 340, graine: 88, centre: [CX, 0, 0], taille: [120, 28, 30],
      mouvement: (p, t, o, c, s) => { const a = p.a * 6.283 + t * (0.9 + p.b), r = 5 + p.c * 26; o.position.set(c[0] + Math.cos(a) * r * 1.8, 1 + ((p.b * s[1] + t * (2 + 3 * p.d)) % s[1]), c[2] + Math.sin(a) * r * 0.7 - 6); o.rotation.set(t * 3 * p.a, t * 2 * p.d, 0); o.scale.set(1, 0.55, 1); } });
    return { groupe: (() => { const g = new THREE.Group(); g.add(f.objet); return g; })(), maj: f.maj };
  },
  /** tirets lumineux sur la trajectoire (repère de vitesse et de parallaxe) */
  bandes(THREE, ctx) {
    const g = new THREE.Group(), n = Math.floor(ctx.longueur / 7), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.05, 3.2), mat(THREE, ctx.accent, 1.8), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const s = 3 + i * 7, p = ctx.spline.point(s), T = ctx.spline.tangente(s); o.position.set(p[0], 0.05, p[2]); o.rotation.set(0, Math.atan2(T[0], T[2]), 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    g.add(im); return { groupe: g, maj() { } };
  },
};

/* ═════════════════════════ SCÉNARIO D'UNE ÉCURIE (physique, trajectoires, portails) ═════════════════════════ */
/** Pose pure d'une écurie : phase A (monde, S-courbe jusqu'au portail) puis phase B (drift lourd du portail du Ring jusqu'à son emplacement). */
export function scenarioEcurie(k, slot) {
  const m = MONDES[k], rnd = graineur(hashTexte('ecurie' + m.id)), dir = k % 2 ? -1 : 1;
  const TA = slot.impact - slot.debut, TB = slot.fin - slot.impact;
  /* ---- phase A : trajectoire dans le monde ---- */
  const hop = m.saut || 0;
  const ptsA = [[CX - dir * 46, 0, 6.5], [CX - dir * 26, 0, 3.2], [CX - dir * 5, hop ? hop : 0, 5.4], [CX + dir * 17, hop ? hop * 0.35 : 0, 1.8], [CX + dir * 38, 0, 2.6], [CX + dir * 58, 0, 2.6]];
  const spA = splineCR(ptsA), sPortail = spA.longueur - 6;
  const vMoy = sPortail / TA, v0 = vMoy * 0.62, v1 = 2 * vMoy - v0;
  const profA = (decal = 0) => profilVitesse([[slot.debut, v0], [slot.impact, v1], [slot.impact + 0.6, v1 * 1.05]], -decal);
  const betaA = (14 + 20 * rnd()) * DEG;
  const sLand = hop ? spA.longueur * 0.62 : 0;                                   // retombée du saut
  let tLand = null; if (hop) { const p = profA(); for (let t = slot.debut; t < slot.impact; t += 0.005) if (p.dist(t) >= sLand) { tLand = t; break; } }
  const defA = (decal, vib) => ({ spline: spA, profil: profA(decal), vibration: vib, tSusp0: slot.debut - 0.05, susp: {},
    derive: m.derive ? { t0: slot.debut + TA * 0.45, montee: 0.18, maintien: TA * 0.3, descente: 0.35, betaMax: betaA, signe: 1 } : null,
    atterrissage: tLand ? { t: tLand, vz: 16 } : { t: slot.debut + 0.04, vz: 6 } });
  const A = creerCascadeur(defA(0, m.id)), A2 = creerCascadeur(defA(11, m.id + 50));
  const tPortail = slot.impact;
  /* ---- phase B : drift du portail du Ring jusqu'à l'emplacement ---- */
  const th = angleEcurie(k), sg = (k % 2 ? -1 : 1);
  const gate = polaire(RING.RG, th), at = (r, d) => polaire(r, th + d);
  const P = (xz) => [xz[0], 0, xz[1]];
  const ptsBB = [P(polaire(RING.RG + 8, th)), P(polaire(RING.RG - 6, th)), P(at(76, 0.22 * sg)), P(at(62, -0.1 * sg)), P(at(RING.RS + 4, 0)), P(at(RING.RS, 0))];
  const spB = splineCR(ptsBB), LB = spB.longueur, TBd = Math.min(TB * 0.92, 1.55), vB0 = 2 * LB / TBd;
  const profB = (decal = 0) => profilVitesse([[slot.impact, vB0], [slot.impact + TBd, 0], [slot.fin + 40, 0]], -decal);
  // signe du virage : courbure moyenne sur la première moitié
  let cs = 0; for (let s = 0; s < LB * 0.55; s += 2) cs += spB.courbure(s).signee; const signe = cs >= 0 ? 1 : -1;
  const betaB = (14 + 20 * rnd()) * DEG;
  const defB = (decal, vib, sp) => ({ spline: sp, profil: profB(decal), vibration: vib, tSusp0: slot.impact - 0.02, susp: {}, ralenti: 0.012,
    derive: { t0: slot.impact + 0.05, montee: 0.14, maintien: TBd * 0.5, descente: TBd * 0.38, betaMax: betaB, signe },
    atterrissage: { t: slot.impact + 0.03, vz: 15 } });
  // ailier : même arc, légèrement décalé (rayon extérieur +9, angle +0,05)
  const ptsB2 = ptsBB.map((p, i) => { const r = Math.hypot(p[0], p[2]), a = Math.atan2(p[2], p[0]); const q = polaire(r + (i >= 4 ? 9.5 : 0) + 0, a + 0.06 * (i >= 2 ? 1 : 0.2)); return [q[0], 0, q[1]]; });
  const spB2 = splineCR(ptsB2);
  const B = creerCascadeur(defB(0, m.id + 100, spB)), B2 = creerCascadeur({ ...defB(0, m.id + 150, spB2), profil: profilVitesse([[slot.impact + 0.12, 2 * spB2.longueur / (TBd - 0.1)], [slot.impact + TBd + 0.02, 0], [slot.fin + 40, 0]]) });
  const pPortailA = spA.point(sPortail), tPA = spA.tangente(sPortail);
  return {
    k, m, dir, slot, TA, TB, spA, spB, sPortail, A, A2, B, B2, tLand, betaA, betaB,
    portailMonde: { pos: pPortailA, yaw: Math.atan2(-tPA[0], -tPA[2]) },
    porteRing: { pos: P(gate), yaw: Math.atan2(-gate[0], -gate[1]) + Math.PI },   // regarde le centre
    emplacement: { pos: P(at(RING.RS, 0)), cap: Math.atan2(-Math.cos(th), -Math.sin(th)), theta: th },
    positionRing: (t) => B.pose(t).pos, attente: (t) => B.pose(t),
  };
}

/* ═════════════════════════ LE RING COMMUN ═════════════════════════ */
export function creerRing(THREE, { envMap = null, equipes = [] } = {}) {
  const groupe = new THREE.Group(), jet = [], garde = (x) => { jet.push(x); return x; };
  groupe.name = 'ring-commun';
  // sol d'obsidienne humide : sombre, très lisse, translucide pour laisser voir les reflets des bolides (miroirs y = −1)
  const solMat = garde(new THREE.MeshStandardMaterial({ color: 0x03040a, metalness: 0.35, roughness: 0.07, envMap, envMapIntensity: 1.5, transparent: true, opacity: 0.8 }));
  const sol = new THREE.Mesh(garde(new THREE.CircleGeometry(RING.R, 120)), solMat); sol.rotation.x = -Math.PI / 2; groupe.add(sol);
  // flaques / veines humides : motif brillant radial (texture canvas)
  const veines = garde(new THREE.CanvasTexture(toile(512, 512, (g, w, h) => { const r = graineur(9); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(150,170,255,${0.04 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 36, 3 + r() * 14, r() * 3, 0, 7); g.fill(); } })));
  const hum = new THREE.Mesh(garde(new THREE.CircleGeometry(RING.R - 1, 80)), garde(new THREE.MeshBasicMaterial({ map: veines, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, toneMapped: false }))); hum.rotation.x = -Math.PI / 2; hum.position.y = 0.04; groupe.add(hum);
  // anneaux arc-en-ciel (les 5 voies, en couronne) + liseré extérieur
  const VOIES = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'], anneaux = [];
  VOIES.forEach((c, i) => { const r = 62 + i * 2.9; const a = new THREE.Mesh(garde(new THREE.RingGeometry(r, r + 1.7, 160)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), transparent: true, opacity: 0.85, toneMapped: false, side: THREE.DoubleSide }))); a.rotation.x = -Math.PI / 2; a.position.y = 0.08; groupe.add(a); anneaux.push(a); });
  const bord = new THREE.Mesh(garde(new THREE.TorusGeometry(RING.R, 0.9, 12, 200)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(2.2), toneMapped: false }))); bord.rotation.x = Math.PI / 2; groupe.add(bord);
  // emplacements d'arrivée (15) : pastilles qui s'allument quand une écurie s'y gare
  const pastilles = [];
  for (let k = 0; k < 15; k++) {
    const th = angleEcurie(k), c = equipes[k] ? equipes[k].colors[1] : '#ffffff';
    const p = new THREE.Mesh(garde(new THREE.RingGeometry(5.2, 6.2, 40)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2), transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide })));
    const [x, z] = polaire(RING.RS, th); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.1, z); groupe.add(p); pastilles.push(p);
  }
  // projecteurs : 14 pylônes au pourtour avec cône volumétrique pointé vers le centre
  const cones = [];
  for (let i = 0; i < 14; i++) {
    const th = (i + 0.5) / 14 * 2 * Math.PI, [x, z] = polaire(RING.R + 14, th), haut = 46;
    const mat1 = garde(new THREE.MeshBasicMaterial({ color: 0x0a0b14 })); const pyl = new THREE.Mesh(garde(new THREE.BoxGeometry(2.2, haut, 2.2)), mat1); pyl.position.set(x, haut / 2, z); groupe.add(pyl);
    const c = new THREE.Mesh(garde(new THREE.ConeGeometry(15, 120, 24, 1, true)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? '#8fb4ff' : '#ffd9a0').multiplyScalar(1.4), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
    c.geometry.translate(0, -60, 0); c.position.set(x, haut, z); c.lookAt(0, 0, 0); c.rotateX(Math.PI / 2); groupe.add(c); cones.push(c);
    const tete = new THREE.Mesh(garde(new THREE.SphereGeometry(2.4, 12, 8)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(3), toneMapped: false }))); tete.position.set(x, haut, z); groupe.add(tete);
  }
  // dôme : dégradé violet-nuit, étoiles, lueur d'horizon
  const dome = new THREE.Mesh(garde(new THREE.SphereGeometry(900, 40, 20)), garde(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform float uT; float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vP); float y = d.y; vec3 c = mix(vec3(0.02, 0.012, 0.05), vec3(0.003, 0.003, 0.012), smoothstep(0.0, 0.7, y));
        c += vec3(0.30, 0.10, 0.42) * pow(max(0.0, 1.0 - abs(y) * 3.2), 3.0) * 0.55;
        vec3 q = floor(d * 380.0); float s = step(0.9965, h(q)); c += vec3(1.0, 0.95, 0.9) * s * (0.5 + 0.5 * sin(uT * 3.0 + h(q + 1.0) * 6.28)) * smoothstep(0.0, 0.2, y);
        gl_FragColor = vec4(c, 1.0); }` })));
  dome.renderOrder = -10; groupe.add(dome);
  // rampe arc-en-ciel : repère de la brèche (pylônes de la rampe) — la rampe elle-même est posée par les actes I et III
  const lumiere = new THREE.HemisphereLight(0x8fa4ff, 0x120a22, 0.5); groupe.add(lumiere);
  const cle = new THREE.DirectionalLight(0xfff0dc, 1.15); cle.position.set(60, 140, 90); groupe.add(cle);
  const contre = new THREE.DirectionalLight(0x6f8cff, 0.8); contre.position.set(-90, 70, -110); groupe.add(contre);
  const portes = []; // créées par le film (une par écurie)
  return {
    groupe, sol, solMat, portes, pastilles, cones, anneaux, dome, lumieres: { cle, contre, lumiere },
    brouillard: { couleur: '#07060f', densite: 0.0016 },
    maj(t, pouls = 0, arrives = 0, tempoK = 0) {
      dome.material.uniforms.uT.value = t;
      anneaux.forEach((a, i) => { a.material.opacity = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(t * (2 + tempoK) - i * 0.9)) + 0.2 * pouls; });
      cones.forEach((c, i) => { c.material.opacity = 0.07 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 0.7)) + 0.07 * pouls; });
    },
    dispose() { for (const x of jet) { try { x.dispose(); } catch (e) { /* rien */ } } },
  };
}

/* ═════════════════════════ ÉTALONNAGE NOCTURNE DES MONDES (V7.1) ═════════════════════════
   Les décors de shared/ sont réglés pour le Showroom (caméra à ~15 unités) : leurs ciels pastel ou sable et leur brouillard
   dense délavent un plan V7 où le décor est à 60–120 unités. On ne touche pas à shared/ : on assombrit ICI les dômes de ciel
   (uniformes cTop / cMid / cBas du shader de decors3d.js) en les tirant vers la couleur de nuit propre au monde (MONDES[k].ciel),
   luminance plafonnée par bande (haut le plus sombre, horizon un peu plus clair pour garder la ligne d'horizon lisible). */
const LUMA = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
// plafonds en luminance LINÉAIRE (le rendu encode en sRGB : 0,03 linéaire ≈ 0,19 à l'écran) ; cBas = le sol lointain des décors
const PLAFONDS_CIEL = { cTop: 0.006, cMid: 0.016, cBas: 0.035 };
export function assombrirCiel(THREE, groupe, cielHex, { melange = 0.45, plafonds = PLAFONDS_CIEL } = {}) {
  const nuit = new THREE.Color(cielHex).convertSRGBToLinear(); let n = 0;
  groupe.traverse((o) => {
    const u = o.isMesh && o.material && o.material.uniforms;
    if (!u || !u.cTop || !u.cMid || !u.cBas) return;
    // IDEMPOTENT (règle 5) : un monde libéré du cache puis reconstruit peut retrouver un matériau partagé par shared/ ;
    // on repart donc toujours des couleurs d'origine mémorisées, jamais de la valeur déjà assombrie
    const ud = o.material.userData, orig = ud.cielOrigineV71 || (ud.cielOrigineV71 = {});
    for (const [cle, lmax] of Object.entries(plafonds)) {
      const c = u[cle].value; if (!orig[cle]) orig[cle] = c.clone();
      c.copy(orig[cle]).lerp(nuit, melange);
      const l = LUMA(c); if (l > lmax) c.multiplyScalar(lmax / l);
    }
    n++;
  });
  return n;
}

/** V7.1 : plafond de luminance des SURFACES d'un décor de jour (stade, cyclorama pastel, façades blanches, canyon ocre) : elles
    passent « de nuit ». Sont visés les matériaux éclairés ou peints (couleur × texture) ET les grands panneaux non éclairés
    (toneMapped: false, plus de 18 unités : façades, tribunes, murs de fond). Restent intacts les petits éléments lumineux
    (néons, enseignes, halos), le mélange additif et les shaders : ce sont eux qui doivent ressortir sur la nuit. */
export function plafonnerSurfaces(THREE, groupe, lmax = 0.12, { facteurShader = 0.3 } = {}) {
  const vus = new Set(), boite = new THREE.Box3(), taille = new THREE.Vector3(); let n = 0;
  groupe.updateMatrixWorld(true);
  groupe.traverse((o) => {
    if (!(o.isMesh || o.isSprite) || !o.material) return;
    let grand = null;
    const mesurer = () => { if (grand === null) { boite.setFromObject(o); boite.getSize(taille); grand = Math.max(taille.x, taille.y, taille.z) > 18; } return grand; };
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      // grands panneaux en shader opaque (cyclorama pailleté, murs animés) : on assombrit leur sortie, jamais le dôme de ciel
      if (!vus.has(m) && m.isShaderMaterial && !(m.uniforms && m.uniforms.cTop) && m.blending !== THREE.AdditiveBlending && !m.transparent && mesurer()) {
        vus.add(m); if (m.userData.plafondV71) continue;                  // déjà assombri (matériau partagé, monde reconstruit) : jamais deux fois
        m.userData.plafondV71 = true; m.fragmentShader = m.fragmentShader.replace(/\}\s*$/, `  gl_FragColor.rgb *= ${facteurShader.toFixed(3)};\n}`); m.needsUpdate = true; n++; continue;
      }
      if (vus.has(m) || m.isShaderMaterial || m.blending === THREE.AdditiveBlending || !m.color) continue;
      if (m.toneMapped === false && !mesurer()) continue;
      vus.add(m); const l = LUMA(m.color); if (l > lmax) { m.color.multiplyScalar(lmax / l); n++; }
    }
  });
  return n;
}

/* ═════════════════════════ GESTIONNAIRE DES MONDES (construction paresseuse, cache LRU) ═════════════════════════ */
export function creerGestionnaireMondes({ THREE, renderer, envMap, decors, avecAlea, cars, max = 4 }) {
  // max = MONDES.length (film V7.1) : aucun monde n'est jamais libéré. Un monde reconstruit après éviction recevait de nouveaux
  // identifiants d'objets et de matériaux : l'ordre de tri du rendu (et donc les surfaces coplanaires, les transparences à égalité
  // de profondeur) dépendait de l'HISTORIQUE des images rendues — contraire à la règle 5 (image = fonction pure de t).
  const cache = new Map(), MAX = max;
  function construire(k, sc) {
    const m = MONDES[k], car = cars.find((c) => c.code === m.ailier);
    const arche = car ? car.archetype : 'blockbuster';
    const groupe = new THREE.Group(); groupe.name = 'monde-' + m.id;
    const decor = avecAlea('decor' + m.id, () => decors.creerDecor(THREE, arche, { code: m.ailier, env: envMap }));
    decor.eclair && (decor.eclair.prochain = 1e9);                               // l'orage est piloté par éclair(t), pas par l'horloge
    decor.activer();
    const ciels = assombrirCiel(THREE, decor.groupe, m.ciel);                    // V7.1 : plus aucun ciel pastel / sable délavé
    const surfaces = plafonnerSurfaces(THREE, decor.groupe, m.surfaces || 0.12);  // V7.1 : décors de jour passés de nuit (luminance linéaire)
    groupe.add(decor.groupe, decor.lumieres);
    const ctx = { spline: sc.spA, longueur: sc.spA.longueur, dir: sc.dir, accent: m.accent, acc2: m.acc2 };
    const fx = ['bandes', ...m.fx].map((nom) => avecAlea('fx' + m.id + nom, () => FX[nom](THREE, ctx)));
    for (const f of fx) groupe.add(f.groupe);
    const portail = creerPortail(THREE, m.accent, m.acc2, { graine: m.id });
    portail.groupe.position.set(...sc.portailMonde.pos); portail.groupe.rotation.y = sc.portailMonde.yaw; groupe.add(portail.groupe);
    groupe.visible = false;
    return { k, groupe, decor, fx, portail, arche, ciels, surfaces };
  }
  function liberer(entree) { entree.groupe.parent && entree.groupe.parent.remove(entree.groupe); entree.decor.dispose && entree.decor.dispose(); entree.portail.dispose(); cache.delete(entree.k); }
  return {
    cache,
    obtenir(k, sc, scene) {
      let e = cache.get(k);
      if (!e) {
        e = construire(k, sc); scene.add(e.groupe); cache.set(k, e);
        if (cache.size > MAX) { for (const [kk, v] of cache) if (kk !== k && !v.groupe.visible) { liberer(v); break; } }
      }
      e.dernier = performance.now();
      return e;
    },
    liberer,
    /** construit tous les mondes dans l'ordre canonique 0..n-1 (identifiants stables, aucun coût au premier passage d'un portail) */
    prechauffer(scenarios, scene, surChaque = () => {}) {
      scenarios.forEach((sc, k) => { const e = this.obtenir(sc.k, sc, scene); e.groupe.visible = false; surChaque(k); });
      return cache.size;
    },
  };
}
