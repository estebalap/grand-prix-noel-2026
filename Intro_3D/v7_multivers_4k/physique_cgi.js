/* PHYSIQUE CGI V7 — moteur cinématique-dynamique 100 % DÉTERMINISTE : toute grandeur est une FONCTION PURE DU TEMPS t.
   Aucun état qui dépend de l'image précédente : on peut sauter à n'importe quel t (rendu image par image à 60 fps, flou
   de mouvement par sous-expositions, planche contact) et obtenir exactement la même pose. Aucune dépendance (Node et navigateur).

   Repère du film : 1 unité = 1 cm, y = haut, l'avant d'un bolide à cap 0 est +z. Cap positif = virage à GAUCHE (+x est la
   gauche d'un bolide qui regarde +z). Tangage > 0 = nez qui plonge, tangage < 0 = cabrage ; roulis > 0 = flanc gauche qui monte
   (la caisse penche vers la droite : roulis EXTÉRIEUR d'un virage à gauche). Ordre d'Euler recommandé : 'YXZ' (cap, tangage, roulis).

   Contenu
     splineCR(points)            spline de Catmull-Rom 3D (uniforme) : position, dérivées 1re et 2e ANALYTIQUES, abscisse curviligne
     profilVitesse(cles)         vitesse affine par morceaux → distance s(t) en forme close, accélération longitudinale a∥ = dv/dt
     trajectoire({...})          pos, cap, pente, vecteur vitesse v(t), a∥(t) et accélération centripète latérale a⟂ = κ·v² (signée)
     derive(t, p)                angle de dérive β(t) ∈ [14°, 34°] en tenue, contre-braquage des roues avant δ = −0,85·β
     suspension(t, cfg, f)       ressort-amortisseur du 2e ordre (pilonnement, tangage, roulis) : cabrage/squat au boost, plongée et
                                 écrasement amorti à la réception (ζ = 0,65 ; ωn = 14 rad/s), roulis extérieur ∝ a⟂, micro-vibrations
                                 de la route filtrées par la suspension, compression des 4 coins (roues au sol, talonnage de la caisse)
     creerCascadeur(def)         assemble le tout : pose(t) → { pos, cap, tangage, roulis, beta, braquage, dist, vit, kmh, aPar, aLat, coins }
*/

/* ───────────────────────────── outils ───────────────────────────── */
export const mulberry = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const graineur = (n) => mulberry(n >>> 0);
export const hashTexte = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smoother = (u) => { const k = clamp(u); return k * k * k * (k * (k * 6 - 15) + 10); };
export const doux = (u) => { const k = clamp(u); return k * k * (3 - 2 * k); };
export const DEG = Math.PI / 180;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const nrm = (a) => Math.hypot(a[0], a[1], a[2]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const n = nrm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

/* ───────────────────── spline de Catmull-Rom (Hermite, tangentes (P[i+1]−P[i−1])/2) ───────────────────── */
export function splineCR(points, { echantillons = 40 } = {}) {
  const P = points.map((p) => [p[0], p[1], p[2]]), n = P.length - 1;
  if (n < 1) throw new Error('splineCR : au moins 2 points');
  const M = P.map((p, i) => (i === 0 ? sub(P[1], P[0]) : i === n ? sub(P[n], P[n - 1]) : mul(sub(P[i + 1], P[i - 1]), 0.5)));
  const seg = (g) => { const i = Math.min(n - 1, Math.max(0, Math.floor(g))); return [i, g - i]; };
  const base = (g, ordre) => {
    const [i, l] = seg(g), l2 = l * l, l3 = l2 * l;
    let a, b, c, d;                                                   // h00, h10, h01, h11 (et leurs dérivées)
    if (ordre === 0) { a = 2 * l3 - 3 * l2 + 1; b = l3 - 2 * l2 + l; c = -2 * l3 + 3 * l2; d = l3 - l2; }
    else if (ordre === 1) { a = 6 * l2 - 6 * l; b = 3 * l2 - 4 * l + 1; c = -6 * l2 + 6 * l; d = 3 * l2 - 2 * l; }
    else { a = 12 * l - 6; b = 6 * l - 4; c = -12 * l + 6; d = 6 * l - 2; }
    return [0, 1, 2].map((k) => a * P[i][k] + b * M[i][k] + c * P[i + 1][k] + d * M[i + 1][k]);
  };
  const pos = (g) => base(g, 0), d1 = (g) => base(g, 1), d2 = (g) => base(g, 2);
  // table d'abscisse curviligne
  const N = n * echantillons, gs = new Float64Array(N + 1), ss = new Float64Array(N + 1);
  let prec = pos(0);
  for (let k = 1; k <= N; k++) { const g = k / echantillons, p = pos(g); gs[k] = g; ss[k] = ss[k - 1] + nrm(sub(p, prec)); prec = p; }
  const longueur = ss[N];
  const gDeS = (s) => {
    const x = clamp(s, 0, longueur); let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ss[m] <= x) lo = m; else hi = m; }
    const k = ss[hi] - ss[lo] > 1e-12 ? (x - ss[lo]) / (ss[hi] - ss[lo]) : 0;
    return gs[lo] + (gs[hi] - gs[lo]) * k;
  };
  return {
    longueur, n,
    /** position à l'abscisse curviligne s (prolongée en ligne droite au-delà des extrémités) */
    point(s) {
      if (s < 0) return add(pos(0), mul(unit(d1(0)), s));
      if (s > longueur) return add(pos(n), mul(unit(d1(n)), s - longueur));
      return pos(gDeS(s));
    },
    /** tangente unitaire T(s) */
    tangente(s) { const g = gDeS(s); return unit(d1(g)); },
    /** courbure κ (≥ 0) et courbure signée autour de la verticale (> 0 = centre de courbure à GAUCHE) */
    courbure(s) {
      const g = gDeS(s), a = d1(g), b = d2(g), c = cross(a, b), na = nrm(a) || 1;
      const kappa = nrm(c) / (na * na * na);
      // centre à gauche (+x pour un cap +z) ⇔ rotation du cap positive ⇔ (v × a)·ŷ < 0 dans ce repère (x gauche, z avant)
      const sgn = -Math.sign(c[1]) || 0;
      return { kappa, signee: kappa * sgn };
    },
  };
}

