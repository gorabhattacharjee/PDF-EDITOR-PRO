import { create } from 'zustand';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface Document {
  id: string;
  name: string;
  file: File;
  pdfDoc: any;
  pdfLibDoc: PDFDocument;
  numPages: number;
  currentPage: number;
}

interface DocumentsState {
  documents: Document[];
  activeDocId: string | null;
  activeDocument: Document | null;
  openDocument: (file: File) => Promise<void>;
  closeDocument: (id: string) => void;
  setActiveDocument: (id: string) => void;
  setCurrentPage: (page: number) => void;
}

export const useDocuments = create<DocumentsState>((set, get) => ({
  documents: [],
  activeDocId: null,
  activeDocument: null,

  openDocument: async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Clone the ArrayBuffer for each library (prevents detached buffer issue)
      const arrayBuffer1 = arrayBuffer.slice(0); // For PDF.js
      const arrayBuffer2 = arrayBuffer.slice(0); // For pdf-lib

      // Load with PDF.js for rendering
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer1 });
      const pdfDoc = await loadingTask.promise;

      // Try to load with pdf-lib for editing
      let pdfLibDoc: PDFDocument;

      try {
        pdfLibDoc = await PDFDocument.load(arrayBuffer2);
      } catch (loadError: any) {
        // Check if PDF is encrypted
        if (loadError.message && loadError.message.includes('encrypted')) {
          toast.error('⚠️ This PDF is password-protected. Editing features will be limited.', {
            duration: 5000,
          });

          // Create a blank PDFDocument as fallback
          // User can still view but not edit
          pdfLibDoc = await PDFDocument.create();

          // Optionally prompt for password
          const password = prompt(
            'This PDF is encrypted. Enter password to enable editing (or Cancel to view only):'
          );

          if (password) {
            toast.error(
              'Password-protected PDF editing is not yet supported. You can view the document only.',
              {
                duration: 4000,
              }
            );
          }
        } else {
          throw loadError;
        }
      }

      // Create new document object with file included
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: file.name,
        file, // ✅ FILE IS STORED HERE FOR CONVERSION
        pdfDoc,
        pdfLibDoc,
        numPages: pdfDoc.numPages,
        currentPage: 1,
      };

      set((state) => ({
        documents: [...state.documents, newDoc],
        activeDocId: newDoc.id,
        activeDocument: newDoc,
      }));

      toast.success(`✅ Opened ${file.name}`);
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast.error(
        `Failed to open PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  },

  closeDocument: (id: string) => {
    set((state) => {
      const newDocs = state.documents.filter((doc) => doc.id !== id);
      const newActiveDoc = newDocs.length > 0 ? newDocs[0] : null;

      return {
        documents: newDocs,
        activeDocId: newActiveDoc?.id || null,
        activeDocument: newActiveDoc,
      };
    });
  },

  setActiveDocument: (id: string) => {
    set((state) => ({
      activeDocId: id,
      activeDocument: state.documents.find((doc) => doc.id === id) || null,
    }));
  },

  setCurrentPage: (page: number) => {
    set((state) => {
      if (!state.activeDocument) return state;

      const updatedDoc = { ...state.activeDocument, currentPage: page };
      const updatedDocs = state.documents.map((doc) =>
        doc.id === state.activeDocId ? updatedDoc : doc
      );

      return {
        documents: updatedDocs,
        activeDocument: updatedDoc,
      };
    });
  },
}));
