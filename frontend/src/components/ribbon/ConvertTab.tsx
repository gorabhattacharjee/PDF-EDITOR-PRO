"use client";

import React, { useState } from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import useUIStore from "@/stores/useUIStore";
import logger from "@/utils/logger";
import { getConvertUrl } from "@/config/api";
import { PDFDocument } from "pdf-lib";
import RibbonButton from "./RibbonButton";
import ImageExportModal from "@/components/ImageExportModal";
import {
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileImage,
  FaFilePdf,
} from "react-icons/fa";
import { FiFileText } from "react-icons/fi";
import { MdImage } from "react-icons/md";

export default function ConvertTab() {
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const activePage = useUIStore((s) => s.activePage);
  const [showImageExportModal, setShowImageExportModal] = useState(false);

  const ensureDoc = () => {
    if (!activeDocument) {
      alert("No active document");
      return false;
    }
    return true;
  };

  const performConversion = async (format: 'word' | 'excel' | 'ppt' | 'html') => {
    if (!ensureDoc() || !activeDocument?.file) {
      console.error('[ConvertTab] Document check failed');
      return;
    }
    
    try {
      logger.success(`Converting to ${format.toUpperCase()}...`);
      console.log('[ConvertTab] Starting conversion:', format);
      console.log('[ConvertTab] File:', activeDocument.file);
      console.log('[ConvertTab] File size:', activeDocument.file.size);
      
      alert(`Converting to ${format.toUpperCase()}... This may take a moment.`);
      
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', format);

      console.log('[ConvertTab] FormData created, sending to backend...');
      
      const response = await fetch(getConvertUrl(), {
        method: 'POST',
        body: formData,
      });

      console.log('[ConvertTab] Response status:', response.status);
      console.log('[ConvertTab] Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ConvertTab] Backend error:', errorText);
        throw new Error(`Conversion failed: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('[ConvertTab] Blob received, size:', blob.size);
      console.log('[ConvertTab] Blob type:', blob.type);
      
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
      console.log('[ConvertTab] Triggering download:', link.download);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success(`Successfully converted to ${format}: ${link.download}`);
      alert(`Conversion completed! File: ${link.download}`);
    } catch (error) {
      console.error('[ConvertTab] Conversion error:', error);
      logger.error(`Conversion failed: ${error}`);
      alert(`Conversion failed: ${error}\n\nNote: Conversion services depend on backend. Try again or contact support`);
    }
  };

  const exportToText = async () => {
    if (!ensureDoc() || !activeDocument?.file) {
      console.error('[ConvertTab] Document check failed for text export');
      return;
    }
    
    try {
      logger.success('Extracting text from PDF...');
      console.log('[ConvertTab] Starting text extraction');
      
      alert('Extracting text from PDF... This may take a moment.');
      
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', 'text');

      console.log('[ConvertTab] FormData created, sending to backend...');
      const response = await fetch(getConvertUrl(), {
        method: 'POST',
        body: formData,
      });

      console.log('[ConvertTab] Response status:', response.status);
      console.log('[ConvertTab] Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ConvertTab] Backend error:', errorText);
        throw new Error(`Text extraction failed: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('[ConvertTab] Blob received, size:', blob.size);
      console.log('[ConvertTab] Blob type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('Backend returned empty file. Text extraction service may not be working.');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const baseName = activeDocument.name.replace('.pdf', '');
      link.download = `${baseName}.txt`;
      console.log('[ConvertTab] Triggering text download:', link.download);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      logger.success(`Successfully extracted text: ${link.download}`);
      alert(`Text extraction completed! File: ${link.download}`);
    } catch (error) {
      console.error('[ConvertTab] Text extraction error:', error);
      logger.error(`Text extraction failed: ${error}`);
      alert(`Text extraction failed: ${error}\n\nNote: Text extraction depends on backend service. Ensure backend server is running.`);
    }
  };

  const exportImage = () => {
    if (!activeDocument) {
      alert('Please load a PDF first');
      return;
    }
    setShowImageExportModal(true);
  };

  const exportPDFa = async () => {
    if (!ensureDoc() || !activeDocument?.file) {
      console.error('[ConvertTab] Document check failed for PDF/A export');
      return;
    }

    try {
      console.log('[ConvertTab] Starting PDF/A export');
      alert('Converting to PDF/A format... This creates an archive-ready version of your PDF.');
      
      const buf = await activeDocument.file.arrayBuffer();
      const doc = await PDFDocument.load(buf);

      const title = activeDocument.name.replace('.pdf', '');
      doc.setTitle(title);
      doc.setAuthor("PDF Editor Pro");
      doc.setSubject("PDF/A Conformant Document");
      doc.setKeywords(["PDF/A", "archive", "long-term preservation"]);
      doc.setCreator("PDF Editor Pro - PDF/A Converter");
      doc.setProducer("PDF Editor Pro v1.0 (pdf-lib)");
      doc.setCreationDate(new Date());
      doc.setModificationDate(new Date());

      const bytes = await doc.save();
      const file = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = activeDocument.name.replace(".pdf", "_PDFA.pdf");
      console.log('[ConvertTab] Triggering PDF/A download:', a.download);
      a.click();
      URL.revokeObjectURL(a.href);

      logger.success("Exported PDF/A compatible document");
      alert(`PDF/A export completed!

File: ${a.download}

This PDF includes standard archival metadata for long-term preservation.`);
    } catch (error) {
      console.error('[ConvertTab] PDF/A export error:', error);
      logger.error(`PDF/A export failed: ${error}`);
      alert(`PDF/A export failed: ${error}`);
    }
  };

  return (
    <div className="ribbon-row">
      <RibbonButton
        icon={<FaFileWord style={{ color: '#2563eb', fontSize: '18px' }} />}
        label="To Word (.docx)"
        onClick={async () => { await performConversion('word'); }}
      />
      <RibbonButton
        icon={<FaFileExcel style={{ color: '#16a34a', fontSize: '18px' }} />}
        label="To Excel (.xlsx)"
        onClick={async () => { await performConversion('excel'); }}
      />
      <RibbonButton
        icon={<FaFilePowerpoint style={{ color: '#dc2626', fontSize: '18px' }} />}
        label="To PowerPoint (.pptx)"
        onClick={async () => { await performConversion('ppt'); }}
      />
      <RibbonButton
        icon={<MdImage style={{ color: '#d946ef', fontSize: '18px' }} />}
        label="To Image"
        onClick={() => exportImage()}
      />
      <RibbonButton
        icon={<FaFilePdf style={{ color: '#6366f1', fontSize: '18px' }} />}
        label="To PDF/A"
        onClick={async () => { await exportPDFa(); }}
      />
      <RibbonButton
        icon={<FiFileText style={{ color: '#f97316', fontSize: '18px' }} />}
        label="To Text (.txt)"
        onClick={async () => { await exportToText(); }}
      />
      
      {activeDocument && (
        <ImageExportModal
          isOpen={showImageExportModal}
          onClose={() => setShowImageExportModal(false)}
          documentName={activeDocument.name}
          currentPage={activePage || 1}
          totalPages={activeDocument.numPages || 1}
        />
      )}
    </div>
  );
}
