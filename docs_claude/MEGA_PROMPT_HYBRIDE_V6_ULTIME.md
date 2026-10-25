# GUIDE & DOUBLE PROMPT — SYNCHRONISATION CLOUD (GITHUB / DRIVE) + MÉGA-PROMPT CLAUDE CODE (CGI 4K MULTIVERS)

Ce document contient les **2 prompts successifs** :
1. **PROMPT 1 (Préparation & Synchronisation Cloud GitHub / Drive)** : à envoyer à ta session Claude actuelle (qui a accès à ton disque local `C:\Users\esteb\Documents\Noël` et `C:\Users\esteb\Documents\CLAUDE`) pour mettre à jour le dépôt GitHub `estebalap/grand-prix-noel-2026` (qui n'avait plus été synchronisé depuis le 12 octobre et à qui il manquait `v9_epave.js`, `v8_*`, `v5_*`, `decors_v5.js`, `ambiances_v6.js` et tout le dossier `Intro_3D`), générer le `CLAUDE.md` à la racine du dépôt, et préparer le pack audio Drive.
2. **PROMPT 2 (Le Méga-Prompt natif pour Claude Code)** : spécialement formaté pour **Claude Code** (qui lit automatiquement `CLAUDE.md`, utilise ses sous-agents natifs `Task` en parallèle, et repart de zéro dans `Intro_3D/v7_multivers_4k/` pour créer le trailer CGI 4K Multivers -> Portail -> Ring Commun en accelerando).

---

## ÉTAPE 1 — PROMPT DE SYNCHRONISATION CLOUD (GITHUB + DRIVE)
*(À coller dans ton Claude actuel qui a accès à tes dossiers locaux Windows)*

```xml
<task_cloud_sync_for_claude_code>
Tu dois préparer et synchroniser l'intégralité du projet local vers le Cloud (dépôt GitHub `https://github.com/estebalap/grand-prix-noel-2026.git` cloné dans `C:\Users\esteb\Documents\Noël\00_Lab_Vision_2.0\Edition_23_Decembre\_Travail\depot_github_2026` + pack Google Drive) pour que **Claude Code** dispose de 100 % des fichiers à jour.

Diagnostic actuel constaté sur le disque :
- Le clone GitHub `_Travail\depot_github_2026` est bloqué au commit `928a55e` du 12 octobre 2026.
- Il lui manque dans `shared/` : `ambiances_v6.js`, `decors_v5.js`, toutes les nouvelles voitures 3D dans `shared/m3d/` (`v5_europe.js`, `v5_f1.js`, `v5_france.js`, `v5_nippons.js`, `v5_pop_h.js`, `v8_a.js`, `v8_b.js`, `v8_c.js`, `v9_epave.js`), ainsi que les mises à jour de `bolides3d.js`, `bolides3d_modeles.js`, `archetypes.js`, `decors3d.js`, `signatures.js` et `m3d/groupe1..10.js`.
- Il ne contient pas non plus le chantier `Intro_3D` ni de fichier `CLAUDE.md` à sa racine.

Exécute dans l'ordre les 5 opérations suivantes sans demander de confirmation :

### 1. Synchronisation de `3_Application/web` vers `_Travail/depot_github_2026`
- Exécute `preparer_pages.py` dans `C:\Users\esteb\Documents\Noël\00_Lab_Vision_2.0\Edition_23_Decembre\5_Mise_en_ligne\` et copie les fichiers mis à jour vers `_Travail\depot_github_2026`.
- Vérifie explicitement que `_Travail\depot_github_2026\shared\` contient bien :
  - `concept_cars.js`, `bolides3d.js`, `bolides3d_modeles.js`, `decors3d.js`, `decors_v5.js`, `ambiances_v6.js`, `roulage.js`, `archetypes.js`, `ouverture.js`, `signatures.js`
  - Et dans `shared/m3d/` : `v5_europe.js`, `v5_f1.js`, `v5_france.js`, `v5_nippons.js`, `v5_pop_h.js`, `v8_a.js`, `v8_b.js`, `v8_c.js`, `v9_epave.js`, `groupe1.js` à `groupe10.js`, `aide_1.js` à `aide_10.js`, `outils.js`.

### 2. Intégration propre de `Intro_3D` dans `_Travail/depot_github_2026/Intro_3D` (Code + Outils + Données + Pont d'Import Universel)
- Copie `C:\Users\esteb\Documents\Noël\00_Lab_Vision_2.0\Intro_3D\` vers `_Travail\depot_github_2026\Intro_3D\` en filtrant intelligemment :
  - **INCLURE :** Tous les fichiers `.js`, `.html`, `.css`, `.py`, `.json`, `.md`, `.bat` (`src/`, `outils/`, `data/`, `audio_v5/*.py`, `audio_v5/*.json`, `audio_v5/voix/mots_prise_A.json`, `audio_v6/*.py`, `audio_v6/*.json`, `sorties/controle_intro_v6.json`), ainsi que les planches PNG de référence (`sorties/planche_intro_v6.png`, `sorties/controle_intro_v6.png`).
  - **EXCLURE (via `.gitignore`) :** Les vidéos lourdes `.mp4`, les mix `.wav` (> 5 Mo), et les extraits musicaux commerciaux `audio_v5/themes_ecuries/*.mp3` (pour respecter les droits d'auteur sur le dépôt GitHub public et éviter la limite de 100 Mo).
  - **INCLURE LES VOIX OFF ORIGINALES :** Tu peux inclure `Intro_3D/audio/vo/*.mp3` et `Intro_3D/audio_v5/voix/*.mp3` (ce sont les enregistrements vocaux privés du projet, très légers < 3 Mo au total) OU les mettre dans le pack Drive si tu préfères.
- **Pont d'import universel (Crucial pour Claude Code Cloud vs PC Local) :**
  - Dans le PC local, `Intro_3D/src/` importe `../../Edition_23_Decembre/3_Application/web/shared/...`.
  - Dans le dépôt GitHub `_Travail/depot_github_2026`, `shared/` est à la racine (`../shared/` depuis `Intro_3D/`).
  - Crée un module pont `Intro_3D/src/shared_bridge.js` (ou configure un `importmap` / lien relatif propre + un dossier miroir ou symlink si nécessaire) pour que les imports vers `shared/concept_cars.js`, `shared/bolides3d.js`, `shared/decors3d.js`, `shared/decors_v5.js`, `shared/ambiances_v6.js`, `shared/roulage.js`, `shared/archetypes.js` et `shared/ouverture.js` fonctionnent **aussi bien dans le dépôt GitHub cloné par Claude Code que sur le PC local d'Esteban** !

### 3. Création du `CLAUDE.md` à la racine du dépôt GitHub + Dossier `docs_claude/`
- Copie dans `_Travail/depot_github_2026/docs_claude/` les fichiers de référence :
  - `C:\Users\esteb\Documents\CLAUDE\ETUDE_TRAILER_3D_BLOCKBUSTER.md`
  - `C:\Users\esteb\Documents\CLAUDE\MEGA_PROMPT_HYBRIDE_V6_ULTIME.md`
  - `C:\Users\esteb\Documents\CLAUDE\ARSENAL_MECA_ET_GAMEPLAY_V3.md`
- Crée à la racine `_Travail/depot_github_2026/CLAUDE.md` un guide d'architecture technique complet pour Claude Code expliquant :
  - La structure du dépôt (`shared/` contenant les 15 Concept-Cars `concept_cars.js`, les 75 bolides 3D `bolides3d.js` + `m3d/v9_epave.js`, les 19 mondes 3D `decors3d.js` + `decors_v5.js`, les 60+ ambiances `ambiances_v6.js`, la physique de suspension `roulage.js`, les shaders `archetypes.js`, la piste 5 voies `ouverture.js`, et le chantier `Intro_3D/`).
  - Les commandes exactes pour lancer un serveur HTTP local, exécuter Playwright Headless, vérifier l'absence d'erreurs WebGL, et générer un rendu FFmpeg.
  - La règle d'or de synchronisation : tout travail fait dans Claude Code sur GitHub doit pouvoir être récupéré sur le PC Windows d'Esteban via un simple script `SYNCHRONISER_DEPUIS_GITHUB.bat` (que tu vas aussi créer dans `C:\Users\esteb\Documents\Noël\00_Lab_Vision_2.0\Intro_3D\SYNCHRONISER_DEPUIS_GITHUB.bat` !) qui fait `git pull` dans `_Travail/depot_github_2026` et recopie les nouveautés de `Intro_3D/` vers `00_Lab_Vision_2.0\Intro_3D\`.

### 4. Préparation du Pack Audio Réel pour Google Drive / Upload direct
- Crée un dossier `C:\Users\esteb\Documents\CLAUDE\PACK_CLOUD_POUR_CLAUDE_CODE\` contenant :
  - `AUDIO_REEL_INTRO_3D.zip` : archive regroupant `audio_v5/themes_ecuries/` (les 15 MP3 réels + `themes_ecuries.json`), `audio_v5/voix/` et `audio/vo/`, plus `audio_v6/timeline_v6.json` et `audio_v6/rapport_v6.json`.
  - Un script `RESTAURER_AUDIO_REEL.py` qui, si on dépose `AUDIO_REEL_INTRO_3D.zip` dans Claude Code Cloud (ou depuis Google Drive), extrait automatiquement les MP3 au bon endroit dans `Intro_3D/audio_v5/`.
  - Assure-toi aussi que si les MP3 ne sont pas présents dans le conteneur Cloud, le moteur de mixage Python peut utiliser `audio_v6/timeline_v6.json` (qui contient déjà les temps forts exacts mesurés sur les 15 vrais MP3 !) ou synthétiser un proxy audio de test, tandis que sur le PC d'Esteban il mixe les 15 vrais MP3.

### 5. Commit & Push vers GitHub + Vérification finale
- Dans `_Travail/depot_github_2026`, exécute `git add -A`, vérifie avec `git status` qu'aucun fichier > 25 Mo ou MP3 sous droits n'est stagé, fais un commit `"Sync complet pour Claude Code : 75 bolides m3d (v9), 15 concept-cars, mondes 3D, Intro_3D et CLAUDE.md"` et fais `git push origin main`.
- Affiche le hash du commit poussé, la liste des fichiers synchronisés, et l'emplacement de `AUDIO_REEL_INTRO_3D.zip` et `SYNCHRONISER_DEPUIS_GITHUB.bat`.
</task_cloud_sync_for_claude_code>
```

---

## ÉTAPE 2 — LE MÉGA-PROMPT ADAPTÉ POUR CLAUDE CODE (CGI 4K MULTIVERS)
*(À coller dans **Claude Code** une fois le dépôt GitHub synchronisé — avec le modèle **Claude Opus 4.6** et **Extended Thinking / `ultrathink`** activé)*

```xml
<claude_code_mission>
ultrathink
Tu es dans **Claude Code**, connecté au dépôt du projet « Grand Prix de Noël — Rainbow Road ».
Lis d'abord `CLAUDE.md` à la racine du dépôt ainsi que `docs_claude/ETUDE_TRAILER_3D_BLOCKBUSTER.md` pour charger tout le contexte technique.

Ta mission est de construire **EN PARTANT DE ZÉRO (Clean-Slate)** dans un nouveau dossier `Intro_3D/v7_multivers_4k/` le **Trailer CGI 4K (3840×2160 à 60 fps) « MULTIVERSE TO RING ARENA »**.
</claude_code_mission>

<why_we_start_from_scratch_in_v7>
Les versions précédentes (`film_v5.js` et son patch `film_v6.js`) ont deux limites structurelles majeures :
1. **Effet « Simulation Numérique SolidWorks / CAO » :**
   - Dans `film_v5.js` et `film_v6.js`, les voitures sont déplacées par une fonction rigide `poser(v, p, cap, distance, roulis, tangage)` sur des trajectoires plates, sans solveur de suspension ressort-amortisseur 4 roues, sans braquage des roues avant, sans angle de dérive (drift slip-angle $\beta$ entre le vecteur vitesse et l'axe du châssis), et dans un décor unique de salon/arène.
   - Nous voulons un **vrai rendu CGI cinématographique** (inspiré de *Blur Studio*, *Forza Horizon*, *Hot Wheels Unleashed* et *Spider-Verse*) qui respecte la direction artistique du projet mais avec de vraies animations physiques, de vrais détails géométriques et lumineux, et de vraies caméras cinéma.
2. **Nouveau Concept Narratif : « CHAQUE VOITURE EN ACTION DANS SON MONDE NATIF $\to$ PORTAIL DIMENSIONNEL $\to$ ENTRÉE DANS LE RING COMMUN + ACCELERANDO » :**
   - **Interdiction de remodeler `film_v5.js` ou `film_v6.js` :** Garde-les intacts comme archives et repars d'une feuille blanche dans `Intro_3D/v7_multivers_4k/`.
   - Lors de la présentation des 15 écuries :
     1. On voit d'abord le **Concept-Car Showroom (`buildConceptCar(teamId)`)** accompagné de son **Bolide Sculpté (`construireBolide3D(code)`)** **EN PLEINE ACTION À HAUTE VITESSE DANS LEUR PROPRE MONDE 3D NATIF** (en exploitant et enrichissant les 19 mondes 3D de `shared/decors_v5.js` et `shared/decors3d.js` + `shared/ambiances_v6.js`).
     2. Au pic d'intensité (le temps fort exact `impact` du thème musical de l'écurie), la voiture **franchit à pleine vitesse un Portail Dimensionnel / Déchirure d'espace-temps** (combinant une arche vortex 3D et le shader `u.dechirure` / `u.onde` de `shared/archetypes.js`).
     3. Elle **jaillit hors du portail dans le RING COMMUN (l'Arène Centrale Rainbow Road)** en un **dérapage contrôlé lourd** (angle de drift $\beta$, contre-braquage des roues avant, compression des amortisseurs à la réception, gerbe d'étincelles et fumée de pneus sur le sol miroir en obsidienne humide).
     4. **Accumulation dans le Ring Commun :** Chaque voiture qui est entrée dans le Ring lors des plans précédents **reste présente et vivante dans le Ring** (phares allumés, ralenti moteur vibrant, rangée en arc de cercle prédateur) ! De l'écurie 1 à l'écurie 15, le Ring se remplit progressivement sous nos yeux.
     5. **Montage en Accelerando / Crescendo d'intensité :** Le rythme s'accélère progressivement (Vague 1 : ~3,5 s/écurie pour installer le concept Monde $\to$ Portail $\to$ Ring ; Vague 2 : ~2,7 s/écurie plus nerveux avec caméras rases ; Vague 3 : ~2,0 s/écurie en rafale frénétique où les portails s'ouvrent tout autour du Ring avant le lâcher de la meute sur la piste à 5 voies !).
</why_we_start_from_scratch_in_v7>

<existing_codebase_bricks_to_leverage>
N'écris JAMAIS de géométries basiques « boîtes à chaussures » : importe et orchestre les briques haut de gamme déjà présentes dans `shared/` (ou `../../Edition_23_Decembre/3_Application/web/shared/` via le pont d'import) :
1. **`shared/concept_cars.js` :** `buildConceptCar(1..15, { quality: 'high' })` et `conceptInfo(1..15)` — les 15 Concept-Cars du Showroom avec carrosseries super-ellipses, vernis clearcoat, carbone tissé, jantes 3D dédiées, `tick(t)` (flammes, kanjis `ゴゴゴ`, et pour l'Écurie 8 la dépanneuse blindée `Oil-Leak Recovery Mk.II` qui remorque physiquement la berline `SEDAN_A4` avec fuite d'huile animée).
2. **`shared/bolides3d.js` + `shared/bolides3d_modeles.js` + `shared/m3d/` (`v9_epave.js`, `v8_a/b/c.js`, `v5_*.js`, `groupe1..10.js`) :** Les 75 bolides 3D sculptés à jour (dont les 5 F1 `F01..F05`, la Batmobile `B16`, l'épave cabossée fumante Mercedes Classe B W168 `N12` et la fusée Jet Threat `N13`).
3. **`shared/decors_v5.js` + `shared/decors3d.js` + `shared/ambiances_v6.js` :**
   - Les 13 mondes 3D de `decors_v5.js` (`stage_concert`, `garage_f1`, `autoroute_pluie`, `casse_industrielle`, `col_montagne`, `desert_route66`, `circuit_ovale`, `gotham_nuit`, `grille_neon`, `atelier_bois`, `vallee_sucree`, `foret_ancienne`, `hangar_spatial`) + les 6 mondes de `decors3d.js` (`space`, `cyber`, `desert`, `forest`, `glacier`, `volcano`) + `creerMiroirModele()` pour les vrais reflets planaires au sol.
4. **`shared/roulage.js` :** La logique de suspension ressort-amortisseur du second ordre (heave, pitch, roll, braquage des roues, fumée et étincelles).
5. **`shared/archetypes.js` :** Les shaders GLSL `u.dechirure` (déchirure dimensionnelle aux lèvres incandescentes), `u.onde` (onde de choc), et les 6 modes d'étalonnage couleur.
6. **`shared/ouverture.js` :** `traceRainbow(circuit)` pour la piste 3D Rainbow Road à 5 voies avec dévers et pente.
</existing_codebase_bricks_to_leverage>

<claude_code_subagent_orchestration>
Utilise les fonctionnalités natives de **Claude Code** :
- Initialise immédiatement ta liste de tâches avec `TodoWrite` et crée le journal persistant `docs_claude/PROGRESSION_V7_CGI_4K.md` (mis à jour à chaque étape pour ne jamais perdre l'état).
- Utilise l'outil **`Task` (Sub-Agents parallèles de Claude Code)** pour paralléliser le travail entre **6 Agents Spécialisés** :

### SUB-AGENT 1 (`Role: World_and_Portal_Architect`) — `Intro_3D/v7_multivers_4k/mondes_et_portails.js`
- Associe à chacune des 15 écuries son **Monde Natif 3D** (basé sur `decors_v5.js` / `decors3d.js` + ses effets d'invocation : Route 66 country & étincelles pour Mimine, `vallee_sucree` & pluie de bonbons pour Twingo Oasis, stroboscope & arcs électriques pour Optic, tapis de cartes Joker en lévitation pour Tata Freddy, saut parabolique & château pour Mario, scène symphonique & portées lumineuses pour Symphonie, `foret_ancienne` & rayon sacré Triforce pour Yaris, `autoroute_pluie` & dépanneuse remorquant l'A4 en fuite d'huile pour Écurie 8, piqué stratosphérique de comète pourpre pour Titou Wyvern, Éclipse rouge sang & monolithes pour Doom Slayer, observatoire stellaire & Lumas pour Milo, Caire crépusculaire & kanjis `ゴゴゴ` + émeraudes pour Bob, `col_montagne` / `cyber` & drift néon pour Jojo AE86, `grille_neon` & explosions d'encre 360° pour Ninja-Nissan, jardin impérial & tourbillon de pétales pour Princess Daisy).
- Construit le **Portail Dimensionnel 3D (Rift Gate)** à la sortie de chaque monde natif et à l'entrée du **Ring Commun Rainbow Road** (sol miroir obsidienne humide `creerMiroirModele`, anneau arc-en-ciel, éclairage dramatique volumétrique, et stationnement progressif des voitures déjà entrées dans le Ring).

### SUB-AGENT 2 (`Role: CGI_Physics_and_Animation`) — `Intro_3D/v7_multivers_4k/physique_cgi.js`
- Crée un moteur cinématique-dynamique **100 % déterministe en fonction pure du temps `t`** (pour que le rendu image par image à 60 fps soit parfait) mais avec un **vrai comportement physique CGI** :
  - **Trajectoires Splines Catmull-Rom 3D** avec calcul analytique du vecteur vitesse $\vec{v}(t)$, de l'accélération longitudinale $a_{\parallel}(t)$ et de l'accélération centripète latérale $a_{\perp}(t) = \kappa v^2$.
  - **Angle de Dérive (Drift Slip-Angle $\beta(t)$) :** En courbe et à la sortie du Portail dans le Ring, la carrosserie pivote d'un angle de dérive $\beta \in [14^\circ, 34^\circ]$ avec **contre-braquage physique des roues avant** ($\delta_{\text{front}} = -0.85\,\beta$) tandis que les étriers de frein restent fixes par rapport au porte-fusée.
  - **Suspension 4 Roues (Heave, Pitch, Squat, Dive, Roll) :**
    - Cabrage arrière (`pitch < 0`) lors du boost vers le portail,
    - Plongée avant (`pitch > 0`) et écrasement (`heave < 0`) avec rebond amorti ($\zeta = 0.65, \omega_n = 14\text{ rad/s}$) à l'atterrissage dans le Ring,
    - Roulis extérieur (`roll`) proportionnel à l'accélération latérale $a_{\perp}(t)$,
    - Micro-vibrations haute fréquence de la route sur les roues filtrées par la suspension.
  - **Sillage Physique :** Rubans de gomme / fumée volumétrique sous les pneus arrière en drift, cônes de post-combustion bleus/dorés aux échappements, et gerbes d'étincelles tangentielles à l'impact.

### SUB-AGENT 3 (`Role: Cinematographer_Accelerando`) — `Intro_3D/v7_multivers_4k/camera_crescendo.js`
- Conçoit la réalisation caméra et le découpage en **6 Actes Fluides (~115 à 125 s au total)** :
  - **Acte I (0:00 – 0:11) — Prologue Cosmique Rainbow Road :** Rase-bitume sur le ruban 3D à 5 voies (`traceRainbow`), passage rugissant de la meute à 300 km/h, ouverture sur l'Arène Centrale.
  - **Acte II (0:11 – 0:53) — Le Multivers des 15 Écuries en 3 Vagues d'Accelerando :**
    - *Phase A de chaque écurie (Monde Natif, 55 % de la durée du plan) :* Caméra d'action poursuivant le duo (Concept-Car Showroom au premier plan + Bolide m3d en ailier) en pleine cascade dans son biome 3D, FOV qui s'ouvre ($45^\circ \to 65^\circ$) en fonçant dans le Portail Dimensionnel.
    - *Impact Portail (sur le beat exact du thème musical) :* Flash directionnel + onde de déchirure (`u.dechirure`) + franchissement du portail.
    - *Phase B de chaque écurie (Arrivée dans le Ring Commun, 45 % de la durée) :* Sortie du portail en drift lourd dans le Ring entouré des voitures déjà arrivées ; la caméra passe instantanément en **Longue Focale Téléobjectif ($28^\circ\text{–}32^\circ$) + Slow-Motion Dolly Hold amorti** (vitesse caméra réduite de 85 %, horizon à $0^\circ$, voiture cadrée sur le tiers avec espace négatif propre) pour lire confortablement le HUD Broadcast de l'écurie !
    - *Accelerando :* Vague 1 (Écuries 1–4 : ~3,5 s) $\to$ Vague 2 (Écuries 5–10 : ~2,7 s) $\to$ Vague 3 (Écuries 11–15 : ~2,1 s, frénésie où les derniers portails crépitent tout autour du Ring).
  - **Acte III (0:53 – 1:09) — Lâcher de la Meute des 15 Écuries sur les 5 Voies & Caisses Mystères + Teaser Silhouette Noire (`TK06` en rim-light cyan).**
  - **Acte IV (1:09 – 1:29) — Les 3 Univers Boss en Vrais Décors 3D :**
    - *Gotham (`gotham_nuit`) :* La Batmobile `B16` surgissant sous les éclairs et la pluie,
    - *Formule 1 (`garage_f1` + ligne droite) :* Les 5 F1 (`F01..F05`) déboulant en formation flèche à 310–330 km/h avec secousse aérodynamique au passage caméra,
    - *Apocalypse (`casse_industrielle` / `desert`) :* L'épave cabossée fumante Mercedes Classe B W168 (`N12` de `v9_epave.js`) entourée de ses carcasses face au réacteur en fusion de la Jet Threat 4.0 (`N13`).
  - **Acte V (1:29 – 1:47) — Les 10 Pièges Mécaniques V2 en Action, la Règle Sacrée des 41 mm & le Tableau des Paris de Famille.**
  - **Acte VI (1:47 – 2:00) — Climax des 75 Bolides Réunis, Trophée Or & Appel Final « FAITES VOS JEUX ! ».**

### SUB-AGENT 4 (`Role: Shaders_PostFX_and_4K_HUD`) — `Intro_3D/v7_multivers_4k/post_cgi_4k.js` & `hud_broadcast_4k.js`
- **Pipeline Post-Processing CGI (`post_cgi_4k.js`) :**
  - Intègre l'effet de **Déchirure Dimensionnelle (`u.dechirure`)** et d'**Onde de Choc (`u.onde`)** lors des passages de portails,
  - **Motion Blur Temporel Cinématique (Sub-frame Shutter Accumulation) :** En mode export 4K/1080p master, permet de moyenner $M = 3$ sous-expositions temporelles par frame ($t - \delta t, t, t + \delta t$ avec angle d'obturateur $180^\circ$) + flou radial directionnel lors des boosts dans le portail,
  - Étalonnage ACES Filmic, Bloom maîtrisé (sans jamais brûler les carrosseries), Vignette optique et reflets d'environnement.
- **HUD Broadcast 4K Vectoriel Crisp (`hud_broadcast_4k.js`) :**
  - Rendu **APRÈS** le post-processing WebGL à la résolution native (`3840×2160` en 4K) : cartels d'écuries style F1 Broadcast, indicateur du Monde Natif d'origine + Portail + Ring, jauges télémétriques, cartes des univers, tableau des paris et rappel *« Sans téléphone ? Pariez au carnet ! »*.

### SUB-AGENT 5 (`Role: Audio_DSP_Crescendo`) — `Intro_3D/v7_multivers_4k/sound_v7_crescendo.py`
- Construit la bande-son `mix_v7.wav` et le fichier maître `timeline_v7.json` synchronisé sur l'Accelerando (Vagues 1, 2, 3) :
  - Utilise les 15 extraits réels de `Intro_3D/audio_v5/themes_ecuries/` (ou, s'ils sont absents du conteneur cloud GitHub, génère un mix de travail tout en utilisant les offsets de beats réels de `themes_ecuries.json` / `timeline_v6.json`, de sorte que `LANCER_V7_4K.bat` sur le PC d'Esteban mixe automatiquement les 15 vrais MP3 !).
  - Ajoute à chaque franchissement de portail une **Macro Portail DSP** : Riser spectral stéréo $\to$ Craquement dimensionnel $\to$ Sub-Drop continu en phase ($105\text{ Hz} \to 32\text{ Hz}$) + Crissement de pneus de réception dans le Ring.
  - Ajoute un **Pulse Heartbeat / Bass Bed en Accelerando** dont le tempo monte progressivement de la Vague 1 à la Vague 3 pour faire monter la tension jusqu'à l'explosion finale.
  - Crossfades $\cos/\sin$ sans aucune coupure sèche et sidechain doux sous la voix off.

### SUB-AGENT 6 (`Role: QA_and_4K_Renderer`) — `Intro_3D/v7_multivers_4k/render_v7_4k.py` & `LANCER_TRAILER_V7_4K.bat`
- Crée le pipeline de rendu déterministe supportant :
  - `--qualite 4k` : **`3840×2160` à `60 fps`**, encodage matériel GPU auto-détecté (`h264_nvenc` / `hevc_nvenc -cq 16` sur le PC d'Esteban, ou `libx264 -crf 16` en fallback), avec option `--subframes 3` pour le vrai Motion Blur temporel CGI.
  - `--qualite 1080p` : `1920×1080` à `60 fps`.
  - `--qualite apercu_cloud` : aperçu rapide + **Planche Contact HD de 36 Keyframes (`sorties/planche_v7_multivers.png`)** montrant côte à côte pour les écuries : *(1) Action dans le Monde Natif $\to$ (2) Traversée du Portail $\to$ (3) Drift dans le Ring Commun*, ainsi que la Meute, Gotham, les 5 F1, l'Épave `N12` + Jet Threat `N13`, les Pièges et le Trophée.
- Crée `Intro_3D/LANCER_TRAILER_V7_4K.bat` (avec menu : 1 = Temps réel dans le navigateur, 2 = Rendu 1080p 60fps, 3 = **Rendu Master 4K 3840×2160 60fps CGI**).
</claude_code_subagent_orchestration>

<strict_verification_protocol>
Avant de conclure :
1. Lance le test automatisé Playwright Headless sur `Intro_3D/v7_multivers_4k/index.html` : vérifie **0 erreur console**, la présence des **15 Concept-Cars Showroom + 75 bolides m3d**, le fonctionnement des **15 Mondes Natifs + Portails + Ring Commun évolutif**, et la **physique de drift/suspension ($\beta \neq 0$, roues avant contre-braquées, pitch/roll actifs)**.
2. Génère la planche de contrôle `Intro_3D/sorties/planche_v7_multivers.png` et un extrait vidéo de démonstration, et inspecte visuellement l'image générée pour vérifier la qualité CGI, l'éclairage des mondes et la lisibilité du HUD 4K.
3. Si tu es connecté au dépôt GitHub, fais un `git add`, `git commit` et `git push` propre pour qu'Esteban puisse tout récupérer sur son PC en un clic avec `SYNCHRONISER_DEPUIS_GITHUB.bat`.
</strict_verification_protocol>
```
