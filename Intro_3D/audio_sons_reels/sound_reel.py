#!/usr/bin/env python3
"""Grand Prix de Noël — intro catch : MÊME mix que sound.py, mais BRUITAGES RÉELS.

Principe (aucun fichier d'origine modifié) :
  * la voix off, la musique et la structure du mix restent EXACTEMENT celles de sound.py ;
  * chaque générateur de bruitage synthétique (moteurs, crissements, foule, tonnerre, explosions…) est remplacé
    par un vrai enregistrement de la BBC Sound Effects Library (sons_reels/*.wav, licence RemArc : usage personnel) ;
  * le générateur d'origine est TOUJOURS appelé d'abord : le générateur aléatoire semé de sound.py consomme
    exactement les mêmes tirages, donc la musique (caisse claire, charleston…) reste identique à l'échantillon près ;
  * le son réel est calé sur le synthétique qu'il remplace : même durée, même instant fort (passage, impact),
    même énergie, et (pour les moteurs) même enveloppe dynamique, donc même place dans le mix.

Usage : py -3 sound_reel.py            → audio/mix_reel.wav (48 kHz, -16 LUFS) + audio/rapport_sons_reels.json
Prérequis : numpy, scipy, soundfile ; ffmpeg dans le PATH ; audio/vo_take1.mp3 ; sons_reels/*.wav.
"""
import json, os, sys, types
from math import gcd
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
BANQUE = os.path.join(HERE, 'sons_reels')
MIX_SYNTH = float(os.environ.get('MIX_SYNTH', '0.0'))   # 0 = 100 % réel ; 0.2 = 20 % de synthé gardé en dessous

# ------------------------------------------------------------------ chargement de sound.py, avec 4 bruitages « en ligne » rendus remplaçables
SRC = open(os.path.join(HERE, 'sound.py'), encoding='utf-8').read()
EN_LIGNE = {   # expression synthétique exacte (doit apparaître une seule fois) → rôle réel
    "bp(noise(0.4), 2000, 12000) * exp_env(0.4, 0.15, 0.003)": 'statique_tv',
    "lp(noise(1.6), 2200) * exp_env(1.6, 0.5, 0.004)": 'explosion',
    "lp(noise(1.4), 1200) * exp_env(1.4, 0.5)": 'pluie',
    "bp(noise(0.12), 200, 1500) * exp_env(0.12, 0.04)": 'ailes',
}
for expr, role in EN_LIGNE.items():
    n = SRC.count(expr)
    if n != 1:
        raise SystemExit(f'sound.py a changé : « {expr} » trouvé {n} fois (attendu 1). Rien n\'est produit.')
    SRC = SRC.replace(expr, f"_REEL_EN_LIGNE({role!r}, lambda: {expr})")
SRC = SRC.replace("if __name__ == '__main__':", "if False:")
S = types.ModuleType('sound_patche'); S.__file__ = os.path.join(HERE, 'sound.py')
exec(compile(SRC, 'sound.py (patché)', 'exec'), S.__dict__)
SR = S.SR

