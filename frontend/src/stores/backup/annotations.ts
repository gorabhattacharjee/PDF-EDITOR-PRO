import { create } from 'zustand';

export interface Annotation {
  id: string;
  docId: string;
  page: number;
  type: 'highlight' | 'text' | 'rectangle' | 'note' | 'underline' | 'strikeout';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  fontSize?: number;
}

interface AnnotationsState {
  annotations: Annotation[];
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  clearAnnotations: (docId: string) => void;
}

export const useAnnotations = create<AnnotationsState>((set) => ({
  annotations: [],

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  clearAnnotations: (docId) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.docId !== docId),
    })),
}));
