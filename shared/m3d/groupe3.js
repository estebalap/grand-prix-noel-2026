import { outils } from './outils.js';
import { f1Moderne, disque, etoile, graine, arc, planche, tige, tube, decalDessus, loft, stationEn, hautAu, flancAu, arches, puits, drapeDessus as drapeD, drapeFlancs } from './aide_3.js';

/* Petits utilitaires de dessin pour les livrées (canvas 2D, avant à droite). */
const texte = (g, s, x, y, px, col, police = 'Arial Black, Arial, sans-serif', style = '900') => { g.fillStyle = col; g.font = `${style} ${px}px ${police}`; g.fillText(s, x, y); };
const rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };

/* ===================== F01 : flèche noire, étoiles turquoise, anneaux blancs ===================== */
function f01(ctx) {
  return f1Moderne(ctx, {
    sil: { /* flèche noire : nez bas et pointu, pontons très étroits en gradin, grand aileron haut sur mât unique */
      noseX: 4.25, tipLo: 0.4, tipHi: 0.56, noseW: 0.7, noseTaper: 0.42, nosePts: [[3.2, 0.72], [2.2, 0.86], [1.2, 1.02], [0.6, 1.12], [-0.2, 1.18], [-0.9, 1.22]],
      podW: 0.36, podZ: 0.57, podBot: 0.34, inletH: 0.22, inletW: 0.3, podTop: [[1.5, 0.7], [1.0, 0.92], [-0.2, 0.9], [-1.6, 0.66], [-2.9, 0.46]], podArriere: 0.7,
      engW: 0.4, airW: 0.28, floorW: 0.97, floorH: 0.32, mirrZ: 0.5,
      fw: { span: 1.5, el: 2, ep: 'courbe', epH: 0.9 }, rw: { y1: 1.2, y2: 1.55, w: 1.8, chord: 0.62, epH: 1.0, ep: 'rond', pilier: 'mono' } },
    caisse: '#14151a', acc: '#22d3c5', aile: '#14151a', aileAv: '#17181d', accEnd: '#14151a', plancher: '#26282e', casque: '#e8eaee', visiere: '#0b0c10',
    jante: '#17181c', flanc: '#f4f6fa', style: { rainures: false },
    ponton: (g, w, h) => {
      const r = graine(63);
      g.fillStyle = '#22d3c5'; for (let i = 0; i < 14; i++) { const x = 40 + r() * 330, y = 30 + r() * 150; etoile(g, x, y, 10 + r() * 16, 4 + r() * 5, 4, r() * 3); }   // nuée d'étoiles
      g.fillStyle = '#d7dde4'; for (let i = 0; i < 8; i++) etoile(g, 60 + r() * 300, 40 + r() * 140, 5 + r() * 7, 2, 4, r() * 3);
      texte(g, 'NOVA', 450, 140, 110, '#f2f5f8'); rect(g, 440, 138, 420, 7, '#22d3c5'); texte(g, 'VELOCE', 470, 182, 40, '#22d3c5', 'Arial, sans-serif', '800');
      poly(g, [[860, 215], [1024, 140], [1024, 215]], '#22d3c5');
    },
    nez: (g, w, h) => { rect(g, 0, 40, w, 30, '#22d3c5'); rect(g, 0, 78, w, 8, '#d7dde4'); disque(g, 180, 56, 50, 63, '#14151a', '#22d3c5'); },
    capot: (g, w, h) => { rect(g, 0, 34, w, 14, '#22d3c5'); rect(g, 0, 54, w, 6, '#d7dde4'); },
  });
}

