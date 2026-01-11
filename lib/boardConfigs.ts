import { BoardConfig } from './types';

// Default board configurations based on the Trello screenshots
export const DEFAULT_BOARD_CONFIGS: Record<string, BoardConfig> = {
  'Ideas': {
    boardId: 'Ideas',
    columns: [
      { id: 'games', name: 'Games', order: 0 },
      { id: 'big-ideas', name: 'Big Ideas', order: 1 },
      { id: 'medium-ideas', name: 'Medium Ideas', order: 2 },
      { id: 'quick-easy', name: 'Quick, Easy Ideas', order: 3 },
      { id: 'ecommerce', name: 'Ecommerce', order: 4 },
      { id: 'companies', name: 'Companies worth copying', order: 5 },
      { id: 'd2c-brands', name: 'D2C Brands', order: 6 },
    ],
  },
  'Reading': {
    boardId: 'Reading',
    columns: [
      { id: 'watchlist', name: 'Watchlist', order: 0 },
      { id: 'movies', name: 'Movies', order: 1 },
      { id: 'tv-shows', name: 'TV Shows', order: 2 },
      { id: 'books', name: 'Books', order: 3 },
      { id: 'fiction', name: 'Fiction', order: 4 },
      { id: 'authors', name: 'Authors', order: 5 },
    ],
  },
  // Default generic board structure for other boards
  'default': {
    boardId: 'default',
    columns: [
      { id: 'todo', name: 'To Do', order: 0 },
      { id: 'in-progress', name: 'In Progress', order: 1 },
      { id: 'review', name: 'Review', order: 2 },
      { id: 'done', name: 'Done', order: 3 },
    ],
  },
};

// Get board configuration, fallback to default
export function getBoardConfig(boardId: string): BoardConfig {
  return DEFAULT_BOARD_CONFIGS[boardId] || {
    ...DEFAULT_BOARD_CONFIGS.default,
    boardId,
  };
}

// Save board configuration to localStorage
export function saveBoardConfig(config: BoardConfig): void {
  if (typeof window === 'undefined') return;
  const key = `board-config-${config.boardId}`;
  localStorage.setItem(key, JSON.stringify(config));
}

// Load board configuration from localStorage
export function loadBoardConfig(boardId: string): BoardConfig {
  if (typeof window === 'undefined') {
    return getBoardConfig(boardId);
  }

  const key = `board-config-${boardId}`;
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fall through to default
    }
  }

  return getBoardConfig(boardId);
}
