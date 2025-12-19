import { create } from 'zustand';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: string;
  description: string;
}

export interface KeyboardState {
  shortcuts: Map<string, KeyboardShortcut>;
  isShortcutsEnabled: boolean;
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  getShortcut: (key: string) => KeyboardShortcut | undefined;
  getAllShortcuts: () => KeyboardShortcut[];
  toggleShortcuts: () => void;
}

/**
 * Keyboard Shortcuts Store
 * Manages keyboard shortcuts registration and handling
 */
export const useKeyboardStore = create<KeyboardState>((set, get) => {
  const shortcuts = new Map<string, KeyboardShortcut>();

  // Register default shortcuts
  const defaultShortcuts: KeyboardShortcut[] = [
    // File operations
    { key: 'o', ctrl: true, action: 'open', description: 'Open PDF' },
    { key: 's', ctrl: true, action: 'save', description: 'Save PDF' },
    { key: 's', ctrl: true, shift: true, action: 'saveAs', description: 'Save As' },
    { key: 'p', ctrl: true, action: 'print', description: 'Print' },
    { key: 'q', ctrl: true, action: 'quit', description: 'Close Document' },

    // Edit operations
    { key: 'z', ctrl: true, action: 'undo', description: 'Undo' },
    { key: 'z', ctrl: true, shift: true, action: 'redo', description: 'Redo' },
    { key: 'y', ctrl: true, action: 'redo', description: 'Redo (Alt)' },
    { key: 'x', ctrl: true, action: 'cut', description: 'Cut' },
    { key: 'c', ctrl: true, action: 'copy', description: 'Copy' },
    { key: 'v', ctrl: true, action: 'paste', description: 'Paste' },
    { key: 'a', ctrl: true, action: 'selectAll', description: 'Select All' },

    // Navigation
    { key: 'ArrowLeft', action: 'previousPage', description: 'Previous Page' },
    { key: 'ArrowRight', action: 'nextPage', description: 'Next Page' },
    { key: 'Home', action: 'firstPage', description: 'First Page' },
    { key: 'End', action: 'lastPage', description: 'Last Page' },

    // View operations
    { key: '+', ctrl: true, action: 'zoomIn', description: 'Zoom In' },
    { key: '-', ctrl: true, action: 'zoomOut', description: 'Zoom Out' },
    { key: '0', ctrl: true, action: 'zoomReset', description: 'Reset Zoom' },
    { key: 'f', ctrl: true, action: 'fitWidth', description: 'Fit to Width' },

    // Tools
    { key: 'h', action: 'handTool', description: 'Hand Tool' },
    { key: 't', action: 'textTool', description: 'Text Tool' },
    { key: 'n', action: 'notesTool', description: 'Sticky Notes' },
    { key: 'h', ctrl: true, action: 'highlight', description: 'Highlight' },

    // Search & Find
    { key: 'f', ctrl: true, action: 'find', description: 'Find' },
    { key: 'g', ctrl: true, action: 'findNext', description: 'Find Next' },
    { key: 'g', ctrl: true, shift: true, action: 'findPrevious', description: 'Find Previous' },

    // Help
    { key: '?', action: 'showHelp', description: 'Show Help' },
    { key: 'F1', action: 'help', description: 'Help' },

    // Theme toggle
    { key: 't', ctrl: true, shift: true, action: 'toggleTheme', description: 'Toggle Dark Mode' },
  ];

  // Initialize default shortcuts
  defaultShortcuts.forEach((shortcut) => {
    shortcuts.set(shortcut.key, shortcut);
  });

  return {
    shortcuts,
    isShortcutsEnabled: true,

    /**
     * Register a new keyboard shortcut
     */
    registerShortcut: (shortcut: KeyboardShortcut) => {
      set((state) => {
        const newShortcuts = new Map(state.shortcuts);
        newShortcuts.set(shortcut.key, shortcut);
        return { shortcuts: newShortcuts };
      });
    },

    /**
     * Unregister a keyboard shortcut
     */
    unregisterShortcut: (key: string) => {
      set((state) => {
        const newShortcuts = new Map(state.shortcuts);
        newShortcuts.delete(key);
        return { shortcuts: newShortcuts };
      });
    },

    /**
     * Get a specific shortcut by key
     */
    getShortcut: (key: string) => {
      return get().shortcuts.get(key);
    },

    /**
     * Get all registered shortcuts
     */
    getAllShortcuts: () => {
      return Array.from(get().shortcuts.values());
    },

    /**
     * Toggle keyboard shortcuts on/off
     */
    toggleShortcuts: () => {
      set((state) => ({
        isShortcutsEnabled: !state.isShortcutsEnabled,
      }));
    },
  };
});

/**
 * Hook to handle keyboard events
 * Should be used in main app component
 */
export const useKeyboardHandler = () => {
  const { getShortcut, isShortcutsEnabled } = useKeyboardStore();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isShortcutsEnabled) return;

    // Check all registered shortcuts
    const shortcut = getShortcut(event.key);
    if (shortcut) {
      const ctrlMatch = shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const altMatch = shortcut.alt === event.altKey;
      const shiftMatch = shortcut.shift === event.shiftKey;

      if (ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        // Dispatch action based on shortcut
        window.dispatchEvent(
          new CustomEvent('keyboard-shortcut', {
            detail: { action: shortcut.action },
          })
        );
      }
    }
  };

  return { handleKeyDown };
};
