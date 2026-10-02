/* Synthétiseur audio procédural : bruitages des invités, jingles de l'émission, voix des commentateurs.
   Le synthétiseur sert de repli : quand la banque d'échantillons (web/sounds) est présente, elle est utilisée en priorité. */

let ac = null, master = null, comp = null, muted = false;

export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    master = ac.createGain(); master.gain.value = 0.7;
    master.connect(comp); comp.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  if (BANK && !unlock.pre) { unlock.pre = true; preloadMode(bankMode); }
  return true;
}
export const setMuted = (m) => { muted = m; if (master) master.gain.value = m ? 0 : 0.7; };
export const isMuted = () => muted;

function env(g, t, a, d, peak = 1, end = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + d);
}
function osc(type, f0, t, dur, { f1 = null, vol = 0.3, a = 0.005, detune = 0, dest = null } = {}) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.detune.value = detune;
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, a, dur, vol);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(t, dur, { vol = 0.3, freq = 1200, q = 1, type = 'bandpass', f1 = null, dest = null } = {}) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(); env(g, t, 0.005, dur, vol);
  s.connect(f); f.connect(g); g.connect(dest || master); s.start(t); s.stop(t + dur + 0.05);
}
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ------------------------------------------------------------------ bruitages d'invités */
const TAUNT = {
  klaxon: (t) => { osc('square', 392, t, 0.28, { vol: 0.22 }); osc('square', 494, t, 0.28, { vol: 0.22 }); osc('square', 392, t + 0.34, 0.4, { vol: 0.22 }); osc('square', 494, t + 0.34, 0.4, { vol: 0.22 }); },
  v8: (t) => { for (let i = 0; i < 6; i++) osc('sawtooth', 55 + i * 9, t + i * 0.09, 0.2, { f1: 70 + i * 22, vol: 0.2 }); noise(t, 0.7, { vol: 0.12, freq: 220, type: 'lowpass' }); },
  turbo: (t) => { noise(t, 0.9, { vol: 0.25, freq: 600, f1: 7000, q: 2 }); osc('sawtooth', 120, t, 0.9, { f1: 1500, vol: 0.12 }); },
  pneus: (t) => { noise(t, 0.8, { vol: 0.3, freq: 3200, f1: 2200, q: 5 }); osc('sawtooth', 1900, t, 0.8, { f1: 1400, vol: 0.05 }); },
  banane: (t) => { osc('sine', 900, t, 0.5, { f1: 150, vol: 0.3 }); osc('triangle', 1200, t + 0.15, 0.4, { f1: 200, vol: 0.2 }); noise(t + 0.5, 0.15, { vol: 0.2, freq: 400, type: 'lowpass' }); },
  rire: (t) => { for (let i = 0; i < 7; i++) osc('sawtooth', 320 + (i % 2) * 90 - i * 8, t + i * 0.11, 0.1, { vol: 0.14 }); },
  eclair: (t) => { noise(t, 0.35, { vol: 0.4, freq: 5000, f1: 300, q: 0.7 }); osc('square', 1800, t, 0.25, { f1: 90, vol: 0.2 }); osc('sine', 60, t + 0.05, 0.5, { vol: 0.4 }); },
  sirene: (t) => { for (let i = 0; i < 4; i++) osc('sine', i % 2 ? 640 : 960, t + i * 0.25, 0.25, { f1: i % 2 ? 960 : 640, vol: 0.25 }); },
  fanfare: (t) => { [67, 67, 67, 72, 76].forEach((n, i) => osc('sawtooth', N(n), t + i * 0.16 + (i === 4 ? 0.1 : 0), i === 4 ? 0.7 : 0.14, { vol: 0.16 })); },
  crash: (t) => { noise(t, 0.9, { vol: 0.5, freq: 1800, f1: 120, q: 0.6 }); osc('sine', 90, t, 0.6, { f1: 30, vol: 0.5 }); osc('square', 600, t, 0.1, { f1: 80, vol: 0.2 }); },
};
export function taunt(id) {
  if (!unlock() || muted) return;
  if (BANK && BANK.taunts && BANK.taunts[id] && playId(BANK.taunts[id][Math.floor(Math.random() * BANK.taunts[id].length)])) return;
  (TAUNT[id] || TAUNT.klaxon)(ac.currentTime + 0.01);
}

