/* ACTES I, III, IV, V, VI du trailer V7 (l'acte II « Multivers » est assemblé par film_v7.js à partir de mondes_et_portails.js).

   I   Prologue cosmique : rase-bitume sur la Rainbow Road 3D à 5 voies (traceRainbow), la meute à ~300 km/h, ouverture sur l'Arène.
   III Lâcher des 15 écuries (3 manches de 5 sur les 5 voies), caisses mystères, teaser de la silhouette noire TK06 en rim-light cyan.
   IV  Les 3 univers boss en vrais décors : Gotham (Batmobile B16), Formule 1 (F01–F05 en flèche), Apocalypse (épave N12 vs Jet Threat N13).
   V   Les pièges mécaniques de l'Arsenal en action, la règle sacrée des 41 mm, le tableau des paris.
   VI  Climax : le Ring plein, le parc réuni, le trophée d'or, « FAITES VOS JEUX ! ».

   Chaque acte expose { groupe, maj(t), camera(t, ratio), info(t) } ; tout est fonction pure de t. */
import { splineCR, profilVitesse, creerCascadeur, graineur, clamp, lerp, smoother, DEG } from './physique_cgi.js';
import { chemin, tremblement } from './camera_crescendo.js';
import { RING, angleEcurie, CX } from './mondes_et_portails.js';
import { poser, avecAlea } from './voitures.js';
import { creerFumee, creerEtincelles, creerPostCombustion } from './effets_cgi.js';

export const MEUTE = ['J01', 'E02', 'U02', 'FR02', 'N03'];
export const F1 = ['F01', 'F02', 'F03', 'F04', 'F05'];
export const SECRETS = { batmobile: 'B16', epave: 'N12', jet: 'N13', silhouette: 'TK06' };
const VOIES = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'];
const PAS_VOIE = 4.84;
const TITRES_PIEGES = { herse: 'La Herse', bascule: 'La Bascule', peage: 'Le Péage', boulet: 'Le Boulet', balancier: 'Le Balancier', oeuf_wyverne: "L'Œuf de Wyverne", pelote: 'La Pelote', obus: "L'Obus", bowling: 'Le Bowling', chausse_trapes: 'Les Chausse-trappes', curling: 'Le Curling' };

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const toile = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };

/* ═══════════════════════════ LA RAINBOW ROAD EN 3D (5 voies, dévers, pente) ═══════════════════════════ */
export function construirePiste(THREE, trace, { echelle = 10 } = {}) {
  const pts = trace.pts;
  const ymin = Math.min(...pts.map((p) => p.y));
  // recentrage en XZ ; la piste est tournée pour que son départ (haut) soit côté brèche du Ring (−x)
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, mz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
  const base = pts.map((p) => ({ x: (p.x - mx) * echelle, y: (p.y - ymin) * echelle + 0.8, z: (p.z - mz) * echelle, cap: p.cap, devers: p.devers, pente: p.pente, s: p.s * echelle }));
  const dirDe = (i) => { const a = base[Math.min(i + 1, base.length - 1)], b = base[Math.max(i - 1, 0)]; const dx = a.x - b.x, dz = a.z - b.z, n = Math.hypot(dx, dz) || 1; return [dx / n, dz / n]; };
  const gauche = (d) => [d[1], -d[0]];
  // prolongement du plateau de départ : 2 points en amont, dans l'axe de la première tangente
  const d0 = dirDe(0), p0 = base[0], dy0 = (base[1].y - p0.y) / Math.hypot(base[1].x - p0.x, base[1].z - p0.z);
  const pre = [-36, -18].map((k) => ({ x: p0.x + d0[0] * k, y: p0.y + dy0 * k, z: p0.z + d0[1] * k, cap: p0.cap, devers: 0, pente: p0.pente, s: p0.s + k }));
  const all = [...pre, ...base];
  const lane = (j) => all.map((p, i) => {
    const d = dirDe(i - 2 < 0 ? 0 : i - 2), g = gauche(d), o = (2 - j) * PAS_VOIE, dv = (p.devers || 0);
    return [p.x + g[0] * o, p.y - o * Math.sin(dv), p.z + g[1] * o];
  });
  const groupe = new THREE.Group(); groupe.name = 'piste-rainbow';
  const matsVoie = VOIES.map((c) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.92, side: THREE.DoubleSide, toneMapped: false }); m.userData.base = new THREE.Color(c); return m; });
  const lanes = [];
  for (let j = 0; j < 5; j++) {
    const L = lane(j), pos = [], idx = [];
    for (let i = 0; i < L.length; i++) {
      const d = dirDe(Math.max(0, i - 2)), g = gauche(d), w = PAS_VOIE * 0.46;
      pos.push(L[i][0] + g[0] * w, L[i][1], L[i][2] + g[1] * w, L[i][0] - g[0] * w, L[i][1], L[i][2] - g[1] * w);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, matsVoie[j]); groupe.add(m); lanes.push(L);
  }
  // cloisons de verre entre les voies + pylônes de soutien
  const verre = new THREE.MeshBasicMaterial({ color: new THREE.Color('#dff0ff').multiplyScalar(1.3), transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  for (let j = 0; j < 6; j++) {
    const pos = [], idx = [];
    for (let i = 0; i < all.length; i++) {
      const d = dirDe(Math.max(0, i - 2)), g = gauche(d), o = (2.5 - j) * PAS_VOIE, dv = all[i].devers || 0, y = all[i].y - o * Math.sin(dv);
      pos.push(all[i].x + g[0] * o, y, all[i].z + g[1] * o, all[i].x + g[0] * o, y + 0.6, all[i].z + g[1] * o);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setIndex(idx);
    groupe.add(new THREE.Mesh(geo, verre));
  }
  const pyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.7, 1, 10), new THREE.MeshStandardMaterial({ color: 0x1b1d2a, metalness: 0.6, roughness: 0.4 }), Math.floor(all.length / 6));
  const o = new THREE.Object3D(); let np = 0;
  for (let i = 3; i < all.length - 2 && np < pyl.count; i += 6) { const h = all[i].y; o.position.set(all[i].x, h / 2, all[i].z); o.scale.set(1, Math.max(0.1, h), 1); o.rotation.set(0, 0, 0); o.updateMatrix(); pyl.setMatrixAt(np++, o.matrix); }
  pyl.count = np; groupe.add(pyl);
  // portique de départ et d'arrivée (arcs lumineux)
  const arc = (p, i) => { const d = dirDe(i), a = Math.atan2(d[0], d[1]); const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = a; const t = new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(2.2), toneMapped: false })); t.rotation.z = 0; g.add(t); groupe.add(g); };
  arc(base[6], 6); arc(base[base.length - 3], base.length - 3);
  // splines de voie (pour les voitures) : sous-échantillonnage régulier
  const splines = lanes.map((L) => splineCR(L.filter((_, i) => i % 4 === 0 || i === L.length - 1), { echantillons: 24 }));
  const centre = splines[2];
  return { groupe, splines, centre, matsVoie, all, lanes, longueur: centre.longueur, devers: all.map((p) => p.devers || 0) };
}

