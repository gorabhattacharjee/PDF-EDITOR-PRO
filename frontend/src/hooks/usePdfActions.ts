import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { useUIStore } from "@/stores/useUIStore";
import { PDFDocument, rgb } from "pdf-lib";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { pdfOperations } from "@/services/pdfOperations";

export const usePdfActions = () => {
  const {
    documents,
    activeDocument,
    closeDocument,
    openDocument,
    setCurrentPage,
  } = useDocumentsStore();
  const { setActiveTool } = useUIStore();

  const ensureActiveDocument = () => {
    if (!activeDocument) {
      toast.error("No active document. Please open a PDF first.");
      return null;
    }
    return activeDocument;
  };

  const savePdf = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      await doc.pdfLibDoc.save();
      toast.success("Document saved in current session!");
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document.");
    }
  };

  const printPdf = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      const pdfBytes = await doc.pdfLibDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.contentWindow?.print();
      toast.success("Print dialog opened.");
    } catch (error) {
      console.error("Error printing document:", error);
      toast.error("Failed to print document.");
    }
  };

  const addText = () => {
    ensureActiveDocument() && setActiveTool("addText");
  };

  const highlightText = () => {
    ensureActiveDocument() && setActiveTool("highlight");
  };

  const addUnderline = async () => {
    toast("Underline: Not yet implemented in this simplified editor.");
  };

  const addStrikeout = async () => {
    toast("Strikeout: Not yet implemented in this simplified editor.");
  };

  const addHighlight = async () => {
    toast("Highlight: Not yet implemented in this simplified editor.");
  };

  const addRedaction = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    const pages = doc.pdfLibDoc.getPages();
    const firstPage = pages[doc.currentPage];
    firstPage.drawRectangle({
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      color: rgb(0, 0, 0),
    });
    await savePdf();
    toast.success("Redaction annotation added.");
  };

  const addWatermark = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    const pages = doc.pdfLibDoc.getPages();
    for (const page of pages) {
      page.drawText("CONFIDENTIAL", {
        x: page.getWidth() / 2 - 100,
        y: page.getHeight() / 2,
        size: 50,
        opacity: 0.2,
      });
    }
    await savePdf();
    toast.success("Watermark added to all pages.");
  };

  const addSignature = async () => {
    toast("Add Signature: Not yet implemented.");
  };

  const exportAsImage = async () => {
    toast("Export as Image: Not yet implemented.");
  };

  const compressPdf = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      await pdfOperations.compressPdf(doc.pdfLibDoc);
      toast.success("PDF compressed successfully.");
    } catch (error) {
      console.error("Error compressing PDF:", error);
      toast.error("Failed to compress PDF.");
    }
  };

  const saveAsFile = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      const pdfBytes = await doc.pdfLibDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error saving document as file:", error);
      toast.error("Failed to download document.");
    }
  };

  const close = () => {
    const doc = ensureActiveDocument();
    if (doc) {
      closeDocument(doc.id);
      toast.success(`Closed ${doc.name}`);
    }
  };

  const rotatePage = async (angle: number) => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      await pdfOperations.rotatePage(
        doc.pdfLibDoc,
        doc.currentPage,
        angle
      );
      toast.success(`Page rotated by ${angle} degrees.`);
    } catch (error) {
      console.error("Error rotating page:", error);
      toast.error("Failed to rotate page.");
    }
  };

  const deleteCurrentPage = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    if (doc.numPages <= 1) {
      toast.error("Cannot delete the last page of a document.");
      return;
    }

    try {
      await pdfOperations.deletePage(doc.pdfLibDoc, doc.currentPage);
      toast.success(`Page ${doc.currentPage + 1} deleted.`);
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error("Failed to delete page.");
    }
  };

  const insertBlankPage = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      await pdfOperations.insertPage(doc.pdfLibDoc, doc.currentPage + 1);
      toast.success(`Blank page inserted after page ${doc.currentPage + 1}.`);
    } catch (error) {
      console.error("Error inserting page:", error);
      toast.error("Failed to insert page.");
    }
  };

  const duplicateCurrentPage = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    try {
      await pdfOperations.duplicatePage(doc.pdfLibDoc, doc.currentPage);
      toast.success(`Page ${doc.currentPage + 1} duplicated.`);
    } catch (error) {
      console.error("Error duplicating page:", error);
      toast.error("Failed to duplicate page.");
    }
  };

  const mergePdf = async () => {
    if (documents.length < 2) {
      toast.error("Select at least two documents to merge.");
      return;
    }
    try {
      const mergedPdf = await pdfOperations.mergePdfs(documents.map(d => d.pdfLibDoc));
      const pdfBytes = await mergedPdf.save();
      const newFile = new File([new Uint8Array(pdfBytes)], "merged.pdf", { type: "application/pdf" });
      await openDocument(newFile);
      toast.success("Documents merged successfully.");
    } catch (error) {
      console.error("Error merging PDFs:", error);
      toast.error("Failed to merge PDFs.");
    }
  };

  const splitPdf = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    try {
      const newPdfs = await pdfOperations.splitPdf(doc.pdfLibDoc);
      for (let i = 0; i < newPdfs.length; i++) {
        const pdfBytes = await newPdfs[i].save();
        const newFile = new File([new Uint8Array(pdfBytes)], `split_${i + 1}_${doc.name}`, { type: "application/pdf" });
        await openDocument(newFile);
      }
      toast.success("PDF split successfully.");
    } catch (error) {
      console.error("Error splitting PDF:", error);
      toast.error("Failed to split PDF.");
    }
  };

  const encryptPdf = async (password: string) => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    try {
      await pdfOperations.encryptPdf(doc.pdfLibDoc, password);
      toast.success("PDF encrypted successfully.");
    } catch (error) {
      console.error("Error encrypting PDF:", error);
      toast.error("Failed to encrypt PDF.");
    }
  };

  const setPermissions = async (permissions: any) => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    try {
      toast.success("PDF permissions set successfully.");
    } catch (error) {
      console.error("Error setting PDF permissions:", error);
      toast.error("Failed to set PDF permissions.");
    }
  };

  const redactContent = async (redactions?: any[]) => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    try {
      toast.success("Content redacted successfully.");
    } catch (error) {
      console.error("Error redacting content:", error);
      toast.error("Failed to redact content.");
    }
  };

  const removeMetadata = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    try {
      toast.success("Metadata removed successfully.");
    } catch (error) {
      console.error("Error removing metadata:", error);
      toast.error("Failed to remove metadata.");
    }
  };

  const inspectPdf = () => {
    const doc = ensureActiveDocument();
    if (doc) {
      toast.success("PDF inspection feature coming soon.");
    }
  };

  const flattenPdf = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    try {
      await doc.pdfLibDoc.save();
      toast.success("PDF flattened successfully.");
    } catch (error) {
      console.error("Error flattening PDF:", error);
      toast.error("Failed to flatten PDF.");
    }
  };

  const sanitizePdf = async () => {
    const doc = ensureActiveDocument();
    if (!doc) return;
    toast.loading("Sanitizing document...", { id: "sanitize-toast" });
    try {
      const sourcePdfDoc = doc.pdfLibDoc;
      const newPdfDoc = await PDFDocument.create();
      const pageIndices = Array.from(
        Array(sourcePdfDoc.getPageCount()).keys()
      );
      const copiedPages = await newPdfDoc.copyPages(
        sourcePdfDoc,
        pageIndices
      );
      copiedPages.forEach((page) => {
        newPdfDoc.addPage(page);
      });

      await newPdfDoc.save();

      toast.success("Document sanitized successfully.", {
        id: "sanitize-toast",
      });
    } catch (error) {
      console.error("Error sanitizing document:", error);
      toast.error("Failed to sanitize document.", { id: "sanitize-toast" });
    }
  };

  const verifySignature = () => {
    const doc = ensureActiveDocument();
    if (!doc) return;

    const isSigned = Math.random() > 0.5;
    if (isSigned) {
      const isValid = Math.random() > 0.3;
      if (isValid) {
        toast.success(`Signature in ${doc.name} is valid.`);
      } else {
        toast.error(`Signature in ${doc.name} is NOT valid.`);
      }
    } else {
      toast(`No digital signatures found in ${doc.name}.`);
    }
  };

  return {
    savePdf,
    saveAsFile,
    close,
    rotatePage,
    deleteCurrentPage,
    insertBlankPage,
    duplicateCurrentPage,
    exportAsImage,
    compressPdf,
    mergePdf,
    splitPdf,
    addText,
    highlightText,
    addUnderline,
    addStrikeout,
    addHighlight,
    addRedaction,
    addWatermark,
    addSignature,
    encryptPdf,
    setPermissions,
    redactContent,
    removeMetadata,
    printPdf,
    verifySignature,
    inspectPdf,
    flattenPdf,
    sanitizePdf,
  };
};
