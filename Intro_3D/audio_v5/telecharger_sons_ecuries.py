#!/usr/bin/env python3
"""Télécharge (une seule fois) les vrais enregistrements BBC des SIGNATURES D'ÉCURIES listés dans themes_ecuries.json
(clé 'bbc' de chaque écurie) dans sons_ecuries/.

Sources : BBC Sound Effects Library (https://sound-effects.bbcrewind.co.uk), WAV d'origine, non retouchés ;
et, quand une couche porte "source": "archive.org", un 78 tours ancien du domaine public (Internet Archive,
collection George Blood) téléchargé en MP3 puis converti en WAV par ffmpeg (contenu identique, format seulement).
Licence : RemArc (© BBC) : usage personnel (soirée familiale privée). Ne pas publier la vidéo en ligne avec ces sons.
Un fichier déjà présent et lisible n'est pas retéléchargé. Sortie non nulle si un son manque.
Une écurie dont TON extrait est déposé dans themes_ecuries/ n'a pas besoin de ses sons BBC (ils sont quand même
téléchargés : ils resservent si tu retires ton fichier).
"""
import json, os, subprocess, sys, urllib.request, wave

HERE = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.join(HERE, 'sons_ecuries')
URL = 'https://sound-effects-media.bbcrewind.co.uk/wav/{}.wav'

def lisible(chemin):
    try:
        with wave.open(chemin) as w:
            return w.getnframes() > 0
    except Exception:
        return False

def main():
    ecuries = json.load(open(os.path.join(HERE, 'themes_ecuries.json'), encoding='utf-8'))['ecuries']
    sons = {}
    for n, e in sorted(ecuries.items(), key=lambda kv: int(kv[0])):
        for c in e.get('bbc', []):
            sons.setdefault(c['son'], (f"écurie {n} ({e['nom']}) : {c.get('quoi', '')}", c.get('url')))
    os.makedirs(DOSSIER, exist_ok=True)
    manquants = []
    for i, (ident, (desc, url)) in enumerate(sons.items(), 1):
        chemin = os.path.join(DOSSIER, ident + '.wav')
        if os.path.exists(chemin) and lisible(chemin):
            print(f'[{i:2d}/{len(sons)}] déjà là   {ident}  {desc}'); continue
        try:
            tmp = chemin + '.part'
            req = urllib.request.Request(url or URL.format(ident), headers={'User-Agent': 'Mozilla/5.0 (GP-Noel intro)'})
            with urllib.request.urlopen(req, timeout=120) as r, open(tmp, 'wb') as f:
                while True:
                    bloc = r.read(1 << 20)
                    if not bloc: break
                    f.write(bloc)
            if url:                                                                          # MP3 archive.org → WAV
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'mp3', '-i', tmp, '-ar', '44100', chemin], check=True); os.remove(tmp)
            else:
                os.replace(tmp, chemin)
            if not lisible(chemin): raise ValueError('WAV illisible')
            print(f'[{i:2d}/{len(sons)}] téléchargé {ident}  {desc}')
        except Exception as ex:
            manquants.append(ident); print(f'[{i:2d}/{len(sons)}] ÉCHEC     {ident}  {desc} : {ex}')
            if os.path.exists(chemin + '.part'): os.remove(chemin + '.part')
    if manquants:
        sys.exit(f'{len(manquants)} son(s) manquant(s) : {", ".join(manquants)} — relancer plus tard (connexion).')
    print(f'OK : {len(sons)} sons d\'écuries dans sons_ecuries/')

if __name__ == '__main__':
    main()
