#!/usr/bin/env python3
"""Génère data/plans_intro_v5.json (le découpage de l'animatic v5) à partir de audio_v5/audio/rapport_v5.json.

Ce qui change par rapport à la v4 (retours d'Esteban) :
  - ACTE 0 : le salon est SOMBRE et ne se dévoile pas : lune, braises, télé ; plans serrés, au ras des miniatures
    ('lum' = intensité des lumières du salon, 'lum1' = valeur en fin de plan) ;
  - ARÈNE : cadrages resserrés (on est DANS le ring, plus en tribune), caméra portée ('epaule'), le tour de l'arène est
    rempli par l'habillage (foule, bannières, LED, lyres, flammes, fumées, confettis) ;
  - APPEL DES ÉCURIES : chaque écurie a DEUX plans : son entrée (le nom) puis sa SIGNATURE (le thème sonore) filmée en
    orbite autour de sa place, avec fumée et confettis à ses couleurs ; une signature longue (> 4,5 s, la voix de
    Petite Mimine) est coupée en deux : orbite puis gros plan ;
  - tout ce qui suit l'appel est décalé de 'decalage' (allongement de l'appel, calculé par sound_v5.py).

Contrôles à la génération : pas de trou ni de chevauchement, durées > 0, identifiants uniques, chaque signature couverte.
"""
import json, os

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
RAPPORT = json.load(open(os.path.join(RACINE, 'audio_v5', 'audio', 'rapport_v5.json'), encoding='utf-8'))
R = RAPPORT['reperes']
DEC = RAPPORT['decalage_apres_appel_s']
S = lambda x: round(x + DEC, 3)                    # instant v4 (après l'appel) → instant v5
DUR = R['DUR']
E = R['ecuries']
TH = R['themes']                                   # [[début, fin]] de la signature sonore de chaque écurie
assert len(E) == 15 and len(TH) == 15
plans = []

def plan(id_, debut, fin, titre, decor='arene', univers=None, theme='championnat', cam=None, ecran=None, actions=(), allume=1.0, **extra):
    plans.append({'id': id_, 'debut': round(debut, 3), 'fin': round(fin, 3), 'titre': titre, 'decor': decor, 'univers': univers,
                  'theme': theme, 'allume': allume, 'cam': cam, 'ecran': ecran or {'mode': 'titre'}, 'actions': list(actions), **extra})

def cam(rep, p0, c0, mm0, p1=None, c1=None, mm1=None, courbe='doux', roulis=0.0, suit=None, orbite=None):
    d = {'rep': rep, 'p0': p0, 'p1': p1 or p0, 'c0': c0, 'c1': c1 or c0, 'mm0': mm0, 'mm1': mm1 or mm0, 'courbe': courbe, 'roulis': roulis, 'suit': suit}
    if orbite: d['orbite'] = orbite
    return d

# ---------------------------------------------------------------- ACTE 0 : le salon, dans le noir (teasing)
plan('S1', 0.0, 1.2, 'Noir. Une goutte d\'huile tombe (A4 de Lulu)', 'salon', cam=cam('abs', [-92, 2.6, 124], [-108, 2.0, 108], 100, [-95, 2.2, 121], [-108, 0.6, 108], 120), actions=['goutte'], tv=0, lum=0.12, lune=1.2, epaule=0.2, expo=2.6)
plan('S2', 1.2, 3.4, 'Au ras du tapis : des silhouettes de voitures au clair de lune', 'salon', cam=cam('abs', [-74, 2.4, 92], [-22, 2.4, 66], 45, [-50, 2.6, 84], [-14, 2.2, 64], 50), actions=['meute_garee'], tv=0, lum=0.14, lune=1.3, epaule=0.25, expo=3.2)
plan('S3', 3.4, 4.6, 'La télé s\'allume : un reflet bleu sur les carrosseries', 'salon', cam=cam('abs', [-30, 3.0, 84], [-10, 4.5, 50], 40, [-28, 4.0, 76], [-10, 6, 40], 45), actions=['meute_garee', 'tv_allume'], lum=0.16, lune=1.0, epaule=0.25, expo=2.8)
plan('S4', 4.6, 7.6, 'Les lumières sautent : on devine le salon par éclats', 'salon', cam=cam('abs', [40, 14, 120], [-20, 6, 60], 28, [10, 10, 100], [-22, 4, 62], 32), actions=['meute_garee', 'lumiere_saute'], lum=0.25, lum1=0.42, lune=0.9, epaule=0.35, expo=2.3)
plan('S5', 7.6, 9.06, 'Le salon s\'enfonce : le tapis devient le ring', 'transfo', theme='tapis', cam=cam('abs', [0, 150, 70], [0, 0, 25], 18, [0, 70, 75], [0, 15, 25], 24, courbe='entree'), actions=['meute_garee', 'transformation'], lum=0.42, lune=0.8, epaule=0.3)
plan('S6', 9.06, R['arene'], 'Noir', 'noir', cam=cam('abs', [0, 70, 75], [0, 15, 25], 24))

