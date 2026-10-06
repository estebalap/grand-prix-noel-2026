/* Écran de lancement : choix du type de soirée + du mode, puis ouverture du plateau TV. */
import { findRelay, loadData, connect, onState, store, admin, DATA, relayBase, asset, esc, $, $$ } from '../shared/core.js';
import { icon } from '../shared/icons.js';
import { qrSvg } from '../shared/qr.js';
import { startAtmosphere } from '../shared/fx.js';
import { applyTheme, themeOf } from '../shared/themes.js';
import * as snd from '../shared/audio.js';
import { createPlaylistPlayer } from '../shared/playlist.js';

const atmo = startAtmosphere({ road: true, snow: 1, aurora: 1, theme: 'gp_bets' });
atmo.setSpeed(0.35);

const sel = { format: null, mode: null, modeTouched: false };
let musicOn = false;
const music = createPlaylistPlayer({ relayBase });
music.setEnabled(false);
let ready = false;

const fmtOf = (id) => (DATA.rules.formats || []).find((f) => f.id === id);
const modeOf = (id) => DATA.rules.modes.find((m) => m.id === id);

async function boot() {
  $('#offline').classList.add('hide'); $('#main').classList.add('hide');
  const info = await findRelay();
  if (!info) { $('#offline').classList.remove('hide'); return; }
  await loadData();
  snd.loadBank(asset('sounds/manifest.json'));
  music.refreshLibrary().then(() => { if (ready) previewTheme(); });
  await admin.tryLocalPin();
  connect('tv');
  onState(onSnapshot);
  $('#main').classList.remove('hide');
  const s = store.state;
  if (s) initFromState(s);
  setLinks();
}

function setLinks() {
  const b = relayBase();
  $('#lReg').href = b + '/regie/'; $('#lPit2').href = b + '/pit/'; $('#lTv').href = b + '/tv/';
}

function initFromState(s) {
  if (ready) return;
  ready = true;
  sel.format = s.format || 'show';
  sel.mode = s.mode || 'gp_bets';
  renderCards(); renderSummary();
}

function onSnapshot(s) {
  initFromState(s);
  renderJoin(s);
  const started = (s.heats || []).length > 0 || Object.values(s.players).some((p) => p.coins !== DATA.rules.rules.startCoins);
  $('#resetRow').classList.toggle('hide', !started);
  if (started) $('#resetInfo').textContent = `${(s.heats || []).length} manche(s) déjà jouée(s) : cochez pour effacer points et pièces.`;
  $('#pinRow').classList.toggle('hide', !!admin.pin);
}

function renderCards() {
  $('#formats').innerHTML = DATA.rules.formats.map((f) => `
    <button class="card ${sel.format === f.id ? 'on' : ''}" data-f="${f.id}" aria-pressed="${sel.format === f.id}">
      ${f.id === 'show' ? '<span class="pill rec">Soirée du 23</span>' : ''}
      <span class="ic">${icon(f.icon, 30)}</span>
      <h3>${esc(f.name)}</h3>
      <div class="meta"><span class="pill">${esc(f.duration)}</span><span class="pill">${esc(f.players)}</span></div>
      <p>${esc(f.blurb)}</p>
      <ol>${f.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    </button>`).join('');
  $('#modes').innerHTML = DATA.rules.modes.map((m) => `
    <button class="card ${sel.mode === m.id ? 'on' : ''}" data-m="${m.id}" aria-pressed="${sel.mode === m.id}">
      <span class="ic">${icon(m.icon || 'flag', 30)}</span>
      <h3>${esc(m.name)}</h3>
      <p>${esc(m.blurb)}</p>
      <div class="tags">
        <span class="pill">${m.betting ? 'Paris' : 'Sans paris'}</span>
        <span class="pill">${m.traps ? 'Pièges' : 'Sans pièges'}</span>
        ${m.unlimited ? '<span class="pill">Illimité</span>' : ''}
      </div>
    </button>`).join('');
  $$('#formats .card').forEach((b) => b.onclick = () => {
    snd.play('ui.decide');
    sel.format = b.dataset.f;
    if (!sel.modeTouched) sel.mode = fmtOf(sel.format).suggestedMode;
    renderCards(); renderSummary();
  });
  $$('#modes .card').forEach((b) => b.onclick = () => { sel.mode = b.dataset.m; sel.modeTouched = true; renderCards(); renderSummary(); snd.setSoundMode(sel.mode); snd.play('mode', { fallback: 'reveal' }); });
  $$('.card').forEach((b) => b.onpointerenter = () => snd.play('ui.select', { gain: 0.45 }));
  previewTheme();
}

