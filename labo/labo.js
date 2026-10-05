/* Labo des pièces : simulateur 3D des pièges ASSERVIS et MOBILES + atelier de montage.
   PORTE D'ENTRÉE : seules les pièces « validées à l'atelier » (shared/atelier/atelier.json, produit par
   9_Validation_Atelier/valider_labo.py) apparaissent. Une pièce y entre si elle s'imprime sans support sur la P1S,
   se pose et se réarme vite, et fonctionne avec une fenêtre de déclenchement humaine.
   « Démo auto »      : le piège se déclenche au moment idéal, en boucle.
   « Défi du timing » : à vous d'appuyer sur DÉCLENCHER ; écart au moment idéal en millisecondes réelles.
   « Atelier »        : les VRAIES STL de la P1S, montage étape par étape, vue éclatée, fiche d'impression.
   Paramètres d'URL : ?piece=herse&mode=auto|defi|atelier&etape=2&eclate=1&capture=1 (rendus des tutoriels). */
import { $, $$, esc, DATA, findRelay, loadData } from '../shared/core.js';
import { startAtmosphere } from '../shared/fx.js';
import { icon } from '../shared/icons.js';
import { RIGS, buildToyCar, buildLane, carPose, mats, RALENTI, VCAR, X0 } from '../shared/arsenal3d.js';
import { construireMontage } from '../shared/atelier3d.js';
import { environnementStudio } from '../shared/stl.js';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.get('capture') === '1';
if (CAPTURE) document.documentElement.classList.add('capture');
if (!CAPTURE) startAtmosphere({ road: false, snow: 0.4, aurora: 0.8 });
const THREE = window.THREE;
const st = { id: null, mode: 'auto', t: 0, tTrig: null, last: performance.now(), rig: null, rigDef: null, car: null,
  atelier: null, fiche: null, montage: null, etape: 0, tEtape: 1, eclate: false, jeton: 0 };
let renderer, scene, camera, root, piste, rootAtelier;
const fr = (x, d = 0) => Number(x).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const etoiles = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

(async () => {
  await findRelay();
  await loadData();
  try { st.atelier = await (await fetch('../shared/atelier/atelier.json', { cache: 'no-store' })).json(); } catch { st.atelier = { fiches: [] }; }
  initScene();
  const fiche = (id) => st.atelier.fiches.find((f) => f.id === id);
  const items = DATA.rules.shop.filter((it) => RIGS[it.id]);
  const admis = items.filter((it) => fiche(it.id) && fiche(it.id).valide);
  const refuses = items.filter((it) => !admis.includes(it));
  const groupe = (a) => admis.filter((it) => RIGS[it.id].arch === a);
  const btn = (it) => `<button data-id="${it.id}" class="r-${it.rarity}" title="${esc(it.name)}"><span class="aic">${icon(it.icon, 34)}</span>${esc(it.name.split(' ')[0])}<i class="ok" title="Validé à l'atelier">✓</i></button>`;
  $('#rail').innerHTML = `<div class="sep">ASSERVIS</div>${groupe('asservi').map(btn).join('')}<div class="sep">MOBILES</div>${groupe('mobile').map(btn).join('')}`
    + (refuses.length ? `<div class="sep ko">EN REFONTE</div>${refuses.map((it) => `<span class="refuse" title="${esc(it.name)} : non validé à l'atelier">${icon(it.icon, 22)}</span>`).join('')}` : '');
  $$('#rail button').forEach((b) => b.onclick = () => choisir(b.dataset.id));
  $('#auto').onclick = () => setMode('auto');
  $('#defi').onclick = () => setMode('defi');
  $('#atel').onclick = () => setMode('atelier');
  $('#go').onclick = declencher;
  $('#prev').onclick = () => allerEtape(st.etape - 1);
  $('#next').onclick = () => allerEtape(st.etape + 1);
  $('#ecl').onclick = () => { st.eclate = !st.eclate; $('#ecl').classList.toggle('on', st.eclate); };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && st.mode !== 'atelier') { e.preventDefault(); declencher(); }
    if (st.mode === 'atelier' && e.code === 'ArrowRight') allerEtape(st.etape + 1);
    if (st.mode === 'atelier' && e.code === 'ArrowLeft') allerEtape(st.etape - 1);
  });
  const q = Q.get('piece');
  if (!admis.length) { $('#info').innerHTML = '<div class="panel deco"><div class="h2">Labo vide</div><p class="dim">Aucune pièce validée : lancez 9_Validation_Atelier/valider_labo.py.</p></div>'; return; }
  st.mode = ['defi', 'atelier'].includes(Q.get('mode')) ? Q.get('mode') : 'auto';
  await choisir(q && admis.some((x) => x.id === q) ? q : admis[0].id);
  setMode(st.mode);
  requestAnimationFrame(boucle);
})();

