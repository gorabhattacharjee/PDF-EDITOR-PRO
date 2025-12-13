import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TextEdit {
  id: string;
  page: number;
  originalText: string;
  editedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontColor?: string;
  creationZoom: number;
}

interface TextEditsState {
  edits: Record<string, TextEdit[]>;
  addEdit: (docId: string, edit: TextEdit) => void;
  updateEdit: (docId: string, editId: string, newText: string) => void;
  getEdits: (docId: string) => TextEdit[];
  clearEdits: (docId: string) => void;
  clearAllEdits: () => void;
}

export const useTextEditsStore = create<TextEditsState>()(
  persist(
    (set, get) => ({
      edits: {},

      addEdit: (docId, edit) => {
        set((state) => {
          const docEdits = state.edits[docId] || [];
          const existingIndex = docEdits.findIndex((e) => e.id === edit.id);
          if (existingIndex >= 0) {
            const updated = [...docEdits];
            updated[existingIndex] = edit;
            return { edits: { ...state.edits, [docId]: updated } };
          }
          return { edits: { ...state.edits, [docId]: [...docEdits, edit] } };
        });
      },

      updateEdit: (docId, editId, newText) => {
        set((state) => {
          const docEdits = state.edits[docId] || [];
          const updated = docEdits.map((e) =>
            e.id === editId ? { ...e, editedText: newText } : e
          );
          return { edits: { ...state.edits, [docId]: updated } };
        });
      },

      getEdits: (docId) => {
        return get().edits[docId] || [];
      },

      clearEdits: (docId) => {
        set((state) => {
          const { [docId]: _, ...rest } = state.edits;
          return { edits: rest };
        });
      },

      clearAllEdits: () => {
        set({ edits: {} });
      },
    }),
    {
      name: "pdf-text-edits-storage",
    }
  )
);

export default useTextEditsStore;
