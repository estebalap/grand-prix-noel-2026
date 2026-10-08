/* Petits composants HTML réutilisés par la TV, le Pit et le Showroom. */
import { DATA, esc, logoUrl, team, car, teamColors } from './core.js';
import { carSvg } from './icons.js';
import { bolide2dSvg } from './bolides2d.js';
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

/* Vignettes studio : photo détourée de la vraie miniature (outils/generer_vignettes.py). Le manifeste est lu une fois,
   au chargement du module ; sur le site public (photos jamais publiées) il est absent et la silhouette dessinée reste. */
const VG_BASE = new URL('../photos/bolides/vignettes/', import.meta.url).href;
let VG = {};
try {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const minuteur = ctl ? setTimeout(() => ctl.abort(), 2500) : 0;
  const r = await fetch(VG_BASE + 'vignettes.json', { cache: 'no-cache', signal: ctl ? ctl.signal : undefined });
  clearTimeout(minuteur);
  if (r.ok) VG = await r.json();
} catch (e) { VG = {}; }
/** URL de la vignette détourée d'un bolide (ou null). */
export const vignetteDe = (code) => (code && VG[code] ? VG_BASE + VG[code].fichier : null);
export const infoVignette = (code) => (code && VG[code]) || null;

/* Visuel des cartes : « 2d » (défaut : portrait vectoriel néon, homogène sur toute la grille) ou « photo » (vignette
   détourée de la vraie miniature quand elle existe). ?art=photo ou ?art=2d dans l'adresse, mémorisé (clé gp.art.v2 :
   un ancien choix « photo » d'avant l'unification de la DA n'est pas repris). La fiche détaillée du Showroom montre
   toujours la photo réelle en aperçu secondaire (carArt(..., { photo: true })). */
let ART = '2d';
try {
  const q = new URLSearchParams(location.search).get('art');
  if (q === '2d' || q === 'photo') { ART = q; try { localStorage.setItem('gp.art.v2', q); } catch (e) { /* stockage indisponible */ } }
  else { const m = localStorage.getItem('gp.art.v2'); if (m === 'photo') ART = 'photo'; }
} catch (e) { ART = '2d'; }
export const visuelPrefere = () => ART;

/** Bolide :
    1. par défaut, le portrait vectoriel néon du bolide (shared/bolides2d.js : silhouette, livrée, jantes, accessoires),
       identique sur toutes les grilles (Showroom, Draft, TV, Pit) ;
    2. la vignette photo détourée en 2,5D seulement si opts.photo (aperçu secondaire de la fiche) ou ?art=photo
       (régie locale uniquement : les photos ne sont jamais publiées) ;
    3. sans portrait (relique ajoutée en direct, bolide inconnu) : silhouette teintée aux couleurs de l'écurie, ambre pour les reliques.
    opts.grand : grand format (flottement et lueur néon pour le portrait, reflet et inclinaison au pointeur pour la photo). */
export function carArt(code, teamId, uid, opts = {}) {
  const c = code ? car(code) : null;
  const id = uid || ('c' + Math.random().toString(36).slice(2, 7));
  let svg = c && !c.relic ? bolide2dSvg(code, id) : '';
  if (!svg) {
    const cols = c && c.relic ? ['#b8742a', '#f3d9a0'] : teamId != null ? teamColors(teamId) : ['#6b7bb8', '#cfd8ff'];
    const pal = carPalette(cols);
    svg = carSvg(pal[0], pal[1] || '#fff', id);
  }
  const v = (opts.photo || ART === 'photo') && code && VG[code];
  if (!v) return opts.grand && svg.includes('car-2d') ? `<div class="b2d grand">${svg}</div>` : svg;
  const url = VG_BASE + encodeURIComponent(v.fichier);
  const grand = opts.grand ? ' grand' : '';
  return `<div class="vgn${grand}" data-code="${esc(code)}" style="--vr:${Number(v.ratio) || 2.6};--vc:${esc(v.couleur)};--va:${esc(v.accent)};--vu:url('${url}')">` +
    `<div class="vgn-scene"><img class="vgn-img" src="${url}" alt="${esc(c ? c.alias || c.real_name : code)}" decoding="async" draggable="false" onerror="this.closest('.vgn').classList.add('ko')">` +
    `<i class="vgn-shine"></i><i class="vgn-refl"></i></div>${svg}</div>`;
}

/** Inclinaison 3D au pointeur (souris, doigt) des vignettes « grand » contenues dans root. Retourne une fonction d'arrêt. */
export function inclinerVignettes(root) {
  const els = [...(root || document).querySelectorAll('.vgn.grand')];
  const off = [];
  els.forEach((el) => {
    let raf = 0;
    const bouge = (e) => {
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.classList.add('suivi');
        el.style.setProperty('--ty', ((x - 0.5) * 26).toFixed(2) + 'deg');
        el.style.setProperty('--tx', ((0.5 - y) * 14).toFixed(2) + 'deg');
        el.style.setProperty('--lx', (x * 100).toFixed(1) + '%');
      });
    };
    const sort = () => { cancelAnimationFrame(raf); el.classList.remove('suivi'); el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); el.style.removeProperty('--lx'); };
    el.addEventListener('pointermove', bouge);
    el.addEventListener('pointerleave', sort);
    off.push(() => { el.removeEventListener('pointermove', bouge); el.removeEventListener('pointerleave', sort); });
  });
  return () => off.forEach((f) => f());
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
