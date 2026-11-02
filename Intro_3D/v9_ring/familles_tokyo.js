/* MONDE 3 du segment « familles » — TOKYO CYBERPUNK (temps interne 10 → 15 s).

   Rue de nuit sous la pluie, ciel VIOLET-MAGENTA (jamais noir) : façades fenêtrées en espace monde, enseignes verticales et
   bandeaux néon rose et cyan aux kanjis génériques (夜 光 雨 街 星 夢 龍 麺… — aucune marque), lanternes rouges sur câbles,
   lampadaires, vitrines du rez-de-chaussée, chaussée mouillée qui REFLÈTE la ville (copie miroir sous une chaussée laquée
   semi-transparente) et les voitures (creerMiroirModele de shared/decors3d.js).
   Quatre légendes de Tokyo roulent lentement en file sur la voie de gauche (conduite à gauche), avec une ondulation douce :
   TK02 (Skyline R30) en tête, TK01 (Starion), TK04 (Trans Am « Néon Bandit »), TK05 (Pikachu Car) en queue.
   TK06 n'est JAMAIS construit ni montré. Roues qui tournent (ctx.poser : ω = distance / R, rotation absolue).
   Caméra de poursuite : roule avec la file, côté voie opposée, et remonte doucement de la dernière voiture à la Skyline.
   V9.2 : à 12,85 s la Skyline s'aligne, accélère (étincelles), double la caméra et plonge dans un rift (franchi à ~13,97 s).
   Repère : rue le long de x, voitures vers +x sur z = ZV ; chaussée y = 0 ; m = 1 mètre « monde » en cm. */
import { prng, texCanvas, halo, creerCiel, creerPluie, matFacades, obbDecor } from './familles_outils.js';
import { creerRift } from './familles_portail.js';
import { creerOmbres, creerEtincelles } from './arene_juice.js';

export const ORDRE_TOKYO = ['TK02', 'TK01', 'TK04', 'TK05'];
const KANJIS = ['夜光', '雨街', '星夢', '龍', '麺', '電気', '花月', '風音', '酒場', '火龍', '夢', '光'];

