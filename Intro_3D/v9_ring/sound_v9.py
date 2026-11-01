#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bande-son V9.1 « Grand Prix de Noël — Ring » : 113,6 s calées sur data/plan_v9.json et data/voix_v9.json (version v9.1).

CARTE DU TEMPS (V9.1) : toutes les clés du plan (ouverture, ecuries, telephone, lootbox, gloire, depart) et chaque pièce de
voix (seg, t_interne) sont en temps INTERNE de leur segment ; elles sont converties en temps FILM par une fonction unique,
vers_film(segment, t_interne), qui applique segments[i].remap = [[filmA, filmB, interneA, interneB], …] exactement comme
noyau_v9.js (versFilm : premier morceau qui contient l'instant, bornes comprises). Une durée interne Δ devient
Δ × (filmB − filmA) / (interneB − interneA) dans un morceau accéléré (duree_film). Auto-test au lancement.

Déroulé en temps FILM (retours client V9.1) :
  0 → 6,8 s      OUVERTURE PROPRE : seulement un feu de cheminée net (craquements secs espacés + souffle doux, passe-haut
                 80 Hz), étincelle à 5,0, guirlandes 5,2 → 6,6 (tics cristallins discrets) ; un seul événement fort à la fois,
                 plus d'horloge ni de couches qui se masquent.
  6,8 s          CHOC DORÉ du logo (aigu + sub, sans cuivres médium) = départ de la RING MUSIC ; la voix « Mesdames et
                 messieurs… » (6,95) passe seule dans le médium. 9,6 tapis (un whoosh), 11,6 plongée (riser), 12,6 arène.
  6,8 → 113,6 s  RING MUSIC du client (audio/sources/ring_music.mp3) EN CONTINU sur tout le film : boucle propre sur les
                 temps forts (≈ 90 BPM), étirée de quelques millièmes pour qu'un nombre entier de mesures sépare le choc du
                 logo (6,8) du logo final (111,1) ; ducking sous la voix ; montée +2 dB et filtre qui se referme pendant la
                 gloire, puis ouverture du filtre + 3 dB après « ÉTERNELLE » ; fin nette au logo final (temps fort +
                 résonance de la musique elle-même jusqu'à 113,6).
  15,1 → 72,1    ÉCURIES : plus AUCUN extrait d'écurie ni carillon ; seulement des bruitages de mouvement discrets (flamme
                 du tunnel, whoosh du saut, impact d'atterrissage, crissement du dérapage), chacun ≤ −14 dB sous la musique.
  72,1 → 81,6    TÉLÉPHONE : sons d'interface (pari, points, lootbox, bonus, piège) sur la ring music.
  81,6 → 90,6    FAMILLES 3 × 3 s, coupes franches à 84,6 et 87,6 : Gotham (pluie + moteur grave), F1 (5 bips des feux,
                 calés sur les feux visibles), Tokyo (néon + turbos), sous la ring music.
  90,6 → 97,6    LOOTBOX : descente 90,9 (sifflement), impact lourd 92,0, verrous 93,1, rideau 94,3 → 95,7, trophée qui
                 sort 95,9 (chœur + scintillement doré qui montent jusqu'à 98,3).
  97,6 → 105,6   GLOIRE : « la gloire… ÉTERNELLE » en traitement annonceur de stade (+2 dB, compression légère, grande salle
                 1,8 s + échos) ; impact + éclat de cymbale/feu d'artifice sur « GLOIRE » (99,5) et « ÉTERNELLE » (100,3) ;
                 clameur qui explose à 100,3.
  105,6 → 113,6  DÉPART : cordes 105,9, moteurs 106,6, passage en trombe 108,6, logo 111,1 (impact final), fin 113,6.
Voix off (prioritaire) : pièces recollées (fondus 5 ms, `blanc` s), atempo ≤ 1,25 si > duree_max, posées à
vers_film(seg, t_interne). Ducking de tout le reste (−9 dB de base, enveloppe lissée 80 ms, approfondi jusqu'à −14 dB).

Réutilise par IMPORT la bande-son V8 (../v8_finale/sound_v8.py, non modifiée) et la V7 à travers elle. Bruitages réels BBC
(licence RemArc, usage personnel) lus dans ../audio_v5/sons_reels/ s'ils existent ; sinon synthèse (jamais de silence).

Sorties : audio/mix_v9.wav (48 kHz stéréo 16 bit, 113,6 s exactement, −16 LUFS intégrés BS.1770-4, vrai crête ≤ −1 dBTP)
et data/timeline_v9.json (événements horodatés en temps film + mesures de contrôle, dont la présence continue de la ring
music de 6,8 à 113,6 s). La ring music (sous droits) est LUE, jamais copiée ; audio/ est ignoré par git.
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
    centrés sur un premier temps. La lecture est étirée d'un facteur r ≈ 1 (millièmes, hauteur inchangée à l'oreille :
    < 5 cents) pour que t_logo − t_debut = un nombre ENTIER de mesures : le logo final tombe sur un temps fort.
    Au logo : la musique joue encore 0,30 s (le temps fort) puis s'éteint en 0,25 s ; sa résonance (réverbe 100 % humide
    3,4 s du dernier temps fort) tient jusqu'à t_fin. Retourne (stéréo de t_debut à t_fin, infos, extrait d'analyse)."""
    t_fen0 = FENETRE_RING[0] - 3.0
    x = v7.decoder_ffmpeg(chemin, sr, t_fen0, FENETRE_RING[1] - t_fen0 + 3.0)
    P, t1 = analyser_ring(x, sr, t_fen0)
    K = int((FENETRE_RING[1] - t1) / P) // 4 * 4
    nb_mesures = int(round((t_logo - t_debut) / P))
    P2 = (t_logo - t_debut) / nb_mesures
    r = P2 / P
    # étirement : rééchantillonnage FFT de tout l'extrait (longueur × r)
    n2 = int(round(x.shape[0] * r))
    xs = signal.resample(x, n2, axis=0)
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
    # résonance : dernier temps fort (logo − 0,05 → logo + 0,55) dans une grande réverbe, éteinte à t_fin
    i_a, i_b = n_logo - int(0.05 * sr), n_logo + int(0.55 * sr)
    stab = out[i_a:i_b] * fenetre(i_b - i_a, 0.005, 0.15, sr)[:, None]
    q = queue_reverbe(stab, sr, 3.4, 77, pre=0.02)
    q = np.stack([filtre_bande(q[:, c], sr, 70.0, None) for c in range(2)], axis=1)
    q *= 0.55 * rms(stab) / (rms(q[:int(0.6 * sr)]) + 1e-12)
    nq = min(q.shape[0], n_out - i_a)
    q = q[:nq] * fenetre(nq, 0.0, 0.45, sr)[:, None]
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
    """Recolle les morceaux de chaque pièce (fondus 5 ms, `blanc` s entre eux), atempo si > duree_max (≤ 1,25), pose à t_film.
    Pièce `emphase` : compression légère + 2 dB, et sa partie humide « stade » (échos + grande salle 1,8 s) va sur une piste
    séparée (la queue n'est pas une voix : elle ne compte pas dans les chevauchements). Retourne (piste mono, piste humide
    stéréo, intervalles, rapport)."""
    cache = {}
    piste = np.zeros(N)
    humide = np.zeros((N, 2))
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
        emph = bool(p.get('emphase'))
        if emph:
            y = compresser(y, sr) * 10 ** (GAIN_EMPHASE_DB / 20.0)
            poser(humide, voix_stade(y, sr, 300 + len(rapport)), p['t_film'], sr, gain=1.0)
        i = int(round(p['t_film'] * sr))
        piste[i:i + y.shape[0]] += y[:max(0, N - i)]
        fin = p['t_film'] + y.shape[0] / sr
        intervalles.append((p['t_film'], fin))
        rapport.append({'id': p['id'], 'texte': p.get('texte') or p.get('nom', ''), 'morceaux': p['morceaux'],
                        'seg': p.get('seg'), 't_interne': p.get('t_interne'),
                        'blanc_s': blanc, 'duree_brute_s': round(d_brute, 3), 'duree_max_s': dmax,
                        'atempo': round(facteur, 4), 'duree_finale_s': round(y.shape[0] / sr, 3),
                        'depasse_encore_duree_max': bool(dmax is not None and y.shape[0] / sr > float(dmax) + 1e-3),
                        'emphase': emph, 'attaque': round(p['t_film'], 3), 'fin': round(fin, 3)})
    ordre = sorted(range(len(intervalles)), key=lambda j: intervalles[j][0])
    for a, b in zip(ordre, ordre[1:]):
        assert intervalles[b][0] >= intervalles[a][1], 'pièces de voix qui se chevauchent : %s (fin %.3f) / %s (début %.3f)' % (
            rapport[a]['id'], intervalles[a][1], rapport[b]['id'], intervalles[b][0])
    assert max(b for _, b in intervalles) <= duree - 0.3, 'la dernière pièce de voix doit finir avant %.2f s' % (duree - 0.3)
    humide[int((duree - 0.06) * sr):] = 0.0
    return piste, humide, intervalles, rapport



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
FEUX_F1_INTERNES = [5.6, 6.4, 7.2, 8.0, 8.8]   # familles_f1.js → FEUX : la colonne k s'allume à 5,6 + 0,8·k (temps interne)
MOUV_SOUS_MUSIQUE_DB = -14.0                   # bruitages de mouvement des écuries : au plus −14 dB sous la musique
FAM_SOUS_MUSIQUE_DB = -4.0                     # ambiances des familles : sous la ring music
SEUIL_RING_DBFS = -60.0                        # contrôle de présence de la ring music (fenêtres de 50 ms)
TROU_MAX_S = 0.3


def courbe_db(N, sr, cles):
    """Automation linéaire par morceaux [(t, dB), …] → gain linéaire par échantillon."""
    ts, vs = zip(*cles)
    return 10 ** (np.interp(np.arange(N) / sr, ts, vs) / 20.0)


def rms_fenetres_db(x, sr, t0, t1, fen=0.4, pas=0.05):
    """RMS en dB sur des fenêtres glissantes [t, t + fen] de t0 à t1 (pas `pas`). Retourne (instants, dB)."""
    ts = np.arange(t0, max(t0, t1 - fen) + 1e-9, pas)
    return ts, np.array([rms_db_fenetre(x, t, t + fen, sr) for t in ts])


def main():
    ap = argparse.ArgumentParser(description='Bande-son V9.1 « Grand Prix de Noël — Ring » (113,6 s, 48 kHz).')
    ap.add_argument('--sortie', default=os.path.join(ICI, 'audio', 'mix_v9.wav'))
    ap.add_argument('--timeline', default=os.path.join(ICI, 'data', 'timeline_v9.json'))
    ap.add_argument('--plan', default=os.path.join(ICI, 'data', 'plan_v9.json'))
    ap.add_argument('--voix', default=os.path.join(ICI, 'data', 'voix_v9.json'))
    ap.add_argument('--banque-bbc', default=os.path.join(DOSSIER_V5, 'sons_reels'),
                    help='dossier des WAV BBC (../audio_v5/telecharger_sons_bbc.py) ; absent → synthèse')
    ap.add_argument('--sans-bbc', action='store_true', help='n\'utilise que la synthèse pour les bruitages')
    ap.add_argument('--sans-voix', action='store_true')
    ap.add_argument('--piste-ring', default=None, help='écrit aussi la piste ring music seule (après ducking et master), WAV')
    args = ap.parse_args()
    t_calc = time.time()
    sr = SR

    with open(args.plan, encoding='utf-8') as f:
        plan = json.load(f)
    with open(args.voix, encoding='utf-8') as f:
        pieces = json.load(f)['pieces']
    DUREE = float(plan['duree'])
    N = int(round(DUREE * sr))
    seg = {s['id']: s for s in plan['segments']}
    nb_tests = tester_carte_du_temps(seg)
    O, TEL, LB, GL, DEP = plan['ouverture'], plan['telephone'], plan['lootbox'], plan['gloire'], plan['depart']
    ouv = lambda ti: vers_film(seg['ouverture'], ti)
    are = lambda ti: vers_film(seg['arene'], ti)
    fami = lambda ti: vers_film(seg['familles'], ti)
    for p in pieces:
        p['t_film'] = round(vers_film(seg[p['seg']], float(p['t_interne'])), 4)
    ecuries = [dict(e, **{k: are(e[k]) for k in ('debut', 'sortie', 'saut', 'atterrissage', 'place', 'fin')}) for e in plan['ecuries']]
    assert len(ecuries) == 15, '15 écuries attendues'
    fam_morceaux = seg['familles']['remap']
    g0f, g1f = fam_morceaux[0][0], fam_morceaux[0][1]
    f0f, f1f = fam_morceaux[1][0], fam_morceaux[1][1]
    k0f, k1f = fam_morceaux[2][0], fam_morceaux[2][1]

    # instants clés en temps FILM
    T = {
        'feu': ouv(O['feu_tv']), 'etincelle': ouv(O['etincelle']), 'guirlandes': [ouv(O['guirlandes'][0]), ouv(O['guirlandes'][1])],
        'logo': ouv(O['logo_tv']), 'tapis': ouv(O['tapis_ouverture']), 'plongee': ouv(O['plongee']), 'arene': ouv(O['arrivee_arene']),
        'tel': are(TEL['debut']), 'tel_fin': are(TEL['fin']), 'pari': are(TEL['pari']), 'points': are(TEL['points']),
        'tel_lootbox': are(TEL['lootbox']), 'bonus': are(TEL['bonus']), 'piege': are(TEL['piege']),
        'familles': [g0f, k1f], 'coupes': [f0f, k0f],
        'lootbox': are(LB['debut']), 'descente': are(LB['descente']), 'impact_conteneur': are(LB['descente'] + 1.1),
        'verrous': are(LB['verrous']), 'rideau': [are(LB['entrouvre']), are(LB['ouvert'])], 'trophee_sort': are(LB['trophee_sort']),
        'gloire': are(GL['debut']), 'trophee_haut': are(GL['trophee_haut']), 'mot_gloire': are(GL['titre_gloire']),
        'mot_eternelle': are(GL['titre_eternelle']), 'feux': are(GL['feux']), 'gloire_fin': are(GL['fin']),
        'cordes': are(DEP['cordes']), 'moteurs': are(DEP['demarrage']), 'passage': are(DEP['piste']), 'logo_final': are(DEP['logo']),
        'fin': are(DEP['fin'])}
    assert abs(T['fin'] - DUREE) < 1e-6, 'le départ doit finir à la fin du film (%.3f ≠ %.3f)' % (T['fin'], DUREE)
    bbc = BanqueBBC(args.banque_bbc if not args.sans_bbc else os.path.join(ICI, '__aucune_banque__'), sr)

    kit = v8.construire_kit(sr)
    bus_amb = np.zeros((N, 2))       # ambiances (feu, foule)
    bus_ring = np.zeros((N, 2))      # ring music du client (seule)
    bus_mus = np.zeros((N, 2))       # autres couches musicales (chœur, accord final), dans la tonalité de la ring
    bus_fx = np.zeros((N, 2))        # bruitages et habillage
    bus_mouv = np.zeros((N, 2))      # bruitages de mouvement des écuries (≤ −14 dB sous la musique)
    bus_emph = np.zeros((N, 2))      # impacts de « GLOIRE » / « ÉTERNELLE » (ducking à moitié)
    evenements = []
    G = {'amb': 1.0, 'ring': 0.62 * 0.9, 'mus': 0.9, 'fx': 0.85, 'mouv': 1.0, 'fam': 0.9, 'emph': 0.9, 'humide': 0.55}

    def ev(t, quoi, bloc, fin=None, source='synthèse', **extra):
        e = {'t': round(float(t), 3), 'bloc': bloc, 'quoi': quoi, 'source': source}
        if fin is not None:
            e['fin'] = round(float(fin), 3)
        e.update(extra)
        evenements.append(e)

    def poser_bbc_ou(bus, ident, t_pic_src, avant, apres, t_evt, gain, usage, pan=0.0, couleur=None):
        """Pose l'extrait BBC (pic aligné sur t_evt) ; renvoie la source utilisée ou None (alors la synthèse suffit)."""
        r = bbc.pic(ident, t_pic_src, avant, apres, usage)
        if r is None:
            return None
        x, off = r
        if couleur is not None:
            x = norme(filtre_bande(x, sr, couleur[0], couleur[1]))
        poser(bus, x, t_evt - off, sr, pan=pan, gain=gain)
        return 'BBC %s' % ident

    # ================================ VOIX (temps film par la carte du temps) ================================
    if not args.sans_voix:
        vo, voix_humide, iv_voix, rapport_voix = voix_off_v9(sr, N, pieces, DUREE)
    else:
        vo, voix_humide, iv_voix, rapport_voix = np.zeros(N), np.zeros((N, 2)), [], []

    # ================================ 0. RING MUSIC (6,8 → 113,6 s, continue) ================================
    ch_ring = os.path.join(ICI, 'audio', 'sources', 'ring_music.mp3')
    infos_ring, ton = None, (0, 'majeur', None)
    if os.path.isfile(ch_ring):
        ring, infos_ring, analyse = musique_ring_continue(sr, ch_ring, T['logo'], T['logo_final'], DUREE)
        ton = tonalite(analyse, sr)
        infos_ring['tonalite'] = {'tonique': ['do', 'do#', 'ré', 'mi♭', 'mi', 'fa', 'fa#', 'sol', 'la♭', 'la', 'si♭', 'si'][ton[0]],
                                  'mode': ton[1], 'correlation': ton[2]}
        poser(bus_ring, ring, T['logo'], sr)
        ev(T['logo'], 'RING MUSIC du client, continue jusqu\'à la fin (%d mesures logo → logo, %.2f BPM, étirement ×%.5f)' % (
            infos_ring['mesures_logo_a_logo'], infos_ring['bpm_film'], infos_ring['etirement']),
           'ring', fin=DUREE, source='audio/sources/ring_music.mp3 (extrait client, lu)')
    else:
        print('  [avertissement] ring_music.mp3 absent -> groove de synthèse')
        groove = {'k': 'x.......x.x.....', 'c': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}
        v8.batterie_motif(bus_ring, kit, T['logo'], T['logo_final'] + 0.3, 90.0, groove, {'k': 0.6, 'c': 0.35, 'h': 0.12}, sr)
        ev(T['logo'], 'groove de synthèse (repli, ring_music.mp3 absent)', 'ring', fin=T['logo_final'])
    tq = ton[0]
    tr_ = lambda midis: [m + (tq if tq <= 6 else tq - 12) for m in midis]   # transposition do → tonique (±6 demi-tons)
    accord_aigu = accord_midi(tq if tq <= 6 else tq - 12, ton[1], base=72, voix=(12, 16, 19, 24))
    accord_cuivres = accord_midi(tq if tq <= 6 else tq - 12, ton[1], base=36, voix=(0, 7, 12, 16, 19, 24, 28, 31))
    arpege = accord_midi(tq if tq <= 6 else tq - 12, ton[1], base=72, voix=(0, 4, 7, 12, 16, 19, 24))
    # automation de la ring : +2 dB et filtre qui se referme pendant la montée de la gloire, ouverture + 3 dB après ÉTERNELLE
    fin_eternelle = [r['fin'] for r in rapport_voix if r['id'] == 'gloire_4']
    t_ouvre = max(T['mot_eternelle'], fin_eternelle[0]) if fin_eternelle else T['mot_eternelle'] + 0.5
    T['ouverture_musique'] = t_ouvre
    cles_gain = [(0.0, 0.0), (T['trophee_sort'], 0.0), (T['mot_gloire'] - 0.1, 2.0), (t_ouvre - 0.02, 2.0), (t_ouvre + 0.25, 5.0), (DUREE, 5.0)]
    cles_filtre = [(0.0, 0.0), (T['gloire'], 0.0), (T['mot_gloire'] - 0.1, 0.8), (t_ouvre - 0.02, 0.8), (t_ouvre + 0.25, 0.0), (DUREE, 0.0)]
    i_a, i_b = int((T['gloire'] - 1.0) * sr), int((t_ouvre + 1.0) * sr)
    lp = np.stack([filtre_bande(bus_ring[i_a:i_b, c], sr, None, 2200.0, ordre=2) for c in range(2)], axis=1)
    w = np.interp(np.arange(i_a, i_b) / sr, *zip(*cles_filtre))[:, None]
    bus_ring[i_a:i_b] = (1.0 - w) * bus_ring[i_a:i_b] + w * lp
    bus_ring *= courbe_db(N, sr, cles_gain)[:, None]
    ev(T['trophee_sort'], 'ring : montée +2 dB, filtre passe-bas 2,2 kHz qui se referme (tension)', 'gloire', fin=t_ouvre)
    ev(t_ouvre, 'ring : le filtre s\'ouvre + 3 dB (fin du mot « ÉTERNELLE »)', 'gloire', fin=t_ouvre + 0.25)
    niveau_ring = bus_ring * G['ring']

    # ================================ 1. OUVERTURE PROPRE (0 → 12,6 s) ================================
    rng = np.random.default_rng(90100)
    t_logo, t_et = T['logo'], T['etincelle']
    g0, g1 = T['guirlandes']
    d_feu = t_logo + 0.7
    feu = feu_net(sr, rng, d_feu)
    # un seul événement fort à la fois : le feu s'efface sous l'étincelle et les guirlandes, s'éteint après le choc du logo
    tf = np.arange(feu.shape[0]) / sr
    env_feu = np.interp(tf, [0, t_et - 0.05, t_et + 0.02, g0, g1, t_logo, t_logo + 0.6, d_feu],
                        [0, 0, -6, -4, -4, -6, -40, -60])
    feu *= (10 ** (env_feu / 20.0))[:, None]
    poser(bus_amb, feu, T['feu'], sr, gain=1.6)
    ev(T['feu'], 'feu de cheminée NET (craquements secs espacés + souffle doux, passe-haut 80 Hz)', 'ouverture', fin=t_logo + 0.6)
    poser(bus_fx, etincelle(sr, rng), t_et, sr, gain=0.42)
    ev(t_et, 'étincelle : « tsk » + scintillement', 'ouverture', fin=t_et + 0.6)
    gamme = tr_([79, 84, 88, 91, 96, 100, 103])
    for i, m in enumerate(gamme):
        tg = g0 + (g1 - g0) * i / (len(gamme) - 1)
        poser(bus_fx, stereo(tic_cristal(sr, rng, m), -0.6 + 1.2 * i / (len(gamme) - 1)), tg, sr, gain=0.11 + 0.01 * i)
    ev(g0, 'guirlandes : %d tics cristallins montants, espacés de %.2f s' % (len(gamme), (g1 - g0) / (len(gamme) - 1)), 'ouverture', fin=g1)
    poser(bus_fx, choc_logo_clair(sr, rng, accord_aigu), t_logo, sr, gain=0.8)
    ev(t_logo, 'CHOC DORÉ du logo (sub + grosse caisse + cymbale + cloches, médium laissé libre pour la voix) = départ de la ring',
       'ouverture')
    w, pic = whoosh_buf(sr, 1.2, 90110, sens=1)
    poser(bus_fx, w, T['tapis'] + 0.3 - pic, sr, gain=0.32)
    ev(T['tapis'], 'ouverture du tapis : un whoosh feutré', 'ouverture', fin=T['tapis'] + 0.8)
    d_r = T['arene'] - T['plongee'] - 0.03
    poser(bus_fx, riser(sr, d_r, rng, f0=400.0, f1=9000.0), T['plongee'], sr, gain=0.32)
    w, pic = whoosh_buf(sr, 0.8, 90112, sens=-1)
    poser(bus_fx, w, T['arene'] - 0.05 - pic, sr, gain=0.3)
    ev(T['plongee'], 'plongée : riser + whoosh', 'ouverture', fin=T['arene'])
    t_are = T['arene']
    poser(bus_fx, sub_drop(sr, 2.0, 100.0, 28.0, 0.5), t_are, sr, gain=0.9)
    poser(bus_fx, stereo(kit['kb']), t_are, sr, gain=0.8)
    poser(bus_fx, stereo(v8.cymbale(sr, rng, 2.4, 0.9)), t_are, sr, gain=0.25)
    poser(bus_fx, pyro_crepitement(sr, rng, 1.8), t_are + 0.03, sr, gain=0.22)
    poser(bus_amb, v8.foule(sr, rng, 4.0), t_are, sr, gain=0.30)
    src_are = [s for s in (poser_bbc_ou(bus_fx, '07037327', 0.80, 0.05, 2.5, t_are, 0.28, 'boom d\'arrivée'),
                           poser_bbc_ou(bus_amb, '07075033', 92.9, 0.4, 4.0, t_are + 0.3, 0.3, 'foule à l\'arrivée')) if s]
    ev(t_are, 'ARRIVÉE DANS L\'ARÈNE : boom grave + foule + pyro légère', 'ouverture', source=' + '.join(['synthèse'] + src_are))

    # ================================ 2. ÉCURIES (15,1 → 72,1 s) : mouvement seul ================================
    rum_a, rum_b = t_are + 1.5, T['tel']
    rum = rumeur_foule(sr, rng, rum_b - rum_a + 0.5)
    poser(bus_amb, rum, rum_a, sr, gain=0.05)
    ev(rum_a, 'rumeur de foule légère', 'ecuries', fin=rum_b + 0.5)
    par_id = {p['id']: p for p in pieces}
    lignes_ec = []
    rec = np.random.default_rng(90200)
    for k, e in enumerate(ecuries):
        eid = e['id']
        pan0 = -0.7 if k % 2 == 0 else 0.7
        t_a, t_b = e['sortie'] - 0.2, e['place'] + 1.0
        tmp = np.zeros((N, 2))
        poser(tmp, jet_flammes(sr, rec, 0.7), e['sortie'], sr, pan=0.0, gain=0.5)
        w, pic = whoosh_buf(sr, 0.9, 90300 + k, sens=-1 if k % 2 else 1)
        poser(tmp, w, e['saut'] + 0.25 - pic, sr, gain=0.5)
        poser(tmp, stereo(impact_amorti(sr, rec), pan0 * 0.2), e['atterrissage'], sr, gain=0.6)
        d_der = e['place'] - e['atterrissage'] + 0.15
        poser(tmp, pan_glisse(crissement(sr, rec, d_der, f0=float(rec.uniform(1000, 1350))), pan0 * 0.3, -pan0 * 0.3),
              e['atterrissage'] + 0.02, sr, gain=0.2)
        ident, pk = (('07022357', 2.20), ('07045249', 1.55))[k % 2]
        s_cr = poser_bbc_ou(tmp, ident, pk, 0.15, d_der, e['atterrissage'] + 0.15, 0.22, 'crissement écurie %d' % eid, pan=-pan0 * 0.2)
        # niveau : au plus −14 dB sous la ring music (RMS sur fenêtres glissantes de 400 ms)
        ts, mv = rms_fenetres_db(tmp * G['mouv'], sr, t_a, t_b)
        _, mu = rms_fenetres_db(niveau_ring, sr, t_a, t_b)
        ecart = float(np.max(mv - mu))
        g_corr = min(1.0, 10 ** ((MOUV_SOUS_MUSIQUE_DB - 0.5 - ecart) / 20.0))
        bus_mouv += tmp * g_corr
        ecart_final = round(ecart + db(g_corr), 1)
        ev(e['sortie'], 'écurie %d : flamme du tunnel' % eid, 'ecuries', fin=e['sortie'] + 0.6)
        ev(e['saut'], 'écurie %d : whoosh du saut' % eid, 'ecuries')
        ev(e['atterrissage'], 'écurie %d : impact d\'atterrissage + crissement du dérapage' % eid, 'ecuries', fin=e['place'] + 0.15,
           source='synthèse' + (' + ' + s_cr if s_cr else ''))
        lignes_ec.append({'k': e['k'], 'id': eid, 'nom': (par_id.get('ecurie_%02d' % eid) or {}).get('nom', ''),
                          'sortie': round(e['sortie'], 3), 'saut': round(e['saut'], 3), 'atterrissage': round(e['atterrissage'], 3),
                          'place': round(e['place'], 3), 'son_ecurie': 'aucun (retiré, V9.1)',
                          'mouvement_sous_musique_db_max': ecart_final})

    # ================================ 3. TÉLÉPHONE (72,1 → 81,6 s) ================================
    rt = np.random.default_rng(90500)
    w, pic = whoosh_buf(sr, 0.7, 90501, sens=1)
    poser(bus_fx, w, T['tel'] + 0.2 - pic, sr, gain=0.3)
    poser(bus_fx, stereo(v8.select_arcade(sr, rt)), T['tel'] + 0.15, sr, gain=0.15)
    ev(T['tel'] + 0.15, 'arrivée sur l\'écran du téléphone (whoosh + « select »)', 'telephone')
    poser(bus_fx, stereo(tap_ecran(sr, rt), 0.1), T['pari'] - 0.02, sr, gain=0.5)
    poser(bus_fx, v8.bouton_cash(sr, rt), T['pari'] + 0.03, sr, gain=0.5)
    s = poser_bbc_ou(bus_fx, '07042056', 1.55, 0.05, 0.9, T['pari'] + 0.18, 0.18, 'ka-ching pari')
    ev(T['pari'], 'pari : tap + « ka-ching »', 'telephone', source='synthèse' + (' + ' + s if s else ''))
    poser(bus_fx, compteur_pieces(sr, rt), T['points'], sr, gain=0.6)
    ev(T['points'], 'points : compteur de pièces + ding', 'telephone', fin=T['points'] + 1.1)
    poser(bus_fx, roulette(sr, rt), T['tel_lootbox'], sr, gain=0.6)
    ev(T['tel_lootbox'], 'lootbox : roulette qui ralentit + carillon', 'telephone', fin=T['tel_lootbox'] + 1.2)
    poser(bus_fx, jingle_cle(sr, rt, arpege, accord_aigu), T['bonus'], sr, gain=0.45)
    ev(T['bonus'], 'bonus : jingle doré (dans la tonalité de la ring)', 'telephone', fin=T['bonus'] + 1.2)
    poser(bus_fx, swoosh_rouge(sr, rt), T['piege'] - 0.45, sr, gain=0.5)
    ev(T['piege'], 'piège : swoosh rouge menaçant', 'telephone', fin=T['piege'] + 1.0)

    # ================================ 4. FAMILLES (81,6 → 90,6 s), 3 × 3 s, coupes franches ================================
    rfm = np.random.default_rng(90600)
    bus_got, bus_f1, bus_tk = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
    dg = g1f - g0f
    poser(bus_got, pluie(sr, rfm, dg + 0.1, 380.0, sombre=True), g0f, sr, gain=0.35)
    s = None
    npl = bbc.nappe('07038337', 30.0, dg + 0.1, 'pluie Gotham')
    if npl is not None:
        poser(bus_got, np.stack([npl, np.roll(npl, 211)], axis=1), g0f, sr, gain=0.45)
        s = 'BBC 07038337'
    ev(g0f, 'Gotham : pluie', 'familles', fin=g1f, source='synthèse' + (' + ' + s if s else ''))
    poser(bus_got, pan_glisse(moteur_grave_batmobile(sr, rfm, dg + 0.1), -0.4, 0.4), g0f, sr, gain=0.5)
    ev(g0f, 'Gotham : moteur grave de Batmobile', 'familles', fin=g1f)
    poser(bus_got, stereo(tonnerre_lointain(sr, rfm, 2.6), -0.3), g0f + 0.5, sr, gain=0.35)
    ev(g0f + 0.5, 'Gotham : tonnerre lointain', 'familles', fin=g0f + 3.0)
    # F1 : 5 bips ; les feux visibles dans la fenêtre gardent leur instant converti, les autres sont répartis sur la fenêtre
    dedans = [fi for fi in FEUX_F1_INTERNES if vers_film_ou_none(seg['familles'], fi) is not None
              and f0f - 1e-9 <= vers_film(seg['familles'], fi) < f1f]
    if len(dedans) == len(FEUX_F1_INTERNES):
        bips = [fami(fi) for fi in FEUX_F1_INTERNES]
        regle_bips = 'instants convertis depuis le segment familles'
    else:
        avant = [fi for fi in FEUX_F1_INTERNES if fi < min(dedans or [1e9])]
        apres = [fi for fi in FEUX_F1_INTERNES if fi > max(dedans or [-1e9])]
        conv = [fami(fi) for fi in dedans]
        deb = f0f + 0.06
        fin_b = f1f - 0.30
        t_av = list(np.linspace(deb, (conv[0] if conv else fin_b) - 0.35, len(avant))) if len(avant) > 1 else [deb] * len(avant)
        dern = conv[-1] if conv else deb
        t_ap = list(np.linspace(dern, fin_b, len(apres) + 1)[1:]) if apres else []
        bips = sorted(float(b) for b in t_av + conv + t_ap)
        regle_bips = ('feux visibles %s → %s (convertis) ; feux hors fenêtre %s répartis sur la fenêtre [%.2f ; %.2f]'
                      % (dedans, [round(c, 3) for c in conv], avant + apres, f0f, f1f))
    d_gr = bips[-1] + 0.3 - f0f
    for j, (fr, pan) in enumerate(((182.0, -0.6), (194.0, 0.1), (207.0, 0.6))):
        ngr = int(d_gr * sr)
        tgr = temps(ngr, sr)
        coup = 1.0 + 0.18 * np.exp(-((tgr - (0.7 + 0.6 * j)) / 0.12) ** 2)
        ph = phase_continue(fr * coup * (1.0 + 0.003 * np.sin(2 * np.pi * 6.0 * tgr + j)), sr)
        xg = sum(np.sin(h * ph + 0.4 * h) / h ** 0.9 for h in range(1, 14) if fr * h * 1.4 < 0.45 * sr)
        poser(bus_f1, np.tanh(1.4 * norme(xg)) * fenetre(ngr, 0.05, 0.2, sr), f0f, sr, pan=pan, gain=0.07)
    ev(f0f, 'F1 : monoplaces au ralenti sur la grille', 'familles', fin=bips[-1] + 0.3)
    for i, tb in enumerate(bips):
        poser(bus_f1, stereo(bip_feux(sr, 880.0)), tb, sr, gain=0.5)
        ev(tb, 'F1 : bip du feu rouge %d/5' % (i + 1), 'familles')
    t_v6 = bips[-1] + 0.08
    if f1f - t_v6 > 0.08:
        v6 = v6_hybride_ralenti(sr, rfm, f1f - t_v6 + 0.3)
        poser(bus_f1, v6, t_v6, sr, gain=0.6)
        ev(t_v6, 'F1 : extinction des feux, rugissement V6 (coupé net par Tokyo)', 'familles', fin=f1f)
    dk = k1f - k0f
    poser(bus_tk, pluie(sr, rfm, dk + 0.1, 300.0), k0f, sr, gain=0.2)
    poser(bus_tk, stereo(bourdonnement_neon(sr, rfm, dk + 0.1), 0.5), k0f, sr, gain=0.10)
    ev(k0f, 'Tokyo : pluie urbaine + bourdonnement des néons', 'familles', fin=k1f)
    for tp, fb in ((k0f + 0.8, 160.0), (k0f + 2.2, 190.0)):
        poser(bus_tk, passage_turbo(sr, rfm, 1.6, fb), tp - 0.55 * 1.6, sr, gain=0.5)
        ev(tp, 'Tokyo : turbo qui passe (Doppler + soupape)', 'familles', fin=tp + 0.7)
    # niveau des trois ambiances : sous la ring music (RMS de la fenêtre)
    niveaux_fam = {}
    for nom, bb, a, b in (('gotham', bus_got, g0f, g1f), ('f1', bus_f1, f0f, f1f), ('tokyo', bus_tk, k0f, k1f)):
        ecart = rms_db_fenetre(bb * G['fam'], a, b) - rms_db_fenetre(niveau_ring, a, b)
        g_c = 10 ** ((FAM_SOUS_MUSIQUE_DB - ecart) / 20.0)
        bb *= g_c
        niveaux_fam[nom] = round(rms_db_fenetre(bb * G['fam'], a, b) - rms_db_fenetre(niveau_ring, a, b), 1)
    bus_fam = (bus_got * masque_intervalle(N, g0f, g1f)[:, None] + bus_f1 * masque_intervalle(N, f0f, f1f)[:, None]
               + bus_tk * masque_intervalle(N, k0f, k1f)[:, None])
    for tz in (g0f, f0f, k0f, k1f):
        poser(bus_fx, stereo(zap(sr, rfm)), tz - 0.02, sr, gain=0.28)
        ev(tz, 'coupe franche + « zap »', 'familles')

    # ================================ 5. LOOTBOX (90,6 → 97,6 s) ================================
    rl = np.random.default_rng(90700)
    t_desc, t_imp = T['descente'], T['impact_conteneur']
    poser(bus_amb, rumeur_foule(sr, rl, T['gloire'] - T['lootbox'] + 0.5), T['lootbox'], sr, gain=0.05)
    poser(bus_fx, stereo(v8.obus_siffle(sr, t_imp - t_desc), 0.1), t_desc, sr, gain=0.25)
    poser(bus_fx, riser(sr, t_imp - t_desc, rl, f0=300.0, f1=6000.0), t_desc, sr, gain=0.2)
    ev(t_desc, 'conteneur qui descend (sifflement)', 'lootbox', fin=t_imp)
    poser(bus_fx, impact_metal_lourd(sr, rl), t_imp, sr, gain=0.75)
    s = poser_bbc_ou(bus_fx, '07022366', 1.15, 0.05, 2.0, t_imp, 0.4, 'impact métallique lourd lootbox')
    ev(t_imp, 'IMPACT LOURD du conteneur au sol', 'lootbox', source='synthèse' + (' + ' + s if s else ''))
    for i, d in enumerate((0.0, 0.22, 0.41, 0.66)):
        poser(bus_fx, stereo(clac_metal(sr, rl, float(rl.uniform(700, 1100))), -0.6 + 0.4 * i), T['verrous'] + d, sr, gain=0.8)
        ev(T['verrous'] + d, 'verrou %d/4 qui saute' % (i + 1), 'lootbox')
    r0, r1 = T['rideau']
    poser(bus_fx, cliquetis(sr, rl, r1 - r0), r0, sr, gain=0.35)
    ev(r0, 'rideau qui s\'enroule (cliquetis)', 'lootbox', fin=r1)
    t_ts, t_th = T['trophee_sort'], T['trophee_haut']
    d_ch = t_th - t_ts + 0.6
    poser(bus_mus, choeur_dore(sr, rl, d_ch, accord_midi(tq if tq <= 6 else tq - 12, ton[1], base=60, voix=(0, 7, 12, 16))),
          t_ts, sr, gain=0.30)
    sh = shimmer(sr, rl, d_ch, 3000.0, 10000.0, 22) * (np.linspace(0.0, 1.0, int(d_ch * sr)) ** 1.5)[:, None]
    poser(bus_mus, sh, t_ts, sr, gain=0.22)
    ev(t_ts, 'le trophée sort : chœur + scintillement doré qui montent', 'lootbox', fin=t_ts + d_ch)

    # ================================ 6. GLOIRE (97,6 → 105,6 s) ================================
    rg = np.random.default_rng(90800)
    for i, m in enumerate(accord_aigu):
        poser(bus_fx, stereo(cloche(midi_hz(m + 12), 1.5, sr, 0.7), -0.5 + 0.33 * i), t_th + 0.04 * i, sr, gain=0.14)
    ev(t_th, 'trophée en haut : éclat de cloches', 'gloire')
    for t_mot, nom, taille in ((T['mot_gloire'], 'GLOIRE', 0.8), (T['mot_eternelle'], 'ÉTERNELLE', 1.0)):
        poser(bus_emph, sub_drop(sr, 1.6, 105.0, 30.0, 0.4), t_mot, sr, gain=0.9 * taille)
        poser(bus_emph, stereo(kit['kb']), t_mot, sr, gain=0.8 * taille)
        poser(bus_emph, stereo(v8.cymbale(sr, rg, 2.8, 1.0)), t_mot, sr, gain=0.30 * taille)
        poser(bus_emph, feu_artifice(sr, rg, taille), t_mot + 0.02, sr, gain=0.45)
        ev(t_mot, '« %s » : impact + éclat de cymbale + feu d\'artifice (médium creusé pour la voix)' % nom, 'gloire', fin=t_mot + 2.0)
    i_e0, i_e1 = int((T['mot_gloire'] - 0.5) * sr), min(N, int((T['mot_eternelle'] + 3.5) * sr))
    medium = np.stack([filtre_bande(bus_emph[i_e0:i_e1, c], sr, 300.0, 3500.0) for c in range(2)], axis=1)
    bus_emph[i_e0:i_e1] -= (1.0 - 10 ** (-14.0 / 20.0)) * medium
    t_et_ = T['mot_eternelle']
    poser(bus_emph, feu_artifice(sr, rg, 0.7), t_et_ + 0.45, sr, pan=0.0, gain=0.35)
    poser(bus_fx, confettis(sr, rg), T['feux'], sr, gain=0.4)
    poser(bus_amb, v8.foule(sr, rg, 5.0), t_et_, sr, gain=0.55)
    src_f = [s for s in (poser_bbc_ou(bus_amb, '07035075', 20.0, 0.3, 4.0, t_et_ + 0.3, 0.45, 'foule qui exulte (gloire)'),) if s]
    ev(t_et_, 'CLAMEUR DE FOULE qui explose + confettis + 2ᵉ feu d\'artifice', 'gloire', fin=t_et_ + 4.5,
       source=' + '.join(['synthèse'] + src_f))

    # ================================ 7. DÉPART (105,6 → 113,6 s) ================================
    rd = np.random.default_rng(90900)
    poser(bus_fx, stereo(twang_cordes(sr, rd), -0.3), T['cordes'], sr, gain=0.35)
    ev(T['cordes'], 'cordes du ring qui claquent', 'depart')
    t_dem, t_pis = T['moteurs'], T['passage']
    for i in range(15):
        td = t_dem + 0.07 * i + float(rd.uniform(0.0, 0.03))
        pan = -0.85 + 1.7 * ((i * 7) % 15) / 14.0
        poser(bus_fx, stereo(demarreur(sr, rd, 0.32), pan), td, sr, gain=0.18)
        mot = charger_moteur_ecurie(i + 1, 1, sr)
        lmax = int((t_pis - td + 0.4) * sr)
        x = mot[0][:lmax] if mot is not None else moteur_qui_monte(sr, rd, lmax / sr, 70.0 + 5 * i, 200.0 + 8 * i)
        poser(bus_fx, stereo(norme(x) * fenetre(x.shape[0], 0.04, 0.5, sr), pan), td + 0.28, sr, gain=0.11)
    ev(t_dem, 'les moteurs démarrent (démarreurs + moteurs CC0 / CC BY)', 'depart', fin=t_pis + 0.4)
    for j, (d, fb, sens) in enumerate(((-0.25, 170.0, 1), (0.0, 140.0, -1), (0.2, 200.0, 1), (0.45, 155.0, -1))):
        pt = passage_turbo(sr, rd, 1.6, fb)
        poser(bus_fx, pt[:, ::-1] if sens < 0 else pt, t_pis + d - 0.55 * 1.6, sr, gain=0.32)
    w, pic = whoosh_buf(sr, 1.2, 90901, sens=1)
    poser(bus_fx, w, t_pis - pic, sr, gain=0.45)
    ev(t_pis, 'passage en trombe (4 bolides Doppler + whoosh)', 'depart', fin=t_pis + 1.0)
    t_lf = T['logo_final']
    d_cr = t_lf - (t_pis + 0.3)
    poser(bus_fx, riser(sr, d_cr, rd, f0=300.0, f1=11000.0), t_pis + 0.3, sr, gain=0.3)
    nfo = int((t_lf - t_dem + 0.3) * sr)
    poser(bus_amb, rumeur_foule(sr, rd, nfo / sr) * np.linspace(0.3, 1.0, nfo)[:, None], t_dem, sr, gain=0.10)
    ev(t_pis + 0.3, 'montée vers le logo (riser + foule)', 'depart', fin=t_lf)
    d_res = DUREE - 0.06 - t_lf
    poser(bus_fx, sub_drop(sr, 2.2, 110.0, 26.0, 0.6), t_lf, sr, gain=1.0)
    poser(bus_fx, stereo(kit['kb']), t_lf, sr, gain=0.9)
    poser(bus_fx, stereo(v8.cymbale(sr, rd, d_res, 1.2)), t_lf, sr, gain=0.32)
    poser(bus_fx, jingle_cle(sr, rd, arpege, accord_aigu), t_lf + 0.05, sr, gain=0.45)
    acc = v8.cuivres(accord_cuivres, d_res, sr, 1.6, attaque=0.01)
    ta = temps(acc.shape[0], sr)
    acc *= (np.exp(-ta / 1.2) * np.cos(0.5 * np.pi * np.clip((ta - (d_res - 0.6)) / 0.6, 0, 1)))[:, None]
    poser(bus_mus, acc, t_lf, sr, gain=0.4)
    ev(t_lf, 'LOGO FINAL : impact final + accord dans la tonalité + dernier temps fort de la ring et sa résonance', 'depart',
       fin=DUREE - 0.06)

    # ================================ MIX : voix, ducking, mastering ================================
    bus_voix = np.stack([vo, vo], axis=1) * GAIN_VOIX
    reste_duck = (bus_amb * G['amb'] + niveau_ring + bus_mus * G['mus'] + bus_fx * G['fx'] + bus_mouv * G['mouv']
                  + bus_fam * G['fam'])
    reste_duck[int((DUREE - 0.06) * sr):] = 0.0
    emph = bus_emph * G['emph']
    reductions = [DUCK_BASE_DB] * len(iv_voix)
    for it in range(12):
        duck = courbe_ducking(iv_voix, reductions, N, sr) if iv_voix else np.ones(N)
        reste = reste_duck * duck[:, None] + emph * np.sqrt(duck)[:, None]      # impacts de la gloire : ducking à moitié (dB)
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
        i0, i1 = int(r['attaque'] * sr), int(r['fin'] * sr)
        vb = filtre_bande(bus_voix[i0:i1, 0], sr, 300.0, 3400.0)
        rb = filtre_bande(reste[i0:i1].mean(axis=1), sr, 300.0, 3400.0)
        r['marge_bande_voix_db'] = round(db(rms(vb)) - db(rms(rb)), 1)
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

    # contrôle de présence de la ring music (piste seule après ducking et gain master, fenêtres de 50 ms)
    g_lin = 10 ** (gain_db / 20.0)
    ring_master = niveau_ring * duck[:, None] * g_lin
    if args.piste_ring:
        ecrire_wav16(args.piste_ring, np.clip(ring_master, -1, 1), sr)
    t_r0, t_r1 = T['logo'], DUREE - 0.06
    tsr, vr = rms_fenetres_db(ring_master, sr, t_r0, t_r1, fen=0.05, pas=0.05)
    trou, trou_max, t_trou = 0.0, 0.0, None
    for t_, v_ in zip(tsr, vr):
        if v_ < SEUIL_RING_DBFS:
            trou += 0.05
            if trou > trou_max:
                trou_max, t_trou = trou, round(float(t_) - trou + 0.05, 2)
        else:
            trou = 0.0
    controle_ring = {'fenetre_s': [t_r0, round(t_r1, 3)], 'fenetres_50ms': int(len(vr)), 'seuil_dbfs': SEUIL_RING_DBFS,
                     'rms_min_dbfs': round(float(vr.min()), 1), 't_rms_min': round(float(tsr[int(np.argmin(vr))]), 2),
                     'rms_median_dbfs': round(float(np.median(vr)), 1), 'plus_long_trou_s': round(trou_max, 2), 'debut_trou': t_trou,
                     'avant_logo_rms_dbfs': round(rms_db_fenetre(ring_master, 0.0, t_r0 - 0.01), 1)}
    assert trou_max <= TROU_MAX_S, 'ring music : trou de %.2f s à %s' % (trou_max, t_trou)

    reste_master = reste * g_lin
    for e in evenements:
        t = e['t']
        e['rms_mix_db'] = round(rms_db_fenetre(relu, t - 0.25, t + 0.25), 1)
        e['rms_bruitages_db'] = round(rms_db_fenetre(reste_master, t - 0.05, t + 0.45), 1)
    muets = [e for e in evenements if e['rms_bruitages_db'] < -60.0]
    assert not muets, 'événements muets : %s' % [(e['t'], e['quoi']) for e in muets]
    for r in rapport_voix:
        r['rms_voix_db'] = round(rms_db_fenetre(relu, r['attaque'], r['fin']), 1)

    timeline = {
        'version': 'v9.1',
        'duree': DUREE,
        'echantillons': int(final.shape[0]),
        'frequence_hz': sr,
        'canaux': 2,
        'plan': os.path.relpath(args.plan, ICI).replace(os.sep, '/'),
        'voix': os.path.relpath(args.voix, ICI).replace(os.sep, '/'),
        'carte_du_temps': {'regle': 'vers_film(segment, t_interne) = filmA + (t − interneA)·(filmB − filmA)/(interneB − interneA), '
                                    'premier morceau du remap qui contient t (noyau_v9.js → versFilm)',
                           'auto_tests_reussis': nb_tests,
                           'instants_film': {k: ([round(x, 3) for x in v] if isinstance(v, list) else round(v, 3)) for k, v in T.items()},
                           'bips_f1': {'regle': regle_bips, 'film_s': [round(b, 3) for b in bips]}},
        'evenements': sorted(evenements, key=lambda x: (x['t'], x['quoi'])),
        'ecuries': lignes_ec,
        'familles_sous_musique_db': niveaux_fam,
        'musique_ring': infos_ring,
        'controle_ring': controle_ring,
        'automation_ring': {'gain_db': cles_gain, 'passe_bas_2200Hz_melange': cles_filtre},
        'voix_off': rapport_voix,
        'intervalles_voix': [[round(a, 3), round(b, 3)] for a, b in iv_voix],
        'banque_bbc': {'dossier': os.path.relpath(bbc.dossier, ICI).replace(os.sep, '/'),
                       'licence': 'BBC Sound Effects — RemArc (usage personnel)', 'utilises': bbc.utilises},
        'mix': {'fichier': os.path.relpath(args.sortie, ICI).replace(os.sep, '/'), 'gain_master_db': round(gain_db, 2),
                'lufs_integre': round(lufs, 2), 'vrai_crete_dbtp': round(tp, 2),
                'methode': 'BS.1770-4 (filtres K exacts à 48 kHz, blocs 400 ms / 75 %, portes −70 LUFS et −10 LU) ; vrai crête par '
                           'suréchantillonnage ×4 ; limiteur à anticipation 5 ms sur la crête vraie, plafond −1,3 dBTP',
                'ducking': 'base %.0f dB, enveloppe lissée %d ms, approfondi jusqu\'à %.0f dB si la marge voix < +%.0f dB ; impacts '
                           'de la gloire ducking à moitié ; humide « stade » non ducké' % (
                               DUCK_BASE_DB, LISSAGE_DUCK * 1000, DUCK_MAX_DB, MARGE_VOIX_DB)},
        'bilan': {'extraits_ecurie': 0, 'pieces_voix': len(rapport_voix), 'chevauchement_voix': False,
                  'marge_voix_min_db': min([r['marge_db'] for r in rapport_voix], default=None),
                  'marge_bande_voix_min_db': min([r['marge_bande_voix_db'] for r in rapport_voix], default=None),
                  'mouvement_sous_musique_db_max': max(l['mouvement_sous_musique_db_max'] for l in lignes_ec),
                  'ring_plus_long_trou_s': controle_ring['plus_long_trou_s'], 'evenements': len(evenements)},
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.timeline)), exist_ok=True)
    with open(args.timeline, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)

    print('Mix V9.1 : %s' % args.sortie)
    print('  durée %.4f s (%d échantillons, attendu %d) | %d Hz | stéréo' % (final.shape[0] / sr, final.shape[0], N, sr))
    print('  sonie %.2f LUFS (BS.1770-4) | vrai crête %.2f dBTP | gain master %+.2f dB' % (lufs, tp, gain_db))
    print('  carte du temps : %d auto-tests OK | bips F1 %s' % (nb_tests, [round(b, 2) for b in bips]))
    if infos_ring:
        print('  ring : %.2f BPM mesuré → %.2f BPM film (×%.5f), %d mesures logo→logo, raccords %s, tonalité %s %s' % (
            infos_ring['bpm_mesure'], infos_ring['bpm_film'], infos_ring['etirement'], infos_ring['mesures_logo_a_logo'],
            infos_ring['raccords_film_s'], infos_ring['tonalite']['tonique'], infos_ring['tonalite']['mode']))
    print('  présence ring 6,8 → %.2f s : RMS min %.1f dBFS à %.2f s, médiane %.1f, plus long trou %.2f s' % (
        t_r1, controle_ring['rms_min_dbfs'], controle_ring['t_rms_min'], controle_ring['rms_median_dbfs'], trou_max))
    print('  mouvement écuries / musique : max %.1f dB | familles / musique : %s' % (
        timeline['bilan']['mouvement_sous_musique_db_max'], niveaux_fam))
    for r in rapport_voix:
        print('   voix %-14s %7.3f -> %7.3f s  %s  atempo %.4f  marge %+5.1f dB (bande voix %+5.1f)  ducking %5.1f dB' % (
            r['id'], r['attaque'], r['fin'], 'EMPHASE' if r['emphase'] else '       ', r['atempo'], r['marge_db'],
            r['marge_bande_voix_db'], r['ducking_db']))
    print('  timeline : %s (%d événements) | calcul %.1f s' % (args.timeline, len(evenements), time.time() - t_calc))
    return 0


if __name__ == '__main__':
    sys.exit(main())
