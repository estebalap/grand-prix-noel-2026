# Arsenal mécatronique et gameplay V3 : pièges « arcade one-shot »

> Grand Prix de Noël · piste Hot Wheels Mario Kart Rainbow Road (GXX41) · version 3.0 du 17 octobre 2026.
> Journal d'ingénierie de l'escouade : Chef d'atelier et 5 agents spécialistes.
> Code, STL et données : `Noël\00_Lab_Vision_2.0\Edition_23_Decembre\12_Piste_Jumeau_et_Pieges_V2\v3_arcade\`.
> Aucun fichier existant n'a été modifié : ni le relais, ni les règles, ni la piste.

## Homologation du 24 et 25 octobre 2026

Rapport complet : `C:\Users\esteb\Documents\CLAUDE\RAPPORT_HOMOLOGATION_ARSENAL_V3.md`. Outils et pièces : `12_Piste_Jumeau_et_Pieges_V2\homologation\`.

- **Bilan.**
  - 42 objets : 14 corrigés puis homologués, 28 rejetés.
  - 18 cartes : 10 homologuées, 2 corrigées (Patin, Blizzard), 6 rejetées (retirées le 18/10).
- **Patin auto-adaptatif.**
  - Semelle à 12 mm, décalée de 12 mm vers l'aval, spatule à 30°, sans lest.
  - Le bras s'efface au-dessus de 41 mm à 61°, sous 0,20 N.
  - Le choc est désormais modélisé : perte de 0,072 à 0,203 s.
- **Tourniquet-Clapet (DUEL).**
  - Deux lisses solidaires d'un axe en travers de la piste, sur un mât de 2,0 mm.
  - Le rotor à axe vertical est abandonné : couples opposés, bras suiveur dans le flanc, rotor qui s'emballe.
- **Péage à clapet.** La lisse se soulève vers l'aval ; plus d'arrêt net.
- **Embase plate.** Elle remplace la semelle en T, dont la languette ne s'imprimait pas à plat.
- **Raretés.** Le barème de la mission est appliqué : Blizzard en Légendaire (QUATRIO), Pacte en Épique (DUEL).

## Mise à jour du 18 octobre 2026 : essais d'Esteban sur la vraie flotte

| Constat | Décision |
|---|---|
| Les bolides larges passent **pile** dans la voie | **Toute intrusion latérale est retirée** (slalom, chicane, rétrécissement).<br>6 cartes retirées : Lame d'Interstice, Ailette à Came, Quille Déclic, Balancier Quitte-ou-Double, Déflecteur Bilatéral et Bouclier (il ne protégeait que de ces cartes).<br>11 objets retirés : Lame Fantôme, Métronome, Péage des Gros, Ailette de Crête, Chicane latérale, Médiator, Clé de Sol, 33 Tours, Bloc de Terre, Baguettes Croisées, Thwomp (ce dernier frottait les bolides hauts).<br>Les **tourniquets** restent : ils s'effacent en tournant. |
| Les fourgons demandent **au moins 38 mm** de hauteur | **Règle des portiques : aucun élément rigide sous 41 mm** (38 + 3 de rebond), au repos comme déployé.<br>Axe des bras relevé de 70 à **85 mm**, poutre à 106 mm, volet TPU de 31 mm (bas toujours à 12 mm). |
| Une porte de garage tient dans l'interstice entre 2 voies | L'ancrage par l'interstice est validé. La porte du paddock fait **2,0 mm** (garage v4, imprimée à plat) : toute languette d'ancrage fait 2,0 mm, imprimée à plat, sans nervures d'écrasement (`languette_e` dans `arcade_v3.scad` et `pieges_cloison_v2.scad`).<br>Le Tourniquet et la Barrière de Péage, seuls objets encore ancrés dans l'interstice, arrêtent aujourd'hui tous les bolides (moyeu fixe au milieu de la voie ; lisse qui pivote en travers) : à redessiner sur un mât plat de 2,0 mm. |
| La rampe (onde de 8 mm) passe pour toute la flotte | Couloir VENTRE du gabarit validé. |

- **Il reste 12 cartes**, toutes construites sur le volet, le patin, le départ canon et des règles :
  - SOLO : Volet Biais, Patin du Blizzard ;
  - DUEL : Télégraphe & Parade ;
  - DUO : Herse Jumelle ;
  - QUATRIO : Onde de Choc ;
  - BONUS : Départ Canon, Parade Réflexe, Réarmement Arcade, Œil de Faucon ;
  - CRÉATIF : Pacte du Kamikaze, Saboteur Infiltré, Blizzard Tactique.
- Les fiches retirées restent ci-dessous, barrées, pour mémoire.
- **Alerte** : le patin descend par construction à 14 mm pour se poser sur le toit. Il viole la règle des 41 mm, et son retrait reste à décider.
- Gabarit de passage : `v3_arcade\gabarit\`, 2 couloirs (HAUTEUR 41 / 38, VENTRE), 11 contrôles automatiques.
- Contrôles des STL du portique relevé : tous passés, dont « rien de rigide sous 41 mm déployé » et « rien sous 44 mm au repos ».

## En bref (version du 17 octobre)

1. **L'architecture tient, avec un changement clé.** Le servo SG90 ne pousse pas l'obstacle : il **libère** un basculeur (le DÉCLIC-SERVO).
   - Un servo qui entraînerait directement la tête mettrait **150 ms** pour pivoter de 90°.
   - Le DÉCLIC met la tête en place en **74 ms** (calcul, à confirmer par la mesure `cal`).
   - Le servo ne reçoit jamais le choc. La tête s'efface vers le haut si on la pousse : rien ne peut bloquer un bolide.
2. **Le one-shot est garanti à trois niveaux.**
   - Le firmware borne l'impulsion entre 150 et 250 ms, avec un chien de garde et un seul tir par manche.
   - La came manuelle ne sort que pendant la bosse.
   - Les têtes sont libres : même hors tension, un bolide les écarte.
3. **18 cartes sont classées**, avec 6 vetos. Effets, pertes, raretés et cotes sont calculés par `calcul_v3.py` ; seuls les taux de sortie (0,5 à 3,5 %) sont des estimations saisies à la main :
   - 5 SOLO, 2 DUEL, 2 DUO et 1 QUATRIO ;
   - 5 BONUS et 3 CRÉATIF.
4. **Quatre chiffres de la mission sont corrigés** (voir § 3) :
   - **3,0 m/s** n'existe pas sur cette piste, même sans aucune perte (2,97 m/s au mieux ; 2,0 à 2,5 en réalité).
   - **0,25 J** n'est atteint que par un bolide de 55 g à 3 m/s : on garde ce cas comme enveloppe de résistance.
   - **0,15 à 0,30 s** de pénalité en SOLO n'est atteint que par le Volet Biais (0,07 à 0,21 s). Les autres pièges sûrs coûtent 0,005 à 0,13 s, l'Onde de Choc jusqu'à 0,30 s. **0,5 à 0,8 s** d'écart en DUEL demanderait d'arrêter un bolide, ce que la règle « zéro casse » interdit. C'est déjà décisif : à 0,10 s de retard, la probabilité de victoire passe de 25 % à 7 %.
5. **Tout est exécutable** :
   - firmware Arduino compilé pour Mega, Uno et Nano, avec 53 tests sur PC ;
   - pont série avec habillage TV, 13 tests ;
   - 19 STL et 50 contrôles automatiques (étanchéité, encombrement, collisions) ;
   - calculateur et générateur de fiches.

---

## 1. Conseil de l'escouade

Chaque agent a relu la mission et rendu son verdict. Le Chef d'atelier tranche selon trois critères : **Spectacle / Zéro casse / Répétabilité**.

| Agent | Constat | Décision du Chef |
|---|---|---|
| 🖨️ **Agent 1 : P1S et fabrication** | Tout tient dans 256 mm ; la plus grande pièce est la poutre (231 mm). Pivots et glissières à 0,30 mm. **Une lame en TPU serait 40 à 80 fois trop souple** : elle passe en PETG 1,2 mm sur 13,5 mm de longueur libre (k ≈ 1,1 à 1,5 N/mm). Sa revue a fait reprendre la pince des pieds, l'axe du basculeur (vis M4), le pupitre (ouvert dessous) et les collisions tête / baie. | Lame en PETG, volets en TPU, structure en PLA et PETG. La baie et les talons de tête se font avec supports, comme la mission l'autorise. |
| ⚡ **Agent 2 : mécatronique** | Un SG90 qui pousse une tête sur 90° met 150 ms et encaisse les chocs. Le DÉCLIC (lumière de 80°, aimant, élastique) descend en 74 ms et laisse le servo à 7° du basculeur au moment du choc. Sa revue a corrigé 8 défauts du firmware et du pont (rebond au relâchement, renvoi après HEAT, reconfiguration après redémarrage…). | **DÉCLIC-SERVO retenu** pour toutes les têtes. L'option A (manuelle) garde une **came à bosse** : l'obstacle remonte même si le joueur tient la ficelle. |
| 🎯 **Agent 3 : gameplay** | La mission fixe la rareté de chaque classe. Le modèle du moteur (indice V) la confirme pour SOLO, DUO et QUATRIO. Les deux DUEL ressortent physiquement « Commun » (V = 0,12 et 0,20). | Les DUEL restent **Épiques** pour leur **enjeu économique** (prime gagnée ou perdue), pas par violence physique. Les autres classes ont été réglées pour tomber dans leur rareté. |
| 🏎️ **Agent 4 : balistique 1:64** | 3 m/s et 0,25 J dépassent la piste. À 30° de biais, une butée rigide (amortie sur 1 mm) encaisse 54 N à 2,2 m/s, soit 9 fois l'admissible de l'essieu. | Les angles de 15 à 30° sont retenus, **mais toujours sur un élément limité en effort** (flexion à 3,6 N maximum, ou bras qui s'efface). Le cas 0,25 J sert d'enveloppe de résistance, pas de vitesse de jeu. |
| 📊 **Agent 5 : archiviste** | Rangement conforme à la consigne : plans, STL, code et HTML dans `12_…\v3_arcade\`, journal ici. | Les fiches sont **générées** depuis `cartes_v3.json` : aucune valeur n'est recopiée à la main. |

**Vetos du Chef d'atelier.** Six idées sont éliminées. Leurs raisons détaillées sont au § 6.

1. La roulette de voie.
2. La porte d'accélération en descente.
3. Le tremplin sans déport.
4. Tout piège posé sur une crête.
5. Toute butée rigide frontale.
6. Tout changement de voie.

---

## 2. Architecture mécatronique validée (point 1 de la mission)

### 2.1 Chaîne complète

```text
 JOUEUR ── bouton d'arcade 30 mm ──► ARDUINO (Mega : 10 canaux, 12 boutons ; Uno : 5 / 6)
                                        │  one-shot, impulsion 150–250 ms, chien de garde, verdict
                                        ├──► SG90 ──► DÉCLIC-SERVO ──► tête (volet, lame, patin) ──► voie
 BOLIDE ── capteur Sharp GP2Y0D805 ─────┘  (60 mm en amont, mise à jour toutes les 2,56 ms)
                                        │ USB série, une ligne JSON par événement
                                        ▼
                     pont_arcade_v3.py ──► journal JSONL (donnees_courses/)
                         │      ▲      ──► habillage TV http://localhost:8110 : « TOUCHÉ ! précision −18 ms »
                         │      └── lit le relais du Grand Prix (/api/v2/state) : nouvelle manche, armement, désarmement
                         ▼
                     console régie (BIND, TEST, STATUS…)
