/* SIGNATURES — ce qui rend chaque invocation unique (web/data/signatures_bolides.json, écrit par outils/signatures_bolides.py) :
     particules au sol et dans l'air, filtre d'écran au franchissement du seuil, jingle d'entrée.
   Et la bande-son de la MONTÉE EN SUSPENSE avant l'ouverture du conteneur (commune à tous les modes) :
     atterrissage, verrouillage, grondement de basse sous le plancher, moteur qui rugit à l'intérieur, loquets qui cèdent
     un à un (un par palier de rareté), crépitements, déchirure du scellé, rideau métallique qui s'enroule.

   Exports :
     chargerSignatures(base), signatureDe(code)          données (repli neutre si le fichier manque)
     outilsSon(S)                                         petits instruments Web Audio (oscillateurs, bruits, accords)
     jingleEntree(nom, S)                                 joue un jingle (0,3 à 0,8 s) ; renvoie sa durée
     suspenseSonore(S, repères)                           programme toute la montée en suspense ; renvoie stop()
     drameSonore(S, { DR, … }), tromboneTriste(o, t)      MODE DRAME (rareté Épave) : la chute après le faux Légendaire ; stop()
     PARTICULES_SIGNATURE, FILTRES_SIGNATURE              catalogues utilisés par reveal_fret.js et archetypes.js
   Tout est synthétisé : aucun échantillon, aucune œuvre protégée. */

let DONNEES = null;
export async function chargerSignatures(base = '..') {
  if (DONNEES) return DONNEES;
  try { const r = await fetch(base + '/data/signatures_bolides.json', { cache: 'no-cache' }); DONNEES = r.ok ? await r.json() : null; } catch (e) { DONNEES = null; }
  if (!DONNEES) DONNEES = { bolides: {} };
  return DONNEES;
}
export function signatureDe(code) {
  const s = DONNEES && DONNEES.bolides && DONNEES.bolides[code];
  return s ? { particules: s.particules, filtre: s.filtre, jingle: s.jingle, teinte: s.teinte || null } : { particules: 'etoiles', filtre: 'teinte', jingle: 'gong', teinte: null };
}

/* ================================================================== filtres (numéro de passe GLSL, voir archetypes.js) */
export const FILTRES_SIGNATURE = { vhs: 1, thermique: 2, nocturne: 3, glitch: 4, radioactif: 5, negatif: 6, pixel: 7, or_liquide: 8,
  halo_reve: 9, bichro_rouge: 10, onde: 11, neige_tv: 12, teinte: 13, contre_jour: 14 };

/* ================================================================== particules (dessin de la texture + comportement) */
const P = (o) => ({ add: false, n: 2, zone: 'sol', g: 0, frein: 0.5, taille: [0.3, 0.5], vie: [1.2, 2], tourne: 0, pivote: false, ondule: 0, op: 0.9, ...o });
export const PARTICULES_SIGNATURE = {
  billets: P({ tex: 'billet', couleurs: ['#7fd18b', '#a8e6a1'], zone: 'air', g: -1.2, vel: [[-2, 2], [1, 3], [-1.5, 1.5]], taille: [0.5, 0.7], vie: [2, 3], tourne: 2, ondule: 1.6 }),
  pieces: P({ tex: 'piece', couleurs: ['#ffd34d', '#ffbf1f'], add: true, g: -12, vel: [[-3, 3], [3, 6], [-2, 2]], taille: [0.3, 0.4], vie: [1, 1.6], pivote: true, frein: 0.1 }),
  cerfa: P({ tex: 'cerfa', couleurs: ['#ffffff', '#f3f0e6'], zone: 'air', g: -1, vel: [[-2.5, 2.5], [1, 3], [-1.5, 1.5]], taille: [0.5, 0.7], vie: [2, 3], tourne: 2.4, ondule: 1.4 }),
  huile: P({ tex: 'doux', couleurs: ['#111216', '#2b2a33', '#1c1f2b'], vel: [[-0.6, 0.6], [0.3, 0.9], [-0.6, 0.6]], taille: [0.8, 1.4], vie: [1.6, 2.6], op: 0.55, croit: 1.5, n: 3 }),
  braises: P({ tex: 'doux', couleurs: ['#ff7a1a', '#ffb347', '#ff4d1a'], add: true, g: 1.5, vel: [[-0.8, 0.8], [1, 2.5], [-0.8, 0.8]], taille: [0.12, 0.22], vie: [1.2, 2.2], ondule: 1, n: 4 }),
  cendres: P({ tex: 'doux', couleurs: ['#8d8f98', '#b4b6bf', '#5d5f66'], g: 0.3, vel: [[-0.6, 0.6], [0.3, 1], [-0.6, 0.6]], taille: [0.1, 0.2], vie: [2, 3], ondule: 0.8, op: 0.7, n: 4 }),
  confettis: P({ tex: 'carre', couleurs: ['#ff3fa4', '#22d3ee', '#ffd34d', '#7cff6b', '#b06bff'], zone: 'air', g: -2.5, vel: [[-3, 3], [2, 5], [-2, 2]], taille: [0.14, 0.2], vie: [1.6, 2.4], tourne: 6, pivote: true, n: 5 }),
  pluie_acide: P({ tex: 'goutte', couleurs: ['#9dff6a', '#c6ff8a'], zone: 'ciel', add: true, g: -18, vel: [[-0.3, 0.3], [-6, -4], [-0.3, 0.3]], taille: [0.25, 0.4], vie: [0.6, 0.9], frein: 0, n: 7 }),
  arcs_electriques: P({ tex: 'eclair', couleurs: ['#8fdcff', '#ffffff', '#4cc9f0'], add: true, vel: [[-1, 1], [0, 0.5], [-1, 1]], taille: [0.4, 0.8], vie: [0.12, 0.25], tourne: 20, n: 3 }),
  radioactif: P({ tex: 'doux', couleurs: ['#57ff6a', '#b6ff57'], add: true, g: 0.6, vel: [[-0.4, 0.4], [0.5, 1.2], [-0.4, 0.4]], taille: [0.15, 0.3], vie: [1.6, 2.4], ondule: 1.2, n: 4 }),
  etincelles_bleues: P({ tex: 'doux', couleurs: ['#4d8dff', '#bfe3ff', '#ff2a3d'], add: true, g: -12, vel: [[-4, 4], [2, 5], [-2, 2]], taille: [0.1, 0.16], vie: [0.4, 0.8], frein: 0.2, n: 5 }),
  pixels: P({ tex: 'carre', couleurs: ['#22d3ee', '#ff2bd6', '#ffe14d', '#7cff6b'], add: true, g: -9, vel: [[-2, 2], [3, 5], [-1.5, 1.5]], taille: [0.16, 0.26], vie: [1, 1.6], n: 3 }),
  glacons: P({ tex: 'glace', couleurs: ['#cfefff', '#8fd8ff'], g: -10, vel: [[-3, 3], [2, 4], [-2, 2]], taille: [0.18, 0.3], vie: [0.9, 1.4], tourne: 5, frein: 0.2, n: 3 }),
  sable: P({ tex: 'doux', couleurs: ['#d9b27a', '#b88a55', '#efd2a2'], vel: [[-3, -1], [0.3, 1.2], [-1, 1]], taille: [0.5, 1.1], vie: [1.4, 2.2], op: 0.45, croit: 1.4, n: 4 }),
  petales: P({ tex: 'petale', couleurs: ['#ffb7d5', '#ff8fc0', '#ffe3f0'], zone: 'ciel', g: -0.8, vel: [[-1, 1], [-1.2, -0.4], [-1, 1]], taille: [0.16, 0.24], vie: [2.4, 3.4], tourne: 3, ondule: 1.8, n: 3 }),
  feuilles_mortes: P({ tex: 'feuille', couleurs: ['#d9822b', '#b5541c', '#e8b04a'], zone: 'ciel', g: -0.9, vel: [[-1.5, 0.5], [-1, -0.3], [-1, 1]], taille: [0.22, 0.32], vie: [2.4, 3.4], tourne: 2.5, ondule: 2, n: 2 }),
  fumee_violette: P({ tex: 'doux', couleurs: ['#7b3fbf', '#c77dff', '#4a1a7a'], vel: [[-0.5, 0.5], [0.2, 0.7], [-0.5, 0.5]], taille: [1, 1.6], vie: [2, 3], op: 0.4, croit: 1.6, n: 2, add: true }),
  notes: P({ tex: 'note', couleurs: ['#ffffff', '#7ff0ff', '#ff8fe0'], add: true, zone: 'air', g: 0.8, vel: [[-1, 1], [0.8, 1.8], [-0.6, 0.6]], taille: [0.3, 0.45], vie: [1.6, 2.4], ondule: 1.4, n: 2 }),
  neige: P({ tex: 'doux', couleurs: ['#e9eef5', '#c9d0da'], zone: 'ciel', g: -0.6, vel: [[-0.6, 0.2], [-1, -0.5], [-0.6, 0.6]], taille: [0.08, 0.16], vie: [2.4, 3.4], ondule: 1, n: 6 }),
  paillettes_noires: P({ tex: 'etoile', couleurs: ['#1a1a22', '#c0c4d0', '#6b6f80'], add: false, zone: 'air', g: -1.5, vel: [[-2, 2], [1, 3], [-1.5, 1.5]], taille: [0.16, 0.26], vie: [1.4, 2.2], tourne: 4, n: 4 }),
  bulles: P({ tex: 'bulle', couleurs: ['#ffffff', '#ffd1ec', '#bff3ff'], g: 0.5, vel: [[-0.6, 0.6], [0.4, 1], [-0.6, 0.6]], taille: [0.25, 0.5], vie: [2, 3], ondule: 1.2, n: 2 }),
  cartes: P({ tex: 'carte', couleurs: ['#ffffff'], zone: 'air', g: -1.4, vel: [[-2.5, 2.5], [1.5, 3.5], [-1.5, 1.5]], taille: [0.4, 0.55], vie: [1.8, 2.6], tourne: 3, pivote: true, ondule: 1.2, n: 2 }),
  etoiles: P({ tex: 'etoile', couleurs: ['#ffe14d', '#ff3fa4', '#22d3ee'], add: true, zone: 'air', g: -0.5, vel: [[-1.5, 1.5], [0.5, 2], [-1, 1]], taille: [0.25, 0.45], vie: [1.2, 2], tourne: 2, n: 3 }),
  bequilles: P({ tex: 'bequille', couleurs: ['#ffd400', '#ffffff', '#6ea8ff'], zone: 'air', g: -2.2, vel: [[-2, 2], [1.5, 3.5], [-1.5, 1.5]], taille: [0.3, 0.45], vie: [1.6, 2.4], tourne: 3, pivote: true, ondule: 0.6, n: 2 }),
  etincelles_meca: P({ tex: 'doux', couleurs: ['#ffd400', '#ffffff', '#1f6bff'], add: true, g: -14, vel: [[-3.5, 3.5], [1.5, 4.5], [-2, 2]], taille: [0.07, 0.13], vie: [0.3, 0.7], frein: 0.15, n: 5 }),
  coeurs_pixel: P({ tex: 'coeur_pixel', couleurs: ['#ff7ad9', '#2de2ee', '#ffffff'], add: true, zone: 'air', g: 0.6, vel: [[-1, 1], [0.7, 1.7], [-0.6, 0.6]], taille: [0.22, 0.34], vie: [1.4, 2.2], ondule: 1.2, n: 2 }),
  vent: P({ tex: 'vent', couleurs: ['#b9ffcb', '#4dff7a'], add: true, zone: 'air', g: 0, vel: [[-9, -5], [-0.2, 0.2], [-0.5, 0.5]], taille: [0.6, 1.1], vie: [0.5, 0.9], frein: 0, n: 5 }),
  poussiere_rotor: P({ tex: 'doux', couleurs: ['#8fb89a', '#c9e8d2'], vel: [[-1.5, 1.5], [0.2, 0.8], [-1.5, 1.5]], taille: [0.5, 0.9], vie: [1.2, 2], op: 0.35, croit: 1.6, n: 3 }),
  vapeur_blanche: P({ tex: 'doux', couleurs: ['#ffffff', '#e6ecf5'], g: 1.2, vel: [[-0.5, 0.5], [0.8, 1.8], [-0.5, 0.5]], taille: [0.9, 1.5], vie: [1.8, 2.8], op: 0.5, croit: 1.8, n: 3 }),
  // Rareté Épave : flocons de rouille orangés qui tombent lentement en tournoyant ; petites pièces (écrous, rondelles) qui
  // sautent du bas de caisse et REBONDISSENT sur le sol (rebond : coefficient de restitution, lu par reveal_fret.js)
  rouille: P({ tex: 'flocon_rouille', couleurs: ['#b5653a', '#8a4a26', '#d08a52', '#6e3a1e'], zone: 'ciel', g: -0.45, vel: [[-0.6, 0.4], [-0.9, -0.3], [-0.5, 0.5]], taille: [0.1, 0.2], vie: [2.6, 3.6], tourne: 1.6, ondule: 1.4, op: 0.9, n: 4 }),
  boulons: P({ tex: 'boulon', couleurs: ['#9aa0a8', '#c9ccd1', '#6d727a', '#a87a52'], g: -14, vel: [[-2.5, 2.5], [2.5, 5], [-2, 2]], taille: [0.12, 0.18], vie: [1.4, 2.2], tourne: 6, frein: 0.15, rebond: 0.45, n: 2 }),
};

