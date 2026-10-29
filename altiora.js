const $ = i => document.getElementById(i);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => '$' + Number(n).toLocaleString('es-CO');
const fecha = d => d ? new Date(d + 'T00:00').toLocaleDateString('es-CO', {day: 'numeric', month: 'long', year: 'numeric'}) : '';

let D, P = [], F = [], ciudades = ['Todas'], tiposU = ['Todas'];
let fCiudad = 'Todas', fEstado = 'Todos', fTipo = 'Todos', fTipoU = 'Todas';

async function cargar() {
  try { D = await (await fetch('altiora.json')).json(); await conectarAPI(); }
  catch (e) { $('gridProg').innerHTML = '<div class="empty">No se pudo cargar altiora.json. Abre la página con un servidor local (por ejemplo, Live Server de VS Code).</div>'; return; }

  const hoy = new Date().toISOString().slice(0, 10);
  const ies = Object.fromEntries(D.instituciones.map(i => [i.id, i]));
  P = D.programas.map(p => ({...p, inst: ies[p.ies].nombre, ciudad: ies[p.ies].ciudad,
    estado: hoy < p.ini ? 'Próxima' : hoy <= p.fin ? 'Abierta' : 'Cerrada'}));
  const prog = Object.fromEntries(D.programas.map(p => [p.id, p]));
  F = D.cobertura.map(c => ({...c, nombre: `${c.tipo}: ${prog[c.prog].nombre}`, inst: ies[prog[c.prog].ies].nombre}));
  D.instituciones.forEach(i => i.n = P.filter(p => p.ies === i.id).length);

  ciudades = ['Todas', ...new Set(P.map(p => p.ciudad))];
  tiposU = ['Todas', ...new Set(D.instituciones.map(i => i.tipo))];
  $('facts').innerHTML = [[P.filter(p => p.estado === 'Abierta').length, 'convocatorias abiertas'], [P.length, 'programas'], [D.instituciones.length, 'instituciones'], [F.length + D.entidades.length, 'becas, créditos y fondos']]
    .map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
  $('q').oninput = pintarProg;
  renderAuth(true);
  pintarProg(); pintarUni(); pintarFin(); pintarEnt();
}

function chips(el, vals, act, fn) {
  el.innerHTML = vals.map(v => `<button class="chip${v === act ? ' on' : ''}" type="button">${esc(v)}</button>`).join('');
  [...el.children].forEach((b, i) => b.onclick = () => fn(vals[i]));
}

function pintarProg() {
  chips($('chipsCiudad'), ciudades, fCiudad, v => { fCiudad = v; pintarProg(); });
  chips($('chipsEstado'), ['Todos', 'Abierta', 'Próxima', 'Cerrada'], fEstado, v => { fEstado = v; pintarProg(); });
  const q = $('q').value.toLowerCase().trim();
  const r = P.filter(p => (fCiudad === 'Todas' || p.ciudad === fCiudad) && (fEstado === 'Todos' || p.estado === fEstado) && (p.nombre + ' ' + p.inst).toLowerCase().includes(q));
  $('gridProg').innerHTML = r.length ? r.map(p => `<article class="card prog ${p.estado[0].toLowerCase()}">
    <div class="meta"><span class="tag st-${p.estado}">${p.estado}</span><span class="tag">${esc(p.tipo)}</span><span class="tag">${esc(p.ciudad)}</span></div>
    <h3>${esc(p.nombre)}</h3><div class="inst">${esc(p.inst)}</div>
    <dl><div><dt>Convocatoria</dt><dd>${fecha(p.ini)} al ${fecha(p.fin)}</dd></div><div><dt>Requisitos</dt><dd>${esc(p.req)}</dd></div><div><dt>Beneficios</dt><dd>${esc(p.ben)}</dd></div></dl><button class="save${guardado(p.id) ? ' on' : ''}" data-id="${p.id}" aria-pressed="${guardado(p.id)}">${guardado(p.id) ? '♥ Guardado' : '♡ Guardar'}</button></article>`).join('')
    : '<div class="empty">No hay programas con esos filtros. Prueba otra ciudad o borra la búsqueda.</div>';
}

