/* Labo des pièges : simulateur 3D des pièges ASSERVIS et MOBILES (données réelles : rules.json / relais).
   « Démo auto » : le piège se déclenche au moment idéal, en boucle.
   « Défi du timing » : à vous d'appuyer sur DÉCLENCHER ; le labo note l'écart au moment idéal (entraînement avant la soirée). */
import { $, $$, esc, DATA, findRelay, loadData } from '../shared/core.js';
import { startAtmosphere } from '../shared/fx.js';
import { icon } from '../shared/icons.js';
import { RIGS, buildToyCar, buildLane, carPose, mats, RALENTI, VCAR, X0 } from '../shared/arsenal3d.js';
const FENETRE_S = 0.025 * RALENTI;   // fenêtre de réussite : ±25 ms réels (±6 cm à 2,5 m/s)

startAtmosphere({ road: false, snow: 0.4, aurora: 0.8 });
const THREE = window.THREE;
const st = { id: null, mode: 'auto', t: 0, tTrig: null, last: performance.now(), rig: null, rigDef: null, car: null, fini: false };
let renderer, scene, camera, root;

(async () => {
  await findRelay();
  await loadData();
  initScene();
  const items = DATA.rules.shop.filter((it) => RIGS[it.id]);
  const groupe = (a) => items.filter((it) => RIGS[it.id].arch === a);
  const btn = (it) => `<button data-id="${it.id}" class="r-${it.rarity}" title="${esc(it.name)}"><span class="aic">${icon(it.icon, 34)}</span>${esc(it.name.split(' ')[0])}</button>`;
  $('#rail').innerHTML = `<div class="sep">ASSERVIS</div>${groupe('asservi').map(btn).join('')}<div class="sep">MOBILES</div>${groupe('mobile').map(btn).join('')}`;
  $$('#rail button').forEach((b) => b.onclick = () => choisir(b.dataset.id));
  $('#auto').onclick = () => setMode('auto');
  $('#defi').onclick = () => setMode('defi');
  $('#go').onclick = declencher;
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); declencher(); } });
  const q = new URLSearchParams(location.search).get('piege');
  choisir(q && RIGS[q] ? q : items[0].id);
  setMode(new URLSearchParams(location.search).get('mode') === 'defi' ? 'defi' : 'auto');
  requestAnimationFrame(boucle);
})();

function initScene() {
  const c = $('#c3');
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x221a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-8, 18, 10); scene.add(sun);
  const rim = new THREE.PointLight(0xff4fb0, 0.9, 60); rim.position.set(10, 6, -10); scene.add(rim);
  const piste = buildLane(THREE, 48); piste.position.x = -10; scene.add(piste);
  root = new THREE.Group(); scene.add(root);
  const resize = () => { const r = c.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize); resize();
}

function choisir(id) {
  st.id = id;
  $$('#rail button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  while (root.children.length) root.remove(root.children[0]);
  st.rigDef = RIGS[id];
  st.rig = st.rigDef.build(THREE, mats(THREE));
  root.add(st.rig.group);
  st.car = buildToyCar(THREE, 0x1f4e8f);
  root.add(st.car);
  rejouer();
  const it = DATA.rules.shop.find((x) => x.id === id);
  const t = it.team != null ? DATA.teams.find((x) => x.id === it.team) : null;
  $('#info').innerHTML = `<div class="panel deco r-${it.rarity}"><img class="vign" src="../shared/arsenal/${it.id}.jpg" alt="Modèle 3D imprimable" onerror="this.remove()">
    <span class="arch ${st.rigDef.arch}">${st.rigDef.arch === 'mobile' ? 'Mobile' : 'Asservi'}</span><h2 class="display foil">${esc(it.name)}</h2>
    <div class="dim">${esc(it.effect)}</div><div class="qt">« ${esc(it.lore)} »</div>
    <div class="kv"><b>Déclenchement</b><span>${esc(it.declenchement || '')}</span><b>Avance</b><span>déclencher quand le bolide est à ≈ ${st.rigDef.avanceCm} cm (à 2,5 m/s)</span><b>Réussite</b><span>${Math.round((it.reussite || 1) * 100)} % (estimation)</span>
    <b>Effet sur la cote</b><span>×${String(it.factor).replace('.', ',')}</span><b>Physique</b><span>${esc(it.physique)}</span>
    <b>Impression</b><span>${esc(it.print.mat)} · ${it.print.min} min</span><b>Bricolage</b><span>${esc(it.diy)}</span>${t ? `<b>Signature</b><span>${esc(t.name)}</span>` : ''}</div></div>`;
}

function setMode(m) {
  st.mode = m;
  $('#auto').classList.toggle('on', m === 'auto'); $('#defi').classList.toggle('on', m === 'defi');
  $('#go').hidden = m !== 'defi';
  rejouer();
}

function rejouer() { st.t = 0; st.tTrig = null; st.fini = false; $('#score').textContent = ''; $('#score').className = ''; etat(); }
function etat() { const e = $('#etat'); e.textContent = st.tTrig == null ? 'Armé' : (st.rigDef.arch === 'mobile' ? 'Lancé !' : 'Déclenché !'); e.className = st.tTrig == null ? 'armed' : 'fired'; }

/** Moment idéal = instant où le bolide passe à declencheX ; le défi note l'écart en millisecondes. */
function tIdeal() { return (st.rigDef.declencheX - X0) / VCAR; }   // temps affiché (ralenti ×RALENTI)
function declencher() {
  if (st.tTrig != null) { rejouer(); return; }
  st.tTrig = st.t; etat();
  if (st.mode === 'defi') {
    const d = Math.round((st.t - tIdeal()) / RALENTI * 1000), s = $('#score');   // écart en millisecondes RÉELLES
    const ok = Math.abs(st.t - tIdeal()) <= FENETRE_S;
    s.textContent = ok ? `PARFAIT (${d > 0 ? '+' : ''}${d} ms)` : d < 0 ? `Trop tôt de ${-d} ms` : `Trop tard de ${d} ms`;
    s.className = ok ? 'parfait' : d < 0 ? 'tot' : 'tard';
  }
}

function boucle(now) {
  const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
  st.t += dt;
  if (st.mode === 'auto' && st.tTrig == null && st.t >= tIdeal()) declencher();
  const tau = st.tTrig == null ? -1 : st.t - st.tTrig;
  st.rig.pose(tau);
  // en défi, le bolide ne réagit que si le déclenchement est dans la fenêtre utile (± 120 ms)
  const reussi = st.tTrig != null && (st.mode === 'auto' || Math.abs(st.tTrig - tIdeal()) <= FENETRE_S);
  const p = reussi ? carPose(st.rigDef, st.t, st.tTrig) : carPose({ ...st.rigDef, reaction: 'none', impactX: 99 }, st.t, null);
  st.car.position.set(p.x, p.y, p.z); st.car.rotation.set(p.rx, p.ry, p.rz);
  if (st.t > (14 - X0) / VCAR) rejouer();
  const a = now / 9000;
  camera.position.set(9 + Math.sin(a) * 3, 13, 21 + Math.cos(a) * 2);
  camera.lookAt(-7, 0.5, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
