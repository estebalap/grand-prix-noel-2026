/**
 * Aides communes du groupe 6 : contour de caisse avec passages de roues, habitacle vitré, aileron, échappement, rétros.
 * Repère : avant = +x, sol y = 0, z = largeur.
 */

/** Contour fermé : bas de caisse (arrière -> avant, avec évidements de roues demi-circulaires) + contour haut (avant -> arrière). */
export function contour(xR, xF, yb, arches, haut) {
  const pts = [[xR, yb]];
  for (const a of [...arches].sort((p, q) => p.x - q.x)) {
    const r = a.r, yc = a.yc, dy = Math.max(-r * 0.98, Math.min(r * 0.98, yb - yc)), t0 = Math.asin(dy / r);
    const n = 12;
    for (let i = 0; i <= n; i++) { const t = (Math.PI - t0) + (t0 - (Math.PI - t0)) * (i / n); pts.push([a.x + r * Math.cos(t), yc + r * Math.sin(t)]); }
  }
  pts.push([xF, yb]);
  return pts.concat(haut);
}

import { lisser } from '../bolides3d_pieces.js';

/** Extrusion d'un profil puis galbage avec une boîte de référence (celle de la cabine), pour que le vitrage épouse exactement la cabine. */
function extruderRef(o, THREE, garde, pts, largeur, mat, g, ref, biseau, y) {
  const s = new THREE.Shape(); pts.forEach(([x, yy], i) => (i ? s.lineTo(x, yy) : s.moveTo(x, yy))); s.closePath();
  const b = biseau;
  const geo = new THREE.ExtrudeGeometry(s, { depth: largeur, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 3, curveSegments: 6, steps: 1 });
  geo.translate(0, 0, -largeur / 2);
  const { avant = 0.42, arriere = 0.3, lAv = 0.24, lAr = 0.2, fruit = 0.2, bombe = 0.1, forceArrondi = 2.2 } = g;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i), z = p.getZ(i);
    const u = (x - ref.xa) / (ref.xf - ref.xa), v = Math.max(0, (yy - ref.yb) / Math.max(1e-3, ref.yh - ref.yb));
    const tf = Math.max(0, (u - (1 - lAv)) / lAv), tr = Math.max(0, (lAr - u) / lAr);
    const sPlan = (1 - avant * Math.pow(Math.min(1, tf), forceArrondi)) * (1 - arriere * Math.pow(Math.min(1, tr), 2));
    const sFruit = 1 - fruit * v * v, zn = Math.min(1, Math.abs(z) / ref.zm);
    p.setXYZ(i, x, yy + bombe * (ref.yh - ref.yb) * v * v * (1 - zn * zn), z * sPlan * sFruit);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(garde(lisser(THREE, geo, 42)), mat); mesh.position.set(0, y, 0);
  return o.ajouter(mesh);
}

/** Habitacle : cabine (couleur caisse) + vitrage légèrement saillant (pare-brise, côtés, lunette), galbé avec la même référence que la cabine. */
export function habitacle(o, THREE, garde, cab, W, matCaisse, matVerre, opt = {}) {
  const { baisse = 0.12, avance = 0.05, recul = 0.08, galbe = { avant: 0.18, arriere: 0.16, fruit: 0.22, bombe: 0.04, lAv: 0.3, lAr: 0.3 }, ex = 0.05, y = 0, biseau = 0.08 } = opt;
  const xs = cab.map((q) => q[0]), ys = cab.map((q) => q[1]);
  const ref = { xa: Math.min(...xs) - biseau * 0.8, xf: Math.max(...xs) + biseau * 0.8, yb: Math.min(...ys) - biseau, yh: Math.max(...ys) + biseau, zm: W / 2 + biseau };
  const ymin = Math.min(...ys), xm = xs.reduce((a, c) => a + c, 0) / xs.length;
  const n = cab.length;
  const verre = cab.map(([x, yy], i) => {
    let X = x, Y = yy;
    if (yy > ymin + 0.15) {                                   // le sommet descend le long du montant (arête vers le voisin le plus bas)
      const A = cab[(i + n - 1) % n], B = cab[(i + 1) % n], L = A[1] < B[1] ? A : B;
      if (L[1] < yy - 0.05) { const t = Math.min(0.9, baisse / (yy - L[1])); X = x + (L[0] - x) * t; Y = yy - baisse; } else Y = yy - baisse;
    }
    return [X + (x > xm ? avance : -recul), Y];
  });
  const cabine = extruderRef(o, THREE, garde, cab, W, matCaisse, galbe, ref, biseau, y);
  const vit = extruderRef(o, THREE, garde, verre, W + 2 * biseau + ex - 0.04, matVerre, galbe, ref, 0.02, y);
  return { cabine, vit };
}

/** Aileron : plan (profil mince), deux montants, flasques latéraux. */
export function aileron(o, mat, x, y, span, corde, ep = 0.07, opt = {}) {
  const { montants = true, flasque = 0.32, yMontant = 0, mMat = mat } = opt;
  const p = o.boite(corde, ep, span, mat, x, y, 0); p.rotation.z = opt.pente ?? 0;
  for (const s of [-1, 1]) {
    o.boite(corde * 0.9, flasque, 0.06, mat, x, y + 0.02, s * span / 2);
    if (montants) o.boite(0.16, y - yMontant - 0.1, 0.1, mMat, x + corde * 0.05, (y + yMontant) / 2 - 0.02, s * span * 0.3);
  }
  return p;
}

