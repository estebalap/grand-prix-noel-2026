/**
 * Aides du groupe 10 (B02–B05, bolides de justicier masqué, formes génériques sans emblème) :
 * carrosserie « loft » (sections superellipses interpolées le long de x, d'après l'aide du groupe 2),
 * passages de roues creusés, autocollants drapés, ailerons dorsaux festonnés, turbine, ellipsoïdes.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque : motifs génériques uniquement.
 */
import { outils } from './outils.js';

export function aide10(ctx) {
  const { THREE, garde, envMap } = ctx;
  const o = outils(ctx);
  const CH = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
  const DEF = { nt: 2.6, nb: 3.4, wt: 1 };
  const cache = new WeakMap();
  /** Roues du modèle (déclarées par `roues(R)`) : les autocollants drapés sont dégagés de leur volume. */
  let ROUES = [];
  const declarerRoues = (R) => { ROUES = R; return R; };
  /** Relève un point (x, y, z) hors du volume d'un pneu : il est remonté sur l'arche (R + 0,14) au-dessus de la roue. */
  const degager = (x, y, z) => {
    const az = Math.abs(z);
    for (const r of ROUES) {
      const ry = r.y ?? r.RW, Ra = r.RW + 0.14, dx = Math.abs(x - r.x);
      if (dx >= Ra || az < r.z - r.ep / 2 - 0.08 || az > r.z + r.ep / 2 + 0.12) continue;
      const ya = ry + Math.sqrt(Ra * Ra - dx * dx); if (y < ya) y = ya;
    }
    return y;
  };
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
      const v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb;
      const lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.25;
      r[k] = Math.min(hi + m, Math.max(lo - m, v));
    }
    return r;
  }
  /** Point de la section (superellipse ; `wt` < 1 resserre le haut = tumblehome). */
  function sec(s, t) {
    const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb;
    const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
    const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
    return [s.w * zz * k, yc + hh * yy];
  }

  /** Corps lofté : stations [{x,w(demi-largeur),y0,y1,nt,nb,wt}] ; opt.arches = [{x,R,y,zin}] (passages de roues). */
  function loft(stIn, mat, opt = {}) {
    const st = norm(stIn), NX = opt.nx || 140, NS = opt.ns || 60, ar = opt.arches || [];
    const x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
    const centre = (s) => [s.x, (s.y0 + s.y1) / 2, 0];
    for (let k = 0; k < NS; k++) pos.push(...centre(st[0]));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, s = interp(st, x);
      for (let k = 0; k < NS; k++) {
        const [z0, y0] = sec(s, k / NS * 2 * Math.PI); let y = y0, z = z0;
        for (const a of ar) {
          const dx = Math.abs(x - a.x);
          if (dx < a.R && Math.abs(z) > a.zin) {
            // arche : la tôle remonte au-dessus du pneu ; si la caisse est trop basse pour coiffer le pneu (+0,08),
            // elle est rentrée jusqu'à la face intérieure du pneu (jamais de tôle qui traverse la roue)
            const ya = a.y + Math.sqrt(a.R * a.R - dx * dx), cap = s.y1 - 0.06, rt = (a.rt ?? a.R - 0.14) + 0.08;
            const ys = a.y + Math.sqrt(Math.max(0, rt * rt - dx * dx));
            if (y >= ya) continue;
            if (ya <= cap) y = ya;
            else if (cap >= ys) y = Math.max(y, cap);
            else if (a.zin >= 0) z = Math.sign(z) * a.zin;
            else y = Math.max(y, cap);
          }
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
    const m = new THREE.Mesh(garde(g), mat); m.position.set(opt.dx || 0, opt.y || 0, opt.z || 0);
    return o.ajouter(m);
  }

  /** Hauteur du dessus au point (x, z) : recherche par dichotomie sur la section (tient compte du resserrement `wt`). */
  const hautAu = (st, x, z) => {
    const s = interp(norm(st), x), az = Math.abs(z); let lo = 0, hi = Math.PI / 2;
    if (sec(s, lo)[0] <= az) return sec(s, lo)[1];
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (sec(s, m)[0] > az) lo = m; else hi = m; }
    return sec(s, lo)[1];
  };
  const flancAu = (st, x, y) => { const s = interp(norm(st), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.min(0.9999, Math.abs((y - yc) / hh)), n = y >= yc ? s.nt : s.nb; let w = s.w * Math.pow(1 - Math.pow(yy, n), 1 / n); if (y > yc) w *= 1 - (1 - s.wt) * yy; return w; };

  /** Matériau d'autocollant : canvas transparent éclairé comme une peinture vernie. */
  function matDecal(draw, cw, ch, emissif = false) {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const base = { map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false };
    return garde(emissif ? new THREE.MeshBasicMaterial({ ...base, toneMapped: false })
      : new THREE.MeshStandardMaterial({ ...base, roughness: 0.3, metalness: 0.1, envMap, envMapIntensity: 0.8 }));
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
  function drapeDessus(st, x0, x1, z0, z1, draw, cw = 1024, ch = 256, eps = 0.03, emissif = false, dz = 0) {
    const pos = [], uv = [], idx = [];
    grille(pos, uv, idx, 110, 30, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [[x, degager(x, hautAu(st, x, z) + eps, z + dz), z + dz], [u, 1 - v]]; });
    return meshGrille(pos, uv, idx, matDecal(draw, cw, ch, emissif));
  }
  /** Autocollant drapé sur les deux flancs : canvas vu du côté +z, nez à droite ; l'autre côté est retourné. */
  function drapeFlancs(st, x0, x1, yb, yt, draw, cw = 1024, ch = 256, eps = 0.022, emissif = false, dz = 0) {
    for (const sg of [1, -1]) {
      // un canvas par côté : au flanc −z la mise en page est symétrisée (même abscisse véhicule), textes redressés
      const mat = matDecal((g, w, h) => o.dessinerCote(draw, g, w, h, sg), cw, ch, emissif);
      const pos = [], uv = [], idx = [];
      grille(pos, uv, idx, 130, 26, (u, v) => { const x = x0 + (x1 - x0) * u, y0 = yb + (yt - yb) * v, y = degager(x, y0, flancAu(st, x, y0) + dz); return [[x, y, sg * (dz + flancAu(st, x, y) + eps)], [sg > 0 ? u : 1 - u, v]]; });
      meshGrille(pos, uv, idx, mat);
    }
  }
  /** Convertisseur monde → canvas ; `trouer` efface les passages de roues. */
  const carte = (x0, x1, yb, yt, cw, ch) => {
    const sx = cw / (x1 - x0), sy = ch / (yt - yb);
    return { sx, sy, X: (x) => (x - x0) * sx, Y: (y) => (yt - y) * sy,
      trouer(g, roues, marge = 1.14) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (const r of roues) { g.beginPath(); g.ellipse((r.x - x0) * sx, (yt - (r.y ?? r.RW)) * sy, r.RW * marge * sx, r.RW * marge * sy, 0, 0, Math.PI * 2); g.fill(); } g.restore(); } };
  };
  /** Passages de roues creusés (le loft relève son bas au droit des pneus). */
  const arches = (roues) => roues.map((r) => ({ x: r.x, R: r.RW + 0.14, rt: r.RW, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.06 }));
  /** Garde-boue en arc de couronne autour d'une roue (centre x,y ; largeur sur z, centrée en z). */
  function arcGarde(x, y, Ri, Ro, z, larg, mat, a0 = -0.2, a1 = Math.PI + 0.2) {
    const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 20 });
    const m = new THREE.Mesh(garde(g), mat); m.position.set(x, y, z - larg / 2); return o.ajouter(m);
  }
  /** Fond sombre des passages de roues (arc intérieur, derrière le pneu, côté caisse). */
  function puits(roues, mat) {
    for (const r of roues) for (const sg of [-1, 1]) arcGarde(r.x, r.y ?? r.RW, r.RW * 1.06, r.RW * 1.16, sg * (r.z - r.ep / 2 - 0.08), 0.12, mat, -0.1, Math.PI + 0.1);
  }
  /** Ellipsoïde (sphère scalée). */
  function ellipsoide(rx, ry, rz, mat, x, y, z, rotz = 0, roty = 0) {
    const m = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 32, 18)), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); m.rotation.set(0, roty, rotz); return o.ajouter(m);
  }
  /**
   * Aileron dorsal : polygone (x,y) extrudé en épaisseur, biseauté, posé de part et d'autre (±z) et incliné vers l'extérieur (`devers`).
   * `pts` : contour de la dérive ; le festonnage du bord de fuite est donné directement dans les points.
   */
  function aileron(pts, ep, mat, z, devers = 0.12, pinc = 0) {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: true, bevelThickness: ep * 0.35, bevelSize: ep * 0.3, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -ep / 2);
    const res = [];
    for (const sg of (z === 0 ? [1] : [-1, 1])) {
      const m = new THREE.Mesh(garde(g), mat); m.position.z = sg * z; m.rotation.x = sg * devers; m.rotation.y = -sg * pinc; res.push(o.ajouter(m));
    }
    return res;
  }
  /** Turbine frontale (axe x, face vers +x) : bague chromée, fond noir, aubes qui tournent avec la vitesse. */
  function turbine(x, y, z, R, prof, matBague, matFond, matAube) {
    const grp = new THREE.Group(); grp.position.set(x, y, z);
    const bague = new THREE.Mesh(garde(new THREE.CylinderGeometry(R, R * 0.96, prof, 36, 1, true)), matBague); bague.rotation.z = Math.PI / 2; grp.add(bague);
    const levre = new THREE.Mesh(garde(new THREE.TorusGeometry(R * 0.97, R * 0.08, 10, 40)), matBague); levre.rotation.y = Math.PI / 2; levre.position.x = prof / 2; grp.add(levre);
    const fond = new THREE.Mesh(garde(new THREE.CircleGeometry(R * 0.96, 32)), matFond); fond.rotation.y = Math.PI / 2; fond.position.x = -prof * 0.3; grp.add(fond);
    const rotor = new THREE.Group(); rotor.position.x = -prof * 0.05; grp.add(rotor);
    for (let i = 0; i < 12; i++) {
      const a = new THREE.Mesh(garde(new THREE.BoxGeometry(0.03, R * 0.78, R * 0.22)), matAube);
      const ang = i / 12 * Math.PI * 2; a.position.set(0, Math.cos(ang) * R * 0.5, Math.sin(ang) * R * 0.5); a.rotation.x = -ang; a.rotation.y = 0.5; rotor.add(a);
    }
    const ogive = new THREE.Mesh(garde(new THREE.ConeGeometry(R * 0.3, R * 0.5, 24)), matBague); ogive.rotation.z = -Math.PI / 2; ogive.position.x = prof * 0.12; rotor.add(ogive);
    o.ajouter(grp);
    ctx.animes.push((t, dt, v) => { rotor.rotation.x += (2 + Math.abs(v || 0) * 3) * dt; });
    return grp;
  }
  /** Tuyère arrière (axe x, ouverte vers −x). */
  function tuyere(x, y, z, R, L, matExt, lum) {
    o.cyl(R * 0.85, R, L, matExt, x, y, z, 0, Math.PI / 2, 28);
    const d = new THREE.Mesh(garde(new THREE.CircleGeometry(R * 0.7, 24)), lum); d.rotation.y = -Math.PI / 2; d.position.set(x - L / 2 - 0.005, y, z); o.ajouter(d);
    const t = new THREE.Mesh(garde(new THREE.TorusGeometry(R * 0.9, R * 0.12, 8, 28)), matExt); t.rotation.y = Math.PI / 2; t.position.set(x - L / 2, y, z); o.ajouter(t);
  }
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  /** Peinture laquée profonde (noir piano, gris acier…). */
  const laque = (hex, r = 0.16, m = 0.25) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: r, metalness: m, clearcoat: 1, clearcoatRoughness: 0.05, envMap, envMapIntensity: 0.9 }));
  /** Chrome miroir pour toute une caisse (un peu moins brûlant que o.chrome). */
  const chromeCaisse = (hex = '#cfd4dc') => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: 0.12, metalness: 0.95, clearcoat: 1, clearcoatRoughness: 0.05, envMap, envMapIntensity: 1.5 }));
  /** Vitrage teinté. */
  const vitre = (hex, op = 0.85) => garde(new THREE.MeshPhysicalMaterial({ color: lin(hex), roughness: 0.04, metalness: 0.3, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.04, envMap, envMapIntensity: 0.9 }));
  /** Émissif « néon ». */
  const neon = (hex) => garde(new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), toneMapped: false }));
  return { ...o, THREE, declarerRoues, degager, loft, hautAu, flancAu, interp, matDecal, drapeDessus, drapeFlancs, carte, arches, arcGarde, puits, ellipsoide, aileron, turbine, tuyere, laque, chromeCaisse, vitre, neon };
}
