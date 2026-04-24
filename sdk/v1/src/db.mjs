import sqlite3 from 'sqlite3';
import { resolve } from 'node:path';

/**
 * Inicializa la conexión y crea la tabla si no existe.
 * Devuelve la instancia de la base de datos lista para usar.
 */
export async function initDatabase(dbPath) {
  const absolutePath = resolve(dbPath);
  const db = new sqlite3.Database(absolutePath);

  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )
    `, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * Inserta un usuario (consultas parametrizadas previenen inyección SQL)
 */
export function insertUser(db, username, password) {
  return new Promise((resolve, reject) => {    // usa promesas para manejar asincronía
    db.run(
      `INSERT INTO user (username, password) VALUES (?, ?)`,
      [username, password],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, username });
      }
    );
  });
}

/**
 * Busca un usuario por username y password (login)
 */
export function findUserByUsernameAndPassword(db, username, password) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, username FROM user WHERE username = ? AND password = ?`,
      [username, password],
      (err, row) => {
        if (err) reject(err);
        else resolve(row); // row será null si no encuentra
      }
    );
  });
}