-- Fix difficulty and importance column types
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- This migration fixes the data type issue where difficulty and importance
-- are currently INTEGER but should be TEXT

-- =============================================================================
-- Drop and recreate difficulty column as TEXT
-- =============================================================================
DO $$
BEGIN
    -- Drop the existing column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tasks' AND column_name='difficulty') THEN
        ALTER TABLE tasks DROP COLUMN difficulty;
        RAISE NOTICE 'Dropped existing difficulty column';
    END IF;

    -- Add difficulty as TEXT with proper constraints
    ALTER TABLE tasks ADD COLUMN difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
    CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
    RAISE NOTICE 'Added difficulty column as TEXT';
END $$;

-- =============================================================================
-- Drop and recreate importance column as TEXT
-- =============================================================================
DO $$
BEGIN
    -- Drop the existing column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='tasks' AND column_name='importance') THEN
        ALTER TABLE tasks DROP COLUMN importance;
        RAISE NOTICE 'Dropped existing importance column';
    END IF;

    -- Add importance as TEXT with proper constraints
    ALTER TABLE tasks ADD COLUMN importance TEXT CHECK (importance IN ('Low', 'Medium', 'High', 'Critical'));
    CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
    RAISE NOTICE 'Added importance column as TEXT';
END $$;

-- =============================================================================
-- Verify the changes
-- =============================================================================
SELECT
    'Tasks Table Schema - difficulty and importance' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('difficulty', 'importance')
ORDER BY column_name;
