/* BOLIDES 2D — un portrait vectoriel unique pour chaque miniature (profil, livrée, jantes, accessoires).
   Dessiné entièrement par le code à partir de la fiche de shared/bolides2d_fiches.js : aucune image, aucun logo,
   aucun personnage, quelques kilo-octets de SVG par voiture. Sert partout où la photo détourée n'existe pas
   (site public, photo absente) et remplace la silhouette générique carSvg.

   Repère : viewBox 320 × 120, sol à y = 106, voiture tournée vers la DROITE (avant = x élevés).
   Les hauteurs des fiches sont en pixels au-dessus du sol ; les positions le long de la voiture sont des
   fractions de sa longueur (0 = pare-chocs avant, 1 = pare-chocs arrière). */
import { FICHES } from './bolides2d_fiches.js';

const G = 106;               // sol
const CX = 160;              // centre horizontal
const cache = new Map();

export const aUnPortrait2d = (code) => !!(code && FICHES[code]);

let TEXTURE = false;          // rendu « peau » pour les flancs du modèle 3D (shared/bolides3d.js) : sans socle, sans roues, sans contour

/** SVG du bolide (chaîne). uid : préfixe unique des identifiants internes (dégradés, masques).
    opts.texture : peau de carrosserie pour le modèle 3D (sans socle lumineux ni roues). */
export function bolide2dSvg(code, uid = 'b', opts = {}) {
  const f = FICHES[code];
  if (!f) return '';
  const tex = !!opts.texture;
  const cle = code + '|' + uid + (tex ? '|t' : '');
  if (cache.has(cle)) return cache.get(cle);
  const id = ('v' + uid + (tex ? 't' : '')).replace(/[^a-zA-Z0-9_-]/g, '');
  let corps;
  TEXTURE = tex;
  try {
    corps = f.fam === 'f1' ? f1(f, id) : f.fam === 'f1vintage' ? f1Vintage(f, id) : f.fam === 'helico' ? helico(f, id)
      : f.fam === 'fauteuil' ? fauteuil(f, id) : route(f, id);
  } catch (e) {
    console.warn('bolide2d', code, e);
    return '';
  } finally { TEXTURE = false; }
  const svg = `<svg class="car-svg car-2d" viewBox="4 12 312 102" role="img" aria-label="${esc(f.nom || code)}">${corps}</svg>`;
  cache.set(cle, svg);
  return svg;
}

/* ------------------------------------------------------------------ outils */
const n1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hexRgb(h) { const v = h.replace('#', ''); const x = v.length === 3 ? v.split('').map((c) => c + c).join('') : v; return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const clair = (c, t = 0.35) => mix(c, '#ffffff', t);
const sombre = (c, t = 0.45) => mix(c, '#000000', t);
const lum = (c) => { const [r, g, b] = hexRgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/** Polygone à coins arrondis : pts = [[x, y, rayon], …] (fermé). */
function arrondi(pts) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = pts[i], [px, py] = pts[(i - 1 + n) % n], [nx, ny] = pts[(i + 1) % n];
    const l1 = Math.hypot(x - px, y - py) || 1, l2 = Math.hypot(nx - x, ny - y) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = x + (px - x) * rr / l1, ay = y + (py - y) * rr / l1, bx = x + (nx - x) * rr / l2, by = y + (ny - y) * rr / l2;
    d += (i === 0 ? 'M' : 'L') + n1(ax) + ' ' + n1(ay) + (rr > 0 ? 'Q' + n1(x) + ' ' + n1(y) + ' ' + n1(bx) + ' ' + n1(by) : '');
  }
  return d + 'Z';
}
const poly = (pts) => 'M' + pts.map(([x, y]) => n1(x) + ' ' + n1(y)).join('L') + 'Z';

/* ------------------------------------------------------------------ roues */
function roue(cx, r, f, id, k = 0) {
  if (TEXTURE) return '';
  const cy = G - r, jante = f.jante || '#c9cfda', st = f.rayons || 'cinq';
  const rj = r * (f.janteTaille || 0.6);
  let s = `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="#0b0c14"/>`;
  s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r - 1.6)}" fill="none" stroke="#262938" stroke-width="1.2"/>`;
  if (f.flanc) s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(rj + 2.6)}" fill="none" stroke="${f.flanc}" stroke-width="2.4"/>`;
  s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(rj)}" fill="url(#${id}j)"/>`;
  const sp = { cinq: 5, six: 6, trois: 3, dix: 10, etoile: 5 }[st] || 0;
  if (st === 'plein') s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(rj * 0.55)}" fill="none" stroke="${sombre(jante, 0.35)}" stroke-width="1.2"/>`;
  else if (st === 'maille') {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s += `<line x1="${n1(cx + Math.cos(a) * rj * 0.3)}" y1="${n1(cy + Math.sin(a) * rj * 0.3)}" x2="${n1(cx + Math.cos(a + 0.5) * rj * 0.92)}" y2="${n1(cy + Math.sin(a + 0.5) * rj * 0.92)}" stroke="${sombre(jante, 0.4)}" stroke-width="0.9"/>`; }
  } else if (sp) {
    for (let i = 0; i < sp; i++) {
      const a = (i / sp) * Math.PI * 2 + k, w = st === 'etoile' ? 0.22 : st === 'trois' ? 0.3 : 0.16;
      const p = [[cx + Math.cos(a - w) * rj * 0.32, cy + Math.sin(a - w) * rj * 0.32], [cx + Math.cos(a - w * 0.5) * rj * 0.93, cy + Math.sin(a - w * 0.5) * rj * 0.93],
        [cx + Math.cos(a + w * 0.5) * rj * 0.93, cy + Math.sin(a + w * 0.5) * rj * 0.93], [cx + Math.cos(a + w) * rj * 0.32, cy + Math.sin(a + w) * rj * 0.32]];
      s += `<path d="${poly(p)}" fill="${sombre(jante, 0.5)}" opacity=".75"/>`;
    }
  }
  s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(Math.max(1.6, rj * 0.22))}" fill="${f.moyeu || sombre(jante, 0.25)}"/>`;
  if (f.neonRoue) s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r - 0.8)}" fill="none" stroke="${f.neonRoue}" stroke-width="1.6" opacity=".95"/>`;
  return s;
}
function defsJante(f, id) {
  const j = f.jante || '#c9cfda';
  return `<radialGradient id="${id}j" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${clair(j, 0.55)}"/><stop offset=".6" stop-color="${j}"/><stop offset="1" stop-color="${sombre(j, 0.35)}"/></radialGradient>`;
}

/* ------------------------------------------------------------------ socle commun */
function socle(f, id, x0, x1) {
  if (TEXTURE) return `<defs>${defsJante(f, id)}</defs>`;
  const acc = f.c.neon || f.c.accent || f.c.caisse;
  const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 10;
  return `<defs><radialGradient id="${id}o" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${acc}" stop-opacity=".55"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>${defsJante(f, id)}</defs>` +
    `<ellipse cx="${n1(cx)}" cy="${G + 1}" rx="${n1(rx + 16)}" ry="9" fill="url(#${id}o)"/>` +
    `<ellipse cx="${n1(cx)}" cy="${G + 1}" rx="${n1(rx)}" ry="4.5" fill="#000" opacity=".55"/>`;
}

