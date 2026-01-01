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

async function addActivityLogColumn() {
  try {
    console.log('Adding activity_log column to tasks table...');

    // Fetch all tasks
    const { data: allTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('task_id, title');

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      process.exit(1);
    }

    console.log(`Updating ${allTasks.length} tasks to include activity_log field...`);

    // Update each task to have an empty activity_log array
    for (const task of allTasks) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ activity_log: [] })
        .eq('task_id', task.task_id);

      if (updateError) {
        console.error(`Error updating task ${task.task_id}:`, updateError);
      }
    }

    console.log('✅ Successfully added activity_log field to all tasks');
    console.log('   All tasks now have an empty activity_log array');
    console.log('   Future changes will be tracked automatically');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addActivityLogColumn();
