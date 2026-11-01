/* TROPHÉE du segment arène (V9.1 Ring, « GLOIRE ÉTERNELLE ») — la VRAIE « Coupe Arc-en-Ciel » imprimée (Trophée Suprême du Grand
   Prix, id coupe_arc_en_ciel, 14 pièces) : vraies STL complètes de montage du Panthéon (shared/pantheon/coupe_arc_en_ciel/*.stl,
   pas les .lod) chargées par shared/pantheon3d.js → construireTrophee(THREE, fiche, base, { lisse: true, lod: false }) (échelle 0,1 :
   1 unité = 10 mm, repère déjà converti y haut, face +z) avec les matériaux des filaments réels (materiauPiece / stl.js : PLA Matte
   anthracite, anneaux arc-en-ciel Matte / Basic / Silk+, lèvre, pied, anses et plaque en Silk+ doré). Base et modules résolus par le
   pont (ctx.urlWeb, ctx.importerShared) : mêmes URL dans le dépôt et sur le PC.
   Le modèle est centré sur son axe (boîte englobante réelle), posé sur y = 0 et mis à l'échelle pour une hauteur utile HAUTEUR
   (40,3 cm dans l'arène, ×1,9 l'objet réel de 211 mm) ; RAYON = rayon hors tout mesuré sur les sommets des STL (anses comprises).
   Renfort d'éclairage sans dénaturer les teintes : envMap néon de l'arène, intensité de reflets relevée (Silk+ surtout), léger
   vernis, une pointe d'émission dans la couleur même du filament.
   Effets conservés : aura, RAYONS DORÉS derrière la coupe (sprite orienté à l'opposé de la caméra : apres), éclat de reflet qui
   balaie la lèvre dorée, colonne de lumière et anneau de lévitation sous le socle quand il flotte au-dessus du ring.

   await creerTrophee(THREE, { envMap, yTapis, importerShared, urlWeb }) → { groupe, fx, maj(t, e), apres(camera), obb(), centre(),
     HAUTEUR, RAYON, pieces }
     e = { pos: [x, y, z] (base du socle), s: échelle, rot: rotation y, aura, rayons, colonne, brille, brillePhase } — fonction pure. */
import { clamp, smoother, haloSprite, texCanvas, obbFixe } from './arene_outils.js';

const ID_COUPE = 'coupe_arc_en_ciel';

