#!/usr/bin/env python3
"""Grand Prix de Noël — intro catch : sound design procédural + mix.
Tout est synthétisé (aucun échantillon externe, aucun rip) et calé sur les
temps de la voix off (timeline.json). Sortie : build/audio/mix.wav (48 kHz stéréo).
"""
import json, subprocess, sys, os
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = T['DUR']
N = int(DUR * SR)
rng = np.random.default_rng(2312)

# ---------------------------------------------------------------- utilitaires
def tt(d):
    return np.arange(int(d * SR)) / SR

def exp_env(d, tau, attack=0.002):
    t = tt(d)
    e = np.exp(-t / tau)
    a = np.minimum(1, t / max(attack, 1e-4))
    return e * a

def bp(x, lo, hi, order=2):
    lo = max(lo, 20); hi = min(hi, SR / 2 - 100)
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def lp(x, f, order=2):
    sos = signal.butter(order, min(f, SR / 2 - 100), 'lowpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def hp(x, f, order=2):
    sos = signal.butter(order, f, 'highpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def noise(d):
    return rng.standard_normal(int(d * SR))

def pink(d):
    x = noise(d)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, x) * 6

class Bus:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, x, t0, gain=1.0, pan=0.0):
        """x mono ; pan -1..1"""
        if t0 < 0:
            x = x[int(-t0 * SR):]; t0 = 0
        i = int(t0 * SR)
        if i >= N: return
        x = x[:N - i]
        gl = gain * np.cos((pan + 1) * np.pi / 4)
        gr = gain * np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(x)] += x * gl
        self.R[i:i + len(x)] += x * gr
    def add_st(self, l, r, t0, gain=1.0):
        i = int(t0 * SR)
        if i >= N: return
        n = min(len(l), N - i)
        self.L[i:i + n] += l[:n] * gain
        self.R[i:i + n] += r[:n] * gain

def make_ir(rt60=2.2, pre=0.012, seed=1, bright=0.6):
    r = np.random.default_rng(seed)
    n = int(rt60 * 1.3 * SR)
    t = np.arange(n) / SR
    ir = []
    for _ in range(2):
        x = r.standard_normal(n) * np.exp(-6.9 * t / rt60)
        # assombrit progressivement la queue
        x = signal.sosfilt(signal.butter(1, 7000 * bright + 800, 'lowpass', fs=SR, output='sos'), x)
        x[:int(pre * SR)] = 0
        ir.append(x / np.sqrt(np.sum(x ** 2)))
    return ir

def reverb(bus, ir):
    l = signal.fftconvolve(bus.L, ir[0])[:N]
    r = signal.fftconvolve(bus.R, ir[1])[:N]
    return l, r

def env_curve(points, n=None):
    """points [(t, v), ...] -> array de taille N"""
    ts = np.array([p[0] for p in points]); vs = np.array([p[1] for p in points])
    return np.interp(np.arange(N) / SR, ts, vs)

# ---------------------------------------------------------------- instruments
def kick(vol=1.0):
    d = 0.45; t = tt(d)
    f = 45 + 110 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.16)
    click = hp(noise(0.01), 2000) * np.exp(-tt(0.01) / 0.002)
    x[:len(click)] += click * 0.4
    return x * vol

def sub_boom(d=2.2, f0=75, f1=28, vol=1.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.9) * np.minimum(1, t / 0.004)
    n = lp(noise(d), 600) * np.exp(-t / 0.25)
    return (x * 0.95 + n * 0.35) * vol

def snare(vol=1.0):
    d = 0.35; t = tt(d)
    n = bp(noise(d), 900, 7000) * np.exp(-t / 0.09)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.06)
    return (n * 0.8 + tone * 0.5) * vol

def clap(vol=1.0):
    d = 0.3; x = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.011, 0.024, 0.04]):
        n = bp(noise(0.2), 900, 3500) * np.exp(-tt(0.2) / (0.012 if k < 3 else 0.09))
        i = int(off * SR); x[i:i + len(n)] += n[:len(x) - i]
    return x * vol * 0.9

def hat(open_=False, vol=1.0):
    d = 0.35 if open_ else 0.08
    tau = 0.12 if open_ else 0.018
    return hp(noise(d), 7000) * exp_env(d, tau, 0.001) * vol * 0.5

def stomp(vol=1.0):
    d = 0.3; t = tt(d)
    f = 60 + 40 * np.exp(-t / 0.02)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.07)
    wood = bp(noise(d), 200, 1800) * np.exp(-t / 0.03)
    return (x * 0.8 + wood * 0.7) * vol

def taiko(vol=1.0, f=95):
    d = 1.6; t = tt(d)
    fr = f * (1 + 0.5 * np.exp(-t / 0.05))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) * np.exp(-t / 0.45)
    skin = bp(noise(d), 150, 2500) * np.exp(-t / 0.05)
    return (x + skin * 0.6) * vol

def tom(f=140, vol=1.0):
    d = 0.5; t = tt(d)
    fr = f * (1 + 0.6 * np.exp(-t / 0.03))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) * np.exp(-t / 0.18) + bp(noise(d), 200, 3000) * np.exp(-t / 0.02) * 0.4) * vol

def crash(d=3.2, vol=1.0):
    t = tt(d)
    n = hp(noise(d), 3500) * np.exp(-t / 0.9)
    n += bp(noise(d), 800, 3000) * np.exp(-t / 0.35) * 0.4
    return n * vol * 0.6

def bell(f0=880, d=3.0, vol=1.0):
    t = tt(d)
    parts = [(1.0, 1.0, 1.4), (2.0, 0.55, 0.9), (2.76, 0.6, 0.8), (4.07, 0.35, 0.5), (5.4, 0.3, 0.35), (8.9, 0.15, 0.2)]
    x = np.zeros_like(t)
    for ratio, a, tau in parts:
        det = 1 + rng.uniform(-0.002, 0.002)
        x += a * np.sin(2 * np.pi * f0 * ratio * det * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    clank = bp(noise(0.05), 2500, 9000) * np.exp(-tt(0.05) / 0.008)
    x[:len(clank)] += clank * 0.8
    # battement caractéristique
    x *= 1 + 0.08 * np.sin(2 * np.pi * 7 * t)
    return x * vol * 0.5

def saw(f, d, detune=(0,), harmonics=14):
    t = tt(d); x = np.zeros_like(t)
    for c in detune:
        ff = f * 2 ** (c / 1200)
        for h in range(1, harmonics + 1):
            if ff * h > SR / 2 - 500: break
            x += np.sin(2 * np.pi * ff * h * t + h) / h
    return x / len(detune)

def guitar(f, d, vol=1.0, drive=6.0, mute=False, power=True):
    """Accord de puissance saturé (racine + quinte + octave)."""
    d = max(d, 0.05)
    x = saw(f, d, (-7, 6)) + saw(f * 1.4983, d, (-5, 8)) * 0.8 + saw(f * 2, d, (-6, 5)) * 0.6
    x = np.tanh(drive * x / 3)
    x = bp(x, 110, 4200, 2)
    t = tt(d)
    if mute:
        e = np.exp(-t / 0.09) * np.minimum(1, t / 0.003)
    else:
        e = np.exp(-t / max(d * 0.7, 0.2)) * np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.03 + 0.0)
    return x * e * vol

