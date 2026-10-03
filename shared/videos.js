/* Vidéos du show : cinématique d'ouverture et clips de révélation des bolides.
   Aucune configuration : le relais liste ce qui est présent dans web/videos/ (GET /api/v2/videos).
     web/videos/intro_grand_prix.mp4   (+ intro_grand_prix.webm facultatif)
     web/videos/cars/B07.mp4           (un fichier par code gommette, .webm facultatif)
   Fichier absent = repli silencieux sur le décor animé ou la fiche dorée : jamais d'écran noir. */

export function createVideoLibrary(relayBase = () => '') {
  let lib = { intro: null, cars: {} };
  let last = 0, pending = null;
  async function refresh(force = false) {
    if (!force && Date.now() - last < 4000) return lib;
    if (pending) return pending;
    pending = (async () => {
      try {
        const r = await fetch(relayBase() + '/api/v2/videos', { cache: 'no-store' });
        if (r.ok) { const j = await r.json(); lib = { intro: j.intro || null, cars: j.cars || {} }; }
      } catch { /* site statique sans relais : pas de vidéos */ }
      last = Date.now(); pending = null;
      return lib;
    })();
    return pending;
  }
  return {
    refresh,
    intro: () => lib.intro,
    car: (code) => (code && lib.cars[String(code).toUpperCase()]) || null,
    count: () => Object.keys(lib.cars).length,
  };
}

/** Crée un <video> prêt à jouer (H.264 MP4 d'abord : lu partout ; WebM en second choix). */
export function makeVideo(src, relayBase = () => '', { muted = false, loop = false, cls = '' } = {}) {
  const v = document.createElement('video');
  v.className = cls;
  v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  v.preload = 'auto'; v.muted = muted; v.loop = loop; v.disablePictureInPicture = true;
  v.setAttribute('disableremoteplayback', '');
  for (const [type, key] of [['video/mp4', 'mp4'], ['video/webm', 'webm']]) {
    if (!src[key]) continue;
    const s = document.createElement('source');
    s.src = relayBase() + src[key]; s.type = type;
    v.appendChild(s);
  }
  return v;
}

/** Attend que la vidéo puisse démarrer sans saccade. false si erreur ou délai dépassé (=> repli). */
export function waitPlayable(v, ms = 2500) {
  return new Promise((res) => {
    if (v.readyState >= 3) { res(true); return; }
    let done = false;
    const end = (ok) => { if (done) return; done = true; clearTimeout(to); v.removeEventListener('canplay', okFn); v.removeEventListener('error', koFn, true); res(ok); };
    const okFn = () => end(true), koFn = () => { if (v.networkState === 3 || v.error) end(false); };
    const to = setTimeout(() => end(v.readyState >= 2), ms);
    v.addEventListener('canplay', okFn);
    v.addEventListener('error', koFn, true);            // capture : les erreurs des <source> remontent ici
    try { v.load(); } catch { end(false); }
  });
}

/** Lance la lecture avec le son ; si le navigateur l'interdit, relance en muet (true = son actif). */
export async function playWithSound(v) {
  try { await v.play(); return true; } catch {
    v.muted = true;
    try { await v.play(); } catch { /* lecture impossible : l'appelant se replie */ }
    return false;
  }
}

/** Fondu de volume (0..1) sur la durée donnée. */
export function fadeVolume(v, to, ms = 800) {
  return new Promise((res) => {
    const from = v.volume, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      try { v.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch { /* iOS : volume en lecture seule */ }
      if (k < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

/** Libère proprement un élément vidéo (stoppe le téléchargement). */
export function disposeVideo(v) {
  try { v.pause(); } catch { /* déjà arrêtée */ }
  v.querySelectorAll('source').forEach((s) => s.remove());
  v.removeAttribute('src');
  try { v.load(); } catch { /* ignoré */ }
}
