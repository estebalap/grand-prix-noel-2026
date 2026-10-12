import { outils } from './outils.js';
import { monoplace, voiture, effacerArches, routiere } from './aide_4.js';

/* ------------------------------------------------------------------ F08 : monoplace blanche et bleue */
function f08(ctx) {
  return monoplace(ctx, {
    caisse: '#f1f3f6', dessous: '#15171c', accent: '#2a46c9',
    // silhouette : nez haut et pointu, pontons très inclinés vers l'arrière (rampe), gros airbox, aileron avant large à 3 plans
    forme: {
      pont: [[-2.4, 0.3], [1.5, 0.3], [1.7, 0.7], [1.5, 1.02], [0.5, 1.0], [-0.8, 0.78], [-2.4, 0.42]], pontW: 1.62,
      pontGalbe: { avant: 0.35, arriere: 0.6, fruit: 0.16, bombe: 0.06, lAv: 0.25, lAr: 0.5 },
      mono: [[4.3, 0.34], [4.35, 0.5], [3.3, 0.78], [1.8, 1.04], [0.8, 1.15], [0.1, 1.15], [-0.2, 0.9], [-1.0, 0.8], [-1.0, 0.3]], monoW: 0.78,
      airbox: { r: 0.25, h: 0.4, x: -0.3, y: 1.52, sx: 1.4 },
      aileAv: { x0: 3.6, x1: 4.5, span: 2.9, plans: 3, epH: 0.42, epX0: 3.55, epX1: 4.75, epEp: 0.07, ep2: false, haut: 0.15 },
      aileAr: { span: 1.8, x0: -3.55, x1: -2.7, y: 1.3, y2: 1.62, hEp: 0.9, epX0: -3.65, epX1: -2.5, epY0: 0.95, epY1: 1.95, epEp: 0.06, pylone: 0.12 },
      plancherW: 1.7, halo: 0.05,
    },
    aile: '#eef1f6', casque: '#2a46c9', jante: '#23262e', flanc: '#3f7bff', num: '22', numCouleur: '#2a46c9',
    motifPonton: (g, w, h) => {
      g.clearRect(0, 0, w, h);
      // trame de pixels bleus qui s'égrène vers l'arrière
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * w * 0.75 + w * 0.05, p = 1 - x / (w * 0.8);
        if (Math.random() < p * 1.3) { const s = 6 + Math.random() * 10; g.fillStyle = Math.random() < 0.5 ? '#2a46c9' : '#4a6bff'; g.fillRect(Math.floor(x / 10) * 10, Math.floor(Math.random() * h / 10) * 10, s, s); }
      }
      // grand éclair orange/rouge (motif générique)
      g.fillStyle = '#ff6a1a'; g.beginPath(); g.moveTo(w * 0.62, h * 0.1); g.lineTo(w * 0.8, h * 0.35); g.lineTo(w * 0.7, h * 0.4); g.lineTo(w * 0.88, h * 0.8); g.lineTo(w * 0.6, h * 0.5); g.lineTo(w * 0.68, h * 0.45); g.closePath(); g.fill();
      g.fillStyle = '#e5242f'; g.beginPath(); g.moveTo(w * 0.74, h * 0.2); g.lineTo(w * 0.8, h * 0.35); g.lineTo(w * 0.73, h * 0.38); g.closePath(); g.fill();
      g.fillStyle = '#15171c'; g.font = 'bold 54px Arial'; g.fillText('TURBO', w * 0.12, h * 0.86);
    },
    motifCapot: (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#ff6a1a'; g.beginPath(); g.ellipse(w * 0.75, h * 0.5, w * 0.2, h * 0.3, 0, 0, 7); g.fill();
      g.fillStyle = '#e5242f'; g.beginPath(); g.ellipse(w * 0.77, h * 0.5, w * 0.1, h * 0.18, 0, 0, 7); g.fill();
      for (let i = 0; i < 70; i++) { g.fillStyle = '#2a46c9'; g.fillRect(Math.floor(Math.random() * w * 0.5 / 10) * 10, Math.floor(Math.random() * h / 10) * 10, 9, 9); }
    },
    motifNez: (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ff6a1a'; g.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.12); g.fillStyle = '#2a46c9'; g.fillRect(w * 0.1, h * 0.55, w * 0.8, h * 0.1); },
  });
}