/* ------------------------------------------------------------------ jingles d'émission */
const J = {
  beep: (t) => osc('square', 880, t, 0.14, { vol: 0.2 }),
  beepLow: (t) => osc('square', 440, t, 0.14, { vol: 0.2 }),
  go: (t) => { osc('square', 1320, t, 0.55, { vol: 0.22 }); osc('sawtooth', 660, t, 0.55, { vol: 0.16 }); noise(t, 0.6, { vol: 0.15, freq: 4000, f1: 1000 }); },
  coin: (t) => { osc('square', N(83), t, 0.07, { vol: 0.14 }); osc('square', N(88), t + 0.07, 0.3, { vol: 0.14 }); },
  gong: (t) => { [110, 165, 220, 277, 331].forEach((f, i) => osc('sine', f * (1 + i * 0.002), t, 2.2, { vol: 0.2 / (1 + i * 0.5) })); noise(t, 0.2, { vol: 0.15, freq: 3000, type: 'highpass' }); },
  tick: (t) => osc('triangle', 1200, t, 0.04, { vol: 0.12 }),
  join: (t) => { osc('sine', N(76), t, 0.18, { vol: 0.2 }); osc('sine', N(83), t + 0.1, 0.35, { vol: 0.2 }); },
  reveal: (t) => { [60, 64, 67, 72, 76].forEach((n, i) => osc('triangle', N(n), t + i * 0.07, 0.5, { vol: 0.16 })); noise(t, 0.5, { vol: 0.08, freq: 2000, f1: 6000 }); },
  drumroll: (t) => { for (let i = 0; i < 28; i++) noise(t + i * 0.055, 0.05, { vol: 0.12 + i * 0.006, freq: 900, q: 0.8 }); },
  win: (t) => { [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => { osc('sawtooth', N(n), t + i * 0.12, 0.3, { vol: 0.13 }); osc('square', N(n - 12), t + i * 0.12, 0.3, { vol: 0.08 }); }); },
  award: (t) => { [67, 72, 76, 79, 84].forEach((n, i) => { osc('sawtooth', N(n), t + i * 0.1, 1.1, { vol: 0.1 }); osc('triangle', N(n - 12), t + i * 0.1, 1.1, { vol: 0.12 }); }); noise(t + 0.4, 1.2, { vol: 0.1, freq: 6000, type: 'highpass' }); },
  trap: (t) => { osc('square', 300, t, 0.2, { f1: 100, vol: 0.2 }); noise(t, 0.2, { vol: 0.2, freq: 500, type: 'lowpass' }); },
  weather: (t) => { noise(t, 1.2, { vol: 0.2, freq: 400, f1: 3000, q: 1.5 }); osc('sine', 80, t, 1, { f1: 40, vol: 0.3 }); },
  chaos: (t) => { for (let i = 0; i < 10; i++) osc('square', 220 + Math.random() * 900, t + i * 0.06, 0.08, { vol: 0.14 }); osc('sawtooth', 70, t + 0.6, 0.6, { vol: 0.3 }); },
  error: (t) => { osc('square', 180, t, 0.18, { vol: 0.2 }); osc('square', 140, t + 0.16, 0.25, { vol: 0.2 }); },
};
export function sfx(name) {
  if (!unlock() || muted) return;
  const ev = LEGACY[name];
  if (ev && BANK) { const ids = idsFor(ev); if (ids && ids.length && playId(ids[Math.floor(Math.random() * ids.length)])) return; }
  (J[name] || J.tick)(ac.currentTime + 0.01);
}


