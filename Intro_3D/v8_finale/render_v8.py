#!/usr/bin/env python3
"""Rendu de la V8 FINALE (107 s) : planche de contrôle stricte et vidéo MP4, image par image (window.rendreTemps).

  python3 render_v8.py --controle                 -> sorties/planche_v8_controle_strict.png (20 clés en 1920x1080)
                                                     + sorties/controle_v8.json (stats UI par clé, verdict « zéro surcharge »,
                                                     déterminisme : les 20 clés re-rendues en ordre inverse, comparées au pixel)
  python3 render_v8.py --video --largeur 960 --fps 24          -> sorties/trailer_v8.mp4 (son audio/mix_v8.wav)
  py -3 render_v8.py --video --gpu --largeur 1920 --fps 60      -> PC d'Esteban : Chrome + carte graphique

Options : --largeur L  --fps F  --debut/--fin  --sub M (sous-expositions, flou de mouvement)  --images DOSSIER (reprise)
          --sortie NOM.mp4  --parc N  --gpu (ANGLE d3d11, fenêtre visible) ; sans --gpu : Chromium headless SwiftShader.
Code de sortie : 0 propre ; 2 erreur de page / console / ressource ou plan hors règles (--controle) ; 130 interruption.
"""
import argparse, asyncio, base64, functools, hashlib, http.server, io, json, os, socketserver, subprocess, sys, threading, time

ICI = os.path.dirname(os.path.abspath(__file__))
INTRO = os.path.dirname(ICI); RACINE = os.path.dirname(INTRO); SORTIES = os.path.join(INTRO, 'sorties')
MIX = os.path.join(ICI, 'audio', 'mix_v8.wav'); PAGE = 'Intro_3D/v8_finale/index.html'
ARGS_CLOUD = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
ARGS_GPU = ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist']


class Lecteur(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (ConnectionResetError, BrokenPipeError): pass


def serveur(port):
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    try: srv = socketserver.ThreadingTCPServer(('127.0.0.1', port), functools.partial(Lecteur, directory=RACINE))
    except OSError: srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Lecteur, directory=RACINE))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv


def police(taille):
    from PIL import ImageFont
    for nom in ('arial.ttf', 'DejaVuSans.ttf', 'LiberationSans-Regular.ttf'):
        try: return ImageFont.truetype(nom, taille)
        except OSError: pass
    return ImageFont.load_default()


