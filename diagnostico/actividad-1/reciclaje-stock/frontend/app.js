// Logica: llamadas a la API, creacion de tabla, 
// validaciones de formulario, modal de confirmación para eliminar

// CONFIGURACIÓN
const API_BASE = 'http://localhost:3000/api';

// ESTADO
let materiales = []; // Array de materiales cargados 
let pendingDeleteId = null; // ID del material que se quiere eliminar

// NAVEGACIÓN ENTRE PANELES
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.panel;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`panel-${target}`).classList.add('active');

    // Al cambiar de panel, limpiar mensajes y recargar selectores
    limpiarMensajes();
    if (target === 'ingreso' || target === 'egreso') {
      poblarSelectores();
    }
  });
});



function mostrarMensaje(elementId, texto, tipo) {
  const el = document.getElementById(elementId);
  el.textContent = texto;
  el.className = `form-msg ${tipo}`;
setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      el.textContent = '';
      el.className = 'form-msg';
    }, 3000);
  }, 4000);
}

function limpiarMensajes() {
  document.querySelectorAll('.form-msg').forEach(el => {
    el.textContent = '';
    el.className = 'form-msg';
  });
}

function formatearCantidad(cantidad, unidad) {
  if (unidad === 'unidad') return cantidad.toString();
  if (unidad === 'kg') return Number(cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  if (unidad === 'm3') return Number(cantidad).toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  return cantidad;
}

function etiquetaUnidad(unidad) {
  const mapa = { kg: 'kg', m3: 'm³', unidad: 'unid.' };
  return mapa[unidad] || unidad;
}


// CARGAR STOCK
async function cargarMateriales() {
  document.getElementById('tabla-container').innerHTML = '<div class="loading">Cargando materiales…</div>';

  try {
    const res = await fetch(`${API_BASE}/materiales`);
    if (!res.ok) throw new Error('Error al obtener materiales');
    materiales = await res.json();
    renderizarTabla();
  } catch (err) {
    document.getElementById('tabla-container').innerHTML =
      '<div class="loading" style="color:var(--danger)">No se pudo conectar con el servidor. ¿Está corriendo el backend?</div>';
  }
}

function renderizarTabla() { //generar html de la tabla a partir del array de materiales
  if (materiales.length === 0) {
    document.getElementById('tabla-container').innerHTML =
      '<div class="empty-state">No hay materiales registrados.</div>';
    return;
  }

// P/c material crea una fila con nombre, cant., un. y botón eliminar 
  const filas = materiales.map(m => ` 
    <tr>
      <td class="col-nombre">${escapeHtml(m.nombre)}</td>
      <td class="col-cantidad">${formatearCantidad(m.cantidad, m.unidad)}</td>
      <td class="col-unidad"><span class="badge-unidad">${etiquetaUnidad(m.unidad)}</span></td>
      <td>
        <button class="btn-del" data-id="${m.id}" data-nombre="${escapeHtml(m.nombre)}" title="Eliminar">✕</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('tabla-container').innerHTML = `
    <table class="stock-table">
      <thead>
        <tr>
          <th>Material</th>
          <th>Cantidad</th>
          <th>Unidad</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;

  // Eventos de eliminación
  document.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirModalEliminar(btn.dataset.id, btn.dataset.nombre);
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// POBLAR SELECTORES DE MATERIALES
function poblarSelectores() { 
  ['sel-ingreso', 'sel-egreso'].forEach(id => {
    const sel = document.getElementById(id);
    const valorActual = sel.value;
    sel.innerHTML = '<option value="">— Seleccioná un material —</option>';
    materiales.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre}`;
      opt.dataset.unidad = m.unidad;
      sel.appendChild(opt);
    });
    if (valorActual) sel.value = valorActual;
  });
}

// Actualizar num. y etiqueta de unid. al cambiar el material seleccionado
document.getElementById('sel-ingreso').addEventListener('change', function () {
  const opt = this.options[this.selectedIndex];
  document.getElementById('hint-ingreso').textContent = opt.dataset.unidad ? `(${etiquetaUnidad(opt.dataset.unidad)})` : '';
  const esUnidad = opt.dataset.unidad === 'unidad';
  document.getElementById('cant-ingreso').step = esUnidad ? '1' : 'any';
});

document.getElementById('sel-egreso').addEventListener('change', function () {
  const opt = this.options[this.selectedIndex];
  document.getElementById('hint-egreso').textContent = opt.dataset.unidad ? `(${etiquetaUnidad(opt.dataset.unidad)})` : '';
  const esUnidad = opt.dataset.unidad === 'unidad';
  document.getElementById('cant-egreso').step = esUnidad ? '1' : 'any';
});


// REGISTRAR INGRESO
document.getElementById('btn-ingreso').addEventListener('click', async () => {
  const id       = document.getElementById('sel-ingreso').value;
  const cantidad = document.getElementById('cant-ingreso').value;

  if (!id)       return mostrarMensaje('msg-ingreso', 'Seleccioná un material.', 'error');
  if (!cantidad) return mostrarMensaje('msg-ingreso', 'Ingresá una cantidad.', 'error');

  try {
    const res = await fetch(`${API_BASE}/materiales/${id}/ingreso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: Number(cantidad) }),
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje('msg-ingreso', data.error, 'error');

    mostrarMensaje('msg-ingreso', `✓ Stock actualizado: ${formatearCantidad(data.cantidad, data.unidad)} ${etiquetaUnidad(data.unidad)}`, 'success');
    document.getElementById('cant-ingreso').value = '';
    await cargarMateriales();
    poblarSelectores();
    document.getElementById('sel-ingreso').value = id;
  } catch {
    mostrarMensaje('msg-ingreso', 'Error de conexión con el servidor.', 'error');
  }
});


