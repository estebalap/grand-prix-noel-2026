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
     MODE EXPLOSION    subBoom : infrabasse ~35 Hz (glissando 77 → 35 Hz, attaque 1,5 ms) + onde de souffle de Friedlander (pic
                       transitoire) ; clacForge : barre d'acier forgé libre-libre (modes d'Euler-Bernoulli) + plaque épaisse ;
                       detonation = les deux + éclats ; titan : sub-boom 30 Hz, deux claquements, décompression, pluie d'éclats.
     ferraille brute   pene (5 kg d'acier forgé qui tombe : rebonds à restitution 0,42), raclement de tôle galvanisée (collé-glissé
                       dense + grain du zinc), decompression (valve qui claque, jet qui plonge 6,5 kHz → 0,9 kHz), charnière GRIPPÉE
                       (grincement à à-coups), arcElectrique (claquements de décharge, bourdonnement 100 Hz).
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
export function grincement(sr, duree, rnd, { grave = false, grippe = false } = {}) {
  const { n, g, d } = stereo(sr, duree + 0.4);
  const modes = (grave ? [310, 720, 1180, 1730, 2410] : [520, 1240, 1980, 2870, 3940]).map((f, k) => ({ f: f * (1 + 0.02 * rnd.signe()), t60: 0.06 + 0.02 * k, a: 1 / (1 + k * 0.4) }));
  const banc = new BancModal(sr, modes);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(1, t / duree), vit = Math.sin(Math.PI * u) ** 0.7;          // vitesse de glissement en cloche
    // charnière GRIPPÉE : la rouille bloque l'axe, qui ne lâche que par à-coups (cadence basse, gigue forte, décollements violents)
    const fq = grippe ? 16 + 48 * vit * (1 + 0.6 * Math.sin(2 * Math.PI * 0.9 * t)) : (grave ? 45 : 90) + (grave ? 120 : 230) * vit * (1 + 0.25 * Math.sin(2 * Math.PI * 1.7 * t + rnd() * 0.2));
    ph += fq / sr; let ex = 0;
    if (ph >= 1) { ph -= 1 + (grippe ? 0.35 : 0.12) * rnd.signe(); ex = vit * (0.7 + 0.6 * rnd()) * (grippe ? 2.2 : 1); }
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
  // contacteur industriel (projecteur de 2 kW) : l'armature d'acier de ~400 g claque sur le noyau (modes graves, contact 1,2 ms), puis les
  // contacts d'argent (aigus) — un CLONK de ferraille, plus un clic numérique
  const clac = exciter(sr, new BancModal(sr, [{ f: 178, t60: 0.22 }, { f: 412, t60: 0.16, a: 0.9 }, { f: 980, t60: 0.09, a: 0.6 }, { f: 2210, t60: 0.04, a: 0.45 }, { f: 4460, t60: 0.03, a: 0.3 }]), n, 0.0012, 1.3, rnd);
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

/* ------------------------------------------------------------------ MODE EXPLOSION : détonations, ferraille brute */
/** Onde de souffle de Friedlander : surpression p(t) = (1 − t/T)·e^(−b·t/T), phase positive brève puis dépression plus longue. */
export function friedlander(t, T = 0.012, b = 1.8) { return t < 0 ? 0 : (1 - t / T) * Math.exp(-b * t / T); }

/** SUB-BOOM : infrabasse de détonation. Sinus dont la fréquence plonge de ~2,2·f0 à f0 (≈ 35 Hz) en 45 ms (la cavité du conteneur
 *  se vide), attaque de 1,5 ms, décroissance longue ; pic transitoire = onde de souffle de Friedlander (surpression + dépression)
 *  filtrée ; grondement de la structure (bruit < 90 Hz). Saturation douce, crête 0,95 : aucun écrêtage. */
export function subBoom(sr, rnd, { f0 = 35, duree = 1.8, force = 1 } = {}) {
  const { n, g, d } = stereo(sr, duree);
  const tau = 0.2 + 0.26 * Math.min(1.8, force), lp = new Biquad(sr, 'lowpass', 1800, 0.7), gr = new Biquad(sr, 'lowpass', 85, 0.9), grD = new Biquad(sr, 'lowpass', 92, 0.9);
  const souffle = new Biquad(sr, 'lowpass', 260, 0.7);
  // enveloppes exponentielles calculées par récurrence (une multiplication par échantillon au lieu d'un Math.exp)
  const k = (tc) => Math.exp(-1 / (tc * sr));
  const kGl = k(0.045), kAt = k(0.0015), kTau = k(tau), kH2 = k(0.08), kCl = k(0.004), kRo = k(tau * 1.4), kRa = k(0.02), iChoc = Math.round(0.08 * sr);
  let ph = 0, eGl = 1, eAt = 1, eTau = 1, eH2 = 1, eCl = 1, eRo = 1, eRa = 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * (1 + 1.2 * eGl);
    ph += 2 * Math.PI * f / sr;
    const env = (1 - eAt) * eTau;
    const corps = Math.sin(ph) * env * 1.25 + Math.sin(2 * ph + 0.4) * env * 0.12 * eH2;
    const choc = i < iChoc ? souffle.pas(friedlander(t, 0.014, 1.7) * 1.6) + lp.pas(rnd.signe()) * eCl * 0.45 : 0;   // pic transitoire
    const roule = eRo * (1 - eRa);
    const v = sature(corps + choc);
    g[i] = v + gr.pas(rnd.signe()) * roule * 0.9; d[i] = v + grD.pas(rnd.signe()) * roule * 0.9;
    eGl *= kGl; eAt *= kAt; eTau *= kTau; eH2 *= kH2; eCl *= kCl; eRo *= kRo; eRa *= kRa;
  }
  const nf = Math.round(n * 0.45);                                            // queue : fondu en cosinus sur 45 % (une infrabasse ne s'arrête pas net)
  for (let i = 0; i < nf; i++) { const w = 0.5 - 0.5 * Math.cos(Math.PI * i / nf); g[n - 1 - i] *= w; d[n - 1 - i] *= w; }
  return fini(sr, g, d, 0.95);
}

