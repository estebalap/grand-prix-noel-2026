/* HUD BROADCAST 4K VECTORIEL — dessiné APRÈS le post-traitement WebGL, directement à la résolution de sortie (3840×2160 en 4K).
   Grille de conception 1920×1080 ; tout est mis à l'échelle s = largeur / 1920 : traits, textes et jauges restent nets à toute définition.

   Cartels d'écuries façon broadcast F1 (couleurs, logo, pilote, Concept-Car, bolide ailier), chemin Monde natif → Portail → Ring, jauges de
   télémétrie (vitesse, angle de dérive β, accélération latérale), pastilles du Ring qui se remplissent, cartes des univers boss, étiquettes
   des pièges, règle sacrée des 41 mm, tableau des paris et rappel « Sans téléphone ? Pariez au carnet ! ».
   Règle d'affichage (CLAUDE.md §1.8) : on n'annonce JAMAIS le nombre de bolides à l'écran. */
import { urlWeb } from '../src/shared_bridge.js';
import { clamp, lerp, smoother } from './physique_cgi.js';

const OR = '#ffc83d', BLANC = '#f4f1ea';
const FONTS = [['Fredoka', 'fonts/fredoka-latin-700-normal.woff2', '700'], ['Fredoka', 'fonts/fredoka-latin-600-normal.woff2', '600'], ['Nunito', 'fonts/nunito-latin-800-normal.woff2', '800'], ['Nunito', 'fonts/nunito-latin-600-normal.woff2', '600']];
const TITRES_ACTE = { I: 'PROLOGUE · LA RAINBOW ROAD', II: 'ACTE II · LE MULTIVERS', III: 'ACTE III · LE LÂCHER', IV: 'ACTE IV · LES TROIS UNIVERS', V: 'ACTE V · L\'ARSENAL', VI: 'ACTE VI · LE GRAND PRIX' };
const UNIVERS = { gotham: { titre: 'GOTHAM', sous: 'La nuit, la pluie, l\'orage', couleur: '#c9d6ff' }, f1: { titre: 'FORMULE 1', sous: '310 – 330 km/h en formation', couleur: '#ff4a3a' }, apoca: { titre: 'APOCALYPSE', sous: 'Carcasses, fumée, réacteur', couleur: '#ff9a3a' } };

