"use client";

import React, { useState, useRef } from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { useUIStore } from "@/stores/useUIStore";
import { useAnnotationsStore } from "@/stores/useAnnotationsStore";
import { useTextEditsStore } from "@/stores/useTextEditsStore";
import { useImageEditsStore } from "@/stores/useImageEditsStore";
import { applyAllModificationsToPdf } from "@/adapters/pdf-lib";
import logger from "@/utils/logger";
import {
  FiFile,
  FiSave,
  FiPrinter,
  FiDownload,
  FiX,
  FiChevronRight,
  FiFileText,
  FiInfo,
} from "react-icons/fi";
import { FaFileWord, FaFileExcel, FaFilePowerpoint } from "react-icons/fa";
import { MdImage, MdHtml, MdOutlineFileDownload } from "react-icons/md";

interface FileMenuProps {
  onClose?: () => void;
  onOpenImageExport?: () => void;
}

export default function FileMenu({ onClose, onOpenImageExport }: FileMenuProps) {
  const [isExportMenuOpen, setExportMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const { openDocument } = useDocumentsStore();
  const highlights = useAnnotationsStore((s) => s.highlights);
  const textEdits = useTextEditsStore((s) => s.edits);
  const imageEdits = useImageEditsStore((s) => s.edits);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ensureDoc = () => {
    if (!activeDocument) {
      alert("No active document loaded.");
      return false;
    }
    return true;
  };

  const handleOpen = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await openDocument(file);
      logger.success(`PDF opened from File Menu → ${file.name}`);
      onClose?.();
    } catch (err) {
      logger.error("Failed to open PDF from File Menu → " + err);
    }
  };

  const handleSave = async () => {
    console.log('[FileMenu] handleSave called');
    if (!ensureDoc()) return;
    if (!activeDocument?.file) {
      logger.error("No file to save");
      return;
    }
    
    console.log('[FileMenu] Starting save process...');
    setIsSaving(true);
    try {
      const docHighlights = highlights[activeDocument.id] || [];
      const docTextEdits = textEdits[activeDocument.id] || [];
      const docImageEdits = imageEdits[activeDocument.id] || [];
      console.log('[FileMenu Save] docId:', activeDocument.id);
      console.log('[FileMenu Save] Highlights:', docHighlights.length, 'Text edits:', docTextEdits.length, 'Image edits:', docImageEdits.length);
      if (docImageEdits.length > 0) {
        console.log('[FileMenu Save] First image edit:', JSON.stringify(docImageEdits[0], null, 2).substring(0, 500));
      }
      let pdfBlob: Blob;
      
      if (docHighlights.length > 0 || docTextEdits.length > 0 || docImageEdits.length > 0) {
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, docHighlights, docTextEdits, docImageEdits);
        pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        logger.info(`Embedded ${docHighlights.length} highlights, ${docTextEdits.length} text edits, and ${docImageEdits.length} image edits into PDF`);
      } else {
        pdfBlob = activeDocument.file;
      }
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = activeDocument.name || "document.pdf";
      link.click();
      URL.revokeObjectURL(url);
      logger.success(`Downloaded: ${activeDocument.name}`);
    } catch (err) {
      logger.error("Failed to save PDF: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAs = async () => {
    if (!ensureDoc()) return;
    if (!activeDocument?.file) {
      logger.error("No file to save");
      return;
    }
    const newName = prompt(
      "Save PDF as:",
      activeDocument.name || "document.pdf"
    );
    if (!newName) return;
    
    setIsSaving(true);
    try {
      const docHighlights = highlights[activeDocument.id] || [];
      const docTextEdits = textEdits[activeDocument.id] || [];
      const docImageEdits = imageEdits[activeDocument.id] || [];
      let pdfBlob: Blob;
      
      if (docHighlights.length > 0 || docTextEdits.length > 0 || docImageEdits.length > 0) {
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, docHighlights, docTextEdits, docImageEdits);
        pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        logger.info(`Embedded ${docHighlights.length} highlights, ${docTextEdits.length} text edits, and ${docImageEdits.length} image edits into PDF`);
      } else {
        pdfBlob = activeDocument.file;
      }
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = newName;
      link.click();
      URL.revokeObjectURL(url);
      logger.success(`Downloaded: ${newName}`);
    } catch (err) {
      logger.error("Failed to save PDF: " + err);
    } finally {
      setIsSaving(false);
    }
  };
  const handlePrint = () => {
    if (!ensureDoc()) return;
    if (!activeDocument?.file) {
      logger.error("No PDF to print");
      return;
    }
    
    // Create a blob URL for the PDF
    const url = URL.createObjectURL(activeDocument.file);
    
    // Open the PDF in a new window/tab for printing
    const printWindow = window.open(url, "_blank");
    
    if (printWindow) {
      // Wait for the PDF to load, then trigger print
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
      logger.success("Opening PDF for printing...");
    } else {
      logger.error("Could not open print window. Please check popup blocker settings.");
    }
    
    // Clean up the URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };
  const handleExportWord = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    await performExport('word');
  };
  const handleExportExcel = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    await performExport('excel');
  };
  const handleExportPPT = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    await performExport('ppt');
  };
  const handleExportImage = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    console.log('[FileMenu] Opening image export modal');
    onOpenImageExport?.();
  };
  const handleExportText = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    await performTextExport();
  };
  const handleExportHTML = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    await performExport('html');
  };

  const performExport = async (format: 'word' | 'excel' | 'ppt' | 'html') => {
    try {
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', format);

      console.log('[FileMenu] Starting export:', format);
      alert(`Exporting to ${format.toUpperCase()}... This may take a moment.`);
      
      const response = await fetch('http://localhost:5000/api/convert/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FileMenu] Backend error:', errorText);
        throw new Error(`Export failed: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Backend returned empty file. Conversion service may not be working.');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const baseName = activeDocument.name.replace('.pdf', '');
      const extensions: { [key: string]: string } = {
        word: '.docx',
        excel: '.xlsx',
        ppt: '.pptx',
        html: '.html',
      };

      link.download = baseName + extensions[format];
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success(`Successfully exported to ${format}: ${link.download}`);
      alert(`Export completed! File: ${link.download}`);
      onClose?.();
    } catch (error) {
      console.error('[FileMenu] Export error:', error);
      logger.error(`Export failed: ${error}`);
      alert(`Export failed: ${error}\n\nNote: Conversion services depend on backend. Ensure backend server is running at http://localhost:5000`);
    }
  };
  const handleCloseDoc = () => {
    if (!ensureDoc()) return;
    const { closeDocument, activeDocId } = useDocumentsStore.getState();
    if (activeDocId) {
      closeDocument(activeDocId);
      logger.success(`Closed: ${activeDocument?.name}`);
      onClose?.();
    }
  };
  const handleDownloadLog = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    logger.download(`pdf-editor-log-${timestamp}.txt`);
  };
  const handleProperties = () => {
    if (!ensureDoc()) return;
    useUIStore.getState().openPropertiesModal();
  };
  
  const performImageExport = async () => {
    try {
      if (!activeDocument) {
        logger.error('No active document');
        alert('No PDF document loaded');
        return;
      }
  
      console.log('[FileMenu] activeDocument:', activeDocument);
      console.log('[FileMenu] numPages:', activeDocument.numPages);
  
      // Export first page by rendering canvas from the PDF viewer
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        logger.error('PDF canvas not found. Make sure PDF is loaded and displayed.');
        alert('PDF must be displayed on screen to export as image.');
        return;
      }
  
      const pageCount = activeDocument.numPages || 1;
      logger.success(`Exporting PDF page 1 to image (Total ${pageCount} pages)...`);
  
      // Get canvas data
      canvas.toBlob((blob) => {
        if (!blob) {
          logger.error('Failed to convert canvas to image');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeDocument.name.replace('.pdf', '')}_page_1.png`;
        link.click();
        window.URL.revokeObjectURL(url);
        logger.success(`Exported to image: ${link.download}`);
      }, 'image/png');
  
      onClose?.();
    } catch (error) {
      logger.error(`Image export failed: ${error}`);
      alert(`Image export failed: ${error}`);
    }
  };

  const performTextExport = async () => {
    try {
      if (!activeDocument?.file) {
        logger.error('No PDF file available');
        return;
      }

      logger.success('Extracting text from PDF via backend...');
      alert('Extracting text from PDF... This may take a moment.');
      
      // Send PDF to backend for text extraction
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', 'text');

      console.log('[FileMenu] Starting text extraction');
      const response = await fetch('http://localhost:5000/api/convert/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FileMenu] Backend error:', errorText);
        throw new Error(`Text extraction failed: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Backend returned empty file. Text extraction service may not be working.');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const baseName = activeDocument.name.replace('.pdf', '');
      link.download = `${baseName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success(`Successfully extracted text: ${link.download}`);
      alert(`Text extraction completed! File: ${link.download}`);
      onClose?.();
    } catch (error) {
      console.error('[FileMenu] Text export error:', error);
      logger.error(`Text export failed: ${error}`);
      alert(`Text extraction failed: ${error}\n\nNote: Text extraction depends on backend service. Ensure backend server is running.`);
    }
  };

  return (
    <>
      <div className="filemenu-float">
        <div className="filemenu-container">
          {/* Open */}
          <button className="filemenu-item filemenu-item-open" onClick={handleOpen}>
            <FiFile className="filemenu-icon" />
            <span>Open</span>
          </button>

          {/* Save */}
          <button className="filemenu-item filemenu-item-save" onClick={handleSave}>
            <FiSave className="filemenu-icon" />
            <span>Save</span>
          </button>

          {/* Save As */}
          <button className="filemenu-item filemenu-item-saveas" onClick={handleSaveAs}>
            <FiSave className="filemenu-icon" />
            <span>Save As</span>
          </button>

          {/* Print */}
          <button className="filemenu-item filemenu-item-print" onClick={handlePrint}>
            <FiPrinter className="filemenu-icon" />
            <span>Print</span>
          </button>

          {/* Divider */}
          <div className="filemenu-divider" />

          {/* Export with Submenu */}
          <div className="filemenu-export-container">
            <button
              className="filemenu-item filemenu-item-export filemenu-export-trigger"
              onClick={() => setExportMenuOpen(!isExportMenuOpen)}
            >
              <MdHtml className="filemenu-icon" />
              <span>Export</span>
              <FiChevronRight className="filemenu-arrow" />
            </button>

            {isExportMenuOpen && (
              <div className="filemenu-submenu">
                <button className="filemenu-sub-item filemenu-sub-word" onClick={handleExportWord}>
                  <FaFileWord className="filemenu-icon" style={{color: '#2563eb', fontSize: '18px'}} />
                  <span>Word (.docx)</span>
                </button>
                <button className="filemenu-sub-item filemenu-sub-excel" onClick={handleExportExcel}>
                  <FaFileExcel className="filemenu-icon" style={{color: '#16a34a', fontSize: '18px'}} />
                  <span>Excel (.xlsx)</span>
                </button>
                <button className="filemenu-sub-item filemenu-sub-ppt" onClick={handleExportPPT}>
                  <FaFilePowerpoint className="filemenu-icon" style={{color: '#dc2626', fontSize: '18px'}} />
                  <span>PowerPoint (.pptx)</span>
                </button>
                <button className="filemenu-sub-item filemenu-sub-image" onClick={handleExportImage}>
                  <MdImage className="filemenu-icon" style={{color: '#d946ef', fontSize: '18px'}} />
                  <span>Image</span>
                </button>
                <button className="filemenu-sub-item filemenu-sub-text" onClick={handleExportText}>
                  <FiFileText className="filemenu-icon" style={{color: '#6366f1', fontSize: '18px'}} />
                  <span>Text</span>
                </button>
                <button className="filemenu-sub-item filemenu-sub-html" onClick={handleExportHTML}>
                  <MdHtml className="filemenu-icon" style={{color: '#f97316', fontSize: '18px'}} />
                  <span>HTML</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="filemenu-divider" />

          {/* Close */}
          <button className="filemenu-item filemenu-item-close" onClick={handleCloseDoc}>
            <FiX className="filemenu-icon" />
            <span>Close</span>
          </button>

          {/* Download Log */}
          <button className="filemenu-item filemenu-item-download" onClick={handleDownloadLog}>
            <MdOutlineFileDownload className="filemenu-icon" />
            <span>Download Log</span>
          </button>

          {/* Document Properties */}
          <button className="filemenu-item filemenu-item-properties" onClick={handleProperties}>
            <FiInfo className="filemenu-icon" />
            <span>Document Properties</span>
          </button>
        </div>
      </div>

      {/* Hidden file input for Open */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept="application/pdf"
        onChange={handleFileInput}
      />
    </>
  );
}
