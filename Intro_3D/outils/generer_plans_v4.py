#!/usr/bin/env python3
"""Génère data/plans_intro_v4.json (le découpage de l'animatic) à partir de audio_v4/audio/rapport_v4.json.

Un plan = une tranche de temps film avec : décor, univers, ambiance du ring, caméra (début → fin), contenu de l'écran
géant et actions. Les temps viennent TOUS de la voix (repères mot à mot) : si la voix est remontée, on relance ce script
et le film suit. Caméras en cm : 'abs' = coordonnées monde (salon), 'ring' = relatives au centre du ring (au niveau du tapis).
Contrôles à la génération : pas de trou ni de chevauchement, durées > 0, identifiants uniques.
"""
import json, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
R = json.load(open(os.path.join(RACINE, 'audio_v4', 'audio', 'rapport_v4.json'), encoding='utf-8'))['reperes']
DUR = R['DUR']
E = R['ecuries']
plans = []

def plan(id_, debut, fin, titre, decor='arene', univers=None, theme='championnat', cam=None, ecran=None, actions=(), allume=1.0, **extra):
    plans.append({'id': id_, 'debut': round(debut, 3), 'fin': round(fin, 3), 'titre': titre, 'decor': decor, 'univers': univers,
                  'theme': theme, 'allume': allume, 'cam': cam, 'ecran': ecran or {'mode': 'titre'}, 'actions': list(actions), **extra})

def cam(rep, p0, c0, mm0, p1=None, c1=None, mm1=None, courbe='doux', roulis=0.0, suit=None):
    return {'rep': rep, 'p0': p0, 'p1': p1 or p0, 'c0': c0, 'c1': c1 or c0, 'mm0': mm0, 'mm1': mm1 or mm0, 'courbe': courbe, 'roulis': roulis, 'suit': suit}

# ---------------------------------------------------------------- ACTE 0 : le salon
plan('S1', 0.0, 1.2, 'La goutte d\'huile (A4 de Lulu)', 'salon', cam=cam('abs', [-88, 3.5, 128], [-108, 2.5, 108], 100, [-92, 3, 124], [-108, 0.5, 108], 100), actions=['goutte'], tv=0)
plan('S2', 1.2, 3.4, 'Ras du tapis : la meute endormie', 'salon', cam=cam('abs', [-80, 3.2, 104], [-22, 2.2, 70], 50, [-50, 3.2, 104], [-10, 2.2, 66], 50), actions=['meute_garee'], tv=0)
plan('S3', 3.4, 4.6, 'La télé s\'allume', 'salon', cam=cam('abs', [-34, 5, 92], [0, 95, -178], 28, [-30, 9, 80], [0, 100, -178], 32), actions=['meute_garee', 'tv_allume'])
plan('S4', 4.6, 7.6, 'Le salon (vue d\'ensemble)', 'salon', cam=cam('abs', [215, 175, 205], [-50, 45, -60], 16, [185, 160, 175], [-40, 40, -50], 18), actions=['meute_garee', 'lumiere_saute'])
plan('S5', 7.6, 9.06, 'Le salon se transforme', 'transfo', theme='tapis', cam=cam('abs', [0, 245, 30], [0, 0, 25], 14, [0, 95, 80], [0, 15, 25], 22, courbe='entree'), actions=['meute_garee', 'transformation'])
plan('S6', 9.06, R['arene'], 'Noir', 'noir', cam=cam('abs', [0, 95, 80], [0, 15, 25], 22))

