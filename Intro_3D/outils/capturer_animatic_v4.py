#!/usr/bin/env python3
"""Capture image par image de l'animatic v4 (aucun enregistrement d'écran : chaque image est calculée à son temps exact).

  py -3 outils\\capturer_animatic_v4.py                  → planche (1 image par plan) + contrôle de déterminisme
  py -3 outils\\capturer_animatic_v4.py --video          → + sorties\\animatic_v4_apercu.mp4 (son v4 inclus)
  options : --fps 30  --largeur 1280  --cloud (rendu logiciel SwiftShader, sans GPU)

Prérequis : py -3 -m pip install playwright pillow ; ffmpeg dans le PATH.
Sur le PC d'Esteban : Chrome avec le GPU (par défaut). Rien n'est écrit hors de Intro_3D\\sorties\\.
"""
import argparse, asyncio, base64, functools, hashlib, http.server, json, os, shutil, socketserver, subprocess, sys, threading

ICI = os.path.dirname(os.path.abspath(__file__))
INTRO = os.path.dirname(ICI)
LAB = os.path.dirname(INTRO)                                   # 00_Lab_Vision_2.0 : racine du serveur (lecture seule)
SORTIES = os.path.join(INTRO, 'sorties')

class Lecteur(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (ConnectionResetError, BrokenPipeError): pass

def serveur():
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Lecteur, directory=LAB))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--video', action='store_true'); ap.add_argument('--fps', type=float, default=30)
    ap.add_argument('--largeur', type=int, default=1280); ap.add_argument('--cloud', action='store_true'); a = ap.parse_args()
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    os.makedirs(SORTIES, exist_ok=True); port = serveur(); L = a.largeur; H = round(L * 9 / 16)
    plans = json.load(open(os.path.join(INTRO, 'data', 'plans_intro_v4.json'), encoding='utf-8'))
    args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if a.cloud else ['--use-angle=d3d11', '--ignore-gpu-blocklist']
    async with async_playwright() as p:
        nav = await p.chromium.launch(channel=None if a.cloud else 'chrome', headless=a.cloud, args=args)
        page = await nav.new_page(viewport={'width': L, 'height': H})
        erreurs = []; page.on('pageerror', lambda e: erreurs.append(str(e)))
        await page.goto(f'http://127.0.0.1:{port}/Intro_3D/animatic_v4.html?capture=1&l={L}&aa=1&qualite=apercu')
        await page.wait_for_function('window.pret === true || window.erreurFilm', timeout=180000)
        e = await page.evaluate('window.erreurFilm || null')
        if e: sys.exit('Erreur de l\'animatic : ' + e)
        async def image(t, fmt='png'):
            await page.evaluate(f'window.rendreTemps({t})')
            d = await page.evaluate(f"document.querySelector('canvas').toDataURL('image/{'jpeg' if fmt == 'jpg' else 'png'}', 0.92).split(',')[1]")
            return base64.b64decode(d)
        # 1. planche : une image au milieu de chaque plan
        vignettes, l, h = [], 320, 180
        for pl in plans['plans']:
            raw = await image((pl['debut'] + pl['fin']) / 2); chemin = os.path.join(SORTIES, '_tmp.png'); open(chemin, 'wb').write(raw)
            im = Image.open(chemin).convert('RGB').resize((l, h)); d = ImageDraw.Draw(im); d.rectangle([0, 0, l, 14], fill=(0, 0, 0)); d.text((3, 1), f"{pl['id']} {pl['titre'][:46]}", fill=(255, 220, 120)); vignettes.append(im)
        col = 7; lignes = (len(vignettes) + col - 1) // col; planche = Image.new('RGB', (l * col, h * lignes))
        for i, im in enumerate(vignettes): planche.paste(im, ((i % col) * l, (i // col) * h))
        planche.save(os.path.join(SORTIES, 'planche_animatic_v4.png')); os.remove(os.path.join(SORTIES, '_tmp.png'))
        # 2. déterminisme : mêmes temps, rendus dans le désordre → mêmes pixels (à ±1 près)
        temoins = [10.0, 30.0, 61.0, 77.6, 89.9]; premiers = {t: await image(t) for t in temoins}; ecarts = {}
        for t in reversed(temoins):
            b2 = await image(t); ecarts[t] = 'identique' if b2 == premiers[t] else 'différent (comparer à ±1)'
        print('Déterminisme :', ecarts)
        # 3. vidéo d'aperçu
        if a.video:
            dossier = os.path.join(SORTIES, '_images'); shutil.rmtree(dossier, ignore_errors=True); os.makedirs(dossier)
            n = int(round(plans['duree'] * a.fps))
            for i in range(n):
                open(os.path.join(dossier, f'f_{i:05d}.jpg'), 'wb').write(await image(i / a.fps, 'jpg'))
                if i % 100 == 0: print(f'  image {i}/{n}')
            sortie = os.path.join(SORTIES, 'animatic_v4_apercu.mp4')
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(a.fps), '-i', os.path.join(dossier, 'f_%05d.jpg'), '-i', os.path.join(INTRO, 'audio_v4', 'audio', 'mix_v4.wav'),
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', sortie], check=True)
            shutil.rmtree(dossier); print('Vidéo :', sortie)
        await nav.close()
    print('Planche :', os.path.join(SORTIES, 'planche_animatic_v4.png'), '· erreurs de page :', len(erreurs))

if __name__ == '__main__':
    asyncio.run(main())
