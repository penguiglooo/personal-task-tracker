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

async function migrateDates() {
  console.log('Starting date migration from 2025 to 2026...');

  try {
    // Fetch all tasks
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*');

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      return;
    }

    console.log(`Found ${tasks.length} tasks to migrate`);

    let updatedCount = 0;

    for (const task of tasks) {
      if (task.due_date && task.due_date.includes('2025-01')) {
        // Replace 2025-01 with 2026-01
        const newDueDate = task.due_date.replace('2025-01', '2026-01');

        const { error: updateError } = await supabase
          .from('tasks')
          .update({ due_date: newDueDate })
          .eq('id', task.id);

        if (updateError) {
          console.error(`Error updating task ${task.id}:`, updateError);
        } else {
          console.log(`Updated task ${task.id}: ${task.due_date} -> ${newDueDate}`);
          updatedCount++;
        }
      }
    }

    console.log(`\nMigration complete! Updated ${updatedCount} tasks.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateDates();
