/**
 * Aides du groupe 4 : primitives (quad, dalle polygonale, tige, plaque de surface) et deux constructeurs paramétrés,
 * `monoplace` (F1 à roues découvertes, tout modélisé à la main) et `voiture` (carrosserie de route avec habitacle creux).
 * Repère : avant = +x, sol y = 0, z = largeur. Aucun logo ni nom de marque : motifs génériques seulement.
 */
import { outils } from './outils.js';

export function aides(ctx) {
  const { THREE, garde, chassis } = ctx;
  const o = outils(ctx);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const ajoute = (m) => { chassis.add(m); return m; };
  /** quadrilatère (2 triangles) à 4 points 3D. */
  const quad = (a, b, c, d, m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
    g.computeVertexNormals();
    return ajoute(new THREE.Mesh(garde(g), m));
  };
  /** polygone (x,y) extrudé sur `ep` en z, centré en zc ; sym = recopie en −zc. */
  const dalle = (pts, ep, m, zc = 0, sym = false, bev = 0) => {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    const mk = (z) => {
      const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, z - ep / 2); return ajoute(new THREE.Mesh(garde(g), m));
    };
    const r = mk(zc); if (sym) mk(-zc); return r;
  };
  /** tige cylindrique entre deux points 3D. */
  const tige = (a, b, r, m, seg = 8) => {
    const d = b.clone().sub(a), mesh = new THREE.Mesh(garde(new THREE.CylinderGeometry(r, r, d.length(), seg)), m);
    mesh.position.copy(a).addScaledVector(d, 0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return ajoute(mesh);
  };
  /** tube suivant une courbe de points 3D. */
  const tube = (pts, r, m, seg = 40) => {
    const c = new THREE.CatmullRomCurve3(pts);
    return ajoute(new THREE.Mesh(garde(new THREE.TubeGeometry(c, seg, r, 8, false)), m));
  };
  /** matériau canvas transparent (autocollant) à partir d'une fonction de dessin. */
  const matDecal = (dessin, cw, ch) => {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
    const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false }));
  };
  /** plaque autocollante posée sur une surface inclinée dans le plan xy : de p0 à p1 (x,y), largeur l en z, centre zc, décalée de `dec` selon la normale. */
  const plaque = (dessin, p0, p1, l, zc, dec, cw = 512, ch = 512) => {
    const m = matDecal(dessin, cw, ch);
    const retourne = p1[0] < p0[0];
    if (retourne) { const t = p0; p0 = p1; p1 = t; }
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(len, l)), m);
    p.rotation.set(-Math.PI / 2, 0, retourne ? Math.PI : 0);
    const pivot = new THREE.Group(); pivot.add(p);
    pivot.rotation.z = ang;
    pivot.position.set((p0[0] + p1[0]) / 2 - Math.sin(ang) * dec, (p0[1] + p1[1]) / 2 + Math.cos(ang) * dec, zc);
    ajoute(pivot); return pivot;
  };
  const verreDouble = (hex, op = 0.82) => {
    const m = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: 0.05, metalness: 0.3, transparent: true, opacity: op, side: THREE.DoubleSide, clearcoat: 1, envMap: ctx.envMap, envMapIntensity: 1.3 }));
    return m;
  };
  return { o, V, quad, dalle, tige, tube, matDecal, plaque, verreDouble, ajoute };
}


/** tranche verticale d'un polygone (x,y) : [ymin, ymax] à l'abscisse x (null si hors polygone). */
function tranche(pts, x) {
  const ys = [];
  for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) ys.push(y0 + (y1 - y0) * (x - x0) / (x1 - x0)); }
  return ys.length < 2 ? null : [Math.min(...ys), Math.max(...ys)];
}
/** stations de loft tirées d'un profil latéral : demi-largeur w(u) (u = 0 à l'arrière → 1 à l'avant), exposants nt/nb. */
export function stationsDeProfil(pts, wFn, nt = 2.4, nb = 3.5, n = 18, wtFn = () => 1) {
  const xs = pts.map((p) => p[0]), xa = Math.min(...xs), xb = Math.max(...xs), st = [];
  for (let i = 0; i <= n; i++) { const u = i / n, x = xa + (xb - xa) * (0.004 + 0.992 * u), t = tranche(pts, x); if (!t || t[1] - t[0] < 0.01) continue; st.push({ x, w: wFn(u), y0: t[0], y1: t[1], nt, nb, wt: wtFn(u) }); }
  return st;
}

/* ====================================================================================== monoplace F1 */
/**
 * Monoplace de F1 (roues découvertes) entièrement modélisée : monocoque, plancher, pontons, capot moteur, prise d'air, halo, casque,
 * aileron avant à deux plans + dérives, aileron arrière à DRS, diffuseur, bras de suspension doubles, roues hors carrosserie.
 * S : { caisse, dessous, accent, aile, casque, jante, flanc, num, numCouleur, motifPonton(g,w,h), motifCapot(g,w,h), motifNez(g,w,h) }
 */