# ---------------------------------------------------------------- ACTE 1 : l'arène
plan('A1', R['arene'], R['quinze'], 'ARÈNE ! (burnout, cordes, pyros)', theme='tapis', cam=cam('ring', [0, 4, 118], [0, 6, 0], 20, [0, 12, 175], [0, 8, 0], 24), actions=['meute_burnout', 'pyros'], ecran={'mode': 'titre'})
plan('A2', R['quinze'], R['dizaines'], '« Quinze écuries ! » : les 15 voitures-emblèmes', theme='championnat', cam=cam('ring', [-170, 7, 165], [-120, 5, 125], 35, [170, 7, 165], [220, 5, 125], 35, courbe='lin'), actions=['emblemes_rangee'], ecran={'mode': 'texte', 'ligne1': '15 ÉCURIES', 'couleur': '#ffe23d'})
plan('A3', R['dizaines'], R['cinq'], '« Des DIZAINES de bolides ! » : le parc fermé', cam=cam('ring', [-150, 8, -170], [-250, 4, -120], 40, [-150, 8, 170], [-250, 4, 220], 40, courbe='lin'), actions=['parc'], ecran={'mode': 'texte', 'ligne1': 'DES DIZAINES', 'ligne2': 'DE BOLIDES', 'couleur': '#ff8a2a'})
plan('A4', R['cinq'], R['une'] - 0.12, '« Cinq voies… » : passages au ras de la caméra', cam=cam('ring', [32, 1.6, 0], [-10, 5, 0], 18, [30, 2.2, 6], [-10, 6, 6], 18), actions=['voies', 'meute_passe'], ecran={'mode': 'texte', 'ligne1': '5 VOIES', 'couleur': '#35e07a'})
plan('A5', R['une'] - 0.12, R['trone'], '« …une seule place… » : arrêt sur image', allume=0.25, cam=cam('ring', [70, 18, 95], [0, 10, 0], 35, [50, 14, 75], [0, 12, 0], 40), actions=['voies', 'meute_figee', 'podium'], ecran={'mode': 'texte', 'ligne1': 'UNE SEULE PLACE', 'couleur': '#ffffff'})
plan('A6', R['trone'], R['coin_rouge'] - 0.9, '« …sur le TRÔNE ! » : la couronne', cam=cam('ring', [0, 3, 48], [0, 22, 0], 24, [0, 5, 40], [0, 26, 0], 24), actions=['podium', 'trone', 'couronne'], ecran={'mode': 'texte', 'ligne1': 'LE TRÔNE', 'couleur': '#ffc83d'})

# ---------------------------------------------------------------- ACTE 2 : l'appel des 15 écuries
plan('R0', R['coin_rouge'] - 0.9, E[0] - 0.05, '« Dans le coin rouge… le groupe A ! »', cam=cam('ring', [0, 170, 340], [0, 10, -40], 24, [0, 120, 260], [0, 8, -20], 26), actions=['cloche', 'emblemes_place'], ecran={'mode': 'groupe', 'lettre': 'A', 'index': 0})
ANGLES = [  # 5 gabarits de caméra autour de la voiture-emblème (repère 'voiture' : x = côté, y = haut, z = devant)
    ('ras du sol', [0, 1.5, 22], [0, 3, 0], 24, [6, 1.5, 16], [0, 3, 0], 24),
    ('travelling latéral', [-26, 5, -10], [0, 3, 0], 50, [-26, 5, 14], [0, 3, 6], 50),
    ('contre-plongée', [10, 1.2, 12], [0, 6, 0], 18, [12, 1.2, 8], [0, 8, -2], 18),
    ('passage au ras de l\'objectif', [4, 3, 30], [0, 3, 0], 28, [3, 3, 7], [0, 3, -6], 28),
    ('plongée', [0, 40, 18], [0, 0, 0], 35, [0, 26, 10], [0, 0, 2], 35),
]
GROUPES = {5: ('B', 1, R['groupe_B']), 10: ('C', 2, R['groupe_C'])}
for i in range(15):
    debut = E[i] - 0.05
    if i in GROUPES:                                                                # coupe sur le portique du groupe, juste avant son premier nom
        lettre, idx, tg = GROUPES[i]
        plan(f'R{lettre}', tg - 0.08, debut, f'« Le groupe {lettre} ! »', cam=cam('ring', [0, 90, 240], [0, 20, -60], 28, [0, 70, 200], [0, 20, -60], 30), actions=['emblemes_place'], ecran={'mode': 'groupe', 'lettre': lettre, 'index': idx})
    fin = (GROUPES[i + 1][2] - 0.08) if (i + 1) in GROUPES else (E[i + 1] - 0.05 if i + 1 < 15 else E[14] + 1.35)
    nom, p0, c0, mm0, p1, c1, mm1 = ANGLES[i % 5]
    plan(f'R{i + 1:02d}', debut, fin, f'Écurie {i + 1} — {nom}', cam=cam('voiture', p0, c0, mm0, p1, c1, mm1, suit=i), actions=['emblemes_place', f'emblème_entre:{i}'], ecran={'mode': 'ecurie', 'index': i}, ecurie=i)
