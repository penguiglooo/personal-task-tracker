import { useState, useEffect } from 'react';
import { Task, BoardColumn, BoardConfig } from '@/lib/types';
import { loadBoardConfig, saveBoardConfig } from '@/lib/boardConfigs';
import { Plus, X, GripVertical, Pencil, Check } from 'lucide-react';

interface BoardViewProps {
  projectName: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  isAdmin: boolean;
}

export function BoardView({
  projectName,
  tasks,
  onTaskClick,
  onCreateTask,
  onUpdateTask,
  isAdmin,
}: BoardViewProps) {
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Load board config on mount (client-side only)
  useEffect(() => {
    setBoardConfig(loadBoardConfig(projectName));
  }, [projectName]);

  // Save board config when it changes
  useEffect(() => {
    if (boardConfig) {
      saveBoardConfig(boardConfig);
    }
  }, [boardConfig]);

  // Don't render until config is loaded
  if (!boardConfig) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const addColumn = () => {
    const newColumn: BoardColumn = {
      id: `col-${Date.now()}`,
      name: 'New Column',
      order: boardConfig.columns.length,
    };
    setBoardConfig({
      ...boardConfig,
      columns: [...boardConfig.columns, newColumn],
    });
    setEditingColumnId(newColumn.id);
    setEditingColumnName(newColumn.name);
  };

  const deleteColumn = (columnId: string) => {
    if (!confirm('Delete this column? Tasks in this column will be moved to the first column.')) {
      return;
    }

    // Move tasks from deleted column to first column
    const firstColumnId = boardConfig.columns[0]?.id;
    tasks
      .filter((t) => t.boardColumn === columnId)
      .forEach((t) => {
        onUpdateTask(t.id, { boardColumn: firstColumnId });
      });

    setBoardConfig({
      ...boardConfig,
      columns: boardConfig.columns.filter((c) => c.id !== columnId),
    });
  };

  const startEditColumn = (column: BoardColumn) => {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
  };

  const saveColumnName = () => {
    if (editingColumnId && editingColumnName.trim()) {
      setBoardConfig({
        ...boardConfig,
        columns: boardConfig.columns.map((c) =>
          c.id === editingColumnId ? { ...c, name: editingColumnName.trim() } : c
        ),
      });
    }
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const cancelEditColumn = () => {
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.boardColumn !== columnId) {
      onUpdateTask(draggedTask.id, { boardColumn: columnId });
    }
    setDraggedTask(null);
  };

  const getColumnTasks = (columnId: string) => {
    return tasks.filter((t) => t.boardColumn === columnId);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {projectName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} {tasks.length === 1 ? 'item' : 'items'} in this board
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={addColumn}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Column
            </button>
            <button
              onClick={onCreateTask}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full pb-4">
          {boardConfig.columns.map((column) => {
            const columnTasks = getColumnTasks(column.id);

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80 flex flex-col bg-card border border-border rounded-lg"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-border flex items-center justify-between group">
                  {editingColumnId === column.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveColumnName();
                          if (e.key === 'Escape') cancelEditColumn();
                        }}
                        className="flex-1 px-2 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                      />
                      <button
                        onClick={saveColumnName}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </button>
                      <button
                        onClick={cancelEditColumn}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="font-semibold text-card-foreground">
                          {column.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {columnTasks.length}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditColumn(column)}
                            className="p-1 hover:bg-accent rounded"
                            title="Edit column name"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => deleteColumn(column.id)}
                            className="p-1 hover:bg-destructive/10 rounded"
                            title="Delete column"
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Column Tasks */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No items
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => onTaskClick(task)}
                        className="p-3 bg-card border border-border rounded-lg hover:shadow-md cursor-pointer transition-all group"
                      >
                        <div className="font-medium text-card-foreground mb-1">
                          {task.title || 'Untitled'}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {task.difficulty && (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                task.difficulty === 'Hard'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : task.difficulty === 'Medium'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              }`}
                            >
                              {task.difficulty}
                            </span>
                          )}
                          {task.importance && (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                task.importance === 'Critical'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : task.importance === 'High'
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                  : task.importance === 'Medium'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {task.importance}
                            </span>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="text-muted-foreground">
                              ✅ {task.subtasks.filter((st) => st.completed).length}/
                              {task.subtasks.length}
                            </span>
                          )}
                          {task.comments && task.comments.length > 0 && (
                            <span className="text-muted-foreground">
                              💬 {task.comments.length}
                            </span>
                          )}
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="text-muted-foreground">
                              📎 {task.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
