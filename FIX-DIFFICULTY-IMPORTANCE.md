# Fix Difficulty and Importance Fields

## Problem
When adding difficulty or importance to a task, you see this error:
```
invalid input syntax for type integer: "Medium"
```

This happens because the database columns are currently INTEGER type instead of TEXT.

## Solution

You need to run a SQL migration to fix the column types. Follow these steps:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor: [https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql](https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql)

### Step 2: Run the Migration

Copy and paste the following SQL into the editor and click "Run":

```sql
-- Fix difficulty and importance column types

-- Drop and recreate difficulty column as TEXT
DO $$
BEGIN
    -- Drop the existing column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tasks' AND column_name='difficulty') THEN
        ALTER TABLE tasks DROP COLUMN difficulty;
        RAISE NOTICE 'Dropped existing difficulty column';
    END IF;

    -- Add difficulty as TEXT with proper constraints
    ALTER TABLE tasks ADD COLUMN difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
    CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
    RAISE NOTICE 'Added difficulty column as TEXT';
END $$;

-- Drop and recreate importance column as TEXT
DO $$
BEGIN
    -- Drop the existing column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tasks' AND column_name='importance') THEN
        ALTER TABLE tasks DROP COLUMN importance;
        RAISE NOTICE 'Dropped existing importance column';
    END IF;

    -- Add importance as TEXT with proper constraints
    ALTER TABLE tasks ADD COLUMN importance TEXT CHECK (importance IN ('Low', 'Medium', 'High', 'Critical'));
    CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
    RAISE NOTICE 'Added importance column as TEXT';
END $$;

-- Verify the changes
SELECT
    'Tasks Table Schema - difficulty and importance' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('difficulty', 'importance')
ORDER BY column_name;
```

### Step 3: Verify

After running the migration, you should see:
- "Dropped existing difficulty column"
- "Added difficulty column as TEXT"
- "Dropped existing importance column"
- "Added importance column as TEXT"

And a table showing:
```
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| difficulty  | text      | YES         |
| importance  | text      | YES         |
```

### Step 4: Test

1. Refresh your application
2. Try adding difficulty and importance to a task
3. It should now work without errors!

## Alternative: Use the SQL File

If you prefer, you can also:
1. Open the file `fix-difficulty-importance-types.sql`
2. Copy its entire contents
3. Paste into the Supabase SQL Editor
4. Run it

## Notes

- This migration will drop any existing difficulty/importance values (if you had set any as integers)
- The fields are optional (nullable), so existing tasks won't be affected
- The constraints ensure only valid values can be stored:
  - difficulty: 'Easy', 'Medium', 'Hard'
  - importance: 'Low', 'Medium', 'High', 'Critical'