/* ------------------------------------------------------------------ musique d'ambiance par mode (procédurale) */
let mbus = null, mTimer = null, mStep = 0, mId = null, mOn = true;
const rnd = (a) => a[(Math.random() * a.length) | 0];
const MUSIC = {
  noel: { ms: 300, step: (t, n, d) => {                                  // cheminée & clochettes
    if (Math.random() > 0.4) noise(t, 0.05, { vol: 0.06, freq: 700 + Math.random() * 900, q: 0.7, dest: d });
    if (n % 4 === 0) noise(t, 0.08, { vol: 0.03, freq: 7000, type: 'highpass', dest: d });
    const mel = [76, 0, 0, 79, 0, 81, 0, 0, 83, 0, 0, 81, 0, 79, 0, 0][n % 16];
    if (mel) { osc('triangle', N(mel), t, 0.9, { vol: 0.10, dest: d }); osc('sine', N(mel + 12), t, 0.6, { vol: 0.04, dest: d }); }
    if (n % 16 === 0) { [48, 55, 60].forEach((x) => osc('sine', N(x), t, 4.2, { vol: 0.07, a: 0.4, dest: d })); }
  } },
  noel_pure: { ms: 190, step: (t, n, d) => {                             // clochettes glacées + pouls
    const arp = [84, 88, 91, 96, 91, 88][n % 6];
    osc('triangle', N(arp), t, 0.35, { vol: 0.07, dest: d });
    if (n % 4 === 0) osc('sine', 120, t, 0.18, { f1: 45, vol: 0.28, dest: d });
    if (n % 2 === 1) noise(t, 0.04, { vol: 0.04, freq: 8000, type: 'highpass', dest: d });
    if (n % 24 === 0) [53, 60, 65].forEach((x) => osc('sine', N(x), t, 4, { vol: 0.05, a: 0.5, dest: d }));
  } },
  survival: { ms: 200, step: (t, n, d) => {                              // cœur qui bat + drone d'alerte
    if (n % 8 === 0) osc('sine', 70, t, 0.2, { f1: 34, vol: 0.5, dest: d });
    if (n % 8 === 2) osc('sine', 62, t, 0.18, { f1: 32, vol: 0.34, dest: d });
    if (n % 32 === 0) { osc('triangle', 55, t, 6.4, { vol: 0.09, a: 0.8, dest: d }); osc('triangle', 58.3, t, 6.4, { vol: 0.09, a: 0.8, dest: d }); }
    if (n % 16 === 12) osc('square', 880, t, 0.06, { vol: 0.05, dest: d });
    if (n % 16 === 14) osc('square', 880, t, 0.06, { vol: 0.05, dest: d });
  } },
  tokyo: { ms: 115, step: (t, n, d) => {                                 // trap 808 + lead Miku
    const b = n % 16;
    if (b === 0 || b === 6 || b === 10) osc('sine', 160, t, 0.25, { f1: 45, vol: 0.5, dest: d });
    if (b % 2 === 1 || b === 14) noise(t, 0.04, { vol: b % 4 === 2 ? 0.1 : 0.05, freq: 8000, type: 'highpass', dest: d });
    if (b === 4 || b === 12) noise(t, 0.1, { vol: 0.22, freq: 1400, dest: d });
    const mel = [587, 0, 587, 0, 698, 0, 784, 0, 830, 0, 784, 0, 698, 0, 587, 0, 523, 0, 523, 0, 587, 0, 698, 0, 587, 0, 440, 0, 523, 0, 587, 0][n % 32];
    if (mel) osc('square', mel, t, 0.16, { vol: 0.13, dest: d });
  } },
  musette: { ms: 170, step: (t, n, d) => {                               // valse musette, accordéon
    const b = n % 6, bar = ((n / 6) | 0) % 4;
    const bass = [41, 48, 46, 41][bar], chord = [[57, 60, 65], [55, 60, 64], [58, 62, 65], [57, 60, 65]][bar];
    if (b === 0) osc('triangle', N(bass), t, 0.4, { vol: 0.2, dest: d });
    if (b === 2 || b === 4) chord.forEach((x) => osc('triangle', N(x), t, 0.22, { vol: 0.06, dest: d }));
    const mel = [[72, 0, 76, 77, 0, 79], [79, 0, 76, 72, 0, 76], [74, 0, 77, 79, 0, 77], [81, 0, 79, 77, 0, 0]][bar][b];
    if (mel) { osc('sawtooth', N(mel), t, 0.3, { vol: 0.05, detune: -9, dest: d }); osc('sawtooth', N(mel), t, 0.3, { vol: 0.05, detune: 9, dest: d }); }
  } },
  frenchtouch: { ms: 125, step: (t, n, d) => {                           // house filtrée « French touch »
    const b = n % 16, bar = ((n / 16) | 0) % 4;
    if (b % 4 === 0) osc('sine', 120, t, 0.2, { f1: 42, vol: 0.45, dest: d });
    if (b % 4 === 2) noise(t, 0.05, { vol: 0.08, freq: 9000, type: 'highpass', dest: d });
    if (b === 4 || b === 12) noise(t, 0.1, { vol: 0.12, freq: 1800, dest: d });
    const chord = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]][bar];
    if (b % 2 === 0) chord.forEach((x) => osc('sawtooth', N(x), t, 0.11, { vol: 0.022 + 0.012 * Math.sin(n * 0.05), dest: d }));
    const bass = [45, 41, 43, 40][bar];
    if (b % 4 === 3 || b === 0) osc('square', N(bass), t, 0.16, { vol: 0.09, dest: d });
  } },
  western: { ms: 150, step: (t, n, d) => {                               // galop western + guitare twang
    const b = n % 8, bar = ((n / 8) | 0) % 4;
    if (b === 0 || b === 3 || b === 6) noise(t, 0.05, { vol: 0.12, freq: 600, q: 2, dest: d });       // sabots
    if (b === 0) osc('sine', 90, t, 0.2, { f1: 40, vol: 0.3, dest: d });
    const bass = [40, 45, 47, 40][bar];
    if (b === 0 || b === 4) osc('triangle', N(bass), t, 0.25, { vol: 0.16, dest: d });
    const mel = [[64, 0, 67, 0, 69, 0, 67, 64], [69, 0, 72, 0, 74, 0, 72, 69], [71, 0, 74, 0, 76, 74, 71, 0], [64, 0, 0, 0, 64, 0, 0, 0]][bar][b];
    if (mel) { osc('sawtooth', N(mel), t, 0.28, { vol: 0.06, f1: N(mel) * 0.985, dest: d }); osc('triangle', N(mel - 12), t, 0.3, { vol: 0.05, dest: d }); }
    if (n % 32 === 28) osc('square', N(76), t, 0.6, { vol: 0.04, f1: N(64), dest: d });               // sifflet
  } },
  techno: { ms: 110, step: (t, n, d) => {                                // techno F1
    if (n % 4 === 0) osc('sine', 140, t, 0.16, { f1: 40, vol: 0.42, dest: d });
    const bf = [110, 110, 130, 146, 110, 110, 164, 146][n % 8];
    osc('sawtooth', bf, t, 0.1, { vol: 0.08, dest: d });
    if (n % 2 === 1) noise(t, 0.04, { vol: 0.05, freq: 9000, type: 'highpass', dest: d });
    if (n % 8 === 4) noise(t, 0.12, { vol: 0.16, freq: 1600, dest: d });
  } },
  chiptune: { ms: 100, step: (t, n, d) => {                              // chiptune arcade, 150 BPM
    const sc = [523, 659, 784, 987, 1046, 987, 784, 659][n % 8];
    osc('square', sc, t, 0.09, { vol: 0.09, dest: d });
    if (n % 4 === 0) osc('square', [130, 98, 110, 87][((n / 4) | 0) % 4], t, 0.2, { vol: 0.14, dest: d });
    if (n % 2 === 0) noise(t, 0.03, { vol: 0.05, freq: 9000, type: 'highpass', dest: d });
    if (n % 8 === 4) noise(t, 0.08, { vol: 0.14, freq: 1800, dest: d });
  } },
  synthwave: { ms: 150, step: (t, n, d) => {                             // Outrun 85
    const root = [45, 45, 45, 45, 43, 43, 41, 41][n % 8];
    osc('sawtooth', N(root), t, 0.14, { vol: 0.1, dest: d });
    if (n % 4 === 0) osc('sine', 130, t, 0.2, { f1: 42, vol: 0.4, dest: d });
    if (n % 8 === 4) noise(t, 0.13, { vol: 0.17, freq: 1900, dest: d });
    if (n % 2 === 0) osc('triangle', N([69, 72, 76, 72][(n / 2) % 4 | 0]), t, 0.2, { vol: 0.07, dest: d });
    if (n % 32 === 0) [57, 60, 64].forEach((x) => osc('sawtooth', N(x), t, 4.6, { vol: 0.03, a: 0.5, dest: d }));
  } },
};
export const MUSIC_IDS = Object.keys(MUSIC);
export const isMusicOn = () => mOn;
export const currentMusic = () => mId;
function musicTick() {
  const m = MUSIC[mId];
  if (!m || !ac || !mOn) return;
  try { m.step(ac.currentTime + 0.03, mStep++, mbus); } catch (e) { /* ignore */ }
}
/** Lance (ou change) la musique d'ambiance. Appeler après un geste utilisateur. */
export function musicStart(id) {
  if (!unlock()) return false;
  if (!MUSIC[id]) id = 'noel';
  if (!mbus) { mbus = ac.createGain(); mbus.gain.value = 0; mbus.connect(master); }
  if (mId === id && mTimer) return true;
  const fade = !!mTimer;
  clearInterval(mTimer); mTimer = null;
  mbus.gain.cancelScheduledValues(ac.currentTime);
  mbus.gain.setTargetAtTime(0, ac.currentTime, 0.08);
  const go = () => { mId = id; mStep = 0; if (mOn) { mbus.gain.setTargetAtTime(0.75, ac.currentTime, 0.25); } mTimer = setInterval(musicTick, MUSIC[id].ms); };
  if (fade) setTimeout(go, 380); else go();
  mId = id;
  return true;
}
export function musicStop() { clearInterval(mTimer); mTimer = null; if (mbus && ac) mbus.gain.setTargetAtTime(0, ac.currentTime, 0.1); }
export function setMusicOn(on) {
  mOn = !!on;
  if (!ac || !mbus) return;
  mbus.gain.cancelScheduledValues(ac.currentTime);
  mbus.gain.setTargetAtTime(mOn && mTimer ? 0.75 : 0, ac.currentTime, 0.15);
}

