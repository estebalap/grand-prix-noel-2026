/* Chantier V5 — modèles refaits (escouade « pop_h ») : P03, P04, H09, H12, H02, H07. Ce module prime sur groupe1..10.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo, aucune marque : formes, couleurs et motifs génériques uniquement.
 * `plafond` = hauteur de pavillon / largeur hors tout de la vraie voiture (ou de la miniature quand il n'existe pas de modèle réel). */
import { routiere, interpSt } from './aide_4.js';
import { aide } from './aide_5.js';
import { kit } from './aide_7.js';

/* ------------------------------------------------------------------ aides communes de l'escouade */
/** Matériau lumineux plat (non éclairé) : optiques. */
const lumiere = (k, hex) => k.garde(new k.THREE.MeshBasicMaterial({ color: new k.THREE.Color(hex) }));
/** Étoile à cinq branches dessinée sur un canvas. */
function etoile(g, cx, cy, R, col, r = 0.45) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * r : R; (i ? g.lineTo : g.moveTo).call(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); }
/** Plaque découpée dans le plan (z, y) (vue de face), extrudée sur `ep` le long de x, puis inclinée de `incl` (recul du haut vers −x). */
function plaqueFace(k, pts, ep, mat, x, y, incl = 0, z = 0) {
  const m = k.lame(pts, ep, mat, 0, 0.03);
  m.rotation.set(0, Math.PI / 2, 0); m.rotateOnWorldAxis(new k.THREE.Vector3(0, 0, 1), incl); m.position.set(x, y, z); return m;
}
/** Pare-brise GALBÉ enveloppant : portion de cylindre ouvert (rayon r, ouverture `ouv` rad, hauteur h) dont la base avant
 *  est posée en (x, y), incliné de `incl` (haut vers l'arrière), élargi en z de `kz` ; peint par `dessin` (canvas u = tour). */
function pareBriseGalbe(k, ctx, { x, y, r, h, ouv, incl, kz = 1, dessin }) {
  const { THREE } = k;
  const g = new THREE.CylinderGeometry(r, r, h, 32, 1, true, Math.PI / 2 - ouv / 2, ouv);
  g.translate(-r, h / 2, 0);                                                    // l'arc avant passe par l'origine, base à y = 0
  const m = new THREE.Mesh(ctx.garde(g), k.matDecal(dessin, 512, 160));
  m.scale.z = kz; m.rotation.z = incl; m.position.set(x, y, 0); return k.o.ajouter(m);
}
/** Toile d'araignée (rayons + arcs) depuis le coin (cx, cy), quart de disque orienté par a0. */
function toile(g, cx, cy, R, a0, col, lw = 3, n = 8, m = 7) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  for (let i = 0; i <= n; i++) { const a = a0 + i * (Math.PI / 2) / n; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
  for (let j = 1; j <= m; j++) {                                         // arcs festonnés entre rayons (fil qui pend)
    const r = R * j / m; g.beginPath();
    for (let i = 0; i < n; i++) { const a1 = a0 + i * (Math.PI / 2) / n, a2 = a1 + (Math.PI / 2) / n, am = (a1 + a2) / 2, rm = r * 0.9;
      const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r], p2 = [cx + Math.cos(a2) * r, cy + Math.sin(a2) * r];
      if (!i) g.moveTo(...p1); g.quadraticCurveTo(cx + Math.cos(am) * rm, cy + Math.sin(am) * rm, ...p2); }
    g.stroke();
  }
}

/* ================================================================== P03 : Ghoul Mobile, édition goth
 * Cabriolet de poupée COMPACT (L ≈ 6,35, empattement 3,8 : roues énormes, porte-à-faux courts) : caisse noire pailletée
 * à ailes gonflées, moulure rose continue (bouclier → arche avant → bas de caisse → arche arrière → poupe), deux sièges
 * roses très hauts à dossiers « cornes », pare-brise rose à flammes, ailerons de chauve-souris tissés de toile,
 * toile rose sur le capot, phares verts en amande et antibrouillards jaunes, jantes à jours magenta. */
function ghoulMobile(ctx) {
  const { lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const peint = o.lac('#1b181f', 0.3, 0.55);                                      // noir pailleté (métal + vernis)
  const rose = o.lac('#f2a0c8', 0.45, 0.04), roseS = o.mat('#f39ccb', 0.6, 0.04), sombre = o.mat('#0c0b10', 0.85, 0.1);
  // paillettes : grains de rugosité semés sur la laque (reflets scintillants sous la lumière)
  { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, 256, 256);
    let s = 7; const alea = () => (s = (s * 16807) % 2147483647) / 2147483647;     // pseudo-aléa déterministe : même rendu à chaque reveal
    for (let i = 0; i < 2600; i++) { g.fillStyle = alea() < 0.5 ? '#101010' : '#3a3a3a'; g.fillRect(alea() * 256, alea() * 256, 1.4, 1.4); }
    const t = ctx.garde(new THREE.CanvasTexture(cv)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); peint.roughnessMap = t; peint.roughness = 0.55; }
  const xv = 1.85, xr = -1.95, xN = 2.98, xQ = -2.95;                            // essieux, nez, poupe
  const B = [
    { x: xQ, w: 0.86, y0: 0.62, y1: 1.22, nt: 2.6, nb: 2.6 },
    { x: xQ + 0.2, w: 1.1, y0: 0.46, y1: 1.42, nt: 2.8, nb: 3 },
    { x: xr, w: 1.24, y0: 0.42, y1: 1.5, nt: 2.8, nb: 3 },
    { x: -1.0, w: 1.12, y0: 0.42, y1: 1.37, nt: 2.8, nb: 3 },
    { x: 0.35, w: 1.1, y0: 0.42, y1: 1.34, nt: 2.8, nb: 3 },
    { x: xv, w: 1.22, y0: 0.42, y1: 1.48, nt: 2.6, nb: 3 },
    { x: xN - 0.38, w: 1.12, y0: 0.45, y1: 1.24, nt: 2.6, nb: 3 },
    { x: xN, w: 0.88, y0: 0.54, y1: 1.0, nt: 2.4, nb: 2.6 }];
  const rs = [k.roue(xv, 0.62, 0.56, 1.22, { avant: true, sortie: 0.07 }), k.roue(xr, 0.64, 0.6, 1.24, { sortie: 0.07 })];
  k.loft(B, peint, { arches: k.arches(rs, 1.14) }); k.puits(rs);
  // ailes roses gonflées SOUDÉES à la caisse (coquilles d'aile sur toute la largeur du pneu, du moyeu avant au moyeu arrière)
  k.ailes(rs, rose, { t: 0.14, jeu: 0.12, arrondi: 0.04, a0: 0.02, a1: Math.PI - 0.02, deb: 0.05, rentre: 0.12 });
  // bas de caisse rose continu + boucliers roses : lofts à bouts arrondis qui viennent buter sur les pieds d'ailes (hors pneus)
  const bout = (r) => r.RW + 0.2;
  const troncon = (xa, xb, y0, y1, w, n = 4) => { const st = []; for (let i = 0; i <= n; i++) st.push({ x: xa + (xb - xa) * i / n, w, y0, y1, nt: 3, nb: 3 }); k.loft(st, rose, { nx: 40, ns: 36 }); };
  troncon(xr + bout(rs[1]), xv - bout(rs[0]), 0.36, 0.72, 1.24);                    // bas de caisse (gonflé sous les portières)
  troncon(xv + bout(rs[0]), xN + 0.16, 0.4, 0.78, 1.0);                             // bouclier avant enveloppant
  troncon(xQ - 0.14, xr - bout(rs[1]), 0.46, 0.82, 1.04);                           // bouclier arrière
  // habitacle ouvert : cuve sombre, deux sièges roses à dossiers « cornes » (volumes arrondis, plus bas que le pare-brise)
  k.ellipsoide(1.05, 0.08, 0.86, sombre, -0.45, 1.31, 0, 28);
  const dossier = [[-0.24, 0], [0.24, 0], [0.25, 0.34]];
  for (let i = 0; i <= 10; i++) { const t = Math.PI * i / 10; dossier.push([0.165 + 0.085 * Math.cos(t), 0.42 + 0.14 * Math.sin(t)]); }    // oreille +z
  for (let i = 1; i < 10; i++) { const t = Math.PI * i / 10; dossier.push([0.08 * Math.cos(t), 0.42 - 0.14 * Math.sin(t)]); }             // creux en U
  for (let i = 0; i <= 10; i++) { const t = Math.PI * i / 10; dossier.push([-0.165 + 0.085 * Math.cos(t), 0.42 + 0.14 * Math.sin(t)]); }   // oreille −z
  dossier.push([-0.25, 0.34]);
  for (const sg of [-1, 1]) {
    k.ellipsoide(0.32, 0.1, 0.25, roseS, -0.3, 1.38, sg * 0.42, 18);                // assise rembourrée
    const d = plaqueFace(k, dossier, 0.22, roseS, -0.66, 1.34, 0.3, sg * 0.42);     // dossier épais (biseau 3 cm), incliné
    d.geometry.computeVertexNormals();
  }
  // pare-brise rose galbé enveloppant, flammes magenta, incliné comme sur la miniature ; jonc orangé en tête
  const xPB = 0.98, yPB = 1.3, hPB = 0.72, aPB = 0.62;
  pareBriseGalbe(k, ctx, { x: xPB, y: yPB, r: 1.05, h: hPB, ouv: 1.9, incl: aPB, kz: 1.05, dessin: (g, w, h) => {
    g.fillStyle = 'rgba(255,60,170,0.8)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b0106c'; for (let i = 0; i < 9; i++) { const x = w * (0.08 + i * 0.105); g.beginPath(); g.moveTo(x, h * 0.98); g.quadraticCurveTo(x - 12, h * 0.55, x + 6, h * 0.2); g.quadraticCurveTo(x + 10, h * 0.55, x + 22, h * 0.98); g.closePath(); g.fill(); }
    g.fillStyle = '#ff7a3a'; g.fillRect(0, 0, w, h * 0.05);
  } });
  // ailerons de chauve-souris : lames noires relevées vers l'arrière, toile gris-rose drapée dessus (clip sur la lame)
  const fin = [[-1.35, 1.38], [-2.4, 1.44], [xQ + 0.05, 1.32], [xQ - 0.12, 1.6], [xQ - 0.2, 2.05], [xQ + 0.25, 1.9], [-2.2, 1.68], [-1.7, 1.5]];
  const yT = 2.1, hP = 0.82, x0F = xQ - 0.25, lF = 1.95;
  for (const s of [-1, 1]) {
    k.lame(fin, 0.07, peint, s * 0.98);
    const d = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(lF, hP)), k.matDecal((g, w, h) => {
      g.save(); g.beginPath(); fin.forEach(([x, y], i) => { const X = (x - x0F) / lF * w, Y = (yT - y) / hP * h; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.clip();
      g.fillStyle = 'rgba(70,64,78,0.9)'; g.fillRect(0, 0, w, h);
      toile(g, (xQ - 0.2 - x0F) / lF * w, (yT - 2.05) / hP * h, w * 0.95, 0.05, '#e59ad0', 3, 7, 7); g.restore();
    }, 512, 216));
    d.position.set(x0F + lF / 2, yT - hP / 2, s * 1.06); if (s < 0) d.rotation.y = Math.PI; o.ajouter(d);
  }
  // face avant : phares verts en amande, antibrouillards jaunes, bouche « cercueil » ; feux arrière rouges
  for (const s of [-1, 1]) {
    const ph = k.ellipsoide(0.2, 0.08, 0.16, k.deuxFaces(lumiere(k, '#8fd040')), xN - 0.3, k.hautAu(B, xN - 0.3, 0.62) - 0.03, s * 0.62, 14); ph.rotation.y = s * 0.3;
    k.phareRond(xN - 0.02, 0.76, s * 0.55, 0.075, lumiere(k, '#e8d040'), null);
    o.boite(0.06, 0.12, 0.28, lumRouge, xQ + 0.02, 1.05, s * 0.5);
  }
  const cer = k.lame([[-0.2, 0.0], [-0.28, 0.1], [-0.12, 0.2], [0.12, 0.2], [0.28, 0.1], [0.2, 0.0]], 0.08, sombre, 0, 0.01);
  cer.rotation.y = Math.PI / 2; cer.position.set(xN + 0.02, 0.64, 0);
  // capot : contour de cercueil rose + toile d'araignée rose
  k.drapeDessus(B, 0.95, xN - 0.12, -1.05, 1.05, (g, w, h) => {
    const X = (x) => (x - 0.95) / (xN - 1.07) * w, Z = (z) => (z + 1.05) / 2.1 * h;
    g.strokeStyle = '#e88ad6'; g.lineWidth = 7; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(X(1.05), Z(-0.6)); g.lineTo(X(2.2), Z(-0.75)); g.lineTo(X(2.75), Z(0)); g.lineTo(X(2.2), Z(0.75)); g.lineTo(X(1.05), Z(0.6)); g.closePath(); g.stroke();
    toile(g, X(1.05), Z(-0.6), w * 0.55, 0, '#e88ad6', 3, 8, 6);
  }, 512, 512);
  // flancs : toile rose sur la hanche arrière (bas du drapé au-dessus des moyeux : rien dans les passages de roues)
  k.drapeFlancs(B, xQ + 0.05, 1.2, 0.76, 1.5, (g, w, h, c, M) => {
    toile(g, M.X(xQ + 0.05), M.Y(1.5), w * 0.75, 0.02, '#c98ad8', 3, 8, 8);
    M.trouer(g, rs, 1.3);
  }, 1024, 256, 0.024, rs);
  return { L: xN - xQ + 0.4, largeur: 2.6, hauteur: 2.12, xAvant: xN + 0.2, xArriere: xQ - 0.25,
    plafond: 0.69,                                                                   // casting de fantaisie : rapport mesuré sur la photo
    roues: rs.map((r) => ({ ...r, jante: '#1c1a22', rayons: 'cinqCreux', flanc: '#e05ad0', sansFrein: true })) };   // jante noire à jours, cerclage rose
}

