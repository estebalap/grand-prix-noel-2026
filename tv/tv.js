/* Régie TV — Grand Prix de Noël (édition 23 décembre).
   Une scène par phase de l'émission, pilotée à 100 % par l'état diffusé par le relais. */
import {
  $, $$, h, esc, DATA, store, admin, qs, LS, now, fmtOdds, LANE_COLORS, ranking, car, team, weatherOf, modeOf,
  findRelay, setRelay, relayBase, loadData, asset, connect, onState, onFx, onBoost, onStatus, clamp, sleep,
} from '../shared/core.js';
import { icon } from '../shared/icons.js';
import { qrSvg } from '../shared/qr.js';
import { startAtmosphere, confetti, confettiCannons } from '../shared/fx.js';
import * as snd from '../shared/audio.js';
import { applyTheme, themeOf } from '../shared/themes.js';
import { createPlaylistPlayer } from '../shared/playlist.js';
import { medal, ghostMedal, carArt, statBars, teamAccent, pad2 } from '../shared/ui.js';
import { createStage } from '../shared/stage3d.js';
import { mountAdmin, ADMIN_CSS } from '../shared/admin.js';
import { createVideoLibrary, makeVideo, waitPlayable, playWithSound, fadeVolume, disposeVideo } from '../shared/videos.js';

const stage = $('#stage'), sceneEl = $('#scene'), overlay = $('#overlay');
const atmo = startAtmosphere({ road: true, snow: 1, theme: 'gp_bets' });
let curMode = null;                 // mode dont le thème est appliqué
let cur = null;                     // scène courante : { key, name, live, unmount }
let S = null;                       // dernier état
let boostLast = {};

const ICON_BY_AWARD = { cresus: 'coin', chaos: 'banana', phenix: 'phoenix', chat: 'chat', grandprix: 'trophy', parieur: 'coin', cascadeur: 'crash', saboteur: 'banana', reliques: 'car', cuillere: 'spoon' };
const PHASE_LABEL = { LOBBY: 'Accueil', DRAFT: 'Draft', GRID: 'Grille', BETTING: 'La Bourse', COUNTDOWN: 'Départ', RACING: 'Course', RESULT: 'Résultat', INTERVIEW: 'Interview', STANDINGS: 'Classement', INTERMISSION: 'Entracte', CEREMONY: 'Cérémonie' };
const KIND_LABEL = { poule: 'Poule', demi: 'Demi-finale', finale: 'Grande Finale', reliques: 'Coupe des Reliques' };

/* ---------------------------------------------------------------- échelle 16:9 (+ rotation auto sur téléphone vertical) */
let rotated = false;
function fit() {
  const W = innerWidth, H = innerHeight;
  const wantRot = qs.get('rot') === '1' || (qs.get('rot') !== '0' && H > W * 1.15);   // téléphone tenu à la verticale : la scène pivote
  rotated = wantRot;
  document.body.classList.toggle('rotated', wantRot);
  stage.style.left = '0px'; stage.style.top = '0px';
  if (wantRot) {
    const s = Math.min(H / 1920, W / 1080);
    stage.style.transform = `translate(${W / 2}px,${H / 2}px) rotate(90deg) scale(${s}) translate(-960px,-540px)`;
  } else {
    const s = Math.min(W / 1920, H / 1080);
    stage.style.transform = `translate(${(W - 1920 * s) / 2}px,${(H - 1080 * s) / 2}px) scale(${s})`;
  }
}
addEventListener('resize', fit); addEventListener('orientationchange', fit); fit();

/* ---------------------------------------------------------------- démarrage */
async function boot() {
  const style = document.createElement('style'); style.textContent = ADMIN_CSS; document.head.appendChild(style);
  let info = await findRelay();
  while (!info) {
    info = await askRelay();
  }
  await loadData();
  snd.loadBank(asset('sounds/manifest.json')).then((ok) => { if (ok) { snd.preloadTeams(); snd.preloadVoices(['Hakihaki', 'Otona']); } });
  if (!admin.pin) await admin.tryLocalPin();
  mountAdmin($('#drBody'), { onToast: toast });
  onState(handleState);
  onFx(handleFx);
  onBoost(handleBoost);
  let offTimer = null;
  onStatus((on) => { clearTimeout(offTimer); if (on) $('#offline').classList.add('hide'); else offTimer = setTimeout(() => $('#offline').classList.remove('hide'), 6000); });
  connect('tv');
  setInterval(frameTick, 100);
  vids.refresh(true);
  setInterval(() => vids.refresh(true), 30000);          // vidéos déposées en cours de soirée : prises en compte seules
}

function askRelay() {
  return new Promise((res) => {
    sceneEl.innerHTML = `<div class="scn" style="display:grid;place-items:center"><div class="deco" style="padding:40px 50px;width:900px;text-align:center">
      <b class="display foil" style="font-size:54px">Relais introuvable</b>
      <p style="font-size:24px;color:var(--ink-dim)">Lance <span class="mono">LANCER_REGIE.bat</span> sur ce PC, puis ouvre cette page via l'adresse affichée, ou saisis l'adresse du relais :</p>
      <input id="rl" style="width:100%;font-size:26px;padding:12px;border-radius:12px;border:1px solid var(--hair);background:rgba(0,0,0,.4);color:#fff" placeholder="http://192.168.1.20:8100" value="http://localhost:8100">
      <p><button class="btn" id="rlOk">Se connecter</button></p></div></div>`;
    $('#rlOk').onclick = async () => { res(await setRelay($('#rl').value)); };
  });
}

/* ---------------------------------------------------------------- AMBIANCE PAR MODE */
let musicWanted = LS.get('gp.music', '1') !== '0';
let ytSig = '';
const music = createPlaylistPlayer({ relayBase, ytHost: document.getElementById('ytBox'), onNowPlaying: showNowPlaying });
const vids = createVideoLibrary(relayBase);

