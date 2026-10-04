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
import * as LBX from '../shared/lootbox.js';
import { vignette } from '../shared/caisses3d.js';

const main = $('#main'), top = $('#top'), tabs = $('#tabs'), sheet = $('#sheet');
const atmo = startAtmosphere({ road: false, snow: 0.7, aurora: 0.9, theme: 'gp_bets' });
let curMode = null, musicOn = LS.get('gp.pitmusic', '0') === '1';
const ui = { dead: null, tab: 'ecurie', code: '', betKind: 'win', betLane: null, amount: 10, shopItem: null, tapLane: null, taps: 0, pending: 0, busy: false, lastCoins: null, drafted: 0,
  atab: 'comptoir', contract: false, csel: [], vign: {}, verif: null };
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
  // pas de relais : soirée pas encore lancée (site GitHub ouvert sans ?relay=) ou PC de la régie éteint
  const surSiteStatique = !/^(localhost|127\.|192\.168\.|10\.|172\.)/.test(location.hostname) && !/trycloudflare\.com$/.test(location.hostname);
  main.innerHTML = `<div class="hero"><b class="eyebrow">Pocket Pit</b><h1 class="display foil">${surSiteStatique ? 'Le circuit est éteint' : 'Circuit introuvable'}</h1>
    <p class="dim">${surSiteStatique
      ? "Le Grand Prix se joue en direct depuis le PC de l'organisateur. Le soir J, scanne le QR code affiché sur la télé : ton téléphone se connecte tout seul."
      : "Scanne le QR code affiché sur la télé, ou colle ici l'adresse du relais donnée par l'organisateur."}</p></div>
    <div class="card deco"><b class="small">Tu as le lien du circuit ?</b><p></p><input class="fld" id="rl" style="font-size:17px;letter-spacing:.02em;text-transform:none" placeholder="https://….trycloudflare.com"><p></p><button class="btn full" id="rlOk">Se connecter</button></div>
    ${surSiteStatique ? `<div class="card deco center"><b>En attendant le 23 décembre</b><p class="dim small">Découvre les 15 écuries, les bolides et les trophées.</p><a class="btn full" href="../showroom/">Visiter le Showroom 3D</a></div>` : ''}`;
  $('#rlOk').onclick = async () => { const i = await setRelay($('#rl').value); if (i) location.reload(); else toast('Aucun relais à cette adresse', 'err'); };
}

/* ---------------------------------------------------------------- choix d'écurie */
function renderPicker() {
  top.innerHTML = ''; tabs.innerHTML = '';
  connect('pit');                                         // flux anonyme : pour voir quelles écuries sont prises
  // QR code d'écurie imprimé (…/pit/?ecurie=N) : la fiche de l'écurie s'ouvre directement, un tap pour confirmer
  const pre = Number(qs.get('ecurie') || qs.get('team') || 0);
  let preDone = !(pre >= 1 && DATA.teams.some((t) => t.id === pre));
  const vide = { players: {}, online: [] };
  const dessiner = (s) => {
    if (player.token) return;
    drawPicker(s || vide);
    if (!preDone) { preDone = true; confirmTeam(pre, s || vide); }
  };
  onState(dessiner);
  main.innerHTML = '<div class="hero"><b class="eyebrow">Bienvenue au</b><h1 class="display foil">Grand Prix<br>de Noël</h1><p class="dim">Choisis ton écurie</p></div><div id="pk"></div>';
  dessiner(store.state);                                  // la liste s'affiche tout de suite, même avant la 1re réponse du circuit
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
  if (ui.autoPhase !== s.phase) { ui.autoPhase = s.phase; if (ui.tab === 'ecurie' && ['DRAFT', 'GRID', 'BETTING', 'COUNTDOWN', 'RACING', 'RESULT'].includes(s.phase)) ui.tab = 'piste'; drawTabs(); }
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
    case 'DRAFT': { const dn = (s.draft && s.draft.now) || {}; return `${base}|${p.paddock.length}|${s.skip ? 1 : 0}|${s.draft && s.draft.strict ? 1 : 0}|${dn.teamId}|${dn.pick}|${(dn.next || []).join('.')}`; }
    case 'GRID': case 'BETTING': case 'COUNTDOWN': case 'RACING':
      return `${base}|${hh.n}|${hh.status}|${hh.weather}|${hh.chaos}|${hh.gridRevealed}|${hh.lanes.map((l) => l ? l.code : '-').join(',')}|${JSON.stringify(hh.odds)}|${myBets}|${myTraps}|${p.coins}|${ui.betLane}|${ui.betKind}|${ui.shopItem}|${ui.tapLane}|${ui.shopCat}|${hh.traps.map((t) => t.item + '@' + t.lane + '>' + (t.target != null ? t.target : '') + (t.fired ? '!' : '')).join(',')}|${JSON.stringify(s.shopPrices || {})}|${JSON.stringify(s.priceMods || {})}|${JSON.stringify(s.shopStock || {})}|${ranking(s).map((r) => r.id).join('.')}|${lootKey(s, p)}`;
    case 'RESULT': case 'INTERVIEW': return `${base}|${hh.n}|${hh.result ? 1 : 0}|${p.coins}|${JSON.stringify(s.votes)}`;
    case 'STANDINGS': return `${base}|${ranking(s).map((r) => r.id + ':' + r.points).join(',')}|${JSON.stringify(s.votes)}`;
    case 'CEREMONY': return `${base}|${s.ceremony ? s.ceremony.revealed : -1}|${JSON.stringify(s.votes)}`;
    default: return `${base}|${JSON.stringify(s.votes)}`;
  }
}

