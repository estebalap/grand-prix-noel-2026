#!/usr/bin/env python3
"""Génère data/plans_intro_v6.json (découpage de l'INTRO V6 « L'Hybride Ultime ») depuis audio_v6/audio/rapport_v6.json.

V6 = l'énergie 3D de la Version 1 + la lisibilité broadcast de la Version 2 :
  - ACTE 0 : le salon est LISIBLE dès la première seconde (lumières d'ambiance, plus de réflexions coupées) ;
  - APPEL DES ÉCURIES : un mouvement continu « SWOOP-AND-HOLD » par écurie (au lieu de deux plans coupés sec) :
      phase 1  swoop d'entrée (≈ 20 %, 0,5–0,9 s) : la caméra plonge sur la place pendant que le concept-car arrive ;
      phase 2  read hold (≈ 65 %) : vitesse réduite de 88 % (vitesse de dérive = 12 % de la vitesse moyenne du swoop),
               orbite lente type Gran Turismo 7, horizon verrouillé (roulis 0°), cadrage 2/3 – 1/3 : la voiture et son
               invocation dans un tiers, la carte HUD de l'écurie dans le tiers libre ;
      phase 3  whip exit (≈ 15 %, 0,35–0,45 s) : accélération franche vers l'écurie suivante (même sens que le swoop
               suivant : raccord dans le mouvement) ;
    une écurie longue (> 5,2 s, la voix de Petite Mimine) reçoit un RACCORD DANS L'AXE au milieu du hold ;
  - UN SEUL IMPACT caméra par écurie (l'impact du son : éclat de voix, atterrissage de Mario, 1er temps fort), et les
    impacts plus proches que 0,45 s sont fusionnés (fini le double / triple coup en < 250 ms) ;
  - HUD broadcast (plan['hud']) : fiches d'écuries, bandeaux de groupes, statistiques, univers, tableau des paris.

Contrôles à la génération : pas de trou ni de chevauchement, durées > 0, identifiants uniques, chaque signature couverte
par un plan stable, aucun impact à moins de 0,45 s d'un autre, vitesse du hold ≤ 12 % de celle du swoop, horizon à 0°.
"""
import json, math, os

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
RAPPORT = json.load(open(os.path.join(RACINE, 'audio_v6', 'audio', 'rapport_v6.json'), encoding='utf-8'))
R = RAPPORT['reperes']
DEC = RAPPORT['decalage_apres_appel_s']
S = lambda x: round(x + DEC, 3)
DUR = R['DUR']
E, TH, IMP = R['ecuries'], R['themes'], R['impacts']
assert len(E) == 15 and len(TH) == 15 and len(IMP) == 15
plans = []

def plan(id_, debut, fin, titre, decor='arene', univers=None, theme='championnat', cam=None, ecran=None, actions=(), allume=1.0, **extra):
    plans.append({'id': id_, 'debut': round(debut, 3), 'fin': round(fin, 3), 'titre': titre, 'decor': decor, 'univers': univers,
                  'theme': theme, 'allume': allume, 'cam': cam, 'ecran': ecran or {'mode': 'titre'}, 'actions': list(actions), **extra})

def cam(rep, p0, c0, mm0, p1=None, c1=None, mm1=None, courbe='doux', roulis=0.0, suit=None, orbite=None):
    d = {'rep': rep, 'p0': p0, 'p1': p1 or p0, 'c0': c0, 'c1': c1 or c0, 'mm0': mm0, 'mm1': mm1 or mm0, 'courbe': courbe, 'roulis': roulis, 'suit': suit}
    if orbite: d['orbite'] = orbite
    return d

def hud(type_, debut, fin, **k): return {'type': type_, 'debut': round(debut, 3), 'fin': round(fin, 3), **k}

