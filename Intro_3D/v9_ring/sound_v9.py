#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bande-son V9 « Grand Prix de Noël — Ring » : 120,5 s calées sur data/plan_v9.json et data/voix_v9.json.

Structure (tous les instants viennent du plan : segments, sous-parties, ecuries, telephone, lootbox, gloire, depart,
ouverture, reperes_son) :
  0 → 8,8 s     OUVERTURE : feu de cheminée « télé » (bande passante de haut-parleur de TV), souffle de pièce, horloge
                discrète ; 7,0 s étincelle (« tsk » + scintillement) ; 7,2 → 8,6 guirlandes (tics cristallins montants) ;
                8,8 CHOC DORÉ du logo (impact + shimmer) ; 11,6 ouverture du tapis (whoosh + grincement doux) ;
                14,0 plongée (whoosh montant) ; 15,5 arrivée dans l'arène (explosion de foule + pyro + boom).
  15,5 → 75 s   musique « ring » fournie par le client (audio/sources/ring_music.mp3) : section énergique repérée
                automatiquement (tempo et premier temps par flux spectral), bouclée sur un nombre entier de mesures,
                fondu d'entrée à 15,5 et de sortie vers 75 ; rumeur de foule continue. Pour chaque écurie : jet de
                flammes + moteur réel CC0 (sounds/moteurs_reels/NN) à la sortie du tunnel, whoosh au saut, impact amorti +
                crissement à l'atterrissage, dérapage jusqu'à « place », puis l'extrait réel de l'écurie
                (../audio_v5/themes_ecuries/NN_*.mp3, réglages de themes_ecuries.json) ; écurie 8 : audi_chime.mp3 à
                partir de 1,0 s (demande du client). Plus aucune voix « spéciale » (Mimine, Mario).
  75 → 84,5     TÉLÉPHONE : nappe tech + sons d'interface (pari, points, lootbox, bonus, piège).
  84,5 → 99,5   FAMILLES (temps interne + 84,5) : Gotham (pluie, tonnerre lointain, Batmobile, nappe sombre), F1 (5 bips
                des feux puis V6 hybride au ralenti), Tokyo (pluie, synthwave, turbos qui passent) ; coupes franches + zaps.
  99,5 → 106,5  LOOTBOX : descente + impact métallique, verrous, rideau qui s'enroule, nappe dorée.
  106,5 → 112,5 GLOIRE : silence relatif, fanfare orchestrale synthétisée, cloches, foule + confettis.
  112,5 → 120,5 DÉPART : 15 moteurs qui démarrent, passage en trombe, crescendo, impact + jingle sur le logo, résonance.
Voix off (prioritaire) : chaque pièce de voix_v9.json est recollée (morceaux, fondus 5 ms, `blanc` s entre eux), accélérée
sans changer la hauteur (ffmpeg atempo ≤ 1,25) si elle dépasse `duree_max`, puis posée à t_film. Ducking de tout le reste
(−9 dB de base, enveloppe lissée 80 ms, approfondi pièce par pièce si la voix ne passe pas ≥ +8 dB au-dessus du reste).

Réutilise par IMPORT la bande-son V8 (../v8_finale/sound_v8.py, non modifiée) et, à travers elle, la V7 : instruments,
bruitages procéduraux, réverbe, décodage ffmpeg, mise au niveau des extraits. Bruitages réels BBC (licence RemArc, usage
personnel) lus dans ../audio_v5/sons_reels/ s'ils ont été téléchargés (../audio_v5/telecharger_sons_bbc.py) ; sinon chaque
bruitage est synthétisé (jamais de silence là où un événement est prévu).

