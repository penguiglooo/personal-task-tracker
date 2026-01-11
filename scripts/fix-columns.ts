import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixColumns() {
  console.log('🔧 Fixing difficulty and importance column types...\n');

  try {
    // Drop and recreate difficulty column
    console.log('📝 Dropping existing difficulty column...');
    const { error: dropDifficultyError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE tasks DROP COLUMN IF EXISTS difficulty;'
    });

    if (dropDifficultyError) {
      console.log('   Attempting alternative approach for difficulty...');
      // Try direct SQL execution
      const { error: altError1 } = await supabase
        .from('tasks')
        .select('difficulty')
        .limit(1);

      if (!altError1) {
        console.log('⚠️  Column exists but cannot be dropped via RPC. Manual intervention required.');
        console.log('\n📋 Please run this SQL in your Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql\n');
        console.log('ALTER TABLE tasks DROP COLUMN IF EXISTS difficulty;');
        console.log('ALTER TABLE tasks ADD COLUMN difficulty TEXT CHECK (difficulty IN (\'Easy\', \'Medium\', \'Hard\'));');
        console.log('CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);\n');
      }
    } else {
      console.log('✅ Difficulty column dropped');
    }

    console.log('📝 Creating difficulty column as TEXT...');
    const { error: createDifficultyError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tasks ADD COLUMN difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
        CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
      `
    });

    if (createDifficultyError) {
      console.log('   Using alternative approach...');
    } else {
      console.log('✅ Difficulty column created as TEXT');
    }

    // Drop and recreate importance column
    console.log('\n📝 Dropping existing importance column...');
    const { error: dropImportanceError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE tasks DROP COLUMN IF EXISTS importance;'
    });

    if (dropImportanceError) {
      console.log('   Attempting alternative approach for importance...');
    } else {
      console.log('✅ Importance column dropped');
    }

    console.log('📝 Creating importance column as TEXT...');
    const { error: createImportanceError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tasks ADD COLUMN importance TEXT CHECK (importance IN ('Low', 'Medium', 'High', 'Critical'));
        CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
      `
    });

    if (createImportanceError) {
      console.log('   Using alternative approach...');
    } else {
      console.log('✅ Importance column created as TEXT');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n💡 If you see errors above, please run the SQL file manually:');
    console.log('   Open: fix-difficulty-importance-types.sql');
    console.log('   Copy the SQL and run it in your Supabase SQL Editor\n');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.log('\n💡 Please run the migration manually:');
    console.log('   1. Open your Supabase dashboard');
    console.log('   2. Go to the SQL Editor');
    console.log('   3. Copy and run the contents of fix-difficulty-importance-types.sql\n');
    process.exit(1);
  }
}

// Note: Supabase doesn't expose a direct SQL execution RPC by default
// This script provides instructions for manual migration
console.log('⚠️  Supabase requires manual SQL execution for schema changes.\n');
console.log('📋 Please follow these steps:\n');
console.log('1. Open your Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql\n');
console.log('2. Copy the contents of: fix-difficulty-importance-types.sql\n');
console.log('3. Paste and run the SQL in the editor\n');
console.log('4. Verify the columns are now TEXT type\n');

process.exit(0);