/* ------------------------------------------------------------------ F09 : monoplace noire à liserés vert fluo */
function f09(ctx) {
  return monoplace(ctx, {
    caisse: '#15161b', dessous: '#0d0e12', accent: '#5dff3e',
    // silhouette : pontons étroits et bas, capot effilé, nez long et fin, dérives d'aileron avant courbes, grand aileron arrière
    forme: {
      pont: [[-2.4, 0.3], [1.3, 0.3], [1.5, 0.52], [1.2, 0.8], [0.3, 0.84], [-0.9, 0.66], [-2.4, 0.46]], pontW: 1.3,
      pontGalbe: { avant: 0.45, arriere: 0.55, fruit: 0.2, bombe: 0.05, lAv: 0.3, lAr: 0.45 },
      mono: [[4.25, 0.27], [4.3, 0.38], [3.2, 0.55], [1.7, 0.92], [0.8, 1.07], [0.1, 1.08], [-0.2, 0.88], [-1.0, 0.78], [-1.0, 0.3]], monoW: 0.7,
      cap: [[0.1, 0.78], [0.1, 1.14], [-0.6, 1.22], [-1.8, 1.14], [-3.05, 0.62], [-3.05, 0.5], [-2.0, 0.5], [-1.0, 0.5]], capW: 0.6,
      requin: [[-0.3, 1.22], [-2.4, 1.2], [-3.0, 0.7]], requinEp: 0.08,
      airbox: { r: 0.17, h: 0.3, x: -0.3, y: 1.47, sx: 1.2 },
      aileAv: { x0: 3.55, x1: 4.5, span: 2.6, plans: 3, epH: 0.5, epX0: 3.5, epX1: 4.75, epEp: 0.06, ep2: true, haut: 0.14 },
      aileAr: { span: 1.5, x0: -3.55, x1: -2.65, y: 1.4, y2: 1.72, hEp: 1.0, epX0: -3.7, epX1: -2.4, epY0: 0.9, epY1: 2.0, epEp: 0.08, pylone: 0.14 },
      plancherW: 1.38, entree: { h: 0.36, y: 0.64, x: 1.4, z: 0.42 }, halo: 0.055, brasHaut: 0.5,
    },
    RWav: 0.7, RWar: 0.84, epAv: 0.66, epAr: 0.88, zAv: 1.24, zAr: 1.22,
    aile: '#15161b', casque: '#5dff3e', jante: '#5dff3e', flanc: '#5dff3e', num: '27', numCouleur: '#5dff3e',
    motifPonton: (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#5dff3e'; g.beginPath(); g.moveTo(0, h * 0.78); g.lineTo(w * 0.85, h * 0.52); g.lineTo(w * 0.86, h * 0.64); g.lineTo(0, h * 0.95); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.font = 'bold 112px Arial Black, Arial'; g.fillText('ZAP', w * 0.3, h * 0.46);
      g.fillStyle = '#5dff3e'; g.fillRect(w * 0.24, h * 0.14, 24, h * 0.36);
      g.fillStyle = '#5dff3e'; g.font = 'bold 40px Arial'; g.fillText('RACING', w * 0.62, h * 0.4);
    },
    motifCapot: (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#5dff3e'; g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.9, h * 0.5); g.lineTo(w * 0.5, h); g.lineTo(w * 0.6, h * 0.5); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.font = 'bold 60px Arial Black, Arial'; g.fillText('ZAP', w * 0.05, h * 0.62); },
    motifNez: (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#5dff3e'; g.fillRect(w * 0.1, h * 0.4, w * 0.8, h * 0.14); },
  });
}

/* ------------------------------------------------------------------ F10 : monoplace blanche, plancher noir, liserés rouges */
function f10(ctx) {
  return monoplace(ctx, {
    caisse: '#f1f3f6', dessous: '#15161b', accent: '#e5242f',
    // silhouette : pontons hauts et larges (haut blanc, bas noir), plancher noir très large, nez haut et épais, aileron avant à 4 plans
    forme: {
      pont: [[-2.3, 0.44], [1.6, 0.44], [1.8, 0.78], [1.6, 1.08], [0.4, 1.06], [-1.0, 0.92], [-2.3, 0.7]], pontW: 1.72,
      pontBas: [[-2.3, 0.3], [1.5, 0.3], [1.6, 0.46], [-2.3, 0.46]],
      pontGalbe: { avant: 0.25, arriere: 0.4, fruit: 0.1, bombe: 0.04, lAv: 0.25, lAr: 0.35 },
      mono: [[4.1, 0.34], [4.2, 0.5], [3.2, 0.74], [1.7, 1.05], [0.8, 1.18], [0.1, 1.16], [-0.2, 0.92], [-1.0, 0.8], [-1.0, 0.3]], monoW: 0.88,
      cap: [[0.1, 0.8], [0.1, 1.2], [-0.6, 1.3], [-1.8, 1.24], [-3.05, 0.74], [-3.05, 0.5], [-2.0, 0.5], [-1.0, 0.5]], capW: 0.9,
      airbox: { r: 0.22, h: 0.36, x: -0.3, y: 1.55, sx: 1.25 },
      aileAv: { x0: 3.5, x1: 4.45, span: 2.8, plans: 4, epH: 0.46, epX0: 3.45, epX1: 4.7, epEp: 0.07, ep2: false, haut: 0.14 },
      aileAr: { span: 1.9, x0: -3.6, x1: -2.7, y: 1.28, y2: 1.6, hEp: 0.9, epX0: -3.7, epX1: -2.5, epY0: 0.92, epY1: 1.9, epEp: 0.07, pylone: 0.12 },
      plancherW: 1.86, plancherX: [-3.2, 3.4], halo: 0.06, entree: { h: 0.55, y: 0.78, x: 1.75, z: 0.6 },
    },
    RWav: 0.7, RWar: 0.82, epAv: 0.64, epAr: 0.82,
    aile: '#15161b', casque: '#15161b', jante: '#23262e', flanc: '#f4f4f4', num: '20', numCouleur: '#15161b',
    motifPonton: (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#15161b'; g.font = 'bold 130px Arial Black, Arial'; g.fillText('H-NX', w * 0.18, h * 0.58);
      g.fillStyle = '#e5242f'; g.fillRect(w * 0.14, h * 0.64, w * 0.5, 14); g.fillRect(w * 0.14, h * 0.7, w * 0.4, 8);
      g.fillStyle = '#15161b';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w * (0.66 + i * 0.05), h * 0.15); g.lineTo(w * (0.7 + i * 0.05), h * 0.15); g.lineTo(w * (0.64 + i * 0.05), h * 0.8); g.lineTo(w * (0.6 + i * 0.05), h * 0.8); g.closePath(); g.fill(); }
      g.fillStyle = '#e5242f'; g.fillRect(0, h * 0.86, w, 12);
    },
    motifCapot: (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#15161b'; g.fillRect(w * 0.55, 0, w * 0.1, h); g.fillRect(w * 0.7, 0, w * 0.05, h); g.fillStyle = '#e5242f'; g.fillRect(w * 0.8, 0, w * 0.08, h); },
    motifNez: (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e5242f'; g.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.12); g.fillStyle = '#15161b'; g.fillRect(w * 0.1, h * 0.55, w * 0.8, h * 0.1); },
  });
}



/* ------------------------------------------------------------------ outils communs aux voitures de route */
/** autocollant de flanc couvrant tout le côté : (x monde → px) avec effacement automatique des passages de roues. */
function flancTotal(ctx, A, geom, S, x0, x1, y0, y1, dessin, k = 200) {
  const w = (x1 - x0), h = (y1 - y0), cw = Math.round(w * k), ch = Math.round(h * k);
  const X = (x) => (x - x0) * k, Y = (y) => (y1 - y) * k;
  A.o.decalFlanc((g, W, H) => { g.clearRect(0, 0, W, H); dessin(g, X, Y, k); effacerArches(g, S.roues, X, Y, k); }, w, h, (x0 + x1) / 2, (y0 + y1) / 2, geom.zCorps, cw, ch);
}
/** bague colorée autour d'un passage de roue (secteur d'anneau) posée sur le flanc des deux côtés. */
function bagueArche(ctx, A, geom, r, largeur, matr, jeu = 0.1) {
  const { THREE, garde } = ctx;
  const yc = r.y ?? r.RW, Ri = r.RW + jeu, Re = Ri + largeur, yS = geom.yS;
  const ai = Math.asin(Math.max(-0.99, (yS - yc) / Ri)), ae = Math.asin(Math.max(-0.99, (yS - yc) / Re)), pts = [];
  for (let i = 0; i <= 16; i++) { const t = ai + (Math.PI - 2 * ai) * i / 16; pts.push([r.x + Ri * Math.cos(t), yc + Ri * Math.sin(t)]); }
  for (let i = 16; i >= 0; i--) { const t = ae + (Math.PI - 2 * ae) * i / 16; pts.push([r.x + Re * Math.cos(t), yc + Re * Math.sin(t)]); }
  A.dalle(pts, 0.035, matr, geom.zCorps + 0.004, true);
}
function swirl(g, pts, coul, ep, k = 1) {
  g.strokeStyle = coul; g.lineWidth = ep * 1.8; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i + 2 < pts.length + 0; i += 3) g.bezierCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1]);
  g.stroke();
}
function tour(g, cx, base, h, coul, ep) {
  // tour métallique stylisée (silhouette générique de monument)
  g.strokeStyle = coul; g.fillStyle = coul; g.lineWidth = ep * 1.8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - h * 0.28, base); g.quadraticCurveTo(cx - h * 0.06, base - h * 0.35, cx - h * 0.025, base - h * 0.62); g.lineTo(cx, base - h);
  g.lineTo(cx + h * 0.025, base - h * 0.62); g.quadraticCurveTo(cx + h * 0.06, base - h * 0.35, cx + h * 0.28, base); g.stroke();
  g.beginPath(); g.moveTo(cx - h * 0.16, base - h * 0.2); g.lineTo(cx + h * 0.16, base - h * 0.2); g.moveTo(cx - h * 0.06, base - h * 0.5); g.lineTo(cx + h * 0.06, base - h * 0.5); g.stroke();
  g.beginPath(); g.moveTo(cx - h * 0.16, base - h * 0.2); g.lineTo(cx + h * 0.06, base - h * 0.5); g.moveTo(cx + h * 0.16, base - h * 0.2); g.lineTo(cx - h * 0.06, base - h * 0.5); g.stroke();
}
const roueRoute = (x, RW, avant, o = {}) => ({ x, RW, ep: o.ep ?? 0.5, avant, ...o });