/* ===================== F02 : bleu nuit, flammes rouges-jaunes, anneaux jaunes ===================== */
function f02(ctx) {
  return f1Moderne(ctx, {
    sil: { /* bleu nuit : nez haut incliné, prise d'air de ponton haute avec rampe descendante raide, longue dérive dorsale */
      noseX: 4.0, tipLo: 0.52, tipHi: 0.8, noseW: 0.74, noseTaper: 0.5, nosePts: [[3.2, 0.96], [2.2, 1.04], [1.2, 1.1], [0.6, 1.14], [-0.2, 1.18], [-0.9, 1.22]],
      podW: 0.5, podBot: 0.36, inletH: 0.42, inletW: 0.46, podTop: [[1.5, 0.86], [1.05, 1.08], [0.2, 1.02], [-1.0, 0.8], [-2.0, 0.54], [-2.9, 0.4]], podArriere: 0.4, bombe: 0.03,
      airH: 1.82, finLift: 0.14, finW: 0.09, floorW: 0.94, mirrZ: 0.58, mirrY: 1.36,
      fw: { span: 1.62, el: 4, ep: 'courbe', epH: 0.9 }, rw: { y1: 1.15, y2: 1.44, w: 1.96, chord: 0.58, epH: 0.9, ep: 'coupe', pilier: 'mono', beam: true } },
    caisse: '#1b2a5a', acc: '#e5484d', aile: '#1b2a5a', aileAv: '#e8ecf5', accEnd: '#1b2a5a', plancher: '#272a36', casque: '#2a46c9', visiere: '#10131c',
    jante: '#262932', flanc: '#f2c200', style: { rainures: true },
    ponton: (g, w, h) => {
      g.fillStyle = '#f2f5fb'; g.beginPath(); g.moveTo(0, 150); g.bezierCurveTo(250, 120, 560, 170, 1024, 110); g.lineTo(1024, 135); g.bezierCurveTo(560, 200, 250, 150, 0, 178); g.fill();
      texte(g, 'ORBITAL', 70, 110, 120, '#f2f5fb'); texte(g, 'RACING', 100, 205, 38, '#f2c200', 'Arial, sans-serif', '800');
      g.fillStyle = '#e5484d'; g.beginPath(); g.ellipse(760, 90, 95, 55, 0, 0, 7); g.fill(); g.fillStyle = '#f2c200'; g.beginPath(); g.ellipse(760, 96, 62, 28, 0, 0, 7); g.fill();
      g.fillStyle = '#1b2a5a'; etoile(g, 760, 92, 22, 9, 5);
    },
    nez: (g, w, h) => {
      poly(g, [[0, 70], [250, 20], [520, 70], [768, 12], [768, 100], [0, 100]], '#e5484d');
      poly(g, [[0, 90], [250, 55], [520, 92], [768, 52], [768, 100], [0, 100]], '#f2c200'); disque(g, 150, 56, 46, 1, '#f2c200', '#1b2a5a');
    },
    capot: (g, w, h) => { poly(g, [[0, 22], [768, 8], [768, 40], [0, 74]], '#e5484d'); rect(g, 0, 52, w, 8, '#f2c200'); },
  });
}

/* ===================== F03 : rouge italien, plancher noir, anneaux jaunes, rond blanc sur le halo ===================== */
function f03(ctx) {
  return f1Moderne(ctx, {
    sil: { /* rouge : baignoire basse très galbée, grand plancher noir apparent, nez bulbeux, aileron arrière à deux mâts */
      noseX: 4.1, tipLo: 0.46, tipHi: 0.68, noseW: 0.84, noseTaper: 0.55, nosePts: [[3.2, 0.82], [2.2, 0.94], [1.2, 1.04], [0.6, 1.1], [-0.2, 1.16], [-0.9, 1.2]],
      podW: 0.58, podZ: 0.6, podBot: 0.4, inletH: 0.3, inletW: 0.5, podTop: [[1.4, 0.76], [0.9, 0.9], [-0.4, 0.92], [-1.7, 0.74], [-2.9, 0.52]], podArriere: 0.62, bombe: 0.05,
      floorW: 0.98, floorH: 0.36, airH: 1.7, airW: 0.38, mirrZ: 0.56,
      fw: { span: 1.6, el: 3, ep: 'courbe', epH: 1.1 }, rw: { y1: 1.1, y2: 1.38, w: 1.88, chord: 0.62, epH: 0.8, epL: 1.2, ep: 'marche', pilier: 'double' } },
    caisse: '#a3121b', acc: '#f4f4f4', aile: '#b3121b', aileAv: '#b3121b', accEnd: '#b3121b', plancher: '#16171b', casque: '#ffde2a', visiere: '#0c0c10',
    jante: '#1a1b20', flanc: '#ffde2a', style: { rainures: false },
    ponton: (g, w, h) => {
      texte(g, 'Rapido', 90, 140, 140, '#f6f6f6', 'Brush Script MT, cursive, Arial', 'italic 700');
      g.fillStyle = '#ffde2a'; g.beginPath(); g.ellipse(660, 100, 72, 62, 0, 0, 7); g.fill(); g.fillStyle = '#b3121b'; g.beginPath(); g.ellipse(660, 104, 52, 42, 0, 0, 7); g.fill(); g.fillStyle = '#ffde2a'; etoile(g, 660, 102, 28, 12, 6);
      texte(g, 'TURBO', 790, 90, 44, '#f4f4f4', 'Arial, sans-serif', '800'); rect(g, 790, 108, 190, 6, '#f4f4f4');
    },
    nez: (g, w, h) => { rect(g, 0, 40, w, 24, '#f4f4f4'); rect(g, 0, 70, w, 8, '#ffde2a'); disque(g, 190, 56, 46, 16, '#ffffff', '#b3121b'); },
    capot: (g, w, h) => { g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(640, 50, 42, 0, 7); g.fill(); g.fillStyle = '#2a6fd6'; g.beginPath(); g.arc(640, 50, 29, 0, 7); g.fill(); rect(g, 0, 44, 580, 10, '#f4f4f4'); },
  });
}

