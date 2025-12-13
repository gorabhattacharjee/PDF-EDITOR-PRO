"use client";
import React, { useEffect } from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import useUIStore from "@/stores/useUIStore";
import { usePDFRenderer } from "@/hooks/usePDFRenderer";

export default function PageThumbnailPanel() {
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const activeDocId = useDocumentsStore((s) => s.activeDocId);
  const activePage = useUIStore((s) => s.activePage);

  // Load PDF for rendering thumbnails
  const anyDoc: any = activeDocument;
  
  // Store the PDF bytes
  const [pdfBytes, setPdfBytes] = React.useState<ArrayBuffer | null>(null);
  
  React.useEffect(() => {
    console.log("[Thumbnail] useEffect triggered - doc id:", anyDoc?.id);
    
    // Always read from file directly to ensure we have valid data
    if (anyDoc?.file) {
      console.log("[Thumbnail] Reading pdfBytes from file:", anyDoc.file.name);
      anyDoc.file.arrayBuffer().then((buffer: ArrayBuffer) => {
        console.log("[Thumbnail] Successfully read pdfBytes from file, size:", buffer.byteLength);
        setPdfBytes(buffer);
      }).catch((err: Error) => {
        console.error("[Thumbnail] Failed to read PDF file:", err);
      });
    } else {
      console.log("[Thumbnail] No file available");
    }
  }, [anyDoc?.id, anyDoc?.file]);
  
  const { pdf, pageCount } = usePDFRenderer(pdfBytes);

  const [thumbnails, setThumbnails] = React.useState<string[]>([]);

  // Generate thumbnails when PDF loads
  useEffect(() => {
    console.log("[Thumbnail] PDF loaded, pageCount:", pageCount, "pdf:", !!pdf, "pdfBytes:", !!pdfBytes);
    if (!pdf || pageCount === 0) return;

    const generateThumbnails = async () => {
      try {
        console.log("[Thumbnail] Generating thumbnails...");
        const thumbs: string[] = [];
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
              thumbs.push(canvas.toDataURL("image/png"));
              console.log("[Thumbnail] Generated page", i);
            }
          } catch (e) {
            console.warn("Thumbnail generation skipped for page", i, e);
          }
        }
        console.log("[Thumbnail] Total thumbnails generated:", thumbs.length);
        setThumbnails(thumbs);
      } catch (err) {
        console.error("Failed to generate thumbnails:", err);
      }
    };

    generateThumbnails();
  }, [pdf, pageCount]);

  // When a thumbnail is clicked, update active page in both stores
  const handlePageClick = (pageIndex: number) => {
    // Update UI store (for Canvas rendering)
    useUIStore.setState({ activePage: pageIndex });
    // Update document store (for document state)
    useDocumentsStore.setState({
      activeDocument: { ...activeDocument, currentPage: pageIndex } as any,
    });
  };

  if (!activeDocument) return null;

  return (
    <div className="thumbnail-panel p-3">
      {!pdf ? (
        <p className="text-gray-500 text-sm p-4">Loading PDF...</p>
      ) : thumbnails.length === 0 ? (
        <p className="text-gray-500 text-sm p-4">Generating thumbnails...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {thumbnails.map((thumb, i) => (
          <div
            key={i}
            className={`thumbnail-item p-2 border cursor-pointer rounded transition-all ${
              i === activePage
                ? 'bg-blue-100 border-blue-500 shadow-md'
                : 'bg-white hover:bg-gray-200 border-gray-300'
            }`}
            onClick={() => handlePageClick(i)}
            style={{ minHeight: '150px' }}
          >
            <img src={thumb} alt={`Page ${i + 1}`} className="w-full rounded" />
            <p className="text-xs text-center mt-1 font-medium">Page {i + 1}</p>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