plan('R16', E[14] + 1.35, R['attention'] - 0.03, 'Les 15 emblèmes : plan large, feux d\'artifice', cam=cam('ring', [0, 30, 300], [0, 10, 0], 20, [0, 150, 330], [0, 0, 20], 20), actions=['emblemes_place', 'pyros'], ecran={'mode': 'titre'})

# ---------------------------------------------------------------- ACTE 3 : les univers
plan('U0', R['attention'] - 0.03, 51.2, '« Mais attention… ils ne viennent pas seuls ! »', theme='sauvage', allume=0.2, cam=cam('ring', [0, 30, 230], [0, 8, 0], 35, [0, 20, 150], [0, 8, 0], 40), ecran={'mode': 'texte', 'ligne1': '?', 'taille': 300, 'couleur': '#ff2d55'})
plan('G1', 51.2, R['nuit'], 'GOTHAM : la Batmobile sort du brouillard', univers='gotham', theme='sauvage', allume=0.35, cam=cam('ring', [0, 2.5, 70], [0, 4, 0], 35, [0, 2.5, 52], [0, 4, -10], 35), actions=['gotham', 'batmobile'], ecran={'mode': 'texte', 'ligne1': 'GOTHAM', 'couleur': '#c9d6ff'})
plan('G2', R['nuit'], R['rit'], '« …la NUIT. » : éclair, chauves-souris', univers='gotham', theme='sauvage', allume=0.35, cam=cam('ring', [-40, 5, 30], [0, 4, 10], 50, [-40, 5, -10], [0, 4, -20], 50), actions=['gotham', 'batmobile', 'eclair', 'chauves_souris'], ecran={'mode': 'texte', 'ligne1': 'GOTHAM', 'couleur': '#c9d6ff'})
plan('G3', R['rit'], 60.0, '« …quelqu\'un rit. » : une ombre, rien de plus', univers='gotham', theme='sauvage', allume=0.15, cam=cam('ring', [0, 20, 140], [0, 10, 0], 28, [0, 18, 120], [0, 10, 0], 30), actions=['gotham', 'ombre_rire'], ecran={'mode': 'texte', 'ligne1': 'HA HA HA', 'couleur': '#8f4dff', 'cle': 'rire'})
BOX = R['box']
plan('F1', 60.0, BOX[0] - 0.05, 'FORMULE 1 : la voie des stands', univers='f1', cam=cam('ring', [70, 10, -30], [0, 3, -72], 30, [58, 8, -38], [0, 3, -66], 32), actions=['f1_stands'], ecran={'mode': 'texte', 'ligne1': 'FORMULE 1', 'couleur': '#ff2d2d'})
for k in range(4):
    fin = BOX[k + 1] - 0.05 if k < 3 else R['attaque'] - 0.05
    plan(f'F1b{k + 1}', BOX[k] - 0.05, fin, f'« Box, box » ({k + 1}/4) : caméra embarquée', univers='f1', cam=cam('voiture', [0, 3.2, -2.5], [0, 2.8, 30], 16, [0.3, 3.2, -2.3], [0, 2.8, 30], 16, suit=100 + k), actions=['f1_stands', 'radio'], ecran={'mode': 'texte', 'ligne1': 'BOX · BOX', 'couleur': '#ffffff', 'cle': f'box{k}'})
