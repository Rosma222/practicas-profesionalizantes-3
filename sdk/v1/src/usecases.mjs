/**
 * CASO DE USO: Registro de usuario.
 * (No sabe nada de HTTP, ni de BD, ni de servidores.
 * solo recibe datos, aplica reglas y delega la persistencia)*/

export async function registerUser(insertUserFn, username, password) {
  // Validación 
  if (!username || !password) {
    return { status: false, message: 'Usuario y contraseña son obligatorios.' };
  }

  // Ejecución (la función insertUserFn se inyecta para mantenerlo puro)
  try {
    const result = await insertUserFn(username, password);
    console.log(`Usuario registrado: ${username}, ID: ${result}`);
    return { status: true, message: 'Usuario registrado correctamente.', data: result };
  } catch (err) {
    // Manejo de errores de BD
    if (err.message.includes('UNIQUE constraint')) {
      return { status: false, message: 'El nombre de usuario ya existe.' };
    }
    return { status: false, message: 'Error interno al registrar.' };
  }
}

/**
 * CASO DE USO: Login de usuario */
export async function loginUser(findUserFn, username, password) {
  // Validación 
  if (!username || !password) {
    return { status: false, message: 'Usuario y contraseña son obligatorios.' };
  }

  // Ejecución
  try {
    const user = await findUserFn(username, password);
    if (user) {
      console.log(`Usuario logueado: ${username}, ID: ${user.id}`);
      return { status: true, message: 'Login exitoso.', data: user };
    } else {
      return { status: false, message: 'Usuario o contraseña incorrectos.' };
    }
  } catch (err) {
    return { status: false, message: 'Error interno al loguear.' };
  }
}