'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useDocumentsStore } from '@/stores/useDocumentsStore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import toast from 'react-hot-toast';

export default function TextEditorPanel() {
  const { activeTool } = useUIStore();
  const { documents, activeDocId, updateDocument } = useDocumentsStore();
  const activeDoc = documents.find((d) => d.id === activeDocId);
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');

  useEffect(() => {
    const handleClick = async (e: MouseEvent) => {
      if (activeTool !== 'addText' || !activeDoc) return;

      try {
        const { offsetX, offsetY } = e as MouseEvent;
        const pdfDoc = activeDoc.pdfDoc;
        const page = pdfDoc.getPage(activeDoc.currentPage - 1);

        const font = await pdfDoc.embedFont(
          fontFamily === 'TimesRoman'
            ? StandardFonts.TimesRoman
            : fontFamily === 'Courier'
            ? StandardFonts.Courier
            : StandardFonts.Helvetica
        );

        page.drawText('New Text', {
          x: offsetX / 2,
          y: page.getHeight() - offsetY / 2,
          size: fontSize,
          font,
          color: rgb(
            parseInt(fontColor.slice(1, 3), 16) / 255,
            parseInt(fontColor.slice(3, 5), 16) / 255,
            parseInt(fontColor.slice(5, 7), 16) / 255
          ),
        });

        updateDocument(activeDoc.id, { pdfDoc });
        toast.success('Text added');
      } catch (err) {
        toast.error('Failed to add text');
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [activeTool, activeDoc, fontSize, fontColor, fontFamily, updateDocument]);

  // ← LOGIC CHANGE: Only show if tool === 'addText'
  if (activeTool !== 'addText') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
        ✏️ Text Properties
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Font Size
        </label>
        <input
          type="number"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          min="8"
          max="72"
          style={{ width: '100%', padding: '4px', fontSize: '11px' }}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Font Family
        </label>
        <select
          value={fontFamily}
          onChange={(e) =>
            setFontFamily(e.target.value as 'Helvetica' | 'TimesRoman' | 'Courier')
          }
          style={{ width: '100%', padding: '4px', fontSize: '11px' }}
        >
          <option value="Helvetica">Helvetica</option>
          <option value="TimesRoman">Times Roman</option>
          <option value="Courier">Courier</option>
        </select>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Color
        </label>
        <input
          type="color"
          value={fontColor}
          onChange={(e) => setFontColor(e.target.value)}
          style={{ width: '100%', padding: '4px', cursor: 'pointer' }}
        />
      </div>

      <div style={{ fontSize: '10px', color: '#666' }}>
        Click on PDF to add text
      </div>
    </div>
  );
}
