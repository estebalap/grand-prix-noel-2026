/* CONTENEUR « LOOTBOX FRET » du segment arène (V9 Ring) — reconstruction fidèle du conteneur 3D de shared/reveal_fret.js (on ne peut
   pas importer revealFret, qui monte sa propre scène) : mêmes cotes (9,54 × 4,16 × 4,4 unités du reveal, GABARIT de chronologie.js :
   dalle 0,46, tôle 0,16, linteau 0,05), mises à l'échelle K = 3 (1 unité du reveal = 3 cm ici), mêmes éléments et matériaux :
   tôle ondulée anthracite (#3b3f48, texture à bandes + usure), montants d'angle, cônes d'empilage, cales, pièces de coin ISO, coffre du
   rideau, rideau à lames « ? », scellé (plomb + étiquette), bordereau riveté sur le toit, marquage « GP NOËL · FRET ».

   Animation (plan.lootbox = { descente, verrous, entrouvre, fin }) — fonction pure de t :
     descente → verrous − 0,2   le conteneur descend du portique, suspendu à 4 élingues, freine et se pose sur ses cales
     verrous                     verrouillage : petite secousse (ressort amorti), gerbes d'étincelles aux 4 cales
     verrous → entrouvre         les 2 barres de verrouillage de la porte sautent l'une après l'autre (puis le scellé)
     entrouvre →                 le rideau « ? » commence à s'enrouler : lumière DORÉE qui fuit par l'entrebâillement
   creerFret(THREE, { envMap }) → { groupe, K, dims, obb(), maj(t, D, { disparition }) → { lumiere, posLumiere, etincelles } } */
import { clamp, lerp, smoother, doux, ressort, prng, texCanvas, haloSprite, obbFixe } from './arene_outils.js';

const K = 3;
const GAB = { dalle: 0.46, ep: 0.16, linteau: 0.05, hauteurStl: 4.16 };
const BORD = { l: 3.0, p: 1.9 };