/* ================================================================== CINÉMATIQUE D'OUVERTURE */
let intro = null;                    // { layer, v } pendant la lecture
let introBusy = false;               // chargement / lecture / fondu en cours : les touches ne pilotent plus la régie
async function playIntro() {
  if (intro || introBusy) return;
  introBusy = true;
  try { await playIntroInner(); } finally { if (!intro) introBusy = false; }
}
async function playIntroInner() {
  await vids.refresh(true);
  const src = vids.intro();
  if (!src) { toast("Intro : déposez web/videos/intro_grand_prix.mp4 (le décor animé reste affiché)"); return; }
  const layer = h(`<div class="intro-layer"><button class="intro-skip">Passer l'intro ⏭<small>Échap · Espace</small></button><div class="intro-hint hide">🔇 Touchez l'écran pour le son</div></div>`);
  const v = makeVideo(src, relayBase, { cls: 'intro-video' });
  layer.prepend(v);
  document.body.appendChild(layer);
  intro = { layer, v };
  snd.play('mode', { fallback: 'reveal' });
  music.setEnabled(false);                                   // fondu de sortie de la musique (1,8 s)
  const ok = await waitPlayable(v, 5000);
  if (!ok || intro?.v !== v) { if (intro?.v === v) { intro = null; layer.remove(); disposeVideo(v); music.setEnabled(musicWanted); toast('Intro illisible : vérifiez le format (H.264 + AAC, MP4)'); } return; }
  v.volume = 0;
  const sound = await playWithSound(v);
  if (!sound) { const hint = $('.intro-hint', layer); hint.classList.remove('hide'); layer.addEventListener('pointerdown', () => { v.muted = false; hint.classList.add('hide'); fadeVolume(v, 1, 600); }, { once: true }); }
  requestAnimationFrame(() => layer.classList.add('on'));     // fondu d'entrée de l'image
  fadeVolume(v, 1, 1400);                                    // fondu d'entrée du son
  v.addEventListener('ended', () => endIntro(true), { once: true });
  v.addEventListener('error', () => endIntro(false), { once: true });
  $('.intro-skip', layer).onclick = (e) => { e.stopPropagation(); endIntro(false); };
}
async function endIntro(natural) {
  if (!intro) return;
  const { layer, v } = intro; intro = null;
  fadeVolume(v, 0, 700);
  layer.classList.remove('on'); layer.classList.add('off');
  await sleep(900);
  disposeVideo(v); layer.remove();
  introBusy = false;
  music.setEnabled(musicWanted);
  if (S && (S.phase === 'LOBBY' || S.phase === 'DRAFT')) {
    snd.play('start', { fallback: 'fanfare' });
    announce(`<div class="deco" style="padding:46px 80px;text-align:center"><span class="eyebrow">${natural ? 'Bienvenue sur le plateau' : 'Retour au plateau'}</span>
      <h2 class="display foil" style="font-size:96px;margin:12px 0">Place au Draft !</h2>
      <p style="font-size:30px;color:var(--ink-dim)">Scannez le QR code, choisissez votre écurie, et préparez-vous à piocher vos 6 bolides.</p></div>`, 5200);
  }
}
music.setEnabled(musicWanted);
function showNowPlaying(np) {
  const el = $('#nowPlaying'); if (!el) return;
  if (!np || !np.title) { el.classList.remove('show'); return; }
  el.innerHTML = `<span class="np-ic">♪</span><span class="np-t">${esc(np.title)}</span><small>${np.source === 'youtube' ? 'YouTube' : 'Playlist ' + esc((themeOf(curMode) || {}).name || '')}</small>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showNowPlaying.t); showNowPlaying.t = setTimeout(() => el.classList.remove('show'), 7000);
}
function syncMusic(id) {
  const yt = (S && S.music && S.music.youtube && S.music.youtube[id]) || null;
  ytSig = id + ':' + JSON.stringify(yt);
  music.setMode(id, { youtube: yt, synth: themeOf(id).music });
}
function setMode(id) {
  const first = curMode === null;
  curMode = id;
  const th = applyTheme(id);
  atmo.setTheme(id);
  atmo.setSpeed(th.speed);
  snd.setSoundMode(id);
  syncMusic(id);
  if (!first) setTimeout(() => snd.play('mode', { fallback: 'reveal' }), 250);
  const m = modeOf(id);
  $('#modeRibbon').innerHTML = m ? `${icon(m.icon, 22)}<b>${esc(m.name)}</b><span>${esc(m.banner || '')}</span>` : '';
  if (!first && m) showModeIntro(m, th);
}
function showModeIntro(m, th) {
  const box = $('#modeIntro');
  clearTimeout(showModeIntro.t);
  box.innerHTML = `<div class="mi-card"><div class="mi-ico">${icon(m.icon, 120)}</div>
    <span class="eyebrow">${esc(m.type || 'Mode de jeu')}</span>
    <h2 class="display foil">${esc(m.name)}</h2>
    <p class="mi-tag">${esc(th.tagline)}</p>
    <ul>${(m.rules || []).map((r) => `<li><span>${esc(r.icon)}</span>${esc(r.text)}</li>`).join('')}</ul>
    ${m.tip ? `<div class="mi-tip">Astuce du Showrunner : ${esc(m.tip)}</div>` : ''}</div>`;
  box.classList.add('show');
  showModeIntro.t = setTimeout(() => box.classList.remove('show'), 11000);
}
function toggleModeIntro() {
  const box = $('#modeIntro');
  if (box.classList.contains('show')) { clearTimeout(showModeIntro.t); box.classList.remove('show'); return; }
  const m = modeOf(S?.mode); if (m) showModeIntro(m, themeOf(S.mode));
}

/* ---------------------------------------------------------------- aiguilleur de scènes */
function sceneName(s) {
  switch (s.phase) {
    case 'LOBBY': return 'lobby';
    case 'DRAFT': return 'draft';
    case 'GRID': case 'BETTING': case 'COUNTDOWN': case 'RACING': return 'race';
    case 'RESULT': case 'INTERVIEW': return 'result';
    case 'STANDINGS': return 'stand';
    case 'INTERMISSION': return 'inter';
    case 'CEREMONY': return 'cer';
    default: return 'lobby';
  }
}
const SCENES = { lobby: sLobby, draft: sDraft, race: sRace, result: sResult, stand: sStand, inter: sInter, cer: sCer };

function handleState(s) {
  S = s;
  if (s.mode !== curMode) setMode(s.mode);
  else if (ytSig !== s.mode + ':' + JSON.stringify((s.music && s.music.youtube && s.music.youtube[s.mode]) || null)) syncMusic(s.mode);
  const name = sceneName(s);
  const def = SCENES[name](s);
  if (!cur || cur.key !== def.key) {
    if (cur && cur.unmount) cur.unmount();
    sceneEl.innerHTML = '';
    const el = h(`<div class="scn ${def.cls || ''}">${def.html}</div>`);
    sceneEl.appendChild(el);
    cur = { key: def.key, name, el, live: def.live, unmount: def.unmount };
    if (def.mount) def.mount(el, s);
    atmo.setRoad(name === 'lobby' || name === 'race' || name === 'inter');
    atmo.setAurora(name === 'cer' ? 1.5 : 1);
  }
  if (cur.live) cur.live(s, cur.el);
  snd.ambience(['GRID', 'BETTING', 'COUNTDOWN', 'RACING'].includes(s.phase) && s.heat.n > 0 ? s.heat.weather : null);
  hud(s);
  ticker(s);
}

/* ---------------------------------------------------------------- HUD / ticker */
function hud(s) {
  const hh = s.heat;
  const mid = $('#hudMid');
  const label = PHASE_LABEL[s.phase] || s.phase;
  const html = `<span class="pill" style="font-size:18px;border-color:var(--gold-2);color:var(--gold-1)">${esc(label)}</span>` +
    (hh.n > 0 ? `<span class="pill">Manche ${hh.n} · ${esc(KIND_LABEL[hh.kind] || hh.kind)}</span>` : '') +
    `<span class="pill">${icon((modeOf(s.mode) || {}).icon || 'flag', 18)} ${esc((modeOf(s.mode) || {}).name || s.mode)}</span>` +
    (s.skip ? `<span class="pill pill-skip">ACCÈS LIBRE</span>` : '') +
    (R_elim(s) ? `<span class="pill" style="border-color:var(--red)">${icon('skull', 18)} ${aliveCount(s)} en vie</span>` : '');
  if (mid.dataset.k !== html) { mid.dataset.k = html; mid.innerHTML = html; }
  const claimed = Object.values(s.players).filter((p) => p.claimed).length;
  $('#onlinePill').innerHTML = `<span class="dot-live"></span> ${s.online.length} / ${DATA.teams.length} en ligne · ${claimed} écuries`;
}
const R_elim = (s) => !!(modeOf(s.mode) || {}).elimination;
const aliveCount = (s) => DATA.teams.length - (s.eliminated || []).length;
let tkSig = '', tkTimer = null;
const TICKER_PX_PER_S = 32;            // vitesse de défilement du bandeau « EN DIRECT » (pixels de scène par seconde)
function ticker(s) {
  const items = (s.feed || []).slice(-12).map((f) => f.text);
  if (!items.length) items.push('Bienvenue au Grand Prix de Noël — scannez le QR code pour rejoindre votre écurie !');
  const sig = items.join('|');
  if (sig === tkSig) return;
  // on ne réécrit pas le bandeau à chaque événement : on regroupe les mises à jour (lecture plus calme)
  clearTimeout(tkTimer);
  tkTimer = setTimeout(() => applyTicker(items, sig), tkSig ? 2500 : 0);
}
function applyTicker(items, sig) {
  tkSig = sig;
  const tr = $('#tkTrack');
  const row = items.map((t) => `<span>${esc(t)}</span>`).join('');
  // conserver la position courante pour éviter le « saut » au début
  const m = getComputedStyle(tr).transform; const curX = m && m !== 'none' ? new DOMMatrix(m).m41 : 0;
  tr.innerHTML = row + row;
  const half = tr.scrollWidth / 2 || 1;
  const dur = Math.max(30, half / TICKER_PX_PER_S);
  tr.style.animationDuration = dur + 's';
  tr.style.animationDelay = -((Math.abs(curX) % half) / half) * dur + 's';
}

export function toast(msg, kind = 'ok') {
  const t = h(`<div class="toast ${kind === 'err' ? 'err' : ''}">${esc(msg)}</div>`);
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}

/* ================================================================== SCÈNES */

/* ---------------------------------------------------------------- LOBBY */
function pitUrl(s) {
  const relay = (s.urls && (s.urls.public || s.urls.local)) || relayBase();
  const pit = qs.get('pit');
  if (pit) return pit.replace(/\/?$/, '/') + '?relay=' + encodeURIComponent(relay);
  return relay.replace(/\/$/, '') + '/pit/';
}
function sLobby(s) {
  const url = pitUrl(s);
  const tiles = DATA.teams.map((t) => `<div class="ttile" data-t="${t.id}">${medal(t.id, 112)}<div class="nm">${esc(t.nickname)}</div><div class="pi">${esc(t.pilot)}</div></div>`).join('');
  return {
    key: 'lobby:' + url,
    html: `<div class="lobby">
      <div class="hero">
        <span class="eyebrow">${esc(((DATA.rules.formats || []).find((f) => f.id === s.format) || {}).name || 'Grande Finale de la famille')} · 23 décembre 2026</span>
        <h1 class="display foil">Le Grand<br>Prix de<br>Noël</h1>
        <div class="sub">Rainbow Road, miniatures, paris et trophées dorés.</div>
        <div class="joinbox deco">
          <div class="qrwrap">${qrSvg(url, { dark: '#0b1030', round: 0.3 })}</div>
          <div class="steps"><span class="eyebrow">Rejoins ton écurie</span><div class="display foil code">${esc(s.code)}</div>
            Scanne avec ton téléphone,<br>choisis ton écurie, c'est parti !
            <small>${esc(url)}</small></div>
        </div>
      </div>
      <div><div class="teamgrid">${tiles}</div><div class="lobby-count display" id="lobbyCount"></div></div>
    </div>`,
    live(st, el) {
      $$('.ttile', el).forEach((n) => {
        const id = Number(n.dataset.t);
        n.classList.toggle('claimed', !!st.players[id]?.claimed);
        n.classList.toggle('online', st.online.includes(id));
      });
      const c = Object.values(st.players).filter((p) => p.claimed).length;
      $('#lobbyCount', el).innerHTML = `<span class="foil" style="font-size:54px">${c}</span> <span style="color:var(--ink-dim)">/ ${DATA.teams.length} écuries sur la grille</span>`;
    },
  };
}

/* ---------------------------------------------------------------- DRAFT */
const revealQueue = []; let revealBusy = false;
let turnLast = null;
function sDraft() {
  const size = DATA.rules.rules.paddockSize;
  const cards = DATA.teams.map((t) => `<div class="pdk deco plain" data-t="${t.id}" style="--tc:${teamAccent(t.id)}">
      <div class="top">${medal(t.id, 64)}<div class="meta"><div class="nm">${esc(t.nickname)}</div><div class="pi">${esc(t.name)}</div></div><span class="ord"></span></div>
      <div class="slots">${Array.from({ length: size }, (_, i) => `<div class="slot" data-s="${i}">${i + 1}</div>`).join('')}</div></div>`).join('');
  return {
    key: 'draft',
    html: `<div class="draft"><div class="sec-title"><h2 class="display foil">Le Draft</h2><p>Pioche un paquet dans le panier, tape le code de la gommette sur ton téléphone : ton bolide rejoint ton paddock (${size} places).</p></div>
      <div class="turnbar deco" id="turnBar"></div><div class="paddocks">${cards}</div></div>`,
    live(st, el) {
      const d = st.draft || {}, now = d.now, order = d.order || [];
      $$('.pdk', el).forEach((n) => {
        const id = Number(n.dataset.t); const pk = st.players[id]?.paddock || [];
        $$('.slot', n).forEach((sl, i) => {
          const code = pk[i];
          const txt = code || String(i + 1);
          if (sl.dataset.c !== (code || '')) { sl.dataset.c = code || ''; sl.textContent = txt; sl.classList.toggle('f', !!code); }
        });
        n.classList.toggle('none', !pk.length);
        n.classList.toggle('turn', !st.skip && !!now && now.teamId === id);
        n.classList.toggle('full', pk.length >= size);
        const pos = order.indexOf(id); $('.ord', n).textContent = pos >= 0 && !st.skip ? '#' + (pos + 1) : '';
      });
      const tb = $('#turnBar', el);
      let html, sig;
      if (st.skip) { html = `<span class="eyebrow">Accès libre</span><b class="tb-free">Chacun pioche à son rythme : tapez vos codes dès que vous avez votre paquet.</b>`; sig = 'free'; }
      else if (!now) { html = `<span class="eyebrow">Ordre de passage</span><b class="tb-free">La régie tire l'ordre officiel…</b>`; sig = 'none'; }
      else if (now.complete) { html = `<span class="eyebrow">Draft terminé</span><b class="tb-free">${now.total} bolides dans les paddocks. En piste !</b>`; sig = 'done'; }
      else {
        const t = team(now.teamId);
        html = `<span class="eyebrow">Au tour de</span><div class="tb-cur">${medal(now.teamId, 92)}<div><b class="display foil">${esc(t ? t.nickname : '')}</b><span>${esc(t ? t.name : '')}</span></div></div>
          <div class="tb-meta"><b>Manche ${now.round}/${size}</b><span>Pioche ${now.pick}/${now.total}</span><div class="bar"><i style="width:${Math.round(100 * now.done / Math.max(1, now.total))}%"></i></div></div>
          <div class="tb-next"><span class="eyebrow">Ensuite</span><div>${now.next.map((id) => medal(id, 50)).join('')}</div></div>`;
        sig = 'turn:' + now.teamId + ':' + now.pick;
      }
      if (tb.dataset.sig !== sig) {
        tb.dataset.sig = sig; tb.innerHTML = html;
        if (now && !now.complete && !st.skip && turnLast !== now.teamId) {
          turnLast = now.teamId; tb.classList.remove('pop'); void tb.offsetWidth; tb.classList.add('pop');
          if (!snd.teamSound(now.teamId, 'join')) snd.play('ui.decide');
        }
      }
    },
  };
}
function showDraftOrder(order) {
  if (!order || !order.length) return;
  snd.play('reveal');
  announce(`<div class="deco draft-order"><span class="eyebrow">Ordre officiel de passage</span><h2 class="display foil">Le tirage a parlé !</h2>
    <ol>${order.map((id, i) => { const t = team(id); return `<li style="animation-delay:${0.25 + i * 0.12}s">${medal(id, 58)}<b>${i + 1}</b><span>${esc(t ? t.nickname : '')}</span></li>`; }).join('')}</ol>
    <p>Serpentin : l'ordre s'inverse à chaque manche (1 → ${order.length}, puis ${order.length} → 1).</p></div>`, 7000 + order.length * 120);
}
async function runReveals() {
  if (revealBusy) return; revealBusy = true;
  while (revealQueue.length) {
    if (!S || S.phase !== 'DRAFT') { revealQueue.length = 0; break; }
    const { teamId, code, slot, size } = revealQueue.shift();
    const c = car(code); if (!c) continue;
    const src = vids.car(code);
    if (src && await revealVideo(c, teamId, src, slot, size)) continue;
    await revealCard(c, teamId, slot, size);
  }
  revealBusy = false;
}
function revealInfo(c, teamId, slot, size) {
  const t = team(teamId);
  return `<div class="own">${t ? medal(t.id, 62) : ''}<span>${esc(t ? t.name : '')}</span>${slot ? `<em class="slotnum">Slot ${slot}/${size || DATA.rules.rules.paddockSize}</em>` : ''}</div>
    <span class="eyebrow">${esc(c.code)} · ${esc(c.real_name || c.ecurie)}</span>
    <h3 class="display foil">${esc(c.alias)}</h3>
    <div class="qt">« ${esc(c.citation)} »</div><div class="lore">${esc(c.lore)}</div>
    ${statBars(c, 5)}`;
}
/* Repli sans vidéo : fiche profil avec balayage de lumière dorée */
async function revealCard(c, teamId, slot, size) {
  snd.sfx('reveal');
  const el = h(`<div class="reveal gold"><div class="card deco"><div class="art">${carArt(c.code, teamId, 'rv')}</div><div>${revealInfo(c, teamId, slot, size)}</div></div><div class="sweep"></div></div>`);
  overlay.appendChild(el);
  confetti({ x: 0.5, y: 0.5, count: 70, power: 0.9 });
  snd.carVoice(c.code);
  await sleep(revealQueue.length ? 2600 : 4800);
  el.style.transition = 'opacity .4s'; el.style.opacity = 0; await sleep(400); el.remove();
}
/* Clip vidéo du bolide (web/videos/cars/CODE.mp4) avec fiche néon en surimpression */
async function revealVideo(c, teamId, src, slot, size) {
  const el = h(`<div class="reveal-video"><div class="rv-frame"></div><div class="rv-shade"></div><div class="rv-panel deco">${revealInfo(c, teamId, slot, size)}</div><div class="rv-flash"></div></div>`);
  const v = makeVideo(src, relayBase, { cls: 'rv-video' });
  $('.rv-frame', el).appendChild(v);
  overlay.appendChild(el);
  if (!(await waitPlayable(v, 1800))) { disposeVideo(v); el.remove(); return false; }
  const vol = music.volume; music.setVolume(Math.min(vol, 0.08));      // la musique s'efface sous le clip
  snd.sfx('reveal');
  v.volume = 1;
  await playWithSound(v);
  el.classList.add('on');
  setTimeout(() => el.classList.add('info'), 700);                    // la fiche s'incruste après l'impact
  confetti({ x: 0.75, y: 0.4, count: 60, power: 0.8 });
  const cap = revealQueue.length ? 7000 : 12000;                       // 5-8 s attendues ; plafond de sécurité
  await new Promise((res) => {
    const to = setTimeout(res, Math.min(cap, isFinite(v.duration) && v.duration > 0 ? v.duration * 1000 + 300 : cap));
    v.addEventListener('ended', () => { clearTimeout(to); setTimeout(res, 600); }, { once: true });
    v.addEventListener('error', () => { clearTimeout(to); res(); }, { once: true });
  });
  el.classList.add('out'); fadeVolume(v, 0, 400);
  await sleep(450);
  disposeVideo(v); el.remove();
  music.setVolume(vol);
  return true;
}

