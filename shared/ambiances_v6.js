/* AMBIANCES V6 — étalonnage chromatique et cadrages caméra par bolide, SANS nouvelle géométrie.

   Les 6 décors de base (Gotham, Tokyo, canyon, studio pop, gare, avant-première) restent les mêmes. Chaque bolide qui partage un
   univers reçoit ici sa propre « gélatine » de projecteurs : couleurs des lumières de décor (clé + contre-jour), brouillard (teinte et
   densité), dominante du ciel, halos / faisceaux / pluie, teinte des façades et reflets du sol laqué. Même géométrie, autre plateau.

   Les bolides à décor unique V5 (decors_v5.js) n'ont pas d'entrée : leur plateau est déjà le leur. TOUS les autres (52 bolides
   sur 6 fonds partagés, plus les 11 nouveaux N01-N11 de la V8) ont une gélatine ET un cadrage qui leur sont propres.

   CADRAGES : angle de vue par personnage, appliqué au travelling final ET à l'arrêt sur image héroïque (reveal_fret.js).
     azimut   angle horizontal autour du bolide, en degrés depuis l'axe avant (+x) vers la caméra ; défaut 48,65° (3/4 avant historique)
     camY     hauteur de l'objectif au-dessus du sol (m de scène) ; défaut : moitié de la hauteur du centre du bolide
     cibleY   hauteur visée, en fraction du centre du bolide (1 = centre) : > 1 = contre-plongée, < 1 = plongée
     roulis   inclinaison de l'horizon en radians (Dutch angle) ; défaut 0,09
     fov      focale verticale en degrés ; défaut 30 (plus petit = téléobjectif, plus écrasé)
     recul    multiplicateur de distance (le bolide reste entier : la distance part toujours de la sphère englobante)
     travelling { y, cibleY, roulis } : fin du travelling d'arrivée (avant l'arrêt sur image) ; y et cibleY en mètres de scène,
              roulis atteint progressivement pendant le travelling
     Mise au cadre (reveal_fret.js) : la caméra part de près et recule par pas de 4 % jusqu'à ce que le bolide ENTIER tienne dans
              la moitié droite de l'image (la fiche occupe la gauche), quel que soit l'angle — « recul » n'est plus qu'un indicatif.

   Tout est déterministe : deux captures donnent la même image. Aucune marque, aucun personnage : des couleurs et des angles. */

/** Utilitaires couleur (hex '#rrggbb' ↔ [r, g, b] 0–1), sans dépendre de THREE. */
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
const melange = (a, b, k) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * k));
const assombrir = (a, k) => hex(rgb(a).map((v) => v * k));

/** Ambiance : [lumière clé, contre-jour], brouillard [teinte, densité], options. f = force de la gélatine sur halos/faisceaux (0–1). */
const A = (nom, cle, contre, brume, densite, o = {}) => Object.freeze({ nom, lumieres: [cle, contre], brouillard: { couleur: brume, densite }, f: 0.75, facades: 0.45, ...o });

