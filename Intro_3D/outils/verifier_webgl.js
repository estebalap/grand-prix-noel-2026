#!/usr/bin/env node
/* Contrôle headless des pages Intro_3D (et de toute page du site) : chargement, contexte WebGL, erreurs console.

   Usage (depuis la racine du dépôt, ou 00_Lab_Vision_2.0 sur le PC) :
     node Intro_3D/outils/verifier_webgl.js                                   → pages par défaut (aperçus + animatic V6)
     node Intro_3D/outils/verifier_webgl.js Intro_3D/apercu_salon.html showroom/index.html
   Options : --port 8790   --gpu (ANGLE matériel au lieu de SwiftShader)   --capture dossier/ (une capture PNG par page)
             --tolerer-son (n'échoue pas sur l'avertissement « Bande-son absente » quand le mix .wav n'est pas restauré)

   Le script démarre lui-même un serveur HTTP statique sur la racine (dossier parent d'Intro_3D), ouvre chaque page dans
   Chromium headless (Playwright), attend window.pret (animatics) ou 6 s (aperçus), rend une image à 42 % du film, et
   échoue (code 2) à la moindre erreur de page, erreur ou alerte console, ou si aucun contexte WebGL n'a pu être créé.
   Prérequis : npm i playwright (Chromium déjà présent dans l'environnement Claude Code ; sinon npx playwright install chromium). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.stl': 'model/stl', '.webmanifest': 'application/manifest+json' };

const args = process.argv.slice(2);
const opt = (nom, def) => { const i = args.indexOf(nom); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const drapeau = (nom) => { const i = args.indexOf(nom); if (i < 0) return false; args.splice(i, 1); return true; };
const port = parseInt(opt('--port', '8790'), 10);
const capture = opt('--capture', null);
const gpu = drapeau('--gpu');
const tolererSon = drapeau('--tolerer-son');
const pages = args.length ? args : [
  'Intro_3D/apercu_salon.html',
  'Intro_3D/apercu_arene.html',
  'Intro_3D/animatic_v6.html?capture=1&l=960&qualite=brouillon&parc=12',
];

/* Serveur statique minimal (comme py -m http.server : listing des dossiers, HEAD accepté). */
function serveur() {
  return http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let f = path.normalize(path.join(RACINE, url));
    if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
    fs.stat(f, (e, st) => {
      if (!e && st.isDirectory()) {
        const index = path.join(f, 'index.html');
        if (fs.existsSync(index)) f = index;
        else {
          const liens = fs.readdirSync(f, { withFileTypes: true }).map((d) => `<li><a href="${encodeURI(d.name)}${d.isDirectory() ? '/' : ''}">${d.name}</a></li>`).join('');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(req.method === 'HEAD' ? undefined : `<ul>${liens}</ul>`);
        }
      } else if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(f).pipe(res);
    });
  }).listen(port, '127.0.0.1');
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { console.error('Playwright introuvable : npm i playwright'); process.exit(3); }
  const srv = serveur();
  const nav = await chromium.launch({ args: gpu ? ['--use-angle=default', '--ignore-gpu-blocklist']
    : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  if (capture) fs.mkdirSync(capture, { recursive: true });
  let echecs = 0;
  for (const p of pages) {
    const page = await nav.newPage({ viewport: { width: 1280, height: 720 } });
    const problemes = [];
    page.on('pageerror', (e) => problemes.push('pageerror : ' + e.message));
    page.on('console', (m) => {
      if (!['error', 'warning'].includes(m.type())) return;
      if (tolererSon && /Bande-son absente/.test(m.text())) return;
      problemes.push(`${m.type()} : ${m.text().slice(0, 400)}`);
    });
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${port}/${p}`);
    let info = {};
    try {
      if (/animatic/.test(p)) {
        await page.waitForFunction('window.pret === true || window.erreurFilm', null, { timeout: 900000 });
        const e = await page.evaluate('window.erreurFilm || null');
        if (e) problemes.push('erreurFilm : ' + e);
        else await page.evaluate('window.rendreTemps(window.dureeFilm * 0.42)');
      } else {
        await page.waitForTimeout(6000);
      }
      info = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
        return { webgl: !!gl && !(gl.isContextLost && gl.isContextLost()), three: window.THREE ? window.THREE.REVISION : null,
          pont: window.GP_PONT || null, duree: window.dureeFilm || null };
      });
      if (!info.webgl) problemes.push('aucun contexte WebGL actif');
    } catch (e) { problemes.push('délai dépassé / exception : ' + e.message); }
    if (capture) await page.screenshot({ path: path.join(capture, p.split('?')[0].replace(/[\\/]/g, '_').replace(/\.html$/, '') + '.png') });
    const ok = problemes.length === 0;
    if (!ok) echecs++;
    console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${p}  (${((Date.now() - t0) / 1000).toFixed(1)} s, three r${info.three}, WebGL ${info.webgl ? 'oui' : 'non'}`
      + `${info.pont ? ', pont ' + info.pont.DISPOSITION : ''}${info.duree ? ', film ' + info.duree.toFixed(1) + ' s' : ''})`);
    for (const m of problemes) console.log('       ' + m);
    await page.close();
  }
  await nav.close(); srv.close();
  console.log(echecs ? `${echecs} page(s) en échec` : 'Toutes les pages sont propres (zéro erreur console, WebGL actif).');
  process.exit(echecs ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