function initScene() {
  const c = $('#c3');
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  scene = new THREE.Scene();
  scene.environment = environnementStudio(THREE, renderer);
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x221a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-8, 18, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); scene.add(sun);
  const rim = new THREE.PointLight(0xff4fb0, 0.9, 60); rim.position.set(10, 6, -10); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9fc6ff, 0.5); fill.position.set(10, 8, 14); scene.add(fill);
  piste = buildLane(THREE, 56); piste.position.x = -14; scene.add(piste);
  root = new THREE.Group(); scene.add(root);
  rootAtelier = new THREE.Group(); scene.add(rootAtelier);
  const resize = () => { const r = c.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize); resize();
}

async function choisir(id) {
  st.id = id;
  const jeton = ++st.jeton;
  $$('#rail button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  while (root.children.length) root.remove(root.children[0]);
  st.rigDef = RIGS[id];
  st.rig = st.rigDef.build(THREE, mats(THREE));
  root.add(st.rig.group);
  st.car = buildToyCar(THREE, 0x1f4e8f);
  root.add(st.car);
  st.fiche = st.atelier.fiches.find((f) => f.id === id);
  const n = (st.fiche.etapes || []).length;
  st.etape = Q.has('etape') && Q.get('piece') === id ? Math.max(0, Math.min(n, +Q.get('etape'))) : n;
  st.eclate = Q.get('eclate') === '1';
  $('#ecl').classList.toggle('on', st.eclate);
  rejouer();
  drawInfo();
  // montage de l'atelier (STL réelles), chargé en tâche de fond
  if (st.montage) { rootAtelier.remove(st.montage.group); st.montage.dispose(); st.montage = null; }
  const m = await construireMontage(THREE, st.fiche);
  if (jeton !== st.jeton) { m.dispose(); return; }
  st.montage = m;
  if (st.fiche.mobile) { const b = new THREE.Box3().setFromObject(m.group); m.group.position.y = -b.min.y; m.boite.translate(new THREE.Vector3(0, -b.min.y, 0)); }
  rootAtelier.add(m.group);
  st.tEtape = CAPTURE ? 1 : 0;
}

function setMode(m) {
  st.mode = m;
  $('#auto').classList.toggle('on', m === 'auto'); $('#defi').classList.toggle('on', m === 'defi'); $('#atel').classList.toggle('on', m === 'atelier');
  $('#go').hidden = m !== 'defi';
  $('#stage').classList.toggle('atelier', m === 'atelier');
  rejouer();
  drawInfo();
}

function allerEtape(k) {
  const n = (st.fiche.etapes || []).length;
  st.etape = Math.max(0, Math.min(n, k));
  st.tEtape = 0;
  drawInfo();
}

function rejouer() { st.t = 0; st.tTrig = null; $('#score').textContent = ''; $('#score').className = ''; etat(); }
function etat() {
  const e = $('#etat');
  if (st.mode === 'atelier') { e.textContent = 'Atelier'; e.className = ''; return; }
  e.textContent = st.tTrig == null ? 'Armé' : (st.rigDef.arch === 'mobile' ? 'Lancé !' : 'Déclenché !'); e.className = st.tTrig == null ? 'armed' : 'fired';
}

/* --------------------------------------------------------------------------------------------- panneau d'info */
function drawInfo() {
  const it = DATA.rules.shop.find((x) => x.id === st.id);
  const f = st.fiche;
  if (!it || !f) return;
  const t = it.team != null ? DATA.teams.find((x) => x.id === it.team) : null;
  const statut = { REFONDU: 'refondu à l\'atelier', 'CORRIGÉ': 'corrigé à l\'atelier', 'VALIDÉ': 'validé tel quel' }[f.statutV1] || '';
  const notes = `<div class="notes">${[['Impression', f.notes.impression], ['Mise en place', f.notes.mise_en_place], ['Réarmement', f.notes.rearmement], ['Fiabilité', f.notes.fiabilite]]
    .map(([k, v]) => `<span><b>${k}</b><i>${etoiles(v)}</i></span>`).join('')}</div>`;
  const tete = `<span class="arch ${st.rigDef.arch}">${st.rigDef.arch === 'mobile' ? 'Mobile' : 'Asservi'}</span> <span class="valid">✓ Validé atelier</span>
    <h2 class="display foil">${esc(it.name)}</h2>`;
  $('#etapeTxt').textContent = st.etape === 0 ? 'Éclaté' : `${st.etape} / ${(f.etapes || []).length}`;
  if (st.mode !== 'atelier') {
    $('#info').innerHTML = `<div class="panel deco r-${it.rarity}"><img class="vign" src="../shared/arsenal/${it.id}.jpg" alt="Modèle 3D imprimable" onerror="this.remove()">
      ${tete}<div class="dim">${esc(it.effect)}</div><div class="qt">« ${esc(it.lore)} »</div>
      <div class="kv"><b>Déclenchement</b><span>${esc(f.declenchement)}</span><b>Avance</b><span>bolide à ≈ ${st.rigDef.avanceCm} cm (à 2,5 m/s)</span>
      <b>Fenêtre</b><span>${fenetreTexte()}</span><b>Réarmer</b><span>${esc(f.rearmer)}</span>
      <b>Effet sur la cote</b><span>×${String(it.factor).replace('.', ',')}</span>${t ? `<b>Signature</b><span>${esc(t.name)}</span>` : ''}</div></div>
      <div class="panel deco"><div class="h2">Fiche atelier · ${esc(statut)}</div>${notes}
      <p class="dim small">${esc(f.solution)}</p><button class="btn sm" id="voirAtel" type="button">Voir le montage pas à pas</button></div>`;
    $('#voirAtel').onclick = () => setMode('atelier');
    return;
  }
  const n = (f.etapes || []).length, e = f.etapes[st.etape - 1];
  const pieces = f.pieces.filter((p) => p.imprime);
  $('#info').innerHTML = `<div class="panel deco r-${it.rarity}">${tete}
      <div class="etape"><b>${st.etape === 0 ? 'Vue éclatée' : `Étape ${st.etape} / ${n}`}</b><p>${esc(e ? e.texte : 'Toutes les pièces, écartées. Avancez d\'une étape avec ▶ ou la flèche droite.')}</p></div></div>
    <div class="panel deco"><div class="h2">À imprimer · Bambu Lab P1S</div>
      <div class="plist">${pieces.map((p) => `<div class="pl"><i class="fil" style="background:${p.hex}"></i><div><b>${esc(p.nom)}${p.qte > 1 ? ` ×${p.qte}` : ''}</b>${p.partage ? ' <em>commun à 5 pièges</em>' : ''}
        <small>${esc(p.filament)} · ${esc(p.profil || '')}</small><small>${esc(p.orientation || '')}${p.analyse ? ` · ${fr(p.analyse.masse_g, 1)} g · ~${p.analyse.temps_min} min · ${esc(p.analyse.supports === 'aucun' ? 'sans support' : p.analyse.supports)}` : ''}</small>
        <code>${esc(p.fichier || '')}</code></div></div>`).join('')}</div></div>
    ${f.quincaillerie.length ? `<div class="panel deco"><div class="h2">À acheter</div><ul class="ql">${f.quincaillerie.map((q) => `<li><b>${esc(q.nom)}</b> × ${q.qte}<small>${esc(q.note)}</small></li>`).join('')}</ul></div>` : ''}
    <div class="panel deco"><div class="h2">Sur la piste</div><div class="kv"><b>Pose</b><span>${f.poseS ? `≈ ${f.poseS} s` : 'rien à poser'}</span><b>Déclencher</b><span>${esc(f.declenchement)}</span><b>Réarmer</b><span>${esc(f.rearmer)}</span><b>Fiabilité</b><span>${esc(f.fiabilite)}</span></div>
    ${f.defautsV1.length ? `<details><summary class="small">Pourquoi la version d'origine a été ${f.statutV1 === 'REFONDU' ? 'refondue' : 'corrigée'}</summary><ul class="small dim">${f.defautsV1.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>` : ''}</div>`;
}

function fenetreTexte() {
  const tol = st.rigDef.tolerance || { avant: 0.025, apres: 0.025 };
  if (tol.avant >= 0.5) return `trop tôt : aucun risque · trop tard : ${Math.round(tol.apres * 1000)} ms de marge`;
  return `± ${Math.round(tol.apres * 1000)} ms`;
}

/* --------------------------------------------------------------------------------------------- simulation */
/** Moment idéal = instant où le bolide passe à declencheX ; le défi note l'écart en millisecondes réelles. */
function tIdeal() { return (st.rigDef.declencheX - X0) / VCAR; }
function dansFenetre(tTrig) {
  const tol = st.rigDef.tolerance || { avant: 0.025, apres: 0.025 };
  const d = (tTrig - tIdeal()) / RALENTI;
  return d <= 0 ? -d <= tol.avant : d <= tol.apres;
}
function declencher() {
  if (st.mode === 'atelier') return;
  if (st.tTrig != null) { rejouer(); return; }
  st.tTrig = st.t; etat();
  if (st.mode === 'defi') {
    const d = Math.round((st.t - tIdeal()) / RALENTI * 1000), s = $('#score');
    const ok = dansFenetre(st.t);
    s.textContent = ok ? (Math.abs(d) <= 25 ? `PARFAIT (${d > 0 ? '+' : ''}${d} ms)` : `RÉUSSI (${d} ms : piège en place avant le bolide)`) : d < 0 ? `Trop tôt de ${-d} ms` : `Trop tard de ${d} ms`;
    s.className = ok ? 'parfait' : d < 0 ? 'tot' : 'tard';
  }
}

function boucle(now) {
  const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
  const atel = st.mode === 'atelier';
  root.visible = !atel; rootAtelier.visible = atel;
  if (!atel) {
    st.t += dt;
    if (st.mode === 'auto' && st.tTrig == null && st.t >= tIdeal()) declencher();
    const tau = st.tTrig == null ? -1 : st.t - st.tTrig;
    st.rig.pose(tau);
    const reussi = st.tTrig != null && (st.mode === 'auto' || dansFenetre(st.tTrig));
    const p = reussi ? carPose(st.rigDef, st.t, st.tTrig) : carPose({ ...st.rigDef, reaction: 'none', impactX: 99 }, st.t, null);
    st.car.position.set(p.x, p.y, p.z); st.car.rotation.set(p.rx, p.ry, p.rz);
    if (st.t > (14 - X0) / VCAR) rejouer();
    const a = now / 9000;
    camera.position.set(10 + Math.sin(a) * 3, 17, 27 + Math.cos(a) * 2);
    camera.lookAt(-6, 1.5, 0);
  } else if (st.montage) {
    st.tEtape = Math.min(1, st.tEtape + dt / 0.9);
    st.montage.eclatement(st.eclate ? 1 : 0);
    st.montage.etape(st.etape, st.tEtape);
    const b = st.montage.boite, c = b.getCenter(new THREE.Vector3()), r = Math.max(2.4, b.getSize(new THREE.Vector3()).length() * 0.62);
    const a = CAPTURE ? 0.72 : now / 7000;
    camera.position.set(c.x + Math.sin(a) * r * 2.3, c.y + r * 1.15, c.z + Math.cos(a) * r * 2.3);
    camera.lookAt(c.x, c.y * 0.85, c.z);
    if (CAPTURE && st.tEtape >= 1) window.__pret = true;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
