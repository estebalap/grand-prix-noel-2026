#!/usr/bin/env python3
"""Grand Prix de Noël — INTRO v5 : bande-son complète (≈ 2 min 30).

v5 = v4 + l'APPEL DES ÉCURIES ALLONGÉ : chaque nom d'écurie est suivi de sa SIGNATURE SONORE (themes_ecuries.json) :
  ton extrait déposé dans themes_ecuries/NN_*.mp3 s'il existe (joué tel quel), sinon de vrais enregistrements BBC non retouchés ;
  pour Petite Mimine Racing, la voix de vieux « Viens ici… petite mimine… ». Tout ce qui suit l'appel est décalé d'autant.

- Voix : nouvelle voix off ElevenLabs « Commentateur def » (eleven_v4), prise A, découpée en 15 phrases et posée
  sur une grille de montage qui laisse respirer l'image 3D (voix/mots_prise_A.json = minutage mot à mot).
- Musique : les instruments et motifs d'Intro Catch (sound.py), recomposés pour les nouvelles séquences
  (salon, arène, appel des 15 écuries, Gotham, Formule 1, Apocalypse, caisses mystère, pièges, gloire, titre, final).
- Bruitages : enregistrements réels BBC via sound_reel.brancher_sons_reels (mêmes règles de calage que l'intro v3).

Tout est déterministe : deux lancements donnent le même fichier.
Sorties : audio/mix_v5.wav (-16 LUFS), timeline_v5.json, audio/rapport_v5.json (temps film de chaque mot, repères, créneaux des signatures).
Usage : py -3 sound_v5.py
"""
import json, os, subprocess, sys, types
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
PRISE = 'B' if '--prise' in sys.argv and sys.argv[sys.argv.index('--prise') + 1].upper() == 'B' else 'A'
SR = 48000

