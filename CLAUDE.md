# CLAUDE.md — Grand Prix de Noël 2026 (guide d'architecture pour Claude Code)

Soirée familiale du **23 décembre** : courses de miniatures (Tomica, Majorette, Hot Wheels, F1) sur une piste
**Hot Wheels Rainbow Road à 5 voies**, régie TV sur la télé du salon (PC relié en HDMI, touche Espace pour avancer),
paris en direct depuis les téléphones des invités, trophées imprimés en 3D (Bambu Lab P1S + AMS).
Ce dépôt est la **vitrine statique (GitHub Pages)** de l'application + le chantier de l'**intro 3D** (`Intro_3D/`).

Site publié : https://estebalap.github.io/grand-prix-noel-2026/

---

## 1. Règles absolues

1. **Langue** : code, commentaires, messages de commit et documents en **français** (comme tout le code existant).
2. **Ne jamais réécrire ce qui existe pour « nettoyer »** : les versions précédentes sont des archives
   (`film_v4.js`, `film_v5.js`, `film_v6.js`, `invocations.js`…). Tout nouveau travail va dans un **nouveau dossier
   ou un nouveau fichier versionné** (ex. `Intro_3D/v7_multivers_4k/`).
3. **Code complet et exécutable** : pas de `TODO`, pas de pseudo-code, pas de géométrie « boîte à chaussures » quand
   une brique haut de gamme existe déjà dans `shared/`.
4. **Zéro erreur console** : les scripts de capture s'arrêtent (code 2) à la moindre `error` ou `warning` console.
   Vérifier avec `node Intro_3D/outils/verifier_webgl.js` avant tout commit.
5. **Déterminisme** : tout aléa passe par une graine (`graineur(n)`, `mulberry`, hash du code du bolide). Deux captures
   doivent donner exactement la même image.
6. **Droits d'auteur** : ne jamais committer d'extrait musical commercial, de son de jeu, de photo de miniature ni de
   vidéo (voir `.gitignore`). Les sons publiés sont uniquement CC0 / CC BY (`sounds/CREDITS_SONS.md`).
7. **three.js r128 global** (`lib/three.min.js`, `window.THREE`) : ne pas importer une autre version de three.js.
   1 unité de scène = 1 cm (une miniature mesure ~7 cm).
8. **Noms de bolides** : courts (2 à 4 mots), soit le vrai nom du modèle, soit une référence que tout le monde comprend
   (films, jeux vidéo, débats politiques de repas de famille équilibrés entre tous les bords). Jamais de nom
   pseudo-héroïque générique. Ne jamais annoncer le nombre de bolides à l'écran (« des dizaines »).

---

## 2. Structure du dépôt

```
/                         ← racine = racine du site GitHub Pages
├── index.html            accueil (QR Showroom + QR « Rejoindre »)
├── start/ tv/ pit/ regie/ reveal/ caisses/ showroom/ pantheon/ paddock/ cinema/ labo/ banc3d/ ouverture/
│                         pages de l'application (chaque dossier : index.html + <page>.js + <page>.css)
├── shared/               CODE COMMUN (modules ES, aucun bundler) — voir §3
├── lib/three.min.js      three.js r128 (global window.THREE)
├── data/                 cars.json (88 fiches bolides), teams.json (15 écuries), circuit.json, rules.json,
│                         musique_*.json, signatures_bolides.json, themes_bolides.json
├── logos/                01.jpg … 15.jpg : logos des 15 écuries (+ meta.json)
├── fonts/                Fredoka, Nunito (OFL)
├── sounds/               banques moteur CC0 / CC BY uniquement (moteurs/, moteurs_reels/, ambiance/, effets/)
├── Intro_3D/             chantier de l'INTRO 3D du show — voir §4
├── docs_claude/          documents de référence (étude trailer, méga-prompt, arsenal V3)
├── .github/workflows/deployer.yml   déploiement par archives _deploiement/*.zip (préserve Intro_3D, docs_claude, CLAUDE.md, RESTAURER_AUDIO_REEL.py)
├── RESTAURER_AUDIO_REEL.py          restaure l'audio sous droits depuis AUDIO_REEL_INTRO_3D*.zip (hors dépôt)
└── CLAUDE.md             ce fichier
```