function lootKey(s, p) {
  const lo = s.loot || {};
  return `${ui.atab}|${(p.inventory || []).map((x) => x.uid).join('.')}|${JSON.stringify((s.casePrices || {})[me] || {})}|${(s.heat.cases || {})[me] || 0}|${ui.contract ? 1 : 0}|${ui.csel.join('.')}|${lo.commit || ''}|${(lo.revealed || []).length}|${ui.verif ? ui.verif.ok : '-'}|${p.loot ? p.loot.sincePity : 0}`;
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
function draftTurn(s) {
  // tour imposé uniquement en phase Draft, hors Accès libre, avec un ordre officiel tiré
  const d = s.draft || {}, now = d.now;
  if (s.skip || !d.strict || !now || now.complete) return { free: true, now };
  if (!(d.order || []).includes(me)) return { free: false, mine: false, outside: true, now };
  return { free: false, mine: now.teamId === me, now, inNext: (now.next || []).indexOf(me) };
}
function renderDraft(s) {
  const p = s.players[me], size = DATA.rules.rules.paddockSize;
  const tr = draftTurn(s), full = p.paddock.length >= size;
  const can = !full && (tr.free || tr.mine);
  let banner = '';
  if (full) banner = `<div class="turn ok"><div><b>Paddock complet !</b><span>${size} bolides : tu es prêt pour la piste.</span></div></div>`;
  else if (tr.free) banner = s.skip ? `<div class="turn free"><div><b>Accès libre</b><span>Pioche ton paquet et tape le code quand tu veux.</span></div></div>` : '';
  else if (tr.outside) banner = `<div class="turn wait"><div><b>Pas dans l'ordre de passage</b><span>Demande à la régie de t'ajouter au tirage.</span></div></div>`;
  else if (tr.mine) banner = `<div class="turn mine"><div><b>À toi !</b><span>Va piocher un paquet dans le panier, puis tape le code de la gommette (manche ${tr.now.round}/${size}).</span></div></div>`;
  else {
    const t = team(tr.now.teamId);
    const when = tr.inNext === 0 ? 'Tu es le prochain : prépare-toi !' : tr.inNext > 0 ? `Encore ${tr.inNext + 1} écuries avant toi.` : 'Ton tour viendra : regarde la télé.';
    banner = `<div class="turn wait">${medal(tr.now.teamId, 46)}<div><b>Au tour de ${esc(t ? t.nickname : '')}</b><span>${when}</span></div></div>`;
  }
  if (tr.mine && ui.myTurnPick !== tr.now.pick) { ui.myTurnPick = tr.now.pick; snd.buzz([120, 60, 120, 60, 240]); snd.play('ui.decide'); }
  main.innerHTML = `${banner}<div class="card deco"><div class="h2">Le Draft</div><p class="dim small" style="margin:0 0 10px">Lis le code de la gommette collée sur ton paquet (ex : B07, FR02, F03, TK05) et tape-le ici : la télé révèle ton bolide.</p>
    <input class="fld" id="code" maxlength="8" placeholder="CODE" autocomplete="off" autocapitalize="characters" enterkeyhint="go" value="${esc(ui.code)}" ${can ? '' : 'disabled'}><p></p>
    <button class="btn full lg" id="go" ${can ? '' : 'disabled'}>${full ? 'Paddock complet' : can ? 'Révéler mon bolide' : 'Attends ton tour'}</button>
    <div class="dim small center" style="margin-top:8px">${p.paddock.length} / ${size} bolides dans ton paddock</div></div>
    <div class="slotgrid">${Array.from({ length: size }, (_, i) => `<div class="slotc ${p.paddock[i] ? 'f' : ''}">${esc(p.paddock[i] || (i + 1))}</div>`).join('')}</div>
    ${p.paddock.length ? '<div class="h2">Mes bolides</div>' + p.paddock.map((c) => carCard(c)).join('') : ''}`;
  const inp = $('#code'); inp.oninput = () => { ui.code = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); inp.value = ui.code; };
  inp.onkeydown = (e) => { if (e.key === 'Enter') $('#go').click(); };
  if (tr.mine && !full) setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch { /* clavier fermé */ } }, 250);
  $('#go').onclick = async () => {
    const code = ui.code.trim();
    if (!code) { toast('Entre le code de ta gommette', 'err'); return; }
    const r = await act(() => player.intent('draft.claim', { code }));
    if (r) { ui.code = ''; snd.sfx('reveal'); snd.buzz(40); confetti({ x: .5, y: .35, count: 70, power: .8 }); const c = car(code); if (c) toast(`« ${c.alias} » rejoint ton paddock (slot ${r.slot || p.paddock.length + 1}/${size}) !`, 'win'); }
  };
}
function carCard(code) {
  const c = car(code); if (!c) return '';
  return `<div class="card deco carc">${carArt(code, me, 'pc' + code)}<div class="dim small mono">${esc(c.code)} · ${esc(c.ecurie)}</div><h3 class="foil">${esc(c.alias)}</h3><div class="qt">« ${esc(c.citation)} »</div>${statBars(c, 5)}<div class="dim small" style="margin-top:8px">${esc(c.lore)}</div></div>`;
}

