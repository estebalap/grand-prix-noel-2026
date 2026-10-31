/* SEGMENT « folie » — LE LABO DES PIÈGES (66 → 74 s) et LA RÈGLE DES 41 mm (74 → 78 s).

   Les 6 pièges de plan.pieges sont les gréements RÉELS de shared/arsenal3d.js (ctx.arsenal.RIGS : pose(tau) déterministe), joués sur
   la piste de la notice (buildLane). Chaque plan dure 1,333 s ; le contact bolide-piège tombe à l'instant `contact` du plan (48 % du
   plan, comme le V7.1 l'avait validé à l'image : le choc au cœur du plan). Avant le contact, le bolide roule à la vitesse ralentie
   de l'Arsenal (×2,2) ; après, la réaction n'est plus la petite secousse réaliste de carPose : c'est un CARAMBOLAGE CARTOON
   (salto, tonneau, vrille, saut de cloison…), un seul gag fort par piège, en balistique close (g cartoon = 210 cm/s²).

   Leçons du V7.1 reprises : labo sombre, sol mat, verre presque invisible, tunnel d'arches qui encadre au lieu de traverser,
   caméra 3/4 avant en plongée DANS le couloir de vue (aucun montant entre l'objectif et le piège), lueur de contact LOCALE
   (lampe ponctuelle au nez du bolide), jamais de flash plein écran.

   Règle des 41 mm (74 → 78) : la dorée (41,0 mm, bouclier d'or) passe sous la barre ; la rouge (40,9 mm) est éjectée par la trappe
   à ressort au passage du portique (regle_ejection 76,2 s). Deux étiquettes seulement, sous les voitures, hors de la zone sacrée. */
import { creerEtincelles } from '../v7_multivers_4k/effets_cgi.js';
import { clamp, lerp, smoother, placerCascade, impulsion, DEG } from './folie_outils.js';

export const TITRES = { bascule: 'LA BASCULE', pelote: 'LA PELOTE', obus: "L'OBUS", curling: 'LE CURLING', boulet: 'LE BOULET', bowling: 'LE BOWLING' };
export const T_EJECTION = 76.2;
const K_RALENTI = 2.2;                      // temps de l'Arsenal par seconde de film
const GC = 210;                             // gravité cartoon (cm/s²)
const TOUR = Math.PI * 2;

