/* HANGAR DE FRET — le décor réel du suspense : le conteneur n'est plus posé dans un vide de logiciel de CAO.

   Une nef de ≈ 96 × 74 m, 19 m sous fermes, plongée dans la pénombre :
     sol          dalle de béton industriel quartzé (granulat, traces de taloche, joints sciés tous les 6 m, fissures qui partent des
                  joints, traces de pneus de chariots élévateurs, taches d'huile, flaques — moins rugueuses, donc brillantes —,
                  allée de circulation peinte en jaune usé) ; carte de rugosité et de relief dédiées
     structure    poteaux IPN (profil en I extrudé) avec manchons de sécurité jaune/noir, bornes de protection, fermes en treillis
                  d'acier (membrures, montants, diagonales), pannes, bardage ondulé, bandeau de fenêtres hautes (clair de lune)
     manutention  pont roulant (chemins de roulement, poutre, chariot), moufle et élingues en chaîne qui se balancent : le
                  conteneur vient d'être LÂCHÉ
     stock        rangées de conteneurs empilés sur 1 à 3 niveaux dans l'ombre, couleurs d'armateurs délavées
     lumière      suspension industrielle à vapeur de sodium (≈ 2 000 K, ambre) au-dessus du conteneur : projecteur avec ombres
                  portées, cône volumétrique poussiéreux (bruit fBm qui dérive), poussières en suspension ; suspensions lointaines ;
                  brouillard de profondeur ; nappe de brume au ras du sol (trois couches de bruit, éclairées sous la lampe,
                  effacées quand on les voit par la tranche)
     contact      ombres de contact épaisses : empreinte du conteneur (qui s'assombrit à l'atterrissage), pièces de coin ISO et
                  calages d'acier aux quatre coins, chacun avec son ombre
   creerHangar(THREE, { L, P, H, renderer, anisotropie }) → { groupe, solMat, spot, cible, maj(t, dt, { noir, yConteneur, univers, extinction }),
                                                            ombreConteneur, lacher(), basculer(), dispose() } */

