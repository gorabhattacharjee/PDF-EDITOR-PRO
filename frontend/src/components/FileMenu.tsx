"use client";

import React, { useRef } from "react";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import { useAnnotationsStore } from "@/stores/useAnnotationsStore";
import { useTextEditsStore } from "@/stores/useTextEditsStore";
import { useImageEditsStore } from "@/stores/useImageEditsStore";
import { applyAllModificationsToPdf } from "@/adapters/pdf-lib";
import logger from "@/utils/logger";
import toast from "react-hot-toast";

interface FileMenuProps {
  onClose?: () => void;
  onOpenImageExport?: () => void;
}

export default function FileMenu({ onClose, onOpenImageExport }: FileMenuProps) {
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const { openDocument } = useDocumentsStore();
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
    if (!ensureDoc() || !activeDocument?.file) return;
    
    console.log('[FileMenu] ===== SAVE CLICKED =====');
    console.log('[FileMenu] Active document ID:', activeDocument.id);
    
    try {
      const highlights = useAnnotationsStore.getState().highlights[activeDocument.id] || [];
      const textEdits = useTextEditsStore.getState().edits[activeDocument.id] || [];
      const imageEdits = useImageEditsStore.getState().edits[activeDocument.id] || [];
      
      console.log('[FileMenu] Highlights:', highlights.length);
      console.log('[FileMenu] Text edits:', textEdits.length);
      console.log('[FileMenu] Image edits:', imageEdits.length);
      console.log('[FileMenu] All image edits in store:', JSON.stringify(useImageEditsStore.getState().edits));
      
      let pdfBlob: Blob;
      
      if (highlights.length > 0 || textEdits.length > 0 || imageEdits.length > 0) {
        console.log('[FileMenu] Applying modifications...');
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, highlights, textEdits, imageEdits);
        pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        console.log('[FileMenu] Modifications applied!');
        toast.success(`Saved with ${highlights.length} highlights, ${textEdits.length} text edits, ${imageEdits.length} image edits`);
      } else {
        pdfBlob = activeDocument.file;
        toast.success('PDF saved (no modifications)');
      }
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = activeDocument.name || "document.pdf";
      link.click();
      URL.revokeObjectURL(url);
      
      logger.success("PDF downloaded successfully");
      onClose?.();
    } catch (err) {
      console.error('[FileMenu] Save error:', err);
      toast.error('Failed to save: ' + err);
    }
  };
  
  const handleSaveAs = async () => {
    if (!ensureDoc() || !activeDocument?.file) return;
    
    const newName = prompt('Enter new filename:', activeDocument.name.replace('.pdf', '_copy.pdf'));
    if (!newName) return;
    
    try {
      const highlights = useAnnotationsStore.getState().highlights[activeDocument.id] || [];
      const textEdits = useTextEditsStore.getState().edits[activeDocument.id] || [];
      const imageEdits = useImageEditsStore.getState().edits[activeDocument.id] || [];
      
      let pdfBlob: Blob;
      if (highlights.length > 0 || textEdits.length > 0 || imageEdits.length > 0) {
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, highlights, textEdits, imageEdits);
        pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      } else {
        pdfBlob = activeDocument.file;
      }
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = newName.endsWith('.pdf') ? newName : newName + '.pdf';
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Saved as: ${link.download}`);
      logger.success(`PDF saved as: ${link.download}`);
      onClose?.();
    } catch (err) {
      toast.error('Save As failed: ' + err);
      logger.error('Save As failed: ' + err);
    }
  };
  const handlePrint = () => ensureDoc() && window.print();
  const handleCloseDoc = () => {
    if (!ensureDoc()) return;
    const confirmed = confirm(`Close "${activeDocument?.name}"?\n\nAny unsaved changes will be lost.`);
    if (confirmed && activeDocument) {
      useDocumentsStore.getState().closeDocument(activeDocument.id);
      toast.success('Document closed');
      logger.info(`Closed document: ${activeDocument.name}`);
      onClose?.();
    }
  };
  const handleDownloadLog = () => {
    logger.download(`pdf-editor-log-${Date.now()}.txt`);
  };
  const handleProperties = () => {
    if (!ensureDoc()) return;
    alert(`Document Properties\n\nName: ${activeDocument?.name}`);
  };

  const handleExport = async (format: 'word' | 'excel' | 'ppt' | 'image') => {
    if (!ensureDoc() || !activeDocument?.file) return;

    console.log('[FileMenu] Starting export:', format);
    console.log('[FileMenu] File:', activeDocument.name);

    if (format === 'image') {
      console.log('[FileMenu] Opening image export modal');
      onOpenImageExport?.();
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', format);

      console.log('[FileMenu] Calling backend at /api/convert');
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const baseName = activeDocument.name.replace('.pdf', '');
      const extensions: { [key: string]: string } = {
        word: '.docx',
        excel: '.xlsx',
        ppt: '.pptx',
      };

      link.download = baseName + extensions[format];
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success(`Successfully exported to ${format}: ${link.download}`);
      onClose?.();
    } catch (error) {
      logger.error(`Export failed: ${error}`);
      alert(`Export failed: ${error}`);
    }
  };

  return (
    <>
      <div className="filemenu-float">
        <div className="filemenu-container">
          <button className="filemenu-item" onClick={handleOpen}>Open</button>
        <button className="filemenu-item" onClick={handleSave}>Save</button>
        <button className="filemenu-item" onClick={handleSaveAs}>Save As</button>
        <button className="filemenu-item" onClick={handlePrint}>Print</button>

        {/* Export Row */}
        <div className="filemenu-export-row">
          <button className="filemenu-item">Export &gt;</button>

          {/* Submenu — hidden until hover */}
          <div className="filemenu-export-submenu">
            <button className="filemenu-sub-item" onClick={() => handleExport('word')}>Word (.docx)</button>
            <button className="filemenu-sub-item" onClick={() => handleExport('excel')}>Excel (.xlsx)</button>
            <button className="filemenu-sub-item" onClick={() => handleExport('ppt')}>PowerPoint (.pptx)</button>
            <button className="filemenu-sub-item" onClick={() => handleExport('image')}>Image</button>
          </div>
        </div>

        <button className="filemenu-item" onClick={handleCloseDoc}>Close</button>
        <button className="filemenu-item" onClick={handleDownloadLog}>Download Log</button>
        <button className="filemenu-item" onClick={handleProperties}>Document Properties</button>
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
