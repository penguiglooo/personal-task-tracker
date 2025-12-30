-- Add created_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set all existing tasks' created_at to December 30, 2025
UPDATE tasks SET created_at = '2025-12-30T00:00:00Z' WHERE created_at IS NULL OR created_at < '2025-12-30T00:00:00Z';
