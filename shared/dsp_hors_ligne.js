/* DSP HORS LIGNE — briques de synthèse calculées échantillon par échantillon dans des Float32Array (aucune dépendance,
   aucun AudioContext : testées sous Node par relay/tests/controle_sons_physiques.mjs).

   Utilisées par moteurs_physiques.js (moteurs, vapeur, rotor, fauteuil) et foley_acier.js (ferraille, pneumatique, hangar).
   Tout est déterministe : un même germe donne le même son (captures vidéo reproductibles). */

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function hasard(germe = 1) {
  let a = (germe >>> 0) || 1;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.signe = () => f() * 2 - 1;
  f.gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += f(); return (s - 2) * 1.732; };
  f.entre = (x, y) => x + (y - x) * f();
  return f;
}

/** Germe stable à partir d'un texte (FNV-1a). */
export function germeDe(txt) {
  let h = 2166136261;
  for (const c of String(txt)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h || 1;
}

/** Biquad RBJ (Audio EQ Cookbook) : traitement en place, état conservé (on peut changer les coefficients en cours de route). */
export class Biquad {
  constructor(sr, type = 'lowpass', f = 1000, q = 0.707, gainDb = 0) { this.sr = sr; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.regler(type, f, q, gainDb); }
  regler(type, f, q = 0.707, gainDb = 0) {
    const w = 2 * Math.PI * Math.min(f, this.sr * 0.49) / this.sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Math.max(0.05, q));
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'highpass': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'bandpass': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;            // gain 0 dB au centre
      case 'peaking': b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; break;
      case 'lowshelf': { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s); a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; break; }
      case 'highshelf': { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s); a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; break; }
      default: b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;          // lowpass
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  pas(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
  traiter(buf, de = 0, a = buf.length) { for (let i = de; i < a; i++) buf[i] = this.pas(buf[i]); return buf; }
}

/** Banc de modes (synthèse modale, résonateurs du 2e ordre) : [{f, t60, a}] excités par un signal. Chaque mode : y = g·x + b1·y1 + b2·y2. */
export class BancModal {
  constructor(sr, modes) {
    this.m = modes.filter((m) => m.f > 20 && m.f < sr * 0.45).map((m) => {
      const r = Math.exp(-6.9078 / (Math.max(0.005, m.t60) * sr)), w = 2 * Math.PI * m.f / sr;
      return { b1: 2 * r * Math.cos(w), b2: -r * r, g: (m.a ?? 1) * (1 - r * r) * 0.5, y1: 0, y2: 0 };
    });
  }
  pas(x) {
    let s = 0;
    for (const m of this.m) { const y = m.g * x + m.b1 * m.y1 + m.b2 * m.y2; m.y2 = m.y1; m.y1 = y; s += y; }
    return s;
  }
}

/** Ligne à retard fractionnaire avec rétroaction filtrée (filtre en peigne d'un tuyau d'échappement). */
export class Peigne {
  constructor(sr, retardS, gain, amortHz) {
    this.n = Math.max(2, Math.ceil(retardS * sr) + 4); this.b = new Float32Array(this.n); this.i = 0;
    this.d = retardS * sr; this.g = gain; this.lp = 0; this.k = Math.exp(-2 * Math.PI * amortHz / sr);
  }
  pas(x) {
    const pos = this.i - this.d; let j = Math.floor(pos); const fr = pos - j;
    j = ((j % this.n) + this.n) % this.n; const j2 = (j + 1) % this.n;
    const r = this.b[j] * (1 - fr) + this.b[j2] * fr;
    this.lp = (1 - this.k) * r + this.k * this.lp;                       // l'onde réfléchie perd ses aigus à chaque aller-retour
    const y = x + this.g * this.lp;
    this.b[this.i] = y; this.i = (this.i + 1) % this.n;
    return y;
  }
}

/** Filtre passe-haut d'ordre 1 (blocage du continu). */
export class CoupeContinu {
  constructor(sr, f = 25) { this.k = Math.exp(-2 * Math.PI * f / sr); this.x1 = 0; this.y1 = 0; }
  pas(x) { const y = x - this.x1 + this.k * this.y1; this.x1 = x; this.y1 = y; return y; }
}

/** Passe-bas d'ordre 1 à coupure variable. */
export class PasseBas1 {
  constructor(sr, f = 1000) { this.sr = sr; this.y = 0; this.regler(f); }
  regler(f) { this.k = Math.exp(-2 * Math.PI * Math.min(f, this.sr * 0.45) / this.sr); return this; }
  pas(x) { this.y = (1 - this.k) * x + this.k * this.y; return this.y; }
}

/** Crête absolue d'un ensemble de canaux. */
export function crete(...canaux) { let m = 0; for (const c of canaux) for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > m) m = v; } return m; }

/** Normalise en place à une crête cible (0..1). */
export function normaliser(cible, ...canaux) {
  const m = crete(...canaux); if (!(m > 1e-9)) return 0;
  const k = cible / m; for (const c of canaux) for (let i = 0; i < c.length; i++) c[i] *= k;
  return k;
}

/** Saturation douce (tanh rationnelle). */
export const sature = (x) => (x > 3 ? 1 : x < -3 ? -1 : x * (27 + x * x) / (27 + 9 * x * x));

/** Fondus d'entrée et de sortie (cosinus) pour éviter tout clic aux bords d'un tampon. */
export function fondus(c, sr, entree = 0.004, sortie = 0.03) {
  const ne = Math.min(c.length, Math.round(entree * sr)), ns = Math.min(c.length, Math.round(sortie * sr));
  for (let i = 0; i < ne; i++) c[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / ne);
  for (let i = 0; i < ns; i++) c[c.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / ns);
  return c;
}

/** Ajoute src (gain g) dans dst à partir de l'échantillon i0 (borné). */
export function ajouter(dst, src, i0, g = 1) {
  const a = Math.max(0, i0), b = Math.min(dst.length, i0 + src.length);
  for (let i = a; i < b; i++) dst[i] += src[i - i0] * g;
}