/* ═══════════════════════════ ACTE I — PROLOGUE COSMIQUE ═══════════════════════════ */
export function creerActeI({ THREE, piste, voituresMeute, ring }) {
  const T0 = 3.6, T1 = 7.9;
  // profil commun : accélération le long de la pente, mis à l'échelle pour couvrir exactement la piste (≈ 290 km/h en bas, au 1/64)
  const cles = [[T0, 0], [4.4, 52], [5.4, 98], [6.6, 120], [T1, 126]];
  const brut = profilVitesse(cles), k = (piste.longueur - 14) / (brut.dist(T1) - brut.dist(T0));
  const pilotes = voituresMeute.map((v, j) => {
    const sp = piste.splines[j], dec = 0.06 * Math.abs(2 - j) + 0.03 * j;           // départ échelonné : naturel, pas de pelotons parfaits
    const profil = profilVitesse(cles.map(([t, v2]) => [t + dec, v2 * k]), 8);
    return { v, sp, cascadeur: creerCascadeur({ spline: sp, profil, vibration: 20 + j, tSusp0: 0, ralenti: 0.01, susp: {}, atterrissage: null }), profil };
  });
  const fumee = creerFumee(THREE, '#7d8299'); const etinc = creerEtincelles(THREE);
  pilotes.forEach((p, j) => {
    const poseFn = (t) => p.cascadeur.pose(t, { sansSuspension: true }).pos;
    fumee.emettre({ poseFn: (t) => poseFn(t), t0: 0.2, t1: T0 + 0.4, pas: 0.16, vie: 1.4, taille: 0.9, graine: j + 1 });                  // haze d'échappement au ralenti
    fumee.emettre({ poseFn: (t) => poseFn(t), t0: T0, t1: T1, pas: 0.07, vie: 0.7, taille: 0.9, graine: j + 9 });
  });
  fumee.figer();
  const groupe = new THREE.Group(); groupe.add(fumee.objet);
  const poseDe = (j, t) => { const p = pilotes[j], e = p.cascadeur.pose(t); const i = clamp(Math.round((e.dist / piste.longueur) * (piste.devers.length - 1)), 0, piste.devers.length - 1); e.roulis += piste.devers[i] * 0.0 + 0; return e; };
  return {
    groupe, T0, T1,
    maj(t, ctx) {
      pilotes.forEach((p, j) => { const e = poseDe(j, t); poser(p.v, e); p.v.visible = true; });
      ctx.apres(() => fumee.maj(t, ctx.camera, ctx.hPx));
      // la rampe s'allume voie par voie (ruban conducteur), puis pulse au tempo
      piste.matsVoie.forEach((m, j) => { const on = smoother((t - 0.5 - j * 0.45) / 0.6); m.color.copy(m.userData.base).multiplyScalar(0.1 + on * (0.5 + 0.22 * ctx.pouls)); });
    },
    pilote: (j, t) => poseDe(j, t),
    camera(t, ratio) {
      const sc = piste.centre, s0 = 8;
      const surPiste = (s, haut, lat, la, fov) => { const P = sc.point(s), Tg = sc.tangente(s), n = [Tg[2], 0, -Tg[0]], nn = Math.hypot(n[0], n[2]) || 1; const c = sc.point(s + la); return { p: [P[0] + n[0] / nn * lat, P[1] + haut, P[2] + n[2] / nn * lat], c: [c[0], c[1] + 0.8, c[2]], fov, roll: 0 }; };
      if (t < T0) { const u = smoother(t / T0); return surPiste(lerp(30, 12, u), 1.5 - 0.5 * u, -9 + 3 * u, -22, lerp(30, 36, u)); }
      if (t < T1) {
        const mid = pilotes[2].cascadeur.pose(t, { sansSuspension: true }).dist, u = (t - T0) / (T1 - T0), c = surPiste(mid - 9 - 4 * u, 1.9 + u, lerp(12, 8, u), 7, lerp(42, 58, smoother(u)));
        const tr = tremblement(t, 0.05 + 0.1 * u, 3); c.p = add3(c.p, tr); c.roll = 0.03 * Math.sin(t * 1.3); return c;
      }
      const fin = pilotes[2].cascadeur.pose(T1, { sansSuspension: true }).pos;
      const dep = surPiste(pilotes[2].cascadeur.pose(T1, { sansSuspension: true }).dist - 13, 2.9, 8, 7, 58);
      return chemin([{ t: T1, ...dep }, { t: 9.7, p: [0, 52, 190], c: [0, 4, 0], fov: 52, roll: 0 }, { t: 11.0, p: [0, 38, 160], c: [0, 8, -20], fov: 46, roll: 0 }], t);
    },
    info(t) { const e = poseDe(2, t); return { titre: 'LA RAINBOW ROAD', kmh: e.kmh, beta: 0, aLat: e.aLat }; },
  };
}

