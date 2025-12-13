import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import { useDocumentsStore } from "@/stores/useDocumentsStore";

export const pdfActions = {
  // --- FILE ACTIONS ---
  async openFile(file: File) {
    console.log("[pdfActions] openFile triggered", file);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const id = crypto.randomUUID();

      useDocumentsStore.getState().addDocument({
        id,
        name: file.name,
        pdfDoc,
        arrayBuffer,
        pageCount: pdfDoc.getPageCount(),
        currentPage: 1,
      });

      useDocumentsStore.getState().setActiveDoc(id);
      toast.success(`Opened: ${file.name}`);
    } catch (err) {
      console.error("Error opening PDF:", err);
      toast.error("Failed to open PDF");
    }
  },

  async saveFile() {
    console.log("[pdfActions] saveFile triggered");
    const { activeDoc, documents } = useDocumentsStore.getState();
    const doc = documents.find((d) => d.id === activeDoc);
    if (!doc) return toast.error("No active document");

    try {
      const pdfBytes = await doc.pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = doc.name || "document.pdf";
      a.click();
      toast.success("PDF saved");
    } catch (err) {
      console.error("Error saving PDF:", err);
      toast.error("Failed to save PDF");
    }
  },

  // --- PAGE ACTIONS ---
  async addPage() {
    console.log("[pdfActions] addPage triggered");
    const { activeDoc, documents, updateDocument, triggerRefresh } = useDocumentsStore.getState();
    const doc = documents.find((d) => d.id === activeDoc);
    if (!doc) return toast.error("No active document");

    try {
      const pdfDoc = doc.pdfDoc;
      pdfDoc.addPage();
      updateDocument(doc.id, { pdfDoc, pageCount: pdfDoc.getPageCount() });
      triggerRefresh();
      toast.success("Page added");
    } catch (err) {
      console.error("Add page failed:", err);
      toast.error("Failed to add page");
    }
  },

  async deletePage(pageIndex: number) {
    console.log("[pdfActions] deletePage triggered", pageIndex);
    const { activeDoc, documents, updateDocument, triggerRefresh } = useDocumentsStore.getState();
    const doc = documents.find((d) => d.id === activeDoc);
    if (!doc) return toast.error("No active document");

    try {
      const pdfDoc = doc.pdfDoc;
      pdfDoc.removePage(pageIndex);
      updateDocument(doc.id, { pdfDoc, pageCount: pdfDoc.getPageCount() });
      triggerRefresh();
      toast.success("Page deleted");
    } catch (err) {
      console.error("Delete page failed:", err);
      toast.error("Failed to delete page");
    }
  },

  async duplicatePage(pageIndex: number) {
    console.log("[pdfActions] duplicatePage triggered", pageIndex);
    const { activeDoc, documents, updateDocument, triggerRefresh } = useDocumentsStore.getState();
    const doc = documents.find((d) => d.id === activeDoc);
    if (!doc) return toast.error("No active document");

    try {
      const [page] = await doc.pdfDoc.copyPages(doc.pdfDoc, [pageIndex]);
      doc.pdfDoc.addPage(page);
      updateDocument(doc.id, { pdfDoc: doc.pdfDoc, pageCount: doc.pdfDoc.getPageCount() });
      triggerRefresh();
      toast.success("Page duplicated");
    } catch (err) {
      console.error("Duplicate page failed:", err);
      toast.error("Failed to duplicate page");
    }
  },

  async rotatePage(pageIndex: number) {
    console.log("[pdfActions] rotatePage triggered", pageIndex);
    const { activeDoc, documents, updateDocument, triggerRefresh } = useDocumentsStore.getState();
    const doc = documents.find((d) => d.id === activeDoc);
    if (!doc) return toast.error("No active document");

    try {
      const page = doc.pdfDoc.getPage(pageIndex);
      const rotation = page.getRotation().angle + 90;
      page.setRotation(rotation % 360);
      updateDocument(doc.id, { pdfDoc: doc.pdfDoc });
      triggerRefresh();
      toast.success("Page rotated");
    } catch (err) {
      console.error("Rotate failed:", err);
      toast.error("Failed to rotate page");
    }
  },

  async mergePDF(file: File) {
    console.log("[pdfActions] mergePDF triggered", file);
    const { activeDoc, documents, updateDocument, triggerRefresh } = useDocumentsStore.getState();
    const doc = documents.find((d) => d.id === activeDoc);
    if (!doc) return toast.error("No active document");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const newPDF = await PDFDocument.load(arrayBuffer);
      const copiedPages = await doc.pdfDoc.copyPages(newPDF, newPDF.getPageIndices());
      copiedPages.forEach((p) => doc.pdfDoc.addPage(p));
      updateDocument(doc.id, { pdfDoc: doc.pdfDoc, pageCount: doc.pdfDoc.getPageCount() });
      triggerRefresh();
      toast.success("PDF merged successfully");
    } catch (err) {
      console.error("Merge failed:", err);
      toast.error("Failed to merge PDFs");
    }
  },

  // --- PLACEHOLDERS ---
  async exportToText() {
    console.log("[pdfActions] exportToText triggered");
    toast.info("Export to Text placeholder");
  },
  async exportToImage() {
    console.log("[pdfActions] exportToImage triggered");
    toast.info("Export to Image placeholder");
  },
  async exportToHTML() {
    console.log("[pdfActions] exportToHTML triggered");
    toast.info("Export to HTML placeholder");
  },
  async encryptPDF() {
    console.log("[pdfActions] encryptPDF triggered");
    toast.info("Encrypt PDF placeholder");
  },
  async unlockPDF() {
    console.log("[pdfActions] unlockPDF triggered");
    toast.info("Unlock PDF placeholder");
  },
  async splitPDF() {
    console.log("[pdfActions] splitPDF triggered");
    toast.info("Split PDF placeholder");
  },
  async compressPDF() {
    console.log("[pdfActions] compressPDF triggered");
    toast.info("Compress PDF placeholder");
  },
  async flattenPDF() {
    console.log("[pdfActions] flattenPDF triggered");
    toast.info("Flatten PDF placeholder");
  },
  async extractText() {
    console.log("[pdfActions] extractText triggered");
    toast.info("Extract Text placeholder");
  },
};