/** Jingle de Noël (« Vive le vent », domaine public), version chiptune. */
export function carol() {
  if (!unlock() || muted) return;
  const t0 = ac.currentTime + 0.05, notes = [[64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2], [64, 1], [67, 1], [60, 1.5], [62, .5], [64, 4]];
  let t = t0;
  notes.forEach(([n, d]) => { osc('triangle', N(n + 12), t, d * 0.22, { vol: 0.14 }); osc('sine', N(n), t, d * 0.22, { vol: 0.1 }); t += d * 0.24; });
}

/* ------------------------------------------------------------------ voix des commentateurs */
let voices = [];
function loadVoices() { voices = (window.speechSynthesis?.getVoices() || []).filter((v) => /^fr/i.test(v.lang)); }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
export const canSpeak = () => 'speechSynthesis' in window;
export function speak(text, who = 'JM') {
  if (!canSpeak() || muted) return Promise.resolve();
  return new Promise((res) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    const pick = voices.length ? voices[who === 'JM' ? 0 : Math.min(1, voices.length - 1)] : null;
    if (pick) u.voice = pick;
    u.pitch = who === 'JM' ? 0.8 : 1.25; u.rate = who === 'JM' ? 1.08 : 1.0;
    u.onend = res; u.onerror = res;
    speechSynthesis.speak(u);
    setTimeout(res, 14000);
  });
}
export function stopSpeaking() { if (canSpeak()) speechSynthesis.cancel(); }