export async function creerHUD({ equipes, logos, regles, plan, tl, scenarios, MONDES, concepts, cars }) {
  for (const [fam, chemin, poids] of FONTS) { try { const f = new FontFace(fam, `url(${urlWeb(chemin)})`, { weight: poids }); await f.load(); document.fonts.add(f); } catch (e) { console.warn('Police HUD indisponible : ' + chemin); } }
  const alias = (code) => { const c = cars.find((x) => x.code === code); return c ? c.alias : code; };
  const groupes = [equipes.slice(0, 5), equipes.slice(5, 10), equipes.slice(10, 15)];

  function preparer(t, r) {
    const etat = r.etat, e = { t, etat, info: r.info || {}, sc: r.sc };
    return e;
  }

  /* ───────── primitives ───────── */
  const police = (px, famille = 'Fredoka', poids = 700) => `${poids} ${px}px "${famille}", "Nunito", system-ui, sans-serif`;
  function texte(g, s, str, x, y, { taille = 32, couleur = BLANC, famille = 'Fredoka', poids = 700, align = 'left', ombre = true, contour = 0, alpha = 1, espace = 0 } = {}) {
    g.save(); g.globalAlpha *= alpha; g.font = police(taille * s, famille, poids); g.textAlign = align; g.textBaseline = 'alphabetic';
    if (espace && 'letterSpacing' in g) g.letterSpacing = espace * s + 'px';
    if (ombre) { g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = 10 * s; g.shadowOffsetY = 2 * s; }
    if (contour) { g.lineWidth = contour * s; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineJoin = 'round'; g.strokeText(str, x * s, y * s); }
    g.fillStyle = couleur; g.fillText(str, x * s, y * s); g.restore();
  }
  const rectArr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function panneau(g, s, x, y, w, h, { fond = 'rgba(8,8,16,.78)', bord = 'rgba(255,255,255,.18)', r = 14, bandeau = null } = {}) {
    g.save(); rectArr(g, x * s, y * s, w * s, h * s, r * s); g.fillStyle = fond; g.fill(); g.lineWidth = 1.5 * s; g.strokeStyle = bord; g.stroke();
    if (bandeau) { g.clip(); g.fillStyle = bandeau; g.fillRect(x * s, y * s, 9 * s, h * s); }
    g.restore();
  }
  function jauge(g, s, cx, cy, rayon, v, vmax, couleur, titre, valeur, unite) {
    const a0 = Math.PI * 0.78, a1 = Math.PI * 2.22, k = clamp(Math.abs(v) / vmax);
    g.save(); g.lineCap = 'round'; g.lineWidth = 9 * s; g.strokeStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(cx * s, cy * s, rayon * s, a0, a1); g.stroke();
    g.strokeStyle = couleur; g.shadowColor = couleur; g.shadowBlur = 14 * s; g.beginPath(); g.arc(cx * s, cy * s, rayon * s, a0, a0 + (a1 - a0) * k); g.stroke(); g.restore();
    texte(g, s, valeur, cx, cy + 9, { taille: 34, align: 'center', poids: 700 });
    texte(g, s, unite, cx, cy + 34, { taille: 15, align: 'center', couleur: 'rgba(244,241,234,.7)', famille: 'Nunito', poids: 800, espace: 1 });
    texte(g, s, titre, cx, cy + rayon + 28, { taille: 14, align: 'center', couleur: couleur, famille: 'Nunito', poids: 800, espace: 2 });
  }
  function logo(g, s, im, cx, cy, rayon, c1, c2) {
    g.save(); g.beginPath(); g.arc(cx * s, cy * s, rayon * s, 0, 7); g.fillStyle = c1; g.fill();
    if (im) { g.save(); g.beginPath(); g.arc(cx * s, cy * s, (rayon - 4) * s, 0, 7); g.clip(); const sc = Math.max((2 * rayon - 8) / im.naturalWidth, (2 * rayon - 8) / im.naturalHeight) * s; g.drawImage(im, cx * s - im.naturalWidth * sc / 2, cy * s - im.naturalHeight * sc / 2, im.naturalWidth * sc, im.naturalHeight * sc); g.restore(); }
    g.lineWidth = 3 * s; g.strokeStyle = c2; g.beginPath(); g.arc(cx * s, cy * s, (rayon - 1) * s, 0, 7); g.stroke(); g.restore();
  }

  /* ───────── cadre permanent ───────── */
  function cadre(g, s, e) {
    const a = e.etat.acte, k = tl.actes.indexOf(a);
    texte(g, s, TITRES_ACTE[a.id] || a.titre, 56, 70, { taille: 26, couleur: OR, famille: 'Nunito', poids: 800, espace: 3 });
    for (let i = 0; i < tl.actes.length; i++) { g.save(); g.fillStyle = i <= k ? OR : 'rgba(255,255,255,.28)'; g.beginPath(); g.arc((62 + i * 22) * s, 92 * s, 6 * s, 0, 7); g.fill(); g.restore(); }
    texte(g, s, 'GRAND PRIX DE NOËL · 23 DÉC. 2026', 1864, 70, { taille: 20, align: 'right', couleur: 'rgba(244,241,234,.78)', famille: 'Nunito', poids: 800, espace: 2 });
    const bar = 1864 - 3.5 * 0; const pr = clamp(e.t / plan.duree);
    g.save(); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(56 * s, 1052 * s, 1808 * s, 4 * s); g.fillStyle = OR; g.fillRect(56 * s, 1052 * s, 1808 * s * pr, 4 * s); g.restore();
  }

  /* ───────── Acte II : cartel d'écurie + chemin Monde → Portail → Ring + télémétrie ───────── */
  function acteII(g, s, e) {
    const { etat, sc } = e;
    // vague + pastilles du Ring
    texte(g, s, etat.slot ? `VAGUE ${etat.slot.vague} / 3` : 'LE RING EST PLEIN', 56, 130, { taille: 20, couleur: 'rgba(244,241,234,.85)', famille: 'Nunito', poids: 800, espace: 3 });
    for (let k = 0; k < 15; k++) {
      const arrive = e.t >= tl.ecuries[k].impact, cur = etat.slot && etat.slot.k === k, cx = 66 + k * 30, cy = 1010;
      g.save(); g.beginPath(); g.arc(cx * s, cy * s, 10 * s, 0, 7); g.fillStyle = arrive ? equipes[k].colors[1] : 'rgba(255,255,255,.1)'; g.fill();
      g.lineWidth = 2.2 * s; g.strokeStyle = cur ? OR : 'rgba(255,255,255,.35)'; if (cur) { g.shadowColor = OR; g.shadowBlur = 12 * s; } g.stroke(); g.restore();
    }
    texte(g, s, 'DANS LE RING', 56, 984, { taille: 14, couleur: 'rgba(244,241,234,.7)', famille: 'Nunito', poids: 800, espace: 3 });
    if (!etat.slot) { if (e.t > tl.finEcuries) texte(g, s, 'TOUS EN PLACE', 960, 940, { taille: 60, align: 'center', couleur: OR, contour: 6, alpha: smoother((e.t - tl.finEcuries) / 0.3) }); return; }
    const k = etat.slot.k, eq = equipes[k], M = MONDES[k], info = concepts[k].v7.info || {};
    const a = smoother(etat.phase === 'B' ? 0.35 + etat.u * 1.2 : etat.uSlot * 2.2) , inB = etat.phase === 'B';
    // cartel à droite (espace négatif : la voiture est cadrée au tiers gauche en phase B)
    const x0 = 1200 + (1 - smoother(clamp(inB ? etat.u * 3 : 1))) * 40, y0 = 690, w = 664, h = 214;
    g.save(); g.globalAlpha = inB ? clamp(etat.u * 4) * (1 - clamp((etat.u - 0.93) / 0.07)) : 0.0 + 0.0;
    if (g.globalAlpha > 0.01) {
      panneau(g, s, x0, y0, w, h, { bandeau: eq.colors[1] });
      logo(g, s, logos[eq.id], x0 + 78, y0 + 78, 54, eq.colors[0], eq.colors[1]);
      texte(g, s, `ÉCURIE ${String(eq.id).padStart(2, '0')}`, x0 + 156, y0 + 42, { taille: 18, couleur: eq.colors[1] === '#09090b' ? '#ffffff' : eq.colors[1], famille: 'Nunito', poids: 800, espace: 3, ombre: false });
      texte(g, s, eq.name.toUpperCase(), x0 + 156, y0 + 84, { taille: eq.name.length > 24 ? 29 : 34, ombre: false });
      texte(g, s, `${eq.pilot}${eq.nickname ? ' · « ' + eq.nickname + ' »' : ''}`, x0 + 156, y0 + 118, { taille: 22, couleur: 'rgba(244,241,234,.9)', famille: 'Nunito', poids: 800, ombre: false });
      texte(g, s, `Concept-Car · ${info.nom || ''}`, x0 + 156, y0 + 156, { taille: 20, couleur: OR, famille: 'Nunito', poids: 800, ombre: false });
      texte(g, s, `Ailier · ${alias(M.ailier)}`, x0 + 156, y0 + 188, { taille: 19, couleur: 'rgba(244,241,234,.75)', famille: 'Nunito', poids: 600, ombre: false });
    }
    g.restore();
    // chemin MONDE → PORTAIL → RING
    const prog = inB ? 1 + etat.u : etat.u, nodes = [`MONDE · ${M.nom.toUpperCase()}`, 'PORTAIL', 'RING COMMUN'], bx = 470, by = 986, bw = 760;
    g.save(); g.globalAlpha = 0.95;
    g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(bx * s, by * s, bw * s, 5 * s);
    g.fillStyle = M.accent; g.shadowColor = M.accent; g.shadowBlur = 12 * s; g.fillRect(bx * s, by * s, bw * s * clamp(prog / 2), 5 * s); g.restore();
    nodes.forEach((n, i) => { const nx = bx + i * bw / 2, on = prog >= i - 0.001; g.save(); g.beginPath(); g.arc(nx * s, (by + 2.5) * s, 10 * s, 0, 7); g.fillStyle = on ? M.accent : 'rgba(30,30,44,1)'; g.fill(); g.lineWidth = 3 * s; g.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.4)'; g.stroke(); g.restore(); texte(g, s, n, nx, by - 18, { taille: 14, align: i === 0 ? 'left' : i === 2 ? 'right' : 'center', couleur: on ? '#fff' : 'rgba(244,241,234,.55)', famille: 'Nunito', poids: 800, espace: 2 }); });
    // télémétrie (jauges)
    const inf = e.info; if (inf.pc) {
      const bx2 = 1330, by2 = 930;
      jauge(g, s, bx2, by2, 46, inf.kmh, 330, '#7fd3ff', 'VITESSE', String(Math.round(Math.abs(inf.kmh))), 'km/h');
      jauge(g, s, bx2 + 130, by2, 46, inf.beta, 36, OR, 'DÉRIVE β', Math.abs(inf.beta).toFixed(0), '°');
      jauge(g, s, bx2 + 260, by2, 46, inf.aLat, 9000, '#ff7ad9', 'G LATÉRAL', (Math.abs(inf.aLat) / 9810 * 64).toFixed(1), 'g');
    }
    // flash de titre au franchissement
    const d = e.t - etat.slot.impact; if (d > -0.1 && d < 0.5) texte(g, s, 'PORTAIL FRANCHI', 960, 540, { taille: 54, align: 'center', couleur: M.accent, contour: 6, alpha: Math.exp(-Math.max(0, d) * 6) * clamp((d + 0.1) / 0.1) * 0.9, espace: 6 });
  }

  /* ───────── autres actes ───────── */
  function acteI(g, s, e) {
    const t = e.t, a = smoother((t - 0.8) / 0.6) * (1 - smoother((t - 3.2) / 0.5));
    texte(g, s, 'LA RAINBOW ROAD', 960, 520, { taille: 96, align: 'center', couleur: BLANC, contour: 8, alpha: a, espace: 6 });
    texte(g, s, 'cinq voies · une seule place sur le trône', 960, 580, { taille: 30, align: 'center', couleur: OR, famille: 'Nunito', poids: 800, alpha: a, espace: 3 });
    if (t > 3.8 && t < 8.2 && e.info.kmh != null) jauge(g, s, 1730, 930, 56, e.info.kmh, 330, '#7fd3ff', 'VITESSE', String(Math.round(e.info.kmh)), 'km/h');
    if (t > 9.5) texte(g, s, 'L\'ARÈNE', 960, 940, { taille: 70, align: 'center', couleur: OR, contour: 7, alpha: smoother((t - 9.5) / 0.4), espace: 8 });
  }
  function acteIII(g, s, e) {
    const t = e.t; const manche = t < 58.4 ? 'A' : t < 61.4 ? 'B' : 'C';
    if (t < 62) { texte(g, s, `LE LÂCHER · MANCHE ${manche}`, 960, 150, { taille: 52, align: 'center', couleur: BLANC, contour: 6, espace: 5, alpha: smoother((t - 53.4) / 0.4) }); if (e.info.kmh) jauge(g, s, 1730, 930, 56, e.info.kmh, 330, '#7fd3ff', 'VITESSE', String(Math.round(e.info.kmh)), 'km/h'); }
    else if (t < 64.4) texte(g, s, 'CAISSES MYSTÈRES', 960, 940, { taille: 64, align: 'center', couleur: '#e3c8ff', contour: 7, espace: 6, alpha: smoother((t - 62) / 0.4) });
    else texte(g, s, '???', 960, 600, { taille: 200, align: 'center', couleur: '#9ffbff', contour: 10, alpha: 0.9 * smoother((t - 65.5) / 1.2) * (Math.floor(t * 10) % 13 === 0 ? 0.4 : 1) });
  }
  function acteIV(g, s, e) {
    const u = e.etat.univers; if (!u) return; const U = UNIVERS[u.id], d = e.t - u.debut, a = smoother(d / 0.4) * (1 - smoother((d - (u.fin - u.debut - 0.5)) / 0.4));
    panneau(g, s, 56, 780, 640, 190, { bandeau: U.couleur, fond: 'rgba(6,6,14,.8)' });
    g.save(); g.globalAlpha = a;
    texte(g, s, U.titre, 96, 862, { taille: 72, couleur: U.couleur, contour: 0, ombre: false, espace: 4 });
    texte(g, s, U.sous, 100, 902, { taille: 24, couleur: 'rgba(244,241,234,.9)', famille: 'Nunito', poids: 800, ombre: false });
    const lignes = u.id === 'gotham' ? [alias('B16')] : u.id === 'f1' ? [alias('F01') + '  ·  ' + alias('F02')] : [alias('N12') + '  vs  ' + alias('N13')];
    texte(g, s, lignes[0], 100, 944, { taille: 20, couleur: OR, famille: 'Nunito', poids: 800, ombre: false });
    g.restore();
    if (u.id === 'f1' && e.info.kmh) jauge(g, s, 1730, 930, 56, e.info.kmh, 360, '#ff4a3a', 'VITESSE', String(Math.round(e.info.kmh)), 'km/h');
  }
  function acteV(g, s, e) {
    const A = plan.actes.find((x) => x.id === 'V'), tt = e.t - A.debut, SEG = 1.2;
    if (e.info.piege) { const i = Math.floor(tt / SEG), u = (tt - i * SEG) / SEG, a = smoother(u * 6) * (1 - smoother((u - 0.85) / 0.15)); panneau(g, s, 56, 840, 560, 120, { bandeau: OR, fond: 'rgba(6,6,14,.82)' }); g.save(); g.globalAlpha = a; texte(g, s, `PIÈGE ${i + 1} / 10`, 92, 884, { taille: 20, couleur: OR, famille: 'Nunito', poids: 800, espace: 3, ombre: false }); texte(g, s, e.info.piege.toUpperCase(), 92, 938, { taille: 46, ombre: false }); g.restore(); }
    else if (e.info.titre === 'RÈGLE SACRÉE') {
      const u = clamp((e.t - A.debut - 12) / 3.2);
      panneau(g, s, 56, 700, 760, 250, { bandeau: '#ff3b3b', fond: 'rgba(6,6,14,.84)' });
      texte(g, s, 'LA RÈGLE SACRÉE', 96, 762, { taille: 24, couleur: '#ff6a5a', famille: 'Nunito', poids: 800, espace: 4, ombre: false });
      texte(g, s, 'RIEN DE RIGIDE', 96, 836, { taille: 62, ombre: false }); texte(g, s, 'SOUS 41 mm', 96, 906, { taille: 78, couleur: OR, ombre: false });
      g.save(); g.globalAlpha = 0.5 + 0.5 * smoother(u * 3); g.strokeStyle = '#ff3b3b'; g.lineWidth = 5 * s; g.setLineDash([14 * s, 8 * s]); g.beginPath(); g.moveTo(520 * s, 920 * s); g.lineTo(780 * s, 920 * s); g.stroke(); g.restore();
    } else {
      const u = clamp((e.t - A.debut - 15.2) / 1), a = smoother(u);
      panneau(g, s, 360, 170, 1200, 740, { fond: 'rgba(7,7,16,.86)', bord: 'rgba(255,200,61,.55)' });
      g.save(); g.globalAlpha = a;
      texte(g, s, 'TABLEAU DES PARIS DE FAMILLE', 960, 252, { taille: 52, align: 'center', couleur: OR, ombre: false, espace: 4 });
      groupes.forEach((gr, i) => {
        const x = 410 + i * 380; texte(g, s, `GROUPE ${'ABC'[i]}`, x, 330, { taille: 22, couleur: 'rgba(244,241,234,.7)', famille: 'Nunito', poids: 800, espace: 4, ombre: false });
        gr.forEach((eq, j) => { const y = 370 + j * 56; g.save(); g.beginPath(); g.arc((x + 16) * s, (y - 8) * s, 12 * s, 0, 7); g.fillStyle = eq.colors[1]; g.fill(); g.lineWidth = 2.5 * s; g.strokeStyle = eq.colors[0] === '#000000' ? '#fff' : eq.colors[0]; g.stroke(); g.restore(); texte(g, s, eq.name, x + 40, y, { taille: 23, couleur: BLANC, famille: 'Nunito', poids: 800, ombre: false }); });
      });
      const R = regles.rules || regles;
      texte(g, s, `Chacun démarre avec ${R.startCoins ?? 100} pièces · mise minimale ${R.betMin ?? 5} · jusqu'à ${R.betMaxPct ?? 50} % du pot`, 960, 700, { taille: 26, align: 'center', couleur: BLANC, famille: 'Nunito', poids: 800, ombre: false });
      texte(g, s, 'Pariez en direct depuis votre téléphone', 960, 758, { taille: 34, align: 'center', couleur: '#7fd3ff', ombre: false });
      texte(g, s, 'Sans téléphone ? Pariez au carnet !', 960, 840, { taille: 46, align: 'center', couleur: OR, ombre: false, espace: 2 });
      g.restore();
    }
  }
  function acteVI(g, s, e) {
    const t = e.t, tb = 111.0, d = t - tb;
    if (d >= 0 && d < 3.6) { const k = smoother(d / 0.25), sc2 = 1 + 0.08 * Math.sin(d * 5); g.save(); g.translate(960 * s, 480 * s); g.scale(sc2 * (0.8 + 0.2 * k), sc2 * (0.8 + 0.2 * k)); g.translate(-960 * s, -480 * s); texte(g, s, 'FAITES VOS JEUX !', 960, 500, { taille: 150, align: 'center', couleur: OR, contour: 12, espace: 4, alpha: k * (1 - smoother((d - 3.0) / 0.6)) }); g.restore(); }
    if (t > 115.2) { const a = smoother((t - 115.2) / 0.8); texte(g, s, 'GRAND PRIX DE NOËL', 960, 880, { taille: 110, align: 'center', couleur: BLANC, contour: 9, espace: 8, alpha: a }); texte(g, s, '23 DÉCEMBRE 2026', 960, 948, { taille: 42, align: 'center', couleur: OR, famille: 'Nunito', poids: 800, espace: 8, alpha: a }); }
  }

  function dessiner(g, W, H, e) {
    const s = W / 1920; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const id = e.etat.acte.id;
    cadre(g, s, e);
    ({ I: acteI, II: acteII, III: acteIII, IV: acteIV, V: acteV, VI: acteVI })[id](g, s, e);
    g.restore();
  }
  return { preparer, dessiner };
}
