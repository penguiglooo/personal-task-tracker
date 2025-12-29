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
      query = query.eq('assignee', userName);
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
      assignee: task.assignee,
      dueDate: task.due_date,
      comments: task.comments || []
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
    const { error } = await supabaseAdmin.from('tasks').insert([{
      task_id: taskData.id || Date.now().toString(),
      title: taskData.title,
      company: taskData.company,
      week: taskData.week,
      status: taskData.status || 'todo',
      assignee: taskData.assignee || null,
      due_date: taskData.dueDate,
      comments: []
    }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Task created' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
