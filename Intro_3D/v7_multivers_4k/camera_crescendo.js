/* RÉALISATION CAMÉRA V7 — découpage en 6 actes et ACCELERANDO des 15 écuries (3 vagues).

   construireTimeline(plan)  → créneaux [debut, impact, fin] des 15 écuries, déduits de data/plan_v7.json (même calcul que
                               sound_v7_crescendo.py : la source est unique) + etat(t) : acte, écurie, phase A/B, avancement
   camerasEcuries(...)       → caméra de la phase A (monde natif : poursuite d'action, FOV 45° → 65° vers le portail) et de la
                               phase B (Ring : téléobjectif 28°–32°, dolly hold amorti à −85 % de vitesse, horizon 0°, tiers gauche)
   chemin(cles, t)           → interpolation C¹ de clés caméra (utilisée par les actes I et III–VI)
   Tout est fonction pure de t : aucune horloge, aucun alea non semé. */
import { clamp, lerp, smoother, graineur } from './physique_cgi.js';
import { angleEcurie, RING } from './mondes_et_portails.js';

/* ───────────────────── timeline ───────────────────── */
export function construireTimeline(plan) {
  const actes = plan.actes.map((a) => ({ ...a })), ecuries = [];
  const II = actes.find((a) => a.id === 'II');
  let t = II.debut;
  for (const v of plan.vagues) for (const id of v.ecuries) {
    const debut = t, fin = debut + v.duree_plan, impact = debut + plan.fraction_monde * v.duree_plan;
    ecuries.push({ k: id - 1, id, vague: v.id, debut, impact, fin, dureeA: impact - debut, dureeB: fin - impact });
    t = fin;
  }
  const finEcuries = t;
  if (Math.abs(finEcuries + plan.fin_acte_II_ring_complet - II.fin) > 1e-6) throw new Error(`timeline : l'acte II ne tombe pas à ${II.fin} (écuries finies à ${finEcuries})`);
  const acteDe = (x) => actes.find((a) => x >= a.debut && x < a.fin) || actes[actes.length - 1];
  const tempo = plan.tempo;
  const bpmA = (x) => { if (x <= tempo[0][0]) return tempo[0][1]; for (let i = 1; i < tempo.length; i++) if (x <= tempo[i][0]) return lerp(tempo[i - 1][1], tempo[i][1], (x - tempo[i - 1][0]) / (tempo[i][0] - tempo[i - 1][0])); return tempo[tempo.length - 1][1]; };
  // phase du pouls = intégrale du tempo (trapèzes par pas de 1/120 s : fonction pure de t)
  const phasePouls = (x) => { let ph = 0; const h = 1 / 120; const n = Math.floor(x / h); for (let i = 0; i < n; i++) ph += bpmA((i + 0.5) * h) / 60 * h; ph += bpmA(x) / 60 * (x - n * h); return ph; };
  return {
    duree: plan.duree, fps: plan.fps, actes, ecuries, finEcuries, plan, bpmA, phasePouls,
    acteDe,
    /** pouls 0–1 : pic net sur chaque temps (décroissance exponentielle) */
    pouls(x) { const f = phasePouls(x) % 1; return Math.exp(-f * 7.5); },
    etat(x) {
      const acte = acteDe(x);
      const slot = ecuries.find((e) => x >= e.debut && x < e.fin) || null;
      const arrives = ecuries.filter((e) => x >= e.impact).length;
      let phase = null, u = 0, uSlot = 0;
      if (slot) { uSlot = (x - slot.debut) / (slot.fin - slot.debut); if (x < slot.impact) { phase = 'A'; u = (x - slot.debut) / slot.dureeA; } else { phase = 'B'; u = (x - slot.impact) / slot.dureeB; } }
      const univers = acte.id === 'IV' ? (plan.univers_boss.find((b) => x >= b.debut && x < b.fin) || plan.univers_boss[plan.univers_boss.length - 1]) : null;
      return { t: x, acte, slot, phase, u, uSlot, arrives, univers, vague: slot ? slot.vague : (x >= finEcuries ? 3 : 0), pouls: this.pouls(x), bpm: bpmA(x) };
    },
  };
}

