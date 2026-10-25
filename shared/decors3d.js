/* DÉCORS 3D DES UNIVERS — l'arrière-plan réel du trailer d'invocation (reveal_fret.js, mode « trailer »).

   Jusqu'ici l'univers d'un bolide n'était qu'une dominante de couleur sur un sol néon. Ce module construit, pour chaque archétype,
   un VRAI décor en volume, placé derrière le bolide (demi-plan z < 0 : c'est ce que voient le travelling de sortie et le cadrage
   héroïque), avec sa pluie, sa fumée, ses reflets et son éclairage de contre-jour :

     manga        Tokyo sous la pluie : tours néon étagées sur trois plans, enseignes verticales, écrans publicitaires animés,
                  rue noire détrempée qui reflète tout, traînées de phares, feux de signalisation, fils électriques, averse
     gothique     Gotham : tours gothiques aux fleches et contreforts, gargouilles sur les corniches, ciel d'orage zébré d'éclairs,
                  averse violente, réverbères à gaz dans la brume, projecteur-signal qui troue les nuages (silhouette ailée originale)
     post_apo     canyon de fin du monde : parois stratifiées sur trois plans, colonnes de fumée noire, épaves rouillées en feu,
                  tempête de sable (rafales + nappes), soleil rouge voilé de poussière
     pop          studio glamour : cyclorama rose pailleté, sol laqué miroir aux reflets prismatiques, vagues néon pastel,
                  projecteurs de scène, bulles irisées, confettis 3D en vraie profondeur de champ (nets au point, bokeh devant/derrière)
     vintage      gare Belle-Époque (La Grève) : arches de fer rivetées, colonnes, lanternes à gaz, verrière et rais de lumière,
                  voies, locomotive à l'arrêt, panneau « GRÈVE », horloge, vapeur épaisse au ras du quai
     blockbuster  avant-première : skyline, projecteurs qui balaient le ciel, écran LED géant, tours de lumière, bokeh anamorphique

     + V6 : AMBIANCES (ambiances_v6.js) — les bolides qui partagent un univers reçoivent leur propre étalonnage (gélatines des
       projecteurs, brouillard, ciel, halos, pluie, façades, reflets du sol) sur la MÊME géométrie : Gotham toxique vert/violet pour
       B12, rose néon/cyan pour B17, sodium, neige, cryo… Aucune géométrie ajoutée.
     + V5 : DÉCORS UNIQUES par bolide (decors_v5.js) — U04, E06, P03, P04, H07, H08, TK03, TK05, F01–F10, FR01–FR05 ont leur propre
       plateau (Paris barricadé, utopie verte, gothique rose, maison de poupée, lycée bloqué, île qui dérive, enfer administratif,
       arène cel-shading, box d'écurie et trophées, Élysée, quais de Seine, garage) ; les autres gardent le décor de leur univers.

   Tout est généré par le code (formes, canvas, GLSL) : aucune image, aucun logo, aucun personnage reconnaissable.
   Les décors sont déterministes (graine = code du bolide) : deux captures donnent la même image.

   API : creerDecor(THREE, cle, { code, env }) → { groupe, lumieres, solMat, miroir, brouillard, activer(), maj(t, dt, camera, hPx), dispose(), cle, unique }
         (unique = code du bolide quand un décor unique V5 a été construit, null sinon ; ambiance = étalonnage V6 appliqué, ou null)
         creerMiroirModele(THREE, voiture) → { racine, sync() }   reflet du bolide sur le sol laqué */

import { decorUnique, CODES_DECORS_UNIQUES } from './decors_v5.js';
import { ambianceDe, etalonner } from './ambiances_v6.js';
export { CODES_DECORS_UNIQUES };

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Exceptions de décor par bolide : La Grève est dans une gare, quelle que soit la DA du fichier. */
export const DECOR_PAR_CODE = { H12: 'vintage' };
export const decorDe = (code, cle) => DECOR_PAR_CODE[code] || cle;