# ---------------------------------------------------------------- ACTE 0 : le salon, LISIBLE (la clarté de la Version 2)
plan('S1', 0.0, 1.2, 'Une goutte d\'huile tombe sous l\'A4 remorquée (écurie 8)', 'salon', cam=cam('abs', [-92, 2.6, 124], [-108, 2.0, 108], 100, [-95, 2.2, 121], [-108, 0.6, 108], 120), actions=['goutte'], tv=0, lum=0.42, lune=1.1, epaule=0.15, expo=1.45)
plan('S2', 1.2, 3.4, 'Au ras du tapis : les miniatures sous la lumière du salon', 'salon', cam=cam('abs', [-74, 2.4, 92], [-22, 2.4, 66], 45, [-50, 2.6, 84], [-14, 2.2, 64], 50), actions=['meute_garee'], tv=0, lum=0.55, lune=1.0, epaule=0.2, expo=1.35)
plan('S3', 3.4, 4.6, 'La télé s\'allume : reflet bleu sur les carrosseries', 'salon', cam=cam('abs', [-30, 3.0, 84], [-10, 4.5, 50], 40, [-28, 4.0, 76], [-10, 6, 40], 45), actions=['meute_garee', 'tv_allume'], lum=0.6, lune=0.9, epaule=0.2, expo=1.3)
plan('S4', 4.6, 7.6, 'Le salon complet : canapé, tapis rouge, télé, cheminée, sapin', 'salon', cam=cam('abs', [40, 14, 120], [-20, 6, 60], 28, [10, 10, 100], [-22, 4, 62], 32), actions=['meute_garee', 'lumiere_saute'], lum=0.7, lum1=0.85, lune=0.8, epaule=0.3, expo=1.2)
plan('S5', 7.6, 9.06, 'Le salon s\'enfonce : le tapis devient le ring', 'transfo', theme='tapis', cam=cam('abs', [0, 150, 70], [0, 0, 25], 18, [0, 70, 75], [0, 15, 25], 24, courbe='entree'), actions=['meute_garee', 'transformation'], lum=0.85, lune=0.7, epaule=0.25, expo=1.15)
plan('S6', 9.06, R['arene'], 'Noir', 'noir', cam=cam('abs', [0, 70, 75], [0, 15, 25], 24))

# ---------------------------------------------------------------- ACTE 1 : l'arène + statistiques broadcast
D_ = dict(direct=True)
plan('A1', R['arene'], R['quinze'], 'ARÈNE ! burnout dans la fumée, flammes, pyros', theme='tapis', cam=cam('ring', [6, 3, 70], [0, 5, 0], 18, [4, 9, 100], [0, 8, 0], 22), actions=['meute_burnout', 'pyros'], ecran={'mode': 'titre'}, epaule=0.8, **D_)
plan('A2', R['quinze'], R['dizaines'], '« Quinze écuries ! » : travelling au ras des 15 concept-cars', cam=cam('ring', [-150, 5, 142], [-110, 4, 125], 32, [150, 5, 142], [190, 4, 125], 32, courbe='cine'), actions=['emblemes_rangee'], ecran={'mode': 'texte', 'ligne1': '15 ÉCURIES', 'couleur': '#ffe23d'},
     hud=hud('stat', R['quinze'] + 0.05, R['dizaines'] - 0.05, valeur='15', label='ÉCURIES', sous='3 groupes de 5 · 1 concept-car chacune', couleur='#ffe23d'), **D_)
plan('A3', R['dizaines'], R['cinq'], '« Des DIZAINES de bolides ! » : le parc fermé (vrais modèles m3d)', cam=cam('ring', [-150, 26, -175], [-226, 1, -125], 28, [-150, 22, 120], [-226, 1, 170], 28, courbe='cine'), actions=['parc'], ecran={'mode': 'texte', 'ligne1': 'DES DIZAINES', 'ligne2': 'DE BOLIDES', 'couleur': '#ff8a2a'},
     hud=hud('stat', R['dizaines'] + 0.05, R['cinq'] - 0.05, valeur='DES DIZAINES', label='DE BOLIDES', sous='à découvrir dans les caisses mystère', couleur='#ff8a2a'), **D_)
plan('A4', R['cinq'], R['une'] - 0.12, '« Cinq voies… » : passages au ras de la caméra', cam=cam('ring', [30, 1.4, 0], [-10, 4, 0], 16, [28, 2.0, 6], [-10, 5, 6], 16), actions=['voies', 'meute_passe'], ecran={'mode': 'texte', 'ligne1': '5 VOIES', 'couleur': '#35e07a'},
     hud=hud('stat', R['cinq'] + 0.05, R['une'] - 0.17, valeur='5', label='VOIES', sous='Rainbow Road · 5 bolides par manche', couleur='#35e07a'), **D_)
plan('A5', R['une'] - 0.12, R['trone'], '« …une seule place… » : arrêt sur image', allume=0.25, cam=cam('ring', [42, 10, 55], [0, 10, 0], 32, [32, 9, 45], [0, 12, 0], 38), actions=['voies', 'meute_figee', 'podium'], ecran={'mode': 'texte', 'ligne1': 'UNE SEULE PLACE', 'couleur': '#ffffff'}, epaule=0.3,
     hud=hud('stat', R['une'], R['trone'] - 0.05, valeur='1', label='SEULE PLACE', sous='sur le trône', couleur='#ffffff'), **D_)
