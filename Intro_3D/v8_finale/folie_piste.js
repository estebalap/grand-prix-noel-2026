/* SEGMENT « folie » — LA COURSE SUR LA RAINBOW ROAD 3D (55 → 66 s), plein écran, zéro HUD technique.

   55,0 → 59,5  LA MEUTE : creerActeI (V7) rejoué tel quel, décalé de 51,4 s (son départ T0 = 3,6 s tombe sur meute_depart 55,0 s) :
                les 5 bolides de MEUTE dévalent les 5 voies, caméra de poursuite rase-bitume
   59,5 → 62,0  LES CAISSES MYSTÈRES : 5 caisses « ? » posées dans la ligne droite finale, chaque bolide en traverse une
                (caisses_ouverture 60,2 s) : les 6 faces volent en éclats, une étoile d'or s'élève dans un rayon arc-en-ciel
   62,0 → 66,0  LES BOSS : les 5 F1 en FLÈCHE frôlent la caméra (boss_passage 63,6 s), puis la Batmobile surgit derrière elles,
                post-combustion allumée, et s'arrête face caméra

   Tout est fonction pure de t : poses analytiques le long des splines de voie (construirePiste), éclats en forme close. */
import { construirePiste, creerActeI } from '../v7_multivers_4k/actes.js';
import { creerRing } from '../v7_multivers_4k/mondes_et_portails.js';
import { profilVitesse } from '../v7_multivers_4k/physique_cgi.js';
import { creerEtincelles, creerPostCombustion } from '../v7_multivers_4k/effets_cgi.js';
import { poser } from '../v7_multivers_4k/voitures.js';
import { chemin } from '../v7_multivers_4k/camera_crescendo.js';
import { clamp, lerp, smoother, textureToile, policeCanvas, rectArrondi, poseSpline, VOIES_HEX } from './folie_outils.js';

export const DT_MEUTE = 51.4;                 // décalage de l'acte I de la V7 (T0 = 3,6 s → 55,0 s ; T1 = 7,9 s → 59,3 s)
export const T_CAISSES = 60.2, T_BOSS = 63.6;
const RETARD_CAISSE = [0.16, 0.08, 0, 0.11, 0.2];
const V_CAISSES = 58;                          // cm/s (ralenti) dans la ligne droite finale
const FLECHE = [18, 9, 0, 9, 18];              // retard (cm) de chaque F1 sur la tête de flèche (voie centrale)
const V_F1 = 95;

