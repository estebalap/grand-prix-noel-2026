#!/usr/bin/env node
/* QA du trailer V7 (Playwright headless, Chromium SwiftShader) — protocole de vérification du cahier des charges :
     1. zéro erreur / alerte console ; 2. 15 Concept-Cars + 88 modèles m3d disponibles ; 3. 15 mondes natifs + portails + Ring évolutif ;
     4. physique : β ≠ 0, roues avant contre-braquées (δ = −0,85 β), tangage / roulis actifs ; 5. déterminisme (deux rendus = mêmes pixels).
   Usage : node Intro_3D/v7_multivers_4k/qa_v7.js [--l 640] [--parc 6] [--images t1,t2,…] [--sortie dossier] [--port 8796] [--gpu]
   Code de sortie 0 = propre ; 2 = au moins un contrôle en échec. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const RACINE = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const L = parseInt(opt('--l', '640'), 10), parc = opt('--parc', '6'), port = parseInt(opt('--port', '8796'), 10), gpu = flag('--gpu');
const images = (opt('--images', '') || '').split(',').filter(Boolean).map(Number), dossier = path.resolve(opt('--sortie', path.join(__dirname, 'sorties')));
const echecs = []; const ok = (c, m) => { console.log((c ? 'ok    : ' : 'ÉCHEC : ') + m); if (!c) echecs.push(m); };

const srv = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split('?')[0]); let f = path.join(RACINE, p);
  if (!f.startsWith(RACINE)) { r.statusCode = 403; return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r);
}).listen(port, '127.0.0.1');

(async () => {
  const b = await chromium.launch({ args: gpu ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: L, height: Math.round(L * 9 / 16) } });
  const journal = [];
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') journal.push(m.type() + ' : ' + m.text()); });
  pg.on('pageerror', (e) => journal.push('pageerror : ' + e.message));
  const t0 = Date.now();
  await pg.goto(`http://127.0.0.1:${port}/Intro_3D/v7_multivers_4k/index.html?capture=1&l=${L}&parc=${parc}&qualite=brouillon`);
  await pg.waitForFunction('window.pret === true || window.erreurFilm', null, { timeout: 600000 });
  const err = await pg.evaluate('window.erreurFilm || null');
  ok(!err, 'chargement du film' + (err ? ' : ' + err.slice(0, 400) : ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`));
  if (!err) {
    const inv = await pg.evaluate('window.inventaireFilm');
    console.log('inventaire :', JSON.stringify(inv));
    ok(inv.conceptCars === 15, '15 Concept-Cars du Showroom'); ok(inv.bolidesM3dTotal >= 75, `${inv.bolidesM3dTotal} modèles m3d disponibles (≥ 75)`);
    ok(inv.mondesNatifs === 15 && inv.portails >= 30, '15 mondes natifs + portails (monde + Ring)');
    const rep = await pg.evaluate('window.reperesPlanche'); ok(rep.length === 36, '36 repères de planche');
    // physique : écurie 2 (indice 1) en dérive juste après le portail
    const imp = await pg.evaluate('window.filmV7.tl.ecuries[1].impact');
    const ph = await pg.evaluate((t) => window.sondePhysique(1, t), imp + 0.35);
    console.log('physique @impact+0,35 s :', JSON.stringify(ph));
    ok(Math.abs(ph.beta) >= 14 && Math.abs(ph.beta) <= 36, `angle de dérive β = ${ph.beta.toFixed(1)}° ≠ 0`);
    ok(Math.abs(ph.braquage + 0.85 * ph.beta) < 0.01 && ph.braquage * ph.beta < 0, `roues avant contre-braquées (δ = ${ph.braquage.toFixed(1)}° = −0,85 β)`);
    const phA = await pg.evaluate((t) => window.sondePhysique(0, t), imp - 0.05);
    const phB = await pg.evaluate((t) => window.sondePhysique(1, t), imp + 0.06);
    ok(Math.abs(phB.tangage) > 0.05 || Math.abs(phB.roulis) > 0.05 || phB.ecrasement > 0, `tangage ${phB.tangage.toFixed(2)}° / roulis ${phB.roulis.toFixed(2)}° actifs à la réception`);
    // rendu : planche de clés + déterminisme
    const hash = (b64) => crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').slice(0, 16);
    const rendre = async (t) => { await pg.evaluate((tt) => window.rendreTemps(tt, { sub: 1 }), t); return pg.evaluate("window.imageBase64('png')"); };
    const tests = images.length ? images : [rep[0].t, rep[3].t, rep[4].t, rep[5].t];
    fs.mkdirSync(dossier, { recursive: true });
    for (const t of tests) { const t1 = Date.now(), b64 = await rendre(t); fs.writeFileSync(path.join(dossier, `qa_v7_${t.toFixed(2)}.png`), Buffer.from(b64, 'base64')); console.log(`image t=${t} : ${((Date.now() - t1) / 1000).toFixed(1)} s`); }
    const tD = rep[4].t, h1 = hash(await rendre(tD)); await rendre(rep[10].t); const h2 = hash(await rendre(tD));
    ok(h1 === h2, `déterminisme : deux rendus de t = ${tD} s identiques (saut intermédiaire inclus)`);
  }
  ok(journal.length === 0, 'zéro erreur / alerte console' + (journal.length ? '\n  ' + journal.slice(0, 12).join('\n  ') : ''));
  await b.close(); srv.close();
  if (echecs.length) { console.error('\n' + echecs.length + ' contrôle(s) en échec'); process.exit(2); }
  console.log('\nQA V7 : tout est propre');
})().catch((e) => { console.error(e); process.exit(2); });
