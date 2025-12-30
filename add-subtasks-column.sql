-- Add subtasks column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Update existing tasks to have empty subtasks array
UPDATE tasks SET subtasks = '[]'::jsonb WHERE subtasks IS NULL;
