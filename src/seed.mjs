/**SCRIPT DE INSERCIÓN MASIVA — p/ pruebas

 * Cómo usarlo:
 *   1. correr el servidor una vez para que las tablas ya existan en la base de datos.
 *   2. Desde la carpeta sdk/v2 ejecutar: node src/seed.mjs
 *   3. El script inserta roles, usuarios y permisos de prueba.
 *   4. Si se corre mas de 1 vez, los registros duplicados se ignorarán (INSERT OR IGNORE).*/
 
import sqlite3 from 'sqlite3';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Leemos la misma config.json que usa el servidor
const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const db = new sqlite3.Database(resolve(config.database.path));

// Función auxiliar para ejecutar una query y devolver Promesa
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function seed() {
  console.log('Iniciando inserción masiva...\n');

  // Activar foreign keys
  await run(`PRAGMA foreign_keys = ON`);

  
  // ROLES - agrega roles extra 
  // Los roles 'admin' y 'usuario' ya los inserta initDatabase.

  const rolesExtra = ['moderador', 'editor', 'soporte', 'auditor'];

  for (const nombre of rolesExtra) {
    await run(`INSERT OR IGNORE INTO rol (nombre) VALUES (?)`, [nombre]);
  }

  console.log(`✔ Roles insertados: admin, usuario, ${rolesExtra.join(', ')}`);


  // USUARIOS -  // 40 usuarios de prueba distribuidos entre los 6 roles.
  // contraseñas son texto plano solo para pruebas.

  const usuarios = [
    // Administradores (rol_id = 1)
    { username: 'admin_garcia',    password: 'pass001', rol_id: 1 },
    { username: 'admin_lopez',     password: 'pass002', rol_id: 1 },
    { username: 'admin_torres',    password: 'pass003', rol_id: 1 },
    { username: 'admin_perez',     password: 'pass004', rol_id: 1 },
    { username: 'admin_fernandez', password: 'pass005', rol_id: 1 },

    // Usuarios comunes (rol_id = 2)
    { username: 'juan_martinez',   password: 'pass006', rol_id: 2 },
    { username: 'maria_gomez',     password: 'pass007', rol_id: 2 },
    { username: 'carlos_ruiz',     password: 'pass008', rol_id: 2 },
    { username: 'ana_silva',       password: 'pass009', rol_id: 2 },
    { username: 'pedro_diaz',      password: 'pass010', rol_id: 2 },
    { username: 'lucia_moreno',    password: 'pass011', rol_id: 2 },
    { username: 'diego_vargas',    password: 'pass012', rol_id: 2 },
    { username: 'sofia_romero',    password: 'pass013', rol_id: 2 },
    { username: 'miguel_castro',   password: 'pass014', rol_id: 2 },
    { username: 'valentina_rios',  password: 'pass015', rol_id: 2 },
    { username: 'mateo_herrera',   password: 'pass016', rol_id: 2 },
    { username: 'camila_flores',   password: 'pass017', rol_id: 2 },
    { username: 'tomas_mendoza',   password: 'pass018', rol_id: 2 },
    { username: 'juliana_rojas',   password: 'pass019', rol_id: 2 },
    { username: 'nicolas_guerra',  password: 'pass020', rol_id: 2 },

    // Moderadores (rol_id = 3)
    { username: 'mod_blanco',      password: 'pass021', rol_id: 3 },
    { username: 'mod_navarro',     password: 'pass022', rol_id: 3 },
    { username: 'mod_iglesias',    password: 'pass023', rol_id: 3 },
    { username: 'mod_delgado',     password: 'pass024', rol_id: 3 },
    { username: 'mod_ramos',       password: 'pass025', rol_id: 3 },

    // Editores (rol_id = 4)
    { username: 'editor_soto',     password: 'pass026', rol_id: 4 },
    { username: 'editor_medina',   password: 'pass027', rol_id: 4 },
    { username: 'editor_aguilar',  password: 'pass028', rol_id: 4 },
    { username: 'editor_ortiz',    password: 'pass029', rol_id: 4 },
    { username: 'editor_molina',   password: 'pass030', rol_id: 4 },

    // Soporte (rol_id = 5)
    { username: 'soporte_vera',    password: 'pass031', rol_id: 5 },
    { username: 'soporte_nunez',   password: 'pass032', rol_id: 5 },
    { username: 'soporte_reyes',   password: 'pass033', rol_id: 5 },
    { username: 'soporte_pena',    password: 'pass034', rol_id: 5 },
    { username: 'soporte_santos',  password: 'pass035', rol_id: 5 },

    // Auditores (rol_id = 6)
    { username: 'auditor_campos',  password: 'pass036', rol_id: 6 },
    { username: 'auditor_vega',    password: 'pass037', rol_id: 6 },
    { username: 'auditor_cortez',  password: 'pass038', rol_id: 6 },
    { username: 'auditor_lara',    password: 'pass039', rol_id: 6 },
    { username: 'auditor_miranda', password: 'pass040', rol_id: 6 },
  ];

  let usuariosInsertados = 0;
  for (const u of usuarios) {
    await run(
      `INSERT OR IGNORE INTO usuario (username, password, rol_id) VALUES (?, ?, ?)`,
      [u.username, u.password, u.rol_id]
    );
    usuariosInsertados++;
  }

  console.log(`✔ ${usuariosInsertados} usuarios insertados`);


  // PERMISOS - Asigna acciones típicas a cada rol para probar consultas de permisos.
 
  const permisos = [
    // Permisos del admin (rol_id = 1) — acceso total
    { rol_id: 1, accion: 'crear_usuario' },
    { rol_id: 1, accion: 'eliminar_usuario' },
    { rol_id: 1, accion: 'modificar_usuario' },
    { rol_id: 1, accion: 'listar_usuarios' },
    { rol_id: 1, accion: 'crear_rol' },
    { rol_id: 1, accion: 'eliminar_rol' },
    { rol_id: 1, accion: 'asignar_permiso' },
    { rol_id: 1, accion: 'revocar_permiso' },
    { rol_id: 1, accion: 'ver_reportes' },
    { rol_id: 1, accion: 'ver_auditoria' },

    // Permisos del usuario común (rol_id = 2)
    { rol_id: 2, accion: 'ver_perfil' },
    { rol_id: 2, accion: 'editar_perfil' },

    // Permisos del moderador (rol_id = 3)
    { rol_id: 3, accion: 'ver_perfil' },
    { rol_id: 3, accion: 'listar_usuarios' },
    { rol_id: 3, accion: 'modificar_usuario' },

    // Permisos del editor (rol_id = 4)
    { rol_id: 4, accion: 'ver_perfil' },
    { rol_id: 4, accion: 'crear_contenido' },
    { rol_id: 4, accion: 'editar_contenido' },
    { rol_id: 4, accion: 'eliminar_contenido' },

    // Permisos de soporte (rol_id = 5)
    { rol_id: 5, accion: 'ver_perfil' },
    { rol_id: 5, accion: 'listar_usuarios' },
    { rol_id: 5, accion: 'ver_reportes' },

    // Permisos del auditor (rol_id = 6)
    { rol_id: 6, accion: 'ver_perfil' },
    { rol_id: 6, accion: 'listar_usuarios' },
    { rol_id: 6, accion: 'ver_reportes' },
    { rol_id: 6, accion: 'ver_auditoria' },
  ];

  let permisosInsertados = 0;
  for (const p of permisos) {
    await run(
      `INSERT INTO permiso (rol_id, accion) VALUES (?, ?)`,
      [p.rol_id, p.accion]
    );
    permisosInsertados++;
  }

  console.log(`✔ ${permisosInsertados} permisos insertados`);

  db.close();
  console.log('\nInserción masiva completada.');
  console.log('Queries de ejemplo:');
  console.log('');
  console.log('-- Todos los usuarios con su rol:');
  console.log('SELECT usuario.id, usuario.username, rol.nombre AS rol FROM usuario JOIN rol ON usuario.rol_id = rol.id;');
  console.log('');
  console.log('-- Usuarios de un rol específico (ej: moderador):');
  console.log("SELECT usuario.username FROM usuario JOIN rol ON usuario.rol_id = rol.id WHERE rol.nombre = 'moderador';");
  console.log('');
  console.log('-- Permisos del admin:');
  console.log("SELECT accion FROM permiso WHERE rol_id = 1;");
  console.log('');
  console.log('-- Cuántos usuarios tiene cada rol:');
  console.log('SELECT rol.nombre, COUNT(usuario.id) AS cantidad FROM rol LEFT JOIN usuario ON rol.id = usuario.rol_id GROUP BY rol.id;');
}

seed().catch(err => {
  console.error('Error durante la inserción:', err.message);
  db.close();
});