/** CLAQUEMENT D'ACIER FORGÉ : barre libre-libre (modes d'Euler-Bernoulli 1 : 2,756 : 5,404 : 8,933 : 13,34 : 19,48), plaque épaisse
 *  et frappe acier sur acier (contact 0,7 ms). Les modes graves tiennent 1,5 s, les aigus meurent vite (T60 ∝ 1/√f). */
export function clacForge(sr, rnd, { f1 = 196, masse = 1, duree = 2.2 } = {}) {
  const { n, g, d } = stereo(sr, duree);
  const barre = [1, 2.756, 5.404, 8.933, 13.344, 19.48].map((k, i) => ({ f: f1 * k * (1 + 0.008 * rnd.signe()), t60: Math.max(0.08, (1.1 + 0.6 * masse) * Math.pow(1 / k, 0.55)), a: 1 / (1 + 0.45 * i) }));
  const plaque = modesPlaque(118 - 30 * masse, 16, rnd, { t60Bas: 1.3, aigus: 0.6 });
  const b1 = exciter(sr, new BancModal(sr, barre), n, 0.0007, 1.4, rnd, 0.1);
  const b2 = exciter(sr, new BancModal(sr, plaque), n, 0.0012, 1.0, rnd, 0.2);
  const air = new Biquad(sr, 'highpass', 2500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / sr, crack = air.pas(rnd.signe()) * Math.exp(-t / 0.0025) * 0.9;
    const v = sature(b1[i] * 1.6 + b2[i] * 1.2) + crack;
    g[i] = v; d[i] = v * 0.9 + b2[i] * 0.15;
  }
  return fini(sr, g, d, 0.9);
}

/** Rebonds d'un objet lâché : temps de vol t_{k+1} − t_k = e · (t_k − t_{k−1}) (vitesse de rebond × e), amplitude ∝ vitesse d'impact
 *  (√e d'énergie conservée par choc, pertes de contact en plus). [[instant (s), amplitude]…] jusqu'à ce que le vol dure < 6 ms. */
export function rebondsPene(e = 0.42, gap0 = 0.19, t0 = 0.008) {
  const r = []; let t = t0, gap = gap0, amp = 1;
  while (gap > 0.006 && t < 1.4) { r.push([t, amp]); t += gap; gap *= e; amp *= Math.sqrt(e) * 0.95; }
  return r;
}
/** Chute d'un PÊNE en acier forgé de 5 kg (Ø 45 × 400 mm) sur le plancher du conteneur : impact lourd puis rebonds dont l'intervalle
 *  et l'amplitude suivent le coefficient de restitution (e = 0,42), jusqu'au roulis final. Modes de flexion de la barre
 *  (≈ 1,3 / 3,6 / 7,0 kHz) + coup sourd de la tôle de plancher. */