/** Textures des particules (canvas), créées une fois par scène. */
export function texturesParticules(THREE) {
  const cache = new Map();
  const faire = (nom, dessin, w = 128, h = 128) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); dessin(g, w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  };
  const D = {
    doux: (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, '#fff'); r.addColorStop(0.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); },
    carre: (g, w) => { g.fillStyle = '#fff'; g.fillRect(w * 0.2, w * 0.3, w * 0.6, w * 0.4); },
    billet: (g, w) => { g.fillStyle = '#e8ffe8'; g.fillRect(8, 34, w - 16, 60); g.strokeStyle = '#2f7a3a'; g.lineWidth = 4; g.strokeRect(14, 40, w - 28, 48); g.fillStyle = '#2f7a3a'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.fillText('100', w / 2, 74); },
    piece: (g, w) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.4, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w * 0.3, 0, 7); g.stroke(); },
    cerfa: (g, w) => { g.fillStyle = '#fff'; g.fillRect(24, 8, w - 48, w - 16); g.fillStyle = '#9aa3b8'; for (let y = 24; y < w - 16; y += 10) g.fillRect(32, y, w - 64 - (y % 30), 3); g.fillStyle = '#1d4ed8'; g.fillRect(32, 14, 30, 6); },
    goutte: (g, w) => { const l = g.createLinearGradient(0, 0, 0, w); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(1, '#fff'); g.fillStyle = l; g.fillRect(w / 2 - 3, 0, 6, w); },
    eclair: (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); let x = w * 0.2, y = w / 2; g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += w * 0.11; y = w / 2 + (Math.random() - 0.5) * w * 0.5; g.lineTo(x, y); } g.stroke(); },
    glace: (g, w) => { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(w * 0.5, w * 0.1); g.lineTo(w * 0.85, w * 0.45); g.lineTo(w * 0.55, w * 0.9); g.lineTo(w * 0.15, w * 0.55); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(w * 0.45, w * 0.25, 8, 30); },
    petale: (g, w) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, w / 2, w * 0.18, w * 0.4, 0.5, 0, 7); g.fill(); },
    feuille: (g, w) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w * 0.5, w * 0.08); g.quadraticCurveTo(w * 0.95, w * 0.5, w * 0.5, w * 0.92); g.quadraticCurveTo(w * 0.05, w * 0.5, w * 0.5, w * 0.08); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, w * 0.1); g.lineTo(w / 2, w * 0.9); g.stroke(); },
    note: (g, w) => { g.fillStyle = '#fff'; g.font = `900 ${w * 0.8}px "Segoe UI Symbol","Arial Unicode MS",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', w / 2, w / 2); },
    etoile: (g, w) => { g.translate(w / 2, w / 2); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? w * 0.18 : w * 0.45; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); },
    bulle: (g, w) => { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, w / 2, w * 0.4, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.36, w * 0.34, w * 0.08, 0, 7); g.fill(); },
    bequille: (g, w) => { g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 9; g.beginPath(); g.moveTo(w * 0.36, w * 0.92); g.lineTo(w * 0.58, w * 0.14); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(w * 0.44, w * 0.56); g.lineTo(w * 0.72, w * 0.48); g.stroke(); g.beginPath(); g.arc(w * 0.62, w * 0.2, w * 0.14, Math.PI * 0.9, Math.PI * 1.9); g.stroke(); },
    coeur_pixel: (g, w) => { const m = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000']; const s = w / 9; g.fillStyle = '#fff'; m.forEach((l, y) => [...l].forEach((c, x) => { if (c === '1') g.fillRect(w * 0.06 + x * s, w * 0.15 + y * s, s - 1, s - 1); })); },
    vent: (g, w) => { for (let i = 0; i < 4; i++) { const y = w * (0.25 + i * 0.17), l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.7, 'rgba(255,255,255,' + (0.9 - i * 0.12) + ')'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(w * (0.05 + (i % 2) * 0.12), y, w * 0.8, 4); } },
    carte: (g, w) => { g.fillStyle = '#fff'; g.fillRect(w * 0.22, w * 0.1, w * 0.56, w * 0.8); g.strokeStyle = '#333'; g.lineWidth = 3; g.strokeRect(w * 0.22, w * 0.1, w * 0.56, w * 0.8); g.fillStyle = Math.random() < 0.5 ? '#d0021b' : '#111'; g.font = `900 ${w * 0.36}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['♥', '♠', '♦', '♣'][Math.floor(Math.random() * 4)], w / 2, w / 2); },
    // flocon de rouille : éclat de tôle irrégulier (contour à graine fixe), bord plus clair, piqûres
    flocon_rouille: (g, w) => {
      let a = 77; const al = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
      g.translate(w / 2, w / 2); g.beginPath();
      for (let i = 0; i < 9; i++) { const an = i / 9 * Math.PI * 2, r = w * (0.22 + 0.2 * al()); g.lineTo(Math.cos(an) * r, Math.sin(an) * r * 0.75); }
      g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.6)'; g.stroke();
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((al() - 0.5) * w * 0.4, (al() - 0.5) * w * 0.3, 2 + al() * 4, 0, 7); g.fill(); }
    },
    // écrou hexagonal vu de face : six pans, chanfrein, trou taraudé
    boulon: (g, w) => {
      g.translate(w / 2, w / 2); g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(Math.cos(an) * w * 0.42, Math.sin(an) * w * 0.42); }
      g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, w * 0.3, 0, 7); g.stroke();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, w * 0.16, 0, 7); g.fill();
    },
  };
  return (nom) => { if (!cache.has(nom)) cache.set(nom, faire(nom, D[nom] || D.doux)); return cache.get(nom); };
}

/* ================================================================== instruments Web Audio */
/** Frappe modale d'une petite pièce d'acier (0,7 s, mono) : résonateurs du 2e ordre excités par un contact de 0,3 ms. Mémorisée par
 *  contexte audio et par fréquence (pas de 50 Hz) : aucun calcul pendant le reveal après la première frappe. */
const memoFrappes = new WeakMap();
export function rendreFrappe(sr, f, germe = 1) {
  const n = Math.round(0.7 * sr), out = new Float32Array(n);
  const modes = [[0.31, 0.16, 0.45], [1, 0.32, 1], [1.47, 0.2, 0.55], [2.756, 0.11, 0.4], [5.404, 0.05, 0.22]]
    .map(([k, t60, a]) => ({ f: f * k, t60, a })).filter((m) => m.f > 30 && m.f < sr * 0.45)
    .map((m) => { const r = Math.exp(-6.9078 / (m.t60 * sr)), w = 2 * Math.PI * m.f / sr; return { b1: 2 * r * Math.cos(w), b2: -r * r, g: m.a * (1 - r * r), y1: 0, y2: 0 }; });
  let a = germe >>> 0 || 1;
  const alea = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 * 2 - 1; };
  const nc = Math.max(2, Math.round(0.0003 * sr)), na = Math.round(0.004 * sr);
  let crete = 0;
  for (let i = 0; i < n; i++) {
    const ex = i < nc ? Math.sin(Math.PI * i / nc) : 0;
    let y = i < na ? alea() * 0.25 * (1 - i / na) : 0;
    for (const m of modes) { const v = m.g * ex + m.b1 * m.y1 + m.b2 * m.y2; m.y2 = m.y1; m.y1 = v; y += v; }
    out[i] = y; crete = Math.max(crete, Math.abs(y));
  }
  const k = crete > 0 ? 0.9 / crete : 0, nf = Math.round(0.03 * sr);
  for (let i = 0; i < n; i++) out[i] *= k * (i >= n - nf ? (n - i) / nf : 1);
  return out;
}
function frappeModale(ac, f) {
  let m = memoFrappes.get(ac); if (!m) { m = new Map(); memoFrappes.set(ac, m); }
  const cle = Math.round(f / 50) * 50;
  if (!m.has(cle)) { const d = rendreFrappe(ac.sampleRate, cle, cle), b = ac.createBuffer(1, d.length, ac.sampleRate), c = b.getChannelData(0); if (c && c.set) c.set(d); m.set(cle, b); }
  return m.get(cle);
}
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
export function outilsSon(S, sortie = null, alea = null) {
  const { ac, master } = S;
  const bus = sortie || master;
  const hz = alea || Math.random;           // alea : générateur à graine (MODE DRAME : bande-son identique à chaque prise)
  let bufBruit = null;
  const vivants = [];                   // nœuds programmés, purgés quand ils sont finis (tenues longues sans fuite)
  const garder = (n, fin) => { vivants.push([n, fin]); if (vivants.length > 400) { const t = ac.currentTime; for (let i = vivants.length - 1; i >= 0; i--) if (vivants[i][1] < t - 0.5) vivants.splice(i, 1); } return n; };
  const bruitBuf = () => { if (bufBruit) return bufBruit; const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = hz() * 2 - 1; return (bufBruit = b); };
  function ton(type, f, t, d, { vol = 0.2, a = 0.006, r = 0.08, fc = 0, q = 0.8, detune = 0, glisse = 0, vers = bus, vib = 0, vibF = 5.5 } = {}) {
    const o = ac.createOscillator(), v = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (glisse) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * glisse), t + d);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vibF; lg.gain.value = f * vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + r + 0.05); garder(l, t + d + r); }
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + a);
    v.gain.setValueAtTime(vol, t + Math.max(a, d - 0.01)); v.gain.exponentialRampToValueAtTime(0.0001, t + d + r);
    let x = o;
    if (fc) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = fc; fl.Q.value = q; x.connect(fl); x = fl; }
    x.connect(v); v.connect(vers); o.start(t); o.stop(t + d + r + 0.05); garder(o, t + d + r);
  }
  function bruit(t, d, { vol = 0.3, type = 'highpass', f = 6000, f2 = 0, q = 0.7, vers = bus, a = 0.002 } = {}) {
    const n = ac.createBufferSource(), fl = ac.createBiquadFilter(), v = ac.createGain();
    n.buffer = bruitBuf(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q;
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(fl); fl.connect(v); v.connect(vers); n.start(t, hz()); n.stop(t + d + 0.05); garder(n, t + d);
  }
  const accord = (type, notes, t, d, o = {}) => notes.forEach((n, i) => ton(type, NOTE(n), t, d, { detune: (i % 2 ? 7 : -7), ...o }));
  const kick = (t, v = 0.9) => ton('sine', 150, t, 0.16, { vol: v, a: 0.002, r: 0.12, glisse: 0.28 });
  const caisse = (t, v = 0.35) => { bruit(t, 0.16, { vol: v, type: 'bandpass', f: 1900, q: 0.6 }); ton('triangle', 190, t, 0.08, { vol: v * 0.6, r: 0.05 }); };
  const charley = (t, v = 0.12) => bruit(t, 0.05, { vol: v, f: 8000 });
  const clap = (t, v = 0.3) => { for (let i = 0; i < 3; i++) bruit(t + i * 0.011, 0.09, { vol: v, type: 'bandpass', f: 1300, q: 1.2 }); };
  /* métal : plus de « bip » carré + sinus. Une vraie frappe modale (rendue hors ligne une fois par fréquence et par contexte) : petite
     pièce d'acier, modes de barre libre-libre (1 : 2,756 : 5,404), corps grave à 0,31 f, contact de 0,3 ms + crissement d'air. */
  const metal = (t, v = 0.4, f = 2600) => {
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = frappeModale(ac, f); g.gain.value = v * 1.6;
    src.connect(g); g.connect(bus); src.start(t); garder(src, t + 0.7);
  };
  const arreter = () => { for (const [n] of vivants) { try { n.stop(); } catch (e) { /* déjà arrêté */ } } vivants.length = 0; };
  return { ac, bus, ton, bruit, accord, kick, caisse, charley, clap, metal, NOTE, arreter, garder };
}

