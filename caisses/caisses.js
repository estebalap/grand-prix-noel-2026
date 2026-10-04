/* Salle des Caisses : les 3 gammes en 3D (filaments réels), tables de tirage, mathématiques, ouverture de démonstration
   (graine locale, hors soirée) et vérificateur du tirage de la soirée (graine révélée par la régie).
   Fonctionne avec le relais (données en direct) ou sans (données statiques web/data/rules.json). */
import { $, $$, esc, DATA, findRelay, relayBase, loadData } from '../shared/core.js';
import { startAtmosphere } from '../shared/fx.js';
import { icon } from '../shared/icons.js';
import * as LBX from '../shared/lootbox.js';
import { buildCaisse, vignette, NOMS_FIL } from '../shared/caisses3d.js';

startAtmosphere({ road: false, snow: 0.35, aurora: 0.9 });
const THREE = window.THREE;
const st = { fam: new URLSearchParams(location.search).get('famille') === 'bonus' ? 'bonus' : 'piege', tier: 'elite', seed: null, nonce: 0, ouvre: false, relais: false, vign: {} };
let renderer, scene, camera, caisses = [], ray, mouse;

(async () => {
  st.relais = !!(await findRelay());
  await loadData();
  st.seed = LBX.hex(crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(32)) : Uint8Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)));
  initScene();
  drawFams();
  await placer();
  drawInfo();
  $('#demoL').onclick = demoLegendaire;
  requestAnimationFrame(boucle);
})();

const C = () => DATA.rules.caisses;
const objet = (id) => { const it = DATA.rules.shop.find((x) => x.id === id) || { name: id, icon: 'star', rarity: 'commun' }; return { name: it.name, icon: it.icon, rarity: it.rarity, effect: it.effect }; };

function drawFams() {
  $('#fams').innerHTML = Object.entries(C().familles).map(([id, f]) => `<button data-f="${id}" class="${st.fam === id ? 'on' : ''}">${icon(f.icone, 18)}${esc(f.nom)}</button>`).join('');
  $$('#fams button').forEach((b) => b.onclick = async () => { st.fam = b.dataset.f; drawFams(); await placer(); drawInfo(); });
}

function initScene() {
  const c = $('#c3');
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x231a3a, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15); sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
  const rimV = new THREE.PointLight(0x9b7bff, 1.4, 30); rimV.position.set(-6, 4, -4); scene.add(rimV);
  const rimG = new THREE.PointLight(0xffc040, 1.2, 30); rimG.position.set(6, 3, -3); scene.add(rimG);
  // socles
  const socle = new THREE.MeshStandardMaterial({ color: 0x141833, roughness: 0.4, metalness: 0.6 });
  const anneau = (col) => new THREE.MeshStandardMaterial({ color: 0x050510, emissive: col, emissiveIntensity: 1.4 });
  [-3.2, 0, 3.2].forEach((x, i) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 0.35, 64), socle); s.position.set(x, -0.18, 0); s.receiveShadow = true; scene.add(s);
    const a = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.035, 8, 96), anneau([0xd6c29a, 0x9b7bff, 0xffd34d][i])); a.rotation.x = Math.PI / 2; a.position.set(x, 0.0, 0); scene.add(a);
  });
  ray = new THREE.Raycaster(); mouse = new THREE.Vector2();
  c.addEventListener('pointerdown', (e) => {
    const r = c.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(caisses.map((k) => k.c.group), true)[0];
    if (!hit) return;
    const k = caisses.find((x) => { let o = hit.object; while (o) { if (o === x.c.group) return true; o = o.parent; } return false; });
    if (k) { if (st.tier === k.tier) ouvrirDemo(); else { st.tier = k.tier; drawInfo(); } }
  });
  const resize = () => { const r = c.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  window.addEventListener('resize', resize); resize();
}

async function placer() {
  caisses.forEach((k) => scene.remove(k.c.group));
  caisses = C().gammes.map((g, i) => { const c = buildCaisse(THREE, g.id, st.fam); c.group.position.set([-3.2, 0, 3.2][i], 0, 0); scene.add(c.group); c.group.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return { c, tier: g.id }; });
}

