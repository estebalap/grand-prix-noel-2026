/* Pocket Pit — l'application smartphone des invités. Une seule page, adaptative selon la phase de l'émission. */
import {
  $, $$, h, esc, DATA, store, player, qs, LS, now, fmtOdds, LANE_COLORS, ranking, car, team, weatherOf, modeOf,
  findRelay, setRelay, relayBase, loadData, connect, asset, onState, onFx, onStatus, clamp,
} from '../shared/core.js';
import { icon } from '../shared/icons.js';
import { startAtmosphere, confetti } from '../shared/fx.js';
import * as snd from '../shared/audio.js';
import { applyTheme, themeOf } from '../shared/themes.js';
import { medal, carArt, statBars, teamAccent } from '../shared/ui.js';

const main = $('#main'), top = $('#top'), tabs = $('#tabs'), sheet = $('#sheet');
const atmo = startAtmosphere({ road: false, snow: 0.7, aurora: 0.9, theme: 'gp_bets' });
let curMode = null, musicOn = LS.get('gp.pitmusic', '0') === '1';
const ui = { dead: null, tab: 'ecurie', code: '', betKind: 'win', betLane: null, amount: 10, shopItem: null, tapLane: null, taps: 0, pending: 0, busy: false, lastCoins: null, drafted: 0 };
let S = null, lastKey = '', me = null;

/* ---------------------------------------------------------------- utilitaires UI */
function toast(msg, kind = '') {
  const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}
function floatText(text, color = '#ffd36a') {
  const f = h(`<div class="fx-float" style="color:${color};left:${30 + Math.random() * 50}vw;top:${40 + Math.random() * 20}vh">${esc(text)}</div>`);
  document.body.appendChild(f); setTimeout(() => f.remove(), 1500);
}
async function act(fn, okMsg) {
  if (ui.busy) return null;
  ui.busy = true;
  try { const r = await fn(); if (okMsg) toast(okMsg, 'win'); return r; }
  catch (e) {
    snd.play('ui.error', { fallback: 'error' }); snd.buzz([30, 40, 30]);
    if (e.code === 'unauthorized') { player.forget(); location.reload(); return null; }
    toast(e.message || 'Oups, réessaie', 'err'); return null;
  } finally { ui.busy = false; }
}
const COIN = icon('coin', 18, 'coin');
const heat = () => S.heat;
const myPlayer = () => S.players[me];
const myLane = () => S.heat.lanes.findIndex((l) => l && l.teamId === me);

/* ---------------------------------------------------------------- démarrage */
async function boot() {
  snd.setMuted(false);
  let info = await findRelay();
  if (!info) { renderNoRelay(); return; }
  await loadData();
  me = player.teamId;
  if (qs.get('reset')) { player.forget(); me = null; }
  if (!player.token || !me) { renderPicker(); return; }
  start();
}
function renderNoRelay() {
  top.innerHTML = ''; tabs.innerHTML = '';
  main.innerHTML = `<div class="hero"><b class="eyebrow">Pocket Pit</b><h1 class="display foil">Circuit introuvable</h1><p class="dim">Scanne le QR code affiché sur la télé, ou colle ici l'adresse du relais donnée par l'organisateur.</p></div>
    <div class="card deco"><input class="fld" id="rl" style="font-size:17px;letter-spacing:.02em;text-transform:none" placeholder="https://… ou http://192.168…:8100"><p></p><button class="btn full" id="rlOk">Se connecter</button></div>`;
  $('#rlOk').onclick = async () => { const i = await setRelay($('#rl').value); if (i) location.reload(); else toast('Aucun relais à cette adresse', 'err'); };
}

/* ---------------------------------------------------------------- choix d'écurie */
function renderPicker() {
  top.innerHTML = ''; tabs.innerHTML = '';
  connect('pit');                                         // flux anonyme : pour voir quelles écuries sont prises
  // QR code d'écurie imprimé (…/pit/?ecurie=N) : la fiche de l'écurie s'ouvre directement, un tap pour confirmer
  const pre = Number(qs.get('ecurie') || qs.get('team') || 0);
  let preDone = !(pre >= 1 && DATA.teams.some((t) => t.id === pre));
  onState((s) => {
    if (player.token) return;
    drawPicker(s);
    if (!preDone) { preDone = true; confirmTeam(pre, s); }
  });
  main.innerHTML = '<div class="hero"><b class="eyebrow">Bienvenue au</b><h1 class="display foil">Grand Prix<br>de Noël</h1><p class="dim">Choisis ton écurie</p></div><div id="pk"></div>';
}
function drawPicker(s) {
  const el = $('#pk'); if (!el) return;
  el.innerHTML = '<div class="teamlist">' + DATA.teams.map((t) => {
    const taken = s.players[t.id]?.claimed && s.online.includes(t.id);
    return `<button class="tcard ${taken ? 'taken' : ''}" data-t="${t.id}">${medal(t.id, 86)}<span class="nm">${esc(t.nickname)}</span></button>`;
  }).join('') + '</div>';
  $$('.tcard', el).forEach((b) => b.onclick = () => confirmTeam(Number(b.dataset.t), s));
}
function confirmTeam(id, s) {
  const t = team(id);
  const taken = s.players[id]?.claimed && s.online.includes(id);
  openSheet(`<div class="center">${medal(id, 150)}
    <h2 class="big foil" style="margin-top:14px">${esc(t.name)}</h2>
    <div class="dim" style="margin-top:4px">${esc(t.pilot)} · alias « ${esc(t.nickname)} »</div>
    <div class="quote">« ${esc(t.quote)} »</div><div class="dim small">${esc(t.specialty)}</div>
    ${taken ? '<p class="small" style="color:#ffb3bd">Cette écurie est déjà connectée sur un autre téléphone.</p>' : ''}
    <p></p><button class="btn full lg" id="yes">${taken ? 'Reprendre la main' : "C'est mon écurie !"}</button>
    <p></p><button class="btn ghost full" id="no">Retour</button></div>`);
  $('#no').onclick = closeSheet;
  $('#yes').onclick = async () => {
    snd.unlock();
    const r = await act(() => player.claim(id, taken));
    if (r) { closeSheet(); if (!snd.teamSound(id, 'join')) snd.sfx('join'); setTimeout(() => location.reload(), 900); }
  };
}
function openSheet(html) { sheet.innerHTML = `<div class="in">${html}</div>`; sheet.classList.remove('hide'); sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); }; }
function closeSheet() { sheet.classList.add('hide'); sheet.innerHTML = ''; }

