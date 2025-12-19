/**
 * Feature Utilities
 * Helper functions for future features
 */

import { useHistoryStore } from '@/stores/useHistoryStore';
import { useCollaborationStore } from '@/stores/useCollaborationStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useKeyboardStore } from '@/stores/useKeyboardStore';

/**
 * Undo/Redo Utilities
 */
export const historyUtils = {
  /**
   * Push state to history
   */
  pushState: (state: any) => {
    useHistoryStore.getState().push(state);
  },

  /**
   * Undo last action
   */
  undo: () => {
    useHistoryStore.getState().undo();
  },

  /**
   * Redo last undone action
   */
  redo: () => {
    useHistoryStore.getState().redo();
  },

  /**
   * Check if undo is available
   */
  canUndo: () => {
    return useHistoryStore.getState().canUndo;
  },

  /**
   * Check if redo is available
   */
  canRedo: () => {
    return useHistoryStore.getState().canRedo;
  },

  /**
   * Clear history
   */
  clearHistory: () => {
    useHistoryStore.getState().clear();
  },
};

/**
 * Collaboration Utilities
 */
export const collaborationUtils = {
  /**
   * Add a comment
   */
  addComment: (userId: string, userName: string, content: string, pageNumber: number, position: { x: number; y: number }) => {
    useCollaborationStore.getState().addComment({
      userId,
      userName,
      content,
      pageNumber,
      position,
      resolved: false,
    });
  },

  /**
   * Update comment
   */
  updateComment: (id: string, content: string) => {
    useCollaborationStore.getState().updateComment(id, content);
  },

  /**
   * Delete comment
   */
  deleteComment: (id: string) => {
    useCollaborationStore.getState().deleteComment(id);
  },

  /**
   * Resolve comment
   */
  resolveComment: (id: string) => {
    useCollaborationStore.getState().resolveComment(id);
  },

  /**
   * Share document
   */
  shareDocument: (name: string, ownerId: string, sharedWith: string[], permission: 'view' | 'comment' | 'edit') => {
    useCollaborationStore.getState().shareDocument({
      name,
      ownerId,
      sharedWith,
      permissions: permission,
      lastModified: Date.now(),
    });
  },

  /**
   * Unshare document
   */
  unshareDocument: (docId: string, userId: string) => {
    useCollaborationStore.getState().unshareDocument(docId, userId);
  },

  /**
   * Get all comments
   */
  getComments: () => {
    return useCollaborationStore.getState().comments;
  },

  /**
   * Get all shared documents
   */
  getSharedDocuments: () => {
    return useCollaborationStore.getState().sharedDocuments;
  },
};

/**
 * Theme Utilities
 */
export const themeUtils = {
  /**
   * Set theme
   */
  setTheme: (mode: 'light' | 'dark' | 'auto') => {
    useThemeStore.getState().setTheme(mode);
  },

  /**
   * Toggle between light and dark
   */
  toggleTheme: () => {
    useThemeStore.getState().toggleTheme();
  },

  /**
   * Get current theme
   */
  getTheme: () => {
    const state = useThemeStore.getState();
    return { mode: state.mode, isDark: state.isDarkMode };
  },

  /**
   * Initialize theme on app load
   */
  initializeTheme: () => {
    useThemeStore.getState().initializeTheme();
  },

  /**
   * Check if dark mode is active
   */
  isDarkMode: () => {
    return useThemeStore.getState().isDarkMode;
  },
};

/**
 * Keyboard Utilities
 */
export const keyboardUtils = {
  /**
   * Register a shortcut
   */
  registerShortcut: (key: string, action: string, description: string, ctrl = false, alt = false, shift = false) => {
    useKeyboardStore.getState().registerShortcut({
      key,
      action,
      description,
      ctrl,
      alt,
      shift,
    });
  },

  /**
   * Unregister a shortcut
   */
  unregisterShortcut: (key: string) => {
    useKeyboardStore.getState().unregisterShortcut(key);
  },

  /**
   * Get a shortcut
   */
  getShortcut: (key: string) => {
    return useKeyboardStore.getState().getShortcut(key);
  },

  /**
   * Get all shortcuts
   */
  getAllShortcuts: () => {
    return useKeyboardStore.getState().getAllShortcuts();
  },

  /**
   * Toggle shortcuts on/off
   */
  toggleShortcuts: () => {
    useKeyboardStore.getState().toggleShortcuts();
  },

  /**
   * Check if shortcuts are enabled
   */
  areShortcutsEnabled: () => {
    return useKeyboardStore.getState().isShortcutsEnabled;
  },
};
