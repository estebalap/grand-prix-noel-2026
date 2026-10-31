#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bande-son V8 « Grand Prix de Noël — Finale » : médley punchy de 92,0 s calé sur data/plan_v8.json.

Structure (tous les instants viennent du plan : segments, sous-parties, écuries, pièges, reperes_son) :
  0 → 8,6 s   salon : boîte à musique (« Vive le vent », J. Pierpont 1857, domaine public, synthétisée), feu de cheminée
              procédural, nappe chaude, grelots ; voix off « Mesdames et messieurs… » puis « Ce soir, le salon se transforme
              en ARÈNE ! » (« arène » posé sur la plongée) ;
  8,6 s       ouverture du tapis : la boîte à musique se « dévide » (arrêt de bande), sub-drop + grondement ;
  11,0 s      plongée dans l'arène (whoosh), montée de tension, impact d'arrivée sur le ring (13,6 s) + foule ;
  14 → 44 s   les 15 écuries (2,0 s chacune) : les 15 VRAIS extraits, temps fort posé à l'échantillon près sur `impact`,
              fondus enchaînés à puissance égale (sin/cos) centrés sur chaque changement de créneau, bass-swap, washout,
              son de validation arcade « Select ! » original à chaque `debut` ;
  44 → 92 s   la folie : groove des paris + pièces d'or, meute de moteurs (enregistrements CC0 du dépôt), caisses, boss,
              6 pièges (explosions / boings cartoon sur chaque `contact`), règle des 41 mm (buzzer + éjection), crescendo
              vers le photo-finish (coupure nette + flash sonore), carte finale (accord + reprise boîte à musique qui
              s'éteint avant 92,0 s).

Réutilise par IMPORT la bande-son V7 (../v7_multivers_4k/sound_v7_crescendo.py, non modifiée ; son main() n'est exécuté que
si on la lance directement) : décodage ffmpeg, mise au niveau des extraits, réverbe, sidechain, loudness, stinger de secours.

Sorties : audio/mix_v8.wav (44,1 kHz stéréo 16 bit, 92,0 s exactement, −16 LUFS, crête ≤ −1 dBFS) et data/timeline_v8.json.
Les extraits sous droits (../audio_v5/themes_ecuries/*.mp3, ../audio_v5/voix/*.mp3) sont LUS, jamais copiés ; le .wav produit
est ignoré par git (Intro_3D/**/*.wav).
Dépendances : numpy + bibliothèque standard + ffmpeg. Déterminisme : toutes les graines sont fixes.
"""
import argparse
import glob
import json
import math
import os
import sys
import time

import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE_DEPOT = os.path.abspath(os.path.join(ICI, '..', '..'))
DOSSIER_V7 = os.path.abspath(os.path.join(ICI, '..', 'v7_multivers_4k'))
DOSSIER_V5 = os.path.abspath(os.path.join(ICI, '..', 'audio_v5'))
DOSSIER_MOTEURS = os.path.join(RACINE_DEPOT, 'sounds', 'moteurs_reels')

# import de la V7 sans rien écrire dans son dossier (pas de __pycache__) : son main() reste sous `if __name__ == '__main__'`
sys.dont_write_bytecode = True
if DOSSIER_V7 not in sys.path:
    sys.path.insert(0, DOSSIER_V7)
import sound_v7_crescendo as v7  # noqa: E402

DUREE = 92.0
CIBLE_LUFS = -16.0
PLAFOND_DBFS = -1.0            # crête visée ≤ −1 dBFS (limiteur tanh réglé 0,2 dB sous ce plafond)
GAIN_VOIX = 1.5                # bus voix off
MARGE_VOIX_DB = 8.0            # écart voix / reste visé pendant chaque phrase (exigé : ≥ +7 dB)
FONDU_MIN = 0.005              # tout raccord a un fondu d'au moins 5 ms
XF = 0.24                      # fondu enchaîné à puissance égale entre écuries (s), centré sur le début du créneau
AMORCE_MAX = 1.0               # s de matière prise AVANT le point de coupe du calage (si le fichier en a) : nourrit le fondu
CHUTE = {5}                    # Super Mario Pression : le temps fort est l'ATTERRISSAGE (fin du cri de chute)

poser = v7.poser
filtre_bande = v7.filtre_bande
midi_hz = v7.midi_hz
phase_continue = v7.phase_continue


# ----------------------------------------------------------------------------------------------
# Outils de base
# ----------------------------------------------------------------------------------------------
def fenetre(n, a, b, sr):
    """Enveloppe sin/cos de la V7, avec un fondu minimal de 5 ms aux deux bouts (aucun clic de raccord)."""
    return v7.fenetre(n, max(a, FONDU_MIN), max(b, FONDU_MIN), sr)


def temps(n, sr):
    return np.arange(n) / sr


def norme(x, pic=1.0):
    m = float(np.max(np.abs(x))) if x.size else 0.0
    return x * (pic / m) if m > 0 else x


def montee(t, tau):
    """Attaque continue (part de 0) : 1 − exp(−t/τ)."""
    return 1.0 - np.exp(-t / tau)


def stereo(x, pan=0.0):
    ang = (pan + 1.0) * 0.25 * np.pi
    return np.stack([x * math.cos(ang), x * math.sin(ang)], axis=1)


def pan_glisse(x, p0, p1):
    pan = np.linspace(p0, p1, x.shape[0])
    return np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], axis=1)


def reverbe(sig, sr, rt60=1.2, graine=0, humide=0.25):
    """Réverbération stéréo (IR semée de la V7). sig mono ou (n,2) ; retourne (n + queue, 2) : sec + humide."""
    il, ir = v7.ir_stereo(sr, rt60=rt60, graine=graine)
    m = sig if sig.ndim == 1 else sig.mean(axis=1)
    wl, wr = v7.convolution(m, il), v7.convolution(m, ir)
    n = wl.shape[0]
    sec = np.zeros((n, 2))
    sec[:sig.shape[0]] = sig[:, None] if sig.ndim == 1 else sig
    if sig.ndim == 1:
        sec[:sig.shape[0]] *= math.sqrt(0.5)
    return sec + humide * np.stack([wl, wr], axis=1)


def sub_drop(sr, duree, f_haut, f_bas, tau_env, graine=0):
    n = int(duree * sr)
    t = temps(n, sr)
    f = f_bas + (f_haut - f_bas) * np.exp(-t / (0.25 * duree))
    return np.sin(phase_continue(f, sr)) * montee(t, 0.004) * np.exp(-t / tau_env) * fenetre(n, 0.0, 0.08, sr)


def riser(sr, duree, rng, f0=300.0, f1=11000.0, tonale=None):
    """Riser : bruit dont la coupure monte (exponentielle), stéréo qui s'élargit, tonale montante facultative (midi)."""
    n = int(duree * sr)
    x = temps(n, sr) / duree
    fh = lambda t: f0 * (f1 / f0) ** min(max(t / duree, 0.0), 1.0)
    fb = lambda t: 80.0 + 1500.0 * min(max(t / duree, 0.0), 1.0) ** 2
    a = v7.filtre_variable(rng.standard_normal(n), sr, fh, fb)
    b = v7.filtre_variable(rng.standard_normal(n), sr, fh, fb)
    w = x ** 1.2
    L, R = (a + w * b) / np.sqrt(1 + w ** 2), (a - w * b) / np.sqrt(1 + w ** 2)
    pr = np.max(np.abs(np.concatenate([L, R]))) + 1e-9
    amp = x ** 2.2 * fenetre(n, 0.02, 0.012, sr)
    out = np.stack([L / pr * amp, R / pr * amp], axis=1)
    if tonale is not None:
        ton = np.sin(phase_continue(midi_hz(tonale) * 2.0 ** (2.0 * x), sr)) * x ** 3 * 0.18 * fenetre(n, 0.02, 0.012, sr)
        out += ton[:, None]
    return out


# ----------------------------------------------------------------------------------------------
# Instruments de synthèse (boîte à musique, batterie, basse, cuivres, cloches)
# ----------------------------------------------------------------------------------------------
def lame(f, duree, sr, rng, eclat=1.0):
    """Lame de boîte à musique (poutre encastrée-libre : modes 1 ; 6,27 ; 17,55) + 2e harmonique léger + clic de pointe."""
    n = int(duree * sr)
    t = temps(n, sr)
    tau = float(np.clip(1.5 * (880.0 / f) ** 0.35, 0.5, 2.4))
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    x += 0.30 * np.sin(2 * np.pi * 2.0 * f * 1.0007 * t) * np.exp(-t / (0.35 * tau))
    for r, a, d in ((6.27, 0.22 * eclat, 0.07), (17.55, 0.08 * eclat, 0.018)):
        if r * f < 0.45 * sr:
            x += a * np.sin(2 * np.pi * r * f * t + 0.3) * np.exp(-t / d)
    clic = filtre_bande(rng.standard_normal(n), sr, 2500.0, 9000.0) * np.exp(-t / 0.0015) * 0.05
    return (x + clic) * montee(t, 0.0007) * fenetre(n, 0.0, 0.05, sr)


def grelots(sr, rng, duree=0.16):
    """Secousse de grelots : partiels métalliques aigus inharmoniques sous une enveloppe de secousse."""
    n = int(duree * sr)
    t = temps(n, sr)
    x = np.zeros(n)
    for _ in range(6):
        f = float(rng.uniform(3000, 7600))
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / float(rng.uniform(0.03, 0.09)))
    gr = np.abs(filtre_bande(rng.standard_normal(n), sr, 15.0, 70.0))
    x *= 0.4 + gr / (gr.max() + 1e-9)
    x += 0.3 * filtre_bande(rng.standard_normal(n), sr, 5000.0, 12000.0) * np.exp(-t / 0.03)
    return norme(x * montee(t, 0.002) * fenetre(n, 0.0, 0.04, sr))


def grosse_caisse(sr, rng, f_bas=50.0, f_haut=150.0, tau=0.16, duree=0.45, clic=0.25):
    n = int(duree * sr)
    t = temps(n, sr)
    f = f_bas + (f_haut - f_bas) * np.exp(-t / 0.028)
    x = np.sin(phase_continue(f, sr)) * montee(t, 0.0012) * np.exp(-t / tau)
    x += clic * filtre_bande(rng.standard_normal(n), sr, 1500.0, 6000.0) * np.exp(-t / 0.004) * montee(t, 0.0003)
    return norme(x * fenetre(n, 0.0, 0.06, sr))


