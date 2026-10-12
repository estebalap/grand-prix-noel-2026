/**
 * Bolides 3D « sur mesure » : carrosseries modélisées à la main d'après les vignettes validées (silhouette, proportions, détails),
 * pour les jouets dont la forme s'écarte trop du gabarit générique. Repère : avant = +x, sol y = 0, z = largeur.
 * Chaque constructeur reçoit le contexte { THREE, chassis, garde, envMap, animes } et renvoie
 * { L, largeur, hauteur, xAvant, xArriere, roues: [{ x, R, ep, avant }], jante?, flanc? }.
 * Aucune marque ni personnage : seuls des motifs et inscriptions génériques.
 */
import { outils } from './m3d/outils.js';
import { GROUPE_1 } from './m3d/groupe1.js';
import { GROUPE_2 } from './m3d/groupe2.js';
import { GROUPE_3 } from './m3d/groupe3.js';
import { GROUPE_4 } from './m3d/groupe4.js';
import { GROUPE_5 } from './m3d/groupe5.js';
import { GROUPE_6 } from './m3d/groupe6.js';
import { GROUPE_7 } from './m3d/groupe7.js';
import { GROUPE_8 } from './m3d/groupe8.js';
import { GROUPE_9 } from './m3d/groupe9.js';
import { GROUPE_10 } from './m3d/groupe10.js';


/* ---- H09 : petit camion plateau à cabine avancée (kei truck) ---- */
function camionPlateau(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx);
  const corps = o.lac('#6f8d99', 0.3, 0.45), noir = o.mat('#17181c', 0.6, 0.3);
  const W = 1.9;
  o.boite(6.0, 0.28, W * 0.9, noir, 0, 0.62, 0);                                                  // châssis noir
  o.profil([[0.3, 0.7], [0.3, 1.9], [0.55, 2.35], [2.0, 2.4], [2.45, 2.15], [2.9, 1.25], [3.0, 0.9], [2.9, 0.7]], W, corps, { galbe: { avant: 0.3, arriere: 0.2, fruit: 0.14, bombe: 0.05, lAv: 0.3, lAr: 0.2 } });   // cabine avancée
  o.profil([[0.62, 1.68], [0.78, 2.18], [1.95, 2.24], [2.28, 2.02], [2.62, 1.3], [0.62, 1.3]], W * 1.0, o.verre, { biseau: 0.02, galbe: false }); // vitrage enveloppant
  o.boite(0.2, 0.7, W * 0.92, noir, 3.02, 0.75, 0);                                               // pare-chocs noir
  o.boite(0.12, 0.34, W * 0.5, o.mat('#2b2d34', 0.5, 0.5), 3.03, 1.15, 0);                        // calandre
  o.boite(3.4, 0.16, W * 0.96, corps, -1.5, 1.0, 0);                                              // plancher du plateau
  for (const z of [-1, 1]) o.boite(3.4, 0.36, 0.1, corps, -1.5, 1.28, z * W * 0.46);              // ridelles
  o.boite(0.1, 0.36, W * 0.92, corps, -3.2, 1.28, 0); o.boite(0.1, 0.36, W * 0.92, corps, -0.1, 1.28, 0);
  for (const z of [-1, 1]) o.boite(1.5, 0.3, 0.08, noir, -1.9, 0.86, z * W * 0.5);                // bavettes
  o.decalFlanc((g, w, h) => { const c = ['#e2552b', '#f0a53a', '#f4d25a']; c.forEach((k, i) => { g.fillStyle = k; g.fillRect(0, 60 + i * 34, w, 22); }); }, 3.0, 0.75, -0.2, 1.35, W / 2 + 0.17);
  o.phares(2.98, 1.12, [-0.62, 0.62], 0.2, lumBlanche);
  o.boite(0.06, 0.2, 0.22, lumRouge, -3.27, 1.12, 0.8); o.boite(0.06, 0.2, 0.22, lumRouge, -3.27, 1.12, -0.8);
  return { L: 6.4, largeur: W, hauteur: 2.55, xAvant: 3.1, xArriere: -3.3, roues: [{ x: -1.95, R: 0.58, avant: false }, { x: 1.85, R: 0.6, avant: true }], jante: '#e0b84a', flanc: '#e0b84a' };
}

