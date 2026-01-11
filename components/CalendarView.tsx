import { isDateInTaskRange, isFirstDayInWeek, isLastDayInWeek } from "@/lib/calendarUtils";
import { Task } from "@/lib/types";
import { useEffect, useState } from "react";

type DateObj = { month: number; day: number; year: number; dateStr: string };

interface CalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskDrop: (taskId: string, updates: Partial<Task>) => void;
    onCreateTask: () => void;
}

export function CalendarView({
    tasks,
    onTaskClick,
    onTaskDrop,
    onCreateTask
}: CalendarViewProps) {
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

    const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleEdgeMouseDown = (e: React.MouseEvent, task: Task, edge: 'start' | 'end') => {
        e.stopPropagation();
        setResizingTask({ taskId: task.id, edge });
    };

    const handleDayMouseEnter = (dateStr: string) => {
        if (!resizingTask) return;

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
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDayDrop = (e: React.DragEvent, dateStr: string) => {
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
        <div className="bg-white dark:bg-[#252525] rounded-lg p-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold dark:text-white">December 2025 - January 2026</h2>
                <button
                    onClick={onCreateTask}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
                >
                    <span className="text-lg">+</span>
                    Add Task
                </button>
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

                        // Check if this is today
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayStr = today.toISOString().split('T')[0];
                        const isToday = dateStr === todayStr;

                        // Get tasks that span this day
                        const dayTasks = tasks.filter(t => isDateInTaskRange(dateStr, t));

                        return (
                            <div
                                key={`${weekIdx}-${dayIdx}`}
                                className={`min-h-24 p-2 border rounded ${isToday
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600 border-2'
                                    : isDecember
                                        ? 'bg-gray-50 dark:bg-[#1e1e1e] dark:border-gray-700'
                                        : 'bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#303030] dark:border-gray-700'
                                    }`}
                                onDragOver={handleDayDragOver}
                                onDrop={(e) => handleDayDrop(e, dateStr)}
                                onMouseEnter={() => handleDayMouseEnter(dateStr)}
                            >
                                <div className={`font-semibold mb-1 ${isToday
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : isDecember
                                        ? 'text-gray-400 dark:text-gray-600'
                                        : 'dark:text-gray-300'
                                    }`}>
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
                                                draggable={!resizingTask}
                                                onDragStart={(e) => handleTaskDragStart(e, task)}
                                                className={`text-xs p-1 rounded cursor-pointer relative group ${task.company === 'Foan' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                                                    task.company === 'Muncho' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                                                        task.company === 'Marketing O' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300' :
                                                            'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300'
                                                    } cursor-move ${isMultiDay && !isFirstDay ? 'rounded-l-none' : ''
                                                    } ${isMultiDay && !isLastDay ? 'rounded-r-none' : ''
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
                                                {isMultiDay && isFirstDay && (
                                                    <div
                                                        className="absolute left-0 top-0 bottom-0 w-1 bg-gray-800 dark:bg-gray-400 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize"
                                                        onMouseDown={(e) => handleEdgeMouseDown(e, task, 'start')}
                                                    />
                                                )}
                                                {isMultiDay && isLastDay && (
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
