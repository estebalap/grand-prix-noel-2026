/* Vue de montage de l'atelier (Labo des pièces) : les VRAIES STL exportées pour la P1S, dans le repère de la voie,
   assemblées étape par étape avec une vue éclatée animée. Échelle : 1 unité Three = 10 mm (comme arsenal3d.js). */
import { chargerSTL, materiauFilament } from './stl.js';

export const MM = 0.1;
const BASE = new URL('./atelier/', import.meta.url).href;

/**
 * Construit le montage d'une fiche (shared/atelier/atelier.json). Renvoie une promesse de
 * { group, parts: [{id, mesh, eclate}], etape(k, progression), eclatement(f), boite }.
 * Étape k (1..n) : les pièces ajoutées aux étapes 1..k sont visibles ; celles de l'étape k arrivent de leur position éclatée.
 */
export async function construireMontage(THREE, fiche) {
  const group = new THREE.Group();
  const parts = [];
  await Promise.all(fiche.pieces.filter((p) => p.stl).map(async (p) => {
    try {
      const g = await chargerSTL(THREE, BASE + p.stl, { echelle: MM });
      const mesh = new THREE.Mesh(g, materiauFilament(THREE, p));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.piece = p;
      // éclaté : décalage en mm dans le repère OpenSCAD (x, y, z) -> Three (x, z, -y)
      const e = p.eclate || [0, 0, 0];
      const ecl = new THREE.Vector3(e[0] * MM, e[2] * MM, -e[1] * MM);
      group.add(mesh);
      parts.push({ id: p.id, mesh, eclate: ecl, piece: p });
    } catch (err) { console.warn('atelier', p.stl, err); }
  }));
  // cadrage : on ignore les pièces de contexte (le Pont, 25 cm de long) pour que la caméra montre le mécanisme
  const boite = new THREE.Box3();
  for (const pa of parts) if (!pa.piece.contexte) boite.expandByObject(pa.mesh);
  if (boite.isEmpty()) boite.setFromObject(group);
  const ordre = (fiche.etapes || []).map((e) => e.ajoute || []);
  function apparu(id, k) {
    // une pièce absente de toutes les étapes est visible dès le début (ex. portique déjà posé pour les mobiles)
    const premiere = ordre.findIndex((l) => l.includes(id));
    return premiere < 0 ? 0 : premiere + 1;
  }
  let f = 0;
  const api = {
    group, parts, boite,
    /** k = 0 : vue éclatée complète ; k = n : assemblé. t ∈ [0, 1] : arrivée des pièces de l'étape k. */
    etape(k, t = 1) {
      for (const pa of parts) {
        const a = apparu(pa.id, k);
        pa.mesh.visible = k === 0 || a <= k;
        const arrivee = a === k ? 1 - easeOut(t) : 0;
        const ec = k === 0 ? 1 : arrivee;
        pa.mesh.position.copy(pa.eclate).multiplyScalar(Math.max(ec, f));
        pa.mesh.material.emissive && pa.mesh.material.emissive.setHex(a === k && k > 0 ? 0x221400 : 0x000000);
      }
    },
    eclatement(v) { f = v; },
    dispose() { group.traverse((o) => { if (o.material) o.material.dispose(); }); },
  };
  api.etape((fiche.etapes || []).length);
  return api;
}

const easeOut = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
