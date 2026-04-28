# TP n°1 - Framework de trabajo (Parte I)

Proyecto de primera aproximación a frameworks de trabajo.
En el mismo se trabajó sobre un código dado de un register user y se añadió para practicar un login user. 

## Adecuaciones pedidas:

* Config en config.json :
Se lee una sola vez con readFileSync, se congela con Object.freeze() y se usa en todo el sistema. Sin valores hardcodeados.

* register_handler con POST :
Usa un parser nativo (URLSearchParams + eventos data/end) para leer el cuerpo del formulario. Valida req.method === 'POST'.

* Inserción adecuada en BD :
Usa consultas parametrizadas ? (previene inyección SQL). Maneja errores de UNIQUE constraint y devuelve promesas.

* Modularización :
Separado en: db.mjs (datos), usecases.mjs (negocio), handlers.mjs (manejador web), server.mjs (infra/rutas). Ninguna capa conoce a la otra.

* Sin frameworks / HTML único :
HTML en un solo archivo con method="POST" añadido.

* Sin node_modules :
.gitignore incluido


# ESTRUCTURA

proyecto/
├── config.json              # Configuración 
├── package.json             # Dependencias mínimas + "type": "module" para usar import/export
├── .gitignore               # Excluye node_modules
├── public/
│   └── default.html         # Interfaz
└── src/
    ├── db.mjs               # Capa de acceso a datos (queries)
    ├── usecases.mjs         # Lógica de negocio (sin HTTP ni BD)
    ├── handlers.mjs         # Adaptador HTTP (POST, llama a usecases)
    └── server.mjs           # Infraestructura: router, config, arranque


## EJECUCIÓN
* npm install          # Instala solo sqlite3 
* node src/server.mjs  # Arranca el servidor

* Abrir en el navegador en puerto 3000 (http://127.0.0.1:3000)
* Completar el formulario, este se guarda en db.sqlite3 y responde JSON.
