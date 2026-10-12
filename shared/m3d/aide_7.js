/**
 * Aides du groupe 7 (3e vague « usine ») : carrosserie lissée par sections (loft de superellipses interpolées le long de x),
 * passages de roues creusés, pavillon vitré en retrait avec montants et toit peints, peaux peintes posées sur une surface,
 * autocollants drapés (flancs / dessus) aux bonnes positions des deux côtés, puits de roues sombres, ailerons, phares.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque : motifs génériques uniquement.
 */
import { outils } from './outils.js';

export function kit(ctx) {
  const { THREE, garde, envMap } = ctx;
  const o = outils(ctx);
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
  const DEF = { nt: 2.8, nb: 3.4, wt: 1 };
  const cache = new WeakMap();
  const norm = (st) => { if (!cache.has(st)) cache.set(st, st.map((s) => ({ ...DEF, ...s }))); return cache.get(st); };

  /** Interpolation de Hermite (tangentes de Catmull-Rom, bornée : jamais de dépassement) de tous les champs entre deux stations. */
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
  /** Point de la section (superellipse ; wt < 1 : haut plus étroit = tumblehome). */
  function sec(s, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb;
    const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * k, yc + hh * yy];
  }
  /** Corps lofté : stations [{x, w (demi-largeur), y0, y1, nt, nb, wt}] ; opt.arches = [{x, R, y, zin}] creuse les passages de roues. */
  function loft(stIn, mat, opt = {}) {
    const st = norm(stIn), NX = opt.nx || 120, NS = opt.ns || 48, ar = opt.arches || [];
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
  /** hauteur du dessus à (x, z) ; demi-largeur du flanc à (x, y) ; demi-largeur max à x */
  /** hauteur du dessus à (x, z) : résolution par dichotomie de flancAu(y) = |z| sur la moitié haute (exacte, tumblehome compris) */
  const hautAu = (st, x, z) => {
    const s = interp(norm(st), x), az = Math.abs(z); let lo = (s.y0 + s.y1) / 2, hi = s.y1;
    if (az >= flancAu(st, x, lo)) return lo;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (flancAu(st, x, m) > az) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  function flancAu(st, x, y) {
    const s = interp(norm(st), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.max(-0.9999, Math.min(0.9999, (y - yc) / hh)), n = yy >= 0 ? s.nt : s.nb;
    const zz = Math.pow(1 - Math.pow(Math.abs(yy), n), 1 / n), k = yy > 0 ? 1 - (1 - s.wt) * yy : 1; return s.w * zz * k;
  }
  const sta = (st, x) => interp(norm(st), x);

  /** Arches de creusement à partir des roues {x, RW, z, ep, y}. */
  /* Brief 10 : rayon de découpe ≥ R_pneu + 0,12 (on garde 0,13) — `jeu` ne peut qu'agrandir le passage. */
  const JEU = 0.13;
  const arches = (roues, jeu = 1.1) => roues.map((r) => ({ x: r.x, R: Math.max(r.RW * jeu + 0.03, r.RW + JEU), y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.04 }));
  /** Arc de couronne (garde-boue / puits / moulure) centré en z, largeur larg. */
  function arcGarde(x, y, Ri, Ro, z, larg, mat, a0 = -0.2, a1 = Math.PI + 0.2) {
    const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 24 });
    const m = new THREE.Mesh(garde(g), mat); m.position.set(x, y, z - larg / 2); return o.ajouter(m);
  }
  /** Puits de roues sombres derrière chaque pneu (visibles dans l'interstice pneu / aile). */
  const noirPuits = o.mat('#0a0b0e', 0.85, 0.1);
  function puits(roues) { for (const r of roues) for (const sg of [-1, 1]) arcGarde(r.x, r.y ?? r.RW, r.RW + 0.05, r.RW + JEU + 0.01, sg * (r.z - 0.04), r.ep * 0.85, noirPuits, -0.1, Math.PI + 0.1); }
  /**
   * Garde-boue enveloppant (Brief 10) : coquille d'aile peinte en arc au-dessus de chaque pneu, sur TOUTE la largeur du pneu
   * (+ débord), rayon intérieur R + jeu (≥ 0,12) : la tôle passe au-dessus du pneu, jamais à travers.
   * opt : jeu (0,13), t (épaisseur radiale), deb (débord extérieur au-delà du flanc du pneu), rentre (prolongement vers l'intérieur),
   *       a0/a1 (angles de début / fin de l'arc, 0 = arrière… non : 0 = côté +x), arrondi (rayon de biseau).
   */
  function ailes(roues, mat, opt = {}) {
    const jeu = opt.jeu ?? JEU, t = opt.t ?? 0.09, deb = opt.deb ?? 0.02, ar = opt.arrondi ?? 0.03, rentre = opt.rentre ?? 0.06;
    const res = [];
    for (const r of roues) {
      const yc = r.y ?? r.RW, Ri = r.RW + jeu + ar, Ro = r.RW + jeu + t - ar, a0 = opt.a0 ?? 0.04, a1 = opt.a1 ?? Math.PI - 0.04;
      const zi = r.z - r.ep / 2 - rentre, ze = r.z + r.ep / 2 + deb, larg = ze - zi - 2 * ar;
      const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.02, larg), bevelEnabled: ar > 0, bevelThickness: ar, bevelSize: ar, bevelSegments: 3, curveSegments: 32 });
      for (const sg of [-1, 1]) {
        const m = new THREE.Mesh(garde(g), mat);
        m.position.set(r.x, yc, sg > 0 ? zi + ar : -(ze - ar)); o.ajouter(m); res.push(m);
      }
    }
    return res;
  }

  /** Grille (u, v) → mesh. */
  function grille(nu, nv, pt, mat, inverse = false) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const [p, q] = pt(i / nu, k / nv); pos.push(...p); uv.push(...q); }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
      const a = i * (nv + 1) + k, b = (i + 1) * (nv + 1) + k;
      if (inverse) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return o.ajouter(new THREE.Mesh(garde(g), mat));
  }
  /** Matériau double face (pour les peaux posées). */
  const deuxFaces = (m) => { m.side = THREE.DoubleSide; return m; };
  /** Peau peinte posée sur le DESSUS d'un loft (toit, capot) : z couvre la largeur où la surface reste au-dessus de ytop − dy. */
  function peauDessus(st, x0, x1, dy, mat, eps = 0.022, marge = 1) {
    return grille(40, 20, (u, v) => {
      const x = x0 + (x1 - x0) * u, s = sta(st, x), zl = flancAu(st, x, s.y1 - dy) * marge, z = (v * 2 - 1) * zl;
      return [[x, hautAu(st, x, z) + eps, z], [u, v]];
    }, deuxFaces(mat));
  }
  /** Peau peinte posée sur les DEUX FLANCS d'un loft entre yb(x) et yt(x) (montants, bandes). */
  function peauFlanc(st, x0, x1, yb, yt, mat, eps = 0.02) {
    for (const sg of [-1, 1]) grille(16, 10, (u, v) => {
      const x = x0 + (x1 - x0) * u, y = yb(x) + (yt(x) - yb(x)) * v;
      return [[x, y, sg * (flancAu(st, x, y) + eps)], [u, v]];
    }, deuxFaces(mat));
  }

  /** Matériau d'autocollant : canvas transparent éclairé comme une peinture vernie. */
  function matDecal(draw, cw, ch) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.1, envMap, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
  }
  /** Convertisseur monde → canvas pour un flanc (X : x monde, Y : y monde) ; `trouer` efface les passages de roues. */
  const carte = (x0, x1, yb, yt, cw, ch) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb);
    return { sx, sy, X: (x) => (x - x0) * sx, Y: (y) => (yt - y) * sy, S: (d) => d * sx, Sy: (d) => d * sy,
      trouer(g, roues, marge = 1.14) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (const r of roues) { const rr = Math.max(r.RW * marge + 0.03, r.RW + JEU + 0.03); g.beginPath(); g.ellipse((r.x - x0) * sx, (yt - (r.y ?? r.RW)) * sy, rr * sx, rr * sy, 0, 0, Math.PI * 2); g.fill(); } g.restore(); } };
  };
  /** Autocollant drapé sur les deux flancs (nez toujours vers +x) : dessin(g, cw, ch, cote, M) ; utilise `ecrire` pour du texte lisible des deux côtés. */
  function drapeFlancs(st, x0, x1, yb, yt, dessin, cw = 1024, ch = 256, eps = 0.024, roues = null) {
    for (const sg of [1, -1]) {
      const M = carte(x0, x1, yb, yt, cw, ch);
      const mat = matDecal((g) => dessin(g, cw, ch, sg, M), cw, ch);
      const m = grille(110, 22, (u, v) => {
        let x = x0 + (x1 - x0) * u, y = yb + (yt - yb) * v;
        for (const r of roues || []) {                                  // dans le trou (transparent) : sommet plaqué sur le bord du passage
          const yc = r.y ?? r.RW, Ra = r.RW + JEU + 0.02, dx = x - r.x, dy = y - yc, d = Math.hypot(dx, dy);
          if (d < Ra && dy > 0) { const k = Ra / Math.max(1e-4, d); x = r.x + dx * k; y = yc + dy * k; }
        }
        return [[x, y, sg * (flancAu(st, x, y) + eps)], [u, v]]; }, mat);
      m.renderOrder = 2;
    }
  }
  /** Texte lisible des deux côtés (sur le flanc −z le canvas est vu en miroir). */
  const ecrire = (g, s, x, y, cote, police, couleur, align = 'center') => {
    g.save(); g.translate(x, y); if (cote < 0) g.scale(-1, 1); g.font = police; g.fillStyle = couleur; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
  };
  /** Autocollant drapé sur le dessus : canvas vu de dessus, nez vers la DROITE (u = x), haut du canvas = côté −z. */
  function drapeDessus(st, x0, x1, z0, z1, dessin, cw = 1024, ch = 256, eps = 0.03) {
    const m = grille(80, 24, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [[x, hautAu(st, x, z) + eps, z], [u, 1 - v]]; }, matDecal(dessin, cw, ch));
    m.renderOrder = 3; return m;
  }

  /** Vitrage teinté coloré. */
  const vitre = (hex, op = 0.8) => garde(new THREE.MeshPhysicalMaterial({ color: o.lin(hex), roughness: 0.05, metalness: 0.25, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.05, envMap, envMapIntensity: 0.6 }));
  /** Tige entre deux points 3D. */
  const tige = (a, b, r, mat, seg = 10) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    const m = new THREE.Mesh(garde(new THREE.CylinderGeometry(r, r, d.length(), seg)), mat);
    m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o.ajouter(m);
  };
  /** Montant (A/B…) collé au pavillon vitré : tige entre (xa, ya) et (xb, yb) posée sur la surface, des deux côtés. */
  const montant = (st, xa, ya, xb, yb, r, mat) => { for (const sg of [-1, 1]) tige([xa, ya, sg * (flancAu(st, xa, ya) + r * 0.3)], [xb, yb, sg * (flancAu(st, xb, yb) + r * 0.3)], r, mat); };
  /** Ellipsoïde (bosses d'ailes, phares, bulles). */
  const ellipsoide = (rx, ry, rz, mat, x, y, z, seg = 20) => { const m = new THREE.Mesh(garde(new THREE.SphereGeometry(1, seg, Math.max(8, seg >> 1))), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); return o.ajouter(m); };
  /** Phare rond avec cerclage (face +x par défaut, sens −1 = face arrière). */
  function phareRond(x, y, z, r, lum, cerclage, sens = 1) {
    const l = ellipsoide(r * 0.4, r, r, lum, x, y, z, 16);
    if (cerclage) o.cyl(r * 1.15, r * 1.15, r * 0.35, cerclage, x - sens * r * 0.12, y, z, 0, Math.PI / 2, 24);
    return l;
  }
  /** Plan d'aileron profilé (section d'aile extrudée sur l'envergure). */
  function plan(x, y, corde, env, ep, mat, incl = 0) {
    const s = new THREE.Shape(); s.moveTo(corde / 2, 0); s.quadraticCurveTo(0, ep, -corde / 2, ep * 0.35); s.lineTo(-corde / 2, -ep * 0.15); s.quadraticCurveTo(0, -ep * 0.1, corde / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: env, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -env / 2);
    const m = new THREE.Mesh(garde(g), mat); m.position.set(x, y, 0); m.rotation.z = incl; return o.ajouter(m);
  }
  /** Plaque verticale découpée (points [x, y]) d'épaisseur ep, centrée en z (dérives, ailerons de queue, motifs en relief). */
  function lame(pts, ep, mat, z = 0, biseau = 0.015) {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -ep / 2);
    const m = new THREE.Mesh(garde(g), mat); m.position.z = z; return o.ajouter(m);
  }
  /** Plaque d'immatriculation générique (face +x ou −x). */
  const plaque = (x, y, sens = 1, fond = '#f2f2f2', z = 0) => {
    o.boite(0.04, 0.26, 0.62, o.mat(fond, 0.5, 0.1), x, y, z);
    o.boite(0.045, 0.05, 0.54, o.mat('#2a4aa0', 0.5, 0.1), x + sens * 0.003, y + 0.085, z);
  };
  /** Roue (essieu) : centre du pneu placé pour dépasser l'aile de `sortie`. */
  const roue = (x, RW, ep, wAile, opt = {}) => ({ x, RW, ep, z: wAile - ep / 2 + (opt.sortie ?? 0.05), ...opt });

  return { o, THREE, garde, JEU, interp, sta, loft, hautAu, flancAu, arches, arcGarde, puits, ailes, peauDessus, peauFlanc, matDecal, carte, drapeFlancs, ecrire, drapeDessus, vitre, tige, montant, ellipsoide, phareRond, plan, lame, plaque, roue, deuxFaces };
}
