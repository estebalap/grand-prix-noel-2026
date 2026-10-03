# 🎬 Vidéos du show — glisser-déposer

Le relais détecte tout seul ce qui est présent ici (relu toutes les 30 s, ou bouton **Relire le dossier** dans la régie).
Fichier absent = aucun écran noir : la TV garde le décor animé (intro) ou affiche la fiche dorée du bolide (révélation).

```
web/videos/
├── intro_grand_prix.mp4      ← cinématique d'ouverture (+ intro_grand_prix.webm facultatif)
└── cars/
    ├── B07.mp4               ← clip de révélation du bolide B07 (5 à 8 s)
    ├── FR02.mp4
    └── TK05.mp4 …            ← un fichier par code gommette (95 codes possibles, R01-R20 compris)
```

## Format conseillé
| | Intro | Clips de bolides |
|---|---|---|
| Conteneur | MP4 (`+faststart`) | MP4 (`+faststart`) |
| Vidéo | H.264 High 4.2, 1920×1080, 60 i/s (30 accepté), CRF 18, yuv420p | idem |
| Son | AAC-LC 48 kHz, 192 kb/s, stéréo, -16 LUFS | idem (un impact sonore au début, la musique est baissée automatiquement) |
| Durée | libre (60 à 120 s conseillées) | **5 à 8 s** (coupé à 12 s maximum) |
| Cadrage | plein écran | sujet dans les **55 % gauches** : la fiche néon s'incruste sur la droite |

Le 4K n'apporte rien (la TV affiche une page en 1920×1080) et alourdit la lecture.

## Convertir automatiquement vos exports de montage
```
py -3 3_Application\outils\preparer_videos.py --source "D:\Montage\Exports"
```
- reconnaît le code en tête du nom (« B07 - Batcopter.mov », « B7.mov ») et l'intro (« intro… »), vérifie les codes dans `cars.json` ;
- convertit au format ci-dessus (son normalisé), `--webm` ajoute une version de secours ;
- sans `--source` : simple inventaire (ce qui manque, ce qui est trop long, ce qui est illisible).

Ces fichiers ne sont jamais publiés sur GitHub (`preparer_pages.py` exclut ce dossier).
