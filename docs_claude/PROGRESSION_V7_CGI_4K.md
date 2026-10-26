# PROGRESSION — Trailer CGI 4K V7 « MULTIVERSE TO RING ARENA »

Dossier : `Intro_3D/v7_multivers_4k/` (nouveau, rien d'archivé n'a été modifié : `film_v5.js`, `film_v6.js` intacts).
Aucun fichier de `shared/` n'a été modifié → rien à reporter dans `3_Application/web/shared/`.

## V7.1 — Polissage chirurgical (26 octobre 2026)

Mission `<mission_v7_1_surgical_polish>` : 5 correctifs. Aucun fichier de `shared/` modifié (tout l'étalonnage est fait
dans `v7_multivers_4k/` sur les instances de décor) → rien à reporter dans `3_Application/web/shared/`.

### C1 — Mondes de nuit, plus aucun ciel délavé

| Cause racine (vérifiée sur image) | Correctif |
|---|---|
| Les dômes de ciel de `decors3d.js` (uniformes `cTop/cMid/cBas`) servent AUSSI de sol lointain : leur bas sable/pastel faisait les plans beiges. Les couleurs sont lues en **linéaire** (encodage sRGB en fin de post) : un plafond « à l'œil » ne suffisait pas | `assombrirCiel()` (mondes_et_portails.js) : mélange 45 % vers la couleur de nuit du monde (`MONDES[k].ciel`, 15 teintes du cahier des charges, converties sRGB → linéaire), puis plafond de luminance **linéaire** par bande (0,006 / 0,016 / 0,035). Idempotent : repart des couleurs d'origine mémorisées |
| Façades, tribunes, cycloramas de jour éclairés pleins feux | `plafonnerSurfaces()` : luminance des matériaux plafonnée (0,12, 0,05 pour château et scène symphonique), grands panneaux opaques en shader assombris une seule fois (`userData.plafondV71`) |
| `scene.background` jamais rétabli | `masquer()` remet `FOND_NUIT` à chaque image ; phase A : `scene.background = brouillard = MONDES[k].ciel`, densité `min(0,0016 ; d × 0,32)` |
| Lumières globales trop fortes dans les mondes | Acte II phase A et acte IV : hémisphère 0,14, clé 0,20 (les décors s'éclairent eux-mêmes) |
| **Gotham** : sol marron (dôme), pluie rouge (ambiance B16), tache blanche devant la Batmobile = reflet de Fresnel de l'environnement néon au ras du sol, puis reflet miroir des deux directionnelles du décor (arrivant face caméra à ~20°) ; réverbères posés sur la spline alors que la Batmobile roule 100 unités plus loin (trajectoire prolongée) | `nuitDeGotham()` : chaussée mouillée 0x060a14, rugosité 0,14, métal 0,45, **sans** carte d'environnement ; directionnelles relevées à ~70° (reflet sous le cadre), lumières chaudes → 0x5b8cff ; 4 réverbères bleu-cyan placés là où la Batmobile passe réellement (`cG.pose`), pluie argentée fine centrée sur le trajet filmé ; fond 0x040814 ; éclair d'orage bleuté et 3× moins voilant |
| **Apocalypse** beige-orange | dôme assombri vers #140603, surfaces plafonnées 0,10, brume #1a0804 |

### C2 — Les 10 pièges de l'acte V

- Cause racine du **voile gris-beige** : le « flash de contact » passait par le flash plein écran du post, ajouté en HDR à
  tout le cadre (0,05 × 3 en linéaire ≈ 0,27 sRGB partout). Remplacé par une **lueur locale** (lampe ponctuelle chaude au
  nez du bolide, impulsion gaussienne de 80 ms). Hémisphère 0,03 / clé 0,06 dans le labo (0,12 grisait tout).
- Labo cyber-mécanique : fond 0x050712, tunnel de 10 arches (acier sombre + liseré cyan/violet) à x = −72 + 16 k (aucune
  ne passe entre la caméra et le piège), 3 lumières dédiées (projecteur en surplomb, contre-jour cyan, remplissage violet),
  sol mat, voies de la notice assombries (verre quasi invisible), exposition 0,74.
- Contact bolide-piège à **u = 0,48** du plan (`tl === hit`), caméra ¾ plongée
  `p: [hx − 14 + 5u, 9,5 − 1,2u, 13,5·côté], c: [hx + 1, 2,4, 0], fov 32`. Vérifié sur la planche : la Herse, la Bascule
  (planche sous le bolide), la Pelote, le Balancier et le Bowling sont cadrés au contact, aucun pilier ne les masque.

### C3 — Le vrai son

`sound_v7_crescendo.py` : **15 écuries réelles, 0 synthétisée** (extraits de `../audio_v5/themes_ecuries`), éclat calé sur
`impact` ; écurie 1 = country −7 dB + voix cassée de Mimine (éclat à 2,54 s dans l'extrait) ; écurie 5 = cri de Mario +
`mario_chute_B.mp3` aligné saut/atterrissage ; fondu d'entrée sinus 180 ms (anticipation 120 ms), sortie cosinus 280 ms,
bass-swap HPF 150 Hz, lavage de réverbe 250 ms. Voix off (`vo_v4_prise_A.mp3` découpée mot à mot avec `mots_prise_A.json`)
sur les actes I, III, IV, V, VI : 14 phrases, sidechain attaque 40 ms / maintien 250 ms / relâche 420 ms ; marge voix/mix
de +7,5 dB (apocalypse, la plus serrée) à +20,6 dB. Mix : −16,0 LUFS, crête −4,5 dBFS. `LANCER_TRAILER_V7_4K.bat` régénère
le mix automatiquement s'il est périmé (`--si-perime`).

### C4 — Planches

`render_v7_4k.py` produit `sorties/planche_v7_multivers.png` (36 clés) **et** `sorties/planche_v7_15_ecuries_et_pieges.png`
(48 clés, 6 × 8 : les 15 écuries × monde natif + Ring, actes I et III, acte IV, 5 pièges, règle des 41 mm, tableau des paris,
parc réuni, trophée). Chaque vignette est mesurée (luminance moyenne, part de pixels clairs) ; seuil « délavé » :
luminance > 0,42 ou > 25 % de pixels clairs.

### C5 — Déterminisme et contrôle

Cinq fuites d'état trouvées par re-rendu dans l'ordre inverse (comparaison octet par octet des PNG) et corrigées :
1. **Portes du Ring** : seule la porte 1 est rallumée à l'acte I, les autres gardaient la visibilité de la dernière image
   de l'acte II → `masquer()` les éteint toutes.
2. **Cache LRU des mondes** (4 places) : un monde libéré puis reconstruit recevait de nouveaux identifiants d'objets et de
   matériaux → ordre de tri du rendu différent (surfaces coplanaires, transparences) → pixels différents selon l'historique.
   Les 15 mondes sont maintenant construits une fois, dans l'ordre, au chargement (`gestion.prechauffer`, ~240 Mo de tas JS).
3. **Couleur du flash du post** (et centre du flou, onde) : teintée par l'acte II, jamais rétablie → remise à zéro à chaque image.

4. **Meute réutilisée dans le labo** : les bolides de la meute (actes I et III) roulent dans l'acte V ; leur braquage et
   leur débattement de roue restaient ceux de la dernière image des actes I/III → `neutraliserRoues()` (voitures.js).
5. **HUD** : tracé directement sur la toile de sortie, le coin arrondi d'un cartel variait d'un pixel (anti-crénelage de la
   toile 2D) selon l'historique → en capture, HUD rastérisé sur une toile logicielle dédiée remise à neuf (`reset()`) puis
   collée pixel pour pixel.

### Résultats (rendu de contrôle du 26 octobre, `--controle-complet`, 960 × 540)

| Contrôle | Résultat |
|---|---|
| Déterminisme : les 48 clés re-rendues dans l'ordre INVERSE après la planche complète + 1 clé de la planche 36 | **identique** (49/49, octet par octet) |
| Plans délavés (luminance moyenne > 0,42 ou > 25 % de pixels clairs) | **aucun** sur 48 |
| Luminance moyenne des 15 mondes natifs | 0,04 à 0,28 (avant : jusqu'à 0,6, ciels pastel/sable) |
| Luminance des 15 arrivées au Ring | 0,24 à 0,40 |
| Pièges (Herse, Bascule, Pelote, Balancier, Bowling) | 0,34 à 0,36, 5 à 7 % de pixels clairs (avant : 0,45 et voile gris) |
| Gotham / Apocalypse | 0,12 / 0,11 |
| Erreurs ou alertes console | 0 |
| `qa_v7.js --l 640 --parc 6` | vert (dérive β −30,8°, contre-braquage 26,1°, déterminisme, zéro erreur) |
| Son (`timeline_v7.json`) | 15 écuries réelles, 0 synthétisée ; 14 phrases de voix off ; −16,0 LUFS, crête −4,5 dBFS |

Extraits MP4 avec le vrai mix (`sorties/`, ignorés par git, 640 px, 24 i/s) : `extrait_v71_ecuries_mimine.mp4`
(9,5 → 20,5 s : Mimine, Twingo Oasis, Optic-Breuillet), `extrait_v71_gotham.mp4` (68,8 → 75,2 s),
`extrait_v71_pieges.mp4` (88,9 → 101,2 s : les 10 pièges).

### Limites restantes

- Master 4K / NVENC non testé dans le nuage (pas de GPU) : à lancer sur le PC (`LANCER_TRAILER_V7_4K.bat`, choix 3).
- Le chargement prend ~60 s en rendu logiciel (les 15 mondes sont construits d'avance, ~240 Mo de tas JS).
- La voix off sur l'Apocalypse garde la marge la plus faible (+7,5 dB au-dessus du mix) : audible, mais c'est le plan
  le plus chargé (fumée, réacteur, carcasses).


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
| Bande-son (macro portail DSP, pouls en accelerando, 15 thèmes réels, voix off) + `timeline_v7.json` | `sound_v7_crescendo.py` | fait (V7.1 : 15 écuries réelles, 0 synthétisée, 14 phrases de voix off) |
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
5. V7.1 (26 oct.) : mondes de nuit, labo des pièges, vrai son + voix off, planche exhaustive 48 clés, 5 fuites d'état corrigées (voir section V7.1).

## Commandes

```bash
node Intro_3D/v7_multivers_4k/qa_v7.js --l 640 --parc 6              # QA headless complète
python3 Intro_3D/v7_multivers_4k/render_v7_4k.py --qualite apercu_cloud --controle-complet   # 2 planches + contrôle (48 clés en ordre inverse)
python3 Intro_3D/v7_multivers_4k/render_v7_4k.py --qualite apercu_cloud --sans-planche --extrait 9.5 20.5 --fps 24 --largeur 640
python3 Intro_3D/v7_multivers_4k/sound_v7_crescendo.py                # mix_v7.wav + data/timeline_v7.json
# PC d'Esteban : Intro_3D\LANCER_TRAILER_V7_4K.bat  (1 = temps réel, 2 = 1080p 60, 3 = MASTER 4K 60 fps)
```
