# Intro V6 « L'Hybride Ultime » — storyboard et mode d'emploi

> Version 6 de l'intro 3D du Grand Prix de Noël. Tout est dans `00_Lab_Vision_2.0\Intro_3D\` (fichiers `*_v6`, dossier `audio_v6\`).
> Aucun fichier v5 ni de l'application n'est modifié : la V6 les **lit** (voix, thèmes, banque BBC, concept-cars, modèles m3d).
> Durée : **148.2 s** (57 plans, 35 impacts caméra après fusion).

## La formule

**Énergie et 3D de la Version 1** (caméra qui plonge, invocations, vrais bolides) **+ lisibilité de la Version 2** (fiches d'écuries, stats, tableau des paris, salon clair) **+ un son continu**.

## Ce qui change par rapport à la v5

| Défaut v5 (audit) | Correction V6 |
|---|---|
| Extraits d'écuries coupés au couteau (fondus linéaires 20 / 80 ms) | Fondu d'entrée **sin(θ) 150–220 ms pris dans l'amorce du fichier**, sortie **cos(θ) 250–350 ms**, **passe-haut 160 Hz** fondu sur les 200 dernières ms, **washout** de réverbération de 0,25 s |
| Aucune transition, whoosh qui tombait dans la fin de l'extrait précédent | **Riser stéréo filtré 200 Hz → 4,2 kHz** (a − 0,35 → a + 0,05 s) + **sub-drop à phase intégrée 110 → 34 Hz** sur l'impact ; whoosh parasite supprimé |
| Guitare mi mineur sous les thèmes (bouillie harmonique) | Groove de l'appel sur un bus à part : **pulse sub-bed < 140 Hz** pendant chaque signature, guitare de retour entre les noms |
| Pompage : 90 bosses de gain pendant l'appel | **Sidechain lissé** (anticipation 40 ms, attaque 50 ms, relâchement 450 ms, tenue 250 ms) : **3** bosses (les respirations voulues sur « le groupe A / B / C ») |
| Voix hachée (fondus 12 ms, coupes qui mordent les mots) | Coupes cherchées **entre** le dernier mot et l'attaque suivante, fondus cosinus 35 ms, lit d'ambiance continu : 0 zéro numérique dans le mix |
| Salon noir (réflexions coupées, vignette 0,75) | `scene.environment` toujours actif, appoint chaud, vignette 0,38, expositions recalées |
| 3 coups de caméra en < 250 ms, FOV +22 %, tremblement aléatoire 60 Hz, double secousse et double flash | **1 impact par écurie** (le même que le son), fusion < 0,45 s, FOV ≤ +8 %, **ressort critique ζ = 1 à 8 Hz**, flash ≤ 0,35, aberration et flou radial limités à 120 ms |
| Caméra qui tourne sans arrêt, aucun plateau de lecture | **Swoop-and-Hold** : swoop d'entrée, hold à −88 % (horizon 0°, cadrage 2/3 – 1/3), whip de sortie ; raccord dans l'axe pour les écuries longues |
| Pas de HUD lisible | **HUD broadcast** rendu après le post-traitement : carte d'écurie (n°, logo, nom, pilote, concept-car, devise, jauge STYLE), bandeaux de groupes, stats, univers, **tableau des paris** (« Sans téléphone ? Pariez au carnet ! ») |
| 320 confettis + 120 fumées + 6 flammes + disque opaque par écurie, fumée 220 px, deux foules | Seule l'invocation signature brille ; fumée plafonnée à **75 px (à 1080p)**, alpha ×0,7 ; une seule foule ; logos en sprite (plus jamais à l'envers), seulement sur le plan large |
| Écurie 3 : stroboscope plein écran 12 Hz | Faisceaux de concert localisés + arcs électriques jaunes / blancs autour de l'Hyper-Optic 24 H, exposition stable |
| Écurie 5 : burnout qui vibre en l'air, cadrage perdu | Chute parabolique propre (45 cm), aucune vibration en l'air, **squash & stretch** à l'atterrissage (= l'impact), caméra qui suit le bond |
| Écurie 9 : comète partie avant la coupe | La comète part à **l'ouverture du hold** et plonge jusqu'à l'onde de choc |
| 15 bolides du pool des caisses (divulgâchage) + 52 boîtes grises au parc | **15 concept-cars du Showroom** (`buildConceptCar`, échelle 2,55, `tick(t)`, jantes qui tournent) + **52 bolides m3d différents** au parc fermé, 0 boîte |
| Grain 0,04–0,06, lignes de balayage 0,025 | Grain 0,018, balayage 0,005 |

