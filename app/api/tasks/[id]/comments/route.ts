import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // No auth - personal task tracker
    const { id } = await params;

    const { data: task } = await supabaseAdmin.from('tasks').select('*').eq('task_id', id).single();
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const { text } = await request.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });

    const newComment = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      userId: 'user',
      userName: 'User',
    };

    const comments = [...(task.comments || []), newComment];
    const { error } = await supabaseAdmin.from('tasks').update({ comments }).eq('task_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(newComment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
