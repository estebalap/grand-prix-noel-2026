# Sons du Showroom : moteurs, ambiance, effets

Le Showroom **fonctionne sans aucun fichier** : chaque concept-car a un moteur synthétisé en direct (Web Audio) qui suit le régime :
- un coup de gaz à l'arrivée ;
- un bouton « Faire rugir » ;
- turbo, soupape, pétarades, sifflement électrique, turbine, claquement diesel selon le bolide.

Pour un rendu « enregistrement réel », **dépose simplement des MP3 ici**, avec ces noms exacts. Le fichier remplace alors la synthèse, et sa vitesse de lecture suit le régime moteur. Rien d'autre à configurer, pas même un redémarrage du relais : il suffit de recharger la page.

| Fichier | Écurie / usage | Son idéal (boucle de 3 à 20 s, ralenti ou régime stable, sans musique ni voix) |
|---|---|---|
| `moteurs/01.mp3` | 01 Papinou · Intercepteur furtif | turbine / réacteur qui siffle |
| `moteurs/02.mp3` | 02 Maminou · Micro-Fusée « V16 » | petit moteur très aigu et rageur (ou V12/V16 si tu en trouves un) |
| `moteurs/03.mp3` | 03 Zabou · Hyper-Optic 24 H | V6 turbo de prototype d'endurance |
| `moteurs/04.mp3` | 04 Tata Freddy · Vinyl Royale GT | V12 de grand tourisme |
| `moteurs/05.mp3` | 05 Mario · Hot-rod | gros V8 américain qui « glougloute » |
| `moteurs/06.mp3` | 06 Lucine · Symphonie E-F1 | sifflement de moteur électrique |
| `moteurs/07.mp3` | 07 Fafay · Rallye | 4 cylindres turbo de rallye (anti-lag) |
| `moteurs/08.mp3` | 08 Lulu · Dépanneuse | diesel 6 cylindres, camion |
| `moteurs/09.mp3` | 09 Titou · Wyvern GT-R | 6 en ligne turbo japonais |
| `moteurs/10.mp3` | 10 Diego · Doom Crawler | V8 énorme, grave, monster truck / char |
| `moteurs/11.mp3` | 11 Gaboune · Princess Coupé | petit bicylindre (scooter, 2CV…) |
| `moteurs/12.mp3` | 12 Bob · Menacing Wedge | V12 de supercar des années 80 |
| `moteurs/13.mp3` | 13 Jojo · Sirène Hydro | moteur rotatif (ou hors-bord) |
| `moteurs/14.mp3` | 14 Jaja · Kage Street Ninja | V6 de drift, échappement libre |
| `moteurs/15.mp3` | 15 Élie · Daisy Streamliner | vieux 8 cylindres en ligne d'avant-guerre |
| `ambiance/garage.mp3` | fond sonore du stand | stand / atelier : clés à chocs, compresseur, foule lointaine (boucle 30 à 90 s) |
| `effets/changement.mp3` | passage d'un bolide à l'autre | « whoosh » ou passage de voiture (1 s) |

## Où trouver des sons vraiment libres (vérifié le 3 octobre 2026)

- [OpenGameArt : Racing Car Engine Sound Loops](https://opengameart.org/node/5633) — **CC0** (domaine public), domasx2 : 6 boucles de moteur, idéal pour 07, 09, 14.
- [OpenGameArt : Car Engine Loop 96 kHz](https://opengameart.org/content/car-engine-loop-96khz-4s) — **CC-BY 3.0**, qubodup : moteur réel enregistré ; créditer l'auteur.
- [OpenGameArt : Engine-loop Heavy Vehicle/Tank](https://opengameart.org/content/engine-loop-heavy-vehicletank) — **CC-BY 3.0**, Nayckron : parfait pour 08 ou 10 ; créditer l'auteur.
- [OpenGameArt : Toy Car Motor Loop](https://opengameart.org/content/toy-car-motor-loop) — **CC-BY 3.0**, qubodup : pour 11 (en FLAC, à convertir en MP3).
- Freesound.org (filtre « Creative Commons 0 ») et Pixabay Sound Effects (licence Pixabay, usage libre) : chercher « V8 idle », « electric motor whine », « diesel truck idle », « jet turbine », « pit lane ambience ».

**À éviter :** les sons extraits de jeux, films ou séries (The Sounds Resource, rips de Mario Kart, etc.). Ils restent la propriété des studios, et le projet est publié sur GitHub Pages.

## Préparer un fichier

- Format MP3 mono ou stéréo, 128 kbit/s, normalisé autour de −3 dB.
- Pour une boucle propre, coupe sur un passage stable et fais un fondu de 20 ms aux deux bouts. Audacity convient très bien.
- Conversion en une ligne : `ffmpeg -i source.wav -ac 1 -b:a 128k -af "loudnorm" 05.mp3`.
- Note chaque crédit (titre, auteur, licence, lien) dans `CREDITS_SONS.md`. C'est obligatoire pour les sons CC-BY.
