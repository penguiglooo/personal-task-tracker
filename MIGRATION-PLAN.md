# Personal Task Tracker - Migration Plan

## Current Status Summary

### ✅ Working
- App deployed at: https://personal-task-tracker-wheat.vercel.app/
- Database: Supabase at https://idgqtmjprzmtdxqngeyv.supabase.co
- Authentication with NextAuth.js
- Core task management features

### ❌ Issues Found

#### 1. Schema Mismatch
The base `supabase-schema.sql` is outdated. Individual migration files exist but aren't reflected in the master schema:
- ✅ Created: `supabase-schema-complete.sql` (consolidated, up-to-date schema)

#### 2. TypeScript Types Out of Sync
`lib/supabase.ts` Database types don't include:
- `description`, `assignees` (array), `subtasks`, `attachments`
- `difficulty`, `importance`, `is_backlog`, `start_date`

#### 3. Task Creation Lag in Kanban View
**Location**: `app/page.tsx:846`
**Problem**: After creating a task, it calls `await fetchTasks()` which refetches ALL tasks from the database, causing noticeable lag.
**Solution**: Implement optimistic UI updates - add the created task to local state immediately, no need to refetch all tasks.

#### 4. File Upload Not Working
**Problem**: Storage bucket `task-attachments` may not be created in Supabase
**Solution**: Follow `supabase-storage-setup.md` to create bucket and set policies

#### 5. Difficulty & Importance Not Saving
**Problem**: Migration file exists (`add-difficulty-importance.sql`) but may not have been applied to production database
**Solution**: Verify and run migration on Supabase

## Action Plan

### Step 1: Verify Database Schema
Run migrations that may be missing:
1. `add-description.sql` - Adds description column
2. `migrate-assignees.sql` - Changes assignee to assignees array
3. `add-subtasks-column.sql` - Adds subtasks JSONB column
4. `add-attachments.sql` - Adds attachments JSONB column
5. `add-difficulty-importance.sql` - Adds difficulty and importance columns
6. `migrate-backlog.sql` - Adds is_backlog boolean column

**How to verify**: Cannot run verification script without proper Supabase credentials from Vercel environment.

### Step 2: Update TypeScript Types
Update `lib/supabase.ts` to match the complete schema.

### Step 3: Fix Task Creation UX
Modify `createTask` function in `app/page.tsx` to:
- Add task optimistically to local state immediately
- Show task modal right away
- Handle backend sync in background
- Revert on error

### Step 4: File Upload Setup
1. Verify `task-attachments` bucket exists in Supabase
2. If not, create it with public access
3. Set up RLS policies for authenticated uploads/deletes

### Step 5: Test Everything
- Test task creation (should be instant)
- Test file uploads
- Test difficulty/importance saving
- Verify all fields persist correctly

## Next Steps After Fixes

Once all issues are resolved, proceed with:
1. **Trello Import**: Create import script to seed database from Trello export
2. **Project-Based Boards**: Add `project` field and board-based organization (Shopping, TV Shows, Chores, etc.)

## Files Modified/Created

### Created:
- `supabase-schema-complete.sql` - Consolidated schema with all migrations
- `MIGRATION-PLAN.md` - This file
- `verify-schema.mjs` - Schema verification script (requires Vercel env vars to run)

### To Modify:
- `lib/supabase.ts` - Update TypeScript types
- `app/page.tsx` - Fix createTask function for optimistic updates
- `supabase-schema.sql` - Can be replaced with `supabase-schema-complete.sql` or kept as historical reference
