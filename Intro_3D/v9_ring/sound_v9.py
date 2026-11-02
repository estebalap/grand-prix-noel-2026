#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bande-son V9.5 « Grand Prix de Noël — Ring » : 136,53 s calées sur data/plan_v9.json (v9.4) et data/voix_v9.json (v9.5).
Ouverture : refrain de « Le Mal Aimé » SEUL 0 → 5,0 (temps fort mesuré à 0,81), arrêt de platine propre 5,0 → 5,15 + « tchk »,
puis salon seul (feu, salle) et narration « Mesdames et messieurs… » 5,6, « …le salon… » 8,0, « …se transforme… » 10,9,
« EEENNN » tenu 11,9 → 15,93 sur la vrille (riser, aspiration, crépitements, sans musique), « ARÈNE ! » 15,93 + impact + foule
+ Ring music (fil rouge). Écuries : moteurs réels du Showroom au premier plan, #08 bips Audi, #12 « Lero Lero ». Rush des
générations (voix rush_* : avertissement si absentes, --strict pour échouer). Fin : « Rendez-vous le 23 décembre… pour le…
GRAND… PRIX DE… NOËL ! » monté mot à mot (emphase stade et impact sur chaque mot, musique qui ponctue NOËL).
(Historique détaillé des versions V9.2–V9.4 ci-dessous.)