export function monoplace(ctx, S) {
  const { THREE, lumRouge } = ctx;
  const A = aides(ctx), { o, V } = A;
  const peint = o.lac(S.caisse, 0.2, 0.35), noir = o.mat(S.dessous || '#15171c', 0.5, 0.4), accent = o.lac(S.accent, 0.25, 0.4);
  const aile = o.lac(S.aile || S.dessous || '#15171c', 0.25, 0.4), carbone = o.mat('#0e0f13', 0.45, 0.6), grisBras = o.mat('#1a1c23', 0.45, 0.8);
  const casque = o.lac(S.casque || S.accent, 0.15, 0.2);
  const verreV = A.verreDouble('#0c1018', 0.9);
  const zRoueAv = S.zAv ?? 1.3, zRoueAr = S.zAr ?? 1.27, RWav = S.RWav ?? 0.68, RWar = S.RWar ?? 0.8, epAv = S.epAv ?? 0.62, epAr = S.epAr ?? 0.8;
  const xAv = 2.75, xAr = -2.35; // essieux
  const F = Object.assign({
    // silhouette par défaut (surchargée par chaque modèle via S.forme)
    pont: [[-2.4, 0.3], [1.4, 0.3], [1.55, 0.62], [1.3, 0.92], [0.3, 0.95], [-0.9, 0.82], [-2.4, 0.5]], pontW: 1.5, pontGalbe: { avant: 0.3, arriere: 0.45, fruit: 0.12, bombe: 0.04, lAv: 0.25, lAr: 0.35 },
    pontBas: null, // profil de la partie basse noire des pontons (deux tons)
    mono: [[4.15, 0.3], [4.2, 0.43], [3.2, 0.62], [1.7, 0.98], [0.8, 1.12], [0.1, 1.12], [-0.2, 0.9], [-1.0, 0.8], [-1.0, 0.3]], monoW: 0.8,
    cap: [[0.1, 0.78], [0.1, 1.18], [-0.6, 1.3], [-1.8, 1.28], [-3.05, 0.7], [-3.05, 0.5], [-2.0, 0.5], [-1.0, 0.5]], capW: 0.82,
    plancherW: 1.56, plancherX: [-3.1, 3.3],
    requin: [[-0.4, 1.28], [-2.2, 1.24], [-2.9, 0.78]], requinEp: 0.05,
    airbox: { r: 0.2, h: 0.34, x: -0.35, y: 1.5, sx: 1.3 },
    aileAv: { x0: 3.55, x1: 4.45, span: 2.7, plans: 2, epH: 0.4, epX0: 3.5, epX1: 4.7, epEp: 0.07, ep2: false, haut: 0.17 },
    aileAr: { span: 1.6, x0: -3.55, x1: -2.7, y: 1.25, y2: 1.55, hEp: 0.9, epX0: -3.62, epX1: -2.55, epY0: 0.95, epY1: 1.85, epEp: 0.06, pylone: 0.1 },
    halo: 0.045, entree: { h: 0.48, y: 0.78, x: 1.56, z: 0.52 },
    cockpitX: 0.62, casqueY: 1.36,
    brasHaut: 0.42,
  }, S.forme || {});
  const noeud = { x0: -3.55, x1: 4.6 };

  /* plancher + fond plat noir (visible sous les pontons) */
  { const [px0, px1] = F.plancherX; o.profil([[px0, 0.06], [px1, 0.06], [px1 + 0.2, 0.2], [px1, 0.3], [px0, 0.34]], F.plancherW, noir, { galbe: { avant: 0.5, arriere: 0.35, fruit: 0.0, bombe: 0, lAv: 0.2, lAr: 0.15 }, biseau: 0.04 }); }
  /* diffuseur arrière : ailettes verticales */
  for (const z of [-0.5, -0.25, 0, 0.25, 0.5]) A.dalle([[-3.45, 0.08], [-2.5, 0.08], [-2.5, 0.42], [-3.35, 0.62]], 0.035, carbone, z);
  /* pontons (flancs) : loft de sections arrondies — épaule bombée, rentrée vers le bas (undercut), resserrés en bouteille de Coca vers l'arrière */
  const K = carrosserie(ctx), pg = F.pontGalbe;
  const wPont = (u) => { const W2 = F.pontW / 2 + 0.05, av = u > 1 - pg.lAv ? 1 - pg.avant * Math.pow((u - (1 - pg.lAv)) / pg.lAv, 1.6) : 1, ar = u < pg.lAr ? 1 - pg.arriere * Math.pow((pg.lAr - u) / pg.lAr, 1.4) : 1; return W2 * av * ar; };
  K.loft(stationsDeProfil(F.pont, wPont, 2.3, 4.5, 22, () => 1 - (pg.fruit || 0.1) * 1.6), peint, { nx: 70, ns: 40, cap: 0.05 });
  if (F.pontBas) K.loft(stationsDeProfil(F.pontBas, (u) => wPont(u) + 0.015, 3, 3, 16), noir, { nx: 50, ns: 32, cap: 0.03 });
  /* entrées d'air des pontons (sombres, à l'avant du flanc) */
  for (const s of [-1, 1]) o.boite(0.1, F.entree.h, F.entree.z, carbone, F.entree.x, F.entree.y, s * (F.pontW * 0.35));
  /* monocoque + nez : profil latéral, étroit */
  K.loft(stationsDeProfil(F.mono, (u) => (F.monoW / 2 + 0.05) * (u > 0.6 ? 1 - 0.62 * Math.pow((u - 0.6) / 0.4, 1.3) : 1), 2.2, 2.6, 26, () => 0.8), peint, { nx: 80, ns: 36, cap: 0.04 });
  /* capot moteur (arrière), effilé en bouteille de Coca vers le bas de l'aileron */
  K.loft(stationsDeProfil(F.cap, (u) => (F.capW / 2 + 0.05) * (u < 0.55 ? 1 - 0.6 * Math.pow((0.55 - u) / 0.55, 1.2) : 1), 2.0, 3, 22, () => 0.7), peint, { nx: 70, ns: 36, cap: 0.04 });
  /* aileron dorsal (requin) */
  A.dalle([...F.requin, F.requin[0]], F.requinEp, peint, 0);
  /* cockpit : trou sombre, volant, casque, appuie-tête */
  o.boite(0.72, 0.1, 0.5, verreV, 0.62, 1.15, 0);
  o.boite(0.5, 0.06, 0.4, carbone, 0.5, 1.17, 0);
  const sph = (r, sx, sy, sz, m, x, y, z) => { const s = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(r, 24, 16)), m); s.scale.set(sx, sy, sz); s.position.set(x, y, z); return o.ajouter(s); };
  sph(0.23, 1.15, 1.0, 1.0, casque, 0.28, 1.36, 0);
  sph(0.15, 0.55, 0.5, 1.15, verreV, 0.42, 1.38, 0);
  o.boite(0.2, 0.25, 0.1, carbone, 0.0, 1.3, 0.28); o.boite(0.2, 0.25, 0.1, carbone, 0.0, 1.3, -0.28);
  /* volant */
  { const v = new THREE.Mesh(ctx.garde(new THREE.BoxGeometry(0.05, 0.12, 0.26)), carbone); v.position.set(0.68, 1.27, 0); v.rotation.z = -0.5; o.ajouter(v); }
  /* halo : arceau + montant central, ancrés sur la monocoque */
  const hx = (a, b, c) => V(a, b, c);
  A.tube([hx(1.15, 1.1, 0.3), hx(0.95, 1.45, 0.3), hx(0.55, 1.62, 0.2), hx(0.05, 1.6, 0.34), hx(-0.05, 1.3, 0.38)], F.halo, carbone);
  A.tube([hx(1.15, 1.1, -0.3), hx(0.95, 1.45, -0.3), hx(0.55, 1.62, -0.2), hx(0.05, 1.6, -0.34), hx(-0.05, 1.3, -0.38)], F.halo, carbone);
  A.tube([hx(0.55, 1.62, 0.2), hx(0.55, 1.63, 0), hx(0.55, 1.62, -0.2)], F.halo, carbone, 8);
  A.tige(V(1.15, 1.1, 0), V(0.62, 1.62, 0), 0.05, carbone);
  /* prise d'air (airbox) au-dessus du casque */
  o.cyl(F.airbox.r, F.airbox.r * 1.25, F.airbox.h, noir, F.airbox.x, F.airbox.y, 0, 0, 0, 24);
  o.cyl(0.0, 0.2, 0.0001, carbone, -0.35, 1.68, 0, 0, 0, 4);
  { const ab = F.airbox, t = new THREE.Mesh(ctx.garde(new THREE.CylinderGeometry(ab.r * 0.95, ab.r * 1.2, ab.h * 0.9, 24)), peint); t.position.set(ab.x, ab.y - 0.05, 0); t.scale.set(ab.sx, 1, 1); o.ajouter(t); }
  { const t = new THREE.Mesh(ctx.garde(new THREE.CircleGeometry(F.airbox.r * 0.8, 20)), carbone); t.rotation.x = -Math.PI / 2; t.position.set(F.airbox.x, F.airbox.y + F.airbox.h * 0.5 - 0.02, 0); t.scale.set(F.airbox.sx, 1, 1); o.ajouter(t); }
  /* feu de pluie arrière */
  o.boite(0.06, 0.1, 0.16, lumRouge, -3.1, 0.62, 0);

  /* aileron avant : 2 ou 3 plans + dérives (pleines ou en cascade courbe) + pylônes depuis le nez */
  { const f = F.aileAv, sp = f.span, hy = f.haut;
    A.dalle([[f.x0, hy], [f.x1, hy + 0.03], [f.x1 + 0.1, hy + 0.09], [f.x0, hy + 0.13]], sp, aile, 0);
    A.dalle([[f.x0 - 0.05, hy + 0.13], [f.x1 - 0.2, hy + 0.17], [f.x1 - 0.07, hy + 0.25], [f.x0 - 0.05, hy + 0.27]], sp - 0.1, accent, 0);
    if (f.plans > 2) A.dalle([[f.x0 - 0.1, hy + 0.27], [f.x1 - 0.45, hy + 0.3], [f.x1 - 0.3, hy + 0.4], [f.x0 - 0.1, hy + 0.42]], sp - 0.25, aile, 0);
    if (f.plans > 3) A.dalle([[f.x0 - 0.15, hy + 0.42], [f.x1 - 0.7, hy + 0.45], [f.x1 - 0.55, hy + 0.53], [f.x0 - 0.15, hy + 0.55]], sp - 0.4, accent, 0);
    for (const sg of [-1, 1]) {
      const zE = sg * (sp / 2 - 0.03);
      if (f.ep2) { // dérive courbe : lame basse qui s'incurve vers l'extérieur + cascade intérieure
        A.dalle([[f.epX0, 0.1], [f.epX1, 0.1], [f.epX1, f.epH * 0.9], [f.epX0 + 0.5, f.epH]], f.epEp, aile, zE);
        A.dalle([[f.epX0 + 0.3, 0.2], [f.epX1 - 0.3, 0.2], [f.epX1 - 0.4, f.epH * 0.7], [f.epX0 + 0.5, f.epH * 0.75]], 0.03, accent, zE - sg * 0.2);
      } else {
        A.dalle([[f.epX0, 0.1], [f.epX1, 0.1], [f.epX1, 0.5 * f.epH / 0.4], [f.epX0 + 0.2, 0.5 * f.epH / 0.4]], f.epEp, aile, zE);
        A.dalle([[4.1, hy + 0.1], [4.3, hy + 0.1], [4.2, hy + 0.19]], 0.02, accent, zE - sg * 0.09);
      }
      A.tige(V(f.x0 + 0.3, hy + 0.13, sg * 0.2), V(f.x0 + 0.3, hy + 0.38, sg * 0.08), 0.035, grisBras);
    }
  }
  /* aileron arrière : deux plans, dérives, jambe centrale ; fente DRS en couleur d'accent */
  { const r = F.aileAr;
    A.dalle([[r.x0, r.y], [r.x1, r.y], [r.x1, r.y + 0.13], [r.x0 + 0.05, r.y + 0.25]], r.span, aile, 0);
    A.dalle([[r.x0 + 0.1, r.y2], [r.x1 - 0.2, r.y2], [r.x1 - 0.25, r.y2 + 0.11], [r.x0 + 0.05, r.y2 + 0.15]], r.span, accent, 0);
    for (const sg of [-1, 1]) A.dalle([[r.epX0, r.epY0], [r.epX1, r.epY0], [r.epX1, r.epY1], [r.epX0, r.epY1]], r.epEp, aile, sg * (r.span / 2));
  }
  A.dalle([[-3.2, 0.7], [-2.9, 0.7], [-2.9, 1.3], [-3.2, 1.3]], F.aileAr.pylone, carbone, 0);
  A.dalle([[-3.7, 0.5], [-3.0, 0.5], [-3.0, 0.6], [-3.7, 0.6]], 1.0, aile, 0); // beam wing
  /* bras de suspension doubles (triangles haut et bas) vers le moyeu de chaque roue, sur 2 essieux */
  for (const [x, R, zr, ep] of [[xAv, RWav, zRoueAv, epAv], [xAr, RWar, zRoueAr, epAr]]) {
    for (const s of [-1, 1]) {
      const hub = V(x, R, s * (zr - ep / 2 + 0.03));
      for (const [dy, dx] of [[F.brasHaut * R, 0.42], [-0.05 * R, 0.45]]) for (const k of [-1, 1]) A.tige(V(x + k * dx, R + dy, s * 0.4), hub, 0.03, grisBras);
    }
  }

  /* livrée : autocollant sur le flanc des pontons + capot + nez + numéro */
  const zP = 0.75 + 0.05 + 0.012;
  if (S.motifPonton) {
    // livrée drapée sur le ponton galbé (et non plus un plan plat qui flotte)
    const stP = stationsDeProfil(F.pont, wPont, 2.3, 4.5, 22, () => 1 - (pg.fruit || 0.1) * 1.6);
    const xs = stP.map((q) => q.x), xa = Math.max(-2.2, Math.min(...xs) + 0.1), xb = Math.min(1.4, Math.max(...xs) - 0.1);
    K.drapeFlancs(stP, xa, xb, 0.42, 0.98, (g, X, Y) => { g.save(); g.translate(X(-2.2), Y(1.09)); g.scale((X(1.4) - X(-2.2)) / 1536, (Y(0.39) - Y(1.09)) / 300); S.motifPonton(g, 1536, 300); g.restore(); }, [], 260, 0.01);
  }
  if (S.motifCapot) A.plaque(S.motifCapot, [-2.9, 0.72], [-0.1, 1.2], 0.6, 0, 0.075, 768, 256);
  if (S.motifNez) A.plaque(S.motifNez, [3.1, 0.65], [1.7, 1.0], 0.7, 0, 0.1, 512, 256);
  A.plaque((g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = S.numCouleur || '#fff'; g.font = 'bold 220px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.fillText(S.num, 0, 0); g.restore();
  }, [-1.05, 0.82], [0.0, 1.14], 0.55, 0, 0.0, 256, 256);
  return {
    L: 9.2, largeur: 1.6, hauteur: 1.75, xAvant: 4.7, xArriere: -3.7,
    roues: [
      { x: xAv, RW: RWav, ep: epAv, z: zRoueAv, avant: true, jante: S.jante, rayons: 'plein', flanc: S.flanc, sansFrein: true },
      { x: xAr, RW: RWar, ep: epAr, z: zRoueAr, avant: false, jante: S.jante, rayons: 'plein', flanc: S.flanc, sansFrein: true },
    ],
    jante: S.jante, flanc: S.flanc,
  };
}

