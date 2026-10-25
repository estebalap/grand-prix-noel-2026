/* RARETÉ des bolides : 5 paliers, leurs codes visuels (néon, carte, particules d'apparition) et leurs petits
   composants HTML. Le palier vient du champ « rarete » de cars.json (outils/plume_acide.py).

   RARETÉS SIGNATURE (hors normes) : un bolide peut porter en plus un champ « rarete_custom » (handicap, vocaloid, drone,
   sncf, critair5, startup, epave). C'est une COUCHE D'HABILLAGE : le palier de base (« rarete ») reste la seule valeur lue
   par le moteur de course, la lootbox et les cotes ; rareteDe() ne change donc pas. Seuls l'affichage (badge, couleurs,
   carte), le reveal (grand badge, particules, jingle, filtre) lisent le profil custom, via infoRarete()/badgeRarete(). */
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

/* Profils signature. « sig » = ce que le reveal joue à la place de la signature par défaut du bolide
   (particules : noms de PARTICULES_SIGNATURE, jingle : nom de signatures.js, filtre : FILTRES_SIGNATURE).
   « court » est le texte du badge (surchargeable bolide par bolide avec le champ « badge_custom »). */
export const CUSTOM = {
  handicap: {
    nom: 'Rareté Handicap', court: '♿ ACCÈS PRIORITAIRE', couleur: '#ffd400', lueur: '#1f6bff', carte: ['#0a2a73', '#06142f'],
    sig: { particules: ['bequilles', 'etincelles_meca'], jingle: 'moniteur_bip', filtre: 'vhs' },
  },
  vocaloid: {
    nom: 'Rareté Idol / Vocaloid', court: '🎵 VOCALOID 39', couleur: '#2de2ee', lueur: '#00a9c4', carte: ['#05282f', '#020f13'],   // cyan de Hatsune Miku
    arche: 'manga',
    sig: { particules: ['notes', 'coeurs_pixel'], jingle: 'vocaloid_39', filtre: 'pixel' },
  },
  drone: {
    nom: 'Rareté Drone', court: '🚁 ESPACE AÉRIEN', couleur: '#4dff7a', lueur: '#00c46a', carte: ['#04200f', '#010a05'],
    arche: 'gothique',
    sig: { particules: ['vent', 'poussiere_rotor'], jingle: 'helices_drone', filtre: 'nocturne' },
  },
  sncf: {
    nom: 'Rareté SNCF', court: '⚠️ PRÉAVIS RECONDUCTIBLE', couleur: '#e0204f', lueur: '#7a0f2b', carte: ['#3a0716', '#12030a'],
    arche: 'vintage',
    sig: { particules: ['vapeur_blanche', 'feuilles_mortes'], jingle: 'carillon_gare', filtre: 'neige_tv' },
  },
  critair5: {
    nom: "Rareté Crit'Air 5", court: "🏭 CRIT'AIR 5", couleur: '#a8a8b3', lueur: '#ff6a00', carte: ['#1d1d22', '#08080a'],
    sig: { particules: ['huile', 'cendres'], jingle: 'toux_diesel', filtre: 'thermique' },
  },
  startup: {
    nom: 'Rareté Start-Up', court: '🚀 LEVÉE DE FONDS', couleur: '#c77dff', lueur: '#ff3fa4', carte: ['#2a0f4a', '#10061f'],
    sig: { particules: ['billets', 'etoiles'], jingle: 'levee_de_fonds', filtre: 'halo_reve' },
  },
  /* ÉPAVE (N12) : « le légendaire qui n'en était pas un ». drame: true → le reveal déroule d'abord EXACTEMENT un reveal de
     Légendaire (suspense de 12,5 s, paliers aux vraies couleurs, badge « ◆◆◆◆ LÉGENDAIRE »), puis le DRAME au scellé
     (chronologie.js → D.drame ; reveal_fret.js, « MODE DRAME ») : pétard mouillé, arrêt de bande, trombone triste, badge
     fissuré remplacé par celui-ci, rideau coincé, sortie au ralenti. « masque » : le palier affiché pendant le faux suspense.
     Le bolide peut choisir un autre scénario de chute : car.drame_scenario = 'crash' (N13 : abattu en vol par un drone, crashé
     devant le conteneur… vide). */
  epave: {
    nom: 'Rareté Épave', court: '🔩 ÉPAVE', couleur: '#b5653a', lueur: '#7a3b16', carte: ['#2b1d14', '#120b07'],
    drame: true, masque: 'legendaire',
    sig: { particules: ['rouille', 'boulons'], jingle: 'trombone_triste', filtre: 'or_liquide' },
  },
};

/** Palier d'un bolide (défaut : standard ; les reliques ajoutées en direct sont des « reliques interdites »). */
export function rareteDe(c) {
  if (!c) return 'standard';
  if (RARETES[c.rarete]) return c.rarete;
  return c.relic ? 'relique_interdite' : 'standard';
}

/** Identifiant du profil signature du bolide (null s'il n'en a pas, ou s'il est inconnu). */
export function customDe(c) {
  return c && c.rarete_custom && CUSTOM[c.rarete_custom] ? c.rarete_custom : null;
}

/** Profil d'affichage : le palier de base (rang, particules d'apparition conservés) habillé du profil signature s'il existe. */
export function infoRarete(c) {
  const base = RARETES[rareteDe(c)], id = customDe(c);
  if (!id) return base;
  const p = CUSTOM[id];
  return { ...base, nom: p.nom, court: (c.badge_custom && String(c.badge_custom)) || p.court, couleur: p.couleur, lueur: p.lueur, carte: p.carte, custom: id, sig: p.sig, arche: p.arche || null, nomBase: base.nom,
    drame: !!p.drame, masque: p.masque || null };
}

/** Profil d'un bolide en MODE DRAME (rareté signature à drapeau « drame », ex. Épave), sinon null. */
export function drameDe(c) {
  const id = customDe(c);
  return id && CUSTOM[id].drame ? CUSTOM[id] : null;
}

/** Ce que le faux suspense affiche : le profil du palier « masque » (Légendaire), sans aucun habillage signature. Le reveal
 *  l'utilise pour toutes les couleurs visibles AVANT le drame (liseré, lumières, bordereau, badge) : rien ne divulgâche. */
export function masqueRarete(c) {
  const p = drameDe(c);
  return p && RARETES[p.masque] ? { ...RARETES[p.masque], masque: true } : null;
}

/** Classes CSS d'une carte : palier de base + profil signature éventuel (rar-c-<id>). */
export function classeRarete(c) {
  const id = customDe(c);
  return `rar-${rareteDe(c)}${id ? ` rar-cust rar-c-${id}` : ''}`;
}

/** Badge compact : « ◆ ÉPIQUE », ou le badge signature (« ♿ ACCÈS PRIORITAIRE »…). */
export function badgeRarete(c, { long = false } = {}) {
  const base = rareteDe(c), r = infoRarete(c);
  if (r.custom) {
    return `<span class="rar-badge rar-${base} rar-cust rar-c-${r.custom}" style="--rar:${r.couleur};--rar-l:${r.lueur}" title="${esc(r.nom)} (palier ${esc(r.nomBase)})">${esc(long ? r.court + ' · ' + r.nom.replace(/^Rareté /, '').toUpperCase() : r.court)}</span>`;
  }
  return `<span class="rar-badge rar-${base}" style="--rar:${r.couleur};--rar-l:${r.lueur}" title="${esc(r.nom)}">${'◆'.repeat(r.rang + 1)} ${esc(long ? r.nom.toUpperCase() : r.court)}</span>`;
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
