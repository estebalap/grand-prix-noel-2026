/* FILM de l'intro v4 (animatic) : l'image est une FONCTION PURE DU TEMPS, rendreTemps(t).
   Aucune Math.random(), aucune horloge, aucun état qui dépend de l'image précédente : on peut sauter à n'importe quel
   instant et obtenir exactement la même image qu'en lecture continue (condition de la capture image par image).

   Les voitures sont des maquettes grises / colorées (volumes simples) : ce sont les VRAIS emplacements, trajectoires,
   vitesses et cadrages du film. Au jalon suivant, chaque maquette est remplacée par son modèle m3d (même repère :
   avant = +z local, sol y = 0, 1 unité = 1 cm).

   creerFilm({ renderer, equipes, logos, montage, qualite }) → { scene, camera, rendreTemps(t), planA(t), duree }
*/
import { construireSalon, environnementSalon, graineur, toile } from './decors/salon.js';
import { construireArene, COULEURS_VOIES } from './decors/arene.js';

const T = () => window.THREE;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const doux = (u) => u * u * (3 - 2 * u);
const COURBES = { lin: (u) => u, doux, entree: (u) => u * u * u, sortie: (u) => 1 - (1 - u) ** 3 };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fovDeFocale = (mm) => 2 * Math.atan(24 / (2 * mm)) * 180 / Math.PI;

