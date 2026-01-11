import { isDateInTaskRange } from "@/lib/calendarUtils";
import { Task } from "@/lib/types";
import { useEffect, useState } from "react";

interface WeekViewProps {
    tasks: Task[];
    weekNumber: number;
    onTaskClick: (task: Task) => void;
    onTaskDrop: (taskId: string, updates: Partial<Task>) => void;
    onCreateTask: () => void;
}

export function WeekView({
    tasks,
    weekNumber,
    onTaskClick,
    onTaskDrop,
    onCreateTask
}: WeekViewProps) {
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
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDayDrop = (e: React.DragEvent, dateStr: string) => {
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
        <div className="bg-white rounded-lg p-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Week {weekNumber} - January {range.start}-{range.end}, 2026</h2>
                <button
                    onClick={onCreateTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <span className="text-lg">+</span>
                    Add Task
                </button>
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
                                            draggable={!resizingTask}
                                            onDragStart={(e) => handleTaskDragStart(e, task)}
                                            className={`p-3 rounded-md cursor-pointer border-l-4 shadow-sm hover:shadow-md transition-all relative group ${task.company === 'Muncho' ? 'bg-blue-50 border-blue-500' :
                                                task.company === 'Foan' ? 'bg-green-50 border-green-500' :
                                                    'bg-purple-50 border-purple-500'
                                                } cursor-move`}
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
                                            {isMultiDay && isStartDay && (
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-2 bg-gray-800 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize rounded-l-md"
                                                    onMouseDown={(e) => handleEdgeMouseDown(e, task, 'start')}
                                                />
                                            )}
                                            {isMultiDay && isEndDay && (
                                                <div
                                                    className="absolute right-0 top-0 bottom-0 w-2 bg-gray-800 opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-ew-resize rounded-r-md"
                                                    onMouseDown={(e) => handleEdgeMouseDown(e, task, 'end')}
                                                />
                                            )}

                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.company === 'Muncho' ? 'bg-blue-100 text-blue-800' :
                                                        task.company === 'Foan' ? 'bg-green-100 text-green-800' :
                                                            'bg-purple-100 text-purple-800'
                                                        }`}>
                                                        {task.company}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.status === 'done' ? 'bg-green-100 text-green-800' :
                                                        task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                                                            task.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {task.status === 'inProgress' ? 'In Progress' :
                                                            task.status === 'todo' ? 'To Do' :
                                                                task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                                    </span>
                                                </div>

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
