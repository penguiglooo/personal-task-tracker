import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubtasks() {
  try {
    console.log('Checking if subtasks column exists...\n');

    // Try to fetch tasks with subtasks field
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('task_id, title, subtasks')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching tasks:', error);
      console.log('\nThe subtasks column does NOT exist yet.');
      console.log('Please run the SQL migration in Supabase dashboard.');
      process.exit(1);
    }

    console.log('✅ Subtasks column exists!');
    console.log(`\nFetched ${tasks.length} tasks to verify:\n`);

    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   Task ID: ${task.task_id}`);
      console.log(`   Subtasks: ${JSON.stringify(task.subtasks)}`);
      console.log('');
    });

    console.log('✅ Migration successful! Subtasks are working.');
    console.log('You can now add subtasks to tasks in the app.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSubtasks();
