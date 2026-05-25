import { createServer } from 'node:http';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

// CONFIGURACIÓN
function default_config() {
    return {
        server:   { ip: '127.0.0.1', port: 3000, default_path: './default.html' },
        database: { path: './db.sqlite' }
    };
}

function load_config() {
    try {
        const data = readFileSync('./config.json', 'utf-8');
        return JSON.parse(data);
    } 
    catch {
        return default_config();
    }
}

const config = load_config(); // Carga la configuración desde config.json

// CONEXIÓN A BASE DE DATOS
let db = new DatabaseSync(resolve(config.database.path));

// MECANISMO DE SESIÓN EN MEMORIA (Punto 2)
// Guarda los usuarios logueados mientras el proceso de Node esté corriendo.
const sesiones = new Map();

// PARSEADOR DE BODY (lo que hace es convertir el body a objeto JSON u objeto de clave-valor si no es JSON)
function parseBody(request) {
    return new Promise(function(resolve, reject) {
        let body = '';
        request.on('data', function(chunk) { body += chunk.toString(); });
        request.on('end', function() {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve(Object.fromEntries(new URLSearchParams(body)));
            }
        });
        request.on('error', reject);
    });
}

// COMPONENTE AUTORIZADOR (Punto 1)
//  user -> members -> access -> endpoint
function comprobar_permiso_real(username, path) {
    const query = `
        SELECT COUNT(*) as total  
        FROM user 
        JOIN members  ON user.id = members.id_user  
        JOIN access   ON members.id_group = access.id_group
        JOIN endpoint  ON access.id_endpoint = endpoint.id
        WHERE user.username = ? AND endpoint.path = ?
    `;
    
    // Ejecuta la consulta con los parámetros del usuario y el endpoint solicitado
    const stmt = db.prepare(query);// stmt: obj q representa la consulta, con GET se ejecuta y obtiene el resultado
    const resultado = stmt.get(username, path);
    
    // Si da mayor a 0, significa que el usuario mediante su grupo tiene acceso a ese endpoint
    return resultado.total > 0;
}

// HANDLERS PÚBLICOS
function default_handler(request, response){
    try {
        const html = readFileSync(config.server.default_path, 'utf-8');
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(html);
    } 
    catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'No se pudo cargar la interfaz gráfica.' }));
    }
}

async function register_handler(request, response){
    try {
        const body = await parseBody(request);
        
        // 1. Inserta el usuario en la tabla 'user'
        const stmtUser = db.prepare('INSERT INTO user (username, password) VALUES (?, ?)');
        const resultadoUser = stmtUser.run(body.username, body.password);
        const nuevoUserId = resultadoUser.lastInsertRowid;

        // 2. Lo asocia al grupo con ID 1 en la tabla 'members'
        const stmtMember = db.prepare('INSERT INTO members (id_user, id_group) VALUES (?, 1)');
        stmtMember.run(nuevoUserId, 1);

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true, message: 'Usuario registrado exitosamente en el Grupo 1.' }));
    } 
    catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'El usuario ya existe o hubo un error.' }));
    }
}

async function login_handler(request, response){
    try {
        const body = await parseBody(request);
        
        // Busca en tabla 'user'
        const stmt = db.prepare('SELECT username FROM user WHERE username = ? AND password = ?');
        const usuario = stmt.get(body.username, body.password);

        if (usuario) {
            // Guarda el contexto del usuario en la sesión efímera
            sesiones.set(usuario.username, true);

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ ok: true }));
        } else {
            response.writeHead(400, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Credenciales incorrectas.' }));
        }
    } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Error en el login.' }));
    }
}

async function logout_handler(request, response){
    try {
        const body = await parseBody(request);
        if (body.username) {
            sesiones.delete(body.username); // Quitamos al usuario del contexto
        }
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
    } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Error al cerrar sesión.' }));
    }
}

// HANDLERS DE ACCIONES PROTEGIDAS
function print_handler(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Acción ejecutada: /print de forma satisfactoria.' }));
}

function log_handler(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Acción ejecutada: /log de forma satisfactoria.' }));
}

function help_handler(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Acción ejecutada: /help de forma satisfactoria.' }));
}

function sayHello_handler(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Acción ejecutada: /sayHello de forma satisfactoria.' }));
}

function sayBye_handler(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Acción ejecutada: /sayBye de forma satisfactoria.' }));
}

// ROUTER 
const router = new Map();

router.set('/',         default_handler);
router.set('/login',    login_handler);
router.set('/logout',   logout_handler);
router.set('/register', register_handler);

router.set('/print',    print_handler);
router.set('/log',      log_handler);
router.set('/help',     help_handler);
router.set('/sayHello', sayHello_handler);
router.set('/sayBye',   sayBye_handler);

// DESPACHADOR  (Middleware del Autorizador)
function request_dispatcher(request, response){
    response.setHeader('Access-Control-Allow-Origin', '*');//
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-username');

    const url  = new URL(request.url, 'http://' + config.server.ip);
    const path = url.pathname;
    
    const handler = router.get(path);

    if (!handler) {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Ruta no encontrada.' }));
        return;
    }

    const endpointsProtegidos = ['/print', '/log', '/help', '/sayHello', '/sayBye'];
    
    if (endpointsProtegidos.includes(path)) {
        
        if (request.method !== 'POST') {
            response.writeHead(405, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Método RPC no válido. Use POST.' }));
            return;
        }

        const username = request.headers['x-username'];

        // 1. Validar que exista sesión en el Map en memoria (Punto 2)
        if (!username || !sesiones.has(username)) {
            response.writeHead(401, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Acceso Denegado: Tenés que iniciar sesión.' }));
            return;
        }

        // 2. Invocar al componente Autorizador (Punto 1)
        const autorizado = comprobar_permiso_real(username, path);

        if (!autorizado) {
            // No tiene vinculada la ruta en la tabla 'access'. Mandamos mje al user.
            response.writeHead(403, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: `Aviso: El usuario '${username}' no está autorizado para acceder a ${path}.` }));
            return;
        }
    }

    return handler(request, response);
}

// LEVANTAR SERVIDOR
const server = createServer(request_dispatcher);
server.listen(config.server.port, config.server.ip, function() {
    console.log(`Servidor escuchando en http://${config.server.ip}:${config.server.port}`);
});
