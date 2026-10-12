/**
 * Groupe 7 — modèles 3D sur mesure (3e vague « usine ») : J12, P01, P03, P04, TK01, TK02, TK03, TK04, TK05.
 * Chaque caisse est un loft de sections (tumblehome, ailes galbées au droit des essieux, taille resserrée, boucliers arrondis),
 * le pavillon est un volume vitré fumé en retrait sous un toit et des montants peints.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque, aucun logo, aucun personnage : motifs génériques uniquement.
 */
import { kit } from './aide_7.js';

/* ---------- aides communes au groupe ---------- */

/** Pavillon fermé : volume vitré fumé (stations G), toit peint posé dessus, montants A, B et C peints (le verre paraît en retrait). */
function pavillon(k, G, peint, p) {
  const { o } = k;
  // Brief 10 : le bas du vitrage (noyé dans la caisse) reste au-dessus des passages de roues — jamais dans le volume d'un pneu
  if (p.y0 != null) G = G.map((s) => ({ ...s, y0: Math.min(s.y1 - 0.06, Math.max(s.y0, p.y0)) }));
  k.loft(G, o.verre, { nx: 70, ns: 40 });
  k.peauDessus(G, p.toit[0], p.toit[1], p.dyToit ?? 0.12, peint);
  const yA = (x) => k.sta(G, x).y1 - (p.dyToit ?? 0.12) + 0.02;
  if (p.A) k.montant(G, p.A[0], p.A[1], p.A[2], yA(p.A[2]) - 0.02, p.rA ?? 0.055, peint);
  if (p.Aar) k.montant(G, p.Aar[0], p.Aar[1], p.Aar[2], yA(p.Aar[2]) - 0.02, p.rA ?? 0.055, peint);
  const bas = () => p.ceinture;
  for (const [x0, x1] of p.panneaux || []) k.peauFlanc(G, x0, x1, bas, (x) => yA(x), peint, 0.018);
}
/** Bosse d'aile (ellipsoïde) posée sur la caisse : enfoncée sous la surface la plus basse de son empreinte (jamais flottante). */
function bosse(k, B, x, z, rx, ry, rz, mat) {
  let y = Infinity; for (let i = -4; i <= 4; i++) for (const dz of [-0.6, 0, 0.6]) y = Math.min(y, k.hautAu(B, x + rx * 0.85 * i / 4, z + rz * dz));
  for (const s of [-1, 1]) k.ellipsoide(rx, ry, rz, mat, x, y - ry * 0.3, s * z, 24);
}
/** Rétroviseurs : coque + glace, des deux côtés. */
function retros(k, x, y, z, peint) {
  const { o } = k;
  for (const s of [-1, 1]) { k.ellipsoide(0.13, 0.09, 0.1, peint, x, y, s * z, 12); o.boite(0.06, 0.05, 0.12, peint, x + 0.02, y - 0.08, s * (z - 0.1)); }
}

/* ---- J12 : berline de luxe surbaissée bleu nuit, kit large gris anthracite, jantes blanches multi-branches à bol profond ---- */
function berlineSombre(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = o.lac('#1d2540', 0.24, 0.45), gris = o.mat('#4c515d', 0.45, 0.35), noir = o.mat('#0f1014', 0.6, 0.3), chromeSat = o.mat('#9aa0ab', 0.25, 0.8);
  // caisse élargie (voies plus larges) et ligne de ceinture abaissée : berline basse et large (barème « tolérance zéro »)
  const B = [
    { x: -4.08, w: 0.97, y0: 0.46, y1: 1.02, nt: 3.2, nb: 3 },
    { x: -3.88, w: 1.11, y0: 0.35, y1: 1.24, nt: 4.4, nb: 4 },
    { x: -3.2, w: 1.19, y0: 0.32, y1: 1.3, nt: 4.6, nb: 4 },
    { x: -2.55, w: 1.24, y0: 0.32, y1: 1.33, nt: 4.6, nb: 4 },
    { x: -1.75, w: 1.18, y0: 0.32, y1: 1.27, nt: 4.4, nb: 4 },
    { x: -0.5, w: 1.14, y0: 0.32, y1: 1.25, nt: 4.4, nb: 4 },
    { x: 0.9, w: 1.16, y0: 0.32, y1: 1.25, nt: 4.4, nb: 4 },
    { x: 1.9, w: 1.22, y0: 0.32, y1: 1.3, nt: 4.6, nb: 4 },
    { x: 2.65, w: 1.24, y0: 0.32, y1: 1.33, nt: 4.6, nb: 4 },
    { x: 3.5, w: 1.18, y0: 0.33, y1: 1.25, nt: 4.4, nb: 4 },
    { x: 3.95, w: 1.08, y0: 0.37, y1: 1.1, nt: 3.4, nb: 3.4 },
    { x: 4.12, w: 0.97, y0: 0.45, y1: 0.92, nt: 3, nb: 3 }];
  const rs = [k.roue(2.65, 0.56, 0.62, 1.24, { avant: true, sortie: 0.03 }), k.roue(-2.55, 0.56, 0.72, 1.24, { sortie: 0.03 })];
  k.loft(B, peint, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, peint);                                                    // garde-boue enveloppants : la tôle coiffe tout le pneu
  // pavillon trois volumes chopé : pare-brise couché, toit plat large (≈ 80 % de la caisse), lunette, montant C épais
  const G = [
    { x: -3.05, w: 1.03, y0: 0.95, y1: 1.3, nt: 5, wt: 0.9 }, { x: -2.75, w: 1.07, y0: 0.95, y1: 1.48, nt: 5, wt: 0.88 },
    { x: -1.95, w: 1.09, y0: 0.95, y1: 1.71, nt: 5, wt: 0.86 }, { x: 0.15, w: 1.09, y0: 0.95, y1: 1.72, nt: 5, wt: 0.86 },
    { x: 0.95, w: 1.08, y0: 0.95, y1: 1.47, nt: 5, wt: 0.88 }, { x: 1.3, w: 1.05, y0: 0.95, y1: 1.27, nt: 5, wt: 0.9 }];
  pavillon(k, G, peint, { y0: 1.16, dyToit: 0.08, toit: [-1.9, 0.12], A: [1.22, 1.29, 0.14], Aar: [-2.98, 1.3, -1.9], ceinture: 1.23, panneaux: [[-2.92, -1.72], [-0.6, -0.46]] });
  retros(k, 0.95, 1.39, 1.13, peint);
  // face avant : calandre à lamelles, phares rectangulaires, clignotants ambre, bouclier gris à lèvre et grilles maillées
  o.boite(0.08, 0.17, 0.6, noir, 4.1, 0.8, 0);
  for (let i = 0; i < 4; i++) o.boite(0.09, 0.022, 0.58, chromeSat, 4.11, 0.73 + i * 0.045, 0);
  for (const s of [-1, 1]) {
    o.boite(0.08, 0.15, 0.4, lumBlanche, 4.06, 0.8, s * 0.56);
    o.boite(0.06, 0.06, 0.22, o.mat('#f0a028', 0.4, 0.2), 4.08, 0.62, s * 0.66);
    o.boite(0.06, 0.12, 0.28, noir, 4.1, 0.5, s * 0.5);                                   // grilles d'angle
  }
  k.plaque(4.15, 0.6, 1, '#f2f2f2');
  // poupe : bandeau de feux rouges, plaque, bouclier gris, petit becquet de malle
  o.boite(0.06, 0.18, 1.5, lumRouge, -4.08, 0.95, 0);
  o.boite(0.06, 0.04, 1.5, o.mat('#e8e8ea', 0.4, 0.2), -4.09, 0.85, 0);
  k.plaque(-4.12, 0.64, -1, '#f2f2f2');
  k.plan(-3.7, k.hautAu(B, -3.7, 0) + 0.05, 0.4, 1.86, 0.06, peint);
  // flancs : bas de caisse gris (kit large), ligne de caisse argentée, joints de portes
  k.drapeFlancs(B, -3.95, 4.0, 0.32, 1.3, (g, w, h, c, M) => {
    g.fillStyle = '#868c98'; g.fillRect(0, M.Y(0.66), w, h);
    g.fillStyle = '#9aa2b5'; g.fillRect(0, M.Y(1.03), w, 5); g.fillStyle = '#c9ced8'; g.fillRect(M.X(-3.3), M.Y(0.66), M.S(6.6), 3);
    g.strokeStyle = '#0d1120'; g.lineWidth = 3; for (const x of [1.2, -0.55, -2.0]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.2)); g.lineTo(M.X(x), M.Y(0.64)); g.stroke(); }
    g.fillStyle = '#b8bec8'; for (const x of [0.6, -1.15]) g.fillRect(M.X(x), M.Y(1.12), M.S(0.24), 6);   // poignées
    M.trouer(g, rs);
  }, 1024, 160, 0.024, rs);
  return { L: 8.3, largeur: 2.48, hauteur: 1.75, xAvant: 4.15, xArriere: -4.1,
    roues: rs.map((r) => ({ ...r, jante: '#f4f4f4', rayons: 'six', flanc: null })) };
}


