/* AIDES du segment « salon » (V8) — la BASCULE : le tapis rouge s'ouvre en deux battants comme une trappe de cave,
   une lumière arc-en-ciel (les 5 voies) jaillit de la fente, et un puits lumineux plonge vers l'arène.

   Aucune modification de ../src/decors/salon.js : on retrouve ici, dans le groupe du salon déjà construit, le sol carrelé,
   le tapis et la table basse ; on MASQUE le sol et le tapis d'origine et on les remplace par :
     - un sol identique (même matériau, mêmes UV) PERCÉ d'une ouverture aux dimensions exactes du tapis ;
     - deux battants de tapis (même texture, chaque battant reprend sa moitié d'UV) articulés sur les petits côtés ;
     - un puits aux parois de lumière arc-en-ciel sous l'ouverture ;
     - un faisceau volumétrique additif qui jaillit de la fente.
   La table basse est seulement translatée (glisse vers la télé avant l'ouverture).

   Tout est piloté par des fonctions pures du temps (aucun état conservé d'une image à l'autre). */

/** Couleurs des 5 voies de la Rainbow Road (ordre de la piste V7). */
export const VOIES_ARC = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'];

/** Retrouve dans le groupe du salon : le sol, le tapis, les éléments de la table basse (enfants directs). */
export function trouverPieces(THREE, groupeSalon, tapisAncre) {
  let sol = null, tapis = null; const table = [];
  const cz = tapisAncre.centre.z, cx = tapisAncre.centre.x;
  for (const o of groupeSalon.children) {
    if (!o.isMesh || !o.geometry) continue;
    const p = o.geometry.parameters || {};
    if (o.geometry.type === 'PlaneGeometry' && Math.abs(o.position.y) < 0.01 && Math.abs(o.rotation.x + Math.PI / 2) < 1e-3 && p.width >= 400) sol = o;
    else if (o.geometry.type === 'BoxGeometry' && Math.abs(p.width - tapisAncre.largeur) < 0.5 && Math.abs(p.depth - tapisAncre.profondeur) < 0.5) tapis = o;
    else if (Math.abs(o.position.x - cx) < 45 && Math.abs(o.position.z - cz) < 30 && o.position.y > 5 && o.position.y < 40) table.push(o);
  }
  if (!sol || !tapis || table.length < 5) throw new Error(`salon : pièces introuvables (sol ${!!sol}, tapis ${!!tapis}, table ${table.length})`);
  return { sol, tapis, table, tableBase: table.map((m) => m.position.clone()) };
}

/** Sol carrelé identique à celui du salon, percé d'un rectangle (x0..x1, z0..z1). */
export function solPerce(THREE, solOrigine, trou) {
  const g0 = solOrigine.geometry.parameters, L = g0.width, P = g0.height, zc = solOrigine.position.z, xc = solOrigine.position.x;
  // repère de la forme : (x, y) → monde (x, 0, −y) après rotation de −90° autour de x
  const s = new THREE.Shape();
  s.moveTo(xc - L / 2, -(zc + P / 2)); s.lineTo(xc + L / 2, -(zc + P / 2)); s.lineTo(xc + L / 2, -(zc - P / 2)); s.lineTo(xc - L / 2, -(zc - P / 2)); s.closePath();
  const h = new THREE.Path();
  h.moveTo(trou.x0, -trou.z1); h.lineTo(trou.x0, -trou.z0); h.lineTo(trou.x1, -trou.z0); h.lineTo(trou.x1, -trou.z1); h.closePath();
  s.holes.push(h);
  const geo = new THREE.ShapeGeometry(s);
  // UV identiques à la PlaneGeometry d'origine : u = (x − xmin) / L ; v = (y_local + P/2) / P avec y_local = zc − z_monde
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = -pos.getY(i); uv.setXY(i, (x - (xc - L / 2)) / L, (zc - z + P / 2) / P); }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(geo, solOrigine.material); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.name = 'sol-perce';
  return m;
}