def caisse_claire(sr, rng, duree=0.32, tau=0.11):
    n = int(duree * sr)
    t = temps(n, sr)
    ton = (np.sin(2 * np.pi * 185 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t / 0.05)
    nz = norme(filtre_bande(rng.standard_normal(n), sr, 1200.0, 9000.0)) * np.exp(-t / tau)
    return norme((0.55 * ton + nz) * montee(t, 0.0008) * fenetre(n, 0.0, 0.05, sr))


def clap(sr, rng, duree=0.3):
    n = int(duree * sr)
    t = temps(n, sr)
    nz = norme(filtre_bande(rng.standard_normal(n), sr, 900.0, 5000.0))
    env = np.zeros(n)
    for d in (0.0, 0.011, 0.022):
        m = t >= d
        env[m] += np.exp(-(t[m] - d) / 0.004) * montee(t[m] - d, 0.0004)
    m = t >= 0.03
    env[m] += 0.8 * np.exp(-(t[m] - 0.03) / 0.09) * montee(t[m] - 0.03, 0.002)
    return norme(nz * env * fenetre(n, 0.0, 0.04, sr))


def charleston(sr, rng, ouvert=False):
    duree = 0.35 if ouvert else 0.08
    n = int(duree * sr)
    t = temps(n, sr)
    x = filtre_bande(rng.standard_normal(n), sr, 7000.0, min(16000.0, 0.45 * sr))
    return norme(x * np.exp(-t / (0.15 if ouvert else 0.022)) * montee(t, 0.0004) * fenetre(n, 0.0, 0.02, sr))


def cymbale(sr, rng, duree=2.6, tau=0.9):
    n = int(duree * sr)
    t = temps(n, sr)
    x = norme(filtre_bande(rng.standard_normal(n), sr, 3000.0, min(15000.0, 0.45 * sr)))
    for _ in range(8):
        x += 0.08 * np.sin(2 * np.pi * float(rng.uniform(3200, 9000)) * t + rng.uniform(0, 6.28))
    return norme(x * np.exp(-t / tau) * montee(t, 0.0015) * fenetre(n, 0.0, 0.5, sr))


def tom(sr, f, duree=0.5):
    n = int(duree * sr)
    t = temps(n, sr)
    fr = f * (1.0 + 0.6 * np.exp(-t / 0.03))
    return norme(np.sin(phase_continue(fr, sr)) * np.exp(-t / 0.18) * montee(t, 0.001) * fenetre(n, 0.0, 0.06, sr))


def basse(f, duree, sr, fc=650.0, dist=1.6):
    """Basse de synthèse : scie additive dont la coupure se referme (enveloppe de filtre), légère saturation tanh."""
    n = max(int(duree * sr), 16)
    t = temps(n, sr)
    fct = fc * (1.0 + 3.0 * np.exp(-t / 0.06))
    x = np.zeros(n)
    h = 1
    while f * h < min(4000.0, 0.45 * sr):
        x += np.sin(2 * np.pi * f * h * t) / h / np.sqrt(1.0 + (f * h / fct) ** 4)
        h += 1
    x = np.tanh(dist * x / (np.max(np.abs(x)) + 1e-9)) / math.tanh(dist)
    return x * montee(t, 0.003) * np.exp(-t / max(0.08, 0.9 * duree)) * fenetre(n, 0.0, min(0.03, duree * 0.3), sr)


def cuivres(midis, duree, sr, eclat=1.0, attaque=0.008):
    """Accord de cuivres synthétiques (scies désaccordées, brillance qui retombe)."""
    n = int(duree * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    for j, m in enumerate(midis):
        f = midi_hz(m)
        for k, (det, pan) in enumerate(((0.9965, -0.5), (1.0, 0.0), (1.0035, 0.5))):
            x = np.zeros(n)
            h = 1
            while f * h < min(7000.0, 0.45 * sr) and h <= 14:
                x += np.sin(2 * np.pi * f * det * h * t + 0.9 * h * k) / h * np.exp(-t * h * 1.6 / (eclat * max(duree, 0.1)))
                h += 1
            out += stereo(x, pan)
    env = montee(t, attaque) * np.exp(-t / max(0.1, 0.7 * duree)) * fenetre(n, 0.0, min(0.08, 0.3 * duree), sr)
    return norme(out * env[:, None])


def cloche(f, duree, sr, eclat=0.6):
    return v7.note(f, duree, 2, sr, eclat)


# ----------------------------------------------------------------------------------------------
# Effets cartoon / bruitages procéduraux
# ----------------------------------------------------------------------------------------------
def feu_de_cheminee(sr, duree, rng):
    """Feu de bois : souffle grave qui vacille + crépitements (Poisson, amplitudes de Pareto) + quelques « pops » de sève."""
    n = int(duree * sr)
    t = temps(n, sr)
    vac = filtre_bande(rng.standard_normal(n), sr, 0.2, 3.0, ordre=1)
    vac = 0.75 + 0.25 * vac / (np.max(np.abs(vac)) + 1e-9)
    base = np.stack([norme(filtre_bande(rng.standard_normal(n), sr, 70.0, 650.0, ordre=1)),
                     norme(filtre_bande(rng.standard_normal(n), sr, 70.0, 650.0, ordre=1))], axis=1) * (0.30 * vac)[:, None]
    out = base
    # crépitements : banque de trois bruits filtrés, découpés en grains très courts
    banques = [norme(filtre_bande(rng.standard_normal(n), sr, a, b)) for a, b in ((1200, 3500), (2500, 6500), (4000, 11000))]
    tc = 0.05
    while True:
        tc += float(rng.exponential(1.0 / 16.0))
        if tc > duree - 0.05:
            break
        i0 = int(tc * sr)
        d = float(rng.uniform(0.0006, 0.004))
        ng = int(min(8 * d, 0.03) * sr)
        tg = temps(ng, sr)
        a = min(float(rng.pareto(2.2)) * 0.25 + 0.08, 1.0)
        g = banques[int(rng.integers(3))][i0:i0 + ng] * np.exp(-tg / d) * montee(tg, 0.0002)
        out[i0:i0 + ng] += stereo(g * a * 0.9, float(rng.uniform(-0.7, 0.7)))[:out.shape[0] - i0]
    # pops de sève (plus gros, plus graves)
    tp = 0.4
    while True:
        tp += float(rng.exponential(1.0 / 0.8))
        if tp > duree - 0.1:
            break
        i0 = int(tp * sr)
        ng = int(0.06 * sr)
        tg = temps(ng, sr)
        f = float(rng.uniform(500, 1400))
        g = (np.sin(2 * np.pi * f * tg) * 0.5 + filtre_bande(rng.standard_normal(ng), sr, 300.0, 3000.0)) * np.exp(-tg / 0.008)
        out[i0:i0 + ng] += stereo(norme(g * montee(tg, 0.0003)) * 0.7, float(rng.uniform(-0.6, 0.6)))[:out.shape[0] - i0]
    return out * fenetre(n, 0.4, 0.05, sr)[:, None]


def select_arcade(sr, rng):
    """« Select ! » original : arpège carré montant (do-sol-do) très court + carillon FM + tic, ~0,35 s."""
    n = int(0.42 * sr)
    out = np.zeros(n)
    for i, m in enumerate((84, 91, 96)):
        nn = int(0.06 * sr)
        tt = temps(nn, sr)
        x = sum(np.sin(2 * np.pi * midi_hz(m) * h * tt) / h for h in (1, 3, 5, 7) if midi_hz(m) * h < 0.45 * sr)
        x = x * np.exp(-tt / 0.05) * fenetre(nn, 0.002, 0.015, sr)
        i0 = int(i * 0.035 * sr)
        out[i0:i0 + nn] += 0.55 * x
    cl = cloche(midi_hz(103), 0.32, sr, 0.8)
    i0 = int(0.07 * sr)
    out[i0:i0 + cl.shape[0]] += 0.6 * cl[:n - i0]
    t = temps(n, sr)
    out += 0.25 * filtre_bande(rng.standard_normal(n), sr, 4000.0, 12000.0) * np.exp(-t / 0.003) * montee(t, 0.0003)
    return norme(out * fenetre(n, 0.0, 0.08, sr))


def piece_or(sr, rng):
    """Une pièce d'or qui tinte : modes inharmoniques d'un disque mince + clic d'impact."""
    duree = float(rng.uniform(0.25, 0.6))
    n = int(duree * sr)
    t = temps(n, sr)
    f0 = float(rng.uniform(1900, 3300))
    x = np.zeros(n)
    for j, r in enumerate((1.0, 1.59, 2.14, 2.65, 3.16, 3.50)):
        if r * f0 < 0.45 * sr:
            x += np.sin(2 * np.pi * r * f0 * t + rng.uniform(0, 6.28)) * np.exp(-t / (duree * 0.35 / (1 + 0.4 * j))) / (1 + 0.3 * j)
    x += 0.6 * filtre_bande(rng.standard_normal(n), sr, 3000.0, 12000.0) * np.exp(-t / 0.0015)
    return norme(x * montee(t, 0.0003) * fenetre(n, 0.0, 0.03, sr))


def bouton_cash(sr, rng):
    """Clic de gros bouton (enfoncé / relâché) + bip de confirmation + « ka-ching » de caisse enregistreuse."""
    n = int(1.0 * sr)
    out = np.zeros((n, 2))
    for d, f, a in ((0.0, 2400.0, 1.0), (0.075, 3100.0, 0.6)):
        nc = int(0.03 * sr)
        tc = temps(nc, sr)
        c = (filtre_bande(rng.standard_normal(nc), sr, 1500.0, 8000.0) * np.exp(-tc / 0.0018) + 0.5 * np.sin(2 * np.pi * f * tc)
             * np.exp(-tc / 0.006) + 0.6 * np.sin(2 * np.pi * 160 * tc) * np.exp(-tc / 0.008))
        poser(out, norme(c * montee(tc, 0.0002) * fenetre(nc, 0.0, 0.006, sr)) * a, d, sr, pan=0.1)
    for d, m in ((0.06, 88), (0.12, 95)):
        poser(out, cloche(midi_hz(m), 0.45, sr, 0.5) * 0.45, d, sr)
    for k in range(6):
        poser(out, piece_or(sr, rng) * 0.35, 0.14 + 0.025 * k, sr, pan=float(rng.uniform(-0.5, 0.5)))
    return out


def explosion(sr, rng, taille=1.0):
    """Explosion cartoon : souffle dont la brillance retombe + sub-boom + débris crépitants."""
    duree = 1.4 + 0.8 * taille
    n = int(duree * sr)
    t = temps(n, sr)
    fh = lambda tt: 300.0 + 6000.0 * math.exp(-tt / (0.12 * taille))
    souffle = v7.filtre_variable(rng.standard_normal(n), sr, fh)
    souffle = norme(souffle) * montee(t, 0.0015) * np.exp(-t / (0.32 * taille))
    sub = sub_drop(sr, duree, 95.0, 30.0, 0.35 * taille)
    deb = np.zeros(n)
    for _ in range(int(14 * taille)):
        tg0 = float(rng.uniform(0.05, 0.9 * duree * 0.7))
        i0 = int(tg0 * sr)
        ng = int(0.02 * sr)
        tg = temps(ng, sr)
        g = filtre_bande(rng.standard_normal(ng), sr, 1500.0, 7000.0) * np.exp(-tg / 0.003) * montee(tg, 0.0002)
        deb[i0:i0 + ng] += g[:n - i0] * float(rng.uniform(0.2, 0.7)) * math.exp(-tg0 / 0.5)
    x = souffle * 0.9 + sub * 1.0 + deb * 0.35
    x = x * fenetre(n, 0.0, 0.3, sr)
    return np.stack([x, np.roll(x, int(0.0009 * sr))], axis=1)


def boing(sr, f0=170.0, duree=0.75, ressort=11.0):
    """Boing de dessin animé : ressort (glissando + vibrato qui s'amortit) + « thwack » d'attaque."""
    n = int(duree * sr)
    t = temps(n, sr)
    f = f0 * (1.0 + 0.7 * np.exp(-t / 0.04)) * (1.0 + 0.16 * np.exp(-t / 0.3) * np.sin(2 * np.pi * ressort * t))
    ph = phase_continue(f, sr)
    x = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * np.exp(-t / (0.32 * duree))
    rng = np.random.default_rng(int(f0 * 10))
    x += 0.5 * filtre_bande(rng.standard_normal(n), sr, 200.0, 2500.0) * np.exp(-t / 0.01)
    return norme(x * montee(t, 0.001) * fenetre(n, 0.0, 0.1, sr))


def sifflet_coulisse(sr, duree, f0, f1):
    """Sifflet à coulisse (glissando) avec vibrato."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    f = f0 * (f1 / f0) ** (u ** 0.8) * (1 + 0.012 * np.sin(2 * np.pi * 6.5 * t))
    x = np.sin(phase_continue(f, sr)) + 0.08 * np.sin(2 * phase_continue(f, sr))
    return norme(x * np.sin(np.pi * np.clip(u, 0, 1)) ** 0.5 * fenetre(n, 0.02, 0.05, sr))


def obus_siffle(sr, duree):
    """Obus qui arrive : sifflement descendant."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    f = 2600.0 * (650.0 / 2600.0) ** u
    x = np.sin(phase_continue(f, sr)) * (0.3 + 0.7 * u)
    return norme(x * fenetre(n, 0.08, 0.01, sr))


def buzzer(sr, duree=0.45):
    """Buzzer « mauvaise réponse » de jeu télévisé : deux carrés graves désaccordés."""
    n = int(duree * sr)
    t = temps(n, sr)
    x = np.zeros(n)
    for f in (110.0, 116.5, 220.7):
        x += sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 30, 2) if f * h < 0.45 * sr)
    return norme(np.tanh(1.5 * norme(x)) * fenetre(n, 0.006, 0.04, sr))