/* ------------------------------------------------------------------ voitures « de route » */
function geometrie(f) {
  const L = Math.min(f.long || 262, 282), XF = CX + L / 2, XR = CX - L / 2;   // 282 : place pour les flammes de turbine
  const X = (p) => XF - p * L, Y = (h) => G - h;
  const r = f.r || [17, 17];
  const roues = f.roues || [0.17, 0.8];
  const clr = f.garde ?? 9;
  return { L, XF, XR, X, Y, r, roues, clr };
}

function profilAuto(f, g) {
  const { X, Y, XF, XR, clr } = g;
  const nez = f.nez ?? 30, caisse = f.caisse ?? 44, toit = f.toit ?? 70, queue = f.queue ?? 44;
  const ar = f.arrondi ?? 9;
  const pts = [[XF, Y(clr + 3), 5], [XF + 1, Y(nez), ar * 0.8], [X(0.09), Y(nez + (caisse - nez) * 0.75), ar], [X(f.pare ?? 0.32), Y(caisse), ar * 0.5]];
  if (toit > 0) pts.push([X(f.toitAv ?? 0.43), Y(toit), ar], [X(f.toitAr ?? 0.66), Y(toit), ar], [X(f.lunette ?? 0.83), Y(f.coffre ?? caisse + 2), ar * 0.7]);
  pts.push([XR + (f.becAr ?? 2), Y(queue), ar * 0.6], [XR, Y(clr + 4), 5]);
  return pts;
}

/** Contour de caisse avec passages de roues. */
function caissePath(f, g, haut) {
  const { X, r, roues, clr } = g;
  const yb = G - clr;
  let d = arrondi(haut).slice(0, -1);          // on remplace la fermeture par le bas de caisse
  // bas : de l'arrière (dernier point) vers l'avant, en contournant les roues
  const wheels = [[X(roues[1]), r[1]], [X(roues[0]), r[0]]].sort((a, b) => a[0] - b[0]);
  for (const [cx, rr] of wheels) {
    const ra = rr + (f.jeu ?? 3.2), cy = G - rr, dy = yb - cy;
    if (Math.abs(dy) >= ra) continue;
    const dx = Math.sqrt(ra * ra - dy * dy);
    d += `L${n1(cx - dx)} ${n1(yb)}A${n1(ra)} ${n1(ra)} 0 ${dy > 0 ? 1 : 0} 1 ${n1(cx + dx)} ${n1(yb)}`;
  }
  const [x0, y0] = haut[0];
  return d + `L${n1(x0)} ${n1(yb)}L${n1(x0)} ${n1(y0)}Z`;
}

function vitresAuto(f, g) {
  if ((f.toit ?? 70) <= 0 || f.sansVitre) return '';
  const { X, Y } = g;
  const caisse = f.caisse ?? 44, toit = f.toit ?? 70;
  const pa = f.pare ?? 0.32, ta = f.toitAv ?? 0.43, tr = f.toitAr ?? 0.66, lu = f.lunette ?? 0.83, co = f.coffre ?? caisse + 2;
  const i = 3;
  const A = [X(pa) - 3.5, Y(caisse) - 1];
  const B = [X(ta) - 1.5, Y(toit) + i];
  const C = [X(tr) + 1.5, Y(toit) + i];
  // point de la lunette arrière à hauteur de ceinture
  let D;
  if (co >= caisse) { const t = Math.min(1, (toit - caisse) / Math.max(1, toit - co + 0.001)); D = [X(tr) + (X(lu) - X(tr)) * Math.min(1, t) + 3, Y(caisse) - 1]; }
  else { const t = (toit - caisse) / (toit - co); D = [X(tr) + (X(lu) - X(tr)) * t + 3.5, Y(caisse) - 1]; }
  const verre = `<path d="${arrondi([[...A, 2], [...B, 4], [...C, 4], [...D, 2]])}" fill="url(#${g.id}v)"/>`;
  let montants = '';
  const nb = f.montants ?? 1;
  for (let k = 1; k <= nb; k++) {
    const t = k / (nb + 1);
    const xt = B[0] + (C[0] - B[0]) * t, xb = A[0] + (D[0] - A[0]) * t;
    montants += `<path d="M${n1(xt + 2)} ${n1(B[1] - 1)}L${n1(xt - 2)} ${n1(B[1] - 1)}L${n1(xb - 3)} ${n1(A[1] + 1)}L${n1(xb + 3)} ${n1(A[1] + 1)}Z" fill="${f.c.montant || sombre(f.c.caisse, 0.25)}"/>`;
  }
  const reflet = `<path d="M${n1(A[0] - 6)} ${n1(A[1] - 3)}L${n1(B[0] - 4)} ${n1(B[1] + 3)}L${n1(B[0] - 12)} ${n1(B[1] + 3)}L${n1(A[0] - 12)} ${n1(A[1] - 3)}Z" fill="#fff" opacity=".22"/>`;
  return verre + montants + reflet;
}