/* ================================================================== P04 : Barbie Extra
 * Cabriolet de poupée COMPACT (L ≈ 6,6, empattement 3,9) : caisse blanc nacré semée de paillettes roses, ailes
 * gonflées, grand pare-brise rose enveloppant, sièges et carénages violets, planche saumon, calandre
 * basse pleine largeur à lamelles chromées continues, étoile orange sur chaque flanc avant, ouïes
 * latérales derrière la portière, jantes roses à double branche, liseré de flanc rose. */
function barbieExtra(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  // blanc nacré pailleté rose : carte de couleur blanche semée de grains roses et argent (déterministe)
  const blanc = o.lac('#ffffff', 0.24, 0.12);
  { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#f3f1f6'; g.fillRect(0, 0, 256, 256);
    let s = 11; const alea = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 1500; i++) { g.fillStyle = alea() < 0.6 ? '#ff8fca' : '#ffffff'; g.fillRect(alea() * 256, alea() * 256, 1.3, 1.3); }
    const t = ctx.garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); blanc.map = t; }
  const violet = o.mat('#7b55b8', 0.55, 0.1), saumon = o.mat('#e9917a', 0.55, 0.05), sombre = o.mat('#2a1f3a', 0.8, 0.1);
  const xv = 2.05, xr = -1.95, xN = 3.22, xQ = -3.25;
  const B = [
    { x: xQ, w: 1.06, y0: 0.5, y1: 1.24, nt: 3.6, nb: 3.4 },                        // poupe arrondie et pleine (plus de pointe)
    { x: xQ + 0.22, w: 1.18, y0: 0.42, y1: 1.4, nt: 3.2, nb: 3.2 },
    { x: xr, w: 1.27, y0: 0.4, y1: 1.5, nt: 3, nb: 3.2 },
    { x: -0.9, w: 1.15, y0: 0.4, y1: 1.36, nt: 3, nb: 3.2 },
    { x: 0.5, w: 1.12, y0: 0.4, y1: 1.32, nt: 3, nb: 3.2 },
    { x: xv, w: 1.25, y0: 0.4, y1: 1.46, nt: 3, nb: 3.2 },
    { x: xN - 0.4, w: 1.2, y0: 0.42, y1: 1.18, nt: 3, nb: 3.4 },
    { x: xN, w: 1.1, y0: 0.42, y1: 0.92, nt: 3.4, nb: 4 }];                          // face avant large : bouche pleine largeur
  const rs = [k.roue(xv, 0.6, 0.56, 1.25, { avant: true, sortie: 0.03 }), k.roue(xr, 0.62, 0.62, 1.27, { sortie: 0.03 })];
  k.loft(B, blanc, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, blanc, { t: 0.1, arrondi: 0.04 });                                   // ailes musclées enveloppantes : la tôle coiffe toute la largeur du pneu
  // habitacle ouvert : cuve sombre, sièges violets, carénages d'appuie-tête violets, planche saumon
  k.ellipsoide(1.05, 0.07, 0.86, sombre, -0.5, 1.3, 0, 28);
  for (const s of [-1, 1]) {
    o.boite(0.56, 0.15, 0.58, violet, -0.35, 1.35, s * 0.45);
    k.lame([[-0.95, 1.3], [-0.68, 1.3], [-0.8, 1.66], [-0.9, 1.72], [-1.04, 1.66]], 0.56, violet, s * 0.45, 0.04);
    k.ellipsoide(0.5, 0.13, 0.27, violet, -1.45, k.hautAu(B, -1.45, 0.45) + 0.02, s * 0.45, 16);
  }
  k.ellipsoide(0.28, 0.1, 0.9, saumon, 0.45, 1.32, 0, 18);
  // grand pare-brise rose GALBÉ qui enveloppe l'habitacle (bandeau blanc en tête), couché comme sur la miniature
  pareBriseGalbe(k, ctx, { x: 1.15, y: 1.28, r: 1.0, h: 0.8, ouv: 2.0, incl: 0.78, kz: 1.08, dessin: (g, w, h) => {
    g.fillStyle = 'rgba(255,70,180,0.84)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.38)'; g.fillRect(0, h * 0.2, w, h * 0.06);
    g.fillStyle = '#f4f2f7'; g.fillRect(0, 0, w, h * 0.07);
  } });
  // face avant : bouche basse sur TOUTE la largeur, lamelles chromées continues d'un bord à l'autre de la face
  o.boite(0.03, 0.36, 2 * (k.flancAu(B, xN, 0.66) - 0.08), sombre, xN + 0.005, 0.66, 0);
  for (let i = 0; i < 8; i++) { const y = 0.52 + i * 0.04, zb = k.flancAu(B, xN, y) - 0.06; k.tige([xN + 0.03, y, -zb], [xN + 0.03, y, zb], 0.013, o.chrome, 8); }
  for (const s of [-1, 1]) {
    const ph = k.ellipsoide(0.24, 0.03, 0.14, lumBlanche, xN - 0.4, k.hautAu(B, xN - 0.4, 0.78) - 0.01, s * 0.78, 14); ph.rotation.z = -0.35;
    o.boite(0.06, 0.12, 0.26, lumRouge, xQ + 0.04, 0.98, s * 0.66);
  }
  // poupe : diffuseur violet, étoiles jaunes à côté des feux
  o.boite(0.12, 0.16, 0.9, violet, xQ + 0.04, 0.62, 0);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(0.22, 0.22)), k.matDecal((g, w, h) => etoile(g, w / 2, h / 2, w * 0.48, '#ffc02e'), 64, 64)); st.position.set(xQ - 0.03, 0.98, s * 0.3); st.rotation.y = -Math.PI / 2; o.ajouter(st); }
  // flancs : étoile orange sur l'aile avant, ouïes sculptées derrière la portière, filet rose en bas de caisse
  k.drapeFlancs(B, xQ + 0.05, xN - 0.05, 0.66, 1.3, (g, w, h, c, M) => {             // bas du drapé au-dessus des moyeux
    etoile(g, M.X(1.08), M.Y(0.98), M.Sy(0.22), '#ff7a1e');                       // étoile orange juste derrière l'aile avant
    g.fillStyle = 'rgba(150,158,178,0.85)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(M.X(-1.0 - i * 0.12), M.Y(1.12)); g.lineTo(M.X(-0.85 - i * 0.12), M.Y(1.12)); g.lineTo(M.X(-1.0 - i * 0.12), M.Y(0.7)); g.lineTo(M.X(-1.12 - i * 0.12), M.Y(0.7)); g.closePath(); g.fill(); }
    g.fillStyle = '#ff6fb8'; g.fillRect(M.X(-1.15), M.Y(0.74), M.S(2.3), M.Sy(0.05));
    M.trouer(g, rs);
  }, 1024, 220, 0.024, rs);
  return { L: xN - xQ + 0.05, largeur: 2.6, hauteur: 1.85, xAvant: xN + 0.05, xArriere: xQ - 0.05,
    plafond: 0.69,                                                                   // casting de fantaisie : rapport mesuré sur la photo
    roues: rs.map((r) => ({ ...r, jante: '#ff5fae', rayons: 'cinqCreux', flanc: '#ff8fcc', sansFrein: true })) };   // jante rose à 5 branches dédoublées
}

