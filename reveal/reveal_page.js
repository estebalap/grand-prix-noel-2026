/* Page d'essai des reveals : /reveal/?code=B07, /reveal/?defile=1, &capture=1 (sans barre, pour enregistrer l'écran avec OBS).
   Moteur : ?moteur=trailer (défaut : trailer d'invocation, conteneur Fret + univers du bolide, shared/archetypes.js),
   ?moteur=fret (conteneur Lootbox Fret classique, shared/reveal_fret.js) ou ?moteur=photo (cinématique photo 2D, shared/reveal.js).
   ?arche=manga|gothique|post_apo|pop|vintage|blockbuster force l'univers (essais de DA sur n'importe quel bolide).
   Fin de séquence : l'écran final reste affiché (musique en boucle) jusqu'à Espace / Entrée / clic. ?tenue=N le fait passer
   seul après N secondes ; ?boucle=1 (1,5 s par défaut) et le défilé (3 s) passent seuls. ?enregistrer=1 (ou le bouton ⏺) télécharge la séquence en vidéo (WebM, ou MP4 si le navigateur sait).
   ?boucle=1 rejoue le bolide sans fin (mesure de fluidité : outils/mesurer_perf.py --pages reveal).
   Écurie propriétaire (bandeau et couleurs) : ?ecurie=N. Le thème vient du bolide (data/themes_bolides.json). */
import { $, DATA, loadData, findRelay, team, esc } from '../shared/core.js';
import * as snd from '../shared/audio.js';
import { chargerReveal, photosDisponibles, revealCinematique, ficheBolide, themeDe, jingle } from '../shared/reveal.js';
import { revealFret, revealFretDisponible, NOMS_EFFETS } from '../shared/reveal_fret.js';
import { medal } from '../shared/ui.js';
import { RARETES, rareteDe } from '../shared/rarete.js';
import { ARCHETYPES, archetypeDe } from '../shared/archetypes.js';

const Q = new URLSearchParams(location.search);
if (Q.get('capture') === '1') document.documentElement.classList.add('capture');

let moteur = ['photo', 'fret', 'trailer'].includes(Q.get('moteur')) ? Q.get('moteur') : 'trailer';
const tenueUrl = Q.has('tenue') ? Number(Q.get('tenue')) : null;
async function jouer(code, { enregistrer = false, tenue = tenueUrl } = {}) {
  let c = DATA.cars[code]; if (!c) return false;
  if (ARCHETYPES[Q.get('arche')]) c = { ...c, archetype: Q.get('arche') };
  const tid = Q.get('ecurie') ? Number(Q.get('ecurie')) : null, t = tid ? team(tid) : null;
  const r = RARETES[rareteDe(c)];
  $('#etat').textContent = moteur === 'trailer'
    ? `${code} — ${c.alias} · ${r.nom} · univers ${ARCHETYPES[archetypeDe(c)].nom}`
    : `${code} — ${c.alias} · ${r.nom} · thème ${themeDe(c).style} · musique ${themeDe(c).musique}`;
  if (moteur !== 'photo' && revealFretDisponible()) {
    const ok = await revealFret($('#scene'), { car: c, teamId: tid, team: t, couleurs: t ? t.colors : undefined, enregistrer, pasFixe: Number(Q.get('pas')) || 0, mode: moteur, tenue,
      equipeHtml: t ? `${medal(t.id, 46)}<span>${esc(t.name)}</span>` : '' });
    if (ok) return true;
  }
  const ok = await revealCinematique($('#scene'), { car: c, teamId: tid, team: t, couleurs: t ? t.colors : undefined, infoHtml: ficheBolide(c, t) });
  if (!ok) $('#etat').textContent = `${code} : pas de photo (lancer outils/recuperer_photos_bolides.py)`;
  return ok;
}

(async () => {
  await findRelay();
  await loadData();
  await chargerReveal('..');
  const avec = new Set(photosDisponibles());
  const liste = DATA.carList.filter((c) => !c.relic);
  $('#choix').innerHTML = liste.map((c) => `<option value="${c.code}">${c.code} · ${esc(c.alias)}${avec.has(c.code) ? '' : ' (sans photo)'}</option>`).join('');
  $('#etat').textContent = `${avec.size} photos sur ${liste.length} bolides`;
  $('#son').onclick = () => { snd.unlock(); $('#son').textContent = '🔊 Son activé'; };
  $('#jouer').onclick = () => { snd.unlock(); jouer($('#choix').value); };
  $('#moteur').value = moteur;
  $('#moteur').onchange = () => { moteur = $('#moteur').value; };
  $('#enreg').onclick = () => { snd.unlock(); jouer($('#choix').value, { enregistrer: true }); };
  $('#defile').onclick = async () => { snd.unlock(); for (const c of liste) if (moteur !== 'photo' || avec.has(c.code)) { $('#choix').value = c.code; await jouer(c.code, { tenue: tenueUrl ?? 3 }); await new Promise((r) => setTimeout(r, 300)); } };
  $('#export').onclick = async () => {          // un fichier vidéo par bolide (le navigateur peut demander d'autoriser les téléchargements multiples)
    snd.unlock();
    for (const c of liste) { $('#choix').value = c.code; await jouer(c.code, { enregistrer: true }); await new Promise((r) => setTimeout(r, 600)); }
  };
  // ?jingle=rock : le bouton « Jouer » ne joue que le jingle de ce genre (pour l'enregistrer dans Audacity)
  if (Q.get('jingle')) { $('#jouer').onclick = () => { snd.unlock(); setTimeout(() => jingle(Q.get('jingle')), 120); $('#etat').textContent = 'Jingle : ' + Q.get('jingle'); }; }
  if (Q.get('code') && Q.get('boucle') === '1') {          // ?boucle=1 : rejoue sans fin (mesure de fluidité, vitrine)
    $('#choix').value = Q.get('code');
    for (;;) { await jouer(Q.get('code'), { tenue: tenueUrl ?? 1.5 }); await new Promise((r) => setTimeout(r, 300)); }
  } else if (Q.get('code')) { $('#choix').value = Q.get('code'); jouer(Q.get('code'), { enregistrer: Q.get('enregistrer') === '1' }); }
  else if (Q.get('defile') === '1') $('#defile').click();
})();
