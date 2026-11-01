/* MONDE 2 du segment « familles » — LES F1 SUR LA LIGNE ARC-EN-CIEL (temps interne 5 → 10 s).

   Grille de départ en plein jour sur une piste à CINQ VOIES arc-en-ciel (rouge #ff3b3b, orange #ff9a1a, jaune #ffe23d, vert #35e07a,
   bleu #3fa9ff), séparées par des lignes blanches — le teasing direct de la piste Hot Wheels du soir. Ligne de départ à damier,
   vibreurs rouge et blanc, herbe, muret des stands, tribune colorée sous auvent, collines et arbres, ciel bleu à nuages blancs.
   Cinq F1 alignées, une par voie : F03 (rouge), F02 (orange), F04 (jaune), F01 (vert), F06 (bleu). Moteurs au ralenti :
   micro-pilonnement (somme de sinus, amplitude ~3 mm « réels »), aucune translation, aucun tremblement de caméra.
   Portique de 5 feux rouges : la colonne k s'allume à 5,6 + 0,8·k s (5,6 → 8,8 s).
   Caméra : travelling bas DERRIÈRE la grille, de la voie rouge vers la voie bleue, regard vers le portique (les 5 voies fuient
   vers les feux). Repère : voitures vers +x, voie k centrée en z = (k − 2)·LV ; sol y = 0 ; m = 1 mètre « monde » en cm. */
import { prng, texCanvas, halo, creerCiel, ombreContact, obbDecor } from './familles_outils.js';

export const COULEURS_VOIES = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'];
export const FEUX = [5.6, 6.4, 7.2, 8.0, 8.8];

