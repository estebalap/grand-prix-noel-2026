# V9.1 RING — « Grand Prix de Noël » en 113,6 secondes

Dossier : `Intro_3D/v9_ring/` (la V8 `v8_finale/` est une archive : on l'importe, on ne la modifie pas).
Contrat de temps : `data/plan_v9.json` (source unique image + son). Orchestrateur : `noyau_v9.js` (copie du noyau V8 + segments
multi-plages + contrôle de collisions). Carte du temps V9.1 : `segments[].remap` (temps film → temps interne par morceaux : ouverture resserrée à 12,6 s, familles en 3 × 3 s). Page : `index.html` (`?seg=arene`, `?plan=data/plan_test_telephone.json`, `?t=40`).

| Segment | Fichiers | Temps film | Contenu |
|---|---|---|---|
| ouverture | `seg_ouverture.js`, `ouverture_tele.js`, `ouverture_spectacle.js` | 0 → 12,6 s | feu de cheminée sur la télé dans le noir, étincelle, guirlandes, LOGO officiel, trappe du tapis, plongée vers la lumière de l'arène |
| arene | `seg_arene.js`, `arene_*.js`, `telephone_v9.js` | 12,6 → 81,6 puis 90,6 → 113,6 s | arène façon ring (hommage original), 15 entrées sautées par-dessus les cordes → couronne autour du logo, téléphone Pocket Pit (vraies pages connectées), conteneur Lootbox Fret d'où sort la VRAIE Coupe Arc-en-Ciel (STL du Panthéon), « GLOIRE… ÉTERNELLE » en deux frappes, départ sur la piste 5 voies, logo final |
| familles | `seg_familles.js`, `familles_*.js` | 81,6 → 90,6 s | Batmobile 1989 sur un toit de Gotham, 5 F1 sur la ligne arc-en-ciel, Tokyo cyberpunk (TK01, TK02, TK04, TK05 ; jamais TK06) |
| son | `sound_v9.py` → `audio/mix_v9.wav` | 0 → 113,6 s | feu de cheminée net, voix Commentateur def (`voix_off/`, `data/voix_v9.json`), Ring music en continu du logo (6,8 s) à la fin, plus aucun son d'écurie, « gloire… ÉTERNELLE » traité façon stade |

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
