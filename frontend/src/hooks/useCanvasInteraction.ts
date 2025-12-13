import { useRef, useEffect, useState } from "react";
import { useUIStore } from "@/stores/useUIStore";
import { useAnnotationsStore, Annotation } from "@/stores/useAnnotationsStore";
import useDocumentsStore from "@/stores/useDocumentsStore";
import toast from "react-hot-toast";

export const useCanvasInteraction = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  overlayRef: React.RefObject<HTMLCanvasElement>
) => {
  const { activeTool } = useUIStore();
  const { activeDocument } = useDocumentsStore();
  const { addAnnotation, annotations } = useAnnotationsStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Array<{type: string, x: number, y: number, width: number, height: number, text?: string}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      // Draw selected objects with green highlight (removed for select tool)
      // Select tool now uses native text layer in Canvas component

      // Draw existing annotations
      if (activeDocument && annotations[activeDocument.id]) {
        annotations[activeDocument.id].forEach((anno) => {
          if (anno.page === activeDocument.currentPage) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = anno.color || "yellow";
            switch (anno.type) {
              case "highlight":
                ctx.fillRect(anno.rect.x, anno.rect.y, anno.rect.width, anno.rect.height);
                break;
              case "underline":
                ctx.fillRect(anno.rect.x, anno.rect.y + anno.rect.height - 2, anno.rect.width, 2);
                break;
              case "strikeout":
                ctx.fillRect(anno.rect.x, anno.rect.y + anno.rect.height / 2 - 1, anno.rect.width, 2);
                break;
              case "pen":
                if (anno.points && anno.points.length > 1) {
                  ctx.globalAlpha = 1.0;
                  ctx.strokeStyle = anno.color || "red";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(anno.points[0].x, anno.points[0].y);
                  for (let i = 1; i < anno.points.length; i++) {
                    ctx.lineTo(anno.points[i].x, anno.points[i].y);
                  }
                  ctx.stroke();
                }
                break;
            }
          }
        });
      }

      // Draw current interaction
      if (isDrawing && startPos && currentPos) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "yellow";
        const rect = {
          x: Math.min(startPos.x, currentPos.x),
          y: Math.min(startPos.y, currentPos.y),
          width: Math.abs(startPos.x - currentPos.x),
          height: Math.abs(startPos.y - currentPos.y),
        };

        switch (activeTool) {
          case "highlight":
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            break;
          case "underline":
            ctx.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2);
            break;
          case "strikeout":
            ctx.fillRect(rect.y + rect.height / 2 - 1, rect.x, rect.width, 2);
            break;
        }
      }
      if (isDrawing && activeTool === 'pen' && points.length > 1) {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
    };

    draw();
  }, [isDrawing, startPos, currentPos, points, activeDocument, annotations, activeTool, canvasRef, overlayRef, selectedObjects, addAnnotation]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Skip select tool - it uses native text selection from text layer
    if (!activeTool || activeTool === "none" || activeTool === "hand" || (activeTool as string) === "select") return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    if (activeTool === 'pen') {
      setPoints([{x, y}]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPos({ x, y });
    if (activeTool === 'pen') {
      setPoints(prev => [...prev, {x, y}]);
    }
  };

  const handleMouseUp = () => {
    // Skip select tool - it uses native text selection
    if ((activeTool as string) === "select") {
      setIsDrawing(false);
      setStartPos(null);
      setCurrentPos(null);
      return;
    }
    
    if (!isDrawing || !startPos || !currentPos || !activeDocument) {
      setIsDrawing(false);
      return;
    }

    const rect = {
      x: Math.min(startPos.x, currentPos.x),
      y: Math.min(startPos.y, currentPos.y),
      width: Math.abs(startPos.x - currentPos.x),
      height: Math.abs(startPos.y - currentPos.y),
    };

    if (rect.width > 0 || rect.height > 0 || (activeTool === 'pen' && points.length > 1)) {
      const newAnnotation: Annotation = {
        id: new Date().toISOString(),
        page: activeDocument.currentPage,
        type: activeTool as any,
        rect,
        points: activeTool === 'pen' ? points : undefined,
      };
      addAnnotation(activeDocument.id, newAnnotation);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
    setPoints([]);
  };

  return { handleMouseDown, handleMouseMove, handleMouseUp, selectedObjects, setSelectedObjects };
};
