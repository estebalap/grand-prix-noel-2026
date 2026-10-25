/* MOTEURS PHYSIQUES — synthèse hors ligne (Float32Array) du son de chaque bolide à partir de sa fiche (fiches_moteurs.js).

   Pas d'oscillateur « jeu vidéo » : chaque son naît d'un modèle physique simplifié, échantillon par échantillon.
     Pistons    le vilebrequin tourne réellement (angle intégré au régime) ; chaque cylindre libère, à son angle d'allumage, une
                bouffée de pression (montée 0,1 ms, décroissance qui raccourcit avec le régime, part turbulente bruitée, ±8 % de
                dispersion cycle à cycle, déséquilibre propre à chaque cylindre). Les bouffées de chaque banc traversent le
                collecteur (résonance), le tuyau (filtre en peigne : aller-retour d'onde à 480 m/s, pertes à chaque réflexion), le
                silencieux (passe-bas) et le rayonnement de la sortie (dérivée). Les intervalles d'allumage viennent de l'architecture :
                V8 à vilebrequin croisé = 90-180-270° par banc → borborygme ; vilebrequin plat ou V12 = régulier → hurlement ; 5 cylindres
                = 144°. S'ajoutent : admission (bruit pulsé), distribution (cliquetis des poussoirs), cliquetis diesel, démarreur
                (moteur électrique ralenti à chaque compression), turbo (inertie de l'arbre, sifflement, décharge, pompage, anti-lag),
                compresseur Roots, pignons droits, claquement des crabots au passage de rapport, coupure du rupteur, retours de flamme.
     Électrique moteurs synchrones : fréquence électrique (paires de pôles), harmoniques d'encoches, découpage de l'onduleur, réducteur,
                roulement des pneus ; jeu de transmission au premier couple.
     Vapeur     coups d'échappement de la boîte à fumée (4 par tour de roue), purgeurs, patinage au démarrage, bielles, attelage du
                tender, pompe à air, sifflet à trois cloches (jet de vapeur sur un résonateur), soupape de sûreté.
     Rotor      démarrage des deux turbines (démarreur, allumage, montée N1), embrayage, passage de pale (bruit d'épaisseur) et
                claquement de pale en charge (interaction pale-tourbillon), anticouple, boîte de transmission principale.
     Fauteuil   poussées sur les mains courantes, roulements céramique, cadre titane (modes longs), amortisseurs à air, roulettes,
                assistance brushless (armement du contrôleur, sifflement électrique).

   rendreMoteur(sr, fiche, reperes, {germe}) → { gauche, droite, duree, evenements }
     reperes (s, depuis le début du tampon) : { demarrage, blips: [..], rugit, sortie, seuil, fin } */
import { hasard, Biquad, BancModal, Peigne, CoupeContinu, PasseBas1, normaliser, sature, fondus } from './dsp_hors_ligne.js';
import { ECHAPPEMENTS } from './fiches_moteurs.js';

const C_GAZ = 480;                       // célérité du son dans des gaz d'échappement chauds (m/s)
const PAS_CTRL = 16;                     // période de calcul de la commande (échantillons)

/* ------------------------------------------------------------------ architecture → angles d'allumage (cycle 720°) et banc */
export function allumages(f) {
  const reg = (n, alterne) => Array.from({ length: n }, (_, k) => ({ a: (k * 720) / n, banc: alterne ? k % 2 : 0, cyl: k }));
  switch (f.archi) {
    case 'V8x': {                                                   // ordre GM 1-8-4-3-6-5-7-2 : impairs à gauche, pairs à droite
      const ordre = [1, 8, 4, 3, 6, 5, 7, 2];
      return ordre.map((c, k) => ({ a: k * 90, banc: c % 2 ? 0 : 1, cyl: c - 1 }));
    }
    case 'V8f': return reg(8, true);                                // 1-5-3-7-4-8-2-6 : alterne les bancs à chaque allumage
    case 'V6i': return [0, 90, 240, 330, 480, 570].map((a, k) => ({ a, banc: 0, cyl: k }));   // V6 90° à manetons communs (Maserati C114) : 90°/150°, échappements réunis → la « boiterie » rauque
    case 'V6': case 'V6T': case 'V12': return reg(f.cyl, true);
    default: return reg(f.cyl, false);                              // en ligne : un seul collecteur
  }
}

/** Intervalles (°) entre allumages successifs d'un même banc : le « caractère » de l'échappement. */
export function intervallesParBanc(f) {
  const ev = allumages(f), res = {};
  for (const b of [0, 1]) {
    const a = ev.filter((e) => e.banc === b).map((e) => e.a);
    if (!a.length) continue;
    res[b] = a.map((x, i) => ((a[(i + 1) % a.length] - x) + 720) % 720 || 720);
  }
  return res;
}

/* ------------------------------------------------------------------ outils communs */
function canaux(sr, duree) { const n = Math.max(1, Math.ceil(duree * sr)); return { n, g: new Float32Array(n), d: new Float32Array(n) }; }
/** Impact modal (métal) dans un tampon mono, à l'échantillon i0. */
function impact(sr, dst, i0, modes, gain, rnd, contact = 0.0004) {
  const banc = new BancModal(sr, modes.map((m) => ({ ...m, f: m.f * (1 + 0.01 * rnd.signe()) })));
  const nc = Math.max(1, Math.round(contact * sr)), dur = Math.max(...modes.map((m) => m.t60)) * 1.05, n = Math.round(dur * sr);
  for (let k = 0; k < n && i0 + k < dst.length; k++) {
    const ex = k < nc ? Math.sin(Math.PI * k / nc) * gain : 0;
    if (i0 + k >= 0) dst[i0 + k] += banc.pas(ex);
  }
}
const MODES_CRABOTS = [{ f: 840, t60: 0.09, a: 1 }, { f: 1960, t60: 0.07, a: 0.8 }, { f: 3310, t60: 0.05, a: 0.6 }, { f: 5120, t60: 0.035, a: 0.4 }, { f: 410, t60: 0.12, a: 0.6 }];
const MODES_SOLENOIDE = [{ f: 1230, t60: 0.05, a: 1 }, { f: 2870, t60: 0.04, a: 0.7 }, { f: 4410, t60: 0.03, a: 0.4 }];