Bande-son V9.3 « Grand Prix de Noël — Ring » : 131,0 s calées sur data/plan_v9.json et data/voix_v9.json (version v9.3).
Ouverture et arène : temps film = temps interne (remap identité, vérifié) ; familles : carte du temps (vers_film).

  0 → 11 s        CRESCENDO sur Claude François « Le Mal Aimé » (audio/sources, lu dès 18,22 s du fichier : le temps fort
                  MESURÉ du refrain, 29,22 s, tombe pile à 11,0 sur « EN ARÈNE ! ») : 0 → 2 radio lointaine étouffée
                  (passe-bas 500 Hz, −28 dB) + braises ; 2 → 5,5 le salon s'allume (filtre qui s'ouvre, clochettes discrètes
                  sur la cascade des guirlandes) ; 6,8 déclic de la télé ; 7,6 → 11 VRILLE (riser qui accélère, aspiration,
                  crépitements électriques, la musique monte au plein niveau) ; 11,0 temps fort + impact sub + clameur.
                  Voix : accueil 1,0 ; « Mais ce soir… » 5,6 ; « …le salon… » 6,9 ; « …se transforme… » 8,4 ; « EN ARÈNE ! » 11,0.
  11 → 16,04      le refrain continue sous l'arrivée, fondu enchaîné vers la RING MUSIC sur une mesure de « Le Mal Aimé ».
  16,04 → 131     RING MUSIC du client, fil rouge (boucle sur les temps forts, atempo pour que le logo 128,0 tombe sur un temps
                  fort ; ducking sous la voix ; pause de rythme à Gotham, retrait pendant le suspense du conteneur, retour plein
                  à l'embrasement ; résonance finale jusqu'à 131).
  15,15 → 78,7    ÉCURIES : swoosh grave à chaque bandeau, mouvement discret (≤ −14 dB sous la musique), MOTEURS RÉELS DU
                  SHOWROOM au premier plan (sounds/moteurs_reels/NN/banque.json, comme shared/engine_audio.js en mode « réel » :
                  ralenti bouclé + coups de gaz, ou bandes multi-régimes), temps fort dans les respirations de la voix (accent
                  +4 dB), ducking doux de 3 dB sous la parole, garde-fou voix +6 dB ; #08 : + 3 bips Audi ; #04 : « Le Mal Aimé »
                  REFRAIN 2 (temps fort mesuré calé sur l'atterrissage). RUSH 78,7 → 83,7 (#08 #03 #02 #10) : impact sub +
                  stinger du moteur réel à chaque coupe. Portail de la couronne 85,1.
  86,1 → 96,1     FAMILLES : Gotham (entrée en fondu, PAUSE de rythme 86,1 → 87,6 : pluie, tonnerre, nappe sombre), F1 (bips),
                  Tokyo (vraie course : dépassements Doppler croisés, crissements) ; swoosh + glitch (discret vers Tokyo).
  96,1 → 105,5    CASINO : ka-ching, pièces d'or, roulette, swoosh rouge du piège.
  105,5 → 114,5   CONTENEUR : descente, impact lourd, SUSPENSE (musique retirée, battements de cœur, grincements, verrous un à
                  un dès 109,3, souffle, rideau lent 110,5 → 113,2), trophée 113,4, TOUT S'ENFLAMME 113,6 (pyro, feux
                  d'artifice, foule, musique pleine).
  114,5 → 131     GLOIRE (« la gloire éternelle » en emphase stade, impacts 116,4 / 117,4, foule, fanfare), FIN plus pleine
                  (foule, moteurs qui passent, feux d'artifice), final musical sur le logo 128,0, résonance jusqu'à 131.
VOIX : UNE prise continue par pièce ; bornes vérifiées à −48 dB et élargies jusqu'au vrai silence (outils_v9/decoupe_voix.py),
jonctions de prises collées posées au creux le plus bas, jamais de coupe de syllabe ; pas de time-stretch si la pièce tient dans
son créneau, sinon atempo ≤ atempo_max puis débordement naturel ≤ 0,3 s ; aucune voix ne se chevauche.

Réutilise par IMPORT la bande-son V8 (../v8_finale/sound_v8.py, non modifiée) et la V7 à travers elle.
Sorties : audio/mix_v9.wav (48 kHz stéréo 16 bit, 131,0 s exactement, −16 LUFS BS.1770-4, vrai crête ≤ −1 dBTP), audio/mix_v9.mp3
(320 kb/s) et data/timeline_v9.json (événements, voix, corrections de bornes, contrôles). Les sons sous droits (ring music,
Claude François, carillon Audi) sont LUS dans audio/ (ignoré par git), jamais copiés dans le dépôt ; moteurs CC0 / CC BY.
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
sys.path.insert(0, os.path.join(ICI, 'outils_v9'))
import decoupe_voix as dv  # noqa: E402

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
# L02 « Le salon… se transforme en… ARÈNE ! » : la borne 2,14 / 2,15 du JSON tombe dans le /s/ de « se » (fricative 1,98 → 2,15,
# creux de −32 dB au milieu) ; « salon » finit à 1,96 (creux −28 dB) → la jonction est déplacée au creux 1,88–1,99.
# Montage « Rendez-vous le 23 décembre… pour le… GRAND… PRIX DE… NOËL ! » (mots pris dans des prises existantes) :
# pauses après chaque morceau (croissantes avant GRAND / PRIX DE / NOËL), morceaux en emphase stade, et bornes de mots
# affinées au creux réel (fenêtres choisies d'après la transcription mot à mot et l'enveloppe 10 ms).
MONTAGE = {'rendez_vous_final': {'pauses': [0.15, 0.02, 0.20, 0.28, 0.36], 'emphase': [3, 4, 5],
                                 'bornes': {0: ((102.70, 102.76), None),            # « Rendez-vous le 23 décembre » d'une traite
                                            1: ((98.65, 98.72), (98.79, 98.85)),    # « pour » (de « pour lui » : le /l/ suit sans creux)
                                            2: ((1.13, 1.16), (1.54, 1.57)),       # « le » (de « le salon » : le /s/ commence à 1,58)
                                            3: ((2.28, 2.35), (2.58, 2.67)),       # « GRAND »
                                            4: ((2.58, 2.67), (2.90, 2.96)),       # « PRIX DE »
                                            5: ((2.90, 2.96), (3.64, 3.70))}}}     # « NOËL ! » (jusqu'au creux avant « ce soir »)
BORNES_FIXES = {'en_tenu': ('debut', 'fin'), 'arene_cri': ('debut',)}
JONCTIONS_REVUES = {'mesdames': {'fin': (1.17, 1.25, '« bien(venue) » commence à 1,26 s (« messieurs » finit au creux de 1,21)')},
                    'salon': {'fin': (1.88, 1.99, '« se » commence à 1,98 s (fricative /s/)')},
                    'transforme': {'debut': (1.88, 1.99, '« se » commence à 1,98 s (fricative /s/)')}}
GAP_MORCEAUX = 0.03             # écurie 7 : silence entre la prise anglaise et la fin
RETARD_MAX = 0.30               # une pièce peut attendre la fin de la précédente d'au plus 0,3 s
DEBORD_MAX = 0.30               # débordement naturel maximal au-delà du créneau
GAIN_EMPHASE_DB = 2.0           # « la gloire… ÉTERNELLE » : +2 dB (annonceur de stade)

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
# Carte du temps V9.1 (même règle que noyau_v9.js → versFilm)
# ----------------------------------------------------------------------------------------------
def morceau_interne(seg_def, ti):
    """Premier morceau [filmA, filmB, interneA, interneB] du remap qui contient l'instant interne ti (bornes comprises)."""
    remap = seg_def.get('remap')
    if not remap:
        return None
    for m in remap:
        a, b, c, d = (float(v) for v in m)
        if min(c, d) - 1e-9 <= ti <= max(c, d) + 1e-9:
            return a, b, c, d
    return None


def vers_film(seg_def, ti):
    """Temps INTERNE du segment → temps FILM. Sans remap : décalage simple (debut − origine). Lève ValueError si l'instant
    tombe dans une partie coupée au montage (aucun morceau ne le contient)."""
    if not seg_def.get('remap'):
        return float(ti) + float(seg_def['debut']) - float(seg_def.get('origine', seg_def['debut']))
    m = morceau_interne(seg_def, float(ti))
    if m is None:
        raise ValueError('segment %s : instant interne %.3f s coupé au montage' % (seg_def['id'], ti))
    a, b, c, d = m
    return a + (float(ti) - c) * (b - a) / (d - c)


def vers_film_ou_none(seg_def, ti):
    try:
        return vers_film(seg_def, ti)
    except ValueError:
        return None


def duree_film(seg_def, ti, delta):
    """Durée interne delta (commençant à ti) → durée film : delta × (filmB − filmA) / (interneB − interneA) du morceau."""
    m = morceau_interne(seg_def, float(ti))
    if m is None:
        return float(delta)
    a, b, c, d = m
    return float(delta) * (b - a) / (d - c)


def tester_carte_du_temps(seg):
    """Auto-test des conversions demandées (arène, familles, ouverture, durée accélérée)."""
    cas = [('arene', 15.5, 12.6), ('arene', 99.5, 90.6), ('familles', 1.8, 81.6), ('ouverture', 8.8, 6.8),
           ('arene', 84.5, 81.6), ('arene', 122.5, 113.6), ('ouverture', 0.0, 0.0), ('ouverture', 15.5, 12.6),
           ('familles', 5.7, 84.6), ('familles', 11.0, 87.6), ('ouverture', 8.95, 6.95), ('arene', 120.0, 111.1)]
    for sid, ti, attendu in cas:
        obtenu = vers_film(seg[sid], ti)
        assert abs(obtenu - attendu) < 1e-6, 'carte du temps : %s %.3f → %.4f (attendu %.4f)' % (sid, ti, obtenu, attendu)
    assert abs(duree_film(seg['ouverture'], 1.0, 1.4) - 1.0) < 1e-9          # morceau 0 → 5 / 0 → 7 : ×5/7
    assert abs(duree_film(seg['ouverture'], 14.5, 1.5) - 1.0) < 1e-9         # morceau 11,6 → 12,6 / 14 → 15,5 : ×1/1,5
    assert abs(duree_film(seg['arene'], 50.0, 2.0) - 2.0) < 1e-9             # arène : vitesse 1
    assert vers_film_ou_none(seg['familles'], 5.6) is None and vers_film_ou_none(seg['familles'], 9.5) is None
    return len(cas) + 4


# ----------------------------------------------------------------------------------------------
# Bruitages V9.1 (ouverture propre, gloire, lootbox)
# ----------------------------------------------------------------------------------------------
def feu_net(sr, rng, duree):
    """Feu de cheminée NET : craquements secs et espacés (≈ 5 par seconde, jamais en nappe), quelques claquements de
    bois plus ronds, et un souffle doux (passe-haut 80 Hz, bande 120–900 Hz) très en dessous. Rien de large bande épais."""
    n = int(duree * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    vac = filtre_bande(rng.standard_normal(n), sr, 0.25, 1.5, ordre=1)
    vac = 0.8 + 0.2 * vac / (np.max(np.abs(vac)) + 1e-9)
    for c in range(2):
        s = norme(filtre_bande(rng.standard_normal(n), sr, 120.0, 900.0, ordre=2))
        out[:, c] = 0.07 * s * vac
    tc = 0.12
    while tc < duree - 0.06:
        i0 = int(tc * sr)
        a = float(np.clip(0.25 + 0.75 * rng.pareto(3.0) * 0.5, 0.2, 1.0))
        pan = float(rng.uniform(-0.45, 0.45))
        nb = 1 if rng.random() < 0.75 else int(rng.integers(2, 4))       # parfois un double / triple craquement
        for j in range(nb):
            d = float(rng.uniform(0.0012, 0.0035))
            ng = int(min(7 * d, 0.025) * sr)
            tg = temps(ng, sr)
            g = filtre_bande(rng.standard_normal(ng), sr, 1800.0, 7500.0) * np.exp(-tg / d) * montee(tg, 0.00015)
            poser(out, norme(g), tc + 0.018 * j * float(rng.uniform(0.7, 1.4)), sr, pan=pan, gain=a * (0.8 ** j) * 0.55)
        if rng.random() < 0.16:                                           # claquement de bois (plus rond, plus rare)
            ng = int(0.05 * sr)
            tg = temps(ng, sr)
            f = float(rng.uniform(700, 1500))
            g = (0.6 * np.sin(2 * np.pi * f * tg) + filtre_bande(rng.standard_normal(ng), sr, 500.0, 4000.0)) * np.exp(-tg / 0.006)
            poser(out, norme(g * montee(tg, 0.0003)), tc + 0.05, sr, pan=-pan, gain=0.35)
        tc += 0.07 + float(rng.exponential(0.16))                        # espacés : intervalle minimal 70 ms
    out = np.stack([filtre_bande(out[:, c], sr, 80.0, 10000.0, ordre=2) for c in range(2)], axis=1)
    return out * fenetre(n, 0.5, 0.05, sr)[:, None]


def choc_logo_clair(sr, rng, notes):
    """Choc doré du logo, version CLAIRE : sub-boom + grosse caisse (grave), cymbale + shimmer + cloches (aigu),
    rien dans le médium 300 Hz–2,5 kHz où arrive la voix 0,15 s plus tard. notes : cloches dans la tonalité de la musique."""
    n = int(3.0 * sr)
    out = np.zeros((n, 2))
    poser(out, sub_drop(sr, 1.8, 110.0, 32.0, 0.45), 0.0, sr, gain=1.0)
    poser(out, v8.grosse_caisse(sr, rng, 42.0, 140.0, 0.25, 0.8, 0.35), 0.0, sr, gain=0.8)
    poser(out, stereo(v8.cymbale(sr, rng, 2.4, 0.8)), 0.0, sr, gain=0.32)
    poser(out, shimmer(sr, rng, 2.6, 3500.0, 10000.0, 22), 0.02, sr, gain=0.28)
    for i, m in enumerate(notes):
        poser(out, stereo(cloche(midi_hz(m), 1.4, sr, 0.8), -0.5 + 0.33 * i), 0.03 + 0.05 * i, sr, gain=0.16)
    q = queue_reverbe(out, sr, 1.6, 22)
    q = np.stack([filtre_bande(q[:, c], sr, 2500.0, None) for c in range(2)], axis=1)   # réverbe seulement dans l'aigu
    res = np.zeros((max(n, q.shape[0]), 2))
    res[:n] += out
    res[:q.shape[0]] += 0.22 * q
    return res


def queue_reverbe(sig, sr, rt60, graine, pre=0.03):
    """Réverbe 100 % humide (IR semée de la V7, pré-délai pre s) : renvoie (n + queue, 2) sans le signal sec."""
    il, ir = v7.ir_stereo(sr, rt60=rt60, pre=pre, graine=graine)
    m = sig if sig.ndim == 1 else sig.mean(axis=1)
    return np.stack([v7.convolution(m, il), v7.convolution(m, ir)], axis=1)


def compresser(y, sr, ratio=2.5, seuil_rel_db=-10.0, fen=0.012):
    """Compression légère d'une voix (mono) : au-dessus de (crête d'enveloppe + seuil_rel_db), le niveau est réduit selon
    ratio ; enveloppe RMS lissée sur fen s ; gain de rattrapage pour retrouver le RMS d'origine."""
    nw = max(1, int(fen * sr))
    env = np.sqrt(np.convolve(y ** 2, np.ones(nw) / nw, 'same') + 1e-12)
    lv = 20 * np.log10(env)
    seuil = float(lv.max()) + seuil_rel_db
    red = np.where(lv > seuil, (lv - seuil) * (1.0 - 1.0 / ratio), 0.0)
    g = 10 ** (-np.convolve(red, np.hanning(nw * 2 + 1) / np.hanning(nw * 2 + 1).sum(), 'same') / 20.0)
    z = y * g
    return z * (rms(y) / (rms(z) + 1e-12))


def voix_stade(y, sr, graine):
    """Traitement « annonceur de stade » : échos de grande salle (180 / 370 / 560 ms, décroissants, assombris) + réverbe
    de grande salle 1,8 s (pré-délai 45 ms). Renvoie la partie HUMIDE seule (stéréo), le sec reste sur la piste voix."""
    q = queue_reverbe(y, sr, 1.8, graine, pre=0.045)
    n = q.shape[0]
    ech = np.zeros((n, 2))
    sombre = filtre_bande(y, sr, 250.0, 3800.0)
    for k, (d, g, pan) in enumerate(((0.18, 0.42, -0.55), (0.37, 0.26, 0.55), (0.56, 0.15, -0.3))):
        poser(ech, sombre, d, sr, pan=pan, gain=g)
    return ech + 0.85 * q


def feu_artifice(sr, rng, taille=1.0):
    """Éclat de feu d'artifice : départ sourd + détonation (sub + souffle) + pluie d'étincelles qui crépitent, stéréo."""
    n = int(2.6 * sr)
    out = np.zeros((n, 2))
    poser(out, sub_drop(sr, 1.2, 95.0, 30.0, 0.25), 0.0, sr, gain=0.9 * taille)
    nb = int(0.5 * sr)
    tb = temps(nb, sr)
    fh = lambda tt: 600.0 + 7000.0 * math.exp(-tt / 0.08)
    sf = norme(v7.filtre_variable(rng.standard_normal(nb), sr, fh)) * montee(tb, 0.002) * np.exp(-tb / 0.12)
    poser(out, sf, 0.0, sr, gain=0.35 * taille)
    tc = 0.12
    while tc < 2.3:
        nc = int(0.02 * sr)
        tt = temps(nc, sr)
        pop = filtre_bande(rng.standard_normal(nc), sr, 2500.0, 11000.0) * np.exp(-tt / 0.0025) * montee(tt, 0.0002)
        poser(out, norme(pop), tc, sr, pan=float(rng.uniform(-0.9, 0.9)), gain=float(rng.uniform(0.1, 0.35)) * math.exp(-(tc - 0.12) / 0.8))
        tc += float(rng.exponential(1.0 / 40.0))
    return out * fenetre(n, 0.0, 0.5, sr)[:, None]


def choeur_dore(sr, rng, duree, midis):
    """Chœur « aah » doré qui monte : 3 voix par note (désaccord, vibrato 5,3 Hz), harmoniques pondérées par les formants
    de la voyelle [a] (800 / 1150 / 2900 Hz), crescendo continu, stéréo large."""
    n = int(duree * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    formants = ((800.0, 1.0, 120.0), (1150.0, 0.6, 140.0), (2900.0, 0.25, 260.0))

    def poids(f):
        return 0.05 + sum(a / (1.0 + ((f - fc) / bw) ** 2) for fc, a, bw in formants)
    for m in midis:
        f0 = midi_hz(m)
        for det, pan in ((0.996, -0.7), (1.0, 0.0), (1.004, 0.7)):
            vib = 1.0 + 0.004 * np.sin(2 * np.pi * float(rng.uniform(4.8, 5.8)) * t + float(rng.uniform(0, 6.28)))
            ph = phase_continue(f0 * det * vib, sr)
            x = np.zeros(n)
            h = 1
            while f0 * h < 6000.0 and h <= 30:
                x += poids(f0 * h) * np.sin(h * ph) / h ** 0.3
                h += 1
            out += stereo(x, pan)
    env = (np.clip(t / duree, 0, 1) ** 1.6)
    return norme(out * (env * fenetre(n, 0.3, 0.6, sr))[:, None])


def jingle_cle(sr, rng, notes, accord):
    """Jingle doré dans la tonalité : arpège de cloches montant + shimmer + petit accord de cuivres."""
    n = int(1.8 * sr)
    out = np.zeros((n, 2))
    for i, m in enumerate(notes):
        poser(out, stereo(cloche(midi_hz(m), 0.9, sr, 0.8), -0.6 + 1.2 * i / max(1, len(notes) - 1)), 0.055 * i, sr, gain=0.5)
    poser(out, shimmer(sr, rng, 1.5, 4000.0, 10000.0, 18), 0.25, sr, gain=0.3)
    poser(out, v8.cuivres(accord, 0.8, sr, 1.0), 0.38, sr, gain=0.35)
    return out


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



PROFIL_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
PROFIL_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def tonalite(x, sr):
    """Tonalité estimée (Krumhansl-Schmuckler) d'un extrait stéréo : chromagramme moyen 80 Hz–4 kHz corrélé aux profils
    majeur / mineur. Retourne (tonique 0..11, 'majeur' | 'mineur', score)."""
    m = x.mean(axis=1)
    nfft, hop = 8192, 4096
    win = np.hanning(nfft)
    f = np.fft.rfftfreq(nfft, 1.0 / sr)
    sel = (f > 80.0) & (f < 4000.0)
    pc = (np.round(12 * np.log2(f[sel] / 440.0)) + 9) % 12
    chroma = np.zeros(12)
    for i in range(0, m.shape[0] - nfft, hop):
        S = np.abs(np.fft.rfft(m[i:i + nfft] * win))[sel]
        chroma += np.bincount(pc.astype(int), weights=S, minlength=12)
    best = (-2.0, 0, 'majeur')
    for k in range(12):
        for prof, nom in ((PROFIL_MAJ, 'majeur'), (PROFIL_MIN, 'mineur')):
            r = float(np.corrcoef(chroma, np.roll(prof, k))[0, 1])
            if r > best[0]:
                best = (r, k, nom)
    return best[1], best[2], round(best[0], 3)


def accord_midi(tonique, mode, base=48, voix=(0, 7, 12, 16, 19, 24)):
    """Accord de tonique (majeur ou mineur) : intervalles de `voix` (la tierce 4 devient 3 en mineur), base = do grave."""
    t3 = 3 if mode == 'mineur' else 4
    out = []
    for v in voix:
        o, r = divmod(v, 12)
        r = t3 if r == 4 else r
        out.append(base + tonique + 12 * o + r)
    return out


def musique_ring_continue(sr, chemin, t_debut, t_logo, t_fin):
    """Ring music continue de t_debut (temps fort) à t_logo (temps fort final), puis résonance jusqu'à t_fin.
    La section [S, S + K mesures] (K multiple de 4) se répète, raccords en fondu enchaîné à puissance égale de 40 ms
    centrés sur un premier temps. La lecture est étirée d'un facteur r ≈ 1 par ffmpeg atempo (hauteur inchangée)
    pour que t_logo − t_debut = un nombre ENTIER de mesures : le logo final tombe sur un temps fort.
    Au logo : la musique joue encore 0,30 s (le temps fort) puis s'éteint en 0,25 s ; sa résonance (réverbe 100 % humide
    5 s du dernier temps fort) tient jusqu'à t_fin. Retourne (stéréo de t_debut à t_fin, infos, extrait d'analyse)."""
    t_fen0 = FENETRE_RING[0] - 3.0
    x = v7.decoder_ffmpeg(chemin, sr, t_fen0, FENETRE_RING[1] - t_fen0 + 3.0)
    P, t1 = analyser_ring(x, sr, t_fen0)
    K = int((FENETRE_RING[1] - t1) / P) // 4 * 4
    nb_mesures = int(round((t_logo - t_debut) / P))
    P2 = (t_logo - t_debut) / nb_mesures
    r = P2 / P
    # étirement : rééchantillonnage FFT de tout l'extrait (longueur × r)
    xs = atempo_stereo(x, sr, 1.0 / r)                     # étirement sans changer la hauteur (WSOLA)
    S2 = (t1 - t_fen0) * r                                  # premier temps, en s dans l'extrait étiré
    Lp = K * P2
    xf = 0.040
    n_out = int(round((t_fin - t_debut) * sr))
    out = np.zeros((n_out, 2))
    nxf = int(xf * sr)
    h = nxf // 2
    up = np.sin(0.5 * np.pi * np.arange(nxf) / nxf)[:, None]
    dn = np.cos(0.5 * np.pi * np.arange(nxf) / nxf)[:, None]
    i_S = int(round(S2 * sr))
    n_lp = int(round(Lp * sr))
    copie = xs[i_S - h:i_S + n_lp + h].copy()
    copie[:nxf] *= up
    copie[-nxf:] *= dn
    n_logo = int(round((t_logo - t_debut) * sr))
    n_jeu = n_logo + int(0.55 * sr)
    k, raccords = 0, []
    while k * n_lp - h < n_jeu:
        i0 = k * n_lp - h
        a, b = max(0, -i0), min(copie.shape[0], n_jeu - i0)
        if b > a:
            out[i0 + a:i0 + b] += copie[a:b]
        if k > 0:
            raccords.append(round(t_debut + k * n_lp / sr, 3))
        k += 1
    out[:2 * h] = xs[i_S:i_S + 2 * h]                       # attaque nette sur le premier temps (fondu 10 ms ci-dessous)
    tt = np.arange(n_out) / sr
    env = np.sin(0.5 * np.pi * np.clip(tt / 0.010, 0, 1))
    t_l = t_logo - t_debut
    env *= np.cos(0.5 * np.pi * np.clip((tt - (t_l + 0.30)) / 0.25, 0, 1))
    out *= env[:, None]
    actif = out[int(1.0 * sr):n_logo - int(0.5 * sr)]
    norme_g = 10 ** (-18.0 / 20.0) / (rms(actif) + 1e-9)    # référence : −18 dBFS RMS avant le gain de bus
    out *= norme_g
    # résonance : dernier temps fort (logo − 0,05 → logo + 0,55) dans une grande réverbe (5 s), éteinte à t_fin
    i_a, i_b = n_logo - int(0.05 * sr), n_logo + int(0.55 * sr)
    stab = out[i_a:i_b] * fenetre(i_b - i_a, 0.005, 0.15, sr)[:, None]
    q = queue_reverbe(stab, sr, 5.0, 77, pre=0.02)
    q = np.stack([filtre_bande(q[:, c], sr, 70.0, None) for c in range(2)], axis=1)
    q *= 0.7 * rms(stab) / (rms(q[:int(0.6 * sr)]) + 1e-12)
    nq = min(q.shape[0], n_out - i_a)
    q = q[:nq] * fenetre(nq, 0.0, 0.20, sr)[:, None]
    out[i_a:i_a + nq] += q
    n_fin_jeu = n_logo + int(0.55 * sr)
    analyse = xs[i_S:i_S + n_lp]
    infos = {'source': 'audio/sources/ring_music.mp3', 'periode_mesure_mesuree_s': round(float(P), 4),
             'bpm_mesure': round(240.0 / float(P), 2), 'etirement': round(float(r), 6),
             'periode_mesure_film_s': round(float(P2), 4), 'bpm_film': round(240.0 / float(P2), 2),
             'premier_temps_fichier_s': round(float(t1), 3), 'boucle_fichier_s': [round(float(t1), 3), round(float(t1 + K * P), 3)],
             'mesures_par_boucle': int(K), 'mesures_logo_a_logo': nb_mesures,
             'raccords_film_s': raccords, 'debut_film_s': t_debut, 'temps_fort_final_film_s': t_logo,
             'extinction_film_s': [round(t_logo + 0.30, 3), round(t_logo + 0.55, 3)],
             'resonance_film_s': [round(t_logo - 0.05, 3), round(t_debut + (i_a + nq) / sr, 3)],
             'fin_jeu_echantillon': n_fin_jeu}
    return out, infos, analyse


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
    """Voix off V9.2 : UNE prise continue par pièce (voix_v9.json : morceaux, t_film, atempo_max, emphase, fondu).
    1. bornes vérifiées à −48 dB et élargies jusqu'au vrai silence (outils_v9/decoupe_voix.py), zones non silencieuses
       entre deux prises collées rattachées à la pièce suivante (rien n'est jeté) ;
    2. créneau = t_film de la pièce suivante − 0,10 s ; aucun time-stretch si la pièce y tient ; sinon atempo doux
       ≤ atempo_max, puis débordement naturel ≤ 0,3 s ; si la pièce précédente déborde, la suivante attend
       (fin précédente + 0,02 s, retard ≤ 0,3 s) — jamais de coupe ;
    3. emphase « stade » (compression légère + 2 dB + échos/grande salle sur piste séparée) : toute la pièce, ou sa queue
       (`emphase_depuis` : silence avant « la gloire éternelle ») ;
    4. contrôle : aucune voix ne se chevauche ; aucune coupure interne (enveloppe source vs enveloppe placée).
    Retourne (piste mono, humide stéréo, intervalles, rapport, corrections de bornes)."""
    cache_rendu, cache_env = {}, {}
    nf_def = 0.025
    # --- 1. bornes
    bornes = []
    for p in pieces:
        for k, m_ in enumerate(p['morceaux']):
            fic, a, b = m_[0], m_[1], m_[2]
            ch = os.path.join(ICI, fic)
            if fic not in cache_env:
                brut = v7.decoder_ffmpeg(ch, sr, canaux=1)[:, 0]
                cache_env[fic] = dv.enveloppe_db(brut, sr)[:2] + (brut,)
                cache_rendu[fic] = v7.decoder_ffmpeg(ch, sr, filtre=v8.FILTRE_VOIX_V8, canaux=1)[:, 0]
            ts, e, _ = cache_env[fic]
            if a is None or b is None:                       # bornes None : fichier entier rogné aux silences (−48 dB)
                fort = np.where(e > dv.SEUIL_SILENCE_DB)[0]
                a = float(ts[fort[0]]) - 0.02 if a is None else a
                b = float(ts[fort[-1]]) + 0.03 if b is None else b
                a, b = max(0.0, a), min(float(ts[-1]), b)
            ca, ra = dv.corriger_borne(ts, e, float(a), -1)
            cb, rb = dv.corriger_borne(ts, e, float(b), +1)
            bornes.append({'id': '%s#%d' % (p['id'], k), 'piece': p['id'], 'k': k, 'fichier': fic, 'debut': ca, 'fin': cb,
                           'debut_json': float(a), 'fin_json': float(b), 'statut_debut': ra['statut'], 'statut_fin': rb['statut'],
                           'niveau_debut_db': ra.get('niveau_corrige_db', ra['niveau_db']),
                           'niveau_fin_db': rb.get('niveau_corrige_db', rb['niveau_db'])})
    for b in bornes:                                         # jonctions revues (transcription + spectre), voir JONCTIONS_REVUES
        for cote, (wa, wb, motif) in JONCTIONS_REVUES.get(b['piece'], {}).items():
            ts, e, _ = cache_env[b['fichier']]
            w = (ts >= wa) & (ts <= wb)
            tj = float(ts[w][np.argmin(e[w])])
            b[cote] = tj
            b['statut_' + cote] = 'jonction revue : ' + motif
            b['niveau_%s_db' % cote] = round(float(e[w].min()), 1)
    jonctions = dv.harmoniser_jonctions([b for b in bornes if b['piece'] not in MONTAGE],   # les mots du montage sont des citations
                                        {f: v[:2] for f, v in cache_env.items()})
    par_id = {b['id']: b for b in bornes}
    for pid, mt in MONTAGE.items():                          # bornes de mots du montage : creux réel dans la fenêtre
        for k, fen in mt['bornes'].items():
            b = par_id.get('%s#%d' % (pid, k))
            if b is None:
                continue
            ts, e, _ = cache_env[b['fichier']]
            for cote, w_ in zip(('debut', 'fin'), fen):
                if w_ is None:
                    continue
                w = (ts >= w_[0]) & (ts <= w_[1])
                b[cote] = float(ts[w][np.argmin(e[w])])
                b['statut_' + cote] = 'mot : creux réel dans %s' % (list(w_),)
                b['niveau_%s_db' % cote] = round(float(e[w].min()), 1)
    for pid, cotes in BORNES_FIXES.items():                  # bornes imposées (voyelle tenue, attaque du cri)
        b = par_id.get('%s#0' % pid)
        if b is None:
            continue
        for cote in cotes:
            b[cote] = b[cote + '_json']
            b['statut_' + cote] = 'fixée (jonction voyelle tenue)'
        for b2 in bornes:                                    # le voisin de même prise ne doit pas empiéter
            if b2 is not b and b2['fichier'] == b['fichier'] and b2['piece'] not in MONTAGE:
                if b2['debut'] < b['debut'] < b2['fin'] <= b['fin'] + 1e-9:
                    b2['fin'] = b['debut']
                if b['debut'] <= b2['debut'] - 1e-9 and b2['debut'] < b['fin'] < b2['fin']:
                    b2['debut'] = b['fin']
    corrections = []
    for b in bornes:
        if abs(b['debut'] - b['debut_json']) > 1e-4 or abs(b['fin'] - b['fin_json']) > 1e-4:
            corrections.append({'piece': b['id'], 'fichier': b['fichier'],
                                'debut': [b['debut_json'], round(b['debut'], 3), b['statut_debut'], b['niveau_debut_db']],
                                'fin': [b['fin_json'], round(b['fin'], 3), b['statut_fin'], b['niveau_fin_db']]})
    for j in jonctions:
        for c in corrections:
            if c['piece'] == j['piece']:
                if 'chevauchement' in j:
                    c['debut'][1], c['debut'][2] = j['jonction'], 'jonction au creux du chevauchement (%.1f dB)' % j['zone_db_min']
                else:
                    c['debut'][1], c['debut'][2] = j['debut_apres'], 'rattachement (zone %.1f dB entre prises collées)' % j['zone_db_min']
            if c['piece'] == j.get('piece_precedente'):
                c['fin'][1], c['fin'][2] = j['jonction'], 'jonction au creux du chevauchement (%.1f dB)' % j['zone_db_min']
    # --- 2. assemblage et placement
    piste = np.zeros(N)
    humide = np.zeros((N, 2))
    intervalles, rapport, controles = [], [], []
    fin_prec = -1.0
    for ip, p in enumerate(pieces):
        nf = int(float(p.get('fondu', nf_def)) * sr)
        parts, parts_brut = [], []
        for k in range(len(p['morceaux'])):
            b = par_id['%s#%d' % (p['id'], k)]
            i0, i1 = int(round(b['debut'] * sr)), int(round(b['fin'] * sr))
            seg = cache_rendu[b['fichier']][i0:i1].copy()
            brut = cache_env[b['fichier']][2][i0:i1].copy()
            seg[:nf] *= np.sin(0.5 * np.pi * np.arange(nf) / nf)
            seg[-nf:] *= np.cos(0.5 * np.pi * np.arange(nf) / nf)
            if k > 0:
                gap = MONTAGE[p['id']]['pauses'][k - 1] if p['id'] in MONTAGE else GAP_MORCEAUX
                parts.append(np.zeros(int(gap * sr)))
                parts_brut.append(np.zeros(int(gap * sr)))
            parts.append(seg)
            parts_brut.append(brut)
        y, y_brut = np.concatenate(parts), np.concatenate(parts_brut)
        d = y.shape[0] / sr
        t_suiv = float(pieces[ip + 1]['t_film']) if ip + 1 < len(pieces) else duree
        prec_tenue = ip > 0 and pieces[ip - 1].get('tenir_jusqua') is not None
        t0 = max(float(p['t_film']), fin_prec if prec_tenue else fin_prec + 0.02)
        if p.get('tenir_jusqua') is not None:               # « EEENNN » : voyelle tenue jusqu'à l'arrivée du cri
            d_t = float(p['tenir_jusqua']) - t0
            b0 = par_id['%s#0' % p['id']]
            src = cache_rendu[b0['fichier']][int(round(b0['debut'] * sr)):int(round(b0['fin'] * sr))]
            y, info_t = tenir_voyelle(src, sr, d_t)
            poser(humide, queue_reverbe(y, sr, 1.2, 400 + ip, pre=0.02), t0, sr, gain=0.35)
            i = int(round(t0 * sr))
            piste[i:i + y.shape[0]] += y[:max(0, N - i)]
            fin = float(p['tenir_jusqua'])
            intervalles.append((t0, fin))
            controles.append({'id': p['id'], 'zones_coupees': []})
            rapport.append({'id': p['id'], 'texte': p.get('texte', ''), 'morceaux_json': p['morceaux'],
                            'bornes': [[round(b0['debut'], 3), round(b0['fin'], 3)]], 't_film_json': p['t_film'],
                            'attaque': round(t0, 3), 'fin': round(fin, 3), 'retard_s': round(t0 - float(p['t_film']), 3),
                            'creneau_s': round(fin - t0, 3), 'duree_prise_s': round(d, 3), 'atempo': 1.0, 'atempo_max': 1.0,
                            'duree_finale_s': round(fin - t0, 3), 'debordement_s': 0.0, 'emphase': False, 'emphase_depuis_s': None,
                            'voyelle_tenue': info_t})
            fin_prec = fin
            continue
        creneau = t_suiv - 0.10 - t0
        amax = float(p.get('atempo_max', 1.0))
        facteur = 1.0
        if d > creneau:
            facteur = min(d / creneau, amax)
        y_place = np.concatenate([q * 1.0 for q in parts_brut])     # prise brute montée exactement comme la piste
        o = 0
        for q in parts:
            if q.any():
                y_place[o:o + nf] *= np.sin(0.5 * np.pi * np.arange(nf) / nf)
                y_place[o + q.shape[0] - nf:o + q.shape[0]] *= np.cos(0.5 * np.pi * np.arange(nf) / nf)
            o += q.shape[0]
        if facteur > 1.0 + 1e-4:
            y = atempo_ffmpeg(y, sr, facteur)
            y[:nf] *= np.sin(0.5 * np.pi * np.arange(nf) / nf)
            y[-nf:] *= np.cos(0.5 * np.pi * np.arange(nf) / nf)
            y_place = atempo_ffmpeg(y_place, sr, facteur)
        d2 = y.shape[0] / sr
        fin = t0 + d2
        debord = fin - (t_suiv - 0.10)
        retard = t0 - float(p['t_film'])
        assert retard <= RETARD_MAX + 1e-6, 'voix %s : retard %.3f s > %.1f s' % (p['id'], retard, RETARD_MAX)
        assert debord <= DEBORD_MAX + 1e-6, 'voix %s : débordement %.3f s > %.1f s (atempo %.3f)' % (p['id'], debord, DEBORD_MAX, facteur)
        # emphase
        emph = p.get('emphase')
        i_e = 0
        if emph and p.get('emphase_depuis') is not None:
            b0 = par_id['%s#0' % p['id']]
            ts, e, _ = cache_env[b0['fichier']]
            a_, b_ = p['emphase_depuis']
            w = (ts >= a_) & (ts <= b_)
            t_cut = float(ts[w][np.argmin(e[w])])
            i_e = int(round((t_cut - b0['debut']) / facteur * sr))
        mots = []
        if p['id'] in MONTAGE:                               # emphase stade MOT PAR MOT (montage) ; instants de chaque mot
            o, km = 0, 0
            for q in parts:
                if km % 2 == 0:
                    k_ = km // 2
                    lab = p['morceaux'][k_][3] if len(p['morceaux'][k_]) > 3 else p.get('texte', '')[:30]
                    if k_ in MONTAGE[p['id']]['emphase']:
                        z = compresser(y[o:o + q.shape[0]], sr) * 10 ** (GAIN_EMPHASE_DB / 20.0)
                        y[o:o + q.shape[0]] = z
                        poser(humide, voix_stade(z, sr, 500 + k_), t0 + o / sr, sr, gain=1.0)
                    mots.append({'mot': lab, 'debut': round(t0 + o / sr, 3), 'fin': round(t0 + (o + q.shape[0]) / sr, 3),
                                 'emphase': k_ in MONTAGE[p['id']]['emphase']})
                o += q.shape[0]
                km += 1
            emph = False
        if emph:
            tete, queue = y[:i_e], y[i_e:]
            queue = compresser(queue, sr) * 10 ** (GAIN_EMPHASE_DB / 20.0)
            ne = min(int(0.02 * sr), queue.shape[0])
            queue[:ne] *= np.sin(0.5 * np.pi * np.arange(ne) / ne)
            y = np.concatenate([tete, queue])
            poser(humide, voix_stade(queue, sr, 300 + ip), t0 + i_e / sr, sr, gain=1.0)
        i = int(round(t0 * sr))
        piste[i:i + y.shape[0]] += y[:max(0, N - i)]
        intervalles.append((t0, fin))
        # contrôle des coupures internes : enveloppe de la prise brute (même axe après atempo) vs enveloppe placée
        _, es, refs = dv.enveloppe_db(y_brut, sr)
        if facteur > 1.0 + 1e-4:
            xs = np.arange(es.shape[0]) / facteur
            es = np.interp(np.arange(int(es.shape[0] / facteur)), xs, es)
        _, ep, _ = dv.enveloppe_db(y_place, sr, refs)
        zones = dv.controler_coupures(es, ep)
        controles.append({'id': p['id'], 'zones_coupees': [[round(a * dv.PAS_ENV, 3), round(b * dv.PAS_ENV, 3)] for a, b in zones]})
        rapport.append({'id': p['id'], 'texte': p.get('texte', ''), 'morceaux_json': p['morceaux'],
                        'bornes': [[round(par_id['%s#%d' % (p['id'], k)]['debut'], 3), round(par_id['%s#%d' % (p['id'], k)]['fin'], 3)]
                                   for k in range(len(p['morceaux']))],
                        't_film_json': p['t_film'], 'attaque': round(t0, 3), 'fin': round(fin, 3), 'retard_s': round(retard, 3),
                        'creneau_s': round(creneau, 3), 'duree_prise_s': round(d, 3), 'atempo': round(facteur, 4),
                        'atempo_max': amax, 'duree_finale_s': round(d2, 3), 'debordement_s': round(max(0.0, debord), 3),
                        'emphase': bool(emph) or bool(mots), 'emphase_depuis_s': round(t0 + i_e / sr, 3) if emph else None,
                        'mots': mots or None})
        fin_prec = fin
    ordre = sorted(range(len(intervalles)), key=lambda j: intervalles[j][0])
    for a, b in zip(ordre, ordre[1:]):
        assert intervalles[b][0] >= intervalles[a][1], 'pièces de voix qui se chevauchent : %s (fin %.3f) / %s (début %.3f)' % (
            rapport[a]['id'], intervalles[a][1], rapport[b]['id'], intervalles[b][0])
    assert max(b for _, b in intervalles) <= duree - 0.3, 'la dernière pièce de voix doit finir avant %.2f s' % (duree - 0.3)
    humide[int((duree - 0.06) * sr):] = 0.0
    return piste, humide, intervalles, rapport, corrections, controles


def tenir_voyelle(src, sr, duree, attaque=0.055, xf=0.030, grain=0.050, pas=0.0125, montee_db=4.0, graine=9400):
    """Voyelle TENUE sans changer la hauteur : l'attaque d'origine (attaque s) est conservée, puis fondu croisé de xf s
    vers une tenue GRANULAIRE (grains de Hann de 50 ms, pas 12,5 ms, recouvrement ×4, normalisée) dont les grains sont
    pris au hasard dans la partie STABLE de la voyelle (fenêtre la plus régulière en énergie, ≥ 60 ms) ; intensité qui
    monte de montee_db, petit fondu de sortie de 30 ms APRÈS `duree` (la pièce suivante entre en fondu croisé).
    Retourne (mono de duree + xf s, infos)."""
    rng = np.random.default_rng(graine)
    n_out = int(round((duree + xf) * sr))
    h = int(0.010 * sr)
    nfr = src.shape[0] // h
    e = 20 * np.log10(np.sqrt(np.mean(src[:nfr * h].reshape(nfr, h) ** 2, axis=1)) + 1e-12)
    lw = 6
    i_att = int(attaque / 0.010)
    best = None
    for k in range(i_att - 1, max(i_att, nfr - lw - 1)):
        w = e[k:k + lw]
        sc = float(np.std(w)) - 0.15 * float(np.mean(w))      # régulière ET forte
        if best is None or sc < best[0]:
            best = (sc, k)
    s0, s1 = best[1] * h, min(src.shape[0], (best[1] + lw) * h)
    ng, nh = int(grain * sr), int(pas * sr)
    win = np.hanning(ng)
    stable = src[max(0, s0 - ng // 2):s1 + ng // 2]
    tenue = np.zeros(n_out + ng)
    norm = np.zeros(n_out + ng)
    i = 0
    while i < n_out:
        j = int(rng.integers(0, max(1, stable.shape[0] - ng)))
        g = stable[j:j + ng]
        if g.shape[0] < ng:
            g = np.pad(g, (0, ng - g.shape[0]))
        tenue[i:i + ng] += g * win
        norm[i:i + ng] += win
        i += nh
    tenue = tenue[:n_out] / np.maximum(norm[:n_out], 1e-3)
    tenue *= rms(src[s0:s1]) / (rms(tenue[int(0.1 * sr):]) + 1e-12)
    n_att, n_xf = int(attaque * sr), int(xf * sr)
    out = tenue.copy()
    a_ = src[:n_att + n_xf].copy()
    a_ = np.pad(a_, (0, max(0, n_att + n_xf - a_.shape[0])))
    up = np.sin(0.5 * np.pi * np.arange(n_xf) / n_xf)
    out[:n_att] = a_[:n_att]
    out[n_att:n_att + n_xf] = a_[n_att:n_att + n_xf] * up[::-1] + tenue[n_att:n_att + n_xf] * up
    t = np.arange(n_out) / sr
    out *= 10 ** (montee_db * np.clip(t / max(duree, 1e-3), 0, 1) ** 1.3 / 20.0)
    nf = int(0.025 * sr)
    out[:nf] *= np.sin(0.5 * np.pi * np.arange(nf) / nf)
    out[-n_xf:] *= up[::-1]
    return out, {'source_stable_s': [round(s0 / sr, 3), round(s1 / sr, 3)], 'attaque_conservee_s': attaque, 'fondu_croise_s': xf,
                 'grain_s': grain, 'pas_s': pas, 'montee_db': montee_db, 'duree_s': round(duree, 3)}


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
# V9.2 : riser d'aspiration, décharges, swoosh grave, glitch de portail, casino, impacts de coupe
# ----------------------------------------------------------------------------------------------



def clochettes_traineau(sr, rng, gain=1.0):
    """Une secousse de clochettes de traîneau : 5 à 8 grelots (partiels inharmoniques 2,6–9 kHz, décroissance 60–160 ms)
    décalés de quelques ms + froissement métallique bref."""
    n = int(0.28 * sr)
    out = np.zeros((n, 2))
    for _ in range(int(rng.integers(5, 9))):
        f0 = float(rng.uniform(2600, 5200))
        d = float(rng.uniform(0.0, 0.025))
        ng = int(0.22 * sr)
        tg = temps(ng, sr)
        tau = float(rng.uniform(0.06, 0.16))
        g = sum(a * np.sin(2 * np.pi * f0 * r * tg + float(rng.uniform(0, 6.28))) for r, a in ((1.0, 1.0), (1.51, 0.6), (2.27, 0.35), (2.93, 0.2)))
        g = g * montee(tg, 0.0006) * np.exp(-tg / tau)
        poser(out, g, d, sr, pan=float(rng.uniform(-0.6, 0.6)), gain=float(rng.uniform(0.3, 0.7)))
    nc = int(0.05 * sr)
    tc = temps(nc, sr)
    poser(out, filtre_bande(rng.standard_normal(nc), sr, 5000.0, 14000.0) * np.exp(-tc / 0.012), 0.0, sr, gain=0.25)
    return out * gain



def riser_aspirant(sr, rng, duree):
    """Riser d'aspiration : sub-basse qui monte (28 → 75 Hz) + souffle « à l'envers » dont la coupure grimpe (300 Hz → 9 kHz)
    et qui enfle exponentiellement, stéréo qui se resserre ; coupure nette à la fin (micro-suspense)."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    sub = np.sin(phase_continue(28.0 * (75.0 / 28.0) ** u, sr)) * (0.2 + 0.8 * u ** 1.5)
    fh = lambda tt: 300.0 * (9000.0 / 300.0) ** min(max(tt / duree, 0.0), 1.0)
    a = norme(v7.filtre_variable(rng.standard_normal(n), sr, fh))
    bb = norme(v7.filtre_variable(rng.standard_normal(n), sr, fh))
    env = (np.exp(3.2 * u) - 1) / (math.exp(3.2) - 1)
    out = np.stack([a, bb], axis=1) * (0.6 * env)[:, None] + stereo(sub * 0.9)
    return out * fenetre(n, 0.05, 0.012, sr)[:, None]


def decharge_electrique(sr, rng, duree=0.18):
    """Décharge électrique : arc qui crépite (bruit aigu haché à la milliseconde) + bourdonnement 100 Hz saturé, haché."""
    n = int(duree * sr)
    t = temps(n, sr)
    hache = (rng.random(int(duree * 1000) + 1) < 0.55).astype(float)
    g = np.repeat(hache, int(sr / 1000))[:n]
    g = np.pad(g, (0, n - g.shape[0]))
    arc = filtre_bande(rng.standard_normal(n), sr, 2000.0, 14000.0) * g
    buzz = np.tanh(3.0 * sum(np.sin(2 * np.pi * 100.0 * h * t) / h for h in range(1, 9))) * g
    x = norme(0.8 * norme(arc) + 0.5 * norme(buzz)) * montee(t, 0.001) * fenetre(n, 0.0, 0.04, sr)
    return stereo(x, float(rng.uniform(-0.7, 0.7)))



def swoosh_grave(sr, rng, duree=0.75):
    """Swoosh grave d'apparition de bandeau / de changement de monde : sinus 80 → 320 Hz en cloche + souffle stéréo
    décorrélé dont la bande glisse. Pic à 0,55 × durée."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    cloche_ = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.5
    ton = np.sin(phase_continue(80.0 * (320.0 / 80.0) ** u, sr)) * cloche_
    fh = lambda tt: 600.0 + 3000.0 * math.sin(math.pi * min(max(tt / duree, 0.0), 1.0))
    a = norme(v7.filtre_variable(rng.standard_normal(n), sr, fh)) * cloche_
    bb = norme(v7.filtre_variable(rng.standard_normal(n), sr, fh)) * cloche_
    return np.stack([0.9 * ton + 0.45 * a, 0.9 * ton + 0.45 * bb], axis=1) * fenetre(n, 0.01, 0.05, sr)[:, None]


def glitch_teleport(sr, rng, duree=0.55):
    """Glitch / téléportation : « zwip » sinus 180 → 3000 → 400 Hz, tranches numériques bégayantes (bruit et carrés
    sous-échantillonnés), quantification grossière, stéréo qui saute."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    f = np.where(u < 0.35, 180.0 * (3000.0 / 180.0) ** (u / 0.35), 3000.0 * (400.0 / 3000.0) ** ((u - 0.35) / 0.65))
    zw = np.sin(phase_continue(f, sr)) * np.sin(np.pi * u) ** 0.7
    out = stereo(0.5 * zw)
    tc = 0.0
    while tc < duree - 0.03:
        d = float(rng.uniform(0.012, 0.045))
        nn = int(d * sr)
        tn = temps(nn, sr)
        if rng.random() < 0.5:
            s = np.sign(np.sin(2 * np.pi * float(rng.choice([220, 440, 880, 1760, 3520])) * tn))
        else:
            s = rng.standard_normal(nn)
        pas = int(rng.choice([4, 8, 16]))
        s = np.repeat(s[::pas], pas)[:nn]
        s = np.round(s * 4) / 4
        poser(out, s * fenetre(nn, 0.001, 0.002, sr), tc, sr, pan=float(rng.choice([-0.8, 0.0, 0.8])), gain=float(rng.uniform(0.15, 0.4)))
        tc += d * float(rng.uniform(1.0, 1.8))
    return out * fenetre(n, 0.003, 0.08, sr)[:, None]


def ka_ching(sr, rng):
    """KA-CHING de caisse enregistreuse : cliquet mécanique (6 clics), cloche métallique 2450 + 3680 Hz (+ 5170, 7330)
    longue, tiroir qui glisse puis butée sourde. La cloche frappe à 0,12 s."""
    n = int(1.4 * sr)
    out = np.zeros((n, 2))
    for i in range(6):
        nc = int(0.02 * sr)
        tc = temps(nc, sr)
        c = filtre_bande(rng.standard_normal(nc), sr, 1500.0, 8000.0) * np.exp(-tc / 0.002) + 0.5 * np.sin(2 * np.pi * 1900.0 * tc) * np.exp(-tc / 0.004)
        poser(out, norme(c), 0.018 * i, sr, pan=0.2, gain=0.35)
    nb = int(1.2 * sr)
    tb = temps(nb, sr)
    bell = (np.sin(2 * np.pi * 2450.0 * tb) * np.exp(-tb / 0.55) + 0.8 * np.sin(2 * np.pi * 3680.0 * tb) * np.exp(-tb / 0.45)
            + 0.3 * np.sin(2 * np.pi * 5170.0 * tb) * np.exp(-tb / 0.2) + 0.15 * np.sin(2 * np.pi * 7330.0 * tb) * np.exp(-tb / 0.1))
    bell = bell * (1 + 0.15 * np.sin(2 * np.pi * 6.0 * tb)) * montee(tb, 0.0005)
    bell += 0.6 * filtre_bande(rng.standard_normal(nb), sr, 3000.0, 12000.0) * np.exp(-tb / 0.004)
    poser(out, stereo(norme(bell), 0.0), 0.12, sr, gain=0.8)
    ns = int(0.22 * sr)
    ts_ = temps(ns, sr)
    slide = filtre_bande(rng.standard_normal(ns), sr, 300.0, 3000.0) * np.sin(np.pi * ts_ / 0.22) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 40 * ts_)))
    poser(out, stereo(norme(slide), -0.2), 0.16, sr, gain=0.25)
    nt = int(0.25 * sr)
    tt = temps(nt, sr)
    thunk = np.sin(2 * np.pi * 120.0 * tt) * np.exp(-tt / 0.05) + 0.4 * filtre_bande(rng.standard_normal(nt), sr, 200.0, 1500.0) * np.exp(-tt / 0.02)
    poser(out, stereo(norme(thunk), -0.1), 0.38, sr, gain=0.45)
    return out


def piece_or_tinte(sr, rng):
    nn = int(0.3 * sr)
    t = temps(nn, sr)
    f0 = float(rng.uniform(3000, 6000))
    x = sum(a * np.sin(2 * np.pi * f0 * r * t + float(rng.uniform(0, 6.28))) * np.exp(-t / (float(rng.uniform(0.06, 0.2)) / (1 + 0.3 * j)))
            for j, (r, a) in enumerate(((1.0, 1.0), (1.58, 0.6), (2.31, 0.4), (3.12, 0.25))))
    return norme(x * montee(t, 0.0003))


def cascade_pieces(sr, rng, duree=1.4, nb=46):
    """Cascade de pièces d'or : pièces qui tombent (densité qui retombe), chacune rebondit 1 à 3 fois en s'amortissant."""
    n = int((duree + 0.4) * sr)
    out = np.zeros((n, 2))
    for _ in range(nb):
        d = float(rng.uniform(0, duree) ** 1.3 / duree ** 0.3)
        pan = float(rng.uniform(-0.8, 0.8))
        p = piece_or_tinte(sr, rng)
        g = float(rng.uniform(0.15, 0.4))
        for rb in range(int(rng.integers(1, 4))):
            poser(out, p, d, sr, pan=pan, gain=g)
            d += float(rng.uniform(0.05, 0.12)) * (0.6 ** rb)
            g *= 0.45
    return out


def impact_smash(sr, rng, kit):
    """Impact de smash cut : sub court + grosse caisse lourde + claquement aigu (flash blanc)."""
    n = int(0.9 * sr)
    out = np.zeros((n, 2))
    poser(out, sub_drop(sr, 0.8, 95.0, 32.0, 0.22), 0.0, sr, gain=0.9)
    poser(out, kit['kb'], 0.0, sr, gain=0.6)
    nc = int(0.06 * sr)
    tc = temps(nc, sr)
    poser(out, filtre_bande(rng.standard_normal(nc), sr, 2500.0, 12000.0) * np.exp(-tc / 0.01), 0.0, sr, gain=0.3)
    return out



def mettre_au_niveau(x, cible_db):
    """Échelle x pour que son RMS (sur les échantillons non nuls) vaille cible_db dBFS."""
    m = x if x.ndim == 1 else x.mean(axis=1)
    act = np.abs(m) > 1e-6
    r = rms(m[act]) if np.any(act) else 0.0
    return x * (10 ** (cible_db / 20.0) / r) if r > 0 else x


def atempo_stereo(x, sr, facteur):
    """Change le tempo d'un stéréo sans changer la hauteur (ffmpeg atempo, WSOLA)."""
    cmd = ['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', '-',
           '-af', 'atempo=%.6f' % facteur, '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-']
    r = subprocess.run(cmd, input=x.astype('<f4').tobytes(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError('atempo : ' + r.stderr.decode('utf-8', 'replace')[:300])
    return np.frombuffer(r.stdout, dtype='<f4').astype(float).reshape(-1, 2)


def temps_fort_cloclo(chemin, sr, t_annonce=29.40, t_anacrouse=28.95):
    """Vérifie le temps fort « …le mal aimé » dans le fichier complet : grille des temps (autocorrélation du flux spectral
    18–38 s), calage de phase sur le flux, puis attaque la plus forte à ± 0,25 s du temps de grille le plus proche de
    l'instant annoncé. Retourne un dict (instants mesurés et écarts)."""
    T0 = max(0.0, t_annonce - 11.4)
    x = v7.decoder_ffmpeg(chemin, sr, T0, 20.0, canaux=1)[:, 0]
    nfft, hop = 2048, 240
    idx = np.arange(nfft)[None, :] + hop * np.arange((x.shape[0] - nfft) // hop)[:, None]
    L = np.log1p(10.0 * np.abs(np.fft.rfft(x[idx] * np.hanning(nfft), axis=1)))
    fl = np.maximum(np.diff(L, axis=0), 0.0).sum(axis=1)
    fps = sr / hop
    t = T0 + (np.arange(fl.shape[0]) + 1) / fps + nfft / 2 / sr
    s = fl - fl.mean()
    ac = np.correlate(s, s, 'full')[s.shape[0] - 1:]
    lags = np.arange(ac.shape[0]) / fps
    m = (lags > 0.3) & (lags < 1.2)
    P = float(lags[np.argmax(ac * m)])
    best = (-1.0, 0.0)
    for o in np.arange(0.0, P, 1.0 / fps):
        pts = T0 + 0.2 + o + P * np.arange(int(19.0 / P))
        sc = float(np.interp(pts, t, fl).sum())
        if sc > best[0]:
            best = (sc, o)
    grille = T0 + 0.2 + best[1] + P * np.arange(int(19.0 / P))
    tg = float(grille[np.argmin(np.abs(grille - t_annonce))])
    w = (t > tg - 0.25) & (t < tg + 0.25)
    t_att = float(t[w][np.argmax(fl[w])])
    t_fort = round(0.5 * (tg + t_att), 3)
    ta = float(grille[np.argmin(np.abs(grille - t_fort))]) - P / 2       # anacrouse : demi-temps avant le temps fort
    return {'bpm': round(60.0 / P, 2), 'temps_grille_s': round(tg, 3), 'attaque_s': round(t_att, 3), 'temps_fort_retenu_s': t_fort,
            'ecart_temps_fort_s': round(t_fort - t_annonce, 3), 'anacrouse_mesuree_s': round(ta, 3),
            'ecart_anacrouse_s': round(ta - t_anacrouse, 3)}


# ----------------------------------------------------------------------------------------------
# V9.3 : moteurs du Showroom réel, ouverture en crescendo sur « Le Mal Aimé », suspense du conteneur, embrasement
# ----------------------------------------------------------------------------------------------
def moteur_showroom(eid, sr):
    """Banque RÉELLE du Showroom (sounds/moteurs_reels/NN/banque.json, ce que joue shared/engine_audio.js en mode « réel ») :
    - banque « ralenti + coups_de_gaz » : ralenti (bouclé) et coups de gaz enregistrés, tels quels ;
    - banque « bandes » (multi-régimes : turbine #01, banc #03) : ralenti = bande la plus basse ; coup de gaz = montée de
      régime reconstituée en enchaînant les bandes de la plus basse à la plus haute (fondus à puissance constante), comme le
      moteur du Showroom quand on pousse le régime.
    Retourne {'ralenti': stéréo, 'gaz': [stéréo, …], 'moteur', 'licence', 'credit', 'type'} ou None."""
    dos = os.path.join(DOSSIER_MOTEURS, '%02d' % eid)
    try:
        with open(os.path.join(dos, 'banque.json'), encoding='utf-8') as f:
            meta = json.load(f)
    except (OSError, ValueError):
        return None
    if meta.get('licence') not in ('CC0', 'CC BY'):
        return None
    lire = lambda nom: v7.decoder_ffmpeg(os.path.join(dos, nom), sr, filtre='highpass=f=30')
    if meta.get('ralenti') and meta.get('coups_de_gaz'):
        ral = lire(meta['ralenti'])
        gaz = [lire(g) for g in meta['coups_de_gaz'] if os.path.isfile(os.path.join(dos, g))]
        typ = 'ralenti + coups de gaz'
    elif meta.get('bandes'):
        bandes = sorted(meta['bandes'], key=lambda b: b['rpm'])
        bufs = [lire(b['file']) for b in bandes]
        ral = bufs[0]
        seg, xf = int(0.32 * sr), int(0.08 * sr)
        morceaux = [b[:seg + xf] if b.shape[0] >= seg + xf else np.pad(b, ((0, seg + xf - b.shape[0]), (0, 0)), mode='wrap') for b in bufs]
        n = seg * len(morceaux) + xf
        g = np.zeros((n, 2))
        up = np.sin(0.5 * np.pi * np.arange(xf) / xf)[:, None]
        for i, m in enumerate(morceaux):
            m = m.copy()
            if i > 0:
                m[:xf] *= up
            if i < len(morceaux) - 1:
                m[-xf:] *= up[::-1]
            g[i * seg:i * seg + m.shape[0]] += m
        gaz = [g]                                            # une montée de régime
        typ = 'bandes multi-régimes (montée reconstituée)'
    else:
        return None
    return {'ralenti': ral, 'gaz': gaz, 'moteur': meta.get('moteur', ''), 'licence': meta.get('licence'), 'credit': meta.get('credit', ''),
            'type': typ}


def boucle(x, n, sr, xf=0.08):
    """Boucle un stéréo jusqu'à n échantillons (fondus enchaînés de xf s aux raccords)."""
    if x.shape[0] >= n:
        return x[:n].copy()
    k = int(xf * sr)
    out = np.zeros((n, 2))
    pas = x.shape[0] - k
    up = np.sin(0.5 * np.pi * np.arange(k) / k)[:, None]
    i = 0
    while i < n:
        m = x.copy()
        if i > 0:
            m[:k] *= up
        m[-k:] *= up[::-1]
        b = min(n - i, m.shape[0])
        out[i:i + b] += m[:b]
        i += pas
    return out


def cloclo_crescendo(x, sr, cles_db, cles_fc):
    """« Le Mal Aimé » en crescendo : niveau (cles_db, dB) et filtre passe-bas qui s'ouvre (cles_fc, Hz, interpolation
    logarithmique) appliqués à x (stéréo commençant à t = 0). Le passe-bas variable est un fondu entre 4 versions filtrées
    (500, 1200, 3000 Hz, plein spectre) pondérées par la position log de la coupure courante."""
    n = x.shape[0]
    t = np.arange(n) / sr
    fcs = [500.0, 1200.0, 3000.0, 16000.0]
    vers = [np.stack([filtre_bande(x[:, c], sr, None, f, ordre=2) for c in range(2)], axis=1) for f in fcs[:3]] + [x]
    ts, vs = zip(*cles_fc)
    lf = np.interp(t, ts, np.log(vs))
    lgs = np.log(fcs)
    out = np.zeros_like(x)
    for i in range(4):
        if i == 0:
            w = np.clip((lgs[1] - lf) / (lgs[1] - lgs[0]), 0, 1)
        elif i == 3:
            w = np.clip((lf - lgs[2]) / (lgs[3] - lgs[2]), 0, 1)
        else:
            w = np.clip(1.0 - np.abs(lf - lgs[i]) / np.where(lf < lgs[i], lgs[i] - lgs[i - 1], lgs[i + 1] - lgs[i]), 0, 1)
        out += vers[i] * w[:, None]
    ts, vs = zip(*cles_db)
    return out * (10 ** (np.interp(t, ts, vs) / 20.0))[:, None]


def tv_declic(sr, rng):
    """La télé s'allume : déclic de relais, « toc » du tube, souffle statique bref, ronflement 50 Hz qui s'installe."""
    n = int(0.9 * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    nc = int(0.01 * sr)
    poser(out, filtre_bande(rng.standard_normal(nc), sr, 1500.0, 9000.0) * np.exp(-temps(nc, sr) / 0.0015), 0.0, sr, gain=0.8)
    poser(out, np.sin(2 * np.pi * 70.0 * t[:int(0.2 * sr)]) * np.exp(-t[:int(0.2 * sr)] / 0.04), 0.004, sr, gain=0.6)
    st = filtre_bande(rng.standard_normal(n), sr, 2000.0, 12000.0) * np.exp(-t / 0.12) * montee(t, 0.003)
    poser(out, np.stack([st, np.roll(st, 37)], axis=1), 0.01, sr, gain=0.35)
    hum = sum(np.sin(2 * np.pi * 50.0 * h * t) / h ** 1.3 for h in range(1, 8)) * montee(t, 0.1) * fenetre(n, 0.0, 0.4, sr)
    poser(out, stereo(hum), 0.0, sr, gain=0.12)
    return out


def riser_vrille(sr, rng, duree):
    """Ça part en VRILLE : riser aspirant + pulsations qui ACCÉLÈRENT (4 → 26 Hz) sur un ton qui monte (90 → 700 Hz)."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    base = riser_aspirant(sr, rng, duree)
    rate = 4.0 + 22.0 * u ** 1.6
    puls = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(rate) / sr))
    ton = np.sin(phase_continue(90.0 * (700.0 / 90.0) ** u, sr))
    ton = (ton + 0.4 * np.sign(ton)) * puls * u ** 1.2
    ton = filtre_bande(ton, sr, 60.0, 5000.0)
    return base + stereo(0.5 * norme(ton)) * fenetre(n, 0.05, 0.012, sr)[:, None]


def battement_coeur(sr, duree, bpm0=58.0, bpm1=72.0):
    """Battements de cœur lents (« poum-poum » graves 48 / 62 Hz), tempo qui monte doucement de bpm0 à bpm1."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    t = 0.05
    while t < duree - 0.3:
        u = t / duree
        for d, f, g in ((0.0, 48.0, 1.0), (0.17, 62.0, 0.7)):
            nb = int(0.18 * sr)
            tb = temps(nb, sr)
            x = np.sin(2 * np.pi * f * tb * (1 + 0.6 * np.exp(-tb / 0.02))) * np.exp(-tb / 0.05) * montee(tb, 0.004)
            poser(out, stereo(x), t + d, sr, gain=g)
        t += 60.0 / (bpm0 + (bpm1 - bpm0) * u)
    return out


def souffle_sombre(sr, rng, duree):
    """Souffle d'angoisse : vent grave 80–500 Hz qui respire lentement, stéréo large."""
    n = int(duree * sr)
    t = temps(n, sr)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 1.0) ** 2
    a, b = bruit_filtre(rng, n, sr, 80.0, 500.0), bruit_filtre(rng, n, sr, 80.0, 500.0)
    return np.stack([a, b], axis=1) * (mod * fenetre(n, 0.8, 0.6, sr))[:, None]


# ----------------------------------------------------------------------------------------------
# Programme principal
# ----------------------------------------------------------------------------------------------
FEUX_F1_INTERNES = [5.6, 6.4, 7.2, 8.0, 8.8]   # familles_f1.js → FEUX : la colonne k s'allume à 5,6 + 0,8·k (temps interne)
MOUV_SOUS_MUSIQUE_DB = -14.0                   # flamme / whoosh / impact / crissement : au plus −14 dB sous la musique
FAM_SOUS_MUSIQUE_DB = -4.0                     # ambiances des familles : sous la ring music
GAG_SOUS_VOIX_DB = -5.0                        # moteurs réels des autres écuries : 5 dB sous le niveau moyen de la voix
GAG_PHARE_SOUS_VOIX_DB = -2.0                  # gags phares #02 #05 #08 #10 : remontés de 3 dB (veto du Chef de régie)
GAGS_PHARES = (2, 5, 8, 10)
ACCENT_PHARE_DB, ACCENT_AUTRES_DB = 4.0, 2.0   # accent des gags dans les respirations réelles de la voix
RESPIRATION_MIN = 0.15                         # respiration = silence de la voix placée ≥ 0,15 s
SEUIL_PAROLE_DB = -40.0                        # parole : enveloppe 10 ms de la voix placée > crête − 40 dB
MARGE_PAROLE_MIN_DB = 6.0                      # garde-fou : voix ≥ +6 dB sur tout le reste (300 Hz–3,4 kHz) pendant qu'elle parle
CLOCLO_SOUS_VOIX_DB = -3.0                     # « Le Mal Aimé » : au premier plan
DUCK_GAGS_DB = -3.0                            # gags : ducking doux sous la PAROLE (pas pendant les respirations)
DUCK_CLOCLO_DB = -6.0                          # « Le Mal Aimé » : ducking doux sous la voix
DUCK_LIT_DB = -5.0                             # jazz de Noël : lit sous « Mesdames et messieurs… »
SEUIL_RING_DBFS = -60.0                        # contrôle de présence de la ring music (fenêtres de 50 ms)
TROU_MAX_S = 0.3
EMPHASE_QUEUE = {'gloire': (99.10, 99.50)}     # source : silence entre « …pour lui, » (fin 99,08) et « la gloire éternelle »
CLOCLO_REFRAIN_1 = (29.221, 28.91)             # « Le Mal Aimé » : temps fort du refrain 1 (mesuré V9.2) et anacrouse, fichier complet
LERO_DEBUT_S, LERO_DUREE_S = 3.0, (2.5, 3.5)   # #12 : lero_lero.mp3 à partir de 3,0 s, extrait coupé sur un creux entre 2,5 et 3,5 s
LERO_MOTEUR_SOUS_DB = -8.0                     # #12 : le moteur réel passe sous le gag
T_COUPE_MUSIQUE, D_ARRET = 5.0, 0.15           # le refrain s'arrête à 5,0 s (platine qui s'arrête en 0,15 s)
CONTINUITE_SEUIL_DB = -30.0                    # « EEENNN » : aucune zone sous −30 dB (relatif à la crête de la voix) dans la tenue


def mal_aime_vrille(chemin, sr, debut_fic, t_tf, P, t_tv, t_v0, t_fin):
    """Refrain 1 de « Le Mal Aimé » joué NORMALEMENT de 0 à t_tv (lecture du fichier à partir de debut_fic : le temps fort
    tombe à t_tf), puis la chanson PART EN VRILLE sans aucun blanc jusqu'à t_fin :
      t_tv → t_v0      la télé s'allume : la bande commence à se déformer (pleurage qui s'installe) ;
      t_v0 → t_s       accélération de bande (vitesse 1 → 1,35 : la hauteur monte) + pleurage ;
      t_s → t_fin      bégaiement calé sur la grille des temps (t_s = t_tv + 4 temps) : tranches de 1/2, 1/4, 1/8 puis
                       1/16 de temps répétées, chaque répétition plus aiguë (×1,35 → ×2,4), passe-haut qui monte (aspiration).
    Retourne (stéréo de 0 à t_fin, infos)."""
    marge = 4.0
    x = v7.decoder_ffmpeg(chemin, sr, debut_fic, t_fin + marge)
    n = int(round(t_fin * sr))
    ts_src = np.arange(x.shape[0]) / sr
    lire = lambda pos: np.stack([np.interp(pos, ts_src, x[:, c]) for c in range(2)], axis=1)
    t = np.arange(n) / sr
    pos = t.copy()
    # pleurage dès la télé, accélération de bande dès t_v0
    u_w = np.clip((t - t_tv) / max(1e-3, t_v0 - t_tv), 0, 1)
    pleur = 0.006 * u_w * np.sin(2 * np.pi * 4.7 * np.maximum(0, t - t_tv))
    t_s = t_tv + 4 * P
    i_v0, i_s = int(t_v0 * sr), int(t_s * sr)
    u = np.clip((t[i_v0:i_s] - t_v0) / (t_s - t_v0), 0, 1)
    vit = 1.0 + 0.35 * u ** 2
    pos[i_v0:i_s] = t_v0 + np.cumsum(vit) / sr
    pos[i_s:] = pos[i_s - 1]
    out = lire(pos[:i_s] + pleur[:i_s])
    # bégaiement
    sections = [(t_s, t_s + 2 * P, P / 2), (t_s + 2 * P, t_s + 3 * P, P / 4), (t_s + 3 * P, t_s + 3.5 * P, P / 8), (t_s + 3.5 * P, t_fin, P / 16)]
    p0 = float(pos[i_s - 1])
    beg = np.zeros((n - i_s, 2))
    nb_rep = 0
    for a, b, L in sections:
        tr = a
        while tr < b - 1e-6:
            Lr = min(L, b - tr)
            f = 1.35 + 1.05 * ((tr - t_s) / (t_fin - t_s)) ** 1.2
            nl = int(round(Lr * sr))
            src = lire(p0 + np.arange(nl) / sr * f)
            nf_ = min(int(0.003 * sr), nl // 4)
            if nf_ > 0:
                rmp = np.sin(0.5 * np.pi * np.arange(nf_) / nf_)[:, None]
                src[:nf_] *= rmp
                src[-nf_:] *= rmp[::-1]
            i0 = int(round(tr * sr)) - i_s
            beg[i0:i0 + nl] += src[:max(0, beg.shape[0] - i0)]
            tr += Lr
            nb_rep += 1
    hp = np.stack([filtre_bande(beg[:, c], sr, 700.0, None, ordre=2) for c in range(2)], axis=1)
    w = np.clip((np.arange(beg.shape[0]) / sr) / (t_fin - t_s), 0, 1)[:, None] * 0.75
    beg = (1 - w) * beg + w * hp
    out = np.concatenate([out, beg])[:n]
    gain = 10 ** (np.interp(t, [0, t_v0, t_fin], [0.0, 0.0, 4.0]) / 20.0)
    out *= gain[:, None]
    out *= fenetre(n, 0.03, 0.008, sr)[:, None]
    return out, {'debut_fichier_s': round(debut_fic, 3), 'temps_fort_film_s': round(t_tf, 3), 'pleurage_des_s': t_tv,
                 'acceleration_bande_s': [t_v0, round(t_s, 3)], 'begaiement_s': [round(t_s, 3), t_fin], 'tranches': nb_rep}


def arret_platine(x, sr, t_c, d):
    """Arrêt de platine propre à t_c : la vitesse de lecture tombe de 1 à 0 en d s (phase φ = t − t²/2d), le niveau
    s'éteint avec elle ; rien après t_c + d (pas de clic : la vitesse et le niveau arrivent à 0 ensemble)."""
    n_c, n_d = int(t_c * sr), int(d * sr)
    t = np.arange(n_d) / sr
    pos = t_c + t - t ** 2 / (2 * d)
    ts = np.arange(x.shape[0]) / sr
    fr = np.stack([np.interp(pos, ts, x[:, c]) for c in range(2)], axis=1) * ((1 - t / d) ** 1.5)[:, None]
    out = np.zeros_like(x)
    out[:n_c] = x[:n_c]
    out[n_c:n_c + n_d] = fr[:max(0, out.shape[0] - n_c)]
    return out


def tchk_telecommande(sr, rng):
    """« tchk » : petit clic plastique de télécommande (deux contacts à 18 ms, bande 1,5–7 kHz, très court)."""
    n = int(0.06 * sr)
    out = np.zeros(n)
    for d, g in ((0.0, 1.0), (0.018, 0.6)):
        nc = int(0.008 * sr)
        tc = np.arange(nc) / sr
        poser_m = filtre_bande(rng.standard_normal(nc), sr, 1500.0, 7000.0) * np.exp(-tc / 0.0015) * g
        i0 = int(d * sr)
        out[i0:i0 + nc] += poser_m[:n - i0]
    return stereo(norme(out), 0.15)


def tr_do(m, tq):
    """Transpose une note midi pensée en do vers la tonique tq (−5…+6 demi-tons)."""
    return m + tq


def segments_parole(vo, sr, seuil_rel=SEUIL_PAROLE_DB, trou=RESPIRATION_MIN):
    """Segments où la voix PLACÉE parle : enveloppe RMS 10 ms > crête + seuil_rel ; deux segments séparés de moins de
    `trou` s sont fusionnés (une respiration réelle dure au moins `trou`)."""
    h = int(0.01 * sr)
    n = vo.shape[0] // h
    e = 20 * np.log10(np.sqrt(np.mean(vo[:n * h].reshape(n, h) ** 2, axis=1)) + 1e-12)
    on = e > float(e.max()) + seuil_rel
    segs, i = [], 0
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]:
                j += 1
            segs.append([i * 0.01, j * 0.01])
            i = j
        i += 1
    fus = []
    for a, b in segs:
        if fus and a - fus[-1][1] < trou:
            fus[-1][1] = b
        else:
            fus.append([a, b])
    return [tuple(x) for x in fus]


CREUX_SOUS_MEDIANE_DB = 12.0                   # creux de parole : enveloppe ≥ 12 dB sous la médiane de la parole de la fenêtre…
CREUX_MIN = 0.06                               # … pendant au moins 60 ms


def respirations_voix(vo, sr, a, b):
    """Respirations réelles de la voix PLACÉE dans [a, b] : silences ≥ 0,15 s (enveloppe 10 ms < crête − 40 dB) ; la voix off
    des écuries n'en a presque pas (débit serré, prises collées), donc on y ajoute les CREUX de parole (enveloppe lissée
    30 ms ≥ 12 dB sous la médiane de la parole de la fenêtre, ≥ 60 ms : souffles, fins de mots). Retourne [(t0, t1, type)]."""
    h = int(0.01 * sr)
    i0, i1 = max(0, int(a * 100)), min(vo.shape[0] // h, int(b * 100))
    if i1 - i0 < 3:
        return []
    seg = vo[i0 * h:i1 * h].reshape(-1, h)
    e = 20 * np.log10(np.sqrt(np.mean(seg ** 2, axis=1)) + 1e-12)
    crete = 20 * np.log10(float(np.max(np.abs(vo))) + 1e-12) - 3.0
    es = np.convolve(e, np.ones(3) / 3, 'same')
    parle = e > crete + SEUIL_PAROLE_DB
    med = float(np.median(es[parle])) if parle.any() else crete
    out = []
    for masque, mini, typ in ((~parle, RESPIRATION_MIN, 'silence'), (es < med - CREUX_SOUS_MEDIANE_DB, CREUX_MIN, 'creux')):
        k = 0
        while k < masque.shape[0]:
            if masque[k]:
                j = k
                while j < masque.shape[0] and masque[j]:
                    j += 1
                if (j - k) * 0.01 >= mini:
                    out.append(((i0 + k) / 100.0, (i0 + j) / 100.0, typ))
                k = j
            k += 1
    out.sort()
    fus = []                                                 # union (un silence contient souvent un creux)
    for t0, t1, typ in out:
        if fus and t0 <= fus[-1][1]:
            fus[-1] = (fus[-1][0], max(fus[-1][1], t1), 'silence' if 'silence' in (typ, fus[-1][2]) else 'creux')
        else:
            fus.append((t0, t1, typ))
    return fus


def courbe_db(N, sr, cles):
    """Automation linéaire par morceaux [(t, dB), …] → gain linéaire par échantillon."""
    ts, vs = zip(*cles)
    return 10 ** (np.interp(np.arange(N) / sr, ts, vs) / 20.0)


def rms_fenetres_db(x, sr, t0, t1, fen=0.4, pas=0.05):
    """RMS en dB sur des fenêtres glissantes [t, t + fen] de t0 à t1 (pas `pas`). Retourne (instants, dB)."""
    ts = np.arange(t0, max(t0, t1 - fen) + 1e-9, pas)
    return ts, np.array([rms_db_fenetre(x, t, t + fen, sr) for t in ts])


def main():
    ap = argparse.ArgumentParser(description='Bande-son V9.5 « Grand Prix de Noël — Ring » (136,53 s, 48 kHz).')
    ap.add_argument('--sortie', default=os.path.join(ICI, 'audio', 'mix_v9.wav'))
    ap.add_argument('--mp3', default=os.path.join(ICI, 'audio', 'mix_v9.mp3'))
    ap.add_argument('--timeline', default=os.path.join(ICI, 'data', 'timeline_v9.json'))
    ap.add_argument('--plan', default=os.path.join(ICI, 'data', 'plan_v9.json'))
    ap.add_argument('--voix', default=os.path.join(ICI, 'data', 'voix_v9.json'))
    ap.add_argument('--banque-bbc', default=os.path.join(DOSSIER_V5, 'sons_reels'),
                    help='dossier des WAV BBC (../audio_v5/telecharger_sons_bbc.py) ; absent → synthèse')
    ap.add_argument('--sans-bbc', action='store_true', help='n\'utilise que la synthèse pour les bruitages')
    ap.add_argument('--strict', action='store_true', help='échoue si une pièce de voix (ex. rush_*.mp3 à générer) manque')
    ap.add_argument('--stems', default=None, help='dossier où écrire les pistes séparées (voix, ring, gags…) après master')
    args = ap.parse_args()
    t_calc = time.time()
    sr = SR

    with open(args.plan, encoding='utf-8') as f:
        plan = json.load(f)
    with open(args.voix, encoding='utf-8') as f:
        pieces = json.load(f)['pieces']
    pieces_toutes = list(pieces)
    manquantes = [p['id'] for p in pieces if any(not os.path.isfile(os.path.join(ICI, m[0])) for m in p['morceaux'])]
    if manquantes:
        msg = 'pièces de voix ABSENTES (fichiers à générer) : %s' % ', '.join(
            '%s (%s)' % (pid, ', '.join(m[0] for m in next(q for q in pieces if q['id'] == pid)['morceaux'])) for pid in manquantes)
        if args.strict:
            print('ERREUR (--strict) : ' + msg, file=sys.stderr)
            return 2
        print('  [AVERTISSEMENT] ' + msg + ' -> mix construit SANS ces pièces (relancer quand elles existent)')
        pieces = [p for p in pieces if p['id'] not in manquantes]
    for p in pieces:
        if p['id'] in EMPHASE_QUEUE:
            p['emphase_depuis'] = EMPHASE_QUEUE[p['id']]
    DUREE = float(plan['duree'])
    N = int(round(DUREE * sr))
    seg = {s['id']: s for s in plan['segments']}
    for sid in ('ouverture', 'arene'):                     # V9.2+ : temps film = temps interne (remap identité)
        for a, b, c, d in seg[sid]['remap']:
            assert abs(a - c) < 1e-9 and abs(b - d) < 1e-9, 'segment %s : remap non identité' % sid
    TEL, LB, GL, DEP, ARR, RU, CO, FA = (plan['telephone'], plan['lootbox'], plan['gloire'], plan['depart'], plan['arrivee'],
                                         plan['rush'], plan['couronne'], plan['familles'])
    ecuries = plan['ecuries']
    assert len(ecuries) == 15, '15 écuries attendues'
    g0f, g1f = FA['gotham']
    f0f, f1f = FA['f1']
    k0f, k1f = FA['tokyo']
    t_arene, t_fin_arr = float(ARR['en_arene']), float(ARR['fin'])
    O = plan['ouverture']
    bbc = BanqueBBC(args.banque_bbc if not args.sans_bbc else os.path.join(ICI, '__aucune_banque__'), sr)
    kit = v8.construire_kit(sr)
    evenements = []
    B = {k: np.zeros((N, 2)) for k in ('amb', 'ring', 'mus', 'fx', 'mouv', 'fam', 'drop', 'gags', 'cloclo', 'lit', 'emph', 'scratch')}
    G = {'amb': 1.0, 'ring': 0.62 * 0.9, 'mus': 0.9, 'fx': 0.85, 'mouv': 1.0, 'fam': 0.9, 'drop': 1.0, 'gags': 1.0, 'cloclo': 1.0,
         'lit': 1.0, 'emph': 0.9, 'scratch': 1.0, 'humide': 0.55}

    def ev(t, quoi, bloc, fin=None, source='synthèse', **extra):
        e = {'t': round(float(t), 3), 'bloc': bloc, 'quoi': quoi, 'source': source}
        if fin is not None:
            e['fin'] = round(float(fin), 3)
        e.update(extra)
        evenements.append(e)

    def poser_bbc_ou(bus, ident, t_pic_src, avant, apres, t_evt, gain, usage, pan=0.0):
        r = bbc.pic(ident, t_pic_src, avant, apres, usage)
        if r is None:
            return None
        x, off = r
        poser(bus, x, t_evt - off, sr, pan=pan, gain=gain)
        return 'BBC %s' % ident

    # ================================ VOIX ================================
    vo, voix_humide, iv_voix, rapport_voix, corrections, ctrl_voix = voix_off_v9(sr, N, pieces, DUREE)
    actif = np.zeros(N, bool)
    for a, b in iv_voix:
        actif[int(a * sr):int(b * sr)] = True
    V = db(rms(vo[actif & (np.abs(vo) > 1e-5)]))            # niveau moyen de la voix (dBFS, avant master)
    fin_voix = {r['id']: r['fin'] for r in rapport_voix}
    parole = [(max(a, pa), min(b, pb)) for a, b in segments_parole(vo, sr) for pa, pb in iv_voix
              if a < pb and b > pa]                          # segments de parole découpés aux bornes des pièces (garde-fou local)

    # ================================ « LE MAL AIMÉ » : temps fort mesuré du refrain 1 ================================
    ch_cl = os.path.join(ICI, 'audio', 'sources', 'claude_francois_le_mal_aime.mp3')
    cl1 = temps_fort_cloclo(ch_cl, sr, *CLOCLO_REFRAIN_1)
    P_cl = 60.0 / cl1['bpm']
    t_ring = t_arene                                         # la Ring music entre sur « ARÈNE ! »

    # ================================ RING MUSIC (fil rouge, de t_ring à la fin) ================================
    ch_ring = os.path.join(ICI, 'audio', 'sources', 'ring_music.mp3')
    ring, infos_ring, analyse = musique_ring_continue(sr, ch_ring, t_ring, float(DEP['logo']), DUREE)
    ton = tonalite(analyse, sr)
    infos_ring['tonalite'] = {'tonique': ['do', 'do#', 'ré', 'mi♭', 'mi', 'fa', 'fa#', 'sol', 'la♭', 'la', 'si♭', 'si'][ton[0]],
                              'mode': ton[1], 'correlation': ton[2]}
    poser(B['ring'], ring, t_ring, sr)
    niveau_ring_ref = B['ring'] * G['ring']                  # niveau de référence (avant automation) pour caler les ambiances
    ev(t_ring, 'RING MUSIC (fil rouge) : entre sur son temps fort avec « ARÈNE ! » ; %d mesures jusqu\'au logo' % (
        infos_ring['mesures_logo_a_logo']), 'ring', fin=DUREE, source='audio/sources/ring_music.mp3 (extrait client, lu)')
    tq = ton[0] if ton[0] <= 6 else ton[0] - 12
    accord_aigu = accord_midi(tq, ton[1], base=72, voix=(12, 16, 19, 24))
    accord_cuivres = accord_midi(tq, ton[1], base=36, voix=(0, 7, 12, 16, 19, 24, 28, 31))
    arpege = accord_midi(tq, ton[1], base=72, voix=(0, 4, 7, 12, 16, 19, 24))
    t_imp = LB['descente'] + 1.1
    t_feu = float(LB['embrasement'])
    t_ouvre = max(float(GL['titre_eternelle']), fin_voix.get('gloire', float(GL['titre_eternelle']) + 0.5))
    pg0, pg1 = FA['pause_gotham']
    cles_gain = [(0.0, 0.0), (pg0 - 0.4, 0.0), (pg0 + 0.1, -18.0), (pg1 - 0.1, -18.0), (pg1 + 0.5, 0.0),
                 (t_imp, 0.0), (t_imp + 0.7, -16.0), (t_feu - 0.03, -16.0), (t_feu + 0.05, 2.0),
                 (t_ouvre - 0.02, 2.0), (t_ouvre + 0.25, 5.0), (DUREE, 5.0)]
    B['ring'] *= courbe_db(N, sr, cles_gain)[:, None]
    ev(pg0, 'ring : se retire presque (−18 dB) — pause de rythme à Gotham', 'familles', fin=pg1)
    ev(t_imp, 'ring : se retire (−16 dB) — suspense du conteneur', 'lootbox', fin=t_feu)
    ev(t_feu, 'ring : revient PLEINE (+2 dB) — tout s\'enflamme', 'lootbox')
    ev(t_ouvre, 'ring : + 3 dB après « éternelle »', 'gloire', fin=t_ouvre + 0.25)
    niveau_ring = B['ring'] * G['ring']

    # ================================ OUVERTURE (0 → 15,93) : refrain SEUL, coupure, salon, narration, vrille ================================
    rng = np.random.default_rng(95100)
    t_tf, t_tv = float(O['refrain_temps_fort']), float(O['tv_allume'])
    noir0, noir1 = O['noir']
    fest0, fest1 = O['allumage_festif']
    vr0, vr1 = O['vrille']
    debut_fic = cl1['temps_fort_retenu_s'] - t_tf            # temps fort 29,22 s du fichier → 0,81 s film
    xop = v7.decoder_ffmpeg(ch_cl, sr, debut_fic, T_COUPE_MUSIQUE + 0.6)
    xop = arret_platine(xop, sr, T_COUPE_MUSIQUE, D_ARRET)
    xop *= fenetre(xop.shape[0], 0.03, 0.005, sr)[:, None]
    ref_plein = rms(v7.decoder_ffmpeg(ch_cl, sr, cl1['temps_fort_retenu_s'], 4.0))
    xop *= 10 ** ((V + CLOCLO_SOUS_VOIX_DB) / 20.0) / (ref_plein + 1e-12)
    poser(B['cloclo'], xop, 0.0, sr)
    poser(B['fx'], mettre_au_niveau(tchk_telecommande(sr, rng), V - 14.0), T_COUPE_MUSIQUE, sr)
    cl1.update({'debut_fichier_s': round(debut_fic, 3), 'temps_fort_film_s': round(t_tf, 3), 'periode_temps_s': round(P_cl, 4),
                'coupure_s': [T_COUPE_MUSIQUE, round(T_COUPE_MUSIQUE + D_ARRET, 3)]})
    ev(0.0, '« Le Mal Aimé » REFRAIN 1 joué SEUL (lu dès %.3f s : anacrouse à %.2f, temps fort à %.2f)' % (
        debut_fic, cl1['anacrouse_mesuree_s'] - debut_fic, t_tf), 'ouverture', fin=T_COUPE_MUSIQUE,
       source='audio/sources/claude_francois_le_mal_aime.mp3 (lu)')
    ev(T_COUPE_MUSIQUE, 'COUPURE de la musique : la platine s\'arrête en %.2f s + « tchk » de télécommande' % D_ARRET, 'ouverture',
       fin=T_COUPE_MUSIQUE + D_ARRET)
    d_feu = t_arene + 0.5
    feu = feu_net(sr, rng, d_feu)
    feu *= np.interp(np.arange(feu.shape[0]) / sr, [0, T_COUPE_MUSIQUE, T_COUPE_MUSIQUE + 0.3, vr0, t_arene, d_feu],
                     [0.6, 0.6, 1.0, 1.0, 0.25, 0.0])[:, None]
    poser(B['amb'], mettre_au_niveau(feu, V - 24.0), 0.0, sr)
    salle = souffle_piece(sr, rng, d_feu)
    salle *= np.interp(np.arange(salle.shape[0]) / sr, [0, T_COUPE_MUSIQUE, T_COUPE_MUSIQUE + 0.3, t_arene, d_feu], [0.0, 0.0, 1.0, 0.6, 0.0])[:, None]
    poser(B['amb'], mettre_au_niveau(salle, V - 34.0), 0.0, sr)
    ev(0.0, 'ambiance du salon : feu qui crépite discret (seul après la coupure) + ton de salle', 'ouverture', fin=t_arene)
    for i in range(8):                                       # guirlandes : tics cristallins très discrets (bruitage, pas de musique)
        tg = fest0 + (fest1 - fest0) * i / 7
        poser(B['fx'], stereo(tic_cristal(sr, rng, tr_do(91 + [0, 4, 7, 12, 7, 12, 16, 19][i], tq)), -0.6 + 1.2 * i / 7), tg, sr, gain=0.035)
    ev(fest0, 'guirlandes qui s\'allument : tics cristallins très discrets', 'ouverture', fin=fest1)
    poser(B['fx'], mettre_au_niveau(tv_declic(sr, rng), V - 10.0), t_tv, sr)
    ev(t_tv, 'la télé s\'allume : déclic électrique', 'ouverture')
    d_vr = t_arene - 0.03 - vr0
    poser(B['fx'], mettre_au_niveau(riser_vrille(sr, rng, d_vr), V - 8.0), vr0, sr)
    ev(vr0, 'VRILLE : riser qui accélère + aspiration (sans musique)', 'ouverture', fin=t_arene - 0.03)
    tds = list(vr0 + (t_arene - 0.12 - vr0) * (1 - (1 - np.linspace(0.05, 1.0, 12)) ** 0.6))
    for i, td in enumerate(tds):
        poser(B['fx'], mettre_au_niveau(decharge_electrique(sr, rng, float(rng.uniform(0.08, 0.16))), V - 12.0 + 0.4 * i), td, sr)
    ev(tds[0], 'crépitements électriques de plus en plus serrés (12)', 'ouverture', fin=tds[-1] + 0.15)
    poser(B['emph'], sub_drop(sr, 2.0, 120.0, 26.0, 0.55), t_arene, sr, gain=1.0)
    poser(B['emph'], stereo(kit['kb']), t_arene, sr, gain=0.9)
    poser(B['emph'], stereo(v8.cymbale(sr, rng, 2.6, 1.0)), t_arene, sr, gain=0.35)
    poser(B['emph'], mettre_au_niveau(v8.foule(sr, rng, 4.2), V - 6.0), t_arene + 0.02, sr)
    ev(t_arene, '« ARÈNE ! » : impact sub + clameur de la foule + entrée de la Ring music', 'arrivee', fin=t_arene + 4.0)

    # ================================ ÉCURIES : bandeaux, mouvement, moteurs du Showroom, Lero Lero #12 ================================
    rec = np.random.default_rng(93200)
    rum = rumeur_foule(sr, rec, TEL['debut'] - t_arene + 0.5)
    poser(B['amb'], rum, t_arene + 1.0, sr, gain=0.05)
    lignes_ec = []
    infos_moteurs = {}
    banques = {eid: moteur_showroom(eid, sr) for eid in range(1, 16)}
    for k, e in enumerate(ecuries):
        eid = e['id']
        pan0 = -0.7 if k % 2 == 0 else 0.7
        sw = swoosh_grave(sr, rec)
        poser(B['fx'], mettre_au_niveau(sw, V - 12.0), e['debut'] - 0.55 * 0.75, sr)
        ev(e['debut'], 'écurie %d : swoosh grave (bandeau)' % eid, 'ecuries')
        tmp = np.zeros((N, 2))                                # mouvement discret (≤ −14 dB sous la musique)
        poser(tmp, jet_flammes(sr, rec, 0.7), e['sortie'], sr, gain=0.5)
        wv, pic = whoosh_buf(sr, 0.9, 93300 + k, sens=-1 if k % 2 else 1)
        poser(tmp, wv, e['saut'] + 0.25 - pic, sr, gain=0.5)
        poser(tmp, stereo(impact_amorti(sr, rec), pan0 * 0.2), e['atterrissage'], sr, gain=0.6)
        d_der = e['place'] - e['atterrissage'] + 0.15
        poser(tmp, pan_glisse(crissement(sr, rec, d_der, f0=float(rec.uniform(1000, 1350))), pan0 * 0.3, -pan0 * 0.3), e['atterrissage'] + 0.02, sr, gain=0.2)
        _, mv = rms_fenetres_db(tmp, sr, e['sortie'] - 0.2, e['place'] + 1.0)
        _, mu = rms_fenetres_db(niveau_ring_ref, sr, e['sortie'] - 0.2, e['place'] + 1.0)
        ecart = float(np.max(mv - mu))
        B['mouv'] += tmp * min(1.0, 10 ** ((MOUV_SOUS_MUSIQUE_DB - 0.5 - ecart) / 20.0))
        # MOTEUR RÉEL du Showroom au premier plan : ralenti bouclé + coup de gaz à la sortie + temps fort dans la respiration
        d_gag = e['place'] - e['sortie'] + 0.35
        n_g = int(d_gag * sr)
        gag = np.zeros((n_g + int(0.8 * sr), 2))
        bq = banques[eid]
        if bq is not None:
            ral = boucle(bq['ralenti'], n_g, sr)
            poser(gag, ral * fenetre(n_g, 0.12, 0.35, sr)[:, None], 0.0, sr, gain=0.45)
            g0 = bq['gaz'][0]
            poser(gag, g0[:n_g] * fenetre(min(n_g, g0.shape[0]), 0.01, 0.3, sr)[:, None], 0.05, sr, gain=1.0)
            x = bq['gaz'][1 % len(bq['gaz'])]
            src = '%s — %s (%s, sounds/moteurs_reels/%02d)' % (bq['moteur'], bq['type'], bq['licence'], eid)
            infos_moteurs[eid] = {'moteur': bq['moteur'], 'banque': bq['type'], 'licence': bq['licence'], 'credit': bq['credit']}
        else:
            x = stereo(moteur_qui_monte(sr, rec, d_gag))
            poser(gag, x, 0.0, sr)
            src = 'synthèse (banque absente)'
        if eid == 8:                                         # + les 3 bips Audi dans la 1re respiration
            bips = v7.decoder_ffmpeg(os.path.join(ICI, 'audio', 'sources', 'audi_chime.mp3'), sr, 0.80, 2.40)
            resp8 = respirations_voix(vo, sr, e['sortie'], e['fin'])
            t_b = resp8[0][0] - e['sortie'] if resp8 else 0.10
            poser(gag, mettre_au_niveau(fondus(bips, 0.01, 0.15), db(rms(gag[gag.any(axis=1)])) if gag.any() else -30.0), t_b, sr, gain=1.4)
            infos_moteurs[8]['bips_audi_film_s'] = round(e['sortie'] + t_b, 3)
            src += ' + 3 bips Audi (audi_chime 0,80–3,20)'
        niveau_gag = V + GAG_PHARE_SOUS_VOIX_DB
        gag = mettre_au_niveau(gag, niveau_gag)
        fin_gag = e['sortie'] + gag.shape[0] / sr
        resp = respirations_voix(vo, sr, e['sortie'], fin_gag)
        if eid == 12:                                        # #12 : « Lero Lero » au premier plan, moteur réel dessous
            ch_l = os.path.join(ICI, 'audio', 'sources', 'lero_lero.mp3')
            if os.path.isfile(ch_l):
                xl = v7.decoder_ffmpeg(ch_l, sr, LERO_DEBUT_S, LERO_DUREE_S[1] + 0.2)
                hh = int(0.01 * sr)
                ml = xl.mean(axis=1)
                el = 20 * np.log10(np.sqrt(np.mean(ml[:ml.shape[0] // hh * hh].reshape(-1, hh) ** 2, axis=1)) + 1e-12)
                k0, k1 = int(LERO_DUREE_S[0] * 100), min(el.shape[0], int(LERO_DUREE_S[1] * 100))
                i_c = (k0 + int(np.argmin(el[k0:k1]))) * hh
                xl = xl[:i_c] * fenetre(i_c, 0.01, 0.06, sr)[:, None]
                gag *= 10 ** (LERO_MOTEUR_SOUS_DB / 20.0)
                t_l = resp[0][0] - e['sortie'] if resp and resp[0][0] - e['sortie'] < 0.6 else 0.10
                need = int((t_l + xl.shape[0] / sr + 0.05) * sr)
                if need > gag.shape[0]:
                    gag = np.pad(gag, ((0, need - gag.shape[0]), (0, 0)))
                poser(gag, mettre_au_niveau(xl, niveau_gag), t_l, sr)
                fin_gag = e['sortie'] + gag.shape[0] / sr
                resp = respirations_voix(vo, sr, e['sortie'], fin_gag)
                infos_moteurs[12]['lero_lero'] = {'fichier_s': [LERO_DEBUT_S, round(LERO_DEBUT_S + i_c / sr, 3)],
                                                  'coupe_sur_creux_db': round(float(el[i_c // hh]), 1), 't_film': round(e['sortie'] + t_l, 3),
                                                  'duree_s': round(i_c / sr, 3)}
                src += ' (sous) + « Lero Lero » %.2f → %.2f s du fichier' % (LERO_DEBUT_S, LERO_DEBUT_S + i_c / sr)
            else:
                print('  [AVERTISSEMENT] audio/sources/lero_lero.mp3 absent -> #12 sans son gag')
        if resp and eid != 12:                                             # temps fort : le coup de gaz le plus énergique (0,6 s) dans la plus longue respiration
            ra, rb_, _ = max(resp, key=lambda r_: r_[1] - r_[0])
            lg = int(0.6 * sr)
            en = np.convolve(np.mean(x ** 2, axis=1), np.ones(lg) / lg, 'valid') if x.shape[0] > lg else np.ones(1)
            i_m = int(np.argmax(en))
            tf_ = x[i_m:i_m + lg]
            poser(gag, mettre_au_niveau(tf_ * fenetre(tf_.shape[0], 0.02, 0.2, sr)[:, None], niveau_gag), ra - e['sortie'], sr)
        acc_db = ACCENT_PHARE_DB
        cl_ = [(0.0, 0.0)]
        for ra, rb_, _ in resp:
            cl_ += [(ra - e['sortie'] - 0.015, 0.0), (ra - e['sortie'], acc_db), (rb_ - e['sortie'], acc_db), (rb_ - e['sortie'] + 0.015, 0.0)]
        cl_.append((gag.shape[0] / sr + 1.0, 0.0))
        gag = gag * courbe_db(gag.shape[0], sr, cl_)[:, None]
        poser(B['gags'], gag, e['sortie'], sr)
        ev(e['sortie'], 'écurie %d : MOTEUR RÉEL du Showroom au premier plan — %s' % (eid, src), 'ecuries', fin=fin_gag)
        lignes_ec.append({'id': eid, 'debut': e['debut'], 'sortie': e['sortie'], 'saut': e['saut'], 'atterrissage': e['atterrissage'],
                          'place': e['place'], 'fin': e['fin'], 'moteur': src,
                          'mouvement_sous_musique_db_max': round(min(ecart, MOUV_SOUS_MUSIQUE_DB - 0.5), 1),
                          'respirations_voix_s': [[round(a_, 2), round(b_, 2), t_] for a_, b_, t_ in resp]})
    # RUSH : impact sub + stinger du moteur réel à chaque coupe
    for j, (tc, eid) in enumerate(zip(RU['cuts'], RU['ordre'])):
        imp = impact_smash(sr, rec, kit)
        bq = banques.get(eid)
        x = bq['gaz'][j % len(bq['gaz'])] if bq is not None else stereo(moteur_qui_monte(sr, rec, 0.5))
        lg = int(0.45 * sr)
        en = np.convolve(np.mean(x ** 2, axis=1), np.ones(int(0.05 * sr)) / int(0.05 * sr), 'valid')
        i_pk = int(np.argmax(en[:max(1, x.shape[0] - lg)]))
        st = x[i_pk:i_pk + lg]
        st = norme(st) * fenetre(st.shape[0], 0.004, 0.2, sr)[:, None]
        poser(imp, st, 0.0, sr, gain=0.8)
        poser(B['gags'], mettre_au_niveau(imp, V - 4.0), tc, sr)
        ev(tc, 'RUSH #%d : impact sub + stinger du moteur réel' % eid, 'rush')
    t_cv = next((float(q['t_film']) for q in pieces_toutes if q['id'] == 'rush_convies'), float(CO['debut']))
    poser(B['emph'], stereo(v8.cymbale(sr, rec, 2.6, 1.0)), t_cv, sr, gain=0.4)
    poser(B['emph'], stereo(kit['kb']), t_cv, sr, gain=0.6)
    poser(B['amb'], mettre_au_niveau(v8.foule(sr, rec, 3.5), V - 6.0), t_cv + 0.03, sr)
    ev(t_cv, '« …SONT CONVIÉS ! » : clameur + coup de cymbale' + ('' if 'rush_convies' not in manquantes else ' (voix à générer)'), 'couronne')
    t_po = CO['portail']
    poser(B['fx'], mettre_au_niveau(glitch_teleport(sr, rec), V - 7.0), t_po, sr)
    poser(B['fx'], mettre_au_niveau(swoosh_grave(sr, rec), V - 10.0), t_po - 0.41, sr)
    ev(t_po, 'portail de la couronne : glitch / téléportation + swoosh grave', 'couronne')

    # ================================ FAMILLES ================================
    rfm = np.random.default_rng(93600)
    bus_got, bus_f1, bus_tk = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
    dg = g1f - g0f
    poser(bus_got, pluie(sr, rfm, dg + 0.1, 380.0, sombre=True), g0f, sr, gain=0.40)
    poser(bus_got, stereo(tonnerre_lointain(sr, rfm, 3.0), -0.3), pg0 + 0.35, sr, gain=0.45)
    poser(bus_got, stereo(tonnerre_lointain(sr, rfm, 2.4), 0.4), g1f - 1.6, sr, gain=0.30)
    nd = nappe_accords(sr, dg + 0.1, accord_midi(tq, 'mineur', base=36, voix=(0, 7, 12, 15)), rfm, brillance=0.15, attaque=1.0, relache=0.3)
    poser(bus_got, nd, g0f, sr, gain=0.22)
    poser(bus_got, pan_glisse(moteur_grave_batmobile(sr, rfm, g1f - pg1 + 0.1), -0.4, 0.4), pg1, sr, gain=0.45)
    ev(g0f, 'Gotham : PAUSE de rythme (fondu, pluie, tonnerre lointain, nappe sombre), puis moteur grave de Batmobile', 'familles', fin=g1f)
    dedans = [fi for fi in FEUX_F1_INTERNES if vers_film_ou_none(seg['familles'], fi) is not None
              and f0f - 1e-9 <= vers_film(seg['familles'], fi) < f1f - 1e-6]
    avant = [fi for fi in FEUX_F1_INTERNES if fi < min(dedans or [1e9])]
    apres = [fi for fi in FEUX_F1_INTERNES if fi > max(dedans or [-1e9])]
    conv = [vers_film(seg['familles'], fi) for fi in dedans]
    fin_b = f1f - 0.30
    t_av = list(np.linspace(f0f + 0.06, (conv[0] if conv else fin_b) - 0.3, len(avant))) if len(avant) > 1 else [f0f + 0.06] * len(avant)
    t_ap = list(np.linspace(conv[-1] if conv else f0f + 0.06, fin_b, len(apres) + 1)[1:]) if apres else []
    bips = sorted(float(x) for x in t_av + conv + t_ap)
    for i, tb in enumerate(bips):
        poser(bus_f1, stereo(bip_feux(sr, 880.0)), tb, sr, gain=0.5)
        ev(tb, 'F1 : bip du feu rouge %d/5' % (i + 1), 'familles')
    d_gr = bips[-1] + 0.3 - f0f
    ngr = int(d_gr * sr)
    tgr = temps(ngr, sr)
    for j, (fr, pan) in enumerate(((182.0, -0.6), (194.0, 0.1), (207.0, 0.6))):
        ph = phase_continue(fr * (1.0 + 0.003 * np.sin(2 * np.pi * 6.0 * tgr + j)), sr)
        xg = sum(np.sin(h * ph + 0.4 * h) / h ** 0.9 for h in range(1, 14) if fr * h * 1.4 < 0.45 * sr)
        poser(bus_f1, np.tanh(1.4 * norme(xg)) * fenetre(ngr, 0.05, 0.2, sr), f0f, sr, pan=pan, gain=0.07)
    t_v6 = bips[-1] + 0.08
    poser(bus_f1, v6_hybride_ralenti(sr, rfm, f1f - t_v6 + 0.3), t_v6, sr, gain=0.6)
    ev(f0f, 'F1 : grille au ralenti, 5 bips, rugissement coupé net par Tokyo', 'familles', fin=f1f)
    dk = k1f - k0f
    poser(bus_tk, pluie(sr, rfm, dk + 0.1, 300.0), k0f, sr, gain=0.12)
    poser(bus_tk, stereo(bourdonnement_neon(sr, rfm, dk + 0.1), 0.5), k0f, sr, gain=0.06)
    passes = [(0.25, 150.0, 1), (0.75, 185.0, -1), (1.2, 165.0, 1), (1.65, 205.0, -1), (2.15, 175.0, 1), (2.7, 195.0, -1)]
    for d, fb, sens in passes:                               # vraie course : dépassements, Doppler croisés gauche ↔ droite
        pt = passage_turbo(sr, rfm, 1.4, fb)
        poser(bus_tk, pt[:, ::-1] if sens < 0 else pt, k0f + d - 0.55 * 1.4, sr, gain=0.5)
    for d in (0.95, 1.9, 2.9):
        poser(bus_tk, pan_glisse(crissement(sr, rfm, 0.45, f0=float(rfm.uniform(1050, 1300))), -0.5, 0.5), k0f + d, sr, gain=0.16)
    ev(k0f, 'Tokyo : VRAIE COURSE — 6 dépassements Doppler croisés, crissements, néons', 'familles', fin=k1f)
    niveaux_fam = {}
    for nom, bb, a, b in (('gotham', bus_got, g0f, g1f), ('f1', bus_f1, f0f, f1f), ('tokyo', bus_tk, k0f, k1f)):
        ecart = rms_db_fenetre(bb * G['fam'], a, b) - rms_db_fenetre(niveau_ring_ref, a, b)
        bb *= 10 ** ((FAM_SOUS_MUSIQUE_DB - ecart) / 20.0)
        niveaux_fam[nom] = FAM_SOUS_MUSIQUE_DB
    m_got = masque_intervalle(N, g0f, g1f)
    i0g = int(g0f * sr)
    m_got[i0g:i0g + int(0.6 * sr)] *= np.sin(0.5 * np.pi * np.arange(int(0.6 * sr)) / int(0.6 * sr))   # entrée à Gotham en FONDU
    B['fam'] += (bus_got * m_got[:, None] + bus_f1 * masque_intervalle(N, f0f, f1f)[:, None]
                 + bus_tk * masque_intervalle(N, k0f, k1f)[:, None])
    ev(g0f, 'entrée à Gotham : fondu (pas de glitch)', 'familles')
    for tz, g_sw, g_gl, quoi in ((f0f, -10.0, -8.0, 'swoosh grave + glitch'), (k0f, -14.0, -16.0, 'swoosh + glitch discret'),
                                 (k1f, -10.0, -8.0, 'swoosh grave + glitch')):
        poser(B['fx'], mettre_au_niveau(swoosh_grave(sr, rfm), V + g_sw), tz - 0.41, sr)
        poser(B['fx'], mettre_au_niveau(glitch_teleport(sr, rfm, 0.4 if g_gl < -10 else 0.55), V + g_gl), tz - 0.05, sr)
        ev(tz, 'transition de monde : %s' % quoi, 'familles')

    # ================================ CASINO ================================
    rt = np.random.default_rng(93500)
    for tk_, quoi in ((TEL['pari'], 'pari'), (TEL['points'], 'points'), (TEL['bonus'], 'bonus (jackpot)')):
        poser(B['gags'], mettre_au_niveau(ka_ching(sr, rt), V - 1.0), tk_ - 0.12, sr)
        ev(tk_, 'KA-CHING (cloche 2450 + 3680 Hz + tiroir-caisse) : %s' % quoi, 'telephone')
    poser(B['gags'], mettre_au_niveau(cascade_pieces(sr, rt), V - 8.0), TEL['points'] + 0.05, sr)
    ev(TEL['points'], 'cascade de pièces d\'or qui tintent', 'telephone', fin=TEL['points'] + 1.5)
    d_rl = TEL['bonus'] - TEL['lootbox']
    rl_ = roulette(sr, rt, d_rl)[:int(d_rl * sr)]
    poser(B['fx'], mettre_au_niveau(rl_ * fenetre(rl_.shape[0], 0.01, 0.03, sr)[:, None], V - 9.0), TEL['lootbox'], sr)
    ev(TEL['lootbox'], 'roulette qui ralentit jusqu\'au jackpot', 'telephone', fin=TEL['bonus'])
    poser(B['fx'], jingle_cle(sr, rt, arpege, accord_aigu), TEL['bonus'] + 0.05, sr, gain=0.4)
    poser(B['gags'], mettre_au_niveau(cascade_pieces(sr, rt, 0.9, 24), V - 10.0), TEL['bonus'] + 0.1, sr)
    poser(B['fx'], mettre_au_niveau(swoosh_rouge(sr, rt), V - 6.0), TEL['piege'] - 0.45, sr)
    ev(TEL['piege'], 'piège : swoosh rouge menaçant', 'telephone', fin=TEL['piege'] + 1.0)

    # ================================ CONTENEUR : SUSPENSE puis EMBRASEMENT ================================
    rl = np.random.default_rng(93700)
    t_desc = LB['descente']
    poser(B['fx'], stereo(v8.obus_siffle(sr, t_imp - t_desc), 0.1), t_desc, sr, gain=0.25)
    poser(B['fx'], riser(sr, t_imp - t_desc, rl, f0=300.0, f1=6000.0), t_desc, sr, gain=0.2)
    ev(t_desc, 'conteneur qui descend (sifflement)', 'lootbox', fin=t_imp)
    poser(B['fx'], impact_metal_lourd(sr, rl), t_imp, sr, gain=0.8)
    ev(t_imp, 'IMPACT LOURD du conteneur — la musique se retire', 'lootbox')
    d_sus = LB['trophee_sort'] - (t_imp + 0.3)
    poser(B['fx'], mettre_au_niveau(battement_coeur(sr, d_sus), V - 9.0), t_imp + 0.3, sr)
    ev(t_imp + 0.3, 'battements de cœur lents (58 → 72 /min)', 'lootbox', fin=LB['trophee_sort'])
    poser(B['amb'], mettre_au_niveau(souffle_sombre(sr, rl, d_sus), V - 20.0), t_imp + 0.3, sr)
    for tgc in (t_imp + 0.9, t_imp + 1.9, LB['verrous'] - 0.45, LB['entrouvre'] + 0.9, LB['entrouvre'] + 1.9):
        poser(B['fx'], mettre_au_niveau(stereo(v8.grincement(sr, rl, float(rl.uniform(0.6, 1.0))), float(rl.uniform(-0.6, 0.6))), V - 13.0), tgc, sr)
        ev(tgc, 'grincement métallique', 'lootbox')
    t_v = LB['verrous']
    for i in range(4):                                       # verrous UN À UN
        tv = t_v + 0.3 * i
        poser(B['fx'], stereo(clac_metal(sr, rl, float(rl.uniform(700, 1100))), -0.6 + 0.4 * i), tv, sr, gain=0.8)
        ev(tv, 'verrou %d/4' % (i + 1), 'lootbox')
    poser(B['fx'], cliquetis(sr, rl, LB['ouvert'] - LB['entrouvre'], 12.0, 6.0), LB['entrouvre'], sr, gain=0.35)
    ev(LB['entrouvre'], 'rideau qui s\'enroule lentement', 'lootbox', fin=LB['ouvert'])
    t_ts, t_th = LB['trophee_sort'], GL['trophee_haut']
    d_ch = t_th - t_ts + 0.6
    poser(B['mus'], choeur_dore(sr, rl, d_ch, accord_midi(tq, ton[1], base=60, voix=(0, 7, 12, 16))), t_ts, sr, gain=0.25)
    poser(B['mus'], shimmer(sr, rl, d_ch, 3000.0, 10000.0, 22) * (np.linspace(0.0, 1.0, int(d_ch * sr)) ** 1.5)[:, None], t_ts, sr, gain=0.2)
    ev(t_ts, 'le trophée sort : scintillement doré + chœur', 'lootbox', fin=t_ts + d_ch)
    poser(B['emph'], sub_drop(sr, 2.0, 110.0, 26.0, 0.5), t_feu, sr, gain=1.0)
    poser(B['emph'], stereo(kit['kb']), t_feu, sr, gain=0.9)
    poser(B['emph'], stereo(v8.cymbale(sr, rl, 3.0, 1.2)), t_feu, sr, gain=0.35)
    for i, (d, pan) in enumerate(((0.0, -0.85), (0.04, 0.85), (0.12, -0.45), (0.16, 0.45), (0.45, -0.7), (0.5, 0.7))):
        poser(B['fx'], jet_flammes(sr, rl, 1.0), t_feu + d, sr, pan=pan, gain=0.55)
    for d, tl in ((0.05, 1.0), (0.55, 0.8), (1.1, 0.9), (1.8, 0.7)):
        poser(B['fx'], feu_artifice(sr, rl, tl), t_feu + d, sr, pan=float(rl.uniform(-0.6, 0.6)), gain=0.5)
    poser(B['amb'], mettre_au_niveau(v8.foule(sr, rl, 5.0), V - 6.0), t_feu + 0.03, sr)
    ev(t_feu, 'TOUT S\'ENFLAMME : jets de flammes pyro, feux d\'artifice, la foule explose, la musique revient pleine', 'lootbox',
       fin=t_feu + 3.0)

    # ================================ GLOIRE ================================
    rg = np.random.default_rng(93800)
    for i, m in enumerate(accord_aigu):
        poser(B['fx'], stereo(cloche(midi_hz(m + 12), 1.5, sr, 0.7), -0.5 + 0.33 * i), t_th + 0.04 * i, sr, gain=0.14)
    ev(t_th, 'trophée en haut : éclat de cloches', 'gloire')
    for t_mot, nom, taille in ((GL['titre_gloire'], 'GLOIRE', 0.8), (GL['titre_eternelle'], 'ÉTERNELLE', 1.0)):
        poser(B['emph'], sub_drop(sr, 1.6, 105.0, 30.0, 0.4), t_mot, sr, gain=0.9 * taille)
        poser(B['emph'], stereo(kit['kb']), t_mot, sr, gain=0.8 * taille)
        poser(B['emph'], stereo(v8.cymbale(sr, rg, 2.8, 1.0)), t_mot, sr, gain=0.30 * taille)
        poser(B['emph'], feu_artifice(sr, rg, taille), t_mot + 0.02, sr, gain=0.45)
        ev(t_mot, '« %s » : impact + cymbale + feu d\'artifice' % nom, 'gloire', fin=t_mot + 2.0)
    t_et = GL['titre_eternelle']
    poser(B['emph'], feu_artifice(sr, rg, 0.7), t_et + 0.45, sr, gain=0.35)
    i_e0, i_e1 = int((GL['titre_gloire'] - 0.5) * sr), min(N, int((t_ouvre + 3.0) * sr))
    medium = np.stack([filtre_bande(B['emph'][i_e0:i_e1, c], sr, 300.0, 3500.0) for c in range(2)], axis=1)
    B['emph'][i_e0:i_e1] -= (1.0 - 10 ** (-14.0 / 20.0)) * medium        # médium laissé à la voix
    poser(B['fx'], confettis(sr, rg), GL['confettis'], sr, gain=0.4)
    poser(B['amb'], v8.foule(sr, rg, 5.0), t_et, sr, gain=0.55)
    ev(t_et, 'CLAMEUR DE FOULE + confettis', 'gloire', fin=t_et + 4.5)
    poser(B['mus'], fanfare(sr, rg, kit), t_ouvre - 0.95, sr, gain=0.38)
    ev(t_ouvre - 0.6, 'fanfare : timbales, appel de cuivres, accord majeur (relatif de la ring)', 'gloire', fin=t_ouvre + 4.0)

    # ================================ FIN : départ plus plein, final musical sur le logo ================================
    rd = np.random.default_rng(93900)
    poser(B['fx'], stereo(twang_cordes(sr, rd), -0.3), DEP['cordes'], sr, gain=0.35)
    ev(DEP['cordes'], 'cordes du ring qui claquent', 'depart')
    t_dem, t_pis, t_lf = DEP['demarrage'], DEP['piste'], DEP['logo']
    for i in range(15):
        td = t_dem + 0.07 * i + float(rd.uniform(0.0, 0.03))
        pan = -0.85 + 1.7 * ((i * 7) % 15) / 14.0
        poser(B['fx'], stereo(demarreur(sr, rd, 0.32), pan), td, sr, gain=0.18)
        bq = banques.get(i + 1)
        lmax = int((t_pis - td + 0.4) * sr)
        x = bq['gaz'][0][:lmax] if bq is not None else stereo(moteur_qui_monte(sr, rd, lmax / sr, 70.0 + 5 * i, 200.0 + 8 * i))
        poser(B['fx'], norme(x) * fenetre(x.shape[0], 0.04, 0.5, sr)[:, None], td + 0.28, sr, pan=0.0, gain=0.13)
    ev(t_dem, 'les 15 moteurs réels démarrent', 'depart', fin=t_pis + 0.4)
    for d, fb, sens in ((-1.1, 160.0, 1), (-0.5, 185.0, -1), (-0.25, 170.0, 1), (0.0, 140.0, -1), (0.2, 200.0, 1), (0.45, 155.0, -1),
                        (1.1, 175.0, 1), (1.7, 190.0, -1)):
        pt = passage_turbo(sr, rd, 1.6, fb)
        poser(B['fx'], pt[:, ::-1] if sens < 0 else pt, t_pis + d - 0.55 * 1.6, sr, gain=0.34)
    wv, pic = whoosh_buf(sr, 1.2, 93901, sens=1)
    poser(B['fx'], wv, t_pis - pic, sr, gain=0.45)
    ev(t_pis - 1.1, 'moteurs qui passent en trombe (8 passages Doppler croisés)', 'depart', fin=t_pis + 1.8)
    for d, tl in ((-2.0, 0.7), (-1.0, 0.8), (-0.4, 0.8), (0.0, 1.0), (0.7, 0.9), (1.5, 0.8), (2.2, 0.6)):
        poser(B['fx'], feu_artifice(sr, rd, tl), t_lf + d, sr, pan=float(rd.uniform(-0.7, 0.7)), gain=0.45)
    ev(t_lf - 2.0, 'feux d\'artifice (7) autour du logo', 'depart', fin=t_lf + 2.6)
    d_cr = t_lf - (t_pis + 0.3)
    poser(B['fx'], riser(sr, d_cr, rd, f0=300.0, f1=11000.0), t_pis + 0.3, sr, gain=0.3)
    nfo = int((DUREE - t_dem) * sr)
    poser(B['amb'], rumeur_foule(sr, rd, nfo / sr) * np.interp(np.arange(nfo) / sr, [0, t_lf - t_dem, nfo / sr], [0.5, 1.0, 0.6])[:, None],
          t_dem, sr, gain=0.16)
    for tf_, dur in ((t_pis, 3.5), (t_lf, 3.0)):
        poser(B['amb'], mettre_au_niveau(v8.foule(sr, rd, dur), V - 8.0), tf_ + 0.02, sr)
    ev(t_dem, 'foule pleine jusqu\'à la fin (rumeur + 2 clameurs)', 'depart', fin=DUREE - 0.06)
    d_res = DUREE - 0.06 - t_lf
    poser(B['fx'], sub_drop(sr, 2.2, 110.0, 26.0, 0.6), t_lf, sr, gain=1.0)
    poser(B['fx'], stereo(kit['kb']), t_lf, sr, gain=0.9)
    poser(B['fx'], stereo(v8.cymbale(sr, rd, d_res, 1.2)), t_lf, sr, gain=0.32)
    poser(B['fx'], jingle_cle(sr, rd, arpege, accord_aigu), t_lf + 0.05, sr, gain=0.45)
    acc = v8.cuivres(accord_cuivres, d_res, sr, 1.6, attaque=0.01)
    ta = temps(acc.shape[0], sr)
    acc *= (np.exp(-ta / 1.4) * np.cos(0.5 * np.pi * np.clip((ta - (d_res - 0.6)) / 0.6, 0, 1)))[:, None]
    poser(B['mus'], acc, t_lf, sr, gain=0.45)
    ev(t_lf, 'LOGO FINAL : impact + accord + dernier temps fort de la ring et sa résonance', 'depart', fin=DUREE - 0.06)
    rf = next((r for r in rapport_voix if r['id'] == 'rendez_vous_final'), None)
    mots_fin = [m for m in (rf['mots'] if rf else []) if m['emphase']]
    for i, m in enumerate(mots_fin):                         # impact sur GRAND, PRIX DE, NOËL ; la musique ponctue NOËL
        g_ = 0.6 + 0.2 * i
        poser(B['emph'], sub_drop(sr, 1.4, 100.0, 30.0, 0.35), m['debut'], sr, gain=0.8 * g_)
        poser(B['emph'], stereo(kit['kb']), m['debut'], sr, gain=0.8 * g_)
        poser(B['emph'], stereo(v8.cymbale(sr, rd, 1.8, 0.7)), m['debut'], sr, gain=0.25 * g_)
        ev(m['debut'], '« %s » : impact (emphase stade)' % m['mot'], 'depart')
    if mots_fin:
        t_n = mots_fin[-1]['debut']
        d_n = DUREE - 0.06 - t_n
        accn = v8.cuivres(accord_cuivres, d_n, sr, 1.6, attaque=0.008)
        tn = temps(accn.shape[0], sr)
        accn *= (np.exp(-tn / 0.9) * np.cos(0.5 * np.pi * np.clip((tn - (d_n - 0.25)) / 0.25, 0, 1)))[:, None]
        poser(B['mus'], accn, t_n, sr, gain=0.5)
        poser(B['fx'], jingle_cle(sr, rd, arpege, accord_aigu)[:int(d_n * sr)], t_n + 0.03, sr, gain=0.4)
        poser(B['fx'], feu_artifice(sr, rd, 1.0)[:int(d_n * sr)], t_n + 0.05, sr, gain=0.45)
        ev(t_n, '« NOËL ! » : ponctuation musicale (accord de cuivres + cloches + cymbale + feu d\'artifice), éteinte avant la fin', 'depart',
           fin=DUREE - 0.06)

    # ================================ MIX : voix, ducking, mastering ================================
    bus_voix = np.stack([vo, vo], axis=1) * GAIN_VOIX
    plein = sum(B[k] * G[k] for k in ('amb', 'mus', 'fx', 'mouv', 'fam', 'drop')) + niveau_ring
    doux = B['gags'] * G['gags']
    clo = B['cloclo'] * G['cloclo']
    lit = B['lit'] * G['lit']
    demi = B['emph'] * G['emph']
    libre = B['scratch'] * G['scratch']                      # le scratch n'est jamais baissé
    for x in (plein, doux, clo, lit, demi, libre):
        x[int((DUREE - 0.06) * sr):] = 0.0
    duck_clo = courbe_ducking(iv_voix, [DUCK_CLOCLO_DB] * len(iv_voix), N, sr)
    duck_lit = courbe_ducking(iv_voix, [DUCK_LIT_DB] * len(iv_voix), N, sr)
    masque_parole = np.zeros(N, bool)
    for a, b in parole:
        masque_parole[int(a * sr):int(b * sr)] = True
    seg_piece = [[k for k, (a, b) in enumerate(parole) if a < pb and b > pa] for pa, pb in iv_voix]
    red_gags = [DUCK_GAGS_DB] * len(parole)
    red_clo = [DUCK_CLOCLO_DB] * len(iv_voix)
    reductions = [DUCK_BASE_DB] * len(iv_voix)
    for it in range(20):
        duck = courbe_ducking(iv_voix, reductions, N, sr)
        duck_clo = courbe_ducking(iv_voix, red_clo, N, sr)
        duck_doux = courbe_ducking(parole, red_gags, N, sr, avant=0.03, apres=0.06)
        reste = (plein * duck[:, None] + demi * np.sqrt(duck)[:, None] + doux * duck_doux[:, None] + clo * duck_clo[:, None]
                 + lit * duck_lit[:, None] + libre)
        ok = True
        for j, r in enumerate(rapport_voix):
            i0, i1 = int(r['attaque'] * sr), int(r['fin'] * sr)
            vb = filtre_bande(bus_voix[i0:i1, 0], sr, 300.0, 3400.0)
            rb = filtre_bande(reste[i0:i1].mean(axis=1), sr, 300.0, 3400.0)
            mp = masque_parole[i0:i1]
            r['marge_db'] = round(rms_db_fenetre(bus_voix, r['attaque'], r['fin']) - rms_db_fenetre(reste, r['attaque'], r['fin']), 1)
            r['marge_bande_voix_db'] = round(db(rms(vb[mp])) - db(rms(rb[mp])), 1) if mp.any() else 99.0
            if r['marge_bande_voix_db'] < MARGE_VOIX_DB and reductions[j] > DUCK_MAX_DB:
                reductions[j] = max(DUCK_MAX_DB, reductions[j] - (MARGE_VOIX_DB - r['marge_bande_voix_db']) - 0.3)
                ok = False
            elif r['marge_bande_voix_db'] < MARGE_PAROLE_MIN_DB + 0.3:     # garde-fou : on baisse aussi les gags sous cette pièce
                for kk in seg_piece[j]:
                    red_gags[kk] = max(-15.0, red_gags[kk] - (MARGE_PAROLE_MIN_DB + 0.5 - r['marge_bande_voix_db']))
                red_clo[j] = max(-18.0, red_clo[j] - (MARGE_PAROLE_MIN_DB + 0.5 - r['marge_bande_voix_db']))
                ok = False
        if ok:
            break
    for j, r in enumerate(rapport_voix):
        r['ducking_db'] = round(reductions[j], 1)
        r['ducking_gags_db'] = round(min([red_gags[kk] for kk in seg_piece[j]] or [DUCK_GAGS_DB]), 1)
        r['ducking_mal_aime_db'] = round(red_clo[j], 1)
    marges = {r['id']: r['marge_bande_voix_db'] for r in rapport_voix}
    assert min(marges.values()) >= MARGE_PAROLE_MIN_DB, 'garde-fou voix : marge < %.0f dB : %s' % (
        MARGE_PAROLE_MIN_DB, {k: v for k, v in marges.items() if v < MARGE_PAROLE_MIN_DB})
    mix = reste + bus_voix + voix_humide * G['humide']
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
    r_mp3 = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', args.sortie, '-codec:a', 'libmp3lame', '-b:a', '320k', args.mp3],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert r_mp3.returncode == 0, 'encodage mp3 : ' + r_mp3.stderr.decode('utf-8', 'replace')[:300]

    # ================================ CONTRÔLES ================================
    g_lin = 10 ** (gain_db / 20.0)
    gl_lim = np.ones(N)                                        # gain du limiteur (approx. : rapport final / mix·g)
    stems = {'voix': bus_voix, 'ring': niveau_ring * duck[:, None], 'gags': B['gags'] * G['gags'] * duck_doux[:, None],
             'cloclo': clo * duck_clo[:, None], 'scratch': libre,
             'drop': B['drop'] * duck[:, None] + B['emph'] * np.sqrt(duck)[:, None], 'lit': lit * duck_lit[:, None]}
    stems = {k: v * g_lin * gl_lim[:, None] for k, v in stems.items()}
    if args.stems:
        os.makedirs(args.stems, exist_ok=True)
        for k, v in stems.items():
            ecrire_wav16(os.path.join(args.stems, k + '.wav'), np.clip(v, -1, 1), sr)
    # présence de la ring (fenêtres 50 ms) de son entrée à la fin
    tsr, vr = rms_fenetres_db(stems['ring'], sr, t_ring, DUREE - 0.06, fen=0.05, pas=0.05)
    trou, trou_max, t_trou = 0.0, 0.0, None
    for t_, v_ in zip(tsr, vr):
        if v_ < SEUIL_RING_DBFS:
            trou += 0.05
            if trou > trou_max:
                trou_max, t_trou = trou, round(float(t_) - trou + 0.05, 2)
        else:
            trou = 0.0
    controle_ring = {'fenetre_s': [t_ring, round(DUREE - 0.06, 3)], 'rms_min_dbfs': round(float(vr.min()), 1),
                     'rms_median_dbfs': round(float(np.median(vr)), 1), 'plus_long_trou_s': round(trou_max, 2), 'debut_trou': t_trou}
    assert trou_max <= TROU_MAX_S, 'ring music : trou de %.2f s à %s' % (trou_max, t_trou)
    # pics clairement audibles : RMS de l'élément vs RMS du reste du mix sur sa fenêtre, et saut du mix
    def emergence(nom, stem, a, b):
        s_db = rms_db_fenetre(stem, a, b)
        i0, i1 = int(a * sr), int(b * sr)
        reste_db = db(rms((relu - stem)[i0:i1]))
        fond_db = db(rms((relu - stem - stems['voix'])[i0:i1]))
        saut = rms_db_fenetre(relu, a, min(b, a + 0.3)) - rms_db_fenetre(relu, a - 0.6, a - 0.1)
        return {'element': nom, 'fenetre_s': [round(a, 3), round(b, 3)], 'rms_element_dbfs': round(s_db, 1),
                'rms_reste_dbfs': round(reste_db, 1), 'emergence_db': round(s_db - reste_db, 1),
                'emergence_sur_fond_sans_voix_db': round(s_db - fond_db, 1), 'saut_mix_db': round(saut, 1)}
    e_ = {e['id']: e for e in ecuries}
    pics = [emergence('« ARÈNE ! » %.2f (impact + foule + ring)' % t_arene, stems['drop'] + stems['ring'], t_arene, t_arene + 0.4)]
    pics += [emergence('#%02d moteur réel%s' % (i, ' + Lero Lero' if i == 12 else ''), stems['gags'], e_[i]['sortie'], e_[i]['place'])
             for i in range(1, 16)]
    pics.append(emergence('ka-ching %.2f' % TEL['pari'], stems['gags'], TEL['pari'], TEL['pari'] + 0.4))
    for p_ in pics:
        if 'moteur réel' in p_['element']:
            p_['objectif_8db_atteint'] = bool(p_['emergence_sur_fond_sans_voix_db'] >= 8.0)
    # aucune musique entre la coupure et « ARÈNE ! » (le refrain, la ring et les couches musicales sont muets)
    fen_s = (T_COUPE_MUSIQUE + D_ARRET, t_arene - 0.005)
    musique_muette = {k: round(rms_db_fenetre(v, *fen_s), 1) for k, v in (('le_mal_aime', stems['cloclo']), ('ring', stems['ring']),
                                                                          ('couches_musicales', B['mus'] * G['mus']))}
    assert max(musique_muette.values()) < -90.0, 'musique entre %.2f et %.2f : %s' % (fen_s[0], fen_s[1], musique_muette)
    # « EEENNN » : continuité de la voix placée de « …se transforme… » à « ARÈNE ! »
    rv = {r['id']: r for r in rapport_voix}
    hh = int(0.01 * sr)
    i_a, i_b = int(rv['transforme']['attaque'] * 100), int(t_arene * 100)
    ev_ = 20 * np.log10(np.sqrt(np.mean(vo[:vo.shape[0] // hh * hh].reshape(-1, hh) ** 2, axis=1)) + 1e-12)
    ref_v = float(ev_.max())
    bas = ev_[i_a:i_b] - ref_v < CONTINUITE_SEUIL_DB
    zones_bas, k_ = [], 0
    while k_ < bas.shape[0]:
        if bas[k_]:
            j_ = k_
            while j_ < bas.shape[0] and bas[j_]:
                j_ += 1
            za, zb = (i_a + k_) / 100.0, (i_a + j_) / 100.0
            voulue = any(abs(za - r1['fin']) < 0.03 and abs(zb - r2['attaque']) < 0.03
                         for r1, r2 in zip(rapport_voix, rapport_voix[1:]))
            zones_bas.append({'s': [round(za, 2), round(zb, 2)], 'respiration_voulue': bool(voulue)})
            k_ = j_
        k_ += 1
    t0_t = rv['en_tenu']['attaque'] + 0.03
    dans_tenue = [z for z in zones_bas if z['s'][1] > t0_t and z['s'][0] < t_arene - 0.01]
    assert not dans_tenue, '« EEENNN » : zone sous %.0f dB dans la tenue : %s' % (CONTINUITE_SEUIL_DB, dans_tenue)
    assert all(z['respiration_voulue'] for z in zones_bas), '« EEENNN » : blanc non voulu %s' % zones_bas
    i_t0, i_t1 = int(t0_t * 100), int((t_arene - 0.02) * 100)
    continuite = {'fenetre_s': [rv['transforme']['attaque'], t_arene], 'seuil_db': CONTINUITE_SEUIL_DB,
                  'zones_sous_seuil': zones_bas, 'tenue_min_db': round(float(ev_[i_t0:i_t1].min() - ref_v), 1),
                  'tenue_debut_fin_db': [round(float(np.mean(ev_[i_t0:i_t0 + 20]) - ref_v), 1), round(float(np.mean(ev_[i_t1 - 20:i_t1]) - ref_v), 1)],
                  'arene_cri_attaque_s': rv['arene_cri']['attaque'], 'musique_rms_dbfs_5_15_a_15_93': musique_muette}
    assert abs(rv['arene_cri']['attaque'] - t_arene) < 0.005, '« ARÈNE ! » à %.3f au lieu de %.2f' % (rv['arene_cri']['attaque'], t_arene)
    # temps fort du refrain dans la piste placée (flux spectral, ± 0,3 s autour de la clé)
    mc = stems['cloclo'].mean(axis=1)[:int(3.0 * sr)] + 1e-9 * np.random.default_rng(1).standard_normal(int(3.0 * sr))
    nfft, hop = 2048, 240
    idx = np.arange(nfft)[None, :] + hop * np.arange((mc.shape[0] - nfft) // hop)[:, None]
    Lc = np.log1p(10.0 * np.abs(np.fft.rfft(mc[idx] * np.hanning(nfft), axis=1)))
    flc = np.maximum(np.diff(Lc, axis=0), 0.0).sum(axis=1)
    tc_ = (np.arange(flc.shape[0]) + 1) * hop / sr + nfft / 2 / sr
    wc = (tc_ > t_tf - 0.3) & (tc_ < t_tf + 0.3)
    t_fort_mesure = float(tc_[wc][np.argmax(flc[wc])])
    cl1['temps_fort_mesure_dans_le_mix_s'] = round(t_fort_mesure, 3)
    assert abs(t_fort_mesure - t_tf) < 0.03, 'Mal Aimé : temps fort mesuré à %.3f au lieu de %.2f' % (t_fort_mesure, t_tf)
    # coupure interne des 15 prises d'écurie
    coupes_voix = {c['id']: c['zones_coupees'] for c in ctrl_voix}
    fautes = {k: v for k, v in coupes_voix.items() if k.startswith('ecurie_') and v}
    assert not fautes, 'coupure interne dans une prise d\'écurie : %s' % fautes
    reste_master = reste * g_lin
    for e in evenements:
        t = e['t']
        e['rms_mix_db'] = round(rms_db_fenetre(relu, t - 0.25, t + 0.25), 1)
        e['rms_bruitages_db'] = round(rms_db_fenetre(reste_master, t - 0.05, t + 0.45), 1)
    muets = [e for e in evenements if e['rms_bruitages_db'] < -60.0 and 'suspense' not in e['quoi']]
    assert not muets, 'événements muets : %s' % [(e['t'], e['quoi']) for e in muets]

    timeline = {
        'version': 'v9.5', 'duree': DUREE, 'echantillons': int(final.shape[0]), 'frequence_hz': sr, 'canaux': 2,
        'plan': os.path.relpath(args.plan, ICI).replace(os.sep, '/'), 'voix': os.path.relpath(args.voix, ICI).replace(os.sep, '/'),
        'evenements': sorted(evenements, key=lambda x: (x['t'], x['quoi'])),
        'voix_off': rapport_voix, 'corrections_bornes': corrections, 'controle_coupures_voix': coupes_voix,
        'intervalles_voix': [[round(a, 3), round(b, 3)] for a, b in iv_voix], 'niveau_voix_dbfs_avant_master': round(V, 1),
        'ecuries': lignes_ec, 'moteurs_showroom': infos_moteurs, 'le_mal_aime_ouverture': cl1, 'continuite_eeennn': continuite,
        'pieces_voix_absentes': manquantes,
        'ring_entree_s': round(t_ring, 3), 'bips_f1_film_s': [round(x, 3) for x in bips],
        'familles_sous_musique_db': niveaux_fam, 'musique_ring': infos_ring, 'controle_ring': controle_ring,
        'automation_ring': {'gain_db': cles_gain}, 'pics_audibles': pics,
        'banque_bbc': {'dossier': os.path.relpath(bbc.dossier, ICI).replace(os.sep, '/'), 'utilises': bbc.utilises},
        'mix': {'fichier': os.path.relpath(args.sortie, ICI).replace(os.sep, '/'), 'mp3': os.path.relpath(args.mp3, ICI).replace(os.sep, '/'),
                'gain_master_db': round(gain_db, 2), 'lufs_integre': round(lufs, 2), 'vrai_crete_dbtp': round(tp, 2),
                'ducking': 'voix : base %.0f dB → %.0f dB si la marge (bande 300 Hz–3,4 kHz, pendant la parole) < +%.0f dB ; gags %.0f dB sous la '
                           'PAROLE seulement (respirations libres, garde-fou +%.0f dB) ; Cloclo %.0f dB ; jazz %.0f dB ; impacts : moitié ; '
                           'scratch et humide « stade » non duckés' % (DUCK_BASE_DB, DUCK_MAX_DB, MARGE_VOIX_DB, DUCK_GAGS_DB,
                                                                    MARGE_PAROLE_MIN_DB, DUCK_CLOCLO_DB, DUCK_LIT_DB)},
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.timeline)), exist_ok=True)
    with open(args.timeline, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)

    print('Mix V9.5 : %s (+ %s)' % (args.sortie, os.path.basename(args.mp3)))
    print('  durée %.4f s (%d échantillons, attendu %d) | sonie %.2f LUFS | vrai crête %.2f dBTP | gain master %+.2f dB' % (
        final.shape[0] / sr, final.shape[0], N, lufs, tp, gain_db))
    print('  ring : %.2f → %.2f BPM (atempo), %d mesures %.2f → %.2f, raccords %s, tonalité %s %s | trou max %.2f s' % (
        infos_ring['bpm_mesure'], infos_ring['bpm_film'], infos_ring['mesures_logo_a_logo'], t_ring, DEP['logo'],
        infos_ring['raccords_film_s'], infos_ring['tonalite']['tonique'], infos_ring['tonalite']['mode'], trou_max))
    print('  Le Mal Aimé refrain 1 : %s' % cl1)
    print('  EEENNN / silence musical : %s' % continuite)
    print('  rendez_vous_final : %s' % [(m['mot'], m['debut'], m['fin']) for m in (rv.get('rendez_vous_final') or {}).get('mots') or []])
    if manquantes:
        print('  [AVERTISSEMENT] mix SANS les pièces : %s' % ', '.join(manquantes))
    print('  bips F1 %s | ring entre à %.3f' % ([round(x, 2) for x in bips], t_ring))
    for c in corrections:
        print('  borne %-13s début %s | fin %s' % (c['piece'], c['debut'], c['fin']))
    for r in rapport_voix:
        print('   voix %-12s %7.3f → %7.3f  retard %.3f  créneau %.3f  prise %.3f  atempo %.4f  débord %.3f  marge bande %+5.1f  duck %5.1f%s' % (
            r['id'], r['attaque'], r['fin'], r['retard_s'], r['creneau_s'], r['duree_prise_s'], r['atempo'], r['debordement_s'],
            r['marge_bande_voix_db'], r['ducking_db'], ('  EMPHASE dès %.3f' % r['emphase_depuis_s'] if r['emphase_depuis_s'] is not None else ('  EMPHASE par mot' if r['emphase'] else '')))
              + '  duck gags %5.1f' % r['ducking_gags_db'])
    for p_ in pics:
        print('  pic %-44s élément %6.1f dBFS | / tout le reste %+5.1f dB | / fond sans voix %+5.1f dB | saut du mix %+5.1f dB' % (
            p_['element'], p_['rms_element_dbfs'], p_['emergence_db'], p_['emergence_sur_fond_sans_voix_db'], p_['saut_mix_db']))
    print('  coupures internes (écuries) : aucune | timeline %s (%d événements) | calcul %.1f s' % (
        os.path.basename(args.timeline), len(evenements), time.time() - t_calc))
    return 0


if __name__ == '__main__':
    sys.exit(main())
