import sqlite3 from 'sqlite3';
import { resolve } from 'node:path';

/**
 * Inicializa la conexión y crea las tablas si no existen.
 * primero rol, luego usuario, despues permiso
 * xq usuario depende de rol, y permiso de rol.
 */
export async function initDatabase(dbPath) {
  const absolutePath = resolve(dbPath);
  const db = new sqlite3.Database(absolutePath);

  // Activar las foreign keys cada vez que se abre la db.
  await runQuery(db, `PRAGMA foreign_keys = ON`);

  // Tabla rol debe crearse ANTES que usuario
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS rol (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre   TEXT UNIQUE NOT NULL
    )
  `);

  // Tabla usuario- referencia a rol mediante rol_id (FOREIGN KEY)
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS usuario (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol_id   INTEGER NOT NULL,
      FOREIGN KEY (rol_id) REFERENCES rol(id)
    )
  `);

  // Tabla permiso - cada fila una acción permitida para un rol
  await runQuery(db, `
    CREATE TABLE IF NOT EXISTS permiso (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      rol_id  INTEGER NOT NULL,
      accion  TEXT NOT NULL,
      FOREIGN KEY (rol_id) REFERENCES rol(id)
    )
  `);

  // Inserta los roles si la tabla está vacía
  // INSERT OR IGNORE evita error si el registro ya existe.
  await runQuery(db, `INSERT OR IGNORE INTO rol (nombre) VALUES ('admin')`);
  await runQuery(db, `INSERT OR IGNORE INTO rol (nombre) VALUES ('usuario')`);

  return db;
}


// FUNCIÓN AUX Convierte db.run() en una Promesa para poder usar await.

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Igual que runQuery pero para SELECT que devuelven UNA fila
function getQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Igual que runQuery pero para SELECT que devuelven VARIAS filas
function allQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}


// FUNCIONES DE USUARIO

/**Alta .Recibe username, password y rol_id. */
export function insertarUsuario(db, username, password, rol_id) {
  return runQuery(
    db,
    `INSERT INTO usuario (username, password, rol_id) VALUES (?, ?, ?)`,
    [username, password, rol_id]
  );
}


 /** Baja x id. */
export function eliminarUsuario(db, id) {
  return runQuery(
    db,
    `DELETE FROM usuario WHERE id = ?`,
    [id]
  );
}

/** Modificación - Permite cambiar username, password o rol_id. */
export function modificarUsuario(db, id, username, password, rol_id) {
  return runQuery(
    db,
    `UPDATE usuario SET username = ?, password = ?, rol_id = ? WHERE id = ?`,
    [username, password, rol_id, id]
  );
}

/** lista todos los usuarios.
 * Hace JOIN con rol para mostrar el nombre del rol en lugar del id */
export function listarUsuarios(db) {
  return allQuery(
    db,
    `SELECT usuario.id, usuario.username, rol.nombre AS rol
     FROM usuario
     JOIN rol ON usuario.rol_id = rol.id`
  );
}

/** Busca x id. */
export function buscarUsuarioPorId(db, id) {
  return getQuery(
    db,
    `SELECT usuario.id, usuario.username, rol.nombre AS rol
     FROM usuario
     JOIN rol ON usuario.rol_id = rol.id
     WHERE usuario.id = ?`,
    [id]
  );
}

/** busca x username y password  */
export function buscarUsuarioPorCredenciales(db, username, password) {
  return getQuery(
    db,
    `SELECT usuario.id, usuario.username, rol.nombre AS rol
     FROM usuario
     JOIN rol ON usuario.rol_id = rol.id
     WHERE usuario.username = ? AND usuario.password = ?`,
    [username, password]
  );
}


// FUNCIONES DE ROL

/** Alta */ 
 
export function insertarRol(db, nombre) {
  return runQuery(
    db,
    `INSERT INTO rol (nombre) VALUES (?)`,
    [nombre]
  );
}

/**Baja x id. */
export function eliminarRol(db, id) {
  return runQuery(
    db,
    `DELETE FROM rol WHERE id = ?`,
    [id]
  );
}

/** lista todos los roles. */

export function listarRoles(db) {
  return allQuery(db, `SELECT * FROM rol`);
}


// FUNCIONES DE PERMISO

/** Alta -asigna una acción a un rol */
export function asignarPermiso(db, rol_id, accion) {
  return runQuery(
    db,
    `INSERT INTO permiso (rol_id, accion) VALUES (?, ?)`,
    [rol_id, accion]
  );
}

/** Baja x id. */
export function revocarPermiso(db, id) {
  return runQuery(
    db,
    `DELETE FROM permiso WHERE id = ?`,
    [id]
  );
}

/** Lista los permisos de un rol específico. */
export function listarPermisosPorRol(db, rol_id) {
  return allQuery(
    db,
    `SELECT permiso.id, permiso.accion, rol.nombre AS rol
     FROM permiso
     JOIN rol ON permiso.rol_id = rol.id
     WHERE permiso.rol_id = ?`,
    [rol_id]
  );
}