/* ================================================================== MOTEUR À PISTONS */
function rendrePiston(sr, f, R, rnd) {
  const E = { ...ECHAPPEMENTS[f.ech || 'origine'], ...(f.echSur || {}) };
  const fin = R.fin, { n, g: G, d: D } = canaux(sr, fin);
  const ev = allumages(f), nB = ev.some((e) => e.banc === 1) ? 2 : 1;
  const exc = [new Float32Array(n), new Float32Array(n)];        // excitation de chaque banc (bouffées de pression)
  const adm = new Float32Array(n), meca = new Float32Array(n), cliquetis = new Float32Array(n), ton = new Float32Array(n), choc = new Float32Array(n);
  const red = f.rupteur, ral = f.ralenti, desequilibre = Array.from({ length: f.cyl }, () => 1 + 0.07 * rnd.gauss());
  const evenements = [];

  /* --- forme d'une bouffée : précalculée pour 64 régimes */
  const formes = new Map();
  const forme = (rpm, diesel) => {
    const cle = Math.round(Math.log2(Math.max(150, rpm)) * 8) * 2 + (diesel ? 1 : 0);
    if (formes.has(cle)) return formes.get(cle);
    const per = 120 / Math.max(150, rpm) / f.cyl;                  // intervalle moyen entre allumages (s)
    const td = Math.min(0.009, Math.max(0.0004, per * 0.3)), tr = diesel ? 0.00005 : 0.00012, len = Math.ceil((td * 6) * sr);
    const det = new Float32Array(len), brt = new Float32Array(len);
    let m = 0;
    for (let k = 0; k < len; k++) { const t = k / sr; det[k] = (1 - Math.exp(-t / tr)) * Math.exp(-t / td); m = Math.max(m, det[k]); }
    for (let k = 0; k < len; k++) { det[k] /= m; brt[k] = Math.exp(-(k / sr) / (td * 1.4)); }
    const o = { det, brt }; formes.set(cle, o); return o;
  };
  const poser = (dst, i0, amp, rpm, bruitPart = 0.35, diesel = false) => {
    const { det, brt } = forme(rpm, diesel);
    for (let k = 0; k < det.length && i0 + k < n; k++) dst[i0 + k] += amp * (det[k] + bruitPart * brt[k] * rnd.signe());
  };

  /* --- commande : machine d'états (arrêt → démarreur → marche au point mort → en prise → décélération) */
  const blips = [...(R.blips || [])].sort((a, b) => a - b);
  const tCrank = f.demarreur === 'haute_compression' ? 0.78 : f.demarreur === 'externe' ? 0.32 : f.hybride ? 0 : 0.5;
  const tAllume = R.demarrage + tCrank;
  const hybrideElec = f.hybride ? R.rugit - 0.05 : null;          // un hybride démarre son thermique au « rugissement »
  const tAllumeReel = f.hybride ? hybrideElec : tAllume;
  const coupe = { crabots: 0.055, sequentielle: 0.048, f1: 0.01, manuelle: 0.22, auto: 0.11 }[f.boite] || 0.1;
  const accel = (f.diesel ? 0.38 : 0.85) * red * (f.inertie < 0.08 ? 1.25 : f.inertie > 0.18 ? 0.7 : 1);   // tr/min par seconde en 1re
  let rpm = 0, gaz = 0, enPrise = false, coupure = 0, boost = 0, gazPrec = 0, tLeve = -9, rapport = 1, allume = false, rupt = false;
  let phi = 0, iEv = 0, prochain = ev[0].a, cycle = 0, bovT = -9, bovForce = 0, antiLag = 0, ratees = 0;
  let arbre = 0, phT1 = 0, phT2 = 0, phC = 0, phP = 0, phK = 0, phD = 0, rapportVit = 1;   // arbre du turbo, phases des sifflements, rapport de démultiplication cumulé
  /* MODE DRAME (repères facultatifs, absents pour tous les autres bolides) : « mou » plafonne l'accélérateur à la sortie (le bolide
     sort au ralenti), « toux » liste les instants des quintes de toux : pendant ±L/2, la plupart des allumages ratent, le régime
     s'effondre, puis un retour de flamme claque à la reprise. */
  const TOUX = Array.isArray(R.toux) && R.toux.length ? [...R.toux].sort((a, b) => a - b) : null, LT = 0.38;
  const enToux = (t) => { if (!TOUX) return 0; let q = 0; for (const c of TOUX) { const u = (t - c) / LT + 0.5; if (u > 0 && u < 1) q = Math.max(q, Math.sin(Math.PI * u)); } return q; };
  let iToux = 0;
  const mou = Number.isFinite(R.mou) ? R.mou : null;
  const etatCtrl = (t) => {
    if (t < R.demarrage) return { mode: 'arret' };
    if (!f.hybride && t < tAllume) return { mode: 'demarreur' };
    if (f.hybride && t < tAllumeReel) return { mode: 'arret' };
    if (t >= R.sortie) {
      if (t > fin - 0.75) return { mode: 'prise', gaz: 0 };
      if (mou != null) return { mode: 'prise', gaz: (t > R.seuil + 1.0 ? 0.6 : 1) * mou * (t < R.sortie + 0.12 ? 0.6 : 1) };
      if (t > R.seuil + 1.0) return { mode: 'prise', gaz: 0.3 };
      return { mode: 'prise', gaz: t < R.sortie + 0.12 ? 0.6 : 1 };
    }
    for (const b of blips) if (t >= b && t < b + 0.13) return { mode: 'pm', gaz: 1, cible: 0.68 * red };
    if (R.rugit != null && t >= R.rugit && t < R.rugit + 0.42) return { mode: 'pm', gaz: 1, cible: (f.ech === 'course' || f.ech === 'f1' ? 1.03 : 0.93) * red };
    const flare = Math.exp(-Math.max(0, t - tAllumeReel) / 0.28);
    return { mode: 'pm', gaz: 0.05 + 0.3 * flare, cible: ral * (1 + 0.85 * flare) };
  };

  /* --- démarreur : moteur électrique + pignon (≈ 12× le vilebrequin), ralenti à chaque compression */
  let phSt = 0;
  const dt = 1 / sr;
  let ctrl = etatCtrl(0), tLastShift = -9;
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    if (i % PAS_CTRL === 0) {
      ctrl = etatCtrl(t);
      gazPrec = gaz;
      gaz = ctrl.gaz ?? 0;
      if (gazPrec > 0.55 && gaz < 0.2) { tLeve = t; if (boost > 0.3 && f.bov) { bovT = t; bovForce = boost; evenements.push(['decharge', +t.toFixed(3)]); } if (f.antiLag && boost > 0.2) antiLag = 0.75; }
      if (ctrl.mode === 'prise' && !enPrise) { enPrise = true; rpm = Math.max(rpm, 0.42 * red); evenements.push(['embrayage', +t.toFixed(3)]); }
      // turbo : inertie de l'arbre
      if (f.admission !== 'atmo') {
        const cibleB = gaz > 0.5 ? Math.min(1, Math.max(0, (rpm - 0.32 * red) / (0.4 * red))) : 0;
        const tau = cibleB > boost ? f.spool : 0.22;
        boost += (cibleB - boost) * Math.min(1, (PAS_CTRL * dt) / tau);
      }
      if (antiLag > 0) antiLag -= PAS_CTRL * dt;
    }
    /* régime */
    if (ctrl.mode === 'arret') { rpm = 0; }
    else if (ctrl.mode === 'demarreur') {
      const base = f.demarreur === 'haute_compression' ? 150 : f.demarreur === 'externe' ? 520 : 210;
      const ang = ((phi % (720 / f.cyl)) / (720 / f.cyl));          // charge de compression : le démarreur peine avant chaque PMH
      const charge = Math.max(0, Math.sin(Math.PI * ang)) ** 3;
      rpm = base * (1 - (f.demarreur === 'haute_compression' ? 0.42 : 0.25) * charge) * Math.min(1, (t - R.demarrage) / 0.08 + 0.2);
    } else if (ctrl.mode === 'pm') {
      if (!allume) { allume = true; evenements.push(['allumage', +t.toFixed(3)]); ratees = Math.round(f.cyl * 1.5); }
      const cible = ctrl.cible ?? ral;
      const tau = gaz > 0.2 ? f.inertie : f.inertie * (f.ech === 'f1' ? 2.4 : 3.4);
      rpm += (cible - rpm) * dt / tau;
      if (f.ech === 'f1' && gaz < 0.2) rpm += 260 * Math.sin(t * 17.3) * Math.sin(t * 4.1) * dt * 30;   // ralenti anti-calage instable d'une F1
    } else {                                                        // en prise : la voiture accélère, passages de rapports
      if (!allume) { allume = true; ratees = 0; }
      if (coupure > 0) { coupure -= dt; rpm -= rpm * dt * (f.boite === 'manuelle' ? 0.9 : 0.3); }
      else if (gaz > 0.5) {
        rpm += accel * rapport * (1 - 0.45 * rpm / red) * gaz * dt;
        if (rpm >= (f.boite === 'auto' ? 0.82 : 0.94) * red && t - tLastShift > 0.25) {
          tLastShift = t; coupure = coupe; const k = f.boite === 'f1' ? 0.86 : 0.72 + 0.04 * (1 - rapport);
          rpm *= k; rapport *= 0.74; rapportVit /= k; evenements.push(['rapport', +t.toFixed(3)]);   // la vitesse de la voiture est continue au passage
          const amp = { crabots: 0.5, sequentielle: 0.36, f1: 0.07, manuelle: 0.12, auto: 0 }[f.boite] ?? 0.1;
          if (amp) impact(sr, choc, i + Math.round(0.004 * sr), MODES_CRABOTS, amp, rnd);
        }
      } else { rpm += ((gaz > 0.1 ? 0.62 : 0.4) * red - rpm) * dt / (gaz > 0.1 ? 1.8 : 0.9); }
    }
    if (TOUX && allume && ctrl.mode !== 'demarreur') {               // quinte de toux : le régime s'effondre, retour de flamme à la reprise
      const q = enToux(t); if (q > 0) rpm -= rpm * dt * 4.2 * q;
      if (iToux < TOUX.length && t >= TOUX[iToux] + LT * 0.42) { iToux++; poser(exc[0], i, 2.6, Math.max(300, rpm) * 0.4, 1.1, f.diesel); impact(sr, choc, i + Math.round(0.006 * sr), MODES_CRABOTS, 0.22, rnd); }
    }
    rupt = rpm > red;
    if (rpm > red * 1.04) rpm = red * 1.04;
    /* angle du vilebrequin et allumages */
    if (rpm <= 0) continue;
    phi += 6 * rpm * dt;
    if (ctrl.mode === 'demarreur') {                               // démarreur : bourdonnement et grincement du pignon
      phSt += 2 * Math.PI * (rpm * (f.demarreur === 'externe' ? 5.5 : 2.1)) * dt;
      const env = Math.min(1, (t - R.demarrage) / 0.03);
      const s = Math.sin(phSt) * 0.6 + Math.sin(2 * phSt) * 0.3 + Math.sin(3 * phSt + 0.5) * 0.18 + Math.sin(7 * phSt) * 0.06 + 0.08 * rnd.signe();
      ton[i] += s * 0.09 * env;
    }
    while (phi >= prochain) {
      const e = ev[iEv];
      if (rpm > 60) {
        let amp;
        if (ctrl.mode === 'demarreur') amp = 0.06;                   // compression seule, sans combustion
        else {
          const charge = 0.13 + 0.87 * Math.pow(Math.max(0, gaz), 0.7);
          amp = charge * (0.55 + 0.45 * Math.min(1, rpm / red)) * desequilibre[e.cyl % f.cyl] * (1 + 0.08 * rnd.gauss());
          const lope = f.came * Math.max(0, 1 - rpm / (2.6 * ral));
          amp *= 1 + lope * 0.9 * rnd.gauss();
          if (coupure > 0 && f.boite !== 'f1') amp *= 0.04;
          if (rupt && rnd() < 0.55) amp *= 0.03;                     // rupteur : allumages sautés → « brap »
          if (ratees > 0) { ratees--; if (rnd() < 0.35) amp *= 0.05; }
          if (TOUX) { const q = enToux(t); if (q > 0 && rnd() < 0.85 * q) amp *= 0.04; }         // ratés de la quinte de toux
          if (f.freinMoteur && gaz < 0.1 && rpm > 0.5 * red) amp = 1.5 * (1 + 0.1 * rnd.gauss());       // frein moteur : la compression est lâchée à l'échappement
          // retours de flamme au lever de pied
          const dl = t - tLeve;
          if (gaz < 0.1 && dl < 1.4 && rpm > 0.4 * red && rnd() < E.sport * 0.28 * Math.exp(-dl / 0.7)) {
            poser(exc[e.banc], i + Math.round((0.003 + 0.01 * rnd()) * sr), 2.2 + 1.2 * rnd(), rpm * 0.4, 1.1);
          }
          if (antiLag > 0 && rnd() < 0.22) poser(exc[e.banc], i + Math.round(0.004 * sr), 3.2 + rnd(), rpm * 0.3, 1.3);
          if (f.diesel) { cliquetis[i] += amp * (0.7 + 0.3 * rnd()) * (1.2 - 0.6 * gaz); }
        }
        poser(exc[e.banc], i, amp, rpm, ctrl.mode === 'demarreur' ? 0.6 : 0.32, f.diesel);
        if (ctrl.mode !== 'demarreur') {
          const ia = i + Math.round((360 / (6 * rpm)) * sr * 0.5);   // admission : la soupape d'admission s'ouvre ~ un demi-tour plus tôt/tard
          if (ia < n) adm[ia] += amp * (0.4 + 0.6 * gaz);
          meca[i] += (f.poussoirs === 'meca' ? 0.06 : 0.018) * (0.4 + 0.6 * Math.min(1, rpm / red));
        }
      }
      iEv = (iEv + 1) % ev.length; if (iEv === 0) cycle++;
      prochain = cycle * 720 + ev[iEv].a;
    }
    /* sifflements portés par le régime — phases INTÉGRÉES (sin(2π·f·t) avec f variable faisait glisser la hauteur de t·df/dt) */
    if (f.admission !== 'atmo') {
      // arbre du turbo : sa vitesse suit la pression de suralimentation avec sa propre inertie ; le MGU-H d'une F1 le maintient lancé au lever de pied
      const cibleA = boost * (0.35 + 0.65 * Math.min(1, rpm / red)) + (f.mguh && allume ? 0.25 * Math.min(1, rpm / red) : 0);
      arbre += (cibleA - arbre) * dt / (cibleA > arbre ? 0.12 : (f.mguh ? 0.9 : 0.3));
      if (arbre > 0.02) {
        const fw = f.mguh ? 2600 + 7400 * arbre : 1600 + 6400 * arbre;
        phT1 += 2 * Math.PI * fw / sr; phT2 += 2 * Math.PI * fw * 1.031 / sr;
        const s = Math.sin(phT1) + (f.admission === 'biturbo' ? 0.8 * Math.sin(phT2 + 1) : 0) + 0.25 * Math.sin(2 * phT1);
        ton[i] += s * (f.mguh ? 0.05 : 0.035) * Math.pow(arbre, 1.4) * (0.35 + 0.65 * Math.max(gaz, f.mguh ? 0.5 : 0));
        if (f.mguh) ton[i] += Math.sin(3 * phT1 + 0.7) * 0.01 * arbre;                       // MGU-H : harmonique électrique de l'arbre
      }
    }
    if (f.compresseur) { phC += 2 * Math.PI * rpm * 0.135 / sr; ton[i] += (Math.sin(phC) + 0.5 * Math.sin(2 * phC) + 0.25 * Math.sin(3 * phC)) * 0.03 * Math.min(1, rpm / red) * (0.4 + 0.6 * gaz); }
    if ((f.pignonsDroits || f.boite === 'sequentielle' || f.boite === 'crabots' || f.boite === 'f1') && enPrise) { phP += 2 * Math.PI * rpm * 0.39 / sr; ton[i] += Math.sin(phP) * 0.012 * Math.min(1, rpm / red); }
    if (f.mguk && allume) {
      /* MGU-K : moteur-générateur synchrone engrené au vilebrequin (≈ ×3,33, 4 paires de pôles → 2,6 kHz à 12 000 tr/min), harmoniques
         d'encoches ; il DÉPLOIE en accélération (gémissement qui enfle avec la vitesse de la voiture) et RÉCUPÈRE au lever de pied
         (timbre plus nasal). Différentiel et pignons de sortie à taille droite : leur sifflement suit la vitesse des roues. */
      const vN = enPrise ? Math.min(1.2, (rpm * rapportVit) / (red * 3.4)) : 0;
      phK += 2 * Math.PI * (rpm * 3.33 / 60 * 4) / sr;
      const deploie = enPrise && gaz > 0.5, recup = enPrise && gaz < 0.2;
      const aK = deploie ? 0.012 + 0.03 * vN : recup ? 0.014 + 0.012 * vN : 0.004;
      ton[i] += (Math.sin(phK) + (recup ? 0.55 : 0.3) * Math.sin(2 * phK + 0.3) + 0.22 * Math.sin(6 * phK)) * aK;
      if (enPrise) { phD += 2 * Math.PI * (220 + 2900 * vN) / sr; ton[i] += Math.sin(phD) * 0.014 * vN; }
    }
    /* décharge du turbo */
    const db = t - bovT;
    if (db >= 0 && db < 0.7) {
      const env = Math.exp(-db / (f.bov === 'flutter' ? 0.16 : 0.13)) * (1 - Math.exp(-db / 0.004)) * bovForce;
      if (f.bov === 'flutter') { const am = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * (22 - 10 * db) * db)); adm[i] += rnd.signe() * env * am * 0.5; }
      else ton[i] += rnd.signe() * env * (f.bov === 'atmo' ? 0.42 : 0.1);
    }
  }

  /* --- chaîne acoustique de chaque banc : collecteur → tuyau → silencieux → rayonnement */
  const sortieBanc = [new Float32Array(n), new Float32Array(n)];
  for (let b = 0; b < nB; b++) {
    const col = new Biquad(sr, 'bandpass', E.collecteur * (b ? 1.04 : 1), 2.2);
    const tuyau = new Peigne(sr, (2 * E.L * (b ? 1.06 : 1)) / C_GAZ, E.g, E.fc * 1.3);
    const sil1 = new Biquad(sr, 'lowpass', E.fc, 0.75), sil2 = new Biquad(sr, 'lowpass', E.fc * 1.6, 0.6);
    const cc = new CoupeContinu(sr, 28);
    const x = exc[b], y = sortieBanc[b];
    let prec = 0;
    for (let i = 0; i < n; i++) {
      let v = x[i] + 0.55 * col.pas(x[i]);
      v = tuyau.pas(v);
      v = sil2.pas(sil1.pas(v));
      const ray = (v - prec) * (sr / (2 * Math.PI * 900)); prec = v;
      y[i] = cc.pas((1 - E.rad) * v + E.rad * ray);
    }
  }
  /* admission, distribution, cliquetis diesel, chocs */
  const fAdm = new Biquad(sr, 'bandpass', f.papillons ? 1350 : 620, f.papillons ? 1.1 : 1.6), envA = new PasseBas1(sr, 180);
  const fMec = new Biquad(sr, 'highpass', 2600, 0.7), resMec = new BancModal(sr, [{ f: 4300, t60: 0.02, a: 1 }, { f: 6900, t60: 0.015, a: 0.6 }]);
  const resDiesel = new BancModal(sr, [{ f: 1420, t60: 0.05, a: 1 }, { f: 2630, t60: 0.04, a: 0.8 }, { f: 3920, t60: 0.03, a: 0.6 }, { f: 950, t60: 0.06, a: 0.5 }]);
  const kA = f.papillons ? 0.32 : 0.16;
  /* répartition stéréo : deux sorties (V à double échappement) ou une seule (centrée) */
  const xG = nB === 2 ? 0.86 : 0.5, xD = 1 - xG;
  for (let i = 0; i < n; i++) {
    const e = envA.pas(Math.abs(adm[i]) * 30);
    const a = fAdm.pas(rnd.signe() * e + adm[i] * 0.4) * kA;
    const m = resMec.pas(fMec.pas(meca[i] * rnd.signe())) * 0.8;
    const dz = f.diesel ? resDiesel.pas(cliquetis[i]) * 0.9 : 0;
    const commun = a + m + dz + ton[i] + choc[i];
    const b0 = sortieBanc[0][i], b1 = nB === 2 ? sortieBanc[1][i] : b0;
    G[i] = sature(1.1 * (b0 * xG + b1 * xD)) * 0.9 + commun;
    D[i] = sature(1.1 * (b1 * xG + b0 * xD)) * 0.9 + commun * 0.96;
  }
  surcouchesFiction(sr, f, R, G, D, rnd);
  fondus(G, sr, 0.002, 0.6); fondus(D, sr, 0.002, 0.6);
  normaliser(0.9, G, D);
  return { gauche: G, droite: D, duree: fin, evenements };
}

