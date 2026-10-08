/* REVEAL « FRET » — la cinématique de révélation d'un bolide, en temps réel (Three.js, 60 i/s).

   MONTÉE EN SUSPENSE (tous les modes, 1,5 à 3 s selon la rareté) : le conteneur tombe et se verrouille, puis tremble sur
   ses cales ; un loquet cède à chaque palier de rareté (secousse, crépitement, coup de bélier) et la lumière qui fuit par
   les fentes de la tôle monte en couleur : blanc-bleu → bleu → violet → or incandescent → rouge néon (Relique Interdite,
   avec séisme, secousse d'écran et gerbes d'étincelles). Le scellé vole en éclats D'ABORD, puis le rideau métallique « ? »
   s'enroule entièrement dans son coffre ; le bolide ne démarre qu'ensuite, et la hauteur libre du conteneur s'adapte au
   bolide (aileron, gyrophare, rotor) : aucune collision possible avec le linteau.
   FRANCHISSEMENT DU SEUIL : signature du bolide (signatures.js) — filtre d'écran exclusif, jingle d'entrée, particules.
   FIN : l'écran final reste affiché (micro-orbite de caméra, musique en boucle) jusqu'à Espace / Entrée / clic / régie.

   Storyboard du reveal Fret classique :
     1. L'ouverture du conteneur : le mini-conteneur maritime « Lootbox Fret » (le vrai, imprimé en 3D : anthracite,
        tôle ondulée, cônes d'empilage, scellé au code du bolide sur le toit, trappe « ? » coulissante) est au centre.
        Le scellé se déchire, la trappe glisse vers le haut et s'envole ; faisceau lumineux et fumée s'échappent.
     2. La sortie du bolide : il roule hors du conteneur, saute le petit seuil et se pose, avec l'effet de son thème
        (néons de drift, éclairs gothiques, flammes rétro, étincelles de course, paillettes pop pastel) et les
        particules d'apparition de sa RARETÉ (rarete.js).
     3. La bande-son : extrait réel calé sur la sortie du bolide (fichier déposé dans Musique/08_Reveal_Bolides, son
        « drop » est détecté automatiquement) ; sinon le jingle synthétisé du thème.
     4. Le titre : nom, alias, réplique tapée à la machine et description, en néon.
     5. La fiche : les 5 jauges se déploient une à une, chacune avec son impact sonore.
   La voiture est le bolide 3D stylisé (bolides3d.js : profil et livrée du portrait 2D extrudés, laque à reflets néon,
   jantes, vitres teintées, feux émissifs) qui SORT EN ROULANT (roulage.js : roues à ω = v / R, patinage au démarrage,
   cabrage, compression au seuil, arête de la dalle enroulée, tangage avant à l'arrêt, fumée et étincelles au contact).
   Repli si le modèle 3D est impossible : la photo détourée ou le portrait 2D sur un panneau.
   Option : enregistrer la séquence en vidéo WebM/MP4 (image + texte + son), pour un fichier par bolide.

   MODE « TRAILER D'INVOCATION » (mode: 'trailer', 5 à 8 s) : la même scène, montée comme l'entrée d'un personnage légendaire.
     1. L'amorce : battements de cœur qui accélèrent, conteneur qui tremble, aberration chromatique, montée sonore ;
        le décor se DÉCHIRE (fente dentelée qui s'ouvre sur l'univers du bolide).
     2. Le basculement : tout l'écran passe dans la direction artistique de l'archétype (archetypes.js : manga cel-shading,
        comics noir sous la pluie, post-apo sépia, pop pailletée, vintage 4:3, blockbuster cinémascope), avec sa musique
        (fichier de Musique/09_Trailers_Invocation, sinon thème procédural original) pendant que le bolide sort en roulant.
     3. Le freeze-frame : coupe sur un cadrage héroïque en contre-plongée, arrêt sur image vivant (grain, pellicule,
        zoom lent) et carton typographique de l'univers : nom de scène, sous-titre, punchline, rareté, cote, jauges.

   revealFret(parent, { car, teamId, team, couleurs, equipeHtml, express, son, base, enregistrer, mode, tenue }) → Promise<boolean>
   tenue : null (défaut) = attend Espace ; un nombre de secondes = passe tout seul (enregistrement vidéo : 4 s).
   (false si WebGL ou Three.js manquent : l'appelant passe alors à la cinématique photo ou à la fiche). */
import { esc } from './core.js';
import * as snd from './audio.js';
import { bolide2dSvg } from './bolides2d.js';
import { vignetteDe, infoVignette, visuelPrefere } from './ui.js';
import { themeDe, jingle, chargerReveal } from './reveal.js';
import { RARETES, rareteDe, coteAffichee } from './rarete.js';
import { construireBolide3D, envNeon } from './bolides3d.js';
import { creerRoulage } from './roulage.js';
import { ARCHETYPES, archetypeDe, creerPost, celShading, creerSurcouche, prechargerPolices, themeSonore } from './archetypes.js';
import { chronologie, gabarit, GABARIT } from './chronologie.js';
import { chargerSignatures, signatureDe, jingleEntree, suspenseSonore, texturesParticules, PARTICULES_SIGNATURE, FILTRES_SIGNATURE } from './signatures.js';

const T = () => window.THREE;
const STATS = [['vitesse', 'Vitesse', '#4cc9f0'], ['aerodynamisme', 'Aéro', '#3ddc97'], ['resistance_banane', 'Anti-banane', '#ffd166'],
  ['facteur_chaos', 'Facteur chaos', '#ff4d6d'], ['intimidation', 'Intimidation', '#b06bff']];
const MUSIQUE_DOSSIER = '08_Reveal_Bolides';
const MUSIQUE_TRAILERS = '09_Trailers_Invocation';
/** Effet 3D de sortie dans le trailer, selon l'univers. */
const EFFETS_ARCHE = { manga: 'neons', gothique: 'eclairs', post_apo: 'flammes', pop: 'paillettes', vintage: 'etincelles', blockbuster: 'etincelles' };

/** Effet de sortie par thème visuel (data/themes_bolides.json). */
const EFFETS = { manga: 'neons', jeu_video: 'neons', film_noir: 'eclairs', comics: 'eclairs', retro80: 'flammes', reel: 'etincelles', cartoon: 'paillettes' };
export const NOMS_EFFETS = { neons: 'néons de drift', eclairs: 'éclairs gothiques', flammes: 'flammes rétro', etincelles: 'étincelles de course', paillettes: 'paillettes pop pastel' };

export function revealFretDisponible() {
  try {
    if (!T()) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

/* ------------------------------------------------------------------ textures dessinées */
function texCanvas(w, h, dessin) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dessin(c.getContext('2d'), w, h);
  const t = new (T().CanvasTexture)(c);
  t.encoding = T().sRGBEncoding; t.anisotropy = 4;
  return t;
}
const texDoux = () => texCanvas(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
const texEtoile = () => texCanvas(128, 128, (g, w) => {
  g.translate(w / 2, w / 2); g.fillStyle = '#fff';
  g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 12 : 60; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  const r = g.createRadialGradient(0, 0, 0, 0, 0, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-64, -64, 128, 128);
});
function texTole(couleur) {         // tôle ondulée : bandes verticales + usure
  return texCanvas(512, 256, (g, w, h) => {
    g.fillStyle = couleur; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const lg = g.createLinearGradient(x, 0, x + 16, 0);
      lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(0.5, 'rgba(0,0,0,.22)'); lg.addColorStop(1, 'rgba(255,255,255,.10)');
      g.fillStyle = lg; g.fillRect(x, 0, 16, h);
    }
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 20, 1 + Math.random() * 3); }
  });
}
function texMarquage(code) {
  return texCanvas(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(235,238,245,.92)'; g.font = '900 92px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText('GP NOËL · FRET', 40, h * 0.42);
    g.font = '700 46px Consolas, monospace'; g.fillStyle = 'rgba(255,200,61,.95)';
    g.fillText('GPNU ' + String(code).padEnd(4, '0') + '23 · MAX GROSS 34 g', 44, h * 0.8);
  });
}
function texScelle(code, couleur) {
  return texCanvas(512, 288, (g, w, h) => {
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = couleur; g.fillRect(0, 0, w, 46);
    g.fillStyle = '#fff'; g.font = '800 30px Arial, sans-serif'; g.fillText('SCELLÉ · GRAND PRIX DE NOËL', 18, 33);
    g.fillStyle = '#111'; g.font = '900 120px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(code, w / 2, 178);
    for (let i = 0; i < 46; i++) { const x = 40 + i * 9.6; g.fillRect(x, 206, Math.random() < 0.5 ? 3 : 6, 56); }
  });
}
function texTrappe() {
  return texCanvas(512, 512, (g, w, h) => {
    g.fillStyle = '#26282e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = 'rgba(0,0,0,.7)'; g.font = '900 360px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', w / 2 + 8, h / 2 + 32);                              // « ? » gravé : ombre portée puis face claire
    g.fillStyle = '#7d8394'; g.fillText('?', w / 2, h / 2 + 22);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(w * 0.3, h * 0.06, w * 0.4, 10);
  });
}
function texSol() {
  return texCanvas(1024, 1024, (g, w, h) => {
    g.fillStyle = '#07080f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,120,255,.22)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}

/** Image du bolide : photo détourée si disponible (et préférée), sinon portrait 2D rastérisé. → { image, ratio } */
async function imageBolide(code) {
  const charger = (url) => new Promise((ok) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; });
  const v = visuelPrefere() !== '2d' ? vignetteDe(code) : null;
  if (v) {
    const im = await charger(v);
    if (im) {
      // marge de la vignette retirée pour que les roues touchent le sol
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let y1 = c.height - 1;
      outer: for (; y1 > 0; y1--) for (let x = 0; x < c.width; x += 3) if (d[(y1 * c.width + x) * 4 + 3] > 40) break outer;
      const out = document.createElement('canvas'); out.width = c.width; out.height = y1 + 2;
      out.getContext('2d').drawImage(c, 0, 0);
      return { image: out, ratio: out.width / out.height, photo: true };
    }
  }
  let svg = bolide2dSvg(code, 'fret' + code);
  if (!svg) return null;
  svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="523" ');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const im = await charger(url);
  URL.revokeObjectURL(url);
  if (!im) return null;
  // le portrait a son sol à y = 106 dans une boîte 12 → 114 : on coupe sous le sol
  const c = document.createElement('canvas'); c.width = 1600; c.height = Math.round(523 * (106 + 2 - 12) / 102);
  c.getContext('2d').drawImage(im, 0, 0, 1600, 523);
  return { image: c, ratio: c.width / c.height, photo: false };
}

/* ------------------------------------------------------------------ sons d'impact (synthétisés) */
function impact(i = 0, fort = false) {
  const S = snd.sortieAudio(); if (!S) return;
  const { ac, master } = S, t = ac.currentTime;
  const o = ac.createOscillator(), v = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(fort ? 120 : 90 + i * 22, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
  v.gain.setValueAtTime(fort ? 0.9 : 0.55, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(v); v.connect(master); o.start(t); o.stop(t + 0.32);
  const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate), d = b.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 3);
  const f = ac.createBiquadFilter(), vn = ac.createGain(); f.type = 'bandpass'; f.frequency.value = 1800 + i * 500; vn.gain.value = 0.35;
  n.buffer = b; n.connect(f); f.connect(vn); vn.connect(master); n.start(t);
}
function bruit(type) {
  const S = snd.sortieAudio(); if (!S) return;
  const { ac, master } = S, t = ac.currentTime;
  const dur = { dechirure: 0.35, glisse: 0.8, souffle: 1.4, moteur: 1.8 }[type] || 0.5;
  const n = ac.createBufferSource(), b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  const f = ac.createBiquadFilter(), v = ac.createGain();
  n.buffer = b; n.connect(f); f.connect(v); v.connect(master);
  if (type === 'dechirure') { f.type = 'highpass'; f.frequency.value = 2500; v.gain.setValueAtTime(0.4, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); }
  else if (type === 'glisse') { f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2400, t + dur); f.Q.value = 6; v.gain.setValueAtTime(0.25, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); }
  else if (type === 'souffle') { f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.4); v.gain.setValueAtTime(0.001, t); v.gain.exponentialRampToValueAtTime(0.45, t + 0.15); v.gain.exponentialRampToValueAtTime(0.001, t + dur); }
  else if (type === 'moteur') {
    f.type = 'lowpass'; f.frequency.value = 600; v.gain.setValueAtTime(0.001, t); v.gain.exponentialRampToValueAtTime(0.5, t + 0.2); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const o = ac.createOscillator(), vo = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.9); o.frequency.exponentialRampToValueAtTime(70, t + dur);
    vo.gain.setValueAtTime(0.001, t); vo.gain.exponentialRampToValueAtTime(0.18, t + 0.15); vo.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const fo = ac.createBiquadFilter(); fo.type = 'lowpass'; fo.frequency.value = 900; o.connect(fo); fo.connect(vo); vo.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  n.start(t); n.stop(t + dur + 0.02);
}

