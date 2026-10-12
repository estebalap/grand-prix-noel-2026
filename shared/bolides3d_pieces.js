/* PIÈCES 3D DÉTAILLÉES DES BOLIDES — roues, freins, fauteuil H01 (Three.js pur, aucune ressource externe).

   Utilisé par bolides3d.js. Tout est procédural : segments radiaux ≥ 48 sur les roues, pneu en révolution (profil arrondi,
   sculptures par bump-map), jante à gorge profonde (lèvre chromée, fût, moyeu, boulons), disque de frein ventilé et étrier
   de couleur qui reste fixe quand la roue tourne, et fauteuil complet (cadre tubulaire titane, baquet capitonné, pupitre,
   bloc batterie à LED, turbine, roulettes antibascule).

   Repère identique à bolides3d.js : avant = +x, sol = y = 0, l'axe des roues est z. */

const K_SEG = 48;                                    // segments radiaux des roues (≥ 32 exigés)

/* ------------------------------------------------------------------ textures */
function canvas(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }

/** Sculpture de la bande de roulement (bump-map). u = tour de roue, v = profil du pneu RE-PARAMÉTRÉ par creerRoue :
 *  v ∈ [0 ; 0,2] flanc intérieur, v ∈ [0,2 ; 0,8] bande de roulement, v ∈ [0,8 ; 1] flanc extérieur.
 *  Le gris moyen (#808080) est neutre : seuls la bande et un fin jonc de protection sur chaque flanc reçoivent du relief,
 *  ainsi les flancs restent lisses et noirs (plus de crantelures claires sur tout le pneu). */
function texBandeBump(THREE) {
  const c = canvas(512, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    const y0 = h * 0.2, y1 = h * 0.8, L = y1 - y0;                                   // zone de la bande de roulement
    // pavés : léger bombé (plus clair = plus haut), en quinconce sur deux épaules et un pain central
    g.fillStyle = '#8e8e8e';
    for (let x = 0; x < w; x += 16) {
      g.fillRect(x + 1, y0 + 2, 12, L * 0.24);                                       // épaule 1
      g.fillRect(x + 9, y0 + L * 0.34, 12, L * 0.32);                                // pain central (décalé d'un demi-pas)
      g.fillRect(x + 1, y1 - 2 - L * 0.24, 12, L * 0.24);                            // épaule 2
    }
    // deux sillons circonférentiels larges et un fin sillon central
    g.fillStyle = '#3c3c3c';
    for (const y of [0.3, 0.7]) g.fillRect(0, y0 + L * y - 3, w, 6);
    g.fillStyle = '#5a5a5a'; g.fillRect(0, y0 + L * 0.5 - 1, w, 2);
    // lamelles obliques dans les épaules (détail fin, faible amplitude)
    g.strokeStyle = '#6a6a6a'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 16) {
      g.beginPath(); g.moveTo(x + 4, y0 + 3); g.lineTo(x + 10, y0 + L * 0.22); g.stroke();
      g.beginPath(); g.moveTo(x + 4, y1 - 3); g.lineTo(x + 10, y1 - L * 0.22); g.stroke();
    }
    // jonc de protection de jante, discret, sur chaque flanc
    g.fillStyle = '#909090'; g.fillRect(0, h * 0.06, w, 2); g.fillRect(0, h * 0.94 - 2, w, 2);
  });
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(3, 1); t.anisotropy = 8;
  return t;
}

/** Teinte décalée en luminance (HSL), renvoyée en chaîne CSS : sert aux dégradés tirés de la couleur de jante elle-même. */
function nuance(THREE, couleur, dL, kSat = 1) {
  const c = new THREE.Color(couleur), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * kSat), Math.min(1, Math.max(0, hsl.l + dL)));
  return '#' + c.getHexString();
}

/** Jante : rayons opaques sur fond transparent (alphaTest), pour laisser voir le disque de frein derrière.
 *  Dégradé radial tiré de la teinte de la jante (légèrement éclaircie au centre, assombrie au bord) :
 *  une jante noire reste noire, une blanche reste blanche, une dorée reste dorée. */
function texRayons(THREE, couleur, style, neon) {
  const lum = (() => { const hsl = { h: 0, s: 0, l: 0 }; new THREE.Color(couleur).getHSL(hsl); return hsl.l; })();
  const clair = nuance(THREE, couleur, lum < 0.2 ? 0.07 : 0.1);                    // point chaud : à peine plus clair que la teinte
  const sombre = nuance(THREE, couleur, -Math.min(0.14, lum * 0.35));             // bord : un ton plus sombre, jamais gris
  const trait = lum < 0.25 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.28)';         // filet d'usinage lisible sur toute teinte
  const c = canvas(512, 512, (g) => {
    g.translate(256, 256);
    const rg = g.createRadialGradient(-60, -60, 20, 0, 0, 256); rg.addColorStop(0, clair); rg.addColorStop(0.45, couleur); rg.addColorStop(1, sombre);
    const n = { cinq: 5, six: 6, trois: 3, dix: 10, etoile: 5 }[style] || 0;
    g.fillStyle = rg;
    if (style === 'plein') { g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2); g.fill(); g.strokeStyle = trait; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 130, 0, Math.PI * 2); g.stroke(); return; }
    if (style === 'maille') {
      g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (let r = 80; r < 230; r += 36) for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + (r % 2) * 0.1; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 11, 0, Math.PI * 2); g.fill(); }
      return;
    }
    const k = n || 5;
    // couronne extérieure + moyeu + rayons épais (le reste reste transparent)
    g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2); g.arc(0, 0, 214, 0, Math.PI * 2, true); g.fill();
    g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < k; i++) {
      const a = i / k * Math.PI * 2, w0 = style === 'etoile' ? 0.2 : 0.17;
      g.beginPath();
      g.moveTo(Math.cos(a - w0) * 50, Math.sin(a - w0) * 50); g.lineTo(Math.cos(a - w0 * 0.55) * 230, Math.sin(a - w0 * 0.55) * 230);
      g.lineTo(Math.cos(a + w0 * 0.55) * 230, Math.sin(a + w0 * 0.55) * 230); g.lineTo(Math.cos(a + w0) * 50, Math.sin(a + w0) * 50); g.closePath(); g.fill();
    }
    if (neon) { g.strokeStyle = neon; g.lineWidth = 14; g.beginPath(); g.arc(0, 0, 240, 0, Math.PI * 2); g.stroke(); }
  });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return t;
}

/** Disque de frein ventilé : fentes radiales + perçages. */
function texFrein(THREE) {
  const c = canvas(256, 256, (g) => {
    g.translate(128, 128);
    const rg = g.createRadialGradient(0, 0, 10, 0, 0, 124); rg.addColorStop(0, '#8a8f99'); rg.addColorStop(1, '#4b505a');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 124, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.save(); g.rotate(a); g.fillRect(70, -3, 46, 6); g.restore(); }
    g.fillStyle = '#222'; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
  });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}

