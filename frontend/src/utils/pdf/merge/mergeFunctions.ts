// /src/utils/pdf/merge/mergeFunctions.ts

import { PDFDocument } from "pdf-lib";

export interface MergeDeps {
  activeDoc: any;
  addDocument: (doc: any) => void;
  setActiveId: (id: string) => void;
  copyBuffer: (buf: ArrayBuffer) => ArrayBuffer;
  baseName: (name: string | undefined, fallback: string) => string;
  toast: any; // react-hot-toast
}

/**
 * Creates all MERGE-related handlers for RibbonBar.
 * 100% pure logic — no React, no UI.
 */
export function createMergeHandlers({
  activeDoc,
  addDocument,
  setActiveId,
  copyBuffer,
  baseName,
  toast,
}: MergeDeps) {
  // ----------------------------------------------------------------------
  // OPEN MERGE DIALOG
  // ----------------------------------------------------------------------
  const handleMergeClick = (
    setMergeDialogOpen: (v: boolean) => void
  ) => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }
    setMergeDialogOpen(true);
  };

  // ----------------------------------------------------------------------
  // FILE SELECTION — MERGE PDF LIST
  // ----------------------------------------------------------------------
  const handleMergeChange = (
    files: FileList | null,
    setMergeFiles: (files: File[]) => void
  ) => {
    if (!files) return;
    setMergeFiles(Array.from(files));
  };

  // ----------------------------------------------------------------------
  // CONFIRM MERGE PDFs
  // ----------------------------------------------------------------------
  const handleMergeConfirm = async (
    mergeFiles: File[],
    setMergeDialogOpen: (v: boolean) => void,
    setMergeFiles: (v: File[]) => void
  ) => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    if (mergeFiles.length === 0) {
      toast.error("No files selected");
      return;
    }

    try {
      const basePdf = await PDFDocument.load(activeDoc.data);

      for (const file of mergeFiles) {
        const buffer = await file.arrayBuffer();
        const otherPdf = await PDFDocument.load(buffer);

        const copiedPages = await basePdf.copyPages(
          otherPdf,
          otherPdf.getPageIndices()
        );

        for (const page of copiedPages) {
          basePdf.addPage(page);
        }
      }

      const mergedBytes = await basePdf.save();
      const newId = crypto.randomUUID();

      addDocument({
        id: newId,
        name: `${baseName(activeDoc.name, "document")}-merged.pdf`,
        data: mergedBytes,
        numPages: basePdf.getPageCount(),
        currentPage: 1,
        zoom: activeDoc.zoom ?? 100,
        metadata: activeDoc.metadata,
      });

      setActiveId(newId);
      setMergeDialogOpen(false);
      setMergeFiles([]);

      toast.success("PDFs merged successfully");
    } catch (err) {
      console.error("Merge failed:", err);
      toast.error("Failed to merge PDFs");
    }
  };

  return {
    handleMergeClick,
    handleMergeChange,
    handleMergeConfirm,
  };
}