function previewTheme() {
  const m = modeOf(sel.mode), th = themeOf(sel.mode);
  applyTheme(sel.mode); atmo.setTheme(sel.mode); atmo.setSpeed(th.speed); snd.setSoundMode(sel.mode);
  if (musicOn) music.setMode(sel.mode, { youtube: (store.state && store.state.music && store.state.music.youtube || {})[sel.mode] || null, synth: th.music });
  const box = $('#preview'); box.classList.remove('hide');
  box.innerHTML = `<div class="pv-h"><span class="pv-ic">${icon(m.icon, 44)}</span><div><span class="eyebrow">${esc(m.type || '')}</span><h3 class="foil">${esc(m.name)}</h3><p>${esc(th.tagline)}</p></div>
    <button class="btn ghost sm" id="pvMusic">${musicOn ? '♪ Couper la musique' : '♪ Écouter l\'ambiance'}</button></div>
    <p class="pv-music">${music.countFor(sel.mode) ? `♪ Playlist : ${music.countFor(sel.mode)} morceau(x) dans <b>Musique/${esc((DATA.rules.musicFolders || {})[sel.mode] || '')}</b>` : ((store.state && store.state.music && store.state.music.youtube || {})[sel.mode] ? '♪ Playlist YouTube associée à ce mode' : `♪ Aucune playlist : musique de synthèse. Ajoutez vos fichiers dans <b>Musique/${esc((DATA.rules.musicFolders || {})[sel.mode] || '')}</b>`)}</p>
    <ul class="pv-r">${m.rules.map((r) => `<li><span>${esc(r.icon)}</span>${esc(r.text)}</li>`).join('')}</ul>`;
  $('#pvMusic').onclick = () => { musicOn = !musicOn; snd.unlock(); music.setEnabled(musicOn); music.unlock(); previewTheme(); };
}

function renderSummary() {
  const f = fmtOf(sel.format), m = modeOf(sel.mode), r = DATA.rules.rules;
  $('#summary').innerHTML = `<span class="eyebrow">Votre soirée</span>
    <h3 class="foil">${esc(f.name)}</h3>
    <p>${esc(f.duration)} · ${esc(f.players)}</p>
    <p>Mode de départ : <b>${esc(m.name)}</b></p>
    <div class="pills"><span class="pill">${r.startCoins} pièces au départ</span><span class="pill">Bourse ${r.betWindowSec} s</span><span class="pill">Points ${((store.state && store.state.voies) === 4 ? r.heatPoints : (r.heatPoints5 || r.heatPoints)).join(' · ')}</span></div>`;
}

function renderJoin(s) {
  const url = ((s.urls && (s.urls.public || s.urls.local)) || relayBase()).replace(/\/$/, '') + '/pit/';
  const n = Object.values(s.players).filter((p) => p.claimed).length;
  const key = url + '|' + n + '|' + s.code;
  if ($('#join').dataset.k === key) return;
  $('#join').dataset.k = key;
  $('#join').innerHTML = `<div class="qr">${qrSvg(url, { dark: '#0b1030', round: 0.3 })}</div>
    <div class="u">${esc(url.replace(/^https?:\/\//, ''))}</div>
    <div class="c">Code salon <b>${esc(s.code)}</b> · ${n}/${Object.keys(s.players).length} écuries connectées</div>`;
}

async function launch(free = false) {
  const btn = free ? $('#skip') : $('#go'), msg = $('#msg'), label = btn.textContent;
  msg.className = 'msg'; msg.textContent = '';
  const pinIn = $('#pinIn');
  if (pinIn && pinIn.value.trim()) admin.setPin(pinIn.value);
  if (!admin.pin) { $('#pinRow').classList.remove('hide'); msg.className = 'msg err'; msg.textContent = 'Entrez le code régie affiché dans la console du relais.'; return; }
  btn.disabled = true; btn.textContent = 'Ouverture…'; music.stop(); snd.musicStop(); snd.play('start');
  try {
    if ($('#resetBox').checked) await admin.cmd('state.reset', { confirm: 'RESET' });
    await admin.cmd('format.set', { format: sel.format });
    await admin.cmd('mode.set', { mode: sel.mode });
    if (free) await admin.cmd('skip.enable', {});
    location.href = relayBase() + '/tv/' + (!$('#introRow').classList.contains('hide') && $('#introBox').checked ? '?intro=1' : '');
  } catch (e) {
    btn.disabled = false; btn.textContent = label;
    msg.className = 'msg err';
    msg.textContent = e.code === 'bad_pin' ? 'Code régie incorrect.' : (e.message || 'Erreur');
    if (e.code === 'bad_pin') { admin.setPin(''); $('#pinRow').classList.remove('hide'); }
  }
}

$('#go').onclick = () => launch(false);
$('#skip').onclick = () => launch(true);
$('#retry').onclick = boot;
// intro disponible ? (web/videos/intro_grand_prix.mp4) : propose de l'enchaîner à l'ouverture du plateau
fetch(relayBase() + '/api/v2/videos', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((v) => { if (v && v.intro) $('#introRow').classList.remove('hide'); }).catch(() => {});
boot();