/* ---------------------------------------------------------------- RACE (grille / bourse / départ / course) */
function laneHtml(i, l, st) {
  const lc = LANE_COLORS[i];
  if (!l) return `<div class="lane deco plain empty" data-lane="${i}" style="--lc:${lc}">VOIE ${i + 1}<br>LIBRE</div>`;
  const tm = l.teamId != null ? team(l.teamId) : null;
  const odds = (k) => `<span data-odds="${k}:${i}">–</span>`;
  if (l.hidden || !l.code) {
    return `<div class="lane deco" data-lane="${i}" style="--lc:${lc}"><span class="ln">VOIE ${i + 1}</span>
      <div class="hide-ph">?</div><div class="alias">Bolide masqué par le brouillard</div><div class="real">Paris à l'aveugle : cote ×1,5</div>
      <div class="oddsrow"><div class="odds-big"><small>Victoire</small>${odds('win')}<span class="chance" data-chance="${i}"></span></div><div class="odds-sm">Placé <b>${odds('podium')}</b><br>Crash <b>${odds('crash')}</b></div></div></div>`;
  }
  const c = car(l.code);
  const tc = tm ? teamAccent(tm.id) : '#cfd8ff';
  return `<div class="lane deco" data-lane="${i}" style="--lc:${lc};--tc:${tc}"><span class="ln">VOIE ${i + 1}</span>
    <div class="traps" data-traps="${i}"></div>
    <div class="carart">${carArt(l.code, l.teamId, 'l' + i)}</div>
    <div class="pool" data-pool="${i}"></div>
    <div class="alias">${esc(c ? c.alias : l.code)}</div>
    <div class="real">${esc(c ? c.real_name : '')} · ${esc(l.code)}</div>
    <div class="owner">${tm ? medal(tm.id, 52) : ghostMedal(52)}<div>${esc(tm ? tm.nickname : 'Bolide fantôme')}<small>${esc(tm ? tm.name : 'sans écurie')}</small></div></div>
    <div class="stats">${c ? statBars(c, 4) : ''}</div>
    <div class="boost"><i data-boost="${i}"></i></div><div class="boostlbl"><span data-bl="${i}">Soutien</span><span data-bn="${i}"></span></div>
    <div class="oddsrow"><div class="odds-big"><small>Victoire</small>${odds('win')}<span class="chance" data-chance="${i}"></span></div><div class="odds-sm">Placé <b>${odds('podium')}</b><br>Crash <b>${odds('crash')}</b></div></div></div>`;
}