/** Échappement : cylindre horizontal chromé avec bouche sombre. */
export function echappement(o, THREE, x, y, z, r, L = 0.25) {
  const c = o.cyl(r, r, L, o.chrome, x, y, z, 0, Math.PI / 2, 18);
  o.cyl(r * 0.72, r * 0.72, L + 0.02, o.mat('#08090b', 0.8, 0.2), x, y, z, 0, Math.PI / 2, 18);
  return c;
}

/** Rétroviseurs (un par côté). */
export function retros(o, mat, x, y, z, s = 1) {
  for (const k of [-1, 1]) o.boite(0.22 * s, 0.16 * s, 0.1 * s, mat, x, y, k * z);
}

/** Feux arrière : bloc émissif de chaque côté. */
export function feuxAr(o, lum, x, y, z, h = 0.2, l = 0.5) {
  for (const k of [-1, 1]) o.boite(0.07, h, l, lum, x, y, k * z);
}

/** Fond de passage de roue sombre (cylindre horizontal) pour masquer le vide derrière le pneu. */
export function puits(o, mat, x, yc, r, largeur) {
  o.cyl(r, r, largeur, mat, x, yc, 0, Math.PI / 2, 0, 24);
}

/** Demi-largeur de la caisse à la hauteur y (compense le « fruit » du galbe) pour coller un autocollant sans le faire flotter. */
export function zFlanc(W, fruit, yb, yt, y, marge = 0.12) {
  const v = Math.max(0, Math.min(1, (y - yb) / (yt - yb)));
  return (W / 2) * (1 - fruit * v * v) + marge;
}

/** Autocollant posé à plat sur un capot / un toit (légèrement incliné d'un angle `pente` autour de z). Le haut du canevas est le côté -z, la droite = avant. */
export function decalHaut(o, THREE, garde, dessin, w, d, x, y, pente = 0, cw = 512, ch = 256) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
  const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  const plan = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, d)), m); plan.rotation.x = -Math.PI / 2;
  const g = new THREE.Group(); g.add(plan); g.position.set(x, y, 0); g.rotation.z = -pente;
  return o.ajouter(g);
}

/** Vitrage sombre peu réfléchissant (sinon le ciel de l'envMap le rend argenté). `teinte` : couleur du verre, `opa` : opacité. */
export function vitre(ctx, garde, teinte = '#0a0d14', opa = 0.93) {
  const { THREE, envMap } = ctx;
  return garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(teinte), roughness: 0.12, metalness: 0.0, transparent: true, opacity: opa, envMap, envMapIntensity: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.1 }));
}

/** Passage de roue en arceau (demi-tore) autour d'une roue ; avec `largeur` > 0, ajoute une coque demi-cylindrique (élargisseur d'aile) de cette largeur vers l'extérieur. */
export function arceau(o, THREE, garde, mat, x, yc, r, z, tube = 0.09, largeur = 0) {
  for (const k of [-1, 1]) {
    const m = new THREE.Mesh(garde(new THREE.TorusGeometry(r, tube, 10, 28, Math.PI)), mat);
    m.position.set(x, yc, k * (z + largeur / 2)); o.ajouter(m);
    if (largeur > 0) {
      const mm = mat.clone(); mm.side = THREE.DoubleSide; garde(mm);
      const c = new THREE.Mesh(garde(new THREE.CylinderGeometry(r, r, largeur, 28, 1, true, Math.PI / 2, Math.PI)), mm);
      c.rotation.x = Math.PI / 2; c.position.set(x, yc, k * z); o.ajouter(c);
      const m2 = m.clone(); m2.position.z = k * (z - largeur / 2); o.ajouter(m2);
    }
  }
}

/* =====================================================================================================
 * Kit « usine » du groupe 6 (3e vague) : carrosserie LOFTÉE (sections superellipses le long de x),
 * ailes galbées (bosses au droit des essieux), taille resserrée, passages de roues découpés,
 * pavillon vitré en retrait (verre fumé) habillé d'un toit et de montants couleur caisse, autocollants drapés.
 * Inspiré du loft du groupe 2 (copié et étendu ici pour rester autonome).
 * ===================================================================================================== */