/** Matériau lumineux plat (non éclairé). */
const lumiere = (k, hex) => k.garde(new k.THREE.MeshBasicMaterial({ color: new k.THREE.Color(hex) }));
/** Étoile à cinq branches dessinée sur un canvas. */
function etoile(g, cx, cy, R, col, r = 0.45) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * r : R; (i ? g.lineTo : g.moveTo).call(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); }

/* ---- P01 : coupé-coin noir miroir, pavillon fuyant d'un seul trait jusqu'à la poupe à lamelles, ailes avant en crête,
        scanner rouge à balayage dans le nez (animé), bandeau rouge arrière, becquet-queue, jantes pleines turbine noires ---- */
function wedgeNoir(ctx) {
  const { lumRouge, animes } = ctx, k = kit(ctx), o = k.o;
  const peint = o.lac('#0b0c0f', 0.12, 0.55), gris = o.mat('#24262c', 0.5, 0.4), mat = o.mat('#15161a', 0.7, 0.2);
  const B = [
    { x: -4.25, w: 1.0, y0: 0.52, y1: 1.18, nt: 3, nb: 3 },
    { x: -4.0, w: 1.15, y0: 0.4, y1: 1.33, nt: 3.4, nb: 3.4 },
    { x: -3.1, w: 1.27, y0: 0.36, y1: 1.37, nt: 3.8, nb: 3.6 },
    { x: -2.45, w: 1.29, y0: 0.36, y1: 1.39, nt: 3.8, nb: 3.6 },
    { x: -1.5, w: 1.18, y0: 0.36, y1: 1.27, nt: 3.4, nb: 3.6 },
    { x: -0.2, w: 1.12, y0: 0.36, y1: 1.13, nt: 3.4, nb: 3.6 },
    { x: 1.2, w: 1.13, y0: 0.35, y1: 1.08, nt: 3.2, nb: 3.6 },
    { x: 2.05, w: 1.2, y0: 0.35, y1: 1.13, nt: 3, nb: 3.6 },
    { x: 2.8, w: 1.22, y0: 0.35, y1: 1.13, nt: 3, nb: 3.6 },
    { x: 3.55, w: 1.16, y0: 0.34, y1: 0.9, nt: 3, nb: 3.4 },
    { x: 4.1, w: 1.05, y0: 0.36, y1: 0.63, nt: 3, nb: 3 },
    { x: 4.3, w: 0.92, y0: 0.4, y1: 0.52, nt: 2.6, nb: 2.6 }];
  // voies élargies, pneus à fleur des ailes
  const rs = [k.roue(2.8, 0.5, 0.56, 1.22, { avant: true, sortie: 0.03 }), k.roue(-2.45, 0.6, 0.78, 1.29, { sortie: 0.03 })];
  k.loft(B, peint, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, peint, { t: 0.08, arrondi: 0.03 });                     // garde-boue : la tôle coiffe toute la largeur du pneu
  // crêtes d'ailes avant (bosses au-dessus des roues, capot plus bas entre elles)
  bosse(k, B, 2.65, 0.76, 0.85, 0.12, 0.3, peint);
  // pavillon chopé : pare-brise très couché, toit court large et plat, puis une seule pente jusqu'à la poupe
  const G = [
    { x: -3.95, w: 1.07, y0: 0.95, y1: 1.4, nt: 4, wt: 0.9 }, { x: -2.4, w: 1.11, y0: 0.95, y1: 1.5, nt: 4.5, wt: 0.88 },
    { x: -0.8, w: 1.11, y0: 0.95, y1: 1.53, nt: 5, wt: 0.88 }, { x: 0.25, w: 1.09, y0: 0.95, y1: 1.5, nt: 5, wt: 0.88 },
    { x: 1.3, w: 1.03, y0: 0.93, y1: 1.24, nt: 4, wt: 0.9 }, { x: 2.1, w: 0.99, y0: 0.93, y1: 1.08, nt: 3.5, wt: 0.92 }];
  pavillon(k, G, peint, { y0: 1.24, toit: [-3.9, 0.2], dyToit: 0.1, A: [2.0, 1.1, 0.2], ceinture: 1.05, panneaux: [[-3.9, -1.3]] });
  // lamelles de la poupe (relief réel posé sur la pente)
  for (let i = 0; i < 7; i++) { const x = -3.55 + i * 0.27, y = k.hautAu(G, x, 0) + 0.015; const l = o.boite(0.09, 0.04, 1.25 - i * 0.03, gris, x, y, 0); l.rotation.z = -0.06; }
  // nez : fente sombre + scanner rouge à balayage
  o.boite(0.12, 0.11, 1.6, mat, 4.17, 0.56, 0);
  o.boite(0.13, 0.04, 1.4, k.deuxFaces(lumiere(k, '#4a0605')), 4.18, 0.56, 0);
  const sc = []; for (let i = 0; i < 4; i++) { const m = o.boite(0.135, 0.05, 0.16, k.deuxFaces(lumiere(k, ['#ff3020', '#d01a10', '#9a0e08', '#6a0805'][i])), 4.185, 0.56, 0); sc.push(m); }
  animes.push((t) => { for (let i = 0; i < sc.length; i++) sc[i].position.z = Math.sin(t * 2.6 - i * 0.22) * 0.6; });
  o.boite(0.34, 0.05, 1.86, mat, 4.12, 0.39, 0);                                                     // lame de bouclier
  for (const s of [-1, 1]) o.boite(0.4, 0.06, 0.03, gris, 3.35, k.hautAu(B, 3.35, 0.25) + 0.01, s * 0.25);                    // entrées d'air de capot
  // poupe : bandeau rouge sur toute la largeur, diffuseur à ailettes, becquet-queue à dérives
  o.boite(0.06, 0.1, 1.8, lumRouge, -4.27, 1.0, 0);
  for (let i = -2; i <= 2; i++) o.boite(0.4, 0.22, 0.04, mat, -4.12, 0.52, i * 0.28);
  k.plan(-4.15, 1.5, 0.85, 2.4, 0.11, peint, 0.06);
  for (const s of [-1, 1]) k.lame([[-4.6, 1.36], [-3.75, 1.32], [-3.75, 1.5], [-4.6, 1.68]], 0.07, peint, s * 1.18);
  // flancs : écope latérale sombre et arête de caisse
  k.drapeFlancs(B, -4.0, 4.0, 0.36, 1.38, (g, w, h, c, M) => {
    g.fillStyle = '#1d2027'; g.beginPath(); g.moveTo(M.X(-1.2), M.Y(1.05)); g.lineTo(M.X(0.6), M.Y(0.98)); g.lineTo(M.X(-0.2), M.Y(0.62)); g.lineTo(M.X(-1.5), M.Y(0.62)); g.closePath(); g.fill();
    g.strokeStyle = '#3b3f49'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(3.6), M.Y(0.75)); g.lineTo(M.X(-3.6), M.Y(0.86)); g.stroke();
    M.trouer(g, rs);
  }, 1024, 160, 0.024, rs);
  return { L: 8.9, largeur: 2.56, hauteur: 1.7, xAvant: 4.4, xArriere: -4.6,
    roues: rs.map((r) => ({ ...r, jante: '#2c2e34', rayons: 'plein', flanc: '#8d9199' })) };
}