/* ====================================================================================== voiture de route */
/**
 * Voiture de route à habitacle creux (montants, toit, vitres, sièges visibles), caisse avec passages de roues évidés.
 * S : {
 *  W (largeur caisse), xAv, xAr, yS (bas de caisse), haut[[x,y]…] contour supérieur de l'avant vers l'arrière (hors habitacle),
 *  roues[{x,RW,ep}], cab:{xA0,yA0,xA1,yA1,xC1,yC1,xC0,yC0,xB,wc,tp,tpc} (pare-brise → toit → lunette),
 *  caisse, vitre, interieur, toitCouleur, galbe, extra(ctx, aides, géom) }
 */
export function voiture(ctx, S) {
  const { THREE, lumBlanche, lumRouge, garde } = ctx;
  const A = aides(ctx), { o, V } = A;
  const peint = o.lac(S.caisse, 0.22, 0.45), toitMat = S.toitCouleur ? o.lac(S.toitCouleur, 0.22, 0.45) : peint;
  const noir = o.mat('#14161b', 0.55, 0.3), interieur = o.mat(S.interieur || '#2b2d33', 0.7, 0.1), sombre = o.mat('#0c0d11', 0.8, 0.2);
  const vitre = A.verreDouble(S.vitre || '#10151f', S.opVitre ?? 0.78);
  const W = S.W, yS = S.yS ?? 0.32, bev = S.biseau ?? 0.06;
  const R2 = S.roues;
  const zr = (r) => r.z ?? (W / 2 + bev + 0.03 - r.ep / 2);

  /* contour de la caisse : haut (avant → arrière), puis bas arrière → avant avec arcs de passages de roues */
  const pts = [[S.xAv, S.yBas ?? yS], ...S.haut, [S.xAr, S.yBasAr ?? yS]];
  const arches = [...R2].sort((a, b) => a.x - b.x);
  for (const r of arches) {
    const yc = r.y ?? r.RW, Ra = r.RW + (r.jeu ?? 0.1), a1 = Math.asin(Math.max(-0.99, Math.min(0.99, (yS - yc) / Ra)));
    const n = 14;
    for (let i = 0; i <= n; i++) { const t = Math.PI - a1 - (Math.PI - 2 * a1) * i / n; pts.push([r.x + Ra * Math.cos(t), yc + Ra * Math.sin(t)]); }
  }
  const galbe = Object.assign({ avant: 0.3, arriere: 0.22, fruit: 0.05, bombe: 0.03, lAv: 0.15, lAr: 0.12 }, S.galbe || {});
  o.profil(pts, W, peint, { galbe, biseau: bev });

  /* garnissage des passages : bloc sombre vu à travers l'arche, plus étroit que la face interne du pneu */
  for (const r of R2) {
    const yc = r.y ?? r.RW, Ra = r.RW + (r.jeu ?? 0.1), zi = zr(r) - r.ep / 2 - 0.03;
    o.boite(Ra * 2 - 0.04, yc + Ra * 0.8 - yS + 0.1, zi * 2, sombre, r.x, (yS - 0.1 + yc + Ra * 0.8) / 2, 0);
  }
  /* soubassement noir étroit entre les roues */
  { const zi = Math.min(...R2.map((r) => zr(r) - r.ep / 2)) - 0.04;
    o.boite(S.xAv - S.xAr - 1.0, 0.2, zi * 2, noir, (S.xAv + S.xAr) / 2, yS - 0.04, 0); }

  /* habitacle */
  const c = S.cab, wc = c.wc, tp = c.tp ?? 0.16, tpc = c.tpc ?? 0.3, tR = c.tR ?? 0.1, xB = c.xB, tB = c.tB ?? 0.14;
  const belt = (x) => c.yA0 + (c.yC0 - c.yA0) * (x - c.xA0) / (c.xC0 - c.xA0);
  const roof = (x) => c.yA1 + (c.yC1 - c.yA1) * (x - c.xA1) / (c.xC1 - c.xA1);
  const zp = wc / 2 - 0.06;
  // toit (dalle) : plaque mince sur toute la largeur
  A.dalle([[c.xA1 - 0.02, c.yA1], [c.xC1 + 0.02, c.yC1], [c.xC1 + 0.02, c.yC1 - tR], [c.xA1 - 0.02, c.yA1 - tR]], wc, toitMat, 0, false, 0.04);
  for (const s of [-1, 1]) {
    // montant A
    A.dalle([[c.xA0, c.yA0], [c.xA1, c.yA1], [c.xA1 + tp, c.yA1], [c.xA0 + tp * 1.3, c.yA0]], 0.12, peint, s * zp);
    // montant B
    A.dalle([[xB, belt(xB)], [xB + tB, belt(xB)], [xB + tB, roof(xB + tB) - tR], [xB, roof(xB) - tR]], 0.12, peint, s * zp);
    // montant C
    A.dalle([[c.xC0, c.yC0], [c.xC1, c.yC1], [c.xC1 - tpc, c.yC1], [c.xC0 - tpc * 1.1, c.yC0]], 0.12, peint, s * zp);
    // vitres latérales : avant (A→B) et arrière (B→C)
    const zg = s * (wc / 2 - 0.1);
    const xa = c.xA0 + tp * 1.3, xa1 = c.xA1 + tp, xc = c.xC0 - tpc * 1.1, xc1 = c.xC1 - tpc;
    A.dalle([[xa, belt(xa)], [xa1, roof(xa1) - tR], [xB, roof(xB) - tR], [xB, belt(xB)]], 0.03, vitre, zg);
    A.dalle([[xB + tB, belt(xB + tB)], [xB + tB, roof(xB + tB) - tR], [xc1, roof(xc1) - tR], [xc, belt(xc)]], 0.03, vitre, zg);
  }
  // pare-brise et lunette arrière (quads inclinés)
  const zw0 = wc / 2 - 0.1, zw1 = wc / 2 - 0.16;
  A.quad(V(c.xA0 + tp * 1.3, c.yA0, -zw0), V(c.xA0 + tp * 1.3, c.yA0, zw0), V(c.xA1 + tp, c.yA1 - tR, zw1), V(c.xA1 + tp, c.yA1 - tR, -zw1), vitre);
  A.quad(V(c.xC0 - tpc * 1.1, c.yC0, zw0), V(c.xC0 - tpc * 1.1, c.yC0, -zw0), V(c.xC1 - tpc, c.yC1 - tR, -zw1), V(c.xC1 - tpc, c.yC1 - tR, zw1), vitre);
  // plancher intérieur + tableau de bord + sièges + volant
  const yb = Math.max(c.yA0, c.yC0) + 0.0;
  A.dalle([[c.xA0, c.yA0 - 0.04], [c.xC0, c.yC0 - 0.04], [c.xC0, c.yC0 - 0.12], [c.xA0, c.yA0 - 0.12]], wc - 0.1, interieur, 0);
  const iy = (x) => belt(x);
  o.boite(0.4, 0.22, wc - 0.2, interieur, c.xA0 - 0.12, c.yA0 + 0.1, 0);                         // tableau de bord
  for (const s of [-1, 1]) {
    const sx = (c.xA0 + xB) / 2 - 0.1;
    o.boite(0.5, 0.2, 0.46, interieur, sx, iy(sx) + 0.08, s * (wc / 4));                          // assise
    o.boite(0.12, 0.62, 0.46, interieur, sx - 0.3, iy(sx) + 0.36, s * (wc / 4));                  // dossier
    const rx = (xB + c.xC0) / 2 - 0.15;
    if (S.sieges2 !== false) { o.boite(0.5, 0.2, 0.46, interieur, rx, iy(rx) + 0.08, s * (wc / 4)); o.boite(0.12, 0.55, 0.46, interieur, rx - 0.3, iy(rx) + 0.32, s * (wc / 4)); }
  }
  // rétroviseurs
  for (const s of [-1, 1]) o.boite(0.2, 0.16, 0.22, S.retro === 'noir' ? noir : peint, c.xA0 + 0.2, c.yA0 + 0.2, s * (W / 2 + 0.12));

  /* feux, calandre : fournis par le modèle via extra */
  const geom = { zr, W, yS, belt, roof, bev, arches, noir, peint, interieur, sombre, vitre, zCorps: W / 2 + bev + 0.012 };
  if (S.extra) S.extra(ctx, A, geom);

  return {
    L: S.xAv - S.xAr, largeur: W, hauteur: S.H ?? c.yA1 + 0.05, xAvant: S.xAv, xArriere: S.xAr,
    roues: R2.map((r) => ({ x: r.x, RW: r.RW, ep: r.ep, z: zr(r), avant: !!r.avant, jante: r.jante, rayons: r.rayons, flanc: r.flanc, etrier: r.etrier, lenticulaire: r.lenticulaire })),
    jante: S.jante, flanc: S.flanc,
  };
}

