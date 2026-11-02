/* MONDE 3 du segment « familles » — TOKYO CYBERPUNK, LA COURSE (V9.3 ; extrait montré : interne 10,5 → 14,0 s = film 92,6 → 96,1).

   Rue de nuit sous la pluie qui file tout droit puis tourne à droite (virage de 36 m de rayon, familles_course.js), ciel
   violet-magenta (jamais noir), façades fenêtrées alignées sur le tracé, enseignes néon rose et cyan adoucies (kanjis génériques
   夜 光 雨 街 星 夢 龍 麺… — aucune marque), lanternes rouges sur câbles, lampadaires, vitrines, chaussée mouillée à 4 voies
   qui reflète la ville et les voitures (copie miroir sous une chaussée laquée semi-transparente).
   LA COURSE : TK04, TK02 (Skyline R30), TK01 (Starion) et TK05 (Pikachu Car) roulent côte à côte sur 4 voies : roue dans roue,
   dépassements, DÉRIVES dans le virage (angle de dérive, contre-braquage, étincelles), la Skyline prend la tête en sortie, accélère
   et plonge dans le rift posé sur sa voie (l'arrière le franchit à 14,0 s). Elles se frôlent (≥ 0,3 m) sans jamais se toucher.
   Caméra de poursuite AU MILIEU DE LA MEUTE (entre les voies centrales, 3,6 m derrière la paire de tête), qui suit le tracé.
   TK06 n'est JAMAIS construit ni montré.
   Repère : tracé repere(s) en mètres (familles_course.js), × m (cm par mètre « monde ») ; chaussée y = 0. */
import { prng, texCanvas, halo, creerCiel, creerPluie, matFacades, obbDecor } from './familles_outils.js';
import { creerRift } from './familles_portail.js';
import { creerOmbres, creerEtincelles } from './arene_juice.js';
import { repere, point, poseCourse, abscisse, S_V0, S_V1, RV, T_ACC, T_RIFT } from './familles_course.js';

export const ORDRE_TOKYO = ['TK02', 'TK01', 'TK04', 'TK05'];
const KANJIS = ['夜光', '雨街', '星夢', '龍', '麺', '電気', '花月', '風音', '酒場', '火龍', '夢', '光'];

