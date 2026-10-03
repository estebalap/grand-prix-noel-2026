# Crédits des sons

## Moteurs des concept-cars (`moteurs/NN/`)

**Écuries 02, 03, 04, 05, 07, 08, 09, 10, 11, 12, 13, 14 et 15 : enregistrements moteur**
- Auteur : **CryHam**, pour le jeu libre *Stunt Rally 3*.
- Moteurs enregistrés à régime fixe (1 000, 2 000… tr/min) avec *engine-sim*.
- Source : <https://github.com/stuntrally/stuntrally3/tree/main/data/sounds/engines> (voir `data/sounds/_sounds.txt`).
- Licence : **CC BY 4.0**, <https://creativecommons.org/licenses/by/4.0/>.
- Séries utilisées : `su-sz` (02), `tsp` (03), `v12d` (04), `b-v8` (05), `su-mid` (07), `ds8` (08), `b-i6r` (09), `gv8` (10), `su-low` (11), `v8f` (12), `tsu` (13), `ct-v8` (14), `exh` (15).

**Couches turbo (`turbo.wav` des écuries 03, 07, 09 et 14)**
- Auteur : **CryHam**, d'après « fuchslienshroud.wav » de **shimsewn** : <https://freesound.org/people/shimsewn/sounds/87606/>.
- Licence : **CC BY 4.0**.

**Écurie 06 : moteur électrique**
- « Electric Train Motor Idle », de **JotrainG** : <https://freesound.org/people/JotrainG/sounds/700034/>.
- Licence : **CC0** (domaine public).

**Modifications apportées pour le Grand Prix de Noël :**
- découpe de la partie stable ;
- bouclage sans couture (fondu enchaîné de 150 ms) ;
- passage en mono à 24 kHz ;
- volume égalisé à l'intérieur de chaque moteur.

Les bandes sont mélangées en direct selon le régime par `web/shared/engine_audio.js`.

## Enregistrements réels (`moteurs_reels/NN/`, mode « Son réel » du Showroom, par défaut)

