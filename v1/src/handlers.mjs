import { registerUser, loginUser } from './usecases.mjs';
import { insertUser, findUserByUsernameAndPassword } from './db.mjs';

/**
 * Funcion p/leer una petición POST .
 * Node no parsea el body automáticamente, hay que escuchar los chunks.
 */
function parsePostBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString()); //chunk es un Buffer, lo convertimos a string y acumulamos
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(body))));
    req.on('error', reject);
  });
}

/**
 * Funcion Handler para /register
 * Solo acepta POST -Parsea el cuerpo -Llama al caso de uso -Responde JSON
 */
export async function register_handler(req, res, db) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: false, message: 'Método no permitido. Usa POST.' }));
  }

  try {
    // Extraer datos del formulario
    const formData = await parsePostBody(req);

    // Llamar a lógica de negocio (inyecta la función de BD para mantener separación)
    const output = await registerUser((u, p) => insertUser(db, u, p), formData.username, formData.password);

    // Responder al cliente
    res.writeHead(output.status ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(output));
  } catch (error) {
    console.error('Error en register_handler:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: false, message: 'Error procesando la solicitud.' }));
  }
}

/**
 * Funcion Handler para /login
 */
export async function login_handler(req, res, db) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: false, message: 'Método no permitido. Usa POST.' }));
  }

  try {
    // Extraer datos del formulario
    const formData = await parsePostBody(req);

    // Llamar a lógica de negocio
    const output = await loginUser((u, p) => findUserByUsernameAndPassword(db, u, p), formData.username, formData.password);

    // Responder al cliente
    res.writeHead(output.status ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(output));
  } catch (error) {
    console.error('Error en login_handler:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: false, message: 'Error procesando la solicitud.' }));
  }
}