```

Le relais existant est **lu, jamais modifié**. Une intégration plus profonde (événement `arcade.hit` dans le moteur, cote recalculée en direct) est proposée au § 7 ; elle n'est pas faite.

### 2.2 Le DÉCLIC-SERVO : pourquoi et comment

| Grandeur | Valeur | Source |
|---|---|---|
| Servo entraînant la tête de 90° directement | **150 ms** (SG90 : 0,10 s pour 60°) | `calcul_v3.py` § 3 |
| DÉCLIC : rattrapage du jeu de 4°, 5° de poussée et demi-trame PWM, puis chute de 90° sous l'élastique et la gravité | 25 + 49 = **74 ms** | idem |
| Relevage : la tête repasse au-dessus des toits bas après la fin de l'impulsion | **40 ms** (estimé ; à mesurer avec `cal`) | idem |
| Réarmement (retour de 95°) | 158 ms, hors fenêtre de jeu | idem |
| Jeu entre le doigt du servo et le basculeur, tête déployée | **7°** : le choc ne remonte jamais au servo | idem |
| Effacement libre du bras poussé vers l'aval | **73°** avant que la lumière ne touche le doigt | géométrie |
| Bas du volet au repos / déployé | **52 mm** (bolides ≤ 40 mm) / **12 mm** (roues Ø 11 mm) | `exporter_arcade_v3.py` |

**Fonctionnement.**

1. **Repos.** Le basculeur est horizontal, vers l'aval. Un aimant 6 × 3 le retient par une vis M3 en acier vissée dans son chant.
2. **Armement.** Pendant le compte à rebours (`ARM`), le servo amène son doigt à 4° du basculeur, sans le toucher grâce à la lumière.
3. **Tir.** Le doigt pousse le basculeur de 17°. L'aimant lâche, l'élastique et la gravité font tomber la tête de 90° en 49 ms.
4. **Butée basse.** Elle est côté **amont**. Un bolide qui pousse la tête vers l'aval la fait donc **remonter** : il n'y a aucune butée rigide sur le trajet.
5. **Retour.** Après l'impulsion, le servo tourne en sens inverse ; le doigt rattrape l'autre bout de la lumière et remonte le basculeur jusqu'à l'aimant.

**Couple de l'élastique.** L'élastique va du point P du basculeur (6 ; −9) au point A de la flasque (−20 ; −5). Le couple de chute reste du bon signe sur les 90° : −324 au départ, −96 à l'arrivée (unités du plan). La boucle se raccourcit de 15 mm : prendre un joint torique de Ø 8 mm ou un ressort de traction préchargé.

**Point à vérifier au montage : la tenue de l'aimant.** Il doit retenir environ 0,4 N à 22 mm de l'axe : 7,5 mN·m pour l'élastique plus 1,4 mN·m pour la tête. Avec un écart de 0,3 mm, un aimant 6 × 3 N52 sur la tête d'une vis M3 est juste.

- Test : secouer le portique armé. Si la tête tombe, passer à un aimant 8 × 3 (`d = 8` dans le linteau) ou détendre l'élastique.

### 2.3 Option A : le tirant manuel (came à bosse)

La mission demande qu'un ressort ramène l'obstacle quand on relâche la tension. La V3 va plus loin, car un joueur qui garde la ficelle tendue laisserait l'obstacle sorti.

- Le coulisseau porte une **bosse** de 30 mm. Le poussoir de l'ailette ne monte que pendant la bosse : environ 200 ms pour un geste à 0,15 m/s.
- Ensuite, il **retombe même si la ficelle reste tendue**. Le ressort de rappel ramène le coulisseau.
- Un microrupteur KW11 dans la poignée horodate le geste. Le même verdict (« TOUCHÉ », « TROP TÔT »…) s'affiche alors pour les pièges manuels.

### 2.4 Électronique

| Élément | Choix | Remarque |
|---|---|---|
| Carte | **Arduino Mega 2560** (2 portiques × 5 voies, 12 boutons), recommandée ; Uno ou Nano pour 1 portique | Compilé : Mega 20,1 ko de flash et 2,6 ko de RAM ; Uno 18,6 ko et 1,56 ko sur 2 ko (chaînes en flash, il reste environ 490 octets : suffisant, mais sans marge pour des ajouts). Sur Uno, une seule LED (broche 13) sert à tous les boutons. |
| Servos | SG90 (0,177 N·m) | **Alimentation séparée de 5 à 6 V et 3 A**, condensateur de 1000 µF, masses communes. Jamais sur le 5 V de l'Arduino. |
| Détection | Sharp GP2Y0D805Z0F sur carte Pololu #1132 : seuil 0,5 à 5 cm, sortie numérique, 2,56 ms typique (3,77 ms au pire) | Face à 58 mm du fond : le fond (58 mm) n'est pas vu, un toit à 40 mm ou moins l'est. Erreur de timing de ±4 ms au plus. Un condensateur de 10 µF par capteur. |
| Boutons | Arcade 30 mm à LED, en `INPUT_PULLUP` | L'appui est horodaté au premier échantillon (boucle de 1 ms environ), puis verrouillé 80 ms. |
| Télégraphe | Buzzer actif 5 V par transistor 2N2222 | Sirène pendant les 240 ms d'annonce. |
| Sûreté | Chien de garde matériel de 500 ms | Si la boucle se fige, la carte redémarre et tout revient au repos. Le pont renvoie alors toute la configuration (`init`) à chaque `hello`, une ligne toutes les 40 ms. |

**Protocole série** : 115 200 bauds, une commande par ligne.

- Commandes : `H`, `ARM`, `DISARM`, `HEAT n`, `VNOM mm/s`, `CFG ch gap lat_on lat_off`, `ANG ch repos armé tir [rival soi]`, `KIND ch DECLIC|BAL`.
- Liaisons de cartes : `BIND b SOLO|TELE|PARADE|MULTI|TRAIN …`, `UNBIND`, `MOVE a b`, `SHOTS b n`, `CUE b ms`.
- Essais et état : `TEST ch`, `PRESS b`, `STATUS`.
- Événements émis : `hello`, `press`, `fire`, `gate`, `shot` (verdict, `delta`, `precision`, `fenetre`), `tele`, `parade`, `renvoi`, `contrecoup`, `retract`, `cal`, `refus`, `err`.

### 2.5 Compatibilité Bambu Lab P1S

| Pièce | Matière | Encombrement | Supports | Points FDM |
|---|---|---|---|---|
| Poutre du portique | PLA | 231 × 78 × 10 | non | À plat. Glissières des pieds à 0,30 mm (réglage pour une piste de 191 à 203 mm de large). |
| Pied (×2) | PETG | 116 × 36 × 12 | non (couché sur sa face) | Mâchoire haute sur le dessus de la paroi, mâchoire basse sous le fond, vis M3 de serrage vers le haut et écrou prisonnier : serre 6 à 16 mm. **Aucune intrusion** dans les voies 1 et 5. Tenon de 20 mm dans la glissière de la poutre, lumières oblongues (réglage ±5,5 mm). |
| Baie DÉCLIC (×5) | PLA | 50 × 51 × 31 | **oui**, sous la flasque A | Poche SG90 de 22,5 × 11,9 mm + 0,30 mm de jeu, vis à 27,8 mm d'entraxe. Axe : vis M4 × 16 + écrou bas, moyeu-entretoise Ø 9 venu de matière. Tenon vissé M3 dans la poche de la poutre. |
| Basculeur (×5) | PLA, couche de 0,16 mm | 54 × 28 × 5 | non | Alésage Ø 4,6 (jeu 0,30), lumière de 80° pour un doigt de Ø 2, clavette de tête. |
| Volet biais | PLA (traverse) + TPU 95A (plaque 1,2 mm) | 30 × 14 × 14 / 23 × 16 × 5 | oui, sous le talon | Traverse au plateau. Axe en corde à piano Ø 1,5, œillets à Ø 2,1. Volet lourd : un écrou M3 collé sur la traverse. |
| Lame d'interstice | PETG | 34 × 14 × 12 | oui, sous le talon | Variantes 15°, 20° et 30°. Lame de 1,2 × 4 mm, longueur libre 13,5 mm (k ≈ 1,1 à 1,5 N/mm). Intrusion = voie − 34 − 0,5 au plus ; non fabriquée sous 36,3 mm de voie. |
| Patin | PLA | 37 × 27 × 26 | non | Écrou M5 en lest. |
| Balancier | PETG | 40 × 12 × 8 | non | Languette de 1,4 mm dans l'interstice de 2 mm. Tiré par deux lignes tressées avec ressort de traction en série (3 N au plus). |
| Came, fourreau, tirette | PLA | 92 × 14 × 14 au plus | non | Coulisseau à 0,30 mm de jeu. |
| Pupitre | PLA | 230 × 110 × 45 | non (dessus au plateau, ouvert dessous) | 6 trous Ø 30 lamés à 2 mm pour les clips, clé Ø 19, passe-câble. |
| Départ Canon | PLA | 40 × 36 × 14 | non | Piston Ø 8, jeu 0,30. |
| Bouclier d'interstice | PETG | 132 × 13 × 4 | non | Nervures de 0,8 mm d'un côté : 0,2 mm de serrage dans l'interstice. |

`exporter_arcade_v3.py` vérifie, et s'arrête au moindre échec :

- l'étanchéité de chaque STL et sa place dans le volume de 256 mm ;
- au repos, rien sous 42 mm ;
- une fois déployé : volet à 12 mm, lame à voie − 34 − 0,5 d'intrusion (3,00 mm pour 37,5) avec 0,30 mm de jeu à la paroi, patin à 14 mm, aucun contact avec la piste ;
- aucune collision entre le basculeur et la baie à 0°, −45° et −90°, butées actives entre −90 et −96° et à +4° ;
- aucune collision des têtes avec la baie (repos et déployé), des tenons de baie avec la poutre, des pieds avec la poutre ou la piste ;
- la place d'un SG90 dans sa poche.

Les masses sont estimées à 55 % de la pièce pleine (3 parois, remplissage de 25 %). Pour un portique de 5 voies : environ 140 g de structure (poutre, 2 pieds, 5 baies, 5 basculeurs), 87 g de pupitre, et 1 à 3 g de tête par voie.

### 2.6 Fenêtres de tir : où se loge l'adresse

La fenêtre « pleine » s'ouvre quand la tête est en place avant l'arrivée du bolide, et dure jusqu'à ce qu'elle soit relevée :

- fenêtre pleine = impulsion − latence (74 ms) + relevage (40 ms) ;
- **passage du bolide** = (64 + 16) / v = 36 ms à 2,2 m/s. Si la tête tombe sur un bolide déjà engagé, c'est « EFFLEURÉ » (effet × 0,4).

| Impulsion | Fenêtre pleine | Expert (σ 43 ms) | Familial (σ 58 ms) | Enfant (σ 86 ms) |
|---|---|---|---|---|
| 150 ms | 116 ms | 83 % | 68 % | 50 % |
| 200 ms | 166 ms | 95 % | 84 % | 67 % |
| 250 ms | 216 ms | 99 % | 94 % | 79 % |

L'écart type σ combine trois termes : le geste d'anticipation (30, 50 ou 80 ms selon le profil), l'imprévu d'arrivée (8 % de variation de vitesse sur 0,36 s) et la dispersion du servo (4 ms).

**Ces σ sont des hypothèses.** On les mesure avec le mode entraînement (`BIND b TRAIN ch`) : aucun servo ne bouge, le verdict s'affiche quand même.

- La fenêtre de 150 à 250 ms imposée par la mission rend les tirs **faciles pour un adulte**. L'adresse se lit surtout dans la **précision** affichée (« ±18 ms ») et dans le tableau des tireurs.
- Pour durcir, deux réglages suffisent : impulsion à 150 ms, et télégraphe sur les DUEL.

**Œil de Faucon (bonus).** Il remplace l'anticipation par un réflexe sur une LED. Il rapproche les profils : de 67 à 91 % pour un enfant, de 95 à 91 % pour un expert. C'est un bonus intergénérationnel.

---

## 3. Corrections des chiffres de la mission

| Mission | Calcul | Conséquence |
|---|---|---|
| 3,0 m/s en milieu de descente | Vitesse **sans aucune perte** : 2,97 m/s (dénivelé de 450 mm ; 2,73 à 3,19 m/s selon M8). Mesures terrain : 1,9 à 2,7 m/s à l'arrivée. 3 m/s demanderait 459 mm de chute sans frottement. | Le jeu est calculé de 2,0 à 2,5 m/s. **3 m/s sert d'enveloppe de résistance.** |
| Ec ≈ 0,25 J | 0,25 J = 55 g à 3,0 m/s exactement. En jeu : 60 mJ (30 g à 2 m/s) à 172 mJ (55 g à 2,5 m/s). | Les efforts sont vérifiés à 0,25 J (volet : 3,7 N ; lames plafonnées à 3,6 ou 4,5 N, balancier à 3 N). |
| SOLO : 0,15 à 0,30 s | Sans arrêter le bolide, le Volet Biais retire 0,07 à 0,21 s (masse du bras qui s'efface, appui de l'élastique sur le toit) ; les autres SOLO 0,005 à 0,07 s ; l'Onde de Choc jusqu'à 0,30 s. | **Conservé : la physique.** Repère : 0,05 s fait passer la probabilité de victoire de 25 % à 14 %, et 0,10 s à 7 %. |
| DUEL : 0,5 à 0,8 s d'écart, « propulse son bolide » | Aucun piège ne peut pousser un bolide en route sans le frapper par l'arrière à plus de 2 m/s (veto). 0,5 s correspond à une manche perdue d'avance. | L'enjeu « quitte ou double » passe dans l'**économie** : prime de duel gagnée ou perdue, voir § 7. |
| Butées biaises de 15 à 30° | À 30° et 2,2 m/s, une butée rigide (amortie sur 1 mm) encaisse 54 N latéralement, une butée souple de 4 mm 13,6 N. L'essieu admet 5,9 à 10 N. | Angles conservés, **sur des têtes limitées en effort** : flexion plafonnée à 3,6 N, ou bras qui s'efface. |
| Impulsion servo de 150 à 250 ms | Compatible. | Bornes imposées dans le firmware (`IMPULSION_MIN` et `IMPULSION_MAX`), vérifiées par les tests. |

**Crête délestée, creux comprimé.** Sur l'ondulée, avec λ = 200 mm :

- Le bolide **décolle à la crête** dès que l'amplitude dépasse 2,05 mm à 2,2 m/s : le facteur de charge vaut −0,46 à 3 mm, −1,43 à 5 mm.
- Le creux charge le bolide de 2,5 à 4,9 g.

D'où la règle de placement : **les pièges actifs vont de préférence au creux** (zone ZB), là où le bolide est plaqué et ne peut pas sortir. Les droites sont admises (ZA, ZC). La crête reste interdite (veto 4).

---

## 4. Classification complète (point 2 de la mission)

Effet calculé pour un tireur familial. Rareté calculée avec le moteur du Grand Prix : V = (perte moyenne + 3 × sortie) × cibles.

| Carte | Classe | Zone | Activation | Effet | Perte (s) | Rareté mission → calculée |
|---|---|---|---|---|---|---|
| Volet Biais `V3-S1` | SOLO | ZB | servo | 87 % | 0,074 – 0,206 | Standard → Commun |
| Lame d'Interstice `V3-S2` | SOLO | ZB | servo | 87 % | 0,018 – 0,072 | Standard → Commun |
| Patin du Blizzard `V3-S3` | SOLO | ZA | servo | 95 % | 0,072 – 0,203 | Standard → Commun |
| Ailette à Came `V3-S4` | SOLO | ZC | manuel | 95 % | 0,005 – 0,020 | Standard → Commun |
| Quille Déclic `V3-S5` | SOLO | ZA | manuel | 87 % | 0,006 – 0,022 | Standard → Commun |
| Balancier Quitte-ou-Double `V3-D1` | DUEL | ZB | servo | 77 % | 0,012 – 0,045 | Épique (enjeu du duel) ; physique : Commun |
| Télégraphe & Parade `V3-D2` | DUEL | ZB | servo | 87 % | 0,074 – 0,206 | Épique (enjeu du duel) ; physique : Commun |
| Déflecteur Bilatéral `V3-U1` | DUO | ZA | servo | 80 % | 0,033 – 0,132 | Rare → Rare |
| Herse Jumelle `V3-U2` | DUO | ZB | servo | 82 % | 0,074 – 0,206 | Rare → Rare |
| Onde de Choc `V3-Q1` | QUATRIO | ZB | servo | 84 % | 0,102 – 0,304 | Légendaire → Légendaire |
| Blizzard Tactique `V3-C3` | CRÉATIF | ZA | servo | 84 % | 0,072 – 0,203 | Légendaire (homologation : QUATRIO) → Épique |
| Bouclier d'Interstice `V3-B1` | BONUS | ZB | règle / passif | — | règle | Rare |
| Départ Canon `V3-B2` | BONUS | DEP | règle / passif | — | gain 0,040 – 0,056 | Légendaire |
| Parade Réflexe `V3-B3` | BONUS | — | règle / passif | — | règle | Rare |
| Réarmement Arcade `V3-B4` | BONUS | — | règle / passif | — | règle | Épique |
| Œil de Faucon `V3-B5` | BONUS | — | règle / passif | — | règle | Rare |
| Pacte du Kamikaze `V3-C1` | CRÉATIF | ZB | servo | 95 % | 0,102 – 0,304 | Épique (homologation : DUEL) → Commun |
| Saboteur Infiltré `V3-C2` | CRÉATIF | — | règle / passif | — | règle | Rare (règle) |

---

## 5. Fiches normalisées (format strict de l'escouade)

**— Classe SOLO (2, plus 3 retirées) —**

### 🎯 Volet Biais — SOLO  `V3-S1`
- **Rareté Lootbox :** Standard (calculée : Commun, V = 0,20)
- **Positionnement sur la piste :** Creux comprimé (ondulée) — zone ZB (ondulée)
- **Principe cinématique :** Volet pendulaire TPU lâché par le DÉCLIC-SERVO ; le bolide le soulève et passe dessous.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 200 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,074 à 0,206 s** ; probabilité de toucher (tireur familial) : 87 %. P(victoire) d'un bolide moyen visé : 25 % → 7,1 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,23)). Sortie / arrêt : 2,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Volet biais à 20° en lacet, bas à 12 mm : il ne rencontre que la caisse, jamais une roue (Ø 11 mm). Plaque TPU souple : contact de 3 ms, 2,7 N à 2,2 m/s, 3,7 N à l'enveloppe 3 m/s – 55 g (admissible 5,9 N). Poussé vers l'aval, le bras du DÉCLIC s'efface librement de 73° : ni butée rigide, ni blocage, même si la tête tombe sur le bolide.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), volet_biais (PLA), volet_plaque (TPU) (≈ 16 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL (voie, sens de course →)                VUE DE DESSUS (voie 37,5 mm)
   poutre ════════════════════════                     │▌slot 2 mm                     slot 2 mm▐│
            ║ baie   ○ axe servo/basculeur (z 70)       │▌    ╲  volet biais 20°               ▐│
   repos :  ╚══════════● bras 34,5 → aval              │▌     ╲ (largeur utile 23 mm)        ▐│
                        ┆ volet pendu, bas à 52 mm      │▌  ▶▶  ╲                            ▐│
   tir   :          bras ↓ (57 ms)                      │▌ bolide                            ▐│
                     ●━┓ axe libre                      ←──────────── 37,5 mm ────────────→
   bolide ▶▶▶▶     ┃ volet TPU 16 mm, bas à 12 mm  (roues Ø11 : jamais touchées)
   ═════════════════╧═══════════════ fond de voie     poussé vers l'aval, le volet pivote et le BRAS S'EFFACE vers le haut
```

