import { Task } from "@/lib/types";
import { useState } from "react";

export function ChangelogView({ tasks }: { tasks: Task[] }) {
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Activity Changelog</h2>
                <p className="text-gray-600 dark:text-gray-400">Track all task movements and changes across the team</p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Action</label>
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 text-gray-900 dark:text-gray-200 dark:bg-[#2d2d2d]"
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 text-gray-900 dark:text-gray-200 dark:bg-[#2d2d2d]"
                        />
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {filteredActivities.length} of {allActivities.length} activities
                    </p>
                    {(filterAction !== 'all' || searchQuery) && (
                        <button
                            onClick={() => {
                                setFilterAction('all');
                                setSearchQuery('');
                            }}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-6">
                {Object.entries(groupedByDate).length === 0 ? (
                    <div className="bg-white dark:bg-[#252525] rounded-lg p-12 text-center border border-gray-200 dark:border-gray-800">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No activity logs found</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Activity tracking is now enabled for all future changes</p>
                    </div>
                ) : (
                    Object.entries(groupedByDate).map(([date, activities]) => (
                        <div key={date} className="space-y-3">
                            <div className="sticky top-0 bg-gray-100 dark:bg-[#1a1a1a] px-4 py-2 rounded-lg">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{date}</h3>
                            </div>
                            <div className="space-y-2">
                                {activities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
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
                                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${activity.taskCompany === 'Muncho' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                                                                activity.taskCompany === 'Foan' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                                                                    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                                                                }`}>
                                                                {activity.taskCompany}
                                                            </span>
                                                        </p>
                                                        {activity.changes && (
                                                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                                                <span className="font-medium">{activity.changes.field}:</span>{' '}
                                                                <span className="line-through">{activity.changes.oldValue}</span>
                                                                {' → '}
                                                                <span className="font-semibold text-gray-900 dark:text-gray-200">{activity.changes.newValue}</span>
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
