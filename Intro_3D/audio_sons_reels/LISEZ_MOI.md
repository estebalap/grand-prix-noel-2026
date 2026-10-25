# Intro du Grand Prix — bruitages réels

Ce dossier refait le mix de `intro_grand_prix.mp4` (Intro Catch v2) en remplaçant **uniquement les bruitages**
synthétisés par de vrais enregistrements (BBC Sound Effects). Ta **voix off** et la **musique** sont celles d'origine.

| Fichier | Rôle |
|---|---|
| `LANCER_SONS_REELS.bat` | Double-clic : télécharge la banque de sons (une fois), refait le mix, crée l'aperçu vidéo et l'ouvre |
| `sorties\intro_grand_prix_SONS_REELS_apercu.mp4` | L'intro actuelle (images inchangées) avec le nouveau son, pour écouter tout de suite |
| `audio\mix_reel.wav` | Le nouveau mix (48 kHz, −16 LUFS), qui servira de bande-son à l'intro 3D |
| `audio\bruitages_seuls_synthetiques.wav` / `bruitages_seuls_reels.wav` | Les bruitages seuls, avant / après, pour comparer à l'oreille |
| `audio\rapport_sons_reels.json` | Les 123 remplacements : quel son, à quel instant, quel gain |
| `sound.py` + `timeline.json` | Copie de référence des sources d'Intro Catch v2 (lues, jamais modifiées) |
| `sound_reel.py` | Le mix aux bruitages réels |
| `telecharger_sons_bbc.py` | Banque de 30 enregistrements → `sons_reels\` |

Rien dans `Edition_23_Decembre` n'est modifié. Licence des sons : BBC RemArc, **usage personnel uniquement** (soirée familiale : oui ; publication en ligne : non).
Variante : `set MIX_SYNTH=0.2` avant le lancement garde 20 % des bruitages synthétiques sous les vrais (plus de « punch »).
