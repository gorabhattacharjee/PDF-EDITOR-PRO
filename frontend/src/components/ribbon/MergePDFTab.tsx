"use client";

import React, { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import logger from "@/utils/logger";
import { useDocumentsStore } from "@/stores/useDocumentsStore";
import RibbonButton from "./RibbonButton";
import toast from "react-hot-toast";
import { FaPlus, FaLayerGroup, FaFolderOpen } from "react-icons/fa";

export default function MergePDFTab() {
  const { openDocument } = useDocumentsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfQueue, setPdfQueue] = useState<File[]>([]);
  const [mergedFile, setMergedFile] = useState<File | null>(null);

  const handleAddPDFs = () => {
    fileRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      logger.warn("No files selected");
      return;
    }

    const newFiles = Array.from(files);
    logger.info(`Selected ${newFiles.length} files for merge`);
    
    // Open each PDF in a new tab first
    for (const file of newFiles) {
      try {
        logger.info(`Opening PDF: ${file.name} (${file.size} bytes)`);
        await openDocument(file);
        logger.success(`Opened PDF in new tab: ${file.name}`);
      } catch (err) {
        logger.error(`Failed to open ${file.name}: ${err}`);
        toast.error(`Failed to open ${file.name}`);
      }
    }
    
    // Add to merge queue after opening
    setPdfQueue(prev => [...prev, ...newFiles]);
    
    toast.success(`Added ${newFiles.length} PDF(s) and opened in new tabs`);
    logger.info(`Added ${newFiles.length} PDFs to merge queue. Total: ${pdfQueue.length + newFiles.length}`);

    // Reset input for next selection
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleMergeNow = async () => {
    if (pdfQueue.length < 2) {
      toast.error("Please add at least 2 PDFs to merge");
      return;
    }

    try {
      toast.loading("Merging PDFs...", { id: "merge" });
      logger.info(`Merging ${pdfQueue.length} PDF files...`);

      const mergedPdf = await PDFDocument.create();

      for (const file of pdfQueue) {
        try {
          const buf = await file.arrayBuffer();
          const pdf = await PDFDocument.load(buf);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          logger.info(`Added ${pdf.getPageCount()} pages from ${file.name}`);
        } catch (err) {
          logger.error(`Failed to process ${file.name}: ${err}`);
          toast.error(`Failed to process ${file.name}`);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const newMergedFile = new File(
        [new Uint8Array(mergedBytes)],
        `merged_${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      setMergedFile(newMergedFile);
      setPdfQueue([]);

      toast.success(`Merged ${pdfQueue.length} PDFs successfully! Click "Open Merged File" to view.`, { id: "merge" });
      logger.success(`Merged ${pdfQueue.length} PDFs into ${newMergedFile.name}`);
    } catch (err) {
      toast.error(`Merge failed: ${err}`, { id: "merge" });
      logger.error(`PDF merge failed: ${err}`);
    }
  };

  const handleOpenMergedFile = async () => {
    if (!mergedFile) {
      toast.error("No merged file available. Please merge PDFs first.");
      return;
    }

    await openDocument(mergedFile);
    toast.success("Merged PDF opened in new tab");
    logger.success(`Opened merged PDF: ${mergedFile.name}`);
  };

  return (
    <>
      <div className="ribbon-row" style={{ gap: '16px' }}>
        <RibbonButton 
          icon={<FaPlus style={{ color: '#6366f1' }} />} 
          label="Add PDFs" 
          onClick={handleAddPDFs}
        />
        <RibbonButton 
          icon={<FaLayerGroup style={{ color: '#f59e0b' }} />} 
          label="Merge Now" 
          onClick={handleMergeNow}
        />
        <RibbonButton 
          icon={<FaFolderOpen style={{ color: '#10b981' }} />} 
          label="Open Merged File" 
          onClick={handleOpenMergedFile}
        />
        
        {pdfQueue.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginLeft: '16px',
            padding: '4px 12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#1e40af',
          }}>
            <span>Queue: {pdfQueue.length} PDF(s)</span>
            <button
              onClick={() => setPdfQueue([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Clear
            </button>
          </div>
        )}
        
        {mergedFile && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 12px',
            backgroundColor: '#f0fdf4',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#166534',
          }}>
            Ready: {mergedFile.name}
          </div>
        )}
      </div>

      <input
        type="file"
        accept="application/pdf"
        multiple
        ref={fileRef}
        style={{ display: "none" }}
        onChange={handleFilesSelected}
      />
    </>
  );
}
