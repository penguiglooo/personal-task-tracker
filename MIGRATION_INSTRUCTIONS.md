# Database Migration Instructions

## Multiple Assignees Feature

This migration changes the `assignee` field from a single string to an `assignees` array to support multiple users being assigned to a task.

## Steps to Run Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://vzoexakdxjlxerfqwcol.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `migrate-assignees.sql`
4. Run the query

### Option 2: Via psql Command Line

If you have the Supabase database connection string:

```bash
psql "postgres://postgres:[PASSWORD]@db.vzoexakdxjlxerfqwcol.supabase.co:5432/postgres" < migrate-assignees.sql
```

## What the Migration Does

1. **Adds `assignees` column**: Creates a new TEXT[] column for storing multiple assignees
2. **Migrates existing data**: Converts single `assignee` values to `assignees` arrays
3. **Drops old column**: Removes the `assignee` column
4. **Updates index**: Creates a GIN index on the new `assignees` array for efficient querying

## After Migration

1. Deploy the updated code to Vercel
2. Test that:
   - Existing tasks show up correctly
   - You can assign multiple users to a task
   - User filtering works correctly
   - Viewers can only see tasks they're assigned to

## Rollback (if needed)

If something goes wrong, you can rollback by running:

```sql
-- Add back the old column
ALTER TABLE tasks ADD COLUMN assignee TEXT;

-- Migrate first assignee back
UPDATE tasks
SET assignee = CASE
  WHEN array_length(assignees, 1) > 0 THEN assignees[1]
  ELSE NULL
END;

-- Drop the new column
ALTER TABLE tasks DROP COLUMN assignees;

-- Restore the old index
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
```
