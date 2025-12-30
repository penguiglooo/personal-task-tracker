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

interface Task {
  _id: string;
  id: string;
  title: string;
  company: 'Muncho' | 'Foan' | 'Both';
  week: number | null;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  assignees: string[];
  dueDate: string;
  comments: Comment[];
  subtasks?: Subtask[];
  isBacklog?: boolean;
  createdAt: string;
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<string>('todo');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'admin';

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
    if (userFilter === 'all') {
      setFilteredTasks(tasks);
    } else if (userFilter === 'null') {
      setFilteredTasks(tasks.filter(task => !task.assignees || task.assignees.length === 0));
    } else if (userFilter === 'kings') {
      const kings = ['Dhruv', 'Swapnil', 'Akaash'];
      setFilteredTasks(tasks.filter(task =>
        task.assignees && task.assignees.some(assignee => kings.includes(assignee))
      ));
    } else {
      setFilteredTasks(tasks.filter(task => task.assignees && task.assignees.includes(userFilter)));
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
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
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

        // Optimistically update the selected task immediately
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({
            ...selectedTask,
            comments: [...selectedTask.comments, newComment]
          });
        }

        // Also fetch all tasks to update the main state
        await fetchTasks();
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
    const newTask: Partial<Task> = {
      title: '',
      company: 'Muncho',
      week: weekNum,
      status: status as any,
      assignees: [],
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
    return `2025-01-${String(day).padStart(2, '0')}`;
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
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
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
    if (taskId && isAdmin) {
      await updateTask(taskId, { status: newStatus as any });
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

    if (!draggedTaskId || !isAdmin || draggedTaskId === targetTask.id) {
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

    return (
      <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-purple-900 mb-2">📋 Backlog Tasks</h2>
          <p className="text-purple-700 text-sm">
            These are smaller tasks that can be picked up anytime. Assign them to a week to move them to the weekly board.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(status => (
            <div
              key={status}
              className="bg-white rounded-lg p-4 border border-purple-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-purple-700 text-lg">
                  {STATUS_LABELS[status]}
                  <span className="ml-2 text-sm text-purple-500">
                    ({backlogTasks.filter(t => t.status === status).length})
                  </span>
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => createTask(null, status)}
                    className="w-6 h-6 flex items-center justify-center bg-purple-600 text-white rounded hover:bg-purple-700 text-lg font-bold"
                    title="Add new backlog task"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {backlogTasks.filter(t => t.status === status).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => setSelectedTask(task)}
                    onDragStart={handleDragStart}
                    onDragOver={handleCardDragOver}
                    onDrop={handleCardDrop}
                    canDrag={isAdmin}
                  />
                ))}
              </div>
            </div>
          ))}
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
            className="bg-gray-50 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 text-lg">
                {STATUS_LABELS[status]}
                <span className="ml-2 text-sm text-gray-500">
                  ({weekTasks.filter(t => t.status === status).length})
                </span>
              </h3>
              {isAdmin && (
                <button
                  onClick={() => createTask(weekNum, status)}
                  className="w-6 h-6 flex items-center justify-center bg-gray-800 text-white rounded hover:bg-gray-900 text-lg font-bold"
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
                  canDrag={isAdmin}
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
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">January Dashboard</h1>
            <p className="text-gray-600">Muncho & Foan Command Center</p>
            <p className="text-sm text-gray-500 mt-1">
              Logged in as {session?.user?.name} ({isAdmin ? 'Admin' : 'Viewer'})
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowResetPassword(true)}
                className="px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Reset Password
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              Sign Out
            </button>
          </div>
        </header>

        {isAdmin && (
          <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 text-gray-900"
            >
              <option value="all">All Team Members</option>
              <option value="kings">Kings (Dhruv, Swapnil, Akaash)</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
              <option value="null">Unassigned</option>
            </select>
          </div>
        )}

        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'calendar'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setView('backlog')}
            className={`px-4 py-2 rounded-lg font-medium ${
              view === 'backlog'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
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
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Week {week} ({[1,8,16,24][week-1]}-{[7,15,23,31][week-1]} Jan)
            </button>
          ))}
        </div>

        <div className="mb-6">
          {view === 'calendar' ? (
            <CalendarView
              tasks={filteredTasks}
              onTaskClick={setSelectedTask}
              onTaskDrop={updateTask}
              isAdmin={isAdmin}
            />
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
      className={`bg-white p-3 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow relative ${
        task.company === 'Muncho' ? 'border-blue-500' :
        task.company === 'Foan' ? 'border-green-500' :
        'border-purple-500'
      } ${!canDrag ? 'cursor-default' : ''}`}
    >
      {showAgeBadge && (
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
          cardAge <= 3 ? 'bg-yellow-100 text-yellow-800' :
          cardAge <= 7 ? 'bg-orange-100 text-orange-800' :
          'bg-red-100 text-red-800'
        }`}>
          {cardAge}d
        </div>
      )}
      <div className="font-medium text-gray-900 mb-2 pr-12">{task.title}</div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className={`px-2 py-1 rounded ${
          task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
          task.company === 'Foan' ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {task.company}
        </span>
        {task.assignees && task.assignees.length > 0 && (
          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
            {task.assignees.join(', ')}
          </span>
        )}
      </div>
      {task.comments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          💬 {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
        </div>
      )}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks</span>
            <span>{Math.round((task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-800 h-2 rounded-full transition-all"
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
  isAdmin
}: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskId: string, updates: Partial<Task>) => void;
  isAdmin: boolean;
}) {
  type DateObj = { month: number; day: number; year: number };
  const calendarDays: DateObj[] = [];

  for (let day = 29; day <= 31; day++) {
    calendarDays.push({ month: 12, day, year: 2024 });
  }

  for (let day = 1; day <= 31; day++) {
    calendarDays.push({ month: 1, day, year: 2025 });
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

  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

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
      const date = new Date(dateStr);
      const day = date.getDate();
      let week = 1;
      if (day <= 7) week = 1;
      else if (day <= 15) week = 2;
      else if (day <= 23) week = 3;
      else week = 4;

      onTaskDrop(taskId, { dueDate: dateStr, week });
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">December 2024 - January 2025</h2>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="font-bold text-center p-2">{day}</div>
        ))}
        {weeks.map((week, weekIdx) =>
          week.map((dateObj, dayIdx) => {
            if (!dateObj) return <div key={`${weekIdx}-${dayIdx}`} className="min-h-24 bg-gray-100" />;

            const dateStr = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.dueDate.startsWith(dateStr));
            const isDecember = dateObj.month === 12;

            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={`min-h-24 p-2 border rounded ${isDecember ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                onDragOver={handleDayDragOver}
                onDrop={(e) => handleDayDrop(e, dateStr)}
              >
                <div className={`font-semibold mb-1 ${isDecember ? 'text-gray-400' : ''}`}>
                  {dateObj.day} {isDecember ? 'Dec' : ''}
                </div>
                <div className="space-y-1">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      draggable={isAdmin}
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      className={`text-xs p-1 rounded cursor-pointer ${
                        task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
                        task.company === 'Foan' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      } ${isAdmin ? 'cursor-move' : ''}`}
                      onClick={() => onTaskClick(task)}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editedTask.dueDate.split('T')[0]}
                onChange={(e) => {
                  const newWeek = getWeekFromDate(e.target.value);
                  setEditedTask({...editedTask, dueDate: e.target.value, week: newWeek});
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
        </div>
      </div>
    </div>
  );
}