/** Cuir capitonné : losanges avec boutons. */
export function texCapitonne(THREE, couleur = '#1a1b22', fil = '#d4a017') {
  const c = canvas(512, 512, (g, w, h) => {
    g.fillStyle = couleur; g.fillRect(0, 0, w, h);
    const n = 6, s = w / n;
    for (let i = -1; i <= n; i++) for (let j = -1; j <= n; j++) {
      const x = i * s + (j % 2 ? s / 2 : 0), y = j * s * 0.5;
      const rg = g.createRadialGradient(x, y, 2, x, y, s * 0.55); rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(0,0,0,.28)');
      g.fillStyle = rg; g.beginPath(); g.moveTo(x, y - s * 0.5); g.lineTo(x + s / 2, y); g.lineTo(x, y + s * 0.5); g.lineTo(x - s / 2, y); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.stroke();
      g.fillStyle = fil; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
  });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** Carbone sergé. */
function texCarbone(THREE) {
  const c = canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2d35'; g.fillRect(0, 0, w, h);
    const s = 16;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const sens = ((x + y) / s) % 2 === 0;
      const lg = sens ? g.createLinearGradient(x, y, x + s, y + s) : g.createLinearGradient(x + s, y, x, y + s);
      lg.addColorStop(0, '#6a7080'); lg.addColorStop(0.5, '#262932'); lg.addColorStop(1, '#565b6a');
      g.fillStyle = lg; g.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
  });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4;
  return t;
}

/** Métal brossé (rayures dans le sens du tube). */
function texBrosse(THREE) {
  const c = canvas(128, 512, (g, w, h) => {
    g.fillStyle = '#9aa1ab'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 20 + Math.random() * 200); }
  });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ roue complète */
/** Matériaux partagés par toutes les roues d'un bolide. `peinte` : jante laquée quasi sans métal (la couleur reste éclatante). */
export function materiauxRoue(THREE, { envMap = null, jante = '#c9cfda', rayons = 'cinq', neon = null, etrier = '#e8202a', garde = (x) => x, peinte = false } = {}) {
  const mj = peinte ? 0.06 : 0.85;
  const lumJante = (() => { const hsl = { h: 0, s: 0, l: 0 }; new THREE.Color(jante).getHSL(hsl); return hsl.l; })();
  const sombre = lumJante < 0.2;                         // jante noire / anthracite : vernis plus sobre pour ne pas virer au gris
  // Le moteur n'applique pas de gestion des couleurs aux hex (r128/r130) alors que la sortie est en sRGB : une teinte « #2a2c33 »
  // passée telle quelle ressort ~#707070 à l'écran. On linéarise donc les teintes perçues (les textures sRGB le sont déjà).
  const lin = (x) => new THREE.Color(x).convertSRGBToLinear();
  const m = {};
  // gomme : noir mat profond, aucun métal, relief discret limité à la bande de roulement (cf. texBandeBump)
  m.pneu = garde(new THREE.MeshStandardMaterial({ color: lin(0x0b0c0f), roughness: 0.92, metalness: 0, bumpMap: garde(texBandeBump(THREE)), bumpScale: 0.35 }));
  m.flancPneu = garde(new THREE.MeshStandardMaterial({ color: lin(0x0d0e11), roughness: 0.9, metalness: 0 }));
  // `neon` est ignoré : plus aucun anneau néon d'arcade peint sur une jante (paramètre gardé pour compatibilité d'appel)
  m.rayons = garde(new THREE.MeshPhysicalMaterial({ map: garde(texRayons(THREE, jante, rayons, null)), alphaTest: 0.5, side: THREE.DoubleSide, roughness: peinte ? 0.32 : 0.22, metalness: mj, clearcoat: sombre ? 0.45 : 0.7, clearcoatRoughness: sombre ? 0.18 : 0.08, envMap, envMapIntensity: sombre ? 0.7 : 1.2 }));
  m.fut = garde(new THREE.MeshStandardMaterial({ color: lin(jante).multiplyScalar(peinte ? 0.8 : 0.55), roughness: 0.35, metalness: peinte ? 0.2 : 0.9, envMap, envMapIntensity: sombre ? 0.6 : 1.1, side: THREE.DoubleSide }));
  // moyeu dans la teinte de la jante (un gros moyeu chromé rendait toute jante sombre « argent »)
  m.moyeu = garde(new THREE.MeshPhysicalMaterial({ color: lin(jante), roughness: peinte ? 0.3 : 0.2, metalness: mj, clearcoat: 0.6, clearcoatRoughness: 0.12, envMap, envMapIntensity: sombre ? 0.7 : 1.2 }));
  m.chrome = garde(new THREE.MeshStandardMaterial({ color: 0xe6e9ef, roughness: 0.06, metalness: 1, envMap, envMapIntensity: 1.4 }));
  m.frein = garde(new THREE.MeshStandardMaterial({ map: garde(texFrein(THREE)), roughness: 0.4, metalness: 0.9, envMap }));
  m.etrier = garde(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(etrier), roughness: 0.3, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.08, envMap }));
  m.boulon = garde(new THREE.MeshStandardMaterial({ color: 0xb8bcc6, roughness: 0.25, metalness: 1, envMap }));
  // voile de moyeu (fond de roue, côté intérieur) : ferme la roue, plus de vue « à travers » ni d'arcs parasites
  m.voile = garde(new THREE.MeshStandardMaterial({ color: lin(0x15161a), roughness: 0.75, metalness: 0.3, envMap, envMapIntensity: 0.4, side: THREE.DoubleSide }));
  return m;
}

function lathe(THREE, pts, segs = K_SEG) {
  const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), segs);
  g.rotateX(Math.PI / 2);              // l'axe de révolution devient z (axe de la roue)
  return g;
}

/**
 * Demi-profil (côté z > 0) d'un pneu « boudin » : talon, flanc bombé, épaule arrondie (quart d'ellipse tangent),
 * bande de roulement large et légèrement bombée. Points (r, z) à r croissant, du talon jusqu'au milieu de la bande.
 * rb : rayon du talon (trou de jante), R : rayon extérieur, h : demi-largeur.
 */
function demiProfilPneu(rb, R, h) {
  const d = [];
  const r0 = rb + R * 0.04, r1 = R * 0.86, zs = h * 0.97;        // flanc : de r0 à r1, à z ≈ h (bombé de 3 %)
  const zt = h * 0.55, rt = R * 0.988;                          // bande : |z| ≤ zt, rayon rt au bord, R au centre
  d.push([rb, h * 0.8]);                                        // talon (contre la lèvre de jante)
  d.push([rb + R * 0.022, h * 0.93]);
  for (let i = 0; i <= 6; i++) { const t = i / 6; d.push([r0 + (r1 - r0) * t, zs + h * 0.03 * Math.sin(Math.PI * t)]); }
  for (let i = 1; i <= 9; i++) { const a = i / 9 * Math.PI / 2; d.push([r1 + (rt - r1) * Math.sin(a), zt + (zs - zt) * Math.cos(a)]); }
  for (let i = 1; i <= 4; i++) { const t = 1 - i / 4; d.push([rt + (R - rt) * (1 - t * t), zt * t]); }   // bombé de bande jusqu'à z = 0
  return d;
}

/** z de la surface du flanc (côté +z) au rayon r, interpolé sur le demi-profil (pour poser un liseré exactement dessus). */
function zFlancPneu(demi, r) {
  if (r <= demi[0][0]) return demi[0][1];
  for (let i = 1; i < demi.length; i++) {
    const [ra, za] = demi[i - 1], [rb, zb] = demi[i];
    if (r <= rb) return rb > ra ? za + (zb - za) * (r - ra) / (rb - ra) : zb;
  }
  return demi[demi.length - 1][1];
}