export function kit6(ctx) {
  const { THREE, garde, envMap } = ctx;
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
  const DEF = { nt: 2.6, nb: 3.4, wt: 1 };
  const cache = new WeakMap();
  const norm = (st) => { if (!cache.has(st)) cache.set(st, st.map((s) => ({ ...DEF, ...s })).sort((a, b) => a.x - b.x)); return cache.get(st); };
  const lisse = (u) => (u <= 0 ? 1 : u >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * u)));      // fenêtre cosinus 1 → 0

  /** Interpolation de Hermite (tangentes de Catmull-Rom, dépassement borné) entre stations. */
  function interp(st, x) {
    const n = st.length; let i = 0;
    while (i < n - 2 && x > st[i + 1].x) i++;
    const a = st[i], b = st[i + 1], h = Math.max(1e-6, b.x - a.x), t = Math.min(1, Math.max(0, (x - a.x) / h));
    const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    const r = { x };
    for (const k of CH) {
      const ma = (b[k] - p0[k]) / Math.max(1e-6, b.x - p0.x), mb = (p3[k] - a[k]) / Math.max(1e-6, p3.x - a.x);
      const v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb;
      const lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.2;
      r[k] = Math.min(hi + m, Math.max(lo - m, v));
    }
    return r;
  }
  /** Point brut de la section (angle t : 0 = flanc +z à mi-hauteur, π/2 = dessus). */
  function sec(s, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb;
    const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * k, yc + hh * yy];
  }
  /** Déformations : ailes (bosses), taille de guêpe, passages de roues. opt = { ailes:[{x,L,y,h,amp}], taille:{x,L,y,h,amp}, arches:[{x,R,y,zin}] } */
  const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  function deformer(x, y, z, s, opt, tAng) {
    let zz = z, yy = y, bosse = 0;
    const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    for (const a of opt.ailes || []) {
      const fx = lisse(Math.abs(x - a.x) / a.L);
      zz += Math.sign(z) * a.amp * fx * lisse(Math.abs(y - a.y) / a.h);
      if (a.ampY) { const b = a.ampY * fx; bosse = Math.max(bosse, b); if (y > yc) yy += b * sm(0.3, 0.78, Math.abs(z) / s.w) * Math.min(1, (y - yc) / hh * 1.6); }   // aile qui coiffe le pneu
    }
    const t = opt.taille; if (t) zz -= Math.sign(z) * t.amp * lisse(Math.abs(x - t.x) / t.L) * lisse(Math.abs(y - t.y) / t.h);
    // 10e vague : COIFFES d'ailes garanties — la moitié haute de la section est soulevée au droit de chaque roue (bande de largeur
    // du pneu, fondu vers l'axe du véhicule) d'une quantité calculée pour que la tôle passe au-dessus du pneu (cf. coiffes()).
    let plafond = -9;
    if (opt.coiffes && tAng !== undefined) {
      const ta = ((tAng % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      for (const c of opt.coiffes) {
        const dx = Math.abs(x - c.x); if (dx >= c.Lb) continue;
        const wz = sm(c.zin - c.zr, c.zin, Math.abs(zz)), env = c.yw + c.Rn * Math.pow(Math.cos(Math.PI / 2 * dx / c.Lb), 0.6);   // enveloppe cos^0,6 (Lb = 1,35 Rn) ≥ cercle de garde
        if (wz > 0.5) plafond = Math.max(plafond, env);
        if (ta > 0 && ta < Math.PI && wz > 0) {
          const a = Math.min(ta, Math.PI - ta), w = wz * sm(0, c.ta, a), k = 0.07;
          const smax = (yy + env + Math.sqrt((yy - env) * (yy - env) + k * k)) / 2;                // maximum adouci (pas d'arête)
          yy += w * (smax - yy);
        }
      }
    }
    for (const a of opt.arches || []) {
      const dx = Math.abs(x - a.x);
      if (dx < a.R && Math.abs(zz) > a.zin) { const ya = Math.min(a.y + Math.sqrt(a.R * a.R - dx * dx), Math.max(s.y1 + bosse, plafond) - 0.07); if (yy < ya) yy = ya; }
    }
    return [yy, zz];
  }
  /** Coiffes d'ailes (10e vague, « zéro pneu qui traverse la tôle ») : pour chaque essieu, dans la bande du pneu, la moitié
   *  haute de la caisse est relevée (maximum adouci) jusqu'à une enveloppe en cloche qui reste au-dessus du cercle (rayon de découpe + peau) :
   *  y_aile ≥ y_roue + R_découpe + peau ≥ y_roue + R_pneu + 0,12 + peau. La tôle déjà plus haute n'est pas touchée.
   *  À appeler APRÈS avoir défini opt.ailes / opt.taille : opt.coiffes = k.coiffes(caisse, opt, roues). */
  function coiffes(stIn, opt, roues, P = {}) {
    return roues.map((r) => {
      const yw = r.y ?? r.RW, Ra = Math.max(r.RW * (P.marge ?? 1.06) + 0.04, r.RW + 0.12), Rn = Ra + (P.peau ?? 0.05) + (r.garde ?? P.garde ?? 0);
      // enveloppe yw + Rn·cos(π dx / 2Lb)^0,6 avec Lb = 1,35 Rn : reste au-dessus du cercle de rayon Rn sur tout |dx| < Rn
      return { x: r.x, yw, Rn, Lb: Math.max(P.L ?? 0, 1.35 * Rn), zin: r.z - r.ep / 2 - 0.04, zr: P.zr ?? 0.45, ta: P.ta ?? 0.38 };
    });
  }
  /** Hauteur réelle (déformations comprises) du dessus de la caisse à (x, |z|) : pour poser phares, rétros, paupières. */
  function hautDef(stIn, opt, x, z) {
    const st = norm(stIn); let best = -9;
    for (let i = 0; i <= 90; i++) { const t = Math.PI / 2 * i / 90, [px, py, pz] = point(st, opt, x, t); if (Math.abs(pz) >= Math.abs(z) - 0.02 && Math.abs(pz) <= Math.abs(z) + 0.08) best = Math.max(best, py); }
    return best > -9 ? best : hautAu(stIn, x, z);
  }
  /** Point de surface (x, t) avec un décalage normal approximatif `eps` (vers l'extérieur). */
  function point(st, opt, x, t, eps = 0) {
    const s = interp(st, x); const [z0, y0] = sec(s, t); const [y, z] = deformer(x, y0, z0, s, opt, t);
    if (!eps) return [x, y, z];
    const yc = (s.y0 + s.y1) / 2, dy = (y - yc) / Math.max(0.05, (s.y1 - s.y0) / 2), dz = z / Math.max(0.05, s.w), d = Math.hypot(dy, dz) || 1;
    return [x, y + eps * dy / d, z + eps * dz / d];
  }
  /** Corps lofté. */
  function loft(stIn, mat, opt = {}) {
    const st = norm(stIn), NX = opt.nx || 170, NS = opt.ns || 72;
    const x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
    const centre = (s) => [s.x, (s.y0 + s.y1) / 2, 0];
    for (let k = 0; k < NS; k++) pos.push(...centre(st[0]));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u;
      for (let k = 0; k < NS; k++) pos.push(...point(st, opt, x, k / NS * 2 * Math.PI));
    }
    for (let k = 0; k < NS; k++) pos.push(...centre(st[st.length - 1]));
    const NT = NX + 2;
    for (let j = 0; j < NT - 1; j++) for (let k = 0; k < NS; k++) {
      const a = j * NS + k, b = j * NS + (k + 1) % NS, c = (j + 1) * NS + k, d = (j + 1) * NS + (k + 1) % NS;
      idx.push(a, c, b, b, c, d);
    }
    let vol = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const A = idx[i] * 3, B = idx[i + 1] * 3, C = idx[i + 2] * 3;
      vol += pos[A] * (pos[B + 1] * pos[C + 2] - pos[B + 2] * pos[C + 1]) - pos[A + 1] * (pos[B] * pos[C + 2] - pos[B + 2] * pos[C]) + pos[A + 2] * (pos[B] * pos[C + 1] - pos[B + 1] * pos[C]);
    }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(garde(g), mat);
    ctx.chassis.add(m); return m;
  }
  /** Nappe de surface entre x0..x1 et t0..t1 (décalée de eps) : toit, montants, autocollants drapés. uv : (u le long de x, v le long de t). */
  function nappe(st, opt, x0, x1, t0, t1, mat, eps = 0.02, nu = 60, nv = 16, flipU = false) {
    st = norm(st); const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) {
      const u = i / nu, v = k / nv; pos.push(...point(st, opt, x0 + (x1 - x0) * u, t0 + (t1 - t0) * v, eps)); uv.push(flipU ? 1 - u : u, v);
    }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, b = (i + 1) * (nv + 1) + k; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const mm = new THREE.Mesh(garde(g), mat); mm.renderOrder = 2; ctx.chassis.add(mm); return mm;
  }
  /** Matériau double face pour habillages fins (toit, montants). */
  const peau = (m) => { const c = m.clone(); c.side = THREE.DoubleSide; return garde(c); };
  /** Matériau d'autocollant (canvas transparent verni). cote = −1 : canvas du flanc −z — la mise en page est retournée
   *  (chaque motif garde la même abscisse véhicule que sur +z) mais les textes sont redressés autour de leur centre (lisibles). */
  function matDecal(draw, cw, ch, cote = 1) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
    if (cote < 0) {
      g.setTransform(-1, 0, 0, 1, cw, 0);
      const redresse = (orig) => (txt, x, y, mw) => {
        const lw = g.measureText(txt).width, al = g.textAlign;
        const cx = al === 'center' ? x : (al === 'right' || al === 'end') ? x - lw / 2 : x + lw / 2;
        g.save(); g.translate(cx, y); g.scale(-1, 1); g.textAlign = 'center';
        if (mw === undefined) orig(txt, 0, 0); else orig(txt, 0, 0, mw);
        g.restore();
      };
      g.fillText = redresse(g.fillText.bind(g)); g.strokeText = redresse(g.strokeText.bind(g));
    }
    draw(g, cw, ch, cote);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.05, envMap, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide, depthWrite: false }));
  }
  /** Autocollant drapé sur les deux flancs : canvas dessiné vu côté +z, nez à DROITE. Le flanc −z reçoit un canvas « par côté »
   *  (motifs à la même position avant/arrière, textes lisibles) ; la fonction de dessin reçoit cote = ±1 (4e argument, facultatif).
   *  t0 < t1 autour de 0 (bas → haut). */
  function decalFlancs(st, opt, x0, x1, t0, t1, draw, cw = 1024, ch = 256, eps = 0.012) {
    nappe(st, opt, x0, x1, t0, t1, matDecal(draw, cw, ch, 1), eps, 90, 14);
    nappe(st, opt, x1, x0, Math.PI - t0, Math.PI - t1, matDecal(draw, cw, ch, -1), eps, 90, 14);
  }
  /** Autocollant drapé sur le dessus (capot, toit) : canvas vu de dessus, nez à droite, haut du canvas = côté −z. */
  function decalDessus(st, opt, x0, x1, ta, draw, cw = 512, ch = 256, eps = 0.012) {
    const m = matDecal(draw, cw, ch);
    // v = 0 → t = π − ta (côté −z… haut du canvas), v = 1 → t = ta (côté +z)
    const mm = nappe(st, opt, x0, x1, ta, Math.PI - ta, m, eps, 60, 24);
    const uv = mm.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i));
    return mm;
  }
  /** Position x de la surface avant (sens=+1) ou arrière (−1) à la hauteur y et au décalage z donnés. */
  function boutX(stIn, y, z, sens = 1) {
    const st = norm(stIn), xa = st[0].x, xb = st[st.length - 1].x;
    for (let i = 0; i <= 400; i++) {
      const x = sens > 0 ? xb - (xb - xa) * i / 400 : xa + (xb - xa) * i / 400, s = interp(st, x);
      const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, n = y >= yc ? s.nt : s.nb, yy = Math.abs((y - yc) / hh);
      if (yy >= 1) continue;
      const k = y > yc ? 1 - (1 - s.wt) * Math.pow(yy, 1) : 1;
      const wz = s.w * k * Math.pow(1 - Math.pow(yy, n), 1 / n);
      if (Math.abs(z) < wz) return x;
    }
    return sens > 0 ? xb : xa;
  }
  /** Hauteur du dessus à (x, z). */
  function hautAu(stIn, x, z) { const s = interp(norm(stIn), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, r = Math.min(0.9999, Math.abs(z) / (s.w * s.wt)); return yc + hh * Math.pow(1 - Math.pow(r, s.nt), 1 / s.nt); }
  /** Garde-boue sombre en arc (fond de passage de roue) autour du pneu. */
  function arcGarde(x, y, Ri, Ro, z, larg, mat, a0 = -0.2, a1 = Math.PI + 0.2) {
    const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 20 });
    const m = new THREE.Mesh(garde(g), mat); m.position.set(x, y, z - larg / 2); ctx.chassis.add(m); return m;
  }
  /** Passages de roues sombres pour une liste d'essieux {x,RW,y?,z,ep}. */
  function puitsRoues(roues, mat, marge = 1.1) { for (const r of roues) for (const sg of [-1, 1]) arcGarde(r.x, r.y ?? r.RW, r.RW * 1.01, r.RW * marge + 0.03, sg * (r.z - r.ep * 0.12), r.ep * 0.72, mat); }
  /** Découpes de passages pour le loft. */
  const arches = (roues, marge = 1.1) => roues.map((r) => ({ x: r.x, R: Math.max(r.RW * marge + 0.04, r.RW + 0.12), y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.04 }));   // découpe ≥ R_pneu + 0,12 (brief 10)
  /** Bosses d'ailes au droit des roues. */
  const ailes = (roues, amp, L = 1.15, dy = 0.15, h = 0.62, ampY = 0) => roues.map((r) => ({ x: r.x, L: r.RW * L + 0.2, y: (r.y ?? r.RW) + dy, h, amp: r.amp ?? amp, ampY: r.ampY ?? ampY }));
  /** Phare / feu en lentille ellipsoïde posé contre une face (normale ±x). */
  function lentille(x, y, z, ry, rz, mat, prof = 0.07) { const l = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 20, 12)), mat); l.scale.set(prof, ry, rz); l.position.set(x, y, z); ctx.chassis.add(l); return l; }
  /** Barre inclinée (montant, jambe) entre deux points du plan (x,y), symétrique en z. */
  function barre(o, xa, ya, xb, yb, zDemi, ep, prof, mat) {
    const d = Math.hypot(xb - xa, yb - ya), r = [];
    for (const sg of (zDemi === 0 ? [1] : [-1, 1])) { const m = o.boite(d, ep, prof, mat, (xa + xb) / 2, (ya + yb) / 2, sg * zDemi); m.rotation.z = Math.atan2(yb - ya, xb - xa); r.push(m); }
    return r;
  }
  /** Pavillon complet : bulle de verre fumé + toit et montants couleur caisse plaqués par-dessus (le verre paraît en retrait).
   *  cab = stations du pavillon ; toit = [xa, xb] ; A, C = [xa, xb] (bandes de coin) ; B = [x…] montants verticaux ; tA = angle du coin. */
  function pavillon(o, cab, matCadre, P = {}) {
    if (P.yb !== undefined) cab = cab.map((q) => ({ ...q, y0: q.y0 ?? 2 * P.yb - q.y1 }));      // mi-hauteur de section = ligne de ceinture : la moitié haute seule émerge
    const verre = P.verre || garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#0a1222').convertSRGBToLinear(), roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.95, envMap, envMapIntensity: 0.22, clearcoat: 0.25, clearcoatRoughness: 0.12 })), opt = {}, skin = peau(matCadre), st = norm(cab);
    const n0 = ctx.chassis.children.length;
    loft(cab, verre, { nx: 90, ns: 56 });
    const tR = P.tR ?? 0.62, ep = P.ep ?? 0.025;
    if (P.toit) nappe(cab, opt, P.toit[0], P.toit[1], tR, Math.PI - tR, skin, ep, 50, 24);
    const lb = P.lb ?? 0.2;                                                // largeur angulaire des montants A/C
    for (const r of [P.A, P.C].filter(Boolean)) for (const [a, b] of [[tR - lb, tR + 0.02], [Math.PI - tR - 0.02, Math.PI - tR + lb]]) nappe(cab, opt, r[0], r[1], a, b, skin, ep, 30, 6);
    for (const xb of P.B || []) for (const [a, b] of [[-0.5, tR + 0.02], [Math.PI - tR - 0.02, Math.PI + 0.5]]) nappe(cab, opt, xb - (P.lB ?? 0.08), xb + (P.lB ?? 0.08), a, b, skin, ep, 4, 16);
    if (P.ceinture) for (const [a, b] of [[-0.6, P.ceinture], [Math.PI - P.ceinture, Math.PI + 0.6]]) nappe(cab, opt, st[0].x + 0.05, st[st.length - 1].x - 0.05, a, b, skin, ep, 60, 6);   // bas de vitre couleur caisse
    if (P.plancher !== undefined) {                                        // brief 10 : la moitié basse cachée de la bulle (et des montants) ne plonge pas dans les passages de roues
      const pl = typeof P.plancher === 'function' ? P.plancher : () => P.plancher;
      for (const m of ctx.chassis.children.slice(n0)) {
        const pa = m.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) { const v = pl(pa.getX(i)); if (pa.getY(i) < v) pa.setY(i, v); }
        pa.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
      }
    }
    return st;
  }
  return { norm, interp, point, loft, nappe, peau, matDecal, decalFlancs, decalDessus, boutX, hautAu, hautDef, arcGarde, puitsRoues, arches, ailes, coiffes, lentille, barre, pavillon };
}

