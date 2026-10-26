/* VOITURES V7 — fabrique et pose des bolides du trailer (Concept-Cars du Showroom + bolides m3d sculptés), via le pont d'import.

   poser(env, pose, opts) applique une pose de physique_cgi.js à une voiture :
     - position + pilonnement (heave, négatif jusqu'au talonnage), cap (cap du vecteur vitesse + angle de dérive β), tangage, roulis (Euler 'YXZ') ;
     - rotation des roues ABSOLUE (ω = distance / R, jamais accumulée), BRAQUAGE des roues avant (contre-braquage −0,85·β en dérive), étriers de frein
       immobiles par rapport au porte-fusée (ils braquent mais ne tournent pas) ;
     - COMPRESSION des 4 coins : le moyeu de chaque roue remonte de max(0, −dy) dans la caisse, pour que les pneus restent au sol quand la caisse s'écrase.
   Repère : 1 unité = 1 cm ; avant = +z ; gauche = +x. */
import { construireBolide3D, codesSurMesure, buildConceptCar, conceptInfo } from '../src/shared_bridge.js';
import { mulberry, hashTexte } from './physique_cgi.js';

export const ECHELLE_CONCEPT = 2.55, K_SHOWROOM = 0.62;
export { codesSurMesure, conceptInfo };

/** Exécute fn avec un Math.random() déterministe (graine = texte) : les textures procédurales de shared/ deviennent reproductibles (règle 5). */
export function avecAlea(graine, fn) {
  const r = Math.random, g = mulberry(hashTexte(String(graine)));
  Math.random = g;
  try { return fn(); } finally { Math.random = r; }
}
export async function avecAleaAsync(graine, fn) {
  const r = Math.random, g = mulberry(hashTexte(String(graine)));
  Math.random = g;
  try { return await fn(); } finally { Math.random = r; }
}

function classer(env) {
  // position de chaque roue dans le repère de l'enveloppe (avant = +z, gauche = +x) pour la compression des coins
  env.updateMatrixWorld(true);
  const v = new env.position.constructor();
  for (const w of env.v7.roues) {
    const n = w.noeud; n.getWorldPosition(v); env.worldToLocal(v);
    w.x = v.x; w.z = v.z; w.avant = v.z > 0; w.coin = (v.z > 0 ? 'av' : 'ar') + '_' + (v.x > 0 ? 'g' : 'd');
  }
}

export function creerGarage(THREE, envMap) {
  /** Concept-Car du Showroom de l'écurie teamId (1–15) dans le repère du film. */
  function concept(teamId) {
    const root = avecAlea('concept' + teamId, () => buildConceptCar(teamId, { quality: 'high' }));
    const env = new THREE.Group(); env.name = 'concept-' + teamId;
    root.rotation.y = -Math.PI / 2; root.scale.setScalar(ECHELLE_CONCEPT); env.add(root); env.updateMatrixWorld(true);
    const roues = [];
    root.traverse((o) => {
      if (!o.isGroup || !o.children.length) return;
      const pneu = o.children[0];
      if (!(pneu.isMesh && pneu.geometry && pneu.geometry.type === 'LatheGeometry')) return;
      const iDisque = o.children.findIndex((c) => c.isMesh && c.geometry && c.geometry.type === 'CylinderGeometry' && Math.abs((c.geometry.parameters.height ?? 0) - 0.026) < 1e-6);
      const etrier = iDisque >= 0 ? o.children[iDisque + 1] : null;
      roues.push({ noeud: o, type: 'concept', r: Math.max(0.05, o.position.y), baseY: o.position.y, baseRY: o.rotation.y, signe: Math.abs(o.rotation.y) > 1 ? 1 : -1, etrier: etrier && etrier.isMesh ? etrier : null });
    });
    const box = new THREE.Box3();
    env.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type !== 'PlaneGeometry') { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const taille = box.getSize(new THREE.Vector3());
    env.v7 = { type: 'concept', teamId, concept: root, roues, echelleLocale: K_SHOWROOM * ECHELLE_CONCEPT, L: taille.z, largeur: taille.x, hauteur: taille.y, info: conceptInfo(teamId) };
    classer(env); return env;
  }
  /** Bolide m3d sculpté. */
  async function m3d(code, { noircir = false } = {}) {
    const b = await avecAleaAsync('m3d' + code, () => construireBolide3D(code, { THREE, envMap }));
    const env = new THREE.Group(); env.name = 'm3d-' + code;
    b.groupe.rotation.y = -Math.PI / 2; env.add(b.groupe);
    if (noircir) { const noir = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9, metalness: 0 }); b.groupe.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(() => noir) : noir; }); }
    b.eclairer(1, 0); b.maj(0, 0, 0);
    const roues = b.roues.map((w) => ({ noeud: w.pivot, type: 'm3d', r: w.r, baseY: w.pivot.position.y, w, avant: !!w.avant }));
    env.v7 = { type: 'm3d', code, reel: b, roues, L: b.longueur, largeur: b.largeur, hauteur: b.hauteur };
    classer(env); return env;
  }
  /** Clone léger d'un m3d (géométries et matériaux partagés) pour le parc : pas de roues pilotées. */
  function cloner(src) { const c = src.clone(true); c.v7 = { type: 'clone', code: src.v7.code, L: src.v7.L, roues: [] }; return c; }
  return { concept, m3d, cloner };
}

/** Applique une pose physique à une voiture (concept ou m3d). decalage = {x,z,cap} optionnel (ailier). */
export function poser(env, p, { dist = null, lateral = 0 } = {}) {
  const u = env.v7;
  const cap = p.cap, L = [Math.cos(p.capVitesse ?? cap), 0, -Math.sin(p.capVitesse ?? cap)];
  env.position.set(p.pos[0] + L[0] * lateral, p.pos[1] + p.heave, p.pos[2] + L[2] * lateral);
  env.rotation.set(p.tangage - (p.pente || 0), cap, p.roulis, 'YXZ');
  const d = dist == null ? p.dist : dist;
  for (const w of u.roues) {
    const off = Math.max(0, -(p.coins[w.coin] ?? 0));
    if (w.type === 'concept') {
      const dl = d / u.echelleLocale;
      w.noeud.rotation.z = w.signe * dl / w.r;
      w.noeud.rotation.y = w.baseRY + (w.avant ? p.braquage : 0);
      if (w.etrier) w.etrier.rotation.z = -w.noeud.rotation.z;               // l'étrier ne tourne pas : fixe sur le porte-fusée
      w.noeud.position.y = w.baseY + off / u.echelleLocale;
    } else {
      w.w.tourne.rotation.z = -d / w.r;
      if (w.avant) w.noeud.rotation.y = p.braquage;
      w.noeud.position.y = w.baseY + off;
    }
  }
}

/** Animation propre au concept-car (flammes, gyrophares, kanjis…) : fonction pure de t. */
export function animer(env, t) {
  const c = env.v7.concept; if (c && c.userData.tick) c.userData.tick(t, 1 / 60);
}
