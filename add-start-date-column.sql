-- Add start_date column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;

-- Create index for start_date for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
