/* Régie mobile : la même console que le tiroir de la TV, utilisable depuis un téléphone ou un portable. */
import { $, esc, h, findRelay, setRelay, loadData, connect, onState, onStatus, admin, store, relayBase } from '../shared/core.js';
import { startAtmosphere } from '../shared/fx.js';
import { mountAdmin, ADMIN_CSS } from '../shared/admin.js';

startAtmosphere({ road: false, snow: 0.4, aurora: 0.8 });
const st = document.createElement('style'); st.textContent = ADMIN_CSS; document.head.appendChild(st);
function toast(msg, kind) { const t = h(`<div class="toast ${kind === 'err' ? 'err' : ''}">${esc(msg)}</div>`); $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3000); }

(async () => {
  let info = await findRelay();
  if (!info) {
    const u = prompt('Adresse du relais (ex : http://192.168.1.20:8100)', 'http://localhost:8100');
    if (u) info = await setRelay(u);
  }
  if (!info) { $('#st').textContent = 'Relais introuvable. Recharge la page et saisis son adresse.'; return; }
  await loadData();
  if (!admin.pin) await admin.tryLocalPin();
  $('#lt').href = relayBase() + '/tv/'; $('#lp').href = relayBase() + '/pit/';
  mountAdmin($('#adm'), { onToast: toast });
  onStatus((on) => { $('#st').textContent = on ? 'Connecté au relais' : 'Reconnexion…'; });
  onState((s) => { $('#st').textContent = `Connecté · ${s.online.length} téléphone(s) en ligne · salon ${s.code}`; });
  connect('admin');
})();
