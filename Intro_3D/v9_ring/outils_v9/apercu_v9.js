// Outil de mise au point V9 : charge le film une fois (option ?seg=… pour ne construire qu'un segment), rend une liste
// d'instants, écrit les PNG + stats.json (statsHUD par image : surface d'UI, zone sacrée, textes) et une planche.
//   node Intro_3D/v8_finale/outils_v8/apercu_v9.js <dossier> <t1,t2,...> [--l 960] [--seg salon] [--parc 24] [--qualite apercu]
// Code de sortie 2 : erreur de page, erreur/alerte console ou ressource 404.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RACINE = path.resolve(__dirname, '..', '..', '..');
const a = process.argv.slice(2); const out = path.resolve(a[0] || 'apercu_v9'), temps = (a[1] || '').split(',').filter(Boolean).map(Number);
const opt = (n, d) => { const i = a.indexOf(n); return i < 0 ? d : a[i + 1]; };
const L = +opt('--l', 960), seg = opt('--seg', null), planF = opt('--plan', null), parc = opt('--parc', '24'), qualite = opt('--qualite', 'apercu');
const port = 8900 + Math.floor(Math.random() * 90);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => {
  let f = path.join(RACINE, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { const ix = path.join(f, 'index.html'); if (fs.existsSync(ix)) f = ix; else { r.setHeader('Content-Type', 'text/html'); return r.end(fs.readdirSync(f).map((n) => `<a href="${n}/">${n}</a>`).join('')); } }
  if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
}).listen(port, '127.0.0.1');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: L, height: Math.round(L * 9 / 16) } });
  const j = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') j.push(m.type() + ': ' + m.text().slice(0, 400)); });
  pg.on('pageerror', (e) => j.push('pageerror: ' + e.message));
  pg.on('response', (r) => { if (r.status() >= 400) j.push(`ressource ${r.status()} : ${r.url()}`); });
  const t0 = Date.now();
  await pg.goto(`http://127.0.0.1:${port}/Intro_3D/v9_ring/index.html?capture=1&l=${L}&parc=${parc}&qualite=${qualite}` + (seg ? `&seg=${seg}` : '') + (planF ? `&plan=${planF}` : ''));
  await pg.waitForFunction('window.pret === true || window.erreurFilm', null, { timeout: 1200000 });
  const err = await pg.evaluate('window.erreurFilm || null');
  if (err) { console.log('ERREUR DE PAGE :\n' + err); await b.close(); srv.close(); process.exit(2); }
  console.log('chargé en', ((Date.now() - t0) / 1000).toFixed(0), 's ; clés :', JSON.stringify(await pg.evaluate('window.reperesPlanche')));
  const stats = [];
  for (const t of temps) {
    const t1 = Date.now();
    await pg.evaluate((tt) => window.rendreTemps(tt, { sub: 1 }), t);
    const b64 = await pg.evaluate("window.imageBase64('png')");
    const nom = `t_${t.toFixed(2).padStart(6, '0')}.png`; fs.writeFileSync(path.join(out, nom), Buffer.from(b64, 'base64'));
    const s = await pg.evaluate('window.statsHUD()'); const col = await pg.evaluate('window.statsCollisions()'); stats.push({ t, image: nom, ...s, collisions: col, rendu_s: (Date.now() - t1) / 1000 });
    if (col.length) console.log('  COLLISIONS : ' + JSON.stringify(col).slice(0, 300));
    console.log(`t=${t}  UI ${(s.surface * 100).toFixed(1)} %  zone sacrée ${(s.zone_sacree * 100).toFixed(1)} %  textes ${s.nb_textes} ${JSON.stringify(s.textes)}  (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
  }
  fs.writeFileSync(path.join(out, 'stats.json'), JSON.stringify(stats, null, 1));
  console.log('console :', j.length ? '\n  ' + j.slice(0, 20).join('\n  ') : 'propre');
  await b.close(); srv.close(); process.exit(j.length ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
