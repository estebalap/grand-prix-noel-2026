/* FOLEY ACIER — bruitages physiques du conteneur maritime et du hangar, calculés hors ligne (Float32Array, aucune dépendance
   navigateur : testés sous Node par relay/tests/controle_sons_physiques.mjs).

   Modèles :
     tôle / poutre     synthèse modale d'une plaque d'acier : modes f(m,n) ∝ (m/a)² + (n/b)² d'un panneau 2,4 × 2,6 m (fondamental
                       ≈ 40 Hz), amortissement T60 ∝ 1/√f, excitation par un contact de 2 à 6 ms (plus le choc est lourd, plus il est
                       long et grave) ; + « corps » du plancher (sub amorti) + débris (modèle particulaire PhISEM : boulons, rouille).
     grincement        frottement collé-glissé : train d'impulsions dont la cadence suit la vitesse de glissement (40-300 Hz,
                       gigue), chaque impulsion excitant les modes de la charnière et du vantail.
     chaîne            maillons qui s'entrechoquent (PhISEM) + tension (collé-glissé grave) ; crémaillère : cliquet qui tombe dans
                       chaque cran (impact + coup sourd), cadence qui ralentit.
     verrou            came de porte de conteneur : levier (clac aigu), rotation de la barre (raclement), barre qui se loge (CLONK).
     pneumatique       détente d'un vérin sous ~10 bar : souffle qui démarre en 2 ms, spectre qui glisse vers le grave à mesure que
                       la pression (donc la vitesse du jet) tombe ; claquement de la valve.
     rideau            lames d'acier qui s'enroulent : chocs périodiques (une lame par 70-120 ms), frottement dans les coulisses,
                       ronflement du moto-réducteur.
     hangar            réponse impulsionnelle stéréo d'un hangar de fret (≈ 90 × 85 × 16 m) : premières réflexions (sol, murs,
                       charpente) puis queue diffuse RT60 ≈ 2,6 s dont les aigus meurent plus vite (absorption de l'air).

   banqueFoley(sr, { germe, rang, dureeRideau }) → { nom: { gauche, droite } } ; reponseHangar(sr, germe) → { gauche, droite } */
import { hasard, Biquad, BancModal, PasseBas1, normaliser, fondus, sature } from './dsp_hors_ligne.js';

/* ------------------------------------------------------------------ modes */
function modesPlaque(f0, nb, rnd, { rapport = 1.08, t60Bas = 2.2, aigus = 1 } = {}) {
  const m = [];
  for (let i = 1; i <= 7; i++) for (let j = 1; j <= 7; j++) {
    const f = f0 * (i * i + (j * j) / (rapport * rapport)) / (1 + 1 / (rapport * rapport));
    m.push({ f: f * (1 + 0.025 * rnd.signe()), t60: Math.max(0.05, t60Bas * Math.sqrt(f0 / f)), a: (1 / Math.sqrt(i * j)) * (0.6 + 0.4 * rnd()) * (f > 2000 ? aigus : 1) });
  }
  return m.sort((a, b) => a.f - b.f).slice(0, nb);
}
const stereo = (sr, duree) => { const n = Math.max(1, Math.round(duree * sr)); return { n, g: new Float32Array(n), d: new Float32Array(n) }; };
function exciter(sr, banc, n, contact, gain, rnd, bruit = 0.25) {
  const out = new Float32Array(n), nc = Math.max(2, Math.round(contact * sr));
  for (let k = 0; k < n; k++) {
    const ex = k < nc ? Math.sin(Math.PI * k / nc) * gain * (1 + bruit * rnd.signe()) : 0;
    out[k] = banc.pas(ex);
  }
  return out;
}
/** Grains particulaires (PhISEM) : collisions aléatoires de petits objets métalliques. */
function particules(sr, n, { debut = 0, duree = 0.5, densite = 60, modes, gain = 0.3 }, rnd) {
  const out = new Float32Array(n), banc = new BancModal(sr, modes);
  let energie = 0, son = 0;
  const a = Math.round(debut * sr), b = Math.min(n, a + Math.round(duree * sr));
  const pCol = densite / sr;
  for (let i = a; i < n; i++) {
    const vie = i < b ? 1 - (i - a) / Math.max(1, b - a) : 0;
    if (vie > 0 && rnd() < pCol * vie) energie += gain * (0.3 + 0.7 * rnd());
    energie *= 0.9992; son = son * 0.94 + energie * rnd.signe() * 0.06;
    out[i] = banc.pas(son);
    if (i > b && Math.abs(son) < 1e-6 && i - b > sr * 0.3) break;
  }
  return out;
}

