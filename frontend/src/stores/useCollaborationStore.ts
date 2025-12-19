import { create } from 'zustand';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  pageNumber: number;
  position: { x: number; y: number };
  resolved: boolean;
}

export interface SharedDocument {
  id: string;
  name: string;
  ownerId: string;
  sharedWith: string[];
  shareLink: string;
  createdAt: number;
  lastModified: number;
  permissions: 'view' | 'comment' | 'edit';
}

export interface CollaborationState {
  // Comments
  comments: Comment[];
  addComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  syncComments: (comments: Comment[]) => void;

  // Document Sharing
  sharedDocuments: SharedDocument[];
  shareDocument: (doc: Omit<SharedDocument, 'id' | 'shareLink' | 'createdAt'>) => void;
  unshareDocument: (docId: string, userId: string) => void;
  updateSharePermissions: (docId: string, permission: 'view' | 'comment' | 'edit') => void;

  // Sync Status
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  setSyncStatus: (isSyncing: boolean, error?: string) => void;
}

/**
 * Collaboration Store
 * Manages comments, document sharing, and real-time sync
 * Note: Actual cloud sync implementation requires backend integration
 */
export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  comments: [],
  sharedDocuments: [],
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,

  /**
   * Add new comment
   */
  addComment: (comment) => {
    const id = `comment_${Date.now()}`;
    const timestamp = Date.now();
    set((state) => ({
      comments: [...state.comments, { ...comment, id, timestamp }],
    }));
  },

  /**
   * Update comment content
   */
  updateComment: (id, content) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === id ? { ...c, content } : c
      ),
    }));
  },

  /**
   * Delete comment
   */
  deleteComment: (id) => {
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
    }));
  },

  /**
   * Mark comment as resolved
   */
  resolveComment: (id) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      ),
    }));
  },

  /**
   * Sync comments from server
   * Called when receiving updates from cloud storage
   */
  syncComments: (comments) => {
    set({ comments, lastSyncTime: Date.now() });
  },

  /**
   * Share document with other users
   */
  shareDocument: (doc) => {
    const id = `doc_${Date.now()}`;
    const shareLink = `https://pdf-editor-pro.app/share/${id}`;
    const createdAt = Date.now();
    const lastModified = Date.now();

    set((state) => ({
      sharedDocuments: [
        ...state.sharedDocuments,
        { ...doc, id, shareLink, createdAt, lastModified },
      ],
    }));
  },

  /**
   * Remove user from document sharing
   */
  unshareDocument: (docId, userId) => {
    set((state) => ({
      sharedDocuments: state.sharedDocuments.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              sharedWith: doc.sharedWith.filter((u) => u !== userId),
            }
          : doc
      ),
    }));
  },

  /**
   * Update sharing permissions
   */
  updateSharePermissions: (docId, permission) => {
    set((state) => ({
      sharedDocuments: state.sharedDocuments.map((doc) =>
        doc.id === docId ? { ...doc, permissions: permission } : doc
      ),
    }));
  },

  /**
   * Set sync status
   */
  setSyncStatus: (isSyncing, error = null) => {
    set({
      isSyncing,
      syncError: error || null,
      lastSyncTime: isSyncing ? null : Date.now(),
    });
  },
}));
