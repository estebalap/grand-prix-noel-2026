#!/usr/bin/env python3
"""Capture image par image de l'INTRO V6 « L'Hybride Ultime » (aucun enregistrement d'écran : chaque image est calculée à
son temps exact par window.rendreTemps(t), HUD broadcast compris).

  py -3 outils\\capturer_animatic_v6.py                  → planche (1 image par plan) + planche de CONTRÔLE + déterminisme
  py -3 outils\\capturer_animatic_v6.py --video          → + sorties\\intro_v6_hybride.mp4 (son V6 inclus)
  options : --fps 60 (défaut) ou 30   --largeur 1920   --cloud (rendu logiciel SwiftShader, sans GPU)
            --comparer-v5 (la planche de contrôle met la v5 à gauche et la V6 à droite, aux mêmes instants de récit)
            --parc 52 (nombre de bolides du parc fermé ; moins = chargement plus rapide pour un essai)
            --debut 21 --fin 48 --sortie extrait.mp4 (vidéo d'un extrait seulement)   --sans-planche --sans-controle

Sorties dans Intro_3D\\sorties\\ uniquement : planche_intro_v6.png, controle_intro_v6.png, controle_intro_v6.json
(erreurs console, déterminisme, inventaire des modèles), intro_v6_hybride.mp4.
Le script s'arrête en erreur (code 2) si la page émet la moindre erreur ou alerte console.
Prérequis : py -3 -m pip install playwright pillow ; ffmpeg dans le PATH.
"""
import argparse, asyncio, base64, functools, http.server, io, json, os, shutil, socketserver, subprocess, sys, threading

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

