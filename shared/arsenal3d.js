/* Arsenal 3D — maquettes procédurales animées des pièges ASSERVIS et MOBILES (Three.js r128, global window.THREE).
   Échelle : 1 unité = 10 mm. La voie est orientée selon +x (sens de la course), la largeur selon z, la hauteur selon y.
   Chaque gréement expose pose(tau) où tau = temps (s) depuis le déclenchement (négatif = armé) : animation déterministe,
   rejouable image par image (utile pour l'aperçu TV et pour les tests). Les dimensions suivent arsenal_pieges.scad. */

const V = 4.6;           // largeur utile d'une voie (46 mm, piste_rainbow_road.scad)
// Ralenti ×40 : le bolide roule à 2,5 m/s réels en ligne droite finale (CIRCUIT_RAINBOW_ROAD : 2,0 à 2,8 m/s),
// soit 250 unités/s réelles -> 6,25 unités/s affichées. Toute la physique est exprimée dans ce temps ralenti :
// g = 981 unités/s² réels -> 981 / 40² ≈ 0,61 unité/s² affichée ; les durées réelles sont multipliées par 40.
// Les instants de déclenchement idéaux en découlent : avance (cm) = vitesse × temps de mise en place du piège.
export const RALENTI = 40;
const G = 981 / (RALENTI * RALENTI);
export const VCAR = 250 / RALENTI;
export const X0 = -36;                 // départ du bolide (36 cm en amont du piège : la Herse s'arme à 27 cm)
const DEMI_BOLIDE = 3.7;
const PAROI = 0.6;       // hauteur de cloison (6 mm)

function mats(THREE) {
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.1, ...o });
  return {
    anth: m(0x3d3f43), gris: m(0x6c7075, { metalness: 0.6, roughness: 0.3 }), argent: m(0xc4c8cd, { metalness: 0.9, roughness: 0.2 }),
    rouge: m(0xc8352e), jaune: m(0xf7c600), blanc: m(0xf1ecdf), bois: m(0xd6c29a, { roughness: 0.8 }), bleu: m(0x2479d0, { metalness: 0.3 }),
    prune: m(0x6e2a4f), dore: m(0xd8a63a, { metalness: 0.8, roughness: 0.25 }), violet: m(0x6b44b6), bonbon: m(0xd3203c, { metalness: 0.4, roughness: 0.2 }),
    acier: m(0xdfe6f2, { metalness: 1, roughness: 0.15 }),
  };
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const box = (THREE, w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (THREE, r1, r2, h, mat, n = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), mat);
const sph = (THREE, r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), mat);

/* Barrière de péage : lisse lestée en bout, assimilée à une masse ponctuelle au bout d'un bras de 43 mm,
   lâchée penchée de 0,5 rad (30°) par la goupille : θ'' = (g/L)·sin θ ; arrêt sur la piste à ≈ 108°. */
function anglePeage(tau) {
  const L = 4.3; let th = 0.5, w = 0, t = 0; const dt = 0.002;   // lisse tenue inclinée à 30° par la goupille
  while (t < tau && th < 1.88) { w += (G / L) * Math.sin(th) * dt; th += w * dt; t += dt; }
  return Math.min(th, 1.88);
}
function chutePeage(cible) { let t = 0; while (anglePeage(t) < cible && t < 5) t += 0.01; return t; }

/* Piste GXX41 (notice) : 5 voies translucides rose, bleu, vert, jaune, orange ; le Grand Prix court sur les 5.
   Cotes de piste_rainbow_road.scad (voie 46, cloison 2,4, entraxe 48,4 mm). La voie VISÉE du labo est la 3
   (verte), centrée sur z = 0. */
export const PISTE = { voie: 4.6, cloison: 0.24, pas: 4.84, nb: 5, paroiExt: 0.24, hLibre: 4.6 };
PISTE.largeur = PISTE.nb * PISTE.voie + (PISTE.nb - 1) * PISTE.cloison;
export const COULEURS_VOIES = [
  { nom: 'rose', hex: 0xff4fa3 }, { nom: 'bleu', hex: 0x3c8dff }, { nom: 'vert', hex: 0x2fd58a },
  { nom: 'jaune', hex: 0xffd23f }, { nom: 'orange', hex: 0xff8a2a }];
