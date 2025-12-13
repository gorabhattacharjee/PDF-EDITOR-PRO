import { create } from 'zustand';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';
import { useUIStore } from './useUIStore';

// PDF.js worker setup (optional - can be added when pdfjs-dist is installed)
// if (typeof window !== 'undefined') {
//   import('pdfjs-dist').then((pdfjsLib: any) => {
//     pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
//   });
// }

interface Document {
  id: string;
  name: string;
  file: File;
  pdfDoc: any;
  pdfLibDoc: PDFDocument;
  numPages: number;
  currentPage: number;
  pdfBytes?: ArrayBuffer; // Store PDF bytes for thumbnail generation
  version?: number; // Incremented on each edit to force re-renders
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
}

interface DocumentsState {
  documents: Document[];
  activeDocId: string | null;
  activeDocument: Document | null;
  openDocument: (file: File) => Promise<void>;
  closeDocument: (id: string) => void;
  setActiveDocument: (id: string) => void;
  setCurrentPage: (page: number) => void;
  updateDocument: (id: string, changes: Partial<Document>) => void;
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  activeDocId: null,
  activeDocument: null,

  openDocument: async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Convert to Uint8Array for safe passing to libraries
      // ArrayBuffer can become detached after passing to some libraries
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Create copies using proper cloning
      const arrayBuffer1 = new Uint8Array(uint8Array).buffer; // For thumbnails
      const arrayBuffer2 = new Uint8Array(uint8Array).buffer; // For pdf-lib

      // Load with PDF.js for rendering (when available)
      // PDF.js rendering will be added after pdfjs-dist is installed
      let pdfDoc: any = null;

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
        file,
        pdfDoc,
        pdfLibDoc,
        numPages: pdfLibDoc.getPages().length,
        currentPage: 1,
        pdfBytes: arrayBuffer1,
        version: 0, // Initialize version for proper change detection
      };

      console.log("[Store] Created newDoc with pdfBytes:", !!newDoc.pdfBytes, newDoc.pdfBytes?.byteLength);

      set((state) => ({
        documents: [...state.documents, newDoc],
        activeDocId: newDoc.id,
        activeDocument: newDoc,
      }));

      console.log("[Store] Document set to store");
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

      // Reset the page when switching to a different document
      if (newActiveDoc) {
        useUIStore.getState().setActivePage(newActiveDoc.currentPage - 1);
      } else {
        useUIStore.getState().setActivePage(0);
      }

      return {
        documents: newDocs,
        activeDocId: newActiveDoc?.id || null,
        activeDocument: newActiveDoc,
      };
    });
  },

  setActiveDocument: (id: string) => {
    set((state) => {
      const newActiveDoc = state.documents.find((doc) => doc.id === id) || null;
      
      // Reset the page to the document's current page (or 0 if new)
      if (newActiveDoc) {
        useUIStore.getState().setActivePage(newActiveDoc.currentPage - 1);
      }
      
      return {
        activeDocId: id,
        activeDocument: newActiveDoc,
      };
    });
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

  updateDocument: (id: string, changes: Partial<Document>) => {
    set((state) => {
      // Auto-increment version when pdfBytes changes to force re-renders
      const currentDoc = state.documents.find(d => d.id === id);
      const newVersion = (currentDoc?.version || 0) + (changes.pdfBytes ? 1 : 0);
      const changesWithVersion = changes.pdfBytes 
        ? { ...changes, version: newVersion }
        : changes;
      
      const updatedDocs = state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...changesWithVersion } : doc
      );

      const updatedActiveDoc =
        state.activeDocId === id
          ? { ...state.activeDocument!, ...changesWithVersion }
          : state.activeDocument;

      return {
        documents: updatedDocs,
        activeDocument: updatedActiveDoc,
      };
    });
  },
}));

export default useDocumentsStore;