def bass(f, d, vol=1.0):
    t = tt(d)
    x = saw(f, d, (0, 4), 8)
    x = lp(x, 520)
    x += np.sin(2 * np.pi * f * t) * 0.8
    e = np.exp(-t / max(d * 0.8, 0.15)) * np.minimum(1, t / 0.004)
    return np.tanh(x * 1.5) * e * vol * 0.6

def pad(f, d, vol=1.0, cutoff=1400, attack=1.0, release=1.0, detune=(-12, 0, 11)):
    x = saw(f, d, detune, 10)
    x = lp(x, cutoff)
    t = tt(d)
    e = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return x * e * vol * 0.5

def choir(f, d, vol=1.0, attack=1.5, release=1.5):
    t = tt(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6))
    x = np.zeros_like(t)
    for c in (-9, 0, 8):
        ff = f * 2 ** (c / 1200)
        ph = 2 * np.pi * np.cumsum(ff * vib) / SR
        for h in range(1, 18):
            if ff * h > 5500: break
            x += np.sin(h * ph) / h
    # formants « ah »
    y = bp(x, 650, 950, 2) * 1.0 + bp(x, 1050, 1350, 2) * 0.7 + bp(x, 2400, 2900, 2) * 0.35 + lp(x, 300) * 0.25
    e = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return y * e * vol * 0.4

def celesta(f, d=1.6, vol=1.0):
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.8)
         + 0.35 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.25)
         + 0.2 * np.sin(2 * np.pi * f * 6.2 * t) * np.exp(-t / 0.12))
    x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return x * vol * 0.6

def brass(f, d, vol=1.0):
    t = tt(d)
    x = saw(f, d, (-8, 0, 9), 16)
    # filtre qui s'ouvre
    y = np.zeros_like(x)
    chunks = 24
    L = len(x) // chunks
    zi = None
    for k in range(chunks):
        fc = 500 + 3500 * min(1, (k / chunks) * 4)
        sos = signal.butter(2, fc, 'lowpass', fs=SR, output='sos')
        seg = x[k * L:(k + 1) * L if k < chunks - 1 else None]
        if zi is None: zi = signal.sosfilt_zi(sos) * seg[0]
        out, zi = signal.sosfilt(sos, seg, zi=zi)
        y[k * L:k * L + len(out)] = out
    e = np.minimum(1, t / 0.03) * np.exp(-t / max(d * 0.6, 0.1)) * np.minimum(1, (d - t) / 0.05)
    return np.tanh(y * 1.2) * e * vol * 0.6

def sweep_noise(d, f0, f1, q=3.0, vol=1.0, curve='exp', shape='rise'):
    """Bruit filtré dont la fréquence glisse de f0 à f1."""
    x = noise(d)
    n = len(x); chunks = max(8, int(d * 80)); L = n // chunks
    out = np.zeros(n); zi = None
    for k in range(chunks):
        u = k / (chunks - 1)
        f = f0 * (f1 / f0) ** u if curve == 'exp' else f0 + (f1 - f0) * u
        bw = f / q
        sos = signal.butter(2, [max(f - bw / 2, 30), min(f + bw / 2, SR / 2 - 200)], 'bandpass', fs=SR, output='sos')
        seg = x[k * L:(k + 1) * L if k < chunks - 1 else None]
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        o, zi = signal.sosfilt(sos, seg, zi=zi)
        out[k * L:k * L + len(o)] = o
    t = tt(d)
    if shape == 'rise':
        e = (t / d) ** 2.2
        e *= np.minimum(1, (d - t) / 0.02)
    else:
        e = (1 - t / d) ** 2
    return out * e * vol

def whoosh(d=0.6, f0=300, f1=5000, vol=1.0):
    x = sweep_noise(d, f0, f1, 1.6, 1.0, 'exp', 'rise')
    t = tt(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return x * e * vol * 2.5

def riser(d, vol=1.0, f0=200, f1=9000):
    a = sweep_noise(d, f0, f1, 1.4, 1.0)
    t = tt(d)
    tone = np.sin(2 * np.pi * np.cumsum(120 * (2 ** (3 * t / d))) / SR) * (t / d) ** 2 * 0.25
    return (a * 3 + tone) * vol

def reverse_cymbal(d, vol=1.0):
    c = crash(d + 0.6)
    c = c[:int(d * SR)]
    return c[::-1] * vol * 1.2

def crowd_noise(d, level=1.0, bright=1.0):
    x = pink(d)
    x = bp(x, 160, 2600 * bright, 2)
    # modulation lente (houle)
    t = tt(d)
    mod = 0.75 + 0.25 * np.sin(2 * np.pi * 0.31 * t + 1) * np.sin(2 * np.pi * 0.17 * t)
    return x * mod * level

def claps(d, density, seed=7):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR))
    n = int(d * density)
    for _ in range(n):
        t0 = r.uniform(0, d - 0.1)
        c = bp(r.standard_normal(int(0.08 * SR)), 900, 4500) * np.exp(-np.arange(int(0.08 * SR)) / SR / 0.012)
        i = int(t0 * SR)
        out[i:i + len(c)] += c[:len(out) - i] * r.uniform(0.3, 1.0)
    return out

def sleigh(d=0.9, vol=1.0):
    t = tt(d); x = np.zeros_like(t)
    for f in (4200, 5300, 6700, 8100):
        x += np.sin(2 * np.pi * f * (1 + rng.uniform(-0.01, 0.01)) * t) * np.exp(-t / 0.18)
    x += hp(noise(d), 5000) * np.exp(-t / 0.1) * 0.6
    # secousse (plusieurs impacts)
    m = np.zeros_like(t)
    for k in range(7):
        i = int(k * 0.045 * SR)
        m[i:] += np.exp(-np.arange(len(m) - i) / SR / 0.04) * (0.6 + 0.4 * rng.random())
    return x * m * vol * 0.2

def coin(vol=1.0):
    d = 0.5; t = tt(d)
    x = np.sin(2 * np.pi * 1760 * t) * np.exp(-t / 0.12) + np.sin(2 * np.pi * 2349 * t) * np.exp(-t / 0.2) * np.where(t > 0.05, 1, 0)
    return x * vol * 0.4

