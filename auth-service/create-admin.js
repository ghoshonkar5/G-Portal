const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yniWE2BqLTc8@ep-blue-morning-ao66tb9u-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.log('Usage: node create-admin.js <admin_id> <name> <gmail_email> <password>');
    console.log('Example: node create-admin.js admin2 "Dr. Rahul Sharma" rahul@gmail.com Admin@1234');
    process.exit(1);
  }

  const [adminId, name, email, password] = args;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existing = await client.query(
      'SELECT id, faculty_id, email, role FROM users WHERE faculty_id = $1 OR email = $2',
      [adminId.trim(), email.trim().toLowerCase()]
    );

    if (existing.rows.length > 0) {
      console.error('❌ Error: User with this Admin ID or Email already exists:', existing.rows[0]);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const res = await client.query(
      `INSERT INTO users (faculty_id, name, email, password, role, is_active, first_login, profile_completed)
       VALUES ($1, $2, $3, $4, 'admin', true, false, true)
       RETURNING id, faculty_id, name, email, role`,
      [adminId.trim(), name.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    await client.query('COMMIT');
    console.log('✅ Successfully created Admin user in database:', res.rows[0]);

    // Update ADMIN_EMAILS in .env if not already present
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const emailLower = email.trim().toLowerCase();
      if (envContent.includes('ADMIN_EMAILS=')) {
        const lines = envContent.split('\n');
        const updatedLines = lines.map(line => {
          if (line.startsWith('ADMIN_EMAILS=')) {
            const currentEmails = line.replace('ADMIN_EMAILS=', '').split(',').map(e => e.trim()).filter(Boolean);
            if (!currentEmails.includes(emailLower)) {
              currentEmails.push(emailLower);
              return `ADMIN_EMAILS=${currentEmails.join(',')}`;
            }
          }
          return line;
        });
        fs.writeFileSync(envPath, updatedLines.join('\n'));
        console.log(`✅ Updated ADMIN_EMAILS in .env to include ${emailLower}`);
      } else {
        fs.appendFileSync(envPath, `\nADMIN_EMAILS=${emailLower}\n`);
        console.log(`✅ Added ADMIN_EMAILS to .env with ${emailLower}`);
      }
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating admin user:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
