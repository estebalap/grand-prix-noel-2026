# ÉTUDE — TRAILER 3D « BLOCKBUSTER » DU GRAND PRIX DE NOËL

*25 octobre 2026. Phase : étude et plan, aucun fichier existant modifié.*
*Prototype prévu dans `Noël\00_Lab_Vision_2.0\Trailer_3D\` (nouveau dossier, isolé).*

---

## 0. Résumé en 6 lignes

1. **Format** : 30 s, 1920×1080 et 3840×2160, **60 i/s**, MP4 H.264 High. Mastering −16 LUFS, crête vraie ≤ −2 dBTP. Lu par la régie comme l'intro actuelle.
2. **Rupture visuelle** : plus de cartes 2D ni de bandeaux. 100 % de l'image est une scène **Three.js** qui utilise les vrais modèles `m3d` / `bolides3d_modeles.js` et le jumeau numérique `circuit.json`.
3. **Principe d'ingénierie conservé** : l'image est une **fonction pure du temps**, `renderFrame(t)`. C'est déjà la méthode d'Intro Catch v3 (`render(t)`, Playwright, ffmpeg). Pas de `Date.now()`, pas de `Math.random()` non semé, pas de physique en temps réel.
4. **Ce qu'on garde** : la grammaire sonore d'origine (Shepard, sub-boom 35 Hz, prises moteur, brickwall), recoupée sur 30 s. Les **coups de grosse caisse pilotent la caméra** : secousse, coup de FOV, flash.
5. **Le « look cinéma » vient du rendu hors ligne**. On n'est pas obligé de tenir 60 i/s en direct, donc on se permet un **vrai flou de mouvement par sur-échantillonnage temporel** (8 à 16 sous-images par image) et des passes coûteuses (bloom HDR, flare anamorphique, brouillard volumétrique).
6. **Capture sans saccade** : rendu image par image sur le PC d'Esteban (Chrome + GPU), sans enregistrement en temps réel. Encodage WebCodecs dans la page, ou séquence d'images vers ffmpeg en solution de secours.

---

## 1. Benchmark : ce qui fait la force des grandes intros de course

| Référence | Signature visuelle | Rythme / montage | Ce qu'on en retient pour le GP |
|---|---|---|---|
| **Générique F1 2018** (Drive Studio, musique Brian Tyler) | Matières 3D brillantes et surfaces lisses, à rebours de l'habillage sportif plat. Métaphores techniques : bande de roulement, huile qui bout, drapeaux. | Montage *staccato*. **Une ligne rouge** sert de fil conducteur : elle devient 3D, franchit la ligne d'arrivée et forme le logo. | **Un motif unique qui traverse tout le film** : chez nous, le **ruban arc-en-ciel** de la Rainbow Road. Il naît en étincelle à 0 s et devient la piste puis le titre. Tension entre l'humain (les écuries de la famille) et la machine. |
| **GT7 – film d'ouverture** | Hommage à l'histoire de l'automobile, puis bascule vers des images de jeu « ultra-nettes ». | Long (environ 8 min). Le pivot central est un plan d'usine. | **La bascule** : passer du « musée » (macro sur pièces, lumière de studio) à la « course » (lumière de piste, vitesse). Nos 5 premières secondes reprennent ce passage de l'atelier à la piste. |
| **Need for Speed Unbound** | 3D réaliste plus effets graphiques dessinés (ailes, fumées cartoon). | Coupes sur le temps fort, beaucoup de *speed ramps* (ralenti puis accélération). | Les **speed ramps** : chaque dépassement en ralenti à 15 % puis accélération à 100 % sur la caisse claire. Effets stylisés permis (traînées néon) tant que les voitures restent en 3D. |
| **Forza Horizon** (trailers) | Lumière dorée, caméras drone et poursuite, paysages. | Plans plus longs, montée orchestrale. | La **vue hélico** de la section 18 à 25 s : un long plan-séquence qui respire avant le climax. |
| **Hot Wheels Unleashed** | Échelle jouet assumée, pistes orange dans une maison, macro et faible profondeur de champ. | Rapide, ludique. | **Notre vérité physique** : ce sont des miniatures sur une vraie piste. La faible profondeur de champ (*tilt-shift*) dit « jouet magnifié », pas « fausse vraie voiture ». C'est cohérent avec la soirée. |
| **Redline** (anime) | Déformation extrême de la perspective, lignes de vitesse, couleurs saturées. | Accélérations brutales, plans de 4 à 8 images. | Le **coup de FOV** : 35° → 95° en 6 images sur les accélérations, plus les traînées radiales. À réserver aux 2 ou 3 temps forts pour que l'effet reste fort. |

### Règles de mise en scène tirées du benchmark

- **Règle des 3 échelles** : macro (pièce), moyenne (voiture), géante (piste ou hélico). On ne reste jamais plus de 2 plans dans la même échelle.
- **Durée des plans** : 1,5 à 2,5 s dans l'éveil, 0,4 à 1,2 s dans le défilé, un plan-séquence de 5 à 7 s en tension, puis des plans de 4 à 8 images avant LIGHTS OUT. Cette courbe d'accélération du montage suit la montée de Shepard.
- **Un motif conducteur** : le ruban arc-en-ciel, présent dans chaque plan (reflet, néon, piste, titre).
- **Lumière motivée** : chaque source a une raison d'être (phares, feux de départ, néons de garage). Pas d'éclairage « studio » neutre après 5 s.
- **Le silence avant l'impact** : 0,4 s de quasi-vide (un tic métallique) juste avant LIGHTS OUT, comme le silence total déjà utilisé dans l'intro TV.
- **Contraintes maison** : aucune marque ni logo réel, ni nom de modèle réel affiché. Seuls les noms de scène des bolides et des écuries apparaissent.

---

## 2. Storyboard seconde par seconde (30,0 s, 60 i/s = 1800 images)

*Notation : **Cam** = caméra (focale équivalente plein format), **FX** = effets, **Son** = repère audio. Les temps forts (★) déclenchent secousse + coup de FOV + flash bloom.*

### ACTE I — L'ÉVEIL DE LA PÉNOMBRE (0,0 à 5,0 s)

| t (s) | Plan | Cam | FX | Son |
|---|---|---|---|---|
| 0,0–0,6 | Noir absolu. Une **étincelle** unique tombe en ralenti et éclaire 3 cm d'une jante chromée. | Macro 100 mm, ouverture f/1.4 simulée, mise au point sur l'étincelle | Profondeur de champ (bokeh), grain 3 %, vignette 0,6 | Sub-drone 35 Hz qui monte, tic métallique |
| 0,6–1,8 | **Glissé macro le long d'une carrosserie** (bolide héros n°1). Un néon de garage s'allume en 3 claquements. | Travelling latéral 85 mm, 4 cm/s à l'échelle | Le reflet du néon glisse sur le vernis (clearcoat 1), bloom sur le tube | ★ « clac-clac-CLAC » des néons (foley acier) |
| 1,8–2,6 | **Optique de phare** en très gros plan : les LED s'allument une à une et le faisceau perce un **brouillard volumétrique**. | Dolly-in 50 mm → 35 mm | God rays, brouillard bruité (fBm, déjà dans `reveal_fret.js`), flare anamorphique horizontal bleuté | Démarreur, toux du V8 |
| 2,6–3,6 | **Pneu arrière au burnout** : la fumée s'enroule autour de la jante et des étincelles jaillissent sous la caisse. | Caméra au sol, à 1 cm, 24 mm, roulis 8° | Fumée en particules (sprites éclairés), étincelles en instanced mesh additif, flou de mouvement radial sur la jante | ★ Rugissement V8, sub-boom |
| 3,6–4,4 | **Contrechamp** : 4 autres paires de phares s'allument dans la pénombre derrière le héros (5 voies = 5 voitures). | Grand-angle 28 mm, plan fixe, léger push-in | Phares en sprites + volumétrique, le ruban arc-en-ciel apparaît en reflet au sol | 4 démarrages en cascade (Boxer, V12, biturbine, V8) |
| 4,4–5,0 | **Speed ramp** : les 5 voitures démarrent, ralenti à 15 % puis accélération. Le ruban arc-en-ciel **se déroule sous elles et devient la piste**. | Caméra au sol qui recule vite, 24 mm, coup de FOV 40° → 90° | Flou de mouvement (16 sous-images), aberration chromatique 0 → 0,008, flash blanc 2 images | ★★ Coup de Shepard + déflagration |

### ACTE II — LE DÉFILÉ DES TITANS (5,0 à 18,0 s)

*Principe : **15 écuries = 15 apparitions**, environ 0,85 s chacune en moyenne, avec 4 plans « respiration » plus longs. Chaque écurie a sa **voiture-signature** (le bolide le plus spectaculaire de ses 6). Un carton fin et diégétique (texte 3D posé sur le bitume ou projeté en néon, jamais un bandeau 2D) donne nom et couleur de l'écurie pendant 10 images.*

| t (s) | Plan | Cam | FX / détail |
|---|---|---|---|
| 5,0–6,2 | **Meute vue de face** : les 5 voitures plein cadre, déformation forte. | Caméra au sol en marche arrière devant la meute, 20 mm | Chaleur (distorsion par bruit), traînées néon des feux arrière |
| 6,2–7,0 | Écurie 1 : **passage en trombe** de gauche à droite, plan fixe. | 35 mm, filé (panoramique qui suit) | Effet Doppler dans le son, fond flou à 16 sous-images |
| 7,0–7,8 | Écurie 2 : **caméra embarquée** sur le capot, vue des concurrents devant. | Fixée sur le capot, 18 mm | Vibrations (bruit 30 Hz faible amplitude), reflet du ciel sur le capot |
| 7,8–8,6 | Écuries 3 et 4 : **duel côte à côte**, caméra entre les deux voitures. | Entre-deux, 24 mm, roulis qui suit le banking | Rétroviseurs qui frôlent |
| 8,6–10,2 | ★ **RESPIRATION 1 — Le virage relevé (20°)** : les 5 voitures enroulent le banking arc-en-ciel. | Grue qui pivote de 180° autour de l'apex, 35 mm | Le ruban arc-en-ciel s'illumine voie par voie au passage |
| 10,2–11,0 | Écuries 5 et 6 : **contact tôle contre tôle** et gerbe d'étincelles. | Ralenti à 20 % sur 0,4 s puis 100 %, 50 mm | Étincelles en 2000 instances, flare sur chaque étincelle chaude, aberration chromatique 0,01 |
| 11,0–11,8 | Écurie 7 : **passage à ras de l'objectif**, la carrosserie remplit l'écran 3 images. | 14 mm, fixe | Le noir de la carrosserie sert de transition (« wipe » naturel) |
| 11,8–12,6 | Écuries 8 et 9 : **plongée verticale** à la Redline, la voiture traverse le cadre de bas en haut. | Plongée à 90°, 35 mm | Lignes de vitesse radiales légères |
| 12,6–14,0 | ★ **RESPIRATION 2 — Les vagues verticales** : les voitures décollent légèrement sur la bosse ; le moment en l'air est en ralenti. | Travelling latéral à hauteur de roue, 50 mm | Ralenti à 10 %, suspension visible (roues qui pendent), poussière en suspension |
| 14,0–15,8 | Écuries 10 à 13 : **4 coupes de 0,45 s** en caméras rotatives agressives (roulis de 30° en 0,3 s). | Variables 18 à 35 mm | Une coupe par coup de grosse caisse, chacune avec secousse |
| 15,8–17,0 | Écuries 14 et 15 : **dépassement final**, la n°15 sort de l'aspiration. | Caméra de poursuite à l'arrière, 28 mm, coup de FOV | Traînées des feux arrière |
| 17,0–18,0 | **Montée en plongée** : la caméra décolle derrière la meute. Elle fait la transition vers la vue hélico. | Grue montante, 35 → 24 mm | Le cadre s'ouvre, la pénombre se change en ciel de nuit |

**Choix des voitures-signatures** : sélection automatique par un script (`choisir_heros.py`). Il croise rareté, silhouette (supercar et van/camion pour le contraste d'échelle), et couleur pour éviter deux voitures voisines de même teinte. Le script produit `heros_trailer.json`, validé ensuite à la main par Esteban. **La Grève (H12, locomotive sur roues) et Le Hawking Express (H01)** font de bons « plans gag » (un pour chacun, sans moquerie de la personne : la voiture est l'héroïne).

### ACTE III — LA MONTÉE EN TENSION (18,0 à 25,0 s)

| t (s) | Plan | Cam | FX | Son |
|---|---|---|---|---|
| 18,0–21,5 | **Plan-séquence hélico** au-dessus de toute la Rainbow Road (le jumeau `circuit.json`). Les 5 voitures roulent au ralenti et la piste s'illumine voie par voie. | Spline ample (3 courbes de Bézier), 35 mm, mouvement lent et lourd | Reflets d'environnement, brume basse, *tilt-shift* qui dit « miniature » | Shepard montant, cœur à 60 → 90 bpm |
| 21,5–22,3 | **Piège n°1 qui s'arme** en gros plan : vrai modèle de l'Arsenal (Carapace Bleue), clic mécanique. | Macro 100 mm | Le piège émet un néon pulsé dans sa couleur de rareté | ★ Clic-armement (foley) |
| 22,3–23,1 | **Piège n°2** (Peau de Banane / Boule de Bowling) posé sur sa languette de 2 mm, la caméra glisse le long. | Glissé 85 mm | Mise au point qui bascule (*rack focus*) du piège vers la voiture qui approche | ★ |
| 23,1–23,9 | **Piège n°3** : un duel « quitte ou double » qui s'illumine en rouge. | 50 mm, push-in | Aberration chromatique pulsée | ★ |
| 23,9–25,0 | **Coupes des 5 visages** des voitures (calandres) en ligne sur la grille, une par voie. | 85 mm, 5 coupes de 0,22 s | Chaque calandre est éclairée par le rouge de la grille | Battements qui accélèrent |

### ACTE IV — LE CLIMAX DES 5 FEUX & LIGHTS OUT (25,0 à 30,0 s)

| t (s) | Plan | Cam | FX | Son |
|---|---|---|---|---|
| 25,0–25,6 | **Portique des 5 feux** en contre-plongée, feu 1 rouge. | 24 mm, sol | Bloom HDR rouge, flare anamorphique | BOUM 1 (sub 35 Hz) |
| 25,6–26,6 | Feux 2, 3, 4 : **3 coupes** alternant portique, pneu qui patine, pied (pédale) de la voiture héros. | Alterné | Secousse croissante à chaque feu | BOUM 2, 3, 4 |
| 26,6–27,4 | **Feu 5**, les 5 feux rouges allumés. Gros plan extrême sur la LED. | Macro, zoom lent | Aberration chromatique max 0,015, grain renforcé | BOUM 5, puis **silence 0,4 s** (seul un tic) |
| 27,4–27,5 | **LIGHTS OUT** : extinction, noir de 3 images. | — | Noir | Silence |
| 27,5–28,6 | ★★★ **IMPACT TITANESQUE** : les 5 voitures partent ensemble. Caméra au sol, coup de FOV de 35° à 110°, onde de choc. | 20 mm | Flash blanc 4 images, onde de choc (ShockWave), flou de mouvement maximal, étincelles | Déflagration + 5 moteurs + sub-boom, limiteur |
| 28,6–30,0 | **Titre** « GRAND PRIX DE NOËL · 23 DÉCEMBRE 2026 » en **lettres 3D chromées** formées par le ruban arc-en-ciel qui s'enroule (le motif conducteur se referme). | Lent push-in | Bloom, reflets qui balaient le chrome | Résonance, extinction en 1,2 s |
| 30,0 | Fondu au noir, enchaînement plateau (TV) | | | |

---

## 3. Stack technique recommandée

### 3.1 Choix et justification

| Besoin | Choix | Alternative écartée (et pourquoi) |
|---|---|---|
| Moteur 3D | **Three.js** (version déjà dans le dépôt, pour réutiliser `bolides3d.js`, `m3d`, `bolides3d_pieces.js` sans adaptation) | React Three Fiber : il faudrait réécrire le code existant en React, sans gain pour un rendu hors ligne |
| Timeline / séquençage | **GSAP 3 `gsap.timeline({paused:true})` + `tl.seek(t)`**. GSAP est **100 % gratuit, extensions comprises**, depuis le rachat par Webflow. La timeline est décrite en données (`plans.json`), puis compilée. | **Theatre.js** : son éditeur est excellent pour caler les caméras à la main, mais le projet avance peu (0.7.x) et il ajoute une dépendance lourde. **Option** : on l'utilise *seulement en studio de calage*, puis on exporte les courbes en JSON lues par notre lecteur. On ne l'embarque pas dans le rendu final. |
| Trajectoires caméra et voitures | `THREE.CatmullRomCurve3` (centripète) sur les points de `circuit.json`, avec décalage par voie et roulis = banking local. La caméra « regarde » un point avancé sur la spline (look-ahead). | Physique en temps réel (Rapier / cannon) : non déterministe, inutile pour un film |
| Post-traitement | **`postprocessing` de pmndrs** (v6.x) : `BloomEffect` (mipmap, plus rapide et plus propre que UnrealBloomPass), `ChromaticAberrationEffect`, `DepthOfFieldEffect`, `GodRaysEffect`, `ShockWaveEffect`, `NoiseEffect`, `VignetteEffect`, `ToneMappingEffect` (ACES / AgX) en fin de chaîne, `frameBufferType: HalfFloatType` pour le HDR | `EffectComposer` des examples Three.js : chaque passe fait un rendu plein écran de plus, alors que `EffectPass` fusionne les effets |
| **Flou de mouvement** | **Accumulation temporelle hors ligne** : pour l'image *i*, on rend **N sous-images** à `t = i/60 + k·(obturateur/60)/N` (obturateur à 180° = 0,5), puis on les moyenne dans une cible flottante. C'est le **vrai flou cinéma**, correct sur les roues, les objets et la caméra. N = 8 en 1080p, N = 16 sur les plans de vitesse. | Velocity buffer (realism-effects, threepipe) : utile en temps réel mais artefacts aux bords, et `postprocessing` n'en fournit pas |
| Flare anamorphique | **Passe maison** (environ 60 lignes GLSL) : extraction des zones très lumineuses → flou **horizontal seul**, étiré ×8 sur 4 niveaux de réduction → teinte bleu-cyan → addition. C'est le look « J.J. Abrams ». | `LensFlare` de Three.js : flare sphérique daté, pas anamorphique |
| Brouillard volumétrique | Cônes de phares = maillage conique, matériau additif avec bruit fBm 3D défilant et atténuation fresnel (peu coûteux). Brouillard global en *height fog* exponentiel dans le shader de post. | Raymarching complet : trop cher pour un gain marginal |
| Étincelles / fumée | `InstancedMesh` (étincelles étirées dans la direction de la vitesse, additif) ; fumée en sprites éclairés. Trajectoires **précalculées analytiquement** (balistique) à partir d'une graine. | Système de particules à état : non déterministe au `seek` |
| Secousse caméra | Bruit simplex 3D semé, amplitude = somme d'enveloppes exponentielles déclenchées aux **temps forts audio** (`marqueurs.json`) | `Math.random()` : interdit |
| Repères audio → image | **Analyse du WAV maître** (Python, `librosa.onset` + seuil sur la bande 30 à 80 Hz) → `marqueurs.json` (temps des grosses caisses, booms, coupes). La timeline image s'**aligne** sur ces temps. | Synchronisation à l'oreille |
| Son | Grammaire sonore existante (`sound.py` / `sound_design.py` / `moteurs.py`) **recoupée sur 30 s**, avec **Doppler calculé** pour chaque passage : f' = f · c / (c − v_r), v_r tiré de la vraie trajectoire de la voiture par rapport à la caméra (même spline). Mastering −16 LUFS, ≤ −2 dBTP. | Recaler l'ancien mixage à la main |

### 3.2 Capture vidéo « zéro saccade » (le point critique)

**Principe : on ne filme jamais l'écran en temps réel.** MediaRecorder et la capture d'écran dépendent de l'horloge murale et perdent des images dès que le GPU tousse. Remarque : `requestVideoFrameCallback` sert à **synchroniser la lecture** d'une vidéo, pas à l'exporter. Il reste utile côté régie pour vérifier la lecture.

**Chaîne retenue (sur le PC d'Esteban, Chrome avec GPU, comme les clips de reveal du 11 oct.) :**

1. Playwright lance Chrome **avec fenêtre** (`--use-angle=d3d11`, `--disable-gpu-vsync`, `--disable-frame-rate-limit`). Il ouvre `trailer3d/rendu.html?w=3840&h=2160&n=16`.
2. La page expose `window.rendreImage(i)` : elle fait `tl.seek(i/60)`, les N sous-images et l'accumulation, puis le post-traitement, et renvoie une promesse.
3. **Voie rapide — WebCodecs dans la page** : `new VideoFrame(canvas, {timestamp: i * 1e6 / 60})`, puis `VideoEncoder` (`avc1.640033`, débit fixe environ 60 Mb/s en 4K, environ 20 Mb/s en 1080p), puis le multiplexeur **Mediabunny** (successeur de mp4-muxer) → `trailer_video.mp4`. Les **horodatages sont imposés**, donc la cadence est parfaite par construction. La librairie `canvas-record` fait exactement ça (`recorder.step()` image par image) et peut servir de base.
4. **Voie de secours — séquence d'images** : `canvas.toBlob('image/png')` → disque → `ffmpeg -framerate 60 -i %05d.png -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -profile:v high`. Plus lente mais incassable : c'est la méthode déjà éprouvée sur Intro Catch.
5. **Multiplexage audio** : `ffmpeg -i video.mp4 -i trailer_master.wav -c:v copy -c:a aac -b:a 320k -shortest`.
6. **Contrôles automatiques** : `ffprobe` (1800 images exactes, 60/1), comparaison d'empreintes sur 10 images témoins (déterminisme : deux rendus = mêmes pixels à ±1), mesure EBU R128, puis `tester_intro.py` sur la lecture en Edge (images perdues, p99).

**Budget de calcul estimé** (à mesurer au jalon 2) : 1800 images × 8 sous-images = 14 400 rendus en 1080p ; à environ 15 ms par rendu, ≈ 4 min. En 4K avec N = 16, environ 30 000 rendus à environ 40 ms, ≈ 20 min. Acceptable, à lancer la nuit.

**Option écartée pour le moment : Remotion** (`@remotion/three`). Il est solide pour le rendu déterministe, mais impose React et sa licence entreprise ; notre pipeline maison fait déjà la même chose et réutilise le code du projet.

---

## 4. Plan d'action par étapes (8 semaines avant le 23 décembre)

Chaque jalon se termine par un **livrable visible** et un **critère de validation mesurable**.

| # | Jalon | Livrable | Validation | Échéance cible |
|---|---|---|---|---|
| **J1** | **Animatic en maquette grise** | `Trailer_3D/animatic.html` : piste `circuit.json`, 5 blocs-voitures, les 30 s de caméras, barre de lecture et défilement image par image. Son maître actuel calé dessus. | Esteban valide le **rythme et les angles** (pas le rendu). `marqueurs.json` tiré du WAV. | 1er nov. |
| **J2** | **Branchement des vrais bolides + rendu déterministe** | Les 15 voitures-signatures chargées depuis `m3d` (refus si modèle absent, aucun repli silencieux, comme `ErreurBolide3D`). `rendreImage(i)` opérationnel. | 2 rendus successifs identiques (empreintes). Temps par image mesuré. | 8 nov. |
| **J3** | **Look cinéma** | Bloom HDR, flare anamorphique maison, aberration chromatique, profondeur de champ, brouillard des phares, flou de mouvement par accumulation, tone mapping AgX, étalonnage (LUT nuit néon). | Planche de 12 images fixes (une par plan clé) en 4K, validée par Esteban. | 15 nov. |
| **J4** | **Effets de vie** | Fumée de burnout, étincelles de contact, onde de choc LIGHTS OUT, armement des 3 pièges (vrais modèles de l'Arsenal), titre 3D chromé formé par le ruban. | Aucun objet qui « saute » au `seek` (test : seek aléatoire sur 200 temps = même image qu'en lecture continue). | 22 nov. |
| **J5** | **Son 30 s** | Recoupe de la bande-son existante, Doppler calculé par passage, booms calés sur `marqueurs.json`, voix « Commentateur » ElevenLabs en option (1 à 2 répliques maximum, par exemple « Moteurs… » puis « LIGHTS OUT ! »). | −16 LUFS / ≤ −2 dBTP mesurés. Écoute **à l'oreille** par Esteban (point faible signalé sur l'intro v3). | 29 nov. |
| **J6** | **Capture finale et contrôle** | `capturer_trailer3d.py` (WebCodecs + secours PNG/ffmpeg) → `trailer3d_1080p60.mp4` et `trailer3d_2160p60.mp4`. | 1800 images exactes, `tester_intro.py` : 0 à 3 images perdues sur la TV, p99 < 20 ms. | 6 déc. |
| **J7** | **Intégration régie (sans écraser l'existant)** | Paquet d'installation qui **archive** l'intro en place dans `_Archives/avant_trailer3d_<date>/` puis propose le trailer 3D en **option** (touche dédiée ou réglage), l'intro Catch restant le choix par défaut tant qu'Esteban ne bascule pas. | Tests relais au vert avant et après. | 13 déc. |
| **J8** | **Marge et répétition générale** | Corrections après répétition sur la vraie TV. | Lecture parfaite en conditions réelles (HDMI, Espace). | 20 déc. |

### Arborescence prévue (nouveau, isolé)

```
Noël\00_Lab_Vision_2.0\Trailer_3D\
├── animatic.html            # J1 : prévisualisation interactive (lecture + défilement)
├── rendu.html               # J2+ : page de rendu image par image
├── src\
│   ├── scene.js             # piste, éclairage, chargement des bolides m3d
│   ├── plans.json           # découpage des plans (données, pas de code)
│   ├── timeline.js          # compilation plans.json → GSAP timeline (paused)
│   ├── camera_rig.js        # splines, look-ahead, secousse simplex, coup de FOV
│   ├── fx\anamorphique.js   # passe flare maison
│   ├── fx\accumulation.js   # flou de mouvement par sous-images
│   ├── particules.js        # étincelles et fumée, analytiques et semées
│   └── titre3d.js           # lettres chromées du final
├── audio\
│   ├── extraire_marqueurs.py   # WAV → marqueurs.json
│   └── doppler_passages.py     # trajectoires → pitch-shift des passages
├── outils\
│   ├── choisir_heros.py        # → heros_trailer.json
│   └── capturer_trailer3d.py   # Playwright + WebCodecs / PNG + ffmpeg + contrôles
└── RAPPORT_TRAILER_3D.md
```

---

## 5. Risques et parades

| Risque | Parade |
|---|---|
| Modèles `m3d` trop légers en très gros plan macro (facettes) | Subdivision ou normales lissées sur les seuls héros. La profondeur de champ masque le reste. Planche J3 pour le vérifier tôt. |
| Temps de rendu 4K trop long | N adaptatif (8 sur plans lents, 16 sur plans rapides). Rendu de nuit. Le 1080p reste la référence de diffusion si la TV n'est pas 4K. |
| Non-déterminisme caché (ordre de chargement, textures asynchrones) | Préchargement complet + préchauffe GPU (déjà fait dans `reveal_fret.js`). Test d'empreintes systématique. |
| WebCodecs indisponible ou instable sur la version de Chrome | Bascule automatique sur la voie PNG + ffmpeg. |
| Le film paraît « trop jeu vidéo générique » | Motif conducteur arc-en-ciel, *tilt-shift* miniature assumé, voitures de la famille en héroïnes : c'est **notre** Grand Prix, pas une pub. |

---

## 6. Sources consultées

- Habillage F1 2018 par Drive Studio (ligne rouge conductrice, montage staccato, Brian Tyler) : [NewscastStudio](https://www.newscaststudio.com/2018/11/02/formula-one-broadcast-design/), [Formula1.com](https://www.formula1.com/en/latest/article/must-see-watch-f1s-new-opening-title-sequence.52D6WEeQtyc2sig4ciYMQO)
- Film d'ouverture GT7 (structure histoire → usine → jeu) : [Top Gear PH](https://www.topgear.com.ph/features/feature-articles/gt7-opening-movie-tguk-a3832-20220305)
- `postprocessing` de pmndrs (liste des effets, EffectComposer, HalfFloat, ToneMapping) : [README v6.39](https://cdn.jsdelivr.net/npm/postprocessing@6.39.4/README.md), [GitHub](https://github.com/pmndrs/postprocessing)
- Theatre.js (r3f, état des versions) : [docs r3f](https://www.theatrejs.com/docs/latest/api/r3f), [releases](https://theatrejs.com/docs/0.5/releases)
- GSAP 100 % gratuit : [Webflow](https://webflow.com/blog/gsap-becomes-free)
- Capture image par image : [canvas-record](https://cdn.jsdelivr.net/npm/canvas-record@5.5.1/README.md), [API WebCodecs (MDN)](https://developer.mozilla.org/Web/API/WebCodecs_API)
- Flou de mouvement en temps réel (écarté) : [realism-effects](https://docsearch.algolia.com/mcp/docs/repo/0beqz/realism-effects), [threepipe VelocityBuffer](https://threepipe.org/plugin/VelocityBufferPlugin.html)

*Les analyses des trailers NFS Unbound, Forza Horizon, Hot Wheels Unleashed et Redline viennent de la connaissance générale de ces œuvres, pas d'une source consultée aujourd'hui.*

---

## 7. Rapport de régie — Production de l'Intro V5 (25 octobre 2026)

*Mission « Intro V5 multi-agents ». Tout le travail est dans `Noël\00_Lab_Vision_2.0\Intro_3D\` ; rien n'est modifié dans l'application.*

### 7.1 Chef de régie — synchronisation et jalons

| Jalon | État | Vérification |
|---|---|---|
| Bande-son maître avec les 15 extraits réels | ✅ | `audio_v5\audio\mix_v5.wav`, 148,2 s, −16 LUFS, crête −1,5 dBFS. |
| Vrais bolides sculptés à la place des maquettes | ✅ | 28 modèles construits sans erreur : 15 emblèmes, 5 de la meute, 5 F1, la Batmobile, l'épave et la silhouette. |
| 15 invocations visuelles calées sur les signatures | ✅ | Planche de contrôle : un effet par écurie, frappe calée sur le 1er temps fort mesuré. |
| Caméras adoucies, coups de FOV et secousses, capture à 60 i/s | ✅ | `capturer_animatic_v5.py` passe à 60 i/s par défaut ; déterminisme vérifié (voir 7.5). |
| Vidéo finale | ⏳ sur le PC | `LANCER_ANIMATIC_V5.bat`, choix 3 : 1280 px à 60 i/s via la carte graphique. |

**Chaîne de synchronisation** (un seul sens, aucune saisie manuelle) :
1. `sound_v5.py` place chaque nom puis sa signature. Il mesure le **1er temps fort** de chaque signature (premier passage au-dessus de 60 % de l'enveloppe) et écrit `reperes.themes` et `reperes.punchs` dans `rapport_v5.json`.
2. `generer_plans_v5.py` en tire le découpage : 71 plans. Il ajoute 68 impacts caméra, dont un par signature sur son temps fort.
3. `film_v5.js` et `invocations.js` déclenchent chaque effet à `début de signature + temps fort`.

Si un extrait est remplacé, il suffit de relancer `LANCER_V5.bat` puis `LANCER_ANIMATIC_V5.bat` : tout se recale.

### 7.2 Agent Audio — l'ingénieur du mixage

Les 15 fichiers de `audio_v5\themes_ecuries\` sont joués tels quels : extrait choisi, fondus de 20 ms, mise au niveau, signature plafonnée à 3,0 s.

| # | Fichier | Passage retenu | Temps fort mesuré |
|---|---|---|---|
| 01 | `01_jerry_reed_country.mp3` (+ voix de Petite Mimine par-dessus) | 1,0 → 5,6 s, à −7 dB sous la voix | 2,55 s (le « MIMINE ! ») |
| 02 | `02_candy_crush_sweet.mp3` | 0 → 1,9 s | 0,19 s |
| 03 | `03_blur_song_2_woohoo.mp3` | 14,3 → 17,3 s (le « WOO-HOO! ») | 0,23 s |
| 04 | `04_balatro_theme.mp3` | 0 → 3,0 s | 0,26 s |
| 05 | `05_mario_fall_waaah.mp3` | 0 → 3,0 s | 0,16 s |
| 06 | `06_peter_fox_alles_neu_symphonie.mp3` | 11,4 → 14,4 s (l'entrée de l'orchestre) | 0,09 s |
| 07 | `07_zelda_item_get.mp3` | 0,25 → 2,65 s | 0,16 s |
| 08 | `08_metroid_item_acquisition.mp3` | 0,1 → 3,1 s | 0,04 s |
| 09 | `09_mh_valstrax_roar.mp3` | 0,2 → 3,2 s | 0,32 s |
| 10 | `10_berserk_guts_theme.mp3` | 1,7 → 4,7 s | 1,77 s |
| 11 | `11_rosalina_harmonie_victory.mp3` | 0 → 3,0 s | 0,10 s |
| 12 | `12_jojo_kakyoin_rero.mp3` | 0,1 → 3,1 s | 0,20 s |
| 13 | `13_tokyo_drift_drumroll.mp3` | 0 → 3,0 s | 0,06 s |
| 14 | `14_splatoon_booyah.mp3` | 0,45 → 1,55 s | 0,07 s |
| 15 | `15_daisy_hi_im_daisy.mp3` | 0 → 1,0 s | 0,05 s |

Le passage de chaque extrait se règle dans `themes_ecuries.json` (`"perso": {"debut_s", "duree_s", "gain_db"}`). Les générations ElevenLabs de Mario et du « rero » sont retirées : les extraits réels les remplacent.

### 7.3 Agent Assets — l'architecte 3D des bolides

- **Nouveau module `src\bolides_reels.js`.** Il appelle `construireBolide3D()` de `shared\bolides3d.js` : modèles m3d, jantes 3D, pneus à 48 segments, disques et étriers. Il enveloppe chaque bolide pour passer de l'avant en +x (repère m3d) à l'avant en +z (repère du film).
- **Roues pilotées en absolu** (−distance / rayon). L'image reste une fonction pure du temps.
- **Table éditable `EMBLEMES`** :

  | # | Écurie | Code | Modèle |
  |---|---|---|---|
  | 1 | Mimine | U04 | Silverado 4×4 |
  | 2 | Twingo | FR04 | R5 Turbo |
  | 3 | Optic | H05 | fourgon kei |
  | 4 | Tata Freddy | J04 | Toyota Van |
  | 5 | Mario | H09 | pick-up Mighty K |
  | 6 | Symphonie | J09 | EV6 |
  | 7 | Yaris | N05 | Prius |
  | 8 | A4 | TK03 | 190E |
  | 9 | Titou | U05 | Challenger |
  | 10 | Doom Slayer | N11 | Riveted |
  | 11 | Milo | P04 | Barbie Extra |
  | 12 | Bob | N08 | Gov'ner |
  | 13 | Jojo | J02 | AE86 |
  | 14 | Ninja-Nissan | TK02 | Skyline R30 |
  | 15 | Princess | N02 | Pedal Driver |

- **Autres voitures** :
  - meute : J01, E02, U02, FR02, N03 ;
  - F1 : F01 à F05 ;
  - Batmobile : B16 ;
  - épave : N12, avec ses 12 copies dans le désert ;
  - silhouette du teaser : TK06 entièrement noircie (la voiture Miku reste méconnaissable).
- **⚠ Arbitrage à faire.** La décision du 25 octobre prévoyait des emblèmes **hors pool**, avec un futur `emblemes_ecuries.js`. Les modèles ci-dessus sont dans le pool des caisses mystère : l'intro les dévoile avant le draft. Pour garder la surprise, on remplace un code de la table dès qu'un modèle dédié existe.

### 7.4 Agent VFX — le concepteur des invocations (`src\invocations.js`)

Toutes les particules sont recalculées à partir de leur graine et de leur âge : aucun état ne passe d'une image à l'autre.

| # | Écurie | Invocation |
|---|---|---|
| 1 | Mimine | Gerbe d'étincelles de forge sur le « MIMINE ! », 4 retours de flammes à l'échappement, nuage de poussière western, lumière orange qui vacille. |
| 2 | Twingo | Pluie de 220 bonbons et 60 sucres d'orge brillants, double onde de choc rose et cyan sur « Sweet! », flash et teinte bonbon. |
| 3 | Optic | Stroboscope noir et jaune à 6 Hz pendant 1,6 s, 5 éclairs électriques régénérés 30 fois par seconde, flash sur « WOO-HOO! ». |
| 4 | Tata Freddy | 40 cartes recto verso (Joker, dos losangé) en orbite et lévitation, poussière d'or. |
| 5 | Mario | La voiture bondit à 80 cm en vrille, retombe pendant le « waaah » et s'écrase : onde de choc, 70 débris, étoiles, poussière, secousse. |
| 6 | Symphonie | Portée de 5 lignes ondulantes autour de la voiture, 40 notes de lumière qui montent. |
| 7 | Yaris | Rayon divin doré (double colonne), Triforce qui s'élève et tourne sur la fanfare, poussière d'or. |
| 8 | A4 | Grille hexagonale néon qui s'étend au sol, anneau scanner qui monte et descend, colonne de téléportation, la voiture scintille. |
| 9 | Titou | Comète pourpre venue du ciel jusqu'à l'impact, bang supersonique (anneaux sol et vertical), flammes de dragon, flash et grosse secousse. |
| 10 | Doom Slayer | Éclipse (disque noir et couronne rouge) derrière la voiture, foudre noire et rouge, braises, teinte rouge sang. |
| 11 | Milo | 6 étoiles filantes, 160 grains de poussière de Luma en tourbillon, teinte froide. |
| 12 | Bob | 9 kanji « ゴ » géants qui apparaissent un par un en lévitation, aura violette (fumée et anneau pulsé). |
| 13 | Jojo | Rideau de fumée blanche de drift, la voiture dérape (±0,55 rad), néons rose et cyan. |
| 14 | Ninja-Nissan | 320 gouttes d'encre vert acide, magenta et violet projetées à 360° sur « Booyah! », anneaux et secousse. |
| 15 | Princess | Tourbillon de 220 pétales de marguerite, flash pop solaire et anneau jaune sur « Hi, I'm Daisy! ». |

### 7.5 Agent Cadrage — directeur cinématique et fluidité

- **Courbes** : les travellings linéaires (A2, A3) et toutes les orbites de signature passent en *smootherstep* (`cine` = 6u⁵ − 15u⁴ + 10u³), sans à-coup au départ ni à l'arrivée. Les autres plans restaient en *smoothstep*.
- **Impacts** : 68 impacts. Chacun donne une secousse décroissante, un coup de FOV de +22 % × force, un flash, de l'aberration chromatique et un flou radial. Les invocations ajoutent leur propre secousse (crash de Mario, bang de Valstrax, Splatoon…).
- **Caméras sur mesure** quand l'effet se joue en hauteur :
  - Mario : plan large qui suit le bond ;
  - Zelda, Berserk, Galaxy : contre-plongée vers le ciel ;
  - Valstrax : la caméra part de la comète et descend sur l'impact ;
  - Splatoon : plongée à 360°.
- **60 i/s** :
  - `capturer_animatic_v5.py --video` rend par défaut à pas fixe dt = 1/60 s, en 1280 px, avec le son, puis encode en H.264.
  - L'image t = i/60 est calculée exactement : aucun enregistrement d'écran, donc aucune saccade.
  - Le rendu cloud (sans carte graphique) sert d'aperçu en 640 px à 30 i/s.
- **Déterminisme** : mêmes temps rendus dans le désordre.
  - Images identiques à 25,5 s et 87,4 s.
  - À 43,2 s : écart de 12 niveaux au plus, sur 0,5 % des pixels, sur l'écran géant (texture d'écran redessinée à la première image). C'est invisible.

### 7.6 Pour lancer sur le PC

1. `audio_v5\LANCER_V5.bat` : régénère le mix (déjà fourni) si tu changes un extrait.
2. `LANCER_ANIMATIC_V5.bat` :
   - choix 1 : lecture en direct avec le son ;
   - choix 3 : vidéo à 60 i/s dans `sorties\animatic_v5_apercu.mp4`.

---

## 8. Rapport de régie — Intro V6 « L'Hybride Ultime » (25 octobre 2026)

> Fusion de la Version 1 (3D, `intro_v5_bolides_invocations_30fps.mp4`) et de la Version 2 (`intro_grand_prix.mp4`, lisibilité broadcast), avec un mixage sans saccade.
> Tout est dans `00_Lab_Vision_2.0\Intro_3D\` : fichiers `*_v6` et dossier `audio_v6\`. Aucun fichier existant n'a été modifié (la V6 lit la v5, le Showroom et les modèles m3d).
> Mode d'emploi et découpage complet : `Intro_3D\INTRO_V6_STORYBOARD.md`.

### 8.1 Audit des causes racines (vérifié dans le code avant correction)

Toutes les causes listées dans le méga-prompt ont été retrouvées aux lignes citées : fondus 20 / 80 ms de `couche()`, whoosh à `t0 − 0,28 s`, groove mi mineur sous les thèmes et enveloppe `creux_t × duck`, fondus voix 12 ms et `creux()` à ±0,12 s (chevauchement mesuré : `gotham` finissait à 50,10 s, `f1` commençait à 50,08 s), `scene.environment = null` sous `lum 0,45`, triple impact par écurie + `fx.sec` / `fx.flash` ajoutés deux fois, `gl_PointSize` plafonné à 220 px, double foule (900 + 1 600), stroboscope 12 Hz (écurie 3), vibration de burnout en l'air (écurie 5), comète à `u = −0,6` (écurie 9), emblèmes tirés du pool des caisses et 52 boîtes `voiture('citadine')`.

### 8.2 Agent 1 — DSP audio (`audio_v6\sound_v6.py`)

- **Signatures** : entrée sin(θ) 150–220 ms prise dans l'amorce du fichier, sortie cos(θ) 250–350 ms, passe-haut Butterworth 160 Hz fondu sur 200 ms, washout de 0,25 s.
- **Macro de transition** : riser stéréo 200 Hz → 4,2 kHz (filtre d'état à fréquence glissante) + sub-drop à phase intégrée 110 → 34 Hz, tanh, sur l'impact unique de chaque écurie (éclat de voix pour Mimine, atterrissage pour Mario, 1er temps fort sinon). Whoosh parasite supprimé.
- **Appel** : groove sur un bus à part, pulse sub-bed < 140 Hz pendant les thèmes ; sidechain lissé (anticipation 40 ms, attaque 50 ms, relâchement 450 ms, tenue 250 ms).
- **Voix** : coupes entre le dernier mot et l'attaque suivante, fondus cosinus 35 ms, lit d'ambiance continu.
- **Mesures** (`rapport_v6.json` → `diagnostic`) :
  - bosses de gain pendant l'appel : **90 en v5 → 3 en V6** (les 3 restantes : la respiration voulue après « le groupe A / B / C ») ;
  - zéros numériques > 20 ms dans le mix : **0** ;
  - crête haute fréquence aux bornes des signatures (max) : 29,9 dB → 19,2 dB ; saut de niveau à la fin d'une signature : 3,6 dB → 2,4 dB en moyenne (10,6 → 7,5 dB au pire) ;
  - durée 148.2 s, −16 LUFS, 158 bruitages réels.

### 8.3 Agent 2 — Caméra Swoop-and-Hold (`outils\generer_plans_v6.py`, `src\film_v6.js`)

- Un mouvement continu par écurie : swoop d'entrée (0,5–0,9 s), **hold de lecture à 12 % de la vitesse du swoop (−88 %)**, horizon verrouillé à 0°, cadrage 2/3 – 1/3, whip de sortie (0,35–0,45 s) ; raccord dans l'axe pour les écuries longues (1 et 10).
- Contrôle de cadrage : la voiture est projetée à x = −0,33 / +0,33 en coordonnées écran pendant le hold (mesuré dans le navigateur ; Mario reste au tiers pendant tout son bond).
- **35 impacts** (contre 68 en v5) : un par écurie, fusion < 0,45 s, FOV ≤ +8 %, ressort critique ζ = 1 à 8 Hz, plus aucun tremblement aléatoire.

### 8.4 Agent 3 — HUD broadcast et clarté (`src\hud_v6.js`)

- Salon lisible (carte d'environnement conservée, appoint chaud, vignette 0,38).
- Calque 2D à la résolution de l'image, rendu **après** `post.rendre()` : carte d'écurie (numéro, groupe, logo, nom, pilote, concept-car, devise, jauge STYLE qui atteint MAX sur l'impact), bandeaux de groupe, stats (15 écuries, des dizaines de bolides, 5 voies, 1 seule place), univers, pièges, **tableau des paris** avec « Sans téléphone ? Pariez au carnet ! ». Couleurs d'écurie trop sombres éclaircies automatiquement.

### 8.5 Agent 4 — VFX (`src\invocations_v6.js`, `src\decors\habillage_v6.js`)

- Plus de confettis / fumées / flammes génériques par écurie ; logos en sprite seulement sur le plan large final ; fumée ≤ 75 px à 1080p, alpha ×0,7 ; une seule foule (15 objets de la foule d'`arene.js` masqués).
- Écurie 3 : faisceaux localisés + arcs électriques, exposition stable. Écurie 5 : parabole propre, squash & stretch sur l'impact. Écurie 9 : comète dès l'ouverture du hold.

### 8.6 Agent 5 — Voitures (`src\bolides_reels_v6.js`)

- **15 concept-cars du Showroom** (`buildConceptCar(1..15)`, rotation −π/2, échelle 2,55) : carrosseries de 5.9 à 9.1 cm, **16,0 cm** pour la dépanneuse + A4 remorquée de l'écurie 8 (dont la fuite d'huile ouvre le film) ; `tick(t)` et 66 roues pilotées en absolu (étriers fixes).
- **Parc fermé : 52 bolides m3d tous différents** ; meute, F1, Batmobile B16, Épave N12 (v9) en m3d ; **0 boîte**.
- Post-traitement : grain 0,018, balayage 0,005, aberration et flou radial seulement 120 ms après un impact.

### 8.7 Grille de vérification

| Point | Résultat |
|---|---|
| 15 concept-cars + modèles m3d à jour, zéro `voiture()` | ✅ inventaire : 15 concepts, 52 bolides au parc, 0 boîte |
| Audio continu (cos/sin, risers, sub-drops, sub-bed, sidechain) | ✅ `mix_v6.wav` régénéré, pompage 90 → 3 |
| Salon lisible | ✅ planche de contrôle (v5 à gauche, V6 à droite) |
| Swoop-and-Hold + HUD au-dessus du post | ✅ 15 écuries, ratio 12 %, horizon 0°, cartes nettes |
| Invocations nettes (fumée 75 px, écuries 3 / 5 / 9) | ✅ |
| Zéro erreur console | ✅ Chromium headless (SwiftShader) : 0 erreur, 0 alerte ; déterminisme identique sur 5 instants |

Sorties de contrôle : `Intro_3D\sorties\controle_intro_v6.png` (v5 / V6 côte à côte), `planche_intro_v6.png` (57 plans), `controle_intro_v6.json`.

### 8.8 Pour lancer sur le PC

1. `Intro_3D\LANCER_ANIMATIC_V6.bat` → choix 1 (lecture avec le son) ou 3 (vidéo 1920 px, 60 i/s).
2. `audio_v6\LANCER_V6.bat` seulement si tu changes un extrait (le mix est fourni).
