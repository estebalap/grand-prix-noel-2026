/* ROULAGE — sortie physique d'un bolide hors du conteneur Fret (aucune dépendance : testable sous Node).

   Le bolide ne glisse pas : il ROULE.
   - Trajectoire : départ arrêté au fond du conteneur, accélération puis freinage jusqu'à l'arrêt (profil « smootherstep » :
     vitesse et accélération continues, donc pas d'à-coup artificiel).
   - Roues : rotation ω = v / R pour chaque roue (patinage au démarrage : ω un peu plus grand que v / R).
   - Sol vu par chaque roue : plancher du conteneur (dalle), petit seuil arrondi de la trappe (bosse), puis la roue
     « enroule » l'arête de la dalle (centre sur un arc de rayon R autour de l'arête) avant de reposer sur le sol.
   - Châssis : ressort-amortisseur du 2e ordre en pilonnement et en tangage, qui suit le plan des deux essieux
     (+ cabrage proportionnel à l'accélération : l'arrière s'écrase au départ, le nez plonge au freinage), d'où la
     compression au passage du seuil, le petit rebond à la descente et le léger tangage avant à l'arrêt.
   - Contacts : instants de patinage (fumée, étincelles sur la tôle), de passage du seuil et de « toucher » au sol.

   const r = creerRoulage({ xDepart, xArrivee, duree, xEssieuAv, xEssieuAr, rAv, rAr, dalle, xBord });
   const e = r.pas(t, dt);   // t : secondes depuis le début du roulage
   e = { x, v, a, glissement, roues: { av: yCentre, ar: yCentre }, chassis: { y, tangage }, evenements: [...] } */

export const SEUIL_HAUTEUR = 0.12;        // seuil arrondi de 1,2 mm (Lootbox Fret), à l'échelle de la scène
export const SEUIL_LARGEUR = 0.32;

export const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
export const smootherD = (u) => 30 * u * u * (1 - u) * (1 - u);
export const smootherDD = (u) => 60 * u * (1 - u) * (1 - 2 * u);

/** Hauteur du centre d'une roue de rayon r dont l'axe est à l'abscisse x (monde). */
export function centreRoue(x, r, dalle, xBord) {
  if (x <= xBord) {
    const d0 = xBord - SEUIL_LARGEUR;
    const bosse = x > d0 ? SEUIL_HAUTEUR * Math.pow(Math.sin(Math.PI * (x - d0) / SEUIL_LARGEUR), 2) : 0;
    return dalle + r + bosse;
  }
  const dx = x - xBord;
  if (dx >= r) return r;
  return Math.max(r, dalle + Math.sqrt(r * r - dx * dx));       // la roue enroule l'arête de la dalle
}

export function creerRoulage({ xDepart, xArrivee, duree, xEssieuAv, xEssieuAr, rAv, rAr, dalle, xBord,
  raideur = 300, amortissement = 0.34, cabrage = 0.0014, patinage = 0.22, volant = false }) {
  const D = xArrivee - xDepart;
  const w = Math.sqrt(raideur), c = 2 * amortissement * w;
  const emp = xEssieuAv - xEssieuAr;
  const plan = (x) => {             // pilonnement et tangage « géométriques » imposés par les deux essieux
    if (volant) return { y: 0, p: 0 };
    const yAv = centreRoue(x + xEssieuAv, rAv, dalle, xBord) - rAv, yAr = centreRoue(x + xEssieuAr, rAr, dalle, xBord) - rAr;
    const pente = (yAv - yAr) / emp;
    return { y: yAr + (0 - xEssieuAr) * pente, p: Math.atan(pente) };
  };
  const p0 = plan(xDepart);
  const s = { h: p0.y, hv: 0, p: p0.p, pv: 0 };
  const deja = new Set();
  let precedentX = xDepart;
  return {
    duree, distance: D,
    pas(t, dt) {
      const u = Math.max(0, Math.min(1, t / duree));
      const x = xDepart + D * smoother(u);
      const v = t > 0 && t < duree ? D * smootherD(u) / duree : 0;
      const a = t > 0 && t < duree ? D * smootherDD(u) / (duree * duree) : 0;
      const glissement = u < patinage ? 0.9 * (1 - u / patinage) : 0;
      const cible = plan(x);
      // intégration du ressort-amortisseur en sous-pas de 1/240 s (stable quelle que soit la cadence d'image)
      const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (let i = 0; i < n; i++) {
        const ah = raideur * (cible.y - s.h) - c * s.hv;
        const ap = raideur * (cible.p + (volant ? -cabrage * 0.6 : cabrage) * a - s.p) - c * s.pv;
        s.hv += ah * h; s.h += s.hv * h; s.pv += ap * h; s.p += s.pv * h;
      }
      const evenements = [];
      const franchit = (nom, xs) => { if (!deja.has(nom) && precedentX <= xs && x > xs) { deja.add(nom); evenements.push(nom); } };
      franchit('seuil-av', xBord - SEUIL_LARGEUR / 2 - xEssieuAv);
      franchit('seuil-ar', xBord - SEUIL_LARGEUR / 2 - xEssieuAr);
      franchit('sol-av', xBord + rAv - xEssieuAv);
      franchit('sol-ar', xBord + rAr - xEssieuAr);
      if (u >= 1 && !deja.has('arret')) { deja.add('arret'); evenements.push('arret'); }
      precedentX = x;
      return {
        x, v, a, u, glissement,
        roues: { av: centreRoue(x + xEssieuAv, rAv, dalle, xBord), ar: centreRoue(x + xEssieuAr, rAr, dalle, xBord) },
        chassis: { y: s.h, tangage: s.p }, evenements,
      };
    },
  };
}
