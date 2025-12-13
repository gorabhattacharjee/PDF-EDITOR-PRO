import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ImageEdit {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  deleted: boolean;
  imageData?: string;
  zoom?: number;
}

interface ImageEditsState {
  edits: { [docId: string]: ImageEdit[] };
  addEdit: (docId: string, edit: ImageEdit) => void;
  updateEdit: (docId: string, editId: string, updates: Partial<ImageEdit>) => void;
  removeEdit: (docId: string, editId: string) => void;
  clearEdits: (docId: string) => void;
}

export const useImageEditsStore = create<ImageEditsState>()(
  persist(
    (set) => ({
      edits: {},
      addEdit: (docId, edit) =>
        set((state) => {
          const docEdits = state.edits[docId] || [];
          const existingIndex = docEdits.findIndex((e) => e.id === edit.id);
          if (existingIndex >= 0) {
            const updated = [...docEdits];
            updated[existingIndex] = edit;
            return { edits: { ...state.edits, [docId]: updated } };
          }
          return { edits: { ...state.edits, [docId]: [...docEdits, edit] } };
        }),
      updateEdit: (docId, editId, updates) =>
        set((state) => {
          const docEdits = state.edits[docId] || [];
          const updated = docEdits.map((e) =>
            e.id === editId ? { ...e, ...updates } : e
          );
          return { edits: { ...state.edits, [docId]: updated } };
        }),
      removeEdit: (docId, editId) =>
        set((state) => {
          const docEdits = state.edits[docId] || [];
          return {
            edits: { ...state.edits, [docId]: docEdits.filter((e) => e.id !== editId) },
          };
        }),
      clearEdits: (docId) =>
        set((state) => ({ edits: { ...state.edits, [docId]: [] } })),
    }),
    {
      name: 'pdf-image-edits',
    }
  )
);