export const VOIE_LABO = 3;
export const zVoie = (i) => (i - VOIE_LABO) * PISTE.pas;          // axe de la voie i (1..5) dans le repère du labo

/* Pont des Pièges (9_Validation_Atelier/scad/labo_valide.scad) : poutre de 5 voies posée sur les 2 PAROIS EXTÉRIEURES
   (pieds + talons, rien dans les voies), x de −2,6 à −1,2, dessous à 5,2 ; un chariot pend dans SA voie : rails à
   |z| = 2,025..2,265 depuis y = 1,0, traverse et toit sur la poutre ; axe de pendule à x = 0,5, y = 4,7 ; passage 40,5 × 46 mm. */
const PG = { x0: -2.6, x1: -1.2, z0: 5.2, z1: 6.0, rIn: 2.025, rOut: 2.265, rZ0: 1.0, D: 1.6, xAxe: 0.5, yAxe: 4.7, toit: 6.03 };
PG.Hp = PG.z0;
PG.zOut = PG.rOut;
function pontDesPieges(THREE, M) {
  const g = new THREE.Group();
  const yInt = PISTE.largeur / 2, yPost = yInt + PISTE.paroiExt + 0.035, ep = 0.5, L = PG.x1 - PG.x0, xm = (PG.x0 + PG.x1) / 2;
  const zc = zVoie(3) - zVoie(VOIE_LABO);  // la piste est centrée sur la voie 3 : axe de la piste = z 0
  const poutre = box(THREE, L, PG.z1 - PG.z0, 2 * (yPost + ep), M.anth); poutre.position.set(xm, (PG.z0 + PG.z1) / 2, zc); g.add(poutre);
  for (const s of [-1, 1]) {
    const pied = box(THREE, L, PG.z1 - 0.15, ep, M.anth); pied.position.set(xm, 0.15 + (PG.z1 - 0.15) / 2, zc + s * (yPost + ep / 2)); g.add(pied);
    const talon = box(THREE, L, 0.2, PISTE.paroiExt + 0.035 + ep, M.anth); talon.position.set(xm, PISTE.voie * 0 + 0.7, zc + s * (yInt + (PISTE.paroiExt + 0.035 + ep) / 2)); g.add(talon);
    const gousset = box(THREE, L, PG.z0 - PISTE.hLibre, 0.9, M.anth); gousset.position.set(xm, PISTE.hLibre + (PG.z0 - PISTE.hLibre) / 2, zc + s * (yInt - 0.45 + 0.24)); g.add(gousset);
  }
  // pions d'index jaunes et numéros de voie (couleur de la voie) sur le dessus de la poutre
  for (let i = 1; i <= PISTE.nb; i++) {
    const pion = cyl(THREE, 0.15, 0.15, 0.5, M.jaune, 12); pion.position.set(xm - 0.35, PG.z1 + 0.1, zVoie(i)); g.add(pion);
    const pastille = box(THREE, 0.5, 0.04, 0.9, new THREE.MeshStandardMaterial({ color: COULEURS_VOIES[i - 1].hex, emissive: COULEURS_VOIES[i - 1].hex, emissiveIntensity: 0.6 }));
    pastille.position.set(xm + 0.3, PG.z1 + 0.02, zVoie(i)); g.add(pastille);
  }
  return g;
}
function chariot(THREE, M, voie = VOIE_LABO) {
  const g = new THREE.Group();
  const hRail = PG.toit - PG.rZ0;
  for (const s of [-1, 1]) {
    const r = box(THREE, PG.D, hRail, PG.rOut - PG.rIn, M.anth); r.position.set(0, PG.rZ0 + hRail / 2, s * (PG.rIn + PG.rOut) / 2); g.add(r);
  }
  const trav = box(THREE, 0.8 + 1.17, PG.toit - PG.z0, 2 * PG.rOut, M.anth); trav.position.set((-1.17 + 0.8) / 2, (PG.z0 + PG.toit) / 2, 0); g.add(trav);
  const toit = box(THREE, 0.8 - PG.x0 + 0.1, 0.3, 2 * PG.rOut, M.anth); toit.position.set((0.8 + PG.x0 - 0.1) / 2, PG.toit + 0.15 + 0.03, 0); g.add(toit);
  const c = COULEURS_VOIES[voie - 1].hex;
  const badge = box(THREE, 0.06, 0.7, 1.6, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 }));
  badge.position.set(0.83, 5.6, 0); g.add(badge);
  g.position.z = zVoie(voie);
  return g;
}
function portique(THREE, M) {          // nom historique : renvoie désormais Pont + chariot de la voie visée
  const g = new THREE.Group();
  g.add(pontDesPieges(THREE, M));
  g.add(chariot(THREE, M));
  return g;
}
/* Pendule pesant lâché à A rad (période réelle T s) : angle selon le temps ralenti, légèrement amorti. */
const penduleAngle = (tau, A, T) => (tau < 0 ? A : A * Math.cos(2 * Math.PI * tau / (T * RALENTI)) * Math.exp(-tau * 0.9 / RALENTI));
const T_PENDULE = 2 * Math.PI * Math.sqrt(0.028 / 9.81) * 1.073;     // L = 28 mm, amplitude 60° (correction elliptique)

