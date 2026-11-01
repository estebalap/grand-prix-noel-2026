/* PISTE ARC-EN-CIEL À 5 VOIES du départ (V9 Ring, segment arène) — ruban lumineux qui part du bord du ring (côté +x), recouvre le
   pont et la passerelle principale, passe sous l'arche du tunnel puis s'élance hors de l'arène et monte dans le ciel violet.

   creerPiste(THREE, G) → { groupe, point(s), tangente(s), longueur, maj(t, revele) }
     s = abscisse curviligne (cm) depuis le bord du ring ; revele = distance déjà « allumée » (la piste s'illumine vers l'extérieur).
   5 voies de 8 cm (rouge, orange, jaune, vert, bleu : les couleurs des 5 voies réelles), chevrons qui défilent, rambardes néon, pylônes.
   Tout est fonction pure de t (uniforms). */
const VOIES = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff'];

export function creerPiste(THREE, G) {
  const groupe = new THREE.Group(); groupe.name = 'piste-arc-en-ciel';
  const Y = G.MAT + 0.18;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const courbe = new THREE.CatmullRomCurve3([V(125, Y, 0), V(230, Y, 0), V(330, Y, 0), V(400, Y, 0), V(470, Y + 0.6, -1.5), V(640, Y + 18, -30), V(820, Y + 75, -140),
    V(1000, Y + 165, -320), V(1180, Y + 265, -560), V(1330, Y + 380, -840), V(1440, Y + 510, -1160)], false, 'centripetal');
  const longueur = courbe.getLength();
  const M = 900, LARG = 40;
  const pos = [], uv = [], idx = [], posR = [], idxR = [];
  const up = V(0, 1, 0), p = V(0, 0, 0), tg = V(0, 0, 0), lat = V(0, 0, 0);
  for (let i = 0; i <= M; i++) {
    const u = i / M; courbe.getPointAt(u, p); courbe.getTangentAt(u, tg); lat.crossVectors(up, tg).normalize();
    pos.push(p.x + lat.x * LARG / 2, p.y, p.z + lat.z * LARG / 2, p.x - lat.x * LARG / 2, p.y, p.z - lat.z * LARG / 2);
    uv.push(u * longueur, 0, u * longueur, 1);
    for (const sg of [1, -1]) { const o = sg * (LARG / 2 + 0.6); posR.push(p.x + lat.x * o, p.y, p.z + lat.z * o, p.x + lat.x * o, p.y + 1.6, p.z + lat.z * o); }
    if (i) {
      const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
      const r = i * 4; for (const o of [0, 2]) idxR.push(r - 4 + o, r + o, r - 3 + o, r - 3 + o, r + o, r + 1 + o);
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const cols = VOIES.map((c) => new THREE.Color(c));
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, revele: { value: 0 }, c0: { value: cols[0] }, c1: { value: cols[1] }, c2: { value: cols[2] }, c3: { value: cols[3] }, c4: { value: cols[4] } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vU; uniform float t, revele; uniform vec3 c0, c1, c2, c3, c4;
      void main(){ if (vU.x > revele) discard;
        float v = vU.y * 5.0; float i = floor(min(v, 4.999)); float f = fract(v);
        vec3 c = i < 0.5 ? c0 : (i < 1.5 ? c1 : (i < 2.5 ? c2 : (i < 3.5 ? c3 : c4)));
        float sep = smoothstep(0.0, 0.06, f) * smoothstep(1.0, 0.94, f);
        float chev = step(fract((vU.x - abs(f - 0.5) * 6.0) / 22.0 - t * 1.6), 0.18);
        float front = smoothstep(revele - 40.0, revele, vU.x);
        vec3 col = c * (0.75 + 0.55 * chev) * sep + vec3(1.0) * (1.0 - sep) * 0.9 + vec3(1.0, 0.95, 0.85) * front * 1.5;
        gl_FragColor = vec4(col * 1.35, 1.0); }`,
    side: THREE.DoubleSide,
  });
  const ruban = new THREE.Mesh(geo, mat); ruban.frustumCulled = false; groupe.add(ruban);
  const geoR = new THREE.BufferGeometry(); geoR.setAttribute('position', new THREE.Float32BufferAttribute(posR, 3)); geoR.setIndex(idxR);
  const uvR = []; for (let i = 0; i <= M; i++) { const s = i / M * longueur; uvR.push(s, 0, s, 1, s, 0, s, 1); } geoR.setAttribute('uv', new THREE.Float32BufferAttribute(uvR, 2));
  const matR = new THREE.ShaderMaterial({
    uniforms: { revele: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vU; uniform float revele, t; void main(){ if (vU.x > revele) discard; float b = 0.6 + 0.4 * sin(vU.x * 0.08 - t * 6.0); gl_FragColor = vec4(mix(vec3(1.0, 0.35, 0.8), vec3(0.3, 0.95, 1.0), step(0.5, fract(vU.x / 120.0))) * 2.0 * b, 1.0); }',
    side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const rails = new THREE.Mesh(geoR, matR); rails.frustumCulled = false; groupe.add(rails);
  // pylônes sous la partie aérienne
  const pyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.2, 3, 1, 8), new THREE.MeshStandardMaterial({ color: 0xd8d8f0, metalness: 0.9, roughness: 0.25 }), 40);
  const o = new THREE.Object3D(); let n = 0;
  for (let s = 500; s < longueur && n < 40; s += 45) { courbe.getPointAt(s / longueur, p); o.position.set(p.x, p.y / 2, p.z); o.scale.set(1, Math.max(1, p.y - 1), 1); o.updateMatrix(); pyl.setMatrixAt(n++, o.matrix); }
  pyl.count = n; groupe.add(pyl);

  const point = (s) => { const q = courbe.getPointAt(Math.min(1, Math.max(0, s / longueur))); return [q.x, q.y - 0.18, q.z]; };
  const tangente = (s) => { const q = courbe.getTangentAt(Math.min(1, Math.max(0, s / longueur))); return [q.x, q.y, q.z]; };
  return {
    groupe, point, tangente, longueur,
    maj(t, revele) { mat.uniforms.t.value = t; mat.uniforms.revele.value = revele; matR.uniforms.t.value = t; matR.uniforms.revele.value = revele; groupe.visible = revele > 0.5; pyl.visible = revele > 480; },
  };
}
