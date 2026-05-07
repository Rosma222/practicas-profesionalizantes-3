## Lo que hay que agregar a V1 (sdk/v2)
El módulo de autenticación y permisos completo requiere:
1. Nuevas tablas en la BD
La tabla user actual necesita un campo rol_id, y hay que crear las tablas rol y permiso.
2. Funcionalidades ABM a implementar

```txt
Área            Función              Tipo    
Usuarios       crearUsuario          Alta 
               eliminarUsuario       Baja
               modificarUsuario      Modificación
               listarUsuarios        Consulta
               buscarUsuarioPorId    Consulta
Roles          crearRol              Alta
               eliminarRol           Baja
               listarRoles           Consulta
Permisos       asignarPermiso        Alta
              revocarPermiso         Baja
              listarPermisosPorRol  Consulta
Auth          registrarUsuario      (ya estaba en v1)
              iniciarSesion         (ya estaba en v1)
```

# Archivos de v2
## db.mjs 
v2 va a tener 3 tablas relacionadas y una función por cada operación posible

## usecase.mjs
Capa de lógica de negocio. Ahí van las validaciones y las reglas: por ej, que no se pueda eliminar el rol admin, o que el username tenga longitud mínima.

## handlers.mjs
Capa que recibe la petición HTTP, llama al caso de uso correspondiente y devuelve la respuesta.
v2 va a tener operaciones como "listar usuarios" o "buscar por id" que no envían formulario — usan métodos HTTP:
Método   |   Para qué se usa
* ```POST```       Crear / Alta
* ```DELETE```      Eliminar / Baja
* ```PUT```        Modificar
- ```GET```         Consultar / Listar
Cada handler sigue 3 pasos:
1. Verificar que el método HTTP sea el correcto
2. Obtener los datos (del body si es POST/PUT, de la URL si es GET/DELETE)
3. Llamar al caso de uso e devolver el resultado como JSON

## server.mjs
Tiene el mapa de rutas.
```txt
 → /
 → /register
 → /login
 → /usuarios/crear
 → /usuarios/eliminar
  ...
```
## default.html
Es la interfaz tiene secciones separadas por área (Autenticación, Usuarios, Roles, Permisos) y va a mostrar las respuestas del servidor en pantalla sin recargar la página, usando ```fetch()```.

## seed.mjs
Es un archivo de queries de insersion masiva, va a poblar la base de datos con datos de prueba.

# EJECUCIÓN
```txt
# 1. Ir a la carpeta
cd v2

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor (se crean las tablas)
node src/server.mjs

# 4. Parar el servidor (Ctrl+C)

# 5. Poblar la base de datos (con las queries masivas de seed.mjs)
node src/seed.mjs

# 6. Levantar el servidor de nuevo
node src/server.mjs

# 7. Abrir en el navegador
# http://127.0.0.1:3000
```
