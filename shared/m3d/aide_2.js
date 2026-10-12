/**
 * Aides du groupe 2 : carrosserie « loft » (sections superellipses interpolées le long de x),
 * passages de roues creusés, autocollants drapés sur le dessus et sur les flancs, montants, ailerons.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque : motifs génériques uniquement.
 */
import { outils } from './outils.js';

export function aide(ctx) {
  const { THREE, chassis, garde, envMap } = ctx;
  const o = outils(ctx);
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
  const DEF = { nt: 2.6, nb: 3.4, wt: 1 };
  const cache = new WeakMap();
  const norm = (st) => { if (!cache.has(st)) cache.set(st, st.map((s) => ({ ...DEF, ...s }))); return cache.get(st); };

  /** Interpolation de Hermite (tangentes de Catmull-Rom) de tous les champs entre deux stations. */
  function interp(st, x) {
    const n = st.length; let i = 0;
    while (i < n - 2 && x > st[i + 1].x) i++;
    const a = st[i], b = st[i + 1], h = Math.max(1e-6, b.x - a.x), t = Math.min(1, Math.max(0, (x - a.x) / h));
    const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    const r = { x };
    for (const k of CH) {
      const ma = (b[k] - p0[k]) / Math.max(1e-6, b.x - p0.x), mb = (p3[k] - a[k]) / Math.max(1e-6, p3.x - a.x);
      let v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb;
      const lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.25;
      r[k] = Math.min(hi + m, Math.max(lo - m, v));
    }
    return r;
  }
  function sec(s, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb;
    const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * k, yc + hh * yy];
  }

  /** Corps lofté : stations [{x,w(demi-largeur),y0,y1,nt,nb,wt}] ; opt.arches = [{x,R,y,zin}] (passages de roues). */
  function loft(stIn, mat, opt = {}) {
    const st = norm(stIn), NX = opt.nx || 130, NS = opt.ns || 56, ar = opt.arches || [];
    const x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
    const centre = (s) => [s.x, (s.y0 + s.y1) / 2, 0];
    for (let k = 0; k < NS; k++) pos.push(...centre(st[0]));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, s = interp(st, x);
      for (let k = 0; k < NS; k++) {
        const [z, y0] = sec(s, k / NS * 2 * Math.PI); let y = y0;
        for (const a of ar) {
          const dx = Math.abs(x - a.x);
          if (dx < a.R && Math.abs(z) > a.zin) { const ya = Math.min(a.y + Math.sqrt(a.R * a.R - dx * dx), s.y1 - 0.06); if (y < ya) y = ya; }
        }
        pos.push(x, y, z);
      }
    }
    for (let k = 0; k < NS; k++) pos.push(...centre(st[st.length - 1]));
    const NT = NX + 2;
    for (let j = 0; j < NT - 1; j++) for (let k = 0; k < NS; k++) {
      const a = j * NS + k, b = j * NS + (k + 1) % NS, c = (j + 1) * NS + k, d = (j + 1) * NS + (k + 1) % NS;
      idx.push(a, c, b, b, c, d);
    }
    let vol = 0;                                                    // volume signé : retourne les faces si elles sont à l'envers
    for (let i = 0; i < idx.length; i += 3) {
      const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
      vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
    }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(garde(g), mat); m.position.y = opt.y || 0;
    return o.ajouter(m);
  }

  const hautAu = (st, x, z) => { const s = interp(norm(st), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, r = Math.min(0.9999, Math.abs(z) / s.w); return yc + hh * Math.pow(1 - Math.pow(r, s.nt), 1 / s.nt); };
  const flancAu = (st, x, y) => { const s = interp(norm(st), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.min(0.9999, Math.abs((y - yc) / hh)), n = y >= yc ? s.nt : s.nb; return s.w * Math.pow(1 - Math.pow(yy, n), 1 / n); };
  const largeurAu = (st, x) => interp(norm(st), x).w;
  /** Station interpolée (tous champs) à l'abscisse x. */
  const stAt = (st, x) => interp(norm(st), x);

  /** Matériau d'autocollant : canvas transparent éclairé comme une peinture vernie. */
  function matDecal(draw, cw, ch) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.1, envMap, envMapIntensity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
  }
  function grille(pos, uv, idx, nu, nv, pt) {
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const [p, q] = pt(i / nu, k / nv); pos.push(...p); uv.push(...q); }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, b = (i + 1) * (nv + 1) + k; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const meshGrille = (pos, uv, idx, mat) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(garde(g), mat); m.renderOrder = 2; return o.ajouter(m);
  };
  /** Autocollant drapé sur le dessus : canvas vu de dessus, nez vers la droite, +z vers le bas. */
  function drapeDessus(st, x0, x1, z0, z1, draw, cw = 1024, ch = 256, eps = 0.03) {
    const pos = [], uv = [], idx = [];
    grille(pos, uv, idx, 100, 28, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [[x, hautAu(st, x, z) + eps, z], [u, 1 - v]]; });
    return meshGrille(pos, uv, idx, matDecal(draw, cw, ch));
  }
  /** Autocollant drapé sur les deux flancs : canvas vu du côté +z, nez à droite ; l'autre côté est retourné pour rester lisible. */
  function drapeFlancs(st, x0, x1, yb, yt, draw, cw = 1024, ch = 256, eps = 0.022, parCote = false) {
    // parCote : un canvas par côté, positions exactes des deux côtés (draw reçoit sg ; au côté −z, le dessin est vu en miroir :
    // c'est au dessin de retourner localement ses textes). Sinon (historique) : canvas unique, côté −z retourné.
    const mat = parCote ? null : matDecal(draw, cw, ch), res = [];
    for (const sg of [1, -1]) {
      const pos = [], uv = [], idx = [], m = parCote ? matDecal((g, w, h) => draw(g, w, h, sg), cw, ch) : mat;
      grille(pos, uv, idx, 120, 24, (u, v) => { const x = x0 + (x1 - x0) * u, y = yb + (yt - yb) * v; return [[x, y, sg * (flancAu(st, x, y) + eps)], [sg > 0 || parCote ? u : 1 - u, v]]; });
      res.push(meshGrille(pos, uv, idx, m));
    }
    return res;
  }
  /** Convertisseur monde → canvas pour dessiner un flanc ; `trouer` efface les passages de roues. */
  const carte = (x0, x1, yb, yt, cw, ch) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb);
    return { sx, sy, X: (x) => (x - x0) * sx, Y: (y) => (yt - y) * sy,
      trouer(g, roues, marge = 1.12) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (const r of roues) { g.beginPath(); g.ellipse((r.x - x0) * sx, (yt - (r.y ?? r.RW)) * sy, r.RW * marge * sx, r.RW * marge * sy, 0, 0, Math.PI * 2); g.fill(); } g.restore(); } };
  };
  /** Passages de roues : boîtes sombres derrière chaque pneu (visibles dans l'interstice pneu / carrosserie). */
  function puits(roues, mat) {
    for (const r of roues) for (const sg of [-1, 1]) arcGarde(r.x, r.y ?? r.RW, r.RW * 0.97, r.RW * 1.1, sg * r.z, r.ep * 0.92, mat, -0.15, Math.PI + 0.15).userData.puits = true;
  }
  const arches = (roues) => roues.map((r) => ({ x: r.x, R: r.RW * 1.1 + 0.03, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.03 }));
  /** Barre inclinée entre deux points du plan (x,y), des deux côtés : montants, rétros, jambes d'aileron… */
  function barre(xa, ya, xb, yb, zDemi, ep, prof, mat) {
    const d = Math.hypot(xb - xa, yb - ya), r = [];
    for (const sg of (zDemi === 0 ? [1] : [-1, 1])) { const m = o.boite(d, ep, prof, mat, (xa + xb) / 2, (ya + yb) / 2, sg * zDemi); m.rotation.z = Math.atan2(yb - ya, xb - xa); r.push(m); }
    return r;
  }
  /** Aile arrière : plan + deux dérives + deux jambes. */
  function aile({ x, y, corde, env, ep = 0.1, mat, matDerive, hJambe, zJambe, yBase, incl = 0.0, derive = 0.34 }) {
    if (yBase !== undefined) hJambe = y - yBase + 0.06;                // jambes qui plongent dans le coffre
    const p = o.boite(corde, ep, env, mat, x, y, 0); p.rotation.z = incl;
    for (const sg of [-1, 1]) {
      o.boite(corde * 1.02, derive, 0.07, matDerive || mat, x, y + derive * 0.35, sg * env / 2);
      if (hJambe) o.boite(0.12, hJambe, 0.12, matDerive || mat, x, y - hJambe / 2, sg * (zJambe ?? env * 0.3));
    }
    return p;
  }
  /** Phare rond avec cerclage. */
  function phareRond(x, y, z, r, lum, cerclage) {
    const l = new THREE.Mesh(garde(new THREE.SphereGeometry(r, 18, 12)), lum); l.scale.set(0.4, 1, 1); l.position.set(x, y, z); o.ajouter(l);
    if (cerclage) { const c = o.cyl(r * 1.12, r * 1.12, r * 0.4, cerclage, x - r * 0.12, y, z, 0, Math.PI / 2, 24); return [l, c]; }
    return [l];
  }
  /** Couleur sRGB → linéaire (le rendu est en sortie sRGB sans gestion de couleur : sans cela les teintes sont délavées). */
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const mate = (hex, r = 0.6, m = 0.2) => garde(new THREE.MeshStandardMaterial({ color: lin(hex), roughness: r, metalness: m, envMap, envMapIntensity: 0.5 }));
  /** Peinture vernie sobre (peu de reflets d'environnement : couleurs franches). */
  const pein = (hex, r = 0.3) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: r, metalness: 0.04, clearcoat: 1.0, clearcoatRoughness: 0.08, envMap, envMapIntensity: 0.3 }));   // peinture multicouche : base mate + vernis 2K (clearcoat 1, 0,08), reflet d'environnement dosé
  /** Plaque horizontale découpée en plan (points [x,z]), épaisseur h, face supérieure à yTop. */
  function plaque(pts, yTop, h, mat) {
    const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); s.closePath();
    const m = new THREE.Mesh(garde(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false })), mat); m.rotation.x = Math.PI / 2; m.position.y = yTop; return o.ajouter(m);
  }
  /** Matériau de vitrage teinté. */
  const vitre = (hex, op = 0.82) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: 0.05, metalness: 0.25, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.05, envMap, envMapIntensity: 0.6 }));
  /** Garde-boue en arc de couronne autour d'une roue (centre x,y ; largeur sur z, centrée en z). */
  function arcGarde(x, y, Ri, Ro, z, larg, mat, a0 = -0.25, a1 = Math.PI + 0.25) {
    const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 20 });
    const m = new THREE.Mesh(garde(g), mat); m.position.set(x, y, z - larg / 2); return o.ajouter(m);
  }
  /**
   * Coque à facettes (char, blindé) : sections polygonales [{x, pts:[[z,y]…]}] (même nombre de points, polygone convexe
   * parcouru dans le même sens), reliées par des quadrilatères plans, ombrage plat (arêtes vives), extrémités fermées.
   */
  function facettes(sections, mat) {
    const pos = [], n = sections[0].pts.length, P = (s, k) => [s.x, s.pts[k % n][1], s.pts[k % n][0]];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    for (let j = 0; j < sections.length - 1; j++) for (let k = 0; k < n; k++) {
      const a = P(sections[j], k), b = P(sections[j], k + 1), c = P(sections[j + 1], k), d = P(sections[j + 1], k + 1);
      tri(a, c, b); tri(b, c, d);
    }
    for (const [s, sg] of [[sections[0], 1], [sections[sections.length - 1], -1]]) {
      const cz = s.pts.reduce((t, p) => t + p[0], 0) / n, cy = s.pts.reduce((t, p) => t + p[1], 0) / n, c = [s.x, cy, cz];
      for (let k = 0; k < n; k++) { const a = P(s, k), b = P(s, k + 1); if (sg > 0) tri(c, a, b); else tri(c, b, a); }
    }
    // orientation : volume signé positif (normales sortantes)
    let vol = 0;
    for (let i = 0; i < pos.length; i += 9) vol += pos[i] * (pos[i + 4] * pos[i + 8] - pos[i + 5] * pos[i + 7]) - pos[i + 1] * (pos[i + 3] * pos[i + 8] - pos[i + 5] * pos[i + 6]) + pos[i + 2] * (pos[i + 3] * pos[i + 7] - pos[i + 4] * pos[i + 6]);
    if (vol < 0) for (let i = 0; i < pos.length; i += 9) for (let q = 0; q < 3; q++) { const t = pos[i + 3 + q]; pos[i + 3 + q] = pos[i + 6 + q]; pos[i + 6 + q] = t; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    return o.ajouter(new THREE.Mesh(garde(g), mat));
  }
  /** Section octogonale chanfreinée symétrique : bas (wb, y0), épaule (wm, ys), dessus (wt, yt), chanfrein c. */
  const octo = (x, wb, y0, wm, ys, wt, yt, c = 0.12) => ({ x, pts: [[-wb + c, y0], [wb - c, y0], [wb, y0 + c], [wm, ys], [wt, yt], [-wt, yt], [-wm, ys], [-wb, y0 + c]] });
  /** Bloc à facettes décentré : section octo translatée en z (pods, carénages). */
  const decaler = (s, dz) => ({ x: s.x, pts: s.pts.map(([z, y]) => [z + dz, y]) });
  /**
   * « Chop top » + élargissement (barème Tolérance zéro), appliqué APRÈS la construction de la caisse :
   * toutes les pièces du châssis sont « cuites » (transformations intégrées aux sommets) puis
   * - y est remappé par une fonction affine par morceaux (nœuds [[y, y'], …] croissants ; identité sous le premier nœud),
   *   ce qui abaisse le pavillon / la ligne de caisse sans toucher aux passages de roues situés plus bas ;
   * - z est multiplié par sz (caisse et voies élargies).
   * Les pièces marquées userData.acc (aileron, dérives, antennes) ne sont pas écrasées : elles sont translatées
   * pour rester posées sur la caisse abaissée (décalage de leur point le plus bas) ; celles marquées userData.fixe
   * (casquettes d'ailes juste au-dessus des pneus) gardent leur hauteur (seul z est mis à l'échelle).
   */
  function rabaisser(noeuds = [], sz = 1) {
    const N = [[-1e9, -1e9], ...(noeuds.length ? noeuds : [[0, 0]])];
    const f = (y) => {
      if (y <= N[1][0]) return y;
      for (let i = 1; i < N.length - 1; i++) if (y <= N[i + 1][0]) { const [a, a2] = N[i], [b, b2] = N[i + 1]; return a2 + (y - a) * (b2 - a2) / (b - a); }
      const [a, a2] = N[N.length - 1], [p, p2] = N[N.length - 2]; return a2 + (y - a) * (a2 - p2) / Math.max(1e-6, a - p);   // prolongement de la dernière pente
    };
    chassis.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(chassis.matrixWorld).invert(), M = new THREE.Matrix4(), meshes = [];
    chassis.traverse((m) => { if (m.isMesh && m.geometry?.attributes?.position) meshes.push(m); });
    for (const m of meshes) {
      let acc = false, fixe = false; for (let p = m; p && p !== chassis; p = p.parent) { if (p.userData?.acc) acc = true; if (p.userData?.fixe) fixe = true; }
      M.multiplyMatrices(inv, m.matrixWorld);
      const g = garde(m.geometry.clone()); g.applyMatrix4(M);
      const pa = g.attributes.position;
      let dy = 0;
      if (acc) { let ymin = Infinity; for (let i = 0; i < pa.count; i++) ymin = Math.min(ymin, pa.getY(i)); dy = f(ymin) - ymin; }
      for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i), fixe ? pa.getY(i) : acc ? pa.getY(i) + dy : f(pa.getY(i)), pa.getZ(i) * sz);
      pa.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      m.geometry = g; if (m.parent !== chassis) chassis.add(m);
      m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix(); if (acc) m.userData.acc = true; if (fixe) m.userData.fixe = true;
    }
    // groupes vidés : on les retire
    for (const c of [...chassis.children]) if (!c.isMesh && c.children.length === 0) chassis.remove(c);
    return f;
  }
  /** Marque des pièces comme accessoires (non écrasées par rabaisser). */
  const acc = (...ms) => { for (const m of ms.flat()) if (m) m.userData.acc = true; return ms.flat(); };
  /** Roues après élargissement sz : face extérieure du pneu à fleur de l'aile (décalage final d). */
  const voies = (R, sz, d = 0) => { for (const r of R) { const out = (r.z + r.ep / 2) * sz; r.z = out - r.ep / 2 + d; } return R; };
  /**
   * Brief 10 — « zéro pneu qui traverse la tôle » : recoupe les passages de roues APRÈS rabaisser/voies.
   * Déformation continue (fonction de la seule position, donc sans fissure entre pièces) appliquée à toutes les pièces du
   * châssis : dans la bande du pneu (en z, avec un fondu latéral) et au-dessus de l'axe, tout point situé à moins de
   * R + jeu + ep de l'axe est repoussé radialement dans la couronne [R + jeu, R + jeu + ep] (ordre des couches conservé :
   * la tôle reste au-dessus du passage de roue). Résultat : arche recoupée plus haut, aile qui coiffe le pneu
   * (y_aile ≥ y_roue + R + jeu), aucun sommet de pneu au-dessus du capot ; ailleurs, rien ne bouge.
   * opt.sauf(mesh) → true : pièce exclue (ex. bras de suspension qui rejoignent le moyeu).
   */
  function degager(R, { jeu = 0.13, ep = 0.1, fondu = 0.28, sauf } = {}) {
    chassis.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(chassis.matrixWorld).invert(), M = new THREE.Matrix4(), meshes = [];
    chassis.traverse((m) => { if (m.isMesh && m.geometry?.attributes?.position && !(sauf && sauf(m))) meshes.push(m); });
    const lisse = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    for (const m of meshes) {
      M.multiplyMatrices(inv, m.matrixWorld);
      const g = garde(m.geometry.clone()); g.applyMatrix4(M);
      const pa = g.attributes.position, puits = !!m.userData.puits; let touche = false;
      for (let i = 0; i < pa.count; i++) {
        let x = pa.getX(i), y = pa.getY(i); const z = pa.getZ(i);
        for (const r of R) {
          const yc = r.y ?? r.RW, Rc = r.RW + jeu, Rm = Rc + ep, dx = x - r.x, dy = y - yc, rho = Math.hypot(dx, dy);
          if (rho >= Rm || rho < 0.04) continue;
          const dz = Math.abs(Math.abs(z) - r.z) - r.ep / 2 - 0.12;            // distance latérale hors de la bande du pneu (disque et étrier compris)
          const w = (1 - lisse(dz / fondu)) * lisse((dy / rho + 0.05) / 0.3);   // poids angulaire : pleine poussée au-dessus de ~15° (direction conservée)
          if (w <= 0) continue;
          // doublure sombre du passage (puits) : couronne mince [R + 0,04, R + 0,10], entre le pneu et la tôle (jamais au travers de l'aile)
          const cible = puits ? r.RW + 0.04 + rho * 0.06 / Rm : Rc + rho * ep / Rm;
          const rho2 = rho + w * (cible - rho);
          x = r.x + dx / rho * rho2; y = yc + dy / rho * rho2; touche = true;
        }
        pa.setXY(i, x, y);
      }
      if (!touche) continue;
      pa.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      const ud = m.userData; m.geometry = g; if (m.parent !== chassis) chassis.add(m);
      m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix(); m.userData = ud;
    }
    for (const c of [...chassis.children]) if (!c.isMesh && c.children.length === 0) chassis.remove(c);
  }
  return { ...o, THREE, rabaisser, degager, acc, voies, facettes, octo, decaler, stAt, pein, mate, plaque, vitre, arcGarde, loft, hautAu, flancAu, largeurAu, matDecal, drapeDessus, drapeFlancs, carte, puits, arches, barre, aile, phareRond };
}