def claquements_bois(sr, rng, nb, etalement):
    """Quilles / bois qui s'entrechoquent : nb claquements résonants étalés."""
    n = int((etalement + 0.3) * sr)
    out = np.zeros((n, 2))
    for k in range(nb):
        d = float(rng.uniform(0, etalement)) * (k / max(nb - 1, 1)) ** 0.7
        nc = int(0.12 * sr)
        tc = temps(nc, sr)
        f1, f2 = float(rng.uniform(900, 1300)), float(rng.uniform(2100, 2700))
        c = (np.sin(2 * np.pi * f1 * tc) * np.exp(-tc / 0.02) + 0.6 * np.sin(2 * np.pi * f2 * tc) * np.exp(-tc / 0.012)
             + 0.7 * filtre_bande(rng.standard_normal(nc), sr, 800.0, 4000.0) * np.exp(-tc / 0.004))
        poser(out, norme(c * montee(tc, 0.0003) * fenetre(nc, 0.0, 0.02, sr)) * float(rng.uniform(0.4, 1.0)), d, sr,
              pan=float(rng.uniform(-0.7, 0.7)))
    return out


def roulement_grave(sr, rng, duree, f_bas=60.0, f_haut=320.0):
    """Roulement (boule de bowling, pierre de curling) : bruit grave modulé qui enfle."""
    n = int(duree * sr)
    t = temps(n, sr)
    x = norme(filtre_bande(rng.standard_normal(n), sr, f_bas, f_haut))
    x *= 0.7 + 0.3 * np.sin(2 * np.pi * 9.0 * t) ** 2
    return x * (t / duree) ** 1.5 * fenetre(n, 0.05, 0.02, sr)


def grincement(sr, rng, duree):
    """Grincement de bois (caisse qu'on force) : frottement stick-slip à cadence variable dans une résonance."""
    n = int(duree * sr)
    t = temps(n, sr)
    cad = 35.0 + 45.0 * (t / duree) + 10 * np.sin(2 * np.pi * 3.0 * t)
    ph = phase_continue(cad, sr)
    imp = np.maximum(0.0, np.sin(ph)) ** 12
    x = filtre_bande(imp, sr, 450.0, 1900.0) + 0.2 * filtre_bande(rng.standard_normal(n), sr, 600.0, 2500.0) * imp
    return norme(x * fenetre(n, 0.03, 0.03, sr))


def foule(sr, rng, duree):
    """Clameur de foule : formants vocaux sur bruit, modulations lentes indépendantes, attaque rapide puis décrue."""
    n = int(duree * sr)
    t = temps(n, sr)
    out = np.zeros((n, 2))
    for k, (a, b) in enumerate(((350, 700), (600, 1200), (1000, 1800), (1900, 3200))):
        for c in range(2):
            x = norme(filtre_bande(rng.standard_normal(n), sr, a, b))
            mod = filtre_bande(rng.standard_normal(n), sr, 0.5, 4.0, ordre=1)
            out[:, c] += x * (0.7 + 0.3 * mod / (np.max(np.abs(mod)) + 1e-9)) / (1 + 0.3 * k)
    env = montee(t, 0.12) * np.exp(-t / (0.45 * duree))
    return norme(out * (env * fenetre(n, 0.0, 0.3, sr))[:, None])


def moteur_synthese(sr, duree, f0, f1, rng):
    """Moteur de synthèse (scie à phase continue, montée en régime) : renfort de meute et de climax."""
    n = int(duree * sr)
    t = temps(n, sr)
    u = t / duree
    fr = f0 * (f1 / f0) ** (u ** 0.9) * (1.0 + 0.004 * np.sin(2 * np.pi * 7.0 * t))
    ph = phase_continue(fr, sr)
    x = np.zeros(n)
    for h in range(1, 14):
        x += np.sin(h * ph) / h ** 0.9 * (fr * h < 0.45 * sr)
    x += 0.25 * filtre_bande(rng.standard_normal(n), sr, 1200.0, 6000.0)
    return norme(x) * fenetre(n, 0.3, 0.3, sr)


def flash_photo(sr, rng):
    """Flash sonore du photo-finish : clic d'obturateur + éclair de bruit blanc brillant + « ting » cristallin."""
    n = int(1.6 * sr)
    t = temps(n, sr)
    clic = filtre_bande(rng.standard_normal(n), sr, 2000.0, 12000.0) * np.exp(-t / 0.002) * montee(t, 0.0002)
    eclair = norme(filtre_bande(rng.standard_normal(n), sr, 1500.0, min(16000.0, 0.45 * sr))) * np.exp(-t / 0.12) * montee(t, 0.001)
    ting = cloche(midi_hz(103), 1.5, sr, 0.9)
    ting = np.pad(ting, (0, max(0, n - ting.shape[0])))[:n]
    sub = sub_drop(sr, 1.6, 80.0, 28.0, 0.45)
    x = clic * 0.9 + eclair * 0.8 + ting * 0.45 + sub * 0.9
    return x * fenetre(n, 0.0, 0.4, sr)


# ----------------------------------------------------------------------------------------------
# Signatures RÉELLES des 15 écuries : extraits + voix, temps fort à l'échantillon près sur `impact`
# ----------------------------------------------------------------------------------------------
def couche_v8(chemin, debut_s, duree_s, gain_db, sr, amorce_max):
    """Comme couche_audio de la V7, mais l'amorce (matière AVANT le point de coupe) peut aller jusqu'à amorce_max s :
    elle nourrit le fondu enchaîné centré sur le changement de créneau. Mise au niveau sur le corps seul (−16 dBFS RMS actif
    puis gain_db). Retourne (signal (n,2), amorce s, durée du corps s)."""
    amorce = min(amorce_max, max(debut_s, 0.0))
    seg = v7.decoder_ffmpeg(chemin, sr, debut_s - amorce, None if duree_s is None else duree_s + amorce)
    if seg.shape[0] <= int(amorce * sr) + int(0.1 * sr):
        raise RuntimeError('extrait vide : ' + os.path.basename(chemin))
    corps = seg[int(round(amorce * sr)):].mean(axis=1)
    e = v7.enveloppe_rms(corps, sr)
    actif = corps[e > 0.1 * (e.max() + 1e-12)]
    rms = math.sqrt(float(np.mean(actif ** 2))) if actif.size else 1.0
    g = 10 ** (v7.CIBLE_THEME_DB / 20.0) / max(rms, 1e-6) * 10 ** (float(gain_db) / 20.0)
    return seg * g, amorce, corps.shape[0] / sr


def signature_brute(e, cfg, sr, dossier_themes):
    """Couches superposées d'une écurie (logique de signature_ecurie V7) SANS fondus : retourne (signal (n,2), t0 absolu tel que
    le temps fort tombe exactement sur e['impact'], t0 au plus tôt du corps (pas d'amorce), éclat dans l'extrait, sources)."""
    n = e['id']
    cfg = cfg or {}
    couches, sources, eclat = [], [], None
    v = cfg.get('voix')
    if v:
        x, am, _ = couche_v8(os.path.join(DOSSIER_V5, v['fichier']), float(v.get('debut_s', 0.0)), v.get('duree_s'),
                             v.get('gain_db', 0), sr, AMORCE_MAX)
        couches.append((float(v.get('decalage_s', 0.0)), x, am))
        sources.append(v['fichier'])
        e0 = float(v.get('eclat_s', 0.0))
        vm = x[int(round(am * sr)):].mean(axis=1)
        env = v7.enveloppe_rms(vm, sr)
        i0, i1 = max(0, int((e0 - 0.15) * sr)), min(env.shape[0], int((e0 + 0.6) * sr))
        if i1 - i0 > int(0.05 * sr):
            w = env[i0:i1]
            e0 = (i0 + int(np.argmax(w >= 0.6 * w.max()))) / sr
        eclat = float(v.get('decalage_s', 0.0)) + e0
    perso = v7.trouver_theme(dossier_themes, n)
    if not perso:
        raise RuntimeError('extrait %02d_*.mp3 absent de %s' % (n, dossier_themes))
    pp = cfg.get('perso') or {}
    x, am, l_perso = couche_v8(perso, float(pp.get('debut_s', 0.0)), float(pp.get('duree_s', 3.0)), pp.get('gain_db', 0), sr,
                               AMORCE_MAX)
    couches.append((0.0, x, am))
    sources.append('themes_ecuries/' + os.path.basename(perso))
    if n in CHUTE:
        fic = os.path.join(DOSSIER_V5, 'voix', 'mario_chute_B.mp3')
        if os.path.isfile(fic):
            xm, amm, l_m = couche_v8(fic, 0.0, None, -6.0, sr, 0.0)
            couches.append((max(0.0, l_perso - l_m), xm, amm))
            sources.append('voix/mario_chute_B.mp3')
    pre = max(0.0, max(a - d for d, _, a in couches))
    L = max(int(round((pre + d - a) * sr)) + xx.shape[0] for d, xx, a in couches)
    sig = np.zeros((L, 2))
    for d, xx, a in couches:
        i = int(round((pre + d - a) * sr))
        sig[i:i + xx.shape[0]] += xx
    corps = sig[int(round(pre * sr)):].mean(axis=1)
    if eclat is None:
        if n in CHUTE:
            eclat = max(1.4, min(l_perso - 0.6, 2.2))
        elif pp.get('eclat_s') is not None:
            eclat = float(pp['eclat_s'])
        else:
            eclat = v7.premier_temps_fort(corps, sr)
    t0 = e['impact'] - eclat - pre
    return sig, t0, t0 + pre, eclat, sources


def washout(queue_mono, sr, graine):
    """Queue de réverbération stéréo de 250 ms (passe-haut 150 Hz) issue des 450 dernières ms d'une écurie (V7)."""
    il, ir = v7.ir_stereo(sr, graine=graine)
    nw = int(v7.WASHOUT * sr)
    env = np.cos(0.5 * np.pi * np.arange(nw) / nw)
    na = int(FONDU_MIN * sr)                              # la queue démarre en fondu de 5 ms (pas de marche d'escalier)
    env[:na] *= np.sin(0.5 * np.pi * np.arange(na) / na)
    q = queue_mono.shape[0]
    wl = filtre_bande(v7.convolution(queue_mono, il)[q:q + nw], sr, v7.HPF_SORTIE, None)
    wr = filtre_bande(v7.convolution(queue_mono, ir)[q:q + nw], sr, v7.HPF_SORTIE, None)
    wl, wr = np.pad(wl, (0, nw - wl.shape[0])), np.pad(wr, (0, nw - wr.shape[0]))
    return np.stack([wl * env * 0.55, wr * env * 0.55], axis=1)