/* ===================== F04 : noir et papaye, anneaux orange ===================== */
function f04(ctx) {
  return f1Moderne(ctx, {
    sil: { /* noir et papaye : nez très plat, pontons larges à grande entrée rectangulaire, aileron avant large à 3 plans */
      noseX: 3.95, tipLo: 0.4, tipHi: 0.56, noseW: 0.86, noseTaper: 0.7, nosePts: [[3.2, 0.7], [2.2, 0.84], [1.2, 1.0], [0.6, 1.1], [-0.2, 1.17], [-0.9, 1.22]],
      podW: 0.6, podZ: 0.62, podBot: 0.3, inletH: 0.5, inletW: 0.54, podTop: [[1.4, 0.74], [0.9, 0.96], [-0.5, 0.96], [-1.9, 0.74], [-2.9, 0.5]], podArriere: 0.5,
      engW: 0.56, floorW: 0.96, airH: 1.66, airW: 0.4,
      fw: { span: 1.66, el: 3, ep: 'plein', epH: 1.15 }, rw: { y1: 1.14, y2: 1.46, w: 1.92, chord: 0.66, epH: 0.92, ep: 'plein', pilier: 'mono', beam: true } },
    caisse: '#17181d', acc: '#ff8a1a', aile: '#17181d', aileAv: '#1d1e24', accEnd: '#17181d', plancher: '#2a2c32', casque: '#ff8a1a', visiere: '#0b0b10',
    jante: '#17181c', flanc: '#ff8a1a', style: { rainures: false },
    ponton: (g, w, h) => {
      poly(g, [[0, 215], [0, 120], [380, 60], [1024, 30], [1024, 90], [420, 130], [120, 215]], '#ff8a1a');                       // grand coup de pinceau papaye
      texte(g, 'TURBO', 400, 120, 120, '#f4f4f4'); rect(g, 430, 128, 300, 10, '#ff8a1a');
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) rect(g, 790 + i * 40, 150 + j * 32, 40, 32, (i + j) % 2 ? '#17181d' : '#f4f4f4');      // damier
    },
    nez: (g, w, h) => { poly(g, [[0, 30], [768, 14], [768, 86], [0, 70]], '#ff8a1a'); disque(g, 200, 56, 46, 4, '#17181d', '#ff8a1a'); },
    capot: (g, w, h) => { poly(g, [[0, 12], [768, 30], [768, 70], [0, 88]], '#ff8a1a'); },
  });
}

/* ===================== F05 : vert britannique métallisé, aileron côtelé ===================== */
function f05(ctx) {
  return f1Moderne(ctx, {
    sil: { /* vert : aileron avant très large à 4 lames nervurées, nez large et pointu, pontons hauts et pleins, aileron arrière galbé */
      noseX: 4.22, tipLo: 0.42, tipHi: 0.62, noseW: 0.92, noseTaper: 0.34, nosePts: [[3.2, 0.78], [2.2, 0.94], [1.2, 1.08], [0.6, 1.14], [-0.2, 1.18], [-0.9, 1.22]],
      podW: 0.56, podZ: 0.62, podBot: 0.32, inletH: 0.36, inletW: 0.5, podTop: [[1.4, 0.82], [0.9, 1.02], [-0.4, 1.02], [-1.8, 0.8], [-2.9, 0.56]], podArriere: 0.45, bombe: 0.04,
      fw: { span: 1.7, el: 4, ep: 'plein', epH: 1.0 }, rw: { y1: 1.16, y2: 1.5, w: 1.96, chord: 0.7, epH: 0.9, ep: 'rond', pilier: 'mono' } },
    caisse: '#0e6b57', acc: '#c8ff3e', aile: '#0e6b57', aileAv: '#12806a', accEnd: '#0e6b57', plancher: '#14181b', casque: '#f4f4f4', visiere: '#0b0f10',
    jante: '#1a1c20', flanc: '#f4f6fa', style: { rainures: true },
    ponton: (g, w, h) => {
      g.fillStyle = 'rgba(200,255,62,0.9)'; g.beginPath(); g.moveTo(0, 215); g.bezierCurveTo(260, 190, 620, 60, 1024, 30); g.lineTo(1024, 62); g.bezierCurveTo(620, 100, 260, 215, 0, 215); g.fill();
      texte(g, 'VERDE', 100, 140, 120, '#f4f7f2'); texte(g, 'RACING', 138, 175, 36, '#c8ff3e', 'Arial, sans-serif', '800');
      disque(g, 800, 100, 52, 14, '#0b3a2f', '#c8ff3e');
    },
    nez: (g, w, h) => { rect(g, 0, 44, w, 16, '#c8ff3e'); for (let i = 0; i < 10; i++) rect(g, 300 + i * 40, 72, 24, 5, '#c8ff3e'); },
    capot: (g, w, h) => { rect(g, 0, 36, w, 14, '#c8ff3e'); rect(g, 0, 56, w, 5, '#f4f4f4'); },
  });
}