let cdLastDigit = null;
function sRace(s) {
  const hh = s.heat;
  const key = `race:${hh.n}:${hh.lanes.map((l) => (l ? (l.code || '?') + (l.teamId ?? '') : '-')).join(',')}`;
  cdLastDigit = null;
  return {
    key,
    html: `<div class="race" id="raceRoot">
      <div class="racebar">
        <div class="heatno deco"><span class="eyebrow">${esc(KIND_LABEL[hh.kind] || 'Manche')}</span><b class="display foil">MANCHE ${hh.n}</b></div>
        <div class="wxcard deco" id="wxCard"></div>
        <div class="chaoscard deco" id="chaosCard"></div>
        <div class="timer deco plain" id="timer" style="opacity:0"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/><circle id="ring" cx="50" cy="50" r="44" fill="none" stroke="var(--gold-2)" stroke-width="7" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg><b id="timerN">45</b></div>
      </div>
      <div class="lanes">${hh.lanes.map((l, i) => laneHtml(i, l, s)).join('')}</div>
      <div class="banner" id="banner"></div>
      <div id="cdBox"></div>
    </div>`,
    live: raceLive,
  };
}
function raceLive(s, el) {
  const hh = s.heat;
  el.classList.toggle('racing', hh.status === 'racing');
  // météo & chaos
  const w = weatherOf(hh.weather);
  const wxk = hh.weather + ':' + hh.status;
  const wc = $('#wxCard', el);
  if (wc.dataset.k !== hh.weather) { wc.dataset.k = hh.weather; wc.innerHTML = `${icon(w.icon, 62)}<div><b class="foil">${esc(w.name)}</b><span>${esc(w.effect)}</span></div>`; }
  const cc = $('#chaosCard', el);
  const ck = String(hh.chaos);
  if (cc.dataset.k !== ck) {
    cc.dataset.k = ck;
    if (hh.chaos == null) { cc.className = 'chaoscard deco empty'; cc.innerHTML = '<span class="eyebrow">Roue du Chaos</span><b>Pas de carte Chaos</b><span>La piste est calme… pour l\'instant.</span>'; }
    else { const c = DATA.rules.chaos[hh.chaos]; cc.className = 'chaoscard deco'; cc.innerHTML = `<span class="eyebrow">Carte Chaos</span><b>${esc(c.title)}</b><span>${esc(c.desc)}</span>`; }
  }
  // cotes, pièges, mises
  if (hh.odds) $$('[data-odds]', el).forEach((n) => { const [k, i] = n.dataset.odds.split(':'); const v = hh.odds[k] && hh.odds[k][Number(i)]; n.textContent = v == null ? '–' : fmtOdds(v); });
  if (hh.odds && hh.odds.pWin) $$('[data-chance]', el).forEach((n) => { const i = Number(n.dataset.chance), l = hh.lanes[i]; n.textContent = l && !l.hidden ? Math.round(hh.odds.pWin[i] * 100) + ' % de chances' : ''; });
  hh.lanes.forEach((l, i) => {
    const tr = $(`[data-traps="${i}"]`, el);
    if (tr) {
      const here = hh.traps.filter((t) => t.lane === i);
      const relic = !!(hh.odds && hh.odds.relic && hh.odds.relic[i]);
      const k = here.map((t) => t.item + (t.fired ? '!' : '')).join(',') + '|' + relic;
      if (tr.dataset.k !== k) {
        tr.dataset.k = k;
        tr.innerHTML = (relic ? `<span class="qodtv">${icon('relic', 26)}QUITTE OU DOUBLE</span>` : '') + here.map((t) => {
          const it = DATA.rules.shop.find((x) => x.id === t.item) || { icon: 'star', rarity: 'commun', name: t.item };
          return `<i class="tr r-${it.rarity}${it.id === 'assurance' ? ' ins' : ''}${t.fired ? ' fired' : ''}${['asservi', 'mobile'].includes(it.arch) && !t.fired ? ' armed' : ''}" title="${esc(it.name)}">${icon(it.icon, 30)}</i>`;
        }).join('');
      }
    }
    const pl = $(`[data-pool="${i}"]`, el); if (pl) { const sum = hh.bets.filter((b) => b.lane === i).reduce((a, b) => a + b.amount, 0); pl.innerHTML = sum ? `${icon('coin', 22, 'coin')} ${sum}` : ''; }
  });
  // vainqueur mis en lumière à l'arrivée
  const win = hh.result ? hh.result.order[0] : -1;
  $$('.lane', el).forEach((n) => n.classList.toggle('win', Number(n.dataset.lane) === win && !hh.result?.dnf.includes(win)));
  // bannière / minuteur
  const ban = $('#banner', el), tm = $('#timer', el);
  let b = '';
  if (hh.status === 'setup') b = `<span class="foil">La grille est prête</span>`;
  else if (hh.status === 'betting') b = `<span class="foil">La Bourse est ouverte — misez !</span>`;
  else if (hh.status === 'closed') b = `<span>Rien ne va plus</span>`;
  else if (hh.status === 'countdown') b = `<span>Tous au départ</span>`;
  else if (hh.status === 'racing') b = `<i class="live"></i><span>Course en cours — tapez pour soutenir votre bolide !</span>`;
  else if (hh.status === 'finished') b = `<span class="foil">Photo-finish !</span>`;
  if (ban.dataset.k !== b) { ban.dataset.k = b; ban.innerHTML = b; }
  tm.style.opacity = hh.betsOpen ? 1 : 0;
  atmo.setSpeed(hh.status === 'racing' ? 2.4 : hh.status === 'countdown' ? 0.9 : themeOf(S.mode).speed);
  renderBoost(el);
}
function renderBoost(el) {
  if (!S || !el || cur?.name !== 'race') return;
  const per = [0, 0, 0, 0], who = [0, 0, 0, 0];
  Object.values(boostLast).forEach((d) => { if (d.lane >= 0 && d.lane < 4) { per[d.lane] += d.taps; who[d.lane] += 1; } });
  const mx = Math.max(60, ...per);
  per.forEach((v, i) => {
    const bar = $(`[data-boost="${i}"]`, el); if (bar) bar.style.width = (v / mx * 100) + '%';
    const n = $(`[data-bn="${i}"]`, el); if (n) n.textContent = v ? `${who[i]} fan${who[i] > 1 ? 's' : ''} · ${v} tap${v > 1 ? 's' : ''}` : '';
  });
}
function handleBoost(b) { boostLast = b; if (cur && cur.name === 'race') renderBoost(cur.el); }

