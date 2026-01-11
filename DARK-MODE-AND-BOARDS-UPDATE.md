# Dark Mode & Boards Update

## Changes Made

### 1. Dark Mode Theme - Notion Style ✅

Changed the dark mode color scheme from blue tones to black and gray, matching Notion's aesthetic:

**Previous (Blue Theme):**
- Background: `#191919`
- Foreground: `#e6e6e6`
- Limited color variables

**New (Notion-Style Black/Gray):**
- Background: `#191919` (pure black)
- Foreground: `#e3e3e3` (light gray)
- Card: `#1f1f1f` (dark gray)
- Secondary: `#2a2a2a` (medium gray)
- Muted: `#2a2a2a` with `#a3a3a3` text
- Accent: `#2a2a2a`
- Border: `#2a2a2a`
- Input: `#2a2a2a`
- Ring: `#3a3a3a`

The theme now uses consistent gray tones throughout, eliminating all blue accents and creating a cleaner, more professional look like Notion.

### 2. Editable Board Columns ✅

Added full column management for project boards:

#### Features:
- **Custom columns per board** - Each board can have its own column structure
- **Add columns** - Click "Add Column" button to create new columns
- **Delete columns** - Hover over column header and click the X icon
- **Edit column names** - Click the pencil icon to rename any column
- **Drag & drop tasks** - Move tasks between columns by dragging
- **Persistent storage** - Column configurations saved to localStorage
- **Default configurations** - Pre-configured columns for Ideas and Reading boards

#### Pre-configured Boards:

**Ideas Board:**
- Games
- Big Ideas
- Medium Ideas
- Quick, Easy Ideas
- Ecommerce
- Companies worth copying
- D2C Brands

**Reading/Watching Board:**
- Watchlist
- Movies
- TV Shows
- Books
- Fiction
- Authors

**Other Boards (Default):**
- To Do
- In Progress
- Review
- Done

## Files Modified

1. **app/globals.css**
   - Updated CSS variables for Notion-style dark mode
   - Added comprehensive color system (card, popover, primary, secondary, muted, accent, etc.)
   - Removed all blue color references

2. **lib/types.ts**
   - Added `BoardColumn` interface
   - Added `BoardConfig` interface
   - Added `boardColumn` field to Task interface

3. **lib/boardConfigs.ts** (NEW)
   - Default board configurations
   - Functions to load/save board configs to localStorage
   - Pre-configured setups for Ideas and Reading boards

4. **components/BoardView.tsx** (NEW)
   - Complete Kanban-style board view component
   - Editable column headers
   - Add/delete columns functionality
   - Drag and drop support
   - Responsive design

## How to Use

### Accessing Boards
1. Open the sidebar
2. Expand the "BOARDS" section
3. Click on any board (Apps, Ideas, Reading, etc.)

### Managing Columns
1. **Add Column**: Click the "Add Column" button in the top right
2. **Edit Column Name**:
   - Hover over a column header
   - Click the pencil icon
   - Type the new name and press Enter (or click the checkmark)
3. **Delete Column**:
   - Hover over a column header
   - Click the X icon
   - Confirm deletion (tasks will be moved to the first column)

### Managing Tasks
1. **Add Task**: Click "Add Item" button
2. **Move Task**: Drag and drop between columns
3. **View/Edit Task**: Click on any task card

### Column Configuration Persistence
- Each board's column structure is saved automatically
- Configurations persist across sessions (stored in browser localStorage)
- You can reset to defaults by clearing localStorage or deleting the board config

## Technical Details

### Color Variables
The dark mode now uses CSS custom properties that follow a consistent gray scale:
- Base background: `#191919`
- Elevated surfaces: `#1f1f1f`
- Interactive elements: `#2a2a2a`
- Borders and separators: `#2a2a2a`
- Hover states: `#3a3a3a`

### Board Column Storage
```typescript
interface BoardColumn {
  id: string;
  name: string;
  order: number;
}

interface BoardConfig {
  boardId: string;
  columns: BoardColumn[];
}
```

Stored in localStorage as: `board-config-${boardId}`

## Integration Notes

To use the new BoardView in your application, replace the ProjectBoardView component calls with:

```tsx
import { BoardView } from '@/components/BoardView';

<BoardView
  projectName={selectedProject}
  tasks={filteredTasks.filter(t => t.project === selectedProject)}
  onTaskClick={setSelectedTask}
  onCreateTask={() => createTask(null, 'todo')}
  onUpdateTask={updateTask}
  isAdmin={isAdmin}
/>
```

Make sure tasks have the `boardColumn` field populated. For existing tasks, you can migrate them to use the first column of each board's default configuration.
