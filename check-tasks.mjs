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

async function checkTasks() {
  console.log('Checking tasks...');

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, task_id, title, due_date')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`\nFound ${tasks.length} recent tasks:\n`);
    tasks.forEach(task => {
      console.log(`ID: ${task.task_id}`);
      console.log(`Title: "${task.title}"`);
      console.log(`Due Date: ${task.due_date}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkTasks();