export const AMBIANCES = Object.freeze({
  /* ---------------- GOTHAM (16 Batmobiles) : une gélatine par époque / par personnage ---------------- */
  B02: A('Gotham 1989 · art déco ambré', '#ffb347', '#3a6dff', '#15110b', 0.015),
  B03: A('Gotham 1992 · Noël sous la neige', '#e8e1ff', '#c21f3a', '#1b1a24', 0.017, { pluie: '#f4f6ff' }),
  B04: A('Gotham animée · ciel rouge de dessin animé', '#ff5f3a', '#7f3fbf', '#2a0c10', 0.012),
  B05: A('Gotham 1943 · sépia de serial', '#f2e6c8', '#a08060', '#1c1812', 0.014, { facades: 0.7 }),
  B06: A('Gotham 2016 · acier bleu', '#d8ecff', '#3a7bff', '#121c2c', 0.0105, { f: 0.85 }),   // bleu acier franc : lisible en bichromie
  B07: A('Gotham · projecteurs d\'hélicoptère', '#ffffff', '#ff2a2a', '#101216', 0.011),
  B08: A('Gotham · lueur cristalline', '#b6ff00', '#00ffc8', '#0f1d0a', 0.016),
  B09: A('Gotham · lampadaires au sodium', '#ff9a2e', '#2b6cff', '#1a1208', 0.017),
  B10: A('Gotham · aube dorée', '#e8c27a', '#5f7d9c', '#151410', 0.013),
  B11: A('Gotham · alerte générale', '#ff1e3c', '#1e64ff', '#120c18', 0.013),
  B12: A('Gotham toxique', '#1aff59', '#9d00ff', '#122a18', 0.019, { f: 0.95, facades: 0.62, sol: '#1a0f2c', reflet: '#1aff59', ciel: { haut: '#07020f', milieu: '#2a0a4a', bas: '#0f4a20' }, pluie: '#b8ffcf' }),
  B13: A('Gotham 1995 · néons ultraviolets', '#b26bff', '#ff7a00', '#160b22', 0.012),
  B14: A('Gotham 1997 · gel cryogénique', '#00b7ff', '#d0f4ff', '#0a1a26', 0.018, { pluie: '#d8f6ff' }),
  B15: A('Gotham · tungstène et béton', '#ffcf8a', '#4a5a6a', '#16130e', 0.015),
  B16: A('Gotham 2022 · pluie rouge', '#ff2a14', '#ffb36b', '#1d0a07', 0.02),
  B17: A('Gotham acidulée', '#ff007f', '#00f0ff', '#1e0a22', 0.012, { f: 0.95, facades: 0.58, sol: '#200a24', reflet: '#00f0ff', ciel: { haut: '#0a0214', milieu: '#4a0a3a', bas: '#0a6a7a' }, pluie: '#ffc2e6' }),

  /* ---------------- GARE (Belle-Époque) ---------------- */
  B01: A('Gare · plateau télé 1966', '#ff3fa4', '#ffe14d', '#2a1e2e', 0.008, { facades: 0.3 }),
  E04: A('Gare · paddock 1967 or et rouge', '#ffd27a', '#c8102e', '#2a1a12', 0.009),
  E05: A('Gare · rallye anglais vert et crème', '#f4f0e0', '#2d8a4e', '#1e2a20', 0.009),
  H12: A('Gare · grève aux fumigènes rouges', '#ff3b2f', '#fff1cf', '#2a1410', 0.011),

  /* ---------------- TOKYO (manga) ---------------- */
  J01: A('Tokyo · orange de piste', '#ff8a00', '#1e90ff', '#1d1030', 0.0105),
  J02: A('Tokyo · col de montagne à l\'aube', '#e8f0ff', '#ffcc33', '#141a2a', 0.014),
  J04: A('Tokyo · gilets jaunes sous la pluie', '#ffe600', '#8a8f99', '#1c1a12', 0.012),
  J05: A('Tokyo 1973 · néons ambrés', '#ff9a3c', '#c46a2b', '#21140c', 0.011),
  J07: A('Tokyo · cerisiers de nuit', '#ff4d6d', '#ffd6e0', '#2a0f1c', 0.010),
  J08: A('Tokyo · zone rouge turbo', '#ff2a2a', '#ffae00', '#260a0a', 0.011),
  J09: A('Tokyo · haute tension', '#00ffd0', '#5a7dff', '#071c22', 0.011),
  J10: A('Tokyo 1972 · sodium et jade', '#ffb000', '#00a86b', '#1c1608', 0.012),
  J11: A('Tokyo · souffle atomique', '#3fa9ff', '#ff3d00', '#0a1428', 0.013),
  J12: A('Tokyo · salon VIP', '#a855f7', '#ffd166', '#1a0c2a', 0.010),
  H02: A('Tokyo · nouvel an lunaire', '#ff2a1a', '#ffc400', '#2a0c08', 0.011),
  H05: A('Tokyo · flash de radar', '#ff004c', '#ffd400', '#22061a', 0.011),
  H09: A('Tokyo · salle d\'arcade', '#7cff6b', '#ff6bd6', '#14201a', 0.010),
  TK01: A('Tokyo · synthwave 1983', '#ff2e97', '#2de2e6', '#1a0a2a', 0.010),
  TK02: A('Tokyo · armure spatiale', '#00d4ff', '#ff3030', '#08142a', 0.011),
  TK04: A('Tokyo · cyberpunk jaune et cyan', '#fcee0a', '#00f0ff', '#0c1a1a', 0.012, { facades: 0.55 }),
  TK06: A('Tokyo · concert holographique', '#39c5bb', '#ff7ad9', '#0c1e22', 0.010),

  /* ---------------- CANYON (post-apo) ---------------- */
  U01: A('Canyon · orage électrique', '#2b8cff', '#e0f0ff', '#15202e', 0.010),
  U02: A('Canyon · chaleur et ciel de glace', '#ff3b1f', '#3bd6ff', '#3a1a10', 0.0095),
  U03: A('Canyon · or noir', '#ffbf00', '#ff4500', '#2a1606', 0.010),
  U05: A('Canyon · point de fuite blanc', '#fff1c1', '#ff5a1f', '#4a2a14', 0.008),
  E07: A('Canyon · hiver nordique', '#c8e6ff', '#ffb347', '#2a3038', 0.011),
  E08: A('Canyon · rond-point en feu', '#ffd400', '#ff7b00', '#3a2408', 0.0105),
  H01: A('Canyon · nuit cosmique', '#7b5cff', '#ffcf8f', '#1a1430', 0.009),
  H03: A('Canyon · brasier', '#ff2200', '#ff9500', '#3a0e04', 0.011),
  H04: A('Canyon · garage clandestin', '#9aa3ad', '#ff3030', '#1e1e22', 0.012),
  H06: A('Canyon · courrier jaune et bleu', '#ffcc00', '#2b4fff', '#2a2410', 0.0095),

  /* ---------------- AVANT-PREMIÈRE (blockbuster) ---------------- */
  E02: A('Avant-première · lime et orange', '#c0ff00', '#ff8a00', '#101a06', 0.009),
  E03: A('Avant-première · vert anglais et argent', '#1fa35a', '#e6e6e6', '#081a10', 0.009),
  P01: A('Avant-première · balayage rouge', '#ff1a1a', '#6a8cff', '#1a0608', 0.010),
  H10: A('Avant-première · tricolore', '#2b4cff', '#ff2b3a', '#0c0f24', 0.0085),

  /* ---------------- STUDIO POP ---------------- */
  H11: A('Studio · sauce fromagère et piment', '#ffcf3a', '#ff5a2b', '#ffd0a0', 0.0055, { facades: 0.3 }),

  /* ---------------- V8 : nouveaux bolides de l'atelier photo (15 oct. 2026) ---------------- */
  N07: A('Gotham · quais gelés du Pingouin', '#9fd8ff', '#7a4dff', '#0e1626', 0.016, { pluie: '#e6f4ff' }),
  N08: A('Gotham · casse à la lueur dorée', '#ffc94a', '#5a5f6e', '#120f0a', 0.013, { f: 0.9 }),
  N09: A('Gotham · miroir rouge et blanc', '#ffffff', '#ff1f2e', '#14080a', 0.012, { f: 0.9, reflet: '#ff1f2e' }),
  N10: A('Gotham · fumée verte de compresseur', '#c6ff3a', '#7a2bd6', '#140c1e', 0.018),
  N06: A('Gare · Route 66 au crépuscule', '#ffb066', '#2e8a6a', '#2a1a14', 0.009),
  N03: A('Tokyo · col de nuit rose et cyan', '#ff5fb4', '#6fd2ff', '#0e1222', 0.013),
  N05: A('Tokyo · VTC kaki sous les néons verts', '#b5ff5a', '#ff9e3d', '#141a0c', 0.011),
  N01: A('Avant-première · gyrophares rouge et bleu', '#ff2a3d', '#2a6bff', '#0e0a18', 0.010, { f: 0.95 }),
  N04: A('Avant-première · circuit bleu ciel et rose', '#5ab4ff', '#ff4fa3', '#0a1426', 0.009),
  N11: A('Avant-première · aube héroïque bleu et rouge', '#3a7bff', '#ffd23f', '#0a1024', 0.009, { f: 0.9 }),
  N02: A('Studio · goûter violet et rose', '#c77dff', '#ff7ad9', '#f0d6ff', 0.0055, { facades: 0.3 }),
});

