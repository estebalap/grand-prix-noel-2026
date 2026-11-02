# Découpage d une prise vocale aux silences (énergie par tranches de 10 ms).
# V9.2 : vérification des bornes de pièces à −48 dB (enveloppe RMS 10 ms, pas de 5 ms, relative à la crête du fichier),
# élargissement jusqu'au vrai silence (ou au creux le plus proche s'il n'y en a pas), contrôle « aucune coupure interne ».
#   python3 outils_v9/decoupe_voix.py voix_off/L02.mp3            → segments (ancien usage)
#   python3 outils_v9/decoupe_voix.py --bornes data/voix_v9.json  → rapport des bornes de chaque pièce (sans rien écrire)
import json, os, subprocess, sys
import numpy as np

SEUIL_SILENCE_DB = -48.0     # une borne doit tomber sous −48 dB (relatif à la crête RMS 10 ms du fichier)
PAS_ENV = 0.005              # enveloppe : pas de 5 ms
FEN_ENV = 0.010              # fenêtre RMS de 10 ms
RECHERCHE_MAX = 0.35         # élargissement maximal d'une borne (s)
AFFINAGE = 0.015             # recentrage sur un creux voisin (± 15 ms) avant l'élargissement
SORTIE_PAROLE_DB = -25.0     # on a quitté la parole de la pièce quand l'enveloppe passe sous −25 dB…
ENTREE_PAROLE_DB = -20.0     # … et on s'arrête si elle repasse au-dessus de −20 dB (parole de la prise voisine)


def charge(f, sr=44100):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(b, np.float32)


def segments(x, sr=44100, seuil_db=-38, min_sil=0.22):
    h = int(sr * 0.01); n = len(x) // h; e = np.sqrt(np.mean(x[:n * h].reshape(n, h) ** 2, 1) + 1e-12); db = 20 * np.log10(e)
    ref = np.percentile(db, 95); on = db > ref + seuil_db - (-0)  # relatif
    on = db > (ref - 30)
    segs = []; i = 0
    while i < n:
        if on[i]:
            j = i
            while j < n:
                k = j
                while k < n and not on[k]: k += 1
                if k >= n: break
                if (k - j) * 0.01 >= min_sil and not on[j]: break
                j = k + 1 if k == j else k
                while j < n and on[j]: j += 1
            segs.append((i * 0.01, j * 0.01)); i = j
        i += 1
    return segs


# ----------------------------------------------------------------------------------------------
# V9.2 : bornes à −48 dB
# ----------------------------------------------------------------------------------------------
def enveloppe_db(x, sr, ref_db=None):
    """Enveloppe RMS (fenêtre 10 ms, pas 5 ms) en dB relatifs à ref_db (par défaut : crête de l'enveloppe du signal).
    Retourne (instants des centres de fenêtre, dB relatifs, ref_db)."""
    h, w = int(PAS_ENV * sr), int(FEN_ENV * sr)
    c = np.concatenate([[0.0], np.cumsum(np.asarray(x, float) ** 2)])
    i = np.arange(0, max(1, len(x) - w), h)
    e = 10 * np.log10((c[np.minimum(i + w, len(x))] - c[i]) / w + 1e-14)
    if ref_db is None:
        ref_db = float(e.max())
    return (i + w / 2) / sr, e - ref_db, ref_db


def niveau(ts, e, t):
    j = int(np.clip(np.searchsorted(ts, t), 0, len(e) - 1))
    return float(e[j]), j


