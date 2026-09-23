const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const users = [
  { nombre: 'Admin', apellido: 'Sistema', email: 'admin@novaform.com', password: 'Admin123!', rol: 'Administrador' },
  { nombre: 'Yordan', apellido: 'Prueba', email: 'yordan@novaform.com', password: 'Yordan123!', rol: 'Cliente' },
  { nombre: 'Joan', apellido: 'Prueba', email: 'joan@novaform.com', password: 'Joan123!', rol: 'Cliente' },
];

async function main() {
  const client = new Client({
    user: process.env.DB_USER || 'tienda',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tienda',
    password: process.env.DB_PASSWORD || 'tienda123',
    port: Number(process.env.DB_PORT || 5433),
  });

  try {
    await client.connect();

    for (const roleName of ['Cliente', 'Administrador']) {
      await client.query(
        "INSERT INTO roles (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING",
        [roleName]
      );
    }

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol_id)
         SELECT $1, $2, $3, $4, $5, id
         FROM roles
         WHERE nombre = $6
         ON CONFLICT (email) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             apellido = EXCLUDED.apellido,
             telefono = EXCLUDED.telefono,
             password_hash = EXCLUDED.password_hash,
             rol_id = EXCLUDED.rol_id`,
        [user.nombre, user.apellido, user.email, '0000000000', passwordHash, user.rol]
      );
    }

    const result = await client.query(`
      SELECT u.id, u.nombre, u.apellido, u.email, r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      ORDER BY u.id
    `);

    console.table(result.rows);
    console.log('USERS_READY');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
