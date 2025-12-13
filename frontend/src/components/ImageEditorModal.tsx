import React, { useState, useRef, useEffect } from 'react';
import { X, Pencil, Eraser, Square, Circle, Type, Undo, Download, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageRect: { x: number; y: number; width: number; height: number };
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onSave: (imageData: string) => void;
}

type Tool = 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'text';

export default function ImageEditorModal({ isOpen, onClose, imageRect, canvasRef, onSave }: ImageEditorModalProps) {
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !editorCanvasRef.current) return;

    const sourceCanvas = canvasRef.current;
    const editorCanvas = editorCanvasRef.current;
    const ctx = editorCanvas.getContext('2d');
    if (!ctx) return;

    const scale = window.devicePixelRatio || 1;
    const x = imageRect.x * scale;
    const y = imageRect.y * scale;
    const width = imageRect.width * scale;
    const height = imageRect.height * scale;

    editorCanvas.width = Math.max(width, 200);
    editorCanvas.height = Math.max(height, 200);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);

    try {
      ctx.drawImage(
        sourceCanvas,
        x, y, width, height,
        0, 0, editorCanvas.width, editorCanvas.height
      );
    } catch (e) {
      console.error('Failed to extract image region:', e);
    }

    const initialData = ctx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    setHistory([initialData]);
    setHistoryIndex(0);
  }, [isOpen, imageRect, canvasRef]);

  const saveToHistory = () => {
    const canvas = editorCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = editorCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const reset = () => {
    if (history.length === 0) return;
    const canvas = editorCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.putImageData(history[0], 0, 0);
    setHistory([history[0]]);
    setHistoryIndex(0);
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setLastPos(pos);

    if (tool === 'pencil' || tool === 'eraser') {
      const ctx = editorCanvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.fill();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return;
    const pos = getPos(e);
    const ctx = editorCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    setLastPos(pos);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
    setLastPos(null);
  };

  const handleSave = () => {
    const canvas = editorCanvasRef.current;
    if (!canvas) {
      console.error('[ImageEditor] No canvas ref');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    console.log('[ImageEditor] Saving image data, length:', dataUrl.length);
    onSave(dataUrl);
    toast.success('Image changes saved to editor! Use File > Save to save to PDF.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '16px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Image Editor</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setTool('pencil')}
            style={{
              padding: '8px',
              backgroundColor: tool === 'pencil' ? '#3b82f6' : '#f3f4f6',
              color: tool === 'pencil' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Pencil size={16} /> Pencil
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              padding: '8px',
              backgroundColor: tool === 'eraser' ? '#3b82f6' : '#f3f4f6',
              color: tool === 'eraser' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Eraser size={16} /> Eraser
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px' }}>Color:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '30px', height: '30px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px' }}>Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={{ width: '80px' }}
            />
            <span style={{ fontSize: '12px' }}>{brushSize}px</span>
          </div>

          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            style={{
              padding: '8px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
              opacity: historyIndex <= 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Undo size={16} /> Undo
          </button>

          <button
            onClick={reset}
            style={{
              padding: '8px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        <div
          style={{
            border: '2px solid #e5e7eb',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '60vh',
            backgroundColor: '#f9fafb',
          }}
        >
          <canvas
            ref={editorCanvasRef}
            style={{
              display: 'block',
              cursor: tool === 'pencil' ? 'crosshair' : (tool === 'eraser' ? 'cell' : 'crosshair'),
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Download size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
