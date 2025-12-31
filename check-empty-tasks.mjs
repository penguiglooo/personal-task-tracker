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

async function checkEmptyTasks() {
  console.log('Checking for empty title tasks...');

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('title', '');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`\nFound ${tasks.length} tasks with empty titles\n`);

    console.log('Do you want to delete these empty tasks? (yes/no)');

  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkEmptyTasks();
