/* Showroom 3D — lit les VRAIES données du projet (teams.json, cars.json, rules) : rien n'est inventé. */
import { $, $$, esc, DATA, findRelay, loadData, logoUrl } from '../shared/core.js';
import { startAtmosphere } from '../shared/fx.js';
import { createStage } from '../shared/stage3d.js';
import { conceptInfo } from '../shared/concept_cars.js';
import { createEngineAudio } from '../shared/engine_audio.js';
import { isMuted } from '../shared/audio.js';
import { medal, carArt, statBars, pad2 } from '../shared/ui.js';
import { icon } from '../shared/icons.js';

startAtmosphere({ road: false, snow: 0.8, aurora: 1 });
const st = { mode: 'teams', idx: 0, cat: 'all', auto: true, timer: null };
let stage = null;
const engine = createEngineAudio({ base: '../sounds/', isMuted });
const ICON = { grandprix: 'trophy', parieur: 'coin', cascadeur: 'crash', saboteur: 'banana', reliques: 'car', cuillere: 'spoon' };

(async () => {
  await findRelay();                       // optionnel : sans relais, on lit web/data/
  await loadData();
  stage = createStage($('#c3'), { camera: { r: 8.4, h: 2.2, look: 0.7 } });
  $$('#modes button[data-m]').forEach((b) => b.onclick = () => setMode(b.dataset.m));
  const sb = $('#snd');
  sb.onclick = () => { const on = engine.setEnabled(!engine.isEnabled()); sb.classList.toggle('on', on); sb.setAttribute('aria-pressed', String(on)); sb.textContent = on ? 'Son : actif' : 'Son : coupé'; if (on && st.mode === 'teams') engine.start(DATA.teams[st.idx].id); };
  const c = $('#c3');
  let drag = null;
  c.addEventListener('pointerdown', (e) => { drag = e.clientX; stage.setOrbit(false); st.auto = false; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', (e) => { if (drag !== null) { stage.setSpin(0); window.__rot = (window.__rot || 0) + (e.clientX - drag) * 0.01; drag = e.clientX; stage.rotate && stage.rotate((e.movementX || 0) * 0.01); } });
  c.addEventListener('pointerup', () => { drag = null; stage.setSpin(0.5); });
  setMode('teams');
})();

function setMode(m) {
  st.mode = m; st.idx = 0; st.auto = m !== 'cars';
  $$('#modes button[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  if (m !== 'teams') engine.stop();
  $('#sr').classList.toggle('cars', m === 'cars');
  clearInterval(st.timer);
  draw();
  if (m !== 'cars') st.timer = setInterval(() => { if (st.auto) { st.idx = (st.idx + 1) % (m === 'teams' ? DATA.teams.length : DATA.rules.trophies.length); draw(true); } }, 8000);
}

function draw(soft) {
  const rail = $('#rail'), info = $('#info');
  if (st.mode === 'teams') {
    if (!soft) rail.innerHTML = DATA.teams.map((t, i) => `<button data-i="${i}" title="${esc(t.name)}">${medal(t.id, 84)}</button>`).join('');
    $$('#rail button').forEach((b) => { b.classList.toggle('on', Number(b.dataset.i) === st.idx); b.onclick = () => { st.idx = Number(b.dataset.i); st.auto = false; draw(true); }; });
    const t = DATA.teams[st.idx];
    stage.showConcept(t);
    engine.start(t.id);
    const ci = conceptInfo(t.id);
    info.innerHTML = `<div class="panel deco"><div class="h2">Écurie n° ${pad2(t.id)}</div><div style="display:flex;gap:16px;align-items:center">${medal(t.id, 96)}<div><h2 class="display foil">${esc(t.name)}</h2><div class="dim" style="margin-top:6px">Pilote : ${esc(t.pilot)} · alias « ${esc(t.nickname)} »</div></div></div>
      <div class="qt">« ${esc(t.quote)} »</div><div class="dim">${esc(t.specialty)}</div>
      ${ci ? `<div class="concept"><span class="h2">Concept-car</span><b class="display">${esc(ci.nom)}</b><div class="dim">${esc(ci.inspi)}</div>
        <div class="motor"><span class="dim">Moteur : ${esc(engine.label(t.id))}</span><button id="rev" type="button">Faire rugir</button></div></div>` : ''}
      <div class="sw">${t.colors.map((c) => `<i style="background:${c}" title="${esc(c)}"></i>`).join('')}</div></div>`;
    const rv = $('#rev'); if (rv) rv.onclick = () => { if (!engine.isEnabled()) $('#snd').click(); engine.rev(1.2); };
    const el = rail.querySelector('button.on'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } else if (st.mode === 'trophies') {
    const list = DATA.rules.trophies;
    if (!soft) rail.innerHTML = list.map((t, i) => `<button class="tr" data-i="${i}" title="${esc(t.name)}">${icon(ICON[t.id] || 'trophy', 38)}</button>`).join('');
    $$('#rail button').forEach((b) => { b.classList.toggle('on', Number(b.dataset.i) === st.idx); b.onclick = () => { st.idx = Number(b.dataset.i); st.auto = false; draw(true); }; });
    const t = list[st.idx];
    stage.showTrophy(t.id);
    info.innerHTML = `<div class="panel deco"><div class="h2">Trophée ${st.idx + 1} / ${list.length}</div><h2 class="display foil">${esc(t.name)}</h2><div class="qt">${esc(t.sub)}</div>
      <div class="dim" style="margin-top:12px">Pièce de collection à imprimer en 3D (Bambu Lab) : fichiers STL/3MF générés par le dossier « 3D Trophées » de l'édition.</div></div>
      <div class="panel deco"><div class="h2">Les 4 étoiles bonus</div>${DATA.rules.stars.map((s) => `<div style="margin:8px 0"><b class="display">${esc(s.name)}</b> <span class="dim">— ${esc(s.sub)}</span><div class="dim" style="font-size:13px">${esc(s.desc)}</div></div>`).join('')}</div>`;
  } else {
    const cats = [...new Set(DATA.carList.map((c) => c.category_folder))];
    const label = (c) => c.replace(/^\d+_/, '').replace(/_et_/g, ' & ').replace(/_/g, ' ');
    const list = DATA.carList.filter((c) => st.cat === 'all' || c.category_folder === st.cat);
    if (!soft) {
      rail.innerHTML = `<div class="filters"><button data-cat="all" class="${st.cat === 'all' ? 'on' : ''}">Tous (${DATA.carList.length})</button>${cats.map((c) => `<button data-cat="${c}" class="${st.cat === c ? 'on' : ''}">${esc(label(c))}</button>`).join('')}</div>` +
        list.map((c, i) => `<button class="carchip ${i === st.idx ? 'on' : ''}" data-i="${i}">${carArt(c.code, null, 'g' + c.code)}<b>${esc(c.alias)}</b><small class="mono">${esc(c.code)} · ${esc(c.ecurie)}</small></button>`).join('');
      $$('.filters button', rail).forEach((b) => b.onclick = () => { st.cat = b.dataset.cat; st.idx = 0; draw(); });
      $$('.carchip', rail).forEach((b) => b.onclick = () => { st.idx = Number(b.dataset.i); $$('.carchip', rail).forEach((x) => x.classList.toggle('on', x === b)); showCar(list[st.idx]); });
    }
    showCar(list[st.idx]);
    function showCar(c) {
      if (!c) { info.innerHTML = ''; return; }
      info.innerHTML = `<div class="panel deco"><div class="h2">${esc(c.code)} · ${esc(label(c.category_folder))}</div>${carArt(c.code, null, 'big')}<h2 class="display foil" style="margin-top:8px">${esc(c.alias)}</h2><div class="dim">${esc(c.real_name)} — ${esc(c.ecurie)}</div>
        <div class="qt">« ${esc(c.citation)} »</div><div class="dim" style="margin-bottom:12px">${esc(c.lore)}</div>${statBars(c, 5)}
        <div class="dim" style="margin-top:12px;font-size:14px">Voie préférée : ${esc(c.voie_preferee)} · Poids : ${esc(c.poids_estime)}</div></div>`;
    }
  }
}
