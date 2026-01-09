import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
}

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
          project: string | null;
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
          project?: string | null;
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
          project?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};
