// CAPTURE DU VRAI POCKET PIT (/pit/) EN MODE CONNECTÉ, avec un RELAIS SIMULÉ — sources de l'écran du téléphone 3D de la V9.
//   node Intro_3D/v9_ring/outils_v9/capturer_pit.js [--sortie Intro_3D/v9_ring/data/telephone] [--brut]
//
// Le dépôt ne contient pas le relais (serveur Python du PC de la régie) : sans lui la page affiche « CIRCUIT INTROUVABLE ».
// Ce script sert la racine du dépôt (comme apercu_v9.js) et SIMULE le relais dans le navigateur :
//   • page.route('**/api/v2/**')  : info, rules (= data/rules.json), state, claim, intent (bet, case.open, trap.use…) ;
//   • EventSource remplacé (addInitScript) par un flux factice : le script POUSSE des états JSON conformes à ce que lit
//     pit.js (phase, heat.lanes/odds/bets/traps, players[].coins/inventory/loot, casePrices, loot.commit…) ;
//   • localStorage pré-rempli (gp.token, gp.team) : la page démarre directement CONNECTÉE à l'écurie n° 3 (Zabou) ;
//   • Math.random semé, horloge du navigateur figée au départ : captures reproductibles.
// Puis il JOUE la page comme un invité (clics réels) : choisir la Mégane, miser 50, gagner, ouvrir une caisse BONUS
// Marché Noir (Étoile d'Invincibilité, légendaire) et une caisse PIÈGES (Bascule Hazzard, épique), viser une voie.
// Sorties (PNG quantifiés, < 400 Ko) + index.json (géométrie des zones utiles, en pixels des captures) :
//   paris_a.png / paris_b.png / paris_c.png  écran Piste en hauteur (≈ 390×1500 CSS) : avant choix, Mégane choisie, mise placée
//   resultat.png                             écran Résultat (VICTOIRE !) 390×844
//   bourse.png                               bandeau du haut (porte-monnaie) à N valeurs successives, empilées verticalement
//   caisses.png                              Arsenal › Caisses en hauteur
//   roulette_1..3.png                        roulette de caisse en cours (390×844)
//   bonus.png / piege.png                    panneaux de révélation (objet doré / piège) ;  cible.png : choix de la voie visée
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

const RACINE = path.resolve(__dirname, '..', '..', '..');
const a = process.argv.slice(2), opt = (n, d) => { const i = a.indexOf(n); return i < 0 ? d : a[i + 1]; };
const SORTIE = path.resolve(RACINE, opt('--sortie', 'Intro_3D/v9_ring/data/telephone'));
const BRUT = a.includes('--brut');
const port = 9100 + (process.pid % 80);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => {
  let f = path.join(RACINE, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
}).listen(port, '127.0.0.1');

/* ───────────────────────── données de démonstration (plausibles, conformes au relais) ───────────────────────── */
const REGLES = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/rules.json'), 'utf8'));
const EQUIPES = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/teams.json'), 'utf8'));
const MOI = 3;                                                     // Zabou — « Le Pit » de l'invité filmé
const VOIES = [{ code: 'B02', teamId: 1 }, { code: 'FR02', teamId: MOI }, { code: 'J01', teamId: 9 }, { code: 'TK05', teamId: 12 }, { code: 'F02', teamId: 5 }];
const ODDS = { win: [2.6, 3.4, 4.2, 6.5, 2.9], podium: [1.5, 1.8, 2.1, 3.0, 1.6], crash: [4, 4, 4, 4, 4], pWin: [0.31, 0.24, 0.19, 0.09, 0.27],
  belief: [{ confidence: 0.74, races: 3 }, { confidence: 0.62, races: 2 }, { confidence: 0.55, races: 2 }, { confidence: 0.38, races: 1 }, { confidence: 0.7, races: 3 }],
  kelly: { win: [0, 0.07, 0, 0, 0.02], podium: [0.03, 0.05, 0, 0, 0.04], crash: [0, 0, 0, 0, 0] }, relic: [false, false, false, false, false] };
const PADDOCKS = { 1: ['B02', 'B15', 'J10', 'E07', 'U05', 'H12'], 3: ['FR02', 'FR04', 'TK02', 'P01', 'J02', 'E04'], 5: ['F02', 'F04', 'B06', 'J11', 'U03', 'H01'],
  9: ['J01', 'J07', 'TK04', 'FR03', 'B13', 'E02'], 12: ['TK05', 'TK01', 'P04', 'J05', 'F06', 'H09'] };
