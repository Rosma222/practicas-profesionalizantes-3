<<<<<<< HEAD
# V.4 : Refactory del codigo dado en clase sdk v.2

### Es un servidor web que funciona como un **sistema de login y permisos**. Solo permite que usuarios autorizados accedan a ciertas funciones del sistema.

Desacoplamiento frontend-backend:
- Separación de servidores configurados con puertos diferentes.
- se eliminó  "/" es como un método de la API 
- Incluir unas cabeceras HTTP 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS' en el manejador principal

Descoplamiento del autenticador y los mecanismos de sesión:
- Uso de cabeceras HTTP.
```js
function register_handler(request, response){
       if (request.method !== 'POST'){
        response.writeHead(405,{ 'Content-Type': 'application/json'});
        response.end(JSON.stringify({ error: 'Método no permitido. Use POST.' }));
        return;
```


------------------------------------------------------------------------------------------------
## Archivos 

| Archivo | Propósito |
|---------|-----------|
| `main.mjs` | Código principal del servidor |
| `config.json` | Configuración (IP, puerto, rutas) |
| `default.html` | Interfaz gráfica  |
| `db.sqlite` | Base de datos con usuarios y permisos |


### 1. **Servidor Backend** (Node.js)
- Corre en `http://127.0.0.1:3000`

### 2. **Servidor FrontEnd** (Apache)
- Corre en el puerto 8080
- Tiene una interfaz gráfica (archivo `default.html`)

### 3. **Base de Datos** (`db.sqlite`)
- Guarda la información de:
  - **Usuarios**: nombre y contraseña
  - **Grupos**: categorías de usuarios (ej: "Admin", "Usuario común")
  - **Permisos**: qué puede hacer cada grupo
  - **Endpoints**: las acciones disponibles (ej: `/print`, `/log`, `/help`, `/sayHello`, `/sayBye`)

### 4. **Sesiones en Memoria**
- Guarda qué usuarios están logueados MIENTRAS el servidor está corriendo
- Se pierde si reiniciamos el servidor (no es permanente)


## Flujo 

### **1: Registro de Usuario**
```
Usuario escribe nombre y contraseña 
  → Se guarda en la base de datos
  → Se asigna al Grupo 1(G) automáticamente
```

### **2: Login**
```
Usuario escribe nombre y contraseña
  → Verificamos que exista en la base de datos
  → Si es correcto, lo guardamos en memoria como "logueado"
  → Mostramos mensaje de éxito
```

### **3: Usar Funciones Protegidas**
```
Usuario presiona botón (ej: /print)
  → Se verifica que esté logueado 
  → Se verifica en la BD si su grupo tiene permiso para esa función
  → Si tiene permiso => función se ejecuta
  → Si NO tiene permiso => error "Acceso Denegado"
```

### **4: Logout**
```
Usuario presiona "Cerrar Sesión"
  → Se elimina de la memoria
```

---
## Endpoint /rutas

*  `/Register` | Crear nuevo usuario 
*  `/Login` | Iniciar sesión 
*  `/Logout` | Cerrar sesión 
*  `/Print` | Ejecutar print 
*  `/Log` | Ejecutar  log 
*  `/Help` | Ejecutar ayuda 
*  `/SayHello` | Ejecutar sayHello
*  `/SayBye` | Ejjecutar sayGoobye
---

## Permisos:

**Relaciones en la BD:**
```
Usuario -> (pertenece a) -> Grupo -> (tiene acceso a) -> Endpoint
```
**Ejemplo:**
- Usuario "X" pertenece al grupo "G"
- Grupo "G" tiene permiso para `/print`, `/log` y `/help`
- Usuario "X" SOLO puede usar `/print`, `/log` y `/help`
- Si intenta usar `/sayHello` o `/sayGoobye` dará Error porque no tiene permiso 



## Seguridad

1. **Autenticación** (verificar quién es): Verifica nombre y contraseña en la BD
   
2. **Sesión** (recordar que el usuario está logueado): Guarda el nombre del user en un Map en memoria

3. **Autorización** (verificar qué puede hacer c/user): Consulta la BD para ver si el grupo tiene permiso
   - Compara: usuario → grupo → permisos → endpoint

--------------------------------------------------------------------------------------------------------

## EJECUCIÓN

1. Correr el backend en Node:
* npm install
* node main.js
* Escuchando en `http://127.0.0.1:3000`

2. correr el Frontend en Apache:
* Mover el archivo default.html a carpeta www de UniformServer
* Iniciar Apache en puerto 8080 (con Unicontroller.exe)
* abrir en el navegador > Served Subdirectories > 1 - frontend > default.html


---------------------------------------------------------------------------------

# usuarios de prueba.

1. username: admin || pass: 1234 || Grupo: total
2. username: Max   || pass: 1212 || Grupo: oficina
3. username: Ros   || pass: 2222 || Grupo: saludador
4. username: UserX || pass: 4567 || Grupo: oficina
5. username: User2 || pass: 9999 || Grupo: saludador

- Grupo oficina endpoints: /Print
                        /Log
                        /Help
- Grupo saludador endpoints: /SayHello
                          /SayBye
- Grupo total endpoints: acceso a los 5                                                  