/* ---------------------------------------------------------------- application */
function start() {
  // banque de sons : à côté de la page, sinon sur le PC de la régie (site publié sans les sons + tunnel)
  snd.loadBank(asset('sounds/manifest.json'))
    .then((ok) => ok || (relayBase() ? snd.loadBank(relayBase() + '/sounds/manifest.json') : false))
    .then((ok) => { if (ok) snd.preloadTeams([String(me)]); });
  // petits sons d'interface façon console : chaque bouton répond
  main.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) snd.play(b.classList.contains('ghost') ? 'ui.select' : 'ui.decide', { gain: 0.6 }); }, true);
  tabs.addEventListener('pointerdown', () => snd.play('ui.page', { gain: 0.6 }), true);
  onState(handleState);
  onFx(handleFx);
  onStatus((on) => $('#net').classList.toggle('hide', on));
  connect('pit', player.token);
  addEventListener('pointerdown', () => snd.unlock(), { once: true });
  setInterval(frame, 200);
  setInterval(flushTaps, 220);
}

function setMode(id) {
  const first = curMode === null;
  curMode = id;
  const th = applyTheme(id);
  atmo.setTheme(id); atmo.setSpeed(th.speed * 0.6);
  snd.setSoundMode(id);
  if (musicOn) snd.musicStart(th.music);
  if (!first) { const m = modeOf(id); if (m) { snd.play('mode', { fallback: 'reveal' }); snd.buzz(30); openModeSheet(m); } }
}
function openModeSheet(m) {
  const th = themeOf(m.id);
  openSheet(`<div class="center"><div style="color:var(--gold-2)">${icon(m.icon, 64)}</div><span class="eyebrow">${esc(m.type || '')}</span><h2 class="display foil" style="margin:4px 0">${esc(m.name)}</h2><p class="dim small">${esc(th.tagline)}</p></div>
    <ul class="rl">${(m.rules || []).map((r) => `<li><span>${esc(r.icon)}</span><div>${esc(r.text)}</div></li>`).join('')}</ul>
    ${m.tip ? `<p class="small" style="color:var(--gold-1);font-style:italic">${esc(m.tip)}</p>` : ''}
    <button class="btn ghost" id="pitMusic" style="width:100%;margin:6px 0">${musicOn ? 'Couper la musique d\'ambiance' : 'Activer la musique d\'ambiance'}</button>
    <button class="btn" id="shClose" style="width:100%">Compris</button>`);
  $('#shClose').onclick = closeSheet;
  $('#pitMusic').onclick = () => {
    musicOn = !musicOn; LS.set('gp.pitmusic', musicOn ? '1' : '0'); snd.unlock(); snd.setMusicOn(musicOn);
    if (musicOn) snd.musicStart(themeOf(curMode).music);
    $('#pitMusic').textContent = musicOn ? 'Couper la musique d\'ambiance' : 'Activer la musique d\'ambiance';
  };
}

function handleState(s) {
  S = s;
  if (s.mode !== curMode) setMode(s.mode);
  const dead = (s.eliminated || []).includes(me);
  if (ui.dead === false && dead) { snd.play('elim'); snd.buzz([200, 80, 200]); }
  ui.dead = dead;
  if (!s.players[me]?.claimed && player.token) { /* session perdue côté serveur : on se ré-annonce silencieusement */ player.claim(me, false).catch(() => {}); }
  drawTop(s); drawTabs();
  const p = s.players[me];
  if (ui.lastCoins !== null && p) {
    const d = p.coins - ui.lastCoins;
    if (d !== 0) { const el = $('.purse'); if (el) { el.classList.remove('bump', 'lost'); void el.offsetWidth; el.classList.add(d > 0 ? 'bump' : 'lost'); } if (d > 0 && d !== 100) { floatText('+' + d, '#ffd36a'); snd.sfx('coin'); } }
  }
  if (p) ui.lastCoins = p.coins;
  if (ui.autoPhase !== s.phase) { ui.autoPhase = s.phase; if (ui.tab === 'ecurie' && ['GRID', 'BETTING', 'COUNTDOWN', 'RACING', 'RESULT'].includes(s.phase)) ui.tab = 'piste'; drawTabs(); }
  const key = viewKey(s) + '|' + (s.eliminated || []).join('.');
  if (key !== lastKey) { lastKey = key; const sc = main.scrollTop; render(s); main.scrollTop = ui.tab === prevTab ? sc : 0; prevTab = ui.tab; }
}
let prevTab = 'piste';

function viewKey(s) {
  const hh = s.heat, p = s.players[me] || { paddock: [], coins: 0 };
  const myBets = hh.bets.filter((b) => b.teamId === me).length, myTraps = hh.traps.filter((t) => t.teamId === me).length;
  const base = `${ui.tab}|${s.phase}|${s.mode}`;
  if (ui.tab === 'ecurie') return `${base}|${ranking(s).map((r) => r.id + ':' + r.points).join(',')}|${p.paddock.join(',')}|${p.coins}|${hh.n}|${hh.status}|${hh.lanes.map((l) => l ? l.code : '-').join(',')}|${myBets}`;
  if (ui.tab === 'paddock') return `${base}|${p.paddock.join(',')}|${p.coins}`;
  if (ui.tab === 'classement') return `${base}|${ranking(s).map((r) => r.id + ':' + r.points + ':' + r.coins).join(',')}`;
  switch (s.phase) {
    case 'LOBBY': return `${base}|${s.online.length}`;
    case 'DRAFT': return `${base}|${p.paddock.length}`;
    case 'GRID': case 'BETTING': case 'COUNTDOWN': case 'RACING':
      return `${base}|${hh.n}|${hh.status}|${hh.weather}|${hh.chaos}|${hh.gridRevealed}|${hh.lanes.map((l) => l ? l.code : '-').join(',')}|${JSON.stringify(hh.odds)}|${myBets}|${myTraps}|${p.coins}|${ui.betLane}|${ui.betKind}|${ui.shopItem}|${ui.tapLane}`;
    case 'RESULT': case 'INTERVIEW': return `${base}|${hh.n}|${hh.result ? 1 : 0}|${p.coins}|${JSON.stringify(s.votes)}`;
    case 'STANDINGS': return `${base}|${ranking(s).map((r) => r.id + ':' + r.points).join(',')}|${JSON.stringify(s.votes)}`;
    case 'CEREMONY': return `${base}|${s.ceremony ? s.ceremony.revealed : -1}|${JSON.stringify(s.votes)}`;
    default: return `${base}|${JSON.stringify(s.votes)}`;
  }
}