# ---------------------------------------------------------------- ACTE 1 : l'arène (plans serrés, caméra portée)
plan('A1', R['arene'], R['quinze'], 'ARÈNE ! burnout dans la fumée, flammes, pyros', theme='tapis', cam=cam('ring', [6, 3, 70], [0, 5, 0], 18, [4, 9, 100], [0, 8, 0], 22), actions=['meute_burnout', 'pyros'], ecran={'mode': 'titre'}, epaule=1.0)
plan('A2', R['quinze'], R['dizaines'], '« Quinze écuries ! » : travelling au ras des 15 emblèmes', cam=cam('ring', [-150, 5, 142], [-110, 4, 125], 32, [150, 5, 142], [190, 4, 125], 32, courbe='cine'), actions=['emblemes_rangee'], ecran={'mode': 'texte', 'ligne1': '15 ÉCURIES', 'couleur': '#ffe23d'})
plan('A3', R['dizaines'], R['cinq'], '« Des DIZAINES de bolides ! » : le parc fermé', cam=cam('ring', [-165, 6, -150], [-250, 3, -110], 35, [-165, 6, 150], [-250, 3, 190], 35, courbe='cine'), actions=['parc'], ecran={'mode': 'texte', 'ligne1': 'DES DIZAINES', 'ligne2': 'DE BOLIDES', 'couleur': '#ff8a2a'})
plan('A4', R['cinq'], R['une'] - 0.12, '« Cinq voies… » : passages au ras de la caméra', cam=cam('ring', [30, 1.4, 0], [-10, 4, 0], 16, [28, 2.0, 6], [-10, 5, 6], 16), actions=['voies', 'meute_passe'], ecran={'mode': 'texte', 'ligne1': '5 VOIES', 'couleur': '#35e07a'})
plan('A5', R['une'] - 0.12, R['trone'], '« …une seule place… » : arrêt sur image', allume=0.25, cam=cam('ring', [42, 10, 55], [0, 10, 0], 32, [32, 9, 45], [0, 12, 0], 38), actions=['voies', 'meute_figee', 'podium'], ecran={'mode': 'texte', 'ligne1': 'UNE SEULE PLACE', 'couleur': '#ffffff'}, epaule=0.4)
plan('A6', R['trone'], R['coin_rouge'] - 0.9, '« …sur le TRÔNE ! » : la couronne, pluie de confettis', cam=cam('ring', [0, 3, 40], [0, 22, 0], 22, [0, 5, 34], [0, 27, 0], 22), actions=['podium', 'trone', 'couronne'], ecran={'mode': 'texte', 'ligne1': 'LE TRÔNE', 'couleur': '#ffc83d'})

