/* SONS DU REVEAL — moteur du bolide (synthèse physique, un modèle par bolide), bruitages d'acier du conteneur, acoustique du hangar,
   bus de fond avec ducking, cri du nom.

   Moteurs : fiches_moteurs.js décrit la motorisation RÉELLE de chacun des 75 bolides (architecture, ordre d'allumage, admission,
   échappement, boîte) ; moteurs_physiques.js la fait sonner échantillon par échantillon (aucun oscillateur « jeu vidéo »).
   Le moteur joue une SEULE prise continue, calée sur la chronologie du reveal : démarreur et allumage pendant l'insert phares,
   deux coups de gaz sur l'insert jante, ralenti dans la pénombre, rugissement sur le plan large, embrayage et passages de rapports
   quand le bolide sort, franchissement du seuil, puis il s'éloigne.
   Bruitages : foley_acier.js (synthèse modale de tôle, collé-glissé, particules, pneumatique) ; hangar : réponse impulsionnelle
   stéréo (convolution) partagée par le moteur et les bruitages.
   Cri du nom : fichier web/sounds/voice/annonce/CODE.mp3 (voix de commentateur) joué EXACTEMENT au franchissement du seuil.

   Exports : typeMoteur(car), preparerSonsReveal(S, car, D, tSeuil, {rang}), jouerMoteur(S, prep, t0, sorties), creerBusFond(S),
             chargerCri(code, base, S), jouerCri(S, buf, quand, bus), parlerNom(car, delaiS) → annuler() */
import { ficheMoteur, signatureMoteur } from './fiches_moteurs.js';
import { rendreMoteur } from './moteurs_physiques.js';
import { banqueFoley, reponseHangar } from './foley_acier.js';
import { germeDe } from './dsp_hors_ligne.js';

/** Signature du moteur d'un bolide (« v8x atmo », « l6 biturbo », « vapeur »…), publiée pour la régie et le rapport de capture. */
export function typeMoteur(car) {
  const f = ficheMoteur(car && car.code);
  return f ? signatureMoteur(f) + ' · ' + f.nom : 'aucune fiche';
}

/** Repères du moteur sur la chronologie du reveal (secondes absolues depuis le top départ). */
export function reperesMoteur(D, tSeuil) {
  const ja = D.plans.find((p) => p.id === 'jante'), la = D.plans.find((p) => p.id === 'large'), ph = D.plans.find((p) => p.id === 'phares');
  const b0 = ja.t0 + (ja.t1 - ja.t0) * 0.25;
  const demarrage = Math.max(ph ? ph.t0 + 0.1 : D.trappeDebut + 0.2, b0 - 1.25);
  return { demarrage, blips: [b0, b0 + 0.46], rugit: la.t0 + 0.08, sortie: D.sortie, seuil: tSeuil, fin: tSeuil + 2.6 };
}

const vers = (ac, x) => { const b = ac.createBuffer(2, x.gauche.length, ac.sampleRate); b.getChannelData(0).set(x.gauche); b.getChannelData(1).set(x.droite); return b; };
const memoFoley = new Map(), memoSalle = new Map(), memoMoteur = new Map();

/** Prépare (une fois, AVANT le top départ) : prise moteur du bolide, banque de bruitages, réponse du hangar. */
export function preparerSonsReveal(S, car, D, tSeuil, { rang = 0 } = {}) {
  if (!S || !car) return null;
  const { ac } = S, sr = ac.sampleRate, t0 = performance.now();
  const fiche = ficheMoteur(car.code);
  if (!fiche) throw new Error('aucune fiche moteur pour ' + car.code);
  const R = reperesMoteur(D, tSeuil), debut = R.demarrage - 0.05;
  const rel = { demarrage: R.demarrage - debut, blips: R.blips.map((b) => b - debut), rugit: R.rugit - debut, sortie: R.sortie - debut, seuil: R.seuil - debut, fin: R.fin - debut };
  const cleM = car.code + '|' + sr + '|' + Object.values(rel).flat().map((x) => x.toFixed(3)).join(',');
  let moteur = memoMoteur.get(cleM);
  if (!moteur) {
    const r = rendreMoteur(sr, fiche, rel, { germe: germeDe(car.code) });
    moteur = { buf: vers(ac, r), evenements: r.evenements };
    if (memoMoteur.size > 8) memoMoteur.clear();
    memoMoteur.set(cleM, moteur);
  }
  const dureeRideau = D.trappe - D.trappeDebut, cleF = sr + '|' + rang + '|' + dureeRideau.toFixed(2);
  let foley = memoFoley.get(cleF);
  if (!foley) {
    const b = banqueFoley(sr, { germe: germeDe('conteneur' + rang), rang, dureeRideau });
    foley = {}; for (const [k, v] of Object.entries(b)) foley[k] = Array.isArray(v) ? v.map((x) => vers(ac, x)) : vers(ac, v);
    memoFoley.set(cleF, foley);
  }
  let salle = memoSalle.get(sr);
  if (!salle) { salle = vers(ac, reponseHangar(sr, 7)); memoSalle.set(sr, salle); }
  return { fiche, signature: signatureMoteur(fiche), moteur: moteur.buf, evenements: moteur.evenements, debut, reperes: R, foley, salle, ms: Math.round(performance.now() - t0) };
}

/** Réverbération du hangar : un ConvolverNode partagé (envoi « salle »), sortie vers `sortie`. */
export function creerSalle(S, prep, sortie, niveau = 0.32) {
  if (!S || !prep || !S.ac.createConvolver) return null;
  const { ac } = S, c = ac.createConvolver(), g = ac.createGain(), entree = ac.createGain();
  c.normalize = false; c.buffer = prep.salle; g.gain.value = niveau; entree.gain.value = 1;
  entree.connect(c); c.connect(g); g.connect(sortie);
  return { entree, dispose() { try { entree.disconnect(); c.disconnect(); g.disconnect(); } catch (e) { /* rien */ } } };
}

