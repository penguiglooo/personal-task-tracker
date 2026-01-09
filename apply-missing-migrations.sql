-- Apply Missing Migrations to Supabase Database
-- Run these in the Supabase SQL Editor: https://supabase.com/dashboard/project/idgqtmjprzmtdxqngeyv/sql

-- This script checks and applies all necessary migrations for the personal task tracker
-- It's safe to run multiple times (uses IF NOT EXISTS checks)

-- =============================================================================
-- 1. Add description column
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='description') THEN
        ALTER TABLE tasks ADD COLUMN description TEXT;
        CREATE INDEX IF NOT EXISTS idx_tasks_description ON tasks USING gin(to_tsvector('english', description));
        RAISE NOTICE 'Added description column';
    ELSE
        RAISE NOTICE 'description column already exists';
    END IF;
END $$;

-- =============================================================================
-- 2. Migrate assignee to assignees array
-- =============================================================================
DO $$
BEGIN
    -- Check if we need to migrate from assignee to assignees
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tasks' AND column_name='assignee') THEN

        -- Add assignees column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tasks' AND column_name='assignees') THEN
            ALTER TABLE tasks ADD COLUMN assignees TEXT[] DEFAULT '{}';
        END IF;

        -- Migrate data
        UPDATE tasks
        SET assignees = CASE
          WHEN assignee IS NOT NULL AND assignee != '' THEN ARRAY[assignee]
          ELSE '{}'
        END
        WHERE assignees = '{}' OR assignees IS NULL;

        -- Drop old column and index
        DROP INDEX IF EXISTS idx_tasks_assignee;
        ALTER TABLE tasks DROP COLUMN assignee;

        -- Create new index
        CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN (assignees);

        RAISE NOTICE 'Migrated from assignee to assignees';
    ELSE
        RAISE NOTICE 'assignees migration already complete or assignees column already exists';

        -- Just ensure the column and index exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tasks' AND column_name='assignees') THEN
            ALTER TABLE tasks ADD COLUMN assignees TEXT[] DEFAULT '{}';
        END IF;
        CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN (assignees);
    END IF;
END $$;

-- =============================================================================
-- 3. Add subtasks column
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='subtasks') THEN
        ALTER TABLE tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;
        UPDATE tasks SET subtasks = '[]'::jsonb WHERE subtasks IS NULL;
        RAISE NOTICE 'Added subtasks column';
    ELSE
        RAISE NOTICE 'subtasks column already exists';
    END IF;
END $$;

-- =============================================================================
-- 4. Add attachments column
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='attachments') THEN
        ALTER TABLE tasks ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
        CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING gin(attachments);
        COMMENT ON COLUMN tasks.attachments IS 'Array of attachment objects with id, name, url, type, size, uploadedAt, uploadedBy';
        RAISE NOTICE 'Added attachments column';
    ELSE
        RAISE NOTICE 'attachments column already exists';
    END IF;
END $$;

-- =============================================================================
-- 5. Add difficulty and importance columns
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='difficulty') THEN
        ALTER TABLE tasks ADD COLUMN difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
        CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
        RAISE NOTICE 'Added difficulty column';
    ELSE
        RAISE NOTICE 'difficulty column already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='importance') THEN
        ALTER TABLE tasks ADD COLUMN importance TEXT CHECK (importance IN ('Low', 'Medium', 'High', 'Critical'));
        CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
        RAISE NOTICE 'Added importance column';
    ELSE
        RAISE NOTICE 'importance column already exists';
    END IF;
END $$;

-- =============================================================================
-- 6. Add is_backlog column
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='is_backlog') THEN
        ALTER TABLE tasks ADD COLUMN is_backlog BOOLEAN DEFAULT FALSE;

        -- Update existing tasks: mark tasks with null week as backlog
        UPDATE tasks SET is_backlog = TRUE WHERE week IS NULL;

        CREATE INDEX IF NOT EXISTS idx_tasks_is_backlog ON tasks(is_backlog);
        RAISE NOTICE 'Added is_backlog column';
    ELSE
        RAISE NOTICE 'is_backlog column already exists';
    END IF;
END $$;

-- =============================================================================
-- 7. Ensure week column allows NULL
-- =============================================================================
DO $$
BEGIN
    -- Remove NOT NULL constraint from week if it exists
    ALTER TABLE tasks ALTER COLUMN week DROP NOT NULL;
    RAISE NOTICE 'Ensured week column allows NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'week column already allows NULL or constraint does not exist';
END $$;

-- =============================================================================
-- 8. Ensure start_date column exists
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='tasks' AND column_name='start_date') THEN
        ALTER TABLE tasks ADD COLUMN start_date TIMESTAMPTZ;
        RAISE NOTICE 'Added start_date column';
    ELSE
        RAISE NOTICE 'start_date column already exists';
    END IF;
END $$;

-- =============================================================================
-- Final verification
-- =============================================================================
SELECT
    'Tasks Table Schema' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
