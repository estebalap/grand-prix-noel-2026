/* SEGMENT DE TEST du téléphone 3D V9 (plan data/plan_test_telephone.json, film 69 → 76 s).
   Pose le téléphone de telephone_v9.js devant la caméra, sur un fond néon violet/rose, avec quelques lumières, pour
   vérifier l'écran (netteté, lisibilité, fidélité au vrai Pocket Pit) et la comète du piège. Contrat : LISEZ_MOI_V8.md. */
import { creerTelephone } from './telephone_v9.js';

export async function creerSegment(ctx) {
  const { THREE } = ctx;
  const groupe = new THREE.Group(); groupe.name = 'seg-test-telephone';
  const tel = await creerTelephone(ctx);
  const pivot = new THREE.Group(); pivot.add(tel.groupe); groupe.add(pivot);

  // fond : grand dégradé violet → rose (plan lointain) + halo néon derrière le téléphone
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const g = c.getContext('2d');
  const d = g.createLinearGradient(0, 0, 0, 512); d.addColorStop(0, '#2a0b5e'); d.addColorStop(0.55, '#7a1aa8'); d.addColorStop(1, '#ff3fa4');
  g.fillStyle = d; g.fillRect(0, 0, 64, 512);
  const texFond = new THREE.CanvasTexture(c); texFond.encoding = THREE.sRGBEncoding;
  const fond = new THREE.Mesh(new THREE.PlaneGeometry(400, 260), new THREE.MeshBasicMaterial({ map: texFond, toneMapped: false, fog: false }));
  fond.position.set(0, 0, -120); groupe.add(fond);
  const ch = document.createElement('canvas'); ch.width = ch.height = 256; const q = ch.getContext('2d'); const r = q.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,120,230,.85)'); r.addColorStop(1, 'rgba(255,120,230,0)'); q.fillStyle = r; q.fillRect(0, 0, 256, 256);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ch), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.position.set(4, 2, -40); groupe.add(halo);

  // lumières : clé chaude, contre-jour cyan, liseré rose
  const cle = new THREE.PointLight(0xfff0e0, 1.4, 120); cle.position.set(18, 22, 30); groupe.add(cle);
  const contre = new THREE.PointLight(0x55d8ff, 1.6, 90); contre.position.set(-20, 10, -14); groupe.add(contre);
  const lise = new THREE.PointLight(0xff4fc8, 1.8, 90); lise.position.set(22, -12, -8); groupe.add(lise);

  return {
    id: 'telephone_test', groupe,
    cles: [{ t: 69.5, label: 'paris' }, { t: 70.7, label: 'mise' }, { t: 72.3, label: 'points' }, { t: 73.5, label: 'lootbox' }, { t: 74.3, label: 'bonus' }, { t: 75.0, label: 'piège' }],
    maj(t) {
      tel.maj(t);
      const u = (t - 69) / 7;
      pivot.rotation.set(-0.04, -0.2 + 0.12 * u, 0.03);
      return {
        camera: { p: [6, 1.5, 34], c: [1.6, 0, 0], fov: 34 },
        fond: 0x2a0b5e, brouillard: null, lumieres: { hemi: 0.5, cle: 0.5 },
        post: { exposition: 0.95, vignette: 0.45, bloomForce: 0.22 },
        hud: tel.hud(t),
      };
    },
  };
}
