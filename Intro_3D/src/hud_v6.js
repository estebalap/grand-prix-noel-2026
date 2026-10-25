/* HUD BROADCAST de l'intro V6 « L'Hybride Ultime » : la netteté de la Version 2 (fiches d'écuries, stats, tableau des
   paris) posée sur la 3D de la Version 1.

   Principe : un canevas 2D à la résolution EXACTE de l'image (1 texel = 1 pixel), dessiné à chaque image comme une
   FONCTION PURE de (t, plan) — aucune horloge, aucun état reporté —, puis plaqué par un quad orthographique rendu APRÈS le
   post-traitement (post_v6.rendre) : le bloom, le flou radial, l'aberration, le grain et les lignes de balayage ne le
   touchent jamais. Typographie broadcast (capitales grasses, chiffres tabulaires), verre dépoli sombre
   rgba(10, 14, 22, 0.82), liseré néon aux couleurs de l'écurie, entrées / sorties en glissé (ease-out 280 ms).

   creerHUD(renderer, L, H, { equipes, logos, concepts }) → { maj(t, plan, ctx), rendre(), liberer() }
     plan.hud (généré par generer_plans_v6.py) :
       { type: 'ecurie', index, cote: 'g'|'d', debut, fin, impact }      carte d'écurie dans le tiers libre
       { type: 'groupe', lettre, index, debut, fin }                       les 5 écuries du groupe (bandeau bas)
       { type: 'stat', valeur, label, sous, couleur, debut, fin }          bas de cadre « statistique »
       { type: 'univers', titre, sous, couleur, debut, fin }               bas de cadre « univers »
       { type: 'paris', debut, fin }                                       tableau des paris en direct (cotes d'exemple)
     plan.direct = true → pastille « ● EN DIRECT » en haut à gauche. */
const T = () => window.THREE;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sortie = (u) => 1 - (1 - u) ** 3;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const POLICE = '"Inter", "Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif';
const VOIES = ['#ff4fb8', '#3f8cff', '#35e07a', '#ffe23d', '#ff8a2a'];

