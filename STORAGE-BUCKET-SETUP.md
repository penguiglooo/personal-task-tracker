# Storage Bucket Setup for File Attachments

File uploads are currently not working because the storage bucket needs to be created.

## Quick Setup (5 minutes)

### Step 1: Create the Bucket

1. Go to: https://supabase.com/dashboard/project/idgqtmjprzmtdxqngeyv/storage/buckets
2. Click **"New Bucket"**
3. Configure:
   - **Name**: `task-attachments`
   - **Public bucket**: ✅ Yes (check this box)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: Leave empty (allow all file types)
4. Click **"Create bucket"**

### Step 2: Set Up Security Policies

1. Go to: https://supabase.com/dashboard/project/idgqtmjprzmtdxqngeyv/sql
2. Copy and paste this SQL:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Allow anyone to view files (public bucket)
CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-attachments');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');
```

3. Click **"Run"**

### Step 3: Test It

1. Go to your deployed app: https://personal-task-tracker-wheat.vercel.app/
2. Open any task
3. Try uploading a file
4. It should work now! ✅

## Troubleshooting

### If uploads still fail:

1. **Check the bucket exists**:
   - Go to Storage → Buckets
   - Verify `task-attachments` is listed
   - Verify it's marked as "Public"

2. **Check the policies**:
   - Go to Storage → Policies
   - Should see 3 policies for `task-attachments`
   - If not, re-run the SQL from Step 2

3. **Check browser console**:
   - Open DevTools (F12)
   - Try uploading
   - Look for error messages in Console tab

## File Organization

Files are organized by task ID:
```
task-attachments/
├── 1767945577588/
│   ├── 1736412345678-screenshot.png
│   └── 1736412389012-document.pdf
├── 1767945612345/
│   └── 1736412456789-image.jpg
```

## Supported File Types

Currently allows all file types. To restrict:
1. Edit the bucket settings
2. Add specific MIME types like:
   - `image/*` - All images
   - `application/pdf` - PDFs only
   - `text/*` - Text files
   - `application/msword` - Word docs

## Storage Limits

- Default: 1 GB free tier
- File size: Max 50 MB per file
- Upgrade plan if you need more storage