/* ---- P03 : cabriolet noir pailleté, moulures roses autour des roues, sièges roses hauts, pare-brise rose à flammes,
        toiles violettes sur capot et ailerons de queue, calandre en forme de cercueil, phares verts, jantes violettes ---- */
function roadsterToile(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const peint = o.lac('#19171d', 0.32, 0.55), rose = o.lac('#f7a3d2', 0.4, 0.05), roseS = o.mat('#f49acb', 0.55, 0.05), sombre = o.mat('#0c0b10', 0.8, 0.1);
  const B = [
    { x: -3.95, w: 0.96, y0: 0.55, y1: 1.16, nt: 2.6, nb: 2.6 },
    { x: -3.65, w: 1.13, y0: 0.42, y1: 1.3, nt: 2.8, nb: 3 },
    { x: -2.35, w: 1.24, y0: 0.4, y1: 1.33, nt: 2.8, nb: 3 },
    { x: -1.3, w: 1.11, y0: 0.4, y1: 1.22, nt: 2.8, nb: 3 },
    { x: 0.2, w: 1.08, y0: 0.4, y1: 1.16, nt: 2.8, nb: 3 },
    { x: 1.4, w: 1.15, y0: 0.4, y1: 1.24, nt: 2.6, nb: 3 },
    { x: 2.45, w: 1.24, y0: 0.4, y1: 1.3, nt: 2.6, nb: 3 },
    { x: 3.4, w: 1.13, y0: 0.42, y1: 1.08, nt: 2.6, nb: 3 },
    { x: 3.9, w: 0.92, y0: 0.48, y1: 0.8, nt: 2.4, nb: 2.6 }];
  // caisse élargie et abaissée, pneus à fleur sous les moulures
  const rs = [k.roue(2.45, 0.56, 0.52, 1.24, { avant: true, sortie: 0.06 }), k.roue(-2.35, 0.58, 0.62, 1.24, { sortie: 0.06 })];
  k.loft(B, peint, { arches: k.arches(rs, 1.14) }); k.puits(rs);
  k.ailes(rs, peint, { t: 0.1, arrondi: 0.03 });                      // garde-boue noirs : la tôle coiffe toute la largeur du pneu
  // moulures roses : arcs autour des passages + bas de caisse tubulaire + lèvres avant / arrière
  for (const r of rs) for (const s of [-1, 1]) k.arcGarde(r.x, r.RW, r.RW + 0.14, r.RW + 0.28, s * (r.z + r.ep / 2 - 0.06), 0.18, rose, -0.12, Math.PI + 0.12);
  for (const s of [-1, 1]) { const xa = -2.35 + 0.78, xb = 2.45 - 0.76; k.tige([xa, 0.5, s * (k.flancAu(B, xa, 0.5) + 0.02)], [xb, 0.5, s * (k.flancAu(B, xb, 0.5) + 0.02)], 0.1, rose, 12); }
  k.ellipsoide(0.26, 0.1, 1.0, rose, 3.75, 0.5, 0); k.ellipsoide(0.26, 0.1, 1.02, rose, -3.8, 0.56, 0);
  // habitacle ouvert : cuve sombre, sièges roses à dossiers « cornes » (rabaissés sous la ligne de pavillon), pare-brise rose à flammes
  k.ellipsoide(1.25, 0.07, 0.84, sombre, -0.45, 1.17, 0, 28);
  for (const s of [-1, 1]) {
    o.boite(0.7, 0.16, 0.66, roseS, -0.35, 1.24, s * 0.46);
    k.lame([[-1.05, 1.2], [-0.7, 1.2], [-0.8, 1.36], [-0.9, 1.42], [-0.98, 1.36], [-1.08, 1.42], [-1.2, 1.36]], 0.6, roseS, s * 0.46, 0.03);
  }
  // pare-brise rose couché, flammes magenta intégrées (un seul plan double face)
  for (const sg of [-1, 1]) k.tige([1.16, 1.2, sg * 0.93], [0.8, 1.47, sg * 0.93], 0.035, o.mat('#ff7a3a', 0.5, 0.1));
  const pb = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(1.84, 0.46)), k.matDecal((g, w, h) => {
    g.fillStyle = 'rgba(255,70,170,0.78)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b0106c'; for (let i = 0; i < 7; i++) { const x = w * (0.06 + i * 0.14); g.beginPath(); g.moveTo(x, h * 0.95); g.quadraticCurveTo(x - 14, h * 0.5, x + 8, h * 0.12); g.quadraticCurveTo(x + 12, h * 0.5, x + 26, h * 0.95); g.closePath(); g.fill(); }
  }, 512, 128));
  pb.rotation.set(0, Math.PI / 2, 0); pb.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.92); pb.position.set(0.98, 1.32, 0); o.ajouter(pb);
  // ailerons de queue (dérives) rabaissés + toile violette en décalcomanie
  const fin = [[-2.7, 1.26], [-3.85, 1.2], [-4.2, 1.38], [-4.25, 1.76], [-3.7, 1.52], [-3.0, 1.36]], yT = 1.8, hP = 0.62;
  for (const s of [-1, 1]) {
    k.lame(fin, 0.07, peint, s * 0.96);
    const d = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(1.6, hP)), k.matDecal((g, w, h) => {
      g.save(); g.beginPath(); fin.forEach(([x, y], i) => { const X = (x + 4.3) / 1.6 * w, Y = (yT - y) / hP * h; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.clip();
      g.strokeStyle = '#c38ae6'; g.lineWidth = 3; const cx = (4.3 - 4.25) / 1.6 * w, cy = 0; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 14; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w); g.stroke(); }
      for (let r = 1; r < 9; r++) { g.beginPath(); g.arc(cx, cy, r * w / 9, 0, Math.PI / 2); g.stroke(); } g.restore();
    }, 512, 200));
    d.position.set(-3.5, yT - hP / 2, s * 1.0); if (s < 0) d.rotation.y = Math.PI; o.ajouter(d);
  }
  // face avant : calandre « cercueil » sombre, phares verts, antibrouillards jaunes
  const cer = k.lame([[-0.22, 0.0], [-0.3, 0.12], [-0.14, 0.24], [0.14, 0.24], [0.3, 0.12], [0.22, 0.0]], 0.1, sombre, 0, 0.01);
  cer.rotation.y = Math.PI / 2; cer.position.set(3.86, 0.56, 0);
  for (const s of [-1, 1]) {
    k.ellipsoide(0.16, 0.08, 0.22, k.deuxFaces(lumiere(k, '#93d44a')), 3.55, k.hautAu(B, 3.55, 0.62) - 0.03, s * 0.62, 14);
    k.phareRond(3.82, 0.66, s * 0.58, 0.07, lumBlanche, null);
    o.boite(0.06, 0.12, 0.3, lumRouge, -3.94, 0.98, s * 0.5);
  }
  // capot : contour de cercueil + toile ; flancs : toile violette sur l'arrière
  k.drapeDessus(B, 1.2, 3.85, -1.1, 1.1, (g, w, h) => {
    const X = (x) => (x - 1.2) / 2.65 * w, Z = (z) => (z + 1.1) / 2.2 * h;
    g.strokeStyle = '#c86ee6'; g.lineWidth = 6; g.beginPath(); g.moveTo(X(1.45), Z(-0.5)); g.lineTo(X(3.2), Z(-0.68)); g.lineTo(X(3.7), Z(0)); g.lineTo(X(3.2), Z(0.68)); g.lineTo(X(1.45), Z(0.5)); g.closePath(); g.stroke();
    g.lineWidth = 2.5; const cx = X(1.5), cy = Z(-0.5); for (let i = 0; i < 9; i++) { const a = i * Math.PI / 16; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w * 0.6, cy + Math.sin(a) * w * 0.6); g.stroke(); }
    for (let r = 1; r < 8; r++) { g.beginPath(); g.arc(cx, cy, r * w * 0.07, 0, Math.PI / 2); g.stroke(); }
  }, 512, 384);
  k.drapeFlancs(B, -3.9, 1.6, 0.42, 1.33, (g, w, h, c, M) => {
    g.strokeStyle = '#b97ee0'; g.lineWidth = 3; const cx = M.X(-3.9), cy = M.Y(1.33);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 15; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w * 0.4); g.stroke(); }
    for (let r = 1; r < 10; r++) { g.beginPath(); g.ellipse(cx, cy, r * w * 0.1, r * w * 0.04, 0, 0, Math.PI / 2); g.stroke(); }
    M.trouer(g, rs, 1.3);
  }, 1024, 200, 0.024, rs);
  return { L: 8.3, largeur: 2.5, hauteur: 1.8, xAvant: 3.95, xArriere: -4.27,
    roues: rs.map((r) => ({ ...r, jante: '#a03ee6', rayons: 'cinq', flanc: null })) };
}

