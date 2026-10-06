/* Performances — UN SEUL ordonnanceur d'images, des budgets de pixels et un régulateur automatique.

   Pourquoi : chaque page faisait tourner 2 à 4 boucles requestAnimationFrame indépendantes (atmosphère 2D plein écran,
   scène WebGL, confettis…), chacune dessinant à la définition native de l'écran (DPR 2 à 3 sur téléphone, 4K sur la TV),
   avec ombres douces, bloom en 5 niveaux et matériaux à transmission. Le coût de remplissage explosait (13 Mpx par image
   sur une TV 4K) et les boucles se disputaient le même budget de 16,7 ms.

   Ce module :
   1. détecte un PALIER d'appareil (high / medium / low ; forçable : ?q=low|medium|high) et le publie sur
      <html data-perf="…"> pour que le CSS allège les effets (flous d'arrière-plan, halos animés) ;
   2. fixe des BUDGETS : pixels maximum par canvas 3D et 2D (le DPR effectif en découle), ombres, bloom, MSAA,
      transmission, cadence de l'atmosphère ;
   3. pilote TOUTES les animations depuis UNE boucle requestAnimationFrame (boucle(nom, fn, { fps })), avec cadence
      propre à chaque tâche, pause quand l'onglet est caché, et priorité au premier plan : quand une scène 3D est
      active, l'atmosphère 2D de fond passe à 30 images/s ;
   4. RÉGULE en continu : si plus de 10 % des images sont ratées pendant 2 s, il descend d'un cran (niveau 1 à 4) et
      prévient les scènes (onNiveau) : atmosphère à 30 puis 20 i/s, flous coupés, définition 3D réduite, bloom puis
      ombres coupés. Il ne remonte jamais seul (pas d'oscillation pendant la soirée).
   5. ?fps=1 affiche un compteur (images/s, p95, palier, niveau) dans le coin de l'écran. */

const Q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } })();
const CAPTURE = Q.get('capture') === '1';
const reduit = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/** Palier de l'appareil : 'high' (PC / TV), 'medium' (tablette, petit écran, mode éco), 'low' (téléphone modeste). */
export function detecterPalier() {
  const f = Q.get('q');
  if (f === 'low' || f === 'medium' || f === 'high') return f;
  if (CAPTURE) return 'high';
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const ecran = typeof screen !== 'undefined' ? screen : { width: 1920, height: 1080 };
  const petit = Math.min(ecran.width || 1920, ecran.height || 1080) < 820;
  const coeurs = nav.hardwareConcurrency || 4;
  const memoire = nav.deviceMemory || 4;
  const eco = !!(nav.connection && nav.connection.saveData);
  if (coarse && (coeurs <= 4 || memoire <= 3)) return 'low';
  if (coarse || petit || eco) return 'medium';
  return 'high';
}

/* Budgets par palier. px3d / px2d : pixels du tampon de rendu (DPR compris) à ne pas dépasser. 2,1 Mpx = 1080p. */
export const BUDGETS = {
  high:   { px3d: 2.1e6, dpr3d: 2,    px2d: 2.1e6, dpr2d: 1,    fxFps: 60, ombres: 1024, ombreDouce: true,  bloom: 5, msaa: 4, transmission: true,  particules: 1 },
  medium: { px3d: 1.2e6, dpr3d: 1.5,  px2d: 0.9e6, dpr2d: 1,    fxFps: 30, ombres: 512,  ombreDouce: false, bloom: 3, msaa: 2, transmission: false, particules: 0.6 },
  low:    { px3d: 0.6e6, dpr3d: 1.25, px2d: 0.45e6, dpr2d: 0.75, fxFps: 30, ombres: 0,    ombreDouce: false, bloom: 0, msaa: 0, transmission: false, particules: 0.35 },
};

export const palier = detecterPalier();
const B = BUDGETS[palier];
let niveau = 0;                                  // 0 = budget nominal ; 1..4 = dégradations du régulateur
const abonnes = new Set();

/** Budget courant (palier + dégradations du régulateur). */
export function budget() {
  const b = { ...B };
  if (niveau >= 1) { b.fxFps = Math.min(b.fxFps, 30); b.flous = false; }
  if (niveau >= 2) { b.px3d *= 0.65; b.bloom = Math.min(b.bloom, 2); b.transmission = false; }
  if (niveau >= 3) { b.ombres = 0; b.bloom = 0; b.fxFps = 20; b.particules *= 0.6; b.px2d *= 0.6; }
  if (niveau >= 4) { b.px3d = Math.min(b.px3d, 0.5e6); b.fxFps = 15; }
  if (reduit()) { b.fxFps = Math.min(b.fxFps, 20); b.particules *= 0.5; }
  return b;
}
export const niveauActuel = () => niveau;
/** fn(niveau, budget) est appelée à chaque dégradation (et une fois tout de suite). Renvoie une fonction de désabonnement. */
export function onNiveau(fn) { abonnes.add(fn); try { fn(niveau, budget()); } catch (e) { console.error(e); } return () => abonnes.delete(fn); }

/** DPR à appliquer à un canvas de w × h pixels CSS pour respecter le budget de pixels du palier. */
export function dprPour(w, h, genre = '3d') {
  const b = budget();
  const natif = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const plafond = genre === '2d' ? b.dpr2d : b.dpr3d;
  const px = genre === '2d' ? b.px2d : b.px3d;
  const parBudget = Math.sqrt(px / Math.max(1, w * h));
  return Math.max(0.5, Math.min(natif, plafond, parBudget));
}

