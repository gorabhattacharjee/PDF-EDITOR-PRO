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

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await performImageExport(
        documentName,
        selectedFormat,
        currentPage,
        { quality: quality / 100 }
      );

      if (result.success) {
        toast.success(`Exported: ${result.filename}`);
        if (result.error) {
          toast(result.error, { icon: 'info' });
        }
        onClose();
      } else {
        toast.error(result.error || "Export failed");
      }
    } catch (err) {
      toast.error(`Export error: ${err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatInfo = SUPPORTED_FORMATS.find(f => f.id === selectedFormat);
  const showQualitySlider = ['jpg', 'webp'].includes(selectedFormat);

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
          minWidth: "420px",
          maxWidth: "500px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
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

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "14px", color: "#374151" }}>
            Image Format
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            {SUPPORTED_FORMATS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} (.{format.extension}) - {format.description}
              </option>
            ))}
          </select>
        </div>

        {showQualitySlider && (
          <div style={{ marginBottom: "16px" }}>
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

        <div style={{ 
          padding: "12px", 
          backgroundColor: "#f3f4f6", 
          borderRadius: "8px", 
          marginBottom: "20px" 
        }}>
          <div style={{ fontSize: "13px", color: "#4b5563" }}>
            <div style={{ marginBottom: "4px" }}>
              <strong>Document:</strong> {documentName}
            </div>
            <div style={{ marginBottom: "4px" }}>
              <strong>Page:</strong> {currentPage} of {totalPages}
            </div>
            <div>
              <strong>Format:</strong> {selectedFormatInfo?.name} ({selectedFormatInfo?.description})
            </div>
          </div>
        </div>

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
            disabled={isExporting}
            style={{
              padding: "10px 24px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: isExporting ? "#9ca3af" : "#2563eb",
              color: "white",
              cursor: isExporting ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {isExporting ? "Exporting..." : "Export Image"}
          </button>
        </div>
      </div>
    </div>
  );
}
