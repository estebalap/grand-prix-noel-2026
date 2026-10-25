/* DÉCOR « SALON » de l'intro 3D v4 — le point de départ du film, avant que le tapis ne devienne la Rainbow Road.

   Cahier des charges d'Esteban (25 oct., plan corrigé) :
     - canapé en cuir blanc au centre, en bas (face à la télé) ; 2 fauteuils solo en cuir blanc, à gauche et à droite,
       tournés en diagonale vers la télé ;
     - au milieu un tapis rouge sang à motifs, une petite table basse en bois ;
     - devant, un meuble de télé simple, rouge brillant, avec une grosse télé au milieu ; les plantes en pot sont posées dessus ;
     - la cheminée vitrée est encastrée EN DIAGONALE, dans un pan coupé entre le mur de la télé et le mur de droite ;
       le sapin de Noël est à côté de la cheminée ;
     - sol en carrelage carré « en nuage » jaune-orange.
     - pièce resserrée (5,0 m × 4,25 m : télé et cheminée proches du canapé), murs blancs,
       double fenêtre au fond du mur de gauche (côté télé), nuit d'hiver dehors.
   Ajouts de mise en scène : guirlande d'ampoules du sapin aux couleurs des 5 voies, 3 spots encastrés, reflets.

   Conventions (identiques au Trailer 3D) :
     - THREE global (web/lib/three.min.js, r128) ; 1 unité = 1 cm (repère des bolides m3d : une miniature mesure ~7 cm) ;
     - sol y = 0 ; la télé est au nord (z négatif), le canapé au sud (z positif), la cheminée à l'est (x positif) ;
     - aucune Math.random(), aucune horloge : tout l'aléatoire est semé, l'animation est maj(t) avec t = temps film.

   construireSalon({ graine }) → { groupe, maj(t), ancres, liberer() }
     ancres.tapis   : { centre: Vector3, largeur, profondeur, y }   (là où la piste surgira)
     ancres.ecran   : { centre, normale, largeur, hauteur }          (télé)
     ancres.foyer   : { centre }                                    (cheminée)
     ancres.cameras : préréglages { position, cible, focale_mm }      (repris par plans_intro.json)
*/
const T = () => window.THREE;

/* ---------------------------------------------------------------- aléatoire semé (mulberry32) */
export function graineur(s) {
  let a = s >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------------------------------------------------------------- textures procédurales (canvas) */
export function toile(l, h, dessin) {
  const c = document.createElement('canvas'); c.width = l; c.height = h;
  dessin(c.getContext('2d'), l, h); return c;
}
export function texture(canvas, { srgb = true, repet = [1, 1], aniso = 8 } = {}) {
  const THREE = T(); const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repet[0], repet[1]); t.anisotropy = aniso;
  return t;
}

/** Parquet en chêne : lames de 18 cm, joints décalés, veinage. */
function toileParquet(rnd) {
  return toile(1024, 1024, (g, L, H) => {
    const lames = 8, lh = H / lames;
    for (let i = 0; i < lames; i++) {
      let x = -rnd() * 400;
      while (x < L) {
        const lon = 260 + rnd() * 260, base = 120 + rnd() * 40;
        const grd = g.createLinearGradient(x, 0, x + lon, 0);
        grd.addColorStop(0, `rgb(${base + 30},${base - 5},${base - 50})`); grd.addColorStop(1, `rgb(${base + 18},${base - 14},${base - 58})`);
        g.fillStyle = grd; g.fillRect(x, i * lh, lon, lh);
        g.globalAlpha = 0.18;
        for (let v = 0; v < 14; v++) {                                // veinage
          g.strokeStyle = rnd() < 0.5 ? '#3d2412' : '#c9945e'; g.lineWidth = 0.6 + rnd() * 1.4; g.beginPath();
          const y0 = i * lh + rnd() * lh; g.moveTo(x, y0);
          for (let s = 0; s <= 8; s++) g.lineTo(x + lon * s / 8, y0 + Math.sin(s * 0.9 + v) * (1 + rnd() * 3));
          g.stroke();
        }
        g.globalAlpha = 1; g.fillStyle = 'rgba(25,14,6,.85)'; g.fillRect(x, i * lh, 2, lh);   // joint de bout
        x += lon;
      }
      g.fillStyle = 'rgba(25,14,6,.9)'; g.fillRect(0, i * lh, L, 2);                         // joint de rive
    }
  });
}

/** Carrelage carré 60 cm « en nuage » jaune-orange : chaque carreau a son nuage (taches fondues), joints clairs. 4 × 4 carreaux par toile. */
function toileCarrelage(rnd) {
  return toile(1024, 1024, (g, L, H) => {
    const n = 4, c = L / n, teintes = ['#f1c453', '#e9a23b', '#e0812e', '#f4d77a', '#d96f27', '#f0b548'];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = i * c, y0 = j * c;
      g.save(); g.beginPath(); g.rect(x0, y0, c, c); g.clip();
      g.fillStyle = teintes[Math.floor(rnd() * 3)]; g.fillRect(x0, y0, c, c);
      for (let k = 0; k < 38; k++) {                                   // nuages : grandes taches très floues qui se superposent
        const x = x0 + rnd() * c, y = y0 + rnd() * c, r = c * (0.12 + rnd() * 0.45);
        const gr = g.createRadialGradient(x, y, 0, x, y, r), t = teintes[Math.floor(rnd() * teintes.length)];
        gr.addColorStop(0, t + 'aa'); gr.addColorStop(1, t + '00'); g.fillStyle = gr; g.fillRect(x0, y0, c, c);
      }
      for (let k = 0; k < 6; k++) {                                    // fines veines blanchâtres
        g.strokeStyle = 'rgba(255,240,205,.18)'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); let x = x0 + rnd() * c, y = y0 + rnd() * c; g.moveTo(x, y);
        for (let s2 = 0; s2 < 6; s2++) { x += (rnd() - 0.4) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); } g.stroke();
      }
      g.restore();
      g.fillStyle = 'rgba(235,222,196,1)'; g.fillRect(x0, y0, c, 3); g.fillRect(x0, y0, 3, c);   // joints
    }
  });
}