plan('F2', R['attaque'] - 0.05, 66.0, '« Pneus tendres, on ATTAQUE ! »', univers='f1', cam=cam('ring', [-14, 2, -70], [-14, 3, 40], 20, [-14, 2.5, -60], [-14, 3, 60], 22), actions=['f1_depart'], ecran={'mode': 'texte', 'ligne1': 'ATTAQUE !', 'couleur': '#ff2d2d'})
plan('AP1', 66.0, R['temoins'], 'APOCALYPSE : terres brûlées, épaves', univers='apoca', theme='sauvage', cam=cam('ring', [-30, 6, 100], [0, 4, 0], 28, [-14, 4, 60], [0, 4, -20], 28), actions=['apoca', 'epave_roule'], ecran={'mode': 'texte', 'ligne1': 'APOCALYPSE', 'couleur': '#ff8a2a'})
plan('AP2', R['temoins'], 71.4, '« Soyez TÉMOINS ! » : saut, explosion, le luminaire tombe', univers='apoca', theme='sauvage', cam=cam('ring', [70, 6, 0], [0, 8, 0], 24, [80, 10, 10], [0, 10, 0], 22), actions=['apoca', 'epave_saut', 'explosion', 'luminaire_casse'], ecran={'mode': 'texte', 'ligne1': 'TÉMOINS !', 'couleur': '#ff8a2a'})