/* ------------------------------------------------------------------ bruitages */
/** Choc lourd : poutre/plancher d'acier qui encaisse (à-coups, atterrissage). masse 0..1 */
export function chocLourd(sr, masse, rnd) {
  const { n, g, d } = stereo(sr, 2.6);
  const tole = exciter(sr, new BancModal(sr, modesPlaque(38 + 14 * (1 - masse), 26, rnd, { t60Bas: 1.4 + masse, aigus: 0.5 })), n, 0.002 + 0.004 * masse, 0.9, rnd);
  const corps = new Biquad(sr, 'lowpass', 70 + 30 * (1 - masse), 1.2), poussiere = new Biquad(sr, 'bandpass', 900, 0.6);
  const debris = particules(sr, n, { debut: 0.02, duree: 0.45 + 0.4 * masse, densite: 70, modes: [{ f: 2480, t60: 0.05 }, { f: 4120, t60: 0.04 }, { f: 6330, t60: 0.03 }, { f: 1310, t60: 0.06, a: 0.5 }], gain: 0.5 }, rnd);
  for (let i = 0; i < n; i++) {
    const t = i / sr, ec = Math.exp(-t / (0.09 + 0.08 * masse)) * (1 - Math.exp(-t / 0.002));
    const sub = corps.pas(rnd.signe()) * ec * (2.4 + 2 * masse) + Math.sin(2 * Math.PI * (44 - 10 * t) * t) * ec * 0.9;
    const p = poussiere.pas(rnd.signe()) * Math.exp(-t / 0.25) * 0.08;
    const v = sature(sub + tole[i] * 1.5) + debris[i] * 0.5 + p;
    g[i] = v; d[i] = v * 0.92 + debris[i] * 0.15;
  }
  return fini(sr, g, d, 0.95);
}

/** Charnière rouillée qui grince : collé-glissé. */
export function grincement(sr, duree, rnd, { grave = false } = {}) {
  const { n, g, d } = stereo(sr, duree + 0.4);
  const modes = (grave ? [310, 720, 1180, 1730, 2410] : [520, 1240, 1980, 2870, 3940]).map((f, k) => ({ f: f * (1 + 0.02 * rnd.signe()), t60: 0.06 + 0.02 * k, a: 1 / (1 + k * 0.4) }));
  const banc = new BancModal(sr, modes);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(1, t / duree), vit = Math.sin(Math.PI * u) ** 0.7;          // vitesse de glissement en cloche
    const fq = (grave ? 45 : 90) + (grave ? 120 : 230) * vit * (1 + 0.25 * Math.sin(2 * Math.PI * 1.7 * t + rnd() * 0.2));
    ph += fq / sr; let ex = 0;
    if (ph >= 1) { ph -= 1 + 0.12 * rnd.signe(); ex = vit * (0.7 + 0.6 * rnd()); }
    const v = banc.pas(ex) * (t < duree ? 1 : 0.4);
    g[i] = v; d[i] = v * 0.85;
  }
  return fini(sr, g, d, 0.7);
}

