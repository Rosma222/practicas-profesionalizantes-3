// API REST Express con los 5 endpoints, todas las validaciones de negocio y manejo de errores. 
//Se conecta a la base de datos SQLite y expone los casos de uso requeridos.

const express = require('express');
const cors = require('cors');
const { run, get, all, init } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* Valida que la cantidad sea número válido y positivo.
 * Si el material se gestiona x unidad debe ser entero.*/
function validarCantidad(cantidad, unidad) {
  const num = Number(cantidad);

  if (isNaN(num) || num <= 0) {
    return 'La cantidad debe ser un número mayor a cero.';
  }

  if (unidad === 'unidad' && !Number.isInteger(num)) {
    return 'Las baterías de vehículos se gestionan por unidades enteras.';
  }

  return null;
}

// Caso Uso 1 — Ver stock: GET /api/materiales
app.get('/api/materiales', async (req, res) => {
  try {
    const materiales = await all('SELECT * FROM materiales ORDER BY nombre ASC');
    res.json(materiales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los materiales.' });
  }
});

// Caso Uso 4 — Agregar material: POST /api/materiales
app.post('/api/materiales', async (req, res) => {
  const { nombre, unidad, cantidad = 0 } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del material es obligatorio.' });
  }

  const unidadesValidas = ['unidad', 'kg', 'm3'];
  if (!unidadesValidas.includes(unidad)) {
    return res.status(400).json({ error: 'La unidad debe ser "unidad", "kg" o "m3".' });
  }

  const cantidadNum = Number(cantidad);
  if (isNaN(cantidadNum) || cantidadNum < 0) {
    return res.status(400).json({ error: 'La cantidad inicial debe ser un número mayor o igual a cero.' });
  }

  if (unidad === 'unidad' && !Number.isInteger(cantidadNum)) {
    return res.status(400).json({ error: 'Los materiales por unidad deben tener cantidad entera.' });
  }

  try {
    const insertResult = await run(
      'INSERT INTO materiales (nombre, cantidad, unidad) VALUES (?, ?, ?)',
      [nombre.trim(), cantidadNum, unidad]
    );
    const nuevo = await get('SELECT * FROM materiales WHERE id = ?', [insertResult.lastID]);
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Ya existe un material con el nombre "${nombre.trim()}".` });
    }
    res.status(500).json({ error: 'Error al agregar el material.' });
  }
});

// Caso Uso 5 — Eliminar material: DELETE /api/materiales/:id
app.delete('/api/materiales/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const material = await get('SELECT * FROM materiales WHERE id = ?', [id]);
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado.' });
    }

    await run('DELETE FROM materiales WHERE id = ?', [id]);
    res.json({ message: `Material "${material.nombre}" eliminado correctamente.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el material.' });
  }
});


// Caso Uso 2 — Registrar ingreso: PATCH /api/materiales/:id/ingreso
app.patch('/api/materiales/:id/ingreso', async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  try {
    const material = await get('SELECT * FROM materiales WHERE id = ?', [id]);
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado.' });
    }

    const errorCantidad = validarCantidad(cantidad, material.unidad);
    if (errorCantidad) {
      return res.status(400).json({ error: errorCantidad });
    }

    const nuevaCantidad = material.cantidad + Number(cantidad);
    await run('UPDATE materiales SET cantidad = ? WHERE id = ?', [nuevaCantidad, id]);
    const actualizado = await get('SELECT * FROM materiales WHERE id = ?', [id]);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el ingreso.' });
  }
});


// Caso Uso 3 — Registrar egreso: PATCH /api/materiales/:id/egreso
app.patch('/api/materiales/:id/egreso', async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  try {
    const material = await get('SELECT * FROM materiales WHERE id = ?', [id]);
    if (!material) {
      return res.status(404).json({ error: 'Material no encontrado.' });
    }

    const errorCantidad = validarCantidad(cantidad, material.unidad);
    if (errorCantidad) {
      return res.status(400).json({ error: errorCantidad });
    }

    const nuevaCantidad = material.cantidad - Number(cantidad);
    if (nuevaCantidad < 0) {
      return res.status(400).json({ error: `Stock insuficiente. Stock actual: ${material.cantidad} ${material.unidad}.` });
    }

    await run('UPDATE materiales SET cantidad = ? WHERE id = ?', [nuevaCantidad, id]);
    const actualizado = await get('SELECT * FROM materiales WHERE id = ?', [id]);
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el egreso.' });
  }
});

// Inicializar DB y servidor
(async () => {
  try {
    await init();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error al inicializar el servidor:', err);
    process.exit(1);
  }
})();
