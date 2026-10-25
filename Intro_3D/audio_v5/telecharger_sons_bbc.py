#!/usr/bin/env python3
"""Télécharge (une seule fois) les 30 enregistrements réels utilisés par sound_reel.py dans sons_reels/.

Source : BBC Sound Effects Library (https://sound-effects.bbcrewind.co.uk), WAV d'origine.
Licence : RemArc (© BBC) : usage personnel, éducatif ou de recherche. Une soirée familiale privée entre dans
l'usage personnel ; ne pas publier la vidéo en ligne ni l'utiliser commercialement avec ces sons.
Un fichier déjà présent et lisible n'est pas retéléchargé. Sortie non nulle si un son manque.
"""
import os, sys, urllib.request, wave

HERE = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.join(HERE, 'sons_reels')
URL = 'https://sound-effects-media.bbcrewind.co.uk/wav/{}.wav'
SONS = {
    '07075033': 'Foule animée à un match de catch (nappe et rugissements)',
    '07050215': 'Public enthousiaste qui applaudit et siffle',
    '07036134': 'Jouet mécanique, mini voiture de course',
    '07020021': 'Silverstone 1969, Formule 1, passages',
    '07020022': 'Silverstone 1969, Formule 1, passages',
    '07044058': 'Moto 2 temps qui monte dans les tours (relances « VTEC »)',
    '07010017': 'Roadster, démarrage, montée en régime, départ rapide avec crissement',
    '07022357': 'Voiture, arrivée et dérapage',
    '07045249': 'Voiture, freinage en dérapage',
    'NHU05078130': 'Sifflement d\'air (soupape de décharge)',
    '07010036': 'Six cylindres, démarrage, coups de gaz, ralenti (V8 gothique)',
    '07024141': 'Poids lourd diesel au ralenti',
    '07050095': 'Tout-terrain diesel, démarrage et départ',
    '07024142': 'Poids lourd diesel qui démarre',
    '07011171': 'Moteur ancien, retours de flamme',
    '07037386': 'Chaînes qui s\'entrechoquent',
    'NHU05039063': 'Vent de sable dans le désert',
    '07022366': 'Choc métallique',
    '07022351': 'Accident de voiture',
    '07005226': 'Coup de tonnerre',
    '07019114': 'Fusées de feu d\'artifice',
    '07043155': 'Fusée de feu d\'artifice',
    '07019112': 'Canon de feu d\'artifice',
    '07037327': 'Forte explosion',
    '07042056': 'Pièces de monnaie qui tombent',
    '07012094': 'Grelots de traîneau',
    '0010006': 'Neige de télévision',
    '07038337': 'Forte pluie',
    '07037498': 'Battements d\'ailes',
    '07035075': 'Grande foule qui acclame (réserve)',
}

def lisible(chemin):
    try:
        with wave.open(chemin) as w:
            return w.getnframes() > 0
    except Exception:
        return False

def main():
    os.makedirs(DOSSIER, exist_ok=True)
    manquants = []
    for i, (ident, desc) in enumerate(SONS.items(), 1):
        chemin = os.path.join(DOSSIER, ident + '.wav')
        if os.path.exists(chemin) and lisible(chemin):
            print(f'[{i:2d}/{len(SONS)}] déjà là   {ident}  {desc}'); continue
        try:
            req = urllib.request.Request(URL.format(ident), headers={'User-Agent': 'GP-Noel/1.0'})
            with urllib.request.urlopen(req, timeout=120) as r, open(chemin + '.part', 'wb') as f:
                while True:
                    bloc = r.read(1 << 20)
                    if not bloc: break
                    f.write(bloc)
            os.replace(chemin + '.part', chemin)
            if not lisible(chemin): raise IOError('WAV illisible')
            print(f'[{i:2d}/{len(SONS)}] téléchargé {ident}  {desc}')
        except Exception as e:
            manquants.append(ident); print(f'[{i:2d}/{len(SONS)}] ÉCHEC     {ident}  {desc} : {e}')
    if manquants:
        print('Sons manquants :', ', '.join(manquants)); sys.exit(1)
    print('Banque complète. Licence : BBC RemArc, usage personnel uniquement.')

if __name__ == '__main__':
    main()