/** Rivets qui craquent sous tension (série de claquements secs). */
export function rivets(sr, nb, rnd) {
  const { n, g, d } = stereo(sr, 0.18 * nb + 0.4);
  let t = 0.01;
  for (let k = 0; k < nb; k++) {
    const banc = new BancModal(sr, [{ f: 2900 + 1500 * rnd(), t60: 0.035 }, { f: 5200 + 2000 * rnd(), t60: 0.025, a: 0.6 }, { f: 820 + 300 * rnd(), t60: 0.05, a: 0.5 }]);
    const a = Math.round(t * sr), pan = rnd();
    for (let j = 0; j < 0.12 * sr && a + j < n; j++) { const v = banc.pas(j < 6 ? (1 - j / 6) * (0.6 + 0.4 * rnd()) : 0); g[a + j] += v * (1 - pan * 0.6); d[a + j] += v * (0.4 + pan * 0.6); }
    t += 0.02 + 0.13 * rnd();
  }
  return fini(sr, g, d, 0.8);
}

/** Chaîne de levage qui se tend : maillons qui claquent + tension grave. */
export function chaine(sr, duree, rnd) {
  const { n, g, d } = stereo(sr, duree + 0.5);
  const maillons = particules(sr, n, { debut: 0, duree, densite: 45, modes: [{ f: 1830, t60: 0.08 }, { f: 3240, t60: 0.06, a: 0.7 }, { f: 5110, t60: 0.04, a: 0.4 }, { f: 960, t60: 0.1, a: 0.5 }], gain: 0.7 }, rnd);
  const tension = grincement(sr, duree, rnd, { grave: true });
  for (let i = 0; i < n; i++) { g[i] = maillons[i] * 0.8 + (tension.gauche[i] || 0) * 0.5; d[i] = maillons[i] * 0.7 + (tension.droite[i] || 0) * 0.55; }
  return fini(sr, g, d, 0.8);
}

/** Crémaillère / cliquet : un cran par coup, la cadence ralentit. */
export function cremaillere(sr, crans, rnd) {
  const { n, g, d } = stereo(sr, crans * 0.16 + 0.5);
  let t = 0.01, pas = 0.075;
  for (let k = 0; k < crans; k++) {
    const banc = new BancModal(sr, [{ f: 1120, t60: 0.09 }, { f: 2350, t60: 0.07, a: 0.7 }, { f: 3980, t60: 0.05, a: 0.5 }, { f: 380, t60: 0.12, a: 0.6 }]);
    const lp = new Biquad(sr, 'lowpass', 110, 1), a = Math.round(t * sr);
    for (let j = 0; j < 0.2 * sr && a + j < n; j++) { const tt = j / sr; const v = banc.pas(j < 10 ? 1 - j / 10 : 0) * 0.9 + lp.pas(rnd.signe()) * Math.exp(-tt / 0.03) * 1.6; g[a + j] += v; d[a + j] += v * 0.9; }
    t += pas; pas *= 1.12;
  }
  return fini(sr, g, d, 0.85);
}

/** Verrou de porte de conteneur (came + barre) : levier, raclement, CLONK. */
export function verrou(sr, rnd) {
  const { n, g, d } = stereo(sr, 1.2);
  const levier = exciter(sr, new BancModal(sr, [{ f: 1680, t60: 0.07 }, { f: 3720, t60: 0.05, a: 0.6 }, { f: 5900, t60: 0.03, a: 0.4 }]), n, 0.0006, 0.8, rnd);
  const clonk = exciter(sr, new BancModal(sr, [{ f: 182, t60: 0.35 }, { f: 455, t60: 0.28, a: 0.8 }, { f: 870, t60: 0.2, a: 0.6 }, { f: 1460, t60: 0.12, a: 0.4 }, { f: 2330, t60: 0.08, a: 0.25 }]), n, 0.003, 1.3, rnd);
  const racle = new Biquad(sr, 'bandpass', 1500, 2.5), i2 = Math.round(0.07 * sr), i3 = Math.round(0.21 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = levier[i];
    if (t > 0.07 && t < 0.21) v += racle.pas(rnd.signe()) * 0.35 * Math.sin(Math.PI * (t - 0.07) / 0.14) * (1 + 0.5 * Math.sin(2 * Math.PI * 70 * t));
    if (i >= i3) v += clonk[i - i3] * 1.4;
    g[i] = v; d[i] = v * 0.9;
    void i2;
  }
  return fini(sr, g, d, 0.95);
}

