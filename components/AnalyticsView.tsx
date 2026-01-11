import { Task } from "@/lib/types";

export function AnalyticsView({ tasks }: { tasks: Task[] }) {
    // Calculate weekly breakdown
    const weeklyData = [1, 2, 3, 4].map(weekNum => {
        const weekTasks = tasks.filter(t => t.week === weekNum);
        return {
            week: weekNum,
            total: weekTasks.length,
            completed: weekTasks.filter(t => t.status === 'done').length,
            inProgress: weekTasks.filter(t => t.status === 'inProgress').length,
            review: weekTasks.filter(t => t.status === 'review').length,
            todo: weekTasks.filter(t => t.status === 'todo').length,
        };
    });

    // Company breakdown
    const munchoTasks = tasks.filter(t => t.company === 'Muncho');
    const foanTasks = tasks.filter(t => t.company === 'Foan');

    // Overall stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'inProgress').length;
    const reviewTasks = tasks.filter(t => t.status === 'review').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;

    // Subtasks stats
    const allSubtasks = tasks.flatMap(t => t.subtasks || []);
    const completedSubtasks = allSubtasks.filter(st => st.completed).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737]">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Task Analytics
                </h2>
                <p className="text-gray-600 dark:text-gray-300">January 2026 Performance Overview</p>
            </div>

            {/* Overall Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tasks</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalTasks}</div>
                </div>
                <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks Done</div>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-400">{completedTasks}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}% completion
                    </div>
                </div>
                <div className="bg-white dark:bg-[#252525] rounded-lg p-4 border border-gray-200 dark:border-[#373737] shadow-sm">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks Not Done</div>
                    <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{totalTasks - completedTasks}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {inProgressTasks} in progress, {reviewTasks} in review
                    </div>
                </div>
            </div>

            {/* Weekly Breakdown */}
            <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737] shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Weekly Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Week</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Total</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Completed</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">In Progress</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">In Review</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">To Do</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Completion %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyData.map((week) => (
                                <tr key={week.week} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2d2d2d]">
                                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Week {week.week}</td>
                                    <td className="py-3 px-4 text-center text-gray-900 dark:text-gray-100">{week.total}</td>
                                    <td className="py-3 px-4 text-center text-green-700 dark:text-green-400">{week.completed}</td>
                                    <td className="py-3 px-4 text-center text-blue-700 dark:text-blue-400">{week.inProgress}</td>
                                    <td className="py-3 px-4 text-center text-yellow-700 dark:text-yellow-400">{week.review}</td>
                                    <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-400">{week.todo}</td>
                                    <td className="py-3 px-4 text-center font-semibold text-gray-900 dark:text-gray-100">
                                        {week.total > 0 ? ((week.completed / week.total) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Company Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737] shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Company Distribution</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Muncho Tasks</span>
                            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{munchoTasks.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Foan Tasks</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-400">{foanTasks.length}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#252525] rounded-lg p-6 border border-gray-200 dark:border-[#373737] shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Subtasks Progress</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Total Subtasks</span>
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{allSubtasks.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Completed Subtasks</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-400">{completedSubtasks}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Completion Rate</span>
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {allSubtasks.length > 0 ? ((completedSubtasks / allSubtasks.length) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