export function creerF1(ctx, voitures) {
  const { THREE, outils } = ctx, { clamp, lerp, smoother } = outils;
  const rnd = prng('familles-f1'), R = (a, b) => a + rnd() * (b - a);
  const groupe = new THREE.Group(); groupe.name = 'familles-f1';
  const b0 = voitures[0].boite, L = b0.max.z - b0.min.z;
  const m = L / 5.6;                                    // une F1 2025 mesure ~5,6 m
  const LV = 3.5 * m, NV = 5, LARG = LV * NV, LIGNE = 0.16 * m;
  const XD = 3.3 * m;                                   // ligne de départ (devant les nez, alignés à x = XD − 0,5 m)
  const XP = XD + 14 * m;                               // portique des feux
  const obstacles = [];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05, ...o });

  /* ───────── ciel bleu, soleil, nuages blancs ───────── */
  const dirSol = [0.35, 0.62, -0.7];
  const ciel = creerCiel(THREE, { rayon: 2400 * m, haut: '#2a7be0', milieu: '#6fb4f2', bas: '#cfe8ff', nuages: 0.8, couleurNuage: '#ffffff', clairNuage: 0.9,
    soleil: { dir: dirSol, couleur: '#fff4d8', force: 1.0 }, echelle: 0.9, vent: 0.006 });
  groupe.add(ciel.mesh);

  /* ───────── la piste : 5 voies arc-en-ciel, lignes blanches, grain d'asphalte coloré ───────── */
  const texPiste = texCanvas(THREE, 1024, 256, (g, w, h) => {
    // axe u = largeur de piste (z), axe v = longueur (x) ; 1024 px = LARG
    const lv = w / NV;
    // u = 0 correspond à z = +LARG/2 (voie bleue) : on peint de la voie 4 à la voie 0
    COULEURS_VOIES.forEach((c, k) => { g.fillStyle = c; g.fillRect((NV - 1 - k) * lv, 0, lv, h); });
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.fillStyle = '#ffffff'; const lp = Math.max(3, LIGNE / LARG * w);
    for (let k = 0; k <= NV; k++) g.fillRect(k * lv - lp / 2, 0, lp, h);
  }, { repeter: true });
  texPiste.wrapS = THREE.ClampToEdgeWrapping;
  const LONG = 900 * m;
  texPiste.repeat.set(1, LONG / (12 * m));
  const piste = new THREE.Mesh(new THREE.PlaneGeometry(LARG, LONG), std({ map: texPiste, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.3 }));
  piste.rotation.x = -Math.PI / 2; piste.rotation.z = Math.PI / 2; piste.position.set(LONG / 2 - 300 * m, 0, 0); groupe.add(piste);
  // ligne de départ à damier (2 rangées) + marquage des cases de grille (crochets blancs)
  const texDamier = texCanvas(THREE, 512, 32, (g, w, h) => {
    const n = 64, c = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fafafa'; g.fillRect(i * c, j * h / 2, c, h / 2); }
  });
  const damier = new THREE.Mesh(new THREE.PlaneGeometry(LARG, 0.9 * m), new THREE.MeshStandardMaterial({ map: texDamier, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  damier.rotation.x = -Math.PI / 2; damier.rotation.z = Math.PI / 2; damier.position.set(XD, 0.02 * m, 0); groupe.add(damier);
  const blanc = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (let k = 0; k < NV; k++) {
    const z = (k - 2) * LV;
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.15 * m, 0.9 * m), blanc); c.rotation.x = -Math.PI / 2; c.position.set(XD - 1.1 * m, 0.02 * m, z + s * LV * 0.36); c.rotation.z = Math.PI / 2; groupe.add(c);
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * m, 0.15 * m), blanc); d.rotation.x = -Math.PI / 2; d.position.set(XD - 0.7 * m, 0.02 * m, z + s * LV * 0.36 - s * 0.38 * m); d.rotation.z = Math.PI / 2; groupe.add(d); }
  }
  // vibreurs rouge/blanc puis herbe
  const texVib = texCanvas(THREE, 64, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f4f4' : '#e8262c'; g.fillRect(0, i * h / 8, w, h / 8); } }, { repeter: true });
  texVib.repeat.set(1, LONG / (8 * m));
  for (const s of [-1, 1]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * m, LONG), std({ map: texVib, roughness: 0.5 })); v.rotation.x = -Math.PI / 2; v.rotation.z = Math.PI / 2;
    v.rotation.set(-Math.PI / 2, 0, Math.PI / 2); v.position.set(LONG / 2 - 300 * m, 0.01 * m, s * (LARG / 2 + 0.6 * m)); groupe.add(v);
  }
  const texHerbe = texCanvas(THREE, 256, 256, (g, w, h) => { g.fillStyle = '#3fae4a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '20,90,30' : '120,210,110'},${rnd() * 0.25})`; g.fillRect(rnd() * w, rnd() * h, 2, 3); }
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, i * h / 8, w, h / 16); } }, { repeter: true });
  texHerbe.repeat.set(200, 200);
  const herbe = new THREE.Mesh(new THREE.PlaneGeometry(2400 * m, 2400 * m), std({ map: texHerbe, roughness: 0.95 })); herbe.rotation.x = -Math.PI / 2; herbe.position.y = -0.02 * m; groupe.add(herbe);

  /* ───────── muret des stands (côté bleu, +z) et barrière (côté rouge, −z) ───────── */
  const zMur = LARG / 2 + 4.5 * m;
  const texMur = texCanvas(THREE, 1024, 64, (g, w, h) => {
    const cs = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff', '#ffffff'];
    for (let i = 0; i < 16; i++) { g.fillStyle = cs[i % cs.length]; g.fillRect(i * w / 16, 0, w / 16, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(i * w / 16, h * 0.78, w / 16, h * 0.22); }
  }, { repeter: true });
  texMur.repeat.set(LONG / (64 * m), 1);
  for (const s of [-1, 1]) {
    const z = s * zMur, mur = new THREE.Mesh(new THREE.BoxGeometry(LONG, 1.1 * m, 0.4 * m), [std({ color: 0xdedede }), std({ color: 0xdedede }), std({ color: 0xeeeeee }), std({ color: 0xdedede }), std({ map: texMur }), std({ map: texMur })]);
    mur.position.set(LONG / 2 - 300 * m, 0.55 * m, z); groupe.add(mur);
    obstacles.push(obbDecor('muret', mur.position.x, z, LONG / 2, 0.2 * m, 0, 1.1 * m));
    // grillage de sécurité : fins poteaux
    const poteaux = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04 * m, 0.04 * m, 3.2 * m, 6), std({ color: 0x9aa3ad, metalness: 0.6, roughness: 0.4 }), 120), M4 = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) { M4.makeTranslation(-200 * m + i * 5 * m, 2.7 * m, z); poteaux.setMatrixAt(i, M4); }
    poteaux.frustumCulled = false; groupe.add(poteaux);
    const filet = new THREE.Mesh(new THREE.PlaneGeometry(600 * m, 2.6 * m), new THREE.MeshBasicMaterial({ color: 0xc8d4e0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    filet.position.set(100 * m, 2.6 * m, z); groupe.add(filet);
  }

  /* ───────── tribune colorée sous auvent (côté +z) et garages des stands (côté −z) ───────── */
  const zTrib = zMur + 14 * m;
  const gradins = new THREE.Group();
  for (let r = 0; r < 9; r++) { const g = new THREE.Mesh(new THREE.BoxGeometry(160 * m, 0.6 * m, 1.1 * m), std({ color: 0xb8c2cc })); g.position.set(10 * m, 0.3 * m + r * 0.75 * m, zTrib + r * 1.1 * m); gradins.add(g); }
  groupe.add(gradins);
  const nFoule = 2200, foule = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45 * m, 0.7 * m, 0.35 * m), std({ color: 0xffffff, roughness: 0.8 }), nFoule), M4 = new THREE.Matrix4();
  const palette = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff', '#ffffff', '#ff6fd0', '#1c3f8f'].map((c) => new THREE.Color(c));
  for (let i = 0; i < nFoule; i++) { const r = Math.floor(rnd() * 9); M4.makeTranslation(10 * m + R(-79, 79) * m, 0.95 * m + r * 0.75 * m, zTrib + r * 1.1 * m + R(-0.2, 0.2) * m); foule.setMatrixAt(i, M4); foule.setColorAt(i, palette[Math.floor(rnd() * palette.length)]); }
  foule.frustumCulled = false; groupe.add(foule);
  const auvent = new THREE.Mesh(new THREE.BoxGeometry(164 * m, 0.4 * m, 14 * m), std({ color: 0xffffff, roughness: 0.4 })); auvent.position.set(10 * m, 10.5 * m, zTrib + 4.5 * m); auvent.rotation.x = -0.08; groupe.add(auvent);
  for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * m, 0.25 * m, 10.5 * m, 10), std({ color: 0xe0e0e0, metalness: 0.5 })); p.position.set(-70 * m + i * 20 * m, 5.25 * m, zTrib + 10 * m); groupe.add(p); }
  const zStand = -zMur - 9 * m;
  const stands = new THREE.Mesh(new THREE.BoxGeometry(220 * m, 7 * m, 12 * m), std({ color: 0xf2f4f7 })); stands.position.set(20 * m, 3.5 * m, zStand - 6 * m); groupe.add(stands);
  for (let i = 0; i < 18; i++) {
    const c = COULEURS_VOIES[i % 5], bx = new THREE.Mesh(new THREE.PlaneGeometry(8 * m, 4.6 * m), new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.4, emissive: new THREE.Color(c), emissiveIntensity: 0.25 }));
    bx.position.set(-80 * m + i * 11.5 * m, 2.6 * m, zStand + 0.02 * m); groupe.add(bx);
  }
  const bandeau = new THREE.Mesh(new THREE.BoxGeometry(220 * m, 1.4 * m, 0.3 * m), std({ color: 0x1c3f8f })); bandeau.position.set(20 * m, 6.4 * m, zStand + 0.1 * m); groupe.add(bandeau);

  /* ───────── collines, arbres, ballons ───────── */
  const coll = std({ color: 0x4fae5e, roughness: 1 });
  for (let i = 0; i < 14; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(R(90, 180) * m, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), coll); h.scale.y = R(0.25, 0.45); h.position.set(R(250, 900) * m, -2 * m, R(-900, 900) * m); groupe.add(h); }
  const nArb = 260, arbres = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), std({ color: 0x2d8a3e, roughness: 0.9 }), nArb);
  for (let i = 0; i < nArb; i++) { const s = R(2.5, 5) * m, hh = s * R(2.2, 3.2); let x = R(-250, 450) * m, z = (rnd() < 0.5 ? -1 : 1) * R(70, 260) * m; M4.makeScale(s, hh, s); M4.setPosition(x, hh / 2, z); arbres.setMatrixAt(i, M4); }
  arbres.frustumCulled = false; groupe.add(arbres);

  /* ───────── portique des 5 feux ───────── */
  const portique = new THREE.Group(), noir = std({ color: 0x15171c, roughness: 0.45, metalness: 0.5 }), gris = std({ color: 0xc9ced6, roughness: 0.35, metalness: 0.7 });
  const HPq = 7.2 * m, demiP = LARG / 2 + 2.6 * m;
  for (const s of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.7 * m, HPq + 1.2 * m, 0.7 * m), gris); pil.position.set(0, (HPq + 1.2 * m) / 2, s * demiP); portique.add(pil);
    obstacles.push(obbDecor('pilier-portique', XP, s * demiP, 0.35 * m, 0.35 * m, 0, HPq + 1.2 * m));
  }
  const poutre = new THREE.Mesh(new THREE.BoxGeometry(0.9 * m, 1.0 * m, 2 * demiP + 0.7 * m), gris); poutre.position.set(0, HPq + 0.6 * m, 0); portique.add(poutre);
  const feux = [], matOff = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.09, 0.012, 0.012) });
  for (let k = 0; k < 5; k++) {
    const z = (k - 2) * 1.5 * m;
    const boite = new THREE.Mesh(new THREE.BoxGeometry(0.6 * m, 2.6 * m, 1.05 * m), noir); boite.position.set(-0.4 * m, HPq - 0.9 * m, z); portique.add(boite);
    const col = { lampes: [], halos: [] };
    for (const dy of [-0.55, 0.55]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.36 * m, 20), matOff()); l.rotation.y = -Math.PI / 2; l.position.set(-0.71 * m, HPq - 0.9 * m + dy * m, z); portique.add(l);
      const vis = new THREE.Mesh(new THREE.TorusGeometry(0.4 * m, 0.06 * m, 6, 20), noir); vis.rotation.y = Math.PI / 2; vis.position.set(-0.72 * m, HPq - 0.9 * m + dy * m, z); portique.add(vis);
      const h = halo(THREE, '#ff2a1a', 3.2 * m, 0); h.position.set(-1.0 * m, HPq - 0.9 * m + dy * m, z); portique.add(h);
      col.lampes.push(l); col.halos.push(h);
    }
    feux.push(col);
  }
  portique.position.set(XP, 0, 0); groupe.add(portique);

  /* ───────── les 5 F1 sur la grille ───────── */
  const poses = voitures.map((v, k) => {
    const b = v.boite, solY = -b.min.y, z = (k - 2) * LV;
    const x = XD - 0.55 * m - b.max.z;                 // le nez s'arrête à 55 cm de la ligne
    v.env.v7.reel.eclairer(0.2, 0);
    groupe.add(v.env);
    const om = ombreContact(THREE, b.max.z - b.min.z, b.max.x - b.min.x, 0.6); om.position.set(x + (b.min.z + b.max.z) / 2, 0.03 * m, z); om.rotation.z = Math.PI / 2; groupe.add(om);
    return { x, y: solY, z, ph: k * 1.37 };
  });

  /* ───────── soleil + ciel ───────── */
  const soleil = new THREE.DirectionalLight(0xfff1dc, 2.1); soleil.position.set(dirSol[0] * 100 * m, dirSol[1] * 100 * m, dirSol[2] * 100 * m); groupe.add(soleil); groupe.add(soleil.target);
  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x4c8a40, 1.05); groupe.add(hemi);
  const rebond = new THREE.DirectionalLight(0xffffff, 0.6); rebond.position.set(-60 * m, 20 * m, 30 * m); groupe.add(rebond); groupe.add(rebond.target);

  /* ───────── caméra : travelling bas derrière la grille (spline lente) ───────── */
  const xArr = Math.min(...poses.map((p, k) => p.x + voitures[k].boite.min.z));

  return {
    groupe, obstacles, voitures: voitures.map((v) => ({ env: v.env, nom: v.code })),
    maj(t) {
      ciel.maj(t);
      // ralenti moteur : micro-pilonnement + roulis infime (somme de sinus, fonction pure de t)
      voitures.forEach((v, k) => {
        const p = poses[k], ph = p.ph;
        const heave = (0.010 * Math.sin(t * 2 * Math.PI * 7.3 + ph) + 0.006 * Math.sin(t * 2 * Math.PI * 11.1 + ph * 2.1)) * m;
        const roulis = 0.0025 * Math.sin(t * 2 * Math.PI * 5.2 + ph * 1.3);
        ctx.poser(v.env, { pos: [p.x, p.y, p.z], cap: Math.PI / 2, capVitesse: Math.PI / 2, heave, tangage: 0.0015 * Math.sin(t * 2 * Math.PI * 6.1 + ph), pente: 0, roulis, dist: 0, braquage: 0, coins: {} });
        v.env.v7.reel.eclairer(0.25, 0);
      });
      // feux : la colonne k s'allume à FEUX[k] (montée 60 ms)
      feux.forEach((f, k) => {
        const on = smoother((t - FEUX[k]) / 0.06);
        for (const l of f.lampes) l.material.color.setRGB(0.09 + 3.2 * on, 0.012 + 0.05 * on, 0.012 + 0.03 * on);
        for (const h of f.halos) h.material.opacity = 0.95 * on;
      });
      const u = clamp((t - 5) / 5), e = u * 0.75 + 0.25 * smoother(u);
      const zc = lerp(-2.75 * LV, 2.75 * LV, e);
      const p = [xArr - lerp(5.0, 4.2, u) * m, lerp(1.05, 1.25, u) * m, zc];
      const c = [XP + 6 * m, 2.1 * m, zc * 0.42];
      return {
        camera: { p, c, fov: 40, near: 0.1 * m, far: 3000 * m },
        fond: 0x6fb4f2, brouillard: { couleur: '#cfe6ff', densite: 0.0009 / m },
        lumieres: { hemi: 0.15, cle: 0.4 },
        post: { exposition: 0.8, vignette: 0.3, saturation: 1.12, bloomForce: 0.3, aberration: 0.0004 },
      };
    },
  };
}
