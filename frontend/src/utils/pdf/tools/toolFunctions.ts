// /src/utils/pdf/tools/toolFunctions.ts

import { PDFDocument } from "pdf-lib";

export interface ToolsDeps {
  activeDoc: any;
  updateDocument: (id: string, changes: any) => void;
  downloadBlob: (blob: Blob, filename: string) => void;
  baseName: (name: string | undefined, fallback: string) => string;
  toast: any; // react-hot-toast
}

/**
 * Tools Group:
 * - Document Properties
 * - Save Properties
 * - Extract Pages
 *
 * 100% pure logic — NO JSX, NO React.
 */
export function createToolsHandlers({
  activeDoc,
  updateDocument,
  downloadBlob,
  baseName,
  toast,
}: ToolsDeps) {
  // ----------------------------------------------------------------------
  // DOCUMENT PROPERTIES — PREPARE FOR UI
  // ----------------------------------------------------------------------
  const handleDocumentProperties = (
    setDocTitle: (v: string) => void,
    setDocAuthor: (v: string) => void,
    setDocSubject: (v: string) => void,
    setDocKeywords: (v: string) => void,
    setIsOpen: (v: boolean) => void
  ) => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    setDocTitle(activeDoc.metadata?.title ?? "");
    setDocAuthor(activeDoc.metadata?.author ?? "");
    setDocSubject(activeDoc.metadata?.subject ?? "");
    setDocKeywords(activeDoc.metadata?.keywords ?? "");
    setIsOpen(true);
  };

  // ----------------------------------------------------------------------
  // SAVE DOCUMENT PROPERTIES
  // ----------------------------------------------------------------------
  const handlePropertiesSave = (
    docTitle: string,
    docAuthor: string,
    docSubject: string,
    docKeywords: string,
    setIsOpen: (v: boolean) => void
  ) => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    updateDocument(activeDoc.id, {
      metadata: {
        ...activeDoc.metadata,
        title: docTitle,
        author: docAuthor,
        subject: docSubject,
        keywords: docKeywords,
      },
    });

    toast.success("Document properties updated");
    setIsOpen(false);
  };

  // ----------------------------------------------------------------------
  // EXTRACT PAGES: MAIN ROUTINE
  // ----------------------------------------------------------------------
  const doExtract = async (
    pagesInput: string,
    outputNameInput: string,
    setShowExtractDialog: (v: boolean) => void
  ) => {
    if (!activeDoc) {
      toast.error("No active document.");
      return;
    }

    const raw = pagesInput.trim();
    if (!raw) {
      toast.error("Specify pages like 1,3-5");
      return;
    }

    // parse page ranges
    const ranges = raw.split(",").map((r) => r.trim());
    const pagesToExtract: number[] = [];

    for (const r of ranges) {
      if (r.includes("-")) {
        const [start, end] = r.split("-").map((x) => parseInt(x, 10));
        for (let p = start; p <= end; p++) {
          pagesToExtract.push(p);
        }
      } else {
        pagesToExtract.push(parseInt(r, 10));
      }
    }

    try {
      const srcPdf = await PDFDocument.load(activeDoc.data);
      const outPdf = await PDFDocument.create();

      const copiedPages = await outPdf.copyPages(
        srcPdf,
        pagesToExtract.map((p) => p - 1)
      );

      copiedPages.forEach((p) => outPdf.addPage(p));

      // filename normalization
      let finalName = outputNameInput.trim();
      if (!finalName) {
        finalName = `${baseName(activeDoc.name, "document")}-extracted.pdf`;
      }
      if (!finalName.toLowerCase().endsWith(".pdf")) {
        finalName += ".pdf";
      }

      const bytes = await outPdf.save();
      downloadBlob(new Blob([bytes as BlobPart]), finalName);

      toast.success("Pages extracted");
      setShowExtractDialog(false);
    } catch (err) {
      console.error("Extract pages failed:", err);
      toast.error("Extract pages failed");
    }
  };

  return {
    handleDocumentProperties,
    handlePropertiesSave,
    doExtract,
  };
}