/* ---- H07 : camion-caisson noir et or, étrave étagée à l'avant ---- */
function camionCaisson(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx);
  const noir = o.lac('#14151a', 0.3, 0.5), or = o.lac('#d9a92a', 0.2, 0.9), noirM = o.mat('#1c1d23', 0.5, 0.4);
  const W = 2.0;
  for (const z of [-1, 1]) o.boite(4.6, 0.55, 0.14, or, -1.0, 0.66, z * (W / 2 - 0.05));        // jupes dorées
  o.boite(6.2, 0.3, W * 0.9, noirM, 0, 0.58, 0);
  o.profil([[-3.2, 0.82], [-3.2, 2.45], [1.15, 2.45], [1.15, 0.82]], W, noir, { galbe: { avant: 0.05, arriere: 0.06, fruit: 0.05, bombe: 0.015 }, biseau: 0.1 });   // caisson
  o.boite(4.0, 0.28, W * 0.7, noir, -1.3, 2.7, 0); o.boite(1.8, 0.14, W * 0.62, noir, 0.7, 2.62, 0); // dessus, rails
  for (const z of [-1, 1]) o.boite(4.0, 0.12, 0.1, or, -1.3, 2.52, z * 0.86);
  o.profil([[1.1, 0.82], [1.1, 2.3], [1.5, 2.45], [2.3, 2.2], [2.55, 1.6], [2.65, 0.82]], W * 0.96, noir, { galbe: { avant: 0.15, fruit: 0.08, bombe: 0.03 } });     // cabine
  for (let i = 0; i < 5; i++) o.boite(0.62 - i * 0.02, 0.07, W * 0.82 - i * 0.03, noirM, 1.75 + i * 0.16, 2.5 - i * 0.14, 0).rotation.z = -0.3;   // évents étagés
  o.boite(0.5, 0.5, W * 0.7, o.mat('#7a1d17', 0.5, 0.3), 2.5, 1.2, 0);                           // fond rouge sous l'étrave
  for (let i = 0; i < 4; i++) o.boite(0.55 - i * 0.04, 0.2, W * 1.0 - i * 0.12, noirM, 2.55 + i * 0.12, 0.62 + i * 0.26, 0).rotation.z = 0.0; // étrave en escalier
  o.decalFlanc((g, w, h) => {
    g.fillStyle = '#2a1c10'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9a92a'; g.lineWidth = 4; for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(60 + i * 110, 50 + j * 70, 34, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(60 + i * 110, 50 + j * 70, 20, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#f2ead4'; g.beginPath(); g.ellipse(250, 130, 70, 78, 0, 0, Math.PI * 2); g.fill();            // silhouette stylisée de félin (motif générique)
    g.beginPath(); g.moveTo(195, 80); g.lineTo(205, 35); g.lineTo(235, 68); g.closePath(); g.fill(); g.beginPath(); g.moveTo(300, 80); g.lineTo(292, 35); g.lineTo(265, 68); g.closePath(); g.fill();
    g.fillStyle = '#c3302a'; g.beginPath(); g.ellipse(625, 128, 150, 22, -0.05, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2ead4'; g.font = '900 56px Arial Black, Arial, sans-serif'; g.fillText('CHANCE', 505, 148);
  }, 4.1, 1.45, -1.05, 1.62, W / 2 + 0.16, 1024, 360);
  o.phares(2.66, 1.0, [-0.7, 0.7], 0.2, lumBlanche);
  o.boite(0.06, 0.22, 0.28, lumRouge, -3.24, 1.0, 0.72); o.boite(0.06, 0.22, 0.28, lumRouge, -3.24, 1.0, -0.72);
  return { L: 6.3, largeur: W, hauteur: 2.85, xAvant: 3.0, xArriere: -3.25, roues: [{ x: -2.0, R: 0.5, avant: false }, { x: 1.6, R: 0.5, avant: true }], jante: '#14151a', flanc: '#d9a92a' };
}