export function creerFret(THREE, { envMap = null, yPose = 22 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'lootbox-fret';
  const fret = new THREE.Group(); groupe.add(fret);
  fret.scale.setScalar(K);                                    // on construit en unités du reveal, comme le module d'origine
  const L = 9.54, P = 4.4, H = GAB.hauteurStl, { dalle, ep } = GAB, xO = L / 2;
  const hO = H - ep - GAB.linteau - dalle, yLinteau = H - ep - GAB.linteau;
  const alea = prng('fret-arene');
  const std = (o) => new THREE.MeshStandardMaterial({ envMap, ...o });

  /* textures (mêmes dessins que reveal_fret.js : tôle ondulée, rideau « ? », marquage, bordereau) */
  const tole = texCanvas(THREE, 512, 256, (g, w, h) => {
    g.fillStyle = '#d2d4d8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const lg = g.createLinearGradient(x, 0, x + 16, 0); lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(0.5, 'rgba(0,0,0,.22)'); lg.addColorStop(1, 'rgba(255,255,255,.10)'); g.fillStyle = lg; g.fillRect(x, 0, 16, h); }
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(${alea() < 0.5 ? '255,255,255' : '0,0,0'},${alea() * 0.06})`; g.fillRect(alea() * w, alea() * h, 2 + alea() * 20, 1 + alea() * 3); }
  });
  const texQ = texCanvas(THREE, 512, 512, (g, w, h) => {
    g.fillStyle = '#26282e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = 'rgba(0,0,0,.7)'; g.font = '900 360px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', w / 2 + 8, h / 2 + 32); g.fillStyle = '#ffc83d'; g.fillText('?', w / 2, h / 2 + 22);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(w * 0.3, h * 0.06, w * 0.4, 10);
  });
  const texMarq = texCanvas(THREE, 1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(235,238,245,.92)'; g.font = '900 92px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText('GP NOËL · FRET', 40, h * 0.42);
    g.font = '700 46px Consolas, monospace'; g.fillStyle = 'rgba(255,200,61,.95)'; g.fillText('GPNU LOOT23 · MAX GROSS 34 g', 44, h * 0.8);
  });
  const texBord = texCanvas(THREE, 1024, 648, (g, w, h) => {
    g.fillStyle = '#b4b8bd'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${alea() < 0.5 ? '255,255,255' : '40,44,50'},${0.03 + alea() * 0.06})`; g.fillRect(alea() * w - 100, alea() * h, 120 + alea() * 500, 1); }
    g.strokeStyle = 'rgba(20,24,30,.55)'; g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
    g.fillStyle = '#1b2433'; g.fillRect(46, 46, w - 92, 78);
    g.fillStyle = '#f2f2ee'; g.textBaseline = 'middle'; g.font = '700 30px "Arial Narrow", Arial, sans-serif'; g.fillText('BORDEREAU D’EXPÉDITION CLASSIFIÉ — GP NOËL FRET', 66, 86);
    g.fillStyle = '#121418'; g.font = '900 170px Impact, "Arial Black", sans-serif'; g.fillText('???', 70, 250);
    const champs = [['N° MANIFESTE', 'GPNU LOOT-2312'], ['HOMOLOGATION', 'CAT. ???'], ['DESTINATION', 'GRILLE DE NOËL · 23/12']];
    champs.forEach(([k, v], i) => { const y = 180 + i * 46; g.fillStyle = 'rgba(18,20,24,.7)'; g.font = '700 20px Consolas, monospace'; g.fillText(k, 560, y); g.fillStyle = '#0f1115'; g.font = '700 22px Consolas, monospace'; g.fillText(v, 720, y); });
    g.fillStyle = '#e9ebee'; g.fillRect(60, 410, 620, 150); g.fillStyle = '#0b0c0e';
    for (let x = 80; x < 660; x += 4) if (alea() < 0.55) g.fillRect(x, 420, 2 + Math.floor(alea() * 3), 104);
    g.save(); g.translate(812, 470); g.rotate(-0.21); g.strokeStyle = '#b3261e'; g.lineWidth = 7; g.strokeRect(-170, -100, 340, 200); g.fillStyle = '#b3261e'; g.font = '900 40px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('DOUANE', 0, -30); g.font = '800 28px Arial, sans-serif'; g.fillText('INSPECTÉ · SCELLÉ', 0, 20); g.restore();
  });

  const matTole = std({ map: tole, color: 0x3b3f48, roughness: 0.62, metalness: 0.35, bumpMap: tole, bumpScale: 0.06 });
  const matCadre = std({ color: 0x2a2d34, roughness: 0.5, metalness: 0.5 });
  const matInt = std({ color: 0x15161b, roughness: 0.9, side: THREE.DoubleSide });
  const boite = (w, h, d, m, x, y, z, par = fret) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); par.add(b); return b; };
  boite(L, dalle, P, matCadre, 0, dalle / 2, 0);                                                  // dalle
  boite(L, ep, P, matTole, 0, H - ep / 2, 0);                                                    // toit
  boite(L, H - dalle - ep, ep, matTole, 0, (H + dalle - ep) / 2, P / 2 - ep / 2);                 // flanc avant
  boite(L, H - dalle - ep, ep, matTole, 0, (H + dalle - ep) / 2, -P / 2 + ep / 2);                // flanc arrière
  boite(ep * 1.3, H - dalle - ep, P, matTole, -L / 2 + ep * 0.65, (H + dalle - ep) / 2, 0);       // mur de fond
  for (const z of [P / 2 - 0.12, -P / 2 + 0.12]) for (const x of [xO - 0.14, -xO + 0.14]) boite(0.28, H, 0.28, matCadre, x, H / 2, z);   // montants d'angle
  boite(L * 0.98, 0.02, P * 0.94, matInt, 0, dalle + 0.01, 0);
  for (const x of [L * 0.06, L * 0.34]) { const cn = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 0.2, 20), matCadre); cn.position.set(x, H + 0.1, 0); fret.add(cn); }   // cônes d'empilage
  const cales = [];
  for (const x of [-L * 0.36, L * 0.36]) for (const z of [-P * 0.36, P * 0.36]) { boite(0.7, 0.14, 0.5, matCadre, x, -0.05, z); cales.push([x, z]); }
  const matCoin = std({ color: 0x1c1e22, roughness: 0.45, metalness: 0.7 });
  for (const [cx, cz] of [[L / 2, P / 2], [L / 2, -P / 2], [-L / 2, P / 2], [-L / 2, -P / 2]]) boite(0.34, 0.24, 0.3, matCoin, cx - Math.sign(cx) * 0.17, 0.12, cz - Math.sign(cz) * 0.15);
  for (const [cx, cz] of [[L / 2, P / 2], [L / 2, -P / 2], [-L / 2, P / 2], [-L / 2, -P / 2]]) boite(0.34, 0.24, 0.3, matCoin, cx - Math.sign(cx) * 0.17, H - 0.12, cz - Math.sign(cz) * 0.15);
  const marquage = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshBasicMaterial({ map: texMarq, transparent: true }));
  marquage.position.set(-0.6, H * 0.56, P / 2 + 0.005); fret.add(marquage);
  const matLiseret = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc83d').multiplyScalar(1.4), toneMapped: false });
  for (const [lx, lz, px, pz] of [[L * 1.004, 0.035, 0, P / 2 + 0.012], [L * 1.004, 0.035, 0, -P / 2 - 0.012], [0.035, P * 1.004, L / 2 + 0.012, 0], [0.035, P * 1.004, -L / 2 - 0.012, 0]]) boite(lx, 0.06, lz, matLiseret, px, dalle - 0.03, pz);
  boite(0.42, H - yLinteau + 0.34, P - 0.2, matCadre, xO + 0.17, (yLinteau + H + 0.34) / 2, 0);   // coffre du rideau
  // bordereau riveté dans le toit
  const bord = new THREE.Mesh(new THREE.BoxGeometry(BORD.l, 0.012, BORD.p), [matCadre, matCadre, std({ map: texBord, metalness: 0.7, roughness: 0.4 }), matCadre, matCadre, matCadre]);
  bord.position.set(xO - 0.62 - BORD.l / 2, H + 0.007, 0); fret.add(bord);
  const matRivet = std({ color: 0x8c9198, metalness: 0.9, roughness: 0.35 });
  for (const [rx, rz] of [[0.07, 0.07], [1.0, 0.07], [2.0, 0.07], [2.93, 0.07], [0.07, 1.83], [1.0, 1.83], [2.0, 1.83], [2.93, 1.83]]) {
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), matRivet); r.position.set(xO - 0.62 - BORD.l + rx, H + 0.013, BORD.p / 2 - rz); fret.add(r);
  }
  // rideau métallique « ? » en lames
  const nLames = Math.max(10, Math.round(hO / 0.24)), hL = hO / nLames;
  const matFace = std({ map: texQ, roughness: 0.55, metalness: 0.35, emissive: new THREE.Color('#ffffff'), emissiveMap: texQ, emissiveIntensity: 0.12 });
  const lames = [];
  for (let i = 0; i < nLames; i++) {
    const g = new THREE.BoxGeometry(0.09, hL * 0.94, P - 0.34);
    const uv = g.attributes.uv; for (let k = 0; k < 4; k++) uv.setY(k, (uv.getY(k) * 0.94 + 0.03 + i) / nLames);
    const m = new THREE.Mesh(g, [matFace, matCadre, matCadre, matCadre, matCadre, matCadre]);
    m.position.set(xO + 0.08, dalle + (i + 0.5) * hL, 0); fret.add(m); lames.push({ m, y0: dalle + (i + 0.5) * hL });
  }
  // barres de verrouillage de la porte (2) + scellé (plomb + étiquette)
  const matBarre = std({ color: 0xc9ccd4, metalness: 0.95, roughness: 0.25 });
  const barres = [-0.9, 0.9].map((z) => {
    const g = new THREE.Group(); g.position.set(xO + 0.2, dalle + hO / 2, z); fret.add(g);
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, hO * 1.02, 10), matBarre); g.add(tige);
    const poignee = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), std({ color: 0xffc83d, metalness: 0.8, roughness: 0.3 })); poignee.position.set(0.08, -hO * 0.12, z > 0 ? -0.3 : 0.3); g.add(poignee);
    for (const y of [-hO / 2, hO / 2]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), matBarre); c.position.y = y; g.add(c); }
    return { g, z, base: g.position.clone() };
  });
  const scelle = new THREE.Group(); scelle.position.set(xO + 0.32, dalle + hO * 0.38, -0.55); fret.add(scelle);
  scelle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 12), std({ color: 0xd0d4dc, metalness: 0.9, roughness: 0.3 })));
  const etiq = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.18), std({ color: 0xe8202f, roughness: 0.5, emissive: new THREE.Color('#e8202f'), emissiveIntensity: 0.3 })); etiq.position.set(0.02, -0.28, 0); scelle.add(etiq);
  const scelleBase = scelle.position.clone();

  /* fuite de lumière dorée : fond intérieur incandescent, lueur dans l'entrebâillement, rais additifs, flaque au sol */
  const matOr = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc65a').multiplyScalar(1.5), toneMapped: false });
  const fondOr = new THREE.Mesh(new THREE.PlaneGeometry(P - 0.4, hO), matOr); fondOr.rotation.y = Math.PI / 2; fondOr.position.set(xO - 0.35, dalle + hO / 2, 0); fret.add(fondOr);
  const texRai = texCanvas(THREE, 256, 64, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(255,255,255,1)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); }, { srgb: false });
  const matRai = new THREE.MeshBasicMaterial({ map: texRai, color: new THREE.Color('#ffc65a').multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const rais = new THREE.Group(); rais.position.set(xO + 0.25, dalle, 0); fret.add(rais);
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), matRai); m.position.set(2.5, 0, -1.6 + i * 0.8); m.rotation.x = Math.PI / 2 + (i % 2 ? 0.25 : -0.25); rais.add(m); }
  const lisere = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, P - 0.3), matOr); lisere.position.set(xO + 0.15, dalle + 0.03, 0); fret.add(lisere);
  const flaque = haloSprite(THREE, '#ffc65a', 6, 0); flaque.position.set(xO + 1.6, dalle + 0.2, 0); fret.add(flaque);

  /* élingues (4) vers le portique */
  const matElingue = new THREE.MeshBasicMaterial({ color: 0xdcdcf0 });
  const elingues = [[xO - 0.3, P / 2 - 0.3], [xO - 0.3, -P / 2 + 0.3], [-xO + 0.3, P / 2 - 0.3], [-xO + 0.3, -P / 2 + 0.3]].map(([x, z]) => {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), matElingue); e.geometry.translate(0, 0.5, 0); e.position.set(x, H, z); fret.add(e); return e;
  });

  /* étincelles aux cales (gerbes balistiques semées, fonction pure de t) */
  const NE = 26 * 4, posE = new Float32Array(NE * 3), velE = [];
  cales.forEach(([x, z]) => { for (let i = 0; i < 26; i++) { const a = alea() * Math.PI * 2, v = 2 + alea() * 4; velE.push([x, z, Math.cos(a) * v, 2 + alea() * 3.5, Math.sin(a) * v, 0.25 + alea() * 0.35]); } });
  const geoE = new THREE.BufferGeometry(); geoE.setAttribute('position', new THREE.BufferAttribute(posE, 3));
  const matE = new THREE.PointsMaterial({ color: new THREE.Color('#ffd23d').multiplyScalar(3), size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const etincelles = new THREE.Points(geoE, matE); etincelles.frustumCulled = false; fret.add(etincelles);

  /* éclat doré de la disparition */
  const eclat = haloSprite(THREE, '#ffd27a', 70, 0); eclat.position.y = 6; groupe.add(eclat);

  const dims = { L: L * K, P: P * K, H: H * K };
  groupe.rotation.y = -Math.PI / 2;                           // porte (+x local) tournée vers +z (vers la caméra des plans lootbox)
  let visibleObb = false;

  function maj(t, D, { disparition = 0 } = {}) {
    const tPose = D.verrous - 0.2;
    // descente : de 300 cm au-dessus du tapis, freinage doux, contact à tPose, petit rebond puis secousse du verrouillage
    const u = clamp((t - D.descente) / (tPose - D.descente));
    const hauteur = 300 * (1 - smoother(u)) * (1 - smoother(u));
    const rebond = -0.5 * ressort(t - tPose, 20, 0.35) - 0.35 * ressort(t - D.verrous, 26, 0.3);
    const secousse = 0.035 * ressort(t - D.verrous, 34, 0.25);
    const monte = 260 * smoother((disparition - 0.1) / 0.9), ech = 1 - 0.85 * smoother((disparition - 0.35) / 0.65);
    groupe.position.set(0, yPose + Math.max(0, hauteur) + rebond + monte, 0);
    fret.rotation.set(secousse, 0, -secousse * 0.6);
    fret.scale.setScalar(K * ech);
    groupe.visible = t >= D.descente - 0.4 && ech > 0.16;
    visibleObb = groupe.visible && disparition < 0.05;
    // élingues : tendues vers le haut pendant la descente, larguées (remontent) après le verrouillage
    const largue = smoother((t - D.verrous - 0.1) / 0.6);
    for (const e of elingues) { e.visible = largue < 0.99; e.scale.set(1, 140 * (1 - largue) + 0.01, 1); e.position.y = H + largue * 40; }
    // étincelles
    const te = t - D.verrous + 0.02;
    etincelles.visible = te > 0 && te < 0.75;
    for (let i = 0; i < NE; i++) {
      const [x, z, vx, vy, vz, vie] = velE[i], a = clamp(te / vie) * vie;
      posE[i * 3] = x + vx * a; posE[i * 3 + 1] = Math.max(-0.1, 0.02 + vy * a - 4.9 * a * a); posE[i * 3 + 2] = z + vz * a;
    }
    geoE.attributes.position.needsUpdate = true; matE.opacity = clamp(1 - te / 0.75);
    // barres de verrouillage qui sautent l'une après l'autre, puis le scellé
    barres.forEach((b, i) => {
      const ts = t - (D.verrous + 0.45 + i * 0.42), a = Math.max(0, ts);
      const vole = ts > 0;
      b.g.visible = a < 0.9;
      b.g.position.set(b.base.x + 2.2 * a, b.base.y + (vole ? 4.5 * a - 4.9 * a * a : 0), b.base.z + Math.sign(b.z) * 1.6 * a);
      b.g.rotation.set(vole ? a * 9 * Math.sign(b.z) : 0, 0, vole ? -a * 6 : 0);
    });
    const tsc = Math.max(0, t - (D.entrouvre - 0.35));
    scelle.visible = tsc < 0.9; scelle.position.set(scelleBase.x + 2.5 * tsc, scelleBase.y + 3 * tsc - 4.9 * tsc * tsc, scelleBase.z - 1 * tsc); scelle.rotation.set(tsc * 7, 0, tsc * 5);
    // rideau : commence à s'enrouler (entrebâillement)
    const ouv = 0.42 * hO * smoother((t - D.entrouvre) / 2.2) + 0.03 * hO * smoother((t - D.entrouvre) / 0.15);
    for (const l of lames) { const y = l.y0 + ouv; l.m.position.y = Math.min(y, yLinteau + 0.6); l.m.visible = y < yLinteau + 0.15; }
    const fuite = smoother((t - D.entrouvre) / 0.5) * (1 - disparition);
    fondOr.visible = fuite > 0.01; matRai.opacity = 0.35 * fuite; rais.scale.set(1, 1, 1); rais.children.forEach((m, i) => { m.scale.set(1, Math.max(0.05, ouv * 1.3), 1); m.position.y = ouv * 0.5; });
    lisere.position.y = dalle + ouv; flaque.material.opacity = 0.6 * fuite; flaque.scale.set(4 + ouv * 4, 4 + ouv * 4, 1);
    eclat.material.opacity = Math.sin(Math.PI * clamp(disparition)) * 1.0; eclat.visible = disparition > 0.01 && disparition < 0.99;
    eclat.scale.setScalar(60 + 160 * disparition);
    return { lumiere: 2.2 * fuite + 6 * Math.sin(Math.PI * clamp(disparition)), posLumiere: [0, yPose + 8, 14 + ouv] };
  }
  /** OBB de collision du conteneur (repère monde). */
  function obb() {
    if (!visibleObb) return null;
    return obbFixe('conteneur Lootbox', [groupe.position.x, groupe.position.y + dims.H / 2, groupe.position.z], [dims.P / 2 + 0.6, dims.H / 2, dims.L / 2 + 1.2], 0);
  }
  function cacher() { groupe.visible = false; visibleObb = false; }
  return { groupe, K, dims, maj, obb, cacher };
}