export function creerPiste(ctx, { lum, voitures }) {
  const { THREE, envMap, equipes } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'folie-piste';
  /* l'Arène (sol d'obsidienne, anneaux arc-en-ciel, projecteurs, dôme étoilé) — SANS ses lumières : le segment garde un jeu fixe */
  const ring = creerRing(THREE, { envMap, equipes });
  for (const l of Object.values(ring.lumieres)) ring.groupe.remove(l);
  groupe.add(ring.groupe);
  const trace = ctx.ouverture.traceRainbow(ctx.circuit), piste = construirePiste(THREE, trace);
  groupe.add(piste.groupe);
  const meute = voitures.meute, f1s = voitures.f1s, bat = voitures.batmobile;
  const actI = creerActeI({ THREE, piste, voituresMeute: meute, ring });
  groupe.add(actI.groupe);
  const L = piste.centre.longueur, sp = piste.splines, sc = piste.centre;
  const gaucheDe = (s) => { const T = sc.tangente(s), n = Math.hypot(T[2], T[0]) || 1; return [T[2] / n, 0, -T[0] / n]; };

  /* ───────── caisses mystères ───────── */
  const sB = L - 36;
  const texQ = textureToile(THREE, 256, 256, (g, w, h) => {
    const d = g.createLinearGradient(0, 0, w, h); d.addColorStop(0, '#3b1d7a'); d.addColorStop(1, '#1c0d40'); g.fillStyle = d; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 14; rectArrondi(g, 12, 12, w - 24, h - 24, 26); g.stroke();
    g.font = policeCanvas(180); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#1a0a36'; g.strokeText('?', w / 2, h / 2 + 10);
    g.fillStyle = '#ffe23d'; g.fillText('?', w / 2, h / 2 + 10);
  });
  const matFace = new THREE.MeshStandardMaterial({ map: texQ, emissive: 0xffffff, emissiveMap: texQ, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
  const C = 3.8, geoFace = new THREE.PlaneGeometry(C, C);
  const FACES = [[0, 0, 1, 0, 0], [0, 0, -1, 0, Math.PI], [1, 0, 0, 0, Math.PI / 2], [-1, 0, 0, 0, -Math.PI / 2], [0, 1, 0, -Math.PI / 2, 0], [0, -1, 0, Math.PI / 2, 0]];
  const geoEtoile = (() => { const s = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.75 : 1.8; if (k) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }); g.center(); return g; })();
  const matEtoile = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb000, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.25 });
  const etinc = creerEtincelles(THREE);
  const caisses = sp.map((s, j) => {
    const P = s.point(sB), T = s.tangente(sB), cap = Math.atan2(T[0], T[2]);
    const g = new THREE.Group(); g.position.set(P[0], P[1] + C / 2 + 0.15, P[2]); g.rotation.y = cap; groupe.add(g);
    const faces = FACES.map(([nx, ny, nz, rx, ry]) => { const m = new THREE.Mesh(geoFace, matFace); g.add(m); return { m, n: [nx, ny, nz], rx, ry }; });
    const etoile = new THREE.Mesh(geoEtoile, matEtoile); g.add(etoile);
    const rayon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.6, 46, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(VOIES_HEX[j]).multiplyScalar(1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    rayon.position.y = 23; g.add(rayon);
    const tHit = T_CAISSES + RETARD_CAISSE[j];
    etinc.gerbe({ t0: tHit, p0: [P[0], P[1] + 2.4, P[2]], dir: [0, 1, 0], n: 46, dispersion: 0.85, vmin: 30, vmax: 110, vie: 0.9, taille: 0.5, graine: 810 + j });
    return { g, faces, etoile, rayon, tHit, P };
  });
  etinc.figer(); groupe.add(etinc.objet);

  /* ───────── boss : flèche de F1 + Batmobile ───────── */
  const sCam = L - 30;
  const sStop = L - 9;
  // la Batmobile surgit derrière la flèche puis FREINE à fond face caméra (arrêt à 65,1 s)
  const CLES_BAT = [[63.3, 95], [64.15, 88], [65.1, 0], [80, 0]];
  const profBat = profilVitesse(CLES_BAT, sStop - profilVitesse(CLES_BAT, 0).dist(65.1));
  const T_CUT_BAT = 63.9;
  const pc = creerPostCombustion(THREE, '#58a6ff', '#ffc24a'); bat.add(pc.groupe); pc.groupe.position.set(0, 0.6, -(bat.v7.L || 7.6) * 0.5 + 3.4);

  /* ───────── caméras des caisses et des boss ───────── */
  const surPiste = (s, lat, h) => { const P = sc.point(s), n = gaucheDe(s); return [P[0] + n[0] * lat, P[1] + h, P[2] + n[2] * lat]; };
  const camCaisses = (t) => {
    const u = smoother((t - 59.5) / 2.5);
    const p = surPiste(sB + 27 - 4 * u, -15 + 2 * u, 7.5 - 1.5 * u), c = surPiste(sB - 4, 0, 2.2);
    return { p, c, fov: 40 - 3 * u, roll: 0 };
  };
  // V8 (veto du Chef de régie) : le bolide vedette occupe le cadre sur TOUT le plan
  //  62,0 → 63,9  travelling latéral bas COLLÉ à la F1 de tête (voie centrale) : caméra solidaire du bolide, un peu en avant,
  //               qui regarde en arrière : la carrosserie remplit la largeur du cadre, les 4 autres F1 de la flèche derrière elle
  //  63,9 → 66,0  la caméra recule devant la Batmobile, rase-piste, et la laisse venir : freinage, plongée du nez, arrêt en gros plan
  const camBoss = (t) => {
    if (t < T_CUT_BAT) {
      const u = clamp((t - 62) / (T_CUT_BAT - 62)), s = sCam + V_F1 * (t - T_BOSS);
      // caméra à 7,2 cm à droite de l'axe, à 2,3 cm AU-DESSUS DE LA SURFACE : la hauteur suit le dévers de la grande courbe
      // (même loi que construirePiste : y − o·sin(dévers), o = décalage latéral) au lieu de plonger dans la piste relevée
      const sq = s + 2.6 - 1.2 * u, lat = -7.2 + 0.6 * u, p = surPiste(sq, lat, 2.3), c = surPiste(s - 2.2, 0.4, 1.0);
      const iD = clamp(Math.round((sq / L) * (piste.devers.length - 1)), 0, piste.devers.length - 1);
      p[1] -= lat * Math.sin(piste.devers[iD] || 0);
      return { p, c, fov: 38, roll: 0.03 };
    }
    const u = smoother((t - T_CUT_BAT) / 1.5), sb = profBat.dist(t), D = lerp(11.5, 8.6, u);
    const pb = sp[2].point(sb);
    return { p: surPiste(sb + D, -3.2 - 0.8 * u, 2.1 + 0.2 * u), c: [pb[0], pb[1] + 1.15, pb[2]], fov: 36, roll: 0 };
  };
  const pouls = (t) => Math.exp(-(((t * 2.1) % 1 + 1) % 1) * 7.5);

  return {
    groupe, piste, L,
    /** appelé à CHAQUE image, quel que soit le plan : la post-combustion vit sur la Batmobile, réutilisée par le sprint */
    reinit(t) { pc.maj(t, 0); },
    maj(t, sous, apres) {
      ring.maj(t, pouls(t), 15, 3);
      caisses.forEach((c) => (c.g.visible = sous === 'caisses'));
      etinc.objet.visible = sous === 'caisses';
      actI.groupe.visible = sous === 'meute';
      pc.maj(t, 0);
      let camera;
      if (sous === 'meute') {
        const ctxI = { camera: null, hPx: ctx.H, pouls: pouls(t), apres: (fn) => apres.push((cam) => { ctxI.camera = cam; fn(); }) };
        actI.maj(t - DT_MEUTE, ctxI);                                          // pose la meute, allume la rampe voie par voie
        camera = actI.camera(t - DT_MEUTE, ctx.L / ctx.H);
        lum.regler('d1', { c: 0xfff0dc, i: 1.15, p: [60, 140, 90], v: [0, 0, 0] });
        lum.regler('d2', { c: 0x6f8cff, i: 0.8, p: [-90, 70, -110], v: [0, 0, 0] });
      } else {
        piste.matsVoie.forEach((m, j) => m.color.copy(m.userData.base).multiplyScalar(0.62 + 0.12 * pouls(t + j * 0.1)));
      }
      if (sous === 'caisses') {
        meute.forEach((v, j) => { const s = sB + V_CAISSES * (t - caisses[j].tHit) - 2.2; v.visible = true; poser(v, poseSpline(sp[j], s)); });
        caisses.forEach((c, j) => {
          const a = t - c.tHit;
          c.faces.forEach((f, k) => {
            if (a <= 0) { f.m.position.set(f.n[0] * C / 2, f.n[1] * C / 2, f.n[2] * C / 2); f.m.rotation.set(f.rx, f.ry, 0); f.m.visible = true; return; }
            // éclat cartoon : chaque face part le long de sa normale (+ poussée vers l'avant du bolide), monte, retombe, tournoie
            const v = 34 + 7 * k, vy = 26 + 6 * ((k + j) % 3);
            f.m.position.set(f.n[0] * (C / 2 + v * a), f.n[1] * C / 2 + vy * a - 0.5 * 160 * a * a, f.n[2] * (C / 2 + v * a) + 22 * a);
            f.m.rotation.set(f.rx + a * (6 + k), f.ry + a * (4 - k), a * 5);
            f.m.visible = a < 0.9;
          });
          const up = smoother(a / 0.5);
          c.etoile.visible = a > 0; c.etoile.position.set(0, -0.4 + 7.5 * up, 0); c.etoile.rotation.set(0, a * 7, 0); c.etoile.scale.setScalar(0.4 + 0.75 * up);
          c.rayon.material.opacity = a > 0 ? 0.42 * Math.exp(-a * 1.1) * smoother(a / 0.08) : 0;
        });
        apres.push((cam) => etinc.maj(t, cam, ctx.H));
        camera = camCaisses(t);
        lum.regler('d1', { c: 0xfff0dc, i: 1.0, p: [60, 140, 90], v: [0, 0, 0] });
        lum.regler('d2', { c: 0xb06bff, i: 0.7, p: [-90, 70, -110], v: [0, 0, 0] });
        const ouvert = caisses.reduce((m, c) => Math.max(m, Math.exp(-Math.pow((t - c.tHit - 0.1) / 0.25, 2))), 0);
        const Pm = caisses[2].P; lum.regler('p1', { c: 0xffd23f, i: 4.5 * ouvert, p: [Pm[0], Pm[1] + 8, Pm[2]], d: 60 });
      }
      if (sous === 'boss') {
        f1s.forEach((v, j) => { const s = sCam + V_F1 * (t - T_BOSS) - FLECHE[j]; v.visible = t < T_CUT_BAT; poser(v, poseSpline(sp[j], s)); });
        // Batmobile : plongée du nez proportionnelle à la décélération (tangage > 0 = nez qui plonge), relâchée à l'arrêt
        const sb = profBat.dist(t), dec = Math.max(0, -profBat.acc(t)), poseB = poseSpline(sp[2], sb);
        poseB.tangage = Math.min(0.07, dec * 0.0007) * (t < 65.1 ? 1 : Math.exp(-(t - 65.1) * 9) * Math.cos((t - 65.1) * 30));
        bat.visible = t >= T_CUT_BAT - 0.6; poser(bat, poseB);
        pc.maj(t, t < 65.1 ? 1 : lerp(1, 0.25, smoother((t - 65.1) / 0.5)));
        camera = camBoss(t);
        lum.regler('d1', { c: 0xdfe8ff, i: 0.9, p: [60, 140, 90], v: [0, 0, 0] });
        lum.regler('d2', { c: 0x3f6bff, i: 1.3, p: [-90, 70, -110], v: [0, 0, 0] });
        const pb = sp[2].point(sb); lum.regler('p1', { c: 0x7fb8ff, i: 2.2, p: [pb[0], pb[1] + 9, pb[2] + 4], d: 40 });
      }
      return {
        camera,
        fond: sous === 'boss' ? 0x02040c : 0x04050c,
        brouillard: sous === 'boss' ? { couleur: '#050a1c', densite: 0.0022 } : { couleur: ring.brouillard.couleur, densite: ring.brouillard.densite },
        lumieres: { hemi: 0.4, cle: 0.3 },
        post: { exposition: sous === 'caisses' ? 0.8 : 0.86, vignette: 0.62, bloomForce: 0.3, saturation: 1.05 },
      };
    },
  };
}
