import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local file manually
const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAttachmentsColumn() {
  console.log('Adding attachments column to tasks table...\n');

  try {
    // First, check if column already exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('attachments')
      .limit(1);

    if (!testError) {
      console.log('✅ Attachments column already exists!');
      console.log('\nNext steps:');
      console.log('1. Go to Supabase Dashboard → Storage');
      console.log('2. Create a new bucket named "task-attachments"');
      console.log('3. Set it as a public bucket');
      console.log('4. See supabase-storage-setup.md for detailed instructions');
      return;
    }

    // If column doesn't exist, we need to add it via SQL Editor
    console.log('⚠️  Attachments column does not exist yet.');
    console.log('\nPlease follow these steps:');
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL commands:\n');
    console.log('---SQL START---');
    console.log(`
-- Add attachments column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING gin(attachments);

-- Add comment for documentation
COMMENT ON COLUMN tasks.attachments IS 'Array of attachment objects with id, name, url, type, size, uploadedAt, uploadedBy';
    `);
    console.log('---SQL END---\n');

    console.log('4. After running the SQL, set up Storage:');
    console.log('   - Go to Storage in Supabase Dashboard');
    console.log('   - Create bucket named "task-attachments"');
    console.log('   - Make it public');
    console.log('   - See supabase-storage-setup.md for storage policies\n');

  } catch (error) {
    console.error('Error:', error);
    console.log('\nPlease add the column manually using the SQL Editor in Supabase Dashboard.');
  }
}

addAttachmentsColumn();