export function pene(sr, rnd, { e = 0.42, masse = 1 } = {}) {
  const { n, g, d } = stereo(sr, 1.9);
  const modesBarre = (k) => [{ f: 1298 * (1 + 0.01 * rnd.signe()), t60: 0.32, a: 1 }, { f: 3578, t60: 0.2, a: 0.7 }, { f: 7014, t60: 0.11, a: 0.45 }, { f: 11590, t60: 0.06, a: 0.25 }].map((m) => ({ ...m, a: m.a * (k ? 0.8 : 1) }));
  const plancher = modesPlaque(46, 14, rnd, { t60Bas: 0.45, aigus: 0.4 });          // la barre posée sur la tôle est amortie par le contact
  const impacts = rebondsPene(e);
  const tFin = impacts[impacts.length - 1][0] + 0.012;
  for (let k = 0; k < 7; k++) impacts.push([tFin + k * 0.012 + 0.004 * rnd(), 0.05 * (1 - k / 7)]);    // la barre finit de vibrer sur le plancher
  const sourd = new Biquad(sr, 'lowpass', 140, 1.1);
  for (const [ti, a] of impacts) {
    const i0 = Math.round(ti * sr), lb = new BancModal(sr, modesBarre(ti > 0.01 ? 1 : 0)), lp = new BancModal(sr, plancher), pan = 0.5 + 0.15 * rnd.signe();
    const L = Math.min(n - i0, Math.round((0.12 + 0.8 * a) * sr)), nc = Math.max(2, Math.round((0.0009 + 0.0012 * masse) * sr));
    for (let k = 0; k < L; k++) {
      const ex = k < nc ? Math.sin(Math.PI * k / nc) * a : 0, tt = k / sr;
      const contact = k < nc * 2 ? rnd.signe() * a * 0.9 * (1 - k / (nc * 2)) : 0;              // le choc acier sur acier : craquement large bande
      const v = lb.pas(ex) * 1.1 + lp.pas(ex) * 1.6 + contact + (tt < 0.15 ? sourd.pas(k < nc * 3 ? rnd.signe() * a : 0) * Math.exp(-tt / 0.03) * 2.2 : 0);
      g[i0 + k] += v * (1.1 - pan * 0.4); d[i0 + k] += v * (0.7 + pan * 0.4);
    }
  }
  return fini(sr, g, d, 0.9);
}

/** RACLEMENT de tôle galvanisée : collé-glissé dense (60 → 180 Hz, gigue forte) qui excite les modes du panneau, plus le grain du
 *  zinc (bruit 1,5–4 kHz modulé par chaque décollement). La vitesse de glissement monte puis retombe. */
export function raclement(sr, duree, rnd) {
  const { n, g, d } = stereo(sr, duree + 0.4);
  const panneau = new BancModal(sr, modesPlaque(82, 24, rnd, { t60Bas: 0.45, aigus: 0.8 }));
  const grain = new Biquad(sr, 'bandpass', 2600, 0.8), grainD = new Biquad(sr, 'bandpass', 2900, 0.8), corps = new Biquad(sr, 'bandpass', 480, 1.4);
  let ph = 0, mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(1, t / duree), vit = Math.pow(Math.sin(Math.PI * u), 0.6) * (t < duree ? 1 : 0);
    ph += (60 + 120 * vit) * (1 + 0.35 * rnd.signe()) / sr;
    let ex = 0; if (ph >= 1) { ph -= 1; ex = vit * (0.5 + rnd()); mod = 1; }
    mod *= 0.995;
    const p = panneau.pas(ex * 0.6) * 0.9, gr = grain.pas(rnd.signe()) * (0.25 + 0.75 * mod) * vit * 0.5, c = corps.pas(rnd.signe()) * vit * 0.25;
    g[i] = p + gr + c; d[i] = p * 0.9 + grainD.pas(rnd.signe()) * (0.25 + 0.75 * mod) * vit * 0.5 + c;
  }
  return fini(sr, g, d, 0.8);
}

/** DÉCOMPRESSION pneumatique brutale : la valve claque (CLONK modal), le jet démarre en < 1 ms avec une onde de souffle, puis son
 *  spectre plonge (la pression s'effondre : 6,5 kHz → 900 Hz en 0,4 s) ; coup sourd du réservoir qui se vide. */
