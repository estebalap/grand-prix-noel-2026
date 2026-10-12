/* FICHES MOTEURS — la motorisation réelle (ou, pour les véhicules de fiction, celle du véhicule de tournage ou du jouet) de chacun
   des 75 bolides, telle que la synthèse physique (moteurs_physiques.js) la fait sonner. Aucune dépendance (testé sous Node).

   Champs d'un moteur à pistons (type 'piston') :
     archi       'L3' 'L4' 'L5' 'L6' (en ligne), 'V6' (60-65°, manetons décalés : allumage régulier tous les 120°), 'V6T' (V6 turbo 90°
                 de F1), 'V8x' (vilebrequin croisé : intervalles 90-180-270 par banc → le « borborygme » américain), 'V8f' (vilebrequin
                 plat : 180° réguliers par banc → hurlement de course), 'V12' (60° réguliers)
     cyl, cylindree (L), ralenti / rupteur (tr/min), admission 'atmo' | 'turbo' | 'biturbo' | 'compresseur', spool (s, constante
     de montée du turbo), bov 'recirc' (discrète) | 'atmo' (pschitt) | 'flutter' (pompage du compresseur, « stututu »), antiLag,
     ech (type d'échappement de ECHAPPEMENTS + surcharges), double (deux sorties gauche/droite), diesel, boite 'manuelle' |
     'sequentielle' | 'crabots' | 'auto' | 'f1', came (0..1 : croisement d'arbre à cames → ralenti instable), poussoirs 'hydro' | 'meca',
     demarreur 'normal' | 'haute_compression' | 'externe' | 'inertie', inertie (s : réponse du volant moteur), hybride (départ électrique).
   Autres types : 'electrique' (moteurs, paires de pôles, régime max), 'vapeur', 'rotor', 'fauteuil'.
   « recherche » résume la source : la fiche du bolide (cars.json → pedigree) et les données constructeur publiques. */

export const ECHAPPEMENTS = {
  origine: { L: 2.6, g: 0.3, fc: 1300, sport: 0.04, rad: 0.25, collecteur: 260 },
  sport: { L: 2.0, g: 0.36, fc: 2600, sport: 0.3, rad: 0.45, collecteur: 320 },
  course: { L: 1.25, g: 0.4, fc: 6200, sport: 0.65, rad: 0.75, collecteur: 420 },
  ouvert: { L: 0.85, g: 0.28, fc: 4800, sport: 0.55, rad: 0.62, collecteur: 380 },
  vintage: { L: 2.2, g: 0.32, fc: 1900, sport: 0.18, rad: 0.36, collecteur: 280 },
  camion: { L: 3.4, g: 0.38, fc: 850, sport: 0, rad: 0.14, collecteur: 190 },
  f1: { L: 1.05, g: 0.38, fc: 9000, sport: 0.25, rad: 0.85, collecteur: 520 },
};

const P = (o) => ({ type: 'piston', admission: 'atmo', spool: 0.7, bov: null, antiLag: false, ech: 'origine', double: false, diesel: false,
  boite: 'manuelle', came: 0.1, poussoirs: 'hydro', demarreur: 'normal', inertie: 0.12, hybride: false, compresseur: false, ...o });
const V8US = (o) => P({ archi: 'V8x', cyl: 8, ralenti: 650, rupteur: 5200, ech: 'vintage', double: true, came: 0.35, poussoirs: 'meca', inertie: 0.16, ...o });
const F1 = (motoriste, rupteur) => P({ nom: `V6 1,6 L turbo hybride ${motoriste} (F1 2025)`, archi: 'V6T', cyl: 6, cylindree: 1.6, ralenti: 4200, rupteur, admission: 'turbo', spool: 0.12, ech: 'f1', boite: 'f1',
  demarreur: 'externe', inertie: 0.03, came: 0.05, poussoirs: 'meca', mguk: true,
  recherche: `Groupe propulseur F1 2025 ${motoriste} : V6 1,6 L à 90°, turbo unique + MGU-K/MGU-H, débit d'essence plafonné (100 kg/h) : régime utile 10 500-12 000 tr/min (limite réglementaire 15 000), ralenti instable vers 4 000 tr/min, démarreur externe.` });
const ELEC = (o) => ({ type: 'electrique', moteurs: 1, poles: 4, vmax: 16000, dents: 19, ...o });

