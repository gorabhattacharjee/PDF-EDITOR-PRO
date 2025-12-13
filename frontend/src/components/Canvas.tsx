"use client";

import React, { useEffect, useRef, useState } from "react";
import useDocumentsStore from "@/stores/useDocumentsStore";
import useUIStore from "@/stores/useUIStore";
import { useAnnotationsStore, type Highlight, type StickyNote as StickyNoteType } from "@/stores/useAnnotationsStore";
import StickyNote from "@/components/StickyNote";
import DrawingCanvas from "@/components/DrawingCanvas";
import DrawingDisplayLayer from "@/components/DrawingDisplayLayer";
import { useTextEditsStore, type TextEdit } from "@/stores/useTextEditsStore";
import { useImageEditsStore } from "@/stores/useImageEditsStore";
import WelcomeBox from "@/components/WelcomeBox";
import InlineTextEditor from "@/components/InlineTextEditor";
import { ImageEditOverlay } from "@/components/ImageEditOverlay";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
import { usePDFRenderer } from "@/hooks/usePDFRenderer";
import { extractImagesFromPage, ExtractedImage } from "@/utils/extractImages";
import toast from "react-hot-toast";

interface TextItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  pdfFontSize: number;
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeDocument = useDocumentsStore((s) => s.activeDocument);
  const activePage = useUIStore((s) => s.activePage);
  const zoom = useUIStore((s) => s.zoom);
  const activeTool = useUIStore((s) => s.activeTool);
  const highlightColor = useUIStore((s) => s.highlightColor);
  const addHighlights = useAnnotationsStore((s) => s.addHighlights);
  const globalHighlights = useAnnotationsStore((s) => s.highlights);
  const stickyNotes = useAnnotationsStore((s) => s.stickyNotes);
  const addStickyNote = useAnnotationsStore((s) => s.addStickyNote);
  const penStrokes = useAnnotationsStore((s) => s.penStrokes);
  const shapes = useAnnotationsStore((s) => s.shapes);
  const drawingColor = useUIStore((s) => s.drawingColor);
  const drawingStrokeWidth = useUIStore((s) => s.drawingStrokeWidth);
  const selectedShapeType = useUIStore((s) => s.selectedShapeType);
  const addTextEdit = useTextEditsStore((s) => s.addEdit);
  const textEdits = useTextEditsStore((s) => s.edits);
  const imageEdits = useImageEditsStore((s) => s.edits);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editingTextItem, setEditingTextItem] = useState<TextItem | null>(null);
  const [isDrawingImageBox, setIsDrawingImageBox] = useState(false);
  const [imageBoxStart, setImageBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [imageBoxEnd, setImageBoxEnd] = useState<{ x: number; y: number } | null>(null);
  const addImageEdit = useImageEditsStore((s) => s.addEdit);
  
  const pendingAddTextPosition = useUIStore((s) => s.pendingAddTextPosition);
  const setPendingAddTextPosition = useUIStore((s) => s.setPendingAddTextPosition);
  const isAddTextModalOpen = useUIStore((s) => s.isAddTextModalOpen);
  const openAddTextModal = useUIStore((s) => s.openAddTextModal);
  const closeAddTextModal = useUIStore((s) => s.closeAddTextModal);
  const clearPendingAddText = useUIStore((s) => s.clearPendingAddText);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  
  // Add Text modal local state
  const [addTextValue, setAddTextValue] = useState("");
  const [addTextFont, setAddTextFont] = useState("Helvetica");
  const [addTextSize, setAddTextSize] = useState(14);
  const [addTextColor, setAddTextColor] = useState("#000000");

  const docId = activeDocument?.id || '';
  const highlights = globalHighlights[docId] || [];

  const anyDoc: any = activeDocument;
  const [pdfBytes, setPdfBytes] = React.useState<ArrayBuffer | null>(null);

  // Watch for document changes (version increments on edits like rotate/crop/add image)
  useEffect(() => {
    console.log("[Canvas] Document effect triggered, version:", anyDoc?.version, "id:", anyDoc?.id);
    
    // Check if store has VALID pdfBytes (size > 0, used for edits)
    if (anyDoc?.pdfBytes && anyDoc.pdfBytes.byteLength > 0) {
      console.log("[Canvas] Using pdfBytes from store, size:", anyDoc.pdfBytes.byteLength);
      setPdfBytes(anyDoc.pdfBytes);
      return;
    }
    
    // Fallback to reading from file for initial load or when store pdfBytes is empty/detached
    if (anyDoc?.file) {
      console.log("[Canvas] Reading pdfBytes from file:", anyDoc.file.name);
      anyDoc.file.arrayBuffer().then((buffer: ArrayBuffer) => {
        console.log("[Canvas] Loaded pdfBytes from file, size:", buffer.byteLength);
        setPdfBytes(buffer);
      }).catch((err: Error) => {
        console.error("Failed to read PDF file:", err);
      });
    }
  }, [anyDoc?.id, anyDoc?.version]);

  const { pdf, error } = usePDFRenderer(pdfBytes);
  const pageNum = (activePage ?? 0) + 1;
  
  const { handleMouseDown, handleMouseMove, handleMouseUp } =
    useCanvasInteraction(canvasRef, overlayRef);

  // Render PDF and extract text layer
  useEffect(() => {
    const render = async () => {
      if (!pdf) {
        if (error) console.error("PDF Error:", error);
        return;
      }

      const pageNum = (activePage ?? 0) + 1;

      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });

        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (!canvas || !overlay) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;
        setCanvasSize({ width: viewport.width, height: viewport.height });

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        // Extract text content for text layer
        const textContent = await page.getTextContent();
        const items: TextItem[] = [];

        for (let idx = 0; idx < textContent.items.length; idx++) {
          const textItem = textContent.items[idx] as any;
          if (!textItem.str || textItem.str.trim() === '') continue;

          const tx = textItem.transform;
          const pdfFontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
          const pdfX = tx[4];
          const pdfY = tx[5];
          const pdfWidth = textItem.width || (textItem.str.length * pdfFontSize * 0.6);
          const pdfHeight = pdfFontSize * 1.2;
          
          const screenX = pdfX * zoom;
          const screenY = viewport.height - (pdfY * zoom) - (pdfFontSize * zoom);
          const width = pdfWidth * zoom;
          const height = pdfHeight * zoom;

          items.push({
            id: `text-${pageNum}-${idx}`,
            str: textItem.str,
            x: screenX,
            y: screenY,
            width: width,
            height: height,
            fontSize: pdfFontSize * zoom,
            fontFamily: textItem.fontName || 'sans-serif',
            pdfX: pdfX,
            pdfY: pdfY,
            pdfWidth: pdfWidth,
            pdfHeight: pdfHeight,
            pdfFontSize: pdfFontSize,
          });
        }

        setTextItems(items);
        console.log("[TextLayer] Created", items.length, "text items");
        
        // Extract images from PDF page
        try {
          const images = await extractImagesFromPage(pdf, pageNum, zoom);
          setExtractedImages(images);
          console.log("[ImageLayer] Extracted", images.length, "images");
        } catch (imgErr) {
          console.warn("Image extraction failed:", imgErr);
          setExtractedImages([]);
        }
      } catch (err) {
        console.error("Render error:", err);
      }
    };

    render();
  }, [pdf, activePage, error, zoom]);

  // Handle canvas mouse events for non-select tools
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      if (overlayRef.current) {
        overlayRef.current.style.cursor = 'grabbing';
      }
      return;
    }
    handleMouseDown(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand' && isPanning && lastPanPoint) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    handleMouseMove(e);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand' && isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      if (overlayRef.current) {
        overlayRef.current.style.cursor = 'grab';
      }
      return;
    }
    handleMouseUp();
  };

  const handleCanvasMouseLeave = () => {
    if (activeTool === 'hand' && isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      if (overlayRef.current) {
        overlayRef.current.style.cursor = 'grab';
      }
      return;
    }
    handleMouseUp();
  };

  // Handle text selection for Select tool
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      console.log('[TextLayer] Selected:', selectedText);
    }
  };

  // Handle markup creation (highlight, underline, strikeout) when text is selected
  const handleMarkupSelection = (markupType: 'highlight' | 'underline' | 'strikeout') => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) return;
    if (!docId) return;

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    
    if (rects.length === 0) return;

    const textLayerElement = textLayerRef.current;
    if (!textLayerElement) return;

    const layerRect = textLayerElement.getBoundingClientRect();

    // Create annotations for each line of selected text
    const newHighlights: Highlight[] = [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      newHighlights.push({
        id: `${markupType}-${Date.now()}-${i}`,
        x: rect.left - layerRect.left,
        y: rect.top - layerRect.top,
        width: rect.width,
        height: rect.height,
        color: highlightColor,
        text: i === 0 ? selectedText : '',
        page: activePage,
        creationZoom: zoom,
        type: markupType,
      });
    }

    addHighlights(docId, newHighlights);
    const actionName = markupType === 'highlight' ? 'Highlighted' : markupType === 'underline' ? 'Underlined' : 'Strikeout applied';
    toast.success(`${actionName}: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`);
    
    // Clear selection
    selection.removeAllRanges();
  };
  
  const handleHighlightSelection = () => handleMarkupSelection('highlight');
  const handleUnderlineSelection = () => handleMarkupSelection('underline');
  const handleStrikeoutSelection = () => handleMarkupSelection('strikeout');

  // Copy selected text with Ctrl+C
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (activeTool === 'select' || activeTool === 'highlight') {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          e.preventDefault();
          const text = selection.toString();
          navigator.clipboard.writeText(text).then(() => {
            toast.success(`Copied: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
          });
        }
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [activeTool]);

  // Update overlay cursor
  useEffect(() => {
    if (!overlayRef.current) return;
    if (activeTool === 'hand') {
      overlayRef.current.style.cursor = isPanning ? 'grabbing' : 'grab';
    } else {
      overlayRef.current.style.cursor = 'crosshair';
    }
  }, [activeTool, isPanning]);

  // Escape key handler for Add Text mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool === 'addText') {
        clearPendingAddText();
        toast('Add Text mode cancelled');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, clearPendingAddText]);
  
  if (!activeDocument) {
    return (
     <div className="canvas-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflow: 'auto' }}>
        <WelcomeBox />
      </div>
    );
  }

  const isSelectMode = activeTool === 'select';
  const isHighlightMode = activeTool === 'highlight';
  const isUnderlineMode = activeTool === 'underline';
  const isStrikeoutMode = activeTool === 'strikeout';
  const isEditAllMode = activeTool === 'editAll';
  const isEditTextMode = activeTool === 'editText'; // Just text editing
  const isEditImageOnlyMode = activeTool === 'editImage'; // Just image editing
  const isEditImageMode = isEditImageOnlyMode || isEditAllMode; // For showing image layer
  const isTextEditMode = isEditTextMode || isEditAllMode; // For showing text editing (includes editAll)
  const isAddTextMode = activeTool === 'addText';
  const isStickyNoteMode = activeTool === 'sticky-note';
  const isPenMode = activeTool === 'pen';
  const isShapesMode = activeTool === 'shapes';
  const isMarkupMode = isHighlightMode || isUnderlineMode || isStrikeoutMode;
  const isDrawingMode = isPenMode || isShapesMode;
  // Show text layer for selection, markup, OR editing modes (including editAll)
  const showTextLayer = isSelectMode || isMarkupMode || isTextEditMode || isEditAllMode;
  
  // Debug log for Object Select mode
  if (isEditAllMode) {
    console.log('[Canvas] Object Select mode active - isEditAllMode:', isEditAllMode, 'isTextEditMode:', isTextEditMode);
  }
  
  const docStickyNotes = stickyNotes[docId] || [];
  const docPenStrokes = penStrokes[docId] || [];
  const docShapes = shapes[docId] || [];
  
  const handleStickyNoteClick = (e: React.MouseEvent) => {
    if (!isStickyNoteMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    addStickyNote(docId, {
      id: `sticky-${Date.now()}`,
      x,
      y,
      page: activePage,
      text: '',
      color: '#FFF8A6',
      creationZoom: zoom,
    });
    toast.success('Sticky note added! Click to edit.');
  };
  
  const handleAddTextClick = (e: React.MouseEvent) => {
    console.log('[Canvas] handleAddTextClick called - capturing position');
    console.log('[Canvas] isAddTextMode:', isAddTextMode);
    
    if (!isAddTextMode) {
      console.log('[Canvas] Early return - not in addText mode');
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('[Canvas] Click position - x:', x, 'y:', y);
    
    const pdfX = x / zoom;
    const pdfY = y / zoom;
    
    console.log('[Canvas] PDF position - pdfX:', pdfX, 'pdfY:', pdfY);
    
    // Store the position and open the modal
    setPendingAddTextPosition({
      page: activePage,
      x: pdfX,
      y: pdfY,
      zoom: zoom,
    });
    openAddTextModal();
  };
  
  const handleAddTextConfirm = () => {
    if (!addTextValue.trim()) {
      alert("Please enter some text");
      return;
    }
    if (!pendingAddTextPosition) {
      alert("No position selected");
      return;
    }
    
    const newTextId = `new-text-${Date.now()}`;
    
    addTextEdit(docId, {
      id: newTextId,
      page: pendingAddTextPosition.page,
      x: pendingAddTextPosition.x,
      y: pendingAddTextPosition.y,
      width: addTextValue.length * (addTextSize * 0.6),
      height: addTextSize + 4,
      originalText: '',
      editedText: addTextValue.trim(),
      fontSize: addTextSize,
      fontFamily: addTextFont,
      fontColor: addTextColor,
      creationZoom: pendingAddTextPosition.zoom,
    });
    
    toast.success('Text added!');
    
    // Reset state
    setAddTextValue("");
    setAddTextFont("Helvetica");
    setAddTextSize(14);
    setAddTextColor("#000000");
    clearPendingAddText();
  };
  
  const handleAddTextCancel = () => {
    setAddTextValue("");
    setAddTextFont("Helvetica");
    setAddTextSize(14);
    setAddTextColor("#000000");
    clearPendingAddText();
  };

  const handleImageBoxMouseDown = (e: React.MouseEvent) => {
    if (!isEditImageMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawingImageBox(true);
    setImageBoxStart({ x, y });
    setImageBoxEnd({ x, y });
  };

  const handleImageBoxMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingImageBox || !imageBoxStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setImageBoxEnd({ x, y });
  };

  const handleImageBoxMouseUp = () => {
    if (!isDrawingImageBox || !imageBoxStart || !imageBoxEnd) {
      setIsDrawingImageBox(false);
      return;
    }
    
    const x = Math.min(imageBoxStart.x, imageBoxEnd.x);
    const y = Math.min(imageBoxStart.y, imageBoxEnd.y);
    const width = Math.abs(imageBoxEnd.x - imageBoxStart.x);
    const height = Math.abs(imageBoxEnd.y - imageBoxStart.y);
    
    if (width > 20 && height > 20) {
      const imageId = `manual-img-${pageNum}-${Date.now()}`;
      addImageEdit(docId, {
        id: imageId,
        page: pageNum,
        x,
        y,
        width,
        height,
        originalX: x,
        originalY: y,
        originalWidth: width,
        originalHeight: height,
        deleted: false,
        imageData: '',
      });
      toast.success('Image region selected! You can now move, resize, or delete it.');
    }
    
    setIsDrawingImageBox(false);
    setImageBoxStart(null);
    setImageBoxEnd(null);
  };

  return (
    <div className="canvas-panel bg-gray-50 p-4" ref={containerRef} style={{ overflow: isPanning ? 'hidden' : 'auto' }}>
      <div style={{ 
        position: "relative", 
        width: "fit-content", 
        height: "fit-content", 
        margin: "0 auto", 
        minHeight: '200px', 
        transform: activeTool === 'hand' ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none', 
        transition: isPanning ? 'none' : 'transform 0.1s' 
      }}>
        {/* Main PDF canvas */}
        <canvas
          ref={canvasRef}
          className="shadow-lg rounded bg-white"
          style={{ display: "block", userSelect: "none" }}
        />

        {/* Text Edit Mask Layer - covers original PDF text with white rectangles for edits */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: 'none',
            zIndex: 25,
          }}
        >
          {(textEdits[docId] || [])
            .filter(edit => edit.page === activePage)
            .map((edit) => {
              const textItem = textItems.find(t => t.id === edit.id);
              if (!textItem) return null;
              const scale = zoom / (edit.creationZoom || 1);
              return (
                <div
                  key={`mask-${edit.id}`}
                  style={{
                    position: 'absolute',
                    left: `${textItem.x - 2}px`,
                    top: `${textItem.y - 2}px`,
                    width: `${textItem.width + 4}px`,
                    height: `${textItem.height + 4}px`,
                    backgroundColor: '#fff',
                  }}
                />
              );
            })}
          {editingTextItem && (
            <div
              style={{
                position: 'absolute',
                left: `${editingTextItem.x - 4}px`,
                top: `${editingTextItem.y - 4}px`,
                width: `${editingTextItem.width + 200}px`,
                height: `${editingTextItem.height + 8}px`,
                backgroundColor: '#fff',
              }}
            />
          )}
        </div>

        {/* Edited Text Display Layer - shows edited text on top of masks */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: isEditAllMode ? 'auto' : 'none',
            zIndex: 30,
          }}
        >
          {(textEdits[docId] || [])
            .filter(edit => edit.page === activePage)
            .map((edit) => {
              const textItem = textItems.find(t => t.id === edit.id);
              // For edited existing text
              if (textItem) {
                return (
                  <span
                    key={`display-${edit.id}`}
                    style={{
                      position: 'absolute',
                      left: `${textItem.x}px`,
                      top: `${textItem.y}px`,
                      fontSize: `${textItem.fontSize}px`,
                      fontFamily: textItem.fontFamily,
                      lineHeight: 1,
                      whiteSpace: 'pre',
                      color: '#000',
                      backgroundColor: 'rgba(255, 255, 200, 0.3)',
                      padding: '1px 2px',
                      borderRadius: '2px',
                      cursor: isEditAllMode ? 'pointer' : 'default',
                    }}
                    onClick={(e) => {
                      if (isEditAllMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingTextItem(textItem);
                      }
                    }}
                  >
                    {edit.editedText}
                  </span>
                );
              }
              // For NEW added text (no matching textItem)
              const scale = zoom / (edit.creationZoom || 1);
              return (
                <span
                  key={`new-text-${edit.id}`}
                  style={{
                    position: 'absolute',
                    left: `${edit.x * scale}px`,
                    top: `${edit.y * scale}px`,
                    fontSize: `${(edit.fontSize || 14) * scale}px`,
                    fontFamily: edit.fontFamily || 'Helvetica, Arial, sans-serif',
                    lineHeight: 1,
                    whiteSpace: 'pre',
                    color: edit.fontColor || '#000',
                    padding: '1px 2px',
                    borderRadius: '2px',
                  }}
                >
                  {edit.editedText}
                </span>
              );
            })}
        </div>

        {/* Highlight layer - renders all highlights */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          {highlights
            .filter(h => h.page === activePage)
            .map((h, idx) => {
              const scale = zoom / (h.creationZoom || 1);
              const markupType = h.type || 'highlight';
              
              if (markupType === 'underline') {
                return (
                  <div
                    key={h.id || idx}
                    style={{
                      position: 'absolute',
                      left: `${h.x * scale}px`,
                      top: `${(h.y + h.height - 2) * scale}px`,
                      width: `${h.width * scale}px`,
                      height: `${3 * scale}px`,
                      backgroundColor: h.color,
                      opacity: 0.8,
                    }}
                  />
                );
              }
              
              if (markupType === 'strikeout') {
                return (
                  <div
                    key={h.id || idx}
                    style={{
                      position: 'absolute',
                      left: `${h.x * scale}px`,
                      top: `${(h.y + h.height / 2 - 1) * scale}px`,
                      width: `${h.width * scale}px`,
                      height: `${2 * scale}px`,
                      backgroundColor: h.color,
                      opacity: 0.8,
                    }}
                  />
                );
              }
              
              return (
                <div
                  key={h.id || idx}
                  style={{
                    position: 'absolute',
                    left: `${h.x * scale}px`,
                    top: `${h.y * scale}px`,
                    width: `${h.width * scale}px`,
                    height: `${h.height * scale}px`,
                    backgroundColor: h.color,
                    opacity: 0.4,
                    mixBlendMode: 'multiply',
                    borderRadius: '2px',
                  }}
                />
              );
            })}
        </div>

        {/* Image editing layer - displays editable image overlays */}
        {(isEditAllMode || isEditImageMode) && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              pointerEvents: 'none', // Container doesn't capture events
              zIndex: 110, // Above text layer (100) so images are on top
            }}
            onMouseDown={isEditImageOnlyMode ? handleImageBoxMouseDown : undefined}
            onMouseMove={isEditImageOnlyMode ? handleImageBoxMouseMove : undefined}
            onMouseUp={isEditImageOnlyMode ? handleImageBoxMouseUp : undefined}
          >
            {extractedImages
              .filter(img => img.page === pageNum)
              .map((img) => {
                const docImageEdits = imageEdits[docId] || [];
                const isDeleted = docImageEdits.find(e => e.id === img.id)?.deleted;
                if (isDeleted) return null;
                return (
                  <ImageEditOverlay
                    key={img.id}
                    image={img}
                    docId={docId}
                    isEditMode={isEditAllMode || isEditImageMode}
                    zoom={zoom}
                    canvasRef={canvasRef}
                  />
                );
              })}
            {(imageEdits[docId] || [])
              .filter(edit => edit.page === pageNum && !edit.deleted)
              .map((edit) => (
                <ImageEditOverlay
                  key={edit.id}
                  image={{
                    id: edit.id,
                    page: edit.page,
                    x: edit.x,
                    y: edit.y,
                    width: edit.width,
                    height: edit.height,
                    imageData: edit.imageData || '',
                  }}
                  docId={docId}
                  isEditMode={isEditAllMode || isEditImageMode}
                  zoom={zoom}
                  canvasRef={canvasRef}
                />
              ))}
            {isDrawingImageBox && imageBoxStart && imageBoxEnd && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(imageBoxStart.x, imageBoxEnd.x),
                  top: Math.min(imageBoxStart.y, imageBoxEnd.y),
                  width: Math.abs(imageBoxEnd.x - imageBoxStart.x),
                  height: Math.abs(imageBoxEnd.y - imageBoxStart.y),
                  border: '2px dashed #3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        )}
        
        {/* Drawing Display Layer - shows saved drawings when not in drawing mode */}
        {!isDrawingMode && canvasSize.width > 0 && (
          <DrawingDisplayLayer
            penStrokes={docPenStrokes}
            shapes={docShapes}
            page={activePage}
            width={canvasSize.width}
            height={canvasSize.height}
            zoom={zoom}
          />
        )}
        
        {/* Drawing Canvas for Pen and Shapes - interactive mode */}
        {isDrawingMode && canvasSize.width > 0 && (
          <DrawingCanvas
            docId={docId}
            page={activePage}
            width={canvasSize.width}
            height={canvasSize.height}
            zoom={zoom}
            activeTool={isPenMode ? 'pen' : 'shapes'}
            strokeColor={drawingColor}
            strokeWidth={drawingStrokeWidth}
            selectedShape={selectedShapeType}
          />
        )}
        
        {/* Sticky Notes Layer */}
        {docStickyNotes
          .filter(note => note.page === activePage)
          .map(note => (
            <StickyNote
              key={note.id}
              note={note}
              docId={docId}
              zoom={zoom}
            />
          ))}
        
        {/* Sticky Note Click Layer */}
        {isStickyNoteMode && canvasSize.width > 0 && canvasSize.height > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              cursor: 'crosshair',
              zIndex: 100,
            }}
            onClick={handleStickyNoteClick}
          />
        )}
        
        {/* Text layer for native text selection (like Adobe Acrobat / MS Word) */}
        {showTextLayer && (
          <div
            ref={textLayerRef}
            className="text-layer"
            onMouseUp={
              isHighlightMode ? handleHighlightSelection 
              : isUnderlineMode ? handleUnderlineSelection 
              : isStrikeoutMode ? handleStrikeoutSelection 
              : (isTextEditMode ? undefined : handleTextSelection)
            }
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              overflow: 'hidden',
              zIndex: isEditImageOnlyMode ? 50 : 100,
              cursor: isTextEditMode ? 'pointer' : (isMarkupMode ? 'text' : 'text'),
              pointerEvents: isEditImageOnlyMode ? 'none' : 'auto',
            }}
          >
            {textItems.map((item) => {
              const docTextEdits = textEdits[docId] || [];
              const existingEdit = docTextEdits.find(e => e.id === item.id);
              const displayText = existingEdit ? existingEdit.editedText : item.str;
              const isEdited = !!existingEdit;
              const isCurrentlyEditing = editingTextItem?.id === item.id;
              
              if (isCurrentlyEditing && isTextEditMode) {
                console.log('[Canvas] Rendering InlineTextEditor for item:', item.id, 'text:', displayText);
                return (
                  <InlineTextEditor
                    key={`editor-${item.id}`}
                    initialText={displayText}
                    x={item.x}
                    y={item.y}
                    fontSize={item.fontSize}
                    fontFamily={item.fontFamily}
                    onSave={(newText) => {
                      if (newText !== item.str) {
                        addTextEdit(docId, {
                          id: item.id,
                          page: activePage,
                          originalText: item.str,
                          editedText: newText,
                          x: item.pdfX,
                          y: item.pdfY,
                          width: item.pdfWidth,
                          height: item.pdfHeight,
                          fontSize: item.pdfFontSize,
                          fontFamily: item.fontFamily,
                          creationZoom: zoom,
                        });
                        toast.success('Text updated');
                      }
                      setEditingTextItem(null);
                    }}
                    onCancel={() => setEditingTextItem(null)}
                  />
                );
              }
              
              return (
                <span
                  key={item.id}
                  data-text-id={item.id}
                  className={isTextEditMode ? 'edit-text-item' : ''}
                  style={{
                    position: 'absolute',
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    fontSize: `${item.fontSize}px`,
                    fontFamily: item.fontFamily,
                    lineHeight: 1,
                    whiteSpace: 'pre',
                    color: isTextEditMode ? 'rgba(0, 0, 0, 0.01)' : 'transparent',
                    backgroundColor: isTextEditMode ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    userSelect: isTextEditMode ? 'none' : 'text',
                    cursor: isTextEditMode ? 'pointer' : 'text',
                    pointerEvents: isEdited ? 'none' : 'auto',
                    borderRadius: isTextEditMode ? '2px' : '0',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (isTextEditMode && !isEdited) {
                      (e.target as HTMLElement).style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isTextEditMode && !isEdited) {
                      (e.target as HTMLElement).style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                    }
                  }}
                  onClick={(e) => {
                    if (isTextEditMode && !isEdited) {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('[TextEdit] Clicked text item:', item.str);
                      setEditingTextItem(item);
                    }
                  }}
                >
                  {displayText}
                </span>
              );
            })}
            {/* Mode hint - hidden when isEditAllMode since we have a dedicated hint for that */}
            {!isEditAllMode && (
              <div
                style={{
                  position: 'fixed',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: isEditTextMode ? '#6366f1' : (isHighlightMode ? highlightColor : 'rgba(37, 99, 235, 0.95)'),
                  color: isEditTextMode ? 'white' : (isHighlightMode ? '#000' : 'white'),
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  zIndex: 1000,
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  border: isHighlightMode ? '2px solid #333' : 'none',
                }}
              >
                {isEditTextMode
                  ? 'Edit Text Mode: Click on any text to edit it'
                  : (isHighlightMode 
                    ? 'Select text to highlight, then release to apply'
                    : 'Click and drag to select text, then Ctrl+C to copy')}
              </div>
            )}
          </div>
        )}
        
        {/* Edit Image mode hint - only for pure image mode, not Edit All */}
        {isEditImageOnlyMode && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#059669',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              zIndex: 1000,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            Edit Image Mode: Click on any image (dashed border) to select, move, resize, or delete
          </div>
        )}
        
        {/* Object Select (Edit All) mode hint - standalone to ensure visibility */}
        {isEditAllMode && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              zIndex: 2000,
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
          >
            Object Select Mode: Click on text to edit it, or click on images to select/move/resize/delete
          </div>
        )}
        
        {/* Add Text mode overlay - click to place text */}
        {isAddTextMode && !isAddTextModalOpen && (
          <div
            onClick={handleAddTextClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasSize.width || '100%',
              height: canvasSize.height || '100%',
              cursor: 'text',
              zIndex: 9999,
              backgroundColor: 'rgba(139, 92, 246, 0.05)',
            }}
          />
        )}
        
        {/* Add Text mode hint */}
        {isAddTextMode && !isAddTextModalOpen && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              zIndex: 1000,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            Click anywhere on the PDF to place text (Esc to cancel)
          </div>
        )}
        
        {/* Overlay canvas for drawing/annotations (hidden in text selection modes) */}
        {!showTextLayer && !isEditImageMode && !isAddTextMode && (
          <canvas
            ref={overlayRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: 'auto',
              cursor: activeTool === 'hand' ? 'grab' : 'crosshair',
              display: "block",
              userSelect: "none",
              zIndex: 100,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
          />
        )}
      </div>
      
      {/* Add Text Modal - shown after clicking on PDF */}
      {isAddTextModalOpen && pendingAddTextPosition && (
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
            zIndex: 99999,
          }}
          onClick={handleAddTextCancel}
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
                onClick={handleAddTextCancel}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}
              >
                x
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "14px" }}>Text Content</label>
              <textarea
                value={addTextValue}
                onChange={(e) => setAddTextValue(e.target.value)}
                placeholder="Enter text to add..."
                autoFocus
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
                  <option value="Helvetica">Helvetica</option>
                  <option value="Helvetica-Bold">Helvetica Bold</option>
                  <option value="Helvetica-Oblique">Helvetica Italic</option>
                  <option value="TimesRoman">Times New Roman</option>
                  <option value="TimesRoman-Bold">Times New Roman Bold</option>
                  <option value="TimesRoman-Italic">Times New Roman Italic</option>
                  <option value="Courier">Courier</option>
                  <option value="Courier-Bold">Courier Bold</option>
                  <option value="Courier-Oblique">Courier Italic</option>
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
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 72].map((size) => (
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
                onClick={handleAddTextCancel}
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
                onClick={handleAddTextConfirm}
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
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
