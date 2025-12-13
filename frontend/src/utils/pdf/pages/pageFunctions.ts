// /src/utils/pdf/pages/pageFunctions.ts

import { PDFDocument } from "pdf-lib";

export interface PageDeps {
  activeDoc: any;
  updateDocument: (id: string, changes: any) => void;
  baseName: (name: string | undefined, fallback: string) => string;
  toast: any; // react-hot-toast
}

/**
 * Page insertion + deletion handlers
 * Pure logic — no JSX, no UI
 */
export function createPageHandlers({
  activeDoc,
  updateDocument,
  baseName,
  toast,
}: PageDeps) {
  // ----------------------------------------------------------------------
  // INSERT BLANK PAGE
  // ----------------------------------------------------------------------
  const handleInsertPage = async () => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(activeDoc.data);
      
      // Add blank page at end
      pdfDoc.addPage();
      
      const updatedBytes = await pdfDoc.save();

      updateDocument(activeDoc.id, {
        data: updatedBytes,
        numPages: pdfDoc.getPageCount(),
      });

      toast.success("Page inserted");
    } catch (err) {
      console.error("Insert page failed:", err);
      toast.error("Insert page failed");
    }
  };

  // ----------------------------------------------------------------------
  // DELETE CURRENT PAGE
  // ----------------------------------------------------------------------
  const handleDeletePage = async () => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(activeDoc.data);

      if (pdfDoc.getPageCount() <= 1) {
        toast.error("Cannot delete the only page");
        return;
      }

      const currentPage = activeDoc.currentPage ?? 1;

      pdfDoc.removePage(currentPage - 1);

      const updatedBytes = await pdfDoc.save();

      updateDocument(activeDoc.id, {
        data: updatedBytes,
        numPages: pdfDoc.getPageCount(),
        currentPage: Math.max(1, currentPage - 1),
      });

      toast.success(`Page ${currentPage} deleted`);
    } catch (err) {
      console.error("Delete page failed:", err);
      toast.error("Delete page failed");
    }
  };

  return {
    handleInsertPage,
    handleDeletePage,
  };
}
