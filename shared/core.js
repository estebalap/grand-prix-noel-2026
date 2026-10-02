/* Noyau client commun (TV, Pit, Régie, Showroom) : détection du relais, flux SSE
   résilient, horloge synchronisée, API d'intentions idempotentes, chargement des données. */

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* mode privé */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
};
export { LS };

export const qs = new URLSearchParams(location.search);
const ASSET_BASE = new URL('../', import.meta.url).href;          // .../web/
export const asset = (p) => ASSET_BASE + p;

/* ---------------------------------------------------------------- relais */
let BASE = '';
export const relayBase = () => BASE;

async function ping(base) {
  try {
    const r = await fetch(base + '/api/v2/info', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.version ? j : null;
  } catch { return null; }
}

/** Trouve le relais : ?relay= (mémorisé) → même origine → dernière adresse connue. */
export async function findRelay() {
  const cands = [];
  const q = qs.get('relay');
  if (q) { const u = q.replace(/\/+$/, ''); LS.set('gp.relay', u); cands.push(u); }
  cands.push(location.origin.replace(/\/+$/, ''));
  const last = LS.get('gp.relay');
  if (last) cands.push(last);
  for (const c of [...new Set(cands)]) {
    if (!/^https?:/.test(c)) continue;
    const info = await ping(c);
    if (info) { BASE = c; return info; }
  }
  return null;
}
export function setRelay(url) {
  const u = url.trim().replace(/\/+$/, '');
  LS.set('gp.relay', u);
  return findRelay();
}

/* ---------------------------------------------------------------- données */
export const DATA = { teams: [], cars: {}, carList: [], rules: null, teamById: {}, logos: {} };

export async function loadData() {
  const j = async (u) => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return r.json(); };
  // Avec un relais : données servies par lui. Sans relais (hébergement statique, ex. GitHub Pages) : copies dans web/data/.
  const dataBase = BASE ? BASE + '/data/' : asset('data/');
  const rulesUrl = BASE ? BASE + '/api/v2/rules' : asset('data/rules.json');
  const [teams, cars, rules, logos] = await Promise.all([
    j(dataBase + 'teams.json'), j(dataBase + 'cars.json'), j(rulesUrl), j(asset('logos/meta.json')).catch(() => ({})),
  ]);
  DATA.teams = teams;
  DATA.teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  DATA.carList = cars;
  DATA.cars = Object.fromEntries(cars.map((c) => [c.code, c]));
  DATA.rules = rules;
  DATA.logos = logos;
  return DATA;
}
export const logoUrl = (id) => asset('logos/' + String(id).padStart(2, '0') + '.jpg');
export const team = (id) => DATA.teamById[id];
export const car = (code) => DATA.cars[code] || null;
export const weatherOf = (id) => (DATA.rules?.weather || []).find((w) => w.id === id);
export const modeOf = (id) => (DATA.rules?.modes || []).find((m) => m.id === id);
export function addCar(c) { DATA.cars[c.code] = c; }

/* ---------------------------------------------------------------- horloge */
let skew = 0;
export const now = () => Date.now() + skew;

/* ---------------------------------------------------------------- store */
export const store = { state: null, online: false, listeners: new Set(), fxListeners: new Set(), boostListeners: new Set(), seq: -1 };
export const onState = (fn) => { store.listeners.add(fn); return () => store.listeners.delete(fn); };
export const onFx = (fn) => { store.fxListeners.add(fn); return () => store.fxListeners.delete(fn); };
export const onBoost = (fn) => { store.boostListeners.add(fn); return () => store.boostListeners.delete(fn); };
const statusListeners = new Set();
export const onStatus = (fn) => { statusListeners.add(fn); fn(store.online); return () => statusListeners.delete(fn); };
function setOnline(v) { if (store.online !== v) { store.online = v; statusListeners.forEach((f) => f(v)); } }

function ingest(st) {
  if (typeof st.serverNow === 'number') skew = st.serverNow - Date.now();
  // intègre les reliques créées en cours de soirée
  (st.customCars || []).forEach(addCar);
  store.state = st;
  store.seq = st.seq;
  store.listeners.forEach((f) => { try { f(st); } catch (e) { console.error(e); } });
}

let es = null, pollTimer = null, lastMsg = 0, watchdog = null;

