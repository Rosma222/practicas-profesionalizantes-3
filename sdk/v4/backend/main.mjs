import { createServer } from 'node:http';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto'; // P/hashear contraseñas, modulo nativo de node en lugar de `crypto.subtle`


// CONFIGURACIÓN
function default_config(){
    return {
        server: {
            ip: '127.0.0.1', port: 3000,default_path: './default.html'
          },         
        database: {
            path: './db.sqlite'
        }
    };
}

function load_config(){
    try    {
        const data = readFileSync('./config.json', 'utf-8');
        console.log('Configuración cargada correctamente.');
        return JSON.parse(data);
    }
    catch (error)  {
        console.error('Error cargando config.json. Usando valores por defecto.');
        return default_config();
    }
}

const config = load_config();

// CONEXIÓN A BASE DE DATOS
function connect_db(path){
    return new DatabaseSync(resolve(path));
}
const db = connect_db(config.database.path);


// HASH SHA-256 - Cifrado irreversible: imposible recuperar el original
// Se usa al registrar y al autenticar: compara hash con hash.
function hashSHA256(cadena){
    return createHash('sha256').update(cadena).digest('hex');
}


// SESIONES EN MEMORIA || El Map almacena:  username -> objeto UserSession
const sesiones = new Map();
const sessionTokens = new Map(); // token -> username

// Clase de sesión: para manejar estados de sesión
class UserSession {
    constructor() {
        this.status = 'disabled';
        this.token = null;
    }
}

//funcion p/ generar un token de sesión único combinando el nombre de usuario, la marca de tiempo actual 
//y un valor aleatorio, todo hasheado con SHA-256 
function generateSessionToken(username){
    const random = randomBytes(16).toString('hex');
    return hashSHA256(`${username}:${Date.now()}:${random}`);
}


// PARSEADOR DE BODY - Acepta SOLO JSON
async function parseBody(request) {
    return new Promise(function(resolve, reject) {
        let body = '';

        request.on('data', function(chunk){
            body += chunk.toString();
        });
        request.on('end', function() {
            try {
                // Forzar JSON: si viene vacío, devolvemos {} para facilitar handlers
                const parsed = body && body.length ? JSON.parse(body) : {};
                resolve(parsed);
            }
            catch(error){
                reject(new Error('Invalid JSON'));
            }
        });
        request.on('error', reject);
    });
}

// Helper para respuestas de error según la especificaciones
function sendError(response, code, exception, details){
    response.writeHead(code, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ exception: exception, detail: Array.isArray(details) ? details : [details] }));
}

// AUTENTICACIÓN: Verifica si existe el usuario en la base de datos.
function authenticate(username, password){
    const sql = `
        SELECT COUNT(*) as total
        FROM user
        WHERE username = ?
        AND key = ?
    `;

    try{
        const stmt = db.prepare(sql);
        const hashedPassword = hashSHA256(password);// La contraseña recibida se hashea antes de comparar,
        const resultado = stmt.get(username, hashedPassword);  //en la BD ahora se almacena el hash,nunca el texto plano
        return resultado.total === 1;
    }
    catch(error){
        return false;
    }
}


// AUTORIZACIÓN: Verifica si el usuario tiene permiso para acceder al endpoint
// user -> members -> access -> endpoint
function comprobar_permiso_real(username, path){
    const query = `
        SELECT COUNT(*) as total
        FROM user
        JOIN members  ON user.id = members.id_user
        JOIN access   ON members.id_group = access.id_group
        JOIN endpoint ON access.id_endpoint = endpoint.id
        WHERE user.username = ?
        AND endpoint.path = ?
    `;

    const stmt = db.prepare(query);
    const resultado = stmt.get(username, path);
    return resultado.total > 0; // Si el conteo es mayor a 0, el usuario tiene permiso.
}

function createUser(username, password)
{
    const hashedPassword = hashSHA256(password);

    const stmtUser = db.prepare( 'INSERT INTO user (username, key) VALUES (?, ?)');
    const resultadoUser = stmtUser.run(username, hashedPassword);
    const nuevoUserId = resultadoUser.lastInsertRowid;

    const stmtMember = db.prepare( 'INSERT INTO members (id_user, id_group) VALUES (?, 1)' );
    stmtMember.run(nuevoUserId);

    return { 
       ok: true,  message: 'Usuario registrado exitosamente en el Grupo 1.'
    };
}

function login(username, password) {
    const isAuthenticated = authenticate(username, password);

    if (!isAuthenticated){
        return null;
    }

    let currentSession = sesiones.get(username);
    if (currentSession == null){
        currentSession = new UserSession();
        sesiones.set(username, currentSession);
    }

    if (currentSession.token){
        sessionTokens.delete(currentSession.token);
    }

    currentSession.status = 'enabled';
    currentSession.token = generateSessionToken(username);
    sessionTokens.set(currentSession.token, username);

    return currentSession;
}

function logout(username){
    const currentSession = sesiones.get(username);
    if (currentSession) {
        if (currentSession.token){
            sessionTokens.delete(currentSession.token);
            currentSession.token = null;
        }
        currentSession.status = 'disabled';
    }
    return true;
}

// REGISTER HANDLER
async function register_handler(request, response){
    if (request.method !== 'POST'){
        sendError(response,400,'InvalidRequest','Método no permitido. Use POST.');
        return;
    }

    try {
        const body = request._body || await parseBody(request);
        if (!body || !body.username || !body.password){
            sendError(response,400,'InvalidRequest',['Faltan campos username o password']);
            return;
        }

        const resultado = createUser(body.username, body.password);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(resultado));
    }
    catch (error) {
        // Error del dominio (usuario ya existe, constraints, etc.) -> 422
        sendError(response,422,'DomainError', error.message || 'El usuario ya existe o hubo un error.');
    }
}

