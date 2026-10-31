/* SEGMENT « folie » — CLIMAX (78 → 88 s) et CARTE FINALE (88 → 92 s).

   78,0 → 84,0  SPRINT FINAL : les 15 bolides (3 rangs sur les 5 voies de la piste de la notice) foncent vers la caméra qui recule
                devant eux ; dépassements doux (ondulations nulles à l'arrivée : l'ordre d'arrivée est écrit d'avance)
   84,0 → 86,0  la caméra se poste à la ligne d'arrivée, rase-piste
   86,0         PHOTO-FINISH (repère son photo_finish) : ARRÊT SUR IMAGE (le temps des bolides se fige 1,2 s), flash blanc bref,
                le rideau laser de la ligne s'allume, la caméra tourne autour des deux nez à l'arrêt (bullet time) : la Mégane
                gagne d'un demi-centimètre devant la GR Supra (le bouton pressé au début du film)
   87,2 → 88,0  le temps repart, la meute s'échappe, fondu
   88,0 → 92,0  CARTE FINALE : « GRAND PRIX DE NOËL — 23 DÉCEMBRE — À VOS PARIS ! » en Fredoka au centre (le seul plan où le texte
                peut occuper le centre), sur un fond 3D sobre : le trophée d'or qui tourne au-dessus des 5 rubans de lumière.

   Tout est fonction pure de t : x(t) en forme close, temps des bolides τ(t) gelé par morceaux. */
import { poser } from '../v7_multivers_4k/voitures.js';
import { graineur } from '../v7_multivers_4k/physique_cgi.js';
import { clamp, lerp, smoother, textureToile, poseLibre, VOIES_HEX, impulsion } from './folie_outils.js';

export const T_PHOTO = 86.0, GEL = 1.2, T_CARTE = 88.0;
const XF = 300;                        // ligne d'arrivée (x, cm)
const V = 34;                          // vitesse de la meute (cm/s, ralenti)
const zVoie = (i) => (i - 3) * 4.84;   // voies 1..5 de la piste de la notice

/** temps des bolides : figé pendant l'arrêt sur image du photo-finish */
const tau = (t) => (t < T_PHOTO ? t : t < T_PHOTO + GEL ? T_PHOTO : t - GEL);

