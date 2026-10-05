/* Panthéon des trophées : les 26 trophées du Grand Prix, en VRAIES STL de montage, dans une salle d'honneur.
   « La salle »  : tous les trophées sur leurs colonnes lumineuses (officiels au fond, loufoques devant), caméra en travelling.
   « Vitrine »   : un trophée seul sur plateau tournant, fiche d'impression P1S complète, vue éclatée animée.
   Paramètres : ?id=pigeon_or&mode=vitrine|salle&eclate=1&capture=1 (rendus pour les tutoriels et le catalogue). */
import { $, $$, esc } from '../shared/core.js';
import { startAtmosphere } from '../shared/fx.js';
import { preparerScene, creerBloom } from '../shared/caisses3d.js';
import { chargerManifeste, construireTrophee, couleurTrophee } from '../shared/pantheon3d.js';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.get('capture') === '1';
if (CAPTURE) document.documentElement.classList.add('capture');
if (!CAPTURE) startAtmosphere({ road: false, snow: 0.5, aurora: 0.9 });
const THREE = window.THREE;
const st = { mode: Q.get('mode') === 'vitrine' ? 'vitrine' : 'salle', id: Q.get('id'), man: null, trophees: new Map(), poses: new Map(),
  eclate: Q.get('eclate') === '1', kEcl: Q.get('eclate') === '1' ? 1 : 0, cam: { pos: new THREE.Vector3(0, 9, 34), cible: new THREE.Vector3(0, 4, 0) },
  survol: null, t0: performance.now() };
let renderer, scene, camera, bloom, salle, vitrine, plateau, ray, souris;

function initScene() {
  const c = $('#c3');
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE });
  renderer.setPixelRatio(CAPTURE ? 1 : Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  preparerScene(THREE, renderer, scene, { teinte: 0xffb84d });
  bloom = creerBloom(THREE, renderer, { force: 0.6, seuil: 0.9, exposition: 0.78 });
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1030, 0.35));
  const key = new THREE.SpotLight(0xfff1d6, 1.35, 220, 0.75, 0.6); key.position.set(-20, 70, 45); key.castShadow = true; key.shadow.mapSize.set(CAPTURE ? 1024 : 2048, CAPTURE ? 1024 : 2048); scene.add(key); scene.add(key.target);
  const rimG = new THREE.PointLight(0xff4fb0, 1.2, 120); rimG.position.set(-45, 14, -25); scene.add(rimG);
  const rimD = new THREE.PointLight(0x4cc9f0, 1.2, 120); rimD.position.set(45, 14, -25); scene.add(rimD);
  // sol miroir sombre + liseré arc-en-ciel
  const sol = new THREE.Mesh(new THREE.CircleGeometry(90, 96), new THREE.MeshStandardMaterial({ color: 0x0a0b1c, metalness: 0.7, roughness: 0.35 }));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
  const arc = ['#ff4d6d', '#ff9f43', '#ffd166', '#3ddc97', '#4cc9f0', '#9b5de5'];
  arc.forEach((h, i) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(50 + i * 0.7, 50.45 + i * 0.7, 128, 1, Math.PI * 0.02, Math.PI * 0.96),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(h).multiplyScalar(1.6), side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.y = 0.02; scene.add(r);
  });
  salle = new THREE.Group(); scene.add(salle);
  vitrine = new THREE.Group(); vitrine.visible = false; scene.add(vitrine);
  plateau = new THREE.Group(); vitrine.add(plateau);
  const disque = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.6, 0.8, 96), new THREE.MeshStandardMaterial({ color: 0x15172e, metalness: 0.8, roughness: 0.25 }));
  disque.position.y = -0.4; disque.receiveShadow = true; vitrine.add(disque);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(9.3, 0.07, 8, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd34d').multiplyScalar(2.2) }));
  halo.rotation.x = Math.PI / 2; halo.position.y = 0.02; vitrine.add(halo);
  ray = new THREE.Raycaster(); souris = new THREE.Vector2(-9, -9);
  const resize = () => { const r = c.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); bloom.taille(r.width, r.height); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize); resize();
  c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); });
  c.addEventListener('click', () => { if (st.mode === 'salle' && st.survol) choisir(st.survol, 'vitrine'); });
}

/* Colonnes de la salle : officiels sur un arc haut au fond, loufoques sur un arc bas devant. */
function colonne(h, couleur) {
  const g = new THREE.Group();
  const fut = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, h, 8), new THREE.MeshStandardMaterial({ color: 0x1b1d38, metalness: 0.6, roughness: 0.3 }));
  fut.position.y = h / 2; fut.castShadow = true; fut.receiveShadow = true; g.add(fut);
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur).multiplyScalar(2.4) }));
  anneau.rotation.x = Math.PI / 2; anneau.position.y = h - 0.05; g.add(anneau);
  return g;
}