function drawTop(s) {
  const t = team(me), p = s.players[me];
  const html = `${medal(me, 46)}<div class="who"><b>${esc(t.nickname)}</b><small>${esc(t.name)}</small></div><button class="modechip" id="modeChip" aria-label="Règles du mode">${icon((modeOf(s.mode) || {}).icon || 'flag', 20)}<span>${esc((modeOf(s.mode) || {}).name || '')}</span></button><div class="purse">${icon('coin', 22, 'coin')}<span>${p ? p.coins : 0}</span></div>`;
  if (top.dataset.k !== html) { const bump = top.querySelector('.purse'); top.dataset.k = html; top.innerHTML = html; if (bump) { /* animation gérée dans handleState */ } const mc = $('#modeChip'); if (mc) mc.onclick = () => openModeSheet(modeOf(S.mode)); }
}
function drawTabs() {
  const T = [['ecurie', 'people', 'Écurie'], ['piste', 'flag', 'Piste'], ['paddock', 'car', 'Paddock'], ['classement', 'trophy', 'Classement']];
  const html = T.map(([id, ic, l]) => `<button data-tab="${id}" class="${ui.tab === id ? 'on' : ''}">${icon(ic, 24)}${l}</button>`).join('');
  if (tabs.dataset.k !== html) { tabs.dataset.k = html; tabs.innerHTML = html; $$('button', tabs).forEach((b) => b.onclick = () => { ui.tab = b.dataset.tab; lastKey = ''; handleState(S); }); }
}

/* ---------------------------------------------------------------- aiguillage */
function render(s) {
  atmo.setSpeed(themeOf(s.mode).speed * 0.6);
  renderView(s);
  if ((s.eliminated || []).includes(me) && (ui.tab === 'piste' || ui.tab === 'ecurie')) main.insertAdjacentHTML('afterbegin', `<div class="card elim">${icon('skull', 34)}<div><b>Éliminé !</b><div class="small dim">Tu restes en tribune : paris et taunts restent ouverts.</div></div></div>`);
}
function renderView(s) {
  if (ui.tab === 'ecurie') return renderEcurie(s);
  if (ui.tab === 'paddock') return renderPaddock(s);
  if (ui.tab === 'classement') return renderStandings(s);
  switch (s.phase) {
    case 'LOBBY': return renderLobby(s);
    case 'DRAFT': return renderDraft(s);
    case 'GRID': case 'BETTING': return renderBetting(s);
    case 'COUNTDOWN': case 'RACING': return renderRace(s);
    case 'RESULT': case 'INTERVIEW': return renderResult(s);
    case 'STANDINGS': return renderStandings(s, true);
    case 'INTERMISSION': return renderIntermission(s);
    case 'CEREMONY': return renderCeremony(s);
    default: return renderLobby(s);
  }
}

function weatherCard(s) {
  const hh = s.heat, w = weatherOf(hh.weather);
  const ch = hh.chaos != null ? DATA.rules.chaos[hh.chaos] : null;
  return `<div class="card deco"><div class="wx">${icon(w.icon, 40)}<div><div class="h2" style="margin:0">Météo du Circuit</div><b>${esc(w.name)}</b><div class="dim small">${esc(w.effect)}</div></div></div>
    ${ch ? `<hr style="border:0;border-top:1px solid var(--hair);margin:12px 0"><div class="h2" style="color:var(--red);margin-bottom:4px">Carte Chaos</div><b>${esc(ch.title)}</b><div class="dim small">${esc(ch.desc)}</div>` : ''}</div>`;
}

/* ---------------------------------------------------------------- LOBBY */
function renderLobby(s) {
  const t = team(me);
  main.innerHTML = `<div class="card deco center">${medal(me, 130)}<h2 class="big foil" style="margin-top:14px">${esc(t.name)}</h2>
    <div class="dim" style="margin-top:4px">Pilote : ${esc(t.pilot)}</div><div class="quote">« ${esc(t.quote)} »</div><div class="dim small">${esc(t.specialty)}</div></div>
    <div class="card deco center"><div class="h2">Le salon se remplit</div><div class="big foil">${s.online.length} <span class="dim" style="font-size:18px">/ ${DATA.teams.length}</span></div>
    <div class="dim small" style="margin-top:6px">Garde ton téléphone allumé : le Draft va commencer.</div></div>${tauntCard(s)}`;
  bindTaunts();
}

