import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://idgqtmjprzmtdxqngeyv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('🔍 Verifying Supabase schema...\n');

  try {
    // Check tasks table structure by querying a task
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying tasks:', error.message);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log('⚠️  No tasks found in database. Schema cannot be verified.');
      console.log('💡 Try creating a test task first.\n');
      return;
    }

    const task = tasks[0];
    console.log('✅ Successfully connected to database\n');
    console.log('📊 Tasks table columns found:');

    const expectedFields = {
      'id': '🔑 Primary key',
      'task_id': '🔑 Unique task identifier',
      'title': '📝 Task title',
      'description': '📝 Task description',
      'company': '🏢 Company (Muncho/Foan/Both)',
      'week': '📅 Week number (1-4) or null',
      'status': '📊 Status (todo/inProgress/review/done)',
      'assignees': '👥 Array of assignees',
      'start_date': '📅 Start date',
      'due_date': '📅 Due date',
      'difficulty': '⚡ Difficulty (Easy/Medium/Hard)',
      'importance': '🎯 Importance (Low/Medium/High/Critical)',
      'comments': '💬 Comments array',
      'subtasks': '✅ Subtasks array',
      'attachments': '📎 Attachments array',
      'activity_log': '📜 Activity log array',
      'is_backlog': '📋 Backlog flag',
      'created_at': '🕐 Created timestamp',
      'updated_at': '🕐 Updated timestamp'
    };

    const foundFields = Object.keys(task);
    const missingFields = [];

    for (const [field, description] of Object.entries(expectedFields)) {
      if (foundFields.includes(field)) {
        console.log(`  ✅ ${field.padEnd(20)} ${description}`);
      } else {
        console.log(`  ❌ ${field.padEnd(20)} ${description} - MISSING`);
        missingFields.push(field);
      }
    }

    console.log('\n📋 Summary:');
    console.log(`  Total expected fields: ${Object.keys(expectedFields).length}`);
    console.log(`  Found fields: ${foundFields.length}`);
    console.log(`  Missing fields: ${missingFields.length}`);

    if (missingFields.length > 0) {
      console.log('\n⚠️  Missing fields detected:');
      missingFields.forEach(field => {
        console.log(`  - ${field}`);
      });
      console.log('\n💡 Run the migration files to add missing fields:');
      if (missingFields.includes('description')) console.log('  - add-description.sql');
      if (missingFields.includes('subtasks')) console.log('  - add-subtasks-column.sql');
      if (missingFields.includes('attachments')) console.log('  - add-attachments.sql');
      if (missingFields.includes('difficulty') || missingFields.includes('importance')) {
        console.log('  - add-difficulty-importance.sql');
      }
      if (missingFields.includes('assignees')) console.log('  - migrate-assignees.sql');
      if (missingFields.includes('is_backlog')) console.log('  - migrate-backlog.sql');
    } else {
      console.log('\n✅ All fields are present!');
    }

    // Check storage bucket
    console.log('\n🗂️  Checking storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('  ❌ Error checking buckets:', bucketError.message);
    } else {
      const attachmentBucket = buckets.find(b => b.name === 'task-attachments');
      if (attachmentBucket) {
        console.log('  ✅ task-attachments bucket exists');
        console.log(`     Public: ${attachmentBucket.public}`);
      } else {
        console.log('  ❌ task-attachments bucket NOT FOUND');
        console.log('  💡 Create the bucket following supabase-storage-setup.md');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

verifySchema();