/* ================================================================== trombone triste (MODE DRAME, jingle « trombone_triste ») */
/** « Wah-wah-wah-waaah » : quatre notes descendantes par demi-tons (sol, fa♯, fa, mi), timbre de trombone (dent de scie + carrée
 *  filtrées) bouché à la sourdine wah-wah : à chaque note, le filtre s'ouvre (« wa- ») puis se referme (« -ah »). La dernière est
 *  tenue, s'affaisse d'un quart de ton, vibrato qui s'élargit et sourdine qui bat. notes : [[début (s, relatif à t), durée], …]. */
export const NOTES_TROMBONE = [[0, 0.4], [0.45, 0.4], [0.9, 0.4], [1.35, 1.65]];
export function tromboneTriste(o, t, notes = NOTES_TROMBONE) {
  const { ac, bus } = o, MIDI = [55, 54, 53, 52];
  notes.forEach(([d, du], i) => {
    const f = o.NOTE(MIDI[i % 4]), t0 = t + d, t1 = t0 + du, derniere = i === notes.length - 1;
    const s1 = ac.createOscillator(), s2 = ac.createOscillator(), lp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), v = ac.createGain(), m2 = ac.createGain();
    s1.type = 'sawtooth'; s2.type = 'square'; s1.frequency.setValueAtTime(f * 0.985, t0); s1.frequency.exponentialRampToValueAtTime(f, t0 + 0.05);   // attaque de coulisse
    s2.frequency.setValueAtTime(f * 0.5 * 0.985, t0); s2.frequency.exponentialRampToValueAtTime(f * 0.5, t0 + 0.05); m2.gain.value = 0.35;
    if (derniere) { s1.frequency.setValueAtTime(f, t0 + 0.3); s1.frequency.exponentialRampToValueAtTime(f * 0.972, t1); s2.frequency.setValueAtTime(f * 0.5, t0 + 0.3); s2.frequency.exponentialRampToValueAtTime(f * 0.486, t1); }
    lp.type = 'lowpass'; lp.Q.value = 7; bp.type = 'bandpass'; bp.Q.value = 2.2;
    // sourdine wah-wah : la main découvre puis recouvre le pavillon
    lp.frequency.setValueAtTime(320, t0); lp.frequency.exponentialRampToValueAtTime(1750, t0 + Math.min(0.14, du * 0.35)); lp.frequency.exponentialRampToValueAtTime(420, t0 + du);
    bp.frequency.setValueAtTime(600, t0); bp.frequency.exponentialRampToValueAtTime(1300, t0 + Math.min(0.14, du * 0.35)); bp.frequency.exponentialRampToValueAtTime(520, t0 + du);
    if (derniere) {                                                    // la sourdine bat sur la note tenue : wa-wa-wa-waaa…
      for (let k = 1, x = t0 + 0.5; x < t1 - 0.2; x += 0.32, k++) { lp.frequency.exponentialRampToValueAtTime(k % 2 ? 1300 : 480, x); bp.frequency.exponentialRampToValueAtTime(k % 2 ? 1100 : 560, x); }
      lp.frequency.exponentialRampToValueAtTime(380, t1);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.2;
      lg.gain.setValueAtTime(0.0001, t0); lg.gain.setValueAtTime(0.0001, t0 + 0.35); lg.gain.exponentialRampToValueAtTime(f * 0.03, t1);
      lfo.connect(lg); lg.connect(s1.frequency); const lg2 = ac.createGain(); lg2.gain.value = 0.5; lg.connect(lg2); lg2.connect(s2.frequency);
      lfo.start(t0); lfo.stop(t1 + 0.2); o.garder(lfo, t1 + 0.2);
    }
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03); v.gain.setValueAtTime(0.22, t1 - 0.06);
    v.gain.exponentialRampToValueAtTime(derniere ? 0.12 : 0.16, t1 - 0.02); v.gain.exponentialRampToValueAtTime(0.0001, t1 + (derniere ? 0.25 : 0.06));
    s1.connect(lp); s2.connect(m2); m2.connect(lp); lp.connect(bp); lp.connect(v); bp.connect(v); v.connect(bus);
    for (const s of [s1, s2]) { s.start(t0); s.stop(t1 + 0.3); o.garder(s, t1 + 0.3); }
  });
  const [dl, dul] = notes[notes.length - 1];
  return dl + dul + 0.25;
}

/* ================================================================== jingles d'entrée (0,3 à 0,8 s) */
const JINGLES = {
  fanfare: (o, t) => { [[60, 0], [64, 0.09], [67, 0.18], [72, 0.27]].forEach(([n, d]) => o.ton('sawtooth', o.NOTE(n), t + d, d === 0.27 ? 0.4 : 0.08, { vol: 0.16, fc: 3200, vib: d === 0.27 ? 0.01 : 0 })); return 0.7; },
  caisse_enregistreuse: (o, t) => { o.metal(t, 0.35, 3200); o.ton('sine', 2637, t + 0.12, 0.02, { vol: 0.3, r: 0.6 }); o.ton('sine', 3520, t + 0.16, 0.02, { vol: 0.25, r: 0.6 }); o.bruit(t + 0.02, 0.15, { vol: 0.3, type: 'bandpass', f: 900, q: 2 }); return 0.7; },
  tampon: (o, t) => { o.ton('sine', 110, t, 0.08, { vol: 0.8, glisse: 0.5 }); o.bruit(t, 0.08, { vol: 0.5, type: 'lowpass', f: 900 }); o.ton('sine', 95, t + 0.22, 0.08, { vol: 0.7, glisse: 0.5 }); return 0.45; },
  klaxon_cartoon: (o, t) => { o.ton('sawtooth', 392, t, 0.14, { vol: 0.2, fc: 2200 }); o.ton('sawtooth', 311, t + 0.2, 0.22, { vol: 0.2, fc: 2200 }); return 0.5; },
  court_circuit: (o, t) => { for (let i = 0; i < 9; i++) o.bruit(t + i * 0.035 + Math.random() * 0.02, 0.03, { vol: 0.45, f: 3000 }); o.ton('sawtooth', 120, t, 0.35, { vol: 0.12, fc: 900, glisse: 0.5 }); return 0.45; },
  tonnerre: (o, t) => { o.bruit(t, 0.08, { vol: 0.7, f: 2500 }); o.bruit(t + 0.05, 1.2, { vol: 0.6, type: 'lowpass', f: 600, f2: 60 }); return 0.8; },
  jackpot: (o, t) => { for (let i = 0; i < 8; i++) o.ton('square', o.NOTE(76 + [0, 4, 7, 12][i % 4]), t + i * 0.055, 0.05, { vol: 0.08, fc: 5000 }); o.metal(t + 0.45, 0.25, 3500); return 0.7; },
  compteur_geiger: (o, t) => { for (let i = 0; i < 18; i++) o.bruit(t + Math.random() * 0.55, 0.008, { vol: 0.6, f: 4000 }); return 0.6; },
  sirene_police: (o, t) => { o.ton('square', 740, t, 0.6, { vol: 0.08, fc: 2500, vib: 0.18, vibF: 4 }); o.ton('square', 555, t, 0.6, { vol: 0.06, fc: 2000, vib: 0.18, vibF: 4 }); return 0.65; },
  gong: (o, t) => { [1, 2.32, 3.1, 4.4].forEach((m, i) => o.ton('sine', 110 * m, t, 0.05, { vol: 0.35 / (i + 1), r: 1.4 })); o.bruit(t, 0.3, { vol: 0.2, type: 'bandpass', f: 600, q: 3 }); return 0.8; },
  rire_demoniaque: (o, t) => { for (let i = 0; i < 6; i++) { o.bruit(t + i * 0.12, 0.09, { vol: 0.4 - i * 0.04, type: 'bandpass', f: 950 - i * 60, q: 5 }); o.ton('sawtooth', 220 - i * 12, t + i * 0.12, 0.08, { vol: 0.06, fc: 1400 }); } return 0.8; },
  scratch_vinyle: (o, t) => { o.bruit(t, 0.12, { vol: 0.5, type: 'bandpass', f: 600, f2: 2600, q: 4 }); o.bruit(t + 0.13, 0.12, { vol: 0.5, type: 'bandpass', f: 2600, f2: 500, q: 4 }); return 0.35; },
  cristal: (o, t) => { [96, 100, 103, 108].forEach((n, i) => o.ton('sine', o.NOTE(n), t + i * 0.05, 0.02, { vol: 0.12, r: 0.7 })); return 0.7; },
  boum: (o, t) => { o.ton('sine', 80, t, 0.3, { vol: 1, glisse: 0.35, a: 0.002 }); o.bruit(t, 0.9, { vol: 0.7, type: 'lowpass', f: 1200, f2: 80 }); return 0.7; },
  piano_triste: (o, t) => { [[64, 0], [60, 0.22], [57, 0.44]].forEach(([n, d]) => { o.ton('triangle', o.NOTE(n), t + d, 0.03, { vol: 0.25, r: 0.8 }); o.ton('sine', o.NOTE(n + 12), t + d, 0.02, { vol: 0.06, r: 0.5 }); }); return 0.8; },
  notification: (o, t) => { o.ton('sine', o.NOTE(88), t, 0.06, { vol: 0.2, r: 0.2 }); o.ton('sine', o.NOTE(95), t + 0.1, 0.08, { vol: 0.2, r: 0.3 }); return 0.4; },
  turbo_pschitt: (o, t) => { o.ton('sine', 900, t, 0.25, { vol: 0.1, glisse: 3 }); o.bruit(t + 0.25, 0.35, { vol: 0.6, f: 3500 }); return 0.6; },
  reveil: (o, t) => { for (let i = 0; i < 10; i++) o.ton('square', i % 2 ? 2000 : 2400, t + i * 0.05, 0.04, { vol: 0.07, fc: 5000 }); return 0.55; },
  moteur_aigu: (o, t) => { o.ton('sawtooth', 180, t, 0.6, { vol: 0.16, glisse: 4.2, fc: 3000 }); o.ton('sawtooth', 181, t, 0.6, { vol: 0.1, glisse: 4.2, fc: 2400 }); return 0.65; },
  harpe_magique: (o, t) => { for (let i = 0; i < 10; i++) o.ton('triangle', o.NOTE(72 + [0, 2, 4, 7, 9][i % 5] + 12 * Math.floor(i / 5)), t + i * 0.035, 0.03, { vol: 0.1, r: 0.5 }); return 0.7; },
  moteur_electrique: (o, t) => { o.ton('sine', 300, t, 0.55, { vol: 0.12, glisse: 5 }); o.ton('triangle', 600, t, 0.55, { vol: 0.05, glisse: 5 }); return 0.6; },
  dragon_rugit: (o, t) => { o.ton('sawtooth', 70, t, 0.7, { vol: 0.3, fc: 700, glisse: 0.7, vib: 0.06, vibF: 18 }); o.bruit(t, 0.7, { vol: 0.5, type: 'bandpass', f: 400, q: 1.5 }); return 0.8; },
  sabre: (o, t) => { o.bruit(t, 0.14, { vol: 0.5, type: 'bandpass', f: 3000, f2: 7000, q: 3 }); o.ton('sine', 4200, t + 0.12, 0.02, { vol: 0.2, r: 0.6 }); return 0.6; },
  clac_metal: (o, t) => { o.metal(t, 0.6, 2200); o.metal(t + 0.12, 0.4, 1600); return 0.5; },
  rugissement_v8: (o, t) => { o.ton('sawtooth', 55, t, 0.7, { vol: 0.35, glisse: 2.4, fc: 900, vib: 0.08, vibF: 30 }); o.bruit(t, 0.7, { vol: 0.3, type: 'lowpass', f: 500 }); return 0.75; },
  pop_bulle: (o, t) => { [0, 0.12, 0.2].forEach((d, i) => o.ton('sine', 500 + i * 300, t + d, 0.06, { vol: 0.3, glisse: 2.2 })); return 0.4; },
  bip_robot: (o, t) => { [1200, 800, 1600, 1000].forEach((f, i) => o.ton('square', f, t + i * 0.08, 0.06, { vol: 0.07, fc: 4000 })); return 0.45; },
  corne_brume: (o, t) => { o.ton('sawtooth', 98, t, 0.7, { vol: 0.25, fc: 600 }); o.ton('sawtooth', 147, t, 0.7, { vol: 0.15, fc: 600 }); return 0.8; },
  orgue_gothique: (o, t) => { o.accord('square', [50, 57, 62, 65], t, 0.7, { vol: 0.06, fc: 2000, a: 0.04 }); return 0.8; },
  cloche_eglise: (o, t) => { [1, 2, 2.4, 3, 4.2].forEach((m, i) => o.ton('sine', 220 * m, t, 0.02, { vol: 0.3 / (i + 1), r: 1.5 })); return 0.8; },
  pistolet_depart: (o, t) => { o.bruit(t, 0.25, { vol: 0.9, type: 'highpass', f: 800 }); o.ton('sine', 140, t, 0.1, { vol: 0.6, glisse: 0.4 }); return 0.4; },
  bouchon_champagne: (o, t) => { o.ton('sine', 300, t, 0.05, { vol: 0.6, glisse: 3 }); o.bruit(t + 0.05, 0.5, { vol: 0.25, f: 6000 }); return 0.6; },
  glitch_son: (o, t) => { for (let i = 0; i < 7; i++) o.ton('square', 200 + Math.random() * 2000, t + i * 0.05, 0.04, { vol: 0.08 }); o.bruit(t + 0.36, 0.08, { vol: 0.4, f: 2000 }); return 0.5; },
  flash_radar: (o, t) => { o.ton('sine', 3000, t, 0.03, { vol: 0.15, r: 0.05 }); o.bruit(t + 0.06, 0.25, { vol: 0.35, type: 'bandpass', f: 5000, q: 1 }); o.ton('sine', 1800, t + 0.06, 0.3, { vol: 0.06, glisse: 0.3 }); return 0.45; },
  sifflet_arbitre: (o, t) => { o.ton('sine', 2800, t, 0.35, { vol: 0.14, vib: 0.03, vibF: 30 }); return 0.45; },
  chute_pieces: (o, t) => { for (let i = 0; i < 12; i++) o.metal(t + i * 0.04 + Math.random() * 0.03, 0.15, 3000 + Math.random() * 2000); return 0.65; },
  clochette_noel: (o, t) => { [84, 88, 91, 96].forEach((n, i) => o.ton('sine', o.NOTE(n), t + i * 0.08, 0.02, { vol: 0.14, r: 0.6 })); for (let i = 0; i < 6; i++) o.bruit(t + i * 0.06, 0.03, { vol: 0.12, f: 9000 }); return 0.7; },
  moniteur_bip: (o, t) => { [0, 0.16, 0.32].forEach((d) => o.ton('sine', 1000, t + d, 0.07, { vol: 0.22, r: 0.02 })); o.ton('sine', 1000, t + 0.5, 0.3, { vol: 0.18, r: 0.03 }); return 0.85; },
  carillon_gare: (o, t) => { [[84, 0], [79, 0.17], [76, 0.34], [72, 0.51]].forEach(([n, d], i) => { o.ton('sine', o.NOTE(n), t + d, 0.04, { vol: 0.2, r: 0.55 }); o.ton('triangle', o.NOTE(n + 12), t + d, 0.02, { vol: 0.05, r: 0.3 }); if (i === 3) o.metal(t + d + 0.02, 0.2, 1500); }); return 0.9; },
  vocaloid_39: (o, t) => { [72, 76, 79, 84, 88, 91].forEach((n, i) => o.ton('sawtooth', o.NOTE(n), t + i * 0.06, 0.05, { vol: 0.09, fc: 3600, vib: 0.01 })); o.ton('sine', o.NOTE(96), t + 0.4, 0.3, { vol: 0.14, r: 0.3, vib: 0.012, vibF: 6 }); o.bruit(t + 0.4, 0.3, { vol: 0.08, type: 'bandpass', f: 3200, q: 4 }); return 0.8; },
  helices_drone: (o, t) => { for (let i = 0; i < 16; i++) o.bruit(t + i * 0.035, 0.03, { vol: 0.32, type: 'bandpass', f: 700 + i * 40, q: 1.2 }); o.ton('sawtooth', 160, t, 0.5, { vol: 0.07, fc: 700, glisse: 1.9 }); o.ton('sine', 2400, t + 0.58, 0.03, { vol: 0.15, r: 0.35 }); return 0.8; },
  toux_diesel: (o, t) => { [0, 0.22, 0.42].forEach((d, i) => { o.ton('sawtooth', 64 - i * 6, t + d, 0.14, { vol: 0.28, fc: 420, vib: 0.12, vibF: 24 }); o.bruit(t + d, 0.12, { vol: 0.35, type: 'lowpass', f: 900 }); }); o.bruit(t + 0.6, 0.2, { vol: 0.15, type: 'bandpass', f: 1800, q: 2 }); return 0.75; },
  trombone_triste: (o, t) => tromboneTriste(o, t),
  levee_de_fonds: (o, t) => { [76, 83, 88].forEach((n, i) => o.ton('sine', o.NOTE(n), t + i * 0.09, 0.05, { vol: 0.18, r: 0.35 })); o.metal(t + 0.3, 0.4, 3300); o.ton('sine', 2637, t + 0.34, 0.02, { vol: 0.2, r: 0.5 }); return 0.75; },
};
export const NOMS_JINGLES = Object.keys(JINGLES);
/** Jingles longs (plus d'une seconde) : ils ne servent pas d'entrée au seuil mais de chute (MODE DRAME). */
export const JINGLES_LONGS = ['trombone_triste'];
export function jingleEntree(nom, S, quand = 0, sortie = null) {
  if (!S) return 0;
  const o = outilsSon(S, sortie);
  return (JINGLES[nom] || JINGLES.gong)(o, S.ac.currentTime + 0.01 + quand);
}