/* ---------------------------------------------------------------- GRILLE + BOURSE + PIÈGES */
const RARITY = { commun: 'Commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire' };
const CATS = [['all', 'star', 'Tout'], ['statique', 'cube', 'Statiques'], ['asservi', 'target', 'Asservis'], ['mobile', 'bowling', 'Mobiles'], ['numerique', 'wifi', 'Numériques']];
const ARCH = { statique: 'Statique', asservi: 'Asservi', mobile: 'Mobile', numerique: 'Numérique' };
const ARCH_VERBE = { asservi: 'DÉCLENCHER', mobile: 'LANCER' };
const SHOP = () => DATA.rules.shop || [];
const shopItem = (id) => SHOP().find((x) => x.id === id);
const isLaneTrap = (id) => { const it = shopItem(id); return !!(it && it.laneLimited); };
/** Effets numériques subis par MON écurie sur la manche (verres = cotes masquées). */
function fogged(hh) { return (hh.traps || []).some((t) => t.item === 'verres' && t.target === me); }
/** Prix payé par MOI : prix de marché publié par le relais + remise signature si l'objet porte mes couleurs. */
function myPrice(s, it, lane = null) {
  // même formule que le relais (engine.trap_price) : marché × signature × rang × phase × cible
  const market = (s.shopPrices && s.shopPrices[it.id] != null) ? s.shopPrices[it.id] : it.price;
  const sig = it.team != null && Number(it.team) === Number(me);
  const disc = (DATA.rules.economy && DATA.rules.economy.signatureDiscount) || 0.7;
  const pm = s.priceMods || { rank: {}, lane: [], phase: 1 };
  let raw = market * (sig ? disc : 1) * (pm.rank[String(me)] || 1) * (pm.phase || 1);
  if (lane != null && it.laneLimited && pm.lane[lane] != null) raw *= pm.lane[lane];
  const cap = (DATA.rules.economy && DATA.rules.economy.priceCap) || 95;
  const price = Math.min(cap, Math.max(5, Math.round(raw / 5) * 5));
  const ref = sig ? Math.max(5, Math.round(market * disc / 5) * 5) : market;
  return { market, price, sig, ref, rank: pm.rank[String(me)] || 1, panic: (pm.phase || 1) > 1 };
}
function trapChips(hh, i) {
  const list = (hh.traps || []).filter((t) => t.lane === i && t.item !== 'assurance');
  if (!list.length) return '';
  return `<span class="trs">${list.map((t) => { const it = shopItem(t.item); return it ? `<i class="tr r-${it.rarity}" title="${esc(it.name)}">${icon(it.icon, 16)}</i>` : ''; }).join('')}</span>`;
}
function laneBtn(i, l, selectable, sel) {
  const hh = heat();
  const lc = LANE_COLORS[i];
  if (!l) return '';
  const hidden = l.hidden || !l.code;
  const fog = fogged(hh);
  const c = hidden ? null : car(l.code), t = l.teamId != null ? team(l.teamId) : null;
  const od = hh.odds ? hh.odds.win[i] : null;
  const relic = !!(hh.odds && hh.odds.relic && hh.odds.relic[i]);
  const bel = hh.odds && hh.odds.belief ? hh.odds.belief[i] : null;
  const conf = bel ? Math.round((bel.confidence || 0) * 100) : null;
  const ins = (hh.traps || []).some((x) => x.item === 'assurance' && x.lane === i);
  return `<button class="lane ${sel ? 'sel' : ''} ${l.teamId === me ? 'mine' : ''} ${relic ? 'relic' : ''}" data-lane="${i}" style="--lc:${lc}" ${selectable ? '' : 'disabled'}>
    <span class="ln">${i + 1}</span><span class="lmid"><div class="al">${hidden ? 'Bolide masqué' : esc(c ? c.alias : l.code)}</div><div class="ow">${esc(t ? t.nickname : 'Fantôme')}${l.teamId === me ? ' · TOI' : ''}</div>
      <div class="tags">${relic ? `<em class="qod">${icon('relic', 12)} QUITTE OU DOUBLE</em>` : ''}${ins ? `<em class="ins">${icon('tow', 12)} ASSURÉ</em>` : ''}${conf != null && !hidden && !fog ? `<em class="cf" title="Confiance du modèle bayésien (${bel.races} course(s) observée(s))"><b style="width:${Math.max(4, conf)}%"></b>${bel.races ? bel.races + ' course' + (bel.races > 1 ? 's' : '') : 'inconnu'}</em>` : ''}</div>${trapChips(hh, i)}</span>
    <span class="od"><small>VICTOIRE</small>${fog ? '<b class="fogd">??</b>' : (od ? fmtOdds(od) : '–')}${hh.odds && hh.odds.pWin && !hidden && !fog ? `<i class="pc">${Math.round(hh.odds.pWin[i] * 100)} %</i>` : ''}</span></button>`;
}
function betLimits(s, lane = ui.betLane, kind = ui.betKind) {
  const hh = s.heat, p = s.players[me], mode = modeOf(s.mode);
  const w = weatherOf(hh.weather), ch = hh.chaos != null ? DATA.rules.chaos[hh.chaos] : null;
  const unlimited = mode.unlimited || w.unlimitedBets || (ch && ch.unlimitedBets);
  const staked = hh.bets.filter((b) => b.teamId === me).reduce((a, b) => a + b.amount, 0);
  let cap = unlimited ? p.coins : Math.min(p.coins, Math.floor((p.coins + staked) * DATA.rules.rules.betMaxPct / 100) - staked);
  const relic = !!(hh.odds && hh.odds.relic && hh.odds.relic[lane]) && (kind === 'win' || kind === 'podium');
  const rel = DATA.rules.rules.relic;
  let relicLeft = null;
  if (relic && rel && !mode.unlimited) {
    const on = hh.bets.filter((b) => b.teamId === me && b.lane === lane && (b.kind === 'win' || b.kind === 'podium')).reduce((a, b) => a + b.amount, 0);
    relicLeft = Math.max(0, Math.floor((p.coins + staked) * rel.stakeCapPct / 100) - on);
    cap = Math.min(cap, relicLeft);
  }
  return { unlimited, staked, max: Math.max(0, cap), relic, relicLeft };
}
function renderBetting(s) {
  const hh = s.heat, p = s.players[me], mode = modeOf(s.mode);
  if (hh.n === 0 || hh.status === 'idle') { main.innerHTML = `<div class="card deco center"><div class="h2">En attente de la grille</div><p class="dim">La régie tire les 4 bolides de la prochaine manche…</p></div>${tauntCard(s)}`; bindTaunts(); return; }
  const open = hh.betsOpen;
  if (ui.betLane == null || !hh.lanes[ui.betLane]) ui.betLane = hh.lanes.findIndex((l) => l);
  const lim = betLimits(s);
  const myBets = hh.bets.filter((b) => b.teamId === me);
  if (ui.amount > lim.max) ui.amount = Math.max(DATA.rules.rules.betMin, Math.min(lim.max, ui.amount));
  const canBet = open && mode.betting && lim.max >= DATA.rules.rules.betMin;
  const kinds = [['win', 'Victoire'], ['podium', 'Placé (top 2)'], ['crash', 'Crash']];
  const fog = fogged(hh);
  const odd = hh.odds ? hh.odds[ui.betKind][ui.betLane] : 1;
  const blind = hh.weather === 'brouillard' && !hh.gridRevealed;
  const allinArmed = ui.betKind === 'win' && hh.traps.some((t) => t.item === 'allin' && t.teamId === me) && !myBets.some((b) => b.allin);
  let eff = odd ? (blind ? Math.round(odd * 15) / 10 : odd) : 1;
  if (allinArmed) eff = Math.round(eff * 15) / 10;
  const laneOwner = hh.lanes[ui.betLane] && hh.lanes[ui.betLane].teamId;
  const primeArmed = ui.betKind === 'win' && laneOwner === me && hh.traps.some((t) => t.item === 'prime' && t.teamId === me) && !myBets.some((b) => b.prime);
  if (primeArmed) eff = Math.round(eff * 12.5) / 10;
  const kf = hh.odds && hh.odds.kelly && hh.odds.kelly[ui.betKind] ? hh.odds.kelly[ui.betKind][ui.betLane] || 0 : 0;
  const kellyAmt = Math.min(lim.max, Math.floor(kf * p.coins));
  const chips = [10, 25, 50].filter((v) => v <= lim.max);
  const oddTxt = (k) => (fog ? '??' : hh.odds ? fmtOdds(hh.odds[k][ui.betLane] || 1) : '');
  main.innerHTML = `
    <div class="card deco"><div class="row sp"><div><div class="h2" style="margin:0">Manche ${hh.n}</div><b>${esc(hh.kind === 'finale' ? 'Grande Finale' : hh.kind === 'demi' ? 'Demi-finale' : hh.kind === 'reliques' ? 'Coupe des Reliques' : 'Poule')}</b></div>
      <div style="text-align:right"><div class="h2" style="margin:0">${open ? 'Bourse ouverte' : hh.status === 'setup' ? 'Grille prête' : 'Bourse fermée'}</div><div class="tnum ${''}" id="tn" style="font-size:34px">${open ? '' : '—'}</div></div></div>
      <div class="timer ${open ? '' : 'hide'}"><i id="tb" style="width:100%"></i></div></div>
    ${fog ? `<div class="card fogcard">${icon('glasses', 34)}<div><b>Verres Teintés !</b><div class="small">Une écurie rivale t'a brouillé la vue : cotes masquées pour cette manche. Tu peux parier… à l'aveugle.</div></div></div>` : ''}
    ${weatherCard(s)}
    ${mode.betting ? `<div class="card deco"><div class="h2">Ta mise</div>
      <div id="lanes">${hh.lanes.map((l, i) => laneBtn(i, l, canBet, i === ui.betLane)).join('')}</div>
      <div class="seg">${kinds.map(([k, l]) => `<button data-kind="${k}" class="${ui.betKind === k ? 'on' : ''}">${l}<br><small style="opacity:.8">${oddTxt(k)}</small></button>`).join('')}</div>
      <div class="row sp small dim"><span>Cote ${fog ? '??' : fmtOdds(eff)}${blind ? ' (aveugle ×1,5)' : ''}${allinArmed ? ' <b class="allin">ALL-IN ×1,5</b>' : ''}${primeArmed ? ' <b class="allin">PRIME ×1,25</b>' : ''}</span><span>${lim.relic ? `<b class="qod">${icon('relic', 12)} Relique : ${lim.relicLeft} max</b>` : lim.unlimited ? 'Plafond levé : TAPIS autorisé' : 'Max ' + lim.max + ' ' + COIN + ' (' + DATA.rules.rules.betMaxPct + ' % du portefeuille)'}</span></div>
      <div class="chips">${chips.map((v) => `<button data-amt="${v}" class="${ui.amount === v ? 'on' : ''}">${v}</button>`).join('')}${!fog && kellyAmt >= DATA.rules.rules.betMin ? `<button data-amt="${kellyAmt}" class="kelly ${ui.amount === kellyAmt ? 'on' : ''}" title="Mise conseillée par le critère de Kelly (demi-Kelly)">${icon('target', 14)} ${kellyAmt}</button>` : ''}<button data-amt="max" class="${ui.amount === lim.max && lim.max > 0 && !chips.includes(lim.max) ? 'on' : ''}">${lim.unlimited ? 'TAPIS' : 'MAX'}</button></div>
      ${fog ? '' : `<div class="kline small">${icon('target', 14)} ${kf > 0 ? `Le modèle voit un avantage : demi-Kelly ≈ <b>${Math.round(kf * 100)} %</b> du portefeuille.` : 'Aucun avantage mathématique ici : c\'est un pari « plaisir ».'}</div>`}
      <input type="range" id="rng" min="${DATA.rules.rules.betMin}" max="${Math.max(DATA.rules.rules.betMin, lim.max)}" step="1" value="${clamp(ui.amount, DATA.rules.rules.betMin, Math.max(DATA.rules.rules.betMin, lim.max))}" ${canBet ? '' : 'disabled'}>
      <div class="row sp"><b class="big" id="amt" style="font-size:30px">${ui.amount} ${COIN}</b><span class="dim small">Gain potentiel : <b class="coin" id="gain">${fog ? '??' : Math.round(ui.amount * eff)}</b></span></div><p></p>
      <button class="btn full lg" id="place" ${canBet ? '' : 'disabled'}>${open ? 'Placer la mise' : 'Bourse fermée'}</button>
      ${myBets.length ? '<div class="h2" style="margin-top:16px">Mes paris sur cette manche</div>' + myBets.map((b) => `<div class="mybet"><span>Voie ${b.lane + 1} · ${{ win: 'Victoire', podium: 'Placé', crash: 'Crash' }[b.kind]} (${fmtOdds(b.odds)})${b.allin ? ' · ALL-IN' : ''}${b.prime ? ' · PRIME' : ''}</span><b class="coin">${b.amount} ${COIN}</b></div>`).join('') : ''}</div>`
    : '<div class="card deco center"><div class="h2">Mode Pure Vitesse</div><p class="dim">Pas de paris ni de pièges : concentre-toi sur la piste !</p></div>'}
    ${mode.traps ? shopCard(s) : ''}
    ${tauntCard(s)}`;
  // liaisons
  $$('#lanes .lane', main).forEach((b) => b.onclick = () => { ui.betLane = Number(b.dataset.lane); lastKey = ''; handleState(S); });
  $$('[data-kind]', main).forEach((b) => b.onclick = () => { ui.betKind = b.dataset.kind; lastKey = ''; handleState(S); });
  $$('[data-amt]', main).forEach((b) => b.onclick = () => { ui.amount = b.dataset.amt === 'max' ? Math.max(DATA.rules.rules.betMin, lim.max) : Number(b.dataset.amt); lastKey = ''; handleState(S); });
  const rng = $('#rng'); if (rng) rng.oninput = () => { ui.amount = Number(rng.value); $('#amt').innerHTML = ui.amount + ' ' + COIN; const g = $('#gain'); if (g && !fog) g.textContent = Math.round(ui.amount * eff); };
  const pl = $('#place'); if (pl) pl.onclick = async () => {
    const r = await act(() => player.intent('bet', { kind: ui.betKind, lane: ui.betLane, amount: ui.amount }));
    if (r) { snd.play('bet', { fallback: 'coin' }); snd.buzz(30); toast(`Mise placée : ${ui.amount} pièces à ${fmtOdds(r.odds)}`, 'win'); }
  };
  bindShop(s); bindTaunts();
}