/* Chaque fiche : arch, impactX (x du centre du bolide au contact), tEffet (temps ralenti entre déclenchement et effet établi),
   reaction du bolide, tolerance {avant, apres} en secondes RÉELLES pour le Défi du timing (défaut ±25 ms),
   build(THREE, M) -> {group, pose(tau)}. Les asservis montés sur le Pont des Pièges suivent les versions validées à l'atelier. */
export const RIGS = {
  herse: {
    arch: 'asservi', reaction: 'crash', impactX: -DEMI_BOLIDE - 0.3, tEffet: 1.1 * Math.sqrt(2 * 4.7 / G),   // grille levée à 47 mm
    tolerance: { avant: 1.0, apres: 0.025 },            // lâchée trop tôt, la grille est déjà fermée : même effet
    build(THREE, M) {
      const g = new THREE.Group();
      g.add(portique(THREE, M));
      const grille = new THREE.Group();
      const W = 4.15;            // g_w : engagée de 0,8 mm dans les rainures des rails
      for (let i = 0; i < 6; i++) { const b = box(THREE, 0.24, 4.0, 0.24, M.gris); b.position.set(0, 2.0, -W / 2 + 0.42 + i * (W - 0.84) / 5); grille.add(b); }
      for (const [y, h] of [[0.35, 0.7], [1.25, 0.3], [3.7, 0.3]]) { const b = box(THREE, 0.24, h, W, M.gris); b.position.y = y; grille.add(b); }
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 8), M.gris); c.rotation.x = Math.PI; c.position.set(0, -0.13, -W / 2 + 0.42 + i * (W - 0.84) / 5); grille.add(c); }
      const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 24), M.gris); anneau.rotation.y = Math.PI / 2; anneau.position.y = 4.35; grille.add(anneau);
      g.add(grille);
      const pin = cyl(THREE, 0.1, 0.1, 2.6, M.bois); pin.rotation.z = Math.PI / 2; pin.position.set(0, 5.6, 0); g.add(pin);
      return { group: g, pose(tau) {
        const fall = tau < 0 ? 0 : clamp(0.5 * G * (tau / 1.1) * (tau / 1.1), 0, 4.7);       // chute libre, frottement de 10 %
        grille.position.y = 4.7 - fall;
        pin.position.x = tau < 0 ? 0 : Math.min(1.6, tau * 6);
      } };
    },
  },
  bascule: {
    // Tremplin : le tablier se relève à 12° tiré par le fil (≈ 0,12 s) puis reste TENU : le tirer tôt ne coûte rien.
    arch: 'asservi', reaction: 'launch', launchAngle: 0.21, impactX: -0.8, tEffet: 0.12 * RALENTI + (-0.8 - (-4.6 - DEMI_BOLIDE)) / VCAR,
    tolerance: { avant: 1.0, apres: 0.03 },
    build(THREE, M) {
      const g = new THREE.Group();
      g.add(portique(THREE, M));
      const base = box(THREE, 5.2, 0.12, V, M.anth); base.position.set(-6.0 + 2.6, 0.06, 0); g.add(base);
      for (const s of [-1, 1]) { const ch = box(THREE, 0.8, 0.52, 0.55, M.anth); ch.position.set(-4.6, 0.26, s * (V / 2 - 0.28)); g.add(ch); }
      const piv = new THREE.Group(); piv.position.set(-4.6, 0.32, 0); g.add(piv);
      const tab = box(THREE, 3.8, 0.22, V - 1.2, M.bois); tab.position.set(1.9, -0.09, 0); piv.add(tab);
      const fil = box(THREE, 0.025, 1, 0.025, M.blanc); g.add(fil);
      return { group: g, pose(tau) {
        const a = tau < 0 ? 0 : ease(tau / (0.12 * RALENTI)) * 0.21;
        piv.rotation.z = a;
        const tipx = -4.6 + 4.1 * Math.cos(a), tipy = 0.32 + 4.1 * Math.sin(a);
        fil.position.set(tipx, (tipy + PG.Hp) / 2, 1.8); fil.scale.y = PG.Hp - tipy;
      } };
    },
  },
  peage: {
    arch: 'asservi', reaction: 'crash', impactX: 0.5 - 0.2 - DEMI_BOLIDE, tEffet: chutePeage(1.0),
    build(THREE, M) {
      const g = new THREE.Group();
      const pot = box(THREE, 0.6, 2.5, 0.9, M.anth); pot.position.set(0, 1.25, -V / 2 - 0.2); g.add(pot);
      const piv = new THREE.Group(); piv.position.set(0.5, 1.4, -V / 2 + 0.14); g.add(piv);
      const lisse = new THREE.Group(); piv.add(lisse);
      for (let i = 0; i < 9; i++) { const s = box(THREE, 0.3, 0.5, 0.48, i % 2 ? M.blanc : M.rouge); s.position.y = 0.25 + i * 0.5; lisse.add(s); }
      return { group: g, pose(tau) {
        // pendule pesant (masse en bout) : θ'' = (3g / 2L)·sin θ ; intégré numériquement jusqu'à la butée (≈ 108°)
        lisse.rotation.x = tau < 0 ? 0.5 : anglePeage(tau);
      } };
    },
  },
  boulet: {
    arch: 'asservi', reaction: 'crash', impactX: PG.xAxe - 1.1 - DEMI_BOLIDE, tEffet: T_PENDULE * RALENTI / 4,
    tolerance: { avant: 0.025, apres: 0.025 },
    build(THREE, M) {
      const g = new THREE.Group();
      g.add(portique(THREE, M));
      const axe = cyl(THREE, 0.1, 0.1, 2 * PG.zOut + 0.4, M.bois); axe.rotation.x = Math.PI / 2; axe.position.set(PG.xAxe, PG.yAxe, 0); g.add(axe);
      for (const z of [-1, 1]) { const e = cyl(THREE, 0.26, 0.26, 1.85, M.anth); e.rotation.x = Math.PI / 2; e.position.set(PG.xAxe, PG.yAxe, z * 1.1); g.add(e); }
      const piv = new THREE.Group(); piv.position.set(PG.xAxe, PG.yAxe, 0); g.add(piv);
      const moyeu = box(THREE, 0.6, 0.8, 0.8, M.jaune); moyeu.position.y = -0.3; piv.add(moyeu);
      const fil = box(THREE, 0.025, 2.0, 0.025, M.blanc); fil.position.y = -1.6; piv.add(fil);
      const b = sph(THREE, 1.1, M.anth); b.position.y = -2.8; piv.add(b);
      return { group: g, pose(tau) { piv.rotation.z = penduleAngle(tau, 1.047, T_PENDULE); } };   // tenu à 60° côté aval
    },
  },
  balancier: {
    arch: 'asservi', reaction: 'spin', impactX: PG.xAxe - 0.8 - DEMI_BOLIDE, tEffet: T_PENDULE * RALENTI / 4,
    tolerance: { avant: 0.025, apres: 0.025 },
    build(THREE, M) {
      const g = new THREE.Group();
      g.add(portique(THREE, M));
      const axe = cyl(THREE, 0.1, 0.1, 2 * PG.zOut + 0.4, M.bois); axe.rotation.x = Math.PI / 2; axe.position.set(PG.xAxe, PG.yAxe, 0); g.add(axe);
      for (const z of [-1, 1]) { const e = cyl(THREE, 0.26, 0.26, 1.85, M.anth); e.rotation.x = Math.PI / 2; e.position.set(PG.xAxe, PG.yAxe, z * 1.1); g.add(e); }
      const piv = new THREE.Group(); piv.position.set(PG.xAxe, PG.yAxe, 0); g.add(piv);
      const bras = box(THREE, 0.4, 2.9, 0.3, M.gris); bras.position.y = -1.45; piv.add(bras);
      const tete = cyl(THREE, 0.66, 0.66, 0.6, M.gris, 6); tete.rotation.x = Math.PI / 2; tete.position.y = -2.8; piv.add(tete);
      const lame = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32, 1, false, Math.PI / 2, Math.PI), M.argent);
      lame.rotation.x = Math.PI / 2; lame.position.y = -3.0; piv.add(lame);
      return { group: g, pose(tau) { piv.rotation.z = penduleAngle(tau, 1.047, T_PENDULE); } };
    },
  },
  oeuf_wyverne: {
    arch: 'mobile', reaction: 'crash', impactX: 1.5 - 1.1 - DEMI_BOLIDE, tEffet: 1.65,   // temps pour que l'œuf atteigne sa place
    build(THREE, M) {
      const g = new THREE.Group();
      const oeuf = sph(THREE, 1.1, M.prune); oeuf.scale.set(1, 1.3, 1); g.add(oeuf);
      return { group: g, pose(tau) { const x = tau < 0 ? -9 : -9 + 4.5 * tau + 1.2 * tau * tau; oeuf.position.set(Math.min(x, 1.5), 1.4, Math.sin(tau * 9) * 0.5); oeuf.rotation.z = -x / 1.1; } };
    },
  },
  pelote: {
    arch: 'mobile', reaction: 'jitter', impactX: 3 - 1.1 - DEMI_BOLIDE, tEffet: 1.6,
    build(THREE, M) {
      const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: 0x6b44b6, wireframe: true }));
      g.add(p);
      return { group: g, pose(tau) { const x = tau < 0 ? -5 : -5 + 5 * tau; p.position.set(Math.min(x, 3), 1.1 + Math.abs(Math.sin(tau * 7)) * 0.4, 0.6); p.rotation.z = -x; } };
    },
  },
  obus: {
    arch: 'mobile', reaction: 'crash', impactX: 1.0 - 1.5 - DEMI_BOLIDE, tEffet: 1.57,
    build(THREE, M) {
      const g = new THREE.Group();
      const dome = sph(THREE, 1.5, M.bonbon); dome.scale.y = 0.55; dome.position.y = 0.45; g.add(dome);
      const fond = cyl(THREE, 1.4, 1.4, 0.4, M.blanc); fond.position.y = 0.3; g.add(fond);
      for (let i = 0; i < 3; i++) { const b = sph(THREE, 0.3, M.acier); b.position.set(0.8 * Math.cos(i * 2.09), 0.12, 0.8 * Math.sin(i * 2.09)); g.add(b); }
      const holder = new THREE.Group(); holder.add(g);
      return { group: holder, pose(tau) { const x = tau < 0 ? -10 : -10 + 7 * tau; g.position.set(Math.min(x, 1.0), 0, Math.sin(tau * 4) * 0.4); g.rotation.y = tau * 6; } };
    },
  },
  bowling: {
    arch: 'mobile', reaction: 'crash', impactX: 0.8 - 1.1 - DEMI_BOLIDE, tEffet: 1.45,
    build(THREE, M) {
      const g = new THREE.Group();
      const b = sph(THREE, 1.1, M.bleu); g.add(b);
      for (let i = 0; i < 3; i++) { const t = sph(THREE, 0.16, new THREE.MeshStandardMaterial({ color: 0x0b1230 })); t.position.set(0.3 * (i - 1), 0.9, 0.55); b.add(t); }
      return { group: g, pose(tau) { const x = tau < 0 ? -10 : -10 + 6.5 * tau + 0.8 * tau * tau; b.position.set(Math.min(x, 0.8), 1.1, -0.3); b.rotation.z = -x / 1.1; } };
    },
  },
  chausse_trapes: {
    arch: 'mobile', reaction: 'jitter', impactX: -2.2 - DEMI_BOLIDE + 1.3, tEffet: 0.6,
    build(THREE, M) {
      const g = new THREE.Group(); const items = [];
      const leg = new THREE.ConeGeometry(0.16, 0.85, 8);
      const dirs = [[0, 1, 0], [0.943, -0.333, 0], [-0.471, -0.333, 0.816], [-0.471, -0.333, -0.816]];
      for (let k = 0; k < 6; k++) {
        const c = new THREE.Group();
        for (const d of dirs) { const l = new THREE.Mesh(leg, M.gris); l.position.set(d[0] * 0.42, d[1] * 0.42, d[2] * 0.42); l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d)); c.add(l); }
        g.add(c); items.push({ c, x: -2 + (k % 3) * 1.4 + Math.sin(k * 3.1) * 0.3, z: (k < 3 ? -0.9 : 0.9) + Math.cos(k * 2.3) * 0.3, s: k * 0.7 });
      }
      return { group: g, pose(tau) {
        for (const it of items) {
          const t = tau - it.s * 0.05;
          const y = t < 0 ? 6 : Math.max(0.33, 6 - 0.5 * G * 4 * t * t);
          it.c.position.set(it.x, tau < 0 ? 99 : y, it.z); it.c.rotation.set(it.s, t * 8 * (y > 0.34 ? 1 : 0), it.s * 2);
        }
      } };
    },
  },
  curling: {
    arch: 'mobile', reaction: 'push', impactX: 0.6 - 1.4 - DEMI_BOLIDE, tEffet: 1.34,
    build(THREE, M) {
      const g = new THREE.Group();
      const p = cyl(THREE, 1.4, 1.4, 0.9, M.argent, 40); p.position.y = 0.45; g.add(p);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 10, 24, Math.PI), M.rouge); h.position.y = 0.9; p.add(h);
      const holder = new THREE.Group(); holder.add(g);
      return { group: holder, pose(tau) { const t = Math.max(0, tau); const x = -6.5 + 6.5 * t - 0.9 * t * t; g.position.x = tau < 0 ? -6.5 : Math.min(x, 0.6); g.rotation.y = t * 1.2; } };
    },
  },
};