def ping(f=1318, vol=1.0):
    t = tt(0.6)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12) + 0.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.06)) * vol * 0.35

def screech(d=0.7, vol=1.0):
    t = tt(d)
    f = 1500 + 900 * (t / d)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + noise(d) * 0.25
    x = bp(x, 900, 5000)
    return x * np.minimum(1, t / 0.03) * np.exp(-t / 0.5) * vol

def crunch(vol=1.0):
    d = 0.5; t = tt(d)
    n = bp(noise(d), 120, 4000) * np.exp(-t / 0.07)
    metal = bp(noise(d), 2000, 9000) * np.exp(-t / 0.2) * 0.4
    thud = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.12)
    return (n + metal + thud * 0.8) * vol

def engine_rev(d, f0, f1, vol=1.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.zeros_like(t)
    for h in (1, 2, 3, 4, 6, 8):
        x += np.sin(h * ph) / h ** 0.7
    x = np.tanh(x * 1.6)
    x = lp(x, 3800)
    e = np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.08)
    return x * e * vol * 0.35

def thunder(d=2.5, vol=1.0):
    t = tt(d)
    n = lp(noise(d), 700)
    e = np.exp(-t / 0.9) * (1 + 0.6 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / 0.6))
    crack = hp(noise(0.12), 1500) * np.exp(-tt(0.12) / 0.015)
    n[:len(crack)] += crack * 1.5
    return n * e * vol * 1.6

def cannon(vol=1.0):
    a = sub_boom(1.6, 90, 35, vol * 0.7)
    b = crash(1.6, 0.4)
    n = min(len(a), len(b))
    return a[:n] + b[:n]

def firework(vol=1.0):
    # whistle montant + éclat + crépitement
    d = 1.6; t = tt(d)
    f = 900 + 2600 * np.clip(t / 0.5, 0, 1) ** 1.5
    w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.where(t < 0.5, (t / 0.5), 0) * 0.15
    burst = hp(noise(d), 800) * np.exp(-np.clip(t - 0.5, 0, None) / 0.12) * np.where(t >= 0.5, 1, 0)
    crack = np.zeros_like(t)
    for _ in range(40):
        i = int((0.55 + rng.random() * 0.9) * SR)
        crack[i:i + 200] += hp(noise(0.005), 3000)[:200] * rng.random()
    return (w + burst * 0.5 + crack * 0.8) * vol

def tape_stop(d=0.5, vol=1.0):
    t = tt(d)
    f = 400 * (1 - t / d) ** 2 + 30
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2) * np.exp(-t / 0.4) * vol * 0.4

# ---------------------------------------------------------------- voix off
def process_voice():
    src = os.path.join(HERE, 'audio', 'vo_take1.mp3')
    out = os.path.join(HERE, 'audio', 'vo_proc.wav')
    af = ("highpass=f=85,"
          "equalizer=f=250:t=q:w=1:g=1.8,"
          "equalizer=f=3400:t=q:w=1.1:g=2.8,"
          "acompressor=threshold=-22dB:ratio=3.2:attack=6:release=90:makeup=4,"
          "alimiter=limit=0.89:attack=3:release=40")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', af, '-ar', str(SR), '-ac', '1', out], check=True)
    sr, x = wavfile.read(out)
    x = x.astype(np.float64) / 32768.0
    return x

# ---------------------------------------------------------------- composition

# ------------------------------------------------------------------ moteurs et bruitages propres à chaque univers de bolides
def _phase(f):
    return 2 * np.pi * np.cumsum(f) / SR

def engine_vtec(d, f0=90, f1=520, vol=1.0):
    """MANGA : moteur japonais haut-régime : dent de scie vive, résonance « sifflante », turbo qui monte en spirale."""
    t = tt(d); f = f0 * (f1 / f0) ** (t / d) ** 0.8
    ph = _phase(f); x = np.zeros_like(t)
    for h in range(1, 14):
        x += np.sin(h * ph) / h ** 0.9
    x = np.tanh(x * 1.2)
    x = bp(x, 400, 6500, 2) * 1.6
    turbo = np.sin(_phase(2400 + 3600 * (t / d) ** 1.5)) * 0.10 * np.minimum(1, t / 0.2)
    e = np.minimum(1, t / 0.04) * np.minimum(1, (d - t) / 0.05)
    return (x * 0.5 + turbo) * e * vol * 0.55

def blow_off(vol=1.0):
    """Soupape de décharge : « pshhhh » + petit claquement."""
    d = 0.75; t = tt(d)
    n = bp(noise(d), 2500, 9500) * np.exp(-t / 0.22) * np.minimum(1, t / 0.008)
    return n * vol * 0.8

def engine_v8(d, rpm=1150, vol=1.0, lope=0.18, blips=()):
    """GOTHIQUE : gros V8 au ralenti « lopeux » : impulsions graves irrégulières + grondement, coups d'accélérateur."""
    t = tt(d); f_fire = rpm / 60 * 4          # 4 explosions par tour
    ph = _phase(np.full_like(t, f_fire) * (1 + 0.04 * np.sin(2 * np.pi * 1.7 * t)))
    puls = np.maximum(0, np.sin(ph)) ** 3
    puls *= 1 + lope * np.sin(2 * np.pi * (f_fire / 8) * t * 1.0) * 3   # irrégularité du cammage
    body = lp(puls, 240, 4) * 2.2
    rumble = lp(noise(d), 120, 4) * 1.2
    exhaust = bp(puls * noise(d), 140, 900, 2) * 0.8
    x = body + rumble * 0.5 + exhaust * 0.5
    for tb in blips:                              # coups d'accélérateur
        k = np.exp(-((t - tb) / 0.14) ** 2)
        pf = np.cumsum(f_fire * (1 + 1.5 * k)) * 2 * np.pi / SR
        x += lp(np.maximum(0, np.sin(pf)) ** 3, 520, 3) * 1.6 * k
    e = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.2)
    return np.tanh(x * 0.9) * e * vol * 0.55

def engine_diesel(d, rpm=900, vol=1.0):
    """POST-APO : vieux diesel qui cliquette : impulsions sèches 3 cylindres, tintements, toussotements."""
    t = tt(d); f_fire = rpm / 60 * 1.5 * 3
    ph = _phase(np.full_like(t, f_fire) * (1 + 0.03 * np.sin(2 * np.pi * 3.1 * t)))
    knock = np.maximum(0, np.sin(ph)) ** 8
    clat = hp(noise(d), 1800) * knock * 0.9 + bp(noise(d), 250, 900) * knock * 0.8
    body = lp(knock, 180, 3) * 1.4
    x = body + clat * 0.7 + lp(noise(d), 90, 3) * 0.5
    miss = (np.sin(2 * np.pi * 0.9 * t + 1.3) > 0.82) * 0.7              # ratés
    x *= (1 - miss)
    e = np.minimum(1, t / 0.1) * np.minimum(1, (d - t) / 0.2)
    return np.tanh(x) * e * vol * 0.6