/** Vibration légère (téléphones). */
export const buzz = (p = 12) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* ignore */ } };

/* ================================================================== BANQUE D'ÉCHANTILLONS
   Sons choisis dans le dossier « Noël\sound » (voir outils/construire_banque_sons.py et web/sounds/manifest.json).
   Chaque événement du jeu se résout dans cet ordre : pack du mode de jeu → pack par défaut → synthèse procédurale.
   Si la banque est absente (site publié sans les sons), tout retombe silencieusement sur le synthétiseur. */
let BANK = null, bankBase = '', bankMode = 'gp_bets', sfxBus = null, ambBus = null;
const buffers = new Map();                 // id -> AudioBuffer | Promise
const LEGACY = { beep: 'beep', beepLow: 'beep', go: 'go', coin: 'coin', gong: 'bets.open', tick: 'tick', join: 'join', reveal: 'reveal',
  win: 'win', award: 'award', trap: 'trap', weather: 'weather', chaos: 'roulette', error: 'ui.error' };

function bus() {
  if (!sfxBus && ac) { sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master); ambBus = ac.createGain(); ambBus.gain.value = 0.55; ambBus.connect(master); }
  return sfxBus;
}
/** Charge le manifeste de la banque de sons (sans bloquer : le jeu fonctionne pendant le chargement). */
export async function loadBank(manifestUrl) {
  try {
    const r = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!r.ok) return false;
    BANK = await r.json();
    bankBase = manifestUrl.replace(/manifest\.json.*$/, '');
    if (ac) preloadMode(bankMode);
    return true;
  } catch { BANK = null; return false; }
}
export const hasBank = () => !!BANK;
function load(id) {
  if (!BANK || !ac || !BANK.sfx[id]) return null;
  const cur = buffers.get(id);
  if (cur) return cur;
  const p = fetch(bankBase + BANK.sfx[id].src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
    .then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
    .then((buf) => { buffers.set(id, buf); return buf; })
    .catch(() => { buffers.set(id, 'x'); return null; });
  buffers.set(id, p);
  return p;
}
function idsFor(event) {
  if (!BANK) return null;
  const m = BANK.modes[bankMode] || {};
  return m[event] || BANK.events[event] || null;
}
function preloadIds(ids) { (ids || []).forEach((id) => load(id)); }
function preloadMode(mode) {
  if (!BANK || !ac) return;
  Object.values(BANK.events).forEach(preloadIds);
  Object.values(BANK.modes[mode] || {}).forEach(preloadIds);
}
/** Change le pack sonore (un par mode de jeu) et précharge ses sons. */
export function setSoundMode(mode) { bankMode = mode || 'gp_bets'; preloadMode(bankMode); }
/** Précharge les signatures sonores d'écuries (et leurs voix de bolides) pour qu'elles partent sans délai. */
export function preloadTeams(teamIds) {
  if (!BANK) return;
  (teamIds || Object.keys(BANK.teams)).forEach((tid) => { const t = BANK.teams[tid]; if (t) ['join', 'win', 'taunt'].forEach((k) => preloadIds(t[k])); });
}
function playBuf(buf, { rate = 1, gain = 1, dest = null, when = 0 } = {}) {
  const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const g = ac.createGain(); g.gain.value = gain;
  s.connect(g); g.connect(dest || bus()); s.start(ac.currentTime + 0.01 + when);
  return s;
}
/* La musique s'efface sous les jingles et les voix (« ducking »), puis revient. */
let duckTimer = null;
const duckListeners = new Set();
/** Abonnement au « ducking » (utilisé par le lecteur de playlists) : fn(niveau 0..1). */
export const onDuck = (fn) => { duckListeners.add(fn); return () => duckListeners.delete(fn); };
function duck(meta) {
  if (!meta || !(meta.cat === 'jingle' || meta.cat === 'voice')) return;
  const ms = Math.min(6000, meta.dur * 1000 + 150);
  duckListeners.forEach((f) => f(0.3, ms));
  if (!mbus || !mOn) return;
  mbus.gain.cancelScheduledValues(ac.currentTime);
  mbus.gain.setTargetAtTime(0.22, ac.currentTime, 0.05);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => { if (mbus && mOn) mbus.gain.setTargetAtTime(0.75, ac.currentTime, 0.4); }, Math.min(6000, meta.dur * 1000 + 150));
}
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** Joue un échantillon par identifiant. Retourne true si joué. */
export function playId(id, opt = {}) {
  if (!unlock() || muted || !BANK) return false;
  const b = buffers.get(id);
  if (b && b !== 'x' && !(b instanceof Promise)) { playBuf(b, opt); duck(BANK.sfx[id]); return true; }
  if (!b) load(id);
  return false;
}
/** Joue un événement de jeu (pack du mode → défaut). `fallback` : nom de jingle synthétique si l'échantillon n'est pas prêt. */
export function play(event, opt = {}) {
  if (!unlock() || muted) return;
  const ids = idsFor(event);
  if (ids && ids.length && playId(pickOne(ids), opt)) return;
  if (opt.fallback) (J[opt.fallback] || J.tick)(ac.currentTime + 0.01);
}
/** Sons d'écurie : kind = 'join' | 'win' | 'taunt'. */
export function teamSound(teamId, kind = 'join') {
  if (!BANK) return false;
  const t = BANK.teams[String(teamId)];
  return !!(t && t[kind] && playId(pickOne(t[kind])));
}
/** Voix d'un bolide « parlant » (univers Batman en VF, Pikachu, Miku…). */
export function carVoice(code) {
  if (!BANK || !BANK.cars[code]) return false;
  return playId(pickOne(BANK.cars[code]));
}
export function preloadCars(codes) { if (BANK) (codes || []).forEach((c) => preloadIds(BANK.cars[c])); }
export const teamVoice = (teamId) => (BANK && BANK.teams[String(teamId)]) || null;

