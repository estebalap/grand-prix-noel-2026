/* Console de régie (partagée par le tiroir de la TV et par /regie/ sur téléphone).
   Principe : un gros bouton « ÉTAPE SUIVANTE » qui sait toujours quoi faire, et dessous
   tous les leviers manuels pour reprendre la main à tout moment. */
import { DATA, admin, store, onState, esc, h, $, $$, team, car, logoUrl, weatherOf, modeOf, ranking, LANE_COLORS, now, relayBase } from './core.js';
import { icon } from './icons.js';

const KINDS = [['poule', 'Poule'], ['demi', 'Demi-finale'], ['finale', 'Grande Finale'], ['reliques', 'Coupe des Reliques']];
const PHASE_LABEL = { LOBBY: 'Accueil', DRAFT: 'Draft', GRID: 'Grille', BETTING: 'Bourse', COUNTDOWN: 'Départ', RACING: 'Course', RESULT: 'Résultat', INTERVIEW: 'Interview', STANDINGS: 'Classement', INTERMISSION: 'Entracte', CEREMONY: 'Cérémonie' };

export function mountAdmin(root, { onToast = () => {}, compact = false } = {}) {
  const ui = { kind: 'poule', weatherDone: {}, chaosDone: {}, open: new Set(['next']), resultOrder: [], dnf: new Set(), spun: new Set(), resultOpen: false, manual: ['', '', '', ''], draftCode: '', draftTeam: 1, busy: false };

  let musicLib = null;
  async function loadMusicLib() {
    try { const r = await fetch(relayBase() + '/api/v2/music', { cache: 'no-store' }); if (r.ok) { musicLib = await r.json(); render(); } } catch { /* ignore */ }
  }
  loadMusicLib();

  async function run(type, payload = {}, ok) {
    if (ui.busy) return;
    ui.busy = true;
    try { await admin.cmd(type, payload); if (ok) onToast(ok, 'ok'); }
    catch (e) { onToast(e.message || 'Erreur', 'err'); if (e.code === 'bad_pin') { render(true); } }
    finally { ui.busy = false; }
  }

  /* ------------------------------------------------------------ étape suivante */
  function nextStep(s) {
    const hh = s.heat, mode = modeOf(s.mode) || { betting: true };
    const n = hh.n;
    const has = (id) => !!document.getElementById(id);
    if (s.phase === 'LOBBY') return { label: 'Ouvrir le Draft', sub: 'Les invités entrent les codes de leurs bolides', act: () => run('phase.set', { phase: 'DRAFT' }) };
    if (s.phase === 'DRAFT' && (hh.status === 'idle' || hh.status === 'finished')) {
      return { label: 'Tirer la grille — manche ' + (n + 1), sub: 'Tirage au sort de 4 paddocks, un bolide par voie (' + KINDS.find((k) => k[0] === ui.kind)[1] + ')', act: () => run('heat.setup', { kind: ui.kind }) };
    }
    if (s.phase === 'CEREMONY') {
      const c = s.ceremony;
      if (!c) return { label: 'Lancer la Cérémonie', sub: 'Calcul des étoiles et des trophées', act: () => run('ceremony.start') };
      if (c.revealed < c.awards.length) return { label: 'Révéler le prix ' + (c.revealed + 1) + ' / ' + c.awards.length, sub: 'Roulement de tambour…', act: () => run('ceremony.next') };
      return { label: 'Cérémonie terminée', sub: 'Bravo à tous !', disabled: true, act: () => {} };
    }
    switch (hh.status) {
      case 'setup':
        if (!ui.weatherDone[n]) return { label: 'Lancer la Météo du Circuit', sub: 'Un aléa météo pour cette manche', act: async () => { ui.weatherDone[n] = true; await run('weather.roll', {}); } };
        if (!ui.chaosDone[n]) return { label: 'Tourner la Roue du Chaos', sub: 'Optionnel : une carte Chaos pimente la manche', alt: { label: 'Passer', act: () => { ui.chaosDone[n] = true; render(); } }, act: async () => { ui.chaosDone[n] = true; await run('chaos.spin', {}); } };
        if (!hh.gridRevealed) return { label: 'Révéler la grille', sub: 'Brouillard : les bolides étaient cachés', act: () => run('grid.reveal') };
        if (mode.betting) return { label: 'Ouvrir la Bourse (' + DATA.rules.rules.betWindowSec + ' s)', sub: 'Paris et pièges ouverts sur les téléphones', alt: { label: 'Départ direct', act: () => run('race.start') }, act: () => run('bets.open') };
        return { label: 'Lancer le départ', sub: '3-2-1-GO', act: () => run('race.start') };
      case 'betting': return { label: 'Fermer la Bourse et partir', sub: 'Compte à rebours 3-2-1-GO', act: () => run('race.start') };
      case 'closed': return { label: 'Lancer le départ', sub: '3-2-1-GO', act: () => run('race.start') };
      case 'countdown': return { label: 'Départ en cours…', sub: '', disabled: true, act: () => {} };
      case 'racing': return { label: 'Saisir le résultat', sub: 'Touche les bolides dans l\'ordre d\'arrivée', act: () => { ui.resultOpen = true; ui.resultOrder = []; ui.dnf.clear(); ui.spun.clear(); render(); } };
      case 'finished':
        if (s.phase === 'RESULT') return { label: 'Lancer l\'interview', sub: 'Jean-Michel et Brigitte commentent', act: () => run('phase.set', { phase: 'INTERVIEW' }) };
        if (s.phase === 'INTERVIEW') return { label: 'Afficher le classement', sub: '', act: () => run('phase.set', { phase: 'STANDINGS' }) };
        return { label: 'Manche suivante', sub: 'Tirer la grille de la manche ' + (n + 1), alt: { label: 'Entracte', act: () => run('phase.set', { phase: 'INTERMISSION' }) }, act: () => run('heat.setup', { kind: ui.kind }) };
      default: break;
    }
    return { label: 'Tirer la grille — manche ' + (n + 1), sub: '', act: () => run('heat.setup', { kind: ui.kind }) };
  }

  /* ------------------------------------------------------------ rendu */
  function section(id, title, body) {
    const open = ui.open.has(id);
    return `<section class="adm-sec ${open ? 'open' : ''}" data-sec="${id}"><button class="adm-sec-h" data-toggle="${id}"><span>${title}</span><i>${open ? '–' : '+'}</i></button>${open ? `<div class="adm-sec-b">${body}</div>` : ''}</section>`;
  }
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const teamOpts = (cur) => opt(DATA.teams.map((t) => [t.id, `${String(t.id).padStart(2, '0')} · ${t.pilot} — ${t.name}`]), cur);

  function render(askPin = false) {
    const s = store.state;
    if (!s || !DATA.rules) { root.innerHTML = '<p class="adm-note">Connexion au relais…</p>'; return; }
    if (askPin || !admin.pin) {
      root.innerHTML = `<div class="adm-pin"><h3>Code Régie</h3><p>Entre le code PIN affiché dans la console du relais.</p><input id="pinIn" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off"><button class="btn" id="pinOk">Entrer en régie</button></div>`;
      $('#pinOk', root).onclick = () => { admin.setPin($('#pinIn', root).value); render(); };
      return;
    }
    const hh = s.heat, step = nextStep(s);
    const w = weatherOf(hh.weather);
    const lanesHtml = hh.lanes.map((l, i) => {
      if (!l) return `<div class="adm-lane" style="--lc:${LANE_COLORS[i]}"><b>V${i + 1}</b><span class="dim">vide</span></div>`;
      const c = l.code ? car(l.code) : null, t = l.teamId != null ? team(l.teamId) : null;
      return `<div class="adm-lane" style="--lc:${LANE_COLORS[i]}"><b>V${i + 1}</b><span>${esc(c ? c.alias : '???')}</span><small>${esc(t ? t.pilot : 'Fantôme')}</small></div>`;
    }).join('');

    const timeLeft = hh.betsOpen ? Math.max(0, Math.ceil((hh.windowEndsAt - now()) / 1000)) : null;

    const head = `
      <div class="adm-head">
        <div><span class="adm-phase">${PHASE_LABEL[s.phase] || s.phase}</span> <span class="dim">Manche ${hh.n} · ${esc(hh.kind)}${w ? ' · ' + esc(w.name) : ''}${timeLeft !== null ? ' · Bourse ' + timeLeft + ' s' : ''}</span></div>
        <div class="adm-lanes">${lanesHtml}</div>
      </div>
      <button class="btn adm-next" id="nextBtn" ${step.disabled ? 'disabled' : ''}>${esc(step.label)}</button>
      <div class="adm-next-sub">${esc(step.sub || '')}${step.alt ? ` <button class="adm-link" id="altBtn">${esc(step.alt.label)}</button>` : ''}</div>`;

    const secPhases = section('phases', 'Phases de l\'émission', `<div class="adm-grid">${Object.keys(PHASE_LABEL).map((p) => `<button class="btn ghost sm ${s.phase === p ? 'on' : ''}" data-phase="${p}">${PHASE_LABEL[p]}</button>`).join('')}</div>
      <label>Mode de jeu</label><select id="modeSel">${opt(DATA.rules.modes.map((m) => [m.id, m.name]), s.mode)}</select>`);

    const secHeat = section('heat', 'Manche & grille', `
      <label>Type de manche</label><select id="kindSel">${opt(KINDS, ui.kind)}</select>
      <div class="adm-row"><button class="btn sm" id="setupRand">Tirage au sort</button><button class="btn ghost sm" id="cancelRes" ${hh.result ? '' : 'disabled'}>Annuler le résultat</button></div>
      <label>Grille manuelle (codes gommettes, ex : B07)</label>
      <div class="adm-manual">${[0, 1, 2, 3].map((i) => `<input data-man="${i}" placeholder="Voie ${i + 1}" value="${esc(ui.manual[i])}" autocapitalize="characters">`).join('')}</div>
      <button class="btn ghost sm" id="setupMan">Valider la grille manuelle</button>`);

    const secWeather = section('weather', 'Météo & Chaos', `
      <div class="adm-grid">${DATA.rules.weather.map((x) => `<button class="btn ghost sm ${hh.weather === x.id ? 'on' : ''}" data-weather="${x.id}">${icon(x.icon, 16)} ${esc(x.name)}</button>`).join('')}</div>
      <button class="btn ghost sm" data-weather="">Météo aléatoire</button>
      <label>Roue du Chaos</label>
      <select id="chaosSel"><option value="">Au hasard…</option>${DATA.rules.chaos.map((c, i) => `<option value="${i}" ${hh.chaos === i ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select>
      <button class="btn ghost sm" id="chaosGo">Appliquer</button>`);

    const secBourse = section('bourse', 'Bourse & départ', `<div class="adm-row">
      <button class="btn sm" id="betOpen">Ouvrir la Bourse</button><button class="btn ghost sm" id="betClose">Fermer</button>
      <button class="btn green sm" id="goBtn">Départ</button></div>`);

    const secPlayers = section('players', 'Écuries & pièces', `<div class="adm-players">${DATA.teams.map((t) => {
      const p = s.players[t.id], on = s.online.includes(t.id), br = s.bailouts.includes(t.id);
      return `<div class="adm-pl"><span class="dot ${on ? 'on' : p.claimed ? 'idle' : ''}"></span><span class="n">${String(t.id).padStart(2, '0')}</span><span class="nm">${esc(t.pilot)}</span><b class="coin">${p.coins}</b>
        <button class="mini" data-coin="${t.id}" data-d="-10">−10</button><button class="mini" data-coin="${t.id}" data-d="10">+10</button>
        ${br ? `<button class="mini hot" data-bail="${t.id}">Crédit Papy</button>` : ''}${p.claimed ? `<button class="mini" data-rel="${t.id}">Libérer</button>` : ''}</div>`;
    }).join('')}</div>`);

    const secDraft = section('draft', 'Draft & Reliques', `
      <label>Attribuer un bolide à une écurie</label>
      <div class="adm-row"><input id="drCode" placeholder="Code (B07)" value="${esc(ui.draftCode)}" autocapitalize="characters"><select id="drTeam">${teamOpts(ui.draftTeam)}</select></div>
      <div class="adm-row"><button class="btn sm" id="drAssign">Attribuer</button><button class="btn ghost sm" id="drRemove">Retirer ce code</button></div>
      <label>Nouvelle Relique d'enfance</label>
      <div class="adm-row"><input id="rlCode" placeholder="Code (R21…)"><input id="rlName" placeholder="Nom"></div>
      <div class="adm-row"><input id="rlSpd" type="number" placeholder="Vitesse 55" min="10" max="100"><button class="btn ghost sm" id="rlAdd">Ajouter la relique</button></div>`);

    const secFree = section('free', 'Accès libre (skip)', `<p class="adm-note">${s.skip ? 'ACTIF : toutes les écuries peuvent être prises depuis n\'importe quel téléphone, sans draft à saisir.' : 'Saute l\'installation : draft automatique de bolides pour chaque écurie, passage direct à la grille, écuries ouvertes à tous.'}</p>
      <div class="adm-row"><button class="btn sm" id="skOn">${s.skip ? 'Relancer le draft auto' : 'Activer l\'accès libre'}</button><button class="btn ghost sm" id="skAuto">Draft auto (+5)</button>${s.skip ? '<button class="btn ghost sm" id="skOff">Désactiver</button>' : ''}</div>`);

    const folder = (DATA.rules.musicFolders || {})[s.mode] || '';
    const nLocal = musicLib ? ((musicLib.folders || {})[folder] || []).length : null;
    const yt = (s.music && s.music.youtube && s.music.youtube[s.mode]) || null;
    const srcTxt = nLocal ? `${nLocal} morceau(x) dans <b>Musique/${esc(folder)}</b> (prioritaire)` : yt ? `Playlist YouTube ${esc(yt.list || yt.video)}` : 'Musique de synthèse (aucune playlist pour ce mode)';
    const secMusic = section('music', 'Musique du mode', `<p class="adm-note">Mode « ${esc((modeOf(s.mode) || {}).name || s.mode)} » : ${srcTxt}.</p>
      <div class="adm-row"><button class="btn sm" id="muNext">Morceau suivant</button><button class="btn ghost sm" id="muRescan">Relire le dossier</button></div>
      <label>Lien de playlist YouTube pour ce mode</label>
      <div class="adm-row"><input id="muYt" placeholder="https://www.youtube.com/playlist?list=…" value="${esc(ui.ytUrl || '')}"><button class="btn ghost sm" id="muYtSave">Associer</button>${yt ? '<button class="btn ghost sm" id="muYtDel">Retirer</button>' : ''}</div>
      <p class="adm-note">Les fichiers déposés dans le dossier du mode passent avant YouTube. Touche P sur la TV = morceau suivant, N = couper/remettre la musique.</p>`);

    const secCeremony = section('ceremony', 'Cérémonie', `<div class="adm-row"><button class="btn sm" id="cerStart">Lancer la cérémonie</button><button class="btn ghost sm" id="cerNext">Prix suivant</button></div>
      <p class="adm-note">Votes reçus — Cascadeur : ${Object.keys(s.votes.cascadeur || {}).length} · Cuillère : ${Object.keys(s.votes.cuillere || {}).length}</p>`);

    const secDanger = section('danger', 'Zone rouge', `<button class="btn red sm" id="resetAll">Nouvelle soirée (tout remettre à zéro)</button><p class="adm-note">Le journal de la soirée précédente reste archivé dans le dossier d'état du relais.</p>`);

    const resultModal = ui.resultOpen ? `
      <div class="adm-modal"><div class="adm-modal-in deco">
        <h3>Ordre d'arrivée</h3><p class="adm-note">Touche les bolides du 1er au dernier. D.N.F. = sorti de piste, T.Q. = tête-à-queue.</p>
        ${hh.lanes.map((l, i) => {
          if (!l) return '';
          const c = l.code ? car(l.code) : null, t = l.teamId != null ? team(l.teamId) : null, rank = ui.resultOrder.indexOf(i);
          return `<div class="adm-res" style="--lc:${LANE_COLORS[i]}"><button class="adm-res-main ${rank >= 0 ? 'ranked' : ''}" data-rank="${i}"><span class="rk">${rank >= 0 ? rank + 1 : '·'}</span><span class="nm">${esc(c ? c.alias : '?')}<small>${esc(t ? t.name : 'Fantôme')}</small></span></button>
            <button class="mini ${ui.dnf.has(i) ? 'hot' : ''}" data-dnf="${i}">D.N.F.</button><button class="mini ${ui.spun.has(i) ? 'hot' : ''}" data-spun="${i}">T.Q.</button></div>`;
        }).join('')}
        <div class="adm-row"><button class="btn ghost sm" id="resReset">Recommencer</button><button class="btn sm" id="resCancel">Fermer</button><button class="btn green sm" id="resOk" ${ui.resultOrder.length === hh.lanes.filter(Boolean).length ? '' : 'disabled'}>Valider</button></div>
      </div></div>` : '';

    root.innerHTML = head + secPhases + secHeat + secWeather + secBourse + secPlayers + secDraft + secFree + secMusic + secCeremony + secDanger + resultModal;
    bind(s, step);
  }

  function bind(s, step) {
    const g = (id) => root.querySelector('#' + id);
    const nb = g('nextBtn'); if (nb) nb.onclick = () => step.act();
    const ab = g('altBtn'); if (ab) ab.onclick = () => step.alt.act();
    $$('[data-toggle]', root).forEach((b) => b.onclick = () => { const id = b.dataset.toggle; ui.open.has(id) ? ui.open.delete(id) : ui.open.add(id); render(); });
    $$('[data-phase]', root).forEach((b) => b.onclick = () => run('phase.set', { phase: b.dataset.phase }));
    const ms = g('modeSel'); if (ms) ms.onchange = () => run('mode.set', { mode: ms.value }, 'Mode changé');
    const ks = g('kindSel'); if (ks) ks.onchange = () => { ui.kind = ks.value; render(); };
    const my = g('muYt'); if (my) my.oninput = () => { ui.ytUrl = my.value; };
    const mn = g('muNext'); if (mn) mn.onclick = () => run('music.next', {}, 'Morceau suivant');
    const mr = g('muRescan'); if (mr) mr.onclick = () => { loadMusicLib(); onToast('Dossier relu', 'ok'); };
    const ms2 = g('muYtSave'); if (ms2) ms2.onclick = () => { const v = g('muYt').value.trim(); if (v) { run('music.youtube', { mode: s.mode, url: v }, 'Playlist YouTube associée'); ui.ytUrl = ''; } };
    const md = g('muYtDel'); if (md) md.onclick = () => run('music.youtube', { mode: s.mode, url: '' }, 'Playlist retirée');
    const sk1 = g('skOn'); if (sk1) sk1.onclick = () => run('skip.enable', {}, 'Accès libre activé');
    const sk2 = g('skAuto'); if (sk2) sk2.onclick = () => run('draft.auto', { count: 5 }, 'Draft auto effectué');
    const sk3 = g('skOff'); if (sk3) sk3.onclick = () => run('skip.disable', {}, 'Accès libre désactivé');
    const sr = g('setupRand'); if (sr) sr.onclick = () => run('heat.setup', { kind: ui.kind }, 'Grille tirée');
    const cr = g('cancelRes'); if (cr) cr.onclick = () => confirm('Annuler le résultat de cette manche ?') && run('race.cancel', {}, 'Résultat annulé');
    $$('[data-man]', root).forEach((i) => i.oninput = () => { ui.manual[Number(i.dataset.man)] = i.value; });
    const sm = g('setupMan'); if (sm) sm.onclick = () => run('heat.setup', { kind: ui.kind, lanes: ui.manual.map((c) => (c.trim() ? { code: c.trim() } : null)) }, 'Grille posée');
    $$('[data-weather]', root).forEach((b) => b.onclick = () => { ui.weatherDone[s.heat.n] = true; run('weather.roll', b.dataset.weather ? { id: b.dataset.weather } : {}); });
    const cg = g('chaosGo'); if (cg) cg.onclick = () => { const v = g('chaosSel').value; ui.chaosDone[s.heat.n] = true; run('chaos.spin', v === '' ? {} : { index: Number(v) }); };
    const bo = g('betOpen'); if (bo) bo.onclick = () => run('bets.open');
    const bc = g('betClose'); if (bc) bc.onclick = () => run('bets.close');
    const gb = g('goBtn'); if (gb) gb.onclick = () => run('race.start');
    $$('[data-coin]', root).forEach((b) => b.onclick = () => run('player.coins', { teamId: Number(b.dataset.coin), delta: Number(b.dataset.d), reason: 'ajustement régie' }));
    $$('[data-bail]', root).forEach((b) => b.onclick = () => run('bailout.grant', { teamId: Number(b.dataset.bail) }, 'Crédit Papy accordé'));
    $$('[data-rel]', root).forEach((b) => b.onclick = () => run('player.release', { teamId: Number(b.dataset.rel) }, 'Écurie libérée'));
    const dc = g('drCode'); if (dc) dc.oninput = () => { ui.draftCode = dc.value; };
    const dt = g('drTeam'); if (dt) dt.onchange = () => { ui.draftTeam = Number(dt.value); };
    const da = g('drAssign'); if (da) da.onclick = () => run('draft.assign', { code: ui.draftCode, teamId: ui.draftTeam }, 'Bolide attribué');
    const dr = g('drRemove'); if (dr) dr.onclick = () => run('draft.remove', { code: ui.draftCode }, 'Bolide retiré');
    const ra = g('rlAdd'); if (ra) ra.onclick = () => run('relic.add', { code: g('rlCode').value, alias: g('rlName').value, vitesse: Number(g('rlSpd').value || 55) }, 'Relique ajoutée');
    const cs = g('cerStart'); if (cs) cs.onclick = () => run('ceremony.start');
    const cn = g('cerNext'); if (cn) cn.onclick = () => run('ceremony.next');
    const rs = g('resetAll'); if (rs) rs.onclick = () => { if (confirm('Tout remettre à zéro ?') && confirm('Vraiment ? Les points et pièces seront effacés.')) run('state.reset', { confirm: 'RESET' }, 'Nouvelle soirée'); };
    // saisie du résultat
    $$('[data-rank]', root).forEach((b) => b.onclick = () => { const i = Number(b.dataset.rank); const k = ui.resultOrder.indexOf(i); if (k >= 0) ui.resultOrder.splice(k, 1); else ui.resultOrder.push(i); render(); });
    $$('[data-dnf]', root).forEach((b) => b.onclick = () => { const i = Number(b.dataset.dnf); ui.dnf.has(i) ? ui.dnf.delete(i) : ui.dnf.add(i); render(); });
    $$('[data-spun]', root).forEach((b) => b.onclick = () => { const i = Number(b.dataset.spun); ui.spun.has(i) ? ui.spun.delete(i) : ui.spun.add(i); render(); });
    const rr = g('resReset'); if (rr) rr.onclick = () => { ui.resultOrder = []; ui.dnf.clear(); ui.spun.clear(); render(); };
    const rc = g('resCancel'); if (rc) rc.onclick = () => { ui.resultOpen = false; render(); };
    const ro = g('resOk'); if (ro) ro.onclick = async () => { await run('race.result', { order: ui.resultOrder, dnf: [...ui.dnf], spun: [...ui.spun] }, 'Résultat enregistré'); ui.resultOpen = false; render(); };
  }

  let last = 0;
  onState(() => {
    if (document.activeElement && root.contains(document.activeElement) && /^(INPUT|SELECT)$/.test(document.activeElement.tagName)) return;   // ne pas casser une saisie
    const t = performance.now(); if (t - last < 250) return; last = t; render();
  });
  setInterval(() => { const s = store.state; if (s && s.heat.betsOpen && !(document.activeElement && /^(INPUT|SELECT)$/.test(document.activeElement.tagName))) render(); }, 1000);
  render();
  return { render };
}

export const ADMIN_CSS = `
.adm-head{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
.adm-phase{font-family:var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--gold-2);font-weight:700}
.dim{color:var(--ink-dim)}.adm-note{color:var(--ink-dim);font-size:.85em;margin:.4em 0}
.adm-lanes{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.adm-lane{border-left:4px solid var(--lc);background:var(--glass);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;min-width:0;font-size:.78em}
.adm-lane b{color:var(--lc)}.adm-lane span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adm-lane small{color:var(--ink-dim)}
.adm-next{width:100%;font-size:1.15em;padding:1.1em 1em}.adm-next-sub{color:var(--ink-dim);font-size:.85em;margin:.6em 0 1em;min-height:1.2em}
.adm-link{background:none;border:0;color:var(--ice);text-decoration:underline;padding:0 .4em}
.adm-sec{border-top:1px solid var(--hair)}.adm-sec-h{width:100%;display:flex;justify-content:space-between;background:none;border:0;padding:.9em 0;font-family:var(--font-display);letter-spacing:.12em;text-transform:uppercase;font-size:.85em;color:var(--ink)}
.adm-sec-b{padding-bottom:12px}.adm-sec label{display:block;margin:10px 0 4px;font-size:.78em;color:var(--ink-dim)}
.adm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:8px}
.adm-row{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap}.adm-row>*{flex:1 1 auto;min-width:0}
.adm-manual{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:6px}
.adm-sec input,.adm-sec select,.adm-pin input{width:100%;background:rgba(0,0,0,.35);border:1px solid var(--hair);border-radius:10px;color:var(--ink);padding:.6em .7em;font:inherit}
.btn.sm{font-size:.78em;padding:.7em .9em;box-shadow:0 4px 0 #7a4b08,0 8px 18px rgba(0,0,0,.4)}
.btn.sm.green{box-shadow:0 4px 0 #064a32,0 8px 18px rgba(0,0,0,.4)}.btn.sm.red{box-shadow:0 4px 0 #6d0a1c,0 8px 18px rgba(0,0,0,.4)}
.btn.ghost.sm{box-shadow:none}.btn.ghost.on{background:rgba(255,211,106,.22);border-color:var(--gold-2)}
.adm-players{display:flex;flex-direction:column;gap:4px}
.adm-pl{display:flex;align-items:center;gap:6px;font-size:.82em;background:var(--glass);border-radius:10px;padding:5px 8px}
.adm-pl .n{color:var(--ink-faint);width:1.6em}.adm-pl .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot{width:9px;height:9px;border-radius:50%;background:#444;flex:none}.dot.on{background:var(--pine);box-shadow:0 0 8px var(--pine)}.dot.idle{background:var(--gold-3)}
.mini{background:var(--glass-2);border:1px solid var(--hair);border-radius:8px;padding:.2em .55em;font-size:.85em}.mini.hot{background:var(--red);border-color:var(--red);color:#fff}
.adm-pin{text-align:center;display:flex;flex-direction:column;gap:12px;padding:20px 0}
.adm-modal{position:fixed;inset:0;z-index:1000;background:rgba(2,4,14,.82);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}
.adm-modal-in{width:min(520px,100%);padding:20px;background:#0c1331}.adm-modal-in h3{margin:0 0 4px;font-family:var(--font-display);letter-spacing:.1em;text-transform:uppercase}
.adm-res{display:flex;gap:6px;align-items:stretch;margin:6px 0;border-left:5px solid var(--lc);border-radius:10px}
.adm-res-main{flex:1;display:flex;gap:10px;align-items:center;background:var(--glass);border:1px solid var(--hair);border-radius:10px;padding:8px 10px;text-align:left}
.adm-res-main.ranked{background:rgba(255,211,106,.18);border-color:var(--gold-2)}.adm-res-main .rk{font:800 1.6em var(--font-display);width:1.2em;color:var(--gold-2)}
.adm-res-main .nm{display:flex;flex-direction:column;min-width:0}.adm-res-main small{color:var(--ink-dim)}
`;
