import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userRole = (session.user as any).role;
    const userName = session.user.name;
    const userId = (session.user as any).id;

    const { data: task } = await supabaseAdmin.from('tasks').select('*').eq('task_id', id).single();
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (userRole === 'viewer' && task.assignee !== userName) {
      return NextResponse.json({ error: 'You can only comment on tasks assigned to you' }, { status: 403 });
    }

    const { text } = await request.json();
    if (!text?.trim()) return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });

    const newComment = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      userId,
      userName: userName || 'Unknown',
    };

    const comments = [...(task.comments || []), newComment];
    const { error } = await supabaseAdmin.from('tasks').update({ comments }).eq('task_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(newComment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