/* ───────────────────── interpolation de clés caméra ───────────────────── */
/** cles = [{ t, p:[x,y,z], c:[x,y,z], fov, roll }] ; interpolation smootherstep par segment (vitesse nulle aux clés : « mouvement lourd ») ou linéaire si lin. */
export function chemin(cles, t, lin = false) {
  if (t <= cles[0].t) return { ...cles[0], roll: cles[0].roll || 0 };
  const n = cles.length;
  if (t >= cles[n - 1].t) return { ...cles[n - 1], roll: cles[n - 1].roll || 0 };
  let i = 0; while (i < n - 2 && t > cles[i + 1].t) i++;
  const a = cles[i], b = cles[i + 1], u = (t - a.t) / (b.t - a.t), k = lin ? u : smoother(u);
  const m = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
  return { p: m(a.p, b.p), c: m(a.c, b.c), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll || 0, b.roll || 0, k) };
}

/** tremblement de caméra déterministe (somme de sinusoïdes incommensurables) : amplitude en cm */
export function tremblement(t, amp, graine = 1) {
  const r = graineur(graine * 31), f = [0, 1, 2].map(() => 5 + r() * 9), p = [0, 1, 2].map(() => r() * 6.28);
  return [amp * Math.sin(t * f[0] * 6.28 + p[0]), amp * Math.sin(t * f[1] * 6.28 + p[1]) * 0.8, amp * Math.sin(t * f[2] * 6.28 + p[2])];
}

const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const avant = (cap) => [Math.sin(cap), 0, Math.cos(cap)];
const gauche = (cap) => [Math.cos(cap), 0, -Math.sin(cap)];

/* ───────────────────── caméras des écuries ───────────────────── */
export const FOV_ACTION = [45, 65];            // ouverture du champ en fonçant dans le portail
export const FOV_TELE = [32, 28];              // téléobjectif du dolly hold (degrés verticaux)

/** Phase A : poursuite d'action dans le monde natif. 6 plans-types qui tournent d'une écurie à l'autre. */
export function cameraMonde(sc, t) {
  const slot = sc.slot, u = clamp((t - slot.debut) / sc.TA), hA = sc.A.pose(t, { sansSuspension: true }), h = hA.pos;
  const F = avant(hA.capVitesse), L = gauche(hA.capVitesse), dir = sc.dir, type = sc.k % 6;
  let p, c, fov = 46;
  const lag = (d) => { const hh = sc.A.pose(t - d, { sansSuspension: true }).pos; return hh; };      // la caméra suit avec un retard (inertie de grue)
  switch (type) {
    case 0: { const g = lag(0.25); p = [g[0] - dir * 6, 4.2 + 1.2 * u, 24 - 6 * u]; c = add3(h, F, 7 + 10 * u); c[1] = 1.8; fov = 40; break; }                    // travelling latéral, téléobjectif
    case 1: { p = add3(add3(h, F, 34 - 26 * smoother(u)), [0, 0, 1], 8); p[1] = 1.5 + 2.2 * u; c = add3(h, F, 1.5); c[1] = 1.6; fov = 42; break; }                   // contre-champ bas : la voiture fonce sur l'objectif
    case 2: { p = [h[0] - dir * 16, 20 - 8 * u, 22]; c = add3(h, F, 9); c[1] = 1; fov = 44; break; }                                                                     // grue haute
    case 3: { const g = lag(0.18); p = add3(add3(g, F, -17 + 5 * u), L, 3); p[1] = 4.8 - 1.8 * u; c = add3(h, F, 16); c[1] = 3 + 5 * u; fov = 50; break; }                // poursuite arrière : le portail grandit devant
    case 4: { p = add3(add3(h, L, -6.5), F, 4 - 8 * u); p[1] = 0.9 + 0.4 * u; c = add3(h, F, 1.2); c[1] = 1.1; fov = 30; break; }                                         // roue : macro rase-bitume
    default: { const a = -0.9 + u * 2.1 + (dir > 0 ? 0 : Math.PI), r = 21; p = [h[0] + Math.cos(a) * r * 0.9, 3.4 + 2 * u, h[2] + Math.sin(a) * r * 0.9 + 6]; c = add3(h, F, 4); c[1] = 1.7; fov = 38; break; }  // orbite
  }
  // FOV qui s'ouvre de 45° à 65° en fonçant dans le portail (dernier tiers de la phase A)
  const ouvre = smoother((u - 0.62) / 0.38);
  fov = lerp(fov, Math.max(fov, FOV_ACTION[1]), ouvre);
  const tr = tremblement(t, 0.05 + 0.12 * ouvre, sc.k + 1); p = add3(p, tr);
  return { p, c, fov, roll: 0.025 * Math.sin(u * 3.1 + sc.k) + 0.05 * ouvre * (sc.k % 2 ? 1 : -1) };
}