// instant idéal de déclenchement : le bolide doit arriver au contact quand l'effet est établi
for (const r of Object.values(RIGS)) {
  r.declencheX = Math.max(X0, r.impactX - VCAR * r.tEffet);
  r.avanceCm = Math.round(r.impactX - r.declencheX);    // 1 unité = 1 cm : distance bolide-piège au déclenchement
}

/* Bolide générique 1:64 (75 × 30 × 25 mm) */
export function buildToyCar(THREE, color = 0x1f4e8f) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.3 });
  const body = box(THREE, 7.4, 1.2, 3.0, paint); body.position.y = 0.95; g.add(body);
  const cab = box(THREE, 3.6, 1.0, 2.6, new THREE.MeshStandardMaterial({ color: 0x0e1630, metalness: 0.3, roughness: 0.1 })); cab.position.set(-0.4, 1.95, 0); g.add(cab);
  const wheel = new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 0.8 });
  for (const x of [-2.4, 2.4]) for (const z of [-1.45, 1.45]) { const w = cyl(THREE, 0.55, 0.55, 0.4, wheel, 18); w.rotation.x = Math.PI / 2; w.position.set(x, 0.55, z); g.add(w); }
  return g;
}

/* Trajectoire du bolide (temps global t, déclenchement à tTrig) et réaction au piège */
export function carPose(rig, t, tTrig) {
  const v = VCAR;
  let x = X0 + v * t, y = 0, z = 0, rx = 0, ry = 0, rz = 0;
  const hitT = (rig.impactX - X0) / v;
  if (t > hitT) {
    const d = (t - hitT) * 10 / RALENTI, dl = t - hitT;   // réactions de choc à l'échelle du ralenti
    switch (rig.reaction) {
      case 'crash': x = rig.impactX - 0.6 * (1 - Math.exp(-d * 6)); rz = -Math.min(0.35, d * 2.5) * Math.exp(-d * 0.8); y = Math.min(0.5, d * 2) * Math.exp(-d * 2); break;
      case 'launch': { const la = rig.launchAngle || 0.44, vy = v * Math.sin(la); y = Math.max(0, vy * dl - 0.5 * G * dl * dl); rz = y > 0 ? la * (1 - dl * G / vy) : 0; x = rig.impactX + v * dl * 0.92; break; }
      case 'spin': ry = d * 9 * Math.exp(-d * 1.2); x = rig.impactX + v * dl * 0.45; z = Math.min(1.1, d * 2.5); break;
      case 'push': z = Math.min(0.75, d * 6); ry = Math.min(0.25, d * 2); x = rig.impactX + v * dl * 0.7; break;
      case 'jitter': y = Math.abs(Math.sin(d * 40)) * 0.25 * Math.exp(-d * 2); rx = Math.sin(d * 33) * 0.08; x = rig.impactX + v * dl * 0.75; break;
      default: break;
    }
  }
  return { x, y, z, rx, ry, rz };
}