# ---------------------------------------------------------------- ACTE 2 : l'appel des 15 écuries (entrée + signature)
plan('R0', R['coin_rouge'] - 0.9, E[0] - 0.05, '« Dans le coin rouge… le groupe A ! »', cam=cam('ring', [-40, 16, 95], [-128, 8, 0], 22, [-70, 10, 70], [-128, 6, -10], 24), actions=['cloche', 'emblemes_place'], ecran={'mode': 'groupe', 'lettre': 'A', 'index': 0}, epaule=0.9)
ANGLES = [  # 5 gabarits de caméra autour de la voiture-emblème qui entre (repère 'voiture' : x = côté, y = haut, z = devant)
    ('ras du sol', [0, 1.5, 20], [0, 3, 0], 24, [6, 1.5, 14], [0, 3, 0], 24),
    ('travelling latéral', [-22, 4, -10], [0, 3, 0], 45, [-22, 4, 12], [0, 3, 6], 45),
    ('contre-plongée', [9, 1.2, 11], [0, 6, 0], 18, [11, 1.2, 7], [0, 8, -2], 18),
    ('passage au ras de l\'objectif', [4, 3, 28], [0, 3, 0], 28, [3, 3, 7], [0, 3, -6], 28),
    ('plongée', [0, 30, 16], [0, 0, 0], 32, [0, 20, 9], [0, 0, 2], 32),
]
# caméras d'invocation sur mesure (l'effet se joue au-dessus de la voiture : on lève les yeux / on recule)
CAM_INVOC = {
    4: lambda i, o0, o1: cam('place', [12, 8, 75], [0, 30, 0], 20, [9, 4, 42], [0, 5, 0], 22, orbite=[o0 * 0.4, o1 * 0.4], suit=i, courbe='cine'),   # Mario : le bond et le crash
    6: lambda i, o0, o1: cam('place', [0, 1.5, 22], [0, 14, 0], 18, [0, 1.5, 18], [0, 22, 0], 16, orbite=[o0, o1], suit=i, courbe='cine'),          # rayon divin + Triforce
    8: lambda i, o0, o1: cam('place', [14, 4, 40], [-10, 30, -10], 18, [10, 3, 30], [0, 4, 0], 20, orbite=[o0 * 0.5, o1 * 0.5], suit=i, courbe='cine'),  # comète puis impact
    9: lambda i, o0, o1: cam('place', [0, 1.8, 24], [0, 26, -20], 16, [0, 1.6, 20], [0, 18, -10], 16, orbite=[o0 * 0.5, o1 * 0.5], suit=i, courbe='cine'),  # l'éclipse derrière la voiture
    10: lambda i, o0, o1: cam('place', [0, 2, 26], [0, 16, 0], 18, [0, 2, 20], [0, 10, 0], 18, orbite=[o0, o1], suit=i, courbe='cine'),          # étoiles filantes
    13: lambda i, o0, o1: cam('place', [0, 12, 40], [0, 2, 0], 20, [0, 9, 30], [0, 3, 0], 20, orbite=[o0, o1], suit=i, courbe='cine'),          # éclaboussure à 360°
}
ORBITES = [(-0.9, 0.9), (0.8, -0.8), (-0.4, 1.4), (1.2, -0.3), (-1.3, 0.2)]          # balayage angulaire (rad) autour de la place
GROUPES = {5: ('B', 1, R['groupe_B']), 10: ('C', 2, R['groupe_C'])}
for i in range(15):
    debut = E[i] - 0.05
    if i in GROUPES:                                                                # coupe sur le groupe, juste avant son premier nom
        lettre, idx, tg = GROUPES[i]
        cote = [0, 0, 1][idx]
        cible = [[-128, 8, 0], [0, 8, 128], [128, 8, 0]][idx]
        plan(f'R{lettre}', tg - 0.08, debut, f'« Le groupe {lettre} ! »', cam=cam('ring', [0, 30, 60], cible, 22, [0, 22, 40], cible, 24), actions=['emblemes_place'], ecran={'mode': 'groupe', 'lettre': lettre, 'index': idx}, epaule=0.9)
    s0, s1 = TH[i]
    nom, p0, c0, mm0, p1, c1, mm1 = ANGLES[i % 5]
    plan(f'R{i + 1:02d}', debut, s0, f'Écurie {i + 1} — entrée ({nom})', cam=cam('voiture', p0, c0, mm0, p1, c1, mm1, suit=i), actions=['emblemes_place', f'emblème_entre:{i}'], ecran={'mode': 'ecurie', 'index': i}, ecurie=i)
    fin = (GROUPES[i + 1][2] - 0.08) if (i + 1) in GROUPES else (E[i + 1] - 0.05 if i + 1 < 15 else s1)
    o0, o1 = ORBITES[i % 5]
    orbite = cam('place', [0, 6, 20], [0, 3, 0], 24, [0, 4, 14], [0, 3.5, 0], 28, orbite=[o0, o1], suit=i, courbe='cine')
    if i in CAM_INVOC: orbite = CAM_INVOC[i](i, o0, o1)
    if fin - s0 > 4.5:                                                              # signature longue : orbite puis gros plan sur la calandre
        mi = round(s0 + (fin - s0) * 0.5, 3)
        plan(f'R{i + 1:02d}s', s0, mi, f'Écurie {i + 1} — SIGNATURE (orbite, fumée et confettis à ses couleurs)', cam=orbite, actions=['emblemes_place', 'signature'], ecran={'mode': 'ecurie', 'index': i}, ecurie=i, epaule=0.8)
        plan(f'R{i + 1:02d}g', mi, fin, f'Écurie {i + 1} — SIGNATURE (gros plan, la voix s\'éteint)', cam=cam('place', [7, 4, 17], [0, 3, 0], 40, [4.5, 3.5, 13], [0, 3, 0], 45, suit=i), actions=['emblemes_place', 'signature'], ecran={'mode': 'ecurie', 'index': i}, ecurie=i, epaule=0.5)
    else:
        plan(f'R{i + 1:02d}s', s0, fin, f'Écurie {i + 1} — SIGNATURE (orbite, fumée et confettis à ses couleurs)', cam=orbite, actions=['emblemes_place', 'signature'], ecran={'mode': 'ecurie', 'index': i}, ecurie=i, epaule=0.8)
