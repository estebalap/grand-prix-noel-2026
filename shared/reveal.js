/* Reveal « cinématique » d'un bolide, GÉNÉRÉ PAR LE CODE (aucune vidéo IA nécessaire) — 5 à 6 secondes.

   CHAQUE BOLIDE A SON THÈME (data/themes_bolides.json), choisi d'après le véhicule réel :
     reel       retransmission TV : bandes cinéma, reflet d'objectif, bandeau de direct     (F1, GT, Majorette…)
     manga      trame, lignes de vitesse noires, case d'impact en négatif                   (JDM, Tomica d'anime…)
     jeu_video  pixels qui se dessinent, grille, lignes de balayage, « NOUVEAU BOLIDE ! »   (créations Hot Wheels)
     comics     points Ben-Day, explosion « VROUM ! », cadre noir penché                    (Batmobiles de BD…)
     film_noir  noir et blanc, ombres de stores, pluie, projecteur                          (Batmobiles des films…)
     retro80    soleil couchant synthwave, grille néon, VHS                                (KITT, muscle cars…)
     cartoon    soleil tournant, rebond élastique, étoiles qui pétillent                    (Monster High, kawaii…)
   et son JINGLE synthétisé (country, rock, pop, hip-hop, électro, eurobeat, chiptune, valse…).

   Déroulé : entrée « slam » de la PHOTO réelle de la miniature (web/photos/bolides/CODE.jpg) dans le style du
   thème, puis la photo glisse à gauche et la FICHE arrive : stats en barres et description du bolide.
   La TV l'utilise quand aucun clip vidéo n'existe (web/videos/cars/CODE.mp4 garde la priorité) ; sans photo, elle
   garde la fiche dessinée. Page d'essai et défilé : /reveal/?code=B07, /reveal/?defile=1.
   Canvas 2D (pas de WebGL), dessiné par la boucle unique de perf.js dans le budget de pixels du palier. */
import { boucle, dprPour } from './perf.js';
import { sortieAudio } from './audio.js';

let MUSIQUE = null, PHOTOS = null, THEMES = null;
const TAU = Math.PI * 2;

