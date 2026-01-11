import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Home,
  Layout,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";

interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onSearch?: (query: string) => void;
  onNewTask?: () => void;
  onToggleFilters?: () => void;
  className?: string;
}

export function AppSidebar({
  currentView,
  onViewChange,
  isDarkMode,
  toggleDarkMode,
  onSearch,
  onNewTask,
  onToggleFilters,
  className
}: AppSidebarProps) {
  const [weeksOpen, setWeeksOpen] = useState(false);
  const [boardsOpen, setBoardsOpen] = useState(false);

  const PROJECT_BOARDS = [
    { id: 'board-apps', label: 'Apps', icon: '📱' },
    { id: 'board-ideas', label: 'Ideas', icon: '💡' },
    { id: 'board-jokes', label: 'Jokes', icon: '😄' },
    { id: 'board-stories', label: 'Stories', icon: '📖' },
    { id: 'board-learning', label: 'Learning', icon: '🎓' },
    { id: 'board-reading', label: 'Reading', icon: '📚' },
    { id: 'board-watching', label: 'Watching', icon: '🎬' },
    { id: 'board-tools', label: 'Tools', icon: '🔧' },
    { id: 'board-shopping', label: 'Shopping', icon: '🛒' },
    { id: 'board-personal', label: 'Personal', icon: '👤' },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          onViewChange('home');
          break;
        case 'c':
          onViewChange('calendar');
          break;
        case 'b':
          onViewChange('backlog');
          break;
        case 'a':
          onViewChange('analytics');
          break;
        case '1':
          onViewChange('week-1');
          break;
        case '2':
          onViewChange('week-2');
          break;
        case '3':
          onViewChange('week-3');
          break;
        case '4':
          onViewChange('week-4');
          break;
        case 'n':
          e.preventDefault();
          onNewTask?.();
          break;
        case 'f':
          e.preventDefault();
          onToggleFilters?.();
          break;
        case '?':
          // Show shortcuts modal (optional - can implement later)
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewChange, onNewTask, onToggleFilters]);

  const NavItem = ({
    view,
    icon: Icon,
    label,
    rightElement,
    shortcut,
    emoji
  }: {
    view: string;
    icon?: any;
    label: string;
    rightElement?: React.ReactNode;
    shortcut?: string;
    emoji?: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onViewChange(view)}
      className={cn(
        "w-full justify-start gap-2 h-8 px-2 font-normal text-muted-foreground hover:text-foreground",
        currentView === view && "bg-accent text-accent-foreground font-medium"
      )}
    >
      {emoji ? (
        <span className="text-sm">{emoji}</span>
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          {shortcut}
        </kbd>
      )}
      {rightElement}
    </Button>
  );

  return (
    <div className={cn("w-64 border-r border-border bg-[#F7F7F5] dark:bg-[#191919] flex flex-col h-screen", className)}>
      {/* Workspace Switcher */}
      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start px-2 h-10 gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <div className="h-5 w-5 bg-orange-400 rounded flex items-center justify-center text-[10px] font-bold text-white leading-none">
            D
          </div>
          <span className="font-medium text-sm truncate flex-1 text-left">Task Tracker</span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </div>

      {/* Search & Actions */}
      <div className="px-3 space-y-1 mb-4 relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-8 pr-8 h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#252525] dark:border-[#333]"
            onChange={(e) => onSearch?.(e.target.value)}
          />
          <kbd className="absolute right-2 top-2 pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-6">
          {/* Main Links */}
          <div className="space-y-0.5">
            <NavItem view="home" icon={Home} label="Home" shortcut="H" />
            <NavItem view="calendar" icon={Calendar} label="Calendar" shortcut="C" />
            <NavItem view="backlog" icon={LayoutDashboard} label="Backlog" shortcut="B" />
          </div>

          {/* Weeks Section */}
          <div>
            <div
              className="flex items-center group px-2 py-1.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground mb-0.5"
              onClick={() => setWeeksOpen(!weeksOpen)}
            >
              {weeksOpen ? (
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="flex-1">WEEKS</span>
            </div>
            {weeksOpen && (
              <div className="space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                <NavItem view="week-1" icon={FileText} label="W1 1-7 Jan" shortcut="1" />
                <NavItem view="week-2" icon={FileText} label="W2 8-15 Jan" shortcut="2" />
                <NavItem view="week-3" icon={FileText} label="W3 16-23 Jan" shortcut="3" />
                <NavItem view="week-4" icon={FileText} label="W4 24-31 Jan" shortcut="4" />
              </div>
            )}
          </div>

          {/* Boards Section */}
          <div>
            <div
              className="flex items-center group px-2 py-1.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground mb-0.5"
              onClick={() => setBoardsOpen(!boardsOpen)}
            >
              {boardsOpen ? (
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="flex-1">BOARDS</span>
            </div>
            {boardsOpen && (
              <div className="space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                {PROJECT_BOARDS.map((board) => (
                  <NavItem
                    key={board.id}
                    view={board.id}
                    emoji={board.icon}
                    label={board.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Insights Section */}
          <div>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mb-0.5">
              INSIGHTS
            </div>
            <div className="space-y-0.5">
              <NavItem view="analytics" icon={Layout} label="Analytics" shortcut="A" />
              <NavItem view="changelog" icon={Zap} label="Changelog" />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 px-2 font-normal text-muted-foreground"
          onClick={toggleDarkMode}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 px-2 font-normal text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Reset Password</span>
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 px-2 font-normal text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
