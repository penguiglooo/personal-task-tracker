-- Add difficulty and importance columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
ADD COLUMN IF NOT EXISTS importance TEXT CHECK (importance IN ('Low', 'Medium', 'High', 'Critical'));

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
