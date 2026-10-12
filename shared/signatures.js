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
  };
  return (nom) => { if (!cache.has(nom)) cache.set(nom, faire(nom, D[nom] || D.doux)); return cache.get(nom); };
}

/* ================================================================== instruments Web Audio */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
export function outilsSon(S, sortie = null) {
  const { ac, master } = S;
  const bus = sortie || master;
  let bufBruit = null;
  const vivants = [];                   // nœuds programmés, purgés quand ils sont finis (tenues longues sans fuite)
  const garder = (n, fin) => { vivants.push([n, fin]); if (vivants.length > 400) { const t = ac.currentTime; for (let i = vivants.length - 1; i >= 0; i--) if (vivants[i][1] < t - 0.5) vivants.splice(i, 1); } return n; };
  const bruitBuf = () => { if (bufBruit) return bufBruit; const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (bufBruit = b); };
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
    n.connect(fl); fl.connect(v); v.connect(vers); n.start(t, Math.random()); n.stop(t + d + 0.05); garder(n, t + d);
  }
  const accord = (type, notes, t, d, o = {}) => notes.forEach((n, i) => ton(type, NOTE(n), t, d, { detune: (i % 2 ? 7 : -7), ...o }));
  const kick = (t, v = 0.9) => ton('sine', 150, t, 0.16, { vol: v, a: 0.002, r: 0.12, glisse: 0.28 });
  const caisse = (t, v = 0.35) => { bruit(t, 0.16, { vol: v, type: 'bandpass', f: 1900, q: 0.6 }); ton('triangle', 190, t, 0.08, { vol: v * 0.6, r: 0.05 }); };
  const charley = (t, v = 0.12) => bruit(t, 0.05, { vol: v, f: 8000 });
  const clap = (t, v = 0.3) => { for (let i = 0; i < 3; i++) bruit(t + i * 0.011, 0.09, { vol: v, type: 'bandpass', f: 1300, q: 1.2 }); };
  const metal = (t, v = 0.4, f = 2600) => { bruit(t, 0.12, { vol: v, type: 'bandpass', f, q: 9 }); ton('square', f * 0.31, t, 0.05, { vol: v * 0.25, r: 0.15, fc: 4000 }); ton('sine', f * 0.77, t, 0.02, { vol: v * 0.3, r: 0.4 }); };
  const arreter = () => { for (const [n] of vivants) { try { n.stop(); } catch (e) { /* déjà arrêté */ } } vivants.length = 0; };
  return { ac, ton, bruit, accord, kick, caisse, charley, clap, metal, NOTE, arreter };
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
  levee_de_fonds: (o, t) => { [76, 83, 88].forEach((n, i) => o.ton('sine', o.NOTE(n), t + i * 0.09, 0.05, { vol: 0.18, r: 0.35 })); o.metal(t + 0.3, 0.4, 3300); o.ton('sine', 2637, t + 0.34, 0.02, { vol: 0.2, r: 0.5 }); return 0.75; },
};
export const NOMS_JINGLES = Object.keys(JINGLES);
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
export function suspenseSonore(S, { arrivee, paliers, ouvre, trappeDebut, trappe, rang = 0, jolts = [], plans = [], battements = null, silence = null, vers = null, foley = null, salle = null }) {
  if (!S) return () => {};
  const { ac, master } = S;
  const bus = ac.createGain(); bus.gain.value = 0.9; bus.connect(vers || master);
  const o = outilsSon(S, bus);
  const t0 = ac.currentTime + 0.02;
  const sources = [];
  /** joue un bruitage de la banque : nom (ou [nom, index]), instant (s), gain, part envoyée au hangar, vitesse de lecture */
  const F = (nom, t, gain = 1, envoi = 0.4, vitesse = 1) => {
    if (!foley) return;
    const [k, i] = Array.isArray(nom) ? nom : [nom, 0];
    const b = Array.isArray(foley[k]) ? foley[k][i % foley[k].length] : foley[k];
    if (!b) return;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = b; src.playbackRate.value = vitesse; g.gain.value = gain;
    src.connect(g); g.connect(bus);
    if (salle && envoi > 0) { const e = ac.createGain(); e.gain.value = envoi; g.connect(e); e.connect(salle.entree); }
    src.start(t0 + Math.max(0, t)); sources.push(src);
  };
  // atterrissage : le conteneur touche les cales, rebondit, les chaînes retombent, deux verrous tournants s'enclenchent
  F('atterrissage', arrivee, 1, 0.5);
  // grondement du hangar sous le plancher (bruit filtré, pas de sinus), qui enfle jusqu'à l'ouverture
  const dur = ouvre - arrivee;
  o.bruit(t0 + arrivee, dur + 0.4, { vol: 0.13 + rang * 0.03, type: 'lowpass', f: 95, f2: 140, a: dur * 0.6 });
  o.bruit(t0 + arrivee + 0.3, dur, { vol: 0.04 + rang * 0.01, type: 'bandpass', f: 220, f2: 380, q: 1.1, a: dur * 0.7 });
  // chaque palier de rareté : une chaîne se tend, un cran de crémaillère, un verrou qui cède et des rivets qui craquent
  paliers.forEach((p, i) => {
    F('chaine', p - 0.35, 0.55 + i * 0.08, 0.45, 1 - i * 0.04);
    F(['verrou', i], p, 0.7 + i * 0.07, 0.45, 1 + i * 0.03);
    F('rivets', p + 0.12, 0.45 + i * 0.06, 0.3, 1 + i * 0.05);
  });
  // CŒUR : battement infra (45 → 35 Hz) de 55 à 130 BPM, rendu hors ligne ; sous lui, une montée de Shepard qui ne finit jamais
  const tSil = silence ?? ouvre - 0.35;
  const coeurs = battements || (() => { const b = []; for (let x = arrivee + 0.3; x < tSil - 0.05;) { b.push(x); const u = Math.min(1, (x - arrivee) / Math.max(0.1, tSil - arrivee)); x += 60 / (55 + 75 * Math.pow(u, 1.5)); } return b; })();
  if (coeurs.length) sources.push(jouerTampon(ac, rendreBattements(ac.sampleRate, coeurs.map((x) => x - arrivee), tSil - arrivee + 0.02), t0 + arrivee, bus, 0.9));
  if (tSil - arrivee > 1) {
    const sh = ac.createBiquadFilter(); sh.type = 'lowpass'; sh.frequency.value = 1400; sh.connect(bus);
    sources.push(jouerTampon(ac, rendreShepard(ac.sampleRate, tSil - arrivee - 0.3), t0 + arrivee + 0.3, sh, 0.35 + 0.1 * rang));
  }
  // la cuve d'acier résonne sous les coups (un coup de masse sur deux battements, de plus en plus fort)
  coeurs.forEach((x, i) => { if (i % 2 === 0) F('battement', x, 0.2 + 0.3 * i / Math.max(1, coeurs.length - 1), 0.35); });
  o.bruit(t0 + tSil - 0.9, 0.9, { vol: 0.2, type: 'bandpass', f: 300, f2: 5000, q: 2, a: 0.8 });          // souffle de pression qui monte… et se coupe net au silence
  // SILENCE DE MORT (0,35 s) : le bus du suspense tombe à zéro ; seul un filet d'air comprimé, hors bus, subsiste
  bus.gain.setValueAtTime(0.9, t0 + tSil - 0.012); bus.gain.linearRampToValueAtTime(0.0001, t0 + tSil);
  bus.gain.setValueAtTime(0.0001, t0 + ouvre - 0.004); bus.gain.linearRampToValueAtTime(1.0, t0 + ouvre);
  outilsSon(S, master).bruit(t0 + tSil, ouvre - tSil, { vol: 0.018, type: 'highpass', f: 6500, a: 0.05 });
  // DÉFLAGRATION : coup sourd massif + déchirure de tôle au moment où le scellé vole
  F(['choc', 2], ouvre, 1.0, 0.7, 0.82); F('eclatPlaque', ouvre + 0.01, 0.6, 0.6, 0.85);
  o.bruit(t0 + ouvre, 1.1, { vol: 0.55, type: 'lowpass', f: 160, f2: 60, a: 0.005 });
  // à chaque palier : jet de vapeur sous pression (sifflement sec) depuis les montants
  paliers.forEach((p, i) => { F('pneumatique', p + 0.05, 0.28 + 0.04 * i, 0.3, 1.7 + 0.08 * i); });
  // PRÉ-OUVERTURE : la tôle geint sous la contrainte, à-coups lourds (poutre, vérin, loquet)
  if (jolts.length) {
    F(['grincement', 1], arrivee + 0.5, 0.45 + rang * 0.05, 0.5, 0.92);
    jolts.forEach((tj, i) => {
      const f = 0.55 + 0.45 * (i / Math.max(1, jolts.length - 1));
      F(['choc', Math.min(2, Math.floor(f * 3))], tj, 0.75 * f + 0.2, 0.5, 1 + 0.03 * (i % 3));
      F('verin', tj + 0.08, 0.45 * f, 0.3, 1.1);
      if (i % 2) F(['grincement', 0], tj + 0.05, 0.38 * f, 0.4, 0.9 + 0.08 * f);
      F('rivets', tj + 0.18, 0.25 * f, 0.25, 1.15);
    });
  }
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
  return () => {
    const t = ac.currentTime;
    try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); for (const x of sources) { try { x.stop(); } catch (e) { /* déjà arrêté */ } } try { bus.disconnect(); } catch (e) { /* rien */ } }, 120);
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
export function ambianceSonore(S, { cle = 'blockbuster', code = '', arrivee = 0.5, ouvre = 5, bascule = 11, vers = null } = {}) {
  if (!S) return () => {};
  const { ac, master } = S;
  const sortie = ac.createGain(); sortie.gain.value = 1; sortie.connect(vers || master);
  const o = outilsSon(S, sortie);
  let graine = 2166136261; for (const c of String(cle) + '|' + String(code)) graine = Math.imul(graine ^ c.charCodeAt(0), 16777619) >>> 0;
  const alea = () => { graine = (graine + 0x6D2B79F5) >>> 0; let z = graine; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
  const buf = ac.createBuffer(2, ac.sampleRate * 3, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
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
  const fond = Math.max(ouvre + 2.4, 3);
  /* ---- phase conteneur : cavité métallique fermée ---- */
  {
    const n = ac.createBufferSource(), g = ac.createGain(), d = ac.createDelay(0.1), fb = ac.createGain(), fl = ac.createBiquadFilter();
    n.buffer = buf; n.loop = true; d.delayTime.value = 0.0113; fb.gain.value = 0.82; fl.type = 'lowpass'; fl.frequency.value = 1500;
    n.connect(d); d.connect(fb); fb.connect(d); d.connect(fl); fl.connect(g);                                    // filtre en peigne : résonance de caisse (≈ 88 Hz et harmoniques)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + Math.max(0.3, arrivee)); g.gain.setValueAtTime(0.05, t0 + ouvre - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + fond);
    g.connect(sortie); n.start(t0); sources.push(n); noeuds.push(d, fb, fl, g);
  }
  // ballasts magnétiques des lampes à vapeur de sodium du hangar (secteur 50 Hz → magnétostriction à 100 Hz et harmoniques)
  tonLong('sine', 100, [[Math.max(0.3, arrivee), 0.016], [ouvre - 0.2, 0.016], [fond, 0.006]], { lfo: { f: 0.23, a: 0.004 } });
  tonLong('sine', 200, [[Math.max(0.3, arrivee), 0.007], [ouvre - 0.2, 0.007], [fond, 0.003]]);
  tonLong('sine', 300, [[Math.max(0.3, arrivee), 0.004], [ouvre - 0.2, 0.004], [fond, 0.0015]]);
  lit([['lowpass', 70, 0.7]], [[Math.max(0.3, arrivee), 0.03], [fond, 0.02]]);                                                   // ventilation de toiture, très loin
  for (let x = 0.4 + alea() * 0.6; x < fond; x += 0.7 + alea() * 1.9) {                                             // gouttes dans les flaques du béton : bulle de Minnaert (fréquence qui monte)
    const f0 = 900 + alea() * 1800, v = 0.008 + alea() * 0.012;
    o.ton('sine', f0, t0 + x, 0.03, { vol: v, a: 0.001, r: 0.04, glisse: 1.35 });
    if (alea() < 0.5) o.bruit(t0 + x, 0.012, { vol: v * 0.6, type: 'bandpass', f: f0 * 2.2, q: 4 });
  }
  lit([['highpass', 5200, 0.5]], [[Math.max(0.4, arrivee), 0.004], [ouvre - 0.3, 0.02], [ouvre + 0.6, 0.03], [fond, 0.0001]]);        // sifflement de pressurisation
  for (let x = arrivee + 0.6; x < ouvre - 0.2; x += 0.5 + alea() * 1.1) {                                           // craquements thermiques de la tôle
    const f = 1500 + alea() * 2600; o.bruit(t0 + x, 0.03 + alea() * 0.03, { vol: 0.03 + alea() * 0.05, type: 'bandpass', f, f2: f * 0.6, q: 6 });
    if (alea() < 0.4) o.ton('triangle', 300 + alea() * 500, t0 + x + 0.02, 0.05, { vol: 0.018, glisse: 0.7, r: 0.05 });
  }
  /* ---- phase univers : lit continu + événements ---- */
  const T = Math.max(0.5, bascule), E = T + 0.8;                       // entrée en fondu enchaîné
  const planifier = { prochain: T + 0.4, f: () => {} };
  const fx = {
    manga: () => {
      lit([['highpass', 1500, 0.6], ['lowpass', 8000, 0.5]], [[T, 0.0001], [E, 0.1]]);                                      // pluie dense
      lit([['bandpass', 3600, 0.9]], [[T, 0.0001], [E, 0.05]], { lfo: { f: 0.31, a: 0.015 } });                              // grésillement de l'asphalte détrempé
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
      lit([['highpass', 900, 0.6], ['lowpass', 6500, 0.5]], [[T, 0.0001], [E, 0.17]]);                                      // averse torrentielle lourde
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
      lit([['bandpass', 650, 0.9]], [[T, 0.0001], [E, 0.12]], { lfo: { f: 0.13, a: 0.07 } });                                // bourrasques de vent abrasif
      lit([['bandpass', 1500, 0.7]], [[T, 0.0001], [E, 0.06]], { lfo: { f: 0.21, a: 0.04 } });
      lit([['highpass', 5000, 0.5]], [[T, 0.0001], [E, 0.03]], { lfo: { f: 0.37, a: 0.02 } });
      planifier.f = (x) => {                                                                                                // grains minéraux contre la carrosserie
        for (let k = 0; k < 9; k++) o.bruit(t0 + x + k * 0.07 + alea() * 0.05, 0.02 + alea() * 0.02, { vol: 0.05 + alea() * 0.07, type: 'bandpass', f: 3000 + alea() * 3500, q: 3 });
        if (alea() < 0.3) o.ton('sine', 90 + alea() * 40, t0 + x, 1.4, { vol: 0.05, a: 0.4, r: 0.8 });
        return 0.9 + alea() * 1.8;
      };
    },
    vintage: () => {
      lit([['bandpass', 420, 0.6], ['lowpass', 2400, 0.5]], [[T, 0.0001], [E, 0.05]], { lfo: { f: 0.09, a: 0.012 } });         // souffle large de hall sous la verrière
      lit([['highpass', 3800, 0.5]], [[T, 0.0001], [E, 0.02]]);                                                              // chuintement permanent de vapeur
      planifier.f = (x) => {
        if (alea() < 0.55) o.bruit(t0 + x, 1.3 + alea(), { vol: 0.12, type: 'highpass', f: 3200, f2: 1600, a: 0.12 });           // vapeur en détente
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
    while (planifier.prochain < maintenant + 2.5) {
      const x = Math.max(planifier.prochain, maintenant + 0.05), d = planifier.f(x);
      planifier.prochain = x + (typeof d === 'number' ? d : 2);
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