/** Bonus actifs une seule fois par manche et par écurie (miroir du relais : engine.ONCE_PER_HEAT). */
const ONCE = ['insurance', 'allin', 'mirror', 'magnet', 'prime', 'turbo', 'graphite', 'lest', 'sweep', 'relaunch', 'joker', 'second', 'star'];
/** État d'achat (ou d'utilisation depuis l'inventaire si inv) d'un objet pour MOI : raison de blocage éventuelle. */
function itemState(s, it, inv = false) {
  const hh = s.heat, p = s.players[me];
  const mode = modeOf(s.mode) || {};
  const pr = myPrice(s, it);
  const stock = s.shopStock && s.shopStock[it.id] != null ? s.shopStock[it.id] : 1;
  const rk = ranking(s);
  const last = rk.length && rk[rk.length - 1].id === me;
  const open = hh.status === 'setup' || hh.status === 'betting';
  const racing = hh.lanes.some((l) => l && l.teamId === me);
  let why = '';
  if (!inv && it.caisseSeule && !mode.unlimited) why = 'box';
  else if (!inv && !mode.unlimited && hh.n < (it.unlockHeat || 1)) why = 'locked';
  else if (!open) why = 'closed';
  else if (!inv && stock <= 0) why = 'sold';
  else if (it.lastOnly && !last) why = 'last';
  else if (ONCE.includes(it.digital) && hh.traps.some((t) => t.item === it.id && t.teamId === me)) why = 'owned';
  else if ((it.digital === 'insurance' || it.selfLane || it.racingOnly) && !racing) why = 'notracing';
  else if (it.digital === 'joker' && hh.status !== 'setup') why = 'joker';
  else if (!inv && p.coins < pr.price) why = 'funds';
  return { ...pr, price: inv ? 0 : pr.price, stock, why, ok: !why };
}
const WHY = { locked: (it) => `Manche ${it.unlockHeat}`, closed: () => 'Fermé', sold: () => 'Épuisé', last: () => 'Dernier seulement', owned: () => 'Actif', notracing: () => 'Hors grille', funds: () => 'Trop cher',
  box: () => 'En caisse', joker: () => 'Avant la Bourse' };

