import Tesseract from "tesseract.js";
import toast from "react-hot-toast";
import { downloadBlob } from "@/utils/exporters";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { useUIStore } from "@/stores/useUIStore";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const useOcr = () => {
  const { activeDocument } = useDocumentsStore();

  const runOCR = async () => {
    if (!activeDocument) {
      toast.error("No active document to OCR.");
      return;
    }

    if (!activeDocument.file) {
      toast.error("No PDF file loaded.");
      return;
    }

    if (typeof window === 'undefined' || !window.pdfjsLib) {
      toast.error("PDF library not loaded. Please refresh the page.");
      return;
    }

    const activePage = useUIStore.getState().activePage;
    toast.loading("Performing OCR on current page...", { id: "ocr-toast" });

    try {
      const arrayBuffer = await activeDocument.file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageNum = (activePage ?? 0) + 1;
      const page = await pdf.getPage(pageNum);
      
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        
        console.log('[OCR] Starting Tesseract recognition...');
        const {
          data: { text },
        } = await Tesseract.recognize(canvas, "eng+hin", {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              toast.loading(`OCR Progress: ${progress}%`, { id: "ocr-toast" });
            }
            console.log('[OCR]', m.status, m.progress ? `${Math.round(m.progress * 100)}%` : '');
          },
        });

        if (text.trim()) {
          const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
          downloadBlob(blob, `${activeDocument.name}_page${pageNum}_ocr.txt`);
          toast.success(`OCR complete! Extracted ${text.length} characters.`, { id: "ocr-toast" });
        } else {
          toast.error("No text found on this page.", { id: "ocr-toast" });
        }
      }
    } catch (error) {
      console.error("Error during OCR:", error);
      toast.error("Failed to perform OCR. Please try again.", { id: "ocr-toast" });
    }
  };

  return { runOCR };
};