export function creerTokyo(ctx, voitures) {
  const { THREE, outils } = ctx, { clamp, lerp, smoother } = outils;
  if (voitures.some((v) => v.code === 'TK06')) throw new Error('seg_familles : TK06 interdit dans le monde Tokyo');
  const rnd = prng('familles-tokyo'), R = (a, b) => a + rnd() * (b - a);
  const groupe = new THREE.Group(); groupe.name = 'familles-tokyo';
  const ville = new THREE.Group(); ville.name = 'tokyo-ville'; groupe.add(ville);
  const b0 = voitures[0].boite, m = (b0.max.z - b0.min.z) / 4.6;        // la Skyline R30 mesure ~4,6 m
  const DEMI = 7 * m, TROT = 4 * m, ZF = DEMI + TROT;                      // demi-chaussée, trottoir, façades
  const ZV = -1.9 * m, V = 6 * m, ESP = 9.5 * m;                          // voie, allure (cm/s), espacement des voitures
  const FOG = '#5a2a78', DENS = 0.0052 / m;
  const obstacles = [];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, ...o });
  const X0 = -140 * m, X1 = 240 * m;

  /* ───────── ciel violet-magenta, nuages roses ───────── */
  const ciel = creerCiel(THREE, { rayon: 1800 * m, haut: '#3a1d78', milieu: '#9a3aa8', bas: '#ff6aa8', nuages: 0.9, couleurNuage: '#ff8fd0', clairNuage: 0.45,
    zone: { dir: [0.6, 0.25, 0.1], couleur: '#ff7ad8', force: 0.6, taille: 0.6 }, echelle: 1.2, vent: 0.015 });
  groupe.add(ciel.mesh);

  /* ───────── façades des deux côtés (InstancedMesh, fenêtres en espace monde) ───────── */
  const fac = matFacades(THREE, { base: '#2a2440', base2: '#3a2a52', fen: ['#9ff0ff', '#ffd2f0', '#ffd08a'], allume: 0.5, etage: 3.2 * m, pas: 1.9 * m, toit: '#1c1430', brouillard: FOG, densite: DENS, lueur: 2.0, bandes: 0.6, cBandes: '#ff4fb8' });
  const imm = [];
  for (const s of [-1, 1]) {
    let x = X0;
    while (x < X1) { const lx = R(7, 15) * m, h = R(14, 48) * m, lz = R(14, 22) * m; imm.push({ x: x + lx / 2, z: s * (ZF + lz / 2), lx: lx - 0.3 * m, lz, h, g: rnd(), s }); x += lx; }
  }
  for (let i = 0; i < 70; i++) { const s = rnd() < 0.5 ? -1 : 1, lx = R(14, 26) * m, h = R(40, 95) * m; imm.push({ x: R(X0, X1), z: s * (ZF + R(30, 70) * m), lx, lz: lx, h, g: rnd(), s }); }
  const geoB = new THREE.BoxGeometry(1, 1, 1); geoB.translate(0, 0.5, 0);
  const instI = new THREE.InstancedMesh(geoB, fac.mat, imm.length), M4 = new THREE.Matrix4(), gr = new Float32Array(imm.length);
  imm.forEach((b, i) => { M4.makeScale(b.lx, b.h, b.lz); M4.setPosition(b.x, 0, b.z); instI.setMatrixAt(i, M4); gr[i] = b.g; });
  geoB.setAttribute('aGraine', new THREE.InstancedBufferAttribute(gr, 1)); instI.frustumCulled = false; ville.add(instI);
  for (const b of imm) if (Math.abs(b.z) < ZF + 12 * m) obstacles.push(obbDecor('immeuble', b.x, b.z, b.lx / 2, b.lz / 2, 0, b.h));

  /* ───────── enseignes néon (kanjis génériques), vitrines, bandeaux ───────── */
  const ROSE = '#ff3fb4', CYAN = '#2ff0ff', VIOLET = '#b56bff', AMBRE = '#ffb24a';
  const texEnseigne = (txt, coul, vertical) => texCanvas(THREE, vertical ? 128 : 512, vertical ? 512 : 128, (g, w, h) => {
    g.fillStyle = '#120a1e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = coul; g.lineWidth = 8; g.shadowColor = coul; g.shadowBlur = 18; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ffffff'; g.shadowBlur = 26; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ch = [...txt];
    if (vertical) { const t = Math.min(100, (h - 60) / ch.length); g.font = `900 ${t}px "Noto Sans CJK JP", "Noto Sans JP", sans-serif`; ch.forEach((c, i) => { g.fillStyle = coul; g.fillText(c, w / 2, 30 + t * (i + 0.5)); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(c, w / 2, 30 + t * (i + 0.5)); }); }
    else { g.font = `900 ${h * 0.6}px "Noto Sans CJK JP", "Noto Sans JP", sans-serif`; g.fillStyle = coul; g.fillText(txt, w / 2, h / 2 + 4); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(txt, w / 2, h / 2 + 4); }
  });
  const couleurs = [ROSE, CYAN, ROSE, CYAN, VIOLET, AMBRE];
  const texV = KANJIS.map((k, i) => texEnseigne(k.length < 2 ? k + '光' : k, couleurs[i % couleurs.length], true));
  const texH = KANJIS.map((k, i) => texEnseigne(k, couleurs[(i + 1) % couleurs.length], false));
  const matsV = texV.map((t) => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.7, 1.7, 1.7) }));
  const matsH = texH.map((t) => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.6, 1.6, 1.6) }));
  const cadre = std({ color: 0x1a1426, metalness: 0.6, roughness: 0.4 });
  const sources = [];                                   // positions des grands néons (lumières ponctuelles proches)
  for (const s of [-1, 1]) {
    for (let x = X0 + 4 * m; x < X1; x += R(5.5, 9.5) * m) {
      // enseigne verticale perpendiculaire à la façade
      const hV = R(4.5, 8) * m, y = R(4.2, 9) * m + hV / 2, mi = Math.floor(rnd() * matsV.length);
      const geo = new THREE.BoxGeometry(0.25 * m, hV, 1.25 * m);
      const e = new THREE.Mesh(geo, [cadre, cadre, cadre, cadre, matsV[mi], matsV[mi]]);
      e.position.set(x, y, s * (ZF - 0.85 * m)); e.rotation.y = Math.PI / 2; ville.add(e);
      if (rnd() < 0.35) sources.push({ x, y, z: s * (ZF - 0.85 * m), c: couleurs[mi % couleurs.length] });
      // bandeau horizontal au-dessus de la vitrine
      if (rnd() < 0.7) { const lb = R(3.5, 6) * m, bh = new THREE.Mesh(new THREE.PlaneGeometry(lb, lb / 4), matsH[Math.floor(rnd() * matsH.length)]); bh.position.set(x + R(1.5, 3) * m, 3.6 * m, s * (ZF - 0.05 * m)); bh.rotation.y = s > 0 ? Math.PI : 0; ville.add(bh); }
    }
    // vitrines lumineuses du rez-de-chaussée (bande continue chaude/froide)
    const texV2 = texCanvas(THREE, 1024, 64, (g, w, h) => { for (let i = 0; i < 48; i++) { const c = [AMBRE, '#ffe6c0', CYAN, ROSE, '#ffffff'][Math.floor(rnd() * 5)]; g.fillStyle = c; g.globalAlpha = 0.2 + rnd() * 0.35; g.fillRect(i * w / 48 + 4, 14, w / 48 - 8, h - 22); g.globalAlpha = 1; g.fillStyle = '#140c20'; g.fillRect(i * w / 48 + 4, h * 0.55, w / 48 - 8, 3); } }, { repeter: true });
    texV2.repeat.set((X1 - X0) / (60 * m), 1);
    const vit = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 1.9 * m), new THREE.MeshBasicMaterial({ map: texV2, color: new THREE.Color(0.6, 0.6, 0.65) }));
    vit.position.set((X0 + X1) / 2, 1.25 * m, s * (ZF - 0.04 * m)); vit.rotation.y = s > 0 ? Math.PI : 0; ville.add(vit);
  }
  // écrans géants sur les tours du fond
  for (let i = 0; i < 8; i++) {
    const c = i % 2 ? CYAN : ROSE, k = KANJIS[(i * 5) % KANJIS.length];
    const t = texEnseigne(k, c, false), e = new THREE.Mesh(new THREE.PlaneGeometry(16 * m, 4 * m), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.5, 1.5, 1.5) }));
    const s = i % 2 ? 1 : -1; e.position.set(-40 * m + i * 32 * m, R(20, 32) * m, s * (ZF + 0.3 * m) - s * 0.0); e.rotation.y = s > 0 ? Math.PI : 0;
    e.position.z = s * (ZF - 0.06 * m); ville.add(e);
  }

  /* ───────── trottoirs, lampadaires, câbles et lanternes ───────── */
  const trot = std({ color: 0x3a3048, roughness: 0.3, metalness: 0.3 });
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 0.16 * m, TROT), trot); t.position.set((X0 + X1) / 2, 0.08 * m, s * (DEMI + TROT / 2)); ville.add(t);
    obstacles.push(obbDecor('trottoir', t.position.x, t.position.z, (X1 - X0) / 2, TROT / 2, 0, 0.16 * m));
  }
  const fer = std({ color: 0x2a2a36, metalness: 0.7, roughness: 0.35 });
  const lampes = [];
  for (const s of [-1, 1]) for (let x = X0 + 10 * m; x < X1; x += 22 * m) {
    const z = s * (DEMI + 0.5 * m), xx = x + (s > 0 ? 11 * m : 0);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * m, 0.11 * m, 6.5 * m, 8), fer); p.position.set(xx, 3.25 * m, z); ville.add(p);
    const bras = new THREE.Mesh(new THREE.BoxGeometry(0.08 * m, 0.08 * m, 1.6 * m), fer); bras.position.set(xx, 6.4 * m, z - s * 0.8 * m); ville.add(bras);
    const tete = new THREE.Mesh(new THREE.BoxGeometry(0.35 * m, 0.12 * m, 0.7 * m), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 2.6) })); tete.position.set(xx, 6.32 * m, z - s * 1.4 * m); ville.add(tete);
    const h = halo(THREE, '#e9dcff', 2.4 * m, 0.7); h.position.set(xx, 6.2 * m, z - s * 1.4 * m); ville.add(h);
    obstacles.push(obbDecor('lampadaire', xx, z, 0.12 * m, 0.12 * m, 0, 6.5 * m));
    lampes.push([xx, z]);
  }
  // câbles électriques en chaînette + lanternes rouges
  const lant = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.35, 0.25) }), cables = [];
  for (let x = X0 + 6 * m; x < X1; x += 14 * m) {
    const pts = []; const y0 = R(7.5, 9) * m, fl = 1.2 * m;
    for (let i = 0; i <= 16; i++) { const f = i / 16, z = lerp(-ZF + 0.3 * m, ZF - 0.3 * m, f); pts.push(new THREE.Vector3(x + f * 3 * m, y0 - fl * 4 * f * (1 - f), z)); }
    cables.push(...pts.slice(0, -1).flatMap((p, i) => [p, pts[i + 1]]));
    if (rnd() < 0.6) for (let i = 2; i < 16; i += 2) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.22 * m, 10, 8), lant); l.scale.y = 1.3; l.position.copy(pts[i]).add(new THREE.Vector3(0, -0.35 * m, 0)); ville.add(l); }
  }
  ville.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cables), new THREE.LineBasicMaterial({ color: 0x120c1a })));

  /* ───────── reflets : la ville renversée sous la chaussée laquée ───────── */
  const miroirVille = ville.clone(true); miroirVille.scale.y = -1; miroirVille.name = 'tokyo-ville-miroir'; groupe.add(miroirVille);
  const texRoute = texCanvas(THREE, 256, 1024, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.fillStyle = 'rgba(255,255,255,1)';
  }, { repeter: true });
  texRoute.repeat.set(1, (X1 - X0) / (14 * m));
  const route = new THREE.Mesh(new THREE.PlaneGeometry(2 * DEMI, X1 - X0), new THREE.MeshStandardMaterial({ color: 0x2a1c3c, map: texRoute, roughness: 0.16, metalness: 0.55, transparent: true, opacity: 0.8, envMapIntensity: 0.9 }));
  route.rotation.set(-Math.PI / 2, 0, Math.PI / 2); route.position.set((X0 + X1) / 2, 0, 0); route.renderOrder = 2; groupe.add(route);
  // marquages : ligne centrale en tirets, lignes de rive
  const mb = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.88, 0.95), transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (let x = X0; x < X1; x += 6 * m) { const t = new THREE.Mesh(new THREE.PlaneGeometry(3 * m, 0.14 * m), mb); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.01 * m, 0); t.renderOrder = 3; groupe.add(t); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 0.14 * m), mb); t.rotation.x = -Math.PI / 2; t.position.set((X0 + X1) / 2, 0.01 * m, s * (DEMI - 0.3 * m)); t.renderOrder = 3; groupe.add(t); }
  // plancher sombre sous les reflets (ferme la vue sous la chaussée)
  const fondR = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 2 * ZF + 200 * m), new THREE.MeshBasicMaterial({ color: 0x140a20 })); fondR.rotation.x = -Math.PI / 2; fondR.position.set((X0 + X1) / 2, -120 * m, 0); groupe.add(fondR);

  /* ───────── pluie ───────── */
  const pluie = creerPluie(THREE, rnd, { n: 6000, centre: [40 * m, 7 * m, 0], taille: [120 * m, 16 * m, 2 * ZF], vitesse: [-1.4 * m, -10 * m, 0.5 * m], longueur: 0.6 * m, couleur: '#ffd6f4', alpha: 0.2, proche: 1.4 * m });
  groupe.add(pluie.mesh);

  /* ───────── les voitures (+ phares, reflets) ───────── */
  const flotte = voitures.map((v, k) => {
    const b = v.boite, solY = -b.min.y, W = b.max.x - b.min.x, Hc = b.max.y - b.min.y;
    v.env.v7.reel.eclairer(v.code === 'TK05' ? 0.4 : 1, 0);
    for (const s of [-1, 1]) { const h = halo(THREE, '#f2f6ff', 0.9 * m, 0.85); h.position.set(s * W * 0.32, b.min.y + Hc * 0.36, b.max.z + 0.05 * m); v.env.add(h);
      const r = halo(THREE, '#ff2a3a', 0.6 * m, 0.7); r.position.set(s * W * 0.34, b.min.y + Hc * 0.45, b.min.z - 0.05 * m); v.env.add(r); }
    groupe.add(v.env);
    const mir = ctx.decors.creerMiroirModele(THREE, v.env); mir.racine.visible = true; groupe.add(mir.racine);
    return { ...v, solY, mir, ph: k * 1.9, cz: (b.min.z + b.max.z) / 2 };
  });
  // ombres de contact (corps + roues) dessinées APRÈS la chaussée laquée semi-transparente (renderOrder 2)
  const ombres = creerOmbres(THREE, flotte.map((f) => ({ env: f.env, boite: f.boite })), { sol: () => 0 });
  ombres.groupe.traverse((o) => { if (o.isMesh) o.renderOrder = 3; }); groupe.add(ombres.groupe);

  /* ───────── chorégraphie V9.2 (extrait montré : 11,0 → 14,0 s) ─────────
     11,0 → 12,85  la caméra remonte la file (3/4 avant, voie opposée) de la Pikachu Car à la Skyline
     12,85         la Skyline (TK02) déboîte droit et accélère (étincelles), double la caméra, plonge dans un rift ouvert sur sa
                   voie : son arrière le franchit à ~13,97 s (raccord avec le téléphone de l'arène) */
  const T_GO = 12.85, ACC = 30 * m, AMP = 0.32 * m, OM = 0.85;
  const sortie = (t) => (t <= T_GO ? 0 : 0.5 * ACC * (t - T_GO) * (t - T_GO));
  /** Pose de la voiture k : file à allure constante, ondulation latérale douce (cap = direction de la vitesse) ; la Skyline
      s'aligne et accélère à T_GO. */
  function poseVoiture(k, t) {
    const f = flotte[k], tt = t - 10, go = k === 0 ? smoother((t - T_GO) / 0.25) : 0, s = k === 0 ? sortie(t) : 0;
    const x = -k * ESP + V * tt + s, vx = V + (k === 0 && t > T_GO ? ACC * (t - T_GO) : 0);
    const z = ZV + AMP * Math.sin(OM * t + f.ph) * (1 - go), dz = AMP * OM * Math.cos(OM * t + f.ph) * (1 - go);
    const cap = Math.atan2(vx, dz), roulis = -0.012 * Math.sin(OM * t + f.ph) * (1 - go);
    const squat = k === 0 && t > T_GO ? Math.exp(-(t - T_GO) * 4) * smoother((t - T_GO) / 0.06) : 0;
    return { pos: [x, f.solY, z], cap, capVitesse: cap, heave: 0.004 * m * Math.sin(t * 13 + k) - 0.025 * m * squat, tangage: -0.03 * squat, pente: 0, roulis,
      dist: V * tt + s + 40 * m, braquage: (Math.PI / 2 - cap) * 1.4, coins: {} };
  }
  const T_FRANCHI = 13.97, pFr = poseVoiture(0, T_FRANCHI);
  const XR = pFr.pos[0] + flotte[0].boite.min.z, ZR = pFr.pos[2];                   // l'arrière de la Skyline atteint le plan à 13,97 s
  const rift = creerRift(THREE, { rayon: 2.0 * m }); rift.groupe.position.set(XR, 1.2 * m, ZR); rift.groupe.rotation.y = Math.PI / 2; groupe.add(rift.groupe);
  const portail = { x: XR, z: ZR, nx: 1, nz: 0 };
  const sky = flotte[0];
  const etincelles = creerEtincelles(THREE, { demiH: ctx.H / 2, evenements: [{
    t0: T_GO + 0.02, t1: T_GO + 0.5, n: 90, vie: [0.2, 0.45], graine: 'tokyo-skyline',
    source: (tb, a) => { const p = poseVoiture(0, tb), sgn = a[0] < 0.5 ? -1 : 1, xa = p.pos[0] + sky.boite.min.z + 0.7 * m;
      return { p: [xa, 0.04 * m, p.pos[2] + sgn * (sky.boite.max.x - sky.boite.min.x) * 0.4], v: [-(60 + 120 * a[1]), 25 + 65 * a[2], sgn * (10 + 40 * a[3])], sol: 0 }; },
  }] });
  groupe.add(etincelles.points);

  /* ───────── lumières : néons roses/cyan, lampadaires, hémisphère violet ───────── */
  const hemi = new THREE.HemisphereLight(0xb07aff, 0x301040, 0.9); groupe.add(hemi);
  const lRose = new THREE.PointLight(0xff4fc0, 1.7, 26 * m, 1.4), lCyan = new THREE.PointLight(0x40e8ff, 1.7, 26 * m, 1.4), lBlanc = new THREE.PointLight(0xeadcff, 1.6, 22 * m, 1.4);
  groupe.add(lRose, lCyan, lBlanc);
  const cle = new THREE.DirectionalLight(0xffd0f0, 0.5); cle.position.set(20 * m, 30 * m, 25 * m); groupe.add(cle); groupe.add(cle.target);
  void sources; void lampes;
  const listeV = flotte.map((f, k) => ({ env: f.env, nom: f.code, portail: k === 0 ? portail : null }));

  return {
    groupe, obstacles, voitures: listeV,
    maj(t) {
      ciel.maj(t); pluie.maj(t);
      const posesO = flotte.map((f, k) => {
        const p = poseVoiture(k, t);
        ctx.poser(f.env, p); f.env.v7.reel.eclairer(f.code === 'TK05' ? 0.4 : 1, 0);
        const passee = k === 0 && p.pos[0] + f.boite.min.z > XR;
        f.env.visible = !passee;
        f.env.updateMatrixWorld(true); f.mir.sync();
        return passee ? null : { pos: [p.pos[0], 0, p.pos[2]], heave: p.heave, cap: p.cap, phase: 'sol' };
      });
      ombres.maj(posesO);
      etincelles.maj(t);
      rift.maj(t, smoother((t - 13.0) / 0.3));
      // caméra : remonte la file (point suivi de la voiture k = 3 à la Skyline), puis poursuit la Skyline qui la double
      const u = clamp((t - 11.0) / (T_GO - 11.0)), kf = lerp(3, 0, smoother(u));
      const xs = -kf * ESP + V * (Math.min(t, T_GO) - 10);
      const tau = Math.max(0, t - T_GO);
      const xCam = xs + lerp(5.0, 3.4, u) * m + V * tau + 0.5 * 10 * m * tau * tau;
      const p = [xCam, lerp(1.35, 1.2, u) * m, ZV + 3.0 * m];
      const pS = poseVoiture(0, t);
      const cSky = [pS.pos[0] + sky.cz * Math.sin(pS.cap) - 0.6 * m * (1 - smoother(tau / 0.4)), 0.95 * m, pS.pos[2] - 0.4 * m * (1 - smoother(tau / 0.4))];
      const cFile = [xs - 0.6 * m, 0.95 * m, ZV - 0.4 * m];
      const kS = smoother(1 - kf);                                                          // la visée rejoint la Skyline quand le suivi l'atteint
      let c = [lerp(cFile[0], cSky[0], kS), lerp(cFile[1], cSky[1], kS), lerp(cFile[2], cSky[2], kS)];
      const kR = smoother((t - 13.6) / 0.35);                                                 // fin : la visée glisse vers le cœur du rift
      c = [lerp(c[0], XR + 1 * m, kR), lerp(c[1], 1.2 * m, kR), lerp(c[2], ZR, kR)];
      // lumières qui accompagnent la caméra (néons de part et d'autre de la file)
      lRose.position.set(xCam + 0 * m, 5 * m, -ZF + 1.2 * m); lCyan.position.set(xCam - 7 * m, 5.5 * m, ZF - 1.2 * m); lBlanc.position.set(xCam - 3 * m, 6 * m, DEMI - 1.4 * m);
      return {
        camera: { p, c, fov: 46, near: 0.1 * m, far: 2200 * m },
        fond: 0x7a2c90, brouillard: { couleur: FOG, densite: DENS * 0.55 },
        lumieres: { hemi: 0.2, cle: 0.25 },
        post: { exposition: 0.88, vignette: 0.42, saturation: 1.15, bloomForce: 0.58, aberration: 0.0007 },
      };
    },
  };
}