/* ================================================================== H09 : Mighty K — kei truck japonais COMPACT
 * Cotes réelles d'un kei truck : 3 395 × 1 475 × 1 780 mm → plus haut que large (H / W = 1,207). Ici L ≈ 5,1 :
 * roues aux quatre coins (porte-à-faux 0,6–0,7), cabine avancée haute et droite (2,2), plateau ≈ 1,2 × la cabine,
 * pare-brise presque vertical, becquet de pavillon intégré, bas de cabine et bouclier noirs, plateau court à ridelles nervurées, petites roues à jante
 * dorée, chargement (skate, caisse à outils, roue de secours), filets rouge / orange / jaune et « SURF & SKATE ». */
function mightyK(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const bleu = o.lac('#7493a5', 0.3, 0.45), noir = o.lac('#1a1b20', 0.5, 0.15), noirM = o.mat('#0e0f12', 0.7, 0.3);
  const gris = o.mat('#5a636c', 0.55, 0.4), verre = k.vitre('#1d2329', 0.88);
  const xN = 2.6, xQ = -2.3, xv = 1.82, xr = -1.7, xC = 0.42;                   // nez, poupe, essieux, dos de cabine
  const RW = 0.5, W2 = 1.07;                                                          // petites roues ; demi-largeur de caisse
  const rv = k.roue(xv, RW, 0.42, W2, { avant: true, sortie: -0.01 }), rr = k.roue(xr, RW, 0.44, W2, { sortie: -0.01 });
  // cabine : caisse basse peinte (porte, flancs plats d'utilitaire), passage de roue avant creusé
  const C = [
    { x: xC, w: W2 - 0.02, y0: 0.56, y1: 1.68, nt: 9, nb: 7 },
    { x: xC + 0.15, w: W2, y0: 0.55, y1: 1.7, nt: 9, nb: 7 },
    { x: 2.25, w: W2, y0: 0.55, y1: 1.7, nt: 9, nb: 7 },
    { x: xN - 0.1, w: W2 - 0.03, y0: 0.58, y1: 1.66, nt: 8, nb: 6 },
    { x: xN, w: W2 - 0.12, y0: 0.66, y1: 1.56, nt: 6, nb: 5 }];
  k.loft(C, bleu, { arches: k.arches([rv], 1.12), nx: 90 });
  // bas de cabine noir (jusqu'au-dessus de la roue avant, comme sur la miniature), même passage de roue, dépasse de 2 cm
  const J = C.map((s) => ({ ...s, w: s.w + 0.02, y0: s.y0 - 0.02, y1: 1.26, nt: 6, nb: 6 }));   // dessus ≥ arche + 6 cm
  k.loft(J, noir, { arches: k.arches([rv], 1.12), nx: 90 });
  k.puits([rv]);
  // vitrage de cabine (verre fumé) : pare-brise presque vertical, grandes vitres de portière
  const yV0 = 1.6, yT = 2.63;
  const G = [
    { x: xC + 0.04, w: W2 - 0.05, y0: yV0, y1: yT, nt: 7, wt: 0.95 },
    { x: 2.16, w: W2 - 0.05, y0: yV0, y1: yT, nt: 7, wt: 0.95 },
    { x: 2.36, w: W2 - 0.06, y0: yV0, y1: yT - 0.08, nt: 6, wt: 0.95 },
    { x: xN - 0.14, w: W2 - 0.07, y0: yV0, y1: 1.72, nt: 6, wt: 0.95 }];
  k.loft(G, verre, { nx: 60, ns: 40 });
  k.peauDessus(G, xC + 0.04, 2.3, 0.12, bleu);                                       // pavillon peint
  for (let i = 0; i < 4; i++) o.boite(0.07, 0.03, 1.6, bleu, xC + 0.3 + i * 0.42, yT + 0.015, 0);   // nervures de toit
  const yA = (x) => k.sta(G, x).y1 - 0.17;
  k.montant(G, xN - 0.16, 1.7, 2.3, yA(2.3), 0.07, bleu);                            // montants de pare-brise
  k.peauFlanc(G, xC + 0.04, 0.96, () => yV0, (x) => yA(x) + 0.02, bleu, 0.02);       // dos de cabine plein (custode peinte)
  k.montant(G, 1.0, yV0 + 0.02, 1.0, yA(1.0), 0.06, bleu);                         // montant de portière
  o.boite(0.06, yT - yV0 - 0.05, 2 * (W2 - 0.08), bleu, xC + 0.02, (yV0 + yT) / 2 - 0.02, 0);   // panneau arrière de cabine
  o.boite(0.03, 0.34, 1.0, verre, xC - 0.02, 2.1, 0);                                 // petite lunette arrière
  // visière de pavillon : lèvre en coin posée sur le bord arrière du toit, sans débord (profil arrondi)
  k.lame([[xC + 0.42, yT - 0.02], [xC + 0.06, yT - 0.02], [xC + 0.04, yT + 0.03], [xC + 0.1, yT + 0.06], [xC + 0.42, yT + 0.02]], 2 * W2 - 0.18, bleu, 0, 0.02);
  // rétroviseurs de portière
  for (const s of [-1, 1]) { k.ellipsoide(0.06, 0.1, 0.035, noir, 2.3, 1.86, s * (W2 + 0.02), 12); o.boite(0.05, 0.04, 0.06, noir, 2.3, 1.78, s * (W2 - 0.01)); }   // rétros repliés (hors-tout ≈ caisse)
  // face avant : bouclier noir proéminent, calandre chromée, optiques carrées claires, clignotants
  // bouclier : volume galbé (sections arrondies, coins enveloppants), plus un bloc
  k.loft([{ x: xN - 0.2, w: W2 + 0.01, y0: 0.36, y1: 0.9, nt: 5, nb: 4 }, { x: xN - 0.05, w: W2 + 0.01, y0: 0.34, y1: 0.9, nt: 5, nb: 4 },
    { x: xN + 0.1, w: W2 - 0.04, y0: 0.38, y1: 0.86, nt: 4, nb: 3.4 }, { x: xN + 0.16, w: W2 - 0.16, y0: 0.44, y1: 0.8, nt: 3, nb: 3 }], noir, { nx: 24, ns: 40 });
  for (const sg of [-1, 1]) k.phareRond(xN + 0.13, 0.52, sg * 0.66, 0.06, lumiere(k, '#f2f2e8'), o.chrome);                 // antibrouillards
  o.boite(0.05, 0.24, 0.42, o.chrome, xN + 0.15, 0.68, -0.32);
  for (let i = 0; i < 4; i++) o.boite(0.06, 0.022, 0.38, noirM, xN + 0.165, 0.6 + i * 0.055, -0.32);
  for (const s of [-1, 1]) {
    o.boite(0.08, 0.28, 0.32, k.vitre('#d8e2ea', 0.75), xN - 0.02, 1.16, s * 0.74);
    k.phareRond(xN + 0.02, 1.16, s * 0.74, 0.1, lumBlanche, null);
    o.boite(0.06, 0.1, 0.2, lumiere(k, '#ffa22a'), xN - 0.02, 0.92, s * 0.8);
  }
  o.boite(0.04, 0.14, 1.4, gris, xN + 0.01, 1.4, 0);                                  // grille de ventilation sous le pare-brise
  // châssis noir sous le plateau (entre les roues arrière, en retrait des pneus)
  o.boite(xC - xQ - 0.2, 0.36, 2 * (rr.z - rr.ep / 2 - 0.08), noirM, (xC + xQ) / 2, 0.82, 0);
  // plateau : plancher, ridelles latérales nervurées, ridelle arrière, ridelle avant à grille de protection
  const yP = 1.06, hR = 0.5, xP0 = xQ + 0.02, xP1 = xC - 0.06;
  o.boite(xP1 - xP0, 0.08, 2 * W2, bleu, (xP0 + xP1) / 2, yP, 0);
  for (const s of [-1, 1]) {
    o.boite(xP1 - xP0, hR, 0.07, bleu, (xP0 + xP1) / 2, yP + hR / 2, s * (W2 - 0.035));
    for (const y of [yP + 0.14, yP + 0.3, yP + 0.44]) o.boite(xP1 - xP0 - 0.06, 0.035, 0.03, bleu, (xP0 + xP1) / 2, y, s * (W2 + 0.01));
    for (let i = 0; i <= 3; i++) o.boite(0.05, hR, 0.03, bleu, xP0 + 0.05 + i * (xP1 - xP0 - 0.1) / 3, yP + hR / 2, s * (W2 + 0.012));
  }
  o.boite(0.07, hR, 2 * W2, bleu, xP0 + 0.035, yP + hR / 2, 0);
  o.boite(0.08, hR + 0.32, 2 * W2 - 0.1, bleu, xP1 - 0.04, yP + (hR + 0.32) / 2, 0);
  for (let i = 0; i < 6; i++) o.boite(0.04, 0.04, 2 * W2 - 0.2, gris, xP1 - 0.1, yP + 0.55 + i * 0.05, 0);
  // garde-boue arrière noirs sous les ridelles (coiffent la bande de roulement, au-dessus du pneu)
  k.ailes([rr], noir, { t: 0.06, jeu: 0.12, a0: 0.25, a1: Math.PI - 0.25, deb: -0.02 });
  // feux arrière sous la ridelle
  for (const s of [-1, 1]) o.boite(0.06, 0.16, 0.3, lumRouge, xQ, yP - 0.12, s * 0.78);
  o.boite(0.08, 0.14, 2 * W2 - 0.1, noir, xQ + 0.02, yP - 0.16, 0);
  // chargement : skate, caisse à outils, roue de secours couchée
  const yS = yP + 0.05;
  k.ellipsoide(0.55, 0.025, 0.17, o.mat('#e0a03a', 0.5, 0.1), -0.95, yS + 0.13, 0.35, 16);
  for (const dx of [-0.36, 0.36]) for (const dz of [-0.12, 0.12]) o.cyl(0.05, 0.05, 0.05, o.mat('#f2f2f2', 0.4, 0.1), -0.95 + dx, yS + 0.06, 0.35 + dz, Math.PI / 2, 0, 12);
  o.boite(0.7, 0.28, 0.4, o.lac('#c8372d', 0.35, 0.1), -0.5, yS + 0.14, -0.45);
  const rdS = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(0.3, 0.12, 10, 24)), noirM); rdS.rotation.x = Math.PI / 2; rdS.position.set(-1.75, yS + 0.12, -0.3); o.ajouter(rdS);
  o.cyl(0.2, 0.2, 0.1, o.mat('#e8c27a', 0.3, 0.7), -1.75, yS + 0.12, -0.3);
  // livrée : filets rouge / orange / jaune sur la ridelle et la portière (descente diagonale), « SURF & SKATE »
  const coul = ['#d5402f', '#ee8a2c', '#f0c53a'];
  o.decalFlanc((g, w, h) => {
    const X = (x) => (x - xP0) / (xP1 - xP0) * w, Y = (y) => (yP + hR - y) / hR * h;
    coul.forEach((c, i) => { g.fillStyle = c; g.fillRect(X(xP0 + 0.1), Y(yP + 0.27 - i * 0.055), X(xP1) - X(xP0 + 0.1), h * 0.08); });
  }, xP1 - xP0, hR, (xP0 + xP1) / 2, yP + hR / 2, W2 + 0.03, 1024, 160);
  k.drapeFlancs(C, xC + 0.2, xN - 0.12, 1.28, 1.66, (g, w, h, c, M) => {
    coul.forEach((cc, i) => {
      g.strokeStyle = cc; g.lineWidth = M.Sy(0.045); g.beginPath();
      g.moveTo(M.X(xC + 0.2), M.Y(1.62 - i * 0.05)); g.lineTo(M.X(1.0), M.Y(1.62 - i * 0.05));
      g.quadraticCurveTo(M.X(1.2), M.Y(1.62 - i * 0.05), M.X(1.3), M.Y(1.56 - i * 0.05)); g.lineTo(M.X(1.42), M.Y(1.5 - i * 0.05)); g.lineTo(M.X(xN - 0.15), M.Y(1.5 - i * 0.05)); g.stroke();
    });
    k.ecrire(g, 'SURF &', M.X(1.0), M.Y(1.42), c, '900 ' + Math.round(M.Sy(0.1)) + 'px Arial Black, Arial, sans-serif', '#f0c53a');
    k.ecrire(g, 'SKATE', M.X(1.0), M.Y(1.32), c, '900 ' + Math.round(M.Sy(0.1)) + 'px Arial Black, Arial, sans-serif', '#f0c53a');
    M.trouer(g, [rv]);
  }, 1024, 320, 0.02, [rv]);
  for (const s of [-1, 1]) o.boite(0.12, 0.04, 0.02, noirM, 1.25, 1.5, s * (W2 + 0.01));   // poignée de portière
  return { L: xN - xQ + 0.16, largeur: 2 * W2, hauteur: yT + 0.06, xAvant: xN + 0.16, xArriere: xQ,
    plafond: 1.207,                                                                   // kei truck réel : 1 780 / 1 475
    roues: [rv, rr].map((r) => ({ ...r, jante: '#18191d', rayons: 'deepdish', levre: 0.2, flanc: '#e2b860', sansFrein: true })) };   // centre noir, cercle doré
}