/* ---------------------------------------------------------------- DRAFT */
function renderDraft(s) {
  const p = s.players[me], size = DATA.rules.rules.paddockSize;
  main.innerHTML = `<div class="card deco"><div class="h2">Le Draft</div><p class="dim small" style="margin:0 0 10px">Gratte la gommette de ta voiture et tape son code (ex : B07, FR02, F03) pour la révéler à toute la salle.</p>
    <input class="fld" id="code" maxlength="8" placeholder="CODE" autocomplete="off" autocapitalize="characters" value="${esc(ui.code)}"><p></p>
    <button class="btn full lg" id="go" ${p.paddock.length >= size ? 'disabled' : ''}>Révéler mon bolide</button>
    <div class="dim small center" style="margin-top:8px">${p.paddock.length} / ${size} bolides dans ton paddock</div></div>
    <div class="slotgrid">${Array.from({ length: size }, (_, i) => `<div class="slotc ${p.paddock[i] ? 'f' : ''}">${esc(p.paddock[i] || (i + 1))}</div>`).join('')}</div>
    ${p.paddock.length ? '<div class="h2">Mes bolides</div>' + p.paddock.map((c) => carCard(c)).join('') : ''}`;
  const inp = $('#code'); inp.oninput = () => { ui.code = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); inp.value = ui.code; };
  inp.onkeydown = (e) => { if (e.key === 'Enter') $('#go').click(); };
  $('#go').onclick = async () => {
    const code = ui.code.trim();
    if (!code) { toast('Entre le code de ta gommette', 'err'); return; }
    const r = await act(() => player.intent('draft.claim', { code }));
    if (r) { ui.code = ''; snd.sfx('reveal'); snd.buzz(40); confetti({ x: .5, y: .35, count: 70, power: .8 }); const c = car(code); if (c) toast('« ' + c.alias + ' » rejoint ton paddock !', 'win'); }
  };
}
function carCard(code) {
  const c = car(code); if (!c) return '';
  return `<div class="card deco carc">${carArt(code, me, 'pc' + code)}<div class="dim small mono">${esc(c.code)} · ${esc(c.ecurie)}</div><h3 class="foil">${esc(c.alias)}</h3><div class="qt">« ${esc(c.citation)} »</div>${statBars(c, 5)}<div class="dim small" style="margin-top:8px">${esc(c.lore)}</div></div>`;
}

/* ---------------------------------------------------------------- GRILLE + BOURSE + PIÈGES */
function laneBtn(i, l, selectable, sel) {
  const hh = heat();
  const lc = LANE_COLORS[i];
  if (!l) return '';
  const hidden = l.hidden || !l.code;
  const c = hidden ? null : car(l.code), t = l.teamId != null ? team(l.teamId) : null;
  const od = hh.odds ? hh.odds.win[i] : null;
  return `<button class="lane ${sel ? 'sel' : ''} ${l.teamId === me ? 'mine' : ''}" data-lane="${i}" style="--lc:${lc}" ${selectable ? '' : 'disabled'}>
    <span class="ln">${i + 1}</span><span><div class="al">${hidden ? 'Bolide masqué' : esc(c ? c.alias : l.code)}</div><div class="ow">${esc(t ? t.nickname : 'Fantôme')}${l.teamId === me ? ' · TOI' : ''}</div></span>
    <span class="od"><small>VICTOIRE</small>${od ? fmtOdds(od) : '–'}${hh.odds && hh.odds.pWin && !hidden ? `<i class="pc">${Math.round(hh.odds.pWin[i] * 100)} %</i>` : ''}</span></button>`;
}
function betLimits(s) {
  const hh = s.heat, p = s.players[me], mode = modeOf(s.mode);
  const w = weatherOf(hh.weather), ch = hh.chaos != null ? DATA.rules.chaos[hh.chaos] : null;
  const unlimited = mode.unlimited || w.unlimitedBets || (ch && ch.unlimitedBets);
  const staked = hh.bets.filter((b) => b.teamId === me).reduce((a, b) => a + b.amount, 0);
  const cap = unlimited ? p.coins : Math.min(p.coins, Math.floor((p.coins + staked) * DATA.rules.rules.betMaxPct / 100) - staked);
  return { unlimited, staked, max: Math.max(0, cap) };
}
function renderBetting(s) {
  const hh = s.heat, p = s.players[me], mode = modeOf(s.mode);
  if (hh.n === 0 || hh.status === 'idle') { main.innerHTML = `<div class="card deco center"><div class="h2">En attente de la grille</div><p class="dim">La régie tire les 4 bolides de la prochaine manche…</p></div>${tauntCard(s)}`; bindTaunts(); return; }
  const open = hh.betsOpen;
  const lim = betLimits(s);
  const myBets = hh.bets.filter((b) => b.teamId === me);
  if (ui.betLane == null || !hh.lanes[ui.betLane]) ui.betLane = hh.lanes.findIndex((l) => l);
  if (ui.amount > lim.max) ui.amount = Math.max(DATA.rules.rules.betMin, Math.min(lim.max, ui.amount));
  const canBet = open && mode.betting && lim.max >= DATA.rules.rules.betMin;
  const kinds = [['win', 'Victoire'], ['podium', 'Placé (top 2)'], ['crash', 'Crash']];
  const odd = hh.odds ? hh.odds[ui.betKind][ui.betLane] : 1;
  const blind = hh.weather === 'brouillard' && !hh.gridRevealed;
  const eff = odd ? (blind ? Math.round(odd * 15) / 10 : odd) : 1;
  const chips = [10, 25, 50].filter((v) => v <= lim.max);
  main.innerHTML = `
    <div class="card deco"><div class="row sp"><div><div class="h2" style="margin:0">Manche ${hh.n}</div><b>${esc(hh.kind === 'finale' ? 'Grande Finale' : hh.kind === 'demi' ? 'Demi-finale' : hh.kind === 'reliques' ? 'Coupe des Reliques' : 'Poule')}</b></div>
      <div style="text-align:right"><div class="h2" style="margin:0">${open ? 'Bourse ouverte' : hh.status === 'setup' ? 'Grille prête' : 'Bourse fermée'}</div><div class="tnum ${''}" id="tn" style="font-size:34px">${open ? '' : '—'}</div></div></div>
      <div class="timer ${open ? '' : 'hide'}"><i id="tb" style="width:100%"></i></div></div>
    ${weatherCard(s)}
    ${mode.betting ? `<div class="card deco"><div class="h2">Ta mise</div>
      <div id="lanes">${hh.lanes.map((l, i) => laneBtn(i, l, canBet, i === ui.betLane)).join('')}</div>
      <div class="seg">${kinds.map(([k, l]) => `<button data-kind="${k}" class="${ui.betKind === k ? 'on' : ''}">${l}<br><small style="opacity:.8">${hh.odds ? fmtOdds(hh.odds[k][ui.betLane] || 1) : ''}</small></button>`).join('')}</div>
      <div class="row sp small dim"><span>Cote ${fmtOdds(eff)}${blind ? ' (aveugle ×1,5)' : ''}</span><span>${lim.unlimited ? 'Plafond levé : TAPIS autorisé' : 'Max ' + lim.max + ' ' + COIN + ' (50 % du portefeuille)'}</span></div>
      <div class="chips">${chips.map((v) => `<button data-amt="${v}" class="${ui.amount === v ? 'on' : ''}">${v}</button>`).join('')}<button data-amt="max" class="${ui.amount === lim.max && lim.max > 0 && !chips.includes(lim.max) ? 'on' : ''}">${lim.unlimited ? 'TAPIS' : 'MAX'}</button></div>
      <input type="range" id="rng" min="${DATA.rules.rules.betMin}" max="${Math.max(DATA.rules.rules.betMin, lim.max)}" step="1" value="${clamp(ui.amount, DATA.rules.rules.betMin, Math.max(DATA.rules.rules.betMin, lim.max))}" ${canBet ? '' : 'disabled'}>
      <div class="row sp"><b class="big" id="amt" style="font-size:30px">${ui.amount} ${COIN}</b><span class="dim small">Gain potentiel : <b class="coin">${Math.round(ui.amount * eff)}</b></span></div><p></p>
      <button class="btn full lg" id="place" ${canBet ? '' : 'disabled'}>${open ? 'Placer la mise' : 'Bourse fermée'}</button>
      ${myBets.length ? '<div class="h2" style="margin-top:16px">Mes paris sur cette manche</div>' + myBets.map((b) => `<div class="mybet"><span>Voie ${b.lane + 1} · ${{ win: 'Victoire', podium: 'Placé', crash: 'Crash' }[b.kind]} (${fmtOdds(b.odds)})</span><b class="coin">${b.amount} ${COIN}</b></div>`).join('') : ''}</div>`
    : '<div class="card deco center"><div class="h2">Mode Pure Vitesse</div><p class="dim">Pas de paris ni de pièges : concentre-toi sur la piste !</p></div>'}
    ${mode.traps ? shopCard(s) : ''}
    ${tauntCard(s)}`;
  // liaisons
  $$('#lanes .lane', main).forEach((b) => b.onclick = () => { ui.betLane = Number(b.dataset.lane); lastKey = ''; handleState(S); });
  $$('[data-kind]', main).forEach((b) => b.onclick = () => { ui.betKind = b.dataset.kind; lastKey = ''; handleState(S); });
  $$('[data-amt]', main).forEach((b) => b.onclick = () => { ui.amount = b.dataset.amt === 'max' ? Math.max(DATA.rules.rules.betMin, lim.max) : Number(b.dataset.amt); lastKey = ''; handleState(S); });
  const rng = $('#rng'); if (rng) rng.oninput = () => { ui.amount = Number(rng.value); $('#amt').innerHTML = ui.amount + ' ' + COIN; };
  const pl = $('#place'); if (pl) pl.onclick = async () => {
    const r = await act(() => player.intent('bet', { kind: ui.betKind, lane: ui.betLane, amount: ui.amount }));
    if (r) { snd.play('bet', { fallback: 'coin' }); snd.buzz(30); toast(`Mise placée : ${ui.amount} pièces à ${fmtOdds(r.odds)}`, 'win'); }
  };
  bindShop(s); bindTaunts();
}