/* éléments de fiction ou d'accessoires (turbine scénique, brûleur, transformateur, hydropneumatique, solénoïde du démarreur) */
function surcouchesFiction(sr, f, R, G, D, rnd) {
  const n = G.length, i0 = Math.round(R.demarrage * sr);
  if (f.demarreur !== 'externe' && !f.hybride && i0 < n) {                              // solénoïde du démarreur : clac sec
    const tmp = new Float32Array(Math.min(n - i0, Math.round(0.2 * sr)));
    impact(sr, tmp, 0, MODES_SOLENOIDE, 0.6, rnd);
    for (let k = 0; k < tmp.length; k++) { G[i0 + k] += tmp[k] * 0.5; D[i0 + k] += tmp[k] * 0.45; }
  }
  if (f.hybride) {                                                                       // chaîne E-Tense : contacteur, sifflement du moteur électrique, puis relais du thermique
    const tmp = new Float32Array(Math.min(n - i0, Math.round(0.25 * sr)));
    if (tmp.length > 0) { impact(sr, tmp, 0, [{ f: 620, t60: 0.06, a: 1 }, { f: 1480, t60: 0.05, a: 0.6 }], 0.5, rnd); for (let k = 0; k < tmp.length; k++) { G[i0 + k] += tmp[k] * 0.5; D[i0 + k] += tmp[k] * 0.5; } }
    let ph = 0, w = 0;
    for (let i = i0; i < n; i++) {
      const t = i / sr; let cible = 0, couple = 0.04;
      for (const b of R.blips || []) if (t >= b && t < b + 0.2) { cible = 0.05; couple = 0.6; }
      if (t >= R.sortie) { cible = 0.6 * (1 - Math.exp(-(t - R.sortie) / 1.4)); couple = 0.5; }
      w += (cible - w) * Math.min(1, (1 / sr) / 0.1);
      ph += 2 * Math.PI * (w * 14000 / 60 * 4) / sr;
      const v = (Math.sin(ph) * 0.5 + Math.sin(6 * ph) * 0.25) * 0.05 * couple * Math.min(1, w * 25);
      G[i] += v; D[i] += v;
    }
  }
  if (f.turbine) {                                                                       // turbine de fiction : sifflement qui monte
    const bp = new Biquad(sr, 'bandpass', 900, 0.8);
    for (let i = i0; i < n; i++) {
      const t = (i - i0) / sr, k = Math.min(1, t / 1.6), fw = 1800 + 5200 * k;
      const s = (Math.sin(2 * Math.PI * fw * t) * 0.5 + Math.sin(2 * Math.PI * fw * 1.5 * t) * 0.2) * 0.03 * k + bp.pas(rnd.signe()) * 0.06 * k;
      G[i] += s; D[i] += s;
    }
  }
  if (f.postcombustion && R.rugit != null) {                                             // brûleur : « whoomp » grave
    for (const tb of [R.rugit + 0.43, R.seuil + 0.2]) {
      const lp = new Biquad(sr, 'lowpass', 320, 0.9), a = Math.round(tb * sr);
      for (let k = 0; k < 0.5 * sr && a + k < n; k++) { const t = k / sr, v = lp.pas(rnd.signe()) * Math.exp(-t / 0.14) * (1 - Math.exp(-t / 0.01)) * 1.4; G[a + k] += v; D[a + k] += v; }
    }
  }
  if (f.bourdon) { for (let i = i0; i < n; i++) { const t = i / sr, v = (Math.sin(2 * Math.PI * f.bourdon * t) + 0.6 * Math.sin(4 * Math.PI * f.bourdon * t) + 0.3 * Math.sin(6 * Math.PI * f.bourdon * t)) * 0.02; G[i] += v; D[i] += v; } }
  if (f.hydropneumatique) {                                                              // pompe haute pression : sifflement + pistons à 18 Hz
    const a = Math.round((R.demarrage + 0.5) * sr), b = Math.min(n, a + Math.round(1.5 * sr));
    for (let i = a; i < b; i++) { const t = (i - a) / sr, env = Math.min(1, t / 0.2) * Math.min(1, (b - i) / (0.3 * sr)); const v = (Math.sin(2 * Math.PI * 940 * t) * 0.02 + Math.max(0, Math.sin(2 * Math.PI * 18 * t)) ** 8 * rnd.signe() * 0.05) * env; G[i] += v; D[i] += v; }
  }
}

