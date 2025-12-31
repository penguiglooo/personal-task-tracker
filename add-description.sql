-- Add description column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for description search (optional but useful for future text search)
CREATE INDEX IF NOT EXISTS idx_tasks_description ON tasks USING gin(to_tsvector('english', description));