/* ------------------------------------------------------------------ FR01 : SUV coupé bleu encre, arabesques blanches, lèvres d'ailes rouges */
/** lèvre d'aile : demi-tore plat collé au bord du passage de roue, des deux côtés. */
function levre(K, r, a, w, mat, ep = 0.07, larg = 0.08) {
  const { THREE } = K, T = K.o;
  for (const sg of [-1, 1]) {
    const g = new THREE.TorusGeometry(a.R + larg * 0.4, ep, 6, 24, Math.PI + 0.5);
    const m = new THREE.Mesh(K.garde(g), mat); m.rotation.z = -0.25; m.position.set(r.x, a.y, sg * (w - 0.03)); m.scale.set(1, 1, 0.8); T.ajouter(m);
  }
}
function fr01(ctx) {
  const { lumBlanche, lumRouge } = ctx;
  const jr = { jante: '#dfe2e8', rayons: 'cinq', etrier: '#e5242f' };
  const S = {
    caisse: '#1e3fae', toit: '#1e3fae', metal: 0.4,
    /* Brief 10 bis — SUV haut et COURT (photo : L/H ≈ 2,9, L/W ≈ 2,4) : L = 6,2 (au lieu de 8,18), empattement 3,75,
       porte-à-faux courts, capot épais et face avant VERTICALE (calandre debout), roues inchangées. */
    corps: [
      { x: 3.1, w: 1.0, y0: 0.56, y1: 1.44, nt: 4, nb: 3 },
      { x: 2.9, w: 1.2, y0: 0.47, y1: 1.62, nt: 5, nb: 3.5 },
      { x: 1.95, w: 1.3, y0: 0.47, y1: 1.72, nt: 6, nb: 4 },
      { x: 0.9, w: 1.22, y0: 0.47, y1: 1.7, nt: 8, nb: 4 },
      { x: -0.5, w: 1.2, y0: 0.47, y1: 1.7, nt: 8, nb: 4 },
      { x: -1.8, w: 1.31, y0: 0.49, y1: 1.76, nt: 6, nb: 4 },
      { x: -2.85, w: 1.2, y0: 0.52, y1: 1.72, nt: 4.5, nb: 3 },
      { x: -3.1, w: 1.0, y0: 0.6, y1: 1.58, nt: 3, nb: 2.6 },
    ],
    serre: [
      { x: 0.9, w: 1.02, y0: 1.68, y1: 1.7, nt: 3, wt: 0.9 },
      { x: -0.1, w: 1.12, y0: 1.28, y1: 2.08, nt: 5, wt: 0.9 },
      { x: -1.7, w: 1.14, y0: 1.3, y1: 2.06, nt: 5, wt: 0.9 },
      { x: -2.55, w: 1.1, y0: 1.46, y1: 1.94, nt: 4.5, wt: 0.9 },
      { x: -3.05, w: 0.96, y0: 1.66, y1: 1.68, nt: 3, wt: 0.9 },
    ],
    pav: { xr0: -0.15, xr1: -2.5, A: [0.9, -0.15], B: [-1.0, -0.85], C: [-2.95, -2.0], tR: 0.95 },
    roues: [{ x: 1.95, RW: 0.7, ep: 0.58, avant: true, jeu: 0.13, ...jr }, { x: -1.8, RW: 0.7, ep: 0.62, avant: false, jeu: 0.13, ...jr }],
    retro: 'peint', retroX: 0.65,
    extra(c2, K, G) {
      const o = K.o, rouge = o.lac('#e5242f', 0.3, 0.2), bl = '#f4f6fb';
      // lèvres d'ailes rouges
      for (let i = 0; i < G.roues.length; i++) levre(K, G.roues[i], G.arches[i], K.flancAu(G.corps, G.roues[i].x, G.arches[i].y + G.arches[i].R * 0.5) + 0.0, rouge, 0.06);
      // face avant : grande calandre en losanges sombre à cadre chrome, phares effilés, bouclier noir
      const xN = K.bordX(G.corps, 1, 0.98, 0);
      o.boite(0.12, 0.48, 1.04, o.mat('#1b1e26', 0.35, 0.8), xN - 0.04, 0.98, 0);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) o.boite(0.03, 0.035, 0.035, o.chrome, xN + 0.03, 0.79 + i * 0.07 + (j % 2) * 0.03, -0.42 + j * 0.12).rotation.x = 0.785;
      o.boite(0.04, 0.52, 0.04, o.chrome, xN + 0.02, 0.98, 0.54); o.boite(0.04, 0.52, 0.04, o.chrome, xN + 0.02, 0.98, -0.54); o.boite(0.04, 0.04, 1.1, o.chrome, xN + 0.02, 1.24, 0);
      for (const sg of [-1, 1]) {
        const xh = K.bordX(G.corps, 1, 1.26, 0.62);
        o.boite(0.16, 0.07, 0.38, lumBlanche, xh - 0.05, 1.26, sg * 0.62).rotation.y = sg * 0.4;
        o.boite(0.1, 0.22, 0.04, lumBlanche, K.bordX(G.corps, 1, 0.9, 0.76) - 0.03, 0.9, sg * 0.76);
      }
      o.boite(0.2, 0.14, 1.5, G.noir, K.bordX(G.corps, 1, 0.66, 0) - 0.05, 0.66, 0);
      // poupe : feux fins, bouclier noir
      for (const sg of [-1, 1]) o.boite(0.12, 0.09, 0.55, lumRouge, K.bordX(G.corps, -1, 1.56, 0.6) + 0.03, 1.56, sg * 0.6);
      o.boite(0.2, 0.18, 1.5, G.noir, K.bordX(G.corps, -1, 0.74, 0) + 0.06, 0.74, 0);
      // arabesques blanches + tour stylisée (motifs génériques) sur les flancs
      K.drapeFlancs(G.corps, -3.05, 3.0, 0.6, 1.62, (g, X0, Y, k) => { const X = (x) => X0(x * 0.76);   // motifs recalés sur la caisse raccourcie
        swirl(g, [[X(-3.4), Y(1.15)], [X(-2.6), Y(1.5)], [X(-1.9), Y(0.75)], [X(-1.3), Y(1.1)], [X(-0.6), Y(1.45)], [X(0.4), Y(0.75)], [X(1.2), Y(1.1)]], bl, 5);
        swirl(g, [[X(-3.5), Y(0.8)], [X(-2.5), Y(0.62)], [X(-1.5), Y(1.15)], [X(-0.3), Y(1.0)], [X(0.8), Y(0.9)], [X(1.6), Y(1.35)], [X(2.4), Y(1.2)]], bl, 4);
        tour(g, X(-1.75), Y(0.6), 0.8 * k, bl, 4); tour(g, X(0.3), Y(0.62), 0.55 * k, bl, 3);
        g.strokeStyle = bl; g.lineWidth = 8; g.beginPath(); g.arc(X(-0.6), Y(0.95), 0.13 * k, 0, 7); g.stroke();
        g.beginPath(); g.arc(X(-3.1), Y(1.0), 0.1 * k, 0, 7); g.stroke();
        
      }, G.roues);
      K.drapeDessus(G.corps, 1.0, 2.95, -0.8, 0.8, (g, w, h) => { swirl(g, [[w * 0.02, h * 0.5], [w * 0.3, h * 0.0], [w * 0.5, h * 1.0], [w * 0.98, h * 0.35]], bl, 6); swirl(g, [[w * 0.02, h * 0.75], [w * 0.4, h * 0.3], [w * 0.6, h * 0.9], [w * 0.98, h * 0.6]], bl, 4); }, 1024, 384);
      K.drapeDessus(G.serre, -2.4, -0.2, -0.5, 0.5, (g, w, h) => { swirl(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], bl, 7); }, 1024, 256, 0.05);
    },
  };
  return routiere(ctx, S);
}