/* ------------------------------------------------------------------ musique réelle, calée sur le « drop » */
const memoMusique = new Map();
let listeDossiers = null;
/** Fichiers présents dans Musique/<dossier>, lus une fois dans la liste du relais (/api/v2/music) : aucune requête à vide. */
async function fichiersReveal(base, dossier = MUSIQUE_DOSSIER) {
  if (!listeDossiers) {
    listeDossiers = {};
    try {
      const r = await fetch(`${base}/api/v2/music`, { cache: 'no-cache' });
      if (r.ok) {
        const j = await r.json();
        for (const [d, fichiers] of Object.entries(j.folders || {})) {
          listeDossiers[d] = {};
          for (const f of fichiers || []) listeDossiers[d][decodeURIComponent(f.src.split('/').pop()).replace(/\.[a-z0-9]+$/i, '').toLowerCase()] = f.src;
        }
      }
    } catch (e) { /* site public : pas de relais, pas de musique */ }
  }
  return listeDossiers[dossier] || {};
}
async function chargerMusique(code, genre, base, dossier = MUSIQUE_DOSSIER) {
  const S = snd.sortieAudio(); if (!S) return null;
  const dispo = await fichiersReveal(base, dossier);
  const src = dispo[String(code).toLowerCase()] || dispo[String(genre).toLowerCase()];
  if (!src) return null;
  const url = (base === '..' ? '' : base) + src;
  if (memoMusique.has(url)) return memoMusique.get(url);
  try {
    const r = await fetch(url);
    if (!r.ok) { memoMusique.set(url, null); return null; }
    const buf = await S.ac.decodeAudioData(await r.arrayBuffer());
    const m = { buf, drop: detecterDrop(buf), url };
    memoMusique.set(url, m);
    return m;
  } catch (e) { memoMusique.set(url, null); return null; }
}
/** Instant (s) du plus fort « drop » dans les 75 premières secondes : saut d'énergie entre deux fenêtres glissantes. */
export function detecterDrop(buf) {
  const ch = buf.getChannelData(0), sr = buf.sampleRate, pas = Math.floor(sr * 0.05);
  const n = Math.min(Math.floor(ch.length / pas), Math.floor(75 / 0.05));
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = i * pas; k < (i + 1) * pas; k += 4) s += ch[k] * ch[k]; e[i] = Math.sqrt(s / (pas / 4)); }
  let best = 0, at = 0;
  const avant = 40, apres = 20;                       // 2 s avant, 1 s après
  for (let i = avant; i < n - apres; i++) {
    let a = 0, b = 0;
    for (let k = i - avant; k < i; k++) a += e[k];
    for (let k = i; k < i + apres; k++) b += e[k];
    const saut = b / apres - a / avant;
    if (saut > best) { best = saut; at = i; }
  }
  return at * 0.05;
}

