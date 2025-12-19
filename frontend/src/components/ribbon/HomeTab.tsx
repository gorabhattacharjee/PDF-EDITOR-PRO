
"use client";

import React, { useRef, useState } from "react";
import { useUIStore } from "@/stores/useUIStore";
import useDocumentsStore from "@/stores/useDocumentsStore";
import { useAnnotationsStore } from "@/stores/useAnnotationsStore";
import { useTextEditsStore } from "@/stores/useTextEditsStore";
import { useImageEditsStore } from "@/stores/useImageEditsStore";
import { applyAllModificationsToPdf } from "@/adapters/pdf-lib";
import logger from "@/utils/logger";
import { getConvertUrl } from "@/config/api";
import { openPDFandGenerate } from "@/components/openDocument";
import RibbonButton from "./RibbonButton";
import ColorPickerModal from "@/components/ColorPickerModal";
import ImageExportModal from "@/components/ImageExportModal";
import toast from "react-hot-toast";
import {
  FaFolderOpen,
  FaHandPaper,
  FaMousePointer,
  FaHighlighter,
  FaEdit,
  FaPlus,
  FaFileWord,
  FaFileAlt,
  FaFileImage,
  FaSave,
} from "react-icons/fa";

const AVAILABLE_FONTS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Helvetica-Bold", label: "Helvetica Bold" },
  { value: "Helvetica-Oblique", label: "Helvetica Italic" },
  { value: "TimesRoman", label: "Times New Roman" },
  { value: "TimesRoman-Bold", label: "Times New Roman Bold" },
  { value: "TimesRoman-Italic", label: "Times New Roman Italic" },
  { value: "Courier", label: "Courier" },
  { value: "Courier-Bold", label: "Courier Bold" },
  { value: "Courier-Oblique", label: "Courier Italic" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 72];