def medley_ecuries(bus, ecuries, cfg_themes, sr, dossier_themes, sans_reel, equipes, t_fin_segment, t_plus_tot_premiere):
    """Pose les 15 signatures. Fondu enchaîné à puissance égale entre écuries consécutives : sur [x0, x0 + w], la suivante
    monte en sin(θ), la précédente descend en cos(θ) (sin² + cos² = 1), x0 = début de la matière de la suivante, au plus tôt
    debut − XF/2 ; w = XF (raccourci si l'éclat est tout proche). Bass-swap (passe-haut 150 Hz) sur les 200 dernières ms de
    la sortante, washout de 250 ms après. Écurie absente ou illisible → stinger de synthèse V7 (le rapport le dit)."""
    brutes = []
    for k, e in enumerate(ecuries):
        entree = None
        if not sans_reel:
            try:
                sig, t0, t_corps, eclat, sources = signature_brute(e, cfg_themes.get(str(e['id'])), sr, dossier_themes)
                plus_tot = (max(t_plus_tot_premiere, t_corps - 0.25) if k == 0 else e['debut'] - XF / 2)
                if t0 < plus_tot:
                    sig = sig[int(round((plus_tot - t0) * sr)):]
                    t0 = plus_tot
                plus_tard = (ecuries[k + 1]['impact'] - 0.02) if k + 1 < len(ecuries) else t_fin_segment + 0.3
                if t0 + sig.shape[0] / sr > plus_tard:
                    sig = sig[:int(round((plus_tard - t0) * sr))]
                entree = {'sig': sig, 't0': t0, 'eclat': eclat, 'sources': sources, 'source': 'reel'}
            except Exception as ex:
                print('  [avertissement] écurie %d : signature réelle impossible (%s) -> synthèse' % (e['id'], ex))
        if entree is None:
            st = v7.stinger_synthese(e, equipes[e['id']]['colors'], sr, e['fin'] - e['debut']) * 0.8
            entree = {'sig': st, 't0': e['debut'], 'eclat': e['impact'] - e['debut'], 'sources': ['synthese'], 'source': 'synthese'}
        brutes.append(entree)

    # fenêtres de fondu enchaîné (x0, w) par frontière k-1 | k
    fen = [None] * len(brutes)
    for k in range(1, len(brutes)):
        x0 = max(brutes[k]['t0'], ecuries[k]['debut'] - XF / 2)
        w = min(XF, max(0.01, 0.6 * (ecuries[k]['impact'] - x0)))
        fen[k] = (x0, w)
    lignes = []
    for k, (e, b) in enumerate(zip(ecuries, brutes)):
        sig = b['sig'].copy()
        t0 = b['t0']
        n = sig.shape[0]
        tt = t0 + np.arange(n) / sr
        g = np.ones(n)
        # entrée
        if k == 0 or fen[k] is None:
            fi = max(int(FONDU_MIN * sr), int(0.03 * sr))
            g[:fi] *= np.sin(0.5 * np.pi * np.arange(fi) / fi)
            f_entree = [round(t0, 4), round(t0 + fi / sr, 4)]
        else:
            x0, w = fen[k]
            m = (tt >= x0) & (tt < x0 + w)
            g[tt < x0] = 0.0
            g[m] *= np.sin(0.5 * np.pi * (tt[m] - x0) / w)
            f_entree = [round(x0, 4), round(x0 + w, 4)]
        # sortie : fondu enchaîné avec la suivante, ou fin du segment
        if k + 1 < len(brutes):
            x0, w = fen[k + 1]
        else:
            x0, w = t_fin_segment - XF / 2, XF
        x1 = x0 + w
        # bass-swap : passe-haut 150 Hz zéro-phase fondu sur les 200 ms qui précèdent la fin du fondu
        i_a = max(0, int((x1 - v7.BASS_SWAP - 0.06 - t0) * sr))
        i_b = min(n, int((x1 - t0) * sr))
        if i_b - i_a > int(0.1 * sr):
            nh = min(int(v7.BASS_SWAP * sr), i_b - i_a)
            wv = np.zeros(i_b - i_a)
            wv[-nh:] = 0.5 - 0.5 * np.cos(np.pi * np.arange(nh) / nh)
            for c in range(2):
                hp = filtre_bande(sig[i_a:i_b, c], sr, v7.HPF_SORTIE, None, ordre=2)
                sig[i_a:i_b, c] = sig[i_a:i_b, c] * (1 - wv) + hp * wv
        m = (tt >= x0) & (tt < x1)
        g[m] *= np.cos(0.5 * np.pi * (tt[m] - x0) / w)
        g[tt >= x1] = 0.0
        # fin de matière avant la fin du fondu : fondu cos propre de 30 ms sur ses derniers échantillons
        fo = int(0.03 * sr)
        if n > fo:
            g[-fo:] *= np.cos(0.5 * np.pi * np.arange(fo) / fo)
        sortie = sig * g[:, None]
        poser(bus, sortie, t0, sr)
        # washout après la fin effective
        fin_eff = min(x1, t0 + n / sr)
        iq = int((fin_eff - t0) * sr)
        queue = sig[max(0, iq - int(0.45 * sr)):iq].mean(axis=1) * g[max(0, iq - int(0.45 * sr)):iq].max(initial=0.0)
        if queue.shape[0] > int(0.05 * sr):
            poser(bus, washout(queue, sr, e['id']), fin_eff, sr)
        lignes.append({'k': e['k'], 'id': e['id'], 'nom': e['nom'], 'debut': e['debut'], 'impact': e['impact'], 'fin': e['fin'],
                       'source': b['source'],
                       'signature': {'sources': b['sources'], 'eclat_dans_extrait_s': round(float(b['eclat']), 4),
                                     't_debut': round(t0, 4), 't_eclat': round(e['impact'], 4),
                                     't_fin': round(fin_eff + v7.WASHOUT, 4), 'fondu_entree': f_entree,
                                     'fondu_sortie': [round(x0, 4), round(x1, 4)]}})
    return lignes


# ----------------------------------------------------------------------------------------------
# Voix off : prise A découpée aux mots, coupes cherchées dans les silences réels (enveloppe 10 ms)
# ----------------------------------------------------------------------------------------------
# (nom, premier mot, dernier mot, mot d'ancrage, instant (s) de l'attaque du mot d'ancrage dans le film, intention)
PHRASES_V8 = [
    ('mesdames', 0, 2, 0, 3.40, 'salon : accueil sur la boîte à musique'),
    ('salon', 3, 10, 10, 10.72, '« arène » attaque juste avant la plongée (11,0 s)'),
    ('paris', 166, 177, 166, 47.00, 'paris : après la pluie de pièces (46,5 s), fini avant le clic (51,0 s)'),
    ('caisses', 140, 142, 140, 59.10, '« Ouvrez les caisses » : la caisse s\'ouvre juste après (60,2 s)'),
    ('attention', 89, 95, 89, 61.30, 'les boss arrivent (62 s), fini avant leur passage (63,6 s)'),
    ('pieges', 162, 165, 162, 64.45, 'juste avant les pièges (66 s)'),
    ('gloire', 178, 184, 178, 78.15, 'climax'),
    ('final', 192, 199, 192, 81.55, 'climax, fini avant le photo-finish (86 s)'),
    ('titre', 185, 191, 185, 88.15, 'carte finale (88 s), fini avant 92 s'),
]
FIN_VOIX_MAX = 91.80


def profil_db(x, sr, pas=0.01):
    h = max(1, int(pas * sr))
    nb = x.shape[0] // h
    e = np.sqrt(np.mean(x[:nb * h].reshape(nb, h) ** 2, axis=1))
    return 20 * np.log10(e + 1e-9), h


def decoupe_phrase(x, sr, mots, i0, i1, prof, h, ref):
    """Coupes (c0, c1), attaque réelle a0 et fin réelle f1 (secondes dans la prise) d'une phrase mots[i0..i1].
    Silence = trame 10 ms < ref − 42 dB ; parole = trame > ref − 24 dB (ref : niveau de parole, 95e centile)."""
    sil, parle = ref - 42.0, ref - 24.0
    T = lambda s: int(s * sr / h)
    S = lambda i: i * h / sr
    s0, e1 = mots[i0]['s'], mots[i1]['e']
    # début : premier silence (trames consécutives) dans [s0 − 0,45 ; s0 + 0,6] suivi d'une attaque ≥ s0 − 0,15
    a0 = c0 = None
    j = max(0, T(s0 - 0.45))
    jmax = min(prof.shape[0] - 1, T(s0 + 0.6))
    while j <= jmax:
        if prof[j] < sil:
            k = j
            while k < prof.shape[0] and prof[k] < parle:
                k += 1
            if S(k) >= s0 - 0.15 and k < prof.shape[0]:
                a0 = S(k)
                c0 = max(S(j), a0 - 0.10)
                break
            j = k
        j += 1
    if a0 is None:                                       # pas de vrai silence : creux d'énergie le plus profond
        lo = (mots[i0 - 1]['e'] - 0.05) if i0 > 0 else 0.0
        jj = T(lo) + int(np.argmin(prof[T(lo):max(T(lo) + 1, T(s0 + 0.25))]))
        c0 = S(jj)
        k = jj
        while k < prof.shape[0] and prof[k] < parle:
            k += 1
        a0 = S(k)
    # fin : premier vrai silence dans [e1 − 0,05 ; e1 + 0,6], sinon creux le plus profond avant le mot suivant
    j0, j1 = T(e1 - 0.05), min(prof.shape[0], T(e1 + 0.6))
    js = [j for j in range(j0, j1) if prof[j] < sil]
    if js:
        jc = js[0]
    else:
        lim = e1 + 0.25
        if i1 + 1 < len(mots):
            lim = min(lim, mots[i1 + 1]['s'] + 0.25)
        jc = j0 + int(np.argmin(prof[j0:max(j0 + 1, T(lim))]))
    c1 = S(jc) + 0.02
    jf = jc
    while jf > T(a0) and prof[jf - 1] < sil + 6.0:
        jf -= 1
    f1 = S(jf)
    return c0, a0, c1, f1


def voix_off_v8(sr, N):
    """Pose les phrases de PHRASES_V8. Retourne (piste mono (N,), intervalles [(attaque, fin)], rapport)."""
    mp3 = os.path.join(DOSSIER_V5, 'voix', 'vo_v4_prise_A.mp3')
    with open(os.path.join(DOSSIER_V5, 'voix', 'mots_prise_A.json'), encoding='utf-8') as f:
        mots = json.load(f)
    x = v7.decoder_ffmpeg(mp3, sr, filtre=v7.FILTRE_VOIX, canaux=1)[:, 0]
    prof, h = profil_db(x, sr)
    ref = float(np.percentile(prof, 95))
    piste = np.zeros(N)
    intervalles, rapport = [], []
    for nom, i0, i1, ia, t_ancre, intention in PHRASES_V8:
        c0, a0, c1, f1 = decoupe_phrase(x, sr, mots, i0, i1, prof, h, ref)
        a_ancre = a0 if ia == i0 else v7.attaque_mot(x, mots[ia]['s'], sr, fen=0.15)
        t_att = t_ancre - (a_ancre - a0)
        fin = t_att + (f1 - a0)
        if nom == 'titre' and fin > FIN_VOIX_MAX:          # la dernière phrase doit finir avant le silence final
            t_att -= fin - FIN_VOIX_MAX
            fin = FIN_VOIX_MAX
        seg = x[int(c0 * sr):int(c1 * sr)].copy()
        nf = min(int(0.035 * sr), seg.shape[0] // 4)
        seg[:nf] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(nf) / nf)
        seg[-nf:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nf) / nf)
        i = int(round((t_att - (a0 - c0)) * sr))
        piste[i:i + seg.shape[0]] += seg[:max(0, N - i)]
        intervalles.append((t_att, fin))
        rapport.append({'phrase': nom, 'texte': ' '.join(m['w'] for m in mots[i0:i1 + 1]).replace(" '", "'"),
                        'attaque': round(t_att, 3), 'fin': round(fin, 3),
                        'mot_ancre': mots[ia]['w'], 't_mot_ancre': round(t_ancre, 3), 'intention': intention,
                        'coupe_prise_s': [round(c0, 3), round(c1, 3)]})
    ordre = sorted(range(len(intervalles)), key=lambda j: intervalles[j][0])
    for a, b in zip(ordre, ordre[1:]):
        assert intervalles[b][0] > intervalles[a][1] + 0.15, 'phrases de voix off qui se chevauchent : %s / %s' % (
            rapport[a]['phrase'], rapport[b]['phrase'])
    assert max(b for _, b in intervalles) <= FIN_VOIX_MAX + 1e-6, 'la voix off doit finir avant %.2f s' % FIN_VOIX_MAX
    return piste, intervalles, rapport