export function creerSprint(ctx, { lum, voitures }) {
  const { THREE, arsenal, stage3d } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'folie-sprint';
  const final = new THREE.Group(); final.name = 'folie-carte'; groupe.add(final);
  const course = new THREE.Group(); groupe.add(course);

  /* ───────── la piste de la notice (5 voies translucides) dans un tunnel d'arches arc-en-ciel ───────── */
  const lane = arsenal.buildLane(THREE, 640); lane.position.x = 160; course.add(lane);
  lane.traverse((o) => { const m = o.material; if (!m || !m.isMeshStandardMaterial) return; if (m.opacity < 0.5) { m.opacity = 0.1; m.emissiveIntensity = 0.04; m.depthWrite = false; } else { m.emissiveIntensity *= 0.7; m.opacity = 0.92; m.roughness = 0.6; m.color.multiplyScalar(0.45); } m.envMapIntensity = 0.15; });
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(1400, 600), new THREE.MeshStandardMaterial({ color: 0x04050a, roughness: 0.92, metalness: 0, envMapIntensity: 0.05 })); sol.rotation.x = -Math.PI / 2; sol.position.set(160, -0.08, 0); course.add(sol);
  const archeMat = new THREE.MeshStandardMaterial({ color: 0x0c1020, metalness: 0.85, roughness: 0.3, envMapIntensity: 0.12 });
  const lis = VOIES_HEX.map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.1), toneMapped: false }));
  for (let k = 0; k < 22; k++) {
    const a = new THREE.Group(); a.position.x = -110 + k * 26; a.rotation.y = Math.PI / 2;
    a.add(new THREE.Mesh(new THREE.TorusGeometry(34, 1.0, 8, 40, Math.PI), archeMat));
    a.add(new THREE.Mesh(new THREE.TorusGeometry(32.8, 0.18, 6, 56, Math.PI), lis[k % 5]));
    course.add(a);
  }
  // tribunes lointaines : lumières de la foule (flashs de téléphones) de part et d'autre
  const rb = graineur(8686), geoB = new THREE.SphereGeometry(0.5, 8, 6);
  const foule = new THREE.InstancedMesh(geoB, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 260);
  { const o = new THREE.Object3D(), c = new THREE.Color(); for (let i = 0; i < 260; i++) { const cote = i % 2 ? 1 : -1; o.position.set(-100 + rb() * 520, 6 + rb() * 40, cote * (70 + rb() * 50)); o.scale.setScalar(0.6 + rb() * 1.4); o.updateMatrix(); foule.setMatrixAt(i, o.matrix); foule.setColorAt(i, c.set(i % 7 === 0 ? '#ffffff' : VOIES_HEX[i % 5]).multiplyScalar(0.9 + rb() * 1.2)); } }
  course.add(foule);
  // ligne d'arrivée : damier, portique lumineux, rideau laser (photo-finish)
  const texDamier = textureToile(THREE, 64, 512, (g, w, h) => { const n = 4, m = 32; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { g.fillStyle = (i + j) % 2 ? '#111111' : '#f4f4f4'; g.fillRect(i * w / n, j * h / m, w / n, h / m); } });
  const damier = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 24.6), new THREE.MeshBasicMaterial({ map: texDamier, toneMapped: false })); damier.rotation.x = -Math.PI / 2; damier.position.set(XF, 0.03, 0); course.add(damier);
  const portiqueMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(0.55), toneMapped: false });
  for (const z of [-13.4, 13.4]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 16, 0.8), portiqueMat); m.position.set(XF, 8, z); course.add(m); }
  const traverse = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 27.6), portiqueMat); traverse.position.set(XF, 16, 0); course.add(traverse);
  const banniere = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshBasicMaterial({ map: texDamier, toneMapped: false, side: THREE.DoubleSide })); banniere.rotation.set(0, Math.PI / 2, 0); banniere.position.set(XF, 14, 0); course.add(banniere);
  const rideau = new THREE.Mesh(new THREE.PlaneGeometry(26.8, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9ffbff').multiplyScalar(1.6), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  rideau.rotation.y = Math.PI / 2; rideau.position.set(XF, 8, 0);   // non ajouté : vu de profil, un plan additif devient un pilier lumineux
  const fil = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 26.8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(3), toneMapped: false })); fil.position.set(XF, 0.18, 0); course.add(fil);

  /* ───────── les 15 bolides : rang de tête (Mégane – Supra au coude à coude), puis les F1, puis les boss et les épaves ───────── */
  const m = voitures.meute, f = voitures.f1s, x = voitures.extras;
  const grille = [
    // [bolide, voie, retard du NEZ sur la ligne à T_PHOTO (cm)]
    [m[3], 3, 0], [m[0], 2, 0.55], [m[1], 4, 3.2], [m[2], 1, 5.5], [m[4], 5, 4.4],
    [f[0], 3, 13], [f[1], 2, 11.5], [f[2], 4, 12.2], [f[3], 1, 15], [f[4], 5, 14],
    [voitures.batmobile, 3, 24], [x[0], 2, 26], [x[1], 4, 25], [x[2], 1, 28.5], [x[3], 5, 30],
  ].map(([v, voie, retard], i) => {
    const r = graineur(5100 + i * 13);
    return { v, voie, retard, A: (i < 2 ? 1.2 : 3.2) * (0.5 + r()), w: 0.6 + r() * 0.9, ph: r() * 6.28, demiL: (v.v7.L || 7.4) / 2 };
  });
  const xDe = (g, t) => {
    const tt = tau(t), d = T_PHOTO - tt;
    const ondule = g.A * Math.sin(g.w * tt + g.ph) * clamp(d / 6) * (d > 0 ? 1 : 0);   // dépassements, nuls à l'arrivée
    return XF - g.demiL - g.retard + V * (tt - T_PHOTO) + ondule;
  };

  /* ───────── carte finale : trophée d'or, rubans de lumière, sol miroir sombre ───────── */
  const troph = stage3d.TROPHY_BUILDERS.grandprix(THREE);
  const boite = new THREE.Box3().setFromObject(troph), taille = boite.getSize(new THREE.Vector3());
  const echT = 15 / Math.max(0.001, taille.y); troph.scale.setScalar(echT); troph.position.y = -boite.min.y * echT;
  const socle = new THREE.Group(); socle.add(troph); socle.position.set(0, 0, 0); final.add(socle);
  troph.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = Math.max(o.material.envMapIntensity || 1, 1.2); });
  const solF = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x05040a, roughness: 0.35, metalness: 0.5, envMapIntensity: 0.15 })); solF.rotation.x = -Math.PI / 2; final.add(solF);
  const rubans = VOIES_HEX.map((c, j) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 520), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.3), transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; r.position.set((j - 2) * 4.6, 0.05, -250); final.add(r); return r;
  });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshBasicMaterial({ map: textureToile(THREE, 256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,214,120,0.9)'); r.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.08; final.add(halo);

  /* ───────── caméras ───────── */
  const lead = (t) => XF + V * (tau(t) - T_PHOTO);
  function camCourse(t) {
    const F = [XF - 1.5, 1.3, -1.6];                                             // les deux nez au coude à coude (voies 2 et 3)
    if (t < 86.0) {
      const u = smoother((t - 78) / 5.5), xl = lead(t);
      const suivi = { p: [xl + lerp(31, 18, u), lerp(8, 4.4, u), lerp(8, 5.5, u)], c: [xl - lerp(9, 6, u), 1.6, lerp(0.5, -0.5, u)], fov: lerp(40, 36, u) };
      const poste = { p: [XF + 15, 3.1, 9.5], c: [XF - 6, 1.7, -0.8], fov: 27 };
      const k = smoother((t - 84.3) / 1.4);
      return { p: suivi.p.map((a, i) => lerp(a, poste.p[i], k)), c: suivi.c.map((a, i) => lerp(a, poste.c[i], k)), fov: lerp(suivi.fov, poste.fov, k), roll: 0 };
    }
    // bullet time : orbite autour des nez figés, de l'avant 3/4 vers le profil pur (la ligne et l'écart se lisent)
    const a0 = Math.atan2(9.5 - F[2] + 0, 15 + 1.5), a1 = Math.PI / 2 - 0.08;
    const u = smoother((t - T_PHOTO) / (GEL + 0.2)), a = lerp(a0, a1, u), r = lerp(Math.hypot(16.5, 11.1), 13.5, u);
    return { p: [F[0] + Math.cos(a) * r, lerp(3.1, 2.4, u), F[2] + Math.sin(a) * r], c: [lerp(XF - 6, F[0], smoother((t - T_PHOTO) / 0.5)), 1.4, lerp(-0.8, F[2], smoother((t - T_PHOTO) / 0.5))], fov: lerp(27, 28, u), roll: 0 };
  }
  function camCarte(t) {
    const u = smoother((t - T_CARTE) / 4);
    return { p: [lerp(8, -4, u), lerp(16, 14, u), lerp(96, 86, u)], c: [0, 25, 0], fov: 32, roll: 0 };
  }

  return {
    groupe,
    maj(t, sous) {
      const carte = sous === 'final';
      final.visible = carte; course.visible = !carte;
      if (!carte) {
        for (const g of grille) {
          const xx = xDe(g, t); g.v.visible = true;
          poser(g.v, poseLibre([xx, 0, zVoie(g.voie)], Math.PI / 2, xx + 400));
          if (g.v.v7.roues) for (const w of g.v.v7.roues) if (w.type === 'm3d' && w.avant) w.noeud.rotation.y = 0;
        }
        const gele = t >= T_PHOTO && t < T_PHOTO + GEL;
                fil.material.color.setScalar(gele ? 5 + 3 * Math.exp(-(t - T_PHOTO) * 4) : 3);
        lum.regler('spot', { c: 0xfff1dc, i: 0.8, p: [XF - 20, 60, 30], v: [XF - 20, 0, 0], d: 260, angle: 0.75, penombre: 0.6 });
        lum.regler('d1', { c: 0xfff0dc, i: 0.55, p: [XF + 80, 90, 60], v: [XF, 0, 0] });
        lum.regler('d2', { c: 0x6f8cff, i: 0.7, p: [XF - 120, 50, -80], v: [XF, 0, 0] });
        lum.regler('p1', { c: 0x9ffbff, i: gele ? 1.6 : 0.5, p: [XF + 2, 9, 0], d: 30 });
        const flash = t >= T_PHOTO ? 0.9 * Math.exp(-(t - T_PHOTO) / 0.035) : 0;   // le flash s'ajoute en HDR à tout le cadre : bref, sinon voile
        return {
          camera: camCourse(t),
          fond: 0x04050c, brouillard: { couleur: '#05060f', densite: 0.0026 },
          lumieres: { hemi: 0.3, cle: 0.35 },
          post: { exposition: 0.86, vignette: gele ? 0.72 : 0.6, saturation: gele ? 0.9 : 1.05, bloomForce: 0.3, flash, flashCouleur: [1, 1, 1], fondu: smoother((t - 87.62) / 0.38) },
          gele,
        };
      }
      socle.rotation.y = (t - T_CARTE) * 0.55;
      rubans.forEach((r, j) => { r.material.opacity = 0.35 + 0.5 * smoother((t - T_CARTE - j * 0.08) / 0.6); });
      lum.regler('spot', { c: 0xfff0d0, i: 2.4, p: [12, 70, 50], v: [0, 6, 0], d: 220, angle: 0.3, penombre: 0.7 });
      lum.regler('d1', { c: 0x8fb4ff, i: 0.8, p: [-50, 40, -60], v: [0, 6, 0] });
      lum.regler('d2', { c: 0xffd9a0, i: 0.5, p: [40, 20, 80], v: [0, 6, 0] });
      lum.regler('p1', { c: 0xffd27a, i: 2.0, p: [0, 9, 10], d: 40 });
      return {
        camera: camCarte(t),
        fond: 0x05030b, brouillard: { couleur: '#05030b', densite: 0.0035 },
        lumieres: { hemi: 0.18, cle: 0.2 },
        post: { exposition: 0.9, vignette: 0.7, bloomForce: 0.32, fondu: Math.max(1 - smoother((t - T_CARTE) / 0.35), smoother((t - 91.55) / 0.45)) },
      };
    },
  };
}
