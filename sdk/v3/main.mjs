import { createServer } from 'node:http';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto'; // P/hashear contraseñas, modulo nativo de node en lugar de `crypto.subtle`


// CONFIGURACIÓN
function default_config(){
    return {
        server: {
            ip: '127.0.0.1',
            port: 3000,
            default_path: './default.html'
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

// Clase de sesión: para manejar estados de sesión
class UserSession {
    constructor() {
        this.status = 'disabled';
    }
}


// PARSEADOR DE BODY - Soporta JSON y URL-encoded
function parseBody(request) {
    return new Promise(function(resolve, reject) {
        let body = '';

        request.on('data', function(chunk){
            body += chunk.toString();
        });
        request.on('end', function() {
            try {
                resolve(JSON.parse(body));
            }
            catch{
                resolve(Object.fromEntries(new URLSearchParams(body)));
            }
        });
        request.on('error', reject);
    });
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


// LÓGICA DE NEGOCIO

function createUser(username, password)
{
    // 1. Hashea la contraseña antes de persistirla. El 'password' (texto plano) ya no se usa.
    const hashedPassword = hashSHA256(password);

    // 2. Inserta usuario en tabla user con la contraseña hasheada en columna 'key'
    const stmtUser = db.prepare( 'INSERT INTO user (username, key) VALUES (?, ?)');

    const resultadoUser = stmtUser.run(username, hashedPassword);
    const nuevoUserId = resultadoUser.lastInsertRowid; // Obtiene el ID del nuevo usuario insertado

    // 2. Lo asocia automáticamente al grupo 1
    const stmtMember = db.prepare( 'INSERT INTO members (id_user, id_group) VALUES (?, 1)' );

    stmtMember.run(nuevoUserId);

    return {
        ok: true,
        message: 'Usuario registrado exitosamente en el Grupo 1.'
    };
}


// LOGIN: Maneja autenticación y sesiones.

function login(username, password) {
    const isAuthenticated = authenticate(username, password);

    if (!isAuthenticated){
        return null;
    }

    // Busca si ya existe una sesión previa
    let currentSession = sesiones.get(username);

    // Si nunca inició sesión, crea una nueva
    if (currentSession == null){
        currentSession = new UserSession();
        sesiones.set(username, currentSession);
    }

    // Habilita sesión
    currentSession.status = 'enabled';
    return currentSession;
}

// LOGOUT : la sesión permanece pero queda deshabilitada
function logout(username){
    const currentSession = sesiones.get(username);
    if (currentSession) {
        currentSession.status = 'disabled';
    }
    return true;
}


// HANDLERS PÚBLICOS: No requieren autenticación ni autorización

function default_handler(request, response) {
    try{ 
        const html = readFileSync(
            config.server.default_path,
            'utf-8'
        );

        response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        response.end(html);
    }
    catch{
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(
        {
            error: 'No se pudo cargar la interfaz gráfica.'
        }));
    }
}


// REGISTER HANDLER

async function register_handler(request, response){
       if (request.method !== 'POST'){
        response.writeHead(405,{ 'Content-Type': 'application/json'});
        response.end(JSON.stringify(
        {
            error: 'Método no permitido. Use POST.'
        }));
        return;
    }

    try {
        const body = await parseBody(request);
        const resultado = createUser(
            body.username,
            body.password
        );

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(resultado));
    }
    catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(
        {
            error: 'El usuario ya existe o hubo un error.'
        }));
    }
}


// LOGIN HANDLER

async function login_handler(request, response){
    if (request.method !== 'POST') {
        response.writeHead(405,{ 'Content-Type': 'application/json'});
        response.end(JSON.stringify(
        {
            error: 'Método no permitido. Use POST.'
        }));
        return;
    }

    try{
        const body = await parseBody(request);
        const session = login(
            body.username,
            body.password
        );

        if (session){
            response.writeHead(200, {'Content-Type': 'application/json' });
            response.end(JSON.stringify(
            {
                ok: true,
                message: 'Login exitoso.'
            }));
        }
        else{
            response.writeHead(401, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(
            {
                error: 'Credenciales incorrectas.'
            }));
        }
    }
    catch {
        response.writeHead(400,{ 'Content-Type': 'application/json'});
        response.end(JSON.stringify(
        {
            error: 'Error en el login.'
        }));
    }
}


// LOGOUT HANDLER

