# PROGRESSION — Trailer CGI 4K V7 « MULTIVERSE TO RING ARENA »

Dossier : `Intro_3D/v7_multivers_4k/` (nouveau, rien d'archivé n'a été modifié : `film_v5.js`, `film_v6.js` intacts).
Aucun fichier de `shared/` n'a été modifié → rien à reporter dans `3_Application/web/shared/`.

## État (dernière mise à jour : 26 octobre 2026)

| Brique | Fichier | État |
|---|---|---|
| Contrat de montage (source unique image + son) | `data/plan_v7.json` | fait |
| Physique CGI déterministe (splines Catmull-Rom analytiques, a∥, a⟂ = κv², dérive β 14–34°, contre-braquage −0,85 β, suspension ζ = 0,65 / ωn = 14 rad/s, 4 coins) | `physique_cgi.js` + `test_physique.mjs` | fait, test Node vert |
| Effets (étincelles balistiques, fumée de pneus, gomme, post-combustion) évalués dans les shaders | `effets_cgi.js` | fait |
| 15 mondes natifs + Portail (Rift Gate) + Ring commun (sol miroir obsidienne, anneau arc-en-ciel) | `mondes_et_portails.js` | fait |
| Réalisation : timeline en 6 actes, accelerando 3 vagues, caméras phase A (action, FOV 45→65°) / phase B (téléobjectif 28–32°, dolly hold, tiers gauche) | `camera_crescendo.js` | fait |
| Actes I, III, IV, V, VI (Rainbow Road 3D, meute, caisses, TK06, Gotham/F1/Apocalypse, pièges de l'Arsenal, règle des 41 mm, paris, trophée) | `actes.js` | fait |
| Post HDR (bloom dual filter, ACES, déchirure `dechirure`, onde, flou radial, sous-expositions 180°) | `post_cgi_4k.js` | fait |
| HUD broadcast vectoriel à la résolution native | `hud_broadcast_4k.js` | fait |
| Orchestrateur + page + lecteur | `film_v7.js`, `index.html` | fait |
| Bande-son (macro portail DSP, pouls en accelerando) + `timeline_v7.json` | `sound_v7_crescendo.py` | fait (mix de travail synthétisé ; vrais thèmes mixés automatiquement sur le PC) |
| Rendu 4K/1080p/aperçu + planche contact | `render_v7_4k.py`, `../LANCER_TRAILER_V7_4K.bat` | fait (4K matériel NVENC non testé ici : pas de GPU) |
| QA headless | `qa_v7.js` | vert |

## Écarts assumés par rapport au cahier des charges

- **Mondes** : les noms de décors du prompt (`stage_concert`, `col_montagne`, `space`, `volcano`…) n'existent pas dans le code (CLAUDE.md : la source de vérité est le code). Les 15 mondes utilisent les décors réels de `decors3d.js` (6 archétypes) et `decors_v5.js` (décors uniques E06, TK05, FR01…), étalonnés par l'ambiance V6 d'un bolide-ailier, plus des effets propres à chaque écurie (`FX` dans `mondes_et_portails.js`).
- **Suspension** : pilonnement, tangage, roulis, talonnage sont réels (intégration à pas fixe depuis le début du plan, fonction pure de t) ; la compression se voit par le décalage du moyeu de chaque roue dans la caisse (les pneus restent au sol).
- **Déchirure / onde** : la logique GLSL de `shared/archetypes.js` est portée dans `post_cgi_4k.js` (version HDR, les lèvres alimentent le bloom) plutôt que d'instancier `creerPost` (cible MSAA inutile en 4K).
- **Déterminisme** : `Math.random()` est remplacé par un générateur à graine pendant la construction des modèles et décors de `shared/` (textures procédurales) ; l'orage des décors est piloté par une fonction de t. Vérifié : 14 instants rendus 3 fois (avec saut ailleurs entre deux) donnent des images identiques bit à bit.
- **Aucun nombre de bolides n'est affiché** à l'écran (CLAUDE.md §1.8).

## Journal

1. Lecture de CLAUDE.md, étude trailer, API de `shared/` (concept cars, m3d, decors3d/v5, ambiances, archetypes, ouverture, arsenal3d, stage3d).
2. Contrat `plan_v7.json` ; sous-agents : audio (Python) et outil de rendu (Python + .bat), en parallèle du cœur 3D.
3. Cœur 3D écrit, premier chargement propre en 14 s ; correction colorimétrique (la scène écrit en sRGB, décodage en linéaire avant ACES) ; correction de caméra (tiers gauche), d'un défaut de déterminisme (`camera.fov` lue avant le placement de la caméra).
4. Planche contact 36 clés, extrait vidéo, QA complète, commit + push.

## Commandes

```bash
node Intro_3D/v7_multivers_4k/qa_v7.js --l 640 --parc 6              # QA headless complète
python3 Intro_3D/v7_multivers_4k/render_v7_4k.py --qualite apercu_cloud   # planche_v7_multivers.png (+ --extrait 11 17)
python3 Intro_3D/v7_multivers_4k/sound_v7_crescendo.py                # mix_v7.wav + data/timeline_v7.json
# PC d'Esteban : Intro_3D\LANCER_TRAILER_V7_4K.bat  (1 = temps réel, 2 = 1080p 60, 3 = MASTER 4K 60 fps)
```