/* ================================================================== ÉLECTRIQUE */
function rendreElectrique(sr, f, R, rnd) {
  const fin = R.fin, { n, g: G, d: D } = canaux(sr, fin);
  const detune = [1, 1.012, 0.987, 1.025, 0.975, 1.006, 0.994].slice(0, f.moteurs);
  const ph = detune.map(() => [0, 0, 0, 0]), phG = detune.map(() => 0);
  const pwm = new Biquad(sr, 'bandpass', 8000, 3), route = new Biquad(sr, 'lowpass', 420, 0.7), route2 = new Biquad(sr, 'lowpass', 160, 0.7);
  const evenements = [];
  const tmpChoc = new Float32Array(n);
  // contacteurs principaux : deux « clocs » + le jeu de transmission au premier couple
  for (const [t, a] of [[R.demarrage, 0.5], [R.demarrage + 0.09, 0.35]]) impact(sr, tmpChoc, Math.round(t * sr), [{ f: 620, t60: 0.06, a: 1 }, { f: 1480, t60: 0.05, a: 0.6 }, { f: 2900, t60: 0.03, a: 0.3 }], a, rnd);
  for (const b of R.blips || []) impact(sr, tmpChoc, Math.round(b * sr), [{ f: 260, t60: 0.08, a: 1 }, { f: 890, t60: 0.05, a: 0.5 }], 0.45, rnd);
  let w = 0, couple = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let cible = 0;
    couple = 0;
    if (t >= R.demarrage && t < R.demarrage + 0.4) couple = 0.05;
    for (const b of R.blips || []) if (t >= b && t < b + 0.18) { couple = 0.5; cible = 0.02; }
    if (R.rugit != null && t >= R.rugit && t < R.rugit + 0.5) { couple = 1; cible = 0.012; }          // pré-charge de départ arrêté : courant maxi rotor bloqué
    if (t >= R.sortie) { cible = 0.78 * (1 - Math.exp(-(t - R.sortie) / 1.5)); couple = t > fin - 0.8 ? 0.15 : 1 - 0.6 * w; }
    w += (cible - w) * Math.min(1, (1 / sr) / 0.08);
    let s = 0;
    for (let m = 0; m < detune.length; m++) {
      const fe = Math.max(0, w) * f.vmax / 60 * f.poles * detune[m];                                    // fréquence électrique
      const hs = [1, 2, 6, 12], as = [0.45, 0.12, 0.28, 0.1];
      for (let h = 0; h < 4; h++) { ph[m][h] += 2 * Math.PI * fe * hs[h] / sr; s += Math.sin(ph[m][h]) * as[h]; }
      phG[m] += 2 * Math.PI * (w * f.vmax / 60 * f.dents * detune[m]) / sr; s += Math.sin(phG[m]) * 0.2 * w;
    }
    s *= (0.25 + 0.75 * couple) * Math.min(1, w * 30 + couple * 0.4) * 0.14 / Math.sqrt(detune.length);
    const p = pwm.pas(rnd.signe()) * couple * 0.05 * (1 + 0.5 * Math.sin(2 * Math.PI * (w * f.vmax / 60 * f.poles) * t));
    const r = (route.pas(rnd.signe()) * 0.5 + route2.pas(rnd.signe())) * w * 0.35;
    const v = s + p + r + tmpChoc[i];
    G[i] = v; D[i] = v * 0.97 + p * 0.1;
  }
  if (f.moteurs > 1) evenements.push(['moteurs', f.moteurs]);
  fondus(G, sr, 0.002, 0.6); fondus(D, sr, 0.002, 0.6);
  normaliser(0.8, G, D);
  return { gauche: G, droite: D, duree: fin, evenements };
}

