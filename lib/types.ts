export interface Comment {
    id: string;
    text: string;
    timestamp: string;
    userId: string;
    userName: string;
}

export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
}

export interface ActivityLog {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    };
}

export interface BoardColumn {
    id: string;
    name: string;
    order: number;
}

export interface BoardConfig {
    boardId: string;
    columns: BoardColumn[];
}

export interface Task {
    _id: string;
    id: string;
    title: string;
    description?: string;
    company: 'Foan' | 'Muncho' | 'Marketing O' | 'Personal';
    week: number | null;
    status: 'todo' | 'inProgress' | 'review' | 'done';
    startDate?: string;
    dueDate: string;
    comments: Comment[];
    subtasks?: Subtask[];
    attachments?: Attachment[];
    activityLog?: ActivityLog[];
    isBacklog?: boolean;
    createdAt: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    importance?: 'Low' | 'Medium' | 'High' | 'Critical';
    boardId?: string;
    boardColumn?: string; // Column ID for board tasks
}