/** Ouvre le flux temps réel. role : 'tv' | 'pit' | 'admin'. */
export function connect(role = 'pit', token = '') {
  close();
  const url = BASE + '/api/v2/stream?role=' + encodeURIComponent(role) + (token ? '&t=' + encodeURIComponent(token) : '');
  es = new EventSource(url);
  let gotSSE = false;
  // Certains réseaux / proxys (tunnel, 4G, Wi-Fi d'entreprise) retiennent le flux temps réel sans erreur :
  // si aucun état n'arrive par le flux en quelques secondes, on passe en relève périodique (et on y reste
  // tant que le flux est muet). Dès que le flux parle, la relève s'arrête.
  clearTimeout(sseProbe);
  sseProbe = setTimeout(() => { if (!gotSSE) startPoll(); }, 3500);
  es.onopen = () => { setOnline(true); };
  es.addEventListener('state', (e) => { gotSSE = true; stopPoll(); lastMsg = Date.now(); setOnline(true); try { ingest(JSON.parse(e.data)); } catch (err) { console.error(err); } });
  es.addEventListener('fx', (e) => { gotSSE = true; lastMsg = Date.now(); try { const p = JSON.parse(e.data); store.fxListeners.forEach((f) => f(p)); } catch { /* ignore */ } });
  es.addEventListener('boost', (e) => { lastMsg = Date.now(); try { const p = JSON.parse(e.data); store.boostListeners.forEach((f) => f(p)); } catch { /* ignore */ } });
  es.onerror = () => { setOnline(false); startPoll(); };       // EventSource se reconnecte seul ; on garde un filet de sécurité
  lastMsg = Date.now();
  clearInterval(watchdog);
  watchdog = setInterval(() => {                                 // tunnel zombie : plus rien depuis 20 s → on rouvre
    if (pollTimer) return;                                       // en relève périodique, l'état arrive déjà
    if (Date.now() - lastMsg > 20000) { lastMsg = Date.now(); connect(role, token); }
  }, 5000);
  if (!visHooked) {
    visHooked = true;
    document.addEventListener('visibilitychange', () => {        // téléphone réveillé : resync immédiate
      if (!document.hidden && Date.now() - lastMsg > 4000) { pollOnce(); connect(currentRole, currentToken); }
    });
  }
  currentRole = role; currentToken = token;
}
let sseProbe = null, visHooked = false, currentRole = 'pit', currentToken = '';
function close() { if (es) { es.close(); es = null; } }
async function pollOnce() {
  try {
    const r = await fetch(BASE + '/api/v2/state', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const st = await r.json();
    if (!store.state || (st.seq || 0) >= (store.seq || 0)) ingest(st);
    setOnline(true);
  } catch { setOnline(false); }
}
function startPoll() {
  if (pollTimer) return;
  pollOnce();
  pollTimer = setInterval(pollOnce, 2000);
}
function stopPoll() { clearInterval(pollTimer); pollTimer = null; }

/* ---------------------------------------------------------------- API */
async function post(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = {};
  try { j = await r.json(); } catch { /* corps vide */ }
  if (!r.ok || j.ok === false) { const e = new Error(j.message || j.error || ('HTTP ' + r.status)); e.code = j.error || ('http_' + r.status); throw e; }
  return j;
}

const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const player = {
  token: LS.get('gp.token'), teamId: Number(LS.get('gp.team') || 0) || null,
  async claim(teamId, force = false) {
    const j = await post('/api/v2/claim', { teamId, token: this.token && this.teamId === teamId ? this.token : undefined, force });
    this.token = j.token; this.teamId = teamId;
    LS.set('gp.token', j.token); LS.set('gp.team', String(teamId));
    return j;
  },
  forget() { this.token = null; this.teamId = null; LS.del('gp.token'); LS.del('gp.team'); },
  async intent(type, payload = {}) {
    if (!this.token) throw Object.assign(new Error('Pas de session'), { code: 'unauthorized' });
    return post('/api/v2/intent', { t: this.token, type, payload, id: rid() });
  },
};

export const admin = {
  pin: LS.get('gp.pin') || '',
  setPin(p) { this.pin = String(p || '').trim(); LS.set('gp.pin', this.pin); },
  async tryLocalPin() {                                          // la TV, sur le PC de la régie, récupère le PIN seule
    try {
      const r = await fetch(BASE + '/api/v2/local-admin', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (j.pin) { this.setPin(j.pin); return true; } }
    } catch { /* hors boucle locale */ }
    return false;
  },
  cmd(type, payload = {}) { return post('/api/v2/admin', { pin: this.pin, type, payload }); },
};

/* ---------------------------------------------------------------- utilitaires */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmtOdds = (o) => '×' + (Math.round(o * 10) / 10).toFixed(1).replace('.', ',');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const LANE_COLORS = ['#ff4d6d', '#4cc9f0', '#3ddc97', '#ffd166'];

export function teamColors(id) {
  const t = team(id);
  return t ? t.colors : ['#8fdcff', '#9b6bff'];
}
/** Classement général trié (points, victoires, id). */
export function ranking(state) {
  return Object.entries(state.standings.teams)
    .map(([id, s]) => ({ id: Number(id), ...s, coins: state.players[id]?.coins ?? 0 }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.id - b.id);
}
export function lanesOf(state) {
  return state.heat.lanes.map((l, i) => (l ? { lane: i, ...l, car: l.code ? car(l.code) : null, team: l.teamId != null ? team(l.teamId) : null } : null));
}
export function myBets(state, tid) { return state.heat.bets.filter((b) => b.teamId === tid); }
