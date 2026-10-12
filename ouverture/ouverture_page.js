/* Page d'essai de l'ouverture du plateau : /ouverture/ (clic pour lancer, avec le son), /ouverture/?auto=1 (sans geste,
   donc sans son : captures de contrôle), &express=1 (présentation éclair), &boucle=1 (rejoue sans fin : mesure de fluidité). */
import { DATA, loadData, findRelay, logoUrl } from '../shared/core.js';
import * as snd from '../shared/audio.js';
import { jouerOuverture } from '../shared/ouverture.js';

const Q = new URLSearchParams(location.search);
const go = document.getElementById('go');
let circuit = null;

async function jouer() {
  go.style.display = 'none';
  do {
    window.__ouvertureFin = null;
    const r = await jouerOuverture(document.body, { equipes: DATA.teams, circuit, logo: logoUrl, express: Q.get('express') === '1', son: Q.get('son') !== '0', pasFixe: Number(Q.get('pas')) || 0 });
    window.__ouvertureFin = r;
  } while (Q.get('boucle') === '1');
  go.style.display = '';
}

(async () => {
  await findRelay(); await loadData();
  try { circuit = await (await fetch('../data/circuit.json')).json(); } catch (e) { circuit = null; }
  window.__ouverturePret = true;
  const lancer = () => { snd.unlock(); jouer(); };
  if (Q.get('auto') === '1') jouer();
  else { go.addEventListener('click', lancer, { once: true }); addEventListener('keydown', lancer, { once: true }); }
})();
