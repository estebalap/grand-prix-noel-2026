/* SALLE DE PROJECTION — revoir chacune des 75 cinématiques de révélation, une par une ou en défilé.
   · Grille des bolides : filtres univers / rareté / recherche, pastille « clip filmé » quand web/videos/cars/CODE.mp4 existe
     (liste du relais /api/v2/videos), coche « vu » mémorisée sur cet appareil.
   · Clic sur un bolide : la cinématique joue EN DIRECT (moteur 3D du reveal, mode trailer, musique du bolide quand le relais
     sert la bibliothèque Musique/). Si un clip a été filmé, le bouton « Clip filmé » bascule sur la vidéo enregistrée.
   · À la fin (Espace, Entrée, clic sur l'écran final), le bolide suivant de la sélection enchaîne ; ← → passent
     au précédent / suivant à tout instant, R rejoue, Échap ferme. « Défilé complet » enchaîne toute la sélection (3 s de tenue).
   Paramètres : ?code=TK06 ouvre directement un bolide ; ?version=clip préfère le clip filmé quand il existe. */
import { $, DATA, loadData, findRelay, relayBase, esc } from '../shared/core.js';
import * as snd from '../shared/audio.js';
import { chargerReveal } from '../shared/reveal.js';
import { revealFret, revealFretDisponible } from '../shared/reveal_fret.js';
import { RARETES, rareteDe, infoRarete, badgeRarete } from '../shared/rarete.js';
import { ARCHETYPES, archetypeDe } from '../shared/archetypes.js';
import { createVideoLibrary } from '../shared/videos.js';

const Q = new URLSearchParams(location.search);
const vids = createVideoLibrary(relayBase);
const CLE_VUS = 'gp.cinema.vus';
const lireVus = () => { try { return new Set(JSON.parse(localStorage.getItem(CLE_VUS) || '[]')); } catch (e) { return new Set(); } };
const vus = lireVus();
const marquerVu = (code) => { vus.add(code); try { localStorage.setItem(CLE_VUS, JSON.stringify([...vus])); } catch (e) { /* stockage indisponible */ } };

const etat = { liste: [], filtree: [], idx: -1, version: 'direct', jeton: 0, enCours: null, defile: false, ouvert: false };