Sorties : audio/mix_v9.wav (48 kHz stéréo 16 bit, 120,5 s exactement, −16 LUFS intégrés BS.1770-4, vrai crête ≤ −1 dBTP)
et data/timeline_v9.json (chaque événement sonore horodaté + mesures de contrôle).
Les extraits sous droits (themes_ecuries, ring_music, audi_chime, banque BBC) sont LUS, jamais copiés ; audio/ est ignoré par git.
Dépendances : numpy, scipy, ffmpeg. Déterminisme : toutes les graines sont fixes.
"""
import argparse
import glob
import json
import math
import os
import subprocess
import sys
import time

import numpy as np
from scipy import signal

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE_DEPOT = os.path.abspath(os.path.join(ICI, '..', '..'))
DOSSIER_V8 = os.path.abspath(os.path.join(ICI, '..', 'v8_finale'))
DOSSIER_V5 = os.path.abspath(os.path.join(ICI, '..', 'audio_v5'))
DOSSIER_MOTEURS = os.path.join(RACINE_DEPOT, 'sounds', 'moteurs_reels')

# import de la V8 (et de la V7 qu'elle importe) sans rien écrire dans leurs dossiers : leurs main() restent sous __main__
sys.dont_write_bytecode = True
if DOSSIER_V8 not in sys.path:
    sys.path.insert(0, DOSSIER_V8)
import sound_v8 as v8  # noqa: E402

v7 = v8.v7

SR = 48000
CIBLE_LUFS = -16.0
PLAFOND_DBTP = -1.0            # vrai crête exigée ≤ −1 dBTP
PLAFOND_LIMITEUR_DBTP = -1.3   # le limiteur vise 0,3 dB sous le plafond (marge de quantification / reconstruction)
FONDU = 0.005                  # fondus de raccord des morceaux de voix (5 ms)
ATEMPO_MAX = 1.25              # accélération maximale de la voix (sans changer la hauteur)
DUCK_BASE_DB = -9.0            # ducking de base de tout le reste sous la voix
DUCK_MAX_DB = -14.0            # approfondissement maximal si la voix ne ressort pas assez
MARGE_VOIX_DB = 8.0            # écart RMS voix / reste visé pendant chaque pièce
LISSAGE_DUCK = 0.080           # enveloppe de ducking lissée sur 80 ms
GAIN_VOIX = 1.0

poser = v8.poser
filtre_bande = v8.filtre_bande
midi_hz = v8.midi_hz
phase_continue = v8.phase_continue
fenetre = v8.fenetre
temps = v8.temps
norme = v8.norme
montee = v8.montee
stereo = v8.stereo
pan_glisse = v8.pan_glisse
reverbe = v8.reverbe
sub_drop = v8.sub_drop
riser = v8.riser
cloche = v8.cloche


# ----------------------------------------------------------------------------------------------
# Outils
# ----------------------------------------------------------------------------------------------
def db(x):
    return 20.0 * math.log10(max(float(x), 1e-12))


def rms(x):
    return math.sqrt(float(np.mean(np.square(x)))) if x.size else 0.0


def rms_db_fenetre(buf, a, b, sr=SR):
    i, j = max(0, int(round(a * sr))), min(buf.shape[0], int(round(b * sr)))
    return db(rms(buf[i:j])) if j > i else -120.0


def fondus(x, a, b, sr=SR):
    """Fondus sin / cos (a, b en s) sur un signal mono ou stéréo, au moins 5 ms."""
    w = fenetre(x.shape[0], max(a, FONDU), max(b, FONDU), sr)
    return x * (w[:, None] if x.ndim == 2 else w)


def masque_intervalle(N, a, b, sr=SR, fondu=FONDU):
    """Masque rectangulaire [a, b[ avec des fondus de 5 ms : coupe franche sans clic."""
    m = np.zeros(N)
    i, j = int(round(a * sr)), int(round(b * sr))
    m[i:j] = 1.0
    nf = int(fondu * sr)
    m[i:i + nf] *= np.sin(0.5 * np.pi * np.arange(min(nf, j - i)) / nf)
    m[j - nf:j] *= np.cos(0.5 * np.pi * np.arange(nf) / nf)
    return m


def charger_bruitage_cc(eq, fichier, sr):
    """Enregistrement réel de sounds/moteurs_reels/NN (CC0 ou CC BY seulement). Retourne (mono, chemin relatif, crédit) ou None."""
    lic = os.path.join(DOSSIER_MOTEURS, '%02d' % eq, 'banque.json')
    ch = os.path.join(DOSSIER_MOTEURS, '%02d' % eq, fichier)
    try:
        with open(lic, encoding='utf-8') as f:
            meta = json.load(f)
        if meta.get('licence') not in ('CC0', 'CC BY') or not os.path.isfile(ch):
            return None
        x = v7.decoder_ffmpeg(ch, sr, canaux=1)[:, 0]
    except Exception:
        return None
    if x.shape[0] < int(0.2 * sr):
        return None
    return filtre_bande(x, sr, 40.0, None), 'sounds/moteurs_reels/%02d/%s' % (eq, fichier), meta.get('licence')


def charger_moteur_ecurie(eq, indice, sr):
    """Coup de gaz réel de l'écurie eq : banque.json['coups_de_gaz'][indice] ; banque sans coups de gaz (turbine, banc
    d'essai : fichiers par régime) → régime aux 2/3 de la plage. Retourne (mono, chemin relatif, licence) ou None."""
    try:
        with open(os.path.join(DOSSIER_MOTEURS, '%02d' % eq, 'banque.json'), encoding='utf-8') as f:
            meta = json.load(f)
    except (OSError, ValueError):
        return None
    gaz = meta.get('coups_de_gaz') or []
    if gaz:
        return charger_bruitage_cc(eq, gaz[indice % len(gaz)], sr)
    fic = [os.path.basename(c) for c in glob.glob(os.path.join(DOSSIER_MOTEURS, '%02d' % eq, '*.wav'))]

    def cle(nom):
        try:
            return float(os.path.splitext(nom)[0].replace('_', '.'))
        except ValueError:
            return 0.0
    fic.sort(key=cle)
    if not fic:
        return None
    return charger_bruitage_cc(eq, fic[min(len(fic) - 1, (2 * len(fic)) // 3 + indice % 2)], sr)


class BanqueBBC:
    """Bruitages réels de la BBC Sound Effects Library (../audio_v5/sons_reels/<id>.wav, RemArc : usage personnel).
    Instants forts repris du catalogue de ../audio_v5/sound_reel.py. Chaque accès renvoie None si le fichier manque."""

    def __init__(self, dossier, sr):
        self.dossier, self.sr, self.utilises = dossier, sr, {}
        self._cache = {}

    def dispo(self, ident):
        return os.path.isfile(os.path.join(self.dossier, ident + '.wav'))

    def _mono(self, ident):
        if ident not in self._cache:
            ch = os.path.join(self.dossier, ident + '.wav')
            self._cache[ident] = v7.decoder_ffmpeg(ch, self.sr, filtre='highpass=f=25', canaux=1)[:, 0]
        return self._cache[ident]

    def pic(self, ident, t_pic, avant, apres, usage):
        """Extrait [t_pic − avant, t_pic + apres] recalé sur le vrai maximum d'enveloppe (±0,25 s), crête normalisée à 1.
        Retourne (mono, décalage du pic dans l'extrait) ou None."""
        if not self.dispo(ident):
            return None
        try:
            x = self._mono(ident)
        except Exception:
            return None
        sr = self.sr
        i0, i1 = max(0, int((t_pic - 0.25) * sr)), min(x.shape[0], int((t_pic + 0.25) * sr))
        if i1 - i0 > int(0.05 * sr):
            env = v7.enveloppe_rms(x[i0:i1], sr, 0.02)
            t_pic = (i0 + int(np.argmax(env))) / sr
        a = max(0, int(round((t_pic - avant) * sr)))
        b = min(x.shape[0], int(round((t_pic + apres) * sr)))
        seg = x[a:b].copy()
        if seg.shape[0] < int(0.05 * sr) or np.max(np.abs(seg)) < 1e-5:
            return None
        self.utilises.setdefault(ident, []).append(usage)
        return fondus(norme(seg), 0.003, min(0.25, 0.3 * seg.shape[0] / sr)), t_pic - a / sr

    def nappe(self, ident, debut, duree, usage):
        """Nappe [debut, debut + duree] normalisée en RMS (−20 dBFS). None si le fichier manque ou est trop court."""
        if not self.dispo(ident):
            return None
        try:
            x = self._mono(ident)
        except Exception:
            return None
        a, n = int(debut * self.sr), int(duree * self.sr)
        if a + n > x.shape[0]:
            a = max(0, x.shape[0] - n)
        seg = x[a:a + n].copy()
        if seg.shape[0] < n or rms(seg) < 1e-6:
            return None
        self.utilises.setdefault(ident, []).append(usage)
        return seg * (10 ** (-20 / 20.0) / rms(seg))


# ----------------------------------------------------------------------------------------------
# Bruitages procéduraux nouveaux (les autres viennent de la V8 / V7)
# ----------------------------------------------------------------------------------------------
def bruit_filtre(rng, n, sr, f1, f2):
    return norme(filtre_bande(rng.standard_normal(n), sr, f1, f2))


def souffle_piece(sr, rng, duree):
    """Ton de pièce : souffle grave très doux, légèrement mouvant."""
    n = int(duree * sr)
    a, b = bruit_filtre(rng, n, sr, 60.0, 900.0), bruit_filtre(rng, n, sr, 60.0, 900.0)
    mod = filtre_bande(rng.standard_normal(n), sr, 0.1, 0.8, ordre=1)
    mod = 0.8 + 0.2 * mod / (np.max(np.abs(mod)) + 1e-9)
    return np.stack([a * mod, b * mod], axis=1) * fenetre(n, 0.6, 0.8, sr)[:, None]


def tic_horloge(sr, rng, aigu=True):
    """Tic (ou tac) d'horloge murale : clic de bois résonant, très court."""
    n = int(0.06 * sr)
    t = temps(n, sr)
    f = 2900.0 if aigu else 2300.0
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + 0.6 * np.sin(2 * np.pi * 1.0 * f * 0.43 * t) * np.exp(-t / 0.01)
         + 0.5 * filtre_bande(rng.standard_normal(n), sr, 1500.0, 8000.0) * np.exp(-t / 0.0015))
    return norme(x * montee(t, 0.0002) * fenetre(n, 0.0, 0.01, sr))


def etincelle(sr, rng):
    """Étincelle : petit « tsk » (bruit aigu très bref + crépitement) + scintillement (pings aigus aléatoires)."""
    n = int(0.9 * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    tsk = bruit_filtre(rng, n, sr, 3500.0, 14000.0) * np.exp(-t / 0.012) * montee(t, 0.0004)
    out += stereo(tsk, 0.0)
    for _ in range(18):
        d = float(rng.uniform(0.0, 0.08))
        nc = int(0.004 * sr)
        poser(out, bruit_filtre(rng, nc, sr, 2000.0, 12000.0) * fenetre(nc, 0.0005, 0.002, sr), d, sr,
              pan=float(rng.uniform(-0.5, 0.5)), gain=float(rng.uniform(0.2, 0.6)))
    for k in range(14):
        d = 0.03 + float(rng.exponential(0.12))
        if d > 0.75:
            continue
        f = float(rng.uniform(5200, 10500))
        npg = int(0.15 * sr)
        tp = temps(npg, sr)
        ping = np.sin(2 * np.pi * f * tp) * np.exp(-tp / 0.035) * montee(tp, 0.0005)
        poser(out, ping * fenetre(npg, 0.0, 0.03, sr), d, sr, pan=float(rng.uniform(-0.8, 0.8)), gain=0.25 * math.exp(-d / 0.4))
    return out * fenetre(n, 0.0, 0.15, sr)[:, None]


def tic_cristal(sr, rng, midi):
    """Petit « tic » cristallin de guirlande qui s'allume : cloche FM brève + clic de contact."""
    x = cloche(midi_hz(midi), 0.35, sr, 0.9)
    n = x.shape[0]
    t = temps(n, sr)
    x = x + 0.35 * filtre_bande(rng.standard_normal(n), sr, 4000.0, 14000.0) * np.exp(-t / 0.002)
    return norme(x * fenetre(n, 0.0, 0.08, sr))


def shimmer(sr, rng, duree, f_lo=2500.0, f_hi=9000.0, nb=26):
    """Nuage de partiels aigus scintillants (trémolos indépendants), stéréo large, décroissance lente."""
    n = int(duree * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    for _ in range(nb):
        f = float(rng.uniform(f_lo, f_hi))
        trem = 0.5 + 0.5 * np.sin(2 * np.pi * float(rng.uniform(4, 13)) * t + float(rng.uniform(0, 6.28)))
        x = np.sin(2 * np.pi * f * t + float(rng.uniform(0, 6.28))) * trem * np.exp(-t / float(rng.uniform(0.4, 1.0) * duree))
        out += stereo(x, float(rng.uniform(-0.9, 0.9)))
    return norme(out * (montee(t, 0.01) * fenetre(n, 0.0, 0.3 * duree, sr))[:, None])


def choc_dore(sr, rng):
    """Choc doré du logo : sub-boom + grosse caisse + cymbale + accord de cuivres majeur + shimmer, réverbe ample."""
    n = int(3.6 * sr)
    out = np.zeros((n, 2))
    poser(out, sub_drop(sr, 2.4, 120.0, 30.0, 0.7), 0.0, sr, gain=1.0)
    poser(out, v8.grosse_caisse(sr, rng, 42.0, 140.0, 0.3, 0.9, 0.35), 0.0, sr, gain=0.9)
    poser(out, stereo(v8.cymbale(sr, rng, 3.0, 1.1)), 0.0, sr, gain=0.35)
    poser(out, v8.cuivres([48, 55, 60, 64, 67, 72], 2.2, sr, 1.4, attaque=0.006), 0.0, sr, gain=0.40)
    poser(out, shimmer(sr, rng, 3.2), 0.02, sr, gain=0.30)
    for i, m in enumerate((84, 88, 91, 96)):
        poser(out, stereo(cloche(midi_hz(m), 1.6, sr, 0.8), -0.5 + 0.33 * i), 0.03 + 0.05 * i, sr, gain=0.18)
    return reverbe(out, sr, rt60=2.2, graine=21, humide=0.30)


def dechirure_tissu(sr, rng, duree=0.35):
    """Fente du tapis : frottement de fibres (bruit à grains) qui se déchire, très feutré."""
    n = int(duree * sr)
    t = temps(n, sr)
    gr = np.abs(filtre_bande(rng.standard_normal(n), sr, 40.0, 220.0))
    x = bruit_filtre(rng, n, sr, 600.0, 5000.0) * (0.3 + gr / (gr.max() + 1e-9))
    return norme(x * np.sin(np.pi * np.clip(t / duree, 0, 1)) ** 0.6 * fenetre(n, 0.01, 0.05, sr))


def whoosh_buf(sr, long, seed, sens=1, gain=1.0):
    """Whoosh V7 rendu dans un tampon autonome ; le pic est à 0,62 × long. Retourne (stéréo, instant du pic)."""
    buf = np.zeros((int(long * sr) + 2, 2))
    v7.whoosh(buf, 0.62 * long, sr, long=long, gain=gain, seed=seed, sens=sens)
    return buf, 0.62 * long


def pyro_crepitement(sr, rng, duree=2.4):
    """Pyrotechnie d'arène : jets (souffles) + pétards qui crépitent en cascade, stéréo large."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    for k in range(4):
        d = 0.05 * k
        nj = int(0.9 * sr)
        tj = temps(nj, sr)
        fh = lambda tt: 900.0 + 7000.0 * math.exp(-tt / 0.25)
        jet = norme(v7.filtre_variable(rng.standard_normal(nj), sr, fh)) * montee(tj, 0.008) * np.exp(-tj / 0.3)
        poser(out, jet * fenetre(nj, 0.0, 0.2, sr), d, sr, pan=-0.8 + 0.53 * k, gain=0.55)
    tc = 0.25
    while tc < duree - 0.1:
        nc = int(0.03 * sr)
        tt = temps(nc, sr)
        pop = filtre_bande(rng.standard_normal(nc), sr, 800.0, 9000.0) * np.exp(-tt / 0.004) * montee(tt, 0.0002)
        poser(out, norme(pop), tc, sr, pan=float(rng.uniform(-0.9, 0.9)), gain=float(rng.uniform(0.15, 0.5)) * math.exp(-(tc - 0.25) / 1.2))
        tc += float(rng.exponential(1.0 / 28.0))
    return out * fenetre(n, 0.0, 0.4, sr)[:, None]


def rumeur_foule(sr, rng, duree):
    """Rumeur de foule continue (pas de décrue) : formants vocaux sur bruit, modulations lentes, stéréo décorrélée."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    for k, (a, b) in enumerate(((250, 600), (500, 1100), (900, 1800), (1700, 3000))):
        for c in range(2):
            x = norme(filtre_bande(rng.standard_normal(n), sr, a, b))
            mod = filtre_bande(rng.standard_normal(n), sr, 0.15, 2.0, ordre=1)
            out[:, c] += x * (0.75 + 0.25 * mod / (np.max(np.abs(mod)) + 1e-9)) / (1 + 0.35 * k)
    return norme(out) * fenetre(n, 0.5, 0.5, sr)[:, None]


def jet_flammes(sr, rng, duree=0.8):
    """Jet de flammes de sortie de tunnel : souffle dont la brillance retombe + grondement + crépitement."""
    n = int(duree * sr)
    t = temps(n, sr)
    fh = lambda tt: 700.0 + 6500.0 * math.exp(-tt / 0.18)
    souffle = norme(v7.filtre_variable(rng.standard_normal(n), sr, fh)) * montee(t, 0.01) * np.exp(-t / 0.28)
    grond = bruit_filtre(rng, n, sr, 35.0, 220.0) * montee(t, 0.02) * np.exp(-t / 0.35)
    crep = np.zeros(n)
    for _ in range(10):
        i0 = int(float(rng.uniform(0.02, 0.5)) * sr)
        nc = int(0.008 * sr)
        crep[i0:i0 + nc] += filtre_bande(rng.standard_normal(nc), sr, 2000.0, 9000.0)[:n - i0] * float(rng.uniform(0.2, 0.6))
    x = (0.8 * souffle + 0.7 * grond + 0.3 * crep) * fenetre(n, 0.0, 0.2, sr)
    return np.stack([x, np.roll(x, int(0.0007 * sr))], axis=1)


def moteur_qui_monte(sr, rng, duree, f0=80.0, f1=260.0):
    """Repli de synthèse d'un moteur qui monte en régime (si l'enregistrement réel manque)."""
    return v8.moteur_synthese(sr, duree, f0, f1, rng)


def impact_amorti(sr, rng):
    """Atterrissage : coup sourd filtré (pneus + suspension) + petit rebond grave."""
    n = int(0.6 * sr)
    t = temps(n, sr)
    f = 38.0 + 70.0 * np.exp(-t / 0.03)
    x = np.sin(phase_continue(f, sr)) * montee(t, 0.002) * np.exp(-t / 0.13)
    x += 0.5 * filtre_bande(rng.standard_normal(n), sr, 80.0, 900.0) * np.exp(-t / 0.035) * montee(t, 0.001)
    reb = np.zeros(n)
    i0 = int(0.16 * sr)
    tr = temps(n - i0, sr)
    reb[i0:] = 0.3 * np.sin(2 * np.pi * 55.0 * tr) * np.exp(-tr / 0.06) * montee(tr, 0.004)
    return norme((x + reb) * fenetre(n, 0.0, 0.1, sr))


def crissement(sr, rng, duree, f0=1150.0):
    """Crissement de pneus : composante tonale vibrante (stick-slip) + bruit de frottement 1,5–4,5 kHz, modulation rugueuse."""
    n = int(duree * sr)
    t = temps(n, sr)
    jit = filtre_bande(rng.standard_normal(n), sr, 2.0, 18.0, ordre=1)
    jit = jit / (np.max(np.abs(jit)) + 1e-9)
    f = f0 * (1.0 + 0.06 * np.sin(2 * np.pi * 5.3 * t) + 0.05 * jit) * (1.0 - 0.12 * t / max(duree, 0.1))
    ph = phase_continue(f, sr)
    ton = np.sin(ph) + 0.45 * np.sin(2 * ph + 0.4) + 0.2 * np.sin(3 * ph + 1.1)
    nz = bruit_filtre(rng, n, sr, 1500.0, 4500.0)
    am = np.abs(filtre_bande(rng.standard_normal(n), sr, 8.0, 40.0))
    am = 0.55 + 0.45 * am / (am.max() + 1e-9)
    x = (0.6 * norme(ton) + 0.5 * nz) * am
    return norme(x * montee(t, 0.03) * fenetre(n, 0.02, min(0.35, 0.4 * duree), sr))


def clac_metal(sr, rng, f0=900.0):
    """Verrou métallique qui saute : clic sec + partiels inharmoniques courts + corps grave."""
    n = int(0.35 * sr)
    t = temps(n, sr)
    x = 0.9 * filtre_bande(rng.standard_normal(n), sr, 2000.0, 12000.0) * np.exp(-t / 0.0015)
    for j, r in enumerate((1.0, 2.31, 3.87, 5.12, 6.9)):
        x += np.sin(2 * np.pi * f0 * r * t + float(rng.uniform(0, 6.28))) * np.exp(-t / (0.06 / (1 + 0.5 * j))) / (1 + 0.4 * j)
    x += 0.8 * np.sin(2 * np.pi * 140.0 * t) * np.exp(-t / 0.03)
    return norme(x * montee(t, 0.0002) * fenetre(n, 0.0, 0.05, sr))


def impact_metal_lourd(sr, rng):
    """Caisse d'acier qui touche le sol : sub + partiels de plaque épaisse (graves, longs) + fracas + réverbe."""
    n = int(3.0 * sr)
    t = temps(n, sr)
    x = 1.0 * sub_drop(sr, 3.0, 90.0, 28.0, 0.6)
    for j, r in enumerate((1.0, 1.73, 2.76, 3.9, 5.4, 8.93, 11.34)):
        f = 118.0 * r
        x += 0.5 * np.sin(2 * np.pi * f * t + 0.5 * j) * np.exp(-t / (1.2 / (1 + 0.45 * j))) / (1 + 0.3 * j)
    x += 0.8 * bruit_filtre(rng, n, sr, 600.0, 8000.0) * np.exp(-t / 0.09)
    x = norme(x * montee(t, 0.0008) * fenetre(n, 0.0, 0.5, sr))
    return reverbe(x, sr, rt60=1.8, graine=31, humide=0.35)


def cliquetis(sr, rng, duree, cad0=22.0, cad1=12.0):
    """Cliquetis de rideau métallique qui s'enroule : clics de cliquet à cadence qui ralentit + grondement de moteur."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    tc = 0.0
    while tc < duree - 0.03:
        u = tc / duree
        cad = cad0 + (cad1 - cad0) * u
        nc = int(0.025 * sr)
        tt = temps(nc, sr)
        f = float(rng.uniform(2600, 3400))
        c = (filtre_bande(rng.standard_normal(nc), sr, 1800.0, 9000.0) * np.exp(-tt / 0.002)
             + 0.5 * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.006))
        poser(out, norme(c * montee(tt, 0.0002)), tc, sr, pan=0.2 * math.sin(tc * 3.0), gain=float(rng.uniform(0.5, 0.9)))
        tc += 1.0 / cad * float(rng.uniform(0.9, 1.1))
    t = temps(n, sr)
    mot = np.sin(phase_continue(95.0 + 10.0 * t / duree, sr)) + 0.3 * np.sin(phase_continue(190.0 + 20.0 * t / duree, sr))
    out += stereo(0.12 * mot * fenetre(n, 0.2, 0.3, sr))
    return out * fenetre(n, 0.01, 0.2, sr)[:, None]


def nappe_accords(sr, duree, midis, rng, brillance=0.5, attaque=0.8, relache=0.8, detune=0.004):
    """Nappe de scies désaccordées filtrées (cordes synthétiques), stéréo."""
    n = int(duree * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    fc = 900.0 + 3500.0 * brillance
    for m in midis:
        f = midi_hz(m)
        for det, pan in ((1.0 - detune, -0.6), (1.0, 0.0), (1.0 + detune, 0.6)):
            x = np.zeros(n)
            h = 1
            ph0 = float(rng.uniform(0, 6.28))
            while f * h < min(9000.0, 0.45 * sr) and h <= 24:
                x += np.sin(2 * np.pi * f * det * h * t + ph0 * h) / h / math.sqrt(1.0 + (f * h / fc) ** 4)
                h += 1
            out += stereo(x, pan)
    return norme(out * fenetre(n, attaque, relache, sr)[:, None])


def pluie(sr, rng, duree, densite=420.0, sombre=False):
    """Pluie : bruissement large bande modulé + gouttes (Poisson) sur des surfaces dures."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    hi = 5000.0 if sombre else 9000.0
    for c in range(2):
        x = bruit_filtre(rng, n, sr, 400.0, hi)
        mod = filtre_bande(rng.standard_normal(n), sr, 0.3, 3.0, ordre=1)
        out[:, c] = x * (0.8 + 0.2 * mod / (np.max(np.abs(mod)) + 1e-9)) * 0.6
    nb = int(densite * duree)
    ng = int(0.006 * sr)
    tg = temps(ng, sr)
    banque = [filtre_bande(rng.standard_normal(ng), sr, 1500.0, 7000.0) * np.exp(-tg / 0.0012) for _ in range(8)]
    pos = rng.uniform(0, duree - 0.01, nb)
    for k, p in enumerate(pos):
        i0 = int(p * sr)
        g = float(rng.uniform(0.05, 0.35))
        c = int(rng.integers(2))
        out[i0:i0 + ng, c] += banque[k % 8] * g
    return norme(out) * fenetre(n, 0.05, 0.05, sr)[:, None]


def tonnerre_lointain(sr, rng, duree=3.5):
    """Tonnerre lointain : grondement sourd qui roule (pas de claquement), attaque molle."""
    n = int(duree * sr)
    t = temps(n, sr)
    gr = bruit_filtre(rng, n, sr, 22.0, 260.0)
    roule = (0.6 + 0.4 * np.sin(2 * np.pi * 2.3 * t + float(rng.uniform(0, 6))) ** 2) * np.exp(-t / 1.1) * montee(t, 0.18)
    return norme(gr * roule * fenetre(n, 0.0, 0.6, sr))


def moteur_grave_batmobile(sr, rng, duree):
    """Moteur grave de Batmobile : V8 très bas (30–45 Hz d'allumage) avec jappements d'échappement + turbine lointaine."""
    n = int(duree * sr)
    t = temps(n, sr)
    f = 34.0 * (1.0 + 0.25 * np.sin(2 * np.pi * 0.35 * t) ** 2) * (1.0 + 0.01 * np.sin(2 * np.pi * 6.0 * t))
    ph = phase_continue(f, sr)
    x = np.zeros(n)
    for h in range(1, 16):
        x += np.sin(h * ph + 0.3 * h) / h ** 0.8
    x = np.tanh(1.8 * norme(x))
    x += 0.25 * bruit_filtre(rng, n, sr, 120.0, 900.0) * (0.5 + 0.5 * np.sin(ph * 0.5) ** 8)
    turb = 0.06 * np.sin(phase_continue(1600.0 + 300.0 * t / duree, sr))
    return norme(x + turb) * fenetre(n, 0.4, 0.3, sr)


def bip_feux(sr, f=880.0, duree=0.22):
    """Bip d'un feu rouge de départ F1 : sinus + harmoniques impaires douces."""
    n = int(duree * sr)
    t = temps(n, sr)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t) + 0.1 * np.sin(2 * np.pi * 5 * f * t)
    return norme(x * fenetre(n, 0.004, 0.03, sr))


def v6_hybride_ralenti(sr, rng, duree):
    """Rugissement de V6 turbo hybride F1 « au ralenti » (étiré, plus grave) : allumage 6 cylindres, sifflement turbo,
    gémissement MGU-K, très grande réverbe."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    f = 70.0 * (190.0 / 70.0) ** (u ** 0.7) * (1.0 + 0.006 * np.sin(2 * np.pi * 4.0 * t))
    ph = phase_continue(f, sr)
    x = np.zeros(n)
    for h in range(1, 22):
        x += np.sin(h * ph + 0.7 * h) / h ** 0.85 * (1.0 + 0.6 * (h == 3) + 0.4 * (h == 6))
    x = np.tanh(2.2 * norme(x))
    x += 0.2 * bruit_filtre(rng, n, sr, 400.0, 3000.0) * (0.6 + 0.4 * np.sin(ph * 3) ** 2)
    turbo = 0.12 * np.sin(phase_continue(1800.0 + 900.0 * u, sr)) * u
    ers = 0.08 * np.sin(phase_continue(700.0 + 1400.0 * u ** 1.3, sr))
    x = norme(x + turbo + ers) * montee(t, 0.08) * fenetre(n, 0.0, 0.05, sr)
    return reverbe(x, sr, rt60=2.6, graine=41, humide=0.45)[:n]


def synthwave(sr, rng, duree, kit, bpm=100.0):
    """Synthwave néon : grosse caisse sur les temps, caisse claire réverbérée sur 2 et 4, basse en croches, arpège carré,
    nappe de scies (la mineur → fa majeur → do → sol)."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    noire = 60.0 / bpm
    acc = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
    mesure = 4 * noire
    b = 0
    while b * mesure < duree:
        tb = b * mesure
        racine, notes = acc[b % 4]
        d = min(mesure, duree - tb)
        if d <= 0.05:
            break
        poser(out, nappe_accords(sr, d + 0.3, notes, rng, brillance=0.35, attaque=0.15, relache=0.3, detune=0.006), tb, sr, gain=0.35)
        for k in range(8):
            tk = tb + k * noire / 2
            if tk < duree - 0.05:
                poser(out, v8.basse(midi_hz(racine - 12 + (12 if k % 2 else 0)), noire / 2 * 0.9, sr, 900.0), tk, sr, gain=0.45)
        for k in range(16):
            tk = tb + k * noire / 4
            if tk < duree - 0.05:
                m = notes[k % 3] + 12 * (1 + (k // 8) % 2)
                poser(out, stereo(v7.note(midi_hz(m), noire / 4 * 0.9, 3, sr, 0.4), 0.4 if k % 2 else -0.4), tk, sr, gain=0.12)
        for k in range(4):
            tk = tb + k * noire
            if tk < duree - 0.05:
                poser(out, kit['k'], tk, sr, gain=0.6)
                if k % 2 == 1:
                    poser(out, reverbe(kit['s'], sr, rt60=1.4, graine=51, humide=0.5), tk, sr, gain=0.35)
        b += 1
    return out


def bourdonnement_neon(sr, rng, duree):
    """Enseignes néon : ronflement 100 Hz + harmoniques, petits grésillements aléatoires."""
    n = int(duree * sr)
    t = temps(n, sr)
    x = sum(np.sin(2 * np.pi * 100.0 * h * t) / h ** 1.5 for h in range(1, 12))
    gr = np.zeros(n)
    for _ in range(int(3 * duree)):
        i0 = int(float(rng.uniform(0, duree - 0.1)) * sr)
        ng = int(float(rng.uniform(0.02, 0.08)) * sr)
        gr[i0:i0 + ng] += filtre_bande(rng.standard_normal(ng), sr, 2000.0, 9000.0)
    return norme(norme(x) + 0.3 * gr) * fenetre(n, 0.1, 0.1, sr)


def passage_turbo(sr, rng, duree=1.8, f_base=150.0):
    """Moteur turbo qui passe (Doppler : la hauteur chute au passage, amplitude ∝ proximité) + sifflement turbo + soupape."""
    n = int(duree * sr)
    t = temps(n, sr)
    tc = 0.55 * duree
    v, dmin = 40.0, 3.0
    x_pos = v * (t - tc)
    r = np.sqrt(x_pos ** 2 + dmin ** 2)
    vr = v * x_pos / r
    dop = 343.0 / (343.0 + vr)
    f = f_base * dop * (1.0 + 0.004 * np.sin(2 * np.pi * 7.0 * t))
    ph = phase_continue(f, sr)
    x = np.zeros(n)
    for h in range(1, 18):
        x += np.sin(h * ph) / h ** 0.9 * (f * h < 0.45 * sr)
    x = np.tanh(1.5 * norme(x)) + 0.1 * np.sin(phase_continue(2600.0 * dop, sr))
    amp = (dmin / r) ** 1.3
    x = x * amp
    pan = np.tanh(x_pos / 6.0)
    sig = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], axis=1)
    # soupape de décharge juste après le passage
    nb = int(0.45 * sr)
    tb = temps(nb, sr)
    bov = bruit_filtre(rng, nb, sr, 1800.0, 9000.0) * np.exp(-tb / 0.12) * montee(tb, 0.004)
    poser(sig, bov, tc + 0.12, sr, pan=0.5, gain=0.25)
    return sig * fenetre(n, 0.1, 0.15, sr)[:, None]


def zap(sr, rng):
    """« Zap » de transition : balayage descendant numérique + éclat de bruit."""
    n = int(0.14 * sr)
    t = temps(n, sr)
    f = 2600.0 * (140.0 / 2600.0) ** np.clip(t / 0.1, 0, 1)
    ph = phase_continue(f, sr)
    x = np.sign(np.sin(ph)) * 0.4 + np.sin(ph)
    x += 0.8 * filtre_bande(rng.standard_normal(n), sr, 1500.0, 12000.0) * np.exp(-t / 0.012)
    return norme(x * montee(t, 0.0005) * fenetre(n, 0.0, 0.03, sr))


def tap_ecran(sr, rng):
    """Tap sur l'écran du téléphone : clic doux et feutré."""
    n = int(0.05 * sr)
    t = temps(n, sr)
    x = np.sin(2 * np.pi * 1800.0 * t) * np.exp(-t / 0.004) + 0.5 * filtre_bande(rng.standard_normal(n), sr, 1000.0, 6000.0) * np.exp(-t / 0.002)
    return norme(x * montee(t, 0.0002) * fenetre(n, 0.0, 0.01, sr))


def compteur_pieces(sr, rng, duree=1.0, nb=22):
    """Compteur de points : tics de pièces qui accélèrent et montent + « ding » final."""
    n = int((duree + 0.8) * sr)
    out = np.zeros((n, 2))
    for k in range(nb):
        u = k / (nb - 1)
        d = duree * (1.0 - (1.0 - u) ** 1.6)
        nc = int(0.05 * sr)
        tc = temps(nc, sr)
        f = 2200.0 * 2.0 ** (u * 0.9)
        c = np.sin(2 * np.pi * f * tc) * np.exp(-tc / 0.012) + 0.4 * np.sin(2 * np.pi * 1.59 * f * tc) * np.exp(-tc / 0.008)
        poser(out, norme(c * montee(tc, 0.0003) * fenetre(nc, 0.0, 0.01, sr)), d, sr, pan=0.3 * math.sin(k), gain=0.35 + 0.2 * u)
    poser(out, stereo(cloche(midi_hz(96), 0.7, sr, 0.6)), duree + 0.02, sr, gain=0.6)
    poser(out, stereo(cloche(midi_hz(103), 0.7, sr, 0.6)), duree + 0.09, sr, gain=0.45)
    return out


def roulette(sr, rng, duree=1.0):
    """Roulette de lootbox : clics qui ralentissent (cliquet de roue) + carillon de récompense."""
    n = int((duree + 0.9) * sr)
    out = np.zeros((n, 2))
    tc, k = 0.0, 0
    while tc < duree:
        u = tc / duree
        nc = int(0.03 * sr)
        tt = temps(nc, sr)
        c = filtre_bande(rng.standard_normal(nc), sr, 1500.0, 7000.0) * np.exp(-tt / 0.003) + 0.4 * np.sin(2 * np.pi * 1300.0 * tt) * np.exp(-tt / 0.008)
        poser(out, norme(c * montee(tt, 0.0002)), tc, sr, pan=-0.3 + 0.6 * (k % 2), gain=0.5)
        tc += 0.03 + 0.17 * u ** 2
        k += 1
    for i, m in enumerate((84, 88, 91)):
        poser(out, stereo(cloche(midi_hz(m), 0.6, sr, 0.7)), duree + 0.05 + 0.06 * i, sr, gain=0.45)
    return out


def jingle_dore(sr, rng):
    """Jingle doré : arpège de cloches majeur montant + shimmer + petit accord de cuivres."""
    n = int(1.8 * sr)
    out = np.zeros((n, 2))
    for i, m in enumerate((72, 76, 79, 84, 88, 91, 96)):
        poser(out, stereo(cloche(midi_hz(m), 0.9, sr, 0.8), -0.6 + 0.2 * i), 0.055 * i, sr, gain=0.5)
    poser(out, shimmer(sr, rng, 1.5, 4000.0, 10000.0, 18), 0.25, sr, gain=0.3)
    poser(out, v8.cuivres([60, 64, 67, 72], 0.8, sr, 1.0), 0.38, sr, gain=0.35)
    return out


def swoosh_rouge(sr, rng):
    """Swoosh rouge menaçant : whoosh descendant + cluster grave dissonant saturé + sub-drop."""
    n = int(1.8 * sr)
    out = np.zeros((n, 2))
    w, pic = whoosh_buf(sr, 0.9, 92001, sens=-1)
    poser(out, w, 0.0, sr, gain=0.9)
    cl = v8.cuivres([34, 35, 41, 46], 1.2, sr, 1.0, attaque=0.02)
    cl = np.tanh(2.5 * cl) / math.tanh(2.5)
    poser(out, cl, pic - 0.05, sr, gain=0.45)
    poser(out, sub_drop(sr, 1.2, 80.0, 30.0, 0.4), pic, sr, gain=0.8)
    return out


def nappe_tech(sr, rng, duree):
    """Petite nappe tech de l'interface téléphone : accord la-mineur-9 aigu doux + bips d'arpège filtrés + sub doux."""
    n = int(duree * sr)
    out = nappe_accords(sr, duree, [69, 72, 76, 79, 83], rng, brillance=0.2, attaque=0.6, relache=0.2) * 0.6
    pas = 60.0 / 120.0 / 4
    k = 0
    while k * pas < duree - 0.1:
        m = (81, 88, 84, 91)[k % 4]
        poser(out, stereo(v7.note(midi_hz(m), 0.09, 3, sr, 0.3), 0.5 if k % 2 else -0.5), k * pas, sr, gain=0.08)
        k += 1
    t = temps(n, sr)
    out += stereo(0.15 * np.sin(2 * np.pi * 55.0 * t) * fenetre(n, 0.5, 0.2, sr))
    return out


def fanfare(sr, rng, kit):
    """Fanfare orchestrale synthétisée majestueuse : roulement de timbales, appel de cuivres sol-do-mi-sol puis accord plein
    de do majeur (cuivres + cordes), cymbale, tout en grande réverbe."""
    D = 5.0
    n = int(D * sr)
    out = np.zeros((n, 2))
    for i in range(14):                                   # roulement de timbales vers l'accord
        poser(out, v8.tom(sr, 72.0, 0.4), 0.025 * i, sr, gain=0.15 + 0.03 * i, pan=-0.2)
    appel = [(0.0, [67], 0.2), (0.18, [72], 0.2), (0.36, [76], 0.2)]
    for d, ms, du in appel:
        poser(out, v8.cuivres(ms + [m - 12 for m in ms], du + 0.1, sr, 1.0), 0.35 + d, sr, gain=0.4)
    t_acc = 0.95
    poser(out, v8.cuivres([48, 55, 60, 64, 67, 72, 76, 79], 3.6, sr, 1.6, attaque=0.02), t_acc, sr, gain=0.6)
    poser(out, nappe_accords(sr, 3.9, [48, 60, 64, 67, 72, 76], rng, brillance=0.55, attaque=0.25, relache=1.2), t_acc, sr, gain=0.5)
    poser(out, v8.tom(sr, 65.0, 0.9), t_acc, sr, gain=0.9)
    poser(out, kit['kb'], t_acc, sr, gain=0.8)
    poser(out, stereo(v8.cymbale(sr, rng, 3.0, 1.2)), t_acc, sr, gain=0.35)
    return reverbe(out, sr, rt60=2.4, graine=61, humide=0.35)[:n + int(2.0 * sr)]


def carillon_noel(sr, rng, duree=3.0):
    """Cloches de Noël : volée de cloches (FM) do-mi-sol-do en carillon + grelots."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    motif = (84, 79, 76, 72, 84, 88, 91, 96)
    for k in range(int(duree / 0.18)):
        d = 0.18 * k
        m = motif[k % len(motif)]
        poser(out, stereo(cloche(midi_hz(m), 1.4, sr, 0.6), -0.7 + 1.4 * ((k * 0.37) % 1.0)), d, sr, gain=0.35 * math.exp(-d / 2.5))
    for k in range(int(duree / 0.24)):
        poser(out, stereo(v8.grelots(sr, rng), 0.4), 0.12 + 0.24 * k, sr, gain=0.18)
    return out * fenetre(n, 0.0, 0.6, sr)[:, None]


def confettis(sr, rng):
    """Canons à confettis (4 pops) + pluie de papier (froissements à grains)."""
    n = int(2.6 * sr)
    out = np.zeros((n, 2))
    for k, (d, pan) in enumerate(((0.0, -0.7), (0.06, 0.7), (0.14, -0.3), (0.2, 0.35))):
        nc = int(0.25 * sr)
        tc = temps(nc, sr)
        pop = (filtre_bande(rng.standard_normal(nc), sr, 300.0, 6000.0) * np.exp(-tc / 0.01) + 0.8 * np.sin(2 * np.pi * 85.0 * tc) * np.exp(-tc / 0.04))
        poser(out, norme(pop * montee(tc, 0.0003) * fenetre(nc, 0.0, 0.05, sr)), d, sr, pan=pan, gain=0.8)
    npap = int(2.3 * sr)
    tp = temps(npap, sr)
    gr = np.abs(filtre_bande(rng.standard_normal(npap), sr, 20.0, 120.0))
    pap = bruit_filtre(rng, npap, sr, 2500.0, 10000.0) * (gr / (gr.max() + 1e-9)) ** 1.5
    pap2 = bruit_filtre(rng, npap, sr, 2500.0, 10000.0) * (gr[::-1] / (gr.max() + 1e-9)) ** 1.5
    env = montee(tp, 0.1) * np.exp(-tp / 1.0) * fenetre(npap, 0.0, 0.5, sr)
    poser(out, np.stack([pap * env, pap2 * env], axis=1), 0.15, sr, gain=0.35)
    return out


def demarreur(sr, rng, duree=0.45):
    """Démarreur électrique : « rrr-rrr » (impulsions de compression ~14 Hz) avant que le moteur prenne."""
    n = int(duree * sr)
    t = temps(n, sr)
    puls = np.maximum(0.0, np.sin(2 * np.pi * 14.0 * t)) ** 3
    x = bruit_filtre(rng, n, sr, 150.0, 1500.0) * (0.3 + 0.7 * puls) + 0.4 * np.sin(2 * np.pi * 230.0 * t) * puls
    return norme(x * fenetre(n, 0.02, 0.03, sr))


def twang_cordes(sr, rng):
    """Cordes du ring qui claquent : vibration grave amortie (corde tendue) + frottement."""
    n = int(0.9 * sr)
    t = temps(n, sr)
    f = 62.0 * (1 + 0.15 * np.exp(-t / 0.05))
    x = (np.sin(phase_continue(f, sr)) + 0.4 * np.sin(2.01 * phase_continue(f, sr))) * np.exp(-t / 0.25)
    x += 0.4 * filtre_bande(rng.standard_normal(n), sr, 300.0, 3000.0) * np.exp(-t / 0.015)
    return norme(x * montee(t, 0.001) * fenetre(n, 0.0, 0.2, sr))


# ----------------------------------------------------------------------------------------------
# Musique « ring » du client : section énergique, tempo, premier temps, boucle propre
# ----------------------------------------------------------------------------------------------
FENETRE_RING = (153.0, 186.5)      # section la plus énergique et la plus régulière (mesuré : RMS ≈ −16 à −18 dBFS / 2 s)


def analyser_ring(x, sr, t_fen0):
    """x : extrait stéréo commençant à t_fen0 s dans le fichier. Retourne (période de mesure s, premier temps fort absolu s)."""
    m = x.mean(axis=1)
    nfft, hop = 2048, 256
    win = np.hanning(nfft)
    nfr = (m.shape[0] - nfft) // hop
    idx = np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]
    S = np.abs(np.fft.rfft(m[idx] * win, axis=1))
    L = np.log1p(10.0 * S)
    flux = np.maximum(np.diff(L, axis=0), 0.0)
    f = np.fft.rfftfreq(nfft, 1.0 / sr)
    flux_tout = flux.sum(axis=1)
    flux_grave = flux[:, f < 160.0].sum(axis=1)
    fps = sr / hop
    a0 = int((FENETRE_RING[0] - t_fen0) * fps)
    a1 = int((FENETRE_RING[1] - t_fen0) * fps)
    s = flux_tout[a0:a1] - flux_tout[a0:a1].mean()
    ac = np.correlate(s, s, 'full')[len(s) - 1:]
    ac /= ac[0]
    lags = np.arange(len(ac)) / fps

    def pic_pres(cible, tol):
        msk = (lags > cible - tol) & (lags < cible + tol)
        ii = np.where(msk)[0]
        j = ii[np.argmax(ac[ii])]
        if 0 < j < len(ac) - 1:                            # interpolation parabolique
            y0, y1, y2 = ac[j - 1], ac[j], ac[j + 1]
            dj = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-12)
        else:
            dj = 0.0
        return (j + dj) / fps

    P0 = pic_pres(2.67, 0.3)                              # mesure (4 temps) attendue ≈ 2,67 s (≈ 90 BPM)
    mults = np.arange(1, 7)
    lagm = np.array([pic_pres(k * P0, 0.06) for k in mults])
    P = float(np.sum(mults * lagm) / np.sum(mults ** 2))  # moindres carrés sur 6 multiples : période fine
    # premier temps : décalage qui maximise la somme du flux GRAVE (grosse caisse) aux instants o + j·P
    g = flux_grave[a0:a1]
    tg = np.arange(g.shape[0]) / fps
    best, o_best = -1.0, 0.0
    for o in np.arange(0.0, P, 1.0 / fps):
        pts = o + P * np.arange(int((tg[-1] - o) / P))
        sc = float(np.sum(np.interp(pts, tg, g)) + 0.5 * np.sum(np.interp(pts + P / 2, tg, g)))
        if sc > best:
            best, o_best = sc, o
    t_premier = FENETRE_RING[0] + o_best
    return P, t_premier


def musique_ring(sr, chemin, t_debut, t_fin_fondu, d_fondu_sortie):
    """Boucle de la musique ring : la section [S, S + K mesures] (K multiple de 4) se répète, raccord en fondu enchaîné à
    puissance égale de 40 ms CENTRÉ sur le premier temps (le raccord tombe sur un temps fort). Retourne (stéréo commençant à
    t_debut, infos)."""
    t_fen0 = FENETRE_RING[0] - 3.0
    x = v7.decoder_ffmpeg(chemin, sr, t_fen0, FENETRE_RING[1] - t_fen0 + 3.0)
    P, t1 = analyser_ring(x, sr, t_fen0)
    K = int((FENETRE_RING[1] - t1) / P) // 4 * 4
    S, Lp = t1, K * P
    xf = 0.040
    besoin = t_fin_fondu - t_debut + 0.1
    n_out = int(besoin * sr)
    out = np.zeros((n_out, 2))
    nxf = int(xf * sr)
    up = np.sin(0.5 * np.pi * np.arange(nxf) / nxf)[:, None]
    dn = np.cos(0.5 * np.pi * np.arange(nxf) / nxf)[:, None]
    # chaque copie : [S − xf/2, S + Lp + xf/2], posée de façon que S tombe à t_debut + k·Lp
    i_S = int(round((S - t_fen0) * sr))
    n_lp = int(round(Lp * sr))
    h = nxf // 2
    copie = x[i_S - h:i_S + n_lp + h].copy()
    copie[:nxf] *= up
    copie[-nxf:] *= dn
    k = 0
    raccords = []
    while k * n_lp - h < n_out:
        i0 = k * n_lp - h
        a, b = max(0, -i0), min(copie.shape[0], n_out - i0)
        if b > a:
            out[i0 + a:i0 + b] += copie[a:b]
        if k > 0:
            raccords.append(round(t_debut + k * Lp, 3))
        k += 1
    # la toute première copie commence par un fondu de 40 ms qui démarre AVANT t_debut : on le remplace par le fondu
    # d'entrée demandé (0,30 s depuis t_debut), le boom de l'arène couvre l'attaque
    out[:h * 2] = x[i_S:i_S + 2 * h]
    tt = np.arange(n_out) / sr
    env = np.clip(tt / 0.30, 0, 1)
    env = np.sin(0.5 * np.pi * env)
    t_fo0 = t_fin_fondu - d_fondu_sortie - t_debut
    env *= np.cos(0.5 * np.pi * np.clip((tt - t_fo0) / d_fondu_sortie, 0, 1))
    out *= env[:, None]
    actif = out[int(1.0 * sr):int((t_fo0 - 0.5) * sr)]
    out *= 10 ** (-18.0 / 20.0) / (rms(actif) + 1e-9)    # niveau de référence : −18 dBFS RMS avant le gain de bus
    infos = {'source': 'audio/sources/ring_music.mp3', 'periode_mesure_s': round(float(P), 4), 'bpm': round(240.0 / float(P), 2),
             'premier_temps_s': round(float(t1), 3), 'boucle_s': [round(float(S), 3), round(float(S + Lp), 3)], 'mesures_par_boucle': int(K),
             'raccords_film_s': raccords, 'fondu_entree': [t_debut, round(t_debut + 0.3, 3)],
             'fondu_sortie': [round(t_fin_fondu - d_fondu_sortie, 3), round(t_fin_fondu, 3)]}
    return out, infos


# ----------------------------------------------------------------------------------------------
# Voix off V9
# ----------------------------------------------------------------------------------------------
def atempo_ffmpeg(x, sr, facteur):
    """Accélère sans changer la hauteur (ffmpeg atempo, WSOLA). x mono float."""
    cmd = ['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
           '-af', 'atempo=%.6f' % facteur, '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-']
    r = subprocess.run(cmd, input=x.astype('<f4').tobytes(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError('atempo : ' + r.stderr.decode('utf-8', 'replace')[:300])
    return np.frombuffer(r.stdout, dtype='<f4').astype(float)


def voix_off_v9(sr, N, pieces, duree):
    """Recolle les morceaux de chaque pièce (fondus 5 ms, `blanc` s entre eux), atempo si > duree_max (≤ 1,25), pose à t_film.
    Retourne (piste mono, intervalles, rapport)."""
    cache = {}
    piste = np.zeros(N)
    nf = int(FONDU * sr)
    intervalles, rapport = [], []
    for p in pieces:
        parts = []
        blanc = float(p.get('blanc', 0.0))
        for k, (fic, a, b) in enumerate(p['morceaux']):
            ch = os.path.join(ICI, fic)
            if ch not in cache:
                cache[ch] = v7.decoder_ffmpeg(ch, sr, filtre=v8.FILTRE_VOIX_V8, canaux=1)[:, 0]
            x = cache[ch]
            seg = x[int(round(a * sr)):int(round(b * sr))].copy()
            if seg.shape[0] < 4 * nf:
                raise ValueError('morceau de voix trop court : %s %s' % (p['id'], [fic, a, b]))
            seg[:nf] *= np.sin(0.5 * np.pi * np.arange(nf) / nf)
            seg[-nf:] *= np.cos(0.5 * np.pi * np.arange(nf) / nf)
            if k > 0 and blanc > 0:
                parts.append(np.zeros(int(round(blanc * sr))))
            parts.append(seg)
        y = np.concatenate(parts)
        d_brute = y.shape[0] / sr
        facteur = 1.0
        dmax = p.get('duree_max')
        if dmax is not None and d_brute > float(dmax):
            facteur = min(d_brute / float(dmax), ATEMPO_MAX)
            y = atempo_ffmpeg(y, sr, facteur)
            y[:nf] *= np.sin(0.5 * np.pi * np.arange(nf) / nf)
            y[-nf:] *= np.cos(0.5 * np.pi * np.arange(nf) / nf)
        i = int(round(p['t_film'] * sr))
        piste[i:i + y.shape[0]] += y[:max(0, N - i)]
        fin = p['t_film'] + y.shape[0] / sr
        intervalles.append((p['t_film'], fin))
        rapport.append({'id': p['id'], 'texte': p.get('texte') or p.get('nom', ''), 'morceaux': p['morceaux'],
                        'blanc_s': blanc, 'duree_brute_s': round(d_brute, 3), 'duree_max_s': dmax,
                        'atempo': round(facteur, 4), 'duree_finale_s': round(y.shape[0] / sr, 3),
                        'depasse_encore_duree_max': bool(dmax is not None and y.shape[0] / sr > float(dmax) + 1e-3),
                        'attaque': round(p['t_film'], 3), 'fin': round(fin, 3)})
    ordre = sorted(range(len(intervalles)), key=lambda j: intervalles[j][0])
    for a, b in zip(ordre, ordre[1:]):
        assert intervalles[b][0] >= intervalles[a][1], 'pièces de voix qui se chevauchent : %s (fin %.3f) / %s (début %.3f)' % (
            rapport[a]['id'], intervalles[a][1], rapport[b]['id'], intervalles[b][0])
    assert max(b for _, b in intervalles) <= duree - 0.3, 'la dernière pièce de voix doit finir avant %.2f s' % (duree - 0.3)
    return piste, intervalles, rapport


def courbe_ducking(intervalles, reductions_db, N, sr, avant=0.05, apres=0.12):
    """Cible en dB (0 hors voix, réduction pendant chaque pièce élargie de 50 ms avant / 120 ms après), lissée par une
    fenêtre de Hann de 80 ms (enveloppe lissée, sans marche), convertie en gain linéaire."""
    fc = 1000.0
    nc = int(math.ceil(N / sr * fc)) + 2
    cible = np.zeros(nc)
    for (a, b), r in zip(intervalles, reductions_db):
        i, j = max(0, int((a - avant) * fc)), min(nc, int((b + apres) * fc) + 1)
        cible[i:j] = np.minimum(cible[i:j], r)
    w = np.hanning(int(LISSAGE_DUCK * fc) + 1)
    w /= w.sum()
    lisse = np.convolve(cible, w, 'same')
    return 10 ** (np.interp(np.arange(N) / sr, np.arange(nc) / fc, lisse) / 20.0)


# ----------------------------------------------------------------------------------------------
# Mesure BS.1770-4 et limiteur vrai crête
# ----------------------------------------------------------------------------------------------
def k_pondere(x, sr):
    """Filtres K de l'UIT-R BS.1770-4 (coefficients exacts à 48 kHz ; recalculés par transformation bilinéaire sinon)."""
    if sr == 48000:
        b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
        b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    else:
        f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
        K = math.tan(math.pi * f0 / sr)
        Vh, Vb = 10 ** (G / 20.0), 10 ** (G / 20.0) ** 0.4996667741545416
        a0 = 1.0 + K / Q + K * K
        b1 = [(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
        a1 = [1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
        f0, Q = 38.13547087602444, 0.5003270373238773
        K = math.tan(math.pi * f0 / sr)
        a1_ = 1.0 + K / Q + K * K
        b2, a2 = [1.0, -2.0, 1.0], [1.0, 2.0 * (K * K - 1.0) / a1_, (1.0 - K / Q + K * K) / a1_]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def lufs_integre(x, sr):
    """Sonie intégrée BS.1770-4 : blocs 400 ms recouvrement 75 %, porte absolue −70 LUFS, porte relative −10 LU."""
    y = k_pondere(x, sr)
    z = np.sum(y ** 2, axis=1)
    bl, pas = int(0.4 * sr), int(0.1 * sr)
    cs = np.concatenate([[0.0], np.cumsum(z)])
    deb = np.arange(0, len(z) - bl + 1, pas)
    ms = (cs[deb + bl] - cs[deb]) / bl
    l = -0.691 + 10 * np.log10(np.maximum(ms, 1e-15))
    m1 = ms[l > -70.0]
    if m1.size == 0:
        return -70.0
    seuil = -0.691 + 10 * np.log10(np.mean(m1)) - 10.0
    m2 = ms[l > seuil]
    return float(-0.691 + 10 * np.log10(np.mean(m2)))


def crete_vraie_enveloppe(x, sur=4):
    """Crête vraie par échantillon : |x| suréchantillonné ×4 (polyphasé), max sur les 4 phases et les 2 canaux."""
    up = signal.resample_poly(x, sur, 1, axis=0)
    a = np.abs(up).max(axis=1)
    a = a[:x.shape[0] * sur].reshape(x.shape[0], sur).max(axis=1)
    return np.maximum(a, np.abs(x).max(axis=1))


def crete_vraie_db(x, sur=4):
    return db(float(np.max(np.abs(signal.resample_poly(x, sur, 1, axis=0)))))


def gain_limiteur(crete, plafond_lin, sr, anticipation=0.005, maintien=0.040):
    """Gain d'un limiteur à anticipation : g_req = min(1, plafond / crête vraie) ; minimum glissant sur
    [i − maintien, i + anticipation] puis moyenne glissante causale sur `anticipation` : le gain ne dépasse jamais g_req
    (aucune crête vraie au-dessus du plafond), attaque et relâche sans marche."""
    from scipy.ndimage import minimum_filter1d
    g_req = np.minimum(1.0, plafond_lin / np.maximum(crete, 1e-12))
    La, Lm = max(1, int(anticipation * sr)), max(1, int(maintien * sr))
    if (La + Lm + 1) % 2 == 0:
        Lm += 1                                           # fenêtre de taille impaire (origine entière)
    W = La + Lm + 1
    # p = [1]*Lm + g_req + [1]*La ; minimum sur la fenêtre « arrière » [j − W + 1, j] de p, lu en j = i + Lm + La
    # = minimum de g_req sur [i − Lm, i + La]
    p = np.concatenate([np.ones(Lm), g_req, np.ones(La)])
    g_hold = minimum_filter1d(p, size=W, origin=(W - 1) // 2, mode='nearest')[Lm + La:]
    cs = np.concatenate([[0.0], np.cumsum(g_hold)])
    idx = np.arange(g_hold.shape[0])
    a = np.maximum(0, idx - La + 1)
    g = (cs[idx + 1] - cs[a]) / (idx + 1 - a)
    return np.minimum(g, 1.0)


def masteriser(mix, sr):
    """Gain cherché par dichotomie pour −16 LUFS APRÈS le limiteur vrai crête (plafond −1,3 dBTP). Retourne (final, gain dB)."""
    crete0 = crete_vraie_enveloppe(mix)
    plafond = 10 ** (PLAFOND_LIMITEUR_DBTP / 20.0)

    def rendre(gdb):
        g = 10 ** (gdb / 20.0)
        gl = gain_limiteur(crete0 * g, plafond, sr)
        return mix * (g * gl)[:, None]

    lo, hi = -30.0, 30.0
    for _ in range(22):
        mid = 0.5 * (lo + hi)
        if lufs_integre(rendre(mid), sr) < CIBLE_LUFS:
            lo = mid
        else:
            hi = mid
    gdb = 0.5 * (lo + hi)
    final = rendre(gdb)
    # contrôle : si la reconstruction dépasse encore le plafond exigé, on retire l'excès (rare)
    tp = crete_vraie_db(final)
    if tp > PLAFOND_DBTP - 0.1:
        final *= 10 ** ((PLAFOND_DBTP - 0.1 - tp) / 20.0)
    return final, gdb


def ecrire_wav16(chemin, x, sr, graine=90909):
    """WAV PCM 16 bit stéréo, dither TPDF ±1 LSB semé (déterministe)."""
    import wave
    rng = np.random.default_rng(graine)
    d = (rng.random(x.shape) - rng.random(x.shape))
    pcm = np.clip(np.round(x * 32767.0 + d), -32768, 32767).astype('<i2')
    os.makedirs(os.path.dirname(os.path.abspath(chemin)), exist_ok=True)
    with wave.open(chemin, 'wb') as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return pcm


# ----------------------------------------------------------------------------------------------
# Programme principal
# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='Bande-son V9 « Grand Prix de Noël — Ring » (120,5 s, 48 kHz).')
    ap.add_argument('--sortie', default=os.path.join(ICI, 'audio', 'mix_v9.wav'))
    ap.add_argument('--timeline', default=os.path.join(ICI, 'data', 'timeline_v9.json'))
    ap.add_argument('--plan', default=os.path.join(ICI, 'data', 'plan_v9.json'))
    ap.add_argument('--voix', default=os.path.join(ICI, 'data', 'voix_v9.json'))
    ap.add_argument('--dossier-themes', default=os.path.join(DOSSIER_V5, 'themes_ecuries'))
    ap.add_argument('--banque-bbc', default=os.path.join(DOSSIER_V5, 'sons_reels'),
                    help='dossier des WAV BBC (../audio_v5/telecharger_sons_bbc.py) ; absent → synthèse')
    ap.add_argument('--sans-bbc', action='store_true', help='n\'utilise que la synthèse pour les bruitages')
    ap.add_argument('--sans-voix', action='store_true')
    args = ap.parse_args()
    t_calc = time.time()
    sr = SR

    with open(args.plan, encoding='utf-8') as f:
        plan = json.load(f)
    with open(args.voix, encoding='utf-8') as f:
        pieces = json.load(f)['pieces']
    DUREE = float(plan['duree'])
    N = int(round(DUREE * sr))
    R = plan['reperes_son']
    O, TEL, LB, GL, DEP = plan['ouverture'], plan['telephone'], plan['lootbox'], plan['gloire'], plan['depart']
    seg = {s['id']: s for s in plan['segments']}
    fam_seg = seg['familles']
    fam = {x['id']: (fam_seg['debut'] + x['debut'] - fam_seg.get('origine', 0.0), fam_seg['debut'] + x['fin'] - fam_seg.get('origine', 0.0))
           for x in fam_seg['sous']}
    ecuries = plan['ecuries']
    assert len(ecuries) == 15, '15 écuries attendues'
    cfg_themes = {}
    chemin_th = os.path.join(DOSSIER_V5, 'themes_ecuries.json')
    if os.path.isfile(chemin_th):
        with open(chemin_th, encoding='utf-8') as f:
            cfg_themes = json.load(f).get('ecuries', {})
    bbc = BanqueBBC(args.banque_bbc if not args.sans_bbc else os.path.join(ICI, '__aucune_banque__'), sr)

    kit = v8.construire_kit(sr)
    bus_amb = np.zeros((N, 2))       # ambiances (feu, souffle, foule, pluies)
    bus_mus = np.zeros((N, 2))       # musique ring, nappes, synthwave, fanfare
    bus_fx = np.zeros((N, 2))        # bruitages et habillage
    bus_theme = np.zeros((N, 2))     # extraits réels des 15 écuries
    evenements = []

    def ev(t, quoi, bloc, fin=None, source='synthèse', **extra):
        e = {'t': round(float(t), 3), 'bloc': bloc, 'quoi': quoi, 'source': source}
        if fin is not None:
            e['fin'] = round(float(fin), 3)
        e.update(extra)
        evenements.append(e)

    def bbc_pic(ident, t_pic_src, avant, apres, usage):
        r = bbc.pic(ident, t_pic_src, avant, apres, usage)
        return r

    def poser_bbc_ou(bus, ident, t_pic_src, avant, apres, t_evt, gain, usage, pan=0.0, couleur=None):
        """Pose l'extrait BBC (pic aligné sur t_evt) ; renvoie la source utilisée ou None (alors la synthèse suffit)."""
        r = bbc_pic(ident, t_pic_src, avant, apres, usage)
        if r is None:
            return None
        x, off = r
        if couleur is not None:
            x = norme(filtre_bande(x, sr, couleur[0], couleur[1]))
        poser(bus, x, t_evt - off, sr, pan=pan, gain=gain)
        return 'BBC %s' % ident

    # ================================ 1. OUVERTURE (0 → 15,5 s) ================================
    rng = np.random.default_rng(90100)
    t_logo = R['logo_choc']
    c0, c1 = R['crepitement']
    feu = v8.feu_de_cheminee(sr, c1 + 0.8, rng)
    feu = np.stack([filtre_bande(feu[:, c], sr, 180.0, 7000.0) for c in range(2)], axis=1)   # haut-parleur de télé
    tf = temps(feu.shape[0], sr)
    feu *= np.cos(0.5 * np.pi * np.clip((tf - (c1 - 0.15)) / 0.55, 0, 1))[:, None]
    poser(bus_amb, feu, c0, sr, gain=1.0)
    ev(c0, 'crépitement de feu de cheminée (télé, bande 180 Hz–7 kHz)', 'ouverture', fin=c1 + 0.4)
    sf_ = souffle_piece(sr, rng, O['plongee'] + 0.5)
    poser(bus_amb, sf_, 0.0, sr, gain=0.09)
    ev(0.0, 'souffle de pièce (ton de salon)', 'ouverture', fin=O['plongee'] + 0.5)
    th = 0.5
    k = 0
    while th < O['guirlandes'][1]:
        poser(bus_amb, tic_horloge(sr, rng, aigu=(k % 2 == 0)), th, sr, pan=0.55, gain=0.10)
        th += 1.0
        k += 1
    ev(0.5, 'horloge discrète (%d tic-tac, 1 Hz)' % k, 'ouverture', fin=th - 1.0)
    t_et = R['etincelle']
    poser(bus_fx, etincelle(sr, rng), t_et, sr, gain=0.5)
    ev(t_et, 'étincelle : « tsk » + scintillement', 'ouverture')
    g0, g1 = O['guirlandes']
    gamme = [76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100]
    for i, m in enumerate(gamme):
        tg = g0 + (g1 - g0) * (i / (len(gamme) - 1)) ** 0.9
        poser(bus_fx, stereo(tic_cristal(sr, rng, m), -0.7 + 1.4 * i / (len(gamme) - 1)), tg, sr, gain=0.16 + 0.015 * i)
    ev(g0, 'guirlandes qui s\'allument : %d tics cristallins montants' % len(gamme), 'ouverture', fin=g1)
    poser(bus_fx, choc_dore(sr, rng), t_logo, sr, gain=0.85)
    src = poser_bbc_ou(bus_fx, '07019112', 0.70, 0.05, 1.5, t_logo, 0.25, 'choc logo (canon, couche)')
    ev(t_logo, 'CHOC DORÉ du logo : sub-boom, cymbale, accord de cuivres, cloches, shimmer', 'ouverture',
       source='synthèse' + (' + ' + src if src else ''))
    t_fente, t_tap, t_plo, t_are = O['tapis_fente'], R['tapis_ouverture'], R['plongee'], R['arrivee_arene']
    poser(bus_fx, stereo(dechirure_tissu(sr, rng), -0.1), t_fente, sr, gain=0.18)
    ev(t_fente, 'fente du tapis (fibres qui cèdent, feutré)', 'ouverture')
    w, pic = whoosh_buf(sr, 1.4, 90110, sens=1)
    poser(bus_fx, w, t_tap + 0.35 - pic, sr, gain=0.6)
    poser(bus_fx, stereo(v8.grincement(sr, rng, 1.3), 0.2), t_tap + 0.05, sr, gain=0.12)
    poser(bus_fx, sub_drop(sr, 1.6, 80.0, 30.0, 0.6), t_tap, sr, gain=0.35)
    ev(t_tap, 'ouverture du tapis : whoosh + grincement doux + sub', 'ouverture', fin=t_tap + 1.4)
    # tension continue sous le tapis ouvert jusqu'à l'arène : grondement grave qui enfle + bourdon (aucun trou)
    d_ten = t_are - t_tap
    poser(bus_amb, stereo(v8.roulement_grave(sr, rng, d_ten, 30.0, 240.0)), t_tap, sr, gain=0.30)
    nten = int(d_ten * sr)
    tten = temps(nten, sr)
    bourdon = (np.sin(2 * np.pi * 41.2 * tten) + 0.5 * np.sin(2 * np.pi * 61.7 * tten) + 0.25 * np.sin(2 * np.pi * 82.4 * tten))
    bourdon *= (0.35 + 0.65 * (tten / d_ten) ** 1.5) * fenetre(nten, 0.6, 0.05, sr)
    poser(bus_amb, stereo(bourdon), t_tap, sr, gain=0.10)
    ev(t_tap, 'tension sous le tapis : grondement + bourdon qui enflent', 'ouverture', fin=t_are)
    d_r = t_are - t_plo - 0.04
    poser(bus_fx, riser(sr, d_r, rng, f0=250.0, f1=11000.0, tonale=50), t_plo, sr, gain=0.55)
    w, pic = whoosh_buf(sr, d_r + 0.1, 90111, sens=1)
    poser(bus_fx, w, t_plo, sr, gain=0.4)
    w, pic = whoosh_buf(sr, 1.0, 90112, sens=-1)
    poser(bus_fx, w, t_plo + 0.45 - pic, sr, gain=0.45)
    poser(bus_fx, sub_drop(sr, 1.4, 75.0, 32.0, 0.5), t_plo, sr, gain=0.45)
    ev(t_plo, 'plongée : whoosh montant (riser + whoosh)', 'ouverture', fin=t_are)
    # arrivée dans l'arène : foule qui explose + pyro + boom
    poser(bus_fx, sub_drop(sr, 2.6, 110.0, 26.0, 0.9), t_are, sr, gain=1.0)
    poser(bus_fx, stereo(kit['kb']), t_are, sr, gain=0.9)
    poser(bus_fx, stereo(v8.cymbale(sr, rng, 3.0, 1.1)), t_are, sr, gain=0.35)
    poser(bus_fx, v8.explosion(sr, rng, 1.2), t_are, sr, gain=0.35)
    poser(bus_fx, pyro_crepitement(sr, rng), t_are + 0.03, sr, gain=0.4)
    src_are = []
    s = poser_bbc_ou(bus_fx, '07037327', 0.80, 0.05, 3.0, t_are, 0.32, 'boom d\'arrivée')
    if s:
        src_are.append(s)
    s = poser_bbc_ou(bus_fx, '07019114', 1.40, 0.3, 3.0, t_are + 0.1, 0.3, 'pyro d\'arrivée', pan=-0.3)
    if s:
        src_are.append(s)
    poser(bus_amb, v8.foule(sr, rng, 4.5), t_are, sr, gain=0.42)
    s = poser_bbc_ou(bus_amb, '07075033', 92.9, 0.4, 4.5, t_are + 0.3, 0.38, 'explosion de foule à l\'arrivée')
    if s:
        src_are.append(s)
    ev(t_are, 'ARRIVÉE DANS L\'ARÈNE : explosion de foule + pyro + boom', 'ouverture',
       source=' + '.join(['synthèse'] + src_are))

    # ================================ 2. MUSIQUE RING + ÉCURIES (15,5 → 75 s) ================================
    rm0, rm1 = R['ring_music']
    ch_ring = os.path.join(ICI, 'audio', 'sources', 'ring_music.mp3')
    infos_ring = None
    if os.path.isfile(ch_ring):
        ring, infos_ring = musique_ring(sr, ch_ring, rm0, rm1 + 0.5, 2.5)
        poser(bus_mus, ring, rm0, sr, gain=0.62)
        ev(rm0, 'musique ring du client (section %.1f–%.1f s, %d mesures, %.1f BPM), boucle sur le premier temps' % (
            infos_ring['boucle_s'][0], infos_ring['boucle_s'][1], infos_ring['mesures_par_boucle'], infos_ring['bpm']),
           'ecuries', fin=rm1 + 0.5, source='audio/sources/ring_music.mp3 (extrait client, lu)')
    else:
        # repli : groove de synthèse au même tempo (90 BPM) pour ne jamais laisser de trou
        print('  [avertissement] ring_music.mp3 absent -> groove de synthèse')
        groove = {'k': 'x.......x.x.....', 'c': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}
        v8.batterie_motif(bus_mus, kit, rm0, rm1, 90.0, groove, {'k': 0.6, 'c': 0.35, 'h': 0.12}, sr)
        ev(rm0, 'groove de synthèse (repli, ring_music.mp3 absent)', 'ecuries', fin=rm1)
    # rumeur de foule continue
    d_rum = rm1 + 1.0 - rm0
    rum = rumeur_foule(sr, rng, d_rum)
    poser(bus_amb, rum, rm0 + 0.5, sr, gain=0.10)
    src_rum = 'synthèse'
    nap = bbc.nappe('07075033', 20.0, d_rum, 'rumeur de foule continue')
    if nap is not None:
        nap = fondus(nap, 1.2, 1.5)
        poser(bus_amb, np.stack([nap, np.roll(nap, int(0.013 * sr))], axis=1), rm0 + 0.5, sr, gain=0.30)
        src_rum = 'synthèse + BBC 07075033'
    ev(rm0 + 0.5, 'rumeur de foule continue', 'ecuries', fin=rm0 + 0.5 + d_rum, source=src_rum)

    par_id = {p['id']: p for p in pieces}
    lignes_ec = []
    rec = np.random.default_rng(90200)
    # la voix est nécessaire pour caler les extraits : on la calcule ici (sa piste sert aussi plus bas)
    if not args.sans_voix:
        vo, iv_voix, rapport_voix = voix_off_v9(sr, N, pieces, DUREE)
    else:
        vo, iv_voix, rapport_voix = np.zeros(N), [], []
    fin_voix = {r['id']: r['fin'] for r in rapport_voix}
    for k, e in enumerate(ecuries):
        eid = e['id']
        pan0 = -0.7 if k % 2 == 0 else 0.7
        sources = []
        # sortie du tunnel : jet de flammes + moteur qui monte (enregistrement réel de l'écurie si CC0 / CC BY)
        poser(bus_fx, jet_flammes(sr, rec), e['sortie'], sr, gain=0.40)
        d_mot = e['atterrissage'] - e['sortie'] + 0.2
        mot = charger_moteur_ecurie(eid, 0, sr)
        if mot is not None:
            x, chm, lic = mot
            x = x[:int(d_mot * sr)]
            x = norme(x) * fenetre(x.shape[0], 0.05, 0.4, sr)
            src_mot = '%s (%s)' % (chm, lic)
        else:
            x = moteur_qui_monte(sr, rec, d_mot)
            src_mot = 'synthèse'
        poser(bus_fx, pan_glisse(x, pan0, pan0 * 0.2), e['sortie'] + 0.05, sr, gain=0.30)
        ev(e['sortie'], 'écurie %d : sortie du tunnel (jet de flammes + moteur qui monte)' % eid, 'ecuries',
           fin=e['sortie'] + d_mot, source='synthèse + ' + src_mot)
        sources.append(src_mot)
        # saut : whoosh
        w, pic = whoosh_buf(sr, 0.9, 90300 + k, sens=-1 if k % 2 else 1)
        poser(bus_fx, w, e['saut'] + 0.25 - pic, sr, gain=0.40)
        ev(e['saut'], 'écurie %d : saut (whoosh)' % eid, 'ecuries')
        # atterrissage : impact amorti + crissement ; dérapage jusqu'à place
        poser(bus_fx, stereo(impact_amorti(sr, rec), pan0 * 0.2), e['atterrissage'], sr, gain=0.55)
        d_der = e['place'] - e['atterrissage'] + 0.15
        poser(bus_fx, pan_glisse(crissement(sr, rec, d_der, f0=float(rec.uniform(1000, 1350))), pan0 * 0.3, -pan0 * 0.3),
              e['atterrissage'] + 0.02, sr, gain=0.16)
        ident, pk = (('07022357', 2.20), ('07045249', 1.55))[k % 2]
        s = poser_bbc_ou(bus_fx, ident, pk, 0.15, d_der, e['atterrissage'] + 0.15, 0.22,
                         'crissement écurie %d' % eid, pan=-pan0 * 0.2)
        ev(e['atterrissage'], 'écurie %d : atterrissage (impact amorti + crissement)' % eid, 'ecuries',
           source='synthèse' + (' + ' + s if s else ''))
        ev(e['atterrissage'] + 0.02, 'écurie %d : dérapage (crissement de pneus)' % eid, 'ecuries', fin=e['place'] + 0.15,
           source='synthèse' + (' + ' + s if s else ''))
        # son d'écurie : extrait réel joué juste après la voix (ou sur l'atterrissage, plus bas, si la voix parle encore)
        cfg = cfg_themes.get(str(eid)) or {}
        pp = cfg.get('perso') or {}
        if eid == 8:
            chemin, debut_s, duree_s, gain_db = os.path.join(ICI, 'audio', 'sources', 'audi_chime.mp3'), 1.0, 3.0, 0.0
        else:
            chemin = v7.trouver_theme(args.dossier_themes, eid)
            debut_s, duree_s, gain_db = float(pp.get('debut_s', 0.0)), float(pp.get('duree_s', 3.0)), float(pp.get('gain_db', 0.0))
        f_v = fin_voix.get('ecurie_%02d' % eid, e['atterrissage'])
        if f_v + 0.05 <= e['place']:
            t_th, att_db, mode = f_v + 0.05, 0.0, 'après la voix'
        else:
            t_th, att_db, mode = e['atterrissage'], -6.0, 'sur l\'atterrissage (voix en cours, −6 dB)'
        t_lim = ecuries[k + 1]['atterrissage'] - 0.05 if k + 1 < len(ecuries) else rm1 + 0.5
        d_th = min(duree_s, t_lim - t_th)
        ligne = {'k': e['k'], 'id': eid, 'nom': (par_id.get('ecurie_%02d' % eid) or {}).get('nom', ''),
                 'sortie': e['sortie'], 'saut': e['saut'], 'atterrissage': e['atterrissage'], 'place': e['place'],
                 'fin_voix': round(f_v, 3), 'moteur': src_mot}
        th_ok = False
        if chemin and os.path.isfile(chemin):
            try:
                x, _, _ = v8.couche_v8(chemin, debut_s, d_th, gain_db, sr, 0.0)
                x = fondus(x, 0.01, min(0.25, 0.3 * d_th))
                poser(bus_theme, x, t_th, sr, gain=10 ** (att_db / 20.0))
                rel = os.path.relpath(chemin, ICI).replace(os.sep, '/')
                ligne['son_ecurie'] = {'fichier': rel, 'debut_dans_fichier_s': debut_s, 'duree_s': round(d_th, 3),
                                       'gain_db_fichier': gain_db, 't_film': round(t_th, 3), 'fin': round(t_th + d_th, 3),
                                       'mode': mode, 'attenuation_db': att_db}
                ev(t_th, 'écurie %d : son d\'écurie (%s)' % (eid, mode), 'ecuries', fin=t_th + d_th, source=rel + ' (extrait, lu)')
                th_ok = True
            except Exception as ex:
                print('  [avertissement] écurie %d : extrait illisible (%s) -> stinger de synthèse' % (eid, ex))
        if not th_ok:
            st = jingle_dore(sr, np.random.default_rng(90400 + eid))
            poser(bus_theme, st[:int(d_th * sr)] * fenetre(min(st.shape[0], int(d_th * sr)), 0.005, 0.2, sr)[:, None], t_th, sr,
                  gain=0.6 * 10 ** (att_db / 20.0))
            ligne['son_ecurie'] = {'fichier': 'synthèse (extrait absent)', 't_film': round(t_th, 3), 'mode': mode}
            ev(t_th, 'écurie %d : son d\'écurie de SYNTHÈSE (extrait absent)' % eid, 'ecuries', fin=t_th + d_th)
        lignes_ec.append(ligne)

    # ================================ 3. TÉLÉPHONE (75 → 84,5 s) ================================
    rt = np.random.default_rng(90500)
    t0t, t1t = TEL['debut'], TEL['fin']
    nt = nappe_tech(sr, rt, t1t - t0t + 0.3)
    poser(bus_mus, nt, t0t, sr, gain=0.28)
    ev(t0t, 'nappe tech de l\'interface téléphone', 'telephone', fin=t1t)
    w, pic = whoosh_buf(sr, 0.7, 90501, sens=1)
    poser(bus_fx, w, t0t + 0.2 - pic, sr, gain=0.3)
    poser(bus_fx, stereo(v8.select_arcade(sr, rt)), t0t + 0.15, sr, gain=0.15)
    ev(t0t + 0.15, 'arrivée sur l\'écran du téléphone (whoosh + « select »)', 'telephone')
    poser(bus_fx, stereo(tap_ecran(sr, rt), 0.1), TEL['pari'] - 0.02, sr, gain=0.5)
    poser(bus_fx, v8.bouton_cash(sr, rt), TEL['pari'] + 0.03, sr, gain=0.55)
    s = poser_bbc_ou(bus_fx, '07042056', 1.55, 0.05, 0.9, TEL['pari'] + 0.18, 0.18, 'ka-ching pari')
    ev(TEL['pari'], 'pari : tap + « ka-ching »', 'telephone', source='synthèse' + (' + ' + s if s else ''))
    poser(bus_fx, compteur_pieces(sr, rt), TEL['points'], sr, gain=0.7)
    s = poser_bbc_ou(bus_fx, '07042056', 2.80, 0.05, 0.9, TEL['points'] + 0.5, 0.14, 'compteur de points')
    ev(TEL['points'], 'points : compteur de pièces + ding', 'telephone', fin=TEL['points'] + 1.1,
       source='synthèse' + (' + ' + s if s else ''))
    poser(bus_fx, roulette(sr, rt), TEL['lootbox'], sr, gain=0.7)
    ev(TEL['lootbox'], 'lootbox : roulette qui ralentit + carillon', 'telephone', fin=TEL['lootbox'] + 1.2)
    poser(bus_fx, jingle_dore(sr, rt), TEL['bonus'], sr, gain=0.5)
    ev(TEL['bonus'], 'bonus : jingle doré', 'telephone', fin=TEL['bonus'] + 1.2)
    poser(bus_fx, swoosh_rouge(sr, rt), TEL['piege'] - 0.45, sr, gain=0.55)
    ev(TEL['piege'], 'piège : swoosh rouge menaçant (cluster grave + sub)', 'telephone', fin=TEL['piege'] + 1.0)

    # ================================ 4. FAMILLES (84,5 → 99,5 s) : coupes franches ================================
    rfm = np.random.default_rng(90600)
    g0f, g1f = fam['gotham']
    f0f, f1f = fam['f1']
    k0f, k1f = fam['tokyo']
    bus_got, bus_f1, bus_tk = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
    dg = g1f - g0f
    # Gotham
    pl = pluie(sr, rfm, dg + 0.1, 380.0, sombre=True)
    poser(bus_got, pl, g0f, sr, gain=0.30)
    src_pl = 'synthèse'
    npl = bbc.nappe('07038337', 30.0, dg + 0.1, 'pluie Gotham')
    if npl is not None:
        poser(bus_got, np.stack([npl, np.roll(npl, 211)], axis=1), g0f, sr, gain=0.45)
        src_pl += ' + BBC 07038337'
    ev(g0f, 'Gotham : pluie', 'familles', fin=g1f, source=src_pl)
    for tt0, gg in ((g0f + 0.6, 0.5), (g0f + 3.1, 0.38)):
        poser(bus_got, stereo(tonnerre_lointain(sr, rfm), float(rfm.uniform(-0.5, 0.5))), tt0, sr, gain=gg)
        s = poser_bbc_ou(bus_got, '07005226', 1.30, 0.3, 3.0, tt0 + 0.4, gg * 0.6, 'tonnerre lointain', couleur=(None, 500.0))
        ev(tt0, 'Gotham : tonnerre lointain', 'familles', fin=tt0 + 3.0, source='synthèse' + (' + ' + s + ' (passe-bas 500 Hz)' if s else ''))
    bm = moteur_grave_batmobile(sr, rfm, dg + 0.1)
    poser(bus_got, pan_glisse(bm, -0.4, 0.4), g0f, sr, gain=0.45)
    src_bm = 'synthèse'
    nv8 = bbc.nappe('07010036', 40.0, (dg + 0.1) / 0.75 + 0.1, 'moteur Batmobile (V8 ralenti, transposé −5 demi-tons)')
    if nv8 is not None:
        # transposition par lecture ralentie (×0,75) : plus grave, plus massif
        nn = int((dg + 0.1) * sr)
        xs = np.interp(np.arange(nn) * 0.75, np.arange(nv8.shape[0]), nv8)
        poser(bus_got, stereo(fondus(norme(filtre_bande(xs, sr, 30.0, 3000.0)), 0.3, 0.3)), g0f, sr, gain=0.35)
        src_bm += ' + BBC 07010036 (×0,75)'
    ev(g0f, 'Gotham : moteur grave de Batmobile', 'familles', fin=g1f, source=src_bm)
    ns = nappe_accords(sr, dg + 0.1, [38, 45, 50, 53, 57], rfm, brillance=0.3, attaque=0.8, relache=0.1)
    poser(bus_got, ns, g0f, sr, gain=0.35)
    for tb in (g0f + 0.02, g0f + 2.5):
        poser(bus_got, stereo(v8.tom(sr, 55.0, 0.9)), tb, sr, gain=0.5)
    poser(bus_got, v8.cuivres([38, 45, 50, 53], 1.8, sr, 1.2, attaque=0.15), g0f + 2.5, sr, gain=0.25)
    ev(g0f, 'Gotham : nappe sombre héroïque (ré mineur, timbales, cuivres)', 'familles', fin=g1f)
    # F1
    df = f1f - f0f
    poser(bus_f1, rumeur_foule(sr, rfm, df + 0.1), f0f, sr, gain=0.08)
    bips = [f0f + d for d in (0.6, 1.4, 2.2, 3.0, 3.8)]
    # grille : monoplaces au ralenti haut perché qui attendent les feux (petits coups de gaz), sous les bips
    d_gr = bips[-1] + 0.35 - f0f
    for j, (fr, pan) in enumerate(((182.0, -0.6), (194.0, 0.1), (207.0, 0.6))):
        ngr = int(d_gr * sr)
        tgr = temps(ngr, sr)
        coup = 1.0 + 0.18 * np.exp(-((tgr - (0.9 + 0.8 * j)) / 0.12) ** 2) + 0.15 * np.exp(-((tgr - (2.4 + 0.5 * j)) / 0.1) ** 2)
        ph = phase_continue(fr * coup * (1.0 + 0.003 * np.sin(2 * np.pi * 6.0 * tgr + j)), sr)
        xg = sum(np.sin(h * ph + 0.4 * h) / h ** 0.9 for h in range(1, 14) if fr * h * 1.4 < 0.45 * sr)
        xg = np.tanh(1.4 * norme(xg)) * fenetre(ngr, 0.05, 0.25, sr)
        poser(bus_f1, xg, f0f, sr, pan=pan, gain=0.07)
    ev(f0f, 'F1 : monoplaces au ralenti sur la grille (3 moteurs, coups de gaz)', 'familles', fin=bips[-1] + 0.35)
    for i, tb in enumerate(bips):
        poser(bus_f1, stereo(bip_feux(sr, 880.0)), tb, sr, gain=0.42)
        ev(tb, 'F1 : bip du feu rouge %d/5' % (i + 1), 'familles')
    t_v6 = bips[-1] + 0.3
    v6 = v6_hybride_ralenti(sr, rfm, f1f - t_v6 + 0.05)
    poser(bus_f1, v6, t_v6, sr, gain=0.6)
    s = poser_bbc_ou(bus_f1, '07020021', 2.55, 0.6, 0.6, t_v6 + 0.6, 0.18, 'F1 rugissement (couche)')
    ev(t_v6, 'F1 : rugissement V6 hybride au ralenti (extinction des feux)', 'familles', fin=f1f,
       source='synthèse' + (' + ' + s if s else ''))
    # Tokyo
    dk = k1f - k0f
    pl = pluie(sr, rfm, dk + 0.1, 300.0)
    poser(bus_tk, pl, k0f, sr, gain=0.18)
    src_pl = 'synthèse'
    npl = bbc.nappe('07038337', 120.0, dk + 0.1, 'pluie Tokyo')
    if npl is not None:
        npl = filtre_bande(npl, sr, 600.0, None)
        poser(bus_tk, np.stack([npl, np.roll(npl, 157)], axis=1), k0f, sr, gain=0.28)
        src_pl += ' + BBC 07038337'
    ev(k0f, 'Tokyo : pluie urbaine', 'familles', fin=k1f, source=src_pl)
    poser(bus_tk, synthwave(sr, rfm, dk + 0.1, kit, 100.0), k0f, sr, gain=0.42)
    poser(bus_tk, stereo(bourdonnement_neon(sr, rfm, dk + 0.1), 0.6), k0f, sr, gain=0.035)
    ev(k0f, 'Tokyo : synthwave néon (100 BPM) + bourdonnement des enseignes', 'familles', fin=k1f)
    for tp, fb in ((k0f + 1.0, 160.0), (k0f + 3.0, 190.0)):
        pt = passage_turbo(sr, rfm, 1.8, fb)
        poser(bus_tk, pt, tp - 0.55 * 1.8, sr, gain=0.42)
        s = poser_bbc_ou(bus_tk, 'NHU05078130', 2.85, 0.05, 0.6, tp + 0.15, 0.12, 'soupape turbo Tokyo', pan=0.5)
        ev(tp, 'Tokyo : moteur turbo qui passe (Doppler + soupape)', 'familles', fin=tp + 0.8,
           source='synthèse' + (' + ' + s if s else ''))
    bus_fam = (bus_got * masque_intervalle(N, g0f, g1f)[:, None] + bus_f1 * masque_intervalle(N, f0f, f1f)[:, None]
               + bus_tk * masque_intervalle(N, k0f, k1f)[:, None])
    for tz in (g1f, f1f):
        poser(bus_fam, stereo(zap(sr, rfm)), tz - 0.02, sr, gain=0.4)
        ev(tz, 'coupe franche + « zap » de transition', 'familles')
    poser(bus_fam, stereo(zap(sr, rfm)), g0f - 0.02, sr, gain=0.3)
    ev(g0f, 'entrée dans les familles : coupe franche + « zap »', 'familles')

    # ================================ 5. LOOTBOX (99,5 → 106,5 s) ================================
    rl = np.random.default_rng(90700)
    t_desc = LB['descente']
    poser(bus_fx, stereo(zap(sr, rl)), LB['debut'] - 0.02, sr, gain=0.3)
    ev(LB['debut'], 'retour dans l\'arène : coupe franche + « zap »', 'lootbox')
    d_ar = GL['debut'] - LB['debut']
    poser(bus_amb, rumeur_foule(sr, rl, d_ar + 0.1) * fenetre(int((d_ar + 0.1) * sr), 0.15, 0.25, sr)[:, None], LB['debut'], sr, gain=0.07)
    ev(LB['debut'], 'rumeur de l\'arène (basse)', 'lootbox', fin=GL['debut'])
    t_imp = t_desc + 0.8
    poser(bus_fx, stereo(v8.obus_siffle(sr, t_imp - t_desc), 0.1), t_desc, sr, gain=0.25)
    poser(bus_fx, riser(sr, t_imp - t_desc, rl, f0=200.0, f1=6000.0), t_desc, sr, gain=0.25)
    ev(t_desc, 'lootbox : descente (sifflement)', 'lootbox', fin=t_imp)
    poser(bus_fx, impact_metal_lourd(sr, rl), t_imp, sr, gain=0.85)
    s = poser_bbc_ou(bus_fx, '07022366', 1.15, 0.05, 2.0, t_imp, 0.4, 'impact métallique lourd lootbox')
    ev(t_imp, 'lootbox : IMPACT MÉTALLIQUE LOURD au sol', 'lootbox', source='synthèse' + (' + ' + s if s else ''))
    t_ver = R['lootbox_verrous']
    for i, d in enumerate((0.0, 0.22, 0.41, 0.66)):
        poser(bus_fx, stereo(clac_metal(sr, rl, float(rl.uniform(700, 1100))), -0.6 + 0.4 * i), t_ver + d, sr, gain=0.95)
        ev(t_ver + d, 'lootbox : verrou %d/4 qui saute (clac métallique)' % (i + 1), 'lootbox')
    t_ent = LB['entrouvre']
    d_cl = LB['fin'] - t_ent - 0.1
    poser(bus_fx, cliquetis(sr, rl, d_cl), t_ent, sr, gain=0.4)
    nch = bbc.nappe('07037386', 12.0, d_cl, 'rideau qui s\'enroule (chaînes)')
    src_ch = 'synthèse'
    if nch is not None:
        poser(bus_fx, stereo(fondus(nch, 0.05, 0.4), 0.2), t_ent, sr, gain=0.25)
        src_ch += ' + BBC 07037386'
    ev(t_ent, 'lootbox : rideau qui commence à s\'enrouler (cliquetis)', 'lootbox', fin=t_ent + d_cl, source=src_ch)
    d_nap = LB['fin'] - t_ver + 0.05
    nd = nappe_accords(sr, d_nap, [60, 64, 67, 71, 74, 79], rl, brillance=0.6, attaque=0.05, relache=0.08)
    nd *= np.linspace(0.15, 1.0, nd.shape[0])[:, None] ** 1.5
    poser(bus_mus, nd, t_ver, sr, gain=0.35)
    poser(bus_mus, shimmer(sr, rl, d_nap, 3000.0, 9000.0, 20) * np.linspace(0.0, 1.0, int(d_nap * sr))[:, None], t_ver, sr, gain=0.12)
    ev(t_ver, 'lootbox : nappe dorée qui monte', 'lootbox', fin=LB['fin'])

    # ================================ 6. GLOIRE (106,5 → 112,5 s) ================================
    rg = np.random.default_rng(90800)
    t_tro = GL['trophee']
    poser(bus_amb, souffle_piece(sr, rg, t_tro - GL['debut'] + 0.4), GL['debut'], sr, gain=0.05)
    ev(GL['debut'], 'silence relatif (air seul)', 'gloire', fin=t_tro)
    ff = fanfare(sr, rg, kit)
    poser(bus_mus, ff, t_tro - 0.95, sr, gain=0.62)
    ev(t_tro - 0.6, 'fanfare orchestrale : timbales, appel de cuivres, accord majeur plein', 'gloire', fin=t_tro + 4.0)
    poser(bus_fx, carillon_noel(sr, rg, 3.2), t_tro + 0.1, sr, gain=0.4)
    s = poser_bbc_ou(bus_fx, '07012094', 16.25, 0.1, 2.6, t_tro + 0.3, 0.2, 'grelots de traîneau (gloire)', pan=0.4)
    ev(t_tro + 0.1, 'cloches de Noël + grelots', 'gloire', fin=t_tro + 3.3, source='synthèse' + (' + ' + s if s else ''))
    t_conf = R['gloire']
    poser(bus_fx, confettis(sr, rg), t_conf, sr, gain=0.5)
    poser(bus_amb, v8.foule(sr, rg, 3.4), t_conf + 0.05, sr, gain=0.5)
    src_f = []
    s = poser_bbc_ou(bus_amb, '07035075', 20.0, 0.3, 3.2, t_conf + 0.3, 0.45, 'foule qui exulte (gloire)')
    if s:
        src_f.append(s)
    s = poser_bbc_ou(bus_fx, '07019112', 0.70, 0.05, 1.2, t_conf, 0.25, 'canon à confettis')
    if s:
        src_f.append(s)
    ev(t_conf, 'foule qui exulte + canons à confettis', 'gloire', fin=t_conf + 3.0, source=' + '.join(['synthèse'] + src_f))

    # ================================ 7. DÉPART (112,5 → 120,5 s) ================================
    rd = np.random.default_rng(90900)
    poser(bus_fx, stereo(twang_cordes(sr, rd), -0.3), DEP['cordes'], sr, gain=0.35)
    ev(DEP['cordes'], 'cordes du ring qui claquent', 'depart')
    t_dem = R['depart_moteurs']
    srcs_dem = []
    for i in range(15):
        eq = i + 1
        td = t_dem + 0.07 * i + float(rd.uniform(0.0, 0.03))
        pan = -0.85 + 1.7 * ((i * 7) % 15) / 14.0
        poser(bus_fx, stereo(demarreur(sr, rd, 0.32), pan), td, sr, gain=0.25)
        mot = charger_moteur_ecurie(eq, 1, sr)
        lmax = int((DEP['piste'] - td + 0.4) * sr)
        if mot is not None:
            x = mot[0][:lmax]
            srcs_dem.append(mot[1])
        else:
            x = moteur_qui_monte(sr, rd, lmax / sr, 70.0 + 5 * i, 200.0 + 8 * i)
            srcs_dem.append('synthèse')
        x = norme(x) * fenetre(x.shape[0], 0.04, 0.5, sr)
        poser(bus_fx, stereo(x, pan), td + 0.28, sr, gain=0.18)
    ev(t_dem, '15 moteurs qui démarrent (démarreur + moteurs réels des écuries)', 'depart', fin=DEP['piste'] + 0.4,
       source='synthèse + sounds/moteurs_reels (CC0 / CC BY)')
    t_pis = DEP['piste']
    for j, (d, fb, sens) in enumerate(((-0.25, 170.0, 1), (0.0, 140.0, -1), (0.2, 200.0, 1), (0.45, 155.0, -1))):
        pt = passage_turbo(sr, rd, 1.6, fb)
        if sens < 0:
            pt = pt[:, ::-1]
        poser(bus_fx, pt, t_pis + d - 0.55 * 1.6, sr, gain=0.35)
    w, pic = whoosh_buf(sr, 1.2, 90901, sens=1)
    poser(bus_fx, w, t_pis - pic, sr, gain=0.5)
    s = poser_bbc_ou(bus_fx, '07020021', 5.95, 1.0, 1.2, t_pis, 0.35, 'passage en trombe (F1)')
    ev(t_pis, 'passage en trombe (4 bolides Doppler + whoosh)', 'depart', fin=t_pis + 1.0, source='synthèse' + (' + ' + s if s else ''))
    t_logo_f = R['logo_final']
    d_cr = t_logo_f - (t_pis + 0.3)
    poser(bus_fx, riser(sr, d_cr, rd, f0=200.0, f1=12000.0, tonale=55), t_pis + 0.3, sr, gain=0.5)
    poser(bus_amb, rumeur_foule(sr, rd, t_logo_f - t_dem + 0.3) * np.linspace(0.3, 1.0, int((t_logo_f - t_dem + 0.3) * sr))[:, None],
          t_dem, sr, gain=0.14)
    tk_ = t_pis + 0.3
    pas = 0.375
    while tk_ < t_logo_f - 0.05:
        u = (tk_ - (t_pis + 0.3)) / d_cr
        poser(bus_mus, kit['k'], tk_, sr, gain=0.45 + 0.35 * u)
        poser(bus_mus, kit['s'], tk_ + pas / 2, sr, gain=0.15 + 0.4 * u ** 1.5)
        pas = max(0.09, pas * 0.9)
        tk_ += pas
    poser(bus_mus, v8.cuivres([45, 52, 57, 61, 64], d_cr, sr, 1.5, attaque=d_cr * 0.8) * np.linspace(0, 1, int(d_cr * sr))[:, None],
          t_pis + 0.3, sr, gain=0.3)
    ev(t_pis + 0.3, 'crescendo final (riser, roulement qui accélère, cuivres qui enflent, foule)', 'depart', fin=t_logo_f)
    # impact + jingle sur le logo, résonance jusqu'à la fin (éteinte avant 120,5 s)
    d_res = DUREE - 0.06 - t_logo_f
    imp = choc_dore(sr, rd)
    nres = int(d_res * sr)
    imp = imp[:nres] if imp.shape[0] >= nres else np.pad(imp, ((0, nres - imp.shape[0]), (0, 0)))
    poser(bus_fx, imp, t_logo_f, sr, gain=0.9)
    jg = jingle_dore(sr, rd)
    poser(bus_fx, jg, t_logo_f + 0.05, sr, gain=0.55)
    acc = v8.cuivres([36, 43, 48, 52, 55, 60, 64, 67], d_res, sr, 1.6, attaque=0.01)
    tr_ = temps(acc.shape[0], sr)
    acc *= (np.exp(-tr_ / 1.4) * np.cos(0.5 * np.pi * np.clip((tr_ - (d_res - 0.8)) / 0.8, 0, 1)))[:, None]
    poser(bus_mus, acc, t_logo_f, sr, gain=0.5)
    rs = nappe_accords(sr, d_res, [48, 55, 60, 64, 67, 72], rd, brillance=0.4, attaque=0.3, relache=0.9)
    poser(bus_mus, rs, t_logo_f, sr, gain=0.28)
    s = poser_bbc_ou(bus_fx, '07012094', 27.25, 0.05, 1.8, t_logo_f + 0.2, 0.18, 'grelots du logo final')
    ev(t_logo_f, 'IMPACT + jingle sur le logo final, résonance jusqu\'à la fin', 'depart', fin=DUREE - 0.06,
       source='synthèse' + (' + ' + s if s else ''))

    # ================================ MIX : voix, ducking, mastering ================================
    bus_voix = np.stack([vo, vo], axis=1) * GAIN_VOIX
    G = {'amb': 1.0, 'mus': 0.9, 'fx': 0.85, 'theme': 0.75, 'fam': 0.9}
    reste_brut = bus_amb * G['amb'] + bus_mus * G['mus'] + bus_fx * G['fx'] + bus_theme * G['theme'] + bus_fam * G['fam']
    reste_brut[int((DUREE - 0.06) * sr):] = 0.0
    reductions = [DUCK_BASE_DB] * len(iv_voix)
    for it in range(12):
        duck = courbe_ducking(iv_voix, reductions, N, sr) if iv_voix else np.ones(N)
        reste = reste_brut * duck[:, None]
        ok = True
        for j, r in enumerate(rapport_voix):
            r['marge_db'] = round(rms_db_fenetre(bus_voix, r['attaque'], r['fin']) - rms_db_fenetre(reste, r['attaque'], r['fin']), 1)
            if r['marge_db'] < MARGE_VOIX_DB and reductions[j] > DUCK_MAX_DB:
                reductions[j] = max(DUCK_MAX_DB, reductions[j] - (MARGE_VOIX_DB - r['marge_db']) - 0.3)
                ok = False
        if ok:
            break
    for j, r in enumerate(rapport_voix):
        r['ducking_db'] = round(reductions[j], 1)
    mix = reste + bus_voix
    mix *= fenetre(N, 0.01, 0.06, sr)[:, None]
    assert np.all(np.isfinite(mix)), 'NaN / Inf dans le mix'

    final, gain_db = masteriser(mix, sr)
    assert final.shape[0] == N, 'durée inexacte'
    pcm = ecrire_wav16(args.sortie, final, sr)
    relu = pcm.astype(float) / 32768.0
    lufs = lufs_integre(relu, sr)
    tp = crete_vraie_db(relu)
    assert tp <= PLAFOND_DBTP, 'vrai crête %.2f dBTP > %.1f' % (tp, PLAFOND_DBTP)
    assert abs(lufs - CIBLE_LUFS) <= 0.5, 'sonie %.2f LUFS hors tolérance' % lufs

    # contrôle par événement : RMS du mix (et du reste sans voix, après ducking/mastering) sur 0,5 s autour de l'instant
    g_lin = 10 ** (gain_db / 20.0)
    reste_master = reste * g_lin
    for e in evenements:
        t = e['t']
        e['rms_mix_db'] = round(rms_db_fenetre(relu, t - 0.25, t + 0.25), 1)
        e['rms_bruitages_db'] = round(rms_db_fenetre(reste_master, t - 0.05, t + 0.45), 1)
        e['rms_avant_db'] = round(rms_db_fenetre(reste_master, t - 0.75, t - 0.25), 1)
    muets = [e for e in evenements if e['rms_bruitages_db'] < -60.0]
    assert not muets, 'événements muets : %s' % [(e['t'], e['quoi']) for e in muets]
    for r in rapport_voix:
        r['rms_voix_db'] = round(rms_db_fenetre(relu, r['attaque'], r['fin']), 1)

    nb_reels = sum(1 for l in lignes_ec if not str(l['son_ecurie']['fichier']).startswith('synthèse'))
    timeline = {
        'version': 'v9',
        'duree': DUREE,
        'echantillons': int(final.shape[0]),
        'frequence_hz': sr,
        'canaux': 2,
        'plan': os.path.relpath(args.plan, ICI).replace(os.sep, '/'),
        'voix': os.path.relpath(args.voix, ICI).replace(os.sep, '/'),
        'reperes_son': R,
        'evenements': sorted(evenements, key=lambda x: (x['t'], x['quoi'])),
        'ecuries': lignes_ec,
        'musique_ring': infos_ring,
        'voix_off': rapport_voix,
        'intervalles_voix': [[round(a, 3), round(b, 3)] for a, b in iv_voix],
        'banque_bbc': {'dossier': os.path.relpath(bbc.dossier, ICI).replace(os.sep, '/'),
                       'licence': 'BBC Sound Effects — RemArc (usage personnel)', 'utilises': bbc.utilises},
        'mix': {'fichier': os.path.relpath(args.sortie, ICI).replace(os.sep, '/'), 'gain_master_db': round(gain_db, 2),
                'lufs_integre': round(lufs, 2), 'vrai_crete_dbtp': round(tp, 2),
                'methode': 'BS.1770-4 (filtres K exacts à 48 kHz, blocs 400 ms / 75 %, portes −70 LUFS et −10 LU) ; vrai crête par '
                           'suréchantillonnage ×4 ; limiteur à anticipation 5 ms sur la crête vraie, plafond −1,3 dBTP',
                'ducking': 'base %.0f dB, enveloppe lissée %d ms, approfondi jusqu\'à %.0f dB si la marge voix < +%.0f dB' % (
                    DUCK_BASE_DB, LISSAGE_DUCK * 1000, DUCK_MAX_DB, MARGE_VOIX_DB)},
        'bilan': {'ecuries_extrait_reel': nb_reels, 'pieces_voix': len(rapport_voix), 'chevauchement_voix': False,
                  'marge_voix_min_db': min([r['marge_db'] for r in rapport_voix], default=None),
                  'evenements': len(evenements)},
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.timeline)), exist_ok=True)
    with open(args.timeline, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)

    print('Mix V9 : %s' % args.sortie)
    print('  durée %.4f s (%d échantillons, attendu %d) | %d Hz | stéréo' % (final.shape[0] / sr, final.shape[0], N, sr))
    print('  sonie %.2f LUFS (BS.1770-4) | vrai crête %.2f dBTP | gain master %+.2f dB' % (lufs, tp, gain_db))
    if infos_ring:
        print('  ring : mesure %.4f s (%.2f BPM), boucle %s (%d mesures), raccords %s' % (
            infos_ring['periode_mesure_s'], infos_ring['bpm'], infos_ring['boucle_s'], infos_ring['mesures_par_boucle'],
            infos_ring['raccords_film_s']))
    print('  écuries : %d extraits réels | BBC utilisés : %s' % (nb_reels, ', '.join(sorted(bbc.utilises)) or 'aucun (synthèse)'))
    for r in rapport_voix:
        print('   voix %-14s %7.3f -> %7.3f s  brut %.3f s  atempo %.4f  marge %+5.1f dB  ducking %5.1f dB' % (
            r['id'], r['attaque'], r['fin'], r['duree_brute_s'], r['atempo'], r['marge_db'], r['ducking_db']))
    print('  timeline : %s (%d événements) | calcul %.1f s' % (args.timeline, len(evenements), time.time() - t_calc))
    return 0


if __name__ == '__main__':
    sys.exit(main())