/* ------------------------------------------------------------------ FR02 : compacte sportive bleue (hayon), jantes noires à anneau rouge, aileron de hayon */
function fr02(ctx) {
  const { lumBlanche, lumRouge } = ctx;
  const jr = { jante: '#1d2026', rayons: 'cinq', flanc: '#e5242f', etrier: '#e5242f' };
  const S = {
    caisse: '#1f4fc4', metal: 0.4,
    /* Brief 10 bis — compacte 5 portes à hayon (photo : L/H ≈ 2,6–3, empattement ≈ 0,65 L) : L = 5,8 (au lieu de 7,42),
       empattement 3,6, face avant verticale, hayon court et droit, roues inchangées. */
    corps: [
      { x: 2.9, w: 1.02, y0: 0.44, y1: 1.3, nt: 4, nb: 3 },
      { x: 2.7, w: 1.19, y0: 0.36, y1: 1.44, nt: 5, nb: 3 },
      { x: 1.85, w: 1.29, y0: 0.34, y1: 1.56, nt: 7, nb: 4 },
      { x: 0.8, w: 1.22, y0: 0.34, y1: 1.5, nt: 8, nb: 4 },
      { x: -0.5, w: 1.2, y0: 0.34, y1: 1.5, nt: 8, nb: 4 },
      { x: -1.75, w: 1.31, y0: 0.35, y1: 1.52, nt: 6, nb: 4 },
      { x: -2.65, w: 1.2, y0: 0.4, y1: 1.48, nt: 4, nb: 3 },
      { x: -2.9, w: 1.02, y0: 0.48, y1: 1.38, nt: 3, nb: 2.4 },
    ],
    serre: [
      { x: 0.85, w: 1.06, y0: 1.46, y1: 1.48, nt: 3, wt: 0.9 },
      { x: -0.1, w: 1.15, y0: 0.98, y1: 1.86, nt: 5, wt: 0.9 },
      { x: -1.7, w: 1.17, y0: 1.02, y1: 1.84, nt: 5, wt: 0.9 },
      { x: -2.4, w: 1.11, y0: 1.2, y1: 1.74, nt: 4.5, wt: 0.9 },
      { x: -2.85, w: 0.95, y0: 1.44, y1: 1.46, nt: 3, wt: 0.9 },
    ],
    pav: { xr0: -0.15, xr1: -2.25, A: [0.85, -0.15], B: [-0.95, -0.8], C: [-2.6, -1.85], tR: 0.95 },
    roues: [{ x: 1.85, RW: 0.64, ep: 0.56, avant: true, jeu: 0.13, ...jr }, { x: -1.75, RW: 0.64, ep: 0.62, avant: false, jeu: 0.13, ...jr }],
    retro: 'peint', retroX: 0.55,
    extra(c2, K, G) {
      const o = K.o, rouge = o.lac('#e5242f', 0.3, 0.2), bleuF = o.lac('#173d9a', 0.25, 0.4), bl = '#f4f6fb';
      // face avant : grande bouche noire, lame rouge, phares anguleux
      const xN = K.bordX(G.corps, 1, 0.7, 0);
      o.boite(0.14, 0.28, 1.3, o.mat('#101217', 0.4, 0.7), xN - 0.04, 0.7, 0);
      o.boite(0.16, 0.05, 1.4, rouge, K.bordX(G.corps, 1, 0.5, 0) - 0.03, 0.5, 0);
      for (const sg of [-1, 1]) { const xh = K.bordX(G.corps, 1, 1.04, 0.6); o.boite(0.18, 0.08, 0.38, lumBlanche, xh - 0.06, 1.04, sg * 0.58).rotation.y = sg * 0.45; o.boite(0.04, 0.16, 0.05, lumBlanche, K.bordX(G.corps, 1, 0.66, 0.78) - 0.02, 0.66, sg * 0.78); }
      o.boite(0.3, 0.04, 0.5, o.mat('#1a1d24', 0.4, 0.6), K.bordX(G.corps, 1, 1.02, 0) - 0.12, 1.04, 0);
      // poupe : feux en bandeau, diffuseur, double sortie centrale
      for (const sg of [-1, 1]) o.boite(0.12, 0.1, 0.55, lumRouge, K.bordX(G.corps, -1, 1.4, 0.6) + 0.03, 1.4, sg * 0.58);
      o.boite(0.2, 0.18, 1.5, G.noir, K.bordX(G.corps, -1, 0.6, 0) + 0.07, 0.6, 0);
      for (const sg of [-1, 1]) o.cyl(0.08, 0.08, 0.2, o.chrome, K.bordX(G.corps, -1, 0.6, 0) - 0.02, 0.58, sg * 0.14, 0, Math.PI / 2, 14);
      // aileron de hayon + joues
      const yT = K.hautAu(G.serre, -2.35, 0);
      K.dalle([[-2.3, yT - 0.03], [-2.85, yT - 0.12], [-2.92, yT - 0.03], [-2.35, yT + 0.05]], 1.3, bleuF, 0, false, 0.015);
      // flancs : bande blanche, monuments stylisés (motifs génériques), filet rouge bas
      K.drapeFlancs(G.corps, -2.85, 2.75, 0.45, 1.36, (g, X0, Y, k) => { const X = (x) => X0(x * 0.78);   // motifs recalés sur la caisse raccourcie
        g.fillStyle = bl; g.beginPath(); g.moveTo(X(-3.3), Y(0.82)); g.bezierCurveTo(X(-1.5), Y(0.9), X(0.5), Y(0.8), X(3.0), Y(1.2)); g.lineTo(X(3.0), Y(1.1)); g.bezierCurveTo(X(0.5), Y(0.72), X(-1.5), Y(0.8), X(-3.3), Y(0.72)); g.fill();
        tour(g, X(-1.4), Y(0.88), 0.55 * k, bl, 4);
        g.strokeStyle = bl; g.lineWidth = 7; g.beginPath(); g.moveTo(X(-0.4), Y(1.3)); g.lineTo(X(-0.3), Y(0.95)); g.moveTo(X(-0.15), Y(1.3)); g.lineTo(X(-0.25), Y(0.95)); g.moveTo(X(-0.4), Y(1.3)); g.lineTo(X(-0.15), Y(1.3)); g.stroke();
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(X(-0.275), Y(1.33)); g.lineTo(X(-0.275) + Math.cos(a) * 0.22 * k, Y(1.33) + Math.sin(a) * 0.22 * k); g.stroke(); }
        g.beginPath(); g.arc(X(0.6), Y(1.05), 0.1 * k, 0, 7); g.stroke();
        g.fillStyle = '#e5242f'; g.fillRect(X(-3.4), Y(0.56), 6.6 * 0.78 * k, 0.05 * k);
      }, G.roues);
      K.drapeDessus(G.corps, 1.0, 2.7, -0.75, 0.75, (g, w, h) => { swirl(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.45]], bl, 6); }, 1024, 384);
      K.drapeDessus(G.serre, -2.0, -0.2, -0.45, 0.45, (g, w, h) => { swirl(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], bl, 7); }, 1024, 256, 0.05);
    },
  };
  return routiere(ctx, S);
}

