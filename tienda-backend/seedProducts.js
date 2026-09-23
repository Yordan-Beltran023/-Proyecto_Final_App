const { Client } = require('pg');
require('dotenv').config();

const categories = ['Labiales', 'Bases', 'Sombras', 'Skincare'];
const products = [
  ['Velvet Rouge', 'Labial mate de larga duración', 290000, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80', 15, 'Labiales'],
  ['Glow Base', 'Base ligera con acabado natural', 360000, 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80', 12, 'Bases'],
  ['Rose Quartz', 'Sombra satinada con brillo suave', 140000, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80', 20, 'Sombras'],
  ['Hydra Mist', 'Mist facial hidratante para piel', 180000, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80', 18, 'Skincare'],
  ['Crimson Kiss', 'Labial líquido premium', 220000, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=900&q=80', 10, 'Labiales'],
  ['Soft Blur', 'Base de cobertura media', 320000, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', 8, 'Bases'],
];

async function upsertCategories(client) {
  for (const name of categories) {
    const existing = await client.query('SELECT id FROM categorias WHERE nombre = $1', [name]);
    if (existing.rowCount === 0) {
      const result = await client.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id', [name]);
      console.log('CATEGORIA CREADA:', name, result.rows[0].id);
    } else {
      console.log('CATEGORIA YA EXISTE:', name, existing.rows[0].id);
    }
  }
}

async function upsertProducts(client) {
  for (const [nombre, descripcion, precio, imagen_url, stock, categoria] of products) {
    const cat = await client.query('SELECT id FROM categorias WHERE nombre = $1', [categoria]);
    if (!cat.rows[0]) continue;

    const existing = await client.query('SELECT id FROM productos WHERE nombre = $1', [nombre]);
    if (existing.rowCount === 0) {
      const result = await client.query(
        'INSERT INTO productos (nombre, descripcion, precio, imagen_url, stock, categoria_id, estado) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id',
        [nombre, descripcion, precio, imagen_url, stock, cat.rows[0].id]
      );
      console.log('PRODUCTO CREADO:', nombre, result.rows[0].id);
    } else {
      await client.query(
        'UPDATE productos SET descripcion = $2, precio = $3, imagen_url = $4, stock = $5, categoria_id = $6 WHERE nombre = $1',
        [nombre, descripcion, precio, imagen_url, stock, cat.rows[0].id]
      );
      console.log('PRODUCTO ACTUALIZADO:', nombre, existing.rows[0].id);
    }
  }
}

async function main() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
  });

  try {
    await client.connect();
    await upsertCategories(client);
    await upsertProducts(client);

    const total = await client.query('SELECT COUNT(*)::int AS total FROM productos');
    console.log('TOTAL PRODUCTOS EN CATALOGO:', total.rows[0].total);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
