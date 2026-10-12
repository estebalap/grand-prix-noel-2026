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
   La voiture est le VRAI modèle 3D sculpté du bolide (m3d/groupe1..10.js via bolides3d.js : volumes galbés, laque
   multicouche à vernis, pneus boudins en révolution, jantes en retrait, disques ventilés, optiques à lentille) qui SORT EN ROULANT (roulage.js : roues à ω = v / R, patinage au démarrage,
   cabrage, compression au seuil, arête de la dalle enroulée, tangage avant à l'arrêt, fumée et étincelles au contact).
   AUCUN REPLI « CARTON » : sans modèle sculpté valide, revealFret publie l'erreur (window.__fretErreur, console) et renvoie
   false ; l'appelant passe visiblement à la cinématique photo, et la capture vidéo refuse le clip.
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
   (false si WebGL, Three.js ou le modèle sculpté manquent : l'appelant passe alors à la cinématique photo ou à la fiche). */
import { esc } from './core.js';
import * as snd from './audio.js';
import { themeDe, jingle, chargerReveal } from './reveal.js';
import { rareteDe, infoRarete, coteAffichee } from './rarete.js';
import { construireBolide3D, envNeon } from './bolides3d.js';
import { creerHangar } from './hangar3d.js';
import { code128B } from './code128.js';
import { remixJingle } from './remix_jingle.js';
import { creerRoulage } from './roulage.js';
import { ARCHETYPES, archetypeDe, creerPost, celShading, creerSurcouche, prechargerPolices, themeSonore } from './archetypes.js';
import { chronologie, gabarit, GABARIT, progressionRideau } from './chronologie.js';
import { creerDecor, creerMiroirModele } from './decors3d.js';
import { chargerSignatures, signatureDe, jingleEntree, suspenseSonore, ambianceSonore, texturesParticules, PARTICULES_SIGNATURE, FILTRES_SIGNATURE } from './signatures.js';
import { typeMoteur, preparerSonsReveal, creerSalle, jouerMoteur, chargerCri, jouerCri, parlerNom, creerBusFond } from './reveal_sons.js';

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
/** Bordereau d'expédition riveté sur le toit : plaque d'aluminium brossé, en-tête douanier, code au pochoir, champs du manifeste,
 *  code-barres Code 128 réel (lisible par une douchette), tampon d'inspection délavé, coins cornés et usure. 1024 × 648 px = 3,0 × 1,9 m. */
export const BORDEREAU = { l: 3.0, p: 1.9, rivets: [[0.07, 0.07], [1.0, 0.07], [2.0, 0.07], [2.93, 0.07], [0.07, 1.83], [1.0, 1.83], [2.0, 1.83], [2.93, 1.83]] };
export function texBordereau(car, rarete) {
  const code = String(car.code || '?'), num = (code.match(/\d+/) || ['0'])[0];
  const alea = (() => { let a = 0; for (const c of code) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  return texCanvas(1024, 648, (g, w, h) => {
    const px = w / BORDEREAU.l, pz = h / BORDEREAU.p;
    // aluminium brossé
    g.fillStyle = '#b4b8bd'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { const y = alea() * h; g.fillStyle = `rgba(${alea() < 0.5 ? '255,255,255' : '40,44,50'},${0.03 + alea() * 0.06})`; g.fillRect(alea() * w - 100, y, 120 + alea() * 500, 1); }
    // biseau et cadre
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 6, h);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h - 6, w, 6); g.fillRect(w - 6, 0, 6, h);
    g.strokeStyle = 'rgba(20,24,30,.55)'; g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
    // en-tête douanier
    g.fillStyle = '#1b2433'; g.fillRect(46, 46, w - 92, 78);
    g.fillStyle = '#f2f2ee'; g.textBaseline = 'middle';
    let f = 34; do { g.font = `700 ${f}px "Bahnschrift Condensed","Arial Narrow",Arial,sans-serif`; f -= 1; } while (g.measureText('BORDEREAU D’EXPÉDITION CLASSIFIÉ — GP NOËL FRET').width > w - 140 && f > 14);
    g.fillText('BORDEREAU D’EXPÉDITION CLASSIFIÉ — GP NOËL FRET', 66, 86);
    // code du bolide au pochoir (ponts du pochoir : bande horizontale épargnée)
    {                                                                 // pochoir : les ponts sont épargnés sur un calque à part, puis peints sur la plaque
      const c = document.createElement('canvas'); c.width = 500; c.height = 260; const p = c.getContext('2d');
      p.fillStyle = '#121418'; let fz = 212; do { p.font = `400 ${fz}px Stencil,"Stencil Std",Impact,"Arial Black",sans-serif`; fz -= 4; } while (p.measureText(code).width > 470 && fz > 60);
      p.textBaseline = 'alphabetic'; p.fillText(code, 2, 222);
      p.globalCompositeOperation = 'destination-out'; p.fillRect(0, 138, 500, 9);
      for (let i = 0; i < 900; i++) p.fillRect(alea() * 500, alea() * 260, 1 + alea() * 2, 1 + alea() * 2);   // peinture écaillée
      g.globalAlpha = 0.92; g.drawImage(c, 60, 130); g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(18,20,24,.85)'; g.font = '700 22px "Bahnschrift","Arial Narrow",Arial,sans-serif'; g.fillText('CONTENU', 66, 152);
    // champs du manifeste
    const champs = [['N° MANIFESTE', `GPNU ${code}-2312`], ['POIDS BRUT', String(car.poids_estime || '—').replace('g', ' g')], ['HOMOLOGATION', `CAT. ${String((rarete && (rarete.nomBase || rarete.nom)) || 'HORS NORMES').replace(/^Rareté /, '').toUpperCase()}`],
      ['PROVENANCE', String(car.ecurie || 'INCONNUE').toUpperCase()], ['DESTINATION', 'GRILLE DE NOËL · 23/12']];
    champs.forEach(([k, v], i) => {
      const y = 166 + i * 40;
      g.fillStyle = 'rgba(18,20,24,.7)'; g.font = '700 18px Consolas,"Courier New",monospace'; g.fillText(k, 560, y);
      let fs = 22; do { g.font = `700 ${fs}px Consolas,"Courier New",monospace`; fs -= 1; } while (g.measureText(v).width > 270 && fs > 11);
      g.fillStyle = '#0f1115'; g.fillText(v, 712, y);
      g.fillStyle = 'rgba(18,20,24,.25)'; g.fillRect(560, y + 16, 418, 1);
    });
    // code-barres Code 128 (jeu B), zones de silence comprises
    const donnees = `GPNF-${code}-2312`, modules = code128B(donnees), xb = 70, lb = 600, mod = lb / (modules.length + 20);
    g.fillStyle = '#e9ebee'; g.fillRect(xb - 10, 410, lb + 20, 150);
    g.fillStyle = '#0b0c0e'; for (let i = 0; i < modules.length; i++) if (modules[i] === '1') g.fillRect(xb + (10 + i) * mod, 420, Math.ceil(mod), 104);
    g.font = '700 22px Consolas,"Courier New",monospace'; g.textAlign = 'center'; g.fillText(donnees, xb + lb / 2, 544); g.textAlign = 'left';
    // tampon d'inspection douanière, encre rouge délavée
    const tp = document.createElement('canvas'); tp.width = 360; tp.height = 220; const t = tp.getContext('2d');
    t.strokeStyle = t.fillStyle = '#b3261e'; t.lineWidth = 7; t.strokeRect(10, 10, 340, 200); t.lineWidth = 3; t.strokeRect(22, 22, 316, 176);
    t.textAlign = 'center'; t.font = '900 40px Impact,"Arial Black",sans-serif'; t.fillText('DOUANE', 180, 76);
    t.font = '800 30px "Bahnschrift","Arial Narrow",sans-serif'; t.fillText('INSPECTÉ · SCELLÉ', 180, 120);
    t.font = '700 24px Consolas,"Courier New",monospace'; t.fillText(`N° ${num.padStart(4, '0')} · 23.12`, 180, 168);
    t.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600; i++) { t.fillStyle = `rgba(0,0,0,${0.3 + alea() * 0.7})`; t.fillRect(alea() * 360, alea() * 220, 1 + alea() * 4, 1 + alea() * 3); }
    g.save(); g.translate(812, 470); g.rotate(-0.21); g.globalAlpha = 0.72; g.drawImage(tp, -180, -110); g.restore();
    // trous des rivets (les têtes sont en 3D)
    for (const [rx, rz] of BORDEREAU.rivets) { const cx = rx * px, cy = (BORDEREAU.p - rz) * pz; g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); }
    // usure : coins cornés, rayures, crasse dans les angles
    g.fillStyle = 'rgba(30,26,20,.55)';
    for (const [x, y, dx, dy] of [[w, 0, -1, 1], [0, h, 1, -1]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 64, y); g.lineTo(x, y + dy * 52); g.closePath(); g.fill(); }
    for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(255,255,255,${0.08 + alea() * 0.18})`; g.lineWidth = 1; g.beginPath(); const x = alea() * w, y = alea() * h; g.moveTo(x, y); g.lineTo(x + (alea() - 0.5) * 140, y + (alea() - 0.5) * 30); g.stroke(); }
    const sale = g.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, w * 0.62); sale.addColorStop(0, 'rgba(40,32,20,0)'); sale.addColorStop(1, 'rgba(40,32,20,.45)'); g.fillStyle = sale; g.fillRect(0, 0, w, h);
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


/* ------------------------------------------------------------------ coups d'habillage (jauges, arrêt sur image) : purement graphiques, pas mécaniques */
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
/* Morceau propre à chaque bolide (web/data/musique_bolides.json : titre, artiste, instant du passage emblématique). Il est cherché
   dans TOUTE la bibliothèque Musique/ (le fichier « Hatsune Miku - World is Mine.m4a » rangé dans 03_Japon suffit) : nom de fichier
   qui contient le titre (accents, ponctuation et casse ignorés), l'artiste départageant les homonymes. */
let fichesMusique = null, toutesMusiques = null;
const normal = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
async function morceauDuBolide(code, base) {
  if (!fichesMusique) { try { const r = await fetch(`${base}/data/musique_bolides.json`, { cache: 'no-cache' }); fichesMusique = r.ok ? (await r.json()).bolides || {} : {}; } catch (e) { fichesMusique = {}; } }
  const f = fichesMusique[code]; if (!f) return null;
  if (!toutesMusiques) {
    toutesMusiques = [];
    try { const r = await fetch(`${base}/api/v2/music`, { cache: 'no-cache' }); if (r.ok) for (const fs of Object.values((await r.json()).folders || {})) for (const x of fs || []) toutesMusiques.push({ src: x.src, n: normal(decodeURIComponent(x.src.split('/').pop()).replace(/\.[a-z0-9]+$/i, '')) }); } catch (e) { /* pas de relais */ }
  }
  const trouve = (g) => {
    if (!g) return null;
    if (g.fichier) { const n = normal(g.fichier), x = toutesMusiques.find((y) => y.n === n); if (x) return x; }   // nom de fichier exact (homonymes : 5 « Rainbow Road »)
    const mots = (g.motsCles || []).map(normal).filter(Boolean);
    if (mots.length) { const x = toutesMusiques.find((y) => mots.every((m) => (' ' + y.n + ' ').includes(' ' + m + ' '))); if (x) return x; }
    const titre = normal(g.titre); if (!titre) return null;
    const artiste = normal(g.artiste).split(' ').filter((m) => m.length > 2);
    const score = (x) => artiste.filter((m) => x.n.includes(m)).length;
    const candidats = toutesMusiques.filter((x) => (' ' + x.n + ' ').includes(' ' + titre + ' ') && (titre.length >= 12 || score(x) > 0));   // titre court (« Cars ») : l'artiste doit aussi figurer
    candidats.sort((a, b) => score(b) - score(a));
    return candidats[0] || null;
  };
  const x = trouve(f);                                                        // 1. le morceau idéal, s'il a été ajouté à la bibliothèque
  if (x) return { src: x.src, fiche: f };
  const y = trouve(f.repli);                                                  // 2. le meilleur morceau déjà possédé, propre à ce bolide
  return y ? { src: y.src, fiche: { ...f.repli, remix: f.repli.remix } } : null;
}
async function chargerMusique(code, genre, base, dossier = MUSIQUE_DOSSIER) {
  const S = snd.sortieAudio(); if (!S) return null;
  const dispo = await fichiersReveal(base, dossier);
  let src = dispo[String(code).toLowerCase()], fiche = null;                    // 1. Musique/<dossier>/CODE.* (choix explicite)
  if (!src) { const m = await morceauDuBolide(code, base); if (m) { src = m.src; fiche = m.fiche; } }   // 2. le morceau du bolide, où qu'il soit rangé
  else { await morceauDuBolide(code, base); const f = fichesMusique && fichesMusique[code]; if (f && f.remix) fiche = { remix: f.remix }; }   // fichier explicite : le mode remix du bolide s'applique quand même
  if (!src) src = dispo[String(genre).toLowerCase()];                          // 3. le thème de l'univers / du genre
  if (!src) return null;
  const url = (base === '..' ? '' : base) + src;
  if (memoMusique.has(url)) return memoMusique.get(url);
  try {
    const r = await fetch(url);
    if (!r.ok) { memoMusique.set(url, null); return null; }
    let buf = await S.ac.decodeAudioData(await r.arrayBuffer());
    if (fiche && fiche.remix === 'jingle') { buf = await remixJingle(buf, S.ac.sampleRate); fiche = { ...fiche, debut_s: 0, debut_sur: true }; }
    const m = { buf, drop: fiche && fiche.debut_sur && Number.isFinite(fiche.debut_s) ? Math.min(fiche.debut_s, Math.max(0, buf.duration - 4)) : detecterDrop(buf), url, titre: fiche ? `${fiche.artiste} — ${fiche.titre}` : null,
      vitesse: fiche && Number.isFinite(fiche.vitesse) && fiche.vitesse > 0 ? Math.min(4, fiche.vitesse) : 1,   // « x2 » : lecture accélérée (plus aiguë)
      calee: !!(fiche && fiche.debut_sur) };
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

/** Préchauffage (régie, capture vidéo) : charge d'avance tout ce que revealFret attendrait avant sa première image —
 *  données, signatures, polices, musique décodée, cri du commentateur, texture et géométries du bolide — pour que le
 *  reveal démarre à l'image près, sans écran noir de chargement. Renvoie un résumé (et l'erreur 3D s'il y en a une). */
export async function prechargerReveal(car, { mode = 'trailer', base = '..' } = {}) {
  const t0 = performance.now(), res = { code: car && car.code, musique: null, cri: false, modele: null, erreur3d: null };
  if (!car) return res;
  await Promise.all([chargerReveal(base).catch(() => null), chargerSignatures(base)]);
  const trailer = mode === 'trailer', R = infoRarete(car), cleA = R.arche && ARCHETYPES[R.arche] ? R.arche : archetypeDe(car);
  if (trailer) await prechargerPolices();
  if (snd.sortieAudio()) {
    const m = await (trailer ? chargerMusique(car.code, cleA, base, MUSIQUE_TRAILERS) : chargerMusique(car.code, themeDe(car).musique, base)).catch(() => null);
    res.musique = m ? m.url : null;
    res.cri = !!(await chargerCri(car.code, base, snd.sortieAudio()).catch(() => null));
  }
  try { const m = await construireBolide3D(car.code, { THREE: T() }); res.modele = m.source; m.dispose(); }
  catch (e) { res.erreur3d = String(e && e.message || e); }
  res.ms = Math.round(performance.now() - t0);
  return res;
}

/* ------------------------------------------------------------------ la scène */
export async function revealFret(parent, opts = {}) {
  const { car, teamId = null, team = null, couleurs = null, equipeHtml = '', express = false, son = true, base = '..', enregistrer = false, pasFixe = 0, mode = 'fret', tenue = null, premiereImage = null } = opts;
  if (!car || !revealFretDisponible()) return false;
  await Promise.all([chargerReveal(base).catch(() => null), chargerSignatures(base)]);
  const THREE = T();
  const trailer = mode === 'trailer';
  const R = infoRarete(car);                                        // palier de base + habillage « rarete_custom » éventuel
  const cleA = R.arche && ARCHETYPES[R.arche] ? R.arche : archetypeDe(car), A = ARCHETYPES[cleA];     // le profil signature peut imposer la DA d'univers
  const SIG0 = signatureDe(car.code), CSIG = R.sig || null;
  const SIG = CSIG ? { ...SIG0, particules: CSIG.particules[0], extra: CSIG.particules.slice(1), jingle: CSIG.jingle, filtre: CSIG.filtre || SIG0.filtre } : SIG0;
  const th = themeDe(car), effet = trailer ? EFFETS_ARCHE[cleA] : (EFFETS[th.style] || 'etincelles');
  const palier = rareteDe(car), rang = Math.max(0, Math.min(4, Math.max(R.rang | 0, R.custom ? 3 : 0)));       // raretés signature : au moins le séisme d'un Légendaire
  const acc = (couleurs && couleurs[0]) || R.couleur;
  // tenue : null = l'écran final attend Espace / clic ; un nombre = passe tout seul après ce délai (enregistrement : 4 s)
  const tenueAuto = tenue != null && tenue !== '' ? Math.max(0, Number(tenue)) : (enregistrer ? 4 : null);

  /* --- chronologie : atterrissage → suspense (paliers de rareté) → scellé → rideau → sortie → seuil → pose → arrêt sur image */
  const X = express ? 0.55 : 1;
  const D = chronologie({ rang, express, trailer });                // chronologie.js : testée sous Node
  if (trailer) await prechargerPolices();

  /* --- DOM : canvas WebGL + surcouche texte */
  const el = document.createElement('div');
  el.className = 'fret-reveal' + (trailer ? ' trailer arche-' + cleA : '') + (R.custom ? ' cust cust-' + R.custom : '');
  el.style.cssText = `--rar:${R.couleur};--rar-l:${R.lueur};--acc:${acc}`;
  el.innerHTML = `<canvas class="fret-cv"></canvas>${trailer ? `<canvas class="fret-ov"></canvas>${equipeHtml ? `<div class="fret-proprio">${equipeHtml}</div>` : ''}` : ''}<div class="fret-flash"></div>
    <div class="fret-rar${R.custom ? ' fret-rar-cust rar-c-' + R.custom : ''}" style="--cb:${R.carte[0]}">${R.custom ? '' : '◆'.repeat(R.rang + 1) + ' '}${esc(R.court)}</div>
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
  const hemi = new THREE.HemisphereLight(0x8090ff, 0x100818, 0.35); scene.add(hemi);
  const BASE = { cle: 0.55, contre: 0.42, hemi: 0.12 };                // hangar : pénombre (la suspension sodium éclaire) ; l'univers du trailer reprend 2,0 / 0,9 / 0,35
  const cle = new THREE.SpotLight(0xfff2dd, 2.0, 80, Math.PI / 7, 0.6, 1.2); cle.position.set(-2, 18, 14); cle.target.position.set(2, 2, 0); scene.add(cle, cle.target);
  const contre = new THREE.PointLight(new THREE.Color(R.lueur), 0.9, 40); contre.position.set(-8, 9, -10); scene.add(contre);
  const sol = new THREE.Mesh(garde(new THREE.PlaneGeometry(160, 160)), garde(new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.9 })));   // béton du hangar posé dès que le gabarit est connu
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);

  /* --- le bolide d'abord : sa hauteur (ailerons, gyrophares, rotor compris) fixe la hauteur libre du conteneur */
  const env = envNeon(THREE, renderer);
  const decor = trailer ? creerDecor(THREE, cleA, { code: car.code, env }) : null;       // décors 3D des univers (decors3d.js) : cachés jusqu'à la déchirure
  if (decor) { scene.add(decor.groupe, decor.lumieres); if (decor.miroir) scene.add(decor.miroir); }
  let solDefaut = sol.material, hangar = null;
  /* Le VRAI modèle sculpté (m3d/) ou rien : plus aucun repli silencieux vers le profil 2D extrudé ni vers un panneau photo.
     En cas d'échec, l'erreur est publiée (console + window.__fretErreur), la scène est démontée et revealFret renvoie false :
     l'appelant (TV, page reveal) bascule alors, de façon visible et journalisée, sur la cinématique photo. La capture vidéo, elle, s'arrête net. */
  let modele = null;
  try { modele = await construireBolide3D(car.code, { THREE, envMap: env }); }
  catch (e) { modele = null; window.__fretErreur = { code: car.code, message: String(e && e.message || e), t: Date.now() }; console.error('[reveal 3D] REFUS :', e); }
  if (!modele || modele.source !== 'sur-mesure') {
    if (modele) { window.__fretErreur = { code: car.code, message: 'modèle non sculpté (' + modele.source + ')', t: Date.now() }; console.error('[reveal 3D] REFUS : modèle ' + modele.source + ' pour ' + car.code); modele.dispose(); }
    for (const x of jetables) { try { x.dispose && x.dispose(); } catch (e2) { /* rien */ } }
    if (decor) decor.dispose();
    post.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e2) { /* rien */ }
    removeEventListener('resize', auResize); el.remove();
    return false;
  }
  window.__fretErreur = null;
  window.__fretModele = { code: car.code, source: modele.source, fam: modele.fam, proportion: modele.proportion || null, longueur: modele.longueur, largeur: modele.largeur, hauteur: modele.hauteur,
    roues: modele.roues.map((w) => ({ r: +w.r.toFixed(3), avant: w.avant })) };
  const { dalle, ep } = GABARIT, L = 9.54, P = 4.4, xO = L / 2;
  let sommet = 0;
  if (modele) { const b = new THREE.Box3().setFromObject(modele.groupe); sommet = b.max.y; }
  const { H, hO, yLinteau } = gabarit(sommet);                     // jamais d'aileron, de gyrophare ni de rotor dans le linteau

  /* --- le HANGAR de fret : béton, structure, pont roulant, stock, suspension sodium, brume au sol, ombres de contact (hangar3d.js) */
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  hangar = creerHangar(THREE, { L: 9.54, P: 4.4, H, renderer });
  scene.add(hangar.groupe, hangar.lumieres);
  sol.material = hangar.solMat; solDefaut = hangar.solMat;
  scene.background.set(0x050505); scene.fog.color.set(0x0a0908); scene.fog.density = 0.027;      // la nef se perd dans la pénombre
  hemi.color.set(0x7d8494); hemi.groundColor.set(0x17120c);

  /* --- le conteneur Lootbox Fret (cotes du STL ÷ 10 : 9,54 × 4,16 × 4,4 ; plus haut si le bolide l'exige) */
  const fret = new THREE.Group(); scene.add(fret);
  /* PEINTURE DU CONTENEUR : la tôle est une texture neutre (relief, usure) teintée par un shader. À chaque palier de rareté, une
     vague de peinture balaie le conteneur d'un bout à l'autre (front incandescent) : la caisse ENTIÈRE change de couleur — tôle,
     toit, montants, coffre et rideau — et sa finition avec (le Légendaire devient de l'or métallisé). Pas un éclairage : la peinture. */
  const PEINTURES = [
    { c: '#3b3f48', rough: 0.62, metal: 0.35 },   // avant tout palier : gris anthracite de transport
    { c: '#a9b4c0', rough: 0.58, metal: 0.4 },    // Commun : acier galvanisé clair
    { c: '#1240d8', rough: 0.5, metal: 0.4 },     // Rare : bleu cobalt
    { c: '#6414e0', rough: 0.45, metal: 0.45 },   // Épique : violet
    { c: '#e8a90e', rough: 0.3, metal: 0.82 },    // Légendaire : or métallisé
    { c: '#c00a24', rough: 0.36, metal: 0.6 },    // Relique interdite : rouge sang laqué
  ];
  /* RARETÉS SIGNATURE : le dernier palier ne mène pas à l'or mais à une peinture unique — cyan nacré de Hatsune Miku (vocaloid),
     livrée ferroviaire gris métal à bandeaux carmin et prune pour La Grève (sncf, évocation sans logo) ; les autres signatures
     prennent la couleur de leur rareté. « livree » : bandeaux horizontaux peints par le shader (hauteur relative du conteneur). */
  const PEINTURES_SIGNATURE = {
    vocaloid: { c: '#1fd6e0', rough: 0.3, metal: 0.55 },
    sncf: { c: '#b9bec6', rough: 0.4, metal: 0.5, livree: { a: '#a8002e', b: '#3d0e3a' } },
  };
  if (R.custom) PEINTURES.push(PEINTURES_SIGNATURE[R.custom] || { c: R.couleur, rough: 0.35, metal: 0.55 });
  const P_SIGNATURE = R.custom ? PEINTURES.length - 1 : -1;
  for (const x of PEINTURES) x.col = new THREE.Color(x.c);
  const livS = PEINTURES[PEINTURES.length - 1].livree;
  const uPeinture = { uAvant: { value: PEINTURES[0].col.clone() }, uApres: { value: PEINTURES[0].col.clone() }, uFront: { value: 1e3 }, uLarg: { value: 0.35 }, uBord: { value: 0 }, uOrigine: { value: 0 }, uLueur: { value: 0 },
    uLivAvant: { value: 0 }, uLivApres: { value: 0 }, uBandeA: { value: new THREE.Color(livS ? livS.a : '#000') }, uBandeB: { value: new THREE.Color(livS ? livS.b : '#000') }, uOrigineY: { value: 0 }, uHaut: { value: 4.16 } };
  const peindre = (m, facteur = 1) => {
    m.userData.peinture = true;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uPeinture, { uFacteur: { value: facteur } });
      sh.vertexShader = 'varying float vXMonde; varying float vYMonde;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vec4 pMonde = modelMatrix * vec4(transformed, 1.0); vXMonde = pMonde.x; vYMonde = pMonde.y;');
      sh.fragmentShader = 'uniform vec3 uAvant; uniform vec3 uApres; uniform float uFront; uniform float uLarg; uniform float uBord; uniform float uOrigine; uniform float uFacteur; uniform float uLueur;\n'
        + 'uniform float uLivAvant; uniform float uLivApres; uniform vec3 uBandeA; uniform vec3 uBandeB; uniform float uOrigineY; uniform float uHaut;\nvarying float vXMonde; varying float vYMonde;\n'
        + 'vec3 livree(vec3 base, float on, float y) {\n  float aa = 0.006;\n  float b1 = smoothstep(0.40 - aa, 0.40 + aa, y) * (1.0 - smoothstep(0.53 - aa, 0.53 + aa, y));\n  float b2 = smoothstep(0.555 - aa, 0.555 + aa, y) * (1.0 - smoothstep(0.59 - aa, 0.59 + aa, y));\n  float jupe = 1.0 - smoothstep(0.2 - aa, 0.2 + aa, y);\n  vec3 c = mix(base, uBandeA, b1 * on);\n  c = mix(c, uBandeB, b2 * on);\n  return mix(c, base * 0.42, jupe * on);\n}\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n  float xL = vXMonde - uOrigine;\n  float yN = (vYMonde - uOrigineY) / uHaut;\n  float kPeint = 1.0 - smoothstep(uFront - uLarg, uFront + uLarg, xL);\n  vec3 peintAv = livree(uAvant, uLivAvant, yN), peintAp = livree(uApres, uLivApres, yN);\n  diffuseColor.rgb *= mix(peintAv, peintAp, kPeint) * uFacteur;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  float dF = (xL - uFront) / 0.22;\n  totalEmissiveRadiance += uBord * exp(-dF * dF) * (uApres * 1.6 + vec3(0.35));\n  totalEmissiveRadiance += uLueur * mix(uAvant, uApres, kPeint) * uFacteur;');
    };
    m.customProgramCacheKey = () => 'peinture-conteneur';
    return m;
  };
  const tole = garde(texTole('#d2d4d8'));                                  // neutre : la couleur vient de la peinture
  const matTole = garde(peindre(new THREE.MeshStandardMaterial({ map: tole, roughness: PEINTURES[0].rough, metalness: PEINTURES[0].metal, bumpMap: tole, bumpScale: 0.06 })));
  const matCadre = garde(peindre(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 }), 0.62));   // montants et coffre : même teinte, plus sombre
  const peinture = { de: 0, vers: 0, t0: -1, duree: 0.55 };
  const nouvellePeinture = (i, t) => {                                     // lance la vague vers la peinture i (0 = anthracite)
    if (i === peinture.vers) return;
    uPeinture.uAvant.value.copy(PEINTURES[peinture.vers].col); uPeinture.uApres.value.copy(PEINTURES[i].col);
    uPeinture.uLivAvant.value = PEINTURES[peinture.vers].livree ? 1 : 0; uPeinture.uLivApres.value = PEINTURES[i].livree ? 1 : 0;
    peinture.de = peinture.vers; peinture.vers = i; peinture.t0 = t;
  };
  const majPeinture = (t) => {
    uPeinture.uOrigine.value = fret.position.x; uPeinture.uOrigineY.value = fret.position.y; uPeinture.uHaut.value = H;
    if (peinture.t0 < 0) return;
    const k = Math.min(1, (t - peinture.t0) / peinture.duree), e = k * k * (3 - 2 * k);
    uPeinture.uFront.value = -L / 2 - 0.6 + e * (L + 1.2);               // du fond vers le rideau
    uPeinture.uBord.value = k < 1 ? (1.4 + 0.5 * Math.min(3, peinture.vers - 1)) * Math.sin(Math.PI * Math.min(1, k * 1.15)) : 0;   // onde de choc lumineuse rasante, plus vive à chaque cran
    const a = PEINTURES[peinture.de], b = PEINTURES[peinture.vers];
    for (const m of [matTole, matCadre, matFace]) { m.roughness = a.rough + (b.rough - a.rough) * e; m.metalness = a.metal + (b.metal - a.metal) * e; }
    if (k >= 1) { uPeinture.uAvant.value.copy(b.col); uPeinture.uLivAvant.value = b.livree ? 1 : 0; uPeinture.uFront.value = 1e3; peinture.t0 = -1; }
  };
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
  /* liseré de rareté : un CADRE fin sur le pourtour extérieur de la dalle. (L'ancienne boîte pleine L × P posait une plaque
     non éclairée couleur rareté sur TOUT le plancher : l'intérieur du conteneur s'allumait en lilas pendant les inserts.) */
  const matLiseret = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(R.couleur) }));
  for (const [lx, lz, px, pz] of [[L * 1.004, 0.035, 0, P / 2 + 0.012], [L * 1.004, 0.035, 0, -P / 2 - 0.012], [0.035, P * 1.004, L / 2 + 0.012, 0], [0.035, P * 1.004, -L / 2 - 0.012, 0]]) {
    const b = new THREE.Mesh(garde(new THREE.BoxGeometry(lx, 0.06, lz)), matLiseret); b.position.set(px, dalle - 0.03, pz); fret.add(b);
  }
  // coffre du rideau (linteau) : le rideau s'y enroule entièrement avant que le bolide ne bouge
  boite(0.42, H - yLinteau + 0.34, P - 0.2, matCadre, xO + 0.17, (yLinteau + H + 0.34) / 2, 0);
  // bordereau d'expédition : plaque d'aluminium rivetée DANS le panneau de toit (entre les montants, jamais au-dessus du linteau ni dans
  // le vide) ; à l'ouverture, ses douze éclats sautent vers l'arrière avec leurs rivets, puis disparaissent
  const texBord = garde(texBordereau(car, R));
  const matBordFace = garde(new THREE.MeshStandardMaterial({ map: texBord, metalness: 0.7, roughness: 0.4, transparent: true }));
  const matBordChant = garde(new THREE.MeshStandardMaterial({ color: 0x9aa0a7, metalness: 0.85, roughness: 0.3, transparent: true }));
  const geoRivet = garde(new THREE.SphereGeometry(0.034, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  const matRivet = garde(new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.9, roughness: 0.35 }));
  const BL = BORDEREAU.l, BP = BORDEREAU.p, bx0 = xO - 0.62 - BL, ep2 = 0.012;      // 0,62 m de marge avant le coffre du rideau
  const eclats = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const fw = BL / 4, fh = BP / 3, g = garde(new THREE.BoxGeometry(fw * 0.998, ep2, fh * 0.998));
    const uv = g.attributes.uv; for (let k = 8; k < 12; k++) { uv.setX(k, (uv.getX(k) + i) / 4); uv.setY(k, (uv.getY(k) + (2 - j)) / 3); }   // face +y : sa portion de la plaque
    const mats = [matBordChant, matBordChant, matBordFace, matBordChant, matBordChant, matBordChant].map((m) => garde(m.clone()));
    const m = new THREE.Mesh(g, mats);
    const x0 = bx0 + (i + 0.5) * fw, z0 = (j - 1) * fh;
    m.position.set(x0, H + ep2 / 2 + 0.001, z0); m.castShadow = true; fret.add(m);
    for (const [rx, rz] of BORDEREAU.rivets) {                      // rivets 3D portés par l'éclat qui les contient
      const wx = bx0 + rx, wz = BP / 2 - rz;
      if (Math.abs(wx - x0) <= fw / 2 + 1e-6 && Math.abs(wz - z0) <= fh / 2 + 1e-6) { const r = new THREE.Mesh(geoRivet, matRivet); r.position.set(wx - x0, ep2 / 2, wz - z0); m.add(r); }
    }
    eclats.push({ m, x0, z0, v: new THREE.Vector3(-1.2 - Math.random() * 2.4, 2.4 + Math.random() * 2.2, (j - 1) * 1.6 + (Math.random() - 0.5)), w: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4) });
  }
  for (const c of hangar.coinsISO) fret.add(c);                      // pièces de coin ISO aux quatre coins du conteneur
  // rideau métallique « ? » en lames qui s'enroulent dans le coffre
  const texQ = garde(texTrappe());
  const nLames = Math.max(10, Math.round(hO / 0.24)), hL = hO / nLames;
  const matFace = garde(peindre(new THREE.MeshStandardMaterial({ map: texQ, roughness: 0.55, metalness: 0.35 }), 1.0));   // le rideau prend la peinture (le « ? » reste lisible)
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
    uniforms: { force: { value: 0 }, teinte: { value: new THREE.Color(R.couleur).lerp(new THREE.Color(0xffffff), 0.55) }, temps: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    // faisceau de l'ouverture : brume en volutes (bruit de valeur qui dérive), jamais un aplat additif uniforme
    fragmentShader: 'uniform float force; uniform vec3 teinte; uniform float temps; varying vec2 vUv; varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); } float vb(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); } void main(){ float n = 0.5 * vb(vP * 0.55 + vec3(temps * 0.4, 0.0, temps * 0.15)) + 0.25 * vb(vP * 1.2 - vec3(0.0, temps * 0.3, 0.0)) + 0.25; float a = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * n; gl_FragColor = vec4(teinte, a * force * 0.55); }',
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
      const dCam = p.s.position.distanceTo(camera.position), proche = dCam < 4.2 ? Math.max(0, (dCam - 1.2) / 3.0) : 1;          // les nuages collés à l'objectif s'effacent : jamais de voile blanc devant le sujet
      p.s.material.opacity = (p.op ?? 1) * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * proche;
      const sc = p.taille * (1 + (p.croit ?? 0) * k);
      if (p.pivote) p.s.scale.set(sc * Math.max(0.12, Math.abs(Math.cos(p.age * 7 + p.phase))), sc, 1); else p.s.scale.setScalar(sc);
      if (p.tourne) p.s.material.rotation += p.tourne * dt;
    }
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  /* jets de vapeur : fins panaches blancs crachés vers l'extérieur par les quatre montants d'angle (sifflement dans suspenseSonore) */
  const jetsVapeur = (n) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) emettre(Math.ceil(n / 4), () => ({
      mat: matPart('#e9eef5', texD, false), pos: V3(fret.position.x + sx * (L / 2 - 0.14), dalle + 0.6 + Math.random() * (H - dalle - 1.2), fret.position.z + sz * (P / 2 - 0.05)),
      vel: V3(sx * (0.4 + Math.random() * 0.8), 0.6 + Math.random() * 0.9, sz * (3.2 + Math.random() * 2.6)), taille: 0.22 + Math.random() * 0.25, croit: 3.2,
      vie: 0.7 + Math.random() * 0.5, op: 0.55, frein: 2.4, tourne: (Math.random() - 0.5) * 2 }));
  };
  const fumee = (n, x, y, z, force = 1) => emettre(n, () => ({ mat: matPart('#3b4152', texD, false), pos: V3(x + Math.random() * 0.4, y + Math.random() * 1.6, z + (Math.random() - 0.5) * 3), vel: V3((1.5 + Math.random() * 3) * force, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 1.5), taille: 1.6 + Math.random() * 1.6, croit: 2.2, vie: 2.4 + Math.random() * 1.6, op: 0.32, frein: 0.6, tourne: (Math.random() - 0.5) }));

  /* --- placement du bolide : le modèle 3D sculpté roule hors du conteneur (aucun panneau de repli) */
  const voiture = new THREE.Group(); scene.add(voiture);
  let cleV = null, lisV = null;
  let LONG, haut, roulage = null, xDepart, xArrivee, paramsRoulage = null;
  if (modele) {
    voiture.add(modele.groupe);
    LONG = modele.longueur; haut = modele.hauteur;
    xDepart = xO - 0.35 - modele.xAvant;                                  // l'avant juste derrière le rideau
    xArrivee = xO - modele.xArriere + 2.8;                                // l'arrière bien sorti, devant la caméra
    paramsRoulage = { xDepart, xArrivee, duree: D.pose - D.sortie, xEssieuAv: modele.essieuAvant, xEssieuAr: modele.essieuArriere,
      rAv: modele.rayonAvant, rAr: modele.rayonArriere, dalle, xBord: xO, volant: modele.fam === 'helico' };
    roulage = creerRoulage(paramsRoulage);
    cleV = new THREE.DirectionalLight(0xffffff, 1.25); cleV.position.set(6, 9, 10); cleV.target = voiture; scene.add(cleV);
    lisV = new THREE.PointLight(new THREE.Color(R.lueur), 1.4, 16); lisV.position.set(0, 3, -3); voiture.add(lisV);
  }
  const ombre = new THREE.Mesh(garde(new THREE.PlaneGeometry(LONG * 1.15, modele ? modele.largeur * 1.5 : 2.2)), garde(new THREE.MeshBasicMaterial({ map: texD, color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false })));
  ombre.rotation.x = -Math.PI / 2; scene.add(ombre);
  voiture.position.set(xDepart, modele ? 0 : dalle, modele ? 0 : 0.2);
  /* enracinement : tassement de 2 % du rayon sous la charge (la bande de roulement épouse le sol, 0 mm de flottement) + ombres de contact par roue */
  const TASS = 0.02;
  if (modele) { modele.chassis.position.y = dalle - modele.rayonArriere * TASS; for (const w of modele.roues) w.pivot.position.y = dalle + w.r * (1 - TASS); }
  const blobs = modele && modele.fam !== 'helico' ? modele.roues.map((w) => {
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(w.r * 2.7, Math.max(0.16, w.r * 0.85))),
      garde(new THREE.MeshBasicMaterial({ map: texD, color: 0x000000, transparent: true, opacity: 0.66, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return { m, w };
  }) : [];
  const majContact = () => {                                      // ombre d'occlusion sous chaque pneu, indépendante de l'éclairage général
    for (const { m, w } of blobs) {
      m.position.set(voiture.position.x + w.x, voiture.position.y + w.pivot.position.y - w.r * (1 - TASS) + 0.012, voiture.position.z + (w.z || 0));
      m.visible = ombre.visible && ombre.material.opacity > 0.01;
    }
  };

  const miroirCar = decor && decor.miroir && modele ? creerMiroirModele(THREE, voiture) : null;       // reflet du bolide sur le sol laqué
  if (miroirCar) scene.add(miroirCar.racine);

  /* --- OUVERTURE SOLENNELLE : phares qui claquent dans la pénombre, contre-jour aveuglant, inserts macro dans le conteneur */
  const COL_BLANC = new THREE.Color(0xffffff);
  /* Fond du conteneur : PÉNOMBRE DENSE. L'ancien aplat additif (« fondGlow ») qui brûlait l'image en rectangle blanc est supprimé.
     Le jour ne passe plus que par six fentes minces du mur de fond (rais fins, opacité plafonnée), et deux projecteurs de
     contre-jour cachés dans les angles du fond découpent le profil et le galbe des ailes (rim light) sans jamais éclairer la caméra. */
  const teinteFond = new THREE.Color(R.couleur).lerp(COL_BLANC, 0.55);
  const matFondFente = garde(new THREE.MeshBasicMaterial({ color: teinteFond, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  for (let i = 0; i < 6; i++) {
    const hf = hO * (0.42 + 0.07 * ((i * 7) % 5)), zf = (i - 2.5) * P * 0.135 + (i % 2 ? 0.05 : -0.05);
    const fente = new THREE.Mesh(garde(new THREE.PlaneGeometry(0.028, hf)), matFondFente);
    fente.rotation.y = Math.PI / 2; fente.position.set(-L / 2 + ep * 1.3 + 0.012, dalle + 0.25 + hf / 2 + (i % 3) * 0.12, zf); fret.add(fente);
  }
  const rimFond = [-1, 1].map((sg) => {
    const sp = new THREE.SpotLight(new THREE.Color(0xcfdcff), 0, 13, 0.2, 0.75, 1.5);         // faisceau étroit, blanc froid : il cisèle la carrosserie sans teinter les parois
    sp.position.set(-L / 2 + 0.75, dalle + hO * 0.82, sg * (P / 2 - 0.45)); fret.add(sp); scene.add(sp.target); return sp;
  });
  const fondGlow = { fentes: matFondFente, rims: rimFond };                  // repère de contrôle (window.__fretDbg)
  const lampes = [], lampeP = V3(0, 0, 0), lampeL = [V3(0, 0, 0), V3(0, 0, 0)];
  let colAv = null, spotsPh = [], conesPh = [], flaresPh = [], striesPh = [], roueCible = null, yLampe = dalle + 0.5, rasant = null, keyMacro = null;
  if (modele) {
    modele.groupe.traverse((o) => { if (o.isMesh && o.material === modele.feux.avant) lampes.push(o); });
    voiture.updateMatrixWorld(true);
    colAv = modele.feux.avant.color.clone(); modele.feux.avant.color.copy(colAv).multiplyScalar(0.05);       // phares éteints dans le noir
    const tri0 = lampes.map((m) => { m.getWorldPosition(lampeP); return { z: lampeP.z, p: lampeP.clone() }; }), xMax = tri0.length ? Math.max(...tri0.map((q) => q.p.x)) : 0;
    const tri = tri0.filter((q) => q.p.x > xMax - 0.4).sort((x, y) => x.z - y.z);       // les optiques les plus à l'avant
    const base0 = voiture.position.clone();
    const lampOff = lampes.length ? [tri[0].p.clone().sub(base0), (tri.length > 1 ? tri[tri.length - 1] : tri[0]).p.clone().sub(base0)]
      : [V3(modele.xAvant, dalle + modele.hauteur * 0.28, -modele.largeur * 0.28), V3(modele.xAvant, dalle + modele.hauteur * 0.28, modele.largeur * 0.28)];
    const lampPos = (i, out) => out.copy(lampOff[i]).add(voiture.position);
    modele.lampePos = lampPos; lampPos(0, lampeL[0]); lampPos(1, lampeL[1]); yLampe = (lampeL[0].y + lampeL[1].y) / 2;
    const teintePh = colAv.clone().multiplyScalar(1 / 2.2).lerp(COL_BLANC, 0.35);
    for (let i = 0; i < 2; i++) {
      const s = new THREE.SpotLight(teintePh, 0, 24, 0.4, 0.8, 1.1); scene.add(s, s.target); spotsPh.push(s);
      const cone = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.04, 1.1, 7.5, 28, 1, true)), garde(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { force: { value: 0 }, teinte: { value: teintePh.clone() }, temps: { value: 0 } },
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vD; varying vec3 vP; void main(){ vUv = uv; vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vD = length(mv.xyz); gl_Position = projectionMatrix * mv; }',
        // cône volumétrique doux : bords en fresnel, atténuation près de l'objectif, et brume TEXTURÉE (bruit de valeur fBm qui dérive) — jamais un voile uniforme
        fragmentShader: 'uniform float force; uniform vec3 teinte; uniform float temps; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vD; varying vec3 vP;'
          + 'float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }'
          + 'float vb(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }'
          + 'float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vb(p); p *= 2.03; a *= 0.5; } return s; }'
          + 'void main(){ float f = abs(dot(normalize(vN), normalize(vV))); vec3 q = vP * 1.6 + vec3(temps * 0.35, -temps * 0.12, temps * 0.2); float brume = 0.45 + 0.85 * fbm(q);'
          + ' float a = pow(vUv.y, 1.8) * pow(f, 2.2) * smoothstep(1.5, 5.0, vD) * brume; gl_FragColor = vec4(teinte, a * force * 0.36); }',
      })));
      cone.rotation.z = Math.PI / 2; cone.rotation.y = 0; scene.add(cone); conesPh.push(cone);
      const mkSp = (large) => { const sp = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texD, color: teintePh.clone().lerp(COL_BLANC, 0.6).multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }))); sp.renderOrder = 20; scene.add(sp); return sp; };
      flaresPh.push(mkSp()); striesPh.push(mkSp());
    }
    // roue montrée en macro : roue avant côté caméra ; pour le fauteuil, la roulette (la plus petite roue)
    const avants = modele.roues.filter((w) => w.avant);
    roueCible = modele.fam === 'fauteuil' ? modele.roues.slice().sort((a, b) => a.r - b.r)[0] : (avants.length ? avants.slice().sort((a, b) => b.z - a.z)[0] : (modele.roues[0] || null));
    // lumière rasante : projecteur bas, de côté, qui lèche le capot et l'aile
    keyMacro = new THREE.SpotLight(0xffe9d2, 0, 9, 0.26, 0.85, 1.6); scene.add(keyMacro, keyMacro.target);
    rasant = new THREE.SpotLight(0xdbe6ff, 0, 12, 0.5, 0.9, 1.2); rasant.position.set(voiture.position.x + modele.xAvant - 0.9, dalle + 0.28, -1.55);
    rasant.target.position.set(voiture.position.x + modele.xAvant - 0.5, dalle + modele.hauteur * 0.45, 0.1); scene.add(rasant, rasant.target);
  }

  // instant précis où le bolide franchit le seuil : essai à blanc du roulage (déterministe)
  let tSeuil = D.sortie + 0.3;
  if (paramsRoulage) {
    const essai = creerRoulage(paramsRoulage);
    for (let x = 0; x <= paramsRoulage.duree; x += 1 / 120) { if (essai.pas(x, 1 / 120).evenements.includes('seuil-av')) { tSeuil = D.sortie + x; break; } }
  }
  D.bascule = tSeuil;
  if (pasFixe) window.__fretD = { ...D };
  if (pasFixe) window.__fretDbg = { fondGlow, interieur, faisceau, lueurOuverture, scene, spotsPh, conesPh, flaresPh, striesPh, rasant, post, cle, contre, camera };                    // repères pour les captures de contrôle

  // univers manga : matériaux toon préparés (et compilés) d'avance, posés au moment de la déchirure
  const cel = trailer && cleA === 'manga' && modele ? celShading(THREE, modele.groupe) : null;
  camera.position.set(-5, 8, 22); camera.lookAt(3.2, 2.2, 0);
  // ombres portées de la suspension sodium : conteneur et bolide (matériaux opaques seulement : ni rais, ni fentes, ni vitrages)
  const opaque = (o) => o.isMesh && !(Array.isArray(o.material) ? o.material.some((m) => m.transparent) : o.material.transparent);
  fret.traverse((o) => { if (opaque(o)) { o.castShadow = true; o.receiveShadow = true; } });
  if (modele) modele.groupe.traverse((o) => { if (opaque(o)) { o.castShadow = true; o.receiveShadow = true; } });
  try {                                    // compile les shaders AVANT le top départ : pas d'à-coup au premier reveal
    if (decor) {                                                      // le décor est compilé et ses textures envoyées au GPU maintenant, pas au moment de la déchirure
      decor.activer(); sol.material = decor.solMat; if (miroirCar) miroirCar.racine.visible = true;
      for (const tx of decor.textures) { try { renderer.initTexture(tx); } catch (e) { /* ancienne version : tant pis */ } }
    }
    if (cel) { cel.appliquer(); renderer.compile(scene, camera); cel.annuler(); }
    renderer.compile(scene, camera);
    if (decor) { decor.desactiver(); sol.material = solDefaut; if (miroirCar) miroirCar.racine.visible = false; }
  } catch (e) { if (decor) { decor.desactiver(); sol.material = solDefaut; } }

  /* --- état de la séquence */
  const etat = { coeur: -1, noirS: 0, sortie: false, pose: false, titre: false, stats: false, palier: -1, seuil: false, jolt: -1, planId: null, pschitt: false, ph1: false, ph2: false, rugit: false };
  let debut = performance.now();                       // recalé au vrai top départ (après la préchauffe GPU et la préparation du son)
  let fini = false, raf = 0, dernier = debut, tickN = 0, tCourant = 0, demande = false;
  const camDepart = V3(-5, 8, 22), camFret = V3(16.5, 5.6 + (H - 4.16) * 0.6, 9.5 + (H - 4.16));
  const camFinal = modele ? V3(xArrivee + 4.0, 4.3, 19.5) : V3(xArrivee - 1.2, 3.4, 15.5);
  const cibleFinal = modele ? V3(xArrivee - 3.4, 1.3, 0) : V3(xArrivee - 3.4, 2.0, 0);
  const cibleFret = V3(3.2, 2.2 + (H - 4.16) * 0.4, 0);
  const lisse = (a) => a * a * (3 - 2 * a), borne = (v) => Math.max(0, Math.min(1, v));
  const flash = el.querySelector('.fret-flash');
  const eclairs = [];

  // ---------- à-coups lourds de la pré-ouverture : un ressort amorti basse fréquence (le conteneur est lourd : il encaisse, il ne vibre pas)
  const JOLTS = D.jolts.map((tj, i, a) => ({ t: tj, a: 0.45 + 0.55 * i / Math.max(1, a.length - 1), s: i % 2 ? 1 : -1 }));
  const AJ = [0.09, 0.13, 0.17, 0.22, 0.28][rang];
  const ressort = (t) => {
    const o = { x: 0, y: 0, z: 0, rz: 0, rx: 0, env: 0 };
    for (const j of JOLTS) {
      const d = t - j.t; if (d < 0 || d > 1.8) continue;
      const on = 1 - Math.exp(-d * 45), e = Math.exp(-d * 3.3) * on, A = AJ * j.a;
      o.x += j.s * A * e * Math.sin(d * 10.5);                                     // balancement lent en travers
      o.y += A * 0.7 * Math.abs(Math.sin(d * 7.2)) * Math.exp(-d * 4.2) * on;     // soulèvement qui retombe lourdement sur les cales
      o.z += A * 0.45 * e * Math.sin(d * 8.3 + 1);
      o.rz += j.s * A * 0.07 * e * Math.sin(d * 9.1); o.rx += A * 0.05 * e * Math.sin(d * 8.0 + 0.5);
      o.env = Math.max(o.env, Math.exp(-d * 5.5));
    }
    return o;
  };
  // ---------- plans d'ouverture : trois inserts macro dans la pénombre, puis le plan large
  const planDe = (t) => D.plans.find((p) => t >= p.t0 && t < p.t1) || null;
  const _a = V3(0, 0, 0);
  const cameraPlan = (p, t, cam, cib) => {
    const k = borne((t - p.t0) / (p.t1 - p.t0)), ke = lisse(k), fx = voiture.position.x + modele.xAvant;
    const main = (a, f) => Math.sin(t * f) * a + Math.sin(t * f * 2.31 + 1.3) * a * 0.5;       // caméra à l'épaule, très douce
    if (p.id === 'phares') {                                        // 1. face aux phares : push-in lent entre les deux optiques
      cam.set(xO + 2.7 - 1.0 * ke, dalle + 0.5 + 0.06 * ke + main(0.008, 1.3), 0.35 - 0.25 * ke + main(0.01, 0.9));
      cib.set(fx - 0.5, yLampe + 0.02, 0);
      return { fov: 27 - 5 * ke, roll: 0.025 };
    }
    if (p.id === 'jante') {                                         // 2. extrême gros plan sur la jante / la roulette
      if (roueCible) roueCible.pivot.getWorldPosition(_a); else _a.set(fx - 1, dalle + 0.5, 0.8);
      cam.set(xO + 1.5 - 0.5 * ke + main(0.006, 1.7), Math.max(dalle + 0.24, _a.y + 0.05) + main(0.006, 1.1), Math.min(_a.z + 0.9, 1.9));
      cib.copy(_a); return { fov: 16 - 2.5 * ke, roll: -0.04 };
    }
    // 3. plan au ras du sol : la silhouette du nez, du capot et de l'aile se découpe sur le contre-jour
    cam.set(xO + 1.35 + 0.1 * ke, dalle + 0.13 + 0.05 * ke + main(0.004, 1.2), 0.9 - 0.9 * ke);
    cib.set(fx - 1.6, dalle + modele.hauteur * 0.45, -0.1);
    return { fov: 32 - 4 * ke, roll: 0.035 };
  };

  // ---------- son : suspense (immédiat), jingle d'entrée au seuil, puis musique (fichier en boucle ou thème procédural tenu)
  let musique = null, musiqueSource = null, musiqueGain = null, stopTheme = null, stopSuspense = null, stopAmbiance = null, busFond = null;
  if (son) { try { musique = trailer ? await chargerMusique(car.code, cleA, base, MUSIQUE_TRAILERS) : await chargerMusique(car.code, th.musique, base); } catch (e) { musique = null; } }
  window.__fretMusique = musique ? { url: musique.url, drop: musique.drop, vitesse: musique.vitesse, titre: musique.titre } : null;   // publié pour la capture (version longue sur la TV)
  const typeSon = typeMoteur(car);                                   // fiche moteur réelle du bolide (fiches_moteurs.js) : « v6 atmo · Ferrari Dino 2,4 L… »
  let cri = null, annulerParole = null;                              // acte 3 : cri du nom (fichier de la voix de commentateur, sinon synthèse vocale)
  if (son) { try { cri = await chargerCri(car.code, base, snd.sortieAudio()); } catch (e) { cri = null; } }
  window.__fretSon = { moteur: typeSon, cri: !!cri, musique: musique ? musique.url : null };      // publié pour la régie et la capture vidéo (« moteur-son »)
  let prepSon = null, salle = null, stopMoteur = null;
  /** Rendu physique (moteur du bolide, ferraille du conteneur, réponse du hangar) : lourd, donc fait AVANT le top départ. */
  const preparerSon = () => {
    const S = snd.sortieAudio(); if (!S || !son || prepSon) return;
    try { prepSon = preparerSonsReveal(S, car, D, tSeuil, { rang }); window.__fretSon = { ...window.__fretSon, moteur: prepSon.signature + ' · ' + prepSon.fiche.nom, preparation_ms: prepSon.ms, evenements: prepSon.evenements }; }
    catch (e) { prepSon = null; window.__fretSon = { ...window.__fretSon, erreur: String(e && e.message || e) }; console.error('[reveal son] préparation impossible :', e); }
  };
  /** Bruitage physique immédiat (roue sur le seuil d'acier, atterrissage d'un pneu) : banque de la préparation, part dans le hangar. */
  const ferraille = (nom, i = 0, gain = 0.6, vitesse = 1) => {
    const S = snd.sortieAudio(); if (!S || !prepSon || !busFond) return;
    const b = Array.isArray(prepSon.foley[nom]) ? prepSon.foley[nom][i % prepSon.foley[nom].length] : prepSon.foley[nom]; if (!b) return;
    const { ac } = S, src = ac.createBufferSource(), g = ac.createGain(); src.buffer = b; src.playbackRate.value = vitesse; g.gain.value = gain;
    src.connect(g); g.connect(busFond.fond); if (salle) { const e = ac.createGain(); e.gain.value = 0.4; g.connect(e); e.connect(salle.entree); }
    src.start();
  };
  const lancerSon = () => {
    const S = snd.sortieAudio(); if (!S || !son) return;
    busFond = creerBusFond(S);                                          // bus de fond : tout ce qui s'efface devant la voix (ducking −7 dB)
    salle = prepSon ? creerSalle(S, prepSon, busFond.fond) : null;      // acoustique du hangar (convolution), partagée par le moteur et la ferraille
    if (prepSon) stopMoteur = jouerMoteur(S, prepSon, S.ac.currentTime + 0.02 + prepSon.debut, busFond.fond, salle);   // une seule prise moteur, calée sur la chronologie
    stopAmbiance = ambianceSonore(S, { cle: decor ? decor.cle : cleA, code: car.code, arrivee: D.arrivee, ouvre: D.ouvre, bascule: D.bascule, vers: busFond.fond });
    if (busFond.silence) busFond.silence(D.silence, D.ouvre - D.silence);     // silence de mort : moteur étouffé, ambiance et basse coupés net
    stopSuspense = suspenseSonore(S, { vers: busFond.fond, arrivee: D.arrivee, paliers: D.paliers, ouvre: D.ouvre, battements: D.battements, silence: D.silence, trappeDebut: D.trappeDebut, trappe: D.trappe, rang, jolts: D.jolts, plans: D.plans, foley: prepSon ? prepSon.foley : null, salle });
    const dj = jingleEntree(SIG.jingle, S, tSeuil, busFond.fond);
    let dCri = 0;
    if (cri) dCri = jouerCri(S, cri, tSeuil, busFond); else annulerParole = parlerNom(car, tSeuil);   // pile au franchissement du seuil
    const debutMusique = tSeuil + Math.max(dj * 0.8, dCri * 0.92);        // la musique attend la fin du cri
    if (musique) {                       // le drop du morceau tombe juste après le jingle, puis le morceau tourne en boucle
      const { ac, master } = S, src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = musique.buf; src.loop = true; src.loopStart = Math.max(0, Math.min(musique.drop, musique.buf.duration - 2) - (musique.calee ? 0 : 4)); src.loopEnd = musique.buf.duration;
      src.playbackRate.value = musique.vitesse;                       // la boucle repart de l'instant choisi par Esteban quand il est fixé
      src.connect(g); g.connect(busFond.fond);
      const t = ac.currentTime + 0.02 + debutMusique;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.92, t + 0.06);
      src.start(t, Math.min(musique.drop, Math.max(0, musique.buf.duration - 1)));
      musiqueSource = src; musiqueGain = g;
      // la capture lit ces repères pour que la TV enchaîne, à la fin du clip, sur le morceau complet au bon endroit
      window.__fretMusique = { url: musique.url, titre: musique.titre, drop: Math.min(musique.drop, Math.max(0, musique.buf.duration - 1)), vitesse: musique.vitesse,
        boucle: src.loopStart, duree: musique.buf.duration, debutClip: t - ac.currentTime };
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
    u.fuite.value.copy(couleurFuite); u.fuiteForce.value = t < D.trappe ? ((0.05 + 0.09 * prog) * (0.6 + 0.4 * Math.random()) + fuiteImpulsion * 0.35) * (1 - borne((t - D.trappeDebut) / 0.35)) : 0;   // la lueur d'écran du suspense s'éteint dès que le rideau bouge : les inserts restent dans la pénombre, sans voile coloré
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
  const SPS = [SIG.particules, ...(SIG.extra || [])].map((nom) => PARTICULES_SIGNATURE[nom] || PARTICULES_SIGNATURE.etoiles);
  function particulesSignature(dt, taux, derriere = 0) { for (const SP of SPS) emettreSignature(SP, dt, taux * (SPS.length > 1 ? 0.7 : 1), derriere); }
  const alea = (a, b) => a + Math.random() * (b - a);
  function emettreSignature(SP, dt, taux, derriere = 0) {
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
  const interrompre = () => { demande = true; };                 // « gp:arreter » : la salle de projection coupe la séquence à tout instant (bolide suivant, fermeture)
  addEventListener('keydown', surTouche, true); el.addEventListener('pointerdown', surClic); addEventListener('gp:suivant', accepter); addEventListener('gp:arreter', interrompre);

  return new Promise((resolve) => {
    const tick = (now) => {
      if (fini) return;
      // pasFixe (s par image) : temps image par image, pour les captures de contrôle sur une machine lente
      if (pasFixe && window.__fretArret != null && tickN * pasFixe > window.__fretArret) { raf = requestAnimationFrame(tick); return; }   // contrôle image par image
      const t = pasFixe ? (tickN++) * pasFixe : (now - debut) / 1000, dt = pasFixe || Math.min(0.05, (now - dernier) / 1000); dernier = now;
      tCourant = t;
      majPeinture(t);                                                    // vague de peinture du conteneur (paliers de rareté)
      if (pasFixe) window.__fretTc = t;                                  // contrôle image par image : instant atteint
      if (t >= D.tenue && !etat.attente) { etat.attente = true; el.classList.add('attente'); }
      if (demande || (tenueAuto != null && t >= D.tenue + tenueAuto)) { terminer(); return; }

      if (trailer && fige) {             // ARRÊT SUR IMAGE : temps quasi suspendu, caméra en micro-orbite, carton fixe
        tLent += dt * 0.04;
        const kf = t - D.freeze; camera.fov = 30 + 7 * Math.exp(-kf * 8) * Math.cos(kf * 13); camera.updateProjectionMatrix();
        placerOrbite(kf);
        majParts(dt * 0.04); particulesSignature(dt * 0.04, 0.2, (modele ? modele.largeur : 2) + 1.5);
        if (decor && etat.univers) { decor.maj(D.freeze + tLent, dt * 0.04, camera, cv.height); if (miroirCar) miroirCar.sync(); }
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
        cam.x = cx + rx * dolly; cam.z = cz + rz * dolly; cam.y -= (0.8 + (rang >= 3 ? 0.5 : 0)) * lisse(k) * fin;
      }

      // ---------- cadrage de tension : dans les 1,6 s avant la rupture, contre-plongée serrée sur le rideau et le scellé qui craque
      {
        const kS = lisse(borne((t - (D.ouvre - 1.6)) / 1.1)) * (1 - lisse(borne((t - D.ouvre - 0.08) / 0.55)));
        if (kS > 0) { cam.lerp(V3(xO + 4.6, dalle + 0.55, 3.4), kS * 0.82); cib.lerp(V3(xO - 0.35, H * 0.86, 0.2), kS * 0.82); }
      }
      // ---------- plans d'ouverture : inserts macro (phares, jante, rasant) par-dessus le travelling, plan large ensuite
      let fovBase = 38, rollPlan = 0;
      if (modele && t >= D.trappeDebut && t < D.sortie) {
        const pl = planDe(t), id = pl ? pl.id : null;
        if (pl && id !== 'large') { const r = cameraPlan(pl, t, cam, cib); fovBase = r.fov; rollPlan = r.roll; }
        if (id !== etat.planId) { etat.planId = id; flashV = Math.max(flashV, id === 'large' ? 0.1 : 0.06); coupZoom = Math.max(coupZoom, id === 'large' ? 6 : 3); }
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
        tremble = AMPL * (0.3 + 0.7 * prog * prog) * 0.4 * (t >= D.ouvre ? Math.max(0.05, 1 - (t - D.ouvre) / 0.5) : 1);     // frémissement fin : l'essentiel, ce sont les à-coups lourds
        while (etat.jolt + 1 < D.jolts.length && t >= D.jolts[etat.jolt + 1]) {                 // à-coup lourd : poussière, étincelles, lumière qui jaillit des fentes
          etat.jolt++; const jf = (etat.jolt + 1) / D.jolts.length;
          choc = Math.max(choc, CHOC * 0.5); fuiteImpulsion = 1; flashV = Math.max(flashV, 0.05 + 0.04 * jf); secousse = Math.max(secousse, 0.045 + 0.018 * rang + 0.03 * jf); coupZoom = Math.max(coupZoom, 1.2 + 0.35 * rang);
          poussiereJolt(8 + rang * 3); if (rang >= 2) etincellesCales(5 + rang * 3);
        }
        while (etat.palier + 1 < D.paliers.length && t >= D.paliers[etat.palier + 1]) {        // nouveau palier
          etat.palier++;
          choc = CHOC; fuiteImpulsion = 1; flashV = Math.max(flashV, 0.08 + 0.05 * etat.palier); coupZoom = Math.max(coupZoom, 2.5 + rang * 0.9);
          const dernier = etat.palier === D.paliers.length - 1, signature = dernier && P_SIGNATURE > 0;   // rareté signature : le dernier cran révèle sa peinture unique
          couleurFuite.set(signature ? R.couleur : ECHELLE_RARETE[Math.min(etat.palier, rang)]);
          nouvellePeinture(signature ? P_SIGNATURE : 1 + Math.min(etat.palier, rang), t);   // la caisse entière change de peinture
          if (rang >= 3) { secousse = Math.max(secousse, 0.12 + 0.08 * (rang - 2)); etincellesCales(10 + rang * 6); }
          else if (rang === 2) secousse = Math.max(secousse, 0.06);
          jetsVapeur(10 + 4 * rang);                                                   // vapeur sous pression : les montants crachent
        }
        if (rang === 4 && prog > 0.6 && Math.random() < 0.25) etincellesCales(2);
        while (etat.coeur + 1 < D.battements.length && t >= D.battements[etat.coeur + 1]) etat.coeur++;
        const dC = etat.coeur >= 0 ? t - D.battements[etat.coeur] : 99;
        const pouls = Math.exp(-dC * 7) + (dC > 0.16 ? 0.55 * Math.exp(-(dC - 0.16) * 9) : 0);   // lub-dub, synchrone du cœur sonore
        const muet = t >= D.silence && t < D.ouvre;                    // silence de mort : tout se fige
        // lumière : intensité de base qui monte, crépitement après chaque palier
        const crepite = choc > 0.02 ? (Math.random() < 0.5 ? 0.25 : 1) : 0.85 + 0.15 * Math.sin(t * 23);
        const force = (0.25 + 0.75 * prog) * crepite * (0.55 + 0.45 * Math.min(1, pouls)), jE = ressort(t).env;      // les rais battent avec le cœur ; à chaque à-coup, le jour s'engouffre
        const fige = muet ? 0.12 : 1;
        matFente.opacity = Math.min(1, force * 0.5 + jE) * fige; matRai.opacity = Math.min(1, 0.22 * force + 0.7 * jE) * fige; matFlaque.opacity = Math.min(0.9, 0.2 * force + 0.55 * jE) * fige;
        interieur.color.copy(couleurFuite); interieur.intensity = (0.4 + 1.2 * prog + 2.2 * jE + 0.8 * pouls) * fige;
        // CHUTE DE TENSION (Épique et au-delà) : les lampes du hangar faiblissent avec la montée et vacillent à chaque coup de bélier
        if (rang >= 2) {
          const base = (0.18 + 0.12 * (rang - 2)) + (0.3 + 0.08 * (rang - 2)) * prog;
          etat.noirS = Math.min(0.93, muet ? 0.9 : base + (jE > 0.35 && Math.random() < 0.55 ? 0.3 * jE : 0) + (Math.random() < 0.012 * rang ? 0.35 : 0));
        }
        fentes.forEach((f) => { f.phase += dt * 9; });
      } else if (t >= D.trappe) { const k = borne((t - D.trappe) / 0.6); matFente.opacity *= 1 - k; matRai.opacity *= 1 - k; matFlaque.opacity *= 1 - k; }
      if (t >= D.ouvre) etat.noirS = Math.max(0, (etat.noirS || 0) - dt * 1.6);     // la lumière revient avec la déflagration
      if (t >= D.silence && t < D.ouvre) tremble *= 0.1;                               // l'action se fige pendant le silence
      uPeinture.uLueur.value = 0.2 * (etat.noirS || 0) * (t >= D.silence && t < D.ouvre ? 0.5 : 1);                               // la caisse incandescente brille seule dans le noir
      choc = Math.max(0, choc - dt * 0.9);
      const amp = tremble + choc * 0.4, rs = t >= D.arrivee && t < D.ouvre + 0.2 ? ressort(t) : null;
      if (t >= D.arrivee) {
        fret.position.x = (Math.random() - 0.5) * amp; fret.position.z = (Math.random() - 0.5) * amp * 0.6; fret.position.y += Math.abs(Math.random() - 0.5) * choc * 0.2; fret.rotation.x = (Math.random() - 0.5) * amp * 0.08; fret.rotation.z = 0;
        if (rs) { fret.position.x += rs.x; fret.position.y += rs.y; fret.position.z += rs.z; fret.rotation.z = rs.rz; fret.rotation.x += rs.rx; }
      }
      if (rang >= 2) { cam.x += (Math.random() - 0.5) * (amp + choc * 0.4) * (rang - 1) * 0.5; cam.y += (Math.random() - 0.5) * (amp + choc * 0.4) * (rang - 1) * 0.3; }
      if (rs) { cam.x += rs.x * 1.1; cam.y += rs.y * 1.6 + rs.rx * 2; }
      if (secousse > 0) { cam.x += (Math.random() - 0.5) * secousse; cam.y += (Math.random() - 0.5) * secousse * 0.7; secousse = Math.max(0, secousse - dt * 1.8); }
      if (palier === 'relique_interdite' && t > D.sortie && t < D.sortie + 0.6) { cam.x += (Math.random() - 0.5) * 0.4; cam.y += (Math.random() - 0.5) * 0.3; }
      if (t >= D.ouvre + 0.2 && fret.position.x !== 0) { fret.position.set(0, 0, 0); fret.rotation.set(0, 0, 0); }

      // ---------- 2. le scellé vole en éclats (d'abord), puis le rideau s'enroule entièrement dans le coffre
      const te = t - D.ouvre;
      for (const e of eclats) {
        if (te < 0) continue;
        e.m.position.set(e.x0 + e.v.x * te, H + 0.007 + e.v.y * te - 4.9 * te * te, e.z0 + e.v.z * te);
        e.m.rotation.set(e.w.x * te, e.w.y * te, e.w.z * te);
        for (const mt of e.m.material) mt.opacity = 1 - borne(te / 0.55);
        e.m.visible = te < 0.55;
      }
      if (te >= 0 && !etat.dechire) { etat.dechire = true; flashV = Math.max(flashV, 0.25); }
      const prRideau = progressionRideau((t - D.trappeDebut) / (D.trappe - D.trappeDebut));
      const tr = prRideau * (hO + hL), enMouv = prRideau > 0 && prRideau < 1 && Math.abs(prRideau - progressionRideau((t - dt - D.trappeDebut) / (D.trappe - D.trappeDebut))) > 0.0004;
      for (const l of lames) { const y = l.y0 + tr; l.m.position.y = y; l.m.position.x = xO + 0.08 + (enMouv ? (Math.random() - 0.5) * 0.012 : 0); l.m.visible = y - hL / 2 < yLinteau - 0.01; }
      const lum = lisse(borne(prRideau * 1.5));
      cle.intensity = BASE.cle * (1 - 0.65 * borne((t - D.pose) / 1.5)) * (1 - 0.5 * (etat.noirS || 0));
      {                                                       // pénombre des inserts : l'intérieur du conteneur n'a pas d'ombres portées, on éteint donc l'éclairage de studio pendant les plans macro
        const plN = planDe(t), cible = modele && plN && plN.id !== 'large' ? 1 : 0;
        etat.noir = (etat.noir || 0) + (cible - (etat.noir || 0)) * Math.min(1, dt * 7); const n = etat.noir;
        cle.intensity *= 1 - 0.88 * n; contre.intensity = BASE.contre * (1 - 0.85 * n); hemi.intensity = BASE.hemi * (1 - 0.88 * n);
        if (cleV) cleV.intensity = 1.25 * (1 - 0.82 * n); if (lisV) lisV.intensity = 1.4 * (1 - 0.8 * n);
        if (!etat.envMats) {                                        // l'éclairage d'environnement noie aussi l'intérieur : on l'abaisse avec la pénombre (valeurs de base mémorisées)
          etat.envMats = [];
          scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.envMap && 'envMapIntensity' in m) etat.envMats.push([m, m.envMapIntensity === undefined ? 1 : m.envMapIntensity]); });
        }
        const fe = 1 - 0.8 * n; for (const [m, b] of etat.envMats) m.envMapIntensity = b * fe;
      }
      if (t >= D.trappeDebut) { interieur.color.copy(couleurFuite); interieur.intensity = (0.22 + 0.55 * Math.pow(prRideau, 1.4)) * (1 - 0.35 * borne((t - D.pose) / 1.5)) * (1 - 0.94 * (etat.noir || 0)); }   // veilleuse : l'intérieur reste dans la pénombre
      faisceauMat.uniforms.teinte.value.copy(couleurFuite).lerp(new THREE.Color(0xffffff), 0.45);
      const plIns = planDe(t), vue = plIns && plIns.id !== 'large' ? 0.1 : 0.3;     // dans les inserts, la caméra est DANS le faisceau : on le couche pour ne pas la noyer
      faisceauMat.uniforms.force.value = lum * vue * 0.45 * (1 - 0.6 * borne((t - D.titre) / 2)); faisceauMat.uniforms.temps.value = t; lueurOuverture.material.opacity = lum * vue * 0.2 * (1 - 0.7 * borne((t - D.pose) / 1.5));
      if (t >= D.trappe && !etat.trappeOk) { etat.trappeOk = true; fumee(express ? 18 : 34, xO - 0.6, dalle + 0.3, 0, 1); }
      if (etat.trappeOk && t < D.titre && Math.random() < 0.35) fumee(1, xO - 0.4, dalle + 0.2, 0, 0.8);

      // ---------- 2 bis. OUVERTURE SOLENNELLE : pschitt, fumée dense, contre-jour, phares qui claquent, coup d'accélérateur, dernier rugissement
      let vBlip = 0, shY = 0, shR = 0;
      if (t >= D.trappeDebut) {
        const dOuv = D.trappe - D.trappeDebut;
        if (!etat.pschitt) { etat.pschitt = true; pschitt(); }
        if (t < D.sortie + 0.4) { etat.acc = (etat.acc || 0) + dt * (express ? 38 : 52) * (0.35 + 0.65 * prRideau) * (1 - 0.5 * (etat.noir || 0)); const nS = Math.floor(etat.acc); etat.acc -= nS; if (nS > 0) fumeeDense(nS); }
        { // pénombre : rais fins du mur de fond (≤ 0,32) + contre-jour qui cisèle la silhouette ; rien d'uniforme, rien qui crame
          const kF = Math.pow(prRideau, 1.2) * (1 - 0.75 * borne((t - D.sortie) / 0.9));
          matFondFente.opacity = Math.min(0.32, (0.06 + 0.26 * kF) * (0.85 + 0.15 * Math.sin(t * 37)) * (1 - 0.35 * (etat.noir || 0)));
          const cx = voiture.position.x + (modele.xAvant + modele.xArriere) / 2;
          for (const sp of rimFond) { sp.intensity = 4.5 * kF * (0.6 + 0.4 * (etat.noir || 0)); sp.target.position.set(cx, dalle + modele.hauteur * 0.55, 0); }
        }
        if (modele) {
          const ph = D.plans[0], ja = D.plans[1], la = D.plans[3], tl = ph.t0 + (ph.t1 - ph.t0) * 0.5;
          let aPh = 0.04;
          if (t >= tl) { const d = t - tl; aPh = d < 0.07 ? 1 : d < 0.14 ? 0.1 : 1; if (!etat.ph1) { etat.ph1 = true; flashV = Math.max(flashV, 0.22); coupZoom = Math.max(coupZoom, 4); etincellesArc(); } if (d >= 0.14 && !etat.ph2) { etat.ph2 = true; flashV = Math.max(flashV, 0.4); coupZoom = Math.max(coupZoom, 6); secousse = Math.max(secousse, 0.08); } }
          const fadePh = 1 - borne((t - tSeuil - 0.5) / 0.7), etatPh = aPh * (0.5 + 0.5 * fadePh);
          modele.feux.avant.color.copy(colAv).multiplyScalar(0.05 + 0.95 * aPh);
          for (let i = 0; i < 2; i++) {
            const lp = modele.lampePos(i, lampeL[i]);
            spotsPh[i].position.copy(lp); spotsPh[i].target.position.set(lp.x + 6, lp.y - 0.35, lp.z * 1.4); spotsPh[i].intensity = 5.5 * etatPh;
            conesPh[i].position.set(lp.x + 3.75, lp.y - 0.12, lp.z); conesPh[i].material.uniforms.force.value = aPh * fadePh * (0.75 + 0.25 * Math.sin(t * 44 + i)); conesPh[i].material.uniforms.temps.value = t;
            flaresPh[i].position.copy(lp); flaresPh[i].material.opacity = aPh * fadePh * 0.55; flaresPh[i].scale.setScalar(aPh * fadePh * (0.3 + 0.06 * Math.sin(t * 31 + i)));
            striesPh[i].position.copy(lp); striesPh[i].material.opacity = aPh * fadePh * 0.4; striesPh[i].scale.set(aPh * fadePh * 2.2, aPh * fadePh * 0.05, 1);
          }
          // éclairage d'appoint des inserts : rai doux sur le visage de la jante (insert 2), lueur à peine là sur les optiques (insert 1)
          { const plK = planDe(t); let kI = 0;
            if (plK && plK.id === 'jante') kI = 3.2; else if (plK && plK.id === 'phares') kI = 0.6;   // rai étroit sur la jante, jamais un projecteur de stade
            keyMacro.intensity += (kI - keyMacro.intensity) * Math.min(1, dt * 12);
            if (roueCible && plK && plK.id === 'jante') { roueCible.pivot.getWorldPosition(_a); keyMacro.position.set(camera.position.x - 0.2, camera.position.y + 0.7, camera.position.z - 0.5); keyMacro.target.position.copy(_a); }
            else { keyMacro.position.set(xO + 2.5, dalle + 1.2, 0.8); keyMacro.target.position.set(voiture.position.x + modele.xAvant - 0.3, dalle + 0.5, 0); } }
          // lumière rasante (insert 3), qui reste ensuite en appoint doux
          const pr3 = D.plans[2];
          rasant.intensity = 14 * borne((t - pr3.t0 + 0.2) / 0.3) * (1 - 0.8 * borne((t - pr3.t1) / 0.3));
          // insert 2 : coups d'accélérateur (ou roulette qui couine) ; plan large : rugissement final, moteur emballé sur place
          const tb0 = ja.t0 + (ja.t1 - ja.t0) * 0.25, caster = modele.fam === 'fauteuil', tbs = caster ? [0, 0.28, 0.5] : [0, 0.46];
          let envB = 0; for (const d of tbs) { const x = t - (tb0 + d); if (x >= 0) envB = Math.max(envB, Math.exp(-x * (caster ? 9 : 6.5)) * (1 - Math.exp(-x * 60))); }
          if (caster) { if (roueCible) roueCible.pivot.rotation.y = 0.5 * envB * Math.sin((t - tb0) * 28); shY += 0.012 * envB * Math.sin(t * 50); }
          else { vBlip = Math.max(vBlip, 13 * envB); shY += 0.014 * envB * Math.sin(t * 73); shR -= 0.02 * envB; if (envB > 0.45 && Math.random() < 0.7) fumeeEchappement(1); }
          if (t >= la.t0 + 0.08 && t < D.sortie) {
            const rv = borne((t - la.t0 - 0.08) / 0.55);
            if (!etat.rugit) { etat.rugit = true; flashV = Math.max(flashV, 0.3); }
            vBlip = Math.max(vBlip, 10 * rv); shY += 0.016 * rv * Math.sin(t * 81); shR -= 0.014 * rv * (0.6 + 0.4 * Math.sin(t * 29)); secousse = Math.max(secousse, 0.07 * rv);
            if (Math.random() < 0.8) fumeeEchappement(rv > 0.5 ? 2 : 1);
            for (let i = 0; i < 2; i++) flaresPh[i].scale.setScalar(flaresPh[i].scale.x * (1 + 0.5 * rv));
          }
        }
      }

      // ---------- 3. sortie du bolide (roulage), franchissement du seuil = signature du bolide
      const ap = borne((t - D.sortie) / (D.pose - D.sortie));
      let posEffet;
      if (roulage) {
        const e = roulage.pas(Math.max(0, t - D.sortie), t >= D.sortie ? dt : 0);
        voiture.position.x = e.x;
        modele.chassis.position.y = e.chassis.y - modele.rayonArriere * TASS; modele.chassis.rotation.z = e.chassis.tangage;
        for (const w of modele.roues) w.pivot.position.y = (w.avant ? e.roues.av : e.roues.ar) - w.r * TASS;
        if (modele.fam === 'helico') {                                    // l'hélico glisse sur la dalle, ne décolle qu'une fois dehors
          const dehors = lisse(borne((e.x + modele.xArriere - xO) / 1.2));
          modele.chassis.position.y = dalle + 1.6 * dehors * (1 - borne((t - D.pose) / 2.5) * 0.35) + Math.sin(t * 2.4) * 0.05 * dehors;
          modele.chassis.rotation.z = -0.06 * dehors * (1 - ap);
        }
        if (t < D.sortie) { modele.chassis.position.y += shY; modele.chassis.rotation.z += shR; }
        modele.maj(dt, e.v + vBlip, t, e.glissement);
        const yb = e.x + modele.essieuArriere > xO ? 0 : dalle;
        ombre.position.set(e.x, yb + 0.02, 0); ombre.material.opacity = 0.7;
        posEffet = V3(e.x, yb, 0);
        if (e.glissement > 0.05 && t > D.sortie) contactPneus(e.x + modele.essieuArriere, dalle, e.glissement);
        for (const ev of e.evenements) {
          if (ev.startsWith('seuil')) { etincellesChassis(e.x + (ev.endsWith('av') ? modele.essieuAvant : modele.essieuArriere), dalle + 0.05); if (son) ferraille('choc', 0, 0.42, 1.45); }
          else if (ev.startsWith('sol')) { fumee(4, e.x + (ev.endsWith('av') ? modele.essieuAvant : modele.essieuArriere), 0.05, 0, 0.4); if (son) ferraille('choc', 1, 0.3, 1.8); }
        }
      }
      if (t >= tSeuil && !etat.seuil) {                                  // le bolide franchit le seuil : filtre, jingle (déjà programmé), univers
        etat.seuil = true; sigPunch = 1; post.u.sig.value = FILTRES_SIGNATURE[SIG.filtre] || 13;
        flashV = Math.max(flashV, trailer ? 0.6 : 0.4); secousse = Math.max(secousse, trailer ? 0.45 : 0.25); coupZoom = 8;
      }
      if (trailer && t >= D.bascule + D.dech && !etat.univers) {         // la déchirure est complète : le décor appartient à l'univers
        etat.univers = true; flashV = Math.max(flashV, 0.35);
        scene.background.set(A.fond); scene.fog.color.set(A.brouillard); scene.fog.density = 0.028; contre.color.set(A.lumiere);
        if (hangar) hangar.basculer();                                // le hangar s'efface : l'univers prend toute la place
        hemi.color.set(0x8090ff); hemi.groundColor.set(0x100818); BASE.cle = 2.0; BASE.contre = 0.9; BASE.hemi = 0.35;
        if (cel) cel.appliquer();
        if (decor) {                                                   // le décor 3D de l'univers apparaît avec la déchirure : ciel, skyline, sol laqué, reflets, contre-jour
          decor.activer(); scene.fog.color.set(decor.brouillard.couleur); scene.fog.density = decor.brouillard.densite;
          sol.material = decor.solMat; sol.scale.set(3, 3, 1); if (decor.solMat.map) decor.solMat.map.repeat.multiplyScalar(3);
          if (miroirCar) miroirCar.racine.visible = true;
        }
      }
      if (etat.seuil) particulesSignature(dt, ap < 1 ? 1 : 0.5);
      if (ap > 0 && !etat.sortie) { etat.sortie = true; if (palier === 'legendaire' || palier === 'relique_interdite' || R.custom) flasher(); }   // le moteur (embrayage, rapports) est déjà dans la prise physique
      if (ap > 0 && ap < 1) effetTheme(effet, posEffet, LONG, haut, dt);
      if (ap >= 1 && !etat.pose) { etat.pose = true; poseRarete(); if (son) ferraille('choc', 2, 0.5, 1.3); }
      if (etat.pose && t < D.stats && Math.random() < (R.particules.rayons ? 0.35 : 0.15)) auraRarete(1);
      for (let i = eclairs.length - 1; i >= 0; i--) { const e = eclairs[i]; e.vie -= dt; e.l.material.opacity = Math.max(0, e.vie / e.max); if (e.vie <= 0) { scene.remove(e.l); e.l.geometry.dispose(); e.l.material.dispose(); eclairs.splice(i, 1); } }
      if (t < D.sortie) { voiture.position.x += fret.position.x; voiture.position.y = fret.position.y + (modele ? 0 : dalle); ombre.visible = t >= D.arrivee; }
      else { if (modele) voiture.position.y = 0; ombre.visible = true; }
      majContact();
      if (hangar) hangar.maj(t, dt, { noir: Math.max(etat.noir || 0, etat.noirS || 0), yConteneur: fret.position.y, conteneurX: fret.position.x, conteneurZ: fret.position.z });
      majParts(dt);
      if (decor && etat.univers) { decor.maj(t, dt, camera, cv.height); if (miroirCar) miroirCar.sync(); }
      coupZoom = Math.max(0, coupZoom - dt * 14);
      camera.fov = fovBase * (1 - coupZoom / 38); camera.updateProjectionMatrix();
      camera.position.copy(cam); camera.lookAt(cib);
      if (rollPlan) camera.rotateZ(rollPlan);
      if (rang >= 3 && t < D.sortie) camera.rotateZ(Math.sin(t * 1.9) * 0.012 * (1 + etat.palier) + (rs ? rs.rz * 5 : 0));     // roulis de séisme

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
      if (pasFixe && window.__fretCoupe) {                     // banc de contrôle image par image uniquement : isole la contribution de chaque lumière
        const k = window.__fretCoupe, f = (nom, l) => { if (l && k[nom] != null) l.intensity *= k[nom]; };
        f('cle', cle); f('contre', contre); f('hemi', hemi); f('interieur', interieur); f('keyMacro', keyMacro); f('rasant', rasant); f('cleV', cleV); f('lisV', lisV);
        for (const sp of rimFond) f('rim', sp); for (const sp of spotsPh) f('phares', sp);
      }
      majPost(t, dt); post.scene(scene, camera); post.passe();
      if (surcouche) surcouche.dessiner(fige ? { phase: 'freeze', k: 0, focus: focusFige, dt } : { phase: t < D.bascule ? 'amorce' : 'bascule', k: t - D.bascule, focus: focusEcran(), dt });
      if (pasFixe) window.__fretT = t;                       // repère pour les captures de contrôle
      if (recDessin) recDessin(t);
      raf = requestAnimationFrame(tick);
    };

    function etincellesArc() {                      // allumage sec des optiques : arc électrique bref (gerbe fine blanc-bleu → orange), au ras de chaque lentille
      for (let i = 0; i < 2; i++) {
        const lp = modele.lampePos(i, V3(0, 0, 0));
        emettre(express ? 6 : 11, () => ({ mat: matPart(Math.random() < 0.55 ? '#dff1ff' : '#ffb04a', texD, true), pos: V3(lp.x + 0.06, lp.y + (Math.random() - 0.5) * 0.08, lp.z + (Math.random() - 0.5) * 0.12),
          vel: V3(1.2 + Math.random() * 2.6, (Math.random() - 0.2) * 2.2, (Math.random() - 0.5) * 2.4), taille: 0.018 + Math.random() * 0.03, vie: 0.12 + Math.random() * 0.16, g: -6, frein: 1.5, op: 1, pivote: true }));
      }
    }
    function poussiereJolt(n) {                       // à chaque à-coup : poussière et rouille qui tombent du toit et des soudures
      emettre(n, () => ({ mat: matPart(Math.random() < 0.6 ? '#9a9fb2' : '#7a5a46', texD, false), pos: V3((Math.random() - 0.5) * L * 0.9, H - 0.15, (Math.random() < 0.5 ? -1 : 1) * (P / 2 - 0.2 - Math.random() * 0.4)), vel: V3((Math.random() - 0.5) * 0.6, -0.4 - Math.random() * 0.8, (Math.random() - 0.5) * 0.4), taille: 0.18 + Math.random() * 0.3, croit: 1.2, vie: 1 + Math.random() * 0.8, op: 0.35, g: -1.5, frein: 0.8 }));
    }
    function pschitt() {                              // décompression : jets de vapeur des vérins du coffre, nuage rasant sur la dalle
      flashV = Math.max(flashV, 0.16); secousse = Math.max(secousse, 0.1);
      for (const z of [-1, 1]) emettre(express ? 14 : 24, () => ({ mat: matPart('#6a7286', texD, false), pos: V3(xO + 0.3, yLinteau - 0.1, z * (P / 2 - 0.25)), vel: V3(1.4 + Math.random() * 1.8, -0.5 - Math.random() * 1.0, z * (2.2 + Math.random() * 2.0)),   /* jets des vérins chassés sur les côtés : jamais dans l'objectif */ taille: 0.5 + Math.random() * 0.5, croit: 2.8, vie: 1.1 + Math.random() * 0.7, op: 0.26, frein: 2.2 }));
      emettre(express ? 12 : 22, () => ({ mat: matPart('#1e222d', texD, false), pos: V3(xO - 0.4 + Math.random() * 0.8, dalle + 0.1 + Math.random() * 0.4, (Math.random() - 0.5) * (P - 0.6)), vel: V3(2.2 + Math.random() * 2.2, 0.1 + Math.random() * 0.3, (Math.random() - 0.5) * 1.4), taille: 1.4 + Math.random() * 1.2, croit: 2.2, vie: 2 + Math.random() * 1.2, op: 0.32, frein: 1.1 }));
    }
    function fumeeDense(n) {                          // fumée volumétrique épaisse : coule hors du conteneur, éclairée à contre-jour
      // fumée SOMBRE (les sprites ne sont pas éclairés : une fumée claire devenait un voile laiteux qui cramait l'intérieur) ;
      // la lumière n'y apparaît que là où passent les cônes des phares et les rais du fond
      const tons = ['#161a25', '#1d2231', '#262c3e', couleurFuite.clone().multiplyScalar(0.28).getStyle()];
      emettre(n, () => ({ mat: matPart(tons[Math.floor(Math.random() * 4)], texD, false), pos: V3(xO - 2.4 + Math.random() * 2.0, dalle + 0.05 + Math.random() * 0.9, (Math.random() - 0.5) * (P - 0.5)), vel: V3(0.4 + Math.random() * 1.2, 0.05 + Math.random() * 0.3, (Math.random() - 0.5) * 0.8), taille: 1.2 + Math.random() * 1.3, croit: 1.5, vie: 3 + Math.random() * 1.6, op: 0.22, frein: 0.5, tourne: (Math.random() - 0.5) * 0.4 }));
    }
    function fumeeEchappement(n) {                    // gaz d'échappement qui refluent au fond du conteneur
      if (!modele) return;
      emettre(n, () => ({ mat: matPart('#454b5e', texD, false), pos: V3(voiture.position.x + modele.xArriere - 0.15, dalle + 0.3 + Math.random() * 0.15, (Math.random() - 0.5) * 0.5), vel: V3(-1.2 - Math.random() * 1.6, 0.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8), taille: 0.5 + Math.random() * 0.5, croit: 2.2, vie: 1.6 + Math.random(), op: 0.34, frein: 0.9 }));
    }
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
      removeEventListener('keydown', surTouche, true); el.removeEventListener('pointerdown', surClic); removeEventListener('gp:suivant', accepter); removeEventListener('gp:arreter', interrompre);
      if (musiqueSource) {                 // fondu de la musique, puis arrêt
        try { const ac = musiqueGain.context, tt = ac.currentTime; musiqueGain.gain.cancelScheduledValues(tt); musiqueGain.gain.setValueAtTime(musiqueGain.gain.value, tt); musiqueGain.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5); musiqueSource.stop(tt + 0.55); } catch (e) { /* déjà arrêtée */ }
      }
      if (stopTheme) stopTheme();
      if (stopSuspense) stopSuspense();
      if (stopAmbiance) stopAmbiance();
      if (stopMoteur) setTimeout(stopMoteur, 650);
      if (salle) setTimeout(() => salle.dispose(), 3200);
      if (busFond) setTimeout(() => busFond.dispose(), 700);
      if (annulerParole) annulerParole();
      const nettoyer = () => {
        for (const x of jetables) { try { x.dispose && x.dispose(); } catch (e) { /* rien */ } }
        post.dispose();
        if (cel) { cel.annuler(); cel.dispose(); }
        if (modele) modele.dispose();
        if (hangar) hangar.dispose();
        if (decor) decor.dispose();
        parts.forEach((p) => p.s.material.dispose());
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* rien */ }
        el.remove();
      };
      el.classList.add('fin');
      const apres = () => setTimeout(() => { nettoyer(); resolve(true); }, 450);
      if (rec) recFin().then(apres); else apres();
    }
    // TOP DÉPART en trois temps, pour qu'aucune image noire ni aucun gel ne soit vu (ni filmé) :
    //   1. préchauffe : une image complète (scène + post-traitement) rendue hors horloge, puis readPixels qui force le GPU à
    //      finir (compilation des programmes, envoi des textures, allocation des cibles du post-traitement) ;
    //   2. le son est préparé (bus, ambiances, suspense, jingle, cri, musique) — travail lourd fait AVANT l'horloge ;
    //   3. l'horloge part, l'enregistrement démarre (premiereImage) et la première image arrive dans la foulée.
    const demarrer = () => {
      if (fini) return;
      etat.lance = true;
      lancerSon();
      debut = dernier = performance.now();
      if (premiereImage) { try { premiereImage(); } catch (e) { /* la capture gère son propre échec */ } }
      if (rec) rec.start();
      raf = requestAnimationFrame(tick);
    };
    preparerSon();                                                    // rendu physique du son AVANT l'horloge (aucun à-coup pendant le reveal)
    if (pasFixe) { demarrer(); return; }
    try {
      post.scene(scene, camera); post.passe();
      const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    } catch (e) { /* préchauffe facultative */ }
    requestAnimationFrame(() => requestAnimationFrame(demarrer));
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
  if (S) { dest = S.ac.createMediaStreamDestination(); (S.final || S.master).connect(dest); dest.stream.getAudioTracks().forEach((t) => flux.addTrack(t)); }
  const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = types.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(flux, mime ? { mimeType: mime, videoBitsPerSecond: 12e6 } : undefined);
  const morceaux = []; rec.ondataavailable = (e) => { if (e.data && e.data.size) morceaux.push(e.data); };
  const R = infoRarete(car);
  const enveloppe = (txt, x, y, larg, lh, max) => { const mots = String(txt).split(' '); let l = '', n = 0; for (const m of mots) { const e = l ? l + ' ' + m : m; if (g.measureText(e).width > larg && l) { g.fillText(l, x, y + n * lh); n++; l = m; if (n >= max) return; } else l = e; } if (l) g.fillText(l, x, y + n * lh); };
  const recDessin = () => {
    g.drawImage(cvGL, 0, 0, W, Hh);
    if (ov) { g.drawImage(ov, 0, 0, W, Hh); return; }          // trailer : tout est déjà dans la surcouche
    const cls = el.classList, cit = el.querySelector('.fret-cit span').textContent;
    if (cls.contains('rar-on')) { g.font = R.custom ? '900 44px Arial Black, Arial' : '900 30px Arial Black, Arial'; g.fillStyle = R.couleur; if (R.custom) { g.shadowColor = R.lueur; g.shadowBlur = 30; } g.fillText(`${R.custom ? '' : '◆'.repeat(R.rang + 1) + ' '}${R.court}`, 80, 90); g.shadowBlur = 0; }
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
      if (dest && S) { try { (S.final || S.master).disconnect(dest); } catch (e) { /* rien */ } }
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
.fret-rar.fret-rar-cust{font-size:clamp(22px,3.1vw,58px);letter-spacing:.07em;padding:.22em .7em;border-radius:14px;border:2px solid var(--rar);white-space:nowrap;
  background:color-mix(in srgb,var(--cb,#05040c) 86%,#000);text-shadow:0 0 12px var(--rar-l),0 0 30px var(--rar-l);
  box-shadow:0 0 34px color-mix(in srgb,var(--rar-l) 65%,transparent),inset 0 0 18px color-mix(in srgb,var(--rar-l) 30%,transparent)}
.fret-reveal.rar-on .fret-rar-cust{animation:fretCust 1.5s ease-in-out infinite}
@keyframes fretCust{50%{box-shadow:0 0 60px var(--rar-l),inset 0 0 28px color-mix(in srgb,var(--rar-l) 45%,transparent)}}
.fret-reveal.trailer.fige .fret-rar-cust{display:block;opacity:1;left:50%;top:auto;bottom:12vh;transform:translateX(-50%);z-index:4}
.fret-reveal.cust-sncf .fret-rar-cust{animation-name:fretCustPreavis!important;animation-timing-function:steps(2)!important}
@keyframes fretCustPreavis{50%{border-color:#ff9f1a;box-shadow:0 0 56px #ff9f1a,inset 0 0 24px rgba(255,159,26,.4)}}
@media (max-width:820px){.fret-txt{left:3vw;right:3vw;width:auto;top:auto;bottom:3vh}.fret-alias{font-size:clamp(24px,7vw,40px)}}
@media (prefers-reduced-motion:reduce){.fret-reveal *{transition:none!important;animation:none!important}}`;
  document.head.appendChild(st);
}
