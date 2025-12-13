import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { PDFDocument } from "pdf-lib";
import toast from "react-hot-toast";

export const usePdfCompression = () => {
  const { activeDocument, openDocument } = useDocumentsStore();

  const compressActivePdf = async () => {
    if (!activeDocument) {
      toast.error("No active document to compress.");
      return;
    }

    toast.loading("Compressing PDF...", { id: "compress-toast" });

    try {
      const pdfDoc = await PDFDocument.load(activeDocument.pdfBytes);
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

      const compressedFile = new File(
        [new Uint8Array(compressedBytes)],
        `${activeDocument.name}_compressed.pdf`,
        { type: "application/pdf" }
      );

      const newDoc = await PDFDocument.load(activeDocument.pdfBytes);
      await openDocument(compressedFile);

      toast.success("PDF compressed and opened in a new tab.", {
        id: "compress-toast",
      });
    } catch (error) {
      console.error("Error compressing PDF:", error);
      toast.error("Failed to compress PDF.", { id: "compress-toast" });
    }
  };

  return { compressActivePdf };
};