/** Fabrique de cadrage compacte. */
const C = (nom, azimut, camY, cibleY, roulis, fov, [y, cY, r]) => Object.freeze({ nom, azimut, camY, cibleY, roulis, fov, recul: 1.0, travelling: { y, cibleY: cY, roulis: r } });

/** Cadrages par personnage : TOUS les bolides qui partagent un fond (Gotham, gare, Tokyo, canyon, avant-première, studio) en ont un.
 *  Les bolides à décor unique V5 gardent le cadrage héroïque standard (3/4 avant, légère contre-plongée). */
export const CADRAGES = Object.freeze({
  B12: Object.freeze({ nom: 'Dutch angle théâtral en contre-plongée', azimut: 30, camY: 0.14, cibleY: 1.45, roulis: 0.28, fov: 33, recul: 1.0,
    travelling: { y: 0.55, cibleY: 2.2, roulis: 0.2 } }),
  B17: Object.freeze({ nom: 'Rasant ultra-bas au ras de l\'asphalte', azimut: 20, camY: 0.06, cibleY: 0.62, roulis: -0.05, fov: 26, recul: 1.04,
    travelling: { y: 0.32, cibleY: 0.55, roulis: -0.06 } }),
  B01: Object.freeze({ nom: 'Dutch angle de série télé 1966', azimut: 38, camY: 0.45, cibleY: 1.1, roulis: -0.24, fov: 30, recul: 1.0,
    travelling: { y: 2.6, cibleY: 1.4, roulis: -0.16 } }),
  B07: Object.freeze({ nom: 'Plongée depuis la nacelle', azimut: 48, camY: 3.4, cibleY: 0.7, roulis: 0.05, fov: 32, recul: 1.05,
    travelling: { y: 6.2, cibleY: 0.9, roulis: 0.04 } }),
  B16: Object.freeze({ nom: 'Profil serré au téléobjectif', azimut: 74, camY: 0.5, cibleY: 1.0, roulis: 0.02, fov: 22, recul: 1.0,
    travelling: { y: 2.2, cibleY: 1.2, roulis: 0 } }),
  J11: Object.freeze({ nom: 'Contre-plongée de monstre', azimut: 26, camY: 0.1, cibleY: 1.7, roulis: 0.04, fov: 40, recul: 0.92,
    travelling: { y: 0.6, cibleY: 2.4, roulis: 0.03 } }),
  P01: Object.freeze({ nom: 'Face à face, scanner dans l\'objectif', azimut: 9, camY: 0.35, cibleY: 1.0, roulis: 0, fov: 28, recul: 1.0,
    travelling: { y: 1.6, cibleY: 1.2, roulis: 0 } }),
  TK04: Object.freeze({ nom: 'Dutch angle cyberpunk', azimut: 34, camY: 0.22, cibleY: 1.2, roulis: -0.16, fov: 34, recul: 1.0,
    travelling: { y: 1.2, cibleY: 1.5, roulis: -0.1 } }),

  /* ---- généralisation : TOUS les bolides qui partagent un fond ont leur angle (C = nom, azimut, camY, cibleY, roulis, fov, [travelling y, cibleY, roulis]) ---- */
  // Gotham
  B02: C('Art déco : très bas, légère contre-plongée', 40, 0.3, 1.2, 0.06, 30, [1.2, 1.6, 0.04]),
  B03: C('Plongée sous la neige', 55, 2.6, 0.8, -0.04, 30, [5.5, 1.0, -0.03]),
  B04: C('Dessin animé : contre-plongée héroïque de face', 15, 0.2, 1.5, 0, 36, [0.8, 2.0, 0]),
  B05: C('Serial 1943 : plan fixe de profil', 88, 0.7, 1.0, 0, 28, [1.6, 1.3, 0]),
  B06: C('Trois-quarts avant menaçant, au ras du blindage', 62, 0.3, 1.25, 0.05, 30, [1.4, 1.5, 0.04]),
  B08: C('Dutch angle cristallin', 44, 0.5, 1.1, 0.18, 32, [2.0, 1.4, 0.12]),
  B09: C('Contre-plongée blindée au grand angle', 32, 0.12, 1.6, -0.06, 42, [0.5, 2.2, -0.04]),
  B10: C('Plongée d\'aube', 62, 2.0, 0.85, 0.03, 28, [4.8, 1.0, 0.02]),
  B11: C('Alerte : Dutch angle inversé', 36, 0.3, 1.2, -0.2, 34, [1.4, 1.5, -0.14]),
  B13: C('Néons : angle haut penché', 50, 1.4, 1.0, 0.14, 30, [3.5, 1.2, 0.1]),
  B14: C('Cryo : face à face givré', 12, 0.5, 1.0, -0.03, 27, [1.8, 1.2, -0.02]),
  B15: C('Contre-plongée frontale massive', 22, 0.15, 1.55, 0.03, 38, [0.6, 2.1, 0.02]),
  // Gare
  E04: C('Paddock 1967 : profil bas', 80, 0.35, 1.0, 0, 26, [1.0, 1.1, 0]),
  E05: C('Rallye : trois-quarts avant en appui', 35, 0.35, 1.15, 0.08, 32, [1.2, 1.4, 0.05]),
  H12: C('Enfilade le long du quai', 100, 1.2, 1.0, 0, 34, [2.5, 1.3, 0]),
  // Tokyo
  J01: C('Face à face d\'anime', 18, 0.3, 1.2, 0.1, 34, [1.0, 1.5, 0.06]),
  J02: C('Col de montagne : plongée de drift', 58, 2.4, 0.8, -0.08, 30, [5.0, 1.0, -0.05]),
  J04: C('Caméra à l\'épaule dans la manif', 40, 1.6, 1.0, 0.12, 36, [1.7, 1.2, 0.08]),
  J05: C('1973 : profil plein cadre', 85, 0.6, 1.0, 0, 26, [1.5, 1.2, 0]),
  J07: C('Cerisiers : contre-plongée douce', 42, 0.2, 1.35, -0.04, 30, [0.8, 1.7, -0.03]),
  J08: C('Turbo : rasant trois-quarts arrière', 130, 0.1, 0.8, 0.05, 32, [0.5, 0.9, 0.03]),
  J09: C('Haute tension : plongée quasi verticale', 50, 3.8, 0.6, 0, 30, [6.5, 0.8, 0]),
  J10: C('1972 : trois-quarts au téléobjectif', 38, 0.45, 1.0, 0.02, 22, [1.6, 1.2, 0.01]),
  J12: C('VIP : au ras du sol', 28, 0.08, 0.7, -0.03, 30, [0.4, 0.8, -0.02]),
  H02: C('Dragon : Dutch angle', 46, 0.4, 1.3, 0.2, 34, [1.4, 1.6, 0.14]),
  H05: C('Caméra de surveillance en plongée', 70, 3.0, 0.7, -0.1, 34, [6.0, 0.9, -0.06]),
  H09: C('Arcade : vue isométrique', 45, 2.8, 0.8, 0, 24, [5.5, 1.0, 0]),
  TK01: C('Synthwave : profil rasant', 78, 0.15, 0.9, 0, 28, [0.6, 1.0, 0]),
  TK02: C('Armure : contre-plongée de géant', 24, 0.1, 1.75, 0.06, 40, [0.5, 2.4, 0.04]),
  TK06: C('Concert : contre-plongée de scène', 34, 0.25, 1.4, -0.08, 34, [1.0, 1.8, -0.05]),
  // Canyon
  U01: C('Orage : trois-quarts arrière', 120, 0.5, 1.1, -0.05, 30, [1.6, 1.3, -0.03]),
  U02: C('Mirage : téléobjectif rasant', 30, 0.12, 0.9, 0, 20, [0.5, 1.0, 0]),
  U03: C('Plongée de cascadeur', 52, 2.2, 0.9, 0.06, 32, [4.5, 1.1, 0.04]),
  U05: C('Point de fuite : face à face rasant', 6, 0.15, 1.0, 0, 26, [0.6, 1.1, 0]),
  E07: C('Hiver : profil sobre', 90, 0.8, 1.0, 0, 30, [1.8, 1.2, 0]),
  E08: C('Rond-point : plongée tournoyante', 60, 3.0, 0.8, 0.12, 34, [6.0, 1.0, 0.08]),
  H01: C('Contre-plongée vers les étoiles', 38, 0.12, 1.6, -0.06, 38, [0.6, 2.2, -0.04]),
  H03: C('Brasier : Dutch angle', 44, 0.35, 1.3, -0.2, 34, [1.3, 1.6, -0.14]),
  H04: C('Caméra cachée en hauteur', 105, 2.6, 0.8, 0.08, 36, [5.0, 1.0, 0.05]),
  H06: C('À hauteur de boîte aux lettres', 40, 1.1, 1.0, 0, 30, [2.2, 1.2, 0]),
  // Avant-première
  E02: C('Tapis rouge : rasant avant', 25, 0.12, 0.9, 0.04, 28, [0.5, 1.0, 0.03]),
  E03: C('Photo-call : profil au téléobjectif', 82, 0.6, 1.0, 0, 22, [1.6, 1.2, 0]),
  H10: C('Contre-plongée solennelle', 30, 0.2, 1.5, 0, 34, [0.8, 2.0, 0]),
  // Studio
  H11: C('Plongée de clip', 50, 2.4, 0.85, 0.1, 32, [5.0, 1.0, 0.07]),
  // V8 : nouveaux bolides de l'atelier photo (15 oct. 2026)
  N01: C('Urgences : face à face au ras du gyrophare', 14, 0.25, 1.25, 0.04, 34, [1.0, 1.6, 0.03]),
  N02: C('Goûter : plongée de jouet sur le tapis', 48, 2.2, 0.85, 0.06, 32, [4.5, 1.0, 0.04]),
  N03: C('Col de nuit : rasant trois-quarts avant en appui', 36, 0.15, 1.1, 0.1, 32, [0.6, 1.3, 0.07]),
  N04: C('Circuit : profil rasant au téléobjectif', 76, 0.2, 0.95, 0, 24, [0.7, 1.05, 0]),
  N05: C('Mode furtif : trois-quarts arrière en plongée douce', 128, 1.4, 0.9, -0.05, 30, [3.0, 1.1, -0.03]),
  N06: C('Route 66 : trois-quarts avant à hauteur de chrome', 42, 0.45, 1.05, 0, 26, [1.4, 1.2, 0]),
  N07: C('Quais gelés : Dutch angle de film noir', 52, 0.6, 1.15, -0.16, 30, [2.0, 1.4, -0.11]),
  N08: C('Casse : rasant le long du capot interminable', 20, 0.1, 0.85, 0.05, 28, [0.4, 0.95, 0.04]),
  N09: C('Miroir : contre-plongée frontale', 10, 0.12, 1.5, 0, 36, [0.5, 2.0, 0]),
  N10: C('Compresseur : contre-plongée de trois-quarts', 34, 0.15, 1.5, 0.08, 38, [0.6, 2.0, 0.05]),
  N11: C('Héroïque : contre-plongée de sauveur', 28, 0.1, 1.7, -0.04, 38, [0.5, 2.3, -0.03]),
});

