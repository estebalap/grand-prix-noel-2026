/* Sons du Showroom : moteur propre à chaque concept-car, ambiance de stand, effet de changement.
   1) Synthèse procédurale Web Audio (aucun fichier, aucune licence) : harmoniques d'allumage selon le nombre de
      cylindres, râpe d'échappement, turbo + soupape de décharge, pétarades, sifflement électrique, turbine, claquement diesel.
   2) Fichiers « déposés » prioritaires : si web/sounds/moteurs/NN.mp3 (01 à 15), web/sounds/ambiance/garage.mp3 ou
      web/sounds/effets/changement.mp3 existent, ils remplacent la synthèse (boucle + vitesse de lecture liée au régime).
   Le son ne démarre qu'après un geste de l'utilisateur (règle des navigateurs). */

/* ------------------------------------------------------------------ profils moteur des 15 écuries */
export const ENGINES = {
  1: { label: 'Turbine à réaction', type: 'turbine', idle: 0.22, max: 1, gain: 0.9 },
  2: { label: 'V16 de poche (si, si)', type: 'combustion', cyl: 16, idle: 900, max: 9500, grit: 0.35, rasp: 0.35, burble: 0.05, bright: 1.15, gain: 0.8 },
  3: { label: 'V6 biturbo hybride (endurance)', type: 'combustion', cyl: 6, idle: 1150, max: 9000, grit: 0.45, rasp: 0.5, burble: 0.15, turbo: 0.6, hybrid: 0.35, gain: 0.85 },
  4: { label: 'V12 atmosphérique de grand tourisme', type: 'combustion', cyl: 12, idle: 800, max: 8200, grit: 0.3, rasp: 0.4, burble: 0.05, bright: 1.05, gain: 0.85 },
  5: { label: 'V8 vilebrequin croisé + compresseur', type: 'combustion', cyl: 8, idle: 720, max: 6500, grit: 0.75, rasp: 0.65, burble: 0.9, blower: 0.55, pops: 0.6, gain: 0.95 },
  6: { label: 'Moteur électrique haute tension', type: 'electric', idle: 0, max: 16000, gain: 0.7 },
  7: { label: '4 cylindres turbo rallye + anti-lag', type: 'combustion', cyl: 4, idle: 1000, max: 8000, grit: 0.6, rasp: 0.75, burble: 0.2, turbo: 0.7, pops: 1, gain: 0.9 },
  8: { label: '6 cylindres diesel de dépanneuse', type: 'combustion', cyl: 6, idle: 650, max: 3400, grit: 0.55, rasp: 0.3, burble: 0.25, diesel: 0.9, turbo: 0.45, gain: 0.9 },
  9: { label: '6 en ligne biturbo JDM', type: 'combustion', cyl: 6, idle: 1000, max: 8500, grit: 0.5, rasp: 0.6, burble: 0.1, turbo: 1, pops: 0.5, gain: 0.9 },
  10: { label: 'V8 démoniaque de 9 litres', type: 'combustion', cyl: 8, idle: 600, max: 5400, grit: 1, rasp: 0.8, burble: 1, sub: 1, pops: 0.8, gain: 1 },
  11: { label: 'Bicylindre câlin qui ronronne', type: 'combustion', cyl: 2, idle: 1100, max: 6800, grit: 0.25, rasp: 0.3, burble: 0.4, purr: 1, gain: 0.75 },
  12: { label: 'V12 « coin » années 80', type: 'combustion', cyl: 12, idle: 900, max: 8000, grit: 0.55, rasp: 0.55, burble: 0.1, bright: 1.1, gain: 0.85 },
  13: { label: 'Rotatif birotor', type: 'combustion', cyl: 4, idle: 1100, max: 9000, grit: 0.5, rasp: 0.85, burble: 0.05, bright: 1.25, pops: 0.4, gain: 0.85 },
  14: { label: 'V6 nasal de drift + soupape', type: 'combustion', cyl: 6, idle: 850, max: 7600, grit: 0.6, rasp: 0.7, burble: 0.3, turbo: 0.8, pops: 0.7, gain: 0.9 },
  15: { label: '8 en ligne des années 30', type: 'combustion', cyl: 8, idle: 600, max: 4600, grit: 0.2, rasp: 0.2, burble: 0, bright: 0.7, gain: 0.8 },
};