/* ===================== F06 : bleu électrique et rose, aileron avant rose ===================== */
function f06(ctx) {
  return f1Moderne(ctx, {
    sil: { /* bleu et rose : pontons étroits, haute prise d'air, aileron avant à grandes dérives balayées, aileron arrière haut à deux mâts */
      noseX: 4.05, tipLo: 0.46, tipHi: 0.62, noseW: 0.76, noseTaper: 0.5, nosePts: [[3.2, 0.8], [2.2, 0.95], [1.2, 1.06], [0.6, 1.14], [-0.2, 1.18], [-0.9, 1.22]],
      podW: 0.4, podZ: 0.58, podBot: 0.32, inletH: 0.3, inletW: 0.34, podTop: [[1.4, 0.76], [0.9, 0.98], [-0.5, 0.94], [-1.8, 0.72], [-2.9, 0.5]], podArriere: 0.62,
      airH: 1.84, airW: 0.36, engW: 0.46,
      fw: { span: 1.56, el: 3, ep: 'haut', epH: 1.1 }, rw: { y1: 1.2, y2: 1.52, w: 1.9, chord: 0.6, epH: 1.0, ep: 'coupe', pilier: 'double' } },
    caisse: '#1d4fd6', acc: '#ff5fb0', aile: '#1d4fd6', aileAv: '#2259dc', accEnd: '#1a46c2', plancher: '#1b1c22', casque: '#1d4fd6', visiere: '#0b0d18',
    jante: '#1b1c22', flanc: '#f6f6fa', style: { rainures: false },
    ponton: (g, w, h) => {
      poly(g, [[0, 210], [0, 150], [300, 130], [700, 40], [1024, 20], [1024, 80], [760, 120], [300, 190]], '#ff5fb0');
      texte(g, 'SPRINT', 90, 130, 130, '#ff5fb0'); texte(g, 'AQUA', 150, 175, 40, '#f4f4f4', 'Arial, sans-serif', '800');
      disque(g, 830, 120, 48, 10, '#f4f4f4', '#1d4fd6');
    },
    nez: (g, w, h) => { poly(g, [[0, 40], [768, 20], [768, 92], [0, 72]], '#ff5fb0'); disque(g, 180, 56, 44, 10, '#f4f4f4', '#1d4fd6'); },
    capot: (g, w, h) => { rect(g, 0, 34, w, 16, '#ff5fb0'); rect(g, 0, 56, w, 5, '#f4f4f4'); },
  });
}

/* ===================== F07 : bleu océan profond, bandes ciel ===================== */
function f07(ctx) {
  return f1Moderne(ctx, {
    sil: { /* bleu profond : bosse de nez haute, pontons rebondis à grande bouche, aileron avant à échancrures, large aileron arrière à plan inférieur */
      noseX: 4.0, tipLo: 0.5, tipHi: 0.74, noseW: 0.8, noseTaper: 0.55, nosePts: [[3.2, 0.9], [2.2, 1.0], [1.2, 1.1], [0.6, 1.15], [-0.2, 1.19], [-0.9, 1.22]],
      podW: 0.52, podBot: 0.3, inletH: 0.4, inletW: 0.46, podTop: [[1.4, 0.8], [0.8, 1.04], [-0.2, 1.06], [-1.6, 0.8], [-2.9, 0.5]], podArriere: 0.5, bombe: 0.05,
      engW: 0.54, airH: 1.74, floorW: 0.95,
      fw: { span: 1.6, el: 3, ep: 'cran', epH: 1.1 }, rw: { y1: 1.1, y2: 1.38, w: 2.02, chord: 0.72, epH: 0.82, epL: 1.25, ep: 'plein', pilier: 'double', beam: true } },
    caisse: '#102f87', acc: '#3fb6ff', aile: '#102f87', aileAv: '#2a6fd6', accEnd: '#102f87', plancher: '#14151a', casque: '#f4f4f4', visiere: '#0a0c14',
    jante: '#17181c', flanc: '#f6f6fa', style: { rainures: false },
    ponton: (g, w, h) => {
      poly(g, [[0, 215], [0, 170], [260, 150], [1024, 100], [1024, 140], [260, 215]], '#3fb6ff');
      poly(g, [[0, 20], [120, 20], [60, 80], [0, 80]], '#3fb6ff');
      texte(g, 'DELTA', 90, 130, 130, '#f4f7ff'); texte(g, 'MARINE', 128, 170, 36, '#3fb6ff', 'Arial, sans-serif', '800');
      poly(g, [[780, 40], [900, 40], [840, 130]], '#f4f7ff'); texte(g, '23', 900, 130, 80, '#f4f7ff');
    },
    nez: (g, w, h) => { rect(g, 0, 40, w, 20, '#3fb6ff'); rect(g, 0, 68, w, 8, '#f4f7ff'); disque(g, 190, 56, 44, 23, '#f4f7ff', '#102f87'); },
    capot: (g, w, h) => { rect(g, 0, 34, w, 14, '#3fb6ff'); },
  });
}


