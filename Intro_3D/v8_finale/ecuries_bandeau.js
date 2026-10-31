/* BANDEAU « ÉCRAN DE SÉLECTION » des écuries (V8, segment ecuries) — habillage 2D, fonction pure du temps.

   Une seule bannière pop asymétrique en bas à gauche, façon jeu de combat (Smash Bros / Mario Kart) :
     (1) badge géant « #01 » aux couleurs de l'écurie (logo de l'écurie en fond, voilé de la couleur, AUCUN texte en plus),
     (2) plaque du NOM DE L'ÉCURIE (typographie Fredoka 700, capitales, ajustée à la largeur),
     (3) ligne « pilote · bolide » (Nunito 900).
   Exactement 3 textes. Tout est tracé dans un repère virtuel 1920 × 1080 (g.scale(W / 1920)), entièrement sous la ligne
   y = 790 (la zone sacrée s'arrête à y = 756) : surface ≈ 7 % de l'écran.

   Animation DOUCE à chaque changement d'écurie (τ = t − début du créneau, durée D du créneau lue dans le plan) :
     0,10 → 0,60 s  le badge s'ouvre (échelle 0,7 → 1, léger dépassement, rotation −14° → −6°) en fondu
     0,18 → 0,70 s  la plaque du nom glisse depuis la gauche (easeOutCubic, sans rebond)
     0,26 → 0,78 s  la ligne pilote · bolide suit
     D − 0,45 → D − 0,15 s  sortie en fondu, glissement vers la gauche */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const C1 = 1.70158, C3 = C1 + 1;
/** easeOutBack : dépasse légèrement 1 puis revient (rebond « pop ») */
const backOut = (u) => { const k = clamp(u) - 1; return 1 + C3 * k * k * k + C1 * k * k; };
const easeOut = (u) => { const k = 1 - clamp(u); return 1 - k * k * k; };
const doux = (u) => { const k = clamp(u); return k * k * (3 - 2 * k); };

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

  /** Dessine la bannière de l'écurie k ; τ = temps local du créneau, duree = longueur du créneau (plan_v8.json) */
  function dessiner(g, W, H, k, tau, duree = 3.0) {
    const f = fiches[k]; if (!f) return;
    const s = W / 1920;
    g.save(); g.scale(s, s);
    if (tau < 0.1 || tau > duree - 0.15) { g.restore(); return; }
    // sortie douce commune (fin de créneau)
    const sortie = doux((tau - (duree - 0.45)) / 0.3);
    g.translate(-160 * sortie, 0); g.globalAlpha = 1 - sortie;

    /* ── (3) ligne pilote · bolide ── */
    const uL = easeOut((tau - 0.26) / 0.52), dxL = -420 * (1 - uL);
    if (tau > 0.26) {
      g.save(); g.translate(dxL, 0); g.globalAlpha *= doux(uL * 1.6);
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
    const uN = easeOut((tau - 0.18) / 0.52), dxN = -460 * (1 - uN);
    if (tau > 0.18) {
      g.save(); g.translate(dxN, 0); g.globalAlpha *= doux(uN * 1.6);
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
    const uB = clamp((tau - 0.1) / 0.5), sB = 0.7 + 0.3 * (1 + (backOut(uB) - 1) * 0.35);          // dépassement adouci (≈ 3 %)
    const echelle = Math.max(0.001, sB), rot = (-14 + 8 * easeOut(uB)) * Math.PI / 180;
    {
      g.save(); g.translate(150, 912); g.rotate(rot); g.scale(echelle, echelle); g.globalAlpha *= doux(uB * 2);
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
