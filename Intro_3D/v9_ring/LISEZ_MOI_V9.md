# V9.2 RING — « Grand Prix de Noël » en 121,6 secondes

Dossier : `Intro_3D/v9_ring/` (la V8 `v8_finale/` est une archive : on l'importe, on ne la modifie pas).
Contrat de temps : `data/plan_v9.json` (source unique image + son). Orchestrateur : `noyau_v9.js` (copie du noyau V8 + segments
multi-plages + contrôle de collisions). Carte du temps V9.1 : `segments[].remap` (temps film → temps interne par morceaux : V9.2 : ouverture et arène en identité, familles en 3 extraits). Page : `index.html` (`?seg=arene`, `?plan=data/plan_test_telephone.json`, `?t=40`).

| Segment | Fichiers | Temps film | Contenu |
|---|---|---|---|
| ouverture | `seg_ouverture.js`, `ouverture_vortex.js` (+ `ouverture_tele.js`, `ouverture_spectacle.js`) | 0 → 6,5 s | salon de Noël chaud → 4,6 s la télé s'allume, le salon s'éteint (0,08) → 5,0–6,5 s vortex : la télé aspire la caméra (FOV 38→88→48°, roulis hélicoïdal, 340 particules néon), tunnel néon |
| arene | `seg_arene.js`, `arene_cadrages.js`, `arene_juice.js`, `arene_*.js`, `telephone_v9.js` | 6,5 → 81,6 puis 89,2 → 121,6 s | jaillissement sur le drop, 15 écuries à créneaux variables calés sur la voix et cadrages sur mesure (#02 vue de dessus, #04 boule à facettes, #10 gros plan 6 roues…), #11–#15 en smash cuts + rush de 5 × 1 s, couronne + portail, téléphone (paris), lootbox → vraie Coupe Arc-en-Ciel, GLOIRE / ÉTERNELLE, départ, logo. Ombres de contact, étincelles, secousses (trauma), bloom 0,55 |
| familles | `seg_familles.js`, `familles_*.js`, `familles_portail.js` | 81,6 → 89,2 s | Gotham → F1 → Néo-Tokyo, portails express hexagonaux + glitch de téléportation (« MAP WARP ») |
| son | `sound_v9.py` → `audio/mix_v9.wav` + `.mp3` | 0 → 121,6 s | jazz de Noël → record scratch (4,65) → riser → « ARÈNE ! » + drop 128 BPM (6,5) → Ring music fil rouge ; une prise de voix continue par pièce (`data/voix_v9.json`) ; gags moteurs au premier plan (#02 OVNI, #05 V8, #08 bips Audi + boîte de conserve, #10 6×6) ; « Le Mal Aimé » sur #04 ; casino (ka-ching, pièces, roulette) |

Le dossier `audio/` (Ring music, carillon Audi, mix) est ignoré par git : sons sous droits, à garder sur le PC.

## Commandes

```bash
python3 Intro_3D/v9_ring/sound_v9.py                                   # audio/mix_v9.wav (−16 LUFS) + data/timeline_v9.json
node Intro_3D/v9_ring/outils_v9/apercu_v9.js /tmp/apercu 20,43,110 --seg arene     # aperçu (stats UI + collisions)
python3 Intro_3D/v9_ring/render_v9.py --controle                        # sorties/planche_v9_controle_strict.png + controle_v9.json
python3 Intro_3D/v9_ring/render_v9.py --video --largeur 960 --fps 24    # sorties/trailer_v9.mp4 (cloud, SwiftShader)
py -3 Intro_3D/v9_ring/render_v9.py --video --gpu --largeur 1920 --fps 60 --sortie Trailer_GP_Noel_V9_4K.mp4   # PC + carte graphique
node Intro_3D/v9_ring/outils_v9/capturer_pit.js                         # recapture des vraies pages Pocket Pit (relais simulé)
```

Contrôle strict : 18 clés, UI ≤ 20 %, zone centrale vide (sauf carte de fin ≥ 118 s), ≤ 3 textes, 0 collision voiture/décor,
déterminisme vérifié (mêmes pixels en ordre inverse).