const pad2 = (n) => String(n).padStart(2, '0');

export function createEngineAudio({ base = '../sounds/', isMuted = () => false } = {}) {
  let ac = null, out = null, comp = null, noiseBuf = null;
  let enabled = false, voice = null, amb = null, rpmTimer = null;
  const files = new Map();              // url → AudioBuffer | null (absent)

  function ctx() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;
    out = ac.createGain(); out.gain.value = 0.8; out.connect(comp); comp.connect(ac.destination);
    const n = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  async function loadFile(rel) {
    if (base === null) return null;                 // base null : synthèse seule (aucune requête réseau)
    const url = base + rel;
    if (files.has(url)) return files.get(url);
    files.set(url, null);
    try {
      const r = await fetch(url, { cache: 'force-cache' });
      if (!r.ok || !/audio|octet|mpeg/i.test(r.headers.get('content-type') || 'audio')) return null;
      const buf = await ctx().decodeAudioData(await r.arrayBuffer());
      files.set(url, buf); return buf;
    } catch (e) { return null; }
  }
  const noise = (loop = true) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; return s; };
  function shaper(k) { const ws = ac.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * (1 + k * 6)) / Math.tanh(1 + k * 6); } ws.curve = c; return ws; }

  /** Onde périodique d'un cycle moteur (2 tours) : raies d'allumage dominantes + sous-harmoniques (« glouglou » des V8 croisés). */
  function engineWave(p) {
    const N = Math.max(48, p.cyl * 6), re = new Float32Array(N + 1), im = new Float32Array(N + 1), fire = p.cyl / 2;
    for (let k = 1; k <= N; k++) {
      const onFire = Math.abs(k / fire - Math.round(k / fire)) < 1e-6;
      const a = (onFire ? 1 : 0.18 * (p.burble || 0) + 0.03) / Math.pow(k / fire, 0.9 - 0.25 * (p.bright || 1));
      im[k] = a * (0.6 + 0.4 * Math.sin(k * 1.7)); re[k] = a * 0.3 * Math.cos(k * 2.3);
    }
    return ac.createPeriodicWave(re, im);
  }

  /* ------------------------------------------------------------ voix moteur synthétique */
  function synthVoice(p) {
    const g = ac.createGain(); g.gain.value = 0; g.connect(out);
    const nodes = [], params = { rpm: p.type === 'turbine' ? p.idle : p.idle, thr: 0 };
    const stopAll = () => nodes.forEach((n) => { try { n.stop(); } catch (e) { /* déjà arrêté */ } });
    let update;
    if (p.type === 'electric') {
      const lp = ac.createBiquadFilter(); lp.type = 'bandpass'; lp.Q.value = 3; lp.connect(g);
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g1 = ac.createGain(), g2 = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'triangle'; g1.gain.value = 0.25; g2.gain.value = 0.18;
      o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(g);
      const air = noise(), airF = ac.createBiquadFilter(), airG = ac.createGain(); airF.type = 'lowpass'; airF.frequency.value = 900; airG.gain.value = 0.05; air.connect(airF); airF.connect(airG); airG.connect(g);
      [o1, o2, air].forEach((n) => { n.start(); nodes.push(n); });
      update = (rpm, thr, t) => { const f = 180 + rpm * 0.2; o1.frequency.setTargetAtTime(f, t, 0.05); o2.frequency.setTargetAtTime(f * 1.5 + 40, t, 0.05); lp.frequency.setTargetAtTime(f * 1.2, t, 0.05); g1.gain.setTargetAtTime(0.12 + 0.25 * thr, t, 0.05); airG.gain.setTargetAtTime(0.03 + 0.12 * rpm / p.max, t, 0.1); };
    } else if (p.type === 'turbine') {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.connect(g);
      const n1 = noise(); n1.connect(bp);
      const wh = ac.createOscillator(), whG = ac.createGain(); wh.type = 'sine'; whG.gain.value = 0.04; wh.connect(whG); whG.connect(g);
      const rum = ac.createOscillator(), rumG = ac.createGain(); rum.type = 'triangle'; rum.frequency.value = 38; rumG.gain.value = 0.25; rum.connect(rumG); rumG.connect(g);
      [n1, wh, rum].forEach((n) => { n.start(); nodes.push(n); });
      update = (r, thr, t) => { bp.frequency.setTargetAtTime(260 + 1700 * r, t, 0.15); wh.frequency.setTargetAtTime(1800 + 4200 * r, t, 0.2); whG.gain.setTargetAtTime(0.02 + 0.06 * r, t, 0.2); rumG.gain.setTargetAtTime(0.18 + 0.2 * thr, t, 0.1); };
    } else {
      const o = ac.createOscillator(); o.setPeriodicWave(engineWave(p));
      const drive = shaper(p.grit || 0.4), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
      const body = ac.createGain(); body.gain.value = 0.55;
      o.connect(drive); drive.connect(lp); lp.connect(body); body.connect(g);
      // râpe d'échappement : bruit filtré, modulé au rythme des explosions
      const n1 = noise(), bp = ac.createBiquadFilter(), am = ac.createGain(), ras = ac.createGain();
      bp.type = 'bandpass'; bp.Q.value = 1.1; am.gain.value = 0; ras.gain.value = (p.rasp || 0.4) * 0.5;
      const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.type = 'square'; lfoG.gain.value = 0.5;
      lfo.connect(lfoG); lfoG.connect(am.gain); n1.connect(bp); bp.connect(am); am.connect(ras); ras.connect(g);
      const sub = ac.createOscillator(), subG = ac.createGain(); sub.type = 'sine'; subG.gain.value = 0.25 * (p.sub || 0.3); sub.connect(subG); subG.connect(g);
      [o, n1, lfo, sub].forEach((n) => { n.start(); nodes.push(n); });
      // options
      let tb, tbG, bl, blG, hy, hyG, cl, clG, pu, puG;
      if (p.turbo) { tb = ac.createOscillator(); tb.type = 'sine'; tbG = ac.createGain(); tbG.gain.value = 0; tb.connect(tbG); tbG.connect(g); tb.start(); nodes.push(tb); }
      if (p.blower) { bl = ac.createOscillator(); bl.type = 'triangle'; blG = ac.createGain(); blG.gain.value = 0; bl.connect(blG); blG.connect(g); bl.start(); nodes.push(bl); }
      if (p.hybrid) { hy = ac.createOscillator(); hy.type = 'sawtooth'; hyG = ac.createGain(); hyG.gain.value = 0; const hf = ac.createBiquadFilter(); hf.type = 'bandpass'; hf.Q.value = 4; hy.connect(hf); hf.connect(hyG); hyG.connect(g); hy.start(); nodes.push(hy); hy.__f = hf; }
      if (p.diesel) { cl = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800; clG = ac.createGain(); clG.gain.value = 0; const pl = ac.createOscillator(), plG = ac.createGain(); pl.type = 'square'; plG.gain.value = 0.5; pl.connect(plG); plG.connect(clG.gain); cl.connect(hp); hp.connect(clG); clG.connect(g); cl.start(); pl.start(); nodes.push(cl, pl); cl.__pl = pl; }
      if (p.purr) { pu = ac.createOscillator(); pu.type = 'sine'; pu.frequency.value = 26; puG = ac.createGain(); puG.gain.value = 0; pu.connect(puG); puG.connect(body.gain); pu.start(); nodes.push(pu); }
      let lastRpm = p.idle, popT = 0;
      update = (rpm, thr, t) => {
        const crank = rpm / 60, cycle = crank / 2, fireF = cycle * p.cyl;
        o.frequency.setTargetAtTime(cycle, t, 0.03); lfo.frequency.setTargetAtTime(fireF, t, 0.03); sub.frequency.setTargetAtTime(fireF / 2, t, 0.03);
        const load = 0.35 + 0.65 * thr, r = (rpm - p.idle) / (p.max - p.idle);
        lp.frequency.setTargetAtTime((350 + fireF * 4.5 + 2600 * load * (p.bright || 1)), t, 0.04);
        bp.frequency.setTargetAtTime(Math.min(6000, fireF * 2.2 + 300), t, 0.04);
        ras.gain.setTargetAtTime((p.rasp || 0.4) * (0.25 + 0.55 * load), t, 0.05);
        body.gain.setTargetAtTime(0.4 + 0.35 * load, t, 0.05);
        if (tb) { tb.frequency.setTargetAtTime(2200 + 5200 * r, t, 0.25); tbG.gain.setTargetAtTime(p.turbo * 0.05 * thr * r, t, 0.2); }
        if (bl) { bl.frequency.setTargetAtTime(crank * 14, t, 0.05); blG.gain.setTargetAtTime(p.blower * 0.05 * (0.3 + r), t, 0.05); }
        if (hy) { hy.frequency.setTargetAtTime(300 + rpm * 0.35, t, 0.05); hy.__f.frequency.setTargetAtTime(400 + rpm * 0.4, t, 0.05); hyG.gain.setTargetAtTime(p.hybrid * 0.12 * (0.2 + thr), t, 0.1); }
        if (cl) { cl.__pl.frequency.setTargetAtTime(fireF, t, 0.03); clG.gain.setTargetAtTime(p.diesel * 0.06 * (0.6 + 0.4 * (1 - r)), t, 0.05); }
        if (pu) puG.gain.setTargetAtTime(p.purr * 0.2 * (1 - Math.min(1, r * 3)), t, 0.2);
        // décélération : soupape de décharge du turbo + pétarades
        const dec = lastRpm - rpm; lastRpm = rpm;
        if (p.turbo && dec > 140 && r > 0.35 && t - popT > 0.7) { popT = t; whoosh(t, 0.35, 1800, 4200, 0.12 * p.turbo, 'highpass'); }
        if (p.pops && dec > 60 && r > 0.15 && Math.random() < 0.18 * p.pops) bang(t + Math.random() * 0.05, 0.22 * p.pops);
      };
    }
    return { g, params, update, stopAll };
  }

  /* ------------------------------------------------------------ voix moteur depuis un fichier déposé */
  function fileVoice(buf, p) {
    const g = ac.createGain(); g.gain.value = 0; g.connect(out);
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start();
    const span = p.type === 'electric' ? p.max : p.max - p.idle;
    return { g, params: { rpm: p.idle, thr: 0 }, stopAll: () => { try { s.stop(); } catch (e) { /* déjà arrêté */ } },
      update: (rpm, thr, t) => { const r = p.type === 'turbine' ? rpm : (rpm - (p.type === 'electric' ? 0 : p.idle)) / span; s.playbackRate.setTargetAtTime(0.85 + 0.85 * Math.max(0, r), t, 0.05); } };
  }

  /* ------------------------------------------------------------ petits effets */
  function whoosh(t, dur, f0, f1, vol, type = 'bandpass') {
    const n = noise(false), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = type; f.Q.value = 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + dur + 0.05);
  }
  function bang(t, vol) {
    const n = noise(false), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 900 + Math.random() * 900;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + Math.random() * 0.06);
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.2);
  }

  /* ------------------------------------------------------------ ambiance de stand */
  async function startAmbience() {
    if (amb) return;
    const file = await loadFile('ambiance/garage.mp3');
    if (!enabled || amb) return;
    const g = ac.createGain(); g.gain.value = 0; g.connect(out); g.gain.setTargetAtTime(file ? 0.35 : 0.5, ac.currentTime, 1.2);
    const nodes = []; let timer = null;
    if (file) { const s = ac.createBufferSource(); s.buffer = file; s.loop = true; s.connect(g); s.start(); nodes.push(s); }
    else {
      const room = noise(), lp = ac.createBiquadFilter(), rg = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 260; rg.gain.value = 0.18; room.connect(lp); lp.connect(rg); rg.connect(g);
      const crowd = noise(), bp = ac.createBiquadFilter(), cg = ac.createGain(), wob = ac.createOscillator(), wg = ac.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.6; cg.gain.value = 0.05; wob.frequency.value = 0.13; wg.gain.value = 0.03; wob.connect(wg); wg.connect(cg.gain);
      crowd.connect(bp); bp.connect(cg); cg.connect(g);
      [room, crowd, wob].forEach((n) => { n.start(); nodes.push(n); });
      const wrench = () => { // clé à chocs au loin : rafale de coups à ~35 Hz
        if (!enabled) return; const t = ac.currentTime + 0.05, n = noise(false), f = ac.createBiquadFilter(), a = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
        f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2; lfo.type = 'square'; lfo.frequency.value = 32 + Math.random() * 8; lg.gain.value = 0.04; lfo.connect(lg); lg.connect(a.gain); a.gain.value = 0.04;
        n.connect(f); f.connect(a); a.connect(g); const d = 0.35 + Math.random() * 0.5; n.start(t); lfo.start(t); n.stop(t + d); lfo.stop(t + d);
        timer = setTimeout(wrench, 5000 + Math.random() * 9000);
      };
      timer = setTimeout(wrench, 2500);
    }
    amb = { g, stop() { clearTimeout(timer); g.gain.setTargetAtTime(0, ac.currentTime, 0.3); setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch (e) { /* déjà arrêté */ } }), 1500); } };
  }

  /* ------------------------------------------------------------ régime moteur (inertie, ralenti vivant) */
  const sim = { rpm: 0, thr: 0, target: 0, p: null, revUntil: 0 };
  function tick() {
    if (!voice || !ac) return;
    const t = ac.currentTime, p = sim.p, now = performance.now();
    const thr = now < sim.revUntil ? 1 : 0; sim.thr += (thr - sim.thr) * 0.25;
    const lo = p.type === 'turbine' ? p.idle : p.type === 'electric' ? 0 : p.idle, hi = p.max;
    const wobble = p.type === 'combustion' ? Math.sin(now / 170) * p.idle * 0.015 + (Math.random() - 0.5) * p.idle * 0.01 : 0;
    const target = lo + (hi - lo) * 0.85 * sim.thr;
    const k = target > sim.rpm ? 0.09 : 0.045;          // monte plus vite qu'elle ne redescend
    sim.rpm += (target - sim.rpm) * k;
    voice.update(Math.max(lo, sim.rpm + wobble), sim.thr, t);
  }

  async function start(teamId) {
    if (!enabled || !ctx()) return;
    const p = ENGINES[teamId] || ENGINES[9];
    const file = await loadFile(`moteurs/${pad2(teamId)}.mp3`);
    if (!enabled) return;
    stopVoice();
    const fx = await loadFile('effets/changement.mp3');
    const t = ac.currentTime;
    if (fx) { const s = ac.createBufferSource(), fg = ac.createGain(); s.buffer = fx; fg.gain.value = 0.6; s.connect(fg); fg.connect(out); s.start(t); }
    else whoosh(t, 0.8, 250, 3200, 0.18);
    voice = file ? fileVoice(file, p) : synthVoice(p);
    sim.p = p; sim.rpm = p.type === 'electric' ? 0 : p.idle; sim.thr = 0;
    voice.g.gain.setTargetAtTime((p.gain || 0.85) * 0.55, t + 0.3, 0.3);
    clearInterval(rpmTimer); rpmTimer = setInterval(tick, 30);
    setTimeout(() => rev(0.7), 700);                   // coup de gaz d'accueil
  }
  function rev(sec = 1.1) { if (enabled && voice) sim.revUntil = performance.now() + sec * 1000; }
  function stopVoice() {
    if (!voice) return; const v = voice; voice = null; clearInterval(rpmTimer);
    v.g.gain.setTargetAtTime(0, ac.currentTime, 0.15); setTimeout(v.stopAll, 900);
  }
  function setEnabled(on) {
    enabled = !!on && !isMuted();
    if (enabled) { if (!ctx()) { enabled = false; return false; } startAmbience(); }
    else { stopVoice(); if (amb) { amb.stop(); amb = null; } }
    return enabled;
  }
  return { start, rev, stop: stopVoice, setEnabled, isEnabled: () => enabled, label: (id) => (ENGINES[id] || {}).label || '' };
}