function shopCard(s) {
  const hh = s.heat, p = s.players[me];
  const canSetup = hh.status === 'setup' || hh.status === 'betting';
  const rk = ranking(s); const last = rk.length && rk[rk.length - 1].id === me;
  return `<div class="card deco"><div class="h2">La Boutique des Pièges</div>
    <div class="shop">${DATA.rules.shop.map((it) => {
      const dis = !canSetup || p.coins < it.price || (it.lastOnly && !last);
      return `<button class="item" data-item="${it.id}" ${dis ? 'disabled' : ''}>${icon(it.icon, 30)}<b>${esc(it.name)}</b><small>${esc(it.effect)}</small><span class="pr">${it.price} ${COIN}</span></button>`;
    }).join('')}</div>
    <div class="dim small" style="margin-top:10px">${canSetup ? 'Les pièges se posent avant le départ.' : 'La pose des pièges est fermée.'}</div></div>`;
}
function bindShop(s) {
  $$('.item', main).forEach((b) => b.onclick = () => {
    const it = DATA.rules.shop.find((x) => x.id === b.dataset.item);
    if (!it.needsLane) return buy(it, null);
    openSheet(`<div class="center"><div style="color:var(--gold-2)">${icon(it.icon, 54)}</div><h3 class="big foil">${esc(it.name)}</h3><p class="dim small">${esc(it.effect)}</p>
      <div class="h2">${it.id === 'champi' || it.id === 'carapace' ? 'Sur quelle voie ?' : 'Sur la voie de qui ?'}</div>
      ${s.heat.lanes.map((l, i) => l ? laneBtn(i, l, true, false) : '').join('')}<button class="btn ghost full" id="no">Annuler</button></div>`);
    $$('#sheet .lane').forEach((lb) => lb.onclick = () => { closeSheet(); buy(it, Number(lb.dataset.lane)); });
    $('#no').onclick = closeSheet;
  });
}
async function buy(it, lane) {
  const r = await act(() => player.intent('trap.buy', { item: it.id, lane }));
  if (r) { snd.sfx('trap'); snd.buzz([20, 30, 20]); toast(`${it.name} posé${lane != null ? ' sur la voie ' + (lane + 1) : ''} !`, 'win'); }
}

