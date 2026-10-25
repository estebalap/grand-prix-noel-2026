/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   PONT D'IMPORT UNIVERSEL — Intro_3D ⇄ application web (shared/, lib/, data/, logos/)

   Le même code d'Intro_3D tourne dans DEUX dispositions de dossiers :

     1. Dépôt GitHub (Claude Code, GitHub Pages)       2. PC d'Esteban (00_Lab_Vision_2.0)
        <racine du dépôt>/                                00_Lab_Vision_2.0/
          shared/  lib/  data/  logos/                      Edition_23_Decembre/3_Application/web/
          Intro_3D/src/shared_bridge.js                        shared/  lib/  data/  logos/
                                                            Intro_3D/src/shared_bridge.js

   Au chargement, ce module sonde (requête HEAD) shared/bolides3d.js dans chaque disposition candidate, retient la
   première qui répond, charge three.min.js (r128, global window.THREE) depuis cette racine, puis importe dynamiquement
   les modules de shared/ utilisés par l'intro. Tout le reste d'Intro_3D importe CE fichier, jamais un chemin en dur.

   Forcer une racine (diagnostic) :  …/animatic_v6.html?web=../  ou  window.GP_WEB_ROOT = '…/' avant les modules.
   Le module utilise un await de premier niveau : tout module qui l'importe attend que la racine, three.js et les
   modules shared/ soient prêts. Aucune écriture, aucun effet de bord hors window.THREE.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const ICI = new URL('./', import.meta.url);                       // …/Intro_3D/src/

/** Racines candidates de l'application web, de la plus probable à la moins probable. */
const CANDIDATES = [
  new URL('../../', ICI),                                         // dépôt GitHub : <racine>/
  new URL('../../Edition_23_Decembre/3_Application/web/', ICI),   // PC local : 00_Lab_Vision_2.0/Edition_23_Decembre/3_Application/web/
];

const SONDE = 'shared/bolides3d.js';

function racineForcee() {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('web') : null;
  const w = (typeof window !== 'undefined' && window.GP_WEB_ROOT) || q;
  if (!w) return null;
  return new URL(w.endsWith('/') ? w : w + '/', typeof location !== 'undefined' ? location.href : ICI);
}

async function existe(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (r.ok) return true;
    if (r.status === 405 || r.status === 501) {                   // serveur sans HEAD : on retente en GET
      const g = await fetch(url, { cache: 'no-store' });
      return g.ok;
    }
    return false;
  } catch {
    return false;
  }
}

/* Indice SANS requête en échec : sonder d'abord une mauvaise disposition produirait un 404, que Chrome inscrit en
   erreur console — or les scripts de capture (outils/capturer_animatic_v6.py) s'arrêtent à la moindre erreur.
   On lit donc le dossier parent d'Intro_3D, qui répond 200 dans les deux cas : sur le PC, py -m http.server liste
   00_Lab_Vision_2.0 (lien « Edition_23_Decembre/ ») ; dans le dépôt, il sert index.html (page d'accueil du site). */
async function ordreProbable() {
  try {
    const r = await fetch(new URL('../../', ICI), { cache: 'no-store' });
    if (r.ok && /href="Edition_23_Decembre\/"/.test(await r.text())) return [CANDIDATES[1], CANDIDATES[0]];
  } catch { /* indice indisponible : ordre par défaut */ }
  return CANDIDATES;
}

async function trouverRacine() {
  const forcee = racineForcee();
  if (forcee) {
    if (await existe(new URL(SONDE, forcee))) return forcee;
    throw new Error(`shared_bridge : racine forcée invalide (${forcee.href}${SONDE} introuvable)`);
  }
  for (const c of await ordreProbable()) if (await existe(new URL(SONDE, c))) return c;
  throw new Error('shared_bridge : application web introuvable. Essayé : '
    + CANDIDATES.map((c) => new URL(SONDE, c).href).join(' | ')
    + ' — servir la racine du dépôt (ou 00_Lab_Vision_2.0 sur le PC) avec un serveur HTTP, pas en file://');
}

function chargerScript(url) {
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = url; s.async = false;
    s.onload = () => ok();
    s.onerror = () => ko(new Error('shared_bridge : script introuvable ' + url));
    document.head.appendChild(s);
  });
}

/** Racine de l'application web (URL absolue, finit par « / »). */
export const WEB = await trouverRacine();

/** URL absolue d'un fichier de l'application web : urlWeb('data/teams.json'), urlWeb('logos/01.jpg')… */
export const urlWeb = (chemin) => new URL(String(chemin).replace(/^\/+/, ''), WEB).href;

/** Disposition détectée : 'depot' (GitHub / Claude Code) ou 'local' (PC d'Esteban) ou 'forcee'. */
export const DISPOSITION = racineForcee() ? 'forcee' : (WEB.href === CANDIDATES[0].href ? 'depot' : 'local');

// three.js r128 (global) : chargé une seule fois, avant tout module shared/ qui pourrait lire window.THREE.
if (typeof window !== 'undefined' && !window.THREE) await chargerScript(urlWeb('lib/three.min.js'));

/** Import dynamique d'un module de shared/ : await importerShared('decors3d.js'). */
export const importerShared = (nom) => import(urlWeb('shared/' + nom));

// ── Modules utilisés par l'intro : importés d'office (ordre stable, un seul chargement grâce au cache des modules) ──
export const bolides3d = await importerShared('bolides3d.js');
export const conceptCars = await importerShared('concept_cars.js');

export const { construireBolide3D, codesSurMesure } = bolides3d;
export const { buildConceptCar, conceptInfo } = conceptCars;

// ── Autres modules de shared/ : chargés à la demande (évite d'exécuter des modules dont l'intro n'a pas besoin) ──
export const chargerDecors3d = () => importerShared('decors3d.js');        // 19 mondes 3D (importe decors_v5 + ambiances_v6)
export const chargerDecorsV5 = () => importerShared('decors_v5.js');       // décors uniques v5
export const chargerAmbiancesV6 = () => importerShared('ambiances_v6.js'); // 60+ ambiances (lumière / brouillard / ciel)
export const chargerRoulage = () => importerShared('roulage.js');          // physique de suspension / roulis
export const chargerArchetypes = () => importerShared('archetypes.js');    // shaders et archétypes de reveal
export const chargerOuverture = () => importerShared('ouverture.js');      // piste Rainbow Road 5 voies

if (typeof window !== 'undefined') {
  window.GP_PONT = { WEB: WEB.href, DISPOSITION };
  console.info(`shared_bridge : application web = ${WEB.href} (${DISPOSITION})`);
}