Vrais enregistrements publiés sur **Freesound** (<https://freesound.org>), tous en **CC0** (domaine public) sauf ceux marqués CC BY.
- CC BY 4.0 : <https://creativecommons.org/licenses/by/4.0/>. CC0 : <https://creativecommons.org/publicdomain/zero/1.0/>.
- Les fichiers d'origine (aperçus MP3 de Freesound) sont dans `sources_freesound/`. Ce dossier n'est pas publié.

| Écurie | Moteur | Enregistrements (titre, auteur, licence) | Pages |
|---|---|---|---|
| 01 | turbine à réaction (enregistrement réel) | « jet_engine.wav » de minian89 (CC0) · « Jet Turbine Noise.flac » de qubodup (CC0) | <https://freesound.org/people/minian89/sounds/152509/> <https://freesound.org/people/qubodup/sounds/205581/> |
| 02 | 4 cylindres à plat Subaru WRX (enregistrement réel) | « WRX - Exhaust sounds » de ulose2piranha (CC0) | <https://freesound.org/people/ulose2piranha/sounds/273334/> |
| 03 | moteur turbo de prototype (voiture réelle sur banc de puissance) | « Import car revs on Chassis Dyno with Turbo.wav » de editboy23 (CC0) | <https://freesound.org/people/editboy23/sounds/496171/> |
| 04 | V12 Lamborghini (enregistrement réel) | « Lambo idle and rev.mp3 » de cheesepuff (CC0) · « V12 Engine - Short Rev » de Janosch-JR (CC0) | <https://freesound.org/people/cheesepuff/sounds/112075/> <https://freesound.org/people/Janosch-JR/sounds/484191/> |
| 05 | V8 de hot-rod Chevrolet (enregistrement réel) | « CHEVY HOT ROD MP3 » de tubbers (CC0) · « Big Block V8 Rev.mp3 » de Henaway (CC0) · « Big Block V8 Rev 2.mp3 » de Henaway (CC0) | <https://freesound.org/people/tubbers/sounds/570800/> <https://freesound.org/people/Henaway/sounds/127980/> <https://freesound.org/people/Henaway/sounds/127981/> |
| 06 | moteur électrique (enregistrements réels) | « Electric Train Motor Idle » de JotrainG (CC0) · « Acceleration of an electric car » de justVova (CC0) | <https://freesound.org/people/JotrainG/sounds/700034/> <https://freesound.org/people/justVova/sounds/761685/> |
| 07 | 4 cylindres de rallycross (enregistrement réel) | « Rally_Cross_Idle and start.aif » de ikbenraar (CC0) | <https://freesound.org/people/ikbenraar/sounds/179668/> |
| 08 | gros diesel de pick-up (enregistrement réel) | « Diesel idle 1.wav » de C-V (CC0) · « Truck-Diesel 07Dodge Rev.mp3 » de canucklovingbrit (CC0) | <https://freesound.org/people/C-V/sounds/565598/> <https://freesound.org/people/canucklovingbrit/sounds/478125/> |
| 09 | 6 cylindres en ligne BMW M3 (enregistrement réel) | « BMWM3_01.wav » de ikbenraar (CC BY 4.0) | <https://freesound.org/people/ikbenraar/sounds/415276/> |
| 10 | V8 Corvette à arbre à cames méchant (enregistrement réel) | « Big Cam C6 Corvette » de Angel_soto (CC0) · « Starting and revving a 74 Corvette.mp3 » de DigPro120 (CC0) | <https://freesound.org/people/Angel_soto/sounds/712593/> <https://freesound.org/people/DigPro120/sounds/432638/> |
| 11 | petit moteur de Mini (enregistrement réel) | « Mini idle 2 » de aharris4455 (CC0) · « Mini rev » de aharris4455 (CC0) | <https://freesound.org/people/aharris4455/sounds/714171/> <https://freesound.org/people/aharris4455/sounds/714174/> |
| 12 | V8 Ferrari (enregistrement réel) | « Ferrari_motor_idle » de jtvdb (CC0) · « Supercar rev » de richwise (CC0) | <https://freesound.org/people/jtvdb/sounds/857147/> <https://freesound.org/people/richwise/sounds/478756/> |
| 13 | 4 cylindres Honda Civic qui monte dans les tours (enregistrement réel) | « Honda Civic Engine Sounds (SE542) » de MPooman (CC0) | <https://freesound.org/people/MPooman/sounds/692112/> |
| 14 | voiture de drift (enregistrement réel) | « Drift Car.WAV » de nonameuser121 (CC0) | <https://freesound.org/people/nonameuser121/sounds/699840/> |
| 15 | vieux moteur (enregistrement réel) | « Old car start idle revs pulls away rumble » de TRP (CC0) | <https://freesound.org/people/TRP/sounds/573177/> |

**Modifications apportées pour le Grand Prix de Noël :**
- découpe d'un ralenti, bouclé sans couture (fondu enchaîné de 150 ms) ;
- découpe de « coups de gaz » joués tels quels sur « Faire rugir » (le ralenti s'efface dessous) ;
- écuries 01 et 03 : bandes multi-régimes découpées le long d'une montée en régime ;
- léger passe-haut à 25 Hz, passage en mono à 24 kHz ;
- niveau du début de chaque coup de gaz aligné sur le ralenti, dynamique d'origine conservée.

## Ambiance de stand (`ambiance/garage.wav`) et effet de changement (`effets/changement.wav`)

- Ambiance, mixée en une boucle de 45 s :
  - « Car/Auto Mechanic Shop » de **producerdan** (CC0) : <https://freesound.org/people/producerdan/sounds/266626/> ;
  - « Crowd_Cheering.wav » de **ken788** (CC0), en fond : <https://freesound.org/people/ken788/sounds/386762/> ;
  - « Air Impact Wrench » de **sevenbsb** (CC0), 3 rafales : <https://freesound.org/people/sevenbsb/sounds/349398/>.
- Effet : « Woosh Podracer or Futuristic Dragster Pass By » de **Euphrosyyn** (CC0), un passage découpé : <https://freesound.org/people/Euphrosyyn/sounds/384472/>.

## Sons synthétisés (repli uniquement)

- En mode « Son studio », l'écurie 01 (turbine) utilise aussi l'enregistrement réel ci-dessus, faute de banque studio.
- Si un fichier manque : synthèse procédurale originale du projet, dans `web/shared/engine_audio.js`.

## Fichiers déposés à la main

| Fichier | Titre d'origine | Auteur | Licence | Lien |
|---|---|---|---|---|
| | | | | |
