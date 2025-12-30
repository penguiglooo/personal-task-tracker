import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userRole = (session.user as any).role;
    const userName = session.user.name;

    let query = supabaseAdmin.from('tasks').select('*').order('due_date', { ascending: true });

    if (userRole === 'viewer') {
      query = query.contains('assignees', [userName]);
    }

    const { data: tasks, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    const formattedTasks = tasks.map(task => ({
      _id: task.id,
      id: task.task_id,
      title: task.title,
      company: task.company,
      week: task.week,
      status: task.status,
      assignees: task.assignees || [],
      dueDate: task.due_date,
      comments: task.comments || [],
      subtasks: task.subtasks || [],
      isBacklog: task.is_backlog || task.week === null,
      createdAt: task.created_at || task.due_date
    }));

    return NextResponse.json(formattedTasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Only admins can create tasks' }, { status: 403 });

    const taskData = await request.json();
    const taskId = Date.now().toString();

    const newTask = {
      task_id: taskId,
      title: taskData.title || '',
      company: taskData.company,
      week: taskData.week,
      status: taskData.status || 'todo',
      assignees: taskData.assignees || [],
      due_date: taskData.dueDate,
      comments: [],
      subtasks: [],
      is_backlog: taskData.isBacklog || taskData.week === null,
      created_at: taskData.createdAt || new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin.from('tasks').insert([newTask]).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return formatted task matching the frontend format
    return NextResponse.json({
      _id: data.id,
      id: data.task_id,
      title: data.title,
      company: data.company,
      week: data.week,
      status: data.status,
      assignees: data.assignees || [],
      dueDate: data.due_date,
      comments: data.comments || [],
      subtasks: data.subtasks || [],
      isBacklog: data.is_backlog || data.week === null,
      createdAt: data.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