/* ===================== E04 : monoplace vintage verte à bande jaune, cigare, moteur apparent ===================== */
function e04(ctx) {
  const { THREE, lumRouge } = ctx, o = outils(ctx), garde = ctx.garde;
  const vert = o.lac('#1d5a2c', 0.22, 0.15), jaune = o.lac('#f2c418', 0.25, 0.2), noir = o.mat('#16171b', 0.5, 0.4), arg = o.mat('#c4cad3', 0.25, 0.9);
  const chromeM = o.chrome, acier = o.mat('#2b2e36', 0.4, 0.8);
  const ZAV = 1.16, ZAR = 1.2, xAv = 2.35, xAr = -2.3, rAv = 0.56, rAr = 0.74, epAv = 0.5, epAr = 0.9;

  /* ---- monocoque en cigare : sections elliptiques lofées, ventre plus plat, queue effilée vers le moteur ---- */
  const cig = [
    { x: -1.1, w: 0.34, y0: 0.38, y1: 0.8 },
    { x: -0.6, w: 0.5, y0: 0.3, y1: 0.99 },
    { x: 0.3, w: 0.56, y0: 0.28, y1: 1.06 },
    { x: 1.4, w: 0.52, y0: 0.3, y1: 0.99 },
    { x: 2.5, w: 0.42, y0: 0.33, y1: 0.87 },
    { x: 3.3, w: 0.3, y0: 0.38, y1: 0.75 },
    { x: 3.62, w: 0.2, y0: 0.44, y1: 0.66 },
  ].map((s) => ({ ...s, nt: 2.0, nb: 2.6 }));
  loft(ctx, o, cig, vert, { nx: 110, ns: 48 });
  /* cône de nez jaune légèrement en surépaisseur, bouche d'air noire */
  const cone = cig.filter((s) => s.x >= 3.3).map((s) => ({ ...s, w: s.w + 0.015, y0: s.y0 - 0.015, y1: s.y1 + 0.015 }));
  loft(ctx, o, [{ ...stationEn(cig, 3.18), nt: 2, nb: 2.6, w: stationEn(cig, 3.18).w + 0.015, y0: stationEn(cig, 3.18).y0 - 0.015, y1: stationEn(cig, 3.18).y1 + 0.015 }, ...cone], jaune, { nx: 20, ns: 40 });
  const bouche = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 20, 12)), noir); bouche.scale.set(0.05, 0.09, 0.13); bouche.position.set(3.63, 0.55, 0); o.ajouter(bouche);

  /* ---- habitacle : ouverture sombre, bourrelet, petit pare-brise, volant, pilote ---- */
  drapeD(ctx, o, cig, -0.55, 0.95, -0.4, 0.4, (g, w, h) => { g.fillStyle = '#0d0e11'; g.beginPath(); g.ellipse(w * 0.5, h / 2, w * 0.49, h * 0.4, 0, 0, 7); g.fill(); }, 512, 160, 0.01);
  const bour = new THREE.Mesh(garde(new THREE.TorusGeometry(1, 0.035, 8, 40)), noir); bour.scale.set(0.74, 0.3, 1); bour.rotation.x = Math.PI / 2; bour.position.set(0.2, 1.03, 0); o.ajouter(bour);
  const pb = o.boite(0.05, 0.26, 0.66, o.verre, 1.0, 1.1, 0); pb.rotation.z = -0.55;
  o.cyl(0.13, 0.13, 0.035, noir, 0.7, 1.08, 0, 0, 1.1);                                                          // volant
  const cas = new THREE.Mesh(garde(new THREE.SphereGeometry(0.2, 18, 14)), o.lac('#f4f4f4', 0.2, 0.15)); cas.position.set(0.0, 1.3, 0); o.ajouter(cas);
  const lun = new THREE.Mesh(garde(new THREE.SphereGeometry(0.12, 12, 8)), o.mat('#111', 0.2, 0.6)); lun.position.set(0.14, 1.33, 0); lun.scale.set(0.55, 0.45, 1.35); o.ajouter(lun);
  o.boite(0.34, 0.2, 0.56, o.mat('#7d8da6', 0.7, 0.1), -0.25, 1.08, 0);                                          // épaules
  o.boite(0.14, 0.34, 0.12, noir, -0.55, 1.12, 0);                                                                // arceau

  /* ---- livrée : bande jaune centrale sur le nez, liseré de flanc, ronds numérotés ---- */
  const rond = (g, x, y, r) => { g.fillStyle = '#f6f6f2'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#16171b'; g.font = `900 ${r * 1.45}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('4', x, y + r * 0.08); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; };
  drapeD(ctx, o, cig, 0.95, 3.32, -0.1, 0.1, (g, w, h) => { g.fillStyle = '#f2c418'; g.fillRect(0, 0, w, h); }, 256, 32, 0.008);
  drapeD(ctx, o, cig, 2.0, 2.62, -0.32, 0.32, (g, w, h) => rond(g, w / 2, h / 2, h * 0.46), 256, 256, 0.014);
  drapeFlancs(ctx, o, cig, -0.9, 3.25, 0.5, 0.95, (g, w, h) => {
    g.fillStyle = '#f2c418'; g.fillRect(0, h * 0.5, w, 9);                                                       // liseré jaune le long du flanc
    g.fillStyle = '#f2c418'; g.font = 'italic 800 30px Arial, sans-serif'; g.fillText('TEAM TURBO', w * 0.42, h * 0.44);
    rond(g, w * 0.3, h * 0.5, 52);                                                                               // rond « 4 » sous l'habitacle
  }, 1024, 220);

  /* ---- moteur apparent : bloc argent, culasses en V, 8 trompettes chromées, collecteurs qui filent vers l'arrière ---- */
  o.boite(1.5, 0.4, 0.66, arg, -1.55, 0.6, 0);
  for (const z of [-1, 1]) {
    const cul = o.boite(1.3, 0.18, 0.26, chromeM, -1.55, 0.92, z * 0.2); cul.rotation.x = z * 0.35;               // culasses inclinées en V
    for (let i = 0; i < 4; i++) {
      const tx = -1.05 - i * 0.3; o.cyl(0.075, 0.1, 0.26, chromeM, tx, 1.14, z * 0.24);                              // trompettes d'admission
      const ann = new THREE.Mesh(garde(new THREE.TorusGeometry(0.075, 0.018, 6, 16)), chromeM); ann.rotation.x = Math.PI / 2; ann.position.set(tx, 1.27, z * 0.24); o.ajouter(ann);
      tube(ctx, o, [[tx, 0.74, z * 0.34], [tx - 0.08, 0.66, z * 0.5], [tx - 0.5 - i * 0.1, 0.66, z * 0.5], [-3.25, 0.74 + i * 0.02, z * (0.42 - i * 0.04)]], 0.038, chromeM, 24, 8);   // collecteurs
    }
    o.cyl(0.07, 0.06, 0.3, chromeM, -3.35, 0.78, z * 0.32, 0, Math.PI / 2, 14);                                   // sorties d'échappement
  }
  o.cyl(0.18, 0.26, 0.8, arg, -2.65, 0.6, 0, 0, Math.PI / 2);                                                    // boîte de vitesses
  o.boite(0.3, 0.26, 0.5, noir, -3.15, 0.55, 0);                                                                 // carter arrière
  o.boite(0.05, 0.14, 0.14, lumRouge, -3.32, 0.55, 0);                                                           // feu arrière
  for (const z of [-1, 1]) tige(ctx, o, [-0.95, 1.0, z * 0.2], [-2.3, 0.76, z * 0.28], 0.025, acier);           // barres de châssis tubulaire

  /* ---- suspensions triangulées fines vers les moyeux ---- */
  for (const [cx, R, ep, zc] of [[xAv, rAv, epAv, ZAV], [xAr, rAr, epAr, ZAR]]) for (const z of [-1, 1]) {
    const hub = [cx, R, z * (zc - ep / 2 + 0.05)];
    for (const dx of [-0.3, 0.3]) { tige(ctx, o, [cx + dx, R + 0.26, z * 0.3], hub, 0.026, acier, 8); tige(ctx, o, [cx + dx, 0.4, z * 0.32], [cx, R - 0.08, hub[2]], 0.026, acier, 8); }
    const rot = new THREE.Mesh(garde(new THREE.SphereGeometry(0.07, 10, 8)), acier); rot.position.set(...hub); o.ajouter(rot);
  }
  const roue = (x, R, ep, zc, av) => ({ x, RW: R, ep, z: zc, avant: av, jante: '#cfd4dc', rayons: 'plein', chrome: true, flanc: null, sansFrein: true });
  return { L: 7.2, largeur: 2.7, hauteur: 1.52, xAvant: 3.68, xArriere: -3.52, roues: [roue(xAv, rAv, epAv, ZAV, true), roue(xAr, rAr, epAr, ZAR, false)], jante: '#cfd4dc', flanc: null };
}

