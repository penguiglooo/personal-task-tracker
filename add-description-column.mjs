const supabaseUrl = 'https://vzoexakdxjlxerfqwcol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTY2NywiZXhwIjoyMDgyNjAxNjY3fQ.48Gl79xgb0hPlSRCKB-CQ7qcL2Linu8cFZ-CccKPB0o';

async function addDescriptionColumn() {
  try {
    console.log('Adding description column to tasks table...');

    // Use Supabase's SQL execution endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: 'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;'
      })
    });

    const result = await response.text();
    console.log('Response:', result);

    if (!response.ok) {
      console.error('Failed to execute SQL. Status:', response.status);
      console.log('\nPlease run this SQL manually in Supabase Dashboard:');
      console.log('1. Go to https://supabase.com/dashboard/project/vzoexakdxjlxerfqwcol/sql');
      console.log('2. Run this query:');
      console.log('\nALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;\n');
      process.exit(1);
    }

    console.log('✓ Description column added successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run this SQL manually in Supabase Dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/vzoexakdxjlxerfqwcol/sql');
    console.log('2. Run this query:');
    console.log('\nALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;\n');
    process.exit(1);
  }
}

addDescriptionColumn();
