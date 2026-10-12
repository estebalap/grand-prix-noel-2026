/**
 * Groupe 9 : H01 (fauteuil roulant de sport high-tech, titane brossé, noir et or) et H12 (locomotive à vapeur noire laquée,
 * cerclages laiton, cheminée évasée, lanterne ambrée, bielles d'accouplement animées).
 * Repère : avant = +x, sol y = 0, z = largeur. Motifs et textes génériques uniquement.
 */
import { outils } from './outils.js';
import { texCapitonne } from '../bolides3d_pieces.js';

/* ------------------------------------------------------------------ aides communes */

/** Texture de métal brossé : stries longues dans le sens u (= le long d'un TubeGeometry). */
function texBrosseLong(THREE) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c4ccd8'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '20,24,32'},${(Math.random() * 0.16).toFixed(3)})`;
    g.fillRect(Math.random() * 512, Math.random() * 128, 40 + Math.random() * 260, 1);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

/** Fabrique d'aides géométriques liées au contexte (tubes, barres, maillages, symétrie). */
function aides(ctx) {
  const { THREE, chassis, garde } = ctx;
  const V3 = (p) => new THREE.Vector3(p[0], p[1], p[2]);
  const mesh = (g, m, x = 0, y = 0, z = 0, parent = chassis) => { const o = new THREE.Mesh(garde(g), m); o.position.set(x, y, z); parent.add(o); return o; };
  /** Tube lisse le long d'une courbe Catmull-Rom 3D, extrémités fermées par des rotules sphériques. */
  const tube = (pts, r, m, seg = 64) => {
    const c = new THREE.CatmullRomCurve3(pts.map(V3), false, 'catmullrom', 0.4);
    mesh(new THREE.TubeGeometry(c, seg, r, 14, false), m);
    for (const p of [pts[0], pts[pts.length - 1]]) mesh(new THREE.SphereGeometry(r * 1.02, 14, 10), m, p[0], p[1], p[2]);
    return c;
  };
  /** Barre droite entre deux points (cylindre orienté). */
  const barre = (a, b, r, m, parent = chassis) => {
    const A = V3(a), d = V3(b).sub(A), L = d.length();
    const o = mesh(new THREE.CylinderGeometry(r, r, L, 14), m, 0, 0, 0, parent);
    o.position.copy(A).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return o;
  };
  /** Symétrie : appelle f(s) pour s = −1 et +1. */
  const deuxCotes = (f) => { for (const s of [-1, 1]) f(s); };
  return { V3, mesh, tube, barre, deuxCotes };
}

/** UV d'une ShapeGeometry ramenées dans [0,1] d'après sa boîte englobante ; miroir = u inversé (lecture depuis −z). */
function uvBoite(g, miroir = false) {
  g.computeBoundingBox();
  const b = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) - b.min.x) / (b.max.x - b.min.x), v = (p.getY(i) - b.min.y) / (b.max.y - b.min.y);
    uv.setXY(i, miroir ? 1 - u : u, v);
  }
  uv.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------------ H01 : fauteuil roulant de sport high-tech */