/** Joue la prise moteur à `t0` (horloge audio) : sec vers `sortie`, une part dans la salle. Renvoie stop(). */
export function jouerMoteur(S, prep, t0, sortie, salle = null, niveau = 0.62) {
  if (!S || !prep) return () => {};
  const { ac } = S, src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = prep.moteur; g.gain.value = niveau;
  src.connect(g); g.connect(sortie);
  let envoi = null;
  if (salle) { envoi = ac.createGain(); envoi.gain.value = 0.55; g.connect(envoi); envoi.connect(salle.entree); }
  src.start(Math.max(ac.currentTime, t0));
  return () => { try { src.stop(); } catch (e) { /* déjà arrêtée */ } try { g.disconnect(); if (envoi) envoi.disconnect(); } catch (e) { /* rien */ } };
}

/* ------------------------------------------------------------------ bus de fond + ducking broadcast */
/** Bus unique pour tout ce qui doit s'effacer devant la voix (moteur, ambiance, jingle, musique). duck(quand, duree) : −7 dB
 *  (rampe exponentielle 40 ms) tenus pendant `duree` secondes, puis retour progressif en 400 ms. */
export function creerBusFond(S) {
  if (!S) return null;
  const { ac, master } = S, fond = ac.createGain(); fond.gain.value = 1; fond.connect(master);
  const NIVEAU = Math.pow(10, -7 / 20);
  return {
    fond,
    duck(quand, duree) {
      const t = ac.currentTime + 0.02 + Math.max(0, quand), g = fond.gain;
      g.setValueAtTime(1, t - 0.04); g.exponentialRampToValueAtTime(NIVEAU, t);
      g.setValueAtTime(NIVEAU, t + Math.max(0.05, duree)); g.exponentialRampToValueAtTime(1, t + Math.max(0.05, duree) + 0.4);
    },
    /** silence de mort : tout le fond (moteur, ambiance, suspense) tombe à zéro en 12 ms, puis revient d'un coup pour la déflagration */
    silence(quand, duree) {
      const t = ac.currentTime + 0.02 + Math.max(0, quand), g = fond.gain;
      g.setValueAtTime(1, t - 0.012); g.linearRampToValueAtTime(0.0001, t);
      g.setValueAtTime(0.0001, t + Math.max(0.05, duree) - 0.004); g.linearRampToValueAtTime(1, t + Math.max(0.05, duree));
    },
    dispose() { try { fond.disconnect(); } catch (e) { /* rien */ } },
  };
}

/* ------------------------------------------------------------------ cri du nom */
const memo = new Map();
export async function chargerCri(code, base, S) {
  if (!S || !code) return null;
  if (memo.has(code)) return memo.get(code);
  let buf = null;
  try {
    const r = await fetch(`${base}/sounds/voice/annonce/${encodeURIComponent(code)}.mp3`, { cache: 'force-cache' });
    if (r.ok) buf = await S.ac.decodeAudioData(await r.arrayBuffer());
  } catch (e) { buf = null; }
  memo.set(code, buf);
  return buf;
}

/** Joue le cri à `quand` secondes (horloge audio : pile au franchissement du seuil). Renvoie sa durée. */
export function jouerCri(S, buf, quand = 0, bus = null) {
  if (!S || !buf) return 0;
  const { ac, master } = S, src = ac.createBufferSource(), g = ac.createGain(), comp = ac.createDynamicsCompressor(), hp = ac.createBiquadFilter();
  src.buffer = buf; g.gain.value = 1.5;
  hp.type = 'highpass'; hp.frequency.value = 85; hp.Q.value = 0.707;                                  // coupe-bas : aucun conflit avec le ronronnement moteur
  comp.threshold.value = -15; comp.ratio.value = 4; comp.knee.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18;     // présence de speaker de championnat
  src.connect(hp); hp.connect(g); g.connect(comp); comp.connect(master);
  const salle = ac.createGain(); salle.gain.value = 0.16; comp.connect(salle);                         // premières réflexions de hangar / arène
  for (const [dl, gn] of [[0.023, 0.55], [0.041, 0.38], [0.067, 0.26]]) {
    const d = ac.createDelay(0.2), r = ac.createGain(), lp = ac.createBiquadFilter(); d.delayTime.value = dl; r.gain.value = gn; lp.type = 'lowpass'; lp.frequency.value = 3800;
    salle.connect(d); d.connect(lp); lp.connect(r); r.connect(master);
  }
  const t = ac.currentTime + 0.02 + quand;
  src.start(t);
  if (bus && bus.duck) bus.duck(quand - 0.02, buf.duration);                                           // la musique et le moteur s'effacent de −7 dB pendant toute la voix
  return buf.duration;
}

/** Repli sans fichier : synthèse vocale du navigateur (voix française grave, ton de ring announcer). */
export function parlerNom(car, delaiS = 0) {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined' || !car) return () => {};
  let annule = false;
  const h = setTimeout(() => {
    if (annule) return;
    const u = new SpeechSynthesisUtterance(String(car.alias || car.code).toUpperCase() + ' !');
    u.lang = 'fr-FR'; u.pitch = 0.6; u.rate = 0.85; u.volume = 1;
    const v = speechSynthesis.getVoices().find((x) => /^fr/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }, Math.max(0, delaiS * 1000));
  return () => { annule = true; clearTimeout(h); try { speechSynthesis.cancel(); } catch (e) { /* rien */ } };
}
