#!/usr/bin/env python3
"""Grand Prix de Noël — INTRO V6 « L'Hybride Ultime » : bande-son continue, sans saccade ni pompage.

Même voix, mêmes musiques, mêmes bruitages réels que la v5 (tout est lu dans ../audio_v5, EN LECTURE SEULE).
Ce qui change (audit des défauts de sound_v5.py) :

  1. SIGNATURES D'ÉCURIES — fondus à puissance constante au lieu des micro-fondus linéaires de 20 / 80 ms :
       entrée  : sin(θ) sur 150–220 ms, prise dans l'AMORCE du fichier (les 150–220 ms qui précèdent l'extrait) :
                 le temps fort de l'extrait arrive à plein niveau, l'amorce chevauche la queue silencieuse du nom parlé ;
       sortie  : cos(θ) sur 250–350 ms, passe-haut Butterworth d'ordre 2 à 160 Hz fondu sur les 200 dernières ms
                 (« bass-swap » : aucun choc de basses avec l'annonce suivante) ;
       washout : queue de réverbération de 0,25 s (filtrée, stéréo décorrélée) qui fond l'extrait dans l'annonce suivante.
  2. MACRO DE TRANSITION sur chaque signature (début a = THEME_T[k][0]) :
       riser / whoosh stéréo filtré 200 Hz → 4,2 kHz de a − 0,35 s à a + 0,05 s (filtre d'état à fréquence glissante) ;
       sub-drop à phase intégrée φ[n] = 2π/fs · Σ f[k], 110 Hz → 34 Hz en 0,45 s, saturation tanh douce, calé sur le
       TEMPS FORT de l'invocation (a + 1er temps fort, ou l'éclat de voix de Petite Mimine) = l'unique impact caméra.
     Le whoosh parasite à (nom − 0,28 s), qui tombait 130 ms avant la fin de l'extrait précédent, est supprimé
     (son générateur est quand même appelé et jeté : le tirage aléatoire semé de sound.py reste identique).
  3. FIN DE LA CACOPHONIE ET DU POMPAGE pendant l'appel :
       le groove « lourd » en mi mineur est rendu sur un bus à part ; pendant chaque signature, sa guitare et ses
       aigus disparaissent (fondu croisé) au profit d'un PULSE SUB-BED : le même groove filtré sous 140 Hz (kick + basse,
       un battement de cœur) ; plus aucune fausse note sous les 15 thèmes ;
       le produit en dents de scie « creux_t × duck » est remplacé par UN sidechain lissé asymétrique : cible
       = min(voix, signature), maintien du plancher pendant les silences < 250 ms (filtre minimum glissant),
       anticipation 40 ms, attaque 50 ms, relâchement 450 ms. Zéro remontée entre le nom et sa signature.
  4. VOIX OFF CONTINUE : point de coupe cherché ENTRE le dernier mot et l'attaque du mot suivant (jamais dans un mot ni
     dans une respiration qui chevauche deux phrases), fondus cosinus de 35 ms, et un lit d'ambiance d'arène continu sous
     la voix (plus de « porte de bruit » ni de zéro numérique entre les phrases).

Tout est déterministe : deux lancements donnent le même fichier.
Sorties (dans audio_v6/) : audio/mix_v6.wav (−16 LUFS), timeline_v6.json, audio/rapport_v6.json
(temps film de chaque mot, repères, créneaux et impacts des signatures, diagnostic de pompage v5 → v6).
Usage : py -3 sound_v6.py
"""
import json, os, subprocess, sys, types
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import minimum_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))                      # audio_v6 (écriture)
V5 = os.path.normpath(os.path.join(HERE, '..', 'audio_v5'))            # voix, thèmes, banque BBC, moteur (lecture seule)
OUT = os.path.join(HERE, 'audio')
SR = 48000
PRISE = 'A'
RNG6 = np.random.default_rng(6060)                                     # hasard semé propre à la v6 (n'entame pas celui de sound.py)

# ------------------------------------------------------------------ 1. découpage de la voix et grille de montage (identique v5)
PHRASES = [
    ('mesdames',   0,   2,   1.20),   # Mesdames… et messieurs…
    ('salon',      3,   8,   4.60),   # Ce soir, le salon se transforme
    ('arene',      9,  10,   8.90),   # … en ARÈNE !
    ('stats',     11,  19,  10.90),   # Quinze écuries ! Des dizaines de bolides ! Cinq voies…
    ('trone',     20,  26,  15.60),   # et UNE SEULE place… sur le TRÔNE !
    ('attention', 89,  95,  48.00),   # Mais attention… ils ne viennent pas seuls !
    ('gotham',    96, 115,  51.20),   # Des ruelles de Gotham… Je suis la NUIT… quelqu'un rit [rire]
    ('f1',       116, 128,  60.00),   # Des stands de la Formule 1… Box, box… Pneus tendres, on ATTAQUE !
    ('apoca',    129, 139,  65.80),   # Et des terres brûlées… Survivants de l'Apocalypse ! Soyez TÉMOINS !
    ('caisses',  140, 161,  71.40),   # Ouvrez les caisses… modèles UNIQUES… l'un d'eux chante dans le noir…
    ('pieges',   162, 177,  78.60),   # Des PIÈGES ! Des TRAHISONS ! Paris en direct… ou à l'ancienne !
    ('gloire',   178, 184,  84.00),   # Et pour le vainqueur… la gloire… ÉTERNELLE !
    ('titre',    185, 191,  88.20),   # Le GRAND PRIX… DE NOËL ! 23 décembre !
    ('final',    192, 199,  92.80),   # Préparez-vous… à VROMBIR ! Que le spectacle… COMMENCE !
]
AVANT_APPEL = ('mesdames', 'salon', 'arene', 'stats', 'trone')
MOTS = json.load(open(os.path.join(V5, 'voix', f'mots_prise_{PRISE}.json'), encoding='utf-8'))

def ffmpeg_mono(src, dst, af=None):
    cmd = ['ffmpeg', '-y', '-v', 'error', '-i', src] + (['-af', af] if af else []) + ['-ar', str(SR), '-ac', '1', dst]
    subprocess.run(cmd, check=True)
    x, _ = sf.read(dst, dtype='float64'); os.remove(dst); return x

def charge_voix():
    af = ("highpass=f=85,equalizer=f=250:t=q:w=1:g=1.8,equalizer=f=3400:t=q:w=1.1:g=2.8,"
          "acompressor=threshold=-22dB:ratio=3.2:attack=6:release=90:makeup=4,alimiter=limit=0.89:attack=3:release=40")
    return ffmpeg_mono(os.path.join(V5, 'voix', f'vo_v4_prise_{PRISE}.mp3'), os.path.join(OUT, '_vo_v6_proc.wav'), af)