/* ------------------------------------------------------------------ FR03 : berline « goutte d'eau » blanche, nez plongeant, jupes arrière, vitres bleues */
function fr03(ctx) {
  const { lumBlanche, lumRouge } = ctx;
  const jr = { jante: '#eceae4', rayons: 'plein', flanc: null };
  const S = {
    caisse: '#f1efe9', toit: '#98a0ab', metal: 0.2, vitre: '#2350d8', opVitre: 0.9,
    corps: [
      { x: 4.4, w: 0.76, y0: 0.52, y1: 0.9, nt: 2, nb: 2.2 },
      { x: 4.0, w: 1.1, y0: 0.44, y1: 1.12, nt: 2.8, nb: 3 },
      { x: 2.6, w: 1.27, y0: 0.42, y1: 1.42, nt: 5, nb: 3.6 },
      { x: 1.3, w: 1.21, y0: 0.42, y1: 1.36, nt: 7, nb: 4 },
      { x: -0.6, w: 1.2, y0: 0.42, y1: 1.36, nt: 7, nb: 4 },
      { x: -2.5, w: 1.25, y0: 0.44, y1: 1.44, nt: 5, nb: 4 },
      { x: -3.7, w: 0.99, y0: 0.52, y1: 1.26, nt: 2.8, nb: 3 },
      { x: -4.35, w: 0.64, y0: 0.62, y1: 1.04, nt: 2, nb: 2 },
    ],
    serre: [
      { x: 1.25, w: 1.02, y0: 1.32, y1: 1.34, nt: 3, wt: 0.9 },
      { x: 0.3, w: 1.14, y0: 1.0, y1: 1.7, nt: 4.5, wt: 0.9 },
      { x: -1.6, w: 1.14, y0: 1.02, y1: 1.68, nt: 4.5, wt: 0.9 },
      { x: -2.6, w: 1.06, y0: 1.14, y1: 1.56, nt: 4, wt: 0.9 },
      { x: -3.55, w: 0.78, y0: 1.26, y1: 1.28, nt: 3, wt: 0.9 },
    ],
    pav: { xr0: 0.2, xr1: -2.0, A: [1.25, 0.2], B: [-0.7, -0.58], C: [-2.2, -1.85], tR: 0.95 },
    roues: [{ x: 2.6, RW: 0.64, ep: 0.48, avant: true, jeu: 0.13, ...jr }, { x: -2.5, RW: 0.64, ep: 0.48, avant: false, jeu: 0.13, ...jr, deb: -0.03 }],
    retro: 'noir', retroX: 0.95,
    extra(c2, K, G) {
      const o = K.o, chrome = o.chrome, noirL = '#15161b';
      // nez : doubles phares ronds sous carénage vitré, pare-chocs chromé fin
      for (const sg of [-1, 1]) for (const [zz, rr] of [[0.6, 0.12], [0.36, 0.1]]) {
        const yy = 1.0, xh = K.bordX(G.corps, 1, yy, zz);
        o.cyl(rr * 1.15, rr * 1.15, 0.06, chrome, xh - 0.02, yy, sg * zz, 0, Math.PI / 2 - 0.25, 20).rotation.y = sg * 0.4;
        K.ellipso(0.04, rr, rr, lumBlanche, xh + 0.0, yy, sg * zz);
      }
      o.boite(0.12, 0.06, 1.0, chrome, K.bordX(G.corps, 1, 0.6, 0) - 0.03, 0.6, 0);
      o.boite(0.1, 0.05, 0.9, o.mat('#1a1c22', 0.5, 0.5), K.bordX(G.corps, 1, 0.74, 0) - 0.03, 0.74, 0);
      // poupe : feux hauts en trompette (cônes rouges), pare-chocs chrome
      for (const sg of [-1, 1]) { const xr = K.bordX(G.corps, -1, 1.22, 0.5); o.cyl(0.08, 0.04, 0.22, lumRouge, xr - 0.04, 1.22, sg * 0.5, 0, Math.PI / 2, 12); }
      o.boite(0.12, 0.06, 1.3, chrome, K.bordX(G.corps, -1, 0.72, 0) + 0.03, 0.72, 0);
      // jupes de roues arrière : coque peinte qui recouvre le haut du pneu arrière (à l'extérieur du pneu)
      const r = G.roues[1], a = G.arches[1];
      for (const sg of [-1, 1]) {
        const sh = new K.THREE.Shape(); const R = Math.min(a.R + 0.08, K.hautAu(G.corps, r.x, r.z) - a.y - 0.03), y0 = 0.0;   // jupe bornée sous la ligne de caisse
        const t0 = Math.asin(Math.max(-0.99, y0 / R));
        sh.moveTo(R * Math.cos(t0), y0); sh.absarc(0, 0, R, t0, Math.PI - t0, false); sh.closePath();
        const g = new K.THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 20 });
        const m = new K.THREE.Mesh(K.garde(g), G.peint); m.position.set(r.x, a.y, sg * (r.z + r.ep / 2 + 0.02) - (sg < 0 ? 0.06 : 0)); o.ajouter(m);
      }
      // baguette chromée de flanc
      for (const sg of [-1, 1]) for (let i = 0; i < 34; i++) { const x = -3.3 + i * 0.19, y = 1.2; if (!K.dedans(G.corps, x + 0.1, y, 0.3) || !K.dedans(G.corps, x - 0.1, y, 0.3) || G.arches.some((a) => Math.abs(x - a.x) < a.R + 0.12)) continue; o.boite(0.2, 0.03, 0.02, chrome, x, y, sg * (K.flancAu(G.corps, x, y) + 0.005)).rotation.y = 0; }
      K.drapeFlancs(G.corps, -4.1, 4.1, 0.55, 1.3, (g, X, Y, k) => {
        swirl(g, [[X(-3.8), Y(0.85)], [X(-3.0), Y(1.2)], [X(-2.4), Y(0.6)], [X(-1.6), Y(0.85)], [X(-0.8), Y(1.15)], [X(0.4), Y(0.62)], [X(1.4), Y(0.88)], [X(2.0), Y(1.15)], [X(2.8), Y(0.7)], [X(3.4), Y(0.82)]], noirL, 5);
        g.strokeStyle = noirL; g.lineWidth = 6; g.beginPath(); g.arc(X(-1.6), Y(0.82), 0.09 * k, 0, 7); g.stroke();
        g.fillStyle = noirL; g.font = 'italic bold ' + Math.round(0.18 * k) + 'px Georgia, serif'; g.fillText('Paris', X(-0.5), Y(0.66));
      }, [G.roues[0]]);
      K.drapeDessus(G.serre, -1.9, 0.2, -0.5, 0.5, (g, w, h) => { swirl(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.45]], noirL, 8); g.strokeStyle = noirL; g.lineWidth = 7; g.beginPath(); g.arc(w * 0.75, h * 0.35, h * 0.15, 0, 7); g.stroke(); }, 1024, 256, 0.05);
    },
  };
  return routiere(ctx, S);
}