// REGISTRAR EGRESO
document.getElementById('btn-egreso').addEventListener('click', async () => {
  const id       = document.getElementById('sel-egreso').value;
  const cantidad = document.getElementById('cant-egreso').value;

  if (!id)       return mostrarMensaje('msg-egreso', 'Seleccioná un material.', 'error');
  if (!cantidad) return mostrarMensaje('msg-egreso', 'Ingresá una cantidad.', 'error');

  try {
    const res = await fetch(`${API_BASE}/materiales/${id}/egreso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: Number(cantidad) }),
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje('msg-egreso', data.error, 'error');

    mostrarMensaje('msg-egreso', `✓ Stock actualizado: ${formatearCantidad(data.cantidad, data.unidad)} ${etiquetaUnidad(data.unidad)}`, 'success');
    document.getElementById('cant-egreso').value = '';
    await cargarMateriales();
    poblarSelectores();
    document.getElementById('sel-egreso').value = id;
  } catch {
    mostrarMensaje('msg-egreso', 'Error de conexión con el servidor.', 'error');
  }
});


//  AGREGAR MATERIAL
document.getElementById('btn-agregar').addEventListener('click', async () => {
  const nombre   = document.getElementById('nuevo-nombre').value.trim();
  const unidad   = document.querySelector('input[name="nueva-unidad"]:checked').value;
  const cantidad = document.getElementById('nueva-cantidad').value || '0';

  if (!nombre) return mostrarMensaje('msg-agregar', 'El nombre del material es obligatorio.', 'error');

  try {
    const res = await fetch(`${API_BASE}/materiales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, unidad, cantidad: Number(cantidad) }),
    });
    const data = await res.json();

    if (!res.ok) return mostrarMensaje('msg-agregar', data.error, 'error');

    mostrarMensaje('msg-agregar', `✓ Material "${data.nombre}" agregado correctamente.`, 'success');
    document.getElementById('nuevo-nombre').value     = '';
    document.getElementById('nueva-cantidad').value  = '';
    await cargarMateriales();
  } catch {
    mostrarMensaje('msg-agregar', 'Error de conexión con el servidor.', 'error');
  }
});


// ELIMINAR MATERIAL
function abrirModalEliminar(id, nombre) {
  pendingDeleteId = id;
  document.getElementById('modal-msg').textContent = `¿Eliminar el material "${nombre}"? Esta acción no se puede deshacer.`;
  document.getElementById('modal-overlay').classList.add('open');
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  pendingDeleteId = null;
  document.getElementById('modal-overlay').classList.remove('open');
});

document.getElementById('modal-confirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  document.getElementById('modal-overlay').classList.remove('open');
  pendingDeleteId = null;

  try {
    const res = await fetch(`${API_BASE}/materiales/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    await cargarMateriales();
  } catch {
    alert('Error de conexión con el servidor.');
  }
});

// Cerrar confirmación al hacer click afuera
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    pendingDeleteId = null;
    e.currentTarget.classList.remove('open');
  }
});


// BOTÓN REFRESH
document.getElementById('btn-refresh').addEventListener('click', cargarMateriales);


cargarMateriales();
