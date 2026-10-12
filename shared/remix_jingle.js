/* Remix « grève » d'un jingle fourni par l'utilisateur (H12 · La Grève).
 *
 * Le jingle n'est PAS recréé ici : on ne fait que découper, rejouer et accompagner le fichier audio que l'utilisateur a
 * déposé lui-même dans Musique/. Sans fichier, rien n'est produit.
 *
 * Structure : 8 mesures à 128 BPM, en boucle (≈ 15 s).
 *   m1–2  jingle intact sur le premier temps, kick quatre temps, charleston ouverte à contretemps.
 *   m3–4  bégaiement du début du jingle sur 4 doubles-croches, puis 2 croches, puis jingle entier ; claps sur 2 et 4.
 *   m5–6  version « chopped » : jingle ralenti d'un ton (lecture plus lente, donc plus grave), basse qui suit la tonique.
 *   m7–8  jingle intact, montée de bruit blanc, puis arrêt de bande sur les 2 derniers temps : « trafic interrompu ».
 *
 * La tonique est estimée sur la première note du jingle (autocorrélation), et la basse joue cette note.
 * Fonctions pures sur Float32Array, testées sous Node (controle_sons_physiques.mjs).
 */
import { Biquad, hasard, sature } from './dsp_hors_ligne.js';

export const BPM_REMIX = 128;

/** Début et fin utiles du jingle : premier et dernier échantillon au-dessus du seuil relatif à la crête (fenêtres de 10 ms). */
export function bornesUtiles(c, sr, seuilDb = -38, maxS = 4.5) {
  let crete = 0; for (let i = 0; i < c.length; i++) crete = Math.max(crete, Math.abs(c[i]));
  if (crete < 1e-5) return null;
  const seuil = crete * Math.pow(10, seuilDb / 20), w = Math.max(1, Math.round(sr * 0.01));
  let deb = -1, fin = -1;
  for (let i = 0; i < c.length; i += w) { let m = 0; for (let j = i; j < Math.min(c.length, i + w); j++) m = Math.max(m, Math.abs(c[j])); if (m >= seuil) { if (deb < 0) deb = i; fin = Math.min(c.length, i + w); } }
  if (deb < 0) return null;
  return { deb, fin: Math.min(fin, deb + Math.round(maxS * sr)) };
}

/** Fréquence fondamentale (Hz) de la première note : autocorrélation normalisée entre 110 et 1100 Hz sur 80 ms. */
export function fondamentale(c, sr, deb) {
  const n = Math.round(sr * 0.08), a = deb + Math.round(sr * 0.02);
  if (a + n * 2 > c.length) return null;
  const lmin = Math.floor(sr / 1100), lmax = Math.ceil(sr / 110);
  const r = new Float32Array(lmax + 1); let meilleur = 0;
  for (let l = lmin; l <= lmax; l++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < n; i++) { const x = c[a + i], y = c[a + i + l]; s += x * y; e1 += x * x; e2 += y * y; }
    r[l] = s / Math.sqrt(e1 * e2 + 1e-12); meilleur = Math.max(meilleur, r[l]);
  }
  if (meilleur < 0.5) return null;
  for (let l = lmin + 1; l < lmax; l++) if (r[l] >= 0.9 * meilleur && r[l] >= r[l - 1] && r[l] >= r[l + 1]) return sr / l;   // plus petite période : pas de sous-harmonique
  return null;
}

/** Lecture à vitesse variable (interpolation linéaire) d'un segment [deb, fin[, ajoutée dans dst à partir de i0. vitesse(t) en fonction du temps de sortie. */
function lire(dst, src, deb, fin, i0, gain, vitesse = () => 1, enveloppe = null) {
  let pos = deb, k = 0;
  while (pos < fin - 1 && i0 + k < dst.length) {
    const i = Math.floor(pos), f = pos - i, v = src[i] * (1 - f) + src[i + 1] * f;
    const env = enveloppe ? enveloppe(k) : 1;
    dst[i0 + k] += v * gain * env;
    pos += vitesse(k); k++;
    if (vitesse(k) <= 0.002) break;
  }
  return k;
}

