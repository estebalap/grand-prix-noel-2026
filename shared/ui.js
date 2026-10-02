/* Petits composants HTML réutilisés par la TV, le Pit et le Showroom. */
import { DATA, esc, logoUrl, team, car, teamColors } from './core.js';
import { carSvg } from './icons.js';
import { carPalette } from './stage3d.js';

export const pad2 = (n) => String(n).padStart(2, '0');

/** Médaille ronde avec le vrai logo de l'écurie (fond échantillonné sur l'image). */
export function medal(id, size = 64, extra = '') {
  const m = DATA.logos[id] || {};
  const t = team(id);
  return `<div class="medal ${extra}" style="width:${size}px;height:${size}px;background:${m.bg || '#fff'}"><img src="${logoUrl(id)}" alt="${esc(t ? t.name : '')}" loading="lazy" draggable="false"></div>`;
}
export function ghostMedal(size = 64) {
  return `<div class="medal ghost" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#1a2152,#0c1331);display:grid;place-items:center;color:var(--ink-faint);font:700 ${size * .42}px var(--font-display)">?</div>`;
}

/** Silhouette de bolide teintée aux couleurs de l'écurie (ou ambre pour les reliques / fantômes). */
export function carArt(code, teamId, uid) {
  const c = code ? car(code) : null;
  const cols = c && c.relic ? ['#b8742a', '#f3d9a0'] : teamId != null ? teamColors(teamId) : ['#6b7bb8', '#cfd8ff'];
  const pal = carPalette(cols);
  return carSvg(pal[0], pal[1] || '#fff', uid || ('c' + Math.random().toString(36).slice(2, 7)));
}

const STAT_DEFS = [['vitesse', 'Vitesse', '#4cc9f0', '#9b6bff'], ['aerodynamisme', 'Aéro', '#3ddc97', '#4cc9f0'], ['resistance_banane', 'Anti-banane', '#ffd166', '#ff9f1c'], ['facteur_chaos', 'Chaos', '#ff4d6d', '#ff9f1c'], ['intimidation', 'Intimidation', '#9b6bff', '#ff4d6d']];
export function statBars(c, n = 5) {
  return STAT_DEFS.slice(0, n).map(([k, l, a, b]) => `<div class="stat"><span>${l}</span><div class="bar" style="--c1:${a};--c2:${b}"><i style="width:${Math.max(4, Math.min(100, c[k] ?? 0))}%"></i></div><b>${c[k] ?? '–'}</b></div>`).join('');
}
export const hexA = (hex, a) => {
  const h = hex.replace('#', ''); const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`;
};
/** Éclaircit/assombrit pour garantir une couleur lisible sur fond nuit. */
export function legible(hex) {
  const h = hex.replace('#', ''); const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  if (L > 60) return hex;
  const k = 1.9; return `rgb(${Math.min(255, r * k + 70)},${Math.min(255, g * k + 70)},${Math.min(255, b * k + 70)})`;
}
export function teamAccent(id) { const [a, b] = teamColors(id); return legible(a === '#000000' || a === '#09090b' ? (b || a) : a); }