export default function HomeTab() {
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const highlightColor = useUIStore((s) => s.highlightColor);
  const setHighlightColor = useUIStore((s) => s.setHighlightColor);
  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const highlights = useAnnotationsStore((s) => s.highlights);
  const textEdits = useTextEditsStore((s) => s.edits);
  const imageEdits = useImageEditsStore((s) => s.edits);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImageExportModal, setShowImageExportModal] = useState(false);
  
  // Add Text Modal - local state for reliability
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [addTextValue, setAddTextValue] = useState("");
  const [addTextFont, setAddTextFont] = useState("Helvetica");
  const [addTextSize, setAddTextSize] = useState(14);
  const [addTextColor, setAddTextColor] = useState("#000000");

  const handleSavePDF = async () => {
    console.log('[HomeTab] Save PDF clicked');
    if (!activeDocument?.file) {
      alert('Please load a PDF first');
      return;
    }
    
    setIsSaving(true);
    try {
      const docHighlights = highlights[activeDocument.id] || [];
      const docTextEdits = textEdits[activeDocument.id] || [];
      const docImageEdits = imageEdits[activeDocument.id] || [];
      
      console.log('[HomeTab Save] docId:', activeDocument.id);
      console.log('[HomeTab Save] Highlights:', docHighlights.length, 'Text edits:', docTextEdits.length, 'Image edits:', docImageEdits.length);
      
      let pdfBlob: Blob;
      
      if (docHighlights.length > 0 || docTextEdits.length > 0 || docImageEdits.length > 0) {
        console.log('[HomeTab Save] Applying modifications...');
        const pdfBytes = await activeDocument.file.arrayBuffer();
        const modifiedPdfBytes = await applyAllModificationsToPdf(pdfBytes, docHighlights, docTextEdits, docImageEdits);
        pdfBlob = new Blob([modifiedPdfBytes as BlobPart], { type: 'application/pdf' });
        console.log('[HomeTab Save] Modifications applied, blob size:', pdfBlob.size);
        toast.success(`Saved with ${docHighlights.length} highlights, ${docTextEdits.length} text edits, ${docImageEdits.length} image edits`);
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
      console.log('[HomeTab Save] Download triggered');
    } catch (err) {
      console.error('[HomeTab Save] Error:', err);
      toast.error('Failed to save PDF: ' + err);
    } finally {
      setIsSaving(false);
    }
  };

  const openPDF = () => {
    fileInputRef.current?.click();
  };

  const handleToOffice = () => {
    console.log('[HomeTab] To Office button clicked');
    console.log('[HomeTab] Active document:', activeDocument?.name);
    if (!activeDocument) {
      console.log('[HomeTab] No active document');
      alert('Please load a PDF first');
      return;
    }
    console.log('[HomeTab] Opening To Office modal');
    console.log('[HomeTab] Calling openToOfficeModal()...');
    const store = useUIStore.getState();
    console.log('[HomeTab] Store:', store);
    console.log('[HomeTab] openToOfficeModal function:', store.openToOfficeModal);
    store.openToOfficeModal();
    console.log('[HomeTab] openToOfficeModal called');
  };

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await useDocumentsStore.getState().openDocument(file);
      logger.success(`PDF opened from Home ▸ Open → ${file.name}`);
    } catch (err) {
      logger.error("Failed to open PDF from HomeTab → " + err);
    }
  };

  return (
    <>
      <div className="ribbon-row">
        <RibbonButton
          icon={<FaFolderOpen />}
          label="Open"
          onClick={openPDF}
        />
        <RibbonButton
          icon={<FaSave />}
          label={isSaving ? "Saving..." : "Save PDF"}
          onClick={handleSavePDF}
          labelStyle={{ color: '#16a34a', fontWeight: 'bold' }}
        />
        <RibbonButton
          icon={<FaHandPaper />}
          label="Hand"
          onClick={() => setActiveTool("hand")}
        />
        <RibbonButton
          icon={<FaMousePointer />}
          label="Select"
          onClick={() => setActiveTool("select")}
        />
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <RibbonButton
            icon={<FaHighlighter style={{ color: highlightColor }} />}
            label="Highlight"
            labelStyle={{ color: '#1e3a8a' }}
            onClick={() => {
              console.log('[HomeTab] Highlight button clicked');
              if (!activeDocument) {
                alert('Please load a PDF first');
                return;
              }
              setShowColorPicker(!showColorPicker);
            }}
          />
          {showColorPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                backgroundColor: 'white',
                border: '2px solid #ccc',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                zIndex: 10000,
                minWidth: '200px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', fontSize: '14px' }}>
                Pick Highlight Color
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { name: 'Yellow', color: '#FFFF00' },
                  { name: 'Green', color: '#90EE90' },
                  { name: 'Cyan', color: '#00FFFF' },
                  { name: 'Pink', color: '#FFB6C1' },
                  { name: 'Orange', color: '#FFA500' },
                  { name: 'Red', color: '#FF6B6B' },
                  { name: 'Purple', color: '#DDA0DD' },
                  { name: 'Blue', color: '#87CEEB' },
                ].map((c) => (
                  <button
                    key={c.color}
                    title={c.name}
                    onClick={() => {
                      setHighlightColor(c.color);
                      setActiveTool('highlight');
                      setShowColorPicker(false);
                      logger.info(`Highlight color set to ${c.color}`);
                    }}
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: c.color,
                      border: highlightColor === c.color ? '3px solid #2563eb' : '2px solid #666',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowColorPicker(false)}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <RibbonButton
          icon={<FaEdit />}
          label="Edit All"
          onClick={() => {
            if (!activeDocument) {
              alert('Please load a PDF first');
              return;
            }
            
            if (activeTool === 'editAll') {
              setActiveTool('none');
              logger.info('Edit All mode DISABLED');
            } else {
              setActiveTool('editAll');
              logger.info('Edit All mode ENABLED - All text and objects are now editable');
            }
          }}
        />
        <RibbonButton
          icon={<FaFileImage />}
          label="Edit Image"
          onClick={() => {
            if (!activeDocument) {
              alert('Please load a PDF first');
              return;
            }
            
            if (activeTool === 'editImage') {
              setActiveTool('none');
              logger.info('Edit Image mode DISABLED');
            } else {
              setActiveTool('editImage');
              logger.info('Edit Image mode ENABLED - Draw a box around any image to select it');
            }
          }}
        />
        <RibbonButton
          icon={<FaPlus />}
          label="Add Text"
          onClick={() => {
            console.log('[HomeTab] Add Text clicked - opening local modal');
            setShowAddTextModal(true);
          }}
        />
        <RibbonButton
          icon={<FaFileAlt />}
          label="OCR"
          onClick={async () => {
            if (!activeDocument) {
              alert('Please load a PDF first');
              return;
            }
            try {
              alert('OCR Processing: Extracting text from current page... Please wait 10-30 seconds.');
              logger.info('OCR starting - loading Tesseract.js');
              
              // Wait for canvas to be available - look for canvas in the canvas-panel
              let canvasElement: HTMLCanvasElement | null = null;
              const canvasPanel = document.querySelector('.canvas-panel');
              if (canvasPanel) {
                for (let i = 0; i < 50; i++) {
                  const canvases = canvasPanel.querySelectorAll('canvas');
                  if (canvases.length > 0) {
                    const mainCanvas = canvases[0] as HTMLCanvasElement;
                    if (mainCanvas && mainCanvas.width > 0) {
                      canvasElement = mainCanvas;
                      break;
                    }
                  }
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
              
              if (!canvasElement || canvasElement.width === 0) {
                alert('ERROR: PDF canvas not rendered.\n\n✗ Make sure:\n1. PDF is fully loaded\n2. Canvas is visible on screen\n3. Wait 2-3 seconds after loading PDF\n4. Try again');
                return;
              }
              
              // Load Tesseract.js from CDN
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/tesseract.min.js';
              document.head.appendChild(script);
              
              script.onload = async () => {
                try {
                  const Tesseract = (window as any).Tesseract;
                  const worker = await Tesseract.createWorker();
                  
                  logger.info('OCR: Processing PDF canvas');
                  
                  // Perform OCR on the rendered PDF canvas
                  const imageData = canvasElement!.toDataURL('image/png');
                  const result = await worker.recognize(imageData, 'eng');
                  const extractedText = result.data.text;
                  
                  await worker.terminate();
                  
                  // Download text file
                  const element = document.createElement('a');
                  const file = new Blob([extractedText], {type: 'text/plain'});
                  element.href = URL.createObjectURL(file);
                  element.download = `ocr_text_${new Date().getTime()}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  
                  logger.success('OCR completed and text file downloaded');
                  alert('✓ OCR completed!\n\nText file downloaded successfully.');
                } catch (err) {
                  logger.error('OCR failed: ' + err);
                  alert('✗ OCR Error: ' + err);
                }
              };
            } catch (err) {
              logger.error('OCR initialization failed: ' + err);
              alert('✗ OCR initialization failed: ' + err);
            }
          }}
        />
        <RibbonButton
          icon={<FaFileImage />}
          label="To Image"
          onClick={() => {
            if (!activeDocument) {
              alert('Please load a PDF first');
              return;
            }
            setShowImageExportModal(true);
          }}
        />
        <RibbonButton
          icon={<FaFileWord />}
          label="To Office"
          onClick={() => {
            console.log('[RibbonButton] To Office button clicked directly');
            handleToOffice();
          }}
        />
        <RibbonButton
          icon={<FaFileAlt />}
          label="To Text"
          onClick={async () => {
            if (!activeDocument) {
              alert('Please load a PDF first');
              return;
            }
            try {
              logger.info('Text extraction requested');
              alert('PDF Text Extraction\n\nExtracting text from PDF... This may take a moment.');
              
              // Send PDF to backend for text extraction
              const formData = new FormData();
              formData.append('file', activeDocument.file);
              formData.append('format', 'text');

              const response = await fetch(getConvertUrl(), {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Text extraction failed: ${response.statusText}`);
              }

              const blob = await response.blob();
              if (blob.size === 0) {
                throw new Error('Backend returned empty file');
              }
              
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${activeDocument.name.replace('.pdf', '')}_extracted.txt`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);

              logger.success('Text extraction completed and file downloaded');
              alert('Text extraction completed!\n\nFile downloaded successfully.');
            } catch (err) {
              logger.error('Text extraction failed: ' + err);
              alert(`Text extraction failed: ${err}`);
            }
          }}
        />
      </div>

      {/* hidden file input for Open */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept="application/pdf"
        onChange={handleInput}
      />

      {/* Add Text Modal - Inline for reliability */}
      {showAddTextModal && (
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
          onClick={() => setShowAddTextModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              minWidth: "400px",
              maxWidth: "500px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Add Text to PDF</h2>
              <button
                onClick={() => setShowAddTextModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Text Content</label>
              <textarea
                value={addTextValue}
                onChange={(e) => setAddTextValue(e.target.value)}
                placeholder="Enter text to add..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Font Family</label>
                <select
                  value={addTextFont}
                  onChange={(e) => setAddTextFont(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Font Size</label>
                <select
                  value={addTextSize}
                  onChange={(e) => setAddTextSize(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  {FONT_SIZES.map((size) => (
                    <option key={size} value={size}>{size}pt</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Font Color</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="color"
                  value={addTextColor}
                  onChange={(e) => setAddTextColor(e.target.value)}
                  style={{ width: "50px", height: "36px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={addTextColor}
                  onChange={(e) => setAddTextColor(e.target.value)}
                  style={{ flex: 1, padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" }}
                />
              </div>
            </div>

            <div style={{ padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "6px", marginBottom: "20px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#333" }}>Preview:</p>
              <p style={{ margin: "8px 0 0 0", fontFamily: addTextFont.split("-")[0], fontSize: `${Math.min(addTextSize, 24)}px`, color: addTextColor }}>
                {addTextValue || "Sample text preview"}
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowAddTextModal(false);
                  setAddTextValue("");
                }}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!addTextValue.trim()) {
                    alert("Please enter some text");
                    return;
                  }
                  if (!activeDocument) {
                    alert("Please open a PDF first, then click 'Add Text' again.");
                    setShowAddTextModal(false);
                    return;
                  }
                  toast.success(`Text configured: "${addTextValue.trim()}" - Click on PDF to place`);
                  setActiveTool("addText");
                  setShowAddTextModal(false);
                  setAddTextValue("");
                }}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Click to Place Text
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDocument && (
        <ImageExportModal
          isOpen={showImageExportModal}
          onClose={() => setShowImageExportModal(false)}
          documentName={activeDocument.name}
          currentPage={activeDocument.currentPage || 1}
          totalPages={activeDocument.numPages || 1}
          pdfFile={activeDocument.file}
        />
      )}
    </>
  );
}