def corriger_borne(ts, e, t, sens, seuil=SEUIL_SILENCE_DB):
    """Borne t (s) d'une pièce ; sens = −1 pour un début (on élargit vers la gauche), +1 pour une fin (vers la droite).
    1. borne déjà sous le seuil → inchangée ;
    2. recentrage sur un creux à ± 15 ms (si plus bas de 1 dB : la borne était sur le flanc d'un creux) ;
    3. marche vers l'EXTÉRIEUR de la pièce (élargissement), au plus 0,35 s : premier point sous le seuil (vrai silence) ;
       sinon, une fois sortie de la parole de la pièce (< −25 dB), arrêt dès que l'enveloppe repasse au-dessus de −20 dB
       (parole de la prise voisine) et borne au point le plus bas traversé (creux de la jonction).
    Retourne (t_corrigé, rapport)."""
    l0, j0 = niveau(ts, e, t)
    if l0 <= seuil:
        return t, {'borne': t, 'corrigee': t, 'niveau_db': round(l0, 1), 'statut': 'silence'}
    pas = max(1, int(round(AFFINAGE / PAS_ENV)))
    a, b = max(0, j0 - pas), min(len(e), j0 + pas + 1)
    jm = a + int(np.argmin(e[a:b]))
    if e[jm] < l0 - 1.0:
        j0 = jm
    # borne posée au fond d'un creux étroit entre deux syllabes fortes (jonction de prises sans silence) : on la garde
    v = max(1, int(0.010 / PAS_ENV))
    o0, o1 = (j0 + sens, j0 + sens * int(0.040 / PAS_ENV))
    dehors = e[min(o0, o1):max(o0, o1) + 1] if 0 <= min(o0, o1) and max(o0, o1) < len(e) else e[j0:j0 + 1]
    if e[j0] <= float(e[max(0, j0 - v):j0 + v + 1].min()) + 0.5 and float(dehors.max()) >= max(e[j0] + 8.0, ENTREE_PAROLE_DB):
        return t, {'borne': t, 'corrigee': t, 'niveau_db': round(l0, 1), 'niveau_corrige_db': round(float(e[j0]), 1),
                   'statut': 'jonction_sur_place'}
    jmin, j = j0, j0
    nmax = int(RECHERCHE_MAX / PAS_ENV)
    statut, sorti = 'creux', e[j0] < SORTIE_PAROLE_DB
    for _ in range(nmax):
        j += sens
        if j < 0 or j >= len(e):
            break
        if e[j] <= seuil:
            jmin, statut = j, 'elargie_silence'
            break
        if e[j] < SORTIE_PAROLE_DB:
            sorti = True
        if sorti and e[j] > ENTREE_PAROLE_DB:                       # on entre dans la parole de la prise voisine
            break
        if e[j] < e[jmin]:
            jmin = j
    tc = float(ts[jmin]) + (sens * PAS_ENV if statut == 'elargie_silence' else 0.0)
    if statut == 'creux' and abs(tc - t) < 1e-9:
        statut = 'creux_sur_place'
    return tc, {'borne': t, 'corrigee': round(tc, 3), 'niveau_db': round(l0, 1), 'niveau_corrige_db': round(float(e[jmin]), 1),
                'statut': statut}


def controler_coupures(source_env, placee_env, seuil=SEUIL_SILENCE_DB, marge_db=10.0, bord=0.03, duree_min=0.015, tolerance=0.025):
    """Aucune coupure interne : là où la prise SOURCE parle (au-dessus du seuil), la prise PLACÉE (même axe temporel, après
    compensation de l'atempo) ne doit ni tomber sous le seuil ni perdre plus de marge_db pendant au moins duree_min, hors
    bords (fondus). La source est prise à son MINIMUM sur ± tolerance (la carte temporelle de l'atempo WSOLA n'est pas
    exactement linéaire : un flanc de syllabe décalé de 10 ms n'est pas une coupure). Retourne les zones fautives [(i0, i1)]."""
    n = min(len(source_env), len(placee_env))
    from scipy.ndimage import minimum_filter1d
    s = minimum_filter1d(np.asarray(source_env[:n], float), size=2 * int(round(tolerance / PAS_ENV)) + 1, mode='nearest')
    p = placee_env[:n]
    nb = int(bord / PAS_ENV)
    faute = (s > seuil) & ((p <= seuil) | (p < s - marge_db))
    faute[:nb] = False
    faute[max(0, n - nb):] = False
    zones, i = [], 0
    while i < n:
        if faute[i]:
            j = i
            while j < n and faute[j]:
                j += 1
            if (j - i) * PAS_ENV >= duree_min:
                zones.append((i, j))
            i = j
        i += 1
    return zones


