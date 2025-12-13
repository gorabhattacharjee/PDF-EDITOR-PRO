"use client";

import React, { useRef, useState, useEffect } from "react";
import { useAnnotationsStore, PenStroke, Shape, ShapeType } from "@/stores/useAnnotationsStore";
import toast from "react-hot-toast";

interface DrawingCanvasProps {
  docId: string;
  page: number;
  width: number;
  height: number;
  zoom: number;
  activeTool: "pen" | "shapes";
  strokeColor: string;
  strokeWidth: number;
  selectedShape?: ShapeType;
}

export default function DrawingCanvas({
  docId,
  page,
  width,
  height,
  zoom,
  activeTool,
  strokeColor,
  strokeWidth,
  selectedShape = "rectangle",
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);
  
  const addPenStroke = useAnnotationsStore((s) => s.addPenStroke);
  const addShape = useAnnotationsStore((s) => s.addShape);
  const penStrokes = useAnnotationsStore((s) => s.penStrokes)[docId] || [];
  const shapes = useAnnotationsStore((s) => s.shapes)[docId] || [];

  useEffect(() => {
    renderCanvas();
  }, [penStrokes, shapes, zoom, page, currentPoints, shapeStart, shapeEnd, width, height]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    penStrokes
      .filter((s) => s.page === page)
      .forEach((stroke) => {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        stroke.points.forEach((p, i) => {
          const x = p.x * zoom;
          const y = p.y * zoom;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });

    shapes
      .filter((s) => s.page === page)
      .forEach((shape) => {
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.strokeWidth;
        ctx.fillStyle = shape.filled ? shape.color : "transparent";
        
        const x = shape.x * zoom;
        const y = shape.y * zoom;
        const w = shape.width * zoom;
        const h = shape.height * zoom;
        
        drawShape(ctx, shape.shapeType, x, y, w, h, shape.filled);
      });

    if (currentPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      currentPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    if (shapeStart && shapeEnd) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      const x = Math.min(shapeStart.x, shapeEnd.x);
      const y = Math.min(shapeStart.y, shapeEnd.y);
      const w = Math.abs(shapeEnd.x - shapeStart.x);
      const h = Math.abs(shapeEnd.y - shapeStart.y);
      drawShape(ctx, selectedShape, x, y, w, h, false);
    }
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    type: ShapeType,
    x: number,
    y: number,
    w: number,
    h: number,
    filled?: boolean
  ) => {
    ctx.beginPath();
    switch (type) {
      case "rectangle":
        if (filled) ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        break;
      case "circle":
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        if (filled) ctx.fill();
        ctx.stroke();
        break;
      case "line":
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        break;
      case "arrow":
        const angle = Math.atan2(h, w);
        const headLen = Math.min(20, Math.sqrt(w * w + h * h) / 3);
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(
          x + w - headLen * Math.cos(angle - Math.PI / 6),
          y + h - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(
          x + w - headLen * Math.cos(angle + Math.PI / 6),
          y + h - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
    }
  };

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = getPos(e);
    setIsDrawing(true);
    
    if (activeTool === "pen") {
      setCurrentPoints([pos]);
    } else {
      setShapeStart(pos);
      setShapeEnd(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    
    if (activeTool === "pen") {
      setCurrentPoints((prev) => [...prev, pos]);
    } else {
      setShapeEnd(pos);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === "pen" && currentPoints.length > 1) {
      const basePoints = currentPoints.map((p) => ({
        x: p.x / zoom,
        y: p.y / zoom,
      }));
      addPenStroke(docId, {
        id: `pen-${Date.now()}`,
        page,
        points: basePoints,
        color: strokeColor,
        strokeWidth: strokeWidth,
        creationZoom: zoom,
      });
      toast.success("Drawing saved!");
      setCurrentPoints([]);
    }

    if (activeTool === "shapes" && shapeStart && shapeEnd) {
      const x = Math.min(shapeStart.x, shapeEnd.x) / zoom;
      const y = Math.min(shapeStart.y, shapeEnd.y) / zoom;
      const w = Math.abs(shapeEnd.x - shapeStart.x) / zoom;
      const h = Math.abs(shapeEnd.y - shapeStart.y) / zoom;
      
      if (w > 5 / zoom || h > 5 / zoom) {
        addShape(docId, {
          id: `shape-${Date.now()}`,
          page,
          shapeType: selectedShape,
          x,
          y,
          width: w,
          height: h,
          color: strokeColor,
          strokeWidth: strokeWidth,
          creationZoom: zoom,
        });
        toast.success(`${selectedShape} added!`);
      }
      setShapeStart(null);
      setShapeEnd(null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 150,
        cursor: "crosshair",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