/* -------------------------------------------------------------------- ordonnanceur unique */
const taches = new Map();           // nom -> { fn, fps, dernier, premierPlan, actif }
let rafId = 0, precedent = 0;
const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(window) : (f) => setTimeout(() => f(performance.now()), 16);

function cadence(t) {
  if (t.premierPlan) return t.fps;
  // l'atmosphère de fond se fait discrète quand une scène 3D occupe le premier plan
  const pp = [...taches.values()].some((x) => x.premierPlan && x.actif);
  return pp ? Math.min(t.fps, 30) : t.fps;
}

function image(now) {
  rafId = raf(image);
  const dt = precedent ? now - precedent : 16.7;
  precedent = now;
  if (typeof document !== 'undefined' && document.hidden) return;
  mesure(dt);
  for (const t of taches.values()) {
    if (!t.actif) continue;
    const f = cadence(t);
    const periode = 1000 / f;
    // tolérance de 2 ms : à 60 Hz on ne saute aucune image ; sur un écran 120 Hz on dessine une image sur deux
    if (f < 120 && now - t.dernier < periode - 2) continue;
    const pas = t.dernier ? Math.min(100, now - t.dernier) : 16.7;
    t.dernier = now;
    try { t.fn(now, pas); } catch (e) { console.error('[perf] tâche « ' + t.nom + ' » :', e); }
  }
}

/**
 * Inscrit une animation dans la boucle unique.
 *   boucle('atmosphere', (now, dtMs) => …, { fps: 60 })
 *   boucle('pantheon', rendre, { fps: 60, premierPlan: true })   // scène 3D principale
 * Renvoie { arreter(), pause(bool), set fps(n) }.
 */
export function boucle(nom, fn, { fps = 60, premierPlan = false } = {}) {
  const t = { nom, fn, fps, premierPlan, actif: true, dernier: 0 };
  taches.set(nom, t);
  if (!rafId) rafId = raf(image);
  return {
    arreter() { taches.delete(nom); },
    pause(v) { t.actif = !v; if (!v) t.dernier = 0; },
    set fps(v) { t.fps = v; },
    get fps() { return t.fps; },
  };
}

/* -------------------------------------------------------------------- régulateur */
const fen = [];                     // intervalles des 2 dernières secondes
let fenDebut = 0, periodeEcran = 16.7;
function mesure(dt) {
  if (dt <= 0 || dt > 1000) return;
  fen.push(dt);
  if (!fenDebut) fenDebut = performance.now();
  if (performance.now() - fenDebut < 2000) return;
  const s = fen.slice().sort((a, b) => a - b);
  periodeEcran = Math.max(6.9, Math.min(17, s[Math.floor(s.length * 0.1)]));     // 60, 90, 120 ou 144 Hz
  const seuil = Math.max(20, periodeEcran * 1.6);
  const ratees = fen.filter((x) => x > seuil).length / fen.length;
  stats.fps = Math.round(1000 * fen.length / fen.reduce((a, b) => a + b, 0));
  stats.p95 = Math.round(s[Math.floor(s.length * 0.95)] * 10) / 10;
  stats.ratees = Math.round(ratees * 100);
  fen.length = 0; fenDebut = 0;
  if (!CAPTURE && !Q.get('q') && ratees > 0.1 && niveau < 4) degrader();
  hud();
}
export const stats = { fps: 0, p95: 0, ratees: 0 };

export function degrader() {
  niveau++;
  appliquerDataset();
  const b = budget();
  for (const f of abonnes) { try { f(niveau, b); } catch (e) { console.error(e); } }
}

function appliquerDataset() {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  // le CSS lit data-perf : « high » garde les verres dépolis, « medium » / « low » les remplacent par des aplats
  const vis = palier === 'high' && niveau >= 1 ? 'medium' : palier === 'medium' && niveau >= 3 ? 'low' : palier;
  r.dataset.perf = vis;
  r.dataset.perfNiveau = String(niveau);
}
appliquerDataset();

let hudEl = null;
function hud() {
  if (Q.get('fps') !== '1' || typeof document === 'undefined') return;
  if (!hudEl) {
    hudEl = document.createElement('div');
    hudEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;font:600 12px/1.3 ui-monospace,monospace;color:#9ff;background:rgba(0,0,0,.65);padding:6px 9px;border-radius:8px;pointer-events:none';
    document.body.appendChild(hudEl);
  }
  hudEl.textContent = `${stats.fps} i/s · p95 ${stats.p95} ms · ratées ${stats.ratees} % · ${palier} · niveau ${niveau} · ${taches.size} tâches`;
}

/* -------------------------------------------------------------------- Three.js : réglages communs */
/** Applique DPR, taille et ombres d'un renderer selon le budget courant. À rappeler au redimensionnement. */
export function reglerRenderer(THREE, renderer, w, h) {
  const b = budget();
  renderer.setPixelRatio(dprPour(w, h, '3d'));
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = b.ombres > 0;
  renderer.shadowMap.type = b.ombreDouce ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
}
/** Taille des cartes d'ombre selon le budget (0 = pas d'ombre). */
export const tailleOmbre = (max = 2048) => Math.min(max, budget().ombres);
