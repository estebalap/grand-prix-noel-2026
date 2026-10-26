/* FILM V7 « MULTIVERSE TO RING ARENA » — orchestrateur. L'image est une FONCTION PURE DU TEMPS : rendreTemps(t, { sub }).

   Rien ici ne dépend de l'image précédente : poses (physique_cgi.js), caméras (camera_crescendo.js), particules (effets_cgi.js, évaluées dans
   les shaders), portails et décors (mondes_et_portails.js, shared/decors3d.js). L'accumulation de M sous-expositions (obturateur 180°) donne
   le vrai flou de mouvement CGI du rendu master ; le HUD vectoriel est dessiné après, à la résolution native, par hud_broadcast_4k.js.

   creerFilm({ renderer, equipes, logos, regles, plan, sortie, qualite, parcMax }) → { rendreTemps, duree, inventaire, tl, … } */
import { WEB, urlWeb, importerShared, bolides3d, chargerDecors3d, chargerOuverture } from '../src/shared_bridge.js';
import { construireTimeline, cameraEcurie, impactEcurie, chemin } from './camera_crescendo.js';
import { scenarioEcurie, MONDES, creerPortail, creerRing, creerGestionnaireMondes, angleEcurie, RING, CX } from './mondes_et_portails.js';
import { creerGarage, poser, animer, avecAlea, avecAleaAsync, codesSurMesure } from './voitures.js';
import { construirePiste, creerActeI, creerActeIII, creerActeIV, creerActeV, creerActeVI, MEUTE, F1, SECRETS } from './actes.js';
import { creerPostCGI } from './post_cgi_4k.js';
import { creerHUD } from './hud_broadcast_4k.js';
import { creerFumee, creerEtincelles, creerGomme, creerPostCombustion } from './effets_cgi.js';
import { clamp, lerp, smoother, hashTexte, DEG } from './physique_cgi.js';