def harmoniser_jonctions(bornes, enveloppes, seuil=SEUIL_SILENCE_DB, ecart_max=0.6):
    """bornes : liste de dicts {id, fichier, debut, fin} (bornes déjà corrigées), enveloppes : {fichier: (ts, e)}.
    Deux pièces consécutives dont les bornes élargies se CROISENT : jonction commune au creux le plus bas du chevauchement.
    Deux pièces consécutives d'une même prise séparées par une zone NON silencieuse (aucun point sous le seuil) : la zone
    est rattachée à la pièce suivante (son début recule jusqu'à la fin de la précédente) — rien n'est jeté entre deux prises
    collées (souffle ou consonne d'attaque). Modifie bornes en place et retourne la liste des rattachements."""
    faits = []
    par_fichier = {}
    for b in bornes:
        par_fichier.setdefault(b['fichier'], []).append(b)
    for fic, lst in par_fichier.items():
        ts, e = enveloppes[fic]
        lst = sorted(lst, key=lambda b: b['debut'])
        for a, b in zip(lst, lst[1:]):
            if b['debut'] < a['fin'] - 1e-6 and b['debut_json'] >= a['fin_json'] - 0.02:
                # deux élargissements se croisent (la borne commune du JSON tombait dans un mot) : jonction au creux le plus bas
                i0, i1 = np.searchsorted(ts, b['debut']), np.searchsorted(ts, a['fin'])
                tj = float(ts[i0 + int(np.argmin(e[i0:i1 + 1]))])
                faits.append({'piece': b['id'], 'piece_precedente': a['id'], 'chevauchement': [round(b['debut'], 3), round(a['fin'], 3)],
                              'jonction': round(tj, 3), 'zone_db_min': round(float(e[i0:i1 + 1].min()), 1), 'debut_apres': round(tj, 3)})
                a['fin'] = b['debut'] = tj
                continue
            g = b['debut'] - a['fin']
            if 1e-6 < g <= ecart_max:
                i0, i1 = np.searchsorted(ts, a['fin']), np.searchsorted(ts, b['debut'])
                if i1 > i0 and float(e[i0:i1].min()) > seuil:
                    faits.append({'piece': b['id'], 'debut_avant': round(b['debut'], 3), 'debut_apres': round(a['fin'], 3),
                                  'zone_db_min': round(float(e[i0:i1].min()), 1)})
                    b['debut'] = a['fin']
    return faits


def rapport_bornes(chemin_json, racine, sr=48000):
    with open(chemin_json, encoding='utf-8') as f:
        pieces = json.load(f)['pieces']
    cache = {}
    for p in pieces:
        for fic, a, b in p['morceaux']:
            if fic not in cache:
                x = charge(os.path.join(racine, fic), sr).astype(float)
                cache[fic] = enveloppe_db(x, sr)[:2]
            ts, e = cache[fic]
            ca, ra = corriger_borne(ts, e, a, -1)
            cb, rb = corriger_borne(ts, e, b, +1)
            print('%-12s %-16s début %.3f→%.3f (%s, %+.1f dB) | fin %.3f→%.3f (%s, %+.1f dB)' % (
                p['id'], os.path.basename(fic), a, ca, ra['statut'], ra.get('niveau_corrige_db', ra['niveau_db']),
                b, cb, rb['statut'], rb.get('niveau_corrige_db', rb['niveau_db'])))


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--bornes':
        rapport_bornes(sys.argv[2], os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[2])), '..')))
    else:
        for f in sys.argv[1:]:
            x = charge(f); s = segments(x)
            print(f, len(x) / 44100, [(round(a, 2), round(b, 2)) for a, b in s])