function fauteuilSport(ctx) {
  const { THREE, lumRouge, envMap, garde } = ctx, o = outils(ctx);
  const { mesh, tube, barre, deuxCotes } = aides(ctx);

  /* matériaux : titane brossé, cuir capitonné noir à fil d'or, or verni, graphite, écran cyan */
  const titane = garde(new THREE.MeshStandardMaterial({ color: o.lin('#94a3b8'), map: garde(texBrosseLong(THREE)), roughness: 0.34, metalness: 0.88, envMap, envMapIntensity: 1.1 }));
  const texCuir = garde(texCapitonne(THREE, '#141519', '#d4a017')); texCuir.repeat.set(0.75, 0.75);
  const cuir = garde(new THREE.MeshStandardMaterial({ map: texCuir, roughness: 0.85, metalness: 0.0, envMap, envMapIntensity: 0.35 }));
  const cuirUni = garde(new THREE.MeshStandardMaterial({ color: o.lin('#17181d'), roughness: 0.85, metalness: 0.0, envMap, envMapIntensity: 0.35 }));
  const or = o.lac('#d4a017', 0.26, 0.75);
  const noir = o.lac('#15161a', 0.3, 0.35);
  const graphite = o.mat('#2a2d34', 0.55, 0.45);
  const caoutchouc = o.mat('#0c0d10', 0.9, 0.0);
  const ledCyan = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#06b6d4'), toneMapped: false }));

  /* géométrie de référence */
  const RWg = 1.15, xG = -0.85, zG = 1.22, epG = 0.26;          // grandes roues arrière (fines, main courante)
  const RWc = 0.3, xC = 2.05, zC = 0.82, epC = 0.18;            // roulettes avant pivotantes
  const rT = 0.055;                                             // rayon des tubes principaux

  /* ---- châssis tubulaire cintré : longerons en « V » qui plongent vers le repose-pieds */
  deuxCotes((s) => {
    const S = (pts) => pts.map(([x, y, z]) => [x, y, z * s]);
    tube(S([[-1.45, 1.25, 0.95], [-0.85, 1.11, 0.95], [0.4, 1.08, 0.95], [1.3, 0.98, 0.86], [1.9, 0.8, 0.68], [2.45, 0.5, 0.55]]), rT, titane);
    // montant de dossier : remonte du longeron, s'incline vers l'arrière et finit en poignée de poussée
    tube(S([[-1.45, 1.25, 0.93], [-1.55, 1.9, 0.9], [-1.68, 2.6, 0.88], [-1.84, 2.84, 0.88], [-2.06, 2.88, 0.88]]), rT * 0.95, titane);
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 16), caoutchouc, -2.1, 2.88, 0.88 * s).rotation.z = Math.PI / 2;   // poignée gainée
    // accoudoir tubulaire : part du montant, file vers l'avant, redescend sur le longeron
    tube(S([[-1.6, 2.0, 0.9], [-0.9, 2.04, 0.95], [0.3, 2.0, 0.95], [0.58, 1.72, 0.95], [0.55, 1.12, 0.95]]), rT * 0.85, titane);
    // manchette d'accoudoir en cuir (au-dessus du tube, en retrait de la face intérieure de la roue)
    const pad = o.profil([[-1.25, 2.07], [0.2, 2.06], [0.32, 2.12], [0.2, 2.2], [-1.25, 2.2]], 0.15, cuirUni, { galbe: { avant: 0.15, arriere: 0.15, fruit: 0.02, bombe: 0.03 }, biseau: 0.035 });
    pad.position.z = 0.95 * s;
    // platine d'essieu + fusée de la grande roue (fixe, au centre du moyeu)
    o.boite(0.42, 0.5, 0.06, titane, xG, 1.12, 0.97 * s);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 16), titane, xG, RWg, 1.07 * s).rotation.x = Math.PI / 2;
    // bras anti-bascule arrière avec petit galet doré (ne touche pas le sol)
    barre([-1.2, 1.18, 0.62 * s], [-2.3, 0.48, 0.62 * s], 0.035, titane);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20), or, -2.33, 0.45, 0.62 * s).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), titane, -2.33, 0.45, 0.62 * s).rotation.x = Math.PI / 2;
    // garde-boue latéral noir à frise d'étoiles dorées (entre l'assise et la roue)
    const sh = new THREE.Shape();
    sh.moveTo(-1.42, 1.17); sh.lineTo(0.33, 1.17); sh.quadraticCurveTo(0.42, 1.55, 0.25, 1.92); sh.lineTo(-1.32, 1.95); sh.quadraticCurveTo(-1.5, 1.6, -1.42, 1.17);
    const gG = uvBoite(new THREE.ShapeGeometry(sh, 16), s < 0);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g2 = cv.getContext('2d');
    g2.fillStyle = '#121317'; g2.fillRect(0, 0, 512, 256);
    g2.strokeStyle = '#d4a017'; g2.lineWidth = 10; g2.strokeRect(10, 10, 492, 236);
    const etoile = (cx, cy, r) => { g2.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; g2.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } g2.closePath(); g2.fill(); };
    g2.fillStyle = '#f2d36b'; for (let i = 0; i < 7; i++) etoile(48 + i * 70, 44, 17);
    g2.fillStyle = '#d4a017'; g2.fillRect(30, 120, 452, 14);
    g2.fillStyle = '#f2d36b'; g2.font = '900 58px Arial Black, Arial, sans-serif'; g2.textAlign = 'center'; g2.fillText('22', 256, 220);
    const tG = garde(new THREE.CanvasTexture(cv)); tG.encoding = THREE.sRGBEncoding; tG.anisotropy = 8;
    const mG = garde(new THREE.MeshStandardMaterial({ map: tG, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide, envMap, envMapIntensity: 0.6 }));
    mesh(gG, mG, 0, 0, 1.035 * s);
    // fourche de roulette : boîtier de pivot, potence, té et deux bras de part et d'autre de la roulette
    barre([2.2, 0.66, 0.62 * s], [2.2, 0.8, 0.78 * s], 0.04, titane);              // bras de liaison longeron → boîtier
    mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 18), noir, 2.2, 0.86, zC * s);
    mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 18), or, 2.2, 1.02, zC * s);
    barre([2.2, 0.72, zC * s], [2.2, 0.66, zC * s], 0.03, titane);
    o.boite(0.26, 0.04, 0.34, noir, 2.12, 0.66, zC * s);
    for (const d of [-1, 1]) barre([2.08, 0.66, (zC + d * 0.135) * s], [xC, RWc, (zC + d * 0.135) * s], 0.024, noir);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 10), titane, xC, RWc, zC * s).rotation.x = Math.PI / 2;
  });
  // traverses du châssis (arrière sous l'assise, milieu, avant, repose-pieds)
  for (const [x, y] of [[-1.2, 1.18], [0.3, 1.08], [0.55, 1.12]]) barre([x, y, -0.95], [x, y, 0.95], 0.045, titane);
  barre([2.45, 0.46, -0.55], [2.45, 0.46, 0.55], 0.045, titane);

  /* ---- repose-pieds incliné : plateau noir à picots dorés, nez relevé */
  const rp = new THREE.Group(); rp.position.set(2.52, 0.53, 0); rp.rotation.z = -0.32; ctx.chassis.add(rp);
  mesh(new THREE.BoxGeometry(0.62, 0.06, 1.0), noir, 0, 0, 0, rp);
  for (let i = 0; i < 4; i++) for (let j = -3; j <= 3; j++) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.035, 8), or, -0.22 + i * 0.15, 0.045, j * 0.13, rp);
  mesh(new THREE.BoxGeometry(0.05, 0.14, 1.0), or, 0.3, 0.06, 0, rp);

  /* ---- siège baquet capitonné : assise creusée, bourrelets latéraux, dossier enveloppant */
  o.profil([[-1.3, 1.17], [0.42, 1.17], [0.6, 1.27], [0.56, 1.47], [0.3, 1.42], [-1.3, 1.4]], 1.5, cuir, { galbe: { avant: 0.12, arriere: 0.04, fruit: 0.04, bombe: -0.03 }, biseau: 0.07 });
  deuxCotes((s) => {
    const b = mesh(new THREE.SphereGeometry(1, 28, 14), cuirUni, -0.4, 1.5, 0.74 * s); b.scale.set(0.95, 0.13, 0.1);
    const w = o.profil([[-1.46, 1.42], [-1.05, 1.46], [-1.2, 2.25], [-1.55, 2.45]], 0.12, cuirUni, { galbe: { avant: 0.05, arriere: 0.05, fruit: 0, bombe: 0 }, biseau: 0.05 });
    w.position.z = 0.7 * s;
  });
  o.profil([[-1.48, 1.38], [-1.28, 1.4], [-1.44, 2.62], [-1.66, 2.62]], 1.4, cuir, { galbe: { avant: 0.04, arriere: 0.06, fruit: 0.05, bombe: -0.04 }, biseau: 0.08 });
  o.boite(0.06, 1.1, 1.2, graphite, -1.68, 2.0, 0).rotation.z = 0.14;            // coque arrière du dossier
  // petite dérive noire à liseré or au sommet du dossier (accent des photos)
  const der = new THREE.Shape(); der.moveTo(0, 0); der.lineTo(0.32, 0); der.lineTo(0.02, 0.42); der.closePath();
  const dg = new THREE.ExtrudeGeometry(der, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }); dg.translate(0, 0, -0.03);
  mesh(dg, noir, -1.98, 2.7, 0).rotation.z = 0.12;
  o.boite(0.24, 0.02, 0.6, or, -1.56, 2.71, 0);

  /* ---- bloc batterie sous l'assise : caisson graphite, ailettes, bornes dorées, témoin de charge cyan */
  o.profil([[-1.05, 0.55], [0.3, 0.55], [0.38, 0.7], [0.38, 0.98], [-1.05, 0.98]], 1.1, graphite, { galbe: { avant: 0.05, arriere: 0.03, fruit: 0.02, bombe: 0.0 }, biseau: 0.05 });
  for (let i = 0; i < 6; i++) o.boite(0.04, 0.3, 1.22, noir, -0.9 + i * 0.2, 0.76, 0);
  deuxCotes((s) => {
    o.boite(0.12, 0.2, 0.06, titane, -0.85, 1.06, 0.6 * s); o.boite(0.12, 0.2, 0.06, titane, 0.15, 1.06, 0.6 * s);   // sangles de fixation
    o.boite(1.0, 0.06, 0.02, or, -0.4, 0.92, 0.63 * s);
    for (let i = 0; i < 4; i++) o.boite(0.08, 0.04, 0.02, ledCyan, -0.75 + i * 0.12, 0.64, 0.63 * s);
  });
  for (const z of [-0.25, 0.25]) o.cyl(0.05, 0.05, 0.08, or, 0.2, 1.03, z);
  // veilleuses arrière de sécurité (pilotées par le jeu)
  for (const z of [-0.4, 0.4]) mesh(new THREE.BoxGeometry(0.04, 0.06, 0.2), lumRouge, -1.13, 0.78, z);

  /* ---- pupitre de commande sur l'accoudoir droit (côté −z) : joystick et mini-écran cyan */
  const zP = -0.95;
  o.profil([[0.12, 2.18], [0.62, 2.18], [0.7, 2.26], [0.6, 2.36], [0.12, 2.36]], 0.24, noir, { galbe: { avant: 0.2, arriere: 0.1, fruit: 0.02, bombe: 0.02 }, biseau: 0.04 }).position.z = zP;
  o.boite(0.44, 0.015, 0.2, or, 0.38, 2.4, zP);
  o.cyl(0.06, 0.07, 0.04, caoutchouc, 0.52, 2.42, zP);                          // soufflet
  o.cyl(0.022, 0.026, 0.2, titane, 0.52, 2.52, zP, 0, -0.15);                   // tige de joystick
  const pom = mesh(new THREE.SphereGeometry(0.065, 18, 12), noir, 0.535, 2.63, zP); pom.scale.set(1, 1.15, 1);
  mesh(new THREE.SphereGeometry(0.022, 10, 8), or, 0.555, 2.7, zP);
  // écran incliné vers l'utilisateur (cadre noir + dalle cyan émissive + jauges)
  const ec = new THREE.Group(); ec.position.set(0.24, 2.49, zP); ec.rotation.z = -0.75; ctx.chassis.add(ec);
  mesh(new THREE.BoxGeometry(0.03, 0.2, 0.22), noir, 0, 0, 0, ec);
  const cvE = document.createElement('canvas'); cvE.width = 128; cvE.height = 128; const gE = cvE.getContext('2d');
  gE.fillStyle = '#06b6d4'; gE.fillRect(0, 0, 128, 128);
  gE.fillStyle = '#033b46'; gE.fillRect(14, 92, 100, 12); gE.fillStyle = '#e8fdff'; gE.fillRect(14, 92, 70, 12);
  gE.strokeStyle = '#033b46'; gE.lineWidth = 6; gE.beginPath(); gE.arc(64, 74, 42, Math.PI * 1.1, Math.PI * 1.9); gE.stroke();
  gE.fillStyle = '#033b46'; gE.font = 'bold 30px Arial'; gE.textAlign = 'center'; gE.fillText('88', 64, 70);
  const tE = garde(new THREE.CanvasTexture(cvE)); tE.encoding = THREE.sRGBEncoding; tE.repeat.x = -1; tE.offset.x = 1;   // lisible depuis le siège
  const dalle = mesh(new THREE.PlaneGeometry(0.17, 0.15), garde(new THREE.MeshBasicMaterial({ map: tE, toneMapped: false })), -0.018, 0, 0, ec);
  dalle.rotation.y = -Math.PI / 2;

  return {
    L: 5.3, largeur: 2.0, hauteur: 2.95, xAvant: 2.85, xArriere: -2.45,
    roues: [
      // grandes roues arrière : fines, dix rayons noirs, flanc or, main courante chromée qui tourne avec la roue
      { x: xG, RW: RWg, ep: epG, z: zG, y: RWg, avant: false, fin: true, jante: '#1c1e24', rayons: 'dix', flanc: '#a87c12', sansFrein: true, main: true },
      // roulettes avant pivotantes sur fourche
      { x: xC, RW: RWc, ep: epC, z: zC, y: RWc, avant: true, fin: true, jante: '#1c1e24', rayons: 'cinq', flanc: '#d4a017', sansFrein: true },
    ],
    jante: '#1c1e24', flanc: '#d4a017',
  };
}

