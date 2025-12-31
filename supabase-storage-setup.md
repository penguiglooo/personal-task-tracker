# Supabase Storage Setup for Task Attachments

## Steps to set up storage bucket:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to Storage in the left sidebar
4. Click "New Bucket"
5. Create a bucket with these settings:
   - **Name**: `task-attachments`
   - **Public bucket**: Yes (so files can be accessed via URLs)
   - **File size limit**: 50MB (adjust as needed)
   - **Allowed MIME types**: Leave empty for all types, or restrict to:
     - `image/*` for images
     - `application/pdf` for PDFs
     - `application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document` for Word docs
     - `text/*` for text files

## Storage Policies (RLS):

After creating the bucket, set up these policies:

### 1. Allow authenticated users to upload files:
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');
```

### 2. Allow anyone to view files (public bucket):
```sql
CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-attachments');
```

### 3. Allow authenticated users to delete their files:
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');
```

## Environment Variables:

Your `.env.local` should already have:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage in Code:

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('task-attachments')
  .upload(`${taskId}/${fileName}`, file);

// Get public URL
const { data } = supabase.storage
  .from('task-attachments')
  .getPublicUrl(filePath);

// Delete file
const { error } = await supabase.storage
  .from('task-attachments')
  .remove([filePath]);
```

## File Structure:

Files will be organized by task ID:
```
task-attachments/
├── task_001/
│   ├── screenshot-1.png
│   ├── document.pdf
│   └── design.jpg
├── task_002/
│   └── image.png
```
