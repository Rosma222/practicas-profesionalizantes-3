import {
  registrarUsuario,
  iniciarSesion,
  crearUsuario,
  eliminarUsuario,
  modificarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  crearRol,
  eliminarRol,
  listarRoles,
  asignarPermiso,
  revocarPermiso,
  listarPermisosPorRol
} from './usecases.mjs';

import {
  insertarUsuario,
  eliminarUsuario   as eliminarUsuarioDB,
  modificarUsuario  as modificarUsuarioDB,
  listarUsuarios    as listarUsuariosBD,
  buscarUsuarioPorId as buscarUsuarioPorIdDB,
  buscarUsuarioPorCredenciales,
  insertarRol,
  eliminarRol       as eliminarRolDB,
  listarRoles       as listarRolesBD,
  asignarPermiso    as asignarPermisoDB,
  revocarPermiso    as revocarPermisoDB,
  listarPermisosPorRol as listarPermisosPorRolDB
} from './db.mjs';


// FUNCIÓN AUX: Parsea el body de una petición POST o PUT.
// Node no lo hace automáticamente, hay que leer los chunks

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        // Intentamos parsear como JSON (para peticiones con Content-Type: application/json)
        resolve(JSON.parse(body));
      } catch {
        // Si no es JSON, lo parseamos como formulario HTML (application/x-www-form-urlencoded)
        resolve(Object.fromEntries(new URLSearchParams(body)));
      }
    });
    req.on('error', reject);
  });
}

// Extrae los parámetros de la URL. Ej: /usuarios?id=5 → { id: '5' }
function parseQueryParams(req, baseUrl) {
  const url = new URL(req.url, baseUrl);
  return Object.fromEntries(url.searchParams);
}

// Función que unifica la respuesta JSON para no repetir código
function responderJSON(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}


// HANDLERS DE AUTENTICACIÓN

/**para POST/register -Alta usuario  */

export async function register_handler(req, res, db) {
  if (req.method !== 'POST') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa POST.' });
  }
  try {
    const body = await parseBody(req);
    const output = await registrarUsuario(
      (username, password) => insertarUsuario(db, username, password, 2),
      body.username,
      body.password
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en register_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para POST /login - Inicio de sesión */
 
export async function login_handler(req, res, db) {
  if (req.method !== 'POST') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa POST.' });
  }
  try {
    const body = await parseBody(req);
    const output = await iniciarSesion(
      (username, password) => buscarUsuarioPorCredenciales(db, username, password),
      body.username,
      body.password
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en login_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}


// HANDLERS DE USUARIOS

/**para POST /usuarios/crear- Alta de usuario con rol elegido */

export async function crearUsuario_handler(req, res, db) {
  if (req.method !== 'POST') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa POST.' });
  }
  try {
    const body = await parseBody(req);
    const output = await crearUsuario(
      (username, password, rol_id) => insertarUsuario(db, username, password, rol_id),
      body.username,
      body.password,
      body.rol_id
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en crearUsuario_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para DELETE /usuarios/eliminar -Baja de usuario. El id viene como parámetro en la URL: /usuarios/eliminar?id=5 */

export async function eliminarUsuario_handler(req, res, db, baseUrl) {
  if (req.method !== 'DELETE') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa DELETE.' });
  }
  try {
    const params = parseQueryParams(req, baseUrl);
    const output = await eliminarUsuario(
      (id) => eliminarUsuarioDB(db, id),
      params.id
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en eliminarUsuario_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para PUT /usuarios/modificar- Modificación de usuario. Los datos vienen en el body. */

export async function modificarUsuario_handler(req, res, db) {
  if (req.method !== 'PUT') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa PUT.' });
  }
  try {
    const body = await parseBody(req);
    const output = await modificarUsuario(
      (id, username, password, rol_id) => modificarUsuarioDB(db, id, username, password, rol_id),
      body.id,
      body.username,
      body.password,
      body.rol_id
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en modificarUsuario_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para GET /usuarios/listar -Devuelve todos los usuarios con su rol **/

export async function listarUsuarios_handler(req, res, db) {
  if (req.method !== 'GET') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa GET.' });
  }
  try {
    const output = await listarUsuarios(() => listarUsuariosBD(db));
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en listarUsuarios_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para GET /usuarios/buscar - Busca un usuario por id. Ej: /usuarios/buscar?id=3 */

export async function buscarUsuarioPorId_handler(req, res, db, baseUrl) {
  if (req.method !== 'GET') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa GET.' });
  }
  try {
    const params = parseQueryParams(req, baseUrl);
    const output = await buscarUsuarioPorId(
      (id) => buscarUsuarioPorIdDB(db, id),
      params.id
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en buscarUsuarioPorId_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}


// HANDLERS DE ROLES

/**para POST /roles/crear*/
export async function crearRol_handler(req, res, db) {
  if (req.method !== 'POST') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa POST.' });
  }
  try {
    const body = await parseBody(req);
    const output = await crearRol(
      (nombre) => insertarRol(db, nombre),
      body.nombre
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en crearRol_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para DELETE /roles/eliminar -id y nombre vienen como parámetros en la URL: /roles/eliminar?id=3&nombre=editor*/

export async function eliminarRol_handler(req, res, db, baseUrl) {
  if (req.method !== 'DELETE') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa DELETE.' });
  }
  try {
    const params = parseQueryParams(req, baseUrl);
    const output = await eliminarRol(
      (id) => eliminarRolDB(db, id),
      params.id,
      params.nombre
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en eliminarRol_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para GET /roles/listar */

export async function listarRoles_handler(req, res, db) {
  if (req.method !== 'GET') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa GET.' });
  }
  try {
    const output = await listarRoles(() => listarRolesBD(db));
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en listarRoles_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}


// HANDLERS DE PERMISOS

/**para POST /permisos/asignar */

export async function asignarPermiso_handler(req, res, db) {
  if (req.method !== 'POST') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa POST.' });
  }
  try {
    const body = await parseBody(req);
    const output = await asignarPermiso(
      (rol_id, accion) => asignarPermisoDB(db, rol_id, accion),
      body.rol_id,
      body.accion
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en asignarPermiso_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para DELETE /permisos/revocar - el id viene como parámetro en la URL: /permisos/revocar?id=2 */

export async function revocarPermiso_handler(req, res, db, baseUrl) {
  if (req.method !== 'DELETE') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa DELETE.' });
  }
  try {
    const params = parseQueryParams(req, baseUrl);
    const output = await revocarPermiso(
      (id) => revocarPermisoDB(db, id),
      params.id
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en revocarPermiso_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}

/**para GET /permisos/listar - Lista permisos de un rol. Ej: /permisos/listar?rol_id=1 */

export async function listarPermisosPorRol_handler(req, res, db, baseUrl) {
  if (req.method !== 'GET') {
    return responderJSON(res, 405, { status: false, message: 'Método no permitido. Usa GET.' });
  }
  try {
    const params = parseQueryParams(req, baseUrl);
    const output = await listarPermisosPorRol(
      (rol_id) => listarPermisosPorRolDB(db, rol_id),
      params.rol_id
    );
    responderJSON(res, output.status ? 200 : 400, output);
  } catch (err) {
    console.error('Error en listarPermisosPorRol_handler:', err);
    responderJSON(res, 500, { status: false, message: 'Error procesando la solicitud.' });
  }
}
