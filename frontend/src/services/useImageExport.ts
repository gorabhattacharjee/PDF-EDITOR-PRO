import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { getDocument } from "pdfjs-dist";
import { exportToImage } from "@/services/imageExport";
import toast from "react-hot-toast";

export const useImageExport = () => {
  const { activeDocument } = useDocumentsStore();

  const exportPageAsImage = async () => {
    if (!activeDocument) {
      toast.error("No active document to export.");
      return;
    }

    toast.loading("Exporting page as image...", {
      id: "export-image-toast",
    });

    try {
      const pdf = await getDocument(activeDocument.pdfBytes).promise;
      await exportToImage(
        pdf,
        activeDocument.currentPage,
        activeDocument.name
      );
      toast.success("Page exported as PNG.", { id: "export-image-toast" });
    } catch (error) {
      console.error("Error exporting page as image:", error);
      toast.error("Failed to export page as image.", {
        id: "export-image-toast",
      });
    }
  };

  return { exportPageAsImage };
};