/* ---------------------------------------------------------------- COURSE : BOOST TAP */
function renderRace(s) {
  const hh = s.heat;
  atmo.setSpeed(hh.status === 'racing' ? 2 : 0.6);
  if (ui.tapLane == null || !hh.lanes[ui.tapLane]) {
    const mine = myLane(); const bet = hh.bets.find((b) => b.teamId === me);
    ui.tapLane = mine >= 0 ? mine : bet ? bet.lane : hh.lanes.findIndex((l) => l);
  }
  const l = hh.lanes[ui.tapLane], c = l && l.code ? car(l.code) : null;
  main.innerHTML = `<div class="card deco center"><div class="h2" id="rt">${hh.status === 'countdown' ? 'Tous au départ !' : 'Course en cours'}</div>
    <div class="dim small">Choisis ton camp, puis tape comme un fou : 1 pièce toutes les ${DATA.rules.rules.boostCoinsPerTaps} frappes si ta voie gagne (max ${DATA.rules.rules.boostCoinsMax}).</div></div>
    <div class="laneswitch">${[0, 1, 2, 3].map((i) => hh.lanes[i] ? `<button style="--lc:${LANE_COLORS[i]}" data-ln="${i}" class="${ui.tapLane === i ? 'on' : ''}">${i + 1}</button>` : '<span></span>').join('')}</div>
    <div class="center dim small">Tu soutiens : <b style="color:${LANE_COLORS[ui.tapLane]}">${esc(c ? c.alias : 'voie ' + (ui.tapLane + 1))}</b></div>
    <div class="tapzone"><button class="tapbtn" id="tap">TAPE !<small id="tapn">${ui.taps} frappes</small></button></div>
    <p></p>${tauntCard(s)}`;
  $$('[data-ln]', main).forEach((b) => b.onclick = () => { ui.tapLane = Number(b.dataset.ln); lastKey = ''; handleState(S); });
  const tb = $('#tap');
  const hit = (e) => { e.preventDefault(); if (S.heat.status !== 'racing' && S.heat.status !== 'countdown') return; ui.taps++; ui.pending++; tb.classList.add('press'); setTimeout(() => tb.classList.remove('press'), 60); $('#tapn').textContent = ui.taps + ' frappes'; snd.buzz(8); };
  tb.addEventListener('pointerdown', hit);
  bindTaunts();
}
function flushTaps() {
  if (!S || ui.pending <= 0 || !player.token) return;
  const n = Math.min(14, ui.pending); ui.pending -= n;
  player.intent('boost.tap', { lane: ui.tapLane, n }).catch(() => {});
}

/* ---------------------------------------------------------------- RÉSULTAT */
function voteCard(s) {
  const others = DATA.teams.filter((t) => t.id !== me);
  const mk = (award, title, sub) => `<div class="card deco"><div class="h2">${title}</div><div class="dim small" style="margin-bottom:10px">${sub}</div><div class="vote">${others.map((t) => `<button data-vote="${award}:${t.id}" class="${s.votes[award] && s.votes[award][me] === t.id ? 'on' : ''}">${medal(t.id, 52)}<span>${esc(t.nickname)}</span></button>`).join('')}</div></div>`;
  return mk('cascadeur', 'Vote : Trophée Cascadeur', 'Le crash de l\'année ! Qui a fait la plus belle cascade ?') + mk('cuillere', 'Vote : Cuillère de Bois', 'Fair-play et persévérance : qui mérite la cuillère ?');
}
function bindVotes() {
  $$('[data-vote]', main).forEach((b) => b.onclick = async () => {
    const [award, target] = b.dataset.vote.split(':');
    const r = await act(() => player.intent('vote', { award, target: Number(target) }));
    if (r) { snd.sfx('tick'); snd.buzz(15); toast('Vote enregistré', 'win'); }
  });
}
function renderResult(s) {
  const hh = s.heat, r = hh.result;
  if (!r) { main.innerHTML = '<div class="card deco center"><div class="h2">Résultat en cours de validation…</div></div>'; return; }
  const eff = r.effects;
  const mine = hh.bets.filter((b) => b.teamId === me);
  const staked = mine.reduce((a, b) => a + b.amount, 0);
  const gain = eff.coins[me] || 0;
  const net = gain - staked;
  const myL = myLane(); const myRank = myL >= 0 ? r.order.indexOf(myL) : -1;
  const lines = r.order.map((lane, rank) => {
    const l = hh.lanes[lane], c = car(l.code), t = l.teamId != null ? team(l.teamId) : null;
    const dnf = r.dnf.includes(lane);
    return `<div class="res"><span class="r">${dnf ? '✕' : rank + 1}</span>${t ? medal(t.id, 40) : ''}<div class="grow"><b style="text-transform:uppercase;font:700 14px var(--font-display)">${esc(c.alias)}</b><div class="dim small">${esc(t ? t.nickname : 'Fantôme')}${dnf ? ' · sorti de piste' : ''}</div></div><b class="coin">${dnf ? 0 : '+' + DATA.rules.rules.heatPoints[rank] + ' pts'}</b></div>`;
  }).join('');
  main.innerHTML = `
    <div class="card deco center"><div class="h2">Manche ${hh.n} · Résultat</div>
      ${myRank >= 0 ? `<div class="big foil" style="font-size:54px">${r.dnf.includes(myL) ? 'Dans le décor !' : myRank === 0 ? 'VICTOIRE !' : myRank + 1 + (myRank === 1 ? 'ème' : 'ème') + ' place'}</div>` : ''}
      <div class="row sp" style="margin-top:12px"><div><div class="dim small">Gains de manche</div><div class="big coin" style="font-size:28px">${gain >= 0 ? '+' : ''}${gain} ${COIN}</div></div>
      <div><div class="dim small">Mises</div><div class="big" style="font-size:28px">−${staked}</div></div><div><div class="dim small">Bilan</div><div class="big" style="font-size:28px;color:${net >= 0 ? 'var(--pine)' : '#ff8b9a'}">${net >= 0 ? '+' : ''}${net}</div></div></div>
      ${mine.length ? '<div style="margin-top:12px;text-align:left">' + mine.map((b) => { const e = eff.bets.find((x) => x.id === b.id); return `<div class="mybet"><span>Voie ${b.lane + 1} · ${{ win: 'Victoire', podium: 'Placé', crash: 'Crash' }[b.kind]} · ${b.amount} ${COIN}</span><b style="color:${e && e.result === 'won' ? 'var(--pine)' : '#ff8b9a'}">${e && e.result === 'won' ? '+' + e.payout : 'perdu'}</b></div>`; }).join('') + '</div>' : ''}</div>
    <div class="card deco"><div class="h2">Arrivée</div>${lines}</div>
    ${s.phase === 'INTERVIEW' && r.interview ? `<div class="card deco"><div class="h2">Au micro</div>${r.interview.map((l) => `<p style="margin:6px 0"><b class="dim small">${esc(l.who)}</b><br>${esc(l.text)}</p>`).join('')}</div>` : ''}
    ${myPlayer().coins <= 0 ? bailoutCard(s) : ''}
    ${tauntCard(s)}`;
  if (myRank === 0 && !r.dnf.includes(myL)) { confetti({ x: .5, y: .3, count: 120 }); if (!snd.teamSound(me, 'win')) snd.sfx('win'); snd.buzz([60, 40, 60, 40, 120]); }
  bindBailout(); bindTaunts();
}
function bailoutCard(s) {
  const asked = s.bailouts.includes(me);
  return `<div class="card deco center"><div class="h2">Tu es ruiné !</div><p class="dim small">Le « Crédit Papy de Solidarité » te verse ${DATA.rules.rules.bailoutCoins} pièces si la régie accepte.</p><button class="btn full" id="bail" ${asked ? 'disabled' : ''}>${asked ? 'Demande envoyée…' : 'Appeler Papy'}</button></div>`;
}
function bindBailout() { const b = $('#bail'); if (b) b.onclick = () => act(() => player.intent('bailout', {}), 'Papy est prévenu !'); }