### 🎯 Lame d'Interstice — SOLO  `V3-S2`  ~~RETIRÉE~~
> **Carte retirée le 18/10/2026 : intrusion latérale (lame d'interstice) : les bolides larges passent pile dans la voie.** Fiche conservée pour mémoire.
- **Rareté Lootbox :** Standard (calculée : Commun, V = 0,13)
- **Positionnement sur la piste :** Creux comprimé, contre le slot 2 mm — zone ZB (ondulée)
- **Principe cinématique :** Aileron de friction descendu contre la paroi côté interstice, bec biais 15°, lame PETG en flexion limitée en effort.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 200 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,018 à 0,072 s** ; probabilité de toucher (tireur familial) : 87 %. P(victoire) d'un bolide moyen visé : 25 % → 16,1 % (facteur de cote ×0,58). Sortie / arrêt : 3,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Rampe biaisée de 15° qui commence À la paroi (aucun front droit) ; lame PETG en flexion, effort plafonné à 3,6 N (k 1,2 N/mm × 3,0 mm), au-delà elle s'efface vers la paroi. Effort sur la roue dans le sens de la course ≤ F·(sin θ + μ cos θ) = 2,0 N (admissible 5,9 N). Intrusion = voie − 34 − 0,5 au plus : le bolide le plus large n'est jamais pincé ; voie ≥ 36,3 mm exigée (sinon la lame n'est pas fabriquée).
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA) (≈ 15 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE DESSUS (voie 37,5 mm, interstice 2 mm creux)
   paroi ▐▌░░ slot 2 mm ░░▐▌ paroi
         ▐▌  ┐ lame PETG 2 mm (flexion, 1,2 N/mm)  — jeu 0,30 à la paroi
         ▐▌  │╲ rampe biaisée dès la paroi (15–30°)
         ▐▌  │ ╲___ intrusion maxi 3,0 mm   ▶▶ bolide (34 mm) ▶▶
         ▐▌  ┘                        reste 34,5 mm de passage : jamais de pincement
VUE DE PROFIL : lame de 6 à 14 mm du fond (flanc de caisse) ; au-delà de 3,6 N, la lame plie et s'efface vers la paroi.
```

### 🎯 Patin du Blizzard — SOLO  `V3-S3`
- **Rareté Lootbox :** Standard (calculée : Commun, V = 0,15)
- **Positionnement sur la piste :** Droite (grande droite) — zone ZA (grande droite (entre les arches))
- **Principe cinématique :** Patin auto-adaptatif posé à 12 mm : il frappe puis frotte le toit ; un bolide haut fait s'effacer le bras (au-dessus de 41 mm à 61°, sous 0,20 N).
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 250 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,072 à 0,203 s** ; probabilité de toucher (tireur familial) : 95 %. P(victoire) d'un bolide moyen visé : 25 % → 5,8 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,18)). Sortie / arrêt : 0,5 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Patin auto-adaptatif (homologation du 24/10/2026) : bas à 12 mm, juste au-dessus des roues Ø 11 ; spatule à 30° ; un bolide haut fait s'effacer le bras (au-dessus de 41 mm à 61°, effort 0,20 N). Choc sur la carrosserie : masse effective 3,7 g, sans lest.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), patin (PLA) (≈ 18 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL
        ○ axe (z 85)
        ┃ bras 34,5 (s'efface vers le haut : au-dessus de 41 mm à 61°, effort 0,20 N)
   ╱▔▔▔▔▔▔▔▔▔▔╲  patin 32 mm décalé vers l'aval, spatule à 30°, bas à 12 mm
   ▶▶ bolide (toit 12–38 mm) : choc puis frottement sur le toit ▶▶
   ═══════════════════════ fond
```

### 🎯 Ailette à Came — SOLO  `V3-S4`  ~~RETIRÉE~~
> **Carte retirée le 18/10/2026 : intrusion latérale (ailette) : les bolides larges passent pile dans la voie.** Fiche conservée pour mémoire.
- **Rareté Lootbox :** Standard (calculée : Commun, V = 0,10)
- **Positionnement sur la piste :** Slot 2 mm inter-voies (courte n°2) — zone ZC (courte n°2 (avant l'obstacle P15))
- **Principe cinématique :** Ailette V2 sur la languette de rainure ; la tirette fait passer une came à bosse : l'ailette sort pendant la bosse seulement.
- **Mode d'activation One-Shot :** Tirant manuel à ficelle (came à bosse, microrupteur dans la poignée pour horodater le geste) ; course active ≈ 200 ms.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,005 à 0,020 s** ; probabilité de toucher (tireur familial) : 95 %. P(victoire) d'un bolide moyen visé : 25 % → 21,4 % (facteur de cote ×0,82). Sortie / arrêt : 3,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Ailette ou palette V2 biaisée à 15°, en flexion (effort plafonné à 2,2 N, puis elle s'efface vers la cloison) ; effort sur la roue dans le sens de la course ≤ 1,2 N (admissible 5,9 N). Anti-blocage mécanique : la came ne la sort que pendant la bosse.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE EN COUPE (tirette manuelle)
   ficelle ← main          coulisseau 80 mm (jeu 0,30 dans le fourreau)
   ─────────────[▁▁▁╱▔▔▔▔╲▁▁▁▁]──── ressort de rappel
                     ↑ bosse : 30 mm de course = ≈ 200 ms à 0,15 m/s de geste
                   poussoir Ø3 → ailette V2 sur la languette du slot 2 mm (sort de 2,7 mm, biais 15°)
   Après la bosse, le poussoir RETOMBE même si la ficelle reste tendue : anti-blocage mécanique.
```

### 🎯 Quille Déclic — SOLO  `V3-S5`  ~~RETIRÉE~~
> **Carte retirée le 18/10/2026 : intrusion latérale (quille de rainure) : les bolides larges passent pile dans la voie.** Fiche conservée pour mémoire.
- **Rareté Lootbox :** Standard (calculée : Commun, V = 0,07)
- **Positionnement sur la piste :** Slot 2 mm inter-voies (grande droite) — zone ZA (grande droite (entre les arches))
- **Principe cinématique :** Quille pendulaire V2 lâchée par un échappement : un seul aller, rattrapée par un aimant au retour.
- **Mode d'activation One-Shot :** Tirant manuel à ficelle (came à bosse, microrupteur dans la poignée pour horodater le geste) ; course active ≈ 150 ms.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,006 à 0,022 s** ; probabilité de toucher (tireur familial) : 87 %. P(victoire) d'un bolide moyen visé : 25 % → 21,7 % (facteur de cote ×0,83). Sortie / arrêt : 2,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Ailette ou palette V2 biaisée à 15°, en flexion (effort plafonné à 1,5 N, puis elle s'efface vers la cloison) ; effort sur la roue dans le sens de la course ≤ 0,8 N (admissible 5,9 N). Anti-blocage mécanique : un seul aller, rattrapé par l'aimant.
- **Faisabilité Bambu Lab P1S :** quille V2 (pieges_v2/stl) (≈ 0,0 g de filament par voie équipée) ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE DESSUS
   ▐▌░ slot ░▐▌   quille V2 (tige TPU) retenue par un échappement ;
   ▐▌  ●╲      la ficelle lâche UN aller : la palette traverse 2,5 mm de voie à 15°,
   ▐▌    ╲ ▶▶  puis l'aimant de retour la capture : pas de second passage.
```

**— Classe DUEL (1, plus 1 retirée) —**

### ⚔️ Balancier Quitte-ou-Double — DUEL  `V3-D1`  ~~RETIRÉE~~
> **Carte retirée le 18/10/2026 : intrusion latérale (ailes du balancier) : les bolides larges passent pile dans la voie.** Fiche conservée pour mémoire.
- **Rareté Lootbox :** Épique (rareté physique calculée : Commun, V = 0,12 ; enjeu quitte-ou-double, voir l'arbitrage)
- **Positionnement sur la piste :** Slot 2 mm entre 2 voies voisines (creux) — zone ZB (ondulée)
- **Principe cinématique :** Bascule sur la rainure, ailes biais 25°, tirée par deux lignes tressées avec ressort en série (3 N maxi) : l'aller frappe la voie rivale, le contrecoup revient dans la voie du tireur.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 210 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique. Version manuelle possible au tirant (came à bosse).
- **Impact mesuré sur la course :** Perte du bolide touché : **0,012 à 0,045 s** ; probabilité de toucher (tireur familial) : 77 % ; contrecoup sur son propre bolide : 31 %. P(victoire) d'un bolide moyen visé : 25 % → 19,5 % (facteur de cote ×0,73). Sortie / arrêt : 3,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Ailes biaisées à 25° ; la bascule est TIRÉE par deux lignes tressées avec un ressort de traction en série : effort plafonné à 3,0 N, et un bolide qui pousse l'aile la fait simplement revenir (une ligne ne pousse pas). Effort sur la roue dans le sens de la course ≤ F·(sin θ + μ cos θ) = 2,1 N (admissible 5,9 N). Languette dans l'interstice : 0 intrusion au repos.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE DESSUS (deux voies voisines)
   voie du RIVAL        ▐ slot ▌        voie du TIREUR
                    ◄ aile 25° ┃ aile 25° ►
        aller (130–210 ms) : l'aile entre de 3 mm chez le rival
        contrecoup (80 ms) : l'aile revient de 3 mm chez le tireur → risque si son bolide passe à ce moment
   Lame centrale dans l'interstice (0 intrusion au repos), axe Ø1,5 parallèle à la course.
```
> **Arbitrage du Chef d'atelier :** Rareté physique calculée « Commun » (V = 0.12) ; le Chef retient « Épique » parce que l'enjeu est économique : prime de duel gagnée si la frappe touche, payée au rival en cas de contrecoup ou de parade.

### ⚔️ Télégraphe & Parade — DUEL  `V3-D2`
- **Rareté Lootbox :** Épique (rareté physique calculée : Commun, V = 0,20 ; enjeu quitte-ou-double, voir l'arbitrage)
- **Positionnement sur la piste :** Creux comprimé, voies adverses — zone ZB (ondulée)
- **Principe cinématique :** L'attaque est annoncée 240 ms (sirène + LED) ; si le défenseur pare à temps, le volet part sur la voie de l'attaquant.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 200 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,074 à 0,206 s** ; probabilité de toucher (tireur familial) : 87 % ; contre un défenseur équipé de la Parade Réflexe : parade 60 %, frappe 33 % (P(victoire) visé 18,1 %, cote ×0,66). P(victoire) d'un bolide moyen visé : 25 % → 7,1 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,23)). Sortie / arrêt : 2,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Volet biais à 20° en lacet, bas à 12 mm : il ne rencontre que la caisse, jamais une roue (Ø 11 mm). Plaque TPU souple : contact de 3 ms, 2,7 N à 2,2 m/s, 3,7 N à l'enveloppe 3 m/s – 55 g (admissible 5,9 N). Poussé vers l'aval, le bras du DÉCLIC s'efface librement de 73° : ni butée rigide, ni blocage, même si la tête tombe sur le bolide.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), volet_biais (PLA), volet_plaque (TPU) (≈ 16 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL (voie, sens de course →)                VUE DE DESSUS (voie 37,5 mm)
   poutre ════════════════════════                     │▌slot 2 mm                     slot 2 mm▐│
            ║ baie   ○ axe servo/basculeur (z 70)       │▌    ╲  volet biais 20°               ▐│
   repos :  ╚══════════● bras 34,5 → aval              │▌     ╲ (largeur utile 23 mm)        ▐│
                        ┆ volet pendu, bas à 52 mm      │▌  ▶▶  ╲                            ▐│
   tir   :          bras ↓ (57 ms)                      │▌ bolide                            ▐│
                     ●━┓ axe libre                      ←──────────── 37,5 mm ────────────→
   bolide ▶▶▶▶     ┃ volet TPU 16 mm, bas à 12 mm  (roues Ø11 : jamais touchées)
   ═════════════════╧═══════════════ fond de voie     poussé vers l'aval, le volet pivote et le BRAS S'EFFACE vers le haut
```
> **Arbitrage du Chef d'atelier :** Rareté physique calculée « Commun » (V = 0.20) ; le Chef retient « Épique » parce que l'enjeu est économique : prime de duel gagnée si la frappe touche, payée au rival en cas de contrecoup ou de parade.

**— Classe DUO (1, plus 1 retirée) —**

### 🤝 Déflecteur Bilatéral — DUO  `V3-U1`  ~~RETIRÉE~~
> **Carte retirée le 18/10/2026 : intrusion latérale (deux lames raides) : les bolides larges passent pile dans la voie.** Fiche conservée pour mémoire.
- **Rareté Lootbox :** Rare (calculée : Rare, V = 0,34)
- **Positionnement sur la piste :** Droite (grande droite), 2 voies désignées — zone ZA (grande droite (entre les arches))
- **Principe cinématique :** Un seul appui descend deux lames d'interstice raides (bec 20°, plafond 4,5 N) sur deux voies choisies (ex. 2 et 4).
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 220 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,033 à 0,132 s** ; probabilité de toucher (tireur familial) : 80 % ; 1,60 bolide(s) frappé(s) en moyenne sur 2. P(victoire) d'un bolide moyen visé : 25 % → 12,6 % (facteur de cote ×0,43). Sortie / arrêt : 3,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Rampe biaisée de 20° qui commence À la paroi (aucun front droit) ; lame PETG en flexion, effort plafonné à 4,5 N (k 1,5 N/mm × 3,0 mm), au-delà elle s'efface vers la paroi. Effort sur la roue dans le sens de la course ≤ F·(sin θ + μ cos θ) = 2,8 N (admissible 5,9 N). Intrusion = voie − 34 − 0,5 au plus : le bolide le plus large n'est jamais pincé ; voie ≥ 36,3 mm exigée (sinon la lame n'est pas fabriquée).
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA) (≈ 15 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE DESSUS (voie 37,5 mm, interstice 2 mm creux)
   paroi ▐▌░░ slot 2 mm ░░▐▌ paroi
         ▐▌  ┐ lame PETG 2 mm (flexion, 1,2 N/mm)  — jeu 0,30 à la paroi
         ▐▌  │╲ rampe biaisée dès la paroi (15–30°)
         ▐▌  │ ╲___ intrusion maxi 3,0 mm   ▶▶ bolide (34 mm) ▶▶
         ▐▌  ┘                        reste 34,5 mm de passage : jamais de pincement
VUE DE PROFIL : lame de 6 à 14 mm du fond (flanc de caisse) ; au-delà de 3,6 N, la lame plie et s'efface vers la paroi.
```

### 🤝 Herse Jumelle — DUO  `V3-U2`
- **Rareté Lootbox :** Rare (calculée : Rare, V = 0,43)
- **Positionnement sur la piste :** Creux comprimé, 2 voies désignées — zone ZB (ondulée)
- **Principe cinématique :** Deux boutons, deux volets : un appui par voie visée, chacun avec son propre timing.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 180 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,074 à 0,206 s** ; probabilité de toucher (tireur familial) : 82 %. P(victoire) d'un bolide moyen visé : 25 % → 8,1 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,26)). Sortie / arrêt : 2,5 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Volet biais à 20° en lacet, bas à 12 mm : il ne rencontre que la caisse, jamais une roue (Ø 11 mm). Plaque TPU souple : contact de 3 ms, 2,7 N à 2,2 m/s, 3,7 N à l'enveloppe 3 m/s – 55 g (admissible 5,9 N). Poussé vers l'aval, le bras du DÉCLIC s'efface librement de 73° : ni butée rigide, ni blocage, même si la tête tombe sur le bolide.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), volet_biais (PLA), volet_plaque (TPU) (≈ 16 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL (voie, sens de course →)                VUE DE DESSUS (voie 37,5 mm)
   poutre ════════════════════════                     │▌slot 2 mm                     slot 2 mm▐│
            ║ baie   ○ axe servo/basculeur (z 70)       │▌    ╲  volet biais 20°               ▐│
   repos :  ╚══════════● bras 34,5 → aval              │▌     ╲ (largeur utile 23 mm)        ▐│
                        ┆ volet pendu, bas à 52 mm      │▌  ▶▶  ╲                            ▐│
   tir   :          bras ↓ (57 ms)                      │▌ bolide                            ▐│
                     ●━┓ axe libre                      ←──────────── 37,5 mm ────────────→
   bolide ▶▶▶▶     ┃ volet TPU 16 mm, bas à 12 mm  (roues Ø11 : jamais touchées)
   ═════════════════╧═══════════════ fond de voie     poussé vers l'aval, le volet pivote et le BRAS S'EFFACE vers le haut
```

**— Classe QUATRIO (1) —**

### 🌊 Onde de Choc — QUATRIO  `V3-Q1`
- **Rareté Lootbox :** Légendaire (calculée : Légendaire, V = 1,17)
- **Positionnement sur la piste :** Creux comprimé (ondulée), toutes les voies sauf la sienne — zone ZB (ondulée)
- **Principe cinématique :** Un seul appui lâche les volets lourds (biais 20°, lestés d'un écrou M3) des 4 voies adverses en même temps.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 250 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,102 à 0,304 s** ; probabilité de toucher (tireur familial) : 84 % ; 3,37 bolide(s) frappé(s) en moyenne sur 4. P(victoire) d'un bolide moyen visé : 25 % → 5,7 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,18)). Sortie / arrêt : 3,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Volet biais à 20° en lacet, bas à 12 mm : il ne rencontre que la caisse, jamais une roue (Ø 11 mm). Plaque TPU souple : contact de 3 ms, 2,7 N à 2,2 m/s, 3,7 N à l'enveloppe 3 m/s – 55 g (admissible 5,9 N) ; le lest du volet lourd allonge le contact, l'effort de crête reste du même ordre. Poussé vers l'aval, le bras du DÉCLIC s'efface librement de 73° : ni butée rigide, ni blocage, même si la tête tombe sur le bolide.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), volet_biais (PLA), volet_plaque (TPU) (≈ 16 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE FACE (portique A, 5 voies)
   ════════════════════════ poutre ════════════════════════
     ┃lame       ┃lame       (voie du tireur : rien)  ┃lame       ┃lame
   ▐▌ ╲        ▐▌ ╲        ▐▌                      ▐▌ ╲        ▐▌ ╲       biais 30°, intrusion 3 mm
   voie 1       voie 2      voie 3 (tireur)         voie 4       voie 5
   Un seul appui, 4 lames ensemble : 3,4 bolides frappés en moyenne (bolides groupés à ±60 ms).
```

**— Classe BONUS (4, plus 1 retirée) —**

### 🛡️ Bouclier d'Interstice — BONUS  `V3-B1`  ~~RETIRÉE~~
> **Carte retirée le 18/10/2026 : sans objet : il ne protégeait que des cartes à intrusion latérale, et réduisait lui-même la voie de 2,5 mm.** Fiche conservée pour mémoire.
- **Rareté Lootbox :** Rare
- **Positionnement sur la piste :** Le long du slot 2 mm de sa propre voie — zone ZB (ondulée)
- **Principe cinématique :** Rail clipsé qui recouvre l'interstice des deux côtés de sa voie : les lames et le balancier frappent le rail, pas le bolide.
- **Mode d'activation One-Shot :** Passif (posé avant la manche).
- **Impact mesuré sur la course :** Effet de règle (aucune pièce ne touche un bolide).
- **Sécurité mécanique des bolides :** Rail lisse parallèle à la course, entrée en biseau ; il réduit la voie protégée à voie − 2,5 mm : réservé aux voies mesurées ≥ 37,0 mm (M1) et aux bolides ≤ 34,5 mm.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE DESSUS
   ▐▌░ slot ░▐███▌  rail PETG 2,5 mm, haut de 10 mm, 120 mm de long, languette serrée dans le slot
              ███   la lame ou le balancier frappent le rail, pas le bolide
              ███ ▶▶ voie protégée : 37,5 − 2,5 = 35,0 mm (bolide ≤ 34,5 mm)
```

### 🛡️ Départ Canon — BONUS  `V3-B2`
- **Rareté Lootbox :** Légendaire
- **Positionnement sur la piste :** Grille de départ, derrière son bolide
- **Principe cinématique :** Poussoir à ressort calibré (1 mJ) libéré par l'ouverture du portillon de départ.
- **Mode d'activation One-Shot :** Mécanique (portillon de départ).
- **Impact mesuré sur la course :** Gain du bolide : **0,040 à 0,056 s** (profil de départ 2 phases, à mesurer au chronomètre).
- **Sécurité mécanique des bolides :** Poussée dans l'axe, sur le pare-chocs arrière, au départ arrêté ; énergie plafonnée à ≈ 1 mJ par un ressort calibré (aucun choc).
- **Faisabilité Bambu Lab P1S :** canon_fourreau (PLA), canon_piston (PLA) (≈ 13 g de filament par voie équipée) ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL (grille de départ)
   portillon ┃       [piston Ø8 ═══ ressort 0,35 N/mm, 6 mm] ▶ bolide
   L'ouverture du portillon libère le piston : ≈ 1 mJ utiles transmis au départ arrêté.
```

### 🛡️ Parade Réflexe — BONUS  `V3-B3`
- **Rareté Lootbox :** Rare
- **Positionnement sur la piste :** Pupitre (bouton de parade)
- **Principe cinématique :** Donne un bouton de parade contre toute attaque télégraphiée visant sa voie pendant la manche.
- **Mode d'activation One-Shot :** Bouton d'arcade.
- **Impact mesuré sur la course :** Effet de règle (aucune pièce ne touche un bolide).
- **Sécurité mécanique des bolides :** Aucune pièce en contact avec le bolide.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; infrastructure partagée : pupitre ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
PUPITRE D'ARCADE (230 × 110 mm)
   ( 1 )  ( 2 )  ( 3 )  ( 4 )  ( 5 )  ( 6 )   boutons 30 mm à LED     [clé ARM]
   Le bouton s'allume pendant le télégraphe, pour la visée (Œil de Faucon) et reste éteint après le tir.
```

### 🛡️ Réarmement Arcade — BONUS  `V3-B4`
- **Rareté Lootbox :** Épique
- **Positionnement sur la piste :** Pupitre
- **Principe cinématique :** Autorise un second appui sur l'un de ses pièges pendant la même manche (le one-shot devient two-shot).
- **Mode d'activation One-Shot :** Logiciel (pupitre).
- **Impact mesuré sur la course :** Effet de règle (aucune pièce ne touche un bolide).
- **Sécurité mécanique des bolides :** Aucune pièce en contact avec le bolide.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; infrastructure partagée : pupitre ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
PUPITRE D'ARCADE (230 × 110 mm)
   ( 1 )  ( 2 )  ( 3 )  ( 4 )  ( 5 )  ( 6 )   boutons 30 mm à LED     [clé ARM]
   Le bouton s'allume pendant le télégraphe, pour la visée (Œil de Faucon) et reste éteint après le tir.
```

### 🛡️ Œil de Faucon — BONUS  `V3-B5`
- **Rareté Lootbox :** Rare
- **Positionnement sur la piste :** Pupitre (LED de visée)
- **Principe cinématique :** La LED du bouton s'allume au moment idéal calculé depuis le capteur amont : on tire au réflexe au lieu d'anticiper.
- **Mode d'activation One-Shot :** Logiciel (pupitre).
- **Impact mesuré sur la course :** Effet de règle (aucune pièce ne touche un bolide).
- **Sécurité mécanique des bolides :** Aucune pièce en contact avec le bolide.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
PUPITRE D'ARCADE (230 × 110 mm)
   ( 1 )  ( 2 )  ( 3 )  ( 4 )  ( 5 )  ( 6 )   boutons 30 mm à LED     [clé ARM]
   Le bouton s'allume pendant le télégraphe, pour la visée (Œil de Faucon) et reste éteint après le tir.
```

**— Classe CRÉATIF (3) —**

### 🎲 Blizzard Tactique — CRÉATIF  `V3-C3`
- **Rareté Lootbox :** Légendaire (homologation : QUATRIO) (calculée : Épique, V = 0,61 — écart signalé)
- **Positionnement sur la piste :** Droite, les 5 voies (la sienne comprise) — zone ZA (grande droite (entre les arches))
- **Principe cinématique :** Les 5 patins auto-adaptatifs se posent ensemble : l'art est de tirer quand son propre bolide est déjà passé.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 250 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,072 à 0,203 s** ; probabilité de toucher (tireur familial) : 84 % ; 3,37 bolide(s) frappé(s) en moyenne sur 4. P(victoire) d'un bolide moyen visé : 25 % → 7,9 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,26)). Sortie / arrêt : 0,5 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Patin auto-adaptatif (homologation du 24/10/2026) : bas à 12 mm, juste au-dessus des roues Ø 11 ; spatule à 30° ; un bolide haut fait s'effacer le bras (au-dessus de 41 mm à 61°, effort 0,20 N). Choc sur la carrosserie : masse effective 3,7 g, sans lest.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), patin (PLA) (≈ 18 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL
        ○ axe (z 85)
        ┃ bras 34,5 (s'efface vers le haut : au-dessus de 41 mm à 61°, effort 0,20 N)
   ╱▔▔▔▔▔▔▔▔▔▔╲  patin 32 mm décalé vers l'aval, spatule à 30°, bas à 12 mm
   ▶▶ bolide (toit 12–38 mm) : choc puis frottement sur le toit ▶▶
   ═══════════════════════ fond
```

### 🎲 Pacte du Kamikaze — CRÉATIF  `V3-C1`
- **Rareté Lootbox :** Épique (homologation : DUEL) (calculée : Commun, V = 0,26 — écart signalé)
- **Positionnement sur la piste :** Creux comprimé, voie visée + sa propre voie — zone ZB (ondulée)
- **Principe cinématique :** Le même appui lâche un volet lourd sur la voie visée ET un volet standard sur sa propre voie.
- **Mode d'activation One-Shot :** Servomoteur SG90 + bouton d'arcade, via le DÉCLIC-SERVO : impulsion 250 ms (bornée 150–250 ms par le firmware), tête en place 74 ms après l'appui, retour automatique.
- **Impact mesuré sur la course :** Perte du bolide touché : **0,102 à 0,304 s** ; probabilité de toucher (tireur familial) : 95 % ; son propre volet léger le frappe si les deux bolides sont groupés (86 % des cas, perte 0,074–0,206 s). P(victoire) d'un bolide moyen visé : 25 % → 3,4 % (facteur de cote ×0,30 (plancher du moteur ; valeur brute ×0,10)). Sortie / arrêt : 2,0 % des frappes (taux estimé, saisi dans calcul_v3.py).
- **Sécurité mécanique des bolides :** Volet biais à 20° en lacet, bas à 12 mm : il ne rencontre que la caisse, jamais une roue (Ø 11 mm). Plaque TPU souple : contact de 3 ms, 2,7 N à 2,2 m/s, 3,7 N à l'enveloppe 3 m/s – 55 g (admissible 5,9 N) ; le lest du volet lourd allonge le contact, l'effort de crête reste du même ordre. Poussé vers l'aval, le bras du DÉCLIC s'efface librement de 73° : ni butée rigide, ni blocage, même si la tête tombe sur le bolide.
- **Faisabilité Bambu Lab P1S :** baie (PLA), basculeur (PLA), volet_biais (PLA), volet_plaque (TPU) (≈ 16 g de filament par voie équipée) ; infrastructure partagée : poutre, pied, pupitre ; supports : oui (sous la flasque A de la baie, sous les talons de tête) ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
VUE DE PROFIL (voie, sens de course →)                VUE DE DESSUS (voie 37,5 mm)
   poutre ════════════════════════                     │▌slot 2 mm                     slot 2 mm▐│
            ║ baie   ○ axe servo/basculeur (z 70)       │▌    ╲  volet biais 20°               ▐│
   repos :  ╚══════════● bras 34,5 → aval              │▌     ╲ (largeur utile 23 mm)        ▐│
                        ┆ volet pendu, bas à 52 mm      │▌  ▶▶  ╲                            ▐│
   tir   :          bras ↓ (57 ms)                      │▌ bolide                            ▐│
                     ●━┓ axe libre                      ←──────────── 37,5 mm ────────────→
   bolide ▶▶▶▶     ┃ volet TPU 16 mm, bas à 12 mm  (roues Ø11 : jamais touchées)
   ═════════════════╧═══════════════ fond de voie     poussé vers l'aval, le volet pivote et le BRAS S'EFFACE vers le haut
```

### 🎲 Saboteur Infiltré — CRÉATIF  `V3-C2`
- **Rareté Lootbox :** Rare (règle)
- **Positionnement sur la piste :** Pupitre
- **Principe cinématique :** Vole le bouton d'un piège adverse déjà acheté : c'est le saboteur qui tire, sur la cible choisie par la victime.
- **Mode d'activation One-Shot :** Logiciel (réaffectation du bouton).
- **Impact mesuré sur la course :** Effet de règle (aucune pièce ne touche un bolide).
- **Sécurité mécanique des bolides :** Aucune pièce en contact avec le bolide.
- **Faisabilité Bambu Lab P1S :** aucune pièce propre (≈ 0,0 g de filament par voie équipée) ; infrastructure partagée : pupitre ; supports : non ; jeux 0,30 mm sur pivots, glissières et charnières, patte d'éléphant dégagée (0,6 mm) ; contrôles d'exporter_arcade_v3.py passés.
- **Schéma textuel de fonctionnement :**

```text
PUPITRE D'ARCADE (230 × 110 mm)
   ( 1 )  ( 2 )  ( 3 )  ( 4 )  ( 5 )  ( 6 )   boutons 30 mm à LED     [clé ARM]
   Le bouton s'allume pendant le télégraphe, pour la visée (Œil de Faucon) et reste éteint après le tir.
```


---

## 6. Vetos du Chef d'atelier

| Idée | Motif |
|---|---|
| Roulette de voie (cible tirée au sort) | La manche devient une loterie pour la victime. Le hasard reste admis dans les caisses, pas sur la cible. |
| Porte d'accélération en cours de descente | Ajouter de la vitesse en route impose de frapper l'arrière d'un bolide à plus de 2 m/s : déport et retournement assurés. Seul le départ arrêté est sûr (Départ Canon). |
| Tremplin sans déport | Un saut ne fait jamais gagner de temps sur cette pente (temps de vol, réception). Sur la crête, le bolide décolle déjà tout seul. |
| Piège sur une crête de l'ondulée | Le bolide est en l'air dès 2 mm d'amplitude : la moindre poussée le fait sortir. |
| Butée rigide frontale | Choc de face amorti sur 2 mm : 109 N (45 g à 2,2 m/s) à 248 N (55 g à 3 m/s), soit 11 à 42 fois l'admissible de l'essieu Ø 0,8. |
| Changement de voie ou aiguillage | Les voies sont séparées par des parois : impossible sans percer ni découper la piste. |

---

## 7. Intégration au Grand Prix

- **Rareté des caisses.** Les gammes « Standard » de la mission correspondent à « Commun » dans `LOOTBOX_MATHS.md`. Les épiques et légendaires suivent les garde-fous existants :
  - en caisse seulement ;
  - un seul légendaire par manche ;
  - jamais contre la lanterne rouge ;
  - à partir de la manche 3.

  L'**Onde de Choc** (V = 1,17) entre dans ces règles.
- **Enjeu des DUEL (proposition de règle).** Le joueur mise une prime de duel, 10 pièces conseillées.
  - Si la frappe touche (événement `shot` « TOUCHÉ » sur le rival), il double sa mise.
  - Si le contrecoup le frappe (`contrecoup` avec `touche: 1`) ou si sa frappe est parée (`parade`), la mise va au rival.

  Le pont enregistre ces événements dans le journal ; la régie applique le transfert avec la commande existante `player.coins`.
- **Cotes.** `modele_temps_v3.json` donne, pour chaque carte, l'effet, la perte et la sortie au format de `rules.MODELE_TEMPS`. L'intégrer recalculerait automatiquement le facteur de cote, la rareté et le prix.
  - C'est une **modification de `rules.py`** : elle n'est pas faite, conformément à la règle du projet.
  - Elle est prête à être copiée quand vous le déciderez.
- **Pas d'automatisme passif.** Toutes les cartes actives passent par un appui humain. Le seul effet sans appui est le Bouclier, qui est défensif et n'agit que sur la voie de son propriétaire.

---

## 8. Mise en route

1. **Imprimer.**
   - Les coupons de jeu de l'atelier d'abord (`7_Atelier_P1S_et_Paddocks\stl\v3_coupon_glissiere.stl`), pour confirmer 0,30 mm sur votre bobine.
   - Ensuite `stl\` dans l'ordre de `LISTE_IMPRESSION_V3.csv`.
2. **Mesurer la piste.** Au minimum M1 (largeur de voie), M5 (hauteur de paroi extérieure) et M6 (largeur hors tout), avec les jauges de `12_Piste_Jumeau_et_Pieges_V2`. Relancer ensuite :

   ```text
   py -3 exporter_arcade_v3.py --voie <M1> --largeur <M6>
   ```

3. **Monter le portique.**
   - Pieds en pince sous le fond de piste, serrés à la main.
   - Une baie par voie : SG90 vissé, basculeur sur sa vis M4 (rondelles, écrou bas sans serrer), vis acier dans le chant, aimant dans le linteau, élastique de P à A, tête vissée M2.
   - Balancier : deux lignes tressées du palonnier aux deux bras de la bascule, chacune avec un ressort de traction de 3 N au plus ; `KIND ch BAL` puis `ANG ch repos armé tir rival soi`.
4. **Câbler.**
   - Alimentation séparée des servos, avec son condensateur.
   - Capteurs Sharp dans les berceaux de la poutre, 60 mm en amont.
   - Pupitre.
5. **Téléverser** `firmware\gp_arcade_v3\gp_arcade_v3.ino` (IDE Arduino, carte Mega 2560), puis lancer :

   ```text
   py -3 pont_arcade_v3.py --port COM5 --relais http://localhost:8100
   ```

6. **Régler les angles.**
   - `TEST ch` fait faire un cycle complet à vide.
   - Ajuster `ANG ch repos armé tir` pour que le doigt s'arrête **à 4° du basculeur** à l'armement et le décroche au tir.
   - Valeurs de départ : 10 / 86 / 107.
7. **Calibrer la latence.**
   - Glisser un capteur dans le plan de la tête, puis `TEST ch` : l'événement `cal` donne la latence réelle.
   - La reporter dans `CFG ch 60 <lat_on> <lat_off>` (fichier `cablage_v3.json` ; valeurs calculées de départ : 74 et 40 ms).
8. **S'entraîner.** `BIND b TRAIN ch` : chaque joueur mesure son σ sans que rien ne bouge. Reporter les σ dans `calcul_v3.py` (`HUMAIN`) et relancer le calcul et les fiches.
9. **Habillage TV.**
   - Ouvrir `http://localhost:8110/?fond=noir` sur un écran, ou l'incruster sur fond transparent dans OBS.
   - Pour une répétition sans matériel : `py -3 pont_arcade_v3.py --simu`.

---

## 9. Ce qui reste à mesurer

| Mesure | Pourquoi | Outil |
|---|---|---|
| M1 : largeur de voie (35,0 à 37,5 mm) | Le Bouclier exige ≥ 37,0 ; l'intrusion des lames est réglée sur 3,0 mm. | Jauges de voie V2 |
| M5 et M14 : hauteur de paroi extérieure, épaisseur du fond | Course de serrage des pieds (prévue de 6 à 16 mm). | Pied à coulisse |
| M13 : amplitude de l'ondulée | Charge au creux (2,5 à 4,9 g) et décollage à la crête. | Réglet |
| Vitesse au droit des portiques | `VNOM` et les fenêtres de tir. | 2 capteurs Sharp espacés de 100 mm, ou la vidéo |
| σ des joueurs | Probabilités de toucher, économie. | Mode `TRAIN` |
| Tenue de l'aimant, couple de l'élastique | Latence de 74 ms et absence de déclenchement intempestif. | Secouer, filmer à 240 i/s |
| Pertes en secondes par carte | Valeurs calculées à confirmer (± 50 %). | Chronométrage vidéo sur 5 bolides, puis correction de `calcul_v3.py` |

---

## 10. Fichiers produits

`Noël\00_Lab_Vision_2.0\Edition_23_Decembre\12_Piste_Jumeau_et_Pieges_V2\v3_arcade\`

| Fichier | Rôle |
|---|---|
| `calcul_v3.py` → `CALCULS_V3_SORTIE.md`, `cartes_v3.json`, `modele_temps_v3.json` | Physique, fenêtres, Monte-Carlo des duels et des cartes multivoies, rareté, cotes. |
| `generer_fiches_v3.py` → `FICHES_V3.md`, `assembler_doc_v3.py` | Fiches normalisées (recopiées ici au § 5) et assemblage de ce document. |
| `firmware\gp_arcade_v3\gp_arcade_v3.ino` + `arcade_core.h` | Centrale one-shot (Mega, Uno, Nano). |
| `tests\test_arcade_core.cpp` | 53 vérifications du cœur logique sur PC (g++). |
| `pont_arcade_v3.py`, `cablage_v3.json`, `overlay\overlay_arcade.html` | Pont série, câblage et exemples de BIND, habillage TV. |
| `tests\test_pont.py` | 13 vérifications du pont (faux relais, serveur). |
| `scad\arcade_v3.scad`, `exporter_arcade_v3.py`, `stl\` (19 STL + `LISTE_IMPRESSION_V3.csv`) | Pièces paramétriques et contrôles. |
| `apercus\` | Rendus de l'assemblage du portique. |
| `BANC_DE_TIR_V3.html` | Catalogue interactif des 18 cartes et banc de tir jouable (fenêtre, verdict, précision). |
| `VUE_3D_V3.html` (+ `web\construire_vue3d.py`) | Vue 3D : piste Rainbow Road avec l'ondulée réglable (3 à 8 mm), les 2 portiques et les 18 cartes en démonstration animée ; atelier P1S (16 STL réels sur leur plateau de 256 mm) ; éclaté du DÉCLIC-SERVO ; les 42 objets posés du catalogue (entre les voies, dans la voie, modules, Pont des Pièges, lancés) avec démonstration au ralenti et fiche par objet. |

---

## 11. Sources

- Bambu Lab, P1S : <https://eu.store.bambulab.com/products/p1s> ; règles d'atelier : `7_Atelier_P1S_et_Paddocks\RAPPORT_P1S_ET_GLISSIERE.md`.
- Capteur Sharp GP2Y0D805Z0F, carte Pololu #1132 (portée 0,5 à 5 cm, mise à jour 2,56 ms typique, 3,77 ms au plus) : <https://www.pololu.com/product-info-merged/1132>.
- Servo SG90 : 0,10 s pour 60° et 1,8 kg·cm à 4,8 V (fiche constructeur TowerPro).
- Piste GXX41 : `12_Piste_Jumeau_et_Pieges_V2\BASE_DONNEES_PISTE_GXX41.md` v1.3.1 et `piste_gxx41.json`.
- Modèle de temps, rareté et cotes du Grand Prix : `6_Arsenal_Pieges\MATRICE_PUISSANCE.md`, `BRIEF_3_CAISSES_PHYSIQUE_MODULES.md`.
- Pièges V2 (rainure, vagues) : `12_Piste_Jumeau_et_Pieges_V2\INVENTAIRE_ET_OPTIMISATION_PIEGES_V2.md`.