def energie(x, a, b, h):
    a = max(0, a); b = min(len(x), b)
    if b - a < 2 * h: return None, a
    e = np.array([np.sum(x[i:i + h] ** 2) for i in range(a, b - h, h // 2)])
    return e, a

def creux(x, t, fen=0.12):
    """(v5) Instant de plus faible énergie autour de t — utilisé seulement pour le tout premier mot."""
    h = SR // 100; e, a = energie(x, int((t - fen) * SR), int((t + fen) * SR), h)
    if e is None: return t
    return (a + int(np.argmin(e)) * (h // 2) + h // 2) / SR

def coupe(x, fin_mot, debut_suivant):
    """V6 : point de coupe dans le SILENCE entre deux phrases : minimum d'énergie (fenêtres de 10 ms) cherché dans
    [fin du dernier mot + 20 ms, attaque du mot suivant − 30 ms], borné à 0,35 s avant l'attaque.
    Ne mord jamais dans un mot (défaut v5 : ±0,12 s autour de l'attaque, qui chevauchait parfois deux phrases)."""
    a = max(fin_mot + 0.02, debut_suivant - 0.35); b = debut_suivant - 0.03
    if b - a < 0.03: return round((fin_mot + debut_suivant) / 2, 4)
    h = SR // 100; e, i0 = energie(x, int(a * SR), int(b * SR), h)
    if e is None: return round((a + b) / 2, 4)
    return (i0 + int(np.argmin(e)) * (h // 2) + h // 2) / SR

def attaque(x, t, fen=0.08):
    """Début réel d'un mot (montée d'énergie la plus forte autour du minutage de transcription)."""
    h = SR // 200; a = max(0, int((t - fen) * SR)); b = min(len(x), int((t + fen) * SR))
    e = np.array([np.sqrt(np.mean(x[i:i + h] ** 2)) for i in range(a, b - h, h)])
    if len(e) < 3: return t
    d = np.diff(np.log(e + 1e-5)); return (a + (int(np.argmax(d)) + 1) * h) / SR

os.makedirs(OUT, exist_ok=True)
VOIX = charge_voix()

APPEL = [('coin', 27, 33), ('ec01', 34, 36), ('ec02', 37, 39), ('ec03', 40, 41), ('ec04', 42, 44), ('ec05', 45, 47),
         ('grB', 48, 50), ('ec06', 51, 52), ('ec07', 53, 55), ('ec08', 56, 58), ('ec09', 59, 61), ('ec10', 62, 65),
         ('grC', 66, 69), ('ec11', 70, 73), ('ec12', 74, 76), ('ec13', 77, 80), ('ec14', 81, 84), ('ec15', 85, 88)]
ANCIEN_DEBUT_APPEL, ANCIENNE_ATTENTION = 19.60, 48.00

# ------------------------------------------------------------------ 2. signatures d'écuries : fondus à puissance constante
_TH = json.load(open(os.path.join(V5, 'themes_ecuries.json'), encoding='utf-8'))
THEMES, DUREE_MAX_SIG = _TH['ecuries'], float(_TH.get('duree_max_s', 99.0))
EXT = ('.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac')
FONDU_ENTREE = (0.15, 0.22)          # s : sin(θ), dans l'amorce disponible
FONDU_SORTIE = (0.25, 0.35)          # s : cos(θ)
HPF_SORTIE, HPF_FC = 0.20, 160.0     # s, Hz : passe-haut Butterworth 2e ordre fondu sur la fin
WASHOUT = 0.25                       # s : queue de réverbération après la fin
SOS_HP160 = signal.butter(2, HPF_FC, 'highpass', fs=SR, output='sos')

def fichier_perso(n):
    d = os.path.join(V5, 'themes_ecuries')
    if not os.path.isdir(d): return None
    for f in sorted(os.listdir(d)):
        if f.lower().endswith(EXT) and f.split('_')[0].lstrip('0') == str(n): return os.path.join(d, f)
    return None

def lire_audio(chemin): return ffmpeg_mono(chemin, os.path.join(OUT, '_tmp_theme_v6.wav'))

def extrait(x, debut, duree, gain_db, cible_rms=0.24, amorce=FONDU_ENTREE[1]):
    """Extrait [debut, debut + duree] AVEC son amorce (jusqu'à `amorce` s de matière avant le début, si le fichier en a).
    Renvoie (signal, nb d'échantillons d'amorce). La mise au niveau est calculée sur l'extrait seul : le son n'est pas retouché."""
    i0, n = int(round(debut * SR)), int(round(duree * SR))
    p = min(int(amorce * SR), i0)
    seg = x[i0 - p:i0 + n].copy()
    if len(seg) <= p: raise SystemExit('extrait vide (début au-delà de la fin du fichier)')
    corps = seg[p:]
    e = np.sqrt(np.convolve(corps ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same'))
    rms = np.sqrt(np.mean(corps[e > e.max() * 0.1] ** 2)) + 1e-9
    return seg * (cible_rms / rms) * 10 ** (gain_db / 20), p

def ir_stereo(rt60=1.1, pre=0.008, graine=0):
    """Réponse impulsionnelle courte (bruit décroissant, assombri), deux canaux décorrélés — semée."""
    r = np.random.default_rng(9000 + graine); n = int((rt60 + pre) * SR); t = np.arange(n) / SR
    env = np.where(t < pre, 0.0, np.exp(-6.91 * (t - pre) / rt60))
    l = signal.sosfilt(signal.butter(1, 5200, 'lowpass', fs=SR, output='sos'), r.standard_normal(n) * env)
    rr = signal.sosfilt(signal.butter(1, 5200, 'lowpass', fs=SR, output='sos'), r.standard_normal(n) * env)
    k = 1.0 / (np.sqrt(np.sum(l ** 2)) + 1e-9); return l * k, rr * k

def habiller_signature(sig, pre, k):
    """Enveloppe V6 d'une signature (amorce `pre` échantillons incluse) → (signal mono, washout L, washout R)."""
    n = len(sig); corps = n - pre
    # entrée : sin(θ) sur l'amorce disponible (150–220 ms) ; un fichier qui commence à 0 garde son attaque naturelle (anti-clic 5 ms)
    fi = pre if pre >= int(FONDU_ENTREE[0] * SR) else max(pre, int(0.005 * SR))
    if fi > 0: sig[:fi] *= np.sin(0.5 * np.pi * np.arange(fi) / fi)
    # sortie : passe-haut fondu sur les 200 dernières ms, puis cos(θ) sur 250–350 ms (≤ 40 % de l'extrait)
    nh = min(int(HPF_SORTIE * SR), corps // 2)
    if nh > 16:
        a0 = max(0, n - nh - int(0.06 * SR))                                 # 60 ms de marge : le filtre est déjà établi
        filtre = signal.sosfiltfilt(SOS_HP160, sig[a0:])                     # phase nulle : aucun filtrage en peigne au fondu
        w = np.zeros(n - a0); w[-nh:] = 0.5 - 0.5 * np.cos(np.pi * np.arange(nh) / nh)
        sig[a0:] = sig[a0:] * (1 - w) + filtre * w
    fo = int(np.clip(0.4 * corps / SR, FONDU_SORTIE[0], FONDU_SORTIE[1]) * SR); fo = min(fo, int(0.4 * corps))
    if fo > 0: sig[-fo:] *= np.cos(0.5 * np.pi * np.arange(fo) / fo)
    # washout : réverbération des 450 dernières ms, gardée APRÈS la fin seulement, sans grave, éteinte en cos sur 0,25 s
    queue = sig[-int(0.45 * SR):]
    il, ir = ir_stereo(1.1, 0.008, k)
    wl = signal.fftconvolve(queue, il)[len(queue):]; wr = signal.fftconvolve(queue, ir)[len(queue):]
    nw = int(WASHOUT * SR); wl, wr = wl[:nw], wr[:nw]
    env = np.cos(0.5 * np.pi * np.arange(len(wl)) / max(1, len(wl)))
    wl = signal.sosfiltfilt(SOS_HP160, wl) * env * 0.55; wr = signal.sosfiltfilt(SOS_HP160, wr) * env * 0.55
    return sig, wl, wr

SIGNATURES, AMORCES, WASH, SOURCES_THEMES, PUNCHS, ECLAT = {}, {}, {}, {}, {}, {}
for n in range(1, 16):
    th = THEMES[str(n)]; couches = []                        # (décalage du CORPS en s, signal avec amorce, amorce)
    perso = fichier_perso(n)
    if 'voix' in th:
        v = th['voix']; x, p = extrait(lire_audio(os.path.join(V5, v['fichier'])), v['debut_s'], v['duree_s'], v['gain_db'], 0.3)
        couches.append((v['decalage_s'], x, p)); ECLAT[n] = v['decalage_s'] + v.get('eclat_s', 0.0)
    if perso:
        pp = th.get('perso', {}); x, p = extrait(lire_audio(perso), pp.get('debut_s', 0.0), pp.get('duree_s', 3.0), pp.get('gain_db', 0))
        couches.append((0.0, x, p)); SOURCES_THEMES[n] = os.path.basename(perso)
    else:
        for c in th['bbc']:
            x, p = extrait(lire_audio(os.path.join(V5, 'sons_ecuries', c['son'] + '.wav')), c['debut_s'], c['duree_s'], c['gain_db'])
            if c.get('repete', 1) > 1: x = np.concatenate([x[:p], np.tile(x[p:], int(c['repete']))])   # disque rayé : même tour de sillon rejoué
            couches.append((c['decalage_s'], x, p))
        SOURCES_THEMES[n] = 'BBC ' + ', '.join(c['son'] for c in th['bbc']) + (' + voix' if 'voix' in th else '')
    PRE = max(p - int(d * SR) for d, _, p in couches); PRE = max(0, PRE)      # amorce commune (s'il y a de la matière avant)
    L = max(PRE + int(d * SR) - p + len(x) for d, x, p in couches); sig = np.zeros(L)
    for d, x, p in couches:
        i = PRE + int(d * SR) - p; sig[i:i + len(x)] += x
    cap = th.get('duree_max_s', DUREE_MAX_SIG)
    if 'voix' in th: cap = max(cap, th['voix']['decalage_s'] + th['voix']['duree_s'])   # la réplique n'est jamais coupée
    sig = sig[:PRE + int(cap * SR)]
    sig, wl, wr = habiller_signature(sig, PRE, n)
    SIGNATURES[n], AMORCES[n], WASH[n] = sig, PRE, (wl, wr)
    corps = sig[PRE:]
    _e = np.sqrt(np.convolve(corps ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same'))
    PUNCHS[n] = round(float(np.argmax(_e >= _e.max() * 0.6) / SR), 3)                # 1er temps fort (après le début du corps)

# ---------------------------------------------------------------- passe 1 : étendue de chaque phrase (coupes dans les silences)
TOUTES = [(n, a, b) for (n, a, b, _) in PHRASES if n in AVANT_APPEL] + APPEL + [(n, a, b) for (n, a, b, _) in PHRASES if n not in AVANT_APPEL]
COUPES = [max(0.0, creux(VOIX, MOTS[TOUTES[0][1]]['s'] - 0.07))]
for k in range(1, len(TOUTES)):
    COUPES.append(coupe(VOIX, MOTS[TOUTES[k][1] - 1]['e'], attaque(VOIX, MOTS[TOUTES[k][1]]['s'])))
COUPES.append(len(VOIX) / SR)
SPAN = {nom: (COUPES[k], COUPES[k + 1]) for k, (nom, _, _) in enumerate(TOUTES)}

# ---------------------------------------------------------------- passe 2 : temps film (même logique que la v5)
FILM, THEME_T = {n: t for (n, _, _, t) in PHRASES}, {}
t = ANCIEN_DEBUT_APPEL
for nom, i0, i1 in APPEL:
    FILM[nom] = t; fin = t + SPAN[nom][1] - SPAN[nom][0]
    if nom.startswith('ec'):
        k = int(nom[2:]); corps = (len(SIGNATURES[k]) - AMORCES[k]) / SR
        THEME_T[k] = (round(fin + 0.08, 3), round(fin + 0.08 + corps, 3)); t = THEME_T[k][1] + 0.15
    else:
        t = fin + 0.25
APPEL_FIN = t
DECALAGE = (APPEL_FIN + 1.2) - ANCIENNE_ATTENTION
for (n, _, _, t0) in PHRASES:
    if n not in AVANT_APPEL: FILM[n] = round(t0 + DECALAGE, 3)
DUR = round(round((103.0 + DECALAGE) * SR) / SR, 6)
S = lambda x: round(x + DECALAGE, 3)
# IMPACT unique par écurie (image ET son) : l'éclat de voix de Petite Mimine ; pour Super Mario Pression, l'ATTERRISSAGE
# (le « waaah » est la chute : impact juste avant la fin du cri) ; sinon le 1er temps fort de la signature
CHUTE = {5}
IMPACTS = []
for k in range(1, 16):
    a, b = THEME_T[k]
    pk = ECLAT[k] if k in ECLAT else (max(1.4, min(b - a - 0.6, 2.2)) if k in CHUTE else PUNCHS[k])
    IMPACTS.append(round(min(a + pk, b - 0.05), 3))

PLACEMENTS, T = [], {}
for k, (nom, i0, i1) in enumerate(TOUTES):
    s0, s1 = SPAN[nom]; t_film = FILM[nom]
    PLACEMENTS.append((nom, s0, s1, t_film))
    for j in range(i0, (TOUTES[k + 1][1] if k + 1 < len(TOUTES) else len(MOTS))):
        T[f'm{j:03d}'] = round(t_film + (attaque(VOIX, MOTS[j]['s']) - s0), 3)
    T[nom] = t_film; T[nom + '_fin'] = round(t_film + (s1 - s0), 3)
M_ = lambda j: T[f'm{j:03d}']
REP = {
    'arene': M_(10), 'quinze': M_(11), 'dizaines': M_(14), 'cinq': M_(18), 'une': M_(21), 'trone': M_(26),
    'coin_rouge': M_(29), 'groupe_A': M_(33), 'groupe_B': M_(50), 'groupe_C': M_(69),
    'ecuries': [M_(j) for j in (34, 37, 40, 42, 45, 51, 53, 56, 59, 62, 70, 74, 77, 81, 86)],
    'ecuries_fin': [T[f'ec{k:02d}_fin'] for k in range(1, 16)],
    'attention': M_(90), 'gotham': M_(99), 'voiture': M_(105), 'nuit': M_(109), 'rit': M_(115),
    'formule': M_(119), 'box': [M_(j) for j in (121, 122, 123, 124)], 'attaque': M_(128),
    'brulees': M_(132), 'apocalypse': M_(137), 'temoins': M_(139),
    'caisses': M_(142), 'uniques': M_(150), 'chante': M_(158), 'noir': M_(161),
    'pieges': M_(163), 'trahisons': M_(165), 'paris': M_(168), 'telephone': M_(173), 'ancienne': M_(177),
    'vainqueur': M_(181), 'gloire': M_(183), 'eternelle': M_(184),
    'le': M_(185), 'grand': M_(186), 'prix': M_(187), 'de': M_(188), 'noel': M_(189), 'vingttrois': M_(190), 'decembre': M_(191),
    'preparez': M_(192), 'vrombir': M_(195), 'spectacle': M_(198), 'commence': M_(199), 'DUR': DUR,
    'themes': [list(THEME_T[k]) for k in range(1, 16)], 'punchs': [PUNCHS[k] for k in range(1, 16)],
    'impacts': IMPACTS, 'appel_fin': round(APPEL_FIN, 3),
}

# ------------------------------------------------------------------ 3. moteur : sound.py (instruments) + vrais bruitages (lecture seule)
TIMELINE = os.path.join(HERE, 'timeline_v6.json')
json.dump({**{k: v for k, v in REP.items() if not isinstance(v, list)}, 'DUR': DUR}, open(TIMELINE, 'w', encoding='utf-8'), indent=1)
src = open(os.path.join(V5, 'sound.py'), encoding='utf-8').read()
cle = "T = json.load(open(os.path.join(HERE, 'timeline.json')))"
if src.count(cle) != 1: raise SystemExit('sound.py a changé : ligne de chargement de la timeline introuvable.')
src = src.replace(cle, f"T = json.load(open({TIMELINE!r}))").replace("if __name__ == '__main__':", "if False:")
M = types.ModuleType('sound_v6_moteur'); M.__file__ = os.path.join(V5, 'sound.py')
exec(compile(src, 'sound.py (v6)', 'exec'), M.__dict__)
sys.path.insert(0, V5)
import sound_reel                                    # noqa: E402  (banque BBC de ../audio_v5/sons_reels + calage)
sound_reel.brancher_sons_reels(M)
assert abs(M.N - DUR * SR) <= 1, (M.N, DUR * SR)
N = M.N

tt, Bus, env_curve = M.tt, M.Bus, M.env_curve
kick, snare, clap, hat, stomp, taiko, tom = M.kick, M.snare, M.clap, M.hat, M.stomp, M.taiko, M.tom
sub_boom, crash, bell, guitar, bass, pad, choir, celesta, brass = M.sub_boom, M.crash, M.bell, M.guitar, M.bass, M.pad, M.choir, M.celesta, M.brass
whoosh, riser, reverse_cymbal, sweep_noise, tape_stop = M.whoosh, M.riser, M.reverse_cymbal, M.sweep_noise, M.tape_stop
noise, pink, bp, lp, hp, exp_env, saw = M.noise, M.pink, M.bp, M.lp, M.hp, M.exp_env, M.saw

# ---- nouveaux générateurs V6 (hasard propre RNG6)
def riser_filtre(d, f0=200.0, f1=4200.0, graine=0, q=2.2):
    """Riser / whoosh : bruit blanc dans un filtre d'état (Chamberlin) passe-bande dont la fréquence glisse
    exponentiellement f0 → f1 ; deux canaux décorrélés. Enveloppe : montée (u²) puis relâchement doux sur les 50 dernières ms."""
    n = int(d * SR); r = np.random.default_rng(7000 + graine); out = []
    fc = f0 * (f1 / f0) ** (np.arange(n) / max(1, n - 1)); F = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR); Qi = 1.0 / q
    for _ in range(2):
        x = r.standard_normal(n); low = band = 0.0; y = np.empty(n)
        for i in range(n):
            high = x[i] - low - Qi * band; band += F[i] * high; low += F[i] * band; y[i] = band
        out.append(y)
    u = np.arange(n) / n; env = u ** 2; tail = int(0.05 * SR); env[-tail:] *= np.cos(0.5 * np.pi * np.arange(tail) / tail)
    k = 1.0 / (np.max(np.abs(out[0])) + 1e-9)
    return out[0] * env * k, out[1] * env * k

def sub_drop(d=0.45, f0=110.0, f1=34.0, queue=0.35, drive=1.6):
    """Sub-drop à phase intégrée : φ[n] = 2π/fs · Σ f[k], glissement exponentiel f0 → f1 en d s, puis tenue à f1 ;
    attaque 4 ms, décroissance exponentielle, saturation tanh douce (normalisée)."""
    n = int((d + queue) * SR); t = np.arange(n) / SR
    f = np.where(t < d, f0 * (f1 / f0) ** (t / d), f1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.32) * np.minimum(1, (t[-1] - t) / 0.03 + 1e-9)
    return np.tanh(drive * np.sin(ph) * env) / np.tanh(drive)

def lit_arene(d):
    """Lit d'ambiance continu (air d'une salle pleine) : bruit rose filtré 180 Hz – 4 kHz, très bas, semé RNG6."""
    x = RNG6.standard_normal(int(d * SR))
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; a = [1, -2.494956002, 2.017265875, -0.522189400]
    x = signal.lfilter(b, a, x) * 6
    return signal.sosfilt(signal.butter(2, [180, 4000], 'bandpass', fs=SR, output='sos'), x)

def silence_voix_bus():
    """Voix off : segments coupés dans les silences, fondus cosinus de 35 ms (au lieu de 12 ms linéaires)."""
    vo = Bus(); f = int(0.035 * SR)
    for nom, s0, s1, t_film in PLACEMENTS:
        seg = VOIX[int(s0 * SR):int(s1 * SR)].copy(); g = min(len(seg) // 4, f)
        if g > 0:
            seg[:g] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(g) / g); seg[-g:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(g) / g)
        vo.add(seg, t_film, 1.0)
    return vo

def slam(music, fx, t0, note=55.0, fort=1.0, pan=0.0):
    fx.add(whoosh(0.5, 250, 5500, 0.9), t0 - 0.38, 0.5 * fort)
    fx.add(sub_boom(1.2, 90, 40, 0.9), t0, 0.75 * fort)
    fx.add(M.crunch(0.6)[:int(0.5 * SR)], t0, 0.45 * fort, pan)
    fx.add(bell(1320, 1.4, 0.6), t0, 0.22 * fort, 0.2)
    music.add(brass(note * 4, 0.6, 1.0), t0, 0.38 * fort)
    fx.add(crash(1.4, 0.6), t0, 0.28 * fort)

def groove(music, t_debut, t_fin, beat=0.489, lourd=False):
    riff = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 36.71]
    t0, i = t_debut, 0
    while t0 < t_fin - 0.05:
        st = i % 8
        if st % 2 == 0: music.add(kick(1.0), t0, 0.78 if lourd else 0.72)
        if st in (2, 6): music.add(clap(1.0), t0, 0.68); music.add(snare(0.6), t0, 0.55)
        if st in (0, 1, 4, 5): music.add(stomp(0.9), t0, 0.5, -0.1)
        music.add(hat(False, 1.0), t0, 0.32, 0.25); music.add(hat(False, 0.7), t0 + beat / 2, 0.28, -0.25)
        music.add(bass(riff[st] * 2, beat * 0.9, 1.0), t0, 0.55)
        if st in (0, 3, 4, 6) or (lourd and st == 7):
            d = 11 if lourd else 6
            music.add(guitar(riff[st] * 4, beat * 0.9, 0.9, drive=d, mute=True), t0, 0.38, -0.35)
            music.add(guitar(riff[st] * 4, beat * 0.9, 0.9, drive=d, mute=True), t0 + 0.004, 0.38, 0.35)
        t0 += beat; i += 1

def foule(crowd, R):
    bed = M.crowd_noise(DUR, 1.0)
    pts = [(0, 0.04), (3.0, 0.08), (8.4, 0.28), (8.85, 0.02), (R['arene'], 1.0), (R['arene'] + 1.4, 0.6), (15.3, 0.6), (15.5, 0.12),
           (R['trone'], 0.9), (R['trone'] + 1.5, 0.5), (R['groupe_A'], 0.85), (S(46.9), 0.8), (S(47.6), 0.1), (R['gotham'], 0.08),
           (S(59.8), 0.2), (R['attaque'], 0.7), (S(65.6), 0.3), (R['temoins'], 0.95), (S(70.6), 0.25), (S(71.4), 0.08), (S(77.9), 0.1),
           (R['pieges'], 0.6), (S(83.6), 0.6), (S(84.0), 0.08), (S(87.6), 0.04), (R['le'], 0.04), (R['grand'], 1.0), (S(92.6), 0.7),
           (R['commence'], 1.0), (R['commence'] + 0.4, 1.25), (S(100.0), 0.9), (DUR, 0.0)]
    g = env_curve(pts)
    crowd.add(bed * g[:len(bed)] * 0.5, 0.0, 1.0, 0.0)
    ap = M.claps(DUR, 90, seed=3)
    ga = env_curve([(0, 0), (R['arene'] - 0.1, 0), (R['arene'] + 0.3, 1.0), (14.0, 0.5), (15.3, 0.4), (15.5, 0), (R['trone'], 0.9),
                    (R['groupe_A'], 0.7), (S(46.9), 0.7), (S(47.6), 0), (R['temoins'], 0.6), (S(70.6), 0.0), (R['grand'], 0.0),
                    (R['grand'] + 0.3, 1.0), (S(92.6), 0.8), (R['commence'] + 0.4, 1.0), (S(101), 0.5), (DUR, 0)])
    crowd.add(ap * ga[:len(ap)] * 0.45, 0.0, 1.0, -0.2)
    def roar(t0, rise, hold, fall, lvl):
        d = rise + hold + fall; x = M.crowd_noise(d, 1.0, 1.4); t = tt(d)
        e = np.where(t < rise, (t / rise) ** 1.5, np.where(t < rise + hold, 1.0, np.maximum(0, 1 - (t - rise - hold) / fall) ** 1.5))
        crowd.add(x * e * lvl, t0, 1.0, 0.0)
    for t0, lvl in ((R['arene'], 1.5), (R['trone'], 1.1), (R['groupe_A'], 0.9), (R['groupe_B'], 0.9), (R['groupe_C'], 1.0),
                    (R['ecuries'][-1] + 0.6, 1.3), (R['temoins'], 1.0), (R['grand'], 1.5), (R['noel'], 1.9), (R['commence'] + 0.5, 2.2)):
        roar(t0, 0.06, 0.9, 2.0, lvl)
    # lit d'ambiance d'arène CONTINU (jamais de zéro numérique sous la voix) : très bas dans le salon, présent dans l'arène
    air = lit_arene(DUR)
    ga2 = env_curve([(0, 0.0), (0.5, 0.25), (R['arene'] - 0.3, 0.35), (R['arene'], 1.0), (DUR - 1.6, 1.0), (DUR, 0.0)])
    crowd.add_st(air * ga2 * 0.010, np.roll(air, 4801) * ga2 * 0.010, 0.0, 1.0)

# ------------------------------------------------------------------ 4. composition
def build():
    R = REP
    music, fx, crowd, appel = Bus(), Bus(), Bus(), Bus()      # appel = groove « lourd » de l'appel (traité à part au mixage)
    vo = silence_voix_bus()
    foule(crowd, R)

    # === SALON
    A = R['arene']
    sub = np.sin(2 * np.pi * 41.2 * tt(A)) * np.minimum(1, tt(A) / 3.0); music.add(sub, 0.0, 0.5)
    music.add(pad(82.41, A, 0.5, cutoff=520, attack=3.5, release=0.3), 0.0, 0.5, -0.2)
    music.add(pad(123.47, A - 1.5, 0.35, cutoff=700, attack=4.0, release=0.3), 1.5, 0.4, 0.2)
    t, gap = 0.35, 1.15
    while t < A - 0.25:
        music.add(kick(0.5), t, 0.9); music.add(kick(0.35), t + 0.2, 0.9); gap = max(0.42, gap * 0.94); t += gap
    for t0 in (0.16, 0.33, 0.5):
        fx.add(bp(noise(0.08), 100, 5000) * exp_env(0.08, 0.02, 0.001), t0, 0.35, -0.3)
    fx.add(M.joue_reel('statique_tv', bp(noise(0.4), 2000, 12000) * exp_env(0.4, 0.15, 0.003)), 3.4, 0.22, 0.5)
    fx.add(whoosh(0.9, 200, 3000, 0.5), 2.6, 0.5)
    for k, t0 in enumerate((5.0, 5.7, 6.4, 7.1)):
        fx.add(M.toy_motor(0.45 + 0.1 * k, 1.0), t0, 0.10 + 0.04 * k, -0.6 + 0.4 * k)
    music.add(riser(A - 6.4, 1.0), 6.2, 0.55); fx.add(reverse_cymbal(2.4, 0.7), A - 2.45, 0.5)
    for k in range(10): music.add(tom(110 + 12 * k, 0.5 + 0.05 * k), A - 1.85 + k * 0.17, 0.7, -0.4 + 0.09 * k)

    # === ARÈNE
    fx.add(sub_boom(2.6, 78, 27, 1.0), A, 1.0); fx.add(crash(3.8, 1.0), A, 0.85); fx.add(M.cannon(1.0), A, 0.6)
    fx.add(whoosh(1.2, 400, 6000, 1.0), A - 0.05, 0.4); fx.add(bell(880, 3.5, 1.0), A + 0.02, 0.55, 0.1)
    for k in range(4): fx.add(M.firework(0.5), A + 0.15 + k * 0.28, 0.5, -0.8 + 0.4 * k)
    music.add(guitar(82.41, 3.0, 1.0), A, 0.55); music.add(guitar(164.81, 3.0, 0.8), A, 0.4); music.add(brass(164.81, 1.6, 1.0), A, 0.35)
    groove(music, A + 0.45, R['une'] - 0.25)
    for key, f in (('quinze', 55.0), ('dizaines', 61.7), ('cinq', 73.4)): slam(music, fx, R[key], f)
    for j in range(5):
        x, _ = M.engine_f1(1.25, 700 + 40 * j, 330 + 20 * j, 1.0, 0.48); M.add_pass(fx, x, R['cinq'] + 0.25 + j * 0.12, 0.3)

    # === TRÔNE
    U = R['une']; fx.add(tape_stop(0.5, 1.0), U - 0.35, 0.55)
    music.add(sub_boom(2.2, 48, 36, 0.8), U, 0.5); music.add(pad(82.41, 2.4, 0.5, cutoff=420, attack=0.6, release=0.6), U, 0.5)
    for tm in np.arange(U + 0.1, R['trone'] - 0.2, 0.55): music.add(kick(0.5), tm, 0.7)
    music.add(riser(R['trone'] - U, 0.9, 400, 7000), U, 0.35)
    TR = R['trone']
    fx.add(sub_boom(2.8, 70, 26, 1.0), TR, 0.9); fx.add(bell(660, 4.0, 1.0), TR, 0.7); fx.add(bell(990, 3.0, 0.7), TR + 0.01, 0.4, 0.3)
    fx.add(crash(3.0, 0.8), TR, 0.4)
    for f, g, p in ((164.81, 0.55, -0.2), (246.94, 0.45, 0.2), (329.63, 0.35, 0.0)): music.add(choir(f, 3.2, 0.9, 0.12, 1.5), TR, g, p)

    # === L'APPEL DES 15 ÉCURIES
    for k in range(3): fx.add(bell(880, 2.2, 1.0), R['coin_rouge'] - 0.9 + k * 0.22, 0.55, -0.1 + 0.1 * k)
    groove(appel, R['groupe_A'] - 0.2, R['appel_fin'] - 0.1, lourd=True)               # → bus à part (pulse sub-bed sous les thèmes)
    for key, f in (('groupe_A', 55.0), ('groupe_B', 61.7), ('groupe_C', 73.4)): slam(music, fx, R[key], f, 1.1)
    for k, t0 in enumerate(R['ecuries']):
        _ = whoosh(0.35, 400, 6500, 0.8)                     # v5 : whoosh parasite à t0 − 0,28 s → SUPPRIMÉ (tirage conservé)
        fx.add(sub_boom(0.6, 100, 50, 0.6), t0, 0.4); fx.add(crash(0.9, 0.5), t0, 0.16, 0.3 * ((-1) ** k))
        fx.add(M.crunch(0.4)[:int(0.25 * SR)], t0, 0.18)
    fin_ec = R['themes'][-1][1] - 0.55
    fx.add(sub_boom(2.6, 78, 27, 1.0), fin_ec + 0.55, 0.9); fx.add(crash(3.2, 1.0), fin_ec + 0.55, 0.7)
    for k in range(3): fx.add(M.firework(0.5), fin_ec + 0.6 + k * 0.3, 0.45, -0.6 + 0.6 * k)
    music.add(guitar(82.41, 2.6, 1.0, drive=12), fin_ec + 0.55, 0.5); music.add(brass(164.81, 1.8, 1.0), fin_ec + 0.55, 0.35)
    # macro de transition V6 sur chaque signature : riser stéréo (a − 0,35 → a + 0,05) + sub-drop sur l'impact
    trans = Bus()
    for k, ((a, b), imp) in enumerate(zip(R['themes'], R['impacts'])):
        l, r = riser_filtre(0.40, 200.0, 4200.0, graine=k)
        trans.add_st(l, r, a - 0.35, 0.16)
        trans.add(sub_drop(), imp, 0.50)

    # === « MAIS ATTENTION… »
    fx.add(tape_stop(0.5, 1.0), S(47.5), 0.5)
    music.add(pad(41.2, 3.4, 0.7, cutoff=300, attack=0.3, release=1.0), S(47.9), 0.6); music.add(sub_boom(3.0, 45, 30, 0.7), R['attention'], 0.6)

    # === GOTHAM
    G = R['gotham']
    fx.add(M.joue_reel('pluie', lp(noise(9.0), 1200) * exp_env(9.0, 6.0)), S(51.0), 0.22)
    for f in (82.41, 123.47, 155.56, 196.0, 329.63): music.add(pad(f, 4.2, 0.7, cutoff=2200, attack=0.05, release=1.2, detune=(-6, 5)), G - 0.1, 0.3)
    fx.add(bell(98, 4.0, 1.0), G, 0.55, -0.2)
    fx.add(M.thunder(2.6, 1.0), R['nuit'] - 0.05, 0.6)
    for f in (41.2, 61.7, 82.4): music.add(pad(f, 3.0, 0.9, cutoff=900, attack=0.05, release=0.8), R['voiture'] - 0.6, 0.3)
    fx.add(M.engine_v8(2.2, 1100, 1.0, blips=(0.45, 1.2)), R['voiture'] - 0.5, 0.7)
    for k in range(6): fx.add(M.joue_reel('ailes', bp(noise(0.12), 200, 1500) * exp_env(0.12, 0.04)), R['nuit'] + 0.4 + k * 0.09, 0.3, -0.7 + 0.28 * k)
    music.add(reverse_cymbal(1.6, 0.8), R['rit'] + 0.1, 0.4)
    fx.add(sub_boom(1.6, 60, 30, 0.8), R['rit'] + 1.75, 0.6)

    # === FORMULE 1
    F1 = R['formule']
    for k, tb in enumerate(R['box']):
        bip = np.sin(2 * np.pi * 1250 * tt(0.07)) * np.minimum(1, (0.07 - tt(0.07)) / 0.01) * 0.5
        fx.add(bip, tb - 0.1, 0.25, 0.4)
    fx.add(bp(noise(4.0), 300, 3400) * 0.04, R['box'][0] - 0.3, 0.2, 0.4)
    for k in range(4): fx.add(M.engine_vtec(0.6, 300, 800, 1.0), F1 - 0.6 + k * 0.5, 0.25, -0.5 + 0.3 * k)
    music.add(riser(R['attaque'] - R['box'][0], 0.8, 300, 8000), R['box'][0], 0.35)
    groove(music, R['attaque'], S(65.5), beat=0.4)
    slam(music, fx, R['attaque'], 73.4, 1.0)
    for j in range(5):
        x, _ = M.engine_f1(1.25, 720 + 40 * j, 340 + 20 * j, 1.0, 0.48); M.add_pass(fx, x, R['attaque'] + 0.05 + j * 0.22, 0.42)
    fx.add(M.screech(0.55, 1.0), R['attaque'] + 1.2, 0.35, 0.3)

    # === APOCALYPSE
    S0 = R['brulees'] - 0.6
    fx.add(M.dust_wind(4.5, 1.0), S0, 0.5); fx.add(M.engine_diesel(4.0, 1000, 1.0), S0 + 0.3, 0.65)
    fx.add(M.chain_rattle(1.6, 1.0, 3), S0 + 0.6, 0.35, -0.4)
    music.add(guitar(73.42, 1.8, 1.0, drive=14), R['apocalypse'] - 0.9, 0.65); music.add(guitar(110.0, 1.8, 0.8, drive=14), R['apocalypse'] - 0.89, 0.45)
    fx.add(M.engine_rev(1.4, 70, 260, 1.0), R['apocalypse'] - 0.4, 0.45, -0.3)
    for k, tb in enumerate((R['apocalypse'] + 0.25, R['apocalypse'] + 0.55, R['temoins'] - 0.35)): fx.add(M.backfire(1.0), tb, 0.42, (-0.5, 0.5, 0.0)[k])
    TE = R['temoins']
    fx.add(sub_boom(2.2, 85, 30, 1.0), TE + 0.1, 0.95); fx.add(crash(2.6, 0.9), TE + 0.1, 0.5)
    fx.add(M.joue_reel('explosion', lp(noise(1.6), 2200) * exp_env(1.6, 0.5, 0.004)), TE + 0.1, 0.85)
    fx.add(M.crunch(1.0), TE + 0.6, 0.5); fx.add(M.chain_rattle(0.6, 1.0, 9), TE + 0.62, 0.3, 0.3)
    music.add(guitar(73.42, 2.4, 1.0, drive=16), TE + 0.1, 0.6); music.add(guitar(146.83, 2.4, 0.8, drive=16), TE + 0.11, 0.4)

    # === CAISSES MYSTÈRE
    C0 = R['caisses']
    music.add(pad(220.0, 6.5, 0.4, cutoff=1600, attack=1.2, release=1.5), C0 - 0.8, 0.3)
    for k, f in enumerate([659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25, 880.0, 987.77, 880.0]):
        music.add(celesta(f, 0.9, 1.0), C0 - 0.4 + k * 0.42, 0.28, 0.3 * np.sin(k))
    for k in range(3): fx.add(M.crunch(0.5)[:int(0.18 * SR)], C0 - 0.05 + k * 0.6, 0.25, -0.4 + 0.4 * k)
    fx.add(M.sleigh(0.8, 1.0), R['uniques'], 0.35); fx.add(sub_boom(1.2, 90, 45, 0.8), R['uniques'], 0.5); fx.add(bell(1760, 2.0, 0.5), R['uniques'], 0.2)
    tv = tt(2.6); mel = np.array([880.0, 987.77, 1174.66, 987.77, 1318.51]); idx = np.minimum((tv / 0.52).astype(int), 4)
    f0 = mel[idx] * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * tv)); ph = 2 * np.pi * np.cumsum(f0) / SR
    chant = sum(np.sin(h * ph) / h ** 1.2 for h in range(1, 9))
    chant = bp(chant, 700, 3200) * np.minimum(1, tv / 0.3) * np.minimum(1, (2.6 - tv) / 0.6)
    music.add(chant * 0.18, R['chante'] + 0.15, 0.5, 0.6)
    music.add(pad(110.0, 3.0, 0.5, cutoff=500, attack=0.1, release=1.2), R['noir'], 0.45)

    # === PIÈGES / TRAHISONS / PARIS
    P = R['pieges']; groove(music, P - 0.1, S(83.7))
    slam(music, fx, P, 55.0); fx.add(M.screech(0.7, 1.0), P + 0.2, 0.45, -0.3)
    slam(music, fx, R['trahisons'], 61.7); fx.add(M.crunch(1.0), R['trahisons'] + 0.05, 0.6, 0.3)
    for k in range(6): fx.add(M.coin(1.0), R['paris'] + 0.05 + k * 0.17, 0.42, -0.6 + 0.24 * k)
    fx.add(M.ping(1568, 1.0), R['telephone'] + 0.05, 0.4, 0.3); fx.add(M.sleigh(0.6, 1.0), R['ancienne'] + 0.1, 0.3, -0.3)

    # === GLOIRE
    GL = R['gloire']
    for f, g, p in ((164.81, 0.5, -0.2), (246.94, 0.45, 0.2), (329.63, 0.4, 0.0), (415.3, 0.3, 0.1)): music.add(choir(f, 4.4, 1.0, 0.8, 1.6), GL - 0.6, g, p)
    fx.add(bell(660, 4.0, 1.0), R['eternelle'], 0.6); fx.add(bell(990, 3.2, 0.7), R['eternelle'] + 0.02, 0.35, 0.3)
    fx.add(sub_boom(2.8, 70, 26, 1.0), R['eternelle'], 0.7); fx.add(M.sleigh(1.0, 1.0), R['eternelle'] + 0.3, 0.3, 0.3)

    # === TITRE
    for key, a in (('grand', 1.0), ('prix', 0.8), ('de', 0.6), ('noel', 1.25)):
        t0 = R[key]; fx.add(sub_boom(2.0, 80, 28, 1.0), t0, 0.85 * a); fx.add(crash(2.5, 1.0), t0, 0.55 * a); fx.add(M.cannon(1.0), t0, 0.35 * a)
        music.add(guitar(82.41, 1.6, 1.0, drive=12), t0, 0.45 * a); music.add(brass(164.81, 1.0, 1.0), t0, 0.3 * a)
    for k in range(5): fx.add(M.firework(0.6), R['noel'] + 0.1 + k * 0.17, 0.45, -0.9 + 0.45 * k)
    for key in ('vingttrois', 'decembre'): slam(music, fx, R[key], 82.41, 0.8)

    # === FINAL
    beat, tcur = 0.30, R['decembre'] + 0.55
    riff = [(329.63, 1), (329.63, 1), (329.63, 2), (329.63, 1), (329.63, 1), (329.63, 2), (329.63, 1), (392.0, 1), (523.25, 1.5), (587.33, 0.5)]
    root = {329.63: 82.41, 392.0: 98.0, 523.25: 130.81, 587.33: 146.83}
    for rep in range(2):
        for f, dl in riff:
            r = root[f] * 2
            music.add(guitar(r, dl * beat * 0.95, 1.0, drive=11, mute=(dl <= 1)), tcur, 0.5, -0.35)
            music.add(guitar(r, dl * beat * 0.95, 1.0, drive=11, mute=(dl <= 1)), tcur + 0.003, 0.5, 0.35)
            music.add(kick(1.0), tcur, 0.68); music.add(M.sleigh(0.5, 1.0), tcur, 0.4)
            if dl >= 1: music.add(snare(0.8), tcur + beat * 0.5, 0.35)
            tcur += dl * beat
    for j, (fn, args, g) in enumerate(((M.engine_vtec, (1.6, 140, 760, 1.0), 0.6), (M.engine_v8, (1.8, 1300, 1.0, 0.18, (0.3, 0.8)), 0.6))):
        fx.add(fn(*args), R['vrombir'] - 0.1 + j * 0.15, g, (-0.5, 0.5)[j])
    for k in range(10): music.add(tom(120 + 10 * k, 0.8), R['commence'] - 1.05 + k * 0.1, 0.5, -0.5 + 0.1 * k)
    music.add(riser(1.2, 0.9, 400, 9000), R['commence'] - 1.2, 0.4)
    F = R['commence']
    fx.add(whoosh(0.5, 300, 7000, 1.0), F - 0.45, 0.6); fx.add(sub_boom(3.0, 82, 25, 1.0), F + 0.5, 1.0); fx.add(crash(4.2, 1.0), F + 0.5, 0.85)
    for f in (82.41, 123.47, 164.81, 207.65, 329.63): music.add(guitar(f, 3.6, 1.0, drive=10), F + 0.5, 0.4)
    music.add(brass(329.63, 2.8, 1.0), F + 0.5, 0.4)
    for f, g, p in ((164.81, 0.45, -0.2), (329.63, 0.4, 0.2), (415.3, 0.35, 0.0)): music.add(choir(f, 4.5, 1.0, 0.1, 2.0), F + 0.5, g, p)
    for k, tb in enumerate((F + 0.95, F + 1.45, F + 1.95)): fx.add(bell(880, 3.2, 1.0), tb, 0.65, -0.1 + 0.1 * k)
    for k in range(22): fx.add(M.firework(0.7), F + 0.6 + k * 0.17, 0.5, np.sin(k * 1.7) * 0.9)
    for j in range(5):
        x, _ = M.engine_f1(1.25, 760 + 40 * j, 360 + 20 * j, 1.0, 0.48); M.add_pass(fx, x, F + 0.55 + j * 0.1, 0.4)
    fx.add(M.sleigh(1.0, 1.0), F + 0.7, 0.35)
    # === signatures (corps à a, amorce juste avant) + washout stéréo
    themes = Bus()
    for k in range(1, 16):
        a = R['themes'][k - 1][0]; themes.add(SIGNATURES[k], a - AMORCES[k] / SR, 1.0, 0.0)
        wl, wr = WASH[k]; themes.add_st(wl, wr, a + (len(SIGNATURES[k]) - AMORCES[k]) / SR, 1.0)
    return music, fx, crowd, vo, themes, appel, trans

# ------------------------------------------------------------------ 5. sidechain lissé et diagnostic de pompage
CR = 1000                                                                  # cadence de contrôle (Hz)
def vers_controle(x): return x[::SR // CR].copy()
def vers_audio(c): return np.interp(np.arange(N) / SR, np.arange(len(c)) / CR, c)

def masque_signatures(R, n_c, rampe=0.06):
    """1 pendant chaque signature (de a − rampe à b + rampe), 0 ailleurs, à la cadence de contrôle."""
    m = np.zeros(n_c); tc = np.arange(n_c) / CR
    for a, b in R['themes']: m[(tc >= a - rampe) & (tc <= b + rampe)] = 1.0
    return m

def lisser_asym(cible, attaque=0.050, relache=0.450):
    """Suiveur à un pôle asymétrique (cadence de contrôle) : descend en `attaque`, remonte en `relache`."""
    ka, kr = 1 - np.exp(-1 / (attaque * CR)), 1 - np.exp(-1 / (relache * CR))
    y = np.empty_like(cible); g = cible[0]
    for i, c in enumerate(cible):
        g += (c - g) * (ka if c < g else kr); y[i] = g
    return y

def pompages(g, R, seuil=0.12):
    """Nombre de « bosses » de gain pendant l'appel : remontée > seuil puis redescente > seuil en moins de 0,6 s."""
    a, b = int((R['groupe_A'] - 0.5) * CR), int((R['appel_fin'] + 0.5) * CR); x = g[a:b]; n = 0; i = 0; w = int(0.6 * CR); ou = []
    while i < len(x) - 2:
        j = i + 1
        while j < min(len(x), i + w) and x[j] >= x[j - 1]: j += 1
        if x[j - 1] - x[i] > seuil:
            k = j
            while k < min(len(x), j + w) and x[k] <= x[k - 1]: k += 1
            if x[j - 1] - x[k - 1] > seuil: n += 1; ou.append(round((a + j) / CR, 2)); i = k; continue
        i = j
    return n, ou

# ------------------------------------------------------------------ 6. mixage
def mixdown():
    music, fx, crowd, vo, themes, appel, trans = build(); R = REP
    n_c = len(range(0, N, SR // CR))
    # --- l'appel : groove complet entre les signatures, PULSE SUB-BED (< 140 Hz) pendant les signatures
    sos_lp = signal.butter(4, 140, 'lowpass', fs=SR, output='sos')
    w_sig = vers_audio(lisser_asym(masque_signatures(R, n_c, 0.04), 0.12, 0.05))       # bascule vers le sub-bed en ≈ 50 ms, retour du groove en ≈ 120 ms
    for canal in ('L', 'R'):
        x = getattr(appel, canal); sub = signal.sosfiltfilt(sos_lp, x) * 1.25           # phase nulle : basses en phase avec le groove complet
        getattr(music, canal)[:] += x * (1 - w_sig) + sub * w_sig
    ir_big, ir_vo = M.make_ir(2.6, 0.02, 3, 0.7), M.make_ir(1.5, 0.015, 9, 0.8)
    vl, vr = M.reverb(vo, ir_vo); fl, fr = M.reverb(fx, ir_big); ml, mr = M.reverb(music, ir_big)
    d = int(0.13 * SR); sl = np.zeros(N); sl[d:] = vo.L[:-d]; sr_ = np.zeros(N); sr_[int(d * 1.3):] = vo.R[:-int(d * 1.3)]
    VL = vo.L + 0.2 * vl + 0.14 * sl; VR = vo.R + 0.2 * vr + 0.14 * sr_
    env = signal.sosfilt(signal.butter(2, 6.0, 'lowpass', fs=SR, output='sos'), np.abs(vo.L))
    env = np.clip(env / (np.percentile(env, 99) + 1e-9), 0, 1)
    kill = env_curve([(0, 1), (R['eternelle'] + 1.6, 1), (R['le'] - 0.4, 0.0), (R['grand'] - 0.06, 0.0), (R['grand'], 1.0), (DUR, 1)])
    # --- v5 (pour le diagnostic seulement) : duck lissé à 12 Hz × creux en dents de scie
    duck_v5 = signal.sosfilt(signal.butter(1, 12.0, 'lowpass', fs=SR, output='sos'), 1.0 - 0.58 * env)
    pts = [(0, 1.0)]
    for a, b in R['themes']: pts += [(a - 0.06, 1.0), (a + 0.05, 0.32), (b - 0.1, 0.32), (b + 0.15, 1.0)]
    g_v5 = vers_controle(duck_v5 * env_curve(pts + [(DUR, 1.0)]))
    # --- V6 : cible = min(voix, signature), maintien du plancher 250 ms, anticipation 40 ms, attaque 50 ms / relâchement 450 ms
    PLANCHER_VOIX, PLANCHER_SIG = 0.42, 0.40
    cible = np.minimum(vers_controle(1.0 - (1 - PLANCHER_VOIX) * env), 1.0 - (1 - PLANCHER_SIG) * masque_signatures(R, n_c, 0.0))
    ant = int(0.040 * CR); cible = np.minimum(cible, np.concatenate([cible[ant:], np.full(ant, cible[-1])]))
    tenue = int(0.250 * CR); cible = minimum_filter1d(cible, size=tenue, origin=(tenue - 1) // 2, mode='nearest')   # min sur [t − 250 ms, t]
    g_v6 = lisser_asym(cible, 0.050, 0.450)
    G = vers_audio(g_v6)
    ML = ml * 0.55 + music.L; MR = mr * 0.55 + music.R; FL = fl * 0.6 + fx.L; FR = fr * 0.6 + fx.R
    tl, tr = M.reverb(themes, ir_vo)
    bed_c = 0.55 * kill * (0.45 + 0.55 * G)
    L = VL + (ML * 0.85 + FL * 0.95) * G * kill + crowd.L * bed_c + (themes.L + 0.12 * tl) * 1.05 + trans.L * kill
    Rr = VR + (MR * 0.85 + FR * 0.95) * G * kill + crowd.R * bed_c + (themes.R + 0.12 * tr) * 1.05 + trans.R * kill
    fade = env_curve([(0, 0.0), (0.12, 1.0), (DUR - 1.6, 1.0), (DUR, 0.0)])
    (n5, _), (n6, ou6) = pompages(g_v5, R), pompages(g_v6, R)
    if os.environ.get('V6_DIAG_NPZ'): np.savez(os.environ['V6_DIAG_NPZ'], g_v5=g_v5, g_v6=g_v6, w_sig=vers_controle(w_sig), cr=CR)   # courbes de gain (contrôle)
    DIAG.update({'pompages_appel_v5': n5, 'pompages_appel_v6': n6, 'pompages_appel_v6_instants_s': ou6,
                 'gain_min_max_appel_v6': [round(float(g_v6[int(R['groupe_A'] * CR):int(R['appel_fin'] * CR)].min()), 3),
                                           round(float(g_v6[int(R['groupe_A'] * CR):int(R['appel_fin'] * CR)].max()), 3)]})
    vo_seule = vo.L
    zeros = 0; run = 0
    for v in np.abs(vo_seule[int(R['arene'] * SR):int(R['commence'] * SR):48]) < 1e-9:
        run = run + 1 if v else 0
        if run == 20: zeros += 1
    DIAG['trous_voix_bus_20ms'] = zeros                                     # la voix seule a des silences : c'est le lit qui les comble
    return np.stack([L * fade, Rr * fade], axis=1)

DIAG = {}
def main():
    mix = mixdown()
    raw = os.path.join(OUT, 'mix_v6_raw.wav'); final = os.path.join(OUT, 'mix_v6.wav')
    sf.write(raw, np.clip(mix / max(1.0, np.abs(mix).max()) * 0.9, -1, 1), SR, subtype='PCM_16')
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = [float(l.split()[1]) for l in out.splitlines() if l.strip().startswith('I:')][-1]
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', f'volume={-16.0 - I}dB,alimiter=limit=0.84:attack=2:release=60:level=disabled,aresample=192000,alimiter=limit=0.83:attack=1:release=40:level=disabled,aresample=48000',
                    '-ar', str(SR), '-c:a', 'pcm_s16le', final], check=True)
    os.remove(raw)
    x, _ = sf.read(final, dtype='float64'); m = np.abs(x).max(axis=1)
    run, nz = 0, 0
    for v in m[int(REP['arene'] * SR):int((DUR - 1.6) * SR):48] < 1.5e-5:            # zéro numérique (≤ −96 dBFS) de plus de 20 ms dans le mix
        run = run + 1 if v else 0
        if run == 20: nz += 1
    DIAG['zeros_numeriques_mix_20ms'] = nz
    json.dump({'version': 'v6', 'prise': PRISE, 'duree_s': DUR,
               'phrases': [{'phrase': n, 'source_s': [round(a, 3), round(b, 3)], 'film_s': [t, round(t + b - a, 3)]} for n, a, b, t in PLACEMENTS],
               'reperes': REP, 'mots_film_s': {MOTS[int(k[1:])]['w'] + f'#{k[1:]}': v for k, v in T.items() if k[0] == 'm' and k[1:].isdigit()},
               'signatures': [{'ecurie': k, 'source': SOURCES_THEMES[k], 'film_s': list(THEME_T[k]), 'amorce_s': round(AMORCES[k] / SR, 3),
                               'impact_s': IMPACTS[k - 1], 'riser_s': [round(THEME_T[k][0] - 0.35, 3), round(THEME_T[k][0] + 0.05, 3)],
                               'washout_s': [THEME_T[k][1], round(THEME_T[k][1] + WASHOUT, 3)]} for k in range(1, 16)],
               'reglages': {'fondu_entree_s': FONDU_ENTREE, 'fondu_sortie_s': FONDU_SORTIE, 'passe_haut_sortie': [HPF_SORTIE, HPF_FC], 'washout_s': WASHOUT,
                            'sidechain': {'attaque_s': 0.05, 'relache_s': 0.45, 'tenue_s': 0.25, 'anticipation_s': 0.04}, 'pulse_sub_bed_hz': 140,
                            'fondu_voix_s': 0.035},
               'diagnostic': DIAG, 'loudness_integree_brute_lufs': I,
               'bruitages_reels': len(sound_reel.JOURNAL), 'signatures_ecuries': SOURCES_THEMES, 'decalage_apres_appel_s': round(DECALAGE, 3),
               'licence_bruitages': 'BBC Sound Effects — RemArc (usage personnel)'},
              open(os.path.join(OUT, 'rapport_v6.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'mix_v6.wav : {DUR:.1f} s, {len(sound_reel.JOURNAL)} bruitages réels, diagnostic {DIAG}')

if __name__ == '__main__':
    main()