/** Réactions cartoon (dt = s depuis le contact, x0 = x du centre du bolide au contact, h = demi-hauteur) → centre + angles. */
const REACTIONS = {
  // le tremplin catapulte le bolide : SALTO ARRIÈRE complet, réception sur les roues, petit rebond
  bascule(dt, x0, h) {
    const vx = 15, vy = 50, T = 2 * vy / GC;
    if (dt < T) return { c: [x0 + vx * dt, h + vy * dt - 0.5 * GC * dt * dt, 0], salto: -TOUR * smoother(dt / T), tonneau: 0, lacet: 0.12 * Math.sin(dt * 6) };
    const b = dt - T; return { c: [x0 + vx * T + 9 * b, h + 1.4 * Math.abs(Math.sin(b * 14)) * Math.exp(-b * 7), 0], salto: 0.06 * Math.sin(b * 20) * Math.exp(-b * 6), tonneau: 0, lacet: 0 };
  },
  // la pelote s'emmêle : VRILLE (le bolide tourne sur lui-même, 3 tours), petits sauts, glisse en ralentissant
  pelote(dt, x0, h) {
    const k = 1 - Math.exp(-dt * 3.2);
    return { c: [x0 + 7 * k, h + 0.9 * Math.abs(Math.sin(dt * 16)) * Math.exp(-dt * 2.5), 1.2 * k], salto: 0.12 * Math.sin(dt * 23), tonneau: 0.18 * Math.sin(dt * 17), lacet: 3 * TOUR * k };
  },
  // l'obus explose sous le nez : le bolide saute en TONNEAU (1 tour et demi) et retombe… sur le toit
  obus(dt, x0, h) {
    const vx = -3, vy = 50, T = 2 * vy / GC;
    if (dt < T) return { c: [x0 + vx * dt, h + vy * dt - 0.5 * GC * dt * dt, -1.5 * dt], salto: 0, tonneau: 3 * Math.PI * smoother(dt / T), lacet: 0.3 * dt };
    const b = dt - T; return { c: [x0 + vx * T - 2 * (1 - Math.exp(-b * 4)), h + 0.8 * Math.abs(Math.sin(b * 16)) * Math.exp(-b * 8), -1.5 * T], salto: 0, tonneau: 3 * Math.PI + 0.1 * Math.sin(b * 18) * Math.exp(-b * 5), lacet: 0.3 * T };
  },
  // la pierre de curling pousse le bolide : il SAUTE LA CLOISON vers la voie voisine en pivotant
  curling(dt, x0, h) {
    const T = 0.46, u = clamp(dt / T);
    const y = dt < T ? h + 3.6 * Math.sin(Math.PI * u) : h + 0.6 * Math.abs(Math.sin((dt - T) * 15)) * Math.exp(-(dt - T) * 7);
    return { c: [x0 + 6 * (1 - Math.exp(-dt * 3)), y, 4.84 * smoother(u)], salto: 0, tonneau: -0.55 * Math.sin(Math.PI * u), lacet: 0.75 * TOUR * (1 - Math.exp(-dt * 3.5)) };
  },
  // le boulet de démolition frappe : le bolide est renvoyé EN ARRIÈRE et monte en salto, retombe et rebondit
  boulet(dt, x0, h) {
    const vx = -11, vy = 45, T = 2 * vy / GC;
    if (dt < T) return { c: [x0 + vx * dt, h + vy * dt - 0.5 * GC * dt * dt, 0.8 * dt], salto: -1.0 * TOUR * smoother(dt / T), tonneau: 0.2 * Math.sin(dt * 5), lacet: 0 };
    const b = dt - T; return { c: [x0 + vx * T - 3 * (1 - Math.exp(-b * 5)), h + 1.2 * Math.abs(Math.sin(b * 13)) * Math.exp(-b * 7), 0.8 * T], salto: 0, tonneau: 0, lacet: 0.15 * (1 - Math.exp(-b * 4)) };
  },
  // STRIKE : le bolide s'envole comme une quille, en toupie, se cabre puis retombe
  bowling(dt, x0, h) {
    const vx = 6, vy = 52, T = 2 * vy / GC;
    if (dt < T) return { c: [x0 + vx * dt, h + vy * dt - 0.5 * GC * dt * dt, -3 * dt], salto: -1.15 * Math.sin(Math.PI * dt / T), tonneau: 0.4 * Math.sin(Math.PI * dt / T), lacet: 2 * TOUR * smoother(dt / T) };
    const b = dt - T; return { c: [x0 + vx * T + 3 * (1 - Math.exp(-b * 5)), h + 1.0 * Math.abs(Math.sin(b * 14)) * Math.exp(-b * 7), -3 * T], salto: 0, tonneau: 0, lacet: 2 * TOUR };
  },
};
/** Cadrage par piège : hauteur de visée et ouverture après le contact (les gags aériens montent plus haut). */
const CADRE = { bascule: { air: 3.0, fov: 40, face: true }, pelote: { air: 0.4, fov: 32 }, obus: { air: 3.4, fov: 40 }, curling: { air: 1.2, fov: 35 }, boulet: { air: 2.8, fov: 39 }, bowling: { air: 3.6, fov: 41 } };

