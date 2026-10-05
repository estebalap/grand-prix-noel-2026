/* Chargeur STL minimal (binaire et ASCII) pour Three.js r128 — aucune dépendance.
   Les STL de l'atelier (web/shared/atelier/…) et du Panthéon des trophées (web/shared/trophees/…) sont
   EXACTEMENT les fichiers exportés pour la P1S (repère de montage) : ce que l'on voit est ce que l'on imprime.
   Unités : millimètres. Les géométries sont mises en cache par URL. */

const cache = new Map();

/** Décode un ArrayBuffer STL en { positions: Float32Array, normals: Float32Array } (normales par face). */
export function parseSTL(buf) {
  const dv = new DataView(buf);
  const binaire = (() => {
    if (buf.byteLength < 84) return false;
    const n = dv.getUint32(80, true);
    if (84 + n * 50 === buf.byteLength) return true;
    const tete = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(256, buf.byteLength)));
    return !/^\s*solid[\s\S]*facet/.test(tete);
  })();
  if (binaire) {
    const n = dv.getUint32(80, true);
    const pos = new Float32Array(n * 9), nor = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50;
      let nx = dv.getFloat32(o, true), ny = dv.getFloat32(o + 4, true), nz = dv.getFloat32(o + 8, true);
      for (let k = 0; k < 3; k++) {
        const p = o + 12 + k * 12;
        pos[i * 9 + k * 3] = dv.getFloat32(p, true); pos[i * 9 + k * 3 + 1] = dv.getFloat32(p + 4, true); pos[i * 9 + k * 3 + 2] = dv.getFloat32(p + 8, true);
      }
      if (!nx && !ny && !nz) [nx, ny, nz] = normale(pos, i * 9);
      for (let k = 0; k < 3; k++) { nor[i * 9 + k * 3] = nx; nor[i * 9 + k * 3 + 1] = ny; nor[i * 9 + k * 3 + 2] = nz; }
    }
    return { positions: pos, normals: nor };
  }
  const txt = new TextDecoder().decode(new Uint8Array(buf));
  const v = [];
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  let m;
  while ((m = re.exec(txt))) v.push(+m[1], +m[2], +m[3]);
  const pos = new Float32Array(v), nor = new Float32Array(v.length);
  for (let i = 0; i < pos.length; i += 9) { const [nx, ny, nz] = normale(pos, i); for (let k = 0; k < 3; k++) { nor[i + k * 3] = nx; nor[i + k * 3 + 1] = ny; nor[i + k * 3 + 2] = nz; } }
  return { positions: pos, normals: nor };
}

function normale(p, o) {
  const ax = p[o + 3] - p[o], ay = p[o + 4] - p[o + 1], az = p[o + 5] - p[o + 2];
  const bx = p[o + 6] - p[o], by = p[o + 7] - p[o + 1], bz = p[o + 8] - p[o + 2];
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/**
 * Charge une STL et renvoie une BufferGeometry Three.js passée du repère OpenSCAD (z vers le haut)
 * au repère Three (y vers le haut) : (x, y, z) -> (x, z, -y), à l'échelle `echelle` (1 = mm).
 * `lisse` recalcule des normales par sommet (pièces organiques : trophées) ; sinon facettes nettes (pièces mécaniques).
 */
export async function chargerSTL(THREE, url, { echelle = 1, lisse = false } = {}) {
  const k = url + '|' + echelle + '|' + lisse;
  if (cache.has(k)) return cache.get(k);
  const p = (async () => {
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) throw new Error('STL introuvable : ' + url);
    const { positions, normals } = parseSTL(await r.arrayBuffer());
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      positions[i] = x * echelle; positions[i + 1] = z * echelle; positions[i + 2] = -y * echelle;
      const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
      normals[i] = nx; normals[i + 1] = nz; normals[i + 2] = -ny;
    }
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (lisse && THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeVertices) {
      g.deleteAttribute('normal'); g = THREE.BufferGeometryUtils.mergeVertices(g, 1e-4 * echelle); g.computeVertexNormals();
    } else if (lisse) {
      g = lisserNormales(THREE, g, 35);
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  })();
  cache.set(k, p);
  p.catch(() => cache.delete(k));
  return p;
}

/** Normales lissées par sommet avec angle de cassure (les arêtes vives restent vives). */
function lisserNormales(THREE, g, angleDeg) {
  const pos = g.attributes.position.array, nor = g.attributes.normal.array;
  const seuil = Math.cos(angleDeg * Math.PI / 180);
  const cle = (i) => Math.round(pos[i] * 1e4) + ',' + Math.round(pos[i + 1] * 1e4) + ',' + Math.round(pos[i + 2] * 1e4);
  const groupes = new Map();
  for (let i = 0; i < pos.length; i += 3) { const k = cle(i); if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(i); }
  const out = new Float32Array(nor.length);
  for (const idx of groupes.values()) {
    for (const i of idx) {
      let sx = 0, sy = 0, sz = 0;
      for (const j of idx) {
        const d = nor[i] * nor[j] + nor[i + 1] * nor[j + 1] + nor[i + 2] * nor[j + 2];
        if (d >= seuil) { sx += nor[j]; sy += nor[j + 1]; sz += nor[j + 2]; }
      }
      const l = Math.hypot(sx, sy, sz) || 1;
      out[i] = sx / l; out[i + 1] = sy / l; out[i + 2] = sz / l;
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return g;
}

/** Matériau « filament » : Matte, Silk+ (reflets soyeux), Wood, PETG translucide, métal (quincaillerie). */
export function materiauFilament(THREE, p) {
  const c = new THREE.Color(p.hex || '#888888');
  if (p.metal) return new THREE.MeshStandardMaterial({ color: c, metalness: 0.95, roughness: 0.22 });
  if (p.translucide) return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0, roughness: 0.18, transmission: 0.6, transparent: true, opacity: 0.78, clearcoat: 0.6 });
  if (p.silk) return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.55, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  if (p.bois) return new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.88 });
  return new THREE.MeshStandardMaterial({ color: c, metalness: 0.05, roughness: 0.62 });
}

/**
 * Carte d'environnement « studio photo » générée sans image : boîte sombre, 3 softbox, un liseré néon.
 * Indispensable pour les matériaux métalliques (Silk+, billes d'acier, trophées) : sans environnement ils paraissent noirs.
 */
export function environnementStudio(THREE, renderer, teinte = 0x6a5cff) {
  const pm = new THREE.PMREMGenerator(renderer);
  const sc = new THREE.Scene();
  const salle = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x14162a, side: THREE.BackSide }));
  sc.add(salle);
  const panneau = (w, h, col, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); sc.add(m);
  };
  panneau(8, 3, 0xffffff, 0, 5.9, 0, 0, Math.PI / 2);          // plafonnier
  panneau(4, 6, 0xfff1dc, -9.9, 1, 2, Math.PI / 2);              // softbox chaude à gauche
  panneau(3, 5, 0xdce8ff, 9.9, 0.5, -3, -Math.PI / 2);          // softbox froide à droite
  panneau(14, 0.4, teinte, 0, -2, -9.9);                          // liseré néon (reflets colorés)
  panneau(20, 20, 0x0b0c18, 0, -5.9, 0, 0, -Math.PI / 2);        // sol sombre
  const tex = pm.fromScene(sc, 0.03).texture;
  pm.dispose();
  return tex;
}
