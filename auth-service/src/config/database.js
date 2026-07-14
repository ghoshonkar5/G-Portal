const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('✅ Auth Service connected to G-Learn (Neon PostgreSQL)');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on Auth Service database client', err);
    process.exit(-1);
});

module.exports = pool;