def backfire(vol=1.0):
    d = 0.6; t = tt(d)
    pop = bp(noise(d), 300, 3500) * np.exp(-t / 0.035)
    boom = np.sin(2 * np.pi * (140 - 70 * t / d) * t) * np.exp(-t / 0.07)
    crackle = hp(noise(d), 3000) * (np.random.default_rng(5).random(len(t)) > 0.996) * np.exp(-t / 0.25) * 6
    return (pop * 1.2 + boom * 0.9 + crackle) * vol

def chain_rattle(d=1.0, vol=1.0, seed=3):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR))
    for k in range(int(d * 22)):
        i = int(r.random() * (len(x) - 900)); n = 600 + int(r.random() * 280)
        c = bp(noise(n / SR), 2200 + r.random() * 2600, 7500 + r.random() * 2500, 2) * np.exp(-tt(n / SR) / (0.004 + r.random() * 0.006))
        m = min(len(c), len(x) - i); x[i:i + m] += c[:m] * (0.4 + r.random() * 0.8)
    return x * vol

def dust_wind(d, vol=1.0):
    t = tt(d); n = bp(noise(d), 300, 2400, 2)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * 0.7 * t + 0.6) * np.sin(2 * np.pi * 0.31 * t)
    return n * am * vol * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4)

def engine_f1(d, f0=620, f1=380, vol=1.0, pk=0.5):
    """F1 : cri aigu façon V10 : harmoniques riches + effet Doppler (pitch qui plonge au passage)."""
    t = tt(d); k = 1 / (1 + np.exp(-(t / d - pk) * 14))          # 0 → 1 au passage
    f = f0 + (f1 - f0) * k; ph = _phase(f); x = np.zeros_like(t)
    for h in (1, 2, 3, 4, 5, 6, 8, 10, 12):
        x += np.sin(h * ph + h) / h ** 0.6
    x = np.tanh(x * 1.4) + hp(noise(d), 2500) * 0.12
    amp = np.exp(-((t / d - pk) / 0.27) ** 2) * 0.9 + 0.1
    return x * amp * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.06) * vol * 0.35, k

def add_pass(bus, x, t0, gain, p0=-0.9, p1=0.9):
    """Passage panoramique de gauche à droite."""
    p = np.linspace(p0, p1, len(x)); gl = np.cos((p + 1) * np.pi / 4); gr = np.sin((p + 1) * np.pi / 4)
    bus.add_st(x * gl, x * gr, t0, gain)

def toy_motor(d=0.5, vol=1.0):
    t = tt(d); sq = np.sign(np.sin(2 * np.pi * (140 + 90 * t / d) * t))
    return bp(sq * 0.5 + noise(d) * 0.3, 600, 4800) * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.08) * vol * 0.4

