import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task } from "@/lib/types";
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Clock, ListTodo } from "lucide-react";

interface HomeViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

export function HomeView({ tasks, onTaskClick }: HomeViewProps) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = `${next7Days.getFullYear()}-${String(next7Days.getMonth() + 1).padStart(2, '0')}-${String(next7Days.getDate()).padStart(2, '0')}`;

    const stats = {
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'inProgress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
    };

    const todaysTasks = tasks.filter(task => {
        const taskDate = task.dueDate?.split('T')[0];
        return task.status !== 'done' && taskDate === todayStr;
    });

    const overdueTasks = tasks.filter(task => {
        const taskDate = task.dueDate?.split('T')[0];
        return task.status !== 'done' && taskDate && taskDate < todayStr;
    });

    const TaskItem = ({ task }: { task: Task }) => (
        <div
            onClick={() => onTaskClick(task)}
            className="group flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:shadow-sm transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors">
                    {task.title || '(No title)'}
                </span>
                {task.importance === 'Critical' && (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-normal tracking-wide uppercase">
                    {task.status === 'inProgress' ? 'In Progress' : task.status}
                </Badge>

                {task.company && (
                    <Badge variant="outline" className="px-1.5 py-0 h-5 text-[10px] font-normal border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20">
                        {task.company}
                    </Badge>
                )}

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, Dhruv!</h1>
                <p className="text-muted-foreground text-lg">Here's your task overview for today</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-3xl font-bold mb-1">{stats.todo}</div>
                        <div className="text-sm font-medium text-muted-foreground">To Do</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-3xl font-bold mb-1">{stats.inProgress}</div>
                        <div className="text-sm font-medium text-muted-foreground">In Progress</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-3xl font-bold mb-1">{stats.review}</div>
                        <div className="text-sm font-medium text-muted-foreground">In Review</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-3xl font-bold mb-1">{stats.done}</div>
                        <div className="text-sm font-medium text-muted-foreground">Completed</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ListTodo className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Today's Tasks ({todaysTasks.length})</h2>
                    </div>
                    <div className="space-y-3">
                        {todaysTasks.length > 0 ? (
                            todaysTasks.map(task => <TaskItem key={task.id} task={task} />)
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
                                <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                                <p>No tasks due today</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Overdue Tasks ({overdueTasks.length})</h2>
                    </div>
                    <div className="space-y-3">
                        {overdueTasks.length > 0 ? (
                            overdueTasks.map(task => <TaskItem key={task.id} task={task} />)
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
                                <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                                <p>No overdue tasks</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