/* ───────────────────── profil de vitesse (affine par morceaux) → s(t) en forme close ───────────────────── */
export function profilVitesse(cles, s0 = 0) {
  const K = cles.map((c) => [c[0], c[1]]);
  if (K.length < 2) throw new Error('profilVitesse : au moins 2 clés [t, v]');
  const cum = [s0];
  for (let i = 1; i < K.length; i++) cum.push(cum[i - 1] + 0.5 * (K[i][1] + K[i - 1][1]) * (K[i][0] - K[i - 1][0]));
  const idx = (t) => { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; return i; };
  return {
    t0: K[0][0], t1: K[K.length - 1][0],
    vit(t) { const tt = clamp(t, K[0][0], K[K.length - 1][0]), i = idx(tt), k = (tt - K[i][0]) / (K[i + 1][0] - K[i][0] || 1); return lerp(K[i][1], K[i + 1][1], k); },
    /** accélération longitudinale a∥ = dv/dt (0 hors de la plage) */
    acc(t) { if (t < K[0][0] || t > K[K.length - 1][0]) return 0; const i = idx(t); return (K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0] || 1); },
    /** distance parcourue (cm) : intégrale exacte de la vitesse affine par morceaux */
    dist(t) {
      if (t <= K[0][0]) return s0 + K[0][1] * (t - K[0][0]);
      if (t >= K[K.length - 1][0]) return cum[cum.length - 1] + K[K.length - 1][1] * (t - K[K.length - 1][0]);
      const i = idx(t), dt = t - K[i][0], v0 = K[i][1], a = (K[i + 1][1] - v0) / (K[i + 1][0] - K[i][0] || 1);
      return cum[i] + v0 * dt + 0.5 * a * dt * dt;
    },
  };
}

/* ───────────────────── trajectoire : vitesse vectorielle, a∥, a⟂ = κ·v² ───────────────────── */
export function trajectoire({ spline, profil }) {
  return function etat(t) {
    const s = profil.dist(t), v = profil.vit(t), aPar = profil.acc(t);
    const T = spline.tangente(s), c = spline.courbure(s);
    const aPerp = c.kappa * v * v, aLat = c.signee * v * v;          // aLat > 0 : accélération centripète vers la gauche
    return {
      s, v, aPar, aPerp, aLat, kappa: c.kappa,
      pos: spline.point(s), T,
      vel: mul(T, v),                                                  // vecteur vitesse v(t)
      capVitesse: Math.atan2(T[0], T[2]),                              // cap du vecteur vitesse (0 = vers +z)
      pente: Math.asin(clamp(T[1], -1, 1)),
    };
  };
}

