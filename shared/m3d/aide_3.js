/**
 * Aides du groupe 3 : monoplaces F1 modernes (constructeur paramétrable) et petites briques géométriques.
 * Repère : avant = +x, sol y = 0, z = largeur. Aucune marque : motifs et mots génériques uniquement.
 */
import { outils } from './outils.js';

/** Générateur pseudo-aléatoire déterministe (autocollants identiques à chaque construction). */
export function graine(s) { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Points d'un arc de cercle (profil de passage de roue, etc.). */
export function arc(cx, cy, r, a0, a1, n = 14) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }

/** Disque numéroté (rond de course). */
export function disque(g, x, y, r, num, fond = '#fff', encre = '#111') {
  g.fillStyle = fond; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = encre; g.font = `900 ${Math.round(r * 1.35)}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), x, y + r * 0.06); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
/** Étoile à n branches. */
export function etoile(g, x, y, R, r, n = 5, rot = -Math.PI / 2) {
  g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, k = i % 2 ? r : R; g.lineTo(x + k * Math.cos(a), y + k * Math.sin(a)); } g.closePath(); g.fill();
}

/** Brique : polygone en plan (x, z) extrudé en hauteur h à partir de y0 (dessus plat, arêtes vives). */
export function planche(ctx, o, ptsXZ, y0, h, m) {
  const { THREE, garde } = ctx;
  const s = new THREE.Shape(); ptsXZ.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, steps: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);                     // (x, y_forme) → (x, 0, -z) ; profondeur → +y
  const mesh = new THREE.Mesh(garde(g), m); o.ajouter(mesh); return mesh;
}

/** Tige cylindrique entre deux points (bras de suspension, tubes). */
export function tige(ctx, o, a, b, r, m, seg = 10) {
  const { THREE, garde } = ctx;
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const mesh = new THREE.Mesh(garde(new THREE.CylinderGeometry(r, r, d.length(), seg)), m);
  mesh.position.copy(A).addScaledVector(d, 0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o.ajouter(mesh);
}
/** Tube suivant une courbe passant par des points [x,y,z]. */
export function tube(ctx, o, pts, r, m, seg = 40, rad = 8) {
  const { THREE, garde } = ctx;
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  return o.ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(c, seg, r, rad, false)), m));
}
/** Autocollant à plat sur une surface horizontale (ou inclinée de `incl` rad autour de z). Le dessin a l'avant à droite. */
export function decalDessus(ctx, o, dessin, long, large, x, y, z = 0, incl = 0, cw = 512, ch = 256) {
  const { THREE, garde } = ctx;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; dessin(cv.getContext('2d'), cw, ch);
  const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  const m = garde(new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
  const p = new THREE.Mesh(garde(new THREE.PlaneGeometry(long, large)), m); p.rotation.x = -Math.PI / 2;
  const gr = new THREE.Group(); gr.position.set(x, y, z); gr.rotation.z = incl; gr.add(p); o.ajouter(gr); return gr;
}

/** Interpolation linéaire d'une polyligne [[x,y]…] triée de l'avant (x grand) vers l'arrière. */
export function hauteurEn(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; if (x <= x0 && x >= x1) return y0 + (y1 - y0) * (x0 - x) / (x0 - x1); }
  return x > pts[0][0] ? pts[0][1] : pts[pts.length - 1][1];
}

/** Silhouette par défaut d'une F1 « effet de sol » : chaque voiture surcharge ce qui la distingue (cfg.sil). */
const SIL = {
  /* monocoque / nez */
  noseX: 4.05, tipLo: 0.44, tipHi: 0.64, nosePts: [[3.2, 0.8], [2.2, 0.96], [1.2, 1.08], [0.6, 1.14], [-0.2, 1.18], [-0.9, 1.22]], noseW: 0.8, noseTaper: 0.58,
  /* pontons */
  podX: 1.35, podZ: 0.62, podW: 0.5, podBot: 0.3, podTop: [[1.3, 0.78], [0.8, 0.98], [-0.5, 0.97], [-1.9, 0.7], [-2.9, 0.5]], podTail: -2.9, podArriere: 0.55, inletH: 0.34, inletW: 0.44, bombe: 0.0,
  /* capot moteur, prise d'air, aileron-requin */
  engW: 0.5, engTop: [[0.55, 1.15], [-0.7, 1.24], [-1.6, 1.06], [-2.6, 0.84], [-3.7, 0.66]], airH: 1.72, airW: 0.34, finLift: 0.0, finW: 0.07,
  /* plancher */
  floorW: 0.92, floorH: 0.32, floorFront: 2.3,
  /* aileron avant */
  fw: { span: 1.58, el: 3, ep: 'plein', epH: 1.0, tip: false },
  /* aileron arrière */
  rw: { y1: 1.12, y2: 1.4, w: 1.9, chord: 0.6, epH: 0.85, epL: 1.15, ep: 'plein', pilier: 'mono', beam: false, x: -3.7 },
  /* roues */
  rAv: 0.62, rAr: 0.7, epAv: 0.62, epAr: 0.84, ZC: 1.3, xAv: 2.55, xAr: -2.4,
  /* rétroviseurs : taille et position */
  mirrZ: 0.54, mirrY: 1.32, mirrX: 0.95,
};

/**
 * Monoplace F1 moderne (effet de sol) PARAMÉTRÉE PAR SILHOUETTE : nez, pontons, prise d'air, capot, plancher,
 * aileron avant (nombre d'éléments, forme des dérives), aileron arrière (hauteur, mât, dérives), roues.
 * cfg : { caisse, acc, plancher, aile, aileAv, accEnd, casque, visiere, flanc, jante, ponton(g,w,h), nez(g,w,h), capot(g,w,h), style, sil:{…surcharges de SIL} }
 */
export function f1Moderne(ctx, cfg) {
  const { THREE, lumRouge } = ctx, o = outils(ctx);
  const sl = cfg.sil || {};
  const S = { ...SIL, ...sl, fw: { ...SIL.fw, ...(sl.fw || {}) }, rw: { ...SIL.rw, ...(sl.rw || {}) } };
  const carr = o.lac(cfg.caisse, 0.24, 0.1), acc = o.lac(cfg.acc || cfg.caisse, 0.24, 0.1);
  const aileAr = o.lac(cfg.aile || cfg.caisse, 0.25, 0.1), aileAv = o.lac(cfg.aileAv || cfg.aile || cfg.caisse, 0.25, 0.1);
  const noir = o.mat('#15161a', 0.5, 0.4), plan = o.mat(cfg.plancher || '#1b1c21', 0.65, 0.25), acier = o.mat('#2b2e36', 0.4, 0.8);
  const accE = cfg.accEnd ? o.lac(cfg.accEnd, 0.25, 0.1) : aileAv;
  const st = cfg.style || {};
  const miroir = o.mat('#2a2c33', 0.4, 0.4);

  /* ---- plancher noir large (effet de sol) + diffuseur ---- */
  const fw_ = S.floorW, ff = S.floorFront;
  planche(ctx, o, [[3.1, -0.34], [ff, -fw_ + 0.06], [1.6, -fw_], [-1.4, -fw_ - 0.04], [-2.9, -0.72], [-3.1, -0.5], [-3.1, 0.5], [-2.9, 0.72], [-1.4, fw_ + 0.04], [1.6, fw_], [ff, fw_ - 0.06], [3.1, 0.34]], 0.12, S.floorH, plan);
  o.profil([[-2.4, 0.2], [-4.0, 0.68], [-4.0, 0.78], [-2.4, 0.42]], 1.5, noir, { galbe: false, biseau: 0.03 });                    // diffuseur relevé
  for (const z of [-0.45, 0, 0.45]) o.boite(1.5, 0.3, 0.05, noir, -3.3, 0.55, z);                                                  // ailettes du diffuseur
  o.boite(0.7, 0.34, 0.62, noir, -3.55, 0.55, 0);                                                                                 // boîte de vitesses / crash

  /* ---- monocoque + nez : loft à sections arrondies (dessus bombé, fond plat), nez plongeant qui s'effile ---- */
  const nosePts = [[S.noseX, S.tipHi], ...S.nosePts];
  const xs = [-0.95, -0.2, 0.6, 1.2, 1.9, 2.6, 3.2, 3.7, S.noseX - 0.08, S.noseX].filter((x, i, a) => x <= S.noseX && (i === a.length - 1 || x < S.noseX - 0.05));
  const nez = xs.map((x) => {
    const u = Math.min(1, Math.max(0, (x - 0.6) / (S.noseX - 0.6))), top = hauteurEn(nosePts, x);
    const bot = x < 1.2 ? 0.3 : 0.3 + (S.tipLo - 0.3) * Math.pow((x - 1.2) / (S.noseX - 1.2), 1.6);
    const bout = x >= S.noseX - 0.01;
    return { x, w: (S.noseW / 2) * (1 - (1 - S.noseTaper) * Math.pow(u, 1.1)) * (bout ? 0.7 : 1), y0: bout ? bot + 0.03 : bot, y1: bout ? top - 0.03 : top, nt: 2.3, nb: 3.2, wt: 0.82 };
  });
  loft(ctx, o, nez, carr, { nx: 110, ns: 44 });
  o.boite(0.95, 0.04, 0.4, noir, 0.2, 1.21, 0);                                                                                    // habitacle sombre
  o.boite(0.45, 0.12, 0.5, noir, -0.35, 1.26, 0);                                                                                  // appuie-tête

  /* ---- pontons : lofts sculptés (contre-dépouille sous la bouche, flanc bombé, chute vers l'arrière), bouche ovale ---- */
  const px = S.podX, pt0 = S.podTop[0][1], hw = S.podW / 2;
  const podXs = [S.podTail, ...S.podTop.map((p) => p[0]).filter((x) => x < px - 0.12 && x > S.podTail + 0.1).sort((a, b) => a - b), px - 0.1, px];
  const pod = podXs.map((x, i) => {
    const top = hauteurEn(S.podTop, x), u = (x - S.podTail) / (px - S.podTail), bout = i === podXs.length - 1, queue = i === 0;
    const w = hw * (queue ? 0.35 : (0.55 + 0.45 * Math.pow(Math.min(1, u * 1.6), 0.7))) * (bout ? 0.86 : 1);
    return { x, w, y0: S.podBot + (queue ? 0.04 : 0) + (bout ? 0.03 : 0), y1: Math.max(S.podBot + 0.12, top - (bout ? 0.04 : 0)), nt: 2.4 + S.bombe * 6, nb: 2.2, wt: 0.86 };
  });
  for (const z of [-1, 1]) {
    loft(ctx, o, pod, carr, { nx: 70, ns: 40 }).position.z = z * S.podZ;
    const bo = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 18, 12)), noir);                                                 // bouche de refroidissement
    bo.scale.set(0.06, S.inletH / 2, Math.min(S.inletW, S.podW * 0.86) / 2); bo.position.set(px + 0.0, S.podBot + 0.05 + S.inletH / 2, z * S.podZ); o.ajouter(bo);
    o.boite(0.9, Math.min(0.5, pt0 - 0.2), 0.04, noir, 1.85, 0.3 + Math.min(0.5, pt0 - 0.2) / 2 + 0.05, z * (S.podZ + hw + 0.08));       // déflecteur latéral (bargeboard)
    o.boite(0.3, 0.12, 0.17, miroir, S.mirrX, S.mirrY, z * S.mirrZ);                                                                  // rétroviseur
    tige(ctx, o, [S.mirrX - 0.05, 0.98, z * 0.4], [S.mirrX, S.mirrY - 0.04, z * S.mirrZ], 0.035, noir);                            // bras de rétroviseur
  }

  /* ---- capot moteur (loft qui se resserre en « taille de guêpe »), boîte à air arrondie, aileron-requin ---- */
  const eT = S.engTop;
  const cap = [...eT].reverse().map(([x, y], i, a) => ({ x, w: (S.engW / 2) * (i === 0 ? 0.36 : i === a.length - 1 ? 0.9 : 0.55 + 0.45 * (i / (a.length - 1))), y0: 0.4, y1: y, nt: 2.2, nb: 3, wt: 0.7 }));
  loft(ctx, o, cap, carr, { nx: 80, ns: 40 });
  const k = S.airH / 1.72, ay = (y) => 1.1 + (y - 1.1) * k;
  const boite_air = [[-1.15, 0.06, 1.18], [-0.7, 0.14, ay(1.45)], [-0.15, 0.17, ay(1.64)], [0.2, 0.17, ay(1.72)], [0.5, 0.15, ay(1.6)], [0.6, 0.12, ay(1.5)]]
    .map(([x, w, y]) => ({ x, w: w * S.airW / 0.34, y0: 1.0, y1: y, nt: 2.0, nb: 3, wt: 0.75 }));
  loft(ctx, o, boite_air, carr, { nx: 40, ns: 32 });
  const pa = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(1, 16, 10)), noir); pa.scale.set(0.05, 0.13 * k, S.airW * 0.36); pa.position.set(0.6, ay(1.5), 0); o.ajouter(pa);   // prise d'air moteur
  const fl = S.finLift;
  o.profil([[-0.9, 1.22], [-1.5, 1.2 + fl], [-3.0, 0.8 + fl * 0.6], [-3.0, 0.7]], S.finW, acc, { galbe: false, biseau: 0.02, y: 0.0 }).position.y = 0.0;   // dérive dorsale

  /* ---- pilote : casque, visière ---- */
  const cas = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(0.21, 20, 14)), o.lac(cfg.casque || '#f2f2f2', 0.2, 0.2)); cas.position.set(0.16, 1.36, 0); cas.scale.set(1.12, 1, 1); o.ajouter(cas);
  const vis = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(0.13, 14, 10)), o.mat(cfg.visiere || '#0c0d12', 0.1, 0.7)); vis.position.set(0.3, 1.38, 0); vis.scale.set(0.7, 0.5, 1.45); o.ajouter(vis);
  const bande = new THREE.Mesh(ctx.garde(new THREE.TorusGeometry(0.205, 0.022, 6, 24)), acc); bande.position.set(0.16, 1.37, 0); bande.rotation.y = Math.PI / 2; o.ajouter(bande);

  /* ---- halo : arceau en Y autour du casque ---- */
  tube(ctx, o, [[-0.5, 1.2, 0.38], [-0.1, 1.42, 0.33], [0.45, 1.56, 0.2], [1.02, 1.46, 0.0], [0.45, 1.56, -0.2], [-0.1, 1.42, -0.33], [-0.5, 1.2, -0.38]], 0.05, noir, 60, 8);
  tige(ctx, o, [1.02, 1.46, 0], [1.14, 1.1, 0], 0.055, noir);
  for (const z of [-1, 1]) tige(ctx, o, [-0.5, 1.2, z * 0.38], [-0.55, 1.1, z * 0.3], 0.05, noir);

  /* ---- aileron avant : N éléments étagés, nacelles, dérives selon le style ---- */
  const F = S.fw, spanAv = F.span;
  for (let i = 0; i < F.el; i++) {
    const sp = spanAv - 0.08 * i, xr = 3.5 + 0.05 * i, fo = 4.28 - 0.3 * i - (i > 1 ? 0.05 : 0), fc = 4.4 - 0.48 * i, zi = 1.0 - 0.12 * i;
    planche(ctx, o, [[xr - 0.05, -0.4], [xr, -sp], [fo, -sp], [fo - 0.08, -zi], [fc, -0.45], [fc, 0.45], [fo - 0.08, zi], [fo, sp], [xr, sp], [xr - 0.05, 0.4]], 0.13 + 0.115 * i, i ? 0.06 - 0.005 * i : 0.07, aileAv);
  }
  const hE = F.epH * 0.75;                                                                                       // dérives avant plus basses (conformes aux photos)
  const epPts = {
    plein: [[3.55, 0.1], [3.55, 0.62 * hE], [3.75, 0.72 * hE], [4.3, 0.5 * hE], [4.3, 0.1]],
    haut: [[3.5, 0.1], [3.5, 0.95 * hE], [3.85, 1.0 * hE], [4.35, 0.62 * hE], [4.35, 0.1]],                                         // grande dérive balayée vers le haut
    courbe: [[3.55, 0.1], [3.5, 0.72 * hE], [3.9, 0.82 * hE], [4.32, 0.46 * hE], [4.32, 0.1]],
    cran: [[3.55, 0.1], [3.55, 0.8 * hE], [3.85, 0.84 * hE], [3.98, 0.5 * hE], [4.3, 0.46 * hE], [4.3, 0.1]],                      // dérive à échancrure
    rampe: [[3.5, 0.1], [3.5, 0.5 * hE], [4.3, 0.95 * hE], [4.35, 0.1]],                                                            // dérive en rampe montante vers l'avant
  }[F.ep] || null;
  for (const z of [-1, 1]) {
    const ep = o.profil(epPts, 0.05, accE, { galbe: false, biseau: 0.015 }); ep.position.z = z * (spanAv + 0.02);                  // aileron latéral
    o.boite(0.12, 0.32, 0.12, noir, 3.7, 0.3, z * 0.2);                                                                             // nacelles de support
  }
  if (st.rainures) for (let i = 0; i < 6; i++) for (const z of [-1, 1]) o.boite(0.3, 0.015, 0.03, noir, 4.0, 0.205, z * (0.55 + i * 0.16));          // rainures décoratives

  /* ---- aileron arrière : plans, mât(s), grandes dérives, feu de pluie ---- */
  const R = S.rw, xc = R.x, ww = R.w;
  o.boite(R.chord, 0.07, ww, aileAr, xc, R.y1, 0).rotation.z = 0.08;
  o.boite(R.chord * 0.85, 0.06, ww, aileAr, xc - 0.08, R.y2, 0).rotation.z = -0.28;
  if (R.beam) o.boite(R.chord * 0.75, 0.05, ww * 0.78, aileAr, xc - 0.1, (R.y1 + R.y2) / 2 + 0.02, 0).rotation.z = -0.1;
  o.boite(0.5, 0.05, 1.3, aileAr, -3.85, 0.6, 0);                                                                                  // petit plan inférieur (beam)
  const top = R.y2 + 0.14, bot = top - R.epH * 1.0, xf = xc + R.epL / 2, xr = xc - R.epL / 2;
  const epR = {
    plein: [[xf, bot], [xf, top], [xr, top], [xr, bot]],
    rond: [[xf, bot], [xf, top], [xr + 0.3, top], [xr, top - 0.3], [xr, bot]],
    coupe: [[xf, bot], [xf, top - 0.4], [xf - 0.4, top], [xr, top], [xr, bot]],
    marche: [[xf, bot], [xf, top - 0.25], [xc, top - 0.25], [xc, top], [xr, top], [xr, bot]],
  }[R.ep];
  for (const z of [-1, 1]) {
    o.profil(epR, 0.06, accE, { galbe: false, biseau: 0.012 }).position.z = z * (ww / 2 + 0.03);
    o.boite(0.12, 0.7, 0.06, noir, -3.2, 0.95, z * 0.18);
  }
  if (R.pilier === 'double') for (const z of [-1, 1]) { o.boite(0.2, R.y1 - 0.62, 0.07, noir, xc + 0.15, 0.62 + (R.y1 - 0.62) / 2, z * 0.4); }
  else o.boite(0.16, 0.5, 0.16, noir, -3.5, 0.9, 0);                                                                              // mât central
  o.boite(0.05, 0.22, 0.16, lumRouge, -4.2, 0.72, 0);                                                                              // feu arrière

  /* ---- décalcomanies : positions déduites de la silhouette ---- */
  const zp = S.podZ + S.podW / 2 + 0.05 + 0.005;
  if (cfg.ponton) {                                                       // autocollant de ponton drapé sur le flanc sculpté (rapport 1024x215 conservé)
    let w = 2.0; for (let i = 0; i < 6; i++) w = Math.min(2.0, 4.76 * Math.min(0.42, hauteurEn(S.podTop, 0.5 - w) - S.podBot - 0.14));
    w = Math.max(w, 0.9); const h = w / 4.76, y0 = S.podBot + 0.08;
    drapeFlancs(ctx, o, pod, 0.5 - w, 0.5, y0, y0 + h, cfg.ponton, 1024, 215, 0.014, S.podZ); }
  if (cfg.nez) drapeDessus(ctx, o, nez, 1.2, Math.min(3.5, S.noseX - 0.4), -0.17, 0.17, cfg.nez, 768, 112, 0.012);
  if (cfg.capot) drapeDessus(ctx, o, cap, -3.2, -0.75, -0.17, 0.17, cfg.capot, 768, 100, 0.012);
  if (cfg.flancTub) o.decalFlanc(cfg.flancTub, 1.0, 0.4, 2.0, 0.55, 0.0, 512, 200);

  /* ---- roues, bras de suspension jusqu'aux moyeux ---- */
  const { ZC, rAv, rAr, epAv, epAr, xAv, xAr } = S;
  for (const [cx, Rr, ep] of [[xAv, rAv, epAv], [xAr, rAr, epAr]]) for (const z of [-1, 1]) {
    const hub = [cx, Rr, z * (ZC - ep / 2 + 0.04)];
    for (const dx of [-0.32, 0.32]) {
      tige(ctx, o, [cx + dx, Rr + 0.36, z * 0.4], hub, 0.028, acier, 8);                                                           // triangle supérieur
      tige(ctx, o, [cx + dx * 1.1, 0.48, z * 0.42], [cx, Rr - 0.1, z * (ZC - ep / 2 + 0.04)], 0.028, acier, 8);                     // triangle inférieur
    }
    const rot = new THREE.Mesh(ctx.garde(new THREE.SphereGeometry(0.07, 10, 8)), acier); rot.position.set(...hub); o.ajouter(rot);
  }
  const roue = (x, Rr, ep, av) => ({ x, RW: Rr, ep, z: ZC, avant: av, jante: cfg.jante || '#2a2d34', rayons: 'plein', flanc: cfg.flanc || null, sansFrein: true, lenticulaire: cfg.flasque !== false });   // flasques de roues (disque plein)
  return {
    L: 8.4, largeur: 3.0, hauteur: Math.max(1.78, S.airH + 0.06), xAvant: 4.4, xArriere: -4.2,
    roues: [roue(xAv, rAv, epAv, true), roue(xAr, rAr, epAr, false)], jante: cfg.jante || '#2a2d34', flanc: cfg.flanc || null,
  };
}

/* ======================================================================================================
 * Carrosserie « loft » (inspirée de l'aide du groupe 2) : sections superellipses interpolées le long de x.
 * Station : { x, w (demi-largeur), y0 (bas), y1 (haut), nt (exposant du dessus), nb (exposant du dessous), wt (rétrécissement du haut : tumblehome) }.
 * opt.arches = [{ x, R, y, zin }] : passages de roues creusés (la caisse remonte en arc au-dessus du pneu, hors de |z| < zin).
 * ====================================================================================================== */
const CHAMPS = ['w', 'y0', 'y1', 'nt', 'nb', 'wt'];
const DEF_ST = { nt: 2.6, nb: 3.4, wt: 1 };
const normSt = (st) => st.map((s) => ({ ...DEF_ST, ...s }));

/** Interpolation de Hermite (tangentes de Catmull-Rom, bornée) de tous les champs entre deux stations triées par x croissant. */
export function stationEn(stIn, x) {
  const st = normSt(stIn), n = st.length; let i = 0;
  while (i < n - 2 && x > st[i + 1].x) i++;
  const a = st[i], b = st[i + 1], h = Math.max(1e-6, b.x - a.x), t = Math.min(1, Math.max(0, (x - a.x) / h));
  const p0 = st[Math.max(0, i - 1)], p3 = st[Math.min(n - 1, i + 2)];
  const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const r = { x };
  for (const k of CHAMPS) {
    const ma = (b[k] - p0[k]) / Math.max(1e-6, b.x - p0.x), mb = (p3[k] - a[k]) / Math.max(1e-6, p3.x - a.x);
    const v = h00 * a[k] + h10 * h * ma + h01 * b[k] + h11 * h * mb, lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), m = (hi - lo) * 0.25;
    r[k] = Math.min(hi + m, Math.max(lo - m, v));
  }
  return r;
}
function pointSection(s, t) {
  const c = Math.cos(t), sn = Math.sin(t), n = sn >= 0 ? s.nt : s.nb, yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2;
  const yy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n), zz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const k = sn > 0 ? 1 - (1 - s.wt) * yy : 1;
  return [s.w * zz * k, yc + hh * yy];
}

/** Corps lofté fermé (bouchons aux extrémités). Renvoie le mesh ajouté au châssis. */
export function loft(ctx, o, stIn, mat, opt = {}) {
  const { THREE, garde } = ctx;
  const st = normSt(stIn), NX = opt.nx || 120, NS = opt.ns || 52, ar = opt.arches || [];
  const x0 = st[0].x, x1 = st[st.length - 1].x, pos = [], idx = [];
  const centre = (s) => [s.x, (s.y0 + s.y1) / 2, 0];
  for (let k = 0; k < NS; k++) pos.push(...centre(st[0]));
  for (let j = 0; j < NX; j++) {
    const u = (1 - Math.cos(Math.PI * j / (NX - 1))) / 2, x = x0 + (x1 - x0) * u, s = stationEn(st, x);
    for (let k = 0; k < NS; k++) {
      const [z, y0] = pointSection(s, k / NS * 2 * Math.PI); let y = y0;
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
  let vol = 0;                                                       // volume signé : retourne les faces si elles sont à l'envers
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
/** Hauteur de la surface supérieure du loft en (x, z). */
export function hautAu(st, x, z) { const s = stationEn(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, r = Math.min(0.9999, Math.abs(z) / s.w); return yc + hh * Math.pow(1 - Math.pow(r, s.nt), 1 / s.nt); }
/** Demi-largeur du loft en (x, y) (sans le rétrécissement wt, à utiliser pour les flancs bas). */
export function flancAu(st, x, y) { const s = stationEn(st, x), yc = (s.y0 + s.y1) / 2, hh = (s.y1 - s.y0) / 2, yy = Math.min(0.9999, Math.abs((y - yc) / hh)), n = y >= yc ? s.nt : s.nb; const k = y >= yc ? 1 - (1 - s.wt) * Math.pow(yy, 1) : 1; return s.w * k * Math.pow(1 - Math.pow(yy, n), 1 / n); }
/** Passages de roues pour loft() à partir des entrées de roues. */
export const arches = (roues, marge = 1.1) => roues.map((r) => ({ x: r.x, R: r.RW * marge + 0.03, y: r.y ?? r.RW, zin: r.z - r.ep / 2 - 0.03 }));

function matDecal(ctx, draw, cw, ch) {
  const { THREE, garde, envMap } = ctx;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; draw(cv.getContext('2d'), cw, ch);
  const t = garde(new THREE.CanvasTexture(cv)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return garde(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, metalness: 0.1, envMap, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide, depthWrite: false }));
}
function grilleMesh(ctx, o, nu, nv, pt, mat) {
  const { THREE, garde } = ctx, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { const [p, q] = pt(i / nu, k / nv); pos.push(...p); uv.push(...q); }
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) { const a = i * (nv + 1) + k, b = (i + 1) * (nv + 1) + k; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(garde(g), mat); m.renderOrder = 2; return o.ajouter(m);
}
/** Autocollant drapé sur le dessus du loft : canvas vu de dessus, nez à droite, +z vers le bas du canvas. */
export function drapeDessus(ctx, o, st, x0, x1, z0, z1, draw, cw = 1024, ch = 256, eps = 0.02) {
  return grilleMesh(ctx, o, 90, 26, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [[x, hautAu(st, x, z) + eps, z], [u, 1 - v]]; }, matDecal(ctx, draw, cw, ch));
}
/** Autocollant drapé sur les deux flancs du loft (canvas vu du côté +z, nez à droite ; l'autre côté est retourné pour rester lisible). */
export function drapeFlancs(ctx, o, st, x0, x1, yb, yt, draw, cw = 1024, ch = 256, eps = 0.018, zOff = 0) {
  // un canvas par côté : au flanc −z la mise en page est symétrisée (même abscisse véhicule), textes redressés
  for (const sg of [1, -1]) grilleMesh(ctx, o, 110, 22, (u, v) => { const x = x0 + (x1 - x0) * u, y = yb + (yt - yb) * v; return [[x, y, sg * (zOff + flancAu(st, x, y) + eps)], [sg > 0 ? u : 1 - u, v]]; }, matDecal(ctx, (g, w, h) => o.dessinerCote(draw, g, w, h, sg), cw, ch));
}
/** Puits de roue sombre : arc de couronne derrière chaque pneu (on ne voit jamais à travers la caisse). */
export function puits(ctx, o, roues, mat) {
  const { THREE, garde } = ctx;
  for (const r of roues) for (const sg of [-1, 1]) {
    const Ri = r.RW * 1.0, Ro = r.RW * 1.1 + 0.015, a0 = -0.1, a1 = Math.PI + 0.1, larg = r.ep * 0.8;
    const s = new THREE.Shape(); s.absarc(0, 0, Ro, a0, a1, false); s.absarc(0, 0, Ri, a1, a0, true); s.closePath();
    const m = new THREE.Mesh(garde(new THREE.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 20 })), mat);
    m.position.set(r.x, r.y ?? r.RW, sg * (r.z - r.ep * 0.12) - larg / 2); o.ajouter(m);
  }
}