export function creerLabo(ctx, { lum, voitures }) {
  const { THREE, arsenal, plan } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'folie-labo';
  const M = arsenal.mats(THREE);
  const lane = arsenal.buildLane(THREE, 150); groupe.add(lane);
  lane.traverse((o) => { const m = o.material; if (!m || !m.isMeshStandardMaterial) return; if (m.opacity < 0.5) { m.opacity = 0.08; m.emissiveIntensity = 0.02; m.depthWrite = false; } else { m.emissiveIntensity *= 0.5; m.opacity = 0.9; m.roughness = 0.85; m.metalness = 0; m.color.multiplyScalar(0.32); } });
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x05060c, roughness: 0.92, metalness: 0.1 })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.08; groupe.add(sol);
  const grille = new THREE.GridHelper(300, 120, 0x2a3a7a, 0x141a38); grille.position.y = -0.05; groupe.add(grille);
  const archeMat = new THREE.MeshStandardMaterial({ color: 0x0c1020, metalness: 0.85, roughness: 0.3 });
  const lisere = [new THREE.MeshBasicMaterial({ color: new THREE.Color('#38e1ff').multiplyScalar(0.9), toneMapped: false }), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b06bff').multiplyScalar(0.9), toneMapped: false })];
  for (let k = 0; k < 10; k++) {
    const a = new THREE.Group(); a.position.x = -72 + k * 16; a.rotation.y = Math.PI / 2;
    a.add(new THREE.Mesh(new THREE.TorusGeometry(30, 1.1, 10, 48, Math.PI), archeMat));
    a.add(new THREE.Mesh(new THREE.TorusGeometry(28.8, 0.16, 6, 64, Math.PI), lisere[k % 2]));
    groupe.add(a);
  }
  const fondLabo = new THREE.Mesh(new THREE.PlaneGeometry(400, 90), new THREE.MeshBasicMaterial({ color: 0x050712 })); fondLabo.position.set(0, 40, -60); groupe.add(fondLabo);
  groupe.traverse((o) => { const m = o.material; if (m && m.isMeshStandardMaterial) m.envMapIntensity = 0.12; });

  /* ───────── les 6 pièges du plan (gréements réels) ───────── */
  const etinc = creerEtincelles(THREE);
  const pieges = plan.pieges.map((p, i) => {
    const r = arsenal.RIGS[p.rig]; if (!r) throw new Error('folie : piège inconnu dans l\'Arsenal : ' + p.rig);
    const b = r.build(THREE, M); b.group.visible = false; groupe.add(b.group);
    const hit = (r.impactX - arsenal.X0) / arsenal.VCAR, tt = (r.declencheX - arsenal.X0) / arsenal.VCAR;
    etinc.gerbe({ t0: p.contact, p0: [r.impactX + 3.6, 1.4, 0], dir: [0.4, 0.8, 0.3], n: 34, dispersion: 0.7, vmin: 25, vmax: 90, vie: 0.6, taille: 0.42, graine: 900 + i });
    return { ...p, i, r, b, hit, tt };
  });
  etinc.figer(); groupe.add(etinc.objet);
  const voituresPieges = [voitures.meute[0], voitures.meute[1], voitures.meute[2], voitures.meute[3], voitures.meute[4], voitures.extras[0]];

  /* ───────── règle des 41 mm : portique, barre, laser, réglette, trappe à ressort, bouclier d'or ───────── */
  const regle = new THREE.Group(); groupe.add(regle);
  const zOr = 4.84, zRouge = -4.84;                                      // voie 4 (dorée, à gauche à l'écran) et voie 2 (rouge, à droite)
  const aci = new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 1, roughness: 0.2, envMapIntensity: 0.6 });
  for (const z of [-9.2, 9.2]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 9, 0.9), aci); m.position.set(0, 4.5, z); regle.add(m); }
  const barre = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 19.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3b3b').multiplyScalar(2.2), toneMapped: false })); barre.position.set(0, 4.1 + 0.25, 0); regle.add(barre);
  const laser = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 18.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(3.5), toneMapped: false })); laser.position.set(0, 4.1, 0); regle.add(laser);
  for (let i = 0; i <= 12; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, i % 5 === 0 ? 1.0 : 0.55), new THREE.MeshBasicMaterial({ color: i === 8 ? new THREE.Color('#ffe23d').multiplyScalar(3) : new THREE.Color('#9fd8ff').multiplyScalar(1.6), toneMapped: false })); g.position.set(0.5, i * 0.5125, 9.2 + 0.2 + (i % 5 === 0 ? 0.5 : 0.28)); regle.add(g); }
  const charniere = new THREE.Group(); charniere.position.set(-2.4, 0.06, zRouge); regle.add(charniere);
  const trappe = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 4.2), new THREE.MeshStandardMaterial({ color: 0xc8352e, roughness: 0.45, metalness: 0.2 })); trappe.position.x = 2.3; charniere.add(trappe);
  const ressort = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 1, roughness: 0.25, wireframe: true })); regle.add(ressort);
  const voitOr = voitures.doree, voitRouge = voitures.rouge;
  const bouclier = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uK: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(vec3(1.0, 0.78, 0.25) * (0.06 + 1.5 * f) * uK, 1.0); }' }));
  groupe.add(bouclier);
  const xRegle = (t) => -3.8 + 16 * (t - T_EJECTION);

  /* ───────── caméras ───────── */
  function camPiege(pg, t) {
    const u = clamp((t - pg.debut) / (pg.fin - pg.debut)), hx = pg.r.impactX, cad = CADRE[pg.rig], k = smoother((t - pg.contact + 0.04) / 0.24);
    // le tremplin est sous le Pont des Pièges : filmé de FACE, dans l'axe de la voie, le bolide s'envole ENTRE les deux rails du chariot
    if (cad.face) return { p: [hx + 21 - 4 * u, 8.4 - 1.0 * u + 0.6 * k, 3.2], c: [hx + 1.0 + 2.5 * k, 2.0 + cad.air * k, 0], fov: lerp(32, cad.fov, k), roll: 0 };
    return { p: [hx - 14 + 5 * u, 9.5 - 1.2 * u + 1.2 * k * (cad.air > 2 ? 1 : 0), 13.5], c: [hx + 1.0 + 1.5 * k, 2.4 + cad.air * k, 0], fov: lerp(32, cad.fov, k), roll: 0.02 };
  }
  function camRegle(t) {
    const u = smoother((t - 74) / 4);
    return { p: [31 - 4 * u, 8.6 - 0.8 * u, 1.2], c: [-3 + 2 * u, 2.6 + 0.6 * u, 0.2], fov: 30, roll: 0 };
  }

  return {
    groupe, pieges,
    maj(t, sous, apres) {
      const iP = sous === 'pieges' ? pieges.findIndex((p) => t >= p.debut && t < p.fin) : -1;
      const pg = iP >= 0 ? pieges[iP] : (sous === 'pieges' ? pieges[pieges.length - 1] : null);
      pieges.forEach((p) => (p.b.group.visible = p === pg));
      regle.visible = sous === 'regle'; bouclier.visible = false;
      etinc.objet.visible = sous === 'pieges'; apres.push((cam) => etinc.maj(t, cam, ctx.H));
      lum.regler('spot', { c: 0xfff1dc, i: 0.85, p: [0, 34, -8], v: [0, 1, 0], d: 120, angle: 0.3, penombre: 0.6 });
      lum.regler('d1', { c: 0x5fd3ff, i: 0.55, p: [16, 12, -22], v: [0, 1, 0] });
      lum.regler('p1', { c: 0xb06bff, i: 0.7, p: [-8, 7, -12], d: 60 });
      let camera, proj = null;
      if (pg) {
        const car = voituresPieges[pg.i]; car.visible = true;
        const h = (car.v7.hauteur || 2.4) * 0.5, tl = pg.hit + (t - pg.contact) * K_RALENTI;
        pg.b.pose(tl - pg.tt);
        if (t < pg.contact) {
          const x = arsenal.X0 + arsenal.VCAR * tl;
          placerCascade(THREE, car, { centre: [x, h, 0], lacet: Math.PI / 2, dist: x - arsenal.X0 });
        } else {
          const dt = t - pg.contact, rc = REACTIONS[pg.rig](dt, pg.r.impactX, h);
          placerCascade(THREE, car, { centre: rc.c, lacet: Math.PI / 2 + rc.lacet, salto: rc.salto, tonneau: rc.tonneau, dist: pg.r.impactX - arsenal.X0 + dt * 45 });
        }
        const pulse = impulsion(t, pg.contact, 0.08);
        lum.regler('p3', { c: 0xffd9a0, i: 6 * pulse, p: [pg.r.impactX + 3.2, 2.4, 0], d: 16 });
        camera = camPiege(pg, t);
      } else {
        // règle : la dorée passe, la rouge est éjectée
        const x = xRegle(t), hO = (voitOr.v7.hauteur || 2.4) * 0.5, hR = (voitRouge.v7.hauteur || 2.4) * 0.5;
        voitOr.visible = voitRouge.visible = true;
        placerCascade(THREE, voitOr, { centre: [x, hO, zOr], lacet: Math.PI / 2, dist: x + 40 });
        const dt = t - T_EJECTION;
        if (dt < 0) placerCascade(THREE, voitRouge, { centre: [x, hR, zRouge], lacet: Math.PI / 2, dist: x + 40 });
        else {
          const vx = 7, vy = 52, vz = -11, T = 2 * vy / GC, a = Math.min(dt, T);
          const yy = dt < T ? hR + vy * dt - 0.5 * GC * dt * dt : hR + 1.0 * Math.abs(Math.sin((dt - T) * 13)) * Math.exp(-(dt - T) * 6);
          placerCascade(THREE, voitRouge, { centre: [xRegle(T_EJECTION) + vx * a + (dt > T ? 4 * (1 - Math.exp(-(dt - T) * 4)) : 0), yy, zRouge + vz * a], lacet: Math.PI / 2 + 0.9 * smoother(dt / T), salto: 0, tonneau: -3.5 * Math.PI * smoother(dt / T) + (dt > T ? Math.PI * 0 : 0), dist: x + 40 + dt * 60 });
        }
        const ouv = dt < 0 ? 0 : dt < 0.08 ? smoother(dt / 0.08) : 1 - 0.6 * smoother((dt - 0.25) / 0.6);
        charniere.rotation.z = 0.95 * ouv; const yT = 0.06 + Math.sin(0.95 * ouv) * 4.6 * 0.6;
        ressort.position.set(0.3, yT / 2, zRouge); ressort.scale.set(1, Math.max(0.05, yT), 1);
        // bouclier d'or autour de la dorée : intact, il s'illumine au passage sous la barre
        bouclier.visible = true; bouclier.position.set(x, hO, zOr);
        bouclier.scale.set((voitOr.v7.L || 7.4) * 0.62, hO * 1.9, (voitOr.v7.largeur || 3.2) * 0.85);
        bouclier.material.uniforms.uK.value = 0.55 + 1.4 * impulsion(t, T_EJECTION, 0.18);
        laser.visible = Math.floor(t * 8) % 2 === 0 || t > 75;
        lum.regler('p2', { c: 0xffc83d, i: 1.2 + 3.5 * impulsion(t, T_EJECTION, 0.2), p: [x + 2, 5, zOr + 3], d: 22 });
        lum.regler('p3', { c: 0xff5a4a, i: 5 * impulsion(t, T_EJECTION, 0.08), p: [0, 2, zRouge], d: 16 });
        camera = camRegle(t);
        proj = { or: [x, hO * 2 + 0.5, zOr], rouge: null, t };
        apres.push((cam) => {
          const v = new THREE.Vector3(x, 0, zOr).project(cam); proj.xOr = v.x * 0.5 + 0.5;
          const pr = voitRouge.position.clone(); pr.y = 0; const w = new THREE.Vector3(Math.min(pr.x, 0), 0, zRouge).project(cam); proj.xRouge = w.x * 0.5 + 0.5;
        });
      }
      return {
        camera, proj,
        fond: 0x050712, brouillard: { couleur: '#05060c', densite: 0.0016 },
        lumieres: { hemi: 0.03, cle: 0.06 },
        post: { exposition: 0.78, vignette: 0.74, saturation: 1.08, bloomForce: 0.28 },
      };
    },
  };
}