plan('A6', R['trone'], R['coin_rouge'] - 0.9, '« …sur le TRÔNE ! » : la couronne, pluie de confettis', cam=cam('ring', [0, 3, 40], [0, 22, 0], 22, [0, 5, 34], [0, 27, 0], 22), actions=['podium', 'trone', 'couronne'], ecran={'mode': 'texte', 'ligne1': 'LE TRÔNE', 'couleur': '#ffc83d'}, **D_)

# ---------------------------------------------------------------- ACTE 2 : l'appel des 15 écuries (Swoop-and-Hold)
plan('R0', R['coin_rouge'] - 0.9, E[0] - 0.05, '« Dans le coin rouge… le groupe A ! »', cam=cam('ring', [-40, 16, 95], [-128, 8, 0], 22, [-70, 10, 70], [-128, 6, -10], 24), actions=['cloche', 'emblemes_place'], ecran={'mode': 'groupe', 'lettre': 'A', 'index': 0}, epaule=0.6,
     hud=hud('groupe', R['groupe_A'] - 0.1, E[0] - 0.12, lettre='A', index=0), **D_)

# cadrage de lecture (repère 'place' : x = côté, y = haut, z = vers le ring ; la voiture est à l'origine, avant vers +z).
# rayon (cm), hauteur caméra, cible (x, y, z), focale (mm), angle de départ du hold (rad, mesuré depuis +z vers +x)
CADRAGE = {
    'base': (20, 4.5, [0, 2.2, 0], 28, 0.55),
    0: (22, 4.0, [0, 3.0, 0], 26, 0.55),       # Mimine : forge, poussière western
    1: (24, 4.5, [0, 5.5, 0], 24, 0.55),       # Twingo : pluie de bonbons
    2: (24, 4.0, [0, 4.0, 0], 24, 0.50),       # Optic : faisceaux + arcs électriques
    3: (30, 8.0, [0, 7.0, 0], 22, 0.55),       # Tata Freddy : cartes en lévitation
    4: (30, 4.0, [0, 3.0, 0], 26, 0.45),       # Mario : bond de 45 cm (la caméra suit le bond, cadrée au tiers)
    5: (30, 6.0, [0, 7.0, 0], 22, 0.55),       # Symphonie : portée et notes
    6: (24, 1.6, [0, 13.0, 0], 16, 0.35),      # Yaris : rayon divin + Triforce (contre-plongée)
    7: (36, 8.0, [0, 3.0, -2], 22, 0.60),      # A4 (dépanneuse + A4 remorquée, 15 cm) : grille hexagonale
    8: (30, 3.0, [8, 16.0, 8], 18, -2.5),      # Titou : caméra derrière la voiture, regard vers le ciel d'où plonge la comète
    9: (24, 1.8, [0, 13.0, -10], 16, 0.25),    # Doom : l'éclipse derrière la voiture
    10: (24, 2.0, [0, 9.0, 0], 18, 0.45),      # Milo : étoiles filantes
    11: (32, 5.0, [0, 9.0, 0], 20, 0.55),      # Bob : ゴゴゴ en lévitation
    12: (24, 4.0, [0, 2.5, -3], 26, 0.60),     # Jojo : rideau de fumée de drift
    13: (40, 12.0, [0, 2.0, 0], 20, 0.50),     # Ninja : éclaboussure à 360°
    14: (30, 4.0, [0, 6.0, 0], 22, 0.55),      # Princess : tourbillon de pétales
}
RALENTI = 0.12          # vitesse du hold = 12 % de la vitesse moyenne du swoop (−88 %)

def orbite_pt(rayon, h, theta): return [round(rayon * math.sin(theta), 3), round(h, 3), round(rayon * math.cos(theta), 3)]
def dist(a, b): return math.dist(a, b)