def planche(vignettes, reperes, stats, verdicts, chemin, col=5):
    from PIL import Image, ImageDraw
    lv, hv, bandeau, marge = 480, 270, 44, 10
    lig = (len(vignettes) + col - 1) // col
    W = marge + col * (lv + marge); H = 64 + marge + lig * (hv + bandeau + marge)
    img = Image.new('RGB', (W, H), (10, 10, 16)); d = ImageDraw.Draw(img); f0, f1, f2 = police(26), police(16), police(13)
    d.text((marge, 18), 'V8 FINALE · planche de contrôle stricte (1920x1080) · protocole « zéro surcharge »', fill=(255, 210, 90), font=f0)
    for k, (raw, r, s, v) in enumerate(zip(vignettes, reperes, stats, verdicts)):
        x = marge + (k % col) * (lv + marge); y = 64 + marge + (k // col) * (hv + bandeau + marge)
        img.paste(Image.open(io.BytesIO(raw)).convert('RGB').resize((lv, hv), Image.LANCZOS), (x, y))
        ok = not v
        d.rectangle([x, y + hv, x + lv - 1, y + hv + bandeau - 1], fill=(18, 34, 22) if ok else (60, 16, 16))
        d.text((x + 6, y + hv + 4), f"{k + 1:02d} · {r['label']}"[:52], fill=(255, 225, 140), font=f1)
        d.text((x + 6, y + hv + 24), f"t={r['t']:.2f}s  UI {100 * s['surface']:.1f}%  centre {100 * s['zone_sacree']:.1f}%  textes {s['nb_textes']}  "
               + ('OK' if ok else 'REJET : ' + ', '.join(v)), fill=(150, 220, 160) if ok else (255, 140, 140), font=f2)
    img.save(chemin)


def verdict(r, s, plan):
    """Critères automatiques du protocole (le contrôle visuel du Chef de régie reste obligatoire en plus)."""
    R = plan['regles_ui']; folie = next(x for x in plan['segments'] if x['id'] == 'folie'); fin = folie['sous'][-1]
    dec = folie['debut'] - folie.get('origine', folie['debut'])                       # sous-parties en temps interne du segment
    carte_finale = fin['debut'] + dec <= r['t'] < fin['fin'] + dec
    v = []
    if s['surface'] > R['surface_max']: v.append(f"UI {100 * s['surface']:.0f}% > {100 * R['surface_max']:.0f}%")
    if s['nb_textes'] > R['textes_max']: v.append(f"{s['nb_textes']} textes")
    if s['zone_sacree'] > 0.01 and not carte_finale: v.append('centre touché')
    return v


async def main():
    ap = argparse.ArgumentParser(description='Rendu de la V8 finale (planche de contrôle stricte, vidéo).')
    ap.add_argument('--controle', action='store_true'); ap.add_argument('--video', action='store_true')
    ap.add_argument('--largeur', type=int, default=None); ap.add_argument('--fps', type=float, default=24.0)
    ap.add_argument('--debut', type=float, default=0.0); ap.add_argument('--fin', type=float, default=None)
    ap.add_argument('--sub', type=int, default=1); ap.add_argument('--images', default=None); ap.add_argument('--parc', type=int, default=24)
    ap.add_argument('--sortie', default='trailer_v8.mp4'); ap.add_argument('--gpu', action='store_true'); ap.add_argument('--port', type=int, default=8793)
    a = ap.parse_args()
    if not (a.controle or a.video): ap.error('choisir --controle et/ou --video')
    from playwright.async_api import async_playwright
    os.makedirs(SORTIES, exist_ok=True)
    plan = json.load(open(os.path.join(ICI, 'data', 'plan_v8.json'), encoding='utf-8'))
    srv = serveur(a.port); port = srv.server_address[1]; erreurs = []; code = 0
    async with async_playwright() as p:
        nav = await p.chromium.launch(channel='chrome' if a.gpu else None, headless=not a.gpu, args=ARGS_GPU if a.gpu else ARGS_CLOUD)

        async def ouvrir(L):
            page = await nav.new_page(viewport={'width': L, 'height': round(L * 9 / 16)})
            page.on('pageerror', lambda e: erreurs.append('pageerror : ' + str(e)))
            page.on('console', lambda m: erreurs.append(f'{m.type} : {m.text}') if m.type in ('error', 'warning') else None)
            page.on('response', lambda r: erreurs.append(f'ressource {r.status} : {r.url}') if r.status >= 400 else None)
            await page.goto(f'http://127.0.0.1:{port}/{PAGE}?capture=1&l={L}&sub={a.sub}&parc={a.parc}&qualite={"master" if a.gpu else "apercu"}')
            print(f'Chargement ({L}x{round(L * 9 / 16)}) ...', flush=True); t0 = time.time()
            await page.wait_for_function('window.pret === true || !!window.erreurFilm', timeout=1800000)
            e = await page.evaluate('window.erreurFilm || null')
            if e: raise RuntimeError('Erreur de la page : ' + e)
            print(f'  chargé en {time.time() - t0:.0f} s', flush=True); return page

        async def image(page, t, fmt='png'):
            return base64.b64decode(await page.evaluate("async ([t, f]) => { await window.rendreTemps(t); return window.imageBase64(f, 0.95); }", [t, fmt]))

        def verifier():
            if erreurs: raise RuntimeError('Erreur / alerte console : ' + ' | '.join(erreurs[:5]))

        try:
            if a.controle:
                page = await ouvrir(1920); verifier()
                reperes = json.loads(await page.evaluate('JSON.stringify(window.reperesPlanche)'))
                if len(reperes) != 20: raise RuntimeError(f'20 clés attendues, {len(reperes)} reçues')
                vign, stats, verdicts = [], [], []
                for k, r in enumerate(reperes):
                    vign.append(await image(page, r['t'])); verifier()
                    s = await page.evaluate('window.statsHUD()'); stats.append(s); verdicts.append(verdict(r, s, plan))
                    print(f"  {k + 1:02d}/20  t={r['t']:6.2f}  {r['label'][:40]:40s}  UI {100 * s['surface']:4.1f}%  centre {100 * s['zone_sacree']:4.1f}%  textes {s['nb_textes']}  {'OK' if not verdicts[-1] else 'REJET ' + str(verdicts[-1])}", flush=True)
                diff = [reperes[k]['label'] for k in range(19, -1, -1) if hashlib.sha1(await image(page, reperes[k]['t'])).hexdigest() != hashlib.sha1(vign[k]).hexdigest()]
                chemin = os.path.join(SORTIES, 'planche_v8_controle_strict.png'); planche(vign, reperes, stats, verdicts, chemin)
                rapport = {'version': 'v8', 'date': time.strftime('%Y-%m-%dT%H:%M:%S'), 'cles': [{**r, **s, 'rejet': v} for r, s, v in zip(reperes, stats, verdicts)],
                           'rejets': sum(1 for v in verdicts if v), 'determinisme': {'verdict': 'identique' if not diff else 'différent', 'differences': diff},
                           'erreurs_console': erreurs[:]}
                tl = os.path.join(ICI, 'data', 'timeline_v8.json')
                if os.path.exists(tl): rapport['son'] = {k: v for k, v in json.load(open(tl, encoding='utf-8')).items() if k in ('bilan', 'mix', 'voix_off')}
                json.dump(rapport, open(os.path.join(SORTIES, 'controle_v8.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                print('Planche :', chemin, '| rejets automatiques :', rapport['rejets'], '| déterminisme :', rapport['determinisme']['verdict'], flush=True)
                if rapport['rejets'] or diff: code = 2
                await page.close()
            if a.video:
                L = a.largeur or (1920 if a.gpu else 960); page = await ouvrir(L); verifier()
                fin = a.fin if a.fin is not None else plan['duree']; i0 = round(a.debut * a.fps); n = round(fin * a.fps) - i0
                dossier = a.images; fmt = 'jpeg' if dossier else 'png'
                if dossier: os.makedirs(dossier, exist_ok=True)
                sortie = os.path.join(SORTIES, a.sortie); audio = MIX if os.path.exists(MIX) else None
                if not audio: print('AVERTISSEMENT : audio/mix_v8.wav absent -> vidéo muette (lancer sound_v8.py)', flush=True)
                entree = ['-framerate', f'{a.fps:g}'] + (['-i', os.path.join(dossier, 'f_%06d.jpg')] if dossier else ['-f', 'image2pipe', '-c:v', 'png', '-i', '-'])
                cmd = ['ffmpeg', '-y', '-v', 'error'] + entree
                if audio: cmd += ['-ss', f'{a.debut:.3f}', '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest']
                cmd += ['-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', f'{a.fps:g}', '-movflags', '+faststart', sortie]
                proc = None if dossier else subprocess.Popen(cmd, stdin=subprocess.PIPE)
                t0 = time.time()
                for i in range(n):
                    t = (i0 + i) / a.fps
                    if dossier:
                        fic = os.path.join(dossier, f'f_{i:06d}.jpg')
                        if not (os.path.exists(fic) and os.path.getsize(fic) > 0):
                            open(fic + '.part', 'wb').write(await image(page, t, 'jpeg')); os.replace(fic + '.part', fic)
                    else: proc.stdin.write(await image(page, t))
                    verifier()
                    if i % 10 == 0 or i == n - 1:
                        e = time.time() - t0; print(f'\r  image {i + 1}/{n}  écoulé {e / 60:.0f} min  reste ~{e / (i + 1) * (n - i - 1) / 60:.0f} min   ', end='', flush=True)
                print(flush=True)
                if dossier: subprocess.run(cmd, check=True)
                else: proc.stdin.close(); proc.wait()
                print('Vidéo :', sortie, flush=True)
        except KeyboardInterrupt:
            code = 130
        except Exception as e:
            print('\nÉCHEC :', e, flush=True); code = 2
        finally:
            await nav.close(); srv.shutdown()
    print('Erreurs / alertes console :', len(erreurs)); [print('  ' + x) for x in erreurs[:10]]
    return code


if __name__ == '__main__':
    try: sys.exit(asyncio.run(main()))
    except KeyboardInterrupt: sys.exit(130)
