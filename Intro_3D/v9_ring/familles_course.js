/* COURSE DE TOKYO (V9.3) — tracé de la rue et chorégraphie de la meute, en MÈTRES « monde », sans THREE (testable sous Node).

   Tracé (abscisse curviligne s, en m) : ligne droite le long de +x jusqu'à S_V0, virage à droite de rayon RV sur l'angle AV,
   puis ligne droite. repere(s) → { x, z, th } avec avant = (cos th, sin th) dans le plan (x, z) ; latéral d > 0 = côté +n,
   n = (−sin th, cos th) (à droite du sens de marche, donc côté INTÉRIEUR du virage).

   Meute (temps interne 10,5 → 14,0 s, extrait montré film 92,6 → 96,1) : quatre voies d = ±1,55 / ±4,6 m, base 20 m/s.
     départ   TK04 en tête (voie +1,55), la Skyline TK02 roue dans roue à sa gauche (−1,55), TK01 (+4,6) et TK05 (−4,6) derrière
     virage   (≈10,85 → 12,5 s) tout le monde dérive (angle de dérive jusqu'à 16°, contre-braquage) ; TK01 double TK04 par l'intérieur
     sortie   la Skyline déborde TK04 et TK01, prend la tête ; la Pikachu Car remonte TK04 ; à 12,55 s la Skyline accélère et plonge
              dans le rift posé sur sa voie (l'arrière le franchit à T_RIFT = 14,0 s).
   Tout est fonction PURE de t (smoothsteps, polynômes) : aucune intégration pas à pas. */

export const S_V0 = 8, RV = 36, AV = 0.95, S_V1 = S_V0 + RV * AV;     // virage : début, rayon, angle (rad), fin
export const VOIES = [-4.6, -1.55, 1.55, 4.6];
export const T0 = 10.5, T_ACC = 12.55, T_RIFT = 14.0;
const V0 = 20, ACC_SKY = 13;

const sm = (u) => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k); };
const sm5 = (u) => { const k = Math.min(1, Math.max(0, u)); return k * k * k * (k * (k * 6 - 15) + 10); };
/** intégrale de sm5 : distance parcourue quand la vitesse passe de 0 à 1 selon sm5 (pour des gains de vitesse lisses) */
const ism5 = (u) => { if (u <= 0) return 0; if (u >= 1) return u - 0.5; const k = u; return k ** 6 - 3 * k ** 5 + 2.5 * k ** 4; };

export function repere(s) {
  if (s <= S_V0) return { x: s, z: 0, th: 0 };
  if (s <= S_V1) { const a = (s - S_V0) / RV; return { x: S_V0 + RV * Math.sin(a), z: RV * (1 - Math.cos(a)), th: a }; }
  const f = repere(S_V1), u = s - S_V1;
  return { x: f.x + Math.cos(AV) * u, z: f.z + Math.sin(AV) * u, th: AV };
}
/** courbure signée (1/m) au point s, lissée sur ±6 m (sert à doser la dérive) */
export function courbure(s) { return (sm((s - (S_V0 - 6)) / 12) - sm((s - (S_V1 - 6)) / 12)) / RV; }
export function point(s, d) { const r = repere(s); return { x: r.x - Math.sin(r.th) * d, z: r.z + Math.cos(r.th) * d, th: r.th }; }

/* fiches de course : s0, voie de départ, gains (surplus de vitesse lissés), changements de voie */
const FICHES = {
  TK04: { s0: 0.0, d: [[0, 1.55]], gains: [[11.4, 12.6, -4.0]] },
  TK02: { s0: -1.6, d: [[0, -1.55]], gains: [[11.7, 12.55, 6.0]], sky: true },
  TK01: { s0: -6.5, d: [[0, 4.6]], gains: [[10.6, 12.0, 12.0]] },
  TK05: { s0: -7.5, d: [[0, -4.6], [12.75, -1.55, 0.7]], gains: [[11.4, 12.9, 6.0]] },
};
const DERIVE = { TK04: 0.26, TK02: 0.28, TK01: 0.22, TK05: 0.18 };       // angle de dérive max (rad) dans le virage

/** abscisse s (m) de la voiture `code` à l'instant t */
export function abscisse(code, t) {
  const f = FICHES[code], tau = t - T0;
  let s = f.s0 + V0 * tau;
  for (const [ta, tb, dv] of f.gains) { const d = tb - ta; s += dv * d * ism5((t - ta) / d) - (t > tb ? dv * (t - tb) : 0); }
  if (f.sky && t > T_ACC) s += 0.5 * ACC_SKY * (t - T_ACC) * (t - T_ACC);
  return s;
}
/** vitesse ds/dt (m/s), dérivée analytique */
export function vitesse(code, t) {
  const f = FICHES[code];
  let v = V0;
  for (const [ta, tb, dv] of f.gains) v += dv * sm5((t - ta) / (tb - ta)) - (t > tb ? dv : 0);
  if (f.sky && t > T_ACC) v += ACC_SKY * (t - T_ACC);
  return v;
}
/** latéral d (m) et sa dérivée temporelle */
export function lateral(code, t) {
  const L = FICHES[code].d;
  let d = L[0][1], dd = 0;
  for (let i = 1; i < L.length; i++) {
    const [ta, cible, duree] = L[i], prev = L[i - 1][1], u = (t - ta) / duree;
    d += (cible - prev) * sm5(u);
    if (u > 0 && u < 1) dd += (cible - prev) * 30 * u * u * (1 - u) * (1 - u) / duree;
  }
  return { d, dd };
}
/** pose complète en mètres : position, cap (convention poser : avant = (sin cap, cos cap) en (x, z)), dérive β, distance roulée */
export function poseCourse(code, t) {
  const s = abscisse(code, t), v = vitesse(code, t), { d, dd } = lateral(code, t), p = point(s, d);
  const dirChemin = p.th + Math.atan2(dd, Math.max(1, v));                  // direction de la vitesse (th + écart latéral)
  const k = courbure(s);
  const beta = DERIVE[code] * Math.min(1, Math.abs(k) * RV) * Math.sign(k || 1) * (code === 'TK02' && t > T_ACC ? 1 - sm((t - T_ACC) / 0.4) : 1);
  const ang = dirChemin + beta;                                              // le nez pointe vers l'intérieur, l'arrière glisse dehors
  const fx = Math.cos(ang), fz = Math.sin(ang), vx = Math.cos(dirChemin), vz = Math.sin(dirChemin);
  return { x: p.x, z: p.z, cap: Math.atan2(fx, fz), capVitesse: Math.atan2(vx, vz), beta, s, d, v, dist: s + 30 };
}
export const CODES_COURSE = Object.keys(FICHES);