/**
 * Roue détaillée. Renvoie { pivot, tourne (groupe qui tourne), etriers (groupe qui reste fixe) }.
 * R : rayon, ep : largeur, cote : +1 / −1 (face visible côté caméra), main : main courante (fauteuil), lenticulaire : disque plein carbone.
 * Tout est enfant de `pivot` (braquage) et la partie tournante de `tourne` ; les étriers restent fixes.
 */
export function creerRoue(THREE, mat, { R, ep, cote = 1, main = false, lenticulaire = false, flanc = null, flancR = [0.72, 0.8], garde = (x) => x, sansFrein = false }) {
  const pivot = new THREE.Group();
  const tourne = new THREE.Group(); pivot.add(tourne);
  const s = cote >= 0 ? 1 : -1, h = ep / 2;

  /* pneu : SOLIDE FERMÉ de révolution (flanc intérieur → bande → flanc extérieur → talon), normales vers l'extérieur.
     L'ancien profil laissait la bande de roulement ouverte (on voyait l'intérieur du pneu : gris clair + arcs parasites). */
  const rb = R * 0.66;
  const demi = demiProfilPneu(rb, R, h);
  const bas = demi.map(([r, z]) => [r, -z]);                                    // demi-profil miroir (côté −z)
  const talonBas = bas[0], talonHaut = demi[0];
  // boucle : talon −z → flanc int. → bande (z croissant) → flanc ext. → talon +z, puis retour le long du talon (cylindre intérieur).
  // Points doublés aux deux arêtes du talon : arêtes vives (normales non lissées à travers l'angle droit).
  const profil = [...bas, ...demi.slice(0, -1).reverse(), talonHaut, talonBas, talonBas];
  const gPneu = lathe(THREE, profil);
  // re-paramétrage de v (abscisse curviligne) : bande de roulement → [0,2 ; 0,8], flancs → [0 ; 0,2] et [0,8 ; 1]
  {
    const n = profil.length, abs = [0];
    for (let j = 1; j < n; j++) abs.push(abs[j - 1] + Math.hypot(profil[j][0] - profil[j - 1][0], profil[j][1] - profil[j - 1][1]));
    const zt = h * 0.55;
    let jA = 0, jB = n - 1;
    for (let j = 0; j < n; j++) if (profil[j][0] > R * 0.985 && profil[j][1] >= -zt - 1e-9) { jA = j; break; }
    for (let j = n - 1; j >= 0; j--) if (profil[j][0] > R * 0.985 && profil[j][1] <= zt + 1e-9) { jB = j; break; }
    const sA = abs[jA], sB = abs[jB], S = abs[n - 1];
    const v = abs.map((a) => a <= sA ? 0.2 * a / Math.max(sA, 1e-9) : a <= sB ? 0.2 + 0.6 * (a - sA) / Math.max(sB - sA, 1e-9) : 0.8 + 0.2 * (a - sB) / Math.max(S - sB, 1e-9));
    const uv = gPneu.attributes.uv;
    for (let i = 0; i <= K_SEG; i++) for (let j = 0; j < n; j++) uv.setY(i * n + j, v[j]);
    uv.needsUpdate = true;
  }
  const pneu = new THREE.Mesh(garde(gPneu), mat.pneu); pneu.name = 'pneu'; tourne.add(pneu);

  /* jante : lèvre chromée posée sur le talon, fût (gorge profonde) À L'INTÉRIEUR du talon, disque à rayons en retrait.
     Enfoncement de la face des rayons sous le flanc : 0,08 à 0,15 (unités scène), borné par la largeur du pneu. */
  const rj = rb * 0.95;                                           // rayon du fût : nettement sous le talon (aucune surface coïncidente)
  const enfonce = Math.min(Math.max(ep * 0.36, 0.08), 0.15, h * 0.8);
  const zLevre = h * 0.86, zFace = s * (h - enfonce);
  const creux = Math.max(zLevre - (h - enfonce), ep * 0.04);
  const fut = new THREE.Mesh(garde(new THREE.CylinderGeometry(rj, rj * 0.96, creux, K_SEG, 1, true)), mat.fut);
  fut.rotation.x = Math.PI / 2; fut.position.z = s * (zLevre - creux / 2); tourne.add(fut);
  // lèvre : tore à cheval sur l'arête talon/fût (intersection franche avec la gomme, pas de faces coplanaires)
  const tube = Math.max(rb - rj, ep * 0.04);
  const levre = new THREE.Mesh(garde(new THREE.TorusGeometry((rb + rj) / 2, tube * 0.75, 12, K_SEG)), mat.chrome);
  levre.position.z = s * zLevre; tourne.add(levre);
  if (lenticulaire) {
    const matCarbone = garde(new THREE.MeshPhysicalMaterial({ map: garde(texCarbone(THREE)), color: 0xd8dce6, roughness: 0.3, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, envMap: mat.chrome.envMap, envMapIntensity: 1.6 }));
    const disque = new THREE.Mesh(garde(new THREE.CylinderGeometry(rj * 0.99, rj * 0.99, ep * 0.1, K_SEG)), matCarbone);
    disque.rotation.x = Math.PI / 2; disque.position.z = s * h * 0.62; tourne.add(disque);
    const bombe = new THREE.Mesh(garde(new THREE.SphereGeometry(rj * 0.99, K_SEG, 10, 0, Math.PI * 2, 0, Math.PI / 5)), matCarbone);
    bombe.rotation.x = s * Math.PI / 2; bombe.scale.set(1, 0.35, 1); bombe.position.z = s * h * 0.66; tourne.add(bombe);
    const dos = new THREE.Mesh(garde(new THREE.CircleGeometry(rj * 0.99, K_SEG)), matCarbone);   // face intérieure du disque
    dos.position.z = -s * h * 0.62; if (s > 0) dos.rotation.y = Math.PI; tourne.add(dos);
  } else {
    const rayons = new THREE.Mesh(garde(new THREE.CircleGeometry(rj * 0.985, K_SEG)), mat.rayons);
    rayons.position.z = zFace; if (s < 0) rayons.rotation.y = Math.PI; tourne.add(rayons);
    if (!sansFrein) {                                           // disque de frein ventilé derrière les rayons
      const df = new THREE.Mesh(garde(new THREE.CylinderGeometry(rj * 0.74, rj * 0.74, ep * 0.07, K_SEG)), mat.frein);
      df.rotation.x = Math.PI / 2; df.position.z = zFace - s * ep * 0.12; tourne.add(df);
    }
    // voile de fond : ferme la roue côté intérieur (on ne voit plus à travers la jante)
    const zVoile = zFace - s * Math.min(ep * 0.24, h + (zFace * s) - ep * 0.04);
    const voile = new THREE.Mesh(garde(new THREE.CircleGeometry(rj * 0.99, K_SEG)), mat.voile || mat.fut);
    voile.position.z = zVoile; tourne.add(voile);
  }
  /* moyeu (teinte de la jante) + boulons + cache central chromés */
  const moyeu = new THREE.Mesh(garde(new THREE.CylinderGeometry(R * 0.15, R * 0.19, ep * 0.2, 32)), mat.moyeu || mat.chrome);
  moyeu.rotation.x = Math.PI / 2; moyeu.position.z = zFace + s * ep * 0.06; tourne.add(moyeu);
  const cache = new THREE.Mesh(garde(new THREE.SphereGeometry(R * 0.075, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat.chrome);
  cache.rotation.x = s * Math.PI / 2; cache.position.z = zFace + s * ep * 0.16; tourne.add(cache);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, b = new THREE.Mesh(garde(new THREE.CylinderGeometry(R * 0.024, R * 0.024, ep * 0.06, 6)), mat.boulon);
    b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * R * 0.115, Math.sin(a) * R * 0.115, zFace + s * ep * 0.17); tourne.add(b);
  }
  /* liseré de flanc : bande qui épouse EXACTEMENT le flanc bombé, décalée d'un cheveu + polygonOffset (fini le z-fighting) */
  if (flanc) {
    const ecart = Math.max(h * 0.012, 0.002), pts = [];
    for (let i = 0; i <= 6; i++) { const r = R * (flancR[0] + (flancR[1] - flancR[0]) * i / 6); pts.push([r, s * (zFlancPneu(demi, r) + ecart)]); }
    // marquage de flanc PEINT sur la gomme (mat, éclairé, jamais émissif) : c'est la livrée du jouet, pas un néon
    const fl = new THREE.Mesh(garde(lathe(THREE, pts)), garde(new THREE.MeshStandardMaterial({ color: new THREE.Color(flanc).convertSRGBToLinear(), roughness: 0.62, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    fl.name = 'marquage-flanc';
    tourne.add(fl);
  }
  if (main) {                                         // main courante (fauteuil) : anneau fin décalé vers l'extérieur
    const mc = new THREE.Mesh(garde(new THREE.TorusGeometry(R * 0.86, R * 0.022, 10, K_SEG)), mat.chrome); mc.position.z = s * (h + R * 0.09); tourne.add(mc);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, e = new THREE.Mesh(garde(new THREE.CylinderGeometry(R * 0.012, R * 0.012, R * 0.09, 6)), mat.chrome); e.rotation.x = Math.PI / 2; e.position.set(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, s * (h + R * 0.045)); tourne.add(e); }
  }

  /* étriers : fixes (contre-rotation exacte de la rotation de la roue), à cheval sur le bord du disque de frein,
     entièrement DANS le fût (ils traversaient le talon du pneu → arcs parasites). */
  const etriers = new THREE.Group(); pivot.add(etriers);
  if (!lenticulaire && !sansFrein) {
    const rDisque = rj * 0.74, a = 0.5, rc = rDisque * 0.94;
    const et = new THREE.Mesh(garde(new THREE.BoxGeometry(R * 0.13, R * 0.24, ep * 0.18)), mat.etrier);
    et.position.set(Math.cos(a) * rc, Math.sin(a) * rc, zFace - s * ep * 0.12); et.rotation.z = a; etriers.add(et);
    const vis = new THREE.Mesh(garde(new THREE.CylinderGeometry(R * 0.018, R * 0.018, ep * 0.2, 8)), mat.boulon); vis.rotation.x = Math.PI / 2;
    vis.position.set(Math.cos(a + 0.22) * rc, Math.sin(a + 0.22) * rc, zFace - s * ep * 0.12); etriers.add(vis);
  }
  return { pivot, tourne, etriers };
}

/* ------------------------------------------------------------------ fauteuil H01 */
const V = (THREE, x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Fauteuil roulant « supercar » complet. Renvoie { tuyaux... } ajoutés dans chassis. Paramètres :
 *   xAr (axe des grandes roues), xAv (axe des roulettes), Rg (grande roue), couleurs c (accent, caisse), code.
 */
export function construireFauteuil(THREE, { chassis, xAr, xAv, Rg, Rc, zGrand = 1.0, zRoulette = 0.6, c, code = 'H01', envMap = null, garde = (x) => x, animes = [] }) {
  const accent = new THREE.Color(c.accent || '#d4a017');
  const caisse = new THREE.Color(c.caisse || '#18191e');
  const titane = garde(new THREE.MeshStandardMaterial({ color: 0xaab1bb, roughness: 0.38, metalness: 1, map: garde(texBrosse(THREE)), envMap, envMapIntensity: 1.2 }));
  const matCarbone = garde(new THREE.MeshPhysicalMaterial({ map: garde(texCarbone(THREE)), roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMap, envMapIntensity: 1.1 }));
  const cuir = garde(new THREE.MeshPhysicalMaterial({ map: garde(texCapitonne(THREE, '#17181f', '#' + accent.getHexString())), roughness: 0.55, metalness: 0.05, envMap, envMapIntensity: 0.6 }));
  const matAccent = garde(new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.28, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.2 }));
  const matNoir = garde(new THREE.MeshStandardMaterial({ color: 0x14151b, roughness: 0.6, metalness: 0.4, envMap }));
  const led = garde(new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2.4), toneMapped: false }));
  const ledCyan = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#22d3ee').multiplyScalar(2.2), toneMapped: false }));
  const lumBlanche = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#f2f9ff').multiplyScalar(2.0), toneMapped: false }));
  const rouge = garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3d').multiplyScalar(2.2), toneMapped: false }));
  const verre = garde(new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, envMap }));
  const add = (m) => { chassis.add(m); return m; };
  const tube = (pts, r = 0.055, mat = titane, seg = 48) => {
    const courbe = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => V(THREE, x, y, z)), false, 'catmullrom', 0.35);
    return add(new THREE.Mesh(garde(new THREE.TubeGeometry(courbe, seg, r, 12, false)), mat));
  };
  const joint = (x, y, z, r = 0.075) => { const m = new THREE.Mesh(garde(new THREE.SphereGeometry(r, 16, 12)), titane); m.position.set(x, y, z); return add(m); };
  const boiteArr = (l, h, p, mat, x, y, z, rayon = 0.06) => {   // « boîte » aux arêtes adoucies : sphère écrasée + boîte (économique), ici boîte biseautée par géométrie
    const g = garde(new THREE.BoxGeometry(l, h, p, 2, 2, 2));
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {        // arrondit les arêtes : rapproche les sommets du « cœur » de la boîte
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      const ix = Math.abs(px) / (l / 2), iy = Math.abs(py) / (h / 2), iz = Math.abs(pz) / (p / 2);
      const n = (ix > 0.99) + (iy > 0.99) + (iz > 0.99);
      if (n >= 2) { const k = 1 - rayon * 0.9 / Math.max(l, h, p) * 3; pos.setXYZ(i, px * (ix > 0.99 ? 1 : k), py * (iy > 0.99 ? 1 : k), pz * (iz > 0.99 ? 1 : k)); }
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return add(m);
  };

  const ySiege = Rg * 1.28, xS = xAr + 0.05;                    // assise juste au-dessus de l'axe, légèrement en avant
  /* baquet : coque en sphère aplatie (assise) + dossier en demi-cylindre incliné */
  const assise = add(new THREE.Mesh(garde(new THREE.SphereGeometry(1, 40, 20)), cuir)); assise.scale.set(0.74, 0.19, 0.62); assise.position.set(xS + 0.12, ySiege, 0);
  const coque = add(new THREE.Mesh(garde(new THREE.CylinderGeometry(0.56, 0.56, 0.1, 40, 1, true, Math.PI * 0.12, Math.PI * 1.76)), matCarbone)); coque.scale.set(1, 1, 1); coque.rotation.set(Math.PI / 2, 0, 0); coque.position.set(xS + 0.1, ySiege + 0.02, 0); coque.visible = false;
  const dossier = add(new THREE.Mesh(garde(new THREE.CylinderGeometry(0.55, 0.55, 0.92, 40, 1, true, Math.PI * 0.62, Math.PI * 0.76)), cuir)); dossier.material = cuir; dossier.material.side = THREE.DoubleSide;
  dossier.rotation.set(0, Math.PI / 2 + Math.PI * 0.0, -0.2); dossier.rotation.order = 'YXZ'; dossier.position.set(xS - 0.46, ySiege + 0.52, 0); dossier.rotation.set(0, -Math.PI / 2 + Math.PI, 0.18);
  for (const z of [-0.5, 0.5]) { const b = add(new THREE.Mesh(garde(new THREE.SphereGeometry(1, 28, 12)), matCarbone)); b.scale.set(0.5, 0.12, 0.09); b.position.set(xS + 0.1, ySiege + 0.12, z * 1.0); }   // joues du baquet
  const appui = add(new THREE.Mesh(garde(new THREE.SphereGeometry(1, 28, 16)), cuir)); appui.scale.set(0.12, 0.2, 0.26); appui.position.set(xS - 0.52, ySiege + 1.0, 0);   // appui-tête
  const plaque = add(new THREE.Mesh(garde(new THREE.PlaneGeometry(0.34, 0.2)), garde(new THREE.MeshBasicMaterial({ map: garde(new THREE.CanvasTexture(canvas(256, 150, (g, w, h) => { g.fillStyle = '#' + accent.getHexString(); g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '900 100px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(code, w / 2, h / 2 + 4); }))), toneMapped: false }))));
  plaque.position.set(xS - 0.58, ySiege + 0.55, 0); plaque.rotation.y = -Math.PI / 2; plaque.rotation.z = 0; plaque.visible = true;

  /* cadre tubulaire titane : longerons, haubans, montants de dossier avec poignées, fourche avant */
  for (const z of [-0.5, 0.5]) {
    tube([[xAr - 0.15, Rg * 1.0, z * 1.4], [xAr + 0.05, ySiege - 0.22, z], [xAr + 0.6, ySiege - 0.26, z * 0.95], [xAv - 0.4, Rc * 2.6, z * 1.05], [xAv - 0.05, Rc * 1.7, z * 1.1]], 0.055);     // longeron
    tube([[xAr - 0.4, ySiege + 0.08, z * 0.98], [xAr - 0.48, ySiege + 0.7, z * 0.92], [xAr - 0.58, ySiege + 1.12, z * 0.88], [xAr - 0.78, ySiege + 1.16, z * 0.88]], 0.05);          // montant + poignée
    tube([[xAr + 0.5, ySiege - 0.05, z * 0.98], [xAr + 0.62, ySiege + 0.2, z * 1.02], [xAr + 0.2, ySiege + 0.34, z * 1.02]], 0.04);                                                        // accoudoir
    joint(xAr + 0.05, ySiege - 0.22, z); joint(xAr + 0.6, ySiege - 0.26, z * 0.95);
    tube([[xAr + 0.05, ySiege - 0.22, z], [xAr - 0.05, Rg * 0.9, z * 1.7]], 0.05);                                                                                                    // support de moteur de roue
    tube([[xAv - 0.05, Rc * 1.7, z * 1.1], [xAv, Rc * 1.1, z * zRoulette * 1.1]], 0.04);                                                                                              // fourche de roulette
  }
  tube([[xAr - 0.42, ySiege + 0.05, -0.8], [xAr - 0.48, ySiege + 0.08, 0], [xAr - 0.42, ySiege + 0.05, 0.8]], 0.045);                                                                    // traverse arrière
  tube([[xAr + 0.62, ySiege - 0.28, -0.5], [xAr + 0.72, ySiege - 0.3, 0], [xAr + 0.62, ySiege - 0.28, 0.5]], 0.045);

  /* repose-pieds : plateau carbone + deux tubes, garde-boue de roulette */
  boiteArr(0.62, 0.05, 0.9, matCarbone, xAv + 0.12, Rc * 1.15 + 0.05, 0, 0.04);
  for (const z of [-0.3, 0.3]) tube([[xAr + 0.9, ySiege - 0.3, z], [xAv - 0.2, Rc * 2.0, z * 1.1], [xAv + 0.1, Rc * 1.2 + 0.05, z]], 0.04);
  const bande = add(new THREE.Mesh(garde(new THREE.BoxGeometry(0.62, 0.012, 0.06)), led)); bande.position.set(xAv + 0.12, Rc * 1.15 + 0.08, 0.38);
  const bande2 = bande.clone(); bande2.position.z = -0.38; add(bande2);

  /* pupitre de commande : coffre sur l'accoudoir droit, manche à bille, mini-écran holographique */
  const zP = 0.62, xP = xAr + 0.36, yP = ySiege + 0.38;
  boiteArr(0.34, 0.13, 0.3, matNoir, xP, yP, zP, 0.05);
  tube([[xP, yP + 0.06, zP + 0.02], [xP + 0.02, yP + 0.22, zP + 0.02]], 0.022, titane, 12);
  const bille = add(new THREE.Mesh(garde(new THREE.SphereGeometry(0.06, 20, 14)), matAccent)); bille.position.set(xP + 0.02, yP + 0.27, zP + 0.02);
  const ecranTex = garde(new THREE.CanvasTexture(canvas(256, 128, (g, w, h) => {
    g.fillStyle = '#04141a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#22d3ee'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#22d3ee'; g.font = '700 22px Consolas, monospace'; g.fillText('H01  TURBO', 14, 32); g.font = '900 52px Consolas, monospace'; g.fillText('88', 16, 92);
    g.fillRect(100, 70, 130, 12); g.fillStyle = '#' + accent.getHexString(); g.fillRect(100, 70, 96, 12); g.fillStyle = '#22d3ee'; g.font = '700 18px Consolas, monospace'; g.fillText('km/h  ▮▮▮▮▯', 100, 108);
  })));
  const ecran = add(new THREE.Mesh(garde(new THREE.PlaneGeometry(0.28, 0.14)), garde(new THREE.MeshBasicMaterial({ map: ecranTex, toneMapped: false, transparent: true, opacity: 0.95 }))));
  ecran.position.set(xP - 0.1, yP + 0.2, zP - 0.06); ecran.rotation.set(0, -Math.PI / 2 + 0.0, 0); ecran.rotation.y = Math.PI / 2; ecran.rotation.x = -0.35; ecran.rotation.order = 'YXZ';
  const halo = add(new THREE.Mesh(garde(new THREE.PlaneGeometry(0.34, 0.18)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#22d3ee').multiplyScalar(0.9), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))));
  halo.position.copy(ecran.position); halo.rotation.copy(ecran.rotation); halo.position.x += 0.005;
  animes.push((t) => { ecran.material.opacity = 0.82 + Math.sin(t * 7) * 0.1; halo.material.opacity = 0.1 + Math.sin(t * 5) * 0.04; });

  /* bloc batterie sous l'assise (arrière) : coque carbone, grille, bandeau LED */
  boiteArr(0.78, 0.28, 0.86, matCarbone, xAr - 0.18, ySiege - 0.42, 0, 0.06);
  for (const z of [-0.435, 0.435]) {
    const b = add(new THREE.Mesh(garde(new THREE.BoxGeometry(0.6, 0.03, 0.012)), led)); b.position.set(xAr - 0.18, ySiege - 0.42, z);
    for (let i = 0; i < 5; i++) { const g = add(new THREE.Mesh(garde(new THREE.BoxGeometry(0.04, 0.12, 0.012)), matNoir)); g.position.set(xAr - 0.36 + i * 0.09, ySiege - 0.5, z * 1.0); }
  }
  const texLueur = garde(new THREE.CanvasTexture(canvas(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); })));
  const sousLueur = add(new THREE.Mesh(garde(new THREE.PlaneGeometry(3.4, 2.4)), garde(new THREE.MeshBasicMaterial({ map: texLueur, color: accent.clone(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))));
  sousLueur.rotation.x = -Math.PI / 2; sousLueur.position.set(xAr + 0.2, 0.012, 0);          // lueur néon sous le châssis (reflet sur le sol)
  chassis.userData.sousLueur = sousLueur;

  /* turbine discrète + feux arrière */
  const tur = add(new THREE.Mesh(garde(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 28, 1, true)), matNoir)); tur.rotation.z = Math.PI / 2; tur.position.set(xAr - 0.72, ySiege - 0.3, 0);
  const pales = new THREE.Group(); pales.position.set(xAr - 0.62, ySiege - 0.3, 0); add(pales);
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(garde(new THREE.BoxGeometry(0.01, 0.15, 0.04)), titane); p.rotation.x = i / 7 * Math.PI * 2; p.position.set(0, Math.cos(i / 7 * Math.PI * 2) * 0.07, Math.sin(i / 7 * Math.PI * 2) * 0.07); p.rotation.x = i / 7 * Math.PI * 2; pales.add(p); }
  const feuTur = add(new THREE.Mesh(garde(new THREE.CircleGeometry(0.14, 20)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a1a').multiplyScalar(2.2), toneMapped: false }))));
  feuTur.rotation.y = -Math.PI / 2; feuTur.position.set(xAr - 0.9, ySiege - 0.3, 0);
  animes.push((t, dt, v) => { pales.rotation.x += dt * (20 + Math.abs(v) * 14); feuTur.scale.setScalar(0.85 + Math.sin(t * 38) * 0.12 + Math.min(0.5, Math.abs(v) * 0.05)); });
  for (const z of [-0.36, 0.36]) { const f = add(new THREE.Mesh(garde(new THREE.BoxGeometry(0.03, 0.05, 0.16)), rouge)); f.position.set(xAr - 0.52, ySiege + 0.22, z * 1.0 + (z > 0 ? 0.1 : -0.1)); }

  /* phare à lentille (sur la fourche, devant) : boîtier, verre bombé, réflecteur, anneau chromé — AUCUN sprite */
  const xPh = xAv + 0.22, yPh = Rc * 2.6 + 0.12;
  const boitier = add(new THREE.Mesh(garde(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 28)), matNoir)); boitier.rotation.z = Math.PI / 2; boitier.position.set(xPh, yPh, 0);
  const verrePh = add(new THREE.Mesh(garde(new THREE.SphereGeometry(0.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), verre)); verrePh.rotation.z = -Math.PI / 2; verrePh.position.set(xPh + 0.08, yPh, 0);
  const lentille = add(new THREE.Mesh(garde(new THREE.CircleGeometry(0.075, 24)), lumBlanche)); lentille.rotation.y = Math.PI / 2; lentille.position.set(xPh + 0.085, yPh, 0);
  const anneau = add(new THREE.Mesh(garde(new THREE.TorusGeometry(0.105, 0.012, 8, 32)), garde(new THREE.MeshStandardMaterial({ color: 0xe6e9ef, roughness: 0.06, metalness: 1, envMap })))); anneau.rotation.y = Math.PI / 2; anneau.position.set(xPh + 0.085, yPh, 0);
  const veilleuses = [];
  for (const z of [-0.2, 0.2]) { const v = add(new THREE.Mesh(garde(new THREE.BoxGeometry(0.04, 0.03, 0.14)), ledCyan)); v.position.set(xPh + 0.02, yPh - 0.12, z); veilleuses.push(v); }
  chassis.userData.lumieres = { lentille, veilleuses, lumBlanche, led, ledCyan };

  /* roulettes antibascule arrière (petites roues qui tournent avec la vitesse) */
  const antibascule = [];
  for (const z of [-0.85, 0.85]) {
    tube([[xAr - 0.4, ySiege - 0.2, z * 0.9], [xAr - 0.9, 0.5, z], [xAr - 1.02, 0.26, z]], 0.035);
    const r = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32)), matNoir); r.rotation.x = Math.PI / 2; r.position.set(xAr - 1.02, 0.15, z); add(r); antibascule.push(r);
    const cap = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 20)), matAccent); cap.rotation.x = Math.PI / 2; cap.position.copy(r.position); add(cap); antibascule.push(cap);
  }
  animes.push((t, dt, v) => { for (const r of antibascule) r.rotation.y -= v * dt / 0.15; });
  /* garde-boue (arche demi-tore) au-dessus de chaque grande roue */
  for (const z of [-1, 1]) {
    const gb = add(new THREE.Mesh(garde(new THREE.TorusGeometry(Rg * 1.1, 0.05, 12, 48, Math.PI * 0.85)), matAccent));
    gb.rotation.z = Math.PI * 0.075; gb.position.set(xAr, Rg, z * (zGrand + 0.02));
    const jupe = add(new THREE.Mesh(garde(new THREE.RingGeometry(Rg * 1.06, Rg * 1.14, 48, 1, Math.PI * 0.075, Math.PI * 0.85)), garde(new THREE.MeshStandardMaterial({ color: caisse, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide, envMap }))));
    jupe.position.set(xAr, Rg, z * (zGrand + 0.02));
  }
  return { titane, matAccent, led, ledCyan, lumBlanche, hauteurSiege: ySiege };
}

/* ------------------------------------------------------------------ locomotive H12 « La Grève » (d'après la miniature réelle)
   Silhouette carénée gris anthracite, nez en bulle, cabine arrière à toit étagé débordant et deux fentes de vitre,
   quatre coupelles chromées alignées sur le dos de la chaudière, filet rouge et éclair argenté avec le « 700 »,
   grille d'aération sur l'avant, petit phare annulaire, bloc mécanique chromé (disque moteur, bielles, boîte de
   cylindres) entre deux grandes roues noires à anneau rouge. Deux essieux seulement.
   Repère : avant = +x, sol y = 0. xr : abscisse de l'arrière, L : longueur totale. */
export function construireLocomotive(THREE, { chassis, xr, L, envMap = null, garde = (x) => x, animes = [], c = {} }) {
  const u = (f) => xr + f * L;                                   // abscisse à la fraction f de la longueur
  const W = 1.78;                                                // largeur de la caisse
  const gris = new THREE.Color('#2a2d34');
  const rouge = new THREE.Color('#c8372d');
  const vernis = { clearcoat: 1, clearcoatRoughness: 0.07, envMap, envMapIntensity: 1.25 };
  const matCaisse = garde(new THREE.MeshPhysicalMaterial({ color: gris, roughness: 0.26, metalness: 0.55, ...vernis }));
  const matSombre = garde(new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 0.55, metalness: 0.35, envMap }));
  const matChrome = garde(new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.12, metalness: 0.85, emissive: 0x2a2e36, envMap, envMapIntensity: 1.9 }));
  const matRouge = garde(new THREE.MeshPhysicalMaterial({ color: rouge, roughness: 0.35, metalness: 0.3, ...vernis }));
  const add = (m) => { chassis.add(m); return m; };
  const boite = (l, h, p, mat, x, y, z) => { const m = new THREE.Mesh(garde(new THREE.BoxGeometry(l, h, p)), mat); m.position.set(x, y, z); return add(m); };

  /* 1. caisse : profil latéral extrudé (cabine, dos plat, nez en bulle qui plonge), arêtes adoucies */
  const pts = [[0.0, 1.022], [0.0, 1.957], [0.8, 2.0], [0.88, 1.942], [0.95, 1.798], [0.99, 1.583], [1.0, 1.331], [0.995, 1.115], [0.97, 1.022], [0.93, 0.95], [0.0, 0.95]];
  const forme = new THREE.Shape();
  pts.forEach(([f, y], i) => (i ? forme.lineTo(u(f), y) : forme.moveTo(u(f), y)));
  forme.closePath();
  const geoCaisse = garde(new THREE.ExtrudeGeometry(forme, { depth: W, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.16, bevelSegments: 5, curveSegments: 10, steps: 1 }));
  geoCaisse.translate(0, 0, -W / 2);
  add(new THREE.Mesh(geoCaisse, matCaisse));
  // dos de la chaudière : demi-cylindre plus étroit qui court sur la caisse (la bosse sur laquelle sont les coupelles)
  const dos = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.5, 0.56, L * 0.6, 40)), matCaisse);
  dos.rotation.z = Math.PI / 2; dos.scale.set(1, 1, 1.0); dos.position.set(u(0.5), 1.55, 0); add(dos);
  const coiffe = new THREE.Mesh(garde(new THREE.SphereGeometry(0.7, 32, 18)), matCaisse); coiffe.scale.set(1.5, 0.8, 0.95); coiffe.position.set(u(0.8), 1.5, 0); add(coiffe);
  // nez : bulle qui plonge vers l'avant (calotte + joue)
  const nez = new THREE.Mesh(garde(new THREE.SphereGeometry(0.95, 36, 20)), matCaisse); nez.scale.set(1.2, 1.0, 0.86); nez.position.set(u(0.935), 1.38, 0); add(nez);

  /* 2. cabine : toit étagé qui déborde, fentes de vitre */
  const toit = [[0.248, -0.03, 2.03], [0.228, -0.012, 2.1], [0.208, 0.006, 2.17], [0.188, 0.024, 2.24]];
  for (const [l, dx, y] of toit) { const s = boite(l * L, 0.09, W * 1.04, matCaisse, u(0.0 + dx + l / 2), y, 0); s.rotation.z = 0.0; }
  for (let i = 0; i < 5; i++) boite(0.2 * L, 0.02, W * 1.0, matSombre, u(0.11), 2.0 + i * 0.05, 0).scale.set(0.9, 1, 1);
  boite(0.012 * L, 0.5, W * 1.0, matSombre, u(-0.012), 1.6, 0);                         // arrière de cabine (rainures)
  for (const z of [-1, 1]) for (const [a, b] of [[0.02, 0.07], [0.085, 0.155]]) {       // deux fentes de vitre de chaque côté
    const f = boite((b - a) * L, 0.34, 0.06, garde(new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.2, metalness: 0.6, envMap })), u((a + b) / 2), 1.62, z * (W / 2 + 0.17));
    const v = boite((b - a) * L * 0.6, 0.18, 0.02, matChrome, u((a + b) / 2) + 0.05, 1.6, z * (W / 2 + 0.2)); v.visible = true;
  }

  /* 3. dos de chaudière : quatre coupelles chromées alignées (photo : x ≈ 0,31 / 0,37 / 0,43 / 0,50) */
  for (const f of [0.306, 0.37, 0.434, 0.495]) {
    const cuve = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 36)), matChrome); cuve.position.set(u(f), 2.2, 0.0); add(cuve);
    const bague = new THREE.Mesh(garde(new THREE.TorusGeometry(0.22, 0.05, 12, 40)), matChrome); bague.rotation.x = Math.PI / 2; bague.position.set(u(f), 2.27, 0); add(bague);
    const fond = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32)), matSombre); fond.position.set(u(f), 2.28, 0); add(fond);
  }
  // les coupelles sont posées sur le dos : on remonte le dos de chaudière pour qu'elles ne flottent pas
  dos.position.y = 1.56;

  /* 4. filets rouges, éclair argenté et numéro (décalcomanie transparente sur chaque flanc) */
  const decal = (() => {
    const cv = document.createElement('canvas'); cv.width = 1536; cv.height = 256; const g = cv.getContext('2d');
    g.clearRect(0, 0, 1536, 256);
    g.fillStyle = '#d83a2e'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 340, 190); g.lineTo(340 + i * 340, 150); g.lineTo(300 + i * 340, 205); g.closePath(); g.fill(); }
    g.strokeStyle = '#eef1f6'; g.lineWidth = 16; g.lineJoin = 'miter';
    g.beginPath(); g.moveTo(30, 60); g.lineTo(540, 60); g.lineTo(440, 150); g.lineTo(980, 150); g.lineTo(880, 70); g.lineTo(1500, 70); g.stroke();
    g.beginPath(); g.moveTo(420, 210); g.lineTo(1100, 210); g.lineTo(1000, 150); g.stroke();
    g.fillStyle = '#eef1f6'; g.font = '900 78px Arial Black, Arial, sans-serif'; g.fillText('700', 1180, 150);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  })();
  garde(decal);
  const matDecal = garde(new THREE.MeshBasicMaterial({ map: decal, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  for (const z of [-1, 1]) {
    const d = new THREE.Mesh(garde(new THREE.PlaneGeometry(0.55 * L, 0.55 * L * 256 / 1536)), matDecal);
    d.position.set(u(0.62), 1.6, z * (W / 2 + 0.17)); if (z < 0) d.rotation.y = Math.PI; add(d);
    boite(0.94 * L, 0.035, 0.03, matRouge, u(0.47), 1.13, z * (W / 2 + 0.165));                                   // filet rouge de bas de caisse
    boite(0.6 * L, 0.02, 0.03, matRouge, u(0.33), 1.22, z * (W / 2 + 0.165));
  }
  // éclair sur le toit de cabine
  const eclair = new THREE.Mesh(garde(new THREE.PlaneGeometry(0.5, 0.3)), garde(new THREE.MeshBasicMaterial({ map: garde(new THREE.CanvasTexture((() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 12; g.beginPath(); g.moveTo(30, 100); g.lineTo(110, 24); g.lineTo(140, 80); g.lineTo(226, 20); g.stroke(); return cv; })())), transparent: true, toneMapped: false })));
  eclair.rotation.x = -Math.PI / 2; eclair.position.set(u(0.095), 2.27, 0); add(eclair);

  /* 5. avant : phare annulaire, grille d'aération du nez */
  const bague = new THREE.Mesh(garde(new THREE.TorusGeometry(0.2, 0.06, 14, 40)), matChrome); bague.rotation.y = Math.PI / 2; bague.position.set(u(1.0) + 0.2, 1.45, 0); add(bague);
  const lent = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 28)), garde(new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6').multiplyScalar(1.4), toneMapped: false }))); lent.rotation.z = Math.PI / 2; lent.position.set(u(1.0) + 0.2, 1.45, 0); add(lent);
  for (const z of [-1, 1]) for (let i = 0; i < 5; i++) { const g = boite(0.015 * L, 0.07, 0.34, matSombre, u(0.935 - i * 0.012), 1.1 - i * 0.07, z * 0.58); g.rotation.z = -0.5; g.rotation.y = z * 0.0; }
  for (let i = 0; i < 5; i++) boite(0.18, 0.06, 0.34 - i * 0.03, matSombre, u(0.985) + 0.03 - i * 0.02, 1.0 + i * 0.07, 0).rotation.z = 0.0;

  /* 6. mécanique chromée apparente (côté droit et gauche) : disque moteur, bielles, boîte de cylindres, carter */
  const tournants = [];
  for (const z of [-1, 1]) {
    const zm = z * 1.12;
    const disque = new THREE.Group(); disque.position.set(u(0.43), 0.68, zm); add(disque);
    const dis = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.58, 0.58, 0.09, 40)), matChrome); dis.rotation.x = Math.PI / 2; disque.add(dis);
    const bombe = new THREE.Mesh(garde(new THREE.SphereGeometry(0.5, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2)), matChrome); bombe.rotation.x = Math.PI / 2 * z; bombe.scale.set(1, 0.3, 1); bombe.position.z = z * 0.045; disque.add(bombe);
    for (const a of [0, 1.05, 2.1, 3.15, 4.2, 5.25]) { const t = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 10)), matSombre); t.rotation.x = Math.PI / 2; t.position.set(Math.cos(a) * 0.35, Math.sin(a) * 0.35, z * 0.05); disque.add(t); }
    const maneton = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 14)), matChrome); maneton.rotation.x = Math.PI / 2; maneton.position.set(0.3, 0, z * 0.13); disque.add(maneton);
    tournants.push({ disque, maneton, z });
    const bielle = new THREE.Group(); bielle.position.set(u(0.43), 0.68, zm + z * 0.16); add(bielle);
    const b1 = new THREE.Mesh(garde(new THREE.BoxGeometry(1.7, 0.1, 0.045)), matChrome); b1.position.set(0.85, 0, 0); bielle.add(b1);
    const b2 = new THREE.Mesh(garde(new THREE.BoxGeometry(1.7, 0.07, 0.04)), matChrome); b2.position.set(0.85, 0.15, z * 0.03); bielle.add(b2);
    for (const x of [0.15, 0.95, 1.55]) { const r = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 16)), matChrome); r.rotation.x = Math.PI / 2; r.position.set(x, 0, z * 0.03); bielle.add(r); }
    tournants[tournants.length - 1].bielle = bielle;
    boite(0.62, 0.95, 0.5, matChrome, u(0.62), 0.76, zm);                                           // boîte de cylindres (carter chromé)
    boite(0.26, 0.5, 0.5, matChrome, u(0.57), 0.62, zm);
    boite(0.5, 0.18, 0.46, matChrome, u(0.64), 1.1, zm);
    const rainure = boite(0.5, 0.04, 0.02, matSombre, u(0.62), 0.95, zm + z * 0.26); rainure.visible = true;
  }
  boite(0.84 * L, 0.34, 1.5, matSombre, u(0.46), 0.8, 0);
  for (const z of [-1, 1]) {                                                                    // longerons chromés du châssis, visibles sous la caisse
    boite(0.86 * L, 0.2, 0.08, matChrome, u(0.46), 0.66, z * 0.8);
    boite(0.86 * L, 0.06, 0.18, matChrome, u(0.46), 0.52, z * 0.8);
  }                                              // dessous sombre entre les deux flancs
  // animation : le disque tourne avec l'avancée et la bielle suit la manivelle
  const RAYON = 0.5;
  animes.push((t, dt, v) => {
    for (const d of tournants) {
      d.disque.rotation.z -= v * dt / RAYON;
      const a = d.disque.rotation.z;                                                              // position du maneton dans le repère de la caisse
      const mx = Math.cos(a) * 0.3, my = Math.sin(a) * 0.3;
      d.bielle.position.x = u(0.43) + mx; d.bielle.position.y = 0.68 + my * 0.3; d.bielle.rotation.z = Math.atan2(my, 1.5) * 0.4 * (my > 0 ? 1 : 1);
    }
  });
  return { x1: u(0.21), x2: u(0.79), R: 0.64, zRoue: 1.12, ep: 0.52 };
}

