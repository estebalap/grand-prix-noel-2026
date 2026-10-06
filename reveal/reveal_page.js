/* Page d'essai des reveals générés par le code : /reveal/?code=B07, /reveal/?defile=1, &capture=1 (sans barre, pour
   enregistrer l'écran avec OBS et obtenir un MP4 par bolide). Écurie propriétaire (bandeau et couleurs) : ?ecurie=N. Le thème vient du bolide (data/themes_bolides.json). */
import { $, DATA, loadData, findRelay, team, esc } from '../shared/core.js';
import * as snd from '../shared/audio.js';
import { chargerReveal, photosDisponibles, revealCinematique, ficheBolide, themeDe, jingle } from '../shared/reveal.js';

const Q = new URLSearchParams(location.search);
if (Q.get('capture') === '1') document.documentElement.classList.add('capture');

async function jouer(code) {
  const c = DATA.cars[code]; if (!c) return false;
  const tid = Q.get('ecurie') ? Number(Q.get('ecurie')) : null, t = tid ? team(tid) : null;
  $('#etat').textContent = `${code} — ${c.alias} · thème ${themeDe(c).style} · musique ${themeDe(c).musique}`;
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
  $('#defile').onclick = async () => { snd.unlock(); for (const c of liste) if (avec.has(c.code)) { $('#choix').value = c.code; await jouer(c.code); await new Promise((r) => setTimeout(r, 300)); } };
  // ?jingle=rock : le bouton « Jouer » ne joue que le jingle de ce genre (pour l'enregistrer dans Audacity)
  if (Q.get('jingle')) { $('#jouer').onclick = () => { snd.unlock(); setTimeout(() => jingle(Q.get('jingle')), 120); $('#etat').textContent = 'Jingle : ' + Q.get('jingle'); }; }
  if (Q.get('code')) { $('#choix').value = Q.get('code'); jouer(Q.get('code')); }
  else if (Q.get('defile') === '1') $('#defile').click();
})();
