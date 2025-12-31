# Task Attachments - Setup Guide

File upload functionality has been successfully implemented for your task tracker! Here's everything you need to know.

## Features Implemented

✅ **File Upload with Compression**
- Images are automatically compressed before upload (max 1920x1920, 80% quality)
- Supports multiple file types: images, PDFs, documents, spreadsheets
- Multiple file upload support
- Upload progress indicator

✅ **Attachment Display**
- Image thumbnails in task modal
- File type icons for non-image files
- File size and uploader information
- Attachment count badge on task cards (📎 N files)

✅ **File Management**
- View attachments in new tab
- Download capability
- Delete attachments (admin only)
- All attachments stored securely in Supabase Storage

## Setup Instructions

### Step 1: Add Database Column

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Add attachments column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING gin(attachments);

-- Add comment for documentation
COMMENT ON COLUMN tasks.attachments IS 'Array of attachment objects with id, name, url, type, size, uploadedAt, uploadedBy';
```

6. Click **Run** or press `Ctrl/Cmd + Enter`
7. You should see: "Success. No rows returned"

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, navigate to **Storage** (left sidebar)
2. Click **Create a new bucket** or **New Bucket**
3. Configure the bucket:
   - **Name**: `task-attachments` (must be exactly this name)
   - **Public bucket**: ✅ **Yes** (toggle ON)
   - **File size limit**: 50 MB (or adjust as needed)
   - **Allowed MIME types**: Leave empty for all types, or specify:
     ```
     image/*
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     text/*
     ```
4. Click **Create bucket**

### Step 3: Set Up Storage Policies

After creating the bucket, set up Row Level Security (RLS) policies:

1. Click on the `task-attachments` bucket
2. Go to **Policies** tab
3. Click **New Policy**

**Policy 1: Allow authenticated uploads**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');
```

**Policy 2: Allow public access (read)**
```sql
CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-attachments');
```

**Policy 3: Allow authenticated deletes**
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');
```

Alternatively, you can use the Supabase UI to create these policies:
- Click **New Policy** → **For full customization**
- Set the policy name, operation (INSERT/SELECT/DELETE), and target roles
- Copy the USING/WITH CHECK expressions from above

### Step 4: Test the Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in to your task tracker
3. Open any task (click on a task card)
4. Scroll down to the **Attachments** section
5. Click **"📎 Click to attach files or drag & drop"**
6. Upload a test image or file
7. Verify:
   - Upload progress shows
   - File appears in the attachments list
   - Image thumbnails display correctly
   - Task card shows "📎 1 file" badge

## How It Works

### Image Compression

All images are automatically compressed before upload:
- **Max dimensions**: 1920x1920 pixels
- **Quality**: 80% (JPEG)
- **Format**: Converted to JPEG for optimal size
- This helps maximize your 1GB free storage!

### File Organization

Files are organized by task ID:
```
task-attachments/
├── task_001/
│   ├── 1234567890-screenshot.png
│   ├── 1234567891-document.pdf
│   └── 1234567892-design.jpg
├── task_002/
│   └── 1234567893-image.png
```

### Supported File Types

- **Images**: PNG, JPG, JPEG, GIF, WebP (auto-compressed)
- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: XLS, XLSX
- **Text**: TXT, MD
- **Max size**: 50MB per file (configurable)

## Usage

### Uploading Files

1. Open a task modal
2. Scroll to **Attachments** section
3. Click the upload button
4. Select one or multiple files
5. Wait for upload to complete
6. Files appear immediately in the list

### Viewing Files

- **Images**: Click thumbnail to open in new tab
- **Other files**: Click **View** button to open/download
- All files open in a new browser tab

### Deleting Files (Admin Only)

1. Click **Delete** button next to any attachment
2. Confirm deletion
3. File is removed from both database and storage

## Files Modified/Created

### New Files
- `app/api/upload/route.ts` - API endpoint for upload/delete
- `add-attachments.sql` - Database migration SQL
- `add-attachments-column.mjs` - Migration helper script
- `supabase-storage-setup.md` - Detailed storage setup guide
- `ATTACHMENTS-SETUP.md` - This file

### Modified Files
- `app/page.tsx` - Added:
  - `Attachment` interface
  - `attachments` field to `Task` interface
  - File upload/delete handlers with image compression
  - Attachments UI in TaskModal
  - Attachment count badges on task cards (all views)

## Storage Limits

**Supabase Free Tier:**
- 1 GB storage
- With image compression, you can store approximately:
  - 2,000-5,000 compressed screenshots/images
  - 500-1,000 PDFs (depending on size)
  - Mix of file types

**Tips to maximize storage:**
- Images are auto-compressed (saves 60-80% space)
- Delete old/unused attachments
- Consider upgrading to Pro ($25/mo) for 100 GB if needed

## Troubleshooting

### "Upload failed" error
- Check Supabase storage bucket exists and is named `task-attachments`
- Verify storage policies are set up correctly
- Check browser console for detailed error message

### "Unauthorized" error
- Ensure you're logged in
- Check NextAuth session is valid

### Images not displaying
- Verify bucket is set to **public**
- Check the image URL in browser (should be accessible)
- Ensure storage SELECT policy allows public access

### Column doesn't exist error
- Run the SQL migration from Step 1
- Verify column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'attachments';`

## Next Steps

After setup is complete:
1. Test uploading different file types
2. Verify compression is working (check file sizes in Storage)
3. Test on mobile devices
4. Consider monitoring storage usage in Supabase Dashboard
5. Deploy to Vercel when ready

## Questions?

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify all setup steps were completed
4. Check that environment variables are correct in `.env.local`

Enjoy your new file upload feature! 🎉