function drawInfo() {
  const cc = C(), fam = cc.familles[st.fam], g = cc.gammes.find((x) => x.id === st.tier);
  const t = g.tirageEffectif[st.fam];
  const pE = (t.epique || 0) + (t.legendaire || 0), pL = t.legendaire || 0;
  const valeur = Object.entries(t).reduce((a, [r, p]) => a + p * cc.contenu[st.fam][r].reduce((s, id) => { const it = DATA.rules.shop.find((x) => x.id === id); return s + it.price * cc.primeRarete[r]; }, 0) / cc.contenu[st.fam][r].length, 0);
  const pity = (1 - Math.pow(1 - pE, cc.pitie)) / pE;
  $('#statut').textContent = st.ouvre ? 'Ouverture…' : `${fam.nom} · ${g.nom} : touchez la caisse pour l'ouvrir`;
  $('#info').innerHTML = `
    <div class="panel deco"><div class="h2">${icon(fam.icone, 16)} ${esc(fam.nom)}</div><p class="dim small" style="margin-top:0">${esc(fam.desc)}</p>
      <div class="tiers">${cc.gammes.map((x) => `<button class="tier ${x.id === st.tier ? 'on' : ''}" data-t="${x.id}">${st.vign[x.id + st.fam] ? `<img src="${st.vign[x.id + st.fam]}" alt="">` : `<span data-v="${x.id}">${icon('crate', 60)}</span>`}
        <span><b>${esc(x.nom)}</b><small>${esc(x.materiau)}</small>${LBX.tableHtml(x, st.fam)}</span><span class="pz">${x.prix[st.fam]} ${icon('coin', 18, 'coin')}</span></button>`).join('')}</div>
      <p class="dim small">Prix de base (richesse neutre). En soirée : ×${(1 + cc.escalade).toFixed(2).replace('.', ',')} à chaque caisse de la manche, taxe des riches de ×${String(cc.taxeMin).replace('.', ',')} à ×${String(cc.taxeMax).replace('.', ',')}, ${cc.maxParManche} caisses au plus.</p></div>
    <div class="panel deco"><div class="h2">Les chiffres de la gamme ${esc(g.nom)}</div><div class="kv">
      <span>Valeur moyenne du contenu</span><b>${valeur.toFixed(1).replace('.', ',')} pièces</b>
      <span>Retour au joueur (RTP)</span><b>${Math.round(100 * valeur / g.prix[st.fam])} %</b>
      <span>Épique ou mieux</span><b>${(100 * pE).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % (${(100 / pity).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % avec la pitié)</b>
      <span>Légendaire</span><b>${(100 * pL).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} % · 1 caisse sur ${pL ? Math.round(1 / pL) : '∞'}</b>
      <span>Au moins 1 légendaire en 3 caisses</span><b>${(100 * (1 - Math.pow(1 - pL, 3))).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</b>
      <span>Filaments (impression)</span><b style="font-weight:600;font-size:12px">${esc(NOMS_FIL[g.id])}</b></div></div>
    <div class="panel deco"><div class="h2">Contenu possible</div>${LBX.ORDRE.map((r) => cc.contenu[st.fam][r].length ? `<div class="small dim" style="margin:8px 0 4px">${LBX.RARETES[r].nom}</div><div class="contenu">${cc.contenu[st.fam][r].map((id) => { const o = objet(id); return `<i class="r-${r}">${icon(o.icon, 14)}${esc(o.name)}</i>`; }).join('')}</div>` : '').join('')}</div>
    <div class="panel deco"><div class="h2">${icon('lock', 14)} Vérifier le tirage de la soirée</div>
      <p class="dim small" style="margin-top:0">Le relais publie l'empreinte SHA-256 de sa graine secrète avant la première caisse. À la cérémonie, la régie révèle la graine : collez-la ici, chaque tirage journalisé est recalculé (HMAC-SHA256) dans votre navigateur.</p>
      <input class="fld" id="vSeed" placeholder="Graine révélée (64 caractères hexadécimaux)">
      <p></p><input class="fld" id="vCommit" placeholder="Empreinte publiée (SHA-256)"><p></p>
      <button class="btn sm" id="vGo" type="button">Vérifier ${st.relais ? 'le journal du relais' : '(relais requis pour le journal)'}</button> <span id="vRes" class="small"></span></div>
    <div class="panel deco"><div class="h2">Démo hors soirée</div><p class="dim small" style="margin-top:0">Les ouvertures de cette page utilisent une graine locale, tirée au chargement. Elles n'ont aucun effet sur la partie et suivent exactement les tables du relais.</p>
      <div class="small" style="word-break:break-all">Empreinte de la graine de démo : <b>${LBX.empreinte(st.seed).slice(0, 32)}…</b></div></div>`;
  $$('.tier').forEach((b) => b.onclick = () => { if (st.tier === b.dataset.t) ouvrirDemo(); else { st.tier = b.dataset.t; drawInfo(); } });
  $$('[data-v]').forEach((el) => { const g2 = el.dataset.v, k = g2 + st.fam; vignette(g2, st.fam, 160).then((u) => { st.vign[k] = u; const im = document.createElement('img'); im.src = u; im.alt = ''; el.replaceWith(im); }).catch(() => {}); });
  $('#vGo').onclick = verifierSoiree;
  prefillCommit();
}

