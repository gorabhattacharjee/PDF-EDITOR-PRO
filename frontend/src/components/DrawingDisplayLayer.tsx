"use client";

import React, { useRef, useEffect } from "react";
import { PenStroke, Shape, ShapeType } from "@/stores/useAnnotationsStore";

interface DrawingDisplayLayerProps {
  penStrokes: PenStroke[];
  shapes: Shape[];
  page: number;
  width: number;
  height: number;
  zoom: number;
}

export default function DrawingDisplayLayer({
  penStrokes,
  shapes,
  page,
  width,
  height,
  zoom,
}: DrawingDisplayLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    renderCanvas();
  }, [penStrokes, shapes, zoom, page, width, height]);

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

  const hasDrawings = penStrokes.some(s => s.page === page) || shapes.some(s => s.page === page);
  
  if (!hasDrawings || width <= 0 || height <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 60,
        pointerEvents: "none",
      }}
    />
  );
}
