import mongoose from 'mongoose';

export interface IComment {
  id: string;
  text: string;
  timestamp: Date;
  userId: string;
  userName: string;
}

export interface ITask extends mongoose.Document {
  id: string;
  title: string;
  company: 'Muncho' | 'Foan' | 'Both';
  week: number;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  assignee: string | null;
  dueDate: Date;
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new mongoose.Schema({
  id: String,
  text: String,
  timestamp: Date,
  userId: String,
  userName: String,
});

const TaskSchema = new mongoose.Schema<ITask>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    enum: ['Muncho', 'Foan', 'Both'],
    required: true,
  },
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },
  status: {
    type: String,
    enum: ['todo', 'inProgress', 'review', 'done'],
    default: 'todo',
  },
  assignee: {
    type: String,
    default: null,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  comments: [CommentSchema],
}, {
  timestamps: true,
});

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