const POINTS = { 1: [14, 2, 3], 2: [9, 1, 2], 3: [11, 1, 3], 4: [6, 0, 2], 5: [15, 2, 3], 6: [5, 0, 1], 7: [8, 1, 1], 8: [4, 0, 1], 9: [12, 1, 3], 10: [7, 1, 1],
  11: [3, 0, 1], 12: [10, 1, 2], 13: [6, 0, 2], 14: [2, 0, 0], 15: [5, 0, 1] };
const PIECES = { 1: 142, 2: 96, 3: 100, 4: 71, 5: 168, 6: 88, 7: 104, 8: 63, 9: 131, 10: 90, 11: 55, 12: 117, 13: 79, 14: 47, 15: 84 };
const COMMIT = '9f2c4e81b07d3a6655e1c90f2a7b48d3c6e0f9a1b2d4c8e7f60a3b5c9d1e2f47';

function etat({ phase = 'BETTING', n = 4, pieces = PIECES[MOI], paris = [], inventaire = [], resultat = null, caisses = 0, loot = { sincePity: 2, opened: 3 }, pieges = [] } = {}) {
  const players = {}, teams = {};
  for (const e of EQUIPES) {
    const pts = POINTS[e.id];
    players[e.id] = { claimed: true, coins: e.id === MOI ? pieces : PIECES[e.id], paddock: PADDOCKS[e.id] || ['B01', 'J07', 'E05', 'U02', 'P03', 'H06'],
      stats: { betsPlaced: 4, betsWon: 2, trapsBought: 1 }, inventory: e.id === MOI ? inventaire : [], loot: e.id === MOI ? loot : { sincePity: 1, opened: 2 } };
    teams[e.id] = { points: pts[0] + (resultat && e.id === MOI ? 6 : 0), wins: pts[1] + (resultat && e.id === MOI ? 1 : 0), podiums: pts[2] + (resultat && e.id === MOI ? 1 : 0) };
  }
  const ouvert = phase === 'BETTING';
  return {
    seq: 100 + n * 10 + paris.length + inventaire.length + caisses, serverNow: Date.now(), phase, mode: 'gp_bets', voies: 5,
    players, online: EQUIPES.map((e) => e.id), eliminated: [], standings: { teams },
    heat: { n, kind: 'poule', status: ouvert ? 'betting' : 'done', betsOpen: ouvert, windowEndsAt: Date.now() + 32400, weather: 'soleil', chaos: null, gridRevealed: true,
      lanes: VOIES.map((v) => ({ ...v })), odds: ODDS, bets: paris, traps: pieges, cases: { [MOI]: caisses }, result: resultat },
    shopPrices: {}, priceMods: { rank: { [MOI]: 1 }, lane: [1, 1, 1, 1, 1], phase: 1 }, shopStock: {},
    casePrices: { [MOI]: { piege: { standard: 18, elite: 25, marche_noir: 40 }, bonus: { standard: 19, elite: 27, marche_noir: 47 } } },
    loot: { commit: COMMIT, revealed: [], log: [] }, votes: { cascadeur: {}, cuillere: {} }, bailouts: [], draft: {}, skip: false, customCars: [],
  };
}