export function creerTokyo(ctx, voitures) {
  const { THREE, outils } = ctx, { clamp, lerp, smoother } = outils;
  if (voitures.some((v) => v.code === 'TK06')) throw new Error('seg_familles : TK06 interdit dans le monde Tokyo');
  const rnd = prng('familles-tokyo-v93'), R = (a, b) => a + rnd() * (b - a);
  const groupe = new THREE.Group(); groupe.name = 'familles-tokyo';
  const ville = new THREE.Group(); ville.name = 'tokyo-ville'; groupe.add(ville);
  const sky0 = voitures.find((v) => v.code === 'TK02') || voitures[0];
  const m = (sky0.boite.max.z - sky0.boite.min.z) / 4.6;                  // la Skyline R30 mesure ~4,6 m
  const DEMI = 7, TROT = 4, ZF = DEMI + TROT;                               // mètres : demi-chaussée, trottoir, façades
  const SA = -70, SB = 150;                                                 // étendue du décor le long du tracé (m)
  const FOG = '#4a2468', DENS = 0.0048 / m;
  const obstacles = [];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, ...o });
  /** point du tracé (s, d en m) → Vector3 en cm ; capT : orientation « avant le long du tracé » pour rotation.y */
  const P = (s, d, y = 0) => { const p = point(s, d); return new THREE.Vector3(p.x * m, y * m, p.z * m); };
  const rotT = (s) => -repere(s).th;                                        // rotation.y qui aligne l'axe local +x sur l'avant
  const capT = (s) => { const th = repere(s).th; return Math.atan2(Math.cos(th), Math.sin(th)); };
  const pasCourbe = (s, d) => (s > S_V0 && s < S_V1 ? RV / Math.max(4, RV - d) : 1);   // pas en s pour garder un pas constant le long d'une façade

  /* ───────── ciel violet-magenta, nuages roses ───────── */
  const ciel = creerCiel(THREE, { rayon: 1800 * m, haut: '#33196a', milieu: '#7e3496', bas: '#d65e9c', nuages: 0.9, couleurNuage: '#d784c0', clairNuage: 0.4,
    zone: { dir: [0.4, 0.25, 0.6], couleur: '#e070c8', force: 0.45, taille: 0.6 }, echelle: 1.2, vent: 0.015 });
  groupe.add(ciel.mesh);

  /* ───────── façades le long du tracé (InstancedMesh tournées, fenêtres dans les axes de chaque immeuble) ───────── */
  const fac = matFacades(THREE, { base: '#2a2440', base2: '#3a2a52', fen: ['#8fd8e8', '#e8c4dc', '#e8c08a'], allume: 0.42, etage: 3.2 * m, pas: 1.9 * m, toit: '#1c1430', brouillard: FOG, densite: DENS, lueur: 1.5, bandes: 0.4, cBandes: '#d84ea0' });
  const imm = [];
  for (const sg of [-1, 1]) {
    let s = SA;
    while (s < SB) {
      const lx = R(7, 15), lz = R(14, 22), h = R(14, 48), dc = sg * (ZF + lz / 2), ds = lx * pasCourbe(s + lx / 2, dc);
      imm.push({ s: s + ds / 2, d: dc, lx: lx - 0.3, lz, h, g: rnd(), sg }); s += ds;
    }
  }
  for (let i = 0; i < 80; i++) { const sg = rnd() < 0.5 ? -1 : 1, lx = R(14, 26); imm.push({ s: R(SA, SB + 60), d: sg * (ZF + R(30, 70)), lx, lz: lx, h: R(40, 95), g: rnd(), sg }); }
  const geoB = new THREE.BoxGeometry(1, 1, 1); geoB.translate(0, 0.5, 0);
  const instI = new THREE.InstancedMesh(geoB, fac.mat, imm.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S3 = new THREE.Vector3(), gr = new Float32Array(imm.length);
  imm.forEach((b, i) => { Q.setFromEuler(E.set(0, rotT(b.s), 0)); M4.compose(P(b.s, b.d), Q, S3.set(b.lx * m, b.h * m, b.lz * m)); instI.setMatrixAt(i, M4); gr[i] = b.g; });
  geoB.setAttribute('aGraine', new THREE.InstancedBufferAttribute(gr, 1)); instI.frustumCulled = false; ville.add(instI);

  /* ───────── enseignes néon (adoucies : moins saturées, moins de blanc), vitrines ───────── */
  const ROSE = '#e85aa8', CYAN = '#4fd6e6', VIOLET = '#a06ee0', AMBRE = '#e8a656';
  const texEnseigne = (txt, coul, vertical) => texCanvas(THREE, vertical ? 128 : 512, vertical ? 512 : 128, (g, w, h) => {
    g.fillStyle = '#140c20'; g.fillRect(0, 0, w, h);
    g.strokeStyle = coul; g.lineWidth = 7; g.shadowColor = coul; g.shadowBlur = 14; g.strokeRect(10, 10, w - 20, h - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowBlur = 18;
    const ch = [...txt];
    if (vertical) { const t = Math.min(100, (h - 60) / ch.length); g.font = `900 ${t}px "Noto Sans CJK JP", "Noto Sans JP", sans-serif`; ch.forEach((c, i) => { g.fillStyle = coul; g.fillText(c, w / 2, 30 + t * (i + 0.5)); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillText(c, w / 2, 30 + t * (i + 0.5)); }); }
    else { g.font = `900 ${h * 0.6}px "Noto Sans CJK JP", "Noto Sans JP", sans-serif`; g.fillStyle = coul; g.fillText(txt, w / 2, h / 2 + 4); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillText(txt, w / 2, h / 2 + 4); }
  });
  const couleurs = [ROSE, CYAN, ROSE, CYAN, VIOLET, AMBRE];
  const matsV = KANJIS.map((k, i) => new THREE.MeshBasicMaterial({ map: texEnseigne(k.length < 2 ? k + '光' : k, couleurs[i % couleurs.length], true), color: new THREE.Color(1.2, 1.2, 1.2) }));
  const matsH = KANJIS.map((k, i) => new THREE.MeshBasicMaterial({ map: texEnseigne(k, couleurs[(i + 1) % couleurs.length], false), color: new THREE.Color(1.15, 1.15, 1.15) }));
  const cadre = std({ color: 0x1a1426, metalness: 0.6, roughness: 0.4 });
  const texVit = texCanvas(THREE, 512, 64, (g, w, h) => { for (let i = 0; i < 24; i++) { const c = [AMBRE, '#e8d6b8', CYAN, ROSE, '#d8d8e8'][Math.floor(rnd() * 5)]; g.fillStyle = c; g.globalAlpha = 0.2 + rnd() * 0.3; g.fillRect(i * w / 24 + 4, 14, w / 24 - 8, h - 22); g.globalAlpha = 1; g.fillStyle = '#140c20'; g.fillRect(i * w / 24 + 4, h * 0.55, w / 24 - 8, 3); } });
  const matVit = new THREE.MeshBasicMaterial({ map: texVit, color: new THREE.Color(0.5, 0.5, 0.55) });
  const regarderRue = (o, s) => { const c = P(s, 0, o.position.y / m); o.lookAt(c.x, o.position.y, c.z); };
  for (const sg of [-1, 1]) {
    for (let s = SA + 3; s < SB; s += R(5.5, 9.5) * pasCourbe(s, sg * ZF)) {
      const hV = R(4.5, 8), y = R(4.2, 9) + hV / 2, mi = Math.floor(rnd() * matsV.length);
      // enseigne verticale PERPENDICULAIRE à la façade : faces texturées tournées vers l'avant et l'arrière de la rue
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.25 * m, hV * m, 1.25 * m), [matsV[mi], matsV[mi], cadre, cadre, cadre, cadre]);
      e.position.copy(P(s, sg * (ZF - 0.75), y)); e.rotation.y = rotT(s); ville.add(e);
      if (rnd() < 0.7) { const lb = R(3.5, 6), bh = new THREE.Mesh(new THREE.PlaneGeometry(lb * m, lb / 4 * m), matsH[Math.floor(rnd() * matsH.length)]); bh.position.copy(P(s + R(1.5, 3), sg * (ZF - 0.05), 3.6)); regarderRue(bh, s + 2); ville.add(bh); }
    }
    // vitrines du rez-de-chaussée (un panneau par tronçon de 8 m)
    for (let s = SA; s < SB; s += 8 * pasCourbe(s, sg * ZF)) { const v = new THREE.Mesh(new THREE.PlaneGeometry(8.2 * m, 1.9 * m), matVit); v.position.copy(P(s + 4, sg * (ZF - 0.04), 1.25)); regarderRue(v, s + 4); ville.add(v); }
  }

  /* ───────── chaussée (bande le long du tracé), trottoirs, bordures ───────── */
  /** bande horizontale d0 → d1 à la hauteur y (m), de SA à SB : géométrie suivant le virage, UV (u travers, v le long) */
  function bande(d0, d1, y, pasV = 6) {
    const pos = [], uv = [], idx = []; let n = 0;
    for (let s = SA; s <= SB + 0.01; s += 1) {
      const a = P(s, d0, y), b = P(s, d1, y); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, s / pasV, 1, s / pasV);
      if (n > 0) { const k = 2 * n; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } n++;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function bordure(d, sg) {                                                   // face verticale de la bordure, côté chaussée
    const pos = [], idx = []; let n = 0;
    for (let s = SA; s <= SB + 0.01; s += 1) { const a = P(s, d, 0), b = P(s, d, 0.16); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); if (n > 0) { const k = 2 * n; if (sg > 0) idx.push(k - 2, k - 1, k, k - 1, k + 1, k); else idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } n++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const trot = std({ color: 0x3a3048, roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide });
  for (const sg of [-1, 1]) {
    ville.add(new THREE.Mesh(bande(sg * DEMI, sg * ZF, 0.16), trot));
    ville.add(new THREE.Mesh(bordure(sg * DEMI, sg), trot));
    for (let s = SA; s < SB; s += 4) { const c = point(s + 2, sg * (DEMI + TROT / 2)); obstacles.push(obbDecor('trottoir', c.x * m, c.z * m, TROT / 2 * m, 2 * m, 0, 0.16 * m, capT(s + 2))); }
  }
  // texture de chaussée : 4 voies (tirets à d = 0, ±3,075), lignes de rive à ±6,7 (u : d = −7 → +7)
  const texRoute = texCanvas(THREE, 512, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    const U = (d) => (d + DEMI) / (2 * DEMI) * w;
    g.fillStyle = 'rgba(255,255,255,1)';
    for (const d of [-6.7, 6.7]) g.fillRect(U(d) - 3, 0, 6, h);
    for (const d of [-3.075, 0, 3.075]) g.fillRect(U(d) - 3, 0, 6, h * 0.5);
  }, { repeter: true });
  texRoute.wrapS = THREE.ClampToEdgeWrapping;
  const route = new THREE.Mesh(bande(-DEMI, DEMI, 0), new THREE.MeshStandardMaterial({ color: 0x2a1c3c, map: texRoute, roughness: 0.16, metalness: 0.55, transparent: true, opacity: 0.8, envMapIntensity: 0.7, side: THREE.DoubleSide }));
  route.renderOrder = 2; groupe.add(route);
  const fondR = new THREE.Mesh(new THREE.PlaneGeometry(600 * m, 600 * m), new THREE.MeshBasicMaterial({ color: 0x140a20 })); fondR.rotation.x = -Math.PI / 2; fondR.position.set(40 * m, -120 * m, 30 * m); groupe.add(fondR);

  /* ───────── lampadaires, câbles et lanternes ───────── */
  const fer = std({ color: 0x2a2a36, metalness: 0.7, roughness: 0.35 });
  for (const sg of [-1, 1]) for (let s = SA + 6 + (sg > 0 ? 11 : 0); s < SB; s += 22) {
    const pied = P(s, sg * (DEMI + 0.5), 0), bout = P(s, sg * (DEMI - 1.0), 6.32);
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * m, 0.11 * m, 6.5 * m, 8), fer); pm.position.copy(pied).setY(3.25 * m); ville.add(pm);
    const tete = new THREE.Mesh(new THREE.BoxGeometry(0.5 * m, 0.12 * m, 0.5 * m), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.3, 1.55) })); tete.position.copy(bout); ville.add(tete);
    const bras = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * m, 0.04 * m, 1.6 * m, 6), fer); bras.position.copy(pied).lerp(bout, 0.5).setY(6.4 * m); bras.lookAt(bout.x, 6.4 * m, bout.z); bras.rotateX(Math.PI / 2); ville.add(bras);
    const h = halo(THREE, '#d8ccf0', 2.2 * m, 0.5); h.position.copy(bout).setY(6.2 * m); ville.add(h);
    const c = point(s, sg * (DEMI + 0.5)); obstacles.push(obbDecor('lampadaire', c.x * m, c.z * m, 0.12 * m, 0.12 * m, 0, 6.5 * m));
  }
  const lant = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.3, 0.22) }), cables = [];
  for (let s = SA + 4; s < SB; s += 14) {
    const pts = [], y0 = R(7.5, 9), fl = 1.2;
    for (let i = 0; i <= 16; i++) { const f = i / 16; pts.push(P(s + f * 3, lerp(-ZF + 0.3, ZF - 0.3, f), y0 - fl * 4 * f * (1 - f))); }
    cables.push(...pts.slice(0, -1).flatMap((p, i) => [p, pts[i + 1]]));
    if (rnd() < 0.6) for (let i = 2; i < 16; i += 2) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.22 * m, 10, 8), lant); l.scale.y = 1.3; l.position.copy(pts[i]).add(new THREE.Vector3(0, -0.35 * m, 0)); ville.add(l); }
  }
  ville.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cables), new THREE.LineBasicMaterial({ color: 0x120c1a })));

  /* ───────── reflets : la ville renversée sous la chaussée laquée ───────── */
  const miroirVille = ville.clone(true); miroirVille.scale.y = -1; miroirVille.name = 'tokyo-ville-miroir'; groupe.add(miroirVille);

  /* ───────── pluie (volume couvrant la ligne droite et le virage) ───────── */
  const cP = point(30, 0);
  const pluie = creerPluie(THREE, rnd, { n: 7000, centre: [cP.x * m, 7 * m, cP.z * m], taille: [130 * m, 16 * m, 110 * m], vitesse: [-1.4 * m, -10 * m, 0.5 * m], longueur: 0.6 * m, couleur: '#e6c8e8', alpha: 0.16, proche: 1.4 * m });
  groupe.add(pluie.mesh);

  /* ───────── les voitures (+ phares, reflets, ombres) ───────── */
  const flotte = voitures.map((v) => {
    const b = v.boite, solY = -b.min.y, W = b.max.x - b.min.x, Hc = b.max.y - b.min.y;
    v.env.v7.reel.eclairer(v.code === 'TK05' ? 0.4 : 1, 0);
    for (const s of [-1, 1]) { const h = halo(THREE, '#eef2ff', 0.5 * m, 0.5); h.position.set(s * W * 0.32, b.min.y + Hc * 0.36, b.max.z + 0.05 * m); v.env.add(h);
      const r = halo(THREE, '#ff2a3a', 0.45 * m, 0.55); r.position.set(s * W * 0.34, b.min.y + Hc * 0.45, b.min.z - 0.05 * m); v.env.add(r); }
    groupe.add(v.env);
    const mir = ctx.decors.creerMiroirModele(THREE, v.env); mir.racine.visible = true; groupe.add(mir.racine);
    return { ...v, solY, W, mir };
  });
  const ombres = creerOmbres(THREE, flotte.map((f) => ({ env: f.env, boite: f.boite })), { sol: () => 0 });
  ombres.groupe.traverse((o) => { if (o.isMesh) o.renderOrder = 3; }); groupe.add(ombres.groupe);

  /** pose « poser » (cm) de la voiture f à l'instant t, d'après la chorégraphie en mètres */
  function poseV(f, t) {
    const c = poseCourse(f.code, t), b = c.beta;
    return { pos: [c.x * m, f.solY, c.z * m], cap: c.cap, capVitesse: c.capVitesse, heave: 0.004 * m * Math.sin(t * 13 + f.W), tangage: 0, pente: 0,
      roulis: -0.1 * b, dist: c.dist * m, braquage: 0.85 * b, coins: {}, course: c };
  }
  // rift : posé sur la voie de la Skyline, là où passe son arrière à T_RIFT
  const sky = flotte.find((f) => f.code === 'TK02');
  const pR = poseV(sky, T_RIFT), fwd = [Math.sin(pR.cap), Math.cos(pR.cap)];
  const XR = pR.pos[0] + fwd[0] * sky.boite.min.z, ZR = pR.pos[2] + fwd[1] * sky.boite.min.z;
  const rift = creerRift(THREE, { rayon: 1.85 * m }); rift.groupe.position.set(XR, 1.15 * m, ZR); rift.groupe.rotation.y = Math.atan2(fwd[0], fwd[1]); groupe.add(rift.groupe);
  const portail = { x: XR, z: ZR, nx: fwd[0], nz: fwd[1] };
  const passee = (f, p) => f === sky && ((p.pos[0] + Math.sin(p.cap) * f.boite.min.z - XR) * portail.nx + (p.pos[2] + Math.cos(p.cap) * f.boite.min.z - ZR) * portail.nz) > 0;

  // étincelles : roue arrière extérieure de chaque voiture pendant la dérive, puis départ canon de la Skyline
  const evts = flotte.map((f, k) => ({
    t0: 10.95 + k * 0.07, t1: 12.35 + k * 0.05, n: 22, vie: [0.18, 0.4], graine: 'tokyo-derive-' + f.code,
    source: (tb, a) => { const p = poseV(f, tb), fx = Math.sin(p.cap), fz = Math.cos(p.cap), lx = -fz, lz = fx;   // l = gauche de la voiture (+x local)
      const r = [p.pos[0] + fx * f.boite.min.z * 0.7 + lx * f.W * 0.45, p.pos[2] + fz * f.boite.min.z * 0.7 + lz * f.W * 0.45];
      return { p: [r[0], 0.04 * m, r[1]], v: [-fx * (50 + 90 * a[1]) + lx * (20 + 50 * a[3]), 25 + 60 * a[2], -fz * (50 + 90 * a[1]) + lz * (20 + 50 * a[3])], sol: 0 }; },
  }));
  evts.push({ t0: T_ACC + 0.02, t1: T_ACC + 0.4, n: 30, vie: [0.18, 0.4], graine: 'tokyo-skyline',
    source: (tb, a) => { const p = poseV(sky, tb), fx = Math.sin(p.cap), fz = Math.cos(p.cap), sg = a[0] < 0.5 ? -1 : 1;
      return { p: [p.pos[0] + fx * sky.boite.min.z * 0.8 - fz * sg * sky.W * 0.4, 0.04 * m, p.pos[2] + fz * sky.boite.min.z * 0.8 + fx * sg * sky.W * 0.4], v: [-fx * (70 + 110 * a[1]), 25 + 60 * a[2], -fz * (70 + 110 * a[1])], sol: 0 }; } });
  const etincelles = creerEtincelles(THREE, { demiH: ctx.H / 2, evenements: evts }); groupe.add(etincelles.points);

  /* ───────── lumières ───────── */
  const hemi = new THREE.HemisphereLight(0xa078f0, 0x301040, 0.85); groupe.add(hemi);
  const lRose = new THREE.PointLight(0xe85ab8, 1.4, 26 * m, 1.4), lCyan = new THREE.PointLight(0x50d8f0, 1.4, 26 * m, 1.4), lBlanc = new THREE.PointLight(0xe0d4f8, 1.3, 22 * m, 1.4);
  groupe.add(lRose, lCyan, lBlanc);
  const cle = new THREE.DirectionalLight(0xf0c8e8, 0.45); cle.position.set(20 * m, 30 * m, 25 * m); groupe.add(cle); groupe.add(cle.target);
  const listeV = flotte.map((f) => ({ env: f.env, nom: f.code, portail: f === sky ? portail : null }));

  /** abscisse de la caméra : 3,6 m derrière la paire de tête (TK02 / TK04), puis derrière la Skyline quand elle s'échappe */
  const sCam = (t) => {
    const s2 = abscisse('TK02', t), s4 = abscisse('TK04', t), w = smoother((t - 12.35) / 0.6);
    return lerp(Math.min(s2, s4), s2 - 1.2, w) - 3.6;
  };

  return {
    groupe, obstacles, voitures: listeV,
    maj(t) {
      ciel.maj(t); pluie.maj(t);
      const posesO = flotte.map((f) => {
        const p = poseV(f, t);
        ctx.poser(f.env, p); f.env.v7.reel.eclairer(f.code === 'TK05' ? 0.4 : 1, 0);
        const cache = passee(f, p); f.env.visible = !cache;
        f.env.updateMatrixWorld(true); f.mir.sync();
        return cache ? null : { pos: [p.pos[0], 0, p.pos[2]], heave: p.heave, cap: p.cap, phase: 'sol' };
      });
      ombres.maj(posesO);
      etincelles.maj(t);
      rift.maj(t, smoother((t - 13.05) / 0.3));
      // caméra au milieu de la meute, sur le tracé (entre les deux voies centrales), regard 12 m devant
      const sc = sCam(t), dc = 0.15 * Math.sin(t * 1.3);
      const pc = P(sc, dc, 1.25 - 0.1 * smoother((t - 12.4) / 0.6));
      const vise = P(sc + 12, lerp(0.0, -0.9, smoother((t - 12.4) / 0.8)), 0.85);
      const kR = smoother((t - 13.55) / 0.4);
      const c = [lerp(vise.x, XR, kR * 0.6), lerp(vise.y, 1.15 * m, kR * 0.6), lerp(vise.z, ZR, kR * 0.6)];
      lRose.position.copy(P(sc + 5, -ZF + 1.2, 5)); lCyan.position.copy(P(sc - 2, ZF - 1.2, 5.5)); lBlanc.position.copy(P(sc + 2, DEMI - 1.4, 6));
      return {
        camera: { p: [pc.x, pc.y, pc.z], c, fov: 50, near: 0.1 * m, far: 2200 * m },
        fond: 0x6a2a80, brouillard: { couleur: FOG, densite: DENS * 0.55 },
        lumieres: { hemi: 0.2, cle: 0.25 },
        post: { exposition: 0.84, vignette: 0.42, saturation: 1.0, bloomForce: 0.5, aberration: 0.0006 },
      };
    },
  };
}