async function construireSalle() {
  const off0 = st.man.trophees.filter((t) => t.categorie === 'officiel');
  const off = [...off0.slice(1, 1 + Math.floor((off0.length - 1) / 2)), off0[0], ...off0.slice(1 + Math.floor((off0.length - 1) / 2))];  // la Coupe au centre
  const lou = st.man.trophees.filter((t) => t.categorie !== 'officiel');
  const placer = (liste, R, h, a0, a1) => liste.forEach((t, i) => {
    const a = liste.length > 1 ? a0 + (a1 - a0) * i / (liste.length - 1) : (a0 + a1) / 2;
    st.poses.set(t.id, { x: Math.sin(a) * R, z: -Math.cos(a) * R + 14, h, a });
  });
  // 3 gradins : officiels au fond (hauts), loufoques sur 2 arcs devant ; ~10 cm entre deux socles
  placer(off, 42, 11.0, -1.3, 1.3);
  const mi = Math.ceil(lou.length / 2);
  placer(lou.slice(0, mi), 31, 5.5, -1.4, 1.4);
  placer(lou.slice(mi), 20, 1.5, -1.5, 1.5);
  // en capture « vitrine », seul le trophée demandé est chargé (rendus rapides pour le catalogue et les tutoriels)
  const liste = CAPTURE && st.mode === 'vitrine' && st.id ? st.man.trophees.filter((t) => t.id === st.id) : st.man.trophees;
  await Promise.all(liste.map(async (t) => {
    const tr = await construireTrophee(THREE, t);
    st.trophees.set(t.id, tr);
    const p = st.poses.get(t.id);
    const g = new THREE.Group();
    g.add(colonne(p.h, couleurTrophee(t)));
    const c = tr.boite.getCenter(new THREE.Vector3());
    tr.group.position.set(-c.x, p.h - tr.boite.min.y, -c.z);
    g.add(tr.group);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = -p.a * 0.85;
    g.userData.id = t.id;
    salle.add(g);
  }));
}

function rail() {
  const r = $('#rail');
  r.innerHTML = '';
  for (const cat of ['officiel', 'loufoque']) {
    r.append(Object.assign(document.createElement('div'), { className: 'sep', textContent: cat === 'officiel' ? 'Officiels' : 'Loufoques' }));
    for (const t of st.man.trophees.filter((x) => x.categorie === cat)) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.id = t.id;
      b.style.setProperty('--rc', couleurTrophee(t));
      b.innerHTML = `<span class="pastille"></span><span class="nm">${esc(t.nom)}</span>${t.valide ? '<i class="ok" title="Validé atelier : aucun support">✓</i>' : ''}`;
      b.onclick = () => choisir(t.id, 'vitrine');
      r.append(b);
    }
  }
}

function info() {
  const t = st.man.trophees.find((x) => x.id === st.id);
  if (!t) { $('#info').innerHTML = salleInfo(); return; }
  const fil = new Map();
  for (const p of t.pieces) { const k = p.fil.ref; if (!fil.has(k)) fil.set(k, { ...p.fil, g: 0 }); fil.get(k).g += p.analyse.masse_g * p.qte; }
  const lignes = t.pieces.map((p) => `<tr><td><span class="sw" style="--c:${p.fil.hex}"></span>${esc(p.nom)}${p.qte > 1 ? ' ×' + p.qte : ''}</td>
    <td>${p.analyse.dimensions_mm.map((d) => Math.round(d)).join('×')}</td><td>${Math.round(p.analyse.masse_g)} g</td><td>${p.analyse.temps_min} min</td>
    <td>${{ OK: '✅', A_SURVEILLER: '⚠️', NON: '❌' }[p.analyse.verdict_impression]}</td></tr>`).join('');
  $('#info').innerHTML = `
    <div class="panel deco"><span class="cat ${t.categorie}">${t.categorie === 'officiel' ? 'Trophée officiel' : 'Trophée loufoque'}</span>
      ${t.valide ? '<span class="valid">✓ Validé atelier · aucun support</span>' : '<span class="valid ko">À reprendre</span>'}
      <h2 class="display foil">${esc(t.nom)}</h2>
      <p class="qt">${esc(t.attribution)}</p>
      <div class="kv"><b>Attribution</b><span>${t.prix ? `automatique (prix <code>${esc(t.prix)}</code> du relais)` : 'remis par le jury'}</span>
      <b>Hauteur</b><span>${Math.round(t.hauteur_mm)} mm · ${t.pieces.reduce((a, p) => a + p.qte, 0)} pièces</span>
      <b>Filament</b><span>${Math.round(t.masse_g)} g · ≈ ${Math.floor(t.temps_min / 60)} h ${String(t.temps_min % 60).padStart(2, '0')} sur la P1S</span></div>
      <div class="fils">${[...fil.values()].map((f) => `<span class="fil"><span class="sw" style="--c:${f.hex}"></span>${esc(f.gamme)} ${esc(f.nom)} <i>${Math.round(f.g)} g</i></span>`).join('')}</div>
    </div>
    <div class="panel deco"><div class="h2">Pièces à imprimer</div>
      <table class="pcs"><thead><tr><th>Pièce</th><th>mm</th><th>Masse</th><th>Temps</th><th></th></tr></thead><tbody>${lignes}</tbody></table>
      <p class="dim small">Fichiers orientés dans <code>10_Pantheon_Trophees/stl/${esc(t.id)}/</code> · tutoriel <code>TUTOS/${esc(t.id)}.md</code>.</p>
    </div>`;
}