/* ═══════════════════════════ ACTE III — LÂCHER DE LA MEUTE, CAISSES, SILHOUETTE ═══════════════════════════ */
export function creerActeIII({ THREE, piste, concepts, garage, silhouette, equipes }) {
  const T = [55.4, 58.4, 61.4], RUN = 3.4;               // départs des 3 manches (A, B, C) et durée de course (ralenti ×2,5)
  const cles = [[0, 0], [0.7, 45], [1.5, 95], [2.4, 118], [RUN, 124]];
  const brut = profilVitesse(cles), k = (piste.longueur - 26) / (brut.dist(RUN) - brut.dist(0));
  const pilotes = [];
  for (let m = 0; m < 3; m++) for (let j = 0; j < 5; j++) {
    const v = concepts[m * 5 + j], sp = piste.splines[j], s0 = 10 - m * 11 + (m === 0 ? 0 : 0);
    const prof = profilVitesse(cles.map(([t, v2]) => [T[m] + t + 0.04 * j, v2 * k]), s0);
    pilotes.push({ v, m, j, cascadeur: creerCascadeur({ spline: sp, profil: prof, vibration: 40 + m * 5 + j, tSusp0: 53, ralenti: 0.012, susp: {}, atterrissage: null }) });
  }
  // caisses mystères : 5 caisses à l'arrivée (une par voie) qui s'ouvrent au passage
  const cv = toile(128, 128, (g, w, h) => { g.fillStyle = '#2a1850'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b06bff'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#ffe23d'; g.font = '900 86px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 4); });
  const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
  const matCaisse = new THREE.MeshBasicMaterial({ map: tx, color: new THREE.Color(1.4, 1.4, 1.4), toneMapped: false });
  const groupe = new THREE.Group(), caisses = [];
  const fin = piste.centre.longueur - 2;
  for (let j = 0; j < 5; j++) {
    const P = piste.splines[j].point(fin), c = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 4.2), matCaisse); c.position.set(P[0], P[1] + 2.3, P[2]); c.rotation.y = 0.4;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 4.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b06bff').multiplyScalar(2), toneMapped: false })); lid.position.y = 2.2; c.add(lid);
    const rayon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.8, 36, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(VOIES[j]).multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); rayon.position.y = 18; c.add(rayon);
    groupe.add(c); caisses.push({ c, lid, rayon, P, tOuv: 62.2 + j * 0.9 });
  }
  const etinc = creerEtincelles(THREE); caisses.forEach((cs, j) => etinc.gerbe({ t0: cs.tOuv, p0: [cs.P[0], cs.P[1] + 4, cs.P[2]], dir: [0, 1, 0], n: 90, dispersion: 0.9, vmin: 60, vmax: 200, vie: 1.4, taille: 0.55, graine: 300 + j }));
  etinc.figer(); groupe.add(etinc.objet);
  // silhouette noire dans la 5ᵉ caisse : corps noir mat + rim-light cyan en fresnel (shader), phares cyan
  const rimMat = new THREE.ShaderMaterial({ uniforms: { uRim: { value: new THREE.Color('#2fd6c8') }, uK: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uRim; uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.4); gl_FragColor = vec4(vec3(0.004) + uRim * f * 3.2 * uK, 1.0); }' });
  silhouette.traverse((o) => { if (o.isMesh) o.material = rimMat; });
  const posSil = piste.splines[4].point(fin + 14), tgS = piste.splines[4].tangente(fin);
  silhouette.position.set(posSil[0], posSil[1], posSil[2]); silhouette.rotation.y = Math.atan2(tgS[0], tgS[2]) + Math.PI + 0.35;       // de face, vers la caméra
  const lampe = new THREE.PointLight(0x2fd6c8, 0, 90, 1.4); lampe.position.set(posSil[0], posSil[1] + 5, posSil[2] - 6); groupe.add(lampe);
  const phares = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9ffbff').multiplyScalar(4), toneMapped: false })); groupe.add(phares);
  groupe.userData.silhouette = silhouette;
  return {
    groupe, pilotes, silhouette, posSil,
    maj(t, ctx) {
      pilotes.forEach((p) => { const e = p.cascadeur.pose(t); poser(p.v, e); p.v.visible = true; });
      caisses.forEach((cs) => {
        const o = clamp((t - cs.tOuv) / 0.5), tt = t - cs.tOuv;
        cs.lid.position.y = 2.2 + o * 5 * (1 - o * 0.3); cs.lid.rotation.z = o * 1.6; cs.rayon.material.opacity = tt > 0 ? 0.5 * Math.exp(-tt * 0.7) : 0;
        cs.c.scale.setScalar(1 - Math.min(1, Math.max(0, tt - 1.2)) * 0.001);
      });
      ctx.apres(() => etinc.maj(t, ctx.camera, ctx.hPx));
      const ap = smoother((t - 64.6) / 1.2);                                    // la silhouette émerge dans le noir
      silhouette.visible = ap > 0.001; rimMat.uniforms.uK.value = ap; lampe.intensity = 0; phares.visible = ap > 0.4 && Math.floor(t * 10) % 12 !== 0;
      phares.position.set(posSil[0], posSil[1] + 1.5, posSil[2]); phares.rotation.y = silhouette.rotation.y;
      phares.position.add(new THREE.Vector3(Math.sin(silhouette.rotation.y) * 3.4, 0, Math.cos(silhouette.rotation.y) * 3.4));
    },
    camera(t) {
      const sc = piste.centre, haut = (s, h, lat, la, fov) => { const P = sc.point(s), Tg = sc.tangente(s), n = [Tg[2], 0, -Tg[0]]; const nn = Math.hypot(n[0], n[2]) || 1, c = sc.point(s + la); return { p: [P[0] + n[0] / nn * lat, P[1] + h, P[2] + n[2] / nn * lat], c: [c[0], c[1] + 1, c[2]], fov, roll: 0 }; };
      if (t < 55.4) return chemin([{ t: 53, p: [-4, 70, 150], c: [0, 20, 0], fov: 50, roll: 0 }, { t: 55.4, ...haut(-6, 6.5, 13, 9, 40) }], t);                     // grue depuis le Ring vers la grille
      if (t < 62.0) {
        const h = t < T[1] - 0.2 ? 0 : t < T[2] - 0.2 ? 1 : 2, pil = pilotes[2 + 5 * h].cascadeur.pose(t, { sansSuspension: true }), u = clamp((t - T[h]) / RUN);
        const s = pil.dist - 7 - 6 * u;
        return { ...haut(s, 3.6 + 1.8 * u, 12 - 3 * u, 11, lerp(44, 58, u)), roll: 0.03 * Math.sin(t) };
      }
      if (t < 64.4) { const P = piste.splines[2].point(fin), Tg = piste.splines[2].tangente(fin); return chemin([{ t: 62, p: [P[0] - Tg[0] * 24, P[1] + 7, P[2] - Tg[2] * 24 + 12], c: [P[0], P[1] + 3, P[2]], fov: 50, roll: 0 }, { t: 64.4, p: [P[0] + 6, P[1] + 4, P[2] + 26], c: [P[0] + 3, P[1] + 3, P[2]], fov: 40, roll: 0 }], t); }
      const ps = posSil; return chemin([{ t: 64.4, p: [ps[0] + 6, ps[1] + 4.6, ps[2] + 30], c: [ps[0], ps[1] + 2, ps[2]], fov: 38, roll: 0 }, { t: 69, p: [ps[0] + 2, ps[1] + 2.6, ps[2] + 12], c: [ps[0], ps[1] + 1.8, ps[2]], fov: 26, roll: 0 }], t);
    },
    info(t) { const e = pilotes[2 + 5 * (t > 61.4 ? 2 : t > 58.4 ? 1 : 0)].cascadeur.pose(t, { sansSuspension: true }); return { titre: t < 64.4 ? 'LE LÂCHER' : '???', kmh: e.kmh, beta: 0, aLat: e.aLat }; },
  };
}