/** Deux battants de tapis articulés sur les petits côtés (x = ±l/2). maj(angle) : 0 = fermé, π/2 = debout. */
export function creerBattants(THREE, tapisOrigine, ancre, envMap) {
  const l = ancre.largeur, p = ancre.profondeur, cx = ancre.centre.x, cz = ancre.centre.z, ep = 1.0;
  const mats = Array.isArray(tapisOrigine.material) ? tapisOrigine.material : [tapisOrigine.material];
  const dessus = mats[2] || mats[0], tranche = mats[0];
  const doublure = new THREE.MeshStandardMaterial({ color: 0x3a0508, roughness: 0.85, metalness: 0.0, envMap, envMapIntensity: 0.3 });   // envers du tapis : velours rouge sombre
  const laiton = new THREE.MeshStandardMaterial({ color: 0xc9973f, roughness: 0.3, metalness: 0.9, envMap, envMapIntensity: 0.9 });   // liseré de laiton
  const jetables = [doublure, laiton];
  const groupe = new THREE.Group(); groupe.name = 'battants-tapis';
  const charnieres = [];
  for (const cote of [-1, 1]) {                                   // −1 : battant gauche (charnière en x = −l/2) ; +1 : droit
    const piv = new THREE.Group(); piv.position.set(cx + cote * l / 2, 0, cz); groupe.add(piv);
    // dessus : moitié du tapis (UV u ∈ [0 ; 0,5] à gauche, [0,5 ; 1] à droite), même orientation v que la BoxGeometry d'origine
    const gTop = new THREE.PlaneGeometry(l / 2, p); jetables.push(gTop);
    const uv = gTop.attributes.uv, u0 = cote < 0 ? 0 : 0.5;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5);
    uv.needsUpdate = true;
    const top = new THREE.Mesh(gTop, dessus); top.rotation.x = -Math.PI / 2; top.position.set(-cote * l / 4, ep, 0); piv.add(top);
    const gBas = new THREE.PlaneGeometry(l / 2, p); jetables.push(gBas);
    const bas = new THREE.Mesh(gBas, doublure); bas.rotation.x = Math.PI / 2; bas.position.set(-cote * l / 4, 0.02, 0); piv.add(bas);
    // tranches (épaisseur du tapis) : bord libre + côtés
    const gBord = new THREE.BoxGeometry(0.6, ep, p); jetables.push(gBord);
    const bord = new THREE.Mesh(gBord, tranche); bord.position.set(-cote * (l / 2 - 0.3), ep / 2, 0); piv.add(bord);
    const gCote = new THREE.BoxGeometry(l / 2, ep, 0.6); jetables.push(gCote);
    for (const sz of [-1, 1]) { const c = new THREE.Mesh(gCote, tranche); c.position.set(-cote * l / 4, ep / 2, sz * (p / 2 - 0.3)); piv.add(c); }
    // liseré de laiton sur le bord libre (accroche la lumière arc-en-ciel)
    const gLis = new THREE.BoxGeometry(1.2, 1.4, p - 2); jetables.push(gLis);
    const lis = new THREE.Mesh(gLis, laiton); lis.position.set(-cote * (l / 2 - 0.6), 0.5, 0); piv.add(lis);
    charnieres.push({ piv, cote });
  }
  return {
    groupe,
    maj(angle) { for (const c of charnieres) c.piv.rotation.set(0, 0, -c.cote * angle); },
    liberer() { jetables.forEach((o) => o.dispose()); },
  };
}

/* Shader commun : bandes arc-en-ciel (5 voies) en espace « sRGB » (le post décode en linéaire), valeurs HDR pour le bloom. */
const GLSL_VOIES = `
vec3 voie(float k){ k = mod(k, 5.0);
  if (k < 1.0) return vec3(1.0, 0.23, 0.23); if (k < 2.0) return vec3(1.0, 0.60, 0.10); if (k < 3.0) return vec3(1.0, 0.89, 0.24);
  if (k < 4.0) return vec3(0.21, 0.88, 0.48); return vec3(0.25, 0.66, 1.0); }`;

