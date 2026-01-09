-- Complete Supabase Schema for Personal Task Tracker
-- This file includes all migrations and represents the current state of the database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table with all fields
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  company TEXT NOT NULL CHECK (company IN ('Muncho', 'Foan', 'Both')),
  week INTEGER CHECK (week >= 1 AND week <= 4),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'inProgress', 'review', 'done')),
  assignees TEXT[] DEFAULT '{}',
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  importance TEXT CHECK (importance IN ('Low', 'Medium', 'High', 'Critical')),
  comments JSONB DEFAULT '[]'::jsonb,
  subtasks JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  activity_log JSONB DEFAULT '[]'::jsonb,
  is_backlog BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN (assignees);
CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_tasks_importance ON tasks(importance);
CREATE INDEX IF NOT EXISTS idx_tasks_is_backlog ON tasks(is_backlog);
CREATE INDEX IF NOT EXISTS idx_tasks_description ON tasks USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING gin(attachments);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN tasks.description IS 'Detailed task description in markdown format';
COMMENT ON COLUMN tasks.subtasks IS 'Array of subtask objects with id, text, completed, assignee';
COMMENT ON COLUMN tasks.attachments IS 'Array of attachment objects with id, name, url, type, size, uploadedAt, uploadedBy';
COMMENT ON COLUMN tasks.activity_log IS 'Array of activity log entries with id, timestamp, user, action, changes';
COMMENT ON COLUMN tasks.is_backlog IS 'Whether the task is in the backlog (not assigned to a specific week)';