export function decompression(sr, rnd, { force = 1, duree = 0.9 } = {}) {
  const { n, g, d } = stereo(sr, duree + 0.4);
  const valve = exciter(sr, new BancModal(sr, [{ f: 226, t60: 0.3 }, { f: 534, t60: 0.22, a: 0.8 }, { f: 1112, t60: 0.14, a: 0.6 }, { f: 2210, t60: 0.08, a: 0.4 }]), n, 0.0015, 1.2, rnd);
  const bpG = new Biquad(sr, 'bandpass', 6500, 0.6), bpD = new Biquad(sr, 'bandpass', 6900, 0.6), sourd = new Biquad(sr, 'lowpass', 120, 1);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i % 32 === 0) { const fc = 900 + 5600 * Math.exp(-t / 0.15); bpG.regler('bandpass', fc, 0.6); bpD.regler('bandpass', fc * 1.06, 0.6); }
    const env = (1 - Math.exp(-t / 0.0006)) * Math.exp(-t / (0.16 + 0.1 * force)) * force * (t < duree ? 1 : Math.exp(-(t - duree) / 0.05));
    const boum = friedlander(t, 0.01, 1.6) * 0.9 + sourd.pas(rnd.signe()) * Math.exp(-t / 0.06) * 1.6;
    g[i] = bpG.pas(rnd.signe()) * env * 1.5 + valve[i] * 0.9 + boum; d[i] = bpD.pas(rnd.signe()) * env * 1.5 + valve[i] * 0.85 + boum;
  }
  return fini(sr, g, d, 0.9);
}

/** ARC ÉLECTRIQUE : claquements de décharge (Poisson en rafales), bourdonnement 100 Hz de l'alimentation, sifflement d'ionisation. */
export function arcElectrique(sr, duree, rnd) {
  const { n, g, d } = stereo(sr, duree + 0.15);
  const hp = new Biquad(sr, 'highpass', 2200, 0.7), hpD = new Biquad(sr, 'highpass', 2400, 0.7), ion = new Biquad(sr, 'bandpass', 7000, 1.5);
  let rafale = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, actif = t < duree ? 1 : Math.exp(-(t - duree) / 0.03);
    if (rnd() < 0.002) rafale = 1; rafale *= 0.9993;
    const clic = rnd() < (60 + 900 * rafale) / sr ? (0.6 + 0.4 * rnd()) * (rnd() < 0.5 ? 1 : -1) : 0;
    const buzz = (Math.sin(2 * Math.PI * 100 * t) * 0.5 + Math.sign(Math.sin(2 * Math.PI * 100 * t)) * 0.2) * 0.12;
    const s = ion.pas(rnd.signe()) * 0.12;
    g[i] = (hp.pas(clic * 3) + buzz + s) * actif; d[i] = (hpD.pas(clic * 3) + buzz * 0.9 + s) * actif;
  }
  return fini(sr, g, d, 0.75);
}

/** DÉTONATION composite (un palier de rareté) : sub-boom + claquement d'acier forgé + éclats de rouille et de boulons. */
export function detonation(sr, rnd, { force = 1, f0 = 35 } = {}) {
  const { n, g, d } = stereo(sr, 2.4);
  const sb = subBoom(sr, rnd, { f0, duree: 2.2, force }), cl = clacForge(sr, rnd, { f1: 210 - 40 * force, masse: Math.min(1, force) });
  const eclats = particules(sr, n, { debut: 0.01, duree: 0.35 + 0.3 * force, densite: 90, modes: [{ f: 2650, t60: 0.05 }, { f: 4310, t60: 0.04 }, { f: 1380, t60: 0.07, a: 0.5 }, { f: 6200, t60: 0.03, a: 0.4 }], gain: 0.6 }, rnd);
  const ajouter = (src, k, decal = 0) => { const a = Math.round(decal * sr); for (let i = 0; i + a < n && i < src.gauche.length; i++) { g[i + a] += src.gauche[i] * k; d[i + a] += src.droite[i] * k; } };
  ajouter(sb, 1.0); ajouter(cl, 0.62 + 0.15 * force);
  for (let i = 0; i < n; i++) { g[i] += eclats[i] * 0.35; d[i] += eclats[i] * 0.4; }
  return fini(sr, g, d, 0.95);
}

/** EXPLOSION TITANESQUE (le scellé est pulvérisé) : sub-boom le plus profond (30 Hz, 3 s), deux claquements de forge décalés de 17 ms,
 *  décompression, pluie d'éclats qui retombent sur le toit et le béton. */
