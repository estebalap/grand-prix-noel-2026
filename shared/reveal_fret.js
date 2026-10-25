/* REVEAL « FRET » — la cinématique de révélation d'un bolide, en temps réel (Three.js, 60 i/s).

   MONTÉE EN SUSPENSE (tous les modes, 2,5 à 15,5 s selon la rareté) : le conteneur tombe et se verrouille, puis tremble sur
   ses cales ; chaque palier de rareté frappe en MODE EXPLOSION (chronologie.js → D.detonations) : la caisse surchargée change de
   couleur instantanément sous une incandescence blanche qui retombe en 0,4 s, une onde de choc balaie le hangar, l'écran est
   frappé 2 images par un strobe saturé (couleur du palier), étincelles de soudure, arcs électriques et vapeur jaillissent des
   joints, la caméra décroche puis vibre (ressort amorti), sub-boom + acier forgé à l'image près. Légendaire, Relique et raretés
   signature : rafale de détonations qui font sauter les rivets et surchauffent la tôle à blanc, puis explosion titanesque au
   scellé. H01 finit noir, couvert de formules d'astrophysique lumineuses. Le scellé vole en éclats D'ABORD, puis le rideau métallique « ? »
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
import { RARETES, rareteDe, infoRarete, coteAffichee, masqueRarete } from './rarete.js';
import { construireBolide3D, envNeon } from './bolides3d.js';
import { creerHangar } from './hangar3d.js';
import { code128B } from './code128.js';
import { remixJingle } from './remix_jingle.js';
import { creerRoulage } from './roulage.js';
import { ARCHETYPES, archetypeDe, creerPost, celShading, creerSurcouche, prechargerPolices, themeSonore } from './archetypes.js';
import { chronologie, gabarit, GABARIT, progressionRideau, progressionRideauDrame, tempsSortieDrame, allume, STROBE, INCANDESCENCE } from './chronologie.js';
import { creerDecor, creerMiroirModele } from './decors3d.js';
import { cadrageDe } from './ambiances_v6.js';
import { chargerSignatures, signatureDe, jingleEntree, suspenseSonore, ambianceSonore, drameSonore, texturesParticules, PARTICULES_SIGNATURE, FILTRES_SIGNATURE } from './signatures.js';
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
function texTole(couleur, alea = Math.random) {         // tôle ondulée : bandes verticales + usure (alea : générateur, à graine en MODE DRAME)
  return texCanvas(512, 256, (g, w, h) => {
    g.fillStyle = couleur; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const lg = g.createLinearGradient(x, 0, x + 16, 0);
      lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(0.5, 'rgba(0,0,0,.22)'); lg.addColorStop(1, 'rgba(255,255,255,.10)');
      g.fillStyle = lg; g.fillRect(x, 0, 16, h);
    }
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(${alea() < 0.5 ? '255,255,255' : '0,0,0'},${alea() * 0.06})`; g.fillRect(alea() * w, alea() * h, 2 + alea() * 20, 1 + alea() * 3); }
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
/** H01 « Le Hawking Express » : tableau noir d'astrophysicien, formules blanches LUMINEUSES (halo puis trait net) — température de
 *  Hawking, rayon de Schwarzschild, entropie de Bekenstein-Hawking, équations d'Einstein, métrique de Schwarzschild, évaporation,
 *  gravité de surface, borne de Bekenstein, plus un diagramme de Penrose et un plongement de trou noir esquissés à la craie.
 *  Mini-balisage : _{…} indice, ^{…} exposant. 2048 × 1024 px, motif répété sur la caisse (8 × 4 m par tuile). */
