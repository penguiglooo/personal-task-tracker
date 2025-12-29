# Deployment Guide

## Setup Supabase Database (REQUIRED FIRST STEP)

1. Go to your Supabase project: https://vzoexakdxjlxerfqwcol.supabase.co

2. Click on "SQL Editor" in the left sidebar

3. Click "New Query" and paste this SQL:

\`\`\`sql
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

-- Create tasks table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);

-- Create triggers for updated_at
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

4. Click "Run" to execute the SQL

5. You should see "Success. No rows returned" - that's perfect!

## Deploy to Vercel

### Option 1: Using Vercel CLI (Fastest)

1. Install Vercel CLI:
\`\`\`bash
npm install -g vercel
\`\`\`

2. Login to Vercel:
\`\`\`bash
vercel login
\`\`\`

3. Deploy:
\`\`\`bash
vercel
\`\`\`

4. Follow the prompts:
   - Link to existing project? **N**
   - What's your project's name? **task-tracker** (or whatever you want)
   - In which directory is your code located? **.**
   - Want to override settings? **N**

5. Add environment variables:
\`\`\`bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://vzoexakdxjlxerfqwcol.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjU2NjcsImV4cCI6MjA4MjYwMTY2N30.fGBffRqZdInDsDDX3bYDbVCsb8unNxldPP_rmwSz9HU

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTY2NywiZXhwIjoyMDgyNjAxNjY3fQ.48Gl79xgb0hPlSRCKB-CQ7qcL2Linu8cFZ-CccKPB0o

vercel env add NEXTAUTH_SECRET production
# Generate with: openssl rand -base64 32
# Or use: supersecretkey123changemelater

vercel env add NEXTAUTH_URL production
# This will be auto-set by Vercel, but you can manually set it to your deployment URL
\`\`\`

6. Deploy to production:
\`\`\`bash
vercel --prod
\`\`\`

### Option 2: Using Vercel Dashboard

1. Go to https://vercel.com

2. Click "Add New" → "Project"

3. Import your Git repository or upload the folder

4. Configure the project:
   - Framework Preset: **Next.js**
   - Root Directory: **.**
   - Build Command: **npm run build**
   - Output Directory: **.next**

5. Add Environment Variables:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL = https://vzoexakdxjlxerfqwcol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjU2NjcsImV4cCI6MjA4MjYwMTY2N30.fGBffRqZdInDsDDX3bYDbVCsb8unNxldPP_rmwSz9HU
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTY2NywiZXhwIjoyMDgyNjAxNjY3fQ.48Gl79xgb0hPlSRCKB-CQ7qcL2Linu8cFZ-CccKPB0o
NEXTAUTH_SECRET = (generate with: openssl rand -base64 32)
\`\`\`

6. Click "Deploy"

## Initialize the Database

After deployment, initialize the database with users and tasks:

\`\`\`bash
curl -X POST https://your-app-url.vercel.app/api/init
\`\`\`

You should see:
\`\`\`json
{"message":"Success","users":5,"tasks":24}
\`\`\`

## Login

Go to your deployment URL and login with:

**Admin Users:**
- dhruv@muncho.in / qwerty123
- akaash@muncho.app / qwerty123
- swapnil.sinha@muncho.in / qwerty123

**Viewer Users:**
- aniket.jadhav@muncho.in / qwerty123
- sneha.kumar@muncho.in / qwerty123

**You'll be forced to change the password on first login!**

## Done!

Your app is now live and ready to use!