function route(f, id) {
  const g = geometrie(f); g.id = id;
  const { X, Y, XF, XR, r, roues } = g;
  const c = f.c, caisse = f.caisse ?? 44;
  const haut = (f.pts ? f.pts.map(([p, h, ar = f.arrondi ?? 8]) => [X(p), Y(h), ar]) : profilAuto(f, g));
  const d = caissePath(f, g, haut);
  const hautMax = Math.max(...haut.map((p) => G - p[1]));
  let s = socle(f, id, XR, XF);
  s += `<defs><linearGradient id="${id}c" x1="0" y1="${n1(G - hautMax)}" x2="0" y2="${G}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${clair(c.caisse, 0.28)}"/><stop offset=".45" stop-color="${c.caisse}"/><stop offset="1" stop-color="${sombre(c.caisse, 0.42)}"/></linearGradient>` +
    `<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${clair(c.vitre || '#1d2a4a', 0.35)}"/><stop offset="1" stop-color="${sombre(c.vitre || '#1d2a4a', 0.35)}"/></linearGradient>` +
    `<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="${id}k"><path d="${d}"/></clipPath></defs>`;
  const ctx = { f, g, id, X, Y, XF, XR, caisse, d };
  s += kits(f.kit, 'arriere', ctx);
  s += `<path d="${d}" fill="url(#${id}c)"/>`;
  const contour = TEXTURE ? '' : `<path d="${d}" fill="none" stroke="${c.neon || clair(c.caisse, 0.5)}" stroke-width="1.3" stroke-linejoin="round" opacity=".85"/>`;
  s += `<g clip-path="url(#${id}k)">${livree(f.liv, ctx)}` +
    `<rect x="${n1(XR)}" y="${n1(G - g.clr - 7)}" width="${n1(XF - XR)}" height="9" fill="#000" opacity=".28"/></g>`;
  s += f.vitres ? f.vitres.map((v) => `<path d="${arrondi(v.map(([p, h]) => [X(p), Y(h), 2.5]))}" fill="url(#${id}v)"/>`).join('') : vitresAuto(f, g);
  // ligne de reflet, portière, feux
  s += `<path d="M${n1(X(0.06))} ${n1(Y(caisse - 3))}Q${n1(X(0.5))} ${n1(Y(caisse - 1))} ${n1(X(0.94))} ${n1(Y((f.queue ?? 44) - 4))}" stroke="url(#${id}h)" stroke-width="2.2" fill="none"/>`;
  if (!f.sansPorte) {
    const xp = X(f.porte ?? (((f.pare ?? 0.32) + (f.toitAr ?? 0.66)) / 2));
    s += `<path d="M${n1(xp)} ${n1(Y(caisse - 2))}L${n1(xp + 2)} ${n1(G - g.clr - 4)}" stroke="${sombre(c.caisse, 0.55)}" stroke-width="1" opacity=".7"/>` +
      `<rect x="${n1(xp - 12)}" y="${n1(Y(caisse - 8))}" width="7" height="2" rx="1" fill="${sombre(c.caisse, 0.5)}" opacity=".8"/>`;
  }
  const hn = f.nez ?? 30, hq = f.queue ?? 44;
  if (!f.sansPhare) s += f.pharesRonds ? `<circle cx="${n1(XF - 4)}" cy="${n1(Y(hn + (caisse - hn) * 0.3))}" r="3.6" fill="#fff6cf" stroke="${sombre(c.caisse, 0.4)}"/>`
    : `<path d="${arrondi([[XF - 13, Y(hn + 4), 2], [XF + 0.5, Y(hn + 2), 2], [XF + 0.5, Y(hn - 3), 2], [XF - 11, Y(hn - 1.5), 2]])}" fill="${c.phare || '#eaf6ff'}"/>`;
  s += `<rect x="${n1(XR - 0.5)}" y="${n1(Y(hq - 3))}" width="7" height="5" rx="2" fill="${c.feu || '#ff2a3d'}"/>`;
  s += contour;
  s += kits(f.kit, 'avant', ctx);
  s += roue(X(roues[1]), r[1], f, id, 0.3) + roue(X(roues[0]), r[0], f, id, 0);
  s += kits(f.kit, 'dessus', ctx);
  return s;
}

/* ------------------------------------------------------------------ livrées (dessinées dans la caisse) */
function livree(liste = [], { f, X, Y, XF, XR, caisse }) {
  let s = '';
  for (const [type, ...a] of liste) {
    if (type === 'bas') s += `<rect x="0" y="${n1(Y(a[0]))}" width="320" height="${n1(a[0] + 2)}" fill="${a[1]}"/>`;
    else if (type === 'haut') s += `<rect x="0" y="0" width="320" height="${n1(Y(a[0]))}" fill="${a[1]}"/>`;
    else if (type === 'bande') s += `<rect x="${n1(X(a[3]))}" y="${n1(Y(a[1]))}" width="${n1(X(a[2]) - X(a[3]))}" height="${n1(a[1] - a[0])}" fill="${a[4]}"/>`;
    else if (type === 'filet') s += `<path d="M${n1(X(a[2] ?? 0.02))} ${n1(Y(a[0]))}L${n1(X(a[3] ?? 0.98))} ${n1(Y(a[4] ?? a[0]))}" stroke="${a[1]}" stroke-width="${a[5] || 1.6}"/>`;
    else if (type === 'capot') s += `<rect x="${n1(X(a[1] ?? 0.32))}" y="0" width="${n1(XF + 4 - X(a[1] ?? 0.32))}" height="${n1(Y(caisse - (a[2] ?? 5)))}" fill="${a[0]}"/>`;
    else if (type === 'zone') s += `<rect x="${n1(X(a[1]))}" y="${n1(Y(a[3]))}" width="${n1(X(a[0]) - X(a[1]))}" height="${n1(a[3] - a[2])}" fill="${a[4]}"/>`;
    else if (type === 'diag') s += `<path d="${poly([[X(a[0]), Y(a[2])], [X(a[1]), Y(a[2])], [X(a[1] + a[4]), Y(a[3])], [X(a[0] + a[4]), Y(a[3])]])}" fill="${a[5]}"/>`;
    else if (type === 'num') {
      const x = X(a[0]), y = Y(a[1]), rr = a[5] || 8.5;
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${rr}" fill="${a[3] || '#fff'}"/><text x="${n1(x)}" y="${n1(y + rr * 0.42)}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${n1(rr * 1.18)}" fill="${a[4] || '#111'}">${esc(a[2])}</text>`;
    } else if (type === 'texte') s += `<text x="${n1(X(a[0]))}" y="${n1(Y(a[1]))}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${a[4] || 9}" fill="${a[3]}" ${a[5] ? `transform="skewX(${a[5]})"` : ''} letter-spacing=".5">${esc(a[2])}</text>`;
    else if (type === 'damier') {
      const [h0, h1, p0 = 0, p1 = 1, col = '#111', t = 5] = a;
      for (let x = X(p1), i = 0; x < X(p0); x += t, i++) for (let y = Y(h1), j = 0; y < Y(h0); y += t, j++) if ((i + j) % 2) s += `<rect x="${n1(x)}" y="${n1(y)}" width="${t}" height="${t}" fill="${col}"/>`;
    } else if (type === 'losanges') {
      const [col, h = 22, p0 = 0.1, p1 = 0.92, taille = 9] = a;
      for (let p = p0; p <= p1; p += (taille * 2.6) / (f.long || 262)) { const x = X(p), y = Y(h); s += `<path d="M${n1(x)} ${n1(y - taille)}L${n1(x + taille * 0.62)} ${n1(y)}L${n1(x)} ${n1(y + taille)}L${n1(x - taille * 0.62)} ${n1(y)}Z" fill="${col}"/>`; }
    } else if (type === 'flammes') {
      const [c1, c2 = c1, p1 = 0.55, h = 26] = a;
      let d = `M${n1(XF + 2)} ${n1(Y(h + 9))}`;
      const n = 5;
      for (let i = 0; i < n; i++) { const xa = X(0.05 + (p1 - 0.05) * (i + 0.5) / n), xb = X(0.05 + (p1 - 0.05) * (i + 1) / n); const hh = i % 2 ? 6 : 11; d += `Q${n1(xa)} ${n1(Y(h + hh))} ${n1(xb)} ${n1(Y(h + 2))}Q${n1(xa + 6)} ${n1(Y(h + 1))} ${n1(xb)} ${n1(Y(h - 3 + (i % 2) * 3))}`; }
      d += `L${n1(XF + 2)} ${n1(Y(h - 9))}Z`;
      s += `<path d="${d}" fill="${c1}"/><path d="${d}" fill="${c2}" transform="translate(6 2) scale(.96 1)" opacity=".85"/>`;
    } else if (type === 'graffiti') {                                 // tags à main levée (déterministes)
      const cols = a[0], h = a[1] || 26;
      const formes = ['c4 -10 10 -10 12 -2s-4 10 2 8s8 -12 14 -10s2 12 8 10s10 -14 16 -8', 'l6 -9l5 12l6 -14l5 13l7 -10l4 8', 'c2 -8 12 -8 10 0s-10 6 -4 8s14 -4 18 -10q4 -4 10 4t12 -6'];
      cols.forEach((col, i) => {
        const x = X(0.2 + i * 0.18), y = Y(h - (i % 2) * 4);
        s += `<path d="M${n1(x - 40)} ${n1(y)}${formes[i % 3]}" fill="none" stroke="${col}" stroke-width="${2.4 - i * 0.3}" stroke-linecap="round" stroke-linejoin="round"/>`;
      });
    } else if (type === 'toile') {
      const [col, p = 0.5, h = 24, rr = 22] = a, x = X(p), y = Y(h);
      for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; s += `<line x1="${n1(x)}" y1="${n1(y)}" x2="${n1(x + Math.cos(an) * rr * 1.4)}" y2="${n1(y + Math.sin(an) * rr)}" stroke="${col}" stroke-width="1.1"/>`; }
      for (let k = 1; k <= 3; k++) s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rr * 1.4 * k / 3)}" ry="${n1(rr * k / 3)}" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="5 2"/>`;
    } else if (type === 'volutes') {                                  // arabesques (déco Majorette, DS)
      const [col, h = 24, p0 = 0.2] = a, x0 = X(p0), y = Y(h);
      s += `<path d="M${n1(x0)} ${n1(y)}a6 6 0 1 1 -8 6M${n1(x0)} ${n1(y)}q-14 -12 -28 0t-28 0t-28 0t-28 0" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M${n1(x0 - 40)} ${n1(y + 9)}q-12 8 -24 0t-24 0" fill="none" stroke="${col}" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>`;
    } else if (type === 'eclair') {
      const [col, h = 26, p0 = 0.1, p1 = 0.9] = a;
      const x0 = X(p1), x1 = X(p0), w = x1 - x0;
      s += `<path d="M${n1(x0)} ${n1(Y(h))}L${n1(x0 + w * 0.4)} ${n1(Y(h + 4))}L${n1(x0 + w * 0.36)} ${n1(Y(h - 1))}L${n1(x1)} ${n1(Y(h + 3))}L${n1(x0 + w * 0.62)} ${n1(Y(h - 5))}L${n1(x0 + w * 0.66)} ${n1(Y(h))}Z" fill="${col}"/>`;
    } else if (type === 'drapeau') {
      const [h0, h1, p0, p1] = a, x0 = X(p1), x1 = X(p0), y0 = Y(h1), y1 = Y(h0);
      s += `<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(x1 - x0)}" height="${n1(y1 - y0)}" fill="#1d3b8f"/>` +
        `<path d="M${n1(x0)} ${n1(y0)}L${n1(x1)} ${n1(y1)}M${n1(x1)} ${n1(y0)}L${n1(x0)} ${n1(y1)}" stroke="#fff" stroke-width="5"/>` +
        `<path d="M${n1(x0)} ${n1(y0)}L${n1(x1)} ${n1(y1)}M${n1(x1)} ${n1(y0)}L${n1(x0)} ${n1(y1)}" stroke="#d6233a" stroke-width="1.6"/>` +
        `<path d="M${n1((x0 + x1) / 2)} ${n1(y0)}V${n1(y1)}M${n1(x0)} ${n1((y0 + y1) / 2)}H${n1(x1)}" stroke="#fff" stroke-width="7"/>` +
        `<path d="M${n1((x0 + x1) / 2)} ${n1(y0)}V${n1(y1)}M${n1(x0)} ${n1((y0 + y1) / 2)}H${n1(x1)}" stroke="#d6233a" stroke-width="3.6"/>`;
    } else if (type === 'pointilles') {
      const [col, h, p0 = 0.1, p1 = 0.9, pas = 9] = a;
      for (let x = X(p1); x < X(p0); x += pas) s += `<circle cx="${n1(x)}" cy="${n1(Y(h))}" r="1.8" fill="${col}"/>`;
    } else if (type === 'neon') s += `<path d="M${n1(X(0.03))} ${n1(Y(a[1]))}L${n1(X(0.97))} ${n1(Y(a[1]))}" stroke="${a[0]}" stroke-width="2.2" opacity=".95"/>`;
  }
  return s;
}