export function titan(sr, rnd) {
  const { n, g, d } = stereo(sr, 3.6);
  const sb = subBoom(sr, rnd, { f0: 30, duree: 3.4, force: 1.8 }), c1 = clacForge(sr, rnd, { f1: 148, masse: 1, duree: 2.6 }), c2 = clacForge(sr, rnd, { f1: 233, masse: 0.8 });
  const dc = decompression(sr, rnd, { force: 1, duree: 1.1 });
  const pluie = particules(sr, n, { debut: 0.25, duree: 1.6, densite: 70, modes: [{ f: 3100, t60: 0.05 }, { f: 1720, t60: 0.08, a: 0.6 }, { f: 5200, t60: 0.03, a: 0.4 }, { f: 820, t60: 0.1, a: 0.4 }], gain: 0.7 }, rnd);
  const ajouter = (src, k, decal = 0) => { const a = Math.round(decal * sr); for (let i = 0; i + a < n && i < src.gauche.length; i++) { g[i + a] += src.gauche[i] * k; d[i + a] += src.droite[i] * k; } };
  ajouter(sb, 1.05); ajouter(c1, 0.7); ajouter(c2, 0.5, 0.017); ajouter(dc, 0.45, 0.03);
  for (let i = 0; i < n; i++) { g[i] += pluie[i] * 0.3; d[i] += pluie[i] * 0.34; }
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

/* ------------------------------------------------------------------ MODE DRAME : le rideau qui se coince, la lame qui tombe, l'enjoliveur */
/** Mélange stéréo de sources { gauche, droite } posées à des instants (s) avec leur gain, normalisé à `crete`. */
function melange(sr, duree, pistes, crete = 0.9) {
  const { n, g, d } = stereo(sr, duree);
  for (const [src, t, k] of pistes) {
    const a = Math.round(t * sr);
    for (let i = 0; i < src.gauche.length && a + i < n; i++) { g[a + i] += src.gauche[i] * k; d[a + i] += src.droite[i] * k; }
  }
  return fini(sr, g, d, crete);
}
/** À-coup du rideau coincé : le moto-réducteur force, quelques lames claquent sur l'axe, la charnière grippée geint, puis le
 *  rideau s'arrête net sur sa butée de rouille (choc sourd). */
export function aCoupRideau(sr, rnd, k = 0) {
  const r = rideau(sr, 0.24, rnd), gr = grincement(sr, 0.32, rnd, { grave: true, grippe: true }), c = chocLourd(sr, 0.3 + 0.1 * k, rnd);
  return melange(sr, 1.6, [[r, 0, 0.8], [gr, 0.02, 0.7], [c, 0.22, 0.55]]);
}
/** Rideau bloqué à mi-hauteur : le moteur du rideau cale (47 → 30 Hz, ronflement qui bat), la charnière grippée hurle par à-coups. */
export function rideauCoince(sr, rnd) {
  const gr = grincement(sr, 1.0, rnd, { grippe: true }), gr2 = grincement(sr, 0.7, rnd, { grave: true, grippe: true });
  const { n, g, d } = stereo(sr, 1.4);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = Math.min(1, t / 1.0), f = 47 - 17 * u, env = Math.min(1, t / 0.05) * (t < 1.0 ? 1 : Math.exp(-(t - 1) / 0.06));
    ph += 2 * Math.PI * f / sr;
    const v = (Math.sin(ph) * 0.5 + Math.sin(2 * ph) * 0.25 + Math.sin(5 * ph) * 0.1) * 0.22 * env * (1 + 0.4 * Math.sin(2 * Math.PI * 9 * t));
    g[i] = v; d[i] = v;
  }
  const moteur = fini(sr, g, d, 0.6);
  return melange(sr, 1.6, [[moteur, 0, 0.7], [gr, 0.05, 0.8], [gr2, 0.45, 0.5]]);
}
/** Lame d'acier du rideau qui tombe à plat sur le béton : claquement (modes de poutre libre-libre d'une lame mince, f ∝ (k + ½)²),
 *  corps sourd du béton, deux rebonds de plus en plus faibles ; la lame « chante » un instant au sol. Le CLONK du drame. */
