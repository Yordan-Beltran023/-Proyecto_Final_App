import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('tienda_nueva.db');

export const initDB = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL,
      imagen_url TEXT,
      stock INTEGER NOT NULL,
      categoria_id INTEGER,
      categoria_nombre TEXT
    );
    CREATE TABLE IF NOT EXISTS carrito (
      producto_id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      cantidad INTEGER NOT NULL,
      imagen_url TEXT
    );
    CREATE TABLE IF NOT EXISTS auth_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token TEXT,
  user TEXT
);
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_operacion TEXT NOT NULL,
      entidad TEXT NOT NULL,
      datos TEXT NOT NULL,
      fecha TEXT NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      intentos INTEGER DEFAULT 0
    );
    
  `);
};

export const saveProductsLocal = async (productos: any[]) => {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM productos;');
    for (const producto of productos) {
      await db.runAsync(
        `INSERT INTO productos (id, nombre, descripcion, precio, imagen_url, stock, categoria_id, categoria_nombre)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [producto.id, producto.nombre, producto.descripcion, producto.precio, producto.imagen_url, producto.stock, producto.categoria_id, producto.categoria_nombre]
      );
    }
  });
};

export const getProductsLocal = async (searchQuery: string = '') => {
  let sql = 'SELECT * FROM productos';
  const params: string[] = [];

  if (searchQuery.trim() !== '') {
    sql += ' WHERE nombre LIKE ? OR descripcion LIKE ?';
    params.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  sql += ' ORDER BY id DESC;';
  return db.getAllAsync<any>(sql, params);
};

export const getProductLocal = async (productoId: number) => {
  return db.getFirstAsync<any>('SELECT * FROM productos WHERE id = ?;', [productoId]);
};

export const addToCartLocal = async (producto: any, cantidad: number = 1) => {
  await db.runAsync(
    `INSERT INTO carrito (producto_id, nombre, precio, cantidad, imagen_url)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(producto_id) DO UPDATE SET cantidad = cantidad + ?;`,
    [producto.id, producto.nombre, producto.precio, cantidad, producto.imagen_url, cantidad]
  );
};

export const getCartLocal = async () => {
  return db.getAllAsync<any>('SELECT * FROM carrito ORDER BY producto_id;');
};

export const removeFromCartLocal = async (productoId: number) => {
  await db.runAsync('DELETE FROM carrito WHERE producto_id = ?;', [productoId]);
};

export const clearCartLocal = async () => {
  await db.runAsync('DELETE FROM carrito;');
};

export const saveAuthSession = async (token: string, user: any) => {
  await db.runAsync(
    `INSERT INTO auth_session (id, token, user)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET token = excluded.token, user = excluded.user;`,
    [token, JSON.stringify(user)]
  );
};

export const getAuthSession = async () => {
  try {
    console.log("BUSCANDO SESIÓN...");

    const row = await db.getFirstAsync<any>(
      'SELECT token, user FROM auth_session WHERE id = 1;'
    );

    console.log("SESION ENCONTRADA:", row);

    if (!row) return null;

    return {
      token: row.token,
      user: row.user ? JSON.parse(row.user) : null,
    };

  } catch (error) {
    console.log("ERROR SQLITE SESION:", error);
    throw error;
  }
};

export const clearAuthSession = async () => {
  await db.runAsync('DELETE FROM auth_session WHERE id = 1;');
};

export const enqueueSyncOperation = async (tipo: string, entidad: string, datos: any) => {
  await db.runAsync(
    'INSERT INTO sync_queue (tipo_operacion, entidad, datos, fecha) VALUES (?, ?, ?, ?);',
    [tipo, entidad, JSON.stringify(datos), new Date().toISOString()]
  );
};

export const clearSyncQueue = async () => {
  await db.runAsync('DELETE FROM sync_queue;');
};

export const getPendingSyncOperations = async () => {
  return db.getAllAsync<any>("SELECT * FROM sync_queue WHERE estado = 'pendiente' ORDER BY id ASC;");
};

export const markSyncCompleted = async (id: number) => {
  await db.runAsync('UPDATE sync_queue SET estado = ? WHERE id = ?;', ['completado', id]);
};
