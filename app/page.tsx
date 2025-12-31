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

interface Task {
  _id: string;
  id: string;
  title: string;
  description?: string;
  company: 'Muncho' | 'Foan' | 'Both';
  week: number | null;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  assignees: string[];
  dueDate: string;
  comments: Comment[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
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
    // Auto-assign based on current filter
    let autoAssignees: string[] = [];

    if (isAdmin) {
      // For admins: auto-assign if filtering by a specific user (not 'all', 'null', or 'kings')
      if (userFilter !== 'all' && userFilter !== 'null' && userFilter !== 'kings' && TEAM_MEMBERS.includes(userFilter)) {
        autoAssignees = [userFilter];
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

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 Backlog</h2>
            <p className="text-gray-600 text-sm">
              {isAdmin
                ? 'Tasks waiting to be assigned to a specific week. Click on a task to assign it to a week.'
                : 'Tasks in backlog waiting to be scheduled.'
              }
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => createTask(null, 'todo')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium"
            >
              + Add Backlog Task
            </button>
          )}
        </div>

        <div className="space-y-3">
          {backlogTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No tasks in backlog
            </div>
          ) : (
            backlogTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{task.title || '(No title)'}</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
                        task.company === 'Foan' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {task.company}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        task.status === 'done' ? 'bg-green-100 text-green-800' :
                        task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                        task.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      {task.difficulty && (
                        <span className={`px-2 py-1 rounded font-medium ${
                          task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                          task.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {task.difficulty}
                        </span>
                      )}
                      {task.importance && (
                        <span className={`px-2 py-1 rounded font-medium ${
                          task.importance === 'Low' ? 'bg-gray-100 text-gray-700' :
                          task.importance === 'Medium' ? 'bg-blue-100 text-blue-700' :
                          task.importance === 'High' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {task.importance === 'Critical' ? '⚠️ Critical' : task.importance}
                        </span>
                      )}
                      {task.assignees && task.assignees.length > 0 && (
                        <span className="bg-gray-100 text-gray-900 px-2 py-1 rounded">
                          👤 {task.assignees.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                      Click to assign week →
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
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
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">January 2026 Dashboard</h1>
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
          {isAdmin && (
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📊 Analytics
            </button>
          )}
        </div>

        <div className="mb-6">
          {view === 'calendar' ? (
            <>
              <div className="mb-4 bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarViewMode('month')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      calendarViewMode === 'month'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Month View
                  </button>
                  <button
                    onClick={() => setCalendarViewMode('week')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      calendarViewMode === 'week'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Week View
                  </button>
                </div>
                {calendarViewMode === 'week' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Select Week:</label>
                    <select
                      value={selectedWeekForWeekView}
                      onChange={(e) => setSelectedWeekForWeekView(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 text-gray-900"
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
                  isAdmin={isAdmin}
                />
              ) : (
                <WeekView
                  tasks={filteredTasks}
                  weekNumber={selectedWeekForWeekView}
                  onTaskClick={setSelectedTask}
                  onTaskDrop={updateTask}
                  isAdmin={isAdmin}
                />
              )}
            </>
          ) : view === 'analytics' ? (
            <AnalyticsView tasks={tasks} />
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
      <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
        <span className={`px-2 py-1 rounded ${
          task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
          task.company === 'Foan' ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {task.company}
        </span>
        {task.difficulty && (
          <span className={`px-2 py-1 rounded font-medium ${
            task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            task.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {task.difficulty}
          </span>
        )}
        {task.importance && (
          <span className={`px-2 py-1 rounded font-medium ${
            task.importance === 'Low' ? 'bg-gray-100 text-gray-700' :
            task.importance === 'Medium' ? 'bg-blue-100 text-blue-700' :
            task.importance === 'High' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-800'
          }`}>
            {task.importance === 'Critical' ? '⚠️ Critical' : task.importance}
          </span>
        )}
      </div>
      {task.assignees && task.assignees.length > 0 && (
        <div className="text-xs mb-2">
          <span className="bg-gray-100 text-gray-900 px-2 py-1 rounded">
            {task.assignees.join(', ')}
          </span>
        </div>
      )}
      {task.comments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          💬 {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
        </div>
      )}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          📎 {task.attachments.length} file{task.attachments.length !== 1 ? 's' : ''}
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
    calendarDays.push({ month: 12, day, year: 2025 });
  }

  for (let day = 1; day <= 31; day++) {
    calendarDays.push({ month: 1, day, year: 2026 });
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
      <h2 className="text-2xl font-bold mb-6">December 2025 - January 2026</h2>
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

function AnalyticsView({ tasks }: { tasks: Task[] }) {
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
  const employeeMetrics = TEAM_MEMBERS.map(member => {
    const memberTasks = tasks.filter(t => t.assignees && t.assignees.includes(member));

    // Weekly breakdown with scores
    const weeklyData = [1, 2, 3, 4].map(weekNum => {
      const weekTasks = memberTasks.filter(t => t.week === weekNum);
      const weekTotal = weekTasks.length;
      const weekCompleted = weekTasks.filter(t => t.status === 'done').length;
      const weekInProgress = weekTasks.filter(t => t.status === 'inProgress').length;
      const weekReview = weekTasks.filter(t => t.status === 'review').length;
      const weekTodo = weekTasks.filter(t => t.status === 'todo').length;

      const weekTotalWeight = weekTasks.reduce((sum, task) => sum + getTaskWeight(task), 0);
      const weekCompletedWeight = weekTasks
        .filter(t => t.status === 'done')
        .reduce((sum, task) => sum + getTaskWeight(task), 0);

      const weekSubtasks = weekTasks.flatMap(t => t.subtasks || []);
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

    // Overall stats
    const totalTasks = memberTasks.length;
    const completedTasks = memberTasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0.0';

    // Weighted completion (based on difficulty + importance)
    const totalWeight = memberTasks.reduce((sum, task) => sum + getTaskWeight(task), 0);
    const completedWeight = memberTasks
      .filter(t => t.status === 'done')
      .reduce((sum, task) => sum + getTaskWeight(task), 0);
    const weightedCompletionRate = totalWeight > 0 ? (completedWeight / totalWeight * 100).toFixed(1) : '0.0';

    // Subtasks completion
    const allSubtasks = memberTasks.flatMap(t => t.subtasks || []);
    const completedSubtasks = allSubtasks.filter(st => st.completed).length;
    const subtaskCompletionRate = allSubtasks.length > 0 ? (completedSubtasks / allSubtasks.length * 100).toFixed(1) : '0.0';

    const inProgressCount = memberTasks.filter(t => t.status === 'inProgress').length;
    const reviewCount = memberTasks.filter(t => t.status === 'review').length;

    // Calculate monthly score
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
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Analytics</h2>
        <p className="text-gray-600">January 2026 Performance Overview</p>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Tasks</div>
          <div className="text-3xl font-bold text-gray-900">{tasks.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Completed</div>
          <div className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'done').length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">In Progress</div>
          <div className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'inProgress').length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Team Members</div>
          <div className="text-3xl font-bold text-gray-900">{TEAM_MEMBERS.length}</div>
        </div>
      </div>

      {/* Employee Performance Table */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Employee Performance Rankings</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Monthly Score</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Grade</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Tasks</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Completed</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Weight</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp, index) => (
                <tr key={emp.name} className="border-b border-gray-100 hover:bg-gray-50">
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
                  <td className="text-center py-3 px-4 text-gray-700">{emp.totalTasks}</td>
                  <td className="text-center py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium text-sm">
                      {emp.completedTasks}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className="text-xs text-gray-600">
                      {emp.completedWeight}/{emp.totalWeight}
                    </div>
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
  isAdmin
}: {
  tasks: Task[];
  weekNumber: number;
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskId: string, updates: Partial<Task>) => void;
  isAdmin: boolean;
}) {
  const weekRanges = {
    1: { start: 1, end: 7 },
    2: { start: 8, end: 15 },
    3: { start: 16, end: 23 },
    4: { start: 24, end: 31 }
  };

  const range = weekRanges[weekNumber as keyof typeof weekRanges];
  const weekDays: { month: number; day: number; year: number; dayName: string }[] = [];

  // Generate the 7 days for the selected week
  for (let day = range.start; day <= range.end; day++) {
    const date = new Date(2026, 0, day); // January is month 0
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    weekDays.push({
      month: 1,
      day,
      year: 2026,
      dayName: dayNames[date.getDay()]
    });
  }

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
      onTaskDrop(taskId, { dueDate: dateStr, week: weekNumber });
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Week {weekNumber} - January {range.start}-{range.end}, 2026</h2>
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((dateObj) => {
          const dateStr = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
          const dayTasks = tasks.filter(t => t.dueDate.startsWith(dateStr));

          return (
            <div
              key={dateObj.day}
              className="min-h-96 p-4 border-2 rounded-lg bg-white hover:bg-gray-50 flex flex-col"
              onDragOver={handleDayDragOver}
              onDrop={(e) => handleDayDrop(e, dateStr)}
            >
              <div className="mb-3 pb-2 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-500">{dateObj.dayName}</div>
                <div className="text-2xl font-bold text-gray-900">{dateObj.day}</div>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    draggable={isAdmin}
                    onDragStart={(e) => handleTaskDragStart(e, task)}
                    className={`p-3 rounded-md cursor-pointer border-l-4 shadow-sm hover:shadow-md transition-all ${
                      task.company === 'Muncho' ? 'bg-blue-50 border-blue-500' :
                      task.company === 'Foan' ? 'bg-green-50 border-green-500' :
                      'bg-purple-50 border-purple-500'
                    } ${isAdmin ? 'cursor-move' : ''}`}
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="font-semibold text-sm mb-3 text-gray-900 leading-snug">{task.title}</div>

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
                ))}
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
        </div>
      </div>
    </div>
  );
}