def build():
    music = Bus(); fx = Bus(); crowd = Bus(); vo = Bus()
    voice = process_voice()
    vo.add(voice, 0.0, 1.0)

    # ======================= FOULE =======================
    tn = tt(DUR)
    bed = crowd_noise(DUR, 1.0)
    bed_gain = env_curve([(0, 0.05), (3.5, 0.12), (7.0, 0.30), (9.6, 0.55), (9.72, 0.02), (9.74, 1.0), (10.8, 0.62),
                          (16.0, 0.65), (16.4, 0.18), (18.1, 0.12), (18.3, 0.85), (19.4, 0.5), (24.6, 0.7),
                          (30.8, 0.75), (31.22, 0.10), (36.0, 0.12), (36.6, 0.04), (37.3, 0.04), (37.38, 1.0),
                          (40.4, 0.7), (45.0, 0.8), (45.3, 1.25), (47.0, 0.9), (49.0, 0.0)])
    crowd.add(bed * bed_gain[:len(bed)] * 0.5, 0.0, 1.0, 0.0)
    # deuxième couche (stéréo large)
    bed2 = crowd_noise(DUR, 1.0, 1.2)
    crowd.add(bed2 * bed_gain[:len(bed2)] * 0.35, 0.0, 1.0, 0.6)
    # applaudissements
    ap = claps(DUR, 90, seed=3)
    ap_gain = env_curve([(0, 0), (8.9, 0.0), (9.8, 1.0), (12.5, 0.5), (16.0, 0.4), (16.3, 0.0), (18.4, 1.0), (20, 0.6),
                         (25, 0.4), (31.0, 0.5), (31.2, 0.0), (36.0, 0.0), (37.4, 1.0), (41, 0.8), (45.2, 1.0), (48, 0.5), (49, 0)])
    crowd.add(ap * ap_gain[:len(ap)] * 0.5, 0.0, 1.0, -0.2)
    # rugissements ponctuels
    def roar(t0, rise, hold, fall, lvl, seed=0):
        d = rise + hold + fall
        x = crowd_noise(d, 1.0, 1.4) + 0.5 * bp(pink(d), 400, 1800)
        t = tt(d)
        e = np.where(t < rise, (t / rise) ** 1.5, np.where(t < rise + hold, 1.0, np.maximum(0, 1 - (t - rise - hold) / fall) ** 1.5))
        crowd.add(x * e * lvl, t0, 1.0, 0.0)
    roar(8.3, 1.4, 0.0, 0.1, 0.9)         # montée avant « arène »
    roar(9.74, 0.05, 0.9, 2.0, 1.5)
    roar(18.25, 0.1, 0.7, 1.8, 1.1)       # trône
    roar(24.5, 0.1, 0.0, 1.0, 0.6)
    roar(37.38, 0.05, 1.4, 2.0, 1.6)
    roar(39.38, 0.05, 1.8, 2.5, 1.9)
    roar(45.25, 0.15, 2.0, 2.4, 2.2)

    # flashs d'appareils photo (clics) pendant les moments de foule
    r = np.random.default_rng(11)
    for t0 in np.concatenate([r.uniform(9.9, 16.0, 26), r.uniform(18.5, 22, 14), r.uniform(37.5, 41, 20), r.uniform(45.3, 48, 26)]):
        click = hp(noise(0.012), 2500) * np.exp(-tt(0.012) / 0.002)
        fx.add(click, t0, 0.18, r.uniform(-0.9, 0.9))

    # ======================= ACTE 0 : le salon (0 – 9.74) =======================
    # drone sub + pad sombre
    sub = np.sin(2 * np.pi * 41.2 * tt(10.0)) * 0.55
    sub *= np.minimum(1, tt(10.0) / 3.0)
    music.add(sub, 0.0, 0.55)
    music.add(pad(82.41, 10.0, 0.5, cutoff=520, attack=3.5, release=0.3), 0.0, 0.5, -0.2)
    music.add(pad(123.47, 8.0, 0.35, cutoff=700, attack=4.0, release=0.3), 1.5, 0.4, 0.2)
    # battement de cœur qui accélère
    t = 0.35; gap = 1.1
    while t < 9.62:
        k = kick(0.5); music.add(k, t, 0.9)
        music.add(kick(0.35), t + 0.20, 0.9)
        gap = max(0.42, gap * 0.935)
        t += gap
    # lumière qui grésille : clics + buzz électrique
    for t0 in (0.16, 0.33, 0.50):
        fx.add(bp(noise(0.08), 100, 5000) * exp_env(0.08, 0.02, 0.001), t0, 0.35, -0.3)
    buzz = saw(100, 3.2, (0,), 6); buzz = bp(buzz, 80, 900) * 0.5
    buzz *= (np.sign(np.sin(2 * np.pi * 13 * tt(3.2))) * 0.5 + 0.5) * np.exp(-tt(3.2) / 2.0)
    fx.add(buzz, 0.16, 0.18, -0.5)
    # télé qui s'allume + statique
    fx.add(bp(noise(0.4), 2000, 12000) * exp_env(0.4, 0.15, 0.003), 3.0, 0.22, 0.5)
    fx.add(whoosh(0.9, 200, 3000, 0.5), 2.2, 0.5, 0.0)
    # « salon » : lumière qui saute
    for t0 in (5.86, 6.12, 6.58):
        fx.add(bp(noise(0.12), 80, 4000) * exp_env(0.12, 0.03, 0.001), t0, 0.5, 0.2)
    # « se transforme » : cordes qui se tendent, montée
    for k, t0 in enumerate((7.14, 7.52, 7.90, 8.28)):
        tw = np.sin(2 * np.pi * np.cumsum(240 * (1.8 - 0.8 * np.clip(tt(0.5) / 0.5, 0, 1))) / SR) * np.exp(-tt(0.5) / 0.12)
        fx.add(tw + crunch(0.2)[:len(tw)] * 0.3, t0, 0.35, -0.5 + 0.35 * k)
    music.add(riser(2.7, 1.0), 7.0, 0.55)
    fx.add(reverse_cymbal(2.4, 0.7), 7.3, 0.5)
    for k in range(10):                     # roulement de toms montant
        music.add(tom(110 + 12 * k, 0.5 + 0.05 * k), 7.9 + k * 0.17, 0.7, -0.4 + 0.09 * k)
    for k in range(8):
        music.add(snare(0.3 + 0.07 * k), 8.7 + k * 0.1 - k * k * 0.003, 0.6)
    # cut juste avant l'explosion
    # ======================= « ARÈNE » : explosion (9.74) =======================
    A = T['arene']
    fx.add(sub_boom(2.6, 78, 27, 1.0), A, 1.0)
    fx.add(crash(3.8, 1.0), A, 0.85)
    fx.add(cannon(1.0), A, 0.6)
    fx.add(whoosh(1.2, 400, 6000, 1.0), A - 0.05, 0.4)
    for k in range(5):
        fx.add(firework(0.5), A + 0.15 + k * 0.28, 0.5, -0.8 + 0.4 * k)
    fx.add(bell(880, 3.5, 1.0), A + 0.02, 0.55, 0.1)
    music.add(guitar(82.41, 3.0, 1.0), A, 0.55)
    music.add(guitar(164.81, 3.0, 0.8), A, 0.4)
    music.add(brass(164.81, 1.6, 1.0), A, 0.35)

    # ======================= ACTE 1 : groove arène (9.74 – 16.26) =======================
    beat = 0.489
    t0 = A + 0.45
    riff = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 36.71]   # E1 E1 G1 E1 A1 E1 G1 D1 (basse)
    i = 0
    while t0 < T['une'] - 0.05:
        step = i % 8
        # kick sur les temps, clap sur 2 et 4 (stomp-stomp-clap alternatif)
        if step % 2 == 0:
            music.add(kick(1.0), t0, 0.75)
        if step in (2, 6):
            music.add(clap(1.0), t0, 0.7)
            music.add(snare(0.6), t0, 0.55)
        if step in (0, 1, 4, 5):
            music.add(stomp(0.9), t0, 0.5, -0.1)
        music.add(hat(False, 1.0), t0, 0.35, 0.25)
        music.add(hat(False, 0.7), t0 + beat / 2, 0.30, -0.25)
        music.add(bass(riff[step] * 2, beat * 0.9, 1.0), t0, 0.55)
        if step in (0, 3, 4, 6):
            music.add(guitar(riff[step] * 4 if riff[step] < 50 else riff[step] * 4, beat * 0.9, 0.9, mute=True), t0, 0.40, -0.35)
            music.add(guitar(riff[step] * 4, beat * 0.9, 0.9, mute=True), t0 + 0.004, 0.40, 0.35)
        t0 += beat; i += 1
    # accents « stat slam » : QUINZE / SOIXANTE-QUINZE / CINQ
    for key, f in (('quinze', 55.0), ('soixante', 61.7), ('cinq', 73.4)):
        tt0 = T[key]
        fx.add(whoosh(0.5, 250, 5500, 0.9), tt0 - 0.38, 0.55)
        fx.add(sub_boom(1.2, 90, 40, 0.9), tt0, 0.75)
        fx.add(crunch(0.6)[:int(0.5 * SR)], tt0, 0.5)
        fx.add(bell(1320, 1.4, 0.6), tt0, 0.25, 0.2)
        music.add(brass(f * 4, 0.6, 1.0), tt0, 0.40)
        fx.add(crash(1.4, 0.6), tt0, 0.3)

    # ======================= « UNE SEULE PLACE… SUR LE TRÔNE » (16.26 – 19.5) =======================
    U = T['une']
    fx.add(tape_stop(0.5, 1.0), U - 0.05, 0.55)
    # silence de musique ; coeur + pad sombre + riser fin
    music.add(sub_boom(2.2, 48, 36, 0.8), U + 0.1, 0.5)
    music.add(pad(82.41, 2.4, 0.5, cutoff=420, attack=0.6, release=0.6), U + 0.1, 0.5)
    for k, tm in enumerate((16.45, 17.0, 17.45, 17.8, 18.05)):
        music.add(kick(0.5), tm, 0.7)
    music.add(riser(1.9, 0.9, 400, 7000), 16.3, 0.35)
    # couronne qui se pose
    TR = T['trone']
    fx.add(sub_boom(2.8, 70, 26, 1.0), TR, 0.9)
    fx.add(bell(660, 4.0, 1.0), TR, 0.7, 0.0)
    fx.add(bell(990, 3.0, 0.7), TR + 0.01, 0.4, 0.3)
    fx.add(crash(3.0, 0.8), TR, 0.4)
    music.add(choir(164.81, 3.2, 0.9, 0.12, 1.5), TR, 0.55, -0.2)
    music.add(choir(246.94, 3.2, 0.7, 0.12, 1.5), TR, 0.45, 0.2)
    music.add(choir(329.63, 3.2, 0.7, 0.12, 1.5), TR, 0.35, 0.0)

    # ======================= ACTE 2 : les écuries (19.52 – 25) =======================
    # coupe : whoosh + taiko MANGA
    fx.add(whoosh(0.45, 300, 7000, 1.0), 19.38, 0.6)
    for k, tm in enumerate([19.78, 20.12, 20.30, 20.46, 20.62, 20.80]):
        music.add(taiko(0.9, 92 if k % 2 == 0 else 110), tm, 0.8, -0.3 + 0.12 * k)
    music.add(sweep_noise(1.0, 600, 9000, 2.0, 1.0), 19.9, 0.35)
    for k, f in enumerate([329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 329.63]):       # gamme pentatonique « manga »
        music.add(celesta(f * 2, 0.8, 1.0), 20.0 + k * 0.17, 0.35, 0.3)
    music.add(guitar(82.41, 0.6, 1.0, mute=True), 19.78, 0.5)
    # GOTHIQUE : orgue + cloche + tonnerre
    G = T['seigneurs']
    fx.add(whoosh(0.4, 250, 5000, 1.0), 21.32, 0.55)
    for f in (82.41, 123.47, 155.56, 196.0, 329.63):  # accord Em(b3 / dim)
        music.add(pad(f, 3.4, 0.7, cutoff=2200, attack=0.05, release=0.9, detune=(-6, 5)), G, 0.30)
    fx.add(bell(440, 4.0, 1.0), G, 0.55, -0.2)
    fx.add(thunder(2.6, 1.0), T['gothiques'], 0.55)
    for k in range(6):                      # battements d'ailes
        fx.add(bp(noise(0.12), 200, 1500) * exp_env(0.12, 0.04), G + 0.5 + k * 0.09, 0.3, -0.7 + 0.28 * k)
    # APOCALYPSE : moteurs, explosion, guitare
    S = T['survivants']
    fx.add(whoosh(0.4, 250, 5000, 1.0), S - 0.18, 0.6)
    fx.add(engine_rev(1.4, 70, 260, 1.0), S, 0.5, -0.4)
    fx.add(engine_rev(1.4, 60, 230, 1.0), S + 0.05, 0.4, 0.4)
    music.add(guitar(73.42, 1.6, 1.0, drive=14), S, 0.7)
    music.add(guitar(110.0, 1.6, 0.8, drive=14), S + 0.01, 0.5)
    ap = T['apocalypse']
    fx.add(sub_boom(2.2, 85, 30, 1.0), ap, 0.95)
    fx.add(crash(2.6, 0.9), ap, 0.55)
    fx.add(lp(noise(1.6), 2200) * exp_env(1.6, 0.5, 0.004), ap, 0.8)    # explosion
    fx.add(crunch(0.9), ap + 0.1, 0.5)


    # ---------- bruitages propres à chaque univers (moteurs, matières, ambiances) ----------
    # MANGA : VTEC qui grimpe, dérapage, soupape, tintement de katana
    fx.add(engine_vtec(0.5, 140, 760, 1.0), 19.38, 0.85, -0.5)
    fx.add(engine_vtec(0.9, 760, 420, 1.0), 19.86 - 0.02, 0.5, 0.2)
    fx.add(screech(0.55, 1.0), 19.86, 0.42, -0.2)
    fx.add(blow_off(1.0), 19.98, 0.6, 0.3)
    fx.add(bp(noise(0.5), 5000, 12000) * np.exp(-tt(0.5) / 0.18), 20.00, 0.35, 0.5)        # shing de lame
    fx.add(ping(2637, 0.9), 20.02, 0.22, 0.4)
    for k in range(4):
        fx.add(engine_vtec(0.28, 420, 700 + 60 * k, 1.0), 20.50 + k * 0.34, 0.30, -0.3 + 0.2 * k)   # relances
    # GOTHIQUE : V8 qui gronde, orgue bas, cloche, ailes
    fx.add(engine_v8(1.55, 1100, 1.0, blips=(0.55, 1.05)), 21.42, 0.75, 0.0)
    for f in (41.2, 61.7, 82.4):
        music.add(pad(f, 1.5, 0.9, cutoff=900, attack=0.05, release=0.5), 21.50, 0.30)
    fx.add(bell(98, 3.5, 1.0), 21.92, 0.45, 0.2)
    fx.add(lp(noise(1.4), 1200) * exp_env(1.4, 0.5), 22.1, 0.20, 0.0)                        # grésil de pluie
    # APOCALYPSE : diesel qui cliquette, rouille, vent, backfire, saut / chute
    fx.add(dust_wind(2.1, 1.0), 22.97, 0.5, 0.0)
    fx.add(engine_diesel(2.1, 1000, 1.0), 22.97, 0.70, 0.0)
    fx.add(chain_rattle(1.4, 1.0, 3), 23.05, 0.35, -0.4)
    for tb, pn in ((23.20, -0.5), (23.34, 0.4), (24.28, -0.2), (24.45, 0.5)):
        fx.add(backfire(1.0), tb, 0.45, pn)
    fx.add(crunch(1.0), 24.20, 0.55, 0.0)                                                   # réception du saut
    fx.add(chain_rattle(0.5, 1.0, 9), 24.22, 0.30, 0.3)
    # F1 : cinq monoplaces lancées sur les voies (« cinq voies »), Doppler et passage stéréo
    for j in range(5):
        x, kk = engine_f1(1.25, 700 + 40 * j, 330 + 20 * j, 1.0, 0.48)
        add_pass(fx, x, 14.92 + j * 0.06, 0.20, -0.9 + 0.1 * j, 0.85)
    # salon : petits moteurs de jouets qui s'ébrouent pendant que la pièce se transforme
    for k, tm_ in enumerate((6.30, 7.55, 8.55, 9.15)):
        fx.add(toy_motor(0.45 + 0.1 * k, 1.0), tm_, 0.10 + 0.04 * k, -0.6 + 0.4 * k)

    # ======================= ACTE 3 : pièges / trahisons / paris (25.04 – 31.22) =======================
    P = T['pieges']
    fx.add(whoosh(0.35, 400, 6000, 1.0), P - 0.3, 0.5)
    # pulsation rapide
    tm = 25.04
    j = 0
    while tm < 31.0:
        beat2 = 0.38
        music.add(kick(1.0), tm, 0.55)
        if j % 2 == 1:
            music.add(snare(0.7), tm, 0.45); music.add(clap(0.7), tm, 0.35)
        music.add(hat(False, 0.8), tm + beat2 / 2, 0.25, 0.3)
        music.add(bass([41.2, 41.2, 49.0, 55.0][j % 4] * 2, beat2 * 0.9), tm, 0.5)
        tm += beat2; j += 1
    # glisse + crash banane
    fx.add(engine_vtec(0.45, 200, 600, 1.0), P - 0.35, 0.40, -0.3)
    fx.add(screech(0.7, 1.0), P, 0.55, -0.3)
    fx.add(crunch(0.9), P + 0.55, 0.65, 0.2)
    fx.add(sleigh(0.9, 1.0), P + 0.62, 0.4)
    # TRAHISONS : choc + stab dramatique (« dun dun »)
    TH = T['trahisons']
    fx.add(engine_v8(0.6, 2300, 1.0, blips=(0.3,)), TH - 0.1, 0.55, -0.4)
    add_pass(fx, engine_f1(0.5, 600, 420, 1.0, 0.5)[0], TH - 0.1, 0.20, 0.8, -0.3)
    fx.add(crunch(1.0), TH - 0.12, 0.7, 0.4)
    music.add(brass(164.81, 0.5, 1.0), TH + 0.0, 0.45)
    music.add(brass(155.56, 0.9, 1.0), TH + 0.55, 0.50)
    fx.add(sub_boom(1.4, 80, 38, 0.9), TH + 0.55, 0.8)
    fx.add(reverse_cymbal(0.6, 0.6), TH - 0.55, 0.4)
    # PARIS : caisse enregistreuse, pièces, notifications
    PA = T['paris']
    for k in range(9):
        fx.add(coin(1.0), PA + 0.05 + k * 0.17, 0.45, -0.6 + 0.15 * k)
    fx.add(bell(2093, 1.2, 0.5), PA, 0.25, 0.0)
    for k, tm2 in enumerate((28.48, 29.1, 29.74)):
        fx.add(ping([1318, 1568, 1760][k], 1.0), tm2, 0.45, -0.3 + 0.3 * k)
    # roulement de caisse claire qui s'accélère (29.74 → 31.18)
    tm = 29.9; g = 0.2
    while tm < 31.18:
        music.add(snare(0.6 + (tm - 29.9) * 0.4), tm, 0.5)
        g = max(0.045, g * 0.86); tm += g
    music.add(riser(1.4, 0.8, 500, 9000), 29.8, 0.35)

    # ======================= ACTE 4 : gloire éternelle (31.22 – 36.02) =======================
    # coupure nette (musique tue) : pad chaleureux + célesta « Jingle Bells » au ralenti
    E4, G4, C5, D5, E5 = 329.63, 392.0, 523.25, 587.33, 659.25
    b = 0.48; ts = 31.45
    notes = [(E4, 1), (E4, 1), (E4, 2), (E4, 1), (E4, 1), (E4, 2), (E4, 1), (G4, 1), (C5, 1.5), (D5, 0.5)]
    tcur = ts
    for f, dl in notes:
        music.add(celesta(f, 2.4, 1.0), tcur, 0.45, 0.15)
        music.add(celesta(f * 2, 1.4, 0.4), tcur, 0.25, -0.15)
        tcur += dl * b
    for f in (82.41, 123.47, 164.81, 196.0):
        music.add(pad(f, 6.0, 0.6, cutoff=1100, attack=1.4, release=1.2), 31.3, 0.30)
    music.add(pad(130.81, 5.0, 0.6, cutoff=1200, attack=1.2, release=1.2), 33.9, 0.3)
    music.add(choir(329.63, 2.8, 1.0, 1.3, 0.9), 33.35, 0.35, -0.2)
    music.add(choir(392.0, 2.8, 1.0, 1.3, 0.9), 33.35, 0.30, 0.2)
    music.add(choir(523.25, 2.4, 1.0, 1.0, 0.8), 34.5, 0.34, 0.0)
    fx.add(sleigh(1.0, 1.0), 31.3, 0.30, 0.3)
    fx.add(bell(1760, 3.0, 0.6), T['eternelle'], 0.28, 0.0)
    fx.add(riser(1.6, 0.9, 700, 10000), 35.1, 0.45)
    # « éternelle » : lumière dorée → souffle
    fx.add(reverse_cymbal(1.6, 0.8), 35.2, 0.5)
    # SILENCE avant le titre : tout meurt entre 36.5 et 37.38 (voir courbes)

    # ======================= ACTE 5 : TITRE (37.38 – 41) =======================
    hits = [(T['grand'], 82.41, 1.0), (T['prix'], 98.0, 0.9), (T['de'], 110.0, 0.85), (T['noel'], 82.41, 1.2)]
    for k, (th, f, lv) in enumerate(hits):
        fx.add(sub_boom(2.6, 80, 26, 1.0 * lv), th, 0.95)
        fx.add(crash(3.6, 1.0), th, 0.60 if k < 3 else 0.9)
        music.add(guitar(f, 1.4, 1.0, drive=12), th, 0.62)
        music.add(guitar(f * 2, 1.4, 0.8, drive=12), th + 0.005, 0.45)
        music.add(brass(f * 2, 1.0, 1.0), th, 0.32)
        music.add(taiko(1.0, 85), th, 0.75)
        fx.add(whoosh(0.28, 400, 6500, 1.0), th - 0.22, 0.45)
    fx.add(cannon(1.0), T['noel'], 0.8)
    for k in range(9):
        fx.add(firework(0.6), T['noel'] + 0.1 + k * 0.17, 0.45, -0.9 + 0.22 * k)
    fx.add(bell(880, 3.5, 1.0), T['noel'], 0.4, 0.0)
    music.add(choir(164.81, 3.0, 1.0, 0.1, 1.2), T['noel'], 0.40, -0.2)
    music.add(choir(329.63, 3.0, 1.0, 0.1, 1.2), T['noel'], 0.32, 0.2)

    # ======================= ACTE 6 : riff « Jingle Bells » métal + final (40.3 – 49) =======================
    beat = 0.30; r0 = 40.72
    riff = [(329.63, 1), (329.63, 1), (329.63, 2), (329.63, 1), (329.63, 1), (329.63, 2), (329.63, 1), (392.0, 1), (523.25, 1.5), (587.33, 0.5)]
    chord_root = {329.63: 82.41, 392.0: 98.0, 523.25: 130.81, 587.33: 146.83}
    tcur = r0
    for f, dl in riff:
        root = chord_root[f] * 2
        music.add(guitar(root, dl * beat * 0.95, 1.0, drive=11, mute=(dl <= 1)), tcur, 0.52, -0.35)
        music.add(guitar(root, dl * beat * 0.95, 1.0, drive=11, mute=(dl <= 1)), tcur + 0.003, 0.52, 0.35)
        music.add(kick(1.0), tcur, 0.7)
        music.add(sleigh(0.5, 1.0), tcur, 0.5)
        if dl >= 1: music.add(snare(0.8), tcur + beat * 0.5, 0.35)
        tcur += dl * beat
    # blocs de batterie en fond sous la voix
    tm = 40.3
    while tm < 44.3:
        music.add(kick(1.0), tm, 0.6)
        if int((tm - 40.3) / 0.3) % 2 == 1: music.add(snare(0.8), tm, 0.4)
        music.add(hat(False, 0.9), tm + 0.15, 0.3)
        tm += 0.3
    for k in range(10):                      # roulement avant « commence »
        music.add(tom(120 + 10 * k, 0.8), 43.2 + k * 0.1, 0.5, -0.5 + 0.1 * k)
    music.add(riser(1.2, 0.9, 400, 9000), 43.1, 0.4)
    # FINAL : « commence » → accord final + 3 coups de cloche + feux d'artifice
    F = T['commence']
    fx.add(whoosh(0.5, 300, 7000, 1.0), F - 0.45, 0.6)
    fx.add(sub_boom(3.0, 82, 25, 1.0), F + 0.5, 1.0)
    fx.add(crash(4.2, 1.0), F + 0.5, 0.85)
    for f in (82.41, 123.47, 164.81, 207.65, 329.63):
        music.add(guitar(f, 3.2, 1.0, drive=10), F + 0.5, 0.40)
    music.add(brass(329.63, 2.5, 1.0), F + 0.5, 0.40)
    music.add(choir(164.81, 4.0, 1.0, 0.1, 2.0), F + 0.5, 0.45, -0.2)
    music.add(choir(329.63, 4.0, 1.0, 0.1, 2.0), F + 0.5, 0.40, 0.2)
    music.add(choir(415.3, 4.0, 1.0, 0.1, 2.0), F + 0.5, 0.35, 0.0)
    for k, tb in enumerate((F + 0.95, F + 1.45, F + 1.95)):          # ding ding ding
        fx.add(bell(880, 3.2, 1.0), tb, 0.65, -0.1 + 0.1 * k)
    for k in range(22):
        fx.add(firework(0.7), F + 0.6 + k * 0.16, 0.5, np.sin(k * 1.7) * 0.9)
    fx.add(sleigh(1.0, 1.0), F + 0.7, 0.35)

    return music, fx, crowd, vo, voice

