import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userRole = (session.user as any).role;
    const userName = session.user.name;

    const { data: task } = await supabaseAdmin.from('tasks').select('*').eq('task_id', id).single();
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (userRole === 'viewer' && task.assignee !== userName) {
      return NextResponse.json({ error: 'You can only view tasks assigned to you' }, { status: 403 });
    }

    const updates = await request.json();
    if (userRole === 'viewer' && updates.status && updates.status !== task.status) {
      return NextResponse.json({ error: 'You do not have permission to move tasks' }, { status: 403 });
    }

    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.company) updateData.company = updates.company;
    if (updates.status) updateData.status = updates.status;
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
    if (updates.dueDate) updateData.due_date = updates.dueDate;
    if (updates.week) updateData.week = updates.week;
    if (updates.comments) updateData.comments = updates.comments;

    const { data: updated, error } = await supabaseAdmin.from('tasks').update(updateData).eq('task_id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      _id: updated.id,
      id: updated.task_id,
      title: updated.title,
      company: updated.company,
      week: updated.week,
      status: updated.status,
      assignee: updated.assignee,
      dueDate: updated.due_date,
      comments: updated.comments || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Only admins can delete tasks' }, { status: 403 });

    const { id } = await params;
    const { error } = await supabaseAdmin.from('tasks').delete().eq('task_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