/** Bande de 48 cartes de la roulette (index 40 = gagnant), tirée avec un PRNG semé : quelques épiques/légendaires autour du gagnant. */
function bande(famille, gagnant, graine) {
  let s = graine >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const C = REGLES.caisses.contenu[famille], b = [];
  for (let k = 0; k < 48; k++) {
    if (k === 40) { b.push(gagnant); continue; }
    const u = r(), rar = Math.abs(k - 40) <= 2 && u < 0.6 ? (u < 0.25 ? 'legendaire' : 'epique') : u < 0.5 ? 'rare' : u < 0.85 ? 'epique' : 'legendaire';
    let pool = C[rar].filter((x) => x !== gagnant); if (!pool.length) pool = C.epique.filter((x) => x !== gagnant);
    b.push(pool[Math.floor(r() * pool.length)]);
  }
  return b;
}

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const nav = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const ctxNav = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: false, locale: 'fr-FR', reducedMotion: 'no-preference' });
  await ctxNav.addInitScript(({ moi }) => {
    // aléa semé (atmosphère, confettis, roulette) : captures reproductibles
    let s = 20261223; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { localStorage.setItem('gp.token', 'demo-jeton-zabou'); localStorage.setItem('gp.team', String(moi)); localStorage.setItem('gp.skin', 'nintendo'); } catch (e) { /* */ }
    // flux temps réel factice : le script de capture pousse les états (window.__pousser)
    const flux = [];
    class FluxFactice extends EventTarget {
      constructor(url) { super(); this.url = url; this.readyState = 1; flux.push(this); setTimeout(() => { if (this.onopen) this.onopen(new Event('open')); if (window.__dernier) this.__emettre(window.__dernier); }, 30); }
      __emettre(json) { this.dispatchEvent(new MessageEvent('state', { data: json })); }
      close() { this.readyState = 2; }
    }
    window.EventSource = FluxFactice;
    window.__pousser = (json) => { window.__dernier = json; flux.filter((f) => f.readyState === 1).forEach((f) => f.__emettre(json)); };
    try { navigator.vibrate = () => true; } catch (e) { /* */ }
    // pas d'audio en capture (le moteur sonore n'apporte rien à une image et bloque le rendu headless)
    window.AudioContext = undefined; window.webkitAudioContext = undefined;
  }, { moi: MOI });

  const pg = await ctxNav.newPage();
  const journal = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') journal.push(m.type() + ': ' + m.text().slice(0, 300)); });
  pg.on('pageerror', (e) => journal.push('pageerror: ' + e.message));

  /* ─────────────── relais simulé ─────────────── */
  let courant = etat(), reponseCaisse = null;
  await pg.route('**/sounds/manifest.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sfx: {}, modes: {}, teams: {} }) }));
  await pg.route('**/api/v2/**', async (route) => {
    const u = new URL(route.request().url()), p = u.pathname.replace(/^.*\/api\/v2\//, '');
    const json = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (p === 'info') return json({ version: '2.6', name: 'Relais de démonstration (capture V9)', edition: 'Noël 2026' });
    if (p === 'rules') return json(REGLES);
    if (p === 'state') return json(courant);
    if (p === 'claim') return json({ ok: true, token: 'demo-jeton-zabou' });
    if (p === 'intent') {
      const b = JSON.parse(route.request().postData() || '{}');
      if (b.type === 'bet') { const o = ODDS[b.payload.kind][b.payload.lane]; return json({ ok: true, odds: o, id: 'b1' }); }
      if (b.type === 'case.open') return json({ ok: true, ...reponseCaisse });
      if (b.type === 'trap.use' || b.type === 'trap.buy') return json({ ok: true, price: 0, id: 't1' });
      return json({ ok: true });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  // capture par le protocole DevTools (pg.screenshot attend parfois indéfiniment une image stable sous SwiftShader)
  const cdp = await ctxNav.newCDPSession(pg);
  async function photo(f, clip = null) {
    const vp = pg.viewportSize();
    const c = clip || { x: 0, y: 0, width: vp.width, height: vp.height };
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...c, scale: 2 }, fromSurface: true });
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
  }
  const pousser = async (st) => { courant = st; await pg.evaluate((j) => window.__pousser(j), JSON.stringify(st)); await pg.waitForTimeout(450); };
  const attendre = (ms) => pg.waitForTimeout(ms);

  const index = { viewport: [390, 844], echelle: 2, captures: {} };
  const brut = path.join(SORTIE, '_brut'); fs.mkdirSync(brut, { recursive: true });
  /** Capture : page (viewport, éventuellement allongée à h CSS) ou rectangle ; mesure des zones utiles (en px de capture). */
  async function capturer(nom, { hauteur = 844, clip = null, zones = {}, defile = null, defileVers = null } = {}) {
    if (defile !== null) { await pg.evaluate((d) => { document.querySelector('#main').scrollTop = d; }, defile); await attendre(300); }
    await pg.evaluate(() => { const m = document.querySelector('#main'); if (m) m.dataset.st = m.scrollTop; });
    if (hauteur !== 844) { await pg.setViewportSize({ width: 390, height: hauteur }); await pg.evaluate((sel) => { const m = document.querySelector('#main'); m.scrollTop = 0; if (sel) m.scrollTop = document.querySelector(sel).getBoundingClientRect().top - m.getBoundingClientRect().top - 14; }, defileVers); await attendre(700); }
    const z = {}, t0c = Date.now();
    for (const [cle, sel] of Object.entries(zones)) {
      const bb = await pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, sel);
      if (bb) z[cle] = bb.map((v) => Math.round(v * 2));
    }
    const f = path.join(brut, nom + '.png');
    await photo(f, clip);
    index.captures[nom] = { fichier: nom + '.png', zones: z, hauteurCSS: clip ? clip.height : hauteur };
    if (hauteur !== 844) { await pg.setViewportSize({ width: 390, height: 844 }); await pg.evaluate(() => { const m = document.querySelector('#main'); m.scrollTop = +m.dataset.st || 0; }); await attendre(400); }
    console.log('  capture', nom, ((Date.now() - t0c) / 1000).toFixed(1) + ' s', JSON.stringify(z));
  }

  console.log('1. page connectée, phase BETTING (manche 4)…');
  await pg.goto(`http://127.0.0.1:${port}/pit/`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__pousser, null, { timeout: 30000 });
  await attendre(1500); await pousser(etat());
  await pg.waitForSelector('#lanes .lane', { timeout: 30000 }); await attendre(1500);
  const H_PARIS = await pg.evaluate(() => { const m = document.querySelector('#main'); const card = [...document.querySelectorAll('.card')].find((c) => c.querySelector('#place')); return Math.ceil(card.getBoundingClientRect().bottom + 24 + document.querySelector('#tabs').offsetHeight + m.scrollTop); });
  const zonesParis = { entete: '#top', onglets: '#tabs', voies: '#lanes', voie1: '#lanes .lane[data-lane="1"]', placer: '#place', montant: '#amt', puces: '.chips', mise: '#lanes' };
  await capturer('paris_a', { hauteur: H_PARIS, zones: zonesParis });

  console.log('2. tap sur la Mégane (voie 2), mise 50…');
  await pg.click('#lanes .lane[data-lane="1"]'); await attendre(400);
  console.log('  après tap voie', await pg.evaluate(() => document.querySelector('.lane.sel')?.dataset.lane));
  await pg.click('.chips [data-amt="50"]'); await attendre(500);
  console.log('  après puce', await pg.evaluate(() => document.querySelector('#amt')?.textContent));
  await capturer('paris_b', { hauteur: H_PARIS, zones: zonesParis });

  console.log('3. « Placer la mise »…');
  await pg.setViewportSize({ width: 390, height: H_PARIS }); await attendre(600);
  await pg.click('#place'); await attendre(250);
  courant = etat({ pieces: 50, paris: [{ id: 'b1', teamId: MOI, lane: 1, kind: 'win', amount: 50, odds: 3.4 }] });
  await pg.evaluate((j) => window.__pousser(j), JSON.stringify(courant)); await attendre(700);
  await pg.setViewportSize({ width: 390, height: 844 }); await attendre(300);
  const H_PARIS_C = await pg.evaluate(() => { const card = [...document.querySelectorAll('.card')].find((c) => c.querySelector('#place')); return Math.ceil(card.getBoundingClientRect().bottom + 24 + document.querySelector('#tabs').offsetHeight + document.querySelector('#main').scrollTop); });
  await capturer('paris_c', { hauteur: Math.max(H_PARIS, H_PARIS_C), zones: { ...zonesParis, toast: '#toasts .toast', mybet: '.mybet' } });

  console.log('4. résultat : la Mégane gagne (VICTOIRE !)…');
  const gain = Math.round(50 * 3.4), prime = REGLES.rules.heatCoins5[0];
  const res = { order: [1, 4, 0, 2, 3], dnf: [], effects: { coins: { [MOI]: gain + prime }, bets: [{ id: 'b1', result: 'won', payout: gain }] } };
  const final = 50 + gain + prime;
  await attendre(3500);                                                            // les toasts précédents disparaissent (3,2 s)
  await pousser(etat({ phase: 'RESULT', pieces: 50, paris: [{ id: 'b1', teamId: MOI, lane: 1, kind: 'win', amount: 50, odds: 3.4 }], resultat: res }));
  await attendre(2600);                                                            // confettis retombés
  // le porte-monnaie compte : états successifs du relais (pièces versées par tranches), bandeau capturé à chaque valeur
  const valeurs = [50, 75, 100, 125, 150, 175, 200, 220, final];
  const bourse = [];
  for (const v of valeurs) {
    if (v !== 50) await pousser(etat({ phase: 'RESULT', pieces: v, paris: [{ id: 'b1', teamId: MOI, lane: 1, kind: 'win', amount: 50, odds: 3.4 }], resultat: res }));
    await pg.evaluate(() => document.querySelectorAll('.fx-float').forEach((e) => e.remove()));
    await attendre(500);
    const bb = await pg.evaluate(() => { const r = document.querySelector('#top').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    const f = path.join(brut, `bourse_${v}.png`); await photo(f, { x: 0, y: 0, width: 390, height: Math.ceil(bb[1] + bb[3]) }); bourse.push({ v, f });
  }
  await pg.evaluate(() => document.querySelectorAll('.fx-float').forEach((e) => e.remove()));
  await capturer('resultat', { defile: 0, zones: { entete: '#top', onglets: '#tabs', titre: '.big.foil', purse: '.purse', carte: '#main .card' } });
  index.bourse = { fichier: 'bourse.png', valeurs, final };

  console.log('5. manche 5 : Arsenal › Caisses…');
  await pousser(etat({ n: 5, pieces: final }));
  await pg.waitForSelector('[data-atab="caisses"]', { state: 'attached' }); await pg.evaluate(() => document.querySelector('[data-atab="caisses"]').click());
  await pg.waitForSelector('.crates', { state: 'attached', timeout: 120000 }); await attendre(800);
  await pg.waitForFunction(() => document.querySelectorAll('.ctile img').length >= 6, null, { timeout: 120000 }).catch(() => console.log('  (vignettes 3D des caisses incomplètes)'));
  await attendre(600);
  // l'Arsenal seul (une capture > 4096 px de haut sort noire sous SwiftShader) : fenêtre haute, Arsenal calé sous le bandeau
  const H_CAI = await pg.evaluate(() => Math.ceil(document.querySelector('.arsenal').getBoundingClientRect().height + document.querySelector('#top').offsetHeight + document.querySelector('#tabs').offsetHeight + 60));
  await capturer('caisses', { hauteur: H_CAI, defileVers: '.arsenal', zones: { entete: '#top', onglets: '#tabs', arsenal: '.arsenal', bonus: '.cfam:nth-of-type(2)', mn_bonus: '[data-case="bonus:marche_noir"]', mn_piege: '[data-case="piege:marche_noir"]', crates: '.crates' } });

  console.log('6. caisse BONUS Marché Noir → Étoile d\'Invincibilité (légendaire)…');
  reponseCaisse = { strip: bande('bonus', 'etoile', 74), win: 40, item: 'etoile', uid: 'u1', msg: '1:7:3:bonus:marche_noir', pity: false };
  await pg.evaluate(() => { const m = document.querySelector('#main'); const e = document.querySelector('[data-case="bonus:marche_noir"]'); m.scrollTop += e.getBoundingClientRect().top - 300; });
  await attendre(300);
  await pg.click('[data-case="bonus:marche_noir"]');
  const t0 = Date.now();
  if (process.env.SONDE) for (let i = 0; i < 6; i++) { const t1 = Date.now(); const info = await pg.evaluate(() => { const c = document.querySelector('.lbx canvas'); return c ? c.width + 'x' + c.height + ' rev=' + !document.querySelector('.lbx-reveal').hidden : 'pas de lbx'; }); const raf = await pg.evaluate(() => Promise.race([new Promise((r) => requestAnimationFrame(() => r('raf ok'))), new Promise((r) => setTimeout(() => r('raf BLOQUÉ'), 500))])); console.log('   sonde', i, Date.now() - t1, 'ms', info, raf, journal.slice(-3).join(' | ')); await attendre(1000); }
  for (const [k, ms] of [[1, 900], [2, 2600], [3, 5600]]) { await attendre(Math.max(0, ms - (Date.now() - t0))); await capturer('roulette_' + k, { zones: {} }); }
  await pg.waitForSelector('.lbx-reveal:not([hidden]) .lbx-card', { timeout: 30000 }); await attendre(1200);
  await capturer('bonus', { zones: { carte: '.lbx-card', icone: '.lbx-card .lbx-ic', titre: '.lbx-card h3', actions: '.lbx-acts' } });
  courant = etat({ n: 5, pieces: final - 47, caisses: 1, inventaire: [{ uid: 'u1', item: 'etoile', src: 'Caisse BONUS' }], loot: { sincePity: 0, opened: 4 } });
  await pg.click('.lbx-acts [data-a="keep"]'); await attendre(600);
  await pg.evaluate((j) => window.__pousser(j), JSON.stringify(courant)); await attendre(900);

  console.log('7. caisse PIÈGES Marché Noir → Bascule Hazzard (épique)…');
  reponseCaisse = { strip: bande('piege', 'bascule', 75), win: 40, item: 'bascule', uid: 'u2', msg: '1:8:3:piege:marche_noir', pity: false };
  await pg.waitForSelector('[data-case="piege:marche_noir"]');
  await pg.evaluate(() => { const m = document.querySelector('#main'); const e = document.querySelector('[data-case="piege:marche_noir"]'); m.scrollTop += e.getBoundingClientRect().top - 300; });
  await attendre(300);
  await pg.click('[data-case="piege:marche_noir"]');
  await pg.waitForSelector('.lbx-reveal:not([hidden]) .lbx-card', { timeout: 30000 }); await attendre(1200);
  await capturer('piege', { zones: { carte: '.lbx-card', icone: '.lbx-card .lbx-ic', titre: '.lbx-card h3', actions: '.lbx-acts', utiliser: '.lbx-acts [data-a="use"]' } });
  courant = etat({ n: 5, pieces: final - 87, caisses: 2, inventaire: [{ uid: 'u1', item: 'etoile', src: 'Caisse BONUS' }, { uid: 'u2', item: 'bascule', src: 'Caisse PIÈGES' }], loot: { sincePity: 0, opened: 5 } });
  await pg.evaluate((j) => window.__pousser(j), JSON.stringify(courant));
  await pg.click('.lbx-acts [data-a="use"]'); await attendre(900);
  await pg.waitForSelector('#sheet .isheet', { timeout: 10000 });
  await pg.evaluate(() => { const s = document.querySelector('#sheet .in') || document.querySelector('#sheet'); const l = document.querySelector('#sheet .lane'); if (l) l.scrollIntoView({ block: 'center' }); });
  await attendre(500);
  await capturer('cible', { zones: { feuille: '#sheet .isheet', voie0: '#sheet .lane[data-lane="0"]', voie4: '#sheet .lane[data-lane="4"]', titre: '#sheet .isheet h3' } });

  /* ─────────────── finition : quantification (< 400 Ko) ─────────────── */
  const py = `
import sys, json
from PIL import Image
src, dst, mode = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB')
if mode == 'bourse':
    pass
q = im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
q.save(dst, optimize=True)
`;
  const fpy = path.join(brut, 'q.py'); fs.writeFileSync(fpy, py);
  // bandeau du porte-monnaie : planche verticale
  const pyB = `
import sys
from PIL import Image
fs = sys.argv[2:]; ims = [Image.open(f).convert('RGB') for f in fs]
w, h = ims[0].size; out = Image.new('RGB', (w, h * len(ims)))
for i, im in enumerate(ims): out.paste(im, (0, i * h))
out.save(sys.argv[1])
print(w, h)
`;
  const fpyB = path.join(brut, 'b.py'); fs.writeFileSync(fpyB, pyB);
  const [bw, bh] = execFileSync('python3', [fpyB, path.join(brut, 'bourse.png'), ...bourse.map((b) => b.f)]).toString().trim().split(' ').map(Number);
  index.bourse.taille = [bw, bh];
  index.captures.bourse = { fichier: 'bourse.png', zones: {} };
  for (const nom of Object.keys(index.captures)) {
    const src = path.join(brut, nom + '.png'), dst = path.join(SORTIE, nom + '.png');
    if (BRUT) fs.copyFileSync(src, dst); else execFileSync('python3', [fpy, src, dst, nom]);
    const ko = fs.statSync(dst).size / 1024;
    const dims = execFileSync('python3', ['-c', `from PIL import Image;print(*Image.open('${dst}').size)`]).toString().trim().split(' ').map(Number);
    index.captures[nom].taille = dims;
    console.log(`  ${nom}.png ${dims.join('×')} ${ko.toFixed(0)} Ko`);
  }
  fs.writeFileSync(path.join(SORTIE, 'index.json'), JSON.stringify(index, null, 1));
  fs.rmSync(brut, { recursive: true, force: true });
  console.log('console de la page :', journal.length ? '\n  ' + journal.slice(0, 20).join('\n  ') : 'propre');
  await nav.close(); srv.close();
})().catch(async (e) => { console.error(e); process.exit(2); });