/* ================================================================== H12 : « La Grève » — voiture-train hybride (West Coast Flyer)
 * D'abord une VIEILLE VOITURE DE LUXE : limousine fermée 1910–1930 sur deux essieux (empattement de voiture 4,5, roues
 * avant plus petites façon tacot, roues à rayons bois et pneus), ailes enveloppantes avant et arrière reliées par des
 * marchepieds, pare-chocs chromés, gros phares bols sur les ailes, lanternes de carrosse, malle et roue de secours.
 * ENSUITE on comprend que son moteur est une CHAUDIÈRE : elle occupe la place du capot (cylindre riveté anthracite,
 * cerclages laiton, cheminée évasée et dôme posés sur le « capot »), la boîte à fumée à porte ronde remplace la calandre.
 * Bielles apparentes de chaque côté : cylindre à vapeur sur le marchepied → tige de piston → crosse dans sa glissière →
 * bielle motrice → maneton de la roue ARRIÈRE motrice, animées avec la même loi que les roues (ω = v / R).
 * Livrée « sncf » évoquée sans aucun logo : gris métal, bandeaux carmin et prune. */
function voitureTrain(ctx) {
  const { lumBlanche, lumRouge, animes } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const gris = o.lac('#8e949d', 0.28, 0.6), carmin = o.lac('#a3122e', 0.3, 0.2), prune = o.lac('#6b2a5a', 0.32, 0.2);
  const anth = o.lac('#3a3f47', 0.32, 0.55), fumee = o.mat('#24272d', 0.55, 0.5), laiton = o.mat('#c9a24a', 0.25, 0.9);
  const noir = o.mat('#16171b', 0.6, 0.3), acier = o.mat('#c9cdd5', 0.18, 0.95), verre = k.vitre('#1a2430', 0.9);
  // deux essieux de voiture : petites roues avant directrices (tacot), grandes roues arrière motrices
  const xv = 2.6, xr = -1.9;
  const rv = { x: xv, RW: 0.56, ep: 0.42, z: 0.84, avant: true }, rr = { x: xr, RW: 0.72, ep: 0.5, z: 0.88 };
  const zB = rr.z + rr.ep / 2 + 0.08;                                                // plan des bielles : hors du pneu et de l'aile, côté visible
  // ---- limousine fermée : un volume de carrosserie gris (passage de roue arrière creusé), vitres encadrées, pavillon prune
  const yT = 2.42, xCa = -2.9, xCv = 0.55;                                                    // pavillon BAS et long de limousine
  const C = [
    { x: xCa, w: 0.9, y0: 0.82, y1: yT - 0.42, nt: 5, nb: 4, wt: 0.95 },
    { x: xCa + 0.18, w: 0.97, y0: 0.74, y1: yT - 0.14, nt: 6, nb: 4, wt: 0.94 },
    { x: xCa + 0.75, w: 0.98, y0: 0.74, y1: yT, nt: 7, nb: 4, wt: 0.94 },                    // poupe arrondie : le toit plonge vers la malle
    { x: xCv - 0.14, w: 0.98, y0: 0.74, y1: yT, nt: 7, nb: 4, wt: 0.94 },
    { x: xCv, w: 0.92, y0: 0.82, y1: yT - 0.05, nt: 7, nb: 4, wt: 0.94 }];
  k.loft(C, gris, { arches: k.arches([rr], 1.12), nx: 70, ns: 48 });
  k.puits([rr]);
  k.peauDessus(C, xCa + 0.3, xCv + 0.02, 0.06, prune, 0.03, 1.04);                               // pavillon prune, débordant
  const vis = o.boite(0.32, 0.04, 1.9, prune, xCv + 0.12, yT - 0.02, 0); vis.rotation.z = -0.16;  // visière de pare-brise
  o.boite(0.03, 0.46, 1.5, verre, xCv + 0.005, 2.06, 0);                                          // pare-brise droit
  o.boite(0.04, 0.05, 1.56, laiton, xCv + 0.01, 2.3, 0); o.boite(0.04, 0.05, 1.56, laiton, xCv + 0.01, 1.82, 0);
  o.boite(0.03, 0.26, 0.9, verre, xCa + 0.12, 1.9, 0);                                             // lunette arrière
  for (const sg of [-1, 1]) {
    for (const [xa, xb] of [[-2.3, -1.85], [-1.7, -0.95], [-0.8, 0.38]]) {
      const zf = sg * (k.flancAu(C, (xa + xb) / 2, 2.06) + 0.004);
      o.boite(xb - xa, 0.42, 0.02, verre, (xa + xb) / 2, 2.06, zf);                              // vitre
      for (const y of [2.29, 1.83]) o.boite(xb - xa + 0.08, 0.04, 0.03, laiton, (xa + xb) / 2, y, zf + sg * 0.006);   // cadres laiton
    }
    const zp = sg * (k.flancAu(C, -0.9, 1.5) + 0.01);
    o.boite(0.025, 1.4, 0.02, noir, -0.88, 1.5, zp); o.boite(0.025, 1.4, 0.02, noir, 0.45, 1.5, zp);   // joints de portière
    o.boite(0.12, 0.04, 0.05, laiton, -0.7, 1.82, zp + sg * 0.02);                                // poignée
    o.cyl(0.07, 0.07, 0.2, laiton, xCv + 0.02, 1.98, sg * 1.0); o.boite(0.05, 0.11, 0.09, lumiere(k, '#ffe6a8'), xCv + 0.1, 1.98, sg * 1.0);   // lanternes de carrosse
  }
  // ---- capot-chaudière : socle de capot gris, chaudière rivetée, cerclages laiton, dôme et cheminée sur le capot
  const yCh = 1.58, Rc = 0.5, xc0 = xCv - 0.02, xc1 = 3.1;
  o.boite(xc1 - xc0, 0.42, 1.08, gris, (xc0 + xc1) / 2, 1.08, 0);                                 // flancs bas de capot
  o.boite(xc1 - xc0, 0.05, 1.12, carmin, (xc0 + xc1) / 2, 1.3, 0);                                // filet carmin de capot
  o.cyl(Rc, Rc, xc1 - xc0, anth, (xc0 + xc1) / 2, yCh, 0, 0, Math.PI / 2, 40);
  for (const x of [0.95, 1.75, 2.55]) o.cyl(Rc + 0.02, Rc + 0.02, 0.06, laiton, x, yCh, 0, 0, Math.PI / 2, 40);
  for (const x of [1.35, 2.15]) for (let i = 0; i < 12; i++) { const a = 0.2 + i / 11 * (Math.PI - 0.4); k.ellipsoide(0.016, 0.022, 0.022, anth, x, yCh + Math.sin(a) * (Rc + 0.004), Math.cos(a) * (Rc + 0.004), 6); }
  o.cyl(Rc + 0.06, Rc + 0.06, 0.4, fumee, xc1 + 0.2, yCh, 0, 0, Math.PI / 2, 40);                  // boîte à fumée = calandre
  o.cyl(Rc - 0.04, Rc, 0.07, fumee, xc1 + 0.43, yCh, 0, 0, Math.PI / 2, 40);                       // porte ronde
  const an = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(Rc + 0.02, 0.045, 8, 40)), o.chrome); an.rotation.y = Math.PI / 2; an.position.set(xc1 + 0.42, yCh, 0); o.ajouter(an);
  o.cyl(0.07, 0.07, 0.06, o.chrome, xc1 + 0.48, yCh, 0, 0, Math.PI / 2, 16);
  for (const sg of [-1, 1]) o.boite(0.04, 0.04, 0.3, o.chrome, xc1 + 0.49, yCh, sg * 0.17);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.ellipsoide(0.012, 0.022, 0.022, o.chrome, xc1 + 0.47, yCh + Math.sin(a) * (Rc - 0.1), Math.cos(a) * (Rc - 0.1), 6); }
  o.cyl(0.15, 0.19, 0.36, fumee, 2.65, yCh + Rc + 0.14, 0, 0, 0, 24);                              // cheminée (courte : la limousine domine)
  o.cyl(0.23, 0.15, 0.1, fumee, 2.65, yCh + Rc + 0.37, 0, 0, 0, 24); o.cyl(0.22, 0.22, 0.035, laiton, 2.65, yCh + Rc + 0.43, 0, 0, 0, 24);
  o.cyl(0.2, 0.24, 0.2, laiton, 1.55, yCh + Rc + 0.05, 0, 0, 0, 24); k.ellipsoide(0.2, 0.14, 0.2, laiton, 1.55, yCh + Rc + 0.15, 0, 20);   // dôme
  for (const dz of [-0.1, 0.1]) o.cyl(0.04, 0.05, 0.2, laiton, 0.9, yCh + Rc + 0.08, dz, 0, 0, 12);                                      // soupapes
  o.cyl(0.035, 0.035, 0.24, laiton, xCv + 0.15, yCh + Rc + 0.1, 0, 0, 0, 10); o.cyl(0.06, 0.035, 0.1, laiton, xCv + 0.15, yCh + Rc + 0.26, 0, 0, 0, 12);   // sifflet
  const pl = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(0.36, 0.13)), k.matDecal((g, w, h) => { g.fillStyle = '#a3122e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = '#f2e6c8'; g.font = '900 ' + Math.round(h * 0.7) + 'px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('700', w / 2, h * 0.54); }, 256, 96));
  pl.rotation.y = Math.PI / 2; pl.position.set(xc1 + 0.48, yCh - 0.3, 0); o.ajouter(pl);
  // ---- ailes enveloppantes avant et arrière (carmin), marchepieds, phares bols, pare-chocs
  k.ailes([rv], carmin, { t: 0.08, jeu: 0.13, a0: 0.3, a1: Math.PI - 0.06, deb: 0.05, rentre: 0.1, arrondi: 0.03 });
  k.ailes([rr], carmin, { t: 0.08, jeu: 0.13, a0: 0.14, a1: Math.PI - 0.06, deb: 0.05, rentre: 0.1, arrondi: 0.03 });
  const xM0 = xr + rr.RW + 0.2, xM1 = xv - rv.RW - 0.2, zM = 0.98;
  for (const sg of [-1, 1]) {
    o.boite(xM1 - xM0, 0.07, 0.34, noir, (xM0 + xM1) / 2, 0.55, sg * zM);                        // marchepied à tapis noir
    o.boite(xM1 - xM0, 0.03, 0.035, o.chrome, (xM0 + xM1) / 2, 0.57, sg * (zM + 0.17));          // jonc chromé
    for (const x of [xM0 + 0.2, xM1 - 0.2]) o.boite(0.06, 0.2, 0.06, noir, x, 0.66, sg * 0.72);  // supports
    k.ellipsoide(0.13, 0.17, 0.17, laiton, xv + 0.55, 1.32, sg * 0.72, 18);                       // phares bols laiton sur fourche
    k.phareRond(xv + 0.66, 1.32, sg * 0.72, 0.13, lumBlanche, o.chrome);
    o.boite(0.05, 0.26, 0.05, laiton, xv + 0.5, 1.12, sg * 0.72);
  }
  for (const sg of [-1, 1]) for (const x of [-0.6, 2.1]) o.boite(x < 0 ? 1.1 : 1.4, 0.12, 0.08, noir, x, 0.8, sg * 0.42);   // longerons
  // pare-chocs GALBÉS à double lame (années 20) : tubes chromés cintrés en plan, pattes courbes vers les longerons
  const parechoc = (x0, sens) => {
    for (const [dy, r] of [[0, 0.055], [0.15, 0.035]]) {
      const pts = []; for (let i = 0; i <= 12; i++) { const z = -1.02 + 2.04 * i / 12, u = z / 1.02; pts.push(new THREE.Vector3(x0 + sens * (0.1 * (1 - u * u) - 0.16 * Math.pow(Math.abs(u), 6)), 0.62 + dy, z)); }
      o.ajouter(new THREE.Mesh(ctx.garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 10, false)), o.chrome));
    }
    for (const sg of [-1, 1]) { const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0 - sens * 0.55, 0.78, sg * 0.42), new THREE.Vector3(x0 - sens * 0.05, 0.8, sg * 0.42), new THREE.Vector3(x0 + sens * 0.06, 0.66, sg * 0.42));
      o.ajouter(new THREE.Mesh(ctx.garde(new THREE.TubeGeometry(c, 12, 0.035, 8, false)), noir)); }
  };
  parechoc(xc1 + 0.62, 1);
  // ---- arrière : malle prune cerclée de laiton, roue de secours, pare-chocs, feux
  o.boite(0.5, 0.72, 1.6, prune, xCa - 0.24, 1.24, 0);
  o.boite(0.52, 0.05, 1.62, laiton, xCa - 0.24, 1.6, 0); o.boite(0.52, 0.04, 1.62, laiton, xCa - 0.24, 0.9, 0);
  const sec = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(0.38, 0.12, 12, 32)), noir); sec.rotation.y = Math.PI / 2; sec.position.set(xCa - 0.6, 1.24, 0); o.ajouter(sec);
  o.cyl(0.28, 0.28, 0.1, carmin, xCa - 0.6, 1.24, 0, 0, Math.PI / 2, 24);
  parechoc(xCa - 0.82, -1);
  for (const sg of [-1, 1]) o.boite(0.06, 0.14, 0.14, lumRouge, xCa - 0.5, 0.95, sg * 0.72);
  // ---- machine à vapeur apparente : cylindre posé sur le marchepied, glissière, bielle motrice vers la roue arrière
  const yAx = rr.RW + 0.1, xCyl = -0.1, rc = 0.24, Lm = 1.2;
  for (const sg of [-1, 1]) {
    o.cyl(0.13, 0.13, 0.5, anth, xCyl, yAx, sg * (zB - 0.02), 0, Math.PI / 2, 24);
    for (const dx of [-0.25, 0.25]) o.cyl(0.15, 0.15, 0.04, laiton, xCyl + dx, yAx, sg * (zB - 0.02), 0, Math.PI / 2, 24);
    o.boite(0.7, 0.03, 0.04, acier, xCyl - 0.6, yAx + 0.08, sg * zB);                              // glissière
    o.boite(0.04, 0.2, 0.04, noir, xCyl - 0.95, yAx - 0.02, sg * (zB - 0.05));                     // patte de glissière
  }
  const g = new THREE.Group(); o.ajouter(g);
  const tigeAnim = (r) => { const m = new THREE.Mesh(ctx.garde(new THREE.CylinderGeometry(r, r, 1, 10)), acier); g.add(m); return m; };
  const poser = (m, a, b) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
  const cotes = [-1, 1].map((sg) => ({
    sg, motrice: tigeAnim(0.045), piston: tigeAnim(0.028),
    crosse: (() => { const m = new THREE.Mesh(ctx.garde(new THREE.BoxGeometry(0.14, 0.11, 0.07)), acier); g.add(m); return m; })(),
    maneton: (() => { const m = new THREE.Mesh(ctx.garde(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 12)), laiton); m.rotation.x = Math.PI / 2; g.add(m); return m; })(),
    manivelle: (() => { const m = new THREE.Mesh(ctx.garde(new THREE.BoxGeometry(1, 0.1, 0.04)), acier); g.add(m); return m; })(),
  }));
  let phi = 0.7;                                                                                     // calage de repos : bielle oblique
  const placer = () => {
    for (const c of cotes) {
      const ph = phi + (c.sg > 0 ? 0 : Math.PI / 2);                                              // manivelles calées à 90° d'un côté à l'autre
      const p = new THREE.Vector3(xr + rc * Math.cos(ph), rr.RW + rc * Math.sin(ph), c.sg * zB);
      c.maneton.position.set(p.x, p.y, c.sg * (zB - 0.03));
      c.manivelle.position.set(xr + rc * Math.cos(ph) / 2, rr.RW + rc * Math.sin(ph) / 2, c.sg * (zB - 0.06)); c.manivelle.scale.x = rc; c.manivelle.rotation.z = ph;
      const xc = p.x + Math.sqrt(Lm * Lm - (p.y - yAx) * (p.y - yAx)), cr = new THREE.Vector3(xc, yAx, c.sg * zB);
      poser(c.motrice, p, cr); c.crosse.position.copy(cr);
      poser(c.piston, cr, new THREE.Vector3(xCyl - 0.15, yAx, c.sg * zB));
    }
  };
  placer();
  animes.push((t, dt, v) => { phi -= (v || 0) * dt / rr.RW; placer(); });                        // même loi que la rotation de la roue arrière
  // ---- livrée « sncf » évoquée : bandeau carmin à la ceinture, bandeau prune dessous, plaque laiton « 700 »
  k.drapeFlancs(C, xCa + 0.2, xCv - 0.06, 0.95, 1.78, (cg, w, h, c, M) => {
    cg.fillStyle = '#a3122e'; cg.fillRect(0, M.Y(1.78), w, M.Sy(0.1));
    cg.fillStyle = '#6b2a5a'; cg.fillRect(0, M.Y(1.62), w, M.Sy(0.22));
    cg.fillStyle = '#a3122e'; cg.fillRect(0, M.Y(1.32), w, M.Sy(0.05));
    cg.fillStyle = '#c9a24a'; cg.fillRect(M.X(-0.65), M.Y(1.3), M.S(0.42), M.Sy(0.16));
    k.ecrire(cg, '700', M.X(-0.44), M.Y(1.22), c, '900 ' + Math.round(M.Sy(0.12)) + 'px Arial Black, Arial', '#3a1020');
    M.trouer(cg, [rr], 1.2);
  }, 1024, 300, 0.02, [rr]);
  o.decalFlanc((cg, w, h) => {                                                                       // éclair argenté sur les flancs de chaudière
    cg.strokeStyle = '#a3122e'; cg.lineWidth = h * 0.08; cg.beginPath(); cg.moveTo(0, h * 0.82); cg.lineTo(w, h * 0.82); cg.stroke();
    cg.fillStyle = '#d9dde4'; cg.beginPath(); cg.moveTo(w * 0.1, h * 0.55); cg.lineTo(w * 0.45, h * 0.45); cg.lineTo(w * 0.42, h * 0.58); cg.lineTo(w * 0.85, h * 0.4); cg.lineTo(w * 0.5, h * 0.66); cg.lineTo(w * 0.53, h * 0.54); cg.closePath(); cg.fill();
  }, 1.9, 0.4, 1.85, yCh - 0.04, Rc + 0.02, 1024, 216);
  return { L: xc1 + 0.72 - (xCa - 0.86), largeur: 2.0, hauteur: yT + 0.1, xAvant: xc1 + 0.72, xArriere: xCa - 0.86,
    plafond: 1.2,                                                                                     // exempté (voiture-train de fantaisie) : plafond libre ≥ 1,2
    roues: [rv, rr].map((r) => ({ ...r, jante: '#a3122e', rayons: 'fils', flanc: '#a3122e', sansFrein: true })) };   // roues à rayons fils carmin
}