def swoop_and_hold(i, t0, t1, ta=None, tb=None, avec_swoop=True, avec_whip=True, serrer=1.0, theta_debut=None):
    """Caméra 'swoop' dans le repère de la place de l'écurie i. Renvoie (cam, ta, tb, theta_fin)."""
    rayon, h, cible, mm, th1 = CADRAGE.get(i, CADRAGE['base'])
    rayon *= serrer; mm = round(mm / serrer ** 0.35, 1)
    if serrer < 1: cible = [cible[0], round(cible[1] * 0.55, 2), cible[2]]           # plan serré : la carrosserie au centre vertical
    if theta_debut is not None: th1 = theta_debut
    D = t1 - t0
    Ta = min(0.9, max(0.5, 0.20 * D)) if avec_swoop else 0.0
    Tw = min(0.45, max(0.35, 0.13 * D)) if avec_whip else 0.0
    ta = t0 + Ta if ta is None else ta; tb = t1 - Tw if tb is None else tb; Th = tb - ta
    P1 = orbite_pt(rayon, h, th1)
    if avec_swoop:   # départ haut et loin, côté de l'écurie précédente (+x local) : la caméra plonge sur la place
        P0 = orbite_pt(rayon * 1.75, h + 20 + rayon * 0.25, th1 + 0.85); C0 = [cible[0] + 6, cible[1] + 4, cible[2]]
        v_swoop = dist(P0, P1) / Ta
    else:            # raccord dans l'axe : même axe, plus serré, sans swoop
        P0 = P1; C0 = cible; v_swoop = 2.6 * rayon / 0.7
    corde = min(RALENTI * v_swoop * Th, 2 * rayon * math.sin(0.5))       # orbite lente, au plus ~57°
    dth = 2 * math.asin(min(0.999, corde / (2 * rayon)))
    P2 = orbite_pt(rayon, h, th1 - dth)
    if avec_whip:    # whip vers l'écurie suivante (−x local), cible entraînée dans le même sens
        P3 = orbite_pt(rayon * 1.05, h + 2, th1 - dth - 0.9); P3[0] -= rayon * 0.6; C3 = [cible[0] - rayon * 0.9, cible[1], cible[2]]
    else:
        P3 = P2; C3 = cible
    c = {'rep': 'place', 'mode': 'swoop', 'suit': i, 'pts': [P0, P1, P2, P3], 'cibles': [C0, cible, cible, C3],
         'mm': [round(mm * 0.8, 1), mm, mm, round(mm * 0.9, 1)], 'temps': [round(t0, 3), round(ta, 3), round(tb, 3), round(t1, 3)],
         'tiers': -1 if i % 2 == 0 else 1, 'roulis': 0.0, 'suitHauteur': i == 4}
    vh = dist(P1, P2) / max(1e-6, Th)
    c['controle'] = {'v_swoop_cm_s': round(v_swoop, 1), 'v_hold_cm_s': round(vh, 2), 'ratio_hold': round(vh / v_swoop, 3) if avec_swoop else None}
    return c, ta, tb, th1 - dth

GROUPES = {5: ('B', 1, R['groupe_B']), 10: ('C', 2, R['groupe_C'])}
DEPARTS = [None] * 15
for i in range(15):
    debut = E[i] - 0.05
    if i in GROUPES:
        lettre, idx, tg = GROUPES[i]
        cible = [[-128, 8, 0], [0, 8, 128], [128, 8, 0]][idx]
        plan(f'R{lettre}', tg - 0.08, debut, f'« Le groupe {lettre} ! »', cam=cam('ring', [0, 30, 60], cible, 22, [0, 22, 40], cible, 24), actions=['emblemes_place'], ecran={'mode': 'groupe', 'lettre': lettre, 'index': idx}, epaule=0.5,
             hud=hud('groupe', tg - 0.04, debut - 0.06, lettre=lettre, index=idx), **D_)
    s0, s1 = TH[i]
    fin = (GROUPES[i + 1][2] - 0.08) if (i + 1) in GROUPES else (E[i + 1] - 0.05 if i + 1 < 15 else s1 + 0.15)
    D = fin - debut
    titre = f'Écurie {i + 1} — swoop, hold de lecture, whip'
    ecr = {'mode': 'ecurie', 'index': i}
    if D > 5.2:                                                                     # raccord dans l'axe au milieu du hold
        mi = round(debut + 0.5 * D, 3)
        c1, ta, tb, th_fin = swoop_and_hold(i, debut, mi, avec_whip=False)
        c2, _, tb2, _ = swoop_and_hold(i, mi, fin, ta=mi, avec_swoop=False, serrer=0.62, theta_debut=th_fin)
        plan(f'R{i + 1:02d}', debut, mi, titre + ' (1/2)', cam=c1, actions=['emblemes_place', 'signature'], ecran=ecr, ecurie=i, epaule=0.25,
             hud=hud('ecurie', ta - 0.1, mi + 0.5, index=i, cote='d' if c1['tiers'] < 0 else 'g', impact=IMP[i]), **D_)
        plan(f'R{i + 1:02d}a', mi, fin, f'Écurie {i + 1} — raccord dans l\'axe (plus serré), puis whip', cam=c2, actions=['emblemes_place', 'signature'], ecran=ecr, ecurie=i, epaule=0.2,
             hud=hud('ecurie', ta - 0.1, tb2, index=i, cote='d' if c2['tiers'] < 0 else 'g', impact=IMP[i]), **D_)
        DEPARTS[i] = round(ta, 3)
    else:
        c, ta, tb, _ = swoop_and_hold(i, debut, fin)
        plan(f'R{i + 1:02d}', debut, fin, titre, cam=c, actions=['emblemes_place', 'signature'], ecran=ecr, ecurie=i, epaule=0.25,
             hud=hud('ecurie', ta - 0.1, tb, index=i, cote='d' if c['tiers'] < 0 else 'g', impact=IMP[i]), **D_)
        DEPARTS[i] = round(ta, 3)
