/* AIDES du segment « ouverture » V9.3 — GUIRLANDES LUMINEUSES SUPPLÉMENTAIRES DANS LA PIÈCE.

   Festons d'ampoules (fil vert sombre + ampoules InstancedMesh aux 5 couleurs des voies et blanc chaud) accrochés en haut du mur
   de la télé et du mur de droite du salon (repère de ../src/decors/salon.js : mur nord z = −200, mur est x = 250, plafond 255).
   Les ampoules s'allument en chenillard (de gauche à droite puis le long du mur est) : maj(t, debut, duree, facteur) est une
   fonction pure du temps. Aucune lumière ajoutée (les ampoules sont émissives et nourrissent le bloom). */

const COULEURS = ['#ff3b3b', '#ff9a1a', '#ffe23d', '#35e07a', '#3fa9ff', '#ffd9a0'];

/** Construit les festons. Chaque feston : deux points d'accroche, une flèche (cm), un nombre d'ampoules. */
export function creerGuirlandesPiece(THREE) {
  const groupe = new THREE.Group(); groupe.name = 'guirlandes-piece';
  const festons = [];
  const nord = -197.5, est = 247.5, y = 226;
  const xs = [-238, -150, -62, 26, 114];                                       // mur de la télé (s'arrête au pan coupé, x = 120)
  for (let i = 0; i < xs.length - 1; i++) festons.push({ a: [xs[i], y, nord], b: [xs[i + 1], y, nord], fleche: 20, n: 15 });
  const zs = [-66, 30, 126, 220];                                              // mur de droite (après le pan coupé)
  for (let i = 0; i < zs.length - 1; i++) festons.push({ a: [est, y, zs[i]], b: [est, y, zs[i + 1]], fleche: 20, n: 15 });

  const fil = new THREE.MeshStandardMaterial({ color: 0x173b22, roughness: 0.7 });
  const positions = [];
  for (const f of festons) {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24, p = f.a.map((v, j) => v + (f.b[j] - v) * u);
      p[1] -= f.fleche * 4 * u * (1 - u);                                      // flèche parabolique (chaînette approchée)
      pts.push(new THREE.Vector3(...p));
    }
    const courbe = new THREE.CatmullRomCurve3(pts);
    groupe.add(new THREE.Mesh(new THREE.TubeGeometry(courbe, 40, 0.35, 5, false), fil));
    for (let k = 0; k < f.n; k++) { const p = courbe.getPoint((k + 0.5) / f.n); p.y -= 2.2; positions.push(p); }
  }
  const N = positions.length;
  const amp = new THREE.InstancedMesh(new THREE.SphereGeometry(1.5, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  const m4 = new THREE.Matrix4(), base = [];
  positions.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); amp.setMatrixAt(i, m4); base.push(new THREE.Color(COULEURS[i % COULEURS.length])); amp.setColorAt(i, base[i]); });
  groupe.add(amp);
  const col = new THREE.Color();
  return {
    groupe, n: N,
    /** debut/duree : chenillard d'allumage ; facteur : multiplicateur global (assombrissement du salon). */
    maj(t, debut, duree, facteur) {
      const a = amp.instanceColor.array;
      for (let i = 0; i < N; i++) {
        const tOn = debut + (i / (N - 1)) * duree, d = t - tOn;
        const on = d <= 0 ? 0 : Math.min(1, d / 0.08);
        const pop = d > 0 ? 1 + 1.3 * Math.exp(-d * 6) : 1;
        const sc = 0.75 + 0.25 * Math.sin(t * (1.6 + (i % 4) * 0.45) + i * 1.7);
        col.copy(base[i]).multiplyScalar((0.015 + on * 2.2 * sc * pop) * facteur);
        a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b;
      }
      amp.instanceColor.needsUpdate = true;
    },
  };
}
