/* ==========================================================================
   CAISSES — roulette d'ouverture (Canvas 2D, 60 FPS), sons procéduraux, tirage vérifiable.
   Partagé par le Pocket Pit (/pit/), la TV (/tv/) et la Salle des Caisses (/caisses/).

   Le TIRAGE est fait par le relais (relay/lootbox.py) : la roulette ne fait que METTRE EN SCÈNE un résultat déjà
   connu (bande de 48 cartes + index gagnant). Ce module contient aussi un SHA-256 / HMAC en JavaScript pur pour
   VÉRIFIER chaque tirage après la révélation de la graine (fonctionne aussi en http:// sur le Wi-Fi local, où
   crypto.subtle n'existe pas). Les résultats sont identiques bit à bit à ceux du relais (test : section 21).
   ========================================================================== */

/* ------------------------------------------------------------------ couleurs de rareté (CS-like) */
export const RARETES = {
  commun: { nom: 'Commun', c1: '#9fb3d1', c2: '#4c6a9a', glow: 'rgba(140,170,220,.55)' },
  rare: { nom: 'Rare', c1: '#b07cff', c2: '#5b2bd6', glow: 'rgba(160,100,255,.7)' },
  epique: { nom: 'Épique', c1: '#ff5cc8', c2: '#b0127a', glow: 'rgba(255,80,190,.75)' },
  legendaire: { nom: 'Légendaire', c1: '#ffd34d', c2: '#e2321e', glow: 'rgba(255,190,40,.9)' },
};
export const ORDRE = ['commun', 'rare', 'epique', 'legendaire'];

/* ================================================================== SHA-256 / HMAC (pur JS, FIPS 180-4) */
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
export function sha256(bytes) {
  const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(nb); m.set(bytes); m[l] = 0x80;
  const bits = l * 8; const dv = new DataView(m.buffer);
  dv.setUint32(nb - 4, bits >>> 0); dv.setUint32(nb - 8, Math.floor(bits / 4294967296));
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32); const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]);
  return out;
}
const utf8 = (s) => new TextEncoder().encode(s);
export const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export const unhex = (s) => new Uint8Array((s.match(/../g) || []).map((x) => parseInt(x, 16)));
export function hmacSha256(key, msg) {
  let k = key.length > 64 ? sha256(key) : key;
  const kp = new Uint8Array(64); kp.set(k);
  const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) { ip[i] = kp[i] ^ 0x36; op[i] = kp[i] ^ 0x5c; }
  ip.set(msg, 64);
  op.set(sha256(ip), 64);
  return sha256(op);
}
export const empreinte = (seedHex) => hex(sha256(unhex(seedHex)));
/* u = 8 octets big-endian / 2^64, exactement comme int.from_bytes(..., "big") / 2**64 côté Python */
function u64(b, o) {
  let x = 0n;
  for (let i = 0; i < 8; i++) x = (x << 8n) | BigInt(b[o + i]);
  return Number(x) / 18446744073709551616;
}

