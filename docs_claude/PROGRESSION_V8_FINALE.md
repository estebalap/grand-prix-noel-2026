# PROGRESSION — V8 FINALE « Grand Prix de Noël » (92 s)

Dossier : `Intro_3D/v8_finale/` (la V7 reste en archive et n'est qu'importée). Aucun fichier de `shared/` modifié.

## Constat de départ (V7.1)
3D propre mais « usine à gaz » : jauges de télémétrie, tableau des paris illisible, 42 s d'écuries, salon de Noël perdu.

## Organisation
- **Chef de régie** : contrat `data/plan_v8.json` (92 s), `noyau_v8.js` (segments indépendants, état remis à chaque image,
  HUD sur toile logicielle, `statsHUD()` qui mesure surface d'UI / zone sacrée / nombre de textes), `render_v8.py`
  (planche stricte 20 clés 1920×1080 avec verdict automatique, déterminisme, vidéo).
- **Agent-Salon-Et-Bascule** → `seg_salon.js`, `salon_bascule.js` : salon de `src/decors/salon.js`, travelling chaud,
  un seul titre « 23 DÉCEMBRE · ÉDITION NOËL », le tapis rouge s'ouvre en deux sur un puits arc-en-ciel → plongée vers le Ring.
- **Agent-Select-Screen-15-Ecuries** → `seg_ecuries.js`, `ecuries_bandeau.js` : 15 × 2,0 s, poursuite rapprochée dans le
  monde natif, passage de portail à debut + 0,8 s, drift dans le Ring ; bannière bas-gauche (#NN, NOM, pilote · bolide), ≤ 8 % d'écran.
- **Agent-Folie-Piste-Et-Paris** → `seg_folie.js`, `folie_*.js` : smartphone 3D (QUI VA GAGNER ? + 3 boutons), 40 pièces,
  carnet ; meute, caisses, F1 + Batmobile, 6 pièges réels de l'Arsenal en carambolages cartoon, règle des 41 mm,
  sprint de 15 bolides, photo-finish, carte finale.
- **Agent-Audio-Medley-Punchy** → `sound_v8.py` : boîte à musique + feu, sub-drop du tapis, 15 extraits réels à 2 s
  (« Select ! » arcade original), pièces, moteurs CC0, boings/explosions, crescendo ; 9 phrases de voix off ; −16 LUFS.

## Pièges : écart assumé
Le brief citait « Ressort, Bombe, Aimant, Glace » : ces pièges n'existent pas dans `shared/arsenal3d.js` (source de vérité).
Retenus : La Bascule, La Pelote, L'Obus, Le Curling, Le Boulet, Le Bowling.

## Contrôle du Chef (droit de veto)
Planche `sorties/planche_v8_controle_strict.png` : 2 rejets visuels au 1er passage (boss trop lointain ; écurie #08 trop
petite et noyée dans le décor, panneau coupé sur #05) → corrigés par les agents. 2ᵉ passage : 20/20 conformes, zéro jauge,
UI max 7,9 % (écuries) / 2,4 % (course), zéro empiètement central hors carte finale, ≤ 3 textes, déterminisme identique,
console 0 erreur. Détails : `sorties/controle_v8.json`.

## Commandes
```bash
python3 Intro_3D/v8_finale/sound_v8.py                    # audio/mix_v8.wav (ignoré par git) + data/timeline_v8.json
python3 Intro_3D/v8_finale/render_v8.py --controle        # planche stricte + contrôle
python3 Intro_3D/v8_finale/render_v8.py --video --largeur 960 --fps 24 --images /tmp/v8   # vidéo (reprise possible)
py -3 Intro_3D\v8_finale\render_v8.py --video --gpu --largeur 1920 --fps 60               # PC : 1080p60 avec la carte graphique
```