/* ---- H06 : fourgon postal bleu, moteur apparent à l'avant, grande aile arrière ---- */
function fourgonPostal(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx);
  const bleu = o.lac('#1e3fae', 0.22, 0.5), noir = o.mat('#15161b', 0.6, 0.3), blanc = o.lac('#f1f3f7', 0.3, 0.2), gris = o.mat('#8a8f99', 0.35, 0.7);
  const W = 2.1;
  o.boite(6.2, 0.2, W * 0.95, noir, 0, 0.42, 0);
  o.profil([[-3.0, 0.5], [-3.0, 2.25], [0.7, 2.3], [1.3, 2.1], [1.55, 1.65], [1.62, 1.4], [2.7, 1.3], [2.95, 1.0], [2.95, 0.5]], W, bleu, { galbe: { avant: 0.3, arriere: 0.12, fruit: 0.13, bombe: 0.04, lAv: 0.22 } });
  o.profil([[1.3, 1.78], [1.55, 1.7], [1.62, 1.42], [1.2, 1.5], [0.98, 2.0]], W * 0.9, o.verre, { biseau: 0.02, galbe: false });  // pare-brise
  for (const z of [-1, 1]) o.boite(1.05, 0.55, 0.05, o.verre, 0.55, 1.62, z * (W / 2 + 0.15));                                      // vitre de portière
  o.boite(2.6, 0.04, W * 0.62, o.mat('#0c1230', 0.1, 0.6), -1.0, 2.43, 0);                                                          // verrière de toit
  // moteur apparent : bloc gris, cylindres et compresseur chromé
  o.boite(1.0, 0.45, 1.0, gris, 2.3, 1.55, 0);
  for (let i = 0; i < 4; i++) for (const z of [-0.26, 0.26]) o.cyl(0.14, 0.14, 0.34, o.chrome, 1.95 + i * 0.22, 1.9, z);
  o.cyl(0.26, 0.26, 0.6, o.chrome, 2.55, 1.98, 0, Math.PI / 2, 0);
  o.boite(0.12, 0.7, W * 0.7, gris, 3.0, 0.82, 0);                                                                                  // calandre
  o.boite(0.3, 0.14, W * 1.0, noir, 3.1, 0.55, 0);                                                                                  // pare-chocs
  o.boite(0.5, 0.14, W * 0.9, noir, -3.25, 0.75, 0);                                                                                // barre arrière
  for (const z of [-1, 1]) {                                                                                                          // grande aile arrière blanche en volute
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.2, 0.55, 0), new THREE.Vector3(-1.2, 1.85, 0), new THREE.Vector3(-2.7, 1.1, 0));
    const t = new THREE.Mesh(garde2(ctx, new THREE.TubeGeometry(c, 20, 0.2, 8, false)), blanc); t.position.z = z * (W / 2 + 0.2); t.scale.z = 0.5; o.ajouter(t);
  }
  o.decalFlanc((g, w, h) => {
    g.fillStyle = '#d63a3a'; g.fillRect(0, 200, w, 14); g.fillStyle = '#f1f3f7'; g.fillRect(0, 214, w, 12); g.fillStyle = '#1e3fae'; g.fillRect(0, 226, w, 12);
    g.fillStyle = '#f1f3f7'; g.font = '900 64px Arial Black, Arial, sans-serif'; g.fillText('MAILED', 90, 120); g.fillStyle = '#ff7a2f'; g.fillText('IT !', 430, 120);
    g.fillStyle = '#f1f3f7'; g.font = '800 34px Arial, sans-serif'; g.fillText('ALWAYS ON TIME', 70, 170);
  }, 3.2, 0.8, -1.5, 1.3, W / 2 + 0.16);
  o.decalFlanc((g, w, h) => { g.fillStyle = '#12306f'; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, 7); g.fill(); g.fillStyle = '#ff7a2f'; g.font = '900 150px Arial Black'; g.fillText('5', w / 2 - 45, h / 2 + 52); }, 1.5, 0.75, 0, 0, 0, 256, 128);
  o.phares(3.0, 1.0, [-0.7, 0.7], 0.2, lumBlanche);
  o.boite(0.06, 0.2, 0.26, lumRouge, -3.04, 1.4, 0.8); o.boite(0.06, 0.2, 0.26, lumRouge, -3.04, 1.4, -0.8);
  return { L: 6.4, largeur: W, hauteur: 2.5, xAvant: 3.15, xArriere: -3.3, roues: [{ x: -1.95, R: 0.64, avant: false }, { x: 1.9, R: 0.52, avant: true }], jante: '#14151a', flanc: '#f1f3f7' };
}
function garde2(ctx, g) { ctx.garde(g); return g; }