/* ---------- ambiance météo en boucle */
let ambSrc = null, ambId = null;
export function ambience(weatherId) {
  const id = BANK && weatherId ? BANK.weather[weatherId] : null;
  if (id === ambId) return;
  ambId = id;
  if (ambSrc) { const old = ambSrc; try { old.g.gain.setTargetAtTime(0, ac.currentTime, 0.5); setTimeout(() => { try { old.s.stop(); } catch { /* déjà arrêté */ } }, 2500); } catch { /* ignore */ } ambSrc = null; }
  if (!id || !unlock() || muted) return;
  const go = (buf) => {
    if (!buf || buf === 'x' || ambId !== id) return;
    bus();
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    const g = ac.createGain(); g.gain.value = 0; s.connect(g); g.connect(ambBus); s.start();
    g.gain.setTargetAtTime(1, ac.currentTime, 1.2);
    ambSrc = { s, g };
  };
  const b = buffers.get(id);
  if (b instanceof Promise) b.then(go); else if (b) go(b); else { const p = load(id); if (p) p.then(go); }
}

/* ---------- « Animalese » : voix-bulles façon Animal Crossing à partir des syllabes de la banque */
const voiceBufs = new Map();
function loadVoice(type) {
  if (!BANK || !ac || !BANK.voices[type]) return null;
  if (voiceBufs.has(type)) return voiceBufs.get(type);
  const p = fetch(bankBase + BANK.voices[type].src).then((r) => r.arrayBuffer())
    .then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
    .then((buf) => { voiceBufs.set(type, buf); return buf; }).catch(() => null);
  voiceBufs.set(type, p);
  return p;
}
export function preloadVoices(types) { (types || Object.keys((BANK && BANK.voices) || {})).forEach(loadVoice); }
/** Découpe un texte français en syllabes « kana » approximatives. */
export function syllables(text) {
  let s = String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const rep = [[/eau|au/g, 'o'], [/ou/g, 'u'], [/oi/g, 'wa'], [/ai|ei/g, 'e'], [/qu/g, 'k'], [/ph/g, 'f'], [/ch/g, 'sh'], [/gn/g, 'ny'],
    [/c(?=[eiy])/g, 's'], [/g(?=[eiy])/g, 'j'], [/c/g, 'k'], [/q/g, 'k'], [/x/g, 'ks'], [/v/g, 'b'], [/l/g, 'r'], [/w/g, 'w'], [/y/g, 'i'],
    [/h/g, ''], [/([a-z])\1+/g, '$1']];
  rep.forEach(([re, to]) => { s = s.replace(re, to); });
  const out = [];
  const words = s.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    let i = 0;
    while (i < w.length) {
      const m = w.slice(i).match(/^(sh|ch|ts|[bcdfghjkmnprstwyz])?([aeiou])/);
      if (m) { out.push((m[1] || '') + m[2]); i += m[0].length; }
      else { const c = w[i]; out.push(c === 'n' || c === 'm' ? 'n' : (c + 'u')); i += 1; }
    }
    out.push(' ');
  }
  return out;
}
/** Prononce un texte en « Animalese ». voice : type de voix (Futsu, Genki, Kowai…) ; pitch : hauteur ;
    onSyl(i) : rappel par syllabe (pour un effet machine à écrire). Retourne une promesse résolue à la fin. */