/* ================================================================== VAPEUR (H12) */
function rendreVapeur(sr, f, R, rnd) {
  const fin = R.fin, { n, g: G, d: D } = canaux(sr, fin);
  const evenements = [];
  const add = (i, vg, vd = vg) => { if (i >= 0 && i < n) { G[i] += vg; D[i] += vd; } };
  /* coup d'échappement : jet de vapeur dans la cheminée (formants de la boîte à fumée) */
  const coup = (t0, force, longueur, purgeurs) => {
    const a = Math.round(t0 * sr), len = Math.round((longueur + 0.25) * sr);
    const f1 = new Biquad(sr, 'bandpass', 175, 1.4), f2 = new Biquad(sr, 'bandpass', 640, 2.2), f3 = new Biquad(sr, 'highpass', 1900, 0.7), sub = new Biquad(sr, 'lowpass', 70, 0.9);
    const p1 = new Biquad(sr, 'highpass', 2600, 0.6), p2 = new Biquad(sr, 'highpass', 2900, 0.6);
    for (let k = 0; k < len && a + k < n; k++) {
      const t = k / sr, env = (1 - Math.exp(-t / 0.004)) * Math.exp(-t / longueur), x = rnd.signe();
      let v = (f1.pas(x) * 2.2 + f2.pas(x) * 1.4 + f3.pas(x) * 0.5 + sub.pas(x) * 3) * env * force;
      v = sature(v * 1.4) * 0.8;
      let pg = 0, pd = 0;
      if (purgeurs) { const ep = Math.exp(-t / (longueur * 1.3)) * (1 - Math.exp(-t / 0.01)) * purgeurs; pg = p1.pas(rnd.signe()) * ep; pd = p2.pas(rnd.signe()) * ep; }
      add(a + k, v + pg * 0.9, v + pd);
    }
  };
  /* sifflet à trois cloches : jet de vapeur sur trois résonateurs */
  const sifflet = (t0, duree, force = 1) => {
    const a = Math.round(t0 * sr), len = Math.round((duree + 0.3) * sr), notes = [349.2, 415.3, 523.3];
    const ph = notes.map(() => 0), souffle = notes.map((fq) => new Biquad(sr, 'bandpass', fq, 14)), sifl = new Biquad(sr, 'highpass', 3000, 0.7);
    for (let k = 0; k < len && a + k < n; k++) {
      const t = k / sr, ouvre = Math.min(1, t / 0.07), ferme = t > duree ? Math.exp(-(t - duree) / 0.09) : 1;
      const glisse = (0.94 + 0.06 * Math.min(1, t / 0.13)) * (t > duree ? 1 - 0.03 * Math.min(1, (t - duree) / 0.2) : 1);
      let v = 0;
      notes.forEach((fq, j) => {
        const fr = fq * glisse * (1 + 0.004 * Math.sin(2 * Math.PI * 5.3 * t + j));
        ph[j] += 2 * Math.PI * fr / sr;
        v += (Math.sin(ph[j]) + 0.5 * Math.sin(2 * ph[j] + 0.3) + 0.33 * Math.sin(3 * ph[j]) + 0.18 * Math.sin(4 * ph[j]) + 0.1 * Math.sin(5 * ph[j])) * 0.16;
        v += souffle[j].pas(rnd.signe()) * 0.7;
      });
      v += sifl.pas(rnd.signe()) * 0.12;
      add(a + k, v * ouvre * ferme * force);
    }
    evenements.push(['sifflet', +t0.toFixed(3)]);
  };
  /* jets de purge / soupape : souffle large */
  const jet = (t0, duree, force, fc = 2400) => {
    const a = Math.round(t0 * sr), len = Math.round((duree + 0.4) * sr), bpg = new Biquad(sr, 'bandpass', fc, 0.5), bpd = new Biquad(sr, 'bandpass', fc * 1.08, 0.5), hp = new Biquad(sr, 'highpass', 5000, 0.7);
    for (let k = 0; k < len && a + k < n; k++) { const t = k / sr, env = (1 - Math.exp(-t / 0.02)) * (t > duree ? Math.exp(-(t - duree) / 0.12) : 1) * force; add(a + k, (bpg.pas(rnd.signe()) + hp.pas(rnd.signe()) * 0.4) * env, (bpd.pas(rnd.signe()) + hp.pas(rnd.signe()) * 0.4) * env); }
  };
  const fonte = (t0, a0, grave = false) => { const tmp = new Float32Array(Math.round(0.5 * sr)); impact(sr, tmp, 0, grave ? [{ f: 140, t60: 0.25, a: 1 }, { f: 410, t60: 0.18, a: 0.7 }, { f: 1130, t60: 0.1, a: 0.4 }, { f: 2240, t60: 0.06, a: 0.3 }] : [{ f: 820, t60: 0.12, a: 1 }, { f: 1890, t60: 0.08, a: 0.6 }, { f: 3460, t60: 0.05, a: 0.4 }], a0, rnd, 0.001); const a = Math.round(t0 * sr); for (let k = 0; k < tmp.length; k++) add(a + k, tmp[k] * 0.9, tmp[k]); };
  /* pompe à air Westinghouse : deux coups lents, en continu dès la mise en pression */
  for (let t = R.demarrage + 0.2, k = 0; t < fin - 0.3; t += k % 2 ? 0.95 : 0.55, k++) {
    const a = Math.round(t * sr), lp = new Biquad(sr, 'bandpass', k % 2 ? 230 : 310, 2), hp = new Biquad(sr, 'highpass', 3500, 0.7);
    for (let j = 0; j < 0.3 * sr && a + j < n; j++) { const tt = j / sr, e = (1 - Math.exp(-tt / 0.006)) * Math.exp(-tt / 0.07); add(a + j, (lp.pas(rnd.signe()) * 0.5 + hp.pas(rnd.signe()) * 0.12 * Math.exp(-tt / 0.15)) * e * 0.35); }
  }
  /* séquence */
  sifflet(R.demarrage, 0.32, 0.6);                                                           // « attention » : coup de sifflet bref
  for (const b of R.blips || []) jet(b, 0.55, 0.42);                                         // purges des cylindres
  if (R.rugit != null) { sifflet(R.rugit, 1.05, 1); jet(R.rugit + 0.2, 1.3, 0.22, 3400); }   // long sifflet + soupape de sûreté qui lâche
  /* démarrage du convoi : desserrage des freins, régulateur, coups d'échappement qui s'accélèrent, patinage, bielles, tender */
  jet(R.sortie - 0.25, 0.3, 0.3, 1500);
  fonte(R.sortie + 0.18, 0.8, true); fonte(R.sortie + 0.34, 0.5, true);                         // l'attelage du tender se tend : clang-clang
  const D_ROUE = f.roues || 1.95, coupsParTour = 4, accents = [1, 0.74, 0.9, 0.68];
  let x = 0, v = 0.8, t = R.sortie + 0.05, k = 0, patine = false;
  while (t < fin - 0.4) {
    const dtv = 0.005; let distCoup = Math.PI * D_ROUE / coupsParTour;
    // vitesse : accélération « cinéma » (le convoi quitte le conteneur dans le plan), patinage bref à 0,9 s (la roue tourne plus vite que le train avance)
    patine = t > R.sortie + 0.9 && t < R.sortie + 1.35;
    let d = 0;
    while (d < distCoup && t < fin) { const a = t > R.seuil + 1.2 ? 0.3 : 2.4; v += a * dtv; d += v * dtv * (patine ? 2.6 : 1); t += dtv; }
    if (t >= fin - 0.4) break;
    const purge = t < R.sortie + 1.6 ? 0.7 : 0;
    coup(t, accents[k % 4] * (patine ? 0.55 : 1) * (t > R.seuil + 1.2 ? 0.75 : 1), 0.08 + 0.16 / (1 + v), purge);
    if (k % 2 === 0) fonte(t + 0.03, 0.12);                                                  // jeu des bielles, une fois par demi-tour
    k++; x += distCoup;
  }
  evenements.push(['coups', k]);
  /* aiguillage franchi au seuil : cœur de croisement (ta-tac) + raclement des boudins */
  fonte(R.seuil, 0.9, true); fonte(R.seuil + 0.16, 0.75, true);
  { const a = Math.round(R.seuil * sr), bp = new Biquad(sr, 'bandpass', 2300, 6); for (let j = 0; j < 0.9 * sr && a + j < n; j++) { const tt = j / sr, e = Math.sin(Math.PI * Math.min(1, tt / 0.9)) * 0.25; add(a + j, bp.pas(rnd.signe()) * e * (1 + 0.5 * Math.sin(2 * Math.PI * 31 * tt))); } }
  fondus(G, sr, 0.002, 0.6); fondus(D, sr, 0.002, 0.6);
  normaliser(0.9, G, D);
  return { gauche: G, droite: D, duree: fin, evenements };
}