/* ------------------------------------------------------------------ la scène */
export async function revealFret(parent, opts = {}) {
  const { car, teamId = null, team = null, couleurs = null, equipeHtml = '', express = false, son = true, base = '..', enregistrer = false, pasFixe = 0, mode = 'fret', tenue = null } = opts;
  if (!car || !revealFretDisponible()) return false;
  await Promise.all([chargerReveal(base).catch(() => null), chargerSignatures(base)]);
  const THREE = T();
  const trailer = mode === 'trailer';
  const cleA = archetypeDe(car), A = ARCHETYPES[cleA];
  const SIG = signatureDe(car.code);
  const th = themeDe(car), effet = trailer ? EFFETS_ARCHE[cleA] : (EFFETS[th.style] || 'etincelles');
  const palier = rareteDe(car), R = RARETES[palier], rang = Math.max(0, Math.min(4, R.rang | 0));
  const acc = (couleurs && couleurs[0]) || R.couleur;
  // tenue : null = l'écran final attend Espace / clic ; un nombre = passe tout seul après ce délai (enregistrement : 4 s)
  const tenueAuto = tenue != null && tenue !== '' ? Math.max(0, Number(tenue)) : (enregistrer ? 4 : null);

  /* --- chronologie : atterrissage → suspense (paliers de rareté) → scellé → rideau → sortie → seuil → pose → arrêt sur image */
  const X = express ? 0.55 : 1;
  const D = chronologie({ rang, express, trailer });                // chronologie.js : testée sous Node
  if (trailer) await prechargerPolices();

  /* --- DOM : canvas WebGL + surcouche texte */
  const el = document.createElement('div');
  el.className = 'fret-reveal' + (trailer ? ' trailer arche-' + cleA : '');
  el.style.cssText = `--rar:${R.couleur};--rar-l:${R.lueur};--acc:${acc}`;
  el.innerHTML = `<canvas class="fret-cv"></canvas>${trailer ? `<canvas class="fret-ov"></canvas>${equipeHtml ? `<div class="fret-proprio">${equipeHtml}</div>` : ''}` : ''}<div class="fret-flash"></div>
    <div class="fret-rar">${'◆'.repeat(R.rang + 1)} ${esc(R.court)}</div>
    <div class="fret-txt">
      ${equipeHtml ? `<div class="fret-equipe">${equipeHtml}</div>` : ''}
      <div class="fret-code">${esc(car.code)} · ${esc(car.real_name || '')}</div>
      <h2 class="fret-alias">${esc(car.alias || car.code)}</h2>
      <div class="fret-ecurie">${esc(car.ecurie || '')} · ${esc(NOMS_EFFETS[effet])}</div>
      <div class="fret-cit">« <span></span> »</div>
      <div class="fret-lore">${esc(car.lore || '')}</div>
      <div class="fret-stats">${STATS.map(([k, l, c]) => `<div class="fret-stat" style="--c:${c}"><span>${l}</span><i><b style="--v:${Math.max(3, Math.min(100, car[k] || 0))}%"></b></i><em>${car[k] ?? '–'}</em></div>`).join('')}</div>
      ${(() => { const k = coteAffichee(car); return k ? `<div class="fret-cote">Cote ${k.affinee ? 'affinée' : 'initiale'} : <b>×${String(k.cote).replace('.', ',')}</b></div>` : ''; })()}
    </div>
    <div class="fret-suivant"><kbd>Espace</kbd> ou clic : bolide suivant</div>`;
  parent.appendChild(el);
  injecterCss();
  const cv = el.querySelector('.fret-cv');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: enregistrer });
  } catch (e) { el.remove(); return false; }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040c);
  scene.fog = new THREE.FogExp2(0x05040c, 0.028);
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 400);
  const jetables = [];
  const garde = (x) => { jetables.push(x); return x; };
  // passe de post-traitement (les deux modes) : univers du trailer, filtre de signature, lueur de suspense
  const post = creerPost(THREE, renderer, trailer ? cleA : null);
  post.u.sigTeinte.value.set(SIG.teinte || (trailer ? A.teinte : R.lueur));
  const ov = trailer ? el.querySelector('.fret-ov') : null;
  const surcouche = trailer ? creerSurcouche(ov, { car, cle: cleA, rarete: R, cote: (coteAffichee(car) || {}).cote, express }) : null;

  const taille = () => {
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, enregistrer ? 1 : 1.5));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    post.taille();
    if (surcouche) surcouche.taille(w, h);
  };
  taille();
  const auResize = () => taille();
  addEventListener('resize', auResize);

  /* --- lumières et sol */
  scene.add(new THREE.HemisphereLight(0x8090ff, 0x100818, 0.35));
  const cle = new THREE.SpotLight(0xfff2dd, 2.0, 80, Math.PI / 7, 0.6, 1.2); cle.position.set(-2, 18, 14); cle.target.position.set(2, 2, 0); scene.add(cle, cle.target);
  const contre = new THREE.PointLight(new THREE.Color(R.lueur), 0.9, 40); contre.position.set(-8, 9, -10); scene.add(contre);
  const solTex = garde(texSol()); solTex.wrapS = solTex.wrapT = THREE.RepeatWrapping; solTex.repeat.set(10, 10);
  const sol = new THREE.Mesh(garde(new THREE.PlaneGeometry(160, 160)), garde(new THREE.MeshStandardMaterial({ map: solTex, roughness: 0.55, metalness: 0.25 })));
  sol.rotation.x = -Math.PI / 2; scene.add(sol);

  /* --- le bolide d'abord : sa hauteur (ailerons, gyrophares, rotor compris) fixe la hauteur libre du conteneur */
  const env = envNeon(THREE, renderer);
  let modele = null;
  try { modele = await construireBolide3D(car.code, { THREE, envMap: env }); } catch (e) { console.warn('bolide 3D', car.code, e); modele = null; }
  const { dalle, ep } = GABARIT, L = 9.54, P = 4.4, xO = L / 2;
  let sommet = 0;
  if (modele) { const b = new THREE.Box3().setFromObject(modele.groupe); sommet = b.max.y; }
  const { H, hO, yLinteau } = gabarit(sommet);                     // jamais d'aileron, de gyrophare ni de rotor dans le linteau

  /* --- le conteneur Lootbox Fret (cotes du STL ÷ 10 : 9,54 × 4,16 × 4,4 ; plus haut si le bolide l'exige) */
  const fret = new THREE.Group(); scene.add(fret);
  const tole = garde(texTole('#3a3d45'));
  const matTole = garde(new THREE.MeshStandardMaterial({ map: tole, roughness: 0.62, metalness: 0.35, bumpMap: tole, bumpScale: 0.06 }));
  const matCadre = garde(new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.5, metalness: 0.5 }));
  const matInt = garde(new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.9, side: THREE.DoubleSide }));
  const boite = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(garde(new THREE.BoxGeometry(w, h, d)), m); b.position.set(x, y, z); fret.add(b); return b; };
  boite(L, dalle, P, matCadre, 0, dalle / 2, 0);                                     // dalle
  boite(L, ep, P, matTole, 0, H - ep / 2, 0);                                        // toit
  boite(L, H - dalle - ep, ep, matTole, 0, (H + dalle - ep) / 2, P / 2 - ep / 2);     // flanc avant (côté caméra)
  boite(L, H - dalle - ep, ep, matTole, 0, (H + dalle - ep) / 2, -P / 2 + ep / 2);    // flanc arrière
  boite(ep * 1.3, H - dalle - ep, P, matTole, -L / 2 + ep * 0.65, (H + dalle - ep) / 2, 0); // mur de fond
  for (const z of [P / 2 - 0.12, -P / 2 + 0.12]) for (const x of [xO - 0.14, -xO + 0.14]) boite(0.28, H, 0.28, matCadre, x, H / 2, z);  // montants d'angle
  boite(L * 0.98, 0.02, P * 0.94, matInt, 0, dalle + 0.01, 0);
  for (const x of [L * 0.06, L * 0.34]) { const cn = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.25, 0.45, 0.2, 20)), matCadre); cn.position.set(x, H + 0.1, 0); fret.add(cn); }
  for (const x of [-L * 0.36, L * 0.36]) for (const z of [-P * 0.36, P * 0.36]) boite(0.7, 0.14, 0.5, matCadre, x, -0.05, z);   // cales sous le conteneur
  const marquage = new THREE.Mesh(garde(new THREE.PlaneGeometry(6.4, 1.6)), garde(new THREE.MeshBasicMaterial({ map: garde(texMarquage(car.code)), transparent: true })));
  marquage.position.set(-0.6, H * 0.56, P / 2 + 0.005); fret.add(marquage);
  const liseret = new THREE.Mesh(garde(new THREE.BoxGeometry(L * 1.002, 0.06, P * 1.004)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(R.couleur) })));
  liseret.position.y = dalle + 0.02; fret.add(liseret);
  // coffre du rideau (linteau) : le rideau s'y enroule entièrement avant que le bolide ne bouge
  boite(0.42, H - yLinteau + 0.34, P - 0.2, matCadre, xO + 0.17, (yLinteau + H + 0.34) / 2, 0);
  // scellé : douze éclats qui s'envolent vers l'arrière (jamais au-dessus du passage du bolide), puis disparaissent
  const matScelle = garde(new THREE.MeshBasicMaterial({ map: garde(texScelle(car.code, R.lueur)), transparent: true, side: THREE.DoubleSide }));
  const eclats = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const g = garde(new THREE.PlaneGeometry(1.9 / 4 * 2, 2.12 / 3));
    const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) { uv.setX(k, (uv.getX(k) + i) / 4); uv.setY(k, (uv.getY(k) + j) / 3); }
    const m = new THREE.Mesh(g, matScelle.clone()); garde(m.material);
    m.rotation.x = -Math.PI / 2; const x0 = xO - 2.9 + (i + 0.5) * 0.95, z0 = (j - 1) * 2.12 / 3;
    m.position.set(x0, H + 0.012, -z0); fret.add(m);
    eclats.push({ m, x0, z0: -z0, v: new THREE.Vector3(-1.2 - Math.random() * 2.4, 2.4 + Math.random() * 2.2, (j - 1) * 1.6 + (Math.random() - 0.5)), w: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4) });
  }
  // rideau métallique « ? » en lames qui s'enroulent dans le coffre
  const texQ = garde(texTrappe());
  const nLames = Math.max(10, Math.round(hO / 0.24)), hL = hO / nLames;
  const matFace = garde(new THREE.MeshStandardMaterial({ map: texQ, roughness: 0.55, metalness: 0.35 }));
  const lames = [];
  for (let i = 0; i < nLames; i++) {
    const g = garde(new THREE.BoxGeometry(0.09, hL * 0.94, P - 0.34));
    const uv = g.attributes.uv; for (let k = 0; k < 4; k++) uv.setY(k, (uv.getY(k) * 0.94 + 0.03 + i) / nLames);   // face +x : bande i de l'image
    const m = new THREE.Mesh(g, [matFace, matCadre, matCadre, matCadre, matCadre, matCadre]);
    m.position.set(xO + 0.08, dalle + (i + 0.5) * hL, 0); fret.add(m); lames.push({ m, y0: dalle + (i + 0.5) * hL });
  }
  // lumière intérieure, faisceau et fumée
  const interieur = new THREE.PointLight(new THREE.Color(R.couleur).lerp(new THREE.Color(0xffffff), 0.6), 0, 18, 1.6); interieur.position.set(xO - 1.5, dalle + hO * 0.55, 0); fret.add(interieur);
  const faisceauMat = garde(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { force: { value: 0 }, teinte: { value: new THREE.Color(R.couleur).lerp(new THREE.Color(0xffffff), 0.55) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float force; uniform vec3 teinte; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x); gl_FragColor = vec4(teinte, a * force * 0.55); }',
  }));
  const faisceau = new THREE.Mesh(garde(new THREE.CylinderGeometry(1.7, 5.5, 16, 32, 1, true)), faisceauMat);
  faisceau.rotation.z = Math.PI / 2; faisceau.position.set(xO + 8, dalle + hO * 0.5, 0); faisceau.scale.set(1, 1, 0.7); scene.add(faisceau);
  const lueurOuverture = new THREE.Mesh(garde(new THREE.PlaneGeometry(3.9, hO)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(R.couleur).lerp(new THREE.Color(0xffffff), 0.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
  lueurOuverture.rotation.y = Math.PI / 2; lueurOuverture.position.set(xO - 0.4, dalle + hO / 2, 0); fret.add(lueurOuverture);

  /* --- fuites de lumière (suspense) : fentes dans la tôle, liserés autour du rideau, flaque au sol ; couleur par paliers */
  const ECHELLE_RARETE = ['#cfe8ff', '#6f8dff', '#b44dff', '#ffbf2e', '#ff1f4b'];
  const couleurFuite = new THREE.Color(ECHELLE_RARETE[0]);
  const matFente = garde(new THREE.MeshBasicMaterial({ color: couleurFuite, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const texRai = garde(texCanvas(256, 64, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = l; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); }));
  const matRai = garde(new THREE.MeshBasicMaterial({ map: texRai, color: couleurFuite, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const fentes = [];
  for (let i = 0; i < 7; i++) {
    const x = -L / 2 + 1.1 + (i + Math.random() * 0.6) * (L - 2.4) / 7, h = 0.4 + Math.random() * 0.9, y = dalle + 0.5 + Math.random() * Math.max(0.2, hO - 1.4);
    const f = new THREE.Mesh(garde(new THREE.PlaneGeometry(0.09, h)), matFente); f.position.set(x, y, P / 2 + 0.012); fret.add(f);
    const lg = 1.4 + Math.random();
    const rai = new THREE.Mesh(garde(new THREE.PlaneGeometry(lg, h * 1.1)), matRai); rai.rotation.y = Math.PI / 2; rai.position.set(x, y, P / 2 + lg / 2); fret.add(rai);
    const rai2 = new THREE.Mesh(rai.geometry, matRai); rai2.rotation.set(Math.PI / 2, Math.PI / 2, 0); rai2.position.copy(rai.position); fret.add(rai2);
    fentes.push({ phase: Math.random() * 6 });
  }
  // liserés autour du rideau (le jour passe entre le rideau et le cadre)
  const liserés = [[0.03, 0.05, P - 0.3, xO + 0.15, dalle + 0.03, 0], [0.03, 0.05, P - 0.3, xO + 0.15, yLinteau - 0.02, 0],
    [0.03, hO, 0.05, xO + 0.15, dalle + hO / 2, P / 2 - 0.2], [0.03, hO, 0.05, xO + 0.15, dalle + hO / 2, -P / 2 + 0.2]];
  for (const [w, h, d, x, y, z] of liserés) boite(w, h, d, matFente, x, y, z);
  const texFlaque = garde(texCanvas(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }));
  const matFlaque = garde(new THREE.MeshBasicMaterial({ map: texFlaque, color: couleurFuite, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const flaque = new THREE.Mesh(garde(new THREE.PlaneGeometry(3.2, 4.6)), matFlaque); flaque.rotation.x = -Math.PI / 2; flaque.position.set(xO + 1.1, 0.015, 0); fret.add(flaque);

  /* --- particules (fumée, étincelles, paillettes, rareté, signature du bolide) */
  const texD = garde(texDoux()), texE = garde(texEtoile());
  const texSigBrut = texturesParticules(THREE), texVues = new Set();
  const texSig = (nom) => { const t = texSigBrut(nom); if (!texVues.has(t)) { texVues.add(t); garde(t); } return t; };
  const parts = [];
  const matsPart = new Map();
  const matPart = (couleur, tex, additif) => {
    const k = couleur + tex.uuid + (additif ? 'a' : 'n');
    if (!matsPart.has(k)) matsPart.set(k, garde(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(couleur), transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending })));
    return matsPart.get(k);
  };
  const PLAFOND_PARTS = 900;
  const emettre = (n, f) => { for (let i = 0; i < n && parts.length < PLAFOND_PARTS; i++) { const p = f(i); const s = new THREE.Sprite(p.mat.clone()); garde(s.material); s.position.copy(p.pos); s.scale.setScalar(p.taille); scene.add(s); parts.push({ s, ...p, age: 0, phase: Math.random() * 6.28 }); } };
  const majParts = (dt) => {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age >= p.vie) { scene.remove(p.s); p.s.material.dispose(); parts.splice(i, 1); continue; }
      p.vel.y += (p.g ?? 0) * dt; p.vel.multiplyScalar(1 - (p.frein ?? 0.4) * dt);
      p.s.position.addScaledVector(p.vel, dt);
      if (p.ondule) { p.s.position.x += Math.sin(p.age * 3 + p.phase) * p.ondule * dt; p.s.position.z += Math.cos(p.age * 2.3 + p.phase) * p.ondule * 0.6 * dt; }
      const k = p.age / p.vie;
      p.s.material.opacity = (p.op ?? 1) * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      const sc = p.taille * (1 + (p.croit ?? 0) * k);
      if (p.pivote) p.s.scale.set(sc * Math.max(0.12, Math.abs(Math.cos(p.age * 7 + p.phase))), sc, 1); else p.s.scale.setScalar(sc);
      if (p.tourne) p.s.material.rotation += p.tourne * dt;
    }
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const fumee = (n, x, y, z, force = 1) => emettre(n, () => ({ mat: matPart('#9aa0b4', texD, false), pos: V3(x + Math.random() * 0.4, y + Math.random() * 1.6, z + (Math.random() - 0.5) * 3), vel: V3((1.5 + Math.random() * 3) * force, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 1.5), taille: 1.6 + Math.random() * 1.6, croit: 2.2, vie: 2.4 + Math.random() * 1.6, op: 0.32, frein: 0.6, tourne: (Math.random() - 0.5) }));

  /* --- placement du bolide : modèle 3D qui roule ; repli : panneau (photo détourée ou portrait 2D) */
  const voiture = new THREE.Group(); scene.add(voiture);
  let LONG, haut, plan = null, reflet = null, roulage = null, xDepart, xArrivee, paramsRoulage = null;
  if (modele) {
    voiture.add(modele.groupe);
    LONG = modele.longueur; haut = modele.hauteur;
    xDepart = xO - 0.35 - modele.xAvant;                                  // l'avant juste derrière le rideau
    xArrivee = xO - modele.xArriere + 2.8;                                // l'arrière bien sorti, devant la caméra
    paramsRoulage = { xDepart, xArrivee, duree: D.pose - D.sortie, xEssieuAv: modele.essieuAvant, xEssieuAr: modele.essieuArriere,
      rAv: modele.rayonAvant, rAr: modele.rayonArriere, dalle, xBord: xO, volant: modele.fam === 'helico' };
    roulage = creerRoulage(paramsRoulage);
    const cleV = new THREE.DirectionalLight(0xffffff, 1.25); cleV.position.set(6, 9, 10); cleV.target = voiture; scene.add(cleV);
    const lisV = new THREE.PointLight(new THREE.Color(R.lueur), 1.4, 16); lisV.position.set(0, 3, -3); voiture.add(lisV);
  } else {
    const visuel = await imageBolide(car.code);
    if (!visuel) { el.remove(); renderer.dispose(); post.dispose(); removeEventListener('resize', auResize); return false; }
    LONG = Math.min(7.6, (hO - 0.3) * visuel.ratio); haut = LONG / visuel.ratio;
    const texCar = garde(new THREE.CanvasTexture(visuel.image)); texCar.encoding = THREE.sRGBEncoding; texCar.anisotropy = 8;
    const matCar = garde(new THREE.MeshBasicMaterial({ map: texCar, transparent: true, alphaTest: 0.04, toneMapped: false }));
    plan = new THREE.Mesh(garde(new THREE.PlaneGeometry(LONG, haut)), matCar); plan.position.y = haut / 2; voiture.add(plan);
    reflet = new THREE.Mesh(garde(new THREE.PlaneGeometry(LONG, haut)), garde(new THREE.MeshBasicMaterial({ map: texCar, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })));
    reflet.scale.y = -1; reflet.position.y = -haut / 2 - 0.02; voiture.add(reflet);
    xDepart = -xO + LONG / 2 + 0.6; xArrivee = xO + LONG / 2 + 3.4;
  }
  const ombre = new THREE.Mesh(garde(new THREE.PlaneGeometry(LONG * 1.15, modele ? modele.largeur * 1.5 : 2.2)), garde(new THREE.MeshBasicMaterial({ map: texD, color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false })));
  ombre.rotation.x = -Math.PI / 2; scene.add(ombre);
  voiture.position.set(xDepart, modele ? 0 : dalle, modele ? 0 : 0.2);
  if (modele) { modele.chassis.position.y = dalle; for (const w of modele.roues) w.pivot.position.y = dalle + (w.avant ? modele.rayonAvant : modele.rayonArriere); }

  // instant précis où le bolide franchit le seuil : essai à blanc du roulage (déterministe)
  let tSeuil = D.sortie + 0.3;
  if (paramsRoulage) {
    const essai = creerRoulage(paramsRoulage);
    for (let x = 0; x <= paramsRoulage.duree; x += 1 / 120) { if (essai.pas(x, 1 / 120).evenements.includes('seuil-av')) { tSeuil = D.sortie + x; break; } }
  }
  D.bascule = tSeuil;
  if (pasFixe) window.__fretD = { ...D };                    // repères pour les captures de contrôle

  // univers manga : matériaux toon préparés (et compilés) d'avance, posés au moment de la déchirure
  const cel = trailer && cleA === 'manga' && modele ? celShading(THREE, modele.groupe) : null;
  camera.position.set(-5, 8, 22); camera.lookAt(3.2, 2.2, 0);
  try {                                    // compile les shaders AVANT le top départ : pas d'à-coup au premier reveal
    if (cel) { cel.appliquer(); renderer.compile(scene, camera); cel.annuler(); }
    renderer.compile(scene, camera);
  } catch (e) { /* compilation paresseuse : tant pis */ }

  /* --- état de la séquence */
  const etat = { sortie: false, pose: false, titre: false, stats: false, palier: -1, seuil: false };
  const debut = performance.now();
  let fini = false, raf = 0, dernier = debut, tickN = 0, tCourant = 0, demande = false;
  const camDepart = V3(-5, 8, 22), camFret = V3(16.5, 5.6 + (H - 4.16) * 0.6, 9.5 + (H - 4.16));
  const camFinal = modele ? V3(xArrivee + 4.0, 4.3, 19.5) : V3(xArrivee - 1.2, 3.4, 15.5);
  const cibleFinal = modele ? V3(xArrivee - 3.4, 1.3, 0) : V3(xArrivee - 3.4, 2.0, 0);
  const cibleFret = V3(3.2, 2.2 + (H - 4.16) * 0.4, 0);
  const lisse = (a) => a * a * (3 - 2 * a), borne = (v) => Math.max(0, Math.min(1, v));
  const flash = el.querySelector('.fret-flash');
  const eclairs = [];

  // ---------- son : suspense (immédiat), jingle d'entrée au seuil, puis musique (fichier en boucle ou thème procédural tenu)
  let musique = null, musiqueSource = null, musiqueGain = null, stopTheme = null, stopSuspense = null;
  if (son) { try { musique = trailer ? await chargerMusique(car.code, cleA, base, MUSIQUE_TRAILERS) : await chargerMusique(car.code, th.musique, base); } catch (e) { musique = null; } }
  if (pasFixe) window.__fretMusique = musique ? { url: musique.url, drop: musique.drop } : null;
  const lancerSon = () => {
    const S = snd.sortieAudio(); if (!S || !son) return;
    stopSuspense = suspenseSonore(S, { arrivee: D.arrivee, paliers: D.paliers, ouvre: D.ouvre, trappeDebut: D.trappeDebut, trappe: D.trappe, rang });
    const dj = jingleEntree(SIG.jingle, S, tSeuil);
    const debutMusique = tSeuil + dj * 0.8;
    if (musique) {                       // le drop du morceau tombe juste après le jingle, puis le morceau tourne en boucle
      const { ac, master } = S, src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = musique.buf; src.loop = true; src.loopStart = Math.max(0, Math.min(musique.drop, musique.buf.duration - 2) - 4); src.loopEnd = musique.buf.duration;
      src.connect(g); g.connect(master);
      const t = ac.currentTime + 0.02 + debutMusique;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.92, t + 0.06);
      src.start(t, Math.min(musique.drop, Math.max(0, musique.buf.duration - 1)));
      musiqueSource = src; musiqueGain = g;
    } else stopTheme = themeSonore(cleA, S, { debut: debutMusique, freeze: trailer ? D.freeze : D.stats, rire: /HA-HA/.test(car.onomatopee || ''), ouverture: trailer });
  };

  // enregistrement vidéo : image WebGL + surcouche texte redessinée + son
  let rec = null, recDessin = null, recFin = null;
  if (enregistrer) ({ rec, recDessin, recFin } = preparerEnregistrement(cv, el, car, ov));

  const typeur = el.querySelector('.fret-cit span');
  const cit = String(car.citation || '');

  // ---------- mise en scène : flash, éclair, secousses, lueur de suspense, filtre de signature, arrêt sur image
  let fige = false, flashV = 0, eclairV = 0, secousse = 0, choc = 0, sigPunch = 0, fuiteImpulsion = 0, tLent = 0, coupZoom = 0;
  const AMPL = [0.012, 0.022, 0.035, 0.055, 0.075][rang], CHOC = [0.05, 0.08, 0.12, 0.18, 0.26][rang];
  const battements = [];
  for (let x = D.arrivee + 0.4, p = 0.62; x < D.ouvre - 0.15; x += p, p = Math.max(0.28, p * 0.9)) battements.push(x);
  const pouls = (t) => { let d = 9; for (const b of battements) if (b <= t) d = t - b; return Math.exp(-d * 9); };
  const majPost = (t, dt) => {
    const u = post.u;
    flashV = Math.max(0, flashV - dt * 3.2); eclairV = Math.max(0, eclairV - dt); fuiteImpulsion = Math.max(0, fuiteImpulsion - dt * 2.5);
    u.temps.value = t; u.tScene_t.value = fige ? D.freeze + tLent : t;
    const prog = borne((t - D.arrivee) / Math.max(0.01, D.ouvre - D.arrivee));
    u.tension.value = t < D.ouvre ? prog * (0.45 + 0.15 * rang) : 0; u.pouls.value = t < D.ouvre ? pouls(t) : 0;
    u.fuite.value.copy(couleurFuite); u.fuiteForce.value = t < D.trappe ? (0.05 + 0.09 * prog) * (0.6 + 0.4 * Math.random()) + fuiteImpulsion * 0.35 : 0;
    if (trailer) {
      u.da.value = t >= D.bascule ? 1 : 0; u.dechirure.value = borne((t - D.bascule) / D.dech);
      u.chaleur.value = cleA === 'post_apo' && t >= D.bascule ? 1 : 0;
      u.zoom.value = fige ? 1 + 0.04 * lisse(borne((t - D.freeze) / 6)) : 1;
    }
    u.flash.value = Math.min(1, flashV); u.eclair.value = eclairV > 0 ? Math.min(1, eclairV / 0.18) * (0.7 + 0.3 * Math.random()) : 0;
    sigPunch = Math.max(0, sigPunch - dt * 0.6);
    u.sigForce.value = t >= tSeuil ? 0.55 + 0.45 * sigPunch : 0;
  };
  const focusEcran = () => { const v = voiture.position.clone(); v.y += (modele ? modele.chassis.position.y : 0) + haut * 0.5; v.project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
  let focusFige = null, orbite = null;
  let dirCam = null, emprise = null;
  function cadrageHeroique() {            // coupe : contre-plongée de trois quarts avant ; le bolide ENTIER remplit la moitié droite
    const box = new THREE.Box3().setFromObject(modele ? modele.groupe : voiture);
    const sph = box.getBoundingSphere(new THREE.Sphere()), c = sph.center;
    dirCam = new THREE.Vector3(0.66, 0, 0.75).normalize();
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    camera.fov = 30; camera.aspect = w / h;
    camera.setViewOffset(w, h, -w * 0.15, 0, w, h); camera.updateProjectionMatrix();
    const d = sph.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.12;
    orbite = { c, r: d, a0: Math.atan2(dirCam.x, dirCam.z), y: Math.max(0.3, c.y * 0.5), cible: V3(c.x, c.y, c.z) };
    placerOrbite(0);
    focusFige = focusEcran();
    // rien ne doit masquer le bolide sur l'image finale : on retire les particules devant lui ou dans son emprise à l'écran
    camera.updateMatrixWorld();
    const coins = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) coins.push(V3(x, y, z).project(camera));
    emprise = { x0: Math.min(...coins.map((p) => p.x)) - 0.06, x1: Math.max(...coins.map((p) => p.x)) + 0.06, y0: Math.min(...coins.map((p) => p.y)) - 0.08, y1: Math.max(...coins.map((p) => p.y)) + 0.08, d: camera.position.distanceTo(c) };
    const rayon = sph.radius;
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i].s.position, dd = q.distanceTo(camera.position), pr = q.clone().project(camera);
      const dansEmprise = pr.x > emprise.x0 && pr.x < emprise.x1 && pr.y > emprise.y0 && pr.y < emprise.y1;
      if (dd < emprise.d - rayon * 0.6 || (dansEmprise && dd < emprise.d + rayon * 2.5)) { scene.remove(parts[i].s); parts[i].s.material.dispose(); parts.splice(i, 1); }
    }
    for (const e of eclairs) e.l.visible = false;
  }
  function placerOrbite(k) {              // micro-orbite très lente : ± 4° en 25 s, la 3D reste vivante pendant la lecture
    const a = orbite.a0 + 0.07 * Math.sin(k * 0.25), r = orbite.r * (1 - 0.015 * Math.sin(k * 0.17));
    camera.position.set(orbite.c.x + Math.sin(a) * r, orbite.y + 0.12 * Math.sin(k * 0.21), orbite.c.z + Math.cos(a) * r);
    camera.lookAt(orbite.cible); camera.rotateZ(0.09);
  }

  // ---------- signature : particules du bolide, à partir du seuil
  const SP = PARTICULES_SIGNATURE[SIG.particules] || PARTICULES_SIGNATURE.etoiles;
  const alea = (a, b) => a + Math.random() * (b - a);
  function particulesSignature(dt, taux, derriere = 0) {
    const attendu = SP.n * 30 * dt * taux; let n = Math.floor(attendu) + (Math.random() < attendu % 1 ? 1 : 0);
    const cx = voiture.position.x, larg = modele ? modele.largeur : 2;
    while (n-- > 0) {
      const couleur = SIG.teinte && Math.random() < 0.4 ? SIG.teinte : SP.couleurs[Math.floor(Math.random() * SP.couleurs.length)];
      const pos = SP.zone === 'ciel' ? V3(cx + alea(-6, 6), alea(5, 7.5), alea(-3, 4)) : SP.zone === 'air' ? V3(cx + alea(-LONG * 0.7, LONG * 0.7), alea(0.4, haut + 1.4), alea(-larg, larg + 1))
        : V3(cx + alea(-LONG * 0.7, LONG * 0.7), alea(0.05, 0.35), alea(-larg * 0.8, larg * 0.8 + 0.6));
      if (derriere && dirCam) {
        pos.addScaledVector(dirCam, -derriere);
        if (emprise) { const pr = pos.clone().project(camera); if (pr.x > emprise.x0 && pr.x < emprise.x1 && pr.y > emprise.y0 && pr.y < emprise.y1) continue; }
      }
      emettre(1, () => ({ mat: matPart(couleur, texSig(SP.tex), SP.add), pos, vel: V3(alea(...SP.vel[0] || [-1, 1]), alea(...(SP.vel[1] || [0.5, 1.5])), alea(...(SP.vel[2] || [-1, 1]))),
        taille: alea(...SP.taille), vie: alea(...SP.vie), g: SP.g, frein: SP.frein, tourne: (Math.random() - 0.5) * 2 * SP.tourne, croit: SP.croit || 0, op: SP.op, pivote: SP.pivote, ondule: SP.ondule }));
    }
  }

  // ---------- passer au suivant : Espace (PC branché en HDMI sur la TV), Entrée, flèche droite, télécommande, clic, régie
  const TOUCHES = new Set([' ', 'Spacebar', 'Enter', 'NumpadEnter', 'ArrowRight', 'PageDown', 'MediaPlayPause']);
  const accepter = () => { if (tCourant >= D.tenue) demande = true; };
  const surTouche = (e) => { if (fini) return; if (TOUCHES.has(e.key) || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); accepter(); } };
  const surClic = (e) => { e.stopPropagation(); accepter(); };
  addEventListener('keydown', surTouche, true); el.addEventListener('pointerdown', surClic); addEventListener('gp:suivant', accepter);

  return new Promise((resolve) => {
    const tick = (now) => {
      if (fini) return;
      // pasFixe (s par image) : temps image par image, pour les captures de contrôle sur une machine lente
      if (pasFixe && window.__fretArret != null && tickN * pasFixe > window.__fretArret) { raf = requestAnimationFrame(tick); return; }   // contrôle image par image
      const t = pasFixe ? (tickN++) * pasFixe : (now - debut) / 1000, dt = pasFixe || Math.min(0.05, (now - dernier) / 1000); dernier = now;
      tCourant = t;
      if (!etat.lance) { etat.lance = true; lancerSon(); }
      if (t >= D.tenue && !etat.attente) { etat.attente = true; el.classList.add('attente'); }
      if (demande || (tenueAuto != null && t >= D.tenue + tenueAuto)) { terminer(); return; }

      if (trailer && fige) {             // ARRÊT SUR IMAGE : temps quasi suspendu, caméra en micro-orbite, carton fixe
        tLent += dt * 0.04;
        const kf = t - D.freeze; camera.fov = 30 + 7 * Math.exp(-kf * 8) * Math.cos(kf * 13); camera.updateProjectionMatrix();
        placerOrbite(kf);
        majParts(dt * 0.04); particulesSignature(dt * 0.04, 0.2, (modele ? modele.largeur : 2) + 1.5);
        if (modele) modele.maj(dt * 0.04, 0, D.freeze + tLent, 0);
        majPost(t, dt); post.scene(scene, camera); post.passe();
        surcouche.dessiner({ phase: 'freeze', k: t - D.freeze, focus: focusFige, dt });
        if (pasFixe) window.__fretT = t;
        if (recDessin) recDessin(t);
        raf = requestAnimationFrame(tick); return;
      }

      // ---------- caméra : arrivée, approche du conteneur pendant le suspense, travelling vers le bolide
      const a1 = lisse(borne(t / Math.max(0.01, D.ouvre))), a2 = lisse(borne((t - D.sortie) / (D.pose - D.sortie + 0.6)));
      const cam = camDepart.clone().lerp(camFret, a1).lerp(camFinal, a2);
      const cib = cibleFret.clone().lerp(cibleFinal, a2);
      if (t > D.pose) { const o = (t - D.pose) * 0.06; cam.x += Math.sin(o) * 1.2; cam.z -= Math.sin(o) * 0.6; }
      if (t > D.arrivee * 0.6 && t < D.sortie + 0.4) {               // pendant le suspense, la caméra tourne autour du conteneur et s'en approche
        const k = borne((t - D.arrivee * 0.6) / Math.max(0.01, D.trappe - D.arrivee * 0.6)), fin = 1 - borne((t - D.sortie) / 0.4);
        const ang = (-0.42 + 0.42 * lisse(k)) * fin, cx = 3.2, cz = 0;
        const dx = cam.x - cx, dz = cam.z - cz, c = Math.cos(ang), sn = Math.sin(ang);
        const rx = dx * c - dz * sn, rz = dx * sn + dz * c, dolly = 1 - 0.16 * lisse(k) * fin;
        cam.x = cx + rx * dolly; cam.z = cz + rz * dolly; cam.y -= 0.8 * lisse(k) * fin;
      }

      // ---------- 0. le conteneur tombe, rebondit sur ses cales et se verrouille
      if (t < D.arrivee) { const k = t / D.arrivee; fret.position.y = 7 * (1 - k * k); }
      else {
        if (!etat.atterri) { etat.atterri = true; secousse = Math.max(secousse, 0.25 + rang * 0.05); poussiereAtterrissage(); coupZoom = 4; }
        const r = t - D.arrivee; fret.position.y = r < 0.35 ? Math.abs(Math.sin(r * Math.PI / 0.35)) * 0.12 * (1 - r / 0.35) : 0;
      }
      // ---------- 1. suspense : le conteneur tremble de plus en plus, les loquets cèdent un à un, la lumière monte en couleur
      let tremble = 0;
      if (t >= D.arrivee && t < D.trappe) {
        const prog = borne((t - D.arrivee) / Math.max(0.01, D.ouvre - D.arrivee));
        tremble = AMPL * (0.3 + 0.7 * prog * prog);
        while (etat.palier + 1 < D.paliers.length && t >= D.paliers[etat.palier + 1]) {        // nouveau palier
          etat.palier++;
          choc = CHOC; fuiteImpulsion = 1; flashV = Math.max(flashV, 0.08 + 0.05 * etat.palier); coupZoom = Math.max(coupZoom, 2.5 + rang * 0.9);
          couleurFuite.set(ECHELLE_RARETE[Math.min(etat.palier, rang)]);
          if (rang >= 3) { secousse = Math.max(secousse, 0.12 + 0.08 * (rang - 2)); etincellesCales(10 + rang * 6); }
          else if (rang === 2) secousse = Math.max(secousse, 0.06);
        }
        if (rang === 4 && prog > 0.6 && Math.random() < 0.25) etincellesCales(2);
        // lumière : intensité de base qui monte, crépitement après chaque palier
        const crepite = choc > 0.02 ? (Math.random() < 0.5 ? 0.25 : 1) : 0.85 + 0.15 * Math.sin(t * 23);
        const force = (0.25 + 0.75 * prog) * crepite;
        matFente.opacity = force; matRai.opacity = 0.3 * force; matFlaque.opacity = 0.32 * force;
        interieur.color.copy(couleurFuite); interieur.intensity = 0.4 + 1.2 * prog;
        fentes.forEach((f) => { f.phase += dt * 9; });
      } else if (t >= D.trappe) { const k = borne((t - D.trappe) / 0.6); matFente.opacity *= 1 - k; matRai.opacity *= 1 - k; matFlaque.opacity *= 1 - k; }
      choc = Math.max(0, choc - dt * 0.9);
      const amp = tremble + choc;
      if (t >= D.arrivee) { fret.position.x = (Math.random() - 0.5) * amp; fret.position.z = (Math.random() - 0.5) * amp * 0.6; fret.position.y += Math.abs(Math.random() - 0.5) * choc * 0.5; fret.rotation.x = (Math.random() - 0.5) * amp * 0.08; }
      if (rang >= 2) { cam.x += (Math.random() - 0.5) * (amp + choc) * (rang - 1) * 0.9; cam.y += (Math.random() - 0.5) * (amp + choc) * (rang - 1) * 0.6; }
      if (secousse > 0) { cam.x += (Math.random() - 0.5) * secousse; cam.y += (Math.random() - 0.5) * secousse * 0.7; secousse = Math.max(0, secousse - dt * 1.8); }
      if (palier === 'relique_interdite' && t > D.sortie && t < D.sortie + 0.6) { cam.x += (Math.random() - 0.5) * 0.4; cam.y += (Math.random() - 0.5) * 0.3; }
      if (t >= D.trappe && fret.position.x !== 0) { fret.position.set(0, 0, 0); fret.rotation.x = 0; }

      // ---------- 2. le scellé vole en éclats (d'abord), puis le rideau s'enroule entièrement dans le coffre
      const te = t - D.ouvre;
      for (const e of eclats) {
        if (te < 0) continue;
        e.m.position.set(e.x0 + e.v.x * te, H + 0.012 + e.v.y * te - 4.9 * te * te, e.z0 + e.v.z * te);
        e.m.rotation.set(-Math.PI / 2 + e.w.x * te, e.w.y * te, e.w.z * te);
        e.m.material.opacity = 1 - borne(te / 0.55); e.m.visible = te < 0.55;
      }
      if (te >= 0 && !etat.dechire) { etat.dechire = true; flashV = Math.max(flashV, 0.25); }
      const tr = lisse(borne((t - D.trappeDebut) / (D.trappe - D.trappeDebut))) * (hO + hL);
      for (const l of lames) { const y = l.y0 + tr; l.m.position.y = y; l.m.visible = y - hL / 2 < yLinteau - 0.01; }
      const lum = lisse(borne((t - D.trappeDebut) / 0.6));
      cle.intensity = 2.0 * (1 - 0.65 * borne((t - D.pose) / 1.5));
      if (t >= D.trappeDebut) { interieur.color.copy(couleurFuite); interieur.intensity = Math.max(interieur.intensity, lum * 3.2); }
      faisceauMat.uniforms.teinte.value.copy(couleurFuite).lerp(new THREE.Color(0xffffff), 0.45);
      faisceauMat.uniforms.force.value = lum * (1 - 0.6 * borne((t - D.titre) / 2)); lueurOuverture.material.opacity = lum * 0.55 * (1 - 0.7 * borne((t - D.pose) / 1.5));
      if (t >= D.trappe && !etat.trappeOk) { etat.trappeOk = true; fumee(express ? 18 : 34, xO - 0.6, dalle + 0.3, 0, 1); }
      if (etat.trappeOk && t < D.titre && Math.random() < 0.35) fumee(1, xO - 0.4, dalle + 0.2, 0, 0.8);

      // ---------- 3. sortie du bolide (roulage), franchissement du seuil = signature du bolide
      const ap = borne((t - D.sortie) / (D.pose - D.sortie));
      let posEffet;
      if (roulage) {
        const e = roulage.pas(Math.max(0, t - D.sortie), t >= D.sortie ? dt : 0);
        voiture.position.x = e.x;
        modele.chassis.position.y = e.chassis.y; modele.chassis.rotation.z = e.chassis.tangage;
        for (const w of modele.roues) w.pivot.position.y = w.avant ? e.roues.av : e.roues.ar;
        if (modele.fam === 'helico') {                                    // l'hélico glisse sur la dalle, ne décolle qu'une fois dehors
          const dehors = lisse(borne((e.x + modele.xArriere - xO) / 1.2));
          modele.chassis.position.y = dalle + 1.6 * dehors * (1 - borne((t - D.pose) / 2.5) * 0.35) + Math.sin(t * 2.4) * 0.05 * dehors;
          modele.chassis.rotation.z = -0.06 * dehors * (1 - ap);
        }
        modele.maj(dt, e.v, t, e.glissement);
        const yb = e.x + modele.essieuArriere > xO ? 0 : dalle;
        ombre.position.set(e.x, yb + 0.02, 0); ombre.material.opacity = 0.7;
        posEffet = V3(e.x, yb, 0);
        if (e.glissement > 0.05 && t > D.sortie) contactPneus(e.x + modele.essieuArriere, dalle, e.glissement);
        for (const ev of e.evenements) {
          if (ev.startsWith('seuil')) { etincellesChassis(e.x + (ev.endsWith('av') ? modele.essieuAvant : modele.essieuArriere), dalle + 0.05); if (son) impact(1); }
          else if (ev.startsWith('sol')) { fumee(4, e.x + (ev.endsWith('av') ? modele.essieuAvant : modele.essieuArriere), 0.05, 0, 0.4); if (son) impact(0); }
        }
      } else {
        const x = xDepart + (xArrivee - xDepart) * (1 - Math.pow(1 - ap, 2.4));
        const horsSeuil = x - LONG / 2 > xO;
        const y = horsSeuil ? Math.max(0, dalle * (1 - borne((x - LONG / 2 - xO) / 1.2))) : dalle;
        const rebond = ap >= 1 ? Math.sin(Math.min(1, (t - D.pose) * 3) * Math.PI) * 0.12 * Math.exp(-(t - D.pose) * 2) : 0;
        voiture.position.set(x, y + rebond, 0.2);
        voiture.rotation.z = ap > 0 && ap < 1 ? -0.04 * Math.sin(ap * Math.PI) : 0;
        ombre.position.set(x, 0.02, 0.2); ombre.material.opacity = horsSeuil ? 0.75 : 0.0;
        reflet.visible = horsSeuil;
        posEffet = voiture.position;
      }
      if (t >= tSeuil && !etat.seuil) {                                  // le bolide franchit le seuil : filtre, jingle (déjà programmé), univers
        etat.seuil = true; sigPunch = 1; post.u.sig.value = FILTRES_SIGNATURE[SIG.filtre] || 13;
        flashV = Math.max(flashV, trailer ? 0.6 : 0.4); secousse = Math.max(secousse, trailer ? 0.45 : 0.25); coupZoom = 8;
      }
      if (trailer && t >= D.bascule + D.dech && !etat.univers) {         // la déchirure est complète : le décor appartient à l'univers
        etat.univers = true; flashV = Math.max(flashV, 0.35);
        scene.background.set(A.fond); scene.fog.color.set(A.brouillard); contre.color.set(A.lumiere);
        if (cel) cel.appliquer();
      }
      if (etat.seuil) particulesSignature(dt, ap < 1 ? 1 : 0.5);
      if (ap > 0 && !etat.sortie) { etat.sortie = true; if (son) bruit('moteur'); if (palier === 'legendaire' || palier === 'relique_interdite') flasher(); }
      if (ap > 0 && ap < 1) effetTheme(effet, posEffet, LONG, haut, dt);
      if (ap >= 1 && !etat.pose) { etat.pose = true; poseRarete(); if (son) impact(0, true); }
      if (etat.pose && t < D.stats && Math.random() < (R.particules.rayons ? 0.35 : 0.15)) auraRarete(1);
      for (let i = eclairs.length - 1; i >= 0; i--) { const e = eclairs[i]; e.vie -= dt; e.l.material.opacity = Math.max(0, e.vie / e.max); if (e.vie <= 0) { scene.remove(e.l); e.l.geometry.dispose(); e.l.material.dispose(); eclairs.splice(i, 1); } }
      if (t < D.sortie) { voiture.position.x += fret.position.x; voiture.position.y = fret.position.y + (modele ? 0 : dalle); ombre.visible = t >= D.arrivee; }
      else { if (modele) voiture.position.y = 0; ombre.visible = true; }
      majParts(dt);
      coupZoom = Math.max(0, coupZoom - dt * 14);
      camera.fov = 38 - coupZoom; camera.updateProjectionMatrix();
      camera.position.copy(cam); camera.lookAt(cib);

      // ---------- 4. titre + réplique tapée ; 5. jauges (reveal Fret)
      if (!trailer) {
        if (t >= D.titre && !etat.titre) { etat.titre = true; el.classList.add('titre'); }
        if (etat.titre) { const nb = Math.floor(borne((t - D.titre - 0.5) / Math.max(1.2, Math.min(2.6, cit.length * 0.035))) * cit.length); if (typeur.textContent.length !== nb) typeur.textContent = cit.slice(0, nb); }
        if (t >= D.stats && !etat.stats) {
          etat.stats = true; el.classList.add('stats');
          el.querySelectorAll('.fret-stat').forEach((s, i) => setTimeout(() => { if (fini) return; s.classList.add('on'); if (son) impact(i); }, i * (express ? 170 : 300)));
        }
      }
      if (trailer && t >= D.freeze && !fige) { cadrageHeroique(); flashV = 1; secousse = 0; if (son) impact(0, true); fige = true; el.classList.add('fige'); }
      majPost(t, dt); post.scene(scene, camera); post.passe();
      if (surcouche) surcouche.dessiner(fige ? { phase: 'freeze', k: 0, focus: focusFige, dt } : { phase: t < D.bascule ? 'amorce' : 'bascule', k: t - D.bascule, focus: focusEcran(), dt });
      if (pasFixe) window.__fretT = t;                       // repère pour les captures de contrôle
      if (recDessin) recDessin(t);
      raf = requestAnimationFrame(tick);
    };

    function poussiereAtterrissage() {               // anneau de poussière au ras du sol, chassé de sous le conteneur
      emettre(express ? 14 : 26, () => { const a = Math.random() * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        return { mat: matPart('#8a8fa3', texD, false), pos: V3(c * L * 0.5, 0.08, sn * P * 0.5), vel: V3(c * (2 + Math.random() * 2.5), 0.2 + Math.random() * 0.4, sn * (2 + Math.random() * 2.5)), taille: 0.5 + Math.random() * 0.5, croit: 1.6, vie: 1 + Math.random() * 0.6, op: 0.28, frein: 1.6 }; });
    }
    function etincellesCales(n) {                          // le conteneur cogne sur ses cales : gerbes d'étincelles au ras du sol
      emettre(n, () => { const x = (Math.random() < 0.5 ? -1 : 1) * L * 0.36, z = (Math.random() < 0.5 ? -1 : 1) * P * 0.36;
        return { mat: matPart(Math.random() < 0.6 ? '#ffcf6a' : (rang === 4 ? '#ff3b4a' : '#ffffff'), texD, true), pos: V3(x, 0.05, z), vel: V3((Math.random() - 0.5) * 6, 1.5 + Math.random() * 3.5, (Math.random() - 0.5) * 6 + 1), taille: 0.16, vie: 0.5, g: -14, frein: 0.2 }; });
    }
    function contactPneus(xr, y, force) {                // gomme qui patine sur le plancher en tôle
      emettre(2, () => ({ mat: matPart('#b9bfd2', texD, false), pos: V3(xr - 0.2, y + 0.15, (Math.random() < 0.5 ? -1 : 1) * (modele ? modele.largeur * 0.4 : 1)), vel: V3(-1.5 - Math.random() * 2, 0.6 + Math.random(), (Math.random() - 0.5)), taille: 0.6 + Math.random() * 0.5, croit: 1.8, vie: 1.1, op: 0.35 * force, frein: 0.9 }));
      if (Math.random() < 0.5 * force) emettre(2, () => ({ mat: matPart('#ffd27a', texD, true), pos: V3(xr, y + 0.04, (Math.random() - 0.5) * 2), vel: V3(-3 - Math.random() * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 2), taille: 0.16, vie: 0.45, g: -14, frein: 0.2 }));
    }
    function etincellesChassis(x, y) {                     // le dessous frotte sur le seuil
      emettre(10, () => ({ mat: matPart(Math.random() < 0.7 ? '#ffcf6a' : '#ffffff', texD, true), pos: V3(x, y, (Math.random() - 0.5) * 2.4), vel: V3(-1 + Math.random() * 6, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 3), taille: 0.18, vie: 0.5, g: -14, frein: 0.2 }));
    }
    function flasher(fort = true) {
      if (trailer) { flashV = Math.max(flashV, fort ? 0.75 : 0.25); if (!fort) eclairV = 0.18; return; }
      flash.style.setProperty('--flash', fort ? '.75' : '.3'); flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    }
    function poseRarete() {
      el.classList.add('rar-on');
      const P2 = R.particules;
      emettre(Math.round(P2.n * (express ? 0.35 : 0.6)), () => {
        const a = Math.random() * Math.PI * 2, v = P2.vitesse * (0.5 + Math.random());
        return { mat: matPart(P2.couleurs[Math.floor(Math.random() * P2.couleurs.length)], Math.random() < 0.4 ? texE : texD, true),
          pos: V3(voiture.position.x + (Math.random() - 0.5) * LONG, 0.4 + Math.random() * haut, 0.4), vel: V3(Math.cos(a) * v, Math.abs(Math.sin(a)) * v + 1.5, (Math.random() - 0.5) * 2),
          taille: P2.taille * 3.2 * (0.5 + Math.random()), vie: 1.1 + Math.random() * 1.2, g: -2.5, frein: 0.8, tourne: (Math.random() - 0.5) * 4 };
      });
      if (P2.rayons) {
        const rayons = new THREE.Mesh(garde(new THREE.PlaneGeometry(26, 26)), garde(new THREE.MeshBasicMaterial({ map: garde(texRayons(R.couleur)), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
        rayons.position.set(voiture.position.x, haut * 0.55, -1.5); scene.add(rayons);
        const t0 = performance.now();
        const anim = () => { if (fini) return; const k = (performance.now() - t0) / 1000; rayons.material.opacity = Math.min(0.32, k * 0.6) * (k > 6 ? Math.max(0, 1 - (k - 6)) : 1); rayons.rotation.z = k * 0.15; if (k < 7.2) requestAnimationFrame(anim); };
        anim();
      }
      if (P2.glitch) el.classList.add('glitch');
    }
    function auraRarete(n) {
      const P2 = R.particules;
      emettre(n, () => ({ mat: matPart(P2.couleurs[Math.floor(Math.random() * P2.couleurs.length)], texD, true), pos: V3(voiture.position.x + (Math.random() - 0.5) * LONG * 1.1, 0.2, 0.2 + (Math.random() - 0.5)), vel: V3(0, 1 + Math.random() * 1.6, 0), taille: 0.35 + Math.random() * 0.4, vie: 1.6, frein: 0.1 }));
    }
    function effetTheme(type, pos, lg, hh, dt2) {
      const arriere = pos.x - lg / 2, sol0 = pos.y;
      if (type === 'neons') {
        const c = Math.random() < 0.5 ? '#22d3ee' : '#ff2bd6';
        emettre(3, () => ({ mat: matPart(c, texD, true), pos: V3(arriere + Math.random() * lg * 0.9, sol0 + 0.15, 0.9 + Math.random() * 0.4), vel: V3(-2 - Math.random() * 2, 0.2, 0), taille: 0.9, croit: -0.6, vie: 0.9, frein: 1.2 }));
        if (Math.random() < 0.6) fumee(1, arriere, sol0, 0.2, -0.4);
      } else if (type === 'eclairs') {
        if (Math.random() < dt2 * (trailer ? 1.6 : 5)) {
          const pts = []; let x0 = pos.x + (Math.random() - 0.5) * lg, y0 = hh + 6;
          for (let i = 0; i < 9; i++) { pts.push(V3(x0, y0, -0.5 + Math.random())); x0 += (Math.random() - 0.5) * 1.4; y0 -= (hh + 6) / 8; }
          const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: Math.random() < 0.5 ? 0xbfd7ff : 0xb06bff, transparent: true, blending: THREE.AdditiveBlending }));
          scene.add(l); eclairs.push({ l, vie: 0.18, max: 0.18 }); flasher(false);
        }
        emettre(1, () => ({ mat: matPart('#6b55ff', texD, true), pos: V3(pos.x + (Math.random() - 0.5) * lg, 0.3, 0.4), vel: V3(0, 1.5, 0), taille: 0.5, vie: 0.7 }));
      } else if (type === 'flammes') {
        emettre(4, () => ({ mat: matPart(Math.random() < 0.5 ? '#ff7a1a' : '#ffd23e', texD, true), pos: V3(arriere - 0.1, sol0 + hh * 0.3 + Math.random() * 0.3, 0.3), vel: V3(-5 - Math.random() * 4, (Math.random() - 0.3) * 1.5, 0), taille: 0.8 + Math.random() * 0.6, croit: 0.8, vie: 0.45, frein: 1.5 }));
      } else if (type === 'etincelles') {
        emettre(4, () => ({ mat: matPart(Math.random() < 0.7 ? '#ffcf6a' : '#ffffff', texD, true), pos: V3(arriere + Math.random() * lg * 0.3, sol0 + 0.05, 0.6), vel: V3(-3 - Math.random() * 6, 1 + Math.random() * 3, (Math.random() - 0.5) * 2), taille: 0.22, vie: 0.6, g: -14, frein: 0.2 }));
        if (Math.random() < 0.5) fumee(1, arriere, sol0, 0.2, -0.3);
      } else if (type === 'paillettes') {
        const pastel = ['#ffb3dc', '#b8f2ff', '#fff3a8', '#c9b8ff', '#b8ffd9'];
        emettre(4, () => ({ mat: matPart(pastel[Math.floor(Math.random() * pastel.length)], Math.random() < 0.6 ? texE : texD, true), pos: V3(arriere + Math.random() * lg, sol0 + Math.random() * hh, 0.5), vel: V3(-1.5 - Math.random() * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2), taille: 0.35 + Math.random() * 0.3, vie: 1.4, g: -1.5, tourne: 3 }));
      }
    }
    function terminer() {
      fini = true; cancelAnimationFrame(raf);
      removeEventListener('resize', auResize);
      removeEventListener('keydown', surTouche, true); el.removeEventListener('pointerdown', surClic); removeEventListener('gp:suivant', accepter);
      if (musiqueSource) {                 // fondu de la musique, puis arrêt
        try { const ac = musiqueGain.context, tt = ac.currentTime; musiqueGain.gain.cancelScheduledValues(tt); musiqueGain.gain.setValueAtTime(musiqueGain.gain.value, tt); musiqueGain.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5); musiqueSource.stop(tt + 0.55); } catch (e) { /* déjà arrêtée */ }
      }
      if (stopTheme) stopTheme();
      if (stopSuspense) stopSuspense();
      const nettoyer = () => {
        for (const x of jetables) { try { x.dispose && x.dispose(); } catch (e) { /* rien */ } }
        post.dispose();
        if (cel) { cel.annuler(); cel.dispose(); }
        if (modele) modele.dispose();
        parts.forEach((p) => p.s.material.dispose());
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* rien */ }
        el.remove();
      };
      el.classList.add('fin');
      const apres = () => setTimeout(() => { nettoyer(); resolve(true); }, 450);
      if (rec) recFin().then(apres); else apres();
    }
    if (rec) rec.start();
    raf = requestAnimationFrame(tick);
  });
}

