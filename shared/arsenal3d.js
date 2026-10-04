/* Arsenal 3D — maquettes procédurales animées des pièges ASSERVIS et MOBILES (Three.js r128, global window.THREE).
   Échelle : 1 unité = 10 mm. La voie est orientée selon +x (sens de la course), la largeur selon z, la hauteur selon y.
   Chaque gréement expose pose(tau) où tau = temps (s) depuis le déclenchement (négatif = armé) : animation déterministe,
   rejouable image par image (utile pour l'aperçu TV et pour les tests). Les dimensions suivent arsenal_pieges.scad. */

const V = 4.53;          // largeur utile d'une voie (45,3 mm)
// Ralenti ×40 : le bolide roule à 2,5 m/s réels en ligne droite finale (CIRCUIT_RAINBOW_ROAD : 2,0 à 2,8 m/s),
// soit 250 unités/s réelles -> 6,25 unités/s affichées. Toute la physique est exprimée dans ce temps ralenti :
// g = 981 unités/s² réels -> 981 / 40² ≈ 0,61 unité/s² affichée ; les durées réelles sont multipliées par 40.
// Les instants de déclenchement idéaux en découlent : avance (cm) = vitesse × temps de mise en place du piège.
export const RALENTI = 40;
const G = 981 / (RALENTI * RALENTI);
export const VCAR = 250 / RALENTI;
export const X0 = -28;                 // départ du bolide (28 cm en amont du piège)
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

