/* TROPHÉE DORÉ du segment arène (V9 Ring, « GLOIRE ») — coupe procédurale : socle en marches (laque prune + filets or), fût galbé,
   nœud annelé, vasque à lèvre retournée (LatheGeometry), deux anses en volute (tubes sur courbe), couvercle et étoile de Noël à 5
   branches au sommet. Or métallisé (MeshPhysicalMaterial : métal 1, rugosité 0,16, vernis), reflets de l'envMap néon.
   Il monte du centre du ring sur un élévateur (anneau lumineux dans le tapis). Hauteur totale ≈ 34 cm.
   creerTrophee(THREE, { envMap, yTapis }) → { groupe, maj(t, montee, eclat), hauteur } — fonction pure. */
import { clamp, smoother, haloSprite } from './arene_outils.js';

export function creerTrophee(THREE, { envMap = null, yTapis = 22 } = {}) {
  const groupe = new THREE.Group(); groupe.name = 'trophee';
  const coupe = new THREE.Group(); groupe.add(coupe);
  const or = new THREE.MeshPhysicalMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.1, envMap, envMapIntensity: 1.6, emissive: new THREE.Color('#5a3200'), emissiveIntensity: 0.25 });
  const orClair = new THREE.MeshPhysicalMaterial({ color: 0xffe08a, metalness: 1, roughness: 0.1, clearcoat: 1, envMap, envMapIntensity: 1.8 });
  const laque = new THREE.MeshPhysicalMaterial({ color: 0x3a1066, metalness: 0.2, roughness: 0.18, clearcoat: 1, envMap, envMapIntensity: 1.0 });
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // socle à marches
  let y = 0;
  for (const [r, h, m] of [[9.5, 1.6, laque], [9.8, 0.35, or], [8.2, 2.2, laque], [8.5, 0.35, or], [6.6, 1.8, laque], [6.9, 0.4, or]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), m); c.position.y = y + h / 2; coupe.add(c); y += h;
  }
  const yPied = y;
  // fût + nœud + vasque : profil de révolution unique
  const prof = [V2(0, 0), V2(3.4, 0), V2(3.0, 0.6), V2(1.6, 1.6), V2(1.15, 4.2), V2(1.9, 5.0), V2(2.2, 5.5), V2(1.9, 6.0), V2(1.2, 6.6), V2(1.4, 7.6),
    V2(3.2, 8.8), V2(5.6, 10.6), V2(7.4, 13.2), V2(8.4, 16.2), V2(8.8, 18.6), V2(9.6, 19.4), V2(9.9, 19.9), V2(9.4, 20.1), V2(8.5, 19.2), V2(7.9, 16.6), V2(6.8, 13.5), V2(0.1, 12.0)];
  const vasque = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), or); vasque.position.y = yPied; coupe.add(vasque);
  const bande = new THREE.Mesh(new THREE.TorusGeometry(7.75, 0.28, 10, 64), orClair); bande.rotation.x = Math.PI / 2; bande.position.y = yPied + 14.2; coupe.add(bande);
  // anses en volute
  for (const s of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([[7.6, 17.6], [11.6, 18.2], [13.4, 15.4], [12.0, 12.0], [9.2, 10.6], [7.2, 11.2]].map(([x, yy]) => new THREE.Vector3(s * x, yPied + yy, 0)));
    const a = new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.62, 10, false), or); coupe.add(a);
    const boule = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10), orClair); boule.position.set(s * 7.2, yPied + 11.2, 0); coupe.add(boule);
  }
  // couvercle + étoile
  const couv = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(9.0, 0), V2(8.6, 0.6), V2(6.0, 1.8), V2(2.4, 3.2), V2(1.0, 4.2), V2(1.3, 4.8), V2(0, 5.2)], 48), or);
  couv.position.y = yPied + 19.9; coupe.add(couv);
  const forme = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 4.0; if (i) forme.lineTo(Math.cos(a) * r, Math.sin(a) * r); else forme.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  forme.closePath();
  const etoile = new THREE.Mesh(new THREE.ExtrudeGeometry(forme, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 3 }), orClair);
  etoile.geometry.center(); etoile.position.y = yPied + 29.4; coupe.add(etoile);
  const hauteur = yPied + 33.6;
  const aura = haloSprite(THREE, '#ffd27a', 60, 0); aura.position.y = hauteur * 0.6; groupe.add(aura);
  // élévateur : disque laqué + anneau lumineux dans le tapis
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 1.2, 48), laque); plateau.position.y = -0.6; groupe.add(plateau);
  const anneau = new THREE.Mesh(new THREE.RingGeometry(11.2, 13, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(2.2), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  anneau.rotation.x = -Math.PI / 2; anneau.position.y = yTapis + 0.05; anneau.renderOrder = 2;

  function maj(t, montee, eclat) {
    const m = smoother(montee);
    groupe.visible = montee > 0;
    anneau.visible = montee > 0; anneau.material.opacity = Math.min(1, montee * 4) * 0.9;
    groupe.position.set(0, yTapis - (hauteur + 2) * (1 - m), 0);
    coupe.rotation.y = 0.35 * t;
    etoile.rotation.y = -0.9 * t;
    aura.material.opacity = 0.55 * eclat * m; aura.scale.setScalar(50 + 12 * Math.sin(t * 3));
  }
  return { groupe, anneau, maj, hauteur };
}