const FORMULES_HAWKING = [
  'T_{H} = ħc^{3} / 8πGMk_{B}', 'r_{s} = 2GM / c^{2}', 'S_{BH} = k_{B}c^{3}A / 4Għ', 'G_{μν} + Λg_{μν} = 8πG/c^{4} · T_{μν}',
  'ds^{2} = −(1 − r_{s}/r) c^{2}dt^{2} + (1 − r_{s}/r)^{−1} dr^{2} + r^{2}dΩ^{2}', 'dM/dt = −ħc^{4} / 15360πG^{2}M^{2}', 't_{évap} = 5120πG^{2}M^{3} / ħc^{4}',
  'κ = c^{4} / 4GM', 'T = ħκ / 2πck_{B}', 'A = 16πG^{2}M^{2} / c^{4}', 'S ≤ 2πk_{B}RE / ħc', 'E = mc^{2}', 'R_{μν} − ½Rg_{μν} = 8πG T_{μν} / c^{4}',
  'iħ ∂ψ/∂t = Ĥψ', 'dE = T dS + Ω dJ + Φ dQ', 'L = ħc^{6} / 15360πG^{2}M^{2}', '∇_{μ}T^{μν} = 0', 'λ_{max} ≈ 16 r_{s}',
];
function texFormules() {
  return texCanvas(2048, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    let a = 7; const alea = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
    const police = (px) => `italic 500 ${px}px "Cambria Math","STIX Two Math","Latin Modern Math","Times New Roman",Georgia,serif`;
    // écrit une formule balisée ; renvoie sa largeur (mesure seule si !dessin)
    const ecrire = (txt, x, y, px, dessin) => {
      let cx = x; const re = /([_^])\{([^}]*)\}|([^_^]+|[_^])/g; let m;
      while ((m = re.exec(txt))) {
        const sous = m[1] === '_', sur = m[1] === '^', t = m[2] != null ? m[2] : m[3], p = sous || sur ? px * 0.62 : px;
        g.font = police(p); if (dessin) g.fillText(t, cx, y + (sous ? px * 0.28 : sur ? -px * 0.42 : 0)); cx += g.measureText(t).width + (sous || sur ? px * 0.04 : 0);
      }
      return cx - x;
    };
    const croquis = (dessin) => {
      g.save(); g.lineWidth = 3; g.strokeStyle = '#fff';
      // diagramme de Penrose d'un trou noir de Schwarzschild (losanges, singularité en zigzag)
      const px0 = 1640, py0 = 760, s2 = 120;
      g.beginPath(); g.moveTo(px0 - s2, py0); g.lineTo(px0, py0 - s2); g.lineTo(px0 + s2, py0); g.lineTo(px0, py0 + s2); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(px0 - s2, py0 - s2); g.lineTo(px0 + s2, py0 + s2); g.moveTo(px0 + s2, py0 - s2); g.lineTo(px0 - s2, py0 + s2); g.stroke();
      g.beginPath(); for (let k = 0; k <= 12; k++) g.lineTo(px0 - s2 + k * s2 / 6, py0 - s2 - (k % 2 ? 9 : 0)); g.stroke();
      // plongement de Flamm : entonnoir de la géométrie spatiale
      g.beginPath(); for (let k = -60; k <= 60; k++) { const x = 380 + k * 3.2, r = Math.abs(k) / 60; g.lineTo(x, 820 + 150 * (1 - Math.sqrt(Math.max(0, r - 0.08)))); } g.stroke();
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(380, 830 + k * 28, 190 - k * 34, 16 - k * 2, 0, 0, 7); g.stroke(); }
      g.restore(); void dessin;
    };
    const places = [];
    const poser = (txt, px) => {
      for (let essai = 0; essai < 60; essai++) {
        g.font = police(px); const lg = ecrire(txt, 0, 0, px, false);
        const x = 40 + alea() * Math.max(10, w - lg - 80), y = 70 + px + alea() * (h - 2 * px - 120);
        const r = { x0: x - 16, x1: x + lg + 16, y0: y - px * 1.1, y1: y + px * 0.55 };
        if (places.every((q) => r.x1 < q.x0 || r.x0 > q.x1 || r.y1 < q.y0 || r.y0 > q.y1) && !(r.x1 > 1490 && r.y1 > 610) && !(r.x0 < 600 && r.y1 > 780)) { places.push(r); return { txt, px, x, y, rot: (alea() - 0.5) * 0.06 }; }
      }
      return null;
    };
    const liste = FORMULES_HAWKING.map((f, i) => poser(f, i < 4 ? 74 + alea() * 16 : 44 + alea() * 22)).filter(Boolean);
    for (const passe of [0, 1]) {                                           // 1. halo flou (lueur), 2. trait net
      g.fillStyle = '#fff'; g.shadowColor = '#bcd6ff'; g.shadowBlur = passe ? 6 : 26; g.globalAlpha = passe ? 1 : 0.85;
      for (const f of liste) { g.save(); g.translate(f.x, f.y); g.rotate(f.rot); ecrire(f.txt, 0, 0, f.px, true); g.restore(); }
      g.strokeStyle = '#fff'; croquis(true);
      for (const f of liste) if (f.px > 70) { g.globalAlpha = passe ? 0.7 : 0.35; g.fillRect(f.x, f.y + f.px * 0.38, Math.min(700, f.px * 6), 3); }     // soulignés à la craie
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
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
  /* MODE DRAME (rareté signature à drapeau « drame », ex. Épave) : jusqu'au scellé, le reveal EST celui d'un Légendaire — RV, le profil
     « masque », fournit toutes les couleurs visibles avant le drame (liseré, lumières, bordereau, badge) ; R reprend la main ensuite.
     Tout le hasard de la scène passe alors par un générateur à graine (code du bolide) : deux captures donnent deux films identiques.
     Pour tous les autres bolides, RV === R et hasard === Math.random : rien ne change. */
  const DRAME = !!R.drame, RV = DRAME ? masqueRarete(car) : R;
  const CRASH = DRAME && car.drame_scenario === 'crash';                 // scénario « crash » (N13 : abattu en vol) ; sinon l'épave de N12
  const graine = (txt) => { let a = 2166136261; for (const c of txt) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let z = a; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; }; };
  const hasard = DRAME ? graine('drame|' + car.code) : Math.random;      // image
  const aleaSon = DRAME ? graine('son|' + car.code) : null;               // bruits de la bande-son (suspense, ambiance, chute)
  /* textures tirées au hasard par les modules partagés (manchons et vitrages du hangar, métal brossé des pièces) : en MODE DRAME,
     leur construction (synchrone, à une micro-tâche près pour le modèle) se fait sous le générateur à graine, puis Math.random est rendu */
  const sousGraine = async (f) => { if (!DRAME) return f(); const m = Math.random; Math.random = graine('textures|' + car.code); try { return await f(); } finally { Math.random = m; } };
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
  const D = chronologie({ rang, express, trailer, drame: DRAME, scenario: CRASH ? 'crash' : 'epave' });  // chronologie.js : testée sous Node (MODE DRAME : D.drame)
  const DR = D.drame || null;
  if (trailer) await prechargerPolices();

  /* --- DOM : canvas WebGL + surcouche texte */
  const el = document.createElement('div');
  el.className = 'fret-reveal' + (trailer ? ' trailer arche-' + cleA : '') + (R.custom ? ' cust cust-' + R.custom : '') + (DRAME ? ' drame' : '');
  el.style.cssText = `--rar:${R.couleur};--rar-l:${R.lueur};--acc:${acc}`;
  el.innerHTML = `<canvas class="fret-cv"></canvas>${trailer ? `<canvas class="fret-ov"></canvas>${equipeHtml ? `<div class="fret-proprio">${equipeHtml}</div>` : ''}` : ''}${DRAME ? '<canvas class="fret-drame-cv"></canvas>' : ''}<div class="fret-flash"></div>
    <div class="fret-rar${R.custom ? ' fret-rar-cust rar-c-' + R.custom : ''}" style="--cb:${R.carte[0]}">${R.custom ? '' : '◆'.repeat(R.rang + 1) + ' '}${esc(R.court)}</div>
    <div class="fret-txt">
      ${equipeHtml ? `<div class="fret-equipe">${equipeHtml}</div>` : ''}
      <div class="fret-code">${esc(car.code)} · ${esc(car.real_name || '')}</div>
      <h2 class="fret-alias">${esc(car.alias || car.code)}</h2>
      <div class="fret-ecurie">${esc(car.ecurie || '')} · ${esc(DRAME ? 'fumée noire et ratés' : NOMS_EFFETS[effet])}</div>
      <div class="fret-cit">« <span></span> »</div>
      <div class="fret-lore">${esc(car.lore || '')}</div>
      <div class="fret-stats">${STATS.map(([k, l, c]) => `<div class="fret-stat" style="--c:${c}"><span>${l}</span><i><b style="--v:${Math.max(3, Math.min(100, car[k] || 0))}%"></b></i><em>${car[k] ?? '–'}</em></div>`).join('')}</div>
      ${(() => { const k = coteAffichee(car); return k ? `<div class="fret-cote">Cote ${k.affinee ? 'affinée' : 'initiale'} : <b>×${String(k.cote).replace('.', ',')}</b></div>` : ''; })()}
    </div>
    <div class="fret-suivant"><kbd>Espace</kbd> ou clic : bolide suivant</div>`;
  parent.appendChild(el);
  injecterCss();
  const cv = el.querySelector('.fret-cv'), cvDrame = el.querySelector('.fret-drame-cv');

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
  const surcouche = trailer ? creerSurcouche(ov, { car, cle: cleA, rarete: R, cote: (coteAffichee(car) || {}).cote, express, alea: DRAME ? hasard : null }) : null;

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
  const contre = new THREE.PointLight(new THREE.Color(RV.lueur), 0.9, 40); contre.position.set(-8, 9, -10); scene.add(contre);
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
  try { modele = await sousGraine(() => construireBolide3D(car.code, { THREE, envMap: env })); }
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
  hangar = DRAME ? await sousGraine(() => creerHangar(THREE, { L: 9.54, P: 4.4, H, renderer })) : creerHangar(THREE, { L: 9.54, P: 4.4, H, renderer });
  scene.add(hangar.groupe, hangar.lumieres);
  sol.material = hangar.solMat; solDefaut = hangar.solMat;
  scene.background.set(0x050505); scene.fog.color.set(0x0a0908); scene.fog.density = 0.027;      // la nef se perd dans la pénombre
  hemi.color.set(0x7d8494); hemi.groundColor.set(0x17120c);

  /* --- le conteneur Lootbox Fret (cotes du STL ÷ 10 : 9,54 × 4,16 × 4,4 ; plus haut si le bolide l'exige) */
  const fret = new THREE.Group(); scene.add(fret);
  /* PEINTURE DU CONTENEUR — MODE EXPLOSION. La tôle est une texture neutre (relief, usure) teintée par un shader. FIN DE LA VAGUE
     QUI GLISSE : à chaque palier de rareté, la caisse est surchargée d'énergie et change de couleur INSTANTANÉMENT, sous l'impact —
     la tôle est chauffée à blanc (plus chaud dans les rainures et aux joints), puis retombe blanc → orange → nouvelle couleur en
     INCANDESCENCE (0,4 s). Toute la caisse — tôle, toit, montants, coffre, rideau — et sa finition (or métallisé au Légendaire).
     Climax (rang ≥ 3) : la surchauffe s'accumule détonation après détonation jusqu'au blanc, puis refroidit après le scellé. */
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
     prennent la couleur de leur rareté. « livree » : bandeaux horizontaux peints par le shader (hauteur relative du conteneur).
     H01 « Le Hawking Express » : à la fin des paliers, la caisse devient INTÉGRALEMENT NOIRE, couverte de formules mathématiques et
     astrophysiques blanches lumineuses (texFormules : Hawking, Schwarzschild, Bekenstein, Einstein…). */
  const PEINTURES_SIGNATURE = {
    vocaloid: { c: '#1fd6e0', rough: 0.3, metal: 0.55 },
    sncf: { c: '#b9bec6', rough: 0.4, metal: 0.5, livree: { a: '#a8002e', b: '#3d0e3a' } },
    // Épave : gris rouille mat. En MODE DRAME, ce n'est PAS le dernier palier (l'or d'un vrai Légendaire) : c'est la couleur vers
    // laquelle la tôle surchauffée retombe au pétard mouillé (creerDrame)
    epave: { c: '#4b3a30', rough: 0.9, metal: 0.22 },
  };
  const HAWKING = car.code === 'H01';
  if (HAWKING) PEINTURES.push({ c: '#060608', rough: 0.55, metal: 0.25, formules: true });
  else if (R.custom && !DRAME) PEINTURES.push(PEINTURES_SIGNATURE[R.custom] || { c: R.couleur, rough: 0.35, metal: 0.55 });   // MODE DRAME : le dernier palier mène à l'OR, comme un vrai Légendaire
  const P_SIGNATURE = HAWKING || (R.custom && !DRAME) ? PEINTURES.length - 1 : -1;
  for (const x of PEINTURES) x.col = new THREE.Color(x.c);
  const livS = PEINTURES[PEINTURES.length - 1].livree;
  const texForm = HAWKING ? garde(texFormules()) : null;
  if (texForm) { texForm.wrapS = texForm.wrapT = THREE.RepeatWrapping; texForm.encoding = THREE.LinearEncoding; }
  const uPeinture = { uPeint: { value: PEINTURES[0].col.clone() }, uLiv: { value: 0 }, uLueur: { value: 0 }, uIncand: { value: 0 }, uSurchauffe: { value: 0 }, uTemps: { value: 0 },
    uBandeA: { value: new THREE.Color(livS ? livS.a : '#000') }, uBandeB: { value: new THREE.Color(livS ? livS.b : '#000') }, uOrigine: { value: new THREE.Vector3() }, uHaut: { value: 4.16 },
    uFormules: { value: texForm }, uFormulesOn: { value: 0 } };
  const peindre = (m, facteur = 1) => {
    m.userData.peinture = true;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uPeinture, { uFacteur: { value: facteur } });
      sh.vertexShader = 'varying vec3 vPMonde; varying vec3 vNMonde;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vec4 pMonde = modelMatrix * vec4(transformed, 1.0); vPMonde = pMonde.xyz; vNMonde = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = 'uniform vec3 uPeint; uniform float uLiv; uniform float uFacteur; uniform float uLueur; uniform float uIncand; uniform float uSurchauffe; uniform float uTemps;\n'
        + 'uniform vec3 uBandeA; uniform vec3 uBandeB; uniform vec3 uOrigine; uniform float uHaut;' + (texForm ? ' uniform sampler2D uFormules;' : '') + ' uniform float uFormulesOn;\nvarying vec3 vPMonde; varying vec3 vNMonde;\n'
        + 'vec3 livree(vec3 base, float on, float y) {\n  float aa = 0.006;\n  float b1 = smoothstep(0.40 - aa, 0.40 + aa, y) * (1.0 - smoothstep(0.53 - aa, 0.53 + aa, y));\n  float b2 = smoothstep(0.555 - aa, 0.555 + aa, y) * (1.0 - smoothstep(0.59 - aa, 0.59 + aa, y));\n  float jupe = 1.0 - smoothstep(0.2 - aa, 0.2 + aa, y);\n  vec3 c = mix(base, uBandeA, b1 * on);\n  c = mix(c, uBandeB, b2 * on);\n  return mix(c, base * 0.42, jupe * on);\n}\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n  vec3 pL = vPMonde - uOrigine;\n'
        + '  vec3 anP = abs(vNMonde);\n  vec2 qp = anP.y > max(anP.x, anP.z) ? pL.xz : (anP.z > anP.x ? pL.xy : pL.zy);\n'
        + '  vec2 gP = qp / vec2(1.19, 2.25), fP = fract(gP), cP = floor(gP);\n'
        + '  float bordP = 1.0 - 2.0 * min(min(fP.x, 1.0 - fP.x), min(fP.y, 1.0 - fP.y));\n'
        + '  float aleaP = fract(sin(dot(cP, vec2(12.9898, 78.233))) * 43758.5453);\n'
        + '  float joint = pow(abs(cos(pL.x * 10.47)), 8.0), profil = pow(bordP, 1.6);\n'
        + '  float vacille = 0.86 + 0.14 * sin(uTemps * 37.0 + pL.x * 3.1 + pL.y * 1.7);\n'
        + '  float chaud = uIncand * (0.22 + 0.6 * profil + 0.25 * joint) * (0.7 + 0.55 * aleaP) + uSurchauffe * (0.1 + 0.4 * pow(bordP, 3.0) + 0.3 * joint) * (0.75 + 0.4 * aleaP) * vacille;\n'
        + '  vec3 peint = livree(uPeint, uLiv, pL.y / uHaut);\n  peint = mix(peint, vec3(0.012, 0.012, 0.016), uFormulesOn);\n'
        // le métal chauffé ne montre plus sa peinture : elle réapparaît en refroidissant (aucun mélange rose peinture + braise)
        + '  diffuseColor.rgb *= peint * uFacteur * (1.0 - 0.9 * smoothstep(0.04, 0.5, max(chaud, uIncand * 0.75)));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'
          // INCANDESCENCE PAR PANNEAU (boucle 2) : la caisse est découpée en panneaux de ~1,2 × 2,25 m (les tôles verticales d'un vrai conteneur) (coordonnées choisies selon la face) ;
          // chaque panneau chauffe en DÉGRADÉ depuis ses soudures (bords, rainures) vers son centre, avec sa propre intensité, et la
          // couleur suit le corps noir rouge sombre → orange → jaune → blanc. Plus aucun mélange avec la peinture (fini le rose).
          + '  vec3 braise = vec3(0.55, 0.03, 0.0) * smoothstep(0.04, 0.28, chaud);\n'
          + '  braise = mix(braise, vec3(2.0, 0.5, 0.05), smoothstep(0.28, 0.55, chaud));\n'
          + '  braise = mix(braise, vec3(2.6, 1.6, 0.5), smoothstep(0.55, 0.82, chaud));\n'
          + '  braise = mix(braise, vec3(3.0, 2.85, 2.6), smoothstep(0.82, 1.1, chaud));\n'
          + '  totalEmissiveRadiance += braise * uFacteur;\n'
          + '  totalEmissiveRadiance += uLueur * uPeint * uFacteur;\n'
          + (texForm ? '  if (uFormulesOn > 0.001 && uFacteur > 0.9) {\n    vec2 qf = qp / vec2(8.0, 4.0) + vec2(0.13, 0.07);\n    vec3 fo = texture2D(uFormules, qf).rgb;\n'
            // halo : quatre échantillons écartés (la craie lumineuse « bave » dans le noir)
            + '    vec3 ha = (texture2D(uFormules, qf + vec2(0.006, 0.0)).rgb + texture2D(uFormules, qf - vec2(0.006, 0.0)).rgb + texture2D(uFormules, qf + vec2(0.0, 0.012)).rgb + texture2D(uFormules, qf - vec2(0.0, 0.012)).rgb) * 0.25;\n'
            // (montants, cales, cônes et coffre — matériau « cadre », uFacteur 0,62 — restent noirs : pas de fragments de formules aux coins)
            + '    totalEmissiveRadiance += (fo * 2.3 + ha * vec3(0.55, 0.7, 1.0) * 1.4) * uFormulesOn * (0.9 + 0.12 * sin(uTemps * 2.1 + qf.x * 6.0));\n  }\n' : ''));
    };
    m.customProgramCacheKey = () => 'peinture-conteneur' + (texForm ? '-formules' : '');
    return m;
  };
  const tole = garde(texTole('#d2d4d8', hasard));                                  // neutre : la couleur vient de la peinture
  const matTole = garde(peindre(new THREE.MeshStandardMaterial({ map: tole, roughness: PEINTURES[0].rough, metalness: PEINTURES[0].metal, bumpMap: tole, bumpScale: 0.06 })));
  const matCadre = garde(peindre(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 }), 0.62));   // montants et coffre : même teinte, plus sombre
  const peinture = { vers: 0, t0: -1, surchauffe: 0, cible: 0, tPrec: 0 };
  /** Changement de peinture INSTANTANÉ, caché sous l'impact : la tôle part du blanc chaud (uIncand = 1). */
  const impactPeinture = (i, t) => {
    const b = PEINTURES[i];
    uPeinture.uPeint.value.copy(b.col); uPeinture.uLiv.value = b.livree ? 1 : 0; uPeinture.uFormulesOn.value = b.formules ? 1 : 0;
    for (const m of [matTole, matCadre, matFace]) { m.roughness = b.rough; m.metalness = b.metal; }
    peinture.vers = i; peinture.t0 = t;
  };
  /** Incandescence (1 → 0 en INCANDESCENCE s, retombée en loi de puissance) et surchauffe du climax (lissée, refroidit après le scellé). */
  const majPeinture = (t) => {
    uPeinture.uOrigine.value.copy(fret.position); uPeinture.uHaut.value = H; uPeinture.uTemps.value = t;
    const d = peinture.t0 < 0 ? 9 : t - peinture.t0;
    uPeinture.uIncand.value = d >= 0 && d < INCANDESCENCE ? (peinture.max ?? 1) * Math.pow(1 - d / INCANDESCENCE, 1.6) : 0;
    const dt2 = Math.max(0, Math.min(0.1, t - peinture.tPrec)); peinture.tPrec = t;
    if (t > D.ouvre + 0.25) peinture.cible = 0;                                  // après le scellé, la tôle refroidit
    peinture.surchauffe += (peinture.cible - peinture.surchauffe) * Math.min(1, dt2 / (peinture.cible > peinture.surchauffe ? 0.08 : 0.7));
    uPeinture.uSurchauffe.value = peinture.surchauffe;
  };
  const matInt = garde(new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.9, side: THREE.DoubleSide }));
  const boite = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(garde(new THREE.BoxGeometry(w, h, d)), m); b.position.set(x, y, z); fret.add(b); return b; };
  boite(L, dalle, P, matCadre, 0, dalle / 2, 0);                                     // dalle
  /* toit et flanc avant : d'un seul tenant, SAUF quand l'explosion titanesque est prévue (rang ≥ 3) — ils sont alors découpés en
     panneaux 4 × 2 (mêmes cotes) dont ceux de la moitié arrière sont ARRACHÉS au scellé (panneauxArraches) */
  const panneauxArrachables = [];
  if (rang >= 3) {
    const hF = H - dalle - ep;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const toit = boite(L / 4, ep, P / 2, matTole, -L / 2 + L / 8 + i * L / 4, H - ep / 2, (j - 0.5) * P / 2);
      const flanc = boite(L / 4, hF / 2, ep, matTole, -L / 2 + L / 8 + i * L / 4, dalle + hF / 4 + j * hF / 2, P / 2 - ep / 2);
      for (const [b, nj] of [[toit, 2], [flanc, 2]]) { const uv = b.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + i) / 4, (uv.getY(k) + j) / nj); }   // la tôle ondulée garde son pas
      // arrachés : le toit et la rangée haute du flanc avant côté porte (dans le cadrage serré du scellé), projetés vers le HAUT et
      // l'arrière : ils ne retombent ni devant l'objectif ni sur la trajectoire de sortie du bolide
      if ((i === 2) || (i === 1 && j === 1)) panneauxArrachables.push({ m: toit, n: new THREE.Vector3(-0.7, 1.3, (j - 0.5) * 1.2) });
      if (i >= 2 && j === 1) panneauxArrachables.push({ m: flanc, n: new THREE.Vector3(-0.55, 1.1, 0.55) });
    }
  } else {
    boite(L, ep, P, matTole, 0, H - ep / 2, 0);                                        // toit
    boite(L, H - dalle - ep, ep, matTole, 0, (H + dalle - ep) / 2, P / 2 - ep / 2);     // flanc avant (côté caméra)
  }
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
  const matLiseret = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(RV.couleur) }));
  for (const [lx, lz, px, pz] of [[L * 1.004, 0.035, 0, P / 2 + 0.012], [L * 1.004, 0.035, 0, -P / 2 - 0.012], [0.035, P * 1.004, L / 2 + 0.012, 0], [0.035, P * 1.004, -L / 2 - 0.012, 0]]) {
    const b = new THREE.Mesh(garde(new THREE.BoxGeometry(lx, 0.06, lz)), matLiseret); b.position.set(px, dalle - 0.03, pz); fret.add(b);
  }
  // coffre du rideau (linteau) : le rideau s'y enroule entièrement avant que le bolide ne bouge
  boite(0.42, H - yLinteau + 0.34, P - 0.2, matCadre, xO + 0.17, (yLinteau + H + 0.34) / 2, 0);
  // bordereau d'expédition : plaque d'aluminium rivetée DANS le panneau de toit (entre les montants, jamais au-dessus du linteau ni dans
  // le vide) ; à l'ouverture, ses douze éclats sautent vers l'arrière avec leurs rivets, puis disparaissent
  const texBord = garde(texBordereau(car, RV));                    // MODE DRAME : « CAT. LÉGENDAIRE » sur le bordereau (rien ne divulgâche)
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
    const souffleScelle = rang >= 3 ? 1.7 : 1;                         // explosion titanesque : les éclats partent bien plus loin
    eclats.push({ m, x0, z0, v: new THREE.Vector3(-1.2 - hasard() * 2.4, 2.4 + hasard() * 2.2, (j - 1) * 1.6 + (hasard() - 0.5)).multiplyScalar(souffleScelle), w: new THREE.Vector3(hasard() * 8 - 4, hasard() * 8 - 4, hasard() * 8 - 4).multiplyScalar(souffleScelle) });
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
  const interieur = new THREE.PointLight(new THREE.Color(RV.couleur).lerp(new THREE.Color(0xffffff), 0.6), 0, 18, 1.6); interieur.position.set(xO - 1.5, dalle + hO * 0.55, 0); fret.add(interieur);
  const faisceauMat = garde(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { force: { value: 0 }, teinte: { value: new THREE.Color(RV.couleur).lerp(new THREE.Color(0xffffff), 0.55) }, temps: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    // faisceau de l'ouverture : brume en volutes (bruit de valeur qui dérive), jamais un aplat additif uniforme
    fragmentShader: 'uniform float force; uniform vec3 teinte; uniform float temps; varying vec2 vUv; varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); } float vb(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); } void main(){ float n = 0.5 * vb(vP * 0.55 + vec3(temps * 0.4, 0.0, temps * 0.15)) + 0.25 * vb(vP * 1.2 - vec3(0.0, temps * 0.3, 0.0)) + 0.25; float a = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * n; gl_FragColor = vec4(teinte, a * force * 0.55); }',
  }));
  const faisceau = new THREE.Mesh(garde(new THREE.CylinderGeometry(1.7, 5.5, 16, 32, 1, true)), faisceauMat);
  faisceau.rotation.z = Math.PI / 2; faisceau.position.set(xO + 8, dalle + hO * 0.5, 0); faisceau.scale.set(1, 1, 0.7); scene.add(faisceau);
  const lueurOuverture = new THREE.Mesh(garde(new THREE.PlaneGeometry(3.9, hO)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(RV.couleur).lerp(new THREE.Color(0xffffff), 0.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
  lueurOuverture.rotation.y = Math.PI / 2; lueurOuverture.position.set(xO - 0.4, dalle + hO / 2, 0); fret.add(lueurOuverture);

  /* --- fuites de lumière (suspense) : fentes dans la tôle, liserés autour du rideau, flaque au sol ; couleur par paliers */
  const ECHELLE_RARETE = ['#cfe8ff', '#6f8dff', '#b44dff', '#ffbf2e', '#ff1f4b'];
  const couleurFuite = new THREE.Color(ECHELLE_RARETE[0]);
  const matFente = garde(new THREE.MeshBasicMaterial({ color: couleurFuite, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const texRai = garde(texCanvas(256, 64, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = l; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); }));
  const matRai = garde(new THREE.MeshBasicMaterial({ map: texRai, color: couleurFuite, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const fentes = [];
  for (let i = 0; i < 7; i++) {
    const x = -L / 2 + 1.1 + (i + hasard() * 0.6) * (L - 2.4) / 7, h = 0.4 + hasard() * 0.9, y = dalle + 0.5 + hasard() * Math.max(0.2, hO - 1.4);
    const f = new THREE.Mesh(garde(new THREE.PlaneGeometry(0.09, h)), matFente); f.position.set(x, y, P / 2 + 0.012); fret.add(f);
    const lg = 1.4 + hasard();
    const rai = new THREE.Mesh(garde(new THREE.PlaneGeometry(lg, h * 1.1)), matRai); rai.rotation.y = Math.PI / 2; rai.position.set(x, y, P / 2 + lg / 2); fret.add(rai);
    const rai2 = new THREE.Mesh(rai.geometry, matRai); rai2.rotation.set(Math.PI / 2, Math.PI / 2, 0); rai2.position.copy(rai.position); fret.add(rai2);
    fentes.push({ phase: hasard() * 6 });
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
  /* particules RECYCLÉES (V9c) : un sprite mort retourne à la réserve avec son matériau, qui est recopié (Material.copy) depuis le
     matériau de base à la ré-émission — même rendu qu'un clone neuf, sans allocation ni libération de matériau par particule (le
     dernier sprite libéré détruisait le programme GPU des sprites : recompilation à l'émission suivante, d'où des à-coups). */
  const reserve = [];
  const recycler = (sp) => { scene.remove(sp); reserve.push(sp); };
  const emettre = (n, f) => { for (let i = 0; i < n && parts.length < PLAFOND_PARTS; i++) { const p = f(i); let s = reserve.pop(); if (s) s.material.copy(p.mat); else { s = new THREE.Sprite(p.mat.clone()); garde(s.material); } s.position.copy(p.pos); s.scale.setScalar(p.taille); scene.add(s); parts.push({ s, ...p, age: 0, phase: hasard() * 6.28 }); } };
  const RAMPES = {
    feu: [[0, '#ffe7a8'], [0.07, '#ffb43a'], [0.25, '#ff6a10'], [0.5, '#b2240a'], [0.78, '#2e0e05'], [1, '#000000']].map(([k, c]) => [k, new THREE.Color(c)]),
    fumee: [[0, '#b07a4c'], [0.2, '#6e625a'], [0.6, '#4d4844'], [1, '#2c2a28']].map(([k, c]) => [k, new THREE.Color(c)]),
  };
  const rampe = (nom, k, out) => { const r = RAMPES[nom]; let i = 1; while (i < r.length - 1 && k > r[i][0]) i++; const a = r[i - 1], b = r[i]; out.copy(a[1]).lerp(b[1], Math.min(1, Math.max(0, (k - a[0]) / (b[0] - a[0] || 1)))); };
  const majParts = (dt) => {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age >= p.vie) { recycler(p.s); parts.splice(i, 1); continue; }
      p.vel.y += (p.g ?? 0) * dt; p.vel.multiplyScalar(1 - (p.frein ?? 0.4) * dt);
      p.s.position.addScaledVector(p.vel, dt);
      if (p.ondule) { p.s.position.x += Math.sin(p.age * 3 + p.phase) * p.ondule * dt; p.s.position.z += Math.cos(p.age * 2.3 + p.phase) * p.ondule * 0.6 * dt; }
      const k = p.age / p.vie;
      const dCam = p.s.position.distanceTo(camera.position), proche = dCam < 4.2 ? Math.max(0, (dCam - 1.2) / 3.0) : 1;          // les nuages collés à l'objectif s'effacent : jamais de voile blanc devant le sujet
      p.s.material.opacity = (p.op ?? 1) * (k < 0.15 ? (p.franc ? 1 : k / 0.15) : 1 - (k - 0.15) / 0.85) * proche;
      if (p.rampe) rampe(p.rampe, k, p.s.material.color);                // feu : blanc-jaune → orange → rouge → suie ; fumée : chaude → noire
      if (p.colonne && tCourant > D.sortie) p.age += dt * 1.5;          // la colonne se dissipe avant la pose : rien ne masque le bolide
      const sc = p.taille * (1 + (p.croit ?? 0) * k);
      if (p.pivote) p.s.scale.set(sc * Math.max(0.12, Math.abs(Math.cos(p.age * 7 + p.phase))), sc, 1); else p.s.scale.setScalar(sc);
      if (p.tourne) p.s.material.rotation += p.tourne * dt;
    }
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  /* jets de vapeur : fins panaches blancs crachés vers l'extérieur par les quatre montants d'angle (sifflement dans suspenseSonore) */
  const jetsVapeur = (n) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) emettre(Math.ceil(n / 4), () => ({
      mat: matPart('#e9eef5', texD, false), pos: V3(fret.position.x + sx * (L / 2 - 0.14), dalle + 0.6 + hasard() * (H - dalle - 1.2), fret.position.z + sz * (P / 2 - 0.05)),
      vel: V3(sx * (0.4 + hasard() * 0.8), 0.6 + hasard() * 0.9, sz * (3.2 + hasard() * 2.6)), taille: 0.22 + hasard() * 0.25, croit: 3.2,
      vie: 0.7 + hasard() * 0.5, op: 0.55, frein: 2.4, tourne: (hasard() - 0.5) * 2 }));
  };
  const fumee = (n, x, y, z, force = 1) => emettre(n, () => ({ mat: matPart('#3b4152', texD, false), pos: V3(x + hasard() * 0.4, y + hasard() * 1.6, z + (hasard() - 0.5) * 3), vel: V3((1.5 + hasard() * 3) * force, 0.3 + hasard() * 0.8, (hasard() - 0.5) * 1.5), taille: 1.6 + hasard() * 1.6, croit: 2.2, vie: 2.4 + hasard() * 1.6, op: 0.32, frein: 0.6, tourne: (hasard() - 0.5) }));

  /* ================================================================== MODE EXPLOSION
     Chaque détonation de D.detonations (chronologie.js : paliers, rafale du climax, explosion titanesque au scellé) déclenche, À
     L'IMAGE PRÈS et en même temps que le son (suspenseSonore reçoit la même liste) :
       · peinture instantanée cachée sous l'incandescence (impactPeinture), surchauffe cumulée au climax ;
       · ONDE DE CHOC : anneau lumineux + mur de souffle qui balaient le sol du hangar (3 ondes recyclées), anneau de réfraction en
         espace écran (post.u.onde), brume au sol creusée et poussières du faisceau chassées (uniform injecté dans les shaders du
         hangar), particules proches chassées radialement ;
       · FLASH STROBOSCOPIQUE saturé de la couleur du palier, 2 images (≤ 50 ms), dans la passe de post-traitement (Fret ET trailer) ;
       · PROJECTIONS : gerbes d'étincelles de soudure (traînées incandescentes qui rebondissent sur le béton), ARCS ÉLECTRIQUES
         (rubans brisés additifs qui crépitent), jets de vapeur crachés par les rainures et les joints ;
       · DÉCROCHAGE de caméra : impulsion sèche puis ressort amorti (pas de bruit uniforme) ;
       · éclair de lumière colorée (une PointLight SANS ombre, éteinte hors impact) ; rivets éjectés au climax (InstancedMesh).
     Étincelles et arcs : un seul maillage de rubans face caméra (1 appel de dessin, plafond ETINCELLES_MAX), hors PLAFOND_PARTS. */
  const STROBE_COULEURS = ['#bfe6ff', '#00e5ff', '#8f1cff', '#ffae00', '#ff0a2e'];   // acier électrique, cyan électrique, améthyste profond, or incandescent, rouge cramoisi
  const STROBE_SIGNATURE = { vocaloid: '#14f2ff', sncf: '#ff1446', epave: '#c2652a' };   // (épave : seulement hors MODE DRAME, qui ne frappe jamais l'écran de sa couleur)
  const couleurSignature = () => (HAWKING ? '#5f8dff' : STROBE_SIGNATURE[R.custom] || R.couleur);
  const couleurDetonation = (x) => {
    if (P_SIGNATURE > 0 && (x.type !== 'palier' || x.k === D.paliers.length - 1)) return couleurSignature();
    return STROBE_COULEURS[Math.max(0, Math.min(4, x.niveau | 0))];
  };
  const COL_TMP = new THREE.Color();
  /* --- rubans face caméra (étincelles et arcs) */
  const NSEG = 1800, rPos = new Float32Array(NSEG * 12), rCol = new Float32Array(NSEG * 12), rIdx = new Uint16Array(NSEG * 6);
  for (let i = 0; i < NSEG; i++) { const v = i * 4; rIdx[i * 6] = v; rIdx[i * 6 + 1] = v + 1; rIdx[i * 6 + 2] = v + 2; rIdx[i * 6 + 3] = v + 2; rIdx[i * 6 + 4] = v + 1; rIdx[i * 6 + 5] = v + 3; }
  const geoRuban = garde(new THREE.BufferGeometry());
  const attrPos = new THREE.BufferAttribute(rPos, 3), attrCol = new THREE.BufferAttribute(rCol, 3);
  attrPos.setUsage(THREE.DynamicDrawUsage); attrCol.setUsage(THREE.DynamicDrawUsage);
  geoRuban.setAttribute('position', attrPos); geoRuban.setAttribute('color', attrCol); geoRuban.setIndex(new THREE.BufferAttribute(rIdx, 1)); geoRuban.setDrawRange(0, 0);
  const rubans = new THREE.Mesh(geoRuban, garde(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false })));
  rubans.frustumCulled = false; rubans.renderOrder = 6; scene.add(rubans);
  let nSeg = 0;
  const _sv = V3(0, 0, 0), _dv = V3(0, 0, 0), _cv = V3(0, 0, 0), _qv = V3(0, 0, 0), _dv2 = V3(0, 0, 0);
  /** segment a → b de largeur `larg`, couleurs (r, g, b) aux deux bouts (additif : noir = invisible) */
  const segment = (a, b, larg, r0, g0, b0, r1 = r0, g1 = g0, b1 = b0) => {
    if (nSeg >= NSEG) return;
    _dv.subVectors(b, a); _cv.subVectors(camera.position, a); _sv.crossVectors(_dv, _cv);
    const l = _sv.length(); if (l < 1e-7) return;
    _sv.multiplyScalar(larg * Math.min(1, Math.max(0.28, _cv.length() / 12)) / 2 / l);   // largeur ~constante à l'écran : rien ne vire au pavé blanc devant l'objectif
    const o = nSeg * 12;
    rPos[o] = a.x + _sv.x; rPos[o + 1] = a.y + _sv.y; rPos[o + 2] = a.z + _sv.z; rPos[o + 3] = a.x - _sv.x; rPos[o + 4] = a.y - _sv.y; rPos[o + 5] = a.z - _sv.z;
    rPos[o + 6] = b.x + _sv.x; rPos[o + 7] = b.y + _sv.y; rPos[o + 8] = b.z + _sv.z; rPos[o + 9] = b.x - _sv.x; rPos[o + 10] = b.y - _sv.y; rPos[o + 11] = b.z - _sv.z;
    rCol[o] = rCol[o + 3] = r0; rCol[o + 1] = rCol[o + 4] = g0; rCol[o + 2] = rCol[o + 5] = b0;
    rCol[o + 6] = rCol[o + 9] = r1; rCol[o + 7] = rCol[o + 10] = g1; rCol[o + 8] = rCol[o + 11] = b1;
    nSeg++;
  };
  /** un point des joints du conteneur (arêtes des montants, rives du toit, rainures de la tôle, cadre du rideau) et sa normale sortante */
  const joint = () => {
    const u = hasard(), sz = hasard() < 0.72 ? 1 : -1, fx = fret.position.x, fy = fret.position.y, fz = fret.position.z;
    if (u < 0.28) { const sx = hasard() < 0.5 ? -1 : 1; return { p: V3(fx + sx * L / 2, fy + dalle + hasard() * (H - dalle), fz + sz * P / 2), n: V3(sx * 0.6, 0.15, sz).normalize() }; }
    if (u < 0.56) return { p: V3(fx + (hasard() - 0.5) * L, fy + H, fz + sz * P / 2), n: V3((hasard() - 0.5) * 0.4, 0.75, sz * 0.66).normalize() };
    if (u < 0.85) return { p: V3(fx + (Math.round((hasard() - 0.5) * L / 0.3) * 0.3), fy + dalle + 0.3 + hasard() * (H - dalle - 0.6), fz + sz * (P / 2 + 0.02)), n: V3((hasard() - 0.5) * 0.3, 0.2, sz).normalize() };
    return { p: V3(fx + xO + 0.17, fy + dalle + hasard() * (yLinteau - dalle), fz + (hasard() - 0.5) * (P - 0.4)), n: V3(1, 0.2, (hasard() - 0.5) * 0.6).normalize() };
  };
  /* --- gerbes d'étincelles de soudure */
  const ETINCELLES_MAX = 900, etincelles = [];
  const gerbe = (n, force) => {
    for (let i = 0; i < n && etincelles.length < ETINCELLES_MAX; i++) {
      const j = joint(), vit = 4 + hasard() * 8 * force;
      etincelles.push({ p: j.p, v: j.n.multiplyScalar(vit).add(V3((hasard() - 0.5) * 3, 1 + hasard() * 4.5, (hasard() - 0.5) * 3)), age: 0, vie: 0.6 + hasard() * 1.0 });
    }
  };
  /* --- arcs électriques : chemin brisé (déplacement du point milieu), régénéré à 30 Hz pour crépiter, ramification éventuelle */
  const ARC_MAX = 18, arcs = [];
  const brise = (a, b, niveaux, amp, out) => {
    const pts = [a.clone(), b.clone()];
    for (let k = 0, A = amp; k < niveaux; k++, A *= 0.55) {
      for (let i = pts.length - 1; i > 0; i--) { const m = pts[i - 1].clone().lerp(pts[i], 0.5); m.x += (hasard() - 0.5) * A; m.y += (hasard() - 0.5) * A; m.z += (hasard() - 0.5) * A; pts.splice(i, 0, m); }
    }
    out.length = 0; for (const q of pts) out.push(q); return out;
  };
  const lancerArc = (couleur, court = false) => {
    if (arcs.length >= ARC_MAX) arcs.shift();
    const j = joint(); let b;
    if (!court && hasard() < 0.5) b = V3(j.p.x + (hasard() - 0.5) * 3, 0.03, j.p.z + Math.sign(j.p.z - fret.position.z || 1) * (1.2 + hasard() * 2.6));   // décharge à la masse : au béton
    else { b = joint().p; if (b.distanceTo(j.p) > (court ? 1.8 : 6)) b.lerp(j.p, court ? 0.7 : 0.35); if (!court && b.distanceTo(j.p) < 1.5) b.add(V3(0, 1.2, 0)); }
    arcs.push({ a: j.p, b, age: 0, vie: (court ? 0.12 : 0.3) + hasard() * (court ? 0.14 : 0.32), coul: new THREE.Color(couleur), pts: [], br: [], regen: 0 });
  };
  /* --- ondes de choc (anneau au sol + mur de souffle), recyclées */
  const fragAnneau = 'uniform float r, larg, force, temps; uniform vec3 couleur; varying vec2 vUv; void main(){ vec2 q = vUv - 0.5; float d = length(q) * 2.0, an = atan(q.y, q.x);'
    + ' float rugueux = sin(an * 13.0 + temps * 7.0) * 0.5 + sin(an * 31.0 - temps * 11.0) * 0.3 + sin(an * 5.0 + temps * 3.0) * 0.4;'
    + ' float dd = (d - r + rugueux * 0.01) / larg; float anneau = exp(-dd * dd); float sillage = smoothstep(r, r * 0.45, d) * step(d, r) * 0.22 * (0.7 + 0.3 * rugueux);'
    + ' float a = (anneau + sillage) * force; gl_FragColor = vec4(couleur * a + vec3(1.0) * anneau * anneau * force * 0.45, 1.0); }';
  const fragMur = 'uniform float force, temps; uniform vec3 couleur; varying vec2 vUv; void main(){ float h = vUv.y; float stries = 0.65 + 0.35 * sin(vUv.x * 120.0 + temps * 25.0) * sin(vUv.x * 47.0 - temps * 9.0);'
    + ' float a = pow(1.0 - h, 2.4) * smoothstep(0.0, 0.06, h + 0.02) * stries * force; gl_FragColor = vec4(couleur * a * 0.8 + vec3(1.0) * a * a * 0.25, 1.0); }';
  const vertUv = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const geoAnneau = garde(new THREE.PlaneGeometry(1, 1)), geoMur = garde(new THREE.CylinderGeometry(1, 1, 1, 72, 1, true)); geoMur.translate(0, 0.5, 0);
  const ONDES = [0, 1, 2].map(() => {
    const mA = garde(new THREE.ShaderMaterial({ uniforms: { r: { value: 0.8 }, larg: { value: 0.03 }, force: { value: 0 }, temps: { value: 0 }, couleur: { value: new THREE.Color() } }, vertexShader: vertUv, fragmentShader: fragAnneau, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const mM = garde(new THREE.ShaderMaterial({ uniforms: { force: { value: 0 }, temps: { value: 0 }, couleur: { value: new THREE.Color() } }, vertexShader: vertUv, fragmentShader: fragMur, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const anneau = new THREE.Mesh(geoAnneau, mA); anneau.rotation.x = -Math.PI / 2; anneau.position.y = 0.04; anneau.renderOrder = 3; anneau.visible = false; scene.add(anneau);
    const mur = new THREE.Mesh(geoMur, mM); mur.renderOrder = 4; mur.visible = false; scene.add(mur);
    return { anneau, mur, t0: -9, force: 0, R: 0, actif: false };
  });
  let iOnde = 0, derniereOnde = null;
  /* brume au sol et poussières du faisceau du hangar : l'onde y creuse un trou qui se referme (uniform injecté avant compilation) */
  const uSouffle = { value: new THREE.Vector4(0, 0, 0, 0) };
  if (hangar) hangar.groupe.traverse((o) => {
    const m = o.material; if (!m || !m.isShaderMaterial || !m.uniforms) return;
    if (m.uniforms.froid && m.fragmentShader.includes('float a = n * bord')) {
      m.uniforms.uSouffle = uSouffle;
      m.fragmentShader = 'uniform vec4 uSouffle;\n' + m.fragmentShader.replace('float a = n * bord', 'float dS = length(vW.xz - uSouffle.xy); float trou = uSouffle.w * (1.0 - smoothstep(uSouffle.z - 3.5, uSouffle.z + 0.8, dS)); float crete = min(1.0, uSouffle.w) * exp(-pow((dS - uSouffle.z) / 1.4, 2.0)); n = n * (1.0 - min(0.92, trou)) + crete * 0.55; float a = n * bord');
    } else if (m.uniforms.echelle && m.vertexShader.includes('vec4 mv = modelViewMatrix * vec4(p, 1.0);')) {
      m.uniforms.uSouffle = uSouffle;
      m.vertexShader = 'uniform vec4 uSouffle;\n' + m.vertexShader.replace('vec4 mv = modelViewMatrix * vec4(p, 1.0);', 'vec2 dS = p.xz - uSouffle.xy; float lS = length(dS); p.xz += dS / max(lS, 0.05) * uSouffle.w * 3.2 * (1.0 - smoothstep(0.0, uSouffle.z + 2.0, lS)); p.y += uSouffle.w * 0.8 * exp(-lS * 0.2); vec4 mv = modelViewMatrix * vec4(p, 1.0);');
    }
  });
  const souffleParticules = (force) => {                              // la fumée et la poussière proches sont chassées radialement
    const cx = fret.position.x, cz = fret.position.z;
    for (const p of parts) { const dx = p.s.position.x - cx, dz = p.s.position.z - cz, d = Math.hypot(dx, dz); if (d > 20) continue; const k = force * 12 / (1 + 0.32 * d); p.vel.x += (dx / (d || 1)) * k; p.vel.z += (dz / (d || 1)) * k; p.vel.y += k * 0.12; }
  };
  const lancerOnde = (force, couleur, t) => {
    const o = ONDES[iOnde++ % ONDES.length]; o.t0 = t; o.force = force; o.actif = true;
    o.anneau.material.uniforms.couleur.value.set(couleur); o.mur.material.uniforms.couleur.value.set(couleur);
    derniereOnde = o; souffleParticules(force);
  };
  /* --- rivets éjectés (climax) : têtes d'acier chauffées au rouge, balistique, rebonds sur le béton */
  const N_RIVETS = 72;
  const matRivetEj = garde(new THREE.MeshStandardMaterial({ color: 0xb4bac2, metalness: 0.95, roughness: 0.25, emissive: new THREE.Color('#ff4a10'), emissiveIntensity: 0, envMap: env, envMapIntensity: 1.4 }));
  // profil de rivet à tête ronde (taille de lecture : tête Ø 24 cm à l'échelle du conteneur ×10), tige Ø 10 cm
  const geoRivetEj = garde(new THREE.LatheGeometry([[0, 0.12], [0.07, 0.115], [0.11, 0.08], [0.125, 0.035], [0.125, 0], [0.05, 0], [0.05, -0.2], [0, -0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 14));
  const rivetsEj = new THREE.InstancedMesh(geoRivetEj, matRivetEj, N_RIVETS);
  rivetsEj.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rivetsEj.frustumCulled = false; scene.add(rivetsEj);
  const MAT_VIDE = new THREE.Matrix4().makeScale(0, 0, 0), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qd = new THREE.Quaternion(), _e = new THREE.Euler(), UN = V3(1, 1, 1);
  const etatRivets = Array.from({ length: N_RIVETS }, (_, i) => { rivetsEj.setMatrixAt(i, MAT_VIDE); return { actif: false, p: V3(0, 0, 0), v: V3(0, 0, 0), q: new THREE.Quaternion(), w: V3(0, 0, 0) }; });
  let rivetSuivant = 0, tRivet = -9;
  const sauterRivets = (n, force, t) => {
    for (let k = 0; k < n && rivetSuivant < N_RIVETS; k++) {
      const r = etatRivets[rivetSuivant++], j = joint();
      r.p.copy(j.p); r.v.copy(j.n).multiplyScalar(4 + hasard() * 5 * force).add(V3((hasard() - 0.5) * 3, 4 + hasard() * 4.5, (hasard() - 0.5) * 3));   // belle parabole
      r.w.set((hasard() - 0.5) * 40, (hasard() - 0.5) * 40, (hasard() - 0.5) * 40); r.actif = true;
    }
    tRivet = t;
  };
  /* --- flash stroboscopique, éclair de lumière, décrochage de caméra (ressort amorti) */
  const strobe = { images: 0, t0: -9, couleur: new THREE.Color() };
  const frapperEcran = (couleur, t) => { strobe.images = STROBE.images; strobe.t0 = t; strobe.couleur.set(couleur); };
  const eclairImpact = new THREE.PointLight(0xffffff, 0, 36, 2); eclairImpact.position.set(0, H + 1.4, 2.2); scene.add(eclairImpact);
  let eclairT0 = -9, eclairForce = 0;
  const ressortCam = { x: 0, y: 0, z: 0, r: 0, vx: 0, vy: 0, vz: 0, vr: 0, w: 2 * Math.PI * 6.5, zeta: 0.17 };
  const decrocher = (force) => {                                       // impulsion SÈCHE (déplacement instantané à l'image de l'impact) + vitesse
    const a = 0.3 * force, s = hasard() < 0.5 ? -1 : 1;
    ressortCam.x += s * a * 0.5; ressortCam.y -= a; ressortCam.z += (hasard() - 0.5) * a * 0.4; ressortCam.r += s * 0.03 * force;
    ressortCam.vy -= a * 6; ressortCam.vx += s * a * 3; ressortCam.vr += s * 0.25 * force;
    ressortCam.w = 2 * Math.PI * (force > 1.3 ? 4.6 : 6.5); ressortCam.zeta = force > 1.3 ? 0.11 : 0.17;
  };
  const majRessort = (dt) => {                                         // x'' = −ω²x − 2ζωx' (Euler semi-implicite, pas de 2 ms : stable)
    const R2 = ressortCam, n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n, w2 = R2.w * R2.w, c = 2 * R2.zeta * R2.w;
    for (let k = 0; k < n; k++) {
      R2.vx += (-w2 * R2.x - c * R2.vx) * h; R2.x += R2.vx * h; R2.vy += (-w2 * R2.y - c * R2.vy) * h; R2.y += R2.vy * h;
      R2.vz += (-w2 * R2.z - c * R2.vz) * h; R2.z += R2.vz * h; R2.vr += (-w2 * R2.r - c * R2.vr) * h; R2.r += R2.vr * h;
    }
  };
  /* vapeur sous pression expulsée VIOLEMMENT par les rainures et les joints : des JETS francs (rubans blancs qui jaillissent dès
     l'image de l'impact) qui se déchirent en bouffées blanches opaques (sprites visibles dès leur naissance) */
  const JETS_MAX = 60, jets = [];
  const vapeurJoints = (n, force) => {
    for (let i = 0; i < Math.min(Math.round(n / 4), 10) && jets.length < JETS_MAX; i++) { const j = joint(); jets.push({ p: j.p, d: j.n, age: 0, vie: 0.25 + hasard() * 0.2, long: 1.0 + hasard() * 1.2 * Math.min(1.5, force) }); }
    emettre(n, () => {
      const j = joint();
      return { mat: matPart('#ffffff', texD, false), pos: j.p.addScaledVector(j.n, 0.3), vel: j.n.multiplyScalar(10 + hasard() * 12 * force).add(V3((hasard() - 0.5) * 1.5, hasard() * 1.5, (hasard() - 0.5) * 1.5)),
        taille: 0.3 + hasard() * 0.3, croit: 3.6, vie: 0.9 + hasard() * 0.8, op: 0.62, frein: 3.4, tourne: (hasard() - 0.5) * 2, franc: true };
    });
  };
  /** H01 : fin des paliers — caisse intégralement noire couverte de formules (la peinture « formules » est posée par impactPeinture) */
  const finaleHawking = () => {
    marquage.visible = false; matLiseret.color.set('#ffffff');
    const noirMat = garde(new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.6, metalness: 0.3 }));
    for (const c of hangar ? hangar.coinsISO : []) c.traverse((o) => { if (o.isMesh) o.material = noirMat; });      // coins ISO : noir mat (plus de triangles de formules)
  };
  /* --- EXPLOSION TITANESQUE (scellé, rang ≥ 3) : BOULE DE FEU (sprites additifs qui montent et refroidissent blanc → orange → rouge →
     suie), COLONNE DE FUMÉE (sprites sombres émis 2,2 s au-dessus des brèches, dissipés avant la pose du bolide), PANNEAUX DE TÔLE
     ARRACHÉS (moitié arrière du toit et du flanc avant : balistique, rotation, rebonds, incandescence en dégradé qui refroidit). */
  const texChaleur = garde(texCanvas(128, 128, (g, w, h) => {          // carte de chaleur d'un panneau arraché : bord déchiré (gauche) brûlant
    const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, '#fff'); l.addColorStop(0.35, '#999'); l.addColorStop(1, '#151515'); g.fillStyle = l; g.fillRect(0, 0, w, h);
    const r = g.createRadialGradient(w * 0.15, h * 0.5, 2, w * 0.15, h * 0.5, w * 0.6); r.addColorStop(0, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.2 + hasard() * 0.4})`; g.lineWidth = 1 + hasard() * 2; g.beginPath(); let x = hasard() * w * 0.5, y = hasard() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += hasard() * 14; y += (hasard() - 0.5) * 14; g.lineTo(x, y); } g.stroke(); }
  }));
  texChaleur.encoding = THREE.LinearEncoding;
  const uChaleurs = [];
  const matArrache = (k) => {                                         // un matériau par panneau (sa propre chaleur), même programme pour tous
    const u = { value: 0 }; uChaleurs.push(u);
    const m = garde(new THREE.MeshStandardMaterial({ map: tole, color: 0xffffff, roughness: 0.5, metalness: 0.55, emissiveMap: texChaleur, emissive: 0xffffff, side: THREE.DoubleSide }));
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uChaleur = u;
      sh.fragmentShader = 'uniform float uChaleur;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '  float hT = texture2D(emissiveMap, vUv).r * uChaleur;\n'
        + '  vec3 bb = vec3(0.6, 0.03, 0.0) * smoothstep(0.05, 0.3, hT);\n  bb = mix(bb, vec3(2.2, 0.55, 0.05), smoothstep(0.3, 0.6, hT));\n'
        + '  bb = mix(bb, vec3(2.7, 1.7, 0.55), smoothstep(0.6, 0.85, hT));\n  bb = mix(bb, vec3(3.0, 2.85, 2.6), smoothstep(0.85, 1.1, hT));\n  totalEmissiveRadiance = bb;');
    };
    m.customProgramCacheKey = () => 'tole-arrachee';
    void k; return m;
  };
  const matsArraches = panneauxArrachables.map((_, k) => matArrache(k));
  if (matsArraches.length) { const temoin = new THREE.Mesh(garde(new THREE.PlaneGeometry(0.01, 0.01)), matsArraches[0]); temoin.position.set(0, dalle + 0.05, 0); fret.add(temoin); }   // compilé avant le top départ
  const arraches = [];
  let titanT = -9, fumeeAcc = 0;
  const explosionTitanesque = (t) => {
    titanT = t;
    const fx = fret.position.x;
    // boule de feu : deux couronnes (cœur dense, puis bouffées qui montent)
    emettre(110, (i) => {
      const a = hasard() * Math.PI * 2, r = hasard(), sur = i < 60;
      const pos = V3(fx + L * 0.12 + (hasard() - 0.5) * L * 0.5, H + (sur ? hasard() * 0.6 : -hasard() * 1.2), (hasard() - 0.3) * P * 0.8);
      return { mat: matPart('#ffffff', texD, true), pos, vel: V3(Math.cos(a) * (2 + 6 * r) + 0.5, (sur ? 4 : 1.5) + hasard() * 6, Math.sin(a) * (2 + 6 * r) + 1), taille: 1.8 + hasard() * 2.2, croit: 2.0,
        vie: 0.8 + hasard() * 0.9, op: 0.26, frein: 2.4, g: 3.5, rampe: 'feu', tourne: (hasard() - 0.5) * 1.5 };
    });
    // panneaux arrachés : ils partent avec leurs rivets
    panneauxArrachables.forEach((pa, k) => {
      const m = pa.m; m.updateMatrixWorld(); const w = V3(0, 0, 0); m.getWorldPosition(w);
      fret.remove(m); scene.add(m); m.position.copy(w); m.material = matsArraches[k]; m.castShadow = true;
      uChaleurs[k].value = 1.15;
      arraches.push({ m, v: pa.n.clone().normalize().multiplyScalar(6 + hasard() * 7).add(V3((hasard() - 0.5) * 2, 3 + hasard() * 4, (hasard() - 0.5) * 2)),
        w: V3((hasard() - 0.5) * 9, (hasard() - 0.5) * 9, (hasard() - 0.5) * 9), u: uChaleurs[k], pose: false });
      for (let r = 0; r < 4 && rivetSuivant < N_RIVETS; r++) { const rv = etatRivets[rivetSuivant++]; rv.p.copy(w).add(V3((hasard() - 0.5) * 2, 0, (hasard() - 0.5) * 1.5)); rv.v.copy(pa.n).multiplyScalar(5 + hasard() * 5).add(V3(0, 4 + hasard() * 3, 0)); rv.w.set(30, -20, 25); rv.actif = true; }
    });
    // ce qui était posé sur les panneaux arrachés disparaît avec eux (marquage, fentes lumineuses de la moitié arrière)
    if (panneauxArrachables.length) { marquage.visible = false; fret.children.forEach((o) => { if ((o.material === matFente || o.material === matRai) && o.position.x < 0.2 && o.position.y > dalle + (H - dalle) * 0.45) o.visible = false; }); }
  };
  const xBreche = L * 0.12;                                          // les brèches : moitié porte du toit
  const majTitan = (t, dt) => {
    if (titanT < 0) return;
    const d = t - titanT;
    if (d < 3.0 && t < D.sortie - 0.6) {                               // colonne de fumée : émise au-dessus des brèches, monte en tournant
      fumeeAcc += dt * 34; const n = Math.floor(fumeeAcc); fumeeAcc -= n;
      if (n) emettre(n, () => ({ mat: matPart('#ffffff', texD, false), pos: V3(fret.position.x + xBreche + (hasard() - 0.5) * L * 0.4, H + 0.3 + hasard() * 0.5, (hasard() - 0.5) * P * 0.6),
        vel: V3(-0.4 + (hasard() - 0.5) * 1.2, 1.3 + hasard() * 1.2, (hasard() - 0.5) * 1.2), taille: 1.6 + hasard() * 1.4, croit: 3.4,
        vie: Math.max(0.8, Math.min(4.2, D.sortie + 0.4 - t)), op: 0.75, frein: 0.45, g: 0.12, rampe: 'fumee', colonne: true, ondule: 0.6, tourne: (hasard() - 0.5) * 0.6 }));
    }
    for (const a of arraches) {
      a.u.value = Math.max(0, 1.15 * Math.exp(-d / 1.3));               // la tôle refroidit : blanc → orange → rouge sombre → noir
      if (a.pose) continue;
      a.v.y -= 9.81 * dt; a.m.position.addScaledVector(a.v, dt);
      a.m.rotation.x += a.w.x * dt; a.m.rotation.y += a.w.y * dt; a.m.rotation.z += a.w.z * dt;
      if (a.m.position.y < 0.08 && a.v.y < 0) {
        a.m.position.y = 0.08; a.v.y *= -0.28; a.v.x *= 0.5; a.v.z *= 0.5; a.w.multiplyScalar(0.4);
        if (Math.abs(a.v.y) < 0.6) { a.pose = true; a.m.rotation.x = Math.round(a.m.rotation.x / Math.PI) * Math.PI; a.m.rotation.z = Math.round(a.m.rotation.z / Math.PI) * Math.PI; }
        gerbe(6, 0.4);
      }
      if (!a.pose && hasard() < 0.6) { a.m.getWorldPosition(_qv); etincelles.length < ETINCELLES_MAX && etincelles.push({ p: _qv.clone(), v: V3((hasard() - 0.5) * 2, hasard() * 2, (hasard() - 0.5) * 2), age: 0, vie: 0.4 + hasard() * 0.4 }); }
    }
  };
  /** UNE DÉTONATION (palier, climax, titan, scellé) — tout part sur la même image */
  const nClimax = D.detonations.filter((y) => y.type === 'climax').length;
  const exploser = (x, t) => {
    const coul = couleurDetonation(x), titanesque = x.type === 'titan';
    // force VISUELLE : la rafale du climax monte d'un cran à chaque détonation (0,6 → 1,5) jusqu'au titan (2,0)
    const f = titanesque ? 2.0 : x.type === 'climax' ? 0.6 + 0.9 * x.k / Math.max(1, nClimax - 1) : x.force;
    frapperEcran(coul, t);
    lancerOnde(Math.min(1.8, f), coul, t);
    decrocher(Math.min(1.8, f));
    eclairImpact.color.set(coul); eclairT0 = t; eclairForce = Math.min(1.8, f);
    gerbe(titanesque ? 420 : Math.round(70 + 110 * f * f), f);
    for (let i = 0, n = titanesque ? 16 : Math.round(3 + 4 * f); i < n; i++) lancerArc(coul);
    vapeurJoints(titanesque ? 28 : Math.round(16 + 22 * Math.min(1.5, f)), Math.min(1.5, f));   // titan : la boule de feu domine, la vapeur ne fait pas un voile blanc
    if (titanesque) explosionTitanesque(t);
    coupZoom = Math.max(coupZoom, 2.5 + 3.2 * Math.min(1.8, f)); choc = Math.max(choc, CHOC * Math.min(1.5, f)); fuiteImpulsion = 1;
    peinture.t0 = t; peinture.max = titanesque ? 0.6 : 1; uPeinture.uIncand.value = peinture.max;   // chauffée à blanc DÈS l'image de l'impact (titan : la boule de feu prend le relais du blanc)
    if (x.type === 'palier') {
      etat.palier = x.k;
      const dernierCran = x.k === D.paliers.length - 1, signature = dernierCran && P_SIGNATURE > 0;   // rareté signature : le dernier cran révèle sa peinture unique
      couleurFuite.set(signature ? (HAWKING ? '#cfe0ff' : R.couleur) : ECHELLE_RARETE[Math.min(x.k, rang)]);
      impactPeinture(signature ? P_SIGNATURE : 1 + Math.min(x.k, rang), t);   // la caisse entière change de peinture, sous l'impact
      if (signature && HAWKING) finaleHawking();
      jetsVapeur(10 + 4 * rang);                                         // vapeur sous pression : les montants crachent
    } else if (x.type === 'climax' || titanesque) {
      peinture.cible = x.surchauffe;                                     // la tôle surchauffe, détonation après détonation
      sauterRivets(titanesque ? 40 : 4 + Math.round(8 * f), Math.min(1.8, f), t);
    }
  };
  /** une image : étincelles, arcs, ondes, rivets, éclair, ressort → rubans */
  const majExplosion = (t, dt) => {
    nSeg = 0;
    for (let i = etincelles.length - 1; i >= 0; i--) {
      const e = etincelles[i]; e.age += dt;
      if (e.age >= e.vie) { etincelles.splice(i, 1); continue; }
      e.v.y -= 9.81 * dt; e.v.multiplyScalar(1 - 0.35 * dt); e.p.addScaledVector(e.v, dt);
      if (e.p.y < 0.02 && e.v.y < 0) { e.p.y = 0.02; e.v.y *= -0.3; e.v.x *= 0.55; e.v.z *= 0.55; }
      const k = 1 - e.age / e.vie, chaleur = Math.pow(k, 0.7);                // blanc-jaune → orange → rouge sombre en refroidissant
      _qv.copy(e.p).addScaledVector(e.v, -Math.min(0.07, 0.028 + 0.045 * k));          // traînée de flou de bouger : lisible même au Rare
      const ech = Math.min(1, Math.max(0.3, e.p.distanceTo(camera.position) / 12)); _qv.lerp(e.p, 1 - ech);   // traînée raccourcie près de l'objectif
      segment(_qv, e.p, 0.05 + 0.035 * k, 2.2 * chaleur, (0.5 + 1.5 * chaleur * chaleur) * chaleur, 0.9 * Math.pow(chaleur, 4), 0.5 * chaleur, 0.12 * chaleur, 0);
    }
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i]; a.age += dt;
      if (a.age >= a.vie) { arcs.splice(i, 1); continue; }
      a.regen -= dt;
      if (a.regen <= 0 || !a.pts.length) {
        a.regen = 1 / 20; brise(a.a, a.b, 4, a.a.distanceTo(a.b) * 0.32, a.pts);
        if (hasard() < 0.6) { const m = a.pts[2 + Math.floor(hasard() * (a.pts.length - 4))]; brise(m, m.clone().add(V3((hasard() - 0.5) * 1.2, (hasard() - 0.5) * 1.0, (hasard() - 0.5) * 1.2)), 3, 0.35, a.br); } else a.br.length = 0;
      }
      const k = (0.6 + 0.4 * hasard()) * Math.sqrt(1 - a.age / a.vie), c = a.coul;
      for (const pts of [a.pts, a.br]) for (let j = 1; j < pts.length; j++) {
        segment(pts[j - 1], pts[j], pts === a.br ? 0.16 : 0.38, c.r * 0.35 * k, c.g * 0.35 * k, c.b * 0.35 * k);              // halo large
        segment(pts[j - 1], pts[j], pts === a.br ? 0.07 : 0.15, c.r * 0.7 * k, c.g * 0.7 * k, c.b * 0.7 * k);                // halo coloré
        segment(pts[j - 1], pts[j], pts === a.br ? 0.03 : 0.065, (1.6 + c.r * 0.4) * k, (1.6 + c.g * 0.4) * k, (1.65 + c.b * 0.4) * k);   // cœur blanc
      }
    }
    for (let i = jets.length - 1; i >= 0; i--) {                       // jets de vapeur : rubans blancs qui jaillissent puis s'effilochent
      const jt = jets[i]; jt.age += dt; if (jt.age >= jt.vie) { jets.splice(i, 1); continue; }
      const k = jt.age / jt.vie, lg = jt.long * Math.min(1, jt.age / 0.05 + 0.35), a0 = 0.5 * (1 - k * k);
      _qv.copy(jt.p).addScaledVector(jt.d, lg * (0.15 + 0.5 * k));
      _dv2.copy(jt.p).addScaledVector(jt.d, lg);
      segment(jt.p, _qv, 0.05 + 0.08 * k, a0, a0, a0 * 1.04, a0 * 0.7, a0 * 0.7, a0 * 0.75);
      segment(_qv, _dv2, 0.12 + 0.3 * k, a0 * 0.7, a0 * 0.7, a0 * 0.75, 0, 0, 0);
    }
    for (const o of ONDES) {
      if (!o.actif) continue;
      const tau = t - o.t0; if (tau > 1.3 || tau < 0) { o.actif = false; o.anneau.visible = o.mur.visible = false; continue; }
      const fin = Math.pow(1 - tau / 1.3, 1.5), Rw = 4.6 + (7 + 15 * Math.min(1.8, o.force)) * (1 - Math.exp(-tau / 0.3));
      o.R = Rw; o.anneau.visible = o.mur.visible = true;
      o.anneau.position.set(fret.position.x, 0.04, fret.position.z); o.anneau.scale.set(Rw * 2 / 0.8, Rw * 2 / 0.8, 1);
      const uA = o.anneau.material.uniforms; uA.r.value = 0.8; uA.larg.value = 0.025 + 0.05 * tau; uA.force.value = Math.min(1.6, o.force) * fin * 1.4; uA.temps.value = t;
      o.mur.position.set(fret.position.x, 0, fret.position.z); o.mur.scale.set(Rw * 0.985, (0.5 + 1.5 * Math.min(1.8, o.force)) * (1 - 0.6 * tau), Rw * 0.985);
      const uM = o.mur.material.uniforms; uM.force.value = Math.min(1.4, o.force) * fin * 0.75; uM.temps.value = t;
    }
    if (derniereOnde) { const tau = t - derniereOnde.t0; uSouffle.value.set(fret.position.x, fret.position.z, derniereOnde.R, tau < 4 ? Math.min(1.4, derniereOnde.force) * Math.exp(-tau / 1.4) : 0); }
    let enVol = false;
    for (let i = 0; i < N_RIVETS; i++) {
      const r = etatRivets[i]; if (!r.actif) continue;
      if (r.v.lengthSq() > 0) {
        enVol = true; r.v.y -= 9.81 * dt; r.p.addScaledVector(r.v, dt);
        _qv.copy(r.p).addScaledVector(r.v, -0.06); segment(_qv, r.p, 0.05, 0.5, 0.2, 0.06, 0, 0, 0);          // fine traînée : la trajectoire balistique se lit
        if (r.p.y < 0.04 && r.v.y < 0) { r.p.y = 0.04; r.v.y *= -0.38; r.v.x *= 0.62; r.v.z *= 0.62; r.w.multiplyScalar(0.55); if (r.v.lengthSq() < 0.15) { r.v.set(0, 0, 0); r.w.set(0, 0, 0); } }
        _qd.setFromEuler(_e.set(r.w.x * dt, r.w.y * dt, r.w.z * dt)); r.q.multiply(_qd);
      }
      rivetsEj.setMatrixAt(i, _m4.compose(r.p, r.q, UN));
    }
    if (enVol || rivetSuivant) rivetsEj.instanceMatrix.needsUpdate = true;
    majTitan(t, dt);
    attrPos.needsUpdate = true; attrCol.needsUpdate = true; attrPos.updateRange.count = attrCol.updateRange.count = nSeg * 12; geoRuban.setDrawRange(0, nSeg * 6);
    matRivetEj.emissiveIntensity = 1.2 * Math.exp(-Math.max(0, t - tRivet) / 0.6);    // rouge cerise qui s'éteint vite : l'acier redevient lisible
    const dE = t - eclairT0;
    eclairImpact.intensity = (dE >= 0 && dE < 0.6 ? 5 * Math.min(1, eclairForce) * Math.exp(-dE / 0.05) : 0) + 1.6 * peinture.surchauffe * (t < D.trappe ? 1 : 0);
    if (peinture.surchauffe > 0.05 && dE > 0.1) eclairImpact.color.lerp(COL_TMP.set('#ff7a2a'), Math.min(1, dt * 4));
    // surcharge du climax : petits arcs qui rampent sur la tôle, gouttes de métal en fusion
    if (peinture.surchauffe > 0.2 && t < D.ouvre + (DRAME ? 0 : 0.4) && t >= D.arrivee) {
      if (hasard() < 0.2 * peinture.surchauffe) lancerArc(couleurSignatureOuPalier(), true);
      if (hasard() < 0.5 * peinture.surchauffe) gerbe(1, 0.4);
    }
  };
  const couleurSignatureOuPalier = () => (P_SIGNATURE > 0 ? couleurSignature() : STROBE_COULEURS[rang]);

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
    lisV = new THREE.PointLight(new THREE.Color(RV.lueur), 1.4, 16); lisV.position.set(0, 3, -3); voiture.add(lisV);
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
  const teinteFond = new THREE.Color(RV.couleur).lerp(COL_BLANC, 0.55);
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
    for (let x = 0; x <= paramsRoulage.duree; x += 1 / 120) { if (essai.pas(DR && !CRASH ? tempsSortieDrame(x, DR).t : x, 1 / 120).evenements.includes('seuil-av')) { tSeuil = D.sortie + x; break; } }
  }
  if (CRASH) tSeuil = DR.seuil;                                       // crash : le « seuil » est le conteneur grand ouvert sur… rien
  D.bascule = tSeuil;
  if (pasFixe) window.__fretD = { ...D };
  if (pasFixe) window.__fretDbg = { explosion: { strobe, ONDES, etincelles, arcs, uPeinture, ressortCam, uSouffle }, fondGlow, interieur, faisceau, lueurOuverture, scene, spotsPh, conesPh, flaresPh, striesPh, rasant, post, cle, contre, camera };                    // repères pour les captures de contrôle

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
  const etat = { det: -1, coeur: -1, noirS: 0, sortie: false, pose: false, titre: false, stats: false, palier: -1, seuil: false, jolt: -1, planId: null, pschitt: false, ph1: false, ph2: false, rugit: false };
  let debut = performance.now();                       // recalé au vrai top départ (après la préchauffe GPU et la préparation du son)
  let fini = false, raf = 0, dernier = debut, tickN = 0, tCourant = 0, demande = false;
  const camDepart = V3(-5, 8, 22), camFret = V3(16.5, 5.6 + (H - 4.16) * 0.6, 9.5 + (H - 4.16));
  const camFinal = modele ? V3(xArrivee + 4.0, 4.3, 19.5) : V3(xArrivee - 1.2, 3.4, 15.5);
  const cibleFinal = modele ? V3(xArrivee - 3.4, 1.3, 0) : V3(xArrivee - 3.4, 2.0, 0);
  const CAD = trailer ? cadrageDe(car.code) : null;               // V6 : angle de vue propre au personnage (ambiances_v6.js)
  if (CAD && CAD.travelling) { camFinal.y = CAD.travelling.y; cibleFinal.y = CAD.travelling.cibleY; }
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
  let musique = null, musiqueSource = null, musiqueGain = null, stopTheme = null, stopSuspense = null, stopAmbiance = null, busFond = null, stopDrame = null, stopClacs = null;
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
    if (prepSon && !CRASH) stopMoteur = jouerMoteur(S, prepSon, S.ac.currentTime + 0.02 + prepSon.debut, busFond.fond, salle);   // une seule prise moteur, calée sur la chronologie
    stopAmbiance = ambianceSonore(S, { cle: decor ? decor.cle : cleA, code: car.code, arrivee: D.arrivee, ouvre: D.ouvre, bascule: D.bascule, vers: busFond.fond, ...(DR ? { ...(CRASH ? {} : { coupure: DR.extinctions[DR.extinctions.length - 1] }), aleaBruit: aleaSon } : {}) });
    if (busFond.silence) busFond.silence(D.silence, D.ouvre - D.silence);     // silence de mort : moteur étouffé, ambiance et basse coupés net
    stopSuspense = suspenseSonore(S, { vers: busFond.fond, arrivee: D.arrivee, paliers: D.paliers, ouvre: D.ouvre, battements: D.battements, silence: D.silence, trappeDebut: D.trappeDebut, trappe: D.trappe, rang, jolts: D.jolts, plans: D.plans, foley: prepSon ? prepSon.foley : null, salle, detonations: D.detonations, ...(DR ? { drame: DR, alea: aleaSon } : {}) });
    // MODE DRAME : la chute (pétard, arrêt de bande, grillon, trombone triste au moment prévu, rideau coincé, enjoliveur) remplace le
    // jingle d'entrée ; la musique réelle du bolide démarre quand il sort (APRÈS la chute), pas au seuil
    if (DR) stopDrame = drameSonore(S, { DR, vers: busFond.fond, foley: prepSon ? prepSon.foley : null, foleyDrame: prepSon ? prepSon.foleyDrame : null, salle, tSeuil, alea: aleaSon });
    if (CRASH && DR.clacs && modele && modele.drame && typeof modele.drame.deploiement === 'function') stopClacs = clacsCharnieres(S, DR.clacs, busFond.fond);   // ailes : clac-clac
    const dj = DR ? 0 : jingleEntree(SIG.jingle, S, tSeuil, busFond.fond);
    let dCri = 0;
    if (cri) dCri = jouerCri(S, cri, tSeuil, busFond); else annulerParole = parlerNom(car, tSeuil);   // pile au franchissement du seuil
    const debutMusique = DR ? D.sortie : tSeuil + Math.max(dj * 0.8, dCri * 0.92);        // la musique attend la fin du cri
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
  if (enregistrer) ({ rec, recDessin, recFin } = preparerEnregistrement(cv, el, car, ov, cvDrame));

  const typeur = el.querySelector('.fret-cit span');
  const cit = String(car.citation || '');

  // ---------- mise en scène : flash, éclair, secousses, lueur de suspense, filtre de signature, arrêt sur image
  let fige = false, flashV = 0, eclairV = 0, secousse = 0, choc = 0, sigPunch = 0, fuiteImpulsion = 0, tLent = 0, coupZoom = 0;
  const AMPL = [0.012, 0.022, 0.035, 0.055, 0.075][rang], CHOC = [0.05, 0.08, 0.12, 0.18, 0.26][rang];
  const battements = [];
  for (let x = D.arrivee + 0.4, p = 0.62; x < D.ouvre - 0.15; x += p, p = Math.max(0.28, p * 0.9)) battements.push(x);
  const pouls = (t) => { let d = 9; for (const b of battements) if (b <= t) d = t - b; return Math.exp(-d * 9); };
  const _ondeEcran = V3(0, 0, 0);
  const majPost = (t, dt) => {
    const u = post.u;
    flashV = Math.max(0, flashV - dt * 3.2); eclairV = Math.max(0, eclairV - dt); fuiteImpulsion = Math.max(0, fuiteImpulsion - dt * 2.5);
    u.temps.value = t; u.tScene_t.value = fige ? D.freeze + tLent : t;
    const prog = borne((t - D.arrivee) / Math.max(0.01, D.ouvre - D.arrivee));
    u.tension.value = t < D.ouvre ? prog * (0.45 + 0.15 * rang) : 0; u.pouls.value = t < D.ouvre ? pouls(t) : 0;
    u.fuite.value.copy(couleurFuite); u.fuiteForce.value = t < D.trappe ? ((0.05 + 0.09 * prog) * (0.6 + 0.4 * hasard()) + fuiteImpulsion * 0.35) * (1 - borne((t - D.trappeDebut) / 0.35)) : 0;   // la lueur d'écran du suspense s'éteint dès que le rideau bouge : les inserts restent dans la pénombre, sans voile coloré
    if (trailer) {
      u.da.value = t >= D.bascule ? 1 : 0; u.dechirure.value = borne((t - D.bascule) / D.dech);
      u.chaleur.value = cleA === 'post_apo' && t >= D.bascule ? 1 : 0;
      u.zoom.value = fige ? 1 + 0.04 * lisse(borne((t - D.freeze) / 6)) : 1;
    }
    // MODE EXPLOSION : strobe saturé (2 images, ≤ 50 ms) et anneau de réfraction de l'onde de choc
    if (strobe.images > 0 && t - strobe.t0 <= STROBE.dureeMax + 1e-6) { u.flashSat.value = strobe.images === STROBE.images ? 0.85 : 0.5; u.flashCouleur.value.copy(strobe.couleur); strobe.images--; }
    else { strobe.images = 0; u.flashSat.value = 0; }
    const tauO = derniereOnde ? t - derniereOnde.t0 : 9;
    if (tauO >= 0 && tauO < 0.7) {
      _ondeEcran.set(fret.position.x, dalle + hO * 0.45, fret.position.z).project(camera);
      u.onde.value.set((_ondeEcran.x + 1) / 2, (_ondeEcran.y + 1) / 2, 0.03 + 1.3 * (1 - Math.exp(-tauO / 0.2))); u.ondeForce.value = Math.min(1.2, derniereOnde.force) * 0.9 * Math.pow(1 - tauO / 0.7, 2);
    } else u.ondeForce.value = 0;
    u.flash.value = Math.min(1, flashV); u.eclair.value = eclairV > 0 ? Math.min(1, eclairV / 0.18) * (0.7 + 0.3 * hasard()) : 0;
    sigPunch = Math.max(0, sigPunch - dt * 0.6);
    u.sigForce.value = t >= tSeuil ? 0.55 + 0.45 * sigPunch : 0;
    if (DRAME) u.desat.value = drame.desat(t);                         // MODE DRAME : l'univers vire au sépia rouillé à l'arrêt sur image
  };
  const focusEcran = () => { const v = voiture.position.clone(); v.y += (modele ? modele.chassis.position.y : 0) + haut * 0.5; v.project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
  let focusFige = null, orbite = null;
  let dirCam = null, emprise = null;
  function cadrageHeroique() {            // coupe : contre-plongée de trois quarts avant ; le bolide ENTIER remplit la moitié droite
    const box = new THREE.Box3().setFromObject(modele ? modele.groupe : voiture);
    const sph = box.getBoundingSphere(new THREE.Sphere()), c = sph.center;
    const az = THREE.MathUtils.degToRad(CAD ? CAD.azimut : 48.65);  // V6 : azimut, hauteur, visée, roulis et focale propres au personnage
    dirCam = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).normalize();
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    const fov = CAD ? CAD.fov : 30;
    camera.fov = fov; camera.aspect = w / h;
    camera.setViewOffset(w, h, -w * 0.15, 0, w, h); camera.updateProjectionMatrix();
    const d = sph.radius / Math.sin(THREE.MathUtils.degToRad(fov / 2)) * 1.12 * (CAD ? CAD.recul : 1);
    orbite = { c, r: d, a0: Math.atan2(dirCam.x, dirCam.z), y: CAD ? CAD.camY : Math.max(0.3, c.y * 0.5), cible: V3(c.x, c.y * (CAD ? CAD.cibleY : 1), c.z), roulis: CAD ? CAD.roulis : 0.09, fov };
    placerOrbite(0);
    if (CAD) {                            // mise au cadre : quel que soit l'angle (face, rasant, penché), le bolide ENTIER remplit la moitié droite
      // la distance « sphère englobante » éloigne trop un bolide vu de face (sa longueur se raccourcit à l'écran) : on part de près
      // et on recule par pas de 4 % jusqu'à ce que les 8 coins de la boîte tiennent dans la fenêtre droite (la fiche occupe la gauche)
      const coinsBox = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) coinsBox.push(V3(x, y, z));
      orbite.r = d * 0.4; placerOrbite(0);
      // univers « relique vintage » : l'image finale est recadrée en 4:3 à bandes noires (archetypes.js, mode 5) ; la limite droite
      // suit donc le bord de l'image 4:3 (|x| < (4/3) / format) et plus le bord de l'écran 16:9, sinon la proue part dans la bande
      const bordDroit = trailer && cleA === 'vintage' ? Math.min(0.95, (4 / 3) / camera.aspect - 0.06) : 0.95;
      for (let essai = 0; essai < 60; essai++) {
        camera.updateMatrixWorld();
        const deborde = coinsBox.some((p) => { const q = p.clone().project(camera); return q.x < -0.12 || q.x > bordDroit || Math.abs(q.y) > 0.88 || q.z > 1; });
        if (!deborde) break;
        orbite.r *= 1.04; placerOrbite(0);
      }
      if (pasFixe) window.__fretCadrage = { nom: CAD.nom, rayon: sph.radius, r0: d, r: orbite.r, camY: orbite.y, cible: orbite.cible.toArray(), box: [box.min.toArray(), box.max.toArray()] };   // banc image par image
    }
    focusFige = focusEcran();
    // rien ne doit masquer le bolide sur l'image finale : on retire les particules devant lui ou dans son emprise à l'écran
    camera.updateMatrixWorld();
    const coins = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) coins.push(V3(x, y, z).project(camera));
    emprise = { x0: Math.min(...coins.map((p) => p.x)) - 0.06, x1: Math.max(...coins.map((p) => p.x)) + 0.06, y0: Math.min(...coins.map((p) => p.y)) - 0.08, y1: Math.max(...coins.map((p) => p.y)) + 0.08, d: camera.position.distanceTo(c) };
    const rayon = sph.radius;
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i].s.position, dd = q.distanceTo(camera.position), pr = q.clone().project(camera);
      const dansEmprise = pr.x > emprise.x0 && pr.x < emprise.x1 && pr.y > emprise.y0 && pr.y < emprise.y1;
      if (dd < emprise.d - rayon * 0.6 || (dansEmprise && dd < emprise.d + rayon * 2.5)) { recycler(parts[i].s); parts.splice(i, 1); }
    }
    for (const e of eclairs) e.l.visible = false;
  }
  function placerOrbite(k) {              // micro-orbite très lente : ± 4° en 25 s, la 3D reste vivante pendant la lecture
    const a = orbite.a0 + 0.07 * Math.sin(k * 0.25), r = orbite.r * (1 - 0.015 * Math.sin(k * 0.17));
    camera.position.set(orbite.c.x + Math.sin(a) * r, orbite.y + 0.12 * Math.sin(k * 0.21), orbite.c.z + Math.cos(a) * r);
    camera.lookAt(orbite.cible); camera.rotateZ(orbite.roulis);
  }

  // ---------- signature : particules du bolide, à partir du seuil
  const SPS = [SIG.particules, ...(SIG.extra || [])].map((nom) => PARTICULES_SIGNATURE[nom] || PARTICULES_SIGNATURE.etoiles);
  function particulesSignature(dt, taux, derriere = 0) { for (const SP of SPS) emettreSignature(SP, dt, taux * (SPS.length > 1 ? 0.7 : 1), derriere); }
  const alea = (a, b) => a + hasard() * (b - a);
  function emettreSignature(SP, dt, taux, derriere = 0) {
    const attendu = SP.n * 30 * dt * taux; let n = Math.floor(attendu) + (hasard() < attendu % 1 ? 1 : 0);
    const cx = voiture.position.x, larg = modele ? modele.largeur : 2;
    while (n-- > 0) {
      const couleur = SIG.teinte && hasard() < 0.4 ? SIG.teinte : SP.couleurs[Math.floor(hasard() * SP.couleurs.length)];
      const pos = SP.zone === 'ciel' ? V3(cx + alea(-6, 6), alea(5, 7.5), alea(-3, 4)) : SP.zone === 'air' ? V3(cx + alea(-LONG * 0.7, LONG * 0.7), alea(0.4, haut + 1.4), alea(-larg, larg + 1))
        : V3(cx + alea(-LONG * 0.7, LONG * 0.7), alea(0.05, 0.35), alea(-larg * 0.8, larg * 0.8 + 0.6));
      if (derriere && dirCam) {
        pos.addScaledVector(dirCam, -derriere);
        if (emprise) { const pr = pos.clone().project(camera); if (pr.x > emprise.x0 && pr.x < emprise.x1 && pr.y > emprise.y0 && pr.y < emprise.y1) continue; }
      }
      emettre(1, () => ({ mat: matPart(couleur, texSig(SP.tex), SP.add), pos, vel: V3(alea(...SP.vel[0] || [-1, 1]), alea(...(SP.vel[1] || [0.5, 1.5])), alea(...(SP.vel[2] || [-1, 1]))),
        taille: alea(...SP.taille), vie: alea(...SP.vie), g: SP.g, frein: SP.frein, tourne: (hasard() - 0.5) * 2 * SP.tourne, croit: SP.croit || 0, op: SP.op, pivote: SP.pivote, ondule: SP.ondule }));
    }
  }

  /* ================================================================== MODE DRAME — « LE LÉGENDAIRE QUI N'EN ÉTAIT PAS UN »
     Raretés signature à drapeau « drame » (Épave). Jusqu'au scellé, rien ne diffère d'un Légendaire. Au scellé (chronologie.js →
     D.drame) : pétard mouillé (bouffée grise, trois étincelles qui sautillent sur le toit), effondrement de la lumière dorée
     (projecteurs qui grésillent puis meurent un à un, liseré néon qui clignote, tôle qui vire au gris rouille), ampoule nue qui
     descend au bout de son fil et s'allume en hésitant, badge qui se fissure et perd ses losanges sur le trombone triste, badge
     Épave et tampon « DÉCLASSÉ », rideau coincé (à-coups, blocage, lame qui tombe), démarrage poussif, phare droit en faux contact,
     sortie au ralenti en toussotant (ratés, fumée noire), enjoliveur arraché au seuil qui roule puis tourne en toupie, arrêt sur
     image viré au sépia rouillé sous l'ampoule qui se balance. Tout dépend du temps de la scène ou d'un générateur à graine. */
  const drame = DRAME ? (CRASH ? creerDrameCrash() : creerDrame()) : null;
  function creerDrame() {
    const h = hasard, ss = (u) => { const x = borne(u); return x * x * (3 - 2 * x); };
    const PR = PEINTURES_SIGNATURE[R.custom] || PEINTURES_SIGNATURE.epave;
    const OR = PEINTURES[Math.min(PEINTURES.length - 1, 1 + rang)], ROUILLE = { col: new THREE.Color(PR.c), rough: PR.rough, metal: PR.metal };
    const COL_LISERE_OR = new THREE.Color(RV.couleur), COL_LISERE_MORT = new THREE.Color('#2e2219');
    const tToux = [...DR.touxRalenti, ...DR.touxSortie.map((x) => D.sortie + x)], LT = 0.38;
    const quinte = (t, c) => { const u = (t - c) / LT + 0.5; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
    const E = { petard: false, lame: null, fige: -9, pop: 0, demarre: false };
    // --- les quatre groupes de projecteurs : 0 et 1 = suspensions lointaines du hangar, 2 = clé et contre-jour du plateau,
    //     3 = la grande suspension sodium au-dessus du conteneur (la dernière à mourir)
    const fGroupe = (k, t) => (t < DR.extinctions[k] - DR.gresillement ? 1 : t < DR.extinctions[k] ? allume(t, DR.gresillements[k]) : 0);
    let ext = null, extT = NaN;
    const extinction = (t) => {
      if (t === extT && ext) return ext;
      const f = [0, 1, 2, 3].map((k) => fGroupe(k, t));
      ext = { spot: f[3], lointaines: [f[0], f[1]], lampes: [f[3], f[0], f[0], f[0], f[0], f[1], f[1], f[1], f[1]] }; extT = t;
      return ext;
    };
    // --- l'ampoule nue : fil, douille, verre (filament éteint → jaune), halo, lumière ; pendule dont la lame relance l'amplitude
    const xc = modele ? xArrivee + (modele.xAvant + modele.xArriere) / 2 : xO + 4, Lp = 4.4, hB = Math.max(H + 0.7, dalle + haut + 1.9);
    const pivot = new THREE.Object3D(); pivot.position.set(xc + 0.4, hB + Lp + 0.24, 1.3); scene.add(pivot);
    const axe = V3(0.8, 0, 0.6).normalize(), suspente = new THREE.Group(); pivot.add(suspente);
    const fil = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.012, 0.012, Lp, 6)), garde(new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.8 }))); fil.position.y = -Lp / 2; suspente.add(fil);
    const douille = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 14)), garde(new THREE.MeshStandardMaterial({ color: 0x6b5a3a, metalness: 0.7, roughness: 0.45 }))); douille.position.y = -Lp - 0.06; suspente.add(douille);
    const matVerre = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a352c'), toneMapped: false }));
    const verre = new THREE.Mesh(garde(new THREE.SphereGeometry(0.11, 18, 14)), matVerre); verre.scale.set(1, 1.25, 1); verre.position.y = -Lp - 0.24; suspente.add(verre);
    const halo = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texD, color: new THREE.Color('#ffc98a'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    halo.scale.setScalar(1.5); halo.position.y = -Lp - 0.24; suspente.add(halo);
    const lumB = new THREE.PointLight(0xffc489, 0, 16, 1.6); lumB.position.y = -Lp - 0.32; suspente.add(lumB);
    // (V9c) la suspente reste dans la scène dès le départ, éteinte (intensité 0) : une lumière qui apparaît en cours de route
    // recompilait tous les matériaux éclairés (gros à-coup) ; seuls le fil, la douille, le verre et le halo se montrent
    const bulbe = [fil, douille, verre, halo];
    for (const o of bulbe) o.visible = false;
    const COL_VERRE_ON = new THREE.Color('#fff2c8'), COL_VERRE_OFF = new THREE.Color('#3a352c');
    const balancier = (t) => {
      const k = t - (DR.ampoule - 0.35); if (k < 0) return 0;
      const A = 0.06 + (t > DR.lame[1] ? 0.11 * Math.exp(-(t - DR.lame[1]) / 3.5) : 0);
      return A * Math.sin(2 * Math.PI * k / 4.2);
    };
    const majAmpoule = (t) => {
      const d = t - (DR.ampoule - 0.35);
      if (d < 0) { for (const o of bulbe) o.visible = false; lumB.intensity = 0; return; }
      for (const o of bulbe) o.visible = true;
      if (E.fige < 0) { const k = Math.min(1, d / 0.35); suspente.position.y = d < 0.35 ? (1 - k * k) * 2.4 : -0.06 * Math.exp(-(d - 0.35) / 0.12) * Math.sin((d - 0.35) * 30); }   // il descend au bout de son fil
      suspente.quaternion.setFromAxisAngle(axe, balancier(t));
      const on = allume(t, DR.ampouleSegments), vib = 0.92 + 0.08 * Math.sin(t * 2 * Math.PI * 50) ** 2;
      lumB.intensity = 3.2 * on * vib; halo.material.opacity = 0.75 * on * vib; matVerre.color.copy(on ? COL_VERRE_ON : COL_VERRE_OFF);
    };
    // --- pétard mouillé : bouffée grise et trois étincelles qui sautillent sur le toit puis s'éteignent
    const matEtin = garde(new THREE.SpriteMaterial({ map: texD, color: new THREE.Color('#ffb04a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    // trois étincelles tirées D'AVANCE (graine) : on connaît l'instant où chacune touche le béton, la bande-son y cale son tintement
    const P_PET = V3(xO + 0.32, yLinteau + 0.12, 0.35), etinD = [0, 1, 2].map((i) => ({ sp: null, p0: V3(P_PET.x + 0.05 * i, P_PET.y, P_PET.z + (i - 1) * 0.25), v0: V3(0.7 + 0.35 * i + h() * 0.2, 1.4 + h() * 0.5, (i - 1) * 0.35 + (h() - 0.5) * 0.2), age: 0 }));
    for (const e of etinD) { const y0 = e.p0.y - 0.03, vy = e.v0.y; e.sol = (vy + Math.sqrt(vy * vy + 2 * 9.81 * y0)) / 9.81; }
    DR.tintements = etinD.map((e) => DR.petard + e.sol);
    const petard = () => {
      E.petard = true;
      emettre(8, () => ({ mat: matPart('#8d8f95', texD, false), pos: V3(P_PET.x + (h() - 0.3) * 0.4, P_PET.y + h() * 0.15, P_PET.z + (h() - 0.5) * 0.5), vel: V3(0.3 + h() * 0.4, 0.35 + h() * 0.4, (h() - 0.5) * 0.4),
        taille: 0.28 + h() * 0.22, croit: 2.8, vie: 1.8 + h() * 0.7, op: 0.6, frein: 1.3, tourne: (h() - 0.5) * 0.8 }));
      for (const e of etinD) { e.sp = new THREE.Sprite(garde(matEtin.clone())); e.sp.scale.setScalar(0.09); e.sp.position.copy(e.p0); e.v = e.v0.clone(); scene.add(e.sp); }
    };
    const majEtincelles = (dt) => {
      for (const e of etinD) {
        if (!e.sp) continue;
        e.age += dt; if (e.age > 1.9) { e.sp.visible = false; continue; }
        e.v.y -= 9.81 * dt; e.sp.position.addScaledVector(e.v, dt);
        if (e.sp.position.y < 0.03 && e.v.y < 0) { e.sp.position.y = 0.03; e.v.y *= -0.3; e.v.x *= 0.5; e.v.z *= 0.5; }
        e.sp.material.opacity = Math.max(0, 1 - e.age / 1.9) * (0.7 + 0.3 * Math.sin(e.age * 40)); e.sp.scale.setScalar(0.09 * (1 - 0.5 * e.age / 1.9));
      }
    };
    // --- la lame du bas se décroche du rideau bloqué, bascule et tombe à plat sur le béton (CLONK pile à DR.lame[1]), deux rebonds
    const lame = lames[0];
    const majLame = (t) => {
      if (t < DR.lame[0]) return;
      if (!E.lame) { lame.libre = true; E.lame = { y0: lame.m.position.y, x0: lame.m.position.x, poussiere: false }; }
      const L0 = E.lame, u = borne((t - DR.lame[0]) / (DR.lame[1] - DR.lame[0])), yF = 0.045, xF = xO + 0.62;
      lame.m.visible = true;
      if (t < DR.lame[1]) { lame.m.position.set(L0.x0 + (xF - L0.x0) * u, L0.y0 + (yF - L0.y0) * u * u, 0); lame.m.rotation.set(0.05 * Math.sin(u * 5), 0, -Math.PI / 2 * Math.pow(u, 1.4)); return; }
      const tau = t - DR.lame[1], b = tau < 0.35 ? 0.05 * Math.exp(-tau / 0.07) * Math.abs(Math.sin(Math.PI * tau / 0.095)) : 0;
      lame.m.position.set(xF + 0.12 * (1 - Math.exp(-tau / 0.15)), yF + b, 0);
      lame.m.rotation.set(0, 0, -Math.PI / 2 + 0.06 * Math.exp(-tau / 0.12) * Math.sin(tau * 38));
      if (!L0.poussiere) {
        L0.poussiere = true; secousse = Math.max(secousse, 0.07);
        emettre(10, () => ({ mat: matPart('#7d7468', texD, false), pos: V3(xF + (h() - 0.5) * 0.6, 0.05, (h() - 0.5) * (P - 0.6)), vel: V3((h() - 0.2) * 1.6, 0.2 + h() * 0.4, (h() - 0.5) * 1.2), taille: 0.35 + h() * 0.3, croit: 2, vie: 1.2 + h() * 0.6, op: 0.32, frein: 1.6 }));
      }
    };
    // --- le moteur tousse : la caisse tressaute, fumée noire et retour de flamme à chaque reprise ; il vibre au ralenti
    const secousseVoiture = (t) => {
      let y = 0, r = 0;
      if (t >= DR.demarrage && t < DR.demarrage + 0.8) y += 0.005 * Math.sin(t * 2 * Math.PI * 9);
      for (const c of tToux) { const k = quinte(t, c); if (k > 0) { y += 0.012 * k * Math.sin(t * 55); r -= 0.022 * k; } }
      if (t > DR.demarrage + 0.8 && t < D.pose + 0.35) y += 0.0025 * Math.sin(t * 2 * Math.PI * 13);
      return { y, r };
    };
    const bouffee = (n, noire) => {
      if (!modele) return;
      const x = voiture.position.x + modele.xArriere - 0.12, y = voiture.position.y + modele.chassis.position.y + 0.3;
      emettre(n, () => ({ mat: matPart(noire ? '#1d1c1b' : '#4e4c49', texD, false), pos: V3(x - h() * 0.1, y + h() * 0.1, (h() - 0.5) * 0.3), vel: V3(-0.8 - h() * 1.2, 0.3 + h() * 0.5, (h() - 0.5) * 0.6),
        taille: 0.35 + h() * 0.3, croit: 2.6, vie: 1.6 + h() * 0.8, op: noire ? 0.55 : 0.3, frein: 0.9, tourne: (h() - 0.5) * 0.6 }));
    };
    const flammeRetour = () => {
      if (!modele) return;
      const x = voiture.position.x + modele.xArriere - 0.1, y = voiture.position.y + modele.chassis.position.y + 0.3;
      emettre(3, () => ({ mat: matPart(h() < 0.5 ? '#ffb347' : '#ff7a1a', texD, true), pos: V3(x, y, (h() - 0.5) * 0.12), vel: V3(-2.5 - h() * 2, (h() - 0.3) * 0.6, 0), taille: 0.22 + h() * 0.12, vie: 0.12 + h() * 0.06, frein: 2, op: 1, franc: true }));
    };
    // --- phares : à l'allumage, le gauche tient (faiblard), le droit a un faux contact ; quand il cale, le droit meurt
    const majPhares = (t) => {
      if (!modele || !colAv) return;
      const on = t > DR.demarrage + 0.85 ? 1 : 0, cale = t > D.pose + 0.35;
      const f1 = on * (cale ? 0 : (Math.sin(t * 23) > 0.35 ? 1 : 0.08) * (Math.sin(t * 3.1) > -0.6 ? 1 : 0));
      modele.feux.avant.color.copy(colAv).multiplyScalar(0.05 + 0.45 * on);
      for (let i = 0; i < 2; i++) {
        const lp = modele.lampePos(i, lampeL[i]), k = i === 0 ? on * (cale ? 0.55 : 0.85) : f1;
        spotsPh[i].position.copy(lp); spotsPh[i].target.position.set(lp.x + 6, lp.y - 0.45, lp.z * 1.4); spotsPh[i].intensity = 2.4 * k;
        flaresPh[i].position.copy(lp); flaresPh[i].material.opacity = 0.32 * k; flaresPh[i].scale.setScalar(0.22 * k + 0.001);
        striesPh[i].material.opacity = 0; conesPh[i].material.uniforms.force.value = 0;
      }
    };
    // --- l'enjoliveur : coupelle de tôle crème (révolution autour de l'axe X local), qui roule, embarde, puis tourne en toupie
    let enjo = null;
    if (modele && roueCible) {
      const rh = roueCible.r * 0.7, ep2 = 0.055;
      const prof = [[0.001, ep2 * 0.5], [rh * 0.25, ep2 * 0.55], [rh * 0.55, ep2 * 0.35], [rh * 0.92, 0], [rh, -ep2 * 0.5], [rh * 0.96, -ep2 * 0.5], [rh * 0.88, -ep2 * 0.1], [0.001, -ep2 * 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
      const geo = garde(new THREE.LatheGeometry(prof, 32)); geo.rotateZ(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, garde(new THREE.MeshStandardMaterial({ color: 0xece3ca, emissive: 0x2a251b, metalness: 0.5, roughness: 0.34, envMap: env, side: THREE.DoubleSide }))); mesh.castShadow = true;
      const g0 = new THREE.Group(), yaw = new THREE.Object3D(), tilt = new THREE.Object3D(), spin = new THREE.Object3D();
      g0.add(yaw); yaw.add(tilt); tilt.add(spin); spin.add(mesh); g0.visible = false; scene.add(g0);
      enjo = { g0, yaw, tilt, spin, rh, ep: ep2, t0: -1, p0: V3(0, 0, 0) };
    }
    const DIR = V3(1, 0, 0.3).normalize(), YAW0 = Math.atan2(DIR.x, DIR.z), V0 = 3.0, V1 = 0.8;     // il double le bolide en travers du cadre : on le voit de face
    const enjoliveurPart = (t) => {
      if (!enjo || enjo.t0 >= 0) return;
      roueCible.pivot.getWorldPosition(enjo.p0); enjo.p0.z += Math.sign(enjo.p0.z || 1) * 0.12; enjo.p0.y = enjo.rh; enjo.t0 = t; enjo.g0.visible = true;
    };
    const majEnjoliveur = (t) => {
      if (!enjo || enjo.t0 < 0) return;
      const J = enjo, tau = Math.max(0, t - J.t0), Rr = DR.enjoliveur.roule, Tp = DR.enjoliveur.toupie;
      if (pasFixe) window.__fretEnjoliveur = { t0: J.t0, p0: J.p0.toArray(), p: J.g0.position.toArray(), ecran: J.g0.position.clone().project(camera).toArray() };   // banc image par image
      const dist = (x) => V0 * x - (V0 - V1) * x * x / (2 * Rr);
      if (tau < Rr) {
        const s2 = dist(tau);
        J.g0.position.copy(J.p0).addScaledVector(DIR, s2); J.g0.position.y = J.rh;
        J.yaw.rotation.y = YAW0 + 0.25 * Math.sin(tau * 2.2) * tau / Rr; J.tilt.rotation.z = 0.06 * Math.sin(tau * 9) + 0.12 * tau / Rr; J.spin.rotation.x = -s2 / J.rh;
        return;
      }
      const u = borne((tau - Rr) / Tp), sF = dist(Rr), beta = Math.PI / 2 * (0.08 + 0.92 * Math.pow(u, 1.6)), psi = Tp * (4 * u + 38 * u * u * u / 3);
      J.g0.position.copy(J.p0).addScaledVector(DIR, sF + 0.25 * Math.sin(Math.PI * u * 0.5));
      J.g0.position.y = Math.max(J.ep * 0.5, J.rh * Math.cos(beta) + J.ep * 0.5 * Math.sin(beta));
      J.yaw.rotation.y = YAW0 + 0.25 * Math.sin(Rr * 2.2) + psi; J.tilt.rotation.z = beta; J.spin.rotation.x = -sF / J.rh - 2 * u;
    };
    // --- une image du drame (après la boucle des lumières du suspense, avant le hangar et le rendu)
    const maj = (t, dt) => {
      if (E.petard) {
        const k = ss((t - DR.rouille[0]) / (DR.rouille[1] - DR.rouille[0]));
        uPeinture.uPeint.value.copy(OR.col).lerp(ROUILLE.col, k); uPeinture.uIncand.value = 0; uPeinture.uLueur.value = 0;   // l'or surchauffé vire au gris rouille
        peinture.cible = 0; peinture.surchauffe *= Math.exp(-dt / 0.09); uPeinture.uSurchauffe.value = peinture.surchauffe;
        for (const m of [matTole, matCadre, matFace]) { m.roughness = OR.rough + (ROUILLE.rough - OR.rough) * k; m.metalness = OR.metal + (ROUILLE.metal - OR.metal) * k; }
        const kF = t < DR.extinctions[0] ? 1 - 0.5 * (1 - allume(t, DR.gresillements[0])) : t < DR.extinctions[1] ? 0.5 * allume(t, DR.gresillements[1]) : 0;
        matFente.opacity *= kF; matRai.opacity *= kF; matFlaque.opacity *= kF; interieur.intensity *= kF;      // les fuites dorées papillotent puis meurent
        faisceauMat.uniforms.force.value *= kF; lueurOuverture.material.opacity *= kF;
        if (t >= DR.fin[0]) { interieur.color.set('#ffcf9a'); interieur.intensity = 0.3 * ss((t - DR.fin[0]) / 1.0); }   // une veilleuse fatiguée dans le conteneur
        matLiseret.color.copy(t < DR.neon[1] && allume(t, DR.neonSegments) ? COL_LISERE_OR : COL_LISERE_MORT);
        if (!etat.univers) {
          const f2 = fGroupe(2, t);
          cle.intensity *= f2; contre.intensity *= f2; if (lisV) lisV.intensity *= f2; if (cleV) cleV.intensity *= 0.55;
          hemi.intensity *= 1 - 0.55 * ss((t - DR.effondrement[0]) / (DR.effondrement[1] - DR.effondrement[0]));
        }
        majEtincelles(dt); majLame(t);
      }
      majAmpoule(t); majPhares(t); majEnjoliveur(t);
      if (modele && t > DR.demarrage + 0.78 && !E.demarre) { E.demarre = true; bouffee(5, true); }
      while (E.pop < tToux.length && t >= tToux[E.pop] + LT * 0.42) { E.pop++; bouffee(6, true); flammeRetour(); }
      if (E.demarre && t < D.pose + 0.35 && h() < (t > D.sortie ? 0.45 : 0.2)) bouffee(1, false);
    };
    // --- lent travelling avant sur le désastre (il s'efface pendant la sortie : le travelling final reprend la main)
    const cameraDrame = (t, cam, cib) => {
      const k = ss((t - (D.ouvre + 0.9)) / 4.5) * (1 - ss((t - D.sortie) / (D.pose - D.sortie)));
      if (k <= 0) return;
      cam.lerp(V3(xO + 9.5, dalle + 2.1, 7.2), 0.38 * k); cib.lerp(V3(xO + 0.4, dalle + hO * 0.42, 0.3), 0.45 * k);
    };
    // --- arrêt sur image (trailer) : l'ampoule est raccrochée au-dessus du bolide, dans le cadre (c'est une coupe : rien ne saute)
    const figer = (t) => {
      E.fige = t; suspente.position.y = 0;
      if (!orbite) return;
      camera.updateMatrixWorld();
      const c = orbite.c, cand = V3(0, 0, 0); let choix = null;
      for (let dy = haut * 1.25 + 1.0; dy > haut * 0.75; dy -= 0.08) {
        cand.set(c.x - LONG * 0.12, c.y + dy, c.z + 0.3);
        const pr = cand.clone().project(camera);
        if (pr.x > -0.1 && pr.x < 0.9 && Math.abs(pr.y) < 0.8 && pr.z < 1) { choix = cand.clone(); break; }
      }
      if (!choix) choix = V3(c.x, c.y + haut * 0.9, c.z);
      pivot.position.set(choix.x, choix.y + Lp + 0.24, choix.z);
      if (pasFixe) window.__fretDrame = { ampoule: choix.toArray(), ecran: choix.clone().project(camera).toArray(), centre: c.toArray(), haut };
    };
    const majFige = (t, dt, tScene) => { majAmpoule(t); majEnjoliveur(tScene); };
    const desat = (t) => (trailer ? (E.fige > 0 ? 0.8 * ss((t - E.fige) / 0.6) : 0) : 0.8 * ss((t - D.pose) / 1.2));
    return { petard, maj, extinction, secousseVoiture, enjoliveurPart, figer, majFige, desat, camera: cameraDrame, dessiner: creerBadgeDrame(E) };
  }

  /* ================================================================== MODE DRAME, scénario « CRASH » (N13, « Le Chasseur Abattu »)
     Le faux Légendaire se déroule dans le hangar ; au scellé, COUPE FRANCHE : plein ciel au-dessus des nuages, la voiture NEUVE vole
     (ailes déployées, bleu vif, dérive entière, flamme de réacteur, traînées de condensation) — poursuite avec roulis de chasseur, survol
     avec tonneau et passage Doppler, puis un drone kamikaze générique fonce sur elle (réticule de verrouillage). Impact : boule de feu,
     les ailes et la dérive partent en vrille (détachées dans le repère monde), la peinture vire au gris (contrat du modèle :
     drame.teinte). Chute en spirale de fumée ; retour dans le hangar : elle tombe du haut du cadre, rebondit et glisse en tournant
     devant le conteneur dans une gerbe d'étincelles, et s'immobilise ÉPAVE. Trombone, badge, tampon ; le conteneur s'ouvre sur RIEN.
     Arrêt sur image : l'aile gauche redescend du ciel en feuille morte. Contrat 3D : modele.drame = { neuf(), epave(), teinte(k),
     pieces: { aileG, aileD, derive } } ; sans lui (essai ?drame=crash sur un autre bolide), un leurre de trois plaques bleues. */
  function creerDrameCrash() {
    const h = hasard, ss = (u) => { const x = borne(u); return x * x * (3 - 2 * x); }, o = D.ouvre, I = DR.impact;
    const E = { petard: false, tTerne: I, coupe: false, impact: false, retour: false, arret: false, fige: -9, feuille: -1 };
    const C3 = (modele && modele.drame) || leurreDrame();
    const hc = Math.max(0.6, haut * 0.45);                             // la voiture tourne autour de son centre (groupe abaissé de hc)
    /* ---------- le ciel : dôme en dégradé, campagne lointaine, nuages ; soleil (éteint hors du ciel) */
    const ciel = new THREE.Group(); ciel.visible = false; scene.add(ciel);
    const dome = new THREE.Mesh(garde(new THREE.SphereGeometry(1800, 32, 16)), garde(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vD; void main(){ float y = vD.y; vec3 zen = vec3(0.12, 0.33, 0.68), hor = vec3(0.78, 0.86, 0.94), bas = vec3(0.55, 0.62, 0.66);'
        + ' vec3 c = y > 0.0 ? mix(hor, zen, pow(y, 0.55)) : mix(hor, bas, pow(-y, 0.4)); vec3 sol = normalize(vec3(0.55, 0.42, 0.35));'
        + ' c += vec3(1.0, 0.86, 0.6) * pow(max(0.0, dot(vD, sol)), 64.0) * 0.9 + vec3(1.0, 0.9, 0.7) * pow(max(0.0, dot(vD, sol)), 6.0) * 0.12; gl_FragColor = vec4(c, 1.0); }' })));
    dome.renderOrder = -10; ciel.add(dome);
    const texCampagne = garde(texCanvas(1024, 1024, (g, w) => {        // champs en patchwork, haies, routes (graine fixe)
      let a = 4242; const al = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
      const tons = ['#6f8f4e', '#88a35a', '#a9a061', '#5f7d45', '#9a8b55', '#7c9a52', '#b7ae74'];
      for (let y = 0; y < w; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = tons[Math.floor(al() * tons.length)]; g.fillRect(x + (al() - 0.5) * 8, y + (al() - 0.5) * 8, 70, 70); }
      g.strokeStyle = 'rgba(40,52,30,.28)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      g.strokeStyle = 'rgba(205,200,190,.8)'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, w * 0.3); g.bezierCurveTo(w * 0.3, w * 0.5, w * 0.6, w * 0.1, w, w * 0.45); g.stroke();
      g.fillStyle = 'rgba(70,90,110,.6)'; g.beginPath(); g.ellipse(w * 0.72, w * 0.7, 60, 34, 0.4, 0, 7); g.fill();
    }));
    texCampagne.wrapS = texCampagne.wrapT = THREE.RepeatWrapping; texCampagne.repeat.set(10, 10);
    const terre = new THREE.Mesh(garde(new THREE.PlaneGeometry(6000, 6000)), garde(new THREE.MeshStandardMaterial({ map: texCampagne, roughness: 1, metalness: 0 })));
    terre.rotation.x = -Math.PI / 2; ciel.add(terre);
    const matNuage = garde(new THREE.SpriteMaterial({ map: texD, color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    for (let i = 0; i < 64; i++) {                                     // nuages sous le vol (parallaxe) et quelques-uns à son altitude
      const haut2 = i < 10, n = new THREE.Sprite(matNuage);
      n.position.set(-260 + h() * 760, haut2 ? 118 + h() * 26 : 55 + h() * 40, (h() - 0.5) * (haut2 ? 70 : 380)); n.scale.set(40 + h() * 90, 18 + h() * 30, 1); ciel.add(n);
    }
    const soleil = new THREE.DirectionalLight(0xfff1dc, 0); soleil.position.set(330, 420, 250); scene.add(soleil);
    /* ---------- le drone kamikaze générique : croix de carbone, quatre moteurs, hélices floues, charge conique, diode rouge */
    const drone = new THREE.Group(); ciel.add(drone);
    const matDr = garde(new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.4, roughness: 0.5 })), matHel = garde(new THREE.MeshBasicMaterial({ color: 0x15161a, transparent: true, opacity: 0.35, depthWrite: false }));
    const matLed = garde(new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false })), matCharge = garde(new THREE.MeshStandardMaterial({ color: 0x5c5a3a, metalness: 0.3, roughness: 0.6 }));
    drone.add(new THREE.Mesh(garde(new THREE.BoxGeometry(1.0, 0.35, 1.0)), matDr));
    for (const an of [Math.PI / 4, -Math.PI / 4]) { const b = new THREE.Mesh(garde(new THREE.BoxGeometry(3.0, 0.12, 0.18)), matDr); b.rotation.y = an; drone.add(b); }
    const helices = [];
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const mo = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 12)), matDr); mo.position.set(sx * 1.06, 0.12, sz * 1.06); drone.add(mo);
      const he = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 24)), matHel); he.position.set(sx * 1.06, 0.3, sz * 1.06); drone.add(he); helices.push(he);
    }
    const charge = new THREE.Mesh(garde(new THREE.ConeGeometry(0.32, 0.9, 14)), matCharge); charge.rotation.x = Math.PI / 2; charge.position.set(0, -0.15, 0.55); drone.add(charge);
    const led = new THREE.Mesh(garde(new THREE.SphereGeometry(0.08, 8, 6)), matLed); led.position.set(0, 0.22, -0.5); drone.add(led);
    drone.scale.setScalar(2.0); drone.visible = false;
    /* ---------- trajectoire du vol (avant l'impact) : x à vitesse constante, légère houle ; orientation = vitesse + roulis */
    const VJ = 46, Y0 = 130, X0 = -120, _p = V3(0, 0, 0), _v = V3(0, 0, 0);
    const posJet = (t, out) => { const u = t - o; return out.set(X0 + VJ * u, Y0 + 4 * Math.sin(0.9 * u), 9 * Math.sin(0.45 * u)); };
    const vitJet = (t, out) => { const u = t - o; return out.set(VJ, 3.6 * Math.cos(0.9 * u), 4.05 * Math.cos(0.45 * u)); };
    const roulisJet = (t) => {
      const u = t - o, [r0, r1] = DR.tonneau;
      if (t >= r0 && t < r1 + 0.2) return 2 * Math.PI * ss((t - r0) / (r1 - r0));
      return t < DR.plans[2].t0 ? 0.45 * Math.sin(2.1 * u) : 0.25 * Math.sin(1.3 * u) - 0.2;
    };
    const Pi = posJet(I, V3(0, 0, 0)), Ds = Pi.clone().add(V3(70, 22, -55));
    /* ---------- pièces du modèle : détachées dans le repère monde à l'impact, rendues au châssis au démontage */
    const detachees = [];
    const centres = {};                                                // centre géométrique de chaque pièce, dans son repère local
    const tips = { G: null, D: null }, tipsPrec = { G: null, D: null };
    /* ---------- ailes : repliées au début de la poursuite, elles s'ouvrent (rotation autour de l'axe x de leurs charnières) entre
       DR.ailes[0] et DR.ailes[1], charnières qui claquent (DR.clacs : son synthétique et petit coup de caméra). Le leurre (bolide
       sans contrat 3D, ?drame=crash) n'a pas de `deploiement` : rien n'est animé. */
    const AILES = typeof C3.deploiement === 'function' && DR.ailes ? DR.ailes : null;
    const ouvertureAiles = (t) => (AILES ? borne((t - AILES[0]) / (AILES[1] - AILES[0])) : 1);
    const _tq = V3(0, 0, 0), _tx = V3(0, 0, 0), _cl = V3(0, 0, 0);
    const prendrePieces = () => {
      const rot0 = voiture.rotation.clone(); voiture.rotation.set(0, 0, 0); voiture.updateMatrixWorld(true);
      for (const [k, p] of Object.entries(C3.pieces)) { const b = new THREE.Box3().setFromObject(p); centres[k] = p.worldToLocal(b.getCenter(V3(0, 0, 0))); }
      const bG = new THREE.Box3().setFromObject(C3.pieces.aileG), bD = new THREE.Box3().setFromObject(C3.pieces.aileD);
      tips.G = C3.pieces.aileG.worldToLocal(V3((bG.min.x + bG.max.x) / 2 - 0.2 * (bG.max.x - bG.min.x), (bG.min.y + bG.max.y) / 2, bG.min.z));
      tips.D = C3.pieces.aileD.worldToLocal(V3((bD.min.x + bD.max.x) / 2 - 0.2 * (bD.max.x - bD.min.x), (bD.min.y + bD.max.y) / 2, bD.max.z));
      voiture.rotation.copy(rot0); voiture.updateMatrixWorld(true);
    };
    const detacher = () => {
      voiture.updateMatrixWorld(true);
      const lances = { aileG: [V3(VJ * 0.45 - 6, 8, -15), V3(5, 2, 11)], aileD: [V3(VJ * 0.45 - 6, 6, 15), V3(-6, 3, -9)], derive: [V3(VJ * 0.35 - 10, 15, 2), V3(2, 9, 4)] };
      for (const [k, p] of Object.entries(C3.pieces)) {
        detachees.push({ k, p, parent: p.parent, pos: p.position.clone(), quat: p.quaternion.clone(), sc: p.scale.clone() });
        scene.attach(p);                                               // repère monde conservé (Object3D.attach)
      }
      const sc = detachees.map((d) => d.p.scale.clone());
      C3.epave();                                                      // moignons et éclats sur la caisse ; les pièces, elles, restent visibles en vol
      detachees.forEach((d, i) => { d.p.visible = true; d.p.scale.copy(sc[i]); const [v, w] = lances[d.k]; d.v = v.add(V3((h() - 0.5) * 3, (h() - 0.5) * 3, (h() - 0.5) * 3)); d.w = w; });
    };
    const lumExilees = [];
    const rapatrier = () => { for (const x of lumExilees) { x.parent.add(x.l); x.l.position.copy(x.pos); x.l.intensity = x.i; } lumExilees.length = 0; };
    const restaurer = () => {
      renderer.shadowMap.autoUpdate = true; rapatrier();
      for (const d of detachees) { d.parent.add(d.p); d.p.position.copy(d.pos); d.p.quaternion.copy(d.quat); d.p.scale.copy(d.sc); }
      detachees.length = 0; try { C3.epave(); } catch (e) { /* modèle déjà démonté */ }
    };
    /* ---------- leurre du contrat (essai /reveal/?drame=crash sur un bolide sans contrat) : deux ailes et une dérive en plaques bleues */
    function leurreDrame() {
      const ch = modele.chassis, matA = garde(new THREE.MeshStandardMaterial({ color: 0x2f6fd6, metalness: 0.4, roughness: 0.3, transparent: true, opacity: 0.85 }));
      const corps = new Map(), gris = new THREE.Color('#6b7178');
      modele.groupe.traverse((x) => { if (x.isMesh && x.material && !Array.isArray(x.material) && x.material.color && !corps.has(x.material)) corps.set(x.material, x.material.color.clone()); });
      const l = modele.longueur, w = modele.largeur;
      const plaque = (gx, gy, gz, x, y, z) => { const gA = new THREE.Group(), m = new THREE.Mesh(garde(new THREE.BoxGeometry(gx, gy, gz)), matA); m.position.set(x, y, z); gA.add(m); ch.add(gA); return gA; };
      const pieces = { aileG: plaque(l * 0.32, 0.06, w * 0.9, -l * 0.05, haut * 0.42, -w * 0.95), aileD: plaque(l * 0.32, 0.06, w * 0.9, -l * 0.05, haut * 0.42, w * 0.95),
        derive: plaque(l * 0.14, haut * 0.55, 0.06, modele.xArriere + l * 0.1, haut * 0.95, 0) };
      const d = {
        teinte(k) { matA.color.set(0x2f6fd6).lerp(gris, k); for (const [m, c0] of corps) m.color.copy(c0).lerp(gris, 0.55 * k); },
        neuf() { for (const p of Object.values(pieces)) { p.visible = true; p.scale.set(1, 1, 1); } d.teinte(0); },
        epave() { for (const p of Object.values(pieces)) { p.visible = false; p.scale.set(0.001, 0.001, 0.001); } d.teinte(1); },
        pieces,
      };
      d.epave(); return d;
    }
    /* ---------- état de la voiture dans le hangar (descente, rebond, glissade en toupie) */
    const XA = xO, PIN = V3(XA + 19, 13, 4.5), G1 = V3(XA + 14.5, 0, 2.4), G2 = V3(XA + 11.5, 0, 1.6), PF = V3(XA + 6.4, 0, 0.9), YAWF = 0.15, YTOT = 2.5 * Math.PI, GRAV = 20;
    const [s0, s1] = DR.sol, ARR = DR.arret;
    const lacet = (t) => (t < s0 ? YAWF - YTOT - 1.8 * (s0 - t) : YAWF - YTOT * Math.pow(1 - borne((t - s0) / (ARR - s0)), 2));
    const etatSol = (t, out) => {                                      // { p (centre), roulis, tangage, lacet, vitesse de glissade }
      let rx = 0, rz = 0, vg = 0;
      if (t < s0) {
        const T0 = s0 - DR.retour, tau = t - DR.retour, u = borne(tau / T0), vy0 = (hc - PIN.y + 0.5 * GRAV * T0 * T0) / T0;
        out.set(PIN.x + (G1.x - PIN.x) * u, PIN.y + vy0 * tau - 0.5 * GRAV * tau * tau, PIN.z + (G1.z - PIN.z) * u);
        rx = 0.35 + 5.0 * (s0 - t); rz = -0.25 - 0.6 * (s0 - t);
      } else if (t < s1) {
        const u = (t - s0) / (s1 - s0);
        out.set(G1.x + (G2.x - G1.x) * u, hc + 1.1 * 4 * u * (1 - u), G1.z + (G2.z - G1.z) * u);
        rx = 0.35 * Math.cos(Math.PI * u * 1.5) * (1 - u); rz = -0.25 * (1 - u) + 0.12 * Math.sin(Math.PI * u);
      } else if (t < ARR) {
        const u = (t - s1) / (ARR - s1), sl = 1 - (1 - u) * (1 - u), tau = t - s1;
        out.set(G2.x + (PF.x - G2.x) * sl, hc + 0.015 * Math.sin(tau * 41) * (1 - u), G2.z + (PF.z - G2.z) * sl);
        rx = 0.05 * Math.sin(tau * 18) * Math.exp(-tau) * (1 - u); rz = 0.03 * Math.sin(tau * 13) * Math.exp(-tau) * (1 - u); vg = 2 * (1 - u) * PF.distanceTo(G2) / (ARR - s1);
      } else out.set(PF.x, hc, PF.z);
      return { rx, rz, ry: lacet(Math.min(t, ARR)), vg };
    };
    /* ---------- la feuille morte (easter egg) : l'aile gauche redescend du ciel en se balançant, puis se pose à plat */
    const posFeuille = V3(0, 0, 0), _q = new THREE.Quaternion();
    const feuille = (t) => {
      const d = detachees.find((x) => x.k === 'aileG'); if (!d || E.feuille < 0) return;
      const tau = t - E.feuille, u = borne(tau / DR.aile), p = d.p, cL = centres.aileG || V3(0, 0, 0);
      const amort = 1 - ss(u), y = E.fY0 + (0.06 - E.fY0) * Math.pow(ss(u), 0.8);
      posFeuille.set(E.fX + 1.6 * Math.sin(2.4 * tau) * amort, y, E.fZ + 0.8 * Math.cos(2.4 * tau) * amort);
      p.visible = true; p.rotation.set(0.95 * Math.cos(2.4 * tau) * amort, 0.6 + 0.35 * tau * amort, 0.75 * Math.sin(2.4 * tau) * amort);   // elle se balance : on voit sa face
      p.updateMatrix(); _q.setFromEuler(p.rotation);
      p.position.copy(posFeuille).sub(_cl.copy(cL).multiply(p.scale).applyQuaternion(_q));   // c'est son CENTRE qui suit la trajectoire
    };
    const lancerFeuille = (t, cx, cz) => { E.feuille = t; E.fX = cx; E.fZ = cz; E.fY0 = haut * 1.4 + 4.5; };
    /* ---------- une image du drame */
    const _c = V3(0, 0, 0), _w = V3(0, 0, 0), _t = V3(0, 0, 0);
    const vJ = V3(0, 0, 0), wJ = { r: 0, y: 0, p: 0 };
    const gerbeSol = (c, n) => {                                     // gerbe d'étincelles au point d'impact sur le béton
      for (let i = 0; i < n && etincelles.length < ETINCELLES_MAX; i++) { const a = h() * Math.PI * 2, v = 3 + h() * 9;
        etincelles.push({ p: V3(c.x + (h() - 0.5) * LONG * 0.6, 0.04, c.z + (h() - 0.5) * 2), v: V3(Math.cos(a) * v, 2 + h() * 6, Math.sin(a) * v), age: 0, vie: 0.5 + h() * 0.8 }); }
    };
    const coupe = () => {                                             // la rupture : on quitte le hangar
      E.coupe = true; E.petard = false;
      C3.neuf(); C3.teinte(0);
      voiture.visible = true; voiture.rotation.order = 'YZX';
      if (modele) {
        modele.groupe.position.y = -hc; modele.chassis.position.y = -modele.rayonArriere * TASS; modele.chassis.rotation.set(0, 0, 0);
        for (const w of modele.roues) w.pivot.position.y = w.r * (1 - TASS);
        if (colAv) modele.feux.avant.color.copy(colAv).multiplyScalar(0.8);
      }
      posJet(o, voiture.position); prendrePieces();                    // saumons et centres : mesurés ailes DÉPLOYÉES (état neuf)
      if (AILES) C3.deploiement(0);                                    // puis la voiture apparaît ailes repliées
      if (modele) modele.groupe.visible = true;
      // (V9c) les lumières du conteneur et du hangar cachés (veilleuse, contre-jours du fond) quittent leurs groupes le temps du
      // vol, ÉTEINTES : le nombre de lumières ne change pas, aucun shader n'est recompilé à la coupe ni au retour ; la carte
      // d'ombre de la suspension sodium est figée en vol (aucun projeteur d'ombre à sa portée : elle serait vide à chaque image)
      for (const g of [hangar && hangar.groupe, fret, sol, rivetsEj]) if (g) g.traverse((l) => { if (l.isLight) lumExilees.push({ l, parent: l.parent, pos: l.position.clone(), i: l.intensity }); });
      for (const x of lumExilees) { scene.attach(x.l); x.l.intensity = 0; }
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
      ciel.visible = true; drone.visible = false; for (const x of [hangar && hangar.groupe, fret, sol, rivetsEj]) if (x) x.visible = false;
      for (const w of ONDES) { w.actif = false; w.anneau.visible = w.mur.visible = false; }
      scene.background.set('#9cc3e6'); scene.fog.color.set('#bcd3e8'); scene.fog.density = 0.0011;
      hemi.color.set('#bcd7ff'); hemi.groundColor.set('#6b7a5a'); camera.far = 2600; camera.updateProjectionMatrix();
    };
    const exploserVol = (t) => {
      E.impact = true; E.petard = true;
      const P0 = voiture.position;
      emettre(100, (i) => { const a = h() * Math.PI * 2, r = h(), c = i < 55; return { mat: matPart('#ffffff', texD, true), pos: V3(P0.x + (h() - 0.5) * 3, P0.y + (h() - 0.5) * 2.5, P0.z + (h() - 0.5) * 3),
        vel: V3(Math.cos(a) * (3 + 9 * r) + VJ * 0.25, (c ? 2 : -1) + h() * 7, Math.sin(a) * (3 + 9 * r)), taille: 2.2 + h() * 2.6, croit: 2.2, vie: 0.8 + h() * 0.9, op: 0.3, frein: 2.2, g: 2, rampe: 'feu', tourne: (h() - 0.5) * 1.5 }; });
      emettre(40, () => ({ mat: matPart('#2b2725', texD, false), pos: V3(P0.x + (h() - 0.5) * 4, P0.y + (h() - 0.5) * 3, P0.z + (h() - 0.5) * 4), vel: V3(VJ * 0.15 + (h() - 0.5) * 5, h() * 3, (h() - 0.5) * 5),
        taille: 3 + h() * 3, croit: 2.5, vie: 2.2 + h() * 1.2, op: 0.65, frein: 0.9, tourne: (h() - 0.5) * 0.6 }));
      frapperEcran('#ffae00', t); flashV = Math.max(flashV, 0.45);
      detacher(); drone.visible = false;
      vitJet(t, vJ); vJ.multiplyScalar(0.8); vJ.y = 4; wJ.r = roulisJet(t);
    };
    const retour = () => {                                            // retour dans le hangar : la voiture tombe du haut du cadre
      E.retour = true; ciel.visible = false; soleil.intensity = 0;
      for (const x of [hangar && hangar.groupe, fret, sol, rivetsEj]) if (x) x.visible = true;
      rapatrier(); renderer.shadowMap.autoUpdate = true;              // (V9c) les lumières exilées retournent à leurs groupes
      scene.background.set(0x050505); scene.fog.color.set(0x0a0908); scene.fog.density = 0.027;
      hemi.color.set(0x7d8494); hemi.groundColor.set(0x17120c); camera.far = 400; camera.updateProjectionMatrix();
      for (const d of detachees) d.p.visible = false;                  // les pièces sont restées là-haut (l'une reviendra au freeze)
      if (lisV) lisV.color.set(R.lueur);
    };
    const maj = (t, dt) => {
      if (E.coupe && !E.retour) {
        ciel.position.set(0, 0, 0); dome.position.copy(camera.position);
        for (const he of helices) he.rotation.y += dt * 60;
        if (!E.impact) {
          posJet(t, voiture.position); vitJet(t, _v);
          voiture.rotation.set(roulisJet(t), Math.atan2(-_v.z, _v.x), Math.atan2(_v.y, Math.hypot(_v.x, _v.z)));
          const ua = ouvertureAiles(t); if (AILES) C3.deploiement(ua);   // transformation : les ailes s'ouvrent autour de leurs charnières
          voiture.updateMatrixWorld(true);
          for (const [k, nom] of [['G', 'aileG'], ['D', 'aileD']]) {      // traînées de condensation aux saumons (interpolées entre deux images)
            if (!tips[k]) continue;                                      // (ailes repliées : la traînée part de la pointe dressée et la suit)
            const q = C3.pieces[nom].localToWorld(_tq.copy(tips[k])), prec = tipsPrec[k] || (tipsPrec[k] = q.clone());
            for (let i = 1; i <= 3; i++) { _tx.copy(prec).lerp(q, i / 3); emettre(1, () => ({ mat: matPart('#ffffff', texD, false), pos: _tx, vel: V3(0, 0, 0), taille: 0.45, croit: 3.2, vie: 1.3, op: 0.5, frein: 0, franc: true })); }
            prec.copy(q);
          }
          _w.set(modele ? modele.xArriere - 0.3 : -3, 0.15, 0); voiture.localToWorld(_w);   // flamme du réacteur
          emettre(2, () => ({ mat: matPart(h() < 0.5 ? '#9fd0ff' : '#ffb070', texD, true), pos: _w, vel: V3(-VJ * 0.2 + (h() - 0.5), (h() - 0.5), (h() - 0.5)), taille: 0.55 + h() * 0.3, vie: 0.12, frein: 1, op: 0.9, franc: true }));
          if (t >= DR.drone) {                                          // le drone : il plonge vers son point d'impact, de plus en plus vite
            drone.visible = true;
            const u = borne((t - DR.drone) / (I - DR.drone)), e = Math.pow(u, 1.6);
            drone.position.copy(Ds).lerp(Pi, e); drone.position.y += 2 * Math.sin(u * 9) * (1 - u);
            _t.copy(Pi); drone.lookAt(_t); drone.rotateX(0.35);
            matLed.color.set(Math.floor(t * 8) % 2 ? 0xff2020 : 0x330000);
          }
          if (t >= I) exploserVol(t);
        } else {
          // chute en spirale : la carcasse ralentit, tombe, tourne sur elle-même, crache fumée noire et flammes
          vJ.x *= 1 - 0.45 * dt; vJ.y -= GRAV * dt; voiture.position.addScaledVector(vJ, dt);
          wJ.r += 7 * dt; voiture.rotation.set(wJ.r, voiture.rotation.y + 1.8 * dt, Math.max(-1.1, voiture.rotation.z - 0.9 * dt));
          const P0 = voiture.position;
          emettre(3, () => ({ mat: matPart(h() < 0.75 ? '#1f1c1a' : '#4a4440', texD, false), pos: V3(P0.x + (h() - 0.5), P0.y + (h() - 0.5), P0.z + (h() - 0.5)), vel: V3((h() - 0.5) * 2, 1 + h() * 2, (h() - 0.5) * 2), taille: 1.4 + h() * 1.2, croit: 2.6, vie: 2.4, op: 0.6, frein: 0.8 }));
          emettre(1, () => ({ mat: matPart(h() < 0.5 ? '#ffb347' : '#ff6a10', texD, true), pos: P0, vel: V3((h() - 0.5) * 3, (h() - 0.5) * 3, (h() - 0.5) * 3), taille: 1.0 + h() * 0.8, vie: 0.35, frein: 1.5, op: 0.85, franc: true }));
          C3.teinte(ss((t - DR.teinte[0]) / (DR.teinte[1] - DR.teinte[0])));
          for (const d of detachees) { d.v.y -= GRAV * dt; d.v.multiplyScalar(1 - 0.6 * dt); d.p.position.addScaledVector(d.v, dt); d.p.rotation.x += d.w.x * dt; d.p.rotation.y += d.w.y * dt; d.p.rotation.z += d.w.z * dt; }
          if (t >= DR.retour) retour();
        }
        // pendant le ciel : le hangar est éteint, le soleil éclaire, plus aucune lumière de plateau
        soleil.intensity = 2.0; hemi.intensity = 0.75; cle.intensity = 0; contre.intensity = 0; if (cleV) cleV.intensity = 0; if (lisV) lisV.intensity = 0; interieur.intensity = 0;
        ombre.visible = false;
      }
      if (E.retour) {
        if (!E.arret) {
          const st = etatSol(t, _c);
          voiture.position.copy(_c); voiture.rotation.set(st.rx, st.ry, st.rz);
          C3.teinte(1);
          const surSol = t >= s0;
          ombre.visible = true; ombre.position.set(_c.x, 0.02, _c.z); ombre.rotation.set(-Math.PI / 2, 0, st.ry); ombre.material.opacity = 0.7 * borne(1 - (_c.y - hc) / 5);
          if (surSol && !E.toucheA) { E.toucheA = true; secousse = Math.max(secousse, 0.5); gerbeSol(_c, 90); emettre(22, () => ({ mat: matPart('#8a8378', texD, false), pos: V3(_c.x + (h() - 0.5) * 6, 0.1, _c.z + (h() - 0.5) * 3), vel: V3((h() - 0.5) * 6, 0.5 + h() * 1.5, (h() - 0.5) * 6), taille: 0.8 + h() * 0.8, croit: 2, vie: 1.4 + h(), op: 0.4, frein: 1.4 })); }
          if (t >= s1 && !E.toucheB) { E.toucheB = true; secousse = Math.max(secousse, 0.3); gerbeSol(_c, 50); }
          if (t >= s1 && st.vg > 0.4) {                                  // glissade : étincelles au contact du béton, poussière
            voiture.updateMatrixWorld(true);
            for (let i = 0; i < 6 && etincelles.length < ETINCELLES_MAX; i++) {
              const pc = voiture.localToWorld(V3((h() - 0.5) * LONG * 0.8, -hc + 0.05, (h() - 0.5) * (modele ? modele.largeur : 2) * 0.8)); pc.y = 0.03;
              etincelles.push({ p: pc, v: V3((G2.x - PF.x) * 0.5 * (0.6 + h()) / 5 + (h() - 0.5) * 3, 1.5 + h() * 3.5, (h() - 0.5) * 4), age: 0, vie: 0.4 + h() * 0.5 });
            }
            if (h() < 0.4) emettre(1, () => ({ mat: matPart('#6f6a62', texD, false), pos: V3(_c.x + (h() - 0.5) * 3, 0.15, _c.z + (h() - 0.5) * 2), vel: V3((h() - 0.5), 0.3 + h() * 0.5, (h() - 0.5)), taille: 0.9, croit: 2, vie: 1.6, op: 0.3, frein: 1 }));
          }
          if (t >= ARR) {                                               // immobile : on rend le centre au repère habituel (roues au sol)
            E.arret = true; voiture.rotation.set(0, YAWF, 0); voiture.position.set(PF.x, 0, PF.z); if (modele) modele.groupe.position.y = 0;
            ombre.position.set(PF.x, 0.02, PF.z); ombre.rotation.set(-Math.PI / 2, 0, YAWF); ombre.material.opacity = 0.7;
          }
        }
        // le hangar retrouve sa lumière ordinaire (aucune chute de tension), le conteneur reste doré, ses fuites sont éteintes
        etat.noirS = 0; uPeinture.uLueur.value = 0;
        const kF = 0; matFente.opacity *= kF; matRai.opacity *= kF; matFlaque.opacity *= kF;
        if (t < D.trappeDebut) interieur.intensity = 0;
        if (!etat.univers) { cle.intensity = BASE.cle * (1 - 0.65 * borne((t - D.pose) / 1.5)); contre.intensity = BASE.contre; hemi.intensity = BASE.hemi * 1.6; }
        if (cleV) cleV.intensity = 1.25; if (lisV) lisV.intensity = 0.8;
        if (!trailer && t >= D.titre && E.feuille < 0) lancerFeuille(t, voiture.position.x + LONG * 0.3, voiture.position.z + 2.2);   // fiche Fret : la feuille morte tombe au titre
        feuille(t);
      }
      // le conteneur était VIDE : personne dedans pendant le suspense. (V9c) on cache le MODÈLE, pas le groupe : la lumière de
      // liseré attachée à la voiture reste dans la scène, éteinte — le nombre de lumières ne change pas à la coupe
      if (!E.coupe) { voiture.visible = true; if (modele) modele.groupe.visible = false; if (lisV) lisV.intensity = 0; ombre.visible = false; }
    };
    const avant = () => {                                             // avant la coupe : les fuites dorées meurent avec le silence
      if (D.ouvre - 0.01 <= tCourant) { const kF = 0; matFente.opacity *= kF; matRai.opacity *= kF; matFlaque.opacity *= kF; }
    };
    /* ---------- caméras du drame (posées APRÈS la caméra du hangar : elles la remplacent) */
    const _cam = V3(0, 0, 0), _cib = V3(0, 0, 0);
    const cameraFinale = (t, dt) => {
      if (!E.coupe) return;
      let fov = 40, tremb = 0;
      if (!E.retour) {
        const pl = DR.plans.find((p) => t >= p.t0 && t < p.t1) || DR.plans[DR.plans.length - 1], J = voiture.position;
        if (pl.id === 'poursuite') { _cam.copy(J).add(V3(-17, 4.5 + 0.8 * Math.sin(t * 1.7), 8)); _cib.copy(J).add(V3(10, 0, 0)); fov = 52; }
        else if (pl.id === 'survol') { posJet(DR.passage, _cam).add(V3(4, -5, 15)); _cib.copy(J); fov = 36; }
        else if (pl.id === 'alerte') { _cam.copy(J).add(V3(6, 9, 40)); _cib.copy(J).lerp(drone.visible ? drone.position : J, 0.45); fov = 50; }   // plan large : la proie et le drone dans le même cadre
        else { _cam.copy(Pi).add(V3(34, 8, 44)); _cib.copy(J); fov = 34 - 6 * borne((t - I) / 1.6); }
        if (E.impact) tremb = 0.9 * Math.exp(-(t - I) / 0.45);
        if (AILES && DR.clacs) for (const c of DR.clacs) if (t >= c) tremb += 0.14 * Math.exp(-(t - c) / 0.07);   // les charnières claquent
      } else {
        const kp = ss((t - ARR) / Math.max(0.5, D.trappe - ARR));
        _cam.set(XA + 18 - 4.5 * kp, 4.2 - 0.8 * kp, 16 - 3.5 * kp);
        _cib.set(XA + 9 - 1.5 * kp + 0.4 * Math.sin(t * 0.06), 1.4 + 0.2 * kp, 1.2 - 0.6 * kp);
        if (!trailer && t > D.pose) { const a = (t - D.pose) * 0.05; _cam.x += Math.sin(a) * 1.2; _cam.z -= Math.sin(a) * 0.6; }
        fov = 40 - 4 * kp;
        tremb = (t >= s0 ? 0.5 * Math.exp(-(t - s0) / 0.35) : 0) + (t >= s1 ? 0.25 * Math.exp(-(t - s1) / 0.3) : 0) + (t >= s1 && t < ARR ? 0.03 : 0);
      }
      if (tremb > 0) { _cam.x += Math.sin(t * 67) * tremb; _cam.y += Math.sin(t * 53 + 1) * tremb * 0.7; }
      camera.position.copy(_cam); camera.up.set(0, 1, 0); camera.lookAt(_cib);
      if (!E.retour) dome.position.copy(_cam);                         // le dôme du ciel suit l'objectif
      if (!E.retour && DR.plans[0] && t < DR.plans[0].t1) camera.rotateZ(-0.06 * Math.sin(t * 2.1));   // la caméra de poursuite s'incline avec le roulis
      camera.fov = fov; camera.updateProjectionMatrix();
    };
    /* ---------- réticule de verrouillage (surcouche) pendant l'approche du drone */
    const _pr = V3(0, 0, 0);
    const hud = (g, W, Hc, s, t) => {
      if (!(E.coupe && !E.impact && t >= DR.plans[2].t0)) return;
      const coin = (x, y, r, col, lw) => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(x + sx * r, y + sy * r * 0.7); g.lineTo(x + sx * r, y + sy * (r * 0.7 - 18 * s)); g.moveTo(x + sx * r, y + sy * r * 0.7); g.lineTo(x + sx * (r - 22 * s), y + sy * r * 0.7); }
        g.stroke();
      };
      const k = borne((t - DR.plans[2].t0) / (I - DR.plans[2].t0)), clign = Math.floor(t * (6 + 10 * k)) % 2 === 0;
      _pr.copy(voiture.position).project(camera);
      if (_pr.z < 1) {
        const x = (_pr.x + 1) / 2 * W, y = (1 - _pr.y) / 2 * Hc, r = (150 - 70 * k) * s;
        coin(x, y, r, clign ? '#ff2a2a' : '#ff8a8a', 4 * s);
        g.font = `800 ${Math.round(24 * s)}px "Bahnschrift","Arial Narrow",Arial,sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ff3b3b';
        if (clign || k > 0.85) g.fillText(k > 0.85 ? 'VERROUILLÉ' : 'ALERTE · DRONE KAMIKAZE', x, y - r * 0.7 - 14 * s);
      }
      if (drone.visible) { _pr.copy(drone.position).project(camera); if (_pr.z < 1) { const x = (_pr.x + 1) / 2 * W, y = (1 - _pr.y) / 2 * Hc; g.strokeStyle = '#ffd34d'; g.lineWidth = 2 * s; g.beginPath(); g.arc(x, y, 26 * s, 0, 7); g.stroke(); } }
    };
    const figer = (t) => {                                            // arrêt sur image : la feuille morte part de très haut, au-dessus du bolide
      E.fige = t;
      const c = orbite ? orbite.c : voiture.position;
      lancerFeuille(t, c.x + LONG * 0.3, c.z + 1.6);
      if (pasFixe) window.__fretDrame = { scenario: 'crash', centre: c.toArray ? c.toArray() : null };
    };
    const majFige = (t) => { feuille(t); };
    const desat = (t) => (trailer ? (E.fige > 0 ? 0.6 * ss((t - E.fige) / 0.6) : 0) : 0.6 * ss((t - D.pose) / 1.2));
    // (V9c) préchauffe GPU : le ciel, le drone et la voiture NEUVE (ailes, dérive, verrière) sont compilés MAINTENANT, avec le jeu
    // de lumières définitif (soleil compris) : plus aucune compilation de shader à la coupe, à l'arrivée du drone ni au retour
    try { ciel.visible = true; drone.visible = true; C3.neuf(); renderer.compile(scene, camera); }
    catch (e) { /* ancienne version de three : la compilation se fera à la première image */ }
    finally { C3.epave(); ciel.visible = false; drone.visible = false; }
    return { petard: coupe, maj: (t, dt) => { avant(); maj(t, dt); }, extinction: () => (E.coupe && !E.retour ? EXT_NUL : EXT_PLEIN), secousseVoiture: () => ({ y: 0, r: 0 }),
      enjoliveurPart: () => {}, figer, majFige, desat, camera: () => {}, cameraFinale, restaurer, dessiner: creerBadgeDrame(E, hud) };
  }
  const EXT_NUL = { spot: 0, lointaines: [0, 0], lampes: [0, 0, 0, 0, 0, 0, 0, 0, 0] }, EXT_PLEIN = { spot: 1, lointaines: [1, 1], lampes: [1, 1, 1, 1, 1, 1, 1, 1, 1] };

  /* --- MODE DRAME : le badge, dessiné sur sa propre surcouche (filmée avec le reste) — il grimpe palier après palier jusqu'à
     « ◆◆◆◆ LÉGENDAIRE » (aux vraies couleurs des paliers), tremble avec le séisme, se fissure, perd un losange à chaque « wah » du
     trombone, se brise en deux ; le badge Épave (tôle rouillée rivetée) s'abat à sa place et le tampon « DÉCLASSÉ » s'imprime de
     travers. Fonction pure du temps (fissures et usure de l'encre tirées d'un générateur à graine). */
  function creerBadgeDrame(E, extra = null) {
    const g = cvDrame.getContext('2d'), TIERS = ['standard', 'rare', 'epique', 'legendaire'];
    const ss = (u) => { const x = borne(u); return x * x * (3 - 2 * x); };
    const rebondit = (x) => { const n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375; return n1 * (x -= 2.625 / d1) * x + 0.984375; };
    let W = 0, Hc = 0, s = 1, encre = null;
    let a = 1234567; const al = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
    const FISSURES = DR.fissures.map((_, i) => {                     // en fraction de la demi-plaque (u, v ∈ ≈ [-1, 1])
      const u0 = [-0.35, 0.42, 0.05][i % 3], v0 = [-0.2, 0.25, -0.5][i % 3], br = [];
      for (let b = 0; b < 4; b++) { const pts = [[u0, v0]]; let u = u0, v = v0, an = al() * Math.PI * 2; for (let k = 0; k < 6; k++) { an += (al() - 0.5) * 1.1; u += Math.cos(an) * 0.12; v += Math.sin(an) * 0.35; pts.push([u, v]); } br.push(pts); }
      return br;
    });
    const BOSSES = Array.from({ length: 25 }, () => (al() - 0.5));      // contour cabossé de la plaque Épave
    const COULURES = Array.from({ length: 9 }, () => [al(), 0.2 + al() * 0.6, 0.3 + al() * 0.7]);
    const texteEpave = String(R.court || 'ÉPAVE').replace(/\p{Extended_Pictographic}️?/gu, '').trim().toUpperCase();
    const tCl = (D.detonations.find((x) => x.type === 'climax') || { t: 1e9 }).t;
    const taille = () => {
      const w = el.clientWidth || innerWidth, hh = el.clientHeight || innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const nw = Math.round(w * dpr), nh = Math.round(hh * dpr);
      if (nw !== W || nh !== Hc) { W = cvDrame.width = nw; Hc = cvDrame.height = nh; s = Hc / 1080; encre = null; }
    };
    const police = () => `900 ${Math.round(40 * s)}px "Arial Black", Impact, sans-serif`;
    const geometrie = (tier) => { g.font = police(); const nom = tier === 0 ? 'STANDARD' : RARETES[TIERS[tier]].court, tw = g.measureText(nom).width, nD = tier + 1, dsp = 30 * s, pad = 28 * s; return { nom, tw, nD, dsp, pad, w: pad * 2 + nD * dsp + 14 * s + tw, hgt: 74 * s }; };
    const chemin = (x, y, w, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + hh - r); g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };
    const losange = (cx, cy, d, couleur, lueur, rot = 0) => {
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4 + rot); g.shadowColor = lueur; g.shadowBlur = 12 * s; g.fillStyle = couleur; g.fillRect(-d / 2, -d / 2, d, d);
      g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-d / 2, -d / 2, d / 2, d / 2); g.restore();
    };
    /** plaque d'un palier centrée en (0, 0) : terne 0 (gloire) → 1 (or terni), tombes = losanges déjà partis (par la droite) */
    const plaque = (tier, t, terne = 0, tombes = 0) => {
      const G = geometrie(tier), x = -G.w / 2, y = -G.hgt / 2, P0 = RARETES[TIERS[tier]], legend = tier === 3;
      chemin(x, y, G.w, G.hgt, 16 * s);
      if (legend) {
        const lg = g.createLinearGradient(x, 0, x + G.w, 0), sh = 0.15 + 0.7 * ((t * 0.35) % 1);
        lg.addColorStop(0, '#5a3a06'); lg.addColorStop(sh - 0.13, '#a8700a'); lg.addColorStop(sh, terne > 0 ? '#a8894a' : '#ffe08a'); lg.addColorStop(sh + 0.13, '#a8700a'); lg.addColorStop(1, '#5a3a06');
        g.fillStyle = lg;
      } else g.fillStyle = 'rgba(10,12,24,.84)';
      g.shadowColor = P0.lueur; g.shadowBlur = (legend ? 34 : 18) * s * (1 - terne); g.fill(); g.shadowBlur = 0;
      if (terne > 0) { g.fillStyle = `rgba(58,48,40,${(0.6 * terne).toFixed(3)})`; g.fill(); }
      g.lineWidth = 3 * s; g.strokeStyle = terne > 0.5 ? '#8a7350' : P0.couleur; g.stroke();
      for (let i = 0; i < G.nD - tombes; i++) losange(x + G.pad + G.dsp * (i + 0.5), 0, 20 * s, legend ? (terne > 0 ? '#c9a24a' : '#fff1b8') : P0.couleur, P0.lueur);
      g.font = police(); g.textBaseline = 'middle'; g.textAlign = 'left'; g.shadowColor = P0.lueur; g.shadowBlur = 16 * s * (1 - terne);
      g.fillStyle = legend ? (terne > 0.3 ? '#e8dcc0' : '#fffaf0') : '#ffffff'; g.fillText(G.nom, x + G.pad + G.dsp * G.nD + 14 * s, 2 * s); g.shadowBlur = 0;
      return G;
    };
    const fissures = (G, t) => {
      g.save(); chemin(-G.w / 2, -G.hgt / 2, G.w, G.hgt, 16 * s); g.clip();
      DR.fissures.forEach((tf, i) => {
        if (t < tf) return;
        const k = ss((t - tf) / 0.12);
        for (const br of FISSURES[i]) {
          const n = Math.max(2, Math.ceil(br.length * k));
          g.beginPath(); for (let j = 0; j < n; j++) { const px = br[j][0] * G.w / 2, py = br[j][1] * G.hgt / 2; if (j) g.lineTo(px, py); else g.moveTo(px, py); }
          g.strokeStyle = 'rgba(25,14,4,.92)'; g.lineWidth = 2.6 * s; g.stroke();
          g.save(); g.translate(1.2 * s, 1.2 * s); g.strokeStyle = 'rgba(255,240,200,.35)'; g.lineWidth = 1 * s; g.stroke(); g.restore();
        }
      });
      g.restore();
    };
    const plaqueEpave = (t) => {
      const tau = t - DR.badgeEpave, kc = borne(tau / 0.32), chute = (1 - rebondit(kc)) * -260 * s;
      g.font = `900 ${Math.round(36 * s)}px "Bahnschrift","Arial Narrow",Impact,sans-serif`;
      const tw = g.measureText(texteEpave).width, w = tw + 124 * s, hh = 84 * s, ang = -0.035 + 0.045 * Math.sin(tau * 2.4) * Math.exp(-tau / 5);
      g.save(); g.translate(0, chute); g.rotate(ang);
      g.beginPath();                                                     // tôle cabossée : contour bosselé (graine fixe)
      for (let i = 0; i < BOSSES.length; i++) {
        const u = i / BOSSES.length, j = BOSSES[i] * 5 * s;
        const [px, py] = u < 0.25 ? [-w / 2 + w * u * 4, -hh / 2 + j] : u < 0.5 ? [w / 2 + j, -hh / 2 + hh * (u - 0.25) * 4] : u < 0.75 ? [w / 2 - w * (u - 0.5) * 4, hh / 2 + j] : [-w / 2 + j, hh / 2 - hh * (u - 0.75) * 4];
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.closePath();
      const lg = g.createLinearGradient(0, -hh / 2, 0, hh / 2); lg.addColorStop(0, '#9a5630'); lg.addColorStop(0.55, '#5a2f17'); lg.addColorStop(1, '#3a1d0e');
      g.fillStyle = lg; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18 * s; g.shadowOffsetY = 6 * s; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
      g.lineWidth = 3 * s; g.strokeStyle = '#2b1d14'; g.stroke();
      g.save(); g.clip();
      for (const [cx, l, o] of COULURES) { g.fillStyle = `rgba(30,14,6,${(0.25 * o).toFixed(3)})`; g.fillRect(-w / 2 + cx * w, -hh / 2, 5 * s, hh * l); }   // coulures de rouille
      g.restore();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillStyle = '#2b1d14'; g.beginPath(); g.arc(sx * (w / 2 - 13 * s), sy * (hh / 2 - 13 * s), 5 * s, 0, 7); g.fill(); g.fillStyle = 'rgba(255,220,180,.35)'; g.beginPath(); g.arc(sx * (w / 2 - 13 * s) - 1.5 * s, sy * (hh / 2 - 13 * s) - 1.5 * s, 2 * s, 0, 7); g.fill(); }
      const xi = -w / 2 + 44 * s;                                        // l'écrou (pas d'emoji : il est dessiné)
      g.fillStyle = '#b9bcc0'; g.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(xi + Math.cos(an) * 19 * s, Math.sin(an) * 19 * s); } g.closePath(); g.fill();
      g.strokeStyle = '#4a4d52'; g.lineWidth = 2 * s; g.stroke(); g.fillStyle = '#3a2416'; g.beginPath(); g.arc(xi, 0, 8 * s, 0, 7); g.fill();
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#1e120a'; g.fillText(texteEpave, xi + 32 * s + 2 * s, 5 * s);
      g.fillStyle = '#f1dcc0'; g.fillText(texteEpave, xi + 32 * s, 3 * s);
      g.restore();
    };
    const preparerEncre = () => {
      const c = document.createElement('canvas'), w = Math.max(8, Math.round(330 * s)), hh = Math.max(4, Math.round(120 * s)); c.width = w; c.height = hh;
      const t2 = c.getContext('2d'); t2.strokeStyle = t2.fillStyle = '#c1121f';
      t2.lineWidth = 7 * s; t2.strokeRect(6 * s, 6 * s, w - 12 * s, hh - 12 * s); t2.lineWidth = 2.5 * s; t2.strokeRect(16 * s, 16 * s, w - 32 * s, hh - 32 * s);
      t2.textAlign = 'center'; t2.textBaseline = 'middle'; let f = 70 * s;
      do { t2.font = `900 ${Math.round(f)}px Impact,"Arial Black",sans-serif`; f *= 0.95; } while (t2.measureText('DÉCLASSÉ').width > w - 50 * s && f > 10);
      t2.fillText('DÉCLASSÉ', w / 2, hh / 2 + 3 * s);
      t2.globalCompositeOperation = 'destination-out'; let b = 99; const al2 = () => ((b = (b * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0, n = Math.max(60, Math.round(900 * s * s)); i < n; i++) { t2.fillStyle = `rgba(0,0,0,${(0.3 + al2() * 0.6).toFixed(3)})`; t2.fillRect(al2() * w, al2() * hh, (1 + al2() * 3) * s, (1 + al2() * 2) * s); }   // encre usée
      encre = c;
    };
    const tampon = (t) => {
      if (!encre) preparerEncre();
      const k = borne((t - DR.tampon) / 0.09), z = 2.4 - 1.4 * k * k;
      g.save(); g.translate(150 * s, 46 * s); g.rotate(-0.24); g.scale(z * 0.9, z * 0.9); g.globalAlpha = Math.min(1, 0.35 + k);
      g.drawImage(encre, -encre.width / 2, -encre.height / 2); g.restore();
    };
    return (t) => {
      taille(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, Hc);
      const nP = D.paliers.filter((p) => p <= t).length;
      if (!nP) return;
      const tier = Math.min(3, nP - 1), tPal = D.paliers[nP - 1];
      let Y = Hc * 0.1, ech = 1;
      if (trailer && E.fige > 0) { const k = ss((t - E.fige) / 0.45); Y = Hc * (0.1 + 0.7 * k); ech = 1 - 0.15 * k; }   // l'arrêt sur image : au bas de l'écran (au-dessus de l'invite « Espace »)
      let X = W / 2;
      if (!trailer && t > D.titre) { const k = ss((t - D.titre) / 0.6); ech = 1 - 0.18 * k; Y = Hc * (0.1 - 0.025 * k); X = W * (0.5 + 0.23 * k); }   // fiche Fret : la plaque cède la gauche à la fiche
      let dx = 0, dy = 0;
      if (t > tCl && t < D.silence) { const k = (t - tCl) / (D.silence - tCl); dx = Math.sin(t * 61) * 4 * s * k; dy = Math.sin(t * 47 + 1) * 3 * s * k; }   // séisme du climax
      if (t > DR.tampon && t < DR.tampon + 0.18) { const k = 1 - (t - DR.tampon) / 0.18; dx += Math.sin(t * 90) * 7 * s * k; dy += Math.cos(t * 77) * 5 * s * k; }
      g.save(); g.translate(X + dx, Y + dy); g.scale(ech, ech);
      if (t < DR.badgeChute) {
        const kA = borne((t - tPal) / 0.22), z = 1 + 0.35 * Math.pow(1 - kA, 2) * (1 + 0.6 * Math.sin(kA * 9));
        const tombes = DR.losanges.filter((x) => t >= x).length;
        const terne = E.petard ? Math.min(1, ss((t - (E.tTerne ?? DR.petard)) / 1.6) * 0.75 + 0.25 * tombes / 4) : 0;   // (crash : l'or se ternit à l'impact)
        g.save(); g.scale(z, z); const G = plaque(tier, t, terne, tombes); fissures(G, t); g.restore();
        for (let i = 0; i < tombes; i++) {                                 // chaque losange part sur un « wah »
          const idx = G.nD - 1 - i, tau = t - DR.losanges[i], x0 = -G.w / 2 + G.pad + G.dsp * (idx + 0.5);
          const gy = -110 * s * tau + 1300 * s * tau * tau; if (gy > Hc) continue;
          losange(x0 + (-30 + 22 * i) * s * tau, gy, 20 * s, '#b8953f', '#000', tau * (5 + i));
        }
      } else if (t < DR.badgeChute + 1.3) {                                // la plaque cède en deux
        const tau = t - DR.badgeChute, G = geometrie(3);
        for (const cote of [-1, 1]) {
          g.save(); g.translate(cote * 40 * s * tau, -100 * s * tau + 1300 * s * tau * tau); g.rotate(cote * tau * 1.4); g.globalAlpha = 1 - borne((tau - 0.8) / 0.5);
          g.beginPath(); g.moveTo(cote * G.w, -G.hgt); for (const [u, v] of [[0.05, -1.2], [-0.04, -0.5], [0.06, 0], [-0.05, 0.5], [0.03, 1.2]]) g.lineTo(u * G.w / 2, v * G.hgt / 2); g.lineTo(cote * G.w, G.hgt); g.closePath(); g.clip();
          plaque(3, t, 1, 4); fissures(G, t); g.restore();
        }
      }
      if (t >= DR.badgeEpave) plaqueEpave(t);
      if (t >= DR.tampon) tampon(t);
      g.restore();
      if (extra) extra(g, W, Hc, s, t);                                 // crash : réticule de verrouillage du drone
    };
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
      majPeinture(t);                                                    // incandescence et surchauffe de la tôle (MODE EXPLOSION)
      if (pasFixe) window.__fretTc = t;                                  // contrôle image par image : instant atteint
      if (t >= D.tenue && !etat.attente) { etat.attente = true; el.classList.add('attente'); }
      if (demande || (tenueAuto != null && t >= D.tenue + tenueAuto)) { terminer(); return; }

      if (trailer && fige) {             // ARRÊT SUR IMAGE : temps quasi suspendu, caméra en micro-orbite, carton fixe
        tLent += dt * 0.04;
        const kf = t - D.freeze; camera.fov = (orbite && orbite.fov ? orbite.fov : 30) + 7 * Math.exp(-kf * 8) * Math.cos(kf * 13); camera.updateProjectionMatrix();   // V6 : la focale propre au cadrage est conservée pendant l'arrêt sur image
        placerOrbite(kf);
        majParts(dt * 0.04); particulesSignature(dt * 0.04, 0.2, (modele ? modele.largeur : 2) + 1.5);
        if (decor && etat.univers) { decor.maj(D.freeze + tLent, dt * 0.04, camera, cv.height); if (miroirCar) miroirCar.sync(); }
        if (modele) modele.maj(dt * 0.04, 0, D.freeze + tLent, 0);
        if (DRAME) drame.majFige(t, dt, D.freeze + tLent);
        majPost(t, dt); post.scene(scene, camera); post.passe();
        surcouche.dessiner({ phase: 'freeze', k: t - D.freeze, focus: focusFige, dt });
        if (DRAME) drame.dessiner(t);
        if (pasFixe && window.__fretCapture) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g2 = c2.getContext('2d'); g2.drawImage(cv, 0, 0); if (ov) g2.drawImage(ov, 0, 0, c2.width, c2.height); if (cvDrame) g2.drawImage(cvDrame, 0, 0, c2.width, c2.height); window.__fretImage = { t, url: c2.toDataURL('image/jpeg', 0.92) }; }
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
      if (DRAME) drame.camera(t, cam, cib);                             // MODE DRAME : lent travelling avant sur le désastre
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
        while (etat.det + 1 < D.detonations.length && t >= D.detonations[etat.det + 1].t) {     // MODE EXPLOSION : palier, rafale du climax, titan
          const x = D.detonations[++etat.det];
          exploser(x, t);                                                              // peinture sous l'impact, onde, strobe, projections, décrochage
          if (x.type === 'palier' && rang >= 3) etincellesCales(10 + rang * 6);
          if (x.type === 'titan') { etincellesCales(46); fumee(12, -L / 2 + 1, dalle, 0, 1.6); }
        }
        if (rang === 4 && prog > 0.6 && hasard() < 0.25) etincellesCales(2);
        while (etat.coeur + 1 < D.battements.length && t >= D.battements[etat.coeur + 1]) etat.coeur++;
        const dC = etat.coeur >= 0 ? t - D.battements[etat.coeur] : 99;
        const pouls = Math.exp(-dC * 7) + (dC > 0.16 ? 0.55 * Math.exp(-(dC - 0.16) * 9) : 0);   // lub-dub, synchrone du cœur sonore
        const muet = t >= D.silence && t < D.ouvre;                    // silence de mort : tout se fige
        // lumière : intensité de base qui monte, crépitement après chaque palier
        const crepite = choc > 0.02 ? (hasard() < 0.5 ? 0.25 : 1) : 0.85 + 0.15 * Math.sin(t * 23);
        const force = (0.25 + 0.75 * prog) * crepite * (0.55 + 0.45 * Math.min(1, pouls)), jE = ressort(t).env;      // les rais battent avec le cœur ; à chaque à-coup, le jour s'engouffre
        const fige = muet ? 0.12 : 1;
        matFente.opacity = Math.min(1, force * 0.5 + jE) * fige; matRai.opacity = Math.min(1, 0.22 * force + 0.7 * jE) * fige; matFlaque.opacity = Math.min(0.9, 0.2 * force + 0.55 * jE) * fige;
        interieur.color.copy(couleurFuite); interieur.intensity = (0.4 + 1.2 * prog + 2.2 * jE + 0.8 * pouls) * fige;
        // CHUTE DE TENSION (Épique et au-delà) : les lampes du hangar faiblissent avec la montée et vacillent à chaque coup de bélier
        if (rang >= 2) {
          const base = (0.18 + 0.12 * (rang - 2)) + (0.3 + 0.08 * (rang - 2)) * prog;
          etat.noirS = Math.min(0.93, muet ? 0.9 : base + (jE > 0.35 && hasard() < 0.55 ? 0.3 * jE : 0) + (hasard() < 0.012 * rang ? 0.35 : 0));
        }
        fentes.forEach((f) => { f.phase += dt * 9; });
      } else if (t >= D.trappe) { const k = borne((t - D.trappe) / 0.6); matFente.opacity *= 1 - k; matRai.opacity *= 1 - k; matFlaque.opacity *= 1 - k; }
      if (t >= D.ouvre) etat.noirS = Math.max(0, (etat.noirS || 0) - dt * 1.6);     // la lumière revient avec la déflagration
      if (t >= D.silence && t < D.ouvre) tremble *= 0.1;                               // l'action se fige pendant le silence
      uPeinture.uLueur.value = 0.2 * (etat.noirS || 0) * (t >= D.silence && t < D.ouvre ? 0.5 : 1);                               // la caisse incandescente brille seule dans le noir
      choc = Math.max(0, choc - dt * 0.9);
      const amp = tremble + choc * 0.4, rs = t >= D.arrivee && t < D.ouvre + 0.2 ? ressort(t) : null;
      if (t >= D.arrivee) {
        fret.position.x = (hasard() - 0.5) * amp; fret.position.z = (hasard() - 0.5) * amp * 0.6; fret.position.y += Math.abs(hasard() - 0.5) * choc * 0.2; fret.rotation.x = (hasard() - 0.5) * amp * 0.08; fret.rotation.z = 0;
        if (rs) { fret.position.x += rs.x; fret.position.y += rs.y; fret.position.z += rs.z; fret.rotation.z = rs.rz; fret.rotation.x += rs.rx; }
      }
      if (rang >= 2) { cam.x += (hasard() - 0.5) * tremble * (rang - 1) * 0.5; cam.y += (hasard() - 0.5) * tremble * (rang - 1) * 0.3; }   // frémissement fin seulement : les impacts passent par le ressort
      if (rs) { cam.x += rs.x * 1.1; cam.y += rs.y * 1.6 + rs.rx * 2; }
      if (secousse > 0) { cam.x += (hasard() - 0.5) * secousse; cam.y += (hasard() - 0.5) * secousse * 0.7; secousse = Math.max(0, secousse - dt * 1.8); }
      if (palier === 'relique_interdite' && t > D.sortie && t < D.sortie + 0.6) { cam.x += (hasard() - 0.5) * 0.4; cam.y += (hasard() - 0.5) * 0.3; }
      if (t >= D.ouvre + 0.2 && fret.position.x !== 0) { fret.position.set(0, 0, 0); fret.rotation.set(0, 0, 0); }

      // ---------- 2. le scellé vole en éclats (d'abord), puis le rideau s'enroule entièrement dans le coffre
      const te = t - D.ouvre;
      for (const e of eclats) {
        if (te < 0 || DRAME) continue;                                   // MODE DRAME : le scellé ne vole pas en éclats
        e.m.position.set(e.x0 + e.v.x * te, H + 0.007 + e.v.y * te - 4.9 * te * te, e.z0 + e.v.z * te);
        e.m.rotation.set(e.w.x * te, e.w.y * te, e.w.z * te);
        for (const mt of e.m.material) mt.opacity = 1 - borne(te / 0.55);
        e.m.visible = te < 0.55;
      }
      if (te >= 0 && !etat.dechire) {                                     // scellé : rang ≥ 3 → l'explosion titanesque est dans D.detonations
        etat.dechire = true;
        if (DRAME) drame.petard(t);                                        // MODE DRAME : pétard mouillé
        else if (!D.detonations.some((x) => x.type === 'titan')) exploser({ type: 'scelle', k: 0, niveau: rang, force: 0.55, surchauffe: 0 }, t);
      }
      const prog_ = (x) => (DR && !CRASH ? progressionRideauDrame(x, DR) : progressionRideau((x - D.trappeDebut) / (D.trappe - D.trappeDebut)));   // MODE DRAME : rideau coincé
      const prRideau = prog_(t);
      const tr = prRideau * (hO + hL), enMouv = prRideau > 0 && prRideau < 1 && Math.abs(prRideau - prog_(t - dt)) > 0.0004;
      const grippe = DR && t >= DR.blocage && t < DR.fin[0] ? 0.006 * Math.sin(t * 47) * (t < DR.lame[0] ? 1 : 0.3) : 0;     // bloqué à mi-hauteur : il tremble en grinçant
      for (const l of lames) { if (l.libre) continue; const y = l.y0 + tr + grippe; l.m.position.y = y; l.m.position.x = xO + 0.08 + (enMouv || grippe ? (hasard() - 0.5) * 0.012 : 0); l.m.visible = y - hL / 2 < yLinteau - 0.01; }
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
      if (t >= D.trappe && !etat.trappeOk) { etat.trappeOk = true; fumee(DRAME ? 6 : express ? 18 : 34, xO - 0.6, dalle + 0.3, 0, DRAME ? 0.5 : 1); }
      if (etat.trappeOk && t < D.titre && hasard() < (DRAME ? 0.08 : 0.35)) fumee(1, xO - 0.4, dalle + 0.2, 0, 0.8);

      if (DRAME) drame.maj(t, dt);                                      // MODE DRAME : lumières qui meurent, tôle rouillée, ampoule, lame, toux, phares
      // ---------- 2 bis. OUVERTURE SOLENNELLE : pschitt, fumée dense, contre-jour, phares qui claquent, coup d'accélérateur, dernier rugissement
      let vBlip = 0, shY = 0, shR = 0;
      if (t >= D.trappeDebut && !DRAME) {                                // (MODE DRAME : remplacée par la chute, voir drame.maj)
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
          else { vBlip = Math.max(vBlip, 13 * envB); shY += 0.014 * envB * Math.sin(t * 73); shR -= 0.02 * envB; if (envB > 0.45 && hasard() < 0.7) fumeeEchappement(1); }
          if (t >= la.t0 + 0.08 && t < D.sortie) {
            const rv = borne((t - la.t0 - 0.08) / 0.55);
            if (!etat.rugit) { etat.rugit = true; flashV = Math.max(flashV, 0.3); }
            vBlip = Math.max(vBlip, 10 * rv); shY += 0.016 * rv * Math.sin(t * 81); shR -= 0.014 * rv * (0.6 + 0.4 * Math.sin(t * 29)); secousse = Math.max(secousse, 0.07 * rv);
            if (hasard() < 0.8) fumeeEchappement(rv > 0.5 ? 2 : 1);
            for (let i = 0; i < 2; i++) flaresPh[i].scale.setScalar(flaresPh[i].scale.x * (1 + 0.5 * rv));
          }
        }
      }

      // ---------- 3. sortie du bolide (roulage), franchissement du seuil = signature du bolide
      const ap = borne((t - D.sortie) / (D.pose - D.sortie));
      let posEffet;
      if (roulage && !CRASH) {                                           // (crash : la voiture est pilotée par le drame)
        const w = DR ? tempsSortieDrame(t - D.sortie, DR) : null;          // MODE DRAME : chaque quinte de toux l'arrête presque
        const e = roulage.pas(w ? w.t : Math.max(0, t - D.sortie), t >= D.sortie ? dt : 0);
        if (w) e.v *= w.k;
        voiture.position.x = e.x;
        modele.chassis.position.y = e.chassis.y - modele.rayonArriere * TASS; modele.chassis.rotation.z = e.chassis.tangage;
        for (const w of modele.roues) w.pivot.position.y = (w.avant ? e.roues.av : e.roues.ar) - w.r * TASS;
        if (modele.fam === 'helico') {                                    // l'hélico glisse sur la dalle, ne décolle qu'une fois dehors
          const dehors = lisse(borne((e.x + modele.xArriere - xO) / 1.2));
          modele.chassis.position.y = dalle + 1.6 * dehors * (1 - borne((t - D.pose) / 2.5) * 0.35) + Math.sin(t * 2.4) * 0.05 * dehors;
          modele.chassis.rotation.z = -0.06 * dehors * (1 - ap);
        }
        if (DRAME) { const c = drame.secousseVoiture(t); shY += c.y; shR += c.r; modele.chassis.position.y += shY; modele.chassis.rotation.z += shR; }
        else if (t < D.sortie) { modele.chassis.position.y += shY; modele.chassis.rotation.z += shR; }
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
        if (DRAME) { secousse = Math.max(secousse, 0.12); coupZoom = 2; drame.enjoliveurPart(t); }   // MODE DRAME : aucun flash ; le choc du seuil arrache l'enjoliveur
        else { flashV = Math.max(flashV, trailer ? 0.6 : 0.4); secousse = Math.max(secousse, trailer ? 0.45 : 0.25); coupZoom = 8; }
      }
      if (trailer && t >= D.bascule + D.dech && !etat.univers) {         // la déchirure est complète : le décor appartient à l'univers
        etat.univers = true; flashV = Math.max(flashV, 0.35);
        scene.background.set(A.fond); scene.fog.color.set(A.brouillard); scene.fog.density = 0.028; contre.color.set(A.lumiere);
        if (decor && decor.ambiance) {                               // V6 : contre-jour du bolide et étalonnage de l'image aux gélatines de l'ambiance
          contre.color.set(decor.ambiance.lumieres[1]);
          post.u.gel1.value.set(decor.ambiance.lumieres[0]); post.u.gel2.value.set(decor.ambiance.lumieres[1]); post.u.gelForce.value = 0.9;
        }
        if (hangar) hangar.basculer();                                // le hangar s'efface : l'univers prend toute la place
        hemi.color.set(0x8090ff); hemi.groundColor.set(0x100818); if (decor && decor.ambiance) hemi.color.lerp(new THREE.Color(decor.ambiance.lumieres[0]), 0.45); BASE.cle = 2.0; BASE.contre = 0.9; BASE.hemi = 0.35;
        if (cel) cel.appliquer();
        if (decor) {                                                   // le décor 3D de l'univers apparaît avec la déchirure : ciel, skyline, sol laqué, reflets, contre-jour
          decor.activer(); scene.fog.color.set(decor.brouillard.couleur); scene.fog.density = decor.brouillard.densite;
          sol.material = decor.solMat; sol.scale.set(3, 3, 1); if (decor.solMat.map) decor.solMat.map.repeat.multiplyScalar(3);
          if (miroirCar) miroirCar.racine.visible = true;
        }
      }
      if (etat.seuil) particulesSignature(dt, ap < 1 ? 1 : 0.5);
      if (ap > 0 && !etat.sortie) { etat.sortie = true; if (!DRAME && (palier === 'legendaire' || palier === 'relique_interdite' || R.custom)) flasher(); }   // MODE DRAME : pas de flash de rareté   // le moteur (embrayage, rapports) est déjà dans la prise physique
      if (ap > 0 && ap < 1 && !DRAME) effetTheme(effet, posEffet, LONG, haut, dt);   // (MODE DRAME : fumée noire et ratés, voir drame.maj)
      if (ap >= 1 && !etat.pose) { etat.pose = true; poseRarete(); if (son && !CRASH) ferraille('choc', 2, 0.5, 1.3); }
      if (etat.pose && t < D.stats && !DRAME && hasard() < (R.particules.rayons ? 0.35 : 0.15)) auraRarete(1);
      for (let i = eclairs.length - 1; i >= 0; i--) { const e = eclairs[i]; e.vie -= dt; e.l.material.opacity = Math.max(0, e.vie / e.max); if (e.vie <= 0) { scene.remove(e.l); e.l.geometry.dispose(); e.l.material.dispose(); eclairs.splice(i, 1); } }
      if (CRASH) { /* position, ombre et contact : drame.maj */ } else if (t < D.sortie) { voiture.position.x += fret.position.x; voiture.position.y = fret.position.y + (modele ? 0 : dalle); ombre.visible = t >= D.arrivee; }
      else { if (modele) voiture.position.y = 0; ombre.visible = true; }
      if (CRASH) { for (const b of blobs) b.m.visible = false; } else majContact();
      if (hangar) hangar.maj(t, dt, { noir: Math.max(etat.noir || 0, etat.noirS || 0), yConteneur: fret.position.y, conteneurX: fret.position.x, conteneurZ: fret.position.z, extinction: DRAME ? drame.extinction(t) : null });
      majParts(dt);
      if (decor && etat.univers) { decor.maj(t, dt, camera, cv.height); if (miroirCar) miroirCar.sync(); }
      coupZoom = Math.max(0, coupZoom - dt * 14);
      camera.fov = fovBase * (1 - coupZoom / 38); camera.updateProjectionMatrix();
      majRessort(dt);                                                    // DÉCROCHAGE : la caméra encaisse l'impact puis vibre (ressort amorti)
      cam.x += ressortCam.x; cam.y += ressortCam.y; cam.z += ressortCam.z; cib.x -= ressortCam.x * 0.6; cib.y -= ressortCam.y * 0.9;
      camera.position.copy(cam); camera.lookAt(cib);
      if (rollPlan) camera.rotateZ(rollPlan);
      if (CAD && CAD.travelling && t >= D.sortie) camera.rotateZ(CAD.travelling.roulis * a2);     // l'horizon s'incline à mesure que le cadrage du personnage s'installe
      if (ressortCam.r) camera.rotateZ(ressortCam.r);
      if (CRASH) drame.cameraFinale(t, dt);                              // crash : ciel, chute, glissade — la caméra du drame prend la main
      majExplosion(t, dt);                                               // étincelles, arcs, ondes, rivets (rubans orientés vers la caméra de CETTE image)
      if (rang >= 3 && t < D.sortie) camera.rotateZ((Math.sin(t * 1.9) * 0.012 * (1 + etat.palier) + (rs ? rs.rz * 5 : 0)) * (DRAME ? 1 - borne((t - D.ouvre) / 0.6) : 1));     // roulis de séisme (il s'éteint avec le pétard mouillé)

      // ---------- 4. titre + réplique tapée ; 5. jauges (reveal Fret)
      if (!trailer) {
        if (t >= D.titre && !etat.titre) { etat.titre = true; el.classList.add('titre'); }
        if (etat.titre) { const nb = Math.floor(borne((t - D.titre - 0.5) / Math.max(1.2, Math.min(2.6, cit.length * 0.035))) * cit.length); if (typeur.textContent.length !== nb) typeur.textContent = cit.slice(0, nb); }
        if (t >= D.stats && !etat.stats) {
          etat.stats = true; el.classList.add('stats');
          el.querySelectorAll('.fret-stat').forEach((s, i) => setTimeout(() => { if (fini) return; s.classList.add('on'); if (son) ferraille('pene', i, 0.3, 1 + 0.06 * i); }, i * (express ? 170 : 300)));   // chaque jauge se verrouille : un pêne d'acier tombe
        }
      }
      if (trailer && t >= D.freeze && !fige) {
        cadrageHeroique(); secousse = 0; fige = true; el.classList.add('fige');
        if (DRAME) drame.figer(t);                                                       // MODE DRAME : ni strobe ni détonation, l'univers vire au sépia rouillé
        else { flashV = 0.3; frapperEcran(R.couleur, t); if (son) ferraille('detonation', 0, 0.6, 1.05); }
      }
      if (pasFixe && window.__fretCoupe) {                     // banc de contrôle image par image uniquement : isole la contribution de chaque lumière
        const k = window.__fretCoupe, f = (nom, l) => { if (l && k[nom] != null) l.intensity *= k[nom]; };
        f('cle', cle); f('contre', contre); f('hemi', hemi); f('interieur', interieur); f('keyMacro', keyMacro); f('rasant', rasant); f('cleV', cleV); f('lisV', lisV);
        for (const sp of rimFond) f('rim', sp); for (const sp of spotsPh) f('phares', sp);
      }
      // banc de contrôle image par image (pasFixe) : window.__fretRapide = t → simulation sans rendu jusqu'à t (captures d'impacts)
      const sansRendu = pasFixe && window.__fretRapide != null && t + pasFixe < window.__fretRapide;
      majPost(t, dt); if (!sansRendu) { post.scene(scene, camera); post.passe(); }
      if (sansRendu) { if (pasFixe) window.__fretT = t; raf = setTimeout(() => tick(performance.now()), 0); return; }
      if (surcouche) surcouche.dessiner(fige ? { phase: 'freeze', k: 0, focus: focusFige, dt } : { phase: t < D.bascule ? 'amorce' : 'bascule', k: t - D.bascule, focus: focusEcran(), dt });
      if (DRAME) drame.dessiner(t);                                    // MODE DRAME : badge qui grimpe, se fissure, perd ses losanges ; Épave ; tampon
      if (pasFixe) window.__fretT = t;                       // repère pour les captures de contrôle
      if (pasFixe && window.__fretCapture) {                 // banc : copie de l'image (WebGL + surcouche) prise AVANT la composition, sans capture d'écran
        const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g2 = c2.getContext('2d');
        g2.drawImage(cv, 0, 0); if (ov) g2.drawImage(ov, 0, 0, c2.width, c2.height); if (cvDrame) g2.drawImage(cvDrame, 0, 0, c2.width, c2.height);
        window.__fretImage = { t, url: c2.toDataURL('image/jpeg', 0.92) };
      }
      if (recDessin) recDessin(t);
      raf = requestAnimationFrame(tick);
    };

    function etincellesArc() {                      // allumage sec des optiques : arc électrique bref (gerbe fine blanc-bleu → orange), au ras de chaque lentille
      for (let i = 0; i < 2; i++) {
        const lp = modele.lampePos(i, V3(0, 0, 0));
        emettre(express ? 6 : 11, () => ({ mat: matPart(hasard() < 0.55 ? '#dff1ff' : '#ffb04a', texD, true), pos: V3(lp.x + 0.06, lp.y + (hasard() - 0.5) * 0.08, lp.z + (hasard() - 0.5) * 0.12),
          vel: V3(1.2 + hasard() * 2.6, (hasard() - 0.2) * 2.2, (hasard() - 0.5) * 2.4), taille: 0.018 + hasard() * 0.03, vie: 0.12 + hasard() * 0.16, g: -6, frein: 1.5, op: 1, pivote: true }));
      }
    }
    function poussiereJolt(n) {                       // à chaque à-coup : poussière et rouille qui tombent du toit et des soudures
      emettre(n, () => ({ mat: matPart(hasard() < 0.6 ? '#9a9fb2' : '#7a5a46', texD, false), pos: V3((hasard() - 0.5) * L * 0.9, H - 0.15, (hasard() < 0.5 ? -1 : 1) * (P / 2 - 0.2 - hasard() * 0.4)), vel: V3((hasard() - 0.5) * 0.6, -0.4 - hasard() * 0.8, (hasard() - 0.5) * 0.4), taille: 0.18 + hasard() * 0.3, croit: 1.2, vie: 1 + hasard() * 0.8, op: 0.35, g: -1.5, frein: 0.8 }));
    }
    function pschitt() {                              // décompression : jets de vapeur des vérins du coffre, nuage rasant sur la dalle
      flashV = Math.max(flashV, 0.16); secousse = Math.max(secousse, 0.1);
      for (const z of [-1, 1]) emettre(express ? 14 : 24, () => ({ mat: matPart('#6a7286', texD, false), pos: V3(xO + 0.3, yLinteau - 0.1, z * (P / 2 - 0.25)), vel: V3(1.4 + hasard() * 1.8, -0.5 - hasard() * 1.0, z * (2.2 + hasard() * 2.0)),   /* jets des vérins chassés sur les côtés : jamais dans l'objectif */ taille: 0.5 + hasard() * 0.5, croit: 2.8, vie: 1.1 + hasard() * 0.7, op: 0.26, frein: 2.2 }));
      emettre(express ? 12 : 22, () => ({ mat: matPart('#1e222d', texD, false), pos: V3(xO - 0.4 + hasard() * 0.8, dalle + 0.1 + hasard() * 0.4, (hasard() - 0.5) * (P - 0.6)), vel: V3(2.2 + hasard() * 2.2, 0.1 + hasard() * 0.3, (hasard() - 0.5) * 1.4), taille: 1.4 + hasard() * 1.2, croit: 2.2, vie: 2 + hasard() * 1.2, op: 0.32, frein: 1.1 }));
    }
    function fumeeDense(n) {                          // fumée volumétrique épaisse : coule hors du conteneur, éclairée à contre-jour
      // fumée SOMBRE (les sprites ne sont pas éclairés : une fumée claire devenait un voile laiteux qui cramait l'intérieur) ;
      // la lumière n'y apparaît que là où passent les cônes des phares et les rais du fond
      const tons = ['#161a25', '#1d2231', '#262c3e', couleurFuite.clone().multiplyScalar(0.28).getStyle()];
      emettre(n, () => ({ mat: matPart(tons[Math.floor(hasard() * 4)], texD, false), pos: V3(xO - 2.4 + hasard() * 2.0, dalle + 0.05 + hasard() * 0.9, (hasard() - 0.5) * (P - 0.5)), vel: V3(0.4 + hasard() * 1.2, 0.05 + hasard() * 0.3, (hasard() - 0.5) * 0.8), taille: 1.2 + hasard() * 1.3, croit: 1.5, vie: 3 + hasard() * 1.6, op: 0.22, frein: 0.5, tourne: (hasard() - 0.5) * 0.4 }));
    }
    function fumeeEchappement(n) {                    // gaz d'échappement qui refluent au fond du conteneur
      if (!modele) return;
      emettre(n, () => ({ mat: matPart('#454b5e', texD, false), pos: V3(voiture.position.x + modele.xArriere - 0.15, dalle + 0.3 + hasard() * 0.15, (hasard() - 0.5) * 0.5), vel: V3(-1.2 - hasard() * 1.6, 0.2 + hasard() * 0.5, (hasard() - 0.5) * 0.8), taille: 0.5 + hasard() * 0.5, croit: 2.2, vie: 1.6 + hasard(), op: 0.34, frein: 0.9 }));
    }
    function poussiereAtterrissage() {               // anneau de poussière au ras du sol, chassé de sous le conteneur
      emettre(express ? 14 : 26, () => { const a = hasard() * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        return { mat: matPart('#8a8fa3', texD, false), pos: V3(c * L * 0.5, 0.08, sn * P * 0.5), vel: V3(c * (2 + hasard() * 2.5), 0.2 + hasard() * 0.4, sn * (2 + hasard() * 2.5)), taille: 0.5 + hasard() * 0.5, croit: 1.6, vie: 1 + hasard() * 0.6, op: 0.28, frein: 1.6 }; });
    }
    function etincellesCales(n) {                          // le conteneur cogne sur ses cales : gerbes d'étincelles au ras du sol
      emettre(n, () => { const x = (hasard() < 0.5 ? -1 : 1) * L * 0.36, z = (hasard() < 0.5 ? -1 : 1) * P * 0.36;
        return { mat: matPart(hasard() < 0.6 ? '#ffcf6a' : (rang === 4 ? '#ff3b4a' : '#ffffff'), texD, true), pos: V3(x, 0.05, z), vel: V3((hasard() - 0.5) * 6, 1.5 + hasard() * 3.5, (hasard() - 0.5) * 6 + 1), taille: 0.16, vie: 0.5, g: -14, frein: 0.2 }; });
    }
    function contactPneus(xr, y, force) {                // gomme qui patine sur le plancher en tôle
      emettre(2, () => ({ mat: matPart('#b9bfd2', texD, false), pos: V3(xr - 0.2, y + 0.15, (hasard() < 0.5 ? -1 : 1) * (modele ? modele.largeur * 0.4 : 1)), vel: V3(-1.5 - hasard() * 2, 0.6 + hasard(), (hasard() - 0.5)), taille: 0.6 + hasard() * 0.5, croit: 1.8, vie: 1.1, op: 0.35 * force, frein: 0.9 }));
      if (hasard() < 0.5 * force) emettre(2, () => ({ mat: matPart('#ffd27a', texD, true), pos: V3(xr, y + 0.04, (hasard() - 0.5) * 2), vel: V3(-3 - hasard() * 4, 1 + hasard() * 2, (hasard() - 0.5) * 2), taille: 0.16, vie: 0.45, g: -14, frein: 0.2 }));
    }
    function etincellesChassis(x, y) {                     // le dessous frotte sur le seuil
      emettre(10, () => ({ mat: matPart(hasard() < 0.7 ? '#ffcf6a' : '#ffffff', texD, true), pos: V3(x, y, (hasard() - 0.5) * 2.4), vel: V3(-1 + hasard() * 6, 1.5 + hasard() * 3, (hasard() - 0.5) * 3), taille: 0.18, vie: 0.5, g: -14, frein: 0.2 }));
    }
    function flasher(fort = true) {                 // fort : strobe saturé de la rareté (2 images) au lieu d'un voile blanc de 0,22 s
      if (fort) { frapperEcran(R.couleur, tCourant); flashV = Math.max(flashV, 0.12); return; }
      if (trailer) { flashV = Math.max(flashV, 0.25); eclairV = 0.18; return; }
      flash.style.setProperty('--flash', '.3'); flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    }
    function poseRarete() {
      el.classList.add('rar-on');
      if (DRAME) return;                                // MODE DRAME : aucune gerbe ni rayons de rareté à la pose
      const P2 = R.particules;
      emettre(Math.round(P2.n * (express ? 0.35 : 0.6)), () => {
        const a = hasard() * Math.PI * 2, v = P2.vitesse * (0.5 + hasard());
        return { mat: matPart(P2.couleurs[Math.floor(hasard() * P2.couleurs.length)], hasard() < 0.4 ? texE : texD, true),
          pos: V3(voiture.position.x + (hasard() - 0.5) * LONG, 0.4 + hasard() * haut, 0.4), vel: V3(Math.cos(a) * v, Math.abs(Math.sin(a)) * v + 1.5, (hasard() - 0.5) * 2),
          taille: P2.taille * 3.2 * (0.5 + hasard()), vie: 1.1 + hasard() * 1.2, g: -2.5, frein: 0.8, tourne: (hasard() - 0.5) * 4 };
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
      emettre(n, () => ({ mat: matPart(P2.couleurs[Math.floor(hasard() * P2.couleurs.length)], texD, true), pos: V3(voiture.position.x + (hasard() - 0.5) * LONG * 1.1, 0.2, 0.2 + (hasard() - 0.5)), vel: V3(0, 1 + hasard() * 1.6, 0), taille: 0.35 + hasard() * 0.4, vie: 1.6, frein: 0.1 }));
    }
    function effetTheme(type, pos, lg, hh, dt2) {
      const arriere = pos.x - lg / 2, sol0 = pos.y;
      if (type === 'neons') {
        const c = hasard() < 0.5 ? '#22d3ee' : '#ff2bd6';
        emettre(3, () => ({ mat: matPart(c, texD, true), pos: V3(arriere + hasard() * lg * 0.9, sol0 + 0.15, 0.9 + hasard() * 0.4), vel: V3(-2 - hasard() * 2, 0.2, 0), taille: 0.9, croit: -0.6, vie: 0.9, frein: 1.2 }));
        if (hasard() < 0.6) fumee(1, arriere, sol0, 0.2, -0.4);
      } else if (type === 'eclairs') {
        if (hasard() < dt2 * (trailer ? 1.6 : 5)) {
          const pts = []; let x0 = pos.x + (hasard() - 0.5) * lg, y0 = hh + 6;
          for (let i = 0; i < 9; i++) { pts.push(V3(x0, y0, -0.5 + hasard())); x0 += (hasard() - 0.5) * 1.4; y0 -= (hh + 6) / 8; }
          const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: hasard() < 0.5 ? 0xbfd7ff : 0xb06bff, transparent: true, blending: THREE.AdditiveBlending }));
          scene.add(l); eclairs.push({ l, vie: 0.18, max: 0.18 }); flasher(false);
        }
        emettre(1, () => ({ mat: matPart('#6b55ff', texD, true), pos: V3(pos.x + (hasard() - 0.5) * lg, 0.3, 0.4), vel: V3(0, 1.5, 0), taille: 0.5, vie: 0.7 }));
      } else if (type === 'flammes') {
        emettre(4, () => ({ mat: matPart(hasard() < 0.5 ? '#ff7a1a' : '#ffd23e', texD, true), pos: V3(arriere - 0.1, sol0 + hh * 0.3 + hasard() * 0.3, 0.3), vel: V3(-5 - hasard() * 4, (hasard() - 0.3) * 1.5, 0), taille: 0.8 + hasard() * 0.6, croit: 0.8, vie: 0.45, frein: 1.5 }));
      } else if (type === 'etincelles') {
        emettre(4, () => ({ mat: matPart(hasard() < 0.7 ? '#ffcf6a' : '#ffffff', texD, true), pos: V3(arriere + hasard() * lg * 0.3, sol0 + 0.05, 0.6), vel: V3(-3 - hasard() * 6, 1 + hasard() * 3, (hasard() - 0.5) * 2), taille: 0.22, vie: 0.6, g: -14, frein: 0.2 }));
        if (hasard() < 0.5) fumee(1, arriere, sol0, 0.2, -0.3);
      } else if (type === 'paillettes') {
        const pastel = ['#ffb3dc', '#b8f2ff', '#fff3a8', '#c9b8ff', '#b8ffd9'];
        emettre(4, () => ({ mat: matPart(pastel[Math.floor(hasard() * pastel.length)], hasard() < 0.6 ? texE : texD, true), pos: V3(arriere + hasard() * lg, sol0 + hasard() * hh, 0.5), vel: V3(-1.5 - hasard() * 2, 1 + hasard() * 2, (hasard() - 0.5) * 2), taille: 0.35 + hasard() * 0.3, vie: 1.4, g: -1.5, tourne: 3 }));
      }
    }
    function terminer() {
      fini = true; cancelAnimationFrame(raf); clearTimeout(raf);
      removeEventListener('resize', auResize);
      removeEventListener('keydown', surTouche, true); el.removeEventListener('pointerdown', surClic); removeEventListener('gp:suivant', accepter); removeEventListener('gp:arreter', interrompre);
      if (musiqueSource) {                 // fondu de la musique, puis arrêt
        try { const ac = musiqueGain.context, tt = ac.currentTime; musiqueGain.gain.cancelScheduledValues(tt); musiqueGain.gain.setValueAtTime(musiqueGain.gain.value, tt); musiqueGain.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5); musiqueSource.stop(tt + 0.55); } catch (e) { /* déjà arrêtée */ }
      }
      if (stopTheme) stopTheme();
      if (stopSuspense) stopSuspense();
      if (stopDrame) stopDrame();
      if (stopClacs) stopClacs();
      if (stopAmbiance) stopAmbiance();
      if (stopMoteur) setTimeout(stopMoteur, 650);
      if (salle) setTimeout(() => salle.dispose(), 3200);
      if (busFond) setTimeout(() => busFond.dispose(), 700);
      if (annulerParole) annulerParole();
      const nettoyer = () => {
        for (const x of jetables) { try { x.dispose && x.dispose(); } catch (e) { /* rien */ } }
        post.dispose();
        if (cel) { cel.annuler(); cel.dispose(); }
        if (drame && drame.restaurer) drame.restaurer();         // crash : les pièces détachées retournent au châssis (aucune fuite)
        if (modele) modele.dispose();
        if (hangar) hangar.dispose();
        if (decor) decor.dispose();
        parts.forEach((p) => p.s.material.dispose()); reserve.forEach((sp) => sp.material.dispose());
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

/**
 * Claquements des charnières des ailes (scénario crash, V9c) : pour chaque instant (secondes depuis le top départ), un « clac »
 * mécanique synthétisé — choc métallique bref (bruit filtré passe-bande vers 2,6 kHz, enveloppe de 25 ms), cognement sourd
 * (sinus 150 Hz qui chute) et petite résonance de tôle (deux partiels inharmoniques qui s'éteignent en 120 ms). Bruit tiré d'un
 * générateur à graine : identique à chaque prise. Aucun fichier audio. Rend une fonction d'arrêt.
 */
function clacsCharnieres(S, instants, vers) {
  const { ac } = S, sources = [], t0 = ac.currentTime + 0.02;
  const n = Math.max(1, Math.round(ac.sampleRate * 0.05)), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  let a = 20261016 >>> 0; const al = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) d[i] = (al() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.008));
  instants.forEach((ti, k) => {
    const t = t0 + ti, g = ac.createGain(), v = k % 2 ? 0.55 : 0.75;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); g.connect(vers);
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(); src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2600 + 400 * (k % 2); bp.Q.value = 1.4;
    src.connect(bp); bp.connect(g); src.start(t); src.stop(t + 0.06); sources.push(src);
    const sourd = ac.createOscillator(), gs = ac.createGain(); sourd.type = 'sine';
    sourd.frequency.setValueAtTime(150, t); sourd.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    gs.gain.setValueAtTime(0.9, t); gs.gain.exponentialRampToValueAtTime(0.001, t + 0.08); sourd.connect(gs); gs.connect(g); sourd.start(t); sourd.stop(t + 0.1); sources.push(sourd);
    for (const [f, amp] of [[1870, 0.25], [3110, 0.15]]) {
      const o = ac.createOscillator(), go = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f * (1 + 0.03 * (k % 2)), t);
      go.gain.setValueAtTime(amp, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(go); go.connect(g); o.start(t); o.stop(t + 0.14); sources.push(o);
    }
  });
  return () => { for (const x of sources) { try { x.stop(); } catch (e) { /* déjà fini */ } } };
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
function preparerEnregistrement(cvGL, el, car, ov = null, cvDrame = null) {
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
    if (ov) { g.drawImage(ov, 0, 0, W, Hh); if (cvDrame) g.drawImage(cvDrame, 0, 0, W, Hh); return; }   // trailer : tout est déjà dans la surcouche (+ badge du MODE DRAME)
    const cls = el.classList, cit = el.querySelector('.fret-cit span').textContent;
    if (cls.contains('rar-on') && !cvDrame) { g.font = R.custom ? '900 44px Arial Black, Arial' : '900 30px Arial Black, Arial'; g.fillStyle = R.couleur; if (R.custom) { g.shadowColor = R.lueur; g.shadowBlur = 30; } g.fillText(`${R.custom ? '' : '◆'.repeat(R.rang + 1) + ' '}${R.court}`, 80, 90); g.shadowBlur = 0; }
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
    if (cvDrame) g.drawImage(cvDrame, 0, 0, W, Hh);           // MODE DRAME : badge fissuré, Épave, tampon (au-dessus de la fiche, comme à l'écran)
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
.fret-drame-cv{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:5}
.fret-reveal.drame .fret-rar,.fret-reveal.drame.trailer.fige .fret-rar-cust{display:none!important}
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
