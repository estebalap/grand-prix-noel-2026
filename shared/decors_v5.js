/* DÉCORS UNIQUES V5 — « Showrunner décors » : un décor 3D taillé pour certains bolides (sélection par code), repli sur le décor
   d'univers (decors3d.js) pour tous les autres.

     U04  Le Gilet Jaune        Paris barricadé : façades haussmanniennes, barricades de palettes et de mobilier urbain, pneus en feu,
                                gilets jaunes posés, fumigènes jaunes, banderole « ACTE XII »
     E06  Le Bonus Écologique   utopie verte : collines, arbres, feuillages géants, lianes, éoliennes au loin, lumière dorée, pollen
     P03  Monster High          gothique rose et noir : lune géante, grilles en fer forgé, chauves-souris stylisées, toiles, manoir
     P04  Barbie Extra          maison de poupée géante en coupe, mobilier géant, paillettes (aucun logo, aucun nom de marque)
     H07  Blocus Total          blocus d'un lycée : grilles cadenassées et enchaînées, poubelles en feu, banderoles, fumée
     H08  Le Brexit             falaises blanches et tour d'horloge néogothique sur une île qui DÉRIVE loin d'une côte française
     TK03 Le Contrôle Fiscal    enfer bureaucratique : piles vertigineuses de dossiers, formulaires cerfa, tampons géants, néons, « URSSAF »
     TK05 Pikachu               arène de combat stylisée en cel-shading (aucun personnage, aucune balle, aucun logo)
     F01–F10                    box de l'écurie à ses couleurs, avec ses étagères de trophées à la mesure du palmarès
     FR01 DS 7 Élysée           cour d'honneur : pavés, façade classique, gardes stylisés sans visage, tapis rouge
     FR02 / FR04                quai de Seine haussmannien de nuit, Tour Eiffel illuminée au loin (pluie / bateau-promenade)
     FR03 La Déesse             Paris des années 60 : quai, bouquinistes, café, colonne d'affichage, Tour Eiffel
     FR05 1.2L PureTech         garage mécanique : pont élévateur, établi, pneus, flaque d'huile, dépanneuse plateau et gyrophare

   Contrat : chaque constructeur reçoit la trousse de decors3d.js (THREE, CX, R, rnd, COL, pol, garde, ajouter, noMir, anim, tex,
   basic, regarde, ciel, precip, champ, halo, texHalo, sol, lumiere, ptLumiere, estActif, env) et renvoie { solMat, brouillard, miroir }.
   Tout objet GPU passe par garde() (libéré par dispose()). Budget : ≤ 40 k triangles (miroir compris), textures canvas ≤ 1024²,
   géométries unitaires partagées et instanciées, aucune lumière ombrée. Zone libre au sol : x ∈ [-2, 14], z ∈ [-3, 6] (sortie
   du conteneur et pose du bolide), et rien entre les caméras (z > 6) et le bolide.
   Repères de cadrage : plan héroïque (arrêt sur image) → azimut -2,29 (le bolide), champ libre à sa gauche vers -2,45 … -2,85 ;
   plan large → azimut -1,93 ± 0,55. Les « monuments » sont posés vers -2,4 pour être lus dans les deux plans. */

const GLSL_H = 'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }';

/** Boîte à outils commune, construite sur la trousse de decors3d.js. */
function outils(k) {
  const { THREE, R, rnd, COL, garde, ajouter, noMir, anim, tex, basic } = k;
  const O = { ...k };
  O.BOX = garde(new THREE.BoxGeometry(1, 1, 1));
  O.PLAN = garde(new THREE.PlaneGeometry(1, 1));
  O.CYL = garde(new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
  O.CYL6 = garde(new THREE.CylinderGeometry(0.5, 0.5, 1, 6));
  O.SPH = garde(new THREE.SphereGeometry(0.5, 10, 7));
  O.ICO = garde(new THREE.IcosahedronGeometry(0.5, 1));
  O.ICO0 = garde(new THREE.IcosahedronGeometry(0.5, 0));
  O.CONE4 = garde(new THREE.ConeGeometry(0.5, 1, 4));
  O.CONE8 = garde(new THREE.ConeGeometry(0.5, 1, 8));
  O.TORE = garde(new THREE.TorusGeometry(0.5, 0.18, 6, 14));
  const _cacheMat = new Map();
  /** Matériau Lambert (éclairé, sans reflet) mis en cache par couleur. */
  O.lam = (c, o = {}) => { const cle = c + JSON.stringify(o); if (!o.map && _cacheMat.has(cle)) return _cacheMat.get(cle); const m = garde(new THREE.MeshLambertMaterial({ color: COL(c), ...o })); if (!o.map) _cacheMat.set(cle, m); return m; };
  O.bas = (c, o = {}) => basic({ color: COL(c), ...o });
  O.lum = (c, o = {}) => basic({ color: COL(c), toneMapped: false, ...o });             // émissif : néons, écrans, LED
  O.metal = (c, rough = 0.25, o = {}) => garde(new THREE.MeshStandardMaterial({ color: COL(c), metalness: 1, roughness: rough, envMap: k.env || null, envMapIntensity: 1.3, ...o }));
  /** Maillage à partir d'une géométrie unitaire : (w, h, d) échelle, y0 = base. */
  O.boite = (w, h, d, mat, x, y0, z, ry = 0, geo = O.BOX) => { const m = new THREE.Mesh(geo, mat); m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z); m.rotation.y = ry; ajouter(m); return m; };
  O.cyl = (r, h, mat, x, y0, z, geo = O.CYL) => O.boite(r * 2, h, r * 2, mat, x, y0, z, 0, geo);
  /** Instances : items = [{ p:[x,y,z], s:[sx,sy,sz] | nombre, r:[rx,ry,rz], c:'#couleur' }]. */
  O.inst = (geo, mat, items, parent = null) => {
    if (!items.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, items.length), o = new THREE.Object3D(), c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p); o.rotation.set(...(it.r || [0, 0, 0])); const s = it.s == null ? 1 : it.s; if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(...s);
      o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (it.c) m.setColorAt(i, c.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false; if (parent) parent.add(m); else ajouter(m); return m;
  };
  /** Panneau plan texturé ; regarde le point (cx, cz) s'il est donné, sinon orienté par ry. */
  O.plaque = (map, w, h, x, y, z, { ry = null, vers = null, mat = null, double = true, ...o } = {}) => {
    const m = new THREE.Mesh(O.PLAN, mat || basic({ map, transparent: true, side: double ? THREE.DoubleSide : THREE.FrontSide, ...o }));
    m.scale.set(w, h, 1); m.position.set(x, y, z);
    if (vers) m.lookAt(vers[0], y, vers[1]); else if (ry != null) m.rotation.y = ry; else m.lookAt(k.CX + 2.6, y, 0);
    ajouter(m); return m;
  };
  /** Texte sur canvas (police générique). */
  O.texteTex = (lignes, { w = 1024, h = 256, fond = null, couleur = '#fff', contour = null, lw = 10, police = '900 {T}px "Arial Black","Helvetica Neue",Arial,sans-serif', taille = 0.62, lueur = null, bord = null } = {}) => tex(w, h, (g) => {
    if (fond) { g.fillStyle = fond; g.fillRect(0, 0, w, h); }
    if (bord) { g.strokeStyle = bord; g.lineWidth = h * 0.05; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
    const L = Array.isArray(lignes) ? lignes : [lignes], pas = h / L.length;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    L.forEach((t, i) => {
      let T = pas * taille; g.font = police.replace('{T}', T); while (g.measureText(t).width > w * 0.92 && T > 8) { T *= 0.92; g.font = police.replace('{T}', T); }
      if (lueur) { g.shadowColor = lueur; g.shadowBlur = h * 0.12; }
      if (contour) { g.strokeStyle = contour; g.lineWidth = lw; g.lineJoin = 'round'; g.strokeText(t, w / 2, pas * (i + 0.5)); }
      g.fillStyle = couleur; g.fillText(t, w / 2, pas * (i + 0.5)); g.shadowBlur = 0;
    });
  });
  /** Tissu qui ondule (drapeau, banderole, gilet suspendu) : déformation CPU d'un plan 14 × 3. ancre = 'gauche' (drapeau) | 'bords' (banderole). */
  O.tissu = (map, w, h, x, y, z, ry, { amp = 0.3, freq = 1.4, vit = 4, ancre = 'gauche', mat = null } = {}) => {
    const geo = garde(new THREE.PlaneGeometry(w, h, 14, 3)); if (ancre === 'gauche') geo.translate(w / 2, 0, 0);
    const pos = geo.attributes.position, base = Float32Array.from(pos.array), ph = rnd() * 6;
    const m = new THREE.Mesh(geo, mat || basic({ map, side: THREE.DoubleSide, transparent: true }));
    m.position.set(x, y, z); m.rotation.y = ry; noMir(m); ajouter(m);
    anim.push((t) => {
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], u = ancre === 'gauche' ? bx / w : Math.sin(Math.PI * (bx / w + 0.5));
        pos.array[i * 3 + 2] = Math.sin(bx * freq - t * vit + by * 0.4 + ph) * amp * u;
        if (ancre === 'gauche') pos.array[i * 3 + 1] = by - u * u * amp * 0.25;
      }
      pos.needsUpdate = true;
    });
    return m;
  };
  /** Flux de particules (fumée, fumigène, flammes) : un seul objet Points, animé dans le vertex shader.
   *  sources = [[x, y, z, étalement]]. Couleurs cA → cB → cC sur la vie de la particule. */
  O.flux = ({ sources, n = 30, haut = 8, vitesse = 0.2, taille = 2, croit = 2, conv = 0, wob = 0.6, derive = [0.5, 0, -0.2], cA = '#222', cB = '#555', cC = '#888', alpha = 0.6, additif = false, etal = 0.5 }) => {
    const N = sources.length * n, pos = new Float32Array(N * 3), off = new Float32Array(N * 3), pv = new Float32Array(N * 3);
    let i = 0;
    for (const s of sources) for (let j = 0; j < n; j++, i++) {
      const e = (s[3] == null ? 1 : s[3]) * etal, a = rnd() * 6.283, r = Math.sqrt(rnd()) * e;
      pos.set([s[0], s[1], s[2]], i * 3); off.set([Math.cos(a) * r, R(0, 0.2) * e, Math.sin(a) * r], i * 3); pv.set([rnd(), vitesse * R(0.75, 1.3), rnd()], i * 3);
    }
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aOff', new THREE.BufferAttribute(off, 3)); g.setAttribute('aPV', new THREE.BufferAttribute(pv, 3));
    const u = { t: { value: 0 }, ech: { value: 600 }, haut: { value: haut }, taille: { value: taille }, croit: { value: croit }, conv: { value: conv }, wob: { value: wob }, derive: { value: new THREE.Vector3(...derive) },
      cA: { value: COL(cA) }, cB: { value: COL(cB) }, cC: { value: COL(cC) }, alpha: { value: alpha }, add: { value: additif ? 1 : 0 } };
    const m = garde(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
      vertexShader: `uniform float t, ech, haut, taille, croit, conv, wob; uniform vec3 derive; attribute vec3 aOff; attribute vec3 aPV; varying float vK; varying float vR;
        void main(){ float k = fract(t * aPV.y + aPV.x); vK = k; vR = aPV.z;
          vec3 p = position + aOff * (1.0 - conv * k); p.y += k * haut; p += derive * k * k * haut;
          p.x += sin(t * 1.7 + aPV.z * 40.0) * wob * k; p.z += cos(t * 1.3 + aPV.z * 23.0) * wob * k;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(taille * max(0.08, 1.0 + croit * k) * ech / max(-mv.z, 0.5), 1.0, 300.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 cA, cB, cC; uniform float alpha, add; varying float vK; varying float vR;
        void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.0, r); if (add > 0.5) a *= a;
          a *= 0.72 + 0.28 * sin(c.x * 13.0 + vR * 50.0) * sin(c.y * 11.0 + vR * 31.0);
          a *= smoothstep(0.0, 0.1, vK) * pow(1.0 - vK, 1.2) * alpha;
          vec3 col = vK < 0.5 ? mix(cA, cB, vK * 2.0) : mix(cB, cC, (vK - 0.5) * 2.0); gl_FragColor = vec4(col, a); }` }));
    const p = new THREE.Points(g, m); p.frustumCulled = false; noMir(p); ajouter(p);
    anim.push((t, dt, cam, hPx) => { u.t.value = t; if (cam) u.ech.value = (hPx || 1080) * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2); });
    return p;
  };
  /** Feux : flammes additives + lueur vacillante (+ une seule lumière ponctuelle non ombrée, optionnelle). */
  O.feux = (sources, { taille = 0.9, haut = 2.2, lumiere = true, fumee = true, fumeeHaut = 26, fumeeCouleurs = ['#2a2522', '#3a3532', '#5a5550'] } = {}) => {
    O.flux({ sources, n: 60, haut, vitesse: 1.05, taille: taille * 1.5, croit: -0.6, conv: 0.85, wob: 0.18, derive: [0, 0, 0], cA: '#fff6c8', cB: '#ffa030', cC: '#d8380c', alpha: 1, additif: true, etal: 0.75 });
    O.flux({ sources, n: 30, haut: haut * 0.8, vitesse: 0.9, taille: taille * 1.2, croit: -0.5, conv: 0.7, wob: 0.15, derive: [0, 0, 0], cA: '#ffd040', cB: '#ff6a10', cC: '#a01a04', alpha: 0.9, additif: false, etal: 0.6 });
    if (fumee) O.flux({ sources: sources.map((s) => [s[0], s[1] + haut * 0.7, s[2], (s[3] || 1) * 0.8]), n: 30, haut: fumeeHaut, vitesse: 0.075, taille: 3.4, croit: 3.2, wob: 1.6, derive: [0.35, 0, -0.18], cA: fumeeCouleurs[0], cB: fumeeCouleurs[1], cC: fumeeCouleurs[2], alpha: 0.82 });
    const halos = sources.map((s) => k.halo(s[0], s[1] + haut * 0.4, s[2], '#ff8a2a', 5 * (s[3] || 1), 0.75));
    let pl = null; if (lumiere) { const s = sources[0]; pl = k.ptLumiere('#ff8a3a', 3.2, 26, s[0], s[1] + 1.6, s[2] + 1.5); }
    anim.push((t) => { halos.forEach((h, i) => { const f = 0.7 + 0.3 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 5.3 + i); h.material.opacity = 0.7 * f; });
      if (pl && k.estActif()) pl.intensity = pl.userData.base * (0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 6.1)); });
  };
  /** Ciel de traits (« dispersion ») déjà fourni : k.precip ; champ de points : k.champ. */
  return O;
}

