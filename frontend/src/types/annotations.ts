// src/types/annotations.ts

// Which tool is currently active in the UI
export type AnnotationTool =
  | "none"
  | "highlight"
  | "rect"
  | "pen"
  | "note";

// Base for all annotations
export interface BaseAnnotation {
  id: string;
  pageIndex: number; // 0-based page index
  type: Exclude<AnnotationTool, "none">;
}

// Rectangle / Highlight styles
export interface RectAnnotation extends BaseAnnotation {
  type: "highlight" | "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

// Freehand pen drawing
export interface PenPoint {
  x: number;
  y: number;
}

export interface PenAnnotation extends BaseAnnotation {
  type: "pen";
  points: PenPoint[];
  strokeWidth: number;
  color?: string;
}

// Sticky note
export interface NoteAnnotation extends BaseAnnotation {
  type: "note";
  x: number;
  y: number;
  text?: string;
}

export type Annotation =
  | RectAnnotation
  | PenAnnotation
  | NoteAnnotation;