/* ═══════════════════════════ ACTE IV — LES TROIS UNIVERS BOSS ═══════════════════════════ */
export function creerActeIV({ THREE, decors, envMap, cars, garage, bolides, plan }) {
  const groupe = new THREE.Group(); const [G0, G1] = [plan.univers_boss[0], plan.univers_boss[1]], AP = plan.univers_boss[2];
  const mk = (cle, code) => { const d = avecAlea('boss' + code, () => decors.creerDecor(THREE, cle, { code, env: envMap })); d.eclair && (d.eclair.prochain = 1e9); const g = new THREE.Group(); g.add(d.groupe, d.lumieres); g.visible = false; groupe.add(g); return { d, g }; };
  const gotham = mk('gothique', 'B16'), f1 = mk('blockbuster', 'F01'), apoca = mk('post_apo', 'N12');
  for (const b of [gotham, f1, apoca]) b.d.activer();
  if (gotham.d.solMat) { gotham.d.solMat.color.multiplyScalar(0.22); if (gotham.d.solMat.emissive) gotham.d.solMat.emissiveIntensity = 0; }      // asphalte noir détrempé (pas de sol sodium orange)
  // ── Gotham : la Batmobile surgit du brouillard, éclairs au tempo
  const bat = bolides.batmobile;
  const spG = splineCR([[CX - 90, 0, 4], [CX - 40, 0, 3.2], [CX + 4, 0, 4.6], [CX + 50, 0, 3]]);
  const profG = profilVitesse([[G0.debut, 120], [G0.debut + 2.2, 70], [G0.fin - 0.4, 14], [G0.fin + 5, 14]], 0);
  const cG = creerCascadeur({ spline: spG, profil: profG, vibration: 71, tSusp0: G0.debut - 1, susp: {}, atterrissage: null, derive: { t0: G0.debut + 1.6, montee: 0.2, maintien: 1.2, descente: 0.9, betaMax: 20 * DEG, signe: 1 }, ralenti: 0.01 });
  const eclairsT = [69.4, 70.35, 71.6, 72.9, 74.1]; const eclair = (t) => { let v = 0; for (const e of eclairsT) { const d = t - e; if (d >= 0 && d < 0.34) v = Math.max(v, (d < 0.06 ? 1 : d < 0.12 ? 0.15 : d < 0.2 ? 0.8 : 0.3 * (1 - d / 0.34))); } return v; };
  // ── Formule 1 : flèche à 320 km/h
  const f1v = bolides.f1s, offs = [[0, 0], [-9.5, -10], [9.5, -10], [-19, -20], [19, -20]];
  const spF = splineCR([[CX - 260, 0, 3], [CX - 60, 0, 3], [CX + 120, 0, 3], [CX + 320, 0, 3]]);
  const tPasse = G1.debut + 3.3, clesF = [[tPasse - 4, 140], [tPasse + 4, 150]], sPasse = profilVitesse(clesF, 0).dist(tPasse);   // la tête de flèche franchit x = CX à tPasse
  const cF = offs.map(([lat, back], i) => creerCascadeur({ spline: spF, profil: profilVitesse(clesF, 260 - sPasse + back), vibration: 80 + i, tSusp0: G1.debut - 3, susp: {}, atterrissage: null, ralenti: 0 }));
  // ── Apocalypse : épave fumante contre Jet Threat
  const epave = bolides.epave, jet = bolides.jet, carcasses = bolides.carcasses;
  const fumeeA = creerFumee(THREE, '#2a2624'), etinc = creerEtincelles(THREE), pc = creerPostCombustion(THREE, '#ff7a2a', '#ffe9a0');
  const tA0 = AP.debut;
  fumeeA.emettre({ poseFn: () => [CX - 16, 3.2, 0], t0: tA0 - 1, t1: AP.fin, pas: 0.06, vie: 2.6, taille: 3.2, deriveVent: [1.2, 6, -1], graine: 5 });
  carcasses.forEach((c, i) => { const p = c.position; fumeeA.emettre({ poseFn: () => [p.x, 3, p.z], t0: tA0 - 1, t1: AP.fin, pas: 0.16, vie: 2.4, taille: 2.4, deriveVent: [1, 5, 0], graine: 20 + i }); });
  fumeeA.figer();
  for (let i = 0; i < 12; i++) etinc.gerbe({ t0: tA0 + 0.5 + i * 0.55, p0: [CX - 16 + (i % 3) * 3, 2, (i % 2) * 2 - 1], dir: [0, 1, 0], n: 18, dispersion: 0.8, vmin: 20, vmax: 90, vie: 0.8, taille: 0.4, graine: 400 + i });
  etinc.figer();
  groupe.add(fumeeA.objet, etinc.objet);
  jet.add(pc.groupe); pc.groupe.position.set(0, 0.5, 0);
  const sigG = (t) => t >= G0.debut && t < G0.fin, sigF = (t) => t >= G1.debut && t < G1.fin;
  return {
    groupe, gotham, f1, apoca, bat, jet, epave, carcasses,
    maj(t, ctx) {
      const sel = t < G0.fin ? 'g' : t < G1.fin ? 'f' : 'a';
      gotham.g.visible = sel === 'g'; f1.g.visible = sel === 'f'; apoca.g.visible = sel === 'a';
      bat.visible = sel === 'g'; f1v.forEach((v) => (v.visible = sel === 'f')); epave.visible = jet.visible = sel === 'a'; carcasses.forEach((c) => (c.visible = sel === 'a'));
      fumeeA.objet.visible = etinc.objet.visible = sel === 'a';
      ctx.brouillard(sel === 'g' ? { couleur: '#0b1430', densite: 0.0042 } : sel === 'f' ? { couleur: '#10131c', densite: 0.0012 } : { couleur: '#3a1606', densite: 0.0034 });
      if (sel === 'g') {
        const e = cG.pose(t); poser(bat, e);
        const ev = eclair(t); ctx.apres(() => { gotham.d.maj(t, 0, ctx.camera, ctx.hPx); if (gotham.d.eclair) { gotham.d.eclair.u.value = ev * 0.85; gotham.d.eclair.lum.intensity = gotham.d.eclair.base * (1 + ev * 3.2); } });
        ctx.extraFlash = ev * 0.5;
      } else if (sel === 'f') {
        f1v.forEach((v, i) => { const e = cF[i].pose(t); e.pos = [e.pos[0], e.pos[1], e.pos[2]]; poser(v, e, { lateral: offs[i][0] }); }); ctx.apres(() => f1.d.maj(t, 0, ctx.camera, ctx.hPx));
      } else {
        epave.position.set(CX - 16, 0, 0); epave.rotation.set(0, Math.PI / 2 + 0.25, 0.09, 'YXZ');
        const s = Math.sin(t * 61) * 0.05 * smoother((t - tA0) / 2);
        jet.position.set(CX + 16, s, 0); jet.rotation.set(0, -Math.PI / 2, 0, 'YXZ'); pc.maj(t, 0.6 + 0.4 * smoother((t - tA0 - 0.5) / 2.5));
        ctx.apres(() => apoca.d.maj(t, 0, ctx.camera, ctx.hPx)); ctx.apres(() => fumeeA.maj(t, ctx.camera, ctx.hPx)); ctx.apres(() => etinc.maj(t, ctx.camera, ctx.hPx));
        ctx.extraFlash = 0;
      }
    },
    camera(t) {
      if (t < G0.fin) { const e = cG.pose(t, { sansSuspension: true }).pos; return chemin([{ t: G0.debut, p: [e[0] + 24, 2.4, 14], c: [e[0] + 4, 2, 3], fov: 34, roll: 0.05 }, { t: G0.debut + 3, p: [e[0] + 22, 2.0, 12], c: [e[0] + 3, 2.2, 3.6], fov: 30, roll: -0.03 }, { t: G0.fin, p: [CX - 10, 3.4, 16], c: [CX + 8, 3, 4.6], fov: 26, roll: 0 }], t); }
      if (t < G1.fin) {
        const tp = G1.debut + 3.3, lead = cF[0].pose(t, { sansSuspension: true }).pos[0];
        if (t < G1.debut + 2.2) return { p: [lead + 30, 3.2, 14], c: [lead - 4, 2, 3], fov: 40, roll: 0.04 };
        if (t < tp + 1.2) { const d = lead - CX, sh = tremblement(t, 0.9 * Math.exp(-Math.pow(d / 40, 2)), 5); return { p: add3([CX, 1.6, 16], sh), c: [lead * 0.6 + CX * 0.4, 2.2, 3], fov: 36, roll: 0.02 * Math.sin(t * 40) * Math.exp(-Math.pow(d / 40, 2)) }; }
        return { p: [lead - 34, 4.5, 9], c: [lead + 14, 2.2, 3], fov: 46, roll: 0 };
      }
      return chemin([{ t: AP.debut, p: [CX - 52, 5, 24], c: [CX - 8, 4, 0], fov: 34, roll: 0.02 }, { t: AP.debut + 4, p: [CX, 3.2, 22], c: [CX - 12, 4, 0], fov: 30, roll: 0 }, { t: AP.fin, p: [CX + 3, 5.4, 12], c: [CX - 6, 4.4, 0], fov: 26, roll: 0 }], t);
    },
    info(t) { if (t < G0.fin) { const e = cG.pose(t, { sansSuspension: true }); return { titre: 'GOTHAM', kmh: e.kmh, beta: cG.pose(t).beta, aLat: cG.pose(t).aLat }; } if (t < G1.fin) { const e = cF[0].pose(t, { sansSuspension: true }); return { titre: 'FORMULE 1', kmh: e.kmh * 1.0, beta: 0, aLat: 0 }; } return { titre: 'APOCALYPSE', kmh: 0, beta: 0, aLat: 0 }; },
  };
}