/* ================================================================== H02 : Track Dwagon — break cyber gris, vitrages roses, châssis rose
 * Silhouette de la miniature : BREAK deux volumes à pavillon long et plat, HAYON VERTICAL, galerie de toit à l'arrière,
 * capot plongeant à bossage et évents roses translucides, grandes vitres roses encadrées de montants gris épais,
 * bas de portières anthracite à chevrons roses et plaque noire « X-09 », châssis rose apparent (boucliers avant et
 * arrière, bas de caisse), crochets de remorquage roses, jantes noires pleines cerclées de blanc (cible).
 * Châssis rose : trois tronçons arrêtés à 4 cm des arches (bouclier avant, bas de caisse entre les essieux, bouclier
 * arrière) — aucun élément ne passe dans un pneu. */
function trackDwagon(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx, k = kit(ctx), o = k.o;
  const gris = o.lac('#868a91', 0.36, 0.25), anth = o.lac('#4a4d55', 0.4, 0.2), rose = o.lac('#e0457b', 0.34, 0.12);
  const noir = o.mat('#15161b', 0.6, 0.3), verreRose = k.vitre('#ff2a78', 0.82);
  const roseL = ctx.garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#ff2d7a').convertSRGBToLinear(), roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1, envMap: ctx.envMap }));
  const xv = 2.5, xr = -2.45, xN = 3.95, xQ = -3.95;
  const rv = k.roue(xv, 0.66, 0.56, 1.28, { avant: true, sortie: 0.0 }), rr = k.roue(xr, 0.68, 0.6, 1.3, { sortie: 0.0 });
  const rs = [rv, rr];
  // caisse : nez plongeant, flancs droits, poupe carrée (hayon vertical)
  const B = [
    { x: xQ, w: 1.16, y0: 0.6, y1: 1.62, nt: 7, nb: 4 },
    { x: xQ + 0.12, w: 1.25, y0: 0.54, y1: 1.66, nt: 8, nb: 4 },
    { x: xr, w: 1.3, y0: 0.52, y1: 1.68, nt: 8, nb: 4 },
    { x: -0.5, w: 1.26, y0: 0.52, y1: 1.64, nt: 8, nb: 4 },
    { x: 1.25, w: 1.26, y0: 0.52, y1: 1.62, nt: 8, nb: 4 },
    { x: xv, w: 1.28, y0: 0.52, y1: 1.56, nt: 8, nb: 4 },
    { x: xN - 0.3, w: 1.2, y0: 0.56, y1: 1.36, nt: 7, nb: 4 },
    { x: xN, w: 1.08, y0: 0.62, y1: 1.22, nt: 4, nb: 3.4 }];
  k.loft(B, gris, { arches: k.arches(rs, 1.1), nx: 130 }); k.puits(rs);
  k.ailes(rs, gris, { t: 0.08, arrondi: 0.03, deb: 0.0 });
  // vitrage rose : pare-brise incliné, pavillon long et plat, hayon vertical
  const yV = 1.58, yT = 2.58;
  const G = [
    { x: xQ + 0.05, w: 1.04, y0: 1.4, y1: yT - 0.03, nt: 9, nb: 12, wt: 0.9 },
    { x: xQ + 0.1, w: 1.06, y0: 1.4, y1: yT, nt: 9, nb: 12, wt: 0.9 },
    { x: 0.2, w: 1.06, y0: 1.4, y1: yT, nt: 9, nb: 12, wt: 0.9 },
    { x: 1.45, w: 1.08, y0: 1.4, y1: 1.66, nt: 8, nb: 12, wt: 0.9 }];       // bas de vitrage noyé dans la caisse (au-dessus des pneus) : flancs droits
  k.loft(G, verreRose, { nx: 70, ns: 40 });
  k.peauDessus(G, xQ + 0.06, 0.3, 0.17, gris);                                                   // toit gris
  const yA = (x) => k.sta(G, x).y1 - 0.17;
  k.montant(G, 1.4, 1.66, 0.3, yA(0.3), 0.075, gris);                                          // montants de pare-brise
  for (const [x0, x1] of [[-0.66, -0.4], [-2.06, -1.74], [xQ + 0.06, xQ + 0.55]]) k.peauFlanc(G, x0, x1, () => yV, (x) => yA(x) + 0.04, gris, 0.025);
  k.peauFlanc(G, xQ + 0.06, 1.3, () => yV, () => yV + 0.1, gris, 0.025);                       // bas de vitrage (ceinture grise)   // montants B, C et D
  o.boite(0.06, yT - yV - 0.12, 1.9, gris, xQ + 0.06, (yV + yT) / 2 - 0.06, 0);                // cadre de hayon (vitre de hayon au centre)
  o.boite(0.03, 0.62, 1.4, verreRose, xQ + 0.02, (yV + yT) / 2 - 0.02, 0);
  // galerie de toit à l'arrière : plateau, lèvre relevée, rails, becquet sur le hayon
  o.boite(2.6, 0.06, 2.0, gris, -2.55, yT + 0.08, 0);
  for (const sg of [-1, 1]) { o.boite(2.6, 0.08, 0.08, anth, -2.55, yT + 0.14, sg * 0.98); for (const x of [-1.35, -2.55, -3.75]) o.boite(0.08, 0.1, 0.08, anth, x, yT + 0.04, sg * 0.9); }
  const bec = o.boite(0.5, 0.06, 2.0, gris, xQ + 0.05, yT + 0.12, 0); bec.rotation.z = 0.25;
  // évents roses translucides : sur le toit avant, au pied du pare-brise, sur le capot
  for (const z of [-0.45, 0.45]) { const m = o.boite(0.5, 0.16, 0.34, roseL, -0.4, yT + 0.06, z); m.rotation.z = 0.1; }
  for (const z of [-0.95, 0.95]) o.boite(0.34, 0.16, 0.3, roseL, 1.5, 1.72, z);
  const yC = k.hautAu(B, 2.9, 0);
  k.ellipsoide(1.0, 0.1, 0.55, gris, 2.55, k.hautAu(B, 2.55, 0) - 0.03, 0, 24);                // bossage de capot
  o.boite(0.3, 0.07, 0.6, noir, 2.7, k.hautAu(B, 2.7, 0) + 0.06, 0);                           // écope
  o.boite(0.24, 0.12, 0.26, roseL, 3.45, yC - 0.02, 0.65); o.boite(0.24, 0.12, 0.26, roseL, 3.45, yC - 0.02, -0.65);
  // face avant : calandre noire pailletée, optiques roses translucides, crochets roses
  o.boite(0.08, 0.32, 1.5, o.mat('#2a2c32', 0.75, 0.3), xN + 0.01, 0.92, 0);
  for (const sg of [-1, 1]) { o.boite(0.1, 0.3, 0.42, roseL, xN, 0.98, sg * 0.82); o.boite(0.05, 0.08, 0.26, lumBlanche, xN + 0.04, 1.08, sg * 0.82); }
  for (const sg of [-1, 1]) { o.boite(0.3, 0.12, 0.12, roseL, xN + 0.2, 0.72, sg * 0.35); o.boite(0.1, 0.2, 0.12, roseL, xN + 0.32, 0.78, sg * 0.35); }
  // poupe : feux, plaque
  for (const sg of [-1, 1]) o.boite(0.06, 0.34, 0.3, lumRouge, xQ - 0.01, 1.3, sg * 0.88);
  o.boite(0.04, 0.2, 0.6, noir, xQ - 0.01, 0.95, 0);
  // châssis rose : trois tronçons (lofts à bouts arrondis) hors des arches
  const R = (r) => r.RW + 0.13 + 0.04;
  const troncon = (xa, xb, y0, y1, w) => { const st = []; for (let i = 0; i <= 4; i++) st.push({ x: xa + (xb - xa) * i / 4, w, y0, y1, nt: 3, nb: 3 }); k.loft(st, rose, { nx: 36, ns: 32 }); };
  // bas de caisse : plaque plate et basse (sous la tôle grise), boucliers plus hauts et massifs : aucune continuité trompeuse
  { const st = []; for (let i = 0; i <= 4; i++) st.push({ x: xr + R(rr) + (xv - R(rv) - xr - R(rr)) * i / 4, w: 1.3, y0: 0.3, y1: 0.48, nt: 8, nb: 8 }); k.loft(st, rose, { nx: 30, ns: 40 }); }
  troncon(xv + R(rv), xN + 0.12, 0.4, 0.84, 1.18);                                               // bouclier avant
  troncon(xQ - 0.1, xr - R(rr), 0.42, 0.86, 1.2);                                                // bouclier arrière
  // flancs : bas de portières anthracite, chevrons roses, plaque noire numérotée, signes génériques
  k.drapeFlancs(B, -2.0, 1.4, 0.72, 1.6, (g, w, h, c, M) => {
    g.fillStyle = '#4a4d55'; g.fillRect(M.X(-1.95), M.Y(1.1), M.S(3.3), M.Sy(0.38));
    g.fillStyle = '#e0457b'; for (let i = 0; i < 6; i++) { const x0 = -0.6 + i * 0.22; g.beginPath(); g.moveTo(M.X(x0), M.Y(0.74)); g.lineTo(M.X(x0 + 0.1), M.Y(0.74)); g.lineTo(M.X(x0 + 0.26), M.Y(1.06)); g.lineTo(M.X(x0 + 0.16), M.Y(1.06)); g.closePath(); g.fill(); }
    g.fillStyle = '#14161b'; g.fillRect(M.X(-0.62), M.Y(1.5), M.S(1.3), M.Sy(0.34));
    k.ecrire(g, 'X-09', M.X(0.03), M.Y(1.33), c, '900 ' + Math.round(M.Sy(0.24)) + 'px Arial Black, Arial', '#f4f4f4');
    k.ecrire(g, '× ×', M.X(-1.45), M.Y(1.42), c, '900 ' + Math.round(M.Sy(0.16)) + 'px Arial', '#f4f4f4');
    g.fillStyle = '#e0457b'; g.fillRect(M.X(-1.15), M.Y(1.48), M.S(0.3), M.Sy(0.1));
    g.strokeStyle = '#2a2c32'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(-0.52), M.Y(1.6)); g.lineTo(M.X(-0.52), M.Y(0.75)); g.moveTo(M.X(-1.9), M.Y(1.6)); g.lineTo(M.X(-1.9), M.Y(0.75)); g.stroke();
    M.trouer(g, rs);
  }, 1024, 280, 0.022, rs);
  return { L: xN - xQ + 0.42, largeur: 2.62, hauteur: yT + 0.2, xAvant: xN + 0.32, xArriere: xQ - 0.1,
    plafond: 1.06,                                                                                 // casting de fantaisie : rapport mesuré sur la photo (break haut, galerie comprise)
    roues: rs.map((r) => ({ ...r, jante: '#141518', rayons: 'f1_2022', flanc: '#f4f4f4', sansFrein: true })) };
}

