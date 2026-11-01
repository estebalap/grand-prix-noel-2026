/* TÉLÉPHONE 3D du plan « paris » de la V9 Ring (clés dans plan_v9.json → "telephone" ; aujourd'hui film 75 → 84,5 s, intégré au
   segment arène par seg_arene.js).

   Voix off : « Sur votre téléphone : suivez la soirée, pariez avec les cotes, cumulez des points… et ouvrez des lootbox.
               Des bonus… ou de quoi détruire vos adversaires. »

   L'écran REPREND LA VRAIE PAGE Pocket Pit (/pit/) en mode connecté : captures Playwright faites par
   outils_v9/capturer_pit.js (relais simulé) et rangées dans data/telephone/ (+ index.json : zones utiles en px de capture).
   L'écran est une CanvasTexture recomposée à chaque maj(t) — « caméra virtuelle » qui glisse et zoome dans les captures.
   TOUS les instants dérivent des clés du plan (debut, pari, points, lootbox, bonus, piege, fin) — aucun temps absolu codé en dur :
     debut → debut + 0,75     écran Piste (Bourse ouverte), défilement doux jusqu'aux 5 voies et à leurs cotes
     pari − 0,75              tap (anneau lumineux) sur la Mégane → la voie s'illumine (2ᵉ capture réelle)
     pari − 0,62 → pari       défilement vers « PLACER LA MISE », tap à « pari » → toast « Mise placée » + ligne « Mes paris »
     pari + 0,6 → lootbox − 0,5  Résultat : VICTOIRE ! puis zoom sur le porte-monnaie qui compte de 50 à 245 pièces (dès « points »,
                    en 0,7 s ; 9 captures réelles du bandeau, une par valeur publiée par le relais)
     lootbox − 0,5 → lootbox  Arsenal › Caisses, glissement vers la caisse BONUS « Marché Noir », tap à « lootbox »
     lootbox + 0,05 → bonus   roulette de la caisse (3 captures réelles + filé horizontal de la bande)
     bonus                    révélation dorée : Étoile d'Invincibilité (légendaire), éclair or
     piege − 0,18 → piege     caisse PIÈGES : Bascule Hazzard (épique) ; tap « Utiliser » à « piege » → le piège QUITTE L'ÉCRAN en
                    comète 3D rouge (icône réelle + traînée) qui file hors cadre ; onde rouge sur l'écran
     piege + 0,35 → fin       « Sur la voie de qui ? » : tap (piege + 0,65) sur la voie de la Batmobile (l'adversaire), pulsation rouge
   Contrôlé à l'image sur la plage 75 → 84,5 s : 75,5 piste, 77,5 mise placée, 79,0 porte-monnaie, 80,6 roulette, 81,7 bonus,
   83,0 piège, 84,2 cible (aucune page d'erreur du relais).

   API (imposée) : creerTelephone(ctx) → { groupe, maj(t), hud(t), liberer() }
     groupe : téléphone en cm, centré à l'origine, écran vers +z, 15,8 × 7,4 × 0,8 cm (la comète part dans ce repère) ;
     maj(t) : t = temps FILM, fonction PURE (rien ne dépend de l'image précédente) ; hors [debut, fin] : état du début ;
     hud(t) : null (la voix off suffit) ; liberer() : libère géométries, matériaux et textures.
   Règles : three.js r128 global (ctx.THREE), 1 unité = 1 cm, aucun aléa, écran MeshBasicMaterial toneMapped:false. */

const CORPS = { l: 7.4, h: 15.8, e: 0.8, r: 1.12 };
const ECRAN = { l: 6.96, h: 15.36, r: 0.86 };
const TOILE = { l: 720, h: 1590, barre: 56 };                       // toile de l'écran (rapport = celui de la dalle)
const ZONE_H = TOILE.h - TOILE.barre;                               // hauteur utile sous la barre d'état
const IMAGES = ['paris_a', 'paris_b', 'paris_c', 'resultat', 'bourse', 'caisses', 'roulette_1', 'roulette_2', 'roulette_3', 'bonus', 'piege', 'cible'];
const BANDE_ROULETTE = [672, 1004];                                  // bande des cartes de la roulette (px de capture)
const T_DEFAUT = { debut: 75.0, fin: 84.5, pari: 77.4, points: 78.9, lootbox: 80.5, bonus: 81.6, piege: 82.9 };   // repli seulement : plan_v9.json fait foi

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smoother = (u) => { const k = clamp(u); return k * k * k * (k * (k * 6 - 15) + 10); };
const doux = (u) => { const k = clamp(u); return k * k * (3 - 2 * k); };

