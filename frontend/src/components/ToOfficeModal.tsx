'use client';

import React, { useState } from 'react';
import useDocumentsStore from '@/stores/useDocumentsStore';
import useUIStore from '@/stores/useUIStore';
import logger from '@/utils/logger';
import { getConvertUrl } from '@/config/api';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';
import { FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt } from 'react-icons/fa';

export default function ToOfficeModal() {
  console.log('[ToOfficeModal] Component mounted/rendered');
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const isToOfficeModalOpen = useUIStore((s) => s.isToOfficeModalOpen);
  const closeToOfficeModal = useUIStore((s) => s.closeToOfficeModal);
  const [converting, setConverting] = useState(false);
  const [conversionFormat, setConversionFormat] = useState<string | null>(null);

  console.log('[ToOfficeModal] Render - isOpen:', isToOfficeModalOpen);

  React.useEffect(() => {
    console.log('[ToOfficeModal] useEffect - isOpen:', isToOfficeModalOpen);
    if (isToOfficeModalOpen) {
      console.log('[ToOfficeModal] Modal opened - should be visible');
      logger.success('To Office modal opened');
    } else {
      console.log('[ToOfficeModal] Modal closed - should be hidden');
    }
  }, [isToOfficeModalOpen]);

  const handleConvert = async (format: 'word' | 'excel' | 'ppt' | 'html') => {
    console.log('[ToOfficeModal] handleConvert called with format:', format);
    if (!activeDocument?.file) {
      logger.error('No PDF file to convert');
      console.log('[ToOfficeModal] Error: No PDF file loaded!');
      return;
    }

    setConverting(true);
    setConversionFormat(format);

    try {
      toast.loading('Converting...', { id: 'convert' });
      const formData = new FormData();
      formData.append('file', activeDocument.file);
      formData.append('format', format);

      console.log('[ToOfficeModal] Starting conversion:', format);
      console.log('[ToOfficeModal] File:', activeDocument.name);
      console.log('[ToOfficeModal] File object:', activeDocument.file);
      console.log('[ToOfficeModal] File.name property:', activeDocument.file.name);
      console.log('[ToOfficeModal] Calling backend at /api/convert');
      const response = await fetch(getConvertUrl(), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ToOfficeModal] Error response:', errorText);
        throw new Error(`Conversion failed: ${response.statusText} - ${errorText}`);
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
        html: '.html',
      };

      link.download = baseName + extensions[format];
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Converted to ${format}!`, { id: 'convert' });
      logger.success(`Successfully converted to ${format}: ${link.download}`);
      closeToOfficeModal();
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      toast.error(`Conversion failed: ${errorMessage}`, { id: 'convert' });
      logger.error(`Conversion failed: ${errorMessage}`);
      console.error('[ToOfficeModal] Full error:', error);
    } finally {
      setConverting(false);
      setConversionFormat(null);
    }
  };

  return (
    <>
      {isToOfficeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={closeToOfficeModal}>
          <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '8px', width: '90%', maxWidth: '600px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '24px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Convert to Office Format</h2>
              <button onClick={closeToOfficeModal} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{ color: '#666', marginBottom: '20px' }}>Select the format you want to convert <strong>{activeDocument?.name || 'document'}</strong> to:</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <button onClick={() => handleConvert('word')} disabled={converting} title="Convert to Word (.docx)" style={{ padding: '16px', border: '2px solid #6366f1', borderRadius: '6px', backgroundColor: 'white', cursor: converting ? 'not-allowed' : 'pointer', opacity: converting ? 0.5 : 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📘</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Word</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>(.docx)</div>
                </button>
                
                <button onClick={() => handleConvert('excel')} disabled={converting} style={{ padding: '16px', border: '2px solid #10b981', borderRadius: '6px', backgroundColor: 'white', cursor: converting ? 'not-allowed' : 'pointer', opacity: converting ? 0.5 : 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📗</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Excel</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>(.xlsx)</div>
                </button>
                
                <button onClick={() => handleConvert('ppt')} disabled={converting} style={{ padding: '16px', border: '2px solid #ef4444', borderRadius: '6px', backgroundColor: 'white', cursor: converting ? 'not-allowed' : 'pointer', opacity: converting ? 0.5 : 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📕</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>PowerPoint</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>(.pptx)</div>
                </button>
                
                <button onClick={() => handleConvert('html')} disabled={converting} style={{ padding: '16px', border: '2px solid #f97316', borderRadius: '6px', backgroundColor: 'white', cursor: converting ? 'not-allowed' : 'pointer', opacity: converting ? 0.5 : 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🟧</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>HTML</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>(.html)</div>
                </button>
              </div>
              
              <div style={{ backgroundColor: '#d1f2eb', border: '1px solid #6ee7b7', borderRadius: '4px', padding: '12px', marginTop: '16px', fontSize: '13px', color: '#065f46' }}>
                <strong>✓ Note:</strong> All conversion formats including Word are now available and connected to the backend Python conversion script.
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', textAlign: 'right' }}>
              <button onClick={closeToOfficeModal} disabled={converting} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f3f4f6', cursor: converting ? 'not-allowed' : 'pointer', opacity: converting ? 0.5 : 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