/** efface les passages de roues d'un canvas d'autocollant de flanc (coordonnées monde → pixels). */
export function effacerArches(g, arches, X, Y, k) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (const r of arches) { g.beginPath(); g.arc(X(r.x), Y(r.y ?? r.RW), (r.RW + (r.jeu ?? 0.1) + 0.03) * k, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/* ====================================================================================== carrosserie loftée (3e vague) */
/*
 * Moteur de carrosserie « sculptée » : la caisse n'est plus un profil extrudé mais un LOFT de sections superellipses
 * interpolées le long de x (Hermite / Catmull-Rom). Chaque station {x, w (demi-largeur), y0, y1, nt, nb, wt} :
 *  - w plus grand au droit des essieux → ailes galbées (flares) qui coiffent le haut des pneus ;
 *  - w plus petit entre les essieux → taille resserrée au niveau des portières ;
 *  - stations extrêmes basses et étroites → museau et poupe arrondis / biseautés ;
 *  - wt < 1 (haut de section plus étroit) → tumblehome : le pavillon rentre vers l'intérieur.
 * Le pavillon (« serre ») est un second loft en verre fumé ; toit et montants A/B/C sont des coques peintes posées
 * PAR-DESSUS le verre (décalage radial) : la vitre apparaît ainsi en léger retrait dans ses montants.
 */
const CHAMPS = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
const DEF_ST = { nt: 2.6, nb: 3.2, wt: 1 };
function normSt(st) { return [...st].map((s) => ({ ...DEF_ST, ...s })).sort((a, b) => a.x - b.x); }
/** interpolation de Hermite de tous les champs d'une station au point x (tangentes bornées : pas de dépassement). */
export function interpSt(st, x) {
  const n = st.length; let i = 0;
  while (i < n - 2 && x > st[i + 1].x) i++;
  const a = st[i], b = st[i + 1], h = Math.max(1e-6, b.x - a.x), t = Math.min(1, Math.max(0, (x - a.x) / h));
  const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
  const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const r = { x };
  for (const k of CHAMPS) {
    const ma = (b[k] - p0[k]) / Math.max(1e-6, b.x - p0.x), mb = (p3[k] - a[k]) / Math.max(1e-6, p3.x - a.x);
    const v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb;
    const lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.2;
    r[k] = Math.min(hi + m, Math.max(lo - m, v));
  }
  return r;
}
/** point de la section s à l'angle t (0 = flanc +z, π/2 = dessus, π = flanc −z) : [z, y]. */
function pointSec(s, t) {
  const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb;
  const yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
  const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
  return [s.w * zz * k, yc + hh * yy];
}

export function carrosserie(ctx) {
  const { THREE, garde } = ctx;
  const A = aides(ctx), { o } = A;

  /** maillage indexé à partir d'une grille de points (nu+1)×(nv+1) ; orienté automatiquement vers l'extérieur (référence : centre). */
  function grilleMesh(P, nu, nv, mat, centre, uvs = null, ferme = false) {
    const pos = [], idx = [], uv = [];
    const nvv = ferme ? nv : nv + 1;
    for (let i = 0; i <= nu; i++) for (let k = 0; k < nvv; k++) { const p = P[i][k]; pos.push(p[0], p[1], p[2]); if (uvs) uv.push(...uvs[i][k]); }
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
      const a = i * nvv + k, b = i * nvv + (k + 1) % nvv, c = (i + 1) * nvv + k, d = (i + 1) * nvv + (k + 1) % nvv;
      idx.push(a, c, b, b, c, d);
    }
    // orientation : la normale du 1er quad intérieur doit s'éloigner du centre
    const ii = Math.floor(nu / 2), kk = Math.floor(nv / 2);
    const p0 = P[ii][kk], p1 = P[ii + 1][kk], p2 = P[ii][(kk + 1) % (ferme ? nv : nv + 1)];
    const ux = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], vx = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const nx = [ux[1] * vx[2] - ux[2] * vx[1], ux[2] * vx[0] - ux[0] * vx[2], ux[0] * vx[1] - ux[1] * vx[0]];
    const cc = centre(p0), out = [p0[0] - cc[0], p0[1] - cc[1], p0[2] - cc[2]];
    // triangles (a,c,b) : normale = (c−a)×(b−a) = u × v
    if (nx[0] * out[0] + nx[1] * out[1] + nx[2] * out[2] < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return o.ajouter(new THREE.Mesh(garde(g), mat));
  }

  /**
   * loft fermé : stations, matériau ; opt.arches = [{x, R, y, zin}] creuse les passages de roues ; opt.nx, opt.ns : finesse.
   */
  function loft(stIn, mat, opt = {}) {
    const st = normSt(stIn), NX = opt.nx || 120, NS = opt.ns || 64, ar = opt.arches || [];
    const x0 = st[0].x, x1 = st[st.length - 1].x, P = [];
    // bouchons : on resserre les deux sections extrêmes vers leur centre (nez et poupe fermés et arrondis)
    const ecr = (s, f) => ({ ...s, w: s.w * f, y0: (s.y0 + s.y1) / 2 - (s.y1 - s.y0) / 2 * f, y1: (s.y0 + s.y1) / 2 + (s.y1 - s.y0) / 2 * f });
    // hauteur du dessus de la section à la cote |z| (pour ne jamais soulever le dessus de l'aile en creusant le passage de roue)
    const dessus = (s, z) => { let lo = 0, hi = Math.PI / 2; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (pointSec(s, m)[0] > Math.abs(z)) lo = m; else hi = m; } return pointSec(s, (lo + hi) / 2)[1]; };
    /* Brief 10 — aile qui COIFFE le pneu : au droit d'un passage de roue, la section est rendue plus « carrée » (nt → 12, épaule nette) et
       rehaussée juste assez pour que sa surface supérieure reste ≥ 0,06 au-dessus de l'arche recoupée, jusqu'à l'aplomb de la
       face extérieure du pneu (a.zt) : plus aucun sommet de pneu ne dépasse de la tôle, plus aucune tôle ne traverse le pneu. */
    const renforce = (s, x) => {
      if (!opt.ailes) return s;
      let q = s;
      for (const a of ar) {
        const dx = Math.abs(x - a.x); if (dx >= a.R || !a.zt) continue;
        const besoin = a.y + Math.sqrt(a.R * a.R - dx * dx) + (a.garde ?? 0.06) + 0.035, zt = Math.min(a.zt, q.w * 0.985);
        const wgt = Math.cos(Math.min(1, dx / a.R) * Math.PI / 2);
        q = { ...q, nt: Math.max(q.nt, q.nt + (12 - q.nt) * Math.min(1, wgt * 1.6)) };
        for (let it = 0; it < 30 && dessus(q, zt) < besoin; it++) q = { ...q, y1: q.y1 + 0.01 };
      }
      return q;
    };
    const ligne = (s0, x) => { const s = renforce(s0, x), r = []; for (let k = 0; k < NS; k++) { const t = k / NS * 2 * Math.PI; let [z, y] = pointSec(s, t);
      for (const a of ar) { const dx = Math.abs(x - a.x); if (dx < a.R && Math.abs(z) > a.zin) {
        const yArc = a.y + Math.sqrt(a.R * a.R - dx * dx);
        if (opt.libre) { if (y < yArc) y = yArc; continue; }                               // pièce cachée (vitrage sous la ceinture) : simple relevage
        let ya = Math.min(yArc, dessus(s, z) - 0.035);
        if (opt.ailes && a.zt && y < yArc && ya < yArc) {                                   // bord extrême du flanc trop bas pour coiffer l'arche :
          const zt = Math.min(a.zt, s.w * 0.985); z = Math.sign(z) * Math.min(Math.abs(z), zt); ya = Math.min(yArc, dessus(s, z) - 0.035);   // rentré à l'aplomb du pneu
        }
        if (y < ya) y = ya; } }
      r.push([x, y, z]); } return r; };
    const cap = opt.cap ?? 0.06;
    P.push(ligne(ecr(st[0], 0.001), x0 - 0.0));
    P.push(ligne(ecr(st[0], 0.55), x0 + cap * 0.15));
    P.push(ligne(ecr(st[0], 0.85), x0 + cap * 0.5));
    for (let j = 0; j < NX; j++) {
      const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + cap + (x1 - x0 - 2 * cap) * u;
      P.push(ligne(interpSt(st, x), x));
    }
    P.push(ligne(ecr(st[st.length - 1], 0.85), x1 - cap * 0.5));
    P.push(ligne(ecr(st[st.length - 1], 0.55), x1 - cap * 0.15));
    P.push(ligne(ecr(st[st.length - 1], 0.001), x1));
    const m = grilleMesh(P, P.length - 1, NS, mat, (p) => { const s = interpSt(st, Math.min(x1, Math.max(x0, p[0]))); return [p[0], (s.y0 + s.y1) / 2, 0]; }, null, true);
    return m;
  }
  /** passages de roues du véhicule (posés par routiere) : les pièces de pavillon et autocollants qui descendraient dans le volume
      d'un pneu (parties cachées dans la caisse) sont relevées au-dessus de l'arche — aucun sommet dans le pneu. */
  let archesV = [];
  const souleve = (x, y) => { for (const a of archesV) { const dx = Math.abs(x - a.x); if (dx < a.R) { const ya = a.y + Math.sqrt(a.R * a.R - dx * dx); if (y < ya) y = ya; } } return y; };
  /** coque partielle posée sur un loft : x ∈ [xa, xb], angle ∈ [ta, tb], décalée de `eps` vers l'extérieur ; épaisseur visible par un rebord. */
  function coque(stIn, xa, xb, ta, tb, mat, eps = 0.03, nu = 24, nv = 14, uvOn = false) {
    const st = normSt(stIn), P = [], U = [];
    const pt = (x, t, e) => { const s = interpSt(st, x), [z, y] = pointSec(s, t), yc = (s.y0 + s.y1) / 2, d = Math.hypot(z, y - yc) || 1; return [x, souleve(x, y + (y - yc) / d * e), z + z / d * e]; };
    for (let i = 0; i <= nu; i++) { const x = xa + (xb - xa) * i / nu, r = [], ru = []; for (let k = 0; k <= nv; k++) { const t = ta + (tb - ta) * k / nv; r.push(pt(x, t, eps)); ru.push([i / nu, k / nv]); } P.push(r); U.push(ru); }
    const centre = (p) => { const s = interpSt(st, p[0]); return [p[0], (s.y0 + s.y1) / 2, 0]; };
    const m = grilleMesh(P, nu, nv, mat, centre, uvOn ? U : null);
    // rebords (épaisseur) sur les 4 côtés : petits rubans entre la coque et la surface
    const bord = (pts) => { const Q = [pts.map((p) => p[0]), pts.map((p) => p[1])]; return grilleMesh(Q, 1, pts.length - 1, mat, (p) => [p[0], p[1], 0]); };
    const ruban = (f) => { const a = [], b = []; for (let k = 0; k <= 16; k++) { const [x, t] = f(k / 16); a.push(pt(x, t, eps)); b.push(pt(x, t, 0.002)); } const pts = a.map((p, i) => [p, b[i]]); return bord(pts); };
    if (eps > 0.008) { ruban((v) => [xa, ta + (tb - ta) * v]); ruban((v) => [xb, ta + (tb - ta) * v]); ruban((v) => [xa + (xb - xa) * v, ta]); ruban((v) => [xa + (xb - xa) * v, tb]); }
    return m;
  }
  /** mêmes coques des deux côtés (symétrie z) : angles donnés pour le côté +z. */
  const coque2 = (st, xa, xb, ta, tb, mat, eps, nu, nv) => [coque(st, xa, xb, ta, tb, mat, eps, nu, nv), coque(st, xa, xb, Math.PI - tb, Math.PI - ta, mat, eps, nu, nv)];

  /* requêtes géométriques */
  const hautAu = (stIn, x, z) => { const s = interpSt(normSt(stIn), x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2; let lo = 0, hi = Math.PI / 2;
    // recherche de l'angle dont le z vaut |z| (sur le dessus, la largeur dépend de wt)
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, [zz] = pointSec(s, m); if (zz > Math.abs(z)) lo = m; else hi = m; }
    return pointSec(s, (lo + hi) / 2)[1]; };
  const flancAu = (stIn, x, y) => { const s = interpSt(normSt(stIn), x), yc = (s.y0 + s.y1) / 2; let lo = y >= yc ? 0 : -Math.PI / 2, hi = y >= yc ? Math.PI / 2 : 0;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, [, yy] = pointSec(s, m); if (yy < y) lo = m; else hi = m; }
    return pointSec(s, (lo + hi) / 2)[0]; };
  /** dedans : le point (y, z) est-il dans la section du loft en x ? */
  const dedans = (st, x, y, z) => { const s = interpSt(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2; if (y < s.y0 || y > s.y1) return false; return Math.abs(z) <= flancAu(st, x, y) + 1e-4; };
  /** x de la surface (nez si sens = +1, poupe si −1) à la hauteur y et au décalage z. */
  const bordX = (stIn, sens, y, z) => { const st = normSt(stIn), xe = sens > 0 ? st[st.length - 1].x : st[0].x; for (let d = 0; d < 3; d += 0.01) { const x = xe - sens * d; if (dedans(st, x, y, z)) return x; } return xe; };

  /** autocollant drapé sur les deux flancs : dessin(g, X, Y, k) en coordonnées monde (vu du côté +z, nez à droite) ; roues = passages à effacer. */
  function drapeFlancs(stIn, x0, x1, yb, yt, dessin, roues = [], k = 180, eps = 0.012) {
    const st = normSt(stIn), cw = Math.min(2048, Math.round((x1 - x0) * k)), ch = Math.min(1024, Math.round((yt - yb) * k));
    const kx = cw / (x1 - x0), ky = ch / (yt - yb);
    const X = (x) => (x - x0) * kx, Y = (y) => (yt - y) * ky;
    for (const sg of [1, -1]) {
      // un canvas par côté : au flanc −z la mise en page est symétrisée (même abscisse véhicule), textes redressés
      const mat = A.matDecal((g, w, h) => o.dessinerCote((gg) => { gg.clearRect(0, 0, cw, ch); dessin(gg, X, Y, kx); effacerArches(gg, roues, X, Y, kx); }, g, w, h, sg), cw, ch);
      mat.side = THREE.DoubleSide;
      const P = [], U = [], nu = 90, nv = 20;
      for (let i = 0; i <= nu; i++) { const x = x0 + (x1 - x0) * i / nu, r = [], ru = []; for (let j = 0; j <= nv; j++) { const y0 = yb + (yt - yb) * j / nv, y = souleve(x, y0); r.push([x, y, sg * (flancAu(st, x, y) + eps)]); ru.push([sg > 0 ? i / nu : 1 - i / nu, j / nv]); } P.push(r); U.push(ru); }
      const m = grilleMesh(P, nu, nv, mat, (p) => [p[0], p[1], 0], U); m.renderOrder = 2;
    }
  }
  /** autocollant drapé sur le dessus : canvas vu de dessus (nez à droite, +z en bas). */
  function drapeDessus(stIn, x0, x1, z0, z1, dessin, cw = 1024, ch = 256, eps = 0.012) {
    const st = normSt(stIn), mat = A.matDecal((g, w, h) => { g.clearRect(0, 0, w, h); dessin(g, w, h); }, cw, ch); mat.side = THREE.DoubleSide;
    const P = [], U = [], nu = 60, nv = 16;
    for (let i = 0; i <= nu; i++) { const x = x0 + (x1 - x0) * i / nu, r = [], ru = []; for (let j = 0; j <= nv; j++) { const z = z0 + (z1 - z0) * j / nv; r.push([x, hautAu(st, x, z) + eps, z]); ru.push([i / nu, 1 - j / nv]); } P.push(r); U.push(ru); }
    const m = grilleMesh(P, nu, nv, mat, (p) => [p[0], p[1] - 1, p[2]], U); m.renderOrder = 2; return m;
  }
  /** gaine sombre d'un passage de roue (demi-cylindre ouvert, intérieur visible). */
  function gaine(x, yc, R, zin, zout, mat) {
    const g = new THREE.CylinderGeometry(R, R, zout - zin, 24, 1, true, Math.PI / 2 - 0.12, Math.PI + 0.24);
    for (const sg of [-1, 1]) { const m = new THREE.Mesh(garde(g.clone()), mat); m.rotation.x = Math.PI / 2; m.rotation.y = 0; m.position.set(x, yc, sg * (zin + zout) / 2); o.ajouter(m); }
    g.dispose();
  }
  /** ellipsoïde (sphère scalée). */
  const ellipso = (rx, ry, rz, m, x, y, z, seg = 24) => { const s = new THREE.Mesh(garde(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.66))), m); s.scale.set(rx, ry, rz); s.position.set(x, y, z); return o.ajouter(s); };
  return { ...A, THREE, garde, loft, coque, coque2, souleve, poserArches: (ar) => { archesV = ar; }, hautAu, flancAu, bordX, dedans, drapeFlancs, drapeDessus, gaine, ellipso, normSt };
}

