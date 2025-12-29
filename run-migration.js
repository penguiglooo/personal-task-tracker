const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migration = fs.readFileSync('./migrate-assignees.sql', 'utf8');

    console.log('Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runMigration();