export const ambianceDe = (code) => AMBIANCES[code] || null;
export const cadrageDe = (code) => CADRAGES[code] || null;

/** Ciel dérivé de la gélatine quand l'ambiance n'en impose pas un. */
export function cielDe(amb, base) {
  if (amb.ciel) return amb.ciel;
  const [c1, c2] = amb.lumieres;
  return { haut: melange(base.haut, assombrir(c2, 0.12), 0.6), milieu: melange(base.milieu, assombrir(c2, 0.4), 0.6), bas: melange(base.bas, assombrir(c1, 0.65), 0.6) };
}

/**
 * Étalonne un décor déjà construit (decors3d.js) : lumières, brouillard, ciel, halos, faisceaux, pluie, façades, sol.
 * Ne crée et ne supprime aucun objet. Les matériaux sont partagés avec le reflet (clone), qui suit donc automatiquement.
 * @param {*} THREE
 * @param {{ groupe, lumieres, solMat, brouillard, ciel }} d   pièces du décor ; d.ciel = uniforms du dôme (ou null)
 * @param {*} amb   entrée de AMBIANCES
 * @returns {{ couleur: string, densite: number }} le brouillard étalonné
 */
export function etalonner(THREE, d, amb) {
  const pal = amb.lumieres.map((c) => new THREE.Color(c));
  const k = amb.f;
  // 1. lumières de décor : clé et contre-jour alternés (les « gélatines » des projecteurs)
  let i = 0;
  for (const l of d.lumieres.children) if (l.isLight) { l.color.copy(pal[i % pal.length]); i++; }
  // 2. ciel
  if (d.ciel) {
    const base = { haut: '#' + d.ciel.cTop.value.getHexString(), milieu: '#' + d.ciel.cMid.value.getHexString(), bas: '#' + d.ciel.cBas.value.getHexString() };
    const c = cielDe(amb, base);
    d.ciel.cTop.value.set(c.haut); d.ciel.cMid.value.set(c.milieu); d.ciel.cBas.value.set(c.bas);
  }
  // 3. matériaux : halos et faisceaux additifs → gélatine ; pluie → teinte claire ; façades et enseignes → filtre ; sol → reflets
  const vus = new Set(); let n = 0;
  const pluie = new THREE.Color(amb.pluie || melange(amb.lumieres[0], '#ffffff', 0.55));
  const filtre = new THREE.Color(amb.lumieres[0]).lerp(new THREE.Color(amb.lumieres[1]), 0.35);
  const vers = (c, cible, kk) => { const lum = Math.max(c.r, c.g, c.b, 1e-3), t = cible.clone(); t.multiplyScalar(lum / Math.max(t.r, t.g, t.b, 1e-3)); c.lerp(t, kk); };
  d.groupe.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (vus.has(m)) continue; vus.add(m);
      const acc = pal[n++ % pal.length];
      if (m.isShaderMaterial) {
        const u = m.uniforms || {};
        if (u.col && u.col.value && u.col.value.isColor) u.col.value.lerp(o.isLineSegments ? pluie : acc, o.isLineSegments ? 0.8 : k);
        continue;
      }
      if (!m.color) continue;
      if (m.blending === THREE.AdditiveBlending) m.color.lerp(acc, k);                        // halos, réverbères, signal, traînées
      else if (m.isMeshBasicMaterial && m.map) vers(m.color, filtre, amb.facades);   // même luminosité, autre teinte            // façades éclairées, enseignes, écrans
      else if (m.isLineBasicMaterial) m.color.lerp(acc, k * 0.4);
    }
  });
  // 4. sol laqué : teinte et reflet néon (émissif discret, jamais au point de noyer le bolide)
  if (d.solMat) {
    if (amb.sol) d.solMat.color.lerp(new THREE.Color(amb.sol), 0.75);
    else d.solMat.color.lerp(new THREE.Color(assombrir(amb.lumieres[1], 0.18)), 0.5);
    if (d.solMat.emissive) { d.solMat.emissive.set(amb.reflet || amb.lumieres[0]); d.solMat.emissiveIntensity = amb.reflet ? 0.045 : 0.025; }
  }
  return { couleur: amb.brouillard.couleur, densite: amb.brouillard.densite };
}
