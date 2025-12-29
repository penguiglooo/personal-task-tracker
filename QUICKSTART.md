# Quick Start - Deploy in 5 Minutes!

## Step 1: Setup Supabase Tables (2 min)

1. Go to: https://supabase.com/dashboard/project/vzoexakdxjlxerfqwcol/sql/new

2. Paste this SQL and click "Run":

\`\`\`sql
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

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL CHECK (company IN ('Muncho', 'Foan', 'Both')),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 4),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'inProgress', 'review', 'done')),
  assignee TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tasks_task_id ON tasks(task_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
\`\`\`

## Step 2: Deploy to Vercel (2 min)

1. Go to: https://vercel.com/new

2. Import this project (upload the task-tracker folder or connect your GitHub repo)

3. Add these environment variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://vzoexakdxjlxerfqwcol.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjU2NjcsImV4cCI6MjA4MjYwMTY2N30.fGBffRqZdInDsDDX3bYDbVCsb8unNxldPP_rmwSz9HU

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTY2NywiZXhwIjoyMDgyNjAxNjY3fQ.48Gl79xgb0hPlSRCKB-CQ7qcL2Linu8cFZ-CccKPB0o

NEXTAUTH_SECRET=supersecretkey123changemelater
\`\`\`

4. Click "Deploy"

## Step 3: Initialize Database (1 min)

Once deployed, run:

\`\`\`bash
curl -X POST https://YOUR-APP-URL.vercel.app/api/init
\`\`\`

You should see: `{"message":"Success","users":5,"tasks":24}`

## Step 4: Login!

Go to your app URL and login with:

**Admins (full access):**
- dhruv@muncho.in / qwerty123
- akaash@muncho.app / qwerty123
- swapnil.sinha@muncho.in / qwerty123

**Viewers (read-only, their tasks only):**
- aniket.jadhav@muncho.in / qwerty123
- sneha.kumar@muncho.in / qwerty123

**IMPORTANT:** You'll be forced to change password on first login!

## Done! 🎉

Your task tracker is now live and ready to use!

---

Need help? Check DEPLOY.md for detailed instructions.