function formeArrondie(THREE, l, h, r, trou = null) {
  const s = new THREE.Shape(), x = -l / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + l - r, y); s.quadraticCurveTo(x + l, y, x + l, y + r); s.lineTo(x + l, y + h - r); s.quadraticCurveTo(x + l, y + h, x + l - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  if (trou) s.holes.push(trou);
  return s;
}
/** ShapeGeometry dont les UV couvrent [0,1]² sur la boîte de la forme (la texture d'écran épouse les coins arrondis). */
function geoDalle(THREE, l, h, r) {
  const g = new THREE.ShapeGeometry(formeArrondie(THREE, l, h, r), 14), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / l + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true; return g;
}
function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rectArrondi(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function chargerImage(url) {
  return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error('téléphone V9 : image introuvable ' + url)); im.src = url; });
}

export async function creerTelephone(ctx) {
  const THREE = ctx.THREE;
  const T = { ...T_DEFAUT, ...((ctx.plan && ctx.plan.telephone) || {}) };
  const groupe = new THREE.Group(); groupe.name = 'telephone-v9';
  const aLiberer = [];
  const garder = (o) => { aLiberer.push(o); return o; };

  /* ───────────────────────── données : captures réelles du Pocket Pit ───────────────────────── */
  const url = (f) => new URL('./data/telephone/' + f, import.meta.url).href;
  const index = await (await fetch(url('index.json'))).json();
  const img = {};
  await Promise.all(IMAGES.map(async (n) => { img[n] = await chargerImage(url(index.captures[n].fichier)); }));
  const Z = (n, k) => index.captures[n].zones[k];
  const centre = (z) => [z[0] + z[2] / 2, z[1] + z[3] / 2];
  const B = index.bourse;                                             // bandeau du porte-monnaie : valeurs empilées

  /* ───────────────────────── le téléphone ───────────────────────── */
  const env = ctx.envMap || null;
  const metal = garder(new THREE.MeshStandardMaterial({ color: 0xb9bcc6, metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 1.25 }));
  const dosVerre = garder(new THREE.MeshPhysicalMaterial({ color: 0x2a1d4a, metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: 0.9 }));
  const noir = garder(new THREE.MeshStandardMaterial({ color: 0x030306, metalness: 0.3, roughness: 0.25, envMap: env, envMapIntensity: 0.6 }));
  // cadre métallique : anneau extrudé à bords arrondis (le flanc visible du téléphone)
  const epCadre = CORPS.e - 0.16;
  const trou = formeArrondie(THREE, CORPS.l - 0.5, CORPS.h - 0.5, CORPS.r - 0.22);
  const geoCadre = garder(new THREE.ExtrudeGeometry(formeArrondie(THREE, CORPS.l - 0.16, CORPS.h - 0.16, CORPS.r - 0.06, new THREE.Path(trou.getPoints(24).reverse())),
    { depth: epCadre, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 18 }));
  geoCadre.translate(0, 0, -epCadre / 2);
  groupe.add(new THREE.Mesh(geoCadre, metal));
  // âme + face arrière en verre teinté
  const geoAme = garder(new THREE.ExtrudeGeometry(formeArrondie(THREE, CORPS.l - 0.4, CORPS.h - 0.4, CORPS.r - 0.18), { depth: CORPS.e - 0.12, bevelEnabled: false, curveSegments: 18 }));
  geoAme.translate(0, 0, -(CORPS.e - 0.12) / 2);
  groupe.add(new THREE.Mesh(geoAme, noir));
  const dos = new THREE.Mesh(garder(geoDalle(THREE, CORPS.l - 0.36, CORPS.h - 0.36, CORPS.r - 0.16)), dosVerre);
  dos.rotation.y = Math.PI; dos.position.z = -CORPS.e / 2 - 0.002; groupe.add(dos);
  // îlot caméra (dos, en haut à gauche vu de dos) : plateau + 3 objectifs + flash
  const ilot = new THREE.Group(); ilot.position.set(CORPS.l / 2 - 1.95, CORPS.h / 2 - 1.95, -CORPS.e / 2); groupe.add(ilot);
  const geoPlateau = garder(new THREE.ExtrudeGeometry(formeArrondie(THREE, 3.1, 3.1, 0.82), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 12 }));
  const plateau = new THREE.Mesh(geoPlateau, dosVerre); plateau.rotation.y = Math.PI; ilot.add(plateau);
  const geoBague = garder(new THREE.CylinderGeometry(0.58, 0.6, 0.22, 32)), geoLentille = garder(new THREE.CircleGeometry(0.42, 32)), geoReflet = garder(new THREE.CircleGeometry(0.12, 16));
  const verreLentille = garder(new THREE.MeshPhysicalMaterial({ color: 0x050816, metalness: 0.4, roughness: 0.05, clearcoat: 1, envMap: env, envMapIntensity: 1.6 }));
  const refletLentille = garder(new THREE.MeshBasicMaterial({ color: 0x8a7dff, transparent: true, opacity: 0.55, toneMapped: false }));
  for (const [x, y] of [[0.68, 0.68], [0.68, -0.68], [-0.68, 0.0]]) {
    const b = new THREE.Mesh(geoBague, metal); b.rotation.x = Math.PI / 2; b.position.set(x, y, -0.24); ilot.add(b);
    const l = new THREE.Mesh(geoLentille, verreLentille); l.rotation.y = Math.PI; l.position.set(x, y, -0.352); ilot.add(l);
    const r = new THREE.Mesh(geoReflet, refletLentille); r.rotation.y = Math.PI; r.position.set(x + 0.13, y + 0.13, -0.354); ilot.add(r);
  }
  const flash = new THREE.Mesh(garder(new THREE.CircleGeometry(0.2, 20)), garder(new THREE.MeshBasicMaterial({ color: 0xfff1cf, toneMapped: false })));
  flash.rotation.y = Math.PI; flash.position.set(-0.7, 0.95, -0.18); ilot.add(flash);
  // boutons latéraux (volume à gauche, verrouillage à droite)
  const geoBouton = garder(new THREE.BoxGeometry(0.12, 1, 0.34));
  for (const [x, y, h] of [[-CORPS.l / 2 - 0.03, 3.6, 1.1], [-CORPS.l / 2 - 0.03, 2.1, 1.1], [-CORPS.l / 2 - 0.03, 5.0, 0.6], [CORPS.l / 2 + 0.03, 2.9, 1.7]]) {
    const b = new THREE.Mesh(geoBouton, metal); b.scale.y = h; b.position.set(x, y, 0); groupe.add(b);
  }
  // face avant : vitre noire (bordures) + dalle lumineuse + reflet de vitre
  const zAvant = CORPS.e / 2;
  const vitre = new THREE.Mesh(garder(geoDalle(THREE, CORPS.l - 0.3, CORPS.h - 0.3, CORPS.r - 0.14)), garder(new THREE.MeshPhysicalMaterial({ color: 0x020205, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 1.1 })));
  vitre.position.z = zAvant + 0.004; groupe.add(vitre);
  const cv = toile(TOILE.l, TOILE.h), g = cv.getContext('2d');
  const tex = garder(new THREE.CanvasTexture(cv)); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  const dalle = new THREE.Mesh(garder(geoDalle(THREE, ECRAN.l, ECRAN.h, ECRAN.r)), garder(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
  dalle.position.z = zAvant + 0.012; groupe.add(dalle);
  const texReflet = garder(new THREE.CanvasTexture((() => {
    const c = toile(256, 512), q = c.getContext('2d');
    const d = q.createLinearGradient(0, 0, 256, 512);
    d.addColorStop(0, 'rgba(255,255,255,0)'); d.addColorStop(0.3, 'rgba(255,255,255,0)'); d.addColorStop(0.36, 'rgba(255,255,255,.9)');
    d.addColorStop(0.43, 'rgba(255,255,255,.25)'); d.addColorStop(0.5, 'rgba(255,255,255,0)'); d.addColorStop(0.58, 'rgba(255,255,255,.18)'); d.addColorStop(0.62, 'rgba(255,255,255,0)');
    q.fillStyle = d; q.fillRect(0, 0, 256, 512); return c;
  })()));
  const reflet = new THREE.Mesh(garder(geoDalle(THREE, CORPS.l - 0.3, CORPS.h - 0.3, CORPS.r - 0.14)), garder(new THREE.MeshBasicMaterial({ map: texReflet, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
  reflet.position.z = zAvant + 0.02; groupe.add(reflet);

  /* ───────────────────────── la comète du piège (quitte l'écran à T.piege) ───────────────────────── */
  const zIc = Z('piege', 'icone');
  const texComete = garder(new THREE.CanvasTexture((() => {
    const c = toile(256, 256), q = c.getContext('2d');
    const r = q.createRadialGradient(128, 128, 8, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,240,240,1)'); r.addColorStop(0.25, 'rgba(255,70,90,.95)'); r.addColorStop(0.6, 'rgba(230,20,60,.35)'); r.addColorStop(1, 'rgba(200,0,40,0)');
    q.fillStyle = r; q.fillRect(0, 0, 256, 256);
    // l'icône réelle du piège (glyphe blanc de la capture), détourée par sa blancheur et posée au cœur de la comète
    const cote = Math.min(zIc[3], 200), gl = toile(140, 140), qg = gl.getContext('2d');
    qg.drawImage(img.piege, zIc[0] + zIc[2] / 2 - cote / 2, zIc[1] + zIc[3] / 2 - cote / 2, cote, cote, 0, 0, 140, 140);
    const px = qg.getImageData(0, 0, 140, 140), d = px.data;
    for (let i = 0; i < d.length; i += 4) { const b = Math.min(d[i], d[i + 1], d[i + 2]); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(255 * clamp((b - 110) / 110)); }
    qg.putImageData(px, 0, 0);
    q.shadowColor = 'rgba(255,30,70,1)'; q.shadowBlur = 18; q.drawImage(gl, 58, 58);
    return c;
  })()));
  texComete.encoding = THREE.sRGBEncoding;
  const texHalo = garder(new THREE.CanvasTexture((() => {
    const c = toile(128, 128), q = c.getContext('2d'), r = q.createRadialGradient(64, 64, 2, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = r; q.fillRect(0, 0, 128, 128); return c;
  })()));
  const comete = new THREE.Sprite(garder(new THREE.SpriteMaterial({ map: texComete, transparent: true, depthWrite: false, toneMapped: false })));
  groupe.add(comete);
  const NT = 16, trainee = [];
  const matTrainee = garder(new THREE.SpriteMaterial({ map: texHalo, color: new THREE.Color(1.0, 0.16, 0.24).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  for (let i = 0; i < NT; i++) { const s = new THREE.Sprite(matTrainee.clone()); garder(s.material); groupe.add(s); trainee.push(s); }
  // point de départ : centre de l'icône du piège sur la dalle (capture piege, cadrage « carte » de la caméra virtuelle)
  const DUREE_COMETE = 0.85;
  const depart = new THREE.Vector3(), vTmp = new THREE.Vector3();
  function trajectoire(a, v) {                                       // a ∈ [0,1] : position dans le repère du téléphone
    const e = a * a * (1.2 - 0.2 * a);
    return v.set(depart.x + 4 * a + 70 * e, depart.y + 9 * a + 22 * e, depart.z + 3 * a + 34 * e);
  }

  /* ───────────────────────── composition de l'écran ───────────────────────── */
  const W = TOILE.l;
  /** Fenêtre de la caméra virtuelle sur une capture : centre (cx, cy) et largeur w, en px de capture. */
  function fenetre(nom, cx, cy, w) {
    const im = img[nom], h = w * ZONE_H / W;
    const sx = clamp(cx - w / 2, 0, Math.max(0, im.width - w)), sy = clamp(cy - h / 2, 0, Math.max(0, im.height - h));
    return { nom, sx, sy, w, h, k: W / w };
  }
  const versToile = (f, x, y) => [(x - f.sx) * f.k, TOILE.barre + (y - f.sy) * f.k];
  function peindre(f, alpha = 1) {
    if (alpha <= 0) return;
    g.save(); g.globalAlpha = alpha; g.beginPath(); g.rect(0, TOILE.barre, W, ZONE_H); g.clip();
    g.drawImage(img[f.nom], f.sx, f.sy, f.w, f.h, 0, TOILE.barre, W, ZONE_H); g.restore();
  }
  /** Interpolation de fenêtres-clés [{ t, cx, cy, w }] (vitesse nulle aux clés). */
  function chemin(cles, t) {
    if (t <= cles[0].t) return cles[0];
    for (let i = 1; i < cles.length; i++) if (t < cles[i].t) { const a = cles[i - 1], b = cles[i], k = smoother((t - a.t) / (b.t - a.t)); return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), w: lerp(a.w, b.w, k) }; }
    return cles[cles.length - 1];
  }
  function tap(f, x, y, t, t0, couleur = '255,236,150') {
    const a = t - t0; if (a < -0.18 || a > 0.55) return;
    const [X, Y] = versToile(f, x, y);
    g.save();
    if (a < 0) {                                                       // le doigt arrive : point lumineux qui se resserre
      const k = 1 + a / 0.18; g.fillStyle = `rgba(${couleur},${0.35 * k})`; g.beginPath(); g.arc(X, Y, 46 - 16 * k, 0, 7); g.fill();
    } else {
      const k = a / 0.55, r = 34 + 120 * doux(k);
      g.fillStyle = `rgba(${couleur},${0.45 * (1 - k)})`; g.beginPath(); g.arc(X, Y, 30 * (1 - k * 0.6), 0, 7); g.fill();
      g.lineWidth = 10 * (1 - k) + 2; g.strokeStyle = `rgba(${couleur},${1 - k})`; g.shadowColor = `rgba(${couleur},1)`; g.shadowBlur = 30;
      g.beginPath(); g.arc(X, Y, r, 0, 7); g.stroke();
    }
    g.restore();
  }
  function barreEtat() {
    g.fillStyle = '#070b1e'; g.fillRect(0, 0, W, TOILE.barre);
    g.fillStyle = '#ffffff'; g.font = '700 30px "Fredoka", "Nunito", system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText('21:42', 52, TOILE.barre / 2 + 4);
    g.fillStyle = '#000000'; rectArrondi(g, W / 2 - 92, 9, 184, 42, 21); g.fill();               // îlot dynamique
    g.fillStyle = '#ffffff';                                                                      // réseau + batterie
    for (let i = 0; i < 4; i++) g.fillRect(W - 186 + i * 13, 38 - 6 - i * 5, 9, 6 + i * 5);
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)'; rectArrondi(g, W - 112, 18, 56, 26, 8); g.stroke();
    g.fillRect(W - 107, 23, 38, 16); g.fillRect(W - 53, 26, 4, 10);
  }
  const lueur = (x, y, r, couleur, a) => {
    if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter';
    const d = g.createRadialGradient(x, y, 0, x, y, r); d.addColorStop(0, `rgba(${couleur},${a})`); d.addColorStop(1, `rgba(${couleur},0)`);
    g.fillStyle = d; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
  };

  // repères (zones mesurées sur les vraies captures)
  const pVoie1 = centre(Z('paris_a', 'voie1')), pPlacer = centre(Z('paris_a', 'placer')), zToast = Z('paris_c', 'toast');
  const zPurse = Z('resultat', 'purse'), pMN = centre(Z('caisses', 'mn_bonus')), pUtil = centre(Z('piege', 'utiliser')), pIc = centre(zIc);
  const zV0 = Z('cible', 'voie0'), pV0 = centre(zV0);
  const yVoies = Z('paris_a', 'voies')[1], yPlacer = pPlacer[1];
  const imH = (n) => img[n].height, hFen = (w) => w * ZONE_H / W;
  const PARIS = [
    { t: T.debut, cx: 390, cy: hFen(780) / 2, w: 780 },
    { t: T.debut + 0.75, cx: 390, cy: yVoies - 40 + hFen(640) / 2, w: 640 },
    { t: T.pari - 0.62, cx: 390, cy: yVoies - 40 + hFen(640) / 2, w: 640 },
    { t: T.pari - 0.12, cx: 390, cy: yPlacer + 300 - hFen(640) / 2, w: 640 },
    { t: T.pari + 0.6, cx: 390, cy: Math.min(imH('paris_c') - 130, yPlacer + 400) - hFen(640) / 2, w: 640 },
  ];
  const T_VOIE = T.pari - 0.75;                                       // tap sur la Mégane
  const T_RES = T.pari + 0.6;                                          // bascule vers le Résultat
  const RES = [
    { t: T_RES, cx: 390, cy: hFen(780) / 2, w: 780 },
    { t: T.points - 0.25, cx: 400, cy: hFen(704) / 2, w: 704 },
    { t: T.points + 0.75, cx: 400, cy: hFen(704) / 2, w: 704 },
  ];
  const T_CAI = T.lootbox - 0.5;
  const CAI = [
    { t: T_CAI, cx: 390, cy: hFen(780) / 2, w: 780 },
    { t: T.lootbox - 0.08, cx: 430, cy: pMN[1] - 120, w: 660 },
  ];
  const T_ROUL = T.lootbox + 0.05, T_PIEGE = T.piege - 0.18, T_CIBLE = T.piege + 0.35, T_TAP_CIBLE = T.piege + 0.65;

  function dessiner(t) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#070b1e'; g.fillRect(0, 0, W, TOILE.h);
    if (t < T_RES) {
      /* ── 1. PARIS ── */
      const c = chemin(PARIS, t), nom = t < T_VOIE + 0.05 ? 'paris_a' : t < T.pari + 0.04 ? 'paris_b' : 'paris_c';
      const f = fenetre(nom, c.cx, c.cy, c.w); peindre(f);
      if (nom === 'paris_c') {                                          // toast fixé en haut de l'écran (comme sur le vrai téléphone)
        const a = t - (T.pari + 0.04), pop = a < 0.12 ? lerp(0.6, 1.06, smoother(a / 0.12)) : a < 0.22 ? lerp(1.06, 1, smoother((a - 0.12) / 0.1)) : 1;
        const k = f.k * 1.12, w = zToast[2] * k, h = zToast[3] * k, x = W / 2, y = TOILE.barre + 70 + h / 2;
        g.save(); g.translate(x, y); g.scale(pop, pop); g.globalAlpha = clamp(a / 0.08);
        g.drawImage(img.paris_c, zToast[0], zToast[1], zToast[2], zToast[3], -w / 2, -h / 2, w, h); g.restore();
      }
      tap(f, pVoie1[0] + 120, pVoie1[1], t, T_VOIE);
      tap(f, pPlacer[0], pPlacer[1], t, T.pari);
      if (t > T.pari && t < T.pari + 0.5) { const [X, Y] = versToile(f, pPlacer[0], pPlacer[1]); lueur(X, Y, 330, '255,200,80', 0.45 * (1 - (t - T.pari) / 0.5)); }
    } else if (t < T_CAI) {
      /* ── 2. RÉSULTAT + porte-monnaie qui compte ── */
      const c = chemin(RES, t), f = fenetre('resultat', c.cx, c.cy, c.w);
      if (t < T_RES + 0.22) peindre(fenetre('paris_c', ...(() => { const p = PARIS[PARIS.length - 1]; return [p.cx, p.cy, p.w]; })()));
      peindre(f, clamp((t - T_RES) / 0.22));
      // bandeau : valeur courante du porte-monnaie (captures réelles successives)
      const n = B.valeurs.length, kc = clamp((t - T.points) / 0.7), i = Math.min(n - 1, Math.floor(kc * (n - 1) + 1e-6));
      const [bw, bh] = B.taille;
      const [X0, Y0] = versToile(f, 0, 0);
      g.save(); g.globalAlpha = clamp((t - T_RES) / 0.22); g.beginPath(); g.rect(0, TOILE.barre, W, ZONE_H); g.clip();
      g.drawImage(img.bourse, 0, i * bh, bw, bh, X0, Y0, bw * f.k, bh * f.k); g.restore();
      const [PX, PY] = versToile(f, zPurse[0] + zPurse[2] / 2, zPurse[1] + zPurse[3] / 2);
      const pulse = t > T.points && t < T.points + 1.0 ? Math.sin(clamp((t - T.points) / 1.0) * Math.PI) : 0;
      lueur(PX, PY, 190, '255,205,90', 0.55 * pulse);
      for (let j = 0; j < n - 1; j++) tap(f, zPurse[0] + zPurse[2] * 0.62, zPurse[1] + zPurse[3] / 2, t, T.points + (j + 0.5) * 0.7 / (n - 1) + 0.18, '255,215,110');
    } else if (t < T_ROUL) {
      /* ── 3. ARSENAL › CAISSES ── */
      const c = chemin(CAI, t), f = fenetre('caisses', c.cx, c.cy, c.w);
      const pr = RES[RES.length - 1];
      if (t < T_CAI + 0.18) peindre(fenetre('resultat', pr.cx, pr.cy, pr.w));
      g.save(); const gl = (1 - smoother((t - T_CAI) / 0.25)) * 60; g.translate(gl, 0); peindre(f, clamp((t - T_CAI) / 0.18)); g.restore();
      tap(f, pMN[0], pMN[1], t, T.lootbox);
      if (t > T.lootbox - 0.02) { const [X, Y] = versToile(f, pMN[0], pMN[1]); lueur(X, Y, 260, '255,190,60', 0.6 * clamp((t - T.lootbox) / 0.05)); }
    } else if (t < T.bonus) {
      /* ── 4. ROULETTE (3 captures réelles + filé de la bande) ── */
      const u = (t - T_ROUL) / (T.bonus - T_ROUL), nom = u < 0.33 ? 'roulette_1' : u < 0.66 ? 'roulette_2' : 'roulette_3';
      const wr = lerp(720, 640, smoother(u)), f = fenetre(nom, 390, hFen(wr) / 2, wr); peindre(f);
      const [b0, b1] = BANDE_ROULETTE, im = img[nom], v = Math.pow(1 - u, 2.2);
      const dx = (v * 1500) % im.width;
      const [, Y0] = versToile(f, 0, b0), [, Y1] = versToile(f, 0, b1);
      g.save(); g.beginPath(); g.rect(0, Y0, W, Y1 - Y0); g.clip();
      for (let s = 0; s < 3; s++) {                                     // trois passes décalées = filé de mouvement
        g.globalAlpha = s === 0 ? 1 : 0.28 * v; const o = dx + s * 28 * v;
        for (const k of [0, 1]) g.drawImage(im, 0, b0, im.width, b1 - b0, (k * im.width - o - f.sx) * f.k, Y0, im.width * f.k, Y1 - Y0);
      }
      g.restore();
      const [MX] = versToile(f, 390, 0);                                 // repère central (fixe)
      g.fillStyle = 'rgba(255,214,77,.95)'; g.fillRect(MX - 3, Y0 - 6, 6, Y1 - Y0 + 12);
    } else if (t < T_CIBLE) {
      /* ── 5. RÉVÉLATIONS : BONUS doré puis PIÈGE ── */
      const piege = t >= T_PIEGE;
      const zC = Z('bonus', 'carte');
      const fb = fenetre('bonus', 390, zC[1] + zC[3] / 2 - 150, 720 - 30 * smoother((t - T.bonus) / 0.5));
      const pop = 1 + 0.06 * Math.exp(-(t - T.bonus) * 9) * Math.cos((t - T.bonus) * 30);
      g.save(); g.translate(W / 2, TOILE.h / 2); g.scale(pop, pop); g.translate(-W / 2, -TOILE.h / 2); peindre(fb); g.restore();
      const ec = clamp(1 - (t - T.bonus) / 0.35);                       // éclair or de la révélation
      if (ec > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,214,110,${0.75 * ec * ec})`; g.fillRect(0, TOILE.barre, W, ZONE_H); g.restore(); }
      if (piege) {
        const zP = Z('piege', 'carte'), fp = fenetre('piege', 390, zP[1] + zP[3] / 2 - 150, 690);
        const k = smoother((t - T_PIEGE) / 0.14);
        g.save(); g.translate((1 - k) * W * 0.9, 0); peindre(fp, k); g.restore();
        tap(fp, pUtil[0], pUtil[1], t, T.piege, '255,120,200');
        const a = t - T.piege;
        if (a > 0) {
          const [IX, IY] = versToile(fp, pIc[0], pIc[1]);
          const r = 40 + 900 * doux(a / 0.45);                           // onde rouge : le piège quitte l'écran
          g.save(); g.lineWidth = 26 * clamp(1 - a / 0.45); g.strokeStyle = `rgba(255,50,80,${clamp(1 - a / 0.45)})`; g.shadowColor = 'rgba(255,40,70,1)'; g.shadowBlur = 40;
          g.beginPath(); g.arc(IX, IY, r, 0, 7); g.stroke(); g.restore();
          // l'icône s'est envolée : son emplacement s'éteint
          const [X0, Y0] = versToile(fp, zIc[0], zIc[1]); const lw = zIc[2] * fp.k, lh = zIc[3] * fp.k;
          g.save(); g.globalAlpha = clamp(a / 0.08) * 0.82; const d = g.createRadialGradient(IX, IY, 0, IX, IY, lh * 0.75);
          d.addColorStop(0, 'rgba(70,6,40,1)'); d.addColorStop(1, 'rgba(70,6,40,0)'); g.fillStyle = d; g.fillRect(X0, Y0, lw, lh); g.restore();
          lueur(IX, IY, 240, '255,40,80', 0.8 * clamp(1 - a / 0.3));
        }
      }
    } else {
      /* ── 6. « SUR LA VOIE DE QUI ? » : on vise l'adversaire ── */
      const wc = lerp(700, 640, smoother((t - T_CIBLE) / 0.6)), f = fenetre('cible', 390, zV0[1] - 470 + hFen(wc) / 2, wc);
      peindre(f, clamp((t - T_CIBLE) / 0.12));
      tap(f, pV0[0], pV0[1], t, T_TAP_CIBLE, '255,90,110');
      const a = t - T_TAP_CIBLE;
      if (a > 0) {
        const [X0, Y0] = versToile(f, zV0[0], zV0[1]), w = zV0[2] * f.k, h = zV0[3] * f.k, p = 0.5 + 0.5 * Math.cos(a * 14);
        g.save(); g.lineWidth = 8; g.strokeStyle = `rgba(255,60,90,${0.55 + 0.45 * p})`; g.shadowColor = 'rgba(255,40,70,1)'; g.shadowBlur = 34;
        rectArrondi(g, X0, Y0, w, h, 26); g.stroke(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,40,70,${0.16 * p})`; g.fill(); g.restore();
      }
    }
    barreEtat();
    g.fillStyle = 'rgba(255,255,255,.6)'; rectArrondi(g, W / 2 - 120, TOILE.h - 22, 240, 9, 5); g.fill();   // barre d'accueil
    tex.needsUpdate = true;
  }

  // départ de la comète : centre de l'icône du piège dans le cadrage « carte » de l'écran
  {
    const zP = Z('piege', 'carte'), w = 690, h = hFen(w), sy = clamp(zP[1] + zP[3] / 2 - 150 - h / 2, 0, imH('piege') - h), sx = clamp(390 - w / 2, 0, img.piege.width - w);
    const X = (pIc[0] - sx) * W / w, Y = TOILE.barre + (pIc[1] - sy) * W / w;
    depart.set((X / W - 0.5) * ECRAN.l, (0.5 - Y / TOILE.h) * ECRAN.h, zAvant + 0.3);
  }
  function placerComete(t) {
    const a = (t - T.piege) / DUREE_COMETE;
    const vis = a > 0 && a < 1;
    comete.visible = vis; for (const s of trainee) s.visible = vis;
    if (!vis) return;
    trajectoire(a, vTmp); comete.position.copy(vTmp);
    const taille = 2.4 + 5 * Math.sin(Math.min(1, a * 3) * Math.PI / 2) - 1.5 * a;
    comete.scale.set(taille, taille, 1); comete.material.opacity = clamp((1 - a) / 0.25);
    for (let i = 0; i < NT; i++) {
      const ai = a - (i + 1) * 0.022; const s = trainee[i];
      if (ai <= 0) { s.visible = false; continue; }
      trajectoire(ai, vTmp); s.position.copy(vTmp);
      const k = 1 - i / NT, sz = (1.2 + 2.6 * k) * (0.6 + 0.4 * Math.min(1, ai * 4));
      s.scale.set(sz, sz, 1); s.material.opacity = 0.9 * k * clamp((1 - a) / 0.3);
    }
  }

  const tBorne = (t) => (t >= T.debut && t <= T.fin ? t : T.debut);
  dessiner(T.debut); placerComete(T.debut);
  return {
    groupe,
    maj(t) { const u = tBorne(t); dessiner(u); placerComete(u); },
    hud() { return null; },                                               // la voix off suffit (protocole « zéro surcharge »)
    liberer() {
      for (const o of aLiberer) if (o && typeof o.dispose === 'function') o.dispose();
      groupe.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      if (groupe.parent) groupe.parent.remove(groupe);
    },
  };
}
