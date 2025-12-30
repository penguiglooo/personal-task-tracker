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

    const updates = await request.json();

    // Viewers can move tasks (change status) and update subtasks
    if (userRole === 'viewer') {
      // Check if this is a task assigned to the viewer
      const isAssignedToViewer = task.assignees && task.assignees.includes(userName);

      // Viewers can only update their assigned tasks
      if (!isAssignedToViewer) {
        return NextResponse.json({ error: 'You can only update tasks assigned to you' }, { status: 403 });
      }

      // Only allow status and subtasks updates for viewers
      const allowedUpdates = ['status', 'subtasks'];
      const updateKeys = Object.keys(updates);
      const hasDisallowedUpdates = updateKeys.some(key => !allowedUpdates.includes(key));

      // If trying to update disallowed fields, block it
      if (hasDisallowedUpdates) {
        return NextResponse.json({ error: 'You can only move tasks and update subtasks' }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.company) updateData.company = updates.company;
    if (updates.status) updateData.status = updates.status;
    if (updates.assignees !== undefined) updateData.assignees = updates.assignees;
    if (updates.dueDate) updateData.due_date = updates.dueDate;
    if (updates.week !== undefined) {
      updateData.week = updates.week;
      updateData.is_backlog = updates.week === null || updates.isBacklog;
    }
    if (updates.isBacklog !== undefined) updateData.is_backlog = updates.isBacklog;
    if (updates.comments) updateData.comments = updates.comments;
    if (updates.subtasks !== undefined) updateData.subtasks = updates.subtasks;

    const { data: updated, error } = await supabaseAdmin.from('tasks').update(updateData).eq('task_id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      _id: updated.id,
      id: updated.task_id,
      title: updated.title,
      company: updated.company,
      week: updated.week,
      status: updated.status,
      assignees: updated.assignees || [],
      dueDate: updated.due_date,
      comments: updated.comments || [],
      subtasks: updated.subtasks || [],
      isBacklog: updated.is_backlog || updated.week === null,
      createdAt: updated.created_at || updated.due_date
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

    // Prevent deletion of original tasks (task IDs 1-42)
    const ORIGINAL_TASK_IDS = Array.from({length: 42}, (_, i) => String(i + 1));
    if (ORIGINAL_TASK_IDS.includes(id)) {
      return NextResponse.json({ error: 'Cannot delete original tasks' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('tasks').delete().eq('task_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