/** Charge la table des genres et le manifeste des photos (une fois). base : préfixe des URL (relais ou site). */
export async function chargerReveal(base = '..') {
  const lire = async (u) => { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  if (!MUSIQUE) MUSIQUE = (await lire(base + '/data/musique_ecuries.json')) || { genres: {}, ecuries: {}, categories: {} };
  if (!PHOTOS) PHOTOS = (await lire(base + '/photos/bolides/photos.json')) || {};
  if (!THEMES) THEMES = (await lire(base + '/data/themes_bolides.json')) || { bolides: {}, styles: {} };
  return { musique: MUSIQUE, photos: PHOTOS, themes: THEMES };
}
export const photoDe = (code, base = '..') => (PHOTOS && PHOTOS[code] ? `${base}/photos/bolides/${PHOTOS[code].fichier}` : null);
export const photosDisponibles = () => Object.keys(PHOTOS || {});

/** Thème du bolide : { style, musique, accroche } (data/themes_bolides.json), sinon déduit de la catégorie du code. */
export function themeDe(car) {
  const th = THEMES && THEMES.bolides && THEMES.bolides[car.code];
  if (th) return th;
  const M = MUSIQUE || { categories: {} };
  const pre = (car.code.match(/^[A-Z]+/) || ['R'])[0];
  return { style: 'reel', musique: M.categories[pre] || M.categories[pre[0]] || 'swing', accroche: '' };
}
/** Genre musical d'un bolide : celui de son thème (le véhicule décide, pas l'écurie). */
export const genreDe = (car) => themeDe(car).musique;

/* ======================================================================== jingles synthétisés
   2 mesures + un accord final. Motifs : 16 pas par mesure (12 en 3/4) ; x = coup, . = rien.
   Notes en demi-tons au-dessus de la tonique. */
const J = {
  country:   { racine: 55, mode: [0, 2, 4, 7, 9], k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: [0, 7, 0, 7, 5, 12, 5, 12], lead: [12, 14, 16, 19, 16, 14, 12, 9, 7, 9, 12, 14, 16, 12, 9, 7], son: 'banjo' },
  bubblegum: { racine: 60, mode: [0, 2, 4, 7, 9], k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', b: [0, 0, 9, 9, 5, 5, 7, 7], lead: [16, 19, 21, 19, 16, 12, 14, 16, 19, 21, 24, 21, 19, 16, 19, 24], son: 'pluck' },
  disco:     { racine: 52, mode: [0, 3, 5, 7, 10], k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', b: [0, 12, 0, 12, 3, 15, 5, 17], lead: [12, 15, 17, 19, 22, 19, 17, 15, 12, 15, 17, 15, 12, 10, 12, 24], son: 'slap' },
  swing:     { racine: 50, mode: [0, 2, 3, 5, 7, 9, 10], k: 'x.....x...x.....', s: '....x.......x...', h: 'x..x.xx..x.xx..x', b: [0, 4, 7, 9, 10, 9, 7, 4], lead: [12, 15, 16, 19, 22, 21, 19, 16, 15, 12, 10, 12, 15, 19, 22, 24], son: 'piano' },
  rock:      { racine: 40, mode: [0, 3, 5, 7, 10], k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: [0, 0, 3, 5, 0, 0, 10, 7], lead: [24, 27, 29, 31, 29, 27, 24, 22, 24, 27, 31, 34, 36, 34, 31, 36], son: 'guitare' },
  symphonie: { racine: 45, mode: [0, 2, 3, 5, 7, 8, 10], k: 'x.......x.......', s: '........x.......', h: '................', b: [0, 0, 8, 8, 5, 5, 7, 7], lead: [12, 15, 19, 24, 22, 19, 20, 19, 15, 17, 19, 22, 24, 27, 26, 24], son: 'cordes' },
  chiptune:  { racine: 60, mode: [0, 2, 4, 5, 7, 9, 11], k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: [0, 12, 0, 12, 5, 17, 7, 19], lead: [12, 16, 19, 24, 19, 16, 12, 16, 17, 21, 24, 29, 28, 24, 31, 36], son: 'carre' },
  synthwave: { racine: 45, mode: [0, 3, 5, 7, 10], k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', b: [0, 12, 0, 12, 8, 20, 10, 22], lead: [24, 22, 19, 15, 19, 22, 24, 27, 26, 24, 22, 19, 22, 24, 27, 31], son: 'synthe' },
  epique:    { racine: 38, mode: [0, 2, 3, 5, 7, 8, 10], k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: '................', b: [0, 0, 8, 8, 3, 3, 10, 10], lead: [24, 24, 27, 31, 32, 31, 27, 26, 24, 27, 31, 36, 34, 32, 31, 36], son: 'guitare' },
  doom:      { racine: 35, mode: [0, 1, 3, 5, 6, 8, 10], k: 'x..x..x...x..x..', s: '....x.......x...', h: '................', b: [0, 0, 1, 0, 6, 5, 3, 1], lead: [12, 13, 12, 18, 17, 15, 13, 12, 12, 13, 15, 18, 19, 18, 13, 24], son: 'guitare' },
  kawaii:    { racine: 64, mode: [0, 2, 4, 7, 9], k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', b: [0, 0, 9, 9, 5, 5, 7, 7], lead: [24, 21, 19, 16, 19, 21, 24, 28, 26, 24, 21, 19, 21, 24, 28, 31], son: 'pluck' },
  acidjazz:  { racine: 48, mode: [0, 2, 3, 5, 7, 9, 10], k: 'x.....x.x.......', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx', b: [0, 3, 5, 7, 10, 9, 7, 5], lead: [15, 17, 19, 22, 24, 22, 19, 17, 15, 19, 22, 26, 27, 26, 24, 22], son: 'piano' },
  punk:      { racine: 43, mode: [0, 2, 4, 5, 7, 9, 11], k: 'x.x.x.x.x.x.x.x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx', b: [0, 0, 5, 5, 7, 7, 5, 7], lead: [24, 24, 29, 29, 31, 31, 29, 31, 24, 26, 28, 29, 31, 33, 35, 36], son: 'guitare' },
  hiphop:    { racine: 41, mode: [0, 3, 5, 7, 10], k: 'x......x.x......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx', b: [0, 0, 0, 3, 5, 5, 3, 10], lead: [12, 15, 12, 10, 12, 17, 15, 12, 19, 17, 15, 12, 15, 10, 12, 24], son: 'synthe' },
  eurobeat:  { racine: 50, mode: [0, 2, 3, 5, 7, 8, 10], k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', b: [0, 12, 0, 12, 8, 20, 10, 22], lead: [24, 26, 27, 31, 29, 27, 26, 24, 22, 24, 26, 27, 29, 31, 32, 36], son: 'synthe' },
  valse:     { racine: 57, mode: [0, 2, 4, 5, 7, 9, 11], k: 'x...........', s: '....x...x...', h: '..x...x...x.', b: [0, 7, 0, 5, 9, 5], lead: [12, 16, 19, 24, 23, 21, 19, 16, 17, 19, 21, 24], son: 'pluck' },
};
const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function bruit(ac, duree) {
  const n = Math.floor(ac.sampleRate * duree), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function distorsion(ac, k = 60) {
  const ws = ac.createWaveShaper(), n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
  ws.curve = c; return ws;
}

/** Joue le jingle du genre ; renvoie sa durée (s). Silencieux (renvoie 0) tant que l'audio n'est pas débloqué. */
export function jingle(genreId, { gain = 0.55 } = {}) {
  const S = sortieAudio();
  if (!S) return 0;
  const { ac, master } = S;
  const g = J[genreId] || J.synthwave;
  const info = (MUSIQUE && MUSIQUE.genres[genreId]) || { bpm: 120, mesure: 4 };
  const pas = 60 / info.bpm / 4, n = g.k.length, t0 = ac.currentTime + 0.05;
  const bus = ac.createGain(); bus.gain.value = gain; bus.connect(master);
  const NB = noise(ac);
  const note = (t, midi, dur, son, vol = 0.22) => {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), v = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 3200;
    let chaine = f;
    const types = { banjo: 'square', pluck: 'triangle', slap: 'sawtooth', piano: 'triangle', guitare: 'sawtooth', cordes: 'sawtooth', carre: 'square', synthe: 'sawtooth' };
    o.type = types[son] || 'triangle'; o2.type = o.type;
    o.frequency.value = freq(midi); o2.frequency.value = freq(midi) * (son === 'synthe' || son === 'cordes' ? 1.006 : 2.0);
    const v2 = ac.createGain(); v2.gain.value = son === 'synthe' || son === 'cordes' ? 0.8 : 0.18;
    o.connect(f); o2.connect(v2); v2.connect(f);
    if (son === 'guitare') { const d = distorsion(ac, 80); f.frequency.value = 2400; f.connect(d); chaine = d; }
    chaine.connect(v); v.connect(bus);
    const att = son === 'cordes' ? 0.08 : 0.004, rel = son === 'banjo' || son === 'pluck' ? dur * 0.6 : dur;
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + att); v.gain.exponentialRampToValueAtTime(0.0001, t + rel + 0.05);
    o.start(t); o2.start(t); o.stop(t + rel + 0.1); o2.stop(t + rel + 0.1);
  };
  const kick = (t) => { const o = ac.createOscillator(), v = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); v.gain.setValueAtTime(0.9, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(v); v.connect(bus); o.start(t); o.stop(t + 0.25); };
  const caisse = (t, hp, dur, vol) => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(); s.buffer = NB; f.type = 'highpass'; f.frequency.value = hp; v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(v); v.connect(bus); s.start(t); s.stop(t + dur + 0.02); };
  for (let m = 0; m < 2; m++) {
    for (let i = 0; i < n; i++) {
      const t = t0 + (m * n + i) * pas;
      if (g.k[i] === 'x') kick(t);
      if (g.s[i] === 'x') caisse(t, 1500, 0.16, 0.45);
      if (g.h[i] === 'x') caisse(t, 7000, 0.04, 0.14);
      if (i % (n / g.b.length * 1) === 0) { const bi = Math.floor(i / (n / g.b.length)); note(t, g.racine - 12 + g.b[bi % g.b.length], pas * (n / g.b.length) * 0.9, g.son === 'slap' ? 'slap' : 'synthe', 0.2); }
      const li = m * n + i;
      if (li % 2 === 0) { const k = (li / 2) % g.lead.length; note(t, g.racine + g.lead[k], pas * 1.8, g.son, 0.16); }
    }
  }
  const tf = t0 + 2 * n * pas;                          // accord final + crash
  for (const iv of [0, g.mode[2] || 4, 7, 12]) note(tf, g.racine + iv, 1.1, g.son === 'guitare' ? 'guitare' : 'cordes', 0.12);
  kick(tf); caisse(tf, 4000, 1.2, 0.35);
  setTimeout(() => { try { bus.disconnect(); } catch (e) { /* déjà fermé */ } }, (tf - ac.currentTime + 2) * 1000);
  return tf - t0 + 1.2;
}
let NOISE = null;
function noise(ac) { if (!NOISE || NOISE.sampleRate !== ac.sampleRate) NOISE = bruit(ac, 1.5); return NOISE; }


/* ======================================================================== cinématique */
const charger = (url) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const elastique = (x) => { x = Math.min(1, Math.max(0, x)); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1; };
const motif = (taille, dessin) => { const c = document.createElement('canvas'); c.width = c.height = taille; dessin(c.getContext('2d'), taille); return c; };

/* Motifs précalculés une fois (le coût par image reste un simple remplissage) */
let MOTIFS = null;
function motifs(ctx) {
  if (MOTIFS) return MOTIFS;
  const trame = motif(12, (x, s) => { x.fillStyle = '#000'; x.beginPath(); x.arc(s / 2, s / 2, 2.2, 0, TAU); x.fill(); });
  const benday = motif(16, (x, s) => { x.fillStyle = '#ff2d55'; x.beginPath(); x.arc(4, 4, 3.4, 0, TAU); x.arc(12, 12, 3.4, 0, TAU); x.fill(); });
  const grain = motif(128, (x, s) => { const d = x.createImageData(s, s); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } x.putImageData(d, 0, 0); });
  const lignes = motif(4, (x) => { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, 4, 2); });
  MOTIFS = { trame: ctx.createPattern(trame, 'repeat'), benday: ctx.createPattern(benday, 'repeat'), grain: ctx.createPattern(grain, 'repeat'), lignes: ctx.createPattern(lignes, 'repeat') };
  return MOTIFS;
}

function rayons(ctx, cx, cy, n, R, rot, couleurs, alpha, largeur = 0.5) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    ctx.rotate(TAU / n); ctx.fillStyle = couleurs[i % couleurs.length];
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * Math.tan(Math.PI / n * largeur)); ctx.lineTo(R, R * Math.tan(Math.PI / n * largeur)); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function lignesVitesse(ctx, cx, cy, W, H, t, couleur, n = 70, epais = 3) {
  ctx.save(); ctx.fillStyle = couleur;
  for (let i = 0; i < n; i++) {
    const a = (i * 2.399 + Math.floor(t * 12) * 0.37) % TAU, r0 = Math.min(W, H) * (0.32 + ((i * 0.618) % 0.25)), r1 = Math.max(W, H);
    const e = epais * (0.4 + (i % 3) * 0.5) / Math.max(1, r0) ;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a - e) * r1, cy + Math.sin(a - e) * r1); ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a + e) * r1, cy + Math.sin(a + e) * r1); ctx.fill();
  }
  ctx.restore();
}
function cadreArrondi(ctx, w, h, r) { ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath(); }
function etoile(ctx, x, y, r, n = 5, k = 0.45) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
function texte(ctx, s, x, y, taille, { couleur = '#fff', contour = null, police = '900', align = 'left', famille = 'Fredoka, Bahnschrift, system-ui, sans-serif', ombre = null } = {}) {
  ctx.font = `${police} ${taille}px ${famille}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (ombre) { ctx.shadowColor = ombre; ctx.shadowBlur = taille * 0.4; }
  if (contour) { ctx.lineJoin = 'round'; ctx.lineWidth = taille * 0.16; ctx.strokeStyle = contour; ctx.strokeText(s, x, y); }
  ctx.fillStyle = couleur; ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}

/* Un style = fond(), photo() (traitement de l'image dans son cadre), cadre() (bordure), dessus() (calques et titre) */
const STYLES = {
  reel: {
    fond(c, W, H, t, s) { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#020308'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const fx = W * (0.2 + 0.6 * ((t * 0.12) % 1)), fl = c.createRadialGradient(fx, H * 0.3, 0, fx, H * 0.3, W * 0.35); fl.addColorStop(0, s.c1 + '55'); fl.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = fl; c.fillRect(0, 0, W, H); },
    dessus(c, W, H, t, s) {
      const b = H * 0.09 * ease(t / 0.5); c.fillStyle = '#000'; c.fillRect(0, 0, W, b); c.fillRect(0, H - b, W, b);           // bandes cinéma
      c.fillStyle = MOTIFS.grain; c.fillRect(0, 0, W, H);
      if (t > 0.6 && s.phase < 1) {                                                                                      // bandeau de direct
        const k = ease((t - 0.6) / 0.4), y = H - b - 96;
        c.save(); c.translate(-(1 - k) * 700, 0);
        c.fillStyle = '#e10600'; c.fillRect(W * 0.06, y, 120, 54); texte(c, 'DIRECT', W * 0.06 + 60, y + 27, 22, { align: 'center' });
        c.fillStyle = 'rgba(10,12,24,.92)'; c.fillRect(W * 0.06 + 120, y, 620, 54); c.fillStyle = s.c1; c.fillRect(W * 0.06 + 120, y + 50, 620, 4);
        texte(c, `${s.car.code} · ${s.car.real_name || s.car.alias}`.slice(0, 44), W * 0.06 + 138, y + 27, 22, { police: '700' });
        c.restore();
      }
    },
  },
  manga: {
    fond(c, W, H, t, s) { const choc = t > 0.25 && t < 0.42; c.fillStyle = choc ? '#000' : '#f4f1ea'; c.fillRect(0, 0, W, H);
      if (!choc) { c.globalAlpha = 0.18; c.fillStyle = MOTIFS.trame; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
      lignesVitesse(c, s.cx, s.cy, W, H, t, choc ? '#fff' : '#111', 80, 5); },
    photo(c, t) { c.filter = t < 0.6 ? 'grayscale(1) contrast(1.8)' : t < 0.9 ? 'contrast(1.3) saturate(1.2)' : 'none'; },
    cadre(c, w, h) { c.lineWidth = 9; c.strokeStyle = '#111'; c.stroke(); },
    dessus(c, W, H, t, s) { if (t > 0.45 && s.phase < 1) { const k = elastique((t - 0.45) / 0.6); c.save(); c.translate(W * 0.83, H * 0.2); c.rotate(-0.18); c.scale(k, k);
      texte(c, 'ドドド', 0, 0, 92, { couleur: '#111', contour: '#fff', align: 'center' }); c.restore(); } },
  },
  jeu_video: {
    fond(c, W, H, t, s) { c.fillStyle = '#05010f'; c.fillRect(0, 0, W, H); c.strokeStyle = s.c1 + '55'; c.lineWidth = 1;
      const p = 48, o = (t * 60) % p; c.beginPath(); for (let x = -o; x < W; x += p) { c.moveTo(x, 0); c.lineTo(x, H); } for (let y = -o; y < H; y += p) { c.moveTo(0, y); c.lineTo(W, y); } c.stroke();
      c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const x = (i * 197 + t * 40 * (1 + i % 3)) % W, y = (i * 113) % H; c.fillRect(x, y, 4, 4); } },
    pixels: true,
    cadre(c, w, h, s) { c.lineWidth = 8; c.strokeStyle = s.c1; c.setLineDash([16, 8]); c.stroke(); c.setLineDash([]); },
    dessus(c, W, H, t, s) { c.fillStyle = MOTIFS.lignes; c.fillRect(0, 0, W, H);
      if (t > 0.5 && s.phase < 1 && Math.floor(t * 4) % 2 === 0) texte(c, 'NOUVEAU BOLIDE !', W * 0.75, H * 0.16, 54, { couleur: '#ffe066', contour: '#3a0ca3', align: 'center', famille: 'ui-monospace, Consolas, monospace' }); },
  },
  comics: {
    fond(c, W, H, t, s) { c.fillStyle = '#ffd60a'; c.fillRect(0, 0, W, H); c.globalAlpha = 0.55; c.fillStyle = MOTIFS.benday; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
      rayons(c, s.cx, s.cy, 24, Math.max(W, H), t * 0.2, ['#ff4d00', '#ffd60a'], 0.5); },
    rotation: -0.06,
    cadre(c) { c.lineWidth = 12; c.strokeStyle = '#000'; c.stroke(); },
    dessus(c, W, H, t, s) { if (t > 0.35 && s.phase < 1) { const k = elastique((t - 0.35) / 0.7); c.save(); c.translate(W * 0.78, H * 0.22); c.rotate(0.12); c.scale(k, k);
      c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 8; etoile(c, 0, 0, 170, 14, 0.62); c.fill(); c.stroke();
      texte(c, 'VROUM !', 0, 4, 64, { couleur: '#e5001e', contour: '#000', align: 'center' }); c.restore(); } },
  },
  film_noir: {
    fond(c, W, H, t, s) { c.fillStyle = '#060606'; c.fillRect(0, 0, W, H);
      const sp = c.createRadialGradient(s.cx, s.cy - H * 0.2, 0, s.cx, s.cy, H * 0.9); sp.addColorStop(0, 'rgba(255,255,255,.22)'); sp.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sp; c.fillRect(0, 0, W, H); },
    photo(c) { c.filter = 'grayscale(1) contrast(1.35) brightness(.95)'; },
    cadre(c, w, h, s) { c.lineWidth = 3; c.strokeStyle = s.c1; c.stroke(); },
    dessus(c, W, H, t, s) {
      c.save(); c.globalAlpha = 0.28; c.fillStyle = '#000'; c.translate(W * 0.5, H * 0.5); c.rotate(-0.35);           // ombres de stores
      for (let y = -H; y < H; y += 46) c.fillRect(-W, y, W * 2, 18); c.restore();
      c.strokeStyle = 'rgba(200,210,230,.35)'; c.lineWidth = 1; c.beginPath();                                          // pluie
      for (let i = 0; i < 120; i++) { const x = (i * 83.7 + t * 300) % W, y = (i * 47.3 + t * 1600) % H; c.moveTo(x, y); c.lineTo(x - 6, y + 26); } c.stroke();
      if (t > 0.6 && s.phase < 1) texte(c, `AFFAIRE N° ${s.car.code}`, W * 0.94, H * 0.12, 30, { couleur: '#e5e5e5', align: 'right', famille: 'Georgia, serif', police: '700' });
    },
  },
  retro80: {
    fond(c, W, H, t, s) { const hz = H * 0.62, g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#12002a'); g.addColorStop(1, '#ff2a6d'); c.fillStyle = g; c.fillRect(0, 0, W, hz);
      const R = H * 0.26, sg = c.createLinearGradient(0, hz - R, 0, hz); sg.addColorStop(0, '#ffd319'); sg.addColorStop(1, '#ff2975'); c.fillStyle = sg; c.beginPath(); c.arc(W * 0.7, hz, R, Math.PI, TAU); c.fill();
      c.fillStyle = '#12002a'; for (let i = 1; i < 7; i++) c.fillRect(W * 0.7 - R, hz - R * i / 7, R * 2, i * 1.6);
      c.fillStyle = '#0d0221'; c.fillRect(0, hz, W, H - hz); c.strokeStyle = '#00f0ff'; c.lineWidth = 2; c.beginPath();
      for (let i = -20; i <= 20; i++) { c.moveTo(W / 2 + i * 12, hz); c.lineTo(W / 2 + i * W * 0.09, H); }
      for (let k = 0; k < 14; k++) { const f = ((k + t * 1.5) % 14) / 14, y = hz + (H - hz) * f * f; c.moveTo(0, y); c.lineTo(W, y); } c.stroke(); },
    aberration: true,
    cadre(c, w, h) { c.lineWidth = 5; c.strokeStyle = '#00f0ff'; c.shadowColor = '#ff2a6d'; c.shadowBlur = 24; c.stroke(); c.shadowBlur = 0; },
    dessus(c, W, H, t, s) { c.fillStyle = MOTIFS.lignes; c.fillRect(0, 0, W, H);
      const y = (t * 260) % (H + 80) - 40; c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(0, y, W, 24);                 // dérive VHS
      if (s.phase < 1) texte(c, `► LECTURE  ${s.car.code}`, W * 0.05, H * 0.08, 28, { couleur: '#fff', famille: 'ui-monospace, Consolas, monospace', police: '700' }); },
  },
  cartoon: {
    fond(c, W, H, t, s) { c.fillStyle = s.c1; c.fillRect(0, 0, W, H); rayons(c, s.cx, s.cy, 16, Math.max(W, H), t * 0.5, ['#ffffff', s.c2], 0.35); },
    rebond: true,
    cadre(c) { c.lineWidth = 10; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#1b1b3a'; c.stroke(); },
    dessus(c, W, H, t, s) {
      for (let i = 0; i < 14; i++) { const a = i * 0.9 + t * 1.5, r = Math.min(W, H) * (0.36 + 0.05 * Math.sin(t * 3 + i)), x = s.cx + Math.cos(a) * r * 1.3, y = s.cy + Math.sin(a) * r, k = 10 + 8 * Math.sin(t * 6 + i);
        c.fillStyle = i % 2 ? '#fff6a6' : '#ffffff'; etoile(c, x, y, Math.abs(k), 4, 0.35); c.fill(); }
      if (t > 0.4 && s.phase < 1) { const k = elastique((t - 0.4) / 0.8); c.save(); c.translate(W * 0.8, H * 0.18); c.scale(k, k); texte(c, 'TADAAA !', 0, 0, 70, { couleur: '#fff', contour: '#1b1b3a', align: 'center' }); c.restore(); }
    },
  },
};

/** Fiche de fin : stats en barres + description (lore). Utilisée si l'appelant ne fournit pas la sienne. */
export function ficheBolide(car, team) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const barre = (n, v) => `<div class="rc-stat"><span>${n}</span><i><b style="width:${Math.max(0, Math.min(100, v || 0))}%"></b></i><em>${v ?? '–'}</em></div>`;
  const th = themeDe(car), st = (THEMES && THEMES.styles && THEMES.styles[th.style]) || th.style;
  return `${team ? `<div class="own"><span>${esc(team.name)}</span></div>` : ''}
    <span class="eyebrow">${esc(car.code)} · ${esc(car.real_name || '')}</span>
    <h3 class="display foil">${esc(car.alias)}</h3>
    <div class="rc-theme">${esc(st)}${th.accroche ? ' · ' + esc(th.accroche) : ''}</div>
    <div class="rc-stats">${barre('Vitesse', car.vitesse)}${barre('Aéro', car.aerodynamisme)}${barre('Anti-banane', car.resistance_banane)}${barre('Chaos', car.facteur_chaos)}${barre('Intimidation', car.intimidation)}</div>
    ${car.poids_estime ? `<div class="rc-poids">Poids estimé : ${esc(car.poids_estime)}</div>` : ''}
    <div class="lore">${esc(car.lore || '')}</div>
    ${car.citation ? `<div class="qt">« ${esc(car.citation)} »</div>` : ''}`;
}

const CSS = `.reveal-code .rv-panel{width:min(720px,44vw)}.reveal-code .rc-theme{font:700 16px var(--font-display,system-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--gold-2,#ffd34d);margin:6px 0 12px}
.reveal-code .rc-stats{display:grid;gap:7px;margin:8px 0 12px}.reveal-code .rc-stat{display:grid;grid-template-columns:150px 1fr 44px;gap:12px;align-items:center;font:600 18px var(--font-body,system-ui)}
.reveal-code .rc-stat i{height:12px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden}.reveal-code .rc-stat i b{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#3ddc97,#ffd166,#ff3b57);transform-origin:0 50%;transform:scaleX(0);transition:transform .9s cubic-bezier(.2,.8,.2,1)}
.reveal-code.info .rc-stat i b{transform:scaleX(1)}.reveal-code .rc-stat em{font-style:normal;font-weight:800;text-align:right}.reveal-code .rc-poids{opacity:.75;font-size:16px;margin-bottom:8px}`;

/**
 * Joue la cinématique dans parent (plein écran). Renvoie false si la photo est introuvable (la TV garde alors la
 * fiche dessinée). opts : { car, teamId, team, couleurs:[c1,c2], infoHtml, duree (ms), base, son }.
 * Déroulé : [0 ; duree − 2,6 s] cinématique plein cadre dans le style du bolide ; puis la photo glisse à gauche et
 * la fiche (stats + description) entre à droite.
 */
export async function revealCinematique(parent, { car, teamId = null, team = null, couleurs = ['#ffd34d', '#ff3f8e'], infoHtml = '', duree = 6000, base = '..', son = true } = {}) {
  await chargerReveal(base);
  const url = photoDe(car.code, base);
  const img = url ? await charger(url) : null;
  if (!img) return false;
  if (!document.getElementById('reveal-code-css')) { const st = document.createElement('style'); st.id = 'reveal-code-css'; st.textContent = CSS; document.head.appendChild(st); }
  const th = themeDe(car), S = STYLES[th.style] || STYLES.reel;
  const el = document.createElement('div');
  el.className = 'reveal-video reveal-code style-' + th.style;
  el.innerHTML = `<canvas class="rc-cv" style="position:absolute;inset:0;width:100%;height:100%"></canvas><div class="rv-panel deco">${infoHtml || ficheBolide(car, team)}</div>`;
  parent.appendChild(el);
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  motifs(ctx);
  let W = 0, H = 0;
  const taille = () => { W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight; const d = dprPour(W, H, '2d'); cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); };
  taille();
  const [c1, c2] = couleurs;
  const etincelles = [];
  const ratio = img.width / img.height;
  const pix = document.createElement('canvas'), pctx = pix.getContext('2d');          // style jeu vidéo : photo pixelisée
  const D = duree / 1000, tCarte = Math.max(1.6, D - 2.6);
  const t0 = performance.now();
  const etat = { car, c1, c2, cx: 0, cy: 0, phase: 0 };
  if (son) jingle(th.musique);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => el.classList.add('info'), tCarte * 1000 + 250);
  return new Promise((fin) => {
    const tache = boucle('reveal-code', (now, dtMs) => {
      const t = (now - t0) / 1000, dt = Math.min(0.05, dtMs / 1000);
      etat.phase = ease((t - tCarte) / 0.7);                                            // 0 : plein cadre ; 1 : photo à gauche + fiche
      // cadre photo : grand et centré, puis à gauche pour laisser la place à la fiche
      const fw0 = Math.min(W * 0.66, H * 0.8 * Math.max(1.2, ratio)), fw1 = Math.min(W * 0.46, H * 0.7 * Math.max(1.2, ratio));
      const fw = fw0 + (fw1 - fw0) * etat.phase, fh = fw / Math.max(1.2, ratio);
      const x0 = (W - fw0) / 2, x1 = W * 0.04;
      etat.cx = W / 2 + (W * 0.04 + fw1 / 2 - W / 2) * etat.phase; etat.cy = H / 2;
      S.fond(ctx, W, H, t, etat);
      const slam = S.rebond ? elastique(t / 0.8) : ease(t / 0.35);
      const choc = t > 0.3 && t < 0.65 ? Math.sin(t * 90) * 10 * (0.65 - t) / 0.35 : 0;
      const k = S.rebond ? 0.3 + 0.7 * slam : 1.6 - 0.6 * slam;
      const fx = x0 + (x1 - x0) * etat.phase + choc, fy = (H - fh) / 2 + choc * 0.6;
      ctx.save();
      ctx.translate(fx + fw / 2, fy + fh / 2); if (S.rotation) ctx.rotate(S.rotation * (1 - etat.phase * 0.5)); ctx.scale(k, k); ctx.translate(-fw / 2, -fh / 2);
      cadreArrondi(ctx, fw, fh, th.style === 'jeu_video' ? 4 : 22);
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#0b0b16'; ctx.fillRect(0, 0, fw, fh);
      const kb = 1.16 - 0.12 * Math.min(1, t / D), dx = (t / D - 0.5) * fw * 0.06;     // Ken Burns
      const ih = Math.max(fw * kb / ratio, fh * kb), iw = ih * ratio, ix = (fw - iw) / 2 + dx, iy = (fh - ih) / 2;
      if (S.photo) S.photo(ctx, t);
      if (S.pixels && t < 1.4) {                                                        // les pixels se dessinent
        const r = Math.max(8, Math.round(8 + (t / 1.4) * 150)); pix.width = r; pix.height = Math.max(4, Math.round(r / ratio));
        pctx.drawImage(img, 0, 0, pix.width, pix.height); ctx.imageSmoothingEnabled = false; ctx.drawImage(pix, ix, iy, iw, ih); ctx.imageSmoothingEnabled = true;
      } else ctx.drawImage(img, ix, iy, iw, ih);
      if (S.aberration) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18; ctx.drawImage(img, ix - 5, iy, iw, ih); ctx.drawImage(img, ix + 5, iy, iw, ih); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      ctx.filter = 'none';
      for (const ts of [0.8, tCarte - 0.6]) {                                            // balayages de lumière
        const p = (t - ts) / 0.6;
        if (p > 0 && p < 1) { const x = -fw * 0.4 + p * fw * 1.8, lg = ctx.createLinearGradient(x - 80, 0, x + 80, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.45)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, fw, fh); }
      }
      ctx.restore();
      if (S.cadre) S.cadre(ctx, fw, fh, etat); else { ctx.lineWidth = 6; ctx.strokeStyle = c1; ctx.shadowColor = c1; ctx.shadowBlur = 26; ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.restore();
      // étincelles de meuleuse au pied du cadre (thèmes « mécaniques »)
      if (['reel', 'retro80', 'jeu_video', 'film_noir'].includes(th.style) && t > 0.3 && t < tCarte) for (let i = 0; i < 5; i++) {
        const g = i % 2 === 0;
        etincelles.push({ x: g ? fx + 10 : fx + fw - 10, y: fy + fh - 6, vx: (g ? -1 : 1) * (180 + Math.random() * 520), vy: -(120 + Math.random() * 420), v: 1 });
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = etincelles.length - 1; i >= 0; i--) {
        const s = etincelles[i];
        s.vy += 980 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.v -= dt * 1.4;
        if (s.v <= 0 || s.y > H + 20) { etincelles.splice(i, 1); continue; }
        ctx.strokeStyle = th.style === 'film_noir' ? '#ffffff' : s.v > 0.6 ? '#fff6d0' : '#ffb347'; ctx.globalAlpha = Math.min(1, s.v * 1.4); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      S.dessus(ctx, W, H, t, etat);
      // flash d'impact puis fondu de sortie
      if (t < 0.45 && th.style !== 'manga') { ctx.fillStyle = `rgba(255,255,255,${(1 - t / 0.45) * 0.85})`; ctx.fillRect(0, 0, W, H); }
      if (t > D - 0.45) { ctx.fillStyle = `rgba(0,0,0,${(t - (D - 0.45)) / 0.45})`; ctx.fillRect(0, 0, W, H); }
      if (t >= D) { tache.arreter(); el.classList.add('out'); setTimeout(() => { el.remove(); fin(true); }, 250); }
    }, { fps: 60, premierPlan: true });
    addEventListener('resize', taille, { once: true });
  });
}