/* =====================================================================================================
 * 4e vague (refus « bulle ») : PAVILLON À FACETTES PLANES.
 * Le pavillon est un prisme dont le profil (x, y) est donné de l'avant (base du pare-brise) vers l'arrière ;
 * ses flancs sont des PLANS inclinés (tumblehome linéaire : demi-largeur wb à la ceinture → wt au sommet),
 * pare-brise / toit / lunette sont des facettes planes à arêtes vives (lissage seulement entre facettes
 * presque alignées). Les vitres sont des panneaux plats posés en retrait des bords : les montants
 * (A, B, C) et le cadre de toit restent couleur caisse.
 * ===================================================================================================== */
export function serre(ctx, o, P) {
  const { THREE, garde } = ctx;
  const { pts, yb, wb, wt, plonge = 0.25, seuil = 0.4, eps = 0.008 } = P;
  const ytop = Math.max(...pts.map((p) => p[1]));
  const hy = (y) => (y <= yb ? wb : wb - (wb - wt) * Math.min(1, (y - yb) / Math.max(1e-3, ytop - yb)));
  // rétrécissement en plan vers la poupe (option taper : {x0, x1, f}) : la demi-largeur diminue de f entre x0 et x1 (< x0)
  const T = P.taper; const tp = (x) => (T ? 1 - T.f * Math.min(1, Math.max(0, (T.x0 - x) / (T.x0 - T.x1))) : 1);
  const hw = (y, x = 1e9) => hy(y) * (x === 1e9 ? 1 : tp(x));
  const Q = [[pts[0][0], yb - plonge], ...pts, [pts[pts.length - 1][0], yb - plonge]];
  const n = Q.length;
  const cx = Q.reduce((a, p) => a + p[0], 0) / n, cy = Q.reduce((a, p) => a + p[1], 0) / n;
  // normale (unitaire, sortante) de la facette de l'arête i (Q[i] → Q[i+1])
  const nf = Q.map((A, i) => {
    const B = Q[(i + 1) % n];
    const u = new THREE.Vector3(B[0] - A[0], B[1] - A[1], hw(B[1], B[0]) - hw(A[1], A[0])), v = new THREE.Vector3(0, 0, -1);
    const N = new THREE.Vector3().crossVectors(u, v).normalize();
    if (N.x * ((A[0] + B[0]) / 2 - cx) + N.y * ((A[1] + B[1]) / 2 - cy) < 0) N.negate();
    return N;
  });
  // normale lissée au sommet i pour la facette f (f = i-1 ou i)
  const nv = (i, f) => { const a = nf[(i - 1 + n) % n], b = nf[i % n]; return a.angleTo(b) < seuil ? a.clone().add(b).normalize() : nf[f].clone(); };
  const pos = [], nor = [];
  const tri = (p, q, r, na, nb, nc) => { pos.push(...p, ...q, ...r); nor.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z); };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, A = Q[i], B = Q[j];
    const nA = nv(i, i), nB = nv(j, i);
    const Ap = [A[0], A[1], hw(A[1], A[0])], Am = [A[0], A[1], -hw(A[1], A[0])], Bp = [B[0], B[1], hw(B[1], B[0])], Bm = [B[0], B[1], -hw(B[1], B[0])];
    const nAm = new THREE.Vector3(nA.x, nA.y, -nA.z), nBm = new THREE.Vector3(nB.x, nB.y, -nB.z);
    tri(Ap, Bp, Bm, nA, nB, nBm); tri(Ap, Bm, Am, nA, nBm, nAm);
  }
  // flancs plans (triangulation du profil)
  const c2 = Q.map((p) => new THREE.Vector2(p[0], p[1])), cw = THREE.ShapeUtils.isClockWise(c2);
  const faces = THREE.ShapeUtils.triangulateShape(c2, []);
  for (const s of [1, -1]) {
    const Ns = new THREE.Vector3(0, (wb - wt) / Math.max(1e-3, ytop - yb), 1).normalize(); Ns.z *= s;
    for (const f of faces) {
      let [a, b, c] = f; if (cw === (s > 0)) [b, c] = [c, b];
      const P3 = (k) => [Q[k][0], Q[k][1], s * hw(Q[k][1], Q[k][0])];
      tri(P3(a), P3(b), P3(c), Ns, Ns, Ns);
    }
  }
  // orientation des triangles : on force l'enroulement cohérent avec la normale fournie
  for (let t = 0; t < pos.length; t += 9) {
    const a = new THREE.Vector3(pos[t], pos[t + 1], pos[t + 2]), b = new THREE.Vector3(pos[t + 3], pos[t + 4], pos[t + 5]), c = new THREE.Vector3(pos[t + 6], pos[t + 7], pos[t + 8]);
    const fn = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (fn.dot(new THREE.Vector3(nor[t], nor[t + 1], nor[t + 2])) < 0) for (let k = 0; k < 3; k++) { const x = pos[t + 3 + k]; pos[t + 3 + k] = pos[t + 6 + k]; pos[t + 6 + k] = x; const y = nor[t + 3 + k]; nor[t + 3 + k] = nor[t + 6 + k]; nor[t + 6 + k] = y; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const solide = o.ajouter(new THREE.Mesh(garde(g), P.mat));
  const verre = P.verre;
  const vd = verre.side === THREE.DoubleSide ? verre : garde(Object.assign(verre.clone(), { side: THREE.DoubleSide }));
  /** Vitre posée sur les facettes d'arêtes i0..i1 (indices dans pts : l'arête k va de pts[k] à pts[k+1]), en retrait de `mc` sur les côtés et `ml` aux extrémités. */
  function panneau(i0, i1, mc = 0.1, ml = 0.08, mat = vd) {
    const a0 = i0 + 1, a1 = i1 + 2;                                 // indices dans Q
    const chemin = []; for (let k = a0; k <= a1; k++) chemin.push(Q[k]);
    const L = []; let tot = 0; for (let k = 1; k < chemin.length; k++) { tot += Math.hypot(chemin[k][0] - chemin[k - 1][0], chemin[k][1] - chemin[k - 1][1]); L.push(tot); }
    const at = (d) => { let k = 0; while (k < L.length - 1 && L[k] < d) k++; const d0 = k ? L[k - 1] : 0, t = (d - d0) / Math.max(1e-6, L[k] - d0); const A = chemin[k], B = chemin[k + 1]; return { p: [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], f: a0 + k }; };
    const stations = [{ ...at(ml), bout: true }];
    for (let k = 1; k < chemin.length - 1; k++) if (L[k - 1] > ml && L[k - 1] < tot - ml) stations.push({ p: chemin[k], f: a0 + k, sommet: a0 + k });
    stations.push({ ...at(tot - ml), bout: true });
    const ps = [], ns = [], ids = [];
    stations.forEach((s, k) => {
      const N = s.sommet !== undefined ? nv(s.sommet, s.f) : nf[s.f];
      for (const sg of [1, -1]) { const z = sg * Math.max(0.05, hw(s.p[1], s.p[0]) - mc); ps.push(s.p[0] + N.x * eps * 2, s.p[1] + N.y * eps * 2, z + sg * Math.abs(N.z) * eps * 2); ns.push(N.x, N.y, sg * N.z); }
      if (k) { const b = (k - 1) * 2; ids.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3)); gg.setIndex(ids);
    return o.ajouter(new THREE.Mesh(garde(gg), mat));
  }
  /** Vitre latérale plate : polygone (x, y) plaqué sur les deux flancs plans. */
  function laterale(poly, mat = vd, e = eps) {
    const sh = new THREE.Shape(); poly.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
    for (const s of [1, -1]) {
      const gg = new THREE.ShapeGeometry(sh); const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, s * (hw(p.getY(i), p.getX(i)) + e));
      gg.computeVertexNormals(); o.ajouter(new THREE.Mesh(garde(gg), mat));
    }
  }
  /** Hauteur du dessus du pavillon à l'abscisse x (interpolation du profil). */
  function hautX(x) {
    for (let k = 0; k < pts.length - 1; k++) { const A = pts[k], B = pts[k + 1]; if ((x - A[0]) * (x - B[0]) <= 0) return A[1] + (B[1] - A[1]) * (x - A[0]) / ((B[0] - A[0]) || 1e-6); }
    return yb;
  }
  if (P.pb) panneau(P.pb[0], P.pb[1], P.mcPb ?? 0.09, P.mlPb ?? 0.07);
  if (P.lu) panneau(P.lu[0], P.lu[1], P.mcLu ?? 0.11, P.mlLu ?? 0.08);
  for (const c of P.cotes || []) laterale(c);
  return { solide, panneau, laterale, hw, hautX, Q };
}

/** Verre fumé opaque des pavillons facettés (teinte sRGB convertie en linéaire, reflet discret : pas d'effet miroir argenté). */
export function verreFume(ctx, hex = '#0b0f18', env = 0.12) {
  const { THREE, garde, envMap } = ctx;
  return garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).convertSRGBToLinear(), roughness: 0.18, metalness: 0.0, envMap, envMapIntensity: env, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
}

