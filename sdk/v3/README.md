# V.3 : Refactory del codigo dado en clase sdk v.2

### Es un servidor web que funciona como un **sistema de login y permisos**. Solo permite que usuarios autorizados accedan a ciertas funciones del sistema.

29/05/2026
- cambios: 
1. Router: ahora se guarda un objeto c/2 campos
```js
// Antes
router.set('/log', log_handler);

// Ahora
router.set('/log', { handler: log_handler, protected: true }); 
```
2. Dispatcher: eliminé ´endpointsProtegidos` y ahora se usa una todo en una consulta al route
``` js
// Antes
const handler = router.get(path);
if (endpointsProtegidos.includes(path)) { ... }
return handler(request, response);

// Ahora
const route = router.get(path);
if (route.protected) { ... }
return route.handler(request, response);
```
Asi si tengo que agregar otro endpoint protegido lo hago desde aca:
```js
router.set('/nuevoEndpointProtected', { handler: nuevoEndpointProtected_handler, protected: true });
```


## Archivos 

| Archivo | Propósito |
|---------|-----------|
| `main.mjs` | Código principal del servidor |
| `config.json` | Configuración (IP, puerto, rutas) |
| `default.html` | Interfaz gráfica  |
| `db.sqlite` | Base de datos con usuarios y permisos |


### 1. **Servidor Web** (Node.js)
- Corre en `http://127.0.0.1:3000`
- Recibe solicitudes del navegador
- Tiene una interfaz gráfica (archivo `default.html`)

### 2. **Base de Datos** (`db.sqlite`)
- Guarda la información de:
  - **Usuarios**: nombre y contraseña
  - **Grupos**: categorías de usuarios (ej: "Admin", "Usuario común")
  - **Permisos**: qué puede hacer cada grupo
  - **Endpoints**: las acciones disponibles (ej: `/print`, `/log`, `/help`, `/sayHello`, `/sayBye`)

### 3. **Sesiones en Memoria**
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

*  `/` 
*  `/register` | Crear nuevo usuario 
*  `/login` | Iniciar sesión 
*  `/logout` | Cerrar sesión 
*  `/print` | Ejecutar print 
*  `/log` | Ejecutar  log 
*  `/help` | Ejecutar ayuda 
*  `/sayHello` | Ejecutar sayHello
*  `/sayBye` | Ejjecutar sayGoobye
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


