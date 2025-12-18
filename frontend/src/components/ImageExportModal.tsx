"use client";

import React, { useState } from "react";
import { SUPPORTED_FORMATS, performImageExport, ImageFormat } from "@/utils/imageExport";
import toast from "react-hot-toast";

interface ImageExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  currentPage: number;
  totalPages: number;
}

// Browser-supported image formats only - remove unsupported formats
const ALL_FORMATS = [
  { id: 'png', name: 'PNG', extension: 'png', description: 'PNG - Lossless, best quality', supported: true },
  { id: 'jpg', name: 'JPG', extension: 'jpg', description: 'JPEG - Compressed, smaller size', supported: true },
  { id: 'gif', name: 'GIF', extension: 'gif', description: 'GIF - Animation support', supported: true },
  { id: 'webp', name: 'WebP', extension: 'webp', description: 'WebP - Modern, optimized', supported: true },
  { id: 'bmp', name: 'BMP', extension: 'bmp', description: 'BMP - Uncompressed bitmap', supported: true },
  { id: 'ico', name: 'ICO', extension: 'ico', description: 'ICO - Windows icon', supported: true },
  { id: 'tiff', name: 'TIFF', extension: 'tiff', description: 'TIFF - Print-ready format', supported: true },
  { id: 'svg', name: 'SVG', extension: 'svg', description: 'SVG - Scalable vector graphics', supported: true },
];