plan('R16', TH[14][1] + 0.15, R['attention'] - 0.03, 'Les 15 concept-cars : grue au-dessus du ring, déluge de confettis', cam=cam('ring', [0, 10, 150], [0, 10, 0], 20, [0, 55, 200], [0, 0, 10], 20), actions=['emblemes_place', 'pyros', 'disques'], ecran={'mode': 'titre'}, epaule=0.5,
     hud=hud('stat', TH[14][1] + 0.4, R['attention'] - 0.2, valeur='15', label='ÉCURIES SUR LA LIGNE', sous='Groupes A · B · C', couleur='#ffc83d'), **D_)

# ---------------------------------------------------------------- ACTE 3 : les univers (temps v4 décalés)
plan('U0', R['attention'] - 0.03, S(51.2), '« Mais attention… ils ne viennent pas seuls ! »', theme='sauvage', allume=0.2, cam=cam('ring', [0, 14, 120], [0, 8, 0], 32, [0, 10, 80], [0, 8, 0], 40), ecran={'mode': 'texte', 'ligne1': '?', 'taille': 300, 'couleur': '#ff2d55'}, **D_)
plan('G1', S(51.2), R['nuit'], 'GOTHAM : la Batmobile sort du brouillard', univers='gotham', theme='sauvage', allume=0.35, cam=cam('ring', [0, 2.5, 66], [0, 4, 0], 35, [0, 2.5, 48], [0, 4, -10], 35), actions=['gotham', 'batmobile'], ecran={'mode': 'texte', 'ligne1': 'GOTHAM', 'couleur': '#c9d6ff'},
     hud=hud('univers', S(51.2) + 0.3, R['nuit'] - 0.05, titre='GOTHAM', sous='UNIVERS SPÉCIAL', detail='La Batmobile', couleur='#c9d6ff'), **D_)
plan('G2', R['nuit'], R['rit'], '« …la NUIT. » : éclair, chauves-souris', univers='gotham', theme='sauvage', allume=0.35, cam=cam('ring', [-34, 5, 26], [0, 4, 10], 45, [-34, 5, -10], [0, 4, -20], 45), actions=['gotham', 'batmobile', 'eclair', 'chauves_souris'], ecran={'mode': 'texte', 'ligne1': 'GOTHAM', 'couleur': '#c9d6ff'}, **D_)
plan('G3', R['rit'], S(60.0), '« …quelqu\'un rit. » : une ombre, rien de plus', univers='gotham', theme='sauvage', allume=0.15, cam=cam('ring', [0, 16, 100], [0, 10, 0], 28, [0, 14, 84], [0, 10, 0], 30), actions=['gotham', 'ombre_rire'], ecran={'mode': 'texte', 'ligne1': 'HA HA HA', 'couleur': '#8f4dff', 'cle': 'rire'}, **D_)
BOX = R['box']
plan('F1', S(60.0), BOX[0] - 0.05, 'FORMULE 1 : la voie des stands', univers='f1', cam=cam('ring', [55, 8, -36], [0, 3, -72], 30, [46, 6, -42], [0, 3, -66], 32), actions=['f1_stands'], ecran={'mode': 'texte', 'ligne1': 'FORMULE 1', 'couleur': '#ff2d2d'},
     hud=hud('univers', S(60.0) + 0.2, BOX[0] - 0.1, titre='FORMULE 1', sous='UNIVERS SPÉCIAL', detail='5 monoplaces dans la voie des stands', couleur='#ff2d2d'), **D_)
