import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const INITIAL_USERS = [
  { email: 'aniket.jadhav@muncho.in', name: 'Aniket', role: 'viewer' },
  { email: 'sneha.kumar@muncho.in', name: 'Sneha', role: 'viewer' },
  { email: 'akaash@muncho.app', name: 'Akaash', role: 'admin' },
  { email: 'swapnil.sinha@muncho.in', name: 'Swapnil', role: 'admin' },
  { email: 'dhruv@muncho.in', name: 'Dhruv', role: 'admin' },
];

const INITIAL_TASKS = [
  { task_id: '1', title: 'Self Razorpay', company: 'Muncho', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '2', title: 'Billing System', company: 'Muncho', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '3', title: 'Payments Dashboard', company: 'Muncho', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '4', title: 'n8n Integration', company: 'Both', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '5', title: 'Reelo v1, v2', company: 'Foan', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '6', title: 'Onboarding Flows', company: 'Both', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '7', title: 'Admin Dashboard', company: 'Both', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '8', title: 'Callback System', company: 'Both', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '9', title: 'Latency Optimization', company: 'Foan', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '10', title: 'Fuzzy Search', company: 'Foan', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '11', title: 'API Setup', company: 'Foan', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '12', title: 'Campaign Analysis', company: 'Foan', week: 1, status: 'todo', assignees: [], due_date: '2025-01-07', comments: [], is_backlog: false },
  { task_id: '13', title: 'Fixing User Payments', company: 'Muncho', week: 2, status: 'todo', assignees: [], due_date: '2025-01-15', comments: [], is_backlog: false },
  { task_id: '14', title: 'Exotel Integration', company: 'Foan', week: 2, status: 'todo', assignees: [], due_date: '2025-01-15', comments: [], is_backlog: false },
  { task_id: '15', title: 'Inbound Call Handling', company: 'Foan', week: 2, status: 'todo', assignees: [], due_date: '2025-01-15', comments: [], is_backlog: false },
  { task_id: '16', title: 'Debugging Sprint', company: 'Foan', week: 2, status: 'todo', assignees: [], due_date: '2025-01-15', comments: [], is_backlog: false },
  { task_id: '17', title: 'Campaign Analysis Refinement', company: 'Foan', week: 2, status: 'todo', assignees: [], due_date: '2025-01-15', comments: [], is_backlog: false },
  { task_id: '18', title: 'Human Handover Workflow', company: 'Foan', week: 3, status: 'todo', assignees: [], due_date: '2025-01-23', comments: [], is_backlog: false },
  { task_id: '19', title: 'Website Chatbot', company: 'Foan', week: 3, status: 'todo', assignees: [], due_date: '2025-01-23', comments: [], is_backlog: false },
  { task_id: '20', title: 'SDK Development', company: 'Foan', week: 3, status: 'todo', assignees: [], due_date: '2025-01-23', comments: [], is_backlog: false },
  { task_id: '21', title: 'Knowledge Base', company: 'Foan', week: 3, status: 'todo', assignees: [], due_date: '2025-01-23', comments: [], is_backlog: false },
  { task_id: '22', title: 'Magic Prompt', company: 'Foan', week: 3, status: 'todo', assignees: [], due_date: '2025-01-23', comments: [], is_backlog: false },
  { task_id: '23', title: 'Debugging + Cleanup', company: 'Both', week: 4, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: false },
  { task_id: '24', title: 'Personalization Features', company: 'Both', week: 4, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: false },

  // Backlog Tasks
  { task_id: '25', title: 'Global Search', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '26', title: 'IVR Clicking', company: 'Foan', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '27', title: 'Appearance v2', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '28', title: 'Custom Tags', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '29', title: 'Filter by tags', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '30', title: 'QR Creator', company: 'Muncho', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '31', title: 'Admin Kanban', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '32', title: 'Personalization', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '33', title: 'Google Pricing API', company: 'Foan', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '34', title: 'Last Ordered', company: 'Muncho', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '35', title: 'Content across calls', company: 'Foan', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '36', title: 'CRM v2', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '37', title: 'AI Menu Fill', company: 'Muncho', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '38', title: 'Connect across channels', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '39', title: 'Marketing Agent', company: 'Both', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '40', title: 'Text ChatGPT', company: 'Foan', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '41', title: 'WhatsApp Payment', company: 'Muncho', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
  { task_id: '42', title: 'WhatsApp Trials', company: 'Muncho', week: null, status: 'todo', assignees: [], due_date: '2025-01-31', comments: [], is_backlog: true },
];

export async function POST(request: NextRequest) {
  try {
    const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    if (count && count > 0) return NextResponse.json({ message: 'Already initialized' }, { status: 400 });
    const hashedPassword = await bcrypt.hash('qwerty123', 10);
    const users = INITIAL_USERS.map(u => ({...u, password: hashedPassword, must_change_password: true}));
    const { error: e1 } = await supabaseAdmin.from('users').insert(users);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabaseAdmin.from('tasks').insert(INITIAL_TASKS as any);
    if (e2) throw new Error(e2.message);
    return NextResponse.json({ message: 'Success', users: 5, tasks: 42 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