# ---------------------------------------------------------------- mixage
def mixdown():
    music, fx, crowd, vo, voice = build()
    ir_big = make_ir(2.6, 0.02, 3, 0.7)
    ir_vo = make_ir(1.5, 0.015, 9, 0.8)

    # réverbération d'arène : envoi de la voix, des effets et de la musique
    vl, vr = reverb(vo, ir_vo)
    fl, fr = reverb(fx, ir_big)
    ml, mr = reverb(music, ir_big)
    # écho « sono d'arène » sur la voix (slapback)
    d = int(0.13 * SR)
    sl = np.zeros(N); sl[d:] = vo.L[:-d]
    sr_ = np.zeros(N); sr_[int(d * 1.3):] = vo.R[:-int(d * 1.3)]

    voice_L = vo.L + 0.20 * vl + 0.14 * sl
    voice_R = vo.R + 0.20 * vr + 0.14 * sr_

    # enveloppe de la voix (sidechain)
    env = np.abs(vo.L)
    sos = signal.butter(2, 6.0, 'lowpass', fs=SR, output='sos')
    env = signal.sosfilt(sos, env)
    env = env / (np.percentile(env, 99) + 1e-9)
    env = np.clip(env, 0, 1)
    # attaque rapide / relâchement plus lent
    duck = 1.0 - 0.58 * env
    sos2 = signal.butter(1, 12.0, 'lowpass', fs=SR, output='sos')
    duck = signal.sosfilt(sos2, duck)

    # courbe de silence avant le titre + coupure de musique à 31.22
    kill = env_curve([(0, 1), (36.45, 1), (36.62, 0.0), (37.30, 0.0), (37.36, 1.0), (49, 1)])
    # (le « Le » de 37.14 passe seul dans le silence)
    # la musique des actes 0-3 ne continue pas dans l'acte 4
    mus_gate = env_curve([(0, 1), (31.15, 1), (31.22, 0.0), (49, 0.0)])  # utilisé uniquement pour musique « drive »
    # NB : les notes d'acte 4 sont ajoutées dans le même bus ; on laisse donc la porte ouverte :
    # la musique drive s'arrête d'elle-même (les boucles se terminent à 31.0 / 31.18)

    # niveaux relatifs
    ML = ml * 0.55 + music.L; MR = mr * 0.55 + music.R
    FL = fl * 0.60 + fx.L;    FR = fr * 0.60 + fx.R
    CL = crowd.L;             CR = crowd.R

    L = voice_L * 1.0 + (ML * 0.85 + FL * 0.95) * duck * kill + CL * 0.55 * (0.55 + 0.45 * duck) * kill
    R = voice_R * 1.0 + (MR * 0.85 + FR * 0.95) * duck * kill + CR * 0.55 * (0.55 + 0.45 * duck) * kill

    # fondu final
    fade = env_curve([(0, 1), (47.6, 1), (49.0, 0.0)])
    L *= fade; R *= fade
    # léger fondu d'entrée
    fin = env_curve([(0, 0.0), (0.12, 1.0), (49, 1)])
    L *= fin; R *= fin

    mix = np.stack([L, R], axis=1)
    return mix

def finalize(mix, target_lufs=-16.0):
    raw = os.path.join(HERE, 'audio', 'mix_raw.wav')
    wavfile.write(raw, SR, (np.clip(mix / max(1.0, np.abs(mix).max()) * 0.9, -1, 1) * 32767).astype(np.int16))
    # mesure LUFS (ffmpeg ebur128) puis gain + limiteur
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    I = None
    for line in out.splitlines():
        if line.strip().startswith('I:'):
            I = float(line.split()[1])
    gain = target_lufs - I
    print('LUFS brut : %.1f  → gain %.1f dB' % (I, gain))
    final = os.path.join(HERE, 'audio', 'mix.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af',
                    f'volume={gain}dB,alimiter=limit=0.84:attack=2:release=60:level=disabled', '-ar', str(SR), '-c:a', 'pcm_s16le', final], check=True)
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', final, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    for line in out.splitlines()[-12:]:
        if any(k in line for k in ('I:', 'LRA:', 'Peak:')):
            print(line.strip())

if __name__ == '__main__':
    m = mixdown()
    finalize(m)
    print('ok')