# ------------------------------------------------------------------ 1. découpage de la voix et grille de montage
# (premier mot, dernier mot, début dans le film en s) — indices dans voix/mots_prise_A.json
PHRASES = [
    ('mesdames',   0,   2,   1.20),   # Mesdames… et messieurs…
    ('salon',      3,   8,   4.60),   # Ce soir, le salon se transforme
    ('arene',      9,  10,   8.90),   # … en ARÈNE !
    ('stats',     11,  19,  10.90),   # Quinze écuries ! Des dizaines de bolides ! Cinq voies…
    ('trone',     20,  26,  15.60),   # et UNE SEULE place… sur le TRÔNE !
    # l'appel des écuries est découpé nom par nom plus bas (APPEL)
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
if PRISE == 'B':
    raise SystemExit('La grille de montage est réglée sur la prise A. Pour la prise B, refaire PHRASES avec voix/mots_prise_B.json.')

MOTS = json.load(open(os.path.join(HERE, 'voix', f'mots_prise_{PRISE}.json'), encoding='utf-8'))

def charge_voix():
    src = os.path.join(HERE, 'voix', f'vo_v4_prise_{PRISE}.mp3')
    out = os.path.join(HERE, 'audio', 'vo_v4_proc.wav')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    af = ("highpass=f=85,equalizer=f=250:t=q:w=1:g=1.8,equalizer=f=3400:t=q:w=1.1:g=2.8,"
          "acompressor=threshold=-22dB:ratio=3.2:attack=6:release=90:makeup=4,alimiter=limit=0.89:attack=3:release=40")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', af, '-ar', str(SR), '-ac', '1', out], check=True)
    x, _ = sf.read(out, dtype='float64')
    return x

def creux(x, t, fen=0.12):
    """Instant de plus faible énergie (fenêtres de 10 ms) autour de t : on coupe la voix dans un silence."""
    h = SR // 100; a = max(0, int((t - fen) * SR)); b = min(len(x), int((t + fen) * SR))
    if b - a < 2 * h: return t
    e = np.array([np.sum(x[i:i + h] ** 2) for i in range(a, b - h, h // 2)])
    return (a + int(np.argmin(e)) * (h // 2) + h // 2) / SR

def attaque(x, t, fen=0.08):
    """Début réel d'un mot (montée d'énergie la plus forte autour du minutage de transcription)."""
    h = SR // 200; a = max(0, int((t - fen) * SR)); b = min(len(x), int((t + fen) * SR))
    e = np.array([np.sqrt(np.mean(x[i:i + h] ** 2)) for i in range(a, b - h, h)])
    if len(e) < 3: return t
    d = np.diff(np.log(e + 1e-5)); return (a + (int(np.argmax(d)) + 1) * h) / SR

VOIX = charge_voix()

# ---- l'appel nom par nom : (nom, premier mot, dernier mot) ; 'grB'/'grC' = « le groupe B / C ! »
APPEL = [('coin', 27, 33), ('ec01', 34, 36), ('ec02', 37, 39), ('ec03', 40, 41), ('ec04', 42, 44), ('ec05', 45, 47),
         ('grB', 48, 50), ('ec06', 51, 52), ('ec07', 53, 55), ('ec08', 56, 58), ('ec09', 59, 61), ('ec10', 62, 65),
         ('grC', 66, 69), ('ec11', 70, 73), ('ec12', 74, 76), ('ec13', 77, 80), ('ec14', 81, 84), ('ec15', 85, 88)]
ANCIEN_DEBUT_APPEL, ANCIENNE_ATTENTION = 19.60, 48.00

# ---- signatures sonores des écuries (themes_ecuries.json)
_TH = json.load(open(os.path.join(HERE, 'themes_ecuries.json'), encoding='utf-8'))
THEMES, DUREE_MAX_SIG = _TH['ecuries'], float(_TH.get('duree_max_s', 99.0))
EXT = ('.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac')
def fichier_perso(n):
    d = os.path.join(HERE, 'themes_ecuries')
    if not os.path.isdir(d): return None
    for f in sorted(os.listdir(d)):
        if f.lower().endswith(EXT) and f.split('_')[0].lstrip('0') == str(n): return os.path.join(d, f)
    return None
def lire_audio(chemin):
    out = os.path.join(HERE, 'audio', '_tmp_theme.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', chemin, '-ar', str(SR), '-ac', '1', out], check=True)
    x, _ = sf.read(out, dtype='float64'); os.remove(out); return x
def couche(x, debut, duree, gain_db, cible_rms=0.24):
    seg = x[int(debut * SR):int((debut + duree) * SR)].copy()
    if len(seg) == 0: raise SystemExit('extrait vide (début au-delà de la fin du fichier)')
    f = min(len(seg) // 4, int(0.02 * SR)); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    e = np.sqrt(np.convolve(seg ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')); rms = np.sqrt(np.mean(seg[e > e.max() * 0.1] ** 2)) + 1e-9
    return seg * (cible_rms / rms) * 10 ** (gain_db / 20)                       # mise au niveau seulement : le son n'est pas retouché
SIGNATURES, SOURCES_THEMES, PUNCHS = {}, {}, {}
for n in range(1, 16):
    th = THEMES[str(n)]; couches = []
    perso = fichier_perso(n)
    if 'voix' in th:
        v = th['voix']; couches.append((v['decalage_s'], couche(lire_audio(os.path.join(HERE, v['fichier'])), v['debut_s'], v['duree_s'], v['gain_db'], 0.3)))
    if perso:
        p = th.get('perso', {}); couches.append((0.0, couche(lire_audio(perso), p.get('debut_s', 0.0), p.get('duree_s', 3.0), p.get('gain_db', 0))))
        SOURCES_THEMES[n] = os.path.basename(perso)
    else:
        for c in th['bbc']:
            seg = couche(lire_audio(os.path.join(HERE, 'sons_ecuries', c['son'] + '.wav')), c['debut_s'], c['duree_s'], c['gain_db'])
            if c.get('repete', 1) > 1: seg = np.tile(seg, int(c['repete']))      # disque rayé : le même tour de sillon rejoué n fois
            couches.append((c['decalage_s'], seg))
        SOURCES_THEMES[n] = 'BBC ' + ', '.join(c['son'] for c in th['bbc']) + (' + voix' if 'voix' in th else '')
    L = max(int(d * SR) + len(x) for d, x in couches); sig = np.zeros(L)
    for d, x in couches: sig[int(d * SR):int(d * SR) + len(x)] += x
    cap = th.get('duree_max_s', DUREE_MAX_SIG)                                   # rythme : une signature ne s'éternise pas
    if 'voix' in th: cap = max(cap, th['voix']['decalage_s'] + th['voix']['duree_s'])   # la réplique n'est jamais coupée
    if len(sig) > int(cap * SR):
        sig = sig[:int(cap * SR)]; f = int(0.08 * SR); sig[-f:] *= np.linspace(1, 0, f)
    SIGNATURES[n] = sig
    _e = np.sqrt(np.convolve(sig ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same'))
    _seuil = _e.max() * 0.6; PUNCHS[n] = round(float(np.argmax(_e >= _seuil) / SR), 3)   # 1er temps fort : l'image frappe dessus

# ---- passe 1 : étendue de chaque phrase dans l'enregistrement
TOUTES = [(n, a, b) for (n, a, b, _) in PHRASES if n in ('mesdames', 'salon', 'arene', 'stats', 'trone')] + APPEL + \
         [(n, a, b) for (n, a, b, _) in PHRASES if n not in ('mesdames', 'salon', 'arene', 'stats', 'trone')]
SPAN = {}
for k, (nom, i0, i1) in enumerate(TOUTES):
    s0 = creux(VOIX, MOTS[i0]['s'] - 0.07)
    s1 = creux(VOIX, MOTS[TOUTES[k + 1][1]]['s'] - 0.05) if k + 1 < len(TOUTES) else len(VOIX) / SR
    SPAN[nom] = (s0, s1)
# ---- passe 2 : temps film (avant l'appel : inchangé ; l'appel : séquentiel avec créneaux ; après : décalé)
FILM, THEME_T = {n: t for (n, _, _, t) in PHRASES}, {}
t = ANCIEN_DEBUT_APPEL
for nom, i0, i1 in APPEL:
    FILM[nom] = t; fin = t + SPAN[nom][1] - SPAN[nom][0]
    if nom.startswith('ec'):
        k = int(nom[2:]); THEME_T[k] = (round(fin + 0.08, 3), round(fin + 0.08 + len(SIGNATURES[k]) / SR, 3)); t = THEME_T[k][1] + 0.15
    else:
        t = fin + 0.25
APPEL_FIN = t
DECALAGE = (APPEL_FIN + 1.2) - ANCIENNE_ATTENTION
for (n, _, _, t0) in PHRASES:
    if n not in ('mesdames', 'salon', 'arene', 'stats', 'trone'): FILM[n] = round(t0 + DECALAGE, 3)
DUR = round(103.0 + DECALAGE, 3)
DUR = round(DUR * SR) / SR                           # nombre entier d'échantillons (sinon int(DUR*SR) peut perdre 1 échantillon)
S = lambda x: round(x + DECALAGE, 3)                                          # décale un instant écrit pour la v4 (après l'appel)

PLACEMENTS, T = [], {}
for k, (nom, i0, i1) in enumerate(TOUTES):
    s0, s1 = SPAN[nom]; t_film = FILM[nom]
    PLACEMENTS.append((nom, s0, s1, t_film))
    for j in range(i0, (TOUTES[k + 1][1] if k + 1 < len(TOUTES) else len(MOTS))):
        T[f'm{j:03d}'] = round(t_film + (attaque(VOIX, MOTS[j]['s']) - s0), 3)
    T[nom] = t_film; T[nom + '_fin'] = round(t_film + (s1 - s0), 3)
M_ = lambda j: T[f'm{j:03d}']
REP = {   # repères nommés (temps film) utilisés par la musique, le montage 3D et les secousses caméra
    'arene': M_(10), 'quinze': M_(11), 'dizaines': M_(14), 'cinq': M_(18), 'une': M_(21), 'trone': M_(26),
    'coin_rouge': M_(29), 'groupe_A': M_(33), 'groupe_B': M_(50), 'groupe_C': M_(69),
    'ecuries': [M_(j) for j in (34, 37, 40, 42, 45, 51, 53, 56, 59, 62, 70, 74, 77, 81, 86)],
    'attention': M_(90), 'gotham': M_(99), 'voiture': M_(105), 'nuit': M_(109), 'rit': M_(115),
    'formule': M_(119), 'box': [M_(j) for j in (121, 122, 123, 124)], 'attaque': M_(128),
    'brulees': M_(132), 'apocalypse': M_(137), 'temoins': M_(139),
    'caisses': M_(142), 'uniques': M_(150), 'chante': M_(158), 'noir': M_(161),
    'pieges': M_(163), 'trahisons': M_(165), 'paris': M_(168), 'telephone': M_(173), 'ancienne': M_(177),
    'vainqueur': M_(181), 'gloire': M_(183), 'eternelle': M_(184),
    'le': M_(185), 'grand': M_(186), 'prix': M_(187), 'de': M_(188), 'noel': M_(189), 'vingttrois': M_(190), 'decembre': M_(191),
    'preparez': M_(192), 'vrombir': M_(195), 'spectacle': M_(198), 'commence': M_(199), 'DUR': DUR,
    'themes': [list(THEME_T[k]) for k in range(1, 16)], 'punchs': [PUNCHS[k] for k in range(1, 16)], 'appel_fin': round(APPEL_FIN, 3),
}

# ------------------------------------------------------------------ 2. moteur de son : sound.py (instruments) + vrais bruitages
src = open(os.path.join(HERE, 'sound.py'), encoding='utf-8').read()
src = src.replace("T = json.load(open(os.path.join(HERE, 'timeline.json')))", "T = json.load(open(os.path.join(HERE, 'timeline_v5.json')))")
src = src.replace("if __name__ == '__main__':", "if False:")
json.dump({**{k: v for k, v in REP.items() if not isinstance(v, list)}, 'DUR': DUR}, open(os.path.join(HERE, 'timeline_v5.json'), 'w', encoding='utf-8'), indent=1)
M = types.ModuleType('sound_v5_moteur'); M.__file__ = os.path.join(HERE, 'sound.py')
exec(compile(src, 'sound.py (v5)', 'exec'), M.__dict__)
sys.path.insert(0, HERE)
import sound_reel                                    # noqa: E402  (banque BBC + calage)
sound_reel.brancher_sons_reels(M)
assert abs(M.N - DUR * SR) <= 1, (M.N, DUR * SR)

tt, Bus, env_curve = M.tt, M.Bus, M.env_curve
kick, snare, clap, hat, stomp, taiko, tom = M.kick, M.snare, M.clap, M.hat, M.stomp, M.taiko, M.tom
sub_boom, crash, bell, guitar, bass, pad, choir, celesta, brass = M.sub_boom, M.crash, M.bell, M.guitar, M.bass, M.pad, M.choir, M.celesta, M.brass
whoosh, riser, reverse_cymbal, sweep_noise, tape_stop = M.whoosh, M.riser, M.reverse_cymbal, M.sweep_noise, M.tape_stop
noise, pink, bp, lp, hp, exp_env, saw = M.noise, M.pink, M.bp, M.lp, M.hp, M.exp_env, M.saw

def silence_voix_bus():
    vo = Bus()
    for nom, s0, s1, t_film in PLACEMENTS:
        seg = VOIX[int(s0 * SR):int(s1 * SR)].copy()
        f = min(len(seg) // 4, int(0.012 * SR)); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        vo.add(seg, t_film, 1.0)
    return vo

def slam(music, fx, t0, note=55.0, fort=1.0, pan=0.0):
    """Coup de massue « catch » : souffle, boum grave, choc réel, cloche, cuivre, cymbale."""
    fx.add(whoosh(0.5, 250, 5500, 0.9), t0 - 0.38, 0.5 * fort)
    fx.add(sub_boom(1.2, 90, 40, 0.9), t0, 0.75 * fort)
    fx.add(M.crunch(0.6)[:int(0.5 * SR)], t0, 0.45 * fort, pan)
    fx.add(bell(1320, 1.4, 0.6), t0, 0.22 * fort, 0.2)
    music.add(brass(note * 4, 0.6, 1.0), t0, 0.38 * fort)
    fx.add(crash(1.4, 0.6), t0, 0.28 * fort)

def groove(music, t_debut, t_fin, beat=0.489, lourd=False):
    """Groove d'arène d'Intro Catch (mi mineur, kick-stomp-clap), version « lourde » pour l'appel des écuries."""
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
    """Nappe de foule réelle (catch) + applaudissements, dosées scène par scène, et rugissements sur les temps forts."""
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

# ------------------------------------------------------------------ 3. composition
def build():
    R = REP
    music, fx, crowd = Bus(), Bus(), Bus()
    vo = silence_voix_bus()
    foule(crowd, R)

    # === SALON (0 → arène) : drone, cœur, néon qui grésille, télé, petits moteurs, montée de toms
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

    # === ARÈNE : explosion, puis groove ; slams sur « quinze », « dizaines », « cinq »
    fx.add(sub_boom(2.6, 78, 27, 1.0), A, 1.0); fx.add(crash(3.8, 1.0), A, 0.85); fx.add(M.cannon(1.0), A, 0.6)
    fx.add(whoosh(1.2, 400, 6000, 1.0), A - 0.05, 0.4); fx.add(bell(880, 3.5, 1.0), A + 0.02, 0.55, 0.1)
    for k in range(4): fx.add(M.firework(0.5), A + 0.15 + k * 0.28, 0.5, -0.8 + 0.4 * k)
    music.add(guitar(82.41, 3.0, 1.0), A, 0.55); music.add(guitar(164.81, 3.0, 0.8), A, 0.4); music.add(brass(164.81, 1.6, 1.0), A, 0.35)
    groove(music, A + 0.45, R['une'] - 0.25)
    for key, f in (('quinze', 55.0), ('dizaines', 61.7), ('cinq', 73.4)): slam(music, fx, R[key], f)
    for j in range(5):                                       # les 5 voies : 5 passages réels de gauche à droite
        x, _ = M.engine_f1(1.25, 700 + 40 * j, 330 + 20 * j, 1.0, 0.48); M.add_pass(fx, x, R['cinq'] + 0.25 + j * 0.12, 0.3)

    # === « UNE SEULE PLACE… SUR LE TRÔNE » : arrêt de bande, cœur, couronne
    U = R['une']; fx.add(tape_stop(0.5, 1.0), U - 0.35, 0.55)
    music.add(sub_boom(2.2, 48, 36, 0.8), U, 0.5); music.add(pad(82.41, 2.4, 0.5, cutoff=420, attack=0.6, release=0.6), U, 0.5)
    for tm in np.arange(U + 0.1, R['trone'] - 0.2, 0.55): music.add(kick(0.5), tm, 0.7)
    music.add(riser(R['trone'] - U, 0.9, 400, 7000), U, 0.35)
    TR = R['trone']
    fx.add(sub_boom(2.8, 70, 26, 1.0), TR, 0.9); fx.add(bell(660, 4.0, 1.0), TR, 0.7); fx.add(bell(990, 3.0, 0.7), TR + 0.01, 0.4, 0.3)
    fx.add(crash(3.0, 0.8), TR, 0.4)
    for f, g, p in ((164.81, 0.55, -0.2), (246.94, 0.45, 0.2), (329.63, 0.35, 0.0)): music.add(choir(f, 3.2, 0.9, 0.12, 1.5), TR, g, p)

    # === L'APPEL DES 15 ÉCURIES : cloche de ring, groove lourd, un coup par écurie, gros coups sur les groupes
    for k in range(3): fx.add(bell(880, 2.2, 1.0), R['coin_rouge'] - 0.9 + k * 0.22, 0.55, -0.1 + 0.1 * k)   # ding-ding-ding
    groove(music, R['groupe_A'] - 0.2, R['appel_fin'] - 0.1, lourd=True)
    for key, f in (('groupe_A', 55.0), ('groupe_B', 61.7), ('groupe_C', 73.4)): slam(music, fx, R[key], f, 1.1)
    for k, t0 in enumerate(R['ecuries']):
        fx.add(whoosh(0.35, 400, 6500, 0.8), t0 - 0.28, 0.32, -0.7 + 0.1 * (k % 15))
        fx.add(sub_boom(0.6, 100, 50, 0.6), t0, 0.4); fx.add(crash(0.9, 0.5), t0, 0.16, 0.3 * ((-1) ** k))
        fx.add(M.crunch(0.4)[:int(0.25 * SR)], t0, 0.18)
    fin_ec = R['themes'][-1][1] - 0.55
    fx.add(sub_boom(2.6, 78, 27, 1.0), fin_ec + 0.55, 0.9); fx.add(crash(3.2, 1.0), fin_ec + 0.55, 0.7)
    for k in range(3): fx.add(M.firework(0.5), fin_ec + 0.6 + k * 0.3, 0.45, -0.6 + 0.6 * k)
    music.add(guitar(82.41, 2.6, 1.0, drive=12), fin_ec + 0.55, 0.5); music.add(brass(164.81, 1.8, 1.0), fin_ec + 0.55, 0.35)

    # === « MAIS ATTENTION… » : arrêt de bande, bourdon grave
    fx.add(tape_stop(0.5, 1.0), S(47.5), 0.5)
    music.add(pad(41.2, 3.4, 0.7, cutoff=300, attack=0.3, release=1.0), S(47.9), 0.6); music.add(sub_boom(3.0, 45, 30, 0.7), R['attention'], 0.6)

    # === GOTHAM : orgue, cloche, pluie, tonnerre, V8, ailes, rire dans l'écho
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

    # === FORMULE 1 : bips radio, « box box », départ des stands, passages en Doppler
    F1 = R['formule']
    for k, tb in enumerate(R['box']):                                              # bip de radio d'équipe avant chaque « box »
        bip = np.sin(2 * np.pi * 1250 * tt(0.07)) * np.minimum(1, (0.07 - tt(0.07)) / 0.01) * 0.5
        fx.add(bip, tb - 0.1, 0.25, 0.4)
    fx.add(bp(noise(4.0), 300, 3400) * 0.04, R['box'][0] - 0.3, 0.2, 0.4)          # souffle radio
    for k in range(4): fx.add(M.engine_vtec(0.6, 300, 800, 1.0), F1 - 0.6 + k * 0.5, 0.25, -0.5 + 0.3 * k)   # moteurs en chauffe
    music.add(riser(R['attaque'] - R['box'][0], 0.8, 300, 8000), R['box'][0], 0.35)
    groove(music, R['attaque'], S(65.5), beat=0.4)
    slam(music, fx, R['attaque'], 73.4, 1.0)
    for j in range(5):
        x, _ = M.engine_f1(1.25, 720 + 40 * j, 340 + 20 * j, 1.0, 0.48); M.add_pass(fx, x, R['attaque'] + 0.05 + j * 0.22, 0.42)
    fx.add(M.screech(0.55, 1.0), R['attaque'] + 1.2, 0.35, 0.3)

    # === APOCALYPSE : diesel, vent de sable, chaînes, guitares saturées, retours de flamme, explosion sur « témoins »
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

    # === LES CAISSES MYSTÈRE : boîte à musique japonisante, grelots ; « chante dans le noir » : voix lointaine (indice Miku)
    C0 = R['caisses']
    music.add(pad(220.0, 6.5, 0.4, cutoff=1600, attack=1.2, release=1.5), C0 - 0.8, 0.3)
    for k, f in enumerate([659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25, 880.0, 987.77, 880.0]):
        music.add(celesta(f, 0.9, 1.0), C0 - 0.4 + k * 0.42, 0.28, 0.3 * np.sin(k))
    for k in range(3): fx.add(M.crunch(0.5)[:int(0.18 * SR)], C0 - 0.05 + k * 0.6, 0.25, -0.4 + 0.4 * k)   # couvercles qui sautent
    fx.add(M.sleigh(0.8, 1.0), R['uniques'], 0.35); fx.add(sub_boom(1.2, 90, 45, 0.8), R['uniques'], 0.5); fx.add(bell(1760, 2.0, 0.5), R['uniques'], 0.2)
    # voix synthétique lointaine qui « chante » 5 notes (vibrato, formants), noyée dans la réverbération : un indice, pas une réponse
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

    # === LA GLOIRE ÉTERNELLE
    GL = R['gloire']
    for f, g, p in ((164.81, 0.5, -0.2), (246.94, 0.45, 0.2), (329.63, 0.4, 0.0), (415.3, 0.3, 0.1)): music.add(choir(f, 4.4, 1.0, 0.8, 1.6), GL - 0.6, g, p)
    fx.add(bell(660, 4.0, 1.0), R['eternelle'], 0.6); fx.add(bell(990, 3.2, 0.7), R['eternelle'] + 0.02, 0.35, 0.3)
    fx.add(sub_boom(2.8, 70, 26, 1.0), R['eternelle'], 0.7); fx.add(M.sleigh(1.0, 1.0), R['eternelle'] + 0.3, 0.3, 0.3)

    # === TITRE : silence, puis 5 impacts (Le / GRAND / PRIX / DE / NOËL)
    for key, a in (('grand', 1.0), ('prix', 0.8), ('de', 0.6), ('noel', 1.25)):
        t0 = R[key]; fx.add(sub_boom(2.0, 80, 28, 1.0), t0, 0.85 * a); fx.add(crash(2.5, 1.0), t0, 0.55 * a); fx.add(M.cannon(1.0), t0, 0.35 * a)
        music.add(guitar(82.41, 1.6, 1.0, drive=12), t0, 0.45 * a); music.add(brass(164.81, 1.0, 1.0), t0, 0.3 * a)
    for k in range(5): fx.add(M.firework(0.6), R['noel'] + 0.1 + k * 0.17, 0.45, -0.9 + 0.45 * k)
    for key in ('vingttrois', 'decembre'): slam(music, fx, R[key], 82.41, 0.8)

    # === FINAL : riff « Jingle Bells » métal, moteurs qui vrombissent, « COMMENCE ! », accord final, feux d'artifice
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
    # === signatures sonores des écuries (bus séparé, non compressé par la voix : elles ne la chevauchent jamais)
    themes = Bus()
    for k in range(1, 16): themes.add(SIGNATURES[k], R['themes'][k - 1][0], 1.0, 0.0)
    return music, fx, crowd, vo, themes

# ------------------------------------------------------------------ 4. mixage (même chaîne que sound.py.mixdown)
def mixdown():
    music, fx, crowd, vo, themes = build(); N = M.N
    ir_big, ir_vo = M.make_ir(2.6, 0.02, 3, 0.7), M.make_ir(1.5, 0.015, 9, 0.8)
    vl, vr = M.reverb(vo, ir_vo); fl, fr = M.reverb(fx, ir_big); ml, mr = M.reverb(music, ir_big)
    d = int(0.13 * SR); sl = np.zeros(N); sl[d:] = vo.L[:-d]; sr_ = np.zeros(N); sr_[int(d * 1.3):] = vo.R[:-int(d * 1.3)]
    VL = vo.L + 0.2 * vl + 0.14 * sl; VR = vo.R + 0.2 * vr + 0.14 * sr_
    env = signal.sosfilt(signal.butter(2, 6.0, 'lowpass', fs=SR, output='sos'), np.abs(vo.L))
    env = np.clip(env / (np.percentile(env, 99) + 1e-9), 0, 1)
    duck = signal.sosfilt(signal.butter(1, 12.0, 'lowpass', fs=SR, output='sos'), 1.0 - 0.58 * env)
    R = REP
    kill = env_curve([(0, 1), (R['eternelle'] + 1.6, 1), (R['le'] - 0.4, 0.0), (R['grand'] - 0.06, 0.0), (R['grand'], 1.0), (DUR, 1)])
    ML = ml * 0.55 + music.L; MR = mr * 0.55 + music.R; FL = fl * 0.6 + fx.L; FR = fr * 0.6 + fx.R
    pts = [(0, 1.0)]                                                                 # la musique et la foule s'effacent sous chaque signature
    for a, b in R['themes']: pts += [(a - 0.06, 1.0), (a + 0.05, 0.32), (b - 0.1, 0.32), (b + 0.15, 1.0)]
    creux_t = env_curve(pts + [(DUR, 1.0)])
    tl, tr = M.reverb(themes, ir_vo)
    L = VL + (ML * 0.85 + FL * 0.95) * duck * kill * creux_t + crowd.L * 0.55 * (0.55 + 0.45 * duck) * kill * (0.4 + 0.6 * creux_t) + (themes.L + 0.12 * tl) * 1.05
    Rr = VR + (MR * 0.85 + FR * 0.95) * duck * kill * creux_t + crowd.R * 0.55 * (0.55 + 0.45 * duck) * kill * (0.4 + 0.6 * creux_t) + (themes.R + 0.12 * tr) * 1.05
    fade = env_curve([(0, 0.0), (0.12, 1.0), (DUR - 1.6, 1.0), (DUR, 0.0)])
    return np.stack([L * fade, Rr * fade], axis=1)

def main():
    mix = mixdown()
    os.makedirs(os.path.join(HERE, 'audio'), exist_ok=True)
    raw = os.path.join(HERE, 'audio', 'mix_v5_raw.wav'); final = os.path.join(HERE, 'audio', 'mix_v5.wav')
    sf.write(raw, np.clip(mix / max(1.0, np.abs(mix).max()) * 0.9, -1, 1), SR, subtype='PCM_16')
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = [float(l.split()[1]) for l in out.splitlines() if l.strip().startswith('I:')][-1]
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', f'volume={-16.0 - I}dB,alimiter=limit=0.84:attack=2:release=60:level=disabled,aresample=192000,alimiter=limit=0.83:attack=1:release=40:level=disabled,aresample=48000',
                    '-ar', str(SR), '-c:a', 'pcm_s16le', final], check=True)
    os.remove(raw)
    json.dump({'prise': PRISE, 'duree_s': DUR, 'phrases': [{'phrase': n, 'source_s': [round(a, 3), round(b, 3)], 'film_s': [t, round(t + b - a, 3)]} for n, a, b, t in PLACEMENTS],
               'reperes': REP, 'mots_film_s': {MOTS[int(k[1:])]['w'] + f'#{k[1:]}': v for k, v in T.items() if k[0] == 'm' and k[1:].isdigit()},
               'bruitages_reels': len(sound_reel.JOURNAL), 'signatures_ecuries': SOURCES_THEMES, 'decalage_apres_appel_s': round(DECALAGE, 3), 'licence_bruitages': 'BBC Sound Effects — RemArc (usage personnel)'},
              open(os.path.join(HERE, 'audio', 'rapport_v5.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'mix_v5.wav : {DUR:.1f} s, prise {PRISE}, {len(sound_reel.JOURNAL)} bruitages réels')

if __name__ == '__main__':
    main()