# ---------------------------------------------------------------- ACTE 4 : les caisses
plan('C1', 71.4, R['uniques'], '« Ouvrez les caisses… découvrez vos bolides… »', univers='caisses', cam=cam('ring', [60, 45, 110], [0, 5, 0], 28, [-60, 40, 110], [0, 5, 0], 28), actions=['caisses', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': 'OUVREZ', 'ligne2': 'LES CAISSES', 'couleur': '#ffc83d'})
plan('C2', R['uniques'], R['chante'] - 0.1, '« …les modèles UNIQUES ! » : faisceaux de rareté', univers='caisses', cam=cam('ring', [0, 6, 90], [0, 30, 0], 20, [0, 4, 70], [0, 40, 0], 18), actions=['caisses', 'faisceaux', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': 'MODÈLES', 'ligne2': 'UNIQUES', 'couleur': '#ffc83d'})
plan('C3', R['chante'] - 0.1, 78.6, '« …chante dans le noir… » : silhouette dans l\'ombre', univers='caisses', allume=0.04, cam=cam('ring', [0, 9.5, 24], [0, 4, -3], 40, [0, 9, 18], [0, 4, -3], 45), actions=['caisses', 'silhouette', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': '…', 'couleur': '#2a3a3a', 'cle': 'noir'})

# ---------------------------------------------------------------- ACTE 5 : pièges, paris, gloire
plan('P1', 78.6, R['trahisons'] - 0.05, '« Des PIÈGES ! » : la peau de banane', univers='pieges', cam=cam('ring', [30, 5, 20], [0, 2, -10], 35, [26, 5, 0], [0, 2, -20], 35), actions=['banane'], ecran={'mode': 'texte', 'ligne1': 'PIÈGES !', 'couleur': '#ffe23d'})
plan('P2', R['trahisons'] - 0.05, R['paris'] - 0.05, '« Des TRAHISONS ! » : la carapace', univers='pieges', cam=cam('ring', [-30, 8, 30], [0, 3, 0], 30, [-26, 6, 20], [0, 3, -5], 30), actions=['carapace'], ecran={'mode': 'texte', 'ligne1': 'TRAHISONS !', 'couleur': '#3f8cff'})
plan('P3', R['paris'] - 0.05, 84.0, '« …paris en direct… ou à l\'ancienne ! »', univers='paris', cam=cam('ring', [0, 30, 200], [0, 60, -40], 24, [0, 40, 170], [0, 70, -40], 26), actions=['telephone', 'pieces', 'carnet'], ecran={'mode': 'texte', 'ligne1': 'PARIS', 'ligne2': 'EN DIRECT', 'couleur': '#35e07a'})
plan('GL', 84.0, R['le'] - 0.1, '« …la gloire ÉTERNELLE ! » : la Coupe arc-en-ciel', univers='gloire', allume=0.6, cam=cam('ring', [40, 4, 40], [0, 18, 0], 24, [-40, 4, 40], [0, 22, 0], 24), actions=['coupe', 'rayons'], ecran={'mode': 'texte', 'ligne1': 'LA GLOIRE', 'ligne2': 'ÉTERNELLE', 'couleur': '#ffc83d'})

# ---------------------------------------------------------------- ACTE 6 : titre et final
plan('T1', R['le'] - 0.1, R['decembre'] - 0.08, '« Le GRAND PRIX… DE NOËL ! » : les mots slamment', univers='titre', cam=cam('ring', [0, 3, 120], [0, 30, 0], 20, [0, 5, 150], [0, 30, 0], 22), actions=['mots_titre', 'meute_grille'], ecran={'mode': 'titre'})
plan('T2', R['decembre'] - 0.08, R['preparez'] - 0.1, '« 23 décembre ! » : les 15 emblèmes derrière la meute', univers='titre', cam=cam('ring', [0, 60, 260], [0, 10, 0], 22, [0, 45, 230], [0, 10, 0], 24), actions=['meute_grille', 'emblemes_grille'], ecran={'mode': 'texte', 'ligne1': '23 DÉCEMBRE', 'couleur': '#ffc83d'})
plan('T3', R['preparez'] - 0.1, R['commence'] - 0.02, '« Préparez-vous… à VROMBIR ! » : les 5 feux', univers='final', cam=cam('ring', [0, 7, 112], [0, 30, -200], 28, [0, 5, 98], [0, 30, -200], 30), actions=['meute_grille', 'emblemes_grille', 'feux'], ecran={'mode': 'feux'})
plan('T4', R['commence'] - 0.02, R['commence'] + 1.6, '« Que le spectacle… COMMENCE ! » : départ', univers='final', cam=cam('ring', [0, 3, -95], [0, 4, 0], 20, [0, 4, -120], [0, 4, 0], 18), actions=['meute_depart', 'emblemes_grille', 'pyros'], ecran={'mode': 'titre'})
plan('SF', R['commence'] + 1.6, DUR, 'Retour au salon : la télé affiche le logo', 'salon', cam=cam('abs', [0, 108, 195], [0, 100, -178], 22, [0, 104, 60], [0, 100, -178], 26), actions=['meute_garee', 'tv_logo', 'fondu_fin'])

# ---------------------------------------------------------------- contrôles
plans.sort(key=lambda p: p['debut'])
ids = [p['id'] for p in plans]
assert len(ids) == len(set(ids)), 'identifiants en double'
assert abs(plans[0]['debut']) < 1e-6 and abs(plans[-1]['fin'] - DUR) < 1e-6, 'le découpage doit couvrir 0 → DUR'
for a, b in zip(plans, plans[1:]):
    assert abs(a['fin'] - b['debut']) < 1e-6, f"trou ou chevauchement entre {a['id']} ({a['fin']}) et {b['id']} ({b['debut']})"
for p in plans:
    assert p['fin'] - p['debut'] > 0.05, f"plan trop court : {p['id']} ({p['fin'] - p['debut']:.3f} s)"

# impacts caméra (secousse + coup de FOV + flash) : [temps, force 0..1]
HITS = [[R['arene'], 1.0], [R['quinze'], 0.45], [R['dizaines'], 0.45], [R['cinq'], 0.5], [R['trone'], 0.7],
        [R['groupe_A'], 0.6], [R['groupe_B'], 0.6], [R['groupe_C'], 0.6]] + [[t, 0.22] for t in E] + \
       [[E[14] + 1.35, 0.8], [R['nuit'], 0.7], [R['attaque'], 0.6], [R['temoins'], 1.0], [R['uniques'], 0.5], [R['pieges'], 0.55],
        [R['trahisons'], 0.6], [R['eternelle'], 0.6], [R['grand'], 0.9], [R['prix'], 0.7], [R['de'], 0.5], [R['noel'], 1.0],
        [R['vingttrois'], 0.4], [R['decembre'], 0.4], [R['commence'], 1.0]]
sortie = {'_doc': 'Découpage de l\'animatic de l\'intro v4 — généré par outils/generer_plans_v4.py depuis audio_v4/audio/rapport_v4.json. Ne pas éditer à la main : modifier le script.',
          'duree': DUR, 'fps': 60, 'reperes': R, 'hits': HITS, 'plans': plans}
os.makedirs(os.path.join(RACINE, 'data'), exist_ok=True)
json.dump(sortie, open(os.path.join(RACINE, 'data', 'plans_intro_v4.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(plans)} plans, 0 → {DUR} s, {len(HITS)} impacts')
