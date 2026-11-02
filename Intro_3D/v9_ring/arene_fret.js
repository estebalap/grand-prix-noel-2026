/* CONTENEUR « LOOTBOX FRET » du segment arène (V9 Ring) — reconstruction fidèle du conteneur 3D de shared/reveal_fret.js (on ne peut
   pas importer revealFret, qui monte sa propre scène) : mêmes cotes (9,54 × 4,16 × 4,4 unités du reveal, GABARIT de chronologie.js :
   dalle 0,46, tôle 0,16, linteau 0,05), mises à l'échelle K = 3 (1 unité du reveal = 3 cm ici), mêmes éléments et matériaux :
   tôle ondulée anthracite (#3b3f48, texture à bandes + usure), montants d'angle, cônes d'empilage, cales, pièces de coin ISO, coffre du
   rideau, rideau à lames « ? », scellé (plomb + étiquette), bordereau riveté sur le toit, marquage « GP NOËL · FRET ».

   Animation (plan.lootbox = { descente, verrous, entrouvre, ouvert, trophee_sort, fin }) — fonction pure de t :
     descente → pose             (pose = D.pose, V9.3 : ≈ 63 % de descente → verrous) descente LENTE suspendue à 4 élingues,
                                 ATTERRISSAGE LOURD sur les cales (rebond, secousse, gerbes d'étincelles aux 4 cales)
     pose → verrous              LONGUE ATTENTE : le conteneur tremble par à-coups, des filets de lumière dorée fuient par les
                                 joints de la porte, un peu de fumée s'en échappe
     verrous →                   les 2 barres de verrouillage sautent UNE À UNE, puis le scellé
     entrouvre → ouvert          le rideau « ? » s'enroule COMPLÈTEMENT (ouvert à « ouvert ») : lumière DORÉE (fond incandescent
                                 au mur du fond, rais additifs, flaque) et FUMÉE dorée qui s'échappent par la porte
     trophee_sort →              un TIROIR doré (plateau sur glissières) sort par la porte avec la coupe (e.tiroir, en cm), puis rentre
     e.enfonce 0 → 1             le conteneur s'enfonce dans le tapis (trappe) avec un éclat doré, puis disparaît
   creerFret(THREE, { envMap, yPose }) → { groupe, fumee, K, dims, Y_PLATEAU, Z_TROPHEE, maj(t, D, { tiroir, enfonce }) → { lumiere, posLumiere },
                                          obb() (boîte pleine : voitures), murs() (parois : trophée, intérieur creux), cacher() } */
import { clamp, lerp, smoother, doux, ressort, prng, texCanvas, haloSprite, obbFixe } from './arene_outils.js';

const K = 3;
const GAB = { dalle: 0.46, ep: 0.16, linteau: 0.05, hauteurStl: 4.16 };
const BORD = { l: 3.0, p: 1.9 };