/* Chaque fiche : arch, armeA (instant de déclenchement, en x du bolide), reaction du bolide, build(THREE, M) -> {group, pose(tau)} */
export const RIGS = {
  herse: {
    arch: 'asservi', reaction: 'crash', impactX: -DEMI_BOLIDE - 0.3, tEffet: Math.sqrt(2 * 1.25 / G),   // grille sous le toit (25 mm)
    build(THREE, M) {
      const g = new THREE.Group();
      for (const z of [-V / 2 + 0.35, V / 2 - 0.35]) { const p = box(THREE, 1.2, 4.8, 0.7, M.anth); p.position.set(0, 2.4, z); g.add(p); }
      const base = box(THREE, 2.8, 0.08, V, M.anth); base.position.y = 0.04; g.add(base);
      const grille = new THREE.Group();
      for (let i = 0; i < 6; i++) { const b = box(THREE, 0.24, 3.2, 0.24, M.gris); b.position.set(0, 1.6, -1.6 + i * 0.64); grille.add(b); }
      for (const y of [0.4, 1.6, 2.9]) { const b = box(THREE, 0.24, 0.24, 3.4, M.gris); b.position.y = y; grille.add(b); }
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 8), M.gris); c.rotation.x = Math.PI; c.position.set(0, -0.15, -1.6 + i * 0.64); grille.add(c); }
      g.add(grille);
      const pin = cyl(THREE, 0.1, 0.1, V + 1.4, M.bois); pin.rotation.x = Math.PI / 2; pin.position.y = 3.7; g.add(pin);
      return { group: g, pose(tau) {
        const fall = tau < 0 ? 0 : clamp(0.5 * G * tau * tau, 0, 3.55);           // chute libre
        grille.position.y = 3.85 - fall;
        pin.position.z = tau < 0 ? 0 : -Math.min(6, tau * 12);
      } };
    },
  },
  bascule: {
    arch: 'asservi', reaction: 'launch', impactX: -2.0 - 2.4, tEffet: 0.03 * RALENTI,
    build(THREE, M) {
      const g = new THREE.Group();
      const base = box(THREE, 5.2, 0.12, V, M.anth); base.position.y = 0.06; g.add(base);
      const piv = new THREE.Group(); piv.position.set(-2.0, 0.3, 0); g.add(piv);
      const tab = box(THREE, 3.8, 0.2, V - 1.1, M.bois); tab.position.x = 1.9; piv.add(tab);
      const mat = box(THREE, 0.42, 3.3, 0.42, M.jaune); mat.position.set(2.3, 1.65, V / 2 - 0.3); g.add(mat);
      const bras = box(THREE, 0.42, 0.4, 2.6, M.jaune); bras.position.set(2.3, 3.1, 1.0); g.add(bras);
      const fil = box(THREE, 0.03, 1, 0.03, M.blanc); g.add(fil);
      return { group: g, pose(tau) {
        const a = tau < 0 ? 0 : ease(tau / (0.05 * RALENTI)) * 0.44;  // 0 -> 25° en 50 ms réels
        piv.rotation.z = a;
        const tipx = -2.0 + 3.6 * Math.cos(a), tipy = 0.3 + 3.6 * Math.sin(a);
        fil.position.set((tipx + 2.3) / 2, (tipy + 3.1) / 2, 0); fil.scale.y = Math.hypot(2.3 - tipx, 3.1 - tipy); fil.rotation.z = Math.atan2(2.3 - tipx, 3.1 - tipy) * -1;
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
    arch: 'asservi', reaction: 'spin', impactX: 0, tEffet: 0.44 * RALENTI / 4,
    build(THREE, M) {
      const g = new THREE.Group();
      const mat = box(THREE, 0.8, 6.4, 0.3, M.jaune); mat.position.set(0, 3.2, -V / 2 - 0.5); g.add(mat);
      const bras = box(THREE, 0.8, 0.4, V / 2 + 0.8, M.jaune); bras.position.set(0, 6.2, -V / 4); g.add(bras);
      const piv = new THREE.Group(); piv.position.set(0, 6.0, 0); g.add(piv);
      const fil = box(THREE, 0.03, 4.8, 0.03, M.blanc); fil.position.y = -2.4; piv.add(fil);
      const b = sph(THREE, 1.1, M.anth); b.position.y = -4.8; piv.add(b);
      return { group: g, pose(tau) {
        const T = 0.44 * RALENTI, A = 1.05;                               // période réelle 0,44 s, lâché à 60°
        piv.rotation.x = tau < 0 ? A : A * Math.cos(2 * Math.PI * tau / T) * Math.exp(-tau * 3.5 / RALENTI);
      } };
    },
  },
  belier: {
    arch: 'asservi', reaction: 'push', impactX: 0, tEffet: 0.03 * RALENTI,
    build(THREE, M) {
      const g = new THREE.Group();
      const fourreau = box(THREE, 1.0, 1.0, 3.0, M.anth); fourreau.position.set(0, 1.2, -V / 2 - 1.2); g.add(fourreau);
      const pis = new THREE.Group(); pis.position.set(0, 1.2, -V / 2 - 2.2); g.add(pis);
      const tige = box(THREE, 0.6, 0.6, 5.2, M.argent); tige.position.z = 1.0; pis.add(tige);
      const tete = box(THREE, 1.4, 0.9, 0.5, M.argent); tete.position.z = 3.6; pis.add(tete);
      const bouton = cyl(THREE, 0.8, 0.8, 0.6, M.rouge); bouton.rotation.x = Math.PI / 2; bouton.position.z = -1.6; pis.add(bouton);
      return { group: g, pose(tau) {
        const k = 0.04 * RALENTI; const out = tau < 0 ? 0 : tau < k ? ease(tau / k) : tau < 4 * k ? 1 : 1 - ease((tau - 4 * k) / (2 * k));
        pis.position.z = -V / 2 - 2.2 + 2.2 * out;
      } };
    },
  },
  balancier: {
    arch: 'asservi', reaction: 'spin', impactX: 0, tEffet: 0.45 * RALENTI / 4,
    build(THREE, M) {
      const g = new THREE.Group();
      for (const z of [-V / 2 - 0.3, V / 2 + 0.3]) { const p = box(THREE, 0.6, 7, 0.4, M.anth); p.position.set(0, 3.5, z); g.add(p); }
      const top = box(THREE, 0.6, 0.4, V + 1, M.anth); top.position.y = 7; g.add(top);
      const piv = new THREE.Group(); piv.position.y = 6.9; g.add(piv);
      const lame = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 32, 1, false, 0, Math.PI), M.argent);
      lame.rotation.z = Math.PI / 2; lame.rotation.y = Math.PI / 2; lame.position.y = -4.8; piv.add(lame);
      const tige = box(THREE, 0.15, 4.8, 0.15, M.gris); tige.position.y = -2.4; piv.add(tige);
      return { group: g, pose(tau) { piv.rotation.x = tau < 0 ? 0.78 : 0.78 * Math.cos(2 * Math.PI * tau / (0.45 * RALENTI)) * Math.exp(-tau * 0.8 / RALENTI); } };
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
      case 'launch': { const vy = v * Math.sin(0.44); y = Math.max(0, vy * dl - 0.5 * G * dl * dl); rz = y > 0 ? 0.44 * (1 - dl * G / vy) : 0; x = rig.impactX + v * dl * 0.92; break; }
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
  const g = new THREE.Group();
  const cols = [0xff4d6d, 0xffa24d, 0xffd166, 0x3ddc97, 0x4cc9f0, 0x9b5de5];
  for (let i = 0; i < 6; i++) {
    const s = box(THREE, longueur, 0.06, V / 6, new THREE.MeshStandardMaterial({ color: cols[i], transparent: true, opacity: 0.55, emissive: cols[i], emissiveIntensity: 0.35 }));
    s.position.set(0, -0.03, -V / 2 + V / 12 + i * V / 6); g.add(s);
  }
  for (const z of [-V / 2 - 0.12, V / 2 + 0.12]) {
    const w = box(THREE, longueur, PAROI, 0.24, new THREE.MeshStandardMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.35, emissive: 0x4cc9f0, emissiveIntensity: 0.3 }));
    w.position.set(0, PAROI / 2, z); g.add(w);
  }
  return g;
}

export { mats, V };