/* ================================================================== psycho-acoustique du suspense (rendus hors ligne)
   Rendus en Float32Array AVANT l'horloge (aucun oscillateur vivant) : le cœur et la montée de Shepard sont des tampons joués d'un bloc. */
/** Battement cardiaque infra : chaque coup est un « lub-dub » (sinus 45 → 35 Hz, attaque 4 ms, déclin 140 ms), le second coup plus
 *  faible 0,16 s plus tard ; l'intensité croît avec la cadence. battements : instants (s, relatifs au début du tampon). */
export function rendreBattements(sr, battements, duree) {
  const n = Math.max(1, Math.ceil(duree * sr)), out = new Float32Array(n);
  const coup = (t, a) => {
    const i0 = Math.round(t * sr), L = Math.round(0.34 * sr); let ph = 0;
    for (let k = 0; k < L && i0 + k < n; k++) {
      if (i0 + k < 0) continue;
      const x = k / sr, f = 35 + 10 * Math.exp(-x * 9);
      ph += 2 * Math.PI * f / sr;
      out[i0 + k] += a * Math.sin(ph) * Math.min(1, x / 0.004) * Math.exp(-x / 0.14) + a * 0.35 * Math.sin(ph * 2) * Math.exp(-x / 0.05);
    }
  };
  battements.forEach((t, i) => { const u = battements.length > 1 ? i / (battements.length - 1) : 1, a = 0.5 + 0.5 * u; coup(t, a); coup(t + 0.16, a * 0.55); });
  let c = 0; for (let i = 0; i < n; i++) c = Math.max(c, Math.abs(out[i]));
  if (c > 0.95) for (let i = 0; i < n; i++) out[i] *= 0.95 / c;
  return out;
}
/** Montée de Shepard : 7 partiels à l'octave qui glissent sans fin vers l'aigu (un cycle d'octave toutes les 4,5 s), enveloppe
 *  gaussienne en log-fréquence centrée sur 220 Hz : la hauteur semble monter indéfiniment. Fondu d'entrée lent, sortie nette. */
export function rendreShepard(sr, duree, { base = 55, partiels = 7, cycle = 4.5 } = {}) {
  const n = Math.max(1, Math.ceil(duree * sr)), out = new Float32Array(n), ph = new Float64Array(partiels);
  const inc = new Float64Array(partiels), gain = new Float64Array(partiels), BLOC = 64;
  let derivPrec = 0;
  for (let i0 = 0; i0 < n; i0 += BLOC) {                                     // fréquences et enveloppes recalculées par bloc de 64 échantillons
    const deriv = ((i0 / sr) / cycle) % 1;
    if (deriv < derivPrec) { for (let k = partiels - 1; k > 0; k--) ph[k] = ph[k - 1]; ph[0] = 0; }   // fin d'octave : chaque partiel reprend la phase de son voisin grave (aucun clic)
    derivPrec = deriv;
    for (let k = 0; k < partiels; k++) {
      const pos = (k + deriv) / partiels;                                    // 0 → 1 : grave → aigu
      inc[k] = 2 * Math.PI * base * Math.pow(2, k + deriv) / sr;
      gain[k] = Math.exp(-Math.pow((pos - 0.42) / 0.2, 2));
    }
    const i1 = Math.min(n, i0 + BLOC);
    for (let i = i0; i < i1; i++) {
      let v = 0;
      for (let k = 0; k < partiels; k++) { ph[k] += inc[k]; v += gain[k] * Math.sin(ph[k]); }
      const t = i / sr, env = Math.min(1, t / Math.max(0.5, duree * 0.55)) * Math.min(1, (duree - t) / 0.02);
      out[i] = v * 0.22 * env * env;
    }
  }
  return out;
}
function jouerTampon(ac, donnees, quand, dest, gain = 1) {
  const b = ac.createBuffer(1, donnees.length, ac.sampleRate);
  const c = b.getChannelData(0); if (c && c.set) c.set(donnees);
  const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = b; g.gain.value = gain;
  src.connect(g); g.connect(dest); src.start(quand);
  return src;
}

/* ================================================================== bande-son de la montée en suspense */
/** BANDE-SON DU SUSPENSE — ferraille réelle, plus d'oscillateurs : chaque événement du conteneur joue un bruitage physique de la
 *  banque `foley` (foley_acier.js : synthèse modale de tôle, collé-glissé, particules, détente pneumatique), envoyé en partie dans
 *  la réverbération du hangar (`salle`, convolution). Le moteur du bolide (démarreur, coups de gaz, rugissement) n'est PLUS ici : il
 *  est joué d'une seule prise physique par reveal_sons.jouerMoteur.
 *  repères (s depuis maintenant) : { arrivee, paliers:[s…], ouvre, trappeDebut, trappe, rang (0 à 4), jolts, plans:[{id, t0, t1}] }.
 *  Renvoie stop(). */
