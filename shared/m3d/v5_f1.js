/* Chantier V5 — escouade « f1 » : UNE architecture de monoplace F1 de l'ère effet de sol (2024–2025), déclinée en dix livrées.

   Gabarit réel commun (cotes règlement / constructeurs) : 5 630 × 2 000 × 950 mm, empattement 3 600 mm, roues 18 pouces
   (pneus Ø 720 mm ; 305 mm de large à l'avant, 405 mm à l'arrière), voie avant ≈ 1 695 mm, voie arrière ≈ 1 595 mm.
   Tout est modélisé EN MÈTRES dans un groupe mis à l'échelle K (1 m réel = 1,492 unité de scène → 8,39 unités hors tout,
   même gabarit que les autres bolides). Seules les roues (posées par bolides3d.js) sont déclarées en unités de scène.

   Pièces (toutes lisibles à distance de TV) :
     · monocoque + nez fin (loft à sections superelliptiques), cockpit sombre, appuie-tête, pilote casqué ;
     · halo titane brossé (arceau en Y : fer à cheval autour du casque + pilier central) ;
     · boîte à air / arceau de sécurité, caméra T-cam sur l'arceau, caméras de nez ;
     · pontons à effet d'induction : gueule d'entrée d'air, contre-dépouille (undercut) et rampe de downwash plongeante ;
     · fond plat carbone avec bords relevés (floor edges), ailette de bord de fond, diffuseur à cloisons ;
     · capot moteur « taille de guêpe » + aileron de requin portant le numéro ;
     · aileron avant à 4 plans (bord d'attaque en flèche, extrémités relevées vers les endplates), endplates et dérives ;
     · aileron arrière : plan principal en cuillère, volet DRS supérieur, actionneur central, mât « col de cygne »,
       endplates arrondies, beam wing bi-plan, feu de pluie, échappement central ;
     · suspensions en triangles (bras carbone), biellettes de direction et poussoirs : TOUT s'arrête au porte-moyeu,
       côté intérieur de la jante (jamais dans l'anneau visible du pneu) ; écopes de frein ; déflecteurs au-dessus des roues avant ;
     · rétroviseurs sur bras, numéros génériques sur le nez et l'aileron de requin.
   Livrées : couleurs seulement (peinture par sommet sur les lofts + matériaux par élément), AUCUN logo ni nom de marque. */
import { outils } from './outils.js';
import { planche, tige, tube } from './aide_3.js';

const K = 1.492;                                  // unités de scène par mètre réel (5,62 m → 8,39)
/* ------------------------------------------------------------------ cotes communes (mètres) */
const XAV = 1.70, XAR = -1.90;                    // essieux : empattement 3,60 m
const RP = 0.36;                                  // rayon des pneus (Ø 720 mm, jante 18 pouces)
const EP_AV = 0.305, EP_AR = 0.405;               // largeurs de pneus
const ZC_AV = (2.0 - EP_AV) / 2, ZC_AR = (2.0 - EP_AR) / 2;   // centres des pneus : 2,00 m hors tout aux deux essieux
const NEZ = 2.82, POUPE = -2.85;                  // bord d'attaque de l'aileron avant, bord de fuite de l'aileron arrière

/* ================================================================== géométrie de base */
const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt', 'wb', 'zc'];
const DEF = { nt: 2.6, nb: 3.4, wt: 1, wb: 1, zc: 0 };
const norm = (st) => st.map((s) => ({ ...DEF, ...s }));

/** Station interpolée (Hermite, tangentes de Catmull-Rom bornées) entre stations triées par x croissant. */
function station(st, x) {
  const n = st.length; let i = 0;
  while (i < n - 2 && x > st[i + 1].x) i++;
  const a = st[i], b = st[i + 1], h = Math.max(1e-6, b.x - a.x), t = Math.min(1, Math.max(0, (x - a.x) / h));
  const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
  const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const r = { x };
  for (const k of CH) {
    const ma = (b[k] - p0[k]) / Math.max(1e-6, b.x - p0.x), mb = (p3[k] - a[k]) / Math.max(1e-6, p3.x - a.x);
    const v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb, lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.25;
    r[k] = Math.min(hi + m, Math.max(lo - m, v));
  }
  return r;
}
/** Point de section superelliptique : t ∈ [0, 2π[, haut rétréci de wt (tumblehome), bas rétréci de wb (contre-dépouille). */
function ptSection(s, t) {
  const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb, yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
  const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const k = yy > 0 ? 1 - (1 - s.wt) * yy : 1 - (1 - s.wb) * (-yy);
  return [s.zc + s.w * zz * k, yc + hh * yy];
}
/** Hauteur exacte du dessus du loft en (x, z) (bisection sur le paramètre de section). */
function hautLoft(st, x, z) {
  const s = station(st, x), d = Math.abs(z - s.zc), sg = z >= s.zc ? 1 : -1;
  let a = 0, b = Math.PI / 2;
  for (let i = 0; i < 32; i++) { const m = (a + b) / 2, [zz] = ptSection(s, sg > 0 ? m : Math.PI - m); if (Math.abs(zz - s.zc) > d) a = m; else b = m; }
  return ptSection(s, sg > 0 ? b : Math.PI - b)[1];
}

/**
 * Corps lofté fermé, PEINT PAR SOMMET : `peint(x, y, z, info)` → teinte sRGB '#rrggbb' (info : u = écart latéral relatif,
 * v = hauteur relative dans la section, ext = côté extérieur pour un ponton). Renvoie { mesh, st }.
 */