plan('R16', TH[14][1], R['attention'] - 0.03, 'Les 15 emblèmes : grue au-dessus du ring, déluge de confettis', cam=cam('ring', [0, 10, 150], [0, 10, 0], 20, [0, 55, 200], [0, 0, 10], 20), actions=['emblemes_place', 'pyros'], ecran={'mode': 'titre'}, epaule=0.6)

# ---------------------------------------------------------------- ACTE 3 : les univers (temps v4 décalés)
plan('U0', R['attention'] - 0.03, S(51.2), '« Mais attention… ils ne viennent pas seuls ! »', theme='sauvage', allume=0.2, cam=cam('ring', [0, 14, 120], [0, 8, 0], 32, [0, 10, 80], [0, 8, 0], 40), ecran={'mode': 'texte', 'ligne1': '?', 'taille': 300, 'couleur': '#ff2d55'})
plan('G1', S(51.2), R['nuit'], 'GOTHAM : la Batmobile sort du brouillard', univers='gotham', theme='sauvage', allume=0.35, cam=cam('ring', [0, 2.5, 66], [0, 4, 0], 35, [0, 2.5, 48], [0, 4, -10], 35), actions=['gotham', 'batmobile'], ecran={'mode': 'texte', 'ligne1': 'GOTHAM', 'couleur': '#c9d6ff'})
plan('G2', R['nuit'], R['rit'], '« …la NUIT. » : éclair, chauves-souris', univers='gotham', theme='sauvage', allume=0.35, cam=cam('ring', [-34, 5, 26], [0, 4, 10], 45, [-34, 5, -10], [0, 4, -20], 45), actions=['gotham', 'batmobile', 'eclair', 'chauves_souris'], ecran={'mode': 'texte', 'ligne1': 'GOTHAM', 'couleur': '#c9d6ff'})
plan('G3', R['rit'], S(60.0), '« …quelqu\'un rit. » : une ombre, rien de plus', univers='gotham', theme='sauvage', allume=0.15, cam=cam('ring', [0, 16, 100], [0, 10, 0], 28, [0, 14, 84], [0, 10, 0], 30), actions=['gotham', 'ombre_rire'], ecran={'mode': 'texte', 'ligne1': 'HA HA HA', 'couleur': '#8f4dff', 'cle': 'rire'})
BOX = R['box']
plan('F1', S(60.0), BOX[0] - 0.05, 'FORMULE 1 : la voie des stands', univers='f1', cam=cam('ring', [55, 8, -36], [0, 3, -72], 30, [46, 6, -42], [0, 3, -66], 32), actions=['f1_stands'], ecran={'mode': 'texte', 'ligne1': 'FORMULE 1', 'couleur': '#ff2d2d'})
for k in range(4):
    fin = BOX[k + 1] - 0.05 if k < 3 else R['attaque'] - 0.05
    plan(f'F1b{k + 1}', BOX[k] - 0.05, fin, f'« Box, box » ({k + 1}/4) : caméra embarquée', univers='f1', cam=cam('voiture', [0, 3.2, -2.5], [0, 2.8, 30], 16, [0.3, 3.2, -2.3], [0, 2.8, 30], 16, suit=100 + k), actions=['f1_stands', 'radio'], ecran={'mode': 'texte', 'ligne1': 'BOX · BOX', 'couleur': '#ffffff', 'cle': f'box{k}'}, epaule=0.3)