/* ------------------------------------------------------------------ FR04 : citadine turbo rouge à voies arrière très élargies, écopes latérales */
function fr04(ctx) {
  const { lumBlanche, lumRouge } = ctx;
  const jr = { jante: '#d9dce2', rayons: 'dix', etrier: '#e5242f' };
  const S = {
    caisse: '#d0281e', metal: 0.3,
    corps: [
      { x: 3.4, w: 0.97, y0: 0.42, y1: 1.1, nt: 3, nb: 3 },
      { x: 3.15, w: 1.09, y0: 0.36, y1: 1.27, nt: 3.8, nb: 4 },
      { x: 2.15, w: 1.17, y0: 0.34, y1: 1.42, nt: 6, nb: 4.5 },
      { x: 1.0, w: 1.16, y0: 0.34, y1: 1.4, nt: 8, nb: 4.5 },
      { x: -0.4, w: 1.16, y0: 0.34, y1: 1.42, nt: 8, nb: 4.5 },
      { x: -1.1, w: 1.27, y0: 0.35, y1: 1.46, nt: 5, nb: 4.5 },
      { x: -1.95, w: 1.47, y0: 0.36, y1: 1.54, nt: 6, nb: 4.5 },
      { x: -2.85, w: 1.41, y0: 0.38, y1: 1.52, nt: 5, nb: 4 },
      { x: -3.35, w: 1.09, y0: 0.44, y1: 1.46, nt: 3.5, nb: 3 },
    ],
    serre: [
      { x: 1.1, w: 1.05, y0: 1.38, y1: 1.4, nt: 4, wt: 0.9 },
      { x: 0.1, w: 1.13, y0: 0.72, y1: 2.12, nt: 5, wt: 0.9 },
      { x: -2.4, w: 1.15, y0: 0.76, y1: 2.12, nt: 5, wt: 0.9 },
      { x: -2.95, w: 1.11, y0: 1.0, y1: 1.96, nt: 4.6, wt: 0.9 },
      { x: -3.15, w: 0.95, y0: 1.48, y1: 1.5, nt: 4, wt: 0.9 },
    ],
    pav: { xr0: 0.05, xr1: -2.55, A: [1.1, 0.05], B: [-0.95, -0.82], C: [-3.0, -2.2], tR: 0.92 },
    roues: [{ x: 2.15, RW: 0.6, ep: 0.52, avant: true, jeu: 0.13, ...jr }, { x: -1.95, RW: 0.64, ep: 0.82, avant: false, jeu: 0.13, ...jr }],
    retro: 'noir', retroX: 0.85,
    extra(c2, K, G) {
      const o = K.o, noir = G.noir, jaune = o.mat('#ffb21a', 0.4, 0.2), rouge = G.peint;
      // face : calandre noire à lamelles, phares rectangulaires, antibrouillards jaunes, bouclier noir
      const xN = K.bordX(G.corps, 1, 0.9, 0);
      o.boite(0.12, 0.22, 1.1, o.mat('#101217', 0.4, 0.7), xN - 0.04, 0.9, 0);
      for (let i = 0; i < 3; i++) o.boite(0.03, 0.025, 1.08, o.mat('#3a3d45', 0.4, 0.6), xN + 0.02, 0.83 + i * 0.065, 0);
      for (const sg of [-1, 1]) { o.boite(0.08, 0.15, 0.3, lumBlanche, K.bordX(G.corps, 1, 0.93, 0.68) - 0.03, 0.93, sg * 0.68); o.boite(0.08, 0.08, 0.2, jaune, K.bordX(G.corps, 1, 0.56, 0.6) - 0.02, 0.56, sg * 0.6); }
      o.boite(0.18, 0.17, 1.7, noir, K.bordX(G.corps, 1, 0.55, 0) - 0.05, 0.55, 0);
      o.boite(0.5, 0.05, 0.5, noir, 2.4, K.hautAu(G.corps, 2.4, 0.0) + 0.0, 0.0);         // écope de capot
      // poupe : feux, bouclier, petit becquet de toit
      for (const sg of [-1, 1]) o.boite(0.08, 0.22, 0.36, lumRouge, K.bordX(G.corps, -1, 1.3, 0.72) + 0.03, 1.3, sg * 0.72);
      o.boite(0.18, 0.2, 1.9, noir, K.bordX(G.corps, -1, 0.6, 0) + 0.05, 0.6, 0);
      const yT = K.hautAu(G.serre, -2.55, 0);
      K.dalle([[-2.45, yT - 0.02], [-2.9, yT - 0.08], [-2.95, yT + 0.0], [-2.5, yT + 0.04]], 1.4, G.peint, 0, false, 0.015);
      // écopes latérales : boîtes noires creusées dans les ailes arrière, devant la roue
      for (const sg of [-1, 1]) {
        const x = -1.05, y = 1.16, z = K.flancAu(G.corps, x, y);
        o.boite(0.6, 0.38, 0.12, noir, x, y, sg * (z - 0.02));
        for (let i = 0; i < 4; i++) o.boite(0.56, 0.025, 0.04, o.mat('#3a3d45', 0.5, 0.5), x, y - 0.14 + i * 0.09, sg * (z + 0.04));
      }
      // bas de caisse noir, joints de portes, filet blanc
      K.drapeFlancs(G.corps, -3.3, 3.3, 0.38, 1.36, (g, X, Y, k) => {
        g.fillStyle = '#14161b'; g.fillRect(X(-3.3), Y(0.6), 6.6 * k, 0.22 * k);
        g.strokeStyle = 'rgba(20,22,27,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(-0.5), Y(1.42)); g.lineTo(X(-0.5), Y(0.62)); g.moveTo(X(1.05), Y(1.36)); g.lineTo(X(1.05), Y(0.62)); g.stroke();
        g.fillStyle = '#f4f6fb'; g.font = 'bold ' + Math.round(0.2 * k) + 'px Arial Black, Arial'; g.fillText('TURBO', X(-0.35), Y(0.7));
      }, G.roues);
    },
  };
  return routiere(ctx, S);
}

