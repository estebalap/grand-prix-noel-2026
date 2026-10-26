# Audio V7 « Multivers → Ring » — `sound_v7_crescendo.py`

Bande-son de 120 s calée sur `data/plan_v7.json` (source unique, partagée avec le JS 3D).

## Usage

```bash
cd Intro_3D/v7_multivers_4k
python3 sound_v7_crescendo.py                 # → audio/mix_v7.wav + data/timeline_v7.json (~30 s de calcul)
python3 sound_v7_crescendo.py --rapide        # 22,05 kHz mono, audio/mix_v7_rapide.wav + data/timeline_v7_rapide.json
python3 sound_v7_crescendo.py --sans-reel     # ignore les MP3 réels même s'ils existent
python3 sound_v7_crescendo.py --sortie /chemin/mix.wav
```

Dépendances : `numpy`, module `wave`, et `ffmpeg` (uniquement pour décoder des MP3 réels). Aucun scipy.
Tout aléa passe par `np.random.default_rng(graine fixe)` : deux exécutions donnent le même fichier.

## Entrées

| Fichier | Rôle | Obligatoire |
|---|---|---|
| `data/plan_v7.json` | actes, vagues, `fraction_monde`, `tempo`, `univers_boss`, clé `voix` (intervalles supplémentaires) | oui |
| `../../data/teams.json` | noms et couleurs des 15 écuries | oui |
| `../audio_v5/themes_ecuries.json` | calage des extraits (`perso` : début, durée, gain ; `voix` : réplique enregistrée + `eclat_s`) | oui (dans le dépôt) |
| `../audio_v5/themes_ecuries/NN_*.mp3` | les 15 extraits réels (sous droits : **absents du dépôt public**, pack `AUDIO_REEL_INTRO_3D.zip`) | pour le vrai son |
| `../audio_v5/voix/*.mp3` | répliques enregistrées (Petite Mimine, Mario) | pour le vrai son |
| `../audio_v5/voix/vo_v4_prise_A.mp3` + `mots_prise_A.json` | voix off du commentateur et minutage de chaque mot | pour la voix off |

Créneaux des écuries : enchaînées dès 11,0 s dans l'ordre des vagues ; `impact = debut + fraction_monde × duree_plan`.
Phase A (monde natif) = [debut, impact], phase B (arrivée en drift) = [impact, fin]. Fin de l'acte II = 53,0 s (vérifiée).

## Sorties

- `audio/mix_v7.wav` : stéréo 44,1 kHz 16 bit, ≈ −16 LUFS, crête ≤ −2 dBFS. Ignoré par git (`*.wav`).
- `data/timeline_v7.json` : actes, `ecuries[{id, nom, debut, impact, fin, vague, source, decalage_theme_s, signature{sources,
  eclat_dans_extrait_s, t_debut, t_eclat, t_fin}}]`, `battements`, `bpm_instantane`, `macros_portail`, `univers_boss`,
  `voix` (intervalles du sidechain), `voix_off[{phrase, texte, attaque, fin_dernier_mot, voix_sur_mix_db}]`, `mix{…}`,
  `bilan{ecuries_reelles, ecuries_synthetisees, phrases_voix_off}`.
- Le rapport console affiche `N réelles, M synthétisées` : sur le PC d'Esteban (pack audio restauré) il doit afficher
  **15 réelles, 0 synthétisées** et 14 phrases de voix off.

## V7.1 : le vrai son

- **15 signatures réelles** (`signature_ecurie`) : l'extrait `NN_*.mp3` coupé selon `perso`, mis au niveau (RMS actif −16 dBFS
  puis `gain_db`), en couches avec les voix enregistrées :
  - écurie 1 *Petite Mimine* : `voix/mimine_voix_cassee.mp3` (0 dB) **et** `01_jerry_reed_country.mp3` (−7 dB) ; le cri
    « MEEEINE ! » (`eclat_s` = 2,3 s) tombe sur le franchissement du portail ;
  - écurie 5 *Super Mario Pression* : `05_mario_fall_waaah.mp3` doublé de `voix/mario_chute_B.mp3` (−6 dB), les deux fins
    alignées : le temps fort est l'ATTERRISSAGE (fin du cri), comme dans `sound_v6.py` ;
  - les autres : temps fort = `eclat_s` s'il est donné, sinon le premier vrai front d'attaque (enveloppe RMS 50 ms ≥ 60 % du max).
  Le temps fort est posé **à l'échantillon près sur `impact`** (portail). Une réplique enregistrée n'est jamais coupée au début.
- **Fondus et enchaînements** : amorce jusqu'à 120 ms avant le début du créneau, fondu d'entrée sin(θ) 180 ms (raccourci si le
  temps fort est tout proche, pour ne pas manger l'attaque), bass-swap (passe-haut 150 Hz zéro-phase fondu sur les 200 dernières
  ms), fondu de sortie cos(θ) 280 ms, washout : queue de réverbération stéréo semée de 250 ms après la fin.
- **Voix off du commentateur** (`voix_off`) : la prise A de la v4, traitée comme en v6 (passe-haut, égaliseur, compresseur,
  limiteur), découpée aux mots de `mots_prise_A.json`, coupes cherchées dans les silences (jamais dans un mot), fondus 35 ms.
  Phrases (`PHRASES_V7`) : acte I « Mesdames et messieurs… le TRÔNE ! » (débit +12 % pour tenir dans les 11 s du prologue),
  acte III « Ouvrez les caisses… chante dans le noir », acte IV « Mais attention… Gotham… Je suis la nuit… Formule 1… Box box…
  Apocalypse », acte V « Des pièges, des trahisons » puis « …des paris en direct… ou à l'ancienne », acte VI « la gloire
  éternelle… Le Grand Prix de Noël, 23 décembre… que le spectacle commence ». Le script vérifie qu'aucune phrase n'en chevauche
  une autre et que la dernière finit avant le fondu final (119,35 s).
- **Sidechain** doux asymétrique sous la voix : lit musical, habillage et macros −8 dB, anticipation 40 ms, maintien 250 ms,
  attaque 40 ms, relâchement 420 ms. L'écart voix / reste du mix est mesuré pour chaque phrase (`voix_sur_mix_db`).
- Sans les extraits, chaque écurie retombe sur un **stinger de travail** synthétique (le rapport l'indique) ; sans la prise de
  voix, le mix est fait sans commentateur (avertissement). `--sans-reel` / `--sans-voix` forcent ces cas.
- `--si-perime` (utilisé par `LANCER_TRAILER_V7_4K.bat`) : ne recalcule que si le mix manque, est plus ancien que le script ou
  le plan, ou a été fait avec moins d'écuries réelles que d'extraits disponibles.

## Mastering

Loudness approchée : pondération K par FFT (passe-haut 38 Hz + étagère +4 dB à 1,7 kHz), blocs 400 ms, portes −70 LUFS / −10 LU.
Le gain est cherché par dichotomie pour viser −16 LUFS *après* un limiteur doux `tanh` qui borne la crête sous −2 dBFS.
Les valeurs mesurées sur le WAV 16 bit relu sont écrites dans `timeline_v7.json.mix`. Les pics d'impact (craquements large bande)
sont voulus : seuls ces instants présentent de grands sauts d'échantillon ; toutes les jonctions ont des fondus sin/cos.