/** Fonds de passages de roues sombres placés à l'INTÉRIEUR des flancs (visibles seulement dans la découpe d'aile, jamais en sourcil au-dessus). */
export function puitsInt(k, roues, mat, marge = 1.06) { for (const r of roues) for (const sg of [-1, 1]) k.arcGarde(r.x, r.y ?? r.RW, r.RW * 1.01, r.RW * marge + 0.02, sg * (r.z - r.ep * 0.55), r.ep * 0.5, mat); }

/** Coiffe d'aile couleur caisse au-dessus d'une roue (secteur d'anneau épais) : referme le haut du passage de roue
 *  quand le capot est plus bas que le pneu. Le pneu dépasse légèrement en largeur (ext = retrait côté extérieur). */
export function coiffe(k, r, mat, { a0 = 0.35, a1 = Math.PI - 0.35, ep = 0.07, jeu = 0.05, ext = 0.06 } = {}) {
  const Ri = r.RW + jeu, larg = r.ep + 0.08 - ext;
  for (const sg of [-1, 1]) k.arcGarde(r.x, r.y ?? r.RW, Ri, Ri + ep, sg * (r.z - ext / 2 - 0.04 * 0), larg, mat, a0, a1);
}

/* =====================================================================================================
 * 9e vague « Tolérance zéro » : TASSEMENT ET ÉLARGISSEMENT GLOBAL du châssis (chop top).
 * Chaque maille du châssis est figée dans le repère du châssis puis déformée :
 *   - au-dessus de yA, la hauteur est comprimée d'un facteur s avec un raccord C1 (exponentiel) sur la distance d
 *     → le pavillon descend, les passages de roues (sous yA) restent intacts et concentriques aux roues ;
 *   - toute la largeur est multipliée par sz (caisse et voies élargies ensemble) ;
 *   - les mailles marquées userData.rigide (rétros, phares ronds, rivets…) sont seulement déplacées (forme conservée).
 * Retourne f(y) pour recalculer les cotes (hauteur de toit, aileron…).
 * ===================================================================================================== */