/* ------------------------------------------------------------------ accessoires */
function kits(liste = [], couche, ctx) {
  const { f, X, Y, XF, XR, caisse } = ctx;
  const c = f.c;
  let s = '';
  for (const [type, ...a] of liste) {
    const o = a[a.length - 1] && typeof a[a.length - 1] === 'object' && !Array.isArray(a[a.length - 1]) ? a[a.length - 1] : {};
    if (type === 'aileron' && couche === 'avant') {
      const style = a[0] || 'haut', col = o.c || sombre(c.caisse, 0.3), p = o.p ?? 0.93, h = o.h ?? (f.queue ?? 44) + 14, larg = o.l ?? 30;
      if (style === 'levre') s += `<path d="M${n1(XR + 1)} ${n1(Y((f.queue ?? 44)))}L${n1(XR - 4)} ${n1(Y((f.queue ?? 44) + 5))}L${n1(XR + 18)} ${n1(Y((f.queue ?? 44) + 1))}Z" fill="${col}"/>`;
      else {
        const x0 = X(p) - larg / 2, x1 = X(p) + larg / 2;
        const pied = Y((f.coffre ?? f.queue ?? 44) - 1);
        s += style === 'cygne'
          ? `<path d="M${n1(x0 + 8)} ${n1(Y(h) + 2)}q-2 8 4 ${n1(pied - Y(h) - 2)}M${n1(x1 - 8)} ${n1(Y(h) + 2)}q-2 8 4 ${n1(pied - Y(h) - 2)}" stroke="${sombre(col, 0.3)}" stroke-width="2.4" fill="none"/>`
          : `<path d="M${n1(x0 + 8)} ${n1(Y(h))}L${n1(x0 + 10)} ${n1(pied)}M${n1(x1 - 8)} ${n1(Y(h))}L${n1(x1 - 10)} ${n1(pied)}" stroke="${sombre(col, 0.3)}" stroke-width="2.6"/>`;
        s += `<path d="${arrondi([[x0 - 3, Y(h) - 1, 1], [x1 + 1, Y(h) - 3, 2], [x1, Y(h) + 3.5, 1], [x0 - 3, Y(h) + 3, 1]])}" fill="${col}"/>`;
        s += `<rect x="${n1(x0 - 5)}" y="${n1(Y(h) - 5)}" width="4" height="12" rx="1" fill="${o.plaque || sombre(col, 0.2)}"/>`;
      }
    } else if (type === 'chauve' && couche === 'arriere') {        // ailerons de chauve-souris : bord d'attaque qui monte vers l'arrière, bord de fuite festonné
      const col = o.c || sombre(c.caisse, 0.2), hm = a[0] || 26, p0 = o.p0 ?? 0.6, base = o.base ?? caisse - 4;
      const xa = X(p0), xt = XR + (o.deb ?? 6), yb = Y(base), yt = Y(base + hm), L2 = xa - xt;
      const d = `M${n1(xa)} ${n1(yb)}C${n1(xa - L2 * 0.45)} ${n1(yb - 1)} ${n1(xt + L2 * 0.22)} ${n1(yt + hm * 0.2)} ${n1(xt)} ${n1(yt)}` +
        `L${n1(xt + 3)} ${n1(yt + hm * 0.36)}Q${n1(xt + 11)} ${n1(yt + hm * 0.3)} ${n1(xt + 10)} ${n1(yt + hm * 0.62)}Q${n1(xt + 20)} ${n1(yt + hm * 0.6)} ${n1(xt + 21)} ${n1(yb)}Z`;
      s += `<path d="${d}" fill="${col}" stroke="${sombre(col, 0.4)}" stroke-width=".8"/>`;
      s += `<path d="M${n1(xa - 2)} ${n1(yb - 1.5)}C${n1(xa - L2 * 0.45)} ${n1(yb - 2.5)} ${n1(xt + L2 * 0.22)} ${n1(yt + hm * 0.2 - 1)} ${n1(xt)} ${n1(yt - 0.5)}" stroke="${o.liseret || clair(col, 0.45)}" stroke-width="1.4" fill="none"/>`;
    } else if (type === 'bulle' && couche === 'avant') {
      const col = o.c || '#bfe8ff';
      for (const [p, w, h] of a[0]) {
        const x = X(p), y = Y(caisse - 1);
        s += `<path d="M${n1(x - w / 2)} ${n1(y)}Q${n1(x - w / 2)} ${n1(y - h * 1.25)} ${n1(x + w * 0.1)} ${n1(y - h)}Q${n1(x + w / 2)} ${n1(y - h * 0.7)} ${n1(x + w / 2)} ${n1(y)}Z" fill="${col}" opacity=".88" stroke="${sombre(col, 0.35)}" stroke-width="1"/>` +
          `<path d="M${n1(x - w * 0.3)} ${n1(y - h * 0.4)}Q${n1(x - w * 0.2)} ${n1(y - h * 0.9)} ${n1(x + w * 0.05)} ${n1(y - h * 0.88)}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/>`;
      }
    } else if (type === 'turbine' && couche === 'avant') {
      const h = a[0] ?? (f.queue ?? 40) - 12, col = o.c || '#ff7a1a';
      s += `<ellipse cx="${n1(XR - 2)}" cy="${n1(Y(h))}" rx="4" ry="7" fill="#20232e" stroke="#8b93a8"/>` +
        `<path d="M${n1(XR - 4)} ${n1(Y(h) - 5)}Q${n1(XR - 18)} ${n1(Y(h))} ${n1(XR - 4)} ${n1(Y(h) + 5)}Z" fill="${col}" opacity=".85"/>` +
        `<path d="M${n1(XR - 4)} ${n1(Y(h) - 2.5)}Q${n1(XR - 16)} ${n1(Y(h))} ${n1(XR - 4)} ${n1(Y(h) + 2.5)}Z" fill="#fff4a8"/>`;
    } else if (type === 'rampe' && couche === 'avant') {
      const p = a[0] ?? 0.55, x = X(p), y = Y(f.toit ?? 70);
      s += `<rect x="${n1(x - 13)}" y="${n1(y - 5)}" width="26" height="5" rx="2" fill="#20232e"/><rect x="${n1(x - 12)}" y="${n1(y - 4.5)}" width="11" height="4" rx="1.5" fill="${o.c1 || '#ff2a3d'}"/><rect x="${n1(x + 1)}" y="${n1(y - 4.5)}" width="11" height="4" rx="1.5" fill="${o.c2 || '#2a7bff'}"/>`;
    } else if (type === 'taxi' && couche === 'avant') {
      const p = a[0] ?? 0.55, x = X(p), y = Y(f.toit ?? 70);
      s += `<rect x="${n1(x - 11)}" y="${n1(y - 8)}" width="22" height="8" rx="2" fill="${o.c || '#ffcf2a'}" stroke="#222" stroke-width=".8"/><text x="${n1(x)}" y="${n1(y - 2)}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="6" font-weight="900" fill="#111">TAXI</text>`;
    } else if (type === 'moteur' && couche === 'avant') {
      const p = a[0] ?? 0.2, x = X(p), y = Y(caisse), col = o.c || '#c8ccd6', w = o.l ?? 34;
      s += `<path d="${arrondi([[x - w / 2, y + 2, 2], [x - w / 2 + 3, y - 9, 2], [x + w / 2 - 3, y - 9, 2], [x + w / 2, y + 2, 2]])}" fill="${col}" stroke="${sombre(col, 0.4)}"/>`;
      s += `<rect x="${n1(x - w * 0.32)}" y="${n1(y - 18)}" width="${n1(w * 0.64)}" height="9" rx="2" fill="${o.souffleur || '#555b6b'}"/>`;
      for (let i = 0; i < 3; i++) s += `<rect x="${n1(x - w * 0.28 + i * w * 0.2)}" y="${n1(y - 24)}" width="${n1(w * 0.14)}" height="6" rx="1" fill="${clair(col, 0.3)}"/>`;
      if (o.pipes !== false) for (let i = 0; i < 3; i++) s += `<path d="M${n1(x + w / 2 - 6 - i * 7)} ${n1(y + 3)}q-2 9 ${n1(-8 - i)} 12" stroke="#d9dde6" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    } else if (type === 'prise' && couche === 'avant') {
      const p = a[0] ?? 0.2, x = X(p), y = Y(caisse);
      s += `<path d="M${n1(x + 14)} ${n1(y + 1)}L${n1(x + 6)} ${n1(y - 6)}L${n1(x - 12)} ${n1(y - 6)}L${n1(x - 14)} ${n1(y + 1)}Z" fill="${o.c || sombre(c.caisse, 0.3)}"/>`;
    } else if (type === 'scanner' && couche === 'avant') {
      const y = Y((f.nez ?? 24) - 3);
      s += `<rect x="${n1(XF - 20)}" y="${n1(y - 1.6)}" width="19" height="3.2" rx="1.2" fill="#2a0508"/>`;
      for (let i = 0; i < 5; i++) s += `<rect x="${n1(XF - 19 + i * 3.6)}" y="${n1(y - 1.2)}" width="3" height="2.4" fill="#ff2030" opacity="${[0.35, 0.6, 1, 0.6, 0.35][i]}"/>`;
    } else if (type === 'benne' && couche === 'avant') {
      const p0 = a[0], p1 = a[1] ?? 0.99, h = o.h ?? caisse;
      s += `<path d="M${n1(X(p0))} ${n1(Y(h))}L${n1(X(p1))} ${n1(Y(h))}" stroke="${clair(c.caisse, 0.3)}" stroke-width="1.6"/><rect x="${n1(X(p1))}" y="${n1(Y(h))}" width="${n1(X(p0) - X(p1))}" height="3" fill="${sombre(c.caisse, 0.5)}" opacity=".7"/>`;
    } else if (type === 'galerie' && couche === 'avant') {
      const y = Y((f.toit ?? 70) + 2);
      s += `<path d="M${n1(X(a[0]))} ${n1(y)}L${n1(X(a[1]))} ${n1(y)}" stroke="#1d1f27" stroke-width="2.4"/>`;
      for (const p of [a[0], (a[0] + a[1]) / 2, a[1]]) s += `<rect x="${n1(X(p) - 1.2)}" y="${n1(y)}" width="2.4" height="3" fill="#1d1f27"/>`;
    } else if (type === 'echappement' && couche === 'avant') {
      const y = Y((ctx.g.clr ?? 9) + 3);
      s += `<rect x="${n1(X(a[1] ?? 0.62))}" y="${n1(y - 2)}" width="${n1(X(a[0] ?? 0.32) - X(a[1] ?? 0.62))}" height="4" rx="2" fill="#cfd4de" stroke="#7a8090" stroke-width=".6"/>`;
      if (o.flamme) s += `<path d="M${n1(X(a[1] ?? 0.62))} ${n1(y - 2)}q-16 2 -24 2q8 2 24 2z" fill="#ff8a1e"/>`;
    } else if (type === 'ailes' && couche === 'arriere') {
      const col = o.c || '#ffffff', p = a[0] ?? 0.62, x = X(p), y = Y(caisse - 6);
      s += `<path d="M${n1(x + 16)} ${n1(y)}C${n1(x)} ${n1(y - 14)} ${n1(x - 26)} ${n1(y - 30)} ${n1(x - 40)} ${n1(y - 26)}C${n1(x - 30)} ${n1(y - 20)} ${n1(x - 26)} ${n1(y - 12)} ${n1(x - 30)} ${n1(y - 6)}C${n1(x - 18)} ${n1(y - 10)} ${n1(x - 4)} ${n1(y - 2)} ${n1(x + 16)} ${n1(y)}Z" fill="${col}" stroke="${sombre(col, 0.25)}" stroke-width="1"/>` +
        `<path d="M${n1(x - 2)} ${n1(y - 8)}C${n1(x - 14)} ${n1(y - 16)} ${n1(x - 24)} ${n1(y - 22)} ${n1(x - 34)} ${n1(y - 24)}" stroke="${sombre(col, 0.18)}" stroke-width="1" fill="none"/>`;
    } else if (type === 'cockpit' && couche === 'avant') {         // casque du pilote dans un habitacle ouvert
      const x = X(a[0] ?? 0.45), y = Y(caisse);
      s += `<circle cx="${n1(x)}" cy="${n1(y - 5)}" r="6.5" fill="${o.c || '#f4f4f4'}"/><path d="M${n1(x + 1)} ${n1(y - 7)}h6v4h-6z" fill="#1b2340"/>`;
    } else if (type === 'pare' && couche === 'avant') {            // pare-brise de cabriolet
      const p = a[0] ?? 0.36, x = X(p), y = Y(caisse);
      s += `<path d="M${n1(x + 2)} ${n1(y + 1)}L${n1(x - 8)} ${n1(y - (o.h ?? 13))}L${n1(x - 11)} ${n1(y - (o.h ?? 13))}L${n1(x - 2)} ${n1(y + 1)}Z" fill="${o.c || '#bfe2ff'}" opacity=".8" stroke="${sombre(c.caisse, 0.4)}"/>`;
      if (o.appuie !== false) s += `<path d="M${n1(X(o.pa ?? 0.6))} ${n1(y + 1)}q2 -10 12 -9q4 1 4 9z" fill="${o.ca || sombre(c.caisse, 0.25)}"/>`;
    } else if (type === 'antenne' && couche === 'avant') s += `<path d="M${n1(X(a[0]))} ${n1(Y(a[1]))}l-10 -22" stroke="#22252f" stroke-width="1.2"/>`;
    else if (type === 'lame' && couche === 'avant') s += `<path d="M${n1(XF + 4)} ${n1(Y((ctx.g.clr ?? 9) + 1))}L${n1(XF - 26)} ${n1(Y((ctx.g.clr ?? 9) + 1))}L${n1(XF - 22)} ${n1(Y((ctx.g.clr ?? 9) + 4))}L${n1(XF + 4)} ${n1(Y((ctx.g.clr ?? 9) + 4))}Z" fill="${o.c || '#16181f'}"/>`;
    else if (type === 'rotor' && couche === 'dessus') s += '';
  }
  return s;
}

/* ------------------------------------------------------------------ Formule 1 2025 */
function f1(f, id) {
  const c = f.c, XF = 296, XR = 26;
  const rf = 17, rr = 19, xf = 248, xr = 66;
  let s = socle(f, id, XR, XF);
  s += `<defs><linearGradient id="${id}c" x1="0" y1="40" x2="0" y2="${G}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${clair(c.caisse, 0.3)}"/><stop offset=".5" stop-color="${c.caisse}"/><stop offset="1" stop-color="${sombre(c.caisse, 0.45)}"/></linearGradient></defs>`;
  // aileron arrière (derrière la roue)
  s += `<path d="M${XR + 2} 46L${XR + 34} 44L${XR + 34} 54L${XR + 2} 57Z" fill="${c.aileron || c.caisse}"/><path d="M${XR} 42h6v40h-6z" fill="${c.plaque || sombre(c.caisse, 0.3)}"/><path d="M${XR + 18} 56L${XR + 26} 84" stroke="#222" stroke-width="3"/>`;
  // monocoque : capot moteur, pontons, nez
  const corps = arrondi([[XR + 22, 86, 4], [XR + 20, 70, 6], [92, 64, 10], [128, 52, 12], [150, 54, 6], [170, 68, 8], [214, 74, 10], [XF - 4, 84, 6], [XF + 2, 90, 3], [XF - 6, 93, 3], [100, 94, 6]]);
  s += `<path d="${corps}" fill="url(#${id}c)"/>`;
  s += `<clipPath id="${id}k"><path d="${corps}"/></clipPath><g clip-path="url(#${id}k)">`;
  if (c.deux) s += `<path d="M0 0H320V${f.deuxH ?? 72}H0Z" fill="${c.deux}" opacity="${f.deuxO ?? 1}"/>`;
  if (c.bande) s += `<path d="M60 ${f.bandeY ?? 80}L300 ${(f.bandeY ?? 80) + 6}L300 ${(f.bandeY ?? 80) + 10}L60 ${(f.bandeY ?? 80) + 4}Z" fill="${c.bande}"/>`;
  if (c.flanc) s += `<path d="M100 74Q150 70 200 78L200 92L100 92Z" fill="${c.flanc}"/>`;
  s += `<rect x="0" y="88" width="320" height="10" fill="#000" opacity=".3"/></g>`;
  if (!TEXTURE) s += `<path d="${corps}" fill="none" stroke="${c.neon || clair(c.caisse, 0.5)}" stroke-width="1.2" stroke-linejoin="round" opacity=".8"/>`;
  // prise d'air au-dessus du pilote, halo, casque
  s += `<path d="M120 54L128 40L146 42L150 54Z" fill="${c.prise || c.caisse}"/><ellipse cx="132" cy="44" rx="5" ry="3.5" fill="#0d0f16"/>`;
  s += `<circle cx="168" cy="60" r="7" fill="${c.casque || '#f2f2f2'}"/><path d="M169 57h7v4h-7z" fill="#1b2340"/>`;
  s += `<path d="M150 58Q170 48 196 66" stroke="${c.halo || '#2b2f3a'}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  // aileron avant
  s += `<path d="M${XF - 32} 96L${XF + 4} 94L${XF + 6} 99L${XF - 32} 100Z" fill="${c.aileronAv || c.aileron || c.caisse}"/><path d="M${XF + 1} 86h5v14h-5z" fill="${c.plaque || sombre(c.caisse, 0.3)}"/>`;
  if (f.num) s += `<text x="200" y="86" font-family="Arial Black,Arial,sans-serif" font-size="10" font-weight="900" fill="${c.num || '#fff'}">${esc(f.num)}</text>`;
  // suspensions + roues
  s += `<path d="M${xr + 10} 80L100 78M${xr + 10} 92L100 90M${xf - 12} 84L222 80M${xf - 12} 94L222 92" stroke="#1a1c24" stroke-width="2"/>`;
  s += roue(xr, rr, f, id, 0.4) + roue(xf, rf, f, id, 0);
  return s;
}

/* ------------------------------------------------------------------ Formule 1 des années 60 (cigare) */
function f1Vintage(f, id) {
  const c = f.c, XF = 288, XR = 34;
  let s = socle(f, id, XR, XF);
  s += `<defs><linearGradient id="${id}c" x1="0" y1="56" x2="0" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${clair(c.caisse, 0.3)}"/><stop offset=".5" stop-color="${c.caisse}"/><stop offset="1" stop-color="${sombre(c.caisse, 0.45)}"/></linearGradient></defs>`;
  // moteur et échappements à l'arrière
  s += `<rect x="62" y="64" width="44" height="18" rx="4" fill="#9aa1ae"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${70 + i * 9} 66q-4 -16 -24 -22" stroke="#e8ebf0" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const corps = arrondi([[XR + 30, 92, 8], [XR + 34, 74, 10], [110, 66, 10], [150, 60, 8], [200, 66, 12], [XF, 80, 14], [XF + 2, 88, 6], [XF - 10, 94, 4], [110, 96, 6]]);
  s += `<path d="${corps}" fill="url(#${id}c)"/>`;
  s += `<clipPath id="${id}k"><path d="${corps}"/></clipPath><g clip-path="url(#${id}k)"><path d="M0 70H320V76H0Z" fill="${c.bande || '#f1c40f'}"/></g>`;
  s += `<path d="M150 60L160 50L172 50L170 62Z" fill="#bfe2ff" opacity=".8"/><circle cx="146" cy="56" r="7" fill="${c.casque || '#f4f4f4'}"/><path d="M147 53h7v4h-7z" fill="#1b2340"/>`;
  if (f.num) s += `<circle cx="226" cy="80" r="8.5" fill="#fff"/><text x="226" y="84" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="10" fill="#111">${esc(f.num)}</text>`;
  s += `<path d="M86 86L112 84M240 88L262 86" stroke="#1a1c24" stroke-width="2"/>`;
  s += roue(80, 20, f, id, 0.2) + roue(256, 17, f, id, 0);
  return s;
}

/* ------------------------------------------------------------------ hélicoptère (Batcopter) */
function helico(f, id) {
  const c = f.c;
  let s = socle(f, id, 70, 270);
  s += `<defs><linearGradient id="${id}c" x1="0" y1="30" x2="0" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${clair(c.caisse, 0.3)}"/><stop offset=".5" stop-color="${c.caisse}"/><stop offset="1" stop-color="${sombre(c.caisse, 0.45)}"/></linearGradient></defs>`;
  // patins
  s += `<path d="M120 100H250M140 100L150 86M228 100L220 86" stroke="${c.accent || '#f2c200'}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
  // poutre de queue + dérive découpée
  s += `<path d="M168 62L60 56L52 50L44 58L60 64L168 74Z" fill="url(#${id}c)"/>`;
  s += `<path d="M56 56L40 30L50 36L56 26L62 40L70 34L66 58Z" fill="${sombre(c.caisse, 0.2)}"/>`;
  // fuselage
  const corps = arrondi([[150, 88, 10], [146, 58, 14], [190, 42, 14], [252, 52, 16], [282, 72, 10], [262, 90, 8]]);
  s += `<path d="${corps}" fill="url(#${id}c)"/>`;
  s += `<path d="${arrondi([[204, 50, 6], [248, 54, 10], [270, 70, 6], [222, 76, 4], [196, 66, 4]])}" fill="${c.vitre || '#f2c200'}" opacity=".9"/>`;
  s += `<path d="M212 54L236 57" stroke="#fff" stroke-width="2" opacity=".6"/>`;
  // ailerons latéraux en lame
  s += `<path d="M170 80L120 92L178 88Z" fill="${c.accent || '#f2c200'}"/>`;
  // rotor
  s += `<rect x="196" y="31" width="6" height="11" fill="#2a2d38"/><ellipse cx="199" cy="31" rx="92" ry="3.2" fill="${c.rotor || '#c9ced8'}" opacity=".55"/><path d="M110 31H290" stroke="${c.rotor || '#c9ced8'}" stroke-width="2.4"/><circle cx="199" cy="31" r="4" fill="#3a3e4c"/>`;
  return s;
}

/* ------------------------------------------------------------------ fauteuil de sport extrême */
function fauteuil(f, id) {
  const c = f.c, or = c.accent || '#d4a017';
  let s = socle(f, id, 96, 256);
  // châssis, repose-pieds et roulette avant
  s += `<path d="M150 86L210 84L238 96" stroke="#3a3e4c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M228 72L238 96" stroke="${or}" stroke-width="2"/>`;
  s += roue(244, 10, Object.assign({}, f, { jante: '#cfd3dc', rayons: 'plein', flanc: null }), id, 0);
  // assise rembourrée et dossier haut
  s += `<path d="${arrondi([[118, 34, 6], [134, 30, 6], [142, 66, 6], [206, 66, 6], [212, 80, 4], [140, 84, 4], [124, 70, 4]])}" fill="${c.caisse}" stroke="${or}" stroke-width="1.6"/>`;
  s += `<path d="M124 38L132 66" stroke="${clair(c.caisse, 0.25)}" stroke-width="2"/>`;
  for (let i = 0; i < 7; i++) s += `<circle cx="${n1(130 + i * 11)}" cy="${n1(i < 2 ? 40 + i * 13 : 70)}" r="1.6" fill="${or}"/>`;
  // poignée et protections
  s += `<path d="M118 34Q108 30 110 22" stroke="#3a3e4c" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  s += roue(160, 36, Object.assign({}, f, { janteTaille: 0.86 }), id, 0.2);
  s += `<circle cx="160" cy="70" r="33" fill="none" stroke="${or}" stroke-width="2.4"/><circle cx="160" cy="70" r="27" fill="none" stroke="${or}" stroke-width=".8" opacity=".7"/>`;
  return s;
}

/* ------------------------------------------------------------------ géométrie pour le modèle 3D (shared/bolides3d.js) */
/** Échantillonne un polygone à coins arrondis (même construction que arrondi()) : [[x, y], …] fermé implicitement. */
function echantillonner(pts, n = 5) {
  const out = [], N = pts.length;
  for (let i = 0; i < N; i++) {
    const [x, y, r = 0] = pts[i], [px, py] = pts[(i - 1 + N) % N], [nx, ny] = pts[(i + 1) % N];
    const l1 = Math.hypot(x - px, y - py) || 1, l2 = Math.hypot(nx - x, ny - y) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = x + (px - x) * rr / l1, ay = y + (py - y) * rr / l1, bx = x + (nx - x) * rr / l2, by = y + (ny - y) * rr / l2;
    if (rr <= 0) { out.push([x, y]); continue; }
    for (let k = 0; k <= n; k++) { const u = k / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; out.push([a * ax + b * x + c * bx, a * ay + b * y + c * by]); }
  }
  return out;
}
/** Découpe un polygone par le demi-plan y >= y0 (garder = 'bas') ou y <= y0 ('haut') (Sutherland–Hodgman). */
function decouper(poly, y0, garder) {
  const dedans = (p) => (garder === 'bas' ? p[1] >= y0 : p[1] <= y0);
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = dedans(a), ib = dedans(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (y0 - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, y0]); }
  }
  return out;
}
const aire = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return s / 2; };

