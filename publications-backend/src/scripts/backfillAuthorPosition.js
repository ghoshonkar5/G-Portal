const pool = require('../config/database');
const { getAuthorPosition } = require('../utils/authorPosition');

const backfill = async () => {
  console.log('Starting author position backfill...');

  const { rows } = await pool.query(`
    SELECT p.id, p.authors, p.position_of_author, u.name as faculty_name
    FROM publications p
    JOIN faculty_profile fp ON p.faculty_id = fp.id
    JOIN users u ON fp.user_id = u.id
    WHERE (p.position_of_author IS NULL OR p.position_of_author = '')
  `);

  console.log(`Found ${rows.length} publications to process`);

  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const authors = Array.isArray(row.authors) ? row.authors : [];
    const position = getAuthorPosition(authors, row.faculty_name);

    if (position) {
      await pool.query(
        'UPDATE publications SET position_of_author = $1 WHERE id = $2',
        [position, row.id]
      );
      updated++;
    } else {
      notFound++;
    }
  }

  console.log(`Done — ${updated} updated, ${notFound} not matched`);
  process.exit(0);
};

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});