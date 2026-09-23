const { Client } = require('pg');
require('dotenv').config();

const categories = ['Camisetas', 'Sudaderas', 'Chaquetas', 'Pantalones', 'Accesorios'];
const products = [
  ['Camiseta Oversize Basic', 'Algodón pesado, silueta amplia y tacto premium con corte relajado.', 89000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80', 15, 'Camisetas'],
  ['Camiseta Drapeada', 'Diseño fluido y elegante para un look moderno y ligero.', 99000, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80', 18, 'Camisetas'],
  ['Hoodie Essential', 'Sudadera de felpa suave con volumen relajado y ajuste comfortable.', 189000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80', 12, 'Sudaderas'],
  ['Sudadera Fleece', 'Tela térmica con terminación premium y clásico look urbano.', 209000, 'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=80', 10, 'Sudaderas'],
  ['Chaqueta Urban', 'Capa ligera con acabado técnico y corte boxy ideal para diario.', 249000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80', 20, 'Chaquetas'],
  ['Pantalón Cargo', 'Bolsillos utilitarios, fit recto y máxima libertad de movimiento.', 169000, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80', 18, 'Pantalones'],
  ['Pantalón Relax', 'Corte cómodo y sobrio con tejido ligero para todo el día.', 179000, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80', 14, 'Pantalones'],
  ['Gorra Classic', 'Sarga de algodón con bordado frontal minimal y acabado premium.', 69000, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80', 10, 'Accesorios'],
  ['Mochila Mini', 'Diseño funcional y moderno para días urbanos y viajes cortos.', 139000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80', 9, 'Accesorios'],
  ['Zapatillas Street', 'Perfil bajo, suela urbana y detalles en contraste para uso diario.', 279000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', 8, 'Accesorios'],
  ['Lentes de Sol', 'Armazón elegante con un toque contemporáneo y versátil.', 119000, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80', 11, 'Accesorios'],
  ['Bolso Crossbody', 'Compacidad, estilo y funcionalidad para tus días más activos.', 159000, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80', 13, 'Accesorios'],
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
