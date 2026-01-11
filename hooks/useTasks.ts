import { STATUS_LABELS } from '@/lib/constants';
import { ActivityLog, Task } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch('/api/tasks');
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            // Find the current task to track changes
            const currentTask = tasks.find(t => t.id === taskId);
            const userName = 'User';

            // Generate activity logs for changes
            const newActivityLogs: ActivityLog[] = [];

            if (currentTask) {
                // Track status changes
                if (updates.status && updates.status !== currentTask.status) {
                    newActivityLogs.push({
                        id: `${Date.now()}-status`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `moved task from ${STATUS_LABELS[currentTask.status]} to ${STATUS_LABELS[updates.status]}`,
                        changes: {
                            field: 'Status',
                            oldValue: STATUS_LABELS[currentTask.status],
                            newValue: STATUS_LABELS[updates.status]
                        }
                    });
                }

                // Track week changes
                if (updates.week !== undefined && updates.week !== currentTask.week) {
                    newActivityLogs.push({
                        id: `${Date.now()}-week`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `moved task from Week ${currentTask.week || 'Backlog'} to Week ${updates.week || 'Backlog'}`,
                        changes: {
                            field: 'Week',
                            oldValue: currentTask.week || 'Backlog',
                            newValue: updates.week || 'Backlog'
                        }
                    });
                }

                // Track subtask changes
                if (updates.subtasks && JSON.stringify(updates.subtasks) !== JSON.stringify(currentTask.subtasks)) {
                    const oldSubtasks = currentTask.subtasks || [];
                    const newSubtasks = updates.subtasks || [];

                    // Check if subtasks were added
                    if (newSubtasks.length > oldSubtasks.length) {
                        const addedCount = newSubtasks.length - oldSubtasks.length;
                        const addedSubtasks = newSubtasks.slice(-addedCount);
                        addedSubtasks.forEach(subtask => {
                            newActivityLogs.push({
                                id: `${Date.now()}-subtask-add-${subtask.id}`,
                                timestamp: new Date().toISOString(),
                                user: userName,
                                action: `added subtask: "${subtask.text}"`,
                            });
                        });
                    }

                    // Check if subtasks were deleted
                    if (newSubtasks.length < oldSubtasks.length) {
                        const deletedCount = oldSubtasks.length - newSubtasks.length;
                        const oldIds = oldSubtasks.map(st => st.id);
                        const newIds = newSubtasks.map(st => st.id);
                        const deletedIds = oldIds.filter(id => !newIds.includes(id));
                        deletedIds.forEach(id => {
                            const deletedSubtask = oldSubtasks.find(st => st.id === id);
                            if (deletedSubtask) {
                                newActivityLogs.push({
                                    id: `${Date.now()}-subtask-delete-${id}`,
                                    timestamp: new Date().toISOString(),
                                    user: userName,
                                    action: `deleted subtask: "${deletedSubtask.text}"`,
                                });
                            }
                        });
                    }

                    // Check for completion status changes
                    const oldCompleted = oldSubtasks.filter(st => st.completed).length;
                    const newCompleted = newSubtasks.filter(st => st.completed).length;
                    if (oldCompleted !== newCompleted && newSubtasks.length === oldSubtasks.length) {
                        // Find which subtask was toggled
                        for (const newSubtask of newSubtasks) {
                            const oldSubtask = oldSubtasks.find(st => st.id === newSubtask.id);
                            if (oldSubtask && oldSubtask.completed !== newSubtask.completed) {
                                newActivityLogs.push({
                                    id: `${Date.now()}-subtask-toggle-${newSubtask.id}`,
                                    timestamp: new Date().toISOString(),
                                    user: userName,
                                    action: newSubtask.completed
                                        ? `completed subtask: "${newSubtask.text}"`
                                        : `marked subtask as incomplete: "${newSubtask.text}"`,
                                });
                            }
                        }
                    }
                }

                // Track title changes
                if (updates.title && updates.title !== currentTask.title) {
                    newActivityLogs.push({
                        id: `${Date.now()}-title`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `changed task title`,
                        changes: {
                            field: 'Title',
                            oldValue: currentTask.title,
                            newValue: updates.title
                        }
                    });
                }

                // Track company changes
                if (updates.company && updates.company !== currentTask.company) {
                    newActivityLogs.push({
                        id: `${Date.now()}-company`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `changed company`,
                        changes: {
                            field: 'Company',
                            oldValue: currentTask.company,
                            newValue: updates.company
                        }
                    });
                }

                // Track due date changes
                if (updates.dueDate && updates.dueDate !== currentTask.dueDate) {
                    newActivityLogs.push({
                        id: `${Date.now()}-duedate`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `changed due date`,
                        changes: {
                            field: 'Due Date',
                            oldValue: new Date(currentTask.dueDate).toLocaleDateString(),
                            newValue: new Date(updates.dueDate).toLocaleDateString()
                        }
                    });
                }

                // Track start date changes
                if (updates.startDate !== undefined && updates.startDate !== currentTask.startDate) {
                    newActivityLogs.push({
                        id: `${Date.now()}-startdate`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `changed start date`,
                        changes: {
                            field: 'Start Date',
                            oldValue: currentTask.startDate ? new Date(currentTask.startDate).toLocaleDateString() : 'None',
                            newValue: updates.startDate ? new Date(updates.startDate).toLocaleDateString() : 'None'
                        }
                    });
                }

                // Track difficulty changes
                if (updates.difficulty && updates.difficulty !== currentTask.difficulty) {
                    newActivityLogs.push({
                        id: `${Date.now()}-difficulty`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `changed difficulty`,
                        changes: {
                            field: 'Difficulty',
                            oldValue: currentTask.difficulty || 'Not set',
                            newValue: updates.difficulty
                        }
                    });
                }

                // Track importance changes
                if (updates.importance && updates.importance !== currentTask.importance) {
                    newActivityLogs.push({
                        id: `${Date.now()}-importance`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `changed importance`,
                        changes: {
                            field: 'Importance',
                            oldValue: currentTask.importance || 'Not set',
                            newValue: updates.importance
                        }
                    });
                }

                // Track comment additions
                if (updates.comments && updates.comments.length > (currentTask.comments?.length || 0)) {
                    // const newComment = updates.comments[updates.comments.length - 1]; // Unused
                    newActivityLogs.push({
                        id: `${Date.now()}-comment`,
                        timestamp: new Date().toISOString(),
                        user: userName,
                        action: `added a comment`,
                    });
                }
            }

            // Merge new activity logs with existing ones
            const updatedActivityLog = [
                ...(currentTask?.activityLog || []),
                ...newActivityLogs
            ];

            // Add activity log to updates
            const updatesWithLog = {
                ...updates,
                activityLog: updatedActivityLog
            };

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatesWithLog),
            });

            if (response.ok) {
                const updatedTask = await response.json();
                setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
                return updatedTask;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update task');
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
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
                const userName = 'User';
                const currentTask = tasks.find(t => t.id === taskId);

                const commentActivityLog: ActivityLog = {
                    id: `${Date.now()}-comment`,
                    timestamp: new Date().toISOString(),
                    user: userName,
                    action: `added a comment: "${text.length > 50 ? text.substring(0, 50) + '...' : text}"`,
                };

                const updatedActivityLog = [
                    ...(currentTask?.activityLog || []),
                    commentActivityLog
                ];

                // Update task with new activity log
                await updateTask(taskId, {
                    comments: [...(currentTask?.comments || []), newComment],
                    activityLog: updatedActivityLog
                });

                return newComment;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            throw error;
        }
    };

    const getDefaultDateForWeek = (weekNum: number) => {
        const startDays = [1, 8, 16, 24];
        const day = startDays[weekNum - 1];
        return `2026-01-${String(day).padStart(2, '0')}`;
    };

    const createTask = async (weekNum: number | null, status: string) => {
        const newTask: Partial<Task> = {
            title: '',
            company: 'Foan',
            week: weekNum,
            status: status as any,
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
                return createdTask;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create task');
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchTasks();
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    };

    return {
        tasks,
        setTasks,
        loading,
        fetchTasks,
        updateTask,
        addComment,
        createTask,
        deleteTask,
        getDefaultDateForWeek
    };
}