/* ---- P04 : cabriolet de sport blanc nacré, long capot, ailes musclées, pare-brise rose, intérieur violet et saumon,
        étoiles orange sur les ailes avant, aile plumée en relief sur les flancs arrière, calandre à lamelles, jantes étoilées roses ---- */
function cabrioletEtoiles(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const blanc = o.lac('#eef0f5', 0.22, 0.12), violet = o.mat('#7b55b8', 0.55, 0.1), saumon = o.mat('#e9917a', 0.55, 0.05), sombre = o.mat('#2a1f3a', 0.8, 0.1);
  const B = [
    { x: -3.95, w: 0.98, y0: 0.5, y1: 1.12, nt: 3, nb: 3 },
    { x: -3.7, w: 1.13, y0: 0.4, y1: 1.26, nt: 3, nb: 3.2 },
    { x: -2.4, w: 1.26, y0: 0.38, y1: 1.32, nt: 3, nb: 3.2 },
    { x: -1.4, w: 1.13, y0: 0.38, y1: 1.2, nt: 3, nb: 3.2 },
    { x: 0.0, w: 1.1, y0: 0.38, y1: 1.15, nt: 3, nb: 3.2 },
    { x: 1.4, w: 1.18, y0: 0.38, y1: 1.19, nt: 3, nb: 3.2 },
    { x: 2.5, w: 1.25, y0: 0.38, y1: 1.27, nt: 3, nb: 3.2 },
    { x: 3.45, w: 1.17, y0: 0.4, y1: 1.0, nt: 3, nb: 3 },
    { x: 4.0, w: 0.96, y0: 0.45, y1: 0.71, nt: 2.6, nb: 2.6 }];
  // caisse élargie et abaissée, voies élargies, pneus à fleur
  const rs = [k.roue(2.5, 0.55, 0.56, 1.25, { avant: true, sortie: 0.03 }), k.roue(-2.4, 0.57, 0.68, 1.26, { sortie: 0.03 })];
  k.loft(B, blanc, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, blanc, { t: 0.1, arrondi: 0.04 });                      // ailes musclées enveloppantes : la tôle coiffe toute la largeur du pneu
  // habitacle ouvert : cuve sombre, sièges violets (dossiers sous la ligne de caisse haute), planche saumon, carénages d'appuie-tête violets
  k.ellipsoide(1.3, 0.07, 0.86, sombre, -0.5, 1.14, 0, 28);
  for (const s of [-1, 1]) {
    o.boite(0.62, 0.15, 0.64, violet, -0.4, 1.22, s * 0.46);
    k.lame([[-1.0, 1.18], [-0.72, 1.18], [-0.84, 1.42], [-1.08, 1.42]], 0.6, violet, s * 0.46, 0.04);
    k.ellipsoide(0.55, 0.12, 0.26, violet, -1.6, k.hautAu(B, -1.6, 0.46) + 0.02, s * 0.46, 16);
  }
  k.ellipsoide(0.3, 0.1, 0.9, saumon, 0.55, 1.17, 0, 18);
  const pb = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(1.86, 0.48)), k.matDecal((g, w, h) => { g.fillStyle = 'rgba(255,80,184,0.8)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, h * 0.15, w, h * 0.08); }, 256, 72));
  pb.rotation.set(0, Math.PI / 2, 0); pb.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.92); pb.position.set(1.0, 1.3, 0); o.ajouter(pb);
  for (const s of [-1, 1]) k.tige([1.19, 1.17, s * 0.94], [0.82, 1.45, s * 0.94], 0.035, blanc);
  // face avant : calandre basse à lamelles chromées, phares fins, lèvre rose
  for (let i = 0; i < 6; i++) o.boite(0.06, 0.025, 1.3 - i * 0.04, o.chrome, 3.98, 0.5 + i * 0.04, 0);
  for (const s of [-1, 1]) {
    const ph = k.ellipsoide(0.2, 0.025, 0.13, lumBlanche, 3.6, k.hautAu(B, 3.6, 0.74) - 0.01, s * 0.74, 14); ph.rotation.z = -0.4;
    o.boite(0.06, 0.12, 0.26, lumRouge, -3.93, 0.98, s * 0.7);
  }
  k.ellipsoide(0.2, 0.05, 0.7, o.lac('#ff5fae', 0.35, 0.05), 3.92, 0.43, 0);
  // poupe : diffuseur violet, étoiles jaunes à côté des feux
  o.boite(0.12, 0.16, 0.9, violet, -3.92, 0.6, 0);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(ctx.garde(new THREE.PlaneGeometry(0.22, 0.22)), k.matDecal((g, w, h) => etoile(g, w / 2, h / 2, w * 0.48, '#ffc02e'), 64, 64)); st.position.set(-3.96, 0.98, s * 0.3); st.rotation.y = -Math.PI / 2; o.ajouter(st); }
  // flancs : étoile orange sur l'aile avant, aile plumée sur l'aile arrière, filet rose en bas de caisse
  k.drapeFlancs(B, -3.9, 3.95, 0.38, 1.16, (g, w, h, c, M) => {
    etoile(g, M.X(3.05), M.Y(0.86), M.Sy(0.2), '#ff7a1e');
    g.fillStyle = '#e2e6ef'; g.strokeStyle = '#8f98ad'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(M.X(-1.2), M.Y(1.04 - i * 0.07)); g.quadraticCurveTo(M.X(-2.4 + i * 0.1), M.Y(1.14 - i * 0.05), M.X(-3.3 + i * 0.25), M.Y(1.08 - i * 0.1)); g.quadraticCurveTo(M.X(-2.3), M.Y(0.98 - i * 0.08), M.X(-1.2), M.Y(0.98 - i * 0.07)); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = '#ff6fb8'; g.fillRect(M.X(-1.7), M.Y(0.52), M.S(3.4), M.Sy(0.05));
    M.trouer(g, rs);
  }, 1024, 200, 0.024, rs);
  return { L: 8.1, largeur: 2.52, hauteur: 1.5, xAvant: 4.02, xArriere: -3.97,
    roues: rs.map((r) => ({ ...r, jante: '#ff5fae', rayons: 'etoile', flanc: '#ff9acb' })) };
}