/* ═══════════════════════════ ACTE V — PIÈGES, RÈGLE DES 41 mm, PARIS ═══════════════════════════ */
export function creerActeV({ THREE, arsenal, voituresLab, plan, ringCamera }) {
  const A = plan.actes.find((a) => a.id === 'V'), t0 = A.debut;
  const M = arsenal.mats(THREE), noms = Object.keys(arsenal.RIGS).slice(0, 10);
  const SEG = 1.2, T_PIEGES = noms.length * SEG, T_REGLE = 3.2;
  const labo = new THREE.Group(); labo.name = 'labo-arsenal';
  const lane = arsenal.buildLane(THREE, 96); lane.position.x = -22; labo.add(lane);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x07080f, roughness: 0.35, metalness: 0.6 })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.08; labo.add(sol);
  const grille = new THREE.GridHelper(300, 120, 0x2a3a7a, 0x141a38); grille.position.y = -0.05; labo.add(grille);
  const rigs = noms.map((n) => { const r = arsenal.RIGS[n], b = r.build(THREE, M); b.group.visible = false; labo.add(b.group); return { n, r, b }; });
  // portique de la règle sacrée : deux montants + barre à 41 mm, réglette graduée
  const regle = new THREE.Group(); regle.visible = false; labo.add(regle);
  const aci = new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 1, roughness: 0.2 });
  for (const z of [-4, 4]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 12, 0.9), aci); m.position.set(0, 6, z); regle.add(m); }
  const barre = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 9.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3b3b').multiplyScalar(2.4), toneMapped: false })); barre.position.set(0, 4.1 + 0.35, 0); regle.add(barre);
  const laser = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 9.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(4), toneMapped: false })); laser.position.set(0, 4.1, 0); regle.add(laser);
  for (let i = 0; i <= 10; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, i % 5 === 0 ? 1.4 : 0.8), new THREE.MeshBasicMaterial({ color: i === 4 ? new THREE.Color('#ffe23d').multiplyScalar(3) : new THREE.Color('#9fd8ff').multiplyScalar(1.8), toneMapped: false })); g.position.set(0, i * 0.5 + 0.0, 4.9); regle.add(g); }
  const gar = voituresLab;
  const tTrig = (r) => (r.declencheX - arsenal.X0) / arsenal.VCAR;
  const dureeAvant = 0.9;
  function indexPiege(t) { return clamp(Math.floor((t - t0) / SEG), 0, noms.length - 1); }
  return {
    groupe: labo, noms, SEG, T_PIEGES, T_REGLE, titres: TITRES_PIEGES,
    phase(t) { return t < t0 + T_PIEGES ? 'pieges' : t < t0 + T_PIEGES + T_REGLE ? 'regle' : 'paris'; },
    maj(t, ctx) {
      const ph = this.phase(t), i = indexPiege(t), u = (t - t0 - i * SEG) / SEG;
      labo.visible = ph !== 'paris';
      rigs.forEach((r, j) => (r.b.group.visible = ph === 'pieges' && j === i));
      regle.visible = ph === 'regle';
      const car = gar[i % gar.length]; gar.forEach((c) => (c.visible = false));
      if (ph === 'pieges') {
        const rg = rigs[i], hit = (rg.r.impactX - arsenal.X0) / arsenal.VCAR, tl = hit - dureeAvant + u * (2.5), tt = tTrig(rg.r);
        rg.b.pose(tl - tt);
        const cp = arsenal.carPose(rg.r, tl, tt);
        car.visible = true; car.position.set(cp.x, cp.y, cp.z); car.rotation.set(cp.rx, Math.PI / 2 + cp.ry, cp.rz, 'YXZ');
        const d = arsenal.X0 + arsenal.VCAR * tl; for (const w of car.v7.roues) { if (w.type === 'm3d') w.w.tourne.rotation.z = -(cp.x - arsenal.X0) / w.r; }
        ctx.flashPiege = Math.exp(-Math.pow((tl - hit) / 0.12, 2)) * 0.5;
      } else if (ph === 'regle') {
        const u2 = (t - t0 - T_PIEGES) / T_REGLE, c = gar[0]; c.visible = true; const x = lerp(36, -30, smoother(u2));
        c.position.set(x, 0, 0); c.rotation.set(0, -Math.PI / 2, 0);
        for (const w of c.v7.roues) if (w.type === 'm3d') w.w.tourne.rotation.z = (x - 36) / w.r;
        laser.visible = Math.floor(t * 8) % 2 === 0 || u2 > 0.4; ctx.flashPiege = 0;
      }
    },
    camera(t) {
      const ph = this.phase(t), i = indexPiege(t), u = (t - t0 - i * SEG) / SEG;
      if (ph === 'pieges') { const rg = rigs[i], cote = i % 2 ? -1 : 1, hx = rg.r.impactX; return { p: [hx - 8 + 8 * u, 6.0 + 0.8 * u, 27 * cote], c: [hx + 0.6, 3.0, 0], fov: 36 - 3 * u, roll: 0.03 * cote }; }
      if (ph === 'regle') { const u2 = (t - t0 - T_PIEGES) / T_REGLE; return chemin([{ t: t0 + T_PIEGES, p: [-30, 3.4, 5], c: [0, 3.2, 0], fov: 30, roll: 0.02 }, { t: t0 + T_PIEGES + T_REGLE, p: [-17, 2.6, 4], c: [0, 3.0, 0], fov: 26, roll: 0 }], t); }
      return ringCamera(t);
    },
    info(t) { const ph = this.phase(t), i = indexPiege(t); return ph === 'pieges' ? { titre: 'PIÈGE ' + (i + 1), piege: TITRES_PIEGES[noms[i]] || noms[i] } : ph === 'regle' ? { titre: 'RÈGLE SACRÉE' } : { titre: 'LES PARIS' }; },
  };
}