for k in range(4):
    fin = BOX[k + 1] - 0.05 if k < 3 else R['attaque'] - 0.05
    plan(f'F1b{k + 1}', BOX[k] - 0.05, fin, f'« Box, box » ({k + 1}/4) : caméra embarquée', univers='f1', cam=cam('voiture', [0, 3.2, -2.5], [0, 2.8, 30], 16, [0.3, 3.2, -2.3], [0, 2.8, 30], 16, suit=100 + k), actions=['f1_stands', 'radio'], ecran={'mode': 'texte', 'ligne1': 'BOX · BOX', 'couleur': '#ffffff', 'cle': f'box{k}'}, epaule=0.2, **D_)
plan('F2', R['attaque'] - 0.05, S(66.0), '« Pneus tendres, on ATTAQUE ! »', univers='f1', cam=cam('ring', [-14, 2, -70], [-14, 3, 40], 20, [-14, 2.5, -60], [-14, 3, 60], 22), actions=['f1_depart'], ecran={'mode': 'texte', 'ligne1': 'ATTAQUE !', 'couleur': '#ff2d2d'}, **D_)
plan('AP1', S(66.0), R['temoins'], 'APOCALYPSE : terres brûlées, l\'Épave N12 (v9)', univers='apoca', theme='sauvage', cam=cam('ring', [-26, 5, 84], [0, 4, 0], 28, [-12, 4, 52], [0, 4, -20], 28), actions=['apoca', 'epave_roule'], ecran={'mode': 'texte', 'ligne1': 'APOCALYPSE', 'couleur': '#ff8a2a'},
     hud=hud('univers', S(66.0) + 0.3, R['temoins'] - 0.05, titre='APOCALYPSE', sous='UNIVERS SPÉCIAL', detail='Les survivants et L\'Épave', couleur='#ff8a2a'), **D_)
plan('AP2', R['temoins'], S(71.4), '« Soyez TÉMOINS ! » : saut, explosion, le luminaire tombe', univers='apoca', theme='sauvage', cam=cam('ring', [60, 5, 0], [0, 8, 0], 22, [70, 9, 10], [0, 10, 0], 20), actions=['apoca', 'epave_saut', 'explosion', 'luminaire_casse'], ecran={'mode': 'texte', 'ligne1': 'TÉMOINS !', 'couleur': '#ff8a2a'}, epaule=0.8, **D_)