function loftPeint(ctx, o, stIn, mat, peint, opt = {}) {
  const { THREE, garde } = ctx;
  const st = norm(stIn), NX = opt.nx || 120, NS = opt.ns || 56, pos = [], col = [], idx = [];
  const cache = new Map();
  const teinte = (hex) => { let c = cache.get(hex); if (!c) { c = new THREE.Color(hex).convertSRGBToLinear(); cache.set(hex, c); } return c; };
  const x0 = st[0].x, x1 = st[st.length - 1].x;
  const pousse = (x, y, z, s) => {
    pos.push(x, y, z);
    const u = Math.abs(z - s.zc) / Math.max(1e-4, s.w), v = (y - s.y0) / Math.max(1e-4, s.y1 - s.y0);
    const c = teinte(peint(x, y, z, { u, v, ext: s.zc === 0 ? true : (z - s.zc) * Math.sign(s.zc) > 0, s }));
    col.push(c.r, c.g, c.b);
  };
  { const s = st[0]; for (let k = 0; k < NS; k++) pousse(s.x, (s.y0 + s.y1) / 2, s.zc, s); }
  for (let j = 0; j < NX; j++) {
    const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, s = station(st, x);
    for (let k = 0; k < NS; k++) { const [z, y] = ptSection(s, k / NS * 2 * Math.PI); pousse(x, y, z, s); }
  }
  { const s = st[st.length - 1]; for (let k = 0; k < NS; k++) pousse(s.x, (s.y0 + s.y1) / 2, s.zc, s); }
  const NT = NX + 2;
  for (let j = 0; j < NT - 1; j++) for (let k = 0; k < NS; k++) {
    const a = j * NS + k, b = j * NS + (k + 1) % NS, c = (j + 1) * NS + k, d = (j + 1) * NS + (k + 1) % NS;
    idx.push(a, c, b, b, c, d);
  }
  let vol = 0;                                                      // volume signé : faces retournées si nécessaire
  for (let i = 0; i < idx.length; i += 3) {
    const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
    vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return { mesh: o.ajouter(new THREE.Mesh(garde(g), mat)), st };
}

/**
 * Plan porteur balayé le long de l'envergure (z ∈ [−span, span]) : profil d'aile inversé (déportance) dont le bord d'attaque,
 * la hauteur, la corde et l'incidence varient avec t = |z| / span. sec(t) → { xle, y, c, a (rad, bord de fuite relevé), e (épaisseur relative) }.
 */
function aile(ctx, o, mat, span, sec, opt = {}) {
  const { THREE, garde } = ctx;
  const N = opt.n || 48, M = 10, pos = [], idx = [];
  const anneau = (z) => {
    const t = Math.min(1, Math.abs(z) / span), s = sec(t), ca = Math.cos(s.a), sa = Math.sin(s.a), cam = s.cam ?? 0.05;
    const pts = [];
    for (let k = 0; k <= M; k++) pts.push((1 - Math.cos(Math.PI * k / M)) / 2);
    const prof = [];
    const ep = (X) => 5 * s.e * (0.2969 * Math.sqrt(X) - 0.126 * X - 0.3516 * X * X + 0.2843 * X ** 3 - 0.1036 * X ** 4);
    const cb = (X) => -cam * 4 * X * (1 - X);                       // ligne moyenne creusée vers le haut : intrados en bas = déportance
    for (let k = M; k >= 0; k--) prof.push([pts[k], cb(pts[k]) + ep(pts[k])]);   // extrados : bord de fuite → bord d'attaque
    for (let k = 1; k < M; k++) prof.push([pts[k], cb(pts[k]) - ep(pts[k])]);      // intrados : bord d'attaque → bord de fuite
    return prof.map(([X, Y]) => [s.xle - X * s.c * ca + Y * s.c * sa, s.y + X * s.c * sa + Y * s.c * ca, z]);
  };
  const P = 2 * M;                                                  // points par anneau
  const zs = []; for (let i = 0; i <= N; i++) zs.push(span * Math.sin(Math.PI / 2 * (2 * i / N - 1)));
  for (const z of zs) for (const p of anneau(z)) pos.push(...p);
  for (let i = 0; i < N; i++) for (let k = 0; k < P; k++) {
    const a = i * P + k, b = i * P + (k + 1) % P, c = (i + 1) * P + k, d = (i + 1) * P + (k + 1) % P;
    idx.push(a, b, c, b, d, c);
  }
  for (const [i, sg] of [[0, -1], [N, 1]]) {                       // bouchons d'extrémité
    const base = i * P, ctr = pos.length / 3; let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < P; k++) { cx += pos[(base + k) * 3]; cy += pos[(base + k) * 3 + 1]; cz += pos[(base + k) * 3 + 2]; }
    pos.push(cx / P, cy / P, cz / P);
    for (let k = 0; k < P; k++) sg > 0 ? idx.push(base + k, ctr, base + (k + 1) % P) : idx.push(base + (k + 1) % P, ctr, base + k);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const gg = g.toNonIndexed(); gg.computeVertexNormals();
  return o.ajouter(new THREE.Mesh(garde(gg), mat));
}

const lisse = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ================================================================== textures procédurales */
function texCarbone(ctx) {
  /* sergé 2×2 contrasté : lisible comme du carbone même à distance de TV (cases de ≈ 4 cm à l'échelle) */
  const { THREE, garde } = ctx, cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#1b1c20'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const a = (i + j) % 2 === 0;
    const gr = a ? g.createLinearGradient(i * 16, 0, i * 16 + 16, 0) : g.createLinearGradient(0, j * 16, 0, j * 16 + 16);
    gr.addColorStop(0, '#16171a'); gr.addColorStop(0.5, a ? '#3a3e46' : '#2a2d33'); gr.addColorStop(1, '#16171a');
    g.fillStyle = gr; g.fillRect(i * 16 + 1, j * 16 + 1, 14, 14);
  }
  const t = garde(new THREE.CanvasTexture(cv)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.encoding = THREE.sRGBEncoding; return t;
}
function texBrosse(ctx) {
  const { THREE, garde } = ctx, cv = document.createElement('canvas'); cv.width = 512; cv.height = 32; const g = cv.getContext('2d');
  g.fillStyle = '#9da3ab'; g.fillRect(0, 0, 512, 32);
  let a = 12345; const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  for (let i = 0; i < 260; i++) { const v = 130 + Math.floor(r() * 90); g.fillStyle = `rgba(${v},${v + 4},${v + 10},.55)`; g.fillRect(0, r() * 32, 512, 0.6 + r() * 1.2); }
  const t = garde(new THREE.CanvasTexture(cv)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); t.encoding = THREE.sRGBEncoding; return t;
}

/* ================================================================== décalcomanies drapées */
function matDecal(ctx, draw, cw, ch) {
  const { THREE, garde, envMap } = ctx;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
  const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.1, envMap, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }));
}
/** Grille posée sur le DESSUS d'un loft entre x0..x1 et z0..z1 (canvas vu de dessus, avant à droite, +z en bas du canvas). */
function drapeHaut(ctx, o, st, x0, x1, z0, z1, mat, eps = 0.004, masque = null) {
  const { THREE, garde } = ctx, nu = 44, nv = 16, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) {
    const u = i / nu, v = k / nv, x = x0 + (x1 - x0) * u;
    let za = z0, zb = z1; if (masque) { const m = masque(x); za = -m; zb = m; }
    const z = za + (zb - za) * v;
    pos.push(x, hautLoft(st, x, z) + eps, z); uv.push(u, 1 - v);
  }
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, b = (i + 1) * (nv + 1) + k; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(garde(g), mat); m.renderOrder = 2; return o.ajouter(m);
}