plan('F2', R['attaque'] - 0.05, S(66.0), '« Pneus tendres, on ATTAQUE ! »', univers='f1', cam=cam('ring', [-14, 2, -70], [-14, 3, 40], 20, [-14, 2.5, -60], [-14, 3, 60], 22), actions=['f1_depart'], ecran={'mode': 'texte', 'ligne1': 'ATTAQUE !', 'couleur': '#ff2d2d'})
plan('AP1', S(66.0), R['temoins'], 'APOCALYPSE : terres brûlées, épaves', univers='apoca', theme='sauvage', cam=cam('ring', [-26, 5, 84], [0, 4, 0], 28, [-12, 4, 52], [0, 4, -20], 28), actions=['apoca', 'epave_roule'], ecran={'mode': 'texte', 'ligne1': 'APOCALYPSE', 'couleur': '#ff8a2a'})
plan('AP2', R['temoins'], S(71.4), '« Soyez TÉMOINS ! » : saut, explosion, le luminaire tombe', univers='apoca', theme='sauvage', cam=cam('ring', [60, 5, 0], [0, 8, 0], 22, [70, 9, 10], [0, 10, 0], 20), actions=['apoca', 'epave_saut', 'explosion', 'luminaire_casse'], ecran={'mode': 'texte', 'ligne1': 'TÉMOINS !', 'couleur': '#ff8a2a'}, epaule=1.0)

