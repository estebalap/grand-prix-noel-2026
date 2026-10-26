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
| `data/plan_v7.json` | actes, vagues, `fraction_monde`, `tempo`, `univers_boss`, clé `voix` (liste d'intervalles `[début, fin]`) | oui |
| `../../data/teams.json` | noms et couleurs des 15 écuries | oui |
| `../audio_v5/themes_ecuries.json` + `../audio_v5/themes_ecuries/NN_*.mp3` | extraits réels (sous droits, absents du dépôt public) | non |

Créneaux des écuries : enchaînées dès 11,0 s dans l'ordre des vagues ; `impact = debut + fraction_monde × duree_plan`.
Phase A (monde natif) = [debut, impact], phase B (arrivée en drift) = [impact, fin]. Fin de l'acte II = 53,0 s (vérifiée).

## Sorties

- `audio/mix_v7.wav` : stéréo 44,1 kHz 16 bit, ≈ −16 LUFS, crête ≈ −3 dBFS (plafond −2 dBFS). Ignoré par git (`*.wav`).
- `data/timeline_v7.json` : `version, duree, fps, actes, ecuries[{id, nom, debut, impact, fin, vague, source, decalage_theme_s}],
  battements` (secondes de chaque coup de grosse caisse), `bpm_instantane` (un bpm par seconde, index = seconde, 0..120),
  `macros_portail[{ecurie, t_riser_debut, t_impact, t_drop_fin, t_crissement}]`, `univers_boss`, `voix`,
  `mix{fichier, lufs_approx, crete_dbfs, …}`.

## Synthétisé ou réel

- **Tout est synthétisé** par défaut : lit de basses (grosses caisses 55 Hz en accelerando, phase du tempo intégrée, temps 1
  accentué, « lub-dub » dans le prologue), macros portail ×15 (riser spectral stéréo → craquement → sub-drop 105→32 Hz à phase
  continue → crissement de pneus 1,5–5 kHz), whoosh de changement d'acte, tonnerre et pluie (gotham), moteur F1 (f1),
  grondement et métal tordu (apoca), rafale de 10 clics (acte V), riser puis sub-boom à 111 s, accord final.
- **Stinger de travail** par écurie (`source: "synthese"`) : gamme, timbre et tonique dérivés de l'id et de la couleur de l'écurie ;
  arpège accélérant et pic d'accord exactement sur l'impact.
- **Extrait réel** (`source: "reel"`), si `NN_*.mp3` existe : coupé à `[debut_s, debut_s+duree_s]` (bloc `perso`, sinon `voix`),
  temps fort `eclat_s` (relatif au début de l'extrait coupé) ou, à défaut, pic d'énergie RMS (fenêtre 50 ms), calé sur `impact`.
  Niveau homogène (RMS actif −18 dBFS), fondus sin/cos. `decalage_theme_s` = début de l'extrait − début du créneau.
  Un extrait illisible ou vide retombe sur la synthèse avec un avertissement. Ne jamais committer ces MP3.
- **Voix** : structure prête (sidechain −6 dB, attaque 40 ms / relâchement 300 ms sur le lit de basses sous les intervalles de
  `plan_v7.json.voix`) ; la liste est vide par défaut, rien n'est généré.

## Mastering

Loudness approchée : pondération K par FFT (passe-haut 38 Hz + étagère +4 dB à 1,7 kHz), blocs 400 ms, portes −70 LUFS / −10 LU.
Le gain est cherché par dichotomie pour viser −16 LUFS *après* un limiteur doux `tanh` qui borne la crête sous −2 dBFS.
Les valeurs mesurées sur le WAV 16 bit relu sont écrites dans `timeline_v7.json.mix`. Les pics d'impact (craquements large bande)
sont voulus : seuls ces instants présentent de grands sauts d'échantillon ; toutes les jonctions ont des fondus sin/cos.
