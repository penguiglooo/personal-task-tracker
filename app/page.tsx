'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Comment {
  id: string;
  text: string;
  timestamp: string;
  userId: string;
  userName: string;
}

interface Task {
  _id: string;
  id: string;
  title: string;
  company: 'Muncho' | 'Foan' | 'Both';
  week: number;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  assignee: string | null;
  dueDate: string;
  comments: Comment[];
}

const TEAM_MEMBERS = ['Dhruv', 'Akaash', 'Swapnil', 'Sneha', 'Aniket'];
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
    } else {
      setFilteredTasks(tasks.filter(task => task.assignee === userFilter));
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

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
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
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(updatedTask);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
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
        await fetchTasks();
        // Refresh the selected task
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setSelectedTask(task);
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

  const createTask = async (weekNum: number, status: string) => {
    const newTask: Partial<Task> = {
      title: '',
      company: 'Muncho',
      week: weekNum,
      status: status as any,
      assignee: null,
      dueDate: getDefaultDateForWeek(weekNum),
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
    const ORIGINAL_TASK_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
    return !ORIGINAL_TASK_IDS.includes(taskId);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task.id);
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

  const getWeekFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();

    if (day <= 7) return 1;
    if (day <= 15) return 2;
    if (day <= 23) return 3;
    return 4;
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
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </header>

        {isAdmin && (
          <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 text-gray-900"
            >
              <option value="all">All Team Members</option>
              {TEAM_MEMBERS.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
              <option value={null as any}>Unassigned</option>
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
            <CalendarView tasks={filteredTasks} onTaskClick={setSelectedTask} />
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
          />
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onDragStart,
  canDrag
}: {
  task: Task;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  canDrag: boolean;
}) {
  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onEdit}
      className={`bg-white p-3 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
        task.company === 'Muncho' ? 'border-blue-500' :
        task.company === 'Foan' ? 'border-green-500' :
        'border-purple-500'
      } ${!canDrag ? 'cursor-default' : ''}`}
    >
      <div className="font-medium text-gray-900 mb-2">{task.title}</div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className={`px-2 py-1 rounded ${
          task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
          task.company === 'Foan' ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {task.company}
        </span>
        {task.assignee && (
          <span className="bg-gray-100 px-2 py-1 rounded">{task.assignee}</span>
        )}
      </div>
      {task.comments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          💬 {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function CalendarView({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (task: Task) => void }) {
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
              >
                <div className={`font-semibold mb-1 ${isDecember ? 'text-gray-400' : ''}`}>
                  {dateObj.day} {isDecember ? 'Dec' : ''}
                </div>
                <div className="space-y-1">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className={`text-xs p-1 rounded cursor-pointer ${
                        task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
                        task.company === 'Foan' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}
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
  isAdmin
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, text: string) => void;
  onDelete: (taskId: string) => void;
  canDelete: boolean;
  isAdmin: boolean;
}) {
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const handleSave = () => {
    onUpdate(task.id, editedTask);
    onClose();
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment);
      setNewComment('');
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select
                value={editedTask.assignee || ''}
                onChange={(e) => setEditedTask({...editedTask, assignee: e.target.value || null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={!isAdmin}
              >
                <option value="">Unassigned</option>
                {TEAM_MEMBERS.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
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
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => onDelete(task.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
