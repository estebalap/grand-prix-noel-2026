/* PORTAIL EXPRESS « RIFT GATE » + GLITCH DE TÉLÉPORTATION du segment « familles » (V9.2).

   creerRift(THREE, { rayon })  portail DEBOUT (plan local XY, traversé selon +z local) au style du portail express de l'arène
                                (arene_juice.js) : double anneau hexagonal cyan #2de2ff / magenta #ff3fa4, intérieur tourbillonnant
                                OPAQUE (il masque ce qui est déjà passé de l'autre côté : la voiture « disparaît » dans le rift),
                                éclairs d'énergie le long du cadre, halo. maj(t, ouverture) : fonction pure (échelle, rotation, force).
   tronquerAuPortail(obb, p)    boîte orientée de la partie d'une voiture restée DE CE CÔTÉ du plan du portail (null si tout est passé)
   intensiteGlitch(t, coupes)   enveloppe du glitch (±0,18 s autour de chaque coupe)
   dessinerGlitch(g, W, H, o)   habillage 2D du glitch : tranches décalées de l'image rendue (hors zone centrale), scanlines,
                                bandes numériques, flash d'inversion (3 images), badge « ⚡ MAP WARP : … » en haut à gauche.
   Déterminisme : tout le pseudo-hasard du glitch dépend de l'INDEX D'IMAGE (floor(t·60)) et d'une graine fixe. */
import { prng } from './familles_outils.js';

const CYAN = '#2de2ff', MAGENTA = '#ff3fa4';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (u) => { const k = 1 - clamp(u); return 1 - k * k * k; };