export async function creerTrophee(THREE, { envMap = null, yTapis = 22, importerShared, urlWeb, hauteurCible = 40.3 } = {}) {
  if (!importerShared || !urlWeb) throw new Error('arene_trophee : importerShared et urlWeb (pont) requis');
  const pan = await importerShared('pantheon3d.js');
  const base = urlWeb('shared/pantheon/');
  const manifeste = await pan.chargerManifeste(base);
  const fiche = (manifeste.trophees || []).find((x) => x.id === ID_COUPE);
  if (!fiche) throw new Error('arene_trophee : « ' + ID_COUPE + ' » absent de pantheon.json');
  const modele = await pan.construireTrophee(THREE, fiche, base, { lisse: true, lod: false });
  if (modele.pieces.length !== fiche.pieces.length) throw new Error(`arene_trophee : ${modele.pieces.length}/${fiche.pieces.length} STL chargées pour ${ID_COUPE}`);

  /* boîte englobante réelle (sommets) : axe de la coupe, pied à y = 0, rayon hors tout */
  const bb = new THREE.Box3().setFromObject(modele.group);
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  const ech = hauteurCible / (bb.max.y - bb.min.y);
  let rMax = 0;
  const v = new THREE.Vector3();
  for (const m of modele.pieces) {
    const a = m.geometry.attributes.position; m.updateMatrixWorld(true);
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); rMax = Math.max(rMax, Math.hypot(v.x - cx, v.z - cz)); }
  }
  const HAUTEUR = hauteurCible, RAYON = rMax * ech;
  const levre = modele.pieces.find((m) => m.userData.piece.role === 'levre');
  const bl = levre ? new THREE.Box3().setFromObject(levre) : bb;
  const yLevre = (bl.max.y - bb.min.y) * ech, rLevre = Math.max(bl.max.x - cx, bl.max.z - cz) * ech;

  /* matériaux filament : couleurs réelles conservées, reflets renforcés pour l'éclairage de scène de l'arène */
  for (const m of modele.pieces) {
    const mat = m.material, g = (m.userData.piece.fil && m.userData.piece.fil.gamme) || '', silk = /Silk/i.test(g);
    // les hex du Panthéon sont des couleurs sRGB : la chaîne de l'arène (rendu linéaire → sRGB, post_cgi_4k) les délaverait en pastel ;
    // on les passe en linéaire pour retrouver la vraie teinte du filament (anthracite sombre, Silk+ doré franc, arc-en-ciel saturé)
    mat.color.convertSRGBToLinear();
    mat.envMap = envMap; mat.envMapIntensity = silk ? 1.25 : 0.45;
    if (silk && 'clearcoat' in mat) { mat.clearcoat = Math.max(mat.clearcoat || 0, 0.6); mat.clearcoatRoughness = 0.18; }
    if (silk) { mat.roughness = Math.min(mat.roughness, 0.24); mat.metalness = Math.max(mat.metalness, 0.6); }
    if (mat.emissive && !/PETG/i.test(g)) { mat.emissive.copy(mat.color).multiplyScalar(silk ? 0.12 : 0.08); mat.emissiveIntensity = 1; }
    mat.needsUpdate = true;
  }

  const groupe = new THREE.Group(); groupe.name = 'trophee';
  const coupe = new THREE.Group(); groupe.add(coupe);
  modele.group.position.set(-cx * ech, -bb.min.y * ech, -cz * ech); modele.group.scale.setScalar(ech);
  coupe.add(modele.group);
  const aura = haloSprite(THREE, '#ffd27a', 60, 0); aura.position.y = HAUTEUR * 0.55; groupe.add(aura);
  // éclat de reflet : étoile à 4 branches qui glisse sur la lèvre de la vasque
  const texGlint = texCanvas(THREE, 256, 256, (g, w, h) => {
    const d = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.12, 'rgba(255,250,220,.7)'); d.addColorStop(0.4, 'rgba(255,220,140,0)');
    g.fillStyle = d; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (const [sx, sy] of [[1, 0.035], [0.035, 1]]) { const l = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); l.addColorStop(0, 'rgba(255,255,255,1)'); l.addColorStop(1, 'rgba(255,230,160,0)'); g.save(); g.translate(w / 2, h / 2); g.scale(sx, sy); g.translate(-w / 2, -h / 2); g.fillStyle = l; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill(); g.restore(); }
  }, { srgb: false });
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlint, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));
  glint.renderOrder = 5; groupe.add(glint);

  /* effets hors échelle (repère monde) : rayons dorés derrière la coupe, colonne de lévitation, anneau de lévitation */
  const fx = new THREE.Group(); fx.name = 'trophee-fx';
  const texRayons = texCanvas(THREE, 512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 28; i++) {
      const a = i * Math.PI * 2 / 28 + (i % 2) * 0.05, da = i % 2 ? 0.035 : 0.06, r = w * (i % 2 ? 0.42 : 0.5);
      const l = g.createRadialGradient(cx, cy, 0, cx, cy, r); l.addColorStop(0, 'rgba(255,240,200,.95)'); l.addColorStop(0.35, 'rgba(255,210,110,.5)'); l.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = l; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - da, a + da); g.closePath(); g.fill();
    }
    const c = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.22); c.addColorStop(0, 'rgba(255,245,215,.9)'); c.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = c; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const rayons = new THREE.Sprite(new THREE.SpriteMaterial({ map: texRayons, color: new THREE.Color('#ffd27a').multiplyScalar(1.15), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  rayons.renderOrder = 1; fx.add(rayons);
  const matCol = new THREE.ShaderMaterial({
    uniforms: { force: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec2 vU; varying vec3 vN; varying vec3 vV; uniform float force, t;
      void main(){ float bord = pow(abs(dot(vN, vV)), 1.5); float onde = 0.75 + 0.25 * sin(vU.y * 18.0 - t * 6.0);
        float a = force * bord * onde * smoothstep(0.0, 0.15, vU.y) * (0.35 + 0.65 * vU.y);
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.3) * 1.6 * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const colonne = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 10.5, 1, 40, 1, true), matCol); colonne.geometry.translate(0, 0.5, 0); colonne.frustumCulled = false; fx.add(colonne);
  const anneau = new THREE.Mesh(new THREE.RingGeometry(10.5, 13.5, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(2.2), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  anneau.rotation.x = -Math.PI / 2; anneau.position.y = yTapis + 0.06; anneau.renderOrder = 2; fx.add(anneau);

  let etat = { pos: [0, -100, 0], s: 1, visible: false };
  const centre = () => [etat.pos[0], etat.pos[1] + HAUTEUR * 0.5 * etat.s, etat.pos[2]];

  function maj(t, e) {
    etat = e && e.s > 0 ? e : { pos: [0, -100, 0], s: 1, visible: false };
    const vis = !!(e && e.s > 0);
    groupe.visible = vis; fx.visible = vis;
    if (!vis) return;
    const s = e.s;
    groupe.position.set(...e.pos); groupe.scale.setScalar(s);
    coupe.rotation.y = e.rot ?? 0.35 * t;
    aura.material.opacity = 0.2 * (e.aura ?? 0); aura.scale.setScalar(34 + 4 * Math.sin(t * 3));
    // éclat de reflet : glisse d'une anse à l'autre sur la lèvre (repère local de la coupe, qui tourne)
    const b = clamp(e.brille ?? 0);
    glint.visible = b > 0.01; glint.material.opacity = b; glint.material.rotation = t * 1.5;
    const ag = (e.brillePhase ?? 0) * Math.PI - Math.PI / 2;
    glint.position.set(Math.sin(ag) * rLevre, yLevre, Math.cos(ag) * rLevre); glint.scale.setScalar(9 + 5 * b);
    const c = centre();
    rayons.material.opacity = 0.6 * (e.rayons ?? 0); rayons.material.rotation = 0.18 * t;
    rayons.scale.setScalar((40 + 52 * s) * (1 + 0.03 * Math.sin(t * 2.1)));
    rayons.position.set(...c);
    const col = clamp(e.colonne ?? 0), hBase = e.pos[1] - yTapis;
    colonne.visible = col > 0.01 && hBase > 2; matCol.uniforms.force.value = col * 0.16; matCol.uniforms.t.value = t;
    colonne.position.set(e.pos[0], yTapis + 0.1, e.pos[2]); colonne.scale.set(s, Math.max(0.01, hBase - 0.2), s);
    anneau.visible = col > 0.01; anneau.material.opacity = 0.7 * col; anneau.position.set(e.pos[0], yTapis + 0.06, e.pos[2]);
    anneau.scale.setScalar(1 + 0.04 * Math.sin(t * 4));
  }
  /** Place les rayons DERRIÈRE la coupe vue depuis la caméra (appelé par le noyau une fois la caméra posée). */
  function apres(camera) {
    if (!fx.visible) return;
    const c = centre(), d = new THREE.Vector3(c[0], c[1], c[2]).sub(camera.position); const n = d.length() || 1;
    rayons.position.set(c[0] + d.x / n * 24 * etat.s, c[1] + d.y / n * 24 * etat.s, c[2] + d.z / n * 24 * etat.s);
  }
  /** Boîte de collision (axes du monde) : cylindre hors tout mesuré sur les STL (anses comprises), quelle que soit la rotation. */
  function obb() {
    if (!groupe.visible) return null;
    const s = etat.s;
    return obbFixe('trophée', [etat.pos[0], etat.pos[1] + HAUTEUR * s / 2, etat.pos[2]], [RAYON * s, HAUTEUR * s / 2, RAYON * s]);
  }
  return { groupe, fx, maj, apres, obb, centre, HAUTEUR, RAYON, pieces: modele.pieces.length };
}
