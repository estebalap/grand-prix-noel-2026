/* RARETÉ des bolides : 5 paliers, leurs codes visuels (néon, carte, particules d'apparition) et leurs petits
   composants HTML. Le palier vient du champ « rarete » de cars.json (outils/plume_acide.py). */
import { esc } from './core.js';

export const RARETES = {
  standard: {
    nom: 'Standard / Déclassé', court: 'DÉCLASSÉ', rang: 0,
    couleur: '#9aa6c4', lueur: '#6f7da3', carte: ['#20263d', '#151a2b'],
    particules: { n: 40, couleurs: ['#c9d2e6', '#8c97b3'], taille: 0.07, vitesse: 2.2 },
  },
  rare: {
    nom: 'Rare', court: 'RARE', rang: 1,
    couleur: '#3fa9ff', lueur: '#1f7bff', carte: ['#0f2a55', '#0a1733'],
    particules: { n: 80, couleurs: ['#7cc8ff', '#3fa9ff', '#ffffff'], taille: 0.09, vitesse: 3 },
  },
  epique: {
    nom: 'Épique', court: 'ÉPIQUE', rang: 2,
    couleur: '#b06bff', lueur: '#8a3dff', carte: ['#331660', '#1b0b36'],
    particules: { n: 140, couleurs: ['#d6a8ff', '#b06bff', '#ff7ad9'], taille: 0.1, vitesse: 3.6 },
  },
  legendaire: {
    nom: 'Légendaire', court: 'LÉGENDAIRE', rang: 3,
    couleur: '#ffc83d', lueur: '#ff9f1a', carte: ['#5a3a06', '#2a1a02'],
    particules: { n: 220, couleurs: ['#fff1b8', '#ffc83d', '#ff9f1a'], taille: 0.12, vitesse: 4.4, rayons: true },
  },
  relique_interdite: {
    nom: 'Relique Interdite', court: 'RELIQUE INTERDITE', rang: 4,
    couleur: '#ff2d55', lueur: '#d10032', carte: ['#3d0010', '#120004'],
    particules: { n: 260, couleurs: ['#ff2d55', '#ff8aa0', '#1a0006'], taille: 0.12, vitesse: 5, rayons: true, glitch: true },
  },
};
export const PALIERS = Object.keys(RARETES);

/** Palier d'un bolide (défaut : standard ; les reliques ajoutées en direct sont des « reliques interdites »). */
export function rareteDe(c) {
  if (!c) return 'standard';
  if (RARETES[c.rarete]) return c.rarete;
  return c.relic ? 'relique_interdite' : 'standard';
}
export const infoRarete = (c) => RARETES[rareteDe(c)];

/** Badge compact : « ◆ ÉPIQUE ». */
export function badgeRarete(c, { long = false } = {}) {
  const id = rareteDe(c), r = RARETES[id];
  return `<span class="rar-badge rar-${id}" style="--rar:${r.couleur};--rar-l:${r.lueur}" title="${esc(r.nom)}">${'◆'.repeat(r.rang + 1)} ${esc(long ? r.nom.toUpperCase() : r.court)}</span>`;
}

/** Style CSS (variables) à poser sur une carte : couleur de bordure, lueur et dégradé de fond du palier. */
export function styleRarete(c) {
  const r = infoRarete(c);
  return `--rar:${r.couleur};--rar-l:${r.lueur};--rar-c1:${r.carte[0]};--rar-c2:${r.carte[1]}`;
}

/** Cote affichée : cote affinée par les essais chronométrés si elle existe, sinon cote initiale. */
export function coteAffichee(c) {
  const k = c && c.essais && c.essais.cote_affinee ? c.essais.cote_affinee : c && c.cote_initiale;
  return k ? { cote: k, affinee: !!(c.essais && c.essais.cote_affinee) } : null;
}