/** Stations de caisse « boîte » 80s : demi-largeur de base w, élargisseurs carrés de demi-largeur wf autour de chaque essieu. */
function caisseCarree({ xr, xf, w, wf, y0 = 0.34, yAr, yAv, yMil, ax, nt = 5, nb = 4, demi = 0.8, raide = 0.18 }) {
  const st = [{ x: xr, w: w * 0.86, y0: y0 + 0.12, y1: yAr - 0.2, nt: nt - 1, nb: nb - 0.6 }, { x: xr + 0.2, w: w * 0.98, y0, y1: yAr, nt, nb }];
  const yAt = (x) => (x < 0 ? yMil + (yAr - yMil) * Math.min(1, -x / -xr) : yMil + (yAv - yMil) * Math.min(1, x / xf));
  const pts = [];
  for (const a of ax) pts.push([a - demi - raide, w], [a - demi, wf], [a + demi, wf], [a + demi + raide, w]);
  pts.sort((p, q) => p[0] - q[0]);
  for (const [x, ww] of pts) if (x > xr + 0.3 && x < xf - 0.3) st.push({ x, w: ww, y0, y1: yAt(x), nt, nb });
  st.push({ x: xf - 0.2, w: w * 0.97, y0: y0 + 0.02, y1: yAv - 0.08, nt, nb }, { x: xf, w: w * 0.86, y0: y0 + 0.12, y1: yAv - 0.26, nt: nt - 1, nb: nb - 0.6 });
  return st;
}

/* ---- TK01 : coupé 80s noir mat, hayon vitré, ailes carrées gonflées, phares escamotables relevés, capot à bossage décalé, jantes argent ---- */
function coupeEscamotable(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = o.lac('#1e1f24', 0.55, 0.25), noir = o.mat('#0b0c0f', 0.75, 0.2), gris = o.mat('#3a3c42', 0.5, 0.4), ambre = o.mat('#e8902c', 0.4, 0.2);
  // caisse élargie (ailes carrées gonflées plus larges) et ceinture abaissée
  const B = caisseCarree({ xr: -3.85, xf: 3.9, w: 1.1, wf: 1.28, yAr: 1.3, yAv: 1.26, yMil: 1.24, ax: [-2.3, 2.4], demi: 0.78 });
  const rs = [k.roue(2.4, 0.54, 0.56, 1.28, { avant: true, sortie: 0.03 }), k.roue(-2.3, 0.56, 0.66, 1.28, { sortie: 0.03 })];
  k.loft(B, peint, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, peint, { t: 0.1, arrondi: 0.025 });                                   // garde-boue : la tôle coiffe toute la largeur du pneu
  // pavillon à hayon : pare-brise, toit, grande lunette fuyante jusqu'à la poupe
  // pavillon chopé, toit plat et large posé sur les épaules
  const G = [
    { x: -3.45, w: 1.03, y0: 0.95, y1: 1.36, nt: 5, wt: 0.9 }, { x: -2.4, w: 1.07, y0: 0.95, y1: 1.5, nt: 5, wt: 0.88 },
    { x: -0.95, w: 1.09, y0: 0.95, y1: 1.62, nt: 5, wt: 0.88 }, { x: 0.15, w: 1.09, y0: 0.95, y1: 1.62, nt: 5, wt: 0.88 },
    { x: 0.9, w: 1.07, y0: 0.95, y1: 1.44, nt: 5, wt: 0.9 }, { x: 1.25, w: 1.03, y0: 0.95, y1: 1.27, nt: 5, wt: 0.92 }];
  pavillon(k, G, peint, { y0: 1.18, toit: [-1.0, 0.1], dyToit: 0.08, A: [1.2, 1.26, 0.1], Aar: [-3.4, 1.3, -1.0], ceinture: 1.2, panneaux: [[-3.35, -2.55], [-1.75, -1.42]] });
  retros(k, 0.9, 1.42, 1.14, peint);
  // capot : bossage décalé + grille d'auvent
  k.ellipsoide(0.9, 0.07, 0.3, peint, 2.2, k.hautAu(B, 2.2, 0.25) - 0.01, 0.25, 18);
  for (let i = 0; i < 5; i++) o.boite(0.03, 0.02, 1.2, noir, 1.32 + i * 0.06, k.hautAu(B, 1.4, 0) + 0.01, 0);
  // phares escamotables relevés, feux de bouclier, plaque blanche, bouclier noir
  for (const s of [-1, 1]) {
    const y = k.hautAu(B, 3.3, 0.78);
    o.boite(0.36, 0.2, 0.46, noir, 3.3, y + 0.09, s * 0.78); o.boite(0.04, 0.14, 0.38, lumBlanche, 3.49, y + 0.09, s * 0.78);
    o.boite(0.06, 0.1, 0.32, lumBlanche, 3.9, 0.8, s * 0.6); o.boite(0.06, 0.1, 0.12, ambre, 3.9, 0.8, s * 0.88);
    o.boite(0.06, 0.15, 0.44, lumRouge, -3.85, 0.92, s * 0.7);
  }
  o.boite(0.06, 0.14, 0.6, noir, 3.92, 0.62, 0);
  k.plaque(3.95, 0.82, 1, '#f4f4f4');
  o.boite(0.06, 0.12, 0.8, noir, -3.86, 0.92, 0);
  k.plaque(-3.88, 0.64, -1, '#f4f4f4');
  // flancs : jonc de protection, bas de caisse noir, joint de porte
  k.drapeFlancs(B, -3.8, 3.85, 0.34, 1.3, (g, w, h, c, M) => {
    g.fillStyle = '#0d0e11'; g.fillRect(0, M.Y(0.5), w, h);
    g.fillStyle = '#34363c'; g.fillRect(0, M.Y(0.82), w, 6);
    g.strokeStyle = '#08090b'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(1.2), M.Y(1.16)); g.lineTo(M.X(1.15), M.Y(0.5)); g.moveTo(M.X(-1.5), M.Y(1.16)); g.lineTo(M.X(-1.45), M.Y(0.5)); g.stroke();
    g.fillStyle = '#4a4c52'; g.fillRect(M.X(-1.3), M.Y(1.04), M.S(0.22), 6);
    M.trouer(g, rs);
  }, 1024, 160, 0.024, rs);
  return { L: 7.9, largeur: 2.56, hauteur: 1.66, xAvant: 3.97, xArriere: -3.9,
    roues: rs.map((r) => ({ ...r, jante: '#c3c7ce', rayons: 'six', flanc: null })) };
}

