/**
 * Aides du groupe 5 : contours de caisse avec passages de roues, formes en plan, arches, décalcomanies planes.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun nom de marque.
 */
import { outils } from './outils.js';

/** Polygone de profil (x,y) : dessous plat avec passages de roues en demi-cercle, dessus donné de l'arrière vers l'avant. */
export function contour(haut, yBas, passages = [], k = 1) {
  const xAr = haut[0][0], xAv = haut[haut.length - 1][0], pts = [[xAr, yBas]];
  for (const p of passages.slice().sort((u, v) => u.x - v.x)) {
    const yw = p.y ?? yBas, R = p.R, Rx = R / k;                       // k : échelle en x du châssis (arche restée circulaire)
    if (yw >= yBas) {
      pts.push([p.x - Rx, yBas]);
      if (yw > yBas + 0.01) pts.push([p.x - Rx, yw]);
      for (let i = 1; i < 16; i++) { const t = Math.PI - (i / 16) * Math.PI; pts.push([p.x + Rx * Math.cos(t), yw + R * Math.sin(t)]); }
      if (yw > yBas + 0.01) pts.push([p.x + Rx, yw]);
      pts.push([p.x + Rx, yBas]);
    } else {                                                           // centre de roue sous le plan du dessous : corde
      const a0 = Math.asin(Math.min(1, (yBas - yw) / R));
      for (let i = 0; i <= 16; i++) { const t = Math.PI - a0 - (i / 16) * (Math.PI - 2 * a0); pts.push([p.x + Rx * Math.cos(t), yw + R * Math.sin(t)]); }
    }
  }
  pts.push([xAv, yBas]);
  for (let i = haut.length - 1; i >= 0; i--) pts.push([haut[i][0], haut[i][1]]);
  return pts;
}

/** k : échelle en x appliquée au châssis (raccourcit/allonge sans déformer les roues) ; kz : élargissement de toute la caisse en z
 *  (voies élargies : les roues, hors châssis, sont à placer à z × kz). */
