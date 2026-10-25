/* BANC 3D — contrôle visuel et chiffré des 75 bolides sculptés (m3d/), tels que le reveal les construit.

   /banc3d/            : planche des 75 (vue 3/4 avant), verdict par bolide.
   /banc3d/?vue=profil : profil strict ; ?vue=roue : macro sur la roue avant côté caméra.
   /banc3d/?codes=H10,J11 : seulement ces codes.

   Chaque bolide passe par construireBolide3D() EXACTEMENT comme dans reveal_fret.js (aucune option de repli), puis :
     KO  : erreur de construction, source ≠ 'sur-mesure', pneu plus étroit que 0,65 × R (sauf pneu déclaré `fin`),
           anneau émissif dans une roue (néon d'arcade), roue qui flotte ou s'enfonce (> 2 cm d'écart au sol),
           aucune laque vernie (clearcoat ≥ 0,9) sur la carrosserie.
     AV  : proportion pavillon / largeur hors tout au-dessus du plafond de sa famille (bolides3d.js : FAMILLES_PROPORTION —
           supercar 0,58 · berline/coupé 0,66 · compacte 0,75 · SUV 0,82 · van/camion 1,05 ; F1, hélico, fauteuil, loco exemptés).
   Résultat machine : window.__banc = { fini, resultats: [...] } (lu par outils/controle_banc3d.py). */
import { DATA, loadData, findRelay } from '../shared/core.js';
import { construireBolide3D, envNeon, familleProportion, hauteurPavillon } from '../shared/bolides3d.js';

const THREE = window.THREE;
const Q = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);

const W = 640, H = 360;
let renderer, scene, camera, env, sol, ombre;

function preparer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0c14);
  env = envNeon(THREE, renderer);
  camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x15101c, 0.45));
  const cle = new THREE.DirectionalLight(0xffffff, 1.7); cle.position.set(7, 10, 8); scene.add(cle);
  const rim = new THREE.DirectionalLight(0x9fd0ff, 1.1); rim.position.set(-8, 4, -7); scene.add(rim);
  const bas = new THREE.DirectionalLight(0xffe2c4, 0.35); bas.position.set(4, 1, 6); scene.add(bas);
  sol = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x06070b, roughness: 0.82, metalness: 0.1 }));
  sol.rotation.x = -Math.PI / 2; scene.add(sol);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  ombre = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  ombre.rotation.x = -Math.PI / 2; ombre.position.y = 0.005; scene.add(ombre);
}

function placerCamera(vue, m, box) {
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const t = Math.tan(THREE.MathUtils.degToRad(15)), dH = (s.x * 0.5 * 1.12) / (t * camera.aspect), dV = (s.y * 0.5 * 1.25) / t, d = Math.max(dH, dV);
  camera.fov = 30;
  if (vue === 'profil') { camera.position.set(c.x, s.y * 0.45, d + s.z * 0.5); camera.lookAt(c.x, s.y * 0.45, 0); }
  else if (vue === 'roue') {
    const w = m.roues.filter((x) => x.avant).sort((a, b) => b.z - a.z)[0] || m.roues[0];
    const p = new THREE.Vector3(); w.pivot.getWorldPosition(p);
    camera.fov = 22; camera.position.set(p.x + w.r * 2.2, w.r * 0.9, p.z + w.r * 5.2); camera.lookAt(p.x, w.r, p.z);
  } else { const k = d * 0.95 + s.z * 0.5; camera.position.set(c.x + k * 0.6, s.y * 0.55 + k * 0.2, k * 0.8); camera.lookAt(c.x, s.y * 0.4, 0); }
  camera.updateProjectionMatrix();
}