// LOGIN HANDLER
async function login_handler(request, response){
    if (request.method !== 'POST') {
        sendError(response,400,'InvalidRequest','Método no permitido. Use POST.');
        return;
    }

    try{
        const body = request._body || await parseBody(request);
        if (!body || !body.username || !body.password){
            sendError(response,400,'InvalidRequest',['Faltan campos username o password']);
            return;
        }

        const session = login(body.username, body.password);
        if (session){
            response.writeHead(200, {'Content-Type': 'application/json' });
            response.end(JSON.stringify({ok: true, message: 'Login exitoso.', token: session.token }));
        }
        else{
            sendError(response,401,'AccessDenied','Credenciales incorrectas.');
        }
    }
    catch (error) {
        sendError(response,400,'InvalidRequest', error.message || 'Error en el login.');
    }
}

// LOGOUT HANDLER
async function logout_handler(request, response){
    if (request.method !== 'POST'){
        sendError(response,400,'InvalidRequest','Método no permitido. Use POST.');
        return;
    }

    try{
        const username = request.username || (request._body && request._body.username);
        if (!username){
            sendError(response,401,'AccessDenied','Falta username.');
            return;
        }

        logout(username);

        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ ok: true, message: 'Sesión deshabilitada.' }));
    }
    catch(error){
        sendError(response,400,'InvalidRequest', error.message || 'Error al cerrar sesión.');
    }
}

// HANDLERS DE ACCIONES PROTEGIDAS
function print_handler(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({message: 'Acción ejecutada: /print de forma satisfactoria.'}));    
}

function log_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify({message: 'Acción ejecutada: /log de forma satisfactoria.' }));
}

function help_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify({ message: 'Acción ejecutada: /help de forma satisfactoria.'}));
}

function sayHello_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify({ message: 'Acción ejecutada: /sayHello de forma satisfactoria.'}));
}

function sayBye_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify({ message: 'Acción ejecutada: /sayBye de forma satisfactoria.' }));
}

// ROUTER
// public:      true  -> no requiere token ni sesión activa
//              false -> requiere token válido y sesión habilitada
// authRequired:true  -> además consulta comprobar_permiso_real() en la BD
//              false -> solo requiere sesión activa, sin verificar permisos
const router = new Map();

router.set('/Register', { handler: register_handler, public: true,  authRequired: false });
router.set('/Login',    { handler: login_handler,    public: true,  authRequired: false });
router.set('/Logout',   { handler: logout_handler,   public: false, authRequired: false });
router.set('/Print',    { handler: print_handler,    public: false, authRequired: true  });
router.set('/Log',      { handler: log_handler,      public: false, authRequired: true  });
router.set('/Help',     { handler: help_handler,     public: false, authRequired: true  });
router.set('/SayHello', { handler: sayHello_handler, public: false, authRequired: true  });
router.set('/SayBye',   { handler: sayBye_handler,   public: false, authRequired: true  });

// DESPACHADOR: Middleware del autorizador 
async function request_dispatcher(request, response){
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers','Content-Type, x-username, Authorization');
    // Cabecera de versión 
    response.setHeader('X-API-Version','4.2');

    if (request.method === 'OPTIONS'){
        response.writeHead(200); response.end();
        return;
    }

    const url = new URL( request.url,'http://' + config.server.ip);
    const path  = url.pathname;
    const route = router.get(path);

    if (!route){
        sendError(response,400,'InvalidRequest','Ruta no encontrada.');
        return;
    }

    // Si la ruta no es pública, verificar token y sesión activa
    if (!route.public){
        if (request.method !== 'POST'){
            sendError(response,400,'InvalidRequest','Método no válido. Use POST.');
            return;
        }

        try{
            // parseBody puede lanzar si no viene JSON válido
            const body = await parseBody(request);
            request._body = body; // lo guardamos 
        }
        catch(error){
            sendError(response,400,'InvalidJSON','El cuerpo debe ser JSON válido.');
            return;
        }

        // Verificar token Bearer en Authorization
        const authHeader = request.headers['authorization'];
        const [scheme, token] = authHeader && typeof authHeader === 'string' //Si authHeader existe y es string, 
            ? authHeader.trim().split(' ')       //lo divide en esquema y token; si les asigna undefined
            : [];
        // Si el esquema no es Bearer o falta el token, denegamos el acceso
        if (!scheme || scheme.toLowerCase() !== 'bearer' || !token){ 
            sendError(response,401,'AccessDenied','Falta autorización. Usa Authorization: Bearer <token>.');
            return;
        }

        const username = sessionTokens.get(token);
        if (!username){
            sendError(response,401,'AccessDenied','Token inválido o sesión no iniciada.');
            return;
        }

        const currentSession = sesiones.get(username);
        if (!currentSession){
            sendError(response,401,'AccessDenied','Tenés que iniciar sesión.');
            return;
        }

        if (currentSession.status !== 'enabled'){
            sendError(response,401,'AccessDenied','La sesión está deshabilitada.');
            return;
        }

        request.username = username;

        // Si además requiere permiso, consultar la BD
        if (route.authRequired){
            const autorizado = comprobar_permiso_real(username, path);
            if (!autorizado){
                sendError(response,401,'AccessDenied',`El usuario '${username}' no está autorizado para acceder a ${path}.`);
                return;
            }
        }
    }

    // Llamar al handler 
    try{
        await route.handler(request, response);
    }
    catch(error){
        // Error interno
        sendError(response,500,'ServerError', error.message || 'Error interno.');
    }
}


// LEVANTAR SERVIDOR
function start() {
    console.log( `Servidor escuchando en http://${config.server.ip}:${config.server.port}`);
}

const server = createServer(request_dispatcher);

server.listen (config.server.port, config.server.ip,start);