export async function creerFilm({ renderer, equipes, logos, montage, qualite = 'apercu' }) {
  const THREE = T(), rnd = graineur(4242), { plans, hits, reperes: R, duree } = montage;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const envSalon = environnementSalon(renderer); scene.environment = envSalon;
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.3, 6000);
  renderer.shadowMap.enabled = qualite !== 'brouillon';

  /* ------------------------------------------------------------ décors */
  const salon = construireSalon({ graine: 2312 }); scene.add(salon.groupe);
  const arene = construireArene({ equipes, logos }); scene.add(arene.groupe);
  const C = arene.ancres.ring.centre.clone(), TOP = C.y;                 // centre du ring au niveau du tapis
  const rel = (x, y, z) => new THREE.Vector3(C.x + x, TOP + y, C.z + z);
  const brouillards = { gotham: new THREE.FogExp2(0x0b1430, 0.0045), apoca: new THREE.FogExp2(0x3a1606, 0.0035), arene: arene.ancres.brouillard };

  /* ------------------------------------------------------------ fabrique de maquettes de voitures */
  const matRoue = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6 });
  const matJante = new THREE.MeshStandardMaterial({ color: 0xcfd3da, roughness: 0.2, metalness: 1 });
  const matPhare = new THREE.MeshBasicMaterial({ color: 0xfff4d8, toneMapped: false });
  const matFeu = new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false });
  const geoRoue = new THREE.CylinderGeometry(1, 1, 0.8, 14); geoRoue.rotateZ(Math.PI / 2);
  function voiture(type, c0 = '#999999', c1 = '#444444') {
    const g = new THREE.Group(), carros = new THREE.MeshPhysicalMaterial({ color: c0, roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
    const second = new THREE.MeshPhysicalMaterial({ color: c1, roughness: 0.35, clearcoat: 0.6 }), vitre = new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.1, metalness: 0.6 });
    const boite = (l, h, p, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
    let L = 7.6, W = 3.4, R = 0.85, roues = [];
    if (type === 'f1') {
      L = 8.4; W = 3.6; R = 0.9;
      boite(1.6, 0.9, 7.6, carros, 0, 1.1, 0); boite(0.9, 0.9, 1.6, second, 0, 1.9, -0.6); boite(3.6, 0.2, 0.9, second, 0, 0.75, 4.0); boite(3.0, 0.25, 0.8, second, 0, 2.4, -3.7);
      boite(0.2, 1.2, 0.8, second, 1.4, 1.8, -3.7); boite(0.2, 1.2, 0.8, second, -1.4, 1.8, -3.7);
    } else if (type === 'batmobile') {
      L = 9.6; W = 3.8; R = 1.0;
      boite(3.6, 1.2, 9.2, carros, 0, 1.3, 0); boite(2.0, 0.9, 3.0, vitre, 0, 2.3, -0.8);
      for (const s of [-1, 1]) { const f = boite(0.25, 1.9, 2.4, carros, s * 1.6, 2.4, -3.2); f.rotation.x = -0.4; }
    } else if (type === 'epave') {
      boite(3.4, 1.6, 7.4, carros, 0, 1.6, 0); boite(2.9, 1.2, 3.0, second, 0.2, 2.9, -0.8); boite(0.3, 2.2, 0.3, second, 1.4, 3.4, -3.0);
    } else {                                                                                     // citadine / emblème / figurant
      boite(3.4, 1.4, 7.4, carros, 0, 1.5, 0); boite(2.9, 1.15, 3.6, second, 0, 2.75, -0.5); boite(2.8, 0.9, 0.12, vitre, 0, 2.75, 1.33);
    }
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const r = new THREE.Group(); r.position.set(sx * (W / 2), R, sz * (L / 2 - 1.6)); g.add(r);
      const pneu = new THREE.Mesh(geoRoue, matRoue); pneu.scale.set(1, R, R); r.add(pneu);
      const jante = new THREE.Mesh(new THREE.BoxGeometry(0.85, R * 1.1, 0.25), matJante); r.add(jante); roues.push(r);
    }
    if (type !== 'f1') for (const s of [-1, 1]) { boite(0.7, 0.4, 0.1, matPhare, s * 1.1, 1.6, L / 2 - 0.05); boite(0.7, 0.35, 0.1, matFeu, s * 1.1, 1.7, -L / 2 + 0.05); }
    g.userData = { roues, R, L };
    return g;
  }
  /** Pose une voiture : position monde, cap (rad, 0 = vers +z), distance parcourue (rotation absolue des roues), roulis. */
  function poser(v, p, cap, distance = 0, roulis = 0, tangage = 0) {
    v.position.copy(p); v.rotation.set(tangage, cap, roulis, 'YXZ');
    for (const r of v.userData.roues) r.rotation.x = distance / v.userData.R;
  }

  /* ------------------------------------------------------------ la piste arc-en-ciel sur le ring (5 voies de 8 cm) */
  const VOIE_X = [-16, -8, 0, 8, 16], LONG_PISTE = 146;
  const matsVoies = COULEURS_VOIES.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0, roughness: 0.25, transparent: true, opacity: 0.9 }));
  const piste = new THREE.Group(); scene.add(piste);
  VOIE_X.forEach((x, j) => { const m = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.4, LONG_PISTE), matsVoies[j]); m.position.copy(rel(x, 0.2, 0)); m.receiveShadow = true; piste.add(m); });
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, LONG_PISTE), new THREE.MeshStandardMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.5 })); b.position.copy(rel(s * 20.3, 0.7, 0)); piste.add(b); }
  const surPiste = (j, s) => rel(VOIE_X[j], 0.4, -LONG_PISTE / 2 + s);               // s = distance depuis le bout nord (cm)

  /* ------------------------------------------------------------ distribution */
  const meute = COULEURS_VOIES.map((c) => voiture('citadine', c, '#202028')); meute.forEach((v) => scene.add(v));
  const emblemes = equipes.map((e) => voiture('embleme', e.colors[0], e.colors[1])); emblemes.forEach((v) => scene.add(v));
  // disque holographique (logo) au-dessus de chaque emblème
  const disques = equipes.map((e) => {
    const cv = toile(256, 256, (g, L, H) => {
      g.fillStyle = e.colors[0]; g.beginPath(); g.arc(L / 2, H / 2, 120, 0, 7); g.fill();
      const im = logos[e.id]; g.save(); g.beginPath(); g.arc(L / 2, H / 2, 104, 0, 7); g.clip();
      if (im) { const s = Math.max(208 / im.naturalWidth, 208 / im.naturalHeight); g.drawImage(im, L / 2 - im.naturalWidth * s / 2, H / 2 - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
      g.restore(); g.lineWidth = 10; g.strokeStyle = e.colors[1]; g.beginPath(); g.arc(L / 2, H / 2, 118, 0, 7); g.stroke();
    });
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide, toneMapped: false }));
    scene.add(m); return m;
  });
  const PARC = [];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 13; k++) {
    const rar = hash(r * 31 + k * 7); const c = rar > 0.9 ? '#ffc83d' : rar > 0.7 ? '#b06bff' : rar > 0.4 ? '#3fa9ff' : '#9aa6c4';
    const v = voiture('citadine', '#6b6f7a', '#3a3d46'); scene.add(v);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, toneMapped: false })); glow.rotation.x = -Math.PI / 2; scene.add(glow);
    PARC.push({ v, glow, p: new THREE.Vector3(C.x - 190 - r * 25, 0, C.z - 160 + k * 30) });
  }
  const f1s = ['#1e41ff', '#ff8000', '#27f4d2', '#ff2a2a', '#ff87bc'].map((c) => voiture('f1', c, '#111')); f1s.forEach((v) => scene.add(v));
  const batmobile = voiture('batmobile', '#0b0b0f', '#15151c'); scene.add(batmobile);
  const epave = voiture('epave', '#a8401c', '#5a4636'); scene.add(epave);
  const silhouette = voiture('citadine', '#000000', '#000000'); scene.add(silhouette);
  const liseré = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.2, 8.6), new THREE.MeshBasicMaterial({ color: 0x2fd6c8, transparent: true, opacity: 0.0, side: THREE.BackSide, toneMapped: false })); scene.add(liseré);

  /* ------------------------------------------------------------ accessoires */
  const lampeFlash = new THREE.PointLight(0xffffff, 0, 2000, 0); lampeFlash.position.copy(rel(0, 300, 0)); scene.add(lampeFlash);
  const goutte = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x120a02, roughness: 0.05, metalness: 0.3, clearcoat: 1 })); scene.add(goutte);
  const eclabous = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 24), goutte.material); eclabous.rotation.x = Math.PI / 2; scene.add(eclabous);
  // podium, trône, couronne
  const podium = new THREE.Group(); scene.add(podium);
  const or = new THREE.MeshStandardMaterial({ color: 0xd9a92a, roughness: 0.25, metalness: 1 }), rouge = new THREE.MeshStandardMaterial({ color: 0xa50d18, roughness: 0.4 });
  for (const [x, h, c] of [[-12, 6, 0xc0c0c8], [0, 10, 0xd9a92a], [12, 4, 0xb87333]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(11, h, 11), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.7 })); b.position.set(x, h / 2, 0); b.castShadow = true; podium.add(b); }
  const trone = new THREE.Group(); trone.position.set(0, 10, 0); podium.add(trone);
  const assise = new THREE.Mesh(new THREE.BoxGeometry(7, 2.5, 6), rouge); assise.position.y = 2; trone.add(assise);
  const dossier = new THREE.Mesh(new THREE.BoxGeometry(7, 11, 1.4), rouge); dossier.position.set(0, 7, -2.6); trone.add(dossier);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 6), or); a.position.set(s * 3.9, 3, 0); trone.add(a); }
  const couronne = new THREE.Group(); scene.add(couronne);
  const anneau = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.6, 24, 1, true), or); anneau.material.side = THREE.DoubleSide; couronne.add(anneau);
  for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 6), or); const a = k / 6 * Math.PI * 2; p.position.set(Math.cos(a) * 2.3, 1.6, Math.sin(a) * 2.3); couronne.add(p); }
  // étincelles (pyros, explosion, contacts) : InstancedMesh balistique semé
  const NE = 600, etincelles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.25, 1.4), new THREE.MeshBasicMaterial({ color: 0xffc46b, toneMapped: false }), NE); scene.add(etincelles);
  // Gotham : tours, pluie, chauves-souris, ombre
  const gotham = new THREE.Group(); scene.add(gotham);
  const cvTour = toile(128, 512, (g, L, H) => { g.fillStyle = '#05070d'; g.fillRect(0, 0, L, H); for (let y = 8; y < H; y += 16) for (let x = 6; x < L; x += 14) if (hash(x * 13 + y) > 0.72) { g.fillStyle = hash(x + y * 7) > 0.5 ? '#ffd27a' : '#9fc3ff'; g.fillRect(x, y, 7, 9); } });
  const texTour = new THREE.CanvasTexture(cvTour); texTour.encoding = THREE.sRGBEncoding;
  for (let k = 0; k < 22; k++) {
    const a = (0.62 + k / 21 * 0.76) * Math.PI, R0 = 260 + hash(k) * 140, h = 120 + hash(k * 3) * 260, l = 30 + hash(k * 5) * 40;
    const tour = new THREE.Mesh(new THREE.BoxGeometry(l, h, l), new THREE.MeshStandardMaterial({ map: texTour, emissive: 0xffffff, emissiveMap: texTour, emissiveIntensity: 0.6, roughness: 0.6 }));
    tour.position.set(C.x + Math.sin(a) * R0, h / 2, C.z + Math.cos(a) * R0); gotham.add(tour);
  }
  const NP = 700, posPluie = new Float32Array(NP * 6), geoPluie = new THREE.BufferGeometry(); geoPluie.setAttribute('position', new THREE.BufferAttribute(posPluie, 3));
  const pluie = new THREE.LineSegments(geoPluie, new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.55 })); gotham.add(pluie);
  const signal = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.35, toneMapped: false })); signal.position.copy(rel(-120, 420, -420)); signal.lookAt(rel(0, 0, 200)); gotham.add(signal);
  const chauves = new THREE.InstancedMesh(new THREE.ConeGeometry(1.4, 0.4, 3), new THREE.MeshBasicMaterial({ color: 0x050507 }), 24); scene.add(chauves);
  const ombre = new THREE.Mesh(new THREE.PlaneGeometry(14, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85 })); scene.add(ombre);
  const lueursRire = [new THREE.PointLight(0x8f4dff, 0, 400, 1), new THREE.PointLight(0x35e07a, 0, 400, 1)]; lueursRire.forEach((l) => scene.add(l));
  // F1 : garages
  const stands = new THREE.Group(); scene.add(stands);
  for (let k = 0; k < 5; k++) { const gar = new THREE.Mesh(new THREE.BoxGeometry(24, 18, 16), new THREE.MeshStandardMaterial({ color: 0x1c1f2a, emissive: 0x223355, emissiveIntensity: 0.4 })); gar.position.set(C.x - 48 + k * 24, 9, C.z - 125); stands.add(gar); }
  // Apocalypse : épaves dispersées, boule de feu
  const desert = new THREE.Group(); scene.add(desert);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.2, R0 = 110 + hash(k * 9) * 80; const v = voiture('epave', hash(k) > 0.5 ? '#5d3a22' : '#4a4a40', '#2c2620'); v.position.set(C.x + Math.sin(a) * R0, 0, C.z + Math.cos(a) * R0); v.rotation.set(hash(k * 2) * 0.5, a, hash(k * 4) * 0.6); desert.add(v); }
  const boule = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, toneMapped: false })); scene.add(boule);
  const lumBoule = new THREE.PointLight(0xff7a1a, 0, 900, 1); scene.add(lumBoule);
  // caisses mystère (conteneurs imprimés, couleurs mates variées)
  const TEINTES = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440', '#6d6875'];
  const caisses = TEINTES.map((c, i) => {
    const g = new THREE.Group(); scene.add(g);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
    const ouvert = new THREE.MeshBasicMaterial({ visible: false }), parois = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide });
    const corps = new THREE.Mesh(new THREE.BoxGeometry(11, 7, 11), [parois, parois, ouvert, parois, parois, parois]); corps.position.y = 3.5;   // caisse ouverte sur le dessus
    corps.castShadow = true; g.add(corps);
    const charniere = new THREE.Group(); charniere.position.set(0, 7, -5.5); g.add(charniere);
    const couvercle = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.4, 11.4), mat); couvercle.position.set(0, 0.7, 5.5); charniere.add(couvercle);
    const rar = i === 4 ? '#2fd6c8' : ['#ffc83d', '#b06bff', '#3fa9ff', '#9aa6c4'][i % 4];
    const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: rar, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    scene.add(faisceau);
    return { g, charniere, faisceau, haut: i === 0 ? 220 : 60 + hash(i * 3) * 90, x: (i % 3 - 1) * 40, z: (Math.floor(i / 3) - 1) * 40 };
  });
  // pièges
  const banane = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.7, 8, 16, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0xffe23d, roughness: 0.4 })); banane.rotation.x = -Math.PI / 2; scene.add(banane);
  const carapace = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4), new THREE.MeshStandardMaterial({ color: 0x2f6bff, emissive: 0x1030a0, emissiveIntensity: 0.6, roughness: 0.3 })); scene.add(carapace);
  // paris : téléphone géant, pièces, carnet papier
  const cvTel = toile(512, 1024, (g, L, H) => {
    g.fillStyle = '#0a0d1e'; g.fillRect(0, 0, L, H); g.fillStyle = '#ffc83d'; g.font = '900 54px sans-serif'; g.textAlign = 'center'; g.fillText('PARIS EN DIRECT', L / 2, 110);
    COULEURS_VOIES.forEach((c, j) => { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(30, 180 + j * 150, L - 60, 120); g.fillStyle = c; g.fillRect(30, 180 + j * 150, 18, 120);
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 40px sans-serif'; g.fillText(`VOIE ${j + 1}`, 70, 250 + j * 150); g.textAlign = 'right'; g.fillStyle = '#35e07a'; g.font = '900 54px sans-serif'; g.fillText((1.6 + hash(j) * 6).toFixed(2), L - 60, 258 + j * 150); });
  });
  const texTel = new THREE.CanvasTexture(cvTel); texTel.encoding = THREE.sRGBEncoding;
  const telephone = new THREE.Group(); scene.add(telephone);
  const coque = new THREE.Mesh(new THREE.BoxGeometry(64, 128, 6), new THREE.MeshPhysicalMaterial({ color: 0x15151c, roughness: 0.2, metalness: 0.6, clearcoat: 1 })); telephone.add(coque);
  const ecranTel = new THREE.Mesh(new THREE.PlaneGeometry(58, 116), new THREE.MeshBasicMaterial({ map: texTel, toneMapped: false })); ecranTel.position.z = 3.1; telephone.add(ecranTel);
  const NPi = 40, pieces = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 18), new THREE.MeshStandardMaterial({ color: 0xffc83d, roughness: 0.2, metalness: 1 }), NPi); scene.add(pieces);
  const carnet = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 16), new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.9 })); scene.add(carnet);
  // la Coupe arc-en-ciel et ses rayons
  const coupe = new THREE.Group(); scene.add(coupe);
  const profil = [[0, 0], [5, 0], [5, 1], [1.6, 2], [1.2, 7], [2, 8], [6, 11], [7, 17], [6.6, 17.5], [5.6, 12], [0, 9]].map(([a, b]) => new THREE.Vector2(a, b));
  coupe.add(new THREE.Mesh(new THREE.LatheGeometry(profil, 40), or));
  COULEURS_VOIES.forEach((c, k) => { const b = new THREE.Mesh(new THREE.TorusGeometry(6.15 + k * 0.17, 0.32, 8, 40), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); b.rotation.x = Math.PI / 2; b.position.y = 11.6 + k * 1.1; coupe.add(b); });
  const rayons = new THREE.Group(); scene.add(rayons);
  for (let k = 0; k < 12; k++) { const r = new THREE.Mesh(new THREE.ConeGeometry(14, 260, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); r.rotation.z = Math.PI / 2 + (k / 12) * Math.PI * 2; r.position.x = Math.cos(r.rotation.z - Math.PI / 2) * 130; r.position.y = Math.sin(r.rotation.z - Math.PI / 2) * 130; rayons.add(r); }
  // les mots du titre (chrome irisé)
  const MOTS = [['GRAND', R.grand], ['PRIX', R.prix], ['DE', R.de], ['NOËL', R.noel]];
  const mots = MOTS.map(([txt, t0], k) => {
    const cv = toile(1024, 256, (g, L, H) => {
      const gr = g.createLinearGradient(0, 30, 0, 220); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#9fd8ff'); gr.addColorStop(0.5, '#3a4a6a'); gr.addColorStop(0.75, '#ff9fd8'); gr.addColorStop(1, '#ffe7a0');
      g.font = '900 200px sans-serif'; g.textAlign = 'center'; g.lineWidth = 14; g.strokeStyle = '#ff4fb8'; g.strokeText(txt, L / 2, 205); g.fillStyle = gr; g.fillText(txt, L / 2, 205);
    });
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide })); scene.add(m);
    return { m, t0, pos: [[-34, 52], [30, 52], [-40, 34], [22, 34]][k] };
  });

  /* ------------------------------------------------------------ voile (flash blanc, fondus) rendu après la scène */
  const voileScene = new THREE.Scene(), voileCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const voileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, toneMapped: false });
  voileScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), voileMat));

  /* ------------------------------------------------------------ trajectoires (fonctions pures) */
  const E = R.ecuries;
  // places finales des 15 emblèmes autour du ring : groupe A à l'ouest, B au sud, C à l'est (tournés vers le ring)
  const placeEmbleme = (i) => {
    const g = Math.floor(i / 5), k = i % 5, d = -60 + k * 30;
    if (g === 0) return { p: rel(-128, -TOP, d), cap: Math.PI / 2 };
    if (g === 1) return { p: rel(d, -TOP, 128), cap: Math.PI };
    return { p: rel(128, -TOP, -d), cap: -Math.PI / 2 };
  };
  const ENTREE = rel(0, -TOP, 430);
  function etatEmbleme(i, t) {                                                              // entrée par l'allée sud, 1,1 s de trajet
    const { p, cap } = placeEmbleme(i), u = clamp((t - E[i]) / 1.1);
    if (t < E[i]) return null;
    const k = COURBES.sortie(u), pos = ENTREE.clone().lerp(p, k);
    const capTrajet = Math.atan2(p.x - ENTREE.x, p.z - ENTREE.z), c = lerp(capTrajet, cap, clamp((u - 0.75) / 0.25));
    return { pos, cap: c, dist: ENTREE.distanceTo(p) * k };
  }
  function etatMeuteGaree(j) { return { pos: new THREE.Vector3(-22, 1.0, 52 + j * 9), cap: Math.PI / 2, dist: 0 }; }
  function etatMeutePasse(j, t) {                                                           // « cinq voies » : passages sud → nord, synchro avec les Doppler du son
    const tCroise = R.cinq + 0.25 + j * 0.12 + 0.6, v = 160, z = (tCroise - t) * v;
    return { pos: rel(VOIE_X[j], 0.4, clamp(z, -LONG_PISTE / 2 - 400, LONG_PISTE / 2 + 400)), cap: Math.PI, dist: -z };
  }
  const tFige = R.une - 0.12;
  function etatMeuteGrille(j) { return { pos: surPiste(j, LONG_PISTE - 12), cap: Math.PI, dist: 0 }; }
  function etatMeuteDepart(j, t) { const dt = Math.max(0, t - R.commence - j * 0.04), s = 0.5 * 1500 * dt * dt; const p = surPiste(j, LONG_PISTE - 12 - s); return { pos: p, cap: Math.PI, dist: s }; }

  /* ------------------------------------------------------------ rendu d'un instant */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), un = new THREE.Vector3(1, 1, 1), axeY = new THREE.Vector3(0, 1, 0);
  const cacher = (o) => { o.visible = false; };
  const tous = [...meute, ...emblemes, ...disques, ...f1s, batmobile, epave, silhouette, liseré, goutte, eclabous, podium, couronne, gotham, chauves, ombre, stands, desert, boule, banane, carapace, telephone, pieces, carnet, coupe, rayons, piste, etincelles, ...PARC.flatMap((x) => [x.v, x.glow]), ...caisses.flatMap((c) => [c.g, c.faisceau]), ...mots.map((m) => m.m)];

  function planA(t) { let lo = 0, hi = plans.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (plans[mid].debut <= t) lo = mid; else hi = mid - 1; } return plans[lo]; }

  function etincellesDe(sources, t) {                                                          // sources : [{t0, p, n, v, graine, dir}]
    let i = 0;
    for (const s of sources) for (let k = 0; k < s.n && i < NE; k++, i++) {
      const dt = t - s.t0, vie = 0.6 + hash(s.graine + k) * 0.9;
      if (dt < 0 || dt > vie) { m4.makeScale(0, 0, 0); etincelles.setMatrixAt(i, m4); continue; }
      const a = hash(s.graine + k * 3) * Math.PI * 2, el = (s.dir ?? 0.9) + hash(s.graine + k * 5) * 0.6, v = s.v * (0.5 + hash(s.graine + k * 7) * 0.7);
      const vx = Math.cos(a) * Math.cos(el) * v, vy = Math.sin(el) * v, vz = Math.sin(a) * Math.cos(el) * v;
      v3.set(s.p.x + vx * dt, s.p.y + vy * dt - 490 * dt * dt, s.p.z + vz * dt); if (v3.y < 0) v3.y = 0;
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(vx, vy - 980 * dt, vz).normalize());
      m4.compose(v3, q, un.set(1, 1, 1 - dt / vie)); etincelles.setMatrixAt(i, m4);
    }
    for (; i < NE; i++) { m4.makeScale(0, 0, 0); etincelles.setMatrixAt(i, m4); }
    etincelles.instanceMatrix.needsUpdate = true; etincelles.visible = true;
  }

  function rendreTemps(t) {
    const p = planA(t), u = clamp((t - p.debut) / Math.max(1e-6, p.fin - p.debut)), a = new Set(p.actions.map((x) => x.split(':')[0]));
    tous.forEach(cacher);
    salon.groupe.visible = p.decor === 'salon' || p.decor === 'transfo';
    arene.groupe.visible = p.decor === 'arene' || p.decor === 'transfo';
    salon.groupe.position.y = 0; arene.groupe.position.y = 0;
    scene.fog = null; scene.background.setHex(0x000000); scene.environment = p.allume < 0.1 ? null : envSalon;   // noir réel quand l'arène est éteinte

    /* --- salon */
    if (salon.groupe.visible) {
      let lum = 1, tv = p.tv === 0 ? 0 : 1;
      if (a.has('tv_allume')) tv = clamp(u * 4);
      if (a.has('lumiere_saute')) { const d = t - p.debut; lum = (d > 1.2 && d < 1.28) || (d > 1.5 && d < 1.62) ? 0.05 : 1; }
      if (a.has('transformation')) { const k = doux(u); lum = 1 - k; salon.groupe.position.y = -k * k * 260; }
      salon.maj(t, { intensiteSalon: lum, tvAllumee: tv });
    }
    /* --- arène */
    const etatArene = { theme: p.theme, allume: p.allume, rebond: [], casse: 0, foule: p.univers ? 0.6 : 1 };
    if (arene.groupe.visible) {
      if (a.has('transformation')) { const k = doux(u); arene.groupe.position.y = (k - 1) * 40; etatArene.allume = k * 0.3; }
      etatArene.rebond.push({ t0: R.arene, force: 7, cote: -1 }, { t0: R.trone, force: 3, cote: -1 }, { t0: R.temoins, force: 8, cote: -1 }, { t0: R.trahisons, force: 5, cote: 1 }, { t0: R.noel, force: 6, cote: -1 }, { t0: R.commence, force: 7, cote: -1 });
      for (const e of E) etatArene.rebond.push({ t0: e, force: 1.4, cote: -1 });
      if (a.has('luminaire_casse')) etatArene.casse = clamp((t - R.temoins) / 2);
      if (a.has('luminaire_casse_fixe')) etatArene.casse = 1;
      arene.maj(t, etatArene);
      const ec = p.ecran || { mode: 'titre' };
      if (ec.mode === 'ecurie') arene.ecran.afficher('ecurie', { equipe: equipes[ec.index], cle: 'e' + ec.index });
      else if (ec.mode === 'groupe') arene.ecran.afficher('groupe', { lettre: ec.lettre, index: ec.index, equipes: equipes.slice(ec.index * 5, ec.index * 5 + 5), cle: 'g' + ec.lettre });
      else if (ec.mode === 'feux') { const n = Math.min(5, 1 + Math.floor(u * 5)); arene.ecran.afficher('feux', { n, cle: 'f' + n }); }
      else if (ec.mode === 'texte') arene.ecran.afficher('texte', { ...ec, cle: ec.cle || ec.ligne1 + (ec.ligne2 || '') });
      else arene.ecran.afficher('titre', { cle: 'titre' });
      scene.fog = brouillards.arene; scene.background.setHex(0x05040a);
      piste.visible = true;
      matsVoies.forEach((m, j) => { m.emissiveIntensity = a.has('voies') ? clamp((t - (R.cinq + j * 0.09)) / 0.2) * 0.9 : 0.25 * etatArene.allume; });
    }

    /* --- la meute */
    if (a.has('meute_garee')) meute.forEach((v, j) => { const e = etatMeuteGaree(j); v.visible = true; poser(v, e.pos, e.cap); if (a.has('transformation')) v.position.y = lerp(1.0, TOP + 0.4, doux(u)); });
    if (a.has('meute_burnout')) meute.forEach((v, j) => { v.visible = true; const p0 = surPiste(j, LONG_PISTE / 2 + 10); poser(v, p0, Math.PI + Math.sin(t * 9 + j) * 0.06, t * 160); });
    if (a.has('meute_passe')) meute.forEach((v, j) => { v.visible = true; const e = etatMeutePasse(j, t); poser(v, e.pos, e.cap, e.dist); });
    if (a.has('meute_figee')) meute.forEach((v, j) => { v.visible = true; const e = etatMeutePasse(j, tFige); poser(v, e.pos, e.cap, e.dist); });
    if (a.has('meute_grille')) meute.forEach((v, j) => { v.visible = true; const e = etatMeuteGrille(j); poser(v, e.pos, e.cap, t * 40, Math.sin(t * 30 + j) * 0.01); });
    if (a.has('meute_depart')) meute.forEach((v, j) => { v.visible = true; const e = etatMeuteDepart(j, t); poser(v, e.pos, e.cap, e.dist); });

    /* --- les 15 voitures-emblèmes */
    const montrerEmbleme = (i, pos, cap, dist) => { const v = emblemes[i]; v.visible = true; poser(v, pos, cap, dist); const d = disques[i]; d.visible = true; d.position.copy(pos).add(v3.set(0, 9 + Math.sin(t * 2 + i) * 0.4, 0)); d.rotation.set(0, t * 1.5 + i, 0); };
    if (a.has('goutte') || p.id === 'S2' || p.id === 'S3' || p.id === 'S4') {                // l'A4 de Lulu, garée au bord du tapis
      montrerEmbleme(7, new THREE.Vector3(-108, 0, 108), Math.PI * 0.8, 0); disques[7].visible = false;
    }
    if (a.has('goutte')) {
      const d = t - p.debut, forme = clamp(d / 0.55), chute = Math.max(0, d - 0.55), y = 1.15 - 0.5 * 980 * 0.06 * chute * chute;
      goutte.visible = y > 0.05; goutte.position.set(-108, Math.max(0.3, y), 108); goutte.scale.set(forme, forme * (1 + chute * 2), forme);
      if (y <= 0.05) { const k = clamp((d - 0.55 - Math.sqrt(1.1 / (0.5 * 980 * 0.06))) / 0.4); eclabous.visible = true; eclabous.position.set(-108, 0.05, 108); eclabous.scale.setScalar(0.4 + k * 2.4); }
    }
    if (a.has('emblemes_rangee')) for (let i = 0; i < 15; i++) montrerEmbleme(i, rel(-140 + i * 20, -TOP, 125), Math.PI, 0);
    if (a.has('emblemes_place')) for (let i = 0; i < 15; i++) { const e = etatEmbleme(i, t); if (e) montrerEmbleme(i, e.pos, e.cap, e.dist); }
    if (a.has('emblemes_grille')) for (let i = 0; i < 15; i++) montrerEmbleme(i, rel(-40 + (i % 5) * 20, -TOP, 130 + Math.floor(i / 5) * 22), Math.PI, 0);

    /* --- parc fermé */
    if (a.has('parc')) PARC.forEach(({ v, glow, p: pp }, k) => { v.visible = glow.visible = true; poser(v, pp, Math.PI / 2, 0); glow.position.set(pp.x, 0.2, pp.z); glow.rotation.z = Math.PI / 2; glow.material.opacity = 0.35 + 0.3 * clamp((t - R.dizaines - (k % 13) * 0.05) / 0.2); });

    /* --- trône */
    if (a.has('podium')) { podium.visible = true; podium.position.copy(rel(0, 0, 0)); trone.visible = a.has('trone'); }
    if (a.has('couronne')) { couronne.visible = true; const k = COURBES.sortie(clamp((t - R.trone) / 0.9)); couronne.position.copy(rel(0, 10 + 15.5 + (1 - k) * 40, 0)); couronne.rotation.y = t * 0.8; }

    /* --- étincelles */
    const sources = [];
    if (a.has('pyros')) arene.ancres.ring.coins.forEach((c, k) => sources.push({ t0: p.debut + 0.05, p: c.clone().setY(TOP + 44), n: 70, v: 160, graine: k * 101, dir: 1.0 }));
    if (a.has('explosion')) sources.push({ t0: R.temoins + 0.1, p: rel(0, 6, 0), n: 220, v: 260, graine: 777, dir: 0.4 });
    if (a.has('carapace')) sources.push({ t0: R.trahisons + 0.35, p: rel(VOIE_X[1], 2, -5), n: 120, v: 120, graine: 555, dir: 0.5 });
    if (sources.length) etincellesDe(sources, t);

    /* --- univers */
    if (p.univers === 'gotham') {
      gotham.visible = true; scene.fog = brouillards.gotham; scene.background.setHex(0x05080f);
      for (let k = 0; k < NP; k++) { const x = C.x + (hash(k) - 0.5) * 500, z = C.z + (hash(k * 3) - 0.5) * 500, y = 300 - ((t * 420 + hash(k * 7) * 300) % 300); posPluie.set([x, y, z, x - 1, y - 12, z], k * 6); }
      geoPluie.attributes.position.needsUpdate = true;
    }
    if (a.has('batmobile')) { batmobile.visible = true; const s = lerp(0, 95, clamp((t - 51.2) / (R.rit - 51.2))); poser(batmobile, surPiste(2, s), 0, s); }
    if (a.has('eclair')) { const d = t - R.nuit; lampeFlash.intensity = d > 0 && d < 0.12 ? 6 : d > 0.2 && d < 0.26 ? 3 : 0; }
    else lampeFlash.intensity = 0;
    if (a.has('chauves_souris')) { chauves.visible = true; for (let k = 0; k < 24; k++) { const d = Math.max(0, t - R.nuit - 0.3), a2 = hash(k) * Math.PI * 2; v3.copy(batmobile.position).add(new THREE.Vector3(Math.cos(a2) * d * 60, 8 + d * 50 + hash(k * 2) * 10, Math.sin(a2) * d * 60)); q.setFromAxisAngle(axeY, a2); m4.compose(v3, q, un.set(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 20 + k)), 1)); chauves.setMatrixAt(k, m4); } chauves.instanceMatrix.needsUpdate = true; }
    if (a.has('ombre_rire')) { ombre.visible = true; const k = clamp((t - R.rit) / 1.8); ombre.position.copy(rel(lerp(-90, 90, k), 20, -40)); lueursRire.forEach((l, i) => { l.intensity = (0.6 + 0.4 * Math.sin(t * 9 + i * 2)) * 1.4; l.position.copy(rel(i ? 60 : -60, 30, -60)); }); }
    else lueursRire.forEach((l) => { l.intensity = 0; });
    if (p.univers === 'f1') { stands.visible = true; }
    if (a.has('f1_stands') || a.has('radio')) f1s.forEach((v, k) => { v.visible = true; poser(v, surPiste(k, 12), 0, 0); });
    if (a.has('f1_depart')) f1s.forEach((v, k) => { v.visible = true; const dt = Math.max(0, t - R.attaque - k * 0.06), s = 12 + 0.5 * 1800 * dt * dt; poser(v, surPiste(k, s), 0, s); });
    if (p.univers === 'apoca') { desert.visible = true; scene.fog = brouillards.apoca; scene.background.setHex(0x1a0904); }
    if (a.has('epave_roule')) { epave.visible = true; const s = lerp(0, 105, clamp((t - 66.0) / (R.temoins - 66.0))); poser(epave, surPiste(2, s), 0, s, Math.sin(t * 14) * 0.03); }
    if (a.has('epave_saut')) {
      epave.visible = true; const d = t - R.temoins, ralenti = d < 0.6 ? d * 0.15 : 0.09 + (d - 0.6), k = clamp(ralenti / 0.9);
      const s = 105 + k * 40, y = Math.sin(Math.PI * k) * 26; const pp = surPiste(2, s); pp.y += y; poser(epave, pp, 0, s, 0, -0.25 * Math.cos(Math.PI * k));
    }
    if (a.has('explosion')) { const d = t - R.temoins - 0.1, k = clamp(d / 0.6); boule.visible = d > 0 && d < 1.4; boule.position.copy(rel(0, 8, -20)); boule.scale.setScalar(2 + k * 55); boule.material.opacity = 1 - clamp((d - 0.4) / 1.0); lumBoule.position.copy(boule.position); lumBoule.intensity = boule.visible ? 5 * (1 - clamp(d / 1.4)) : 0; }
    else lumBoule.intensity = 0;
    if (a.has('caisses')) caisses.forEach((c, i) => {
      c.g.visible = true; const tAtt = 71.6 + i * 0.15, d = t - tAtt + 0.45, y = d < 0.45 ? 150 * (1 - (d / 0.45) ** 2) : 0;
      c.g.position.copy(rel(c.x, Math.max(0, y), c.z)); const tOuv = tAtt + 0.6 + i * 0.2;
      let ouv = clamp((t - tOuv) / 0.35); if (i === 4) ouv = a.has('silhouette') ? 0.55 * COURBES.sortie(clamp((t - p.debut) / 0.8)) : 0; c.charniere.rotation.x = -ouv * 1.9;
      if (a.has('faisceaux') && i !== 4) { c.faisceau.visible = true; const h = c.haut * COURBES.sortie(clamp((t - R.uniques - i * 0.05) / 0.4)); c.faisceau.scale.set(1, Math.max(0.01, h), 1); c.faisceau.position.copy(rel(c.x, 7 + h / 2, c.z)); }
    });
    if (a.has('silhouette')) { silhouette.visible = true; poser(silhouette, rel(caisses[4].x, 3.2, caisses[4].z), Math.PI * 0.85, 0); liseré.visible = true; liseré.position.copy(silhouette.position).add(v3.set(0, 2.1, 0)); liseré.rotation.y = silhouette.rotation.y; liseré.material.opacity = 0.14 + 0.05 * Math.sin(t * 3); }
    if (a.has('banane')) { banane.visible = true; banane.position.copy(surPiste(2, 70)); const v = meute[2]; v.visible = true; const d = t - p.debut, s = Math.min(70, d * 90), apres = Math.max(0, d * 90 - 70); poser(v, surPiste(2, s + apres * 0.4), apres > 0 ? apres * 0.25 : 0, s); }
    if (a.has('carapace')) { const v = meute[1]; v.visible = true; poser(v, surPiste(1, 60), 0, 0, Math.sin(Math.max(0, t - R.trahisons - 0.35) * 18) * 0.3 * Math.exp(-Math.max(0, t - R.trahisons - 0.35) * 3)); carapace.visible = t < R.trahisons + 0.38; const k = clamp((t - R.trahisons) / 0.35); carapace.position.copy(surPiste(1, 60)).add(v3.set(0, 60 * (1 - k) + 2, -40 * (1 - k))); carapace.rotation.set(t * 6, t * 4, 0); }
    if (a.has('telephone')) { telephone.visible = true; const k = COURBES.sortie(clamp((t - p.debut) / 0.8)); telephone.position.copy(rel(0, lerp(-140, 70, k), -125)); telephone.rotation.set(-0.1, 0, 0); }
    if (a.has('pieces')) { pieces.visible = true; for (let k = 0; k < NPi; k++) { const t0 = R.paris + 0.05 + (k % 6) * 0.17 + Math.floor(k / 6) * 0.05, d = Math.max(0, t - t0), y = Math.max(0.15, 120 - 490 * d * d); v3.copy(rel((hash(k) - 0.5) * 120, y, (hash(k * 3) - 0.5) * 120)); q.setFromEuler(new THREE.Euler(t * 5 + k, 0, y > 0.2 ? t * 3 : Math.PI / 2)); m4.compose(v3, q, un.set(1, 1, 1)); if (t < t0) m4.makeScale(0, 0, 0); pieces.setMatrixAt(k, m4); } pieces.instanceMatrix.needsUpdate = true; }
    if (a.has('carnet')) { carnet.visible = t > R.ancienne; const d = Math.max(0, t - R.ancienne); carnet.position.copy(rel(55, Math.max(0.5, 90 - 490 * d * d), 40)); carnet.rotation.set(0, 0.4, 0); }
    if (a.has('coupe')) { coupe.visible = true; const k = COURBES.sortie(clamp((t - p.debut) / 1.4)); coupe.position.copy(rel(0, lerp(-20, 0, k), 0)); coupe.rotation.y = t * 0.6; }
    if (a.has('rayons')) { rayons.visible = true; rayons.position.copy(rel(0, 12, -30)); rayons.rotation.z = t * 0.2; rayons.children.forEach((r) => { r.material.opacity = 0.1 * clamp((t - R.gloire) / 0.6); }); }
    if (a.has('mots_titre')) mots.forEach(({ m, t0, pos }) => { if (t < t0) return; m.visible = true; const k = COURBES.sortie(clamp((t - t0) / 0.18)); m.scale.setScalar(lerp(3.2, 1, k)); m.position.copy(rel(pos[0], pos[1], -10)); m.material.opacity = k; });

    /* --- caméra */
    const c = p.cam; let pos, cib;
    const cu = (COURBES[c.courbe] || doux)(u), p0 = new THREE.Vector3(...c.p0).lerp(new THREE.Vector3(...c.p1), cu), c0 = new THREE.Vector3(...c.c0).lerp(new THREE.Vector3(...c.c1), cu);
    if (c.rep === 'abs') { pos = p0; cib = c0; }
    else if (c.rep === 'ring') { pos = rel(p0.x, p0.y, p0.z); cib = rel(c0.x, c0.y, c0.z); }
    else {                                                                                      // 'voiture' : repère de la voiture suivie
      let base, yaw;
      if (c.suit >= 100) { const v = f1s[c.suit - 100]; base = v.position; yaw = v.rotation.y; }
      else { const e = etatEmbleme(c.suit, Math.max(t, E[c.suit])); base = e.pos; yaw = e.cap; }       // pose calculée, jamais lue dans l'image précédente
      pos = p0.clone().applyAxisAngle(axeY, yaw).add(base); cib = c0.clone().applyAxisAngle(axeY, yaw).add(base);
    }
    let fov = fovDeFocale(lerp(c.mm0, c.mm1, cu)), sec = 0, flash = 0;
    for (const [th, f] of hits) { const d = t - th; if (d < 0 || d > 1.5) continue; sec += f * Math.exp(-d / 0.17); flash += f * Math.exp(-d / 0.08); fov *= 1 + 0.22 * f * Math.exp(-d / 0.12); }
    const dist = pos.distanceTo(cib), k60 = Math.floor(t * 60);
    pos.add(v3.set((hash(k60 * 3 + 1) - 0.5), (hash(k60 * 3 + 2) - 0.5), (hash(k60 * 3 + 3) - 0.5)).multiplyScalar(sec * dist * 0.03));
    camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(cib);
    if (c.roulis) camera.rotateZ(c.roulis * cu);

    /* --- rendu + voile */
    let noir = p.decor === 'noir' ? 1 : 0;
    noir = Math.max(noir, 1 - clamp(t / 0.25), a.has('fondu_fin') ? clamp((t - (duree - 1.6)) / 1.6) : 0);
    renderer.autoClear = true; renderer.render(scene, camera);
    if (noir > 0.001 || flash > 0.02) {
      renderer.autoClear = false;
      if (noir > 0.001) { voileMat.color.setHex(0x000000); voileMat.opacity = noir; renderer.render(voileScene, voileCam); }
      if (flash > 0.02 && noir < 0.99) { voileMat.color.setHex(0xffffff); voileMat.opacity = Math.min(0.85, flash * 0.6); renderer.render(voileScene, voileCam); }
      renderer.autoClear = true;
    }
    return p;
  }

  return { scene, camera, rendreTemps, planA, duree };
}