/* ---- TK02 : coupé 80s bicolore argent / noir, nez fin à lamelles, filet or et inscription « TURBO », becquet de malle noir, jantes maillées dorées ---- */
function coupeBicolore(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const argent = o.lac('#a5a9b1', 0.32, 0.55), noir = o.lac('#121317', 0.4, 0.3), mat = o.mat('#0b0c0f', 0.7, 0.2);
  const B = [
    { x: -3.95, w: 1.07, y0: 0.46, y1: 1.08, nt: 4, nb: 3.4 }, { x: -3.75, w: 1.20, y0: 0.36, y1: 1.26, nt: 4.6, nb: 4 },
    { x: -2.4, w: 1.27, y0: 0.35, y1: 1.3, nt: 4.8, nb: 4 }, { x: -1.3, w: 1.23, y0: 0.35, y1: 1.25, nt: 4.6, nb: 4 },
    { x: 0.6, w: 1.22, y0: 0.35, y1: 1.24, nt: 4.6, nb: 4 }, { x: 2.5, w: 1.27, y0: 0.35, y1: 1.28, nt: 4.8, nb: 4 },
    { x: 3.6, w: 1.21, y0: 0.36, y1: 1.15, nt: 4.4, nb: 4 }, { x: 3.95, w: 1.09, y0: 0.42, y1: 0.98, nt: 3.6, nb: 3.4 }];
  // caisse élargie et abaissée, pneus à fleur
  const rs = [k.roue(2.5, 0.54, 0.52, 1.27, { avant: true, sortie: 0.03 }), k.roue(-2.4, 0.55, 0.58, 1.27, { sortie: 0.03 })];
  k.loft(B, argent, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, argent, { t: 0.09, arrondi: 0.03 });                     // garde-boue : la tôle coiffe toute la largeur du pneu
  // pavillon chopé à toit plat large
  const G = [
    { x: -2.75, w: 1.05, y0: 0.95, y1: 1.32, nt: 5, wt: 0.9 }, { x: -2.35, w: 1.08, y0: 0.95, y1: 1.48, nt: 5, wt: 0.88 },
    { x: -1.55, w: 1.10, y0: 0.95, y1: 1.64, nt: 5, wt: 0.88 }, { x: 0.2, w: 1.10, y0: 0.95, y1: 1.64, nt: 5, wt: 0.88 },
    { x: 0.85, w: 1.08, y0: 0.95, y1: 1.45, nt: 5, wt: 0.9 }, { x: 1.2, w: 1.05, y0: 0.95, y1: 1.25, nt: 5, wt: 0.92 }];
  pavillon(k, G, argent, { y0: 1.18, toit: [-1.5, 0.15], dyToit: 0.08, A: [1.15, 1.24, 0.15], Aar: [-2.7, 1.3, -1.5], ceinture: 1.2, panneaux: [[-2.62, -1.95], [-0.42, -0.3]] });
  retros(k, 0.85, 1.42, 1.18, noir);
  // nez fin : bandeau sombre à lamelles entre les phares, bouclier noir, clignotants
  o.boite(0.06, 0.16, 0.9, mat, 3.94, 0.86, 0);
  for (let i = 0; i < 3; i++) o.boite(0.065, 0.02, 0.86, o.mat('#6a6e78', 0.3, 0.7), 3.95, 0.81 + i * 0.05, 0);
  for (const s of [-1, 1]) {
    o.boite(0.07, 0.16, 0.36, lumBlanche, 3.92, 0.84, s * 0.76);
    o.boite(0.06, 0.07, 0.2, o.mat('#f09a2a', 0.4, 0.2), 3.96, 0.56, s * 0.8);
    o.boite(0.07, 0.18, 0.54, lumRouge, -3.93, 0.94, s * 0.66);
    o.cyl(0.07, 0.07, 0.3, o.chrome, -3.95, 0.42, s * 0.5, 0, Math.PI / 2, 14);
  }
  o.boite(0.1, 0.22, 2.0, noir, 3.93, 0.55, 0);
  o.boite(0.1, 0.26, 2.0, noir, -3.92, 0.58, 0);
  o.boite(0.06, 0.16, 0.56, o.mat('#e8e8ea', 0.5, 0.1), -3.96, 0.6, 0);
  // becquet de malle noir sur deux pieds
  const yMa = k.hautAu(B, -3.55, 0);
  k.plan(-3.55, yMa + 0.17, 0.55, 2.2, 0.07, noir, 0.08);
  for (const s of [-1, 1]) o.boite(0.12, 0.2, 0.06, noir, -3.55, yMa + 0.06, s * 0.9);
  // flancs : bas de caisse noir, double filet or, « TURBO » or
  k.drapeFlancs(B, -3.9, 3.9, 0.35, 1.3, (g, w, h, c, M) => {
    g.fillStyle = '#121317'; g.fillRect(0, M.Y(0.8), w, h);
    g.fillStyle = '#d4a63c'; g.fillRect(0, M.Y(0.8) - 5, w, 4); g.fillRect(0, M.Y(0.8) + 5, w, 2);
    k.ecrire(g, 'TURBO', M.X(-0.7), M.Y(0.68), c, 'bold 30px sans-serif', '#d9ab42');
    g.strokeStyle = '#7c8088'; g.lineWidth = 2; g.beginPath(); g.moveTo(M.X(1.15), M.Y(1.17)); g.lineTo(M.X(1.1), M.Y(0.8)); g.moveTo(M.X(-1.0), M.Y(1.17)); g.lineTo(M.X(-1.0), M.Y(0.8)); g.stroke();
    M.trouer(g, rs);
  }, 1024, 170, 0.024, rs);
  return { L: 8.0, largeur: 2.56, hauteur: 1.66, xAvant: 4.0, xArriere: -4.0,
    roues: rs.map((r) => ({ ...r, jante: '#d1a94c', rayons: 'maille', flanc: null })) };
}

/* ---- TK03 : berline de course 4 portes noire, élargisseurs carrés, calandre chromée verticale, aileron arrière double étage, jantes 6 branches ---- */
function berlineAileron(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = o.lac('#0d0e12', 0.2, 0.45), noir = o.mat('#16171c', 0.6, 0.3), ambre = o.mat('#f0a43a', 0.35, 0.2);
  // caisse élargie (élargisseurs carrés plus larges) et ceinture abaissée
  const B = caisseCarree({ xr: -3.72, xf: 3.74, w: 1.12, wf: 1.26, yAr: 1.33, yAv: 1.3, yMil: 1.28, ax: [-2.15, 2.2], demi: 0.8, raide: 0.22 });
  const rs = [k.roue(2.2, 0.56, 0.58, 1.26, { avant: true, sortie: 0.03 }), k.roue(-2.15, 0.56, 0.68, 1.26, { sortie: 0.03 })];
  k.loft(B, peint, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, peint, { t: 0.1, arrondi: 0.025 });                      // élargisseurs : la tôle coiffe toute la largeur du pneu
  const G = [
    { x: -2.6, w: 1.03, y0: 0.95, y1: 1.36, nt: 5, wt: 0.9 }, { x: -2.25, w: 1.06, y0: 0.95, y1: 1.52, nt: 5, wt: 0.88 },
    { x: -1.55, w: 1.09, y0: 0.95, y1: 1.73, nt: 5, wt: 0.86 }, { x: 0.3, w: 1.09, y0: 0.95, y1: 1.73, nt: 5, wt: 0.86 },
    { x: 0.9, w: 1.07, y0: 0.95, y1: 1.5, nt: 5, wt: 0.88 }, { x: 1.3, w: 1.03, y0: 0.95, y1: 1.3, nt: 5, wt: 0.92 }];
  pavillon(k, G, peint, { y0: 1.2, dyToit: 0.08, toit: [-1.5, 0.25], A: [1.25, 1.3, 0.25], Aar: [-2.55, 1.33, -1.5], ceinture: 1.26, panneaux: [[-2.48, -1.6], [-0.48, -0.34]] });
  retros(k, 0.95, 1.44, 1.14, peint);
  // calandre chromée verticale à trois rangs de lamelles, phares rectangulaires + clignotants ambre, lame avant
  o.boite(0.08, 0.3, 0.56, o.chrome, 3.74, 0.86, 0);
  for (let i = 0; i < 3; i++) o.boite(0.085, 0.06, 0.48, noir, 3.75, 0.775 + i * 0.085, 0);
  for (const s of [-1, 1]) {
    o.boite(0.07, 0.16, 0.38, lumBlanche, 3.72, 0.86, s * 0.56); o.boite(0.07, 0.16, 0.14, ambre, 3.7, 0.86, s * 0.86);
    o.boite(0.07, 0.2, 0.44, lumRouge, -3.73, 0.96, s * 0.68); o.boite(0.06, 0.07, 0.44, ambre, -3.74, 0.82, s * 0.68);
  }
  o.boite(0.1, 0.14, 1.94, noir, 3.7, 0.5, 0);
  k.plaque(3.8, 0.66, 1, '#f2f2f2'); k.plaque(-3.78, 0.7, -1, '#f2f2f2');
  // aileron double étage : plan bas + plan haut, grandes dérives et pieds sur la malle
  const yM = k.hautAu(B, -3.3, 0);
  k.plan(-3.3, yM + 0.24, 0.72, 2.12, 0.09, peint, 0.05);
  k.plan(-3.38, yM + 0.48, 0.6, 2.12, 0.08, peint, 0.12);
  for (const s of [-1, 1]) {
    k.lame([[-3.75, yM + 0.12], [-2.9, yM + 0.12], [-2.9, yM + 0.44], [-3.1, yM + 0.62], [-3.75, yM + 0.62]], 0.06, peint, s * 1.09);
    o.boite(0.16, 0.26, 0.08, peint, -3.2, yM + 0.1, s * 0.7);
  }
  // flancs : joints de portes, poignées, bas de caisse
  k.drapeFlancs(B, -3.65, 3.7, 0.34, 1.33, (g, w, h, c, M) => {
    g.fillStyle = '#050608'; g.fillRect(0, M.Y(0.48), w, h);
    g.strokeStyle = '#050608'; g.lineWidth = 3; for (const x of [1.15, -0.42, -1.75]) { g.beginPath(); g.moveTo(M.X(x), M.Y(1.21)); g.lineTo(M.X(x - 0.05), M.Y(0.5)); g.stroke(); }
    g.fillStyle = '#2a2c33'; for (const x of [0.55, -1.15]) g.fillRect(M.X(x), M.Y(1.1), M.S(0.24), 6);
    g.fillStyle = '#2b5fc8'; g.fillRect(M.X(1.45), M.Y(0.66), M.S(0.16), M.Sy(0.07));
    M.trouer(g, rs);
  }, 1024, 170, 0.024, rs);
  return { L: 7.5, largeur: 2.54, hauteur: 2.0, xAvant: 3.8, xArriere: -3.8,
    roues: rs.map((r) => ({ ...r, jante: '#c9cdd4', rayons: 'six', flanc: null })) };
}

