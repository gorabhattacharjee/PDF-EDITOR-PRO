import { create } from 'zustand';

interface Action {
  type: string;
  data: any;
  timestamp: number;
}

interface HistoryStore {
  past: Action[];
  future: Action[];
  push: (action: Action) => void;
  undo: () => void;
  redo: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  push: (action) => {
    set((state) => ({
      past: [...state.past, action],
      future: [],
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    const action = past[past.length - 1];
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [action, ...state.future],
    }));
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    const action = future[0];
    set((state) => ({
      past: [...state.past, action],
      future: state.future.slice(1),
    }));
  },
}));