/* ---- H08 : taxi hot-rod, grande cabine drapeau à l'arrière, long capot plat, blower chromé ---- */
function taxiHotRod(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx);
  const bleu = o.lac('#1b3a9c', 0.22, 0.5), noir = o.mat('#15161b', 0.6, 0.3);
  const W = 2.0;
  o.profil([[-3.9, 0.5], [-3.9, 2.4], [-3.5, 2.55], [-1.2, 2.5], [-0.8, 1.9], [-0.4, 1.55], [3.7, 1.5], [3.95, 1.3], [3.95, 0.62], [3.6, 0.5]], W, bleu, { galbe: { avant: 0.3, arriere: 0.22, fruit: 0.12, bombe: 0.05, lAv: 0.2, lAr: 0.18 } });
  o.boite(7.4, 0.16, W * 0.9, o.mat('#9aa0ab', 0.3, 0.9), 0, 0.46, 0);                           // soubassement chromé
  o.cyl(0.42, 0.45, 0.4, o.chrome, -3.1, 2.75, 0); o.boite(0.9, 0.3, 0.7, o.chrome, -3.1, 3.0, 0);  // blower + prise d'air
  for (const z of [-0.3, 0.3]) o.cyl(0.07, 0.07, 0.6, o.chrome, -3.75, 2.6, z, 0, 0.2);
  o.decalFlanc((g, w, h) => {
    const c = w / 2; g.fillStyle = '#1b3a9c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f2f2'; g.save(); g.translate(c, h / 2); g.rotate(Math.atan2(h, w)); g.fillRect(-w, -22, w * 2, 44); g.rotate(-2 * Math.atan2(h, w)); g.fillRect(-w, -22, w * 2, 44); g.restore();
    g.fillStyle = '#d02a35'; g.save(); g.translate(c, h / 2); g.rotate(Math.atan2(h, w)); g.fillRect(-w, -10, w * 2, 20); g.rotate(-2 * Math.atan2(h, w)); g.fillRect(-w, -10, w * 2, 20); g.restore();
    g.fillStyle = '#f2f2f2'; g.fillRect(c - 36, 0, 72, h); g.fillStyle = '#d02a35'; g.fillRect(c - 22, 0, 44, h); g.fillRect(0, h / 2 - 22, w, 44); g.fillStyle = '#f2f2f2'; g.fillRect(0, h / 2 - 36, w, 14); g.fillRect(0, h / 2 + 22, w, 14);
  }, 2.9, 1.5, -2.4, 1.6, W / 2 + 0.16, 512, 256);
  o.decalFlanc((g, w, h) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '900 180px Arial Black, Arial, sans-serif'; g.fillText('TAXI', 30, 190);
  }, 2.5, 0.62, 1.4, 1.05, W / 2 + 0.16, 640, 256);
  o.phares(3.92, 0.88, [-0.6, 0.6], 0.2, lumBlanche);
  o.boite(0.06, 0.24, 0.3, lumRouge, -3.94, 1.2, 0.7); o.boite(0.06, 0.24, 0.3, lumRouge, -3.94, 1.2, -0.7);
  return { L: 7.9, largeur: W, hauteur: 3.3, xAvant: 4.0, xArriere: -3.95, roues: [{ x: -2.55, R: 0.82, avant: false }, { x: 2.85, R: 0.58, avant: true }], jante: '#8f949d', flanc: null };
}