## Les signatures (bande-son V6)

| N° | Écurie | Extrait | Créneau (s) | Amorce fondue (s) | Impact (s) |
|---|---|---|---|---|---|
| 1 | Petite Mimine Racing | 01_jerry_reed_country.mp3 | 23.34 → 27.95 | 0.22 | 25.64 |
| 2 | Twingo Oasis V16 Racing | 02_candy_crush_sweet.mp3 | 29.83 → 31.73 | 0.00 | 30.02 |
| 3 | Optic-Breuillet Racing | 03_blur_song_2_woohoo.mp3 | 33.00 → 36.00 | 0.22 | 33.23 |
| 4 | Tata Freddy Motorsport | 04_balatro_theme.mp3 | 37.73 → 40.73 | 0.00 | 37.99 |
| 5 | Super Mario Pression | 05_mario_fall_waaah.mp3 | 42.41 → 45.41 | 0.00 | 44.60 |
| 6 | Scuderia Symphonie E-Tech | 06_peter_fox_alles_neu_symphonie.mp3 | 48.13 → 51.13 | 0.22 | 48.22 |
| 7 | Yaris 2 Invincible | 07_zelda_item_get.mp3 | 52.64 → 55.04 | 0.22 | 52.80 |
| 8 | A4 Oil Leaking | 08_metroid_item_acquisition.mp3 | 57.03 → 60.03 | 0.10 | 57.07 |
| 9 | Titou Wyvern SRT | 09_mh_valstrax_roar.mp3 | 61.90 → 64.90 | 0.20 | 62.23 |
| 10 | Doom Slayer Issue GP | 10_berserk_guts_theme.mp3 | 66.99 → 69.99 | 0.22 | 68.76 |
| 11 | Milo's princess Vroom Vroom | 11_rosalina_harmonie_victory.mp3 | 73.09 → 76.09 | 0.00 | 73.19 |
| 12 | Bob's Bizarre Racing | 12_jojo_kakyoin_rero.mp3 | 77.75 → 80.75 | 0.10 | 77.96 |
| 13 | Jojo la Sirène Veloce | 13_tokyo_drift_drumroll.mp3 | 82.48 → 85.48 | 0.00 | 82.54 |
| 14 | Ninja-Nissan Street Racing | 14_splatoon_booyah.mp3 | 87.13 → 88.23 | 0.22 | 87.21 |
| 15 | Princess Blooming Speed | 15_daisy_hi_im_daisy.mp3 | 90.86 → 91.84 | 0.00 | 90.91 |

## Lancer sur le PC

1. `audio_v6\LANCER_V6.bat` : télécharge la banque BBC dans `audio_v5\sons_reels` (une fois) et fabrique `audio_v6\audio\mix_v6.wav` + `rapport_v6.json`. **Le mix est déjà fourni.**
2. `LANCER_ANIMATIC_V6.bat` : régénère le découpage, puis :
   - **1** : l'intro dans Chrome, avec le son (Espace, ← →, PgPréc / PgSuiv, M) ;
   - **2** : planche (1 image par plan) + planche de **contrôle v5 / V6** + déterminisme + erreurs console ;
   - **3** : la vidéo **1920 px, 60 i/s**, avec le son (`sorties\intro_v6_hybride.mp4`), rendue sur ta carte graphique.
   Option : `capturer_animatic_v6.py --video --debut 21 --fin 48 --sortie extrait.mp4` pour un extrait.

## Fichiers V6