# ------------------------------------------------------------------ banque de sons
_cache = {}
def charge(ident):
    if ident not in _cache:
        chemin = os.path.join(BANQUE, ident + '.wav')
        if not os.path.exists(chemin):
            raise SystemExit(f'Son réel manquant : {chemin} (lancer telecharger_sons_bbc.py)')
        x, sr = sf.read(chemin, always_2d=True, dtype='float64')
        m = x.mean(axis=1)
        if sr != SR:
            g = gcd(SR, sr); m = signal.resample_poly(m, SR // g, sr // g)
        m = signal.sosfilt(signal.butter(2, 25, 'highpass', fs=SR, output='sos'), m)   # coupe le ronflement sub des vieux masters
        _cache[ident] = m
    return _cache[ident]

def extrait(ident, t0, n):
    x = charge(ident); i = int(round(t0 * SR)); out = np.zeros(n)
    a, b = max(0, i), min(len(x), i + n)
    if b > a: out[a - i:b - i] = x[a:b]
    return out

def fondus(x, fi=0.004, fo=0.04):
    n = len(x); a = min(n, int(fi * SR)); b = min(n, int(fo * SR))
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[n - b:] *= np.linspace(1, 0, b)
    return x

def enveloppe(x, ms=25):
    k = max(1, int(SR * ms / 1000))
    return np.sqrt(np.convolve(x * x, np.ones(k) / k, mode='same') + 1e-12)

def rms_actif(x):
    e = enveloppe(x); seuil = e.max() * 10 ** (-40 / 20)
    a = x[e > seuil]
    return float(np.sqrt(np.mean(a * a))) if len(a) else 0.0

def crete_courte(x):
    return float(enveloppe(x, 50).max())

def instant_fort(x):
    return int(np.argmax(enveloppe(x, 30)))

def meilleur_decalage(ident, synth, lo, hi):
    """Cherche dans [lo, hi] s l'extrait réel dont l'enveloppe (log, 10 ms) ressemble le plus à celle du synthétique."""
    hop = SR // 100
    es = np.log(enveloppe(synth)[::hop] + 1e-6); es = (es - es.mean()) / (es.std() + 1e-9)
    x = charge(ident); hi = min(hi, len(x) / SR - len(synth) / SR)
    er = np.log(enveloppe(x)[::hop] + 1e-6)
    best, bt = -9, lo
    for j in range(int(lo * 100), int(max(lo, hi) * 100) + 1, 2):
        w = er[j:j + len(es)]
        if len(w) < len(es): break
        w = (w - w.mean()) / (w.std() + 1e-9)
        c = float(np.dot(w, es) / len(es))
        if c > best: best, bt = c, j / 100
    return bt, best

def suivi(reel, synth, force):
    """Impose (partiellement) la dynamique du synthétique au réel : coups de gaz et passages au bon instant."""
    if force <= 0: return reel
    g = (enveloppe(synth, 30) / (enveloppe(reel, 30) + 1e-9)) ** force
    g = np.clip(g / (np.median(g[enveloppe(synth, 30) > enveloppe(synth, 30).max() * 0.05]) + 1e-9), 0.25, 3.0)
    g = signal.sosfiltfilt(signal.butter(1, 18, 'lowpass', fs=SR, output='sos'), g)
    return reel * g

JOURNAL = []
def remplace(role, synth, reel, info, niveau='rms'):
    if niveau == 'crete':
        k = crete_courte(synth) / (crete_courte(reel) + 1e-12)
    else:
        k = rms_actif(synth) / (rms_actif(reel) + 1e-12)
    if 20 * np.log10(k + 1e-12) > 15:   # extrait réel trop faible : on n'amplifie pas un bruit de fond
        info = {**info, 'alerte': 'gain plafonné à +15 dB'}; k = 10 ** (15 / 20)
    out = reel * k
    JOURNAL.append({'role': role, 'duree_s': round(len(synth) / SR, 3), **info, 'gain_db': round(20 * np.log10(k + 1e-12), 1)})
    return out * (1 - MIX_SYNTH) + synth * MIX_SYNTH

# ------------------------------------------------------------------ catalogue : quel enregistrement pour quel bruitage
# mode 'motif'  : on cherche l'extrait dont l'enveloppe colle au synthétique (moteurs, ambiances), puis suivi dynamique ;
# mode 'impact' : on aligne le pic réel (liste de pics connus, tournante) sur le pic du synthétique (passages, chocs) ;
# mode 'nappe'  : nappe longue (foule, applaudissements), offsets tournants pour ne jamais répéter le même extrait.
CATALOGUE = {
    'toy_motor':     dict(mode='impact', pics=[('07036134', t) for t in (8.38, 10.44, 3.70, 6.68, 11.96, 2.74)]),
    'engine_vtec':   dict(mode='motif',  sons=[('07044058', 4.0, 20.0), ('07010017', 2.0, 16.0)], suivi=0.7),
    'engine_v8':     dict(mode='motif',  sons=[('07010036', 2.0, 60.0)], suivi=0.6),
    'engine_diesel': dict(mode='motif',  sons=[('07024141', 1.0, 58.0)], suivi=0.4),
    'engine_rev':    dict(mode='motif',  sons=[('07050095', 8.0, 16.0), ('07024142', 4.0, 12.0)], suivi=0.6),
    'chain_rattle':  dict(mode='motif',  sons=[('07037386', 10.0, 58.0)], suivi=0.3),
    'dust_wind':     dict(mode='motif',  sons=[('NHU05039063', 50.0, 75.0)], suivi=0.2),
    'sleigh':        dict(mode='impact', pics=[('07012094', t) for t in (0.9, 16.25, 27.25, 28.9, 45.1)]),
    'engine_f1':     dict(mode='impact', pics=[('07020021', 2.55), ('07020021', 5.95), ('07020022', 7.55), ('07020022', 9.70), ('07020022', 11.50),
                                               ('07020021', 8.55), ('07020022', 13.00), ('07020021', 10.55)]),
    'screech':       dict(mode='impact', pics=[('07022357', 2.20), ('07045249', 1.55)]),
    'blow_off':      dict(mode='impact', pics=[('NHU05078130', 2.85)]),
    'backfire':      dict(mode='impact', pics=[('07011171', 6.15), ('07011171', 13.85)]),
    'crunch':        dict(mode='impact', pics=[('07022366', 1.15), ('07022351', 1.85), ('07022366', 2.40)]),
    'thunder':       dict(mode='impact', pics=[('07005226', 1.30)]),
    'firework':      dict(mode='impact', pics=[('07019114', 1.40), ('07019114', 4.15), ('07019114', 5.60), ('07019114', 8.65), ('07019114', 11.15), ('07043155', 0.80)]),
    'cannon':        dict(mode='impact', pics=[('07019112', 0.70)]),
    'coin':          dict(mode='impact', pics=[('07042056', 1.55), ('07042056', 2.80)]),
    'crowd_noise':   dict(mode='nappe',  sons=[('07075033', [20.0, 140.0])], courts=[92.9, 230.8, 110.1, 76.2, 278.9, 93.4, 231.2]),  # nappes longues / rugissements (pics de la foule)
    'claps':         dict(mode='nappe',  sons=[('07050215', [0.5])], boucle=True),
}
EN_LIGNE_REEL = {
    'statique_tv': dict(mode='motif', sons=[('0010006', 1.0, 28.0)], suivi=0.8),
    'explosion':   dict(mode='impact', pics=[('07037327', 0.80)]),
    'pluie':       dict(mode='motif', sons=[('07038337', 20.0, 200.0)], suivi=0.6),
    'ailes':       dict(mode='impact', pics=[('07037498', t) for t in (2.88, 3.16, 3.58, 3.78, 4.02, 4.60)]),
}
_tour = {}

def joue(role, spec, synth):
    n = len(synth); k = _tour.get(role, 0); _tour[role] = k + 1
    if spec['mode'] == 'motif':
        ident, lo, hi = spec['sons'][k % len(spec['sons'])]
        t0, score = meilleur_decalage(ident, synth, lo, hi)
        reel = fondus(suivi(extrait(ident, t0, n), synth, spec['suivi']), 0.01, 0.06)
        return remplace(role, synth, reel, {'son': ident, 'debut_s': t0, 'ressemblance': round(score, 2)})
    if spec['mode'] == 'impact':
        ident, pic = spec['pics'][k % len(spec['pics'])]
        p = instant_fort(synth) / SR
        brut = extrait(ident, pic - p, n)
        # recalage fin : le pic réel tombe exactement sur l'instant fort du synthétique
        d = instant_fort(brut) / SR - p
        reel = fondus(extrait(ident, pic - p + d, n), 0.002, 0.05)
        return remplace(role, synth, reel, {'son': ident, 'pic_s': round(pic + d, 3), 'cale_sur_s': round(p, 3)}, niveau='crete')
    if spec['mode'] == 'nappe':
        ident, offs = spec['sons'][0]
        x = charge(ident)
        if spec.get('boucle') and len(x) < n + int(offs[0] * SR):   # applaudissements trop courts : boucle en fondu enchaîné de 1 s
            o = offs[0]; base = x[int(o * SR):]; L = len(base); xf = min(SR, L // 3)
            up, dn = np.linspace(0, 1, xf), np.linspace(1, 0, xf)
            acc = np.zeros(n + L); pos = 0
            while pos < n:
                seg = base.copy(); seg[-xf:] *= dn
                if pos: seg[:xf] *= up
                acc[pos:pos + L] += seg; pos += L - xf
            reel = acc[:n]
        else:
            if n < 8 * SR and spec.get('courts'):                     # rugissement : on part d'un vrai pic de foule
                o = spec['courts'][_tour.setdefault(role + '_court', 0) % len(spec['courts'])]; _tour[role + '_court'] += 1
            else:
                o = offs[k % len(offs)]
            o = min(o, max(0.0, len(x) / SR - n / SR))
            reel = extrait(ident, o, n)
        return remplace(role, synth, fondus(reel, 0.05, 0.3), {'son': ident, 'debut_s': round(o, 2)})
    raise ValueError(spec['mode'])

def enveloppe_fonction(nom):
    orig = getattr(S, nom); spec = CATALOGUE[nom]
    def f(*a, **kw):
        r = orig(*a, **kw)                      # consomme les tirages aléatoires comme l'original
        if isinstance(r, tuple):                # engine_f1 renvoie (signal, courbe Doppler)
            return (joue(nom, spec, r[0]),) + tuple(r[1:])
        return joue(nom, spec, r)
    return f

for nom in CATALOGUE:
    setattr(S, nom, enveloppe_fonction(nom))
S._REEL_EN_LIGNE = lambda role, gen: joue(role, EN_LIGNE_REEL[role], gen())

# ------------------------------------------------------------------ sortie
def main():
    mix = S.mixdown()
    raw = os.path.join(HERE, 'audio', 'mix_reel_raw.wav')
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    # même mastering que sound.py.finalize, vers un autre fichier (mix.wav d'origine jamais écrasé)
    import subprocess
    sf.write(raw, np.clip(mix / max(1.0, np.abs(mix).max()) * 0.9, -1, 1), SR, subtype='PCM_16')
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = [float(l.split()[1]) for l in out.splitlines() if l.strip().startswith('I:')][-1]
    final = os.path.join(HERE, 'audio', 'mix_reel.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', f'volume={-16.0 - I}dB,alimiter=limit=0.84:attack=2:release=60:level=disabled',
                    '-ar', str(SR), '-c:a', 'pcm_s16le', final], check=True)
    os.remove(raw)
    json.dump({'licence': 'BBC Sound Effects — RemArc Licence (usage personnel, éducatif, recherche). © BBC.',
               'source': 'https://sound-effects.bbcrewind.co.uk', 'mix_synth': MIX_SYNTH, 'remplacements': JOURNAL},
              open(os.path.join(HERE, 'audio', 'rapport_sons_reels.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(JOURNAL)} bruitages remplacés par des enregistrements réels → {final}')

if __name__ == '__main__':
    main()
