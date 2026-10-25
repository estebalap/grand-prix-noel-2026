/* BOLIDES RÉELS de l'intro V6 « L'Hybride Ultime ».
   1. Les 15 ÉCURIES roulent dans leurs vrais CONCEPT-CARS du Showroom (shared/concept_cars.js → buildConceptCar(1..15)) :
      hors du pool des caisses mystère, donc AUCUN divulgâchage du draft (défaut v5 : 15 bolides tirés du pool).
   2. Tout le reste (meute des 5 voies, 5 F1, Batmobile, Épave N12, silhouette du teaser, PARC FERMÉ) utilise les modèles
      m3d sculptés à jour (shared/bolides3d.js + bolides3d_modeles.js → v9_epave, v8_a/b/c, v5_*, groupes 1-10).
      Plus aucune boîte grise « voiture('citadine') » : le parc fermé montre de vrais bolides, tous différents.

   Repère du film : avant = +z local, sol y = 0, 1 unité = 1 cm.
     - m3d          : avant +x            → enveloppe tournée de −π/2 autour de y (comme en v5) ;
     - concept-car  : avant +x, sol y = 0, groupe interne à l'échelle K = 0,62 (≈ 3,0 unités de long)
                      → enveloppe tournée de −π/2 et mise à l'échelle ×2,55 (≈ 7,6 cm ; ≈ 15 cm pour la dépanneuse
                        de l'écurie 8 qui remorque l'A4 en panne).
   Tout est piloté en ABSOLU (fonction pure du temps) : rotation des roues = −distance / rayon, animations du concept-car
   (flammes, gyrophares, goutte d'huile, kanjis ゴゴゴ…) par root.userData.tick(t) — jamais d'accumulation d'image en image.

   chargerBolides(THREE, envMap) → { creer(code, opts), creerConceptShowroom(teamId), codesParc(n), MEUTE, F1, SECRETS, conceptInfo }
   rouesReelles(v, distance) → true si v est un bolide réel (m3d ou concept) dont les roues ont été posées
   animerConcept(v, t)      → anime un concept-car (fonction pure de t) */
// pont universel (dépôt GitHub ou PC local) : voir src/shared_bridge.js
import { construireBolide3D, codesSurMesure, buildConceptCar, conceptInfo } from './shared_bridge.js';

/** La meute des 5 voies (citadines sur la piste arc-en-ciel). */
export const MEUTE = ['J01', 'E02', 'U02', 'FR02', 'N03'];
/** Les 5 F1 de l'univers Formule 1. */
export const F1 = ['F01', 'F02', 'F03', 'F04', 'F05'];
/** Batmobile (Gotham), épave (Apocalypse, v9_epave N12), silhouette du teaser (caisse 5, dans le noir). */
export const SECRETS = { batmobile: 'B16', epave: 'N12', silhouette: 'TK06' };
/** Échelle concept-car → film (cahier des charges V6) et longueur visée d'un concept-car seul. */
export const ECHELLE_CONCEPT = 2.55;
const K_SHOWROOM = 0.62;

export { conceptInfo };