/** Vue de nuit derrière la fenêtre : ciel d'hiver, lune, étoiles, toits enneigés aux fenêtres allumées. */
function toileNuit(rnd) {
  return toile(1024, 768, (g, L, H) => {
    const ciel = g.createLinearGradient(0, 0, 0, H); ciel.addColorStop(0, '#050a1f'); ciel.addColorStop(0.65, '#14234a'); ciel.addColorStop(1, '#25335c');
    g.fillStyle = ciel; g.fillRect(0, 0, L, H);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; g.fillRect(rnd() * L, rnd() * H * 0.6, 1.5, 1.5); }
    const lx = L * 0.68, ly = H * 0.2, halo = g.createRadialGradient(lx, ly, 10, lx, ly, 140); halo.addColorStop(0, 'rgba(220,230,255,.55)'); halo.addColorStop(1, 'rgba(220,230,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, L, H); g.fillStyle = '#f4f6ff'; g.beginPath(); g.arc(lx, ly, 34, 0, 7); g.fill();
    let x = 0;                                                                                     // toits
    while (x < L) {
      const l = 90 + rnd() * 140, h = H * (0.45 + rnd() * 0.2), y = H - (H - h) * 0.0;
      g.fillStyle = '#0b1022'; g.fillRect(x, h, l, H - h);
      g.fillStyle = '#e8eefc'; g.beginPath(); g.moveTo(x - 6, h + 4); g.lineTo(x + l / 2, h - 40 - rnd() * 30); g.lineTo(x + l + 6, h + 4); g.closePath(); g.fill();   // toit enneigé
      g.fillStyle = '#0b1022'; g.beginPath(); g.moveTo(x, h + 8); g.lineTo(x + l / 2, h - 28); g.lineTo(x + l, h + 8); g.closePath(); g.fill();
      for (let k = 0; k < 4; k++) if (rnd() < 0.6) { g.fillStyle = rnd() < 0.5 ? '#ffcf6b' : '#ffb04a'; g.fillRect(x + 12 + rnd() * (l - 36), h + 20 + rnd() * 60, 14, 18); }
      x += l + 6 + rnd() * 20; void y;
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(rnd() * L, rnd() * H, 1 + rnd() * 1.8, 0, 7); g.fill(); }   // flocons
  });
}

/** Tapis rouge sang : bordures, frise de losanges, médaillon central, champ à motif, usure légère. */
export function toileTapis(rnd) {
  return toile(2048, 1366, (g, L, H) => {
    const sang = '#6e0710', sombre = '#3a0207', or = '#c9973f', creme = '#e9d7b4', bleu = '#1c2340';
    g.fillStyle = sang; g.fillRect(0, 0, L, H);
    // champ : treillis de petits losanges
    g.strokeStyle = 'rgba(30,2,6,.55)'; g.lineWidth = 3;
    for (let x = -H; x < L + H; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); g.beginPath(); g.moveTo(x + H, 0); g.lineTo(x, H); g.stroke(); }
    for (let x = 32; x < L; x += 64) for (let y = 32; y < H; y += 64) { g.fillStyle = 'rgba(201,151,63,.35)'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    // bordures concentriques
    const bande = (m, ep, c) => { g.fillStyle = c; g.fillRect(m, m, L - 2 * m, ep); g.fillRect(m, H - m - ep, L - 2 * m, ep); g.fillRect(m, m, ep, H - 2 * m); g.fillRect(L - m - ep, m, ep, H - 2 * m); };
    bande(0, 70, sombre); bande(70, 10, or); bande(80, 70, bleu); bande(150, 8, or); bande(158, 22, sombre);
    // frise de losanges dans la bande bleue
    g.fillStyle = creme;
    const frise = (x0, y0, x1, y1) => {
      const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 60);
      for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 18, y); g.lineTo(x, y + 22); g.lineTo(x - 18, y); g.closePath(); g.fill(); }
    };
    frise(115, 115, L - 115, 115); frise(115, H - 115, L - 115, H - 115); frise(115, 115, 115, H - 115); frise(L - 115, 115, L - 115, H - 115);
    // médaillon central (étoile à 8 branches + rosace)
    const cx = L / 2, cy = H / 2;
    const etoile = (r1, r2, n, c, rot = 0) => { g.fillStyle = c; g.beginPath(); for (let k = 0; k < n * 2; k++) { const r = k % 2 ? r2 : r1, a = rot + k * Math.PI / n; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); };
    etoile(330, 210, 8, sombre); etoile(300, 190, 8, bleu); etoile(250, 160, 8, or, Math.PI / 8); etoile(210, 140, 8, sang, Math.PI / 8);
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.fillStyle = k % 2 ? creme : or; g.beginPath(); g.ellipse(cx + Math.cos(a) * 95, cy + Math.sin(a) * 95, 34, 13, a, 0, 7); g.fill(); }
    g.fillStyle = bleu; g.beginPath(); g.arc(cx, cy, 55, 0, 7); g.fill(); g.fillStyle = or; g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.fill();
    // écoinçons
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ox = sx > 0 ? 180 : L - 180, oy = sy > 0 ? 180 : H - 180;
      g.fillStyle = sombre; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + sx * 260, oy); g.quadraticCurveTo(ox + sx * 120, oy + sy * 120, ox, oy + sy * 260); g.closePath(); g.fill();
      g.fillStyle = or; g.beginPath(); g.arc(ox + sx * 60, oy + sy * 60, 16, 0, 7); g.fill();
    }
    // usure / velours : bruit fin
    const id = g.getImageData(0, 0, L, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * 22; d[i] += v; d[i + 1] += v * 0.6; d[i + 2] += v * 0.6; }
    g.putImageData(id, 0, 0);
  });
}