/* rAF-ish : minuteur de bourse et compte à rebours (100 ms) */
function frameTick() {
  if (!S || !cur || cur.name !== 'race') return;
  const hh = S.heat, el = cur.el;
  if (hh.betsOpen) {
    const total = DATA.rules.rules.betWindowSec * 1000, left = Math.max(0, hh.windowEndsAt - now());
    $('#timerN', el).textContent = Math.ceil(left / 1000);
    $('#ring', el).style.strokeDashoffset = String(276.5 * (1 - left / total));
    $('#timer', el).classList.toggle('hot', left < 10000);
    const sec = Math.ceil(left / 1000);
    if (sec <= 5 && sec > 0 && cur.lastTick !== sec) { cur.lastTick = sec; snd.sfx('tick'); }
    if (sec === 10 && cur.hurry !== hh.n) { cur.hurry = hh.n; snd.play('hurry'); }
  }
  const box = $('#cdBox', el);
  if (hh.status === 'countdown') {
    const left = hh.goAt - now();
    const digit = left > 0 ? Math.ceil(left / 1000) : 0;
    if (digit !== cdLastDigit) {
      cdLastDigit = digit;
      const colors = ['', '#ffd36a', '#ff9f1c', '#ff3b57', '#ff3b57'];
      if (digit > 0) { snd.sfx(digit === 1 ? 'beepLow' : 'beep'); box.innerHTML = `<div class="countdown"><div class="digit foil" style="background:none;color:${colors[Math.min(4, digit)]};-webkit-text-fill-color:${colors[Math.min(4, digit)]}">${digit}</div></div>`; }
      else { snd.sfx('go'); box.innerHTML = `<div class="countdown go"><div class="digit">GO!</div></div>`; confetti({ x: 0.5, y: 0.5, count: 80, power: 1.2 }); }
    }
  } else if (hh.status === 'racing') {
    if (cdLastDigit !== -1) { cdLastDigit = -1; const g = h('<div class="countdown go"><div class="digit">GO!</div></div>'); box.innerHTML = ''; box.appendChild(g); setTimeout(() => { if (g.isConnected) g.remove(); }, 1100); }
  } else if (box.innerHTML && hh.status !== 'countdown' && cdLastDigit !== -1) box.innerHTML = '';
}