export function creerRift(THREE, { rayon = 100 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'rift-gate';
  const pivot = new THREE.Group(); groupe.add(pivot);
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 10, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(CYAN).multiplyScalar(2.8), fog: false }));
  const anneau2 = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.04, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(MAGENTA).multiplyScalar(2.8), fog: false }));
  pivot.add(anneau, anneau2);
  const u = { t: { value: 0 }, force: { value: 0 } };
  const disque = new THREE.Mesh(new THREE.CircleGeometry(1, 6), new THREE.ShaderMaterial({
    uniforms: u, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vP; uniform float t, force;
      void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
        float tun = 1.0 / (r + 0.12);
        float s = sin(a * 6.0 + tun * 3.2 - t * 11.0) * 0.5 + 0.5; float s2 = sin(a * 3.0 - tun * 5.0 + t * 7.0) * 0.5 + 0.5;
        float anneauxT = smoothstep(0.75, 1.0, sin(tun * 6.0 - t * 16.0) * 0.5 + 0.5);
        vec3 c = mix(vec3(0.18, 0.89, 1.0), vec3(1.0, 0.25, 0.64), s) * (0.35 + 0.9 * s2) + vec3(0.85, 0.95, 1.0) * anneauxT * 0.6;
        c += vec3(1.0, 0.95, 1.0) * smoothstep(0.3, 0.0, r) * 0.7;
        c = mix(vec3(0.07, 0.02, 0.14), c, force);
        gl_FragColor = vec4(c * (0.7 + 0.5 * smoothstep(0.7, 1.0, r)), 1.0); }`,
  }));
  disque.scale.setScalar(0.985); pivot.add(disque);
  // arcs d'énergie : segments brisés le long du cadre (géométrie fixe, rotation pilotée par t)
  const rnd = prng('rift-arcs'), pts = [];
  for (let k = 0; k < 18; k++) {
    const a0 = rnd() * Math.PI * 2, n = 5;
    for (let i = 0; i < n; i++) {
      const a1 = a0 + i * 0.07, a2 = a0 + (i + 1) * 0.07, r1 = 1.04 + (rnd() - 0.5) * 0.12, r2 = 1.04 + (rnd() - 0.5) * 0.12;
      pts.push(new THREE.Vector3(Math.cos(a1) * r1, Math.sin(a1) * r1, 0.01), new THREE.Vector3(Math.cos(a2) * r2, Math.sin(a2) * r2, 0.01));
    }
  }
  const arcs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 2.4, 2.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  pivot.add(arcs);
  const texH = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const d = g.createRadialGradient(64, 64, 0, 64, 64, 64); d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.35, 'rgba(255,255,255,.35)'); d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: texH, color: new THREE.Color('#9ef4ff'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lueur.scale.set(3.4, 3.4, 1); pivot.add(lueur);
  function maj(t, ouverture) {
    const o = clamp(ouverture);
    groupe.visible = o > 0.001; if (!groupe.visible) return;
    const R = rayon * easeOut(o) * (1 + 0.025 * Math.sin(t * 11));
    pivot.scale.setScalar(Math.max(0.01, R));
    anneau.rotation.z = t * 1.4; anneau2.rotation.z = -t * 1.1; arcs.rotation.z = t * 2.3;
    arcs.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 23));
    u.t.value = t; u.force.value = o;
    lueur.material.opacity = 0.2 * o;
  }
  return { groupe, maj, rayon };
}

/** p = { x, z, nx, nz } : plan vertical du portail, normale = sens de traversée. Renvoie la boîte de la partie non encore passée. */
export function tronquerAuPortail(obb, p) {
  if (!p) return obb;
  const fx = Math.sin(obb.ang), fz = Math.cos(obb.ang);              // axe longitudinal de la voiture (avant = +z local)
  const sgn = Math.sign(fx * p.nx + fz * p.nz) || 1;                  // l'avant pointe vers le portail ?
  const dc = (obb.cx - p.x) * p.nx + (obb.cz - p.z) * p.nz;           // distance signée du centre au plan
  const proj = Math.abs(fx * p.nx + fz * p.nz) * obb.hz + Math.abs(Math.cos(obb.ang) * p.nx - Math.sin(obb.ang) * p.nz) * obb.hx;
  const avant = dc + proj, arriere = dc - proj;
  if (arriere >= 0) return null;                                      // entièrement passée : dans le rift
  if (avant <= 0) return obb;
  const coupe = avant / 2;                                            // on retire la part au-delà du plan (le long de l'axe de la voiture)
  return { ...obb, cx: obb.cx - sgn * fx * coupe, cz: obb.cz - sgn * fz * coupe, hz: Math.max(0.01, obb.hz - coupe) };
}

/** Enveloppe 0..1 du glitch autour des coupes (triangle adouci, ±demi s). */
export function intensiteGlitch(t, coupes, demi = 0.18) {
  let g = 0;
  for (const c of coupes) { const d = Math.abs(t - c); if (d < demi) { const k = 1 - d / demi; g = Math.max(g, k * k * (3 - 2 * k)); } }
  return g;
}

/**
 * o = { t, g (0..1), inversion (bool), source (canvas WebGL déjà composé), badge: { texte, tau } | null, zone: [x0, y0, x1, y1] }
 * Au plus 2 éléments d'UI simultanés : le glitch (plein écran) et le badge.
 */
export function dessinerGlitch(g, W, H, o) {
  const s = W / 1920, zone = o.zone || [0.3, 0.3, 0.7, 0.7];
  const img = Math.floor(o.t * 60 + 1e-6);
  if (o.inversion && o.source) {
    g.save(); g.filter = 'invert(1) hue-rotate(180deg) saturate(1.6)'; g.drawImage(o.source, 0, 0, W, H); g.restore();
  }
  if (o.g > 0.02) {
    const r = prng('glitch-' + img);
    // tranches décalées de l'image rendue (uniquement au-dessus et au-dessous de la zone centrale)
    if (o.source) {
      const n = 2 + Math.floor(o.g * 5);
      for (let i = 0; i < n; i++) {
        const haut = r() < 0.5;
        const h = Math.max(2, Math.round(H * (0.012 + 0.05 * r() * o.g)));
        const y0 = haut ? Math.round(r() * (zone[1] * H - h)) : Math.round(zone[3] * H + r() * ((1 - zone[3]) * H - h));
        const dx = Math.round((r() - 0.5) * 2 * 90 * s * o.g);
        g.drawImage(o.source, 0, y0, W, h, dx, y0, W, h);
        g.fillStyle = r() < 0.5 ? CYAN : MAGENTA; g.globalAlpha = 0.55 * o.g;
        g.fillRect(dx < 0 ? W + dx : 0, y0, Math.abs(dx), h);
        g.globalAlpha = 1;
      }
    }
    // scanlines fines (alpha faible : ne compte pas comme interface)
    g.fillStyle = `rgba(0,0,0,${(Math.round(0.09 * o.g * 255) / 255).toFixed(4)})`;
    for (let y = (img % 2) * 2; y < H; y += 4) g.fillRect(0, y, W, 1);
    // bandes numériques : tirets lumineux cyan/magenta sur les bords haut et bas
    for (let i = 0; i < 10; i++) {
      const haut = i % 2 === 0, y = haut ? r() * zone[1] * H * 0.95 : zone[3] * H + r() * (1 - zone[3]) * H * 0.95;
      const x = r() * W, l = (40 + r() * 260) * s, h = (2 + r() * 5) * s;
      g.fillStyle = r() < 0.5 ? CYAN : MAGENTA; g.globalAlpha = (0.35 + 0.5 * r()) * o.g; g.fillRect(x, y, l, h);
    }
    g.globalAlpha = 1;
  }
  if (o.badge && o.badge.tau >= 0 && o.badge.tau <= 0.6) {
    const tau = o.badge.tau, entree = easeOut(tau / 0.12), sortie = clamp((tau - 0.48) / 0.12);
    const al = clamp(tau / 0.05) * (1 - sortie);
    const tremble = (prng('badge-' + img)() - 0.5) * 10 * s * (1 - clamp(tau / 0.25));
    // translation ARRONDIE au pixel et texte sans flou d'ombre : le cache de glyphes / d'ombres floues du canvas 2D ne dépend
    // alors plus des images rendues avant (pixels identiques quel que soit l'ordre de rendu)
    g.save(); g.globalAlpha = Math.round(al * 64) / 64; g.translate(Math.round(-140 * s * (1 - entree) + tremble), 0);
    const x = Math.round(56 * s), y = Math.round(52 * s), h = Math.round(64 * s);
    g.font = `700 ${Math.round(34 * s)}px "Fredoka", "Nunito", system-ui, sans-serif`; g.textBaseline = 'middle';
    const txt = 'MAP WARP : ' + o.badge.texte, lt = g.measureText(txt).width, w = lt + 104 * s;
    // plaque OPAQUE à bords alignés sur les pixels (rectangles entiers : aucun anticrénelage qui dépendrait de l'ordre de rendu)
    const wr = Math.round(w), bd = Math.max(2, Math.round(3 * s));
    g.fillStyle = MAGENTA; g.fillRect(x + bd, y + bd, wr, h);
    g.fillStyle = CYAN; g.fillRect(x, y, wr, h);
    g.fillStyle = '#10062a'; g.fillRect(x + bd, y + bd, wr - 2 * bd, h - 2 * bd);
    // pictogramme éclair (⚡) dessiné en vecteur : rendu identique quelle que soit la police emoji installée
    const bx = x + 30 * s, by = y + 10 * s;
    g.beginPath(); g.moveTo(bx + 16 * s, by); g.lineTo(bx + 2 * s, by + 25 * s); g.lineTo(bx + 13 * s, by + 25 * s); g.lineTo(bx + 7 * s, by + 44 * s);
    g.lineTo(bx + 26 * s, by + 16 * s); g.lineTo(bx + 15 * s, by + 16 * s); g.lineTo(bx + 21 * s, by); g.closePath(); g.fillStyle = '#ffe23d'; g.fill();
    const tx = Math.round(x + 70 * s), ty = Math.round(y + h / 2 + 1 * s);
    g.fillStyle = CYAN; g.globalAlpha = Math.round(al * 0.6 * 64) / 64; g.fillText(txt, tx + 2, ty); g.globalAlpha = Math.round(al * 64) / 64;
    g.fillStyle = '#ffffff'; g.fillText(txt, tx, ty);
    g.restore();
  }
}