/**
 * Remixe un jingle stéréo. canaux : [gauche, droite] (Float32Array) à sr. Renvoie { gauche, droite, duree, tonique, mesure }.
 * Déterministe (germe fixe).
 */
export function remixerJingle(canaux, sr) {
  const G = canaux[0], D = canaux[1] || canaux[0];
  const mono = new Float32Array(G.length); for (let i = 0; i < G.length; i++) mono[i] = 0.5 * (G[i] + D[i]);
  const b = bornesUtiles(mono, sr);
  const temps = 60 / BPM_REMIX, mesure = 4 * temps, nMes = 8;
  const N = Math.round(nMes * mesure * sr);
  const L = new Float32Array(N), R = new Float32Array(N), kickEnv = new Float32Array(N);
  if (!b) return { gauche: L, droite: R, duree: N / sr, tonique: null, mesure };
  const s = (t) => Math.round(t * sr), T = (m, tps) => (m * 4 + tps) * temps;      // mesure m (0..7), temps tps (0..3.99)
  const rnd = hasard(4912);

  /* --- tonique : la basse joue la note de la première attaque, ramenée entre 41 et 82 Hz */
  let f0 = fondamentale(mono, sr, b.deb), tonique = f0;
  if (!f0) f0 = 55;
  while (f0 > 82) f0 /= 2;
  while (f0 < 41) f0 *= 2;

  /* --- batterie */
  const kick = (i0) => {
    let ph = 0;
    for (let k = 0; k < s(0.42) && i0 + k < N; k++) {
      const t = k / sr, f = 46 + 110 * Math.exp(-t * 28);
      ph += 2 * Math.PI * f / sr;
      const v = Math.sin(ph) * Math.exp(-t * 7.5) * 0.95 + (k < s(0.004) ? (rnd() * 2 - 1) * 0.35 : 0);
      L[i0 + k] += v; R[i0 + k] += v;
      kickEnv[i0 + k] = Math.max(kickEnv[i0 + k], Math.exp(-t * 9));
    }
  };
  const bp = new Biquad(sr, 'bandpass', 1250, 1.1), hp = new Biquad(sr, 'highpass', 7200, 0.8);
  const clap = (i0) => {
    for (const d of [0, 0.011, 0.023]) {
      const a = i0 + s(d);
      for (let k = 0; k < s(0.16) && a + k < N; k++) { const v = bp.pas(rnd() * 2 - 1) * Math.exp(-k / sr * (d < 0.02 ? 60 : 18)) * 0.9; L[a + k] += v * 0.9; R[a + k] += v; }
    }
  };
  const charley = (i0, pan) => {
    for (let k = 0; k < s(0.09) && i0 + k < N; k++) { const v = hp.pas(rnd() * 2 - 1) * Math.exp(-k / sr * 38) * 0.32; L[i0 + k] += v * (1 - pan); R[i0 + k] += v * (1 + pan); }
  };
  const basse = (i0, dur, f) => {
    let ph = 0; const lp = new Biquad(sr, 'lowpass', 220, 0.9);
    for (let k = 0; k < s(dur) && i0 + k < N; k++) {
      ph += 2 * Math.PI * f / sr;
      const t = k / sr, env = Math.min(1, t / 0.006) * Math.exp(-t * 3.2);
      const v = lp.pas(sature(2.2 * (Math.sin(ph) + 0.35 * Math.sin(2 * ph)))) * env * 0.42;
      L[i0 + k] += v; R[i0 + k] += v;
    }
  };
  for (let m = 0; m < nMes; m++) {
    for (let t = 0; t < 4; t++) {
      if (!(m === 7 && t >= 2)) kick(s(T(m, t)));                               // l'arrêt de bande coupe les 2 derniers kicks
      charley(s(T(m, t + 0.5)), t % 2 ? 0.25 : -0.25);
      if (m >= 2 && (t === 1 || t === 3) && !(m === 7 && t === 3)) clap(s(T(m, t)));
      if (m >= 4 && !(m === 7 && t >= 2)) basse(s(T(m, t + 0.5)), temps * 0.45, f0 * (m === 6 && t >= 2 ? 1.5 : 1));
    }
  }

  /* --- jingle */
  const pose = (i0, deb, fin, gain, vit, env) => { lire(L, G, deb, fin, i0, gain, vit, env); lire(R, D, deb, fin, i0, gain, vit, env); };
  const fondu = (n) => (k) => Math.min(1, k / s(0.003), (n - k) / s(0.006));
  pose(s(T(0, 0)), b.deb, b.fin, 1);                                              // m1 : intact
  const t16 = temps / 4;
  for (let r = 0; r < 4; r++) pose(s(T(2, 0) + r * t16), b.deb, b.deb + s(t16), 1, () => 1, fondu(s(t16)));   // m3 : bégaiement 1/16
  for (let r = 0; r < 2; r++) pose(s(T(2, 1) + r * temps / 2), b.deb, b.deb + s(temps / 2), 1, () => 1, fondu(s(temps / 2)));
  pose(s(T(2, 2)), b.deb, b.fin, 1);
  const unTon = Math.pow(2, -2 / 12);
  pose(s(T(4, 0)), b.deb, b.fin, 1, () => unTon);                                // m5 : « chopped », un ton plus bas
  pose(s(T(6, 0)), b.deb, b.fin, 1);                                              // m7 : intact
  /* montée de bruit sur la mesure 7 */
  const hp2 = new Biquad(sr, 'highpass', 400, 0.7);
  for (let i = s(T(6, 0)); i < s(T(7, 2)); i++) {
    const p = (i - s(T(6, 0))) / (s(T(7, 2)) - s(T(6, 0)));
    if (i % 64 === 0) hp2.regler('highpass', 400 + 7000 * p * p, 0.7);
    const v = hp2.pas(rnd() * 2 - 1) * 0.16 * p * p; L[i] += v; R[i] += v;
  }

  /* --- sidechain : le kick creuse le reste du mix (sauf lui-même : il est déjà dedans, l'effet reste discret) */
  for (let i = 0; i < N; i++) { const g = 1 - 0.28 * kickEnv[i]; L[i] *= g; R[i] *= g; }

  /* --- arrêt de bande sur les 2 derniers temps : la vitesse tombe de 1 à 0, le mix s'éteint en glissant vers le grave */
  const a0 = s(T(7, 2)), n0 = N - a0;
  const sL = L.slice(a0), sR = R.slice(a0);
  L.fill(0, a0); R.fill(0, a0);
  let pos = 0;
  for (let k = 0; k < n0; k++) {
    const p = k / n0, v = Math.max(0, 1 - p / 0.85);
    if (v <= 0) break;
    const i = Math.floor(pos), f = pos - i;
    if (i + 1 >= sL.length) break;
    L[a0 + k] = (sL[i] * (1 - f) + sL[i + 1] * f) * Math.min(1, v * 1.6);
    R[a0 + k] = (sR[i] * (1 - f) + sR[i + 1] * f) * Math.min(1, v * 1.6);
    pos += v * v;
  }

  /* --- master : saturation douce et crête à −1 dBFS */
  let c = 0;
  for (let i = 0; i < N; i++) { L[i] = sature(L[i] * 0.9); R[i] = sature(R[i] * 0.9); c = Math.max(c, Math.abs(L[i]), Math.abs(R[i])); }
  const g = c > 0 ? 0.89 / c : 1;
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
  return { gauche: L, droite: R, duree: N / sr, tonique, mesure };
}

/** Variante Web Audio : AudioBuffer → AudioBuffer remixé (même fréquence d'échantillonnage). */
export async function remixJingle(buf, sr = buf.sampleRate) {
  const canaux = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)];
  const r = remixerJingle(canaux, buf.sampleRate);
  const Ctor = globalThis.AudioBuffer;
  const out = new Ctor({ length: r.gauche.length, numberOfChannels: 2, sampleRate: buf.sampleRate });
  out.copyToChannel(r.gauche, 0); out.copyToChannel(r.droite, 1);
  return out;
}