/** Données de construction 3D d'un bolide, dans le repère du SVG (x vers l'avant, y vers le bas, sol à y = 106) :
    { fam, bas: polygone de caisse sous la ceinture, haut: pavillon (vitres) au-dessus, roues: [{x, y, r}], ceinture,
      xAvant, xArriere, c (couleurs), kit, f (fiche), parts: pièces propres aux familles spéciales }. */
export function geometrie3d(code) {
  const f = FICHES[code];
  if (!f) return null;
  const c = f.c;
  if (f.fam === 'f1') {
    const corps = echantillonner([[48, 86, 4], [46, 70, 6], [92, 64, 10], [128, 52, 12], [150, 54, 6], [170, 68, 8], [214, 74, 10], [292, 84, 6], [298, 90, 3], [290, 93, 3], [100, 94, 6]]);
    return { fam: 'f1', f, c, kit: [], bas: corps, haut: [], ceinture: 70, xAvant: 302, xArriere: 26,
      roues: [{ x: 248, y: G - 17, r: 17, avant: true }, { x: 66, y: G - 19, r: 19 }],
      parts: { aileronAr: [28, 44, 60, 57], aileronAv: [264, 94, 302, 100], prise: [[120, 54], [128, 40], [146, 42], [150, 54]], casque: [168, 60, 7], halo: [150, 58, 196, 66] } };
  }
  if (f.fam === 'f1vintage') {
    const corps = echantillonner([[64, 92, 8], [68, 74, 10], [110, 66, 10], [150, 60, 8], [200, 66, 12], [288, 80, 14], [290, 88, 6], [278, 94, 4], [110, 96, 6]]);
    return { fam: 'f1vintage', f, c, kit: [], bas: corps, haut: [], ceinture: 70, xAvant: 290, xArriere: 34,
      roues: [{ x: 256, y: G - 17, r: 17, avant: true }, { x: 80, y: G - 20, r: 20 }], parts: { casque: [146, 56, 7], moteur: [62, 64, 106, 82] } };
  }
  if (f.fam === 'helico') {
    const corps = echantillonner([[150, 88, 10], [146, 58, 14], [190, 42, 14], [252, 52, 16], [282, 72, 10], [262, 90, 8]]);
    return { fam: 'helico', f, c, kit: [], bas: corps, haut: [], ceinture: 60, xAvant: 284, xArriere: 40, roues: [],
      parts: { queue: [[168, 62], [60, 56], [52, 50], [44, 58], [60, 64], [168, 74]], derive: [[56, 56], [40, 30], [50, 36], [56, 26], [62, 40], [70, 34], [66, 58]], patins: [120, 250, 100], rotor: [199, 31, 92] } };
  }
  if (f.fam === 'fauteuil') {
    const siege = echantillonner([[118, 34, 6], [134, 30, 6], [142, 66, 6], [206, 66, 6], [212, 80, 4], [140, 84, 4], [124, 70, 4]]);
    return { fam: 'fauteuil', f, c, kit: [], bas: siege, haut: [], ceinture: 66, xAvant: 254, xArriere: 108,
      roues: [{ x: 244, y: G - 10, r: 10, avant: true, roulette: true }, { x: 160, y: G - 36, r: 36 }], parts: {} };
  }
  const g = geometrie(f);
  const { X, Y, XF, XR, r, roues, clr } = g;
  const haut = f.pts ? f.pts.map(([p, h, ar = f.arrondi ?? 8]) => [X(p), Y(h), ar]) : profilAuto(f, g);
  // contour complet : dessus arrondi (sans la fermeture) puis bas de caisse avec passages de roues
  const dessus = echantillonner(haut);
  const yb = G - clr;
  const contour = dessus.slice();
  const wheels = [[X(roues[1]), r[1]], [X(roues[0]), r[0]]].sort((a, b) => a[0] - b[0]);
  for (const [cx, rr] of wheels) {
    const ra = rr + (f.jeu ?? 3.2), cy = G - rr, dy = yb - cy;
    if (Math.abs(dy) >= ra) continue;
    const al = Math.atan2(dy, Math.sqrt(ra * ra - dy * dy));
    for (let k = 0; k <= 12; k++) { const a = Math.PI - al + (Math.PI + 2 * al) * (k / 12); contour.push([cx + Math.cos(a) * ra, cy + Math.sin(a) * ra]); }
  }
  contour.push([haut[0][0], yb]);
  // ceinture : sous le pare-brise (profil automatique) ou 62 % de la hauteur (profils dessinés)
  const hMax = Math.max(...haut.map((p) => G - p[1]));
  const toit = f.toit ?? 70;
  const ceintureH = f.pts ? Math.min(hMax - 8, Math.max(f.caisse ?? 0, hMax * 0.62)) : (toit > 0 ? (f.caisse ?? 44) : hMax + 1);
  const yc = Y(ceintureH);
  let bas = decouper(contour, yc, 'bas'), hautP = decouper(contour, yc, 'haut');
  if (Math.abs(aire(hautP)) < 30) hautP = [];
  return { fam: 'route', f, c, kit: f.kit || [], bas, haut: hautP, ceinture: yc, xAvant: XF, xArriere: XR,
    roues: [{ x: X(roues[0]), y: G - r[0], r: r[0], avant: true }, { x: X(roues[1]), y: G - r[1], r: r[1] }],
    hauteurs: { nez: f.nez ?? 30, caisse: f.caisse ?? 44, toit, queue: f.queue ?? 44, coffre: f.coffre ?? (f.caisse ?? 44) + 2, garde: clr },
    X, Y, parts: {} };
}
export const REPERE_SVG = { G, CX, vb: [4, 12, 312, 102] };
