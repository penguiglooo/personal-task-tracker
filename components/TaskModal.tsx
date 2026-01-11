import { Task, Subtask } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdate: (taskId: string, updates: Partial<Task>, closeModal?: boolean) => Promise<boolean>;
    onAddComment: (taskId: string, text: string) => void;
    onDelete: (taskId: string) => void;
    canDelete: boolean;
    getDefaultDateForWeek: (weekNum: number) => string;
}

export function TaskModal({
    task,
    onClose,
    onUpdate,
    onAddComment,
    onDelete,
    canDelete,
    getDefaultDateForWeek
}: TaskModalProps) {
    const [editedTask, setEditedTask] = useState(task);
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [newSubtask, setNewSubtask] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'details' | 'changelog'>('details');
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
                comments: [...(editedTask.comments || []), optimisticComment]
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
                completed: false
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

            // Update local state
            const updatedAttachments = editedTask.attachments?.filter(att => att.id !== attachmentId) || [];
            setEditedTask(prev => ({
                ...prev,
                attachments: updatedAttachments
            }));

            // Persist to database immediately
            await onUpdate(task.id, {
                attachments: updatedAttachments,
                activityLog: [
                    ...(editedTask.activityLog || []),
                    {
                        id: `${Date.now()}-attachment-deleted`,
                        timestamp: new Date().toISOString(),
                        user: 'User',
                        action: `deleted attachment`
                    }
                ]
            });
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Edit Task
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'details'
                                    ? 'border-gray-800 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('changelog')}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'changelog'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Changelog
                            {editedTask.activityLog && editedTask.activityLog.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs">
                                    {editedTask.activityLog.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'details' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={editedTask.title}
                                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={editedTask.description || ''}
                                    onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 resize-none"
                                    rows={4}
                                    placeholder="Add a detailed description..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <select
                                    value={editedTask.company}
                                    onChange={(e) => setEditedTask({ ...editedTask, company: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                >
                                    <option value="Foan">Foan</option>
                                    <option value="Muncho">Muncho</option>
                                    <option value="Marketing O">Marketing O</option>
                                    <option value="Personal">Personal</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={editedTask.status}
                                    onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                                            setEditedTask({ ...editedTask, week: newWeek, isBacklog: true });
                                        } else {
                                            const newWeek = parseInt(value);
                                            const newDueDate = getWeekFromDate(editedTask.dueDate) !== newWeek
                                                ? getDefaultDateForWeek(newWeek)
                                                : editedTask.dueDate;
                                            setEditedTask({ ...editedTask, week: newWeek, dueDate: newDueDate, isBacklog: false });
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                                        onChange={(e) => setEditedTask({ ...editedTask, difficulty: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                                        onChange={(e) => setEditedTask({ ...editedTask, importance: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Optional)</label>
                                <input
                                    type="date"
                                    value={editedTask.startDate ? editedTask.startDate.split('T')[0] : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const startDate = value ? value : undefined;
                                        const dueDateStr = editedTask.dueDate ? editedTask.dueDate.split('T')[0] : '';

                                        // If start date is set and is after due date, adjust due date
                                        if (startDate && dueDateStr && startDate > dueDateStr) {
                                            const newWeek = getWeekFromDate(startDate);
                                            setEditedTask({ ...editedTask, startDate, dueDate: startDate, week: newWeek });
                                        } else {
                                            setEditedTask({ ...editedTask, startDate });
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                />
                                <div className="mt-1 text-xs text-gray-500">
                                    Leave empty for single-day tasks
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={editedTask.dueDate.split('T')[0]}
                                    onChange={(e) => {
                                        const dueDate = e.target.value;
                                        if (!dueDate) return; // Prevent empty due date

                                        const newWeek = getWeekFromDate(dueDate);
                                        const startDateStr = editedTask.startDate ? editedTask.startDate.split('T')[0] : '';

                                        // If due date is before start date, adjust start date
                                        if (startDateStr && dueDate < startDateStr) {
                                            setEditedTask({ ...editedTask, startDate: dueDate, dueDate, week: newWeek });
                                        } else {
                                            setEditedTask({ ...editedTask, dueDate, week: newWeek });
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                                                    <button
                                                        onClick={() => handleDeleteSubtask(subtask.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                                    <button
                                                        onClick={() => handleDeleteAttachment(attachment.id)}
                                                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
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
                            </div>
                        </div>
                    ) : (
                        /* Changelog Tab */
                        <div className="space-y-4">
                            {!editedTask.activityLog || editedTask.activityLog.length === 0 ? (
                                <div className="bg-gray-50 rounded-lg p-12 text-center">
                                    <p className="text-gray-500 text-lg">No activity yet</p>
                                    <p className="text-gray-400 text-sm mt-2">Changes to this task will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {[...editedTask.activityLog].reverse().map((log) => {
                                        const getActionIcon = (action: string) => {
                                            if (action.includes('created')) return '✨';
                                            if (action.includes('moved') || action.includes('status')) return '🔄';
                                            if (action.includes('assigned')) return '👤';
                                            if (action.includes('updated') || action.includes('changed')) return '✏️';
                                            if (action.includes('completed') || action.includes('subtask')) return '✅';
                                            return '📝';
                                        };

                                        const getActionColor = (action: string) => {
                                            if (action.includes('created')) return 'bg-green-50 border-green-200 text-green-800';
                                            if (action.includes('moved') || action.includes('status')) return 'bg-blue-50 border-blue-200 text-blue-800';
                                            if (action.includes('assigned')) return 'bg-purple-50 border-purple-200 text-purple-800';
                                            if (action.includes('completed')) return 'bg-emerald-50 border-emerald-200 text-emerald-800';
                                            return 'bg-gray-50 border-gray-200 text-gray-800';
                                        };

                                        return (
                                            <div
                                                key={log.id}
                                                className={`border-l-4 rounded-lg p-4 ${getActionColor(log.action)}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">{getActionIcon(log.action)}</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-sm">
                                                                    <span className="font-bold">{log.user}</span> {log.action}
                                                                </p>
                                                                {log.changes && (
                                                                    <div className="mt-2 text-xs bg-white bg-opacity-50 rounded p-2">
                                                                        <span className="font-medium">{log.changes.field}:</span>{' '}
                                                                        <span className="line-through text-gray-600">{log.changes.oldValue}</span>
                                                                        {' → '}
                                                                        <span className="font-semibold">{log.changes.newValue}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-right ml-4">
                                                                <span className="text-xs text-gray-600 block">
                                                                    {new Date(log.timestamp).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                                                        hour: 'numeric',
                                                                        minute: '2-digit',
                                                                        hour12: true
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