def moments_controle(pl):
    """Instants de récit de la planche de contrôle (V6) et leurs équivalents v5, tirés des deux découpages."""
    R, imp, dep = pl['reperes'], pl['impacts'], pl['departs']
    th = R['themes']
    return [
        ('Salon (acte 0) : lisible, réflexions actives', 2.3, 'S2'),
        ('Salon complet : tapis, télé, cheminée, sapin', 6.0, 'S4'),
        ('Parc fermé : vrais bolides m3d (zéro boîte)', (R['dizaines'] + R['cinq']) / 2, 'A3'),
        ('Groupe A : bandeau HUD', R['groupe_A'] + 0.4, 'R0'),
        ('Écurie 1 : concept-car + carte HUD (hold)', dep[0] + 0.9, 'R01'),
        ('Écurie 3 Optic : arcs, sans stroboscope', imp[2] + 0.25, 'R03'),
        ('Écurie 5 Mario : sommet du bond (cadré)', (th[4][0] + imp[4]) / 2, 'R05'),
        ('Écurie 5 Mario : squash à l\'atterrissage', imp[4] + 0.06, 'R05'),
        ('Écurie 8 : dépanneuse + A4 remorquée', dep[7] + 0.8, 'R08'),
        ('Écurie 9 Valstrax : comète en plongée', (dep[8] + imp[8]) / 2, 'R09'),
        ('Écurie 9 Valstrax : onde de choc', imp[8] + 0.25, 'R09'),
        ('Écurie 13 : invocation sans fumée géante', imp[12] + 0.4, 'R13'),
        ('Les 15 concept-cars (plan large)', (th[14][1] + R['attention']) / 2, 'R16'),
        ('Apocalypse : l\'Épave N12 (v9)', R['temoins'] - 0.4, 'AP1'),
        ('Paris en direct : tableau des cotes', R['paris'] + 0.9, 'P3'),
        ('Titre : GRAND PRIX DE NOËL', R['noel'] + 0.5, 'T1'),
    ]

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--video', action='store_true'); ap.add_argument('--fps', type=float, default=60)
    ap.add_argument('--largeur', type=int, default=1920); ap.add_argument('--cloud', action='store_true'); ap.add_argument('--comparer-v5', action='store_true')
    ap.add_argument('--parc', type=int, default=52); ap.add_argument('--sans-planche', action='store_true'); ap.add_argument('--sans-controle', action='store_true')
    ap.add_argument('--debut', type=float, default=0.0); ap.add_argument('--fin', type=float, default=None); ap.add_argument('--sortie', default='intro_v6_hybride.mp4'); a = ap.parse_args()
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw, ImageFont
    os.makedirs(SORTIES, exist_ok=True); port = serveur(); L = a.largeur; H = round(L * 9 / 16)
    plans = json.load(open(os.path.join(INTRO, 'data', 'plans_intro_v6.json'), encoding='utf-8'))
    args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if a.cloud else ['--use-angle=d3d11', '--ignore-gpu-blocklist']
    try: police = ImageFont.truetype('arial.ttf', 15)
    except OSError:
        try: police = ImageFont.truetype('DejaVuSans.ttf', 15)
        except OSError: police = ImageFont.load_default()
    rapport = {'version': 'v6', 'largeur': L, 'erreurs_console': [], 'determinisme': {}, 'inventaire': None}

    async def ouvrir(nav, page_html):
        page = await nav.new_page(viewport={'width': L, 'height': H})
        erreurs = []
        page.on('pageerror', lambda e: erreurs.append('pageerror : ' + str(e)))
        page.on('console', lambda m: erreurs.append(f'{m.type} : {m.text}') if m.type in ('error', 'warning') else None)
        await page.goto(f'http://127.0.0.1:{port}/Intro_3D/{page_html}?capture=1&l={L}&aa=1&qualite=apercu&parc={a.parc}')
        await page.wait_for_function('window.pret === true || window.erreurFilm', timeout=900000)
        e = await page.evaluate('window.erreurFilm || null')
        if e: sys.exit(f'Erreur de {page_html} : {e}')
        return page, erreurs

    async def image(page, t, fmt='png'):
        await page.evaluate(f'window.rendreTemps({t})')
        d = await page.evaluate(f"document.querySelector('canvas').toDataURL('image/{'jpeg' if fmt == 'jpg' else 'png'}', 0.92).split(',')[1]")
        return base64.b64decode(d)

    def vignette(raw, l, h, legende):
        im = Image.open(io.BytesIO(raw)).convert('RGB').resize((l, h), Image.LANCZOS); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, l, 22], fill=(0, 0, 0)); d.text((5, 3), legende, fill=(255, 220, 120), font=police); return im

    async with async_playwright() as p:
        nav = await p.chromium.launch(channel=None if a.cloud else 'chrome', headless=a.cloud, args=args)
        page, erreurs = await ouvrir(nav, 'animatic_v6.html')
        rapport['inventaire'] = json.loads(await page.evaluate('JSON.stringify(window.inventaireFilm || null)'))
        # 1. planche : une image au milieu de chaque plan
        if not a.sans_planche:
            vign = []
            for pl in plans['plans']:
                raw = await image(page, (pl['debut'] + pl['fin']) / 2)
                vign.append(vignette(raw, 384, 216, f"{pl['id']} {pl['titre'][:44]}"))
            col = 6; lignes = (len(vign) + col - 1) // col; planche = Image.new('RGB', (384 * col, 216 * lignes))
            for i, im in enumerate(vign): planche.paste(im, ((i % col) * 384, (i // col) * 216))
            planche.save(os.path.join(SORTIES, 'planche_intro_v6.png'))
        # 2. planche de CONTRÔLE (moments clés, v5 à gauche si demandé)
        moments = moments_controle(plans) if not a.sans_controle else []
        v6 = [(m, await image(page, t)) for (m, t, _) in moments]
        v5 = None
        if a.comparer_v5 and os.path.exists(os.path.join(INTRO, 'data', 'plans_intro_v5.json')):
            p5 = json.load(open(os.path.join(INTRO, 'data', 'plans_intro_v5.json'), encoding='utf-8'))
            page5, err5 = await ouvrir(nav, 'animatic_v5.html')
            def t5(id_):                                                         # même moment de récit dans la v5 : milieu du plan homonyme
                cands = [q for q in p5['plans'] if q['id'] == id_] or [q for q in p5['plans'] if q['id'].startswith(id_)]
                q = cands[0]; return (q['debut'] + q['fin']) / 2
            v5 = [await image(page5, t5(pid)) for (_, _, pid) in moments]
            await page5.close()
        lv, hv = 640, 360; col = 2 if v5 else 4; lignes = max(1, len(moments) if v5 else (len(moments) + 3) // 4)
        ctrl = Image.new('RGB', (lv * col, (hv + 4) * lignes), (8, 8, 12))
        for i, (m, raw) in enumerate(v6):
            if v5:
                ctrl.paste(vignette(v5[i], lv, hv, 'v5 — ' + m), (0, i * (hv + 4))); ctrl.paste(vignette(raw, lv, hv, 'V6 — ' + m), (lv, i * (hv + 4)))
            else:
                ctrl.paste(vignette(raw, lv, hv, m), ((i % col) * lv, (i // col) * (hv + 4)))
        if moments: ctrl.save(os.path.join(SORTIES, 'controle_intro_v6.png'))
        # 3. déterminisme : mêmes temps, rendus dans le désordre → mêmes pixels
        temoins = [2.0, 24.0, plans['impacts'][4] + 0.06, plans['impacts'][8] - 0.3, 126.5]
        premiers = {t: await image(page, t) for t in temoins}
        for t in reversed(temoins):
            rapport['determinisme'][f'{t:.2f}'] = 'identique' if (await image(page, t)) == premiers[t] else 'différent'
        # 4. vidéo
        if a.video:
            dossier = os.path.join(SORTIES, '_images_v6'); shutil.rmtree(dossier, ignore_errors=True); os.makedirs(dossier)
            t_fin = min(plans['duree'], a.fin if a.fin is not None else plans['duree'])
            i0, n = int(round(a.debut * a.fps)), int(round(t_fin * a.fps)) - int(round(a.debut * a.fps))
            for i in range(n):
                open(os.path.join(dossier, f'f_{i:05d}.jpg'), 'wb').write(await image(page, (i0 + i) / a.fps, 'jpg'))
                if i % 120 == 0: print(f'  image {i}/{n}', flush=True)
            sortie = os.path.join(SORTIES, a.sortie)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(a.fps), '-i', os.path.join(dossier, 'f_%05d.jpg'), '-ss', f'{a.debut:.3f}', '-i', os.path.join(INTRO, 'audio_v6', 'audio', 'mix_v6.wav'),
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', sortie], check=True)
            shutil.rmtree(dossier); print('Vidéo :', sortie)
        rapport['erreurs_console'] = erreurs
        await nav.close()
    json.dump(rapport, open(os.path.join(SORTIES, 'controle_intro_v6.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Planche de contrôle :', os.path.join(SORTIES, 'controle_intro_v6.png'))
    print('Déterminisme :', rapport['determinisme'])
    print('Erreurs / alertes console :', len(rapport['erreurs_console']))
    if rapport['erreurs_console']:
        print('\n'.join(rapport['erreurs_console'][:20])); sys.exit(2)

if __name__ == '__main__':
    asyncio.run(main())
