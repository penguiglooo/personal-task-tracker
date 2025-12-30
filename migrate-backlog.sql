-- Add is_backlog column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_backlog BOOLEAN DEFAULT FALSE;

-- Update existing tasks: mark tasks with null week as backlog
UPDATE tasks
SET is_backlog = TRUE
WHERE week IS NULL;

-- Create index for faster backlog queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_backlog ON tasks (is_backlog);