/* ---------------------------------------------------------------- CLASSEMENT */
function renderStandings(s, withVotes = false) {
  const rk = ranking(s);
  main.innerHTML = `<div class="card deco"><div class="h2">Classement général</div>${rk.map((r, i) => {
    const t = team(r.id);
    return `<div class="rk ${r.id === me ? 'me' : ''} ${i === 0 ? 't1' : ''}"><span class="n">${i === 0 && r.points > 0 ? icon('crown', 22) : i + 1}</span>${medal(r.id, 42)}<div style="min-width:0"><div class="nm">${(s.eliminated || []).includes(r.id) ? icon('skull', 16) + ' ' : ''}${esc(t.nickname)}</div><div class="sb">${r.wins} vict. · ${r.podiums} podiums · ${r.coins} ${COIN}</div></div><span class="pt">${r.points}</span></div>`;
  }).join('')}</div>${withVotes ? voteCard(s) : ''}`;
  bindVotes();
}

/* ---------------------------------------------------------------- ÉCURIE (accueil centré sur mon équipe) */
function renderEcurie(s) {
  const t = team(me), p = s.players[me], hh = s.heat, rk = ranking(s);
  const pos = rk.findIndex((r) => r.id === me) + 1, st = s.standings.teams[me] || { points: 0, wins: 0, podiums: 0 };
  const m = modeOf(s.mode) || {};
  const lane = hh.lanes.findIndex((l) => l && l.teamId === me);
  const myBets = hh.bets.filter((b) => b.teamId === me), staked = myBets.reduce((a, b) => a + b.amount, 0);
  const dead = (s.eliminated || []).includes(me);
  const nextLine = {
    LOBBY: 'Le salon se remplit. Reste là, la soirée va démarrer.', DRAFT: 'Draft : entre les codes gommette de tes bolides dans l\'onglet Paddock.',
    GRID: 'La grille est posée : regarde la TV.', BETTING: 'La Bourse est ouverte : va dans Piste pour miser !', COUNTDOWN: 'Départ imminent…',
    RACING: 'Course en cours : tape sur ton bolide dans Piste !', RESULT: 'Résultat de la manche à la TV.', STANDINGS: 'Classement à la TV, vote dans Classement.',
    INTERMISSION: 'Entracte : vote pour tes prix spéciaux.', CEREMONY: 'Cérémonie des trophées !',
  }[s.phase] || '';
  const laneCar = lane >= 0 ? car(hh.lanes[lane].code) : null;
  main.innerHTML = `<div class="card deco eco" style="--tc:${teamAccent(me)}">
      <div class="eco-h">${medal(me, 84)}<div><span class="eyebrow">Mon écurie</span><h2 class="display foil" style="margin:2px 0;font-size:24px;line-height:1.05">${esc(t.name)}</h2><div class="dim small">Pilote ${esc(t.pilot)} · « ${esc(t.nickname)} »</div></div></div>
      <p class="eco-q">« ${esc(t.quote)} »</p><div class="eco-sp">${esc(t.specialty)}</div></div>
    <div class="eco-tiles">
      <div><small>RANG</small><b>${dead ? icon('skull', 26) : (pos === 1 && st.points > 0 ? icon('crown', 26) : pos)}</b><i>/ ${rk.length}</i></div>
      <div><small>POINTS</small><b>${st.points}</b><i>${st.wins} vict. · ${st.podiums} pod.</i></div>
      <div><small>PIÈCES</small><b>${p.coins}</b><i>${staked ? staked + ' misées' : 'disponibles'}</i></div>
    </div>
    <div class="card deco"><div class="h2">Prochaine étape</div><p style="margin:0">${esc(nextLine)}</p></div>
    ${lane >= 0 && laneCar ? `<div class="card deco"><div class="h2">Ma voie · n°${lane + 1}</div><div class="row sp"><b>${esc(laneCar.alias)}</b><span class="dim small">${esc(m.name || '')}</span></div>${carArt(laneCar.code, me, 'eco' + laneCar.code)}</div>` : ''}
    ${myBets.length ? `<div class="card deco"><div class="h2">Mes paris de la manche</div>${myBets.map((b) => `<div class="row sp small"><span>${{ win: 'Victoire', podium: 'Placé', crash: 'Crash' }[b.kind]} · voie ${b.lane + 1}</span><b>${b.amount} ${COIN}</b></div>`).join('')}</div>` : ''}
    <div class="card deco"><div class="h2">Mon paddock</div><div class="slotgrid">${Array.from({ length: DATA.rules.rules.paddockSize }, (_, i) => `<div class="slotc ${p.paddock[i] ? 'f' : ''}">${esc(p.paddock[i] || (i + 1))}</div>`).join('')}</div></div>
    <div class="row sp"><button class="btn ghost" id="ecoMode" style="flex:1">${icon(m.icon || 'flag', 20)} Règles du mode</button></div>`;
  const b = $('#ecoMode'); if (b) b.onclick = () => openModeSheet(modeOf(S.mode));
}