/** Numéro de course générique (chiffres seuls, aucune police de marque). */
const numero = (num, fond, encre, contour) => (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.font = `900 ${Math.round(h * 0.82)}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (fond) { const tw = g.measureText(num).width + h * 0.35; g.fillStyle = fond; g.beginPath(); const x = w / 2 - tw / 2, y = h * 0.08, r = h * 0.18, ww = tw, hh = h * 0.84; g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.fill(); }
  if (contour) { g.lineWidth = h * 0.08; g.strokeStyle = contour; g.strokeText(num, w / 2, h * 0.54); }
  g.fillStyle = encre; g.fillText(num, w / 2, h * 0.54);
};

/** Courbe de Bézier quadratique échantillonnée (contours arrondis des endplates). */
const bez = (a, c, b, n = 8) => { const r = []; for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; r.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return r; };

/**
 * Plaque mince (endplate, dérive) : contour (x, y) avec ouïes (trous), épaisseur `ep`, posée en z, puis GALBÉE :
 * courbe(x, y) → décalage en z (l'endplate s'enroule vers l'intérieur en tête, comme le plan qu'elle reçoit).
 */
function plaque(ctx, o, mat, contour, trous, ep, z, courbe = null) {
  const { THREE, garde } = ctx;
  const sh = new THREE.Shape(); contour.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
  for (const t of trous) { const pa = new THREE.Path(); t.forEach(([x, y], i) => (i ? pa.lineTo(x, y) : pa.moveTo(x, y))); pa.closePath(); sh.holes.push(pa); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: ep, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -ep / 2);
  if (courbe) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + courbe(p.getX(i), p.getY(i))); g.computeVertexNormals(); }
  const m = new THREE.Mesh(garde(g), mat); m.position.z = z; return o.ajouter(m);
}
/** Ouïe oblique (parallélogramme) pour plaque(). */
const fente = (x, y, l, h, d = 0.012) => [[x, y], [x - l, y], [x - l + d, y + h], [x + d, y + h]];

/* Silhouette de référence (2024–2025) : chaque équipe surcharge ce qui la distingue (nez, gueule et undercut des pontons,
   pente du downwash, capot, ailerons). Mètres réels. */
const SIL_DEF = {
  nezX: 2.76, nezW: 1, nezY: 0.105,                                 // pointe du nez : abscisse, largeur relative, hauteur du dessous
  pod: { x: 0.62, zc: 0.475, w: 0.24, y0: 0.35, y1: 0.655, wb: 0.5, bouche: [0.84, 0.74] },   // gueule d'entrée d'air + contre-dépouille
  dw: 1,                                                            // rampe de downwash (1 = référence ; > 1 = plus plongeante)
  capW: 1, requin: 1,                                               // largeur du capot, hauteur de l'aileron de requin
  av: { monte: 1, ep: 'arrondi', fleche: 0.15 },                    // aileron avant : remontée des plans, forme d'endplate, flèche
  ar: { c: 0.30, cuil: 0.07, ep: 'arrondi', mat: 'simple' },        // aileron arrière : corde, cuillère, endplate, mât simple ou double
};
const silhouette = (s = {}) => ({ ...SIL_DEF, ...s, pod: { ...SIL_DEF.pod, ...(s.pod || {}) }, av: { ...SIL_DEF.av, ...(s.av || {}) }, ar: { ...SIL_DEF.ar, ...(s.ar || {}) } });

/* ================================================================== l'architecture commune */
function monoplace(ctx, L) {
  const { THREE } = ctx;
  /* groupe à l'échelle : tout ce qui suit est écrit en mètres réels */
  const ech = new THREE.Group(); ech.scale.setScalar(K); ech.name = 'f1-echelle'; ctx.chassis.add(ech);
  const c2 = { ...ctx, chassis: ech }, o = outils(c2);
  const env = ctx.envMap;

  /* ---- matériaux ---- */
  const corps = ctx.garde(new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xffffff, roughness: L.rugo ?? 0.26, metalness: L.metal ?? 0.18, clearcoat: 1, clearcoatRoughness: L.mat ? 0.5 : 0.06, envMap: env, envMapIntensity: L.mat ? 0.35 : 0.75 }));
  const lacM = (hex) => (L.mat ? ctx.garde(new THREE.MeshPhysicalMaterial({ color: o.lin(hex), roughness: 0.55, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.5, envMap: env, envMapIntensity: 0.35 })) : o.lac(hex, 0.24, L.metal ?? 0.18));
  const memo = new Map(); const lq = (hex) => { if (!memo.has(hex)) memo.set(hex, lacM(hex)); return memo.get(hex); };
  const carbone = ctx.garde(new THREE.MeshStandardMaterial({ map: texCarbone(ctx), color: 0xc4c8d0, roughness: 0.62, metalness: 0.15, envMap: env, envMapIntensity: 0.08 }));   // carbone nu : reflets d environnement très atténués (sinon le fond plat vire au gris clair en vue rasante)
  const noirMat = o.mat('#0d0e11', 0.75, 0.2);
  const fondMat = ctx.garde(new THREE.MeshStandardMaterial({ map: texCarbone(ctx), color: 0xd0d4dc, roughness: 0.9, metalness: 0, envMap: env, envMapIntensity: 0.05 }));   // fond plat : mat (en vue rasante un carbone brillant vire au gris clair)
  const titane = ctx.garde(new THREE.MeshStandardMaterial({ map: texBrosse(ctx), color: 0xa9aeb5, roughness: 0.4, metalness: 1, envMap: env, envMapIntensity: 1.1 }));   // titane brossé : gris chaud, pas du chrome
  const brasMat = ctx.garde(new THREE.MeshPhysicalMaterial({ map: texCarbone(ctx), color: 0xffffff, roughness: 0.35, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, envMap: env }));
  const glace = o.mat('#c9d3de', 0.08, 1);
  const ti = o.mat('#8c7f72', 0.35, 0.9);                          // titane bleui de l'échappement
  const S = silhouette(L.sil);

  /* ================= MONOCOQUE + NEZ ================= */
  const coqueSt = [
    { x: -0.85, w: 0.36, y0: 0.07, y1: 0.66, nt: 2.4, nb: 4, wt: 0.74 },
    { x: -0.30, w: 0.40, y0: 0.07, y1: 0.68, nt: 2.4, nb: 4, wt: 0.74 },
    { x: 0.20, w: 0.35, y0: 0.07, y1: 0.665, nt: 2.4, nb: 4, wt: 0.74 },
    { x: 0.65, w: 0.27, y0: 0.09, y1: 0.655, nt: 2.3, nb: 4, wt: 0.74 },
    { x: 1.15, w: 0.205, y0: 0.14, y1: 0.60, nt: 2.2, nb: 3.6, wt: 0.78 },
    /* nez : longueur, largeur et hauteur de pointe propres à chaque équipe (court sur le 2e plan, long jusqu'au bord d'attaque…) */
    ...[[0.28, 0.16, 0.165, 0.52, 3.4, 0.8], [0.53, 0.128, 0.15, 0.42, 3.2, 0.82], [0.75, 0.10, 0.125, 0.325, 3, 0.85], [0.91, 0.072, null, 0.245, 3, 0.88]]
      .map(([f, w, y0, y1, nb, wt]) => ({ x: 1.15 + (S.nezX - 1.15) * f, w: w * S.nezW, y0: y0 ?? S.nezY - 0.005, y1: Math.max(y1, (y0 ?? S.nezY) + 0.12), nt: 2.2, nb, wt })),
    { x: S.nezX, w: 0.04 * S.nezW, y0: S.nezY, y1: S.nezY + 0.085, nt: 2.2, nb: 3, wt: 0.9 },
  ];
  const coque = loftPeint(c2, o, coqueSt, corps, (x, y, z, i) => L.peint(x, y, z, 'coque', i), { nx: 110, ns: 48 });

  /* cockpit : ouverture sombre drapée sur le dessus, appuie-tête, pilote */
  const demiCockpit = (x) => { const u = (x + 0.46) / 0.98; return 0.05 + 0.20 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u)) * 0.92 + 0.08), 0.6) * (1 - 0.35 * u); };
  drapeHaut(c2, o, coque.st, -0.46, 0.52, 0, 0, noirMat, 0.004, demiCockpit);
  for (const z of [-1, 1]) o.boite(0.24, 0.07, 0.09, lq(L.appui || L.base), -0.36, 0.69, z * 0.165);       // coussins d'appui-tête
  const casque = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(0.135, 28, 18)), o.lac(L.casque || '#f2f2f2', 0.2, 0.25));
  casque.position.set(-0.24, 0.775, 0); casque.scale.set(1.12, 1, 0.94); o.ajouter(casque);
  const visiere = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(0.1, 20, 12, -0.9, 1.8, 1.05, 0.55)), o.mat('#07080b', 0.05, 0.9));
  visiere.position.set(-0.235, 0.775, 0); visiere.rotation.y = Math.PI / 2; visiere.scale.set(1.4, 1.38, 1.5); o.ajouter(visiere);
  const bandeau = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(0.128, 0.012, 8, 32)), o.lac(L.casque2 || L.acc || '#d0d0d0', 0.25, 0.2));
  bandeau.position.set(-0.24, 0.80, 0); bandeau.rotation.x = Math.PI / 2; bandeau.scale.set(1.12, 0.94, 1); o.ajouter(bandeau);

  /* ================= HALO (titane brossé) ================= */
  const halo = [[-0.40, 0.665, -0.25], [-0.27, 0.80, -0.28], [-0.02, 0.855, -0.275], [0.22, 0.866, -0.18], [0.36, 0.862, -0.06], [0.395, 0.86, 0], [0.36, 0.862, 0.06], [0.22, 0.866, 0.18], [-0.02, 0.855, 0.275], [-0.27, 0.80, 0.28], [-0.40, 0.665, 0.25]];
  tube(c2, o, halo, 0.024, titane, 90, 12);
  tube(c2, o, [[0.395, 0.862, 0], [0.47, 0.83, 0], [0.55, 0.75, 0], [0.59, 0.68, 0], [0.60, 0.645, 0]], 0.028, titane, 30, 12);   // pilier central
  for (const z of [-1, 1]) { const p = o.boite(0.12, 0.03, 0.06, titane, -0.40, 0.668, z * 0.25); p.rotation.z = -0.2; }          // pattes arrière
  o.boite(0.08, 0.025, 0.07, titane, 0.60, 0.648, 0);

  /* ================= PONTONS (effet d'induction) ================= */
  const louvres = matDecal(c2, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {                                    // lames inclinées, du plus clair (bord) au plus sombre (fond de l'ouïe)
      const x = w * (0.06 + i * 0.105);
      g.fillStyle = 'rgba(8,9,12,.92)'; g.fillRect(x, h * 0.12, w * 0.05, h * 0.76);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x + w * 0.05, h * 0.12, w * 0.012, h * 0.76);
    }
  }, 512, 128);
  /* rampe de downwash : le dessus du ponton plonge vers le plancher derrière l'épaule (S.dw règle la pente) */
  const P = S.pod, kw = P.w / 0.24, toit = (d) => Math.max(0.15, 0.655 - S.dw * d);
  const podSt = [
    { x: -1.70, zc: 0.22, w: 0.09 * kw, y0: 0.08, y1: Math.max(0.17, toit(0.5)), nt: 2.4, nb: 3, wt: 0.8, wb: 1 },
    { x: -1.35, zc: 0.29, w: 0.16 * kw, y0: 0.07, y1: Math.max(0.19, toit(0.44)), nt: 2.4, nb: 3, wt: 0.75, wb: 0.95 },
    { x: -0.90, zc: 0.37, w: 0.215 * kw, y0: 0.07, y1: Math.max(0.22, toit(0.31)), nt: 2.6, nb: 3, wt: 0.7, wb: 0.8 },
    { x: -0.45, zc: P.zc - 0.045, w: 0.25 * kw, y0: 0.07, y1: toit(0.13), nt: 2.8, nb: 3, wt: 0.68, wb: (P.wb + 0.62) / 2 },
    { x: 0.00, zc: P.zc - 0.01, w: 0.262 * kw, y0: 0.08, y1: Math.min(P.y1 - 0.015, 0.645), nt: 3.0, nb: 3, wt: 0.7, wb: P.wb },
    { x: P.x - 0.22, zc: P.zc, w: P.w * 1.06, y0: Math.max(0.12, P.y0 - 0.2), y1: P.y1 + 0.005, nt: 3.2, nb: 3, wt: 0.74, wb: P.wb },
    { x: P.x, zc: P.zc, w: P.w, y0: P.y0, y1: P.y1, nt: 3.4, nb: 3.4, wt: 0.8, wb: 0.85 },
  ];
  for (const sg of [-1, 1]) {
    const st = podSt.map((s) => ({ ...s, zc: s.zc * sg }));
    const pod = loftPeint(c2, o, st, corps, (x, y, z, i) => L.peint(x, y, z, 'ponton', i), { nx: 110, ns: 52 });
    /* ouïes de refroidissement sur le dessus du ponton (lames sombres drapées) */
    const zc0 = sg * (P.zc - 0.035);
    drapeHaut(c2, o, pod.st, -0.78, -0.22, zc0 - 0.11, zc0 + 0.11, louvres, 0.003);
    /* gueule d'entrée d'air : section avant réduite, noire, posée juste devant le bouchon */
    const s = norm(st)[st.length - 1], sh = new THREE.Shape();
    const yc = (s.y0 + s.y1) / 2;
    for (let k = 0; k <= 40; k++) {
      const [zz, yy] = ptSection(s, k / 40 * 2 * Math.PI), Z = s.zc + (zz - s.zc) * P.bouche[0], Y = yc + (yy - yc) * P.bouche[1] + 0.01;
      k ? sh.lineTo(-Z, Y) : sh.moveTo(-Z, Y);
    }
    const bouche = new THREE.Mesh(ctx.garde(new THREE.ShapeGeometry(sh, 2)), noirMat); bouche.rotation.y = Math.PI / 2; bouche.position.x = s.x + 0.004; o.ajouter(bouche);
    const fond = new THREE.Mesh(ctx.garde(new THREE.ShapeGeometry(sh, 2)), o.mat('#2a2c31', 0.5, 0.6)); fond.rotation.y = Math.PI / 2; fond.position.x = s.x + 0.003; fond.scale.set(1, 1, 1); o.ajouter(fond);
    /* grilles de radiateur : quelques lames sombres visibles dans la gueule */
    for (let i = 0; i < 4; i++) o.boite(0.006, 0.006, s.w * 1.5 * P.bouche[0], o.mat('#3a3d44', 0.4, 0.8), s.x + 0.006, yc + (s.y1 - s.y0) * P.bouche[1] * (i / 3 - 0.5) * 0.8 + 0.01, s.zc);
  }

  /* ================= CAPOT MOTEUR + BOÎTE À AIR ================= */
  const capSt = [
    { x: -2.46, w: 0.07, y0: 0.22, y1: 0.375, nt: 2.2, nb: 3, wt: 0.7 },
    { x: -2.15, w: 0.10, y0: 0.17, y1: 0.43, nt: 2.2, nb: 3, wt: 0.65 },
    { x: -1.80, w: 0.15, y0: 0.13, y1: 0.50, nt: 2.3, nb: 3, wt: 0.6 },
    { x: -1.35, w: 0.235, y0: 0.10, y1: 0.615, nt: 2.4, nb: 3, wt: 0.6 },
    { x: -0.90, w: 0.32, y0: 0.08, y1: 0.73, nt: 2.4, nb: 3.4, wt: 0.62 },
    { x: -0.40, w: 0.37, y0: 0.07, y1: 0.715, nt: 2.4, nb: 4, wt: 0.68 },
  ].map((s, i, a) => (i < a.length - 1 ? { ...s, w: s.w * S.capW } : s));
  loftPeint(c2, o, capSt, corps, (x, y, z, i) => L.peint(x, y, z, 'capot', i), { nx: 120, ns: 52 });
  const boiteSt = [
    { x: -1.30, w: 0.11, y0: 0.55, y1: 0.68, nt: 2.4, nb: 2, wt: 0.7 },
    { x: -0.85, w: 0.13, y0: 0.56, y1: 0.925, nt: 2.4, nb: 2, wt: 0.62 },
    { x: -0.56, w: 0.115, y0: 0.58, y1: 0.95, nt: 2.4, nb: 2, wt: 0.6 },
    { x: -0.44, w: 0.09, y0: 0.60, y1: 0.915, nt: 2.4, nb: 2, wt: 0.6 },
  ];
  loftPeint(c2, o, boiteSt, corps, (x, y, z, i) => L.peint(x, y, z, 'boite', i), { nx: 44, ns: 36 });
  {                                                                 // prise d'air au-dessus du casque (ogive sombre) + ouïes latérales
    const pa = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 24, 14)), noirMat); pa.scale.set(0.02, 0.07, 0.062); pa.position.set(-0.437, 0.81, 0); o.ajouter(pa);
    for (const z of [-1, 1]) { const ou = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 16, 10)), noirMat); ou.scale.set(0.012, 0.045, 0.03); ou.position.set(-0.52, 0.86, z * 0.095); ou.rotation.y = z * 0.5; o.ajouter(ou); }
  }
  /* aileron de requin : lame fine sur l'axe, du haut de la boîte à air jusqu'à l'aileron arrière */
  o.profil([[-0.80, 0.86], [-0.98, 0.915], [-2.32, 0.77], [-2.43, 0.70], [-2.43, 0.36], [-1.40, 0.56]].map(([x, y], i) => [x, i < 4 ? 0.62 + (y - 0.62) * S.requin : y]), 0.012, lq(L.requin || L.base), { galbe: false, biseau: 0.003 });
  /* T-cam : caméra embarquée sur l'arceau, + caméras de nez */
  const camM = lq(L.tcam || '#121316');
  o.boite(0.13, 0.03, 0.055, camM, -0.66, 0.985, 0);
  for (const dx of [-0.03, 0.03]) o.boite(0.012, 0.05, 0.012, noirMat, -0.66 + dx, 0.955, 0);
  for (const z of [-1, 1]) { const cm = o.cyl(0.016, 0.016, 0.075, camM, 2.12, hautLoft(coqueSt.map((s) => ({ ...DEF, ...s })), 2.12, z * 0.08) - 0.01, z * 0.105, 0, Math.PI / 2, 12); cm.rotation.set(0, 0, Math.PI / 2); }

  /* ================= FOND PLAT, BORDS DE FOND, DIFFUSEUR ================= */
  /* bord du fond plat découpé (encoches de « floor edge » 2024–2025) */
  const encoches = []; for (let k = 0; k < 7; k++) { const x0 = 0.12 - k * 0.18; encoches.push([x0, 0.80], [x0 - 0.012, 0.735], [x0 - 0.05, 0.735], [x0 - 0.062, 0.80]); }
  const demi = [[1.30, 0.15], [1.00, 0.38], [0.70, 0.66], [0.50, 0.785], [0.30, 0.80], ...encoches, [-1.22, 0.80], [-1.42, 0.66], [-1.55, 0.52]];
  planche(c2, o, [...demi, ...demi.slice().reverse().map(([x, z]) => [x, -z])], 0.03, 0.025, fondMat);
  for (const sg of [-1, 1]) {
    /* bord de fond relevé (floor edge) : lèvre verticale + rouleau incurvé */
    plaque(c2, o, carbone, [[0.50, 0.055], [0.38, 0.13], [-0.30, 0.14], [-1.15, 0.125], [-1.30, 0.055]], [0, 1, 2, 3, 4, 5].map((k) => fente(0.20 - k * 0.2, 0.07, 0.07, 0.04, 0.02)), 0.012, sg * 0.80, (x, y) => sg * 0.05 * lisse(0.08, 0.14, y));   // lèvre relevée, ajourée, roulée vers l'extérieur
    tube(c2, o, [[0.40, 0.135, sg * 0.845], [-0.30, 0.145, sg * 0.848], [-1.12, 0.13, sg * 0.845]], 0.012, lq(L.bordFond || '#2b2d33'), 30, 8);   // jonc de couleur : bord lisible
    /* ailette de bord de fond, devant la roue arrière */
    const aw = o.profil([[-1.0, 0.07], [-1.38, 0.20], [-1.44, 0.18], [-1.06, 0.055]], 0.07, lq(L.bordFond || '#2b2d33'), { galbe: false, biseau: 0.004 }); aw.position.z = sg * 0.73;
    /* déflecteurs de fond (floor fences) au bord d'attaque, sous les pontons */
    for (let i = 0; i < 3; i++) o.profil([[1.05 - i * 0.07, 0.055], [0.95 - i * 0.07, 0.15], [0.55 - i * 0.05, 0.13], [0.52 - i * 0.05, 0.055]], 0.008, carbone, { galbe: false, biseau: 0.002 }).position.z = sg * (0.22 + i * 0.11);
  }
  /* diffuseur : rampe montante, joues latérales, cloisons */
  o.profil([[-1.55, 0.03], [-2.48, 0.30], [-2.48, 0.325], [-1.55, 0.055]], 0.98, carbone, { galbe: false, biseau: 0.004 });
  for (const sg of [-1, 1]) o.profil([[-1.45, 0.03], [-2.50, 0.03], [-2.50, 0.40], [-2.30, 0.40], [-1.55, 0.10]], 0.014, carbone, { galbe: false, biseau: 0.003 }).position.z = sg * 0.50;
  for (const z of [-0.3, -0.12, 0.12, 0.3]) o.profil([[-1.75, 0.03], [-2.48, 0.03], [-2.48, 0.29], [-1.75, 0.08]], 0.008, carbone, { galbe: false, biseau: 0.002 }).position.z = z;

  /* ================= STRUCTURE ARRIÈRE, ÉCHAPPEMENT, FEU DE PLUIE ================= */
  o.boite(0.30, 0.10, 0.10, carbone, -2.52, 0.31, 0);
  o.cyl(0.042, 0.048, 0.16, ti, -2.52, 0.405, 0, 0, Math.PI / 2, 20);
  o.cyl(0.03, 0.03, 0.005, noirMat, -2.602, 0.405, 0, 0, Math.PI / 2, 20);
  o.boite(0.012, 0.05, 0.08, ctx.lumRouge, -2.674, 0.30, 0);                                                        // feu de pluie

  /* ================= AILERON ARRIÈRE ================= */
  const sp = 0.495;
  const A = S.ar, kc = A.c / 0.30;
  aile(c2, o, lq(L.ailAr || L.base), sp, (t) => ({ xle: -2.44 - 0.02 * t, y: 0.70 - A.cuil * 0.4 + A.cuil * lisse(0.3, 1, t), c: A.c, a: 0.16 + 0.1 * lisse(0.6, 1, t), e: 0.11, cam: 0.06 }));   // plan principal en cuillère
  aile(c2, o, lq(L.drs || L.ailAr || L.base), sp, (t) => ({ xle: -2.44 - 0.19 * kc - 0.02 * t, y: 0.775 - A.cuil * 0.3 + A.cuil * 0.85 * lisse(0.3, 1, t), c: 0.205 * kc, a: 0.5, e: 0.1, cam: 0.05 }));   // volet DRS
  /* endplates : contour arrondi / carré / découpé, ouïes, partie basse carbone, tête enroulée vers l'intérieur */
  const xr = -2.44 - 0.40 * kc - 0.01;
  const epAr = {
    arrondi: [[-2.40, 0.54], [-2.40, 0.80], ...bez([-2.40, 0.80], [-2.40, 0.94], [-2.52, 0.945]), [xr + 0.10, 0.95], ...bez([xr + 0.10, 0.95], [xr, 0.95], [xr, 0.86]), [xr, 0.62], ...bez([xr, 0.62], [xr, 0.52], [-2.62, 0.52])],
    carre: [[-2.40, 0.54], [-2.40, 0.90], [-2.45, 0.95], [xr, 0.95], [xr, 0.60], [xr + 0.08, 0.53], [-2.62, 0.52]],
    decoupe: [[-2.40, 0.54], [-2.40, 0.84], ...bez([-2.40, 0.84], [-2.41, 0.95], [-2.52, 0.95]), [xr + 0.14, 0.95], [xr + 0.09, 0.895], [xr, 0.895], [xr, 0.62], ...bez([xr, 0.62], [xr, 0.52], [-2.62, 0.52])],
  }[A.ep];
  const ouiesAr = A.ep === 'carre' ? [0, 1, 2, 3, 4].map((k) => fente(-2.55 - k * 0.05, 0.60, 0.022, 0.12, 0.03)) : [0, 1, 2, 3].map((k) => fente(-2.47 - k * 0.04, 0.83, 0.018, 0.075, 0.025));
  for (const sg of [-1, 1]) {
    plaque(c2, o, lq(L.epAr || L.ailAr || L.base), epAr, ouiesAr, 0.014, sg * (sp + 0.012), (x, y) => -sg * 0.035 * lisse(0.80, 0.95, y));
    plaque(c2, o, carbone, [[-2.40, 0.545], [-2.40, 0.62], [xr + 0.02, 0.62], [xr + 0.02, 0.56], [-2.62, 0.53]], [], 0.006, sg * (sp + 0.022));   // semelle carbone
  }
  /* actionneur DRS central (carénage entre plan principal et volet) */
  { const a = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 18, 12)), lq(L.actionneur || L.ailAr || L.base)); a.scale.set(0.08, 0.05, 0.026); a.position.set(-2.61, 0.785, 0); a.rotation.z = -0.5; o.ajouter(a); }
  /* mât « col de cygne » : remonte de la structure arrière et accroche le plan principal par-dessus */
  for (const zm of (A.mat === 'double' ? [-0.11, 0.11] : [0])) o.profil([[-2.30, 0.37], [-2.46, 0.37], [-2.55, 0.64], [-2.52, 0.80], [-2.44, 0.805], [-2.40, 0.73]], 0.02, carbone, { galbe: false, biseau: 0.004 }).position.z = zm;
  /* beam wing : deux petits plans bas, tenus par les joues du diffuseur */
  aile(c2, o, lq(L.beam || '#1d1e22'), 0.49, (t) => ({ xle: -2.38, y: 0.37 + 0.01 * t, c: 0.13, a: 0.1, e: 0.12, cam: 0.05 }), { n: 24 });
  aile(c2, o, lq(L.beam || '#1d1e22'), 0.49, (t) => ({ xle: -2.50, y: 0.42 + 0.01 * t, c: 0.11, a: 0.35, e: 0.12, cam: 0.05 }), { n: 24 });

  /* ================= AILERON AVANT (4 plans) ================= */
  const spA = 0.975;
  const elems = [
    { xle: 2.82, c: 0.30, y: 0.07, a: 0.05, monte: 0.035, e: 0.09 },
    { xle: 2.60, c: 0.175, y: 0.11, a: 0.24, monte: 0.05, e: 0.1 },
    { xle: 2.475, c: 0.145, y: 0.15, a: 0.40, monte: 0.065, e: 0.1 },
    { xle: 2.37, c: 0.125, y: 0.19, a: 0.56, monte: 0.075, e: 0.1 },
  ];
  elems.forEach((E, i) => {
    aile(c2, o, lq((L.ailAv || [])[i] || L.base), spA, (t) => ({ xle: E.xle - S.av.fleche * Math.pow(t, 1.6) - (i ? 0.02 * t : 0), y: E.y + E.monte * S.av.monte * lisse(0.4, 1, t), c: E.c * (1 - 0.22 * t), a: E.a + 0.12 * lisse(0.6, 1, t) * (i ? 1 : 0), e: E.e, cam: 0.05 }), { n: 40 });
  });
  for (const sg of [-1, 1]) {
    /* endplate : plaque arrondie qui reçoit les quatre plans */
    const epA = {
      arrondi: [[2.82, 0.025], [2.82, 0.13], ...bez([2.82, 0.13], [2.82, 0.24], [2.66, 0.27]), [2.42, 0.32], ...bez([2.42, 0.32], [2.20, 0.35], [2.19, 0.26]), [2.22, 0.06], ...bez([2.22, 0.06], [2.24, 0.025], [2.32, 0.025])],
      haut: [[2.82, 0.025], [2.82, 0.22], ...bez([2.82, 0.22], [2.81, 0.32], [2.70, 0.33]), [2.36, 0.345], ...bez([2.36, 0.345], [2.20, 0.35], [2.19, 0.27]), [2.22, 0.06], ...bez([2.22, 0.06], [2.24, 0.025], [2.32, 0.025])],
      bas: [[2.82, 0.025], [2.82, 0.09], ...bez([2.82, 0.09], [2.78, 0.19], [2.60, 0.23]), [2.38, 0.29], ...bez([2.38, 0.29], [2.20, 0.33], [2.19, 0.25]), [2.22, 0.06], ...bez([2.22, 0.06], [2.24, 0.025], [2.32, 0.025])],
    }[S.av.ep];
    plaque(c2, o, lq(L.epAv || L.base), epA, [fente(2.66, 0.07, 0.06, 0.07, 0.03), fente(2.52, 0.08, 0.05, 0.08, 0.03)], 0.014, sg * (spA + 0.006), (x, y) => -sg * 0.03 * lisse(0.14, 0.34, y));   // endplate galbée, deux ouïes
    /* dérive basse (pied d'endplate, recourbé vers l'extérieur) */
    const pied = o.profil([[2.80, 0.025], [2.80, 0.055], [2.30, 0.055], [2.30, 0.025]], 0.05, lq(L.epAv || L.base), { galbe: false, biseau: 0.004 }); pied.position.z = sg * (spA - 0.015);
    /* dérives (fences) sous le plan principal et ailette de canard au-dessus de l'extrémité */
    for (const zf of [0.42, 0.62]) o.profil([[2.80, 0.02], [2.78, 0.085], [2.66, 0.08], [2.54, 0.03], [2.56, 0.02]], 0.01, lq(L.epAv || L.base), { galbe: false, biseau: 0.002 }).position.z = sg * zf;
    o.profil([[2.62, 0.20], [2.66, 0.27], [2.44, 0.30], [2.38, 0.25]], 0.008, lq(L.epAv || L.base), { galbe: false, biseau: 0.002 }).position.z = sg * (spA - 0.06);
  }

  /* ================= SUSPENSIONS (triangles), DIRECTION, ÉCOPES, DÉFLECTEURS ================= */
  for (const sg of [-1, 1]) {
    for (const [X, ZC, EP, av] of [[XAV, ZC_AV, EP_AV, true], [XAR, ZC_AR, EP_AR, false]]) {
      const zi = ZC - EP / 2 + 0.035;                                // porte-moyeu : DANS la jante, côté intérieur
      const ch = av ? 0.145 : 0.12;                                  // points d'ancrage côté châssis
      const hautH = [X + (av ? 0.02 : -0.02), RP + 0.185, sg * zi], basH = [X, RP - 0.175, sg * (zi + 0.01)];
      for (const dx of [-0.26, 0.24]) {
        tige(c2, o, [X + dx, av ? 0.47 : 0.46, sg * ch], hautH, 0.016, brasMat, 10);
        tige(c2, o, [X + dx * 1.15, av ? 0.20 : 0.22, sg * (ch - 0.01)], basH, 0.017, brasMat, 10);
      }
      // poussoir / tirant et biellette de pincement
      if (av) tige(c2, o, [X - 0.02, RP - 0.15, sg * (zi - 0.03)], [X - 0.12, 0.50, sg * 0.14], 0.014, brasMat, 8);
      else tige(c2, o, [X + 0.02, RP + 0.16, sg * (zi - 0.03)], [X + 0.25, 0.22, sg * 0.12], 0.014, brasMat, 8);
      tige(c2, o, [X + (av ? 0.13 : -0.13), av ? 0.33 : 0.40, sg * ch], [X + (av ? 0.12 : -0.12), RP - (av ? 0.03 : -0.04), sg * zi], 0.011, brasMat, 8);
      // écope de frein : tambour carbone côté intérieur de la roue (rayon < jante)
      const ec = o.cyl(0.20, 0.17, 0.07, carbone, X, RP, sg * (ZC - EP / 2 - 0.02), Math.PI / 2, 0, 24); ec.rotation.set(Math.PI / 2, 0, 0);
      o.boite(0.12, 0.07, 0.06, carbone, X + (av ? 0.12 : -0.05), RP + 0.06, sg * (ZC - EP / 2 - 0.06));
    }
    /* déflecteur au-dessus de la roue avant (au-delà du rayon du pneu, moitié intérieure) */
    const zD = ZC_AV - EP_AV / 2 + 0.06, sh = new THREE.Shape();
    const r0 = RP + 0.022, r1 = RP + 0.04, a0 = Math.PI * 0.40, a1 = Math.PI * 0.58;
    sh.absarc(0, 0, r1, a0, a1, false); sh.absarc(0, 0, r0, a1, a0, true); sh.closePath();
    const def = new THREE.Mesh(ctx.garde(new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false, curveSegments: 18 })), carbone);
    def.position.set(XAV, RP, sg * zD - 0.035); o.ajouter(def);
    tige(c2, o, [XAV - 0.03, RP + 0.375, sg * (zD - 0.03)], [XAV - 0.02, RP + 0.16, sg * (ZC_AV - EP_AV / 2 + 0.02)], 0.01, carbone, 6);
  }

  /* ================= RÉTROVISEURS ================= */
  for (const sg of [-1, 1]) {
    const boit = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 20, 12)), lq(L.retro || L.base));
    boit.scale.set(0.06, 0.05, 0.12); boit.position.set(0.50, 0.79, sg * 0.57); o.ajouter(boit);           // coque de rétroviseur (≈ 15 × 10 cm)
    const gl = o.boite(0.004, 0.075, 0.2, glace, 0.442, 0.79, sg * 0.57); gl.rotation.y = sg * 0.05;   // glace face à l'arrière
    plaque(c2, o, carbone, [[0.56, 0.62], [0.47, 0.64], [0.47, 0.76], [0.53, 0.76]], [], 0.014, sg * 0.40);     // bras profilé côté cockpit
    tige(c2, o, [0.50, 0.70, sg * 0.40], [0.50, 0.775, sg * 0.47], 0.014, lq(L.retro || L.base), 8);
    tige(c2, o, [0.48, 0.655, sg * 0.62], [0.50, 0.76, sg * 0.60], 0.012, lq(L.retro || L.base), 8);
  }

  /* ================= NUMÉROS ET DÉCORS ================= */
  const nNez = numero(L.num, L.numFond || null, L.numEncre || '#ffffff', L.numContour || null);
  drapeHaut(c2, o, coque.st, 1.80, 2.22, -0.09, 0.09, matDecal(c2, nNez, 512, 256), 0.005);
  o.decalFlanc(numero(L.num, L.numFond || null, L.numEncre || '#ffffff', L.numContour || null), 0.40, 0.17, -1.42, 0.755, 0.0075, 512, 220);
  if (L.decors) L.decors(c2, o, { coque: coque.st, capSt, matDecal: (d, w, h) => matDecal(c2, d, w, h), drapeHaut: (st, x0, x1, z0, z1, m, e) => drapeHaut(c2, o, st, x0, x1, z0, z1, m, e) });

  /* ================= ROUES (déclarées en unités de scène) ================= */
  const roue = (x, zc, ep, av) => ({ x: x * K, RW: RP * K, ep: ep * K, z: zc * K, avant: av, jante: L.jante || '#6b717b', rayons: 'f1_2022', levre: 0.02, flanc: L.flanc || '#f2f2f2', sansFrein: true, etrier: '#1a1a1a' });
  return {
    L: (NEZ - POUPE) * K, largeur: 2.0 * K, hauteur: 0.95 * K, xAvant: NEZ * K, xArriere: POUPE * K,
    roues: [roue(XAV, ZC_AV, EP_AV, true), roue(XAR, ZC_AR, EP_AR, false)],
    jante: L.jante || '#6b717b', rayons: 'f1_2022', flanc: L.flanc || '#f2f2f2',
    plafond: 9,                    // F1 exemptée (règle de famille) : 9 = aucun écrasement possible du pavillon
  };
}

/* ================================================================== livrées (couleurs seulement) */
/* Repères de peinture : partie ∈ coque | ponton | capot | boite ; i.u = écart latéral relatif (0 = axe, 1 = flanc),
   i.v = hauteur relative dans la section (0 = bas, 1 = haut), i.ext = côté extérieur d'un ponton. Coordonnées en mètres. */
const LIVREES = {
  /* F01 — flèche noire, filets turquoise, touches argent */
  F01: {
    sil: { nezX: 2.64, nezW: 0.95, nezY: 0.13, pod: { x: 0.60, zc: 0.46, w: 0.215, y0: 0.33, y1: 0.665, wb: 0.55, bouche: [0.72, 0.8] }, dw: 1.1, av: { monte: 1.35, ep: 'bas' }, ar: { cuil: 0.09, ep: 'arrondi' } },   // nez court posé sur le 2e plan, pontons étroits à gueule verticale
    jante: '#8e949e',
    base: '#121317', num: '63', numEncre: '#ffffff', numContour: '#00b8a9', flanc: '#f2f4f7', casque: '#d9dde3', casque2: '#00c2b2', tcam: '#e9ff1f', metal: 0.3,
    ailAv: ['#121317', '#121317', '#16171b', '#00b8a9'], epAv: '#121317', ailAr: '#121317', drs: '#121317', epAr: '#121317', requin: '#121317', retro: '#121317', bordFond: '#00b8a9',
    peint(x, y, z, p, i) {
      if (p === 'coque' && x > 1.7 && i.v < 0.42) return '#aeb4bd';                                    // flancs bas du nez argent
      if (p === 'coque' && x > 0.7 && i.u > 0.62 && i.u < 0.74 && i.v > 0.45) return '#00c2b2';         // filets turquoise du nez
      if (p === 'ponton' && i.ext && Math.abs(i.v - (0.48 + 0.12 * (x + 0.5))) < 0.035) return '#00c2b2';   // filet turquoise du ponton
      if (p === 'ponton' && i.ext && x < -0.2 && x > -1.0 && i.v > 0.15 && i.v < 0.3) return '#aeb4bd';   // éclat argent sous le filet
      if (p === 'capot' && x < -1.6 && i.v > 0.7) return '#00c2b2';
      return '#121317';
    },
  },
  /* F02 — bleu nuit mat, rouge et jaune */
  F02: {
    sil: { nezX: 2.80, nezW: 0.85, pod: { x: 0.68, zc: 0.48, w: 0.23, y0: 0.47, y1: 0.655, wb: 0.32, bouche: [0.86, 0.6] }, dw: 1.3, capW: 0.9, requin: 0.85, av: { monte: 0.85 }, ar: { c: 0.26, cuil: 0.05, ep: 'carre', mat: 'double' } },   // nez long et fin, gueule fine et haute (letterbox), undercut profond, downwash très plongeant, aileron basse traînée
    jante: '#6b717b',
    base: '#1a2142', mat: true, num: '1', numEncre: '#ffc906', numContour: '#d71f2b', flanc: '#ffc906', casque: '#1a2142', casque2: '#ffc906', tcam: '#e9ff1f',
    ailAv: ['#1a2142', '#1a2142', '#1a2142', '#d71f2b'], epAv: '#1a2142', ailAr: '#1a2142', drs: '#1a2142', epAr: '#d71f2b', requin: '#1a2142', retro: '#1a2142', bordFond: '#d71f2b',
    peint(x, y, z, p, i) {
      if (p === 'coque' && x > 2.42) return '#ffc906';                                                  // pointe du nez jaune
      if (p === 'coque' && x > 2.30) return '#d71f2b';
      if (p === 'capot' && i.v > 0.38 && i.v < 0.92 && x < -0.55 && x > -1.55) {                         // « taureau » générique : soleil jaune dans une flamme rouge
        const d = Math.hypot(x + 0.95, (y - 0.56) * 1.6);
        if (d < 0.11) return '#ffc906';
        if (d < 0.3 && i.v > 0.45) return '#d71f2b';
      }
      if (p === 'ponton' && i.ext && i.v > 0.35 && i.v < 0.42 && x < 0.3) return '#d71f2b';
      return '#1a2142';
    },
  },
  /* F03 — rouge, touches blanches et noires */
  F03: {
    sil: { nezX: 2.70, nezW: 1.12, nezY: 0.115, pod: { x: 0.60, zc: 0.485, w: 0.27, y0: 0.32, y1: 0.65, wb: 0.6, bouche: [0.9, 0.72] }, dw: 1.0, requin: 1.2, av: { monte: 1.1, ep: 'haut' }, ar: { cuil: 0.1 } },   // nez large, gueule large et haute, grande dérive
    jante: '#8e949e',
    base: '#a8101b', num: '16', numEncre: '#ffffff', numContour: '#15161a', flanc: '#ffd31a', casque: '#d21b24', casque2: '#ffd31a', tcam: '#121316', metal: 0.45,
    ailAv: ['#a8101b', '#a8101b', '#a8101b', '#a8101b'], epAv: '#15161a', ailAr: '#a8101b', drs: '#a8101b', epAr: '#a8101b', requin: '#a8101b', retro: '#a8101b', bordFond: '#a8101b',
    peint(x, y, z, p, i) {
      if (p === 'capot' && x < -0.66 && x > -0.98 && i.v > 0.38) return '#f4f4f4';                       // bande blanche verticale du capot
      if (p === 'boite' && x > -0.62 && i.v > 0.55) return '#f4f4f4';                                    // arceau blanc
      if (p === 'coque' && x > 1.82 && x < 1.98 && i.v > 0.4) return '#f4f4f4';                          // bande blanche sur le nez
      if (p === 'ponton' && i.v < 0.3) return '#15161a';                                                 // bas de caisse noir
      if (p === 'capot' && i.v < 0.25) return '#15161a';
      return '#a8101b';
    },
  },
  /* F04 — noir, accents papaye (agencement de la miniature : nez, bandeau de ponton, boîte à air) */
  F04: {
    sil: { nezX: 2.78, nezW: 1.08, nezY: 0.10, pod: { x: 0.70, zc: 0.48, w: 0.245, y0: 0.42, y1: 0.665, wb: 0.38, bouche: [0.82, 0.66] }, dw: 1.3, av: { monte: 1.2 }, ar: { cuil: 0.08, ep: 'decoupe' } },   // nez long et large, gueule avancée et haute, downwash agressif
    jante: '#7a8089',
    base: '#1c1d21', num: '4', numEncre: '#ff8000', numContour: '#1c1d21', flanc: '#ff8a1a', casque: '#ff8000', casque2: '#1c1d21', tcam: '#e9ff1f',
    ailAv: ['#1c1d21', '#1c1d21', '#ff8000', '#1c1d21'], epAv: '#1c1d21', ailAr: '#1c1d21', drs: '#1c1d21', epAr: '#ff8000', requin: '#1c1d21', retro: '#1c1d21', bordFond: '#ff8000',
    peint(x, y, z, p, i) {
      const P = '#ff7a00', N = '#1c1d21';
      if (p === 'coque' && x > 0.75 && i.v > 0.6 && i.u < 0.85) return P;                                // dessus du nez papaye
      if (p === 'ponton' && i.ext && x < 0.0 && x > -0.9 && i.v > 0.45 && i.v < 0.8) return P;            // bandeau papaye du ponton
      if (p === 'capot' && x > -1.25 && x < -0.5 && i.v > 0.5 && i.v < 0.8) return P;                    // flanc du capot
      if (p === 'boite' && x > -0.7) return P;
      return N;
    },
  },
  /* F05 — vert anglais, filet vert citron */
  F05: {
    sil: { nezX: 2.72, pod: { x: 0.58, zc: 0.49, w: 0.28, y0: 0.36, y1: 0.66, wb: 0.55, bouche: [0.7, 0.8] }, dw: 0.85, capW: 1.08, av: { ep: 'haut' }, ar: { mat: 'double' } },   // pontons larges en « toboggan » (downwash doux), capot large
    jante: '#8e949e',
    base: '#0b5a45', num: '14', numEncre: '#cedc00', numContour: '#062e24', flanc: '#f2f4f7', casque: '#0b5a45', casque2: '#cedc00', tcam: '#121316', metal: 0.45,
    ailAv: ['#0b5a45', '#0b5a45', '#0b5a45', '#cedc00'], epAv: '#0b5a45', ailAr: '#0b5a45', drs: '#0b5a45', epAr: '#0b5a45', requin: '#0b5a45', retro: '#0b5a45', bordFond: '#cedc00',
    peint(x, y, z, p, i) {
      if (p === 'ponton' && i.ext && Math.abs(i.v - (0.6 + 0.08 * (x + 0.4))) < 0.04 && x < 0.58 && x > -1.25) return '#cedc00';   // filet vert citron du ponton
      if (p === 'coque' && x > 0.9 && i.u > 0.6 && i.u < 0.72 && i.v > 0.45) return '#cedc00';
      if (p === 'ponton' && i.v < 0.22) return '#141518';
      if (p === 'capot' && i.v > 0.86 && x < -1.4) return '#cedc00';
      return '#0b5a45';
    },
  },
  /* F06 — rose BWT franc sur toute la moitié avant, bleu à l'arrière */
  F06: {
    sil: { nezX: 2.78, nezW: 0.9, pod: { x: 0.64, zc: 0.475, w: 0.24, y0: 0.40, y1: 0.66, wb: 0.45, bouche: [0.84, 0.7] }, dw: 1.15, av: { monte: 0.95, ep: 'bas' }, ar: { cuil: 0.06, ep: 'decoupe' } },   // nez long et fin, gueule moyenne
    jante: '#8e949e',
    base: '#0b56b8', num: '10', numEncre: '#0b56b8', numContour: '#ffffff', flanc: '#f2f4f7', casque: '#ff6fb1', casque2: '#0b56b8', tcam: '#121316', metal: 0.4,
    ailAv: ['#ff6fb1', '#ff6fb1', '#ff6fb1', '#0b56b8'], epAv: '#ff6fb1', ailAr: '#0b56b8', drs: '#ff6fb1', epAr: '#ff6fb1', requin: '#0b56b8', retro: '#ff6fb1', appui: '#ff6fb1', bordFond: '#ff6fb1',
    peint(x, y, z, p, i) {
      const R = '#ff6fb1', B = '#0b56b8';
      const coupe = -0.15 - 0.25 * Math.min(1, Math.max(0, i.v));                                         // frontière rose/bleu en biais
      if (p === 'coque') return x > 0.0 ? R : B;                                                         // monocoque et nez tout roses
      if (p === 'ponton') return x > coupe ? R : B;                                                      // épaule et gueule roses, rampe bleue
      if (p === 'capot' && x > -0.62) return R;
      if (p === 'capot' && Math.abs(i.v - 0.62) < 0.04 && x > -1.9) return R;                            // filet rose le long du capot
      return B;
    },
  },
  /* F07 — bleu foncé dessus, grands aplats bleu clair dessous, filets blancs */
  F07: {
    sil: { nezX: 2.74, nezW: 0.92, pod: { x: 0.66, zc: 0.48, w: 0.235, y0: 0.45, y1: 0.655, wb: 0.36, bouche: [0.86, 0.62] }, dw: 1.25, ar: { c: 0.27, cuil: 0.05, ep: 'carre' } },   // gueule fine type « letterbox », aileron basse traînée
    jante: '#8e949e',
    base: '#0b1f57', num: '23', numEncre: '#ffffff', numContour: '#38b6ff', flanc: '#f2f4f7', casque: '#f2f4f7', casque2: '#38b6ff', tcam: '#121316', metal: 0.35,
    ailAv: ['#0b1f57', '#38b6ff', '#38b6ff', '#f4f6fa'], epAv: '#0b1f57', ailAr: '#0b1f57', drs: '#38b6ff', epAr: '#38b6ff', requin: '#0b1f57', retro: '#0b1f57', bordFond: '#38b6ff',
    peint(x, y, z, p, i) {
      const C = '#38b6ff', W = '#f4f6fa', N = '#0b1f57';
      const lim = p === 'coque' ? 0.42 : 0.5;
      if (p !== 'boite' && Math.abs(i.v - lim) < 0.045) return W;                                       // filet blanc franc
      if (p !== 'boite' && i.v < lim) return C;                                                          // bas de caisse bleu clair
      if (p === 'coque' && x > 0.8 && i.u < 0.22 && i.v > 0.8) return W;                                // bande blanche axiale du nez
      if (p === 'boite' && x > -0.62) return W;
      return N;
    },
  },
  /* F08 — blanc et bleu */
  F08: {
    sil: { nezX: 2.79, nezW: 0.88, pod: { x: 0.68, zc: 0.48, w: 0.23, y0: 0.46, y1: 0.66, wb: 0.34, bouche: [0.86, 0.62] }, dw: 1.3, av: { monte: 0.9 }, ar: { c: 0.27, cuil: 0.06, ep: 'carre', mat: 'double' } },   // concept proche de l'écurie sœur : nez long, gueule fine, downwash plongeant
    jante: '#2a46c9',
    base: '#f2f4f7', num: '22', numEncre: '#1636c8', numContour: '#ffffff', flanc: '#4f8dff', casque: '#1636c8', casque2: '#f2f4f7', tcam: '#121316', metal: 0.1,
    ailAv: ['#f2f4f7', '#f2f4f7', '#f2f4f7', '#1636c8'], epAv: '#f2f4f7', ailAr: '#f2f4f7', drs: '#f2f4f7', epAr: '#1636c8', requin: '#f2f4f7', retro: '#f2f4f7', bordFond: '#1636c8',
    peint(x, y, z, p, i) {
      const B = '#1636c8', W = '#f2f4f7';
      if (p === 'capot' && x < -1.0 && i.v > 0.35) {                                                      // dégradé « pixels » bleu sur le capot
        const k = Math.min(1, (-1.0 - x) / 0.7), cell = (Math.floor(x * 22) * 7 + Math.floor(y * 22) * 13) % 10;
        if (cell / 10 < k) return B;
      }
      if (p === 'ponton' && i.v < 0.3) return B;
      if (p === 'coque' && x > 2.3 && i.v > 0.5) return '#e5242f';
      return W;
    },
    decors(c2, o, d) {                                                                                   // bandeau rouge-jaune générique sur le nez
      d.drapeHaut(d.coque, 2.30, 2.62, -0.07, 0.07, d.matDecal((g, w, h) => { g.fillStyle = '#ffb21a'; g.beginPath(); g.moveTo(w * 0.15, h); g.lineTo(w, h * 0.2); g.lineTo(w, h * 0.8); g.lineTo(w * 0.4, h); g.fill(); }, 256, 64), 0.006);
    },
  },
  /* F09 — noir et vert fluo */
  F09: {
    sil: { nezX: 2.68, nezW: 1.05, nezY: 0.12, pod: { x: 0.58, zc: 0.49, w: 0.27, y0: 0.34, y1: 0.65, wb: 0.6, bouche: [0.88, 0.76] }, capW: 1.06, av: { monte: 1.15, ep: 'haut' }, ar: { cuil: 0.09 } },   // nez court et large, gueule ovale large
    jante: '#52f000',
    base: '#0c0d10', num: '27', numEncre: '#52f000', numContour: '#0c0d10', flanc: '#52f000', casque: '#52f000', casque2: '#0c0d10', tcam: '#121316',
    ailAv: ['#0c0d10', '#0c0d10', '#0c0d10', '#52f000'], epAv: '#0c0d10', ailAr: '#0c0d10', drs: '#0c0d10', epAr: '#52f000', requin: '#0c0d10', retro: '#0c0d10', bordFond: '#52f000',
    peint(x, y, z, p, i) {
      const V = '#52f000', N = '#0c0d10';
      if (p === 'coque' && x > 0.7 && i.v > 0.66 && i.u < 0.82) return V;                                 // dessus du nez vert fluo
      if (p === 'boite' && x > -0.62 && i.v > 0.4) return V;
      if (p === 'capot' && i.v > 0.6 && i.v < 0.72 && x > -1.3) return V;
      if (p === 'ponton' && x > 0.45 && i.v > 0.8) return V;                                              // lèvre de gueule
      return N;
    },
  },
  /* F10 — blanc dessus, noir dessous, filet rouge */
  F10: {
    sil: { nezX: 2.72, nezW: 1.05, pod: { x: 0.62, zc: 0.48, w: 0.25, y0: 0.38, y1: 0.665, wb: 0.5, bouche: [0.78, 0.74] }, dw: 1.15, av: { monte: 1.05, ep: 'bas' }, ar: { cuil: 0.08, ep: 'decoupe' } },   // gueule haute, aileron arrière découpé
    jante: '#8e949e',
    base: '#f2f4f7', num: '20', numEncre: '#15161a', numContour: '#ffffff', flanc: '#f2f4f7', casque: '#f2f4f7', casque2: '#e5242f', tcam: '#121316', metal: 0.1,
    ailAv: ['#f2f4f7', '#f2f4f7', '#f2f4f7', '#e5242f'], epAv: '#f2f4f7', ailAr: '#f2f4f7', drs: '#15161a', epAr: '#f2f4f7', requin: '#15161a', retro: '#15161a', bordFond: '#e5242f',
    peint(x, y, z, p, i) {
      const lim = p === 'coque' ? 0.45 : p === 'boite' ? 0 : 0.48;
      if (p !== 'boite' && Math.abs(i.v - lim) < 0.03 && x > -2.0) return '#e5242f';                        // filet rouge
      if (i.v < lim) return '#15161a';
      if (p === 'coque' && x > 1.2 && x < 2.2 && i.u < 0.55 && i.v > 0.8) return '#15161a';                  // bande noire du nez
      return '#f2f4f7';
    },
  },
};

const fabrique = (code) => (ctx) => monoplace(ctx, LIVREES[code]);
export const V5_F1 = Object.fromEntries(Object.keys(LIVREES).map((c) => [c, fabrique(c)]));
