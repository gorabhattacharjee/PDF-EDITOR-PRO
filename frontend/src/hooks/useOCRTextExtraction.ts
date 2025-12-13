"use client";

import { useEffect, useState } from "react";

export const useOCRTextExtraction = (pdf: any, pageNum: number, zoom: number) => {
  const [textItems, setTextItems] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    const extractText = async () => {
      if (!pdf || pageNum < 1) {
        console.log("[TextExtract] No PDF or invalid page");
        return;
      }

      setIsExtracting(true);
      try {
        console.log("[TextExtract] Starting text extraction for page:", pageNum);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });

        // Use PDF.js native text extraction (fast and accurate for digital PDFs)
        const textContent = await page.getTextContent();
        
        console.log("[TextExtract] Got text content, items:", textContent.items.length);

        if (textContent.items && textContent.items.length > 0) {
          const items = textContent.items.map((item: any) => {
            // Transform coordinates from PDF space to canvas space
            const tx = item.transform;
            const x = tx[4] * zoom;
            const y = viewport.height - (tx[5] * zoom);
            const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
            const width = item.width ? item.width * zoom : (item.str.length * fontSize * 0.6 * zoom);
            const height = fontSize * zoom;

            return {
              str: item.str,
              x: x,
              y: y - height,
              width: width,
              height: height,
              transform: tx,
            };
          }).filter((item: any) => item.str.trim().length > 0);

          setTextItems(items);
          console.log("[TextExtract] Text items created:", items.length);
          
          if (items.length > 0) {
            console.log("[TextExtract] Sample items:", items.slice(0, 3).map((i: any) => i.str));
          }
        } else {
          console.log("[TextExtract] No text found in PDF, this might be a scanned document");
          setTextItems([]);
        }
      } catch (err) {
        console.error("[TextExtract] Error during text extraction:", err);
        setTextItems([]);
      } finally {
        setIsExtracting(false);
      }
    };

    extractText();
  }, [pdf, pageNum, zoom]);

  return { textItems, isExtracting };
};