const mulberry = (g) => () => { g = (g + 0x6D2B79F5) >>> 0; let t = g; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ------------------------------------------------------------------ textures procédurales */
function canvasTex(THREE, w, h, dessin, { srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dessin(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = aniso; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Dalle de béton : couleur, rugosité et relief cohérents (mêmes fissures, mêmes flaques). Tuile = 24 m. */
function texturesBeton(THREE, aniso) {
  const N = 1024, rnd = mulberry(1931), M = N / 24;                 // M : pixels par mètre
  const fissures = [], flaques = [], huiles = [], traces = [];
  // fissures : marches aléatoires qui partent des joints
  for (let k = 0; k < 16; k++) {
    const surX = rnd() < 0.5, j = Math.floor(rnd() * 4) * 6 * M;
    let x = surX ? j : rnd() * N, y = surX ? rnd() * N : j, a = (surX ? 0 : Math.PI / 2) + (rnd() - 0.5) * 1.2;
    const pts = [[x, y]];
    for (let s = 0; s < 18 + rnd() * 30; s++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * (6 + rnd() * 10); y += Math.sin(a) * (6 + rnd() * 10); pts.push([x, y]); }
    fissures.push({ pts, w: 0.8 + rnd() * 1.4 });
  }
  for (let k = 0; k < 7; k++) flaques.push({ x: rnd() * N, y: rnd() * N, r: (0.6 + rnd() * 1.8) * M, lobes: Array.from({ length: 9 }, () => [(rnd() - 0.5) * 2.2, (rnd() - 0.5) * 1.2, 0.25 + rnd() * 0.55]) });
  for (let k = 0; k < 6; k++) huiles.push({ x: rnd() * N, y: rnd() * N, r: (0.3 + rnd() * 0.6) * M, lobes: Array.from({ length: 4 }, () => [(rnd() - 0.5) * 1.4, (rnd() - 0.5) * 0.8, 0.3 + rnd() * 0.6]) });
  for (let k = 0; k < 5; k++) traces.push({ x0: rnd() * N, y0: rnd() * N, a: rnd() * Math.PI * 2, c: (rnd() - 0.5) * 0.004, l: (6 + rnd() * 10) * M, voie: 0.95 * M });
  const tache = (g, f, couleur) => { for (const [dx, dy, s] of f.lobes || [[0, 0, 1]]) { const r = g.createRadialGradient(f.x + dx * f.r, f.y + dy * f.r, 0, f.x + dx * f.r, f.y + dy * f.r, f.r * s); r.addColorStop(0, couleur); r.addColorStop(0.7, couleur); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.beginPath(); g.arc(f.x + dx * f.r, f.y + dy * f.r, f.r * s, 0, 7); g.fill(); } };
  const repeter = (g, fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };   // raccords sans couture
  const dessinerTraces = (g, couleur, largeur) => {
    g.strokeStyle = couleur; g.lineWidth = largeur; g.lineCap = 'round';
    for (const tr of traces) for (const cote of [-1, 1]) { g.beginPath(); let a = tr.a, x = tr.x0 + Math.cos(tr.a + Math.PI / 2) * tr.voie * cote / 2, y = tr.y0 + Math.sin(tr.a + Math.PI / 2) * tr.voie * cote / 2; g.moveTo(x, y); for (let s = 0; s < tr.l; s += 8) { a += tr.c * 8; x += Math.cos(a) * 8; y += Math.sin(a) * 8; g.lineTo(x, y); } g.stroke(); }
  };
  const carte = canvasTex(THREE, N, N, (g) => {
    g.fillStyle = '#3c3a36'; g.fillRect(0, 0, N, N);
    for (let k = 0; k < 520; k++) {                                            // marbrure de cure du béton
      const x = rnd() * N, y = rnd() * N, r = 20 + rnd() * 110, v = rnd() < 0.5 ? '255,250,240' : '0,0,0';
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${v},${0.025 + rnd() * 0.035})`); gr.addColorStop(1, `rgba(${v},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.lineWidth = 1;
    for (let k = 0; k < 90; k++) { const x = rnd() * N, y = rnd() * N, r = 30 + rnd() * 90; g.strokeStyle = `rgba(255,250,240,${0.02 + rnd() * 0.03})`; g.beginPath(); g.arc(x, y, r, rnd() * 6, rnd() * 6 + 1.6); g.stroke(); }   // coups de taloche
    for (let k = 0; k < 42000; k++) { const l = rnd(); g.fillStyle = l < 0.5 ? `rgba(20,18,16,${0.25 + rnd() * 0.4})` : `rgba(140,134,124,${0.15 + rnd() * 0.3})`; g.fillRect(rnd() * N, rnd() * N, 1 + (rnd() < 0.1 ? 1 : 0), 1 + (rnd() < 0.1 ? 1 : 0)); }   // granulat quartzé
    repeter(g, () => dessinerTraces(g, 'rgba(8,8,8,0.16)', 0.32 * M));         // gomme de chariots élévateurs
    repeter(g, () => { for (const h of huiles) tache(g, h, 'rgba(18,12,6,0.32)'); });
    repeter(g, () => { for (const f of flaques) tache(g, f, 'rgba(10,10,12,0.2)'); });   // béton mouillé : un peu plus sombre
    // joints sciés tous les 6 m (lèvre claire épaufrée + saignée sombre)
    for (let j = 0; j <= 4; j++) { const p = j * 6 * M; g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(p - 1.5, 0, 3, N); g.fillRect(0, p - 1.5, N, 3); g.fillStyle = 'rgba(190,184,172,0.1)'; g.fillRect(p + 1.5, 0, 2, N); g.fillRect(0, p + 1.5, N, 2); }
    repeter(g, () => { for (const f of fissures) { g.strokeStyle = 'rgba(6,5,4,0.85)'; g.lineWidth = f.w; g.beginPath(); f.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } });
    // allée de circulation : deux lignes jaunes de 12 cm, peinture usée par les roues
    for (const z of [9.2 * M, 14.8 * M]) for (let x = 0; x < N; x += 2) { const usure = 0.35 + 0.65 * Math.abs(Math.sin(x * 0.013 + z) * Math.sin(x * 0.051)); if (rnd() < usure) { g.fillStyle = `rgba(214,168,38,${0.45 + 0.4 * rnd()})`; g.fillRect(x, z, 2, 0.12 * M); } }
  }, { aniso });
  const rugosite = canvasTex(THREE, N / 2, N / 2, (g) => {
    const k = 0.5; g.scale(k, k);
    g.fillStyle = 'rgb(214,214,214)'; g.fillRect(0, 0, N, N);                    // béton sec : rugosité ≈ 0,84
    for (let i = 0; i < 9000; i++) { const v = 170 + rnd() * 70 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * N, rnd() * N, 3, 3); }
    repeter(g, () => dessinerTraces(g, 'rgba(150,150,150,0.5)', 0.3 * M));      // gomme : un peu lustrée
    repeter(g, () => { for (const h of huiles) tache(g, h, 'rgba(80,80,80,0.95)'); });
    repeter(g, () => { for (const f of flaques) tache(g, f, 'rgba(80,80,80,1)'); });   // flaques : lustrées (rugosité ≈ 0,3) : elles accrochent la lampe
  }, { srgb: false, aniso });
  const relief = canvasTex(THREE, N / 2, N / 2, (g) => {
    const k = 0.5; g.scale(k, k);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 26000; i++) { const v = 90 + rnd() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * N, rnd() * N, 2, 2); }
    for (let j = 0; j <= 4; j++) { const p = j * 6 * M; g.fillStyle = 'rgb(20,20,20)'; g.fillRect(p - 2, 0, 4, N); g.fillRect(0, p - 2, N, 4); }
    repeter(g, () => { for (const f of fissures) { g.strokeStyle = 'rgb(30,30,30)'; g.lineWidth = f.w + 1; g.beginPath(); f.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } });
    repeter(g, () => { for (const f of flaques) tache(g, f, 'rgba(128,128,128,1)'); });    // l'eau lisse le relief
  }, { srgb: false, aniso });
  return { carte, rugosite, relief };
}

/** Tôle ondulée en niveaux de gris (teintée par instance) avec coulures de rouille. */
function texTole(THREE, aniso, { rouille = 0.5, germe = 7 } = {}) {
  const rnd = mulberry(germe);
  return canvasTex(THREE, 512, 256, (g, w, h) => {
    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const lg = g.createLinearGradient(x, 0, x + 16, 0); lg.addColorStop(0, 'rgba(255,255,255,.28)'); lg.addColorStop(0.5, 'rgba(0,0,0,.42)'); lg.addColorStop(1, 'rgba(255,255,255,.28)'); g.fillStyle = lg; g.fillRect(x, 0, 16, h); }
    for (let i = 0; i < 60 * rouille; i++) { const x = rnd() * w, y = rnd() * h * 0.6, l = 20 + rnd() * 120; const lg = g.createLinearGradient(0, y, 0, y + l); lg.addColorStop(0, 'rgba(92,46,18,.55)'); lg.addColorStop(1, 'rgba(92,46,18,0)'); g.fillStyle = lg; g.fillRect(x, y, 2 + rnd() * 5, l); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 24, 1 + rnd() * 3); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  }, { aniso });
}

/** Manchon de sécurité jaune / noir. */
const texRayures = (THREE) => canvasTex(THREE, 128, 128, (g, w) => { g.fillStyle = '#d8a514'; g.fillRect(0, 0, w, w); g.fillStyle = '#141414'; for (let i = -w; i < w * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - w, w); g.lineTo(i - w, w); g.closePath(); g.fill(); } g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * w, Math.random() * w, 2, 2); });

