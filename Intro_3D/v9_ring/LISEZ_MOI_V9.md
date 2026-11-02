# V9.3 RING — « Grand Prix de Noël » en 131 secondes

Dossier : `Intro_3D/v9_ring/` (la V8 `v8_finale/` est une archive : on l'importe, on ne la modifie pas).
Contrat de temps : `data/plan_v9.json` (source unique image + son). Orchestrateur : `noyau_v9.js` (copie du noyau V8 + segments
multi-plages + contrôle de collisions). Carte du temps V9.1 : `segments[].remap` (temps film → temps interne par morceaux : V9.2 : ouverture et arène en identité, familles en 3 extraits). Page : `index.html` (`?seg=arene`, `?plan=data/plan_test_telephone.json`, `?t=40`).

| Segment | Fichiers | Temps film | Contenu |
|---|---|---|---|
| ouverture | `seg_ouverture.js`, `ouverture_vortex.js`, `ouverture_guirlandes.js` | 0 → 11 s | crescendo : salon sombre → s'allume festivement (2–5,5 s) → 6,8 s la télé s'allume, le salon s'éteint → 7,6–11 s vrille (vortex qui accélère) → « EN ARÈNE ! » = apparition de l'arène à 11,0 |
| arene | `seg_arene.js`, `arene_cadrages.js`, `arene_juice.js`, `arene_*.js`, `telephone_v9.js` | 11 → 86,1 puis 96,1 → 131 s | jaillissement sur le drop, 15 écuries à créneaux variables calés sur la voix et cadrages sur mesure (#02 vue de dessus, #04 boule à facettes, #10 gros plan 6 roues…), zooms et rush 4 × 1,25 s sur #08, #03, #02, #10, voiture entière à l'image ≥ 85 % du créneau, couronne + portail, téléphone (paris), lootbox à suspense → vraie Coupe Arc-en-Ciel, tout s'enflamme, GLOIRE / ÉTERNELLE, départ, fin pleine (parade, trophée, feux d'artifice) sous le logo. Ombres de contact, étincelles, secousses (trauma), bloom 0,55 |
| familles | `seg_familles.js`, `familles_*.js`, `familles_portail.js` | 86,1 → 96,1 s | pause + fondu dans un Gotham nocturne → F1 → Néo-Tokyo en vraie course (virage, dépassements) ; portails express, glitch discret |
| son | `sound_v9.py` → `audio/mix_v9.wav` + `.mp3` | 0 → 131 s | « Le Mal Aimé » en crescendo dès le début (refrain 1 pile sur « EN ARÈNE ! » à 11,0), puis Ring music fil rouge ; voix continues ; moteurs réels du Showroom (`sounds/moteurs_reels`) au premier plan + bips Audi #08 ; refrain 2 sur #04 ; casino ; suspense du conteneur puis embrasement |

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