/* ═══════════════════════════ ACTE VI — CLIMAX, TROPHÉE, « FAITES VOS JEUX ! » ═══════════════════════════ */
export function creerActeVI({ THREE, trophee, parc, plan }) {
  const A = plan.actes.find((a) => a.id === 'VI'), t0 = A.debut, tBoom = 111.0;
  const groupe = new THREE.Group();
  // trophée d'or au centre du Ring, qui s'élève, tourne, et son faisceau
  trophee.scale.setScalar(9); trophee.position.set(0, 0, 0); groupe.add(trophee);
  const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(7, 22, 160, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9a0').multiplyScalar(1.8), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); faisceau.position.y = 80; groupe.add(faisceau);
  const lumTrophee = new THREE.PointLight(0xffe0a0, 0, 220, 1.3); lumTrophee.position.y = 36; groupe.add(lumTrophee);
  // feux d'artifice (gerbes d'étincelles dorées / arc-en-ciel) et confettis
  const etinc = creerEtincelles(THREE); const rnd = graineur(612);
  for (let i = 0; i < 46; i++) { const a = rnd() * 6.283, r = 18 + rnd() * 52, t = tBoom + 0.0 + i * 0.16; etinc.gerbe({ t0: t, p0: [Math.cos(a) * r, 0, Math.sin(a) * r], dir: [0, 1, 0], n: 70, dispersion: 0.85, vmin: 80, vmax: 260, vie: 1.8, taille: 0.8, graine: 1000 + i }); }
  etinc.gerbe({ t0: tBoom, p0: [0, 32, 0], dir: [0, 1, 0], n: 400, dispersion: 3.2, vmin: 40, vmax: 300, vie: 2.4, taille: 0.9, graine: 999 });
  etinc.figer(); groupe.add(etinc.objet);
  const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false }); cm.userData = { palette: ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff', '#b06bff', '#ffffff'] };
  const N = 380, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.2, 0.7), cm, N), o = new THREE.Object3D(), cc = new THREE.Color(), rr = graineur(77), P = [];
  for (let i = 0; i < N; i++) { P.push({ a: rr(), b: rr(), c: rr(), d: rr() }); conf.setColorAt(i, cc.set(cm.userData.palette[i % 7])); }
  conf.frustumCulled = false; groupe.add(conf);
  return {
    groupe, tBoom,
    maj(t, ctx) {
      const up = smoother((t - t0) / 3.2);
      trophee.position.y = -24 + 24 * up; trophee.rotation.y = (t - t0) * 0.7; trophee.traverse((n) => { if (n.name === 'spin') n.rotation.y = t * 2; });
      faisceau.visible = lumTrophee.intensity > 0.1; lumTrophee.intensity = 7 * up * (1 + 0.5 * Math.exp(-(t - tBoom) * 3) * (t > tBoom ? 1 : 0)); faisceau.material.opacity = 0.06 + 0.06 * up + (t > tBoom ? 0.1 * Math.exp(-(t - tBoom) * 2) : 0);
      ctx.apres(() => etinc.maj(t, ctx.camera, ctx.hPx));
      const on = t > tBoom - 0.05; conf.visible = on; if (on) {
        for (let i = 0; i < N; i++) { const p = P[i], age = t - tBoom - p.d * 1.5; if (age < 0) { o.scale.setScalar(0.0001); } else { const fall = 90 - age * (16 + 10 * p.a) + 40 * p.b; o.position.set((p.a - 0.5) * 150 + Math.sin(age * 2 + p.c * 9) * 4, Math.max(0.2, fall), (p.c - 0.5) * 150); o.rotation.set(age * 5 * p.a, age * 3 * p.b, age * 4 * p.c); o.scale.setScalar(1); } o.updateMatrix(); conf.setMatrixAt(i, o.matrix); }
        conf.instanceMatrix.needsUpdate = true;
      }
      parc.forEach((c, i) => { const k = smoother((t - t0 - 0.25 * (i % 9) / 9 - i * 0.012) / 1.2); c.visible = k > 0.001; c.scale.setScalar(Math.max(0.001, k)); });
    },
    camera(t) {
      return chemin([
        { t: 107, p: [0, 120, 215], c: [0, 0, -10], fov: 52, roll: 0 },
        { t: 109.2, p: [-30, 62, 150], c: [0, 20, 0], fov: 46, roll: 0 },
        { t: tBoom - 0.3, p: [-14, 30, 94], c: [0, 22, 0], fov: 38, roll: 0 },
        { t: tBoom + 0.25, p: [-8, 26, 78], c: [0, 26, 0], fov: 52, roll: 0.03 },
        { t: 114.0, p: [58, 40, 70], c: [0, 24, 0], fov: 44, roll: -0.02 },
        { t: 117.0, p: [-20, 60, 140], c: [0, 28, 0], fov: 40, roll: 0 },
        { t: 120.0, p: [0, 90, 210], c: [0, 30, 0], fov: 38, roll: 0 },
      ], t);
    },
    info(t) { return { titre: 'CLIMAX' }; },
  };
}
