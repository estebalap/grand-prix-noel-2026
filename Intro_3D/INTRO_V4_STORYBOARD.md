# INTRO 3D v4 — script, bande-son et storyboard

*25 octobre 2026. Remplace le storyboard 49 s de `RECONCEPTION_INTRO_GRAND_PRIX_3D.md` §3. Rien dans `Edition_23_Decembre` n'est modifié.*
*Dossier : `Noël\00_Lab_Vision_2.0\Intro_3D\`.*

**Correction du rapport du matin :** le fichier installé dans `web\videos` est la **v3** d'Intro Catch (trophées 3D, même bande-son que la v2), pas la v2.

## 1. Ce qui change (demandes d'Esteban)

| Demande | Réponse |
|---|---|
| Nouvelle voix (ElevenLabs) | Voix « Commentateur def », modèle eleven_v4 avec indications de jeu (chuchoté, crié, voix grave…). **2 prises** générées (82,5 s et 84,5 s) ; la prise A est montée. |
| Univers : Batman, pilotes de F1, Survivants de l'Apocalypse, avec des imitations | Gotham (« Je ne suis pas une voiture… Je suis… la NUIT », puis un rire dans le noir), F1 (radio « Box, box… box, box », « Pneus tendres, on ATTAQUE ! »), Apocalypse (« Soyez TÉMOINS ! »). Ce sont des pastiches : aucune réplique de film n'est reprise mot pour mot. |
| Ne pas oublier les écuries | **Appel des 15 écuries** façon ring de catch, en 3 groupes (A, B, C), environ 27 s : chaque nom a son coup de massue et sa voiture-emblème. |
| Plus de caricature | Ton « annonceur de catch » appuyé : murmures, cris, « Dans le coin rouge… », « Préparez-vous… à VROMBIIIR ! ». |
| Pas le nombre de bolides | « Des DIZAINES de bolides ! » |
| Les caisses | « Ouvrez les caisses… découvrez vos bolides… et traquez les modèles UNIQUES ! On raconte que l'un d'eux… chante dans le noir… » avec un **teaser de la voiture Miku dans l'ombre** (silhouette seule). |
| Durée plus longue | **1 min 43** (103 s), dans la fourchette conseillée par la régie (60 à 120 s). |
| Nouveau salon | Modélisé en 3D : `src\decors\salon.js` + `apercu_salon.html` (voir §4). |

Inclusion des générations : la ligne « paris en direct… depuis votre téléphone… **ou à l'ancienne** ! » rappelle qu'on peut parier sans smartphone.

## 2. Bande-son v4 (`audio_v4\`)

- **Montage de la voix :** la prise A est découpée en 15 phrases, placées pour laisser respirer l'image. Le minutage mot à mot vient d'une transcription locale ; les coupes tombent dans les silences.
- **Musique :** les motifs d'Intro Catch sont recomposés :
  - groove d'arène à 122,7 BPM ;
  - orgue gothique pour Gotham ;
  - guitares saturées pour l'Apocalypse ;
  - boîte à musique japonisante pour les caisses ;
  - riff « Jingle Bells » métal pour le final.
- **Bruitages :** 158 vrais enregistrements BBC (foule de catch, F1, moteurs, tonnerre, pluie, explosion, pièces…), posés avec le même calage qu'en v3.
- **Résultat :** −16,1 LUFS, crête −1,5 dB, 103,0 s. Le script est **déterministe** : deux lancements donnent le même fichier.
- **À écouter :** `sorties\intro_v4_maquette_son.mp4`. L'image est provisoire : une forme d'onde avec le nom de chaque séquence.

## 3. Storyboard 3D v4 (temps film, en secondes)

★ = impact caméra (secousse, coup de FOV, flash). Les temps viennent de `audio_v4\audio\rapport_v4.json`.

### ACTE 0 — Le salon (0 → 9,16)

| t | Voix | Image 3D | Son |
|---|---|---|---|
| 0,0–1,2 | — | Noir. Une **goutte d'huile** se forme sous l'A4 « Oil Leaking » de Lulu (voiture-emblème garée au bord du tapis), tombe au ralenti et éclate sur le tapis rouge sang. | Néon qui grésille |
| 1,2–3,2 | « Mesdames… et messieurs… » (chuchoté) | **Plan « ras du tapis »** : 5 miniatures endormies sur le velours ; au fond, flou, le feu de la cheminée d'angle et le sapin qui scintille juste à côté. | Cœur, drone |
| 3,4 | — | La **grosse télé** s'allume : la lueur bleue balaie les carrosseries et le cuir blanc. | Neige de télé (réelle) |
| 4,6–7,6 | « Ce soir… le salon… se transforme… » | **Plan « vue d'ensemble »** du salon (canapé et 2 fauteuils de cuir blanc, table basse, meuble télé rouge laqué avec ses plantes, cheminée vitrée en diagonale, sapin, carrelage jaune-orange). Les lumières sautent deux fois. | Petits moteurs de jouets, montée |
| 7,6–9,1 | — | **Plongée verticale** : le motif du tapis s'illumine. La **Rainbow Road surgit du tapis** voie par voie, au rythme des toms. | 10 toms, cymbale inversée |
| ★ 9,16 | « … en ARÈNE ! » | Le salon s'enfonce et **le tapis se dresse en RING DE BOXE** (voir §5) : cordes qui rebondissent, luminaire qui s'allume, écran géant, gradins. Burnout de la meute, pyros aux 4 poteaux, onde de choc. | Explosion, canon, feux d'artifice |

### ACTE 1 — L'arène (9,16 → 19,6)

| t | Voix | Image 3D |
|---|---|---|
| ★ 10,98 | « Quinze écuries ! » | Le « 15 » chromé claque au sol ; derrière, les **15 voitures-emblèmes** en rangée, avec leurs hologrammes de logos. |
| ★ 12,21 | « Des DIZAINES de bolides ! » | Travelling ultra-rapide sur le **parc fermé** des bolides (silhouettes en filé, néons de rareté). On ne voit aucun chiffre. |
| ★ 13,64 | « Cinq voies… » | Les 5 voies s'allument ; 5 passages au-dessus de la caméra posée dans la rainure, de gauche à droite (comme le son). |
| 15,9 | « et UNE SEULE place… » | Arrêt de bande, la scène se fige (*bullet time*). Projecteur unique sur le podium. |
| ★ 17,39 | « … sur le TRÔNE ! » | Le trône rouge et or se pose, la couronne descend. |

### ACTE 2 — L'appel des 15 écuries (19,6 → 47)

**Décor :** le ring. L'écran géant affiche chaque écurie (logo, nom, surnom du pilote, citation). Les voitures-emblèmes entrent une à une par l'allée sud, au milieu de la foule, et vont se garer autour du ring par groupe : **A à l'ouest, B au sud, C à l'est**, tournées vers le ring.

**Principe :** sur chaque nom, la voiture-emblème fait son entrée, phares allumés, son logo holographique tournant au-dessus d'elle, et les cordes vibrent. La caméra la suit 1,1 à 2,7 s, avec un angle différent à chaque fois :
- ras du sol ;
- travelling latéral ;
- contre-plongée ;
- passage au ras de l'objectif ;
- plongée.

| t | Écurie | Angle proposé |
|---|---|---|
| 20,03 | « Dans le coin rouge… » | Cloche de ring (ding-ding-ding) ; le portique « GROUPE A » s'allume |
| 21,73 | Petite Mimine Racing | 4×4 de battue, contre-plongée sur la galerie de toit (bocal de pâté) |
| 23,05 | Twingo Oasis V16 | Macro sur les 8 pots d'échappement, puis recul |
| 24,72 | Optic-Breuillet | La paire de lunettes géante sur le toit traverse le cadre |
| 25,76 | Tata Freddy Motorsport | Platine vinyle qui tourne, travelling circulaire |
| 27,39 | Super Mario Pression | Calandre-moustache plein cadre, fût de bière qui brille |
| ★ 29,2 | « Le groupe B ! » | Portique B, pyros |
| 29,78 | Scuderia Symphonie | Sortie silencieuse (électrique), clé de sol lumineuse |
| 31,04 | Yaris 2 Invincible | Plaques d'armure, triangles dorés qui scintillent |
| 32,17 | A4 Oil Leaking | La flaque d'huile du premier plan revient : clin d'œil |
| 33,98 | Titou Wyvern SRT | Écailles de wyverne, flammes d'échappement |
| 35,70 | Doom Slayer Issue GP | Épée-aileron, lueur rouge, sol qui tremble |
| ★ 37,9 | « Et le groupe C ! » | Portique C |
| 38,41 | Milo's Princess Vroom Vroom | Couronne et oreilles de chat, paillettes |
| 40,16 | Bob's Bizarre Racing | Glyphes « ゴゴゴ » qui flottent, pose dramatique (la voiture s'incline) |
| 41,63 | Jojo la Sirène Veloce | Nageoire-aileron, éclaboussures |
| 43,03 | Ninja-Nissan Street Racing | Éclaboussures d'encre qui recouvrent l'objectif |
| 45,08 | Princess Blooming Speed | Pétales de marguerite, tour sur elle-même façon danseuse |
| ★ 45,7 | — | Plan large : les 15 emblèmes alignés, feux d'artifice |

### ACTE 3 — Les univers (48 → 70,2)

**Choix des bolides :** aucune Relique interdite n'est montrée (le Joker, le Tumbler et Harley Quinn restent secrets). Le rire n'est qu'une **ombre** avec une lueur violet-vert.

| t | Voix | Image 3D | Bolides |
|---|---|---|---|
| 48,0 | « Mais attention… ils ne viennent pas seuls ! » | La piste s'éteint, il ne reste que les néons de voie. | — |
| 51,97 | « Des ruelles de Gotham… » | **Gotham** : pluie, gratte-ciel noirs en arrière-plan, signal lumineux dans les nuages. Une Batmobile émerge du brouillard, phares seuls. | B16 (The Batman), B06 (2016), B07 (Batcopter) en survol |
| ★ 55,5 | « …Je suis… la NUIT. » | Éclair : la carrosserie s'illumine 3 images. Chauves-souris. | B16 |
| ★ 58,0 | « …quelqu'un rit. » + rire | Plan fixe sur une ruelle vide ; une **ombre** passe, un rire, une lueur violet-vert. Rien n'est révélé. | (Relique : ombre seulement) |
| 60,73 | « Des stands de la Formule 1… » | **Voie des stands** : mécaniciens-silhouettes, couvertures chauffantes, feux de stand. | F02, F04, F01 |
| 61,4–63,0 | « Box, box… box, box. » | **Caméra embarquée** façon radio : bip à l'écran, 4 coupes sur les 4 « box ». | **F03 « Box-Box »** (clin d'œil) |
| ★ 64,39 | « Pneus tendres, on ATTAQUE ! » | Les 5 F1 jaillissent, Doppler, gerbes d'étincelles. | F02, F03, F04, F01, F06 |
| 66,44 | « Et des terres brûlées… » | **Désert rouillé**, vent de sable, épaves. | N12, N13 (épaves), H03 |
| ★ 69,33 | « Soyez TÉMOINS ! » | Saut au-dessus d'une explosion, ralenti, réception lourde. | H03 |

### ACTE 4 — Les caisses (71,4 → 78,1)

| t | Voix | Image 3D |
|---|---|---|
| 71,9 | « Ouvrez les caisses… » | Les **conteneurs imprimés** (couleurs mates variées) tombent sur la piste ; les couvercles sautent un à un. |
| 72,5–74,8 | « découvrez vos bolides… traquez les modèles UNIQUES ! » | Faisceaux de rareté qui jaillissent des caisses ; un faisceau **doré** plus haut que les autres. |
| 76,8–78,1 | « On raconte que l'un d'eux… chante dans le noir… » | **Teaser Miku, dans l'ombre :** une caisse entrouverte dans le noir. On n'aperçoit qu'une **silhouette** de voiture en contre-jour, un fin liseré bleu-vert très atténué et 5 notes lointaines. Pas de couleur franche, pas de couettes visibles : un indice, pas une révélation. La caisse se referme. |

### ACTE 5 — Pièges, paris, gloire (78,6 → 86,6)

| t | Voix | Image 3D |
|---|---|---|
| ★ 78,88 | « Des PIÈGES ! » | Peau de Banane de l'Arsenal, toupie au ralenti. |
| ★ 79,63 | « Des TRAHISONS ! » | Carapace qui plonge, frottement sur la cloison. |
| 80,6–82,9 | « …paris en direct… depuis votre téléphone… ou à l'ancienne ! » | Téléphone 3D géant avec les cotes, pluie de pièces ; sur « à l'ancienne », un **carnet de paris papier** et un crayon tombent à côté. |
| 84,0–86,6 | « Et pour le vainqueur… la gloire… ÉTERNELLE ! » | Trophées du Panthéon, puis la **Coupe arc-en-ciel** sous les rayons. |

### ACTE 6 — Titre et final (88,3 → 103)

| t | Voix | Image 3D |
|---|---|---|
| ★ 89,12 / 89,42 / 89,65 / ★★ 90,0 | « Le GRAND PRIX… DE NOËL ! » | Lettres chromées irisées qui slamment, mot par mot ; sur NOËL, le ruban arc-en-ciel s'enroule et l'arène explose. |
| ★ 90,79 / 91,12 | « 23 décembre ! » | Néon sur le portique ; les 15 emblèmes en 3 rangées derrière la meute. |
| 92,9–94,0 | « Préparez-vous… à VROMBIIIR ! » | Gros plans d'échappements qui crachent (vrais moteurs) ; les 5 feux du portique s'allument. |
| ★★ 95,94 | « Que le spectacle… COMMENCE ! » | Extinction des feux, départ explosif droit sur la caméra, feux d'artifice ; **retour éclair dans le salon** : le sapin, la cheminée et la télé qui affiche le logo. |
| 96–103 | — | Logo final, fondu au noir. |

## 4. Le nouveau salon 3D

**Fichiers :** `src\decors\salon.js` (module réutilisable dans le film) et `apercu_salon.html` (double-clic, puis ouvrir dans Chrome ; boutons de caméras, souris pour tourner, `L` pour les lumières).

Plan corrigé d'après tes indications (25 oct., 2 retours en séance) :

| Élément | Réalisation |
|---|---|
| Canapé cuir blanc au centre, en bas | 3 places, face à la télé, coussins séparés, surpiqûres, pieds chromés |
| 2 fauteuils solo cuir blanc | Un à gauche, un à droite, **tournés en diagonale vers la télé** |
| Tapis rouge sang à motifs | 3 m × 2 m : bordures, frise de losanges, médaillon central en étoile, écoinçons, franges. C'est lui qui deviendra la piste. |
| Petite table basse en bois | Chêne, plateau épais, pieds fuselés, tablette basse |
| Meuble télé simple rouge brillant + grosse télé | Laque rouge, vernis miroir, télé 75 pouces qui affiche le logo GP et éclaire la pièce en bleu |
| Plantes | **Posées sur le meuble télé** : 2 grandes aux extrémités, 2 succulentes devant |
| Cheminée vitrée | **Encastrée en diagonale**, dans un pan coupé à 45° entre le mur de la télé et le mur de droite. Cadre en ardoise, bûches, braises, flammes animées, vitre, lumière orange vacillante qui porte des ombres. |
| Sapin de Noël | **À côté de la cheminée**, contre le mur de droite, avec 140 ampoules qui scintillent aux couleurs des 5 voies |
| Sol | **Carrelage carré de 60 cm « en nuage » jaune-orange** (chaque carreau a ses taches), joints clairs, légèrement brillant |
| Pièce | **Resserrée** à 5,0 m × 4,25 m : la télé et la cheminée sont maintenant proches du canapé. **Murs blancs**, plafond blanc cassé, plinthes claires. |
| Double fenêtre | **Au fond du mur de gauche, côté télé** : 2 battants en PVC blanc, poignées chromées, appui. Dehors, une nuit d'hiver (lune, étoiles, toits enneigés aux fenêtres allumées, flocons) et un clair de lune bleuté qui reste allumé quand le salon s'éteint. |
| Lumière | 3 spots encastrés, feu de cheminée, lueur de la télé, sapin, lune |

**Échelle et contraintes :**
- Le salon est à l'**échelle réelle** (1 unité = 1 cm). Une miniature fait donc 7 cm sur le tapis : le contraste « jouet magnifié » vient tout seul.
- Comme le reste du film, tout est semé et piloté par `maj(t)`, sans hasard ni horloge.

**À valider sur ton PC :** le rendu cloud est logiciel (sans GPU). Sur ta carte graphique, les ombres et les reflets seront plus fins.

## 5. L'arène : le ring de boxe (décision du 25 oct.)

**Inspiration :** l'ambiance d'un ring de boxe de jeu de combat, comme Esteban le souhaite. C'est une **création originale** : aucun logo, nom, personnage ni visuel de jeu existant n'est repris. On garde seulement les **mécaniques de mise en scène** qu'il a citées.

| Mécanique | Dans l'intro |
|---|---|
| **Cordes élastiques** | Les 12 cordes rebondissent (oscillation amortie) sur « ARÈNE ! », le trône, chaque nom d'écurie, « TÉMOINS ! », la carapace, « NOËL » et « COMMENCE ! ». |
| **Luminaire suspendu cassable** | Cadre lumineux de 8 projecteurs au-dessus du ring. Sur « Soyez TÉMOINS ! », l'explosion le fait **basculer** : il pend à un câble, grésille, et reste cassé jusqu'à la fin (clin d'œil). |
| **Écran : portraits et surnoms** | Écran géant au nord. Pendant l'appel des écuries, il affiche **le logo de l'écurie dans un médaillon, son nom, le surnom du pilote en grand** (« PAPINOU », « MAMINOU »…) et sa citation, tirés de `teams.json`. Le reste du temps : titre, « GROUPE A/B/C », mots-clés, puis les 5 feux de départ. |
| **Deux versions du ring** | « Championnat » : tapis bleu, cordes rouge/blanc/bleu, lumière blanche. « Nuit sauvage » : tapis sombre, cordes or et noir, lumière rouge, pour Gotham et l'Apocalypse. Une 3ᵉ ambiance, « tapis », sert juste après la transformation : le ring porte encore le tapis rouge sang du salon. |

**Échelle :**
- Le ring fait 1,5 m de côté et se dresse à l'emplacement du tapis.
- Une miniature de 7 cm y est minuscule et héroïque ; elle passe sous la corde du bas.
- La piste arc-en-ciel à 5 voies traverse le ring du nord au sud.
- Les gradins (900 spectateurs-figurines, bâtons lumineux, flashs d'appareils photo) entourent le ring à l'est et à l'ouest. L'entrée des écuries se fait par l'allée sud.

**Fichiers :** `src\decors\arene.js` et `apercu_arene.html` (boutons : ambiances, rebond des cordes, casser le luminaire, écurie suivante à l'écran).

## 6. L'animatic 3D (fait le 25 oct.)

- **Fichiers :**
  - `animatic_v4.html` : lecture synchronisée avec le son, frise des 55 plans et des 38 impacts, image par image, plan par plan ;
  - `src\film_v4.js` : l'image est une fonction pure du temps ;
  - `data\plans_intro_v4.json`, généré par `outils\generer_plans_v4.py` depuis le minutage de la voix.
- **Lancer :** double-clic sur `LANCER_ANIMATIC_V4.bat`, puis choisir 1 (animatic), 2 (salon) ou 3 (arène).
- **Contenu :**
  - les **vrais décors** (salon, ring) ;
  - les **vrais cadrages et trajectoires** ;
  - les voitures en **maquettes à volumes simples**, à la bonne taille et aux bonnes couleurs : meute aux couleurs des voies, emblèmes aux couleurs des écuries avec leur logo holographique ;
  - les univers en version esquisse : Gotham (pluie, tours, éclair, chauves-souris, ombre), F1 (stands, caméra embarquée, départ), Apocalypse (épaves, saut, explosion), caisses (chute, couvercles, faisceaux, silhouette dans l'ombre), pièges, téléphone et pièces, carnet, Coupe et rayons, mots du titre.
- **Vérifié dans le cloud (rendu logiciel) :**
  - 55 plans sur 55 rendus, 0 erreur ;
  - même image à ±1 niveau près quand on rejoue un instant dans le désordre ;
  - aperçu vidéo `sorties\animatic_v4_apercu.mp4` (640×360, 12 i/s, son v4).
- **Sur ton PC :** `py -3 outils\capturer_animatic_v4.py --video` refait la planche et l'aperçu avec ta carte graphique (30 i/s, 1280 px).

## 7. Suite

1. **Tu regardes l'animatic** et notes les plans à changer par leur identifiant (ex. « R07 trop loin », « G1 trop sombre »). Tout se règle dans `outils\generer_plans_v4.py`.
2. **Remplacement des maquettes par les vrais modèles** m3d : meute, Gotham, F1, épaves, silhouette.
3. **Modélisation des 15 voitures-emblèmes.**
4. **Look cinéma** (bloom, flou de mouvement, profondeur de champ), **capture 60 i/s**, **intégration à la régie** (jalons I4 à I8).
