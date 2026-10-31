/* Segment « salon » — GABARIT PROVISOIRE (remplacé par l'agent du segment). Montre le contrat attendu par noyau_v8.js. */
export async function creerSegment(ctx) {
  const { THREE, seg } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'seg-salon';
  const cube = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff8844 }));
  groupe.add(cube);
  return {
    id: 'salon', groupe,
    cles: [{ t: seg.debut + 1, label: 'salon · gabarit' }],
    maj(t) {
      cube.rotation.set(0, t * 0.8, 0);                                  // fonction pure de t
      return { camera: { p: [0, 12, 40], c: [0, 0, 0], fov: 40 }, fond: 0x101018,
        hud: (g, W, H, o) => { const s = W / 1920; o.texte(g, s, 'salon', 80, 1000, { taille: 48 }); } };
    },
  };
}
