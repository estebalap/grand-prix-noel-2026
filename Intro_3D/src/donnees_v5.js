/* Données de l'intro v5, lues dans l'application (LECTURE SEULE : rien n'y est jamais écrit).
   Chemins de l'intro relatifs à Intro_3D/ ; chemins de l'application web résolus par le pont universel
   (src/shared_bridge.js : dépôt GitHub OU PC local, sans rien changer). */
import { WEB, urlWeb } from './shared_bridge.js';

export const CHEMINS = {
  web: WEB.href,
  equipes: urlWeb('data/teams.json'),
  logo: (id) => urlWeb(`logos/${String(id).padStart(2, '0')}.jpg`),
  rapport: 'audio_v5/audio/rapport_v5.json',
  plans: 'data/plans_intro_v5.json',
  son: 'audio_v5/audio/mix_v5.wav',
};

async function json(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Fichier introuvable : ${url} (${r.status})`);
  return r.json();
}

function image(url) {
  return new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => { console.warn('Logo absent : ' + url); ok(null); }; im.src = url; });
}

/** Les 15 écuries (teams.json) et leurs logos. Un logo absent est signalé dans la console et l'écran affiche une pastille. */
export async function chargerEquipes() {
  const equipes = await json(CHEMINS.equipes);
  if (!Array.isArray(equipes) || equipes.length !== 15) throw new Error(`teams.json : 15 écuries attendues, ${equipes.length} trouvées`);
  const logos = {};
  await Promise.all(equipes.map(async (e) => { logos[e.id] = await image(CHEMINS.logo(e.id)); }));
  return { equipes, logos };
}

export async function chargerMontage() {
  const [rapport, plans] = await Promise.all([json(CHEMINS.rapport), json(CHEMINS.plans)]);
  return { rapport, plans };
}
