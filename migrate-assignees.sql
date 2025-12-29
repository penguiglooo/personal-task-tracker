-- Migration to change assignee from single string to array of strings
-- This migration preserves existing data

-- Step 1: Add new column for assignees array
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing assignee data to assignees array
UPDATE tasks
SET assignees = CASE
  WHEN assignee IS NOT NULL AND assignee != '' THEN ARRAY[assignee]
  ELSE '{}'
END
WHERE assignees = '{}';

-- Step 3: Drop the old assignee column
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee;

-- Step 4: Update the index
DROP INDEX IF EXISTS idx_tasks_assignee;
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN (assignees);
