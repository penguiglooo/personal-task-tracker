-- Add project field for project-based boards
-- This enables organizing tasks into different project backlogs

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='project') THEN
        ALTER TABLE tasks ADD COLUMN project TEXT;

        -- Create index for project filtering
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);

        COMMENT ON COLUMN tasks.project IS 'Project board name: Apps, Ideas, Jokes, Stories, Learning, Reading, Watching, Tools, Shopping, Personal, or null for regular tasks';

        RAISE NOTICE 'Added project column';
    ELSE
        RAISE NOTICE 'project column already exists';
    END IF;
END $$;

-- Verify the change
SELECT 'Project field added successfully' as status;
