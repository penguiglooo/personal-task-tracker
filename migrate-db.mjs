import pg from 'pg';
const { Client } = pg;

// Connection string format: postgresql://[user]:[password]@[host]:[port]/[database]
// You can find this in Supabase Dashboard > Settings > Database > Connection string
// Use the "Direct connection" string (not the pooler)

const connectionString = process.env.DATABASE_URL || 'YOUR_DATABASE_URL_HERE';

async function migrate() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    console.log('Adding description column...');
    await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;');
    console.log('✓ Description column added successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.log('\nPlease run this SQL manually in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/vzoexakdxjlxerfqwcol/sql');
    console.log('2. Click "New Query"');
    console.log('3. Paste and run:');
    console.log('\n   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;\n');
  } finally {
    await client.end();
  }
}

migrate();
