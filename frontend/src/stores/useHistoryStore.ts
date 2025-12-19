import { create } from 'zustand';

export interface HistoryState {
  past: any[];
  present: any;
  future: any[];
  canUndo: boolean;
  canRedo: boolean;
  push: (state: any) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

/**
 * History Store for Undo/Redo functionality
 * Implements a standard undo/redo pattern with past, present, and future stacks
 */
export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  present: null,
  future: [],
  canUndo: false,
  canRedo: false,

  /**
   * Push new state to history
   * Clears future stack when new action is performed
   */
  push: (state: any) => {
    const { present } = get();
    if (present !== null) {
      set((s) => ({
        past: [...s.past, s.present],
        present: state,
        future: [],
        canUndo: true,
        canRedo: false,
      }));
    } else {
      set({ present: state, canUndo: false });
    }
  },

  /**
   * Undo last action
   * Moves current state to future and restores previous state
   */
  undo: () => {
    const { past, present, future } = get();
    if (past.length === 0) return;

    const newPresent = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [present, ...future];

    set({
      past: newPast,
      present: newPresent,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  /**
   * Redo last undone action
   * Moves state from future stack back to present
   */
  redo: () => {
    const { past, present, future } = get();
    if (future.length === 0) return;

    const newPresent = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, present];

    set({
      past: newPast,
      present: newPresent,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },

  /**
   * Clear history
   * Reset all stacks
   */
  clear: () => {
    set({
      past: [],
      present: null,
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));
