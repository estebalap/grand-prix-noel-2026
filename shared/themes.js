/* Thèmes d'ambiance : un par mode de jeu (repris des 8 univers de l'application 1.0, retravaillés).
   Chaque thème règle : palette (variables CSS), ciel/rubans, particules, route, effets spéciaux et bande-son. */

const rib = (c, y, a, s, ph) => ({ c, y, a, s, ph });
const foil = (...s) => `linear-gradient(180deg,${s.join(',')})`;

const NOEL_ROAD = { ground: 'rgba(6,8,28,.92)', fill: ['rgba(120,90,255,0)', 'rgba(70,60,190,.22)', 'rgba(25,20,90,.55)'], edge: '255,224,150', lane: '160,200,255', hue: null, sat: 95, light: 66, halo: '255,200,120', grid: null, sun: null };

export const THEMES = {
  gp_bets: {
    aurora: 0.7,
    scene: 'rainbow',
    id: 'gp_bets', name: 'Rainbow Road Galactique', tagline: 'Le ruban arc-en-ciel au milieu des planètes', music: 'noel', speed: 0.25,
    sky: ['#05010f', '#14063a', '#2c0b5e'], starColor: '255,248,225', stars: 1.6, waveSpeed: 1, hueSpeed: 0.02, flashColor: '255,255,255',
    ribbons: [rib([60, 255, 190], 0.18, 0.26, 0.00011, 0), rib([120, 160, 255], 0.26, 0.20, 0.00008, 2), rib([255, 90, 140], 0.12, 0.14, 0.00014, 4), rib([255, 210, 110], 0.34, 0.10, 0.00006, 1)],
    particles: { kind: 'snow', density: 1, color: '255,255,255' }, road: NOEL_ROAD, extras: {},
    accent: {}, // palette par défaut (or)
  },
  gp_pure: {
    aurora: 0.45,
    scene: 'orbit',
    id: 'gp_pure', name: 'Rainbow Road Orbitale', tagline: 'En orbite au-dessus de la Terre', music: 'noel_pure', speed: 0.45,
    sky: ['#000004', '#03102e', '#0a2c5c'], starColor: '230,245,255', stars: 1.8, waveSpeed: 1.4, hueSpeed: 0.03, flashColor: '255,255,255',
    ribbons: [rib([120, 230, 255], 0.2, 0.28, 0.00013, 0), rib([160, 190, 255], 0.28, 0.2, 0.0001, 2), rib([220, 245, 255], 0.14, 0.14, 0.00016, 4)],
    particles: { kind: 'dust', density: 0.6, color: '200,230,255' },
    road: { ground: 'rgba(4,14,36,.92)', fill: ['rgba(120,200,255,0)', 'rgba(70,140,220,.22)', 'rgba(20,50,110,.55)'], edge: '210,240,255', lane: '150,215,255', hue: [185, 6, 0.04, 70], sat: 90, light: 72, halo: '170,225,255', grid: null, sun: null },
    extras: {},
    accent: { '--gold-1': '#f2fbff', '--gold-2': '#bfe9ff', '--gold-3': '#6cc4f0', '--gold-4': '#2c7aa6', '--foil': foil('#ffffff 0%', '#d4f1ff 30%', '#7fcff5 58%', '#3b8cc0 78%', '#e4f6ff 100%'),
      '--btn-1': '#e2f6ff', '--btn-2': '#6cc4f0', '--btn-3': '#2c7aa6', '--btn-ink': '#031826', '--btn-sh': '#14506f', '--hair': 'rgba(170,225,255,.3)' },
  },
  survival: {
    aurora: 0,
    scene: 'desert',
    id: 'survival', name: 'Fury Road', tagline: 'Désert brûlé · il n\'en restera qu\'un', music: 'survival', speed: 0.5,
    sky: ['#1a0300', '#7a2008', '#e0702a'], starColor: '255,170,130', stars: 0.15, waveSpeed: 0.8, hueSpeed: 0.01, flashColor: '255,40,20',
    ribbons: [rib([255, 70, 30], 0.22, 0.28, 0.00007, 0), rib([200, 20, 20], 0.3, 0.3, 0.00005, 2), rib([255, 160, 40], 0.16, 0.14, 0.00009, 4)],
    particles: { kind: 'embers', density: 1.1, color: '255,140,50' },
    road: { ground: 'rgba(40,10,2,.95)', fill: ['rgba(255,140,60,0)', 'rgba(160,60,20,.3)', 'rgba(70,18,6,.7)'], edge: '255,150,70', lane: '255,110,50', hue: [15, 4, 0.02, 30], sat: 100, light: 55, halo: '255,120,40', grid: null, sun: null },
    extras: { flash: 1.3 },
    accent: { '--gold-1': '#ffe6c9', '--gold-2': '#ff8a3d', '--gold-3': '#ff3b30', '--gold-4': '#8a1010', '--foil': foil('#fff0d6 0%', '#ffb15c 30%', '#ff4a2a 60%', '#8a1010 85%', '#ff9a5c 100%'),
      '--btn-1': '#ffa07a', '--btn-2': '#ff3b30', '--btn-3': '#a01212', '--btn-ink': '#2a0000', '--btn-sh': '#5a0808', '--hair': 'rgba(255,110,70,.34)' },
  },
  boss_tomica: {
    aurora: 0.2,
    scene: 'tokyo',
    id: 'boss_tomica', name: 'Tokyo Drift', tagline: 'Shinjuku de nuit · néons & pluie', music: 'tokyo', speed: 0.55,
    sky: ['#02010a', '#10052c', '#3a0a4c'], starColor: '180,240,255', stars: 0.5, waveSpeed: 1.2, hueSpeed: 0.05, flashColor: '120,240,255',
    ribbons: [rib([0, 240, 255], 0.2, 0.28, 0.00012, 0), rib([255, 0, 140], 0.28, 0.24, 0.00009, 2), rib([57, 255, 20], 0.12, 0.12, 0.00013, 4)],
    particles: { kind: 'rain', density: 0.9, colors: ['rgba(0,240,255,1)', 'rgba(255,60,170,1)', 'rgba(190,150,255,1)'] },
    road: { ground: 'rgba(6,4,24,.94)', fill: ['rgba(255,0,140,0)', 'rgba(90,40,200,.24)', 'rgba(30,6,70,.6)'], edge: '0,240,255', lane: '255,60,170', hue: [170, 7, 0.05, 150], sat: 100, light: 62, halo: '255,40,160', grid: '0,240,255', sun: null },
    extras: { flash: 0.8 },
    accent: { '--gold-1': '#e8fdff', '--gold-2': '#5cf2ff', '--gold-3': '#ff3dac', '--gold-4': '#7a1fa8', '--foil': foil('#e8fdff 0%', '#5cf2ff 32%', '#ff3dac 66%', '#8a2be2 88%', '#a8f8ff 100%'),
      '--btn-1': '#a5f9ff', '--btn-2': '#3dd6f5', '--btn-3': '#b3248f', '--btn-ink': '#02131a', '--btn-sh': '#5a0f4d', '--hair': 'rgba(92,242,255,.34)' },
  },
  boss_majorette: {
    aurora: 0.25,
    scene: 'paris',
    id: 'boss_majorette', name: 'Nightcall Paris', tagline: 'French touch · tour Eiffel & lune rose', music: 'frenchtouch', speed: 0.35,
    sky: ['#07011a', '#250744', '#6a1670'], starColor: '255,250,230', stars: 1, waveSpeed: 0.9, hueSpeed: 0.01, flashColor: '255,255,255',
    ribbons: [rib([0, 60, 200], 0.2, 0.3, 0.00009, 0), rib([255, 255, 255], 0.26, 0.16, 0.00007, 2), rib([237, 41, 57], 0.14, 0.28, 0.00011, 4)],
    particles: { kind: 'dust', density: 0.6, color: '255,140,220' },
    road: { ground: 'rgba(14,2,30,.94)', fill: ['rgba(255,60,200,0)', 'rgba(140,40,200,.28)', 'rgba(40,6,70,.65)'], edge: '255,110,230', lane: '120,200,255', hue: [300, 6, 0.03, 60], sat: 100, light: 62, halo: '255,90,220', grid: '255,90,220', sun: null },
    extras: {},
    accent: { '--gold-1': '#ffffff', '--gold-2': '#dfe9ff', '--gold-3': '#6f9bff', '--gold-4': '#1b3fa0', '--foil': foil('#8fb2ff 0%', '#ffffff 38%', '#ffffff 55%', '#ff6b7a 100%'),
      '--btn-1': '#ff8d98', '--btn-2': '#ed2939', '--btn-3': '#9a1020', '--btn-ink': '#ffffff', '--btn-sh': '#5e0a14', '--hair': 'rgba(150,185,255,.34)' },
  },
  f1_apex: {
    aurora: 0,
    scene: 'monaco',
    id: 'f1_apex', name: 'Grand Prix de nuit', tagline: 'Circuit en bord de mer · projecteurs & feux de départ', music: 'techno', speed: 0.6,
    sky: ['#010208', '#070c20', '#121c3a'], starColor: '255,255,255', stars: 0.6, waveSpeed: 1.6, hueSpeed: 0.02, flashColor: '255,255,255',
    ribbons: [rib([239, 68, 68], 0.14, 0.3, 0.00013, 0), rib([0, 229, 255], 0.3, 0.18, 0.00011, 2), rib([255, 255, 255], 0.2, 0.06, 0.00009, 4)],
    particles: { kind: 'sparks', density: 0.35, color: '255,190,120' },
    road: { ground: 'rgba(6,6,12,.96)', fill: ['rgba(255,255,255,0)', 'rgba(90,90,110,.3)', 'rgba(25,25,38,.7)'], edge: '255,40,50', lane: '235,235,245', hue: [0, 0, 0, 1], sat: 0, light: 82, halo: '220,230,255', grid: null, sun: null },
    extras: { rev: true },
    accent: { '--gold-1': '#ffffff', '--gold-2': '#e4e8f2', '--gold-3': '#ff2d3d', '--gold-4': '#7a0f18', '--foil': foil('#ffffff 0%', '#dfe4ef 38%', '#9aa3b8 66%', '#ffffff 100%'),
      '--btn-1': '#ff7a84', '--btn-2': '#ef1b2b', '--btn-3': '#8f0a14', '--btn-ink': '#ffffff', '--btn-sh': '#520509', '--hair': 'rgba(255,255,255,.26)' },
  },
  chaos: {
    aurora: 0.35,
    scene: 'rave',
    id: 'chaos', name: 'Chaos Rave', tagline: 'Tunnel techno · lasers & stroboscope', music: 'chiptune', speed: 0.8,
    sky: ['#000000', '#08001a', '#180032'], starColor: '255,255,255', stars: 0.5, waveSpeed: 2, hueSpeed: 0.14, flashColor: '255,120,220',
    ribbons: [rib([168, 85, 247], 0.2, 0.34, 0.00016, 0), rib([244, 63, 94], 0.28, 0.3, 0.00012, 2), rib([250, 204, 21], 0.12, 0.2, 0.00018, 4), rib([6, 182, 212], 0.34, 0.24, 0.00014, 1)],
    particles: { kind: 'warp', density: 0.8 },
    road: { ground: 'rgba(14,2,34,.92)', fill: ['rgba(255,80,200,0)', 'rgba(150,60,230,.26)', 'rgba(50,10,100,.6)'], edge: '255,120,230', lane: '120,220,255', hue: null, sat: 100, light: 64, halo: '255,90,210', grid: null, sun: null },
    extras: { flash: 1.6 },
    accent: { '--gold-1': '#fff6a8', '--gold-2': '#ff7ad9', '--gold-3': '#a855f7', '--gold-4': '#5b1aa8', '--foil': foil('#ffe14a 0%', '#ff6ac6 35%', '#a65bff 65%', '#35d4f0 100%'),
      '--btn-1': '#ffa6e6', '--btn-2': '#d946ef', '--btn-3': '#7e1fa8', '--btn-ink': '#230030', '--btn-sh': '#44086a', '--hair': 'rgba(255,120,220,.34)' },
  },
  reliques: {
    aurora: 0,
    scene: 'western',
    id: 'reliques', name: 'Ruée vers l\'Ouest', tagline: 'Far West sépia · soleil couchant & vieux film', music: 'western', speed: 0.4,
    sky: ['#2a0e04', '#9a4416', '#e89a4c'], starColor: '255,225,170', stars: 0.1, waveSpeed: 0.7, hueSpeed: 0.01, flashColor: '255,200,120',
    ribbons: [rib([245, 158, 11], 0.24, 0.2, 0.00006, 0), rib([217, 70, 140], 0.3, 0.18, 0.00005, 2), rib([180, 83, 9], 0.16, 0.16, 0.00008, 4)],
    particles: { kind: 'dust', density: 0.7, color: '255,200,120' },
    road: { ground: 'rgba(60,26,8,.95)', fill: ['rgba(180,110,50,0)', 'rgba(150,85,35,.35)', 'rgba(90,45,15,.75)'], edge: '255,210,140', lane: '255,190,120', hue: [30, 3, 0.01, 25], sat: 70, light: 55, halo: '255,170,80', grid: null, sun: null },
    extras: {},
    accent: { '--gold-1': '#ffeccb', '--gold-2': '#f5a524', '--gold-3': '#c26a0a', '--gold-4': '#6b3203', '--foil': foil('#fff2d2 0%', '#ffc65c 30%', '#e0791a 60%', '#8a3d05 82%', '#ffd890 100%'),
      '--btn-1': '#ffcf7a', '--btn-2': '#e08a12', '--btn-3': '#8a4b05', '--btn-ink': '#2b1400', '--btn-sh': '#4d2802', '--hair': 'rgba(255,190,100,.32)' },
  },
};
export const DEFAULT_THEME = 'gp_bets';

const BASE_VARS = ['--gold-1', '--gold-2', '--gold-3', '--gold-4', '--foil', '--btn-1', '--btn-2', '--btn-3', '--btn-ink', '--btn-sh', '--hair'];

/** Applique la palette du mode au document (attribut data-mode + variables CSS) avec un fondu. */
export function applyTheme(id) {
  const t = THEMES[id] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  if (root.dataset.mode === t.id) return t;
  const first = !root.dataset.mode;
  root.dataset.mode = t.id;
  BASE_VARS.forEach((v) => root.style.removeProperty(v));
  Object.entries(t.accent).forEach(([k, v]) => root.style.setProperty(k, v));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.sky[1];
  if (!first) {                                   // petit « flash » de transition
    document.body.classList.remove('theme-switch'); void document.body.offsetWidth; document.body.classList.add('theme-switch');
  }
  return t;
}
export const themeOf = (id) => THEMES[id] || THEMES[DEFAULT_THEME];