/* ------------------------------------------------------------------ H12 : locomotive à vapeur noire laquée */
function locomotive(ctx) {
  const { THREE, lumRouge, animes, envMap, garde } = ctx, o = outils(ctx);
  const { mesh, barre, deuxCotes } = aides(ctx);

  /* matériaux */
  const noirL = o.lac('#121317', 0.18, 0.3);                    // noir laqué de la chaudière et de la cabine
  const noirM = o.mat('#0d0e12', 0.65, 0.3);                    // longerons, châssis
  const rouge = o.lac('#c8372d', 0.3, 0.2);
  const laiton = o.lac('#d97706', 0.22, 0.85);
  const chr = o.chrome;
  const acier = o.mat('#9aa3ad', 0.3, 0.9);
  const interieur = o.mat('#1d1f24', 0.8, 0.1);
  const visiereMat = o.lac('#121317', 0.18, 0.3); visiereMat.side = THREE.DoubleSide;
  const lanterneMat = garde(new THREE.MeshStandardMaterial({ color: o.lin('#ffc46b'), emissive: o.lin('#ff9f2e'), emissiveIntensity: 1.1, roughness: 0.25, metalness: 0.0, envMap, envMapIntensity: 0.4 }));

  /* géométrie de référence */
  const RW = 0.85, xR = -1.5, xF = 0.6, zR = 1.05, ep = 0.45;   // deux essieux moteurs couplés (4 grandes roues)
  const yC = 2.6, rC = 0.86;                                     // axe et rayon de la chaudière
  const zB = zR + ep / 2 + 0.05;                                 // plan de la bielle d'accouplement (hors pneu)
  const zM = zB + 0.09;                                          // plan de la bielle motrice et des cylindres
  const e = 0.35 * RW;                                           // excentrique des manetons

  /* ---- châssis : longerons noirs entre les roues, caissons, tablier, traverses tampons */
  o.boite(5.4, 0.62, 1.2, noirM, 0.3, 1.25, 0);                                // longerons (voie intérieure des roues : 0,83)
  o.boite(1.1, 0.75, 2.1, noirM, -2.95, 1.25, 0);                              // caisson arrière sous la cabine (derrière la roue)
  o.boite(1.15, 0.65, 2.0, noirM, 2.9, 1.25, 0);                               // caisson avant (devant la roue)
  o.boite(6.85, 0.08, 2.4, noirM, -0.08, 1.9, 0);                              // tablier au-dessus des roues
  deuxCotes((s) => {
    o.boite(6.85, 0.14, 0.04, rouge, -0.08, 1.83, 1.2 * s);
    o.boite(6.85, 0.025, 0.045, laiton, -0.08, 1.92, 1.205 * s);
  });
  // traverses tampons rouges + tampons chromés
  o.boite(0.18, 0.5, 2.3, rouge, 3.55, 1.15, 0);
  o.boite(0.18, 0.5, 2.3, rouge, -3.55, 1.15, 0);
  for (const z of [-0.75, 0.75]) for (const x of [1, -1]) {
    o.cyl(0.07, 0.07, 0.22, acier, 3.75 * x, 1.15, z, 0, Math.PI / 2, 14);
    o.cyl(0.15, 0.15, 0.05, chr, 3.88 * x, 1.15, z, 0, Math.PI / 2, 24);
  }
  // chasse-pierres : lames inclinées en éventail sous la traverse avant
  const cp = new THREE.Shape(); cp.moveTo(0, 0); cp.lineTo(0.62, 0); cp.lineTo(0, 0.68); cp.closePath();
  for (let i = -4; i <= 4; i++) {
    const g = new THREE.ExtrudeGeometry(cp, { depth: 0.06, bevelEnabled: false }); g.translate(0, 0, -0.03);
    mesh(g, noirL, 3.5, 0.22, i * 0.24).rotation.y = -i * 0.07;
  }
  o.boite(0.08, 0.06, 2.1, rouge, 3.55, 0.88, 0);
  o.boite(0.08, 0.07, 2.3, rouge, 4.06, 0.26, 0);                               // lisse basse qui relie les pointes du chasse-pierres

  /* ---- chaudière : cylindre noir laqué, 3 cerclages laiton, boîte à fumée, porte avant bombée */
  mesh(new THREE.CylinderGeometry(rC, rC, 3.9, 48), noirL, 0.75, yC, 0).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(rC + 0.05, rC + 0.05, 0.75, 48), noirM, 3.05, yC, 0).rotation.z = Math.PI / 2;
  const porte = mesh(new THREE.SphereGeometry(rC + 0.05, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), noirL, 3.42, yC, 0); porte.rotation.z = -Math.PI / 2; porte.scale.set(1, 0.28, 1);
  mesh(new THREE.TorusGeometry(rC + 0.05, 0.035, 10, 48), chr, 3.43, yC, 0).rotation.y = Math.PI / 2;
  for (const x of [-0.95, 0.55, 2.05]) mesh(new THREE.TorusGeometry(rC + 0.012, 0.045, 12, 56), laiton, x, yC, 0).rotation.y = Math.PI / 2;
  o.boite(4.0, 0.42, 1.3, noirM, 0.7, 2.05, 0);                                // berceau de la chaudière
  deuxCotes((s) => o.boite(3.6, 0.035, 0.03, rouge, 0.65, 2.32, 0.825 * s));     // filets rouges

  /* ---- cheminée ÉVASÉE (profil de révolution : pied élargi, fût cintré, couronne en trompette) */
  const prof = [[0.0, 0.0], [0.36, 0.0], [0.3, 0.08], [0.22, 0.2], [0.2, 0.42], [0.22, 0.6], [0.3, 0.74], [0.42, 0.84], [0.44, 0.9], [0.34, 0.9], [0.3, 0.86], [0.0, 0.86]];
  const yChem = yC + rC - 0.06;
  mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40), noirL, 3.05, yChem, 0);
  mesh(new THREE.TorusGeometry(0.42, 0.03, 10, 40), laiton, 3.05, yChem + 0.88, 0).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 32), interieur, 3.05, yChem + 0.83, 0);

  /* ---- dôme laiton, sifflet, quatre coupelles chromées (accent des photos) */
  mesh(new THREE.SphereGeometry(0.3, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), laiton, 2.38, yC + rC - 0.05, 0).scale.set(1, 1.15, 1);
  mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.22, 28), laiton, 2.38, yC + rC - 0.02, 0);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10), laiton, -1.1, yC + rC + 0.12, 0);
  mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.16, 14), laiton, -1.1, yC + rC + 0.33, 0);
  for (const x of [-0.5, 0.0, 1.05, 1.55]) {
    mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 32), chr, x, yC + rC + 0.02, 0);
    mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 32), chr, x, yC + rC + 0.12, 0).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 28), interieur, x, yC + rC + 0.115, 0);
  }

  /* ---- lanterne avant ambrée douce (au centre de la porte de boîte à fumée) */
  const lanterne = new THREE.Group(); lanterne.position.set(3.72, yC + 0.05, 0); ctx.chassis.add(lanterne);
  mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.24, 28), laiton, 0, 0, 0, lanterne).rotation.z = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.21, 24, 14), lanterneMat, 0.11, 0, 0, lanterne).scale.set(0.55, 1, 1);
  mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.2, 28, 1, true, 0, Math.PI), visiereMat, 0.12, 0.02, 0, lanterne).rotation.z = Math.PI / 2;
  const halo = mesh(new THREE.CircleGeometry(0.36, 32), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9f2e'), transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })), 0.2, 0, 0, lanterne);
  halo.rotation.y = Math.PI / 2;
  animes.push((t) => { lanterneMat.emissiveIntensity = 1.0 + 0.08 * Math.sin(t * 3.1); });   // lueur qui respire doucement
  for (const dy of [-0.42, 0.42]) o.boite(0.03, 0.05, 0.7, laiton, 3.63, yC + dy, 0);           // charnières de la porte

  /* ---- cabine arrière : parois découpées (fenêtres), toit débordant cintré, intérieur visible */
  const xc0 = -3.45, xc1 = -1.2, yc0 = 1.92, yc1 = 3.55, demiL = 1.08;
  const trou = (x0, y0, x1, y1, r) => { const h = new THREE.Path(); h.moveTo(x0 + r, y0); h.lineTo(x1 - r, y0); h.quadraticCurveTo(x1, y0, x1, y0 + r); h.lineTo(x1, y1 - r); h.quadraticCurveTo(x1, y1, x1 - r, y1); h.lineTo(x0 + r, y1); h.quadraticCurveTo(x0, y1, x0, y1 - r); h.lineTo(x0, y0 + r); h.quadraticCurveTo(x0, y0, x0 + r, y0); return h; };
  const flanc = new THREE.Shape();
  flanc.moveTo(xc0, yc0); flanc.lineTo(xc1, yc0); flanc.lineTo(xc1, yc1); flanc.lineTo(xc0, yc1); flanc.closePath();
  flanc.holes.push(trou(-3.2, 2.75, -2.55, 3.3, 0.08), trou(-2.3, 2.75, -1.45, 3.3, 0.08));
  deuxCotes((s) => {
    const g = new THREE.ExtrudeGeometry(flanc, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -0.05); mesh(g, noirL, 0, 0, demiL * s);
    o.boite(2.25, 0.04, 0.03, rouge, (xc0 + xc1) / 2, 2.62, (demiL + 0.07) * s);   // filet rouge sous les fenêtres
    o.boite(2.25, 0.05, 0.03, laiton, (xc0 + xc1) / 2, 3.42, (demiL + 0.07) * s);  // jonc laiton au-dessus
    o.boite(0.4, 0.05, 0.25, acier, -3.1, 1.62, 1.12 * s);                          // marchepied (derrière la roue)
    barre([-3.38, 2.05, 1.19 * s], [-3.38, 2.6, 1.19 * s], 0.025, laiton);          // main montoire
  });
  // façade avant de cabine (côté chaudière) : deux hublots ronds au-dessus de la chaudière
  const avant = new THREE.Shape(); avant.moveTo(-demiL, yc0); avant.lineTo(demiL, yc0); avant.lineTo(demiL, yc1); avant.lineTo(-demiL, yc1); avant.closePath();
  for (const z of [-0.75, 0.75]) { const h = new THREE.Path(); h.absarc(z, 3.3, 0.15, 0, Math.PI * 2, true); avant.holes.push(h); }
  const ga = new THREE.ExtrudeGeometry(avant, { depth: 0.08, bevelEnabled: false, curveSegments: 20 }); ga.translate(0, 0, -0.04);
  mesh(ga, noirL, xc1 - 0.04, 0, 0).rotation.y = Math.PI / 2;
  for (const z of [-0.75, 0.75]) mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 28), laiton, xc1 + 0.01, 3.3, z).rotation.y = Math.PI / 2;
  // façade arrière : grande baie
  const arr = new THREE.Shape(); arr.moveTo(-demiL, yc0); arr.lineTo(demiL, yc0); arr.lineTo(demiL, yc1); arr.lineTo(-demiL, yc1); arr.closePath();
  arr.holes.push(trou(-0.8, 2.75, 0.8, 3.3, 0.1));
  const gr = new THREE.ExtrudeGeometry(arr, { depth: 0.08, bevelEnabled: false, curveSegments: 8 }); gr.translate(0, 0, -0.04);
  mesh(gr, noirL, xc0 + 0.04, 0, 0).rotation.y = Math.PI / 2;
  // intérieur : plancher, façade de foyer avec manomètres laiton
  o.boite(2.1, 0.06, 2.0, interieur, (xc0 + xc1) / 2, yc0 + 0.03, 0);
  o.boite(0.08, 1.2, 1.3, noirM, xc1 - 0.15, 2.6, 0);
  for (const z of [-0.3, 0.3]) mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), laiton, xc1 - 0.2, 2.95, z).rotation.z = Math.PI / 2;
  o.boite(0.2, 0.3, 0.3, laiton, xc1 - 0.25, 2.3, 0);
  // toit cintré débordant : section en arc extrudée le long de x, gouttières laiton
  const Rr = 3.2, aT = 0.41, yToit = yc1 + 0.1 + Rr * (1 - Math.cos(aT)), ep2 = 0.08;
  const st = new THREE.Shape();
  st.absarc(0, yToit - Rr, Rr, Math.PI / 2 - aT, Math.PI / 2 + aT, false);
  st.absarc(0, yToit - Rr, Rr - ep2, Math.PI / 2 + aT, Math.PI / 2 - aT, true);
  const gt = new THREE.ExtrudeGeometry(st, { depth: 2.75, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 24 }); gt.translate(0, 0, -1.375);
  mesh(gt, noirL, (xc0 + xc1) / 2 - 0.05, 0, 0).rotation.y = Math.PI / 2;
  o.boite(2.3, 0.1, 2.2, noirM, (xc0 + xc1) / 2, yc1 + 0.03, 0);               // ceinture sous le toit
  deuxCotes((s) => o.boite(2.75, 0.04, 0.05, laiton, (xc0 + xc1) / 2 - 0.05, yc1 + 0.1, 1.27 * s));
  // feux arrière rouges (pilotés par le jeu) sur le caisson arrière
  for (const z of [-0.8, 0.8]) mesh(new THREE.SphereGeometry(0.1, 16, 10), lumRouge, -3.52, 1.48, z).scale.set(0.5, 1, 1);

  /* ---- plaque de numéro laiton sur la cabine */
  o.decalFlanc((g, w, h) => {
    g.fillStyle = '#d97706'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1208'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#f3b54a'; g.font = '900 120px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('700', w / 2, h / 2 + 6);
  }, 0.78, 0.36, -2.85, 2.3, demiL + 0.075, 512, 236);

  /* ---- mécanique de chaque côté : cylindres, glissières, crosse, bielle motrice et bielle d'accouplement ANIMÉES */
  const xCyl0 = 2.28, xCyl1 = 3.3, Lm = 1.3;                            // corps de cylindre (x) et longueur de bielle motrice
  const cotes = [];
  // contrepoids en croissant (géométrie partagée), opposés aux manetons
  const cw = new THREE.Shape(); cw.absarc(0, 0, 0.55, Math.PI * 0.7, Math.PI * 1.3, false); cw.absarc(0, 0, 0.22, Math.PI * 1.3, Math.PI * 0.7, true);
  const cwg = garde(new THREE.ExtrudeGeometry(cw, { depth: 0.03, bevelEnabled: false, curveSegments: 16 }));
  deuxCotes((s) => {
    // cylindre à vapeur extérieur : corps chromé, couvercles noirs, boîte à tiroir, conduite vers le châssis
    mesh(new THREE.CylinderGeometry(0.28, 0.28, xCyl1 - xCyl0, 28), chr, (xCyl0 + xCyl1) / 2, RW, zM * s).rotation.z = Math.PI / 2;
    for (const x of [xCyl0, xCyl1]) mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 28), noirM, x, RW, zM * s).rotation.z = Math.PI / 2;
    o.boite(xCyl1 - xCyl0 - 0.1, 0.2, 0.34, noirM, (xCyl0 + xCyl1) / 2, RW + 0.38, zM * s);
    o.boite(0.6, 0.35, 0.42, noirM, (xCyl0 + xCyl1) / 2, RW + 0.12, 1.0 * s);
    // glissières de crosse (deux barres) entre la roue avant et le cylindre + support
    for (const dy of [-0.13, 0.13]) o.boite(xCyl0 - 1.5, 0.04, 0.05, acier, (xCyl0 + 1.5) / 2, RW + dy, zM * s);
    o.boite(0.06, 0.38, 0.12, noirM, 1.52, RW, zM * s);
    barre([1.52, RW + 0.19, zM * s], [1.52, 1.86, zM * s], 0.03, noirM);                // suspente vers le tablier

    // éléments mobiles (dans le châssis, repositionnés à chaque image)
    const Lb = xF - xR;
    const bielle = new THREE.Group(); ctx.chassis.add(bielle);
    mesh(new THREE.BoxGeometry(Lb, 0.1, 0.05), acier, Lb / 2, 0, 0, bielle);           // barre (origine = maneton arrière)
    for (const x of [0, Lb]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 20), acier, x, 0, 0, bielle).rotation.x = Math.PI / 2;
    const lp = zM + 0.05 - (zR + 0.08);
    const manetons = [xR, xF].map((x) => { const m = mesh(new THREE.CylinderGeometry(0.055, 0.055, lp, 14), chr, x, RW, 0); m.rotation.x = Math.PI / 2; return m; });
    const contrepoids = [xR, xF].map((x) => mesh(cwg, rouge, x, RW, (zR + 0.06) * s - (s < 0 ? 0.03 : 0)));
    const motrice = new THREE.Group(); ctx.chassis.add(motrice);
    mesh(new THREE.BoxGeometry(Lm, 0.09, 0.05), chr, Lm / 2, 0, 0, motrice);
    for (const x of [0, Lm]) mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 18), chr, x, 0, 0, motrice).rotation.x = Math.PI / 2;
    const crosse = mesh(new THREE.BoxGeometry(0.24, 0.2, 0.09), noirM, 0, RW, zM * s);
    const tige = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 12), acier, 0, RW, zM * s); tige.rotation.z = Math.PI / 2;
    cotes.push({ s, bielle, manetons, contrepoids, motrice, crosse, tige, dephasage: s > 0 ? 0 : Math.PI / 2 });   // calage à 90° gauche/droite
  });
  let phi = 0.6;
  const placer = () => {
    for (const c of cotes) {
      const p = phi + c.dephasage, ex = e * Math.cos(p), ey = e * Math.sin(p);
      // bielle d'accouplement : translation circulaire, toujours horizontale, à l'extérieur des pneus
      c.bielle.position.set(xR + ex, RW + ey, zB * c.s);
      c.manetons.forEach((m, i) => m.position.set((i ? xF : xR) + ex, RW + ey, ((zR + 0.08 + zM + 0.05) / 2) * c.s));
      c.contrepoids.forEach((m) => { m.rotation.z = p; });
      // bielle motrice : du maneton avant à la crosse qui coulisse sur l'axe des cylindres (système bielle-manivelle)
      const px = xF + ex, py = RW + ey, xx = px + Math.sqrt(Lm * Lm - ey * ey);
      c.motrice.position.set(px, py, zM * c.s); c.motrice.rotation.z = Math.atan2(RW - py, xx - px);
      c.crosse.position.x = xx;
      const lt = xCyl0 - xx; c.tige.position.x = xx + lt / 2; c.tige.scale.y = Math.max(0.01, lt);
    }
  };
  placer();
  animes.push((t, dt, v) => { phi -= (v * dt) / RW; placer(); });               // même sens et même vitesse angulaire que les roues

  return {
    L: 8.0, largeur: 2.4, hauteur: 4.35, xAvant: 4.12, xArriere: -3.9,
    // roues de locomotive : acier à boudin (fin: true), pas de pneu boudin — la règle « ≥ 0,65 R » ne s'applique pas
    roues: [
      { x: xR, RW, ep, z: zR, y: RW, avant: false, fin: true, jante: '#24262c', rayons: 'dix', flanc: '#c8372d', sansFrein: true },
      { x: xF, RW, ep, z: zR, y: RW, avant: true, fin: true, jante: '#24262c', rayons: 'dix', flanc: '#c8372d', sansFrein: true },
    ],
    jante: '#24262c', flanc: '#c8372d',
  };
}

export const GROUPE_9 = { H01: fauteuilSport, H12: locomotive };