/* ---------------------------------------------------------------- RÉSULTAT + INTERVIEW */
let ivToken = 0;
let voiceMode = LS.get('gp.voice', 'animalese');
function sResult(s) {
  const hh = s.heat, r = hh.result;
  const key = `result:${hh.n}:${r ? 1 : 0}`;
  if (!r) return { key, html: '<div class="result"></div>' };
  const cols = r.order.map((lane, rank) => {
    const l = hh.lanes[lane], c = car(l.code), tm = l.teamId != null ? team(l.teamId) : null;
    const dnf = r.dnf.includes(lane);
    const pts = dnf ? 0 : DATA.rules.rules.heatPoints[rank];
    return `<div class="pcol" style="--lc:${LANE_COLORS[lane]}">
      ${rank === 0 && !dnf ? `<div class="crown">${icon('crown', 64)}</div>` : ''}
      ${carArt(l.code, l.teamId, 'p' + lane)}
      <div class="al">${esc(c ? c.alias : l.code)}</div>
      <div class="ow">${tm ? medal(tm.id, 40) : ''}<span>${esc(tm ? tm.nickname : 'Fantôme')}</span></div>
      <div class="step p${rank + 1} ${dnf ? 'dnf' : ''}" style="animation-delay:${(3 - rank) * 0.25}s">${dnf ? 'D.N.F.' : rank + 1}<span class="pts">${dnf ? 'sorti de piste' : '+' + pts + ' pts'}</span></div></div>`;
  }).join('');
  // bilan de la Bourse
  const net = {};
  hh.bets.forEach((b) => { net[b.teamId] = (net[b.teamId] || 0) - b.amount; });
  r.effects.bets.forEach((e) => { const b = hh.bets.find((x) => x.id === e.id); if (b) net[b.teamId] = (net[b.teamId] || 0) + e.payout; });
  const rows = Object.entries(net).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([tid, v]) => {
    const t = team(Number(tid)); return `<div class="payrow ${v < 0 ? 'lost' : ''}">${medal(Number(tid), 36)}<span class="nm">${esc(t ? t.nickname : '?')}</span><b style="${v < 0 ? 'color:var(--red)' : ''}">${v >= 0 ? '+' : ''}${v}</b>${icon('coin', 22, 'coin')}</div>`;
  }).join('') || '<div class="dim" style="font-size:20px">Aucun pari sur cette manche.</div>';
  const lines = (r.interview || []).map((l, i) => `<div class="l" data-l="${i}"><div class="av ${l.who.startsWith('Brigitte') ? 'bp' : ''}">${l.who.startsWith('Brigitte') ? 'BP' : 'JM'}</div><div><div class="who">${esc(l.who)}</div><span class="tx">${esc(l.text)}</span></div></div>`).join('');
  return {
    key,
    html: `<div class="result"><div class="podium">${cols}</div>
      <div class="sidecol"><div class="panel deco"><h4>La Bourse</h4>${rows}</div>
      <div class="panel deco" style="flex:1"><h4>Au micro</h4><div class="iv" id="iv">${lines}</div></div></div></div>`,
    mount(el) {
      snd.play('goal', { fallback: 'win' });
      const winLane = r.order.find((l) => !r.dnf.includes(l));
      if (winLane != null) {
        setTimeout(confettiCannons, 500);
        const wl = hh.lanes[winLane];
        setTimeout(() => snd.play('win', { fallback: 'win' }), 1900);
        setTimeout(() => { if (!(wl.teamId != null && snd.teamSound(wl.teamId, 'win'))) snd.carVoice(wl.code); }, 3800);
        setTimeout(() => { if (wl.teamId != null) snd.carVoice(wl.code); }, 6600);
      }
      const elim = r.effects && r.effects.eliminated;
      if (elim != null) setTimeout(() => { snd.play('elim'); setTimeout(() => snd.play('elim.voice'), 900); announce(`<div class="deco" style="padding:44px 70px;text-align:center;border-color:var(--red)"><span class="eyebrow" style="color:var(--red)">Mort Subite</span><div style="margin:12px 0">${medal(elim, 160)}</div><h2 class="display foil" style="font-size:80px;margin:0">${esc((team(elim) || {}).nickname || '')} est éliminé</h2></div>`, 4200); }, 8500);
    },
    live(st, el) {
      if (st.phase === 'INTERVIEW') runInterview(st.heat.n, st.heat.result?.interview || [], el);
      else if (st.phase === 'RESULT' && !el.dataset.preview) { el.dataset.preview = '1'; const l0 = $('[data-l="0"]', el); if (l0) l0.classList.add('on'); }
    },
    unmount() { ivToken++; snd.stopSpeaking(); },
  };
}
async function runInterview(n, lines, el) {
  if (el.dataset.iv === String(n)) return; el.dataset.iv = String(n);
  const tok = ++ivToken;
  for (let i = 0; i < lines.length; i++) {
    if (tok !== ivToken) return;
    const node = $(`[data-l="${i}"]`, el); if (node) node.classList.add('on');
    const t0 = Date.now();
    const bp = lines[i].who.startsWith('Brigitte');
    if (voiceMode === 'animalese' && snd.hasBank()) {
      const tx = node && node.querySelector('.tx');
      const full = lines[i].text;
      const ok = await snd.animalese(full, { voice: bp ? 'Otona' : 'Hakihaki', pitch: bp ? 1.18 : 0.86, onSyl: (k, nn) => { if (tx && tok === ivToken) tx.textContent = full.slice(0, Math.ceil(full.length * (k + 1) / nn)); } });
      if (tx) tx.textContent = full;
      if (!ok) await snd.speak(full, bp ? 'BP' : 'JM');
    } else await snd.speak(lines[i].text, bp ? 'BP' : 'JM');
    const min = Math.min(6500, 1500 + lines[i].text.length * 55);
    if (Date.now() - t0 < min) await sleep(min - (Date.now() - t0));
  }
}

/* ---------------------------------------------------------------- CLASSEMENT */
function sStand(s) {
  const rk = ranking(s);
  const sig = rk.map((r) => r.id + ':' + r.points + ':' + r.wins).join(',') + '|' + (s.eliminated || []).join('.');
  const max = Math.max(1, ...rk.map((r) => r.points));
  const rows = rk.map((r, i) => {
    const t = team(r.id);
    const dead = (s.eliminated || []).includes(r.id);
    return `<div class="row ${i < 3 ? 'top' + (i + 1) : ''} ${dead ? 'dead' : ''}" style="--tc:${teamAccent(r.id)}">
      <div class="rk">${i === 0 && r.points > 0 ? icon('crown', 40) : i + 1}</div>${medal(r.id, 66)}
      <div class="meta"><div class="nm">${dead ? icon('skull', 28) + ' ' : ''}${esc(t.name)}</div><div class="sub"><span>${esc(t.pilot)}</span><span>${r.wins} victoire${r.wins > 1 ? 's' : ''}</span><span>${r.podiums} podium${r.podiums > 1 ? 's' : ''}</span><span>${r.coins} ${icon('coin', 16, 'coin')}</span></div><div class="barw"><i data-w="${Math.round(r.points / max * 100)}"></i></div></div>
      <div class="sc foil">${r.points}<small>POINTS</small></div></div>`;
  }).join('');
  return {
    key: 'stand:' + sig,
    html: `<div class="stand"><div class="sec-title"><h2 class="display foil">Classement général</h2><p>Après ${s.heats.length} manche${s.heats.length > 1 ? 's' : ''}</p></div><div class="board">${rows}</div></div>`,
    mount(el) { requestAnimationFrame(() => requestAnimationFrame(() => $$('i[data-w]', el).forEach((i) => { i.style.width = i.dataset.w + '%'; }))); },
  };
}

/* ---------------------------------------------------------------- ENTRACTE (carrousel 3D des écuries) */
function sInter() {
  let st3 = null, idx = 0, timer = null;
  return {
    key: 'inter',
    html: `<div class="inter"><div class="cv"><canvas id="c3"></canvas></div><div class="txt"><span class="eyebrow">Entracte · Cocotte-minute</span><h2 class="display foil">Entracte</h2>
      <div id="spot"></div></div></div>`,
    mount(el) {
      st3 = createStage($('#c3', el), { camera: { r: 8.4, h: 2.2, look: 0.7 } });
      const show = () => {
        const t = DATA.teams[idx % DATA.teams.length]; idx++;
        st3.showConcept(t);
        $('#spot', el).innerHTML = `<div class="who">${medal(t.id, 110)}<div>${esc(t.name)}<small>Pilote : ${esc(t.pilot)} · alias « ${esc(t.nickname)} »</small></div></div>
          <div class="qt">« ${esc(t.quote)} »</div><div class="sp">${esc(t.specialty)}</div>`;
      };
      show(); timer = setInterval(show, 7000);
      snd.carol();
    },
    unmount() { clearInterval(timer); if (st3) st3.dispose(); },
  };
}