function pintarUni() {
  chips($('chipsTipoU'), tiposU, fTipoU, v => { fTipoU = v; pintarUni(); });
  const r = D.instituciones.filter(i => fTipoU === 'Todas' || i.tipo === fTipoU);
  $('gridUni').innerHTML = r.map(i => `<article class="card uni">
    <div class="banner" style="background:linear-gradient(135deg,hsl(${i.id * 47 % 360} 55% 30%),hsl(${(i.id * 47 + 40) % 360} 60% 42%))">
      <span>${esc(i.sig)}</span>${i.img ? `<img src="${esc(i.img)}" alt="Campus de ${esc(i.nombre)}" loading="lazy" onerror="this.remove()">` : ''}</div>
    <div class="body"><h3>${esc(i.nombre)}</h3>
      <div class="meta"><span class="tag">${esc(i.tipo)}</span><span class="tag">${esc(i.ciudad)}</span></div>
      <p>${i.n} ${i.n === 1 ? 'programa registrado' : 'programas registrados'}</p>
      <p>${esc(i.tel)}</p><a href="mailto:${esc(i.mail)}">${esc(i.mail)}</a><a href="${esc(i.web)}" target="_blank" rel="noopener">Sitio oficial</a></div></article>`).join('');
}

function pintarFin() {
  chips($('chipsTipo'), ['Todos', 'Beca', 'Crédito', 'Beca-Crédito'], fTipo, v => { fTipo = v; pintarFin(); });
  const r = F.filter(f => fTipo === 'Todos' || f.tipo === fTipo);
  $('gridFin').innerHTML = r.map(f => `<article class="card fund"><div class="ring" style="--p:${f.pct}"><b>${f.pct}%</b></div>
    <div><div class="meta"><span class="tag">${esc(f.tipo)}</span></div><h3 style="margin-top:.4rem">${esc(f.nombre)}</h3>
    <div class="inst">${esc(f.quien)}</div><p style="margin-top:.4rem"><b>Costo del programa:</b> ${money(f.costo)}<br><small>${esc(f.inst)} · ${esc(f.dur)}</small></p><p><small>${esc(f.notas)}</small></p></div></article>`).join('')
    || '<div class="empty">Todavía no hay apoyos de este tipo.</div>';
}

function pintarEnt() {
  $('gridEnt').innerHTML = D.entidades.map(e => `<article class="card ent"><span class="tag">${esc(e.ambito)}</span><h3>${esc(e.nombre)}</h3><p>${esc(e.desc)}</p><a href="${esc(e.web)}" target="_blank" rel="noopener">Ir al sitio oficial</a></article>`).join('');
}

// ---------- Conexión con la API (FastAPI + MariaDB) ----------
const API = 'http://127.0.0.1:8000/api';
let ME = null, ONLINE = false, modoReg = false, pendiente = null;
const tok = () => localStorage.getItem('altiora_token');
const guardado = id => !!ME && ME.favs.includes(id);

async function api(ruta, op = {}) {
  const r = await fetch(API + ruta, {...op, headers: {'Content-Type': 'application/json', ...(tok() ? {Authorization: 'Bearer ' + tok()} : {}), ...op.headers}});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || 'Ocurrió un error. Inténtalo de nuevo.');
  return d;
}

// Si la API responde, sus datos reemplazan a los del JSON (el JSON aporta sigla, web e imagen).
async function conectarAPI() {
  try {
    const c = await api('/catalogo');
    const extra = Object.fromEntries(D.instituciones.map(i => [i.id, i]));
    const limpio = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
    D.instituciones = c.instituciones.map(i => ({sig: i.nombre, ...extra[i.id], ...limpio(i)}));
    D.programas = c.programas; D.cobertura = c.cobertura; ONLINE = true;
    if (tok()) ME = await api('/me').catch(() => { localStorage.removeItem('altiora_token'); return null; });
  } catch (e) { ONLINE = false; }
}

function abrirAuth(reg) {
  modoReg = reg; $('lNombre').hidden = !reg; $('aNombre').required = reg; $('aMsg').textContent = '';
  $('aTitle').textContent = reg ? 'Crear cuenta' : 'Iniciar sesión';
  $('aSub').textContent = reg ? 'Regístrate para guardar programas y ver sus becas.' : 'Entra para guardar tus programas favoritos.';
  $('aBtn').textContent = reg ? 'Registrarme' : 'Entrar';
  $('aToggle').textContent = reg ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
  $('aPass').autocomplete = reg ? 'new-password' : 'current-password';
  if (!$('dlgAuth').open) $('dlgAuth').showModal();
}