Le site est **généré** sur le PC d'Esteban par `Edition_23_Decembre/5_Mise_en_ligne/preparer_pages.py` à partir de
`Edition_23_Decembre/3_Application/web/` (vidéos, photos et sons sous droits exclus), puis recopié ici par
`publier_github.py` (ajouts et remplacements seulement, jamais de suppression ; `.git`, `.github`, `README.md`
protégés). **Une modification faite ici dans `shared/` doit donc aussi être reportée dans `3_Application/web/shared/`
sur le PC** (sinon la prochaine publication l'écrase) — signaler chaque fichier `shared/` modifié dans le message de commit.

---

## 3. `shared/` : les briques 3D et audio

Tous les modules sont des **modules ES natifs** (`import … from './x.js'`), sans dépendance npm.
Les fonctions 3D reçoivent `THREE` en paramètre (défaut `window.THREE`).

| Module | Contenu | API principale |
|---|---|---|
| `concept_cars.js` | **15 concept-cars** du Showroom (un par écurie) : carrosseries super-ellipses, clearcoat, carbone, jantes dédiées, animations (`tick`) | `buildConceptCar(teamId 1..15, { quality: 'high' })`, `conceptInfo(id)`, `CONCEPTS` |
| `bolides3d.js` | Constructeur des **bolides 3D sculptés** (75 bolides historiques + N01–N13 = 88 modèles sur mesure), jantes 3D, environnement néon, vue 360° | `await construireBolide3D(code, { THREE, envMap })`, `codesSurMesure()`, `envNeon(THREE, renderer)`, `vue360()`, `ECHELLE` |
| `bolides3d_modeles.js` | Registre `MODELES_SUR_MESURE` (fusion de tous les fichiers `m3d/`) | `MODELES_SUR_MESURE` |
| `m3d/groupe1..10.js`, `m3d/aide_1..8.js`, `m3d/aide_10.js`, `m3d/outils.js` | Modèles par groupe + leurs aides géométriques (il n'existe pas d'`aide_9.js` : `groupe9.js` n'en a pas besoin) | — |
| `m3d/v5_europe.js`, `v5_f1.js`, `v5_france.js`, `v5_nippons.js`, `v5_pop_h.js` | Vague 5 (F1 F01–F10, France FR01–FR05, Japon, Europe, pop/H) | — |
| `m3d/v8_a.js`, `v8_b.js`, `v8_c.js` | Vague 8 : nouveaux bolides N01–N11 | — |
| `m3d/v9_epave.js` | Vague 9 : épaves N12 (Mercedes Classe B W168 cabossée) et N13 | — |
| `decors3d.js` | Décors 3D des **6 univers d'archétype** (manga/Tokyo, gothique/Gotham, post-apo, pop, vintage/gare, blockbuster) + branchement des décors uniques V5 et des ambiances V6 | `creerDecor(THREE, cle, { code, env })` → `{ groupe, lumieres, maj(t, dt, camera), dispose(), … }`, `creerMiroirModele()` |
| `decors_v5.js` | **23 décors uniques** par bolide (U04 E06 P03 P04 H07 H08 TK03 TK05 FR01–FR05 F01–F10) | `decorUnique(code)`, `CODES_DECORS_UNIQUES` |
| `ambiances_v6.js` | **63 ambiances** (étalonnage : gélatines, brouillard, ciel, pluie, reflets) + 63 cadrages | `ambianceDe(code)`, `cadrageDe(code)`, `etalonner(THREE, decor, amb)`, `cielDe()` |
| `roulage.js` | Physique de **sortie roulée** d'un bolide : profil smootherstep, ω = v/R par roue, franchissement de seuil, châssis **ressort-amortisseur du 2ᵉ ordre** (pilonnement + tangage), événements (fumée, étincelles) — testable sous Node | `creerRoulage({...}).pas(t, dt)` |
| `archetypes.js` | 6 archétypes de reveal, post-traitement GLSL (uniformes `u.onde` onde de choc, `u.dechirure` déchirure dimensionnelle), cel-shading, surcouches texte, thèmes sonores | `ARCHETYPES`, `creerPost(THREE, renderer, cle)`, `celShading()`, `creerSurcouche()`, `themeSonore()` |
| `ouverture.js` | Cérémonie d'ouverture et **tracé 3D de la Rainbow Road 5 voies** | `traceRainbow(circuit)`, `jouerOuverture(parent, {...})`, `chronoOuverture()` |
| `signatures.js` | Signatures sonores procédurales des bolides | `outilsSon` |
| `reveal_fret.js`, `hangar3d.js`, `stage3d.js`, `caisses3d.js`, `pantheon3d.js`, `arsenal3d.js` | Scènes 3D des pages (reveal « Lootbox Fret », hangar, showroom, caisses, panthéon, pièges) | — |
| `engine_audio.js`, `moteurs_physiques.js`, `foley_acier.js`, `audio.js` | Synthèse audio procédurale (moteurs, foley) | — |

Codes des bolides : `B01–B17`, `J01–J12`, `U01–U05`, `E02–E08`, `P01–P04`, `H01–H12` (H01 « Le Hawking Express »,
H12 « La Grève » = locomotive sur roues), `F01–F10`, `FR01–FR05`, `TK01–TK06`, `N01–N13`. Détails : `data/cars.json`.

---

## 4. `Intro_3D/` : l'intro 3D du show

Film d'ouverture (~148 s) rendu en temps réel avec three.js : salon d'Esteban modélisé (canapé cuir blanc, tapis rouge
sang, cheminée vitrée en angle, sapin) → arène façon ring de boxe (cordes élastiques, rampe de projecteurs, écran
géant) → appel des 15 écuries avec concept-car + invocation → parc fermé de vrais bolides → paris → titre.

```
Intro_3D/
├── animatic_v6.html        lecteur de l'intro V6 (Espace, ← →, PgPréc/PgSuiv, M = son) — ?capture=1 pour la capture
├── animatic_v4/v5.html     versions archivées ;  apercu_salon.html, apercu_arene.html : décors seuls
├── src/
│   ├── shared_bridge.js    ★ PONT D'IMPORT UNIVERSEL (voir §5) — seul point d'accès à shared/, lib/, data/, logos/
│   ├── film_v6.js          montage, caméras, plans (+ film_v4/v5 archivés)
│   ├── bolides_reels_v6.js chargement des bolides m3d et concept-cars via le pont
│   ├── invocations_v6.js   effets d'invocation par écurie ;  hud_v6.js : HUD broadcast ;  post_v6.js : post-traitement
│   ├── donnees_v6.js       CHEMINS (équipes, logos, rapport audio, plans, mix .wav)
│   └── decors/             salon.js, arene.js, habillage_v6.js
├── data/plans_intro_v6.json        découpage plan par plan (généré par outils/generer_plans_v6.py)
├── outils/
│   ├── generer_plans_v6.py         découpage depuis audio_v6/audio/rapport_v6.json
│   ├── capturer_animatic_v6.py     capture image par image (Playwright) + planches + vidéo FFmpeg
│   └── verifier_webgl.js           contrôle headless : WebGL actif, zéro erreur console
├── audio_v6/sound_v6.py    bande-son V6 (lit voix, thèmes et bruitages dans ../audio_v5) → audio/mix_v6.wav (−16 LUFS)
├── audio_v5/, audio_v4/, audio_sons_reels/   chaînes audio précédentes, voix off (voix/*.mp3), thèmes (themes_ecuries.json)
├── sorties/                planches de référence PNG (planche_intro_v6.png, controle_intro_v6.png…) + controle_intro_v6.json
└── INTRO_V6_STORYBOARD.md  storyboard de référence (+ V4, V5)
```

**Absent du dépôt (volontairement)** : `audio_v5/themes_ecuries/*.mp3` et `audio_v5/signatures_reelles/*.mp3`
(extraits commerciaux), `**/*.wav` (mix), `sorties/*.mp4`. Ils sont fournis en deux archives (Google Drive
d'Esteban / upload direct) : **`AUDIO_REEL_INTRO_3D.zip`** (thèmes, signatures, voix, JSON) et
**`AUDIO_REEL_INTRO_3D_MIX_V6.zip`** (`audio_v6/audio/mix_v6.wav`), à restaurer avec `RESTAURER_AUDIO_REEL.py` :

```bash
python3 RESTAURER_AUDIO_REEL.py --zip /chemin/AUDIO_REEL_INTRO_3D.zip --zip /chemin/AUDIO_REEL_INTRO_3D_MIX_V6.zip --cible Intro_3D
# (sans --zip : prend tous les AUDIO_REEL_INTRO_3D*.zip posés à la racine du dépôt ; chaque fichier est vérifié par SHA-256)
```

Sans l'archive, tout fonctionne sauf le son : l'animatic émet alors l'avertissement « Bande-son absente » (et un 404
sur `mix_v6.wav`), ce qui fait échouer les contrôles stricts ; utiliser `--tolerer-son` avec `verifier_webgl.js`.

---

## 5. Le pont d'import universel (`Intro_3D/src/shared_bridge.js`)

Le même code tourne dans deux dispositions :

| | Dépôt GitHub (Claude Code, Pages) | PC d'Esteban |
|---|---|---|
| Racine servie | racine du dépôt | `C:\Users\esteb\Documents\Noël\00_Lab_Vision_2.0` |
| Application web | `./` (`shared/`, `lib/`, `data/`…) | `Edition_23_Decembre/3_Application/web/` |
| URL de l'intro | `/Intro_3D/animatic_v6.html` | `/Intro_3D/animatic_v6.html` |

Le pont détecte la disposition **sans provoquer de 404** (il lit le dossier parent d'`Intro_3D` : `index.html` dans le
dépôt, listing contenant `Edition_23_Decembre/` sur le PC), confirme par une requête `HEAD` sur `shared/bolides3d.js`,
charge `lib/three.min.js`, puis importe les modules (await de premier niveau). Forcer : `?web=../` ou `window.GP_WEB_ROOT`.

```js
// Dans tout nouveau fichier d'Intro_3D (jamais de chemin en dur vers shared/) :
import { WEB, urlWeb, importerShared, construireBolide3D, codesSurMesure, buildConceptCar, conceptInfo,
         chargerDecors3d, chargerDecorsV5, chargerAmbiancesV6, chargerRoulage, chargerArchetypes, chargerOuverture }
  from '../src/shared_bridge.js';          // chemin relatif depuis votre fichier
const { creerDecor } = await chargerDecors3d();
const { creerRoulage } = await chargerRoulage();
const equipes = await (await fetch(urlWeb('data/teams.json'))).json();
```

Une page HTML doit importer le pont **en premier** (il charge three.js) :
`<script type="module"> import './src/shared_bridge.js'; import { … } from './src/…'; </script>`

---

## 6. Commandes

### Serveur HTTP local (obligatoire : les modules ES ne marchent pas en `file://`)
```bash
python3 -m http.server 8767 --bind 127.0.0.1          # depuis la racine du dépôt
# → http://127.0.0.1:8767/Intro_3D/animatic_v6.html    http://127.0.0.1:8767/showroom/   http://127.0.0.1:8767/tv/
```

### Contrôle headless (Playwright + Chromium SwiftShader) : WebGL actif, zéro erreur console
```bash
node Intro_3D/outils/verifier_webgl.js                                # aperçus + animatic V6 (serveur intégré, port 8790)
node Intro_3D/outils/verifier_webgl.js --tolerer-son                  # si le mix V6 n'est pas restauré
node Intro_3D/outils/verifier_webgl.js Intro_3D/apercu_salon.html showroom/index.html --capture /tmp/captures
```
Code de sortie 0 = propre ; 2 = au moins une page a une erreur de page, une erreur/alerte console ou pas de WebGL.
Playwright est préinstallé dans l'environnement Claude Code (`require('playwright')`, Chromium inclus ; ne pas lancer
`playwright install`). Ailleurs : `npm i playwright && npx playwright install chromium`.
En rendu logiciel, l'animatic V6 met ~40 s à charger (`parc=12`) : prévoir des délais larges.

### Capture image par image + rendu vidéo FFmpeg (déterministe, sans enregistrement d'écran)
```bash
pip install playwright pillow                          # déjà présents dans Claude Code ; ffmpeg dans le PATH
python3 Intro_3D/outils/capturer_animatic_v6.py --cloud --sans-controle                       # planche (1 image / plan)
python3 Intro_3D/outils/capturer_animatic_v6.py --cloud --video --fps 30 --largeur 1280 --parc 24   # MP4 complet avec le son
python3 Intro_3D/outils/capturer_animatic_v6.py --cloud --video --debut 21 --fin 30 --sortie extrait.mp4   # extrait
```
`--cloud` = Chromium headless + SwiftShader (sans GPU). Le script sert la racine (dossier parent d'`Intro_3D`), appelle
`window.rendreTemps(t)` pour chaque image, assemble avec FFmpeg (`libx264`, son `audio_v6/audio/mix_v6.wav`) dans
`Intro_3D/sorties/`. Il s'arrête en erreur (code 2) à la moindre erreur ou alerte console → restaurer l'audio d'abord.

### Régénérer la bande-son puis le découpage
```bash
python3 RESTAURER_AUDIO_REEL.py --cible Intro_3D        # thèmes, voix, mix V6
cd Intro_3D/audio_v6 && pip install numpy scipy soundfile && python3 sound_v6.py   # → audio/mix_v6.wav + rapport_v6.json
cd .. && python3 outils/generer_plans_v6.py              # → data/plans_intro_v6.json
```
`sound_v6.py` réutilise la banque de bruitages réels BBC (`audio_v5/telecharger_sons_bbc.py`, téléchargement unique).

---

## 7. Flux de synchronisation PC ⇄ GitHub

- **PC → GitHub** : `5_Mise_en_ligne/PUBLIER_GITHUB.bat` (site) ; synchronisation complète d'`Intro_3D` par Claude (Cowork).
- **GitHub → PC** : `00_Lab_Vision_2.0\Intro_3D\SYNCHRONISER_DEPUIS_GITHUB.bat` fait `git pull` dans
  `Edition_23_Decembre\_Travail\depot_github_2026` puis recopie les nouveautés de `depot_github_2026\Intro_3D\`
  vers `00_Lab_Vision_2.0\Intro_3D\` (ajouts et remplacements, jamais de suppression ; les .wav/.mp4/.mp3 locaux ignorés
  par git ne sont pas touchés).
- Le travail de Claude Code doit donc rester **dans `Intro_3D/`** (ou `docs_claude/`) pour revenir automatiquement
  sur le PC. Tout changement dans `shared/` doit être signalé (il faut le reporter dans `3_Application/web/shared/`).
- Journal de progression conseillé : `docs_claude/PROGRESSION_*.md`, mis à jour à chaque étape.

## 8. Documents de référence (`docs_claude/`)

- `ETUDE_TRAILER_3D_BLOCKBUSTER.md` : benchmark des intros de course, storyboard, stack de capture « zéro saccade »,
  rapports de régie V5 et V6 (audit des causes racines).
- `MEGA_PROMPT_HYBRIDE_V6_ULTIME.md` : procédure de synchronisation + méga-prompt du trailer CGI 4K V7 « Multivers → Ring ».
  Attention : certains inventaires de ce prompt sont approximatifs ; **la source de vérité est le code** (§3).
- `ARSENAL_MECA_ET_GAMEPLAY_V3.md` : pièges mécatroniques « arcade one-shot » sur la piste (homologation du 24–25 oct.).
