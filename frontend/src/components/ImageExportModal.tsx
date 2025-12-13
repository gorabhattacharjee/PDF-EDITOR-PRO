"use client";

import React, { useState } from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import useUIStore from "@/stores/useUIStore";
import logger from "@/utils/logger";

const IMAGE_FORMATS = [
  { value: "jpeg", label: "JPEG (.jpg)" },
  { value: "png", label: "PNG (.png)" },
  { value: "gif", label: "GIF (.gif)" },
  { value: "webp", label: "WebP (.webp)" },
  { value: "avif", label: "AVIF (.avif)" },
  { value: "tiff", label: "TIFF (.tiff)" },
  { value: "bmp", label: "BMP (.bmp)" },
  { value: "heif", label: "HEIF (.heif)" },
  { value: "heic", label: "HEIC (.heic)" },
];

interface ImageExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageExportModal({ isOpen, onClose }: ImageExportModalProps) {
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const activePage = useUIStore((s) => s.activePage);
  const numPages = useDocumentsStore((s) => s.activeDocument?.numPages) || 1;

  const [format, setFormat] = useState("png");
  const [pageMode, setPageMode] = useState<"current" | "range" | "all">("current");
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(numPages);
  const [isExporting, setIsExporting] = useState(false);

  // Update endPage when numPages changes
  React.useEffect(() => {
    setEndPage(numPages);
  }, [numPages]);

  if (!isOpen || !activeDocument) return null;

  const handleExport = async () => {
    if (!activeDocument?.file) {
      alert("No document loaded");
      return;
    }

    try {
      setIsExporting(true);
      console.log("[ImageExport] Starting export with format:", format, "mode:", pageMode);

      // Determine pages to export
      let pagesToExport: number[] = [];
      if (pageMode === "current") {
        pagesToExport = [(activePage ?? 0) + 1];
      } else if (pageMode === "range") {
        const start = Math.max(1, parseInt(String(startPage)) || 1);
        const end = Math.min(numPages, parseInt(String(endPage)) || numPages);
        for (let i = start; i <= end; i++) {
          pagesToExport.push(i);
        }
      } else if (pageMode === "all") {
        for (let i = 1; i <= numPages; i++) {
          pagesToExport.push(i);
        }
      }

      console.log("[ImageExport] Pages to export:", pagesToExport);
      console.log("[ImageExport] Format:", format);

      const baseName = activeDocument.name.replace(".pdf", "");
      const extensionMap: { [key: string]: string } = {
        jpeg: "jpg",
        heif: "heif",
        heic: "heic",
      };
      const fileExtension = extensionMap[format] || format;
      
      // Load pdfjs-dist - using dynamic import with proper setup
      let pdf: any;
      try {
        pdf = await import("pdfjs-dist");
      } catch (err) {
        console.error('[ImageExport] Failed to import pdfjs-dist:', err);
        throw new Error('PDF.js library failed to load');
      }
      
      const getDocument = pdf.getDocument || (pdf as any).default?.getDocument;
      
      if (!getDocument || typeof getDocument !== 'function') {
        throw new Error('PDF.getDocument is not available');
      }
      
      // Load the PDF document
      const fileData = await activeDocument.file.arrayBuffer();
      const pdfdoc = await getDocument({ data: new Uint8Array(fileData) }).promise;
      
      console.log(`[ImageExport] PDF loaded with ${pdfdoc.numPages} pages`);
      
      // Export each page
      for (let pageIdx = 0; pageIdx < pagesToExport.length; pageIdx++) {
        const pageNum = pagesToExport[pageIdx];
        console.log(`[ImageExport] Rendering page ${pageNum}`);
        
        const page = await pdfdoc.getPage(pageNum);
        const scale = 2;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        
        const blob = await canvasToBlob(canvas, format);
        const filename = pagesToExport.length === 1 
          ? `${baseName}.${fileExtension}`
          : `${baseName}_page${pageNum}.${fileExtension}`;
        downloadFile(blob, filename);
        
        console.log(`[ImageExport] Page ${pageNum} exported as ${filename}`);
      }

      logger.success(`Exported ${pagesToExport.length} page(s) as ${format}`);
      onClose();
    } catch (error) {
      console.error("[ImageExport] Error:", error);
      logger.error(`Image export failed: ${error}`);
      alert(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          width: "400px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "18px" }}>
          Export Pages as Images
        </h2>

        {/* Format Selection */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Image Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            {IMAGE_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Page Selection */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Pages to Export
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="radio"
                name="pageMode"
                value="current"
                checked={pageMode === "current"}
                onChange={(e) => setPageMode(e.target.value as any)}
              />
              Current Page ({(activePage ?? 0) + 1})
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="radio"
                name="pageMode"
                value="range"
                checked={pageMode === "range"}
                onChange={(e) => setPageMode(e.target.value as any)}
              />
              Range:
              <input
                key="start-page"
                type="text"
                inputMode="numeric"
                value={String(startPage)}
                onChange={(e) => {
                  const newVal = e.target.value.trim();
                  console.log('[ImageExport] startPage onChange:', newVal);
                  if (newVal === '') {
                    // Allow empty input while typing
                    return;
                  }
                  const num = parseInt(newVal);
                  if (!isNaN(num)) {
                    console.log('[ImageExport] Setting startPage to:', num);
                    setStartPage(num);
                  }
                }}
                onBlur={(e) => {
                  const newVal = e.target.value.trim();
                  if (newVal === '') {
                    setStartPage(1);
                  } else {
                    const num = parseInt(newVal);
                    if (isNaN(num)) setStartPage(1);
                    else setStartPage(Math.max(1, Math.min(num, numPages)));
                  }
                }}
                style={{
                  width: "50px",
                  padding: "8px",
                  border: "2px solid #3b82f6",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              />
              to
              <input
                key="end-page"
                type="text"
                inputMode="numeric"
                value={String(endPage)}
                onChange={(e) => {
                  const newVal = e.target.value.trim();
                  console.log('[ImageExport] endPage onChange:', newVal);
                  if (newVal === '') {
                    // Allow empty input while typing
                    return;
                  }
                  const num = parseInt(newVal);
                  if (!isNaN(num)) {
                    console.log('[ImageExport] Setting endPage to:', num);
                    setEndPage(num);
                  }
                }}
                onBlur={(e) => {
                  const newVal = e.target.value.trim();
                  if (newVal === '') {
                    setEndPage(numPages);
                  } else {
                    const num = parseInt(newVal);
                    if (isNaN(num)) setEndPage(numPages);
                    else setEndPage(Math.max(1, Math.min(num, numPages)));
                  }
                }}
                style={{
                  width: "50px",
                  padding: "8px",
                  border: "2px solid #3b82f6",
                  borderRadius: "4px",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="radio"
                name="pageMode"
                value="all"
                checked={pageMode === "all"}
                onChange={(e) => setPageMode(e.target.value as any)}
              />
              All Pages ({numPages})
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: isExporting ? "not-allowed" : "pointer",
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#3b82f6",
              color: "white",
              cursor: isExporting ? "not-allowed" : "pointer",
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType =
      format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
        ? "image/webp"
        : format === "gif"
        ? "image/gif"
        : format === "tiff"
        ? "image/tiff"
        : format === "bmp"
        ? "image/bmp"
        : format === "avif"
        ? "image/avif"
        : format === "heif"
        ? "image/heif"
        : format === "heic"
        ? "image/heic"
        : "image/png";

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      mimeType,
      format === "jpeg" ? 0.9 : undefined
    );
  });
}

function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