const GLSL_BRUIT = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }`;

export function creerDecor(THREE, cle, { code = '', env = null } = {}) {
  const variante = decorDe(code, cle);
  const rnd = mulberry(hash(code + ':' + variante));
  const R = (a, b) => a + rnd() * (b - a);
  const groupe = new THREE.Group(); groupe.name = 'decor-' + variante; groupe.visible = false;
  const lumieres = new THREE.Group(); lumieres.name = 'decor-lumieres';
  const jet = []; const garde = (x) => { jet.push(x); return x; };
  const anim = [];                                    // (t, dt, camera, hPx) par image
  const COL = (c) => new THREE.Color(c);
  const CX = 6;                                       // centre de la scène (là où s'arrête le bolide)
  const pol = (r, a) => [CX + r * Math.cos(a), r * Math.sin(a)];
  const noMir = (o) => { o.userData.noMiroir = true; return o; };
  const ajouter = (o) => { groupe.add(o); return o; };

  /* ---------------------------------------------------------------- briques communes */
  const tex = (w, h, dessin, rep = false) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); dessin(g, w, h);
    const t = garde(new THREE.CanvasTexture(c)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 16;   // filtrage anisotrope maxi : façades nettes même en biais
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const basic = (o = {}) => garde(new THREE.MeshBasicMaterial({ fog: true, ...o }));
  const regarde = (m, x = CX, y = null, z = 0) => { m.lookAt(x, y == null ? m.position.y : y, z); return m; };

  let dernierCiel = null;                              // uniforms du dôme (étalonnage V6)
  /** Dôme du ciel : dégradé, nuages fbm, éclair, soleil. */
  const ciel = ({ haut, milieu, bas, nuages = 0.5, soleil = 0, couleurSoleil = '#ffffff', dirSoleil = [0, 0.1, -1] }) => {
    const u = { cTop: { value: COL(haut) }, cMid: { value: COL(milieu) }, cBas: { value: COL(bas) }, t: { value: 0 }, flash: { value: 0 }, nuage: { value: nuages },
      soleil: { value: soleil }, cSol: { value: COL(couleurSoleil) }, dirSol: { value: new THREE.Vector3(...dirSoleil).normalize() } };
    const m = garde(new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 cTop, cMid, cBas, cSol, dirSol; uniform float t, flash, nuage, soleil; varying vec3 vP; ${GLSL_BRUIT}
        void main(){ vec3 d = normalize(vP); float h = d.y;
          vec3 c = mix(cBas, cMid, smoothstep(-0.02, 0.16, h)); c = mix(c, cTop, smoothstep(0.12, 0.65, h));
          vec2 q = d.xz / (abs(h) + 0.25) * 1.6 + vec2(t * 0.012, 0.0);
          float n = fbm(q * 1.3 + fbm(q * 0.7 + t * 0.01)); float cl = smoothstep(0.35, 0.8, n) * nuage * smoothstep(-0.05, 0.25, h);
          c = mix(c, c * 0.35 + cMid * 0.25, cl);
          c += flash * vec3(0.7, 0.75, 0.9) * (0.35 + 0.65 * cl);
          float s = max(dot(d, dirSol), 0.0); c += cSol * (pow(s, 500.0) * soleil * 3.0 + pow(s, 10.0) * soleil * 0.4);
          gl_FragColor = vec4(c, 1.0); }` }));
    const s = new THREE.Mesh(garde(new THREE.SphereGeometry(320, 36, 18)), m); s.renderOrder = -10; s.frustumCulled = false; noMir(s); ajouter(s);
    anim.push((t) => { u.t.value = t; });
    dernierCiel = u;
    return { u, mesh: s };
  };

  /** Précipitations en traits (pluie, sable) : un seul objet, tout se passe dans le vertex shader. */
  const precip = ({ n, taille = [90, 40, 90], centre = [CX, 20, -10], vitesse = [-3, -28, 0], longueur = 1, couleur = '#9fb4ff', alpha = 0.4 }) => {
    const pos = new Float32Array(n * 6), fin = new Float32Array(n * 2), o = [centre[0] - taille[0] / 2, centre[1] - taille[1] / 2, centre[2] - taille[2] / 2];
    for (let i = 0; i < n; i++) { const x = o[0] + rnd() * taille[0], y = o[1] + rnd() * taille[1], z = o[2] + rnd() * taille[2]; pos.set([x, y, z, x, y, z], i * 6); fin[i * 2 + 1] = 1; }
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aFin', new THREE.BufferAttribute(fin, 1));
    const u = { t: { value: 0 }, vel: { value: new THREE.Vector3(...vitesse) }, orig: { value: new THREE.Vector3(...o) }, size: { value: new THREE.Vector3(...taille) }, len: { value: longueur }, col: { value: COL(couleur) }, alpha: { value: alpha } };
    const m = garde(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'uniform float t, len; uniform vec3 vel, orig, size; attribute float aFin; varying float vA; void main(){ vec3 p = mod(position + vel * t - orig, size) + orig; p -= normalize(vel) * len * aFin; vA = 1.0 - aFin; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 col; uniform float alpha; varying float vA; void main(){ gl_FragColor = vec4(col, alpha * vA); }' }));
    const l = new THREE.LineSegments(g, m); l.frustumCulled = false; noMir(l); ajouter(l);
    anim.push((t) => { u.t.value = t; });
    return l;
  };

  /** Points « profondeur de champ » : confettis qui tournent, paillettes, bokeh. Nets au plan de mise au point, disques flous devant et derrière. */
  const champ = ({ n, taille = [60, 30, 60], centre = [CX, 12, -6], vitesse = [0, -1.5, 0], couleurs = ['#ffffff'], tailleMin = 0.2, tailleMax = 0.5, mise = 10, flou = 1, disque = 0, alpha = 1, additif = false }) => {
    const pos = new Float32Array(n * 3), cols = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n), o = [centre[0] - taille[0] / 2, centre[1] - taille[1] / 2, centre[2] - taille[2] / 2];
    for (let i = 0; i < n; i++) { pos.set([o[0] + rnd() * taille[0], o[1] + rnd() * taille[1], o[2] + rnd() * taille[2]], i * 3); const c = COL(couleurs[Math.floor(rnd() * couleurs.length)]); cols.set([c.r, c.g, c.b], i * 3); sz[i] = R(tailleMin, tailleMax); ph[i] = rnd(); }
    const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(cols, 3)); g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const u = { t: { value: 0 }, vel: { value: new THREE.Vector3(...vitesse) }, orig: { value: new THREE.Vector3(...o) }, size: { value: new THREE.Vector3(...taille) }, foc: { value: mise }, flou: { value: flou }, ech: { value: 500 }, disque: { value: disque }, alpha: { value: alpha } };
    const m = garde(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
      vertexShader: `uniform float t, foc, flou, ech; uniform vec3 vel, orig, size; attribute vec3 aCol; attribute float aSz, aPh; varying vec3 vC; varying float vB, vPh, vA;
        void main(){ vec3 p = position + vel * t + vec3(sin(t * 0.7 + aPh * 6.28) * 0.6, 0.0, cos(t * 0.5 + aPh * 9.0) * 0.6); p = mod(p - orig, size) + orig;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z; float b = smoothstep(2.0, 14.0, abs(d - foc)) * flou; vB = b; vC = aCol; vPh = aPh * 6.28 + t * (1.5 + aPh * 3.0);
          gl_PointSize = clamp(aSz * ech * (1.0 + b * 3.5) / max(d, 0.5), 1.0, 220.0); gl_Position = projectionMatrix * mv; vA = (1.0 - 0.5 * b) * smoothstep(0.4, 1.6, d); }`,
      fragmentShader: `uniform float disque, alpha; varying vec3 vC; varying float vB, vPh, vA;
        void main(){ vec2 c = gl_PointCoord - 0.5; float cs = cos(vPh), sn = sin(vPh); vec2 r = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
          float flip = abs(cos(vPh * 1.7)) * 0.85 + 0.15; r.x /= flip;
          float net = step(abs(r.x), 0.32) * step(abs(r.y), 0.42); float mou = smoothstep(0.5, 0.05, length(c));
          float a = mix(mix(net, mou, disque), mou * 0.85, vB) * vA * alpha; if (a < 0.01) discard;
          gl_FragColor = vec4(vC * (0.75 + 0.45 * abs(cos(vPh * 2.0))), a); }` }));
    const p = new THREE.Points(g, m); p.frustumCulled = false; noMir(p); ajouter(p);
    anim.push((t, dt, cam, hPx) => { u.t.value = t; u.ech.value = (hPx || 1080) * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2); });
    return p;
  };

  /** Façade : fenêtres éclairées au hasard (tuile de 24 × 32 fenêtres : 24 m × 48 m). */
  /** Façade d'immeuble en haute définition (1 024 × 2 048 px pour 24 × 48 m) : allèges, meneaux, stores à demi baissés, lueur
   *  intérieure en dégradé, silhouettes, climatiseurs, bandeaux d'étage — plus de fenêtres « gros pixels ». */
  const facade = (fenetres, { allume = 0.45, base = '#08080f', arche = false, bandes = false } = {}) => tex(1024, 2048, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.025})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }      // grain du béton
    const cw = w / 24, ch = h / 32, fw = cw - 12, fh = ch - 22;
    for (let j = 0; j < 32; j++) {
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, j * ch + ch - 8, w, 3);                                   // nez de dalle
      for (let i = 0; i < 24; i++) {
        const x = i * cw + 6, y = j * ch + 8, on = rnd() < allume, c = fenetres[Math.floor(rnd() * fenetres.length)];
        g.save();
        g.beginPath();
        if (arche) { g.moveTo(x, y + fh); g.lineTo(x, y + fh * 0.4); g.quadraticCurveTo(x, y, x + fw / 2, y - 2); g.quadraticCurveTo(x + fw, y, x + fw, y + fh * 0.4); g.lineTo(x + fw, y + fh); g.closePath(); } else g.rect(x, y, fw, fh);
        g.clip();
        if (on) {
          const gr = g.createLinearGradient(x, y, x, y + fh); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr; g.fillRect(x, y, fw, fh);
          const store = rnd() < 0.55 ? rnd() * 0.6 : 0;                                                                  // store à lamelles à demi baissé
          if (store) { g.fillStyle = 'rgba(20,18,30,.55)'; g.fillRect(x, y, fw, fh * store); g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < fh * store; k += 4) g.fillRect(x, y + k, fw, 1); }
          if (rnd() < 0.18) { g.fillStyle = 'rgba(0,0,0,.6)'; const sx = x + fw * (0.2 + rnd() * 0.5); g.beginPath(); g.arc(sx, y + fh * 0.45, fh * 0.1, 0, 7); g.fill(); g.fillRect(sx - fh * 0.12, y + fh * 0.55, fh * 0.24, fh * 0.45); }   // silhouette
        } else {
          g.fillStyle = 'rgba(14,16,30,.95)'; g.fillRect(x, y, fw, fh);
          g.fillStyle = 'rgba(120,140,200,.06)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + fw * 0.5, y); g.lineTo(x, y + fh * 0.6); g.fill();   // reflet du ciel
        }
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 3; g.strokeRect(x, y, fw, fh);                                  // dormant
        g.lineWidth = 2; g.beginPath(); g.moveTo(x + fw / 2, y); g.lineTo(x + fw / 2, y + fh); g.stroke();             // meneau
        if (rnd() < 0.12) { g.fillStyle = '#2a2c34'; g.fillRect(x + fw * 0.2, y + fh + 2, fw * 0.6, 10); g.fillStyle = '#15161c'; for (let k = 0; k < 5; k++) g.fillRect(x + fw * 0.24 + k * fw * 0.1, y + fh + 4, 3, 6); }   // climatiseur
      }
    }
    if (bandes) { g.fillStyle = 'rgba(255,255,255,.09)'; for (let j = 0; j < 32; j += 6) g.fillRect(0, j * ch + ch - 10, w, 7); }
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  }, true);
  const matsToit = new Map();
  const matToit = (c) => { if (!matsToit.has(c)) matsToit.set(c, basic({ color: COL(c) })); return matsToit.get(c); };
  /** Immeuble : boîte dont les UV suivent les dimensions (une tuile = 24 m de large, 48 m de haut). */
  const immeuble = (w, h, d, x, z, mat, { toit = '#0a0a12', y0 = 0 } = {}) => {
    const geo = garde(new THREE.BoxGeometry(w, h, d)), uv = geo.attributes.uv;
    for (let i = 0; i < 24; i++) { const f = Math.floor(i / 4), u = uv.getX(i), v = uv.getY(i); if (f < 2) uv.setXY(i, u * d / 24, v * h / 48); else if (f > 3) uv.setXY(i, u * w / 24, v * h / 48); }
    const tt = matToit(toit), m = new THREE.Mesh(geo, [mat, mat, tt, tt, mat, mat]); m.position.set(x, y0 + h / 2, z); ajouter(m); return m;
  };
  /** Enseigne : texte lumineux (canvas) qui regarde le centre de scène. */
  const enseigne = (texte, couleur, w, h, x, y, z, { vertical = true, fond = null, scintille = 0 } = {}) => {
    const cw = vertical ? 256 : 1024, ch = vertical ? 1024 : 256;
    const t = tex(cw, ch, (g) => {
      if (fond) { g.fillStyle = fond; g.fillRect(0, 0, cw, ch); }
      g.shadowColor = couleur; g.shadowBlur = 40; g.fillStyle = '#fff'; g.strokeStyle = couleur; g.lineWidth = 9; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (vertical) { const ch1 = [...texte]; const pas = ch / ch1.length; g.font = `900 ${Math.min(192, pas * 0.82)}px "Yu Gothic","Meiryo","MS Gothic","Arial Black",sans-serif`; ch1.forEach((c, i) => { g.strokeText(c, cw / 2, pas * (i + 0.5)); g.fillText(c, cw / 2, pas * (i + 0.5)); }); }
      else { g.font = `900 ${ch * 0.62}px "Yu Gothic","Meiryo","Arial Black",sans-serif`; g.strokeText(texte, cw / 2, ch / 2); g.fillText(texte, cw / 2, ch / 2); }
    });
    const mat = basic({ map: t, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), mat); m.position.set(x, y, z); regarde(m); ajouter(m);
    if (scintille) { const ph = rnd() * 9; anim.push((tt) => { const k = Math.sin(tt * 23 + ph) * Math.sin(tt * 7.3 + ph * 2); mat.opacity = k > 0.93 - scintille ? 0.35 : 1; }); }
    return m;
  };
  /** Écran géant animé (redessiné quelques fois par seconde). */
  const ecran = (w, h, x, y, z, couleurs, texte = '') => {
    const cw = 1024, ch = Math.round(1024 * h / w);                                            // écran géant : définition réelle, plus de gros pixels
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'), t = garde(new THREE.CanvasTexture(c)); t.encoding = THREE.sRGBEncoding;
    const mat = basic({ map: t, toneMapped: false, color: 0xffffff });
    const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(w, h)), mat); m.position.set(x, y, z); regarde(m); ajouter(m);
    let dernier = -1;
    const dessiner = (tt) => {
      const gr = g.createLinearGradient(0, 0, cw, ch); gr.addColorStop(0, couleurs[0]); gr.addColorStop(0.5 + 0.4 * Math.sin(tt * 0.9), couleurs[1]); gr.addColorStop(1, couleurs[2 % couleurs.length]); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + 0.12 * ((i + Math.floor(tt * 2)) % 3)})`; const x1 = ((tt * 40 * (1 + i * 0.3) + i * 53) % (cw / 4 + 60)) - 30; g.fillRect(x1 * 4, (i * ch) / 6, (30 + i * 6) * 4, ch / 8); }
      if (texte) { g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 24; g.font = `900 ${ch * 0.3}px "Yu Gothic","Arial Black",sans-serif`; g.textAlign = 'center'; g.fillText(texte, cw / 2 + Math.sin(tt * 2) * 24, ch * 0.62); g.shadowBlur = 0; }
      g.fillStyle = 'rgba(0,0,0,.14)'; for (let y = 0; y < ch; y += 4) g.fillRect(0, y, cw, 1);
      t.needsUpdate = true;
    };
    dessiner(0);
    anim.push((tt) => { if (tt - dernier > 0.16) { dernier = tt; dessiner(tt); } });
    return m;
  };
  const halo = (x, y, z, couleur, taille, op = 0.8, clignote = 0) => {
    const s = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texHalo(), color: COL(couleur), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op, toneMapped: false })));
    s.position.set(x, y, z); s.scale.setScalar(taille); noMir(s); ajouter(s);
    if (clignote) { const ph = rnd() * 6; anim.push((t) => { s.material.opacity = op * (0.55 + 0.45 * Math.sin(t * clignote + ph)); }); }
    return s;
  };
  let _halo = null;
  const texHalo = () => _halo || (_halo = tex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }));
  /** Sol du décor : matériau semi-transparent (les reflets du décor sont dessinés dessous). */
  const sol = ({ opacite = 1, envI = 0.6, ...o }) => garde(new THREE.MeshStandardMaterial({ ...o, transparent: opacite < 1, opacity: opacite, envMap: env || null, envMapIntensity: envI }));
  const lumiere = (couleur, intensite, x, y, z, cible = [CX + 2, 0.6, 0]) => { const l = new THREE.DirectionalLight(COL(couleur), 0); l.position.set(x, y, z); l.target.position.set(...cible); l.userData.base = intensite; lumieres.add(l, l.target); return l; };
  const ptLumiere = (couleur, intensite, dist, x, y, z) => { const l = new THREE.PointLight(COL(couleur), 0, dist, 1.6); l.position.set(x, y, z); l.userData.base = intensite; lumieres.add(l); return l; };

  let actif = false;
  let solMat = null, brouillard = { couleur: '#0b0b0e', densite: 0.012 }, miroirActif = true, eclair = null;

  /* ================================================================ MANGA : Tokyo sous la pluie */
  const tokyo = () => {
    ciel({ haut: '#06031c', milieu: '#2a0d52', bas: '#ff3fa4', nuages: 0.55 });
    const fen = [['#7ff0ff', '#22d3ee', '#ffffff'], ['#ff7ad9', '#ff2bd6', '#ffe1f5'], ['#ffd34d', '#ffefb0', '#fff'], ['#9dffd4', '#39c5bb', '#d6fff3']];
    const mats = fen.map((f) => basic({ map: facade(f, { allume: 0.5, base: '#07061a', bandes: true }), toneMapped: false }));
    const couches = [[52, 66, 6, 15], [96, 124, 22, 52], [150, 220, 50, 130]];
    couches.forEach(([r0, r1, h0, h1], ci) => {
      for (let a = -Math.PI + 0.04; a < -0.04;) {
        const r = R(r0, r1), w = R(7, 14) * (r / 45), d = R(7, 12) * (r / 45), h = R(h0, h1);
        const [x, z] = pol(r, a); const mm = mats[Math.floor(rnd() * 4)];
        const b = immeuble(w, h, d, x, z, mm, { toit: '#05040f' }); b.rotation.y = -a - Math.PI / 2 + R(-0.12, 0.12);
        if (ci < 2 && rnd() < 0.5) { const hh = R(4, 9); const aa = immeuble(0.5, hh, 0.5, x, z, matToit('#101018')); aa.position.y = h + hh / 2; if (rnd() < 0.7) halo(x, h + hh, z, '#ff2a3d', 2.2, 0.9, 3); }
        a += (w + (ci === 0 ? R(1, 5) : R(4, 8 + 16 * ci))) / r;
      }
    });
    const nom = ['ネオン', '夜明け', 'ラーメン', 'ゲーム', '電脳', 'TOKYO', '東京', 'カラオケ', 'ミュージック', 'SPEED'];
    const cs = ['#22d3ee', '#ff2bd6', '#ffe14d', '#7cff6b', '#ff5a3c', '#b06bff'];
    for (let i = 0; i < 30; i++) { const a = -Math.PI * R(0.1, 0.92), r = R(34, 62), [x, z] = pol(r, a), h = R(8, 30); enseigne(nom[i % nom.length], cs[i % cs.length], R(2.4, 3.6), R(12, 22), x, h, z, { scintille: 0.04 }); }
    for (let i = 0; i < 4; i++) { const a = -Math.PI * (0.3 + i * 0.12), r = R(70, 96), [x, z] = pol(r, a); ecran(R(26, 36), R(14, 20), x, R(30, 56), z, [['#ff2bd6', '#22d3ee', '#ffe14d'], ['#7cff6b', '#22d3ee', '#b06bff'], ['#ffe14d', '#ff5a3c', '#ff2bd6'], ['#22d3ee', '#b06bff', '#ff2bd6']][i], ['LIVE', 'NEO', '39', 'GP'][i]); }
    // rue : bandes blanches, feux de signalisation, poteaux et fils
    const dash = tex(256, 16, (g, w, h) => { g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) g.fillRect(i * 64, 0, 36, h); }, true); dash.repeat.set(40, 1);
    const ligne = new THREE.Mesh(garde(new THREE.PlaneGeometry(160, 0.22)), basic({ map: dash, transparent: true, opacity: 0.8, toneMapped: false, fog: true })); ligne.rotation.x = -Math.PI / 2; ligne.position.set(CX, 0.02, -8); ajouter(ligne);
    for (let i = 0; i < 4; i++) { const x = CX - 24 + i * 15, z = -13.5; const p = immeuble(0.35, 9, 0.35, x, z, matToit('#14141d')); halo(x, 8.8, z + 0.4, i % 2 ? '#ff2a3d' : '#35ff9a', 3.4, 0.95); }
    for (let k = 0; k < 6; k++) { const pts = []; const z0 = -13.5, y0 = 8 + k * 0.3; for (let i = 0; i <= 12; i++) { const x = CX - 30 + i * 7; pts.push(new THREE.Vector3(x, y0 - Math.sin((i / 12) * Math.PI) * 0.8, z0 - 0.4 * k)); } ajouter(new THREE.Line(garde(new THREE.BufferGeometry().setFromPoints(pts)), garde(new THREE.LineBasicMaterial({ color: 0x14141d })))); }
    // traînées de phares : voitures qui filent sur la voie du fond
    const trainees = [];
    for (let i = 0; i < 7; i++) {
      const rouge = i % 2, z = -9.5 - (i % 3) * 2.2, v = R(16, 30) * (rouge ? -1 : 1);
      const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(R(3, 6), 0.34)), garde(new THREE.MeshBasicMaterial({ map: texHalo(), color: COL(rouge ? '#ff2a3d' : '#fff6d8'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.5, z); noMir(m); ajouter(m); trainees.push({ m, v, x0: R(-40, 60) });
    }
    anim.push((t) => { for (const s of trainees) { const L = 120; s.m.position.x = CX - 55 + (((s.x0 + s.v * t) % L) + L) % L; } });
    precip({ n: 3400, couleur: '#a9bfff', alpha: 0.42, vitesse: [-4, -30, 1], longueur: 1.1, taille: [100, 40, 100], centre: [CX, 20, -8] });
    solMat = sol({ color: COL('#0a0a1c'), roughness: 0.16, metalness: 0.55, opacite: 0.74, envI: 0.9 });
    brouillard = { couleur: '#2a0d4a', densite: 0.0105 };
    lumiere('#ff2bd6', 1.6, -12, 5, -16); lumiere('#22d3ee', 1.3, 26, 6, -14);
  };

  /* ================================================================ GOTHIQUE : Gotham */
  const gotham = () => {
    const cs = ciel({ haut: '#030304', milieu: '#101218', bas: '#3b3720', nuages: 0.95 });
    const fen = [['#ffd34d', '#ffe9a0', '#d9a62a']];
    const mats = [0, 1, 2].map((i) => basic({ map: facade(fen[0], { allume: 0.18 + i * 0.05, base: '#0a0a0e', arche: true }), color: COL(['#7a745f', '#686452', '#575446'][i]), toneMapped: false }));
    const noir = basic({ color: COL('#08080b') });
    const gargouille = (x, y, z, s) => {
      const g = new THREE.Group();
      const part = (geo, px, py, pz, rx = 0, rz = 0) => { const m = new THREE.Mesh(garde(geo), noir); m.position.set(px, py, pz); m.rotation.set(rx, 0, rz); g.add(m); return m; };
      part(new THREE.BoxGeometry(0.9, 0.7, 1.5), 0, 0.5, 0); part(new THREE.BoxGeometry(0.55, 0.5, 0.6), 0, 1.0, 0.85); part(new THREE.ConeGeometry(0.1, 0.5, 6), -0.2, 1.4, 0.8); part(new THREE.ConeGeometry(0.1, 0.5, 6), 0.2, 1.4, 0.8);
      part(new THREE.ConeGeometry(0.18, 0.5, 6), 0, 0.95, 1.3, Math.PI / 2);
      for (const sx of [-1, 1]) { const w = part(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 1.9, 1.1, -0.3), new THREE.Vector3(sx * 1.4, -0.2, -0.9)]), sx * 0.4, 0.9, -0.1); w.geometry.computeVertexNormals(); w.material = garde(new THREE.MeshBasicMaterial({ color: 0x08080b, side: THREE.DoubleSide })); }
      part(new THREE.CylinderGeometry(0.12, 0.04, 1.4, 6), 0, 0.4, -1.0, Math.PI / 2.6);
      g.scale.setScalar(s); g.position.set(x, y, z); regarde(g, CX, y, 0); ajouter(g); return g;
    };
    for (const [r0, r1, h0, h1, ci] of [[48, 64, 12, 26, 0], [90, 120, 30, 64, 1], [150, 220, 56, 130, 2]]) {
      for (let a = -Math.PI + 0.04; a < -0.04;) {
        const r = R(r0, r1), w = R(8, 15) * (r / 48), d = R(8, 13) * (r / 48), h = R(h0, h1), [x, z] = pol(r, a), mm = mats[Math.floor(rnd() * 3)];
        const b = immeuble(w, h, d, x, z, mm, { toit: '#0a0a0d' }); b.rotation.y = -a - Math.PI / 2 + R(-0.1, 0.1);
        const hh = R(8, 22) * (1 + ci * 0.4); const fleche = new THREE.Mesh(garde(new THREE.ConeGeometry(Math.min(w, d) * 0.42, hh, 4)), noir); fleche.position.set(x, h + hh / 2, z); fleche.rotation.y = Math.PI / 4 + b.rotation.y; ajouter(fleche);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = Math.cos(b.rotation.y) * sx * w * 0.46 + Math.sin(b.rotation.y) * sz * d * 0.46, pz = -Math.sin(b.rotation.y) * sx * w * 0.46 + Math.cos(b.rotation.y) * sz * d * 0.46; const pin = new THREE.Mesh(garde(new THREE.ConeGeometry(0.5 + ci * 0.4, 3.2 + ci * 1.4, 4)), noir); pin.position.set(x + px, h + 1.6 + ci * 0.7, z + pz); ajouter(pin); }
        const corn = new THREE.Mesh(garde(new THREE.BoxGeometry(w * 1.08, 0.7, d * 1.08)), noir); corn.position.set(x, h - 0.35, z); corn.rotation.y = b.rotation.y; ajouter(corn);
        if (ci === 0 && rnd() < 0.85) gargouille(x + Math.sin(b.rotation.y) * (d * 0.5), h + 0.1, z + Math.cos(b.rotation.y) * (d * 0.5) + 0.3, R(3.2, 5.2));
        a += (w + (ci === 0 ? R(0.5, 3) : R(4, 6 + 16 * ci))) / r;
      }
    }
    // premier plan : parapet de pierre et deux grandes gargouilles qui encadrent le bolide
    for (const [a, r, s] of [[-2.55, 17, 3.6], [-1.75, 19, 4.2], [-2.15, 24, 5.4]]) {
      const [x, z] = pol(r, a); const soc = immeuble(5 * s / 3, 2.4 * s / 3, 3 * s / 3, x, z, matToit('#0d0d11')); soc.rotation.y = -a - Math.PI / 2;
      gargouille(x, 2.4 * s / 3, z, s * 0.62);
    }
    // réverbères à gaz dans la brume
    for (let i = 0; i < 9; i++) { const x = CX - 26 + i * 7, z = -12 - (i % 2) * 3; immeuble(0.3, 6, 0.3, x, z, matToit('#0c0c10')); halo(x, 6.3, z, '#ffd88a', 5.5, 0.85, 2.2); }
    // le signal : projecteur qui troue les nuages, silhouette ailée originale
    const [sx, sz] = pol(92, -2.28);
    immeuble(5, 18, 5, sx, sz + 3, matToit('#0a0a0d'));
    const disque = tex(512, 512, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,246,190,1)'); r.addColorStop(0.7, 'rgba(255,230,140,.85)'); r.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w);
      g.fillStyle = '#0a0a0c'; g.beginPath(); g.moveTo(w * 0.5, w * 0.40); g.quadraticCurveTo(w * 0.42, w * 0.34, w * 0.36, w * 0.36); g.quadraticCurveTo(w * 0.22, w * 0.42, w * 0.14, w * 0.5); g.quadraticCurveTo(w * 0.24, w * 0.49, w * 0.3, w * 0.56); g.quadraticCurveTo(w * 0.36, w * 0.5, w * 0.42, w * 0.58);
      g.quadraticCurveTo(w * 0.46, w * 0.52, w * 0.5, w * 0.66); g.quadraticCurveTo(w * 0.54, w * 0.52, w * 0.58, w * 0.58); g.quadraticCurveTo(w * 0.64, w * 0.5, w * 0.7, w * 0.56); g.quadraticCurveTo(w * 0.76, w * 0.49, w * 0.86, w * 0.5); g.quadraticCurveTo(w * 0.78, w * 0.42, w * 0.64, w * 0.36); g.quadraticCurveTo(w * 0.58, w * 0.34, w * 0.5, w * 0.40); g.fill();
    });
    const sig = new THREE.Mesh(garde(new THREE.PlaneGeometry(34, 34)), basic({ map: disque, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0xffffff }));
    sig.position.set(sx + 14, 38, sz - 30); regarde(sig, CX, 38, 0); noMir(sig); ajouter(sig);
    const faisceau = new THREE.Mesh(garde(new THREE.CylinderGeometry(15, 1.4, 70, 28, 1, true)), garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { k: { value: 1 }, col: { value: COL('#ffed99') } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float k; uniform vec3 col; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.2) * 0.35 * k; gl_FragColor = vec4(col, a); }' })));
    faisceau.position.set(sx + 7, 20, sz - 12); faisceau.lookAt(sx + 14, 38, sz - 30); faisceau.rotateX(Math.PI / 2); noMir(faisceau); ajouter(faisceau);
    anim.push((t) => { faisceau.material.uniforms.k.value = 0.85 + 0.15 * Math.sin(t * 2.3); });
    // averse violente + éclairs
    precip({ n: 5200, couleur: '#c6d2ff', alpha: 0.5, vitesse: [-6, -34, 2], longueur: 1.5, taille: [100, 44, 100], centre: [CX, 22, -8] });
    precip({ n: 1400, couleur: '#8d9bd0', alpha: 0.3, vitesse: [-7, -26, 2], longueur: 0.8, taille: [26, 18, 26], centre: [CX + 6, 9, 4] });
    const lum = lumiere('#bcc8ff', 1.5, -14, 10, -18), lum2 = lumiere('#ffe7a0', 1.0, 22, 6, -16);
    eclair = { u: cs.u.flash, lum, base: 1.5, prochain: 2.6, vie: 0 };
    solMat = sol({ color: COL('#08080c'), roughness: 0.13, metalness: 0.6, opacite: 0.72, envI: 0.8 });
    brouillard = { couleur: '#15150f', densite: 0.0135 };
  };

  /* ================================================================ POST-APO : canyon */
  const canyon = () => {
    ciel({ haut: '#1d0e05', milieu: '#a94a18', bas: '#ffb46a', nuages: 0.8, soleil: 1, couleurSoleil: '#ffcf8f', dirSoleil: [-0.62, 0.1, -0.78] });
    const strates = tex(512, 256, (g, w, h) => {
      const bandes = ['#7a3b1c', '#9b5a2c', '#5e2c14', '#b87444', '#6a3418', '#8a4a24'];
      let y = 0; while (y < h) { const e = R(8, 30); g.fillStyle = bandes[Math.floor(rnd() * bandes.length)]; g.fillRect(0, y, w, e); y += e; }
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,200,140'},${R(0.02, 0.09)})`; g.fillRect(rnd() * w, rnd() * h, R(1, 10), R(1, 3)); }
    }, true);
    const paroi = (r, a0, a1, hMax, tir) => {
      const nx = 90, ny = 14, pos = new Float32Array((nx + 1) * (ny + 1) * 3), uv = new Float32Array((nx + 1) * (ny + 1) * 2), col = new Float32Array((nx + 1) * (ny + 1) * 3), idx = [];
      const bruit = (i) => 0.5 + 0.5 * Math.sin(i * 0.31 + tir) * Math.sin(i * 0.113 + tir * 2) + 0.35 * Math.sin(i * 0.9 + tir * 3);
      for (let i = 0; i <= nx; i++) {
        const a = a0 + (a1 - a0) * i / nx, h = hMax * (0.35 + 0.65 * Math.max(0, Math.min(1, bruit(i)))), rr = r + 7 * Math.sin(i * 0.21 + tir) + 3 * Math.sin(i * 0.7);
        for (let j = 0; j <= ny; j++) {
          const k = (i * (ny + 1) + j), v = j / ny, rj = rr - Math.sin(v * Math.PI * 0.5) * 6 * (1 - v);
          pos.set([CX + rj * Math.cos(a), v * h, rj * Math.sin(a)], k * 3); uv.set([i * 0.06, v * (h / 22)], k * 2);
          const c = 0.55 + 0.45 * v + 0.12 * Math.sin(i * 1.7 + j); col.set([c, c * 0.9, c * 0.85], k * 3);
          if (i < nx && j < ny) { const k2 = k + ny + 1; idx.push(k, k2, k + 1, k2, k2 + 1, k + 1); }
        }
      }
      const g = garde(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, basic({ map: strates, vertexColors: true, side: THREE.DoubleSide })); ajouter(m); return m;
    };
    paroi(36, -Math.PI * 0.98, -Math.PI * 0.02, 26, 1.3); paroi(64, -Math.PI, 0, 48, 4.1); paroi(104, -Math.PI, 0, 80, 7.7);
    // colonnes de fumée noire
    const fumeeMat = garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float t; varying vec2 vUv; ${GLSL_BRUIT} void main(){ float n = fbm(vec2(vUv.x * 5.0, vUv.y * 3.0 - t * 0.35)); float a = smoothstep(0.28, 0.75, n) * smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y)) * 0.92;
        vec3 c = mix(vec3(0.02, 0.015, 0.012), vec3(0.28, 0.12, 0.04), pow(1.0 - vUv.y, 5.0) * 0.7); gl_FragColor = vec4(c, a); }` }));
    for (const a of [-2.55, -2.3, -2.05, -1.8, -1.45]) { const [x, z] = pol(R(48, 78), a), h = R(70, 110); const m = new THREE.Mesh(garde(new THREE.CylinderGeometry(R(9, 14), R(3, 5), h, 16, 12, true)), fumeeMat); m.position.set(x, h / 2, z); noMir(m); ajouter(m); halo(x, 3, z, '#ff7a1a', 26, 0.55, 6); }
    anim.push((t) => { fumeeMat.uniforms.t.value = t; });
    // épaves rouillées, fûts, pneus
    const rouille = ['#5a3a22', '#3b2a22', '#6a4a30', '#473524'].map((c) => garde(new THREE.MeshLambertMaterial({ color: COL(c) })));
    const feux = [];
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI * R(0.12, 0.9), r = R(12, 30), [x, z] = pol(r, a), g = new THREE.Group(), mat = rouille[i % 4];
      const mk = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(garde(new THREE.BoxGeometry(w, h, d)), mat); m.position.set(px, py, pz); g.add(m); return m; };
      if (i % 3 === 0) { mk(5.2, 1.2, 2.2, 0, 0.9, 0); mk(1.9, 1.3, 2.0, 0.9, 2.0, 0); mk(1.4, 1.0, 2.2, -2.0, 1.7, 0); } else if (i % 3 === 1) { mk(4.2, 0.9, 2.0, 0, 0.7, 0); mk(2.0, 0.9, 1.8, -0.2, 1.5, 0); } else { mk(1.2, 1.7, 1.2, 0, 0.85, 0); mk(1.2, 1.7, 1.2, 1.4, 0.85, 0.2); mk(1.4, 0.3, 1.4, 0.7, 1.9, 0.1); }
      for (const [wx, wz] of [[-1.6, -1.05], [1.6, -1.05], [-1.6, 1.05], [1.6, 1.05]]) if (i % 3 !== 2) { const w = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12)), garde(new THREE.MeshLambertMaterial({ color: 0x141210 }))); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.5, wz); g.add(w); }
      g.position.set(x, 0, z); g.rotation.set(0, R(0, 6.28), R(-0.18, 0.18)); ajouter(g);
      if (i % 3 === 0 && r > 16) { const f = halo(x, 2.6, z, '#ff8a2a', 7, 0.95); feux.push(f); }
    }
    anim.push((t) => { feux.forEach((f, i) => { f.material.opacity = 0.75 + 0.25 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 5 + i); f.scale.setScalar(6.5 + 1.2 * Math.sin(t * 9 + i)); }); });
    // tempête de sable : rafales horizontales + poussière en suspension
    precip({ n: 2600, couleur: '#e7b988', alpha: 0.3, vitesse: [-34, -1, -8], longueur: 4.5, taille: [110, 22, 110], centre: [CX, 11, -10] });
    champ({ n: 260, taille: [90, 24, 90], centre: [CX, 10, -12], vitesse: [-4, 0.3, -1], couleurs: ['#d9a870', '#b88a55', '#efd2a2'], tailleMin: 0.8, tailleMax: 2.2, mise: 12, flou: 1, disque: 1, alpha: 0.28 });
    const cs = ptLumiere('#ff7a1a', 4, 30, CX - 10, 3, -8);
    lumiere('#ffb46a', 1.9, -16, 5, -18); lumiere('#ff6a2a', 0.8, 24, 4, -8);
    anim.push((t) => { if (actif) cs.intensity = cs.userData.base * (0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 6.1)); });
    const dust = tex(256, 256, (g, w, h) => { for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${R(120, 190) | 0},${R(80, 130) | 0},${R(40, 80) | 0},${R(0.05, 0.3)})`; g.fillRect(rnd() * w, rnd() * h, R(1, 3), R(1, 3)); } g.strokeStyle = 'rgba(40,20,8,.55)'; g.lineWidth = 1.2; for (let i = 0; i < 90; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += R(-14, 14); y += R(-14, 14); g.lineTo(x, y); } g.stroke(); } }, true);
    dust.repeat.set(26, 26);
    solMat = garde(new THREE.MeshStandardMaterial({ map: dust, color: COL('#b58a5c'), roughness: 0.95, metalness: 0 }));
    brouillard = { couleur: '#7a4318', densite: 0.0095 }; miroirActif = false;
  };

  /* ================================================================ POP : studio glamour */
  const popStudio = () => {
    const cy = garde(new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float t; varying vec2 vUv; varying vec3 vP; ${GLSL_BRUIT}
        void main(){ vec3 c = mix(vec3(1.0, 0.62, 0.86), vec3(0.62, 0.52, 1.0), smoothstep(0.0, 1.0, vUv.y)); c = mix(c, vec3(1.0, 0.86, 0.95), smoothstep(0.55, 0.0, vUv.y) * 0.55);
          vec2 g = vec2(vUv.x * 160.0, vUv.y * 40.0); float cell = h21(floor(g)); float tw = pow(max(0.0, sin(t * (1.5 + cell * 5.0) + cell * 40.0)), 14.0); float sp = step(0.93, cell) * (0.35 + tw * 1.4);
          c += sp * vec3(1.0, 0.95, 0.9); gl_FragColor = vec4(c, 1.0); }` }));
    const cyc = new THREE.Mesh(garde(new THREE.CylinderGeometry(70, 70, 56, 64, 1, true, Math.PI * 0.55, Math.PI * 1.45)), cy); cyc.position.set(CX, 28, 0); cyc.rotation.y = 0; noMir(cyc); ajouter(cyc);
    anim.push((t) => { cy.uniforms.t.value = t; });
    ciel({ haut: '#7b5cff', milieu: '#ff9fd8', bas: '#ffd6ee', nuages: 0.2 });
    // vagues néon pastel
    const vag = [['#ff7ad9', '#7ff0ff'], ['#fff3a8', '#ff7ad9'], ['#9dffd4', '#c9b8ff']].map(([c1, c2], i) => {
      const u = { t: { value: 0 }, c1: { value: COL(c1) }, c2: { value: COL(c2) }, k: { value: i } };
      const m = garde(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        vertexShader: 'uniform float t, k; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.y += sin(p.x * 0.18 + t * (1.1 + k * 0.3) + k * 2.0) * 3.2 + sin(p.x * 0.43 - t * 1.7) * 0.9; p.z += sin(p.x * 0.11 + t * 0.7 + k) * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: 'uniform vec3 c1, c2; varying vec2 vUv; void main(){ float e = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 2.2); gl_FragColor = vec4(mix(c1, c2, vUv.x) * e, e * 0.75); }' }));
      const mesh = new THREE.Mesh(garde(new THREE.PlaneGeometry(120, 3.2, 160, 1)), m); mesh.position.set(CX - 6, 9 + i * 4.2, -26 - i * 4); mesh.rotation.y = 0.2; noMir(mesh); ajouter(mesh); return u;
    });
    anim.push((t) => vag.forEach((u) => { u.t.value = t; }));
    // projecteurs de scène
    for (let i = 0; i < 7; i++) {
      const x = CX - 36 + i * 12, z = -34 - (i % 2) * 6, col = ['#ff7ad9', '#7ff0ff', '#fff3a8', '#c9b8ff'][i % 4];
      const c = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.4, 4.2, 44, 20, 1, true)), garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { col: { value: COL(col) } },
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(col, pow(vUv.y, 1.3) * pow(f, 1.8) * 0.34); }' })));
      c.position.set(x, 34, z); c.userData.ph = rnd() * 6; c.rotation.z = 0.0; noMir(c); ajouter(c);
      anim.push((t) => { c.rotation.z = Math.sin(t * 0.5 + c.userData.ph) * 0.35; c.rotation.x = Math.cos(t * 0.37 + c.userData.ph) * 0.25; });
      ajouter(new THREE.Mesh(garde(new THREE.BoxGeometry(3, 1.6, 3)), matToit('#2a1b3c'))).position.set(x, 56, z);
    }
    // bulles irisées
    const bulleMat = garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, fog: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float t; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); vec3 r = 0.5 + 0.5 * cos(6.28318 * (f * 1.2 + vec3(0.0, 0.33, 0.67) + t * 0.05)); gl_FragColor = vec4(r, pow(f, 1.6) * 0.75 + 0.04); }' }));
    const bulles = []; for (let i = 0; i < 12; i++) { const s = R(1.4, 4.6), m = new THREE.Mesh(garde(new THREE.SphereGeometry(s, 24, 16)), bulleMat); const a = -Math.PI * R(0.1, 0.9), [x, z] = pol(R(14, 46), a); m.position.set(x, R(2, 22), z); noMir(m); ajouter(m); bulles.push({ m, ph: rnd() * 6, y0: m.position.y }); }
    anim.push((t) => { bulleMat.uniforms.t.value = t; for (const b of bulles) b.m.position.y = b.y0 + Math.sin(t * 0.6 + b.ph) * 1.2; });
    // anneaux de scène sous le bolide
    for (const [r, c] of [[5.5, '#ff7ad9'], [8.2, '#7ff0ff'], [11, '#fff3a8']]) { const m = new THREE.Mesh(garde(new THREE.RingGeometry(r, r + 0.18, 64)), garde(new THREE.MeshBasicMaterial({ color: COL(c), transparent: true, opacity: 0.8, toneMapped: false, blending: THREE.AdditiveBlending }))); m.rotation.x = -Math.PI / 2; m.position.set(CX + 1, 0.03, 0); noMir(m); ajouter(m); }
    // prismes au sol : bandes de teinte qui tournent
    const prisme = garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float t; varying vec2 vUv; void main(){ vec2 p = vUv - 0.5; float r = length(p), a = atan(p.y, p.x); vec3 c = 0.5 + 0.5 * cos(6.28318 * (a / 6.28318 * 3.0 + r * 2.0 - t * 0.08 + vec3(0.0, 0.33, 0.67))); float e = smoothstep(0.5, 0.15, r) * 0.28; gl_FragColor = vec4(c * e, e); }' }));
    const pr = new THREE.Mesh(garde(new THREE.PlaneGeometry(70, 70)), prisme); pr.rotation.x = -Math.PI / 2; pr.position.set(CX, 0.04, -8); noMir(pr); ajouter(pr);
    anim.push((t) => { prisme.uniforms.t.value = t; });
    // confettis 3D en profondeur de champ (nets à 11 m, bokeh devant et derrière) + paillettes
    champ({ n: 620, taille: [70, 30, 60], centre: [CX + 2, 13, -2], vitesse: [0.3, -1.6, 0], couleurs: ['#ff3fa4', '#22d3ee', '#ffd34d', '#7cff6b', '#b06bff', '#ffffff'], tailleMin: 0.05, tailleMax: 0.11, mise: 11, flou: 1, alpha: 0.95 });
    champ({ n: 260, taille: [70, 24, 60], centre: [CX + 2, 11, -4], vitesse: [0, 0.25, 0], couleurs: ['#ffffff', '#ffe9f6', '#fff3a8'], tailleMin: 0.06, tailleMax: 0.14, mise: 11, flou: 1, disque: 1, additif: true, alpha: 0.9 });
    solMat = sol({ color: COL('#ffd6ee'), roughness: 0.06, metalness: 0.2, opacite: 0.62, envI: 1.1 });
    brouillard = { couleur: '#ffb3e0', densite: 0.0055 };
    lumiere('#fff0f8', 1.6, -12, 8, -18); lumiere('#ff7ad9', 1.3, 24, 5, -12); lumiere('#7ff0ff', 0.9, -6, 3, 14);
  };

  /* ================================================================ VINTAGE : gare Belle-Époque (La Grève) */
  const gare = () => {
    ciel({ haut: '#8f8670', milieu: '#c9bea4', bas: '#e4d9bf', nuages: 0.6 });
    const fer = basic({ color: COL('#17140f') }), ferClair = basic({ color: COL('#2b261d') });
    // arches de fer, colonnes rivetées, entretoises
    const W = 24, Hh = 15;
    for (let i = -6; i <= 10; i++) {
      const x = CX + i * 8, pts = []; for (let k = 0; k <= 24; k++) { const th = Math.PI * k / 24; pts.push(new THREE.Vector3(x, 8 + Math.sin(th) * Hh, -12 - Math.cos(th) * W)); }
      ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.34, 6)), i % 2 ? fer : ferClair));
      const pts2 = pts.map((p) => new THREE.Vector3(p.x, p.y - 1.4, p.z * 0.98 - (p.z < -12 ? -0.3 : 0.3)));
      ajouter(new THREE.Mesh(garde(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 40, 0.12, 5)), ferClair));
      for (const zc of [-12 - W, -12 + W]) {
        if (zc > 0 && Math.abs(x - CX) < 30) continue;            // rangée de colonnes côté caméra : aucune entre l'objectif et le bolide (elle masquait la locomotive)
        const c = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.5, 0.62, 8.4, 10)), i % 2 ? fer : ferClair); c.position.set(x, 4.2, zc); ajouter(c); const cap = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.9, 0.5, 0.6, 10)), ferClair); cap.position.set(x, 8.5, zc); ajouter(cap);
        if (i % 2 === 0) { immeuble(0.08, 0.5, 0.08, x, zc, matToit('#17140f')); halo(x, 6.2, zc + (zc < -12 ? 0.9 : -0.9), '#ffcf7a', 3.8, 0.9, 1.7); } }
    }
    // verrière : rais de lumière poussiéreux
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(4.5, 38)), garde(new THREE.MeshBasicMaterial({ map: texHalo(), color: COL('#fff1cf'), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
      m.position.set(CX - 40 + i * 14, 17, -16 - (i % 3) * 5); m.rotation.set(0, 0, 0.5); m.userData.ph = rnd() * 6; noMir(m); ajouter(m); anim.push((t) => { m.material.opacity = 0.12 + 0.06 * Math.sin(t * 0.5 + m.userData.ph); });
    }
    // façade du fond : horloge et panneau
    const mur = new THREE.Mesh(garde(new THREE.PlaneGeometry(220, 52)), basic({ map: tex(512, 128, (g, w, h) => { g.fillStyle = '#d8cdb4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8ac90'; for (let i = 0; i < 40; i++) g.fillRect(i * 13 + 2, 0, 3, h); g.fillStyle = '#6e6450'; for (let i = 0; i < 30; i++) { g.fillRect(i * 17, 20, 11, 36); g.fillRect(i * 17, 70, 11, 36); } }, false) }));
    mur.position.set(CX, 26, -48); ajouter(mur);
    const horloge = new THREE.Mesh(garde(new THREE.CircleGeometry(5.2, 40)), basic({ map: tex(256, 256, (g, w) => { g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 6.3); g.fill(); g.strokeStyle = '#17140f'; g.lineWidth = 9; g.stroke(); g.lineWidth = 6; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * w * 0.4, w / 2 - Math.cos(a) * w * 0.4); g.lineTo(w / 2 + Math.sin(a) * w * 0.46, w / 2 - Math.cos(a) * w * 0.46); g.stroke(); }
      g.lineWidth = 9; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + w * 0.2, w / 2 - w * 0.13); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 - w * 0.04, w / 2 - w * 0.36); g.stroke(); }) }));
    horloge.position.set(CX, 36, -47.8); ajouter(horloge);
    const panneau = new THREE.Mesh(garde(new THREE.PlaneGeometry(15, 6)), basic({ map: tex(512, 200, (g, w, h) => { g.fillStyle = '#0f1a12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8cdb4'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#f4ecd8'; g.textAlign = 'center'; g.font = '900 78px "Palatino Linotype",Georgia,serif'; g.fillText('GRÈVE', w / 2, 98); g.font = '600 32px "Palatino Linotype",Georgia,serif'; g.fillText('AUCUN TRAIN · PRÉAVIS ILLIMITÉ', w / 2, 158); }) }));
    panneau.position.set(CX + 17, 15, -47.6); ajouter(panneau);
    // voies, traverses, quai
    const rail = (z) => { const m = new THREE.Mesh(garde(new THREE.BoxGeometry(200, 0.18, 0.16)), matToit('#8a8070')); m.position.set(CX, 0.12, z); ajouter(m); };
    for (const z of [-5.3, -4.15, -9.3, -8.15]) rail(z);
    const trav = tex(64, 64, (g, w) => { g.fillStyle = '#2a1c12'; g.fillRect(0, 0, w, w); g.fillStyle = '#4a3320'; g.fillRect(4, 8, w - 8, 14); g.fillRect(4, 36, w - 8, 14); }, true); trav.repeat.set(1, 1);
    for (const z0 of [-4.7, -8.7]) { const bal = new THREE.Mesh(garde(new THREE.PlaneGeometry(200, 2.6)), basic({ map: trav.clone() })); bal.material.map.repeat.set(70, 1); bal.material.map.needsUpdate = true; bal.rotation.x = -Math.PI / 2; bal.position.set(CX, 0.04, z0); ajouter(bal); }
    // locomotive à l'arrêt (silhouette) et wagons
    const loco = new THREE.Group(), noirL = basic({ color: COL('#0e0c0a') }), laiton = basic({ color: COL('#8d6a2e') });
    const bx = (w, h, d, x, y, z, m = noirL) => { const a = new THREE.Mesh(garde(new THREE.BoxGeometry(w, h, d)), m); a.position.set(x, y, z); loco.add(a); return a; };
    bx(9, 2.4, 2.6, 0, 2.2, 0); const ch = new THREE.Mesh(garde(new THREE.CylinderGeometry(1.35, 1.35, 6.5, 20)), noirL); ch.rotation.z = Math.PI / 2; ch.position.set(2.2, 3.4, 0); loco.add(ch);
    bx(2.4, 3.8, 2.8, -3.6, 3.6, 0); bx(2.8, 0.35, 3.1, -3.6, 5.6, 0); const cheminee = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.55, 0.8, 2.2, 14)), noirL); cheminee.position.set(4.8, 5.6, 0); loco.add(cheminee);
    bx(1.6, 0.4, 0.4, 4.6, 6.8, 0, laiton); for (const x of [-2.6, -0.4, 1.8, 3.8]) { const r = new THREE.Mesh(garde(new THREE.CylinderGeometry(1.05, 1.05, 0.4, 20)), noirL); r.rotation.x = Math.PI / 2; r.position.set(x, 1.05, 1.35); loco.add(r); const r2 = r.clone(); r2.position.z = -1.35; loco.add(r2); }
    for (let k = 1; k <= 3; k++) { bx(9, 3.2, 2.7, -11 * k - 1, 2.6, 0, basic({ color: COL(['#1c2a22', '#2a1c14', '#1c2230'][k - 1]) })); for (let w = 0; w < 6; w++) bx(0.9, 1.0, 2.8, -11 * k - 5 + w * 1.6, 3.2, 0, basic({ color: COL('#ffcf7a'), toneMapped: false })); }
    loco.position.set(CX + 12, 0, -6.8); loco.scale.x = -1; ajouter(loco);
    halo(CX + 12 + 7.2, 3.4, -6.8, '#fff1cf', 7, 0.9, 1.1);
    // vapeur épaisse au ras du quai + fumée de cheminée
    const vap = []; for (let i = 0; i < 46; i++) { const s = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texHalo(), color: COL('#f1ead9'), transparent: true, opacity: R(0.12, 0.26), depthWrite: false }))); s.scale.setScalar(R(6, 14)); s.position.set(CX + R(-40, 50), R(0.8, 3.2), R(-14, 6)); noMir(s); ajouter(s); vap.push({ s, v: R(0.2, 0.7), y0: s.position.y, ph: rnd() * 6 }); }
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(garde(new THREE.SpriteMaterial({ map: texHalo(), color: COL('#d9d2c0'), transparent: true, opacity: 0.4, depthWrite: false }))); s.scale.setScalar(R(4, 7)); noMir(s); ajouter(s); vap.push({ s, cheminee: true, ph: rnd(), v: 1 }); }
    anim.push((t) => { for (const e of vap) { if (e.cheminee) { const k = (t * 0.22 + e.ph) % 1; e.s.position.set(CX + 12 - 4.8 + k * 6, 7 + k * 15, -6.8 + (e.ph - 0.5) * 2); e.s.material.opacity = 0.42 * (1 - k); e.s.scale.setScalar(3 + k * 11); } else { e.s.position.x += e.v * 0.016; if (e.s.position.x > CX + 56) e.s.position.x = CX - 44; e.s.position.y = e.y0 + Math.sin(t * 0.4 + e.ph) * 0.5; } } });
    champ({ n: 260, taille: [90, 26, 70], centre: [CX, 12, -14], vitesse: [0.4, 0.05, 0], couleurs: ['#fff3d6', '#e9dcc0'], tailleMin: 0.5, tailleMax: 1.3, mise: 14, flou: 1, disque: 1, alpha: 0.18 });
    const dalle = tex(256, 256, (g, w, h) => { g.fillStyle = '#3d3328'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { g.fillStyle = `rgb(${R(48, 72) | 0},${R(40, 58) | 0},${R(30, 44) | 0})`; g.fillRect(i * 16 + (j % 2) * 8, j * 32 + 1, 14, 30); } for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(0,0,0,${R(0.04, 0.2)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, true); dalle.repeat.set(24, 24);
    solMat = sol({ map: dalle, color: COL('#7d725f'), roughness: 0.35, metalness: 0.1, opacite: 0.9, envI: 0.3 });
    brouillard = { couleur: '#a99f88', densite: 0.0085 };
    lumiere('#fff1cf', 1.5, -14, 14, -16); lumiere('#ffcf7a', 1.0, 24, 5, -10);
  };

  /* ================================================================ BLOCKBUSTER : avant-première */
  const premiere = () => {
    ciel({ haut: '#01030a', milieu: '#0b2038', bas: '#ff9a3c', nuages: 0.35 });
    const mats = [['#8fdcff', '#ffcf6a', '#ffffff'], ['#ffcf6a', '#ffb47a', '#ffe9c0'], ['#7ff0ff', '#4cc9f0', '#ffffff']].map((f) => basic({ map: facade(f, { allume: 0.5, base: '#04070f', bandes: true }), toneMapped: false }));
    for (const [r0, r1, h0, h1] of [[60, 76, 8, 18], [100, 130, 24, 60], [150, 220, 60, 150]]) {
      for (let a = -Math.PI + 0.04; a < -0.04;) { const r = R(r0, r1), w = R(8, 16) * (r / 55), d = R(8, 13) * (r / 55), h = R(h0, h1), [x, z] = pol(r, a); const b = immeuble(w, h, d, x, z, mats[Math.floor(rnd() * 3)], { toit: '#03050b' }); b.rotation.y = -a - Math.PI / 2; a += (w + R(2, 14)) / r; }
    }
    // projecteurs d'avant-première qui balaient le ciel
    const beams = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * (0.18 + i * 0.13), [x, z] = pol(R(36, 60), a);
      const m = new THREE.Mesh(garde(new THREE.CylinderGeometry(0.5, 3.2, 160, 16, 1, true)), garde(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { col: { value: COL(i % 2 ? '#8fdcff' : '#ffe2b0') } },
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(col, pow(vUv.y, 0.9) * pow(f, 1.6) * 0.3); }' })));
      m.position.set(x, 80, z); noMir(m); ajouter(m); halo(x, 1, z, i % 2 ? '#8fdcff' : '#ffe2b0', 9, 0.8);
      beams.push({ m, ph: rnd() * 6, f: R(0.18, 0.34), x, z });
    }
    anim.push((t) => { for (const b of beams) { b.m.rotation.z = Math.sin(t * b.f + b.ph) * 0.5; b.m.rotation.x = Math.cos(t * b.f * 0.8 + b.ph) * 0.35; b.m.position.set(b.x - Math.sin(b.m.rotation.z) * 80, 80 * Math.cos(b.m.rotation.z) * Math.cos(b.m.rotation.x), b.z + Math.sin(b.m.rotation.x) * 80); } });
    ecran(46, 20, CX - 6, 24, -54, ['#ff9a3c', '#0b2038', '#8fdcff'], 'AVANT-PREMIÈRE');
    for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.22 + i * 0.1), [x, z] = pol(R(18, 26), a); immeuble(0.5, 11, 0.5, x, z, matToit('#10131c')); halo(x, 11.4, z, i % 2 ? '#ffcf6a' : '#8fdcff', 9, 0.95, 2); }
    // traînées anamorphiques horizontales
    for (const [x, y, z, c, l] of [[CX - 60, 16, -70, '#8fdcff', 160], [CX + 30, 8, -78, '#ffcf6a', 120], [CX - 10, 30, -90, '#ffffff', 90]]) { const m = new THREE.Mesh(garde(new THREE.PlaneGeometry(l, 1.3)), garde(new THREE.MeshBasicMaterial({ map: texHalo(), color: COL(c), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))); m.position.set(x, y, z); regarde(m); noMir(m); ajouter(m); }
    champ({ n: 360, taille: [150, 34, 70], centre: [CX, 15, -40], vitesse: [0, 0.2, 0], couleurs: ['#ffcf6a', '#8fdcff', '#ffe2b0', '#ff7a4c', '#ffffff'], tailleMin: 0.8, tailleMax: 2.2, mise: 12, flou: 1, disque: 1, additif: true, alpha: 0.5 });
    solMat = sol({ color: COL('#05080f'), roughness: 0.11, metalness: 0.65, opacite: 0.7, envI: 0.9 });
    brouillard = { couleur: '#0b1830', densite: 0.0085 };
    lumiere('#ffcf6a', 1.7, -14, 8, -18); lumiere('#8fdcff', 1.5, 26, 6, -14);
  };

  /* ---------------------------------------------------------------- V5 : décor unique du bolide, sinon décor de son univers */
  const unique = decorUnique(code);
  if (unique) {
    groupe.name = 'decor-' + variante + '-' + code;
    const r = unique({ THREE, CX, R, rnd, COL, pol, garde, ajouter, noMir, anim, tex, basic, regarde, ciel, precip, champ, halo, texHalo, sol, lumiere, ptLumiere,
      immeuble, matToit, enseigne, estActif: () => actif, env });
    solMat = r.solMat; if (r.brouillard) brouillard = r.brouillard; miroirActif = !!r.miroir;
  } else ({ manga: tokyo, gothique: gotham, post_apo: canyon, pop: popStudio, vintage: gare, blockbuster: premiere }[variante] || premiere)();

  /* ---------------------------------------------------------------- V6 : étalonnage propre au bolide (même géométrie, autres gélatines) */
  const ambiance = unique ? null : ambianceDe(code);
  if (ambiance) { brouillard = etalonner(THREE, { groupe, lumieres, solMat, ciel: dernierCiel }, ambiance); groupe.name += '-' + code; }

  /* ---------------------------------------------------------------- reflets : copie renversée du décor sous le sol semi-transparent */
  let miroir = null;
  if (miroirActif) {
    miroir = groupe.clone(true);
    const aSupprimer = []; miroir.traverse((o) => { if (o.userData && o.userData.noMiroir) aSupprimer.push(o); });
    for (const o of aSupprimer) if (o.parent) o.parent.remove(o);
    miroir.scale.y = -1; miroir.name = 'decor-miroir';
  }

  /* ---------------------------------------------------------------- vie du décor */
  const dir = lumieres.children.filter((l) => l.isLight);
  const api = {
    cle: variante, unique: unique ? code : null, ambiance, groupe, lumieres, solMat, miroir, brouillard, eclair,
    get textures() { return jet.filter((x) => x && x.isTexture); },
    activer() { actif = true; groupe.visible = true; if (miroir) miroir.visible = true; for (const l of dir) l.intensity = l.userData.base || 0; },
    desactiver() { actif = false; groupe.visible = false; if (miroir) miroir.visible = false; for (const l of dir) l.intensity = 0; },
    maj(t, dt, camera, hPx) {
      for (const f of anim) f(t, dt, camera, hPx);
      if (eclair) {                                                       // orage : éclairs irréguliers, double flash, tonnerre visuel
        eclair.prochain -= dt;
        if (eclair.prochain <= 0) { eclair.vie = 0.32; eclair.prochain = 1.1 + Math.random() * 3.2; }
        eclair.vie = Math.max(0, eclair.vie - dt);
        const v = eclair.vie > 0 ? (eclair.vie > 0.2 ? 1 : eclair.vie > 0.14 ? 0.15 : 0.7) * Math.min(1, eclair.vie / 0.1 + 0.4) : 0;
        eclair.u.value = v * 0.85; eclair.lum.intensity = eclair.base * (1 + v * 3.2);
      }
    },
    dispose() { for (const x of jet) { try { x.dispose && x.dispose(); } catch (e) { /* rien */ } } },
  };
  return api;
}

/** Reflet du bolide sur le sol laqué : clone renversé, resynchronisé à chaque image. */
export function creerMiroirModele(THREE, voiture) {
  const racine = new THREE.Group(); racine.scale.y = -1; racine.visible = false;
  const copie = voiture.clone(true); racine.add(copie);
  const lum = []; copie.traverse((o) => { if (o.isLight) lum.push(o); }); for (const l of lum) if (l.parent) l.parent.remove(l);      // pas de lumières en double
  const src = [], dst = []; voiture.traverse((o) => { if (!o.isLight) src.push(o); }); copie.traverse((o) => dst.push(o));
  return {
    racine,
    sync() {
      for (let i = 0; i < src.length; i++) { const a = src[i], b = dst[i]; b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); b.visible = a.visible; }
    },
  };
}