export default function ImageExportModal({
  isOpen,
  onClose,
  documentName,
  currentPage,
  totalPages,
}: ImageExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("png");
  const [quality, setQuality] = useState<number>(92);
  const [isExporting, setIsExporting] = useState(false);
  const [pageSelectionMode, setPageSelectionMode] = useState<'current' | 'all' | 'range'>('current');
  const [pageRange, setPageRange] = useState<string>("");

  if (!isOpen) return null;

  // Parse page range (e.g., "1,3,5-7" or "1-5")
  const parsePageRange = (rangeStr: string): number[] => {
    if (!rangeStr || rangeStr.trim().length === 0) return [];
    
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(p => parseInt(p.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = Math.max(1, min); i <= Math.min(totalPages, max); i++) {
            pages.add(i);
          }
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          pages.add(page);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const getPageList = (): number[] => {
    switch (pageSelectionMode) {
      case 'current':
        return [currentPage + 1];
      case 'all':
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      case 'range':
        return parsePageRange(pageRange);
      default:
        return [currentPage + 1];
    }
  };

  const pagesToExport = getPageList();
  const selectedFormatInfo = ALL_FORMATS.find(f => f.id === selectedFormat);
  const showQualitySlider = ['jpg', 'webp'].includes(selectedFormat);
  const isRangeEmpty = pageSelectionMode === 'range' && pageRange.trim().length === 0;
  const canExport = !isRangeEmpty && pagesToExport.length > 0;

  const handleExport = async () => {
    if (pagesToExport.length === 0) {
      toast.error("No valid pages selected");
      return;
    }

    setIsExporting(true);
    try {
      let successCount = 0;
      let failureCount = 0;

      // Export each selected page
      for (const pageNum of pagesToExport) {
        try {
          const result = await performImageExport(
            documentName,
            selectedFormat,
            pageNum - 1, // Convert to 0-based index
            { quality: quality / 100 }
          );

          if (result.success) {
            successCount++;
            toast.success(`Exported page ${pageNum}: ${result.filename}`);
          } else {
            failureCount++;
            toast.error(`Failed to export page ${pageNum}: ${result.error}`);
          }
        } catch (err) {
          failureCount++;
          toast.error(`Error exporting page ${pageNum}: ${err}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully exported ${successCount} page(s)`);
        onClose();
      }
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
        right: 0,
        bottom: 0,
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
          borderRadius: "12px",
          padding: "24px",
          minWidth: "500px",
          maxWidth: "600px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1e3a8a" }}>
            Export to Image
          </h2>
          <button
            onClick={onClose}
            style={{ 
              background: "none", 
              border: "none", 
              fontSize: "24px", 
              cursor: "pointer", 
              color: "#666",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Format Selection FIRST */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px", color: "#1e3a8a" }}>
            1. Select Image Format
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "2px solid #2563eb",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {ALL_FORMATS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} - {format.description}
              </option>
            ))}
          </select>
        </div>

        {/* Quality Slider */}
        {showQualitySlider && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "14px", color: "#374151" }}>
              Quality: {quality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280" }}>
              <span>Smaller file</span>
              <span>Better quality</span>
            </div>
          </div>
        )}

        {/* Pages Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px", color: "#1e3a8a" }}>
            2. Select Pages to Export
          </label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button
              onClick={() => setPageSelectionMode('current')}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: pageSelectionMode === 'current' ? "2px solid #2563eb" : "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: pageSelectionMode === 'current' ? "#eff6ff" : "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                color: pageSelectionMode === 'current' ? "#2563eb" : "#374151",
              }}
            >
              Current ({currentPage + 1})
            </button>
            <button
              onClick={() => setPageSelectionMode('all')}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: pageSelectionMode === 'all' ? "2px solid #2563eb" : "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: pageSelectionMode === 'all' ? "#eff6ff" : "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                color: pageSelectionMode === 'all' ? "#2563eb" : "#374151",
              }}
            >
              All ({totalPages})
            </button>
            <button
              onClick={() => setPageSelectionMode('range')}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: pageSelectionMode === 'range' ? "2px solid #2563eb" : "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: pageSelectionMode === 'range' ? "#eff6ff" : "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                color: pageSelectionMode === 'range' ? "#2563eb" : "#374151",
              }}
            >
              Range
            </button>
          </div>
          <div style={{ minHeight: "65px" }}>
            {pageSelectionMode === 'range' && (
              <input
                type="text"
                autoFocus
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g., 1 or 1,3,5-7 or 1-5"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            )}
            {pageSelectionMode === 'range' && pageRange.trim().length > 0 && (
              <div style={{ fontSize: "12px", color: pagesToExport.length > 0 ? "#16a34a" : "#dc2626", marginTop: "8px" }}>
                {pagesToExport.length > 0 
                  ? `✓ Will export ${pagesToExport.length} page${pagesToExport.length !== 1 ? 's' : ''}: ${pagesToExport.join(', ')}`
                  : `✗ No valid pages found. Valid range: 1-${totalPages}`
                }
              </div>
            )}
            {pageSelectionMode !== 'current' && pageSelectionMode !== 'range' && (
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
                Will export {pagesToExport.length} page{pagesToExport.length !== 1 ? 's' : ''}: {pagesToExport.length > 0 ? pagesToExport.join(', ') : 'none'}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div style={{ 
          padding: "14px", 
          backgroundColor: "#f0f9ff", 
          borderLeft: "4px solid #2563eb",
          borderRadius: "4px", 
          marginBottom: "20px" 
        }}>
          <div style={{ fontSize: "13px", color: "#1e40af" }}>
            <div style={{ marginBottom: "4px" }}>
              <strong>📄 Document:</strong> {documentName}
            </div>
            <div style={{ marginBottom: "4px" }}>
              <strong>📷 Format:</strong> {selectedFormatInfo?.name} - {selectedFormatInfo?.description}
            </div>
            <div>
              <strong>📄 Pages:</strong> {pagesToExport.length === 1 ? `Page ${pagesToExport[0]}` : `${pagesToExport.length} pages`}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: "10px 20px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              backgroundColor: "white",
              cursor: isExporting ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !canExport}
            style={{
              padding: "10px 24px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: isExporting || !canExport ? "#9ca3af" : "#2563eb",
              color: "white",
              cursor: isExporting || !canExport ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {isExporting ? "Exporting..." : `Export ${pagesToExport.length} Page${pagesToExport.length !== 1 ? 's' : ''} as ${selectedFormatInfo?.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