/* ================================================================ PARIS : façades haussmanniennes, toits de zinc, Tour Eiffel, réverbères */
function paris(O) {
  const { THREE, R, rnd, COL, garde, ajouter, noMir, anim, tex, basic } = O;
  const P = {};
  /** Façade haussmannienne (module de 15 m × 21 m, 48 px/m, 720 × 1008 px) : rez-de-chaussée à refends, balcons filants
   *  au 2e et au 5e, balconnets, frontons de l'étage noble, corniche. style : 'sale' (manif, jour), 'nuit', 'soixante'. */
  P.texFacade = (style) => tex(720, 1008, (g, w, h) => {
    const nuit = style === 'nuit', sale = style === 'sale', s60 = style === 'soixante';
    const pierre = nuit ? '#6b5d48' : sale ? '#cbb994' : s60 ? '#e6d3a8' : '#d8c8a6';
    g.fillStyle = pierre; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.015, 0.05)})`; g.fillRect(rnd() * w, rnd() * h, R(1, 3), R(1, 3)); }
    g.fillStyle = 'rgba(0,0,0,.07)'; for (let y = 24; y < h; y += 24) g.fillRect(0, y, w, 1.5);
    for (let y = 0; y < h; y += 24) for (let x = ((y / 24) % 2) * 36; x < w; x += 72) g.fillRect(x, y, 1.5, 24);
    // étages : [haut, hauteur, type] — b5 balcon filant (5e), b2 étage noble à balcon filant, n balconnets
    const et = [[24, 144, 'b5'], [168, 149, 'n'], [317, 153, 'n'], [470, 164, 'b2'], [634, 158, 'n']];
    const rambarde = (x0, x1, y, hh) => {
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0, y, x1 - x0, 7); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0, y + 7, x1 - x0, 5);
      g.strokeStyle = '#1b1a1c'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y - hh); g.lineTo(x1, y - hh); g.stroke();
      g.lineWidth = 1.6; for (let x = x0 + 3; x < x1; x += 7) { g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x, y); g.stroke(); }
      g.lineWidth = 1.4; for (let x = x0 + 10; x < x1 - 8; x += 21) { g.beginPath(); g.arc(x, y - hh * 0.55, 5, 0, 6.3); g.stroke(); }
    };
    for (const [top, fh, type] of et) {
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, top + fh - 3, w, 3);
      for (let i = 0; i < 5; i++) {
        const cx = (i + 0.5) * 144, ww = 60, wh = fh * (type === 'b5' ? 0.6 : 0.68), wy = top + fh * 0.14, x = cx - ww / 2;
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x - 9, wy - 9, ww + 18, wh + 12); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 9, wy + wh + 3, ww + 18, 4);
        if (type === 'b2') { g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(x - 12, wy - 10); g.lineTo(cx, wy - 30); g.lineTo(x + ww + 12, wy - 10); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - 12, wy - 10, ww + 24, 3); }
        const allume = nuit ? rnd() < 0.62 : false;
        if (allume) { const gr = g.createLinearGradient(0, wy, 0, wy + wh); const c = ['#ffd58a', '#ffc46a', '#ffe6b0', '#ffb860'][Math.floor(rnd() * 4)]; gr.addColorStop(0, c); gr.addColorStop(1, '#a8642a'); g.fillStyle = gr; }
        else { const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, nuit ? '#1a2030' : s60 ? '#5b6a74' : '#4a5866'); gr.addColorStop(1, nuit ? '#0b0d14' : '#1f262e'); g.fillStyle = gr; }
        g.fillRect(x, wy, ww, wh);
        if (allume) { g.fillStyle = 'rgba(255,240,220,.35)'; g.fillRect(x, wy, 10, wh); g.fillRect(x + ww - 10, wy, 10, wh); }
        else if (!nuit) { g.fillStyle = 'rgba(200,220,240,.18)'; g.beginPath(); g.moveTo(x, wy); g.lineTo(x + ww * 0.6, wy); g.lineTo(x, wy + wh * 0.5); g.fill(); }
        g.strokeStyle = nuit ? '#d9cdb5' : '#f1ebdd'; g.lineWidth = 3; g.strokeRect(x, wy, ww, wh); g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx, wy); g.lineTo(cx, wy + wh); for (const f of [0.33, 0.66]) { g.moveTo(x, wy + wh * f); g.lineTo(x + ww, wy + wh * f); } g.stroke();
        if (type === 'n') rambarde(x - 4, x + ww + 4, wy + wh - 2, 30);
        if (sale && rnd() < 0.5) { const gr = g.createLinearGradient(0, wy + wh, 0, wy + wh + 90); gr.addColorStop(0, 'rgba(30,25,20,.35)'); gr.addColorStop(1, 'rgba(30,25,20,0)'); g.fillStyle = gr; g.fillRect(x + 6, wy + wh, ww - 12, 90); }
      }
      if (type !== 'n') rambarde(0, w, top + fh - 8, 40);
    }
    // corniche
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, 10, w, 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 20, w, 6);
    for (let x = 4; x < w; x += 14) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 20, 6, 4); }
    // rez-de-chaussée : refends, boutiques, porte cochère
    const rz = 792;
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, rz, w, 8); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, rz + 8, w, 4);
    g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = rz + 30; y < h; y += 26) g.fillRect(0, y, w, 3);
    for (const [x0, x1, porte] of [[18, 270, false], [306, 414, true], [450, 702, false]]) {
      if (porte) {
        g.fillStyle = '#3d2a1c'; g.beginPath(); g.moveTo(x0, h); g.lineTo(x0, rz + 70); g.quadraticCurveTo((x0 + x1) / 2, rz + 18, x1, rz + 70); g.lineTo(x1, h); g.fill();
        g.strokeStyle = '#24170e'; g.lineWidth = 3; g.beginPath(); g.moveTo((x0 + x1) / 2, rz + 44); g.lineTo((x0 + x1) / 2, h); g.stroke();
        for (const yy of [rz + 110, rz + 160]) g.strokeRect(x0 + 10, yy, x1 - x0 - 20, 36);
        continue;
      }
      const y0 = rz + 36;
      if (sale) {                                                       // rideau métallique baissé, tagué
        g.fillStyle = '#7c7f84'; g.fillRect(x0, y0, x1 - x0, h - y0); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = y0; y < h; y += 7) g.fillRect(x0, y, x1 - x0, 2);
        for (let k = 0; k < 6; k++) { g.strokeStyle = ['#e8262a', '#1b1b1b', '#2b6bff', '#f5d000', '#ffffff', '#ff4fb0'][k]; g.lineWidth = R(4, 9); g.beginPath(); let x = R(x0 + 10, x1 - 60), y = R(y0 + 30, h - 30); g.moveTo(x, y); for (let j = 0; j < 7; j++) { x += R(6, 22); y += R(-24, 24); g.quadraticCurveTo(x - 8, y - R(10, 30), x, y); } g.stroke(); }
      } else {
        const gr = g.createLinearGradient(0, y0, 0, h); gr.addColorStop(0, nuit ? '#ffcf7a' : '#2b333b'); gr.addColorStop(1, nuit ? '#a85a1c' : '#11161b'); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, h - y0);
        g.strokeStyle = '#1d1a16'; g.lineWidth = 4; g.strokeRect(x0, y0, x1 - x0, h - y0); for (let x = x0 + 63; x < x1; x += 63) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, h); g.stroke(); }
        if (s60) { for (let x = x0; x < x1; x += 24) { g.fillStyle = (x / 24) % 2 ? '#b8282a' : '#f4ead8'; g.fillRect(x, rz + 14, 24, 26); } }      // store rayé
        else { g.fillStyle = nuit ? '#2b1d14' : '#1f3a2e'; g.fillRect(x0, rz + 14, x1 - x0, 20); }
      }
    }
    if (nuit) { const gr = g.createLinearGradient(0, h * 0.55, 0, h); gr.addColorStop(0, 'rgba(255,170,80,0)'); gr.addColorStop(1, 'rgba(255,170,80,.28)'); g.fillStyle = gr; g.fillRect(0, h * 0.55, w, h * 0.45); }
    if (sale) { for (let i = 0; i < 9; i++) { const x = rnd() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(40,35,30,.0)'); gr.addColorStop(0.6, 'rgba(40,35,30,.12)'); gr.addColorStop(1, 'rgba(40,35,30,.3)'); g.fillStyle = gr; g.fillRect(x, 0, R(20, 70), h); } }
  }, true);
  /** Toit à la Mansart en zinc avec lucarnes (512 × 160 pour 15 m). */
  P.texToit = (style) => tex(512, 160, (g, w, h) => {
    const nuit = style === 'nuit';
    g.fillStyle = nuit ? '#2c323b' : '#6f7a86'; g.fillRect(0, 0, w, h);
    g.fillStyle = nuit ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.12)'; for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 2, h);
    for (let i = 0; i < 5; i++) {
      const cx = (i + 0.5) * w / 5;
      g.fillStyle = nuit ? '#8d8270' : '#e8dfcc'; g.beginPath(); g.moveTo(cx - 24, h); g.lineTo(cx - 24, 52); g.quadraticCurveTo(cx, 22, cx + 24, 52); g.lineTo(cx + 24, h); g.fill();
      const on = nuit && rnd() < 0.55; g.fillStyle = on ? '#ffcf80' : nuit ? '#141820' : '#3a4652'; g.fillRect(cx - 15, 62, 30, 78);
      g.strokeStyle = nuit ? '#9a8f7c' : '#f4efe4'; g.lineWidth = 2; g.strokeRect(cx - 15, 62, 30, 78); g.beginPath(); g.moveTo(cx, 62); g.lineTo(cx, 140); g.stroke();
    }
  }, true);
  /** Prisme de toit (brisis + terrasson) de largeur w, profondeur d ; u répété tous les 15 m. */
  const _toits = new Map();
  P.geoToit = (w, d, hh = 4.4, ret = 1.5) => {
    const cle = w + ':' + d; if (_toits.has(cle)) return _toits.get(cle);
    const x0 = -w / 2, x1 = w / 2, zf = d / 2, zt = d / 2 - ret, U = w / 15, Ud = d / 15, p = [], uv = [];
    const quad = (a, b, c, e, ua, ub, uc, ue) => { p.push(...a, ...b, ...c, ...a, ...c, ...e); uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ue); };
    quad([x0, 0, zf], [x1, 0, zf], [x1, hh, zt], [x0, hh, zt], [0, 0], [U, 0], [U, 1], [0, 1]);                          // brisis avant
    quad([x1, 0, -zf], [x0, 0, -zf], [x0, hh, -zt], [x1, hh, -zt], [0, 0], [U, 0], [U, 1], [0, 1]);                      // arrière
    quad([x0, 0, -zf], [x0, 0, zf], [x0, hh, zt], [x0, hh, -zt], [0, 0], [Ud, 0], [Ud, 1], [0, 1]);                      // pignons
    quad([x1, 0, zf], [x1, 0, -zf], [x1, hh, -zt], [x1, hh, zt], [0, 0], [Ud, 0], [Ud, 1], [0, 1]);
    quad([x0, hh, zt], [x1, hh, zt], [x1, hh, -zt], [x0, hh, -zt], [0, 0.02], [0.01, 0.02], [0.01, 0.03], [0, 0.03]);     // terrasson
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    _toits.set(cle, g); return g;
  };
  /** Kit d'immeubles d'un style : matériaux partagés + cheminées instanciées (posées à la fin par fin()). */
  P.kit = (style, { teinteCote = '#b7ab95' } = {}) => {
    const fac = P.texFacade(style), toit = P.texToit(style);
    const mF = basic({ map: fac }), mC = basic({ map: fac, color: COL(teinteCote) }), mT = basic({ map: toit }), mPlat = O.bas(style === 'nuit' ? '#1d2229' : '#59636e');
    const chem = [], pots = [];
    const imm = (x, z, ry, n, { H = R(19.5, 22), D = 12 } = {}) => {
      const w = n * 3, geo = garde(new THREE.BoxGeometry(w, H, D)), uv = geo.attributes.uv;
      for (let i = 0; i < 24; i++) { const f = Math.floor(i / 4); if (f < 2) uv.setX(i, uv.getX(i) * D / 15); else if (f > 3) uv.setX(i, uv.getX(i) * w / 15); }
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry;
      const b = new THREE.Mesh(geo, [mC, mC, mPlat, mPlat, mF, mF]); b.position.y = H / 2; grp.add(b);
      const t = new THREE.Mesh(P.geoToit(w, D), mT); t.position.y = H; grp.add(t);
      ajouter(grp); grp.updateMatrixWorld(true);
      for (let i = 0; i < Math.max(2, Math.round(n / 2)); i++) {
        const v = new THREE.Vector3(-w / 2 + (i + 0.5) * w / Math.max(2, Math.round(n / 2)), H + 4.4, R(-1.5, 1.5)).applyMatrix4(grp.matrixWorld);
        chem.push({ p: [v.x, v.y + 0.8, v.z], s: [R(1.6, 2.6), 1.6, 0.7], r: [0, ry, 0] });
        for (let j = 0; j < 3; j++) pots.push({ p: [v.x + Math.cos(ry) * (j - 1) * 0.5, v.y + 1.8, v.z - Math.sin(ry) * (j - 1) * 0.5], s: [0.25, 0.5, 0.25] });
      }
      return grp;
    };
    const fin = () => { O.inst(O.BOX, O.lam(style === 'nuit' ? '#5a5048' : '#c9b9a0'), chem); O.inst(O.CYL6, O.lam(style === 'nuit' ? '#6b3a26' : '#b8643c'), pots); };
    return { imm, fin, mF };
  };
  /** Rangée d'immeubles le long d'une droite : de (xa, za) vers (xb, zb), façades tournées vers ry ; trous = rues. */
  P.rangee = (kit, xa, za, xb, zb, ry, { trous = [], D = 12, nMin = 4, nMax = 7, H = null } = {}) => {
    const L = Math.hypot(xb - xa, zb - za), ux = (xb - xa) / L, uz = (zb - za) / L, nx = Math.sin(ry), nz = Math.cos(ry);
    let s = 0;
    while (s < L) {
      const n = nMin + Math.floor(rnd() * (nMax - nMin + 1)), w = n * 3;
      if (trous.some(([a, b]) => s + w > a && s < b)) { s += 3; continue; }
      if (s + w > L) break;
      const c = s + w / 2; kit.imm(xa + ux * c - nx * D / 2, za + uz * c - nz * D / 2, ry, n, H ? { D, H: H * R(0.92, 1.08) } : { D }); s += w + 0.05;
    }
  };
  /** Tour Eiffel : enveloppe à section carrée (tour à 4 faces) habillée d'une texture de treillis, plateformes, antenne.
   *  nuit : dorée et lumineuse, scintillement et phare tournant. */
  P.tourEiffel = (x, z, H, { nuit = false, couleur = null, scint = 0.6, phare = true, vers = [O.CX, 0] } = {}) => {
    const latt = tex(512, 1024, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const v2y = (v) => h * (1 - v), band = (v) => (v < 0.19 ? 0.2 + v * 0.5 : v < 0.4 ? 0.3 + (v - 0.19) * 0.9 : 0.5);
      g.strokeStyle = '#fff'; g.fillStyle = 'rgba(255,255,255,.22)';
      // jambes (bandes latérales) puis treillis en croix
      for (const cote of [0, 1]) {
        g.beginPath(); for (let v = 0; v <= 0.4; v += 0.01) { const b = band(v); g.lineTo(cote ? w * (1 - b) : w * b, v2y(v)); }
        g.lineTo(cote ? w : 0, v2y(0.4)); g.lineTo(cote ? w : 0, v2y(0)); g.closePath(); g.fill(); g.lineWidth = 6; g.stroke();
      }
      g.fillRect(0, v2y(1), w, h * 0.6); g.lineWidth = 7; g.strokeRect(3, v2y(1), w - 6, h * 0.6);
      g.save(); g.beginPath();
      for (let v = 0; v <= 0.4; v += 0.01) g.lineTo(w * band(v), v2y(v)); g.lineTo(0, v2y(0.4)); g.lineTo(0, h); g.closePath();
      g.moveTo(w, h); for (let v = 0; v <= 0.4; v += 0.01) g.lineTo(w * (1 - band(v)), v2y(v)); g.lineTo(w, v2y(0.4)); g.closePath();
      g.rect(0, 0, w, v2y(0.4)); g.clip();
      g.lineWidth = 3; for (let d = -h; d < w + h; d += 26) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + h, h); g.stroke(); g.beginPath(); g.moveTo(d, h); g.lineTo(d + h, 0); g.stroke(); }
      g.lineWidth = 4; for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.restore();
      // arche entre les pieds
      g.lineWidth = 12; g.beginPath(); g.moveTo(w * 0.2, v2y(0.02)); g.quadraticCurveTo(w * 0.5, v2y(0.22), w * 0.8, v2y(0.02)); g.stroke();
      // plateformes
      g.fillStyle = '#fff'; g.fillRect(0, v2y(0.19) - 9, w, 18); g.fillRect(0, v2y(0.385) - 7, w, 14);
    });
    latt.wrapS = THREE.RepeatWrapping; latt.repeat.set(4, 1);
    const col = couleur || (nuit ? '#ffb848' : '#5a4836');
    const mat = basic({ map: latt, color: COL(col), transparent: true, alphaTest: 0.06, side: THREE.DoubleSide, fog: false, toneMapped: !nuit, depthWrite: true });
    const pts = [], N = 26, Hc = H * 0.9, demi = (s) => H * (0.2 * Math.pow(1 - s, 2.4) + 0.016 * (1 - s) + 0.006);
    for (let i = 0; i <= N; i++) { const s = i / N; pts.push(new THREE.Vector2(demi(s) * Math.SQRT2, s * Hc)); }
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.lookAt(vers[0], 0, vers[1]);
    const env = new THREE.Mesh(garde(new THREE.LatheGeometry(pts, 4)), mat); env.rotation.y = Math.PI / 4; grp.add(env);
    const matP = basic({ color: COL(col), fog: false, toneMapped: !nuit });
    for (const [s, k] of [[0.19, 1.12], [0.385, 1.1], [0.9, 1.8]]) { const p = new THREE.Mesh(O.BOX, matP); const d = demi(Math.min(s, 0.86)) * 2 * k; p.scale.set(d, H * 0.012, d); p.position.y = s * Hc; grp.add(p); }
    const ant = new THREE.Mesh(O.CYL6, matP); ant.scale.set(H * 0.008, H * 0.12, H * 0.008); ant.position.y = Hc + H * 0.06; grp.add(ant);
    noMir(grp); ajouter(grp);
    if (nuit) {
      O.halo(x, H * 0.35, z, '#ffb44a', H * 1.3, 0.32);
      // scintillement : points blancs qui flashent au hasard sur l'enveloppe
      const n = 260, pos = new Float32Array(n * 3), ph = new Float32Array(n);
      const ca = Math.cos(grp.rotation.y), sa = Math.sin(grp.rotation.y);
      for (let i = 0; i < n; i++) { const s = Math.pow(rnd(), 0.8) * 0.95, d = demi(s), f = Math.floor(rnd() * 4), t = R(-1, 1) * d; let lx = [d, -d, t, t][f], lz = [t, t, d, -d][f]; pos.set([x + lx * ca + lz * sa, s * Hc, z - lx * sa + lz * ca], i * 3); ph[i] = rnd() * 50; }
      const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
      const u = { t: { value: 0 }, k: { value: scint } };
      const pm = garde(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
        vertexShader: 'uniform float t, k; attribute float aPh; varying float vA; void main(){ float s = sin(t * 9.0 + aPh * 7.0) * sin(t * 3.1 + aPh); vA = smoothstep(1.0 - 0.25 * k, 1.0, s * 0.5 + 0.5); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 2.0 + 7.0 * vA; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.97, 0.9, vA * smoothstep(0.5, 0.0, r)); }' }));
      const pp = new THREE.Points(g, pm); pp.frustumCulled = false; noMir(pp); ajouter(pp);
      anim.push((t) => { u.t.value = t; });
      if (phare) {                                                     // phare tournant au sommet : deux faisceaux opposés
        const fm = garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL('#fff2c8'), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
        const piv = new THREE.Group(); piv.position.set(x, Hc + H * 0.02, z);
        for (const sgn of [1, -1]) { const b = new THREE.Mesh(O.PLAN, fm); b.scale.set(H * 1.6, H * 0.05, 1); b.position.x = sgn * H * 0.8; piv.add(b); }
        noMir(piv); ajouter(piv); anim.push((t) => { piv.rotation.y = t * 0.7; });
      }
    }
    return grp;
  };
  /** Réverbère parisien (fût noir, lanterne, halo). Renvoie les items à instancier par appel groupé. */
  P.reverberes = (liste, { h = 4.6, couleur = '#ffcf80', halo = true } = {}) => {
    const futs = [], lant = [];
    for (const [x, z] of liste) { futs.push({ p: [x, h / 2, z], s: [0.16, h, 0.16] }); lant.push({ p: [x, h + 0.35, z], s: [0.5, 0.75, 0.5] }); if (halo) O.halo(x, h + 0.35, z, couleur, 4.2, 0.85); }
    O.inst(O.CYL6, O.lam('#141416'), futs); O.inst(O.CONE4, O.lum(couleur, { color: COL(couleur) }), lant.map((l) => ({ ...l, r: [Math.PI, 0, 0] })));
  };
  /** Pavés (sol) : texture 512² répétée. */
  P.texPaves = (fond, joint, var_ = 18) => tex(512, 512, (g, w, h) => {
    g.fillStyle = joint; g.fillRect(0, 0, w, h);
    const c = COL(fond); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const k = R(-var_, var_) / 255; g.fillStyle = `rgb(${Math.round((c.r + k) * 255)},${Math.round((c.g + k) * 255)},${Math.round((c.b + k * 0.8) * 255)})`; const ox = (j % 2) * 16; g.beginPath(); g.roundRect ? g.roundRect(i * 32 + ox + 2, j * 32 + 2, 28, 28, 6) : g.rect(i * 32 + ox + 2, j * 32 + 2, 28, 28); g.fill(); }
  }, true);
  return P;
}

/* ================================================================ U04 « Le Gilet Jaune » : Paris barricadé */
function decorGiletJaune(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter } = O;
  const P = paris(O);
  O.ciel({ haut: '#59606b', milieu: '#a4a49c', bas: '#d9c89a', nuages: 0.95 });
  const kit = P.kit('sale');
  P.rangee(kit, -70, -24, 80, -24, 0, { trous: [[52, 64], [104, 116]] });                // rue du fond (façades vers +z)
  P.rangee(kit, -22, 30, -22, -23.9, Math.PI / 2, { trous: [[18, 30]] });                 // rue de gauche (façades vers +x)
  P.rangee(kit, 34, -23.9, 34, 8, -Math.PI / 2, { nMax: 5 });                             // angle de droite
  kit.fin();
  // gilet jaune (texture) : jaune fluo, bandes rétro-réfléchissantes
  const gilet = tex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#e6ff1a';
    g.beginPath(); g.moveTo(40, 40); g.lineTo(95, 20); g.quadraticCurveTo(128, 70, 161, 20); g.lineTo(216, 40); g.lineTo(230, 240); g.lineTo(26, 240); g.closePath(); g.fill();
    g.fillStyle = '#c9cfd3'; for (const y of [150, 195]) g.fillRect(28, y, 200, 16); g.fillRect(70, 30, 14, 120); g.fillRect(172, 30, 14, 120);
    g.strokeStyle = 'rgba(80,90,0,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 70); g.lineTo(128, 240); g.stroke();
  });
  const mGilet = basic({ map: gilet, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, toneMapped: false });
  // barricades : palettes, mobilier urbain, barrières, pavés
  const palette = tex(256, 128, (g, w, h) => { g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { g.fillStyle = ['#b08a58', '#a37f50', '#9a774a'][i % 3]; g.fillRect(0, i * 26 + 3, w, 20); g.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 4; k++) g.fillRect(k * 70 + 10, i * 26 + 9, 4, 4); } });
  const mPal = O.lam('#ffffff', { map: palette });
  const pal = [], bancs = [], pav = [], pneus = [], poub = [];
  const barricade = (x, z, L, ry, haut = 4) => {
    const ux = Math.cos(ry), uz = -Math.sin(ry);
    for (let i = 0; i < L / 1.3; i++) for (let j = 0; j < 1 + Math.floor(rnd() * haut); j++) {
      const s = i * 1.3 + R(-0.2, 0.2);
      pal.push({ p: [x + ux * s + R(-0.3, 0.3), 0.08 + j * 0.3 + (j > 1 ? R(0, 0.4) : 0), z + uz * s + R(-0.4, 0.4)], s: [1.2, 0.16, 1.0], r: [R(-0.3, 0.3) + (j > 1 ? R(-0.6, 0.6) : 0), ry + R(-0.5, 0.5), R(-0.25, 0.25)] });
    }
    for (let i = 0; i < L / (haut > 4 ? 1.2 : 3); i++) { const s = rnd() * L; pal.push({ p: [x + ux * s, R(0.6, haut > 4 ? 2.6 : 1.4), z + uz * s], s: [1.2, 0.16, 1.0], r: [Math.PI / 2 + R(-0.4, 0.4), ry + R(-1, 1), 0] }); }
    for (let i = 0; i < 2; i++) { const s = rnd() * L; bancs.push({ p: [x + ux * s, R(0.7, 1.4), z + uz * s + 0.6], s: [2.2, 0.12, 0.6], r: [R(-0.6, 0.6), ry + R(-0.3, 0.3), R(-0.5, 0.5)] }); }
    for (let i = 0; i < 2; i++) { const s = rnd() * L; poub.push({ p: [x + ux * s, 0.45, z + uz * s + R(0.5, 1.4)], s: [0.6, 0.9, 0.6], r: [rnd() < 0.5 ? Math.PI / 2 : 0, 0, R(0, 1)] }); }
    // gilets posés sur la barricade
    for (let i = 0; i < Math.ceil(L / 4); i++) { const s = R(0.5, L - 0.5); const m = new THREE.Mesh(O.PLAN, mGilet); m.scale.setScalar(R(1.3, 1.7)); m.position.set(x + ux * s, R(1.0, 1.8), z + uz * s + 0.9); m.rotation.set(R(-0.9, -0.3), ry + R(-0.4, 0.4), R(-0.4, 0.4)); ajouter(m); }
  };
  barricade(-1.5, -6.4, 17, -0.15, 7); barricade(-1, -7.6, 16, -0.15, 9);           // LA barricade : juste derrière le bolide, en plein cadre
  barricade(-17, -9, 13, 0.15); barricade(17, -12, 15, -0.08); barricade(-20, 12, 9, Math.PI / 2 + 0.1);
  O.inst(O.BOX, mPal, pal);
  O.inst(O.BOX, O.lam('#4d5a3c'), bancs);                                               // bancs renversés
  O.inst(O.CYL, O.lam('#2f6b3d'), poub);                                                // corbeilles de rue
  for (let i = 0; i < 160; i++) { const a = R(-3.1, -0.05), r = R(9, 26), x = CX + r * Math.cos(a), z = r * Math.sin(a); if (x > -3 && x < 15 && z > -4) continue; pav.push({ p: [x, 0.08, z], s: [0.28, 0.16, 0.22], r: [R(0, 3), R(0, 3), R(0, 3)] }); }
  O.inst(O.BOX, O.lam('#4a4844'), pav);
  // barrières de police « Vauban » (cadre + grille)
  const grille = tex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#c8ccd0'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.lineWidth = 4; for (let x = 22; x < w - 10; x += 16) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h - 8); g.stroke(); } });
  const mGr = basic({ map: grille, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  for (const [x, z, ry, tilt] of [[-4, -14, 0.1, 0], [-1.6, -14.3, -0.2, 0.5], [24, -7, 1.2, 0], [26, -4.6, 1.5, -0.6], [-12, 3, 1.4, 0], [30, -16, 0.4, 0]]) {
    const m = new THREE.Mesh(O.PLAN, mGr); m.scale.set(2.2, 1.1, 1); m.position.set(x, 0.62, z); m.rotation.set(tilt, ry, 0); ajouter(m);
    const v = new THREE.Mesh(O.PLAN, mGilet); v.scale.setScalar(1.2); v.position.set(x + 0.2, 1.0, z + 0.04); v.rotation.set(tilt, ry, R(-0.3, 0.3)); ajouter(v);
  }
  // gilets suspendus aux balcons comme des étendards
  for (const [x, y, z, ry] of [[-30, 15.5, -23.6, 0], [-6, 9.6, -23.6, 0], [22, 15.5, -23.6, 0], [-21.6, 9.6, -8, Math.PI / 2], [46, 9.6, -23.6, 0]]) O.tissu(gilet, 3.2, 3.2, x, y, z, ry, { amp: 0.25, ancre: 'bords', mat: mGilet });
  // banderole sur drap
  const ban = O.texteTex(['ACTE XII'], { w: 1024, h: 256, fond: '#efe9dc', couleur: '#1b1b1b', police: '900 {T}px "Impact","Arial Black",sans-serif', taille: 0.78 });
  O.tissu(ban, 8, 2, 6.5, 3.3, -8.4, -0.15, { amp: 0.18, ancre: 'bords' }); for (const x of [2.6, 10.4]) O.boite(0.12, 4.2, 0.12, O.lam('#3a2a1a'), x, 0, -8.3 - (x - 2.6) * 0.15);
  // pneus qui brûlent (piles de pneus), fumée noire épaisse
  const foyers = [[0.5, 0.6, -8.6, 1.3], [13.2, 0.6, -10.6, 1.3], [-9, 0.6, -9.5, 1.1], [21, 0.6, -13, 1.2]];
  for (const [x, , z] of foyers) for (let j = 0; j < 5; j++) pneus.push({ p: [x + R(-0.3, 0.3), 0.2 + j * 0.36, z + R(-0.3, 0.3)], s: [1.6, 1.6, 1.4], r: [Math.PI / 2, 0, R(0, 3)] });
  O.inst(O.TORE, O.lam('#141414'), pneus);
  O.feux(foyers, { taille: 1.2, haut: 2.8, fumeeHaut: 34, fumeeCouleurs: ['#1a1716', '#2c2826', '#4a4642'] });
  // fumigènes jaunes : nappes épaisses au ras du sol, qui dérivent
  const fumi = [[7, 0.2, -10.5, 1.5], [27, 0.2, -9, 1.2], [-12, 0.2, -2, 1.2], [12, 0.2, -18, 1.4]];
  O.inst(O.CYL, O.lum('#ff5a1a'), fumi.map(([x, , z]) => ({ p: [x, 0.12, z], s: [0.12, 0.25, 0.12], r: [Math.PI / 2, 0, 0] })));
  O.flux({ sources: fumi, n: 34, haut: 9, vitesse: 0.09, taille: 2.4, croit: 2.6, wob: 2.2, derive: [0.9, 0, 0.25], cA: '#ffe11a', cB: '#f2cc2a', cC: '#d8c27a', alpha: 0.62, etal: 0.6 });
  fumi.forEach(([x, , z]) => O.halo(x, 0.6, z, '#ffd21a', 3.5, 0.6, 9));
  O.champ({ n: 220, taille: [90, 20, 60], centre: [CX, 8, -10], vitesse: [1.2, 0.6, 0], couleurs: ['#ffb24a', '#ff7a1a', '#ffe08a'], tailleMin: 0.05, tailleMax: 0.12, mise: 12, flou: 1, disque: 1, additif: true, alpha: 0.8 });   // braises
  // sol : bitume parisien, passage piéton
  const bit = tex(512, 512, (g, w, h) => { g.fillStyle = '#4b4b4c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.03, 0.1)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = 'rgba(20,20,20,.5)'; g.lineWidth = 2; for (let i = 0; i < 20; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += R(-30, 30); y += R(-30, 30); g.lineTo(x, y); } g.stroke(); } }, true);
  bit.repeat.set(40, 40);
  const pieton = new THREE.Mesh(O.PLAN, basic({ map: tex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(235,235,230,.85)'; for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 8, 0, 40, h); }), transparent: true }));
  pieton.scale.set(16, 4, 1); pieton.rotation.x = -Math.PI / 2; pieton.position.set(CX + 2, 0.015, -16.5); ajouter(pieton);
  O.lumiere('#ffe2a0', 1.3, -14, 12, -16); O.lumiere('#ff8a3a', 0.9, 24, 4, -10);
  return { solMat: O.sol({ map: bit, color: COL('#9a958c'), roughness: 0.82, metalness: 0.05, envI: 0.2 }), brouillard: { couleur: '#a99f7c', densite: 0.009 }, miroir: false };
}

/* ================================================================ FR01 « DS 7 Élysée » : cour d'honneur */
function decorElysee(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter } = O;
  const P = paris(O);
  O.ciel({ haut: '#3f78c8', milieu: '#a9c9ea', bas: '#eef2ee', nuages: 0.45, soleil: 0.7, couleurSoleil: '#fff2d0', dirSoleil: [-0.5, 0.35, -0.8] });
  // façade classique : rez-de-chaussée en arcades, étage, balustrade (1024 × 256 pour 64 × 16 m)
  const fac = tex(1024, 256, (g, w, h) => {
    g.fillStyle = '#e9e0cb'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 8; y < h; y += 8) g.fillRect(0, y, w, 1);
    g.fillStyle = '#d8cdb3'; g.fillRect(0, 0, w, 18); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 18, w, 4);
    for (let x = 6; x < w; x += 12) { g.fillStyle = '#cfc4aa'; g.fillRect(x, 2, 6, 14); }                       // balustrade
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 128, w, 5);
    for (let i = 0; i < 21; i++) {
      const cx = (i + 0.5) * w / 21;
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - 24, 0, 3, h); g.fillRect(cx + 21, 0, 3, h);           // pilastres
      g.fillStyle = '#3c4a58'; g.fillRect(cx - 9, 46, 18, 66); g.strokeStyle = '#f6f1e6'; g.lineWidth = 2; g.strokeRect(cx - 9, 46, 18, 66); g.beginPath(); g.moveTo(cx, 46); g.lineTo(cx, 112); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(cx - 13, 40, 26, 5);
      g.fillStyle = '#34414e'; g.beginPath(); g.moveTo(cx - 10, h - 6); g.lineTo(cx - 10, 170); g.arc(cx, 170, 10, Math.PI, 0); g.lineTo(cx + 10, h - 6); g.fill(); g.strokeStyle = '#f6f1e6'; g.stroke();
    }
  });
  const mFac = basic({ map: fac }), mFacC = basic({ map: fac, color: COL('#cfc6b2') });
  const corps = (w, h, d, x, z, ry) => { const geo = O.garde(new THREE.BoxGeometry(w, h, d)); const uv = geo.attributes.uv; for (let i = 0; i < 24; i++) { const f = Math.floor(i / 4); if (f < 2) uv.setX(i, uv.getX(i) * d / 64); else if (f > 3) uv.setX(i, uv.getX(i) * w / 64); } const m = new THREE.Mesh(geo, [mFacC, mFacC, O.bas('#5a6470'), O.bas('#5a6470'), mFac, mFac]); m.position.set(x, h / 2, z); m.rotation.y = ry; ajouter(m); const t = new THREE.Mesh(P.geoToit(w, d, 4, 1.4), O.bas('#5f6b78')); t.position.set(x, h, z); t.rotation.y = ry; ajouter(t); return m; };
  corps(66, 14, 12, CX - 4, -40, 0);                              // corps central
  corps(36, 12, 11, -32, -16, Math.PI / 2);                       // aile gauche (vers la caméra)
  corps(36, 12, 11, 44, -16, -Math.PI / 2);                       // aile droite
  // avant-corps à colonnes et fronton
  const cols = []; for (let i = 0; i < 8; i++) cols.push({ p: [CX - 4 - 7 + i * 2, 4.5, -33], s: [0.9, 9, 0.9] });
  O.inst(O.CYL, O.lam('#f2ecdf'), cols);
  O.boite(17, 1.2, 3, O.lam('#e9e0cb'), CX - 4, 9, -33.5); O.boite(17, 0.5, 3.4, O.lam('#d8cdb3'), CX - 4, 10.2, -33.5);
  const fronton = new THREE.Mesh(O.garde(new THREE.CylinderGeometry(1, 1, 1, 3)), O.lam('#efe7d6')); fronton.scale.set(9.8, 1.6, 3); fronton.rotation.x = -Math.PI / 2; fronton.position.set(CX - 4, 12.2, -33.5); ajouter(fronton);
  for (let i = 0; i < 3; i++) O.boite(16 - i * 1.4, 0.3, 2.4 - i * 0.6, O.lam('#d9d2c2'), CX - 4, i * 0.3, -30.6 + i * 0.3);
  // drapeaux tricolores (génériques) sur le toit et sur deux mâts
  const tri = tex(192, 128, (g, w, h) => { g.fillStyle = '#1d3f9a'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#f7f7f7'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#e1262d'; g.fillRect(2 * w / 3, 0, w / 3, h); });
  const mats = [[CX - 4, 18.6, -38], [-4, 0, -24], [16, 0, -24]];
  mats.forEach(([x, y0, z], i) => { const hm = i ? 9 : 5; O.cyl(0.08, hm, O.lam('#d9d9d9'), x, y0, z); O.tissu(tri, i ? 3.6 : 2.6, i ? 2.4 : 1.7, x, y0 + hm - (i ? 1.3 : 0.9), z, -0.3, { amp: 0.35 }); });
  // tapis rouge du perron au bolide
  O.boite(3, 0.02, 25, O.lam('#7a000c'), CX + 2.6, 0.005, -17.8);
  O.boite(3.2, 0.021, 25, O.lam('#c8a24a'), CX + 2.6, 0.0, -17.8);
  // gardes républicains stylisés (sans visage) : deux haies d'honneur
  const pos = []; for (let i = 0; i < 6; i++) for (const x of [CX - 0.6, CX + 5.8]) pos.push([x, -7 - i * 3.6]); for (const z of [-8, -11, -19, -22]) pos.push([-25.5, z]);
  const cor = [], jam = [], cas = [], plu = [], tete = [], sab = [], cein = [];
  for (const [x, z] of pos) {
    jam.push({ p: [x, 0.5, z], s: [0.42, 1.0, 0.3] }); cor.push({ p: [x, 1.42, z], s: [0.55, 0.85, 0.34] }); cein.push({ p: [x, 1.06, z], s: [0.58, 0.1, 0.37] });
    tete.push({ p: [x, 2.0, z], s: [0.3, 0.34, 0.3] }); cas.push({ p: [x, 2.18, z], s: [0.36, 0.36, 0.36] }); plu.push({ p: [x, 2.5, z - 0.05], s: [0.1, 0.5, 0.36] });
    sab.push({ p: [x + (x < CX + 2 && x > -20 ? 0.34 : -0.34), 1.7, z + 0.15], s: [0.05, 1.1, 0.05] });
  }
  O.inst(O.BOX, O.lam('#f2f2f2'), jam); O.inst(O.BOX, O.lam('#060c1e'), cor); O.inst(O.BOX, O.lam('#f2f2f2'), cein);
  O.inst(O.SPH, O.lam('#d9c7b2'), tete); O.inst(O.SPH, O.metal('#d8b25a', 0.3), cas); O.inst(O.BOX, O.lam('#b3121c'), plu); O.inst(O.BOX, O.metal('#e8e8f0', 0.15), sab);
  // lanternes, ifs en cônes dans des bacs
  const ifs = [], bacs = []; for (const x of [-20, -12, 26, 34]) { ifs.push({ p: [x, 2.4, -28], s: [1.8, 3.4, 1.8] }); bacs.push({ p: [x, 0.5, -28], s: [1.4, 1, 1.4] }); }
  O.inst(O.CONE8, O.lam('#2f5a2a'), ifs); O.inst(O.BOX, O.lam('#f1ede3'), bacs);
  P.reverberes([[-6, -6], [20, -6], [-6, -20], [20, -20]], { couleur: '#fff2c8', halo: false, h: 3.8 });
  const grav = tex(512, 512, (g, w, h) => { g.fillStyle = '#d8ccb2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${R(120, 255) | 0},${R(110, 230) | 0},${R(90, 200) | 0},.5)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, true);
  grav.repeat.set(50, 50);
  O.lumiere('#fff2d8', 1.8, -14, 16, -16); O.lumiere('#bcd4ff', 0.6, 24, 8, -10);
  return { solMat: O.sol({ map: grav, color: COL('#b8a888'), roughness: 0.9, metalness: 0, envI: 0.2 }), brouillard: { couleur: '#cfdcea', densite: 0.0055 }, miroir: false };
}

/* ================================================================ trois Paris différents
   FR02 Champs-Élysées de nuit : avenue haussmannienne, arbres illuminés, phares en filé, Arc de Triomphe doré au bout
   FR03 Trocadéro années 60 : ailes du palais à colonnade, fontaines, 2CV et DS garées, Tour Eiffel en face
   FR04 Montmartre, rallye urbain de nuit : butte et basilique blanche, maisons pastel, escaliers, arche « DÉPART », damiers */
const AXE = -2.3;                                                     // l'axe des monuments : derrière le bolide dans l'arrêt sur image, centre-gauche du plan large
function axe(O, r, d = 0) { const u = [Math.cos(AXE), Math.sin(AXE)], n = [-Math.sin(AXE), Math.cos(AXE)]; return [O.CX + u[0] * r + n[0] * d, u[1] * r + n[1] * d]; }
/** Deux rangées d'immeubles de part et d'autre de l'axe, façades tournées vers l'avenue. */
function avenue(O, P, kit, demi, r0, r1, opts = {}) {
  const n = [-Math.sin(AXE), Math.cos(AXE)];
  for (const cote of [1, -1]) {
    const [xa, za] = axe(O, r0, cote * demi), [xb, zb] = axe(O, r1, cote * demi);
    const ry = Math.atan2(-cote * n[0], -cote * n[1]);
    if (cote > 0) P.rangee(kit, xa, za, xb, zb, ry, opts); else P.rangee(kit, xb, zb, xa, za, ry, opts);
  }
}
/** Traînées de phares en filé le long de l'axe (blanc vers le bolide, rouge qui s'éloigne). */
function filé(O, voies, { r0 = 20, r1 = 170, n = 26, vit = [30, 60] } = {}) {
  const { THREE, R, rnd, COL, anim, ajouter, noMir } = O;
  const mats = ['#fff3d8', '#ff2a3d'].map((c) => O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })));
  const tr = [];
  for (let i = 0; i < n; i++) {
    const v = voies[i % voies.length], rouge = v > 0, m = new THREE.Mesh(O.PLAN, mats[rouge ? 1 : 0]);
    m.scale.set(R(8, 16), 0.32, 1); m.rotation.set(0, -AXE, 0); noMir(m); ajouter(m);
    tr.push({ m, v, s: R(25, 60) * (rouge ? 1 : -1), r: R(r0, r1) });
  }
  anim.push((t) => { for (const e of tr) { const L = r1 - r0, r = r0 + ((((e.r + e.s * t) - r0) % L) + L) % L, [x, z] = axe(O, r, e.v); e.m.position.set(x, 0.45, z); } });
}
/** Petite voiture des années 60 en volumes simples : '2cv' (toit en demi-tonneau) ou 'ds' (longue, nez plongeant). */
function voiture60(O, type, x, z, ry, couleur) {
  const { THREE } = O; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const m = (geo, c, sx, sy, sz, px, py, pz, rx = 0, rz = 0) => { const k = new THREE.Mesh(geo, O.lam(c)); k.scale.set(sx, sy, sz); k.position.set(px, py, pz); k.rotation.set(rx, 0, rz); g.add(k); return k; };
  if (type === '2cv') { m(O.BOX, couleur, 3.8, 0.7, 1.5, 0, 0.75, 0); m(O.CYL, couleur, 1.5, 2.4, 1.5, -0.2, 1.1, 0, 0, Math.PI / 2); m(O.BOX, '#2a3440', 2.0, 0.45, 1.52, -0.2, 1.45, 0); m(O.SPH, couleur, 1.2, 0.8, 1.5, 1.6, 0.85, 0); }
  else { m(O.BOX, couleur, 4.8, 0.6, 1.8, 0, 0.7, 0); m(O.SPH, couleur, 2.4, 0.8, 1.8, 2.0, 0.7, 0); m(O.BOX, '#2a3440', 2.2, 0.55, 1.6, -0.5, 1.25, 0); m(O.BOX, '#f4efe4', 2.3, 0.08, 1.62, -0.5, 1.55, 0); m(O.SPH, couleur, 1.8, 0.7, 1.8, -2.2, 0.75, 0); }
  for (const [px, pz] of [[1.3, 0.8], [1.3, -0.8], [-1.3, 0.8], [-1.3, -0.8]]) m(O.CYL6, '#151515', 0.7, 0.25, 0.7, px, 0.35, pz, Math.PI / 2);
  O.ajouter(g); return g;
}

function decorChampsElysees(O) {                                      // FR02
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  const P = paris(O);
  O.ciel({ haut: '#02030b', milieu: '#141c3a', bas: '#5a3a5a', nuages: 0.3 });
  const kit = P.kit('nuit', { teinteCote: '#8a8070' });
  avenue(O, P, kit, 40, 22, 175, { D: 12 }); kit.fin();
  // Arc de Triomphe au bout de l'avenue, illuminé en doré, grand drapeau dans l'arche
  const pierre = tex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ffd28a'); gr.addColorStop(1, '#a8794a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,50,20,.35)'; for (const y of [0.06, 0.1, 0.62, 0.66]) g.fillRect(0, h * y, w, 8); for (let i = 0; i < 24; i++) g.fillRect(i * 22, h * 0.07, 10, 18); g.fillStyle = 'rgba(80,50,20,.25)'; for (const [x, y] of [[0.08, 0.7], [0.72, 0.7]]) g.fillRect(w * x, h * y, w * 0.2, h * 0.22); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${R(0.02, 0.06)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
  const f = new THREE.Shape(); f.moveTo(-15, 0); f.lineTo(15, 0); f.lineTo(15, 34); f.lineTo(-15, 34); f.closePath();
  const tr = new THREE.Path(); tr.moveTo(-5.5, 0); tr.lineTo(5.5, 0); tr.lineTo(5.5, 15); tr.absarc(0, 15, 5.5, 0, Math.PI, false); tr.closePath(); f.holes.push(tr);
  const geoA = O.garde(new THREE.ExtrudeGeometry(f, { depth: 16, bevelEnabled: false, curveSegments: 12 })); geoA.translate(0, 0, -8);
  const uv = geoA.attributes.uv, pos = geoA.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 15) / 30 + pos.getZ(i) / 30, pos.getY(i) / 34);
  const [ax, az] = axe(O, 165); const arc = new THREE.Mesh(geoA, basic({ map: pierre, toneMapped: false, fog: false })); arc.position.set(ax, 0, az); arc.lookAt(CX, 0, 0); noMir(arc); ajouter(arc);
  O.halo(ax, 14, az, '#ffcf80', 70, 0.25);
  const tri = tex(192, 128, (g, w, h) => { g.fillStyle = '#1d3f9a'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#f7f7f7'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#e1262d'; g.fillRect(2 * w / 3, 0, w / 3, h); });
  const dr = O.tissu(tri, 9, 14, ax, 8.6, az, 0, { amp: 0.5, ancre: 'bords', mat: basic({ map: tri, side: THREE.DoubleSide, toneMapped: false, fog: false }) }); dr.lookAt(CX, 8.6, 0);
  // arbres illuminés pour Noël (guirlandes rouges et blanches qui scintillent)
  const houp = [], pts = [];
  for (const cote of [1, -1]) for (let r = 24; r < 160; r += 9) { const [x, z] = axe(O, r, cote * 27); houp.push({ p: [x, 6.5, z], s: [6, 7, 6] }); for (let k = 0; k < 40; k++) { const a = rnd() * 6.283, h = R(3.5, 9.5), rr = 2.9 * Math.sin(Math.PI * (h - 3) / 7) + 0.2; pts.push(x + Math.cos(a) * rr, h, z + Math.sin(a) * rr); } }
  O.inst(O.ICO, O.bas('#081008'), houp);
  const gp = O.garde(new THREE.BufferGeometry()); gp.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const ph = new Float32Array(pts.length / 3).map(() => rnd() * 50); gp.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const ug = { t: { value: 0 } };
  const gl = new THREE.Points(gp, O.garde(new THREE.ShaderMaterial({ uniforms: ug, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'uniform float t; attribute float aPh; varying vec3 vC; varying float vA; void main(){ vA = 0.55 + 0.45 * sin(t * 3.0 + aPh); vC = fract(aPh * 0.37) > 0.5 ? vec3(1.0, 0.18, 0.22) : vec3(1.0, 0.95, 0.85); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(700.0 / -mv.z, 3.0, 16.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.1, r)); }' })));
  gl.frustumCulled = false; noMir(gl); ajouter(gl); anim.push((t) => { ug.t.value = t; });
  // réverbères, phares en filé, marquage de la chaussée
  const rv = []; for (const cote of [1, -1]) for (let r = 22; r < 160; r += 14) rv.push(axe(O, r, cote * 33)); P.reverberes(rv, { couleur: '#ffcf80' });
  filé(O, [-13, -9, -5, 5, 9, 13], { n: 34 });
  const lign = []; for (let r = 20; r < 170; r += 6) for (const d of [-11, -7, 0, 7, 11]) { const [x, z] = axe(O, r, d); lign.push({ p: [x, 0.02, z], s: [d === 0 ? 0.35 : 0.18, 0.02, 3], r: [0, -AXE + Math.PI / 2, 0] }); }
  O.inst(O.BOX, O.lum('#d8d8d8', { color: COL('#8a8a8a') }), lign);
  const bit = tex(512, 512, (g, w, h) => { g.fillStyle = '#2a2a30'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${R(0.02, 0.07)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, true); bit.repeat.set(40, 40);
  O.lumiere('#ffd08a', 1.3, -14, 8, -16); O.lumiere('#ff8aa0', 0.7, 24, 6, -12);
  return { solMat: O.sol({ map: bit, color: COL('#8d8d96'), roughness: 0.2, metalness: 0.4, opacite: 0.78, envI: 0.35 }), brouillard: { couleur: '#1c1830', densite: 0.0065 }, miroir: true };
}

function decorTrocadero60(O) {                                        // FR03
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  const P = paris(O);
  O.ciel({ haut: '#7fa6c9', milieu: '#ecd8ae', bas: '#f6dca2', nuages: 0.5, soleil: 0.8, couleurSoleil: '#ffd9a0', dirSoleil: [-0.45, 0.12, -0.9] });
  // la Tour, grande, droit devant ; la Seine et l'autre rive en contrebas
  const [tx, tz] = axe(O, 175); P.tourEiffel(tx, tz, 66, { nuit: false, couleur: '#6a5440' });
  const kit = P.kit('soixante', { teinteCote: '#c7b796' }); P.rangee(kit, -200, -205, 220, -205, 0, { D: 10, H: 13 }); kit.fin();
  // les deux ailes du palais (colonnade courbe) qui encadrent la vue
  const col = tex(512, 256, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 1); for (let i = 0; i < 8; i++) { const x = i * 64 + 14; g.fillStyle = '#c9b994'; g.fillRect(x - 6, 40, 48, 200); g.fillStyle = '#5b6470'; g.fillRect(x + 6, 70, 24, 120); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x - 10, 34, 56, 8); } g.fillStyle = '#cfc2a2'; g.fillRect(0, 0, w, 30); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 30, w, 4); }, true);
  const mC = O.lam('#ffffff', { map: col });
  for (const cote of [1, -1]) for (let i = 0; i < 7; i++) { const ang = AXE + cote * (0.42 + i * 0.09), r = 46, x = CX + Math.cos(ang) * r, z = Math.sin(ang) * r; const b = O.boite(8.6, 13, 6, mC, x, 0, z); b.lookAt(CX, 6.5, 0); }
  // bassin et fontaines (jets d'eau animés)
  const [bx, bz] = axe(O, 70); const bassin = new THREE.Mesh(O.PLAN, basic({ color: COL('#5b8a96'), transparent: true, opacity: 0.85 })); bassin.scale.set(26, 60, 1); bassin.rotation.set(-Math.PI / 2, 0, -AXE + Math.PI / 2); bassin.position.set(bx, 0.03, bz); ajouter(bassin);
  const jets = []; for (let k = -3; k <= 3; k++) for (let r = 50; r <= 90; r += 10) { const [x, z] = axe(O, r, k * 3.2); jets.push([x, 0.1, z, 0.25]); }
  O.flux({ sources: jets, n: 14, haut: 7, vitesse: 0.6, taille: 0.6, croit: 1.5, conv: -0.5, wob: 0.2, derive: [0, -0.4, 0], cA: '#ffffff', cB: '#d8f0ff', cC: '#a8d0e0', alpha: 0.7, additif: true, etal: 0.2 });
  // 2CV et DS garées le long de l'esplanade, en arrière-plan
  const v = [['2cv', '#c8c2b4'], ['ds', '#1c1c22'], ['2cv', '#b8282a'], ['ds', '#e8e0cc'], ['2cv', '#5a7aa0'], ['ds', '#4a2a3a'], ['2cv', '#d8c84a'], ['ds', '#2a4a3a']];
  v.forEach(([t, c], i) => voiture60(O, t, -16 + i * 5.6, -11.5, 0.12 + (i % 2) * 0.06, c));
  // réverbères, colonne d'affichage, drapeau, poussière dorée
  P.reverberes([[-20, -7], [-8, -14], [20, -14], [30, -7]], { couleur: '#f1e3c0', halo: false });
  O.cyl(0.75, 0.5, O.lam('#2d5a3c'), -18, 0, -2);
  const aff = O.texteTex(['CINÉMA', 'NOUVEAU FILM'], { w: 512, h: 512, fond: '#f2c84b', couleur: '#8a1c1c', police: '900 {T}px Georgia,serif', taille: 0.5 });
  O.boite(1.6, 2.4, 1.6, O.lam('#ffffff', { map: aff }), -18, 0.5, -2, 0.6, O.CYL); O.boite(1.8, 0.7, 1.8, O.lam('#2d5a3c'), -18, 2.6, -2, 0, O.SPH);
  O.champ({ n: 160, taille: [80, 20, 50], centre: [CX, 8, -14], vitesse: [0.3, 0.1, 0], couleurs: ['#fff1cf', '#ffe0a0'], tailleMin: 0.3, tailleMax: 0.8, mise: 14, flou: 1, disque: 1, alpha: 0.2 });
  const dalles = P.texPaves('#c9b998', '#8f8270', 14); dalles.repeat.set(60, 60);
  O.lumiere('#ffe2b0', 1.5, -14, 14, -18); O.lumiere('#ffd9a0', 0.7, 24, 6, -12);
  return { solMat: O.sol({ map: dalles, color: COL('#857760'), roughness: 0.8, metalness: 0.02, envI: 0.2 }), brouillard: { couleur: '#d9c6a0', densite: 0.006 }, miroir: false };
}

function decorMontmartreRallye(O) {                                   // FR04
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  const P = paris(O);
  O.ciel({ haut: '#03030c', milieu: '#1a1238', bas: '#6a2a4a', nuages: 0.35 });
  // la butte et la basilique blanche illuminée
  const [hx, hz] = axe(O, 150);
  const butte = new THREE.Mesh(O.SPH, O.lam('#14201a')); butte.scale.set(170, 34, 120); butte.position.set(hx, -3, hz); ajouter(butte);
  const blanc = basic({ color: COL('#fff4e2'), toneMapped: false, fog: false }), ombre = basic({ color: COL('#c8bca8'), fog: false });
  const bas = new THREE.Group(); bas.position.set(hx, 13, hz); bas.lookAt(CX, 13, 0); ajouter(bas); noMir(bas);
  const pc = (geo, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); bas.add(m); return m; };
  pc(O.BOX, ombre, 26, 9, 14, 0, 4.5, 0); pc(O.CYL, blanc, 9, 5, 9, 0, 11.5, -1); pc(O.SPH, blanc, 9.4, 11, 9.4, 0, 14, -1); pc(O.CYL6, blanc, 1.4, 3, 1.4, 0, 20.5, -1); pc(O.CONE8, blanc, 1.6, 2, 1.6, 0, 23, -1);
  for (const s of [-1, 1]) { pc(O.CYL, blanc, 4, 3, 4, s * 9, 10, 2); pc(O.SPH, blanc, 4.2, 5, 4.2, s * 9, 12, 2); pc(O.CYL, blanc, 3, 2.5, 3, s * 7, 9.5, -6); pc(O.SPH, blanc, 3.2, 4, 3.2, s * 7, 11, -6); }
  pc(O.BOX, blanc, 4, 18, 4, 0, 9, -9); pc(O.SPH, blanc, 4.4, 5, 4.4, 0, 19, -9);
  const porche = tex(256, 128, (g, w, h) => { g.fillStyle = '#fff4e2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2430'; for (let i = 0; i < 3; i++) { const x = 40 + i * 80; g.beginPath(); g.moveTo(x - 22, h); g.lineTo(x - 22, 50); g.arc(x, 50, 22, Math.PI, 0); g.lineTo(x + 22, h); g.fill(); } });
  pc(O.PLAN, basic({ map: porche, toneMapped: false, fog: false }), 20, 8, 1, 0, 4, 7.05);
  O.halo(hx, 26, hz, '#fff0d8', 80, 0.25);
  // maisons pastel de la Butte, volets, cafés aux stores rouges
  const maison = (c) => tex(512, 512, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${R(0.02, 0.05)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } for (let e = 0; e < 3; e++) for (let i = 0; i < 4; i++) { const x = 40 + i * 120, y = 40 + e * 110, on = rnd() < 0.6; g.fillStyle = on ? '#ffcf80' : '#1a1c26'; g.fillRect(x, y, 44, 70); g.fillStyle = ['#3a6a4a', '#3a5a8a', '#6a3a3a'][e % 3]; g.fillRect(x - 18, y, 16, 70); g.fillRect(x + 46, y, 16, 70); } for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#b8282a' : '#f4ead8'; g.fillRect(x, 380, 32, 26); } g.fillStyle = '#ffcf80'; g.fillRect(30, 420, 450, 92); g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 30; x < 480; x += 75) g.fillRect(x, 420, 5, 92); });
  const mats = ['#e8d0a0', '#d8a8a0', '#a8c4b0', '#e0c88a', '#c8b8d8'].map((c) => O.lam('#ffffff', { map: maison(c) }));
  const n = [-Math.sin(AXE), Math.cos(AXE)];
  for (const cote of [1, -1]) for (let r = 18; r < 100; r += 10.5) { const [x, z] = axe(O, r, cote * 17); const h = R(11, 14); const b = O.boite(10, h, 8, mats[Math.floor(rnd() * 5)], x, Math.max(0, (r - 40) * 0.12), z); b.lookAt(x - cote * n[0] * 10, b.position.y, z - cote * n[1] * 10); O.boite(10.4, 2.4, 8.4, O.lam('#3a3238'), x, b.position.y + h / 2, z, b.rotation.y + Math.PI / 4, O.CONE4); }
  // escaliers de la Butte (marches + rampes + réverbères) à gauche
  const marches = []; for (let k = 0; k < 24; k++) { const [x, z] = axe(O, 40 + k * 1.6, -6); marches.push({ p: [x, k * 0.6 + 0.3, z], s: [6, 0.6, 1.8], r: [0, -AXE + Math.PI / 2, 0] }); }
  O.inst(O.BOX, O.lam('#8a8278'), marches);
  const rvM = []; for (let k = 0; k < 24; k += 6) { const [x, z] = axe(O, 40 + k * 1.6, -9.5); rvM.push([x, z]); } P.reverberes(rvM, { couleur: '#ffcf80' });
  // ambiance rallye : arche « DÉPART » en damier, drapeaux à damier, bottes de paille, cônes, projecteurs
  const damier = tex(128, 128, (g, w) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; g.fillRect(i * 16, j * 16, 16, 16); } }, true);
  const mD = O.lam('#ffffff', { map: damier });
  for (const x of [-3, 18]) O.boite(0.8, 6.5, 0.8, mD, x, 0, -9);
  const ban = O.texteTex('DÉPART', { w: 1024, h: 160, fond: '#d9001b', couleur: '#ffffff', bord: '#ffffff', police: 'italic 900 {T}px "Arial Black",sans-serif', taille: 0.7 });
  O.boite(22, 1.8, 0.5, mD, 7.5, 6.5, -9); O.plaque(ban, 18, 1.5, 7.5, 7.4, -8.7, { ry: 0, double: false, toneMapped: false });
  for (const [x, z] of [[-6, -10], [22, -10]]) { O.cyl(0.05, 5, O.lam('#ddd'), x, 0, z); O.tissu(damier, 2.6, 1.8, x, 4.2, z, 0.3, { amp: 0.4, vit: 6 }); }
  const bottes = []; for (let i = 0; i < 12; i++) bottes.push({ p: [-14 + i * 2.6, 0.45, -6.5 - (i % 2) * 0.2], s: [2.4, 0.9, 1.1], c: '#d8b860' }); O.inst(O.BOX, O.lam('#ffffff'), bottes.filter((b) => b.p[0] < -2 || b.p[0] > 15));
  const cones = []; for (let i = 0; i < 10; i++) cones.push({ p: [-12 + i * 3.6, 0.4, -5], s: [0.5, 0.8, 0.5] }); O.inst(O.CONE8, O.lam('#ff6a00'), cones.filter((c) => c.p[0] < -2 || c.p[0] > 15));
  const chrono = document.createElement('canvas'); chrono.width = 512; chrono.height = 128; const cg = chrono.getContext('2d'), ct = O.garde(new THREE.CanvasTexture(chrono));
  let der = -1; const dessin = (t) => { cg.fillStyle = '#050505'; cg.fillRect(0, 0, 512, 128); cg.fillStyle = '#ffd21a'; cg.font = '900 80px "Courier New",monospace'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; const s = t % 100; cg.fillText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`, 256, 68); ct.needsUpdate = true; };
  dessin(0); O.boite(5.4, 1.6, 0.3, O.bas('#111'), 24, 4.2, -12); O.plaque(ct, 5, 1.25, 24, 5, -11.8, { ry: 0, double: false, toneMapped: false }); O.boite(0.3, 4.2, 0.3, O.lam('#333'), 24, 0, -12);
  anim.push((t) => { if (t - der > 0.1) { der = t; dessin(t); } });
  const beams = []; for (const x of [-10, 26]) { const piv = new THREE.Group(); piv.position.set(x, 0.5, -14); const c = new THREE.Mesh(O.garde(new THREE.CylinderGeometry(3, 0.3, 40, 14, 1, true)), O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL('#e8f0ff'), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))); c.position.y = 20; piv.add(c); noMir(piv); ajouter(piv); beams.push({ piv, ph: rnd() * 6 }); }
  anim.push((t) => { for (const b of beams) b.piv.rotation.set(Math.sin(t * 0.5 + b.ph) * 0.4, 0, Math.cos(t * 0.4 + b.ph) * 0.5); });
  const paves = P.texPaves('#4a4a52', '#121218'); paves.repeat.set(70, 70);
  O.lumiere('#ffd08a', 1.3, -14, 8, -16); O.lumiere('#ff6a8a', 0.8, 24, 6, -12);
  return { solMat: O.sol({ map: paves, color: COL('#8d8d96'), roughness: 0.4, metalness: 0.2, envI: 0.3 }), brouillard: { couleur: '#241a30', densite: 0.0075 }, miroir: false };
}