/* Tronçon de voie Rainbow Road (translucide, cloisons) */
export function buildLane(THREE, longueur = 32) {
  // piste complète de la notice : 5 voies aux couleurs GXX41, cloisons et parois extérieures translucides
  const g = new THREE.Group();
  for (let i = 1; i <= PISTE.nb; i++) {
    const c = COULEURS_VOIES[i - 1].hex, gp = true;   // les 5 voies sont des voies de course
    const fond = box(THREE, longueur, 0.06, PISTE.voie, new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: gp ? 0.6 : 0.3,
      emissive: c, emissiveIntensity: i === VOIE_LABO ? 0.55 : 0.22, roughness: 0.25, metalness: 0.05 }));
    fond.position.set(0, -0.03, zVoie(i)); fond.receiveShadow = true; g.add(fond);
    // liseré lumineux au milieu de chaque voie (effet « arc-en-ciel » translucide)
    const lis = box(THREE, longueur, 0.02, 0.12, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: gp ? 0.9 : 0.4 }));
    lis.position.set(0, 0.01, zVoie(i)); g.add(lis);
  }
  const verre = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.32, emissive: 0x9fd8ff, emissiveIntensity: 0.25, roughness: 0.1 });
  for (let k = 1; k < PISTE.nb; k++) {
    const w = box(THREE, longueur, PAROI, PISTE.cloison, verre); w.position.set(0, PAROI / 2, (zVoie(k) + zVoie(k + 1)) / 2); g.add(w);
  }
  for (const s of [-1, 1]) {
    const w = box(THREE, longueur, PAROI, PISTE.paroiExt, verre); w.position.set(0, PAROI / 2, (zVoie(1) + zVoie(5)) / 2 + s * (PISTE.largeur / 2 + PISTE.paroiExt / 2)); g.add(w);
  }
  return g;
}

export { mats, V, pontDesPieges, chariot };