export function tasser(ctx, { yA = 1.3, s = 0.6, d = 0.25, sz = 1 } = {}) {
  const { THREE, chassis, garde } = ctx;
  const f = (y) => { if (y <= yA) return y; const t = y - yA; return yA + s * t + (1 - s) * d * (1 - Math.exp(-t / d)); };
  chassis.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(chassis.matrixWorld).invert(), mailles = [];
  chassis.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.position) mailles.push(o); });
  const v = new THREE.Vector3();
  for (const m of mailles) {
    const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    let rig = false; for (let p = m; p && p !== chassis; p = p.parent) if (p.userData && p.userData.rigide) rig = true;
    const g = m.geometry.clone(); g.applyMatrix4(rel);
    const pa = g.attributes.position;
    if (rig) {
      g.computeBoundingBox(); const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
      g.translate(0, f(c.y) - c.y, c.z * (sz - 1));
    } else {
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); pa.setXYZ(i, v.x, f(v.y), v.z * sz); }
      g.computeVertexNormals();
    }
    pa.needsUpdate = true; g.computeBoundingSphere();
    const acc = m.userData.acc || (m.parent && m.parent.userData && m.parent.userData.acc);
    if (m.parent) m.parent.remove(m);
    m.geometry = garde(g); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.updateMatrix();
    if (acc) m.userData.acc = true;
    chassis.add(m);
  }
  // groupes vidés (autocollants posés à plat) : on les retire
  for (const c of [...chassis.children]) if (!c.isMesh && c.children.length === 0) chassis.remove(c);
  return f;
}

/** Marque une ou plusieurs mailles comme accessoires (aileron, rétros…) : exclues de la mesure du pavillon. */
export function acc(...ms) { for (const m of ms.flat()) if (m) m.userData.acc = true; return ms[0]; }
/** Marque des mailles rigides (déplacées sans être déformées par tasser). */
export function rigide(...ms) { for (const m of ms.flat()) if (m) m.userData.rigide = true; return ms[0]; }
