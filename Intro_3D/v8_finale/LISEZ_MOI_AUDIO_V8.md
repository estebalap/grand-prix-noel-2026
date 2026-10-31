# Audio V8 « Finale » — `sound_v8.py`

Médley de **107,0 s exactement** calé sur `data/plan_v8.json` (segments, sous-parties, `ecuries`, `pieges[].contact_film`,
`reperes_son`, `decalage_folie`) et sur `data/voix_v8.json` (placement de la voix off). Tout instant est lu dans ces deux fichiers :
déplacer un repère ou une pièce vocale suffit, le son suit.

```bash
python3 Intro_3D/v8_finale/sound_v8.py               # → audio/mix_v8.wav + data/timeline_v8.json (~70 s de calcul)
python3 Intro_3D/v8_finale/sound_v8.py --si-perime   # ne refait rien si le mix est plus récent que le script, le plan, voix_v8.json et les sources
python3 Intro_3D/v8_finale/sound_v8.py --rapide      # 22,05 kHz mono → audio/mix_v8_rapide.wav
python3 Intro_3D/v8_finale/sound_v8.py --sans-reel   # stingers de synthèse à la place des extraits ; --sans-voix : sans voix off
```

Dépendances : numpy, ffmpeg. Le script **importe** `../v7_multivers_4k/sound_v7_crescendo.py` (non modifié, sans écrire de
`__pycache__`) : décodage, mise au niveau des extraits, réverbe, loudness, stinger de secours. Graines fixes : deux exécutions
donnent un WAV identique à l'octet près.

## Voix off (nouvelle, V8)

L'ancienne voix (`vo_v4_prise_A` / `PHRASES_V7`) n'est plus utilisée. La voix est celle d'Esteban pour le projet, « Alexx-V »
(ElevenLabs), dans `voix_off/L01..L14.mp3`. Pour chaque pièce de `voix_v8.json` (37 pièces) : découpe `fichier`
[`src_debut`, `src_fin`], fondus de 5 ms, posée à `t_film`. Traitement léger : passe-haut 80 Hz, compression 2,5:1 douce, présence
+2 dB à 3 kHz, pas de réverbe. Contrôles (`assert`) : aucune pièce ne chevauche la suivante, la dernière finit avant 106,97 s.
Sidechain doux asymétrique (anticipation 40 ms, maintien 250 ms, attaque 40 ms, relâche 420 ms) sur tout le reste, à −8 dB au départ,
creusé **pièce par pièce** (jusqu'à −26 dB) tant que la voix n'est pas à ≥ +8,5 dB au-dessus du reste. Les signatures d'écuries ont
leur propre sidechain (maintien 20 ms, relâche 80 ms) pour que l'éclat placé juste après le nom ne soit pas étouffé.

## Structure

| Temps | Contenu |
|---|---|
| 0 → 8,6 s | Boîte à musique « Vive le vent » (Pierpont 1857, domaine public, lames synthétisées), nappe chaude, grelots, feu de cheminée procédural |
| 8,6 s | `tapis_ouverture` : la boîte à musique se dévide (arrêt de bande), sub-drop + grondement |
| 11,0 s | `plongee_arene` : whoosh, riser, roulement de caisse claire |
| 13,6 s | `arrivee_ring` : sub, cymbale, craquement, foule, cuivres |
| 14 → 59 s | 15 écuries × 3,0 s, version calme : la voix dit le nom (`debut` + 0,12 → ≈ + 2,4) ; l'extrait réel reste à −20 dB dessous, remonte en sin, et son **éclat tombe à max(`impact`, fin du nom + 0,1 s)** ; fondu enchaîné à puissance égale de 0,7 s (`debut` − 0,1 → + 0,6) ; bass-swap 150 Hz ; washout 250 ms ; « Select ! » feutré (passe-bas 3,5 kHz) à `debut`, whoosh feutré au portail (`impact`), petit sub sur l'éclat. Voix spéciales retirées car elles chevaucheraient le nom : cri de Petite Mimine (écurie 1 : country −7 dB seule), chute `mario_chute_B` (écurie 5 : cri du jeu seul) |
| 59 → 70 s | Groove 120 BPM, pièces d'or, pluie (61,5 s), bouton + « ka-ching » (66,0 s) |
| 70 → 74,5 s | Meute : 6 enregistrements moteur **CC0** de `sounds/moteurs_reels/` + moteur de synthèse |
| 74,5 → 81 s | Roulement + grincement, caisses (75,2 s), boss en demi-tempo, passage (78,6 s) |
| 81 → 89 s | 6 pièges sur `contact_film` : bascule (boing), pelote (triple boing), obus (sifflement + explosion), curling (choc + boing), boulet (canon + explosion), bowling (strike + explosion) |
| 89 → 93 s | Tic-tac, buzzer, éjection 41 mm (91,2 s : boing + sifflet à coulisse + whoosh), relance |
| 93 → 101 s | Accelerando 120 → 190 BPM, riser, moteur, roulement final |
| 101,0 s | **Coupure nette** (6 ms) + flash sonore |
| 103 → 107 s | Accord final + reprise boîte à musique, éteints à 106,92 s ; « À vos paris ! » finit à 106,96 s ; fondu final 30 ms |

## Sorties

- `audio/mix_v8.wav` : 44,1 kHz stéréo 16 bit, 4 718 700 échantillons, −16 LUFS (méthode V7), crête ≤ −1 dBFS. Ignoré par git.
- `data/timeline_v8.json` : `evenements`, `ecuries` (source, fin du nom annoncé, éclat, remontée, fondus, voix spéciales retirées),
  `selects`, `pieges`, `voix_off` (id, texte, attaque, fin, marge, réduction du sidechain), `mix`, `bilan`.

Les extraits sous droits sont lus dans `../audio_v5/` et jamais copiés.