/* ---------------------------------------------------------------- CAISSES (lootbox) et INVENTAIRE */
const CAI = () => DATA.rules.caisses;
const itemLite = (id) => { const it = shopItem(id) || { name: id, icon: 'star', rarity: 'commun' }; return { name: it.name, icon: it.icon, rarity: it.rarity, effect: it.effect }; };
function cratesView(s) {
  const C = CAI(); if (!C) return '<div class="dim small">Caisses indisponibles.</div>';
  const pr = (s.casePrices || {})[me] || {}, p = myPlayer();
  const k = (s.heat.cases || {})[me] || 0, max = C.maxParManche, unl = (modeOf(s.mode) || {}).unlimited;
  const open = !['countdown', 'racing'].includes(s.heat.status);
  const lo = p.loot || { sincePity: 0, opened: 0 };
  const fam = Object.entries(C.familles).map(([fid, f]) => `<div class="cfam"><div class="fh">${icon(f.icone, 30)}<div><b>${esc(f.nom)}</b><small>${esc(f.desc)}</small></div></div>
    <div class="ctiers">${C.gammes.map((g) => {
      const price = (pr[fid] || {})[g.id];
      const ok = open && price != null && p.coins >= price && (unl || k < max);
      const key = g.id + '|' + fid;
      return `<button class="ctile t-${g.id}" data-case="${fid}:${g.id}" ${ok ? '' : 'disabled'}>${ui.vign[key] ? `<img src="${ui.vign[key]}" alt="Caisse ${esc(g.nom)}">` : `<span class="ph" data-vign="${key}">${icon(g.id === 'standard' ? 'crate' : g.id === 'elite' ? 'vault' : 'skullcrate', 54)}</span>`}
        <b>${esc(g.nom)}</b><span class="cp">${price != null ? price : '—'} ${COIN}</span>${LBX.tableHtml(g, fid, true)}</button>`;
    }).join('')}</div><div style="margin-top:8px">${LBX.legendeHtml()}</div></div>`).join('');
  const commit = (s.loot || {}).commit || '';
  return `<div class="crates">${fam}</div>
    <div class="cmeta"><span>Caisses cette manche : <b>${k}${unl ? '' : ' / ' + max}</b></span><span>Pitié : <b>${lo.sincePity} / ${C.pitie - 1}</b> sans épique</span></div>
    <div class="dim small" style="margin-top:6px">Prix : ×${(1 + C.escalade).toFixed(2).replace('.', ',')} à chaque caisse de la manche, ajusté à ta richesse. Les épiques et légendaires ne sortent que des caisses.</div>
    ${fairBlock(s)}`;
}
function fairBlock(s) {
  const lo = s.loot || {}, rev = lo.revealed || [];
  return `<div class="fair">${icon('lock', 12)} Tirage vérifiable · empreinte de la graine : <b>${esc((lo.commit || '').slice(0, 16))}…</b>
    ${rev.length ? `<br>Graines révélées : ${rev.length}. <button class="btn ghost" id="verif" style="padding:6px 10px;font-size:12px">Vérifier tous les tirages</button>${ui.verif ? ` <b style="color:${ui.verif.ok ? 'var(--pine)' : '#ff8b9a'}">${ui.verif.ok ? '✓ ' + ui.verif.n + ' tirages conformes' : '✗ ' + ui.verif.ecarts.length + ' écart(s)'}</b>` : ''}` : '<br>La graine sera révélée à la cérémonie : chacun pourra alors recalculer ses tirages ici.'}</div>`;
}
function invView(s) {
  const p = myPlayer(), inv = p.inventory || [];
  const C = CAI();
  if (!inv.length) return `<div class="card center dim">Inventaire vide. Les objets gagnés en caisse arrivent ici ; on les utilise quand on veut (gratuitement), ou on les revend.</div>${fairBlock(s)}`;
  const n = C ? C.contrat.n : 5;
  const rows = inv.map((x) => { const it = shopItem(x.item) || {}; const sel = ui.csel.includes(x.uid);
    return `<button class="ivi r-${it.rarity} ${sel ? 'sel' : ''}" data-uid="${x.uid}"><span class="aic">${icon(it.icon || 'star', 26)}</span><span><b>${esc(it.name || x.item)}</b><small>${RARITY[it.rarity] || ''} · ${esc(x.src || '')}</small></span></button>`; }).join('');
  return `<div class="inv">${rows}</div>
    <div class="contract">${icon('contract', 16)} <b>Contrat d'échange</b> : ${n} objets communs d'une même famille contre 1 rare.
      ${ui.contract ? `<div class="row sp" style="margin-top:8px"><span>${ui.csel.length} / ${n} sélectionnés</span><span><button class="btn ghost" id="cAnn" style="padding:8px 12px">Annuler</button> <button class="btn" id="cSig" style="padding:8px 12px" ${ui.csel.length === n ? '' : 'disabled'}>Signer</button></span></div>`
        : `<button class="btn ghost full" id="cGo" style="margin-top:8px">Préparer un contrat</button>`}</div>${fairBlock(s)}`;
}
function bindLoot(s) {
  $$('[data-case]', main).forEach((b) => b.onclick = () => { const [f, g] = b.dataset.case.split(':'); openCase(f, g); });
  $$('[data-vign]', main).forEach((el) => {
    const key = el.dataset.vign, [g, f] = key.split('|');
    vignette(g, f, 220).then((url) => { ui.vign[key] = url; const img = document.createElement('img'); img.src = url; img.alt = 'Caisse ' + g; el.replaceWith(img); }).catch(() => {});
  });
  $$('[data-uid]', main).forEach((b) => b.onclick = () => {
    const uid = b.dataset.uid, x = (myPlayer().inventory || []).find((y) => y.uid === uid); if (!x) return;
    const it = shopItem(x.item); if (!it) return;
    if (ui.contract) {
      const C = CAI();
      if (ui.csel.includes(uid)) ui.csel = ui.csel.filter((u) => u !== uid);
      else if (it.rarity !== C.contrat.de) { toast('Contrat : objets communs uniquement', 'err'); return; }
      else if (ui.csel.length && (shopItem((myPlayer().inventory.find((y) => y.uid === ui.csel[0]) || {}).item) || {}).famille !== it.famille) { toast('Contrat : une seule famille à la fois', 'err'); return; }
      else if (ui.csel.length < C.contrat.n) ui.csel.push(uid);
      lastKey = ''; handleState(S); return;
    }
    invSheet(S, it, uid);
  });
  const go = $('#cGo'); if (go) go.onclick = () => { ui.contract = true; ui.csel = []; lastKey = ''; handleState(S); };
  const an = $('#cAnn'); if (an) an.onclick = () => { ui.contract = false; ui.csel = []; lastKey = ''; handleState(S); };
  const sg = $('#cSig'); if (sg) sg.onclick = async () => {
    const r = await act(() => player.intent('case.tradeup', { uids: ui.csel }));
    ui.contract = false; ui.csel = []; lastKey = '';
    if (r) { const it = itemLite(r.item); snd.sfx('reveal'); toast(`Contrat signé : « ${it.name} » (${RARITY[it.rarity]})`, 'win'); }
    handleState(S);
  };
  const vf = $('#verif'); if (vf) vf.onclick = () => {
    const lo = S.loot || {}, all = { ok: true, n: 0, ecarts: [] };
    for (const r of lo.revealed || []) {
      const j = (lo.log || []).filter((o) => o.msg.split(':')[0] === String(r.epoch));
      const v = LBX.verifier(CAI(), r.seed, r.commit, j);
      all.ok = all.ok && v.ok; all.n += v.n || 0; all.ecarts.push(...(v.ecarts || []));
    }
    ui.verif = all; lastKey = ''; handleState(S);
    toast(all.ok ? `${all.n} tirage(s) recalculé(s) : tout est conforme` : 'Écart détecté : préviens la régie !', all.ok ? 'win' : 'err');
  };
}
async function openCase(fam, gam) {
  const C = CAI(), g = C.gammes.find((x) => x.id === gam);
  const r = await act(() => player.intent('case.open', { family: fam, tier: gam }));
  if (!r) return;
  snd.buzz(20);
  const it = shopItem(r.item);
  const st = itemState(S, it, true);
  const valeur = Math.max(1, Math.round((it.price || 10) * (C.primeRarete[it.rarity] || 1) * C.revente));
  const actions = [];
  if (st.ok) actions.push({ id: 'use', label: 'Utiliser', primary: true });
  actions.push({ id: 'keep', label: 'Garder', primary: !st.ok });
  actions.push({ id: 'sell', label: `Revendre ≈ ${valeur}` });
  const choix = await LBX.ouvrirCaisse({
    bande: r.strip, gagnant: r.win, objet: itemLite, iconSvg: (n, sz) => icon(n, sz),
    titre: `${C.familles[fam].nom} · ${g.nom}`, sousTitre: r.pity ? 'Pitié : épique garanti' : `Tirage ${r.msg}`,
    actions, detail: `Vérifiable : HMAC-SHA256(graine, « ${r.msg} »)`,
  });
  lastKey = ''; handleState(S);
  if (choix === 'use') invSheet(S, it, r.uid, true);
  else if (choix === 'sell') sellItem(r.uid);
}
async function sellItem(uid) {
  const r = await act(() => player.intent('inventory.sell', { uid }));
  if (r) { snd.sfx('coin'); toast(`Revendu : +${r.value} pièces`, 'win'); }
}
function invSheet(s, it, uid, direct = false) {
  const st = itemState(s, it, true);
  if (direct && st.ok) { itemSheet(s, it, uid); return; }
  openSheet(`<div class="isheet r-${it.rarity}"><div class="ihead"><div class="thumb"><img src="../shared/arsenal/${it.id}.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="aic">${icon(it.icon, 44)}</span></div>
    <div><span class="rtag">${RARITY[it.rarity] || ''}</span><h3 class="big foil">${esc(it.name)}</h3><div class="small dim">Dans ton inventaire · utilisation gratuite</div></div></div>
    <p class="ieff">${esc(it.effect)}</p>
    ${st.ok ? '<button class="btn full lg" id="iUse">Utiliser maintenant</button>' : `<div class="card why2">${icon('lock', 20)} ${WHY[st.why] ? WHY[st.why](it) : ''} : à utiliser pendant la préparation d'une manche.</div>`}
    <button class="btn ghost full" id="iSell">Revendre</button><button class="btn ghost full" id="no">Fermer</button></div>`);
  $('#no').onclick = closeSheet;
  $('#iSell').onclick = () => { closeSheet(); sellItem(uid); };
  const u = $('#iUse'); if (u) u.onclick = () => itemSheet(S, it, uid);
}

function shopCard(s) {
  const hh = s.heat;
  const cat = ui.shopCat || 'all';
  const items = SHOP().filter((it) => cat === 'all' || it.arch === cat)
    .map((it) => ({ it, st: itemState(s, it) }))
    .sort((a, b) => (a.st.why === 'box') - (b.st.why === 'box') || (a.st.why === 'locked') - (b.st.why === 'locked') || (b.it.team === me) - (a.it.team === me));
  const canSetup = hh.status === 'setup' || hh.status === 'betting';
  const placed = hh.traps.length;
  const pm = s.priceMods || { rank: {}, phase: 1 };
  const rk = pm.rank[String(me)] || 1;
  const tag = rk < 0.99 ? `<span class="mod good">Rattrapage ×${rk.toFixed(2).replace('.', ',')}</span>` : rk > 1.01 ? `<span class="mod bad">Taxe du leader ×${rk.toFixed(2).replace('.', ',')}</span>` : '';
  const invN = (myPlayer().inventory || []).length;
  const atabs = `<div class="atabs">${[['comptoir', 'coin', 'Comptoir'], ['caisses', 'crate', 'Caisses'], ['inventaire', 'gift', 'Inventaire']].map(([id, ic, l]) =>
    `<button data-atab="${id}" class="${ui.atab === id ? 'on' : ''}">${icon(ic, 16)}${l}${id === 'inventaire' && invN ? `<span class="nb">${invN}</span>` : ''}</button>`).join('')}</div>`;
  if (ui.atab !== 'comptoir') {
    return `<div class="card deco arsenal"><div class="row sp"><div class="h2" style="margin:0">${icon('banana', 18)} L'Arsenal</div><span class="small dim">${placed} objet${placed > 1 ? 's' : ''} en jeu</span></div>
      ${atabs}${ui.atab === 'caisses' ? cratesView(s) : invView(s)}</div>`;
  }
  return `<div class="card deco arsenal"><div class="row sp"><div class="h2" style="margin:0">${icon('banana', 18)} L'Arsenal</div><span class="small dim">${placed} objet${placed > 1 ? 's' : ''} en jeu</span></div>
    ${atabs}
    ${tag || pm.phase > 1 ? `<div class="mods">${tag}${pm.phase > 1 ? '<span class="mod bad panic">PRIX DE PANIQUE ×1,2</span>' : ''}</div>` : ''}
    <div class="cats">${CATS.map(([id, ic, l]) => `<button data-cat="${id}" class="${cat === id ? 'on' : ''}">${icon(ic, 16)}${l}</button>`).join('')}</div>
    <div class="shop">${items.map(({ it, st }) => {
      const pct = it.factor && it.factor < 1 ? Math.round((1 - it.factor) * 100) : 0;
      return `<button class="item r-${it.rarity} ${st.ok ? '' : 'off'} ${st.why === 'locked' ? 'lockd' : ''} ${st.sig ? 'sig' : ''}" data-item="${it.id}" aria-label="${esc(it.name)}">
        ${st.sig ? '<span class="ribbon">SIGNATURE</span>' : ''}
        <span class="stk" title="Stock restant pour la manche">${st.stock >= 99 ? '∞' : '×' + st.stock}</span>
        <span class="aic">${icon(it.icon, 34)}</span>
        <b>${esc(it.name)}</b>
        <small class="rar">${RARITY[it.rarity] || ''}${pct ? ` · <span class="hit">−${pct} %</span>` : ''}</small>
        <span class="archb a-${it.arch}">${icon({ statique: 'cube', asservi: 'target', mobile: 'bowling', numerique: 'wifi' }[it.arch] || 'star', 11)} ${ARCH[it.arch] || ''}</span>
        <span class="pr">${st.price !== st.market ? `<s>${st.market}</s> ` : ''}${it.laneLimited ? '<i class="des">dès</i> ' : ''}${st.price} ${COIN}</span>
        ${st.why === 'locked' ? `<span class="lock">${icon('lock', 26)}<b>Manche ${it.unlockHeat}</b></span>` : st.why === 'box' ? '<span class="boxonly">Caisse</span>' : st.why ? `<span class="why">${WHY[st.why](it)}</span>` : ''}
      </button>`;
    }).join('')}</div>
    <div class="dim small" style="margin-top:10px">${canSetup ? 'Touchez un objet pour voir sa fiche (modèle 3D imprimé, effet, cible). Prix de marché : ils suivent la richesse de la tablée.' : 'La pose des pièges est fermée.'}</div></div>`;
}

function itemSheet(s, it, uid = null) {
  const st = itemState(s, it, !!uid);
  const hh = s.heat;
  const pct = it.factor && it.factor < 1 ? Math.round((1 - it.factor) * 100) : 0;
  const t = it.team != null ? team(it.team) : null;
  let pick = '';
  if (st.ok) {
    if (it.digital === 'joker') {
      const grid = new Set(hh.lanes.filter((l) => l).map((l) => l.code));
      const codes = (s.players[me].paddock || []).filter((c) => !grid.has(c));
      pick = `<div class="h2">Quel bolide envoyer sur la grille ?</div><div class="tgrid">${codes.map((c) => `<button class="tgt" data-code="${esc(c)}"><b>${esc(c)}</b><small class="dim">${esc((car(c) || {}).alias || '')}</small></button>`).join('') || '<div class="dim small">Aucun autre bolide dans ton paddock.</div>'}</div>`;
    } else if (it.needsLane) {
      const lanes = hh.lanes.map((l, i) => {
        if (!l) return '';
        const shield = it.laneLimited && hh.traps.some((x) => (x.item === 'carapace' || x.item === 'etoile') && x.lane === i);
        const pr = myPrice(s, it, i).price;
        return laneBtn(i, l, !shield && pr <= s.players[me].coins, false).replace('<button class="lane', `<button class="lane pickl${shield ? ' shielded' : ''}`)
          .replace('<span class="od">', `<span class="lprice">${pr} ${COIN}</span><span class="od">`);
      }).join('');
      pick = `<div class="h2">${it.id === 'champi' || it.id === 'carapace' ? 'Sur quelle voie ?' : 'Sur la voie de qui ?'}</div>${lanes}`;
    } else if (it.targetTeam) {
      const ids = Object.keys(s.players).map(Number).filter((id) => id !== me && !hh.traps.some((x) => x.item === it.id && x.target === id));
      pick = `<div class="h2">Quelle écurie viser ?</div><div class="tgrid">${ids.map((id) => { const tt = team(id); return `<button class="tgt" data-target="${id}">${medal(id, 40)}<b>${esc(tt ? tt.nickname : '#' + id)}</b></button>`; }).join('')}</div>`;
    } else {
      pick = `<button class="btn full lg" id="buyit">${icon(it.icon, 22)} ${uid ? 'Activer (gratuit, inventaire)' : `Activer pour ${st.price} pièces`}</button>`;
    }
  } else {
    pick = `<div class="card why2">${icon(st.why === 'locked' || st.why === 'box' ? 'lock' : 'skull', 22)} ${st.why === 'locked' ? `Se débloque à la manche ${it.unlockHeat}.` : st.why === 'box' ? 'Objet épique ou légendaire : il ne sort que des caisses (onglet Caisses).' : WHY[st.why](it)}</div>`;
  }
  openSheet(`<div class="isheet r-${it.rarity}">
    <div class="ihead"><div class="thumb"><img src="../shared/arsenal/${it.id}.jpg" alt="Modèle 3D imprimable : ${esc(it.name)}" loading="lazy" onerror="this.remove()"><span class="aic">${icon(it.icon, 44)}</span></div>
      <div><span class="rtag">${RARITY[it.rarity] || ''}</span><h3 class="big foil">${esc(it.name)}</h3>
      <div class="small dim">${t ? `${medal(it.team, 18)} Objet signature : ${esc(t.name)}` : 'Objet universel'}</div>
      <div class="ipr">${uid ? '<b>Gratuit</b> <span class="small dim">· objet de ton inventaire</span>' : `${st.market !== st.price ? `<s>${st.market}</s> ` : ''}<b>${st.price}</b> ${COIN} <span class="small dim">· stock ${st.stock >= 99 ? '∞' : st.stock}</span>`}</div>
      <div class="archline a-${it.arch}">${ARCH[it.arch] || ''}${it.reussite ? ` · réussite estimée ${Math.round(it.reussite * 100)} %` : ''}</div></div></div>
    ${it.declenchement ? `<div class="decl">${icon(it.arch === 'mobile' ? 'bowling' : 'target', 18)}<span><b>${it.arch === 'mobile' ? 'Lancer' : 'Déclencher'} :</b> ${esc(it.declenchement)}</span></div>` : ''}
    <p class="ieff">${esc(it.effect)}</p>
    ${pct ? `<div class="meter"><span>Impact sur les chances de la victime</span><i><b style="width:${pct}%"></b></i><em>−${pct} %</em></div>` : ''}
    ${it.temps ? `<div class="small dim">${it.temps.perte[1] > 0 ? `Chrono : −${String(it.temps.perte[0]).replace('.', ',')} à −${String(it.temps.perte[1]).replace('.', ',')} s quand il touche (${Math.round(it.temps.effet * 100)} % des cas)${it.temps.sortie ? ` · sortie de piste ${Math.round(it.temps.sortie * 100)} % (le commissaire relance)` : ''}` : `Chrono : +${String(-it.temps.perte[1]).replace('.', ',')} à +${String(-it.temps.perte[0]).replace('.', ',')} s gagnées`}</div>` : ''}
    ${it.lore ? `<p class="lore">« ${esc(it.lore)} »</p>` : ''}
    ${it.physique ? `<details><summary>${icon('engine', 14)} Sur la vraie piste</summary><p class="small">${esc(it.physique)}</p>${it.print ? `<p class="small dim">Impression : ${esc(it.print.mat || '')} · ${it.print.min || '?'} min · ${it.print.g || '?'} g</p>` : ''}${it.diy ? `<p class="small dim">Astuce : ${esc(it.diy)}</p>` : ''}</details>` : ''}
    ${pick}
    <button class="btn ghost full" id="no">Fermer</button></div>`);
  $('#no').onclick = closeSheet;
  $$('#sheet .lane').forEach((lb) => lb.onclick = () => { if (lb.disabled) return; closeSheet(); buy(it, Number(lb.dataset.lane), undefined, uid); });
  $$('#sheet .tgt[data-target]').forEach((tb) => tb.onclick = () => { closeSheet(); buy(it, null, Number(tb.dataset.target), uid); });
  $$('#sheet .tgt[data-code]').forEach((tb) => tb.onclick = () => { closeSheet(); buy(it, null, undefined, uid, tb.dataset.code); });
  const bi = $('#buyit'); if (bi) bi.onclick = () => { closeSheet(); buy(it, null, undefined, uid); };
}
function bindShop(s) {
  $$('.arsenal [data-atab]', main).forEach((b) => b.onclick = () => { ui.atab = b.dataset.atab; ui.contract = false; ui.csel = []; lastKey = ''; handleState(S); });
  bindLoot(s);
  $$('.arsenal .cats button', main).forEach((b) => b.onclick = () => { ui.shopCat = b.dataset.cat; lastKey = ''; handleState(S); });
  $$('.item', main).forEach((b) => b.onclick = () => { const it = shopItem(b.dataset.item); if (it) itemSheet(S || s, it); });
}
async function buy(it, lane, target, uid = null, code = null) {
  const body = uid ? { uid, lane } : { item: it.id, lane };
  if (target != null) body.target = target;
  if (code) body.code = code;
  const r = await act(() => player.intent(uid ? 'trap.use' : 'trap.buy', body));
  if (r) {
    snd.sfx('trap'); snd.buzz([20, 30, 20]);
    const who = target != null && team(target) ? ' sur ' + team(target).nickname : '';
    toast(`${it.name} ${it.needsLane ? 'posé' : 'activé'}${lane != null && it.needsLane ? ' sur la voie ' + (lane + 1) : ''}${who} !${r.price ? ` (−${r.price})` : ' (inventaire)'}`, 'win');
  }
}
/** Éclaboussure d'encre plein écran (Pieuvre de Calligraphie) : 8 secondes, essuyable du doigt. */
function inkSplat(from) {
  const old = $('#inkfx'); if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'inkfx';
  const blobs = Array.from({ length: 9 }, () => `<i style="left:${Math.random() * 90}%;top:${Math.random() * 90}%;--s:${0.6 + Math.random() * 1.4};--r:${Math.random() * 360}deg">${icon('ink', 160)}</i>`).join('');
  d.innerHTML = `${blobs}<div class="msg">${icon('ink', 30)}<b>ENCRÉ !</b><small>${esc(from)} t'a aspergé · frotte l'écran</small></div>`;
  document.body.appendChild(d);
  let wiped = 0;
  d.addEventListener('pointermove', () => { wiped++; d.style.opacity = String(Math.max(0.15, 1 - wiped / 120)); });
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 700); }, 8000);
}

