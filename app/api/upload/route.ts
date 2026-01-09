import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // No auth - personal task tracker
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;

    if (!file || !taskId) {
      return NextResponse.json({ error: 'Missing file or taskId' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${taskId}/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);

    // Create attachment object
    const attachment = {
      id: `att_${timestamp}`,
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'User',
    };

    // Update task in database with new attachment
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('attachments')
      .eq('task_id', taskId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentAttachments = task?.attachments || [];
    const updatedAttachments = [...currentAttachments, attachment];

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ attachments: updatedAttachments })
      .eq('task_id', taskId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ attachment }, { status: 200 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // No auth - personal task tracker
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const attachmentId = searchParams.get('attachmentId');

    if (!taskId || !attachmentId) {
      return NextResponse.json({ error: 'Missing taskId or attachmentId' }, { status: 400 });
    }

    // Get current task attachments
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('attachments')
      .eq('task_id', taskId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentAttachments = task?.attachments || [];
    const attachmentToDelete = currentAttachments.find((att: any) => att.id === attachmentId);

    if (!attachmentToDelete) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Extract file path from URL
    const urlParts = attachmentToDelete.url.split('/task-attachments/');
    const filePath = urlParts[1];

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('task-attachments')
      .remove([filePath]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
    }

    // Remove from task attachments array
    const updatedAttachments = currentAttachments.filter((att: any) => att.id !== attachmentId);

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ attachments: updatedAttachments })
      .eq('task_id', taskId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
