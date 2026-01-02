'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Comment {
  id: string;
  text: string;
  timestamp: string;
  userId: string;
  userName: string;
}

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  assignee: string | null;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  };
}

interface Task {
  _id: string;
  id: string;
  title: string;
  description?: string;
  company: 'Muncho' | 'Foan' | 'Both';
  week: number | null;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  assignees: string[];
  startDate?: string;
  dueDate: string;
  comments: Comment[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
  activityLog?: ActivityLog[];
  isBacklog?: boolean;
  createdAt: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  importance?: 'Low' | 'Medium' | 'High' | 'Critical';
}

const TEAM_MEMBERS = ['Dhruv', 'Akaash', 'Swapnil', 'Sneha', 'Aniket', 'Saurabh'];
const STATUS_COLUMNS = ['todo', 'inProgress', 'review', 'done'] as const;
const STATUS_LABELS = {
  todo: 'To Do',
  inProgress: 'In Progress',
  review: 'Review',
  done: 'Done'
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [view, setView] = useState('week1');
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');
  const [selectedWeekForWeekView, setSelectedWeekForWeekView] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<string>('todo');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'admin';

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
    }
  }, []);

  // Save dark mode preference and apply to document
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user as any)?.mustChangePassword) {
      router.push('/change-password');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTasks();
    }
  }, [status]);

  useEffect(() => {
    // Apply user filter for admins
    if (userFilter.length === 0) {
      // No filter selected, show all tasks
      setFilteredTasks(tasks);
    } else {
      // Filter tasks that have at least one assignee matching the selected filters
      setFilteredTasks(tasks.filter(task => {
        // Handle 'null' filter for unassigned tasks
        if (userFilter.includes('null')) {
          if (!task.assignees || task.assignees.length === 0) return true;
        }
        // Check if task has any of the selected assignees
        if (task.assignees && task.assignees.some(assignee => userFilter.includes(assignee))) {
          return true;
        }
        return false;
      }));
    }
  }, [userFilter, tasks]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        setFilteredTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>, closeModal: boolean = false) => {
    try {
      // Find the current task to track changes
      const currentTask = tasks.find(t => t.id === taskId);
      const userName = session?.user?.name || 'Unknown';

      // Generate activity logs for changes
      const newActivityLogs: ActivityLog[] = [];

      if (currentTask) {
        // Track status changes
        if (updates.status && updates.status !== currentTask.status) {
          newActivityLogs.push({
            id: `${Date.now()}-status`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `moved task from ${STATUS_LABELS[currentTask.status]} to ${STATUS_LABELS[updates.status]}`,
            changes: {
              field: 'Status',
              oldValue: STATUS_LABELS[currentTask.status],
              newValue: STATUS_LABELS[updates.status]
            }
          });
        }

        // Track week changes
        if (updates.week !== undefined && updates.week !== currentTask.week) {
          newActivityLogs.push({
            id: `${Date.now()}-week`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `moved task from Week ${currentTask.week || 'Backlog'} to Week ${updates.week || 'Backlog'}`,
            changes: {
              field: 'Week',
              oldValue: currentTask.week || 'Backlog',
              newValue: updates.week || 'Backlog'
            }
          });
        }

        // Track assignee changes
        if (updates.assignees && JSON.stringify(updates.assignees) !== JSON.stringify(currentTask.assignees)) {
          newActivityLogs.push({
            id: `${Date.now()}-assignees`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed assignees`,
            changes: {
              field: 'Assignees',
              oldValue: currentTask.assignees.join(', ') || 'None',
              newValue: updates.assignees.join(', ') || 'None'
            }
          });
        }

        // Track subtask changes
        if (updates.subtasks && JSON.stringify(updates.subtasks) !== JSON.stringify(currentTask.subtasks)) {
          const oldSubtasks = currentTask.subtasks || [];
          const newSubtasks = updates.subtasks || [];

          // Check if subtasks were added
          if (newSubtasks.length > oldSubtasks.length) {
            const addedCount = newSubtasks.length - oldSubtasks.length;
            const addedSubtasks = newSubtasks.slice(-addedCount);
            addedSubtasks.forEach(subtask => {
              newActivityLogs.push({
                id: `${Date.now()}-subtask-add-${subtask.id}`,
                timestamp: new Date().toISOString(),
                user: userName,
                action: `added subtask: "${subtask.text}"`,
              });
            });
          }

          // Check if subtasks were deleted
          if (newSubtasks.length < oldSubtasks.length) {
            const deletedCount = oldSubtasks.length - newSubtasks.length;
            const oldIds = oldSubtasks.map(st => st.id);
            const newIds = newSubtasks.map(st => st.id);
            const deletedIds = oldIds.filter(id => !newIds.includes(id));
            deletedIds.forEach(id => {
              const deletedSubtask = oldSubtasks.find(st => st.id === id);
              if (deletedSubtask) {
                newActivityLogs.push({
                  id: `${Date.now()}-subtask-delete-${id}`,
                  timestamp: new Date().toISOString(),
                  user: userName,
                  action: `deleted subtask: "${deletedSubtask.text}"`,
                });
              }
            });
          }

          // Check for completion status changes
          const oldCompleted = oldSubtasks.filter(st => st.completed).length;
          const newCompleted = newSubtasks.filter(st => st.completed).length;
          if (oldCompleted !== newCompleted && newSubtasks.length === oldSubtasks.length) {
            // Find which subtask was toggled
            for (const newSubtask of newSubtasks) {
              const oldSubtask = oldSubtasks.find(st => st.id === newSubtask.id);
              if (oldSubtask && oldSubtask.completed !== newSubtask.completed) {
                newActivityLogs.push({
                  id: `${Date.now()}-subtask-toggle-${newSubtask.id}`,
                  timestamp: new Date().toISOString(),
                  user: userName,
                  action: newSubtask.completed
                    ? `completed subtask: "${newSubtask.text}"`
                    : `marked subtask as incomplete: "${newSubtask.text}"`,
                });
              }
            }
          }

          // Check for assignee changes
          for (const newSubtask of newSubtasks) {
            const oldSubtask = oldSubtasks.find(st => st.id === newSubtask.id);
            if (oldSubtask && oldSubtask.assignee !== newSubtask.assignee) {
              const assigneeAction = newSubtask.assignee
                ? `assigned "${newSubtask.text}" to ${newSubtask.assignee}`
                : `unassigned "${newSubtask.text}"`;
              newActivityLogs.push({
                id: `${Date.now()}-subtask-assign-${newSubtask.id}`,
                timestamp: new Date().toISOString(),
                user: userName,
                action: assigneeAction,
              });
            }
          }
        }

        // Track title changes
        if (updates.title && updates.title !== currentTask.title) {
          newActivityLogs.push({
            id: `${Date.now()}-title`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed task title`,
            changes: {
              field: 'Title',
              oldValue: currentTask.title,
              newValue: updates.title
            }
          });
        }

        // Track company changes
        if (updates.company && updates.company !== currentTask.company) {
          newActivityLogs.push({
            id: `${Date.now()}-company`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed company`,
            changes: {
              field: 'Company',
              oldValue: currentTask.company,
              newValue: updates.company
            }
          });
        }

        // Track due date changes
        if (updates.dueDate && updates.dueDate !== currentTask.dueDate) {
          newActivityLogs.push({
            id: `${Date.now()}-duedate`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed due date`,
            changes: {
              field: 'Due Date',
              oldValue: new Date(currentTask.dueDate).toLocaleDateString(),
              newValue: new Date(updates.dueDate).toLocaleDateString()
            }
          });
        }

        // Track start date changes
        if (updates.startDate !== undefined && updates.startDate !== currentTask.startDate) {
          newActivityLogs.push({
            id: `${Date.now()}-startdate`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed start date`,
            changes: {
              field: 'Start Date',
              oldValue: currentTask.startDate ? new Date(currentTask.startDate).toLocaleDateString() : 'None',
              newValue: updates.startDate ? new Date(updates.startDate).toLocaleDateString() : 'None'
            }
          });
        }

        // Track difficulty changes
        if (updates.difficulty && updates.difficulty !== currentTask.difficulty) {
          newActivityLogs.push({
            id: `${Date.now()}-difficulty`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed difficulty`,
            changes: {
              field: 'Difficulty',
              oldValue: currentTask.difficulty || 'Not set',
              newValue: updates.difficulty
            }
          });
        }

        // Track importance changes
        if (updates.importance && updates.importance !== currentTask.importance) {
          newActivityLogs.push({
            id: `${Date.now()}-importance`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `changed importance`,
            changes: {
              field: 'Importance',
              oldValue: currentTask.importance || 'Not set',
              newValue: updates.importance
            }
          });
        }

        // Track comment additions
        if (updates.comments && updates.comments.length > (currentTask.comments?.length || 0)) {
          const newComment = updates.comments[updates.comments.length - 1];
          newActivityLogs.push({
            id: `${Date.now()}-comment`,
            timestamp: new Date().toISOString(),
            user: userName,
            action: `added a comment`,
          });
        }
      }

      // Merge new activity logs with existing ones
      const updatedActivityLog = [
        ...(currentTask?.activityLog || []),
        ...newActivityLogs
      ];

      // Add activity log to updates
      const updatesWithLog = {
        ...updates,
        activityLog: updatedActivityLog
      };

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatesWithLog),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        // Only update selectedTask if we're not about to close the modal
        if (!closeModal && selectedTask && selectedTask.id === taskId) {
          setSelectedTask(updatedTask);
        }
        return true;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update task');
        return false;
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
      return false;
    }
  };

  const addComment = async (taskId: string, text: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const newComment = await response.json();
        const userName = session?.user?.name || 'Unknown';
        const currentTask = tasks.find(t => t.id === taskId);

        // Add activity log for comment
        const commentActivityLog: ActivityLog = {
          id: `${Date.now()}-comment`,
          timestamp: new Date().toISOString(),
          user: userName,
          action: `added a comment: "${text.length > 50 ? text.substring(0, 50) + '...' : text}"`,
        };

        const updatedActivityLog = [
          ...(currentTask?.activityLog || []),
          commentActivityLog
        ];

        // Update task with new activity log
        await updateTask(taskId, {
          comments: [...(currentTask?.comments || []), newComment],
          activityLog: updatedActivityLog
        });

        // Optimistically update the selected task immediately
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({
            ...selectedTask,
            comments: [...selectedTask.comments, newComment],
            activityLog: updatedActivityLog
          });
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    }
  };

  const createTask = async (weekNum: number | null, status: string) => {
    // Auto-assign based on current filter
    let autoAssignees: string[] = [];

    if (isAdmin) {
      // For admins: auto-assign if filtering by specific users (excluding 'null')
      const validFilters = userFilter.filter(f => f !== 'null' && TEAM_MEMBERS.includes(f));
      if (validFilters.length > 0) {
        autoAssignees = validFilters;
      }
    } else {
      // For non-admin users: always auto-assign themselves
      if (session?.user?.name) {
        autoAssignees = [session.user.name];
      }
    }

    const newTask: Partial<Task> = {
      title: '',
      company: 'Muncho',
      week: weekNum,
      status: status as any,
      assignees: autoAssignees,
      dueDate: weekNum === null ? new Date().toISOString().split('T')[0] : getDefaultDateForWeek(weekNum),
      isBacklog: weekNum === null,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        const createdTask = await response.json();
        await fetchTasks();
        setSelectedTask(createdTask);
        setIsCreatingTask(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const getDefaultDateForWeek = (weekNum: number) => {
    const startDays = [1, 8, 16, 24];
    const day = startDays[weekNum - 1];
    return `2026-01-${String(day).padStart(2, '0')}`;
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTasks();
        setSelectedTask(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  };

  const canDeleteTask = (taskId: string) => {
    const ORIGINAL_TASK_IDS = Array.from({length: 42}, (_, i) => String(i + 1));
    return !ORIGINAL_TASK_IDS.includes(taskId);
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetNewPassword) {
      alert('Please enter email and new password');
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPassword: resetNewPassword })
      });

      if (response.ok) {
        alert(`Password reset successfully for ${resetEmail}`);
        setShowResetPassword(false);
        setResetEmail('');
        setResetNewPassword('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('currentStatus', task.status);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      // Optimistically update UI immediately
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: newStatus as any } : t
        ));
        setFilteredTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: newStatus as any } : t
        ));
      }

      // Then update in backend and revert if it fails
      const success = await updateTask(taskId, { status: newStatus as any });
      if (!success && taskToUpdate) {
        // Revert on failure
        setTasks(prev => prev.map(t =>
          t.id === taskId ? taskToUpdate : t
        ));
        setFilteredTasks(prev => prev.map(t =>
          t.id === taskId ? taskToUpdate : t
        ));
      }
    }
  };

  const handleCardDragOver = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCardDrop = async (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedTaskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    if (!draggedTaskId || draggedTaskId === targetTask.id) {
      return;
    }

    // If dragging within the same column, reorder the tasks
    if (currentStatus === targetTask.status) {
      const draggedTask = tasks.find(t => t.id === draggedTaskId);
      if (!draggedTask) return;

      // Get all tasks in this column
      const columnTasks = filteredTasks.filter(t => t.status === targetTask.status);

      // Remove dragged task and insert it before the target
      const withoutDragged = columnTasks.filter(t => t.id !== draggedTaskId);
      const targetIndex = withoutDragged.findIndex(t => t.id === targetTask.id);

      // Reorder locally for immediate feedback
      const reordered = [
        ...withoutDragged.slice(0, targetIndex),
        draggedTask,
        ...withoutDragged.slice(targetIndex)
      ];

      // Update the tasks state with new order
      const otherTasks = tasks.filter(t => t.status !== targetTask.status);
      setTasks([...otherTasks, ...reordered]);
    } else {
      // Different status - change the status
      await updateTask(draggedTaskId, { status: targetTask.status as any });
    }
  };

  const getWeekFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();

    if (day <= 7) return 1;
    if (day <= 15) return 2;
    if (day <= 23) return 3;
    return 4;
  };

  const renderBacklog = () => {
    const backlogTasks = filteredTasks.filter(t => t.week === null || t.isBacklog);
    const munchoTasks = backlogTasks.filter(t => t.company === 'Muncho' || t.company === 'Both');
    const foanTasks = backlogTasks.filter(t => t.company === 'Foan' || t.company === 'Both');

    const renderBacklogCard = (task: Task) => (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-[#404040] rounded-lg p-3 hover:shadow-md cursor-pointer transition-all hover:border-gray-300 dark:hover:border-[#4a4a4a]"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight flex-1">{task.title || '(No title)'}</h3>
          {task.importance && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
              task.importance === 'Low' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
              task.importance === 'Medium' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
              task.importance === 'High' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
              'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
            }`}>
              {task.importance === 'Critical' ? '⚠️' : task.importance.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className={`px-1.5 py-0.5 rounded ${
            task.status === 'done' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
            task.status === 'review' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
            task.status === 'inProgress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
          }`}>
            {STATUS_LABELS[task.status]}
          </span>
          {task.difficulty && (
            <span className={`px-1.5 py-0.5 rounded ${
              task.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
              task.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
              'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
            }`}>
              {task.difficulty.charAt(0)}
            </span>
          )}
          {task.assignees && task.assignees.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 px-1.5 py-0.5 rounded">
              👤 {task.assignees.join(', ')}
            </span>
          )}
        </div>
      </div>
    );

    return (
      <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737]">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📋 Backlog</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {isAdmin
                ? 'Tasks waiting to be assigned to a specific week. Click on a task to assign it to a week.'
                : 'Tasks in backlog waiting to be scheduled.'
              }
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => createTask(null, 'todo')}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 text-sm font-medium"
            >
              + Add Backlog Task
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Muncho Backlog */}
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Muncho Backlog
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({munchoTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {munchoTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  No Muncho tasks in backlog
                </div>
              ) : (
                munchoTasks.map(renderBacklogCard)
              )}
            </div>
          </div>

          {/* Foan Backlog */}
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-400 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Foan Backlog
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({foanTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {foanTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  No Foan tasks in backlog
                </div>
              ) : (
                foanTasks.map(renderBacklogCard)
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKanban = (weekNum: number) => {
    const weekTasks = filteredTasks.filter(t => t.week === weekNum);

    return (
      <div className="grid grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(status => (
          <div
            key={status}
            className="bg-gray-50 dark:bg-[#252525] rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-lg">
                {STATUS_LABELS[status]}
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({weekTasks.filter(t => t.status === status).length})
                </span>
              </h3>
              {isAdmin && (
                <button
                  onClick={() => createTask(weekNum, status)}
                  className="w-6 h-6 flex items-center justify-center bg-gray-800 dark:bg-[#373737] text-white rounded hover:bg-gray-900 dark:hover:bg-[#404040] text-lg font-bold"
                  title="Add new task"
                >
                  +
                </button>
              )}
            </div>
            <div className="space-y-3">
              {weekTasks.filter(t => t.status === status).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => setSelectedTask(task)}
                  onDragStart={handleDragStart}
                  onDragOver={handleCardDragOver}
                  onDrop={handleCardDrop}
                  canDrag={true}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-[#191919] transition-colors">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">January 2026 Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Muncho & Foan Command Center</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Logged in as {session?.user?.name} ({isAdmin ? 'Admin' : 'Viewer'})
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="relative inline-flex items-center h-7 w-14 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ backgroundColor: darkMode ? '#3b82f6' : '#cbd5e1' }}
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
              <span className={`absolute text-xs transition-opacity ${darkMode ? 'left-1.5 opacity-100' : 'left-1.5 opacity-0'}`}>
                🌙
              </span>
              <span className={`absolute text-xs transition-opacity ${darkMode ? 'right-1.5 opacity-0' : 'right-1.5 opacity-100'}`}>
                ☀️
              </span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowResetPassword(true)}
                className="px-4 py-2 bg-white dark:bg-[#373737] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-[#404040]"
              >
                Reset Password
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 bg-gray-800 dark:bg-[#373737] text-white rounded-lg hover:bg-gray-900 dark:hover:bg-[#404040]"
            >
              Sign Out
            </button>
          </div>
        </header>

        {isAdmin && (
          <div className="mb-6 bg-white dark:bg-[#252525] rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Team Members
              </label>
              {userFilter.length > 0 && (
                <button
                  onClick={() => setUserFilter([])}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {TEAM_MEMBERS.map(member => (
                <label key={member} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2d2d2d] p-2 rounded">
                  <input
                    type="checkbox"
                    checked={userFilter.includes(member)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserFilter([...userFilter, member]);
                      } else {
                        setUserFilter(userFilter.filter(f => f !== member));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-200">{member}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2d2d2d] p-2 rounded">
                <input
                  type="checkbox"
                  checked={userFilter.includes('null')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUserFilter([...userFilter, 'null']);
                    } else {
                      setUserFilter(userFilter.filter(f => f !== 'null'));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">Unassigned</span>
              </label>
            </div>
            {userFilter.length > 0 && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Showing tasks for: {userFilter.map(f => f === 'null' ? 'Unassigned' : f).join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'calendar'
                ? 'bg-gray-800 dark:bg-[#373737] text-white'
                : 'bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setView('backlog')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'backlog'
                ? 'bg-purple-600 dark:bg-purple-700 text-white'
                : 'bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
            }`}
          >
            📋 Backlog
          </button>
          {[1, 2, 3, 4].map(week => (
            <button
              key={week}
              onClick={() => setView(`week${week}`)}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === `week${week}`
                  ? 'bg-gray-800 dark:bg-[#373737] text-white'
                  : 'bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
              }`}
            >
              Week {week} ({[1,8,16,24][week-1]}-{[7,15,23,31][week-1]} Jan)
            </button>
          ))}
          <button
            onClick={() => setView('analytics')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'analytics'
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
            }`}
          >
            📊 Analytics
          </button>
          {isAdmin && (
            <button
              onClick={() => setView('changelog')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'changelog'
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                  : 'bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
              }`}
            >
              📝 Changelog
            </button>
          )}
        </div>

        <div className="mb-6">
          {view === 'calendar' ? (
            <>
              <div className="mb-4 bg-white dark:bg-[#252525] rounded-lg p-4 shadow-sm flex items-center justify-between border dark:border-[#373737]">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarViewMode('month')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      calendarViewMode === 'month'
                        ? 'bg-gray-800 dark:bg-[#373737] text-white'
                        : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333333]'
                    }`}
                  >
                    Month View
                  </button>
                  <button
                    onClick={() => setCalendarViewMode('week')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      calendarViewMode === 'week'
                        ? 'bg-gray-800 dark:bg-[#373737] text-white'
                        : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333333]'
                    }`}
                  >
                    Week View
                  </button>
                </div>
                {calendarViewMode === 'week' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Week:</label>
                    <select
                      value={selectedWeekForWeekView}
                      onChange={(e) => setSelectedWeekForWeekView(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-800 text-gray-900 dark:text-gray-200 dark:bg-[#2d2d2d]"
                    >
                      <option value="1">Week 1 (Jan 1-7)</option>
                      <option value="2">Week 2 (Jan 8-15)</option>
                      <option value="3">Week 3 (Jan 16-23)</option>
                      <option value="4">Week 4 (Jan 24-31)</option>
                    </select>
                  </div>
                )}
              </div>
              {calendarViewMode === 'month' ? (
                <CalendarView
                  tasks={filteredTasks}
                  onTaskClick={setSelectedTask}
                  onTaskDrop={updateTask}
                  onCreateTask={() => createTask(1, 'todo')}
                  isAdmin={isAdmin}
                />
              ) : (
                <WeekView
                  tasks={filteredTasks}
                  weekNumber={selectedWeekForWeekView}
                  onTaskClick={setSelectedTask}
                  onTaskDrop={updateTask}
                  onCreateTask={() => createTask(selectedWeekForWeekView, 'todo')}
                  isAdmin={isAdmin}
                />
              )}
            </>
          ) : view === 'analytics' ? (
            <AnalyticsView tasks={tasks} currentUserName={(session?.user as any)?.name} isAdmin={isAdmin} />
          ) : view === 'changelog' ? (
            <ChangelogView tasks={tasks} />
          ) : view === 'backlog' ? (
            renderBacklog()
          ) : (
            renderKanban(parseInt(view.replace('week', '')))
          )}
        </div>

        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={updateTask}
            onAddComment={addComment}
            onDelete={deleteTask}
            canDelete={canDeleteTask(selectedTask.id)}
            isAdmin={isAdmin}
            getDefaultDateForWeek={getDefaultDateForWeek}
          />
        )}

        {showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Reset User Password</h2>
                <button
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetEmail('');
                    setResetNewPassword('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email
                  </label>
                  <select
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">Select user...</option>
                    <option value="aniket.jadhav@muncho.in">Aniket (aniket.jadhav@muncho.in)</option>
                    <option value="sneha.kumar@muncho.in">Sneha (sneha.kumar@muncho.in)</option>
                    <option value="akaash@muncho.app">Akaash (akaash@muncho.app)</option>
                    <option value="swapnil.sinha@muncho.in">Swapnil (swapnil.sinha@muncho.in)</option>
                    <option value="dhruv@muncho.in">Dhruv (dhruv@muncho.in)</option>
                    <option value="saurabh@foan.ai">Saurabh (saurabh@foan.ai)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    User will be required to change this password on next login
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetEmail('');
                      setResetNewPassword('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  canDrag
}: {
  task: Task;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver?: (e: React.DragEvent, task: Task) => void;
  onDrop?: (e: React.DragEvent, task: Task) => void;
  canDrag: boolean;
}) {
  const getCardAge = () => {
    // Calculate days since card was created
    const createdDate = new Date(task.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    createdDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const cardAge = getCardAge();
  const showAgeBadge = cardAge >= 0;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={onDragOver ? (e) => onDragOver(e, task) : undefined}
      onDrop={onDrop ? (e) => onDrop(e, task) : undefined}
      onClick={onEdit}
      className={`bg-white dark:bg-[#2d2d2d] p-3 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow relative ${
        task.company === 'Muncho' ? 'border-blue-500' :
        task.company === 'Foan' ? 'border-green-500' :
        'border-purple-500'
      } ${!canDrag ? 'cursor-default' : ''}`}
    >
      {showAgeBadge && (
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
          cardAge <= 3 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
          cardAge <= 7 ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300' :
          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
        }`}>
          {cardAge}d
        </div>
      )}
      <div className="font-medium text-gray-900 dark:text-gray-100 mb-2 pr-12">{task.title}</div>
      <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
        <span className={`px-2 py-1 rounded ${
          task.company === 'Muncho' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
          task.company === 'Foan' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
          'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
        }`}>
          {task.company}
        </span>
        {task.difficulty && (
          <span className={`px-2 py-1 rounded font-medium ${
            task.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
            task.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
            'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
          }`}>
            {task.difficulty}
          </span>
        )}
        {task.importance && (
          <span className={`px-2 py-1 rounded font-medium ${
            task.importance === 'Low' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
            task.importance === 'Medium' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
            task.importance === 'High' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
            'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
          }`}>
            {task.importance === 'Critical' ? '⚠️ Critical' : task.importance}
          </span>
        )}
      </div>
      {task.assignees && task.assignees.length > 0 && (
        <div className="text-xs mb-2">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 px-2 py-1 rounded">
            {task.assignees.join(', ')}
          </span>
        </div>
      )}
      {task.comments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          💬 {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
        </div>
      )}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          📎 {task.attachments.length} file{task.attachments.length !== 1 ? 's' : ''}
        </div>
      )}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks</span>
            <span>{Math.round((task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gray-800 dark:bg-gray-400 h-2 rounded-full transition-all"
              style={{ width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({
  tasks,
  onTaskClick,
  onTaskDrop,
  onCreateTask,
  isAdmin
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskId: string, updates: Partial<Task>) => void;
  onCreateTask: () => void;
  isAdmin: boolean;
}) {
  type DateObj = { month: number; day: number; year: number; dateStr: string };
  const [resizingTask, setResizingTask] = useState<{ taskId: string; edge: 'start' | 'end' } | null>(null);

  const calendarDays: DateObj[] = [];

  for (let day = 29; day <= 31; day++) {
    const dateStr = `2025-12-${String(day).padStart(2, '0')}`;
    calendarDays.push({ month: 12, day, year: 2025, dateStr });
  }

  for (let day = 1; day <= 31; day++) {
    const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
    calendarDays.push({ month: 1, day, year: 2026, dateStr });
  }

  const weeks: DateObj[][] = [];
  let currentWeek: DateObj[] = [];

  calendarDays.forEach((dateObj, idx) => {
    currentWeek.push(dateObj);
    if (currentWeek.length === 7 || idx === calendarDays.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Helper to check if a date is between start and due date (inclusive)
  const isDateInTaskRange = (dateStr: string, task: Task) => {
    const taskStart = (task.startDate || task.dueDate).split('T')[0];
    const taskEnd = task.dueDate.split('T')[0];
    return dateStr >= taskStart && dateStr <= taskEnd;
  };

  // Helper to determine if this is the first day of a multi-day task in this week
  const isFirstDayInWeek = (dateStr: string, task: Task, week: DateObj[]) => {
    const taskStart = (task.startDate || task.dueDate).split('T')[0];
    if (dateStr !== taskStart) {
      // Check if start date is in a previous week
      const dateIndex = week.findIndex(d => d.dateStr === dateStr);
      if (dateIndex === 0) {
        // First day of week, check if task started before
        return dateStr > taskStart;
      }
      return false;
    }
    return true;
  };

  // Helper to determine if this is the last day of a multi-day task in this week
  const isLastDayInWeek = (dateStr: string, task: Task, week: DateObj[]) => {
    const taskEnd = task.dueDate.split('T')[0];
    if (dateStr !== taskEnd) {
      // Check if end date is in a later week
      const dateIndex = week.findIndex(d => d.dateStr === dateStr);
      if (dateIndex === 6) {
        // Last day of week, check if task continues
        return dateStr < taskEnd;
      }
      return false;
    }
    return true;
  };

  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEdgeMouseDown = (e: React.MouseEvent, task: Task, edge: 'start' | 'end') => {
    if (!isAdmin) return;
    e.stopPropagation();
    setResizingTask({ taskId: task.id, edge });
  };

  const handleDayMouseEnter = (dateStr: string) => {
    if (!isAdmin || !resizingTask) return;

    const task = tasks.find(t => t.id === resizingTask.taskId);
    if (!task) return;

    const date = new Date(dateStr);
    const day = date.getDate();
    let week = 1;
    if (day <= 7) week = 1;
    else if (day <= 15) week = 2;
    else if (day <= 23) week = 3;
    else week = 4;

    if (resizingTask.edge === 'start') {
      // Ensure start date doesn't go past due date
      const taskEnd = task.dueDate.split('T')[0];
      if (dateStr <= taskEnd) {
        onTaskDrop(task.id, { startDate: dateStr, week });
      }
    } else {
      // Ensure due date doesn't go before start date
      const taskStart = (task.startDate || task.dueDate).split('T')[0];
      if (dateStr >= taskStart) {
        onTaskDrop(task.id, { dueDate: dateStr, week });
      }
    }
  };

  const handleMouseUp = () => {
    setResizingTask(null);
  };

  useEffect(() => {
    if (resizingTask) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [resizingTask]);

  const handleDayDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDayDrop = (e: React.DragEvent, dateStr: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const date = new Date(dateStr);
      const day = date.getDate();
      let week = 1;
      if (day <= 7) week = 1;
      else if (day <= 15) week = 2;
      else if (day <= 23) week = 3;
      else week = 4;

      // If task has a startDate, maintain the duration
      if (task.startDate) {
        const startDate = new Date(task.startDate);
        const dueDate = new Date(task.dueDate);
        const duration = Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const newDueDate = new Date(dateStr);
        newDueDate.setDate(newDueDate.getDate() + duration);
        const newDueDateStr = newDueDate.toISOString().split('T')[0];

        onTaskDrop(taskId, { startDate: dateStr, dueDate: newDueDateStr, week });
      } else {
        onTaskDrop(taskId, { dueDate: dateStr, week });
      }
    }
  };

  return (
    <div className="bg-white dark:bg-[#252525] rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold dark:text-white">December 2025 - January 2026</h2>
        {isAdmin && (
          <button
            onClick={onCreateTask}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add Task
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="font-bold text-center p-2 dark:text-gray-200">{day}</div>
        ))}
        {weeks.map((week, weekIdx) =>
          week.map((dateObj, dayIdx) => {
            if (!dateObj) return <div key={`${weekIdx}-${dayIdx}`} className="min-h-24 bg-gray-100 dark:bg-[#1a1a1a]" />;

            const { dateStr, day, month } = dateObj;
            const isDecember = month === 12;

            // Get tasks that span this day
            const dayTasks = tasks.filter(t => isDateInTaskRange(dateStr, t));

            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={`min-h-24 p-2 border dark:border-gray-700 rounded ${isDecember ? 'bg-gray-50 dark:bg-[#1e1e1e]' : 'bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#303030]'}`}
                onDragOver={handleDayDragOver}
                onDrop={(e) => handleDayDrop(e, dateStr)}
                onMouseEnter={() => handleDayMouseEnter(dateStr)}
              >
                <div className={`font-semibold mb-1 ${isDecember ? 'text-gray-400 dark:text-gray-600' : 'dark:text-gray-300'}`}>
                  {day} {isDecember ? 'Dec' : ''}
                </div>
                <div className="space-y-1">
                  {dayTasks.map(task => {
                    const isMultiDay = task.startDate && task.startDate.split('T')[0] !== task.dueDate.split('T')[0];
                    const isFirstDay = isFirstDayInWeek(dateStr, task, week);
                    const isLastDay = isLastDayInWeek(dateStr, task, week);

                    return (
                      <div
                        key={task.id}
                        draggable={isAdmin && !resizingTask}
                        onDragStart={(e) => handleTaskDragStart(e, task)}
                        className={`text-xs p-1 rounded cursor-pointer relative group ${
                          task.company === 'Muncho' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                          task.company === 'Foan' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                          'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                        } ${isAdmin ? 'cursor-move' : ''} ${
                          isMultiDay && !isFirstDay ? 'rounded-l-none' : ''
                        } ${
                          isMultiDay && !isLastDay ? 'rounded-r-none' : ''
                        }`}
                        onClick={() => onTaskClick(task)}
                      >
                        {isFirstDay && task.title}
                        {!isFirstDay && isMultiDay && '...'}

                        {task.status === 'done' && isFirstDay && (
                          <div className="absolute top-0 right-0 bg-green-500 dark:bg-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                        )}

                        {/* Edge resize handles */}
                        {isAdmin && isMultiDay && isFirstDay && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 bg-gray-800 dark:bg-gray-400 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize"
                            onMouseDown={(e) => handleEdgeMouseDown(e, task, 'start')}
                          />
                        )}
                        {isAdmin && isMultiDay && isLastDay && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 bg-gray-800 dark:bg-gray-400 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize"
                            onMouseDown={(e) => handleEdgeMouseDown(e, task, 'end')}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChangelogView({ tasks }: { tasks: Task[] }) {
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all activity logs from all tasks
  const allActivities = tasks
    .flatMap(task =>
      (task.activityLog || []).map(log => ({
        ...log,
        taskId: task.id,
        taskTitle: task.title,
        taskCompany: task.company
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply filters
  const filteredActivities = allActivities.filter(activity => {
    if (filterUser !== 'all' && activity.user !== filterUser) return false;
    if (filterAction !== 'all' && !activity.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (searchQuery && !activity.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group activities by date
  const groupedByDate = filteredActivities.reduce((acc, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof filteredActivities>);

  const getActionIcon = (action: string) => {
    if (action.includes('created')) return '✨';
    if (action.includes('moved') || action.includes('status')) return '🔄';
    if (action.includes('assigned')) return '👤';
    if (action.includes('updated') || action.includes('changed')) return '✏️';
    if (action.includes('deleted')) return '🗑️';
    if (action.includes('completed') || action.includes('subtask')) return '✅';
    if (action.includes('comment')) return '💬';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300';
    if (action.includes('moved') || action.includes('status')) return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300';
    if (action.includes('assigned')) return 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300';
    if (action.includes('deleted')) return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300';
    if (action.includes('completed')) return 'bg-emerald-50 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
    return 'bg-gray-50 dark:bg-[#2d2d2d] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-3xl font-bold mb-2">Activity Changelog</h2>
        <p className="text-indigo-100">Track all task movements and changes across the team</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#252525] rounded-lg p-4 shadow-sm border dark:border-[#373737]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by User</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-200 dark:bg-[#2d2d2d]"
            >
              <option value="all">All Users</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-200 dark:bg-[#2d2d2d]"
            >
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="moved">Moved/Status Changed</option>
              <option value="assigned">Assignment Changed</option>
              <option value="updated">Updated</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Tasks</label>
            <input
              type="text"
              placeholder="Search task names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-200 dark:bg-[#2d2d2d]"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredActivities.length} of {allActivities.length} activities
          </p>
          {(filterUser !== 'all' || filterAction !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterUser('all');
                setFilterAction('all');
                setSearchQuery('');
              }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="bg-white dark:bg-[#252525] rounded-lg p-12 text-center border dark:border-[#373737]">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No activity logs found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Activity tracking is now enabled for all future changes</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, activities]) => (
            <div key={date} className="space-y-3">
              <div className="sticky top-0 bg-gray-100 dark:bg-[#2d2d2d] px-4 py-2 rounded-lg border dark:border-[#404040]">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{date}</h3>
              </div>
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`border-l-4 rounded-lg p-4 ${getActionColor(activity.action)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getActionIcon(activity.action)}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">
                              <span className="font-bold">{activity.user}</span> {activity.action}
                            </p>
                            <p className="text-xs mt-1">
                              <span className="font-medium">Task:</span>{' '}
                              <span className="font-semibold">{activity.taskTitle}</span>
                              {' '}
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                activity.taskCompany === 'Muncho' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                                activity.taskCompany === 'Foan' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                                'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                              }`}>
                                {activity.taskCompany}
                              </span>
                            </p>
                            {activity.changes && (
                              <div className="mt-2 text-xs bg-white dark:bg-black bg-opacity-50 dark:bg-opacity-30 rounded p-2">
                                <span className="font-medium">{activity.changes.field}:</span>{' '}
                                <span className="line-through text-gray-600 dark:text-gray-400">{activity.changes.oldValue}</span>
                                {' → '}
                                <span className="font-semibold">{activity.changes.newValue}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AnalyticsView({ tasks, currentUserName, isAdmin }: { tasks: Task[], currentUserName?: string, isAdmin: boolean }) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Weighting system: difficulty * importance = task weight
  const getTaskWeight = (task: Task) => {
    const difficultyWeight = task.difficulty === 'Hard' ? 3 : task.difficulty === 'Medium' ? 2 : 1;
    const importanceWeight = task.importance === 'Critical' ? 4 : task.importance === 'High' ? 3 : task.importance === 'Medium' ? 2 : 1;
    return difficultyWeight * importanceWeight;
  };

  // Calculate performance score (0-100)
  const calculatePerformanceScore = (
    completedWeight: number,
    totalWeight: number,
    completedTasks: number,
    totalTasks: number,
    inProgressCount: number,
    reviewCount: number,
    subtaskCompletionRate: number
  ) => {
    if (totalTasks === 0) return 0;

    // Weighted completion is the primary factor (60% of score)
    const weightedCompletion = totalWeight > 0 ? (completedWeight / totalWeight) * 60 : 0;

    // Task completion count factor (20% of score)
    const taskCompletion = (completedTasks / totalTasks) * 20;

    // Progress momentum (10% of score) - reward having tasks in progress/review
    const progressMomentum = totalTasks > 0
      ? ((inProgressCount + reviewCount) / totalTasks) * 10
      : 0;

    // Subtask completion (10% of score)
    const subtaskFactor = (subtaskCompletionRate / 100) * 10;

    const score = weightedCompletion + taskCompletion + progressMomentum + subtaskFactor;
    return Math.min(100, Math.round(score));
  };

  // Get grade letter from score
  const getGrade = (score: number): { letter: string; color: string } => {
    if (score >= 95) return { letter: 'A+', color: 'text-green-700 bg-green-100' };
    if (score >= 90) return { letter: 'A', color: 'text-green-700 bg-green-100' };
    if (score >= 85) return { letter: 'A-', color: 'text-green-600 bg-green-50' };
    if (score >= 80) return { letter: 'B+', color: 'text-blue-700 bg-blue-100' };
    if (score >= 75) return { letter: 'B', color: 'text-blue-700 bg-blue-100' };
    if (score >= 70) return { letter: 'B-', color: 'text-blue-600 bg-blue-50' };
    if (score >= 65) return { letter: 'C+', color: 'text-yellow-700 bg-yellow-100' };
    if (score >= 60) return { letter: 'C', color: 'text-yellow-700 bg-yellow-100' };
    if (score >= 55) return { letter: 'C-', color: 'text-yellow-600 bg-yellow-50' };
    if (score >= 50) return { letter: 'D', color: 'text-orange-700 bg-orange-100' };
    return { letter: 'F', color: 'text-red-700 bg-red-100' };
  };

  // Calculate metrics for each employee
  // If not admin, only show current user's metrics
  const membersToShow = isAdmin ? TEAM_MEMBERS : (currentUserName ? [currentUserName] : []);
  const employeeMetrics = membersToShow.map(member => {
    const memberTasks = tasks.filter(t => t.assignees && t.assignees.includes(member));

    // Helper function to check if a task is "done" from this member's perspective
    const isTaskDoneForMember = (task: Task, memberName: string): boolean => {
      // If task is marked done, it's done for everyone
      if (task.status === 'done') return true;

      // Otherwise, check if member has subtasks assigned
      const memberSubtasks = (task.subtasks || []).filter(st => st.assignee === memberName);

      // If no subtasks assigned to member, follow task status
      if (memberSubtasks.length === 0) return false;

      // If member has subtasks, check if all are completed
      return memberSubtasks.every(st => st.completed);
    };

    // Weekly breakdown with scores
    const weeklyData = [1, 2, 3, 4].map(weekNum => {
      const weekTasks = memberTasks.filter(t => t.week === weekNum);
      const weekTotal = weekTasks.length;
      const weekCompleted = weekTasks.filter(t => isTaskDoneForMember(t, member)).length;
      const weekInProgress = weekTasks.filter(t => t.status === 'inProgress').length;
      const weekReview = weekTasks.filter(t => t.status === 'review').length;
      const weekTodo = weekTasks.filter(t => t.status === 'todo').length;

      const weekTotalWeight = weekTasks.reduce((sum, task) => sum + getTaskWeight(task), 0);
      const weekCompletedWeight = weekTasks
        .filter(t => isTaskDoneForMember(t, member))
        .reduce((sum, task) => sum + getTaskWeight(task), 0);

      const weekSubtasks = weekTasks.flatMap(t =>
        (t.subtasks || []).filter(st => st.assignee === member)
      );
      const weekSubtaskCompletion = weekSubtasks.length > 0
        ? (weekSubtasks.filter(st => st.completed).length / weekSubtasks.length * 100)
        : 0;

      const weekScore = calculatePerformanceScore(
        weekCompletedWeight,
        weekTotalWeight,
        weekCompleted,
        weekTotal,
        weekInProgress,
        weekReview,
        weekSubtaskCompletion
      );

      return {
        week: weekNum,
        total: weekTotal,
        completed: weekCompleted,
        inProgress: weekInProgress,
        review: weekReview,
        todo: weekTodo,
        totalWeight: weekTotalWeight,
        completedWeight: weekCompletedWeight,
        score: weekScore,
        grade: getGrade(weekScore)
      };
    });

    // Company breakdown
    const munchoTasks = memberTasks.filter(t => t.company === 'Muncho' || t.company === 'Both');
    const foanTasks = memberTasks.filter(t => t.company === 'Foan' || t.company === 'Both');

    // Overall stats - only count tasks from weeks that have been assigned (not future weeks)
    const tasksWithWeeks = memberTasks.filter(t => t.week !== null);
    const totalTasks = tasksWithWeeks.length;
    const completedTasks = tasksWithWeeks.filter(t => isTaskDoneForMember(t, member)).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0.0';

    // Weighted completion (based on difficulty + importance) - only for assigned weeks
    const totalWeight = tasksWithWeeks.reduce((sum, task) => sum + getTaskWeight(task), 0);
    const completedWeight = tasksWithWeeks
      .filter(t => isTaskDoneForMember(t, member))
      .reduce((sum, task) => sum + getTaskWeight(task), 0);
    const weightedCompletionRate = totalWeight > 0 ? (completedWeight / totalWeight * 100).toFixed(1) : '0.0';

    // Subtasks completion - only for assigned weeks and only subtasks assigned to this member
    const allSubtasks = tasksWithWeeks.flatMap(t =>
      (t.subtasks || []).filter(st => st.assignee === member)
    );
    const completedSubtasks = allSubtasks.filter(st => st.completed).length;
    const subtaskCompletionRate = allSubtasks.length > 0 ? (completedSubtasks / allSubtasks.length * 100).toFixed(1) : '0.0';

    const inProgressCount = tasksWithWeeks.filter(t => t.status === 'inProgress').length;
    const reviewCount = tasksWithWeeks.filter(t => t.status === 'review').length;

    // Calculate monthly score - only based on weeks with assigned tasks
    const monthlyScore = calculatePerformanceScore(
      completedWeight,
      totalWeight,
      completedTasks,
      totalTasks,
      inProgressCount,
      reviewCount,
      parseFloat(subtaskCompletionRate)
    );

    return {
      name: member,
      totalTasks,
      completedTasks,
      completionRate: parseFloat(completionRate),
      weightedCompletionRate: parseFloat(weightedCompletionRate),
      totalWeight,
      completedWeight,
      weeklyData,
      munchoTaskCount: munchoTasks.length,
      foanTaskCount: foanTasks.length,
      inProgressCount,
      reviewCount,
      todoCount: memberTasks.filter(t => t.status === 'todo').length,
      subtaskTotal: allSubtasks.length,
      subtaskCompleted: completedSubtasks,
      subtaskCompletionRate: parseFloat(subtaskCompletionRate),
      tasks: memberTasks,
      monthlyScore,
      monthlyGrade: getGrade(monthlyScore)
    };
  });

  // Sort by monthly score
  const sortedEmployees = [...employeeMetrics].sort((a, b) => b.monthlyScore - a.monthlyScore);

  const selectedEmpData = selectedEmployee ? employeeMetrics.find(e => e.name === selectedEmployee) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737]">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isAdmin ? 'Team Analytics' : 'My Analytics'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">January 2026 Performance Overview</p>
      </div>

      {/* Overall Summary Cards */}
      <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
        <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tasks</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{tasks.length}</div>
        </div>
        <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks Done</div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-400">{tasks.filter(t => t.status === 'done').length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {tasks.length > 0 ? ((tasks.filter(t => t.status === 'done').length / tasks.length) * 100).toFixed(1) : 0}% completion
          </div>
        </div>
        <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks Not Done</div>
          <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{tasks.filter(t => t.status !== 'done').length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {tasks.filter(t => t.status === 'inProgress').length} in progress, {tasks.filter(t => t.status === 'review').length} in review
          </div>
        </div>
        {isAdmin && (
          <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Team Members</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{TEAM_MEMBERS.length}</div>
          </div>
        )}
      </div>

      {/* Employee Performance Table */}
      <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737] shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {isAdmin ? 'Employee Performance Rankings' : 'My Performance'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Monthly Score</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Grade</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">W1</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">W2</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">W3</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">W4</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Tasks</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Completed</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp, index) => (
                <tr key={emp.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2d2d2d]">
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-800' :
                        index === 2 ? 'bg-orange-300 text-orange-900' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-semibold">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-800 h-2 rounded-full transition-all"
                          style={{ width: `${emp.monthlyScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 text-lg">{emp.monthlyScore}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`px-3 py-1 rounded-lg font-bold text-sm ${emp.monthlyGrade.color}`}>
                      {emp.monthlyGrade.letter}
                    </span>
                  </td>
                  {emp.weeklyData.map((week) => (
                    <td key={week.week} className="text-center py-3 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-1 rounded font-bold text-xs ${week.grade.color}`}>
                          {week.score}
                        </span>
                        <span className="text-xs text-gray-500">
                          {week.completed}/{week.total}
                        </span>
                      </div>
                    </td>
                  ))}
                  <td className="text-center py-3 px-4 text-gray-700">{emp.totalTasks}</td>
                  <td className="text-center py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium text-sm">
                      {emp.completedTasks}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <button
                      onClick={() => setSelectedEmployee(selectedEmployee === emp.name ? null : emp.name)}
                      className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm"
                    >
                      {selectedEmployee === emp.name ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Employee View */}
      {selectedEmpData && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedEmpData.name} - Detailed Analysis</h3>
              <p className="text-gray-600">Complete performance breakdown for January 2026</p>
            </div>
            <button
              onClick={() => setSelectedEmployee(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Monthly Performance Summary */}
          <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">Monthly Performance Score</h4>
                <p className="text-sm text-gray-600">Overall rating for January 2026</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900 mb-1">{selectedEmpData.monthlyScore}</div>
                  <div className="text-xs text-gray-600">Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-bold px-6 py-3 rounded-lg ${selectedEmpData.monthlyGrade.color}`}>
                    {selectedEmpData.monthlyGrade.letter}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Grade</div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Weekly Performance Breakdown</h4>
            <div className="grid grid-cols-4 gap-4">
              {selectedEmpData.weeklyData.map(week => (
                <div key={week.week} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-sm font-medium text-gray-600">Week {week.week}</div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${week.grade.color}`}>
                      {week.grade.letter}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Score</span>
                      <span className="text-sm font-bold text-gray-900">{week.score}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-800 h-2 rounded-full transition-all"
                        style={{ width: `${week.score}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-sm border-t border-gray-300 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">{week.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Done:</span>
                      <span className="font-semibold text-green-700">{week.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weight:</span>
                      <span className="font-semibold text-xs">{week.completedWeight}/{week.totalWeight}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company Distribution */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Company Distribution</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Muncho Tasks</div>
                <div className="text-3xl font-bold text-gray-900">{selectedEmpData.munchoTaskCount}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Foan Tasks</div>
                <div className="text-3xl font-bold text-gray-900">{selectedEmpData.foanTaskCount}</div>
              </div>
            </div>
          </div>

          {/* Monthly Summary - Task List */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Monthly Summary - All Assigned Tasks ({selectedEmpData.tasks.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedEmpData.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                    <div className="flex gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${
                        task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
                        task.company === 'Foan' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {task.company}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${
                        task.status === 'done' ? 'bg-green-100 text-green-800' :
                        task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                        task.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status === 'inProgress' ? 'In Progress' :
                         task.status === 'todo' ? 'To Do' :
                         task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                      {task.week && (
                        <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          Week {task.week}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekView({
  tasks,
  weekNumber,
  onTaskClick,
  onTaskDrop,
  onCreateTask,
  isAdmin
}: {
  tasks: Task[];
  weekNumber: number;
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskId: string, updates: Partial<Task>) => void;
  onCreateTask: () => void;
  isAdmin: boolean;
}) {
  const [resizingTask, setResizingTask] = useState<{ taskId: string; edge: 'start' | 'end' } | null>(null);

  const weekRanges = {
    1: { start: 1, end: 7 },
    2: { start: 8, end: 15 },
    3: { start: 16, end: 23 },
    4: { start: 24, end: 31 }
  };

  const range = weekRanges[weekNumber as keyof typeof weekRanges];
  const weekDays: { month: number; day: number; year: number; dayName: string; dateStr: string }[] = [];

  // Generate the 7 days for the selected week
  for (let day = range.start; day <= range.end; day++) {
    const date = new Date(2026, 0, day); // January is month 0
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
    weekDays.push({
      month: 1,
      day,
      year: 2026,
      dayName: dayNames[date.getDay()],
      dateStr
    });
  }

  // Helper to check if a date is between start and due date (inclusive)
  const isDateInTaskRange = (dateStr: string, task: Task) => {
    const taskStart = (task.startDate || task.dueDate).split('T')[0];
    const taskEnd = task.dueDate.split('T')[0];
    return dateStr >= taskStart && dateStr <= taskEnd;
  };

  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEdgeMouseDown = (e: React.MouseEvent, task: Task, edge: 'start' | 'end') => {
    if (!isAdmin) return;
    e.stopPropagation();
    setResizingTask({ taskId: task.id, edge });
  };

  const handleDayMouseEnter = (dateStr: string) => {
    if (!isAdmin || !resizingTask) return;

    const task = tasks.find(t => t.id === resizingTask.taskId);
    if (!task) return;

    if (resizingTask.edge === 'start') {
      // Ensure start date doesn't go past due date
      const taskEnd = task.dueDate.split('T')[0];
      if (dateStr <= taskEnd) {
        onTaskDrop(task.id, { startDate: dateStr, week: weekNumber });
      }
    } else {
      // Ensure due date doesn't go before start date
      const taskStart = (task.startDate || task.dueDate).split('T')[0];
      if (dateStr >= taskStart) {
        onTaskDrop(task.id, { dueDate: dateStr, week: weekNumber });
      }
    }
  };

  const handleMouseUp = () => {
    setResizingTask(null);
  };

  useEffect(() => {
    if (resizingTask) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [resizingTask]);

  const handleDayDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDayDrop = (e: React.DragEvent, dateStr: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // If task has a startDate, maintain the duration
      if (task.startDate) {
        const startDate = new Date(task.startDate);
        const dueDate = new Date(task.dueDate);
        const duration = Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const newDueDate = new Date(dateStr);
        newDueDate.setDate(newDueDate.getDate() + duration);
        const newDueDateStr = newDueDate.toISOString().split('T')[0];

        onTaskDrop(taskId, { startDate: dateStr, dueDate: newDueDateStr, week: weekNumber });
      } else {
        onTaskDrop(taskId, { dueDate: dateStr, week: weekNumber });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Week {weekNumber} - January {range.start}-{range.end}, 2026</h2>
        {isAdmin && (
          <button
            onClick={onCreateTask}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add Task
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((dateObj) => {
          const { dateStr } = dateObj;
          const dayTasks = tasks.filter(t => isDateInTaskRange(dateStr, t));

          return (
            <div
              key={dateObj.day}
              className="min-h-96 p-4 border-2 rounded-lg bg-white hover:bg-gray-50 flex flex-col"
              onDragOver={handleDayDragOver}
              onDrop={(e) => handleDayDrop(e, dateStr)}
              onMouseEnter={() => handleDayMouseEnter(dateStr)}
            >
              <div className="mb-3 pb-2 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-500">{dateObj.dayName}</div>
                <div className="text-2xl font-bold text-gray-900">{dateObj.day}</div>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {dayTasks.map(task => {
                  const isMultiDay = task.startDate && task.startDate.split('T')[0] !== task.dueDate.split('T')[0];
                  const isStartDay = dateStr === (task.startDate || task.dueDate).split('T')[0];
                  const isEndDay = dateStr === task.dueDate.split('T')[0];

                  return (
                    <div
                      key={task.id}
                      draggable={isAdmin && !resizingTask}
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      className={`p-3 rounded-md cursor-pointer border-l-4 shadow-sm hover:shadow-md transition-all relative group ${
                        task.company === 'Muncho' ? 'bg-blue-50 border-blue-500' :
                        task.company === 'Foan' ? 'bg-green-50 border-green-500' :
                        'bg-purple-50 border-purple-500'
                      } ${isAdmin ? 'cursor-move' : ''}`}
                      onClick={() => onTaskClick(task)}
                    >
                      {task.status === 'done' && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-md z-10">
                          ✓
                        </div>
                      )}

                      <div className="font-semibold text-sm mb-3 text-gray-900 leading-snug">
                        {task.title}
                        {isMultiDay && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            ({isStartDay ? 'Start' : isEndDay ? 'End' : 'Cont.'})
                          </span>
                        )}
                      </div>

                      {/* Edge resize handles */}
                      {isAdmin && isMultiDay && isStartDay && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 bg-gray-800 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize rounded-l-md"
                          onMouseDown={(e) => handleEdgeMouseDown(e, task, 'start')}
                        />
                      )}
                      {isAdmin && isMultiDay && isEndDay && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 bg-gray-800 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize rounded-r-md"
                          onMouseDown={(e) => handleEdgeMouseDown(e, task, 'end')}
                        />
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
                            task.company === 'Foan' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {task.company}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            task.status === 'done' ? 'bg-green-100 text-green-800' :
                            task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'inProgress' ? 'In Progress' :
                             task.status === 'todo' ? 'To Do' :
                             task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </span>
                        </div>

                        {task.assignees && task.assignees.length > 0 && (
                          <div className="text-xs text-gray-700 bg-white bg-opacity-60 px-2 py-1 rounded">
                            👤 {task.assignees.join(', ')}
                          </div>
                        )}

                        {task.attachments && task.attachments.length > 0 && (
                          <div className="text-xs text-gray-600 bg-white bg-opacity-60 px-2 py-1 rounded">
                            📎 {task.attachments.length} file{task.attachments.length !== 1 ? 's' : ''}
                          </div>
                        )}

                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="pt-1">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                              <span className="font-medium">{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks</span>
                              <span className="text-gray-500">{Math.round((task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gray-800 h-1.5 rounded-full transition-all"
                                style={{ width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskModal({
  task,
  onClose,
  onUpdate,
  onAddComment,
  onDelete,
  canDelete,
  isAdmin,
  getDefaultDateForWeek
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>, closeModal?: boolean) => Promise<boolean>;
  onAddComment: (taskId: string, text: string) => void;
  onDelete: (taskId: string) => void;
  canDelete: boolean;
  isAdmin: boolean;
  getDefaultDateForWeek: (weekNum: number) => string;
}) {
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'changelog'>('details');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  // Auto-scroll to latest comment
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [editedTask.comments]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.member-dropdown-container')) {
        setShowMemberDropdown(false);
      }
    };

    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate(task.id, editedTask, true);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim()) {
      const commentText = newComment.trim();
      setNewComment('');

      // Optimistically add the comment to local state immediately
      const optimisticComment = {
        id: Date.now().toString(),
        text: commentText,
        timestamp: new Date().toISOString(),
        userId: 'temp',
        userName: editedTask.comments[editedTask.comments.length - 1]?.userName || 'You'
      };

      setEditedTask({
        ...editedTask,
        comments: [...editedTask.comments, optimisticComment]
      });

      // Then call the API
      onAddComment(task.id, commentText);
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const newSubtaskObj: Subtask = {
        id: Date.now().toString(),
        text: newSubtask.trim(),
        completed: false,
        assignee: null
      };
      setEditedTask({
        ...editedTask,
        subtasks: [...(editedTask.subtasks || []), newSubtaskObj]
      });
      setNewSubtask('');
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks?.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    });
  };

  const handleAssignSubtask = (subtaskId: string, assignee: string | null) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks?.map(st =>
        st.id === subtaskId ? { ...st, assignee } : st
      )
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks?.filter(st => st.id !== subtaskId)
    });
  };

  const getWeekFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();

    if (day <= 7) return 1;
    if (day <= 15) return 2;
    if (day <= 23) return 3;
    return 4;
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        let fileToUpload = files[i];

        // Compress images before upload
        if (fileToUpload.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImage(fileToUpload);
          } catch (err) {
            console.error('Image compression failed, uploading original:', err);
          }
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('taskId', task.id);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const { attachment } = await response.json();

        setEditedTask(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), attachment]
        }));

        setUploadProgress(((i + 1) / files.length) * 100);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await fetch(`/api/upload?taskId=${task.id}&attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setEditedTask(prev => ({
        ...prev,
        attachments: prev.attachments?.filter(att => att.id !== attachmentId) || []
      }));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete attachment. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('video')) return '🎥';
    return '📎';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {isAdmin ? 'Edit Task' : 'View Task'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'details'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'changelog'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Changelog
              {editedTask.activityLog && editedTask.activityLog.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs">
                  {editedTask.activityLog.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'details' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 resize-none"
                rows={4}
                placeholder="Add a detailed description..."
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={editedTask.company}
                onChange={(e) => setEditedTask({...editedTask, company: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              >
                <option value="Muncho">Muncho</option>
                <option value="Foan">Foan</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editedTask.status}
                onChange={(e) => setEditedTask({...editedTask, status: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              >
                <option value="todo">To Do</option>
                <option value="inProgress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Assignment</label>
              <select
                value={editedTask.week === null ? 'backlog' : editedTask.week.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'backlog') {
                    const newWeek = null;
                    setEditedTask({...editedTask, week: newWeek, isBacklog: true});
                  } else {
                    const newWeek = parseInt(value);
                    const newDueDate = getWeekFromDate(editedTask.dueDate) !== newWeek
                      ? getDefaultDateForWeek(newWeek)
                      : editedTask.dueDate;
                    setEditedTask({...editedTask, week: newWeek, dueDate: newDueDate, isBacklog: false});
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              >
                <option value="backlog">Backlog (No Week)</option>
                <option value="1">Week 1 (Jan 1-7)</option>
                <option value="2">Week 2 (Jan 8-15)</option>
                <option value="3">Week 3 (Jan 16-23)</option>
                <option value="4">Week 4 (Jan 24-31)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={editedTask.difficulty || ''}
                  onChange={(e) => setEditedTask({...editedTask, difficulty: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  disabled={!isAdmin}
                >
                  <option value="">Not Set</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importance</label>
                <select
                  value={editedTask.importance || ''}
                  onChange={(e) => setEditedTask({...editedTask, importance: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  disabled={!isAdmin}
                >
                  <option value="">Not Set</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Members</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editedTask.assignees?.map(member => (
                  <div key={member} className="flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                      {member.charAt(0)}
                    </span>
                    <span>{member}</span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          const newAssignees = editedTask.assignees.filter(a => a !== member);
                          setEditedTask({...editedTask, assignees: newAssignees});
                        }}
                        className="ml-1 text-gray-500 hover:text-gray-700 font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <div className="relative member-dropdown-container">
                    <button
                      onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-bold"
                    >
                      +
                    </button>
                    {showMemberDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-600 px-2 py-1">TEAM MEMBERS</div>
                          {TEAM_MEMBERS.filter(member => !editedTask.assignees?.includes(member)).map(member => (
                            <button
                              key={member}
                              onClick={() => {
                                const newAssignees = [...(editedTask.assignees || []), member];
                                setEditedTask({...editedTask, assignees: newAssignees});
                                setShowMemberDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded text-sm text-left"
                            >
                              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                                {member.charAt(0)}
                              </span>
                              <span className="text-gray-800">{member}</span>
                            </button>
                          ))}
                          {TEAM_MEMBERS.filter(member => !editedTask.assignees?.includes(member)).length === 0 && (
                            <div className="px-2 py-2 text-sm text-gray-500">All members assigned</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Optional)</label>
              <input
                type="date"
                value={editedTask.startDate ? editedTask.startDate.split('T')[0] : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const startDate = value ? value : undefined;
                  const dueDateStr = editedTask.dueDate ? editedTask.dueDate.split('T')[0] : '';

                  // If start date is set and is after due date, adjust due date
                  if (startDate && dueDateStr && startDate > dueDateStr) {
                    const newWeek = getWeekFromDate(startDate);
                    setEditedTask({...editedTask, startDate, dueDate: startDate, week: newWeek});
                  } else {
                    setEditedTask({...editedTask, startDate});
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              />
              <div className="mt-1 text-xs text-gray-500">
                Leave empty for single-day tasks
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editedTask.dueDate.split('T')[0]}
                onChange={(e) => {
                  const dueDate = e.target.value;
                  if (!dueDate) return; // Prevent empty due date

                  const newWeek = getWeekFromDate(dueDate);
                  const startDateStr = editedTask.startDate ? editedTask.startDate.split('T')[0] : '';

                  // If due date is before start date, adjust start date
                  if (startDateStr && dueDate < startDateStr) {
                    setEditedTask({...editedTask, startDate: dueDate, dueDate, week: newWeek});
                  } else {
                    setEditedTask({...editedTask, dueDate, week: newWeek});
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              />
              <div className="mt-1 text-xs text-gray-500">
                This task will appear in Week {editedTask.week}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtasks</label>
              <div className="space-y-2 mb-3">
                {editedTask.subtasks && editedTask.subtasks.length > 0 && (
                  <div className="mb-3">
                    {editedTask.subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded mb-2">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => handleToggleSubtask(subtask.id)}
                          className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
                        />
                        <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {subtask.text}
                        </span>
                        {isAdmin && (
                          <>
                            <select
                              value={subtask.assignee || ''}
                              onChange={(e) => handleAssignSubtask(subtask.id, e.target.value || null)}
                              className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
                            >
                              <option value="">Unassigned</option>
                              {TEAM_MEMBERS.map(member => (
                                <option key={member} value={member}>{member}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteSubtask(subtask.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-bold"
                            >
                              ×
                            </button>
                          </>
                        )}
                        {!isAdmin && subtask.assignee && (
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                            {subtask.assignee}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="Add a subtask..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {editedTask.comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm font-medium text-gray-700">{comment.userName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(comment.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">{comment.text}</div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
                <button
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>

              {/* Display existing attachments */}
              {editedTask.attachments && editedTask.attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {editedTask.attachments.map(attachment => (
                    <div key={attachment.id} className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center gap-3">
                      {/* Preview for images */}
                      {attachment.type.startsWith('image/') ? (
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-16 h-16 object-cover rounded border border-gray-300 hover:opacity-80 cursor-pointer"
                          />
                        </a>
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded border border-gray-300 text-3xl">
                          {getFileIcon(attachment.type)}
                        </div>
                      )}

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{attachment.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)} • Uploaded by {attachment.uploadedBy}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(attachment.uploadedAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button and progress */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full px-4 py-2 bg-gray-100 border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Uploading... {Math.round(uploadProgress)}%
                    </>
                  ) : (
                    <>
                      📎 Click to attach files or drag & drop
                    </>
                  )}
                </button>
                <div className="mt-1 text-xs text-gray-500">
                  Supported: Images (auto-compressed), PDFs, Documents • Max 50MB per file
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {isAdmin ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => onDelete(task.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
                      title="Delete this task"
                    >
                      Delete
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                  Close
                </button>
              )}
            </div>
          </div>
          ) : (
            /* Changelog Tab */
            <div className="space-y-4">
              {!editedTask.activityLog || editedTask.activityLog.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <p className="text-gray-500 text-lg">No activity yet</p>
                  <p className="text-gray-400 text-sm mt-2">Changes to this task will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...editedTask.activityLog].reverse().map((log) => {
                    const getActionIcon = (action: string) => {
                      if (action.includes('created')) return '✨';
                      if (action.includes('moved') || action.includes('status')) return '🔄';
                      if (action.includes('assigned')) return '👤';
                      if (action.includes('updated') || action.includes('changed')) return '✏️';
                      if (action.includes('completed') || action.includes('subtask')) return '✅';
                      return '📝';
                    };

                    const getActionColor = (action: string) => {
                      if (action.includes('created')) return 'bg-green-50 border-green-200 text-green-800';
                      if (action.includes('moved') || action.includes('status')) return 'bg-blue-50 border-blue-200 text-blue-800';
                      if (action.includes('assigned')) return 'bg-purple-50 border-purple-200 text-purple-800';
                      if (action.includes('completed')) return 'bg-emerald-50 border-emerald-200 text-emerald-800';
                      return 'bg-gray-50 border-gray-200 text-gray-800';
                    };

                    return (
                      <div
                        key={log.id}
                        className={`border-l-4 rounded-lg p-4 ${getActionColor(log.action)}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getActionIcon(log.action)}</span>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">
                                  <span className="font-bold">{log.user}</span> {log.action}
                                </p>
                                {log.changes && (
                                  <div className="mt-2 text-xs bg-white bg-opacity-50 rounded p-2">
                                    <span className="font-medium">{log.changes.field}:</span>{' '}
                                    <span className="line-through text-gray-600">{log.changes.oldValue}</span>
                                    {' → '}
                                    <span className="font-semibold">{log.changes.newValue}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <span className="text-xs text-gray-600 block">
                                  {new Date(log.timestamp).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
