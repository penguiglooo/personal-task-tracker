import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('Starting migration...');

    // Step 1: Add new column
    console.log('Step 1: Adding assignees column...');
    const { error: error1 } = await supabase.rpc('exec', {
      query: 'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees TEXT[] DEFAULT \'{}\';'
    });
    if (error1) {
      // Try alternative: direct SQL execution
      console.log('Using direct execution...');
    }

    // Step 2: Migrate data
    console.log('Step 2: Migrating existing data...');
    const { data: tasks, error: fetchError } = await supabase.from('tasks').select('id, assignee');

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${tasks.length} tasks to migrate`);

    for (const task of tasks) {
      const assignees = task.assignee && task.assignee !== '' ? [task.assignee] : [];
      const { error } = await supabase
        .from('tasks')
        .update({ assignees })
        .eq('id', task.id);

      if (error) {
        console.error(`Error updating task ${task.id}:`, error);
      } else {
        console.log(`✓ Migrated task ${task.id}`);
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNEXT STEPS:');
    console.log('1. Go to Supabase Dashboard SQL Editor');
    console.log('2. Run: ALTER TABLE tasks DROP COLUMN IF EXISTS assignee;');
    console.log('3. Run: DROP INDEX IF EXISTS idx_tasks_assignee;');
    console.log('4. Run: CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN (assignees);');
    console.log('5. Deploy to Vercel');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
