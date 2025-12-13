// /src/utils/pdf/open/openFunctions.ts

import { PDFDocument } from "pdf-lib";

export interface OpenDeps {
  addDocument: (doc: any) => void;
  setActiveId: (id: string) => void;
  copyBuffer: (buf: ArrayBuffer) => ArrayBuffer;
  baseName: (name: string | undefined, fallback: string) => string;
  toast: any; // react-hot-toast
}

/**
 * Creates all OPEN-related handlers for RibbonBar.
 * No React or JSX — pure logic.
 */
export function createOpenHandlers({
  addDocument,
  setActiveId,
  copyBuffer,
  baseName,
  toast,
}: OpenDeps) {
  /**
   * Trigger hidden <input type="file"> from UI
   */
  const handleOpenClick = (fileInputRef: HTMLInputElement | null) => {
    fileInputRef?.click();
  };

  /**
   * Load PDFs from file input and add to document store
   */
  const handleOpenChange = async (
    files: FileList | null,
  ): Promise<void> => {
    try {
      if (!files) return;

      for (const file of Array.from(files)) {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const id = crypto.randomUUID();

        addDocument({
          id,
          name: file.name,
          data: copyBuffer(buffer),
          numPages: pdfDoc.getPageCount(),
          currentPage: 1,
          zoom: 100,
          metadata: {
            title: pdfDoc.getTitle() || undefined,
            author: pdfDoc.getAuthor() || undefined,
            subject: pdfDoc.getSubject() || undefined,
            keywords: pdfDoc.getKeywords()
              ? (pdfDoc.getKeywords() as string)
              : undefined,
          },
        });

        setActiveId(id);
      }

      toast.success("PDF(s) opened");
    } catch (err) {
      console.error(err);
      toast.error("Failed to open PDF");
    }
  };

  return {
    handleOpenClick,
    handleOpenChange,
  };
}
