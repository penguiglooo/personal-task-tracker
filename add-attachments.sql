-- Add attachments field to tasks table
-- Each attachment will have: { id, name, url, type, size, uploadedAt, uploadedBy }

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING gin(attachments);

-- Add comment for documentation
COMMENT ON COLUMN tasks.attachments IS 'Array of attachment objects with id, name, url, type, size, uploadedAt, uploadedBy';