def courbe_sidechain_var(intervalles, reductions, N, sr, att=0.040, rel=0.420, maintien=0.250, anticipation=0.040):
    """Sidechain doux asymétrique de la V7 (anticipation 40 ms, maintien 250 ms, attaque 40 ms, relâche 420 ms) avec une
    réduction propre à chaque phrase (dB)."""
    fc = 1000.0
    nc = int(math.ceil(N / sr * fc)) + 2
    cible = np.ones(nc)
    for (a, b), r in zip(intervalles, reductions):
        i, j = max(0, int((a - anticipation) * fc)), int((b + maintien) * fc) + 1
        cible[i:j] = np.minimum(cible[i:j], 10 ** (r / 20.0))
    ca, cr = math.exp(-1.0 / (att * fc)), math.exp(-1.0 / (rel * fc))
    g = np.ones(nc)
    cur = 1.0
    for i in range(nc):
        c = ca if cible[i] < cur else cr
        cur = c * cur + (1 - c) * cible[i]
        g[i] = cur
    return np.interp(np.arange(N) / sr, np.arange(nc) / fc, g)


# ----------------------------------------------------------------------------------------------
# Sections
# ----------------------------------------------------------------------------------------------
def boite_a_musique(sr, rng, t_debut, t_arret, noire):
    """« Vive le vent » (refrain, domaine public) en do majeur sur une boîte à musique, accompagnement de lames graves,
    puis ARRÊT DE BANDE à t_arret (la boîte se dévide : vitesse de lecture qui s'effondre). Retourne (n,2) depuis 0."""
    D = t_arret + 1.2
    n = int(D * sr)
    mono = np.zeros(n)
    mel = [(76, 1), (76, 1), (76, 2), (76, 1), (76, 1), (76, 2), (76, 1), (79, 1), (72, 1.5), (74, 0.5), (76, 4),
           (77, 1), (77, 1), (77, 1.5), (77, 0.5), (77, 1), (76, 1)]
    t = t_debut
    for m, d in mel:
        if t > t_arret + 0.3:
            break
        ajouter(mono, lame(midi_hz(m), 2.2, sr, rng), t, sr)
        ajouter(mono, lame(midi_hz(m + 12), 1.2, sr, rng, 0.6), t + 0.004, sr, 0.22)
        t += d * noire
    mesure = 4 * noire
    acc = [[(48, 55), (52, 55)], [(48, 55), (52, 55)], [(48, 52), (43, 53)], [(48, 55, 60), (55, 64)], [(41, 48), (45, 53)]]
    for b, temps_acc in enumerate(acc):
        for j, notes in enumerate(temps_acc):
            ta = t_debut + b * mesure + j * 2 * noire
            if ta > t_arret + 0.3:
                continue
            for q, m in enumerate(notes):
                ajouter(mono, lame(midi_hz(m + 12), 2.4, sr, rng, 0.5), ta + 0.012 * q, sr, 0.42)
    # arrêt de bande : position de lecture p(t) = t avant l'arrêt, puis vitesse r = exp(−(t − t_arret)/0,22)
    tt = temps(n, sr)
    u = np.maximum(tt - t_arret, 0.0)
    p = np.where(tt < t_arret, tt, t_arret + 0.22 * (1.0 - np.exp(-u / 0.22)))
    lu = np.interp(p * sr, np.arange(n), mono)
    lu *= np.where(tt < t_arret, 1.0, np.cos(0.5 * np.pi * np.clip(u / 0.7, 0, 1)))
    return reverbe(lu, sr, rt60=1.5, graine=11, humide=0.22)


def ajouter(buf, sig, t0, sr, gain=1.0):
    """Additionne un signal mono dans un tampon mono à partir de t0 s, sans dépasser les bornes."""
    i0 = int(round(t0 * sr))
    a, b = max(0, -i0), min(sig.shape[0], buf.shape[0] - i0)
    if b > a:
        buf[i0 + a:i0 + b] += sig[a:b] * gain


def nappe_chaude(sr, duree, accords, t_debut, mesure, t_arret):
    """Nappe douce (triangles filtrés) qui suit les accords de la boîte à musique, éteinte à l'arrêt de bande."""
    n = int(duree * sr)
    out = np.zeros((n, 2))
    for b, acc in enumerate(accords):
        d0 = t_debut + b * mesure
        if d0 >= t_arret:
            break
        d = min(mesure + 0.6, t_arret + 0.4 - d0)
        nn = int(d * sr)
        t = temps(nn, sr)
        x = np.zeros((nn, 2))
        for j, m in enumerate(acc):
            f = midi_hz(m)
            for det, pan in ((0.998, -0.6), (1.002, 0.6)):
                tri = sum(((-1) ** k) * np.sin(2 * np.pi * f * det * (2 * k + 1) * t) / (2 * k + 1) ** 2 for k in range(4))
                x += stereo(tri, pan)
        x *= fenetre(nn, 0.45, 0.6, sr)[:, None]
        poser(out, x, d0, sr)
    return norme(out)


def batterie_motif(bus, kit, t0, t1, bpm, motif, gains, sr, swing=0.0):
    """Séquenceur à la double croche : motif = {voix: chaîne de 16 caractères ('x' fort, 'o' doux, '.' rien)} sur une mesure."""
    pas = 60.0 / bpm / 4
    k = 0
    t = t0
    while t < t1 - 1e-6:
        i = k % 16
        dt = swing * pas if (i % 2 == 1) else 0.0
        for voix, s in motif.items():
            c = s[i]
            if c != '.':
                poser(bus, kit[voix], t + dt, sr, pan=kit.get('pan_' + voix, 0.0),
                      gain=gains.get(voix, 1.0) * (1.0 if c == 'x' else 0.45))
        k += 1
        t = t0 + k * pas


def ligne_basse(bus, t0, t1, bpm, notes, sr, gain=1.0, fc=650.0):
    """notes : liste de (pas de double croche dans la mesure, midi, durée en pas) répétée chaque mesure."""
    pas = 60.0 / bpm / 4
    mes = 16 * pas
    b = 0
    while t0 + b * mes < t1 - 1e-6:
        for p, m, d in notes:
            t = t0 + b * mes + p * pas
            if t < t1 - 0.02:
                dur = min(d * pas, t1 - t)
                poser(bus, basse(midi_hz(m), dur, sr, fc), t, sr, gain=gain)
        b += 1


def construire_kit(sr):
    rng = np.random.default_rng(71000)
    return {'k': grosse_caisse(sr, rng), 's': caisse_claire(sr, rng), 'c': clap(sr, rng), 'h': charleston(sr, rng),
            'o': charleston(sr, rng, True), 'kb': grosse_caisse(sr, rng, 42.0, 130.0, 0.3, 0.9, 0.35),
            'pan_h': 0.25, 'pan_o': 0.25, 'pan_c': -0.05}


# ----------------------------------------------------------------------------------------------
# Programme principal
# ----------------------------------------------------------------------------------------------
def sources_a_surveiller(args):
    fic = [os.path.abspath(__file__), args.plan, os.path.join(DOSSIER_V7, 'sound_v7_crescendo.py'),
           os.path.join(DOSSIER_V5, 'themes_ecuries.json'), os.path.join(DOSSIER_V5, 'voix', 'mots_prise_A.json')]
    fic += sorted(glob.glob(os.path.join(DOSSIER_V5, 'voix', '*.mp3')))
    fic += [p for p in (v7.trouver_theme(args.dossier_themes, n) for n in range(1, 16)) if p]
    return [f for f in fic if os.path.isfile(f)]


def a_jour(args, wav, tl):
    """Vrai si le mix et la timeline sont plus récents que le script, le plan et les sources, avec toutes les écuries réelles
    disponibles et la voix off."""
    if not (os.path.isfile(wav) and os.path.isfile(tl)):
        return False
    ref = max(os.path.getmtime(f) for f in sources_a_surveiller(args))
    if min(os.path.getmtime(wav), os.path.getmtime(tl)) < ref:
        return False
    try:
        with open(tl, encoding='utf-8') as f:
            bilan = json.load(f).get('bilan') or {}
    except (OSError, ValueError):
        return False
    dispo = sum(1 for n in range(1, 16) if v7.trouver_theme(args.dossier_themes, n))
    return bilan.get('ecuries_reelles', 0) >= dispo and bilan.get('phrases_voix_off', 0) > 0


