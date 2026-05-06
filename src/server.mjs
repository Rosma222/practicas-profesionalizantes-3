// Módulos de Node.js
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Módulos internos
import { initDatabase } from './db.mjs';
import {
  register_handler,
  login_handler,
  crearUsuario_handler,
  eliminarUsuario_handler,
  modificarUsuario_handler,
  listarUsuarios_handler,
  buscarUsuarioPorId_handler,
  crearRol_handler,
  eliminarRol_handler,
  listarRoles_handler,
  asignarPermiso_handler,
  revocarPermiso_handler,
  listarPermisosPorRol_handler
} from './handlers.mjs';


// CARGA CONFIGURACIÓN
const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../config.json');
const config = Object.freeze(JSON.parse(readFileSync(configPath, 'utf-8')));

console.log(`Configuración cargada: ${config.server.ip}:${config.server.port}`);


// ARRANQUE DEL SERVIDOR
async function boot() {
  try {
    // Iniciar base de datos (crea tablas si no existen)
    const db = await initDatabase(config.database.path);
    console.log('Base de datos lista');

    // URL base del servidor — la necesitan los handlers que leen query params
    const baseUrl = `http://${config.server.ip}:${config.server.port}`;

    
    // ROUTER
    // Cada entrada del Map relaciona una ruta con su handler.
    // router.set('/ruta', (req, res) => handler(req, res, db))

    const router = new Map();

    // Ruta raíz
    router.set('/', (req, res) => {
      try {
        const htmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '../', config.server.default_path);
        const html = readFileSync(htmlPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        console.error('Error cargando HTML:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error interno: No se pudo cargar la vista.');
      }
    });

    //  Autenticación
    router.set('/register',  (req, res) => register_handler(req, res, db));
    router.set('/login',     (req, res) => login_handler(req, res, db));

    // Usuarios 
    router.set('/usuarios/crear',    (req, res) => crearUsuario_handler(req, res, db));
    router.set('/usuarios/eliminar', (req, res) => eliminarUsuario_handler(req, res, db, baseUrl));
    router.set('/usuarios/modificar',(req, res) => modificarUsuario_handler(req, res, db));
    router.set('/usuarios/listar',   (req, res) => listarUsuarios_handler(req, res, db));
    router.set('/usuarios/buscar',   (req, res) => buscarUsuarioPorId_handler(req, res, db, baseUrl));

    //Roles 
    router.set('/roles/crear',    (req, res) => crearRol_handler(req, res, db));
    router.set('/roles/eliminar', (req, res) => eliminarRol_handler(req, res, db, baseUrl));
    router.set('/roles/listar',   (req, res) => listarRoles_handler(req, res, db));

    // Permisos 
    router.set('/permisos/asignar', (req, res) => asignarPermiso_handler(req, res, db));
    router.set('/permisos/revocar', (req, res) => revocarPermiso_handler(req, res, db, baseUrl));
    router.set('/permisos/listar',  (req, res) => listarPermisosPorRol_handler(req, res, db, baseUrl));

  
    // DESPACHADOR - Recibe TODAS las peticiones y las redirige al handler correcto.
    const dispatcher = async (req, res) => {
      const url = new URL(req.url, baseUrl);
      const handler = router.get(url.pathname);

      console.log(`[${req.method}] ${url.pathname}`); // Log de cada petición recibida

      if (handler) {
        return handler(req, res);
      }

      // Ruta no registrada en el router
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: false, message: '404 - Ruta no encontrada' }));
    };


    // CREAR Y LEVANTAR EL SERVIDOR HTTP
    
    const server = createServer(dispatcher);
    server.listen(config.server.port, config.server.ip, () => {
      console.log(`Servidor escuchando en ${baseUrl}`);
      console.log('Rutas disponibles:');
      for (const ruta of router.keys()) {
        console.log(`  → ${ruta}`);
      }
    });

  } catch (err) {
    console.error('Error crítico al iniciar el servidor:', err.message);
    process.exit(1);
  }
}

boot();