export function aide(ctx, k = 1, kz = 1) {
  const { THREE, garde, envMap } = ctx;
  ctx.chassis.scale.x = k; ctx.chassis.scale.z = kz;
  const o = { ...outils(ctx) };
  const lacBase = o.lac;
  o.lac = (hex, r = 0.25, m = 0.4) => { const mt = lacBase(hex, Math.max(0.22, r), Math.min(m, 0.16)); return mt; };   // couleurs saturées (peu de métal, un peu assombries)
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(garde(geo), m); me.position.set(x, y, z); return o.ajouter(me); };
  /** matériau translucide (vitres teintées, optiques) */
  const translucide = (hex, op = 0.78, em = 0) => garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: 0.08, metalness: 0.1, transparent: true, opacity: op, emissive: new THREE.Color(hex), emissiveIntensity: em, clearcoat: 1, clearcoatRoughness: 0.05, envMap, envMapIntensity: 1.2 }));
  /** caisse extrudée avec passages de roues (haut : points de l'arrière vers l'avant). */
  const coque = (haut, yBas, passages, W, m, opt = {}) => o.profil(contour(haut, yBas, passages, k), W, m, { biseau: 0.05, ...opt });
  /** profil plat (vitre, panneau) sans galbe, décalé latéralement de z. */
  const dalle = (pts, W, m, z = 0, bis = 0.015) => { const me = o.profil(pts, W, m, { galbe: false, biseau: bis }); me.position.z = z; return me; };
  /** forme vue de dessus [[x,z]…], hauteur h à partir de y0. */
  const plan = (pts, y0, h, m, bis = 0.04) => {
    const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: bis > 0, bevelThickness: bis, bevelSize: bis, bevelSegments: 3, curveSegments: 6 });
    const me = new THREE.Mesh(garde(g), m); me.rotation.x = Math.PI / 2; me.position.y = y0 + h; return o.ajouter(me);
  };
  const ellipsoide = (rx, ry, rz, m, x, y, z, seg = 20) => { const me = new THREE.Mesh(garde(new THREE.SphereGeometry(1, seg, 14)), m); me.scale.set(rx, ry, rz); me.position.set(x, y, z); return o.ajouter(me); };
  const tube = (pts, r, m, seg = 28) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(c, seg, r, 10, false), m);
  };
  /** lèvre d'aile : demi-anneau au-dessus de la roue (axe z). */
  const arche = (x, yc, R, z, m, t = 0.06) => { const me = mesh(new THREE.TorusGeometry(R, t, 8, 28, Math.PI), m, x, yc, z); me.scale.x = 1 / k; return me; };
  /** bloc sombre qui bouche le passage de roue côté intérieur (pas de vue à travers la caisse). */
  const remplir = (x, R, yBas, yHaut, demiZ, m) => o.boite(2 * R / k, yHaut - yBas, 2 * demiZ, m, x, (yBas + yHaut) / 2, 0);
  /** autocollant simple face sur plan quelconque (toit, capot) : rot = [rx, ry, rz]. */
  const decal = (dessin, w, h, pos, rot = [-Math.PI / 2, 0, 0], cw = 512, ch = 512) => {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), m); p.position.set(...pos); p.rotation.set(...rot); return o.ajouter(p);
  };
  /** boîte inclinée autour de z (rotation en radians) */
  const boiteInc = (l, h, p, m, x, y, z, rz = 0, ry = 0) => { const b = o.boite(l, h, p, m, x, y, z); b.rotation.z = rz; b.rotation.y = ry; return b; };
  /** fût cylindrique d'axe x */
  const cylX = (r, len, m, x, y, z, seg = 20) => o.cyl(r, r, len, m, x, y, z, 0, Math.PI / 2, seg);
  /** fût cylindrique d'axe z */
  const cylZ = (r, len, m, x, y, z, seg = 20) => o.cyl(r, r, len, m, x, y, z, Math.PI / 2, 0, seg);
  /** disque plein de roue (face colorée) posé sur les deux côtés d'une roue : x en repère du châssis (avant échelle), couronne et moyeu optionnels. */
  const disque = (x, y, z, R, ep, hex, couronne = null, moyeu = '#15161a') => {
    const mt = garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.4, metalness: 0.15, envMap }));
    for (const s of [-1, 1]) {
      const zz = s * (z + ep * 0.5 - 0.035);
      const d = o.cyl(R, R, 0.04, mt, x / k, y, zz, Math.PI / 2, 0, 40); d.scale.x = 1 / k;
      if (couronne) { const c = o.cyl(R * 0.88, R * 0.88, 0.05, garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(couronne), roughness: 0.5, metalness: 0.1 })), x / k, y, zz + s * 0.004, Math.PI / 2, 0, 40); c.scale.x = 1 / k; const c2 = o.cyl(R * 0.8, R * 0.8, 0.06, mt, x / k, y, zz + s * 0.008, Math.PI / 2, 0, 40); c2.scale.x = 1 / k; }
      const h = o.cyl(R * 0.2, R * 0.2, 0.07, garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(moyeu), roughness: 0.5, metalness: 0.3 })), x / k, y, zz + s * 0.012, Math.PI / 2, 0, 24); h.scale.x = 1 / k;
    }
  };
  /* ---------------------------------------------------------------- carrosserie lissée (« loft ») : sections superellipses interpolées le long de x
   * station : { x, w (demi-largeur), y0 (bas), y1 (haut), nt (exposant du haut), nb (exposant du bas), wt (rapport de largeur au sommet : tumblehome) }
   * forme : { ailes:[{x, R, dw, yH}] bosses d'ailes (dw : élargissement relatif), taille:{x0, x1, dw, y0, y1} flancs creusés, arches:[{x, R, y, zin}] passages de roues } */
  const DEF = { nt: 2.6, nb: 3.4, wt: 1 };
  const norm = (st) => st.map((s) => ({ ...DEF, ...s }));
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
  function interp(st, x) {
    const n = st.length; let i = 0;
    while (i < n - 2 && x > st[i + 1].x) i++;
    const A = st[i], B = st[i + 1], h = Math.max(1e-6, B.x - A.x), t = Math.min(1, Math.max(0, (x - A.x) / h));
    const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2, r = { x };
    for (const c of CH) {
      const ma = (B[c] - p0[c]) / Math.max(1e-6, B.x - p0.x), mb = (p3[c] - A[c]) / Math.max(1e-6, p3.x - A.x);
      const v = h00 * A[c] + h10 * h * ma + h01 * B[c] + h11 * h * mb, lo = Math.min(A[c], B[c]), hi = Math.max(A[c], B[c]), mg = (hi - lo) * 0.2;
      r[c] = Math.min(hi + mg, Math.max(lo - mg, v));
    }
    return r;
  }
  function sec(s, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb, yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const kk = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * kk, yc + hh * yy];
  }
  /** facteur de largeur (x, y) : bosses d'ailes au droit des essieux, taille creusée entre les deux. */
  function facteur(f) {
    const ailes = f.ailes || [], ta = f.taille;
    return (x, y) => {
      let m = 1;
      for (const e of ailes) {
        const L = e.R * 1.55, dx = Math.abs(x - e.x); if (dx >= L) continue;
        const bx = 0.5 * (1 + Math.cos(Math.PI * dx / L)), yH = e.yH ?? 99, by = y <= yH ? 1 : Math.max(0, 1 - (y - yH) / 0.32);
        m += e.dw * bx * by;
      }
      if (ta && x > ta.x0 && x < ta.x1 && y > ta.y0 && y < ta.y1) m -= ta.dw * Math.sin(Math.PI * (x - ta.x0) / (ta.x1 - ta.x0)) * Math.sin(Math.PI * (y - ta.y0) / (ta.y1 - ta.y0));
      return m;
    };
  }
  /** Corps lofté : renvoie { mesh, flanc(x,y), haut(x,z), st, f }. */
  function corps(stIn, m, forme = {}, opt = {}) {
    const st = norm(stIn), f = facteur(forme), ar = forme.arches || [], NX = opt.nx || 120, NS = opt.ns || 56;
    const x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
    const centre = (s) => [s.x, (s.y0 + s.y1) / 2, 0];
    for (let q = 0; q < NS; q++) pos.push(...centre(st[0]));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, s = interp(st, x);
      for (let q = 0; q < NS; q++) {
        let [z, y] = sec(s, q / NS * 2 * Math.PI); z *= f(x, y); if (opt.ymin !== undefined && y < opt.ymin) y = opt.ymin;
        for (const A of ar) { const dx = Math.abs(x - A.x); if (dx < A.R && Math.abs(z) > A.zin) { const ya = Math.min(A.y + Math.sqrt(A.R * A.R - dx * dx), s.y1 - 0.05); if (y < ya) y = ya; } }
        pos.push(x, y, z);
      }
    }
    for (let q = 0; q < NS; q++) pos.push(...centre(st[st.length - 1]));
    for (let j = 0; j < NX + 1; j++) for (let q = 0; q < NS; q++) {
      const A = j * NS + q, B = j * NS + (q + 1) % NS, C = (j + 1) * NS + q, D = (j + 1) * NS + (q + 1) % NS; idx.push(A, C, B, B, C, D);
    }
    let vol = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
      vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
    }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const me = new THREE.Mesh(garde(g), m); o.ajouter(me);
    const flanc = (x, y) => { const s = interp(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.min(0.9999, Math.abs((y - yc) / hh)), n = y >= yc ? s.nt : s.nb;
      const kk = y >= yc ? 1 - (1 - s.wt) * yy : 1; return s.w * kk * Math.pow(1 - Math.pow(yy, n), 1 / n) * f(x, y); };
    const haut = (x, z) => { const s = interp(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, r = Math.min(0.9999, Math.abs(z) / (s.w * f(x, s.y1))); return yc + hh * Math.pow(1 - Math.pow(r, s.nt), 1 / s.nt); };
    return { mesh: me, flanc, haut, st, f, ar };
  }
  /** Serre (vitrage + pavillon + montants) à tumblehome : xs = [base lunette, haut lunette, haut pare-brise, base pare-brise] ;
   *  yb : ceinture, yt : toit, wb : demi-largeur à la ceinture, rt : rapport de largeur au toit (0,7–0,8), montants : x des montants milieu (en bas). */
  function serre({ xs, yb, yt, wb, rt = 0.74, verre, peint, montants = [], ep = 0.07, nt = 5, toit = true, pente = 0.12, ext = 0, ntToit = 3.2, yminV = 0.03 }) {
    const [a, b, c, d] = xs, h = yt - yb, s = (x, y) => ({ x, w: wb, y0: yb - (y - yb) - 0.02, y1: y, nt, nb: 2, wt: 1 - (1 - rt) * Math.min(1, (y - yb) / h) });
    const st = [s(a, yb + 0.04), s(a + (b - a) * 0.5, yb + h * 0.62), s(b, yt), s((b + c) / 2, yt + 0.02), s(c, yt), s(c + (d - c) * 0.5, yb + h * 0.55), s(d, yb + 0.04)];
    const G = corps(st, verre, {}, { nx: 90, ns: 48, ymin: yb - yminV });
    if (toit) {                                                           // pavillon peint, débordant légèrement du vitrage
      const r = (x, e) => ({ x, w: wb * rt + 0.05, y0: yt - 0.09 - e, y1: yt + 0.07, nt: ntToit, nb: 2 });   // ntToit élevé : vrai pavillon plat et large
      corps([r(b - 0.18, -0.04), r(b + 0.1, 0), r(c - 0.1, 0), r(c + 0.18, -0.04)], peint, {}, { nx: 40, ns: 40 });
    }
    // montants inclinés vers l'intérieur (posés sur le vitrage : vitre en retrait)
    const mont = (xa, xb2) => { for (const sg of [-1, 1]) tube([[xa, yb - 0.02, sg * (wb + 0.02)], [(xa + xb2) / 2, yb + h * 0.5, sg * (wb * (1 + rt) / 2 + 0.025)], [xb2, yt + 0.01, sg * (wb * rt + 0.02)]], ep, peint, 10); };
    mont(a + ext, b); mont(d - ext, c); for (const x of montants) mont(x, x - pente);
    // ceinture de caisse : jonc peint sous les vitres
    for (const sg of [-1, 1]) tube([[a + 0.05, yb + 0.01, sg * (wb + 0.03)], [(a + d) / 2, yb + 0.01, sg * (wb + 0.035)], [d - 0.05, yb + 0.01, sg * (wb + 0.03)]], 0.045, peint, 16);
    return G;
  }
  /** vrai si le point (x, y) d'un flanc tombe dans un passage de roue du corps C (l'autocollant n'y est pas posé : aucun film à travers le pneu). */
  const dansArche = (C, x, y) => (C.ar || []).some((A) => { const dx = x - A.x, dy = y - A.y; return dx * dx + dy * dy < (A.R + 0.02) ** 2 || (Math.abs(dx) < A.R + 0.02 && y < A.y); });
  /** nappe (NU × NV) compactée : quads dont un sommet tombe dans un passage de roue supprimés, sommets inutilisés retirés
   *  (aucun film d'autocollant, même invisible, ne traverse le pneu). Remplit pos/uv/idx en place. */
  const compacterNappe = (C, pos, uv, idx, NU, NV) => {
    const dehors = (k) => !dansArche(C, pos[3 * k], pos[3 * k + 1]), brut = [];
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const A = i * (NV + 1) + j, B = (i + 1) * (NV + 1) + j; if (dehors(A) && dehors(B) && dehors(A + 1) && dehors(B + 1)) brut.push(A, B, A + 1, A + 1, B, B + 1); }
    const nv = new Map(), p2 = [], u2 = [];
    for (const k of brut) { if (!nv.has(k)) { nv.set(k, p2.length / 3); p2.push(pos[3 * k], pos[3 * k + 1], pos[3 * k + 2]); u2.push(uv[2 * k], uv[2 * k + 1]); } idx.push(nv.get(k)); }
    pos.length = 0; pos.push(...p2); uv.length = 0; uv.push(...u2);
  };
  /** Autocollant drapé sur les deux flancs d'un corps : canvas vu côté +z, nez à droite. */
  function drapeFlancs(C, x0, x1, yb, yt, dessin, cw = 1024, ch = 256, eps = 0.02) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.05, envMap, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
    for (const sg of [1, -1]) {
      const pos = [], uv = [], idx = [], NU = 110, NV = 22;
      for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const u = i / NU, v = j / NV, x = x0 + (x1 - x0) * u, y = yb + (yt - yb) * v; pos.push(x, y, sg * (C.flanc(x, y) + eps)); uv.push(sg > 0 ? u : 1 - u, v); }
      compacterNappe(C, pos, uv, idx, NU, NV);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const me = new THREE.Mesh(garde(g), m); me.renderOrder = 2; o.ajouter(me);
    }
  }
  /** Variante côté par côté : dessin(g, w, h, X) appelé une fois par flanc ; X(x) donne l'abscisse canvas d'un x monde du bon côté
   *  (le flanc −z reçoit un canvas miroir : motifs à la même place sur la caisse, textes lisibles des deux côtés ; textes à placer via X avec textAlign 'center'). */
  function drapeFlancsC(C, x0, x1, yb, yt, dessin, cw = 1024, ch = 256, eps = 0.02, yHautMax = null) {
    // dessin(g, w, h, X) : placement explicite par X ; dessin(g, w, h) sans X (mise en page du flanc +z en pixels) : miroir automatique
    // du canvas côté −z (motifs à la même abscisse véhicule) avec textes remis à l'endroit (voir miroirAuto).
    const auto = dessin.length < 4;
    for (const sg of [1, -1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const X = (x) => (sg > 0 ? (x - x0) / (x1 - x0) : (x1 - x) / (x1 - x0)) * cw;
      const g2 = cv.getContext('2d');
      if (auto && sg < 0) miroirAuto(g2, cw, () => dessin(g2, cw, ch, X)); else dessin(g2, cw, ch, X);
      const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      const m = garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.05, envMap, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
      const pos = [], uv = [], idx = [], NU = 140, NV = 26;
      for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
        const u = i / NU, v = j / NV, x = x0 + (x1 - x0) * u;
        const ytop = yHautMax ? Math.min(yt, yHautMax(x)) : yt, y = yb + (yt - yb) * v, yy = Math.min(y, ytop);   // la nappe ne dépasse jamais le dessus local de la caisse
        pos.push(x, yy, sg * (C.flanc(x, yy) + eps)); uv.push(sg > 0 ? u : 1 - u, v);
      }
      compacterNappe(C, pos, uv, idx, NU, NV);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const me = new THREE.Mesh(garde(g), m); me.renderOrder = 2; o.ajouter(me);
    }
  }
  /** Exécute trace() dans un canvas retourné horizontalement (miroir de la mise en page) en gardant les textes lisibles :
   *  fillText/strokeText sont interceptés et chaque texte est redessiné à l'endroit sur l'emprise miroir exacte de son emprise d'origine
   *  (alignement et rotation compris). */
  function miroirAuto(g, cw, trace) {
    const f0 = g.fillText, s0 = g.strokeText;
    const ecrire = (fn) => function (t, x, y, ...r) {
      const W = g.measureText(t).width, al = g.textAlign, xs = al === 'center' ? x - W / 2 : (al === 'right' || al === 'end') ? x - W : x;
      g.save(); g.translate(xs + W, y); g.scale(-1, 1); g.textAlign = 'left'; fn.call(g, t, 0, 0, ...r); g.restore();
    };
    g.fillText = ecrire(f0); g.strokeText = ecrire(s0);
    g.save(); g.translate(cw, 0); g.scale(-1, 1);
    try { trace(); } finally { g.restore(); g.fillText = f0; g.strokeText = s0; }
  }
  /** Autocollant plan des deux côtés d'une caisse à flancs droits : même abscisse véhicule des deux côtés, textes lisibles
   *  (dessin(g, w, h) mis en page vu du côté +z, nez à droite). */
  function decalFlancC(dessin, w, h, x, y, zDemi, cw = 1024, ch = 256) {
    for (const sg of [1, -1]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
      if (sg < 0) miroirAuto(g, cw, () => dessin(g, cw, ch)); else dessin(g, cw, ch);
      const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), m); p.position.set(x, y, sg * zDemi); if (sg < 0) p.rotation.y = Math.PI; o.ajouter(p);
    }
  }
  /** Autocollant drapé sur le dessus d'un corps : canvas vu de dessus, nez à droite, +z en bas. */
  function drapeDessus(C, x0, x1, z0, z1, dessin, cw = 1024, ch = 256, eps = 0.02) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.05, envMap, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
    const pos = [], uv = [], idx = [], NU = 80, NV = 24;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const u = i / NU, v = j / NV, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; pos.push(x, C.haut(x, z) + eps, z); uv.push(u, 1 - v); }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const A = i * (NV + 1) + j, B = (i + 1) * (NV + 1) + j; idx.push(A, B, A + 1, A + 1, B, B + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const me = new THREE.Mesh(garde(g), m); me.renderOrder = 2; return o.ajouter(me);
  }
  /** Coque de passage de roue sombre (demi-couronne autour du pneu, côté intérieur de l'aile). */
  function puits(x, y, R, z, larg, m, av = false) {
    const s = new THREE.Shape(); s.absarc(0, 0, R + 0.1, -0.2, Math.PI + 0.2, false); s.absarc(0, 0, R + 0.02, Math.PI + 0.2, -0.2, true); s.closePath();
    for (const sg of [-1, 1]) {
      const me = new THREE.Mesh(garde(new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 18 })), m); me.position.set(x, y, sg * z - larg / 2); o.ajouter(me);
      o.cyl(R + 0.1, R + 0.1, 0.04, m, x, y, sg * Math.max(0.2, z - larg / 1.8 - (av ? 0.2 : 0.07)), Math.PI / 2, 0, 28);   // flasque intérieure sombre (masque la caisse derrière les rayons)
    }
  }
  /** Arches de loft calculées depuis les roues du retour (x, RW, z, ep, y). */
  const archesDe = (roues, jeu = 0.12) => roues.map((r) => ({ x: r.x, R: r.RW + jeu, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - (r.avant ? 0.24 : 0.1) }));
  return { k, kz, disque, o, mesh, translucide, coque, dalle, plan, ellipsoide, tube, arche, remplir, decal, boiteInc, cylX, cylZ, corps, serre, drapeFlancs, drapeFlancsC, drapeDessus, puits, archesDe, miroirAuto, decalFlancC };
}