/* ================================================================== H07 : camion-caisson noir et or chromé, cabine à ailettes, chasse-neige en escalier
 * Reprise du constructeur historique (groupe5) — correctif V5 : la jupe dorée se terminait à x = 0,9, EN PLEIN passage de
 * la roue avant (contour auto-intersecté → barre dorée en travers de la jante), et le longeron noir et les joints la
 * suivaient. Jupe, joints et longeron s'arrêtent désormais 6 cm DERRIÈRE l'arche avant ; la cabine et l'étrave restent
 * portées par leur propre bloc, hors du pneu. */
function camionCaisson(ctx) {
  const KZ = 1.28, { lumBlanche, lumRouge } = ctx, a = aide(ctx, 1, KZ), o = a.o;
  const noir = o.lac('#15161b', 0.3, 0.5), noirM = o.mat('#1c1d23', 0.5, 0.4), or = o.mat('#ffcc3e', 0.18, 0.8), orM = o.mat('#ffdc6a', 0.16, 0.85);        // or CHROMÉ (métal poli, reflets du studio)
  for (const m of [or, orM]) { m.envMapIntensity = 1.7; m.emissive = o.lin('#4a3200'); }        // l'or reste lumineux même face au fond sombre
  const rouge = o.lac('#4a0b08', 0.2, 0.1);
  const W = 2.2, xr = -1.9, xv = 1.35, RW = 0.55, Ra = RW + 0.12, yC = 2.72;
  const xJ = xv - Ra - 0.06;                                                                       // bout avant de la jupe : derrière l'arche avant
  // jupes dorées étagées (passage arrière seulement) et châssis noir, tous arrêtés à xJ
  for (const z of [-1, 1]) { const j = a.coque([[-3.95, 1.25], [xJ, 1.25]], 0.45, [{ x: xr, R: Ra, y: RW }], 0.14, or, { galbe: false, biseau: 0.03 }); j.position.z = z * 1.02; }
  // joints entre barres dorées : deux tronçons par ligne, interrompus au droit de l'arche arrière (plus rien en travers du pneu)
  for (const z of [-1, 1]) for (let i = 0; i < 3; i++) for (const [x0, x1] of [[-3.93, xr - Ra - 0.03], [xr + Ra + 0.03, xJ]]) o.boite(x1 - x0, 0.025, 0.04, noirM, (x0 + x1) / 2, 0.7 + i * 0.22, z * 1.11);
  o.boite(xJ + 3.9, 0.5, 1.8, noirM, (xJ - 3.9) / 2, 0.85, 0);
  for (const x of [xr, xv]) a.remplir(x, Ra, 0.45, 1.3, 0.78, noirM);
  // caisson arrière : volume trapu, rebord supérieur, plateau et rails bas sur le toit
  o.profil([[-3.95, 1.25], [-3.95, yC], [0.9, yC], [0.9, 1.25]], W, noir, { galbe: { avant: 0.04, arriere: 0.05, fruit: 0.05, bombe: 0.01 }, biseau: 0.07 });
  o.boite(4.95, 0.1, W * 0.88, noir, -1.52, yC + 0.05, 0);
  for (const z of [-1, 1]) o.boite(4.95, 0.12, 0.12, noir, -1.52, yC + 0.16, z * 0.9);
  o.boite(0.12, 0.12, W * 0.82, noir, -3.98, yC + 0.16, 0);
  o.boite(3.4, 0.1, 0.5, noirM, -1.9, yC + 0.15, 0);
  for (const z of [-1, 1]) o.boite(5.0, 0.04, 0.05, orM, -1.5, yC, z * 1.1);
  // dessous de cabine : caisse basse noire avec passage de la roue avant (la cabine ne flotte plus en porte-à-faux)
  a.coque([[xJ, 1.3], [3.0, 1.3]], 0.45, [{ x: xv, R: Ra, y: RW }], 1.9, noirM, { galbe: false, biseau: 0.03 });
  for (const z of [-1, 1]) a.arche(xv, RW, Ra + 0.04, z * 0.97, noir, 0.06);                      // jonc d'arche
  // cabine : volume noir, pilier avant à nervures et losanges dorés, porte à baie en « D » rouge orangé
  const yK = 2.6;
  o.profil([[0.8, 1.28], [0.8, yK], [3.0, yK], [3.0, 1.28]], 2.0, noir, { galbe: { avant: 0.06, arriere: 0, fruit: 0.06, bombe: 0.02, lAv: 0.15 }, biseau: 0.08 });
  for (const z of [-1, 1]) {
    for (let i = 0; i < 4; i++) a.boiteInc(0.05, 0.13, 0.13, orM, 1.05, 1.55 + i * 0.24, z * 1.03, Math.PI / 4, 0);   // losanges dorés
    for (const x of [0.92, 1.18]) o.boite(0.03, 1.15, 0.03, orM, x, 1.95, z * 1.035);                                 // listels dorés
    for (const x of [0.98, 1.06, 1.12]) o.boite(0.04, 1.2, 0.05, noirM, x, 1.95, z * 1.02);                           // nervures du pilier
    a.dalle([[1.45, 1.5], [2.95, 1.5], [2.95, 2.36], [1.8, 2.36], [1.45, 2.05]], 0.04, noirM, z * 1.02);              // cadre de baie
    a.dalle([[1.55, 1.58], [2.88, 1.58], [2.88, 2.28], [1.84, 2.28], [1.55, 2.0]], 0.03, rouge, z * 1.035);           // baie rouge orangé
  }
  // face avant à étages : cadre extérieur, cadre intérieur en retrait, baie rouge au fond
  o.boite(0.06, 0.62, 1.5, rouge, 3.02, 1.72, 0);
  o.boite(0.12, 0.1, 1.86, noirM, 3.08, 2.08, 0); o.boite(0.12, 0.1, 1.86, noirM, 3.08, 1.36, 0);
  for (const z of [-1, 1]) o.boite(0.12, 0.82, 0.1, noirM, 3.08, 1.72, z * 0.88);
  o.boite(0.06, 0.06, 1.62, noir, 3.15, 1.98, 0); o.boite(0.06, 0.06, 1.62, noir, 3.15, 1.46, 0);
  for (const z of [-1, 1]) o.boite(0.06, 0.58, 0.06, noir, 3.15, 1.72, z * 0.76);
  // toit : plateau en chevron (pointe vers l'avant) et AILETTES étagées qui débordent en escalier au-dessus de la face
  a.plan([[0.82, -0.98], [2.85, -0.98], [3.3, 0], [2.85, 0.98], [0.82, 0.98]], yK, 0.12, noir, 0.03);
  for (let i = 0; i < 5; i++) {
    const y = yK - 0.06 - i * 0.1, xf = 3.3 + i * 0.07, wz = 0.96 - i * 0.03;
    a.plan([[2.55, -wz], [xf - 0.3, -wz], [xf, 0], [xf - 0.3, wz], [2.55, wz]], y - 0.045, 0.05, noirM, 0.012);
  }
  for (const z of [-1, 1]) o.boite(1.8, 0.05, 0.05, orM, 1.8, yK + 0.0, z * 0.99);                // liseré doré du toit
  // chasse-neige en ESCALIER : deux flasques découpées en marches, marches à jour, lame courbe en pied
  const marches = [[2.9, 1.42], [3.18, 1.42], [3.18, 1.2], [3.44, 1.2], [3.44, 0.98], [3.7, 0.98], [3.7, 0.76], [3.96, 0.76], [3.96, 0.42], [3.62, 0.36], [2.9, 0.62]];
  for (const z of [-1, 1]) a.dalle(marches, 0.1, noir, z * 0.86);
  for (const [x, y] of [[3.04, 1.42], [3.3, 1.2], [3.56, 0.98], [3.82, 0.76]]) { o.boite(0.26, 0.05, 1.64, noirM, x, y - 0.025, 0); o.boite(0.04, 0.2, 1.64, noir, x + 0.12, y - 0.12, 0); }
  const lame = a.boiteInc(0.1, 0.46, 2.1, noir, 3.98, 0.58, 0, 0.3); lame.scale.y = 1;
  o.boite(0.3, 0.06, 2.1, noirM, 3.92, 0.36, 0);
  o.phares(3.14, 1.62, [-0.62, 0.62], 0.11, lumBlanche);
  o.boite(0.06, 0.22, 0.3, lumRouge, -4.0, 1.9, 0.8); o.boite(0.06, 0.22, 0.3, lumRouge, -4.0, 1.9, -0.8);
  // flanc du caisson : fond brun à motifs dorés, chat porte-bonheur crème, bannière
  const hD = yC - 1.25 - 0.06;
  a.decalFlancC((g, w, h) => {
    g.fillStyle = '#2a1b12'; g.fillRect(0, 0, w, h);
    const k = h / 302, Wv = w / k;
    g.save(); g.scale(k, k);
    g.strokeStyle = '#8c6a2a'; g.lineWidth = 3;
    for (let j = 0; j < 7; j++) for (let i = 0; i < Math.ceil(Wv / 80) + 1; i++) for (const r of [26, 17, 8]) { g.beginPath(); g.arc(i * 80 + (j % 2) * 40, 20 + j * 52, r, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#c99a3c'; for (let i = 0; i < 22; i++) { g.beginPath(); g.ellipse(300 + (i * 97) % (Wv - 520), 60 + (i * 53) % 200, 14, 9, 0.6, 0, 7); g.fill(); }
    g.fillStyle = '#efe6cf';
    g.beginPath(); g.ellipse(170, 255, 80, 105, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(170, 125, 62, 0, 7); g.fill();
    g.beginPath(); g.moveTo(120, 90); g.lineTo(125, 35); g.lineTo(158, 72); g.fill(); g.beginPath(); g.moveTo(220, 90); g.lineTo(215, 35); g.lineTo(182, 72); g.fill();
    g.beginPath(); g.ellipse(95, 190, 22, 60, -0.4, 0, 7); g.fill();
    g.fillStyle = '#7a4a1e'; g.beginPath(); g.arc(150, 125, 7, 0, 7); g.arc(192, 125, 7, 0, 7); g.fill(); g.fillStyle = '#c3302a'; g.fillRect(122, 168, 96, 12);
    g.fillStyle = '#d9a92a'; g.beginPath(); g.ellipse(170, 275, 36, 44, 0, 0, 7); g.fill();
    const xb = Wv - 300;
    g.fillStyle = '#efe6cf'; g.beginPath(); g.moveTo(255, 200); g.quadraticCurveTo((255 + xb) / 2, 120, xb, 190); g.lineTo(xb, 270); g.quadraticCurveTo((255 + xb) / 2, 205, 255, 285); g.closePath(); g.fill();
    g.fillStyle = '#c3302a'; g.font = '900 118px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.save(); g.translate((255 + xb) / 2, 262); g.rotate(-0.04); g.fillText('LUCKY CAT', 0, 0); g.restore(); g.textAlign = 'left';
    g.fillStyle = '#efe6cf'; g.fillRect(Wv - 210, 20, 74, 262); g.fillStyle = '#c3302a'; g.font = '900 50px Arial Black, Arial, sans-serif'; for (let i = 0; i < 4; i++) g.fillText('★', Wv - 198, 72 + i * 62);
    g.restore();
    g.strokeStyle = '#d9a92a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  }, 4.75, hD, -1.55, 1.25 + 0.03 + hD / 2, W / 2 + 0.06, 1024, Math.round(1024 * hD / 4.75));
  return {
    L: 8.0, largeur: W * KZ, hauteur: 3.0, xAvant: 4.05, xArriere: -4.0,
    plafond: 0.99,                                                                                 // casting de fantaisie : rapport mesuré sur la photo de la miniature
    roues: [{ x: xr, RW, ep: 0.52, z: 1.17, avant: false, jante: '#14151a', rayons: 'cinq', flanc: '#d9a92a', sansFrein: true }, { x: xv, RW, ep: 0.5, z: 1.17, avant: true, jante: '#14151a', rayons: 'cinq', flanc: '#d9a92a', sansFrein: true }],
  };
}

export const V5_POP_H = { P03: ghoulMobile, P04: barbieExtra, H09: mightyK, H12: voitureTrain, H02: trackDwagon, H07: camionCaisson };
