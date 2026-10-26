#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bande-son V7 « Multivers -> Ring » : crescendo de 120 s calé sur data/plan_v7.json.

Entrée maîtresse : data/plan_v7.json (actes, vagues, fraction_monde, tempo, univers_boss, voix optionnelle).
Entrées réelles (V7.1) : ../audio_v5/themes_ecuries.json (calage), ../audio_v5/themes_ecuries/NN_*.mp3 (extraits sous droits,
absents du dépôt public : AUDIO_REEL_INTRO_3D.zip), ../audio_v5/voix/*.mp3 (voix enregistrées : Petite Mimine, Mario) et la voix off
du commentateur ../audio_v5/voix/vo_v4_prise_A.mp3 découpée aux mots par ../audio_v5/voix/mots_prise_A.json. Sans les extraits,
chaque écurie retombe sur un stinger de travail synthétique (le rapport l'indique : « N réelles, M synthétisées »).
Sorties : audio/mix_v7.wav (stéréo 44,1 kHz 16 bit, ~ -16 LUFS, crête <= -2 dBFS) et data/timeline_v7.json.

Dépendances : numpy + bibliothèque standard + ffmpeg (sous-processus, uniquement pour décoder des MP3 réels).
Déterminisme : tout aléa passe par np.random.default_rng(graine fixe) ; deux exécutions donnent le même fichier.
"""
import argparse
import colorsys
import glob
import json
import math
import os
import subprocess
import sys
import time
import wave

import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE_DEPOT = os.path.abspath(os.path.join(ICI, '..', '..'))
DUREE = 120.0
CIBLE_LUFS = -16.0
GAIN_VOIX = 1.5          # bus voix off dans le mix (+3,5 dB : la voix passe devant les nappes et l'habillage)
PLAFOND_DBFS = -2.0
EXT_AUDIO = ('.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac')


# ----------------------------------------------------------------------------------------------
# Outils de base
# ----------------------------------------------------------------------------------------------
def lisse(x):
    """smootherstep sur [0,1]."""
    x = np.clip(x, 0.0, 1.0)
    return x * x * x * (x * (x * 6 - 15) + 10)


def fenetre(n, a, b, sr):
    """Enveloppe de segment : fondu d'entrée sin (a s) et de sortie cos (b s) à puissance constante."""
    e = np.ones(n)
    na = min(int(a * sr), n)
    nb = min(int(b * sr), n)
    if na > 1:
        e[:na] *= np.sin(0.5 * np.pi * np.linspace(0.0, 1.0, na))
    if nb > 1:
        e[n - nb:] *= np.cos(0.5 * np.pi * np.linspace(0.0, 1.0, nb))
    return e


def poser(buf, sig, t0, sr, pan=0.0, gain=1.0):
    """Additionne sig (mono ou (n,2)) dans buf (N,2) à partir de t0 secondes, sans dépasser les bornes."""
    i0 = int(round(t0 * sr))
    n = sig.shape[0]
    a = max(0, -i0)
    b = min(n, buf.shape[0] - i0)
    if b <= a:
        return
    s = sig[a:b]
    if s.ndim == 1:
        ang = (pan + 1.0) * 0.25 * np.pi
        buf[i0 + a:i0 + b, 0] += s * math.cos(ang) * gain
        buf[i0 + a:i0 + b, 1] += s * math.sin(ang) * gain
    else:
        buf[i0 + a:i0 + b] += s * gain


def filtre_bande(x, sr, f1=None, f2=None, ordre=2):
    """Filtre passe-bande zéro-phase par FFT (magnitude de type Butterworth). f1 ou f2 peuvent être None."""
    n = x.shape[0]
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / sr)
    f = np.maximum(f, 1e-3)
    g = np.ones_like(f)
    if f1:
        g = g / np.sqrt(1.0 + (f1 / f) ** (2 * ordre))
    if f2:
        g = g / np.sqrt(1.0 + (f / f2) ** (2 * ordre))
    return np.fft.irfft(X * g, n)


def filtre_variable(x, sr, fc_haut, fc_bas=None, ordre=2, bloc=2048):
    """Filtre à fréquences de coupure variables (STFT, Hann 50 % recouvrement).
    fc_haut(t) : coupure du passe-bas ; fc_bas(t) : coupure du passe-haut (facultatif). t en secondes (relatif à x)."""
    n = x.shape[0]
    hop = bloc // 2
    fen = np.hanning(bloc + 1)[:-1]  # Hann périodique : somme = 1 à 50 %
    pad = np.concatenate([np.zeros(bloc), x, np.zeros(2 * bloc)])
    sortie = np.zeros_like(pad)
    f = np.maximum(np.fft.rfftfreq(bloc, 1.0 / sr), 1e-3)
    for d in range(0, n + bloc, hop):
        seg = pad[d:d + bloc] * fen
        tc = (d - bloc + bloc / 2) / sr
        g = 1.0 / np.sqrt(1.0 + (f / max(float(fc_haut(tc)), 20.0)) ** (2 * ordre))
        if fc_bas is not None:
            g = g / np.sqrt(1.0 + (max(float(fc_bas(tc)), 1.0) / f) ** (2 * ordre))
        sortie[d:d + bloc] += np.fft.irfft(np.fft.rfft(seg) * g, bloc)
    return sortie[bloc:bloc + n]


def bruit(rng, n):
    return rng.standard_normal(n)


def midi_hz(m):
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def phase_continue(freq, sr):
    """Phase (rad) d'un oscillateur dont la fréquence instantanée (Hz) varie par échantillon : pas de clic."""
    return 2.0 * np.pi * np.cumsum(freq) / sr


# ----------------------------------------------------------------------------------------------
# Mesure : loudness approchée (K-weighting dans le domaine fréquentiel + double gating BS.1770)
# ----------------------------------------------------------------------------------------------
def poids_k(x, sr):
    """Pondération K approchée : passe-haut 2e ordre à 38 Hz + étagère +4 dB au-dessus de ~1,7 kHz."""
    n = x.shape[0]
    f = np.maximum(np.fft.rfftfreq(n, 1.0 / sr), 1e-3)
    hp = 1.0 / np.sqrt(1.0 + (38.0 / f) ** 4)
    g2 = 10 ** (4.0 / 10)
    r = (f / 1700.0) ** 2
    sh = np.sqrt(1.0 + (g2 - 1.0) * r / (1.0 + r))
    return np.fft.irfft(np.fft.rfft(x) * hp * sh, n)


def lufs_approx(sig, sr):
    """LUFS intégré approché (blocs de 400 ms, pas 100 ms, portes -70 LUFS puis -10 LU). sig : (N,2) ou (N,1)."""
    z = sum(poids_k(sig[:, c], sr) ** 2 for c in range(sig.shape[1]))
    bl, pas = int(0.4 * sr), int(0.1 * sr)
    cs = np.concatenate([[0.0], np.cumsum(z)])
    deb = np.arange(0, max(len(z) - bl, 1), pas)
    ms = (cs[np.minimum(deb + bl, len(z))] - cs[deb]) / bl
    l = -0.691 + 10 * np.log10(np.maximum(ms, 1e-12))
    m1 = ms[l > -70.0]
    if m1.size == 0:
        return -70.0
    seuil = -0.691 + 10 * np.log10(np.mean(m1)) - 10.0
    m2 = ms[l > seuil]
    if m2.size == 0:
        m2 = m1
    return float(-0.691 + 10 * np.log10(np.mean(m2)))


def limiteur_doux(x, plafond_lin):
    """Écrêtage doux par tanh : la sortie est strictement bornée par plafond_lin."""
    return np.tanh(x / plafond_lin) * plafond_lin


# ----------------------------------------------------------------------------------------------
# Lecture du plan et dérivation des créneaux (même calcul que le JS)
# ----------------------------------------------------------------------------------------------
def charger_plan(chemin):
    with open(chemin, encoding='utf-8') as f:
        return json.load(f)


def deriver_ecuries(plan, noms):
    """Créneaux des 15 écuries : enchaînées dès le début de l'acte II, dans l'ordre des vagues."""
    acte2 = next(a for a in plan['actes'] if a['id'] == 'II')
    t = float(acte2['debut'])
    frac = float(plan['fraction_monde'])
    sortie = []
    for v in plan['vagues']:
        d = float(v['duree_plan'])
        for eid in v['ecuries']:
            sortie.append({'id': int(eid), 'nom': noms.get(int(eid), 'Écurie %d' % eid),
                           'debut': round(t, 6), 'impact': round(t + frac * d, 6), 'fin': round(t + d, 6),
                           'vague': int(v['id'])})
            t += d
    t_fin_ring = t + float(plan['fin_acte_II_ring_complet'])
    return sortie, t_fin_ring


# ----------------------------------------------------------------------------------------------
# Stinger de travail synthétique par écurie
# ----------------------------------------------------------------------------------------------
GAMMES = [
    [0, 2, 4, 7, 9],            # pentatonique majeure
    [0, 3, 5, 7, 10],           # pentatonique mineure
    [0, 2, 3, 5, 7, 9, 10],     # dorien
    [0, 1, 3, 5, 7, 8, 10],     # phrygien
    [0, 2, 4, 6, 7, 9, 11],     # lydien
    [0, 2, 4, 5, 7, 9, 10],     # mixolydien
    [0, 2, 3, 5, 7, 8, 11],     # mineur harmonique
    [0, 2, 4, 6, 8, 10],        # tons entiers
    [0, 3, 5, 6, 7, 10],        # blues
    [0, 2, 3, 7, 8],            # hirajoshi
    [0, 1, 4, 5, 7, 8, 11],     # double harmonique
    [0, 2, 4, 7, 9, 11],        # majeure hexatonique
]


def couleur_hsv(hexa):
    h = hexa.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return colorsys.rgb_to_hsv(r, g, b)


def note(freq, dur, kind, sr, bright=0.5):
    """Une note mono : kind 0 pincé, 1 pad scie, 2 cloche FM, 3 chip carré, 4 cuivre/orgue."""
    n = max(int(dur * sr), 8)
    t = np.arange(n) / sr
    nh = int(4 + 8 * bright)
    if kind == 0:
        x = sum(np.sin(2 * np.pi * freq * h * t) / h * np.exp(-t * (4.0 + 2.0 * h) / dur) for h in range(1, nh + 1)
                if freq * h < 0.45 * sr)
        att = 0.003
    elif kind == 1:
        x = sum((np.sin(2 * np.pi * freq * h * 1.003 * t) + np.sin(2 * np.pi * freq * h * 0.997 * t)) / h
                for h in range(1, nh + 4) if freq * h < 0.45 * sr) * np.exp(-t * 1.5 / dur)
        att = 0.03
    elif kind == 2:
        idx = (2.0 + 4.0 * bright) * np.exp(-t / (0.35 * dur + 0.05))
        x = np.sin(2 * np.pi * freq * t + idx * np.sin(2 * np.pi * freq * 3.5 * t)) * np.exp(-t * 3.0 / dur)
        att = 0.002
    elif kind == 3:
        x = sum(np.sin(2 * np.pi * freq * h * t) / h for h in range(1, 2 * nh, 2) if freq * h < 0.45 * sr)
        x = x * np.exp(-t * 2.5 / dur)
        att = 0.004
    else:
        x = sum(np.sin(2 * np.pi * freq * h * t) / (h ** (1.2 - 0.5 * bright)) for h in range(1, 7)
                if freq * h < 0.45 * sr) * (1.0 + 0.08 * np.sin(2 * np.pi * 5.5 * t))
        x = x * np.exp(-t * 1.2 / dur)
        att = 0.04
    x = np.asarray(x, dtype=float)
    pic = np.max(np.abs(x))
    if pic > 0:
        x = x / pic
    return x * fenetre(n, att, min(0.06, dur * 0.4), sr)


def stinger_synthese(e, couleurs, sr, longueur_s):
    """Stinger propre à l'écurie, relatif au début de son créneau : montée (arpège accélérant + glissando)
    puis pic exactement sur l'impact (accord plein), puis résolution. Retourne (n,2)."""
    eid = e['id']
    rng = np.random.default_rng(31000 + eid)
    h, s, v = couleur_hsv(couleurs[0])
    _, s2, v2 = couleur_hsv(couleurs[1] if len(couleurs) > 1 else couleurs[0])
    gamme = GAMMES[(eid - 1) % len(GAMMES)]
    racine = 45 + int(h * 12) % 12                      # teinte -> tonique
    kind = eid % 5                                       # timbre
    clarte = float(np.clip(0.5 * v + 0.5 * v2, 0.1, 1.0))
    L = e['fin'] - e['debut']
    ti = e['impact'] - e['debut']
    n_tot = int((L + 0.6) * sr)
    out = np.zeros((n_tot, 2))

    def degre(k, oct_base=1):
        o, i = divmod(k, len(gamme))
        return racine + 12 * (o + oct_base) + gamme[i]

    nb = 5 + eid % 3
    u = np.linspace(0.0, 1.0, nb, endpoint=False)
    tps = ti * (0.04 + 0.88 * (1.0 - (1.0 - u) ** 1.7))
    for k, tk in enumerate(tps):
        f = midi_hz(degre(k * 1 + int(2 * s)))
        dur = max(0.18, 0.45 - 0.03 * k)
        amp = 0.25 + 0.55 * (k + 1) / nb
        poser(out, note(f, dur, kind, sr, clarte), tk, sr, pan=float(rng.uniform(-0.6, 0.6)), gain=amp)
    # glissando de tension (sinus) sous l'arpège, pic à l'impact
    nA = int(ti * sr)
    ta = np.arange(nA) / sr
    fg = midi_hz(racine + 12) * 2.0 ** (2.0 * (ta / max(ti, 1e-3)) ** 1.5)
    gl = np.sin(phase_continue(fg, sr)) * (ta / max(ti, 1e-3)) ** 2 * 0.35
    poser(out, gl * fenetre(nA, 0.15, 0.01, sr), 0.0, sr, gain=1.0)
    # accord de pic sur l'impact
    dur_hit = max(0.9, L - ti + 0.5)
    accord = [degre(0, 0), degre(2, 0), degre(4, 0), degre(0, 1), degre(2, 1)]
    for j, m in enumerate(accord):
        poser(out, note(midi_hz(m), dur_hit, kind, sr, clarte), ti, sr, pan=(j - 2) * 0.3, gain=0.8 / (1 + 0.15 * j))
    # étincelle aiguë (scintillement) selon la clarté de l'écurie
    ns = int(0.5 * sr)
    tt = np.arange(ns) / sr
    brill = np.sin(2 * np.pi * midi_hz(racine + 48) * tt) * np.exp(-tt / 0.18) * 0.18 * clarte
    poser(out, brill, ti, sr, pan=0.2)
    pic = np.max(np.abs(out))
    return out / pic * 0.5 if pic > 0 else out


# ----------------------------------------------------------------------------------------------
# Signatures RÉELLES des écuries (V7.1) : extraits MP3 + voix enregistrées, temps fort calé sur le portail
# ----------------------------------------------------------------------------------------------
ANTICIPATION = 0.12      # s : l'extrait peut commencer jusqu'à 120 ms avant le début du créneau (il « respire »)
FONDU_ENTREE = 0.18      # s : sin(θ)
FONDU_SORTIE = 0.28      # s : cos(θ)
BASS_SWAP = 0.20         # s : passe-haut 150 Hz fondu sur la fin (aucun choc de basses avec l'écurie suivante)
HPF_SORTIE = 150.0       # Hz
WASHOUT = 0.25           # s : queue de réverbération stéréo après la fin de l'extrait
CIBLE_THEME_DB = -16.0   # dBFS RMS de la partie active de chaque couche (avant gain_db du fichier de configuration)
CHUTE = {5}              # Super Mario Pression : le temps fort est l'ATTERRISSAGE, à la fin du cri de chute


def decoder_ffmpeg(chemin, sr, debut_s=0.0, duree_s=None, filtre=None, canaux=2):
    """Décode un fichier audio (n, canaux) en float64, rééchantillonné à sr. filtre : chaîne -af facultative."""
    cmd = ['ffmpeg', '-v', 'error', '-ss', '%.3f' % max(debut_s, 0.0)]
    if duree_s is not None:
        cmd += ['-t', '%.3f' % duree_s]
    cmd += ['-i', chemin] + (['-af', filtre] if filtre else []) + ['-f', 'f32le', '-ac', str(canaux), '-ar', str(sr), '-']
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode('utf-8', 'replace')[:300])
    a = np.frombuffer(r.stdout, dtype='<f4').astype(float)
    return a.reshape(-1, canaux)


def trouver_theme(dossier, eid):
    if not os.path.isdir(dossier):
        return None
    for ext in EXT_AUDIO:
        g = sorted(glob.glob(os.path.join(dossier, '%02d_*%s' % (eid, ext))))
        if g:
            return g[0]
    return None


def enveloppe_rms(mono, sr, fen=0.05):
    w = max(1, int(fen * sr))
    return np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, 'same'))


def couche_audio(chemin, debut_s, duree_s, gain_db, sr):
    """Une couche de signature : extrait [debut_s, debut_s + duree_s] décodé AVEC jusqu'à ANTICIPATION s de matière avant
    (amorce, si le fichier en a). Mise au niveau sur le corps seul (RMS de la partie active = CIBLE_THEME_DB), puis gain_db.
    Retourne (signal (n,2), amorce en s, durée du corps en s)."""
    amorce = min(ANTICIPATION, max(debut_s, 0.0))
    seg = decoder_ffmpeg(chemin, sr, debut_s - amorce, None if duree_s is None else duree_s + amorce)
    if seg.shape[0] <= int(amorce * sr) + int(0.1 * sr):
        raise RuntimeError('extrait vide : ' + os.path.basename(chemin))
    corps = seg[int(round(amorce * sr)):].mean(axis=1)
    e = enveloppe_rms(corps, sr)
    actif = corps[e > 0.1 * (e.max() + 1e-12)]
    rms = math.sqrt(float(np.mean(actif ** 2))) if actif.size else 1.0
    g = 10 ** (CIBLE_THEME_DB / 20.0) / max(rms, 1e-6) * 10 ** (float(gain_db) / 20.0)
    return seg * g, amorce, corps.shape[0] / sr


def premier_temps_fort(mono, sr):
    """Premier vrai front d'attaque : premier instant où l'enveloppe RMS (50 ms) atteint 60 % de son maximum (comme sound_v6.py)."""
    e = enveloppe_rms(mono, sr)
    return float(np.argmax(e >= 0.6 * e.max())) / sr


def ir_stereo(sr, rt60=1.1, pre=0.008, graine=0):
    """Réponse impulsionnelle courte et sombre, deux canaux décorrélés, semée (déterministe)."""
    rng = np.random.default_rng(9000 + graine)
    n = int((rt60 + pre) * sr)
    t = np.arange(n) / sr
    env = np.where(t < pre, 0.0, np.exp(-6.91 * (t - pre) / rt60))
    l = filtre_bande(rng.standard_normal(n) * env, sr, None, 5200.0, ordre=1)
    r = filtre_bande(rng.standard_normal(n) * env, sr, None, 5200.0, ordre=1)
    return l / (np.sqrt(np.sum(l ** 2)) + 1e-9), r / (np.sqrt(np.sum(r ** 2)) + 1e-9)


def convolution(x, h):
    n = x.shape[0] + h.shape[0] - 1
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(h, m), m)[:n]


def habiller(sig, sr, fondu_entree, graine):
    """Fondu d'entrée sin(θ), bass-swap (passe-haut 150 Hz zéro-phase fondu sur la fin), fondu de sortie cos(θ),
    puis washout : queue de réverbération stéréo de WASHOUT s ajoutée APRÈS la fin. Retourne le signal (n + washout, 2)."""
    n = sig.shape[0]
    fi = max(int(0.005 * sr), min(int(fondu_entree * sr), n // 2))
    sig[:fi] *= np.sin(0.5 * np.pi * np.arange(fi) / fi)[:, None]
    nh = min(int(BASS_SWAP * sr), n // 3)
    if nh > 16:
        a0 = max(0, n - nh - int(0.06 * sr))                               # 60 ms de marge : le filtre est établi au fondu
        w = np.zeros(n - a0)
        w[-nh:] = 0.5 - 0.5 * np.cos(np.pi * np.arange(nh) / nh)
        for c in range(2):
            filtre = filtre_bande(sig[a0:, c], sr, HPF_SORTIE, None, ordre=2)
            sig[a0:, c] = sig[a0:, c] * (1 - w) + filtre * w
    fo = min(int(FONDU_SORTIE * sr), int(0.4 * n))
    if fo > 0:
        sig[-fo:] *= np.cos(0.5 * np.pi * np.arange(fo) / fo)[:, None]
    queue = sig[-int(0.45 * sr):].mean(axis=1)
    il, ir = ir_stereo(sr, graine=graine)
    nw = int(WASHOUT * sr)
    env = np.cos(0.5 * np.pi * np.arange(nw) / nw)
    wl = filtre_bande(convolution(queue, il)[queue.shape[0]:queue.shape[0] + nw], sr, HPF_SORTIE, None)
    wr = filtre_bande(convolution(queue, ir)[queue.shape[0]:queue.shape[0] + nw], sr, HPF_SORTIE, None)
    wl, wr = np.pad(wl, (0, nw - wl.shape[0])), np.pad(wr, (0, nw - wr.shape[0]))
    return np.concatenate([sig, np.stack([wl * env * 0.55, wr * env * 0.55], axis=1)])


def signature_ecurie(e, cfg, suivant, sr, dossier_v5, dossier_themes):
    """Signature réelle d'une écurie : couches superposées (extrait MP3 + voix enregistrée), temps fort calé à la milliseconde
    sur e['impact'] (franchissement du portail). Retourne (signal (n,2), t_debut_absolu, infos) ou lève RuntimeError."""
    n = e['id']
    cfg = cfg or {}
    couches, sources, eclat = [], [], None              # couche : (décalage du corps en s, signal, amorce en s)
    v = cfg.get('voix')
    if v:
        x, am, _ = couche_audio(os.path.join(dossier_v5, v['fichier']), float(v.get('debut_s', 0.0)), v.get('duree_s'), v.get('gain_db', 0), sr)
        couches.append((float(v.get('decalage_s', 0.0)), x, am))
        sources.append(v['fichier'])
        # le cri « MEEEINE ! » de Petite Mimine : eclat_s du calage, affiné sur le vrai front d'attaque de la voix
        # (premier instant où l'enveloppe atteint 60 % du maximum local dans [eclat_s − 0,15 ; eclat_s + 0,6])
        e0 = float(v.get('eclat_s', 0.0)); vm = x[int(round(am * sr)):].mean(axis=1); env = enveloppe_rms(vm, sr)
        i0, i1 = max(0, int((e0 - 0.15) * sr)), min(env.shape[0], int((e0 + 0.6) * sr))
        if i1 - i0 > int(0.05 * sr):
            w = env[i0:i1]; e0 = (i0 + int(np.argmax(w >= 0.6 * w.max()))) / sr
        eclat = float(v.get('decalage_s', 0.0)) + e0
    perso = trouver_theme(dossier_themes, n)
    if not perso:
        raise RuntimeError('extrait %02d_*.mp3 absent de %s' % (n, dossier_themes))
    pp = cfg.get('perso') or {}
    x, am, l_perso = couche_audio(perso, float(pp.get('debut_s', 0.0)), float(pp.get('duree_s', 3.0)), pp.get('gain_db', 0), sr)
    couches.append((0.0, x, am))
    sources.append('themes_ecuries/' + os.path.basename(perso))
    if n in CHUTE:
        # Super Mario Pression : la voix « chute » enregistrée doublée sous le cri du jeu, les deux fins (l'atterrissage) alignées
        fic = os.path.join(dossier_v5, 'voix', 'mario_chute_B.mp3')
        if os.path.isfile(fic):
            xm, amm, l_m = couche_audio(fic, 0.0, None, -6.0, sr)
            couches.append((max(0.0, l_perso - l_m), xm, amm))
            sources.append('voix/mario_chute_B.mp3')
    # assemblage : amorce commune PRE (s) avant le corps de la couche de référence (décalage 0)
    pre = max(0.0, max(am - d for d, _, am in couches))
    L = max(int(round((pre + d - am) * sr)) + x.shape[0] for d, x, am in couches)
    sig = np.zeros((L, 2))
    for d, x, am in couches:
        i = int(round((pre + d - am) * sr))
        sig[i:i + x.shape[0]] += x
    corps = sig[int(round(pre * sr)):].mean(axis=1)
    if eclat is None:
        if n in CHUTE:
            eclat = max(1.4, min(l_perso - 0.6, 2.2))                                  # l'atterrissage, juste avant la fin du cri
        elif pp.get('eclat_s') is not None:
            eclat = float(pp['eclat_s'])
        else:
            eclat = premier_temps_fort(corps, sr)
    # placement : le temps fort tombe exactement sur l'impact du portail
    t0 = e['impact'] - eclat - pre
    au_plus_tot = e['debut'] - (0.6 if v else ANTICIPATION)                             # une réplique enregistrée n'est pas coupée
    if t0 < au_plus_tot:
        sig = sig[int(round((au_plus_tot - t0) * sr)):]
        t0 = au_plus_tot
    au_plus_tard = e['fin'] + (0.35 if v else 0.10) if suivant else e['fin'] + 1.0
    if t0 + sig.shape[0] / sr > au_plus_tard:
        sig = sig[:int(round((au_plus_tard - t0) * sr))]
    avance = e['impact'] - t0                                                          # durée disponible avant l'éclat
    sig = habiller(sig.copy(), sr, min(FONDU_ENTREE, 0.5 * avance), n)
    pic = np.max(np.abs(sig))
    if pic > 0.95:
        sig *= 0.95 / pic
    return sig, t0, {'sources': sources, 'eclat_dans_extrait_s': round(eclat, 4), 't_debut': round(t0, 4),
                     't_eclat': round(e['impact'], 4), 't_fin': round(t0 + sig.shape[0] / sr, 4)}


# ----------------------------------------------------------------------------------------------
# Voix off du commentateur (V7.1) : prise A de la v4, découpée aux mots (mots_prise_A.json), coupes dans les silences
# ----------------------------------------------------------------------------------------------
FILTRE_VOIX = ('highpass=f=85,equalizer=f=250:t=q:w=1:g=1.8,equalizer=f=3400:t=q:w=1.1:g=2.8,'
               'acompressor=threshold=-22dB:ratio=3.2:attack=6:release=90:makeup=4,alimiter=limit=0.89:attack=3:release=40')
TEMPO_ACTE_I = 1.12      # la phrase d'ouverture (11,9 s à l'enregistrement) doit tenir dans le prologue de 11 s : +12 % de débit
# (nom, premier mot, dernier mot, attaque du premier mot dans le film (s) ou None = enchaîné, écart après la phrase précédente, prise)
PHRASES_V7 = [
    ('mesdames', 0, 2, 0.12, None, 'I'),            # Mesdames et messieurs…
    ('salon', 3, 10, None, 0.14, 'I'),              # Ce soir, le salon se transforme en ARÈNE !
    ('stats_trone', 11, 26, None, 0.16, 'I'),       # Quinze écuries, des dizaines de bolides, cinq voies, et une seule place sur le TRÔNE !
    ('caisses', 140, 161, 61.4, None, 'n'),         # Ouvrez les caisses… modèles uniques… l'un d'eux chante dans le noir…
    ('attention', 89, 95, 68.2, None, 'n'),         # Mais attention, ils ne viennent pas seuls !
    ('gotham', 96, 99, 70.3, None, 'n'),            # Des ruelles de Gotham…
    ('nuit', 100, 109, 72.1, None, 'n'),            # Je ne suis pas une voiture. Je suis la nuit.
    ('f1', 116, 128, 75.6, None, 'n'),              # Des stands de la Formule 1… Box, box, box, box… Pneus tendres, on attaque !
    ('apoca', 129, 137, 82.5, None, 'n'),           # Et des terres brûlées, des survivants de l'Apocalypse !
    ('pieges', 162, 165, 89.35, None, 'n'),         # Des pièges ! Des trahisons !
    ('paris', 166, 177, 104.0, None, 'n'),          # … et des paris en direct depuis votre téléphone… ou à l'ancienne !
    ('gloire', 178, 184, 107.9, None, 'n'),         # Et pour le vainqueur, la gloire éternelle !
    ('titre', 185, 191, 111.6, None, 'n'),          # Le Grand Prix de Noël, 23 décembre !
    ('final', 192, 199, 115.3, None, 'n'),          # Préparez-vous à vrombir, que le spectacle commence !
]


def energie_min(x, a, b, sr):
    """Instant (s) de plus faible énergie (fenêtres de 10 ms) dans [a, b] secondes."""
    h = max(2, sr // 100)
    i0, i1 = max(0, int(a * sr)), min(x.shape[0], int(b * sr))
    if i1 - i0 < 2 * h:
        return 0.5 * (a + b)
    e = np.array([np.sum(x[i:i + h] ** 2) for i in range(i0, i1 - h, h // 2)])
    return (i0 + int(np.argmin(e)) * (h // 2) + h // 2) / sr


def attaque_mot(x, t, sr, fen=0.08):
    """Début réel d'un mot : montée d'énergie la plus forte autour du minutage de la transcription."""
    h = max(2, sr // 200)
    a, b = max(0, int((t - fen) * sr)), min(x.shape[0], int((t + fen) * sr))
    e = np.array([np.sqrt(np.mean(x[i:i + h] ** 2)) for i in range(a, b - h, h)])
    if len(e) < 3:
        return t
    return (a + (int(np.argmax(np.diff(np.log(e + 1e-5)))) + 1) * h) / sr


def voix_off(dossier_v5, sr):
    """Pose les phrases de la voix off aux instants de PHRASES_V7. Retourne (piste mono (N,), intervalles parlés, rapport)."""
    mp3 = os.path.join(dossier_v5, 'voix', 'vo_v4_prise_A.mp3')
    with open(os.path.join(dossier_v5, 'voix', 'mots_prise_A.json'), encoding='utf-8') as f:
        mots = json.load(f)
    prises = {'n': (decoder_ffmpeg(mp3, sr, filtre=FILTRE_VOIX, canaux=1)[:, 0], 1.0),
              'I': (decoder_ffmpeg(mp3, sr, filtre=FILTRE_VOIX + ',atempo=%.4f' % TEMPO_ACTE_I, canaux=1)[:, 0], TEMPO_ACTE_I)}
    N = int(DUREE * sr)
    piste = np.zeros(N)
    intervalles, rapport, fin_prec = [], [], None
    for nom, i0, i1, t_att, ecart, prise in PHRASES_V7:
        x, k = prises[prise]
        s = lambda j: mots[j]['s'] / k
        en = lambda j: mots[j]['e'] / k
        a0 = attaque_mot(x, s(i0), sr)
        # coupes dans le silence : avant le premier mot (après la fin du mot précédent), après le dernier mot (avant le suivant)
        c0 = energie_min(x, max(en(i0 - 1) + 0.02 if i0 > 0 else 0.0, a0 - 0.35), a0 - 0.03, sr) if i0 > 0 else max(0.0, a0 - 0.07)
        suiv = s(i1 + 1) if i1 + 1 < len(mots) else x.shape[0] / sr
        c1 = energie_min(x, en(i1) + 0.02, max(en(i1) + 0.06, min(suiv - 0.03, en(i1) + 0.40)), sr)
        if t_att is None:
            t_att = fin_prec + ecart
        t_deb = t_att - (a0 - c0)
        seg = x[int(c0 * sr):int(c1 * sr)].copy()
        nf = min(int(0.035 * sr), seg.shape[0] // 4)
        seg[:nf] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(nf) / nf)
        seg[-nf:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nf) / nf)
        i = int(round(t_deb * sr))
        piste[i:i + seg.shape[0]] += seg[:max(0, N - i)]
        fin_mot = t_att + (en(i1) - a0)
        intervalles.append((t_att, fin_mot))
        rapport.append({'phrase': nom, 'texte': ' '.join(m['w'] for m in mots[i0:i1 + 1]), 'attaque': round(t_att, 3),
                        'fin_dernier_mot': round(fin_mot, 3), 'debit': k})
        fin_prec = fin_mot
    for a, b in zip(intervalles, intervalles[1:]):
        assert b[0] > a[1], 'phrases de voix off qui se chevauchent : %s' % ((a, b),)
    assert intervalles[-1][1] < 119.35, 'la dernière phrase doit finir avant le fondu final (119,35 s)'
    return piste, intervalles, rapport


# ----------------------------------------------------------------------------------------------
# Macro portail DSP
# ----------------------------------------------------------------------------------------------
def macro_portail(buf, e, k, total, plan, sr):
    """Riser -> craquement -> sub-drop -> crissement. k : rang 0..14. Retourne la ligne de timeline."""
    p = k / max(total - 1, 1)                          # 0 -> 1 au fil des vagues
    rng = np.random.default_rng(52000 + e['id'])
    dA = e['impact'] - e['debut']
    t_imp = e['impact']
    d_riser = dA * (0.62 - 0.08 * p)                   # ~60 % de la phase A, un peu plus nerveux ensuite
    t_ris = t_imp - d_riser
    n = int(d_riser * sr)
    tr = np.arange(n) / sr
    x = (tr / d_riser)
    # riser spectral : bruit dont la coupure monte (300 Hz -> 11 kHz, exponentielle), élargissement stéréo
    a, b = bruit(rng, n), bruit(rng, n)
    f_haut = lambda t: 300.0 * (11000.0 / 300.0) ** min(max(t / d_riser, 0.0), 1.0)
    f_bas = lambda t: 80.0 + 1500.0 * min(max(t / d_riser, 0.0), 1.0) ** 2
    a = filtre_variable(a, sr, f_haut, f_bas)
    b = filtre_variable(b, sr, f_haut, f_bas)
    w = x ** 1.2
    L = (a + w * b) / np.sqrt(1 + w ** 2)
    R = (a - w * b) / np.sqrt(1 + w ** 2)
    pr = np.max(np.abs(np.concatenate([L, R]))) + 1e-9
    amp = (x ** 2.2) * fenetre(n, 0.02, 0.012, sr)
    ris = np.stack([L / pr * amp, R / pr * amp], axis=1) * (0.55 + 0.25 * p)
    # tonale montante discrète (quinte + octave) pour donner une hauteur de tension
    fb = midi_hz(45 + (e['id'] * 7) % 12) * 2.0 ** (2.5 * x)
    ton = np.sin(phase_continue(fb, sr)) * (x ** 3) * 0.12
    ris[:, 0] += ton
    ris[:, 1] += ton
    poser(buf, ris, t_ris, sr)
    # craquement dimensionnel : impulsion large bande + claquement aigu
    nc = int(0.45 * sr)
    tc = np.arange(nc) / sr
    imp = bruit(rng, nc) * np.exp(-tc / 0.018)
    claq = filtre_bande(bruit(rng, nc), sr, 3500.0, 11000.0) * np.exp(-tc / 0.045)
    queue = filtre_bande(bruit(rng, nc), sr, 200.0, 5000.0) * np.exp(-tc / 0.16) * 0.35
    cr = (imp * 0.9 + claq * 1.2 + queue) * (1.0 - np.exp(-tc / 0.0006))
    cr = cr / (np.max(np.abs(cr)) + 1e-9) * (0.8 + 0.2 * p)
    poser(buf, np.stack([cr, np.roll(cr, int(0.0007 * sr))], axis=1), t_imp, sr)
    # sub-drop à phase continue 105 -> 32 Hz, plus court et sec avec la progression
    d_drop = 1.15 - 0.5 * p
    nd = int(d_drop * sr)
    td = np.arange(nd) / sr
    fd = 32.0 + (105.0 - 32.0) * np.exp(-td / (0.16 * d_drop / 0.65))
    env = (1.0 - np.exp(-td / 0.004)) * np.exp(-td / (0.42 * d_drop))
    sub = np.sin(phase_continue(fd, sr)) * env * fenetre(nd, 0.0, 0.05, sr)
    poser(buf, sub, t_imp, sr, gain=1.1)
    # crissement de pneus de réception 0,25 s après l'impact, ~0,9 s
    d_cr = 0.9
    ncr = int(d_cr * sr)
    tcr = np.arange(ncr) / sr
    ba = filtre_bande(bruit(rng, ncr), sr, 1500.0, 5000.0)
    bb = filtre_bande(bruit(rng, ncr), sr, 1500.0, 5000.0)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * (24.0 + 10.0 * np.sin(2 * np.pi * 1.7 * tcr) + 12 * p) * tcr
                               + rng.uniform(0, 6.28)) ** 2
    pente = np.sin(np.pi * np.clip(tcr / d_cr, 0, 1)) ** 0.6 * np.exp(-tcr / 0.9)
    cris = np.stack([ba, bb], axis=1) * (mod * pente)[:, None]
    cris = cris / (np.max(np.abs(cris)) + 1e-9) * (0.38 + 0.1 * p) * fenetre(ncr, 0.03, 0.2, sr)[:, None]
    # panoramique de réception qui glisse de la droite vers la gauche (alterne selon l'écurie)
    pan = np.linspace(0.6, -0.6, ncr) * (1 if e['id'] % 2 else -1)
    cris[:, 0] *= np.sqrt(0.5 * (1 - pan))
    cris[:, 1] *= np.sqrt(0.5 * (1 + pan))
    t_cris = t_imp + 0.25
    poser(buf, cris, t_cris, sr)
    return {'ecurie': e['id'], 't_riser_debut': round(t_ris, 4), 't_impact': round(t_imp, 4),
            't_drop_fin': round(t_imp + d_drop, 4), 't_crissement': round(t_cris, 4)}


# ----------------------------------------------------------------------------------------------
# Lit de basses / pouls cardiaque en accelerando
# ----------------------------------------------------------------------------------------------
def lit_de_basses(plan, N, sr):
    """Grosses caisses (55 Hz) calées sur la courbe tempo, phase intégrée (aucune dérive). Retourne (buf, battements, bpm)."""
    tx = np.array([p[0] for p in plan['tempo']], dtype=float)
    ty = np.array([p[1] for p in plan['tempo']], dtype=float)
    tt = np.arange(N) / sr
    bpm = np.interp(tt, tx, ty)
    phase = np.concatenate([[0.0], np.cumsum(bpm[:-1] / 60.0 / sr)])      # battements écoulés
    nb = int(np.floor(phase[-1])) + 1
    temps = np.interp(np.arange(nb, dtype=float), phase, tt)
    temps = temps[temps < DUREE - 0.05]
    intens = np.interp(tt, [0, 11, 53, 89, 107, 120], [0.45, 0.55, 0.75, 0.9, 1.0, 1.0])
    buf = np.zeros((N, 2))
    nk = int(0.5 * sr)
    t = np.arange(nk) / sr
    fk = 55.0 + 75.0 * np.exp(-t / 0.022)
    kick_pur = np.sin(phase_continue(fk, sr)) * (1 - np.exp(-t / 0.0015)) * np.exp(-t / 0.12)
    clic = np.sin(2 * np.pi * 150.0 * t) * np.exp(-t / 0.006) * 0.35
    kick = (kick_pur + clic) * fenetre(nk, 0.0, 0.08, sr)
    dub = kick[:int(0.3 * sr)] * fenetre(int(0.3 * sr), 0.0, 0.06, sr)
    for i, tb in enumerate(temps):
        accent = 1.35 if i % 4 == 0 else 1.0                              # temps 1 de la mesure
        g = accent * float(np.interp(tb, tt, intens))
        poser(buf, kick, tb, sr, gain=g)
        if tb < 11.0:                                                      # prologue : « lub-dub » cardiaque
            poser(buf, dub, tb + 0.17, sr, gain=0.45 * g)
    # nappe sub continue (55 Hz -> 58,3 Hz), à phase continue, qui enfle vers l'acte VI
    fr = 55.0 * 2.0 ** (np.interp(tt, [0, 107, 120], [0, 1, 1]) / 12.0 * 1.0)
    amp = np.interp(tt, [0, 11, 53, 89, 107, 120], [0.05, 0.08, 0.12, 0.16, 0.22, 0.22])
    nappe = (np.sin(phase_continue(fr, sr)) + 0.4 * np.sin(phase_continue(2 * fr * 1.002, sr))) * amp
    buf[:, 0] += nappe
    buf[:, 1] += nappe
    bpm_s = [round(float(np.interp(s, tx, ty)), 3) for s in range(int(DUREE) + 1)]
    return buf, [round(float(x), 4) for x in temps], bpm_s


# ----------------------------------------------------------------------------------------------
# Habillage des actes
# ----------------------------------------------------------------------------------------------
def whoosh(buf, t_pic, sr, long=1.7, gain=0.6, seed=0, sens=1):
    """Whoosh de passage d'acte : bruit à bande balayée, pic à t_pic, panoramique qui traverse l'image."""
    rng = np.random.default_rng(seed)
    n = int(long * sr)
    t = np.arange(n) / sr
    c = 0.62 * long
    f_c = lambda tt: 350.0 * (7000.0 / 350.0) ** np.exp(-((tt - c) / (0.28 * long)) ** 2)
    x = filtre_variable(bruit(rng, n), sr, lambda tt: float(f_c(tt)) * 1.8, lambda tt: float(f_c(tt)) * 0.35)
    env = np.sin(np.pi * np.clip(t / long, 0, 1)) ** 2
    env = np.interp(t, [0, c, long], [0, 1, 0]) ** 1.5 * fenetre(n, 0.02, 0.05, sr)
    x = x / (np.max(np.abs(x)) + 1e-9) * env
    pan = np.linspace(-0.8, 0.8, n) * sens
    sig = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], axis=1)
    poser(buf, sig, t_pic - c, sr, gain=gain)


def tonnerre_pluie(buf, d, f, sr):
    rng = np.random.default_rng(61000)
    n = int((f - d) * sr)
    t = np.arange(n) / sr
    # pluie sourde : bruit passe-bande 500-3500 Hz modulé de gouttes lentes
    pl = filtre_bande(bruit(rng, n), sr, 500.0, 3500.0)
    mod = 0.75 + 0.25 * filtre_bande(bruit(rng, n), sr, 6.0, 30.0) / 0.5
    pl = pl / (np.max(np.abs(pl)) + 1e-9) * np.clip(mod, 0.3, 1.2) * fenetre(n, 0.9, 0.9, sr) * 0.22
    poser(buf, np.stack([pl, np.roll(pl, 37)], axis=1), d, sr)
    # tonnerre : claquement + grondement qui roule
    for tt0, g in ((d + 1.2, 1.0), (d + 3.4, 0.8), (d + 5.0, 0.55)):
        nn = int(2.8 * sr)
        tn = np.arange(nn) / sr
        gr = filtre_bande(bruit(rng, nn), sr, 25.0, 190.0)
        roule = np.exp(-tn / 0.9) * (0.65 + 0.35 * np.sin(2 * np.pi * 3.1 * tn + rng.uniform(0, 6))) ** 2
        gr = gr / (np.max(np.abs(gr)) + 1e-9) * roule * (1 - np.exp(-tn / 0.03))
        ck = filtre_bande(bruit(rng, nn), sr, 700.0, 5000.0) * np.exp(-tn / 0.07) * (1 - np.exp(-tn / 0.001))
        ck = ck / (np.max(np.abs(ck)) + 1e-9) * 0.5
        s = (gr * 0.9 + ck) * fenetre(nn, 0.0, 0.5, sr)
        poser(buf, s, tt0, sr, pan=float(rng.uniform(-0.5, 0.5)), gain=g * 0.9)


def moteur_f1(buf, d, f, sr):
    """Montée aiguë de moteur F1 : scie à phase continue, 3 rapports (la fréquence retombe puis remonte)."""
    rng = np.random.default_rng(62000)
    n = int((f - d) * sr)
    t = np.arange(n) / sr
    D = f - d
    bornes = [0.0, 0.34 * D, 0.67 * D, D]
    plage = [(160.0, 560.0), (330.0, 760.0), (460.0, 1150.0)]
    fr = np.zeros(n)
    for (a, b), (fa, fb) in zip(zip(bornes[:-1], bornes[1:]), plage):
        m = (t >= a) & (t <= b)
        u = (t[m] - a) / (b - a)
        fr[m] = fa * (fb / fa) ** (u ** 0.8)
    fr *= 1.0 + 0.004 * np.sin(2 * np.pi * 7.0 * t)
    ph = phase_continue(fr, sr)
    x = np.zeros(n)
    for h in range(1, 14):
        masque = (fr * h < 0.45 * sr).astype(float)
        x += np.sin(h * ph) / h ** 0.9 * masque
    x += 0.25 * filtre_bande(bruit(rng, n), sr, 1200.0, 6000.0)       # souffle d'échappement
    env = np.interp(t, [0, 0.1 * D, D], [0.25, 0.55, 1.0]) * fenetre(n, 0.5, 0.45, sr)
    x = x / (np.max(np.abs(x)) + 1e-9) * env * 0.5
    pan = np.linspace(-0.7, 0.7, n)
    sig = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], axis=1)
    poser(buf, sig, d, sr)


def apocalypse(buf, d, f, sr):
    """Grondement grave + métal tordu (partiels inharmoniques à glissando descendant, FM, modulation en anneau)."""
    rng = np.random.default_rng(63000)
    n = int((f - d) * sr)
    t = np.arange(n) / sr
    gr = filtre_bande(bruit(rng, n), sr, 18.0, 95.0)
    gr = gr / (np.max(np.abs(gr)) + 1e-9)
    gr *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t) ** 2
    ton = np.sin(2 * np.pi * 36.0 * t) + np.sin(2 * np.pi * 38.5 * t)
    base = (gr * 0.8 + ton * 0.25) * fenetre(n, 0.8, 0.5, sr)
    poser(buf, np.stack([base, np.roll(base, 23)], axis=1), d, sr, gain=1.0)
    ratios = [1.0, 2.76, 5.40, 8.93, 11.34]
    for tk, f0, dur in ((d + 1.1, 1700.0, 1.5), (d + 3.3, 1300.0, 1.3), (d + 5.0, 2100.0, 1.7)):
        nm = int(dur * sr)
        tm = np.arange(nm) / sr
        fm = f0 * 0.22 ** (tm / dur * 0.8) * (1 + 0.03 * np.sin(2 * np.pi * 9.0 * tm))   # glissando descendant tordu
        ph = phase_continue(fm, sr)
        x = np.zeros(nm)
        for j, r in enumerate(ratios):
            x += np.sin(r * ph + 3.0 * np.sin(0.37 * r * ph)) / (1 + j)
        x *= np.sin(2 * np.pi * 61.0 * tm) * 0.6 + 0.4                                    # modulation en anneau
        x += 0.3 * filtre_bande(bruit(rng, nm), sr, 2500.0, 9000.0) * np.exp(-tm / 0.25)
        x = x / (np.max(np.abs(x)) + 1e-9) * np.exp(-tm / (0.45 * dur)) * fenetre(nm, 0.01, 0.25, sr)
        poser(buf, x, tk, sr, pan=float(rng.uniform(-0.7, 0.7)), gain=0.38)


def clics_mecaniques(buf, t0, sr):
    """Rafale de 10 clics secs, espacés de façon irrégulière mais déterministe (acte V)."""
    rng = np.random.default_rng(64000)
    t = t0
    for i in range(10):
        nc = int(0.09 * sr)
        tc = np.arange(nc) / sr
        f0 = float(rng.uniform(1800, 3200))
        x = (bruit(rng, nc) * np.exp(-tc / 0.0012) * 0.8 + np.sin(2 * np.pi * f0 * tc) * np.exp(-tc / 0.012)
             + np.sin(2 * np.pi * 180.0 * tc) * np.exp(-tc / 0.02) * 0.6)
        x = x / (np.max(np.abs(x)) + 1e-9) * (1 - np.exp(-tc / 0.0002)) * fenetre(nc, 0.0, 0.015, sr)
        poser(buf, x, t, sr, pan=float(rng.uniform(-0.8, 0.8)), gain=0.55)
        t += float(rng.uniform(0.26, 0.46))
    return t


def finale(buf, plan, sr):
    """Acte VI : riser vers 111 s, sub-boom « Faites vos jeux » à t = 111 s, accord final plein."""
    rng = np.random.default_rng(65000)
    t_boom = 111.0
    # riser 106 -> 111
    d_r = 4.6
    n = int(d_r * sr)
    x = np.arange(n) / sr / d_r
    a, b = bruit(rng, n), bruit(rng, n)
    fh = lambda t: 400.0 * (12000.0 / 400.0) ** min(max(t / d_r, 0.0), 1.0)
    fl = lambda t: 100.0 + 2000.0 * min(max(t / d_r, 0.0), 1.0) ** 2
    a, b = filtre_variable(a, sr, fh, fl), filtre_variable(b, sr, fh, fl)
    w = x
    L, R = (a + w * b) / np.sqrt(1 + w ** 2), (a - w * b) / np.sqrt(1 + w ** 2)
    pr = np.max(np.abs(np.concatenate([L, R]))) + 1e-9
    env = x ** 2.5 * fenetre(n, 0.05, 0.02, sr)
    poser(buf, np.stack([L / pr * env, R / pr * env], axis=1), t_boom - d_r, sr, gain=0.6)
    # silence de tension 0,12 s avant le boom (creux d'enveloppe obtenu par fondu du riser ci-dessus), puis boom
    nb = int(3.0 * sr)
    t = np.arange(nb) / sr
    fb = 27.0 + 38.0 * np.exp(-t / 0.35)
    sub = np.sin(phase_continue(fb, sr)) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.9)
    souffle = filtre_bande(bruit(rng, nb), sr, 40.0, 700.0) * np.exp(-t / 0.35) * (1 - np.exp(-t / 0.002))
    cr = filtre_bande(bruit(rng, nb), sr, 2500.0, 12000.0) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.0006))
    boom = sub * 1.3 + souffle / (np.max(np.abs(souffle)) + 1e-9) * 0.5 + cr / (np.max(np.abs(cr)) + 1e-9) * 0.35
    boom = boom * fenetre(nb, 0.0, 0.6, sr)
    poser(buf, boom, t_boom, sr, gain=1.0)
    # accord final plein : La majeur ouvert, voix désaccordées pour la largeur stéréo
    t_deb, t_fin = 114.0, DUREE
    nc = int((t_fin - t_deb) * sr)
    tc = np.arange(nc) / sr
    D = t_fin - t_deb
    notes = [(33, 1.0), (40, 0.8), (45, 0.8), (52, 0.6), (57, 0.55), (61, 0.5), (64, 0.45), (69, 0.4), (76, 0.22)]
    sig = np.zeros((nc, 2))
    for i, (m, g) in enumerate(notes):
        f0 = midi_hz(m)
        for k, (det, cote) in enumerate(((0.9975, 0), (1.0, 2), (1.0028, 1))):
            h = np.zeros(nc)
            for hh in range(1, 9):
                if f0 * hh < 0.45 * sr:
                    h += np.sin(2 * np.pi * f0 * det * hh * tc + 0.7 * i + k) / hh ** (1.1 if m > 50 else 0.8)
            if cote == 0:
                sig[:, 0] += h * g
            elif cote == 1:
                sig[:, 1] += h * g
            else:
                sig[:, 0] += h * g * 0.5
                sig[:, 1] += h * g * 0.5
    env = np.interp(tc, [0, 0.35 * D, 0.85 * D, D], [0.0, 0.8, 1.0, 0.0]) ** 1.3
    env = env * fenetre(nc, 0.3, 0.9, sr)
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * env[:, None]
    poser(buf, sig, t_deb, sr, gain=0.9)
    # frappe d'attaque de l'accord (cymbale / crash de bruit) à 115 s
    nz = int(2.2 * sr)
    tz = np.arange(nz) / sr
    cz = filtre_bande(bruit(rng, nz), sr, 3000.0, 14000.0) * np.exp(-tz / 0.7) * (1 - np.exp(-tz / 0.002))
    poser(buf, cz / (np.max(np.abs(cz)) + 1e-9) * fenetre(nz, 0.0, 0.5, sr), 115.0, sr, gain=0.28)


# ----------------------------------------------------------------------------------------------
# Sidechain doux sur le lit de basses
# ----------------------------------------------------------------------------------------------
def intervalles_voix(plan):
    out = []
    for it in plan.get('voix') or []:
        if isinstance(it, dict):
            a, b = float(it.get('debut', it.get('t0', 0))), float(it.get('fin', it.get('t1', 0)))
        else:
            a, b = float(it[0]), float(it[1])
        if b > a:
            out.append((a, b))
    return out


def courbe_sidechain(intervalles, N, sr, reduction_db=-6.0, att=0.040, rel=0.420, maintien=0.250, anticipation=0.040):
    """Gain linéaire par échantillon, sidechain doux asymétrique sous la voix : reduction_db pendant chaque intervalle,
    anticipé de 40 ms, MAINTENU 250 ms après chaque mot (aucune remontée dans les respirations), attaque 40 ms / relâchement 420 ms."""
    if not intervalles:
        return np.ones(N)
    fc = 1000.0
    nc = int(math.ceil(N / sr * fc)) + 2
    cible = np.ones(nc)
    for a, b in intervalles:
        cible[max(0, int((a - anticipation) * fc)):int((b + maintien) * fc) + 1] = 10 ** (reduction_db / 20.0)
    ca, cr = math.exp(-1.0 / (att * fc)), math.exp(-1.0 / (rel * fc))
    g = np.ones(nc)
    cur = 1.0
    for i in range(nc):
        c = ca if cible[i] < cur else cr
        cur = c * cur + (1 - c) * cible[i]
        g[i] = cur
    return np.interp(np.arange(N) / sr, np.arange(nc) / fc, g)


# ----------------------------------------------------------------------------------------------
# Programme principal
# ----------------------------------------------------------------------------------------------
def ecrire_wav(chemin, sig, sr):
    os.makedirs(os.path.dirname(os.path.abspath(chemin)), exist_ok=True)
    pcm = np.round(np.clip(sig, -1.0, 1.0) * 32767.0).astype('<i2')
    with wave.open(chemin, 'wb') as w:
        w.setnchannels(sig.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return pcm


def a_jour(args):
    """Vrai si audio/mix_v7.wav et data/timeline_v7.json sont plus récents que ce script et le plan, avec toutes les écuries
    réelles disponibles (autant que de NN_*.mp3 présents) et la voix off."""
    wav, tl = os.path.join(ICI, 'audio', 'mix_v7.wav'), os.path.join(ICI, 'data', 'timeline_v7.json')
    if not (os.path.isfile(wav) and os.path.isfile(tl)):
        return False
    ref = max(os.path.getmtime(os.path.abspath(__file__)), os.path.getmtime(args.plan))
    if min(os.path.getmtime(wav), os.path.getmtime(tl)) < ref:
        return False
    try:
        bilan = json.load(open(tl, encoding='utf-8')).get('bilan') or {}
    except (OSError, ValueError):
        return False
    dispo = sum(1 for n in range(1, 16) if trouver_theme(args.dossier_themes, n))
    return bilan.get('ecuries_reelles', 0) >= dispo and bilan.get('phrases_voix_off', 0) > 0


def main():
    ap = argparse.ArgumentParser(description='Bande-son V7 « Multivers -> Ring » (120 s).')
    ap.add_argument('--rapide', action='store_true', help='rend à 22,05 kHz mono pour test')
    ap.add_argument('--sortie', default=None, help='chemin du WAV (défaut : audio/mix_v7.wav)')
    ap.add_argument('--sans-reel', action='store_true', help='ignore les extraits MP3 même s\'ils existent')
    ap.add_argument('--sans-voix', action='store_true', help='mix sans la voix off du commentateur')
    ap.add_argument('--plan', default=os.path.join(ICI, 'data', 'plan_v7.json'))
    ap.add_argument('--dossier-themes', default=os.path.join(ICI, '..', 'audio_v5', 'themes_ecuries'),
                    help='dossier des extraits NN_*.mp3 (défaut : ../audio_v5/themes_ecuries)')
    ap.add_argument('--si-perime', action='store_true',
                    help='ne recalcule que si le mix manque, est plus ancien que ce script ou le plan, ou a été fait sans les vrais extraits')
    args = ap.parse_args()
    if args.si_perime and not args.rapide and not args.sortie and a_jour(args):
        print('Mix V7 à jour (écuries réelles et voix off) : audio/mix_v7.wav')
        return 0

    t_calc = time.time()
    sr = 22050 if args.rapide else 44100
    N = int(DUREE * sr)
    plan = charger_plan(args.plan)
    assert abs(float(plan.get('duree', DUREE)) - DUREE) < 1e-6, 'le plan doit durer 120 s'

    # équipes (nom, couleurs) et thèmes réels
    with open(os.path.join(RACINE_DEPOT, 'data', 'teams.json'), encoding='utf-8') as f:
        equipes = {int(t['id']): t for t in json.load(f)}
    noms = {i: t['name'] for i, t in equipes.items()}
    cfg_themes = {}
    chemin_th = os.path.join(ICI, '..', 'audio_v5', 'themes_ecuries.json')
    if os.path.isfile(chemin_th):
        with open(chemin_th, encoding='utf-8') as f:
            cfg_themes = json.load(f).get('ecuries', {})

    ecuries, t_fin_ring = deriver_ecuries(plan, noms)
    acte2 = next(a for a in plan['actes'] if a['id'] == 'II')
    assert abs(t_fin_ring - acte2['fin']) < 1e-6, 'incohérence : fin de l\'acte II = %.4f' % t_fin_ring

    # --- bus de mixage
    bus_bed = np.zeros((N, 2))
    bus_theme = np.zeros((N, 2))
    bus_macro = np.zeros((N, 2))
    bus_hab = np.zeros((N, 2))

    # 3. lit de basses
    bed, battements, bpm_s = lit_de_basses(plan, N, sr)
    bus_bed += bed

    # 1. signatures RÉELLES des écuries (extrait MP3 + voix enregistrées, temps fort sur le portail), sinon stinger de travail
    #    + 2. macros portail
    macros = []
    dossier_v5 = os.path.abspath(os.path.join(ICI, '..', 'audio_v5'))
    for k, e in enumerate(ecuries):
        source, decalage = 'synthese', None
        if not args.sans_reel:
            try:
                sig, t0, infos = signature_ecurie(e, cfg_themes.get(str(e['id'])), ecuries[k + 1] if k + 1 < len(ecuries) else None,
                                                  sr, dossier_v5, args.dossier_themes)
                poser(bus_theme, sig, t0, sr)
                source, decalage = 'reel', t0 - e['debut']
                e['signature'] = infos
            except Exception as ex:                       # extrait absent ou illisible : on retombe sur la synthèse
                print('  [avertissement] écurie %d : signature réelle impossible (%s) -> synthèse' % (e['id'], ex))
        if source == 'synthese':
            st = stinger_synthese(e, equipes[e['id']]['colors'], sr, e['fin'] - e['debut'])
            poser(bus_theme, st, e['debut'], sr, gain=0.8)
            decalage = 0.0
        e['source'] = source
        e['decalage_theme_s'] = round(float(decalage), 4)
        macros.append(macro_portail(bus_macro, e, k, len(ecuries), plan, sr))

    # 1 bis. voix off du commentateur (prise A, découpée aux mots) sur les actes I, III, IV, V et VI
    bus_voix = np.zeros((N, 2))
    iv_voix, rapport_voix = [], []
    if not args.sans_voix:
        try:
            vo, iv_voix, rapport_voix = voix_off(dossier_v5, sr)
            bus_voix[:, 0] += vo
            bus_voix[:, 1] += vo
        except Exception as ex:
            print('  [avertissement] voix off impossible (%s) : mix sans commentateur' % ex)

    # 4. habillage des actes
    actes = {a['id']: a for a in plan['actes']}
    for i, aid in enumerate(('II', 'III', 'IV', 'V', 'VI')):
        whoosh(bus_hab, actes[aid]['debut'], sr, long=1.7, gain=0.35 if aid == 'II' else 0.62,
               seed=8000 + i, sens=1 if i % 2 == 0 else -1)
    boss = {b['id']: b for b in plan['univers_boss']}
    if 'gotham' in boss:
        tonnerre_pluie(bus_hab, boss['gotham']['debut'], boss['gotham']['fin'], sr)
    if 'f1' in boss:
        moteur_f1(bus_hab, boss['f1']['debut'], boss['f1']['fin'], sr)
    if 'apoca' in boss:
        apocalypse(bus_hab, boss['apoca']['debut'], boss['apoca']['fin'], sr)
    clics_mecaniques(bus_hab, actes['V']['debut'] + 2.0, sr)
    finale(bus_hab, plan, sr)

    # 5. sidechain doux asymétrique sous la voix off : lit musical, habillage et macros -8 dB
    iv = intervalles_voix(plan) + list(iv_voix)
    bus_bed *= courbe_sidechain(iv, N, sr, reduction_db=-8.0)[:, None]
    sc_fx = courbe_sidechain(iv, N, sr, reduction_db=-8.0)[:, None]
    bus_hab *= sc_fx
    bus_macro *= sc_fx

    reste = bus_bed * 0.85 + bus_theme * 0.8 + bus_macro * 0.9 + bus_hab * 0.8
    mix = reste + bus_voix * GAIN_VOIX
    # intelligibilité : écart (dB) entre la voix et tout le reste du mix pendant chaque phrase (visé : ≥ +8 dB)
    rms_db = lambda b, a, z: 20 * math.log10(math.sqrt(float(np.mean(b[int(a * sr):int(z * sr)] ** 2))) + 1e-9)
    for r in rapport_voix:
        r['voix_sur_mix_db'] = round(rms_db(bus_voix * GAIN_VOIX, r['attaque'], r['fin_dernier_mot']) - rms_db(reste, r['attaque'], r['fin_dernier_mot']), 1)
    mix *= fenetre(N, 0.02, 0.0, sr)[:, None]            # départ et fin à zéro : aucune coupure sèche
    mix[-int(0.05 * sr):] *= np.cos(0.5 * np.pi * np.linspace(0, 1, int(0.05 * sr)))[:, None]

    if args.rapide:
        mix = mix.mean(axis=1, keepdims=True)

    # Normalisation : gain recherché (dichotomie) pour que le signal APRÈS limiteur tanh vise -16 LUFS ;
    # le tanh borne la crête sous le plafond (-2 dBFS, avec marge pour l'arrondi 16 bit).
    plafond = 10 ** ((PLAFOND_DBFS - 0.15) / 20.0)
    lo, hi = -40.0, 30.0
    for _ in range(18):
        mid = 0.5 * (lo + hi)
        l = lufs_approx(limiteur_doux(mix * 10 ** (mid / 20.0), plafond), sr)
        if l < CIBLE_LUFS:
            lo = mid
        else:
            hi = mid
    gain_db = 0.5 * (lo + hi)
    final = limiteur_doux(mix * 10 ** (gain_db / 20.0), plafond)
    assert np.all(np.isfinite(final)), 'NaN/Inf dans le mix'

    # sortie
    if args.sortie:
        wav = os.path.abspath(args.sortie)
    else:
        wav = os.path.join(ICI, 'audio', 'mix_v7_rapide.wav' if args.rapide else 'mix_v7.wav')
    pcm = ecrire_wav(wav, final, sr)
    relu = pcm.astype(float) / 32768.0
    lufs_mesure = lufs_approx(relu, sr)
    crete = 20 * math.log10(max(float(np.max(np.abs(relu))), 1e-9))
    saut = float(np.max(np.abs(np.diff(relu, axis=0))))

    # 6. timeline
    timeline = {
        'version': 'v7',
        'duree': DUREE,
        'fps': plan.get('fps', 60),
        'actes': plan['actes'],
        'ecuries': ecuries,
        'battements': battements,
        'bpm_instantane': bpm_s,
        'bpm_pas_s': 1,
        'macros_portail': macros,
        'univers_boss': plan['univers_boss'],
        'voix': [[round(a, 3), round(b, 3)] for a, b in iv],
        'voix_off': rapport_voix,
        'mix': {'fichier': os.path.relpath(wav, ICI).replace(os.sep, '/') if wav.startswith(ICI) else wav,
                'frequence_hz': sr, 'canaux': int(final.shape[1]),
                'lufs_approx': round(lufs_mesure, 2), 'crete_dbfs': round(crete, 2),
                'methode_lufs': 'pondération K approchée par FFT (passe-haut 38 Hz + étagère +4 dB à 1,7 kHz), '
                                'blocs 400 ms, portes -70 LUFS / -10 LU',
                'saut_max_echantillon': round(saut, 5)},
    }
    chemin_tl = os.path.join(ICI, 'data', 'timeline_v7_rapide.json' if args.rapide else 'timeline_v7.json')
    os.makedirs(os.path.dirname(chemin_tl), exist_ok=True)
    with open(chemin_tl, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)

    nb_reel = sum(1 for e in ecuries if e['source'] == 'reel')
    timeline['bilan'] = {'ecuries_reelles': nb_reel, 'ecuries_synthetisees': len(ecuries) - nb_reel, 'phrases_voix_off': len(rapport_voix)}
    with open(chemin_tl, 'w', encoding='utf-8') as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)
    print('Mix V7 : %s' % wav)
    print('  durée %.3f s | %d Hz | %d canal(aux) | NaN : aucun' % (final.shape[0] / sr, sr, final.shape[1]))
    print('  LUFS approx %.2f | crête %.2f dBFS | saut max entre échantillons %.4f' % (lufs_mesure, crete, saut))
    print('  écuries : %d réelles, %d synthétisées | voix off : %d phrases | %d battements | timeline : %s' %
          (nb_reel, len(ecuries) - nb_reel, len(rapport_voix), len(battements), chemin_tl))
    for e in ecuries:
        s = e.get('signature')
        print('   %2d %-30s %s' % (e['id'], e['nom'][:30], ('éclat %.3f s = impact | ' % s['t_eclat'] + ' + '.join(s['sources'])) if s else 'SYNTHÈSE'))
    for r in rapport_voix:
        print('   voix %-12s %7.2f -> %7.2f s  %+5.1f dB  « %s »' % (r['phrase'], r['attaque'], r['fin_dernier_mot'], r['voix_sur_mix_db'], r['texte'][:60]))
    print('  calcul : %.1f s' % (time.time() - t_calc))


if __name__ == '__main__':
    sys.exit(main())