/* ================================================================== ROTOR (B07) */
function rendreRotor(sr, f, R, rnd) {
  const fin = R.fin, { n, g: G, d: D } = canaux(sr, fin);
  const evenements = [];
  const blips = R.blips || [];
  const tTurb2 = blips[0] ?? R.demarrage + 0.8, tEmbr = blips[1] ?? R.demarrage + 1.4;
  const nN1 = (t, t0) => (t < t0 ? 0 : t < t0 + 0.7 ? 0.25 * (t - t0) / 0.7 : Math.min(1, 0.25 + 0.75 * (1 - Math.exp(-(t - t0 - 0.7) / 0.9))));
  const roar = new Biquad(sr, 'lowpass', 700, 0.8), wash = new Biquad(sr, 'lowpass', 450, 0.7), slapHp = new Biquad(sr, 'highpass', 900, 0.7);
  const fTr = new Biquad(sr, 'lowpass', 1400, 0.7);
  let th = 0, rot = 0, ph1 = 0, ph2 = 0, ph3 = 0, phT = 0, phB = 0, prochainePale = 0;
  const pales = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr, n1 = nN1(t, R.demarrage), n2 = nN1(t, tTurb2);
    const cibleRot = t < tEmbr ? 0 : R.rugit != null && t < R.rugit ? 0.55 : 1;
    rot += (cibleRot - rot) * (1 / sr) / (cibleRot > rot ? 0.9 : 3);
    const charge = R.rugit != null && t >= R.rugit ? (t < R.rugit + 0.6 ? 1 : t > R.seuil ? 0.55 : 0.75) : 0.12;
    // turbines : compresseur (N1) + turbine libre, souffle de tuyère
    ph1 += 2 * Math.PI * (6100 * n1) / sr; ph2 += 2 * Math.PI * (6100 * 1.017 * n2) / sr; ph3 += 2 * Math.PI * (1850 * Math.max(n1, n2)) / sr;
    let v = (Math.sin(ph1) * n1 + Math.sin(ph2) * n2) * 0.03 + Math.sin(ph3) * 0.02 * Math.max(n1, n2) + roar.pas(rnd.signe()) * 0.12 * (n1 + n2);
    // anticouple : bourdonnement en dents de scie limitées
    const fT = rot * f.rotorTrMin / 60 * f.rapportAnticouple * f.palesAnticouple;
    phT += 2 * Math.PI * fT / sr;
    let tr = 0; for (let h = 1; h <= 8; h++) tr += Math.sin(h * phT) / h;
    v += fTr.pas(tr) * 0.05 * rot * rot;
    // boîte de transmission principale
    phB += 2 * Math.PI * (rot * 910) / sr; v += (Math.sin(phB) + 0.4 * Math.sin(3 * phB)) * 0.008 * rot;
    // rotor principal : passage de pale
    th += rot * f.rotorTrMin / 60 * f.pales / sr;
    if (th >= prochainePale && rot > 0.03) {
      prochainePale = Math.floor(th) + 1;
      const s1 = Math.round(sr * 0.006 / Math.max(0.3, rot)), s2 = Math.round(sr * 0.0007);
      const aEp = 0.55 * rot * rot, aSlap = 1.1 * rot * rot * charge * (0.8 + 0.4 * rnd());
      for (let k = -3 * s1; k <= 3 * s1; k++) { const x = k / s1; if (i + k >= 0 && i + k < n) pales[i + k] += -x * Math.exp(-x * x / 2) * aEp; }
      for (let k = -4 * s2; k <= 4 * s2; k++) { const x = k / s2; if (i + k >= 0 && i + k < n) pales[i + k] += -x * Math.exp(-x * x / 2) * aSlap; }
    }
    v += wash.pas(rnd.signe()) * 0.25 * rot * (0.6 + 0.4 * Math.sin(2 * Math.PI * th));
    G[i] = v; D[i] = v;
  }
  for (let i = 0; i < n; i++) { const p = pales[i] * 0.6 + slapHp.pas(pales[i]) * 0.35; G[i] += p; D[i] += p * 0.95; }
  // démarreurs et allumages (« whoomp ») des deux turbines
  for (const t0 of [R.demarrage, tTurb2]) {
    const a = Math.round((t0 + 0.55) * sr), lp = new Biquad(sr, 'lowpass', 260, 0.9);
    for (let k = 0; k < 0.6 * sr && a + k < n; k++) { const t = k / sr, v = lp.pas(rnd.signe()) * Math.exp(-t / 0.18) * (1 - Math.exp(-t / 0.02)) * 1.6; G[a + k] += v; D[a + k] += v; }
    const b = Math.round(t0 * sr); let ps = 0;
    for (let k = 0; k < 0.9 * sr && b + k < n; k++) { const t = k / sr, fq = 420 + 2600 * Math.min(1, t / 0.9); ps += 2 * Math.PI * fq / sr; const v = (Math.sin(ps) + 0.3 * Math.sin(2 * ps)) * 0.05 * Math.min(1, t / 0.05); G[b + k] += v; D[b + k] += v; }
    evenements.push(['allumage', +(t0 + 0.55).toFixed(3)]);
  }
  fondus(G, sr, 0.002, 0.7); fondus(D, sr, 0.002, 0.7);
  normaliser(0.9, G, D);
  return { gauche: G, droite: D, duree: fin, evenements };
}

