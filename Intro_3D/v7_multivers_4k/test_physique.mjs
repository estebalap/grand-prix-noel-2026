// Test Node de physique_cgi.js : déterminisme, dérive β ∈ [14°,34°], contre-braquage −0,85β, a⟂ = κv², suspension amortie.
import * as P from './physique_cgi.js';
const ok = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(2); } console.log('ok :', m); };
const spline = P.splineCR([[0, 0, 0], [40, 0, 30], [80, 0, 40], [120, 0, 10], [130, 0, -30]]);
const profil = P.profilVitesse([[0, 200], [1.0, 200], [2.0, 20], [2.4, 0]]);
const def = { spline, profil, derive: { t0: 0.1, montee: 0.16, maintien: 0.8, descente: 0.7, betaMax: 28 * P.DEG, signe: 1 },
  atterrissage: { t: 0.1, vz: 30 }, vibration: 3, tSusp0: 0, ralenti: 0.01 };
const c = P.creerCascadeur(def);
const a = c.pose(0.6), b = c.pose(0.6);
ok(JSON.stringify(a) === JSON.stringify(b), 'pose(t) déterministe (deux appels identiques)');
const c2 = P.creerCascadeur(def); c2.pose(1.7); ok(JSON.stringify(c2.pose(0.6)) === JSON.stringify(a), 'pas de dépendance à l\'historique (saut en arrière)');
ok(Math.abs(a.beta) >= 14 * P.DEG && Math.abs(a.beta) <= 34 * P.DEG * 1.06, `β en tenue = ${(a.beta / P.DEG).toFixed(1)}° dans [14°, 34°]`);
ok(Math.abs(a.braquage + 0.85 * a.beta) < 1e-9 && a.braquage * a.beta < 0, 'contre-braquage δ = −0,85·β');
const e = c.etat(0.6); ok(Math.abs(e.aPerp - e.kappa * e.v * e.v) < 1e-9, 'a⟂ = κ·v²');
ok(Math.abs(Math.hypot(...e.vel) - e.v) < 1e-9, '|v(t)| = vitesse du profil');
const land = c.pose(0.1 + 0.12);
ok(land.ecrasement > 0 || land.heave !== 0, 'écrasement à la réception');
const f = c.pose(1.5); ok(f.tangage > 0.001, `plongée au freinage (tangage ${f.tangage.toFixed(3)} > 0)`);
const bo = P.creerCascadeur({ ...def, atterrissage: null, profil: P.profilVitesse([[0, 40], [0.6, 260], [2, 260]]) }).pose(0.45); ok(bo.tangage < 0, 'cabrage (tangage < 0) pendant le boost');
const sRoul = P.creerCascadeur({ spline: P.splineCR([[0,0,0],[30,0,30],[0,0,60]]), profil: P.profilVitesse([[0,150],[2,150]]), tSusp0: 0 }).pose(0.7);
ok(Math.abs(sRoul.roulis) > 0.005, 'roulis actif en virage');
const vs = []; for (let t = 0.1; t < 1.0; t += 0.01) vs.push(c.pose(t).heave); ok(vs.every(Number.isFinite), 'pas de NaN');
// suspension : décroissance de l'oscillation (ζ = 0,65)
const amp = (t) => Math.abs(P.suspension(t, {}, { t0: 0, atterrissage: { t: 0, vz: 30 }, aPar: () => 0, aLat: () => 0, vib: [] }).heaveBrut);
let m1 = 0, m2 = 0; for (let t = 0; t < 0.4; t += 0.002) m1 = Math.max(m1, amp(t)); for (let t = 0.8; t < 1.2; t += 0.002) m2 = Math.max(m2, amp(t));
ok(m2 < m1 * 0.2, `oscillation amortie (${m1.toFixed(3)} → ${m2.toFixed(4)})`);
console.log('PHYSIQUE OK');
