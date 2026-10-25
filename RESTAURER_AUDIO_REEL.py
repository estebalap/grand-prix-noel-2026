#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restaure l'audio réel de l'intro 3D (thèmes d'écuries, signatures, voix off, mix V6) à partir de AUDIO_REEL_INTRO_3D.zip.

Pourquoi : le dépôt GitHub public ne contient ni les extraits musicaux commerciaux (droits d'auteur) ni les mix .wav
(> 5 Mo). Ce script remet chaque fichier à sa place dans Intro_3D/ (audio_v5/themes_ecuries/, audio_v5/signatures_reelles/,
audio_v5/voix/, audio_v4/voix/, audio_v6/...) pour que sound_v6.py, l'animatic et la capture vidéo fonctionnent.

Usage (Python 3.8+, aucune dépendance) :
    python3 RESTAURER_AUDIO_REEL.py                       → cherche les archives et le dossier Intro_3D automatiquement
                                                            (AUDIO_REEL_INTRO_3D.zip et, s'il est là, AUDIO_REEL_INTRO_3D_MIX_V6.zip)
    python3 RESTAURER_AUDIO_REEL.py --zip chemin/AUDIO_REEL_INTRO_3D.zip --cible chemin/Intro_3D
    python3 RESTAURER_AUDIO_REEL.py --verifier            → contrôle seulement (sommes SHA-256), n'écrit rien
    python3 RESTAURER_AUDIO_REEL.py --forcer              → remplace aussi les fichiers différents (copie .bak gardée)

Recherche automatique :
  archives : --zip (répétable), sinon AUDIO_REEL_INTRO_3D*.zip à côté de ce script, dans le dossier courant ou près
            d'Intro_3D (le pack est livré en deux archives de moins de 30 Mo : sons + voix, puis mix V6) ;
  cible   : --cible, sinon ./Intro_3D, le dossier courant s'il s'appelle Intro_3D, puis ../Intro_3D en remontant
            depuis ce script et depuis le dossier courant.
Sécurité : seuls les chemins listés dans MANIFESTE_AUDIO.json et situés sous audio_v4/, audio_v5/ ou audio_v6/ sont
extraits (aucune sortie de dossier possible) ; chaque fichier est vérifié par SHA-256 ; un fichier existant identique
est laissé tel quel ; un fichier existant DIFFÉRENT n'est jamais écrasé sans --forcer.
Code de sortie : 0 = tout est en place, 1 = erreur, 2 = fichiers différents laissés en place (relancer avec --forcer).
"""
import argparse, hashlib, json, os, shutil, sys, zipfile

import glob
MOTIF_ZIP = 'AUDIO_REEL_INTRO_3D*.zip'
PREFIXES_AUTORISES = ('audio_v4/', 'audio_v5/', 'audio_v6/')
ICI = os.path.dirname(os.path.abspath(__file__))


def sha256(octets):
    return hashlib.sha256(octets).hexdigest()


def sha256_fichier(chemin):
    h = hashlib.sha256()
    with open(chemin, 'rb') as f:
        for bloc in iter(lambda: f.read(1 << 20), b''):
            h.update(bloc)
    return h.hexdigest()


def remonter(depart):
    d = os.path.abspath(depart)
    while True:
        yield d
        parent = os.path.dirname(d)
        if parent == d:
            return
        d = parent


def trouver_cible(cible):
    if cible:
        c = os.path.abspath(cible)
        if not os.path.isdir(c):
            sys.exit(f'ÉCHEC : dossier cible introuvable : {c}')
        return c
    cwd = os.getcwd()
    if os.path.basename(cwd) == 'Intro_3D':
        return cwd
    for depart in (cwd, ICI):
        for d in remonter(depart):
            for candidat in (os.path.join(d, 'Intro_3D'),
                             os.path.join(d, '00_Lab_Vision_2.0', 'Intro_3D'),
                             os.path.join(d, 'Noël', '00_Lab_Vision_2.0', 'Intro_3D')):
                if os.path.isdir(os.path.join(candidat, 'src')):
                    return candidat
    sys.exit('ÉCHEC : dossier Intro_3D introuvable. Préciser --cible chemin/vers/Intro_3D')


def trouver_zips(zips, cible):
    if zips:
        for z in zips:
            if not os.path.isfile(z):
                sys.exit(f'ÉCHEC : archive introuvable : {z}')
        return [os.path.abspath(z) for z in zips]
    for d in (ICI, os.getcwd(), cible, os.path.dirname(cible)):
        trouves = sorted(glob.glob(os.path.join(d, MOTIF_ZIP)))
        if trouves:
            return trouves
    sys.exit(f'ÉCHEC : aucune archive {MOTIF_ZIP} trouvée (à côté du script, dans le dossier courant ou près d\'Intro_3D). Préciser --zip')


def restaurer(archive, cible, a):
    poses = identiques = differents = 0
    with zipfile.ZipFile(archive) as z:
        try:
            man = json.loads(z.read('MANIFESTE_AUDIO.json').decode('utf-8'))
        except KeyError:
            sys.exit('ÉCHEC : MANIFESTE_AUDIO.json absent de l\'archive (archive incomplète ou étrangère)')
        racine = man.get('racine', 'Intro_3D').strip('/')
        for rel, meta in sorted(man['fichiers'].items()):
            rel = rel.replace('\\', '/')
            if rel.startswith('/') or '..' in rel.split('/') or not rel.startswith(PREFIXES_AUTORISES):
                print(f'  IGNORÉ (chemin refusé) : {rel}'); continue
            octets = z.read(f'{racine}/{rel}')
            if sha256(octets) != meta['sha256'] or len(octets) != meta['octets']:
                sys.exit(f'ÉCHEC : {rel} est corrompu dans l\'archive (SHA-256 ou taille différente du manifeste)')
            dest = os.path.normpath(os.path.join(cible, *rel.split('/')))
            if not dest.startswith(os.path.normpath(cible) + os.sep):
                print(f'  IGNORÉ (hors cible) : {rel}'); continue
            if os.path.isfile(dest):
                if sha256_fichier(dest) == meta['sha256']:
                    identiques += 1; continue
                if not a.forcer:
                    differents += 1; print(f'  DIFFÉRENT, laissé en place : {rel}  (relancer avec --forcer pour remplacer)'); continue
                if not a.verifier:
                    shutil.copy2(dest, dest + '.bak')
            if a.verifier:
                print(f'  manquant : {rel}'); poses += 1; continue
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            tmp = dest + '.part'
            with open(tmp, 'wb') as f:
                f.write(octets)
            os.replace(tmp, dest)
            poses += 1
            print(f'  posé : {rel}  ({len(octets) / 1e6:.2f} Mo)')
    return poses, identiques, differents


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--zip', action='append'); ap.add_argument('--cible')
    ap.add_argument('--verifier', action='store_true'); ap.add_argument('--forcer', action='store_true')
    a = ap.parse_args()

    cible = trouver_cible(a.cible)
    archives = trouver_zips(a.zip, cible)
    print(f'Cible   : {cible}')
    poses = identiques = differents = 0
    for archive in archives:
        print(f'Archive : {archive}')
        p, i, d = restaurer(archive, cible, a)
        poses += p; identiques += i; differents += d

    verbe = 'à poser' if a.verifier else 'posés'
    print(f'\n{poses} fichier(s) {verbe}, {identiques} déjà en place, {differents} différent(s) laissé(s) en place.')
    if a.verifier:
        print('Mode --verifier : rien n\'a été écrit.')
    elif not differents:
        print('Audio réel restauré. Étapes suivantes possibles :\n'
              '  - régénérer le mix V6       : cd Intro_3D/audio_v6 && python3 sound_v6.py   (ffmpeg, numpy, scipy, soundfile)\n'
              '  - contrôle headless         : node Intro_3D/outils/verifier_webgl.js\n'
              '  - capture vidéo avec le son : python3 Intro_3D/outils/capturer_animatic_v6.py --cloud --video --fps 30 --largeur 1280')
    return 2 if differents else 0


if __name__ == '__main__':
    sys.exit(main())