export function lameTombe(sr, rnd) {
  const { n, g, d } = stereo(sr, 1.8);
  const modes = [];
  for (let k = 1; k <= 9; k++) modes.push({ f: 168 * Math.pow(k + 0.5, 2) / 2.25 * (1 + 0.02 * rnd.signe()), t60: Math.max(0.04, 0.9 / Math.sqrt(k)), a: 1 / Math.sqrt(k) });
  const sol = new Biquad(sr, 'lowpass', 120, 1.1);
  for (const [t, a] of [[0, 1], [0.11, 0.45], [0.19, 0.2]]) {
    const i0 = Math.round(t * sr), x = exciter(sr, new BancModal(sr, modes), n - i0, 0.0012, a, rnd);
    for (let i = 0; i < x.length; i++) { const corps = sol.pas(rnd.signe()) * Math.exp(-(i / sr) / 0.035) * 2.2 * a; g[i0 + i] += x[i] + corps; d[i0 + i] += x[i] * 0.9 + corps; }
  }
  return fini(sr, g, d, 0.95);
}
/** Fin d'enroulement pénible : lames qui basculent, deux grincements de charnière grippée, butée en fin de course. */
export function finRideau(sr, duree, rnd) {
  const r = rideau(sr, duree, rnd), a = grincement(sr, 0.5, rnd, { grave: true, grippe: true }), b = grincement(sr, 0.45, rnd, { grippe: true }), bu = butee(sr, rnd);
  return melange(sr, duree + 1.4, [[r, 0, 0.75], [a, duree * 0.3, 0.6], [b, duree * 0.66, 0.55], [bu, duree, 0.6]]);
}
/** Enjoliveur de tôle qui se détache (clac), roule sur le béton (un contact par tour, cadence qui ralentit), puis tourne en
 *  toupie comme un disque d'Euler (contacts de plus en plus rapprochés, de plus en plus faibles) avant de se coucher à plat. */
export function enjoliveur(sr, rnd, { roule = 1.3, toupie = 1.0 } = {}) {
  const tot = roule + toupie + 1.0, { n, g, d } = stereo(sr, tot);
  const modes = modesPlaque(780, 14, rnd, { t60Bas: 0.5, rapport: 1 });
  const frappe = (t, a, pan = 0.5) => {
    const i0 = Math.round(t * sr), x = exciter(sr, new BancModal(sr, modes), Math.max(1, Math.min(n - i0, Math.round(0.6 * sr))), 0.0004, a, rnd);
    for (let i = 0; i < x.length; i++) { g[i0 + i] += x[i] * (1.1 - pan * 0.4); d[i0 + i] += x[i] * (0.7 + pan * 0.4); }
  };
  frappe(0, 0.9);
  for (let t = 0.12, p = 0.07; t < roule; t += p, p *= 1.06) frappe(t, 0.18 + 0.1 * rnd(), 0.3 + 0.4 * t / roule);
  for (let t = roule, p = 0.16; t < roule + toupie && p > 0.008; t += p, p *= 0.86) frappe(t, 0.32 * (0.4 + 0.6 * p / 0.16), 0.75);
  frappe(roule + toupie, 0.8, 0.75);
  return fini(sr, g, d, 0.85);
}
/** Bruitages du MODE DRAME (rendus une fois, avant le top départ, seulement pour un bolide à rareté « drame »). */
export function banqueDrame(sr, { germe = 1, dureeFin = 1.4, enjo = { roule: 1.3, toupie: 1.0 } } = {}) {
  const rnd = hasard(germe);
  return { acoup: [0, 1, 2].map((k) => aCoupRideau(sr, rnd, k)), coince: rideauCoince(sr, rnd), lame: lameTombe(sr, rnd), fin: finRideau(sr, dureeFin, rnd), enjoliveur: enjoliveur(sr, rnd, enjo) };
}

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
  // MODE EXPLOSION : détonations par niveau de force (léger / lourd / climax), explosion titanesque (rang ≥ 3), ferraille brute
  B.detonation = [detonation(sr, rnd, { force: 0.5, f0: 38 }), detonation(sr, rnd, { force: 0.8, f0: 36 }), detonation(sr, rnd, { force: 1.1, f0: 34 })];
  if (rang >= 3) B.titan = titan(sr, rnd);
  B.pene = [pene(sr, rnd), pene(sr, rnd, { e: 0.38, masse: 0.8 })];
  B.raclement = raclement(sr, 0.65, rnd);
  B.decompression = decompression(sr, rnd);
  B.arc = arcElectrique(sr, 0.4, rnd);
  B.charniere = grincement(sr, 0.9, rnd, { grave: true, grippe: true });
  return B;
}