const hash01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export async function creerFilm({ renderer, equipes, logos, regles = {}, plan, sortie = null, qualite = 'apercu', parcMax = 40, progression = () => {} }) {
  const THREE = window.THREE;
  const L = renderer.domElement.width, H = renderer.domElement.height;
  const tl = construireTimeline(plan);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(40, L / H, 0.2, 4000);
  const envMap = bolides3d.envNeon(THREE, renderer); scene.environment = envMap;
  const decors = await chargerDecors3d(), ouverture = await chargerOuverture();
  const arsenal = await importerShared('arsenal3d.js'), stage3d = await importerShared('stage3d.js');
  const cars = await (await fetch(urlWeb('data/cars.json'))).json(), circuit = await (await fetch(urlWeb('data/circuit.json'))).json();
  const garage = creerGarage(THREE, envMap);
  progression('Concept-cars du Showroom…');

  /* ───────── lumières de base (les décors apportent les leurs) ───────── */
  const hemi = new THREE.HemisphereLight(0x9fb4ff, 0x20182e, 0.42), cleMonde = new THREE.DirectionalLight(0xfff0dc, 0.95); cleMonde.position.set(30, 70, 60); scene.add(hemi, cleMonde, cleMonde.target);

  /* ───────── les 15 binômes : Concept-Car (Showroom) + bolide m3d en ailier ───────── */
  const concepts = equipes.map((e) => garage.concept(e.id)); concepts.forEach((c) => scene.add(c));
  const ailiers = []; for (let k = 0; k < 15; k++) { const a = await garage.m3d(MONDES[k].ailier); ailiers.push(a); scene.add(a); }
  progression('Mondes natifs, portails, Ring commun…');
  const scenarios = tl.ecuries.map((slot) => scenarioEcurie(slot.k, slot));
  scenarios.forEach((sc) => { sc.tPark = sc.slot.impact + 2.0 + 3.0; });
  const poseRing = (sc, t, ailier = false) => { const tt = Math.min(t, sc.tPark), p = (ailier ? sc.B2 : sc.B).pose(tt); if (t > tt) p.heave += 0.012 * Math.sin(2 * Math.PI * 22 * t); return p; };
  const poseMonde = (sc, t, ailier = false) => (ailier ? sc.A2 : sc.A).pose(t);

  /* ───────── Ring commun, portes jumelles, miroirs d'obsidienne ───────── */
  const ring = creerRing(THREE, { envMap, equipes }); scene.add(ring.groupe);
  const portes = MONDES.map((m, k) => { const p = creerPortail(THREE, m.accent, m.acc2, { graine: 100 + m.id, rayon: 9 }); const sc = scenarios[k]; p.groupe.position.set(...sc.porteRing.pos); p.groupe.position.y = 9 + 0.6; p.groupe.rotation.y = sc.porteRing.yaw; p.groupe.visible = false; ring.groupe.add(p.groupe); return p; });
  const miroirs = concepts.map((c) => { const m = decors.creerMiroirModele(THREE, c); scene.add(m.racine); return m; });
  const mirAil = ailiers.map((c) => { const m = decors.creerMiroirModele(THREE, c); scene.add(m.racine); return m; });
  const gestion = creerGestionnaireMondes({ THREE, renderer, envMap, decors, avecAlea, cars });

  /* ───────── piste Rainbow Road, meute, boss, labo, parc, trophée ───────── */
  progression('Rainbow Road 3D…');
  const trace = ouverture.traceRainbow(circuit), piste = construirePiste(THREE, trace); scene.add(piste.groupe);
  const meute = []; for (const c of MEUTE) { const v = await garage.m3d(c); meute.push(v); scene.add(v); }
  progression('Univers boss…');
  const bolides = { f1s: [], carcasses: [] };
  bolides.batmobile = await garage.m3d(SECRETS.batmobile); bolides.epave = await garage.m3d(SECRETS.epave); bolides.jet = await garage.m3d(SECRETS.jet);
  for (const c of F1) bolides.f1s.push(await garage.m3d(c));
  const codesCarc = ['U01', 'U05', 'E08', 'H04'];
  for (let i = 0; i < codesCarc.length; i++) { const v = await garage.m3d(codesCarc[i]); v.position.set(CX + (i - 1.5) * 15 + 4, 0, -9 - (i % 2) * 6); v.rotation.set(0.12 * (i % 3 - 1), 1 + i * 1.6, 0.22 * (i % 2 ? 1 : -1), 'YXZ'); bolides.carcasses.push(v); }
  [...bolides.f1s, bolides.batmobile, bolides.epave, bolides.jet, ...bolides.carcasses].forEach((v) => { v.visible = false; scene.add(v); });
  const silhouette = await garage.m3d(SECRETS.silhouette, { noircir: true }); silhouette.visible = false; scene.add(silhouette);
  progression('Parc réuni…');
  const tousCodes = codesSurMesure().filter((c) => ![...MEUTE, ...F1, ...Object.values(SECRETS), ...MONDES.map((m) => m.ailier), ...codesCarc].includes(c)).sort();
  const fam = new Map(); for (const c of tousCodes) { const f = c.replace(/\d+$/, ''); if (!fam.has(f)) fam.set(f, []); fam.get(f).push(c); }
  const rot = [...fam.values()], codesParc = []; while (codesParc.length < Math.min(parcMax, tousCodes.length)) { let n = 0; for (const f of rot) if (f.length && codesParc.length < parcMax) { codesParc.push(f.shift()); n++; } if (!n) break; }
  const parc = [];
  for (let i = 0; i < codesParc.length; i++) {
    const v = await garage.m3d(codesParc[i]); v.visible = false;
    const rg = i < 22 ? 0 : i < 44 ? 1 : 2, nr = [22, 22, 40][rg], idx = rg === 0 ? i : rg === 1 ? i - 22 : i - 44, r = [70 + 2, 80 + 2, 90][rg];
    const a = Math.PI + RING.ECART * 1.1 + ((idx + 0.5) * (2 * Math.PI - 2.2 * RING.ECART)) / Math.max(nr, 1);
    v.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); v.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), 0); scene.add(v); parc.push(v);
  }
  const troph = stage3d.TROPHY_BUILDERS.grandprix(THREE);
  const trophee = new THREE.Group(); trophee.add(troph);

  /* ───────── actes ───────── */
  const actI = creerActeI({ THREE, piste, voituresMeute: meute, ring });
  const actIII = creerActeIII({ THREE, piste, concepts, garage, silhouette, equipes });
  const actIV = creerActeIV({ THREE, decors, envMap, cars, garage, bolides, plan });
  const ringCamera = (t) => { const a = 0.45 + (t - 104) * 0.34; return { p: [Math.cos(a) * 160, 52, Math.sin(a) * 160], c: [0, 6, 0], fov: 38, roll: 0 }; };
  const actV = creerActeV({ THREE, arsenal, voituresLab: meute, plan, ringCamera });
  const actVI = creerActeVI({ THREE, trophee, parc, plan });
  [actI, actIII, actIV, actV, actVI].forEach((a) => scene.add(a.groupe));
  scene.add(actI.groupe);

  /* ───────── sillage physique : fumée de pneus, gomme, étincelles, post-combustion (par écurie) ───────── */
  const fumee = creerFumee(THREE, '#d3d6e4'), etinc = creerEtincelles(THREE), gomme = creerGomme(THREE);
  scenarios.forEach((sc, k) => {
    const rear = (cascadeur) => (t) => { const p = cascadeur.pose(t, { sansSuspension: true }), c = Math.cos(p.cap), s = Math.sin(p.cap); return { p: [p.pos[0] - Math.sin(p.cap) * 3.0, 0, p.pos[2] - Math.cos(p.cap) * 3.0], gauche: [c, -s], pos: p.pos }; };
    for (const [csc, graine] of [[sc.B, 1], [sc.B2, 2]]) {
      const rf = rear(csc), t0 = sc.slot.impact + 0.04, t1 = Math.min(sc.slot.impact + 1.9, sc.tPark - 1);
      fumee.emettre({ poseFn: (t) => rf(t).p, t0, t1, pas: 0.03, vie: 1.2, taille: 2.4, deriveVent: [0.6, 0, 0.4], graine: k * 7 + graine });
      for (const dec of [-1.2, 1.2]) gomme.tracer({ poseFn: rf, t0, t1, pas: 0.03, decalage: dec, largeur: 0.8 });
    }
    const hl = sc.B.pose(sc.slot.impact + 0.06, { sansSuspension: true });
    etinc.gerbe({ t0: sc.slot.impact + 0.03, p0: [hl.pos[0], 0.4, hl.pos[2]], dir: [Math.sin(hl.capVitesse) * 0.7, 0.35, Math.cos(hl.capVitesse) * 0.7], n: 130, dispersion: 0.65, vmin: 50, vmax: 230, vie: 1.0, taille: 0.5, graine: 5000 + k });
    etinc.gerbe({ t0: sc.slot.impact + 0.03, p0: [hl.pos[0], 0.4, hl.pos[2]], dir: [-Math.sin(hl.capVitesse) * 0.4, 0.3, -Math.cos(hl.capVitesse) * 0.4], n: 60, dispersion: 0.9, vmin: 30, vmax: 120, vie: 0.8, taille: 0.4, graine: 6000 + k });
  });
  fumee.figer(); etinc.figer(); gomme.figer();
  ring.groupe.add(fumee.objet, etinc.objet, gomme.objet);
  // sparks / fumée / étincelles du MONDE : gerbes à l'atterrissage et traînée de poussière (monde natif, repère monde)
  const fumeeM = creerFumee(THREE, '#c9b79c'), etincM = creerEtincelles(THREE);
  scenarios.forEach((sc, k) => {
    const rf = (t) => { const p = sc.A.pose(t, { sansSuspension: true }); return [p.pos[0] - Math.sin(p.cap) * 3, 0, p.pos[2] - Math.cos(p.cap) * 3]; };
    fumeeM.emettre({ poseFn: rf, t0: sc.slot.debut + 0.1, t1: sc.slot.impact, pas: 0.05, vie: 0.7, taille: 0.9, graine: k + 300 });
    const tL = sc.tLand || sc.slot.debut + 0.04, hl = sc.A.pose(tL, { sansSuspension: true });
    etincM.gerbe({ t0: tL, p0: [hl.pos[0], 0.4, hl.pos[2]], dir: [Math.sin(hl.capVitesse), 0.3, Math.cos(hl.capVitesse)], n: 70, dispersion: 0.6, vmin: 40, vmax: 200, vie: 0.9, taille: 0.45, graine: 7000 + k });
  });
  fumeeM.figer(); etincM.figer(); scene.add(fumeeM.objet, etincM.objet);
  const postComb = creerPostCombustion(THREE); concepts.forEach(() => {});
  const pcs = concepts.map(() => creerPostCombustion(THREE)); concepts.forEach((c, i) => { pcs[i].groupe.position.set(0, 0, 0); c.add(pcs[i].groupe); });

  /* ───────── post-traitement + HUD ───────── */
  const post = creerPostCGI(THREE, renderer, L, H, { msaa: qualite !== 'brouillon' });
  const hud = await creerHUD({ equipes, logos, regles, plan, tl, scenarios, MONDES, concepts, cars });
  const sortieCtx = sortie ? sortie.getContext('2d') : null;

  /* ───────── mise en scène à l'instant t ───────── */
  const mondesVisibles = new Set();
  const groupesActes = [actI.groupe, actIII.groupe, actIV.groupe, actV.groupe, actVI.groupe];
  const objetsSpeciaux = [...meute, ...bolides.f1s, bolides.batmobile, bolides.epave, bolides.jet, ...bolides.carcasses, silhouette, ...parc];
  const ctxBase = { camera, hPx: H };
  let brouillardCourant = null;
  const fog = (b) => { if (!b) { scene.fog = null; return; } if (!scene.fog || scene.fog.isFog) scene.fog = new THREE.FogExp2(b.couleur, b.densite); else { scene.fog.color.set(b.couleur); scene.fog.density = b.densite; } };
  const eclairMonde = (t, seed) => { let v = 0; for (let i = 0; i < 6; i++) { const te = i * 1.31 + hash01(seed + i) * 0.9, d = (t % 7.9) - te; if (d >= 0 && d < 0.3) v = Math.max(v, d < 0.05 ? 1 : d < 0.11 ? 0.15 : d < 0.18 ? 0.8 : 0.3 * (1 - d / 0.3)); } return v; };

  function masquer() {
    ring.groupe.visible = false; piste.groupe.visible = false; groupesActes.forEach((g) => (g.visible = false));
    concepts.forEach((c) => (c.visible = false)); ailiers.forEach((c) => (c.visible = false)); objetsSpeciaux.forEach((o) => (o.visible = false));
    miroirs.forEach((m) => (m.racine.visible = false)); mirAil.forEach((m) => (m.racine.visible = false));
    for (const e of gestion.cache.values()) e.groupe.visible = false;
    fumeeM.objet.visible = etincM.objet.visible = false; hemi.visible = true; cleMonde.visible = true;
  }
  function parquer(t, ctx, { sauf = -1, mirroirs = true } = {}) {
    // les écuries déjà arrivées sont GARÉES dans le Ring, vivantes : phares allumés, ralenti qui vibre, ailier derrière
    let n = 0;
    scenarios.forEach((sc, k) => {
      if (t < sc.slot.impact || k === sauf) return; n++;
      const c = concepts[k], a = ailiers[k]; c.visible = a.visible = true;
      poser(c, poseRing(sc, t)); poser(a, poseRing(sc, t, true)); animer(c, t);
      if (mirroirs) { miroirs[k].racine.visible = true; miroirs[k].sync(); }
      if (t - sc.slot.impact < 4.0) { mirAil[k].racine.visible = true; mirAil[k].sync(); }
    });
    return n;
  }
  function placer(t, spec = {}) {
    masquer();
    const etat = tl.etat(t), acte = etat.acte.id, apres = [];   // les mises à jour qui lisent camera.fov passent APRÈS le placement de la caméra : aucune dépendance à l'image précédente
    const ctx = { ...ctxBase, pouls: etat.pouls, brouillard: fog, extraFlash: 0, flashPiege: 0, apres: (fn) => apres.push(fn) };
    let cam, info = {}, ringVisible = false;
    const sc = etat.slot ? scenarios[etat.slot.k] : null;
    if (acte === 'I') {
      ring.groupe.visible = true; piste.groupe.visible = true; actI.groupe.visible = true; fog(ring.brouillard);
      actI.maj(t, ctx); cam = actI.camera(t, camera.aspect); info = actI.info(t); ringVisible = true; ring.maj(t, etat.pouls, 0, 0);
      if (t > 9.4) { portes[0].groupe.visible = true; portes[0].maj(t, 0, 0.6, smoother((t - 9.4) / 1.4)); }
      hemi.intensity = 0.4;
    } else if (acte === 'II') {
      if (sc) {
        const e = gestion.obtenir(sc.k, sc, scene), m = MONDES[sc.k], dc = e.decor;
        if (etat.phase === 'A') {
          e.groupe.visible = true; fog(dc.brouillard ? { couleur: dc.brouillard.couleur, densite: dc.brouillard.densite } : { couleur: '#101018', densite: 0.002 });
          apres.push(() => { dc.maj(t, 0, camera, H); if (dc.eclair) { const ev = eclairMonde(t, m.id); dc.eclair.u.value = ev * 0.85; dc.eclair.lum.intensity = dc.eclair.base * (1 + ev * 3.2); } e.fx.forEach((f) => f.maj(t, camera, H)); });
          e.portail.maj(t, smoother((etat.u - 0.18) / 0.45), etat.u > 0.7 ? (etat.u - 0.7) / 0.3 : 0);
          const cc = concepts[sc.k], aa = ailiers[sc.k]; cc.visible = aa.visible = true;
          const pc = poseMonde(sc, t), pa = poseMonde(sc, t, true); poser(cc, pc); poser(aa, pa, { lateral: 5.5 }); animer(cc, t);
          pcs[sc.k].maj(t, clamp((etat.u - 0.35) / 0.2) * (1 - clamp((etat.u - 0.95) / 0.05)));
          fumeeM.objet.visible = etincM.objet.visible = true; apres.push(() => { fumeeM.maj(t, camera, H); etincM.maj(t, camera, H); });
          miroirs[sc.k].racine.visible = false; info = { titre: m.nom, kmh: pc.kmh, beta: pc.beta, aLat: pc.aLat, pc };
        } else {
          ringVisible = true; ring.groupe.visible = true; fog(ring.brouillard);
          const cc = concepts[sc.k], aa = ailiers[sc.k]; const pc = poseRing(sc, t), pa = poseRing(sc, t, true);
          parquer(t, ctx, { sauf: sc.k }); cc.visible = aa.visible = true; poser(cc, pc); poser(aa, pa); animer(cc, t);
          miroirs[sc.k].racine.visible = true; miroirs[sc.k].sync(); mirAil[sc.k].racine.visible = true; mirAil[sc.k].sync();
          pcs[sc.k].maj(t, clamp(1 - (t - sc.slot.impact) / 0.7));
          info = { titre: m.nom, kmh: pc.kmh, beta: pc.beta, aLat: pc.aLat, pc };
        }
        cam = cameraEcurie(sc, t, camera.aspect);
      } else { ringVisible = true; ring.groupe.visible = true; fog(ring.brouillard); parquer(t, ctx); cam = chemin([{ t: tl.finEcuries, p: [0, 26, 118], c: [0, 5, 14], fov: 38, roll: 0 }, { t: 53, p: [-14, 64, 176], c: [0, 6, 0], fov: 46, roll: 0 }], t); }
      if (ringVisible || acte === 'II') {
        ring.maj(t, etat.pouls, etat.arrives, etat.vague);
        // portes du Ring : celle de l'écurie courante s'ouvre au franchissement ; les autres veillent (vague 3 : elles crépitent)
        portes.forEach((p, j) => {
          const s2 = scenarios[j], d = t - s2.slot.impact, vague3 = etat.vague === 3;
          const ouv = d > -0.3 && d < 1.0 ? smoother((d + 0.3) / 0.25) * (1 - smoother((d - 0.6) / 0.4)) : 0;
          const veille = d >= 1.0 ? 0.55 : (vague3 ? 0.4 + 0.3 * Math.sin(t * 21 + j * 3.1) : 0);
          p.groupe.visible = ringVisible; p.maj(t, ouv, vague3 && d < 0 ? 0.7 : ouv * 0.6, veille);
        });
      }
    } else if (acte === 'III') {
      ring.groupe.visible = true; piste.groupe.visible = true; actIII.groupe.visible = true; fog({ couleur: '#05040c', densite: 0.0022 });
      ring.maj(t, etat.pouls, 15, 3); concepts.forEach((c) => (c.visible = true)); actIII.maj(t, ctx); cam = actIII.camera(t); info = actIII.info(t);
      portes.forEach((p) => { p.groupe.visible = true; p.maj(t, 0, 0, 0.5); });
      cleMonde.intensity = 0.7;
    } else if (acte === 'IV') {
      actIV.groupe.visible = true; hemi.intensity = 0.25; actIV.maj(t, ctx); cam = actIV.camera(t); info = actIV.info(t);
    } else if (acte === 'V') {
      const ph = actV.phase(t);
      if (ph === 'paris') { ring.groupe.visible = true; ring.maj(t, etat.pouls, 15, 3); fog(ring.brouillard); parquer(t, ctx); portes.forEach((p) => { p.groupe.visible = true; p.maj(t, 0, 0, 0.6); }); cam = actV.camera(t); }
      else { actV.groupe.visible = true; fog({ couleur: '#05060c', densite: 0.0016 }); cam = actV.camera(t); }
      actV.maj(t, ctx); info = actV.info(t);
    } else {
      ring.groupe.visible = true; actVI.groupe.visible = true; ring.maj(t, etat.pouls, 15, 3); fog(ring.brouillard); parquer(t, ctx); portes.forEach((p) => { p.groupe.visible = true; p.maj(t, 0, 0, 0.7); });
      actVI.maj(t, ctx); cam = actVI.camera(t); info = actVI.info(t); parc.forEach((v) => { v.visible = v.scale.x > 0.01; });
    }
    if (acte !== 'I' && acte !== 'III') { piste.groupe.visible = false; }
    // fumée / étincelles / gomme du Ring : visibles dès qu'une écurie est arrivée
    const ringActif = ring.groupe.visible && (acte === 'II' || acte === 'V' || acte === 'VI');
    fumee.objet.visible = etinc.objet.visible = gomme.objet.visible = ringActif;
    if (ringActif) apres.push(() => { fumee.maj(t, camera, H); etinc.maj(t, camera, H); gomme.maj(t); });
    // caméra
    const fovPunch = sc && t >= sc.slot.impact - 0.05 ? 1 + 0.07 * Math.exp(-(t - sc.slot.impact) * 9) : 1;
    camera.position.set(...cam.p); camera.up.set(0, 1, 0); camera.lookAt(new THREE.Vector3(...cam.c)); if (cam.roll) camera.rotateZ(cam.roll);
    camera.fov = cam.fov * fovPunch; camera.aspect = L / H; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    apres.forEach((fn) => fn());
    return { etat, info, sc, ctx, cam };
  }

  /* ───────── image complète ───────── */
  function reglerPost(t, r) {
    const u = post.u, etat = r.etat, sc = r.sc;
    u.temps.value = t; u.flash.value = 0; u.dechirure.value = 0; u.ondeForce.value = 0; u.flou.value = 0; u.aberration.value = 0.0006; u.gelForce.value = 0; u.fondu.value = 0;
    u.exposition.value = 0.84; u.vignette.value = 0.6; u.saturation.value = 1.0;
    if (sc && etat.acte.id === 'II') {
      const f = impactEcurie(sc, t);
      u.flash.value = f.flash * 0.9; u.dechirure.value = f.dechirure > 0.001 ? f.dechirure : 0;
      u.flou.value = clamp(0.9 * f.montee + 0.5 * f.retombee, 0, 1); u.aberration.value = 0.0006 + 0.004 * (f.montee + f.retombee) * 0.8;
      const hero = (t < sc.slot.impact ? sc.A.pose(t, { sansSuspension: true }) : sc.B.pose(t, { sansSuspension: true })).pos;
      const v = new THREE.Vector3(hero[0], 2, hero[2]).project(camera); u.centreFlou.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
      if (f.ondeForce > 0) { u.onde.value.set(clamp(v.x * 0.5 + 0.5, 0, 1), clamp(v.y * 0.5 + 0.5, 0, 1), f.onde * 0.9); u.ondeForce.value = f.ondeForce * 0.8; }
      const gelCol = new THREE.Color(MONDES[sc.k].accent); u.flashCouleur.value.copy(gelCol).lerp(new THREE.Color(1, 0.93, 0.82), 0.65);
      if (t < sc.slot.impact) { u.gelForce.value = 0.0; }
    }
    if (etat.acte.id === 'I') { u.flou.value = clamp((t - 4.4) / 1.5, 0, 1) * (t < 7.9 ? 0.45 : 0.45 * (1 - clamp((t - 7.9) / 0.8))); u.centreFlou.value.set(0.5, 0.45); u.fondu.value = 1 - smoother(t / 0.9); }
    if (etat.acte.id === 'IV') { u.vignette.value = 0.7; u.exposition.value = 1.05; u.saturation.value = etat.univers && etat.univers.id === 'apoca' ? 0.9 : 1.0; }
    if (r.ctx.extraFlash) u.flash.value += r.ctx.extraFlash * 0.6;
    if (r.ctx.flashPiege) u.flash.value += r.ctx.flashPiege * 0.3;
    if (etat.acte.id === 'VI') { const d = t - actVI.tBoom; if (d >= 0 && d < 0.6) { u.flash.value += Math.exp(-d * 9) * 1.2; u.flou.value = Math.max(u.flou.value, Math.exp(-d * 7)); u.centreFlou.value.set(0.5, 0.5); u.onde.value.set(0.5, 0.5, d * 1.2); u.ondeForce.value = 1 - d / 0.6; } u.fondu.value = smoother((t - 119.35) / 0.65); }
    if (etat.acte.id === 'III' && t > 64.4) { u.exposition.value = 0.8; u.vignette.value = 0.8; }
    if (etat.acte.id === 'III' && t < 53.8) u.fondu.value = 0;
    u.bloomForce.value = qualite === 'brouillon' ? 0.22 : 0.3;
  }

  async function rendreTemps(t, { sub = 1 } = {}) {
    t = clamp(t, 0, plan.duree - 1e-6);
    const M = Math.max(1, sub | 0), tc = t;
    post.debut();
    let rc = null;
    for (let j = 0; j < M; j++) {
      const tj = M === 1 ? t : t + ((j + 0.5) / M - 0.5) * (0.5 / plan.fps);          // obturateur 180° : la moitié d'une période d'image
      const r = placer(Math.max(0, tj)); if (j === Math.floor(M / 2)) rc = r;
      post.accumuler(scene, camera, 1 / M);
    }
    reglerPost(tc, rc);
    post.composer();
    const etatHUD = hud.preparer(tc, rc);
    if (sortieCtx) { if (sortie.width !== L || sortie.height !== H) { sortie.width = L; sortie.height = H; } sortieCtx.drawImage(renderer.domElement, 0, 0, L, H); hud.dessiner(sortieCtx, L, H, etatHUD); }
    return rc.etat;
  }

  // 36 clés de la planche contact : pour les écuries (échantillon) Monde → Portail → Drift, puis les autres actes
  const repere = (t, label, groupe) => ({ t: +t.toFixed(3), label, groupe });
  const ecr = (k, quoi) => { const s = tl.ecuries[k]; return quoi === 'monde' ? s.debut + 0.45 * s.dureeA : quoi === 'portail' ? s.impact - 0.11 : s.impact + Math.min(0.9, 0.7 * s.dureeB); };
  const reperesPlanche = [
    repere(1.2, 'Rainbow Road · grille', 'I'), repere(5.2, 'La meute à 290 km/h', 'I'), repere(9.8, 'Ouverture sur l\'Arène', 'I'),
    ...[0, 3, 6, 9, 12, 14].flatMap((k) => ['monde', 'portail', 'ring'].map((q) => repere(ecr(k, q), `${MONDES[k].nom} · ${q === 'monde' ? '1 monde natif' : q === 'portail' ? '2 portail' : '3 drift dans le Ring'}`, 'II'))),
    repere(tl.finEcuries + 0.7, 'Le Ring se remplit', 'II'), repere(53.6, 'Grille de la meute', 'III'), repere(58.0, 'Lâcher sur 5 voies', 'III'),
    repere(63.0, 'Caisses mystères', 'III'), repere(67.6, 'Silhouette noire', 'III'),
    repere(70.6, 'Gotham · Batmobile', 'IV'), repere(78.5, 'Formule 1 en flèche', 'IV'), repere(84.5, 'Apocalypse · N12 vs N13', 'IV'),
    repere(91.0, 'Piège 2', 'V'), repere(96.6, 'Piège 7', 'V'), repere(102.0, 'Règle sacrée', 'V'), repere(105.5, 'Tableau des paris', 'V'),
    repere(110.0, 'Le parc réuni', 'VI'), repere(111.3, 'FAITES VOS JEUX !', 'VI'), repere(115.0, 'Trophée d\'or', 'VI'),
  ];
  if (reperesPlanche.length !== 36) throw new Error('planche : 36 repères attendus, ' + reperesPlanche.length);

  const inventaire = {
    conceptCars: concepts.length, ailiersM3d: ailiers.length, bolidesM3dTotal: codesSurMesure().length, mondesNatifs: MONDES.length, portails: portes.length + 15,
    ecuriesAuRing: 15, parc: parc.length, hdr: post.hdr, duree: plan.duree, fps: plan.fps,
  };
  /** Contrôle physique pour la QA : β, braquage, tangage, roulis à un instant de drift. */
  function sondePhysique(k, t) { const sc = scenarios[k], p = (t < sc.slot.impact ? sc.A : sc.B).pose(t); return { beta: p.beta / DEG, braquage: p.braquage / DEG, tangage: p.tangage / DEG, roulis: p.roulis / DEG, heave: p.heave, ecrasement: p.ecrasement, kmh: p.kmh, aLat: p.aLat, aPar: p.aPar, derive: p.derive }; }
  return { scene, camera, renderer, rendreTemps, duree: plan.duree, fps: plan.fps, tl, scenarios, inventaire, reperesPlanche, sondePhysique, post, hud, placer, concepts, ailiers, portes, parc, bolides, ring, actes: { actI, actIII, actIV, actV, actVI } };
}