/* ---------------------------------------------------------------- CÉRÉMONIE */
function awardMeta(a) {
  const list = a.kind === 'star' ? DATA.rules.stars : DATA.rules.trophies;
  return list.find((x) => x.id === a.id) || { name: a.id, sub: '' };
}
function sCer(s) {
  const c = s.ceremony;
  let st3 = null, shown = -1, token = 0;
  const finalRank = c ? c.ranking : ranking(s);
  const list = c ? c.awards.map((a, i) => { const m = awardMeta(a); return `<div class="awi" data-a="${i}">${icon(ICON_BY_AWARD[a.id] || 'star', 26)}<b>${esc(m.name)}</b><span></span></div>`; }).join('') : '';
  return {
    key: 'cer:' + (c ? 'on' : 'off'),
    html: `<div class="cer"><div class="awlist" id="awl">${list || `<div class="panel deco"><h4>Au programme</h4><div class="dim" style="font-size:22px;line-height:1.5">Quatre étoiles bonus, six trophées en or, et la Grande Finale…<br>Qui repartira avec la coupe ?</div></div>`}</div>
      <div class="cv"><canvas id="c3"></canvas></div><div class="cerc" id="cerc"><span class="eyebrow kind">Cérémonie de clôture</span><h2 class="display foil">Remise des trophées</h2></div></div>`,
    mount(el) {
      st3 = createStage($('#c3', el), { camera: { r: 8.2, h: 2.6, look: 1.5 } });
      st3.showTrophy('grandprix');
      snd.carol();
    },
    live(st, el) {
      const cc = st.ceremony; if (!cc) return;
      const k = cc.revealed;
      $$('.awi', el).forEach((n, i) => {
        n.classList.toggle('done', i < k); n.classList.toggle('cur', i === k - 1);
        if (i < k) { const a = cc.awards[i]; const t = a.teamId != null ? team(a.teamId) : null; $('span', n).textContent = t ? t.nickname : '—'; }
      });
      if (k === shown) return; shown = k;
      const my = ++token;
      const box = $('#cerc', el);
      if (k === 0) return;
      if (k > cc.awards.length - 0 && false) return;
      const a = cc.awards[k - 1];
      const m = awardMeta(a);
      const tm = a.teamId != null ? team(a.teamId) : null;
      box.innerHTML = `<span class="eyebrow kind">${a.kind === 'star' ? 'Étoile bonus' : 'Trophée'}</span><h2 class="display foil">${esc(m.name)}</h2><div class="sub">${esc(m.sub || '')}</div><div class="dim" style="font-size:44px;margin-top:50px" class="pulse">…</div>`;
      st3.showTrophy(a.kind === 'star' ? 'star' : a.id);
      snd.sfx('drumroll');
      setTimeout(() => {
        if (my !== token) return;
        snd.sfx('award'); st3.flash(); confettiCannons();
        if (tm) setTimeout(() => snd.teamSound(tm.id, 'win'), 1600);
        box.innerHTML = `<span class="eyebrow kind">${a.kind === 'star' ? 'Étoile bonus' : 'Trophée'}</span><h2 class="display foil">${esc(m.name)}</h2><div class="sub">${esc(m.sub || '')}</div>
          <div class="winner">${tm ? medal(tm.id, 200) : ''}<div class="wn foil">${esc(tm ? tm.name : 'Personne cette fois')}</div><div class="wd">${esc(tm ? tm.pilot + (a.detail ? ' · ' + a.detail : '') : a.detail || '')}</div>${tm ? `<div class="tz">« ${esc(tm.quote)} »</div>` : ''}</div>`;
        if (k === cc.awards.length) setTimeout(() => { if (my === token) finalPodium(box, finalRank); }, 9000);
      }, 2200);
    },
    unmount() { if (st3) st3.dispose(); },
  };
}
function finalPodium(box, rk) {
  const top = rk.slice(0, 3);
  box.innerHTML = `<span class="eyebrow kind">Classement final</span><h2 class="display foil">Le Podium</h2><div class="podium3">${top.map((r, i) => `<div style="text-align:center">${medal(r.teamId, i === 0 ? 170 : 130)}<div class="display" style="font-size:${i === 0 ? 34 : 26}px;margin-top:8px">${esc(team(r.teamId).nickname)}</div><div class="foil display" style="font-size:44px">${r.points} pts</div></div>`).join('')}</div><div class="sub" style="margin-top:26px">Merci à tous — joyeux Noël !</div>`;
  snd.play('award.big', { fallback: 'win' }); confettiCannons(); setTimeout(confettiCannons, 1500); setTimeout(confettiCannons, 3000);
  if (top[0]) setTimeout(() => snd.teamSound(top[0].teamId, 'win'), 2200);
  setTimeout(() => snd.play('thanks'), 7000);
}

/* ================================================================== ÉVÉNEMENTS EN DIRECT */
function announce(html, ms = 3600) {
  const el = h(`<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(3,5,15,.78);animation:scnIn .35s both;z-index:60">${html}</div>`);
  overlay.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = 0; setTimeout(() => el.remove(), 500); }, ms);
}
function bubble(teamId, text, iconName) {
  const t = team(teamId);
  const b = h(`<div class="bubble" style="left:${120 + Math.random() * 1200}px;top:${620 + Math.random() * 260}px">${t ? medal(teamId, 40) : ''}<span>${esc(t ? t.nickname : '')}</span>${icon(iconName || 'horn', 30)}<span>${esc(text)}</span></div>`);
  overlay.appendChild(b); setTimeout(() => b.remove(), 2500);
}
/** Déclenchement en direct d'un piège asservi / lancement d'un mobile : flash plein écran, voie qui tremble. */
function trapFire(f) {
  const it = DATA.rules.shop.find((x) => x.id === f.item); if (!it) return;
  const by = team(f.teamId);
  snd.sfx('trap'); setTimeout(() => snd.sfx('crash'), 180);
  const ln = f.lane != null && cur && cur.name === 'race' ? $(`[data-lane="${f.lane}"]`, cur.el) : null;
  if (ln) { ln.classList.remove('hit'); void ln.offsetWidth; ln.classList.add('hit'); }
  const el = h(`<div class="firefx r-${it.rarity}"><div class="burst"></div><div class="fcore"><span class="ficon">${icon(it.icon, 150)}</span>
    <b class="display">${f.arch === 'mobile' ? 'LANCÉ !' : 'DÉCLENCHÉ !'}</b><span class="fname">${esc(it.name)}</span>
    <small>${by ? medal(by.id, 40) : ''} ${esc(by ? by.nickname : '')}${f.lane != null ? ' → voie ' + (f.lane + 1) : ''}</small></div></div>`);
  overlay.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 1900);
}