/* ------------------------------------------------------------------ galbe : transforme une extrusion « boîte » en vraie carrosserie (plan en plan, fruit des flancs, bombé du capot et du toit) */
export function galber(THREE, geo, o = {}) {
  // défauts « carrosserie musclée » : nez et poupe arrondis en plan, flancs pincés vers le haut (fruit), dôme marqué du capot et du toit (bombe)
  const { avant = 0.45, arriere = 0.35, lAv = 0.32, lAr = 0.28, fruit = 0.30, bombe = 0.22, forceArrondi = 1.8 } = o;
  geo.computeBoundingBox();
  const b = geo.boundingBox, xa = b.min.x, xf = b.max.x, yb = b.min.y, yh = b.max.y, zm = Math.max(b.max.z, 1e-3);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = (x - xa) / (xf - xa), v = (y - yb) / Math.max(1e-3, yh - yb);
    const tf = Math.max(0, (u - (1 - lAv)) / lAv), tr = Math.max(0, (lAr - u) / lAr);
    const sPlan = (1 - avant * Math.pow(tf, forceArrondi)) * (1 - arriere * Math.pow(tr, 2));
    const sFruit = 1 - fruit * v * v;
    const zn = z / zm;
    p.setXYZ(i, x, y + bombe * (yh - yb) * v * v * (1 - zn * zn), z * sPlan * sFruit);
  }
  geo.computeVertexNormals();
  return lisser(THREE, geo, 42);
}