function texRayons(couleur) {
  return texCanvas(512, 512, (g, w) => {
    g.translate(w / 2, w / 2);
    for (let i = 0; i < 18; i++) {
      g.rotate((Math.PI * 2) / 18);
      const lg = g.createLinearGradient(0, 0, w / 2, 0); lg.addColorStop(0, couleur); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, -14); g.lineTo(w / 2, 14); g.closePath(); g.fill();
    }
  });
}

/* ------------------------------------------------------------------ enregistrement vidéo (option) */
function preparerEnregistrement(cvGL, el, car, ov = null) {
  const W = 1920, Hh = 1080;
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh;
  const g = c2.getContext('2d');
  const flux = c2.captureStream(60);
  const S = snd.sortieAudio();
  let dest = null;
  if (S) { dest = S.ac.createMediaStreamDestination(); S.master.connect(dest); dest.stream.getAudioTracks().forEach((t) => flux.addTrack(t)); }
  const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = types.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(flux, mime ? { mimeType: mime, videoBitsPerSecond: 12e6 } : undefined);
  const morceaux = []; rec.ondataavailable = (e) => { if (e.data && e.data.size) morceaux.push(e.data); };
  const R = RARETES[rareteDe(car)];
  const enveloppe = (txt, x, y, larg, lh, max) => { const mots = String(txt).split(' '); let l = '', n = 0; for (const m of mots) { const e = l ? l + ' ' + m : m; if (g.measureText(e).width > larg && l) { g.fillText(l, x, y + n * lh); n++; l = m; if (n >= max) return; } else l = e; } if (l) g.fillText(l, x, y + n * lh); };
  const recDessin = () => {
    g.drawImage(cvGL, 0, 0, W, Hh);
    if (ov) { g.drawImage(ov, 0, 0, W, Hh); return; }          // trailer : tout est déjà dans la surcouche
    const cls = el.classList, cit = el.querySelector('.fret-cit span').textContent;
    if (cls.contains('rar-on')) { g.font = '900 30px Arial Black, Arial'; g.fillStyle = R.couleur; g.fillText(`${'◆'.repeat(R.rang + 1)} ${R.court}`, 80, 90); }
    if (cls.contains('titre')) {
      g.fillStyle = 'rgba(5,4,14,.62)'; g.fillRect(50, 140, 860, 800);
      g.fillStyle = '#ffd34d'; g.font = '700 26px Arial'; g.fillText(`${car.code} · ${car.real_name || ''}`.slice(0, 60), 80, 190);
      g.fillStyle = '#ffffff'; g.font = '900 64px Arial Black, Arial'; g.shadowColor = R.couleur; g.shadowBlur = 24; enveloppe(car.alias || car.code, 80, 268, 800, 70, 2); g.shadowBlur = 0;
      g.fillStyle = '#ffe9a8'; g.font = 'italic 700 34px Georgia, serif'; enveloppe(`« ${cit} »`, 80, 420, 800, 44, 3);
      g.fillStyle = '#c9d2ef'; g.font = '26px Arial'; enveloppe(car.lore || '', 80, 570, 800, 34, 5);
    }
    if (cls.contains('stats')) {
      el.querySelectorAll('.fret-stat').forEach((s, i) => {
        if (!s.classList.contains('on')) return;
        const [k, l, c] = STATS[i], y = 780 + i * 34;
        g.fillStyle = '#fff'; g.font = '700 22px Arial'; g.fillText(l, 80, y);
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(300, y - 16, 500, 14); g.fillStyle = c; g.fillRect(300, y - 16, 5 * Math.max(3, Math.min(100, car[k] || 0)), 14);
        g.fillStyle = '#fff'; g.fillText(String(car[k] ?? '–'), 820, y);
      });
    }
  };
  const recFin = () => new Promise((ok) => {
    rec.onstop = () => {
      if (dest && S) { try { S.master.disconnect(dest); } catch (e) { /* rien */ } }
      const ext = (rec.mimeType || mime).includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(morceaux, { type: rec.mimeType || 'video/webm' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${car.code}_${ov ? 'trailer_invocation' : 'reveal_fret'}.${ext}`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); ok(); }, 800);
    };
    rec.stop();
  });
  return { rec, recDessin, recFin };
}

/* ------------------------------------------------------------------ style de la surcouche */
function injecterCss() {
  if (document.getElementById('fret-css')) return;
  const st = document.createElement('style'); st.id = 'fret-css';
  st.textContent = `
.fret-reveal{position:absolute;inset:0;z-index:60;overflow:hidden;background:#05040c;opacity:0;animation:fretIn .35s forwards;font-family:var(--font-body,system-ui)}
.fret-reveal.fin{animation:fretOut .45s forwards}
@keyframes fretIn{to{opacity:1}}@keyframes fretOut{from{opacity:1}to{opacity:0}}
.fret-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.fret-ov{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.fret-reveal.trailer .fret-txt,.fret-reveal.trailer .fret-rar{display:none}
.fret-proprio{position:absolute;right:3vw;top:3vh;display:flex;align-items:center;gap:12px;padding:8px 18px 8px 10px;border-radius:999px;
  background:rgba(5,4,14,.72);border:1px solid var(--rar);font:800 clamp(14px,1.4vw,26px) var(--font-display,system-ui);color:#fff;
  opacity:0;transform:translateY(-12px);transition:all .45s cubic-bezier(.2,1.4,.4,1) .35s}
.fret-reveal.fige .fret-proprio{opacity:1;transform:none}
.fret-proprio .medal{flex:none}
.fret-suivant{position:absolute;left:50%;bottom:2.4vh;transform:translate(-50%,10px);padding:8px 18px;border-radius:999px;background:rgba(5,4,14,.7);
  border:1px solid rgba(255,255,255,.25);color:#e9eefc;font:700 clamp(12px,1.05vw,19px) var(--font-body,system-ui);opacity:0;transition:all .5s;pointer-events:none;z-index:3}
.fret-suivant kbd{font:800 .95em var(--font-mono,monospace);padding:2px 8px;border-radius:6px;background:#fff;color:#111;margin-right:4px}
.fret-reveal.attente .fret-suivant{opacity:.85;transform:translate(-50%,0);animation:fretInvite 2.4s ease-in-out infinite}
@keyframes fretInvite{50%{opacity:.45}}
.fret-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.fret-flash.on{animation:fretFlash .22s ease-out}
@keyframes fretFlash{0%{opacity:var(--flash,.75)}100%{opacity:0}}
.fret-rar{position:absolute;left:4vw;top:5vh;font:900 clamp(16px,2vw,34px) var(--font-display,system-ui);letter-spacing:.14em;color:var(--rar);
  text-shadow:0 0 18px var(--rar-l),0 0 2px #fff;opacity:0;transform:translateY(-14px) scale(.9);transition:all .5s cubic-bezier(.2,1.4,.4,1)}
.fret-reveal.rar-on .fret-rar{opacity:1;transform:none}
.fret-reveal.glitch .fret-rar{animation:fretGlitch .9s steps(2) infinite}
@keyframes fretGlitch{0%{text-shadow:3px 0 #00e5ff,-3px 0 #ff2d55}50%{text-shadow:-3px 0 #00e5ff,3px 0 #ff2d55;transform:translateX(2px)}}
.fret-txt{position:absolute;left:4vw;top:12vh;width:min(46vw,860px);padding:2.2vh 2vw;border-radius:22px;
  background:linear-gradient(160deg,rgba(10,8,28,.78),rgba(5,4,14,.55));border:1px solid color-mix(in srgb,var(--rar) 55%,transparent);
  box-shadow:0 0 40px color-mix(in srgb,var(--rar-l) 30%,transparent);backdrop-filter:blur(6px);opacity:0;transform:translateX(-30px);transition:all .6s cubic-bezier(.2,.9,.3,1)}
.fret-reveal.titre .fret-txt{opacity:1;transform:none}
.fret-equipe{display:flex;align-items:center;gap:12px;margin-bottom:1vh;font:700 clamp(14px,1.3vw,22px) var(--font-display,system-ui);color:#fff}
.fret-equipe .medal{flex:none}
.fret-code{font:700 clamp(12px,1.1vw,20px) var(--font-mono,monospace);color:var(--gold-2,#ffd34d);letter-spacing:.06em}
.fret-alias{margin:.4vh 0;font:900 clamp(30px,4.2vw,80px)/1.02 var(--font-display,system-ui);text-transform:uppercase;color:#fff;
  text-shadow:0 0 6px #fff,0 0 22px var(--rar),0 0 44px var(--rar-l)}
.fret-ecurie{font:600 clamp(12px,1vw,18px) var(--font-body,system-ui);color:#aab4d8;text-transform:uppercase;letter-spacing:.08em}
.fret-cit{margin:1.6vh 0 1vh;font:italic 700 clamp(18px,1.9vw,34px)/1.25 var(--font-serif,Georgia,serif);color:#ffe9a8;min-height:2.6em}
.fret-cit span::after{content:'▌';color:var(--rar);animation:fretCurseur .7s steps(1) infinite;margin-left:2px}
@keyframes fretCurseur{50%{opacity:0}}
.fret-lore{font:clamp(13px,1.15vw,21px)/1.4 var(--font-body,system-ui);color:#d4dbf2;opacity:0;transition:opacity .8s 1.6s}
.fret-reveal.titre .fret-lore{opacity:1}
.fret-stats{display:grid;gap:.9vh;margin-top:2vh}
.fret-stat{display:grid;grid-template-columns:clamp(110px,10vw,190px) 1fr 3em;gap:12px;align-items:center;font:700 clamp(13px,1.05vw,19px) var(--font-body,system-ui);color:#fff;opacity:.25;transition:opacity .2s}
.fret-stat i{height:clamp(10px,1.1vh,16px);border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden}
.fret-stat b{display:block;height:100%;width:var(--v);border-radius:9px;background:linear-gradient(90deg,var(--c),#fff);box-shadow:0 0 14px var(--c);transform-origin:0 50%;transform:scaleX(0);transition:transform .55s cubic-bezier(.2,1.3,.4,1)}
.fret-stat em{font-style:normal;text-align:right;font-weight:900}
.fret-stat.on{opacity:1}.fret-stat.on b{transform:scaleX(1)}
.fret-cote{margin-top:1.4vh;font:700 clamp(13px,1.05vw,19px) var(--font-mono,monospace);color:#cfd6ee}.fret-cote b{color:var(--gold-2,#ffd34d);font-size:1.25em}
@media (max-width:820px){.fret-txt{left:3vw;right:3vw;width:auto;top:auto;bottom:3vh}.fret-alias{font-size:clamp(24px,7vw,40px)}}
@media (prefers-reduced-motion:reduce){.fret-reveal *{transition:none!important;animation:none!important}}`;
  document.head.appendChild(st);
}
