// Abre/crea la base de datos SQLite, define la tabla materiales y 
//carga los 11 materiales al arranque

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'stock.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('No se pudo abrir la base de datos:', err.message);
    process.exit(1);
  }
});

function run(sql, params = []) { // ejecuta consultas q modifican la BD (INSERT, UPDATE, DELETE) y devuelve la promesa
  return new Promise((resolve, reject) => {//mysqlite3 trabaja con callbacks, por eso lo envolvemos en una promesa para usar async/await
    db.run(sql, params, function (err) { //callbacks: funciones q se ejecutan dsps de q una operación asíncrona ha terminado, aquí dsps de ejecutar una consulta
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) { // ejecuta consultas q devuelven un solo registro (SELECT) y devuelve la promesa
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) { // ejecuta consultas q devuelven varios registros (SELECT) y devuelve la promesa
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function init() { // crea la tabla materiales si no existe y carga los materiales iniciales si la tabla está vacía
  await run(`
    CREATE TABLE IF NOT EXISTS materiales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      cantidad REAL NOT NULL DEFAULT 0,
      unidad TEXT NOT NULL CHECK(unidad IN ('unidad', 'kg', 'm3'))
    )
  `);

  const countRow = await get('SELECT COUNT(*) as total FROM materiales');
  if (countRow && countRow.total === 0) {
    const materialesIniciales = [
      { nombre: 'Vidrio', cantidad: 0, unidad: 'kg' },
      { nombre: 'Hierro', cantidad: 0, unidad: 'kg' },
      { nombre: 'Aluminio', cantidad: 0, unidad: 'kg' },
      { nombre: 'Cobre', cantidad: 0, unidad: 'kg' },
      { nombre: 'Bronce', cantidad: 0, unidad: 'kg' },
      { nombre: 'Cartón', cantidad: 0, unidad: 'kg' },
      { nombre: 'Papel Blanco', cantidad: 0, unidad: 'kg' },
      { nombre: 'Tapas de Plástico', cantidad: 0, unidad: 'kg' },
      { nombre: 'Aceite de Girasol', cantidad: 0, unidad: 'm3' },
      { nombre: 'Baterías de Vehículos', cantidad: 0, unidad: 'unidad' },
    ];

    const insertSql = 'INSERT INTO materiales (nombre, cantidad, unidad) VALUES (?, ?, ?)';
    for (const item of materialesIniciales) {
      await run(insertSql, [item.nombre, item.cantidad, item.unidad]);
    }

    console.log('Base de datos inicializada con los materiales de la planta');
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  init
};