/* ---- TK04 : coupé musclé noir et or, nez en bec à doubles grilles, prise d'air de capot, toit à pans vitrés, flammes or sur le capot,
        filets or, becquet de malle, jantes nid d'abeille dorées (aucun emblème : motif de flammes générique) ---- */
function coupeOr(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o;
  const peint = o.lac('#08080a', 0.12, 0.5), or = o.mat('#d6a83a', 0.3, 0.75), noir = o.mat('#141418', 0.6, 0.3);
  const B = [
    { x: -4.45, w: 1.06, y0: 0.46, y1: 1.12, nt: 4, nb: 3.4 }, { x: -4.25, w: 1.2, y0: 0.36, y1: 1.34, nt: 4.4, nb: 4 },
    { x: -2.7, w: 1.32, y0: 0.35, y1: 1.43, nt: 4.6, nb: 4 }, { x: -1.4, w: 1.23, y0: 0.35, y1: 1.33, nt: 4.4, nb: 4 },
    { x: 0.6, w: 1.24, y0: 0.35, y1: 1.3, nt: 4.4, nb: 4 }, { x: 2.75, w: 1.32, y0: 0.35, y1: 1.38, nt: 4.6, nb: 4 },
    { x: 3.85, w: 1.24, y0: 0.38, y1: 1.26, nt: 4, nb: 4 }, { x: 4.4, w: 1.06, y0: 0.46, y1: 1.0, nt: 3.4, nb: 3.4 }];
  // caisse élargie et ceinture abaissée : voies larges, pneus à fleur
  const rs = [k.roue(2.75, 0.6, 0.6, 1.32, { avant: true, sortie: 0.03 }), k.roue(-2.7, 0.62, 0.78, 1.32, { sortie: 0.03 })];
  k.loft(B, peint, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, peint, { t: 0.09, arrondi: 0.035 });                                   // garde-boue : la tôle coiffe toute la largeur du pneu
  const G = [
    { x: -2.75, w: 1.06, y0: 1.0, y1: 1.44, nt: 5, wt: 0.9 }, { x: -2.15, w: 1.1, y0: 1.0, y1: 1.57, nt: 5, wt: 0.88 },
    { x: -1.45, w: 1.12, y0: 1.0, y1: 1.68, nt: 5, wt: 0.88 }, { x: 0.05, w: 1.12, y0: 1.0, y1: 1.68, nt: 5, wt: 0.88 },
    { x: 0.75, w: 1.1, y0: 1.0, y1: 1.52, nt: 5, wt: 0.9 }, { x: 1.15, w: 1.06, y0: 1.0, y1: 1.34, nt: 5, wt: 0.92 }];
  pavillon(k, G, peint, { y0: 1.28, toit: [-1.45, 0.05], dyToit: 0.07, A: [1.1, 1.32, 0.05], Aar: [-2.7, 1.42, -1.45], ceinture: 1.3, panneaux: [[-2.62, -1.7]] });
  // toit en T : deux pans vitrés fumés de part et d'autre de la barre centrale
  for (const s of [-1, 1]) { const y = k.hautAu(G, -0.7, 0.33) + 0.012; const p = o.boite(1.15, 0.02, 0.42, o.verre, -0.7, y, s * 0.33); p.rotation.x = s * 0.04; }
  retros(k, 0.75, 1.48, 1.2, peint);
  // prise d'air de capot (shaker) + filet or
  const yC = k.hautAu(B, 2.0, 0);
  k.ellipsoide(0.45, 0.13, 0.32, peint, 2.0, yC + 0.04, 0, 18); o.boite(0.05, 0.1, 0.42, noir, 2.4, yC + 0.1, 0);
  // nez en bec : deux grilles sombres cerclées d'or, doubles phares carrés, clignotants
  for (const s of [-1, 1]) {
    o.boite(0.06, 0.2, 0.5, noir, 4.4, 0.8, s * 0.4); o.boite(0.05, 0.24, 0.56, or, 4.385, 0.8, s * 0.4);
    o.boite(0.08, 0.13, 0.18, lumBlanche, 4.33, 0.84, s * 0.8); o.boite(0.08, 0.13, 0.18, lumBlanche, 4.31, 0.84, s * 1.0);
    o.boite(0.06, 0.06, 0.24, o.mat('#f0a43a', 0.4, 0.2), 4.4, 0.55, s * 0.68);
  }
  o.boite(0.06, 0.08, 0.06, or, 4.45, 0.9, 0);
  o.boite(0.1, 0.12, 2.0, noir, 4.36, 0.5, 0); o.boite(0.1, 0.14, 2.0, noir, -4.4, 0.52, 0);
  o.boite(0.06, 0.22, 1.9, noir, -4.45, 0.95, 0);
  for (const s of [-1, 1]) o.boite(0.07, 0.15, 0.72, lumRouge, -4.47, 0.95, s * 0.5);
  // becquet de malle relevé
  k.plan(-4.15, k.hautAu(B, -4.15, 0) + 0.06, 0.5, 2.3, 0.08, peint, 0.12);
  // flammes or génériques sur le capot
  k.drapeDessus(B, 1.3, 4.35, -1.12, 1.12, (g, w, h) => {
    g.fillStyle = '#d9ab3e'; g.strokeStyle = '#8c6a1c'; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const zc = h * (0.2 + i * 0.1), L = w * (0.42 + (i % 3) * 0.08), sg = i < 3.5 ? -1 : 1;
      g.beginPath(); g.moveTo(w * 0.98, zc - 14); g.bezierCurveTo(w * 0.7, zc - 20, w * 0.6, zc + sg * 40, w * 0.98 - L, zc + sg * 26); g.bezierCurveTo(w * 0.75, zc + 8, w * 0.8, zc + 10, w * 0.98, zc + 12); g.closePath(); g.fill(); g.stroke();
    }
  }, 768, 384);
  // flancs : double filet or + retour sur les ailes
  k.drapeFlancs(B, -4.3, 4.35, 0.35, 1.42, (g, w, h, c, M) => {
    g.fillStyle = '#d6a83a'; g.fillRect(M.X(-4.2), M.Y(1.1), M.S(8.4), 4); g.fillRect(M.X(-4.2), M.Y(1.1) + 8, M.S(8.4), 2);
    g.fillRect(M.X(-4.2), M.Y(0.5), M.S(8.4), 3);
    g.strokeStyle = '#2a2a30'; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(1.1), M.Y(1.2)); g.lineTo(M.X(1.05), M.Y(0.52)); g.moveTo(M.X(-1.7), M.Y(1.24)); g.lineTo(M.X(-1.65), M.Y(0.52)); g.stroke();
    M.trouer(g, rs);
  }, 1024, 170, 0.024, rs);
  return { L: 9.0, largeur: 2.66, hauteur: 1.72, xAvant: 4.5, xArriere: -4.5,
    roues: rs.map((r) => ({ ...r, jante: '#d6a83a', rayons: 'maille', flanc: null })) };
}

