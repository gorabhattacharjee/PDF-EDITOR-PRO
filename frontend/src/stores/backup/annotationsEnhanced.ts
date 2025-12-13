/**
 * Enhanced Annotations Store
 * Manages all annotations with undo/redo support
 */

import { create } from 'zustand';

export interface Annotation {
  id: string;
  type: 'highlight' | 'underline' | 'strikeout' | 'sticky-note' | 'pen' | 'shape' | 'text' | 'image';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
  points?: { x: number; y: number }[];
  imageData?: string;
  timestamp: number;
}

interface AnnotationsState {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  selectAnnotation: (id: string | null) => void;
  getAnnotationsForPage: (page: number) => Annotation[];
  clearAnnotations: () => void;
}

export const useAnnotationsEnhanced = create<AnnotationsState>((set, get) => ({
  annotations: [],
  selectedAnnotation: null,

  addAnnotation: (annotation) => {
    set((state) => ({
      annotations: [...state.annotations, annotation]
    }));
  },

  removeAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotation: state.selectedAnnotation === id ? null : state.selectedAnnotation
    }));
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  },

  selectAnnotation: (id) => {
    set({ selectedAnnotation: id });
  },

  getAnnotationsForPage: (page) => {
    return get().annotations.filter((a) => a.page === page);
  },

  clearAnnotations: () => {
    set({ annotations: [], selectedAnnotation: null });
  }
}));