/** Mesures et verdicts d'un modèle construit. */
function controler(code, m) {
  const ko = [], av = [];
  if (m.source !== 'sur-mesure') ko.push('source ' + m.source);
  const box = new THREE.Box3().setFromObject(m.groupe), s = box.getSize(new THREE.Vector3());
  // pneus : largeur ≥ 0,65 R (sauf `fin`), aucun anneau émissif dans la roue, contact au sol
  let neon = 0;
  const pneus = m.roues.map((w) => {
    w.pivot.traverse((o) => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of ms) {
        const emissif = mt.isMeshBasicMaterial && mt.toneMapped === false;
        const brille = mt.emissive && mt.emissive.getHSL({}).l > 0.25 && (mt.emissiveIntensity ?? 1) > 0.3;
        if (emissif || brille) neon++;
      }
    });
    const p = new THREE.Vector3(); w.pivot.getWorldPosition(p);
    return { r: w.r, ep: w.ep, fin: !!w.fin, rapport: w.ep / w.r, sol: p.y - w.r };
  });
  const etroits = pneus.filter((p) => !p.fin && p.rapport < 0.65 - 1e-6);
  if (etroits.length) ko.push(`pneu étroit ${Math.min(...etroits.map((p) => p.rapport)).toFixed(2)} R`);
  if (neon) ko.push(neon + ' matériau(x) émissif(s) dans les roues');
  const ecartSol = pneus.length ? Math.max(...pneus.map((p) => Math.abs(p.sol))) : 0;
  if (ecartSol > 0.02) ko.push(`roue à ${ecartSol.toFixed(3)} du sol`);
  if (!pneus.length && m.fam !== 'helico') ko.push('aucune roue');
  // PÉNÉTRATION : aucune pièce de carrosserie (tôle, barre, pare-buffle, marchepied) dans le volume d'un pneu.
  // Chaque triangle du châssis est échantillonné (sommets, milieux, centre) ; un point compte s'il est à l'intérieur du
  // ANNEAU DE GOMME du pneu (entre 0,74 r et r − 3 cm), MOITIÉ EXTÉRIEURE (côté visible, jusqu'au flanc − 3 cm) : freins et moyeux dans la jante sont permis,
  // et les doublures de passage de roue cachées côté intérieur ne comptent pas. Les roues elles-mêmes (pivots) sont exclues.
  const cyl = m.roues.map((w) => { const p = new THREE.Vector3(); w.pivot.getWorldPosition(p); return { p, sg: Math.sign(p.z) || 1, r: w.r - 0.03, ri: w.r * 0.74, e: Math.max(0.01, (w.ep || w.r * 0.7) / 2 - 0.03) }; });
  const clip = new Map(); let nClip = 0;
  { const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3();
    const dedans = (v) => { for (let i = 0; i < cyl.length; i++) { const C = cyl[i], dx = v.x - C.p.x, dy = v.y - C.p.y, dz = v.z - C.p.z; const d2 = dx * dx + dy * dy; if (dz * C.sg > -0.02 && dz * C.sg < C.e && d2 < C.r * C.r && d2 > C.ri * C.ri) return i; } return -1; };
    m.chassis.updateMatrixWorld(true);
    m.chassis.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (ms.every((mt) => mt.transparent && mt.opacity < 0.3)) return;
      const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count, M = o.matrixWorld;
      for (let t = 0; t + 2 < n; t += 3) {
        const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(M); b.fromBufferAttribute(pos, i1).applyMatrix4(M); c.fromBufferAttribute(pos, i2).applyMatrix4(M);
        for (const [u, v] of [[1, 0], [0, 1], [0, 0], [0.5, 0.5], [0.5, 0], [0, 0.5], [1 / 3, 1 / 3]]) {
          q.set(0, 0, 0).addScaledVector(a, u).addScaledVector(b, v).addScaledVector(c, 1 - u - v);
          const k = dedans(q); if (k >= 0) { nClip++; if (Q.get('debug') === code && (window.__bancClip = window.__bancClip || []).length < 40) window.__bancClip.push({ roue: k, x: +q.x.toFixed(3), y: +q.y.toFixed(3), z: +q.z.toFixed(3), c: [+cyl[k].p.x.toFixed(2), +cyl[k].p.y.toFixed(2), +cyl[k].p.z.toFixed(2), +cyl[k].r.toFixed(2), +cyl[k].e.toFixed(2)], mat: (ms[0].color ? ms[0].color.getHexString() : '?') }); const nom = o.name || (o.parent && o.parent.name) || o.geometry.type; clip.set(nom, (clip.get(nom) || 0) + 1); }
        }
      }
    });
  }
  if (nClip > 0) ko.push(`pénétration : ${nClip} point(s) de carrosserie dans un pneu (${[...clip].slice(0, 4).map(([k, v]) => k + '×' + v).join(', ')})`);
  // laque vernie
  let vernies = 0;
  m.chassis.traverse((o) => { if (!o.isMesh) return; for (const mt of (Array.isArray(o.material) ? o.material : [o.material])) if (mt.isMeshPhysicalMaterial && mt.clearcoat >= 0.9 && !mt.transparent) vernies++; });
  if (!vernies) ko.push('aucune laque vernie');
  // proportions : pavillon (lancer de rayons, tiers central de l'empattement) / largeur hors tout — même mesure que bolides3d.js
  const fp = m.proportion && m.proportion.famille === 'réel' ? { nom: 'réel', plafond: m.proportion.plafond } : familleProportion(code), fam = fp.nom, plafond = fp.plafond;
  const pav = hauteurPavillon(THREE, m.chassis, m.essieuArriere, m.essieuAvant, m.largeur);
  const hw = pav / s.z;
  if (hw > plafond + 0.006) (m.proportion && m.proportion.k <= 0.551 ? ko : av).push(`H/W ${hw.toFixed(3)} > ${plafond} (${fam})`);
  // triangles
  let tri = 0; m.groupe.traverse((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  return {
    code, source: m.source, fam: m.fam, famille: fam, verdict: ko.length ? 'KO' : av.length ? 'AV' : 'OK', ko, av,
    L: +m.longueur.toFixed(2), largeur: +m.largeur.toFixed(2), hauteur: +m.hauteur.toFixed(2), pavillon: +pav.toFixed(2), hSurW: +hw.toFixed(3), kPavillon: m.proportion ? m.proportion.k : null,
    boite: [+s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)], roues: pneus.length,
    pneuMin: pneus.length ? +Math.min(...pneus.filter((p) => !p.fin).map((p) => p.rapport).concat([9])).toFixed(3) : null,
    ecartSol: +ecartSol.toFixed(4), vernies, triangles: Math.round(tri), penetration: nClip,
  };
}

