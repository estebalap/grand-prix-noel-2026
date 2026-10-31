/* BANDEAU « ÉCRAN DE SÉLECTION » des écuries (V8, segment ecuries) — habillage 2D, fonction pure du temps.

   Une seule bannière pop asymétrique en bas à gauche, façon jeu de combat (Smash Bros / Mario Kart) :
     (1) badge géant « #01 » aux couleurs de l'écurie (logo de l'écurie en fond, voilé de la couleur, AUCUN texte en plus),
     (2) plaque du NOM DE L'ÉCURIE (typographie Fredoka 700, capitales, ajustée à la largeur),
     (3) ligne « pilote · bolide » (Nunito 900).
   Exactement 3 textes. Tout est tracé dans un repère virtuel 1920 × 1080 (g.scale(W / 1920)), entièrement sous la ligne
   y = 790 (la zone sacrée s'arrête à y = 756) : surface ≈ 7 % de l'écran.

   Animation à chaque changement d'écurie (τ = t − début du créneau, créneau de 2,0 s) :
     0,00 → 0,26 s  le badge jaillit (échelle « back-out », rotation −30° → −6°)
     0,06 → 0,38 s  la plaque du nom glisse depuis la gauche avec un léger rebond
     0,14 → 0,46 s  la ligne pilote · bolide suit
     impact (0,8 s) le badge cogne au temps fort musical (coup d'échelle amorti)
     1,88 → 2,00 s  sortie éclair vers le bas-gauche (la bannière suivante pop aussitôt) */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const C1 = 1.70158, C3 = C1 + 1;
/** easeOutBack : dépasse légèrement 1 puis revient (rebond « pop ») */
const backOut = (u) => { const k = clamp(u) - 1; return 1 + C3 * k * k * k + C1 * k * k; };
const easeIn = (u) => { const k = clamp(u); return k * k * k; };

/** Luminance relative approximative d'une couleur « #rrggbb » (choix du texte clair ou foncé sur la plaque) */
function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Parallélogramme penché (biais horizontal `bi` en haut vers la droite) */
function para(g, x, y, w, h, bi) { g.beginPath(); g.moveTo(x + bi, y); g.lineTo(x + w + bi, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); }
/** Carré arrondi centré */
function carre(g, c, r) { g.beginPath(); g.moveTo(-c + r, -c); g.arcTo(c, -c, c, c, r); g.arcTo(c, c, -c, c, r); g.arcTo(-c, c, -c, -c, r); g.arcTo(-c, -c, c, -c, r); g.closePath(); }

/** Police ajustée : réduit la taille jusqu'à ce que `str` tienne dans `largeurMax` (mesure dans le repère virtuel) */
function ajuster(g, str, famille, poids, taille, largeurMax, tailleMin) {
  let t = taille;
  for (; t > tailleMin; t -= 2) { g.font = `${poids} ${t}px "${famille}", "Nunito", system-ui, sans-serif`; if (g.measureText(str).width <= largeurMax) break; }
  g.font = `${poids} ${t}px "${famille}", "Nunito", system-ui, sans-serif`;
  return { taille: t, largeur: g.measureText(str).width };
}

/**
 * Prépare les fiches des 15 écuries (textes figés une fois pour toutes).
 * @param equipes data/teams.json ; @param infoConcept (id) → { nom } ; @param logos { id: HTMLImageElement }
 */
