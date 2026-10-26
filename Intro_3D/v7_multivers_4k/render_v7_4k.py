#!/usr/bin/env python3
"""Rendu image par image du TRAILER V7 « Multivers -> Ring » (CGI 4K, 120 s, 60 images/s).

Aucun enregistrement d'écran : chaque image est calculée à son temps exact par window.rendreTemps(t, {sub: M})
(M sous-expositions temporelles = flou de mouvement), HUD vectoriel compris, puis envoyée à ffmpeg par stdin
(-f image2pipe) : aucun fichier par image (sauf avec --images, qui permet la reprise).

  py -3 render_v7_4k.py --qualite 4k            -> sorties\\trailer_v7_4k.mp4   3840x2160, 60 i/s, flou 3 sous-expositions
  py -3 render_v7_4k.py --qualite 1080p         -> sorties\\trailer_v7_1080p.mp4  1920x1080, 60 i/s
  py -3 render_v7_4k.py --qualite apercu_cloud  -> planche contact 6x6 (36 reperes) + planche EXHAUSTIVE 6x8 (48 cles : les 15 ecuries
                                                   monde natif + Ring, actes I, III, IV, V, VI) + controle JSON, SwiftShader (sans GPU)
  py -3 render_v7_4k.py --qualite apercu_cloud --extrait 20 32 --fps 12   -> + sorties\\extrait_v7.mp4 (démonstration)

Options communes : --debut/--fin (s)  --fps  --largeur  --sortie  --port (8791)  --gpu  --cloud  --format png|jpeg
                   --controle-complet (apercu : les 48 cles re-rendues en ordre inverse et comparees octet a octet)
                   --subframes M (défaut 3 en 4k, 1 sinon)  --reprendre (avec --images DOSSIER)  --tolerer-son
Encodage 4k/1080p : NVENC (hevc_nvenc puis h264_nvenc, -cq 16) si une carte NVIDIA est réellement utilisable,
sinon libx264 -crf 16 -preset slow ; yuv420p, +faststart, tag hvc1 en HEVC ; son audio\\mix_v7.wav en AAC 320k s'il existe.

Sorties dans Intro_3D\\sorties\\ uniquement. Code de sortie : 0 = propre ; 2 = erreur de page, erreur/alerte console
ou échec ffmpeg ; 130 = interruption (Ctrl+C). Prérequis : py -3 -m pip install playwright pillow ; ffmpeg dans le PATH.
"""
import argparse, asyncio, base64, datetime, functools, http.server, io, json, os, shutil, socketserver, subprocess, sys, threading, time

ICI = os.path.dirname(os.path.abspath(__file__))               # Intro_3D/v7_multivers_4k
INTRO = os.path.dirname(ICI)                                   # Intro_3D
RACINE = os.path.dirname(INTRO)                                # racine du dépôt (ou 00_Lab_Vision_2.0 sur le PC)
SORTIES = os.path.join(INTRO, 'sorties')
MIX = os.path.join(ICI, 'audio', 'mix_v7.wav')
PAGE_DEFAUT = 'Intro_3D/v7_multivers_4k/index.html'
VERSION = 'v7'

ARGS_CLOUD = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
ARGS_GPU = ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist']


class Lecteur(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (ConnectionResetError, BrokenPipeError): pass


def serveur(racine, port):
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    try: srv = socketserver.ThreadingTCPServer(('127.0.0.1', port), functools.partial(Lecteur, directory=racine))
    except OSError: srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Lecteur, directory=racine))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def encodeur_materiel():
    """Retourne 'hevc_nvenc', 'h264_nvenc' ou None : l'encodeur est listé ET réellement utilisable (essai sur 2 images)."""
    try: liste = subprocess.run(['ffmpeg', '-hide_banner', '-encoders'], capture_output=True, text=True, timeout=30).stdout
    except (OSError, subprocess.TimeoutExpired): return None
    for nom in ('hevc_nvenc', 'h264_nvenc'):
        if nom not in liste: continue
        essai = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:r=10:d=0.2', '-c:v', nom, '-f', 'null', '-'],
                               capture_output=True, text=True)
        if essai.returncode == 0: return nom
    return None


