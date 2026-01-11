import { Task } from "@/lib/types";

type DateObj = { month: number; day: number; year: number; dateStr: string };

export const isDateInTaskRange = (dateStr: string, task: Task) => {
    const taskStart = (task.startDate || task.dueDate).split('T')[0];
    const taskEnd = task.dueDate.split('T')[0];
    return dateStr >= taskStart && dateStr <= taskEnd;
};

export const isFirstDayInWeek = (dateStr: string, task: Task, week: DateObj[]) => {
    const taskStart = (task.startDate || task.dueDate).split('T')[0];
    if (dateStr !== taskStart) {
        // Check if start date is in a previous week
        const dateIndex = week.findIndex(d => d.dateStr === dateStr);
        if (dateIndex === 0) {
            // First day of week, check if task started before
            return dateStr > taskStart;
        }
        return false;
    }
    return true;
};

export const isLastDayInWeek = (dateStr: string, task: Task, week: DateObj[]) => {
    const taskEnd = task.dueDate.split('T')[0];
    if (dateStr !== taskEnd) {
        // Check if end date is in a later week
        const dateIndex = week.findIndex(d => d.dateStr === dateStr);
        if (dateIndex === 6) {
            // Last day of week, check if task continues
            return dateStr < taskEnd;
        }
        return false;
    }
    return true;
};