/** Détente pneumatique (~10 bar) : claquement de valve + jet qui s'épuise. */
export function pneumatique(sr, duree, rnd, { force = 1 } = {}) {
  const { n, g, d } = stereo(sr, duree + 0.5);
  const bpG = new Biquad(sr, 'bandpass', 5200, 0.7), bpD = new Biquad(sr, 'bandpass', 5600, 0.7), hp = new Biquad(sr, 'highpass', 7000, 0.6), valve = new Biquad(sr, 'lowpass', 90, 1.2);
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(1, t / duree);
    if (i % 64 === 0) { const fc = 5200 * Math.pow(0.22, u); bpG.regler('bandpass', fc, 0.7); bpD.regler('bandpass', fc * 1.07, 0.7); }   // la pression chute : le jet ralentit, son spectre descend
    const env = (1 - Math.exp(-t / 0.002)) * Math.pow(1 - u, 1.6) * (t < duree ? 1 : 0) * force;
    const cl = valve.pas(rnd.signe()) * Math.exp(-t / 0.03) * 2.2;
    const h = hp.pas(rnd.signe()) * env * 0.35;
    g[i] = bpG.pas(rnd.signe()) * env + h + cl; d[i] = bpD.pas(rnd.signe()) * env + h * 0.9 + cl;
  }
  return fini(sr, g, d, 0.9);
}

/** Rideau métallique qui s'enroule : lames, coulisses, moto-réducteur. */
export function rideau(sr, duree, rnd) {
  const { n, g, d } = stereo(sr, duree + 0.6);
  const frot = new Biquad(sr, 'bandpass', 420, 0.9), frot2 = new Biquad(sr, 'bandpass', 2600, 2.5);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, actif = t < duree ? Math.min(1, t / 0.15) : Math.exp(-(t - duree) / 0.08);
    ph += 2 * Math.PI * 47 / sr;
    const moteur = (Math.sin(ph) * 0.4 + Math.sin(2 * ph) * 0.2 + Math.sin(8.5 * ph) * 0.12) * 0.12 * actif;
    const f = frot.pas(rnd.signe()) * 0.18 * actif + frot2.pas(rnd.signe()) * 0.05 * actif;
    g[i] = moteur + f; d[i] = moteur + f * 0.9;
  }
  for (let t = 0.05; t < duree; t += 0.075 + 0.045 * rnd()) {                                   // chaque lame qui bascule sur l'axe
    const banc = new BancModal(sr, [{ f: 760 + 160 * rnd(), t60: 0.09 }, { f: 1710 + 300 * rnd(), t60: 0.06, a: 0.7 }, { f: 2940 + 400 * rnd(), t60: 0.04, a: 0.5 }]);
    const a = Math.round(t * sr), pan = rnd();
    for (let j = 0; j < 0.12 * sr && a + j < n; j++) { const v = banc.pas(j < 12 ? (1 - j / 12) * (0.5 + 0.5 * rnd()) : 0) * 0.55; g[a + j] += v * (1.2 - pan * 0.4); d[a + j] += v * (0.8 + pan * 0.4); }
  }
  return fini(sr, g, d, 0.8);
}

/** Butée : le rideau tape en fin de course dans le coffre. */
export function butee(sr, rnd) {
  const { n, g, d } = stereo(sr, 1.4);
  const b = exciter(sr, new BancModal(sr, modesPlaque(96, 18, rnd, { t60Bas: 0.9 })), n, 0.0025, 1.2, rnd);
  const lp = new Biquad(sr, 'lowpass', 140, 1);
  for (let i = 0; i < n; i++) { const t = i / sr, v = b[i] + lp.pas(rnd.signe()) * Math.exp(-t / 0.05) * 2; g[i] = v; d[i] = v * 0.93; }
  return fini(sr, g, d, 0.9);
}