/** Puits lumineux sous l'ouverture : 4 parois tournées vers l'intérieur, anneaux arc-en-ciel qui défilent vers le bas. */
export function creerPuits(THREE, trou, profondeur) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { defil: { value: 0 }, force: { value: 0 }, prof: { value: profondeur } },
    vertexShader: 'varying vec2 vUv; varying float vY; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vUv; varying float vY; uniform float defil, force, prof; ${GLSL_VOIES}
      void main(){
        float y = -vY;                                           // profondeur sous le sol (cm)
        float b = y / 34.0 + defil;                              // anneaux de 34 cm qui défilent
        float k = floor(b), f = fract(b);
        float ligne = smoothstep(0.0, 0.18, f) * smoothstep(1.0, 0.62, f);
        vec3 c = voie(k) * (0.03 + 1.25 * ligne);
        float bordsV = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
        float haut = smoothstep(0.0, 18.0, y);                   // la lèvre du trou reste sombre (lecture de la découpe)
        float fondu = 1.0 - smoothstep(prof * 0.55, prof, y);    // le bas du puits s'ouvre sur le ciel de l'arène
        gl_FragColor = vec4(c * force * (0.35 + 0.65 * bordsV) * mix(0.25, 1.0, haut), 1.0) * fondu;
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
  const groupe = new THREE.Group(); groupe.name = 'puits-arc';
  const w = trou.x1 - trou.x0, d = trou.z1 - trou.z0, cx = (trou.x0 + trou.x1) / 2, cz = (trou.z0 + trou.z1) / 2, geos = [];
  const paroi = (l, x, z, ry) => { const g = new THREE.PlaneGeometry(l, profondeur); geos.push(g); const m = new THREE.Mesh(g, mat); m.position.set(x, -profondeur / 2, z); m.rotation.y = ry; m.renderOrder = 2; groupe.add(m); };
  paroi(w, cx, trou.z0, 0);              // paroi nord : normale +z (vers l'intérieur)
  paroi(w, cx, trou.z1, Math.PI);        // paroi sud
  paroi(d, trou.x0, cz, Math.PI / 2);    // paroi ouest : normale +x
  paroi(d, trou.x1, cz, -Math.PI / 2);   // paroi est
  return { groupe, mat, maj(defil, force) { mat.uniforms.defil.value = defil; mat.uniforms.force.value = force; }, liberer() { mat.dispose(); geos.forEach((g) => g.dispose()); } };
}

/** Faisceau volumétrique additif qui jaillit de la fente : 5 bandes de couleur le long de x, fondu vers le haut et sur les bords. */
export function creerFaisceau(THREE, trou, hauteur) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { force: { value: 0 }, ouverture: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vL; uniform float force, ouverture, t; uniform vec2 demi; uniform float haut; ${GLSL_VOIES}
      void main(){
        float u = vL.x / demi.x;                                 // −1..1 sur la largeur du tapis
        float lx = abs(u) / max(ouverture, 0.02);                // la lame de lumière s'élargit avec l'ouverture des battants
        float lame = 1.0 - smoothstep(0.55, 1.0, lx);
        float bz = 1.0 - smoothstep(0.7, 1.0, abs(vL.z / demi.y));
        float h = clamp(vL.y / haut, 0.0, 1.0);
        float v = pow(1.0 - h, 1.6) * lame * bz;
        float k = (u * 0.5 + 0.5) * 5.0;                         // 5 voies de gauche à droite
        float stries = 0.75 + 0.25 * sin(vL.z * 0.21 + t * 5.0) * sin(vL.x * 0.13 - t * 3.0);
        gl_FragColor = vec4(voie(k) * v * stries * force, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const w = trou.x1 - trou.x0, d = trou.z1 - trou.z0;
  mat.uniforms.demi = { value: new THREE.Vector2(w / 2, d / 2) }; mat.uniforms.haut = { value: hauteur };
  const groupe = new THREE.Group(); groupe.name = 'faisceau-arc';
  groupe.position.set((trou.x0 + trou.x1) / 2, 0, (trou.z0 + trou.z1) / 2);
  // 7 lames verticales parallèles à z + 3 transversales : volume lisible sous tous les angles, sans boîte opaque
  const geos = [];
  for (let i = 0; i < 7; i++) { const g = new THREE.PlaneGeometry(d, hauteur); g.rotateY(Math.PI / 2); g.translate((i / 6 - 0.5) * w * 0.9, hauteur / 2, 0); geos.push(g); }
  for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(w, hauteur); g.translate(0, hauteur / 2, (i / 2 - 0.5) * d * 0.7); geos.push(g); }
  for (const g of geos) { const m = new THREE.Mesh(g, mat); m.renderOrder = 3; groupe.add(m); }
  return { groupe, maj(force, ouverture, t) { mat.uniforms.force.value = force; mat.uniforms.ouverture.value = ouverture; mat.uniforms.t.value = t; groupe.visible = force > 0.002; },
    liberer() { mat.dispose(); geos.forEach((g) => g.dispose()); } };
}