export const FICHES_MOTEUR = {
  /* ---------- Gotham */
  B01: V8US({ nom: 'Ford FE 390 V8 (Barris 1966)', cylindree: 6.4, rupteur: 5000, recherche: 'Batmobile Barris 1966 sur Lincoln Futura 1955 : V8 Ford d\'environ 300 ch (pedigree) ; vilebrequin croisé, échappements libres de show-car.' }),
  B02: V8US({ nom: 'Chevrolet 350 V8 + turbine de fiction (1989)', cylindree: 5.7, turbine: true, recherche: 'Batmobile 1989 (Anton Furst) sur base Chevrolet Impala : V8 Chevrolet de la voiture de tournage, turbine à l\'avant purement scénique (sifflement ajouté à l\'allumage).' }),
  B03: V8US({ nom: 'Chevrolet 350 V8 + turbine de fiction (1992)', cylindree: 5.7, turbine: true, recherche: 'Batmobile de Batman Returns : même voiture de tournage que 1989 (V8 Chevrolet), turbine scénique ; mode Batmissile.' }),
  B04: V8US({ nom: 'Ford FE 390 V8 (version dessin animé)', cylindree: 6.4, rupteur: 5600, ech: 'ouvert', recherche: 'Variante « Tooned » de la Batmobile 1966 : même V8 Ford, échappement libre exagéré.' }),
  B05: V8US({ nom: 'Cadillac V8 à soupapes latérales 346 ci (1939)', cylindree: 5.7, ralenti: 520, rupteur: 3600, came: 0.05, poussoirs: 'hydro', ech: 'origine', inertie: 0.22, recherche: 'Serial de 1943 : grosse berline civile repeinte (Cadillac de la fin des années 30) ; V8 à soupapes latérales 346 ci, régime bas et feutré.' }),
  B06: V8US({ nom: 'Chevrolet LS3 6,2 L V8 (blindée BvS)', cylindree: 6.2, rupteur: 6200, ech: 'sport', inertie: 0.2, recherche: 'Batmobile de Batman v Superman : voiture de tournage à V8 Chevrolet de 6,2 L ; plus de 3 t (pedigree) → réponse lourde.' }),
  B07: { type: 'rotor', nom: 'Biturbine + rotor quadripale (Batcopter)', pales: 4, rotorTrMin: 390, palesAnticouple: 4, rapportAnticouple: 5.1, turbines: 2,
    recherche: 'Hélicoptère biturbine léger : rotor principal quadripale ≈ 390 tr/min → passage de pale ≈ 26 Hz ; anticouple ≈ 5× plus rapide ; claquement de pales (interaction pale-tourbillon) en charge ; démarrage turbine : démarreur, allumage (« light-off »), montée N1, embrayage du rotor.' },
  B08: V8US({ nom: 'Chevrolet LS3 6,2 L V8 + bourdonnement radioactif', cylindree: 6.2, rupteur: 6200, ech: 'sport', inertie: 0.2, bourdon: 60, recherche: 'Variante BvS (même base que B06) ; lueur verte de fiction → bourdonnement électrique de transformateur ajouté.' }),
  B09: V8US({ nom: 'Chevrolet LS3 6,2 L V8 (armure lourde)', cylindree: 6.2, rupteur: 5800, ech: 'sport', inertie: 0.24, recherche: 'Variante BvS blindée : V8 6,2 L, inertie accrue.' }),
  B10: V8US({ nom: 'Chevrolet LS3 6,2 L V8 (Dawn of Justice)', cylindree: 6.2, rupteur: 6200, ech: 'sport', inertie: 0.2, recherche: 'Variante BvS 2016 (même base que B06) : V8 Chevrolet 6,2 L de la voiture de tournage, échappement sport.' }),
  B11: V8US({ nom: 'Ford 4,6 L Modular V8 (Police Interceptor)', cylindree: 4.6, ralenti: 600, rupteur: 5800, ech: 'origine', came: 0.08, poussoirs: 'hydro', boite: 'auto', recherche: 'Voiture de police américaine type Crown Victoria Police Interceptor : V8 4,6 L SOHC, boîte automatique, silencieux d\'origine.' }),
  B12: V8US({ nom: 'Ford 5,4 L Triton V8 (fourgon)', cylindree: 5.4, ralenti: 620, rupteur: 5000, ech: 'origine', came: 0.08, poussoirs: 'hydro', boite: 'auto', inertie: 0.2, recherche: 'Fourgon de braquage (gamme Ford E-Series) : V8 5,4 L, boîte auto, échappement d\'utilitaire.' }),
  B13: V8US({ nom: 'Chevrolet 350 V8 + turbine de fiction (1995)', cylindree: 5.7, turbine: true, recherche: 'Batmobile de Batman Forever : châssis à V8 Chevrolet 350 de la voiture de tournage, flamme et turbine scéniques.' }),
  B14: V8US({ nom: 'Chevrolet 350 V8 (1997)', cylindree: 5.7, rupteur: 5600, ech: 'sport', recherche: 'Batmobile de Batman & Robin : V8 Chevrolet 350 sur la voiture de tournage.' }),
  B15: V8US({ nom: 'Chevrolet 5,7 L V8 ~500 ch (Tumbler)', cylindree: 5.7, rupteur: 6000, ech: 'ouvert', inertie: 0.18, postcombustion: true, recherche: 'Tumbler de Nolan : ~2,5 t, V8 5,7 L ~500 ch (pedigree), échappement direct ; la « tuyère » est un brûleur de tournage au propane.' }),
  B16: V8US({ nom: 'Chevrolet V8 big-block (The Batman 2022)', cylindree: 6.2, rupteur: 6000, ech: 'ouvert', came: 0.45, recherche: 'Batmobile 2022 : muscle car bricolée, gros V8 Chevrolet à moteur arrière, échappement ouvert, arbre à cames agressif.' }),
  B17: V8US({ nom: 'Chevrolet 350 V8 (character car)', cylindree: 5.7, rupteur: 5800, ech: 'sport', recherche: 'Character Car Hot Wheels de fantaisie : petit V8 Chevrolet de hot rod.' }),
  /* ---------- Japon */
  J01: P({ nom: 'BMW B58 3,0 L 6 en ligne turbo (GR Supra A90)', archi: 'L6', cyl: 6, cylindree: 3.0, ralenti: 700, rupteur: 7000, admission: 'turbo', spool: 0.45, bov: 'recirc', ech: 'sport', double: true, boite: 'auto', recherche: 'GR Supra A90 : B58 3,0 L 6 en ligne, turbo twin-scroll, 335-382 ch (pedigree) ; soupape de décharge recirculée (discrète), crépitements à la décélération.' }),
  J02: P({ nom: 'Toyota 4A-GE 1,6 L 4 en ligne (AE86)', archi: 'L4', cyl: 4, cylindree: 1.6, ralenti: 850, rupteur: 7600, ech: 'sport', came: 0.2, inertie: 0.07, admission: 'atmo', papillons: true, recherche: 'AE86 : 4A-GE 1,6 L 16 soupapes 130 ch (pedigree), régime haut, admission rauque (souvent papillons individuels en préparation Initial D).' }),
  J04: P({ nom: 'Toyota 2,2 L 4 en ligne sous le siège (Van 1986)', archi: 'L4', cyl: 4, cylindree: 2.2, ralenti: 750, rupteur: 5400, ech: 'origine', inertie: 0.15, boite: 'auto', recherche: 'Toyota Van 1984-89 : 2,0 L puis 2,2 L 102 ch (pedigree), moteur central sous les sièges avant.' }),
  J05: P({ nom: 'Honda CVCC 1,5 L 4 en ligne (Civic 1973)', archi: 'L4', cyl: 4, cylindree: 1.5, ralenti: 800, rupteur: 6800, ech: 'sport', inertie: 0.08, recherche: 'Civic 1re génération, moteur CVCC à chambre de précombustion (pedigree) ; casting custom hommage à Ryu Asada → échappement sport.' }),
  J07: P({ nom: 'Mazda B6ZE 1,6 L 4 en ligne (MX-5 NA)', archi: 'L4', cyl: 4, cylindree: 1.6, ralenti: 850, rupteur: 7200, ech: 'origine', inertie: 0.08, recherche: 'MX-5 NA : 1,6 L 116 ch (pedigree), 4 cylindres léger et vif.' }),
  J08: P({ nom: 'Mazda B6ZE 1,6 L + kit turbo (MX-5 Custom Turbo)', archi: 'L4', cyl: 4, cylindree: 1.6, ralenti: 850, rupteur: 7200, admission: 'turbo', spool: 0.55, bov: 'atmo', ech: 'sport', inertie: 0.08, recherche: 'MX-5 NA avec kit turbo (+40 à +100 ch, pedigree) : soupape de décharge à l\'air libre.' }),
  J09: ELEC({ nom: 'Kia EV6 GT : 2 moteurs synchrones (430 kW)', moteurs: 2, vmax: 21000, recherche: 'EV6 GT : deux moteurs, 430 kW / 585 ch, 740 N·m (pedigree) ; sifflement d\'onduleur et de réducteur.' }),
  J10: P({ nom: 'Nissan S20 2,0 L 6 en ligne 24 soupapes (Hakosuka GT-R)', archi: 'L6', cyl: 6, cylindree: 2.0, ralenti: 1000, rupteur: 8000, ech: 'course', came: 0.4, poussoirs: 'meca', papillons: true, inertie: 0.07, recherche: 'KPGC10 : S20 2,0 L DOHC 24 soupapes 160 ch (pedigree), dérivé du moteur de course Prince R380, trois carburateurs double corps.' }),
  J11: P({ nom: 'Nissan RB26DETT 2,6 L 6 en ligne biturbo (R33 GT-R)', archi: 'L6', cyl: 6, cylindree: 2.6, ralenti: 950, rupteur: 8000, admission: 'biturbo', spool: 0.5, bov: 'atmo', antiLag: true, ech: 'sport', poussoirs: 'meca', papillons: true, inertie: 0.09, boite: 'sequentielle',
    recherche: 'R33 GT-R : RB26DETT 2,6 L 6 en ligne DOHC, alésage 86 × course 73,7 mm (super-carré, fait pour tourner haut), compression 8,5:1, deux turbos à roues céramique, poussoirs mécaniques bruyants (drifted.com) ; 280 ch officiels (pedigree). Préparation « Godzilla » : décharge à l\'air libre, anti-lag.' }),
  J12: P({ nom: 'Nissan RB20DET 2,0 L 6 en ligne turbo (Laurel C33)', archi: 'L6', cyl: 6, cylindree: 2.0, ralenti: 750, rupteur: 7000, admission: 'turbo', spool: 0.6, bov: 'atmo', ech: 'sport', boite: 'auto', recherche: 'Laurel C33 : RB20DET ~210 ch (pedigree), style kaido : échappement à gros diamètre.' }),
  /* ---------- USA */
  U01: ELEC({ nom: 'Ford Mustang Mach-E 1400 : 7 moteurs électriques', moteurs: 7, vmax: 18000, recherche: 'Prototype Ford Performance × RTR : 7 moteurs (3 avant, 4 arrière), 1 400 ch (pedigree) → 7 sifflements désaccordés.' }),
  U02: P({ nom: 'Ford 2,3 L Lima turbo (Mustang SVO)', archi: 'L4', cyl: 4, cylindree: 2.3, ralenti: 750, rupteur: 6000, admission: 'turbo', spool: 0.8, bov: 'flutter', ech: 'sport', recherche: 'Mustang SVO 1984-86 : 2,3 L turbo 175-205 ch (pedigree), turbo des années 80 lent à charger.' }),
  U03: V8US({ nom: 'Pontiac 400 ci 6,6 L V8 (Trans Am 77)', cylindree: 6.6, rupteur: 4800, ech: 'origine', came: 0.2, boite: 'auto', recherche: 'Trans Am 1977 : V8 Pontiac 6,6 L 180-200 ch (pedigree), couple bas, boîte auto.' }),
  U04: V8US({ nom: 'Chevrolet small-block 5,7 L (Silverado 83)', cylindree: 5.7, ralenti: 600, rupteur: 4600, ech: 'origine', came: 0.15, inertie: 0.2, boite: 'auto', recherche: 'Squarebody C/K : V8 5,0-5,7 L 130-175 ch (pedigree), pickup fatigué : poussoirs qui claquent.' }),
  U05: V8US({ nom: 'Chrysler 426 Hemi 7,0 L (Challenger 1970)', cylindree: 7.0, ralenti: 800, rupteur: 6000, ech: 'sport', came: 0.55, poussoirs: 'meca', inertie: 0.15, recherche: 'Challenger R/T 426 Hemi : ~425 ch SAE (pedigree), arbre à cames à fort croisement, poussoirs mécaniques, deux carburateurs quadruple corps.' }),
  /* ---------- Europe */
  E02: P({ nom: 'Lamborghini L539 6,5 L V12 atmosphérique (Centenario)', archi: 'V12', cyl: 12, cylindree: 6.5, ralenti: 950, rupteur: 8600, ech: 'sport', double: true, boite: 'sequentielle', inertie: 0.06, poussoirs: 'meca', recherche: 'Centenario : V12 6,5 L 770 ch, 350 km/h (pedigree) ; allumage régulier tous les 60° → plainte continue.' }),
  E03: P({ nom: 'Bentley 4,0 L V8 biturbo (Continental GT3)', archi: 'V8x', cyl: 8, cylindree: 4.0, ralenti: 1100, rupteur: 7500, admission: 'biturbo', spool: 0.3, bov: 'atmo', antiLag: true, ech: 'course', double: true, boite: 'sequentielle', inertie: 0.06, recherche: 'Continental GT3 2018-2021 : V8 4,0 L biturbo ~550 ch (pedigree), échappements latéraux de course, boîte séquentielle Xtrac.' }),
  E04: P({ nom: 'Ford Cosworth DFV 3,0 L V8 à vilebrequin plat (Lotus 49)', archi: 'V8f', cyl: 8, cylindree: 3.0, ralenti: 3000, rupteur: 10000, ech: 'course', double: true, boite: 'crabots', inertie: 0.04, poussoirs: 'meca', demarreur: 'externe', recherche: 'Lotus 49 : Cosworth DFV 3,0 L V8 420-440 ch, 501 kg (pedigree) ; vilebrequin plat, 8 trompettes d\'admission, boîte Hewland à crabots.' }),
  E05: P({ nom: 'Lotus-Ford Twin-Cam 1,6 L (Lotus Cortina)', archi: 'L4', cyl: 4, cylindree: 1.6, ralenti: 950, rupteur: 6800, ech: 'vintage', papillons: true, inertie: 0.09, recherche: 'Lotus Cortina : Twin-Cam 1,6 L 105 ch (pedigree), deux carburateurs Weber double corps.' }),
  E06: ELEC({ nom: 'Cupra e-Racer : 4 moteurs (500 kW crête)', moteurs: 4, vmax: 20000, recherche: 'Cupra e-Racer (Pure ETCR) : 4 moteurs, 500 kW crête (pedigree).' }),
  E07: P({ nom: 'Volvo B230FT 2,3 L turbo (240 Drift Wagon)', archi: 'L4', cyl: 4, cylindree: 2.3, ralenti: 850, rupteur: 6800, admission: 'turbo', spool: 0.9, bov: 'flutter', antiLag: true, ech: 'ouvert', recherche: 'Volvo 240 de drift : 4 cylindres « redblock » B230 turbo, gros turbo, pompage du compresseur, anti-lag de drift.' }),
  E08: P({ nom: 'Volvo/Ford 2,5 L 5 cylindres turbo (Focus ST)', archi: 'L5', cyl: 5, cylindree: 2.5, ralenti: 750, rupteur: 6800, admission: 'turbo', spool: 0.55, bov: 'recirc', ech: 'sport', recherche: 'Focus ST 2008 : 2,5 L 5 cylindres turbo d\'origine Volvo, 225 ch (pedigree) ; allumage tous les 144° → le fameux grondement « warble ».' }),
  P01: V8US({ nom: 'Pontiac 305 V8 + turbo boost (K.I.T.T. Concept)', cylindree: 5.0, rupteur: 5800, ech: 'sport', turbine: true, recherche: 'K.I.T.T. d\'origine sur Pontiac Trans Am 1982 (V8 5,0 L) ; « Turbo Boost » de fiction → sifflement de turbine ajouté.' }),
  P03: V8US({ nom: 'V8 de corbillard (Ghoul Mobile)', cylindree: 6.0, ralenti: 560, rupteur: 4800, ech: 'vintage', came: 0.3, recherche: 'Monster High Ghoul Mobile : véhicule de fiction, choisi en V8 américain lent de corbillard (aucun modèle réel, pedigree).' }),
  P04: ELEC({ nom: 'Barbie Extra : moteur électrique (base Fiat 500e)', moteurs: 1, vmax: 13000, recherche: 'Barbie Extra grandeur nature construite sur Fiat 500e électrique (LA Auto Show, pedigree).' }),
  /* ---------- H (fiction Hot Wheels) */
  H01: { type: 'fauteuil', nom: 'Fauteuil WCMX : cadre titane, suspension aux 4 roues, assistance brushless (fiction)',
    recherche: 'Aaron « Wheelz » Fotheringham roule sur un fauteuil WCMX Box Wheelchairs léger à suspension sur les quatre roues, « pratiquement indestructible » (Wikipédia). Le fauteuil réel est à propulsion manuelle : poussées sur les mains courantes, roulements, amortisseurs ; l\'assistance électrique brushless est la part de fiction du « Protocole Hawking ».' },
  H02: V8US({ nom: 'V8 à compresseur Roots (Track Dwagon)', cylindree: 6.0, rupteur: 6200, ech: 'ouvert', compresseur: true, came: 0.5, recherche: 'Track Dwagon : fantaisie Hot Wheels sans équivalent réel (pedigree), choisie en hot rod V8 à compresseur volumétrique (sifflement de Roots).' }),
  H03: V8US({ nom: 'V8 à compresseur Roots, flammes (Track Dwagon flammé)', cylindree: 6.0, rupteur: 6400, ech: 'ouvert', compresseur: true, came: 0.55, postcombustion: true, recherche: 'Même casting que H02 (variante flammée) : V8 à compresseur, retours de flamme.' }),
  H04: V8US({ nom: 'V8 tout-terrain (HW Ravenger)', cylindree: 6.2, rupteur: 5600, ech: 'ouvert', came: 0.4, inertie: 0.18, recherche: 'Ravenger : véhicule off-road de fantaisie (pedigree), choisi en V8 de buggy de désert.' }),
  H05: P({ nom: '660 cm³ 3 cylindres turbo (Kei Swap)', archi: 'L3', cyl: 3, cylindree: 0.66, ralenti: 950, rupteur: 9000, admission: 'turbo', spool: 0.35, bov: 'atmo', ech: 'sport', inertie: 0.05, recherche: 'Règle kei car : ≤ 660 cm³, ≤ 64 ch (pedigree) ; 3 cylindres turbo type Suzuki K6A, allumage tous les 240°.' }),
  H06: P({ nom: 'GM 2,5 L « Iron Duke » 4 cylindres (Grumman LLV)', archi: 'L4', cyl: 4, cylindree: 2.5, ralenti: 700, rupteur: 4600, ech: 'origine', inertie: 0.16, boite: 'auto', poussoirs: 'hydro', recherche: 'Grumman LLV 1987-94 : 2,5 L ~90 ch (pedigree), boîte auto 3 rapports, moteur poussif.' }),
  H07: P({ nom: 'Diesel 6 en ligne turbo 14 L + frein moteur (Heavyweights)', archi: 'L6', cyl: 6, cylindree: 14, ralenti: 600, rupteur: 2100, admission: 'turbo', spool: 1.1, ech: 'camion', diesel: true, freinMoteur: true, inertie: 0.35, boite: 'manuelle', demarreur: 'haute_compression', recherche: 'Tracteur routier : diesel 6 en ligne ~14 L turbo (type Cummins N14), régime maxi ~2 100 tr/min, frein moteur à décompression (« Jake brake ») qui aboie au lever de pied.' }),
  H08: P({ nom: 'Nissan TD27 2,7 L diesel (Cockney Cab / FX4)', archi: 'L4', cyl: 4, cylindree: 2.7, ralenti: 750, rupteur: 4300, ech: 'origine', diesel: true, inertie: 0.18, boite: 'auto', recherche: 'Taxi londonien Austin FX4 (pedigree) : dernières séries en diesel Nissan TD27 2,7 L ; claquement d\'injection caractéristique.' }),
  H09: P({ nom: 'Suzuki 660 cm³ 3 cylindres (Mighty K kei truck)', archi: 'L3', cyl: 3, cylindree: 0.66, ralenti: 900, rupteur: 7800, ech: 'sport', inertie: 0.05, recherche: 'Mighty K : kei truck modifié (pedigree) ; 3 cylindres 660 cm³ atmosphérique.' }),
  H10: P({ nom: 'Ferrari Dino 2,4 L V6 65° 24 soupapes (Rally Speciale / Stratos Gr.4)', archi: 'V6', cyl: 6, cylindree: 2.4, ralenti: 1100, rupteur: 8400, ech: 'course', double: false, boite: 'crabots', demarreur: 'haute_compression', papillons: true, poussoirs: 'meca', inertie: 0.06, came: 0.35,
    recherche: 'Casting Rally Speciale : rallye italien des années 70 à moteur central, d\'après la Lancia Stratos (pedigree). Stratos Groupe 4 : V6 Ferrari Dino 2,4 L, 275 ch en 12 soupapes, 320 ch en 24 soupapes, puissance maxi vers 7 800 tr/min (supercars.net) ; carburateurs Weber, boîte de course à crabots, démarreur qui peine sur une compression de course.' }),
  H11: V8US({ nom: 'Chevrolet small-block 265 ci (1955)', cylindree: 4.3, rupteur: 6200, ech: 'ouvert', came: 0.5, recherche: 'Small Bloc : hommage au V8 Chevrolet small-block de 1955 (pedigree), hot rod à cames pointues.' }),
  H12: { type: 'vapeur', nom: 'Pacific 231 compound à 4 cylindres (de Glehn)', roues: 1.95, cylindres: 4, compound: true,
    recherche: 'Locomotive Pacific 231 (type 231 C Nord) : compound à quatre cylindres avec surchauffe, deux haute pression entre les longerons et deux basse pression à l\'extérieur (techno-science.net) ; l\'échappement ne sort que des basse pression → 4 coups par tour de roue, comme une machine à 2 cylindres à double effet (trains.com). Roues motrices de 1,95 m ; purgeurs ouverts au démarrage, pompe à air Westinghouse, sifflet.' },
  /* ---------- F1 2025 */
  F01: F1('Mercedes-AMG M16', 11800), F02: F1('Honda RBPT', 11900), F03: F1('Ferrari 066/12', 11700), F04: F1('Mercedes-AMG M16', 11800),
  F05: F1('Mercedes-AMG M16', 11700), F06: F1('Renault E-Tech RE25', 11500), F07: F1('Mercedes-AMG M16', 11800), F08: F1('Honda RBPT', 11900),
  F09: F1('Ferrari 066/12', 11700), F10: F1('Ferrari 066/12', 11700),
  /* ---------- France */
  FR01: P({ nom: 'PSA 1,6 THP + 2 moteurs électriques (DS 7 E-Tense 4x4)', archi: 'L4', cyl: 4, cylindree: 1.6, ralenti: 800, rupteur: 6200, admission: 'turbo', spool: 0.5, bov: 'recirc', hybride: true, boite: 'auto', recherche: 'DS 7 Crossback Élysée (cabriolet présidentiel 2017) : prototype de la chaîne E-Tense 4x4 (1,6 L turbo + 2 moteurs électriques) → départ électrique silencieux, puis le 4 cylindres prend le relais.' }),
  FR02: P({ nom: 'Renault M5P 1,8 L TCe turbo 300 ch (Mégane R.S. Trophy)', archi: 'L4', cyl: 4, cylindree: 1.8, ralenti: 800, rupteur: 6800, admission: 'turbo', spool: 0.4, bov: 'recirc', ech: 'sport', recherche: 'Mégane R.S. Trophy : 1,8 L 300 ch (pedigree), échappement Akrapovič à clapets, crépitements au lever de pied.' }),
  FR03: P({ nom: 'Citroën 2,1 L 4 cylindres (DS 21 Pallas) + hydropneumatique', archi: 'L4', cyl: 4, cylindree: 2.1, ralenti: 650, rupteur: 5500, ech: 'origine', inertie: 0.18, hydropneumatique: true, recherche: 'DS 21 Pallas : 2,1 L ~100 ch (pedigree) ; suspension hydropneumatique (Paul Magès) : la caisse se lève au démarrage, sifflement de la pompe haute pression.' }),
  FR04: P({ nom: 'Renault Cléon 1,4 L turbo Garrett (R5 Turbo)', archi: 'L4', cyl: 4, cylindree: 1.4, ralenti: 900, rupteur: 7000, admission: 'turbo', spool: 1.4, bov: 'flutter', ech: 'sport', inertie: 0.07, recherche: 'R5 Turbo (1980) : 1 397 cm³ turbo 160 ch (pedigree), turbo sans intercooler à gros temps de réponse, typique du Groupe B.' }),
  FR05: P({ nom: 'PSA 1,6 PureTech + moteur électrique 81 kW (DS 4 E-Tense)', archi: 'L4', cyl: 4, cylindree: 1.6, ralenti: 800, rupteur: 6000, admission: 'turbo', spool: 0.5, bov: 'recirc', hybride: true, boite: 'auto', recherche: 'DS 4 E-Tense 225 : 1,6 L essence + 81 kW électrique, ~50 km en électrique (pedigree).' }),
  /* ---------- Tomica */
  TK01: P({ nom: 'Mitsubishi G54B 2,6 L turbo (Starion)', archi: 'L4', cyl: 4, cylindree: 2.6, ralenti: 750, rupteur: 6000, admission: 'turbo', spool: 0.9, bov: 'flutter', ech: 'sport', recherche: 'Starion : 2,0-2,6 L turbo 143-197 ch (pedigree) ; gros 4 cylindres à arbres d\'équilibrage.' }),
  TK02: P({ nom: 'Nissan FJ20ET 2,0 L turbo (Skyline R30 « Tekkamen »)', archi: 'L4', cyl: 4, cylindree: 2.0, ralenti: 850, rupteur: 7000, admission: 'turbo', spool: 0.75, bov: 'atmo', ech: 'sport', poussoirs: 'meca', recherche: 'Skyline R30 RS Turbo : FJ20ET 2,0 L DOHC 190 ch (205 ch intercooler, pedigree).' }),
  TK03: P({ nom: 'Mercedes M102 2,5 L 16 soupapes Cosworth (190E Evo II)', archi: 'L4', cyl: 4, cylindree: 2.5, ralenti: 850, rupteur: 7700, ech: 'course', boite: 'sequentielle', poussoirs: 'meca', inertie: 0.06, papillons: true, recherche: '190E 2.5-16 Evolution II : 2,5 L culasse Cosworth 235 ch (pedigree) ; version DTM à boîte séquentielle.' }),
  TK04: V8US({ nom: 'Pontiac 400 ci 6,6 L V8 (Trans Am 77 « Bandit »)', cylindree: 6.6, rupteur: 5000, ech: 'sport', came: 0.3, boite: 'manuelle', recherche: 'Trans Am 1977 de Smokey and the Bandit : V8 Pontiac 6,6 L ~200 ch (pedigree), boîte manuelle.' }),
  TK05: P({ nom: 'Diesel 4 cylindres turbo de minibus (Pikachu Car)', archi: 'L4', cyl: 4, cylindree: 4.0, ralenti: 650, rupteur: 3200, admission: 'turbo', spool: 0.9, diesel: true, ech: 'camion', boite: 'auto', inertie: 0.25, recherche: 'Bus de l\'émission « Pokémon to Doko Iku » (pedigree) : minibus japonais à diesel 4 cylindres turbo.' }),
  TK06: P({ nom: 'Mercedes-AMG M159 6,2 L V8 atmosphérique (AMG GT3)', archi: 'V8x', cyl: 8, cylindree: 6.2, ralenti: 1200, rupteur: 7400, ech: 'course', double: true, boite: 'sequentielle', poussoirs: 'meca', came: 0.3, inertie: 0.07, pignonsDroits: true,
    recherche: 'AMG GT3 de Good Smile Racing (Super GT GT300, pedigree) : V8 6,2 L ATMOSPHÉRIQUE repris de la SLS AMG GT3, sans turbo (jalopnik.com) ; vilebrequin croisé, sorties latérales, boîte séquentielle à pignons droits (sifflement). Ce n\'est donc PAS un moteur JDM turbo : il gronde et hurle, il ne siffle pas.' }),
};

/** Fiche d'un bolide, ou null (le contrôle exige les 75). */
export function ficheMoteur(code) { return FICHES_MOTEUR[code] || null; }

/** Type de rendu (pour la régie et le rapport de capture) : « v8x atmo », « l6 biturbo », « vapeur »… */
export function signatureMoteur(f) {
  if (!f) return 'aucun';
  if (f.type !== 'piston') return f.type;
  return `${f.archi.toLowerCase()} ${f.admission}${f.diesel ? ' diesel' : ''}${f.hybride ? ' hybride' : ''}`;
}