async function prefillCommit() {
  if (!st.relais) return;
  try {
    const s = await (await fetch(relayBase() + '/api/v2/state', { cache: 'no-store' })).json();
    const lo = s.loot || {}, last = (lo.revealed || [])[lo.revealed ? lo.revealed.length - 1 : 0];
    if (last) { $('#vSeed').value = last.seed; $('#vCommit').value = last.commit; } else if (lo.commit) $('#vCommit').value = lo.commit;
  } catch { /* hors ligne */ }
}

async function verifierSoiree() {
  const seed = $('#vSeed').value.trim().toLowerCase(), commit = $('#vCommit').value.trim().toLowerCase(), out = $('#vRes');
  if (!/^[0-9a-f]{64}$/.test(seed)) { out.innerHTML = '<span class="ko">Graine invalide (64 caractères hexadécimaux).</span>'; return; }
  if (LBX.empreinte(seed) !== commit) { out.innerHTML = '<span class="ko">✗ Cette graine ne correspond pas à l\'empreinte publiée.</span>'; return; }
  if (!st.relais) { out.innerHTML = '<span class="ok">✓ La graine correspond à l\'empreinte.</span> <span class="dim">(Journal des tirages : connectez-vous au relais.)</span>'; return; }
  const s = await (await fetch(relayBase() + '/api/v2/state', { cache: 'no-store' })).json();
  const lo = s.loot || {}, rev = (lo.revealed || []).find((r) => r.seed === seed);
  const journal = (lo.log || []).filter((o) => !rev || o.msg.split(':')[0] === String(rev.epoch));
  const v = LBX.verifier(C(), seed, commit, journal);
  out.innerHTML = v.ok ? `<span class="ok">✓ ${v.n} tirage(s) recalculé(s) : tous conformes.</span>` : `<span class="ko">✗ ${v.ecarts.length} écart(s) :</span><br>${v.ecarts.map(esc).join('<br>')}`;
}

async function ouvrirDemo(force = null) {
  if (st.ouvre) return;
  st.ouvre = true; drawInfo();
  const k = caisses.find((x) => x.tier === st.tier);
  k.c.ouvrir();
  LBX.SONS.aspiration();
  await new Promise((r) => setTimeout(r, 900));
  let r = LBX.tirer(C(), st.seed, 0, st.nonce++, 0, st.fam, st.tier);
  if (force) {   // démo : on remplace la carte gagnante par un légendaire de la famille (clairement signalé)
    const leg = C().contenu[st.fam].legendaire[0];
    r = { ...r, item: leg, rarete: 'legendaire', bande: r.bande.map((x, i) => (i === r.gagnant ? leg : x)) };
  }
  const g = C().gammes.find((x) => x.id === st.tier);
  await LBX.ouvrirCaisse({ bande: r.bande, gagnant: r.gagnant, objet, iconSvg: (n, s) => icon(n, s), titre: `${C().familles[st.fam].nom} · ${g.nom}`,
    sousTitre: force ? 'DÉMONSTRATION des effets légendaires' : `Démo · tirage ${r.msg}`, detail: force ? 'Résultat forcé pour la démonstration : hors partie.' : `HMAC-SHA256(graine de démo, « ${r.msg} »)` });
  k.c.fermer();
  st.ouvre = false; drawInfo();
}
function demoLegendaire() { st.tier = 'marche_noir'; drawInfo(); ouvrirDemo(true); }

let last = performance.now();
function boucle(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  caisses.forEach((k, i) => {
    k.c.update(t + i, dt);
    const sel = k.tier === st.tier;
    k.c.group.position.y += ((sel ? 0.35 + Math.sin(t * 2) * 0.06 : 0) - k.c.group.position.y) * Math.min(1, dt * 6);
    k.c.group.rotation.y += dt * (sel ? 0.6 : 0.15);
    const s = sel ? 1.12 : 0.9; k.c.group.scale.setScalar(k.c.group.scale.x + (s - k.c.group.scale.x) * Math.min(1, dt * 6));
  });
  const a = t / 10;
  const k = Math.max(1, 1.55 / Math.max(0.6, camera.aspect));        // recule sur écran étroit : les 3 caisses restent visibles
  camera.position.set(Math.sin(a) * 1.4, 4.6 * k, (11.8 + Math.cos(a) * 0.6) * k); camera.lookAt(0, 0.8, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
