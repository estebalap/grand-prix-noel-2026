# Intro v5 du Grand Prix de Noël : storyboard et mode d'emploi

> Version 5 de l'intro 3D (animatic). Tout est dans `00_Lab_Vision_2.0\Intro_3D\` ; rien n'est modifié dans l'application.
> Durée : **2 min 20** (140,5 s). L'appel des écuries passe de 27 s à environ 65 s ; chaque signature est plafonnée à 2,2 s pour garder le rythme.

## Ce qui change depuis la v4 (tes retours)

| Retour | Réponse v5 |
|---|---|
| « Le début plus sombre, qu'il tease » | Le salon est **dans le noir**. On voit le clair de lune (rais de lumière et poussière en suspension), les braises de la cheminée, les guirlandes du sapin, les feux arrière des voitures. Les plans sont serrés, au ras des miniatures, et la pièce ne se révèle jamais en entier. |
| « Moins de plans larges dans l'arène » | Les cadrages sont resserrés : on est **dans le ring**, plus en tribune. Caméra portée (dérive « à l'épaule ») sur tous les plans d'arène. |
| « Le tour de l'arène fait vide » | `habillage.js` : 1 600 spectateurs qui sautent et lèvent les bras avec des bâtons lumineux, gradins, **15 bannières d'écuries** (logo et surnom), barrière LED défilante, 2 écrans latéraux, 12 lyres motorisées à faisceaux, 4 caméramans. |
| « Effets réalistes et exagérés partout » | Colonnes de flammes (6), fumées de burnout, brume, déluges de confettis, étincelles. Post-traitement de retransmission (`post_v5.js`) : bloom HDR, aberration chromatique et flou radial sur chaque impact, grain, vignette. |
| « Un thème par personnalité d'écurie » | Après chaque nom, la **signature sonore** de l'écurie (voir ci-dessous). L'image suit : coupe sur un 2ᵉ plan en orbite, la voiture fait un **burnout** sur sa place, fumée et confettis à ses couleurs, flammes, la foule se lève. |
| « Des bruits réels, pas édités » | Vrais enregistrements de la BBC, joués tels quels (seulement coupés, avec des fondus de 20 ms, et mis au niveau). Les tiens les remplacent dès que tu les déposes. |
| « Viens ici petite mimine » | **Ta voix ElevenLabs « Petite mimine »** : « Viens ici petite MI- » d'un seul trait, puis la voix se casse sur un « MEEEINE ! » étranglé et une quinte de toux. **Éclair vert** à l'image sur la cassure. |
| Écuries 5 à 15 | **Super Mario Pression** : cri de chute de dessin animé « Wooouuaaahhh ! » (ElevenLabs). **Scuderia Symphonie** : Beethoven, 5e symphonie, 78 tours de 1927 (domaine public). **A4 Oil Leaking** : deux vraies pétarades de Ford T (BBC). **Bob's Bizarre Racing** : « rero rero » par la voix du commentateur + gong. Les autres gardent leurs vrais sons BBC. |
| Twingo, Optic-Breuillet, Tata Freddy | **Twingo** : Jimmie Rodgers, « Blue Yodel No. 3 » (1928, guitare et yodel, domaine public). **Optic-Breuillet** : une frappe de Wimbledon et un vrai cri d'effort (BBC) — pour le vrai cri de Nadal, dépose `03_nadal.mp3`. **Tata Freddy** : vrai 78 tours de 1924 dont un tour de sillon saute, puis l'aiguille arrachée. |

## Les signatures d'écuries