async function lancer() {
  const vue = $('#vue').value;
  const voulus = (Q.get('codes') || '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  const liste = DATA.carList.filter((c) => !c.relic && (!voulus.length || voulus.includes(c.code)));
  const grille = $('#grille'); grille.innerHTML = '';
  window.__banc = { fini: false, vue, resultats: [] };
  let nOk = 0, nAv = 0, nKo = 0;
  for (const car of liste) {
    const carte = document.createElement('div'); carte.className = 'c';
    carte.innerHTML = `<canvas width="${W}" height="${H}"></canvas><div class="l"><span class="code">${car.code} · ${car.alias || ''}</span><span class="v">…</span></div><div class="m"></div>`;
    grille.appendChild(carte);
    let res;
    try {
      const m = await construireBolide3D(car.code, { THREE, envMap: env });
      scene.add(m.groupe); m.groupe.updateMatrixWorld(true);
      res = controler(car.code, m);
      const box = new THREE.Box3().setFromObject(m.groupe);
      ombre.scale.set(res.L * 1.25, res.largeur * 1.6, 1); ombre.position.x = (box.min.x + box.max.x) / 2;
      placerCamera(vue, m, box);
      m.maj(0.016, 0, 0);
      renderer.render(scene, camera);
      carte.querySelector('canvas').getContext('2d').drawImage(renderer.domElement, 0, 0);
      scene.remove(m.groupe); m.dispose();
    } catch (e) {
      res = { code: car.code, verdict: 'KO', ko: [String(e && e.message || e)], av: [] };
    }
    window.__banc.resultats.push(res);
    if (res.verdict === 'OK') nOk++; else if (res.verdict === 'AV') nAv++; else nKo++;
    carte.classList.add(res.verdict.toLowerCase());
    const v = carte.querySelector('.v'); v.textContent = res.verdict; v.className = 'v ' + res.verdict.toLowerCase();
    carte.querySelector('.m').innerHTML = res.L != null
      ? `${res.source} · ${res.famille} · L ${res.L} · voie ${res.largeur} · pavillon ${res.pavillon} · H/W ${res.hSurW}${res.kPavillon && res.kPavillon < 1 ? ' (pavillon ×' + res.kPavillon + ')' : ''}<br>pneu ≥ ${res.pneuMin} R · ${res.roues} roues · sol ±${res.ecartSol} · ${res.vernies} laques vernies · ${res.triangles} tri.`
        + (res.ko.length || res.av.length ? `<br><span style="color:var(--${res.ko.length ? 'ko' : 'av'})">${[...res.ko, ...res.av].join(' · ')}</span>` : '')
      : `<span style="color:var(--ko)">${res.ko.join(' · ')}</span>`;
    $('#bilan').innerHTML = `<b>${window.__banc.resultats.length}</b>/${liste.length} · <b style="color:var(--ok)">${nOk} OK</b> · <b style="color:var(--av)">${nAv} AV</b> · <b style="color:var(--ko)">${nKo} KO</b>`;
    await new Promise((r) => setTimeout(r, 0));
  }
  window.__banc.fini = true;
}

(async () => {
  if (!THREE) { $('#bilan').textContent = 'Three.js absent'; return; }
  await findRelay(); await loadData();
  if (['34', 'profil', 'roue'].includes(Q.get('vue'))) $('#vue').value = Q.get('vue');
  preparer();
  $('#relancer').onclick = lancer; $('#vue').onchange = lancer;
  lancer();
})();
