/* Panthéon 3D — trophées du Grand Prix chargés depuis leurs VRAIES STL de montage (10_Pantheon_Trophees/generer_pantheon.py).
   Échelle : 1 unité = 10 mm (comme le reste de l'application). Repère STL (z haut, face avant −y) -> Three (y haut, face avant +z).
   construireTrophee(THREE, t, base, { lod }) -> { group, boite, pieces[], eclatement(k), detail(), dispose() }
   lod : charge les versions allégées (<pièce>.lod.stl, ~25 % des triangles) ; detail() recharge ensuite les vraies STL
   (vitrine). Les STL complètes du Panthéon pèsent 15 Mo / 304 000 triangles, les allégées 4 Mo / 83 000.
   La vue éclatée écarte chaque pièce de son centre selon son rôle (figure vers le haut, plaque vers l'avant…). */
import { chargerSTL, materiauFilament } from './stl.js';

export const BASE_PANTHEON = '../shared/pantheon/';
let MANIFESTE = null;

export async function chargerManifeste(base = BASE_PANTHEON) {
  if (MANIFESTE) return MANIFESTE;
  const r = await fetch(base + 'pantheon.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('pantheon.json introuvable');
  MANIFESTE = await r.json();
  return MANIFESTE;
}

export function materiauPiece(THREE, p) {
  const g = (p.fil && p.fil.gamme) || '';
  return materiauFilament(THREE, {
    hex: p.fil && p.fil.hex,
    silk: /Silk/i.test(g), bois: /Wood/i.test(g), translucide: /PETG/i.test(g) && /Translucide/i.test(p.fil.nom || ''),
  });
}

const ECLATE = { socle: [0, -0.4, 0], cheville: [0, 0.6, 0], plaque: [0, 0, 1.4], pied: [0, 0.8, 0], support: [0, 0.9, 0],
  anneau: [0, 1, 0], levre: [0, 1.6, 0], anse: [1.6, 0.8, 0], calque: [0, 0, 0.9], medaillon: [0, 1.2, 0], figure: [0, 1.4, 0],
  cerclage: [1.2, 0.6, 0], ornement: [1.0, 1.0, 0.6] };

export async function construireTrophee(THREE, t, base = BASE_PANTHEON, { lisse = true, lod = false } = {}) {
  const group = new THREE.Group();
  group.name = t.id;
  const pieces = [];
  const url = (p, allege) => base + (allege && p.stl_lod ? p.stl_lod : p.stl);
  const geos = await Promise.all(t.pieces.map((p) => chargerSTL(THREE, url(p, lod), { echelle: 0.1, lisse })
    .catch(() => (lod && p.stl_lod ? chargerSTL(THREE, url(p, false), { echelle: 0.1, lisse }) : null)).catch(() => null)));
  let complet = !lod || !t.pieces.some((p) => p.stl_lod);
  const lueur = couleurLueur(t);
  t.pieces.forEach((p, i) => {
    if (!geos[i]) return;
    const mat = materiauPiece(THREE, p);
    // Étoiles lumineuses : le PETG translucide est allumé par la bougie LED du socle. Émissif teinté (couleur de la
    // plaque) : le bloom de la scène fait le halo, sans lumière dynamique ni passe supplémentaire.
    if (lueur && /PETG/i.test((p.fil && p.fil.gamme) || '') && mat.emissive) { mat.emissive = new THREE.Color(lueur); mat.emissiveIntensity = 1.1; mat.color.lerp(new THREE.Color(lueur), 0.35); }
    const m = new THREE.Mesh(geos[i], mat);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.piece = p;
    group.add(m);
    pieces.push(m);
  });
  const boite = new THREE.Box3().setFromObject(group);
  const centre = boite.getCenter(new THREE.Vector3());
  // écartement : direction propre au rôle, renforcée par la position de la pièce par rapport au centre
  for (const m of pieces) {
    const b = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    const d = ECLATE[m.userData.piece.role] || [0, 1, 0];
    const lat = new THREE.Vector3(b.x - centre.x, 0, b.z - centre.z);
    const sx = Math.abs(lat.x) > 0.05 ? Math.sign(lat.x) : 1;
    m.userData.eclat = new THREE.Vector3(d[0] * sx, d[1], d[2]).multiplyScalar(2.2);
    // les anneaux montent en escalier (chaque anneau plus haut que le précédent)
    if (m.userData.piece.role === 'anneau') m.userData.eclat.y = 0.6 + (b.y - boite.min.y) * 0.35;
  }
  return {
    group, boite, pieces,
    eclatement(k) { for (const m of pieces) m.position.copy(m.userData.eclat).multiplyScalar(k); },
    /** Remplace les géométries allégées par les vraies STL (une seule fois). */
    async detail() {
      if (complet) return;
      complet = true;
      const g2 = await Promise.all(pieces.map((m) => chargerSTL(THREE, url(m.userData.piece, false), { echelle: 0.1, lisse }).catch(() => null)));
      pieces.forEach((m, i) => { if (g2[i]) m.geometry = g2[i]; });
    },
    dispose() { for (const m of pieces) m.material.dispose(); },   // les géométries restent en cache (partagées)
  };
}

/* Petite carte « néon » pour un trophée : nom + attribution (utilisée par la TV pendant la cérémonie). */
function couleurLueur(t) {
  const fig = t.pieces.find((x) => x.role === 'figure');
  if (!fig || !/Translucide/i.test((fig.fil && fig.fil.nom) || '')) return null;
  const pl = t.pieces.find((x) => x.role === 'plaque');
  return (pl && pl.fil && pl.fil.hex) || '#ffd34d';
}

export function couleurTrophee(t) {
  const l = couleurLueur(t);
  if (l) return l;
  const p = t.pieces.find((x) => x.role === 'figure' || x.role === 'anneau' || x.role === 'medaillon') || t.pieces[0];
  return (p && p.fil && p.fil.hex) || '#ffd34d';
}
