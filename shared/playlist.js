/* Musique de fond par mode de jeu : lecteur de playlists.
   Ordre de priorité pour chaque mode :
     1. vos fichiers audio dans  Edition_23_Decembre/Musique/<dossier du mode>/   (servis par le relais, hors-ligne)
     2. une playlist (ou vidéo) YouTube associée au mode depuis la régie         (Internet requis, lecteur YouTube officiel)
     3. la musique procédurale du mode (synthétiseur intégré, toujours disponible)
   Lecture aléatoire sans répétition, fondus enchaînés entre les morceaux et lors des changements de mode,
   la musique s'efface automatiquement sous les jingles et les voix (« ducking »). */
import * as snd from './audio.js';

const FADE_MS = 1800;
const BASE_VOL = 0.55;

export function createPlaylistPlayer({ relayBase = () => '', onNowPlaying = () => {}, ytHost = null } = {}) {
  let library = { folders: {}, map: {} }, libLoaded = false;
  let mode = null, source = 'none', queue = [], qi = 0, enabled = true, duckLvl = 1, userVol = BASE_VOL;
  let cur = null;                                  // élément <audio> courant
  let ytPlayer = null, ytReady = null, ytCurrent = null;
  let synthId = null;

  /* ---------------- bibliothèque locale */
  async function refreshLibrary() {
    try {
      const r = await fetch(relayBase() + '/api/v2/music', { cache: 'no-store' });
      if (r.ok) { library = await r.json(); libLoaded = true; }
    } catch { /* site statique sans relais : pas de fichiers locaux */ }
    return library;
  }
  const filesFor = (m) => (library.folders[(library.map || {})[m]] || []);

  /* ---------------- volume (fondus + ducking) */
  function targetVol() { return enabled ? userVol * duckLvl : 0; }
  function fade(el, to, ms, done) {
    const from = el.volume, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  }
  let duckTimer = null;
  snd.onDuck((lvl, ms) => {
    duckLvl = lvl; applyVolume(250);
    clearTimeout(duckTimer);
    duckTimer = setTimeout(() => { duckLvl = 1; applyVolume(900); }, ms);
  });
  function applyVolume(ms = 400) {
    if (cur) fade(cur, targetVol(), ms);
    if (ytPlayer && ytPlayer.setVolume) try { ytPlayer.setVolume(Math.round(targetVol() * 100)); } catch { /* lecteur pas prêt */ }
  }

  /* ---------------- fichiers locaux */
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function playLocal(item) {
    const el = new Audio();
    el.src = relayBase() + item.src; el.preload = 'auto'; el.volume = 0; el.crossOrigin = 'anonymous';
    const old = cur; cur = el;
    if (old) fade(old, 0, FADE_MS, () => { old.pause(); old.src = ''; });
    el.addEventListener('timeupdate', () => {             // fondu enchaîné 3 s avant la fin
      if (el === cur && el.duration && el.duration - el.currentTime < 3 && !el._next) { el._next = true; nextLocal(); }
    });
    el.addEventListener('ended', () => { if (el === cur && !el._next) nextLocal(); });
    el.addEventListener('error', () => { if (el === cur) { el._next = true; setTimeout(nextLocal, 300); } });
    const p = el.play();
    if (p && p.catch) p.catch(() => { /* lecture bloquée tant qu'il n'y a pas eu de clic : on réessaiera */ pendingPlay = el; });
    fade(el, targetVol(), FADE_MS);
    onNowPlaying({ source: 'local', title: item.title });
  }
  let pendingPlay = null;
  function nextLocal() {
    if (source !== 'local' || !queue.length) return;
    qi = (qi + 1) % queue.length;
    if (qi === 0) shuffle(queue);
    playLocal(queue[qi]);
  }

  /* ---------------- YouTube (lecteur officiel, playlist ou vidéo) */
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise((res) => {
      if (window.YT && window.YT.Player) return res(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(window.YT); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = () => res(null);
      document.head.appendChild(s);
    });
    return ytReady;
  }
  async function playYouTube(id) {
    const YT = await loadYT();
    if (!YT || source !== 'youtube') return false;
    if (ytHost) ytHost.classList.remove('hide');
    const vars = { autoplay: 1, controls: 0, rel: 0, playsinline: 1, modestbranding: 1 };
    if (id.list) { vars.listType = 'playlist'; vars.list = id.list; }
    const onReady = (e) => {
      try { e.target.setVolume(Math.round(targetVol() * 100)); if (id.list) e.target.setShuffle(true); e.target.setLoop(true); e.target.playVideo(); } catch { /* ignore */ }
    };
    const onState = (e) => {
      if (e.data === 1) { try { const d = ytPlayer.getVideoData(); onNowPlaying({ source: 'youtube', title: d && d.title }); } catch { /* ignore */ } }
      if (e.data === 0 && !id.list) try { ytPlayer.seekTo(0); ytPlayer.playVideo(); } catch { /* ignore */ }
    };
    const key = JSON.stringify(id);
    if (ytPlayer && ytCurrent === key) { try { ytPlayer.playVideo(); } catch { /* ignore */ } return true; }
    if (ytPlayer) { try { ytPlayer.destroy(); } catch { /* ignore */ } ytPlayer = null; }
    const holder = document.createElement('div');
    (ytHost || document.body).querySelector('.yt-slot')?.replaceChildren(holder);
    if (!ytHost) document.body.appendChild(holder);
    ytCurrent = key;
    ytPlayer = new YT.Player(holder, { width: 240, height: 200, videoId: id.video || undefined, playerVars: vars, events: { onReady, onStateChange: onState } });
    return true;
  }
  function stopYouTube() {
    if (ytPlayer) { try { ytPlayer.pauseVideo(); } catch { /* ignore */ } }
    if (ytHost) ytHost.classList.add('hide');
  }

  /* ---------------- synthèse procédurale */
  function playSynth(musicId) { synthId = musicId; snd.setMusicOn(enabled); snd.musicStart(musicId); onNowPlaying({ source: 'synth', title: null }); }
  function stopSynth() { snd.setMusicOn(false); }

  /* ---------------- API */
  async function setMode(m, { youtube = null, synth = 'noel' } = {}) {
    if (!libLoaded) await refreshLibrary();
    const files = filesFor(m);
    const sameSource = mode && (library.map || {})[mode] === (library.map || {})[m] && files.length && source === 'local';
    mode = m;
    if (sameSource) return source;                       // même dossier (ex. les deux Grand Prix) : la musique continue
    if (files.length) {
      if (source === 'youtube') stopYouTube();
      if (source === 'synth') stopSynth();
      source = 'local'; queue = shuffle(files.slice()); qi = 0;
      if (enabled) playLocal(queue[0]);
    } else if (youtube) {
      if (cur) { const old = cur; cur = null; fade(old, 0, FADE_MS, () => old.pause()); }
      if (source === 'synth') stopSynth();
      source = 'youtube';
      if (enabled && !(await playYouTube(youtube))) { source = 'synth'; playSynth(synth); }
    } else {
      if (cur) { const old = cur; cur = null; fade(old, 0, FADE_MS, () => old.pause()); }
      if (source === 'youtube') stopYouTube();
      source = 'synth';
      if (enabled) playSynth(synth);
    }
    return source;
  }
  function next() {
    if (source === 'local') nextLocal();
    else if (source === 'youtube' && ytPlayer) { try { ytPlayer.nextVideo(); } catch { /* ignore */ } }
  }
  function setEnabled(on) {
    enabled = !!on;
    if (source === 'local') {
      if (enabled && cur && cur.paused) cur.play().catch(() => {});
      else if (enabled && !cur && queue.length) playLocal(queue[qi]);
      applyVolume(600);
      if (!enabled && cur) setTimeout(() => { if (!enabled && cur) cur.pause(); }, 700);
    } else if (source === 'youtube') {
      if (ytPlayer) try { enabled ? ytPlayer.playVideo() : ytPlayer.pauseVideo(); } catch { /* ignore */ }
    } else if (source === 'synth') {
      snd.setMusicOn(enabled); if (enabled && synthId) snd.musicStart(synthId);
    }
  }
  /** À appeler après un geste utilisateur (clic, touche) : relance une lecture bloquée par le navigateur. */
  function unlock() {
    if (pendingPlay) { const el = pendingPlay; pendingPlay = null; el.play().catch(() => { pendingPlay = el; }); }
  }
  function setVolume(v) { userVol = Math.max(0, Math.min(1, v)); applyVolume(200); }
  function stop() { if (cur) { const o = cur; cur = null; fade(o, 0, 600, () => o.pause()); } stopYouTube(); stopSynth(); source = 'none'; mode = null; }
  return {
    setMode, next, setEnabled, unlock, setVolume, stop, refreshLibrary,
    get source() { return source; }, get enabled() { return enabled; }, get volume() { return userVol; },
    countFor: (m) => filesFor(m).length, library: () => library,
  };
}