export function suspenseSonore(S, { arrivee, paliers, ouvre, trappeDebut, trappe, rang = 0, jolts = [], plans = [], battements = null, silence = null, vers = null, foley = null, salle = null, detonations = null, drame = null, alea = null }) {
  if (!S) return () => {};
  const { ac, master } = S;
  const bus = ac.createGain(); bus.gain.value = 0.9; bus.connect(vers || master);
  const o = outilsSon(S, bus, alea);
  const t0 = ac.currentTime + 0.02;
  const sources = [];
  /** joue un bruitage de la banque : nom (ou [nom, index]), instant (s), gain, part envoyée au hangar, vitesse de lecture */
  /* bus des DÉTONATIONS : hors du bus du suspense, qui s'efface de −9 dB pendant 0,18 s à chaque impact (le sub-boom émerge du cœur,
     du grondement et des à-coups au lieu de s'y noyer), puis remonte en 0,3 s */
  const busBoom = ac.createGain(); busBoom.gain.value = 1; busBoom.connect(vers || master);
  const BOOM = new Set(['detonation', 'titan', 'pene', 'rivets']);
  const F = (nom, t, gain = 1, envoi = 0.4, vitesse = 1) => {
    if (!foley) return;
    const [k, i] = Array.isArray(nom) ? nom : [nom, 0];
    const b = Array.isArray(foley[k]) ? foley[k][i % foley[k].length] : foley[k];
    if (!b) return;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = b; src.playbackRate.value = vitesse; g.gain.value = gain;
    src.connect(g); g.connect(BOOM.has(k) && t < ouvre - 0.4 ? busBoom : bus);
    if (salle && envoi > 0) { const e = ac.createGain(); e.gain.value = envoi; g.connect(e); e.connect(salle.entree); }
    src.start(t0 + Math.max(0, t)); sources.push(src);
  };
  // atterrissage : le conteneur touche les cales, rebondit, les chaînes retombent, deux verrous tournants s'enclenchent
  F('atterrissage', arrivee, 1, 0.5);
  // grondement du hangar sous le plancher (bruit filtré, pas de sinus), qui enfle jusqu'à l'ouverture
  const dur = ouvre - arrivee;
  o.bruit(t0 + arrivee, dur + 0.4, { vol: 0.13 + rang * 0.03, type: 'lowpass', f: 95, f2: 140, a: dur * 0.6 });
  o.bruit(t0 + arrivee + 0.3, dur, { vol: 0.04 + rang * 0.01, type: 'bandpass', f: 220, f2: 380, q: 1.1, a: dur * 0.7 });
  /* MODE EXPLOSION — chaque palier est une DÉTONATION calée à l'image près sur l'impact visuel (mêmes instants : chronologie.js →
     D.detonations) : la tôle racle sous la surcharge et la charnière grippée geint juste avant ; à l'impact, sub-boom (~35 Hz, pic
     transitoire) + claquement d'acier forgé, un verrou cède, la décompression crache, l'arc crépite ; un pêne de 5 kg tombe et
     rebondit. Climax (rang ≥ 3) : rafale de détonations qui font sauter les rivets ; l'explosion titanesque est jouée au scellé. */
  const dets = detonations || paliers.map((t, k) => ({ t, type: 'palier', k, niveau: Math.min(k, rang), force: 0.45 + 0.55 * k / Math.max(1, paliers.length - 1) }));
  const niveauSon = (f) => (f < 0.7 ? 0 : f < 0.95 ? 1 : 2);
  for (const x of dets) {
    if (x.type === 'titan') continue;                                                           // joué à l'ouverture (DÉFLAGRATION)
    const f = Math.min(1.2, x.force);
    F(['detonation', niveauSon(x.force)], x.t, 0.78 + 0.22 * f, 0.55, 1 + 0.015 * (x.k % 3));
    F('arc', x.t + 0.008, 0.2 + 0.15 * f, 0.2, 1 + 0.07 * (x.k % 4));
    if (x.type === 'palier') {
      F('charniere', x.t - 1.0, 0.26 + 0.12 * f, 0.45, 1 + 0.04 * x.k);
      F('raclement', x.t - 0.66, 0.3 + 0.12 * f, 0.4, 0.95 + 0.05 * x.k);
      F(['verrou', x.k], x.t + 0.02, 0.5 + 0.1 * f, 0.4, 0.92 + 0.03 * x.k);
      F('decompression', x.t + 0.05, 0.32 + 0.2 * f, 0.35, 1 + 0.04 * (x.k % 3));
      F(['pene', x.k], x.t + 0.24, 0.48 + 0.12 * f, 0.45, 1 - 0.03 * x.k);
    } else {
      F('rivets', x.t + 0.012, 0.55 + 0.1 * f, 0.35, 1.08 + 0.05 * x.k);                        // climax : les rivets sautent
      if (x.k % 2 === 0) F('decompression', x.t + 0.04, 0.3, 0.3, 1.1 + 0.05 * x.k);
    }
  }
  // CŒUR : battement infra (45 → 35 Hz) de 55 à 130 BPM, rendu hors ligne ; sous lui, une montée de Shepard qui ne finit jamais
  const tSil = silence ?? ouvre - 0.35;
  const coeurs = battements || (() => { const b = []; for (let x = arrivee + 0.3; x < tSil - 0.05;) { b.push(x); const u = Math.min(1, (x - arrivee) / Math.max(0.1, tSil - arrivee)); x += 60 / (55 + 75 * Math.pow(u, 1.5)); } return b; })();
  {
    const tSil0 = silence ?? ouvre - 0.35, V = 0.9, BAS = V * 0.355;
    for (const x of dets) {
      if (x.type === 'titan' || x.t >= tSil0 - 0.05) continue;
      const a = t0 + x.t, fin = Math.min(a + 0.48, t0 + tSil0 - 0.03);
      bus.gain.setValueAtTime(V, a - 0.008); bus.gain.linearRampToValueAtTime(BAS, a + 0.004);
      bus.gain.setValueAtTime(BAS, Math.min(a + 0.18, fin - 0.01)); bus.gain.linearRampToValueAtTime(V, fin);
    }
  }
  // l'infrabasse de chaque détonation doit ÉMERGER : le cœur saute les battements qui tomberaient dans sa fenêtre (−0,12 s / +0,45 s)
  const libre = (x, avant = 0.3, apres = 0.45) => !dets.some((d) => x > d.t - avant && x < d.t + apres);
  const coeursLibres = coeurs.filter((x) => libre(x));
  if (coeursLibres.length) sources.push(jouerTampon(ac, rendreBattements(ac.sampleRate, coeursLibres.map((x) => x - arrivee), tSil - arrivee + 0.02), t0 + arrivee, bus, 0.9));
  if (tSil - arrivee > 1) {
    const sh = ac.createBiquadFilter(); sh.type = 'lowpass'; sh.frequency.value = 1400; sh.connect(bus);
    sources.push(jouerTampon(ac, rendreShepard(ac.sampleRate, tSil - arrivee - 0.3), t0 + arrivee + 0.3, sh, 0.35 + 0.1 * rang));
  }
  // la cuve d'acier résonne sous les coups (un coup de masse sur deux battements, de plus en plus fort)
  coeurs.forEach((x, i) => { if (i % 2 === 0 && libre(x)) F('battement', x, 0.2 + 0.3 * i / Math.max(1, coeurs.length - 1), 0.35); });
  o.bruit(t0 + tSil - 0.9, 0.9, { vol: 0.2, type: 'bandpass', f: 300, f2: 5000, q: 2, a: 0.8 });          // souffle de pression qui monte… et se coupe net au silence
  // SILENCE DE MORT (0,35 s) : le bus du suspense tombe à zéro ; seul un filet d'air comprimé, hors bus, subsiste
  bus.gain.setValueAtTime(0.9, t0 + tSil - 0.012); bus.gain.linearRampToValueAtTime(0.0001, t0 + tSil);
  busBoom.gain.setValueAtTime(1, t0 + tSil - 0.012); busBoom.gain.linearRampToValueAtTime(0.0001, t0 + tSil);     // les queues de la rafale se taisent aussi
  if (!drame) { bus.gain.setValueAtTime(0.0001, t0 + ouvre - 0.004); bus.gain.linearRampToValueAtTime(1.0, t0 + ouvre); }   // MODE DRAME : le suspense ne revient pas (silence gêné, drameSonore prend la main)
  outilsSon(S, master, alea).bruit(t0 + tSil, ouvre - tSil, { vol: 0.018, type: 'highpass', f: 6500, a: 0.05 });
  // DÉFLAGRATION : le scellé vole. Rang ≥ 3 : EXPLOSION TITANESQUE (sub-boom de 30 Hz, deux claquements de forge, pluie d'éclats) ;
  // sinon coup sourd massif + déchirure de tôle
  if (!drame) {                                                               // MODE DRAME : ni déflagration, ni ouverture solennelle (voir drameSonore)
    if (foley && foley.titan && dets.some((x) => x.type === 'titan')) { F('titan', ouvre, 1.0, 0.75); F('rivets', ouvre + 0.01, 0.7, 0.4, 0.95); }
    else { F(['choc', 2], ouvre, 1.0, 0.7, 0.82); o.bruit(t0 + ouvre, 1.1, { vol: 0.55, type: 'lowpass', f: 160, f2: 60, a: 0.005 }); }
    F('eclatPlaque', ouvre + 0.01, 0.6, 0.6, 0.85);
  }
  // PRÉ-OUVERTURE : la tôle geint sous la contrainte, à-coups lourds (poutre, vérin, loquet)
  if (jolts.length) {
    F(['grincement', 1], arrivee + 0.5, 0.45 + rang * 0.05, 0.5, 0.92);
    jolts.forEach((tj, i) => {
      if (!libre(tj, 0.45, 0.35)) return;                                                    // la détonation couvre cet à-coup
      const f = 0.55 + 0.45 * (i / Math.max(1, jolts.length - 1));
      F(['choc', Math.min(2, Math.floor(f * 3))], tj, 0.75 * f + 0.2, 0.5, 1 + 0.03 * (i % 3));
      F('verin', tj + 0.08, 0.45 * f, 0.3, 1.1);
      if (i % 2) F(['grincement', 0], tj + 0.05, 0.38 * f, 0.4, 0.9 + 0.08 * f);
      F('rivets', tj + 0.18, 0.25 * f, 0.25, 1.15);
    });
  }
  if (!drame) {
    // la plaque-bordereau saute (scellé), puis le rideau s'enroule lame après lame
    F('eclatPlaque', ouvre, 0.85, 0.35);
    F('rideau', trappeDebut, 0.8, 0.45);
    // OUVERTURE SOLENNELLE : détente pneumatique (10 bar) et grondement grave de la structure
    F('pneumatique', trappeDebut - 0.02, 0.85, 0.55);
    o.bruit(t0 + trappeDebut, trappe - trappeDebut, { vol: 0.15, type: 'lowpass', f: 110, f2: 200, a: (trappe - trappeDebut) * 0.4 });
    // chaque plan : un vérin marque un palier du rideau, un cran de crémaillère tombe
    plans.forEach((p, i) => { F('verin', p.t0, 0.5, 0.35, 1 + 0.05 * i); F('cremaillere', p.t0 + 0.04, 0.45, 0.4, 1 + 0.04 * i); });
    const ph = plans.find((p) => p.id === 'phares'), ra = plans.find((p) => p.id === 'rasant');
    if (ph) { const x = ph.t0 + (ph.t1 - ph.t0) * 0.5; F('contacteur', x, 0.7, 0.3); F('contacteur', x + 0.14, 0.55, 0.3, 1.08); }       // INSERT 1 : les projecteurs du conteneur enclenchent
    if (ra) {                                                                                           // INSERT 3 : silhouette en lumière rasante, souffle et tôle qui travaille
      o.bruit(t0 + ra.t0, ra.t1 - ra.t0, { vol: 0.22, type: 'lowpass', f: 120, f2: 260, a: (ra.t1 - ra.t0) * 0.7 });
      o.bruit(t0 + ra.t0, ra.t1 - ra.t0, { vol: 0.07, type: 'bandpass', f: 400, f2: 1200, q: 1.2, a: (ra.t1 - ra.t0) * 0.6 });
      F(['grincement', 0], ra.t0 + (ra.t1 - ra.t0) * 0.4, 0.3, 0.5, 1.12);
    }
    F('butee', trappe, 0.75, 0.5);                                                                      // le rideau tape en fin de course
  }
  return arreterSuspense(ac, bus, busBoom, o, sources);
}
/** stop() de la bande-son du suspense : fondu de 80 ms des deux bus, puis arrêt de toutes les sources programmées. */
function arreterSuspense(ac, bus, busBoom, o, sources) {
  return () => {
    const t = ac.currentTime;
    try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); } catch (e) { /* rien */ }
    try { busBoom.gain.cancelScheduledValues(t); busBoom.gain.setValueAtTime(busBoom.gain.value, t); busBoom.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); for (const x of sources) { try { x.stop(); } catch (e) { /* déjà arrêté */ } } try { bus.disconnect(); busBoom.disconnect(); } catch (e) { /* rien */ } }, 120);
  };
}