# ---------------------------------------------------------------- ACTE 4 : les caisses
plan('C1', S(71.4), R['uniques'], '« Ouvrez les caisses… découvrez vos bolides… »', univers='caisses', cam=cam('ring', [45, 32, 85], [0, 5, 0], 28, [-45, 28, 85], [0, 5, 0], 28), actions=['caisses', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': 'OUVREZ', 'ligne2': 'LES CAISSES', 'couleur': '#ffc83d'},
     hud=hud('univers', S(71.4) + 0.3, R['uniques'] - 0.05, titre='CAISSES MYSTÈRE', sous='LE DRAFT', detail='6 bolides par écurie, tirés à la main', couleur='#ffc83d'), **D_)
plan('C2', R['uniques'], R['chante'] - 0.1, '« …les modèles UNIQUES ! » : faisceaux de rareté', univers='caisses', cam=cam('ring', [0, 6, 80], [0, 30, 0], 20, [0, 4, 62], [0, 40, 0], 18), actions=['caisses', 'faisceaux', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': 'MODÈLES', 'ligne2': 'UNIQUES', 'couleur': '#ffc83d'},
     hud=hud('stat', R['uniques'] + 0.05, R['chante'] - 0.15, valeur='★', label='MODÈLES UNIQUES', sous='un seul exemplaire chacun', couleur='#ffc83d'), **D_)
plan('C3', R['chante'] - 0.1, S(78.6), '« …chante dans le noir… » : silhouette dans l\'ombre', univers='caisses', allume=0.04, cam=cam('ring', [0, 9.5, 24], [0, 4, -3], 40, [0, 9, 18], [0, 4, -3], 45), actions=['caisses', 'silhouette', 'luminaire_casse_fixe'], ecran={'mode': 'texte', 'ligne1': '…', 'couleur': '#2a3a3a', 'cle': 'noir'}, epaule=0.2)

# ---------------------------------------------------------------- ACTE 5 : pièges, paris (tableau broadcast), gloire
plan('P1', S(78.6), R['trahisons'] - 0.05, '« Des PIÈGES ! » : la peau de banane', univers='pieges', cam=cam('ring', [26, 4, 16], [0, 2, -10], 35, [22, 4, -2], [0, 2, -20], 35), actions=['banane'], ecran={'mode': 'texte', 'ligne1': 'PIÈGES !', 'couleur': '#ffe23d'},
     hud=hud('stat', S(78.6) + 0.15, R['trahisons'] - 0.1, valeur='PIÈGE', label='Peau de banane', sous='voie 3', couleur='#ffe23d'), **D_)
plan('P2', R['trahisons'] - 0.05, R['paris'] - 0.05, '« Des TRAHISONS ! » : la carapace', univers='pieges', cam=cam('ring', [-26, 7, 26], [0, 3, 0], 30, [-22, 5, 16], [0, 3, -5], 30), actions=['carapace'], ecran={'mode': 'texte', 'ligne1': 'TRAHISONS !', 'couleur': '#3f8cff'},
     hud=hud('stat', R['trahisons'], R['paris'] - 0.1, valeur='TRAHISON', label='Carapace bleue', sous='voie 2', couleur='#3f8cff'), **D_)
plan('P3', R['paris'] - 0.05, S(84.0), '« …paris en direct… ou à l\'ancienne ! » : tableau des cotes', univers='paris', cam=cam('ring', [0, 30, 150], [0, 60, -60], 24, [0, 40, 125], [0, 70, -60], 26), actions=['telephone', 'pieces', 'carnet'], ecran={'mode': 'texte', 'ligne1': 'PARIS', 'ligne2': 'EN DIRECT', 'couleur': '#35e07a'},
     hud=hud('paris', R['paris'] + 0.05, S(84.0) - 0.1), cadre_paris=True, **D_)
plan('GL', S(84.0), R['le'] - 0.1, '« …la gloire ÉTERNELLE ! » : la Coupe arc-en-ciel', univers='gloire', allume=0.6, cam=cam('ring', [34, 4, 34], [0, 18, 0], 24, [-34, 4, 34], [0, 22, 0], 24), actions=['coupe', 'rayons'], ecran={'mode': 'texte', 'ligne1': 'LA GLOIRE', 'ligne2': 'ÉTERNELLE', 'couleur': '#ffc83d'},
     hud=hud('univers', S(84.0) + 0.4, R['le'] - 0.25, titre='LA GLOIRE', sous='ÉTERNELLE', detail='La Coupe arc-en-ciel', couleur='#ffc83d'), **D_)

# ---------------------------------------------------------------- ACTE 6 : titre et final (pas de HUD : les mots 3D parlent)
plan('T1', R['le'] - 0.1, R['decembre'] - 0.08, '« Le GRAND PRIX… DE NOËL ! » : les mots slamment', univers='titre', cam=cam('ring', [0, 3, 110], [0, 30, 0], 20, [0, 5, 135], [0, 30, 0], 22), actions=['mots_titre', 'meute_grille'], ecran={'mode': 'titre'})
plan('T2', R['decembre'] - 0.08, R['preparez'] - 0.1, '« 23 décembre ! » : les 15 concept-cars derrière la meute', univers='titre', cam=cam('ring', [0, 34, 190], [0, 10, 40], 24, [0, 26, 165], [0, 10, 40], 26), actions=['meute_grille', 'emblemes_grille'], ecran={'mode': 'texte', 'ligne1': '23 DÉCEMBRE', 'couleur': '#ffc83d'})
plan('T3', R['preparez'] - 0.1, R['commence'] - 0.02, '« Préparez-vous… à VROMBIR ! » : les 5 feux', univers='final', cam=cam('ring', [0, 6, 106], [0, 30, -200], 28, [0, 4, 94], [0, 30, -200], 30), actions=['meute_grille', 'emblemes_grille', 'feux'], ecran={'mode': 'feux'})
plan('T4', R['commence'] - 0.02, R['commence'] + 1.6, '« Que le spectacle… COMMENCE ! » : départ dans la fumée', univers='final', cam=cam('ring', [0, 3, -90], [0, 4, 0], 20, [0, 4, -115], [0, 4, 0], 18), actions=['meute_depart', 'emblemes_grille', 'pyros'], ecran={'mode': 'titre'}, epaule=0.8)
plan('SF', R['commence'] + 1.6, DUR, 'Retour au salon : la télé affiche le logo', 'salon', cam=cam('abs', [0, 108, 195], [0, 100, -178], 22, [0, 104, 60], [0, 100, -178], 26), actions=['meute_garee', 'tv_logo', 'fondu_fin'], lum=0.75, lune=0.6, expo=1.2)

# ---------------------------------------------------------------- contrôles
plans.sort(key=lambda p: p['debut'])
ids = [p['id'] for p in plans]
assert len(ids) == len(set(ids)), 'identifiants en double'
assert abs(plans[0]['debut']) < 1e-6 and abs(plans[-1]['fin'] - DUR) < 1e-6, 'le découpage doit couvrir 0 → DUR'
for a, b in zip(plans, plans[1:]):
    assert abs(a['fin'] - b['debut']) < 1e-6, f"trou ou chevauchement entre {a['id']} ({a['fin']}) et {b['id']} ({b['debut']})"
for p in plans:
    assert p['fin'] - p['debut'] > 0.05, f"plan trop court : {p['id']} ({p['fin'] - p['debut']:.3f} s)"
for i, (s0, s1) in enumerate(TH):                                                  # chaque signature est couverte par ses plans
    couv = [p for p in plans if p.get('ecurie') == i]
    assert couv and couv[0]['debut'] <= s0 and couv[-1]['fin'] >= s1 - 0.3, f'signature {i + 1} mal couverte'
    stable = [p for p in couv if p['cam'].get('mode') == 'swoop']
    assert stable and stable[0]['cam']['temps'][1] <= IMP[i] <= stable[-1]['cam']['temps'][2] + 0.3, f'impact {i + 1} hors du hold'
for p in plans:
    c = p['cam']
    if c.get('mode') == 'swoop':
        assert c['roulis'] == 0.0, 'horizon non verrouillé'
        r = c['controle']['ratio_hold']
        assert r is None or r <= RALENTI + 1e-3, f"hold trop rapide dans {p['id']} ({r})"

# impacts caméra : [temps, force]. UN par écurie (son et image), puis fusion des coups < 0,45 s (on garde le plus fort)
BRUTS = [[R['arene'], 1.0], [R['quinze'], 0.45], [R['dizaines'], 0.45], [R['cinq'], 0.5], [R['trone'], 0.7],
         [R['groupe_A'], 0.6], [R['groupe_B'], 0.6], [R['groupe_C'], 0.6]] + \
        [[IMP[i], 0.85 if i in (0, 4, 8, 13) else 0.6] for i in range(15)] + \
        [[TH[14][1] + 0.15, 0.8], [R['nuit'], 0.7], [R['attaque'], 0.6], [R['temoins'], 1.0], [R['uniques'], 0.5], [R['pieges'], 0.55],
         [R['trahisons'], 0.6], [R['eternelle'], 0.6], [R['grand'], 0.9], [R['prix'], 0.7], [R['de'], 0.5], [R['noel'], 1.0],
         [R['vingttrois'], 0.4], [R['decembre'], 0.4], [R['commence'], 1.0]]
BRUTS.sort()
HITS = []
for t, f in BRUTS:
    if HITS and t - HITS[-1][0] < 0.45:
        if f > HITS[-1][1]: HITS[-1] = [round(t, 3), f]
        continue
    HITS.append([round(t, 3), f])
for a, b in zip(HITS, HITS[1:]): assert b[0] - a[0] >= 0.45, ('impacts trop proches', a, b)
sortie = {'_doc': 'Découpage de l\'intro V6 « L\'Hybride Ultime » — généré par outils/generer_plans_v6.py depuis audio_v6/audio/rapport_v6.json. Ne pas éditer à la main : modifier le script.',
          'version': 'v6', 'duree': DUR, 'fps': 60, 'decalage': DEC, 'sort': IMP[0], 'reperes': R, 'hits': HITS, 'impacts': IMP, 'departs': DEPARTS,
          'fusion_impacts_s': 0.45, 'plans': plans}
os.makedirs(os.path.join(RACINE, 'data'), exist_ok=True)
json.dump(sortie, open(os.path.join(RACINE, 'data', 'plans_intro_v6.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ratios = [p['cam']['controle']['ratio_hold'] for p in plans if p['cam'].get('mode') == 'swoop' and p['cam']['controle']['ratio_hold']]
print(f'{len(plans)} plans, 0 → {DUR} s, {len(HITS)} impacts (après fusion de {len(BRUTS)}), décalage après l\'appel {DEC} s, '
      f'hold à {min(ratios) * 100:.0f}–{max(ratios) * 100:.0f} % de la vitesse du swoop')
