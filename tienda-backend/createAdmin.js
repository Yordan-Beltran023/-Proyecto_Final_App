const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

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
    const passwordHash = await bcrypt.hash('Admin123!', 10);

    const result = await client.query(
      `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol_id)
       VALUES ($1, $2, $3, $4, $5, (SELECT id FROM roles WHERE nombre = 'Administrador'))
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['Admin', 'Sistema', 'admin@lunarosa.com', '0000000000', passwordHash]
    );

    console.log(result.rowCount ? 'ADMIN CREADO: admin@lunarosa.com' : 'ADMIN YA EXISTE: admin@lunarosa.com');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
