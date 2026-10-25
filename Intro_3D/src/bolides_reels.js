/* BOLIDES RÉELS de l'intro v5 : les vrais modèles sculptés du projet (shared/bolides3d.js + m3d/) à la place des maquettes.
   Le film garde son repère : avant = +z local, sol y = 0, 1 unité = 1 cm. Les modèles m3d ont l'avant en +x : chaque bolide est
   donc posé dans une enveloppe tournée de −π/2 autour de y. Les roues sont pilotées en ABSOLU (distance parcourue / rayon) :
   aucune accumulation d'une image à l'autre, la capture image par image reste une fonction pure du temps.

   chargerBolides(THREE, envMap) → { creer(code), EMBLEMES, MEUTE, F1, SECRETS }
     creer(code) → Promise<THREE.Group> avec userData = { reel, R, L, roues: [] } (compatible avec poser() du film)

   Le choix des voitures est une TABLE éditable (EMBLEMES) : un code par écurie, dans l'ordre de teams.json.
   ⚠ Ces codes appartiennent au pool des caisses mystère : les montrer dans l'intro dévoile ces modèles avant le draft.
   Pour garder la surprise, remplacer un code par un modèle hors pool dès qu'il existe (emblemes_ecuries.js prévu). */
import { construireBolide3D } from './shared_bridge.js';   // pont universel : dépôt GitHub ou PC local

/** Voiture-emblème de chaque écurie (ordre de teams.json, 1 → 15). */
export const EMBLEMES = [
  'U04',  // 1  Petite Mimine Racing — pick-up 4×4 de battue (country)
  'FR04', // 2  Twingo Oasis V16 — Renault R5 Turbo (la citadine Renault la plus folle)
  'H05',  // 3  Optic-Breuillet — petit fourgon floqué
  'J04',  // 4  Tata Freddy Motorsport — van rétro (Balatro, platine vinyle)
  'H09',  // 5  Super Mario Pression — pick-up de dépanneur
  'J09',  // 6  Scuderia Symphonie E-Tech — électrique rétro-moderne
  'N05',  // 7  Yaris 2 Invincible — Toyota
  'TK03', // 8  A4 Oil Leaking — berline allemande des années 80
  'U05',  // 9  Titou Wyvern SRT — Dodge (SRT)
  'N11',  // 10 Doom Slayer Issue GP — blindé riveté
  'P04',  // 11 Milo's Princess Vroom Vroom — carrosse rose
  'N08',  // 12 Bob's Bizarre Racing — coupé néo-rétro aux lignes cassées
  'J02',  // 13 Jojo la Sirène Veloce — AE86 (Tokyo Drift)
  'TK02', // 14 Ninja-Nissan Street Racing — Nissan Skyline R30
  'N02',  // 15 Princess Blooming Speed — petite voiture ronde
];
/** La meute des 5 voies (citadines sur la piste arc-en-ciel). */
export const MEUTE = ['J01', 'E02', 'U02', 'FR02', 'N03'];
/** Les 5 F1 de l'univers Formule 1. */
export const F1 = ['F01', 'F02', 'F03', 'F04', 'F05'];
/** Batmobile (Gotham), épave (Apocalypse), silhouette du teaser (caisse 5, dans le noir). */
export const SECRETS = { batmobile: 'B16', epave: 'N12', silhouette: 'TK06' };

export function chargerBolides(THREE, envMap = null) {
  const axe = new THREE.Vector3(0, 1, 0);
  async function creer(code, { noircir = false } = {}) {
    const b = await construireBolide3D(code, { THREE, envMap });
    const env = new THREE.Group(); env.name = 'reel-' + code;
    b.groupe.rotation.y = -Math.PI / 2;                      // avant +x (m3d) → +z (film)
    env.add(b.groupe);
    b.groupe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    if (noircir) {                                          // silhouette : tout en noir mat, seul le liseré du film la trahit
      const noir = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9, metalness: 0 });
      b.groupe.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(() => noir) : noir; });
    }
    b.eclairer(1, 0); b.maj(0, 0, 0);
    const R = b.roues.length ? b.roues.reduce((s, w) => s + w.r, 0) / b.roues.length : 1;
    env.userData = { reel: b, R, L: b.longueur, roues: [] };
    return env;
  }
  return { creer, EMBLEMES, MEUTE, F1, SECRETS, axe };
}

/** Pose des roues d'un bolide réel : rotation ABSOLUE = −distance / rayon (sens m3d : rotation.z négative = marche avant). */
export function rouesReelles(v, distance) {
  const b = v.userData.reel; if (!b) return false;
  for (const w of b.roues) w.tourne.rotation.z = -distance / w.r;
  return true;
}
