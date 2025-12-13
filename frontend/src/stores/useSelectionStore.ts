// ============================================================================
// useDocumentsStore.ts — UPDATED SAFELY WITH INLINE TEXT EDIT SUPPORT
// ============================================================================
// Your original store is preserved exactly.
// Only ONE function has been added: updateActiveDocument()
// This lets inline editing write modified PDF bytes back to the current doc.
// ============================================================================

import { create } from "zustand";
import * as pdfjsLib from "pdfjs-dist";

// OPTIONAL: if your project uses pdf-lib for editing
import { PDFDocument } from "pdf-lib";

// ============================================================================
// DOCUMENT INTERFACE (AS IN YOUR CURRENT VERSION)
// ============================================================================
interface DocumentItem {
  id: string;
  name: string;
  data: ArrayBuffer;
  pdf: any;            // pdf.js loaded PDF
  thumbnails: string[]; // cached thumbnail images
  notes?: any[];
  highlights?: any[];
  penStrokes?: any[];
}

// ============================================================================
// STORE INTERFACE
// ============================================================================
interface DocumentsStore {
  documents: DocumentItem[];
  activeDocument: DocumentItem | null;

  addDocument: (name: string, buffer: ArrayBuffer) => Promise<void>;
  removeDocument: (id: string) => void;
  setActiveDocument: (id: string) => void;

  // ========================================================================
  // NEW: updateActiveDocument
  // This will be used by Inline Edit Text to replace the PDF file content
  // after editing it via pdf-lib.
  // ========================================================================
  updateActiveDocument: (newBytes: ArrayBuffer) => Promise<void>;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================
export const useDocumentsStore = create<DocumentsStore>((set, get) => ({

  documents: [],
  activeDocument: null,

  // ========================================================================
  // ADD DOCUMENT (Existing Code)
  // ========================================================================
  addDocument: async (name, buffer) => {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    const id = crypto.randomUUID();

    // Generate thumbnails for the document
    const thumbnails: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      thumbnails.push(canvas.toDataURL());
    }

    const newDoc: DocumentItem = {
      id,
      name,
      data: buffer,
      pdf,
      thumbnails,
      notes: [],
      highlights: [],
      penStrokes: []
    };

    set((s) => ({
      documents: [...s.documents, newDoc],
      activeDocument: newDoc,
    }));
  },

  // ========================================================================
  // REMOVE DOCUMENT (Existing)
  // ========================================================================
  removeDocument: (id) => {
    set((s) => {
      const remaining = s.documents.filter((d) => d.id !== id);
      return {
        documents: remaining,
        activeDocument: remaining.length > 0 ? remaining[0] : null,
      };
    });
  },

  // ========================================================================
  // SET ACTIVE DOCUMENT (Existing)
  // ========================================================================
  setActiveDocument: (id) => {
    const doc = get().documents.find((d) => d.id === id) || null;
    set({ activeDocument: doc });
  },

  // ========================================================================
  // NEW: updateActiveDocument() — REQUIRED FOR INLINE EDIT TEXT
  // ========================================================================
  updateActiveDocument: async (newBytes) => {
    const active = get().activeDocument;
    if (!active) return;

    // Reload PDF with pdf.js
    const loadingTask = pdfjsLib.getDocument({ data: newBytes });
    const pdf = await loadingTask.promise;

    // Re-generate thumbnails (same logic as addDocument)
    const thumbnails: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      thumbnails.push(canvas.toDataURL());
    }

    const updatedDoc: DocumentItem = {
      ...active,
      data: newBytes,
      pdf,
      thumbnails,
    };

    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === active.id ? updatedDoc : d
      ),
      activeDocument: updatedDoc,
    }));
  },

}));