/* ---- TK05 : petit bus jaune haut et joufflu, tout en rondeurs : garde-boue enveloppants, grand pare-brise bombé, grandes vitres rondes
        cerclées de chrome, porte coulissante, deux bandes orange longitudinales sur le toit, petit becquet de toit, roues rouges.
        Formes génériques uniquement : aucun trait de personnage (ni oreilles, ni joues, ni queue, ni visage). ---- */
function minibusHublots(ctx) {
  const { lumBlanche, lumRouge } = ctx, k = kit(ctx), o = k.o, { THREE } = k;
  const jaune = o.lac('#ffc60f', 0.32, 0.06), sombre = o.mat('#26272c', 0.55, 0.3);
  // Brief 10 : famille « vans & utilitaires hauts » — pavillon haut (H_toit / W ≈ 0,95 d'après la photo), caisse ronde et bombée
  const B = [
    { x: -3.4, w: 1.02, y0: 0.55, y1: 2.0, nt: 2.6, nb: 3, wt: 0.94 },
    { x: -3.18, w: 1.2, y0: 0.42, y1: 2.36, nt: 3.0, nb: 3.4, wt: 0.92 },
    { x: -2.1, w: 1.28, y0: 0.38, y1: 2.5, nt: 3.4, nb: 3.6, wt: 0.92 },
    { x: 0.0, w: 1.25, y0: 0.38, y1: 2.53, nt: 3.4, nb: 3.6, wt: 0.92 },
    { x: 1.9, w: 1.28, y0: 0.38, y1: 2.46, nt: 3.4, nb: 3.6, wt: 0.92 },
    { x: 2.75, w: 1.22, y0: 0.4, y1: 2.12, nt: 3, nb: 3.4, wt: 0.92 },
    { x: 3.3, w: 1.06, y0: 0.5, y1: 1.5, nt: 2.6, nb: 3, wt: 0.94 },
    { x: 3.45, w: 0.9, y0: 0.62, y1: 1.12, nt: 2.4, nb: 2.6, wt: 0.94 }];
  const rs = [k.roue(2.1, 0.5, 0.46, 1.28, { avant: true, sortie: 0.03 }), k.roue(-2.1, 0.5, 0.46, 1.28, { sortie: 0.03 })];
  k.loft(B, jaune, { arches: k.arches(rs) }); k.puits(rs);
  k.ailes(rs, jaune, { t: 0.14, arrondi: 0.05, deb: 0.03, a0: 0.0, a1: Math.PI });   // garde-boue enveloppants, bord roulé
  // grand pare-brise fumé enveloppant posé sur la face avant bombée + visière peinte au-dessus
  k.peauDessus(B, 2.55, 3.2, 0.95, o.verre, 0.02, 0.88);
  k.peauDessus(B, 2.38, 2.6, 0.62, jaune, 0.035, 0.92);
  // grandes vitres rondes : anneau chromé + verre fumé, collées au flanc (z exact sur la surface)
  const RH = 0.36, YH = 1.66;
  for (const x of [-2.45, -1.58, -0.71, 1.38]) for (const s of [-1, 1]) {
    const za = k.flancAu(B, x, YH - 0.3), zb = k.flancAu(B, x, YH + 0.3), z = s * ((za + zb) / 2 + 0.035), incl = Math.atan2(za - zb, 0.6);
    const t = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(RH, 0.05, 10, 32)), o.chrome); t.position.set(x, YH, z); t.rotation.x = -s * incl; o.ajouter(t);
    const d = new THREE.Mesh(ctx.garde(new THREE.CircleGeometry(RH, 32)), o.verre); d.position.set(x, YH, z); d.rotation.set(-s * incl, s < 0 ? Math.PI : 0, 0, 'YXZ'); o.ajouter(d);
  }
  // flancs : porte coulissante, vitre de cabine (verre fumé), filet orange bas de caisse
  k.drapeFlancs(B, -3.2, 3.2, 0.4, 2.42, (g, w, h, c, M) => {
    g.strokeStyle = '#c99a10'; g.lineWidth = 4; g.strokeRect(M.X(0.0), M.Y(2.2), M.S(0.82), M.Sy(1.52));
    g.fillStyle = '#b48a0e'; g.fillRect(M.X(0.64), M.Y(1.4), M.S(0.1), M.Sy(0.22));
    g.fillStyle = '#1c2230'; g.beginPath(); g.moveTo(M.X(2.0), M.Y(1.62)); g.lineTo(M.X(2.62), M.Y(1.62)); g.quadraticCurveTo(M.X(2.8), M.Y(1.95), M.X(2.72), M.Y(2.18)); g.lineTo(M.X(2.08), M.Y(2.18)); g.quadraticCurveTo(M.X(1.98), M.Y(2.18), M.X(1.98), M.Y(2.05)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(M.X(2.1), M.Y(2.12), M.S(0.42), M.Sy(0.05));
    g.fillStyle = '#ff8a1c'; g.fillRect(0, M.Y(0.66), w, M.Sy(0.07));
    M.trouer(g, rs);
  }, 1024, 320, 0.024, rs);
  k.drapeDessus(B, -3.0, 2.1, -1.05, 1.05, (g, w, h) => { g.fillStyle = '#ff8a1c'; g.fillRect(0, h * 0.3, w, h * 0.08); g.fillRect(0, h * 0.62, w, h * 0.08); }, 512, 256);
  k.plan(-3.0, k.hautAu(B, -3.0, 0) + 0.02, 0.5, 1.8, 0.06, jaune, 0.12);
  // face avant : phares ronds cerclés, calandre à barrettes, pare-chocs sombre arrondi ; poupe : feux verticaux, pare-chocs
  for (const s of [-1, 1]) {
    k.phareRond(3.36, 1.0, s * 0.62, 0.14, lumBlanche, o.chrome);
    o.boite(0.08, 0.42, 0.14, lumRouge, -3.37, 1.38, s * 0.78);
  }
  for (let i = 0; i < 3; i++) o.boite(0.06, 0.035, 0.6, o.chrome, 3.41, 0.86 + i * 0.065, 0);
  k.ellipsoide(0.18, 0.13, 1.08, sombre, 3.4, 0.66, 0); k.ellipsoide(0.18, 0.13, 1.08, sombre, -3.4, 0.68, 0);
  return { L: 7.0, largeur: 2.56, hauteur: 2.56, xAvant: 3.55, xArriere: -3.55,
    roues: rs.map((r) => ({ ...r, jante: '#e3262f', rayons: 'plein', flanc: null })) };
}

export const GROUPE_7 = { J12: berlineSombre, P01: wedgeNoir, P03: roadsterToile, P04: cabrioletEtoiles, TK01: coupeEscamotable, TK02: coupeBicolore, TK03: berlineAileron, TK04: coupeOr, TK05: minibusHublots };