- Fichier de réglage : `audio_v5\themes_ecuries.json`.
- **Les extraits sous droits** (OST de Valstrax, OST de Berserk, mème de Kakyoin, explosion de fleur de Daisy, Candy Crush, Zelda…) : je ne peux ni les télécharger ni les extraire moi-même.
  - Dépose tes fichiers dans `audio_v5\themes_ecuries\` sous le nom `NN_nom.mp3` (le mode d'emploi est dans le `LISEZ_MOI.md` de ce dossier).
  - Relance ensuite `audio_v5\LANCER_V5.bat`, puis `LANCER_ANIMATIC_V5.bat`.
  - La durée de chaque présentation et tout le découpage image se recalent tout seuls.
- **En attendant**, de vrais sons BBC jouent à leur place :

| Écurie | Son actuel |
|---|---|
| Titou | avion de chasse et rugissement |
| Diego | bataille à l'épée |
| Bob | fruit croqué, grondement et gong |
| Élie | « explosion musicale » et applaudissements |

## Lancer

1. `audio_v5\LANCER_V5.bat` : télécharge les sons BBC (une seule fois) et fabrique `audio\mix_v5.wav` et `audio\rapport_v5.json`.
2. `LANCER_ANIMATIC_V5.bat` : régénère le découpage à partir de la bande-son, puis propose trois choix :
   - **1** : l'animatic dans Chrome, avec le son (Espace pour lecture/pause, ← → pour avancer image par image, PgPréc/PgSuiv pour passer d'un plan à l'autre, M pour couper le son) ;
   - **2** : une planche avec une image par plan, plus le contrôle de déterminisme ;
   - **3** : la vidéo MP4 (`sorties\animatic_v5_apercu.mp4`), rendue sur ta carte graphique.

## Fichiers v5

| Fichier | Rôle |
|---|---|
| `src/film_v5.js` | Le film : une fonction pure du temps, comme en v4. Il intègre l'habillage, les effets planifiés, les burnouts de signature, la caméra portée, le post-traitement et l'éclair du sort. |
| `src/post_v5.js` | Post-traitement HDR. Une cible 16 bits flottante quand la carte le permet, 8 bits sinon. |
| `src/decors/habillage.js` | Foule, bannières, LED, lyres, flammes, fumées, confettis (arène) ; lune et poussière (salon). |
| `src/decors/arene.js` | Un seul ajout : l'écran géant expose sa texture, reprise par les écrans latéraux. |
| `outils/generer_plans_v5.py` | Le découpage (71 plans), calculé depuis `rapport_v5.json`. Il vérifie : aucun trou, aucun chevauchement, chaque signature couverte par ses plans. |
| `outils/capturer_animatic_v5.py` | La planche, le déterminisme et la vidéo. |
| `audio_v5/sound_v5.py` | La bande-son : chaque nom d'écurie, puis sa signature, puis le nom suivant. Tout ce qui suit l'appel est décalé d'autant. |

## Découpage (généré)

| Plan | Temps (s) | Contenu |
|---|---|---|
| S1 | 0.00 → 1.20 | Noir. Une goutte d'huile tombe (A4 de Lulu) |
| S2 | 1.20 → 3.40 | Au ras du tapis : des silhouettes de voitures au clair de lune |
| S3 | 3.40 → 4.60 | La télé s'allume : un reflet bleu sur les carrosseries |
| S4 | 4.60 → 7.60 | Les lumières sautent : on devine le salon par éclats |
| S5 | 7.60 → 9.06 | Le salon s'enfonce : le tapis devient le ring |
| S6 | 9.06 → 9.16 | Noir |
| A1 | 9.16 → 10.98 | ARÈNE ! burnout dans la fumée, flammes, pyros |
| A2 | 10.98 → 12.21 | « Quinze écuries ! » : travelling au ras des 15 emblèmes |
| A3 | 12.21 → 13.63 | « Des DIZAINES de bolides ! » : le parc fermé |
| A4 | 13.63 → 15.81 | « Cinq voies… » : passages au ras de la caméra |
| A5 | 15.81 → 17.39 | « …une seule place… » : arrêt sur image |
| A6 | 17.39 → 19.13 | « …sur le TRÔNE ! » : la couronne, pluie de confettis |
| R0 | 19.13 → 21.93 | « Dans le coin rouge… le groupe A ! » |
| R01 | 21.93 → 23.34 | Écurie 1 — entrée (ras du sol) |
| R01s | 23.34 → 25.71 | Écurie 1 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R01g | 25.71 → 28.09 | Écurie 1 — SIGNATURE (gros plan, la voix s'éteint) |
| R02 | 28.09 → 29.87 | Écurie 2 — entrée (travelling latéral) |
| R02s | 29.87 → 32.18 | Écurie 2 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R03 | 32.18 → 33.34 | Écurie 3 — entrée (contre-plongée) |
| R03s | 33.34 → 34.35 | Écurie 3 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R04 | 34.35 → 35.93 | Écurie 4 — entrée (passage au ras de l'objectif) |
| R04s | 35.93 → 38.41 | Écurie 4 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R05 | 38.41 → 39.90 | Écurie 5 — entrée (plongée) |
| R05s | 39.90 → 42.79 | Écurie 5 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| RB | 42.79 → 43.73 | « Le groupe B ! » |
| R06 | 43.73 → 44.98 | Écurie 6 — entrée (ras du sol) |
| R06s | 44.98 → 47.42 | Écurie 6 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R07 | 47.42 → 48.66 | Écurie 7 — entrée (travelling latéral) |
| R07s | 48.66 → 50.78 | Écurie 7 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R08 | 50.78 → 52.70 | Écurie 8 — entrée (contre-plongée) |
| R08s | 52.70 → 54.77 | Écurie 8 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R09 | 54.77 → 56.51 | Écurie 9 — entrée (passage au ras de l'objectif) |
| R09s | 56.51 → 58.92 | Écurie 9 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R10 | 58.92 → 60.81 | Écurie 10 — entrée (plongée) |
| R10s | 60.81 → 63.52 | Écurie 10 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| RC | 63.52 → 64.31 | « Le groupe C ! » |
| R11 | 64.31 → 66.09 | Écurie 11 — entrée (ras du sol) |
| R11s | 66.09 → 68.09 | Écurie 11 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R12 | 68.09 → 69.56 | Écurie 12 — entrée (travelling latéral) |
| R12s | 69.56 → 71.99 | Écurie 12 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R13 | 71.99 → 73.50 | Écurie 13 — entrée (contre-plongée) |
| R13s | 73.50 → 75.83 | Écurie 13 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R14 | 75.83 → 77.21 | Écurie 14 — entrée (passage au ras de l'objectif) |
| R14s | 77.21 → 80.10 | Écurie 14 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R15 | 80.10 → 81.97 | Écurie 15 — entrée (plongée) |
| R15s | 81.97 → 84.17 | Écurie 15 — SIGNATURE (orbite, fumée et confettis à ses couleurs) |
| R16 | 84.17 → 85.58 | Les 15 emblèmes : grue au-dessus du ring, déluge de confettis |
| U0 | 85.58 → 88.72 | « Mais attention… ils ne viennent pas seuls ! » |
| G1 | 88.72 → 93.03 | GOTHAM : la Batmobile sort du brouillard |
| G2 | 93.03 → 95.52 | « …la NUIT. » : éclair, chauves-souris |
| G3 | 95.52 → 97.53 | « …quelqu'un rit. » : une ombre, rien de plus |
| F1 | 97.53 → 98.88 | FORMULE 1 : la voie des stands |
| F1b1 | 98.88 → 99.51 | « Box, box » (1/4) : caméra embarquée |
| F1b2 | 99.51 → 99.99 | « Box, box » (2/4) : caméra embarquée |
| F1b3 | 99.99 → 100.47 | « Box, box » (3/4) : caméra embarquée |
| F1b4 | 100.47 → 102.00 | « Box, box » (4/4) : caméra embarquée |
| F2 | 102.00 → 103.53 | « Pneus tendres, on ATTAQUE ! » |
| AP1 | 103.53 → 106.86 | APOCALYPSE : terres brûlées, épaves |
| AP2 | 106.86 → 108.92 | « Soyez TÉMOINS ! » : saut, explosion, le luminaire tombe |
| C1 | 108.92 → 112.30 | « Ouvrez les caisses… découvrez vos bolides… » |
| C2 | 112.30 → 114.10 | « …les modèles UNIQUES ! » : faisceaux de rareté |
| C3 | 114.10 → 116.12 | « …chante dans le noir… » : silhouette dans l'ombre |
| P1 | 116.12 → 117.10 | « Des PIÈGES ! » : la peau de banane |
| P2 | 117.10 → 118.08 | « Des TRAHISONS ! » : la carapace |
| P3 | 118.08 → 121.53 | « …paris en direct… ou à l'ancienne ! » |
| GL | 121.53 → 125.73 | « …la gloire ÉTERNELLE ! » : la Coupe arc-en-ciel |
| T1 | 125.73 → 128.56 | « Le GRAND PRIX… DE NOËL ! » : les mots slamment |
| T2 | 128.56 → 130.31 | « 23 décembre ! » : les 15 emblèmes derrière la meute |
| T3 | 130.31 → 133.44 | « Préparez-vous… à VROMBIR ! » : les 5 feux |
| T4 | 133.44 → 135.06 | « Que le spectacle… COMMENCE ! » : départ dans la fumée |
| SF | 135.06 → 140.53 | Retour au salon : la télé affiche le logo |

## Limites connues

- Les voitures sont encore des **maquettes** (volumes simples) : ce sont les vraies places, trajectoires et cadrages. Les modèles m3d les remplaceront dans le même repère.
- Sons BBC : licence RemArc, usage personnel uniquement. Ça couvre la soirée familiale, mais pas une publication en ligne.
- L'aperçu MP4 rendu dans le cloud (sans carte graphique) est en 640 px à 12 images/s. Sur ton PC, le choix 3 du lanceur rend la vidéo en 1280 px à 30 images/s.
