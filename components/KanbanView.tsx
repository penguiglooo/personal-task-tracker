import { TaskCard } from "@/components/TaskCard";
import { STATUS_COLUMNS, STATUS_LABELS } from "@/lib/constants";
import { Task } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";

interface KanbanViewProps {
    weekNum: number;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    createTask: (week: number | null, status: string) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<any>;
    setTasks: Dispatch<SetStateAction<Task[]>>;
    setFilteredTasks: Dispatch<SetStateAction<Task[]>>;
}

export function KanbanView({
    weekNum,
    tasks,
    onTaskClick,
    createTask,
    updateTask,
    setTasks,
    setFilteredTasks
}: KanbanViewProps) {
    const weekTasks = tasks.filter((t: Task) => t.week === weekNum);

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('currentStatus', task.status);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleCardDragOver = (e: React.DragEvent, targetTask: Task) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            const taskToUpdate = tasks.find((t: Task) => t.id === taskId);
            if (taskToUpdate) {
                setTasks((prev: Task[]) => prev.map((t: Task) =>
                    t.id === taskId ? { ...t, status: newStatus as any } : t
                ));
                setFilteredTasks((prev: Task[]) => prev.map((t: Task) =>
                    t.id === taskId ? { ...t, status: newStatus as any } : t
                ));
            }

            try {
                await updateTask(taskId, { status: newStatus as any });
            } catch (err) {
                if (taskToUpdate) {
                    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === taskId ? taskToUpdate : t));
                    setFilteredTasks((prev: Task[]) => prev.map((t: Task) => t.id === taskId ? taskToUpdate : t));
                }
            }
        }
    };

    const handleCardDrop = async (e: React.DragEvent, targetTask: Task) => {
        e.preventDefault();
        e.stopPropagation();

        const draggedTaskId = e.dataTransfer.getData('taskId');
        const currentStatus = e.dataTransfer.getData('currentStatus');

        if (!draggedTaskId || draggedTaskId === targetTask.id) {
            return;
        }

        if (currentStatus !== targetTask.status) {
            await updateTask(draggedTaskId, { status: targetTask.status as any });
        } else {
            // Reordering logic if supported
        }
    };


    return (
        <div className="grid grid-cols-4 gap-4 animate-in fade-in duration-500">
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
                                ({weekTasks.filter((t: Task) => t.status === status).length})
                            </span>
                        </h3>
                        <button
                            onClick={() => createTask(weekNum, status)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-800 dark:bg-[#373737] text-white rounded hover:bg-gray-900 dark:hover:bg-[#404040] text-lg font-bold"
                            title="Add new task"
                        >
                            +
                        </button>
                    </div>
                    <div className="space-y-3">
                        {weekTasks.filter((t: Task) => t.status === status).map((task: Task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onEdit={() => onTaskClick(task)}
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
}
