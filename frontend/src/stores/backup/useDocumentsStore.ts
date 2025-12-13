import { create } from 'zustand';
import { PDFDocument } from 'pdf-lib';

export interface Document {
  id: string;
  name: string;
  pdfDoc: PDFDocument;
  arrayBuffer: ArrayBuffer;
  pageCount: number;
  currentPage: number;
}

interface DocumentsStore {
  documents: Document[];
  activeDocId: string | null;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  setActiveDoc: (id: string) => void;
}

export const useDocumentsStore = create<DocumentsStore>((set) => ({
  documents: [],
  activeDocId: null,

  addDocument: (doc) =>
    set((state) => ({
      documents: [...state.documents, doc],
      activeDocId: doc.id,
    })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      activeDocId: state.activeDocId === id ? null : state.activeDocId,
    })),

  setActiveDoc: (id) => set({ activeDocId: id }),
}));