export function creerFret(THREE, { envMap = null, yPose = 22, demiH = 540 } = {}) {
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
  const matFondOr = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb84a').multiplyScalar(0.95), toneMapped: false });
  const fondOr = new THREE.Mesh(new THREE.PlaneGeometry(P - 0.4, hO), matFondOr); fondOr.rotation.y = Math.PI / 2; fondOr.position.set(-L / 2 + ep * 1.3 + 0.03, dalle + hO / 2, 0); fret.add(fondOr);      // mur du fond incandescent : la coupe se détache en silhouette
  const texRai = texCanvas(THREE, 256, 64, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(255,255,255,1)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); }, { srgb: false });
  const matRai = new THREE.MeshBasicMaterial({ map: texRai, color: new THREE.Color('#ffc65a').multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const rais = new THREE.Group(); rais.position.set(xO + 0.25, dalle, 0); fret.add(rais);
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), matRai); m.position.set(2.5, 0, -1.6 + i * 0.8); m.rotation.x = Math.PI / 2 + (i % 2 ? 0.25 : -0.25); rais.add(m); }
  const lisere = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, P - 0.3), matOr); lisere.position.set(xO + 0.15, dalle + 0.03, 0); fret.add(lisere);
  const flaque = haloSprite(THREE, '#ffc65a', 6, 0); flaque.position.set(xO + 1.6, dalle + 0.2, 0); fret.add(flaque);
  const lueurInt = haloSprite(THREE, '#ffd27a', 7, 0); lueurInt.position.set(-1.0, dalle + hO * 0.55, 0); fret.add(lueurInt);

  /* TIROIR doré : plateau (8,4 × 7,8 × 0,8 cm) sur deux glissières télescopiques, logé contre la porte ; la coupe y est posée */
  const EP_PLATEAU = 0.8 / K, X_TROPHEE = 2.0;                 // unités du reveal : coupe à 6 cm derrière le centre, côté porte
  const matPlateau = std({ color: 0xffc23a, metalness: 1, roughness: 0.2, emissive: new THREE.Color('#5a3200'), emissiveIntensity: 0.35 });
  const tiroir = new THREE.Group(); fret.add(tiroir);
  boite(2.8, EP_PLATEAU, 2.6, matPlateau, X_TROPHEE, dalle + EP_PLATEAU / 2, 0, tiroir);
  for (const z of [-1.2, 1.2]) boite(2.8, 0.07, 0.08, matLiseret, X_TROPHEE, dalle + EP_PLATEAU + 0.035, z, tiroir);      // filets lumineux
  const glissieres = [-1.05, 1.05].map((z) => boite(1, 0.12, 0.16, matCadre, 0, dalle + 0.06, z));                       // longueur ajustée en maj

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

  /* FUMÉE dorée (repère MONDE, hors du groupe qui s'enfonce) : bouffées semées, émises par la porte, fonction pure de t */
  const NF = 46, posF = new Float32Array(NF * 3), aF = new Float32Array(NF), tF = new Float32Array(NF);
  const semF = Array.from({ length: NF }, (_, i) => ({ u: (i + alea() * 0.8) / NF, lat: (alea() - 0.5) * 2, v: 0.6 + alea() * 0.8, mont: 0.5 + alea(), taille: 0.7 + alea() * 0.7, ph: alea() * 6.28 }));
  const geoF = new THREE.BufferGeometry(); geoF.setAttribute('position', new THREE.BufferAttribute(posF, 3)); geoF.setAttribute('alpha', new THREE.BufferAttribute(aF, 1)); geoF.setAttribute('taille', new THREE.BufferAttribute(tF, 1));
  const matF = new THREE.ShaderMaterial({
    uniforms: { demiH: { value: demiH } },
    vertexShader: `attribute float alpha; attribute float taille; uniform float demiH; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float z = max(-mv.z, 1.0);
        gl_PointSize = clamp(taille * projectionMatrix[1][1] * demiH / z, 0.0, 420.0); vA = alpha; }`,
    fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; float g = exp(-r * 2.6) * (1.0 - smoothstep(0.7, 1.0, r));
        gl_FragColor = vec4(mix(vec3(0.85, 0.66, 0.42), vec3(0.95, 0.82, 0.62), g), vA * g); }`,
    transparent: true, depthWrite: false,
  });
  const fumee = new THREE.Points(geoF, matF); fumee.frustumCulled = false; fumee.name = 'fumee-fret'; fumee.renderOrder = 3;

  /* joints de la porte : liserés dorés additifs autour du rideau (fuite de lumière pendant l'attente) */
  const matJoint = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc65a').multiplyScalar(2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const joints = new THREE.Group(); fret.add(joints);
  for (const z of [-(P / 2 - 0.2), P / 2 - 0.2]) boite(0.03, hO, 0.09, matJoint, xO + 0.15, dalle + hO / 2, z, joints);
  boite(0.03, 0.05, P - 0.4, matJoint, xO + 0.15, yLinteau - 0.03, 0, joints);
  for (let i = 1; i < nLames; i += 3) boite(0.03, 0.025, P - 0.5, matJoint, xO + 0.14, dalle + i * hL, 0, joints);
  const ACOUPS = Array.from({ length: 5 }, (_, i) => (i + 0.15 + 0.7 * alea()) / 5);

  const dims = { L: L * K, P: P * K, H: H * K };
  const Y_PLATEAU = (dalle + EP_PLATEAU) * K, Z_TROPHEE = X_TROPHEE * K;         // dessus du plateau et position de la coupe (repère monde, conteneur posé)
  groupe.rotation.y = -Math.PI / 2;                           // porte (+x local) tournée vers +z (vers la caméra des plans lootbox)
  let visibleObb = false, yCourant = yPose, ouvCourant = 0;

  function maj(t, D, { tiroir: ext = 0, enfonce = 0 } = {}) {
    const tPose = D.pose ?? D.verrous - 0.2;
    // descente : de 300 cm au-dessus du tapis, freinage doux, contact à tPose, petit rebond puis secousse du verrouillage
    const u = clamp((t - D.descente) / (tPose - D.descente));
    const hauteur = 300 * (1 - smoother(u)) * (1 - smoother(u));
    const rebond = -1.1 * ressort(t - tPose, 18, 0.32) - 0.25 * ressort(t - D.verrous, 26, 0.3);         // atterrissage lourd
    // à-coups pendant l'attente (quelque chose bouge à l'intérieur) : impulsions semées entre la pose et l'ouverture du rideau
    let secousse = 0.05 * ressort(t - tPose, 30, 0.25) + 0.03 * ressort(t - D.verrous, 34, 0.25);
    for (let i = 0; i < ACOUPS.length; i++) { const ta = tPose + 0.55 + ACOUPS[i] * (D.entrouvre - tPose - 0.6); secousse += 0.022 * ressort(t - ta, 38, 0.28) * (i % 2 ? -1 : 1); }
    const fond = (dims.H + 1.5) * smoother(enfonce);                                     // s'enfonce entièrement sous le tapis (plateau du ring : 20,5 cm)
    groupe.position.set(0, yPose + Math.max(0, hauteur) + rebond - fond, 0);
    fret.rotation.set(secousse, 0, -secousse * 0.6);
    fret.scale.setScalar(K);
    groupe.visible = t >= D.descente - 0.4 && enfonce < 0.999;
    visibleObb = groupe.visible;
    yCourant = groupe.position.y;
    // élingues : tendues vers le haut pendant la descente, larguées (remontent) après le verrouillage
    const largue = smoother((t - tPose - 0.25) / 0.7);
    for (const e of elingues) { e.visible = largue < 0.99; e.scale.set(1, 140 * (1 - largue) + 0.01, 1); e.position.y = H + largue * 40; }
    // étincelles : à l'atterrissage lourd
    const te = t - tPose + 0.02;
    etincelles.visible = te > 0 && te < 0.75;
    for (let i = 0; i < NE; i++) {
      const [x, z, vx, vy, vz, vie] = velE[i], a = clamp(te / vie) * vie;
      posE[i * 3] = x + vx * a; posE[i * 3 + 1] = Math.max(-0.1, 0.02 + vy * a - 4.9 * a * a); posE[i * 3 + 2] = z + vz * a;
    }
    geoE.attributes.position.needsUpdate = true; matE.opacity = clamp(1 - te / 0.75);
    // barres de verrouillage qui sautent l'une après l'autre, puis le scellé
    barres.forEach((b, i) => {
      const ts = t - (D.verrous + i * 0.45), a = Math.max(0, ts);
      const vole = ts > 0;
      b.g.visible = a < 0.9;
      b.g.position.set(b.base.x + 2.2 * a, b.base.y + (vole ? 4.5 * a - 4.9 * a * a : 0), b.base.z + Math.sign(b.z) * 1.6 * a);
      b.g.rotation.set(vole ? a * 9 * Math.sign(b.z) : 0, 0, vole ? -a * 6 : 0);
    });
    const tsc = Math.max(0, t - Math.min(D.verrous + 0.9, D.entrouvre - 0.2));
    scelle.visible = tsc < 0.9; scelle.position.set(scelleBase.x + 2.5 * tsc, scelleBase.y + 3 * tsc - 4.9 * tsc * tsc, scelleBase.z - 1 * tsc); scelle.rotation.set(tsc * 7, 0, tsc * 5);
    // rideau : à-coup de déverrouillage puis enroulement COMPLET à D.ouvert
    const dOuv = Math.max(0.3, D.ouvert - D.entrouvre);
    const ouv = hO * (0.06 * smoother((t - D.entrouvre) / 0.15) + 0.94 * smoother((t - D.entrouvre - 0.1) / (dOuv - 0.1)));
    ouvCourant = ouv;
    for (const l of lames) { const y = l.y0 + ouv; l.m.position.y = Math.min(y, yLinteau + 0.6); l.m.visible = y < yLinteau + 0.15; }
    const fuite = smoother((t - D.entrouvre) / 0.5) * (1 - smoother(enfonce * 1.6));
    const grand = smoother((t - D.entrouvre) / dOuv);
    fondOr.visible = fuite > 0.01; matRai.opacity = (0.22 + 0.08 * grand) * fuite;
    rais.children.forEach((m) => { m.scale.set(1 + 0.5 * grand, Math.max(0.05, ouv * 1.2), 1); m.position.y = ouv * 0.5; });
    lisere.position.y = dalle + ouv; lisere.visible = ouv < hO * 0.99;
    flaque.material.opacity = 0.4 * fuite; flaque.scale.set(4 + ouv * 4, 4 + ouv * 4, 1);
    lueurInt.material.opacity = 0.28 * fuite; lueurInt.scale.setScalar(5 + 3 * grand);
    // filets de lumière dorée par les joints de la porte pendant l'attente (scintillent, s'effacent quand le rideau monte)
    const joint = smoother((t - tPose - 0.4) / 1.0) * (1 - smoother((t - D.entrouvre - 0.4) / 0.6)) * (1 - smoother(enfonce * 2));
    matJoint.opacity = joint * (0.65 + 0.35 * Math.sin(t * 13) * Math.sin(t * 7.3)); joints.visible = joint > 0.01;
    // tiroir : le plateau glisse vers la porte (+x local) ; glissières télescopiques
    const exL = ext / K;
    tiroir.position.x = exL;
    glissieres.forEach((g) => { const lg = Math.max(0.05, exL + 1.2); g.scale.x = lg; g.position.x = X_TROPHEE - 1.2 + lg / 2; g.visible = exL > 0.02; });
    // fumée : bouffées émises entre « entrouvre + 0,15 » et « trophee_sort + 1,6 », vie 2,4 s
    const t0 = tPose + 0.6, dur = (D.trophee_sort + 1.6) - t0, vie = 2.4, yP = yPose + Math.max(0, hauteur);
    let nf = 0;
    semF.forEach((q, i) => {
      const age = t - (t0 + q.u * dur);
      if (age < 0 || age > vie) { aF[i] = 0; tF[i] = 0; posF.set([0, -50, 0], i * 3); return; }
      const k = age / vie, av = 16 * q.v * (1 - Math.exp(-age * 1.4));
      // porte : z = L·K/2 (monde, porte vers +z) ; la fumée roule au ras du tapis puis s'élève et s'étale
      posF.set([q.lat * (4 + 10 * k) + Math.sin(age * 1.3 + q.ph) * 1.2, yP + 1.5 + 2.5 * q.mont * age + 6 * k * k, L * K / 2 + 0.5 + av], i * 3);
      aF[i] = 0.09 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - smoother(enfonce * 1.3)) * (0.35 + 0.65 * grand);   // avant l'ouverture : fine fumée qui fuit tF[i] = (5 + 15 * k) * q.taille; nf++;
    });
    fumee.visible = nf > 0;
    geoF.attributes.position.needsUpdate = true; geoF.attributes.alpha.needsUpdate = true; geoF.attributes.taille.needsUpdate = true;
    // éclat doré de la trappe (au ras du tapis) pendant l'enfoncement
    const ec = Math.sin(Math.PI * clamp(enfonce));
    eclat.visible = ec > 0.01; eclat.material.opacity = 0.8 * ec; eclat.scale.setScalar(40 + 50 * enfonce); eclat.position.y = fond + 1.5;            // reste au ras du tapis (le groupe, lui, descend)
    return { lumiere: 0.7 * fuite + 1.2 * ec, posLumiere: [0, yPose + 26, L * K / 2 + 40] };      // la lumière dorée baigne le tapis et les voitures, pas la tôle
  }
  /** OBB de collision du conteneur (repère monde). */
  function obb() {
    if (!visibleObb) return null;
    return obbFixe('conteneur Lootbox', [groupe.position.x, yCourant + dims.H / 2, groupe.position.z], [dims.P / 2 + 0.6, dims.H / 2, dims.L / 2 + 1.2], 0);
  }
  /** Parois du conteneur (repère monde, porte vers +z) : l'intérieur est CREUX, la coupe peut y loger et sortir par la porte.
      Dalle, toit, 2 flancs, mur du fond, coffre du rideau (linteau) et rideau tant qu'il n'est pas enroulé. */
  function murs() {
    if (!visibleObb) return [];
    const y0 = yCourant, hx = dims.P / 2, hz = dims.L / 2, e = ep * K, d = dalle * K;
    const hMur = (H - dalle - ep) * K, yMur = y0 + (H + dalle - ep) / 2 * K;
    const res = [
      obbFixe('conteneur : dalle', [0, y0 + d / 2, 0], [hx, d / 2, hz]),
      obbFixe('conteneur : toit', [0, y0 + (H - ep / 2) * K, 0], [hx, e / 2, hz]),
      obbFixe('conteneur : flanc gauche', [-(hx - e / 2), yMur, 0], [e / 2, hMur / 2, hz]),
      obbFixe('conteneur : flanc droit', [hx - e / 2, yMur, 0], [e / 2, hMur / 2, hz]),
      obbFixe('conteneur : mur du fond', [0, yMur, -(hz - e * 0.65)], [hx, hMur / 2, e * 0.65]),
      obbFixe('conteneur : linteau', [0, y0 + (yLinteau + H + 0.34) / 2 * K, (xO + 0.17) * K], [hx, (H + 0.34 - yLinteau) / 2 * K, 0.21 * K]),
    ];
    const bas = dalle + ouvCourant;                                                    // rideau : de « bas » au linteau
    if (bas < yLinteau - 0.02) res.push(obbFixe('conteneur : rideau', [0, y0 + (bas + yLinteau) / 2 * K, (xO + 0.08) * K], [hx, (yLinteau - bas) / 2 * K, 0.06 * K]));
    return res;
  }
  function cacher() { groupe.visible = false; visibleObb = false; fumee.visible = false; }
  return { groupe, fumee, K, dims, Y_PLATEAU, Z_TROPHEE, Y_LINTEAU: yLinteau * K, maj, obb, murs, cacher };
}