export async function animalese(text, { voice = 'Futsu', pitch = 1, rate = 1, onSyl = null } = {}) {
  if (!unlock() || muted || !BANK || !BANK.voices[voice]) return false;
  const buf = await loadVoice(voice);
  if (!buf) return false;
  const map = BANK.voices[voice].map;
  const syl = syllables(text);
  const step = 0.075 / rate;
  let t = ac.currentTime + 0.05, n = 0;
  syl.forEach((k, i) => {
    if (k === ' ') { t += step * 0.9; return; }
    const key = map[k] ? k : (map[k.slice(-1)] ? k.slice(-1) : 'a');
    const [off, dur] = map[key];
    const s = ac.createBufferSource(); s.buffer = buf;
    s.playbackRate.value = pitch * (1 + (Math.random() - 0.5) * 0.12) * 1.35;   // un peu accéléré, légère variation
    const g = ac.createGain(); g.gain.value = 0.9;
    s.connect(g); g.connect(bus());
    s.start(t, off, Math.min(dur, 0.11));
    if (onSyl) setTimeout(() => onSyl(i, syl.length), (t - ac.currentTime) * 1000);
    t += step; n++;
  });
  await new Promise((r) => setTimeout(r, (t - ac.currentTime) * 1000 + 120));
  return n > 0;
}
