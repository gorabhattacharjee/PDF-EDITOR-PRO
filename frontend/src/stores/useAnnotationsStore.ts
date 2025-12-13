import { create } from "zustand";

export type MarkupType = "highlight" | "underline" | "strikeout";

export interface Highlight {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  page: number;
  creationZoom: number;
  type?: MarkupType;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  page: number;
  text: string;
  color: string;
  creationZoom: number;
  isExpanded?: boolean;
}

export interface PenStroke {
  id: string;
  page: number;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  creationZoom: number;
}

export type ShapeType = "rectangle" | "circle" | "line" | "arrow";

export interface Shape {
  id: string;
  page: number;
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled?: boolean;
  creationZoom: number;
}

export interface Annotation {
  id: string;
  page: number;
  type: "highlight" | "underline" | "strikeout" | "pen" | "shapes" | "sticky-note";
  rect: { x: number; y: number; width: number; height: number };
  points?: { x: number; y: number }[];
  color?: string;
  text?: string;
}

interface AnnotationsState {
  annotations: { [docId: string]: Annotation[] };
  highlights: { [docId: string]: Highlight[] };
  stickyNotes: { [docId: string]: StickyNote[] };
  penStrokes: { [docId: string]: PenStroke[] };
  shapes: { [docId: string]: Shape[] };
  
  addAnnotation: (docId: string, annotation: Annotation) => void;
  addHighlight: (docId: string, highlight: Highlight) => void;
  addHighlights: (docId: string, highlights: Highlight[]) => void;
  clearHighlights: (docId: string) => void;
  getHighlights: (docId: string) => Highlight[];
  
  addStickyNote: (docId: string, note: StickyNote) => void;
  updateStickyNote: (docId: string, noteId: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (docId: string, noteId: string) => void;
  
  addPenStroke: (docId: string, stroke: PenStroke) => void;
  deletePenStroke: (docId: string, strokeId: string) => void;
  
  addShape: (docId: string, shape: Shape) => void;
  deleteShape: (docId: string, shapeId: string) => void;
}

export const useAnnotationsStore = create<AnnotationsState>((set, get) => ({
  annotations: {},
  highlights: {},
  stickyNotes: {},
  penStrokes: {},
  shapes: {},
  
  addAnnotation: (docId, annotation) =>
    set((state) => ({
      annotations: {
        ...state.annotations,
        [docId]: [...(state.annotations[docId] || []), annotation],
      },
    })),
  addHighlight: (docId, highlight) =>
    set((state) => ({
      highlights: {
        ...state.highlights,
        [docId]: [...(state.highlights[docId] || []), highlight],
      },
    })),
  addHighlights: (docId, newHighlights) =>
    set((state) => ({
      highlights: {
        ...state.highlights,
        [docId]: [...(state.highlights[docId] || []), ...newHighlights],
      },
    })),
  clearHighlights: (docId) =>
    set((state) => ({
      highlights: {
        ...state.highlights,
        [docId]: [],
      },
    })),
  getHighlights: (docId) => get().highlights[docId] || [],
  
  addStickyNote: (docId, note) =>
    set((state) => ({
      stickyNotes: {
        ...state.stickyNotes,
        [docId]: [...(state.stickyNotes[docId] || []), note],
      },
    })),
  updateStickyNote: (docId, noteId, updates) =>
    set((state) => ({
      stickyNotes: {
        ...state.stickyNotes,
        [docId]: (state.stickyNotes[docId] || []).map((note) =>
          note.id === noteId ? { ...note, ...updates } : note
        ),
      },
    })),
  deleteStickyNote: (docId, noteId) =>
    set((state) => ({
      stickyNotes: {
        ...state.stickyNotes,
        [docId]: (state.stickyNotes[docId] || []).filter((note) => note.id !== noteId),
      },
    })),
    
  addPenStroke: (docId, stroke) =>
    set((state) => ({
      penStrokes: {
        ...state.penStrokes,
        [docId]: [...(state.penStrokes[docId] || []), stroke],
      },
    })),
  deletePenStroke: (docId, strokeId) =>
    set((state) => ({
      penStrokes: {
        ...state.penStrokes,
        [docId]: (state.penStrokes[docId] || []).filter((s) => s.id !== strokeId),
      },
    })),
    
  addShape: (docId, shape) =>
    set((state) => ({
      shapes: {
        ...state.shapes,
        [docId]: [...(state.shapes[docId] || []), shape],
      },
    })),
  deleteShape: (docId, shapeId) =>
    set((state) => ({
      shapes: {
        ...state.shapes,
        [docId]: (state.shapes[docId] || []).filter((s) => s.id !== shapeId),
      },
    })),
}));