/* ================================================================ F01–F10 : dix paddocks différents, des trophées partout (à la mesure du palmarès)
   Couleurs d'équipe uniquement (aucun logo, aucun sponsor). Chaque écurie a son architecture et ses accessoires :
     F01 labo         ailettes argent, LED turquoise, mur de trophées du sol au plafond + tour-présentoir tournante (saturé)
     F02 tribune      portiques en treillis, projecteurs qui balaient, pyramide-podium de trophées + murs pleins (saturé, ça déborde)
     F03 arches       stand rouge, niches en arcades dorées garnies de coupes, ruban vert-blanc-rouge, « BOX-BOX »
     F04 verre        showroom blanc, cloisons vitrées liserées papaye, rotonde de verre (palmarès mesuré)
     F05 salon        lambris vert anglais, bibliothèque en bois, canapé capitonné, lampadaire (quelques trophées)
     F06 alpes        fresque de montagnes au couchant, étagère flottante, télécabine qui passe (quelques trophées)
     F07 brique       vieux garage en brique, étagères de bois pleines de trophées ternis, photos sépia, suspensions d'atelier
     F08 graffiti     mur de street-art, petite étagère éclairée (trois trophées)
     F09 néon         quadrillage de néons vert fluo, socles lumineux (quatre trophées)
     F10 conteneurs   murs de conteneurs maritimes empilés, deux petites coupes sur un conteneur, sous un projecteur */
