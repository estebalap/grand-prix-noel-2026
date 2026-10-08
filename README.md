# Grand Prix de Noël 2026

Site de démonstration (GitHub Pages) de l'application du Grand Prix de Noël : soirée familiale du 23 décembre
mêlant courses de miniatures sur 5 voies, régie TV, paris en direct depuis les téléphones et trophées imprimés en 3D.

Le soir de l'événement, l'application tourne sur le PC de la régie (relais Python + tunnel) ; ce site n'en est qu'une vitrine statique.

## Pages

| Dossier | Rôle |
|---|---|
| `start/` | Accueil et lancement |
| `tv/` | Écran TV (régie, draft, courses, intro, kill-feed des pièges) — touche F : plein écran |
| `pit/` | Pocket Pit : application téléphone des invités (paris, boutique « L'Arsenal ») |
| `regie/` | Pupitre de la régie |
| `reveal/`, `caisses/` | Révélation des bolides et des caisses |
| `showroom/`, `pantheon/`, `paddock/` | Showroom 3D, panthéon des trophées, paddock des écuries |
| `labo/` | Prototypes |
| `shared/`, `lib/`, `data/`, `fonts/`, `logos/`, `sounds/` | Code commun, données, polices, logos, sons sous licence libre |

## Ce qui n'est pas publié
- Vidéos (intro, clips des bolides) : servies par le PC de la régie.
- Photos des miniatures : usage privé.
- Banque de sons de jeux commerciaux : jamais publiée (repli sur le synthétiseur procédural). Crédits des sons libres : `sounds/CREDITS_SONS.md`.

## Mise à jour
Généré par `5_Mise_en_ligne/preparer_pages.py` à partir de `3_Application/web`, puis copié ici.