/* ================================================================== tirage (miroir exact de relay/lootbox.py) */
export function choisirRarete(u, table) {
  let acc = 0, last = null;
  for (const r of ORDRE) { const p = table[r] || 0; if (p <= 0) continue; last = r; acc += p; if (u < acc) return r; }
  return last;
}
export function tablePitie(table) {
  const t = {}; let s = 0;
  for (const r of ['epique', 'legendaire']) if ((table[r] || 0) > 0) { t[r] = table[r]; s += table[r]; }
  if (!s) return table;
  for (const r in t) t[r] /= s;
  return t;
}
/** caisses : DATA.rules.caisses (rules.CAISSES publié par le relais) */
export function tirer(caisses, seedHex, epoque, nonce, equipe, famille, gamme, pitie = false) {
  const msg = `${epoque}:${nonce}:${equipe}:${famille}:${gamme}`;
  const key = unhex(seedHex);
  const h = hmacSha256(key, utf8(msg));
  const g = caisses.gammes.find((x) => x.id === gamme);
  let table = g.tirageEffectif[famille];
  if (pitie) table = tablePitie(table);
  const rar = choisirRarete(u64(h, 0), table);
  const pool = caisses.contenu[famille][rar];
  const item = pool[Math.min(pool.length - 1, Math.floor(u64(h, 8) * pool.length))];
  const n = caisses.bande.longueur, gw = caisses.bande.gagnant, base = g.tirageEffectif[famille];
  const bande = [];
  for (let k = 0; k < n; k++) {
    if (k === gw) { bande.push(item); continue; }
    const hk = hmacSha256(key, utf8(`${msg}:bande:${k}`));
    const rk = choisirRarete(u64(hk, 0), base);
    const pk = caisses.contenu[famille][rk];
    bande.push(pk[Math.min(pk.length - 1, Math.floor(u64(hk, 8) * pk.length))]);
  }
  return { rarete: rar, item, msg, pitie: !!pitie, bande, gagnant: gw };
}
/** Vérifie le journal d'ouvertures publié (state.loot.log) contre une graine révélée et son empreinte. */
export function verifier(caisses, seedHex, engagement, journal) {
  if (empreinte(seedHex) !== engagement) return { ok: false, ecarts: ['la graine ne correspond pas à l\'empreinte publiée'] };
  const ecarts = [];
  for (const o of journal) {
    const [ep, nonce, eq, fam, gam] = o.msg.split(':');
    const r = tirer(caisses, seedHex, +ep, +nonce, +eq, fam, gam, !!o.pity);
    if (r.item !== o.item) ecarts.push(`${o.msg} : ${r.item} attendu, ${o.item} journalisé`);
  }
  return { ok: !ecarts.length, ecarts, n: journal.length };
}

/* ================================================================== audio procédural */
let AC = null, OUT = null;
function audio() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C();
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5;
    OUT = AC.createGain(); OUT.gain.value = 0.8; OUT.connect(comp); comp.connect(AC.destination);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
export function setVolume(v) { audio(); if (OUT) OUT.gain.value = v; }
function tone(type, f0, t, dur, { f1 = null, vol = 0.2, a = 0.004 } = {}) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  o.connect(g); g.connect(OUT); o.start(t); o.stop(t + a + dur + 0.05);
}
function bruit(t, dur, { vol = 0.2, f = 2000, f1 = null, q = 1, type = 'bandpass' } = {}) {
  const n = Math.max(1, Math.floor(AC.sampleRate * dur)), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(); s.buffer = buf;
  const bq = AC.createBiquadFilter(); bq.type = type; bq.frequency.setValueAtTime(f, t); bq.Q.value = q; if (f1) bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bq); bq.connect(g); g.connect(OUT); s.start(t); s.stop(t + dur + 0.05);
}
export const SONS = {
  tick(speed = 1) {                       // clic de cran : plus sec quand la roue ralentit
    if (!audio()) return; const t = AC.currentTime + 0.001, p = 1 + (Math.random() - 0.5) * 0.06;
    tone('triangle', 2300 * p, t, 0.012, { vol: 0.09 + 0.05 * (1 - Math.min(1, speed)) });
    bruit(t, 0.018, { vol: 0.05, f: 5200, q: 2.5 });
  },
  depart() { if (!audio()) return; const t = AC.currentTime; bruit(t, 0.5, { vol: 0.18, f: 400, f1: 4200, q: 1.2 }); tone('sawtooth', 90, t, 0.45, { f1: 260, vol: 0.06 }); },
  coeur() { if (!audio()) return; const t = AC.currentTime; tone('sine', 62, t, 0.16, { vol: 0.5 }); tone('sine', 55, t + 0.2, 0.2, { vol: 0.4 }); },
  commun() { if (!audio()) return; const t = AC.currentTime; tone('sine', 660, t, 0.25, { vol: 0.16 }); tone('sine', 880, t + 0.08, 0.35, { vol: 0.12 }); },
  rare() {
    if (!audio()) return; const t = AC.currentTime;
    [72, 76, 79, 84].forEach((n, i) => tone('triangle', 440 * 2 ** ((n - 69) / 12), t + i * 0.06, 0.6, { vol: 0.13 }));
    bruit(t, 0.4, { vol: 0.12, f: 6000, f1: 1500, q: 0.8 });
  },
  epique() {
    if (!audio()) return; const t = AC.currentTime;
    [69, 73, 76, 81, 85, 88].forEach((n, i) => { tone('sawtooth', 440 * 2 ** ((n - 69) / 12), t + i * 0.05, 0.8, { vol: 0.07 }); tone('triangle', 440 * 2 ** ((n - 81) / 12), t + i * 0.05, 0.8, { vol: 0.1 }); });
    bruit(t, 0.9, { vol: 0.16, f: 300, f1: 8000, q: 0.7 }); tone('sine', 110, t, 0.6, { f1: 55, vol: 0.3 });
  },
  legendaire() {                          // explosion : sous-grave + souffle + carillon doré qui scintille
    if (!audio()) return; const t = AC.currentTime;
    tone('sine', 140, t, 1.3, { f1: 32, vol: 0.75, a: 0.002 });
    bruit(t, 1.6, { vol: 0.55, f: 1800, f1: 90, q: 0.5, type: 'lowpass' });
    bruit(t, 0.25, { vol: 0.35, f: 7000, q: 0.6, type: 'highpass' });
    [76, 79, 83, 86, 88, 91, 95, 98].forEach((n, i) => tone('sine', 440 * 2 ** ((n - 69) / 12) * (1 + (Math.random() - 0.5) * 0.004), t + 0.25 + i * 0.09, 1.6, { vol: 0.09 }));
    [64, 67, 71, 76].forEach((n) => tone('sawtooth', 440 * 2 ** ((n - 69) / 12), t + 0.2, 2.4, { vol: 0.05, a: 0.4 }));
  },
  aspiration() { if (!audio()) return; const t = AC.currentTime; bruit(t, 1.1, { vol: 0.22, f: 9000, f1: 300, q: 0.9 }); },
};