export function creerBandeau({ equipes, infoConcept, logos = {} }) {
  const fiches = equipes.map((e, k) => {
    const c = infoConcept(e.id);
    return {
      k, id: e.id,
      numero: '#' + String(e.id).padStart(2, '0'),
      nom: e.name.toUpperCase(),
      ligne: `${e.pilot} · ${c ? c.nom : e.name}`,
      fonce: e.colors[0], vif: e.colors[1], logo: logos[e.id] || null,
    };
  });

  /** Dessine la bannière de l'écurie k ; τ = temps local du créneau, tImpact = instant du temps fort (local), duree = longueur du créneau */
  function dessiner(g, W, H, k, tau, tImpact = 0.8, duree = 2.0) {
    const f = fiches[k]; if (!f) return;
    const s = W / 1920;
    g.save(); g.scale(s, s);
    // sortie éclair commune (fin de créneau)
    const sortie = easeIn((tau - (duree - 0.12)) / 0.12);
    g.translate(-520 * sortie, 120 * sortie); g.globalAlpha = 1 - sortie;

    /* ── (3) ligne pilote · bolide ── */
    const uL = backOut((tau - 0.14) / 0.32), dxL = -820 * (1 - uL);
    if (tau > 0.14) {
      g.save(); g.translate(dxL, 0);
      const fl = ajuster(g, f.ligne, 'Nunito', 900, 34, 600, 22);
      const wl = fl.largeur + 70, xl = 250, yl = 944, hl = 52;
      g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
      para(g, xl, yl, wl, hl, 16); g.fillStyle = f.vif; g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = luminance(f.vif) > 0.45 ? '#120c1e' : '#ffffff';
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(f.ligne, xl + 46, yl + hl / 2 + 1);
      g.restore();
    }

    /* ── (2) plaque du nom ── */
    const uN = backOut((tau - 0.06) / 0.32), dxN = -900 * (1 - uN);
    if (tau > 0.06) {
      g.save(); g.translate(dxN, 0);
      const fn = ajuster(g, f.nom, 'Fredoka', 700, 66, 640, 34);
      const wn = fn.largeur + 96, xn = 236, yn = 846, hn = 92;
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; g.shadowOffsetY = 5;
      para(g, xn, yn, wn, hn, 22);
      const gr = g.createLinearGradient(xn, yn, xn, yn + hn); gr.addColorStop(0, 'rgba(22,18,40,0.94)'); gr.addColorStop(1, 'rgba(6,5,14,0.94)');
      g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
      // liseré aux couleurs de l'écurie : filet vif en bas + éclat en biais à droite
      para(g, xn, yn + hn - 7, wn, 7, 0.5); g.fillStyle = f.vif; g.fill();
      para(g, xn + wn - 26, yn, 18, hn, 22); g.fillStyle = f.vif; g.fill();
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.9)'; g.strokeText(f.nom, xn + 54, yn + hn / 2 + 2);
      g.fillStyle = '#ffffff'; g.fillText(f.nom, xn + 54, yn + hn / 2 + 2);
      g.restore();
    }

    /* ── (1) badge #numéro (au premier plan) ── */
    const uB = backOut(tau / 0.26), dI = tau - tImpact;
    const coup = dI >= 0 ? 0.12 * Math.exp(-dI * 9) * Math.cos(dI * 30) : 0;     // coup amorti au temps fort
    const echelle = Math.max(0.001, uB * (1 + coup)), rot = (-30 + 24 * clamp(tau / 0.26)) * Math.PI / 180;
    if (tau > 0) {
      g.save(); g.translate(150, 912); g.rotate(rot); g.scale(echelle, echelle);
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 22; g.shadowOffsetY = 6;
      carre(g, 104, 30); g.fillStyle = f.fonce; g.fill(); g.shadowColor = 'transparent';
      // fond : logo de l'écurie voilé de sa couleur (remplace l'aplat, n'ajoute aucun texte)
      g.save(); carre(g, 94, 24); g.clip();
      if (f.logo && f.logo.naturalWidth) {
        const iw = f.logo.naturalWidth, ih = f.logo.naturalHeight, kk = 188 / Math.min(iw, ih);
        g.drawImage(f.logo, -iw * kk / 2, -ih * kk / 2, iw * kk, ih * kk);
        const voile = g.createLinearGradient(0, -94, 0, 94); voile.addColorStop(0, f.vif + 'aa'); voile.addColorStop(1, f.fonce + 'ee');
        g.fillStyle = voile; g.fillRect(-94, -94, 188, 188);
      } else {
        const gr = g.createLinearGradient(-94, -94, 94, 94); gr.addColorStop(0, f.vif); gr.addColorStop(1, f.fonce);
        g.fillStyle = gr; g.fillRect(-94, -94, 188, 188);
      }
      g.restore();
      carre(g, 99, 27); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
      // numéro géant
      g.font = '700 104px "Fredoka", "Nunito", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = 'rgba(0,0,0,.92)'; g.strokeText(f.numero, 0, 6);
      g.fillStyle = '#ffffff'; g.fillText(f.numero, 0, 6);
      g.restore();
    }
    g.restore();
  }
  return { fiches, dessiner };
}