const ECURIES = {
  F01: { archi: 'labo', base: '#15181d', a: '#00d2be', b: '#c5cad0', sol: '#2a2e34', n: 250, titre: 'SALLE DES TROPHÉES' },
  F02: { archi: 'tribune', base: '#141d3c', a: '#e0103e', b: '#ffc906', sol: '#1d2338', n: 290, titre: 'SALLE DES TROPHÉES' },
  F03: { archi: 'arches', base: '#b00000', a: '#ffe600', b: '#1a1a1a', sol: '#3a1616', n: 150, titre: 'BOX-BOX' },
  F04: { archi: 'verre', base: '#f1f1ef', a: '#ff8000', b: '#47c7fc', sol: '#3a3a3c', n: 42, titre: 'TROPHÉES' },
  F05: { archi: 'salon', base: '#0b3d33', a: '#cedc00', b: '#e8e8e8', sol: '#2a1d14', n: 9, titre: 'TROPHÉES' },
  F06: { archi: 'alpes', base: '#0b4fa0', a: '#ff87bc', b: '#ffffff', sol: '#1e2638', n: 11, titre: 'TROPHÉES' },
  F07: { archi: 'brique', base: '#041e42', a: '#00a0de', b: '#ffffff', sol: '#3a3430', n: 95, terni: true, titre: 'SOUVENIRS' },
  F08: { archi: 'graffiti', base: '#f2f3f5', a: '#1634cb', b: '#e8102e', sol: '#2c2f36', n: 3, titre: 'TROPHÉES' },
  F09: { archi: 'neon', base: '#0a0a0a', a: '#52e252', b: '#1e1e1e', sol: '#121512', n: 4, titre: 'TROPHÉES' },
  F10: { archi: 'conteneurs', base: '#dfe1e4', a: '#d9001b', b: '#1b1b1b', sol: '#34363a', n: 2, titre: 'TROPHÉES' },
};
function decorBoxF1(O, code) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  const E = ECURIES[code], A = E.archi;
  O.ciel({ haut: '#050608', milieu: '#0d0f14', bas: '#1a1d24', nuages: 0 });
  const ZF = -15.3;                                                   // mur du fond
  /* ---------- murs : texture propre à chaque architecture */
  const murTex = () => tex(1024, 512, (g, w, h) => {
    g.fillStyle = E.base; g.fillRect(0, 0, w, h);
    if (A === 'labo') { for (let x = 0; x < w; x += 64) { const gr = g.createLinearGradient(x, 0, x + 64, 0); gr.addColorStop(0, '#2a2f36'); gr.addColorStop(0.5, '#5d646d'); gr.addColorStop(1, '#22262b'); g.fillStyle = gr; g.fillRect(x + 2, 0, 60, h); } g.fillStyle = E.a; for (let x = 0; x < w; x += 256) g.fillRect(x + 30, 0, 4, h); }
    else if (A === 'tribune') { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? E.a : E.b; g.beginPath(); g.moveTo(i * 200 - 100, h); g.lineTo(i * 200 + 60, 0); g.lineTo(i * 200 + 90, 0); g.lineTo(i * 200 - 70, h); g.fill(); } }
    else if (A === 'arches') { g.fillStyle = '#7a0000'; g.fillRect(0, h * 0.8, w, h * 0.2); g.fillStyle = E.a; g.fillRect(0, h * 0.78, w, 8); }
    else if (A === 'verre') { g.strokeStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.fillStyle = E.a; g.fillRect(0, h * 0.62, w, 10); }
    else if (A === 'salon') { for (let x = 0; x < w; x += 96) { g.fillStyle = '#0e4a3d'; g.fillRect(x + 6, h * 0.45, 84, h * 0.5); g.strokeStyle = '#06261f'; g.lineWidth = 4; g.strokeRect(x + 10, h * 0.5, 76, h * 0.4); } g.fillStyle = '#6b4a2a'; g.fillRect(0, h * 0.43, w, 10); g.fillStyle = '#3a2614'; g.fillRect(0, h * 0.94, w, h * 0.06); }
    else if (A === 'alpes') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b4fb0'); gr.addColorStop(0.55, '#ff9cc8'); gr.addColorStop(0.75, '#ffd6e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (const [c, y0, amp] of [['#8a9ad8', 0.5, 0.3], ['#e8eefc', 0.62, 0.25], ['#4a5fa8', 0.78, 0.15]]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * (y0 - amp * Math.abs(Math.sin(x * 0.006 + y0 * 9)) * (0.6 + 0.4 * Math.sin(x * 0.021)))); g.lineTo(w, h); g.fill(); }
      g.fillStyle = '#0b2a6a'; g.fillRect(0, h * 0.9, w, h * 0.1); }
    else if (A === 'brique') { g.fillStyle = '#5a2f22'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = ((y / 16) % 2) * 24; x < w; x += 48) { g.fillStyle = `rgb(${R(110, 150) | 0},${R(52, 72) | 0},${R(38, 52) | 0})`; g.fillRect(x + 1, y + 1, 45, 13); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * 0.85, w, h * 0.15); g.fillStyle = E.base; g.fillRect(0, h * 0.82, w, 14); }
    else if (A === 'graffiti') { const cs = ['#1634cb', '#e8102e', '#ffd21a', '#22c55e', '#ff4fd8', '#111']; for (let i = 0; i < 26; i++) { g.fillStyle = cs[i % 6]; g.beginPath(); g.ellipse(rnd() * w, R(0.2, 0.85) * h, R(30, 90), R(20, 60), R(0, 3), 0, 6.3); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 5; g.stroke(); }
      g.font = '900 120px "Impact","Arial Black",sans-serif'; g.lineWidth = 10; for (const [t, x, y, c] of [['GO!', 140, 210, '#ffd21a'], ['WOW', 520, 330, '#1634cb'], ['VROOM', 780, 190, '#e8102e']]) { g.strokeStyle = '#111'; g.strokeText(t, x, y); g.fillStyle = c; g.fillText(t, x, y); } }
    else if (A === 'neon') { g.strokeStyle = E.a; g.lineWidth = 3; g.shadowColor = E.a; g.shadowBlur = 12; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 32; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.shadowBlur = 0; }
    else if (A === 'conteneurs') { g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, w, h); }
    if (A !== 'alpes' && A !== 'brique' && A !== 'graffiti') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  });
  const mMur = basic({ map: murTex() }), mMurC = basic({ map: mMur.map, color: COL('#b8b8b8') });
  const HM = A === 'brique' ? 9 : 12;
  O.boite(66, HM, 0.6, mMur, CX, 0, ZF); O.boite(0.6, HM, 30, mMurC, -16.3, 0, -1); O.boite(0.6, HM, 22, mMurC, 34.3, 0, -5);
  O.boite(66, 0.5, 32, O.bas('#0b0c10'), CX, HM, -1);
  /* ---------- trophées : emplacements fournis par l'architecture, remplis dans l'ordre (les plus visibles d'abord) */
  const geoCoupe = O.garde(new THREE.LatheGeometry([[0.2, 0], [0.2, 0.06], [0.05, 0.1], [0.05, 0.34], [0.24, 0.48], [0.29, 0.66], [0.31, 0.8]].map(([a, b]) => new THREE.Vector2(a, b)), 7));
  const geoAmph = O.garde(new THREE.LatheGeometry([[0.16, 0], [0.16, 0.12], [0.06, 0.18], [0.17, 0.5], [0.19, 0.72], [0.1, 0.9], [0.15, 1.0]].map(([a, b]) => new THREE.Vector2(a, b)), 7));
  const T = !!E.terni;
  const or = O.metal(T ? '#9c7a36' : '#ffd36a', T ? 0.55 : 0.3, { emissive: COL(T ? '#2a1c00' : '#5a3a00'), side: THREE.DoubleSide });
  const argent = O.metal(T ? '#8e8c84' : '#e4e8ee', T ? 0.5 : 0.22, { emissive: COL(T ? '#1a1a18' : '#2a2c30'), side: THREE.DoubleSide });
  const slots = [], tA = [], tB = [];
  const poser = (p, s = 1, couche = false) => { const it = { p, s: s * R(0.85, 1.2), r: couche ? [R(-0.3, 0.3), R(0, 6), Math.PI / 2 + R(-0.3, 0.3)] : [0, R(0, 6), 0] }; (rnd() < 0.6 ? tA : tB).push(it); };
  const cadres = [], tabl = [];
  /** Étagère : L de large, niveaux espacés de pas, contre un mur (ry) ; ses emplacements reçoivent une priorité (plus petit = rempli d'abord). */
  const etagere = (cx, cz, ry, L, niveaux, { y0 = 0.5, pas = 1.15, prio = 0, cadre = true, parNiveau = null } = {}) => {
    const ux = Math.cos(ry), uz = -Math.sin(ry), nx = Math.sin(ry), nz = Math.cos(ry), n = parNiveau || Math.max(1, Math.floor(L / 0.62));
    if (cadre) { for (const s of [-L / 2, L / 2]) cadres.push({ p: [cx + ux * s, y0 + niveaux * pas / 2 - 0.3, cz + uz * s], s: [0.12, niveaux * pas + 0.4, 0.62], r: [0, ry, 0] }); }
    for (let j = 0; j < niveaux; j++) {
      const y = y0 + j * pas; tabl.push({ p: [cx, y - 0.03, cz], s: [L, 0.05, 0.6], r: [0, ry, 0] });
      for (let i = 0; i < n; i++) { const s = (i - (n - 1) / 2) * (L / n); slots.push({ p: [cx + ux * s + nx * 0.05, y, cz + uz * s + nz * 0.05], prio: prio + Math.abs(s) * 0.02 + j * 0.01 + rnd() * 0.01, s: j === niveaux - 1 ? 0.95 : 1.1 }); }
    }
  };
  const halos = (liste, c, t = 6, op = 0.5) => liste.forEach(([x, y, z]) => O.halo(x, y, z, c, t, op));
  const titre = (x, y, w = 13, h = 1.9) => O.plaque(O.texteTex(E.titre, { w: 1024, h: 150, fond: 'rgba(8,8,12,.88)', couleur: '#ffffff', lueur: E.a, bord: E.a, police: '900 {T}px "Arial Black","Helvetica Neue",sans-serif', taille: 0.6 }), w, h, x, y, ZF + 2.9, { ry: 0, double: false, toneMapped: false, transparent: false });
  const ecran = (x, y, z, ry = 0, w = 4.3, h = 2.3) => { const t = tex(512, 256, (g, W, H) => { g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H); g.strokeStyle = E.a; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); for (let xx = 0; xx < W; xx += 8) g.lineTo(xx, H * (0.25 + k * 0.25) + Math.sin(xx * 0.05 + k * 2) * 18 + R(-6, 6)); g.stroke(); g.strokeStyle = k ? E.b : '#ffffff'; } }); O.boite(w + 0.3, h + 0.3, 0.2, O.bas('#0c0d10'), x, y - h / 2 - 0.15, z - 0.12, ry); O.plaque(t, w, h, x, y, z, { ry, double: false, toneMapped: false }); };
  const pneus = (liste, c) => { const fl = tex(64, 64, (g, w, h) => { g.fillStyle = '#121212'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, h * 0.42, w, h * 0.16); }); const it = []; for (const [x, z, n] of liste) for (let j = 0; j < n; j++) it.push({ p: [x, 0.17 + j * 0.34, z], s: [0.72, 0.34, 0.72], c: c || ['#e8102e', '#ffd21a', '#f4f4f4'][Math.floor(rnd() * 3)] }); O.inst(O.CYL, O.lam('#ffffff', { map: fl }), it); };
  /* ---------- architectures */
  if (A === 'labo') {                                                 // F01 : laboratoire argent, mur de trophées total, tour tournante
    etagere(5, ZF + 0.4, 0, 30, 8, { pas: 1.2 });
    etagere(-15.9, -7, Math.PI / 2, 14, 8, { pas: 1.2, prio: 2 });
    const ail = []; for (let x = -14; x <= 24; x += 3.75) ail.push({ p: [x, 6, ZF + 1.2], s: [0.12, 12, 1.6] }); O.inst(O.BOX, O.metal('#c5cad0', 0.25), ail);
    for (let x = -12; x <= 22; x += 7.5) O.boite(0.08, 11, 0.08, O.lum(E.a), x + 1.9, 0.2, ZF + 0.7);
    const tour = new THREE.Group(); tour.position.set(25, 0, -9); ajouter(tour); noMir(tour);
    const coeur = new THREE.Mesh(O.CYL, O.lum(E.a, { color: COL(E.a).multiplyScalar(0.6) })); coeur.scale.set(0.8, 9, 0.8); coeur.position.y = 4.5; tour.add(coeur);
    const tt = []; for (let j = 0; j < 7; j++) { const pl = new THREE.Mesh(O.CYL, basic({ color: COL('#cfe8ff'), transparent: true, opacity: 0.4 })); pl.scale.set(4, 0.06, 4); pl.position.y = 0.6 + j * 1.25; tour.add(pl); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; tt.push({ p: [Math.cos(a) * 1.5, 0.63 + j * 1.25, Math.sin(a) * 1.5], s: R(0.9, 1.15), r: [0, a, 0] }); } }
    O.inst(geoCoupe, or, tt, tour); anim.push((t) => { tour.rotation.y = t * 0.35; });
    halos([[25, 9.5, -9]], E.a, 8, 0.6);
    for (let i = 0; i < 40; i++) poser([-12 + rnd() * 30, 0, ZF + 1.6 + Math.pow(rnd(), 1.5) * 3], R(1, 1.4), rnd() < 0.3);
    titre(7, 9.75, 12, 1.5); ecran(-9, 9.2, -14.85, 0, 4, 1.8);
  } else if (A === 'tribune') {                                       // F02 : portiques en treillis, pyramide-podium qui déborde
    etagere(-6, ZF + 0.4, 0, 18, 7, { pas: 1.25, prio: 1 }); etagere(18, ZF + 0.4, 0, 14, 7, { pas: 1.25, prio: 1 });
    etagere(-15.9, -6, Math.PI / 2, 16, 7, { pas: 1.25, prio: 3 });
    const marches = []; for (let k = 0; k < 5; k++) { const L = 14 - k * 2.6, d = 5 - k * 0.9; marches.push({ p: [7, 0.35 + k * 0.7, -10.6 + k * 0.1], s: [L, 0.7, d], c: k % 2 ? E.a : '#20284a' }); for (let i = 0; i < Math.floor(L / 0.6); i++) for (let r = 0; r < 2; r++) slots.push({ p: [7 - L / 2 + 0.3 + i * 0.6, 0.7 + k * 0.7, -10.6 + k * 0.1 + (r - 0.5) * d * 0.5], prio: k * 0.05, s: 1.2 }); }
    O.inst(O.BOX, O.lam('#ffffff'), marches);
    const tr = []; for (const z of [-11, -3]) { for (let x = -14; x <= 30; x += 1.5) { tr.push({ p: [x, 10.2, z], s: [1.5, 0.08, 0.08] }); tr.push({ p: [x, 9.2, z], s: [1.5, 0.08, 0.08] }); tr.push({ p: [x + 0.75, 9.7, z], s: [0.08, 1.4, 0.08], r: [0, 0, 0.6] }); } }
    for (const x of [-14, 30]) for (const z of [-11, -3]) tr.push({ p: [x, 5, z], s: [0.3, 10, 0.3] });
    O.inst(O.BOX, O.metal('#9aa0a8', 0.4), tr);
    const beams = []; for (const x of [-6, 7, 20]) { const piv = new THREE.Group(); piv.position.set(x, 9, -11); const c = new THREE.Mesh(O.garde(new THREE.CylinderGeometry(0.2, 2.6, 12, 14, 1, true)), O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL(x === 7 ? E.b : E.a), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))); c.position.y = -6; piv.add(c); noMir(piv); ajouter(piv); beams.push({ piv, ph: rnd() * 6 }); O.halo(x, 9, -11, '#ffffff', 3, 0.9); }
    anim.push((t) => { for (const b of beams) b.piv.rotation.set(Math.sin(t * 0.8 + b.ph) * 0.45, 0, Math.cos(t * 0.6 + b.ph) * 0.35); });
    for (let i = 0; i < 26; i++) poser([-14 + rnd() * 9, 0, ZF + 1.4 + rnd() * 4], R(1, 1.5), rnd() < 0.35);
    for (let i = 0; i < 20; i++) poser([24 + rnd() * 8, 0, -12 + rnd() * 5], R(1, 1.5), rnd() < 0.35);
    titre(7, 9.75, 12, 1.5); pneus([[27, -13, 4], [28.4, -13, 4], [32, -6, 3]]);
  } else if (A === 'arches') {                                        // F03 : niches dorées en arcades
    const forme = new THREE.Shape(); forme.moveTo(-26, 0); forme.lineTo(32, 0); forme.lineTo(32, 10); forme.lineTo(-26, 10); forme.closePath();
    for (let i = 0; i < 6; i++) { const c = -20 + i * 9.4, a = new THREE.Path(); a.moveTo(c - 3.4, 0.3); a.lineTo(c + 3.4, 0.3); a.lineTo(c + 3.4, 6); a.absarc(c, 6, 3.4, 0, Math.PI, false); a.closePath(); forme.holes.push(a); }
    const facade = new THREE.Mesh(O.garde(new THREE.ExtrudeGeometry(forme, { depth: 0.8, bevelEnabled: false, curveSegments: 10 })), O.lam(E.base)); facade.position.set(0, 0, ZF + 1.6); ajouter(facade);
    const fondOr = O.lum('#ffcf5a', { color: COL('#c89a3a') });
    for (let i = 0; i < 6; i++) { const c = -20 + i * 9.4; O.boite(6.8, 9.4, 0.1, fondOr, c, 0, ZF + 0.5); etagere(c, ZF + 1.05, 0, 6.2, 6, { pas: 1.3, prio: Math.abs(c - 7) * 0.05, cadre: false }); O.halo(c, 9.2, ZF + 2, '#ffd27a', 7, 0.45); }
    O.boite(58, 0.5, 1.0, O.lam(E.a), 3, 10, ZF + 2); const ital = tex(256, 16, (g, w, h) => { g.fillStyle = '#009246'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#ffffff'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#ce2b37'; g.fillRect(2 * w / 3, 0, w / 3, h); });
    O.boite(58, 0.35, 1.02, O.lam('#ffffff', { map: ital }), 3, 10.5, ZF + 2);
    for (let i = 0; i < 10; i++) poser([-18 + rnd() * 40, 0, ZF + 2.6 + rnd() * 1.5], R(1, 1.3), rnd() < 0.2);
    titre(7, 10.9, 9, 1.3); pneus([[27, -12, 4], [28.4, -12, 4]], '#e8102e');
  } else if (A === 'verre') {                                         // F04 : showroom blanc et rotonde de verre
    const verre = basic({ color: COL('#d8f0ff'), transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    for (const x of [-12, -4, 18, 26]) { O.boite(0.08, 7, 6, verre, x, 0, -10); O.boite(0.14, 0.14, 6, O.lum(E.a), x, 7, -10); O.boite(0.14, 7, 0.14, O.lum(E.a), x, 0, -7); }
    const rot = new THREE.Group(); rot.position.set(7, 0, -11.5); ajouter(rot); noMir(rot);
    const cyl = new THREE.Mesh(O.garde(new THREE.CylinderGeometry(3.2, 3.2, 6.5, 32, 1, true)), verre); cyl.position.y = 3.6; rot.add(cyl);
    const socle = new THREE.Mesh(O.CYL, O.lam(E.a)); socle.scale.set(6.8, 0.4, 6.8); socle.position.y = 0.2; rot.add(socle);
    const chap = new THREE.Mesh(O.CYL, O.lam('#ffffff')); chap.scale.set(6.8, 0.3, 6.8); chap.position.y = 7; rot.add(chap);
    for (let j = 0; j < 4; j++) { const pl = new THREE.Mesh(O.CYL, O.lam('#f4f4f4')); pl.scale.set(5.6, 0.06, 5.6); pl.position.y = 0.5 + j * 1.6; rot.add(pl); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; slots.push({ p: [7 + Math.cos(a) * 2.2, 0.53 + j * 1.6, -11.5 + Math.sin(a) * 2.2], prio: j * 0.01 + i * 0.001, s: 1.15 }); } }
    O.halo(7, 7.6, -11.5, E.a, 10, 0.5); O.ptLumiere('#ffffff', 1.0, 14, 7, 6, -7);
    etagere(-8, ZF + 0.4, 0, 6, 3, { pas: 1.3, prio: 5, parNiveau: 4 });
    titre(7, 9.6, 10, 1.5); ecran(20, 6, ZF + 0.4); ecran(26, 6, ZF + 0.4);
  } else if (A === 'salon') {                                         // F05 : salon anglais, bibliothèque en bois
    const bois = O.lam('#5a3a22');
    O.boite(12, 6.5, 0.8, bois, 7, 0, ZF + 0.8); etagere(7, ZF + 1.0, 0, 11, 5, { pas: 1.2, prio: 0, cadre: false, parNiveau: 3 });
    O.boite(4.4, 0.9, 1.6, O.lam('#0b3d33'), 1, 0, -10); O.boite(4.4, 1.0, 0.5, O.lam('#0b3d33'), 1, 0.9, -10.6); for (const s of [-1, 1]) O.boite(0.5, 1.5, 1.6, O.lam('#0b3d33'), 1 + s * 2.2, 0, -10);
    O.boite(5, 0.02, 3, O.lam('#7a1f24'), 1, 0.005, -9.5); O.boite(0.08, 3, 0.08, O.lam('#b08d3c'), -2.4, 0, -11); O.boite(0.8, 0.7, 0.8, O.lum('#ffe2a0'), -2.4, 3, -11, 0, O.CONE8); O.halo(-2.4, 3.3, -11, '#ffd89a', 5, 0.6);
    for (const x of [-8, 22]) O.boite(6, 3.5, 0.15, O.lam('#3a2616'), x, 4, ZF + 0.4);
    titre(7, 9.2, 10, 1.5); ecran(22, 5.75, ZF + 0.5, 0, 5.4, 3); pneus([[-10, -12, 3], [-8.6, -12, 2]], '#ffffff');
  } else if (A === 'alpes') {                                         // F06 : fresque alpine, étagère flottante, télécabine
    O.boite(16, 0.25, 0.7, O.lam(E.a), 7, 3.2, ZF + 0.7); O.boite(16, 0.25, 0.7, O.lam('#ffffff'), 7, 5.0, ZF + 0.7);
    etagere(7, ZF + 0.75, 0, 15, 2, { y0: 3.45, pas: 1.8, prio: 0, cadre: false, parNiveau: 6 });
    for (let x = -10; x <= 24; x += 8.5) O.halo(x, 10.5, ZF + 1, '#ffd6e8', 7, 0.4);
    const gond = new THREE.Group(); gond.position.set(-6, 8, -11); const cab = new THREE.Mesh(O.BOX, O.lam(E.a)); cab.scale.set(2.2, 1.8, 1.6); gond.add(cab); const vit = new THREE.Mesh(O.BOX, O.lum('#cfe8ff')); vit.scale.set(2.25, 0.7, 1.65); vit.position.y = 0.3; gond.add(vit);
    const fil = new THREE.Mesh(O.BOX, O.lam('#333')); fil.scale.set(0.08, 1.8, 0.08); fil.position.y = 1.8; gond.add(fil); noMir(gond); ajouter(gond);
    O.boite(60, 0.06, 0.06, O.lam('#222'), 7, 10.6, -11); anim.push((t) => { gond.position.x = -12 + ((t * 1.5) % 36); });
    titre(7, 10.2, 10, 1.5); pneus([[24, -12, 4], [25.4, -12, 3]], '#ff87bc');
  } else if (A === 'brique') {                                        // F07 : vieux garage, trophées ternis en quantité
    etagere(-2, ZF + 0.5, 0, 12, 6, { pas: 1.15, prio: 0 }); etagere(14, ZF + 0.5, 0, 12, 6, { pas: 1.15, prio: 0 });
    const photo = tex(256, 192, (g, w, h) => { g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#b39a74'; g.fillRect(12, 12, w - 24, h - 24); g.fillStyle = '#4a3a28'; g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.34, h * 0.1, 0, 0, 6.3); g.fill(); g.fillRect(w * 0.3, h * 0.48, w * 0.4, h * 0.12); g.beginPath(); g.arc(w * 0.3, h * 0.7, 14, 0, 6.3); g.arc(w * 0.72, h * 0.7, 14, 0, 6.3); g.fill(); });
    for (const [x, y] of [[6, 4.5], [6, 2.4], [24, 4.5], [-12, 4.5]]) { O.boite(2.4, 1.9, 0.08, O.lam('#3a2616'), x, y - 0.95, ZF + 0.4); O.plaque(photo, 2.1, 1.6, x, y, ZF + 0.46, { ry: 0, double: false }); }
    for (const x of [-2, 6, 14]) { O.boite(0.03, 2, 0.03, O.lam('#222'), x, 7, -9); O.boite(1.4, 0.6, 1.4, O.lam('#2f4a3a'), x, 6.6, -9, 0, O.CONE8); O.halo(x, 6.4, -9, '#ffcf80', 6, 0.7); }
    O.champ({ n: 160, taille: [30, 8, 10], centre: [7, 4, -11], vitesse: [0.05, 0.08, 0], couleurs: ['#fff1cf'], tailleMin: 0.02, tailleMax: 0.05, mise: 20, flou: 0.3, disque: 1, additif: true, alpha: 0.6 });
    for (let i = 0; i < 14; i++) poser([-8 + rnd() * 28, 0, ZF + 1.4 + rnd() * 2], R(1, 1.3), rnd() < 0.25);
    titre(7, 8.2, 10, 1.5); pneus([[24, -12, 5], [25.4, -12.3, 4], [-10, -12, 4]], '#bba98a');
  } else if (A === 'graffiti') {                                      // F08 : street-art, petite étagère éclairée
    O.boite(5, 2.6, 0.3, O.bas('#111'), 7, 3.3, ZF + 0.45); O.boite(5, 0.2, 0.6, O.lam(E.a), 7, 3.4, ZF + 0.6); etagere(7, ZF + 0.65, 0, 4.4, 1, { y0: 3.6, prio: 0, cadre: false, parNiveau: 3 });
    O.halo(7, 5.5, ZF + 1, '#ffffff', 6, 0.7); O.ptLumiere('#ffffff', 1.2, 12, 7, 6, -10);
    const bombes = []; for (let i = 0; i < 8; i++) bombes.push({ p: [-4 + rnd() * 4, 0.3, -12 + rnd() * 2], s: [0.22, 0.6, 0.22], c: ['#e8102e', '#1634cb', '#ffd21a', '#22c55e'][i % 4] }); O.inst(O.CYL, O.lam('#ffffff'), bombes);
    titre(7, 9.4, 10, 1.5); ecran(20, 6, ZF + 0.5); pneus([[24, -12, 4], [25.4, -12, 4]], '#1634cb');
  } else if (A === 'neon') {                                          // F09 : néons fluo, socles lumineux
    for (const [x, h] of [[3, 1.2], [5.6, 1.6], [8.4, 1.6], [11, 1.2]]) { O.boite(1.4, h, 1.4, O.lum(E.a, { color: COL(E.a).multiplyScalar(0.55) }), x, 0, -11); slots.push({ p: [x, h, -11], prio: Math.abs(x - 7) * 0.1, s: 1.25 }); O.halo(x, h + 1, -11, E.a, 3.5, 0.5); }
    for (let x = -14; x <= 28; x += 6) O.boite(0.1, 0.1, 30, O.lum(E.a), x, 11.6, -1);
    titre(7, 9.4, 10, 1.5); ecran(20, 6, ZF + 0.5); ecran(-6, 6, ZF + 0.5); pneus([[24, -12, 4], [25.4, -12, 4]], '#52e252');
  } else if (A === 'conteneurs') {                                    // F10 : conteneurs empilés, projecteur
    const ondule = tex(256, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 10) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 4, h); } g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); });
    const cont = [], cols = ['#e9eaec', '#b9bcc0', '#d9001b', '#3a3c40', '#e9eaec'];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) cont.push({ p: [-12 + i * 6.2 + (r % 2) * 1.2, 1.3 + r * 2.62, ZF + 1.5], s: [6.1, 2.6, 2.4], c: cols[(i + r * 2) % 5] });
    for (let r = 0; r < 3; r++) cont.push({ p: [-14.6, 1.3 + r * 2.62, -6], s: [2.4, 2.6, 12], c: cols[r] });
    O.inst(O.BOX, O.lam('#ffffff', { map: ondule }), cont);
    O.boite(6.1, 2.6, 2.4, O.lam('#d9001b', { map: ondule }), 7, 0, -10.5);
    slots.push({ p: [6.2, 2.6, -10.3], prio: 0, s: 0.8 }, { p: [7.8, 2.6, -10.3], prio: 0.1, s: 0.7 });
    O.halo(7, 4.5, -10.5, '#ffffff', 7, 0.6); O.ptLumiere('#ffffff', 1.4, 12, 7, 7, -8);
    titre(7, 10.2, 10, 1.5); pneus([[24, -12, 4], [25.4, -12, 4]], '#d9001b');
  }
  /* ---------- remplissage : N trophées dans les emplacements les plus visibles */
  slots.sort((a, b) => a.prio - b.prio);
  const gros = E.n < 15 ? 1.6 : 1; slots.slice(0, E.n).forEach((sl) => poser(sl.p, sl.s * gros));
  O.inst(O.BOX, O.lam(A === 'brique' ? '#4a3220' : '#1c1d22'), cadres);
  O.inst(O.BOX, A === 'brique' ? O.lam('#6a4a2c') : basic({ color: COL('#cfe8ff'), transparent: true, opacity: 0.55 }), tabl);
  O.inst(geoCoupe, or, tA); O.inst(geoAmph, argent, tB);
  // marquage au sol, lumières
  const marq = O.lum(E.a, { color: COL(E.a).multiplyScalar(0.8) });
  O.boite(36, 0.02, 0.3, marq, CX + 2, 0.005, -7.5); O.boite(0.3, 0.02, 9, marq, -6, 0.005, -3.5); O.boite(0.3, 0.02, 9, marq, 24, 0.005, -3.5);
  O.lumiere('#ffffff', 1.5, -6, 10, -4); O.lumiere(E.a, 0.8, 26, 5, -12);
  const ep = tex(256, 256, (g, w, h) => { g.fillStyle = A === 'brique' ? '#7a7068' : '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${R(0.02, 0.06)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, true);
  ep.repeat.set(60, 60);
  return { solMat: O.sol({ map: ep, color: COL(E.sol).multiplyScalar(2.2), roughness: A === 'brique' ? 0.7 : 0.2, metalness: 0.3, envI: 0.4 }), brouillard: { couleur: '#0c0d12', densite: 0.006 }, miroir: false };
}

/* ================================================================ FR05 « 1.2L PureTech » : garage mécanique, dépanneuse et gyrophare */
function decorGarage(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#03050c', milieu: '#0b1226', bas: '#23304a', nuages: 0.3 });
  const mur = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#b8b6ae'; g.fillRect(0, 0, w, h); g.fillStyle = '#3e5a72'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = '#e8c21a'; g.fillRect(0, h * 0.71, w, 8);
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(0,0,0,${R(0.02, 0.07)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    for (let i = 0; i < 14; i++) { const x = rnd() * w, gr = g.createLinearGradient(0, h * 0.4, 0, h); gr.addColorStop(0, 'rgba(40,30,20,0)'); gr.addColorStop(1, 'rgba(40,30,20,.3)'); g.fillStyle = gr; g.fillRect(x, h * 0.4, R(10, 50), h * 0.6); }
    g.strokeStyle = 'rgba(0,0,0,.15)'; for (let y = 0; y < h * 0.7; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, true);
  const mMur = basic({ map: mur }), H = 7.5;
  // mur du fond avec la porte sectionnelle ouverte (x ∈ [8, 22]) : on voit la dépanneuse dehors
  O.boite(17, H, 0.5, mMur, -13.5, 0, -13); O.boite(27, H, 0.5, mMur, 26.5, 0, -13); O.boite(18, H - 5.6, 0.5, mMur, 4, 5.6, -13);   // grande porte ouverte derrière le bolide
  O.boite(18.2, 0.9, 0.9, O.lam('#9aa0a6'), 4, 5.0, -13.2);                              // tablier enroulé
  O.boite(0.5, H, 28, mMur, -22, 0, 1); O.boite(62, 0.4, 28, O.bas('#2b2c30'), CX + 4, H, 1);
  const tubes = []; for (const z of [-9, -3, 3]) for (const x of [-14, -4, 26, 34]) tubes.push([x, z]);
  const mTube = O.lum('#eafff4'); tubes.forEach(([x, z], i) => { const m = O.boite(3.2, 0.12, 0.28, mTube, x, H - 0.4, z); if (i === 5) anim.push((t) => { m.visible = Math.sin(t * 31) * Math.sin(t * 7.7) < 0.55; }); });
  // panneau d'outils (silhouettes peintes), établi, étau, servante rouge
  const panneau = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#a07a4e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 10; y < h; y += 22) for (let x = 10; x < w; x += 22) g.fillRect(x, y, 4, 4);
    const outil = (x, y, L, larg, rot, tete) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(20,20,20,.45)'; g.fillRect(-larg / 2 + 4, 4, larg, L); g.fillStyle = ['#9aa3ad', '#c0c6cc', '#d1342b', '#e8b21a'][Math.floor(rnd() * 4)]; g.fillRect(-larg / 2, 0, larg, L); if (tete) { g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(0, 0, larg * 1.6, 0, 6.3); g.fill(); g.fillStyle = '#a07a4e'; g.beginPath(); g.arc(0, -larg * 0.6, larg * 0.9, 0, 6.3); g.fill(); } g.restore(); };
    for (let i = 0; i < 9; i++) outil(60 + i * 46, 60, 170 + i * 10, 14, 0, true);
    for (let i = 0; i < 6; i++) outil(520 + i * 40, 50, 150, 12, 0, false);
    for (let i = 0; i < 4; i++) outil(800 + i * 50, 60, 130, 30, 0.2, false);
    g.fillStyle = '#2d2d2d'; g.font = '900 54px "Arial Black",sans-serif'; g.fillText('ATELIER', 520, 380); g.font = '700 30px Arial,sans-serif'; g.fillStyle = '#3b2a18'; g.fillText('RÉVISION · VIDANGE · COURROIE DE DISTRIBUTION', 60, 460);
  });
  O.plaque(panneau, 11, 5.5, -13, 4.2, -12.7, { ry: 0, double: false });
  O.boite(8, 0.12, 1.2, O.metal('#8b9097', 0.5), -13, 1.0, -12.0); O.boite(7.6, 0.9, 1.0, O.lam('#3e5a72'), -13, 0.05, -12.0);
  O.boite(0.5, 0.45, 0.5, O.lam('#3a6fb0'), -15.5, 1.12, -11.8);
  O.boite(1.4, 1.6, 0.8, O.lam('#c3261f'), -19, 0, -12.1);
  // pont élévateur à deux colonnes (rouge), bras levés, sans voiture : celle-ci attend son diagnostic
  const rouge = O.lam('#c3261f'), jaune = O.lam('#e8b21a');
  for (const x of [-15, -8]) { O.boite(0.6, 4.6, 0.6, rouge, x, 0, -4); O.boite(0.9, 0.3, 0.9, O.lam('#333'), x, 0, -4); }
  O.boite(7.6, 0.4, 0.5, rouge, -11.5, 4.6, -4);
  for (const [x, a] of [[-15, 0.6], [-15, -0.6], [-8, Math.PI - 0.6], [-8, Math.PI + 0.6]]) { const b = O.boite(2.2, 0.16, 0.22, jaune, x + Math.cos(a) * 1.1, 1.8, -4 - Math.sin(a) * 1.1); b.rotation.y = a; }
  // grue d'atelier avec un moteur suspendu (trois cylindres, carter, courroie)
  O.boite(0.3, 3.4, 0.3, O.lam('#2a6db0'), -6, 0, -9); const fl = O.boite(3.4, 0.25, 0.25, O.lam('#2a6db0'), -4.6, 3.3, -9); fl.rotation.z = -0.25;
  O.boite(0.05, 1.0, 0.05, O.lam('#222'), -3.2, 2.2, -9);
  O.boite(1.2, 0.8, 0.8, O.metal('#7b8088', 0.45), -3.2, 1.2, -9); O.boite(1.3, 0.25, 0.85, O.lam('#202020'), -3.2, 2.0, -9);
  O.boite(0.1, 0.7, 0.7, O.lam('#1a1a1a'), -3.85, 1.25, -9, 0, O.CYL);
  // pneus, fûts d'huile
  const pn = []; for (const [x, z, n] of [[-19, -9, 5], [-17.6, -9.6, 4], [-19.4, -6.8, 3], [28, -11, 5], [29.4, -11, 3]]) for (let j = 0; j < n; j++) pn.push({ p: [x, 0.16 + j * 0.32, z], s: [0.72, 0.32, 0.72] });
  O.inst(O.TORE, O.lam('#161616'), pn.map((p) => ({ ...p, r: [Math.PI / 2, 0, 0], s: [1.25, 1.25, 1.6] })));
  const futs = []; for (const [x, z, c] of [[24, -12, '#1f4fa0'], [25.2, -12, '#c3261f'], [24.6, -10.9, '#1f4fa0']]) futs.push({ p: [x, 0.45, z], s: [0.9, 0.9, 0.9], c });
  O.inst(O.CYL, O.lam('#ffffff'), futs);
  // flaque d'huile irisée qui s'échappe de sous le bolide
  const huile = tex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,8,10,.92)'; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.283, r = 0.8 + 0.2 * Math.sin(a * 3) + 0.1 * Math.sin(a * 7); g.lineTo(w / 2 + Math.cos(a) * w * 0.45 * r, h / 2 + Math.sin(a) * h * 0.42 * r); } g.fill();
    for (let i = 0; i < 5; i++) { const gr = g.createRadialGradient(w * R(0.3, 0.7), h * R(0.3, 0.7), 2, w / 2, h / 2, w * 0.3); gr.addColorStop(0, 'rgba(120,60,200,.25)'); gr.addColorStop(0.5, 'rgba(40,160,120,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  const fq = new THREE.Mesh(O.PLAN, O.garde(new THREE.MeshStandardMaterial({ map: huile, transparent: true, roughness: 0.04, metalness: 0.6, envMap: O.env || null, envMapIntensity: 1.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
  fq.scale.set(7.5, 3.4, 1); fq.rotation.x = -Math.PI / 2; fq.position.set(CX + 3.2, 0.012, -2.6); noMir(fq); ajouter(fq);
  // dehors : la dépanneuse plateau, gyrophares orange animés
  const DX = 4.5, DZ = -18.5, DS = 1.35;                                // la dépanneuse, grande, cadrée dans la porte
  const dep = new THREE.Group(); dep.position.set(DX, 0, DZ); dep.scale.setScalar(DS); dep.rotation.y = 0.12; ajouter(dep);
  const pc = (geo, mat, w, h, d, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.z = rz; dep.add(m); return m; };
  const blanc = O.lam('#f0b000'), orange = O.lam('#1b1b1b');
  pc(O.BOX, blanc, 2.4, 2.4, 2.5, -4.6, 2.0, 0); pc(O.BOX, O.lam('#20262e'), 0.05, 1.0, 2.2, -5.82, 2.6, 0);
  pc(O.BOX, orange, 2.42, 0.25, 2.52, -4.6, 1.3, 0);
  pc(O.BOX, O.lam('#2a2a2a'), 9.5, 0.5, 1.6, -0.8, 0.95, 0);
  const plateau = pc(O.BOX, O.lam('#b9bcc0'), 6.8, 0.22, 2.5, 1.4, 1.75, 0, -0.1);
  const chevrons = tex(256, 64, (g, w, h) => { for (let x = -h; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#e8102e' : '#ffffff'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, h); g.fill(); } });
  pc(O.BOX, O.lam('#ffffff', { map: chevrons }), 0.1, 0.5, 2.4, 4.9, 1.2, 0);
  const roues = []; for (const x of [-4.4, 1.2, 2.8]) for (const z of [-1.1, 1.1]) roues.push({ p: [x, 0.55, z], s: [1.1, 0.4, 1.1], r: [Math.PI / 2, 0, 0] });
  O.inst(O.CYL, O.lam('#141414'), roues, dep);
  pc(O.BOX, O.lam('#222'), 1.6, 0.18, 0.5, -4.6, 3.3, 0);
  const gyro = []; for (const z of [-0.6, 0.6]) gyro.push(pc(O.CYL, O.lum('#ff8a00', { transparent: true, opacity: 0.9 }), 0.3, 0.3, 0.3, -4.6, 3.55, z));
  const GX = DX - 4.6 * DS, GY = 3.6 * DS, hal = [O.halo(GX, GY, DZ - 0.6 * DS, '#ff8a00', 6, 0.9), O.halo(GX, GY, DZ + 0.6 * DS, '#ff8a00', 6, 0.9)];
  const fm = O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL('#ff9a1a'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const piv = new THREE.Group(); piv.position.set(GX, GY, DZ); for (const s of [1, -1]) { const b = new THREE.Mesh(O.PLAN, fm); b.scale.set(16, 1.3, 1); b.position.x = s * 8; piv.add(b); } noMir(piv); ajouter(piv);
  const gl = O.ptLumiere('#ff7a00', 3.2, 34, GX, GY + 0.5, DZ + 3);
  anim.push((t) => { piv.rotation.y = t * 6; hal.forEach((h, i) => { h.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(t * 6 + i * Math.PI)); }); if (O.estActif()) gl.intensity = gl.userData.base * (0.35 + 0.65 * Math.max(0, Math.sin(t * 6))); });
  O.halo(-6, 6.5, -24, '#ffb04a', 6, 0.8); O.boite(0.2, 6.5, 0.2, O.lam('#222'), -6, 0, -24);       // réverbère sodium dans la rue
  const beton = tex(512, 512, (g, w, h) => { g.fillStyle = '#86847e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.015, 0.04)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, true);
  beton.repeat.set(50, 50);
  O.lumiere('#eafff4', 1.5, -6, 10, 2); O.lumiere('#ff8a2a', 0.7, 22, 4, -20);
  return { solMat: O.sol({ map: beton, color: COL('#6c6a64'), roughness: 0.55, metalness: 0.1, envI: 0.4 }), brouillard: { couleur: '#1c1f24', densite: 0.009 }, miroir: false };
}

/* ================================================================ H07 « Blocus Total » : lycée bloqué */
function decorBlocus(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter } = O;
  O.ciel({ haut: '#3b4a5e', milieu: '#8a97a6', bas: '#d6d2c4', nuages: 0.85 });
  // le lycée : barre années 70, bandeaux de fenêtres, panneaux bleus, devise républicaine
  const fac = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${R(0.02, 0.06)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    for (let e = 0; e < 3; e++) { const y = 40 + e * 150; g.fillStyle = '#2c3a48'; g.fillRect(0, y, w, 90); for (let x = 0; x < w; x += 64) { g.fillStyle = rnd() < 0.3 ? '#5f7fa0' : '#3e5468'; g.fillRect(x + 4, y + 4, 56, 82); g.fillStyle = '#d9dcd8'; g.fillRect(x, y, 4, 90); } g.fillStyle = '#2f6db0'; for (let x = 0; x < w; x += 128) g.fillRect(x + 8, y + 94, 112, 30); }
    for (let i = 0; i < 10; i++) { const x = rnd() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(60,50,40,0)'); gr.addColorStop(1, 'rgba(60,50,40,.25)'); g.fillStyle = gr; g.fillRect(x, 0, R(10, 40), h); }
  }, true);
  const geo = O.garde(new THREE.BoxGeometry(110, 14, 14)); const uv = geo.attributes.uv; for (let i = 16; i < 24; i++) uv.setX(i, uv.getX(i) * 110 / 28);
  const bat = new THREE.Mesh(geo, [O.bas('#b3ae a2'.replace(' ', '')), O.bas('#b3aea2'), O.bas('#6b6e72'), O.bas('#6b6e72'), basic({ map: fac }), basic({ map: fac })]); bat.position.set(-2, 7, -44); ajouter(bat);
  O.boite(16, 16, 4, O.lam('#d8d4ca'), -16, 0, -36.5);                                                  // pavillon d'entrée
  O.plaque(O.texteTex('LYCÉE', { w: 1024, h: 256, couleur: '#1e3a6e', police: '900 {T}px "Arial Black",Arial,sans-serif', taille: 0.8 }), 13, 3.2, -16, 13.2, -34.4, { ry: 0, double: false });
  O.plaque(O.texteTex('LIBERTÉ · ÉGALITÉ · FRATERNITÉ', { w: 1024, h: 96, couleur: '#2a2a2a', police: '700 {T}px Georgia,serif', taille: 0.6 }), 14, 1.3, -16, 10.6, -34.4, { ry: 0, double: false });
  const tri = tex(192, 128, (g, w, h) => { g.fillStyle = '#1d3f9a'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#f7f7f7'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#e1262d'; g.fillRect(2 * w / 3, 0, w / 3, h); });
  O.cyl(0.06, 3.5, O.lam('#ddd'), -21, 12, -34.6); O.tissu(tri, 2.2, 1.4, -21, 14.8, -34.6, 0.3, { amp: 0.3 });
  // la grille (barreaux verts, texture), poteaux et lisse ; portail au centre (barreaux 3D) chaîné et cadenassé
  const barre = tex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#2f5d3a'; for (let x = 6; x < w; x += 32) { g.fillRect(x, 10, 7, h - 10); g.beginPath(); g.moveTo(x - 3, 14); g.lineTo(x + 3.5, 0); g.lineTo(x + 10, 14); g.fill(); } g.fillRect(0, 40, w, 7); g.fillRect(0, h - 30, w, 7); });
  barre.wrapS = THREE.RepeatWrapping;
  const mBar = basic({ map: barre, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: COL('#9fb8a4') });
  for (const [x0, x1] of [[-60, -16], [-6, 60]]) { const L = x1 - x0, m = O.plaque(null, L, 2.8, (x0 + x1) / 2, 1.4, -16, { ry: 0, mat: mBar.clone() }); O.garde(m.material); m.material.map = barre.clone(); O.garde(m.material.map); m.material.map.repeat.set(L / 2.4, 1); m.material.map.needsUpdate = true; }
  const poteaux = []; for (let x = -60; x <= 60; x += 2.4) if (x < -16 || x > -6) poteaux.push({ p: [x, 1.5, -16], s: [0.14, 3.0, 0.14] }); O.inst(O.BOX, O.lam('#2f5d3a'), poteaux);
  const vert = O.lam('#2f5d3a'), bars = []; for (let x = -15.8; x <= -6.2; x += 0.24) bars.push({ p: [x, 1.6, -16], s: [0.06, 3.2, 0.06] });
  O.inst(O.BOX, vert, bars); for (const y of [0.4, 1.6, 2.9]) O.boite(9.8, 0.12, 0.1, vert, -11, y, -16);
  for (const x of [-16.2, -5.8]) O.boite(0.4, 3.6, 0.4, O.lam('#a9a59a'), x, 0, -16);
  // chaînes (maillons alternés) et cadenas
  const chaine = []; for (let k = 0; k < 2; k++) for (let i = 0; i < 26; i++) { const x = -13.6 + i * 0.2, y = 1.3 + k * 0.6 - Math.sin(i / 25 * Math.PI) * 0.25; chaine.push({ p: [x, y, -15.9], s: [0.22, 0.22, 0.22], r: [i % 2 ? Math.PI / 2 : 0, 0, 0] }); }
  O.inst(O.TORE, O.metal('#b9bec6', 0.3), chaine);
  for (const y of [1.0, 1.6]) { O.boite(0.34, 0.4, 0.14, O.metal('#d6b04a', 0.25), -11, y - 0.2, -15.8); O.boite(0.24, 0.24, 0.24, O.metal('#c9ced6', 0.2), -11, y + 0.18, -15.8, 0, O.TORE); }
  // poubelles empilées contre la grille, trois en feu ; palettes
  const corps = [], couv = [], cols = ['#2f6b3d', '#3c3f44', '#f2c21a', '#2f6b3d', '#3c3f44'];
  const pb = [[-14.5, -14.6, 0], [-12.9, -14.4, 0], [-11.2, -14.7, 0], [-9.5, -14.5, 0], [-7.8, -14.6, 0], [-13.6, -14.4, 1.25], [-10.4, -14.5, 1.25], [-8.6, -13.2, 0, 1], [-17.5, -13.5, 0, 1], [-4.4, -13.8, 0]];
  pb.forEach(([x, z, y0, couche], i) => { const c = cols[i % 5]; const r = couche ? [Math.PI / 2, R(-0.5, 0.5), 0] : [0, R(-0.3, 0.3), 0]; corps.push({ p: [x, y0 + (couche ? 0.45 : 0.6), z], s: [0.85, 1.2, 0.95], r, c }); if (!couche) couv.push({ p: [x, y0 + 1.25, z + 0.05], s: [0.9, 0.1, 1.0], r: [R(-0.4, 0), 0, 0], c }); });
  O.inst(O.BOX, O.lam('#ffffff'), corps); O.inst(O.BOX, O.lam('#bbbbbb'), couv);
  O.feux([[-12.9, 1.35, -14.4, 0.8], [-8.6, 1.0, -13.2, 0.9], [-4.4, 1.35, -13.8, 0.8]], { taille: 1.0, haut: 2.4, fumeeHaut: 30, fumeeCouleurs: ['#2c2a2a', '#4a4848', '#7a7876'] });
  const pal = []; for (let i = 0; i < 8; i++) pal.push({ p: [-20 + R(-2, 2), 0.2 + (i % 4) * 0.25, -13.6 + R(-0.6, 0.6)], s: [1.2, 0.15, 1.0], r: [R(-0.2, 0.2), R(0, 3), R(-0.2, 0.2)] }); O.inst(O.BOX, O.lam('#a7844f'), pal);
  // banderoles peintes sur draps, accrochées à la grille
  const drap = (txt, c) => O.texteTex(txt, { w: 1024, h: 256, fond: '#f1ede4', couleur: c, police: '900 {T}px "Impact","Arial Black",sans-serif', taille: 0.66 });
  O.tissu(drap('LYCÉE BLOQUÉ', '#c1121f'), 8, 1.8, -32, 1.9, -15.8, 0, { amp: 0.15, ancre: 'bords' });
  O.tissu(drap('ON LÂCHE RIEN !', '#1b1b1b'), 8, 1.8, 0, 1.9, -15.8, 0, { amp: 0.15, ancre: 'bords' });
  O.tissu(drap('BLOCUS', '#c1121f'), 6, 1.8, 18, 1.9, -15.8, 0, { amp: 0.18, ancre: 'bords' });
  O.tissu(drap('NON À LA RÉFORME', '#1d3f9a'), 9, 1.8, -46, 1.9, -15.8, 0, { amp: 0.15, ancre: 'bords' });
  // arbres de la cour, sans feuilles
  const tr = [], br = []; for (let i = 0; i < 10; i++) { const x = -50 + i * 11 + R(-2, 2), z = -26 + R(-2, 2), h = R(6, 9); tr.push({ p: [x, h / 2, z], s: [0.4, h, 0.4] }); for (let k = 0; k < 5; k++) br.push({ p: [x + R(-1, 1), h * R(0.6, 1), z + R(-1, 1)], s: [0.12, R(2, 4), 0.12], r: [R(-0.8, 0.8), 0, R(-0.8, 0.8)] }); }
  O.inst(O.CYL6, O.lam('#3b3128'), tr); O.inst(O.CYL6, O.lam('#3b3128'), br);
  O.flux({ sources: [[-20, 0.2, -10, 3], [6, 0.2, -12, 3], [28, 0.2, -10, 3]], n: 20, haut: 4, vitesse: 0.05, taille: 4, croit: 1.5, wob: 3, derive: [1, 0, 0], cA: '#8d8d8d', cB: '#a0a0a0', cC: '#b0b0b0', alpha: 0.28 });
  const bit = tex(512, 512, (g, w, h) => { g.fillStyle = '#555657'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.03, 0.09)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, true);
  bit.repeat.set(40, 40);
  O.lumiere('#e4ecf4', 1.4, -14, 12, -16); O.lumiere('#ff8a3a', 0.8, 22, 4, -10);
  return { solMat: O.sol({ map: bit, color: COL('#77777a'), roughness: 0.85, metalness: 0.05, envI: 0.2 }), brouillard: { couleur: '#8f949a', densite: 0.011 }, miroir: false };
}

/* ================================================================ H08 « Le Brexit » : l'île qui dérive */
function decorBrexit(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#5a7da6', milieu: '#b8c6d4', bas: '#e6e4dc', nuages: 0.8, soleil: 0.5, couleurSoleil: '#fff4d8', dirSoleil: [-0.6, 0.25, -0.75] });
  // la Manche : grand plan d'eau animé (vagues, écume, brillance), qui commence au rivage
  const u = { t: { value: 0 }, brume: { value: COL('#cfd6dc') } };
  const mer = new THREE.Mesh(O.PLAN, O.garde(new THREE.ShaderMaterial({ uniforms: u, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float t; uniform vec3 brume; varying vec3 vW; ${GLSL_H}
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){ vec2 p = vW.xz * 0.18; float n = vn(p + vec2(t * 0.3, t * 0.2)) * 0.6 + vn(p * 2.3 - vec2(t * 0.4, 0.0)) * 0.4;
        vec3 c = mix(vec3(0.10, 0.27, 0.33), vec3(0.22, 0.42, 0.46), n);
        float ec = smoothstep(0.72, 0.9, n) * 0.5 + smoothstep(-11.5, -9.0, vW.z) * (0.6 + 0.4 * sin(vW.x * 0.7 + t * 2.0));
        c = mix(c, vec3(0.93, 0.95, 0.94), clamp(ec, 0.0, 1.0));
        c += vec3(1.0, 0.95, 0.8) * pow(vn(p * 6.0 + t), 8.0) * 1.2;
        float d = length(vW.xz - cameraPosition.xz); c = mix(c, brume, smoothstep(60.0, 300.0, d));
        gl_FragColor = vec4(c, 1.0); }` })));
  mer.scale.set(700, 340, 1); mer.rotation.x = -Math.PI / 2; mer.position.set(CX, 0.04, -9 - 170); noMir(mer); ajouter(mer);
  anim.push((t) => { u.t.value = t; });
  // côte française : galets, épi en bois cassé, petit phare, drapeau tricolore
  const [px, pz] = [-17, -9];                                    // le phare français, au premier plan gauche
  O.boite(7, 1.2, 6, O.lam('#8a8278'), px, 0, pz, 0.4, O.CYL6);
  O.boite(2.4, 11, 2.4, O.lam('#f2f2ee'), px, 1.2, pz, 0, O.CYL);
  O.boite(2.5, 1.4, 2.5, O.lam('#d42a2a'), px, 9.0, pz, 0, O.CYL);
  O.boite(1.6, 1.3, 1.6, O.lum('#fff2c0'), px, 12.2, pz, 0, O.CYL); O.boite(2.0, 1.0, 2.0, O.lam('#d42a2a'), px, 13.5, pz, 0, O.CONE8);
  O.halo(px, 12.8, pz, '#fff2c0', 5, 0.9);
  const fm = O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL('#fff6d0'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const piv = new THREE.Group(); piv.position.set(px, 12.8, pz); const b = new THREE.Mesh(O.PLAN, fm); b.scale.set(40, 1.6, 1); b.position.x = 20; piv.add(b); noMir(piv); ajouter(piv); anim.push((t) => { piv.rotation.y = t * 0.9; });
  const tri = tex(192, 128, (g, w, h) => { g.fillStyle = '#1d3f9a'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#f7f7f7'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#e1262d'; g.fillRect(2 * w / 3, 0, w / 3, h); });
  O.cyl(0.08, 7, O.lam('#dcdcdc'), 5, 0, -13); O.tissu(tri, 3, 2, 5, 6.0, -13, 0.4, { amp: 0.4, vit: 5 });
  const planches = []; for (let i = 0; i < 9; i++) planches.push({ p: [2.5 + R(-0.05, 0.05), 0.5, -9.5 - i * 1.1], s: [2.4, 0.12, 0.9], r: [0, R(-0.05, 0.05), i === 8 ? 0.3 : 0] });
  O.inst(O.BOX, O.lam('#6e5236'), planches); const pieux = []; for (let i = 0; i < 5; i++) for (const s of [-1, 1]) pieux.push({ p: [2.5 + s * 1.1, 0.4, -9.8 - i * 2.2], s: [0.25, 1.6, 0.25] }); O.inst(O.CYL6, O.lam('#4a3826'), pieux);
  O.plaque(O.texteTex('← ROYAUME-UNI', { w: 512, h: 128, fond: '#f4f4ee', couleur: '#1b1b1b', bord: '#c1121f', police: '900 {T}px Arial,sans-serif', taille: 0.5 }), 2.4, 0.6, 1.2, 1.7, -19, { ry: 0.2 });
  // l'île : falaises de craie, prairie, tour d'horloge néogothique, maisons de brique, bus rouge
  const ile = new THREE.Group(); noMir(ile); ajouter(ile);
  const craie = tex(1024, 256, (g, w, h) => {
    g.fillStyle = '#f1efe6'; g.fillRect(0, 0, w, h);
    for (let y = 30; y < h; y += R(14, 30)) { g.fillStyle = 'rgba(90,90,90,.35)'; for (let x = 0; x < w; x += R(4, 14)) g.fillRect(x, y + Math.sin(x * 0.02) * 3, R(2, 8), 2); }
    for (let i = 0; i < 70; i++) { const x = rnd() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(160,150,130,.25)'); gr.addColorStop(1, 'rgba(160,150,130,0)'); g.fillStyle = gr; g.fillRect(x, 0, R(3, 12), h); }
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, w, 16); for (let x = 0; x < w; x += 6) g.fillRect(x, 16, 6, R(2, 14));
  }, true);
  craie.repeat.set(3, 1);
  const geoI = O.garde(new THREE.CylinderGeometry(24, 26, 9, 28, 2)); const pos = geoI.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), k = 1 + 0.1 * Math.sin(a * 5) + 0.05 * Math.sin(a * 11); pos.setX(i, x * k); pos.setZ(i, z * k * 0.7); }
  geoI.computeVertexNormals();
  const socle = new THREE.Mesh(geoI, [basic({ map: craie }), O.lam('#5f9a44'), O.lam('#3a3a36')]); socle.position.y = 2.5; ile.add(socle);
  const sous = new THREE.Mesh(O.CONE8, O.lam('#6b5a44')); sous.scale.set(44, 14, 32); sous.rotation.x = Math.PI; sous.position.y = -9.5; ile.add(sous);
  // tour d'horloge
  const pierre = tex(256, 512, (g, w, h) => { g.fillStyle = '#d2bf8e'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,70,40,.5)'; g.lineWidth = 3; for (let x = 16; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(70,55,30,.5)'; for (let x = 24; x < w; x += 40) { g.beginPath(); g.moveTo(x, y + 56); g.lineTo(x, y + 20); g.arc(x + 8, y + 20, 8, Math.PI, 0); g.lineTo(x + 16, y + 56); g.fill(); } } }, true);
  const mP = basic({ map: pierre, color: COL('#f0e6cc') });
  const tour = (geo, mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); ile.add(m); return m; };
  const TX = -6, TZ = 4, Y0 = 7;
  tour(O.BOX, mP, 3.6, 14, 3.6, TX, Y0 + 7, TZ);
  tour(O.BOX, O.lam('#cdb886'), 4.4, 4.4, 4.4, TX, Y0 + 16.2, TZ);
  const cadran = tex(256, 256, (g, w) => { g.fillStyle = '#c9a54a'; g.fillRect(0, 0, w, w); g.fillStyle = '#f6f1df'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.42, 0, 6.3); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.stroke(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * w * 0.33, w / 2 - Math.cos(a) * w * 0.33); g.lineTo(w / 2 + Math.sin(a) * w * 0.4, w / 2 - Math.cos(a) * w * 0.4); g.stroke(); } g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2, w * 0.2); g.stroke(); g.lineWidth = 9; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w * 0.68, w * 0.56); g.stroke(); });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, m = new THREE.Mesh(O.PLAN, basic({ map: cadran })); m.scale.set(3.6, 3.6, 1); m.position.set(TX + Math.sin(a) * 2.22, Y0 + 18.4, TZ + Math.cos(a) * 2.22); m.rotation.y = a; ile.add(m); }
  tour(O.BOX, O.lam('#bfa979'), 3.8, 2.6, 3.8, TX, Y0 + 21.7, TZ);
  const fl = tour(O.CONE4, O.lam('#3f4a40'), 5.2, 8, 5.2, TX, Y0 + 27, TZ); fl.rotation.y = Math.PI / 4;
  tour(O.CONE4, O.metal('#d9b04a', 0.3), 0.5, 2.2, 0.5, TX, Y0 + 32, TZ);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = tour(O.CONE4, O.lam('#3f4a40'), 0.7, 2.6, 0.7, TX + sx * 2.1, Y0 + 24.3, TZ + sz * 2.1); p.rotation.y = Math.PI / 4; }
  // maisons de brique et bus à étage
  const maisons = [], toits = []; for (let i = 0; i < 6; i++) { const x = 4 + (i % 3) * 5, z = -2 + Math.floor(i / 3) * 7; maisons.push({ p: [x, Y0 + 1.6, z], s: [4, 3.2, 4] }); toits.push({ p: [x, Y0 + 4.0, z], s: [5.6, 1.6, 4.2], r: [0, Math.PI / 4, 0] }); }
  O.inst(O.BOX, O.lam('#9a4630'), maisons, ile); O.inst(O.CONE4, O.lam('#3a3a3e'), toits, ile);
  tour(O.BOX, O.lam('#c8102e'), 5, 2.6, 1.6, 2, Y0 + 1.5, 9); tour(O.BOX, O.lum('#ffe7a8'), 4.6, 0.5, 1.65, 2, Y0 + 2.2, 9);
  tour(O.BOX, O.lam('#c8102e'), 0.9, 2.2, 0.9, -12, Y0 + 1.1, 8);                 // cabine téléphonique
  // sillage d'écume autour de l'île
  const ecume = new THREE.Mesh(O.garde(new THREE.RingGeometry(26, 34, 48)), O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL('#ffffff'), transparent: true, opacity: 0.5, depthWrite: false })));
  ecume.rotation.x = -Math.PI / 2; ecume.scale.set(1.15, 0.8, 1); ecume.position.y = -1.9; ile.add(ecume);
  // la dérive : l'île s'éloigne lentement de la côte (et tangue un peu)
  const dir = new THREE.Vector3(Math.cos(-2.08), 0, Math.sin(-2.08)), d0 = 74;
  let t0 = null;
  const placer = (s) => {
    const d = d0 + s * 6 + s * s * 0.15, lat = s * 0.9;
    ile.position.set(CX + dir.x * d - dir.z * lat, -0.3 + Math.sin(s * 0.7) * 0.35, dir.z * d + dir.x * lat);
    ile.rotation.set(Math.sin(s * 0.5) * 0.012, 0.75 + s * 0.006, Math.sin(s * 0.63) * 0.015);
  };
  ile.scale.setScalar(0.8); placer(0);
  // sillage : une longue traînée d'écume relie la côte française à l'île qui s'en va (on voit d'où elle s'est détachée)
  const sill = tex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,.35)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(w * 0.35, h); g.lineTo(w * 0.65, h); g.lineTo(w, 0); g.lineTo(w * 0.82, 0); g.lineTo(w * 0.5, h * 0.7); g.lineTo(w * 0.18, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(w * 0.4, 0, w * 0.2, h); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 110; i++) { g.fillStyle = `rgba(0,0,0,${R(0.2, 0.6)})`; g.fillRect(rnd() * w, rnd() * h, R(6, 30), R(3, 10)); } g.globalCompositeOperation = 'source-over'; }, true);
  const sMat = O.garde(new THREE.MeshBasicMaterial({ map: sill, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 })), sillage = new THREE.Mesh(O.PLAN, sMat);
  sillage.rotation.order = 'YXZ'; noMir(sillage); ajouter(sillage);
  const cote0 = new THREE.Vector3(CX + dir.x * 12, 0.07, dir.z * 12);
  const majSillage = (t) => { const p = ile.position, dx = p.x - cote0.x, dz = p.z - cote0.z, L = Math.hypot(dx, dz) - 18; sillage.position.set(cote0.x + dx * (L / 2) / (L + 18), 0.07, cote0.z + dz * (L / 2) / (L + 18)); sillage.scale.set(34, L, 1); sillage.rotation.set(-Math.PI / 2, Math.atan2(-dx, -dz), 0); sill.offset.y = -t * 0.08; };
  // amarre rompue : des pieux arrachés et une corde qui pend au bout de l'épi
  O.boite(0.08, 0.08, 6, O.lam('#8a6a40'), 2.5, 0.25, -21.5);
  anim.push((t) => { if (t0 == null) t0 = t; placer(t - t0); majSillage(t); });
  // mouettes
  const n = 18, mp = new Float32Array(n * 3), ph = new Float32Array(n); for (let i = 0; i < n; i++) { mp.set([R(-40, 30), R(10, 22), R(-60, -20)], i * 3); ph[i] = rnd() * 6; }
  const gm = O.garde(new THREE.BufferGeometry()); gm.setAttribute('position', new THREE.BufferAttribute(mp, 3)); gm.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const um = { t: { value: 0 } };
  const pm = new THREE.Points(gm, O.garde(new THREE.ShaderMaterial({ uniforms: um, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'uniform float t; attribute float aPh; varying float vF; void main(){ vec3 p = position + vec3(sin(t * 0.2 + aPh) * 14.0, sin(t * 0.7 + aPh) * 1.5, cos(t * 0.17 + aPh) * 8.0); vF = sin(t * 7.0 + aPh * 3.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 900.0 / max(-mv.z, 1.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vF; void main(){ vec2 c = gl_PointCoord - 0.5; float y = -c.y - abs(c.x) * (0.55 + 0.35 * vF) + 0.08; float a = smoothstep(0.06, 0.0, abs(y)) * step(abs(c.x), 0.45); if (a < 0.05) discard; gl_FragColor = vec4(vec3(0.15), a); }' })));
  pm.frustumCulled = false; noMir(pm); ajouter(pm); anim.push((t) => { um.t.value = t; });
  const sable = tex(512, 512, (g, w, h) => { g.fillStyle = '#c9b48c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R(80, 200) | 0},${R(70, 170) | 0},${R(50, 140) | 0},${R(0.2, 0.5)})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, R(1, 4), 0, 6.3); g.fill(); } }, true);
  sable.repeat.set(40, 40);
  O.lumiere('#fff4d8', 1.7, -16, 14, -18); O.lumiere('#b8d0ff', 0.7, 24, 6, -8);
  return { solMat: O.sol({ map: sable, color: COL('#e8dcc0'), roughness: 0.95, metalness: 0, envI: 0.2 }), brouillard: { couleur: '#cfd6dc', densite: 0.005 }, miroir: false };
}

/* ================================================================ E06 « Le Bonus Écologique » : utopie verte */
function decorEco(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#3d8fd6', milieu: '#ffeaa8', bas: '#fff4c8', nuages: 0.4, soleil: 1, couleurSoleil: '#fff0a8', dirSoleil: [-0.74, 0.1, -0.67] });
  // collines ondulées (couleurs par sommet), plates près du bolide
  const colline = (x, z) => { const d = Math.hypot(x - CX, z); return Math.max(0, Math.max(0, (d - 34) / 170) * (14 + 10 * Math.sin(x * 0.03) * Math.cos(z * 0.025) + 8 * Math.sin(x * 0.011 + 1.3)) + (d > 34 ? 2 * Math.sin(x * 0.12) * Math.sin(z * 0.1) : 0)); };
  const geo = O.garde(new THREE.PlaneGeometry(640, 320, 64, 32)); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + CX, z = p.getZ(i) - 150, hgt = colline(x, z);
    p.setXYZ(i, x, Math.max(0, hgt) - 0.05, z);
    c.set('#2a7a1e').lerp(COL('#8cc83a'), Math.min(1, hgt / 26) + 0.2 * Math.sin(x * 0.05)); col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  ajouter(new THREE.Mesh(geo, O.lam('#ffffff', { vertexColors: true })));
  // arbres : troncs + houppiers (icosaèdres) en plusieurs verts
  const troncs = [], houp = [], verts = ['#2f8a2a', '#3fa236', '#56b83a', '#1f6e2a', '#7cc644'];
  const arbre = (x, z, h) => { const y0 = colline(x, z); troncs.push({ p: [x, y0 + h * 0.35, z], s: [h * 0.06, h * 0.7, h * 0.06] }); for (let k = 0; k < 3; k++) houp.push({ p: [x + R(-0.25, 0.25) * h, y0 + h * R(0.7, 0.95), z + R(-0.25, 0.25) * h], s: h * R(0.45, 0.7), c: verts[Math.floor(rnd() * 5)] }); };
  for (let i = 0; i < 30; i++) { const a = R(-3.12, -0.1), r = R(42, 100), [x, z] = O.pol(r, a); if (a > -2.5 && a < -1.6 && rnd() < 0.6) continue; arbre(x, z, R(6, 10) * (r / 60 + 0.5)); }
  for (const [x, z, h] of [[-16, -10, 13], [-20, 2, 15], [-8, -22, 12], [-30, -24, 14]]) arbre(x, z, h);
  O.inst(O.CYL6, O.lam('#5a3a1e'), troncs); O.inst(O.ICO, O.lam('#ffffff'), houp);
  // lianes : chaînettes tombant entre les grands arbres, feuilles le long
  const lianes = [[-16, -10, -20, 2], [-16, -10, -8, -22], [-20, 2, -26, 12], [-8, -22, -30, -24]];
  const feuilles = [];
  for (const [x0, z0, x1, z1] of lianes) for (let k = 0; k < 3; k++) {
    const pts = []; for (let i = 0; i <= 14; i++) { const s = i / 14; pts.push(new THREE.Vector3(x0 + (x1 - x0) * s, 11 - k * 1.4 - Math.sin(s * Math.PI) * (4 + k), z0 + (z1 - z0) * s + k * 0.5)); }
    const cu = new THREE.CatmullRomCurve3(pts); ajouter(new THREE.Mesh(O.garde(new THREE.TubeGeometry(cu, 24, 0.09, 4)), O.lam('#2c6a1e')));
    for (let i = 0; i < 18; i++) { const q = cu.getPoint(rnd()); feuilles.push({ p: [q.x, q.y - 0.2, q.z], s: R(0.5, 0.9), r: [R(0, 3), R(0, 3), R(0, 3)], c: verts[Math.floor(rnd() * 3)] }); }
  }
  // feuillages géants au premier plan (bananiers, fougères) : feuilles texturées instanciées
  const feuille = tex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w / 2, h); g.quadraticCurveTo(-w * 0.1, h * 0.45, w / 2, 0); g.quadraticCurveTo(w * 1.1, h * 0.45, w / 2, h); g.fill(); g.globalCompositeOperation = 'destination-out'; for (let y = 60; y < h - 40; y += 34) { g.beginPath(); g.moveTo(0, y + 30); g.lineTo(w * 0.28, y); g.lineTo(w * 0.3, y + 6); g.fill(); g.beginPath(); g.moveTo(w, y + 14); g.lineTo(w * 0.72, y - 16); g.lineTo(w * 0.7, y - 10); g.fill(); } g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(0,60,0,.45)'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 6); g.stroke(); });
  const mF = O.lam('#ffffff', { map: feuille, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const touffes = [[-6, -8], [-12, -4], [-4, -14], [18, -10], [24, -6], [-14, 8], [-9, 2], [30, -16], [12, -16], [0, -20]];
  for (const [x, z] of touffes) for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + R(-0.2, 0.2), L = R(2.2, 4.2); feuilles.push({ p: [x + Math.cos(a) * L * 0.35, L * 0.42, z + Math.sin(a) * L * 0.35], s: [L * 0.45, L, 1], r: [0, -a + Math.PI / 2, R(0.5, 0.9)], c: verts[Math.floor(rnd() * 5)] }); }
  O.inst(O.PLAN, mF, feuilles);
  // fleurs
  const fleurs = []; for (let i = 0; i < 260; i++) { const a = R(-3.12, -0.05), r = R(9, 34), [x, z] = O.pol(r, a); if (x > -3 && x < 15 && z > -4) continue; fleurs.push({ p: [x, 0.25, z], s: R(0.25, 0.45), c: ['#ff5aa0', '#ffd21a', '#ffffff', '#ff8a2a', '#b06bff'][Math.floor(rnd() * 5)] }); }
  O.inst(O.ICO0, O.lam('#ffffff'), fleurs);
  // dômes habités, toits végétalisés
  const domes = [], capes = []; for (let i = 0; i < 6; i++) { const [x, z] = O.pol(R(80, 120), R(-2.9, -1.2)); const s = R(8, 14); const y0 = colline(x, z) - 1.5; domes.push({ p: [x, y0, z], s }); capes.push({ p: [x, y0 + s * 0.36, z], s: [s * 0.8, s * 0.3, s * 0.8] }); }
  O.inst(O.SPH, O.lam('#f4f4ee'), domes); O.inst(O.SPH, O.lam('#4fae3a'), capes);
  // éoliennes au loin : mât, nacelle, rotor tournant
  const blanc = O.lam('#f4f6f4'), rotors = [];
  for (let i = 0; i < 7; i++) {
    const a = -2.75 + i * 0.22, r = R(95, 125), [x, z] = O.pol(r, a), h = R(17, 21);
    const y0 = colline(x, z) - 0.5; O.boite(0.9, h, 0.9, blanc, x, y0, z, 0, O.CYL6);
    const rot = new THREE.Group(); rot.position.set(x, y0 + h, z); rot.lookAt(CX, y0 + h, 0);
    const nac = new THREE.Mesh(O.BOX, blanc); nac.scale.set(1.2, 1.2, 3); nac.position.z = -0.6; rot.add(nac);
    const helice = new THREE.Group(); helice.position.z = 1; rot.add(helice);
    for (let k = 0; k < 3; k++) { const pa = new THREE.Mesh(O.BOX, blanc); pa.scale.set(0.6, h * 0.48, 0.15); pa.position.y = h * 0.24; const bras = new THREE.Group(); bras.rotation.z = k * 2.094; bras.add(pa); helice.add(bras); }
    noMir(rot); ajouter(rot); rotors.push({ helice, v: R(0.6, 1.0), ph: rnd() * 6 });
  }
  anim.push((t) => { for (const r of rotors) r.helice.rotation.z = r.ph + t * r.v; });
  // rais de lumière dorée, pollen
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(O.PLAN, O.garde(new THREE.MeshBasicMaterial({ map: O.texHalo(), color: COL('#fff0a0'), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))); m.scale.set(6, 50, 1); m.position.set(CX - 40 + i * 12, 20, -24 - (i % 3) * 6); m.rotation.z = -0.45; noMir(m); ajouter(m); }
  O.champ({ n: 320, taille: [80, 20, 60], centre: [CX, 6, -6], vitesse: [0.4, 0.3, 0], couleurs: ['#fff6b0', '#ffe066', '#e8ffb0'], tailleMin: 0.04, tailleMax: 0.1, mise: 11, flou: 1, disque: 1, additif: true, alpha: 0.9 });
  const herbe = tex(512, 512, (g, w, h) => { g.fillStyle = '#4fa034'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(${R(40, 150) | 0},${R(140, 220) | 0},${R(30, 80) | 0},${R(0.3, 0.7)})`; g.fillRect(rnd() * w, rnd() * h, 2, R(3, 8)); } }, true);
  herbe.repeat.set(50, 50);
  O.lumiere('#fff0b0', 1.1, -18, 10, -16); O.lumiere('#c8ffb0', 0.3, 24, 8, -6);
  return { solMat: O.sol({ map: herbe, color: COL('#a8d488'), roughness: 0.9, metalness: 0, envI: 0.2 }), brouillard: { couleur: '#c4dc98', densite: 0.0055 }, miroir: false };
}

/* ================================================================ P03 « Monster High » : gothique rose et noir */
function decorGothRose(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#0a0010', milieu: '#3a0a40', bas: '#ff4fa8', nuages: 0.45 });
  // lune géante rose pâle
  const lune = tex(512, 512, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,214,236,1)'); r.addColorStop(0.62, 'rgba(255,190,225,1)'); r.addColorStop(0.64, 'rgba(255,120,200,.45)'); r.addColorStop(1, 'rgba(255,80,180,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); g.fillStyle = 'rgba(200,120,170,.35)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(w * R(0.3, 0.7), w * R(0.3, 0.7), R(8, 34), 0, 6.3); g.fill(); } });
  const [lx, lz] = O.pol(220, -2.3);
  const ml = O.plaque(lune, 90, 90, lx, 42, lz, { toneMapped: false, fog: false, depthWrite: false }); noMir(ml);
  // manoir gothique : corps, tours à toits pointus, fenêtres roses en ogive
  const fen = tex(512, 512, (g, w, h) => { g.fillStyle = '#120812'; g.fillRect(0, 0, w, h); for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const x = i * 85 + 28, y = j * 85 + 16; if (rnd() < 0.55) { const gr = g.createLinearGradient(0, y, 0, y + 60); gr.addColorStop(0, '#ff7ad0'); gr.addColorStop(1, '#a01a70'); g.fillStyle = gr; } else g.fillStyle = '#2a0f26'; g.beginPath(); g.moveTo(x, y + 64); g.lineTo(x, y + 22); g.quadraticCurveTo(x + 14, y, x + 28, y + 22); g.lineTo(x + 28, y + 64); g.fill(); } }, true);
  const mM = basic({ map: fen }), noir = O.bas('#0b050c');
  const manoir = (x, z, w, h) => { const geo = O.garde(new THREE.BoxGeometry(w, h, 10)); const uv = geo.attributes.uv; for (let i = 0; i < 24; i++) { uv.setX(i, uv.getX(i) * w / 18); uv.setY(i, uv.getY(i) * h / 18); } const m = new THREE.Mesh(geo, mM); m.position.set(x, h / 2, z); m.lookAt(CX, h / 2, 0); ajouter(m); const t = O.boite(w * 0.8, h * 0.5, 8, noir, x, h, z, m.rotation.y, O.CONE4); t.rotation.y = Math.atan2(CX - x, -z) + Math.PI / 4; };
  const [mx, mz] = O.pol(70, -2.0); manoir(mx, mz, 30, 18);
  for (const [dx, h] of [[-18, 30], [16, 26], [-6, 34]]) { const x = mx + dx * 0.6, z = mz + dx * 0.8; O.boite(6, h, 6, mM, x, 0, z, 0.4); O.boite(8, 12, 8, noir, x, h, z, Math.PI / 4, O.CONE4); O.halo(x, h - 3, z, '#ff4fb0', 6, 0.7, 2); }
  // grille en fer forgé noir, piliers rayés rose/noir, lanternes roses
  const barres = [], pointes = [], piliers = [], ray = tex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = (y / 32) % 2 ? '#ff5ab8' : '#111'; g.fillRect(0, y, w, 32); } });
  const arc = (r, a0, a1) => { for (let a = a0; a < a1; a += 0.35 / r) { const [x, z] = O.pol(r, a); if (x > -3 && x < 15 && z > -4) continue; barres.push({ p: [x, 1.6, z], s: [0.07, 3.2, 0.07] }); pointes.push({ p: [x, 3.35, z], s: [0.2, 0.4, 0.2] }); } for (let a = a0; a <= a1; a += 6 / r) { const [x, z] = O.pol(r, a); piliers.push({ p: [x, 1.9, z], s: [0.7, 3.8, 0.7] }); O.halo(x, 4.3, z, '#ff6ac8', 2.6, 0.9, 3); } };
  arc(17, -2.95, -0.35);
  O.inst(O.BOX, O.bas('#0a0a0c'), barres); O.inst(O.CONE4, O.bas('#0a0a0c'), pointes); O.inst(O.BOX, basic({ map: ray }), piliers);
  const lisses = []; for (const y of [0.6, 2.7]) for (let a = -2.95; a < -0.35; a += 0.05) { const [x, z] = O.pol(17, a + 0.025); if (x > -3 && x < 15 && z > -4) continue; lisses.push({ p: [x, y, z], s: [0.9, 0.08, 0.08], r: [0, -a - Math.PI / 2, 0] }); }
  O.inst(O.BOX, O.bas('#0a0a0c'), lisses);
  // toiles d'araignée
  const toile = tex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,200,235,.9)'; g.lineWidth = 2.5; const cx = w / 2, cy = h / 2; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2); g.stroke(); } for (let r = 18; r < w / 2; r += 22) { g.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.283, rr = r * (0.92 + 0.08 * Math.sin(i * 3)); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.stroke(); } });
  const mT = basic({ map: toile, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  for (const [a, r, y, s] of [[-2.7, 17, 3.2, 3.4], [-2.2, 17, 3.0, 2.6], [-1.4, 17, 3.2, 3], [-2.5, 40, 12, 12], [-1.1, 30, 8, 6]]) { const [x, z] = O.pol(r, a); O.plaque(null, s, s, x, y, z, { mat: mT }); }
  // arbres morts (silhouettes)
  const arbre = tex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#08040a'; g.lineCap = 'round'; const br = (x, y, a, L, e) => { if (e < 1.5) return; const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; g.lineWidth = e; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - R(0.2, 0.6), L * 0.72, e * 0.68); br(x2, y2, a + R(0.2, 0.6), L * 0.7, e * 0.68); }; br(w / 2, h, -Math.PI / 2, 140, 26); });
  const mA = basic({ map: arbre, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  for (const [a, r, s] of [[-2.75, 26, 16], [-1.25, 30, 18], [-2.05, 34, 14], [-0.6, 24, 12]]) { const [x, z] = O.pol(r, a); O.plaque(null, s, s, x, s / 2, z, { mat: mA }); }
  // chauves-souris stylisées : instances qui battent des ailes et tournent autour de la lune et du manoir
  const chauve = tex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#0b050c'; g.beginPath(); g.moveTo(w / 2, h * 0.3); g.quadraticCurveTo(w * 0.3, 0, 0, h * 0.25); g.quadraticCurveTo(w * 0.12, h * 0.5, w * 0.08, h * 0.75); g.quadraticCurveTo(w * 0.2, h * 0.55, w * 0.28, h * 0.78); g.quadraticCurveTo(w * 0.36, h * 0.58, w * 0.44, h * 0.85); g.lineTo(w / 2, h * 0.7); g.lineTo(w * 0.56, h * 0.85); g.quadraticCurveTo(w * 0.64, h * 0.58, w * 0.72, h * 0.78); g.quadraticCurveTo(w * 0.8, h * 0.55, w * 0.92, h * 0.75); g.quadraticCurveTo(w * 0.88, h * 0.5, w, h * 0.25); g.quadraticCurveTo(w * 0.7, 0, w / 2, h * 0.3); g.fill(); g.fillStyle = '#ff5ab8'; g.beginPath(); g.arc(w * 0.47, h * 0.38, 4, 0, 6.3); g.arc(w * 0.53, h * 0.38, 4, 0, 6.3); g.fill(); });
  const nb = 34, bats = new THREE.InstancedMesh(O.PLAN, basic({ map: chauve, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, fog: false }), nb); bats.frustumCulled = false; noMir(bats); ajouter(bats);
  const B = []; for (let i = 0; i < nb; i++) B.push({ c: i < 20 ? [lx * 0.25 + CX * 0.75, 0, lz * 0.25] : [mx, 0, mz], r: R(8, 24), y: R(8, 26), v: R(0.25, 0.6) * (rnd() < 0.5 ? -1 : 1), ph: rnd() * 6, s: R(1.6, 3.2) });
  const o = new THREE.Object3D();
  anim.push((t) => { B.forEach((b, i) => { const a = b.ph + t * b.v; o.position.set(b.c[0] + Math.cos(a) * b.r, b.y + Math.sin(t * 1.3 + b.ph) * 1.5, b.c[2] + Math.sin(a) * b.r * 0.6); o.rotation.set(0, -a, 0); const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 9 + b.ph)); o.scale.set(b.s * f, b.s * 0.5, 1); o.updateMatrix(); bats.setMatrixAt(i, o.matrix); }); bats.instanceMatrix.needsUpdate = true; });
  O.champ({ n: 200, taille: [70, 10, 50], centre: [CX, 2, -8], vitesse: [0.3, 0.05, 0], couleurs: ['#ff8ad0', '#c86bff'], tailleMin: 1.2, tailleMax: 2.6, mise: 12, flou: 1, disque: 1, alpha: 0.12 });
  const damier = tex(256, 256, (g, w) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? '#ff5ab8' : '#100810'; g.fillRect(i * 64, j * 64, 64, 64); } }, true);
  damier.repeat.set(34, 34);
  O.lumiere('#ff6ac8', 1.6, -14, 8, -16); O.lumiere('#a070ff', 1.0, 24, 6, -12);
  return { solMat: O.sol({ map: damier, color: COL('#c890b0'), roughness: 0.12, metalness: 0.4, opacite: 0.75, envI: 0.4 }), brouillard: { couleur: '#4a1040', densite: 0.0095 }, miroir: true };
}

/* ================================================================ P04 « Barbie Extra » : maison de poupée géante (sans marque) */
function decorMaisonPoupee(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#4a1280', milieu: '#c8358a', bas: '#ff9ccf', nuages: 0.25 });
  const motif = (f) => tex(256, 256, f, true);
  const papiers = [
    motif((g, w) => { g.fillStyle = '#ff8cc6'; g.fillRect(0, 0, w, w); g.fillStyle = '#f0409a'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, w); }),
    motif((g, w) => { g.fillStyle = '#fff0f8'; g.fillRect(0, 0, w, w); g.fillStyle = '#ff6fb8'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 64 + 32 + (j % 2) * 32, j * 64 + 32, 10, 0, 6.3); g.fill(); } }),
    motif((g, w) => { g.fillStyle = '#ffe1f0'; g.fillRect(0, 0, w, w); g.fillStyle = '#c8105e'; const coeur = (x, y, s) => { g.beginPath(); g.moveTo(x, y + s * 0.3); g.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3); g.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s); g.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3); g.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3); g.fill(); }; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) coeur(i * 64 + 32, j * 64 + 14, 32); }),
    motif((g, w) => { g.fillStyle = '#e8d8ff'; g.fillRect(0, 0, w, w); g.strokeStyle = '#b48aff'; g.lineWidth = 6; for (let x = -w; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, w); g.stroke(); } }),
    motif((g, w) => { g.fillStyle = '#fff6e0'; g.fillRect(0, 0, w, w); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if ((i + j) % 2) { g.fillStyle = '#ffc2df'; g.fillRect(i * 32, j * 32, 32, 32); } }),
    motif((g, w) => { g.fillStyle = '#ffc8e6'; g.fillRect(0, 0, w, w); g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const x = rnd() * w, y = rnd() * w; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 7, y + Math.sin(k * 1.256) * 7, 5, 0, 6.3); g.fill(); } } }),
  ];
  papiers.forEach((t) => t.repeat.set(3, 2));
  // la maison : 3 pièces × 2 étages + combles, façade ouverte (en coupe) tournée vers le bolide
  const maison = new THREE.Group(); const [hx, hz] = O.pol(40, -2.25); maison.position.set(hx, 0, hz); maison.lookAt(CX + 2, 0, 0); ajouter(maison);
  const bx = (geo, mat, w, h, d, x, y0, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z); m.rotation.y = ry; maison.add(m); return m; };
  const W = 10, HE = 7, D = 7, blanc = O.lam('#ffe6f2'), rose = O.lam('#ff1f8e'), roseP = O.lam('#ff8cc6'), bois = O.lam('#e8b48a');
  for (let e = 0; e < 2; e++) for (let i = 0; i < 3; i++) {
    const x = (i - 1) * W, y = e * HE;
    bx(O.PLAN, O.lam('#ffffff', { map: papiers[e * 3 + i] }), W, HE, 1, x, y, -D / 2);
    bx(O.BOX, e ? roseP : bois, W, 0.35, D, x, y, 0);
  }
  for (const i of [-1.5, -0.5, 0.5, 1.5]) bx(O.BOX, i === -1.5 || i === 1.5 ? rose : blanc, 0.35, HE * 2 + 0.35, D, i * W, 0, 0);
  bx(O.BOX, blanc, W * 3 + 0.7, 0.45, D + 0.4, 0, HE * 2, 0);
  for (const s of [-1, 1]) { const t = bx(O.BOX, rose, 18.5, 0.5, D + 1.4, s * 7.6, HE * 2 + 6.2, 0); t.rotation.z = s * -0.62; }
  const pign = new THREE.Mesh(O.garde(new THREE.CircleGeometry(1, 3)), roseP); pign.scale.set(17.4, 9.6, 1); pign.rotation.z = Math.PI / 2; pign.position.set(0, HE * 2 + 4.5, -D / 2 + 0.1); maison.add(pign);
  const coeur = new THREE.Mesh(O.garde(new THREE.CircleGeometry(1.6, 24)), O.lum('#ffffff')); coeur.position.set(0, HE * 2 + 4.6, -D / 2 + 0.2); maison.add(coeur);
  // mobilier géant : canapé, table basse, lampe, cuisine, lit à tête de lit, baignoire, penderie
  const m = (w, h, d, x, y0, z, c, geo = O.BOX) => bx(geo, O.lam(c), w, h, d, x, y0, z);
  m(6, 1.2, 2.2, -W, 0.35, -1.8, '#e0207a'); m(6, 1.8, 0.7, -W, 0.35, -2.9, '#e0207a'); m(0.8, 1.6, 2.2, -W - 3.2, 0.35, -1.8, '#c8105e'); m(0.8, 1.6, 2.2, -W + 3.2, 0.35, -1.8, '#c8105e');
  m(3, 0.25, 1.6, -W, 1.1, 0.8, '#ffffff', O.CYL); m(0.3, 0.8, 0.3, -W, 0.35, 0.8, '#ffffff', O.CYL);
  m(0.15, 3.5, 0.15, -W + 4, 0.35, -2.4, '#ffd700'); m(1.6, 1.2, 1.6, -W + 4, 3.8, -2.4, '#fff3b0', O.CONE8);
  m(8, 2.2, 1.4, 0, 0.35, -2.7, '#ff8cc6'); m(8.2, 0.2, 1.6, 0, 2.55, -2.7, '#ffffff'); m(2.2, 4.8, 1.6, 3.6, 0.35, -2.6, '#7fd8ff');
  m(3.2, 3, 3.2, W, 0.35, -1.4, '#ff9fd0', O.CYL); m(0.6, 6, 0.6, W, 0.35, 0.4, '#ffffff', O.CYL);
  m(6.5, 1.0, 4.2, -W, HE + 0.35, -1.2, '#ffffff'); m(6.5, 0.5, 4.0, -W, HE + 1.35, -1.2, '#f0409a'); m(6.5, 3.4, 0.4, -W, HE + 0.35, -3.2, '#c8105e');
  const tete = new THREE.Mesh(O.garde(new THREE.CircleGeometry(1.4, 24)), O.lam('#ff2d95')); tete.position.set(-W, HE + 4.2, -2.95); maison.add(tete);
  m(5, 1.5, 2.6, 0, HE + 0.35, -1.6, '#ffffff', O.CYL); m(4.4, 0.2, 2.0, 0, HE + 1.86, -1.6, '#9fe8ff', O.CYL);
  m(6, 0.15, 0.15, W, HE + 5.4, -2.6, '#ffd700');
  const cintres = []; for (let i = 0; i < 9; i++) cintres.push({ p: [-2.8 + i * 0.7, HE + 3.6, -2.6], s: [0.55, 3.4, 0.9], c: ['#c8105e', '#ffffff', '#b48aff', '#ffd700', '#5fd6ff'][i % 5] });
  const pend = O.inst(O.BOX, O.lam('#ffffff'), cintres, maison); pend.position.x = W;
  // escalier d'entrée, mobilier géant dehors (fauteuil, rouge à lèvres)
  for (let i = 0; i < 4; i++) bx(O.BOX, blanc, 6, 0.35, 1.2, 0, -0.35 + i * 0.0, D / 2 + 1.2 - i * 0.0);
  const fau = (x, z) => { O.boite(4, 1.6, 4, O.lam('#e0207a'), x, 0, z); O.boite(4, 4, 1, O.lam('#c8105e'), x, 1.6, z - 1.5); for (const s of [-1, 1]) O.boite(0.9, 2.4, 4, O.lam('#c8105e'), x + s * 2, 1.6, z); };
  fau(-24, -14); fau(30, -14);
  O.boite(1.8, 5, 1.8, O.metal('#ffd56a', 0.25), -19, 0, 6, 0, O.CYL); const rl = O.boite(1.5, 3, 1.5, O.lam('#e8106a'), -19, 5, 6, 0, O.CYL); rl.rotation.z = 0.25;
  // projecteurs de studio et paillettes
  for (let i = 0; i < 5; i++) { const x = CX - 30 + i * 14; O.halo(x, 26, -40, '#ffffff', 12, 0.6, 1.4); }
  O.champ({ n: 520, taille: [70, 26, 60], centre: [CX, 11, -6], vitesse: [0.1, -0.6, 0], couleurs: ['#ffffff', '#ffd6ee', '#ffd700', '#c8105e'], tailleMin: 0.04, tailleMax: 0.09, mise: 11, flou: 1, disque: 0, additif: true, alpha: 0.95 });
  O.champ({ n: 180, taille: [70, 22, 60], centre: [CX, 10, -12], vitesse: [0, 0.2, 0], couleurs: ['#ffffff', '#ffe1f3'], tailleMin: 0.2, tailleMax: 0.5, mise: 11, flou: 1, disque: 1, additif: true, alpha: 0.22 });
  const sp = tex(256, 256, (g, w) => { g.fillStyle = '#ff9ccf'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2500; i++) { g.fillStyle = ['rgba(255,255,255,.8)', 'rgba(255,215,0,.6)', 'rgba(255,80,170,.5)'][i % 3]; g.fillRect(rnd() * w, rnd() * w, 2, 2); } }, true);
  sp.repeat.set(60, 60);
  O.lumiere('#fff0f8', 1.0, -12, 10, -18); O.lumiere('#ff7ad9', 0.7, 24, 6, -12);
  return { solMat: O.sol({ map: sp, color: COL('#ff8cc6'), roughness: 0.1, metalness: 0.3, opacite: 0.72, envI: 0.4 }), brouillard: { couleur: '#d0509a', densite: 0.006 }, miroir: true };
}