/** Opacité / glissé d'un élément affiché sur [debut, fin] : entrée 0,28 s, sortie 0,22 s. */
/** Couleur d'écurie LISIBLE sur verre sombre : une teinte trop sombre est éclaircie vers le blanc. */
function lisible(hex, min = 0.5) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#ffffff';
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255; if (lum >= min) return '#' + m[1];
  const k = Math.min(1, (min - lum) / (1 - lum) + 0.15), f = (c) => Math.round(c + (255 - c) * k);
  return `rgb(${f(r)}, ${f(gg)}, ${f(b)})`;
}
/** La plus lumineuse des deux couleurs d'écurie, rendue lisible. */
function accentLisible(c0, c1) {
  const L = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 0; const n = parseInt(m[1], 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  return lisible(L(c1) >= L(c0) ? c1 : c0);
}

function apparition(t, debut, fin) {
  if (!(t >= debut - 1e-6 && t <= fin)) return 0;
  return Math.min(sortie(clamp((t - debut) / 0.28)), sortie(clamp((fin - t) / 0.22)));
}

export function creerHUD(renderer, L, H, { equipes = [], logos = {}, concepts = {} } = {}) {
  const THREE = T();
  const cv = document.createElement('canvas'); cv.width = L; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.encoding = renderer.outputEncoding;                                   // décodé puis ré-encodé à l'identique : couleurs exactes
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  quad.frustumCulled = false; scene.add(quad);
  const k = H / 1080;                                                        // tout est dessiné en « pixels 1080p »
  let visible = false;

  /* ------------------------------------------------------------ primitives */
  const px = (v) => Math.round(v * k);
  const police = (taille, poids = 800, italique = false) => `${italique ? 'italic ' : ''}${poids} ${px(taille)}px ${POLICE}`;
  function arrondi(x, y, l, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + l, y, x + l, y + h, r); g.arcTo(x + l, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + l, y, r); g.closePath(); }
  function verre(x, y, l, h, accent = '#ffffff', neon = null, alpha = 1) {
    g.save(); g.globalAlpha = alpha;
    arrondi(x, y, l, h, px(14)); g.fillStyle = 'rgba(10, 14, 22, 0.82)'; g.fill();
    const gr = g.createLinearGradient(0, y, 0, y + h * 0.35); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fill();
    if (neon) { g.shadowColor = neon; g.shadowBlur = px(16); g.lineWidth = px(2); g.strokeStyle = neon; g.stroke(); g.shadowBlur = 0; }
    g.restore();
    g.save(); g.globalAlpha = alpha; arrondi(x, y, l, h, px(14)); g.clip(); g.fillStyle = accent; g.fillRect(x, y, px(7), h); g.restore();
  }
  function texte(s, x, y, taille, { poids = 800, couleur = '#ffffff', align = 'left', max = 0, italique = false, alpha = 1, espace = 0 } = {}) {
    let t2 = taille; g.font = police(t2, poids, italique);
    if (max > 0) while (g.measureText(s).width > max && t2 > 10) { t2 -= 1; g.font = police(t2, poids, italique); }
    g.save(); g.globalAlpha = alpha; g.fillStyle = couleur; g.textAlign = align; g.textBaseline = 'alphabetic';
    if (espace && 'letterSpacing' in g) g.letterSpacing = `${px(espace)}px`;
    g.fillText(s, x, y); g.restore(); return t2;
  }
  function lignes(s, x, y, taille, maxL, interligne, opts = {}) {                        // retour à la ligne par mots, 2 lignes max
    g.font = police(taille, opts.poids ?? 600, opts.italique); const mots = s.split(/\s+/); const out = []; let cur = '';
    for (const m of mots) { const essai = cur ? cur + ' ' + m : m; if (g.measureText(essai).width > maxL && cur) { out.push(cur); cur = m; } else cur = essai; }
    if (cur) out.push(cur);
    const garde = out.slice(0, opts.max || 2); if (out.length > garde.length) garde[garde.length - 1] = garde[garde.length - 1].replace(/\s*\S*$/, '') + ' …';
    garde.forEach((l, i) => texte(l, x, y + i * interligne, taille, { ...opts, max: maxL }));
    return garde.length;
  }
  function logo(id, cx, cy, r, bord = '#ffffff', alpha = 1) {
    const im = logos[id];
    g.save(); g.globalAlpha = alpha; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath(); g.fillStyle = '#05070c'; g.fill(); g.clip();
    if (im && im.naturalWidth) { const s = Math.max((2 * r) / im.naturalWidth, (2 * r) / im.naturalHeight); g.drawImage(im, cx - im.naturalWidth * s / 2, cy - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
    g.restore();
    g.save(); g.globalAlpha = alpha; g.lineWidth = px(3); g.strokeStyle = bord; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
  }

  /* ------------------------------------------------------------ éléments */
  function pastilleDirect(t) {
    const x = px(48), y = px(42);
    g.save(); g.fillStyle = 'rgba(10,14,22,0.82)'; arrondi(x, y, px(330), px(46), px(10)); g.fill(); g.restore();
    const on = 0.65 + 0.35 * Math.sin(t * 4.2);                              // respiration lente (pas de clignotement)
    g.save(); g.fillStyle = `rgba(255, 45, 70, ${on})`; g.beginPath(); g.arc(x + px(24), y + px(23), px(8), 0, Math.PI * 2); g.fill(); g.restore();
    texte('EN DIRECT', x + px(42), y + px(31), 20, { poids: 900, espace: 1.5 });
    g.font = police(20, 900); const lD = g.measureText('EN DIRECT').width + px(20) + ('letterSpacing' in g ? px(1.5) * 9 : 0);
    g.save(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + px(42) + lD, y + px(12), px(2), px(22)); g.restore();
    texte('GRAND PRIX DE NOËL', x + px(42) + lD + px(16), y + px(31), 17, { poids: 700, couleur: '#ffc83d', max: px(330) - (px(42) + lD + px(30)) });
  }

  function carteEcurie(t, h) {
    const e = equipes[h.index]; if (!e) return;
    const a = apparition(t, h.debut, h.fin); if (a <= 0) return;
    const c0 = e.colors?.[0] || '#ffffff', c1 = accentLisible(c0, e.colors?.[1] || c0);   // accent toujours lisible sur le verre
    const l = px(520), hc = px(610), marge = px(64);
    const xFinal = h.cote === 'g' ? marge : L - marge - l, y = Math.round((H - hc) / 2 + px(30));
    const x = Math.round(xFinal + (h.cote === 'g' ? -1 : 1) * (1 - a) * px(80));
    verre(x, y, l, hc, c0, c1, a);
    const xi = x + px(40), lt = l - px(76);
    // en-tête : numéro + groupe
    const grp = 'ABC'[Math.floor(h.index / 5)];
    texte(String(h.index + 1).padStart(2, '0'), xi, y + px(92), 84, { poids: 900, couleur: c1, alpha: a });
    texte(`GROUPE ${grp}`, xi + px(128), y + px(54), 18, { poids: 800, couleur: '#9fb0c8', alpha: a, espace: 2 });
    texte(`ÉCURIE ${h.index + 1} / 15`, xi + px(128), y + px(84), 18, { poids: 700, couleur: '#ffffff', alpha: a * 0.85, espace: 1 });
    logo(e.id, x + l - px(96), y + px(82), px(56), c1, a);
    // nom de l'écurie (capitales, 2 lignes max)
    g.save(); g.globalAlpha = a; g.fillStyle = c1; g.fillRect(xi, y + px(124), px(64), px(4)); g.restore();
    const n = lignes((e.name || '').toUpperCase(), xi, y + px(176), 40, lt, px(46), { poids: 900, couleur: '#ffffff', alpha: a });
    let yy = y + px(176) + (n - 1) * px(46) + px(48);
    texte('PILOTE', xi, yy, 15, { poids: 800, couleur: '#9fb0c8', alpha: a, espace: 2 });
    texte(`${e.pilot || ''}${e.nickname ? ` « ${e.nickname} »` : ''}`, xi, yy + px(32), 27, { poids: 700, alpha: a, max: lt });
    yy += px(78);
    const nomConcept = concepts[e.id]?.nom || '';
    texte('CONCEPT-CAR DU SHOWROOM', xi, yy, 15, { poids: 800, couleur: '#9fb0c8', alpha: a, espace: 2 });
    texte(nomConcept, xi, yy + px(32), 27, { poids: 800, couleur: c1, alpha: a, max: lt });
    yy += px(78);
    if (e.quote) lignes(`« ${e.quote} »`, xi, yy, 22, lt, px(30), { poids: 500, italique: true, couleur: '#e6ecf5', alpha: a });
    // jauge de style : se remplit jusqu'à l'impact de l'invocation, puis « MAX »
    const yj = y + hc - px(70), lj = lt, prog = clamp((t - h.debut) / Math.max(0.3, h.impact - h.debut));
    texte('STYLE', xi, yj - px(12), 15, { poids: 800, couleur: '#9fb0c8', alpha: a, espace: 2 });
    texte(prog >= 1 ? 'MAX' : `${Math.round(prog * 100)} %`, xi + lj, yj - px(12), 17, { poids: 900, couleur: prog >= 1 ? c1 : '#ffffff', align: 'right', alpha: a });
    g.save(); g.globalAlpha = a; arrondi(xi, yj, lj, px(12), px(6)); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
    if (prog > 0.001) { const gr = g.createLinearGradient(xi, 0, xi + lj, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1); arrondi(xi, yj, Math.max(px(12), lj * prog), px(12), px(6)); g.fillStyle = gr; g.fill(); }
    g.restore();
    if (e.specialty) texte(e.specialty, xi, yj + px(42), 16, { poids: 600, couleur: '#9fb0c8', alpha: a, max: lj });
  }

  function bandeauGroupe(t, h) {
    const a = apparition(t, h.debut, h.fin); if (a <= 0) return;
    const ecus = equipes.slice(h.index * 5, h.index * 5 + 5);
    const l = px(1500), hb = px(190), x = Math.round((L - l) / 2), y = Math.round(H - px(64) - hb + (1 - a) * px(60));
    verre(x, y, l, hb, '#ffc83d', '#ffc83d', a);
    texte(`GROUPE ${h.lettre}`, x + px(40), y + px(64), 46, { poids: 900, couleur: '#ffc83d', alpha: a });
    texte('5 ÉCURIES · 5 VOIES', x + px(40), y + px(104), 18, { poids: 700, couleur: '#9fb0c8', alpha: a, espace: 2 });
    const x0 = x + px(330), pas = (l - px(350)) / 5;
    ecus.forEach((e, j) => {
      const aj = a * sortie(clamp((t - h.debut - 0.08 * j) / 0.3));
      const cx = x0 + j * pas;
      logo(e.id, cx + px(44), y + hb / 2, px(40), e.colors?.[1] || '#fff', aj);
      lignes((e.name || '').toUpperCase(), cx + px(96), y + px(82), 19, pas - px(110), px(24), { poids: 800, alpha: aj });
      texte(e.pilot || '', cx + px(96), y + px(138), 16, { poids: 600, couleur: '#9fb0c8', alpha: aj, max: pas - px(110) });
      g.save(); g.globalAlpha = aj; g.fillStyle = VOIES[j]; g.fillRect(cx + px(96), y + px(150), px(40), px(4)); g.restore();
    });
  }

  function basDeCadre(t, h, gauche = true) {
    const a = apparition(t, h.debut, h.fin); if (a <= 0) return;
    const coul = h.couleur || '#ffc83d';
    g.font = police(64, 900); const lv = g.measureText(h.valeur || h.titre || '').width;
    g.font = police(28, 800); const ll = Math.max(g.measureText(h.label || '').width, g.measureText(h.sous || '').width * 0.75);
    const l = Math.min(L * 0.6, lv + ll + px(150)), hb = px(132);
    const x = Math.round(gauche ? px(64) - (1 - a) * px(90) : L - px(64) - l + (1 - a) * px(90)), y = H - px(80) - hb;
    verre(x, y, l, hb, coul, coul, a);
    texte(h.valeur || h.titre || '', x + px(40), y + px(90), 64, { poids: 900, couleur: coul, alpha: a, max: l * 0.6 });
    const xl = x + px(40) + Math.min(lv, l * 0.6) + px(28);
    texte(h.label || '', xl, y + px(62), 28, { poids: 800, alpha: a, max: l - (xl - x) - px(30) });
    if (h.sous) texte(h.sous, xl, y + px(98), 20, { poids: 600, couleur: '#9fb0c8', alpha: a, max: l - (xl - x) - px(30) });
  }

  function tableauParis(t, h) {
    const a = apparition(t, h.debut, h.fin); if (a <= 0) return;
    const l = px(620), hb = px(560), x = Math.round(L - px(64) - l + (1 - a) * px(90)), y = Math.round((H - hb) / 2);
    verre(x, y, l, hb, '#35e07a', '#35e07a', a);
    texte('PARIS EN DIRECT', x + px(40), y + px(66), 38, { poids: 900, couleur: '#35e07a', alpha: a });
    texte('MANCHE 1 · GROUPE A', x + px(40), y + px(102), 17, { poids: 700, couleur: '#9fb0c8', alpha: a, espace: 2 });
    texte('COTE', x + l - px(40), y + px(102), 15, { poids: 800, couleur: '#9fb0c8', align: 'right', alpha: a, espace: 2 });
    for (let j = 0; j < 5; j++) {
      const yr = y + px(132) + j * px(70), aj = a * sortie(clamp((t - h.debut - 0.06 * j) / 0.3));
      g.save(); g.globalAlpha = aj; g.fillStyle = 'rgba(255,255,255,0.05)'; arrondi(x + px(30), yr, l - px(60), px(58), px(8)); g.fill();
      g.fillStyle = VOIES[j]; g.fillRect(x + px(30), yr, px(8), px(58)); g.restore();
      texte(`VOIE ${j + 1}`, x + px(56), yr + px(38), 22, { poids: 900, alpha: aj });
      const e = equipes[j]; if (e) texte((e.name || '').toUpperCase(), x + px(170), yr + px(37), 18, { poids: 700, couleur: '#e6ecf5', alpha: aj, max: px(250) });
      // cote animée (fonction pure de t) : elle « vit » comme un vrai tableau de bourse
      const base = 1.6 + hash(j * 3 + 1) * 5.4, vit = base * (1 + 0.06 * Math.sin(t * 1.7 + j * 1.9)), mont = Math.cos(t * 1.7 + j * 1.9) > 0;
      texte(vit.toFixed(2).replace('.', ','), x + l - px(70), yr + px(39), 28, { poids: 900, couleur: '#ffffff', align: 'right', alpha: aj });
      texte(mont ? '▲' : '▼', x + l - px(44), yr + px(37), 18, { poids: 900, couleur: mont ? '#35e07a' : '#ff4f6a', align: 'right', alpha: aj });
    }
    texte('Sans téléphone ? Pariez au carnet !', x + px(40), y + hb - px(48), 20, { poids: 700, couleur: '#ffc83d', alpha: a, max: l - px(80) });
    texte('cotes d’exemple', x + l - px(40), y + hb - px(20), 14, { poids: 600, couleur: '#7f8da3', align: 'right', alpha: a });
  }

  /* ------------------------------------------------------------ API */
  function maj(t, plan) {
    g.clearRect(0, 0, L, H);
    const h = plan && plan.hud; let rien = true;
    if (plan && plan.direct) { pastilleDirect(t); rien = false; }
    if (h) {
      rien = false;
      if (h.type === 'ecurie') carteEcurie(t, h);
      else if (h.type === 'groupe') bandeauGroupe(t, h);
      else if (h.type === 'stat') basDeCadre(t, h, true);
      else if (h.type === 'univers') basDeCadre(t, { ...h, valeur: h.titre, label: h.sous, sous: h.detail }, true);
      else if (h.type === 'paris') tableauParis(t, h);
    }
    visible = !rien;
    if (visible) tex.needsUpdate = true;
  }
  /** À appeler APRÈS post.rendre() : dessine le HUD par-dessus l'image finale, sans aucun post-traitement. */
  function rendre() {
    if (!visible) return;
    const auto = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(null); renderer.render(scene, cam);
    renderer.autoClear = auto;
  }
  return { maj, rendre, canvas: cv, liberer() { tex.dispose(); quad.geometry.dispose(); quad.material.dispose(); } };
}