def main():
    ap = argparse.ArgumentParser(description='Bande-son V8 « Grand Prix de Noël — Finale » (92,0 s).')
    ap.add_argument('--rapide', action='store_true', help='rend à 22,05 kHz mono pour test (audio/mix_v8_rapide.wav)')
    ap.add_argument('--sortie', default=None, help='chemin du WAV (défaut : audio/mix_v8.wav)')
    ap.add_argument('--sans-reel', action='store_true', help='ignore les extraits MP3 même s\'ils existent')
    ap.add_argument('--sans-voix', action='store_true', help='mix sans la voix off')
    ap.add_argument('--plan', default=os.path.join(ICI, 'data', 'plan_v8.json'))
    ap.add_argument('--dossier-themes', default=os.path.join(DOSSIER_V5, 'themes_ecuries'))
    ap.add_argument('--si-perime', action='store_true',
                    help='ne recalcule que si le mix manque ou est plus ancien que ce script, le plan ou les sources')
    args = ap.parse_args()
    args.plan = os.path.abspath(args.plan)
    wav = os.path.abspath(args.sortie) if args.sortie else os.path.join(ICI, 'audio', 'mix_v8_rapide.wav' if args.rapide else 'mix_v8.wav')
    chemin_tl = os.path.join(ICI, 'data', 'timeline_v8_rapide.json' if args.rapide else 'timeline_v8.json')
    if args.si_perime and a_jour(args, wav, chemin_tl):
        print('Mix V8 à jour (écuries réelles et voix off) : %s' % os.path.relpath(wav, ICI))
        return 0

    t_calc = time.time()
    sr = 22050 if args.rapide else 44100
    N = int(round(DUREE * sr))
    with open(args.plan, encoding='utf-8') as f:
        plan = json.load(f)
    assert abs(float(plan['duree']) - DUREE) < 1e-9, 'le plan doit durer 92,0 s'
    R = plan['reperes_son']
    seg = {s['id']: s for s in plan['segments']}
    sous = {x['id']: (x['debut'], x['fin']) for s in plan['segments'] for x in s.get('sous', [])}
    ecuries = [dict(e) for e in plan['ecuries']]
    pieges = plan['pieges']
    assert len(ecuries) == 15, '15 écuries attendues'
    for e in ecuries:
        assert e['debut'] < e['impact'] < e['fin'], 'créneau incohérent : %s' % e
    with open(v7.fichier_web('data', 'teams.json'), encoding='utf-8') as f:
        equipes = {int(t['id']): t for t in json.load(f)}
    cfg_themes = {}
    chemin_th = os.path.join(DOSSIER_V5, 'themes_ecuries.json')
    if os.path.isfile(chemin_th):
        with open(chemin_th, encoding='utf-8') as f:
            cfg_themes = json.load(f).get('ecuries', {})

    rng = np.random.default_rng(80800)
    kit = construire_kit(sr)
    bus_salon = np.zeros((N, 2))      # boîte à musique, feu, nappe, grelots
    bus_bed = np.zeros((N, 2))        # lit musical (batterie, basse, cuivres, nappes)
    bus_fx = np.zeros((N, 2))         # bruitages et habillage
    bus_theme = np.zeros((N, 2))      # les 15 signatures d'écuries
    evenements = []

    def ev(t, quoi):
        evenements.append({'t': round(float(t), 3), 'quoi': quoi})

    # ================================ 1. SALON (0 → 14 s) ================================
    t_tapis, t_plongee, t_ring = R['tapis_ouverture'], R['plongee_arene'], R['arrivee_ring']
    noire = 0.475
    t_mel = 0.30
    bam = boite_a_musique(sr, np.random.default_rng(80100), t_mel, t_tapis, noire)
    poser(bus_salon, bam, 0.0, sr, gain=0.62)
    ev(t_mel, 'boîte à musique « Vive le vent » (domaine public, synthèse)')
    ev(t_tapis, 'arrêt de bande de la boîte à musique + sub-drop d\'ouverture du tapis')
    accords = [(48, 55, 64), (48, 55, 64), (48, 52, 67), (48, 55, 64), (41, 53, 57)]
    nap = nappe_chaude(sr, t_tapis + 1.0, accords, t_mel, 4 * noire, t_tapis)
    poser(bus_salon, nap, 0.0, sr, gain=0.10)
    rg = np.random.default_rng(80200)
    for b in range(4):
        for j in (1, 3):
            tg = t_mel + b * 4 * noire + j * noire
            if tg < t_tapis - 0.2:
                poser(bus_salon, grelots(sr, rg), tg, sr, pan=0.35, gain=0.10)
    d_feu = t_tapis + 1.4
    feu = feu_de_cheminee(sr, d_feu, np.random.default_rng(80300))
    nf = feu.shape[0]
    tf = temps(nf, sr)
    feu *= np.where(tf < t_tapis, 1.0, np.cos(0.5 * np.pi * np.clip((tf - t_tapis) / 1.3, 0, 1)))[:, None]
    poser(bus_salon, feu, 0.0, sr, gain=0.30)
    ev(0.0, 'feu de cheminée procédural (crépitements, pops de sève)')

    # bascule : ouverture du tapis (8,6 s), plongée (11,0 s), arrivée sur le ring (13,6 s)
    rb = np.random.default_rng(80400)
    poser(bus_fx, sub_drop(sr, 2.2, 95.0, 26.0, 0.9), t_tapis, sr, gain=1.0)
    gr = roulement_grave(sr, rb, t_plongee - t_tapis + 0.4, 30.0, 220.0)
    poser(bus_fx, stereo(gr, 0.0), t_tapis, sr, gain=0.35)
    nwh = int(0.5 * sr)
    poser(bus_fx, stereo(norme(filtre_bande(rb.standard_normal(nwh), sr, 40.0, 400.0)) * np.exp(-temps(nwh, sr) / 0.12)
                         * montee(temps(nwh, sr), 0.003) * fenetre(nwh, 0.0, 0.1, sr)), t_tapis, sr, gain=0.5)
    v7.whoosh(bus_fx, t_plongee, sr, long=1.8, gain=0.75, seed=80401, sens=1)
    poser(bus_fx, sub_drop(sr, 1.4, 70.0, 30.0, 0.5), t_plongee, sr, gain=0.6)
    ev(t_plongee, 'whoosh de plongée dans l\'arène')
    d_r = t_ring - t_plongee - 0.06
    poser(bus_fx, riser(sr, d_r, rb, tonale=45), t_plongee, sr, gain=0.55)
    # montée de batterie : noires puis croches puis doubles croches vers l'impact
    for i in range(12):
        tk = t_ring - 0.5 * (12 - i) * 0.5
        if tk > t_plongee + 0.2:
            poser(bus_bed, kit['k'], tk, sr, gain=0.55 + 0.03 * i)
    tsn = t_plongee + 1.0
    pas = 0.25
    while tsn < t_ring - 0.07:
        poser(bus_bed, kit['s'], tsn, sr, gain=0.18 + 0.5 * ((tsn - t_plongee) / (t_ring - t_plongee)) ** 2)
        pas = max(0.0625, pas * 0.9)
        tsn += pas
    # impact d'arrivée sur le ring
    poser(bus_fx, sub_drop(sr, 2.4, 110.0, 28.0, 0.8), t_ring, sr, gain=1.15)
    poser(bus_fx, stereo(cymbale(sr, rb, 2.8, 1.0)), t_ring, sr, gain=0.42)
    poser(bus_bed, kit['kb'], t_ring, sr, gain=1.0)
    nci = int(0.45 * sr)
    tci = temps(nci, sr)
    craq = (rb.standard_normal(nci) * np.exp(-tci / 0.018) + 1.2 * filtre_bande(rb.standard_normal(nci), sr, 3500.0, 11000.0)
            * np.exp(-tci / 0.045)) * montee(tci, 0.0006) * fenetre(nci, 0.0, 0.1, sr)
    poser(bus_fx, np.stack([norme(craq), np.roll(norme(craq), int(0.0007 * sr))], axis=1), t_ring, sr, gain=0.5)
    poser(bus_fx, foule(sr, rb, 2.6), t_ring + 0.05, sr, gain=0.22)
    poser(bus_fx, cuivres([45, 52, 57, 61, 64], 1.2, sr, 1.2), t_ring, sr, gain=0.35)
    ev(t_ring, 'impact d\'arrivée sur le ring (sub, cymbale, foule, cuivres)')

    # ================================ 2. ÉCURIES (14 → 44 s) ================================
    t_fin_ec = seg['ecuries']['fin']
    lignes_ec = medley_ecuries(bus_theme, ecuries, cfg_themes, sr, args.dossier_themes, args.sans_reel, equipes, t_fin_ec,
                               t_plongee + 1.0)
    sel = select_arcade(sr, np.random.default_rng(80500))
    rs = np.random.default_rng(80510)
    for k, e in enumerate(ecuries):
        poser(bus_fx, stereo(sel, 0.15 if k % 2 else -0.15), e['debut'], sr, gain=0.30)
        poser(bus_bed, kit['k'], e['debut'], sr, gain=0.55)
        poser(bus_bed, sub_drop(sr, 0.6, 70.0, 40.0, 0.18), e['impact'], sr, gain=0.35)
        if k > 0:
            v7.whoosh(bus_fx, e['debut'], sr, long=0.45, gain=0.30, seed=80520 + k, sens=1 if k % 2 else -1)
    ev(ecuries[0]['debut'], '15 sons « Select ! » arcade (un par changement de voiture)')
    # nappe sub très discrète sous le défilé
    n_ec = int((t_fin_ec - ecuries[0]['debut'] + 0.5) * sr)
    tn = temps(n_ec, sr)
    sub_ec = (np.sin(2 * np.pi * 55.0 * tn) + 0.3 * np.sin(2 * np.pi * 110.3 * tn)) * fenetre(n_ec, 0.6, 0.5, sr)
    poser(bus_bed, sub_ec, ecuries[0]['debut'], sr, gain=0.05)

    # ================================ 3. LA FOLIE (44 → 92 s) ================================
    p0, p1 = sous['paris']
    m0, m1 = sous['meute']
    c0_, c1_ = sous['caisses']
    b0, b1 = sous['boss']
    q0, q1 = sous['pieges']
    r0, r1 = sous['regle']
    x0_, x1_ = sous['climax']
    f0_, f1_ = sous['final']
    t_photo, t_carte = R['photo_finish'], R['carte_finale']
    rf = np.random.default_rng(80600)

    # --- paris : groove 120 BPM, pièces d'or, clic du bouton
    poser(bus_fx, stereo(cymbale(sr, rf)), p0, sr, gain=0.35)
    v7.whoosh(bus_fx, p0, sr, long=1.0, gain=0.45, seed=80601, sens=-1)
    poser(bus_bed, kit['kb'], p0, sr, gain=0.9)
    groove = {'k': 'x.....x.x.......', 'c': '....x.......x...', 'h': 'x.o.x.o.x.o.x...', 'o': '..............x.'}
    batterie_motif(bus_bed, kit, p0, m0, 120.0, groove, {'k': 0.85, 'c': 0.45, 'h': 0.22, 'o': 0.2}, sr, swing=0.12)
    accords_paris = [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [59, 62, 67]), (40, [56, 59, 64])]
    mesure = 2.0
    b = 0
    while p0 + b * mesure < m0 - 1e-6:
        racine, acc = accords_paris[b % 4]
        tb = p0 + b * mesure
        ligne_basse(bus_bed, tb, min(tb + mesure, m0), 120.0,
                    [(0, racine, 3), (3, racine, 1), (6, racine + 7, 2), (10, racine + 12, 2), (12, racine, 2), (14, racine + 10, 2)],
                    sr, gain=0.30)
        for st in (2, 10):
            poser(bus_bed, cuivres(acc, 0.22, sr, 0.8), tb + st * 0.125, sr, gain=0.16)
        b += 1
    # paris placés « à l'ancienne » avant la pluie : quelques pièces isolées
    for tp in (44.55, 45.15, 45.6, 46.0):
        poser(bus_fx, piece_or(sr, rf), tp, sr, pan=float(rf.uniform(-0.5, 0.5)), gain=0.30)
    # pluie de pièces d'or
    t_pluie = R['paris_pluie_pieces']
    poser(bus_fx, cuivres([57, 61, 64, 69], 0.5, sr, 1.0), t_pluie, sr, gain=0.20)
    tp = t_pluie
    nb_pieces = 0
    while tp < t_pluie + 2.2:
        dens = 34.0 * math.exp(-(tp - t_pluie) / 0.9) + 4.0
        poser(bus_fx, piece_or(sr, rf), tp, sr, pan=float(rf.uniform(-0.85, 0.85)), gain=float(rf.uniform(0.18, 0.4)))
        nb_pieces += 1
        tp += float(rf.exponential(1.0 / dens))
    nps = int(2.4 * sr)
    tps_ = temps(nps, sr)
    cascade = norme(filtre_bande(rf.standard_normal(nps), sr, 2500.0, 9000.0)) * np.exp(-tps_ / 0.8) * fenetre(nps, 0.05, 0.3, sr)
    poser(bus_fx, np.stack([cascade, np.roll(cascade, 151)], axis=1), t_pluie, sr, gain=0.07)
    ev(t_pluie, 'pluie de %d pièces d\'or' % nb_pieces)
    t_bouton = R['paris_bouton']
    poser(bus_fx, bouton_cash(sr, rf), t_bouton, sr, gain=0.55)
    ev(t_bouton, 'clic du gros bouton + « ka-ching »')

    # --- meute : drive 120 BPM en doubles croches, moteurs réels CC0 + synthèse
    poser(bus_fx, stereo(cymbale(sr, rf)), m0, sr, gain=0.35)
    drive = {'k': 'x...x...x...x...', 's': '....x.......x...', 'h': 'xoxoxoxoxoxoxoxo'}
    batterie_motif(bus_bed, kit, m0, c0_, 120.0, drive, {'k': 0.85, 's': 0.38, 'h': 0.16}, sr)
    ligne_basse(bus_bed, m0, c0_, 120.0, [(i, 40 + (12 if i % 4 == 2 else 0), 2) for i in range(0, 16, 2)], sr, gain=0.30, fc=800.0)
    moteurs_utilises = []
    plan_moteurs = [('05', 'gaz1.wav', 0.00, -0.6), ('12', 'gaz1.wav', 0.18, 0.5), ('14', 'gaz1.wav', 0.42, -0.2),
                    ('10', 'gaz2.wav', 0.75, 0.7), ('04', 'gaz1.wav', 1.30, -0.75), ('15', 'gaz3.wav', 1.9, 0.3)]
    for eq, fic, d, pan in plan_moteurs:
        ch = os.path.join(DOSSIER_MOTEURS, eq, fic)
        lic = os.path.join(DOSSIER_MOTEURS, eq, 'banque.json')
        try:
            with open(lic, encoding='utf-8') as f:
                if json.load(f).get('licence') != 'CC0':
                    continue
            x = v7.decoder_ffmpeg(ch, sr, canaux=1)[:, 0]
        except Exception:
            continue
        x = filtre_bande(x, sr, 45.0, None)
        lmax = int((c0_ - (m0 + d)) * sr)
        x = x[:lmax]
        x = norme(x) * fenetre(x.shape[0], 0.03, 0.5, sr)
        poser(bus_fx, pan_glisse(x, pan, -pan * 0.6), m0 + d, sr, gain=0.30)
        moteurs_utilises.append('sounds/moteurs_reels/%s/%s' % (eq, fic))
    poser(bus_fx, pan_glisse(moteur_synthese(sr, c0_ - m0, 70.0, 210.0, rf), -0.4, 0.4), m0, sr, gain=0.14)
    ev(m0, 'meute : %d moteurs réels CC0 + moteur de synthèse' % len(moteurs_utilises))

    # --- caisses : roulement de caisse claire, grincement, ouverture (60,2 s), étincelles
    t_caisse = R['caisses_ouverture']
    tsn = c0_
    while tsn < t_caisse - 0.03:
        u = (tsn - c0_) / (t_caisse - c0_)
        poser(bus_bed, kit['s'], tsn, sr, gain=0.15 + 0.45 * u ** 1.5)
        tsn += 0.125 if u < 0.5 else 0.0625
    poser(bus_fx, stereo(grincement(sr, rf, t_caisse - c0_ - 0.05), 0.2), c0_ + 0.02, sr, gain=0.30)
    poser(bus_fx, stereo(cymbale(sr, rf)), t_caisse, sr, gain=0.40)
    poser(bus_bed, kit['kb'], t_caisse, sr, gain=1.0)
    ncr = int(0.5 * sr)
    tcr = temps(ncr, sr)
    crac = (filtre_bande(rf.standard_normal(ncr), sr, 200.0, 3000.0) * np.exp(-tcr / 0.03) + np.sin(2 * np.pi * 90 * tcr)
            * np.exp(-tcr / 0.08)) * montee(tcr, 0.0006) * fenetre(ncr, 0.0, 0.1, sr)
    poser(bus_fx, stereo(norme(crac)), t_caisse, sr, gain=0.6)
    poser(bus_bed, cuivres([45, 52, 57, 60, 64], 0.9, sr, 1.2), t_caisse, sr, gain=0.30)
    for i, m in enumerate((84, 88, 91, 96, 100)):
        poser(bus_fx, stereo(cloche(midi_hz(m), 0.6, sr, 0.7), -0.6 + 0.3 * i), t_caisse + 0.06 + 0.06 * i, sr, gain=0.16)
    batterie_motif(bus_bed, kit, t_caisse + 0.5, b0, 120.0, {'k': 'x...x...x...x...', 'h': '..x...x...x...x.'},
                   {'k': 0.7, 'h': 0.2}, sr)
    ev(t_caisse, 'ouverture des caisses (craquement, cymbale, étincelles)')

    # --- boss : demi-tempo lourd, cuivres graves, passage (63,6 s)
    t_boss = R['boss_passage']
    poser(bus_fx, stereo(cymbale(sr, rf, 3.0, 1.3)), b0, sr, gain=0.35)
    for tk in (b0, b0 + 0.75, b0 + 2.0, b0 + 2.75):
        poser(bus_bed, kit['kb'], tk, sr, gain=0.9)
    for ts in (b0 + 1.0, b0 + 3.0):
        poser(bus_bed, kit['s'], ts, sr, gain=0.6)
        poser(bus_bed, kit['c'], ts, sr, gain=0.35)
    poser(bus_bed, cuivres([28, 35, 40, 47], b1 - b0, sr, 1.5, attaque=0.05), b0, sr, gain=0.26)
    ligne_basse(bus_bed, b0, b1 - 0.5, 60.0, [(0, 28, 8), (8, 31, 4), (12, 27, 4)], sr, gain=0.30, fc=400.0)
    for i, f in enumerate((220.0, 180.0, 150.0, 120.0)):
        poser(bus_bed, tom(sr, f), b1 - 0.5 + 0.125 * i, sr, pan=-0.4 + 0.27 * i, gain=0.45)
    v7.whoosh(bus_fx, t_boss, sr, long=2.0, gain=0.8, seed=80602, sens=1)
    poser(bus_fx, sub_drop(sr, 2.0, 90.0, 25.0, 0.7), t_boss, sr, gain=1.0)
    nrr = int(1.4 * sr)
    trr = temps(nrr, sr)
    fr_ = 70.0 * (1 + 0.25 * np.sin(2 * np.pi * 0.8 * trr)) * (1 - 0.3 * trr / 1.4)
    rug = np.sin(phase_continue(fr_, sr) + 2.5 * np.sin(phase_continue(fr_ * 1.5, sr))) + 0.5 * filtre_bande(
        rf.standard_normal(nrr), sr, 150.0, 1500.0) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * trr))
    rug = np.tanh(2.0 * norme(rug)) * np.sin(np.pi * np.clip(trr / 1.4, 0, 1)) ** 0.7 * fenetre(nrr, 0.05, 0.2, sr)
    poser(bus_fx, pan_glisse(norme(rug), -0.7, 0.7), t_boss - 0.35, sr, gain=0.40)
    ev(t_boss, 'passage des boss (whoosh, rugissement, sub)')

    # --- pièges : 6 contacts, explosions et boings cartoon
    effets_pieges = []
    racines = [45, 48, 50, 52, 53, 55]
    batterie_motif(bus_bed, kit, q0, q1, 90.0, {'h': 'x.o.x.o.x.o.x.o.'}, {'h': 0.13}, sr)
    for i, pg in enumerate(pieges):
        d, c = pg['debut'], pg['contact']
        rig = pg['rig']
        poser(bus_bed, kit['k'], d, sr, gain=0.75)
        poser(bus_bed, basse(midi_hz(racines[i] - 12), 0.6, sr), d, sr, gain=0.30)
        if rig == 'bascule':
            poser(bus_fx, stereo(grincement(sr, rf, 0.45), -0.3), d + 0.12, sr, gain=0.25)
            poser(bus_fx, stereo(boing(sr, 160.0, 0.8), 0.2), c, sr, gain=0.55)
            effet = 'grincement + boing de catapulte'
        elif rig == 'pelote':
            for j, (dt, f, g) in enumerate(((0.0, 210.0, 0.55), (0.24, 250.0, 0.38), (0.42, 290.0, 0.24))):
                poser(bus_fx, stereo(boing(sr, f, 0.5, 13.0), -0.3 + 0.3 * j), c + dt, sr, gain=g)
            effet = 'triple boing (rebonds)'
        elif rig == 'obus':
            poser(bus_fx, stereo(obus_siffle(sr, c - d - 0.05), 0.4), d + 0.05, sr, gain=0.22)
            poser(bus_fx, explosion(sr, rf, 1.0), c, sr, gain=0.75)
            effet = 'sifflement d\'obus + explosion'
        elif rig == 'curling':
            poser(bus_fx, stereo(roulement_grave(sr, rf, c - d, 200.0, 1200.0), -0.2), d, sr, gain=0.22)
            poser(bus_fx, claquements_bois(sr, rf, 2, 0.02), c, sr, gain=0.5)
            poser(bus_fx, stereo(boing(sr, 130.0, 0.7, 9.0), 0.3), c + 0.02, sr, gain=0.5)
            effet = 'glissade de pierre + choc + boing'
        elif rig == 'boulet':
            poser(bus_fx, explosion(sr, rf, 0.5), d + 0.04, sr, gain=0.35)
            poser(bus_fx, stereo(obus_siffle(sr, c - d - 0.12), -0.3), d + 0.1, sr, gain=0.15)
            poser(bus_fx, explosion(sr, rf, 1.4), c, sr, gain=0.85)
            effet = 'coup de canon + grosse explosion'
        else:
            poser(bus_fx, stereo(roulement_grave(sr, rf, c - d), 0.0), d, sr, gain=0.4)
            poser(bus_fx, claquements_bois(sr, rf, 10, 0.28), c, sr, gain=0.55)
            poser(bus_fx, explosion(sr, rf, 0.8), c, sr, gain=0.55)
            effet = 'roulement + strike (quilles) + explosion'
        effets_pieges.append({'rig': rig, 'contact': c, 'effet': effet})
        ev(c, 'piège %s : %s' % (rig, effet))

    # --- règle des 41 mm : tic-tac, buzzer, éjection (76,2 s)
    t_ej = R['regle_ejection']
    poser(bus_bed, cuivres([45, 52, 57, 63], 0.6, sr, 1.0), r0, sr, gain=0.28)
    poser(bus_bed, kit['kb'], r0, sr, gain=0.8)
    ttk = r0 + 0.333
    tic = 0
    while ttk < t_ej - 0.75:
        ntk = int(0.04 * sr)
        tt_ = temps(ntk, sr)
        f = 2600.0 if tic % 2 == 0 else 2000.0
        poser(bus_fx, stereo(np.sin(2 * np.pi * f * tt_) * np.exp(-tt_ / 0.006) * montee(tt_, 0.0003)
                             * fenetre(ntk, 0.0, 0.01, sr), 0.3 if tic % 2 else -0.3), ttk, sr, gain=0.22)
        tic += 1
        ttk += 0.333
    poser(bus_bed, stereo(sub_drop(sr, t_ej - r0, 55.0, 55.0, 99.0) * fenetre(int((t_ej - r0) * sr), 0.3, 0.2, sr)), r0, sr, gain=0.10)
    poser(bus_fx, stereo(buzzer(sr, 0.45)), t_ej - 0.68, sr, gain=0.30)
    poser(bus_fx, stereo(boing(sr, 120.0, 0.9, 8.0), 0.0), t_ej, sr, gain=0.6)
    poser(bus_fx, pan_glisse(sifflet_coulisse(sr, 0.65, 500.0, 2300.0), 0.0, 0.8), t_ej + 0.05, sr, gain=0.25)
    v7.whoosh(bus_fx, t_ej + 0.3, sr, long=0.9, gain=0.5, seed=80603, sens=1)
    ev(t_ej - 0.68, 'buzzer « hors gabarit » (règle des 41 mm)')
    ev(t_ej, 'éjection : boing + sifflet à coulisse + whoosh')
    batterie_motif(bus_bed, kit, t_ej + 0.3, x0_, 120.0, {'k': 'x.......x.......', 'h': '..x...x...x...x.'},
                   {'k': 0.6, 'h': 0.15}, sr)
    # relance après l'éjection : riser + basse tenue + cuivres en crescendo jusqu'au climax (pas de trou)
    poser(bus_fx, riser(sr, x0_ - (t_ej + 0.4), rf, f0=200.0, f1=9000.0, tonale=52), t_ej + 0.4, sr, gain=0.40)
    poser(bus_bed, basse(midi_hz(33), x0_ - (t_ej + 0.5), sr, 500.0), t_ej + 0.5, sr, gain=0.28)
    for i, tk in enumerate(np.arange(t_ej + 0.8, x0_ - 0.1, 0.25)):
        poser(bus_bed, cuivres([57, 64, 69], 0.15, sr, 0.8), float(tk), sr, gain=0.06 + 0.02 * i)
    tsn = x0_ - 0.5
    while tsn < x0_ - 0.03:
        poser(bus_bed, kit['s'], tsn, sr, gain=0.35)
        tsn += 0.125

    # --- climax : accelerando 120 → 190 BPM, riser, moteurs, roulement final ; coupure nette au photo-finish
    poser(bus_fx, stereo(cymbale(sr, rf)), x0_, sr, gain=0.35)
    tb = [x0_]
    while True:
        u = (tb[-1] - x0_) / (t_photo - x0_)
        bpm = 120.0 + 70.0 * u ** 1.3
        nt = tb[-1] + 60.0 / bpm
        if nt > t_photo - 0.02:
            break
        tb.append(nt)
    for i, tk in enumerate(tb):
        u = (tk - x0_) / (t_photo - x0_)
        poser(bus_bed, kit['k'], tk, sr, gain=0.7 + 0.25 * u)
        poser(bus_bed, kit['h'], tk + 0.5 * (60.0 / (120.0 + 70.0 * u ** 1.3)), sr, pan=0.25, gain=0.15 + 0.1 * u)
        if i % 2 == 1 and tk < t_photo - 1.6:
            poser(bus_bed, kit['s'], tk, sr, gain=0.4 + 0.2 * u)
        if i % 4 == 0:
            m = 45 + i // 4
            poser(bus_bed, basse(midi_hz(m - 12), 0.9, sr, 700.0), tk, sr, gain=0.30)
            poser(bus_bed, cuivres([m, m + 7, m + 12, m + 16], 0.35, sr, 1.0), tk, sr, gain=0.18 + 0.1 * u)
    tsn = t_photo - 1.6
    while tsn < t_photo - 0.02:
        u = (tsn - (t_photo - 1.6)) / 1.6
        poser(bus_bed, kit['s'], tsn, sr, gain=0.25 + 0.5 * u ** 1.4)
        tsn += 0.0625 if u < 0.6 else 0.04
    poser(bus_fx, riser(sr, t_photo - (x0_ + 2.0), rf, f0=250.0, f1=12000.0, tonale=57), x0_ + 2.0, sr, gain=0.45)
    poser(bus_fx, pan_glisse(moteur_synthese(sr, t_photo - (x0_ + 3.0), 160.0, 1100.0, rf), -0.7, 0.7), x0_ + 3.0, sr, gain=0.16)
    nch = int(1.2 * sr)
    tch = temps(nch, sr)
    charge = np.sin(phase_continue(2000.0 * (9000.0 / 2000.0) ** (tch / 1.2), sr)) * (tch / 1.2) ** 2 * fenetre(nch, 0.05, 0.005, sr)
    poser(bus_fx, stereo(charge), t_photo - 1.2, sr, gain=0.06)
    ev(x0_, 'crescendo : accelerando 120 → 190 BPM, riser, moteurs, roulement')

    # ================================ CARTE FINALE (88 → 92 s) ================================
    rfi = np.random.default_rng(80700)
    bus_post = np.zeros((N, 2))       # après la coupure : flash, suspension, carte finale (non soumis au masque de coupure)
    fl = flash_photo(sr, rfi)
    poser(bus_post, reverbe(fl, sr, rt60=1.8, graine=12, humide=0.35), t_photo, sr, gain=0.75)
    ev(t_photo, 'COUPURE NETTE + flash sonore (photo-finish)')
    d_susp = t_carte - t_photo - 0.3
    nsu = int(d_susp * sr)
    tsu = temps(nsu, sr)
    susp = (np.sin(2 * np.pi * 55.0 * tsu) + 0.5 * np.sin(2 * np.pi * 82.4 * tsu)) * (tsu / d_susp) ** 1.5 * fenetre(nsu, 0.3, 0.01, sr)
    poser(bus_post, stereo(susp), t_photo + 0.3, sr, gain=0.08)
    rv = cymbale(sr, rfi, 1.2, 0.5)[::-1].copy() * fenetre(int(1.2 * sr), 0.3, 0.006, sr)
    poser(bus_post, stereo(rv), t_carte - 1.2, sr, gain=0.25)
    # accord final (do majeur, cuivres + lames de boîte à musique) : tout s'éteint avant 92,0 s
    t_fin_son = DUREE - 0.08
    d_fin = t_fin_son - t_carte
    acc_fin = cuivres([36, 43, 48, 52, 55, 60, 64], d_fin, sr, 1.6, attaque=0.01)
    nfi = acc_fin.shape[0]
    tfi = temps(nfi, sr)
    env_fin = np.exp(-tfi / 1.3) * np.cos(0.5 * np.pi * np.clip((tfi - (d_fin - 0.9)) / 0.9, 0, 1))
    poser(bus_post, acc_fin * env_fin[:, None], t_carte, sr, gain=0.55)
    cym = cymbale(sr, rfi, d_fin, 1.0)
    cym *= np.cos(0.5 * np.pi * np.clip((temps(cym.shape[0], sr) - (d_fin - 0.9)) / 0.9, 0, 1))
    poser(bus_post, stereo(cym), t_carte, sr, gain=0.30)
    poser(bus_post, stereo(kit['kb']), t_carte, sr, gain=0.9)
    poser(bus_post, stereo(sub_drop(sr, 2.0, 90.0, 30.0, 0.6)), t_carte, sr, gain=0.8)
    # reprise de la boîte à musique : « Vive le vent, vive le vent » puis le do aigu qui résonne
    rbm = np.random.default_rng(80710)
    rep = np.zeros(int((d_fin + 0.5) * sr))
    for j, (dt, m) in enumerate(((0.25, 76), (0.55, 76), (0.85, 76), (1.45, 76), (1.75, 76), (2.05, 76), (2.55, 84))):
        ajouter(rep, lame(midi_hz(m), 1.6 if m < 84 else 1.35, sr, rbm), dt, sr, 0.9 if m < 84 else 1.0)
    rep = rep[:nfi]
    rep *= np.cos(0.5 * np.pi * np.clip((tfi - (d_fin - 0.6)) / 0.6, 0, 1))
    poser(bus_post, reverbe(rep, sr, rt60=1.4, graine=13, humide=0.25)[:nfi], t_carte, sr, gain=0.35)
    ev(t_carte, 'carte finale : accord + reprise boîte à musique, extinction avant %.2f s' % t_fin_son)
    # rien après t_fin_son dans le bus final
    bus_post[int(t_fin_son * sr):] = 0.0

    # ================================ VOIX OFF + SIDECHAIN ================================
    bus_voix = np.zeros((N, 2))
    iv_voix, rapport_voix = [], []
    if not args.sans_voix:
        try:
            vo, iv_voix, rapport_voix = voix_off_v8(sr, N)
            bus_voix[:, 0] += vo
            bus_voix[:, 1] += vo
        except (OSError, RuntimeError, ValueError, KeyError) as ex:
            print('  [avertissement] voix off impossible (%s) : mix sans commentateur' % ex)
    # garde-fous de calage : chaque phrase doit finir avant le repère qu'elle annonce
    limites = {'mesdames': t_tapis - 1.0, 'paris': t_bouton, 'caisses': t_caisse, 'attention': t_boss, 'pieges': q0,
               'gloire': t_photo, 'final': t_photo - 0.05, 'titre': FIN_VOIX_MAX + 1e-6}
    for r in rapport_voix:
        lim = limites.get(r['phrase'])
        assert lim is None or r['fin'] < lim, 'phrase « %s » trop longue : finit à %.2f s (limite %.2f s)' % (r['phrase'], r['fin'], lim)

    # coupure nette au photo-finish : tout ce qui précède s'arrête en 6 ms (le flash et la carte finale sont à part)
    masque = np.ones(N)
    ic = int(t_photo * sr)
    nm = int(0.006 * sr)
    masque[ic:ic + nm] = np.cos(0.5 * np.pi * np.arange(nm) / nm)
    masque[ic + nm:] = 0.0
    G = {'salon': 1.0, 'bed': 0.85, 'fx': 0.8, 'theme': 0.8, 'post': 0.9}

    def reste_avec(sc):
        return ((bus_salon * G['salon'] + bus_bed * G['bed'] + bus_fx * G['fx'] + bus_theme * G['theme']) * masque[:, None]
                + bus_post * G['post']) * sc[:, None]

    rms_db = lambda b, a, z: 20 * math.log10(math.sqrt(float(np.mean(b[int(a * sr):int(z * sr)] ** 2))) + 1e-9)
    reductions = [-8.0] * len(iv_voix)
    sc = np.ones(N)
    for it in range(6):
        sc = courbe_sidechain_var(iv_voix, reductions, N, sr) if iv_voix else np.ones(N)
        reste = reste_avec(sc)
        ok = True
        for j, r in enumerate(rapport_voix):
            r['marge_db'] = round(rms_db(bus_voix * GAIN_VOIX, r['attaque'], r['fin']) - rms_db(reste, r['attaque'], r['fin']), 1)
            if r['marge_db'] < MARGE_VOIX_DB and reductions[j] > -20.0:
                reductions[j] = max(-20.0, reductions[j] - (MARGE_VOIX_DB - r['marge_db']) - 0.5)
                ok = False
        if ok:
            break
    for j, r in enumerate(rapport_voix):
        r['reduction_sidechain_db'] = round(reductions[j], 1)
    mix = reste + bus_voix * GAIN_VOIX
    mix *= fenetre(N, 0.02, 0.05, sr)[:, None]           # départ et fin à zéro
    if args.rapide:
        mix = mix.mean(axis=1, keepdims=True)

    # mastering (méthode V7) : gain cherché par dichotomie pour −16 LUFS APRÈS le limiteur tanh (crête ≤ plafond)
    plafond = 10 ** ((PLAFOND_DBFS - 0.2) / 20.0)
    lo, hi = -40.0, 30.0
    for _ in range(20):
        mid = 0.5 * (lo + hi)
        if v7.lufs_approx(v7.limiteur_doux(mix * 10 ** (mid / 20.0), plafond), sr) < CIBLE_LUFS:
            lo = mid
        else:
            hi = mid
    gain_db = 0.5 * (lo + hi)
    final = v7.limiteur_doux(mix * 10 ** (gain_db / 20.0), plafond)
    assert np.all(np.isfinite(final)), 'NaN/Inf dans le mix'
    assert final.shape[0] == N, 'durée inexacte'
    pcm = v7.ecrire_wav(wav, final, sr)
    relu = pcm.astype(float) / 32768.0
    lufs_mesure = v7.lufs_approx(relu, sr)
    crete = 20 * math.log10(max(float(np.max(np.abs(relu))), 1e-9))
    queue_db = 20 * math.log10(float(np.max(np.abs(relu[int((DUREE - 0.05) * sr):]))) + 1e-9)

    nb_reel = sum(1 for e in lignes_ec if e['source'] == 'reel')
    timeline = {
        'version': 'v8',
        'duree': DUREE,
        'echantillons': int(final.shape[0]),
        'fps': plan.get('fps', 60),
        'plan': os.path.relpath(args.plan, ICI).replace(os.sep, '/'),
        'segments': plan['segments'],
        'reperes_son': R,
        'evenements': sorted(evenements, key=lambda x: x['t']),
        'ecuries': lignes_ec,
        'selects': [e['debut'] for e in ecuries],
        'pieges': effets_pieges,
        'moteurs_cc0': moteurs_utilises,
        'voix_off': rapport_voix,
        'voix': [[round(a, 3), round(b, 3)] for a, b in iv_voix],
        'mix': {'fichier': os.path.relpath(wav, ICI).replace(os.sep, '/') if wav.startswith(ICI) else wav,
                'frequence_hz': sr, 'canaux': int(final.shape[1]), 'gain_master_db': round(gain_db, 2),
                'lufs_approx': round(lufs_mesure, 2), 'crete_dbfs': round(crete, 2),
                'niveau_50_dernieres_ms_dbfs': round(queue_db, 1),
                'methode_lufs': 'V7 : pondération K approchée par FFT (passe-haut 38 Hz + étagère +4 dB à 1,7 kHz), '
                                'blocs 400 ms, portes -70 LUFS / -10 LU'},
        'bilan': {'ecuries_reelles': nb_reel, 'ecuries_synthetisees': len(lignes_ec) - nb_reel,
                  'phrases_voix_off': len(rapport_voix), 'chevauchement_voix': False,
                  'marge_voix_min_db': min([r['marge_db'] for r in rapport_voix], default=None)},
    }
    os.makedirs(os.path.dirname(chemin_tl), exist_ok=True)
    with open(chemin_tl, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)

    print('Mix V8 : %s' % wav)
    print('  durée %.4f s (%d échantillons) | %d Hz | %d canal(aux)' % (final.shape[0] / sr, final.shape[0], sr, final.shape[1]))
    print('  LUFS approx %.2f | crête %.2f dBFS | 50 dernières ms %.1f dBFS' % (lufs_mesure, crete, queue_db))
    print('  %d écuries réelles, %d synthétisées | voix off : %d phrases | timeline : %s' %
          (nb_reel, len(lignes_ec) - nb_reel, len(rapport_voix), chemin_tl))
    for e in lignes_ec:
        s = e['signature']
        print('   %2d %-28s éclat %.3f s = impact | fondu %s -> %s | %s' % (e['id'], e['nom'][:28], s['t_eclat'], s['fondu_entree'],
                                                                       s['fondu_sortie'], ' + '.join(s['sources'])))
    for r in rapport_voix:
        print('   voix %-10s %6.2f -> %6.2f s  marge %+5.1f dB (sidechain %5.1f dB)  « %s »' % (
            r['phrase'], r['attaque'], r['fin'], r['marge_db'], r['reduction_sidechain_db'], r['texte'][:60]))
    print('  calcul : %.1f s' % (time.time() - t_calc))
    return 0


if __name__ == '__main__':
    sys.exit(main())
