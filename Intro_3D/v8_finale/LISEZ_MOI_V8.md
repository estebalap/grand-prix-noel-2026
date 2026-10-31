# V8 FINALE — « Grand Prix de Noël » en 92 secondes

Dossier : `Intro_3D/v8_finale/` (nouveau ; la V7 `v7_multivers_4k/` est une archive : on l'importe, on ne la modifie pas).
Contrat de temps : `data/plan_v8.json` (source unique image + son). Orchestrateur : `noyau_v8.js`. Page : `index.html`.

| Segment | Fichier | Temps | Contenu |
|---|---|---|---|
| salon | `seg_salon.js` | 0 → 14 s | Salon de Noël douillet (0–8), bascule : le tapis rouge s'ouvre ou la télé aspire la caméra (8–14) |
| ecuries | `seg_ecuries.js` | 14 → 44 s | 15 écuries × 2,0 s, écran de sélection façon jeu de combat |
| folie | `seg_folie.js` | 44 → 92 s | paris smartphone, meute, caisses, boss, 6 pièges, règle des 41 mm, climax, carte finale |
| son | `sound_v8.py` → `audio/mix_v8.wav` | 0 → 92 s | médley calé sur `plan_v8.json` |

## Contrat d'un segment

```js
export async function creerSegment(ctx) {   // ctx : THREE, renderer, scene, camera, envMap, garage, poser, animer, avecAlea,
                                            // decors, ouverture, arsenal, stage3d, cars, circuit, equipes, logos, regles, plan,
                                            // seg (son entrée du plan), L, H, qualite, parcMax, progression, urlWeb, importerShared, outils
  return {
    id, groupe,                             // UN groupe THREE (le noyau l'ajoute à la scène et le masque hors du segment)
    cles: [{ t, label }],                   // instants de la planche de contrôle (nombre imposé par le Chef de régie)
    maj(t) {                                // FONCTION PURE DE t : remettre à chaque image tout ce qu'on touche
      return {
        camera: { p: [x, y, z], c: [x, y, z], fov, roll },
        fond: 0x05040a, brouillard: { couleur: '#…', densite } | null,
        lumieres: { hemi, cle },            // lumières communes du noyau (défaut 0,35 / 0,6) ; le segment ajoute les siennes dans son groupe
        post: { exposition, vignette, saturation, bloomForce, flash, flashCouleur, fondu, flou, centreFlou, aberration },
        hud: (g, W, H, o) => { … },         // habillage 2D optionnel ; o.texte(g, s, str, x, y, opts) avec s = W / 1920
        apres: (camera) => { … },           // optionnel : mises à jour qui lisent la caméra placée (particules orientées)
      };
    },
  };
}
```

Règles techniques : modules ES, three.js r128 global (`ctx.THREE`), 1 unité = 1 cm, zéro erreur ou alerte console, zéro
`Math.random()` hors `ctx.avecAlea(graine, () => …)`, aucune dépendance à l'image précédente, aucun fichier de `shared/` ni
de `v7_multivers_4k/` modifié (les importer est permis et recommandé : `voitures.js`, `mondes_et_portails.js`, `actes.js`,
`physique_cgi.js`, `effets_cgi.js`, `../src/decors/salon.js`, `shared/arsenal3d.js` via `ctx.arsenal`…).

## PROTOCOLE « ZÉRO SURCHARGE » (critères de rejet automatique du Chef de régie)

1. **Aucun compteur ni jauge** : pas de km/h, dérive β, g latéral, barre de progression, bandeau technique (ACTE, FPS,
   TIMECODE), graphe MONDE → PORTAIL → RING, liste de pastilles.
2. **UI ≤ 20 % de l'écran**, jamais dans la zone sacrée (rectangle central 30 %–70 % en largeur et en hauteur), **3 textes
   distincts maximum** à l'écran. Écuries : uniquement `#numéro`, `NOM DE L'ÉCURIE`, `pilote · bolide`. Pièges et course :
   zéro interface, au plus un titre pop de 2 ou 3 mots quand un concept apparaît.
   Mesuré automatiquement à chaque image : `window.statsHUD()` → `{ surface, zone_sacree, nb_textes, textes }`.
3. **Pas de tableau type Excel** : les paris passent par le smartphone 3D + pièces d'or + carnet (3 gros boutons lisibles à 3 m).
4. **Un seul gag visuel fort par plan** : pas de particules qui bouchent la caméra, pas de tremblement qui floute le bolide,
   la voiture vedette occupe au moins 25 % de la hauteur (ou de la largeur) de l'image.

## Outils

```bash
# aperçu d'un seul segment (construit seulement lui) : PNG + stats.json + console vérifiée (code 2 si erreur)
node Intro_3D/v8_finale/outils_v8/apercu_v8.js /tmp/claude-0/v8/salon 1,5,9,12 --l 640 --seg salon
python3 Intro_3D/v8_finale/outils_v8/planche.py /tmp/claude-0/v8/salon 4 480     # planche légendée (stats UI)
python3 Intro_3D/v8_finale/render_v8.py --controle          # planche_v8_controle_strict.png (20 clés, 1920×1080) + controle_v8.json
python3 Intro_3D/v8_finale/render_v8.py --video --largeur 960 --fps 24          # sorties/trailer_v8.mp4 avec audio/mix_v8.wav
```