/* ---------------------------------------------------------------- PADDOCK */
function renderPaddock(s) {
  const p = s.players[me], size = DATA.rules.rules.paddockSize;
  const st = p.stats;
  main.innerHTML = `<div class="card deco"><div class="h2">Mon paddock</div><div class="slotgrid">${Array.from({ length: size }, (_, i) => `<div class="slotc ${p.paddock[i] ? 'f' : ''}">${esc(p.paddock[i] || (i + 1))}</div>`).join('')}</div>
    <div class="row sp small dim"><span>Paris : ${st.betsPlaced} (${st.betsWon} gagnés)</span><span>Pièges : ${st.trapsBought}</span></div></div>
    ${s.phase === 'DRAFT' ? `<button class="btn full lg" id="toDraft">Entrer un code gommette</button><p></p>` : ''}
    ${p.paddock.map((c) => carCard(c)).join('') || '<div class="card deco center dim">Aucun bolide pour l\'instant. Le Draft commence bientôt !</div>'}`;
  const b = $('#toDraft'); if (b) b.onclick = () => { ui.tab = 'piste'; lastKey = ''; handleState(S); };
}

/* ---------------------------------------------------------------- ENTRACTE / CÉRÉMONIE */
function renderIntermission(s) {
  main.innerHTML = `<div class="card deco center"><div style="color:var(--gold-2)">${icon('tree', 56)}</div><h2 class="big foil">Entracte</h2><p class="dim">Étire-toi, grignote un biscuit, et prépare ta prochaine mise.</p></div>${voteCard(s)}${myPlayer().coins <= 0 ? bailoutCard(s) : ''}${tauntCard(s)}`;
  bindVotes(); bindBailout(); bindTaunts();
}
function renderCeremony(s) {
  const c = s.ceremony;
  const rows = c ? c.awards.slice(0, c.revealed).map((a) => {
    const list = a.kind === 'star' ? DATA.rules.stars : DATA.rules.trophies; const m = list.find((x) => x.id === a.id) || {};
    const t = a.teamId != null ? team(a.teamId) : null;
    return `<div class="res">${icon(a.kind === 'star' ? 'star' : 'trophy', 30)}<div class="grow"><b style="font:700 14px var(--font-display);text-transform:uppercase">${esc(m.name)}</b><div class="dim small">${esc(t ? t.name : '—')}</div></div>${t ? medal(t.id, 40) : ''}</div>`;
  }).join('') : '';
  const won = c ? c.awards.slice(0, c.revealed).filter((a) => a.teamId === me) : [];
  main.innerHTML = `<div class="card deco center"><div style="color:var(--gold-2)">${icon('trophy', 56)}</div><h2 class="big foil">Cérémonie</h2><p class="dim">Regarde la télé : les trophées sont dévoilés un par un !</p></div>
    ${won.length ? `<div class="card deco center"><div class="h2">Tu as gagné !</div>${won.map((a) => `<div class="big foil" style="font-size:24px">${esc(((a.kind === 'star' ? DATA.rules.stars : DATA.rules.trophies).find((x) => x.id === a.id) || {}).name)}</div>`).join('')}</div>` : ''}
    ${rows ? `<div class="card deco"><div class="h2">Palmarès</div>${rows}</div>` : ''}${voteCard(s)}`;
  if (won.length && ui.drafted !== c.revealed) { ui.drafted = c.revealed; confetti({ x: .5, y: .3, count: 160 }); snd.sfx('award'); snd.buzz([80, 40, 80, 40, 200]); }
  bindVotes();
}

/* ---------------------------------------------------------------- BRUITAGES */
function tauntCard() {
  return `<div class="card deco"><div class="h2">Bruitages — fais du bruit !</div><div class="tauntgrid">${DATA.rules.taunts.map((t) => `<button data-taunt="${t.id}" id="tz-${t.id}">${icon(t.icon, 28)}<span>${esc(t.name)}</span></button>`).join('')}</div><div class="dim small" style="margin-top:8px">1 bruitage toutes les ${DATA.rules.rules.tauntCooldownSec} s. Ça sonne sur la télé du salon !</div></div>`;
}
let tauntLock = 0;
function bindTaunts() {
  $$('[data-taunt]', main).forEach((b) => b.onclick = async () => {
    if (Date.now() < tauntLock) { toast('Patience…', 'err'); return; }
    const r = await act(() => player.intent('taunt', { id: b.dataset.taunt }));
    if (r) { if (b.dataset.taunt === 'signature') snd.teamSound(me, 'taunt'); tauntLock = Date.now() + DATA.rules.rules.tauntCooldownSec * 1000; snd.buzz(20); $$('[data-taunt]', main).forEach((x) => { x.disabled = true; }); setTimeout(() => $$('[data-taunt]', main).forEach((x) => { x.disabled = false; }), DATA.rules.rules.tauntCooldownSec * 1000); }
  });
}

/* ---------------------------------------------------------------- horloge locale (minuteur de Bourse) */
function frame() {
  if (!S) return;
  const hh = S.heat;
  const tn = $('#tn'), tb = $('#tb');
  if (tn && hh.betsOpen) {
    const total = DATA.rules.rules.betWindowSec * 1000, left = Math.max(0, hh.windowEndsAt - now());
    tn.textContent = Math.ceil(left / 1000) + ' s'; tn.classList.toggle('hot', left < 10000);
    if (tb) tb.style.width = (left / total * 100) + '%';
    if (left <= 0 && S.phase === 'BETTING') { /* le serveur fermera la Bourse ; l'état suivant redessine l'écran */ }
  }
}

/* ---------------------------------------------------------------- événements en direct */
function handleFx(f) {
  if (f.type === 'bets_open') { snd.play('bets.open', { fallback: 'gong' }); snd.buzz([40, 40, 40]); toast('La Bourse est ouverte !'); }
  else if (f.type === 'bets_closed') { snd.play('bets.close', { fallback: 'gong' }); toast('Rien ne va plus !'); }
  else if (f.type === 'countdown') { snd.buzz(30); }
  else if (f.type === 'go') { snd.sfx('go'); snd.buzz([80, 40, 80]); }
  else if (f.type === 'weather') { snd.sfx('weather'); }
  else if (f.type === 'chaos') { snd.sfx('chaos'); snd.buzz([50, 30, 50, 30, 50]); }
  else if (f.type === 'taunt' && f.teamId !== me) { if (f.id === 'signature') snd.teamSound(f.teamId, 'taunt'); else snd.taunt(f.id); }
  else if (f.type === 'reveal' && f.teamId === me) { /* feedback déjà donné à l'envoi */ }
}

boot();