/* ---- H11 : dalle jaune « taxi » à pavillon blanc surélevé et prise d'air noire ---- */
function dalleTaxi(ctx) {
  const { THREE, lumBlanche, lumRouge } = ctx, o = outils(ctx);
  const jaune = o.lac('#e6b127', 0.22, 0.5), noir = o.mat('#13141a', 0.5, 0.4), blanc = o.lac('#f4f6fa', 0.2, 0.1);
  const W = 2.3;
  o.profil([[-3.8, 0.5], [-3.8, 1.55], [3.7, 1.62], [3.95, 1.3], [3.95, 0.62], [3.6, 0.5]], W, jaune, { galbe: { avant: 0.28, arriere: 0.12, fruit: 0.1, bombe: 0.04 }, biseau: 0.16 });
  o.profil([[-2.5, 1.5], [-2.0, 2.45], [0.2, 2.5], [0.9, 1.5]], W * 0.66, blanc, { galbe: { avant: 0.3, arriere: 0.3, lAv: 0.3, lAr: 0.3, fruit: 0.3, bombe: 0.14 }, biseau: 0.12 });
  o.boite(1.1, 0.12, 0.8, noir, -0.7, 1.6, 0);                                                    // socle noir du pavillon
  o.boite(0.8, 0.7, 0.8, noir, 1.5, 1.95, 0); o.boite(0.7, 0.14, 0.8, noir, 1.45, 2.36, 0).rotation.z = 0.15;   // prise d'air
  o.boite(0.12, 0.5, W * 0.8, o.mat('#aeb4bf', 0.3, 0.8), -3.86, 1.05, 0);                         // panneau arrière argent
  o.decalFlanc((g, w, h) => {
    g.fillStyle = '#d4442a'; g.fillRect(0, 36, w, 16); g.fillStyle = '#111'; g.font = 'italic 900 150px Arial Black, Arial, sans-serif'; g.fillText('TAXI', 160, 190);
    g.fillStyle = '#111'; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(560 + i * 70, 20 + j * 54, 70, 54);
  }, 4.6, 0.62, 0.3, 1.05, W / 2 + 0.17, 1024, 256);
  o.phares(3.94, 0.9, [-0.7, 0.7], 0.2, lumBlanche);
  o.boite(0.06, 0.2, 0.4, lumRouge, -3.88, 1.1, 0.75); o.boite(0.06, 0.2, 0.4, lumRouge, -3.88, 1.1, -0.75);
  return { L: 7.9, largeur: W, hauteur: 2.7, xAvant: 4.0, xArriere: -3.95, roues: [{ x: -2.3, R: 0.68, avant: false }, { x: 2.4, R: 0.62, avant: true }], jante: '#14151a', flanc: '#e8d9a8' };
}

const ANCIENS = { H09: camionPlateau, H07: camionCaisson, H06: fourgonPostal, H08: taxiHotRod, H11: dalleTaxi };
/** Les groupes (m3d/groupeN.js) priment sur les anciens constructeurs. */
export const MODELES_SUR_MESURE = { ...ANCIENS, ...GROUPE_1, ...GROUPE_2, ...GROUPE_3, ...GROUPE_4, ...GROUPE_5, ...GROUPE_6, ...GROUPE_7, ...GROUPE_8, ...GROUPE_9, ...GROUPE_10 };