/** Contacteur de projecteur qui enclenche : clac sec, ronflement du ballast, arc qui s'amorce. */
export function contacteur(sr, rnd) {
  const { n, g, d } = stereo(sr, 0.9);
  const clac = exciter(sr, new BancModal(sr, [{ f: 2210, t60: 0.04 }, { f: 4460, t60: 0.03, a: 0.6 }, { f: 980, t60: 0.06, a: 0.5 }]), n, 0.0004, 1, rnd);
  const arc = new Biquad(sr, 'highpass', 3500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / sr, hum = (Math.sin(2 * Math.PI * 100 * t) * 0.6 + Math.sin(2 * Math.PI * 200 * t) * 0.3 + Math.sin(2 * Math.PI * 300 * t) * 0.15) * 0.12 * Math.min(1, t / 0.03) * Math.exp(-t / 0.5);
    const a = t > 0.012 && t < 0.15 ? arc.pas(rnd.signe()) * 0.3 * (rnd() < 0.3 ? 1 : 0.2) : 0;
    g[i] = clac[i] + hum + a; d[i] = clac[i] * 0.9 + hum + a * 0.8;
  }
  return fini(sr, g, d, 0.8);
}

/** Pouls du suspense : coup de masse lointain dans une cuve d'acier (sub + transitoire). */
export function battement(sr, rnd) {
  const { n, g, d } = stereo(sr, 0.7);
  const res = exciter(sr, new BancModal(sr, modesPlaque(52, 10, rnd, { t60Bas: 0.6, aigus: 0.2 })), n, 0.006, 0.6, rnd);
  for (let i = 0; i < n; i++) { const t = i / sr, s = Math.sin(2 * Math.PI * (58 - 18 * t) * t) * Math.exp(-t / 0.09) * (1 - Math.exp(-t / 0.003)); const v = s * 1.1 + res[i] * 0.5; g[i] = v; d[i] = v; }
  return fini(sr, g, d, 0.9);
}

/** La plaque-bordereau saute : rivets qui cèdent, alu qui vibre, éclats qui retombent sur le toit. */
export function eclatPlaque(sr, rnd) {
  const { n, g, d } = stereo(sr, 1.6);
  const r = rivets(sr, 4, rnd);
  const alu = exciter(sr, new BancModal(sr, modesPlaque(410, 16, rnd, { t60Bas: 0.35 })), n, 0.0008, 0.7, rnd);
  for (let i = 0; i < n; i++) { g[i] = (r.gauche[i] || 0) + alu[i]; d[i] = (r.droite[i] || 0) + alu[i] * 0.9; }
  for (let k = 0; k < 9; k++) {                                                                  // retombées
    const t = 0.35 + k * 0.08 + 0.06 * rnd(), banc = new BancModal(sr, [{ f: 3100 + 2400 * rnd(), t60: 0.05 }, { f: 1450 + 500 * rnd(), t60: 0.07, a: 0.5 }]), a = Math.round(t * sr), pan = rnd();
    for (let j = 0; j < 0.1 * sr && a + j < n; j++) { const v = banc.pas(j < 5 ? 1 - j / 5 : 0) * 0.3 * (1 - k / 11); g[a + j] += v * (1 - pan * 0.5); d[a + j] += v * (0.5 + pan * 0.5); }
  }
  return fini(sr, g, d, 0.85);
}

