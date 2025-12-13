"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    pdfjsLib: any;
    pdfjs: any;
  }
}

export const usePDFRenderer = (arrayBuffer: ArrayBuffer | null) => {
  const [pdf, setPdf] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[PDFRenderer] useEffect triggered with arrayBuffer size:", arrayBuffer?.byteLength);
    if (!arrayBuffer) {
      console.log("[PDFRenderer] No arrayBuffer provided");
      setPdf(null);
      setPageCount(0);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadPDF = async () => {
      try {
        console.log("[PDFRenderer] Starting PDF loading process");
        // Convert ArrayBuffer to Uint8Array for safe usage
        let dataToUse: Uint8Array;
        try {
          dataToUse = new Uint8Array(arrayBuffer);
        } catch (e) {
          console.warn("Cannot create Uint8Array from ArrayBuffer", e);
          if (isMounted) {
            setError("Failed to read PDF file");
            setPdf(null);
          }
          return;
        }

        // Load PDF.js from CDN if not already loaded
        if (!window.pdfjsLib && !window.pdfjs) {
          console.log("[PDFRenderer] Loading PDF.js from CDN");
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.async = true;
            script.onload = () => {
              console.log("[PDFRenderer] PDF.js loaded from CDN");
              // Set worker URL
              if (window.pdfjs) {
                window.pdfjs.GlobalWorkerOptions.workerSrc = 
                  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                console.log("[PDFRenderer] Worker URL set");
              }
              resolve(true);
            };
            script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
            document.head.appendChild(script);
          });
        }

        const pdfjs = window.pdfjs || window.pdfjsLib;
        if (!pdfjs || !pdfjs.getDocument) {
          throw new Error("PDF.js library not loaded");
        }

        console.log("[PDFRenderer] Calling getDocument with data size:", dataToUse.byteLength);
        const loadingTask = pdfjs.getDocument({ data: dataToUse });
        const pdfDoc = await loadingTask.promise;
        
        console.log("[PDFRenderer] PDF loaded successfully, pages:", pdfDoc.numPages);
        if (isMounted) {
          setPdf(pdfDoc);
          setPageCount(pdfDoc.numPages);
          setError(null);
          console.log("[PDFRenderer] State updated successfully");
        }
      } catch (err) {
        console.error("[PDFRenderer] Failed to load PDF:", err);
        if (isMounted) {
          setError(String(err));
          setPdf(null);
          setPageCount(0);
        }
      }
    };

    loadPDF();
    
    return () => {
      isMounted = false;
    };
  }, [arrayBuffer]);

  return { pdf, pageCount, error };
};
