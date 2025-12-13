import { create } from 'zustand';

export interface Annotation {
  id: string;
  documentId: string;
  pageNumber: number;
  type: 'highlight' | 'underline' | 'strikeout' | 'stickyNote' | 'redaction';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
}

interface AnnotationsStore {
  annotations: Annotation[];
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
}

export const useAnnotationsStore = create<AnnotationsStore>((set) => ({
  annotations: [],

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  deleteAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),
}));