/**
 * Voiture de route sculptée.
 * S = {
 *   caisse (hex), toit (hex, défaut caisse), vitre (hex, défaut verre fumé bleuté), opVitre,
 *   corps : stations du bas de caisse [{x,w,y0,y1,nt,nb,wt}],
 *   serre : stations du pavillon vitré [{x,w,y0,y1,nt,wt}] (y0 = 2·ceinture − toit pour que le flanc vitré parte de la ceinture),
 *   pav : { xr0, xr1 (toit peint), tR (angle de bord de toit, défaut 0.95), A:[x0,x1] montant A, B:[x0,x1], C:[x0,x1], D? }
 *   roues : [{x, RW, ep, avant, deb (débord du pneu hors de l'aile), jante, rayons, flanc, etrier, …}],
 *   extra(ctx, K, G) : détails (calandre, feux, autocollants…)
 * }
 */
export function routiere(ctx, S) {
  const { THREE } = ctx;
  const K = carrosserie(ctx), { o } = K;
  const peint = o.lac(S.caisse, S.rug ?? 0.22, S.metal ?? 0.35), toit = S.toit ? o.lac(S.toit, 0.22, 0.35) : peint;
  peint.side = THREE.DoubleSide; toit.side = THREE.DoubleSide;
  const noir = o.mat('#15171c', 0.55, 0.3), sombre = o.mat('#0b0c10', 0.85, 0.1);
  sombre.side = THREE.DoubleSide;
  const vitre = ctx.garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(S.vitre || '#0c1626').convertSRGBToLinear(), roughness: 0.06, metalness: 0.1, transparent: true, opacity: S.opVitre ?? 0.94, clearcoat: 1, clearcoatRoughness: 0.05, envMap: ctx.envMap, envMapIntensity: 0.45, side: THREE.DoubleSide }));
  const corps = normStLocal(S.corps), serre = normStLocal(S.serre);
  const roues = S.roues.map((r) => {
    const s = interpSt(corps, r.x), ep = r.ep ?? 0.5;
    const z = r.z ?? (s.w + (r.deb ?? -0.015) - ep / 2);
    return { ...r, ep, z };
  });
  // Brief 10 : découpe du passage de roue ≥ R_pneu + 0,12 ; zt = aplomb extérieur du pneu jusqu'où la tôle doit le coiffer
  const arches = roues.map((r) => ({ x: r.x, R: r.RW + Math.max(0.12, r.jeu ?? 0.13), y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.05, zt: r.z + r.ep * 0.47, garde: r.garde ?? 0.06 }));
  K.poserArches(arches.map((a) => ({ x: a.x, R: a.R + 0.02, y: a.y })));
  K.loft(corps, peint, { arches, nx: S.nx ?? 130, ns: 64, ailes: true });
  for (const a of arches) {
    const zo = Math.min(interpSt(corps, a.x).w + 0.03, K.flancAu(corps, a.x, Math.min(a.y + a.R, interpSt(corps, a.x).y1 - 0.02)) - 0.02);
    let hMin = 9; for (const dx of [-a.R * 0.5, 0, a.R * 0.5]) hMin = Math.min(hMin, K.hautAu(corps, a.x + dx, zo));
    a.Rg = Math.min(a.R - 0.015, hMin - a.y - 0.06);
    K.gaine(a.x, a.y, a.Rg, a.zin - 0.02, zo, sombre);
  }
  // fond de passage de roue : segment de disque sombre plaqué contre la paroi intérieure (vu de profil autour du pneu)
  for (const a of arches) {
    const Rd = Math.min(a.R, K.hautAu(corps, a.x, a.zin + 0.02) - a.y - 0.05), ys = interpSt(corps, a.x).y0 + 0.01, yb = Math.max(-0.99, Math.min(0.99, (ys - a.y) / Rd)), t0 = Math.asin(yb);
    const sh = new THREE.Shape(); sh.moveTo(Rd * Math.cos(t0), ys - a.y); sh.absarc(0, 0, Rd, t0, Math.PI - t0, false); sh.closePath();
    const g = ctx.garde(new THREE.ShapeGeometry(sh, 20));
    for (const sg of [-1, 1]) { const m = new THREE.Mesh(g, sombre); m.position.set(a.x, a.y, sg * (a.zin + 0.012)); o.ajouter(m); }
  }
  // soubassement sombre entre les roues (invisible de profil, évite le « vide » sous la caisse)
  { const zi = Math.min(...arches.map((a) => a.zin)) - 0.03, ys = Math.min(...corps.map((s) => s.y0));
    o.boite(Math.abs(roues[0].x - roues[roues.length - 1].x) + 0.4, 0.1, zi * 2, noir, (roues[0].x + roues[roues.length - 1].x) / 2, ys + 0.08, 0); }
  // pavillon
  const P = S.pav, tR = P.tR ?? 0.95;
  K.loft(serre, vitre, { nx: 70, ns: 48, cap: 0.02, libre: true, arches: arches.map((a) => ({ x: a.x, R: a.R + 0.02, y: a.y, zin: 0 })) });
  K.coque(serre, P.xr0, P.xr1, tR, Math.PI - tR, toit, 0.035, 30, 16);
  if (P.A) K.coque2(serre, P.A[0], P.A[1], tR - (P.aA ?? 0.42), tR + 0.02, toit, 0.033, 18, 6);
  if (P.B) K.coque2(serre, P.B[0], P.B[1], -0.5, tR + 0.02, toit, 0.03, 4, 10);
  if (P.C) K.coque2(serre, P.C[0], P.C[1], -0.5, tR + 0.02, toit, 0.03, 12, 10);
  if (P.D) K.coque2(serre, P.D[0], P.D[1], tR - 0.5, tR + 0.02, toit, 0.03, 12, 6);
  // rétroviseurs : coque en ellipsoïde sur un pied
  if (S.retro !== false) {
    const xR = S.retroX ?? (P.A ? P.A[0] + 0.25 : 1), sR = interpSt(serre, xR), yR = (sR.y0 + sR.y1) / 2 + 0.12, zR = sR.w + 0.12;
    const mR = S.retro === 'noir' ? noir : peint;
    for (const sg of [-1, 1]) { K.ellipso(0.08, 0.08, 0.15, mR, xR, yR, sg * zR); o.boite(0.08, 0.05, 0.14, noir, xR + 0.02, yR - 0.06, sg * (zR - 0.1)); }
  }
  const G = { corps, serre, roues, arches, peint, toit, noir, sombre, vitre };
  if (S.extra) S.extra(ctx, K, G);
  const xs = corps.map((s) => s.x), ys1 = serre.map((s) => s.y1);
  const ret = { L: Math.max(...xs) - Math.min(...xs), largeur: Math.max(...corps.map((s) => s.w)) * 2, hauteur: S.H ?? Math.max(...ys1) + 0.05, xAvant: Math.max(...xs), xArriere: Math.min(...xs),
    roues: roues.map((r) => { const { deb, jeu, ...q } = r; return q; }), jante: roues[0].jante, flanc: roues[0].flanc };
  return ret;
}
function normStLocal(st) { return [...st].map((s) => ({ ...DEF_ST, ...s })).sort((a, b) => a.x - b.x); }
