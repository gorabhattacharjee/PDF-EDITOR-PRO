import { create } from 'zustand';

interface HistoryAction {
  type: string;
  data?: any;
  timestamp?: number;
}

interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
  canUndo: boolean;
  canRedo: boolean;
  pushAction: (action: HistoryAction) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

export const useHistory = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushAction: (action: HistoryAction) => {
    set((state) => ({
      past: [...state.past, { ...action, timestamp: Date.now() }],
      future: [],
      canUndo: true,
      canRedo: false,
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    const lastAction = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      past: newPast,
      future: [lastAction, ...get().future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    const nextAction = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...get().past, nextAction],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },

  clearHistory: () =>
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    }),
}));