/** Normales lissées : moyenne des faces voisines (même position) dont l'angle reste sous le seuil ; les arêtes franches restent vives. */
export function lisser(THREE, geo, seuilDeg = 40) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, n = p.count, fn = new Float32Array(n * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);                     // aire pondérée
    for (let k = 0; k < 3; k++) { fn[(i + k) * 3] = ab.x; fn[(i + k) * 3 + 1] = ab.y; fn[(i + k) * 3 + 2] = ab.z; }
  }
  const cle = (i) => Math.round(p.getX(i) * 400) + ',' + Math.round(p.getY(i) * 400) + ',' + Math.round(p.getZ(i) * 400);
  const groupes = new Map();
  for (let i = 0; i < n; i++) { const k = cle(i); (groupes.get(k) || groupes.set(k, []).get(k)).push(i); }
  const cs = Math.cos(seuilDeg * Math.PI / 180), out = new Float32Array(n * 3);
  const l = (i) => Math.hypot(fn[i * 3], fn[i * 3 + 1], fn[i * 3 + 2]) || 1;
  for (const idx of groupes.values()) {
    for (const i of idx) {
      let sx = 0, sy = 0, sz = 0; const li = l(i);
      for (const j of idx) {
        const d = (fn[i * 3] * fn[j * 3] + fn[i * 3 + 1] * fn[j * 3 + 1] + fn[i * 3 + 2] * fn[j * 3 + 2]) / (li * l(j));
        if (d >= cs) { sx += fn[j * 3]; sy += fn[j * 3 + 1]; sz += fn[j * 3 + 2]; }
      }
      const m = Math.hypot(sx, sy, sz) || 1; out[i * 3] = sx / m; out[i * 3 + 1] = sy / m; out[i * 3 + 2] = sz / m;
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return g;
}