/* ------------------------------------------------------------------ FR05 : compacte rouge à ligne de ceinture montante, arabesques blanches */
function fr05(ctx) {
  const { lumBlanche, lumRouge } = ctx;
  const jr = { jante: '#e3e5ea', rayons: 'cinq', etrier: '#222' };
  const S = {
    caisse: '#d8301f', metal: 0.3,
    /* Brief 10 bis — crossover compact haut (photo de profil : L/H ≈ 2,8, empattement ≈ 0,66 L) : L = 5,7 (au lieu de 7,47),
       empattement 3,65, ceinture montante vers l'arrière, face avant verticale, roues inchangées. */
    corps: [
      { x: 2.85, w: 1.02, y0: 0.48, y1: 1.36, nt: 4, nb: 3 },
      { x: 2.65, w: 1.19, y0: 0.38, y1: 1.48, nt: 5, nb: 3 },
      { x: 1.85, w: 1.28, y0: 0.38, y1: 1.58, nt: 7, nb: 4 },
      { x: 0.8, w: 1.22, y0: 0.38, y1: 1.5, nt: 8, nb: 4 },
      { x: -0.5, w: 1.19, y0: 0.38, y1: 1.54, nt: 8, nb: 4 },
      { x: -1.8, w: 1.3, y0: 0.4, y1: 1.58, nt: 6, nb: 4 },
      { x: -2.6, w: 1.2, y0: 0.46, y1: 1.56, nt: 4, nb: 3 },
      { x: -2.85, w: 1.02, y0: 0.54, y1: 1.48, nt: 3, nb: 2.4 },
    ],
    serre: [
      { x: 0.85, w: 1.04, y0: 1.48, y1: 1.5, nt: 3, wt: 0.9 },
      { x: -0.15, w: 1.13, y0: 0.98, y1: 1.94, nt: 5, wt: 0.9 },
      { x: -1.4, w: 1.15, y0: 1.06, y1: 1.92, nt: 5, wt: 0.9 },
      { x: -2.25, w: 1.11, y0: 1.26, y1: 1.8, nt: 4.5, wt: 0.9 },
      { x: -2.8, w: 0.94, y0: 1.52, y1: 1.54, nt: 3, wt: 0.9 },
    ],
    pav: { xr0: -0.2, xr1: -2.1, A: [0.85, -0.2], B: [-0.85, -0.72], C: [-2.55, -1.55], tR: 0.95 },
    roues: [{ x: 1.85, RW: 0.64, ep: 0.55, avant: true, jeu: 0.13, ...jr }, { x: -1.8, RW: 0.64, ep: 0.6, avant: false, jeu: 0.13, ...jr }],
    retro: 'noir', retroX: 0.55,
    extra(c2, K, G) {
      const o = K.o, noir = G.noir, bl = '#f4f6fb';
      // face : calandre en écu sombre à cadre chrome, phares effilés + feux de jour chromés
      const xN = K.bordX(G.corps, 1, 0.86, 0);
      o.boite(0.12, 0.32, 0.9, o.mat('#101217', 0.4, 0.7), xN - 0.04, 0.86, 0);
      o.boite(0.04, 0.04, 0.96, o.chrome, xN + 0.02, 1.03, 0); o.boite(0.04, 0.04, 0.8, o.chrome, xN + 0.02, 0.69, 0);
      for (const sg of [-1, 1]) { const xh = K.bordX(G.corps, 1, 1.08, 0.62); o.boite(0.2, 0.08, 0.36, lumBlanche, xh - 0.07, 1.08, sg * 0.6).rotation.y = sg * 0.45; o.boite(0.04, 0.03, 0.3, o.chrome, K.bordX(G.corps, 1, 0.7, 0.66) - 0.02, 0.7, sg * 0.66); }
      o.boite(0.12, 0.12, 1.3, noir, K.bordX(G.corps, 1, 0.6, 0) - 0.03, 0.6, 0);
      for (const sg of [-1, 1]) o.boite(0.12, 0.14, 0.5, lumRouge, K.bordX(G.corps, -1, 1.46, 0.6) + 0.03, 1.46, sg * 0.6);
      o.boite(0.2, 0.18, 1.5, noir, K.bordX(G.corps, -1, 0.7, 0) + 0.06, 0.7, 0);
      const yT = K.hautAu(G.serre, -2.15, 0);
      K.dalle([[-2.1, yT - 0.03], [-2.55, yT - 0.12], [-2.62, yT - 0.05], [-2.15, yT + 0.03]], 1.24, G.peint, 0, false, 0.015);
      K.drapeFlancs(G.corps, -2.8, 2.65, 0.42, 1.38, (g, X0, Y, k) => { const X = (x) => X0(x * 0.76);   // motifs recalés sur la caisse raccourcie
        g.fillStyle = bl; g.beginPath(); g.moveTo(X(-3.4), Y(0.74)); g.bezierCurveTo(X(-1.5), Y(0.82), X(0.5), Y(0.72), X(3.2), Y(1.25)); g.lineTo(X(3.2), Y(1.12)); g.bezierCurveTo(X(0.5), Y(0.62), X(-1.5), Y(0.7), X(-3.4), Y(0.62)); g.fill();
        swirl(g, [[X(-3.2), Y(1.15)], [X(-2.6), Y(1.55)], [X(-1.8), Y(0.8)], [X(-1.0), Y(1.1)], [X(-0.2), Y(1.4)], [X(0.5), Y(0.9)], [X(1.2), Y(1.2)]], bl, 4);
        g.fillStyle = bl; g.font = 'bold ' + Math.round(0.18 * k) + 'px Arial'; g.fillText('PARIS', X(0.25), Y(0.86));
        g.strokeStyle = bl; g.lineWidth = 7; g.beginPath(); g.arc(X(-0.2), Y(0.98), 0.1 * k, 0, 7); g.stroke();
        // moulin stylisé (motif générique)
        g.beginPath(); g.moveTo(X(-1.45), Y(1.3)); g.lineTo(X(-1.35), Y(0.86)); g.moveTo(X(-1.15), Y(1.3)); g.lineTo(X(-1.25), Y(0.86)); g.moveTo(X(-1.45), Y(1.3)); g.lineTo(X(-1.15), Y(1.3)); g.stroke();
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(X(-1.3), Y(1.33)); g.lineTo(X(-1.3) + Math.cos(a) * 0.24 * k, Y(1.33) + Math.sin(a) * 0.24 * k); g.stroke(); }
      }, G.roues);
      K.drapeDessus(G.corps, 1.0, 2.65, -0.75, 0.75, (g, w, h) => { swirl(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], bl, 6); swirl(g, [[0, h * 0.75], [w * 0.4, h * 0.25], [w * 0.7, h * 0.9], [w, h * 0.7]], bl, 4); }, 1024, 384);
      K.drapeDessus(G.serre, -1.9, -0.25, -0.45, 0.45, (g, w, h) => { swirl(g, [[0, h * 0.5], [w * 0.3, 0], [w * 0.6, h], [w, h * 0.5]], bl, 7); }, 1024, 256, 0.05);
    },
  };
  return routiere(ctx, S);
}

