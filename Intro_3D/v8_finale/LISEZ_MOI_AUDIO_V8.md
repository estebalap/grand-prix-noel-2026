# Audio V8 « Finale » — `sound_v8.py`

Médley punchy de **92,0 s exactement** calé sur `data/plan_v8.json` (segments, sous-parties, `ecuries`, `pieges`, `reperes_son`).
Tous les instants sont lus dans le plan : déplacer un repère suffit, le son suit.

```bash
python3 Intro_3D/v8_finale/sound_v8.py               # → audio/mix_v8.wav + data/timeline_v8.json (~50 s de calcul)
python3 Intro_3D/v8_finale/sound_v8.py --si-perime   # ne refait rien si le mix est plus récent que le script, le plan et les sources
python3 Intro_3D/v8_finale/sound_v8.py --rapide      # 22,05 kHz mono → audio/mix_v8_rapide.wav
python3 Intro_3D/v8_finale/sound_v8.py --sans-reel   # stingers de synthèse à la place des extraits ; --sans-voix : sans commentateur
```

Dépendances : numpy, ffmpeg. Le script **importe** `../v7_multivers_4k/sound_v7_crescendo.py` (non modifié, sans écrire de
`__pycache__`) : décodage, mise au niveau des extraits, réverbe, loudness, stinger de secours. Toutes les graines sont fixes :
deux exécutions donnent un WAV identique à l'octet près.

## Structure

| Temps | Contenu |
|---|---|
| 0 → 8,6 s | Boîte à musique « Vive le vent » (Pierpont 1857, domaine public, lames synthétisées), nappe chaude, grelots, feu de cheminée procédural |
| 8,6 s | `tapis_ouverture` : la boîte à musique se dévide (arrêt de bande), sub-drop + grondement |
| 11,0 s | `plongee_arene` : whoosh ; « arène » de la voix off attaque à 10,72 s ; riser + roulement de caisse claire |
| 13,6 s | `arrivee_ring` : sub, cymbale, craquement, foule, cuivres |
| 14 → 44 s | 15 vrais extraits, temps fort **sur `impact`** à l'échantillon près ; fondu enchaîné à puissance égale sin/cos (240 ms centrés sur `debut` quand l'extrait a de la matière avant, sinon au début de la matière) ; bass-swap 150 Hz ; washout 250 ms ; « Select ! » arcade original + grosse caisse à chaque `debut` |
| 44 → 55 s | Groove 120 BPM, pièces d'or, pluie de pièces (46,5 s), bouton + « ka-ching » (51,0 s) |
| 55 → 59,5 s | Meute : 6 enregistrements moteur **CC0** de `sounds/moteurs_reels/` (licence vérifiée dans `banque.json`) + moteur de synthèse |
| 59,5 → 66 s | Roulement + grincement, caisses (60,2 s), boss en demi-tempo, passage (63,6 s) |
| 66 → 74 s | 6 pièges : bascule (boing), pelote (triple boing), obus (sifflement + explosion), curling (choc + boing), boulet (canon + explosion), bowling (strike + explosion), calés sur `contact` |
| 74 → 78 s | Tic-tac, buzzer « hors gabarit », éjection 41 mm (76,2 s : boing + sifflet à coulisse + whoosh), relance |
| 78 → 86 s | Accelerando 120 → 190 BPM, riser, moteur, roulement final, charge du flash |
| 86,0 s | **Coupure nette** (6 ms) + flash sonore (clic, éclair, « ting », sub) |
| 88 → 92 s | Accord final + reprise boîte à musique ; tout s'éteint à 91,92 s (les 50 dernières ms sont à zéro) |

## Voix off (prise A, `PHRASES_V8`)

Coupes cherchées dans les **silences réels** (enveloppe 10 ms), pas seulement dans `mots_prise_A.json` dont les fins de mots
sont souvent en avance. Chaque phrase est posée par un mot d'ancrage. Ordre : « Mesdames et messieurs » 3,40 ; « Ce soir… arène »
7,68 → 11,73 ; « et des paris… à l'ancienne » 47,00 ; « Ouvrez les caisses » 59,10 ; « Mais attention… » 61,30 ;
« Des pièges, des trahisons » 64,45 ; « …la gloire éternelle » 78,15 ; « Préparez-vous à vrombir… » 81,55 → 85,79 ;
« Le Grand Prix de Noël, 23 décembre » 88,15 → 91,19. Garde-fous (`assert`) : aucun chevauchement (écart ≥ 150 ms), chaque phrase
finit avant le repère qu'elle annonce. Sidechain V7 (anticipation 40 ms, maintien 250 ms, attaque 40 ms, relâche 420 ms) avec
une **réduction propre à chaque phrase**, creusée automatiquement jusqu'à ce que la voix passe ≥ +8 dB au-dessus du reste.

## Sorties

- `audio/mix_v8.wav` : 44,1 kHz stéréo 16 bit, 4 057 200 échantillons, −16 LUFS (méthode V7), crête ≤ −1 dBFS. Ignoré par git.
- `data/timeline_v8.json` : `evenements`, `ecuries` (source réelle/synthèse, éclat, fondus), `selects`, `pieges`, `voix_off`
  (attaque, fin, marge, réduction), `mix` (LUFS, crête), `bilan` (`ecuries_reelles`, `ecuries_synthetisees`…).

Les extraits sous droits sont lus dans `../audio_v5/` et jamais copiés.