/* ───────────────────── angle de dérive β(t) et contre-braquage ───────────────────── */
/** p = { t0, montee, maintien, descente, betaMax (rad, 14°–34°), signe (+1 = virage à gauche) }. β ne dépasse jamais [0, betaMax·1,06]. */
export function derive(t, p) {
  const { t0, montee = 0.16, maintien = 0.6, descente = 0.7, betaMax = 24 * DEG, signe = 1 } = p;
  const u = t - t0;
  let e = 0;
  if (u > 0 && u < montee) e = smoother(u / montee);
  else if (u >= montee && u < montee + maintien) e = 1;
  else if (u >= montee + maintien && u < montee + maintien + descente) e = 1 - smoother((u - montee - maintien) / descente);
  // petites corrections du pilote (oscillation amortie) : le drift est vivant, jamais figé
  const corr = e > 0 ? 0.05 * Math.sin(2 * Math.PI * 1.9 * u) * Math.exp(-0.5 * u) : 0;
  const beta = signe * betaMax * e * (1 + corr);
  return { beta, actif: e, braquage: -0.85 * beta };
}

/* ───────────────────── suspension : ressort-amortisseur du 2e ordre (intégration déterministe à pas fixe) ───────────────────── */
export const SUSP_DEFAUT = Object.freeze({
  wn: 14, zeta: 0.65,                     // pilonnement : ωn = 14 rad/s, ζ = 0,65 (cahier des charges V7)
  wnTang: 11, zetaTang: 0.55, wnRoul: 12, zetaRoul: 0.6,
  kTang: 0.00055, kRoul: 0.00042,         // rad par cm/s² (cabrage proportionnel à a∥, roulis proportionnel à a⟂)
  maxTang: 0.075, maxRoul: 0.085,
  empattement: 4.6, voie: 2.8,            // cm : demi-empattement 2,3 / demi-voie 1,4
  gardeAuSol: 0.45,                       // cm : au-delà, la caisse talonne (sparks) ; les roues, elles, restent au sol
  pas: 1 / 240,
});

/** Intègre l'état de la suspension de f.t0 jusqu'à t. f = { t0, aPar(τ), aLat(τ), atterrissage: {t, vz}|null, vib: [{A, w, ph}] }. */
export function suspension(t, cfg, f) {
  const c = { ...SUSP_DEFAUT, ...cfg }, h = c.pas;
  let y = 0, yv = 0, th = 0, thv = 0, ph = 0, phv = 0;
  const w2 = c.wn * c.wn, wT2 = c.wnTang * c.wnTang, wR2 = c.wnRoul * c.wnRoul;
  let atterri = !f.atterrissage;
  const n = Math.max(0, Math.floor((t - f.t0) / h));
  let tau = f.t0;
  const vibe = (tt) => { let r = 0, rv = 0; for (const o of f.vib || []) { r += o.A * Math.sin(o.w * tt + o.ph); rv += o.A * o.w * Math.cos(o.w * tt + o.ph); } return [r, rv]; };
  const un = (dt) => {
    if (!atterri && tau >= f.atterrissage.t) { yv -= f.atterrissage.vz; atterri = true; }          // impulsion d'atterrissage : écrasement
    const [r, rv] = vibe(tau);
    const ay = -2 * c.zeta * c.wn * (yv - rv) - w2 * (y - r);                                         // excitation de base filtrée par la suspension
    const thEq = clamp(-c.kTang * f.aPar(tau), -c.maxTang, c.maxTang);                               // a∥ > 0 → θ < 0 (cabrage) ; freinage → θ > 0 (plongée)
    const phEq = clamp(c.kRoul * f.aLat(tau), -c.maxRoul, c.maxRoul);                                // roulis extérieur ∝ a⟂
    const ath = -2 * c.zetaTang * c.wnTang * thv - wT2 * (th - thEq);
    const aph = -2 * c.zetaRoul * c.wnRoul * phv - wR2 * (ph - phEq);
    yv += ay * dt; y += yv * dt; thv += ath * dt; th += thv * dt; phv += aph * dt; ph += phv * dt;   // Euler semi-implicite
    tau += dt;
  };
  for (let i = 0; i < n; i++) un(h);
  const reste = t - tau; if (reste > 1e-9) un(reste);
  // 4 coins : dy = y − θ·z + φ·x  (x gauche, z avant) ; les ROUES restent au sol (le film décale leur moyeu de max(0, −coin)) ; la caisse talonne à gardeAuSol
  const ez = c.empattement / 2, ex = c.voie / 2;
  const coins = { av_g: y - th * ez + ph * ex, av_d: y - th * ez - ph * ex, ar_g: y + th * ez + ph * ex, ar_d: y + th * ez - ph * ex };
  const bas = Math.min(coins.av_g, coins.av_d, coins.ar_g, coins.ar_d);
  const releve = bas < -c.gardeAuSol ? -c.gardeAuSol - bas : 0;       // talonnage : la caisse bute sur le sol à garde = 0,45 cm
  for (const k of Object.keys(coins)) coins[k] += releve;
  return { heave: y + releve, heaveBrut: y, tangage: th, roulis: ph, coins, ecrasement: releve };
}