function renderAuth(sinPintar) {
  const box = $('authBox');
  box.innerHTML = ME ? `<button class="btn ghost" id="bPanel">♥ Mi panel (${ME.favs.length})</button><button class="link" id="bOut">Salir</button>`
    : '<button class="link" id="bIn">Iniciar sesión</button><button class="btn" id="bReg">Registrarme</button>';
  if (ME) { $('bPanel').onclick = abrirPanel; $('bOut').onclick = () => { localStorage.removeItem('altiora_token'); ME = null; $('dlgPanel').close(); fCiudad = 'Todas'; renderAuth(); pintarProg(); }; }
  else { $('bIn').onclick = () => abrirAuth(false); $('bReg').onclick = () => abrirAuth(true); }
  if (sinPintar && ME && ME.ciudad && ciudades.includes(ME.ciudad)) fCiudad = ME.ciudad;
}

$('aToggle').onclick = () => abrirAuth(!modoReg);
$('fAuth').onsubmit = async e => {
  e.preventDefault();
  const msg = $('aMsg'), btn = $('aBtn'); msg.textContent = ''; btn.disabled = true;
  try {
    if (!ONLINE) throw new Error('No hay conexión con el servidor. Inicia la API (uvicorn main:app --reload).');
    const d = await api(modoReg ? '/registro' : '/login', {method: 'POST', body: JSON.stringify({nombre: $('aNombre').value, email: $('aMail').value, password: $('aPass').value})});
    localStorage.setItem('altiora_token', d.token);
    if (pendiente !== null) await api('/favoritos/' + pendiente, {method: 'PUT'});
    pendiente = null; ME = await api('/me');
    $('fAuth').reset(); $('dlgAuth').close(); renderAuth(true); pintarProg();
  } catch (err) { msg.textContent = err.message; }
  btn.disabled = false;
};

async function toggleFav(id) {
  if (!ME) { pendiente = id; return abrirAuth(false); }
  try {
    await api('/favoritos/' + id, {method: guardado(id) ? 'DELETE' : 'PUT'});
    ME = await api('/me'); renderAuth(); pintarProg();
    if ($('dlgPanel').open) abrirPanel();
  } catch (err) { alert(err.message); }
}
$('gridProg').onclick = e => { const b = e.target.closest('.save'); if (b) toggleFav(+b.dataset.id); };

function abrirPanel() {
  if (!ME) return;
  $('pTitle').textContent = `Hola, ${ME.nombre}`;
  $('pCiudad').innerHTML = ciudades.map(c => { const v = c === 'Todas' ? '' : c; return `<option value="${esc(v)}"${(ME.ciudad || '') === v ? ' selected' : ''}>${v ? esc(c) : 'Cualquier ciudad'}</option>`; }).join('');
  const mios = P.filter(p => ME.favs.includes(p.id));
  $('pList').innerHTML = mios.length ? mios.map(p => `<div class="fav"><div><b>${esc(p.nombre)}</b><br><small>${esc(p.inst)} · ${esc(p.ciudad)} · ${p.estado}</small>
    ${F.filter(f => f.prog === p.id).map(f => `<div class="fin"><span class="tag">${esc(f.tipo)}</span> cubre ${f.pct}% · ${esc(f.quien)}</div>`).join('')}</div>
    <button class="link" data-id="${p.id}">Quitar</button></div>`).join('')
    : '<p class="vacio">Aún no guardas programas. Toca “Guardar” en cualquier programa y aparecerá aquí con sus becas y créditos.</p>';
  if (!$('dlgPanel').open) $('dlgPanel').showModal();
}
$('pList').onclick = e => { const b = e.target.closest('button[data-id]'); if (b) toggleFav(+b.dataset.id); };
$('pCiudad').onchange = async e => {
  try { ME = await api('/me', {method: 'PUT', body: JSON.stringify({ciudad: e.target.value})}); fCiudad = ME.ciudad || 'Todas'; pintarProg(); }
  catch (err) { alert(err.message); }
};

cargar();