/* ------------------------------------------------------------------------------------------------ AMBIANCES
   ambianceSonore(S, { cle, code, ouvre, bascule, arrivee, vers }) : lit d'ambiance continu, entièrement procédural.
     · phase conteneur (jusqu'à `ouvre`) : cavité métallique fermée (filtre en peigne), ronron électrique 50 Hz des néons, sifflement
       de pressurisation, micro-craquements thermiques de la tôle ; s'ouvre et s'estompe quand le rideau se lève ;
     · phase univers (à partir de `bascule`, fondu enchaîné 0,8 s) : manga/Tokyo (pluie sur asphalte détrempé, écho humide, sirènes étouffées),
       gothique/Gotham (averse lourde, tonnerre infra 30-45 Hz, vent sous les corniches), post_apo (rafales abrasives, grains minéraux),
       vintage (hall à verrière, vapeur en détente, cliquetis sur rails), pop (scintillement cristallin), blockbuster (clameur étouffée + obturateurs).
   Les événements ponctuels sont planifiés par fenêtres de 2,5 s (horloge audio) à partir d'un hasard déterministe (cle + code) : même
   bolide = même ambiance. Renvoie stop(). */
export function ambianceSonore(S, { cle = 'blockbuster', code = '', arrivee = 0.5, ouvre = 5, bascule = 11, vers = null, coupure = null, aleaBruit = null } = {}) {
  if (!S) return () => {};
  const { ac, master } = S;
  const sortie = ac.createGain(); sortie.gain.value = 1; sortie.connect(vers || master);
  const o = outilsSon(S, sortie, aleaBruit);                     // (aleaBruit : générateur à graine du MODE DRAME, sinon Math.random)
  let graine = 2166136261; for (const c of String(cle) + '|' + String(code)) graine = Math.imul(graine ^ c.charCodeAt(0), 16777619) >>> 0;
  const alea = () => { graine = (graine + 0x6D2B79F5) >>> 0; let z = graine; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
  const buf = ac.createBuffer(2, ac.sampleRate * 3, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (aleaBruit || Math.random)() * 2 - 1; }
  const sources = [], noeuds = [];
  const t0 = ac.currentTime + 0.02;
  /* source de bruit bouclée + chaîne de filtres + gain à courbe programmée [[t, gain], …] (s depuis maintenant, rampes exponentielles) */
  const lit = (filtres, courbe, { fin = null, lfo = null } = {}) => {
    const n = ac.createBufferSource(), g = ac.createGain(); n.buffer = buf; n.loop = true;
    let x = n;
    for (const [type, f, q = 0.7] of filtres) { const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; x.connect(fl); x = fl; noeuds.push(fl); }
    g.gain.setValueAtTime(0.0001, t0);
    for (const [tt, v] of courbe) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t0 + tt);
    if (lfo) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = lfo.f; lg.gain.value = lfo.a; l.connect(lg); lg.connect(g.gain); l.start(t0); sources.push(l); noeuds.push(lg); }
    x.connect(g); g.connect(sortie); n.start(t0, alea() * 2); sources.push(n); noeuds.push(g);
    return { g, n };
  };
  const tonLong = (type, f, courbe, { fc = 0, lfo = null } = {}) => {
    const s = ac.createOscillator(), g = ac.createGain(); s.type = type; s.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); for (const [tt, v] of courbe) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t0 + tt);
    let x = s; if (fc) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = fc; x.connect(fl); x = fl; noeuds.push(fl); }
    if (lfo) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = lfo.f; lg.gain.value = lfo.a; l.connect(lg); lg.connect(g.gain); l.start(t0); sources.push(l); noeuds.push(lg); }
    x.connect(g); g.connect(sortie); s.start(t0); sources.push(s); noeuds.push(g);
  };
  /* V7 : crépitement de pluie — salves de gouttes (bruit très court, filtre résonant), jamais un souffle continu.
     densite = gouttes par seconde ; planifié par fenêtres de 0,5 s à partir de `debut` (horloge audio). */
  const planifs = [];
  const gouttes = (debut, { densite = 20, vol = 0.012, f = [1500, 4000] } = {}) => {
    planifs.push({ prochain: debut + 0.2, f: (x) => {
      const n = Math.max(1, Math.round(densite * 0.5 * (0.6 + alea() * 0.8)));
      for (let k = 0; k < n; k++) {
        const tt = t0 + x + alea() * 0.5, fr = f[0] + alea() * (f[1] - f[0]);
        o.bruit(tt, 0.006 + alea() * 0.012, { vol: vol * (0.4 + alea()), type: 'bandpass', f: fr, q: 5 + alea() * 4, a: 0.0008 });
      }
      return 0.5;
    } });
  };
  const fond = Math.max(ouvre + 2.4, 3);
  /* ---- phase conteneur : cavité métallique fermée ---- */
  {
    const n = ac.createBufferSource(), g = ac.createGain(), d = ac.createDelay(0.1), fb = ac.createGain(), fl = ac.createBiquadFilter();
    n.buffer = buf; n.loop = true; d.delayTime.value = 0.0113; fb.gain.value = 0.82; fl.type = 'lowpass'; fl.frequency.value = 1500;
    n.connect(d); d.connect(fb); fb.connect(d); d.connect(fl); fl.connect(g);                                    // filtre en peigne : résonance de caisse (≈ 88 Hz et harmoniques)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.022, t0 + Math.max(0.3, arrivee)); g.gain.setValueAtTime(0.022, t0 + ouvre - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + fond);
    g.connect(sortie); n.start(t0); sources.push(n); noeuds.push(d, fb, fl, g);
  }
  // ballasts magnétiques des lampes à vapeur de sodium du hangar (secteur 50 Hz → magnétostriction à 100 Hz et harmoniques)
  // (MODE DRAME : « coupure » = l'instant où le dernier projecteur meurt ; les ballasts se taisent net avec lui)
  const ballast = (v, v2) => (coupure != null && coupure > ouvre - 0.2 ? [[Math.max(0.3, arrivee), v], [ouvre - 0.2, v], [coupure, v], [coupure + 0.04, 0.0001]] : [[Math.max(0.3, arrivee), v], [ouvre - 0.2, v], [fond, v2]]);
  tonLong('sine', 100, ballast(0.016, 0.006), { lfo: { f: 0.23, a: 0.004 } });
  tonLong('sine', 200, ballast(0.007, 0.003));
  tonLong('sine', 300, ballast(0.004, 0.0015));
  lit([['lowpass', 70, 0.7]], [[Math.max(0.3, arrivee), 0.03], [fond, 0.02]]);                                                   // ventilation de toiture, très loin
  for (let x = 0.4 + alea() * 0.6; x < fond; x += 0.7 + alea() * 1.9) {                                             // gouttes dans les flaques du béton : bulle de Minnaert (fréquence qui monte)
    const f0 = 900 + alea() * 1800, v = 0.008 + alea() * 0.012;
    o.ton('sine', f0, t0 + x, 0.03, { vol: v, a: 0.001, r: 0.04, glisse: 1.35 });
    if (alea() < 0.5) o.bruit(t0 + x, 0.012, { vol: v * 0.6, type: 'bandpass', f: f0 * 2.2, q: 4 });
  }
  // (sifflement de pressurisation retiré : souffle aigu continu jugé désagréable — « psshhh » tout le long)
  for (let x = arrivee + 0.6; x < ouvre - 0.2; x += 0.5 + alea() * 1.1) {                                           // craquements thermiques de la tôle
    const f = 1500 + alea() * 2600; o.bruit(t0 + x, 0.03 + alea() * 0.03, { vol: 0.03 + alea() * 0.05, type: 'bandpass', f, f2: f * 0.6, q: 6 });
    if (alea() < 0.4) o.metal(t0 + x + 0.02, 0.012, 1200 + alea() * 1800);                                           // la tôle « tinte » en se dilatant (frappe modale, plus de triangle)
  }
  /* ---- phase univers : lit continu + événements ---- */
  const T = Math.max(0.5, bascule), E = T + 0.8;                       // entrée en fondu enchaîné
  const planifier = { prochain: T + 0.4, f: () => {} }; planifs.push(planifier);
  const fx = {
    manga: () => {
      // V7 : plus AUCUN lit de bruit continu dans les aigus (le « psshhh » mesuré, stationnaire à ±0,4 dB, venait de là) :
      // la pluie = un corps grave qui respire + un crépitement de gouttes discrètes (transitoires résonants, intermittents)
      lit([['lowpass', 850, 0.6]], [[T, 0.0001], [E, 0.03]], { lfo: { f: 0.19, a: 0.012 } });                               // corps de la pluie, grave et mouvant
      gouttes(T, { densite: 18, vol: 0.011, f: [1800, 4200] });                                                            // crépitement sur l'asphalte détrempé
      lit([['lowpass', 380, 0.7]], [[T, 0.0001], [E, 0.07]]);                                                               // écho urbain humide, grave
      planifier.f = (x) => {                                                                                                // sirènes lointaines étouffées
        const d = 3.4, f1 = 560 + alea() * 120, ent = (u) => Math.sin(Math.PI * u);
        const s = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
        s.type = 'triangle'; fl.type = 'lowpass'; fl.frequency.value = 800; s.frequency.setValueAtTime(f1, t0 + x);
        for (let k = 1; k <= 8; k++) s.frequency.linearRampToValueAtTime(k % 2 ? f1 * 1.5 : f1, t0 + x + d * k / 8);
        g.gain.setValueAtTime(0.0001, t0 + x); g.gain.exponentialRampToValueAtTime(0.02, t0 + x + 0.8); g.gain.setValueAtTime(0.02, t0 + x + d - 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + x + d);
        s.connect(fl); fl.connect(g); g.connect(sortie); s.start(t0 + x); s.stop(t0 + x + d + 0.05); noeuds.push(s, fl, g); void ent;
        return 8 + alea() * 6;
      };
    },
    gothique: () => {
      lit([['lowpass', 900, 0.6]], [[T, 0.0001], [E, 0.05]], { lfo: { f: 0.13, a: 0.02 } });                                // averse lourde : corps grave en rafales (V7 : plus de lit aigu continu)
      gouttes(T, { densite: 26, vol: 0.014, f: [1400, 3600] });                                                            // impacts de gouttes sur les toits et le pavé
      lit([['lowpass', 260, 0.8]], [[T, 0.0001], [E, 0.1]]);
      lit([['bandpass', 520, 7]], [[T, 0.0001], [E, 0.03]], { lfo: { f: 0.17, a: 0.012 } });                                 // vent qui siffle sous les corniches
      lit([['bandpass', 1100, 9]], [[T, 0.0001], [E, 0.012]], { lfo: { f: 0.11, a: 0.008 } });
      planifier.f = (x) => {                                                                                                // tonnerre lointain : infra-basse 30-45 Hz
        const f = 30 + alea() * 15, v = 0.32 + alea() * 0.18;
        o.ton('sine', f, t0 + x, 2.4, { vol: v, a: 0.18, r: 1.6, glisse: 0.7 });
        o.ton('sine', f * 2.01, t0 + x + 0.05, 1.6, { vol: v * 0.35, a: 0.2, r: 1.2, glisse: 0.75 });
        o.bruit(t0 + x, 2.6, { vol: 0.14, type: 'lowpass', f: 380, f2: 90, a: 0.25 });
        return 6 + alea() * 6;
      };
    },
    post_apo: () => {
      lit([['bandpass', 650, 0.9]], [[T, 0.0001], [E, 0.07]], { lfo: { f: 0.13, a: 0.04 } });                                // bourrasques de vent abrasif
      lit([['bandpass', 1500, 0.7]], [[T, 0.0001], [E, 0.025]], { lfo: { f: 0.21, a: 0.015 } });
      planifier.f = (x) => {                                                                                                // grains minéraux contre la carrosserie
        for (let k = 0; k < 9; k++) o.bruit(t0 + x + k * 0.07 + alea() * 0.05, 0.02 + alea() * 0.02, { vol: 0.05 + alea() * 0.07, type: 'bandpass', f: 3000 + alea() * 3500, q: 3 });
        if (alea() < 0.3) o.ton('sine', 90 + alea() * 40, t0 + x, 1.4, { vol: 0.05, a: 0.4, r: 0.8 });
        return 0.9 + alea() * 1.8;
      };
    },
    vintage: () => {
      lit([['bandpass', 420, 0.6], ['lowpass', 2400, 0.5]], [[T, 0.0001], [E, 0.05]], { lfo: { f: 0.09, a: 0.012 } });         // souffle large de hall sous la verrière
      planifier.f = (x) => {
        if (alea() < 0.35) o.bruit(t0 + x, 0.9 + alea() * 0.6, { vol: 0.045, type: 'bandpass', f: 2200, f2: 1400, q: 0.8, a: 0.12 });   // vapeur en détente, ponctuelle et douce
        else { const f = 2800 + alea() * 800; for (let k = 0; k < 4; k++) o.metal(t0 + x + k * 0.21, 0.07, f); }                 // cliquetis thermique sur les rails
        o.ton('sine', 70 + alea() * 12, t0 + x, 1.6, { vol: 0.035, a: 0.5, r: 0.8 });
        return 1.4 + alea() * 2.2;
      };
    },
    pop: () => {
      tonLong('sine', 523.25, [[T, 0.0001], [E, 0.012]], { lfo: { f: 5.2, a: 0.003 } });                                    // nappe cristalline (do - sol - mi)
      tonLong('sine', 784, [[T, 0.0001], [E, 0.008]], { lfo: { f: 4.1, a: 0.002 } });
      tonLong('sine', 1318.5, [[T, 0.0001], [E, 0.005]]);
      planifier.f = (x) => {                                                                                                // scintillement feutré de plateau
        const gamme = [72, 76, 79, 83, 84, 88]; for (let k = 0; k < 3; k++) o.ton('sine', NOTE(gamme[(alea() * gamme.length) | 0] + 12), t0 + x + k * 0.11 + alea() * 0.05, 0.05, { vol: 0.012 + alea() * 0.01, r: 0.5 });
        return 0.5 + alea() * 0.9;
      };
    },
    blockbuster: () => {
      lit([['bandpass', 700, 0.5], ['lowpass', 2000, 0.5]], [[T, 0.0001], [E, 0.06]], { lfo: { f: 0.27, a: 0.02 } });        // clameur de foule étouffée
      lit([['bandpass', 300, 0.7]], [[T, 0.0001], [E, 0.05]]);
      planifier.f = (x) => {                                                                                                // rafales de déclenchements d'obturateurs
        const n = 2 + ((alea() * 5) | 0);
        for (let k = 0; k < n; k++) { const tt = t0 + x + k * (0.05 + alea() * 0.12); o.metal(tt, 0.09, 3300 + alea() * 900); o.bruit(tt + 0.03, 0.04, { vol: 0.05, type: 'highpass', f: 6000 }); }
        return 0.35 + alea() * 1.1;
      };
    },
  };
  (fx[cle] || fx.blockbuster)();
  /* planificateur d'événements ponctuels : fenêtre de 2,5 s, relancé toutes les secondes */
  let horloge = null, actif = true;
  const pas = () => {
    if (!actif) return;
    const maintenant = ac.currentTime - t0;
    for (const pl of planifs) while (pl.prochain < maintenant + 2.5) {
      const x = Math.max(pl.prochain, maintenant + 0.05), d = pl.f(x);
      pl.prochain = x + (typeof d === 'number' ? d : 2);
    }
  };
  horloge = setInterval(pas, 1000); pas();
  return () => {
    actif = false; clearInterval(horloge);
    const t = ac.currentTime;
    try { sortie.gain.cancelScheduledValues(t); sortie.gain.setValueAtTime(sortie.gain.value, t); sortie.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); for (const s of sources) { try { s.stop(); } catch (e) { /* déjà arrêté */ } } for (const n of noeuds) { try { n.disconnect(); } catch (e) { /* rien */ } } try { sortie.disconnect(); } catch (e) { /* rien */ } }, 160);
  };
}

