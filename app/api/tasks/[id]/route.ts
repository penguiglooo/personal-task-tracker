import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // No auth - personal task tracker
    const { id } = await params;

    const { data: task } = await supabaseAdmin.from('tasks').select('*').eq('task_id', id).single();
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const updates = await request.json();
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.company) updateData.company = updates.company;
    if (updates.status) updateData.status = updates.status;
    if (updates.assignees !== undefined) updateData.assignees = updates.assignees;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.dueDate) updateData.due_date = updates.dueDate;
    if (updates.week !== undefined) {
      updateData.week = updates.week;
      updateData.is_backlog = updates.week === null || updates.isBacklog;
    }
    if (updates.isBacklog !== undefined) updateData.is_backlog = updates.isBacklog;
    if (updates.project !== undefined) updateData.project = updates.project;
    if (updates.comments) updateData.comments = updates.comments;
    if (updates.subtasks !== undefined) updateData.subtasks = updates.subtasks;
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.importance !== undefined) updateData.importance = updates.importance;
    if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
    if (updates.activityLog !== undefined) updateData.activity_log = updates.activityLog;

    const { data: updated, error } = await supabaseAdmin.from('tasks').update(updateData).eq('task_id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      _id: updated.id,
      id: updated.task_id,
      title: updated.title,
      description: updated.description,
      company: updated.company,
      week: updated.week,
      status: updated.status,
      assignees: updated.assignees || [],
      startDate: updated.start_date,
      dueDate: updated.due_date,
      comments: updated.comments || [],
      subtasks: updated.subtasks || [],
      difficulty: updated.difficulty,
      importance: updated.importance,
      attachments: updated.attachments || [],
      activityLog: updated.activity_log || [],
      isBacklog: updated.is_backlog || updated.week === null,
      project: updated.project,
      createdAt: updated.created_at || updated.due_date
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // No auth - personal task tracker
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