/** Phase B : arrivée en drift lourd dans le Ring. Téléobjectif, dolly hold amorti, horizon à 0°, voiture au tiers gauche. */
export function cameraRing(sc, t, ratio = 16 / 9) {
  const slot = sc.slot, th = sc.emplacement.theta, TB = slot.fin - slot.impact;
  const tl = t - slot.impact, u = clamp(tl / TB);
  const hB = sc.B.pose(t, { sansSuspension: true }).pos;
  // la caméra se tient près du centre, côté intérieur, et glisse très lentement (−85 % de vitesse après le swoop)
  const vite = smoother(clamp(tl / 0.55)), lent = 0.15 * tl;
  const rc = RING.RS - 30 + 3 * vite, a0 = th + 0.30;
  const p = [Math.cos(a0) * rc, 3.1 + 0.6 * Math.min(1, lent), Math.sin(a0) * rc];
  const dx = Math.cos(a0) * 0 - p[0], dist = Math.hypot(hB[0] - p[0], hB[2] - p[2]);
  const fov = lerp(FOV_TELE[0] + 5, FOV_TELE[1] + 2, smoother(u * 1.2));
  // cible : la voiture, décalée pour la placer au tiers gauche (espace négatif propre à droite pour le HUD)
  const f = [hB[0] - p[0], 0, hB[2] - p[2]], nf = Math.hypot(f[0], f[2]) || 1, droite = [-f[2] / nf, 0, f[0] / nf];
  const demiLarg = dist * Math.tan(fov * Math.PI / 360) * ratio, decal = 0.30 * demiLarg;
  const c = [hB[0] + droite[0] * decal, 1.8, hB[2] + droite[2] * decal];
  return { p, c, fov, roll: 0 };
}

/** Caméra d'une écurie à l'instant t (phase déterminée par le créneau). */
export function cameraEcurie(sc, t, ratio) { return t < sc.slot.impact ? cameraMonde(sc, t) : cameraRing(sc, t, ratio); }

/** Courbe d'intensité de l'impact (flash, onde, flou radial, coup de FOV) : pics exponentiels centrés sur l'impact exact de chaque écurie. */
export function impactEcurie(sc, t) {
  const d = t - sc.slot.impact;
  const avantI = d < 0 ? Math.exp(d * 9) : 0;                        // montée : 0,25 s de tension
  const apres = d >= 0 ? Math.exp(-d * 6.5) : 0;
  const plein = Math.exp(-Math.pow(d / 0.045, 2));                   // flash très bref au franchissement
  return { montee: avantI, retombee: apres, flash: plein, onde: d >= 0 ? clamp(d / 0.55) : 0, ondeForce: d >= 0 && d < 0.55 ? 1 - d / 0.55 : 0, dechirure: clamp(1 - Math.abs(d) / 0.16) };
}