/** Grain de cuir (bump) : cellules irrégulières. */
function toileGrainCuir(rnd) {
  return toile(512, 512, (g, L, H) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, L, H);
    for (let i = 0; i < 2600; i++) { const x = rnd() * L, y = rnd() * H, r = 2 + rnd() * 5; g.fillStyle = `rgba(${rnd() < 0.5 ? '40,40,40' : '210,210,210'},.25)`; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + rnd() * 0.6), rnd() * 3, 0, 7); g.fill(); }
  });
}

/** Écran de télé : mire « GRAND PRIX DE NOËL » néon (bleutée, très lumineuse pour éclairer la pièce). */
function toileEcran() {
  return toile(1024, 576, (g, L, H) => {
    const fond = g.createRadialGradient(L / 2, H / 2, 40, L / 2, H / 2, L * 0.7);
    fond.addColorStop(0, '#1b2f8f'); fond.addColorStop(1, '#05061a'); g.fillStyle = fond; g.fillRect(0, 0, L, H);
    const voies = ['#ff4fb8', '#3f8cff', '#35e07a', '#ffe23d', '#ff8a2a'];
    voies.forEach((c, i) => { g.fillStyle = c; g.globalAlpha = 0.85; g.fillRect(0, H * 0.72 + i * 16, L, 10); });
    g.globalAlpha = 1; g.textAlign = 'center'; g.font = 'bold 92px sans-serif';
    g.shadowColor = '#7fd6ff'; g.shadowBlur = 40; g.fillStyle = '#e8f6ff'; g.fillText('GRAND PRIX', L / 2, H * 0.4);
    g.shadowColor = '#ff4fb8'; g.fillStyle = '#ffe1f3'; g.fillText('DE NOËL', L / 2, H * 0.58);
  });
}

/* ---------------------------------------------------------------- géométries utilitaires */
/** Boîte arrondie (coussins, cuir, laque) : extrusion d'un rectangle à coins ronds avec biseau doux. */
export function boiteRonde(l, h, p, r = 4, seg = 4) {
  const THREE = T(); r = Math.min(r, l / 2 - 0.01, h / 2 - 0.01, p / 2 - 0.01);
  const w = l - 2 * r, hh = h - 2 * r, rc = Math.min(r, w / 2, hh / 2) * 0.999, s = new THREE.Shape();
  s.moveTo(-w / 2 + rc, -hh / 2); s.lineTo(w / 2 - rc, -hh / 2); s.quadraticCurveTo(w / 2, -hh / 2, w / 2, -hh / 2 + rc);
  s.lineTo(w / 2, hh / 2 - rc); s.quadraticCurveTo(w / 2, hh / 2, w / 2 - rc, hh / 2); s.lineTo(-w / 2 + rc, hh / 2);
  s.quadraticCurveTo(-w / 2, hh / 2, -w / 2, hh / 2 - rc); s.lineTo(-w / 2, -hh / 2 + rc); s.quadraticCurveTo(-w / 2, -hh / 2, -w / 2 + rc, -hh / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, p - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg, curveSegments: seg * 2 });
  g.translate(0, 0, -(p - 2 * r) / 2); g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- le salon */
