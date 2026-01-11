import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import { Task } from "@/lib/types";
import { MessageSquare, Paperclip } from "lucide-react";

interface TaskCardProps {
    task: Task;
    onEdit: () => void;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragOver?: (e: React.DragEvent, task: Task) => void;
    onDrop?: (e: React.DragEvent, task: Task) => void;
    canDrag: boolean;
}

export function TaskCard({
    task,
    onEdit,
    onDragStart,
    onDragOver,
    onDrop,
    canDrag
}: TaskCardProps) {
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
            className={`bg-white dark:bg-[#2d2d2d] p-3 rounded-lg shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow relative ${task.company === 'Foan' ? 'border-green-500' :
                    task.company === 'Muncho' ? 'border-blue-500' :
                        task.company === 'Marketing O' ? 'border-orange-500' :
                            'border-gray-500'
                } ${!canDrag ? 'cursor-default' : ''}`}
        >
            {showAgeBadge && (
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${cardAge <= 3 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
                        cardAge <= 7 ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300' :
                            'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                    }`}>
                    {cardAge}d
                </div>
            )}
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2 pr-12">{task.title}</div>
            <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
                <Badge variant={
                    task.company === 'Foan' ? "default" :
                        task.company === 'Muncho' ? "secondary" :
                            "outline"
                } className={`px-2 py-1 rounded-sm font-normal ${task.company === 'Foan' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 hover:bg-green-200' :
                        task.company === 'Muncho' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 hover:bg-blue-200' :
                            task.company === 'Marketing O' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 hover:bg-orange-200' :
                                'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 hover:bg-gray-200'
                    }`}>
                    {task.company}
                </Badge>

                {task.difficulty && (
                    <Badge variant="outline" className={`px-2 py-1 rounded font-normal ${task.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                            task.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                                'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        }`}>
                        {task.difficulty}
                    </Badge>
                )}
                {task.importance && (
                    <Badge variant="outline" className={`px-2 py-1 rounded font-normal ${task.importance === 'Low' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                            task.importance === 'Medium' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                task.importance === 'High' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                                    'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                        }`}>
                        {task.importance === 'Critical' ? '⚠️ Critical' : task.importance}
                    </Badge>
                )}
            </div>
            {task.comments.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {task.comments.length}
                </div>
            )}
            {task.attachments && task.attachments.length > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {task.attachments.length}
                </div>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-2 w-full">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks</span>
                        <span>{Math.round((task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className="bg-gray-800 dark:bg-gray-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