/* ================================================================== cartes (sprites pré-rendus) */
const imgCache = new Map();
function svgImage(svg, color) {
  const key = svg + '|' + color;
  if (imgCache.has(key)) return imgCache.get(key);
  const s = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" style="color:${color}" `).replace(/currentColor/g, color);
  const im = new Image();
  const p = new Promise((res) => { im.onload = () => res(im); im.onerror = () => res(null); });
  im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const v = { im, p }; imgCache.set(key, v); return v;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function carteSprite(it, w, h, dpr, iconSvg) {
  const R = RARETES[it.rarity] || RARETES.commun;
  const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const r = Math.max(8, w * 0.07);
  rr(x, 2, 2, w - 4, h - 4, r);
  const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#1b2140'); bg.addColorStop(0.6, '#0e1228'); bg.addColorStop(1, '#070915');
  x.fillStyle = bg; x.fill();
  const gl = x.createRadialGradient(w / 2, h * 0.45, 2, w / 2, h * 0.45, w * 0.62); gl.addColorStop(0, R.glow); gl.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gl; x.fill();
  x.lineWidth = 2; x.strokeStyle = R.c1; x.globalAlpha = 0.85; x.stroke(); x.globalAlpha = 1;
  // barre de rareté (bas de carte, façon CS)
  x.save(); rr(x, 2, 2, w - 4, h - 4, r); x.clip();
  const bar = x.createLinearGradient(0, 0, w, 0); bar.addColorStop(0, R.c2); bar.addColorStop(0.5, R.c1); bar.addColorStop(1, R.c2);
  x.fillStyle = bar; x.fillRect(0, h - h * 0.075, w, h * 0.075);
  x.restore();
  const ic = svgImage(iconSvg(it.icon, 96), '#ffffff');
  if (ic.im.complete && ic.im.naturalWidth) {
    const s = w * 0.5;
    x.shadowColor = R.c1; x.shadowBlur = 18;
    x.drawImage(ic.im, (w - s) / 2, h * 0.16, s, s);
    x.shadowBlur = 0;
  }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  const fs = Math.max(10, Math.round(w * 0.085));
  x.font = `800 ${fs}px "Barlow Condensed","Arial Narrow",system-ui,sans-serif`;
  const nom = it.name.toUpperCase();
  const mots = nom.split(' '); let l1 = '', l2 = '';
  for (const m of mots) { if (x.measureText((l1 + ' ' + m).trim()).width < w * 0.86 && !l2) l1 = (l1 + ' ' + m).trim(); else l2 = (l2 + ' ' + m).trim(); }
  x.fillText(l1, w / 2, h * 0.76);
  if (l2) { x.globalAlpha = 0.85; x.fillText(l2.length > 22 ? l2.slice(0, 21) + '…' : l2, w / 2, h * 0.76 + fs * 1.05); x.globalAlpha = 1; }
  x.fillStyle = R.c1; x.font = `700 ${Math.round(fs * 0.72)}px "Barlow Condensed",system-ui,sans-serif`;
  x.fillText(R.nom.toUpperCase(), w / 2, h * 0.12 + fs * 0.4);
  return c;
}

/* ================================================================== roulette plein écran */
const reduit = () => !!(document.documentElement && document.documentElement.hasAttribute('data-calme'));   // opt-in (cf. tokens.css)
const easeOut = (u, k) => 1 - Math.pow(1 - u, k);

/**
 * Ouvre une caisse en plein écran et met en scène le résultat déjà tiré.
 * @param {object} o
 *   bande   : ids des 48 cartes ; gagnant : index de la carte gagnante
 *   objet   : (id) => {name, icon, rarity, effect}       iconSvg : (nom, taille) => '<svg …>'
 *   titre / sousTitre : texte d'en-tête ; tv : true = grand format (régie)
 *   actions : [{id, label, primary}] proposées à la révélation (par défaut : « Continuer »)
 *   duree   : durée de la roulette en ms (défaut 6 500 ; ×1,35 pour un légendaire)
 * @returns {Promise<string>} id de l'action choisie
 */
export function ouvrirCaisse(o) {
  return new Promise(async (resolve) => {
    const tv = !!o.tv, rm = reduit();
    const win = o.objet(o.bande[o.gagnant]);
    const rar = win.rarity || 'commun';
    const legend = rar === 'legendaire';
    const host = document.createElement('div');
    host.className = 'lbx' + (tv ? ' tv' : '');
    host.innerHTML = `<canvas></canvas><div class="lbx-head"><b>${o.titre || 'Caisse'}</b><small>${o.sousTitre || ''}</small></div>
      <button class="lbx-skip" type="button" aria-label="Accélérer">⏩</button><div class="lbx-flash"></div><div class="lbx-reveal" hidden></div>`;
    document.body.appendChild(host);
    const cv = host.querySelector('canvas'), ctx = cv.getContext('2d');
    const flash = host.querySelector('.lbx-flash'), panel = host.querySelector('.lbx-reveal');
    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { W = host.clientWidth; H = host.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
    resize(); window.addEventListener('resize', resize);
    // géométrie des cartes
    const cardW = Math.round(Math.max(96, Math.min(tv ? 300 : 170, W / (tv ? 5.4 : 3.3))));
    const cardH = Math.round(cardW * 1.32), gap = Math.round(cardW * 0.07), pitch = cardW + gap;
    // icônes : préchargement avant le départ (aucun saut d'image pendant l'animation)
    const ids = [...new Set(o.bande)];
    await Promise.all(ids.map((id) => svgImage(o.iconSvg(o.objet(id).icon, 96), '#ffffff').p));
    const sprites = new Map(ids.map((id) => [id, carteSprite(o.objet(id), cardW, cardH, dpr, o.iconSvg)]));
    // trajectoire : arrêt sur la carte gagnante, décalage aléatoire DANS la carte (suspense « sur la tranche »)
    const delta = (Math.random() - 0.5) * cardW * (legend ? 0.5 : 0.8);
    const S = o.gagnant * pitch + delta;
    let T = (o.duree || (tv ? 7200 : 6500)) * (legend ? 1.35 : 1) * (rm ? 0.45 : 1);
    const K = legend ? 4.6 : 3.4;                           // puissance de décélération (légendaire : long ralenti final)
    let t0 = null, lastIdx = -1, lastS = 0, fini = false, tFin = 0, rafId = 0, skip = false;
    const parts = [];                                       // particules dorées / roses
    let shake = 0, shakeAmp = 0, beam = 0, coeurT = 0, tPanneau = 0;
    host.querySelector('.lbx-skip').onclick = () => { skip = true; };
    SONS.depart();

    let lastCy = H / 2 - cardH / 2;
    function burst(n, col, up = false) {
      const cx = W / 2, cy = lastCy + cardH / 2;
      for (let i = 0; i < n && parts.length < 420; i++) {
        const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
        const v = (up ? 6 : 3) + Math.random() * (up ? 9 : 7);
        parts.push({ x: cx + (Math.random() - 0.5) * cardW * 0.6, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: 0.006 + Math.random() * 0.012, s: 1.5 + Math.random() * 3.5, col });
      }
    }
    function revelation() {
      const R = RARETES[rar];
      if (rar === 'commun') { SONS.commun(); shakeAmp = 0; }
      else if (rar === 'rare') { SONS.rare(); shakeAmp = rm ? 0 : (tv ? 10 : 6); flashOnce(R.c1, 0.35, 450); burst(40, R.c1); }
      else if (rar === 'epique') { SONS.epique(); shakeAmp = rm ? 0 : (tv ? 18 : 12); flashOnce(R.c1, 0.5, 650); burst(110, R.c1); }
      else { SONS.legendaire(); shakeAmp = rm ? 0 : (tv ? 30 : 20); flashOnce('#fff6d0', 0.9, 1100); beam = 1; burst(220, '#ffd34d', true); burst(80, '#ff6a2b'); }
      shake = shakeAmp ? 1 : 0;
      try { navigator.vibrate && navigator.vibrate(rar === 'legendaire' ? [80, 40, 200] : rar === 'epique' ? [60, 30, 90] : rar === 'rare' ? 50 : 15); } catch { /* */ }
      if (o.onReveal) o.onReveal(rar);
      setTimeout(montrerPanneau, legend ? 1500 : rar === 'commun' ? 450 : 800);
    }
    function flashOnce(col, a, ms) {
      flash.style.transition = 'none'; flash.style.background = col; flash.style.opacity = String(a);
      requestAnimationFrame(() => { flash.style.transition = `opacity ${ms}ms ease-out`; flash.style.opacity = '0'; });
    }
    function montrerPanneau() {
      const R = RARETES[rar];
      const acts = o.actions && o.actions.length ? o.actions : [{ id: 'ok', label: 'Continuer', primary: true }];
      panel.innerHTML = `<div class="lbx-card r-${rar}"><span class="lbx-rar">${R.nom}</span><div class="lbx-ic">${o.iconSvg(win.icon, tv ? 150 : 96)}</div>
        <h3>${win.name}</h3>${win.effect ? `<p>${win.effect}</p>` : ''}${o.detail ? `<small>${o.detail}</small>` : ''}
        <div class="lbx-acts">${acts.map((a) => `<button type="button" data-a="${a.id}" class="${a.primary ? 'pri' : ''}">${a.label}</button>`).join('')}</div></div>`;
      panel.hidden = false; tPanneau = performance.now();
      panel.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => fermer(b.dataset.a));
      if (o.autoFermer) setTimeout(() => fermer('auto'), o.autoFermer);
    }
    let ferme = false;
    function fermer(id) {
      if (ferme) return; ferme = true;
      host.classList.add('out'); cancelAnimationFrame(rafId); window.removeEventListener('resize', resize);
      setTimeout(() => host.remove(), 350); resolve(id);
    }

    function frame(now) {
      if (t0 === null) t0 = now;
      let el = now - t0;
      if (skip && !fini) { t0 -= 60; el = now - t0; T = Math.min(T, el + 600); }
      const u = Math.min(1, el / T);
      const s = S * easeOut(u, K);
      const v = Math.abs(s - lastS); lastS = s;
      // cran franchi -> tic
      const idx = Math.floor((s + pitch / 2) / pitch);
      if (idx !== lastIdx && !fini) { lastIdx = idx; SONS.tick(Math.min(1, v / pitch)); if (!tv) { try { navigator.vibrate && v < pitch * 0.25 && navigator.vibrate(3); } catch { /* */ } } }
      // battement de cœur pendant le ralenti final d'un légendaire
      if (legend && !fini && u > 0.72) { coeurT -= 16; if (coeurT <= 0) { SONS.coeur(); coeurT = 900 - (u - 0.72) * 900; } }
      if (u >= 1 && !fini) { fini = true; tFin = now; revelation(); }
      // ---- dessin
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let ox = 0, oy = 0;
      if (shake > 0) { ox = (Math.random() - 0.5) * shakeAmp * shake; oy = (Math.random() - 0.5) * shakeAmp * shake; shake = Math.max(0, shake - 0.022); }
      ctx.clearRect(0, 0, W, H);
      const bgc = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      const amb = fini ? RARETES[rar].glow : 'rgba(80,110,255,.18)';
      bgc.addColorStop(0, fini ? amb : 'rgba(40,50,110,.55)'); bgc.addColorStop(1, 'rgba(3,4,12,.96)');
      ctx.fillStyle = bgc; ctx.fillRect(0, 0, W, H);
      // ralenti : vignette qui se resserre
      if (legend && u > 0.72 && !fini) { const k = (u - 0.72) / 0.28; const vg = ctx.createRadialGradient(W / 2, H / 2, W * (0.5 - 0.25 * k), W / 2, H / 2, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.75 * k})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
      // faisceau zénithal (légendaire)
      if (beam > 0) {
        const bt = (now - tFin) / 1000, bw = cardW * (0.55 + 0.25 * Math.sin(bt * 9) * Math.exp(-bt));
        const gb = ctx.createLinearGradient(0, 0, 0, H / 2);
        gb.addColorStop(0, 'rgba(255,240,180,0)'); gb.addColorStop(0.5, `rgba(255,220,120,${0.55 * beam})`); gb.addColorStop(1, `rgba(255,255,230,${0.9 * beam})`);
        const yb = lastCy + cardH / 2;
        ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(W / 2 - bw * 0.25, 0); ctx.lineTo(W / 2 + bw * 0.25, 0); ctx.lineTo(W / 2 + bw * 0.75, yb); ctx.lineTo(W / 2 - bw * 0.75, yb); ctx.fill();
        // rayons tournants derrière la carte
        ctx.save(); ctx.translate(W / 2 + ox, yb + oy); ctx.rotate(bt * 0.6); ctx.globalAlpha = 0.28 * beam;
        for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); const gr = ctx.createLinearGradient(0, 0, 0, -Math.max(W, H)); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, 'rgba(255,224,138,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-cardW * 0.08, 0); ctx.lineTo(cardW * 0.08, 0); ctx.lineTo(cardW * 0.5, -Math.max(W, H)); ctx.lineTo(-cardW * 0.5, -Math.max(W, H)); ctx.fill(); }
        ctx.restore(); ctx.globalAlpha = 1;
        beam = Math.max(0.35, beam - 0.0025);
      }
      // bande (remonte quand le panneau de révélation apparaît, pour ne jamais cacher la carte gagnante)
      const lift = tPanneau ? easeOut(Math.min(1, (now - tPanneau) / 450), 3) : 0;
      const ph = tPanneau ? panel.firstElementChild.getBoundingClientRect().height : 0;
      const yc = H / 2 - lift * Math.max(0, (H / 2 + cardH * 0.62) - (H - ph - 24));
      const cy = Math.max(cardH * 0.1 + 40, yc - cardH / 2) + oy;
      const first = Math.max(0, Math.floor((s - W / 2) / pitch) - 1), last = Math.min(o.bande.length - 1, Math.ceil((s + W / 2) / pitch) + 1);
      const blur = !fini && v > pitch * 0.18 && !rm;
      for (let k = first; k <= last; k++) {
        const x = W / 2 + k * pitch - s - cardW / 2 + ox;
        const sp = sprites.get(o.bande[k]);
        if (!sp) continue;
        let sc = 1, al = 1;
        if (fini) { if (k === o.gagnant) { const tt = Math.min(1, (now - tFin) / 350); sc = 1 + (legend ? 0.22 : 0.1) * Math.sin(tt * Math.PI / 2); } else al = 0.35; }
        ctx.globalAlpha = al;
        if (blur) { ctx.globalAlpha = 0.18 * al; ctx.drawImage(sp, x - v * 0.6, cy, cardW, cardH); ctx.drawImage(sp, x + v * 0.3, cy, cardW, cardH); ctx.globalAlpha = al; }
        if (sc !== 1) ctx.drawImage(sp, x - cardW * (sc - 1) / 2, cy - cardH * (sc - 1) / 2, cardW * sc, cardH * sc);
        else ctx.drawImage(sp, x, cy, cardW, cardH);
      }
      ctx.globalAlpha = 1;
      lastCy = cy;
      // repère central
      const mc = fini ? RARETES[rar].c1 : '#ffd36a';
      ctx.fillStyle = mc; ctx.shadowColor = mc; ctx.shadowBlur = 16;
      ctx.fillRect(W / 2 - 1.5, cy - 18, 3, cardH + 36);
      ctx.beginPath(); ctx.moveTo(W / 2 - 11, cy - 22); ctx.lineTo(W / 2 + 11, cy - 22); ctx.lineTo(W / 2, cy - 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W / 2 - 11, cy + cardH + 22); ctx.lineTo(W / 2 + 11, cy + cardH + 22); ctx.lineTo(W / 2, cy + cardH + 6); ctx.fill();
      ctx.shadowBlur = 0;
      // dégradés latéraux (la bande « sort » de l'ombre)
      const fl = ctx.createLinearGradient(0, 0, W * 0.18, 0); fl.addColorStop(0, 'rgba(3,4,12,1)'); fl.addColorStop(1, 'rgba(3,4,12,0)'); ctx.fillStyle = fl; ctx.fillRect(0, cy - 30, W * 0.18, cardH + 60);
      const fr = ctx.createLinearGradient(W, 0, W * 0.82, 0); fr.addColorStop(0, 'rgba(3,4,12,1)'); fr.addColorStop(1, 'rgba(3,4,12,0)'); ctx.fillStyle = fr; ctx.fillRect(W * 0.82, cy - 30, W * 0.18, cardH + 60);
      // particules
      if (legend && fini && now - tFin < 2600 && Math.random() < 0.6) burst(4, Math.random() < 0.8 ? '#ffd34d' : '#ff8a3d', true);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= 0.992; p.life -= p.dec;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, p.s * (0.6 + p.life * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  });
}

/** Petit tableau HTML des probabilités d'une gamme (affichage légal-like, toujours visible avant achat). */
export function tableHtml(gamme, famille, compact = false) {
  const t = gamme.tirageEffectif[famille] || gamme.tirage;
  const pc = (r) => (100 * t[r]).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '\u00a0%';
  return `<div class="lbx-odds${compact ? ' cpt' : ''}">${ORDRE.filter((r) => (t[r] || 0) > 0).map((r) =>
    `<span class="r-${r}" title="${RARETES[r].nom}"><i></i>${compact ? '' : RARETES[r].nom + ' '}<b>${pc(r)}</b></span>`).join('')}</div>`;
}
/** Légende des couleurs de rareté (une fois par famille, sous des tableaux compacts). */
export function legendeHtml() {
  return `<div class="lbx-odds">${ORDRE.map((r) => `<span class="r-${r}"><i></i>${RARETES[r].nom}</span>`).join('')}</div>`;
}