# ---------------------------------------------------------------- ACTE 4 : les caisses
plan('C1', S(71.4), R['uniques'], '« Ouvrez les caisses… découvrez vos bolides… »', univers='caisses', cam=cam('ring', [45, 32, 85], [0, 5, 0], 28, [-45, 28, 85], [0, 5, 0], 28), actions=['caisses', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': 'OUVREZ', 'ligne2': 'LES CAISSES', 'couleur': '#ffc83d'})
plan('C2', R['uniques'], R['chante'] - 0.1, '« …les modèles UNIQUES ! » : faisceaux de rareté', univers='caisses', cam=cam('ring', [0, 6, 80], [0, 30, 0], 20, [0, 4, 62], [0, 40, 0], 18), actions=['caisses', 'faisceaux', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': 'MODÈLES', 'ligne2': 'UNIQUES', 'couleur': '#ffc83d'})
plan('C3', R['chante'] - 0.1, S(78.6), '« …chante dans le noir… » : silhouette dans l\'ombre', univers='caisses', allume=0.04, cam=cam('ring', [0, 9.5, 24], [0, 4, -3], 40, [0, 9, 18], [0, 4, -3], 45), actions=['caisses', 'silhouette', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': '…', 'couleur': '#2a3a3a', 'cle': 'noir'}, epaule=0.3)

# ---------------------------------------------------------------- ACTE 5 : pièges, paris, gloire
plan('P1', S(78.6), R['trahisons'] - 0.05, '« Des PIÈGES ! » : la peau de banane', univers='pieges', cam=cam('ring', [26, 4, 16], [0, 2, -10], 35, [22, 4, -2], [0, 2, -20], 35), actions=['banane'], ecran={'mode': 'texte', 'ligne1': 'PIÈGES !', 'couleur': '#ffe23d'})
plan('P2', R['trahisons'] - 0.05, R['paris'] - 0.05, '« Des TRAHISONS ! » : la carapace', univers='pieges', cam=cam('ring', [-26, 7, 26], [0, 3, 0], 30, [-22, 5, 16], [0, 3, -5], 30), actions=['carapace'], ecran={'mode': 'texte', 'ligne1': 'TRAHISONS !', 'couleur': '#3f8cff'})
plan('P3', R['paris'] - 0.05, S(84.0), '« …paris en direct… ou à l\'ancienne ! »', univers='paris', cam=cam('ring', [0, 30, 150], [0, 60, -60], 24, [0, 40, 125], [0, 70, -60], 26), actions=['telephone', 'pieces', 'carnet'], ecran={'mode': 'texte', 'ligne1': 'PARIS', 'ligne2': 'EN DIRECT', 'couleur': '#35e07a'})
plan('GL', S(84.0), R['le'] - 0.1, '« …la gloire ÉTERNELLE ! » : la Coupe arc-en-ciel', univers='gloire', allume=0.6, cam=cam('ring', [34, 4, 34], [0, 18, 0], 24, [-34, 4, 34], [0, 22, 0], 24), actions=['coupe', 'rayons'], ecran={'mode': 'texte', 'ligne1': 'LA GLOIRE', 'ligne2': 'ÉTERNELLE', 'couleur': '#ffc83d'})

# ---------------------------------------------------------------- ACTE 6 : titre et final
plan('T1', R['le'] - 0.1, R['decembre'] - 0.08, '« Le GRAND PRIX… DE NOËL ! » : les mots slamment', univers='titre', cam=cam('ring', [0, 3, 110], [0, 30, 0], 20, [0, 5, 135], [0, 30, 0], 22), actions=['mots_titre', 'meute_grille'], ecran={'mode': 'titre'})
plan('T2', R['decembre'] - 0.08, R['preparez'] - 0.1, '« 23 décembre ! » : les 15 emblèmes derrière la meute', univers='titre', cam=cam('ring', [0, 34, 190], [0, 10, 40], 24, [0, 26, 165], [0, 10, 40], 26), actions=['meute_grille', 'emblemes_grille'], ecran={'mode': 'texte', 'ligne1': '23 DÉCEMBRE', 'couleur': '#ffc83d'})
plan('T3', R['preparez'] - 0.1, R['commence'] - 0.02, '« Préparez-vous… à VROMBIR ! » : les 5 feux', univers='final', cam=cam('ring', [0, 6, 106], [0, 30, -200], 28, [0, 4, 94], [0, 30, -200], 30), actions=['meute_grille', 'emblemes_grille', 'feux'], ecran={'mode': 'feux'})
plan('T4', R['commence'] - 0.02, R['commence'] + 1.6, '« Que le spectacle… COMMENCE ! » : départ dans la fumée', univers='final', cam=cam('ring', [0, 3, -90], [0, 4, 0], 20, [0, 4, -115], [0, 4, 0], 18), actions=['meute_depart', 'emblemes_grille', 'pyros'], ecran={'mode': 'titre'}, epaule=1.0)
plan('SF', R['commence'] + 1.6, DUR, 'Retour au salon : la télé affiche le logo', 'salon', cam=cam('abs', [0, 108, 195], [0, 100, -178], 22, [0, 104, 60], [0, 100, -178], 26), actions=['meute_garee', 'tv_logo', 'fondu_fin'], lum=0.5, lune=0.6)

# ---------------------------------------------------------------- contrôles
plans.sort(key=lambda p: p['debut'])
ids = [p['id'] for p in plans]
assert len(ids) == len(set(ids)), 'identifiants en double'
assert abs(plans[0]['debut']) < 1e-6 and abs(plans[-1]['fin'] - DUR) < 1e-6, 'le découpage doit couvrir 0 → DUR'
for a, b in zip(plans, plans[1:]):
    assert abs(a['fin'] - b['debut']) < 1e-6, f"trou ou chevauchement entre {a['id']} ({a['fin']}) et {b['id']} ({b['debut']})"
for p in plans:
    assert p['fin'] - p['debut'] > 0.05, f"plan trop court : {p['id']} ({p['fin'] - p['debut']:.3f} s)"
for i, (s0, s1) in enumerate(TH):                                                  # chaque signature est filmée par ses plans de signature
    couv = [p for p in plans if p.get('ecurie') == i and 'signature' in p['actions']]
    assert couv and abs(couv[0]['debut'] - s0) < 1e-6 and couv[-1]['fin'] >= s1 - 0.3, f'signature {i + 1} mal couverte'

# impacts caméra (secousse + coup de FOV + flash + flou radial) : [temps, force 0..1]
HITS = [[R['arene'], 1.0], [R['quinze'], 0.45], [R['dizaines'], 0.45], [R['cinq'], 0.5], [R['trone'], 0.7],
        [R['groupe_A'], 0.6], [R['groupe_B'], 0.6], [R['groupe_C'], 0.6]] + [[t, 0.22] for t in E] + [[s0, 0.5] for s0, _ in TH] + \
       [[TH[14][1], 0.8], [R['nuit'], 0.7], [R['attaque'], 0.6], [R['temoins'], 1.0], [R['uniques'], 0.5], [R['pieges'], 0.55],
        [R['trahisons'], 0.6], [R['eternelle'], 0.6], [R['grand'], 0.9], [R['prix'], 0.7], [R['de'], 0.5], [R['noel'], 1.0],
        [R['vingttrois'], 0.4], [R['decembre'], 0.4], [R['commence'], 1.0]]
# le SORT de Petite Mimine (« …petite… MIMINE ! ») : éclair vert + impact, calé sur l'éclat de la voix
VOIX1 = json.load(open(os.path.join(RACINE, 'audio_v5', 'themes_ecuries.json'), encoding='utf-8'))['ecuries']['1'].get('voix', {})
SORT = round(TH[0][0] + VOIX1.get('decalage_s', 0.35) + VOIX1.get('eclat_s', 4.9), 3) if VOIX1 else None
if SORT and SORT < TH[0][1]: HITS.append([SORT, 1.0])
for i, (s0, s1) in enumerate(TH):                                                  # punch caméra sur le 1er temps fort de chaque signature
    pk = (R.get('punchs') or [0] * 15)[i]
    if i == 0 or s0 + pk >= s1: continue
    HITS.append([round(s0 + pk, 3), 0.7 if i in (2, 4, 8, 13, 14) else 0.45])
HITS.sort()
sortie = {'_doc': 'Découpage de l\'animatic de l\'intro v5 — généré par outils/generer_plans_v5.py depuis audio_v5/audio/rapport_v5.json. Ne pas éditer à la main : modifier le script.',
          'duree': DUR, 'fps': 60, 'decalage': DEC, 'sort': SORT, 'reperes': R, 'hits': HITS, 'plans': plans}
os.makedirs(os.path.join(RACINE, 'data'), exist_ok=True)
json.dump(sortie, open(os.path.join(RACINE, 'data', 'plans_intro_v5.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(plans)} plans, 0 → {DUR} s, {len(HITS)} impacts, décalage après l\'appel {DEC} s')
