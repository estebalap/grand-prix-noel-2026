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
};
export const NOMS_JINGLES = Object.keys(JINGLES);
export function jingleEntree(nom, S, quand = 0) {
  if (!S) return 0;
  const o = outilsSon(S);
  return (JINGLES[nom] || JINGLES.gong)(o, S.ac.currentTime + 0.01 + quand);
}

/* ================================================================== bande-son de la montée en suspense */
/** repères (s depuis maintenant) : { arrivee, paliers:[s…], ouvre, trappeDebut, trappe, rang (0 à 4) }. Renvoie stop(). */
export function suspenseSonore(S, { arrivee, paliers, ouvre, trappeDebut, trappe, rang = 0 }) {
  if (!S) return () => {};
  const { ac, master } = S;
  const bus = ac.createGain(); bus.gain.value = 0.9; bus.connect(master);
  const o = outilsSon(S, bus);
  const t0 = ac.currentTime + 0.02;
  // atterrissage et verrouillage
  o.ton('sine', 58, t0 + arrivee, 0.25, { vol: 0.9, glisse: 0.6, a: 0.003 }); o.bruit(t0 + arrivee, 0.5, { vol: 0.5, type: 'lowpass', f: 700, f2: 90 });
  o.metal(t0 + arrivee + 0.16, 0.5, 2200); o.metal(t0 + arrivee + 0.26, 0.45, 1700);
  // grondement de basse sous le plancher, qui enfle jusqu'à l'ouverture
  const dur = ouvre - arrivee;
  const sub = ac.createOscillator(), subG = ac.createGain(); sub.type = 'sine'; sub.frequency.setValueAtTime(34, t0 + arrivee);
  sub.frequency.linearRampToValueAtTime(42 + rang * 3, t0 + ouvre);
  subG.gain.setValueAtTime(0.0001, t0 + arrivee); subG.gain.exponentialRampToValueAtTime(0.35 + rang * 0.08, t0 + ouvre - 0.05); subG.gain.exponentialRampToValueAtTime(0.0001, t0 + ouvre + 0.4);
  sub.connect(subG); subG.connect(bus); sub.start(t0 + arrivee); sub.stop(t0 + ouvre + 0.5);
  o.bruit(t0 + arrivee, dur + 0.3, { vol: 0.18 + rang * 0.04, type: 'lowpass', f: 160, a: dur * 0.6 });
  // moteur enfermé : grognement qui monte à chaque palier
  const mot = ac.createOscillator(), motF = ac.createBiquadFilter(), motG = ac.createGain();
  mot.type = 'sawtooth'; motF.type = 'lowpass'; motF.frequency.value = 260; motF.Q.value = 2;
  mot.frequency.setValueAtTime(42, t0 + arrivee + 0.3);
  motG.gain.setValueAtTime(0.0001, t0 + arrivee + 0.3); motG.gain.exponentialRampToValueAtTime(0.16, t0 + arrivee + 0.7);
  for (const p of paliers) { mot.frequency.setValueAtTime(48, t0 + p); mot.frequency.exponentialRampToValueAtTime(120 + rang * 10, t0 + p + 0.18); mot.frequency.exponentialRampToValueAtTime(52, t0 + p + 0.55); }
  motG.gain.setValueAtTime(0.16, t0 + ouvre - 0.1); motG.gain.exponentialRampToValueAtTime(0.0001, t0 + ouvre + 0.3);
  mot.connect(motF); motF.connect(motG); motG.connect(bus); mot.start(t0 + arrivee + 0.3); mot.stop(t0 + ouvre + 0.4);
  // loquets qui cèdent (un par palier) + crépitement électrique + coup de bélier dans la tôle
  paliers.forEach((p, i) => {
    o.metal(t0 + p, 0.5, 1800 + i * 300); o.ton('sine', 70, t0 + p + 0.02, 0.12, { vol: 0.5 + i * 0.08, glisse: 0.6 });
    for (let k = 0; k < 6 + i * 3; k++) o.bruit(t0 + p + 0.05 + Math.random() * 0.35, 0.01, { vol: 0.25, f: 5000 });
  });
  // battements de cœur et montée finale
  for (let x = arrivee + 0.4, pas = 0.62; x < ouvre - 0.15; x += pas, pas = Math.max(0.28, pas * 0.9)) { o.ton('sine', 62, t0 + x, 0.12, { vol: 0.45, glisse: 0.6 }); o.ton('sine', 58, t0 + x + 0.2, 0.1, { vol: 0.3, glisse: 0.6 }); }
  o.bruit(t0 + ouvre - 0.8, 0.8, { vol: 0.25, type: 'bandpass', f: 300, f2: 6000, q: 2, a: 0.7 });
  // scellé déchiré, rideau qui s'enroule (cliquetis des lames)
  o.bruit(t0 + ouvre, 0.35, { vol: 0.55, f: 2500 });
  for (let x = trappeDebut; x < trappe; x += 0.045) o.metal(t0 + x, 0.07, 1200 + Math.random() * 400);
  o.bruit(t0 + trappeDebut, trappe - trappeDebut, { vol: 0.2, type: 'bandpass', f: 900, f2: 2200, q: 3 });
  o.metal(t0 + trappe, 0.5, 1400);
  return () => {
    const t = ac.currentTime;
    try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); } catch (e) { /* rien */ }
    setTimeout(() => { o.arreter(); try { sub.stop(); mot.stop(); } catch (e) { /* déjà arrêtés */ } try { bus.disconnect(); } catch (e) { /* rien */ } }, 120);
  };
}
