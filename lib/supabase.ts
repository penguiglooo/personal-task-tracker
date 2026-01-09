import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzoexakdxjlxerfqwcol.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b2V4YWtkeGpseGVyZnF3Y29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAyNTY2NywiZXhwIjoyMDgyNjAxNjY3fQ.48Gl79xgb0hPlSRCKB-CQ7qcL2Linu8cFZ-CccKPB0o';

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password: string;
          name: string;
          role: 'admin' | 'viewer';
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password: string;
          name: string;
          role: 'admin' | 'viewer';
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password?: string;
          name?: string;
          role?: 'admin' | 'viewer';
          must_change_password?: boolean;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          description: string | null;
          company: 'Muncho' | 'Foan' | 'Both';
          week: number | null;
          status: 'todo' | 'inProgress' | 'review' | 'done';
          assignees: string[];
          start_date: string | null;
          due_date: string;
          difficulty: 'Easy' | 'Medium' | 'Hard' | null;
          importance: 'Low' | 'Medium' | 'High' | 'Critical' | null;
          comments: any[];
          subtasks: any[];
          attachments: any[];
          activity_log: any[];
          is_backlog: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          description?: string | null;
          company: 'Muncho' | 'Foan' | 'Both';
          week?: number | null;
          status?: 'todo' | 'inProgress' | 'review' | 'done';
          assignees?: string[];
          start_date?: string | null;
          due_date: string;
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
          importance?: 'Low' | 'Medium' | 'High' | 'Critical' | null;
          comments?: any[];
          subtasks?: any[];
          attachments?: any[];
          activity_log?: any[];
          is_backlog?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          company?: 'Muncho' | 'Foan' | 'Both';
          week?: number | null;
          status?: 'todo' | 'inProgress' | 'review' | 'done';
          assignees?: string[];
          start_date?: string | null;
          due_date?: string;
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
          importance?: 'Low' | 'Medium' | 'High' | 'Critical' | null;
          comments?: any[];
          subtasks?: any[];
          attachments?: any[];
          activity_log?: any[];
          is_backlog?: boolean;
          updated_at?: string;
        };
      };
    };
  };
};