/* ───────────────────── assemblage : le cascadeur ───────────────────── */
/** def = { spline, profil, derive: {t0, montee, maintien, descente, betaMax, signe}|null, atterrissage: {t, vz}|null,
            vibration: graine|0, ralenti: amplitude du ralenti moteur (cm) après l'arrêt, susp: {...}, tSusp0 } */
export function creerCascadeur(def) {
  const etat = trajectoire({ spline: def.spline, profil: def.profil });
  const tS0 = def.tSusp0 ?? def.profil.t0;
  // vibrations de la route : 3 composantes haute fréquence, graine fixe → filtrées par la suspension (|H| ≈ 1/r² au-dessus de ωn)
  const rnd = graineur((def.vibration || 1) * 7919), vib = [];
  for (let i = 0; i < 3; i++) vib.push({ A: 0.012 + 0.012 * rnd(), w: 2 * Math.PI * (38 + 55 * rnd()), ph: rnd() * 6.283 });
  const forcage = {
    t0: tS0, atterrissage: def.atterrissage || null, vib,
    aPar: (tau) => def.profil.acc(tau),
    aLat: (tau) => etat(tau).aLat,
  };
  function pose(t, { sansSuspension = false } = {}) {
    const e = etat(t);
    const d = def.derive ? derive(t, def.derive) : { beta: 0, braquage: 0, actif: 0 };
    // braquage « de route » (suit la courbure : δ ≈ empattement × κ) + contre-braquage de dérive
    const braqueRoute = clamp(Math.atan(4.6 * e.kappa * (e.aLat >= 0 ? 1 : -1)), -0.5, 0.5);
    const delta = d.actif > 0.001 ? d.braquage : braqueRoute;
    let s = { heave: 0, tangage: 0, roulis: 0, coins: { av_g: 0, av_d: 0, ar_g: 0, ar_d: 0 }, ecrasement: 0 };
    if (!sansSuspension) s = suspension(t, def.susp || {}, forcage);
    // ralenti moteur après l'arrêt : vibration de 22 Hz de très faible amplitude (la voiture est vivante)
    const ar = e.v < 1 && def.ralenti ? def.ralenti * Math.sin(2 * Math.PI * 22 * t) : 0;
    return {
      pos: e.pos, vel: e.vel, vit: e.v, kmh: e.v * 3.6 * 64 / 100,         // échelle 1/64 : 1 cm/s film = 0,64 m/s « réel » ; ×3,6 pour des km/h
      cap: e.capVitesse + d.beta,                                          // le châssis pivote de β par rapport au vecteur vitesse
      capVitesse: e.capVitesse, pente: e.pente,
      tangage: s.tangage + e.pente * 0, roulis: s.roulis, heave: s.heave + ar,
      beta: d.beta, braquage: delta, derive: d.actif,
      dist: e.s, aPar: e.aPar, aPerp: e.aPerp, aLat: e.aLat, kappa: e.kappa,
      coins: s.coins, ecrasement: s.ecrasement,
    };
  }
  return { pose, etat, forcage };
}

/* ───────────────────── particules analytiques (positions en forme close, graine fixe) ───────────────────── */
/** Gerbe d'étincelles balistiques : p(τ) = p0 + v·τ + ½·g·τ² avec un rebond amorti sur le sol (y = 0). */
export function etincelle(p0, v, tau, { g = -980, rebond = 0.38 } = {}) {
  if (tau < 0) return null;
  let y = p0[1] + v[1] * tau + 0.5 * g * tau * tau;
  if (y < 0) {                                                         // un seul rebond, déterministe
    const tImp = (-v[1] - Math.sqrt(v[1] * v[1] - 2 * g * p0[1])) / g, vy = (v[1] + g * tImp) * -rebond, dt = tau - tImp;
    y = Math.max(0, vy * dt + 0.5 * g * dt * dt);
  }
  return [p0[0] + v[0] * tau, y, p0[2] + v[2] * tau];
}
