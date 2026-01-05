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

    // Viewers can only see tasks assigned to them
    if (userRole === 'viewer') {
      query = query.contains('assignees', [userName]);
    }

    const { data: tasks, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    const formattedTasks = tasks.map(task => ({
      _id: task.id,
      id: task.task_id,
      title: task.title,
      description: task.description,
      company: task.company,
      week: task.week,
      status: task.status,
      assignees: task.assignees || [],
      startDate: task.start_date,
      dueDate: task.due_date,
      comments: task.comments || [],
      subtasks: task.subtasks || [],
      difficulty: task.difficulty,
      importance: task.importance,
      attachments: task.attachments || [],
      activityLog: task.activity_log || [],
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
      description: taskData.description || null,
      company: taskData.company,
      week: taskData.week,
      status: taskData.status || 'todo',
      assignees: taskData.assignees || [],
      start_date: taskData.startDate || null,
      due_date: taskData.dueDate,
      comments: [],
      subtasks: [],
      activity_log: [{
        id: `${Date.now()}-created`,
        timestamp: new Date().toISOString(),
        user: session.user.name || 'System',
        action: 'created task'
      }],
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
      description: data.description,
      company: data.company,
      week: data.week,
      status: data.status,
      assignees: data.assignees || [],
      startDate: data.start_date,
      dueDate: data.due_date,
      comments: data.comments || [],
      subtasks: data.subtasks || [],
      difficulty: data.difficulty,
      importance: data.importance,
      attachments: data.attachments || [],
      activityLog: data.activity_log || [],
      isBacklog: data.is_backlog || data.week === null,
      createdAt: data.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
