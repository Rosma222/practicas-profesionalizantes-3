// importamos módulos de Node.js
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Importamos módulos internos
import { initDatabase } from './db.mjs';
import { register_handler, login_handler } from './handlers.mjs';

// ==================================================================
// CARGA DE CONFIGURACIÓN 

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../config.json');
const config = Object.freeze(JSON.parse(readFileSync(configPath, 'utf-8')));

console.log(`Configuración cargada: ${config.server.ip}:${config.server.port}`);

// ===================================================================
// INICIALIZACIÓN ASÍNCRONA DEL SERVIDOR

async function boot() { // boot arranca todo, es async p/poder usar await en la inicialización de la BD y otras tareas async 
  try {
    // Iniciar base de datos
    const db = await initDatabase(config.database.path);
    console.log('Base de datos lista');

    // ===============================================================
    //ROUTER (Mapa de rutas -> handlers)

    const router = new Map();

    // Ruta raíz: sirve el HTML principal
    router.set('/', (req, res) => {
      try {
        // ruta absoluta al HTML
        const htmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '../', config.server.default_path);
        const html = readFileSync(htmlPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        console.error(' Error cargando HTML:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error interno: No se pudo cargar la vista.');
      }
    });

    // Ruta /register: delega al handler que procesa POST
    router.set('/register', (req, res) => register_handler(req, res, db));

    // Ruta /login: delega al handler que procesa POST
    router.set('/login', (req, res) => login_handler(req, res, db));

    // ========================================================================
    // DESPACHADOR (recibe todas las peticiones)
    
    const dispatcher = async (req, res) => {
      const url = new URL(req.url, `http://${config.server.ip}:${config.server.port}`);
      const handler = router.get(url.pathname);

      if (handler) {
        return handler(req, res);
      }

      // Ruta no encontrada
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Ruta no encontrada');
    };

    // ========================================================================
    //  CREAR Y LEVANTAR SERVIDOR HTTP
    
    const server = createServer(dispatcher);
    server.listen(config.server.port, config.server.ip, () => {
      console.log(`Servidor escuchando en http://${config.server.ip}:${config.server.port}`);
    });

  } catch (err) {
    console.error('Error crítico al iniciar el servidor:', err.message);
    process.exit(1);
  }
}

boot();  // Arrancamos todo