| Fichier | Rôle |
|---|---|
| `audio_v6/sound_v6.py` | Bande-son V6 (lit `audio_v5` en lecture seule) ; diagnostic de pompage dans `rapport_v6.json` |
| `outils/generer_plans_v6.py` | Découpage Swoop-and-Hold, impacts fusionnés, HUD par plan ; contrôles (trous, chevauchements, impacts dans le hold, ratio 12 %, horizon 0°) |
| `src/film_v6.js` | Le film (fonction pure du temps) |
| `src/hud_v6.js` | Couche HUD broadcast, rendue après le post-traitement |
| `src/bolides_reels_v6.js` | Concept-cars du Showroom + modèles m3d ; roues et `tick(t)` en absolu |
| `src/invocations_v6.js` | Invocations décongestionnées (écuries 3, 5, 9 corrigées) |
| `src/decors/habillage_v6.js` | Foule unique, fumée ≤ 75 px à 1080p |
| `src/post_v6.js` | Post-traitement « cinéma propre » |
| `outils/capturer_animatic_v6.py` | Planches, contrôle v5 / V6, déterminisme, vidéo |

## Découpage (généré)

| Plan | Temps (s) | Contenu | HUD |
|---|---|---|---|
| S1 | 0.00 → 1.20 | Une goutte d'huile tombe sous l'A4 remorquée (écurie 8) | — |
| S2 | 1.20 → 3.40 | Au ras du tapis : les miniatures sous la lumière du salon | — |
| S3 | 3.40 → 4.60 | La télé s'allume : reflet bleu sur les carrosseries | — |
| S4 | 4.60 → 7.60 | Le salon complet : canapé, tapis rouge, télé, cheminée, sapin | — |
| S5 | 7.60 → 9.06 | Le salon s'enfonce : le tapis devient le ring | — |
| S6 | 9.06 → 9.14 | Noir | — |
| A1 | 9.14 → 10.98 | ARÈNE ! burnout dans la fumée, flammes, pyros | — |
| A2 | 10.98 → 12.21 | « Quinze écuries ! » : travelling au ras des 15 concept-cars | stat |
| A3 | 12.21 → 13.63 | « Des DIZAINES de bolides ! » : le parc fermé (vrais modèles m3d) | stat |
| A4 | 13.63 → 15.81 | « Cinq voies… » : passages au ras de la caméra | stat |
| A5 | 15.81 → 17.39 | « …une seule place… » : arrêt sur image | stat |
| A6 | 17.39 → 19.13 | « …sur le TRÔNE ! » : la couronne, pluie de confettis | — |
| R0 | 19.13 → 21.93 | « Dans le coin rouge… le groupe A ! » | groupe |
| R01 | 21.93 → 25.01 | Écurie 1 — swoop, hold de lecture, whip (1/2) | ecurie |
| R01a | 25.01 → 28.09 | Écurie 1 — raccord dans l'axe (plus serré), puis whip | ecurie |
| R02 | 28.09 → 31.88 | Écurie 2 — swoop, hold de lecture, whip | ecurie |
| R03 | 31.88 → 36.15 | Écurie 3 — swoop, hold de lecture, whip | ecurie |
| R04 | 36.15 → 41.01 | Écurie 4 — swoop, hold de lecture, whip | ecurie |
| R05 | 41.01 → 45.94 | Écurie 5 — swoop, hold de lecture, whip | ecurie |
| RB | 45.94 → 46.88 | « Le groupe B ! » | groupe |
| R06 | 46.88 → 51.37 | Écurie 6 — swoop, hold de lecture, whip | ecurie |
| R07 | 51.37 → 55.13 | Écurie 7 — swoop, hold de lecture, whip | ecurie |
| R08 | 55.13 → 60.17 | Écurie 8 — swoop, hold de lecture, whip | ecurie |
| R09 | 60.17 → 65.12 | Écurie 9 — swoop, hold de lecture, whip | ecurie |
| R10 | 65.12 → 67.82 | Écurie 10 — swoop, hold de lecture, whip (1/2) | ecurie |
| R10a | 67.82 → 70.52 | Écurie 10 — raccord dans l'axe (plus serré), puis whip | ecurie |
| RC | 70.52 → 71.31 | « Le groupe C ! » | groupe |
| R11 | 71.31 → 76.29 | Écurie 11 — swoop, hold de lecture, whip | ecurie |
| R12 | 76.29 → 80.99 | Écurie 12 — swoop, hold de lecture, whip | ecurie |
| R13 | 80.99 → 85.62 | Écurie 13 — swoop, hold de lecture, whip | ecurie |
| R14 | 85.62 → 89.00 | Écurie 14 — swoop, hold de lecture, whip | ecurie |
| R15 | 89.00 → 91.99 | Écurie 15 — swoop, hold de lecture, whip | ecurie |
| R16 | 91.99 → 93.27 | Les 15 concept-cars : grue au-dessus du ring, déluge de confettis | stat |
| U0 | 93.27 → 96.39 | « Mais attention… ils ne viennent pas seuls ! » | — |
| G1 | 96.39 → 100.74 | GOTHAM : la Batmobile sort du brouillard | univers |
| G2 | 100.74 → 103.23 | « …la NUIT. » : éclair, chauves-souris | — |
| G3 | 103.23 → 105.19 | « …quelqu'un rit. » : une ombre, rien de plus | — |
| F1 | 105.19 → 107.00 | FORMULE 1 : la voie des stands | univers |
| F1b1 | 107.00 → 107.63 | « Box, box » (1/4) : caméra embarquée | — |
| F1b2 | 107.63 → 108.11 | « Box, box » (2/4) : caméra embarquée | — |
| F1b3 | 108.11 → 108.58 | « Box, box » (3/4) : caméra embarquée | — |
| F1b4 | 108.58 → 110.12 | « Box, box » (4/4) : caméra embarquée | — |
| F2 | 110.12 → 111.19 | « Pneus tendres, on ATTAQUE ! » | — |
| AP1 | 111.19 → 114.53 | APOCALYPSE : terres brûlées, l'Épave N12 (v9) | univers |
| AP2 | 114.53 → 116.59 | « Soyez TÉMOINS ! » : saut, explosion, le luminaire tombe | — |
| C1 | 116.59 → 119.97 | « Ouvrez les caisses… découvrez vos bolides… » | univers |
| C2 | 119.97 → 121.77 | « …les modèles UNIQUES ! » : faisceaux de rareté | stat |
| C3 | 121.77 → 123.79 | « …chante dans le noir… » : silhouette dans l'ombre | — |
| P1 | 123.79 → 124.77 | « Des PIÈGES ! » : la peau de banane | stat |
| P2 | 124.77 → 125.75 | « Des TRAHISONS ! » : la carapace | stat |
| P3 | 125.75 → 129.19 | « …paris en direct… ou à l'ancienne ! » : tableau des cotes | paris |
| GL | 129.19 → 133.27 | « …la gloire ÉTERNELLE ! » : la Coupe arc-en-ciel | univers |
| T1 | 133.27 → 136.10 | « Le GRAND PRIX… DE NOËL ! » : les mots slamment | — |
| T2 | 136.10 → 137.98 | « 23 décembre ! » : les 15 concept-cars derrière la meute | — |
| T3 | 137.98 → 141.11 | « Préparez-vous… à VROMBIR ! » : les 5 feux | — |
| T4 | 141.11 → 142.73 | « Que le spectacle… COMMENCE ! » : départ dans la fumée | — |
| SF | 142.73 → 148.19 | Retour au salon : la télé affiche le logo | — |

## Limites connues

- Extraits musicaux des écuries et sons BBC : usage privé pour la soirée familiale uniquement (pas de publication en ligne).
- Les cotes du tableau des paris sont des **exemples** (indiqué à l'écran).
- L'aperçu cloud est rendu sans carte graphique (SwiftShader) ; la vidéo finale 1920 px / 60 i/s se rend sur ton PC (choix 3).