/* ------------------------------------------------------------------------------------------------ MODE DRAME
   La bande-son de la chute (raretés à drapeau « drame », chronologie.js → D.drame). Tout est synthétisé, rien n'est un fichier.
   Les instants viennent de D.drame (s depuis le top départ) ; image et son lisent les mêmes repères (grésillements, néon, ampoule). */
/** Fanfare de gloire « ta-ta-TAAA » rendue hors ligne (pour être ralentie à la manière d'une bande qu'on arrête) : trois accords de
 *  cuivres en ut majeur (dents de scie additives à brillance qui s'ouvre), deux coups de timbale, une cymbale. Mono, déterministe. */
export function rendreFanfare(sr, germe = 7) {
  const n = Math.round(1.8 * sr), out = new Float32Array(n);
  let a = germe >>> 0 || 1; const alea = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 * 2 - 1; };
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const accords = [[0, 0.1, [60, 64, 67]], [0.13, 0.1, [60, 64, 67]], [0.26, 1.3, [60, 67, 72, 76, 79]]];
  for (const [t0, du, notes] of accords) {
    notes.forEach((m, j) => {
      const f = NOTE(m) * (1 + 0.003 * (j % 2 ? 1 : -1)), i0 = Math.round(t0 * sr), L = Math.min(n - i0, Math.round((du + 0.25) * sr));
      for (let i = 0; i < L; i++) {
        const t = i / sr, env = Math.min(1, t / 0.025) * (t < du ? 1 : Math.exp(-(t - du) / 0.08)), br = 0.35 + 0.65 * Math.min(1, t / 0.12);
        let v = 0; for (let k = 1; k <= 10; k++) v += Math.sin(2 * Math.PI * f * k * t + k) / k * Math.pow(br, k * 0.35);
        out[i0 + i] += v * env * 0.11;
      }
    });
  }
  for (const [t0, g] of [[0, 0.6], [0.26, 1]]) {                       // timbales : sinus qui descend, peau frappée
    const i0 = Math.round(t0 * sr); let ph = 0;
    for (let i = 0; i < Math.min(n - i0, sr); i++) { const t = i / sr; ph += 2 * Math.PI * (98 + 30 * Math.exp(-t / 0.05)) / sr; out[i0 + i] += Math.sin(ph) * Math.exp(-t / 0.35) * g * 0.5 + alea() * Math.exp(-t / 0.01) * g * 0.15; }
  }
  { const i0 = Math.round(0.26 * sr); let lp = 0; for (let i = 0; i < n - i0; i++) { const t = i / sr, x = alea(); lp += (x - lp) * 0.6; out[i0 + i] += (x - lp) * Math.exp(-t / 0.9) * 0.22; } }   // cymbale
  let c = 0; for (let i = 0; i < n; i++) c = Math.max(c, Math.abs(out[i]));
  if (c > 0) for (let i = 0; i < n; i++) out[i] *= 0.85 / c;
  return out;
}
export function drameSonore(S, { DR, vers = null, foley = null, foleyDrame = null, salle = null, tSeuil = null, alea = null } = {}) {
  if (!S || !DR) return () => {};
  if (DR.scenario === 'crash') return drameCrashSonore(S, { DR, vers, foley, salle, alea });
  const { ac, master } = S;
  const bus = ac.createGain(); bus.gain.value = 1; bus.connect(vers || master);
  const o = outilsSon(S, bus, alea), t0 = ac.currentTime + 0.02, sources = [];
  const B = (banque, nom, t, gain = 1, envoi = 0.35, vitesse = 1) => {      // un bruitage d'une banque (tableau → [nom, index])
    if (!banque) return null;
    const [k, i] = Array.isArray(nom) ? nom : [nom, 0], b = Array.isArray(banque[k]) ? banque[k][i % banque[k].length] : banque[k];
    if (!b) return null;
    const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = b; src.playbackRate.value = vitesse; g.gain.value = gain;
    src.connect(g); g.connect(bus); if (salle && envoi > 0) { const e = ac.createGain(); e.gain.value = envoi; g.connect(e); e.connect(salle.entree); }
    src.start(t0 + Math.max(0, t)); sources.push(src); return src;
  };
  const T = (t) => t0 + t;
  // 1. PÉTARD MOUILLÉ : « pfft » (souffle qui s'étouffe 900 → 300 Hz), la mèche crachote, trois étincelles retombent en tintant
  o.bruit(T(DR.petard), 0.38, { vol: 0.32, type: 'bandpass', f: 900, f2: 300, q: 1.4, a: 0.01 });
  o.bruit(T(DR.petard + 0.02), 0.25, { vol: 0.16, type: 'lowpass', f: 420, a: 0.004 });
  for (const d of [0.06, 0.13, 0.21]) o.bruit(T(DR.petard + d), 0.012, { vol: 0.12, type: 'highpass', f: 5200 });
  (DR.tintements || [0.55, 0.63, 0.71].map((d) => DR.petard + d)).forEach((x, i) => o.metal(T(x), 0.035, [6200, 5600, 6900][i % 3]));   // (instants calés par le reveal sur la chute réelle des étincelles)
  // 2. la fanfare de gloire part… et la bande s'arrête : vitesse ET hauteur chutent ensemble jusqu'à zéro (0,8 s)
  {
    const d = rendreFanfare(ac.sampleRate), b = ac.createBuffer(1, d.length, ac.sampleRate), c = b.getChannelData(0); if (c && c.set) c.set(d);
    const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = b; src.connect(g); g.connect(bus);
    const [a1, a2] = DR.tapeStop;
    src.playbackRate.setValueAtTime(1, T(a1)); src.playbackRate.exponentialRampToValueAtTime(0.03, T(a2));
    g.gain.setValueAtTime(0.0001, T(DR.petard)); g.gain.exponentialRampToValueAtTime(0.55, T(DR.petard) + 0.01);
    g.gain.setValueAtTime(0.55, T(a2 - 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, T(a2) + 0.02);
    src.start(T(DR.petard)); src.stop(T(a2) + 0.1); sources.push(src);
    o.ton('sine', 55, T(a2 - 0.05), 0.12, { vol: 0.12, glisse: 0.5 });          // le cabestan s'arrête : petit « thunk »
  }
  // 3. les projecteurs grésillent (arcs de ballast) puis claquent un par un ; le néon bourdonne à chaque allumage ; l'ampoule nue
  DR.gresillements.forEach((segs, k) => {
    for (const [a] of segs) o.bruit(T(a), 0.014, { vol: 0.16, type: 'bandpass', f: 2600 + 700 * k, q: 3 });
    o.ton('sawtooth', 100, T(segs[0][0]), DR.gresillement, { vol: 0.03, fc: 900 });
    if (!B(foley, 'contacteur', DR.extinctions[k], 0.32, 0.3, 0.8 + 0.06 * k)) o.metal(T(DR.extinctions[k]), 0.2, 1500 - 120 * k);
    o.ton('sine', 140 - 15 * k, T(DR.extinctions[k]), 0.06, { vol: 0.08, glisse: 0.4 });    // le filament se coupe : « tunk »
  });
  for (const [a, b] of DR.neonSegments) { o.ton('sawtooth', 120, T(a), Math.max(0.02, b - a), { vol: 0.022, fc: 1600, r: 0.01 }); o.bruit(T(a), 0.008, { vol: 0.08, type: 'highpass', f: 4000 }); }
  for (const [a, b] of DR.ampouleSegments) { o.bruit(T(a), 0.01, { vol: 0.07, type: 'bandpass', f: 3400, q: 4 }); if (b < 1e8) o.ton('sine', 50, T(a), b - a, { vol: 0.012 }); }
  o.metal(T(DR.ampouleTient), 0.05, 3600);                                     // le filament tient : « tink »
  { const h = ac.createOscillator(), g = ac.createGain(); h.type = 'sine'; h.frequency.value = 100; g.gain.setValueAtTime(0.0001, T(DR.ampouleTient)); g.gain.exponentialRampToValueAtTime(0.006, T(DR.ampouleTient) + 0.3); h.connect(g); g.connect(bus); h.start(T(DR.ampouleTient)); sources.push(h); }
  // 4. silence gêné : un grillon (stridulations de quatre pulsations à 4,6 kHz), deux gouttes d'eau (bulles de Minnaert)
  for (const x of DR.grillon) for (let p = 0; p < 4; p++) { o.ton('sine', 4600, T(x + p * 0.045), 0.02, { vol: 0.045, a: 0.003, r: 0.012 }); o.ton('sine', 9200, T(x + p * 0.045), 0.015, { vol: 0.008, a: 0.003, r: 0.01 }); }
  DR.gouttes.forEach((x, i) => { const f0 = 1150 + 380 * i; o.ton('sine', f0, T(x), 0.035, { vol: 0.07, a: 0.001, r: 0.05, glisse: 1.55 }); o.bruit(T(x), 0.012, { vol: 0.04, type: 'bandpass', f: f0 * 2.2, q: 4 }); });
  // 5. le badge se fissure (craquements de céramique), chaque losange tombe en tintant sur un « wah », la plaque cède, l'Épave s'abat
  DR.fissures.forEach((x, i) => { o.bruit(T(x), 0.05 + 0.02 * i, { vol: 0.24 + 0.06 * i, type: 'highpass', f: 2800 }); o.metal(T(x + 0.005), 0.1, 5200 - 300 * i); });
  tromboneTriste(o, T(DR.trombone[0][0]), DR.trombone.map(([t, d]) => [t - DR.trombone[0][0], d]));
  DR.losanges.forEach((x, i) => o.metal(T(x), 0.18, [4200, 3700, 3200, 2700][i % 4]));
  if (!B(foley, 'eclatPlaque', DR.badgeChute, 0.55, 0.4, 1.15)) o.bruit(T(DR.badgeChute), 0.3, { vol: 0.3, type: 'highpass', f: 2000 });
  B(foley, ['choc', 1], DR.badgeEpave, 0.7, 0.45, 1.1); o.metal(T(DR.badgeEpave), 0.3, 900);
  o.ton('sine', 110, T(DR.tampon), 0.08, { vol: 0.8, glisse: 0.5 }); o.bruit(T(DR.tampon), 0.08, { vol: 0.5, type: 'lowpass', f: 900 });   // KA-CHUNK du tampon
  // 6. le rideau se coince : trois à-coups, blocage qui grince, une lame se décroche (clac) et tombe sur le béton (CLONK), fin pénible
  DR.crans.forEach(([x], i) => B(foleyDrame, ['acoup', i], x, 0.85, 0.45));
  B(foleyDrame, 'coince', DR.blocage, 0.8, 0.45);
  o.metal(T(DR.lame[0]), 0.35, 1400);
  B(foleyDrame, 'lame', DR.lame[1], 1.0, 0.6);
  B(foleyDrame, 'fin', DR.fin[0], 0.8, 0.45, 0.94);
  // 7. l'enjoliveur, arraché par le choc du seuil, roule puis tourne en toupie avant de se coucher
  if (tSeuil != null) B(foleyDrame, 'enjoliveur', tSeuil + 0.02, 0.75, 0.35);
  return () => {
    const t = ac.currentTime;
    try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); for (const x of sources) { try { x.stop(); } catch (e) { /* déjà arrêté */ } } try { bus.disconnect(); } catch (e) { /* rien */ } }, 140);
  };
}