/* ------------------------------------------------------------------ H02 : break cyber gris, vitrages roses translucides, châssis rose, ouïes de toit */
function h02(ctx) {
  const { lumBlanche, lumRouge, THREE } = ctx;
  const jr = { jante: '#17181c', rayons: 'plein', flanc: '#f4f4f4', lenticulaire: true, sansFrein: true };
  const S = {
    caisse: '#80848b', metal: 0.25, rug: 0.35, vitre: '#ff2a78', opVitre: 0.8,
    corps: [
      { x: 4.05, w: 1.0, y0: 0.56, y1: 1.18, nt: 3.4, nb: 3 },
      { x: 3.8, w: 1.17, y0: 0.5, y1: 1.36, nt: 4.5, nb: 4 },
      { x: 2.55, w: 1.29, y0: 0.5, y1: 1.54, nt: 6, nb: 5 },
      { x: 1.3, w: 1.23, y0: 0.5, y1: 1.4, nt: 8, nb: 5 },
      { x: -0.5, w: 1.21, y0: 0.5, y1: 1.4, nt: 8, nb: 5 },
      { x: -2.5, w: 1.31, y0: 0.5, y1: 1.54, nt: 6, nb: 5 },
      { x: -3.75, w: 1.23, y0: 0.52, y1: 1.5, nt: 4.5, nb: 4 },
      { x: -4.05, w: 1.09, y0: 0.58, y1: 1.42, nt: 3.4, nb: 3 },
    ],
    serre: [
      { x: 1.4, w: 1.06, y0: 1.38, y1: 1.4, nt: 4, wt: 0.9 },
      { x: 0.4, w: 1.17, y0: 0.92, y1: 1.88, nt: 5, wt: 0.9 },
      { x: -3.3, w: 1.17, y0: 0.92, y1: 1.88, nt: 5, wt: 0.9 },
      { x: -3.85, w: 1.13, y0: 1.12, y1: 1.78, nt: 5, wt: 0.9 },
      { x: -4.0, w: 1.03, y0: 1.46, y1: 1.48, nt: 4, wt: 0.9 },
    ],
    pav: { xr0: 0.4, xr1: -3.6, A: [1.4, 0.4], B: [-0.7, -0.52], C: [-2.3, -2.12], D: [-3.95, -3.45], tR: 0.92 },
    roues: [{ x: 2.55, RW: 0.68, ep: 0.58, avant: true, jeu: 0.13, deb: -0.03, ...jr }, { x: -2.5, RW: 0.68, ep: 0.64, avant: false, jeu: 0.13, deb: -0.03, ...jr }],
    retro: 'noir', retroX: 1.15,
    extra(c2, K, G) {
      const o = K.o, noir = G.noir, rose = o.lac('#ff2d7a', 0.35, 0.15);
      const roseL = K.garde(new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0xff2a88, emissiveIntensity: 0.7, roughness: 0.3, transparent: true, opacity: 0.88 }));
      // châssis rose visible sous la caisse grise (même passages de roues)
      K.loft(G.corps.map((s) => ({ ...s, w: s.w - 0.05, y0: s.y0 - 0.2, y1: s.y0 + 0.16, nt: 3, nb: 3 })), rose, { arches: G.arches, nx: 80, ns: 40 });
      // face avant : calandre noire, blocs optiques roses translucides, bouclier rose
      const xN = K.bordX(G.corps, 1, 0.92, 0);
      o.boite(0.12, 0.38, 1.5, o.mat('#24262c', 0.6, 0.4), xN - 0.04, 0.92, 0);
      for (const sg of [-1, 1]) { o.boite(0.12, 0.28, 0.44, roseL, xN + 0.01, 0.95, sg * 0.5); o.boite(0.06, 0.08, 0.3, lumBlanche, K.bordX(G.corps, 1, 1.24, 0.62) - 0.02, 1.24, sg * 0.62); }
      // capot : écope + évent rose
      const yC = K.hautAu(G.corps, 2.5, 0);
      K.dalle([[1.8, yC - 0.05], [3.0, yC - 0.1], [3.0, yC + 0.04], [2.0, yC + 0.12]], 0.8, G.peint, 0, false, 0.03);
      o.boite(0.12, 0.1, 0.6, roseL, 3.0, yC + 0.0, 0);
      // toit : ouïes roses translucides + aileron de pavillon
      const yT = K.hautAu(G.serre, -1, 0);
      for (const [x, z] of [[0.1, 0.42], [0.1, -0.42], [-1.3, 0.42], [-1.3, -0.42]]) { const m = o.boite(0.5, 0.16, 0.34, roseL, x, yT + 0.08, z); m.rotation.z = 0.12; }
      const yTr = K.hautAu(G.serre, -3.4, 0);
      K.dalle([[-3.0, yTr - 0.02], [-4.1, yTr + 0.05], [-4.15, yTr + 0.16], [-3.1, yTr + 0.1]], 1.6, G.peint, 0, false, 0.03);
      for (const sg of [-1, 1]) K.dalle([[-3.2, yTr - 0.04], [-4.12, yTr - 0.04], [-4.12, yTr + 0.24], [-3.4, yTr + 0.12]], 0.05, G.peint, sg * 0.95);
      // poupe : feux, bouclier
      for (const sg of [-1, 1]) o.boite(0.08, 0.18, 0.46, lumRouge, K.bordX(G.corps, -1, 1.33, 0.62) + 0.02, 1.33, sg * 0.62);
      o.boite(0.14, 0.18, 1.6, noir, K.bordX(G.corps, -1, 0.74, 0) + 0.04, 0.74, 0);
      // flancs : bande rose, chevrons, plaque numérotée, signes génériques
      K.drapeFlancs(G.corps, -3.9, 3.8, 0.55, 1.38, (g, X, Y, k) => {
        g.fillStyle = '#ff2d7a'; g.fillRect(X(-3.9), Y(0.82), 7.7 * k, 0.24 * k);
        g.fillStyle = '#4a4d55'; g.fillRect(X(-2.0), Y(1.08), 2.3 * k, 0.26 * k);
        g.fillStyle = '#14161b'; for (let i = 0; i < 7; i++) { g.beginPath(); const x0 = X(-1.9 + i * 0.3); g.moveTo(x0, Y(0.84)); g.lineTo(x0 + 0.12 * k, Y(0.84)); g.lineTo(x0 + 0.3 * k, Y(1.06)); g.lineTo(x0 + 0.18 * k, Y(1.06)); g.closePath(); g.fill(); }
        g.fillStyle = '#d62f93'; g.fillRect(X(-1.4), Y(1.26), 1.5 * k, 0.2 * k);
        g.fillStyle = '#fff'; g.font = 'bold ' + Math.round(0.17 * k) + 'px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('X-09', X(-0.65), Y(1.16));
        g.textAlign = 'left'; g.fillStyle = '#14161b'; g.font = 'bold ' + Math.round(0.14 * k) + 'px Arial'; g.fillText('XX', X(0.4), Y(1.18)); g.fillText('XX', X(0.75), Y(1.18));
        g.strokeStyle = '#14161b'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0.2), Y(1.26)); g.lineTo(X(0.2), Y(0.84)); g.moveTo(X(-1.7), Y(1.26)); g.lineTo(X(-1.7), Y(0.84)); g.stroke();
      }, G.roues);
    },
  };
  return routiere(ctx, S);
}

export const GROUPE_4 = { F08: f08, F09: f09, F10: f10, FR01: fr01, FR02: fr02, FR03: fr03, FR04: fr04, FR05: fr05, H02: h02 };