function salleInfo() {
  const v = st.man.trophees.filter((t) => t.valide).length;
  const g = st.man.trophees.reduce((a, t) => a + t.masse_g, 0);
  const h = st.man.trophees.reduce((a, t) => a + t.temps_min, 0);
  return `<div class="panel deco"><div class="h2">La salle d'honneur</div><h2 class="display foil">${st.man.trophees.length} trophées</h2>
    <p class="qt">Chaque pièce sort de la P1S sans un seul support, une couleur par pièce.</p>
    <div class="kv"><b>Validés atelier</b><span>${v} / ${st.man.trophees.length}</span><b>Filament</b><span>${(g / 1000).toFixed(1)} kg</span><b>Impression</b><span>≈ ${Math.round(h / 60)} h</span></div>
    <p class="dim small">Cliquez un trophée dans la salle ou dans la liste pour l'ouvrir en vitrine.</p></div>`;
}

async function choisir(id, mode) {
  st.id = id;
  $$('#rail button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  setMode(mode || st.mode);
  info();
}

function setMode(m) {
  st.mode = m;
  $('#salle').classList.toggle('on', m === 'salle'); $('#vitrine').classList.toggle('on', m === 'vitrine');
  salle.visible = m === 'salle';
  vitrine.visible = m === 'vitrine';
  // la vitrine prête le groupe du trophée choisi (il revient dans la salle au retour)
  for (const [id, tr] of st.trophees) {
    const dansVitrine = m === 'vitrine' && id === st.id;
    const parent = dansVitrine ? plateau : salle.children.find((g) => g.userData.id === id);
    if (parent && tr.group.parent !== parent) {
      parent.add(tr.group);
      const c = tr.boite.getCenter(new THREE.Vector3());
      const p = st.poses.get(id);
      tr.group.position.set(-c.x, dansVitrine ? -tr.boite.min.y : p.h - tr.boite.min.y, -c.z);
    }
  }
  if (m === 'salle') { st.id = null; $$('#rail button').forEach((b) => b.classList.remove('on')); info(); }
  $('#cartel').textContent = '';
}

function cartel() {
  if (st.mode !== 'salle') return;
  ray.setFromCamera(souris, camera);
  const hit = ray.intersectObjects(salle.children, true)[0];
  let o = hit && hit.object; while (o && !o.userData.id) o = o.parent;
  const id = o ? o.userData.id : null;
  if (id !== st.survol) {
    st.survol = id;
    const t = id && st.man.trophees.find((x) => x.id === id);
    $('#cartel').innerHTML = t ? `<b>${esc(t.nom)}</b><span>${esc(t.attribution)}</span>` : '';
    document.body.style.cursor = t ? 'pointer' : '';
  }
}

function boucle(now) {
  const t = (now - st.t0) / 1000;
  st.kEcl += ((st.eclate ? 1 : 0) - st.kEcl) * (CAPTURE ? 1 : 0.08);
  if (st.mode === 'vitrine' && st.id) {
    const tr = st.trophees.get(st.id);
    if (tr) {
      tr.eclatement(st.kEcl);
      const b = tr.boite, hgt = b.max.y - b.min.y, lar = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      const d = Math.max(hgt * 2.0, lar * 1.9, 18) * (1 + st.kEcl * 0.35);
      plateau.rotation.y = CAPTURE ? -0.5 : t * 0.35;
      st.cam.pos.set(Math.sin(0.35) * d, hgt * 0.75 + d * 0.18, Math.cos(0.35) * d);
      st.cam.cible.set(0, hgt * (0.45 + st.kEcl * 0.1), 0);
    }
  } else {
    for (const tr of st.trophees.values()) tr.eclatement(0);
    const a = CAPTURE ? 0 : Math.sin(t * 0.08) * 0.35;
    st.cam.pos.set(Math.sin(a) * 66, 40, Math.cos(a) * 66 + 14);
    st.cam.cible.set(0, 7, -12);
    cartel();
  }
  camera.position.lerp(st.cam.pos, CAPTURE ? 1 : 0.06);
  camera.lookAt(st.cam.cible);
  bloom.rendre(scene, camera);
  requestAnimationFrame(boucle);
}

async function main() {
  initScene();
  st.man = await chargerManifeste();
  rail();
  await construireSalle();
  $('#salle').onclick = () => setMode('salle');
  $('#vitrine').onclick = () => choisir(st.id || st.man.trophees[0].id, 'vitrine');
  $('#ecl').onclick = () => { st.eclate = !st.eclate; $('#ecl').classList.toggle('on', st.eclate); };
  $('#ecl').classList.toggle('on', st.eclate);
  if (st.id && st.man.trophees.some((t) => t.id === st.id)) await choisir(st.id, st.mode);
  else setMode('salle');
  info();
  requestAnimationFrame(boucle);
  if (CAPTURE) setTimeout(() => { window.__pret = true; }, 400);
}
main().catch((e) => { console.error(e); $('#info').innerHTML = `<div class="panel">Panthéon indisponible : ${esc(e.message)}</div>`; });