/** MODE DRAME, scénario « crash » (N13) : réacteur en vol (sifflement de turbine + grondement + vent, passage Doppler au survol),
 *  bips de verrouillage puis tonalité continue, bourdonnement du drone kamikaze, explosion en vol, sifflement de chute, impacts
 *  sur le béton, raclement de la glissade, grillon, trombone triste, tampon, puis l'ouverture du conteneur… vide. Renvoie stop(). */
export function drameCrashSonore(S, { DR, vers = null, foley = null, salle = null, alea = null } = {}) {
  const { ac, master } = S;
  const bus = ac.createGain(); bus.gain.value = 1; bus.connect(vers || master);
  const o = outilsSon(S, bus, alea), t0 = ac.currentTime + 0.02, T = (t) => t0 + t, sources = [];
  let g = 31337; const al = () => ((g = (g * 1664525 + 1013904223) >>> 0) / 4294967296);
  const B = (nom, t, gain = 1, envoi = 0.35, vitesse = 1) => {
    if (!foley) return null;
    const [k, i] = Array.isArray(nom) ? nom : [nom, 0], b = Array.isArray(foley[k]) ? foley[k][i % foley[k].length] : foley[k];
    if (!b) return null;
    const src = ac.createBufferSource(), gg = ac.createGain(); src.buffer = b; src.playbackRate.value = vitesse; gg.gain.value = gain;
    src.connect(gg); gg.connect(bus); if (salle && envoi > 0) { const e = ac.createGain(); e.gain.value = envoi; gg.connect(e); e.connect(salle.entree); }
    src.start(t0 + Math.max(0, t)); sources.push(src); return src;
  };
  const [p1, p2, p3] = DR.plans, I = DR.impact;
  // 1. le réacteur : turbine (deux sinus désaccordés qui sifflent), grondement (dent de scie filtrée), souffle ; Doppler au survol
  {
    const tu1 = ac.createOscillator(), tu2 = ac.createOscillator(), gr = ac.createOscillator(), lp = ac.createBiquadFilter(), gT = ac.createGain(), gG = ac.createGain();
    tu1.type = 'sine'; tu2.type = 'sine'; gr.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.8;
    const fT = (t, f) => { tu1.frequency.exponentialRampToValueAtTime(f, T(t)); tu2.frequency.exponentialRampToValueAtTime(f * 1.013, T(t)); gr.frequency.exponentialRampToValueAtTime(f / 30, T(t)); };
    tu1.frequency.setValueAtTime(3100, T(DR.coupe)); tu2.frequency.setValueAtTime(3140, T(DR.coupe)); gr.frequency.setValueAtTime(103, T(DR.coupe));
    fT(p1.t1, 3300); fT(DR.passage - 0.35, 3800); fT(DR.passage + 0.35, 2500); fT(p2.t1, 3000); fT(I - 0.02, 3250);
    gT.gain.setValueAtTime(0.0001, T(DR.coupe)); gT.gain.exponentialRampToValueAtTime(0.05, T(DR.coupe) + 0.03);
    gT.gain.setValueAtTime(0.05, T(DR.passage - 0.6)); gT.gain.exponentialRampToValueAtTime(0.11, T(DR.passage)); gT.gain.exponentialRampToValueAtTime(0.035, T(DR.passage + 0.7));
    gT.gain.setValueAtTime(0.035, T(I - 0.03)); gT.gain.exponentialRampToValueAtTime(0.0001, T(I) + 0.02);
    gG.gain.setValueAtTime(0.0001, T(DR.coupe)); gG.gain.exponentialRampToValueAtTime(0.16, T(DR.coupe) + 0.02);
    gG.gain.setValueAtTime(0.16, T(DR.passage - 0.6)); gG.gain.exponentialRampToValueAtTime(0.3, T(DR.passage)); gG.gain.exponentialRampToValueAtTime(0.12, T(DR.passage + 0.7));
    gG.gain.setValueAtTime(0.12, T(I - 0.03)); gG.gain.exponentialRampToValueAtTime(0.0001, T(I) + 0.02);
    tu1.connect(gT); tu2.connect(gT); gr.connect(lp); lp.connect(gG); gT.connect(bus); gG.connect(bus);
    for (const x of [tu1, tu2, gr]) { x.start(T(DR.coupe)); x.stop(T(I) + 0.1); sources.push(x); }
  }
  o.bruit(T(DR.coupe), I - DR.coupe, { vol: 0.13, type: 'bandpass', f: 700, f2: 1100, q: 0.6, a: 0.02 });                 // vent de vitesse
  o.bruit(T(DR.passage - 0.7), 1.4, { vol: 0.28, type: 'bandpass', f: 2600, f2: 500, q: 0.7, a: 0.6 });                    // le souffle du survol
  // 2. verrouillage : bips de plus en plus serrés, puis tonalité continue
  for (const x of DR.alerte) o.ton('square', 1950, T(x), 0.06, { vol: 0.06, fc: 4200, r: 0.01 });
  o.ton('square', 1950, T(DR.verrou[0]), DR.verrou[1] - DR.verrou[0], { vol: 0.06, fc: 4200, r: 0.01 });
  // 3. le drone : quatre hélices (dents de scie désaccordées, battement de pales), qui enfle jusqu'à l'impact
  [196, 211, 229, 247].forEach((f, i) => o.ton('sawtooth', f, T(DR.drone), I - DR.drone, { vol: 0.012 + 0.004 * i, a: (I - DR.drone) * 0.9, r: 0.01, fc: 1800, vib: 0.03, vibF: 23 + i * 3 }));
  // 4. explosion en vol : déflagration titanesque, débris, crépitements ; puis le sifflement de la chute
  if (!B('titan', I, 1.0, 0.6)) o.bruit(T(I), 1.5, { vol: 0.8, type: 'lowpass', f: 900, f2: 60, a: 0.003 });
  B('rivets', I + 0.05, 0.6, 0.3, 0.9);
  for (let i = 0; i < 14; i++) o.bruit(T(I + 0.15 + al() * 1.4), 0.02 + al() * 0.03, { vol: 0.05 + al() * 0.06, type: 'highpass', f: 2500 + al() * 3000 });
  o.ton('sine', 1700, T(I + 0.25), DR.retour - I - 0.3, { vol: 0.05, glisse: 0.22, a: 0.2, r: 0.05 });
  o.bruit(T(I + 0.2), DR.retour - I - 0.2, { vol: 0.12, type: 'bandpass', f: 900, f2: 2600, q: 0.8, a: 0.8 });
  // 5. le crash : deux impacts sur le béton, raclement de la glissade (de plus en plus faible), cliquetis de ferraille
  B(['choc', 2], DR.sol[0], 1.0, 0.7, 0.9); B('eclatPlaque', DR.sol[0] + 0.02, 0.5, 0.4, 0.8);
  B(['choc', 1], DR.sol[1], 0.8, 0.6, 0.95);
  for (let x = DR.sol[1] + 0.02, i = 0; x < DR.arret - 0.2; x += 0.55, i++) B('raclement', x, 0.75 * (1 - (x - DR.sol[1]) / (DR.arret - DR.sol[1])) + 0.1, 0.4, 0.9 + 0.05 * (i % 3));
  o.bruit(T(DR.sol[1]), DR.arret - DR.sol[1], { vol: 0.2, type: 'bandpass', f: 1800, f2: 600, q: 1.2, a: 0.02 });
  for (let i = 0; i < 8; i++) o.metal(T(DR.sol[1] + 0.1 + al() * (DR.arret - DR.sol[1])), 0.06 + 0.06 * al(), 1800 + al() * 2600);
  B(['choc', 0], DR.arret, 0.45, 0.4, 1.2); o.metal(T(DR.arret + 0.35), 0.05, 4200);
  // 6. silence gêné, trombone, le badge cède, Épave, tampon
  for (const x of DR.grillon) for (let p = 0; p < 4; p++) o.ton('sine', 4600, T(x + p * 0.045), 0.02, { vol: 0.045, a: 0.003, r: 0.012 });
  DR.fissures.forEach((x, i) => { o.bruit(T(x), 0.05 + 0.02 * i, { vol: 0.2 + 0.05 * i, type: 'highpass', f: 2800 }); o.metal(T(x + 0.005), 0.08, 5200 - 300 * i); });
  tromboneTriste(o, T(DR.trombone[0][0]), DR.trombone.map(([t, d]) => [t - DR.trombone[0][0], d]));
  DR.losanges.forEach((x, i) => o.metal(T(x), 0.18, [4200, 3700, 3200, 2700][i % 4]));
  if (!B('eclatPlaque', DR.badgeChute, 0.55, 0.4, 1.15)) o.bruit(T(DR.badgeChute), 0.3, { vol: 0.3, type: 'highpass', f: 2000 });
  B(['choc', 1], DR.badgeEpave, 0.7, 0.45, 1.1); o.metal(T(DR.badgeEpave), 0.3, 900);
  o.ton('sine', 110, T(DR.tampon), 0.08, { vol: 0.8, glisse: 0.5 }); o.bruit(T(DR.tampon), 0.08, { vol: 0.5, type: 'lowpass', f: 900 });
  // 7. le conteneur s'ouvre… sur rien : détente pneumatique, rideau, butée, et un grillon dans le vide
  B('pneumatique', DR.rideau[0] - 0.02, 0.8, 0.5); B('rideau', DR.rideau[0], 0.8, 0.45); B('butee', DR.rideau[1], 0.7, 0.5);
  for (let p = 0; p < 4; p++) o.ton('sine', 4400, T(DR.rideau[1] + 0.45 + p * 0.05), 0.02, { vol: 0.05, a: 0.003, r: 0.012 });
  return () => {
    const t = ac.currentTime;
    try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); for (const x of sources) { try { x.stop(); } catch (e) { /* déjà arrêté */ } } try { bus.disconnect(); } catch (e) { /* rien */ } }, 140);
  };
}
