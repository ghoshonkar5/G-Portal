const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_yniWE2BqLTc8@ep-blue-morning-ao66tb9u-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function listTables() {
  try {
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('=== ALL TABLES IN DATABASE ===');
    for (const row of tables.rows) {
      console.log(`  - ${row.table_name}`);
    }
    
    // Get full schema for each table
    console.log('\n=== TABLE SCHEMAS ===');
    for (const row of tables.rows) {
      const cols = await pool.query(`
        SELECT column_name, data_type, column_default, is_nullable, 
               character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);
      
      console.log(`\n--- ${row.table_name} ---`);
      for (const col of cols.rows) {
        let type = col.data_type;
        if (col.character_maximum_length) type += `(${col.character_maximum_length})`;
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${type} ${nullable}${def}`);
      }
    }

    // Get foreign key constraints
    console.log('\n=== FOREIGN KEYS ===');
    const fks = await pool.query(`
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);
    for (const fk of fks.rows) {
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    }

    // Get row counts
    console.log('\n=== ROW COUNTS ===');
    for (const row of tables.rows) {
      const count = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`  ${row.table_name}: ${count.rows[0].count} rows`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

listTables();