export function construireSalon({ graine = 2312 } = {}) {
  const THREE = T(), rnd = graineur(graine), jetables = [];
  const garde = (o) => { jetables.push(o); return o; };
  const groupe = new THREE.Group(); groupe.name = 'salon';
  const PIECE = { xMin: -250, xMax: 250, zMin: -200, zMax: 225, hauteur: 255 };   // 5,0 m × 4,25 m
  const ajoute = (geo, mat, x, y, z, ry = 0, ombre = true) => {
    const m = new THREE.Mesh(garde(geo), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = ombre; m.receiveShadow = true; groupe.add(m); return m;
  };

  /* --- matériaux */
  const cuir = garde(new THREE.MeshPhysicalMaterial({ color: 0xf3efe8, roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.32,
    bumpMap: garde(texture(toileGrainCuir(rnd), { srgb: false, repet: [3, 3] })), bumpScale: 0.25 }));
  const cuirCouture = garde(new THREE.MeshStandardMaterial({ color: 0xd9d2c6, roughness: 0.6 }));
  const chrome = garde(new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.12, metalness: 1 }));
  const laqueRouge = garde(new THREE.MeshPhysicalMaterial({ color: 0xa50d18, roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04 }));
  const noirMat = garde(new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.35, metalness: 0.4 }));
  const chene = garde(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, map: garde(texture(toileParquet(graineur(graine + 7)), { repet: [0.6, 0.6] })) }));
  const ardoise = garde(new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.55, metalness: 0.1 }));

  /* --- pièce : carrelage, murs, plafond ; pan coupé au nord-est (entre le mur télé et le mur de droite) qui reçoit la cheminée */
  const L = PIECE.xMax - PIECE.xMin, P = PIECE.zMax - PIECE.zMin, H = PIECE.hauteur, COIN = 130;
  const carrelage = garde(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.12,
    map: garde(texture(toileCarrelage(rnd), { repet: [L / 240, P / 240] })) }));
  const sol = ajoute(new THREE.PlaneGeometry(L, P), carrelage, 0, 0, (PIECE.zMin + PIECE.zMax) / 2, 0, false);
  sol.rotation.x = -Math.PI / 2;
  const enduit = garde(new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.88 }));          // murs blancs
  const plafondMat = garde(new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.95 }));
  ajoute(new THREE.PlaneGeometry(L - COIN, H), enduit, PIECE.xMin + (L - COIN) / 2, H / 2, PIECE.zMin, 0, false);                         // mur télé (nord)
  ajoute(new THREE.PlaneGeometry(L, H), enduit, 0, H / 2, PIECE.zMax, Math.PI, false);                                                    // mur sud
  // mur de gauche (ouest) percé d'une DOUBLE FENÊTRE au fond, côté télé
  const FEN = { zc: PIECE.zMin + 85, l: 130, y0: 88, h: 132, ep: 18 };
  {
    const zm = (PIECE.zMin + PIECE.zMax) / 2, u0 = -(FEN.zc - zm) - FEN.l / 2, u1 = u0 + FEN.l;     // repère local du mur : +x local = −z monde
    const f = new THREE.Shape(); f.moveTo(-P / 2, 0); f.lineTo(P / 2, 0); f.lineTo(P / 2, H); f.lineTo(-P / 2, H); f.lineTo(-P / 2, 0);
    const o = new THREE.Path(); o.moveTo(u0, FEN.y0); o.lineTo(u0, FEN.y0 + FEN.h); o.lineTo(u1, FEN.y0 + FEN.h); o.lineTo(u1, FEN.y0); o.lineTo(u0, FEN.y0); f.holes.push(o);
    ajoute(new THREE.ShapeGeometry(f), enduit, PIECE.xMin, 0, zm, Math.PI / 2, false);
  }
  const blancPVC = garde(new THREE.MeshStandardMaterial({ color: 0xfbfbf8, roughness: 0.35 }));
  const xF = PIECE.xMin - FEN.ep / 2;
  for (const [dy, hh] of [[FEN.y0 + FEN.h / 2, FEN.h]]) {
    ajoute(new THREE.BoxGeometry(FEN.ep, hh, 1), enduit, xF, dy, FEN.zc - FEN.l / 2 - 0.5, 0, false);             // embrasures
    ajoute(new THREE.BoxGeometry(FEN.ep, hh, 1), enduit, xF, dy, FEN.zc + FEN.l / 2 + 0.5, 0, false);
  }
  ajoute(new THREE.BoxGeometry(FEN.ep, 1, FEN.l), enduit, xF, FEN.y0 + FEN.h + 0.5, FEN.zc, 0, false);
  ajoute(new THREE.BoxGeometry(FEN.ep + 10, 3, FEN.l + 14), blancPVC, PIECE.xMin + 5 - FEN.ep / 2, FEN.y0 - 1.5, FEN.zc);   // appui intérieur
  const xC = PIECE.xMin - FEN.ep + 4, montant = 6.5;
  const cadreFen = (zc, l) => {                                                                                      // un battant : cadre + vitre
    ajoute(new THREE.BoxGeometry(6, montant, l), blancPVC, xC, FEN.y0 + montant / 2, zc, 0, false);
    ajoute(new THREE.BoxGeometry(6, montant, l), blancPVC, xC, FEN.y0 + FEN.h - montant / 2, zc, 0, false);
    ajoute(new THREE.BoxGeometry(6, FEN.h, montant), blancPVC, xC, FEN.y0 + FEN.h / 2, zc - l / 2 + montant / 2, 0, false);
    ajoute(new THREE.BoxGeometry(6, FEN.h, montant), blancPVC, xC, FEN.y0 + FEN.h / 2, zc + l / 2 - montant / 2, 0, false);
    ajoute(new THREE.BoxGeometry(2.5, 1.2, 8), chrome, xC + 4, FEN.y0 + FEN.h / 2, zc + (zc < FEN.zc ? 1 : -1) * (l / 2 - montant - 2), 0, false);   // poignée
  };
  cadreFen(FEN.zc - FEN.l / 4, FEN.l / 2); cadreFen(FEN.zc + FEN.l / 4, FEN.l / 2);
  const verre = garde(new THREE.MeshPhysicalMaterial({ color: 0xdfeaff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.02 }));
  ajoute(new THREE.PlaneGeometry(FEN.l, FEN.h), verre, xC - 0.5, FEN.y0 + FEN.h / 2, FEN.zc, Math.PI / 2, false);
  // dehors : nuit d'hiver (ciel, lune, toits enneigés, fenêtres allumées), vue à travers les vitres
  const nuit = ajoute(new THREE.PlaneGeometry(420, 300), garde(new THREE.MeshBasicMaterial({ map: garde(texture(toileNuit(graineur(graine + 3)))), toneMapped: false })), PIECE.xMin - 160, 150, FEN.zc, Math.PI / 2, false);
  const lune = new THREE.PointLight(0x8fb2ff, 0, 380, 2); lune.position.set(PIECE.xMin + 35, FEN.y0 + FEN.h - 20, FEN.zc); groupe.add(lune);
  ajoute(new THREE.PlaneGeometry(P - COIN, H), enduit, PIECE.xMax, H / 2, PIECE.zMin + COIN + (P - COIN) / 2, -Math.PI / 2, false);         // mur de droite (est)
  // pan coupé à 45° avec l'ouverture du foyer
  const FOYER = { y0: 30, l: 110, h: 62, prof: 38 }, LD = COIN * Math.SQRT2;
  const PAN = { x: PIECE.xMax - COIN / 2, z: PIECE.zMin + COIN / 2 };
  const formePan = new THREE.Shape(); formePan.moveTo(-LD / 2, 0); formePan.lineTo(LD / 2, 0); formePan.lineTo(LD / 2, H); formePan.lineTo(-LD / 2, H); formePan.lineTo(-LD / 2, 0);
  const trou = new THREE.Path(); trou.moveTo(-FOYER.l / 2, FOYER.y0); trou.lineTo(-FOYER.l / 2, FOYER.y0 + FOYER.h); trou.lineTo(FOYER.l / 2, FOYER.y0 + FOYER.h); trou.lineTo(FOYER.l / 2, FOYER.y0); trou.lineTo(-FOYER.l / 2, FOYER.y0);
  formePan.holes.push(trou);
  ajoute(new THREE.ShapeGeometry(formePan), enduit, PAN.x, 0, PAN.z, -Math.PI / 4, false);
  const plafond = ajoute(new THREE.PlaneGeometry(L, P), plafondMat, 0, H, (PIECE.zMin + PIECE.zMax) / 2, 0, false); plafond.rotation.x = Math.PI / 2;
  // plinthes
  const plinthe = garde(new THREE.MeshStandardMaterial({ color: 0xd9cdb6, roughness: 0.5 }));
  for (const [x, z, l, ry] of [[PIECE.xMin + (L - COIN) / 2, PIECE.zMin + 0.8, L - COIN, 0], [PIECE.xMin + 0.8, 10, P, Math.PI / 2], [0, PIECE.zMax - 0.8, L, 0],
                               [PIECE.xMax - 0.8, PIECE.zMin + COIN + (P - COIN) / 2, P - COIN, Math.PI / 2], [PAN.x - 0.6, PAN.z + 0.6, LD, -Math.PI / 4]]) ajoute(new THREE.BoxGeometry(l, 9, 1.6), plinthe, x, 4.5, z, ry, false);

  /* --- tapis rouge sang à motifs + franges */
  const TAPIS = { l: 270, p: 180, x: 0, z: 25 };
  const tapisMat = garde(new THREE.MeshStandardMaterial({ map: garde(texture(toileTapis(rnd))), roughness: 0.96, metalness: 0 }));
  tapisMat.bumpMap = tapisMat.map; tapisMat.bumpScale = 0.15;
  const tapis = ajoute(new THREE.BoxGeometry(TAPIS.l, 1.0, TAPIS.p), [enduit, enduit, tapisMat, enduit, enduit, enduit].map((m, i) => (i === 2 ? tapisMat : garde(new THREE.MeshStandardMaterial({ color: 0x4a0409, roughness: 1 })))), TAPIS.x, 0.5, TAPIS.z, 0, false);
  const frange = garde(new THREE.MeshStandardMaterial({ color: 0xe6d8bd, roughness: 1 }));
  const geoFrange = garde(new THREE.BoxGeometry(5, 0.25, 0.5));
  for (const sx of [-1, 1]) for (let k = 0; k < 60; k++) {
    const m = new THREE.Mesh(geoFrange, frange); m.position.set(TAPIS.x + sx * (TAPIS.l / 2 + 2.3), 0.15, TAPIS.z - TAPIS.p / 2 + 2 + k * (TAPIS.p - 4) / 59); m.rotation.y = (rnd() - 0.5) * 0.25; m.receiveShadow = true; groupe.add(m);
  }

  /* --- petite table basse en chêne (plateau épais, pieds fuselés) */
  const TABLE = { l: 80, p: 46, h: 38, x: 0, z: 25 };
  ajoute(boiteRonde(TABLE.l, 4.5, TABLE.p, 1.2, 2), chene, TABLE.x, TABLE.h - 2.25, TABLE.z);
  const geoPied = garde(new THREE.CylinderGeometry(1.6, 1.0, TABLE.h - 4.5, 16));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ajoute(geoPied, chene, TABLE.x + sx * (TABLE.l / 2 - 7), (TABLE.h - 4.5) / 2, TABLE.z + sz * (TABLE.p / 2 - 6)).rotation.set(sz * 0.06, 0, -sx * 0.06);
  ajoute(new THREE.BoxGeometry(TABLE.l - 16, 1.6, TABLE.p - 14), chene, TABLE.x, 12, TABLE.z);   // tablette basse

  /* --- meuble télé rouge laqué + grosse télé */
  const MEUBLE = { l: 200, h: 48, p: 44, z: PIECE.zMin + 22 + 3 };
  ajoute(boiteRonde(MEUBLE.l, MEUBLE.h, MEUBLE.p, 1.5, 3), laqueRouge, 0, MEUBLE.h / 2 + 6, MEUBLE.z);
  for (const x of [-MEUBLE.l / 2 + 12, MEUBLE.l / 2 - 12]) ajoute(new THREE.CylinderGeometry(1.5, 1.5, 6, 12), chrome, x, 3, MEUBLE.z);
  for (const x of [-MEUBLE.l / 6, MEUBLE.l / 6]) ajoute(new THREE.BoxGeometry(0.5, MEUBLE.h - 6, 0.6), noirMat, x, MEUBLE.h / 2 + 6, MEUBLE.z + MEUBLE.p / 2 + 0.1, 0, false);   // fentes de portes
  const TV = { l: 166, h: 95, y: MEUBLE.h + 6 + 10 + 95 / 2 };
  ajoute(new THREE.BoxGeometry(TV.l, TV.h, 3.2), noirMat, 0, TV.y, MEUBLE.z - 4);
  ajoute(new THREE.BoxGeometry(36, 1.4, 22), noirMat, 0, MEUBLE.h + 6.7, MEUBLE.z - 2);
  ajoute(new THREE.BoxGeometry(6, 10, 4), noirMat, 0, MEUBLE.h + 6 + 5, MEUBLE.z - 4);
  const ecranTex = garde(texture(toileEcran(), { repet: [1, 1] }));
  const ecranMat = garde(new THREE.MeshBasicMaterial({ map: ecranTex, toneMapped: false }));
  const ecran = ajoute(new THREE.PlaneGeometry(TV.l - 3, TV.h - 3), ecranMat, 0, TV.y, MEUBLE.z - 2.35, 0, false);
  const lueurTV = new THREE.PointLight(0x5d8cff, 0, 520, 2); lueurTV.position.set(0, TV.y, MEUBLE.z + 30); groupe.add(lueurTV);

  /* --- canapé (sud) et fauteuils solo (ouest, est) en cuir blanc */
  function siege(places, larg) {
    const g = new THREE.Group(), assise = 44, prof = 92, dos = 84, bras = 20, l = places * larg + 2 * bras;
    const ajouteG = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(garde(geo), mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    ajouteG(boiteRonde(l, 22, prof, 4), cuir, 0, 6 + 11, 0);                                                       // socle
    for (let i = 0; i < places; i++) {
      const x = -l / 2 + bras + larg * (i + 0.5);
      ajouteG(boiteRonde(larg - 1.5, 15, prof - 22, 6, 5), cuir, x, 6 + 22 + 7.5, 7);                               // coussin d'assise
      ajouteG(boiteRonde(larg - 2, dos - assise + 8, 20, 7, 5), cuir, x, assise + (dos - assise) / 2 + 2, -prof / 2 + 14, -0.12);   // dossier
      ajouteG(new THREE.BoxGeometry(larg - 14, 0.4, 0.4), cuirCouture, x, 6 + 30.2, 7 + (prof - 22) / 2 - 1.2);      // surpiqûre
    }
    ajouteG(boiteRonde(l, dos - 26, 18, 6), cuir, 0, 26 + (dos - 26) / 2, -prof / 2 + 9);                         // dos
    for (const sx of [-1, 1]) ajouteG(boiteRonde(bras, 60 - 6, prof, 7, 5), cuir, sx * (l / 2 - bras / 2), 6 + 27, 0);   // accoudoirs
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ajouteG(new THREE.CylinderGeometry(1.8, 1.3, 6, 12), chrome, sx * (l / 2 - 8), 3, sz * (prof / 2 - 8));
    return g;
  }
  const canape = siege(3, 62); canape.position.set(0, 0, 168); canape.rotation.y = Math.PI; groupe.add(canape);
  const FAUTEUILS = [[-172, 100], [172, 100]];                                    // gauche et droite, tournés en diagonale vers la télé
  for (const [x, z] of FAUTEUILS) { const f = siege(1, 70); f.position.set(x, 0, z); f.rotation.y = Math.atan2(0 - x, (PIECE.zMin + 30) - z); groupe.add(f); }

  /* --- cheminée encastrée (mur est) : cadre en ardoise, foyer, bûches, flammes animées, vitre */
  const cadre = new THREE.Group(); cadre.position.set(PAN.x - 0.35, 0, PAN.z + 0.35); cadre.rotation.y = Math.PI / 4; groupe.add(cadre);   // local −x = vers la pièce
  const ajouteC = (geo, mat, x, y, z) => { const m = new THREE.Mesh(garde(geo), mat); m.position.set(x, y, z); m.receiveShadow = true; cadre.add(m); return m; };
  const marge = 16;
  ajouteC(new THREE.BoxGeometry(2, marge, FOYER.l + 2 * marge), ardoise, -1, FOYER.y0 + FOYER.h + marge / 2, 0);
  ajouteC(new THREE.BoxGeometry(2, FOYER.y0, FOYER.l + 2 * marge), ardoise, -1, FOYER.y0 / 2, 0);
  for (const s of [-1, 1]) ajouteC(new THREE.BoxGeometry(2, FOYER.h, marge), ardoise, -1, FOYER.y0 + FOYER.h / 2, s * (FOYER.l / 2 + marge / 2));
  ajouteC(new THREE.BoxGeometry(14, 3, FOYER.l + 2 * marge + 20), ardoise, -7, FOYER.y0 + FOYER.h + marge + 1.5, 0);   // tablette
  const suie = garde(new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 1, side: THREE.BackSide }));
  ajouteC(new THREE.BoxGeometry(FOYER.prof * 2, FOYER.h, FOYER.l), suie, FOYER.prof, FOYER.y0 + FOYER.h / 2, 0);
  const ecorce = garde(new THREE.MeshStandardMaterial({ color: 0x3a2516, roughness: 0.95 })), braise = garde(new THREE.MeshStandardMaterial({ color: 0x220800, emissive: 0xc22a00, emissiveIntensity: 0.45, roughness: 1 }));
  for (const [z, ry, r] of [[-22, 0.15, 6], [16, -0.12, 5.5], [-2, 1.45, 5]]) { const b = ajouteC(new THREE.CylinderGeometry(r, r, 60, 14), ecorce, 20, FOYER.y0 + r + 2, z); b.rotation.set(Math.PI / 2, 0, ry); }
  ajouteC(new THREE.BoxGeometry(30, 2, FOYER.l - 20), braise, 22, FOYER.y0 + 1.5, 0);
  // flammes : plans additifs avec un shader de flamme (bruit) piloté par le temps film
  const flammeMat = garde(new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, graine: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float t; uniform float graine;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + graine) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int k=0;k<5;k++){ v += a*n(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){ vec2 uv = vUv; float y = uv.y;
        float forme = 1.0 - smoothstep(0.0, 0.48, abs(uv.x-0.5) + y*y*0.55);
        float flux = fbm(vec2(uv.x*3.0, y*2.2 - t*2.6)) ;
        float f = clamp(forme * (flux*1.6 - y*0.9), 0.0, 1.0);
        vec3 c = mix(vec3(1.0,0.18,0.0), vec3(1.0,0.85,0.35), smoothstep(0.25,0.9,f));
        gl_FragColor = vec4(c * f * 1.7, f); }`,
  }));
  const flammes = [];
  for (let k = 0; k < 7; k++) {
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(28 + rnd() * 16, 40 + rnd() * 18)), flammeMat.clone()); jetables.push(m.material);
    m.material.uniforms.graine.value = k * 13.7; m.position.set(18 + rnd() * 8, FOYER.y0 + 22 + rnd() * 4, -FOYER.l / 2 + 18 + k * (FOYER.l - 36) / 6); m.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.8;
    cadre.add(m); flammes.push(m);
  }
  const vitre = garde(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 0.92, transparent: true, opacity: 0.35, clearcoat: 1, clearcoatRoughness: 0.02 }));
  ajouteC(new THREE.PlaneGeometry(FOYER.l, FOYER.h), vitre, -0.6, FOYER.y0 + FOYER.h / 2, 0).rotation.y = -Math.PI / 2;
  const feu = new THREE.PointLight(0xff7a2a, 0, 650, 2); feu.position.set(-30, FOYER.y0 + 30, 0); feu.castShadow = true; feu.shadow.mapSize.set(1024, 1024); feu.shadow.bias = -0.002; cadre.add(feu);

  /* --- plantes en pot (feuilles semées) */
  function plante(x, z, taille, potCouleur) {
    const g = new THREE.Group(); g.position.set(x, 0, z); groupe.add(g);
    const potGeo = garde(new THREE.LatheGeometry([[0, 0], [9, 0], [11, 3], [13, 26], [14, 28], [13.2, 28.5], [12, 27]].map(([a, b]) => new THREE.Vector2(a * taille, b * taille)), 32));
    const pot = new THREE.Mesh(potGeo, garde(new THREE.MeshStandardMaterial({ color: potCouleur, roughness: 0.35 }))); pot.castShadow = pot.receiveShadow = true; g.add(pot);
    const terre = new THREE.Mesh(garde(new THREE.CircleGeometry(12.2 * taille, 24)), garde(new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 1 }))); terre.rotation.x = -Math.PI / 2; terre.position.y = 26.5 * taille; g.add(terre);
    const feuilleMat = garde(new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.55, side: THREE.DoubleSide }));
    const geoF = garde(new THREE.SphereGeometry(1, 10, 6)); const n = 14 + Math.floor(rnd() * 8);
    for (let k = 0; k < n; k++) {
      const a = k * 2.399 + rnd() * 0.4, inc = 0.35 + rnd() * 0.7, lon = (16 + rnd() * 14) * taille;
      const f = new THREE.Mesh(geoF, feuilleMat); f.scale.set(lon * 0.5, 0.35, lon * 0.18);
      f.position.set(Math.cos(a) * lon * 0.45 * Math.sin(inc), 27 * taille + lon * 0.5 * Math.cos(inc), Math.sin(a) * lon * 0.45 * Math.sin(inc));
      f.rotation.set(0, -a, Math.PI / 2 - inc); f.castShadow = true; g.add(f);
    }
    return g;
  }
  // toutes les plantes sont posées sur le meuble télé : deux grandes aux extrémités, deux succulentes devant
  const dessus = MEUBLE.h + 6;
  for (const [x, dz, sc, c] of [[-89, -4, 0.55, 0xf2f2f2], [89, -4, 0.55, 0xf2f2f2], [-62, 13, 0.28, 0x1b1b1f], [62, 13, 0.28, 0x1b1b1f]]) {
    const pl = plante(x, MEUBLE.z + dz, sc, c); pl.position.y = dessus;
  }

  /* --- sapin de Noël lumineux (coin nord-ouest) */
  const sapin = new THREE.Group(); sapin.position.set(PIECE.xMax - 58, 0, PIECE.zMin + COIN + 52); sapin.scale.setScalar(0.85); groupe.add(sapin);
  const vert = garde(new THREE.MeshStandardMaterial({ color: 0x0f4d2b, roughness: 0.75 }));
  for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(garde(new THREE.ConeGeometry(62 - k * 11, 62, 28)), vert); c.position.y = 52 + k * 33; c.castShadow = true; sapin.add(c); }
  const tronc = new THREE.Mesh(garde(new THREE.CylinderGeometry(6, 7, 30, 12)), ecorce); tronc.position.y = 15; sapin.add(tronc);
  const etoile = new THREE.Mesh(garde(new THREE.OctahedronGeometry(9)), garde(new THREE.MeshBasicMaterial({ color: 0xffe28a, toneMapped: false }))); etoile.position.y = 235; sapin.add(etoile);
  const NB = 140, geoAmp = garde(new THREE.SphereGeometry(1.4, 8, 6)), amp = new THREE.InstancedMesh(geoAmp, garde(new THREE.MeshBasicMaterial({ toneMapped: false })), NB);
  const couleursAmp = [0xffd27a, 0xff4fb8, 0x3f8cff, 0x35e07a, 0xffe23d, 0xff8a2a], phases = [], baseCoul = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < NB; i++) {
    const h = 40 + (i / NB) * 175, r = (62 - (h - 40) / 175 * 55) * 0.98, a = i * 0.9 + rnd() * 0.5;
    m4.makeTranslation(Math.cos(a) * r, h, Math.sin(a) * r); amp.setMatrixAt(i, m4);
    baseCoul.push(new THREE.Color(couleursAmp[i % couleursAmp.length])); phases.push(rnd() * 6.28); amp.setColorAt(i, baseCoul[i]);
  }
  sapin.add(amp);
  const lueurSapin = new THREE.PointLight(0xffc27a, 0, 300, 2); lueurSapin.position.set(PIECE.xMax - 90, 120, PIECE.zMin + COIN + 70); groupe.add(lueurSapin);

  /* --- éclairage d'ambiance : hémisphère chaud, 3 spots encastrés au plafond (ombres douces) */
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x24140f, 0.28); groupe.add(hemi);
  const spots = [];
  for (const [x, z, i] of [[0, 25, 0.9], [-140, -60, 0.4], [130, 130, 0.4]]) {
    const s = new THREE.SpotLight(0xffd6a8, i, 600, Math.PI / 5, 0.6, 2); s.position.set(x, H - 2, z); s.target.position.set(x, 0, z);
    s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0008; s.shadow.radius = 4; groupe.add(s); groupe.add(s.target); spots.push(s);
    ajoute(new THREE.CylinderGeometry(6, 6, 0.6, 24), garde(new THREE.MeshBasicMaterial({ color: 0xfff1dc })), x, H - 0.4, z, 0, false);
  }

  /* --- animation (fonction pure du temps film) */
  const base = { feu: 3.2, tv: 1.6, sapin: 0.9 };
  function maj(t, { intensiteSalon = 1, tvAllumee = 1 } = {}) {
    const vacille = 0.78 + 0.12 * Math.sin(t * 11.3) + 0.07 * Math.sin(t * 23.1 + 1.3) + 0.05 * Math.sin(t * 37.7 + 0.4);
    feu.intensity = base.feu * vacille * intensiteSalon;
    for (const f of flammes) f.material.uniforms.t.value = t;
    lueurTV.intensity = base.tv * tvAllumee * (0.92 + 0.08 * Math.sin(t * 2.1));
    ecranMat.color.setScalar(Math.max(0.02, tvAllumee));
    for (let i = 0; i < NB; i++) { const k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.3 + (i % 5) * 0.37) + phases[i])); col.copy(baseCoul[i]).multiplyScalar(k * intensiteSalon); amp.setColorAt(i, col); }
    amp.instanceColor.needsUpdate = true;
    lune.intensity = 0.55;                                                     // la lune reste, même salon éteint
    lueurSapin.intensity = base.sapin * intensiteSalon; hemi.intensity = 0.28 * intensiteSalon;
    for (const s of spots) s.visible = intensiteSalon > 0.02;
  }
  maj(0);

  const ancres = {
    tapis: { centre: new THREE.Vector3(TAPIS.x, 1.0, TAPIS.z), largeur: TAPIS.l, profondeur: TAPIS.p, y: 1.0 },
    table: { centre: new THREE.Vector3(TABLE.x, TABLE.h, TABLE.z) },
    ecran: { centre: ecran.position.clone(), normale: new THREE.Vector3(0, 0, 1), largeur: TV.l, hauteur: TV.h },
    foyer: { centre: cadre.localToWorld(new THREE.Vector3(-15, FOYER.y0 + FOYER.h / 2, 0)) },
    cameras: {
      ensemble:    { position: [215, 175, 205], cible: [-50, 45, -60], focale_mm: 16 },
      canape:      { position: [0, 108, 195], cible: [0, 70, -200], focale_mm: 22 },
      ras_tapis:   { position: [-78, 3.2, 104], cible: [-22, 2.2, 70], focale_mm: 50 },
      plongee:     { position: [0, 248, 30], cible: [0, 0, 22], focale_mm: 14 },
      cheminee:    { position: [-10, 90, 10], cible: [185, 55, -135], focale_mm: 28 },
      tele:        { position: [-105, 28, -25], cible: [0, 100, -178], focale_mm: 22 },
    },
  };
  return { groupe, maj, ancres, liberer() { for (const o of jetables) if (o && o.dispose) o.dispose(); } };
}

/** Caméra et rendu conseillés pour ce décor (tone mapping, sRGB, ombres). */
export function reglerRendu(renderer) {
  const THREE = T();
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.physicallyCorrectLights = true;
}

/** Carte d'environnement chaude (reflets sur le cuir, la laque, la vitre) générée sans fichier externe. */
export function environnementSalon(renderer) {
  const THREE = T(), sc = new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.BoxGeometry(100, 60, 100), new THREE.MeshBasicMaterial({ color: 0x2a211d, side: THREE.BackSide })));
  const panneau = (c, x, y, z, l, h, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); sc.add(m); };
  panneau(0xfff0d8, 0, 29, 0, 30, 30, 0, Math.PI / 2);     // plafonnier
  panneau(0x6d8cff, 0, 5, -49, 40, 22);                     // télé
  panneau(0xff8a3a, 49, -10, 0, 30, 14, -Math.PI / 2);      // feu
  panneau(0xffd27a, -49, 0, -30, 12, 40, Math.PI / 2);      // sapin
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(sc, 0.02);
  pm.dispose(); return rt.texture;
}