/** Atterrissage du conteneur : choc maximal + rebond + chaînes qui retombent + verrouillage des cales (twistlocks). */
export function atterrissage(sr, rnd) {
  const { n, g, d } = stereo(sr, 3.2);
  const c1 = chocLourd(sr, 1, rnd), c2 = chocLourd(sr, 0.55, rnd), ch = chaine(sr, 0.9, rnd), v1 = verrou(sr, rnd), v2 = verrou(sr, rnd);
  const poser = (src, t, k) => { const a = Math.round(t * sr); for (let i = 0; i < src.gauche.length && a + i < n; i++) { g[a + i] += src.gauche[i] * k; d[a + i] += src.droite[i] * k; } };
  poser(c1, 0, 1); poser(c2, 0.19, 0.45); poser(ch, 0.12, 0.45); poser(v1, 0.42, 0.55); poser(v2, 0.58, 0.5);
  return fini(sr, g, d, 0.95);
}

/* ------------------------------------------------------------------ hangar */
/** Réponse impulsionnelle stéréo du hangar (convolution) : premières réflexions + queue diffuse, aigus qui meurent plus vite. */
export function reponseHangar(sr, germe = 7, rt60 = 2.6) {
  const rnd = hasard(germe), { n, g, d } = stereo(sr, rt60 * 1.15);
  const k = 6.9078 / rt60;
  const reflex = [[0.017, 0.62, 0], [0.023, 0.5, 1], [0.041, 0.42, 0], [0.052, 0.38, 1], [0.068, 0.3, 0], [0.083, 0.27, 1], [0.097, 0.24, 0], [0.118, 0.2, 1], [0.131, 0.18, 0], [0.152, 0.15, 1]];
  for (const [t, a, c] of reflex) { const i = Math.round(t * sr); (c ? d : g)[i] += a; (c ? g : d)[i + Math.round(0.0007 * sr)] += a * 0.35; }
  const lpG = new PasseBas1(sr, 9000), lpD = new PasseBas1(sr, 9000);
  const debut = Math.round(0.03 * sr);
  for (let i = debut; i < n; i++) {
    const t = i / sr, env = Math.exp(-k * t) * Math.min(1, (t - 0.03) / 0.05) * 0.32;
    if (i % 128 === 0) { const fc = 9000 * Math.exp(-t * 1.4) + 700; lpG.regler(fc); lpD.regler(fc); }
    g[i] += lpG.pas(rnd.signe()) * env; d[i] += lpD.pas(rnd.signe()) * env;
  }
  // énergie normalisée (la convolution ne change pas le niveau perçu)
  let e = 0; for (let i = 0; i < n; i++) e += g[i] * g[i] + d[i] * d[i];
  const s = 1 / Math.sqrt(e / 2 || 1); for (let i = 0; i < n; i++) { g[i] *= s; d[i] *= s; }
  return { gauche: g, droite: d };
}

function fini(sr, g, d, crete) { fondus(g, sr, 0.0005, 0.05); fondus(d, sr, 0.0005, 0.05); normaliser(crete, g, d); return { gauche: g, droite: d }; }

/** Tous les bruitages d'un reveal (rendus une fois, avant le top départ). */
export function banqueFoley(sr, { germe = 1, rang = 0, dureeRideau = 4.4 } = {}) {
  const rnd = hasard(germe), B = {};
  B.atterrissage = atterrissage(sr, rnd);
  B.choc = [chocLourd(sr, 0.45, rnd), chocLourd(sr, 0.7, rnd), chocLourd(sr, 0.95, rnd)];
  B.grincement = [grincement(sr, 0.7, rnd), grincement(sr, 1.1, rnd, { grave: true })];
  B.rivets = rivets(sr, 5 + rang, rnd);
  B.chaine = chaine(sr, 1.0, rnd);
  B.cremaillere = cremaillere(sr, 5, rnd);
  B.verrou = [verrou(sr, rnd), verrou(sr, rnd)];
  B.pneumatique = pneumatique(sr, 1.3, rnd);
  B.verin = pneumatique(sr, 0.35, rnd, { force: 0.7 });
  B.rideau = rideau(sr, dureeRideau, rnd);
  B.butee = butee(sr, rnd);
  B.contacteur = contacteur(sr, rnd);
  B.battement = battement(sr, rnd);
  B.eclatPlaque = eclatPlaque(sr, rnd);
  return B;
}