/* ================================================================ TK03 « Le Contrôle Fiscal » : l'enfer administratif */
function decorFisc(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#0d110f', milieu: '#1d2420', bas: '#4a5a50', nuages: 0 });
  // blocs de dossiers empilés (tranches colorées, étiquettes), instanciés en tours vertigineuses qui penchent
  const tranches = tex(256, 512, (g, w, h) => {
    let y = 0; while (y < h) { const e = R(10, 26); g.fillStyle = ['#d9c79a', '#c9b27a', '#e6dcc0', '#9fb3c9', '#c98a6a', '#e8e2d2', '#a8b88a'][Math.floor(rnd() * 7)]; g.fillRect(0, y, w, e - 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + e - 2, w, 2);
      if (rnd() < 0.6) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(R(20, 150), y + 3, R(30, 70), Math.max(3, e - 9)); }
      if (rnd() < 0.25) { g.fillStyle = '#c1121f'; g.fillRect(R(160, 220), y + 2, 12, e - 6); }
      y += e; }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
  });
  const blocs = [];
  // rien entre les caméras (plan large, plan héroïque) et le grand panneau : on dégage deux couloirs de vue
  const [sx, sz] = O.pol(38, -2.3);
  const dSeg = (x, z, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - ax - vx * k, z - az - vz * k); };
  const masque = (x, z) => dSeg(x, z, 15.2, 7.5, sx, sz) < 5.5 || dSeg(x, z, 13.2, 19.5, sx, sz) < 5.5;
  const tour = (x, z, n) => { let dx = 0, dz = 0; const px = R(-0.07, 0.07), pz = R(-0.07, 0.07); for (let i = 0; i < n; i++) { dx += px * (1 + i * 0.15); dz += pz * (1 + i * 0.15); blocs.push({ p: [x + dx, 1.5 + i * 3, z + dz], s: [R(1.7, 2.3), 3, R(1.2, 1.6)], r: [pz * 0.4, R(-0.25, 0.25), -px * 0.4], c: ['#ffffff', '#f0ede4', '#e4e8ee', '#fff6e0'][Math.floor(rnd() * 4)] }); } };
  for (let i = 0; i < 70; i++) { const a = R(-3.12, -0.1), r = R(13, 60), [x, z] = O.pol(r, a); if (x > -4 && x < 16 && z > -5) continue; if (masque(x, z)) continue; tour(x, z, Math.floor(R(2, 5) + (r / 60) * R(3, 9))); }
  for (const [x, z] of [[-12, -9], [-10, -6], [-15, -14], [-6, -12], [18, -10], [22, -14]]) if (!masque(x, z)) tour(x, z, Math.floor(R(5, 9)));
  O.inst(O.BOX, O.lam('#ffffff', { map: tranches }), blocs);
  // formulaires cerfa (texture générique : cadre, numéro, cases, lignes)
  const cerfa = tex(512, 724, (g, w, h) => {
    g.fillStyle = '#fbfbf6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1b1b1b'; g.lineWidth = 3; g.strokeRect(24, 24, 120, 60);
    g.fillStyle = '#1b1b1b'; g.font = 'italic 900 44px Arial,sans-serif'; g.fillText('cerfa', 36, 68); g.font = '700 20px Arial,sans-serif'; g.fillText('N° ' + (10000 + Math.floor(rnd() * 89999)) + '*0' + Math.floor(R(1, 9)), 160, 50);
    g.font = '900 30px Arial,sans-serif'; g.fillText('DÉCLARATION', 160, 82); g.font = '700 18px Arial,sans-serif'; g.fillText('À remplir en trois exemplaires', 160, 106);
    g.fillStyle = '#d8e4f0'; g.fillRect(24, 130, w - 48, 34); g.fillStyle = '#1b1b1b'; g.fillText('CADRE A — IDENTIFICATION DU REDEVABLE', 34, 153);
    g.lineWidth = 1.5; for (let y = 190; y < h - 60; y += 30) { g.beginPath(); g.moveTo(34, y); g.lineTo(w - 34, y); g.stroke(); if (rnd() < 0.4) g.strokeRect(w - 70, y - 20, 16, 16); if (rnd() < 0.2) { g.fillStyle = '#d8e4f0'; g.fillRect(24, y + 4, w - 48, 22); g.fillStyle = '#1b1b1b'; } }
    for (let i = 0; i < 18; i++) g.strokeRect(34 + i * 24, h - 50, 20, 26);
  });
  const mC = basic({ map: cerfa, side: THREE.DoubleSide });
  const sol = []; for (let i = 0; i < 140; i++) { const a = R(-3.12, -0.05), r = R(4, 30), [x, z] = O.pol(r, a); sol.push({ p: [x, 0.02 + rnd() * 0.02, z], s: [0.62, 0.88, 1], r: [-Math.PI / 2, 0, R(0, 6.28)] }); }
  O.inst(O.PLAN, mC, sol);
  // formulaires géants adossés aux piles, tamponnés
  const tampon = (txt) => tex(512, 724, (g, w, h) => { g.drawImage(cerfa.image, 0, 0); g.save(); g.translate(w / 2, h * 0.55); g.rotate(-0.3); g.strokeStyle = 'rgba(200,20,30,.85)'; g.lineWidth = 12; g.strokeRect(-200, -60, 400, 120); g.fillStyle = 'rgba(200,20,30,.85)'; g.font = '900 86px "Arial Black",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4); g.restore(); });
  for (const [a, r, txt, ry] of [[-2.98, 14, 'REFUSÉ', 0.2], [-1.25, 17, 'INCOMPLET', -0.2], [-1.0, 13, 'À REFAIRE', 0.5]]) { const [x, z] = O.pol(r, a); const p = O.plaque(tampon(txt), 3.2, 4.5, x, 2.2, z, {}); p.rotation.x = -0.18; }
  // formulaires qui tourbillonnent en tombant
  const nv = 90, vol = new THREE.InstancedMesh(O.PLAN, mC, nv); vol.frustumCulled = false; noMir(vol); ajouter(vol);
  const V = []; for (let i = 0; i < nv; i++) V.push({ x: CX + R(-34, 30), z: R(-34, -4), y0: R(0, 18), v: R(0.5, 1.1), ph: rnd() * 6, w: R(0.6, 1.6) });
  const o = new THREE.Object3D();
  anim.push((t) => { V.forEach((f, i) => { const y = 18 - ((f.y0 + t * f.v) % 18); o.position.set(f.x + Math.sin(t * 0.6 + f.ph) * 2, y + 0.3, f.z + Math.cos(t * 0.5 + f.ph) * 1.5); o.rotation.set(t * f.w + f.ph, t * 0.7 + f.ph, Math.sin(t + f.ph)); o.scale.set(0.62, 0.88, 1); o.updateMatrix(); vol.setMatrixAt(i, o.matrix); }); vol.instanceMatrix.needsUpdate = true; });
  // tampons géants qui s'abattent
  const tampons = [];
  for (const [a, r] of [[-2.98, 22], [-1.6, 22], [-2.05, 28]]) {
    const [x, z] = O.pol(r, a), g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(O.BOX, O.lam('#3a2a1e')); base.scale.set(3, 0.8, 2); base.position.y = 0.4; g.add(base);
    const enc = new THREE.Mesh(O.BOX, O.lam('#b3121c')); enc.scale.set(2.9, 0.15, 1.9); enc.position.y = 0.02; g.add(enc);
    const col = new THREE.Mesh(O.CYL, O.lam('#5a3a22')); col.scale.set(0.7, 2.6, 0.7); col.position.y = 2.1; g.add(col);
    const pom = new THREE.Mesh(O.SPH, O.lam('#6b4428')); pom.scale.setScalar(1.6); pom.position.y = 3.8; g.add(pom);
    noMir(g); ajouter(g); tampons.push({ g, ph: rnd() * 6 });
    const marque = O.plaque(O.texteTex('VU', { w: 256, h: 128, couleur: 'rgba(200,20,30,.85)', bord: 'rgba(200,20,30,.85)', police: '900 {T}px "Arial Black",sans-serif' }), 2.8, 1.4, x + 3.2, 0.03, z + 0.5, {}); marque.rotation.set(-Math.PI / 2, 0, R(-0.4, 0.4));
  }
  anim.push((t) => { for (const s of tampons) { const k = (t * 0.55 + s.ph) % 1; s.g.position.y = k < 0.12 ? 0 : 3.5 * Math.sin(Math.min(1, (k - 0.12) / 0.5) * Math.PI / 2) * (k > 0.85 ? (1 - (k - 0.85) / 0.15) : 1); } });
  // bureaux gris, écrans cathodiques, guichet et afficheur de ticket
  const bureaux = [], ecrans = []; for (let i = 0; i < 8; i++) { const x = -22 + (i % 4) * 5, z = -18 - Math.floor(i / 4) * 5; bureaux.push({ p: [x, 0.38, z], s: [3.2, 0.76, 1.6] }); ecrans.push({ p: [x, 1.15, z - 0.2], s: [0.9, 0.8, 0.8] }); }
  O.inst(O.BOX, O.lam('#7b8288'), bureaux); O.inst(O.BOX, O.lam('#d9d2bc'), ecrans);
  const tick = document.createElement('canvas'); tick.width = 512; tick.height = 128; const tg = tick.getContext('2d'); const tt = O.garde(new THREE.CanvasTexture(tick));
  let dern = -1; const dessinTicket = (n) => { tg.fillStyle = '#0a0a0a'; tg.fillRect(0, 0, 512, 128); tg.fillStyle = '#ff2a2a'; tg.shadowColor = '#ff2a2a'; tg.shadowBlur = 16; tg.font = '900 84px "Courier New",monospace'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText('N° ' + String(n).padStart(4, '0'), 256, 66); tg.shadowBlur = 0; tt.needsUpdate = true; };
  dessinTicket(3);
  const [gx, gz] = O.pol(22, -2.98);
  O.boite(8, 1.2, 1.4, O.lam('#8c8f8a'), gx, 0, gz, -0.6); O.plaque(tt, 3.6, 0.9, gx, 4.2, gz, { toneMapped: false });
  O.plaque(O.texteTex(['GUICHET 3', 'PRENEZ UN TICKET'], { w: 512, h: 256, fond: '#1e3a6e', couleur: '#fff', police: '900 {T}px Arial,sans-serif', taille: 0.55 }), 3.6, 1.8, gx, 6.0, gz, {});
  anim.push((t) => { const n = 3 + Math.floor(t / 4); if (n !== dern) { dern = n; dessinTicket(n); } });
  // l'immense panneau lettré, suspendu au-dessus des allées
  const enseigne = O.texteTex('URSSAF', { w: 1024, h: 256, fond: '#f4f4f0', couleur: '#13306b', police: '900 {T}px "Helvetica Neue",Arial,sans-serif', taille: 0.74, bord: '#13306b' });
  O.plaque(enseigne, 24, 6, sx, 10, sz, { toneMapped: false, double: false });
  for (const s of [-1, 1]) { const [cx, cz] = O.pol(38, -2.3 + s * 0.3); O.boite(0.05, 20, 0.05, O.lam('#222'), cx, 13, cz); }
  O.halo(sx, 10, sz, '#e8fff0', 34, 0.22);
  { const [dx, dz] = O.pol(30, -1.55); O.plaque(O.texteTex('DOSSIER INCOMPLET', { w: 1024, h: 160, fond: '#c1121f', couleur: '#fff', police: '900 {T}px Arial,sans-serif' }), 10, 1.6, dx, 7.5, dz, {}); }
  // rampes de néons blafards suspendues, l'une grésille
  const neons = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 9; i++) { const x = -34 + i * 9, z = -6 - j * 9; if ((x > -4 && x < 16 && z > -5) || masque(x, z)) continue; neons.push({ p: [x, 9, z], s: [5, 0.14, 0.5] }); }
  O.inst(O.BOX, O.lum('#e9fff2'), neons);
  const cligne = O.boite(5, 0.14, 0.5, O.lum('#e9fff2'), -16, 9, -12); const hc = O.halo(-16, 8.8, -12, '#e9fff2', 9, 0.5);
  anim.push((t) => { const on = Math.sin(t * 29) * Math.sin(t * 5.3) > -0.3; cligne.visible = on; hc.visible = on; });
  for (let i = 0; i < 6; i++) O.halo(-30 + i * 11, 8.6, -15, '#dff7e6', 12, 0.25);
  O.champ({ n: 160, taille: [70, 14, 50], centre: [CX, 6, -12], vitesse: [0.1, 0.05, 0], couleurs: ['#e8f0e4'], tailleMin: 0.4, tailleMax: 1.0, mise: 14, flou: 1, disque: 1, alpha: 0.12 });
  const moq = tex(256, 256, (g, w) => { g.fillStyle = '#5b6672'; g.fillRect(0, 0, w, w); for (let i = 0; i < 8000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.03, 0.09)})`; g.fillRect(rnd() * w, rnd() * w, 2, 2); } g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, w); g.strokeRect(0, 0, w / 2, w / 2); g.strokeRect(w / 2, w / 2, w / 2, w / 2); }, true);
  moq.repeat.set(70, 70);
  O.lumiere('#e8fff0', 1.6, -10, 12, -10); O.lumiere('#b8d0c8', 0.8, 24, 6, -12);
  return { solMat: O.sol({ map: moq, color: COL('#b8c2c8'), roughness: 0.95, metalness: 0, envI: 0.15 }), brouillard: { couleur: '#52605a', densite: 0.02 }, miroir: false };
}

/* ================================================================ TK05 « Pikachu » : arène de combat en cel-shading (sans personnage) */
function decorArene(O) {
  const { THREE, R, rnd, COL, CX, tex, basic, anim, ajouter, noMir } = O;
  O.ciel({ haut: '#1d3fd6', milieu: '#7fd3ff', bas: '#ffd36b', nuages: 0 });
  // matériaux toon (3 paliers) + contours par coque inversée
  const grad = new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  const gm = O.garde(new THREE.DataTexture(grad, 3, 1, THREE.RGBAFormat)); gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
  const toon = (c, o = {}) => O.garde(new THREE.MeshToonMaterial({ color: COL(c), gradientMap: gm, ...o }));
  // encre : coque inversée gonflée le long des normales, en espace caméra → trait d'épaisseur constante à l'écran (instances comprises)
  const encre = O.garde(new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { w: { value: 0.0045 } },
    vertexShader: `uniform float w; void main(){ vec4 p = vec4(position, 1.0); vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
      #endif
      vec4 mv = modelViewMatrix * p; vec3 nv = normalize(normalMatrix * n); mv.xyz += nv * w * max(-mv.z, 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.03, 0.03, 0.07, 1.0); }' }));
  const contour = (m, e = 1) => {
    const c = m.isInstancedMesh ? new THREE.InstancedMesh(m.geometry, encre, m.count) : new THREE.Mesh(m.geometry, encre);
    if (m.isInstancedMesh) { c.instanceMatrix.copy(m.instanceMatrix); c.frustumCulled = false; }
    c.position.copy(m.position); c.quaternion.copy(m.quaternion); c.scale.copy(m.scale); if (m.parent) m.parent.add(c); else ajouter(c); return c; };
  // nuages cel (aplats, contour épais)
  const nuage = tex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const bulles = [[0.22, 0.62, 0.2], [0.4, 0.45, 0.26], [0.6, 0.5, 0.22], [0.78, 0.62, 0.17], [0.5, 0.7, 0.2]]; g.fillStyle = '#1a1a2a'; for (const [x, y, r] of bulles) { g.beginPath(); g.arc(x * w, y * h, r * h + 7, 0, 6.3); g.fill(); } g.fillStyle = '#ffffff'; for (const [x, y, r] of bulles) { g.beginPath(); g.arc(x * w, y * h, r * h, 0, 6.3); g.fill(); } g.fillStyle = '#cfe6ff'; g.fillRect(0, h * 0.74, w, h * 0.3); g.globalCompositeOperation = 'destination-in'; for (const [x, y, r] of bulles) { g.beginPath(); g.arc(x * w, y * h, r * h + 7, 0, 6.3); g.fill(); } });
  for (let i = 0; i < 7; i++) { const [x, z] = O.pol(R(160, 220), R(-2.9, -1.0)); O.plaque(nuage, R(50, 80), R(25, 36), x, R(30, 60), z, { fog: false, alphaTest: 0.2, depthWrite: false }); }
  // le terrain : bordure bleue, terre claire, lignes blanches, éclair central (motif générique)
  const terrain = tex(1024, 640, (g, w, h) => {
    g.fillStyle = '#2a63d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8c27a'; g.fillRect(40, 40, w - 80, h - 80);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(150,100,40,${R(0.05, 0.15)})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeRect(70, 70, w - 140, h - 140); g.beginPath(); g.moveTo(w / 2, 70); g.lineTo(w / 2, h - 70); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 110, 0, 6.3); g.stroke(); g.strokeRect(70, h / 2 - 140, 130, 280); g.strokeRect(w - 200, h / 2 - 140, 130, 280);
    g.fillStyle = '#ffd21a'; g.strokeStyle = '#1a1a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2 + 20, h / 2 - 80); g.lineTo(w / 2 - 40, h / 2 + 10); g.lineTo(w / 2 - 2, h / 2 + 10); g.lineTo(w / 2 - 22, h / 2 + 80); g.lineTo(w / 2 + 42, h / 2 - 12); g.lineTo(w / 2 + 4, h / 2 - 12); g.closePath(); g.fill(); g.stroke();
  });
  const t = new THREE.Mesh(O.PLAN, basic({ map: terrain, polygonOffset: true, polygonOffsetFactor: -1 })); t.scale.set(36, 22.5, 1); t.rotation.x = -Math.PI / 2; t.position.set(CX + 2.6, 0.015, -3); ajouter(t);
  const bord = O.lum('#7ff0ff'); for (const [w, d, x, z] of [[36.4, 0.25, 0, -11.25], [36.4, 0.25, 0, 11.25], [0.25, 22.5, -18.1, 0], [0.25, 22.5, 18.1, 0]]) O.boite(w, 0.08, d, bord, CX + 2.6 + x, 0.02, -3 + z);
  // gradins : profil en marches tourné autour de l'arène (demi-cercle arrière), public en points de couleur
  const prof = []; let r0 = 34, y0 = 0; prof.push(new THREE.Vector2(r0, 0)); for (let i = 0; i < 6; i++) { prof.push(new THREE.Vector2(r0, y0 + 1.8)); r0 += 2.8; y0 += 1.8; prof.push(new THREE.Vector2(r0, y0)); } prof.push(new THREE.Vector2(r0 + 2, y0 + 4)); prof.push(new THREE.Vector2(r0 + 2, 0));
  const foule = tex(1024, 256, (g, w, h) => { const n = prof.length - 1; for (let k = 0; k < n; k++) { const y0 = h - (k + 1) * h / n, y1 = h - k * h / n; if (k % 2 === 0 && k < n - 2) { g.fillStyle = '#1a2050'; g.fillRect(0, y0, w, y1 - y0); for (let r = 0; r < 3; r++) for (let x = 4; x < w; x += 9) { g.fillStyle = ['#ff3b3b', '#ffd21a', '#3b8bff', '#ffffff', '#ff7ad9', '#7cff6b', '#ff9a1a'][Math.floor(rnd() * 7)]; g.beginPath(); g.arc(x + R(-1, 1), y0 + (r + 0.5) * (y1 - y0) / 3, 3.2, 0, 6.3); g.fill(); } } else { g.fillStyle = k >= n - 2 ? '#ffd21a' : '#e8ecf4'; g.fillRect(0, y0, w, y1 - y0); g.fillStyle = '#101018'; g.fillRect(0, y0, w, 3); } } }, true);
  foule.repeat.set(6, 1);
  const grad2 = new THREE.Mesh(O.garde(new THREE.LatheGeometry(prof, 64, Math.PI * 0.5, Math.PI * 1.1)), O.garde(new THREE.MeshToonMaterial({ map: foule, gradientMap: gm, side: THREE.DoubleSide })));
  grad2.position.set(CX + 2.6, 0, -3); grad2.rotation.y = Math.PI * 0.45; ajouter(grad2); contour(grad2);
  // pylônes d'éclairage (toon + contour), rampes, faisceaux qui balaient
  const beams = [];
  for (const a of [-2.75, -2.15, -1.55, -0.95]) {
    const [x, z] = O.pol(53, a); const p = O.boite(1.4, 18, 1.4, toon('#e8ecf4'), x, 0, z); contour(p);
    const rampe = O.boite(6, 3, 0.6, toon('#2a3050'), x, 18, z); rampe.lookAt(CX, 18, 0); contour(rampe);
    O.halo(x, 19.5, z, '#ffffff', 14, 0.9);
    const b = new THREE.Mesh(O.garde(new THREE.CylinderGeometry(0.4, 4, 50, 16, 1, true)), O.garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { col: { value: COL(a < -2 ? '#fff6b0' : '#b0e4ff') } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(col, pow(vUv.y, 1.2) * pow(f, 1.6) * 0.3); }' })));
    b.position.y = -25; const piv = new THREE.Group(); piv.position.set(x, 19.5, z); piv.rotation.order = 'YXZ'; piv.add(b); noMir(piv); ajouter(piv); beams.push({ b: piv, x, z, ph: rnd() * 6 });
  }
  anim.push((tt) => { for (const s of beams) { const ax = 0.6 + 0.18 * Math.sin(tt * 0.6 + s.ph), yaw = Math.atan2(CX + 2 - s.x, -3 - s.z) + Math.sin(tt * 0.5 + s.ph) * 0.35; s.b.rotation.set(-ax, yaw, 0); } });
  // écrans géants : éclairs en zigzag et « COMBAT ! »
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d'), te = O.garde(new THREE.CanvasTexture(cv)); te.encoding = THREE.sRGBEncoding;
  let dern = -1; const dessin = (tt) => { g.fillStyle = Math.floor(tt * 2) % 2 ? '#1d3fd6' : '#e8102e'; g.fillRect(0, 0, 1024, 512); g.save(); g.translate(512, 256); g.rotate(-0.12); for (let i = -8; i < 8; i++) { g.fillStyle = i % 2 ? '#ffd21a' : '#ffe86b'; g.fillRect(i * 140 + ((tt * 200) % 140), -400, 70, 800); } g.restore();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#101018'; g.lineWidth = 22; g.lineJoin = 'round'; g.font = 'italic 900 190px "Arial Black",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const s = 1 + 0.06 * Math.sin(tt * 8); g.save(); g.translate(512, 270); g.scale(s, s); g.strokeText('COMBAT !', 0, 0); g.fillText('COMBAT !', 0, 0); g.restore(); te.needsUpdate = true; };
  dessin(0);
  for (const a of [-2.6, -1.35]) { const [x, z] = O.pol(30, a); const e = O.boite(13, 6.6, 0.8, toon('#2a3050'), x, 2.3, z); e.lookAt(CX, 5.6, 0); contour(e); O.boite(0.6, 2.3, 0.6, toon('#2a3050'), x, 0, z); const [qx, qz] = O.pol(29.1, a); O.plaque(te, 12, 6, qx, 5.6, qz, { toneMapped: false, double: false, vers: [CX, 0] }); }
  anim.push((tt) => { if (tt - dern > 0.12) { dern = tt; dessin(tt); } });
  // fanions autour de l'arène
  const fan = []; for (let a = -3.05; a < -0.1; a += 0.12) { const [x, z] = O.pol(29.5, a); fan.push({ p: [x, 3.2, z], s: [1.2, 1.6, 1], r: [Math.PI, -a - Math.PI / 2, 0], c: ['#ffd21a', '#e8102e', '#1d3fd6'][Math.floor((a + 4) / 0.12) % 3] }); }
  contour(O.inst(O.CONE4, toon('#ffffff'), fan));
  O.champ({ n: 260, taille: [60, 16, 40], centre: [CX + 2, 6, -4], vitesse: [0, 0.8, 0], couleurs: ['#ffe86b', '#ffffff', '#7ff0ff'], tailleMin: 0.04, tailleMax: 0.09, mise: 11, flou: 1, disque: 1, additif: true, alpha: 0.9 });
  // décor cel : rochers à facettes, arbres en cônes, éclairs géants sur les gradins, tous cernés d'encre
  const rocs = [], arbres = [], troncs = [];
  for (let i = 0; i < 16; i++) { const a = R(-3.1, -0.05), r = R(22, 31), [x, z] = O.pol(r, a); if (x > -4 && x < 16 && z > -6) continue; rocs.push({ p: [x, 0.6, z], s: [R(1.6, 3.2), R(1.2, 2.4), R(1.6, 3)], r: [R(0, 3), R(0, 3), 0], c: ['#8a7a6a', '#a89070', '#6a6a7a'][i % 3] }); }
  for (let i = 0; i < 20; i++) { const a = R(-3.1, -0.05), r = R(58, 80), [x, z] = O.pol(r, a), h = R(7, 12); arbres.push({ p: [x, h * 0.6, z], s: [h * 0.5, h, h * 0.5], c: ['#2fa84a', '#46c25a', '#1f8a3a'][i % 3] }); troncs.push({ p: [x, h * 0.1, z], s: [0.8, h * 0.3, 0.8] }); }
  contour(O.inst(O.ICO0, toon('#6a5a4c'), rocs.map((r) => ({ ...r, c: null })))); contour(O.inst(O.CONE8, toon('#1f8a36'), arbres.map((r) => ({ ...r, c: null })))); contour(O.inst(O.CYL6, toon('#8a5a2a'), troncs));
  const eclairF = new THREE.Shape(); [[0.2, 1], [-0.35, 0.05], [0.0, 0.05], [-0.25, -1], [0.4, 0.15], [0.05, 0.15], [0.3, 1]].forEach(([x, y], i) => (i ? eclairF.lineTo(x, y) : eclairF.moveTo(x, y)));
  const geoE = O.garde(new THREE.ExtrudeGeometry(eclairF, { depth: 0.3, bevelEnabled: false })); geoE.computeVertexNormals();
  for (const a of [-2.85, -2.3, -1.75, -1.2, -0.65]) { const [x, z] = O.pol(53, a); const e = new THREE.Mesh(geoE, toon('#ffd21a', { emissive: COL('#4a3a00') })); e.scale.setScalar(5); e.position.set(x, 16, z); e.lookAt(CX, 16, 0); ajouter(e); contour(e); }
  const pelouse = tex(256, 256, (g2, w) => { for (let i = 0; i < 8; i++) { g2.fillStyle = i % 2 ? '#5fcf4a' : '#4fbf3c'; g2.fillRect(0, i * 32, w, 32); } }, true);
  pelouse.repeat.set(30, 30);
  O.lumiere('#fff4d0', 1.4, -12, 14, -16); O.lumiere('#7fd3ff', 0.5, 24, 8, -10);
  return { solMat: O.garde(new THREE.MeshToonMaterial({ map: pelouse, gradientMap: gm })), brouillard: { couleur: '#a8d8ff', densite: 0.004 }, miroir: false };
}

/* ================================================================ registre */
const CONSTRUCTEURS = {
  U04: decorGiletJaune, E06: decorEco, P03: decorGothRose, P04: decorMaisonPoupee, H07: decorBlocus, H08: decorBrexit,
  TK03: decorFisc, TK05: decorArene, FR01: decorElysee, FR02: decorChampsElysees, FR03: decorTrocadero60, FR04: decorMontmartreRallye, FR05: decorGarage,
};
for (const c of Object.keys(ECURIES)) CONSTRUCTEURS[c] = decorBoxF1;
/** Codes qui ont un décor unique. */
export const CODES_DECORS_UNIQUES = Object.freeze(Object.keys(CONSTRUCTEURS));
/** Constructeur du décor unique d'un bolide (ou null : on garde le décor de son univers). */
export function decorUnique(code) {
  const f = CONSTRUCTEURS[code];
  return f ? (trousse) => f(outils(trousse), code) : null;
}
