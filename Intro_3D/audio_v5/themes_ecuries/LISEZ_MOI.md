# Dépose ici TES extraits de signature d'écurie

Chaque écurie a une **signature sonore** jouée juste après son nom dans l'appel des écuries.
Tant que ce dossier est vide, ce sont de **vrais enregistrements BBC** (non retouchés) qui sont joués.
Pour mettre le vrai morceau ou le vrai mème, dépose le fichier ici puis relance `LANCER_V5.bat` :
la présentation de l'écurie s'allonge ou se raccourcit toute seule, et l'image suit
(`LANCER_ANIMATIC_V5.bat` régénère le découpage).

## Nom du fichier

`NN_ce-que-tu-veux.ext` — NN = numéro de l'écurie sur 2 chiffres, ext = mp3, m4a, wav, ogg, flac ou aac.

| NN | Écurie | Extrait souhaité |
|---|---|---|
| 01 | Petite Mimine Racing | (voix du vieux à son dernier souffle : déjà faite et gardée ; un fichier ici remplace seulement le cor de chasse) |
| 02 | Twingo Oasis V16 | Candy Crush : « Sweet! » / « Delicious! » |
| 03 | Optic-Breuillet | Tennis : un ace + « Out ! » |
| 04 | Tata Freddy Motorsport | Balatro (thème principal) |
| 05 | Super Mario Pression | Solo de guitare / « It's-a me! » |
| 06 | Scuderia Symphonie E-Tech | Un coup d'orchestre |
| 07 | Yaris 2 Invincible | Zelda : « objet obtenu » |
| 08 | A4 Oil Leaking | Metroid : fanfare d'objet |
| 09 | Titou Wyvern SRT | Monster Hunter : thème de Valstrax |
| 10 | Doom Slayer Issue GP | Berserk : un passage de l'OST |
| 11 | Milo's Princess Vroom Vroom | Peach « Yahoo! » / miaou de Milo |
| 12 | Bob's Bizarre Racing | JoJo : le mème de Kakyoin (« rero rero ») |
| 13 | Jojo la Sirène Veloce | Solo de batterie |
| 14 | Ninja-Nissan Street Racing | Splatoon : « Booyah! » |
| 15 | Princess Blooming Speed | Daisy : l'explosion de fleur |

## Règles

- Le fichier est joué **tel quel** : seulement coupé (fondus de 20 ms) et mis au niveau.
- Par défaut on garde **les 3 premières secondes**. Pour choisir le passage exact, renseigne `debut_s` / `duree_s`
  dans la clé `"perso"` de l'écurie, dans `themes_ecuries.json` (exemple : `"perso": {"debut_s": 31.0, "duree_s": 3.0}`).
- Ce sont des extraits sous droits : usage privé, pour la soirée uniquement. Je ne peux pas les récupérer à ta place.
