// CASO DE USO: AUTENTICACIÓN - Registrar un usuario nuevo.

/** Recibe las funciones de BD inyectadas para no depender de ella directamente.
 rol_id = 2 por defecto (rol "usuario"), solo un admin puede asignar otro rol. */

export async function registrarUsuario(insertarUsuarioFn, username, password) {
  // Validación: campos obligatorios
  if (!username || !password) {
    return { status: false, message: 'Usuario y contraseña son obligatorios.' };
  }

  // Validación de longitud mínima
  if (username.length < 3) {
    return { status: false, message: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (password.length < 6) {
    return { status: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    // Todo usuario nuevo recibe el rol_id = 2 (usuario)
    const result = await insertarUsuarioFn(username, password, 2);
    return { status: true, message: 'Usuario registrado correctamente.', data: { id: result.lastID, username } };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return { status: false, message: 'El nombre de usuario ya existe.' };
    }
    return { status: false, message: 'Error interno al registrar.' };
  }
}

/** CASO DE USO: Iniciar sesión. */

export async function iniciarSesion(buscarUsuarioFn, username, password) {
  // Validación de campos obligatorios
  if (!username || !password) {
    return { status: false, message: 'Usuario y contraseña son obligatorios.' };
  }

  try {
    const usuario = await buscarUsuarioFn(username, password);
    if (usuario) {
      return { status: true, message: 'Login exitoso.', data: usuario };
    } else {
      return { status: false, message: 'Usuario o contraseña incorrectos.' };
    }
  } catch (err) {
    return { status: false, message: 'Error interno al iniciar sesión.' };
  }
}



// CASOS DE USO de GESTIÓN DE USUARIOS

/**Crear un usuario (con rol elegido) permite asignar cualquier rol. */
export async function crearUsuario(insertarUsuarioFn, username, password, rol_id) {
  // Validación: campos obligatorios
  if (!username || !password || !rol_id) {
    return { status: false, message: 'Usuario, contraseña y rol son obligatorios.' };
  }

  if (username.length < 3) {
    return { status: false, message: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (password.length < 6) {
    return { status: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    const result = await insertarUsuarioFn(username, password, rol_id);
    return { status: true, message: 'Usuario creado correctamente.', data: { id: result.lastID, username } };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return { status: false, message: 'El nombre de usuario ya existe.' };
    }
    if (err.message.includes('FOREIGN KEY constraint')) {
      return { status: false, message: 'El rol especificado no existe.' };
    }
    return { status: false, message: 'Error interno al crear usuario.' };
  }
}

/** Eliminar usuario. */

export async function eliminarUsuario(eliminarUsuarioFn, id) {
  // Validación: el id es obligatorio
  if (!id) {
    return { status: false, message: 'El id del usuario es obligatorio.' };
  }

  try {
    const result = await eliminarUsuarioFn(id);
    if (result.changes === 0) {         // result.changes indica cuántas filas fueron afectadas
      return { status: false, message: 'No se encontró un usuario con ese id.' };
    }
    return { status: true, message: 'Usuario eliminado correctamente.' };
  } catch (err) {
    return { status: false, message: 'Error interno al eliminar usuario.' };
  }
}

/**Modificar un usuario */

export async function modificarUsuario(modificarUsuarioFn, id, username, password, rol_id) {
  // Validación: todos los campos son obligatorios
  if (!id || !username || !password || !rol_id) {
    return { status: false, message: 'Todos los campos son obligatorios para modificar.' };
  }

  if (username.length < 3) {
    return { status: false, message: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (password.length < 6) {
    return { status: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    const result = await modificarUsuarioFn(id, username, password, rol_id);
    if (result.changes === 0) {
      return { status: false, message: 'No se encontró un usuario con ese id.' };
    }
    return { status: true, message: 'Usuario modificado correctamente.' };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return { status: false, message: 'El nombre de usuario ya existe.' };
    }
    if (err.message.includes('FOREIGN KEY constraint')) {
      return { status: false, message: 'El rol especificado no existe.' };
    }
    return { status: false, message: 'Error interno al modificar usuario.' };
  }
}

/**Listar los usuarios */
export async function listarUsuarios(listarUsuariosFn) {
  try {
    const usuarios = await listarUsuariosFn();
    return { status: true, message: 'Usuarios obtenidos correctamente.', data: usuarios };
  } catch (err) {
    return { status: false, message: 'Error interno al listar usuarios.' };
  }
}

/** Buscar usuario x id */

export async function buscarUsuarioPorId(buscarUsuarioFn, id) {
  if (!id) {
    return { status: false, message: 'El id es obligatorio.' };
  }

  try {
    const usuario = await buscarUsuarioFn(id);
    if (!usuario) {
      return { status: false, message: 'No se encontró un usuario con ese id.' };
    }
    return { status: true, message: 'Usuario encontrado.', data: usuario };
  } catch (err) {
    return { status: false, message: 'Error interno al buscar usuario.' };
  }
}



// CASOS DE USO de GESTIÓN DE ROLES

/**Crear rol */

export async function crearRol(insertarRolFn, nombre) {
  if (!nombre) {
    return { status: false, message: 'El nombre del rol es obligatorio.' };
  }

  try {
    const result = await insertarRolFn(nombre);
    return { status: true, message: 'Rol creado correctamente.', data: { id: result.lastID, nombre } };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return { status: false, message: 'Ya existe un rol con ese nombre.' };
    }
    return { status: false, message: 'Error interno al crear rol.' };
  }
}

/**Eliminar rol - (*no se pueden eliminar roles admin y usuario) */

export async function eliminarRol(eliminarRolFn, id, nombre) {
  if (!id) {
    return { status: false, message: 'El id del rol es obligatorio.' };
  }

  if (nombre === 'admin' || nombre === 'usuario') {
    return { status: false, message: 'No se pueden eliminar los roles base del sistema.' };
  }

  try {
    const result = await eliminarRolFn(id);
    if (result.changes === 0) {
      return { status: false, message: 'No se encontró un rol con ese id.' };
    }
    return { status: true, message: 'Rol eliminado correctamente.' };
  } catch (err) {
    if (err.message.includes('FOREIGN KEY constraint')) {
      return { status: false, message: 'No se puede eliminar un rol que tiene usuarios asignados.' };
    }
    return { status: false, message: 'Error interno al eliminar rol.' };
  }
}

/**Listar todos los roles */

export async function listarRoles(listarRolesFn) {
  try {
    const roles = await listarRolesFn();
    return { status: true, message: 'Roles obtenidos correctamente.', data: roles };
  } catch (err) {
    return { status: false, message: 'Error interno al listar roles.' };
  }
}


// CASOS DE USO GESTIÓN DE PERMISOS

/**Asignar un permiso a un rol*/

export async function asignarPermiso(asignarPermisoFn, rol_id, accion) {
  if (!rol_id || !accion) {
    return { status: false, message: 'El rol y la acción son obligatorios.' };
  }

  try {
    const result = await asignarPermisoFn(rol_id, accion);
    return { status: true, message: 'Permiso asignado correctamente.', data: { id: result.lastID, rol_id, accion } };
  } catch (err) {
    if (err.message.includes('FOREIGN KEY constraint')) {
      return { status: false, message: 'El rol especificado no existe.' };
    }
    return { status: false, message: 'Error interno al asignar permiso.' };
  }
}

/** Eliminar un permiso por id. */
export async function revocarPermiso(revocarPermisoFn, id) {
  if (!id) {
    return { status: false, message: 'El id del permiso es obligatorio.' };
  }

  try {
    const result = await revocarPermisoFn(id);
    if (result.changes === 0) {
      return { status: false, message: 'No se encontró un permiso con ese id.' };
    }
    return { status: true, message: 'Permiso revocado correctamente.' };
  } catch (err) {
    return { status: false, message: 'Error interno al revocar permiso.' };
  }
}

/**Listar permisos. */
export async function listarPermisosPorRol(listarPermisosFn, rol_id) {
  if (!rol_id) {
    return { status: false, message: 'El id del rol es obligatorio.' };
  }

  try {
    const permisos = await listarPermisosFn(rol_id);
    return { status: true, message: 'Permisos obtenidos correctamente.', data: permisos };
  } catch (err) {
    return { status: false, message: 'Error interno al listar permisos.' };
  }
}