/* ---------------------------------------------------------------- grille */
function filtrer() {
  const q = $('#cherche').value.trim().toLowerCase(), u = $('#f-univers').value, r = $('#f-rarete').value, clips = $('#f-clips').checked;
  etat.filtree = etat.liste.filter((c) => {
    if (u && archetypeDe(c) !== u) return false;
    if (r === 'signature' ? !infoRarete(c).custom : r && rareteDe(c) !== r) return false;
    if (clips && !vids.car(c.code)) return false;
    if (q && !(`${c.code} ${c.alias} ${c.real_name || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });
}
function dessinerGrille() {
  filtrer();
  const nClips = etat.liste.filter((c) => vids.car(c.code)).length;
  $('#compte').textContent = `${etat.filtree.length} bolide${etat.filtree.length > 1 ? 's' : ''} affiché${etat.filtree.length > 1 ? 's' : ''} sur ${etat.liste.length} · ${nClips} clip${nClips > 1 ? 's' : ''} filmé${nClips > 1 ? 's' : ''} · ${[...vus].filter((x) => DATA.cars[x]).length} vu${vus.size > 1 ? 's' : ''}`;
  const parUnivers = new Map();
  for (const c of etat.filtree) { const k = archetypeDe(c); if (!parUnivers.has(k)) parUnivers.set(k, []); parUnivers.get(k).push(c); }
  $('#grille').innerHTML = etat.filtree.length ? [...parUnivers].map(([k, cs]) => {
    const A = ARCHETYPES[k] || {};
    return `<section class="univers" style="--u:${A.teinte || '#ffd34d'};--u2:${A.teinte2 || '#fff'}"><h2>${esc(A.nom || k)} <small>${cs.length}</small></h2><div class="cartes">${cs.map((c) => {
      const R = infoRarete(c), clip = vids.car(c.code);
      return `<button type="button" class="carte${vus.has(c.code) ? ' vu' : ''}" data-code="${esc(c.code)}" style="--rar:${R.couleur};--rar-l:${R.lueur}">
        <span class="code">${esc(c.code)}</span><b class="nom">${esc(c.alias)}</b><span class="vrai">${esc(c.real_name || '')}</span>
        <span class="pied">${badgeRarete(c)}${clip ? '<i class="clip" title="Clip filmé disponible">🎬</i>' : ''}${vus.has(c.code) ? '<i class="ok" title="Déjà vu">✓</i>' : ''}</span></button>`;
    }).join('')}</div></section>`;
  }).join('') : '<p class="vide">Aucun bolide ne correspond à ces filtres.</p>';
}

/* ---------------------------------------------------------------- projection */
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
async function arreterEnCours() {
  const v = $('#clip');
  if (!v.hidden) { v.pause(); v.removeAttribute('src'); v.load(); v.hidden = true; }
  if (etat.enCours) { dispatchEvent(new Event('gp:arreter')); try { await etat.enCours; } catch (e) { /* séquence interrompue */ } etat.enCours = null; }
  $('#scene').innerHTML = '';
}
function legende(c) {
  const R = infoRarete(c), A = ARCHETYPES[archetypeDe(c)] || {};
  $('#legende').innerHTML = `<b>${esc(c.code)}</b> ${esc(c.alias)} <span class="dim">· ${esc(R.nom)} · ${esc(A.nom || '')} · ${etat.idx + 1}/${etat.filtree.length}</span>`;
  const clip = vids.car(c.code);
  $('#version').hidden = !clip;
  $('#version').textContent = etat.version === 'clip' ? '⚡ En direct' : '🎬 Clip filmé';
}
async function projeter(idx, { version = etat.version } = {}) {
  if (!etat.filtree.length) return;
  etat.idx = (idx + etat.filtree.length) % etat.filtree.length;
  const c = etat.filtree[etat.idx], jeton = ++etat.jeton;
  await arreterEnCours();
  if (jeton !== etat.jeton) return;
  etat.version = version === 'clip' && vids.car(c.code) ? 'clip' : 'direct';
  $('#salle').hidden = false; etat.ouvert = true; document.body.classList.add('projection');
  legende(c);
  history.replaceState(null, '', `?code=${encodeURIComponent(c.code)}${etat.version === 'clip' ? '&version=clip' : ''}`);
  let fini = false;
  if (etat.version === 'clip') {
    const v = $('#clip'), src = vids.car(c.code);
    v.hidden = false; v.src = relayBase() + (src.mp4 || src.webm); v.currentTime = 0;
    try { await v.play(); } catch (e) { v.muted = true; await v.play().catch(() => {}); }
    etat.enCours = new Promise((res) => { v.onended = () => res(true); v.onerror = () => res(false); });
    fini = await etat.enCours;
  } else if (revealFretDisponible()) {
    etat.enCours = revealFret($('#scene'), { car: c, mode: 'trailer', tenue: etat.defile ? 3 : null });
    fini = await etat.enCours.catch(() => false);
  }
  if (jeton !== etat.jeton) return;                                  // une autre projection a pris la main (←, →, R, fermeture)
  etat.enCours = null;
  if (fini) { marquerVu(c.code); }
  if (etat.ouvert) { await attendre(250); if (jeton === etat.jeton) projeter(etat.idx + 1); }   // fin de la cinématique : le bolide suivant enchaîne
}
async function fermer() {
  etat.jeton++; etat.defile = false; etat.ouvert = false;
  await arreterEnCours();
  $('#salle').hidden = true; document.body.classList.remove('projection');
  history.replaceState(null, '', location.pathname);
  dessinerGrille();
  const b = document.querySelector(`.carte[data-code="${CSS.escape((etat.filtree[etat.idx] || {}).code || '')}"]`);
  if (b) b.focus();
}

/* ---------------------------------------------------------------- démarrage */
(async () => {
  await findRelay();
  await loadData();
  await chargerReveal('..');
  await vids.refresh(true);
  etat.liste = DATA.carList.filter((c) => !c.relic);
  $('#f-univers').innerHTML += Object.entries(ARCHETYPES).map(([k, a]) => `<option value="${k}">${esc(a.nom)}</option>`).join('');
  $('#f-rarete').innerHTML += Object.entries(RARETES).map(([k, r]) => `<option value="${k}">${esc(r.nom)}</option>`).join('') + '<option value="signature">Raretés signature</option>';
  for (const id of ['#cherche', '#f-univers', '#f-rarete', '#f-clips']) $(id).addEventListener('input', dessinerGrille);
  dessinerGrille();
  $('#grille').addEventListener('click', (e) => {
    const b = e.target.closest('.carte'); if (!b) return;
    snd.unlock(); etat.defile = false;
    projeter(etat.filtree.findIndex((c) => c.code === b.dataset.code), { version: 'direct' });
  });
  $('#defile').onclick = () => { snd.unlock(); etat.defile = true; projeter(0, { version: 'direct' }); };
  $('#fermer').onclick = fermer;
  $('#prec').onclick = () => projeter(etat.idx - 1);
  $('#suiv').onclick = () => projeter(etat.idx + 1);
  $('#rejouer').onclick = () => projeter(etat.idx);
  $('#version').onclick = () => projeter(etat.idx, { version: etat.version === 'clip' ? 'direct' : 'clip' });
  // écouteur enregistré en premier, en phase de capture : ces touches agissent à tout instant de la séquence
  addEventListener('keydown', (e) => {
    if (!etat.ouvert) return;
    if (e.key === 'Escape') { e.preventDefault(); fermer(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); projeter(etat.idx - 1); }
    else if (e.key === 'ArrowRight' && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); projeter(etat.idx + 1); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); projeter(etat.idx); }
  }, true);
  const code = (Q.get('code') || '').toUpperCase();
  if (code && DATA.cars[code]) {
    const i = etat.filtree.findIndex((c) => c.code === code);
    if (i >= 0) {                                                       // ouverture directe : le son attend le premier geste (règle des navigateurs)
      $('#salle').hidden = false;
      $('#legende').innerHTML = `<b>${esc(code)}</b> — cliquez ou appuyez sur une touche pour lancer`;
      const go = () => { removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); snd.unlock(); projeter(i, { version: Q.get('version') === 'clip' ? 'clip' : 'direct' }); };
      addEventListener('pointerdown', go, true); addEventListener('keydown', go, true);
    }
  }
})();