/* ================================================================== FAUTEUIL WCMX (H01) */
function rendreFauteuil(sr, f, R, rnd) {
  const fin = R.fin, { n, g: G, d: D } = canaux(sr, fin);
  const evenements = [];
  const TITANE = [{ f: 812, t60: 0.65, a: 1 }, { f: 2140, t60: 0.5, a: 0.7 }, { f: 3920, t60: 0.38, a: 0.5 }, { f: 6080, t60: 0.25, a: 0.35 }, { f: 8460, t60: 0.15, a: 0.2 }];
  const MAIN_COURANTE = [{ f: 1510, t60: 0.12, a: 1 }, { f: 3380, t60: 0.08, a: 0.6 }, { f: 5230, t60: 0.05, a: 0.4 }];
  const mono = new Float32Array(n);
  const poussee = (t0, force) => {
    impact(sr, mono, Math.round(t0 * sr), MAIN_COURANTE, 0.4 * force, rnd, 0.0015);
    const a = Math.round(t0 * sr), bp = new Biquad(sr, 'bandpass', 1100, 0.9), lp = new Biquad(sr, 'lowpass', 120, 0.8);
    for (let k = 0; k < 0.35 * sr && a + k < n; k++) { const t = k / sr, e = Math.exp(-t / 0.09) * (1 - Math.exp(-t / 0.006)); mono[a + k] += (bp.pas(rnd.signe()) * 0.25 + lp.pas(rnd.signe()) * 0.6) * e * force; }
  };
  const amorti = (t0, force) => {                                                          // amortisseur à air : coup sourd + « pff » + cadre titane qui sonne
    const a = Math.round(t0 * sr), lp = new Biquad(sr, 'lowpass', 95, 1.1), hp = new Biquad(sr, 'bandpass', 4200, 0.8);
    for (let k = 0; k < 0.5 * sr && a + k < n; k++) { const t = k / sr; mono[a + k] += (lp.pas(rnd.signe()) * 3 * Math.exp(-t / 0.07) * (1 - Math.exp(-t / 0.003)) + hp.pas(rnd.signe()) * 0.5 * Math.exp(-t / 0.12) * (1 - Math.exp(-t / 0.02))) * force; }
    impact(sr, mono, a, TITANE, 0.5 * force, rnd, 0.0008);
    for (let j = 0; j < 5; j++) impact(sr, mono, a + Math.round((0.03 + j * 0.035 + 0.01 * rnd()) * sr), [{ f: 2650 + 400 * rnd(), t60: 0.03, a: 1 }], 0.18 * force * (1 - j / 6), rnd);   // roulettes qui vibrent
    evenements.push(['amortisseur', +t0.toFixed(3)]);
  };
  // armement du contrôleur brushless : trois bips émis par les bobinages du moteur
  [0, 0.16, 0.32].forEach((d, j) => { const a = Math.round((R.demarrage + 0.1 + d) * sr), fq = [1046, 1318, 1568][j]; for (let k = 0; k < 0.1 * sr && a + k < n; k++) { const t = k / sr; mono[a + k] += Math.sign(Math.sin(2 * Math.PI * fq * t)) * 0.05 * Math.min(1, t / 0.005) * Math.min(1, (0.1 - t) / 0.01); } });
  for (const b of R.blips || []) poussee(b, 1);
  if (R.rugit != null) { poussee(R.rugit, 1.2); amorti(R.rugit + 0.32, 1.1); }
  // départ : poussées + assistance brushless + roulement
  const pousses = [R.sortie, R.sortie + 0.55, R.sortie + 1.05];
  for (const p of pousses) if (p < fin - 0.5) poussee(p, 0.9);
  amorti(R.seuil, 0.9);                                                                     // les roulettes tombent du seuil du conteneur
  const rout = new Biquad(sr, 'lowpass', 380, 0.7), roul = new Biquad(sr, 'bandpass', 4700, 6), pwm = new Biquad(sr, 'bandpass', 8000, 4);
  let v = 0, phE = 0, phR = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let cible = 0, assist = 0;
    for (const b of R.blips || []) if (t > b) cible = Math.max(cible, 0.08 * Math.exp(-(t - b) / 0.6));
    if (t >= R.sortie) { assist = t < fin - 0.7 ? 1 : 0.2; cible = 0.7 * (1 - Math.exp(-(t - R.sortie) / 1.1)); }
    v += (cible - v) * (1 / sr) / 0.25;
    phE += 2 * Math.PI * (280 + 2400 * v) / sr;                                             // fréquence électrique du moteur-roue
    phR += 2 * Math.PI * (40 * v) / sr;
    const cog = v < 0.2 && assist ? Math.sin(phE / 6) * 0.3 : 0;
    const e = (Math.sin(phE) * 0.5 + Math.sin(2 * phE) * 0.2 + Math.sin(3 * phE) * 0.12 + cog) * 0.07 * assist * Math.min(1, v * 6) + pwm.pas(rnd.signe()) * 0.02 * assist;
    const r = rout.pas(rnd.signe()) * 0.5 * v * (1 + 0.25 * Math.sin(phR)) + roul.pas(rnd.signe()) * 0.06 * v;
    mono[i] += e + r;
  }
  for (let i = 0; i < n; i++) { G[i] = mono[i]; D[i] = mono[i] * 0.94; }
  fondus(G, sr, 0.002, 0.6); fondus(D, sr, 0.002, 0.6);
  normaliser(0.85, G, D);
  return { gauche: G, droite: D, duree: fin, evenements };
}

/* ================================================================== point d'entrée */
export function rendreMoteur(sr, fiche, reperes, { germe = 1 } = {}) {
  if (!fiche) throw new Error('fiche moteur absente');
  const R = { blips: [], ...reperes };
  for (const k of ['demarrage', 'sortie', 'seuil', 'fin']) if (!Number.isFinite(R[k])) throw new Error('repère ' + k + ' manquant');
  const rnd = hasard(germe);
  switch (fiche.type) {
    case 'piston': return rendrePiston(sr, fiche, R, rnd);
    case 'electrique': return rendreElectrique(sr, fiche, R, rnd);
    case 'vapeur': return rendreVapeur(sr, fiche, R, rnd);
    case 'rotor': return rendreRotor(sr, fiche, R, rnd);
    case 'fauteuil': return rendreFauteuil(sr, fiche, R, rnd);
    default: throw new Error('type de moteur inconnu : ' + fiche.type);
  }
}
