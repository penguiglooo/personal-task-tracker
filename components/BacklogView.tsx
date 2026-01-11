import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/constants";
import { Task } from "@/lib/types";

interface BacklogViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onCreateTask: (week: number | null, status: string) => void;
}

export function BacklogView({ tasks, onTaskClick, onCreateTask }: BacklogViewProps) {
    const backlogTasks = tasks.filter(t => t.week === null || t.isBacklog);
    const foanTasks = backlogTasks.filter(t => t.company === 'Foan');
    const munchoTasks = backlogTasks.filter(t => t.company === 'Muncho');
    const marketingOTasks = backlogTasks.filter(t => t.company === 'Marketing O');
    const personalTasks = backlogTasks.filter(t => t.company === 'Personal');

    const renderBacklogCard = (task: Task) => (
        <div
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-[#404040] rounded-lg p-3 hover:shadow-md cursor-pointer transition-all hover:border-gray-300 dark:hover:border-[#4a4a4a]"
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight flex-1">{task.title || '(No title)'}</h3>
                {task.importance && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${task.importance === 'Low' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                        task.importance === 'Medium' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                            task.importance === 'High' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                                'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                        }`}>
                        {task.importance === 'Critical' ? '⚠️' : task.importance.charAt(0)}
                    </span>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
                <span className={`px-1.5 py-0.5 rounded ${task.status === 'done' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                    task.status === 'review' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
                        task.status === 'inProgress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                    {STATUS_LABELS[task.status]}
                </span>
                {task.difficulty && (
                    <span className={`px-1.5 py-0.5 rounded ${task.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                        task.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                            'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        }`}>
                        {task.difficulty.charAt(0)}
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
                        Tasks waiting to be assigned to a specific week. Click on a task to assign it to a week.
                    </p>
                </div>
                <Button
                    onClick={() => onCreateTask(null, 'todo')}
                    className="bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600"
                >
                    + Add Backlog Task
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-400 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Foan Backlog <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({foanTasks.length})</span>
                    </h3>
                    <div className="space-y-2">{foanTasks.map(renderBacklogCard)}</div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                        Muncho Backlog <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({munchoTasks.length})</span>
                    </h3>
                    <div className="space-y-2">{munchoTasks.map(renderBacklogCard)}</div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-400 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        Marketing O Backlog <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({marketingOTasks.length})</span>
                    </h3>
                    <div className="space-y-2">{marketingOTasks.map(renderBacklogCard)}</div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                        Personal Backlog <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({personalTasks.length})</span>
                    </h3>
                    <div className="space-y-2">{personalTasks.map(renderBacklogCard)}</div>
                </div>
            </div>
        </div>
    );
}