export function chargerBolides(THREE, envMap = null) {
  async function creer(code, { noircir = false } = {}) {
    const b = await construireBolide3D(code, { THREE, envMap });
    const env = new THREE.Group(); env.name = 'reel-' + code;
    b.groupe.rotation.y = -Math.PI / 2;                      // avant +x (m3d) → +z (film)
    env.add(b.groupe);
    b.groupe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    if (noircir) {
      const noir = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9, metalness: 0 });
      b.groupe.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(() => noir) : noir; });
    }
    b.eclairer(1, 0); b.maj(0, 0, 0);
    const R = b.roues.length ? b.roues.reduce((s, w) => s + w.r, 0) / b.roues.length : 1;
    env.userData = { reel: b, R, L: b.longueur, roues: [], code, type: 'm3d' };
    return env;
  }

  /** Concept-car du Showroom de l'écurie teamId (1 → 15), dans le repère du film. */
  function creerConceptShowroom(teamId) {
    const root = buildConceptCar(teamId, { quality: 'high' });
    const env = new THREE.Group(); env.name = 'concept-' + teamId;
    root.rotation.y = -Math.PI / 2; root.scale.setScalar(ECHELLE_CONCEPT); env.add(root);
    root.updateMatrixWorld(true);
    // roues : groupes construits par buildWheel (1er enfant = pneu en LatheGeometry) ; l'étrier (juste après le disque) ne tourne pas
    const roues = [];
    root.traverse((o) => {
      if (!o.isGroup || !o.children.length) return;
      const pneu = o.children[0];
      if (!(pneu.isMesh && pneu.geometry && pneu.geometry.type === 'LatheGeometry')) return;
      const iDisque = o.children.findIndex((c) => c.isMesh && c.geometry && c.geometry.type === 'CylinderGeometry' && Math.abs((c.geometry.parameters.height ?? 0) - 0.026) < 1e-6);
      const etrier = iDisque >= 0 ? o.children[iDisque + 1] : null;
      roues.push({ g: o, r: Math.max(0.05, o.position.y), signe: Math.abs(o.rotation.y) > 1 ? 1 : -1, etrier: etrier && etrier.isMesh ? etrier : null });
    });
    // goutte d'huile de l'A4 remorquée (écurie 8) : la première petite sphère d'huile (rayon 0,025 m)
    let goutteLocale = null;
    root.traverse((o) => { if (!goutteLocale && o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && Math.abs((o.geometry.parameters.radius ?? 0) - 0.025) < 1e-6) goutteLocale = env.worldToLocal(o.getWorldPosition(new THREE.Vector3())); });
    root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; if (o.material && o.material.envMap === null && envMap && 'envMapIntensity' in o.material) o.material.envMapIntensity = o.material.envMapIntensity ?? 1; } });
    // gabarit de la CARROSSERIE (sans le néon sous caisse ni l'ombre de contact, qui sont des plans débordants)
    const boite = new THREE.Box3(); env.updateMatrixWorld(true);
    env.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type !== 'PlaneGeometry') { o.geometry.computeBoundingBox(); boite.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const taille = boite.getSize(new THREE.Vector3());
    const echelleLocale = K_SHOWROOM * ECHELLE_CONCEPT;                       // mètres du concept → cm du film
    env.userData = { concept: root, teamId, roues, echelleLocale, R: roues.length ? roues[0].r * echelleLocale : 1, L: taille.z, largeur: taille.x, hauteur: taille.y, goutteLocale, type: 'concept', info: conceptInfo(teamId) };
    animerConcept(env, 0); rouesReelles(env, 0);
    return env;
  }

  /** n codes m3d pour le parc fermé : tous les modèles sculptés à jour, sauf ceux qui jouent déjà un rôle (et le secret). */
  function codesParc(n = 52) {
    const pris = new Set([...MEUTE, ...F1, ...Object.values(SECRETS)]);
    const tous = codesSurMesure().filter((c) => !pris.has(c)).sort();
    // alternance des familles (U, FR, H, J, N, P, TK, B, E…) : un parc varié même si n < total
    const familles = new Map(); for (const c of tous) { const f = c.replace(/\d+$/, ''); if (!familles.has(f)) familles.set(f, []); familles.get(f).push(c); }
    const files = [...familles.values()], out = [];
    while (out.length < Math.min(n, tous.length)) for (const f of files) { if (f.length && out.length < n) out.push(f.shift()); }
    return out;
  }
  return { creer, creerConceptShowroom, codesParc, MEUTE, F1, SECRETS, conceptInfo };
}

/** Pose des roues d'un bolide réel : rotation ABSOLUE = −distance / rayon. */
export function rouesReelles(v, distance) {
  const u = v.userData;
  if (u.type === 'concept') {
    const d = distance / u.echelleLocale;                                     // distance en mètres du concept
    for (const w of u.roues) { w.g.rotation.z = w.signe * d / w.r; if (w.etrier) w.etrier.rotation.z = -w.g.rotation.z; }
    return true;
  }
  const b = u.reel; if (!b) return false;
  for (const w of b.roues) w.tourne.rotation.z = -distance / w.r;
  return true;
}

/** Animations propres d'un concept-car (tuyères, échappements, gyrophares, goutte d'huile, ゴゴゴ…) : fonction pure de t. */
export function animerConcept(v, t) {
  const c = v.userData.concept; if (c && c.userData.tick) c.userData.tick(t, 1 / 60);
}