/** Annonce d'un objet de l'Arsenal : bandeau « kill-feed » façon finale e-sport, plein écran pour les légendaires. */
const trapQueue = [];
let trapBusy = false;
function trapFx(f) {
  const it = DATA.rules.shop.find((x) => x.id === f.item);
  if (!it) return;
  const by = team(f.teamId);
  let victim = '';
  if (f.target != null && team(f.target)) victim = team(f.target).nickname;
  else if (f.lane != null && S && S.heat.lanes[f.lane]) { const l = S.heat.lanes[f.lane]; const vt = l.teamId != null ? team(l.teamId) : null; victim = it.needsLane && it.laneLimited ? `voie ${f.lane + 1}${vt ? ' · ' + vt.nickname : ''}` : `voie ${f.lane + 1}`; }
  const ln = f.lane != null && cur && cur.name === 'race' ? $(`[data-lane="${f.lane}"]`, cur.el) : null;
  if (ln && it.laneLimited) { ln.classList.remove('hit'); void ln.offsetWidth; ln.classList.add('hit'); }
  if (it.rarity === 'legendaire') {
    announce(`<div class="arsfull r-${it.rarity}"><span class="eyebrow">Objet légendaire</span><div class="arsimg"><img src="../shared/arsenal/${it.id}.jpg" alt="" onerror="this.remove()"><span>${icon(it.icon, 170)}</span></div>
      <h2 class="display foil">${esc(it.name)}</h2><p>${by ? medal(by.id, 54) : ''}<b>${esc(by ? by.nickname : '')}</b> ${f.digital === 'steal' ? 'lâche le Fantôme sur la plus grosse fortune !' : 'déclenche l\'arme ultime'}${victim ? ' → ' + esc(victim) : ''}</p><small>${esc(it.effect)}</small></div>`, 4800);
    return;
  }
  trapQueue.push({ it, by, victim });
  pumpTraps();
}
function pumpTraps() {
  if (trapBusy || !trapQueue.length) return;
  trapBusy = true;
  const { it, by, victim } = trapQueue.shift();
  const verb = it.digital ? 'active' : it.cat === 'defense' || it.cat === 'tactique' ? 'joue' : 'pose';
  const b = h(`<div class="arsbanner r-${it.rarity}"><div class="arsthumb"><img src="../shared/arsenal/${it.id}.jpg" alt="" onerror="this.remove()"><span>${icon(it.icon, 64)}</span></div>
    <div class="arstxt"><span class="eyebrow">${({ commun: 'Piège', rare: 'Piège rare', epique: 'Piège épique' })[it.rarity] || 'Objet'} · ${esc(({ piege: 'Arsenal', tactique: 'Tactique', defense: 'Défense', chaos: 'Chaos' })[it.cat] || '')}</span>
    <div class="arsline">${by ? medal(by.id, 46) : ''}<b>${esc(by ? by.nickname : '?')}</b><em>${verb}</em><strong>${esc(it.name)}</strong>${victim ? `<em>→</em><b class="vic">${esc(victim)}</b>` : ''}</div>
    <small>${esc(it.effect)}</small></div></div>`);
  overlay.appendChild(b);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => { b.remove(); trapBusy = false; pumpTraps(); }, 450); }, trapQueue.length ? 2200 : 3400);
}
function handleFx(f) {
  switch (f.type) {
    case 'join': if (!snd.teamSound(f.teamId, 'join')) snd.sfx('join'); { const t = team(f.teamId); if (t) toast(`${t.nickname} rejoint la grille !`); } break;
    case 'reveal': if (S && S.phase === 'DRAFT') { revealQueue.push({ teamId: f.teamId, code: f.code, slot: f.slot, size: f.size }); while (revealQueue.length > 4) revealQueue.shift(); runReveals(); } break;
    case 'intro': if (f.action === 'play') playIntro(); else endIntro(false); break;
    case 'draft_order': showDraftOrder(f.order); break;
    case 'grid': snd.sfx('reveal'); gridVoices(); break;
    case 'weather': {
      const w = weatherOf(f.id); if (f.id === 'gravite') snd.play('gravity', { fallback: 'weather' }); else snd.sfx('weather');
      announce(`<div class="deco" style="padding:44px 70px;text-align:center;max-width:1100px"><span class="eyebrow">Météo du Circuit</span><div style="color:var(--gold-2);margin:10px 0">${icon(w.icon, 150)}</div><h2 class="display foil" style="font-size:90px;margin:0">${esc(w.name)}</h2><p style="font-size:30px;color:var(--ink-dim)">${esc(w.effect)}</p></div>`, 4200);
      break;
    }
    case 'chaos': {
      const c = DATA.rules.chaos[f.index]; for (let i = 0; i < 9; i++) setTimeout(() => snd.play('roulette', { rate: 1 + i * 0.04, fallback: i ? null : 'chaos' }), i * (60 + i * 18)); setTimeout(() => { snd.play('reveal'); snd.play('chaos.voice'); }, 1500);
      announce(`<div class="deco" style="padding:44px 70px;text-align:center;max-width:1200px;border-color:var(--red)"><span class="eyebrow" style="color:var(--red)">La Roue du Chaos a tranché</span><h2 class="display foil" style="font-size:82px;margin:18px 0">${esc(c.title)}</h2><p style="font-size:32px;color:var(--ink)">${esc(c.desc)}</p></div>`, 5200);
      break;
    }
    case 'grid_reveal': snd.sfx('reveal'); gridVoices(); break;
    case 'bets_open': snd.play('bets.open', { fallback: 'gong' }); break;
    case 'bets_closed': snd.play('bets.close', { fallback: 'gong' }); break;
    case 'bet': {
      snd.play('bet', { fallback: 'coin' });
      const ln = cur && cur.name === 'race' ? $(`[data-lane="${f.lane}"]`, cur.el) : null;
      if (ln) { const fl = h(`<div class="betflash" style="left:${30 + Math.random() * 200}px;top:${180 + Math.random() * 60}px">${esc((team(f.teamId) || {}).nickname || '')} +${f.amount}</div>`); ln.appendChild(fl); setTimeout(() => fl.remove(), 1800); }
      break;
    }
    case 'trap': snd.sfx('trap'); trapFx(f); break;
    case 'trap_fire': trapFire(f); break;
    case 'taunt': { if (f.id === 'signature') { if (!snd.teamSound(f.teamId, 'taunt')) snd.taunt('fanfare'); } else snd.taunt(f.id); const tz = DATA.rules.taunts.find((x) => x.id === f.id); bubble(f.teamId, f.name, tz && tz.icon); break; }
    case 'bailout': toast(`${(team(f.teamId) || {}).nickname || ''} est ruiné : Crédit Papy demandé`); snd.play('bailout', { fallback: 'error' }); break;
    case 'result': break;
    case 'music': if (f.action === 'next') music.next(); break;
    default: break;
  }
}

/* Bolides « parlants » : à la révélation de la grille, un des bolides concernés prend la parole. */
function gridVoices() {
  if (!S || !S.heat || gridVoices.n === S.heat.n) return;
  gridVoices.n = S.heat.n;
  const codes = S.heat.lanes.filter(Boolean).map((l) => l.code);
  snd.preloadCars(codes);
  const talk = codes.slice().sort(() => Math.random() - 0.5);
  setTimeout(() => { for (const c of talk) if (snd.carVoice(c)) break; }, 1400);
}

/* ================================================================== CLAVIER & SON */
const gate = $('#soundGate');
let introOnOpen = qs.get('intro') === '1';                 // ouverture depuis /start/ avec « Lancer l'intro »
if (introOnOpen) { gate.textContent = "🎬 Cliquer (ou une touche) pour lancer l'intro officielle"; gate.classList.add('intro-gate'); }
function unlockSound() {
  let started = false;
  if (introOnOpen) { introOnOpen = false; started = true; gate.classList.remove('intro-gate'); playIntro(); history.replaceState(null, '', location.pathname); }
  if (snd.unlock()) { gate.classList.add('hide'); music.unlock(); if (music.source === 'synth') { snd.setMusicOn(musicWanted); if (musicWanted) snd.musicStart(themeOf(S?.mode || curMode).music); } }
  return started;
}
gate.onclick = unlockSound;
addEventListener('pointerdown', unlockSound, { once: true });
addEventListener('keydown', (e) => {
  if (unlockSound()) { e.preventDefault(); return; }       // cette touche vient de lancer l'intro
  const k = e.key.toLowerCase();
  if (intro && (e.key === 'Escape' || e.key === ' ' || k === 'enter')) { e.preventDefault(); e.stopPropagation(); endIntro(false); return; }
  if (introBusy) { e.preventDefault(); return; }
  if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (k === 'a') { const o = $('#drawer').classList.toggle('open'); snd.play(o ? 'ui.open' : 'ui.close'); }
  else if (k === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
  else if (k === 'r') toggleModeIntro();
  else if (k === 'k') { const sk = document.documentElement.dataset.skin === 'nintendo' ? 'neon' : 'nintendo'; document.documentElement.dataset.skin = sk; LS.set('gp.skin', sk); toast(sk === 'nintendo' ? 'Habillage : console de salon' : 'Habillage : néon Art-Déco'); }
  else if (k === 'v') { voiceMode = voiceMode === 'animalese' ? 'tts' : 'animalese'; LS.set('gp.voice', voiceMode); toast(voiceMode === 'animalese' ? 'Voix des commentateurs : bulles « Animalese »' : 'Voix des commentateurs : synthèse vocale'); }
  else if (k === 'n') { musicWanted = !musicWanted; LS.set('gp.music', musicWanted ? '1' : '0'); music.setEnabled(musicWanted); toast(musicWanted ? 'Musique activée' : 'Musique coupée'); }
  else if (k === 'p') { music.next(); toast('Morceau suivant'); }
  else if (k === 'm') { snd.setMuted(!snd.isMuted()); toast(snd.isMuted() ? 'Son coupé' : 'Son activé'); }
  else if (k === ' ') { e.preventDefault(); const b = $('#nextBtn'); if (b && !b.disabled) { snd.play('ui.decide'); b.click(); } }
});
$('#drClose').onclick = () => $('#drawer').classList.remove('open');

boot();