/* ===================== E08 : compacte sportive turquoise, vitrage jaune, aileron de hayon, autocollants en patchwork ===================== */
function e08(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx), garde = ctx.garde;
  const cy = o.lac('#35c3e3', 0.2, 0.08), noir = o.mat('#15161a', 0.55, 0.35), noirB = o.lac('#0f1013', 0.3, 0.4), puitsM = o.mat('#0b0c0f', 0.9, 0.1);
  /* vitrage jaune translucide (fidèle aux photos : vitres et intérieur jaunes), en retrait des montants */
  const verreJ = garde(new THREE.MeshPhysicalMaterial({ color: o.lin('#f7d400'), roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.94, clearcoat: 1, clearcoatRoughness: 0.08, envMap: ctx.envMap, envMapIntensity: 0.25 }));
  /* Brief 10 — famille compacte à hayon : H_toit / W ≈ 0,73 (photo : pavillon haut, ceinture au ras du sommet des roues).
     Passages de roues recoupés à R + 0,13 ; la tôle des ailes coiffe le pneu (garde ≥ 0,08) dans toute sa largeur. */
  const RW = 0.6, xAv = 2.0, xAr = -2.05, wAv = 1.27, wAr = 1.3, epAv = 0.54, epAr = 0.6;
  const roues = [
    { x: xAv, RW, ep: epAv, z: wAv - epAv / 2 + 0.012, avant: true, jante: '#f4f4f4', rayons: 'dix', flanc: null, etrier: '#e8202a' },
    { x: xAr, RW, ep: epAr, z: wAr - epAr / 2 + 0.012, avant: false, jante: '#c4366e', rayons: 'dix', flanc: null, etrier: '#e8202a' },
  ];

  /* ---- caisse basse lofée : ailes gonflées au droit des essieux, taille resserrée aux portières, museau et poupe arrondis ---- */
  const bas = [
    { x: -3.16, w: 1.08, y0: 0.42, y1: 1.22, nt: 3.2, nb: 3.2 },
    { x: -3.04, w: 1.2, y0: 0.32, y1: 1.36, nt: 3.0 },
    { x: -2.05, w: wAr, y0: 0.28, y1: 1.47 },
    { x: -0.9, w: 1.2, y0: 0.29, y1: 1.33 },
    { x: 0.6, w: 1.2, y0: 0.29, y1: 1.32 },
    { x: 2.0, w: wAv, y0: 0.28, y1: 1.45 },
    { x: 2.86, w: 1.17, y0: 0.3, y1: 1.22, nt: 2.3 },
    { x: 3.16, w: 1.0, y0: 0.36, y1: 0.98, nt: 2.0, nb: 2.4 },
  ];
  loft(ctx, o, bas, cy, { arches: arches(roues, 1.17) });
  puits(ctx, o, roues, puitsM);

  /* ---- pavillon chopé : vitrage jaune peu rétréci (tumblehome faible), toit plat et large, pare-brise et lunette couchés ---- */
  const cab = [
    { x: -2.95, w: 0.98, y0: 1.24, y1: 1.42, nt: 2.4, wt: 0.92 },
    { x: -2.5, w: 1.06, y0: 1.24, y1: 1.76, wt: 0.86 },
    { x: -1.4, w: 1.1, y0: 1.24, y1: 1.86, wt: 0.86 },
    { x: -0.1, w: 1.1, y0: 1.24, y1: 1.85, wt: 0.86 },
    { x: 0.55, w: 1.09, y0: 1.24, y1: 1.7, wt: 0.87 },
    { x: 1.75, w: 1.06, y0: 1.24, y1: 1.36, wt: 0.94 },
  ];
  loft(ctx, o, cab, verreJ, { nx: 80, ns: 44 });
  const toit = [-2.3, -1.95, -1.4, -0.7, -0.2, 0.2].map((x, i, a) => {
    const s = stationEn(cab, x), bout = i === 0 || i === a.length - 1, wBord = flancAu(cab, x, s.y1 - 0.12);   // largeur du vitrage au bord du toit
    return { x, w: wBord + (bout ? -0.02 : 0.04), y0: s.y1 - (bout ? 0.08 : 0.14), y1: s.y1 + (bout ? 0.0 : 0.04), nt: 5, nb: 5 };
  });
  loft(ctx, o, toit, cy, { nx: 50, ns: 36 });
  const pilier = (xa, ya, xb, yb, r) => { for (const sg of [-1, 1]) tige(ctx, o, [xa, ya, sg * (flancAu(cab, xa, ya) + 0.01)], [xb, yb, sg * (flancAu(cab, xb, yb) + 0.012)], r, cy, 10); };
  pilier(1.66, 1.34, 0.2, 1.8, 0.075);                                                                             // montant A (couché)
  pilier(-0.75, 1.32, -0.75, 1.8, 0.07);                                                                         // montant B
  pilier(-2.85, 1.42, -2.05, 1.78, 0.1);                                                                         // montant C (large, hayon)
  for (const sg of [-1, 1]) tige(ctx, o, [1.45, 1.31, sg * 1.06], [-2.85, 1.38, sg * 0.98], 0.04, noir, 8);         // joint de ceinture noir

  /* ---- face avant : bouche trapézoïdale noire béante, petite calandre, phares étirés, lame ---- */
  const trap = (zh, zb, yh, yb, ep, x, m) => {                                                                   // trapèze (z, y) extrudé vers l'avant
    const s = new THREE.Shape(); s.moveTo(-zb, yb); s.lineTo(zb, yb); s.lineTo(zh, yh); s.lineTo(-zh, yh); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    g.rotateY(Math.PI / 2); const me = new THREE.Mesh(garde(g), m); me.position.x = x; return o.ajouter(me);
  };
  trap(0.62, 0.82, 0.66, 0.34, 0.24, 2.92, noirB);                                                                 // grande bouche inférieure
  for (const yy of [0.44, 0.55]) o.boite(0.05, 0.03, 1.22, o.mat('#2a2c33', 0.4, 0.6), 3.17, yy, 0);                // barrettes de la bouche
  trap(0.4, 0.34, 0.98, 0.86, 0.16, 3.04, noirB);                                                                  // calandre haute
  for (const sg of [-1, 1]) {
    o.cyl(0.07, 0.07, 0.06, o.mat('#e9ecf2', 0.2, 0.5), 3.15, 0.46, sg * 0.7, 0, Math.PI / 2, 16);                  // antibrouillards
    const ph = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 20, 12)), lumBlanche);                             // phare étiré en amande
    ph.scale.set(0.36, 0.12, 0.3); ph.position.set(2.86, 1.05, sg * 0.74); ph.rotation.y = sg * 0.55; o.ajouter(ph);
    const cad = new THREE.Mesh(garde(new THREE.SphereGeometry(1, 20, 12)), o.mat('#3a3e46', 0.3, 0.7));          // boîtier de phare gris foncé
    cad.scale.set(0.38, 0.1, 0.32); cad.position.set(2.83, 1.03, sg * 0.75); cad.rotation.y = sg * 0.55; o.ajouter(cad);
  }
  o.boite(0.5, 0.06, 1.9, noirB, 2.95, 0.3, 0);                                                                     // lame avant
  for (const sg of [-1, 1]) drapeD(ctx, o, bas, 2.15, 2.65, sg * 0.48 - 0.1, sg * 0.48 + 0.1, (g, w, h) => { g.fillStyle = '#121317'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c3038'; for (let i = 0; i < 5; i++) g.fillRect(30 + i * 45, 10, 18, h - 20); }, 256, 96);   // ouïes de capot

  /* ---- poupe : feux, diffuseur noir, double sortie ---- */
  for (const sg of [-1, 1]) { const f = o.boite(0.06, 0.18, 0.36, lumRouge, -3.1, 1.14, sg * 0.8); f.rotation.y = sg * 0.3; }
  o.boite(0.3, 0.3, 1.8, noirB, -3.06, 0.5, 0);                                                                   // diffuseur
  for (const z of [-0.34, 0.34]) o.cyl(0.075, 0.075, 0.24, o.chrome, -3.15, 0.42, z, 0, Math.PI / 2, 16);         // échappements
  for (const sg of [-1, 1]) { o.boite(0.24, 0.12, 0.16, cy, 1.0, 1.44, sg * 1.2); o.boite(0.12, 0.05, 0.22, noir, 1.04, 1.4, sg * 1.08); }   // rétroviseurs

  /* ---- aileron de hayon : plan principal + volet, dérives, deux jambes (juste au-dessus du pavillon) ---- */
  o.boite(0.6, 0.07, 2.0, cy, -2.66, 1.96, 0).rotation.z = 0.06;
  o.boite(0.24, 0.05, 2.0, cy, -2.98, 2.03, 0).rotation.z = 0.35;
  for (const sg of [-1, 1]) {
    o.profil([[-2.38, 1.8], [-2.33, 2.06], [-3.08, 2.12], [-3.08, 1.86]], 0.06, cy, { galbe: false, biseau: 0.015 }).position.z = sg * 1.02;
    o.boite(0.1, 0.3, 0.08, cy, -2.68, 1.8, sg * 0.56);
  }

  /* ---- autocollants patchwork : portières (avec grand « I » marine et « 3 ») et toit ---- */
  const patch = (g, w, h, graineV, dens) => {
    const r = graine(graineV), cols = ['#ff5fa8', '#ffe84a', '#2a46c9', '#f4f4f4', '#ff8a1a', '#8fe36a', '#111827', '#c93a6a', '#5ad0ff'];
    for (let i = 0; i < dens; i++) {
      const x = r() * w, y = r() * h, bw = 40 + r() * 110, bh = 26 + r() * 60; g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.4); g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(-bw / 2, -bh / 2, bw, bh);
      g.fillStyle = cols[(r() * cols.length) | 0]; g.beginPath(); g.arc((r() - 0.5) * bw * 0.5, (r() - 0.5) * bh * 0.5, 8 + r() * 14, 0, 7); g.fill();
      g.fillStyle = r() > 0.5 ? '#fff' : '#111'; g.font = '900 ' + (16 + r() * 20) + 'px Arial Black, Arial'; g.fillText(['GO', 'POP', 'FAST', 'ART', 'WOW', '3', '!!', 'MIX'][(r() * 8) | 0], -bw / 2 + 5, bh * 0.25); g.restore();
    }
  };
  drapeFlancs(ctx, o, bas, -1.32, 0.95, 0.58, 1.2, (g, w, h) => {
    g.save(); g.beginPath(); g.moveTo(30, h); g.lineTo(0, 30); g.quadraticCurveTo(10, 0, 60, 0); g.lineTo(w - 70, 0); g.lineTo(w, 60); g.lineTo(w - 40, h); g.closePath(); g.clip();
    g.fillStyle = '#e9eef4'; g.fillRect(0, 0, w, h); patch(g, w, h, 77, 80); g.restore();
    g.fillStyle = '#e9eef4'; g.beginPath(); g.ellipse(w * 0.5, h * 0.5, 96, 104, 0, 0, 7); g.fill();
    g.fillStyle = '#1b2c8a'; g.font = '900 210px Georgia, Times, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('I', w * 0.5, h * 0.53);
    g.fillStyle = '#ff5fa8'; g.font = '900 64px Arial Black, Arial'; g.fillText('3', w * 0.5 + 70, h * 0.5 + 66);
  }, 1024, 256);
  drapeD(ctx, o, toit, -1.85, -0.05, -0.75, 0.75, (g, w, h) => { g.fillStyle = '#e9eef4'; g.fillRect(0, 0, w, h); patch(g, w, h, 21, 70); g.fillStyle = '#1b2c8a'; g.font = '900 220px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('I', w / 2, h / 2); }, 512, 340, 0.012);

  return { L: 6.4, largeur: 2.6, hauteur: 2.13, xAvant: 3.18, xArriere: -3.16, roues, jante: '#f4f4f4', flanc: null };
}

export const GROUPE_3 = { E04: e04, E08: e08, F01: f01, F02: f02, F03: f03, F04: f04, F05: f05, F06: f06, F07: f07 };
