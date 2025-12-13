"use client";

/* ============================================================
   UNIVERSAL PDF LOADER → Loads PDF + Generates Thumbnails
============================================================ */

export async function openPDFandGenerate(docFile: File) {
  try {
    const arrayBuffer = await docFile.arrayBuffer();

    // Generate thumbnails by loading PDF.js from CDN
    let thumbnails: string[] = [];
    let pageCount = 1;

    try {
      // Wait for PDF.js to be available globally
      let pdfjs = (window as any).pdfjs || (window as any).pdfjsLib;
      
      // If not available, we'll wait a bit and try again
      let attempts = 0;
      while (!pdfjs && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        pdfjs = (window as any).pdfjs || (window as any).pdfjsLib;
        attempts++;
      }

      if (pdfjs && pdfjs.getDocument) {
        // Convert to Uint8Array for PDF.js (creates a view, doesn't transfer)
        let dataToUse: Uint8Array | ArrayBuffer;
        try {
          dataToUse = new Uint8Array(arrayBuffer);
        } catch (e) {
          console.warn("Failed to create Uint8Array, using raw buffer");
          dataToUse = arrayBuffer;
        }
        
        // Load the PDF document
        const loadingTask = pdfjs.getDocument({ data: dataToUse });
        const pdf = await loadingTask.promise;
        pageCount = pdf.numPages;

        // Generate thumbnails for first 10 pages
        for (let i = 1; i <= Math.min(pageCount, 10); i++) {
          try {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport }).promise;
              thumbnails.push(canvas.toDataURL("image/png"));
            }
          } catch (e) {
            console.warn("Thumbnail generation skipped for page", i);
          }
        }
      }
    } catch (err) {
      console.warn("Thumbnail generation failed:", err);
    }

    return {
      id: crypto.randomUUID(),
      name: docFile.name,
      file: docFile,
      pdf: null,
      thumbnails,
      pageCount,
      pdfBytes: arrayBuffer,
    };
  } catch (error) {
    console.error("Error loading PDF:", error);
    throw new Error(`Failed to load PDF: ${error}`);
  }
}