/* ---------------------------------------------------------------- COURSE : DÉCLENCHEURS (asservis / mobiles) */
function myFireable(s) {
  return (s.heat.traps || []).filter((t) => t.teamId === me && (shopItem(t.item) || {}).arch && ['asservi', 'mobile'].includes(shopItem(t.item).arch));
}
function fireCard(s) {
  const list = myFireable(s);
  if (!list.length) return '';
  return `<div class="card deco firecard"><div class="h2">${icon('target', 16)} Tes pièges à déclencher</div>${list.map((t) => {
    const it = shopItem(t.item);
    return `<button class="fire r-${it.rarity} ${t.fired ? 'done' : ''}" data-fire="${t.id}" ${t.fired ? 'disabled' : ''}>
      <span class="aic">${icon(it.icon, 30)}</span><span class="ft"><b>${esc(it.name)}</b><small>${t.lane != null ? 'Voie ' + (t.lane + 1) + ' · ' : ''}${esc(it.declenchement || '')}</small></span>
      <em>${t.fired ? 'FAIT ✓' : ARCH_VERBE[it.arch]}</em></button>`;
  }).join('')}</div>`;
}
function bindFire() {
  $$('[data-fire]', main).forEach((b) => b.onclick = async () => {
    if (b.disabled) return;
    b.disabled = true;
    const r = await act(() => player.intent('trap.fire', { id: b.dataset.fire }));
    if (r) { snd.sfx('trap'); snd.buzz([30, 20, 60]); } else b.disabled = false;
  });
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
    ${fireCard(s)}
    <div class="tapzone"><button class="tapbtn" id="tap">TAPE !<small id="tapn">${ui.taps} frappes</small></button></div>
    <p></p>${tauntCard(s)}`;
  bindFire();
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
  else if (f.type === 'trap' && f.teamId !== me) {
    const it = shopItem(f.item), by = team(f.teamId);
    if (f.item === 'encre' && f.target === me) { snd.sfx('trap'); snd.buzz([120, 60, 120]); inkSplat(by ? by.nickname : 'Une écurie'); }
    else if (f.item === 'verres' && f.target === me) { snd.sfx('trap'); snd.buzz([60, 40, 60]); toast('Verres Teintés : tes cotes sont masquées !', 'err'); }
    else if (f.item === 'fantome') { snd.sfx('trap'); toast(`${by ? by.nickname : '?'} lâche le Fantôme Chapardeur !`); }
    else if (it && f.reflect) {
      const mine = S && S.heat.lanes[f.reflect.from] && S.heat.lanes[f.reflect.from].teamId === me;
      if (mine) { snd.sfx('reveal'); toast(`Rétro-Miroir ! ${it.name} renvoyé ${f.reflect.to != null ? 'à l\'envoyeur' : 'dans le vide'} !`, 'win'); }
    }
    else if (it && f.lane != null && it.laneLimited) { const mine = S && S.heat.lanes[f.lane] && S.heat.lanes[f.lane].teamId === me; if (mine) { snd.sfx('trap'); snd.buzz([40, 30, 40]); toast(`${it.name} posé sur TA voie par ${by ? by.nickname : '?'} !`, 'err'); } }
  }
  else if (f.type === 'trap_fire' && f.teamId !== me) {
    const it = shopItem(f.item), by = team(f.teamId);
    const mine = S && f.lane != null && S.heat.lanes[f.lane] && S.heat.lanes[f.lane].teamId === me;
    if (mine) { snd.sfx('trap'); snd.buzz([80, 40, 80, 40, 160]); toast(`${it ? it.name : 'Piège'} déclenché sur TA voie par ${by ? by.nickname : '?'} !`, 'err'); }
  }
  else if (f.type === 'case_open' && f.teamId !== me && (f.rarity === 'epique' || f.rarity === 'legendaire')) {
    const by = team(f.teamId), it = itemLite(f.item);
    snd.sfx(f.rarity === 'legendaire' ? 'award' : 'reveal'); toast(`${by ? by.nickname : '?'} tire « ${it.name} » (${RARITY[f.rarity]}) !`, f.rarity === 'legendaire' ? 'win' : '');
  }
  else if (f.type === 'loot_reveal') { toast('Graine des caisses révélée : vérifie tes tirages (Arsenal › Inventaire)', 'win'); }
  else if (f.type === 'reveal' && f.teamId === me) { /* feedback déjà donné à l'envoi */ }
}

boot();