/** Fenêtres hautes : vitrage armé, menuiseries, clair de lune froid. */
const texFenetres = (THREE) => canvasTex(THREE, 1024, 128, (g, w, h) => {
  g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
  for (let x = 8; x < w; x += 64) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,150,200,.55)'); gr.addColorStop(1, 'rgba(60,80,120,.25)');
    g.fillStyle = gr; g.fillRect(x, 10, 52, h - 20);
    g.strokeStyle = 'rgba(10,12,18,.9)'; g.lineWidth = 3; g.strokeRect(x, 10, 52, h - 20); g.beginPath(); g.moveTo(x + 26, 10); g.lineTo(x + 26, h - 10); g.moveTo(x, h / 2); g.lineTo(x + 52, h / 2); g.stroke();
    g.strokeStyle = 'rgba(20,24,32,.35)'; g.lineWidth = 1; for (let k = 0; k < 52; k += 6) { g.beginPath(); g.moveTo(x + k, 10); g.lineTo(x + k, h - 10); g.stroke(); }   // fil de verre armé
    if (Math.random() < 0.25) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x + 4 + Math.random() * 20, 14 + Math.random() * 40, 20, 30); }   // carreau occulté
  }
});

/* ------------------------------------------------------------------ géométrie : barre entre deux points (instances) */
function poserBarre(THREE, inst, i, a, b, ep, tmp) {
  const d = tmp.v.subVectors(b, a), l = d.length();
  tmp.q.setFromUnitVectors(tmp.y, d.normalize());
  tmp.m.compose(tmp.p.addVectors(a, b).multiplyScalar(0.5), tmp.q, tmp.s.set(ep, l, ep));
  inst.setMatrixAt(i, tmp.m);
}

