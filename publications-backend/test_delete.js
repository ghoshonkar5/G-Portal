const pool = require('./src/config/database');

async function testDelete() {
  try {
    // First, list all publications
    const pubs = await pool.query('SELECT id, title FROM publications ORDER BY id');
    console.log(`Total publications: ${pubs.rows.length}`);
    pubs.rows.forEach(p => console.log(`  id=${p.id} | ${p.title?.substring(0, 60)}`));
    
    if (pubs.rows.length === 0) {
      console.log('No publications to test with.');
      await pool.end();
      return;
    }

    // Try to delete the first one
    const testId = pubs.rows[0].id;
    console.log(`\nAttempting to delete publication id=${testId}...`);
    
    // Check for potential_flags
    const flags = await pool.query('SELECT id FROM potential_flags WHERE publication_id = $1', [testId]);
    console.log(`  potential_flags referencing it: ${flags.rows.length}`);
    
    const fFlags = await pool.query('SELECT id FROM flags WHERE publication_id = $1', [testId]);
    console.log(`  flags referencing it: ${fFlags.rows.length}`);

    // Try the delete
    await pool.query('DELETE FROM potential_flags WHERE publication_id = $1', [testId]);
    await pool.query('DELETE FROM flags WHERE publication_id = $1', [testId]);
    const result = await pool.query('DELETE FROM publications WHERE id = $1 RETURNING id', [testId]);
    console.log(`  Delete result rows: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log('  ✅ DELETE SUCCEEDED');
    } else {
      console.log('  ❌ DELETE RETURNED 0 ROWS');
    }

    // Verify
    const verify = await pool.query('SELECT id FROM publications WHERE id = $1', [testId]);
    console.log(`  Verification — still exists? ${verify.rows.length > 0 ? 'YES (BUG!)' : 'NO (correct)'}`);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

testDelete();