async function logout_handler(request, response){
    if (request.method !== 'POST'){
        response.writeHead(405, {'Content-Type': 'application/json' });
        response.end(JSON.stringify(
        {
            error: 'Método no permitido. Use POST.'
        }));

        return;
    }

    try {
        const body = await parseBody(request);
        //  logout NO elimina la sesión, la deshabilita.
        logout(body.username);

        response.writeHead(200,{'Content-Type': 'application/json'});
        response.end(JSON.stringify(
        {
            ok: true,
            message: 'Sesión deshabilitada.'
        }));
    }
    catch {
        response.writeHead(400,{ 'Content-Type': 'application/json' });
        response.end(JSON.stringify(
        {
            error: 'Error al cerrar sesión.'
        }));
    }
}

// HANDLERS DE ACCIONES PROTEGIDAS

function print_handler(request, response){
    response.writeHead(200, {'Content-Type': 'application/json'});

    response.end(JSON.stringify(
    {
        message: 'Acción ejecutada: /print de forma satisfactoria.'
    }));
}

function log_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify(
    {
        message: 'Acción ejecutada: /log de forma satisfactoria.'
    }));
}

function help_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify(
    {
        message: 'Acción ejecutada: /help de forma satisfactoria.'
    }));
}

function sayHello_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify(
    {
        message: 'Acción ejecutada: /sayHello de forma satisfactoria.'
    }));
}

function sayBye_handler(request, response){
    response.writeHead(200,{'Content-Type': 'application/json'});
    response.end(JSON.stringify(
    {
        message: 'Acción ejecutada: /sayBye de forma satisfactoria.'
    }));
}


//ROUTER: Mapea rutas a handlers... Cada entrada tiene dos campos:
//  handler – procesa la request
//  protected – true si el dispatcher debe verificar sesión y autorización antes dar control al handler
// Agregar un nuevo endpoint protegido requiere tocar este solo lugar

const router = new Map();

router.set('/',         { handler: default_handler,     protected: false });

router.set('/register', { handler: register_handler,    protected: false });
router.set('/login',    { handler: login_handler,        protected: false });
router.set('/logout',   { handler: logout_handler,       protected: false });

router.set('/print',    { handler: print_handler,        protected: true  });
router.set('/log',      { handler: log_handler,          protected: true  });
router.set('/help',     { handler: help_handler,         protected: true  });
router.set('/sayHello', { handler: sayHello_handler,     protected: true  });
router.set('/sayBye',   { handler: sayBye_handler,       protected: true  });


// DESPACHADOR: Middleware del autorizador

function request_dispatcher(request, response){
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers','Content-Type, x-username'); 

    const url = new URL(
        request.url,
        'http://' + config.server.ip
    );

    const path  = url.pathname;
    const route = router.get(path);  // ahora route es { handler, protected }

    if (!route){
        response.writeHead(404,{ 'Content-Type': 'application/json'});
        response.end(JSON.stringify(
        {
            error: 'Ruta no encontrada.'
        }));
        return;
    }

    // Si mañana agrego un nuevo endpoint, solo se toca el router.set() de arriba.
    if (route.protected){
        if (request.method !== 'POST'){
            response.writeHead(405,{'Content-Type': 'application/json'});
            response.end(JSON.stringify(
            {
                error: 'Método RPC no válido. Use POST.'
            }));

            return;
        }

        const username = request.headers['x-username']; 
     
        // VALIDACIÓN DE SESIÓN
        if (!username){
            response.writeHead(401,{'Content-Type': 'application/json'});
            response.end(JSON.stringify(
            {
                error: 'Acceso Denegado: Falta username.'
            }));

            return;
        }

        const currentSession = sesiones.get(username);

        // Verifica existencia de sesión
        if (!currentSession){
            response.writeHead(401,{'Content-Type': 'application/json'});
            response.end(JSON.stringify(
            {
                error: 'Acceso Denegado: Tenés que iniciar sesión.'
            }));

            return;
        }

        // Verifica estado habilitado
        if (currentSession.status !== 'enabled'){
            response.writeHead(401,{'Content-Type': 'application/json'});
            response.end(JSON.stringify(
            {
                error: 'La sesión está deshabilitada.'
            }));

            return;
        }

        // AUTORIZADOR: Verifica permisos en la base de datos
        const autorizado = comprobar_permiso_real(username, path);

        if (!autorizado){
            response.writeHead(403,{'Content-Type': 'application/json'});
            response.end(JSON.stringify(
            {
                error:
                `Aviso: El usuario '${username}' ` +
                `no está autorizado para acceder a ${path}.`
            }));

            return;
        }
    }

    return route.handler(request, response);  //  route.handler en lugar de handler
}


// LEVANTAR SERVIDOR
function start(){
    console.log(
        `Servidor escuchando en http://${config.server.ip}:${config.server.port}`
    );
}

const server = createServer(request_dispatcher);

server.listen(
    config.server.port,
    config.server.ip,
    start
);