export function creerHangar(THREE, { L = 9.54, P = 4.4, H = 4.16, renderer = null, anisotropie = 8 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'hangar';
  // les LUMIÈRES restent dans un groupe toujours visible : cacher une lumière change le nombre de lumières de la scène et force la
  // recompilation de TOUS les programmes (plusieurs secondes de gel) ; au passage dans l'univers, on les éteint (intensité 0).
  const lumieres = new THREE.Group(); lumieres.name = 'hangar-lumieres';
  const jetables = [];
  const garde = (x) => { jetables.push(x); return x; };
  const rnd = mulberry(4242);
  const aniso = renderer && renderer.capabilities ? Math.min(anisotropie, renderer.capabilities.getMaxAnisotropy()) : anisotropie;
  const tmp = { v: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), s: new THREE.Vector3(), y: new THREE.Vector3(0, 1, 0) };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* --- sol de béton (matériau du plancher de la scène, appliqué par reveal_fret) */
  const beton = texturesBeton(THREE, aniso);
  for (const t of Object.values(beton)) { garde(t); t.repeat.set(160 / 24, 160 / 24); }
  const solMat = garde(new THREE.MeshStandardMaterial({ map: beton.carte, roughnessMap: beton.rugosite, roughness: 1, metalness: 0.0, bumpMap: beton.relief, bumpScale: 0.018, color: 0xb8b2a8 }));

  /* --- matériaux de structure */
  const tole = garde(texTole(THREE, aniso, { rouille: 0.7, germe: 11 })); tole.repeat.set(1, 1);
  const matAcier = garde(new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.62, metalness: 0.55 }));
  const matAcierPeint = garde(new THREE.MeshStandardMaterial({ color: 0x5a4a1c, roughness: 0.55, metalness: 0.4 }));        // jaune « pont roulant » terni
  const matCont = garde(new THREE.MeshStandardMaterial({ map: tole, roughness: 0.68, metalness: 0.3, bumpMap: tole, bumpScale: 0.05 }));
  const texBard = garde(texTole(THREE, aniso, { rouille: 0.3, germe: 23 })); texBard.repeat.set(26, 3);
  const matBardage = garde(new THREE.MeshStandardMaterial({ map: texBard, color: 0x24272c, roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide }));
  const matRayures = garde(new THREE.MeshStandardMaterial({ map: garde(texRayures(THREE)), roughness: 0.6, metalness: 0.1 }));

  /* --- murs : bardage du fond (z = −44) et du côté gauche (x = −48), bandeau de fenêtres hautes */
  const fond = new THREE.Mesh(garde(new THREE.PlaneGeometry(110, 21)), matBardage); fond.position.set(0, 10.5, -44); groupe.add(fond);
  const gauche = new THREE.Mesh(garde(new THREE.PlaneGeometry(90, 21)), matBardage); gauche.rotation.y = Math.PI / 2; gauche.position.set(-48, 10.5, -4); groupe.add(gauche);
  const texF = garde(texFenetres(THREE)); texF.repeat.set(1, 1);
  const matF = garde(new THREE.MeshBasicMaterial({ map: texF, color: 0x8796b8, toneMapped: true }));
  const fen = new THREE.Mesh(garde(new THREE.PlaneGeometry(100, 2.6)), matF); fen.position.set(0, 15.2, -43.9); groupe.add(fen);
  const fen2 = new THREE.Mesh(fen.geometry, matF); fen2.rotation.y = Math.PI / 2; fen2.position.set(-47.9, 15.2, -4); groupe.add(fen2);

  /* --- poteaux IPN (profil en I extrudé) : files z = −13 (chemin de roulement), z = −43 et x = −47 */
  const forme = new THREE.Shape(), b = 0.5, hI = 0.6, tf = 0.04, tw = 0.025;
  forme.moveTo(-b / 2, -hI / 2); forme.lineTo(b / 2, -hI / 2); forme.lineTo(b / 2, -hI / 2 + tf); forme.lineTo(tw / 2, -hI / 2 + tf); forme.lineTo(tw / 2, hI / 2 - tf);
  forme.lineTo(b / 2, hI / 2 - tf); forme.lineTo(b / 2, hI / 2); forme.lineTo(-b / 2, hI / 2); forme.lineTo(-b / 2, hI / 2 - tf); forme.lineTo(-tw / 2, hI / 2 - tf);
  forme.lineTo(-tw / 2, -hI / 2 + tf); forme.lineTo(-b / 2, -hI / 2 + tf); forme.closePath();
  const geoIPN = garde(new THREE.ExtrudeGeometry(forme, { depth: 1, bevelEnabled: false })); geoIPN.rotateX(-Math.PI / 2);   // extrudé vers +y, hauteur 1 (mise à l'échelle)
  const poteaux = [];
  for (let x = -45; x <= 45; x += 9) { poteaux.push([x, -13]); poteaux.push([x, -42.5]); }
  for (let z = -33; z <= 26; z += 9) poteaux.push([-46.6, z]);
  const ipn = new THREE.InstancedMesh(geoIPN, matAcier, poteaux.length);
  const manchons = new THREE.InstancedMesh(garde(new THREE.BoxGeometry(0.62, 1.3, 0.72)), matRayures, poteaux.length);
  const bornes = new THREE.InstancedMesh(garde(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 12)), matRayures, poteaux.length * 2);
  poteaux.forEach(([x, z], i) => {
    tmp.m.compose(V(x, 0, z), tmp.q.identity(), tmp.s.set(1, 16.6, 1)); ipn.setMatrixAt(i, tmp.m);
    tmp.m.compose(V(x, 0.65, z), tmp.q.identity(), tmp.s.set(1, 1, 1)); manchons.setMatrixAt(i, tmp.m);
    for (const k of [0, 1]) { tmp.m.compose(V(x + (k ? 0.75 : -0.75), 0.5, z + 0.9), tmp.q.identity(), tmp.s.set(1, 1, 1)); bornes.setMatrixAt(i * 2 + k, tmp.m); }
  });
  groupe.add(ipn, manchons, bornes);

  /* --- fermes en treillis (une tous les 9 m) + pannes */
  const barres = [];
  const zA = -43, zB = 32, yB = 17.0, yH = 19.2;
  for (let x = -45; x <= 45; x += 9) {
    barres.push([V(x, yB, zA), V(x, yB, zB), 0.18], [V(x, yH, zA), V(x, yH, zB), 0.2]);
    let k = 0;
    for (let z = zA; z < zB - 0.1; z += 3, k++) {
      barres.push([V(x, yB, z), V(x, yH, z), 0.1]);
      barres.push(k % 2 ? [V(x, yB, z), V(x, yH, z + 3), 0.09] : [V(x, yH, z), V(x, yB, z + 3), 0.09]);
    }
  }
  for (let z = zA; z <= zB; z += 6) barres.push([V(-46, yH + 0.15, z), V(46, yH + 0.15, z), 0.14]);
  const treillis = new THREE.InstancedMesh(garde(new THREE.BoxGeometry(1, 1, 1)), matAcier, barres.length);
  barres.forEach(([a, c, e], i) => poserBarre(THREE, treillis, i, a, c, e, tmp));
  groupe.add(treillis);

  /* --- pont roulant : chemins de roulement (z = −13 et z = +30), poutre au-dessus du conteneur, chariot, moufle et élingues */
  const ponts = new THREE.Group(); groupe.add(ponts);
  for (const z of [-13, 30]) { const r = new THREE.Mesh(garde(new THREE.BoxGeometry(92, 0.7, 0.45)), matAcier); r.position.set(0, 15.6, z); ponts.add(r); }
  const poutre = new THREE.Mesh(garde(new THREE.BoxGeometry(0.75, 1.1, 43.6)), matAcierPeint); poutre.position.set(0.4, 16.5, 8.5); ponts.add(poutre);
  for (const z of [-13, 30]) { const s = new THREE.Mesh(garde(new THREE.BoxGeometry(2.6, 0.8, 1.1)), matAcierPeint); s.position.set(0.4, 16.1, z); ponts.add(s); }
  const chariot = new THREE.Mesh(garde(new THREE.BoxGeometry(1.8, 0.9, 1.6)), matAcierPeint); chariot.position.set(0.4, 15.6, 0); ponts.add(chariot);
  const moufle = new THREE.Group(); ponts.add(moufle);
  const corpsMoufle = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 20)), matAcierPeint); corpsMoufle.rotation.z = Math.PI / 2; moufle.add(corpsMoufle);
  const crochet = new THREE.Mesh(garde(new THREE.TorusGeometry(0.22, 0.07, 10, 24, Math.PI * 1.5)), matAcier); crochet.position.y = -0.45; crochet.rotation.z = Math.PI * 0.75; moufle.add(crochet);
  // chaînes : maillons (tores) instanciés, recalculés à chaque image
  const geoMaillon = garde(new THREE.TorusGeometry(0.065, 0.019, 6, 12));
  const PAS_M = 0.105, BRINS = 2 + 4, MAX_M = 90;
  const maillons = new THREE.InstancedMesh(geoMaillon, matAcier, BRINS * MAX_M); maillons.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ponts.add(maillons);
  const etatGrue = { lache: -1, yMoufle: H + 7 + 2.4 };
  const chaine = (a, c, debut) => {
    const d = tmp.v.subVectors(c, a), l = d.length(), n = Math.min(MAX_M, Math.max(1, Math.floor(l / PAS_M)));
    const dir = d.clone().normalize(), qa = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), q90 = new THREE.Quaternion().setFromAxisAngle(dir, Math.PI / 2);
    for (let k = 0; k < MAX_M; k++) {
      if (k < n) { const p = a.clone().addScaledVector(dir, (k + 0.5) * l / n), q = k % 2 ? qa.clone().premultiply(q90) : qa.clone(); tmp.m.compose(p, q, tmp.s.set(1, 1.35, 1)); }                       // maillon allongé le long du brin, un sur deux tourné de 90°
      else tmp.m.makeScale(0, 0, 0);
      maillons.setMatrixAt(debut + k, tmp.m);
    }
  };
  const coins = [[L / 2 - 0.2, P / 2 - 0.2], [L / 2 - 0.2, -P / 2 + 0.2], [-L / 2 + 0.2, P / 2 - 0.2], [-L / 2 + 0.2, -P / 2 + 0.2]];
  const majGrue = (t, yConteneur) => {
    // le conteneur arrive suspendu : à t = 0 il est LÂCHÉ, le moufle remonte d'un coup et se balance (pendule amorti)
    const yHaut = 15.15, lBrin = 2.1;
    const libre = t > 0.02;
    const yM = libre ? Math.min(yHaut - 1.2, etatGrue.yMoufle + (yHaut - 1.2 - etatGrue.yMoufle) * Math.min(1, t / 0.9)) : etatGrue.yMoufle;
    const T = 2 * Math.PI * Math.sqrt(Math.max(0.5, yHaut - yM) / 9.81), th = libre ? 0.16 * Math.exp(-t / 3.5) * Math.cos(2 * Math.PI * t / T) : 0, phi = libre ? 0.09 * Math.exp(-t / 3.5) * Math.sin(2 * Math.PI * t / (T * 1.13)) : 0;
    const len = yHaut - yM;
    const pm = V(0.4 + Math.sin(th) * len, yHaut - Math.cos(th) * Math.cos(phi) * len, Math.sin(phi) * len);
    moufle.position.copy(pm); moufle.rotation.set(phi, 0, th);
    chaine(V(0.15, yHaut - 0.4, 0), pm.clone().add(V(-0.12, 0.2, 0)), 0);
    chaine(V(0.65, yHaut - 0.4, 0), pm.clone().add(V(0.12, 0.2, 0)), MAX_M);
    coins.forEach(([cx, cz], k) => {                                                           // élingues : accrochées au conteneur avant le lâcher, pendantes ensuite
      const fin = libre ? pm.clone().add(V(cx * 0.05 + Math.sin(th + k) * 0.08, -lBrin, cz * 0.05 + Math.cos(phi + k) * 0.08)) : V(cx, (yConteneur ?? 7) + H, cz);
      chaine(pm.clone().add(V(0, -0.5, 0)), fin, MAX_M * (2 + k));
    });
    maillons.instanceMatrix.needsUpdate = true;
  };

  /* --- stock de conteneurs empilés dans l'ombre (mêmes cotes que le conteneur héros) */
  const COULEURS = [0x6b3528, 0x2b4560, 0x30503a, 0x4a4d52, 0x7a4722, 0x82847f, 0x5b2230, 0x264a52];
  const piles = [];
  const ligne = (z, xs, hauteurs, rot = 0) => xs.forEach((x, i) => { for (let k = 0; k < hauteurs[i]; k++) piles.push({ x: x + (rnd() - 0.5) * 0.3, y: H / 2 + k * (H + 0.02), z: z + (rnd() - 0.5) * 0.25, r: rot + (rnd() - 0.5) * 0.02, c: COULEURS[(rnd() * COULEURS.length) | 0] }); });
  ligne(-21, [-38, -27.5, -17, -6.5, 4, 14.5, 25], [2, 3, 1, 2, 3, 2, 1]);
  ligne(-26.6, [-38, -27.5, -17, -6.5, 4, 14.5, 25, 35.5], [3, 2, 3, 3, 2, 3, 2, 2]);
  ligne(-34, [-33, -22.5, -12, -1.5, 9, 19.5], [3, 3, 2, 3, 3, 1]);
  ligne(-30, [-12, -6, 0, 6], [2, 1, 2, 2], Math.PI / 2);  // rangée perpendiculaire (casse la répétition)
  ligne(0, [-31], [2], Math.PI / 2); ligne(-9, [-31], [1], Math.PI / 2); ligne(9, [-31], [3], Math.PI / 2);
  const stock = new THREE.InstancedMesh(garde(new THREE.BoxGeometry(L, H, P)), matCont, piles.length);
  const col = new THREE.Color();
  piles.forEach((p, i) => { tmp.m.compose(V(p.x, p.y, p.z), tmp.q.setFromAxisAngle(tmp.y, p.r), tmp.s.set(1, 1, 1)); stock.setMatrixAt(i, tmp.m); stock.setColorAt(i, col.setHex(p.c).multiplyScalar(0.42)); });
  groupe.add(stock);

  /* --- contact au sol du conteneur héros : empreinte sombre, pièces de coin ISO, calages d'acier, ombre de chaque calage */
  const texEmpreinte = garde(canvasTex(THREE, 256, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.max(0, Math.abs(x - w / 2) - w * 0.36) / (w * 0.14), dy = Math.max(0, Math.abs(y - h / 2) - h * 0.3) / (h * 0.2);
      const a = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)); const k = (y * w + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 0; img.data[k + 3] = Math.round(255 * a * a * (3 - 2 * a));
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false, aniso: 1 }));
  texEmpreinte.wrapS = texEmpreinte.wrapT = THREE.ClampToEdgeWrapping;
  const matEmpreinte = garde(new THREE.MeshBasicMaterial({ map: texEmpreinte, transparent: true, opacity: 0, depthWrite: false, color: 0x000000 }));
  const empreinte = new THREE.Mesh(garde(new THREE.PlaneGeometry(L * 1.22, P * 1.5)), matEmpreinte); empreinte.rotation.x = -Math.PI / 2; empreinte.position.y = 0.006; empreinte.renderOrder = 1;
  const contact = new THREE.Group(); contact.add(empreinte);
  const matCoin = garde(new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.5, metalness: 0.65 }));
  const matCale = garde(new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.75, metalness: 0.4 }));
  const texBlob = garde(canvasTex(THREE, 64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.55, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { srgb: false, aniso: 1 }));
  const matBlob = garde(new THREE.MeshBasicMaterial({ map: texBlob, transparent: true, opacity: 0, depthWrite: false, color: 0x000000 }));
  const coinsISO = [], blobs = [];
  for (const [cx, cz] of [[L / 2, P / 2], [L / 2, -P / 2], [-L / 2, P / 2], [-L / 2, -P / 2]]) {
    const sx = Math.sign(cx), sz = Math.sign(cz);
    const coin = new THREE.Mesh(garde(new THREE.BoxGeometry(0.34, 0.24, 0.3)), matCoin); coin.position.set(cx - sx * 0.17, 0.12, cz - sz * 0.15); coinsISO.push(coin);   // pièce de coin (accrochée au conteneur)
    const cale = new THREE.Mesh(garde(new THREE.BoxGeometry(0.75, 0.07, 0.62)), matCale); cale.position.set(cx - sx * 0.2, 0.035, cz - sz * 0.18); contact.add(cale);
    const bl = new THREE.Mesh(garde(new THREE.PlaneGeometry(1.5, 1.25)), matBlob); bl.rotation.x = -Math.PI / 2; bl.position.set(cx - sx * 0.2, 0.008, cz - sz * 0.18); contact.add(bl); blobs.push(bl);
  }
  groupe.add(contact);

  /* --- lumière : suspension sodium au-dessus du conteneur (ombres), suspensions lointaines, brouillard */
  const SODIUM = 0xffa347;
  const spot = new THREE.SpotLight(SODIUM, 3.4, 42, 0.6, 0.65, 1.3);
  spot.position.set(0.5, 14.9, 0.05); const cible = new THREE.Object3D(); cible.position.set(0.7, 0, 0); spot.target = cible;
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.camera.near = 4; spot.shadow.camera.far = 24; spot.shadow.bias = -0.0006; spot.shadow.normalBias = 0.02; spot.shadow.radius = 3;
  lumieres.add(spot, cible);
  const lampes = [];
  const matCloche = garde(new THREE.MeshStandardMaterial({ color: 0x6b6f75, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }));
  const matAmpoule = garde(new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false }));
  const texHalo = garde(canvasTex(THREE, 128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,200,130,1)'); r.addColorStop(0.18, 'rgba(255,170,80,.55)'); r.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, { aniso: 1 }));
  const matHalo = garde(new THREE.SpriteMaterial({ map: texHalo, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  const geoCloche = garde(new THREE.CylinderGeometry(0.22, 0.62, 0.55, 24, 1, true)), geoCap = garde(new THREE.CylinderGeometry(0.2, 0.24, 0.32, 16)), geoAmp = garde(new THREE.CircleGeometry(0.5, 24)), geoTige = garde(new THREE.CylinderGeometry(0.02, 0.02, 1, 6));
  const suspension = (x, y, z, halo = 1) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const cl = new THREE.Mesh(geoCloche, matCloche); g.add(cl);
    const cap = new THREE.Mesh(geoCap, matCloche); cap.position.y = 0.42; g.add(cap);
    const amp = new THREE.Mesh(geoAmp, matAmpoule); amp.rotation.x = Math.PI / 2; amp.position.y = -0.2; g.add(amp);
    const tige = new THREE.Mesh(geoTige, matAcier); tige.scale.y = yB - y - 0.5; tige.position.y = 0.55 + (yB - y - 0.5) / 2; g.add(tige);
    const h = new THREE.Sprite(matHalo); h.scale.setScalar(2.4 * halo); h.position.y = -0.35; g.add(h);
    groupe.add(g); lampes.push({ g, h, amp, base: 2.4 * halo }); return g;
  };
  suspension(0.5, 15.2, 0.05, 1.1);
  for (const [x, z] of [[-27, -6], [-18, -24], [9, -24], [27, -24], [-36, -30], [18, -36], [-9, -36], [27, 6]]) suspension(x, 15.2, z, 0.9);
  const lointaines = [new THREE.PointLight(SODIUM, 0.6, 30, 1.6), new THREE.PointLight(SODIUM, 0.5, 28, 1.6)];
  lointaines[0].position.set(-18, 13.5, -24); lointaines[1].position.set(18, 13.5, -30); lumieres.add(...lointaines);

  /* --- cône volumétrique de la suspension sodium : poussière en volutes (fBm) */
  const fbm = 'float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); } float vb(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); } float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vb(p); p *= 2.03; a *= 0.5; } return s; }';
  const matCone = garde(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { temps: { value: 0 }, force: { value: 1 }, teinte: { value: new THREE.Color(SODIUM) } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; varying float vH; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vH = uv.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float temps, force; uniform vec3 teinte; varying vec3 vW; varying vec3 vN; varying float vH; ' + fbm + ' void main(){ vec3 V = normalize(cameraPosition - vW); float face = pow(abs(dot(normalize(vN), V)), 1.6); float n = fbm(vW * 0.45 + vec3(temps * 0.05, -temps * 0.11, temps * 0.03)); float a = face * smoothstep(0.0, 0.2, vH) * (0.3 + 0.7 * vH) * (0.4 + 0.9 * n) * force; gl_FragColor = vec4(teinte * a * 0.32, 1.0); }',
  }));
  const cone = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.45, 6.4, 14.6, 40, 1, true)), matCone); cone.position.set(0.55, 14.6 / 2 + 0.2, 0.05); groupe.add(cone);
  // poussières en suspension dans le faisceau
  const NP = 420, posP = new Float32Array(NP * 3), graine = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { const y = rnd() * 14, r = Math.sqrt(rnd()) * (0.45 + 5.8 * (1 - y / 14.6)), a = rnd() * 6.283; posP[i * 3] = 0.55 + Math.cos(a) * r; posP[i * 3 + 1] = y; posP[i * 3 + 2] = 0.05 + Math.sin(a) * r; graine[i] = rnd() * 100; }
  const geoP = garde(new THREE.BufferGeometry()); geoP.setAttribute('position', new THREE.BufferAttribute(posP, 3)); geoP.setAttribute('graine', new THREE.BufferAttribute(graine, 1));
  const matP = garde(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { temps: { value: 0 }, force: { value: 1 }, echelle: { value: 600 } },
    vertexShader: 'attribute float graine; uniform float temps, echelle; varying float vA; void main(){ vec3 p = position + vec3(sin(temps * 0.21 + graine) * 0.35, mod(temps * 0.06 + graine * 0.13, 1.0) * 0.6 - 0.3, cos(temps * 0.17 + graine * 1.7) * 0.35); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(echelle * 0.022 / -mv.z, 1.0, 5.0); vA = 0.5 + 0.5 * sin(temps * 2.3 + graine * 4.1); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float force; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(1.0, 0.72, 0.42) * a * vA * 0.9 * force, 1.0); }',
  }));
  const poussieres = new THREE.Points(geoP, matP); groupe.add(poussieres);

  /* --- nappe de brume au ras du sol (sous la dalle du conteneur : rien ne traverse l'intérieur) */
  const matBrume = (hauteur, densite, vitesse) => garde(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { temps: { value: 0 }, force: { value: 1 }, froid: { value: new THREE.Color(0x5d6472) }, chaud: { value: new THREE.Color(0xe0a160) }, lampe: { value: new THREE.Vector2(0.8, 0.6) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float temps, force; uniform vec3 froid, chaud; uniform vec2 lampe; varying vec3 vW; ${fbm} void main(){ vec2 q = vW.xz * 0.11 + vec2(temps * ${vitesse.toFixed(3)}, temps * ${(vitesse * 0.4).toFixed(3)}); float n = fbm(vec3(q, temps * 0.03 + ${hauteur.toFixed(2)})); n = smoothstep(0.32, 0.85, n); float r = length(vW.xz - vec2(1.0, 0.0)); float bord = 1.0 - smoothstep(9.0, 26.0, r); float lum = exp(-dot(vW.xz - lampe, vW.xz - lampe) / 34.0); vec3 V = normalize(cameraPosition - vW); float tranche = smoothstep(0.02, 0.28, abs(V.y)); float a = n * bord * tranche * ${densite.toFixed(3)} * force; gl_FragColor = vec4(mix(froid * 0.55, chaud, lum * 0.85) * (0.45 + 1.1 * lum), a); }`,
  }));
  const brumes = [[0.05, 0.85, 0.06], [0.17, 0.7, 0.045], [0.33, 0.5, 0.035]].map(([y, d, v]) => { const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(60, 60)), matBrume(y, d, v)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 2; groupe.add(m); return m; });

  /* --- maj par image */
  let univers = false;
  const maj = (t, dt, { noir = 0, yConteneur = 0, conteneurX = 0, conteneurZ = 0, extinction = null } = {}) => {
    if (univers) return;
    const pen = 1 - 0.97 * noir;                                              // inserts macro : la lampe s'efface (la pénombre est le sujet)
    spot.intensity = 3.4 * pen; for (const l of lointaines) l.intensity = (l === lointaines[0] ? 0.6 : 0.5) * (1 - 0.5 * noir);
    matCone.uniforms.temps.value = t; matCone.uniforms.force.value = 1 - 0.7 * noir;
    matP.uniforms.temps.value = t; matP.uniforms.force.value = 1 - 0.7 * noir;
    for (const m of brumes) { m.material.uniforms.temps.value = t; m.material.uniforms.force.value = 1 - 0.4 * noir; }
    for (const l of lampes) l.h.scale.setScalar(l.base * (0.97 + 0.03 * Math.sin(t * 100 * Math.PI) ** 2));   // scintillement à 100 Hz du sodium
    if (extinction) {                                                         // MODE DRAME : les lampes meurent une à une (facteurs 0 → 1 par lampe)
      const ks = extinction.spot ?? 1;
      spot.intensity *= ks; matCone.uniforms.force.value *= ks; matP.uniforms.force.value *= ks;
      for (const m of brumes) m.material.uniforms.force.value *= 0.35 + 0.65 * ks;
      lointaines.forEach((l, i) => { l.intensity *= (extinction.lointaines || [])[i] ?? 1; });
      lampes.forEach((l, i) => { const k = (extinction.lampes || [])[i] ?? 1; l.h.scale.multiplyScalar(k); l.amp.visible = k > 0.5; });
    }
    const k = Math.max(0, Math.min(1, 1 - yConteneur / 7));
    matEmpreinte.opacity = 0.9 * k * k; matBlob.opacity = yConteneur < 0.05 ? 0.85 : 0.85 * k * k * 0.6;
    contact.position.set(conteneurX, 0, conteneurZ);
    majGrue(t, yConteneur);
  };
  return {
    groupe, lumieres, solMat, spot, cible, coinsISO, maj,
    /** passage dans l'univers du trailer : le hangar disparaît (aucune recompilation : visibilité et intensités seulement) */
    basculer() {
      univers = true; groupe.visible = false; spot.intensity = 0; for (const l of lointaines) l.intensity = 0;
      if (renderer && renderer.shadowMap) { renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }
    },
    dispose() { for (const x of jetables) { try { x.dispose && x.dispose(); } catch (e) { /* rien */ } } for (const m of [ipn, manchons, bornes, treillis, maillons, stock]) { try { m.dispose(); } catch (e) { /* rien */ } } },
  };
}