def commande_ffmpeg(a, fps, debut, entree, audio, sortie):
    """entree = ['-f','image2pipe',...,'-i','-'] ou une séquence d'images ; audio = chemin du .wav ou None."""
    cmd = ['ffmpeg', '-y', '-v', 'error'] + entree
    if audio: cmd += ['-ss', f'{debut:.3f}', '-i', audio, '-map', '0:v', '-map', '1:a']
    hw = a.encodeur
    if hw == 'hevc_nvenc': cmd += ['-c:v', 'hevc_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '16', '-b:v', '0', '-tag:v', 'hvc1']
    elif hw == 'h264_nvenc': cmd += ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', '16', '-b:v', '0']
    else: cmd += ['-c:v', 'libx264', '-crf', '16' if a.qualite != 'apercu_cloud' else '20', '-preset', 'slow' if a.qualite != 'apercu_cloud' else 'veryfast']
    cmd += ['-r', f'{fps:g}', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    if audio: cmd += ['-c:a', 'aac', '-b:a', '320k', '-shortest']
    return cmd + [sortie]


async def fermer_ffmpeg(proc, succes):
    """Termine proprement ffmpeg : fermeture de stdin (finalise le MP4) si tout va bien, sinon arrêt immédiat. Retourne (code, stderr)."""
    if proc is None: return 0, ''
    try:
        if proc.stdin and not proc.stdin.is_closing():
            try: proc.stdin.close()
            except Exception: pass
        if not succes and proc.returncode is None:
            proc.terminate()
        try: await asyncio.wait_for(proc.wait(), timeout=600 if succes else 20)
        except asyncio.TimeoutError:
            proc.kill(); await proc.wait()
        err = (await proc.stderr.read()).decode('utf-8', 'replace') if proc.stderr else ''
        return proc.returncode, err
    except Exception as e:
        return 1, str(e)


def formater(s):
    s = max(0, int(s)); return f'{s // 3600}h{(s % 3600) // 60:02d}m{s % 60:02d}s' if s >= 3600 else f'{s // 60}m{s % 60:02d}s'


def progression(i, n, t0):
    ecoule = time.time() - t0; reste = ecoule / i * (n - i) if i else 0
    print(f'\r  image {i}/{n}  ({100 * i / max(1, n):5.1f} %)  écoulé {formater(ecoule)}  reste ~{formater(reste)}   ', end='', flush=True)


def police(taille):
    from PIL import ImageFont
    for nom in ('arial.ttf', 'DejaVuSans.ttf', 'LiberationSans-Regular.ttf'):
        try: return ImageFont.truetype(nom, taille)
        except OSError: pass
    return ImageFont.load_default()


def mesure_vignette(raw):
    """Luminance moyenne (0-1) et part de pixels clairs (luma > 0,7) d'une image : repère objectif d'un plan délavé."""
    from PIL import Image
    im = Image.open(io.BytesIO(raw)).convert('L').resize((240, 135))
    px = im.tobytes(); n = len(px)                             # 1 octet par pixel (mode L), sans API dépréciée
    return round(sum(px) / n / 255, 4), round(sum(1 for v in px if v > 178) / n, 4)


def planche_contact(vignettes, reperes, chemin, col=6):
    """Grille col colonnes : vignettes 16:9, légende (label + t) sous chaque image, fond sombre."""
    from PIL import Image, ImageDraw
    lv, hv, bandeau, marge = 384, 216, 30, 8
    lignes = (len(vignettes) + col - 1) // col
    W = marge + col * (lv + marge); H = marge + lignes * (hv + bandeau + marge)
    img = Image.new('RGB', (W, H), (10, 10, 16)); d = ImageDraw.Draw(img); f1, f2 = police(14), police(12)
    for k, (raw, r) in enumerate(zip(vignettes, reperes)):
        x = marge + (k % col) * (lv + marge); y = marge + (k // col) * (hv + bandeau + marge)
        im = Image.open(io.BytesIO(raw)).convert('RGB').resize((lv, hv), Image.LANCZOS)
        img.paste(im, (x, y)); d.rectangle([x, y + hv, x + lv - 1, y + hv + bandeau - 1], fill=(22, 22, 32))
        d.text((x + 6, y + hv + 3), str(r.get('label', ''))[:46], fill=(255, 222, 128), font=f1)
        d.text((x + 6, y + hv + 17), f"t = {float(r['t']):7.2f} s" + (f"   {r['groupe']}" if r.get('groupe') else ''), fill=(150, 160, 185), font=f2)
        d.rectangle([x - 1, y - 1, x + lv, y + hv + bandeau], outline=(48, 52, 70))
    img.save(chemin)


async def main():
    ap = argparse.ArgumentParser(description='Rendu du trailer V7 Multivers (4K, 1080p, planche contact).')
    ap.add_argument('--qualite', choices=['4k', '1080p', 'apercu_cloud'], default='apercu_cloud')
    ap.add_argument('--subframes', type=int, default=None, help='sous-expositions par image (défaut 3 en 4k, 1 sinon ; 1 = pas de flou)')
    ap.add_argument('--debut', type=float, default=0.0); ap.add_argument('--fin', type=float, default=None)
    ap.add_argument('--fps', type=float, default=None); ap.add_argument('--largeur', type=int, default=None)
    ap.add_argument('--sortie', default=None); ap.add_argument('--port', type=int, default=8791)
    ap.add_argument('--gpu', action='store_true', help='ANGLE matériel (d3d11), fenêtre visible : PC d\'Esteban')
    ap.add_argument('--cloud', action='store_true', help='Chromium headless SwiftShader (sans GPU)')
    ap.add_argument('--format', choices=['png', 'jpeg'], default='png'); ap.add_argument('--reprendre', action='store_true')
    ap.add_argument('--images', default=None, help='dossier de travail : écrit les images (reprise possible) au lieu du tube stdin')
    ap.add_argument('--extrait', nargs='*', type=float, default=None, metavar='T', help='[DEBUT FIN] : court MP4 de démonstration (défaut 0 12) en apercu_cloud')
    ap.add_argument('--sans-planche', action='store_true'); ap.add_argument('--tolerer-son', action='store_true')
    ap.add_argument('--controle-complet', action='store_true', help='déterminisme : les 48 clés re-rendues en ordre inverse')
    ap.add_argument('--racine-test', default=None, help=argparse.SUPPRESS); ap.add_argument('--page', default=None, help=argparse.SUPPRESS)
    a = ap.parse_args()

    from playwright.async_api import async_playwright
    apercu = a.qualite == 'apercu_cloud'
    if apercu: a.cloud = True
    racine = os.path.abspath(a.racine_test) if a.racine_test else RACINE
    page_url = (a.page or PAGE_DEFAUT).lstrip('/')
    qualite_page = {'4k': 'master', '1080p': 'master', 'apercu_cloud': 'apercu'}[a.qualite]
    sub = a.subframes if a.subframes is not None else (3 if a.qualite == '4k' else 1)
    if apercu: sub = 1 if a.subframes is None else a.subframes
    if sub < 1: sys.exit('--subframes doit être >= 1')
    os.makedirs(SORTIES, exist_ok=True)
    srv = serveur(racine, a.port); port = srv.server_address[1]
    audio = MIX if os.path.exists(MIX) else None
    fmt = 'jpeg' if a.format == 'jpeg' else 'png'; qj = 0.97
    rapport = {'version': VERSION + '.1', 'qualite': a.qualite, 'sous_expositions': sub, 'date': datetime.datetime.now().isoformat(timespec='seconds'),
               'reperes': [], 'temps_rendu_s': [], 'determinisme': None, 'erreurs_console': [], 'sortie_video': None,
               'planche_exhaustive': None, 'ecuries': [], 'son': None}
    erreurs = []; a.encodeur = None                              # extrait de démonstration : toujours libx264

    def filtre(msg):
        if a.tolerer_son and ('Bande-son absente' in msg or 'mix_v7' in msg): return
        erreurs.append(msg)

    code = 0
    async with async_playwright() as p:
        args = ARGS_CLOUD if a.cloud else ARGS_GPU
        nav = await p.chromium.launch(channel=None if a.cloud else 'chrome', headless=bool(a.cloud), args=args)

        async def ouvrir(L):
            H = round(L * 9 / 16)
            page = await nav.new_page(viewport={'width': L, 'height': H})
            page.on('pageerror', lambda e: filtre('pageerror : ' + str(e)))
            page.on('console', lambda m: filtre(f'{m.type} : {m.text}') if m.type in ('error', 'warning') else None)
            # V7.1 : toute ressource en échec est nommée (URL + statut) : « Failed to load resource » seul ne dit pas laquelle
            page.on('response', lambda r: erreurs.append(f'ressource {r.status} : {r.url}') if r.status >= 400 else None)
            await page.goto(f'http://127.0.0.1:{port}/{page_url}?capture=1&l={L}&sub={sub}&qualite={qualite_page}')
            print(f'Chargement de la page ({L}x{H}, sous-expositions {sub}, qualité {qualite_page}) ...', flush=True)
            await page.wait_for_function('window.pret === true || !!window.erreurFilm', timeout=900000)
            e = await page.evaluate('window.erreurFilm || null')
            if e: raise RuntimeError(f'Erreur de la page : {e}')
            return page

        async def image(page, t, fmt_=None):
            r = await page.evaluate("""async ([t, sub, fmt, q]) => { await window.rendreTemps(t, { sub: sub });
                                         return await window.imageBase64(fmt, q); }""", [t, sub, fmt_ or fmt, qj])
            return base64.b64decode(r)

        def verifier_console():
            if erreurs: raise RuntimeError('Erreur / alerte console : ' + ' | '.join(erreurs[:5]))

        async def video(page, L, fps, debut, fin, sortie):
            """Rend [debut, fin) à fps images/s ; tube vers ffmpeg, ou dossier d'images si --images."""
            i0 = int(round(debut * fps)); n = int(round(fin * fps)) - i0
            if n <= 0: raise RuntimeError('Intervalle vide (--debut / --fin).')
            muet = audio is None
            if muet: print('AVERTISSEMENT : audio\\mix_v7.wav absent -> vidéo MUETTE (lancer sound_v7_crescendo.py puis relancer).', flush=True)
            ext = 'jpg' if fmt == 'jpeg' else 'png'; proc = None; ok = False; t0 = time.time()
            try:
                if a.images:
                    dossier = os.path.abspath(a.images); os.makedirs(dossier, exist_ok=True)
                    for i in range(n):
                        fic = os.path.join(dossier, f'f_{i:06d}.{ext}')
                        if not (a.reprendre and os.path.exists(fic) and os.path.getsize(fic) > 0):
                            tmp = fic + '.part'; open(tmp, 'wb').write(await image(page, (i0 + i) / fps)); os.replace(tmp, fic)
                        verifier_console()
                        if i % 10 == 0 or i == n - 1: progression(i + 1, n, t0)
                    entree = ['-framerate', f'{fps:g}', '-i', os.path.join(dossier, f'f_%06d.{ext}')]
                    proc = await asyncio.create_subprocess_exec(*commande_ffmpeg(a, fps, debut, entree, audio, sortie), stderr=asyncio.subprocess.PIPE)
                else:
                    entree = ['-f', 'image2pipe', '-c:v', 'mjpeg' if fmt == 'jpeg' else 'png', '-framerate', f'{fps:g}', '-i', '-']
                    proc = await asyncio.create_subprocess_exec(*commande_ffmpeg(a, fps, debut, entree, audio, sortie),
                                                                stdin=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
                    for i in range(n):
                        proc.stdin.write(await image(page, (i0 + i) / fps)); await proc.stdin.drain()
                        verifier_console()
                        if i % 5 == 0 or i == n - 1: progression(i + 1, n, t0)
                ok = True
            except (BrokenPipeError, ConnectionResetError):
                ok = False
                _, err = await fermer_ffmpeg(proc, False); proc = None
                raise RuntimeError('ffmpeg s\'est arrêté : ' + err.strip()[-800:])
            finally:
                if proc is not None:
                    c, err = await fermer_ffmpeg(proc, ok)
                    if ok and c != 0: raise RuntimeError(f'ffmpeg a échoué (code {c}) : ' + err.strip()[-800:])
                print(flush=True)
            print('Vidéo :', sortie, flush=True)
            rapport['sortie_video'] = sortie

        page = None
        try:
            L = a.largeur or (3840 if a.qualite == '4k' else 1920 if a.qualite == '1080p' else 960)
            if apercu and a.extrait is not None and a.largeur is None and a.sans_planche: L = 640
            page = await ouvrir(L); verifier_console()
            duree = float(await page.evaluate('window.dureeFilm || 120')); fps_film = float(await page.evaluate('window.fpsFilm || 60'))
            if apercu:
                # 1. planche contact : les 36 repères de la page
                if not a.sans_planche:
                    reperes = json.loads(await page.evaluate('JSON.stringify(window.reperesPlanche || [])'))
                    if not reperes: raise RuntimeError('window.reperesPlanche est vide.')
                    vign = []
                    for k, r in enumerate(reperes):
                        t0 = time.time(); vign.append(await image(page, float(r['t']), 'png')); verifier_console()
                        rapport['temps_rendu_s'].append(round(time.time() - t0, 3)); print(f'\r  repère {k + 1}/{len(reperes)}   ', end='', flush=True)
                    print(flush=True)
                    rapport['reperes'] = reperes
                    chemin = os.path.join(SORTIES, 'planche_v7_multivers.png'); planche_contact(vign, reperes, chemin)
                    print('Planche contact :', chemin, flush=True)
                    # 1 bis. planche EXHAUSTIVE 6 x 8 : les 15 écuries sans exception (monde natif + Ring), puis les actes I, III à VI
                    r48 = json.loads(await page.evaluate('JSON.stringify(window.reperesPlanche48 || [])'))
                    if len(r48) != 48: raise RuntimeError(f'window.reperesPlanche48 : 48 repères attendus, {len(r48)} trouvés')
                    v48 = []
                    for k, r in enumerate(r48):
                        v48.append(await image(page, float(r['t']), 'png')); verifier_console(); print(f'\r  clé {k + 1}/48   ', end='', flush=True)
                    print(flush=True)
                    chemin48 = os.path.join(SORTIES, 'planche_v7_15_ecuries_et_pieges.png'); planche_contact(v48, r48, chemin48)
                    print('Planche exhaustive :', chemin48, flush=True)
                    mesures = [mesure_vignette(b) for b in v48]
                    rapport['planche_exhaustive'] = {'fichier': os.path.relpath(chemin48, INTRO).replace(os.sep, '/'),
                        'cles': [{**r, 'luminance': m[0], 'pixels_clairs': m[1]} for r, m in zip(r48, mesures)],
                        'plans_delaves': [r['label'] for r, m in zip(r48, mesures) if m[0] > 0.42 or m[1] > 0.25]}
                    rapport['ecuries'] = [{'ecurie': k + 1, 'monde': r48[2 * k]['label'], 't_monde': r48[2 * k]['t'], 't_ring': r48[2 * k + 1]['t'],
                                           'luminance_monde': mesures[2 * k][0], 'luminance_ring': mesures[2 * k + 1][0]} for k in range(15)]
                    # déterminisme : les clés re-rendues dans l'ORDRE INVERSE (état précédent différent) -> mêmes octets PNG
                    ordre = list(range(47, -1, -1)) if a.controle_complet else [47, 40, 33, 30, 29, 24, 17, 12, 5, 0]
                    diff = []
                    for k in ordre:
                        if (await image(page, float(r48[k]['t']), 'png')) != v48[k]: diff.append(r48[k]['label'] + f" (t = {r48[k]['t']})")
                    t_ref = float(reperes[0]['t']); same36 = (await image(page, t_ref, 'png')) == vign[0]
                    rapport['determinisme'] = {'verdict': 'identique' if not diff and same36 else 'différent', 'cles_verifiees': len(ordre) + 1,
                                               'ordre': 'inverse, apres la planche complete', 'differences': diff}
                # 2. extrait de démonstration
                if a.extrait is not None:
                    if len(a.extrait) >= 2: deb, fin = a.extrait[0], a.extrait[1]
                    elif len(a.extrait) == 1: deb, fin = a.extrait[0], a.extrait[0] + 12.0
                    else: deb, fin = 0.0, 12.0
                    fin = min(fin, duree); fps = a.fps or 12.0; Lx = a.largeur or 640
                    if Lx != L: await page.close(); page = await ouvrir(Lx); verifier_console()
                    await video(page, Lx, fps, deb, fin, os.path.join(SORTIES, a.sortie or 'extrait_v7.mp4'))
            else:
                a.encodeur = encodeur_materiel()
                print('Encodeur :', a.encodeur or 'libx264 (logiciel)', flush=True)
                fps = a.fps or fps_film; fin = min(duree, a.fin if a.fin is not None else duree)
                defaut = 'trailer_v7_4k.mp4' if a.qualite == '4k' else 'trailer_v7_1080p.mp4'
                sortie = a.sortie if a.sortie and os.path.isabs(a.sortie) else os.path.join(SORTIES, a.sortie or defaut)
                await video(page, L, fps, a.debut, fin, sortie)
            verifier_console()
        except KeyboardInterrupt:
            print('\nInterrompu (Ctrl+C).', flush=True); code = 130
        except asyncio.CancelledError:
            print('\nInterrompu.', flush=True); code = 130
        except Exception as e:
            print(f'\nÉCHEC : {e}', flush=True); code = 2
        finally:
            rapport['erreurs_console'] = erreurs
            try: await nav.close()
            except Exception: pass
    srv.shutdown()
    tl_son = os.path.join(ICI, 'data', 'timeline_v7.json')
    if os.path.exists(tl_son):
        try:
            ts = json.load(open(tl_son, encoding='utf-8'))
            rapport['son'] = {'mix': ts.get('mix'), 'bilan': ts.get('bilan'), 'voix_off': [{k: v for k, v in r.items() if k != 'debit'} for r in ts.get('voix_off', [])],
                              'signatures': [{'ecurie': e['id'], 'source': e.get('source'), 'impact': e['impact'], **({'eclat': e['signature']['t_eclat'], 'fichiers': e['signature']['sources']} if e.get('signature') else {})} for e in ts.get('ecuries', [])],
                              'mix_present': os.path.exists(MIX)}
        except (OSError, ValueError, KeyError) as ex:
            rapport['son'] = {'erreur': str(ex)}
    if apercu and rapport['reperes']:
        chemin = os.path.join(SORTIES, 'controle_v7_multivers.json')
        json.dump(rapport, open(chemin, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('Contrôle :', chemin)
    if rapport['determinisme']: print('Déterminisme :', rapport['determinisme'])
    if rapport.get('planche_exhaustive'): print('Plans délavés (luminance > 0,42 ou > 25 % de pixels clairs) :', rapport['planche_exhaustive']['plans_delaves'] or 'aucun')
    print('Erreurs / alertes console :', len(erreurs))
    if erreurs:
        print('\n'.join(erreurs[:20])); code = code or 2
        if code == 130: pass
    return code


if __name__ == '__main__':
    try: sys.exit(asyncio.run(main()))
    except KeyboardInterrupt: print('\nInterrompu (Ctrl+C).'); sys.exit(130)
