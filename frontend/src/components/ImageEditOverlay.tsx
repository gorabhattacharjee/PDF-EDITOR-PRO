import React, { useState, useRef, useEffect } from 'react';
import { ExtractedImage } from '../utils/extractImages';
import { useImageEditsStore, ImageEdit } from '../stores/useImageEditsStore';
import { Trash2, Move, Maximize2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageEditorModal from './ImageEditorModal';

interface ImageEditOverlayProps {
  image: ExtractedImage;
  docId: string;
  isEditMode: boolean;
  zoom: number;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export function ImageEditOverlay({ image, docId, isEditMode, zoom, canvasRef }: ImageEditOverlayProps) {
  const { edits, addEdit } = useImageEditsStore();
  const docEdits = edits[docId] || [];
  const existingEdit = docEdits.find((e) => e.id === image.id);
  
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentX = existingEdit?.x ?? image.x;
  const currentY = existingEdit?.y ?? image.y;
  const currentWidth = existingEdit?.width ?? image.width;
  const currentHeight = existingEdit?.height ?? image.height;
  const isDeleted = existingEdit?.deleted ?? false;
  
  if (isDeleted) return null;
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setIsSelected(true);
  };
  
  const handleMouseDown = (e: React.MouseEvent, action: 'move' | 'resize') => {
    if (!isEditMode || !isSelected) return;
    e.stopPropagation();
    e.preventDefault();
    
    if (action === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      if (isDragging) {
        const newX = currentX + dx;
        const newY = currentY + dy;
        
        addEdit(docId, {
          id: image.id,
          page: image.page,
          x: newX,
          y: newY,
          width: currentWidth,
          height: currentHeight,
          originalX: image.x,
          originalY: image.y,
          originalWidth: image.width,
          originalHeight: image.height,
          deleted: false,
          imageData: existingEdit?.imageData || image.imageData,
          zoom: zoom,
        });
        
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (isResizing) {
        const newWidth = Math.max(20, currentWidth + dx);
        const newHeight = Math.max(20, currentHeight + dy);
        
        addEdit(docId, {
          id: image.id,
          page: image.page,
          x: currentX,
          y: currentY,
          width: newWidth,
          height: newHeight,
          originalX: image.x,
          originalY: image.y,
          originalWidth: image.width,
          originalHeight: image.height,
          deleted: false,
          imageData: existingEdit?.imageData || image.imageData,
          zoom: zoom,
        });
        
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, currentX, currentY, currentWidth, currentHeight, docId, image, addEdit]);
  
  useEffect(() => {
    if (!isEditMode) {
      setIsSelected(false);
    }
  }, [isEditMode]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    
    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelected]);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    addEdit(docId, {
      id: image.id,
      page: image.page,
      x: currentX,
      y: currentY,
      width: currentWidth,
      height: currentHeight,
      originalX: image.x,
      originalY: image.y,
      originalWidth: image.width,
      originalHeight: image.height,
      deleted: true,
      imageData: existingEdit?.imageData || image.imageData,
      zoom: zoom,
    });
    toast.success('Image deleted');
    setIsSelected(false);
  };
  
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    addEdit(docId, {
      id: image.id,
      page: image.page,
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      originalX: image.x,
      originalY: image.y,
      originalWidth: image.width,
      originalHeight: image.height,
      deleted: false,
      imageData: image.imageData,
      zoom: zoom,
    });
    toast.success('Image reset');
  };
  
  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: `${currentX}px`,
        top: `${currentY}px`,
        width: `${currentWidth}px`,
        height: `${currentHeight}px`,
        cursor: isEditMode ? 'pointer' : 'default',
        border: isSelected ? '2px solid #3b82f6' : (isEditMode ? '1px dashed #94a3b8' : 'none'),
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
        zIndex: isSelected ? 200 : 150,
        pointerEvents: isEditMode ? 'auto' : 'none', // Ensure images are clickable even when parent is 'none'
      }}
    >
      {isSelected && isEditMode && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '-32px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px',
              backgroundColor: 'white',
              padding: '4px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 300,
            }}
          >
            <button
              onClick={handleDelete}
              style={{
                padding: '4px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Delete image"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '4px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Reset position/size"
            >
              <Maximize2 size={14} />
            </button>
            {canvasRef && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditorOpen(true);
                }}
                style={{
                  padding: '4px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Edit image (paint/draw)"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          
          <div
            onMouseDown={(e) => handleMouseDown(e, 'move')}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              borderRadius: '4px',
              cursor: 'move',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 300,
            }}
            title="Drag to move"
          >
            <Move size={16} />
          </div>
          
          <div
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '12px',
              height: '12px',
              backgroundColor: '#3b82f6',
              cursor: 'se-resize',
              borderRadius: '2px',
              zIndex: 300,
            }}
            title="Drag to resize"
          />
          
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              left: '-4px',
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
            }}
          />
        </>
      )}
      
      {canvasRef && (
        <ImageEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          imageRect={{
            x: currentX,
            y: currentY,
            width: currentWidth,
            height: currentHeight,
          }}
          canvasRef={canvasRef}
          onSave={(imageData) => {
            console.log('[ImageEditOverlay] Saving edit for image:', image.id, 'docId:', docId, 'zoom:', zoom);
            console.log('[ImageEditOverlay] imageData length:', imageData?.length);
            addEdit(docId, {
              id: image.id,
              page: image.page,
              x: currentX,
              y: currentY,
              width: currentWidth,
              height: currentHeight,
              originalX: image.x,
              originalY: image.y,
              originalWidth: image.width,
              originalHeight: image.height,
              deleted: false,
              imageData: imageData,
              zoom: zoom,
            });
            console.log('[ImageEditOverlay] Edit added to store with zoom:', zoom);
          }}
        />
      )}
    </div>
  );
}
